import { CircuitNode, CircuitWire } from "../components/CircuitLab";
import { COMP_SPECS } from "../data/logicSpecs";
import {
  solveDenseMnaSystem,
  serializeAnalogCircuitToSpiceNetlist,
} from "./ngspiceEngine";

import {
  solveSpiceTransient,
  solveSpiceAcSweep,
  extractAndValidateNetlist,
  type TransientAnalysisOptions,
  type TransientAnalysisResult,
  type AcSweepOptions,
  type AcSweepResult,
} from "./spiceNumericalCore";
import type { AnalogNode, AnalogWire } from "../components/SeriesParallelBuilder";

export interface CircuitLabAnalogTelemetry {
  vTerm0: number; // Potential at terminal 0 (V)
  vTerm1: number; // Potential at terminal 1 (V)
  vDrop: number;  // Absolute potential difference |vTerm0 - vTerm1| (V)
  current_mA: number; // Current flowing through component (mA)
  current_A: number;  // Current flowing through component (A)
  power_mW: number;   // Power dissipated P = V * I (mW)
  isConducting: boolean; // True if active current is flowing
  net0: number; // Net ID at terminal 0
  net1: number; // Net ID at terminal 1
  resistanceOhms?: number;
  label?: string;
  kvlDropPercent?: number; // % of total source voltage
}

export interface CircuitLabSolverResult {
  netVoltages: Map<number, number>; // Net ID -> Voltage (V)
  compTelemetry: Map<number, CircuitLabAnalogTelemetry>; // Node ID -> Telemetry
  getPinVoltage: (nodeId: number, port: number, dir?: "in" | "out") => number;
  hasClosedLoop: boolean;
  totalLoopResistanceOhms: number;
  loopCurrentMa: number;
  sourceVoltageV: number;
  // Kirchhoff's Laws Verification Metrics (KCL & KVL)
  kclSatisfied: boolean;
  kvlSatisfied: boolean;
  maxKclResidualMa: number;
  kvlLoopResidualV: number;
  hasExplicitGround: boolean;
  validationErrors: string[];
  converged: boolean;
  iterations: number;
  matrixDebug?: {
    variableLabels: string[];
    matrixA: number[][];
    vectorB: number[];
    solutionVectorX: number[];
  };
}

/**
 * Checks whether a component type belongs to the electrical/analog domain
 */
export function isAnalogOrPassiveType(type: string): boolean {
  if (!type) return false;
  if (
    type === "GND" ||
    type === "AC_SINE" ||
    type === "AC_VOLTAGE_SOURCE" ||
    type === "VCC_5V" ||
    type === "VCC_12V" ||
    type === "VCC" ||
    type === "DC_VOLTAGE" ||
    type === "DC_VOLTAGE_SOURCE" ||
    type === "BATTERY" ||
    type === "CLOCK" ||
    type === "INPUT"
  )
    return true;
  if (
    type === "RES" ||
    type === "RESISTOR" ||
    type === "POT" ||
    type === "CAP_NP" ||
    type === "CAPACITOR" ||
    type === "CAP_POL" ||
    type === "IND" ||
    type === "INDUCTOR" ||
    type === "TRANSFORMER" ||
    type === "FUSE" ||
    type === "XTAL"
  )
    return true;
  if (
    type === "SWITCH_SPST" ||
    type === "PUSHBUTTON" ||
    type === "RELAY_SPDT"
  )
    return true;
  if (
    type === "LED_RED" ||
    type === "LED_GREEN" ||
    type === "LED_BLUE" ||
    type === "DIODE_1N4007" ||
    type === "SCHOTTKY" ||
    type === "ZENER" ||
    type === "ZENER_BZX84" ||
    type === "PHOTODIODE" ||
    type === "BRIDGE_RECT" ||
    type === "SCR" ||
    type === "DIAC" ||
    type === "TRIAC" ||
    type === "BC547" ||
    type === "BC557" ||
    type === "BJT" ||
    type === "BJT_NPN" ||
    type === "BJT_PNP" ||
    type === "2N2222" ||
    type === "MOSFET_N" ||
    type === "MOSFET_P" ||
    type === "IRF540N" ||
    type === "JFET_N" ||
    type === "PC817" ||
    type === "OPTO_PC817" ||
    type === "OPAMP_741" ||
    type === "LM358" ||
    type === "LM393" ||
    type === "LM7805" ||
    type === "REG7805" ||
    type === "LM317" ||
    type === "TIMER_555" ||
    type === "BUZZER" ||
    type === "OUTPUT"
  )
    return true;
  if (
    type === "VOLTMETER" ||
    type === "AMMETER" ||
    type === "OHMMETER" ||
    type === "POWER_METER" ||
    type === "WATTMETER" ||
    type === "DMM_PROBE"
  )
    return true;
  return false;
}

/**
 * Solves the real-time Modified Nodal Analysis (MNA) system for any schematic on the CircuitLab canvas.
 * Implements Kirchhoff's Laws (KCL & KVL) dynamically across all components:
 * 1. Kirchhoff's Current Law (KCL): sum of algebraic branch currents entering every node is zero.
 * 2. Kirchhoff's Voltage Law (KVL): sum of component voltage drops around every loop equals source voltage (V_S = sum(V_drop)).
 * 3. Global Ground Net: Any terminal labeled 'GND', '0', '0V', 'NEUTRAL', 'COM', 'EARTH' or belonging to
 *    a GND component is automatically recognized and bound to the universal reference node (Net 0 = 0.00V).
 * 4. AC Sine Source Neutral Pin: The second terminal (Neutral/Ground) is automatically forced to bind
 *    to the common circuit ground reference when placed in a circuit.
 */
export function solveCircuitLabAnalog(
  nodes: CircuitNode[],
  wires: CircuitWire[],
  isSimRunning = true
): CircuitLabSolverResult {
  // Empty or non-running fallback
  const emptyResult: CircuitLabSolverResult = {
    netVoltages: new Map([[0, 0]]),
    compTelemetry: new Map(),
    getPinVoltage: () => 0,
    hasClosedLoop: false,
    totalLoopResistanceOhms: 0,
    loopCurrentMa: 0,
    sourceVoltageV: 0,
    kclSatisfied: true,
    kvlSatisfied: true,
    maxKclResidualMa: 0,
    kvlLoopResidualV: 0,
    hasExplicitGround: false,
    validationErrors: [],
    converged: true,
    iterations: 0,
  };

  if (nodes.length === 0) return emptyResult;

  const validationErrors: string[] = [];

  // 1. Disjoint-Set Union (DSU) to group connected pins into electrical Nets
  const parent = new Map<string, string>();
  const find = (key: string): string => {
    if (!parent.has(key)) parent.set(key, key);
    if (parent.get(key) !== key) {
      parent.set(key, find(parent.get(key)!));
    }
    return parent.get(key)!;
  };
  const union = (k1: string, k2: string) => {
    const r1 = find(k1);
    const r2 = find(k2);
    if (r1 !== r2) parent.set(r1, r2);
  };

  // Canonical Global Ground Net identifier
  const GLOBAL_GROUND_KEY = "__GLOBAL_GND_NET_0__";
  find(GLOBAL_GROUND_KEY);

  // Track whether circuit already defines an explicit ground reference
  let hasExplicitGroundRef = false;

  // Register all terminals for every node and link global ground terminals
  for (const n of nodes) {
    const compSpec = COMP_SPECS[n.type];
    if (n.type === "GND") {
      find(`${n.id}:in:0`);
      find(`${n.id}:out:0`);
      union(`${n.id}:in:0`, GLOBAL_GROUND_KEY);
      union(`${n.id}:out:0`, GLOBAL_GROUND_KEY);
      hasExplicitGroundRef = true;
    } else if (n.type === "AC_SINE" || n.type === "AC_VOLTAGE_SOURCE") {
      find(`${n.id}:out:0`);
      find(`${n.id}:out:1`);
      union(`${n.id}:out:1`, GLOBAL_GROUND_KEY);
      hasExplicitGroundRef = true;
    } else if (n.type === "BATTERY" || n.type === "DC_VOLTAGE" || n.type === "DC_VOLTAGE_SOURCE") {
      find(`${n.id}:out:0`);
      find(`${n.id}:out:1`);
    } else if (n.type === "VOLTMETER" || n.type === "DMM_PROBE" || n.type === "OHMMETER") {
      find(`${n.id}:in:0`);
      find(`${n.id}:in:1`);
    } else if (n.type === "POWER_METER" || n.type === "WATTMETER") {
      find(`${n.id}:in:0`);
      find(`${n.id}:in:1`);
      find(`${n.id}:in:2`);
      find(`${n.id}:out:0`);
    } else if (n.type === "INPUT" || n.type === "CLOCK" || n.type === "VCC_5V" || n.type === "VCC_12V" || n.type === "VCC") {
      find(`${n.id}:out:0`);
      if (n.type === "VCC_5V" || n.type === "VCC_12V" || n.type === "VCC") {
        hasExplicitGroundRef = true;
      }
    } else if (compSpec) {
      compSpec.inputs?.forEach((_, pIdx) => find(`${n.id}:in:${pIdx}`));
      compSpec.outputs?.forEach((_, pIdx) => find(`${n.id}:out:${pIdx}`));
    } else {
      find(`${n.id}:in:0`);
      find(`${n.id}:out:0`);
    }

    // Bind explicit ground-named terminals on components (do not falsely short emitter 'E (Gnd)' pins)
    if (compSpec && n.type !== "GND") {
      compSpec.inputs?.forEach((pin, pIdx) => {
        const pName = (pin.name || "").trim().toUpperCase();
        if (
          pName === "GND" ||
          pName === "0" ||
          pName === "0V" ||
          pName === "0V_REF" ||
          pName === "COM" ||
          pName === "EARTH" ||
          pName === "A (GND)"
        ) {
          find(`${n.id}:in:${pIdx}`);
          union(`${n.id}:in:${pIdx}`, GLOBAL_GROUND_KEY);
          hasExplicitGroundRef = true;
        }
      });
      compSpec.outputs?.forEach((pin, pIdx) => {
        const pName = (pin.name || "").trim().toUpperCase();
        if (
          pName === "GND" ||
          pName === "0" ||
          pName === "0V" ||
          pName === "0V_REF" ||
          pName === "COM" ||
          pName === "EARTH" ||
          pName === "NEUTRAL" ||
          pName === "NEUTRAL_GND"
        ) {
          find(`${n.id}:out:${pIdx}`);
          union(`${n.id}:out:${pIdx}`, GLOBAL_GROUND_KEY);
          hasExplicitGroundRef = true;
        }
      });
    }
  }

  // Union connected terminals from schematic wires
  for (const w of wires) {
    const fromNode = nodes.find((x) => x.id === w.from.node);
    const toNode = nodes.find((x) => x.id === w.to.node);
    const fromHasNoOuts =
      fromNode &&
      (fromNode.type === "VOLTMETER" ||
        fromNode.type === "DMM_PROBE" ||
        fromNode.type === "OHMMETER" ||
        fromNode.type === "OUTPUT");
    const defaultFromDir = fromHasNoOuts ? "in" : "out";
    const toHasNoIns =
      toNode &&
      (toNode.type === "VCC" ||
        toNode.type === "VCC_5V" ||
        toNode.type === "VCC_12V" ||
        toNode.type === "DC_VOLTAGE" ||
        toNode.type === "DC_VOLTAGE_SOURCE" ||
        toNode.type === "BATTERY" ||
        toNode.type === "AC_SINE" ||
        toNode.type === "AC_VOLTAGE_SOURCE" ||
        toNode.type === "INPUT" ||
        toNode.type === "CLOCK");
    const defaultToDir = toHasNoIns ? "out" : "in";
    const fromKey = `${w.from.node}:${w.from.dir || defaultFromDir}:${w.from.port}`;
    const toKey = `${w.to.node}:${w.to.dir || defaultToDir}:${w.to.port}`;
    union(fromKey, toKey);
  }

  // 2. Identify Reference Ground Net (Net 0)
  const gndRoots = new Set<string>();
  gndRoots.add(find(GLOBAL_GROUND_KEY));

  nodes.forEach((n) => {
    if (n.type === "GND") {
      gndRoots.add(find(`${n.id}:in:0`));
      gndRoots.add(find(`${n.id}:out:0`));
    }
    if (n.type === "AC_SINE" || n.type === "AC_VOLTAGE_SOURCE") {
      gndRoots.add(find(`${n.id}:out:1`));
    }
  });

  // Fallback reference: if no GND/AC/VCC rail is present, ground the negative terminal of the first floating DC source
  if (!hasExplicitGroundRef) {
    const firstFloatingSrc = nodes.find(
      (n) => n.type === "BATTERY" || n.type === "DC_VOLTAGE" || n.type === "DC_VOLTAGE_SOURCE"
    );
    if (firstFloatingSrc) {
      gndRoots.add(find(`${firstFloatingSrc.id}:out:1`));
    }
  }

  // Map each unique root to an integer Net ID (Net 0 = Global Ground 0.00V)
  const rootToNet = new Map<string, number>();
  let nextNetId = 1;

  for (const k of parent.keys()) {
    const r = find(k);
    if (gndRoots.has(r)) {
      rootToNet.set(r, 0);
    } else if (!rootToNet.has(r)) {
      rootToNet.set(r, nextNetId++);
    }
  }

  const getPinNet = (nodeId: number, port: number, dir: "in" | "out"): number => {
    const key = `${nodeId}:${dir}:${port}`;
    const r = find(key);
    return rootToNet.get(r) ?? 0;
  };

  const numUnknownNets = nextNetId - 1; // Nets 1 .. N

  // 3. Identify Independent Voltage Sources
  interface VSourceDef {
    nodeId: number;
    voltageV: number;
    netPos: number;
    netNeg: number;
    label: string;
  }
  const vSources: VSourceDef[] = [];

  for (const n of nodes) {
    if (n.type === "AC_SINE" || n.type === "AC_VOLTAGE_SOURCE") {
      const vVal = n.analogParams?.acVoltageV ?? 5.0; // default 5V
      const netPos = getPinNet(n.id, 0, "out");
      const netNeg = getPinNet(n.id, 1, "out");
      vSources.push({
        nodeId: n.id,
        voltageV: isSimRunning ? vVal : 0,
        netPos,
        netNeg,
        label: n.label || "AC_SINE",
      });
    } else if (n.type === "VCC_5V" || n.type === "VCC") {
      const netPos = getPinNet(n.id, 0, "out");
      vSources.push({
        nodeId: n.id,
        voltageV: isSimRunning ? 5.0 : 0,
        netPos,
        netNeg: 0,
        label: n.label || "+5V",
      });
    } else if (n.type === "VCC_12V") {
      const netPos = getPinNet(n.id, 0, "out");
      vSources.push({
        nodeId: n.id,
        voltageV: isSimRunning ? 12.0 : 0,
        netPos,
        netNeg: 0,
        label: n.label || "+12V",
      });
    } else if (n.type === "DC_VOLTAGE" || n.type === "DC_VOLTAGE_SOURCE" || n.type === "BATTERY") {
      const vVal =
        n.analogParams?.dcVoltageV ?? (n.type === "BATTERY" ? 9.0 : 5.0);
      const netPos = getPinNet(n.id, 0, "out");
      const netNeg = getPinNet(n.id, 1, "out");
      vSources.push({
        nodeId: n.id,
        voltageV: isSimRunning ? vVal : 0,
        netPos,
        netNeg,
        label: n.label || "V_DC",
      });
    } else if (n.type === "INPUT" || n.type === "CLOCK") {
      const vVal = (n.value ?? 0) === 1 ? 5.0 : 0.0;
      const netPos = getPinNet(n.id, 0, "out");
      vSources.push({
        nodeId: n.id,
        voltageV: isSimRunning ? vVal : 0,
        netPos,
        netNeg: 0,
        label: n.label || n.type,
      });
    }
  }

  // 4. Component Conductances & Resistances
  interface ResistorBranch {
    nodeId: number;
    resistanceOhms: number;
    netA: number;
    netB: number;
    isDiode?: boolean;
    isZener?: boolean;
    vf?: number;
    vz?: number;
    telemetryOnly?: boolean;
  }
  const resistorBranches: ResistorBranch[] = [];

  for (const n of nodes) {
    if (
      n.type === "GND" ||
      n.type === "AC_SINE" ||
      n.type === "AC_VOLTAGE_SOURCE" ||
      n.type === "VCC_5V" ||
      n.type === "VCC_12V" ||
      n.type === "VCC" ||
      n.type === "DC_VOLTAGE" ||
      n.type === "DC_VOLTAGE_SOURCE" ||
      n.type === "BATTERY" ||
      n.type === "INPUT" ||
      n.type === "CLOCK"
    ) {
      continue;
    }

    const netA = getPinNet(n.id, 0, "in");
    const netB = getPinNet(n.id, 0, "out");

    if (n.type === "RES" || n.type === "RESISTOR") {
      const r = Math.max(0.1, n.analogParams?.resistanceOhms ?? 1000);
      resistorBranches.push({ nodeId: n.id, resistanceOhms: r, netA, netB });
    } else if (n.type === "POT") {
      const r = Math.max(0.1, n.analogParams?.resistanceOhms ?? 10000);
      resistorBranches.push({ nodeId: n.id, resistanceOhms: r, netA, netB });
    } else if (n.type === "AMMETER") {
      resistorBranches.push({
        nodeId: n.id,
        resistanceOhms: 0.001,
        netA,
        netB,
      });
    } else if (n.type === "VOLTMETER" || n.type === "DMM_PROBE" || n.type === "OHMMETER") {
      const netVMinus = getPinNet(n.id, 1, "in");
      resistorBranches.push({
        nodeId: n.id,
        resistanceOhms: 10e6,
        netA,
        netB: netVMinus,
      });
    } else if (n.type === "POWER_METER" || n.type === "WATTMETER") {
      const netIIn = getPinNet(n.id, 2, "in");
      const netIOut = getPinNet(n.id, 0, "out");
      resistorBranches.push({
        nodeId: n.id,
        resistanceOhms: 0.001,
        netA: netIIn,
        netB: netIOut,
      });
      const netVPlus = getPinNet(n.id, 0, "in");
      const netVMinus = getPinNet(n.id, 1, "in");
      resistorBranches.push({
        nodeId: n.id,
        resistanceOhms: 10e6,
        netA: netVPlus,
        netB: netVMinus,
      });
    } else if (n.type === "SWITCH_SPST" || n.type === "PUSHBUTTON") {
      const isClosed = (n.value ?? 1) >= 1;
      resistorBranches.push({
        nodeId: n.id,
        resistanceOhms: isClosed ? 0.001 : 10e6,
        netA,
        netB,
      });
    } else if (n.type === "FUSE") {
      resistorBranches.push({
        nodeId: n.id,
        resistanceOhms: 0.01,
        netA,
        netB,
      });
    } else if (n.type === "XTAL") {
      resistorBranches.push({
        nodeId: n.id,
        resistanceOhms: 25,
        netA,
        netB,
      });
    } else if (n.type === "BUZZER") {
      resistorBranches.push({
        nodeId: n.id,
        resistanceOhms: Math.max(8, n.analogParams?.resistanceOhms ?? 32),
        netA,
        netB,
      });
    } else if (
      n.type === "LED_RED" ||
      n.type === "LED_GREEN" ||
      n.type === "LED_BLUE" ||
      n.type === "OUTPUT"
    ) {
      const vf =
        n.type === "LED_BLUE"
          ? 3.2
          : n.type === "LED_GREEN"
          ? 2.2
          : 2.0;
      resistorBranches.push({
        nodeId: n.id,
        resistanceOhms: 25,
        netA,
        netB,
        isDiode: true,
        vf,
      });
    } else if (n.type === "DIODE_1N4007" || n.type === "SCHOTTKY" || n.type === "PHOTODIODE") {
      const vf = n.type === "SCHOTTKY" ? 0.3 : 0.7;
      resistorBranches.push({
        nodeId: n.id,
        resistanceOhms: 10,
        netA,
        netB,
        isDiode: true,
        vf,
      });
    } else if (n.type === "ZENER" || n.type === "ZENER_BZX84") {
      const vz = n.analogParams?.dcVoltageV ?? 5.1;
      // ZENER has in:0 = Cathode(K), in:1 = Anode(GND); ZENER_BZX84 has in:0 = Anode, out:0 = Cathode
      const netAnode = n.type === "ZENER" ? getPinNet(n.id, 1, "in") : netA;
      const netCathode = n.type === "ZENER" ? getPinNet(n.id, 0, "in") : netB;
      resistorBranches.push({
        nodeId: n.id,
        resistanceOhms: 6,
        netA: netAnode,
        netB: netCathode,
        isDiode: true,
        isZener: true,
        vf: 0.7,
        vz,
      });
      if (n.type === "ZENER") {
        // Tie out:0 (VZ_5V1) monitor pin directly to Cathode rail
        const netOut0 = getPinNet(n.id, 0, "out");
        resistorBranches.push({
          nodeId: n.id,
          resistanceOhms: 0.01,
          netA: netCathode,
          netB: netOut0,
          telemetryOnly: true,
        });
      }
    } else if (n.type === "BRIDGE_RECT") {
      const netAc1 = getPinNet(n.id, 0, "in");
      const netAc2 = getPinNet(n.id, 1, "in");
      const netDcPos = getPinNet(n.id, 0, "out");
      const netDcNeg = getPinNet(n.id, 1, "out");
      resistorBranches.push(
        { nodeId: n.id, resistanceOhms: 5, netA: netAc1, netB: netDcPos, isDiode: true, vf: 0.7 },
        { nodeId: n.id, resistanceOhms: 5, netA: netAc2, netB: netDcPos, isDiode: true, vf: 0.7 },
        { nodeId: n.id, resistanceOhms: 5, netA: netDcNeg, netB: netAc1, isDiode: true, vf: 0.7, telemetryOnly: true },
        { nodeId: n.id, resistanceOhms: 5, netA: netDcNeg, netB: netAc2, isDiode: true, vf: 0.7, telemetryOnly: true }
      );
    } else if (n.type === "CAP_NP" || n.type === "CAPACITOR" || n.type === "CAP_POL") {
      const capUf = n.analogParams?.capacitanceUf;
      if (capUf !== undefined && (!Number.isFinite(capUf) || capUf <= 0)) {
        validationErrors.push(
          `Component "${n.label || n.type}" has invalid capacitance (${capUf} uF).`
        );
      }
      // DC steady-state model: ideal capacitor is an open circuit (1e12 Ohm leakage)
      resistorBranches.push({
        nodeId: n.id,
        resistanceOhms: 1e12,
        netA,
        netB,
      });
    } else if (n.type === "IND" || n.type === "INDUCTOR" || n.type === "TRANSFORMER") {
      const indMh = n.analogParams?.inductanceMh;
      if (indMh !== undefined && (!Number.isFinite(indMh) || indMh <= 0)) {
        validationErrors.push(
          `Component "${n.label || n.type}" has invalid inductance (${indMh} mH).`
        );
      }
      // DC steady-state model: ideal inductor is a short circuit with tiny winding DCR
      resistorBranches.push({
        nodeId: n.id,
        resistanceOhms: 0.005,
        netA,
        netB,
      });
    } else if (n.type === "RELAY_SPDT") {
      const netCoilP = getPinNet(n.id, 0, "in");
      const netCoilN = getPinNet(n.id, 1, "in");
      const netCom = getPinNet(n.id, 2, "in");
      const netNo = getPinNet(n.id, 0, "out");
      const netNc = getPinNet(n.id, 1, "out");
      const isEnergized = (n.value ?? 0) >= 1;
      resistorBranches.push(
        { nodeId: n.id, resistanceOhms: 120, netA: netCoilP, netB: netCoilN },
        { nodeId: n.id, resistanceOhms: isEnergized ? 0.02 : 10e6, netA: netCom, netB: netNo, telemetryOnly: true },
        { nodeId: n.id, resistanceOhms: isEnergized ? 10e6 : 0.02, netA: netCom, netB: netNc, telemetryOnly: true }
      );
    }
  }

  // 5. Build and Solve the MNA System
  const totalVars = numUnknownNets + vSources.length;
  if (totalVars === 0) return emptyResult;

  if (!hasExplicitGroundRef && vSources.length > 0 && resistorBranches.length > 0) {
    validationErrors.push(
      "No explicit GND node present; temporarily referencing negative terminal of primary source."
    );
  }

  let nodeVoltages = new Array(numUnknownNets + 1).fill(0); // index 0 is Net 0 = 0V
  let sourceCurrents = new Array(vSources.length).fill(0);
  let converged = true;
  let completedIterations = 0;

  const hasSemiconductors =
    resistorBranches.some((b) => b.isDiode) ||
    nodes.some((n) =>
      [
        "BC547",
        "BC557",
        "BJT",
        "BJT_NPN",
        "BJT_PNP",
        "2N2222",
        "MOSFET_N",
        "MOSFET_P",
        "IRF540N",
        "JFET_N",
        "SCR",
        "TRIAC",
        "DIAC",
        "OPAMP_741",
        "LM358",
        "LM393",
        "LM7805",
        "REG7805",
        "LM317",
        "OPTO_PC817",
        "PC817",
        "TIMER_555",
      ].includes(n.type)
    );
  const maxIterations = hasSemiconductors ? 24 : 1;
  let lastDebugA: number[][] = [];
  let lastDebugB: number[] = [];
  let lastDebugX: number[] = [];

  for (let iter = 0; iter < maxIterations; iter++) {
    const A: number[][] = Array.from({ length: totalVars }, () =>
      new Array(totalVars).fill(0)
    );
    const b: number[] = new Array(totalVars).fill(0);

    // Gmin conductance to prevent singular matrix on floating subcircuits
    const gmin = 1e-12;
    for (let i = 0; i < numUnknownNets; i++) {
      A[i][i] += gmin;
    }

    // Helper to stamp conductance G into MNA matrix
    const stampG = (n1: number, n2: number, g: number) => {
      const idx1 = n1 - 1;
      const idx2 = n2 - 1;
      if (idx1 >= 0) A[idx1][idx1] += g;
      if (idx2 >= 0) A[idx2][idx2] += g;
      if (idx1 >= 0 && idx2 >= 0) {
        A[idx1][idx2] -= g;
        A[idx2][idx1] -= g;
      }
    };

    // Helper to stamp current source into RHS vector b (flows out of fromNet, into toNet)
    const stampI = (fromNet: number, toNet: number, current: number) => {
      const idxFrom = fromNet - 1;
      const idxTo = toNet - 1;
      if (idxFrom >= 0) b[idxFrom] -= current;
      if (idxTo >= 0) b[idxTo] += current;
    };

    const stampVCCSLocal = (
      outPos: number,
      outNeg: number,
      ctrlPos: number,
      ctrlNeg: number,
      gm: number
    ) => {
      const op = outPos - 1;
      const on = outNeg - 1;
      const cp = ctrlPos - 1;
      const cn = ctrlNeg - 1;
      if (op >= 0) {
        if (cp >= 0) A[op][cp] += gm;
        if (cn >= 0) A[op][cn] -= gm;
      }
      if (on >= 0) {
        if (cp >= 0) A[on][cp] -= gm;
        if (cn >= 0) A[on][cn] += gm;
      }
    };

    // Stamp resistor, zener, and diode branches
    for (const br of resistorBranches) {
      if (br.isZener && br.vz !== undefined) {
        const vA = nodeVoltages[br.netA] ?? 0;
        const vB = nodeVoltages[br.netB] ?? 0;
        const vDiff = vA - vB;
        const vf = br.vf ?? 0.7;
        const gOn = 1 / br.resistanceOhms;
        if (vDiff > vf * 0.85) {
          stampG(br.netA, br.netB, gOn);
          stampI(br.netA, br.netB, -gOn * vf);
        } else if (vDiff < -br.vz * 0.92) {
          // Reverse breakdown: V_B - V_A clamps near +vz
          stampG(br.netA, br.netB, gOn);
          stampI(br.netA, br.netB, gOn * br.vz);
        } else {
          stampG(br.netA, br.netB, 1e-7);
        }
      } else if (br.isDiode && br.vf !== undefined) {
        const vA = nodeVoltages[br.netA] ?? 0;
        const vB = nodeVoltages[br.netB] ?? 0;
        const vDiff = iter === 0 ? br.vf + 0.05 : vA - vB;
        if (vDiff > br.vf * 0.8) {
          const g = 1 / br.resistanceOhms;
          stampG(br.netA, br.netB, g);
          stampI(br.netA, br.netB, -g * br.vf);
        } else {
          stampG(br.netA, br.netB, 1e-7);
        }
      } else {
        const g = 1 / br.resistanceOhms;
        stampG(br.netA, br.netB, g);
      }
    }

    // Stamp Transistors, Thyristors, Linear Op-Amps, Voltage Regulators & Optocouplers
    for (const n of nodes) {
      if (
        n.type === "BC547" ||
        n.type === "BJT" ||
        n.type === "BJT_NPN" ||
        n.type === "2N2222"
      ) {
        const netB = getPinNet(n.id, 0, "in");
        const netC = getPinNet(n.id, 1, "in");
        const netE = getPinNet(n.id, 2, "in");
        const vB = nodeVoltages[netB] ?? 0;
        const vC = nodeVoltages[netC] ?? 0;
        const vE = nodeVoltages[netE] ?? 0;
        const vbe = vB - vE;
        const vce = vC - vE;
        const beta = n.analogParams?.transistorBeta ?? 250;
        const vbeOn = 0.7;

        if (vbe >= 0.55) {
          const gBe = 1 / 180;
          const iB = Math.max(0, (vbe - vbeOn) * gBe);
          stampG(netB, netE, gBe);
          stampI(netB, netE, iB - gBe * vbe);
          if (vce > 0.2) {
            const gm = beta * gBe;
            const iC = beta * iB;
            stampVCCSLocal(netC, netE, netB, netE, gm);
            stampG(netC, netE, 1e-4);
            stampI(netC, netE, iC - gm * vbe - 1e-4 * vce);
          } else {
            const gSat = 1 / 4;
            stampG(netC, netE, gSat);
            stampI(netC, netE, (vce - 0.2) * gSat - gSat * vce);
          }
        } else {
          stampG(netB, netE, 1e-7);
          stampG(netC, netE, 1e-7);
        }
      } else if (n.type === "BC557" || n.type === "BJT_PNP") {
        const netB = getPinNet(n.id, 0, "in");
        const netE = getPinNet(n.id, 1, "in");
        const netC = getPinNet(n.id, 2, "in");
        const vB = nodeVoltages[netB] ?? 0;
        const vE = nodeVoltages[netE] ?? 0;
        const vC = nodeVoltages[netC] ?? 0;
        const veb = vE - vB;
        const vec = vE - vC;
        const beta = n.analogParams?.transistorBeta ?? 220;
        if (veb >= 0.55) {
          const gEb = 1 / 180;
          const iB = Math.max(0, (veb - 0.7) * gEb);
          stampG(netE, netB, gEb);
          stampI(netE, netB, iB - gEb * veb);
          if (vec > 0.2) {
            const gm = beta * gEb;
            stampVCCSLocal(netE, netC, netE, netB, gm);
            stampG(netE, netC, 1e-4);
            stampI(netE, netC, beta * iB - gm * veb - 1e-4 * vec);
          } else {
            const gSat = 1 / 4;
            stampG(netE, netC, gSat);
            stampI(netE, netC, (vec - 0.2) * gSat - gSat * vec);
          }
        } else {
          stampG(netE, netB, 1e-7);
          stampG(netE, netC, 1e-7);
        }
      } else if (n.type === "IRF540N" || n.type === "MOSFET_N" || n.type === "JFET_N") {
        const netG = getPinNet(n.id, 0, "in");
        const netD = getPinNet(n.id, 1, "in");
        const netS = getPinNet(n.id, 2, "in");
        const vG = nodeVoltages[netG] ?? 0;
        const vS = nodeVoltages[netS] ?? 0;
        const vgs = vG - vS;
        stampG(netG, netS, 1e-9);
        const on = n.type === "JFET_N" ? vgs > -3.5 : vgs >= 2.2;
        stampG(netD, netS, on ? 1 / 0.15 : 1e-7);
      } else if (n.type === "MOSFET_P") {
        const netG = getPinNet(n.id, 0, "in");
        const netS = getPinNet(n.id, 1, "in");
        const netD = getPinNet(n.id, 2, "in");
        const vsg = (nodeVoltages[netS] ?? 0) - (nodeVoltages[netG] ?? 0);
        stampG(netS, netG, 1e-9);
        stampG(netS, netD, vsg >= 2.2 ? 1 / 0.18 : 1e-7);
      } else if (n.type === "SCR" || n.type === "TRIAC") {
        const net0 = getPinNet(n.id, 0, "in");
        const net1 = getPinNet(n.id, 1, "in");
        const net2 = getPinNet(n.id, 2, "in");
        const vgk = (nodeVoltages[net1] ?? 0) - (nodeVoltages[net2] ?? 0);
        stampG(net1, net2, 1 / 100);
        stampG(net0, net2, Math.abs(vgk) >= 0.75 ? 1 / 0.5 : 1e-7);
      } else if (n.type === "DIAC") {
        const net1 = getPinNet(n.id, 0, "in");
        const net2 = getPinNet(n.id, 1, "in");
        const dv = Math.abs((nodeVoltages[net1] ?? 0) - (nodeVoltages[net2] ?? 0));
        stampG(net1, net2, dv >= 32 ? 1 / 8 : 1e-7);
      } else if (n.type === "OPAMP_741" || n.type === "LM358" || n.type === "LM393") {
        const netVp = getPinNet(n.id, 0, "in");
        const netVn = getPinNet(n.id, 1, "in");
        const netVout = getPinNet(n.id, 0, "out");
        const vPlus = nodeVoltages[netVp] ?? 0;
        const vMinus = nodeVoltages[netVn] ?? 0;
        const vRail = n.analogParams?.dcVoltageV ?? 12.0;
        // High-Z differential input and clamped closed-loop output Norton stage
        stampG(netVp, netVn, 1e-7);
        const vRawTarget = 100 * (vPlus - vMinus);
        const vOutClamped = Math.max(-vRail, Math.min(vRail, vRawTarget));
        const gOut = 1 / 35;
        stampG(netVout, 0, gOut);
        stampI(0, netVout, vOutClamped * gOut);
      } else if (n.type === "LM7805" || n.type === "REG7805" || n.type === "LM317") {
        const netVin = getPinNet(n.id, 0, "in");
        const netGnd = getPinNet(n.id, 1, "in");
        const netVout = getPinNet(n.id, 0, "out");
        const vIn = (nodeVoltages[netVin] ?? 0) - (nodeVoltages[netGnd] ?? 0);
        const targetReg = n.type === "LM317" ? (n.analogParams?.dcVoltageV ?? 3.3) : 5.0;
        const vOut = vIn >= targetReg + 1.5 ? targetReg : Math.max(0, vIn - 1.5);
        stampG(netVin, netGnd, 1 / 1200);
        const gOut = 1 / 0.5;
        stampG(netVout, netGnd, gOut);
        stampI(netGnd, netVout, vOut * gOut);
      } else if (n.type === "OPTO_PC817" || n.type === "PC817") {
        const netLedA = getPinNet(n.id, 0, "in");
        const netLedK = getPinNet(n.id, 1, "in");
        const netEmit = getPinNet(n.id, 0, "out");
        const netColl = getPinNet(n.id, 1, "out");
        const vLed = (nodeVoltages[netLedA] ?? 0) - (nodeVoltages[netLedK] ?? 0);
        stampG(netLedA, netLedK, vLed >= 1.1 ? 1 / 25 : 1e-7);
        if (vLed >= 1.1) stampI(netLedA, netLedK, -1.1 / 25);
        stampG(netColl, netEmit, vLed >= 1.1 ? 1 / 40 : 1e-7);
      } else if (n.type === "TIMER_555") {
        const netOut = getPinNet(n.id, 0, "out");
        const outV = (n.value ?? 1) >= 1 ? 4.5 : 0.1;
        stampG(netOut, 0, 1 / 20);
        stampI(0, netOut, outV / 20);
      }
    }

    // Stamp Independent Voltage Sources into MNA Border Rows & Columns
    vSources.forEach((src, vIdx) => {
      const varIdx = numUnknownNets + vIdx;
      const idxPos = src.netPos - 1;
      const idxNeg = src.netNeg - 1;

      if (idxPos >= 0) {
        A[idxPos][varIdx] += 1;
        A[varIdx][idxPos] += 1;
      }
      if (idxNeg >= 0) {
        A[idxNeg][varIdx] -= 1;
        A[varIdx][idxNeg] -= 1;
      }

      b[varIdx] = src.voltageV;
    });

    // Solve dense linear matrix system A * x = b
    completedIterations = iter + 1;
    lastDebugA = A;
    lastDebugB = b;
    const solution = solveDenseMnaSystem(A, b);
    if (!solution || solution.length !== totalVars) {
      converged = false;
      validationErrors.push(
        `Singular or ill-conditioned MNA matrix at Newton iteration ${completedIterations}.`
      );
      break;
    }
    lastDebugX = solution;

    let maxDelta = 0;
    for (let i = 0; i < numUnknownNets; i++) {
      const nextV = iter > 6 ? 0.5 * (nodeVoltages[i + 1] + solution[i]) : solution[i];
      maxDelta = Math.max(maxDelta, Math.abs(nextV - nodeVoltages[i + 1]));
      nodeVoltages[i + 1] = nextV;
    }
    for (let sIdx = 0; sIdx < vSources.length; sIdx++) {
      sourceCurrents[sIdx] = solution[numUnknownNets + sIdx];
    }
    if (iter > 1 && maxDelta < 1e-4) break;
    if (iter === maxIterations - 1 && hasSemiconductors && maxDelta >= 1e-3) {
      converged = false;
      validationErrors.push(
        `Nonlinear Newton-Raphson did not converge within ${maxIterations} iterations (delta=${maxDelta.toExponential(2)} V).`
      );
    }
  }

  // 6. Assemble Net Voltages Map
  const netVoltages = new Map<number, number>();
  netVoltages.set(0, 0.0);
  for (let i = 1; i <= numUnknownNets; i++) {
    netVoltages.set(i, nodeVoltages[i]);
  }

  const getPinVoltage = (nodeId: number, port: number, dir: "in" | "out" = "out"): number => {
    const net = getPinNet(nodeId, port, dir);
    return netVoltages.get(net) ?? 0.0;
  };

  // 7. Compute Component Telemetry (exact V_drop, Current I, Power P)
  const compTelemetry = new Map<number, CircuitLabAnalogTelemetry>();
  let totalLoopResistance = 0;
  let maxBranchCurrentMa = 0;

  for (const n of nodes) {
    if (n.type === "GND") {
      compTelemetry.set(n.id, {
        vTerm0: 0,
        vTerm1: 0,
        vDrop: 0,
        current_mA: 0,
        current_A: 0,
        power_mW: 0,
        isConducting: true,
        net0: 0,
        net1: 0,
        resistanceOhms: 0,
        label: n.label || "GND",
      });
      continue;
    }

    if (n.type === "AC_SINE") {
      const v0 = getPinVoltage(n.id, 0, "out"); // PHASE
      const v1 = getPinVoltage(n.id, 1, "out"); // NEUTRAL_GND
      const sIdx = vSources.findIndex((s) => s.nodeId === n.id);
      const iA = sIdx >= 0 ? Math.abs(sourceCurrents[sIdx]) : 0;
      const imA = iA * 1000;
      const vDrop = Math.abs(v0 - v1);
      compTelemetry.set(n.id, {
        vTerm0: v0,
        vTerm1: v1,
        vDrop,
        current_mA: imA,
        current_A: iA,
        power_mW: vDrop * imA,
        isConducting: imA > 0.01,
        net0: getPinNet(n.id, 0, "out"),
        net1: getPinNet(n.id, 1, "out"),
        label: n.label || "AC_SINE",
      });
      if (imA > maxBranchCurrentMa) maxBranchCurrentMa = imA;
      continue;
    }

    if (
      n.type === "VCC_5V" ||
      n.type === "VCC_12V" ||
      n.type === "VCC" ||
      n.type === "DC_VOLTAGE" ||
      n.type === "DC_VOLTAGE_SOURCE" ||
      n.type === "BATTERY" ||
      n.type === "INPUT" ||
      n.type === "CLOCK"
    ) {
      const hasNegPin =
        n.type === "BATTERY" || n.type === "DC_VOLTAGE" || n.type === "DC_VOLTAGE_SOURCE";
      const v0 = getPinVoltage(n.id, 0, "out");
      const v1 = hasNegPin ? getPinVoltage(n.id, 1, "out") : 0.0;
      const sIdx = vSources.findIndex((s) => s.nodeId === n.id);
      const iA = sIdx >= 0 ? Math.abs(sourceCurrents[sIdx]) : 0;
      const imA = iA * 1000;
      const vDrop = Math.abs(v0 - v1);
      compTelemetry.set(n.id, {
        vTerm0: v0,
        vTerm1: v1,
        vDrop,
        current_mA: imA,
        current_A: iA,
        power_mW: vDrop * imA,
        isConducting: imA > 0.01,
        net0: getPinNet(n.id, 0, "out"),
        net1: hasNegPin ? getPinNet(n.id, 1, "out") : 0,
        label: n.label || n.type,
      });
      if (imA > maxBranchCurrentMa) maxBranchCurrentMa = imA;
      continue;
    }

    if (n.type === "POWER_METER" || n.type === "WATTMETER") {
      const netVPlus = getPinNet(n.id, 0, "in");
      const netVMinus = getPinNet(n.id, 1, "in");
      const netIIn = getPinNet(n.id, 2, "in");
      const netIOut = getPinNet(n.id, 0, "out");

      const vPlus = netVoltages.get(netVPlus) ?? 0.0;
      const vMinus = netVoltages.get(netVMinus) ?? 0.0;
      const vDrop = Math.abs(vPlus - vMinus);

      const vIIn = netVoltages.get(netIIn) ?? 0.0;
      const vIOut = netVoltages.get(netIOut) ?? 0.0;
      const shuntDrop = Math.abs(vIIn - vIOut);
      const current_A = shuntDrop / 0.001;
      const current_mA = current_A * 1000;
      const power_mW = vDrop * current_mA;
      const isConducting = current_mA > 0.05;

      compTelemetry.set(n.id, {
        vTerm0: vPlus,
        vTerm1: vMinus,
        vDrop,
        current_mA,
        current_A,
        power_mW,
        isConducting,
        net0: netVPlus,
        net1: netVMinus,
        resistanceOhms: 0.001,
        label: n.label || n.type,
      });
      if (current_mA > maxBranchCurrentMa) maxBranchCurrentMa = current_mA;
      continue;
    }

    if (n.type === "OHMMETER") {
      const netA = getPinNet(n.id, 0, "in");
      const netB = getPinNet(n.id, 1, "in");
      const v0 = netVoltages.get(netA) ?? 0.0;
      const v1 = netVoltages.get(netB) ?? 0.0;
      const vDrop = Math.abs(v0 - v1);

      const hasLead0 = wires.some(
        (w) =>
          (w.to.node === n.id && w.to.port === 0 && (w.to.dir || "in") === "in") ||
          (w.from.node === n.id && w.from.port === 0 && (w.from.dir || "in") === "in")
      );
      const hasLead1 = wires.some(
        (w) =>
          (w.to.node === n.id && w.to.port === 1 && (w.to.dir || "in") === "in") ||
          (w.from.node === n.id && w.from.port === 1 && (w.from.dir || "in") === "in")
      );

      let measuredOhms = Infinity;
      if (hasLead0 && hasLead1) {
        if (netA === netB) {
          measuredOhms = 0.0;
        } else {
          // Passive DC Thévenin equivalent resistance between probe netA and netB
          const dcBranches: { a: number; b: number; g: number }[] = [];
          for (const cn of nodes) {
            if (cn.type === "RES" || cn.type === "RESISTOR") {
              const r = Math.max(0.1, cn.analogParams?.resistanceOhms ?? 1000);
              dcBranches.push({ a: getPinNet(cn.id, 0, "in"), b: getPinNet(cn.id, 0, "out"), g: 1 / r });
            } else if (cn.type === "POT") {
              const r = Math.max(0.1, cn.analogParams?.resistanceOhms ?? 10000);
              dcBranches.push({ a: getPinNet(cn.id, 0, "in"), b: getPinNet(cn.id, 0, "out"), g: 1 / r });
            } else if (cn.type === "AMMETER") {
              dcBranches.push({ a: getPinNet(cn.id, 0, "in"), b: getPinNet(cn.id, 0, "out"), g: 1 / 0.001 });
            } else if (cn.type === "FUSE") {
              dcBranches.push({ a: getPinNet(cn.id, 0, "in"), b: getPinNet(cn.id, 0, "out"), g: 1 / 0.01 });
            } else if (cn.type === "IND" || cn.type === "INDUCTOR" || cn.type === "TRANSFORMER") {
              dcBranches.push({ a: getPinNet(cn.id, 0, "in"), b: getPinNet(cn.id, 0, "out"), g: 1 / 0.5 });
            } else if (cn.type === "BUZZER") {
              const r = Math.max(8, cn.analogParams?.resistanceOhms ?? 32);
              dcBranches.push({ a: getPinNet(cn.id, 0, "in"), b: getPinNet(cn.id, 0, "out"), g: 1 / r });
            } else if (cn.type === "SWITCH_SPST" || cn.type === "PUSHBUTTON") {
              if ((cn.value ?? 1) >= 1) {
                dcBranches.push({ a: getPinNet(cn.id, 0, "in"), b: getPinNet(cn.id, 0, "out"), g: 1 / 0.001 });
              }
            } else if (cn.type === "POWER_METER" || cn.type === "WATTMETER") {
              dcBranches.push({ a: getPinNet(cn.id, 2, "in"), b: getPinNet(cn.id, 0, "out"), g: 1 / 0.001 });
            } else if (cn.type === "RELAY_SPDT") {
              const isEn = (cn.value ?? 0) >= 1;
              dcBranches.push({
                a: getPinNet(cn.id, 2, "in"),
                b: getPinNet(cn.id, isEn ? 0 : 1, "out"),
                g: 1 / 0.02,
              });
            }
          }
          const adj = new Map<number, number[]>();
          for (const br of dcBranches) {
            if (!adj.has(br.a)) adj.set(br.a, []);
            if (!adj.has(br.b)) adj.set(br.b, []);
            adj.get(br.a)!.push(br.b);
            adj.get(br.b)!.push(br.a);
          }
          const visited = new Set<number>([netA]);
          const q = [netA];
          while (q.length > 0) {
            const u = q.shift()!;
            for (const nxt of adj.get(u) || []) {
              if (!visited.has(nxt)) {
                visited.add(nxt);
                q.push(nxt);
              }
            }
          }
          if (visited.has(netB)) {
            const compNets = Array.from(visited).filter((x) => x !== netB);
            const nIdx = new Map<number, number>();
            compNets.forEach((u, idx) => nIdx.set(u, idx));
            const K = compNets.length;
            if (K === 0) {
              measuredOhms = 0;
            } else {
              const G: number[][] = Array.from({ length: K }, () => new Array(K).fill(0));
              const Ivec = new Array(K).fill(0);
              for (let i = 0; i < K; i++) G[i][i] += 1e-12;
              for (const br of dcBranches) {
                if (!visited.has(br.a) || !visited.has(br.b)) continue;
                const ia = nIdx.get(br.a);
                const ib = nIdx.get(br.b);
                if (ia !== undefined) G[ia][ia] += br.g;
                if (ib !== undefined) G[ib][ib] += br.g;
                if (ia !== undefined && ib !== undefined) {
                  G[ia][ib] -= br.g;
                  G[ib][ia] -= br.g;
                }
              }
              const sIdx = nIdx.get(netA)!;
              Ivec[sIdx] = 1.0;
              const sol = solveDenseMnaSystem(G, Ivec);
              if (sol && isFinite(sol[sIdx]) && sol[sIdx] < 1e7) {
                measuredOhms = Math.max(0, sol[sIdx]);
              }
            }
          }
        }
      }

      compTelemetry.set(n.id, {
        vTerm0: v0,
        vTerm1: v1,
        vDrop,
        current_mA: 0,
        current_A: 0,
        power_mW: 0,
        isConducting: false,
        net0: netA,
        net1: netB,
        resistanceOhms: measuredOhms,
        label: n.label || n.type,
      });
      continue;
    }

    // Compute branch current respecting Zener forward/breakdown and Diode polarity
    const br = resistorBranches.find((b) => b.nodeId === n.id && !b.telemetryOnly);
    const netA = br ? br.netA : getPinNet(n.id, 0, "in");
    const netB =
      br
        ? br.netB
        : n.type === "VOLTMETER" || n.type === "DMM_PROBE" || n.type === "OHMMETER"
        ? getPinNet(n.id, 1, "in")
        : getPinNet(n.id, 0, "out");

    const v0 = netVoltages.get(netA) ?? 0.0;
    const v1 = netVoltages.get(netB) ?? 0.0;
    const signedDiff = v0 - v1;
    const vDrop = Math.abs(signedDiff);
    const r = br?.resistanceOhms ?? (n.analogParams?.resistanceOhms ?? 1000);

    let current_A = 0;
    if (br?.isZener && br.vz !== undefined) {
      const vf = br.vf ?? 0.7;
      if (signedDiff > vf * 0.85) current_A = (signedDiff - vf) / r;
      else if (signedDiff < -br.vz * 0.92) current_A = Math.abs(signedDiff + br.vz) / r;
      else current_A = vDrop * 1e-7;
    } else if (br?.isDiode && br.vf !== undefined) {
      current_A = signedDiff > br.vf ? (signedDiff - br.vf) / r : 0;
    } else {
      current_A = r > 0 ? vDrop / r : 0;
    }

    const current_mA = current_A * 1000;
    const power_mW = vDrop * current_mA;
    const isConducting = current_mA > 0.05;

    if (n.type === "RES" || n.type === "RESISTOR" || n.type === "POT") {
      totalLoopResistance += r;
    }
    if (current_mA > maxBranchCurrentMa) {
      maxBranchCurrentMa = current_mA;
    }

    compTelemetry.set(n.id, {
      vTerm0: v0,
      vTerm1: v1,
      vDrop,
      current_mA,
      current_A,
      power_mW,
      isConducting,
      net0: netA,
      net1: netB,
      resistanceOhms: r,
      label: n.label || n.type,
    });
  }

  // 8. Kirchhoff's Laws (KCL & KVL / Tellegen Power Balance) Verification
  const primarySrc = vSources[0];
  const sourceVoltageV = primarySrc ? primarySrc.voltageV : 5.0;
  const hasClosedLoop = maxBranchCurrentMa > 0.05;

  // Calculate KCL residuals for every electrical net
  const netCurrentSums = new Map<number, number>();
  for (let net = 0; net <= numUnknownNets; net++) {
    netCurrentSums.set(net, 0.0);
  }

  for (const br of resistorBranches) {
    const vA = netVoltages.get(br.netA) ?? 0;
    const vB = netVoltages.get(br.netB) ?? 0;
    const vDiff = vA - vB;
    let iMa = 0;
    if (br.isZener && br.vz !== undefined) {
      const vf = br.vf ?? 0.7;
      if (vDiff > vf * 0.85) iMa = ((vDiff - vf) / br.resistanceOhms) * 1000;
      else if (vDiff < -br.vz * 0.92) iMa = ((vDiff + br.vz) / br.resistanceOhms) * 1000;
      else iMa = vDiff * 1e-4;
    } else if (br.isDiode && br.vf !== undefined) {
      iMa = vDiff > br.vf * 0.8 ? ((vDiff - br.vf) / br.resistanceOhms) * 1000 : vDiff * 1e-4;
    } else {
      iMa = (vDiff / br.resistanceOhms) * 1000;
    }
    netCurrentSums.set(br.netA, (netCurrentSums.get(br.netA) ?? 0) - iMa);
    netCurrentSums.set(br.netB, (netCurrentSums.get(br.netB) ?? 0) + iMa);
  }

  vSources.forEach((src, sIdx) => {
    const iSrcMa = (sourceCurrents[sIdx] ?? 0) * 1000;
    netCurrentSums.set(src.netPos, (netCurrentSums.get(src.netPos) ?? 0) - iSrcMa);
    netCurrentSums.set(src.netNeg, (netCurrentSums.get(src.netNeg) ?? 0) + iSrcMa);
  });

  let maxKclResidualMa = 0;
  for (let net = 1; net <= numUnknownNets; net++) {
    const res = Math.abs(netCurrentSums.get(net) ?? 0);
    if (res > maxKclResidualMa) maxKclResidualMa = res;
  }
  const kclSatisfied = hasClosedLoop ? maxKclResidualMa < 0.25 : true;

  // Compute load voltage share (%) and verify energy conservation (sum(P_src) = sum(P_load) => KVL holds across all loops)
  let totalSuppliedMw = 0;
  let totalSourceCurrMa = 0;
  vSources.forEach((src, sIdx) => {
    const iMa = -(sourceCurrents[sIdx] ?? 0) * 1000;
    totalSuppliedMw += src.voltageV * iMa;
    totalSourceCurrMa += Math.abs(iMa);
  });

  let totalLoadDissipatedMw = 0;
  for (const br of resistorBranches) {
    const vA = netVoltages.get(br.netA) ?? 0;
    const vB = netVoltages.get(br.netB) ?? 0;
    const vDiff = vA - vB;
    let iMa = 0;
    if (br.isZener && br.vz !== undefined) {
      const vf = br.vf ?? 0.7;
      if (vDiff > vf * 0.85) iMa = ((vDiff - vf) / br.resistanceOhms) * 1000;
      else if (vDiff < -br.vz * 0.92) iMa = ((vDiff + br.vz) / br.resistanceOhms) * 1000;
    } else if (br.isDiode && br.vf !== undefined) {
      iMa = vDiff > br.vf * 0.8 ? ((vDiff - br.vf) / br.resistanceOhms) * 1000 : 0;
    } else {
      iMa = (vDiff / br.resistanceOhms) * 1000;
    }
    totalLoadDissipatedMw += Math.abs(vDiff * iMa);
  }

  for (const n of nodes) {
    if (n.type === "RES" || n.type === "RESISTOR" || n.type === "POT" || n.type === "FUSE") {
      const telem = compTelemetry.get(n.id);
      if (telem && telem.isConducting && sourceVoltageV > 0) {
        telem.kvlDropPercent = (telem.vDrop / sourceVoltageV) * 100;
      }
    }
  }

  const kvlLoopResidualV =
    hasClosedLoop && totalSourceCurrMa > 1e-3 && !hasSemiconductors
      ? Math.abs(totalSuppliedMw - totalLoadDissipatedMw) / totalSourceCurrMa
      : 0.0;
  const kvlSatisfied = hasClosedLoop ? kvlLoopResidualV < 0.25 : true;

  const matrixVariableLabels: string[] = [
    ...Array.from({ length: numUnknownNets }, (_, idx) => `V(N${idx + 1})`),
    ...vSources.map((src, idx) => `I(${src.label || `V${idx + 1}`})`),
  ];

  return {
    netVoltages,
    compTelemetry,
    getPinVoltage,
    hasClosedLoop,
    totalLoopResistanceOhms: totalLoopResistance,
    loopCurrentMa: maxBranchCurrentMa,
    sourceVoltageV,
    kclSatisfied,
    kvlSatisfied,
    maxKclResidualMa,
    kvlLoopResidualV,
    hasExplicitGround: hasExplicitGroundRef,
    validationErrors,
    converged,
    iterations: completedIterations,
    matrixDebug: {
      variableLabels: matrixVariableLabels,
      matrixA: lastDebugA,
      vectorB: lastDebugB,
      solutionVectorX: lastDebugX,
    },
  };
}

export interface MnaComponent {
  id: number;
  type: "VS" | "R" | "D";
  val: number;
  nodePos: string;
  nodeNeg: string;
}

export interface MnaSolvedResult {
  netVoltages: Map<string, number>;
  compTelemetry: Map<number, { current_mA: number; vDrop: number; power_mW: number }>;
}

/**
 * Universal MNA solver for arbitrary netlists (e.g. Virtual Solderless Breadboards)
 */
export function runAnalogMNA(comps: MnaComponent[], groundNet: string): MnaSolvedResult {
  const netSet = new Set<string>();
  comps.forEach((c) => {
    netSet.add(c.nodePos);
    netSet.add(c.nodeNeg);
  });
  netSet.add(groundNet);

  const nonGroundNets: string[] = [];
  netSet.forEach((net) => {
    if (net !== groundNet) {
      nonGroundNets.push(net);
    }
  });

  const netToIndex = new Map<string, number>();
  nonGroundNets.forEach((net, idx) => {
    netToIndex.set(net, idx);
  });

  const numNodes = nonGroundNets.length;
  const vsComps = comps.filter((c) => c.type === "VS");
  const numVs = vsComps.length;
  const totalVars = numNodes + numVs;

  const netVoltages = new Map<string, number>();
  netVoltages.set(groundNet, 0);

  if (totalVars === 0) {
    return {
      netVoltages,
      compTelemetry: new Map(),
    };
  }

  // Piecewise linear diode iteration (up to 5 iterations for convergence)
  const voltages = new Array(numNodes).fill(0);
  const vSourceCurrents = new Array(numVs).fill(0);

  for (let iter = 0; iter < 5; iter++) {
    const A = Array.from({ length: totalVars }, () => new Array(totalVars).fill(0));
    const b = new Array(totalVars).fill(0);

    // Resistors and diodes
    comps.forEach((c) => {
      let g = 0;
      let reqI = 0;

      if (c.type === "R") {
        const rVal = Math.max(0.1, c.val);
        g = 1 / rVal;
      } else if (c.type === "D") {
        const pPos = c.nodePos === groundNet ? -1 : (netToIndex.get(c.nodePos) ?? -1);
        const pNeg = c.nodeNeg === groundNet ? -1 : (netToIndex.get(c.nodeNeg) ?? -1);
        const vPos = pPos >= 0 ? (voltages[pPos] || 0) : 0;
        const vNeg = pNeg >= 0 ? (voltages[pNeg] || 0) : 0;
        const vDrop = vPos - vNeg;
        const vf = c.val; // e.g. 2.0V for LED, 0.7V for 1N4007
        if (vDrop >= vf) {
          const ron = 15;
          g = 1 / ron;
          reqI = vf / ron;
        } else {
          g = 1e-6;
        }
      }

      if (g > 0) {
        const pIdx = c.nodePos === groundNet ? -1 : (netToIndex.get(c.nodePos) ?? -1);
        const nIdx = c.nodeNeg === groundNet ? -1 : (netToIndex.get(c.nodeNeg) ?? -1);

        if (pIdx >= 0) {
          A[pIdx][pIdx] += g;
          b[pIdx] -= reqI;
        }
        if (nIdx >= 0) {
          A[nIdx][nIdx] += g;
          b[nIdx] += reqI;
        }
        if (pIdx >= 0 && nIdx >= 0) {
          A[pIdx][nIdx] -= g;
          A[nIdx][pIdx] -= g;
        }
      }
    });

    // Independent Voltage Sources
    vsComps.forEach((vs, k) => {
      const vsVarIdx = numNodes + k;
      const pIdx = vs.nodePos === groundNet ? -1 : (netToIndex.get(vs.nodePos) ?? -1);
      const nIdx = vs.nodeNeg === groundNet ? -1 : (netToIndex.get(vs.nodeNeg) ?? -1);

      if (pIdx >= 0) {
        A[vsVarIdx][pIdx] = 1;
        A[pIdx][vsVarIdx] = 1;
      }
      if (nIdx >= 0) {
        A[vsVarIdx][nIdx] = -1;
        A[nIdx][vsVarIdx] = -1;
      }
      b[vsVarIdx] = vs.val;
    });

    const solution = solveDenseMnaSystem(A, b);
    if (!solution) break;

    for (let i = 0; i < numNodes; i++) {
      voltages[i] = solution[i];
    }
    for (let k = 0; k < numVs; k++) {
      vSourceCurrents[k] = solution[numNodes + k];
    }
  }

  // Record solved voltages
  nonGroundNets.forEach((net, idx) => {
    netVoltages.set(net, voltages[idx] || 0);
  });

  // Calculate branch currents and power
  const compTelemetry = new Map<number, { current_mA: number; vDrop: number; power_mW: number }>();
  comps.forEach((c) => {
    const vPos = netVoltages.get(c.nodePos) ?? 0;
    const vNeg = netVoltages.get(c.nodeNeg) ?? 0;
    const vDrop = vPos - vNeg;

    let current_mA = 0;
    if (c.type === "R") {
      const r = Math.max(0.1, c.val);
      current_mA = (vDrop / r) * 1000;
    } else if (c.type === "D") {
      const vf = c.val;
      if (vDrop >= vf) {
        current_mA = Math.max(0, ((vDrop - vf) / 15) * 1000);
      } else {
        current_mA = (vDrop * 1e-6) * 1000;
      }
    } else if (c.type === "VS") {
      const vsIdx = vsComps.findIndex((v) => v.id === c.id);
      if (vsIdx >= 0) {
        current_mA = vSourceCurrents[vsIdx] * 1000;
      }
    }

    const power_mW = Math.abs(vDrop * current_mA);
    compTelemetry.set(c.id, {
      current_mA,
      vDrop: Math.abs(vDrop),
      power_mW,
    });
  });

  return { netVoltages, compTelemetry };
}

/**
 * Converts a CircuitLab canvas schematic (analog/passive subset) into an AnalogNode[]/AnalogWire[]
 * graph for real MNA transient and small-signal AC sweeps in spiceNumericalCore.
 */
export function circuitLabToAnalogGraph(
  nodes: CircuitNode[],
  wires: CircuitWire[]
): {
  analogNodes: AnalogNode[];
  analogWires: AnalogWire[];
  getPinTarget: (nodeId: number, port: number, dir: "in" | "out") => { node: number; term: number } | null;
  primarySourceWaveform?: { type: "SINE" | "DC"; amplitudeV: number; frequencyHz: number; offsetV: number };
} {
  const analogNodes: AnalogNode[] = [];
  const analogWires: AnalogWire[] = [];
  const analogIdSet = new Set<number>();
  let synthId = -1000;
  let wireSeq = 1;

  // Map (circuitLabNodeId, dir, port) -> (analogNodeId, term)
  const pinMap = new Map<string, { node: number; term: number }>();
  const setPin = (nid: number, dir: "in" | "out", port: number, targetNode: number, targetTerm: number) => {
    pinMap.set(`${nid}:${dir}:${port}`, { node: targetNode, term: targetTerm });
  };

  let primarySourceWaveform:
    | { type: "SINE" | "DC"; amplitudeV: number; frequencyHz: number; offsetV: number }
    | undefined;

  for (const n of nodes) {
    if (!isAnalogOrPassiveType(n.type)) continue;

    if (n.type === "GND") {
      analogIdSet.add(n.id);
      analogNodes.push({
        id: n.id,
        type: "GND",
        label: n.label || "GND",
        x: n.x,
        y: n.y,
        orient: "V",
        value: 0,
      });
      setPin(n.id, "in", 0, n.id, 0);
      setPin(n.id, "out", 0, n.id, 0);
      continue;
    }

    if (n.type === "AC_SINE" || n.type === "AC_VOLTAGE_SOURCE") {
      const amp = n.analogParams?.acVoltageV ?? 5.0;
      const freq = n.analogParams?.frequencyHz ?? 50;
      analogIdSet.add(n.id);
      analogNodes.push({
        id: n.id,
        type: "FG",
        label: n.label || "AC_SINE",
        x: n.x,
        y: n.y,
        orient: "V",
        value: amp,
      });
      setPin(n.id, "out", 0, n.id, 0);
      setPin(n.id, "out", 1, n.id, 1);
      primarySourceWaveform = { type: "SINE", amplitudeV: amp, frequencyHz: freq, offsetV: 0 };
      continue;
    }

    if (
      n.type === "DC_VOLTAGE" ||
      n.type === "DC_VOLTAGE_SOURCE" ||
      n.type === "BATTERY" ||
      n.type === "VCC_5V" ||
      n.type === "VCC_12V" ||
      n.type === "VCC"
    ) {
      const vVal =
        n.type === "VCC_5V" || n.type === "VCC"
          ? 5.0
          : n.type === "VCC_12V"
          ? 12.0
          : n.analogParams?.dcVoltageV ?? (n.type === "BATTERY" ? 9.0 : 5.0);
      analogIdSet.add(n.id);
      analogNodes.push({
        id: n.id,
        type: "VS",
        label: n.label || n.type,
        x: n.x,
        y: n.y,
        orient: "V",
        value: vVal,
      });
      setPin(n.id, "out", 0, n.id, 0);
      setPin(n.id, "out", 1, n.id, 1);
      if (n.type === "VCC_5V" || n.type === "VCC_12V" || n.type === "VCC") {
        const gId = synthId--;
        analogNodes.push({ id: gId, type: "GND", label: "GND_RAIL", x: n.x, y: n.y + 40, orient: "V", value: 0 });
        analogWires.push({ id: wireSeq++, from: { node: n.id, term: 1 }, to: { node: gId, term: 0 } });
      }
      if (!primarySourceWaveform) {
        primarySourceWaveform = { type: "DC", amplitudeV: vVal, frequencyHz: 50, offsetV: vVal };
      }
      continue;
    }

    if (n.type === "BRIDGE_RECT") {
      // Expand full-wave 4-diode bridge into 4 physical D1N4007 diodes:
      // in:0 = AC1, in:1 = AC2, out:0 = DC+, out:1 = DC-
      const d1 = synthId--;
      const d2 = synthId--;
      const d3 = synthId--;
      const d4 = synthId--;
      [d1, d2, d3, d4].forEach((did, idx) => {
        analogNodes.push({
          id: did,
          type: "D1N4007",
          label: `${n.label || "BR"}_D${idx + 1}`,
          x: n.x,
          y: n.y,
          orient: "H",
          value: 0.7,
        });
      });
      // AC1 -> D1 anode -> D1 cathode (DC+), AC2 -> D2 anode -> D2 cathode (DC+)
      analogWires.push({ id: wireSeq++, from: { node: d1, term: 1 }, to: { node: d2, term: 1 } });
      // DC- (anode of D3 & D4) -> AC1 (D3 cathode), AC2 (D4 cathode)
      analogWires.push({ id: wireSeq++, from: { node: d3, term: 0 }, to: { node: d4, term: 0 } });
      analogWires.push({ id: wireSeq++, from: { node: d3, term: 1 }, to: { node: d1, term: 0 } });
      analogWires.push({ id: wireSeq++, from: { node: d4, term: 1 }, to: { node: d2, term: 0 } });
      setPin(n.id, "in", 0, d1, 0);
      setPin(n.id, "in", 1, d2, 0);
      setPin(n.id, "out", 0, d1, 1);
      setPin(n.id, "out", 1, d3, 0);
      analogIdSet.add(n.id);
      continue;
    }

    if (n.type === "RES" || n.type === "RESISTOR" || n.type === "POT") {
      analogIdSet.add(n.id);
      analogNodes.push({
        id: n.id,
        type: n.type === "POT" ? "POT" : "R",
        label: n.label || "R",
        x: n.x,
        y: n.y,
        orient: "H",
        value: Math.max(0.1, n.analogParams?.resistanceOhms ?? (n.type === "POT" ? 10000 : 1000)),
      });
      setPin(n.id, "in", 0, n.id, 0);
      setPin(n.id, "out", 0, n.id, 1);
      continue;
    }

    if (n.type === "CAP_NP" || n.type === "CAPACITOR" || n.type === "CAP_POL") {
      analogIdSet.add(n.id);
      analogNodes.push({
        id: n.id,
        type: n.type === "CAP_POL" ? "CPOL" : "C",
        label: n.label || "C",
        x: n.x,
        y: n.y,
        orient: "V",
        value: Math.max(1e-6, n.analogParams?.capacitanceUf ?? 10),
      });
      setPin(n.id, "in", 0, n.id, 0);
      setPin(n.id, "out", 0, n.id, 1);
      continue;
    }

    if (n.type === "IND" || n.type === "INDUCTOR") {
      analogIdSet.add(n.id);
      analogNodes.push({
        id: n.id,
        type: "L",
        label: n.label || "L",
        x: n.x,
        y: n.y,
        orient: "H",
        value: Math.max(1e-4, n.analogParams?.inductanceMh ?? 10),
      });
      setPin(n.id, "in", 0, n.id, 0);
      setPin(n.id, "out", 0, n.id, 1);
      continue;
    }

    if (
      n.type === "DIODE_1N4007" ||
      n.type === "SCHOTTKY" ||
      n.type === "ZENER" ||
      n.type === "ZENER_BZX84" ||
      n.type === "LED_RED" ||
      n.type === "LED_GREEN" ||
      n.type === "LED_BLUE"
    ) {
      analogIdSet.add(n.id);
      const isZener = n.type === "ZENER" || n.type === "ZENER_BZX84";
      const isLed = n.type.startsWith("LED_");
      analogNodes.push({
        id: n.id,
        type: isZener ? "ZD" : isLed ? "LED" : "D1N4007",
        label: n.label || n.type,
        x: n.x,
        y: n.y,
        orient: "H",
        value: isZener ? (n.analogParams?.dcVoltageV ?? 5.1) : n.type === "SCHOTTKY" ? 0.3 : isLed ? 2.0 : 0.7,
      });
      if (n.type === "ZENER") {
        setPin(n.id, "in", 1, n.id, 0);
        setPin(n.id, "in", 0, n.id, 1);
        setPin(n.id, "out", 0, n.id, 1);
      } else {
        setPin(n.id, "in", 0, n.id, 0);
        setPin(n.id, "out", 0, n.id, 1);
      }
      continue;
    }

    if (n.type === "SWITCH_SPST" || n.type === "PUSHBUTTON") {
      analogIdSet.add(n.id);
      analogNodes.push({
        id: n.id,
        type: "SW",
        label: n.label || "SW",
        x: n.x,
        y: n.y,
        orient: "H",
        value: (n.value ?? 1) >= 1 ? 1 : 0,
      });
      setPin(n.id, "in", 0, n.id, 0);
      setPin(n.id, "out", 0, n.id, 1);
      continue;
    }
  }

  for (const w of wires) {
    const fromKey = `${w.from.node}:${w.from.dir || "out"}:${w.from.port}`;
    const toKey = `${w.to.node}:${w.to.dir || "in"}:${w.to.port}`;
    const fTarget = pinMap.get(fromKey);
    const tTarget = pinMap.get(toKey);
    if (fTarget && tTarget) {
      analogWires.push({
        id: wireSeq++,
        from: fTarget,
        to: tTarget,
      });
    }
  }

  return {
    analogNodes,
    analogWires,
    getPinTarget: (nodeId, port, dir) => pinMap.get(`${nodeId}:${dir}:${port}`) ?? null,
    primarySourceWaveform,
  };
}

export function solveCircuitLabTransient(
  nodes: CircuitNode[],
  wires: CircuitWire[],
  options: Omit<TransientAnalysisOptions, "strictGround">
): {
  transient: TransientAnalysisResult;
  getPinTarget: (nodeId: number, port: number, dir: "in" | "out") => { node: number; term: number } | null;
} {
  const graph = circuitLabToAnalogGraph(nodes, wires);
  const fgConfig = graph.primarySourceWaveform
    ? {
        enabled: true,
        waveform: graph.primarySourceWaveform.type === "SINE" ? ("SINE" as const) : ("SQUARE" as const),
        frequencyHz: graph.primarySourceWaveform.frequencyHz,
        amplitudeV: graph.primarySourceWaveform.amplitudeV,
        dcOffsetV: graph.primarySourceWaveform.offsetV,
        dutyCyclePct: 50,
      }
    : undefined;
  const transient = solveSpiceTransient(graph.analogNodes, graph.analogWires, {
    ...options,
    strictGround: false,
    fgConfig: options.fgConfig ?? fgConfig,
  });
  return { transient, getPinTarget: graph.getPinTarget };
}

export function solveCircuitLabAc(
  nodes: CircuitNode[],
  wires: CircuitWire[],
  options: Omit<AcSweepOptions, "strictGround">
): {
  ac: AcSweepResult;
  getPinTarget: (nodeId: number, port: number, dir: "in" | "out") => { node: number; term: number } | null;
} {
  const graph = circuitLabToAnalogGraph(nodes, wires);
  const ac = solveSpiceAcSweep(graph.analogNodes, graph.analogWires, {
    ...options,
    strictGround: false,
  });
  return { ac, getPinTarget: graph.getPinTarget };
}

/**
 * Serializes any Circuit Designer (`CircuitLab`) schematic — analog, digital, or mixed-signal —
 * into a standard SPICE-compatible `.CIR` netlist text file for academic reporting.
 */
export function serializeCircuitLabToSpiceNetlist(
  title: string,
  nodes: CircuitNode[],
  wires: CircuitWire[]
): string {
  const graph = circuitLabToAnalogGraph(nodes, wires);
  if (graph.analogNodes.length > 0 && graph.analogNodes.some((n) => n.type !== "GND")) {
    const netlist = extractAndValidateNetlist(graph.analogNodes, graph.analogWires, {
      strictGround: false,
    });
    const fgConfig = graph.primarySourceWaveform
      ? {
          enabled: true,
          waveform:
            graph.primarySourceWaveform.type === "SINE"
              ? ("SINE" as const)
              : ("SQUARE" as const),
          frequencyHz: graph.primarySourceWaveform.frequencyHz,
          amplitudeV: graph.primarySourceWaveform.amplitudeV,
          dcOffsetV: graph.primarySourceWaveform.offsetV,
          dutyCyclePct: 50,
        }
      : undefined;
    const baseCir = serializeAnalogCircuitToSpiceNetlist(
      title,
      graph.analogNodes,
      netlist.getTermNet,
      fgConfig
    );

    const digitalNodes = nodes.filter(
      (n) =>
        !["GND", "RES", "RESISTOR", "POT", "CAP_NP", "CAPACITOR", "CAP_POL", "IND", "INDUCTOR", "DC_VOLTAGE", "DC_VOLTAGE_SOURCE", "BATTERY", "VCC_5V", "VCC_12V", "VCC", "AC_SINE", "AC_VOLTAGE_SOURCE", "DIODE", "D1N4007", "LED", "ZENER", "BJT", "BC547", "BC557", "BJT_NPN", "BJT_PNP", "2N2222", "MOSFET_N", "MOSFET_P", "IRF540N"].includes(
          n.type
        )
    );
    if (digitalNodes.length === 0) {
      return baseCir;
    }
    const digitalComments = [
      ``,
      `* --- Digital / Behavioral Subcircuit Summary (${digitalNodes.length} blocks) ---`,
      ...digitalNodes.map(
        (dn) =>
          `* X_${(dn.label || dn.type).replace(/\s+/g, "_")} TYPE=${dn.type} STATE=${dn.value ?? 0}`
      ),
    ];
    return baseCir.replace(/\.END\s*$/i, `${digitalComments.join("\n")}\n.END`);
  }

  // Pure digital schematic DSU net extraction for standard SPICE behavioral deck
  const parent = new Map<string, string>();
  const find = (k: string): string => {
    if (!parent.has(k)) parent.set(k, k);
    if (parent.get(k) !== k) parent.set(k, find(parent.get(k)!));
    return parent.get(k)!;
  };
  const union = (a: string, b: string) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  };
  for (const w of wires) {
    const kFrom = `${w.from.node}:${w.from.dir}:${w.from.port}`;
    const kTo = `${w.to.node}:${w.to.dir}:${w.to.port}`;
    union(kFrom, kTo);
  }
  const rootToNet = new Map<string, string>();
  let netCounter = 1;
  const getDigitalNet = (nodeId: number, dir: "in" | "out", port: number): string => {
    const key = `${nodeId}:${dir}:${port}`;
    if (!parent.has(key)) return "0";
    const r = find(key);
    if (!rootToNet.has(r)) rootToNet.set(r, `N${String(netCounter++).padStart(3, "0")}`);
    return rootToNet.get(r)!;
  };

  const lines: string[] = [
    `* ${(title || "Circuit Designer Schematic").trim()} — Standard SPICE3 Netlist (.CIR)`,
    `* Generated: ${new Date().toISOString()}`,
    `* Reference Node: 0 (GND)`,
    ``,
    `VCC VCC 0 DC 5V`,
  ];

  for (const n of nodes) {
    const safeId = (n.label || `${n.type}_${n.id}`).replace(/[^a-zA-Z0-9_]/g, "_");
    if (n.type === "INPUT" || n.type === "CLOCK") {
      const outNet = getDigitalNet(n.id, "out", 0);
      lines.push(
        n.type === "CLOCK"
          ? `V_${safeId} ${outNet} 0 PULSE(0V 5V 0 5n 5n 250m 500m)`
          : `V_${safeId} ${outNet} 0 DC ${n.value ? "5V" : "0V"}`
      );
    } else if (n.type === "LED" || n.type === "OUTPUT" || n.type === "PROBE") {
      const inNet = getDigitalNet(n.id, "in", 0);
      lines.push(`R_${safeId}_LOAD ${inNet} 0 1k ; Logic Probe / Indicator (${n.type})`);
    } else {
      const in0 = getDigitalNet(n.id, "in", 0);
      const in1 = getDigitalNet(n.id, "in", 1);
      const out0 = getDigitalNet(n.id, "out", 0);
      lines.push(`X_${safeId} ${in0} ${in1} ${out0} VCC 0 LOGIC_${n.type}`);
    }
  }

  lines.push(``);
  lines.push(`.OP`);
  lines.push(`.TRAN 10ms 500ms`);
  lines.push(`.END`);
  return lines.join("\n");
}

