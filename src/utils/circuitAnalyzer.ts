import { CircuitNode, CircuitWire } from "../components/CircuitLab";
import { GATE_SPECS, COMP_SPECS, computeGate } from "../data/logicSpecs";

export interface GateOperationInsight {
  nodeId: number;
  nodeType: string;
  targetLabel: string;
  sourceGatesLabel: string; // e.g. "AND #2 → NOT #3"
  rawExpr: string;
  simplifiedName: string;
  equivalentGate: string;
  explanation: string;
  inputNames: string[];
  isCascade: boolean; // true when fed by at least one other gate/chip or self-tied
}

export interface CircuitArchitectureSummary {
  circuitPatternName: string;
  circuitPatternDesc: string;
  gateInsights: GateOperationInsight[];
}

interface LeafInputVar {
  key: string; // "node:<id>" for INPUT node, or "port:<nodeId>:<portIdx>" for open gate input
  label: string;
}

/**
 * Evaluates a boolean function over its distinct leaf inputs (both wired INPUT nodes
 * and open upstream gate ports) to classify its exact functional equivalence
 * regardless of how many gates were chained to build it (e.g. AND->NOT = NAND, 4x NAND = XOR).
 */
function classifyTruthSignature(
  targetNodeId: number,
  leafVars: LeafInputVar[],
  nodeMap: Map<number, CircuitNode>,
  wireMap: Map<string, CircuitWire>
): {
  equivalentGate: string;
  simplifiedName: string;
  explanation: string;
} | null {
  const k = leafVars.length;
  if (k === 0 || k > 4) return null;

  const evalNode = (
    nId: number,
    varValues: Record<string, number>,
    visited: Set<number>,
    memo: Map<number, number>
  ): number => {
    if (memo.has(nId)) return memo.get(nId)!;
    if (visited.has(nId)) return 0; // break feedback cycle
    visited.add(nId);

    const n = nodeMap.get(nId);
    if (!n) {
      visited.delete(nId);
      return 0;
    }
    let result = 0;
    if (n.type === "INPUT") {
      result = varValues[`node:${n.id}`] ?? 0;
    } else if (n.type === "OUTPUT") {
      const w = wireMap.get(`${n.id}:0`);
      result = w
        ? evalNode(w.from.node, varValues, visited, memo)
        : varValues[`port:${n.id}:0`] ?? 0;
    } else {
      const spec = GATE_SPECS[n.type];
      if (spec) {
        const ins: number[] = [];
        for (let p = 0; p < spec.inputs; p++) {
          const w = wireMap.get(`${n.id}:${p}`);
          ins.push(
            w
              ? evalNode(w.from.node, varValues, visited, memo)
              : varValues[`port:${n.id}:${p}`] ?? 0
          );
        }
        result = computeGate(n.type, ins);
      }
    }

    visited.delete(nId);
    memo.set(nId, result);
    return result;
  };

  const totalRows = 1 << k;
  const truthVector: number[] = [];
  for (let mask = 0; mask < totalRows; mask++) {
    const varValues: Record<string, number> = {};
    leafVars.forEach((lv, idx) => {
      varValues[lv.key] = (mask >> (k - 1 - idx)) & 1;
    });
    truthVector.push(evalNode(targetNodeId, varValues, new Set(), new Map()));
  }

  const names = leafVars.map((lv) => lv.label);
  const sig = truthVector.join("");

  // 1-Input Functions (truthVector length = 2: for input = 0, 1)
  if (k === 1) {
    const A = names[0];
    if (sig === "00") {
      return {
        equivalentGate: "Constant 0 (GND / Null)",
        simplifiedName: `Y = 0`,
        explanation: `Contradiction law: ${A} · ${A}' = 0 (always LOW).`,
      };
    }
    if (sig === "11") {
      return {
        equivalentGate: "Constant 1 (VDD / Identity)",
        simplifiedName: `Y = 1`,
        explanation: `Tautology law: ${A} + ${A}' = 1 (always HIGH).`,
      };
    }
    if (sig === "10") {
      return {
        equivalentGate: "NOT Gate (Inverter)",
        simplifiedName: `Y = ${A}'`,
        explanation: `Inverter operation: complements ${A} (1 → 0, 0 → 1).`,
      };
    }
    if (sig === "01") {
      return {
        equivalentGate: "Buffer Gate (Double Inversion)",
        simplifiedName: `Y = ${A}`,
        explanation: `Double-Inversion / Non-Inverting Buffer: (${A}')' = ${A}.`,
      };
    }
  }

  // 2-Input Functions (truthVector length = 4: for AB = 00, 01, 10, 11)
  if (k === 2) {
    const [A, B] = names;
    const map2: Record<
      string,
      { equivalentGate: string; simplifiedName: string; explanation: string }
    > = {
      "0000": {
        equivalentGate: "Constant 0 (Null)",
        simplifiedName: "Y = 0",
        explanation: "Outputs logic LOW (0) for all input combinations.",
      },
      "1111": {
        equivalentGate: "Constant 1 (Tautology)",
        simplifiedName: "Y = 1",
        explanation: "Outputs logic HIGH (1) for all input combinations.",
      },
      "0001": {
        equivalentGate: "AND Gate",
        simplifiedName: `Y = ${A} · ${B}`,
        explanation: `Synthesizes 2-input AND operation (${A} AND ${B}).`,
      },
      "1110": {
        equivalentGate: "NAND Gate",
        simplifiedName: `Y = (${A} · ${B})'`,
        explanation: `Synthesizes 2-input NAND operation ¬(${A} · ${B}).`,
      },
      "0111": {
        equivalentGate: "OR Gate",
        simplifiedName: `Y = ${A} + ${B}`,
        explanation: `Synthesizes 2-input OR operation (${A} OR ${B}).`,
      },
      "1000": {
        equivalentGate: "NOR Gate",
        simplifiedName: `Y = (${A} + ${B})'`,
        explanation: `Synthesizes 2-input NOR operation ¬(${A} + ${B}).`,
      },
      "0110": {
        equivalentGate: "XOR Gate (Half-Adder Sum)",
        simplifiedName: `Y = ${A} ⊕ ${B}`,
        explanation: `Synthesizes Exclusive-OR (${A}·${B}' + ${A}'·${B}) — Inequality / Sum detector.`,
      },
      "1001": {
        equivalentGate: "XNOR Gate (Equivalence)",
        simplifiedName: `Y = (${A} ⊕ ${B})'`,
        explanation: `Synthesizes Exclusive-NOR (${A}·${B} + ${A}'·${B}') — Equality comparator.`,
      },
      "0010": {
        equivalentGate: `Inhibition Gate (${A} · ${B}')`,
        simplifiedName: `Y = ${A} · ${B}'`,
        explanation: `${A} AND NOT ${B} (Half-Subtractor Borrow / Inhibit gate).`,
      },
      "0100": {
        equivalentGate: `Inhibition Gate (${A}' · ${B})`,
        simplifiedName: `Y = ${A}' · ${B}`,
        explanation: `NOT ${A} AND ${B} (Half-Subtractor Borrow when ${A} < ${B}).`,
      },
      "1101": {
        equivalentGate: `Implication Gate (${A} → ${B})`,
        simplifiedName: `Y = ${A}' + ${B}`,
        explanation: `Boolean Implication: LOW only when ${A}=1 and ${B}=0.`,
      },
      "1011": {
        equivalentGate: `Implication Gate (${B} → ${A})`,
        simplifiedName: `Y = ${A} + ${B}'`,
        explanation: `Boolean Implication: LOW only when ${B}=1 and ${A}=0.`,
      },
      "0011": {
        equivalentGate: `Buffer (${A})`,
        simplifiedName: `Y = ${A}`,
        explanation: `Simplifies by Boolean absorption to ${A} (independent of ${B}).`,
      },
      "0101": {
        equivalentGate: `Buffer (${B})`,
        simplifiedName: `Y = ${B}`,
        explanation: `Simplifies by Boolean absorption to ${B} (independent of ${A}).`,
      },
      "1100": {
        equivalentGate: `NOT Gate (${A}')`,
        simplifiedName: `Y = ${A}'`,
        explanation: `Simplifies to complement of ${A} (independent of ${B}).`,
      },
      "1010": {
        equivalentGate: `NOT Gate (${B}')`,
        simplifiedName: `Y = ${B}'`,
        explanation: `Simplifies to complement of ${B} (independent of ${A}).`,
      },
    };
    if (map2[sig]) return map2[sig];
  }

  // 3-Input Functions (truthVector length = 8)
  if (k === 3) {
    const [A, B, C] = names;
    if (sig === "00000001") {
      return {
        equivalentGate: "3-Input AND Gate",
        simplifiedName: `Y = ${A} · ${B} · ${C}`,
        explanation: `Cascaded AND network: HIGH only when ${A}=${B}=${C}=1.`,
      };
    }
    if (sig === "11111110") {
      return {
        equivalentGate: "3-Input NAND Gate",
        simplifiedName: `Y = (${A} · ${B} · ${C})'`,
        explanation: `3-Input NAND operation ¬(${A} · ${B} · ${C}).`,
      };
    }
    if (sig === "01111111") {
      return {
        equivalentGate: "3-Input OR Gate",
        simplifiedName: `Y = ${A} + ${B} + ${C}`,
        explanation: `Cascaded OR network: HIGH when any of ${A}, ${B}, ${C} is 1.`,
      };
    }
    if (sig === "10000000") {
      return {
        equivalentGate: "3-Input NOR Gate",
        simplifiedName: `Y = (${A} + ${B} + ${C})'`,
        explanation: `3-Input NOR operation ¬(${A} + ${B} + ${C}).`,
      };
    }
    if (sig === "01101001") {
      return {
        equivalentGate: "3-Input XOR (Full-Adder Sum / Odd Parity)",
        simplifiedName: `Y = ${A} ⊕ ${B} ⊕ ${C}`,
        explanation: `Cascaded XOR network: computes Full-Adder Sum or 3-bit Odd Parity.`,
      };
    }
    if (sig === "10010110") {
      return {
        equivalentGate: "3-Input XNOR (Even Parity)",
        simplifiedName: `Y = (${A} ⊕ ${B} ⊕ ${C})'`,
        explanation: `Cascaded XNOR network: computes 3-bit Even Parity.`,
      };
    }
    if (sig === "00010111") {
      return {
        equivalentGate: "Full-Adder Carry-Out (3-Input Majority Gate)",
        simplifiedName: `Y = ${A}·${B} + ${C}·(${A} ⊕ ${B})`,
        explanation: `Majority Voter / Carry-Out: outputs 1 when at least two of (${A}, ${B}, ${C}) are 1.`,
      };
    }
    if (sig === "01010111") {
      return {
        equivalentGate: "AND-OR (SOP) Gate",
        simplifiedName: `Y = (${A} · ${B}) + ${C}`,
        explanation: `2-Wide AND-OR Sum-of-Products combination.`,
      };
    }
    if (sig === "00011111") {
      return {
        equivalentGate: "AND-OR (SOP) Gate",
        simplifiedName: `Y = ${A} + (${B} · ${C})`,
        explanation: `2-Wide AND-OR Sum-of-Products combination.`,
      };
    }
    if (sig === "10101000") {
      return {
        equivalentGate: "AND-OR-Invert (AOI) Gate",
        simplifiedName: `Y = ((${A} · ${B}) + ${C})'`,
        explanation: `Compound CMOS AND-OR-Invert (AOI21) logic stage.`,
      };
    }
    if (sig === "00010101") {
      return {
        equivalentGate: "OR-AND (POS) Gate",
        simplifiedName: `Y = (${A} + ${B}) · ${C}`,
        explanation: `Product-of-Sums (OR feeding AND) combination.`,
      };
    }
    if (sig === "11101010") {
      return {
        equivalentGate: "OR-AND-Invert (OAI) Gate",
        simplifiedName: `Y = ((${A} + ${B}) · ${C})'`,
        explanation: `Compound CMOS OR-AND-Invert (OAI21) logic stage.`,
      };
    }
    if (sig === "00110101") {
      return {
        equivalentGate: `2:1 Multiplexer (Sel=${A})`,
        simplifiedName: `Y = ${A}'·${B} + ${A}·${C}`,
        explanation: `Selects ${B} when ${A}=0 and ${C} when ${A}=1.`,
      };
    }
    if (sig === "00011011") {
      return {
        equivalentGate: `2:1 Multiplexer (Sel=${C})`,
        simplifiedName: `Y = ${C}'·${A} + ${C}·${B}`,
        explanation: `Selects ${A} when ${C}=0 and ${B} when ${C}=1.`,
      };
    }
  }

  // 4-Input Functions (truthVector length = 16)
  if (k === 4) {
    const [A, B, C, D] = names;
    if (sig === "0000000000000001") {
      return {
        equivalentGate: "4-Input AND Gate",
        simplifiedName: `Y = ${A} · ${B} · ${C} · ${D}`,
        explanation: `Cascaded 4-input AND gate.`,
      };
    }
    if (sig === "1111111111111110") {
      return {
        equivalentGate: "4-Input NAND Gate",
        simplifiedName: `Y = (${A} · ${B} · ${C} · ${D})'`,
        explanation: `Cascaded 4-input NAND gate.`,
      };
    }
    if (sig === "0111111111111111") {
      return {
        equivalentGate: "4-Input OR Gate",
        simplifiedName: `Y = ${A} + ${B} + ${C} + ${D}`,
        explanation: `Cascaded 4-input OR gate.`,
      };
    }
    if (sig === "1000000000000000") {
      return {
        equivalentGate: "4-Input NOR Gate",
        simplifiedName: `Y = (${A} + ${B} + ${C} + ${D})'`,
        explanation: `Cascaded 4-input NOR gate.`,
      };
    }
    if (sig === "0110100110010110") {
      return {
        equivalentGate: "4-Input XOR (Odd Parity Generator)",
        simplifiedName: `Y = ${A} ⊕ ${B} ⊕ ${C} ⊕ ${D}`,
        explanation: `Cascaded XOR tree computing 4-bit odd parity.`,
      };
    }
    if (sig === "1001011001101001") {
      return {
        equivalentGate: "4-Input XNOR (Even Parity Checker)",
        simplifiedName: `Y = (${A} ⊕ ${B} ⊕ ${C} ⊕ ${D})'`,
        explanation: `Cascaded XNOR tree computing 4-bit even parity.`,
      };
    }
  }

  return null;
}

/**
 * Builds symbolic expression and detects equivalent gate / operation for every
 * connected gate and output in the circuit.
 */
export function analyzeCircuitOperations(
  nodes: CircuitNode[],
  wires: CircuitWire[]
): CircuitArchitectureSummary {
  const nodeMap = new Map<number, CircuitNode>();
  for (const n of nodes) {
    nodeMap.set(n.id, n);
  }

  const wireMap = new Map<string, CircuitWire>();
  const outDegree = new Set<number>();
  for (const w of wires) {
    wireMap.set(`${w.to.node}:${w.to.port}`, w);
    outDegree.add(w.from.node);
  }

  const inputNodes = nodes.filter((n) => n.type === "INPUT");
  const getInputName = (n: CircuitNode) => {
    if (n.label) return n.label;
    const idx = inputNodes.findIndex((x) => x.id === n.id);
    return idx >= 0 ? String.fromCharCode(65 + idx) : `IN${n.id}`;
  };

  // Build symbolic expression and collect leaf variables (wired INPUTs + open gate pins)
  const analyzeSubtree = (
    targetNodeId: number
  ): {
    expr: string;
    leafVars: LeafInputVar[];
    hasFeedback: boolean;
    directDriverGates: string[];
  } => {
    const leafMap = new Map<string, LeafInputVar>();
    let virtualCounter = 0;
    const usedLabels = new Set(inputNodes.map(getInputName));

    const nextVirtualLabel = () => {
      const candidates = ["A", "B", "C", "D", "X", "Y", "Z"];
      for (const c of candidates) {
        if (!usedLabels.has(c)) {
          usedLabels.add(c);
          return c;
        }
      }
      virtualCounter++;
      return `X${virtualCounter}`;
    };

    let hasFeedback = false;
    const memoExpr = new Map<string, string>();

    const walk = (
      nodeId: number,
      outPort: number,
      visited: Set<number>
    ): string => {
      const memoKey = `${nodeId}:${outPort}`;
      if (memoExpr.has(memoKey)) return memoExpr.get(memoKey)!;

      if (visited.has(nodeId)) {
        hasFeedback = true;
        return "Q_fb";
      }
      visited.add(nodeId);

      const n = nodeMap.get(nodeId);
      if (!n) {
        visited.delete(nodeId);
        return "0";
      }

      if (n.type === "INPUT") {
        visited.delete(nodeId);
        const key = `node:${n.id}`;
        const label = getInputName(n);
        if (!leafMap.has(key)) {
          leafMap.set(key, { key, label });
        }
        memoExpr.set(memoKey, label);
        return label;
      }

      if (n.type === "OUTPUT") {
        const w = wireMap.get(`${n.id}:0`);
        const res = w ? walk(w.from.node, w.from.port, visited) : "0";
        visited.delete(nodeId);
        memoExpr.set(memoKey, res);
        return res;
      }

      const comp = COMP_SPECS[n.type];
      if (comp) {
        visited.delete(nodeId);
        const pinName = comp.outputs[outPort]?.name || `OUT${outPort}`;
        const res = `${comp.label}.${pinName}`;
        memoExpr.set(memoKey, res);
        return res;
      }

      const spec = GATE_SPECS[n.type];
      if (!spec) {
        visited.delete(nodeId);
        return "0";
      }

      const childExprs = Array.from({ length: spec.inputs }, (_, pIdx) => {
        const w = wireMap.get(`${n.id}:${pIdx}`);
        if (!w) {
          const key = `port:${n.id}:${pIdx}`;
          if (!leafMap.has(key)) {
            leafMap.set(key, { key, label: nextVirtualLabel() });
          }
          return leafMap.get(key)!.label;
        }
        return walk(w.from.node, w.from.port, visited);
      });

      visited.delete(nodeId);

      const a = childExprs[0] || "0";
      const b = childExprs[1] || "0";
      let res = "0";
      switch (n.type) {
        case "NOT":
          res = a.length <= 2 ? `${a}'` : `(${a})'`;
          break;
        case "AND":
          res = `(${a} · ${b})`;
          break;
        case "NAND":
          res = `(${a} · ${b})'`;
          break;
        case "OR":
          res = `(${a} + ${b})`;
          break;
        case "NOR":
          res = `(${a} + ${b})'`;
          break;
        case "XOR":
          res = `(${a} ⊕ ${b})`;
          break;
        case "XNOR":
          res = `(${a} ⊕ ${b})'`;
          break;
      }
      if (res.length > 72) {
        res = `${n.type}(Stage#${n.id})`;
      }
      memoExpr.set(memoKey, res);
      return res;
    };

    const expr = walk(targetNodeId, 0, new Set());

    // Collect immediate upstream gates feeding targetNodeId
    const targetNode = nodeMap.get(targetNodeId);
    const directDriverGates: string[] = [];
    if (targetNode) {
      const inCount =
        targetNode.type === "OUTPUT"
          ? 1
          : GATE_SPECS[targetNode.type]?.inputs ?? 0;
      for (let p = 0; p < inCount; p++) {
        const w = wireMap.get(`${targetNode.id}:${p}`);
        if (w) {
          const src = nodeMap.get(w.from.node);
          if (src && src.type !== "INPUT") {
            directDriverGates.push(`${src.type} #${src.id}`);
          }
        }
      }
    }

    return {
      expr,
      leafVars: Array.from(leafMap.values()),
      hasFeedback,
      directDriverGates: Array.from(new Set(directDriverGates)),
    };
  };

  const gateInsights: GateOperationInsight[] = [];

  for (const n of nodes) {
    if (!GATE_SPECS[n.type] && n.type !== "OUTPUT") continue;

    const inCount = n.type === "OUTPUT" ? 1 : GATE_SPECS[n.type].inputs;
    let hasConnectedInputWire = false;
    let fedByGateOrComp = false;

    for (let p = 0; p < inCount; p++) {
      const w = wireMap.get(`${n.id}:${p}`);
      if (w) {
        hasConnectedInputWire = true;
        const srcNode = nodeMap.get(w.from.node);
        if (srcNode && srcNode.type !== "INPUT") {
          fedByGateOrComp = true;
        }
      }
    }

    // Also include a gate if its output is wired to another gate, so the user can see the upstream stage
    const drivesAnotherNode = outDegree.has(n.id);
    if (!hasConnectedInputWire && !drivesAnotherNode) continue;

    let inputsTiedTogether = false;
    if (inCount === 2) {
      const w0 = wireMap.get(`${n.id}:0`);
      const w1 = wireMap.get(`${n.id}:1`);
      if (
        w0 &&
        w1 &&
        w0.from.node === w1.from.node &&
        w0.from.port === w1.from.port
      ) {
        inputsTiedTogether = true;
      }
    }

    const sub = analyzeSubtree(n.id);
    let equivalentGate = `${n.type} Gate`;
    let simplifiedName = sub.expr;
    let explanation = `Standard ${n.type} logic operation.`;

    if (sub.hasFeedback) {
      equivalentGate =
        n.type === "NOR"
          ? "Bistable SR NOR Latch"
          : n.type === "NAND"
          ? "Bistable SR NAND Latch"
          : "Sequential Feedback Loop";
      simplifiedName = "Q(t+1) = Latch State";
      explanation =
        "Cross-coupled gate feedback forms a 1-bit sequential bistable latch.";
    } else {
      const classified = classifyTruthSignature(
        n.id,
        sub.leafVars,
        nodeMap,
        wireMap
      );
      if (classified) {
        equivalentGate = classified.equivalentGate;
        simplifiedName = classified.simplifiedName;
        explanation = classified.explanation;
      }
    }

    const targetLabel =
      n.type === "OUTPUT"
        ? `Output ${n.label || `O${n.id}`}`
        : `${n.type} #${n.id}`;

    const sourceGatesLabel =
      sub.directDriverGates.length > 0
        ? `${sub.directDriverGates.join(" + ")} → ${targetLabel}`
        : inputsTiedTogether
        ? `${targetLabel} (Inputs Tied)`
        : targetLabel;

    gateInsights.push({
      nodeId: n.id,
      nodeType: n.type,
      targetLabel,
      sourceGatesLabel,
      rawExpr: sub.expr,
      simplifiedName,
      equivalentGate,
      explanation,
      inputNames: sub.leafVars.map((v) => v.label),
      isCascade: fedByGateOrComp || inputsTiedTogether || sub.hasFeedback,
    });
  }

  // High-level multi-output architecture recognition
  const equivSet = new Set(gateInsights.map((g) => g.equivalentGate));
  let circuitPatternName = "Interactive Logic Network";
  let circuitPatternDesc =
    "Connect the output of any gate into the input of another gate to see the synthesized Boolean operation and equivalent gate in real time.";

  const hasSum2 = gateInsights.some((g) =>
    g.equivalentGate.includes("XOR Gate (Half-Adder Sum)")
  );
  const hasCarry2 = gateInsights.some((g) => g.equivalentGate === "AND Gate");
  const hasSum3 = gateInsights.some((g) =>
    g.equivalentGate.includes("3-Input XOR (Full-Adder Sum")
  );
  const hasCout3 = gateInsights.some((g) =>
    g.equivalentGate.includes("Full-Adder Carry-Out")
  );

  const cascadedGates = gateInsights.filter(
    (g) => g.isCascade && g.nodeType !== "OUTPUT"
  );

  if (hasSum3 && hasCout3) {
    circuitPatternName =
      "1-Bit Full-Adder (Sum = A⊕B⊕Cin, Cout = AB + Cin(A⊕B))";
    circuitPatternDesc =
      "Cascaded XOR gates compute the 3-bit Sum while two AND gates feeding an OR gate synthesize Carry-Out.";
  } else if (hasSum2 && hasCarry2 && inputNodes.length === 2 && cascadedGates.length === 0) {
    circuitPatternName = "1-Bit Half-Adder (Sum = A⊕B, Carry = A·B)";
    circuitPatternDesc =
      "Parallel XOR and AND gates sharing inputs A and B form a 1-bit binary Half-Adder.";
  } else if (Array.from(equivSet).some((e) => e.includes("Bistable SR"))) {
    circuitPatternName = "Cross-Coupled Bistable SR Latch";
    circuitPatternDesc =
      "Cross-coupled feedback between two gates creates a 1-bit sequential memory cell (Q and Q̅).";
  } else if (cascadedGates.length > 0) {
    const latest = cascadedGates[cascadedGates.length - 1];
    circuitPatternName = `${latest.sourceGatesLabel}  ⇒  ${latest.equivalentGate} (${latest.simplifiedName})`;
    circuitPatternDesc = `Expression ${latest.rawExpr} simplifies to ${latest.simplifiedName} — ${latest.explanation}`;
  } else if (gateInsights.length > 0) {
    const first = gateInsights[0];
    circuitPatternName = `${first.equivalentGate} (${first.simplifiedName})`;
    circuitPatternDesc = first.explanation;
  }

  return {
    circuitPatternName,
    circuitPatternDesc,
    gateInsights,
  };
}
