import { CircuitNode, CircuitWire } from "../components/CircuitLab";
import { COMP_SPECS, GATE_SPECS, computeGate } from "../data/logicSpecs";

export interface DigitalStimulusEvent {
  timeNs: number;
  nodeId: number;
  value: 0 | 1;
}

export interface DigitalTransitionRecord {
  timeNs: number;
  nodeId: number;
  label: string;
  portIdx: number;
  prevValue: number;
  nextValue: number;
}

export interface DigitalEventSimulationResult {
  converged: boolean;
  oscillationDetected: boolean;
  diagnosticMessage?: string;
  finalOutputs: Record<number, number[]>;
  finalNodeStates: Record<number, Record<string, number>>;
  transitions: DigitalTransitionRecord[];
  processedEvents: number;
  endTimeNs: number;
}

interface SimQueueEvent {
  timeNs: number;
  seq: number;
  kind: "INPUT_STIMULUS" | "NODE_OUTPUT";
  nodeId: number;
  portIdx: number;
  nextValue: number;
}

/**
 * Default gate-family propagation delays (nanoseconds) aligned with 74LS / CMOS timing.
 */
export function getGatePropagationDelayNs(node: CircuitNode): number {
  if (typeof node.delayNs === "number" && Number.isFinite(node.delayNs) && node.delayNs > 0) {
    return node.delayNs;
  }
  switch (node.type) {
    case "NOT":
      return 6;
    case "AND":
    case "OR":
    case "NAND":
    case "NOR":
      return 8;
    case "XOR":
    case "XNOR":
      return 12;
    case "OUTPUT":
    case "INPUT":
    case "CLOCK":
      return 1;
    default:
      return COMP_SPECS[node.type]?.seq ? 15 : 12;
  }
}

/**
 * Genuine Event-Driven Digital Logic Simulator with propagation delays (ns),
 * time-ordered event scheduling, sequential edge triggering, and oscillation detection.
 */
export function runDigitalEventSimulation(
  nodes: CircuitNode[],
  wires: CircuitWire[],
  options: {
    stimuli?: DigitalStimulusEvent[];
    maxTimeNs?: number;
    maxEvents?: number;
  } = {}
): DigitalEventSimulationResult {
  const maxTimeNs = options.maxTimeNs ?? 2000;
  const maxEvents = options.maxEvents ?? 5000;

  const nodeMap = new Map<number, CircuitNode>();
  nodes.forEach((n) => nodeMap.set(n.id, n));

  // Build wire lookup: target key "toNode:toPort" -> Wire[] (detect fan-in contention if > 1)
  const wireToInput = new Map<string, CircuitWire[]>();
  // Fanout map: fromNode -> downstream toNode[]
  const fanoutMap = new Map<number, number[]>();

  for (const w of wires) {
    const inKey = `${w.to.node}:${w.to.port}`;
    if (!wireToInput.has(inKey)) wireToInput.set(inKey, []);
    wireToInput.get(inKey)!.push(w);

    if (!fanoutMap.has(w.from.node)) fanoutMap.set(w.from.node, []);
    const list = fanoutMap.get(w.from.node)!;
    if (!list.includes(w.to.node)) list.push(w.to.node);
  }

  const outs: Record<number, number[]> = {};
  const seqStates: Record<number, Record<string, number>> = {};
  const prevClocks: Record<number, Record<number, number>> = {};
  const inputValues: Record<number, number> = {};

  for (const n of nodes) {
    if (n.type === "INPUT" || n.type === "CLOCK") {
      const v = n.value ? 1 : 0;
      inputValues[n.id] = v;
      outs[n.id] = [v];
    } else if (COMP_SPECS[n.type]) {
      const spec = COMP_SPECS[n.type];
      seqStates[n.id] = { ...(n.state || spec.init || {}) };
      outs[n.id] =
        spec.seq && spec.stateOutputs
          ? spec.stateOutputs(seqStates[n.id])
          : new Array(spec.outputs.length).fill(0);
      if (spec.seq && spec.clockPorts) {
        prevClocks[n.id] = { ...(n.prevClk || {}) };
      }
    } else {
      outs[n.id] = [0];
    }
  }

  const readInputPort = (nodeId: number, portIdx: number, fallback = 0): number => {
    const drivers = wireToInput.get(`${nodeId}:${portIdx}`);
    if (!drivers || drivers.length === 0) return fallback;
    if (drivers.length === 1) {
      const w = drivers[0];
      return outs[w.from.node]?.[w.from.port] ?? -1;
    }
    // Check bus contention among multiple active drivers on same input
    const vals = drivers.map((w) => outs[w.from.node]?.[w.from.port] ?? -1);
    if (vals.some((v) => v === -1)) return -1;
    const allSame = vals.every((v) => v === vals[0]);
    return allSame ? vals[0] : -1;
  };

  const computeDesiredNodeOutputs = (n: CircuitNode): number[] => {
    if (n.type === "INPUT" || n.type === "CLOCK") {
      return [inputValues[n.id] ?? 0];
    }
    if (n.type === "OUTPUT") {
      const hasW = wireToInput.has(`${n.id}:0`);
      if (!hasW) return [-1];
      return [readInputPort(n.id, 0, -1)];
    }
    const comp = COMP_SPECS[n.type];
    if (comp) {
      if (comp.seq && comp.stateOutputs && comp.step) {
        const ins = comp.inputs.map((pin, i) =>
          readInputPort(n.id, i, pin.defaultVal ?? 0)
        );
        if (ins.some((v) => v === -1)) {
          return new Array(comp.outputs.length).fill(-1);
        }
        const clockPorts = comp.clockPorts || [];
        const pClk = prevClocks[n.id] || {};
        const edges = clockPorts.map((cp) => {
          const cur = readInputPort(n.id, cp, comp.inputs[cp]?.defaultVal ?? 0);
          const prev = pClk[cp] ?? cur;
          pClk[cp] = cur;
          return prev === 0 && cur === 1;
        });
        prevClocks[n.id] = pClk;
        const nextSt = comp.step(ins, seqStates[n.id] || {}, edges);
        seqStates[n.id] = nextSt;
        return comp.stateOutputs(nextSt);
      }
      if (comp.compute) {
        const ins = comp.inputs.map((pin, i) =>
          readInputPort(n.id, i, pin.defaultVal ?? 0)
        );
        if (ins.some((v) => v === -1)) {
          return new Array(comp.outputs.length).fill(-1);
        }
        return comp.compute(ins);
      }
      return [];
    }
    const gate = GATE_SPECS[n.type];
    if (gate) {
      if (gate.inputs === 2) {
        const hasW0 = wireToInput.has(`${n.id}:0`);
        const hasW1 = wireToInput.has(`${n.id}:1`);
        const hasOutW = wires.some((w) => w.from.node === n.id);
        if (hasW0 !== hasW1 || (!hasW0 && !hasW1 && hasOutW)) return [-1];
        if (!hasW0 && !hasW1) return [0];
        const in0 = readInputPort(n.id, 0, 0);
        const in1 = readInputPort(n.id, 1, 0);
        if (in0 === -1 || in1 === -1) return [-1];
        return [computeGate(n.type, [in0, in1])];
      }
      const hasW0 = wireToInput.has(`${n.id}:0`);
      const hasOutW = wires.some((w) => w.from.node === n.id);
      if (!hasW0 && hasOutW) return [-1];
      if (!hasW0) return [0];
      const in0 = readInputPort(n.id, 0, 0);
      if (in0 === -1) return [-1];
      return [computeGate(n.type, [in0])];
    }
    return [0];
  };

  let seqCounter = 0;
  const queue: SimQueueEvent[] = [];
  const enqueue = (ev: Omit<SimQueueEvent, "seq">) => {
    if (ev.timeNs > maxTimeNs) return;
    queue.push({ ...ev, seq: seqCounter++ });
    queue.sort((a, b) => (a.timeNs !== b.timeNs ? a.timeNs - b.timeNs : a.seq - b.seq));
  };

  // Seed initial evaluation at t = 0 ns for all driven sources & gates
  for (const n of nodes) {
    if (n.type === "INPUT" || n.type === "CLOCK") {
      enqueue({
        timeNs: 0,
        kind: "NODE_OUTPUT",
        nodeId: n.id,
        portIdx: 0,
        nextValue: inputValues[n.id],
      });
    } else {
      const initOut = computeDesiredNodeOutputs(n);
      initOut.forEach((val, pIdx) => {
        if (val !== outs[n.id]?.[pIdx]) {
          enqueue({
            timeNs: getGatePropagationDelayNs(n),
            kind: "NODE_OUTPUT",
            nodeId: n.id,
            portIdx: pIdx,
            nextValue: val,
          });
        }
      });
    }
  }

  // Enqueue user stimulus events
  for (const stim of options.stimuli || []) {
    enqueue({
      timeNs: stim.timeNs,
      kind: "INPUT_STIMULUS",
      nodeId: stim.nodeId,
      portIdx: 0,
      nextValue: stim.value,
    });
  }

  const transitions: DigitalTransitionRecord[] = [];
  let processedEvents = 0;
  let endTimeNs = 0;
  let oscillationDetected = false;
  let diagnosticMessage: string | undefined;

  while (queue.length > 0) {
    const ev = queue.shift()!;
    processedEvents++;
    endTimeNs = Math.max(endTimeNs, ev.timeNs);

    if (processedEvents > maxEvents) {
      oscillationDetected = true;
      diagnosticMessage = `Digital simulation halted after ${maxEvents} events (unstable ring/combinational oscillation detected).`;
      break;
    }

    const node = nodeMap.get(ev.nodeId);
    if (!node) continue;

    if (ev.kind === "INPUT_STIMULUS") {
      inputValues[node.id] = ev.nextValue;
    }

    const curPortVal = outs[node.id]?.[ev.portIdx] ?? 0;
    if (ev.kind === "NODE_OUTPUT" && curPortVal === ev.nextValue && ev.timeNs > 0) {
      continue;
    }

    if (!outs[node.id]) outs[node.id] = [];
    if (curPortVal !== ev.nextValue || ev.timeNs === 0) {
      transitions.push({
        timeNs: ev.timeNs,
        nodeId: node.id,
        label: node.label || `${node.type}_${node.id}`,
        portIdx: ev.portIdx,
        prevValue: curPortVal,
        nextValue: ev.nextValue,
      });
    }
    outs[node.id][ev.portIdx] = ev.nextValue;

    // Schedule updates on immediate downstream fanout gates after t + t_pd
    const targets = fanoutMap.get(node.id) || [];
    for (const dstId of targets) {
      const dstNode = nodeMap.get(dstId);
      if (!dstNode) continue;
      const desired = computeDesiredNodeOutputs(dstNode);
      const tpd = getGatePropagationDelayNs(dstNode);
      desired.forEach((nextVal, pIdx) => {
        // Inertial delay cancellation: cancel any stale pending event on (dstNode, pIdx)
        for (let i = queue.length - 1; i >= 0; i--) {
          if (
            queue[i].kind === "NODE_OUTPUT" &&
            queue[i].nodeId === dstNode.id &&
            queue[i].portIdx === pIdx
          ) {
            queue.splice(i, 1);
          }
        }
        const existing = outs[dstNode.id]?.[pIdx] ?? 0;
        if (nextVal !== existing) {
          enqueue({
            timeNs: ev.timeNs + tpd,
            kind: "NODE_OUTPUT",
            nodeId: dstNode.id,
            portIdx: pIdx,
            nextValue: nextVal,
          });
        }
      });
    }
  }

  return {
    converged: !oscillationDetected,
    oscillationDetected,
    diagnosticMessage,
    finalOutputs: outs,
    finalNodeStates: seqStates,
    transitions,
    processedEvents,
    endTimeNs,
  };
}
