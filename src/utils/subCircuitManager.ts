import {
  COMP_SPECS,
  GATE_SPECS,
  CompSpec,
  PinSpec,
  computeGate,
} from "../data/logicSpecs";
import { CircuitNode, CircuitWire } from "../components/CircuitLab";

export interface InternalPinTarget {
  internalNodeIdx: number;
  port: number;
}

export interface SubCircuitInputMap {
  name: string;
  targets: InternalPinTarget[];
}

export interface SubCircuitOutputMap {
  name: string;
  source: InternalPinTarget;
}

export interface SubCircuitDefinition {
  typeId: string; // e.g. "SUBCKT_1" or "BLK_HALF_ADDER"
  name: string; // e.g. "HA_BLOCK"
  title: string; // e.g. "Half Adder Sub-Circuit"
  description: string;
  color: string;
  internalNodes: {
    type: string;
    relX: number;
    relY: number;
    label?: string;
    value?: number;
  }[];
  internalWires: {
    fromIdx: number;
    fromPort: number;
    toIdx: number;
    toPort: number;
  }[];
  inputMap: SubCircuitInputMap[];
  outputMap: SubCircuitOutputMap[];
  gateCount: number;
}

/**
 * Evaluates a SubCircuitDefinition combinationally for a given array of 0/1 input values.
 * Also returns the settled internal node outputs for live hierarchical inspection.
 */
export function evaluateSubCircuitInternal(
  def: SubCircuitDefinition,
  inputValues: number[]
): { outputs: number[]; internalOuts: Record<number, number[]> } {
  const outs: Record<number, number[]> = {};
  for (let i = 0; i < def.internalNodes.length; i++) {
    const n = def.internalNodes[i];
    if (COMP_SPECS[n.type]) {
      outs[i] = new Array(COMP_SPECS[n.type].outputs.length).fill(0);
    } else {
      outs[i] = [0];
    }
  }

  // Build internal wire lookup: key = `${toIdx}:${toPort}`
  const wireLookup = new Map<string, { fromIdx: number; fromPort: number }>();
  for (const w of def.internalWires) {
    wireLookup.set(`${w.toIdx}:${w.toPort}`, {
      fromIdx: w.fromIdx,
      fromPort: w.fromPort,
    });
  }

  // Build external input pin lookup: key = `${internalNodeIdx}:${port}` -> external input index
  const extInLookup = new Map<string, number>();
  def.inputMap.forEach((inPin, extIdx) => {
    for (const tgt of inPin.targets) {
      extInLookup.set(`${tgt.internalNodeIdx}:${tgt.port}`, extIdx);
    }
  });

  const getInternalPinInput = (
    nodeIdx: number,
    port: number,
    defaultVal = 0
  ): number => {
    const key = `${nodeIdx}:${port}`;
    if (extInLookup.has(key)) {
      const extIdx = extInLookup.get(key)!;
      return inputValues[extIdx] ? 1 : 0;
    }
    const w = wireLookup.get(key);
    if (w) {
      return outs[w.fromIdx]?.[w.fromPort] ?? defaultVal;
    }
    return defaultVal;
  };

  // Relax internal network up to 16 iterations
  for (let iter = 0; iter < 16; iter++) {
    let changed = false;
    for (let i = 0; i < def.internalNodes.length; i++) {
      const n = def.internalNodes[i];
      let nextVal: number[] = [0];

      if (n.type === "INPUT") {
        // If an INPUT node was kept inside, check if it's mapped to an external input pin
        if (extInLookup.has(`${i}:0`)) {
          const extIdx = extInLookup.get(`${i}:0`)!;
          nextVal = [inputValues[extIdx] ? 1 : 0];
        } else {
          nextVal = [n.value ? 1 : 0];
        }
      } else if (n.type === "OUTPUT") {
        nextVal = [getInternalPinInput(i, 0, 0)];
      } else if (GATE_SPECS[n.type]) {
        const spec = GATE_SPECS[n.type];
        const ins: number[] = [];
        for (let p = 0; p < spec.inputs; p++) {
          ins.push(getInternalPinInput(i, p, 0));
        }
        nextVal = [computeGate(n.type, ins)];
      } else if (COMP_SPECS[n.type]) {
        const comp = COMP_SPECS[n.type];
        if (comp.compute) {
          const ins = comp.inputs.map((pin, pIdx) =>
            getInternalPinInput(i, pIdx, pin.defaultVal ?? 0)
          );
          nextVal = comp.compute(ins);
        } else if (comp.stateOutputs) {
          nextVal = comp.stateOutputs(comp.init || {});
        }
      }

      const prev = outs[i];
      if (
        !prev ||
        prev.length !== nextVal.length ||
         nextVal.some((v, idx) => v !== prev[idx])
      ) {
        outs[i] = nextVal;
        changed = true;
      }
    }
    if (!changed) break;
  }

  const finalOutputs = def.outputMap.map((outPin) => {
    const { internalNodeIdx, port } = outPin.source;
    return outs[internalNodeIdx]?.[port] ?? 0;
  });

  return { outputs: finalOutputs, internalOuts: outs };
}

/**
 * Registers a SubCircuitDefinition into COMP_SPECS so that the main simulator
 * can instantiate, wire, and evaluate it just like any native MSI IC.
 */
export function registerSubCircuitInSpecs(def: SubCircuitDefinition): CompSpec {
  const pinCount = Math.max(def.inputMap.length, def.outputMap.length, 1);
  const h = Math.max(76, pinCount * 24 + 28);
  const w = Math.max(116, Math.min(156, def.name.length * 9 + 54));

  const makePins = (names: string[], height: number): PinSpec[] => {
    const count = names.length;
    if (count === 0) return [];
    const gap = height / (count + 1);
    return names.map((name, idx) => ({
      name,
      y: Math.round(gap * (idx + 1) * 10) / 10,
      defaultVal: 0,
    }));
  };

  const spec: CompSpec = {
    w,
    h,
    label: def.name,
    iconLabel: def.name.slice(0, 6),
    inputs: makePins(
      def.inputMap.map((m) => m.name),
      h
    ),
    outputs: makePins(
      def.outputMap.map((m) => m.name),
      h
    ),
    compute: (ins: number[]) => evaluateSubCircuitInternal(def, ins).outputs,
  };

  COMP_SPECS[def.typeId] = spec;
  return spec;
}

/**
 * Built-in Hierarchical Sub-Circuit Blocks so users immediately have
 * modular building blocks and can inspect/ungroup them or create their own.
 */
export const BUILTIN_SUBCIRCUITS: SubCircuitDefinition[] = [
  {
    typeId: "SUBCKT_HA",
    name: "HA_BLK",
    title: "Half Adder Block (XOR + AND)",
    description: "Hierarchical 1-Bit Half Adder module (SUM = A ⊕ B, COUT = A · B)",
    color: "#8b5cf6",
    internalNodes: [
      { type: "XOR", relX: 0, relY: -40, label: "SUM_XOR" },
      { type: "AND", relX: 0, relY: 40, label: "CARRY_AND" },
    ],
    internalWires: [],
    inputMap: [
      {
        name: "A",
        targets: [
          { internalNodeIdx: 0, port: 0 },
          { internalNodeIdx: 1, port: 0 },
        ],
      },
      {
        name: "B",
        targets: [
          { internalNodeIdx: 0, port: 1 },
          { internalNodeIdx: 1, port: 1 },
        ],
      },
    ],
    outputMap: [
      { name: "SUM", source: { internalNodeIdx: 0, port: 0 } },
      { name: "COUT", source: { internalNodeIdx: 1, port: 0 } },
    ],
    gateCount: 2,
  },
  {
    typeId: "SUBCKT_FA",
    name: "FA_BLK",
    title: "Full Adder Block (2×XOR, 2×AND, OR)",
    description: "Hierarchical 1-Bit Full Adder module with A, B, Cin → SUM, Cout",
    color: "#ec4899",
    internalNodes: [
      { type: "XOR", relX: -110, relY: -55, label: "XOR1" },
      { type: "XOR", relX: 30, relY: -55, label: "XOR2" },
      { type: "AND", relX: -110, relY: 25, label: "AND1" },
      { type: "AND", relX: 30, relY: 25, label: "AND2" },
      { type: "OR", relX: 160, relY: 25, label: "OR_COUT" },
    ],
    internalWires: [
      { fromIdx: 0, fromPort: 0, toIdx: 1, toPort: 0 },
      { fromIdx: 0, fromPort: 0, toIdx: 3, toPort: 0 },
      { fromIdx: 2, fromPort: 0, toIdx: 4, toPort: 1 },
      { fromIdx: 3, fromPort: 0, toIdx: 4, toPort: 0 },
    ],
    inputMap: [
      {
        name: "A",
        targets: [
          { internalNodeIdx: 0, port: 0 },
          { internalNodeIdx: 2, port: 0 },
        ],
      },
      {
        name: "B",
        targets: [
          { internalNodeIdx: 0, port: 1 },
          { internalNodeIdx: 2, port: 1 },
        ],
      },
      {
        name: "Cin",
        targets: [
          { internalNodeIdx: 1, port: 1 },
          { internalNodeIdx: 3, port: 1 },
        ],
      },
    ],
    outputMap: [
      { name: "SUM", source: { internalNodeIdx: 1, port: 0 } },
      { name: "Cout", source: { internalNodeIdx: 4, port: 0 } },
    ],
    gateCount: 5,
  },
  {
    typeId: "SUBCKT_MUX2",
    name: "MUX2_BLK",
    title: "2-to-1 Multiplexer Block",
    description: "Hierarchical 2:1 Multiplexer (Y = S'·D0 + S·D1)",
    color: "#06b6d4",
    internalNodes: [
      { type: "NOT", relX: -120, relY: 0, label: "INV_S" },
      { type: "AND", relX: 0, relY: -45, label: "AND_D0" },
      { type: "AND", relX: 0, relY: 45, label: "AND_D1" },
      { type: "OR", relX: 130, relY: 0, label: "OR_Y" },
    ],
    internalWires: [
      { fromIdx: 0, fromPort: 0, toIdx: 1, toPort: 1 },
      { fromIdx: 1, fromPort: 0, toIdx: 3, toPort: 0 },
      { fromIdx: 2, fromPort: 0, toIdx: 3, toPort: 1 },
    ],
    inputMap: [
      { name: "D0", targets: [{ internalNodeIdx: 1, port: 0 }] },
      { name: "D1", targets: [{ internalNodeIdx: 2, port: 0 }] },
      {
        name: "SEL",
        targets: [
          { internalNodeIdx: 0, port: 0 },
          { internalNodeIdx: 2, port: 1 },
        ],
      },
    ],
    outputMap: [{ name: "Y", source: { internalNodeIdx: 3, port: 0 } }],
    gateCount: 4,
  },
];

// Initialize built-in sub-circuits into COMP_SPECS immediately
for (const b of BUILTIN_SUBCIRCUITS) {
  registerSubCircuitInSpecs(b);
}

/**
 * Helper to get input pin count and names for any CircuitNode
 */
function getNodeInputPins(type: string): { name: string }[] {
  if (type === "INPUT") return [];
  if (type === "OUTPUT") return [{ name: "IN" }];
  if (GATE_SPECS[type]) {
    const count = GATE_SPECS[type].inputs;
    return count === 1
      ? [{ name: "A" }]
      : [{ name: "A" }, { name: "B" }];
  }
  if (COMP_SPECS[type]) {
    return COMP_SPECS[type].inputs.map((p) => ({ name: p.name }));
  }
  return [];
}

/**
 * Helper to get output pin count and names for any CircuitNode
 */
function getNodeOutputPins(type: string): { name: string }[] {
  if (type === "INPUT") return [{ name: "OUT" }];
  if (type === "OUTPUT") return [];
  if (GATE_SPECS[type]) return [{ name: "Y" }];
  if (COMP_SPECS[type]) {
    return COMP_SPECS[type].outputs.map((p) => ({ name: p.name }));
  }
  return [];
}

/**
 * Creates a hierarchical SubCircuitDefinition from a set of selected node IDs,
 * replaces the selected internal nodes on the canvas with a single Sub-Circuit Block node,
 * and rewires all boundary nets automatically.
 *
 * Note: If the user selected `INPUT` or `OUTPUT` nodes as part of the selection, we keep
 * `INPUT` and `OUTPUT` nodes on the main canvas as external testbench terminals and group
 * all non-I/O components (gates, flip-flops, MSI chips, nested blocks) into the hierarchical
 * sub-circuit so the block always stays interactive and wired to the circuit's I/O switches!
 */
export function groupSelectedNodesIntoSubCircuit(params: {
  allNodes: CircuitNode[];
  allWires: CircuitWire[];
  selectedIds: number[];
  customName: string;
  customTitle?: string;
  color: string;
  nextTypeId: string;
  allocateNodeId: () => number;
}): {
  definition: SubCircuitDefinition;
  nextNodes: CircuitNode[];
  nextWires: CircuitWire[];
  newBlockNodeId: number;
} | null {
  const {
    allNodes,
    allWires,
    selectedIds,
    customName,
    customTitle,
    color,
    nextTypeId,
    allocateNodeId,
  } = params;

  const rawSelectedNodes = allNodes.filter((n) => selectedIds.includes(n.id));
  // Prefer grouping functional components (gates, ICs, sub-blocks) while keeping top-level INPUT/OUTPUT switches outside
  const functionalSelected = rawSelectedNodes.filter(
    (n) => n.type !== "INPUT" && n.type !== "OUTPUT"
  );
  const groupNodes =
    functionalSelected.length > 0 ? functionalSelected : rawSelectedNodes;

  if (groupNodes.length === 0) return null;

  const groupIdSet = new Set(groupNodes.map((n) => n.id));
  const nodeById = new Map(allNodes.map((n) => [n.id, n]));

  // Centroid of grouped nodes
  const sumX = groupNodes.reduce((acc, n) => acc + n.x, 0);
  const sumY = groupNodes.reduce((acc, n) => acc + n.y, 0);
  const centerX = Math.round(sumX / groupNodes.length / 10) * 10;
  const centerY = Math.round(sumY / groupNodes.length / 10) * 10;

  // Map old node ID -> internal node index (0..K-1)
  const oldIdToInternalIdx = new Map<number, number>();
  const internalNodes = groupNodes.map((n, idx) => {
    oldIdToInternalIdx.set(n.id, idx);
    return {
      type: n.type,
      relX: n.x - centerX,
      relY: n.y - centerY,
      label: n.label,
      value: n.value,
    };
  });

  // Partition wires into:
  // 1. Internal wires (from ∈ S and to ∈ S)
  // 2. Incoming boundary wires (from ∉ S and to ∈ S)
  // 3. Outgoing boundary wires (from ∈ S and to ∉ S)
  // 4. External untouched wires (from ∉ S and to ∉ S)
  const internalWires: SubCircuitDefinition["internalWires"] = [];
  const incomingBoundaryWires: CircuitWire[] = [];
  const outgoingBoundaryWires: CircuitWire[] = [];
  const externalWires: CircuitWire[] = [];

  for (const w of allWires) {
    const fromIn = groupIdSet.has(w.from.node);
    const toIn = groupIdSet.has(w.to.node);
    if (fromIn && toIn) {
      internalWires.push({
        fromIdx: oldIdToInternalIdx.get(w.from.node)!,
        fromPort: w.from.port,
        toIdx: oldIdToInternalIdx.get(w.to.node)!,
        toPort: w.to.port,
      });
    } else if (!fromIn && toIn) {
      incomingBoundaryWires.push(w);
    } else if (fromIn && !toIn) {
      outgoingBoundaryWires.push(w);
    } else {
      externalWires.push(w);
    }
  }

  // Build Input Pin Map:
  // Group incoming boundary wires by their external source `${from.node}:${from.port}`
  // so multiple internal gates driven by the same external input share a single Block Input Pin!
  const inputMap: SubCircuitInputMap[] = [];
  const extSourceToBlockInPort = new Map<string, number>();

  for (const w of incomingBoundaryWires) {
    const srcKey = `${w.from.node}:${w.from.port}`;
    const internalTarget: InternalPinTarget = {
      internalNodeIdx: oldIdToInternalIdx.get(w.to.node)!,
      port: w.to.port,
    };

    if (extSourceToBlockInPort.has(srcKey)) {
      const existingPort = extSourceToBlockInPort.get(srcKey)!;
      inputMap[existingPort].targets.push(internalTarget);
    } else {
      const srcNode = nodeById.get(w.from.node);
      const dstNode = nodeById.get(w.to.node);
      const dstPins = dstNode ? getNodeInputPins(dstNode.type) : [];
      const fallbackName =
        dstPins[w.to.port]?.name || `IN${inputMap.length + 1}`;
      const rawPinName =
        srcNode?.label ||
        (srcNode && COMP_SPECS[srcNode.type]?.outputs[w.from.port]?.name) ||
        fallbackName;

      // Ensure unique pin names
      let pinName = rawPinName;
      let suffix = 2;
      while (inputMap.some((m) => m.name === pinName)) {
        pinName = `${rawPinName}${suffix++}`;
      }

      const newPortIdx = inputMap.length;
      extSourceToBlockInPort.set(srcKey, newPortIdx);
      inputMap.push({
        name: pinName,
        targets: [internalTarget],
      });
    }
  }

  // Also expose any unconnected internal input pins if there were no incoming boundary wires
  // (or if an internal node has open input ports that aren't wired internally or externally)
  const internallyDrivenTargets = new Set<string>();
  for (const iw of internalWires) {
    internallyDrivenTargets.add(`${iw.toIdx}:${iw.toPort}`);
  }
  for (const m of inputMap) {
    for (const t of m.targets) {
      internallyDrivenTargets.add(`${t.internalNodeIdx}:${t.port}`);
    }
  }

  groupNodes.forEach((n, idx) => {
    const inPins = getNodeInputPins(n.type);
    inPins.forEach((pin, pIdx) => {
      const key = `${idx}:${pIdx}`;
      if (!internallyDrivenTargets.has(key) && inputMap.length < 8) {
        let pinName = n.label ? `${n.label}.${pin.name}` : `${pin.name}${inputMap.length + 1}`;
        if (pinName.length > 5) pinName = `I${inputMap.length + 1}`;
        inputMap.push({
          name: pinName,
          targets: [{ internalNodeIdx: idx, port: pIdx }],
        });
      }
    });
  });

  // Build Output Pin Map:
  // Group outgoing boundary wires by their internal source `${from.node}:${from.port}`
  const outputMap: SubCircuitOutputMap[] = [];
  const intSourceToBlockOutPort = new Map<string, number>();

  for (const w of outgoingBoundaryWires) {
    const intIdx = oldIdToInternalIdx.get(w.from.node)!;
    const srcKey = `${intIdx}:${w.from.port}`;
    if (!intSourceToBlockOutPort.has(srcKey)) {
      const dstNode = nodeById.get(w.to.node);
      const srcNode = nodeById.get(w.from.node);
      const srcPins = srcNode ? getNodeOutputPins(srcNode.type) : [];
      const rawPinName =
        dstNode?.label ||
        srcNode?.label ||
        srcPins[w.from.port]?.name ||
        `OUT${outputMap.length + 1}`;

      let pinName = rawPinName;
      let suffix = 2;
      while (outputMap.some((m) => m.name === pinName)) {
        pinName = `${rawPinName}${suffix++}`;
      }

      const newOutPort = outputMap.length;
      intSourceToBlockOutPort.set(srcKey, newOutPort);
      outputMap.push({
        name: pinName,
        source: { internalNodeIdx: intIdx, port: w.from.port },
      });
    }
  }

  // Also expose any internal output pins that don't drive anything inside the block if outputMap is empty
  const internallyUsedSources = new Set<string>();
  for (const iw of internalWires) {
    internallyUsedSources.add(`${iw.fromIdx}:${iw.fromPort}`);
  }
  for (const m of outputMap) {
    internallyUsedSources.add(
      `${m.source.internalNodeIdx}:${m.source.port}`
    );
  }

  groupNodes.forEach((n, idx) => {
    const outPins = getNodeOutputPins(n.type);
    outPins.forEach((pin, pIdx) => {
      const key = `${idx}:${pIdx}`;
      if (!internallyUsedSources.has(key) && outputMap.length < 6) {
        let pinName =
          n.label || ( pin.name !== "Y" ? pin.name : `Y${outputMap.length + 1}`);
        if (pinName.length > 5) pinName = `Y${outputMap.length + 1}`;
        intSourceToBlockOutPort.set(key, outputMap.length);
        outputMap.push({
          name: pinName,
          source: { internalNodeIdx: idx, port: pIdx },
        });
      }
    });
  });

  // Fallback if still 0 outputs: expose first node's output 0
  if (outputMap.length === 0 && groupNodes.length > 0) {
    outputMap.push({
      name: "Y",
      source: { internalNodeIdx: 0, port: 0 },
    });
  }

  const sanitizedName =
    customName.trim().toUpperCase().replace(/\s+/g, "_").slice(0, 10) ||
    "SUB_BLK";

  const definition: SubCircuitDefinition = {
    typeId: nextTypeId,
    name: sanitizedName,
    title: customTitle?.trim() || `${sanitizedName} Hierarchical Sub-Circuit`,
    description: `Grouped from ${groupNodes.length} components (${groupNodes
      .map((g) => g.type)
      .join(", ")})`,
    color,
    internalNodes,
    internalWires,
    inputMap,
    outputMap,
    gateCount: groupNodes.length,
  };

  // Register in COMP_SPECS
  const spec = registerSubCircuitInSpecs(definition);

  // Create new block node on canvas
  const newBlockNodeId = allocateNodeId();
  const newBlockNode: CircuitNode = {
    id: newBlockNodeId,
    type: nextTypeId,
    x: Math.round((centerX - spec.w / 2) / 10) * 10,
    y: Math.round((centerY - spec.h / 2) / 10) * 10,
    label: sanitizedName,
  };

  // Build rewired canvas wires
  const rewiredIncoming: CircuitWire[] = [];
  const addedBlockInPorts = new Set<number>();
  for (const w of incomingBoundaryWires) {
    const srcKey = `${w.from.node}:${w.from.port}`;
    const blockInPort = extSourceToBlockInPort.get(srcKey);
    if (blockInPort !== undefined && !addedBlockInPorts.has(blockInPort)) {
      addedBlockInPorts.add(blockInPort);
      rewiredIncoming.push({
        id: allocateNodeId(),
        from: { node: w.from.node, port: w.from.port },
        to: { node: newBlockNodeId, port: blockInPort },
      });
    }
  }

  const rewiredOutgoing: CircuitWire[] = [];
  for (const w of outgoingBoundaryWires) {
    const intIdx = oldIdToInternalIdx.get(w.from.node)!;
    const srcKey = `${intIdx}:${w.from.port}`;
    const blockOutPort = intSourceToBlockOutPort.get(srcKey);
    if (blockOutPort !== undefined) {
      rewiredOutgoing.push({
        id: allocateNodeId(),
        from: { node: newBlockNodeId, port: blockOutPort },
        to: { node: w.to.node, port: w.to.port },
      });
    }
  }

  const remainingNodes = allNodes.filter((n) => !groupIdSet.has(n.id));
  const nextNodes = [...remainingNodes, newBlockNode];
  const nextWires = [...externalWires, ...rewiredIncoming, ...rewiredOutgoing];

  return {
    definition,
    nextNodes,
    nextWires,
    newBlockNodeId,
  };
}

/**
 * Ungroups (expands / flattens) a Hierarchical Sub-Circuit Block node on the canvas
 * back into its constituent internal components and wires, reconnecting external wires!
 */
export function ungroupSubCircuitNode(params: {
  blockNode: CircuitNode;
  definition: SubCircuitDefinition;
  allNodes: CircuitNode[];
  allWires: CircuitWire[];
  allocateNodeId: () => number;
}): {
  nextNodes: CircuitNode[];
  nextWires: CircuitWire[];
  restoredNodeIds: number[];
} {
  const { blockNode, definition, allNodes, allWires, allocateNodeId } = params;
  const spec = COMP_SPECS[blockNode.type];
  const centerX = blockNode.x + (spec ? spec.w / 2 : 60);
  const centerY = blockNode.y + (spec ? spec.h / 2 : 45);

  const restoredNodes: CircuitNode[] = definition.internalNodes.map((inNode) => {
    const id = allocateNodeId();
    const n: CircuitNode = {
      id,
      type: inNode.type,
      x: Math.round((centerX + inNode.relX) / 10) * 10,
      y: Math.round((centerY + inNode.relY) / 10) * 10,
      label: inNode.label,
    };
    if (inNode.type === "INPUT") n.value = inNode.value ?? 0;
    if (COMP_SPECS[inNode.type]?.seq) {
      n.state = { ...(COMP_SPECS[inNode.type].init || {}) };
      n.prevClk = {};
    }
    return n;
  });

  // Restore internal wires
  const restoredInternalWires: CircuitWire[] = definition.internalWires.map(
    (iw) => ({
      id: allocateNodeId(),
      from: { node: restoredNodes[iw.fromIdx].id, port: iw.fromPort },
      to: { node: restoredNodes[iw.toIdx].id, port: iw.toPort },
    })
  );

  // Reconnect wires that entered or left blockNode
  const reconnectedWires: CircuitWire[] = [];
  for (const w of allWires) {
    if (w.to.node === blockNode.id) {
      // Incoming wire into block's input port
      const mapEntry = definition.inputMap[w.to.port];
      if (mapEntry) {
        for (const tgt of mapEntry.targets) {
          const targetRestored = restoredNodes[tgt.internalNodeIdx];
          if (targetRestored) {
            reconnectedWires.push({
              id: allocateNodeId(),
              from: { ...w.from },
              to: { node: targetRestored.id, port: tgt.port },
            });
          }
        }
      }
    } else if (w.from.node === blockNode.id) {
      // Outgoing wire from block's output port
      const mapEntry = definition.outputMap[w.from.port];
      if (mapEntry) {
        const sourceRestored =
          restoredNodes[mapEntry.source.internalNodeIdx];
        if (sourceRestored) {
          reconnectedWires.push({
            id: allocateNodeId(),
            from: { node: sourceRestored.id, port: mapEntry.source.port },
            to: { ...w.to },
          });
        }
      }
    } else {
      reconnectedWires.push(w);
    }
  }

  const nextNodes = [
    ...allNodes.filter((n) => n.id !== blockNode.id),
    ...restoredNodes,
  ];
  const nextWires = [...reconnectedWires, ...restoredInternalWires];

  return {
    nextNodes,
    nextWires,
    restoredNodeIds: restoredNodes.map((n) => n.id),
  };
}
