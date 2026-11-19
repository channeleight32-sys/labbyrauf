import { CircuitNode, CircuitWire } from "../components/CircuitLab";
import { AnalogNode, AnalogWire } from "../components/SeriesParallelBuilder";
import { GATE_SPECS, COMP_SPECS } from "../data/logicSpecs";
import { isThreeTerminalComponent } from "../components/TransistorConfigModal";

import { isAnalogOrPassiveType } from "./circuitLabAnalogSolver";

export type DiagnosticCategory = "SHORT_CIRCUIT" | "FLOATING_NODE";

export type OpenCircuitIssueType =
  | "SHORT_CIRCUIT"
  | "OUTPUT_CONTENTION"
  | "BRIDGED_TERMINALS"
  | "AMMETER_SHORT"
  | "UNTERMINATED_INPUT"
  | "FLOATING_NODE"
  | "FLOATING_WIRE"
  | "BROKEN_PATH"
  | "OPEN_STUB"
  | "FLOATING_IC_PIN";

export interface OpenCircuitIssue {
  id: string;
  type: OpenCircuitIssueType;
  category?: DiagnosticCategory;
  severity: "error" | "warning";
  nodeId: number;
  nodeLabel: string;
  componentType: string;
  portOrTermIndex?: number;
  pinName?: string;
  x: number;
  y: number;
  title: string;
  description: string;
  remedy: string;
  wireIds?: number[];
  relatedNodeIds?: number[];
}

export interface CircuitDiagnosticReport {
  issues: OpenCircuitIssue[];
  shortCircuitWireIds: Set<number>;
  floatingNodeWireIds: Set<number>;
  shortCircuitCount: number;
  floatingNodeCount: number;
}

/**
 * Analyzes a digital/mixed schematic for:
 * 1. Unterminated inputs (logic gates / ICs / OUTPUTs with missing driving wire)
 * 2. Floating nodes (0 connections anywhere on the canvas)
 * 3. Broken paths & dangling outputs (gates whose outputs go nowhere)
 * 4. Open stubs on analog/passive/power components using bidirectional pin tracking
 */
export function findDigitalOpenCircuits(
  nodes: CircuitNode[],
  wires: CircuitWire[]
): OpenCircuitIssue[] {
  const issues: OpenCircuitIssue[] = [];
  const nodeMap = new Map<number, CircuitNode>();
  for (const n of nodes) nodeMap.set(n.id, n);

  // Incoming wires to input ports: key is `${nodeId}:${port}`
  const inWireMap = new Map<string, CircuitWire[]>();
  // Outgoing wires from output ports: key is `${nodeId}:${port}`
  const outWireMap = new Map<string, CircuitWire[]>();
  // Exact direction-aware endpoint count: `${nodeId}:${dir}:${port}` -> count
  const pinConnCount = new Map<string, number>();
  // Total wire attachments per node
  const totalWireCounts = new Map<number, number>();

  for (const w of wires) {
    const fromDir = w.from.dir || "out";
    const toDir = w.to.dir || "in";

    const fromExactKey = `${w.from.node}:${fromDir}:${w.from.port}`;
    const toExactKey = `${w.to.node}:${toDir}:${w.to.port}`;
    pinConnCount.set(fromExactKey, (pinConnCount.get(fromExactKey) || 0) + 1);
    pinConnCount.set(toExactKey, (pinConnCount.get(toExactKey) || 0) + 1);

    const recordEndpoint = (nodeId: number, port: number, dir: "in" | "out") => {
      const targetMap = dir === "in" ? inWireMap : outWireMap;
      const key = `${nodeId}:${port}`;
      const arr = targetMap.get(key) || [];
      arr.push(w);
      targetMap.set(key, arr);
    };
    recordEndpoint(w.from.node, w.from.port, fromDir);
    recordEndpoint(w.to.node, w.to.port, toDir);

    totalWireCounts.set(w.from.node, (totalWireCounts.get(w.from.node) || 0) + 1);
    totalWireCounts.set(w.to.node, (totalWireCounts.get(w.to.node) || 0) + 1);
  }

  for (const n of nodes) {
    const totalConnections = totalWireCounts.get(n.id) || 0;

    // 1. Completely Floating Node (0 wires anywhere)
    if (totalConnections === 0) {
      issues.push({
        id: `digital-floating-${n.id}`,
        type: "FLOATING_NODE",
        severity: "error",
        nodeId: n.id,
        nodeLabel: n.label || `${n.type} #${n.id}`,
        componentType: n.type,
        x: n.x,
        y: n.y,
        title: `Floating ${n.type} Component`,
        description: `Component #${n.id} is placed on the schematic with 0 connected wires.`,
        remedy: `Connect its input and output ports or remove it from the canvas.`,
      });
      continue;
    }

    // 2. Unterminated Inputs on OUTPUT indicator
    if (n.type === "OUTPUT") {
      const incoming = inWireMap.get(`${n.id}:0`);
      if (!incoming || incoming.length === 0) {
        issues.push({
          id: `digital-unterm-out-${n.id}`,
          type: "UNTERMINATED_INPUT",
          severity: "error",
          nodeId: n.id,
          nodeLabel: n.label || `OUT #${n.id}`,
          componentType: n.type,
          portOrTermIndex: 0,
          pinName: "In",
          x: n.x,
          y: n.y + 25,
          title: `Unterminated Output Monitor (Floating Input)`,
          description: `Logic probe output #${n.id} has no driving source connected to its input port.`,
          remedy: `Drag a wire from an upstream logic gate output to this probe.`,
        });
      }
      continue;
    }

    // INPUT switches don't have inputs
    if (n.type === "INPUT") {
      const outgoing = outWireMap.get(`${n.id}:0`);
      if (!outgoing || outgoing.length === 0) {
        issues.push({
          id: `digital-dangling-in-${n.id}`,
          type: "BROKEN_PATH",
          severity: "warning",
          nodeId: n.id,
          nodeLabel: n.label || `IN #${n.id}`,
          componentType: n.type,
          portOrTermIndex: 0,
          pinName: "Out",
          x: n.x + 56,
          y: n.y + 25,
          title: `Dangling Input Switch (Unconnected Output)`,
          description: `Switch #${n.id} generates a binary signal but its output wire goes nowhere.`,
          remedy: `Connect its output terminal to a logic gate input pin.`,
        });
      }
      continue;
    }

    // 2b. Analog / Passive / Source / Meter Bidirectional Terminal Checks
    if (isAnalogOrPassiveType(n.type) && n.type !== "INPUT" && n.type !== "OUTPUT" && n.type !== "CLOCK") {
      if (n.type === "GND" || n.type === "VCC" || n.type === "VCC_5V" || n.type === "VCC_12V") {
        continue; // Single-rail node already verified non-floating via totalConnections > 0
      }

      if (n.type === "BATTERY" || n.type === "DC_VOLTAGE" || n.type === "DC_VOLTAGE_SOURCE" || n.type === "AC_SINE" || n.type === "AC_VOLTAGE_SOURCE") {
        const p0 = pinConnCount.get(`${n.id}:out:0`) || 0;
        const p1 = pinConnCount.get(`${n.id}:out:1`) || 0;
        if (p0 === 0 || (n.type !== "AC_SINE" && p1 === 0 && !nodes.some((x) => x.type === "GND"))) {
          issues.push({
            id: `analog-src-stub-${n.id}`,
            type: "OPEN_STUB",
            severity: "warning",
            nodeId: n.id,
            nodeLabel: n.label || `${n.type} #${n.id}`,
            componentType: n.type,
            portOrTermIndex: p0 === 0 ? 0 : 1,
            pinName: p0 === 0 ? "+ Terminal" : "- Terminal",
            x: n.x + 112,
            y: n.y + (p0 === 0 ? 25 : 51),
            title: `Open Source Terminal (${n.label || n.type})`,
            description: `Power source #${n.id} has an open terminal (${p0 === 0 ? "+" : "-"}), preventing a closed current path.`,
            remedy: `Connect both + and - terminals (or tie - to GND).`,
          });
        }
        continue;
      }

      if (n.type === "VOLTMETER" || n.type === "OHMMETER" || n.type === "DMM_PROBE") {
        const p0 = pinConnCount.get(`${n.id}:in:0`) || 0;
        const p1 = pinConnCount.get(`${n.id}:in:1`) || 0;
        if (p0 === 0 || p1 === 0) {
          const openIdx = p0 === 0 ? 0 : 1;
          issues.push({
            id: `analog-meter-stub-${n.id}-${openIdx}`,
            type: "OPEN_STUB",
            severity: "warning",
            nodeId: n.id,
            nodeLabel: n.label || `${n.type} #${n.id}`,
            componentType: n.type,
            portOrTermIndex: openIdx,
            pinName: openIdx === 0 ? "Probe +" : "Probe -",
            x: n.x,
            y: n.y + (openIdx === 0 ? 28 : 56),
            title: `Disconnected Meter Lead (${openIdx === 0 ? "+" : "-"})`,
            description: `Instrument ${n.label || n.type} requires both differential leads connected.`,
            remedy: `Connect the missing meter lead across the measured branch or GND.`,
          });
        }
        continue;
      }

      // Standard 2-terminal passive / diode / LED / switch / ammeter
      if (
        n.type === "RES" || n.type === "RESISTOR" || n.type === "CAP_NP" || n.type === "CAPACITOR" ||
        n.type === "CAP_POL" || n.type === "IND" || n.type === "INDUCTOR" || n.type === "FUSE" ||
        n.type === "DIODE_1N4007" || n.type === "SCHOTTKY" || n.type === "ZENER_BZX84" ||
        n.type === "LED_RED" || n.type === "LED_GREEN" || n.type === "LED_BLUE" ||
        n.type === "AMMETER" || n.type === "SWITCH_SPST" || n.type === "PUSHBUTTON" || n.type === "BUZZER"
      ) {
        const hasLeft = (pinConnCount.get(`${n.id}:in:0`) || 0) > 0;
        const hasRight = (pinConnCount.get(`${n.id}:out:0`) || 0) > 0;
        if (!hasLeft || !hasRight) {
          issues.push({
            id: `analog-2term-stub-${n.id}`,
            type: "OPEN_STUB",
            severity: "error",
            nodeId: n.id,
            nodeLabel: n.label || `${n.type} #${n.id}`,
            componentType: n.type,
            portOrTermIndex: 0,
            pinName: !hasLeft ? "Terminal 1" : "Terminal 2",
            x: !hasLeft ? n.x : n.x + (COMP_SPECS[n.type]?.w ?? 108),
            y: n.y + (COMP_SPECS[n.type]?.h ?? 72) / 2,
            title: `Open Passive Terminal (${n.label || n.type})`,
            description: `${n.label || n.type} is only wired on one side and forms an open stub.`,
            remedy: `Wire both terminals to complete a closed electrical path.`,
          });
        }
      }
      continue;
    }

    // CLOCK generator
    if (n.type === "CLOCK") {
      if ((outWireMap.get(`${n.id}:0`)?.length || 0) === 0) {
        issues.push({
          id: `digital-dangling-clk-${n.id}`,
          type: "BROKEN_PATH",
          severity: "warning",
          nodeId: n.id,
          nodeLabel: n.label || `CLK #${n.id}`,
          componentType: n.type,
          portOrTermIndex: 0,
          pinName: "CLK",
          x: n.x + (COMP_SPECS.CLOCK?.w ?? 96),
          y: n.y + (COMP_SPECS.CLOCK?.h ?? 66) / 2,
          title: `Unconnected Clock Output`,
          description: `Clock generator #${n.id} is not wired to any flip-flop or counter CLK pin.`,
          remedy: `Connect CLK output to a sequential component clock input.`,
        });
      }
      continue;
    }

    // 3. Logic Gate Inputs Check (AND, OR, NOT, NAND, NOR, XOR, XNOR)
    const gateSpec = GATE_SPECS[n.type];
    if (gateSpec) {
      for (let p = 0; p < gateSpec.inputs; p++) {
        const incoming = inWireMap.get(`${n.id}:${p}`);
        if (!incoming || incoming.length === 0) {
          const pinLetter = p === 0 ? "A" : p === 1 ? "B" : `${p + 1}`;
          const portSpacing = 50 / (gateSpec.inputs + 1);
          const py = n.y + (p + 1) * portSpacing;
          issues.push({
            id: `digital-unterm-gate-${n.id}-${p}`,
            type: "UNTERMINATED_INPUT",
            severity: "error",
            nodeId: n.id,
            nodeLabel: n.label || `${n.type} Gate #${n.id}`,
            componentType: n.type,
            portOrTermIndex: p,
            pinName: `Pin ${pinLetter}`,
            x: n.x,
            y: py,
            title: `Unterminated Gate Input (${n.type} Pin ${pinLetter})`,
            description: `${n.type} gate #${n.id} requires input Pin ${pinLetter} to be driven. Floating inputs cause undefined logic states (Z).`,
            remedy: `Wire an input signal or tie to VDD (1) / GND (0).`,
          });
        }
      }

      const outgoing = outWireMap.get(`${n.id}:0`);
      if (!outgoing || outgoing.length === 0) {
        issues.push({
          id: `digital-dangling-gate-out-${n.id}`,
          type: "BROKEN_PATH",
          severity: "warning",
          nodeId: n.id,
          nodeLabel: n.label || `${n.type} Gate #${n.id}`,
          componentType: n.type,
          portOrTermIndex: 0,
          pinName: "Output Y",
          x: n.x + 80,
          y: n.y + 25,
          title: `Dangling Gate Output (${n.type} Out)`,
          description: `Gate #${n.id} computes a valid Boolean logic state, but its output is not connected to any downstream circuit.`,
          remedy: `Connect output Y to an indicator LED, probe, or subsequent gate.`,
        });
      }
      continue;
    }

    // 4. MSI / Complex IC Components
    const compSpec = COMP_SPECS[n.type];
    if (compSpec) {
      const inputs = compSpec.inputs;
      inputs.forEach((inputDef, p) => {
        const pinName = typeof inputDef === "string" ? inputDef : inputDef.name;
        const incoming = inWireMap.get(`${n.id}:${p}`);
        if (!incoming || incoming.length === 0) {
          const isCompulsory = typeof inputDef === "string" || inputDef.defaultVal === undefined;
          if (isCompulsory) {
            issues.push({
              id: `digital-unterm-ic-${n.id}-${p}`,
              type: "FLOATING_IC_PIN",
              severity: "warning",
              nodeId: n.id,
              nodeLabel: n.label || `${n.type} IC #${n.id}`,
              componentType: n.type,
              portOrTermIndex: p,
              pinName,
              x: n.x,
              y: n.y + 16 + p * 20,
              title: `Unterminated IC Pin (${pinName})`,
              description: `Pin ${pinName} on ${compSpec.label} #${n.id} is currently floating without an input connection.`,
              remedy: `Supply a clock, control signal, or reference voltage to ${pinName}.`,
            });
          }
        }
      });
    }
  }

  // 5. Broken Wire Checks (referenced nodes missing)
  for (const w of wires) {
    if (!nodeMap.has(w.from.node) || !nodeMap.has(w.to.node)) {
      issues.push({
        id: `digital-broken-wire-${w.id}`,
        type: "BROKEN_PATH",
        severity: "error",
        nodeId: w.from.node,
        nodeLabel: `Wire #${w.id}`,
        componentType: "WIRE",
        x: 0,
        y: 0,
        title: `Broken Wire Connection`,
        description: `Wire #${w.id} connects to a deleted or non-existent component node.`,
        remedy: `Delete the broken wire or reconnect it to a valid terminal.`,
      });
    }
  }

  return issues;
}

/**
 * Visual Diagnostic Engine:
 * Analyzes digital, analog, and mixed circuits for:
 * 1. Short Circuits:
 *    - Power rail directly tied to ground (VCC <-> GND dead short)
 *    - Bypassed / Bridged component terminals (wire bridging term 0 & term 1 of same component)
 *    - Output Contention / Bus clash (multiple gate outputs or output tied to rail)
 *    - Ammeter shunt dead short across voltage source
 * 2. Floating Nodes & Wires:
 *    - Wire net connecting to gate/IC inputs with NO active driver
 *    - Dangling wires / Open branch stubs
 *    - Completely disconnected floating components
 *    - Unterminated compulsory logic inputs
 * Returns specific wireIds for pulsing red glow (shorts) and pulsing amber glow (floating).
 */
export function analyzeCircuitDiagnostics(
  nodes: CircuitNode[],
  wires: CircuitWire[]
): CircuitDiagnosticReport {
  const issues: OpenCircuitIssue[] = [];
  const shortCircuitWireIds = new Set<number>();
  const floatingNodeWireIds = new Set<number>();

  const nodeMap = new Map<number, CircuitNode>();
  for (const n of nodes) nodeMap.set(n.id, n);

  // 1. Build Port-to-Port Connection Graph & Track Wires on each Port
  // Port Key format: `${nodeId}:${dir}:${port}`
  const portToWires = new Map<string, CircuitWire[]>();
  const adjPorts = new Map<string, Set<string>>();

  const addPortEdge = (pA: string, pB: string, wire: CircuitWire) => {
    if (!adjPorts.has(pA)) adjPorts.set(pA, new Set());
    if (!adjPorts.has(pB)) adjPorts.set(pB, new Set());
    adjPorts.get(pA)!.add(pB);
    adjPorts.get(pB)!.add(pA);

    if (!portToWires.has(pA)) portToWires.set(pA, []);
    if (!portToWires.has(pB)) portToWires.set(pB, []);
    portToWires.get(pA)!.push(wire);
    portToWires.get(pB)!.push(wire);
  };

  for (const w of wires) {
    const fromDir = w.from.dir || "out";
    const toDir = w.to.dir || "in";
    const fromKey = `${w.from.node}:${fromDir}:${w.from.port}`;
    const toKey = `${w.to.node}:${toDir}:${w.to.port}`;
    addPortEdge(fromKey, toKey, w);
  }

  // 2. Discover Connected Wire Nets using BFS
  interface NetEndpoint {
    nodeId: number;
    dir: "in" | "out";
    port: number;
    node: CircuitNode;
  }

  interface WireNet {
    id: number;
    ports: string[];
    wireIds: Set<number>;
    endpoints: NetEndpoint[];
  }

  const visitedPorts = new Set<string>();
  const nets: WireNet[] = [];
  let netIdCounter = 1;

  for (const startPort of adjPorts.keys()) {
    if (visitedPorts.has(startPort)) continue;
    const queue = [startPort];
    visitedPorts.add(startPort);

    const netPorts: string[] = [];
    const netWireIds = new Set<number>();
    const netEndpoints: NetEndpoint[] = [];

    while (queue.length > 0) {
      const current = queue.shift()!;
      netPorts.push(current);

      const ws = portToWires.get(current) || [];
      for (const w of ws) netWireIds.add(w.id);

      const [nIdStr, dirStr, pStr] = current.split(":");
      const nId = parseInt(nIdStr, 10);
      const dir = (dirStr === "out" ? "out" : "in") as "in" | "out";
      const port = parseInt(pStr, 10);
      const node = nodeMap.get(nId);
      if (node) {
        netEndpoints.push({ nodeId: nId, dir, port, node });
      }

      const neighbors = adjPorts.get(current) || new Set();
      for (const nbr of neighbors) {
        if (!visitedPorts.has(nbr)) {
          visitedPorts.add(nbr);
          queue.push(nbr);
        }
      }
    }

    nets.push({
      id: netIdCounter++,
      ports: netPorts,
      wireIds: netWireIds,
      endpoints: netEndpoints,
    });
  }

  // 3. SHORT CIRCUIT CHECK A: Direct Power Rail to Ground Short (VCC <-> GND)
  for (const net of nets) {
    const vccEndpoints = net.endpoints.filter((ep) => {
      const t = ep.node.type;
      return (
        t === "VCC" ||
        t === "VCC_5V" ||
        t === "VCC_12V" ||
        ((t === "BATTERY" || t === "DC_VOLTAGE" || t === "DC_VOLTAGE_SOURCE" || t === "AC_SINE" || t === "AC_VOLTAGE_SOURCE") &&
          ep.port === 0)
      );
    });

    const gndEndpoints = net.endpoints.filter((ep) => {
      const t = ep.node.type;
      return (
        t === "GND" ||
        ((t === "BATTERY" || t === "DC_VOLTAGE" || t === "DC_VOLTAGE_SOURCE" || t === "AC_SINE" || t === "AC_VOLTAGE_SOURCE") &&
          ep.port === 1)
      );
    });

    if (vccEndpoints.length > 0 && gndEndpoints.length > 0) {
      const vccNode = vccEndpoints[0].node;
      const gndNode = gndEndpoints[0].node;
      const netWireArray = Array.from(net.wireIds);

      for (const wId of netWireArray) {
        shortCircuitWireIds.add(wId);
      }

      issues.push({
        id: `short-vcc-gnd-net-${net.id}`,
        type: "SHORT_CIRCUIT",
        category: "SHORT_CIRCUIT",
        severity: "error",
        nodeId: vccNode.id,
        nodeLabel: vccNode.label || `${vccNode.type} #${vccNode.id}`,
        componentType: vccNode.type,
        portOrTermIndex: vccEndpoints[0].port,
        x: (vccNode.x + gndNode.x) / 2,
        y: (vccNode.y + gndNode.y) / 2,
        title: `Dead Short Circuit: Supply Directly Tied to Ground`,
        description: `Direct zero-ohm short circuit detected between power supply (${vccNode.label || vccNode.type}) and ground (${gndNode.label || gndNode.type}) across ${net.wireIds.size} wire(s). Draws destructive fault current with zero load resistance.`,
        remedy: `Immediately remove the direct wire link between VCC and GND and insert a load resistor or active component.`,
        wireIds: netWireArray,
        relatedNodeIds: [vccNode.id, gndNode.id],
      });
    }

    // 4. SHORT CIRCUIT CHECK B: Output Contention (Multiple Active Drivers on Same Net)
    const driverEndpoints = net.endpoints.filter((ep) => {
      const t = ep.node.type;
      if (t === "VCC" || t === "VCC_5V" || t === "VCC_12V") return true;
      if (t === "GND") return true;
      if (t === "INPUT" && ep.dir === "out") return true;
      if (t === "CLOCK" && ep.dir === "out") return true;
      if (GATE_SPECS[t] && ep.dir === "out" && ep.port === 0) return true;
      if (COMP_SPECS[t] && ep.dir === "out") return true;
      return false;
    });

    const distinctDriverNodeIds = Array.from(new Set(driverEndpoints.map((ep) => ep.nodeId)));
    if (distinctDriverNodeIds.length >= 2) {
      const isAlreadyVccGnd = vccEndpoints.length > 0 && gndEndpoints.length > 0;
      if (!isAlreadyVccGnd) {
        const dNodes = distinctDriverNodeIds.map((id) => nodeMap.get(id)!).filter(Boolean);
        const netWireArray = Array.from(net.wireIds);

        for (const wId of netWireArray) {
          shortCircuitWireIds.add(wId);
        }

        issues.push({
          id: `short-contention-net-${net.id}`,
          type: "OUTPUT_CONTENTION",
          category: "SHORT_CIRCUIT",
          severity: "error",
          nodeId: dNodes[0].id,
          nodeLabel: dNodes[0].label || `${dNodes[0].type} #${dNodes[0].id}`,
          componentType: dNodes[0].type,
          x: dNodes[0].x + 30,
          y: dNodes[0].y + 20,
          title: `Output Contention Short: Multiple Logic Drivers Tied Together`,
          description: `Logic contention detected: ${dNodes.map((d) => `${d.label || d.type} #${d.id}`).join(" and ")} are connected into the same wire net. Conflicting high/low logic levels create an active short circuit and indeterminate states.`,
          remedy: `Separate the outputs or multiplex the signals using an OR/AND gate or selector.`,
          wireIds: netWireArray,
          relatedNodeIds: distinctDriverNodeIds,
        });
      }
    }

    // 5. SHORT CIRCUIT CHECK C: Bridged Terminals of 2-Terminal Components
    const nodeTermCountInNet = new Map<number, Set<number>>();
    for (const ep of net.endpoints) {
      if (!nodeTermCountInNet.has(ep.nodeId)) nodeTermCountInNet.set(ep.nodeId, new Set());
      nodeTermCountInNet.get(ep.nodeId)!.add(ep.port);
    }

    for (const [nId, terms] of nodeTermCountInNet.entries()) {
      if (terms.size >= 2) {
        const comp = nodeMap.get(nId);
        if (
          comp &&
          (comp.type === "RES" ||
            comp.type === "RESISTOR" ||
            comp.type === "CAP_NP" ||
            comp.type === "CAPACITOR" ||
            comp.type === "CAP_POL" ||
            comp.type === "IND" ||
            comp.type === "INDUCTOR" ||
            comp.type === "DIODE_1N4007" ||
            comp.type === "SCHOTTKY" ||
            comp.type === "ZENER_BZX84" ||
            comp.type === "LED_RED" ||
            comp.type === "LED_GREEN" ||
            comp.type === "LED_BLUE" ||
            comp.type === "FUSE")
        ) {
          const netWireArray = Array.from(net.wireIds);
          for (const wId of netWireArray) shortCircuitWireIds.add(wId);

          issues.push({
            id: `short-bridged-${comp.id}`,
            type: "BRIDGED_TERMINALS",
            category: "SHORT_CIRCUIT",
            severity: "error",
            nodeId: comp.id,
            nodeLabel: comp.label || `${comp.type} #${comp.id}`,
            componentType: comp.type,
            x: comp.x,
            y: comp.y,
            title: `Bridged Component Terminals: ${comp.label || comp.type} Shorted Out`,
            description: `Both terminals of ${comp.label || comp.type} #${comp.id} are connected to the same net, bypassing the component with a dead short. Zero current flows through the component.`,
            remedy: `Disconnect the wire bridging the two terminals so current can flow through ${comp.label || comp.type}.`,
            wireIds: netWireArray,
            relatedNodeIds: [comp.id],
          });
        }
      }
    }

    // 6. FLOATING NODE CHECK A: Wire Net with Inputs but ZERO Driving Source
    const hasAnyShortWire = Array.from(net.wireIds).some((wId) => shortCircuitWireIds.has(wId));
    if (!hasAnyShortWire) {
      const inputEndpoints = net.endpoints.filter((ep) => {
        const t = ep.node.type;
        if (ep.dir === "in") return true;
        if (t === "OUTPUT" && ep.port === 0) return true;
        return false;
      });

      const activeDrivers = net.endpoints.filter((ep) => {
        const t = ep.node.type;
        if (t === "VCC" || t === "VCC_5V" || t === "VCC_12V") return true;
        if (t === "GND") return true;
        if (t === "INPUT" && ep.dir === "out") return true;
        if (t === "CLOCK" && ep.dir === "out") return true;
        if (t === "BATTERY" || t === "DC_VOLTAGE" || t === "DC_VOLTAGE_SOURCE" || t === "AC_SINE" || t === "AC_VOLTAGE_SOURCE") return true;
        if (GATE_SPECS[t] && ep.dir === "out" && ep.port === 0) return true;
        if (COMP_SPECS[t] && ep.dir === "out") return true;
        return false;
      });

      if (inputEndpoints.length > 0 && activeDrivers.length === 0) {
        const netWireArray = Array.from(net.wireIds);
        for (const wId of netWireArray) {
          floatingNodeWireIds.add(wId);
        }

        const primaryNode = inputEndpoints[0].node;
        const inputLabels = inputEndpoints.map((ep) => `${ep.node.label || ep.node.type} (Pin ${ep.port + 1})`);

        issues.push({
          id: `floating-net-${net.id}`,
          type: "FLOATING_NODE",
          category: "FLOATING_NODE",
          severity: "warning",
          nodeId: primaryNode.id,
          nodeLabel: primaryNode.label || `${primaryNode.type} #${primaryNode.id}`,
          componentType: primaryNode.type,
          portOrTermIndex: inputEndpoints[0].port,
          x: primaryNode.x,
          y: primaryNode.y + 20,
          title: `Floating Input Net (No Driving Source Connected)`,
          description: `Wire net #${net.id} connects to input pins (${inputLabels.slice(0, 3).join(", ")}) but has no driving source (gate output, switch, or power rail). Floating CMOS inputs produce undefined logic states (Hi-Z).`,
          remedy: `Connect an upstream gate output, switch, pull-up (VCC) or pull-down (GND) resistor to drive this net.`,
          wireIds: netWireArray,
          relatedNodeIds: inputEndpoints.map((ep) => ep.nodeId),
        });
      }
    }
  }

  // 7. FLOATING NODE CHECK B: Dangling Wires & Open Branch Stubs
  for (const w of wires) {
    if (shortCircuitWireIds.has(w.id) || floatingNodeWireIds.has(w.id)) continue;
    const fromNode = nodeMap.get(w.from.node);
    const toNode = nodeMap.get(w.to.node);

    if (!fromNode || !toNode) {
      floatingNodeWireIds.add(w.id);
      issues.push({
        id: `floating-dangling-wire-${w.id}`,
        type: "BROKEN_PATH",
        category: "FLOATING_NODE",
        severity: "warning",
        nodeId: fromNode ? fromNode.id : toNode ? toNode.id : 0,
        nodeLabel: `Wire #${w.id}`,
        componentType: "WIRE",
        x: fromNode ? fromNode.x : 100,
        y: fromNode ? fromNode.y : 100,
        title: `Dangling Wire (Open Connection)`,
        description: `Wire #${w.id} connects to a deleted or non-existent terminal and is floating in space.`,
        remedy: `Reconnect the open end of wire #${w.id} to a valid component port or delete it.`,
        wireIds: [w.id],
      });
      continue;
    }

    const SINGLE_PIN_TERMINALS = new Set(["GND", "VCC", "VCC_5V", "VCC_12V", "INPUT", "CLOCK", "OUTPUT"]);
    const isFromStub = isAnalogOrPassiveType(fromNode.type) && !SINGLE_PIN_TERMINALS.has(fromNode.type);
    const isToStub = isAnalogOrPassiveType(toNode.type) && !SINGLE_PIN_TERMINALS.has(toNode.type);
    if (isFromStub || isToStub) {
      const fromWires = wires.filter((ww) => ww.from.node === fromNode.id || ww.to.node === fromNode.id);
      const toWires = wires.filter((ww) => ww.from.node === toNode.id || ww.to.node === toNode.id);
      if (fromWires.length <= 1 || toWires.length <= 1) {
        floatingNodeWireIds.add(w.id);
        issues.push({
          id: `floating-stub-wire-${w.id}`,
          type: "OPEN_STUB",
          category: "FLOATING_NODE",
          severity: "warning",
          nodeId: fromWires.length <= 1 ? fromNode.id : toNode.id,
          nodeLabel: fromWires.length <= 1 ? (fromNode.label || fromNode.type) : (toNode.label || toNode.type),
          componentType: fromWires.length <= 1 ? fromNode.type : toNode.type,
          x: fromNode.x,
          y: fromNode.y,
          title: `Open Stub Wire (One-Sided Connection)`,
          description: `Wire #${w.id} leads into an open circuit branch with no complete return loop.`,
          remedy: `Complete the circuit loop so current can return to ground or the source.`,
          wireIds: [w.id],
        });
      }
    }
  }

  // 8. Completely Floating Components (0 wires anywhere) & Unterminated Gate Inputs
  for (const n of nodes) {
    const totalNodeWires = wires.filter((w) => w.from.node === n.id || w.to.node === n.id).length;
    if (totalNodeWires === 0) {
      issues.push({
        id: `floating-comp-${n.id}`,
        type: "FLOATING_NODE",
        category: "FLOATING_NODE",
        severity: "warning",
        nodeId: n.id,
        nodeLabel: n.label || `${n.type} #${n.id}`,
        componentType: n.type,
        x: n.x,
        y: n.y,
        title: `Floating ${n.type} Component (Zero Connections)`,
        description: `Component #${n.id} is placed on canvas with 0 connected wires.`,
        remedy: `Connect its input and output ports or delete it from the schematic.`,
        wireIds: [],
        relatedNodeIds: [n.id],
      });
      continue;
    }

    const gateSpec = GATE_SPECS[n.type];
    if (gateSpec) {
      for (let p = 0; p < gateSpec.inputs; p++) {
        const inWires = wires.filter((w) => w.to.node === n.id && (w.to.dir || "in") === "in" && w.to.port === p);
        if (inWires.length === 0) {
          const pinLetter = p === 0 ? "A" : p === 1 ? "B" : `${p + 1}`;
          const portSpacing = 50 / (gateSpec.inputs + 1);
          issues.push({
            id: `unterm-gate-input-${n.id}-${p}`,
            type: "UNTERMINATED_INPUT",
            category: "FLOATING_NODE",
            severity: "warning",
            nodeId: n.id,
            nodeLabel: n.label || `${n.type} #${n.id}`,
            componentType: n.type,
            portOrTermIndex: p,
            pinName: `Pin ${pinLetter}`,
            x: n.x,
            y: n.y + (p + 1) * portSpacing,
            title: `Floating Gate Input (${n.type} Pin ${pinLetter})`,
            description: `${n.type} gate #${n.id} input Pin ${pinLetter} has no wire connected. Floating inputs cause undefined logic states (Z).`,
            remedy: `Connect an input signal or tie to VDD (1) / GND (0).`,
            wireIds: [],
            relatedNodeIds: [n.id],
          });
        }
      }
    }
  }

  return {
    issues,
    shortCircuitWireIds,
    floatingNodeWireIds,
    shortCircuitCount: issues.filter((i) => i.category === "SHORT_CIRCUIT").length,
    floatingNodeCount: issues.filter((i) => i.category === "FLOATING_NODE").length,
  };
}

/**
 * Analyzes an analog / SPICE schematic (SeriesParallelBuilder) for:
 * 1. Open stubs (2-terminal or 3-terminal components with unconnected terminals)
 * 2. Floating components (0 wires)
 * 3. Open circuit loops (incomplete loop where current cannot return to source / GND)
 */
export function findAnalogOpenCircuits(
  nodes: AnalogNode[],
  wires: AnalogWire[],
  getTermPos: (n: AnalogNode, term: number) => { x: number; y: number }
): OpenCircuitIssue[] {
  const issues: OpenCircuitIssue[] = [];
  const nodeMap = new Map<number, AnalogNode>();
  for (const n of nodes) nodeMap.set(n.id, n);

  // Term connection count: `${nodeId}:${term}` -> count
  const termConnCount = new Map<string, number>();
  const totalNodeWires = new Map<number, number>();

  for (const w of wires) {
    const fromKey = `${w.from.node}:${w.from.term}`;
    const toKey = `${w.to.node}:${w.to.term}`;
    termConnCount.set(fromKey, (termConnCount.get(fromKey) || 0) + 1);
    termConnCount.set(toKey, (termConnCount.get(toKey) || 0) + 1);

    totalNodeWires.set(w.from.node, (totalNodeWires.get(w.from.node) || 0) + 1);
    totalNodeWires.set(w.to.node, (totalNodeWires.get(w.to.node) || 0) + 1);
  }

  for (const n of nodes) {
    const totalWires = totalNodeWires.get(n.id) || 0;

    // 1. Completely Floating Node
    if (totalWires === 0) {
      issues.push({
        id: `analog-floating-${n.id}`,
        type: "FLOATING_NODE",
        severity: "error",
        nodeId: n.id,
        nodeLabel: n.label,
        componentType: n.type,
        x: n.x,
        y: n.y,
        title: `Floating ${n.type} Component (${n.label})`,
        description: `Component ${n.label} has 0 wire connections. It is completely isolated and cannot conduct current.`,
        remedy: `Connect its leads into the circuit network.`,
      });
      continue;
    }

    // 2. GND nodes only have 1 terminal (term 0)
    if (n.type === "GND") {
      const c = termConnCount.get(`${n.id}:0`) || 0;
      if (c === 0) {
        const p = getTermPos(n, 0);
        issues.push({
          id: `analog-unterm-gnd-${n.id}`,
          type: "UNTERMINATED_INPUT",
          severity: "error",
          nodeId: n.id,
          nodeLabel: n.label,
          componentType: n.type,
          portOrTermIndex: 0,
          pinName: "0V Reference",
          x: p.x,
          y: p.y,
          title: `Floating Ground Reference (GND)`,
          description: `Ground node ${n.label} is placed on canvas but not tied to the circuit 0V rail.`,
          remedy: `Wire the 0V return or negative battery terminal to this ground reference.`,
        });
      }
      continue;
    }

    // 3. 3-Terminal Transistors / Semiconductors (BJT, MOSFET, JFET, POT)
    if (isThreeTerminalComponent(n.type)) {
      const terminalDefs: { term: number; name: string }[] =
        n.type === "BJT" || n.type === "BC547" || n.type === "BC557"
          ? [
              { term: 0, name: "Collector (C)" },
              { term: 1, name: "Emitter (E)" },
              { term: 2, name: "Base (B)" },
            ]
          : n.type === "MOS"
          ? [
              { term: 0, name: "Drain (D)" },
              { term: 1, name: "Source (S)" },
              { term: 2, name: "Gate (G)" },
            ]
          : n.type === "JFET"
          ? [
              { term: 0, name: "Drain (D)" },
              { term: 1, name: "Source (S)" },
              { term: 2, name: "Gate (G)" },
            ]
          : n.type === "SCR"
          ? [
              { term: 0, name: "Anode (A)" },
              { term: 1, name: "Cathode (K)" },
              { term: 2, name: "Gate (G)" },
            ]
          : n.type === "TRIAC"
          ? [
              { term: 0, name: "MT2" },
              { term: 1, name: "MT1" },
              { term: 2, name: "Gate (G)" },
            ]
          : [
              { term: 0, name: "Pin 1" },
              { term: 1, name: "Pin 2" },
              { term: 2, name: "Wiper" },
            ];

      for (const tDef of terminalDefs) {
        const c = termConnCount.get(`${n.id}:${tDef.term}`) || 0;
        if (c === 0) {
          const pos = getTermPos(n, tDef.term);
          issues.push({
            id: `analog-unterm-transistor-${n.id}-${tDef.term}`,
            type: "UNTERMINATED_INPUT",
            severity: "error",
            nodeId: n.id,
            nodeLabel: n.label,
            componentType: n.type,
            portOrTermIndex: tDef.term,
            pinName: tDef.name,
            x: pos.x,
            y: pos.y,
            title: `Unterminated Transistor Terminal (${tDef.name})`,
            description: `${n.label} (${n.type}) has open terminal: ${tDef.name}. All 3 terminals must be wired for proper biasing.`,
            remedy: `Connect ${tDef.name} to its corresponding bias resistor or rail.`,
          });
        }
      }
      continue;
    }

    // 4. Standard 2-Terminal Components (R, C, L, D, VS, IS, SW, etc.)
    const t0Count = termConnCount.get(`${n.id}:0`) || 0;
    const t1Count = termConnCount.get(`${n.id}:1`) || 0;

    if (t0Count === 0 || t1Count === 0) {
      const openTerm = t0Count === 0 ? 0 : 1;
      const pos = getTermPos(n, openTerm);
      issues.push({
        id: `analog-open-stub-${n.id}-${openTerm}`,
        type: "OPEN_STUB",
        severity: "error",
        nodeId: n.id,
        nodeLabel: n.label,
        componentType: n.type,
        portOrTermIndex: openTerm,
        pinName: openTerm === 0 ? "Terminal 1" : "Terminal 2",
        x: pos.x,
        y: pos.y,
        title: `Open Circuit Stub (${n.label})`,
        description: `${n.label} (${n.type}) is open-circuited at ${openTerm === 0 ? "Terminal 1" : "Terminal 2"}. Current cannot complete a loop through this branch.`,
        remedy: `Wire this open terminal to complete the closed current loop.`,
      });
    }
  }

  return issues;
}
