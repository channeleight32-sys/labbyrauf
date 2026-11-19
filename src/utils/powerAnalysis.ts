import { GATE_SPECS, COMP_SPECS } from "../data/logicSpecs";
import type { CircuitNode, CircuitWire } from "../components/CircuitLab";

export type LogicFamilyId = "74HC_5V" | "74LS_5V" | "74LVC_3V3" | "CD4000_12V";

export interface LogicFamilyPowerSpec {
  id: LogicFamilyId;
  name: string;
  shortLabel: string;
  vdd: number; // Supply voltage in Volts
  cGatePf: number; // Intrinsic internal switching capacitance per primitive gate (pF)
  cPinPf: number; // Fan-out input pin + wire stub capacitance (pF)
  cWirePer100PxPf: number; // Interconnect trace capacitance per 100px of schematic wire (pF)
  staticHighMw: number; // Static quiescent power when output is HIGH (mW per gate equivalent)
  staticLowMw: number; // Static quiescent power when output is LOW (mW per gate equivalent)
  shortCircuitFactor: number; // Additional dynamic short-circuit multiplier during transitions
  thetaJaCPerMw: number; // Thermal resistance (°C rise per mW dissipated in local die region)
  description: string;
}

export const LOGIC_FAMILY_SPECS: Record<LogicFamilyId, LogicFamilyPowerSpec> = {
  "74HC_5V": {
    id: "74HC_5V",
    name: "74HC High-Speed CMOS (5.0V)",
    shortLabel: "74HC CMOS (5V)",
    vdd: 5.0,
    cGatePf: 18,
    cPinPf: 6.5,
    cWirePer100PxPf: 4.5,
    staticHighMw: 0.04,
    staticLowMw: 0.04,
    shortCircuitFactor: 1.18,
    thetaJaCPerMw: 3.4,
    description:
      "Near-zero static leakage; power scales quadratically with V_DD² and linearly with clock switching frequency.",
  },
  "74LS_5V": {
    id: "74LS_5V",
    name: "74LS Low-Power Schottky TTL (5.0V)",
    shortLabel: "74LS TTL (5V)",
    vdd: 5.0,
    cGatePf: 15,
    cPinPf: 5.5,
    cWirePer100PxPf: 4.0,
    staticHighMw: 0.85,
    staticLowMw: 2.45, // TTL sinks higher current in LOW state
    shortCircuitFactor: 1.32,
    thetaJaCPerMw: 2.8,
    description:
      "Bipolar Schottky totem-pole gates with continuous static bias current (higher I_CCL when output is LOW).",
  },
  "74LVC_3V3": {
    id: "74LVC_3V3",
    name: "74LVC Low-Voltage CMOS (3.3V)",
    shortLabel: "74LVC (3.3V)",
    vdd: 3.3,
    cGatePf: 11,
    cPinPf: 4.2,
    cWirePer100PxPf: 3.2,
    staticHighMw: 0.02,
    staticLowMw: 0.02,
    shortCircuitFactor: 1.12,
    thetaJaCPerMw: 3.6,
    description:
      "Modern 3.3V low-power logic family reducing dynamic CV²f dissipation by >55% compared to 5V CMOS.",
  },
  CD4000_12V: {
    id: "CD4000_12V",
    name: "CD4000B High-Voltage CMOS (12.0V)",
    shortLabel: "CD4000B (12V)",
    vdd: 12.0,
    cGatePf: 24,
    cPinPf: 8.0,
    cWirePer100PxPf: 5.5,
    staticHighMw: 0.09,
    staticLowMw: 0.09,
    shortCircuitFactor: 1.25,
    thetaJaCPerMw: 2.2,
    description:
      "12V industrial CMOS where high V_DD² (144 V²) causes intense thermal dissipation on high-frequency clock lines.",
  },
};

export type ThermalTier = "COOL" | "NOMINAL" | "WARM" | "HOT" | "CRITICAL";

export interface NodePowerMetrics {
  nodeId: number;
  type: string;
  label: string;
  category: "gate" | "seq" | "msi" | "io" | "subckt";
  gateEquivalents: number;
  fanOutCount: number;
  loadCapacitancePf: number;
  activityFactor: number; // alpha in [0..1]
  effectiveFreqMHz: number;
  staticPowerMw: number;
  dynamicPowerMw: number;
  totalPowerMw: number;
  junctionTempC: number;
  heatIntensity: number; // normalized [0..1]
  thermalTier: ThermalTier;
  heatColor: string;
  isClockDriver: boolean;
  isClockedSequential: boolean;
}

export interface WireHeatSignature {
  wireId: number;
  fromNodeId: number;
  fromPort: number;
  toNodeId: number;
  toPort: number;
  netLabel: string;
  isClockLine: boolean;
  clockLineReason: "SEQ_CLK_PIN" | "CLK_LABEL" | "PRIMARY_OSC" | "HIGH_TOGGLE" | "DATA_NET";
  activityFactor: number; // transitions per cycle
  effectiveFreqMHz: number;
  wireLengthPx: number;
  wireCapPf: number;
  wirePowerMw: number;
  tempRiseC: number;
  wireTempC: number;
  heatIntensity: number; // [0..1]
  thermalTier: ThermalTier;
  heatColor: string;
  glowColor: string;
}

export interface CircuitPowerSummary {
  family: LogicFamilyPowerSpec;
  effectiveClockMHz: number;
  ambientTempC: number;
  totalStaticMw: number;
  totalDynamicMw: number;
  totalWireMw: number;
  totalCircuitPowerMw: number;
  peakJunctionTempC: number;
  hotspotNode: NodePowerMetrics | null;
  activeClockLineCount: number;
  nodeMetrics: Map<number, NodePowerMetrics>;
  nodeMetricsList: NodePowerMetrics[];
  wireSignatures: Map<number, WireHeatSignature>;
  wireSignaturesList: WireHeatSignature[];
}

// Gate complexity multiplier (equivalent primitive 2-input NAND gates inside each component)
const GATE_EQUIVALENT_MAP: Record<string, number> = {
  INPUT: 0.4,
  OUTPUT: 0.6,
  NOT: 0.8,
  NAND: 1.0,
  NOR: 1.0,
  AND: 1.35,
  OR: 1.35,
  XOR: 2.6,
  XNOR: 2.8,
  DFF: 4.5,
  JKFF: 5.5,
  SRFF: 3.5,
  TFF: 5.0,
  "7474": 6.0,
  "7473": 6.5,
  MUX4: 6.5,
  DEMUX4: 6.0,
  "74138": 11.0,
  "7483": 18.0,
  "7485": 16.0,
  "74193": 22.0,
  "74194": 20.0,
  "7447": 15.0,
  "7SEG": 8.0,
};

export function getThermalColor(intensity: number): {
  tier: ThermalTier;
  color: string;
  glow: string;
  bgTint: string;
} {
  const clamped = Math.max(0, Math.min(1, intensity));
  if (clamped >= 0.8) {
    return {
      tier: "CRITICAL",
      color: "#f43f5e", // Infrared Rose-Red
      glow: "rgba(244, 63, 94, 0.55)",
      bgTint: "rgba(244, 63, 94, 0.20)",
    };
  }
  if (clamped >= 0.58) {
    return {
      tier: "HOT",
      color: "#f97316", // Thermal Orange
      glow: "rgba(249, 115, 22, 0.50)",
      bgTint: "rgba(249, 115, 22, 0.17)",
    };
  }
  if (clamped >= 0.35) {
    return {
      tier: "WARM",
      color: "#f59e0b", // Warm Amber
      glow: "rgba(245, 158, 11, 0.42)",
      bgTint: "rgba(245, 158, 11, 0.15)",
    };
  }
  if (clamped >= 0.16) {
    return {
      tier: "NOMINAL",
      color: "#10b981", // Nominal Emerald
      glow: "rgba(16, 185, 129, 0.35)",
      bgTint: "rgba(16, 185, 129, 0.12)",
    };
  }
  return {
    tier: "COOL",
    color: "#38bdf8", // Cool Cyan
    glow: "rgba(56, 189, 248, 0.28)",
    bgTint: "rgba(56, 189, 248, 0.10)",
  };
}

export function analyzeCircuitPowerAndHeat(params: {
  nodes: CircuitNode[];
  wires: CircuitWire[];
  liveVals: Record<number, number[]>;
  waveformHistory: { step: number; signals: Record<string, number> }[];
  clockHz: number;
  autoClock: boolean;
  familyId: LogicFamilyId;
  clockScaleMHzPerHz: number; // e.g., 10 means 2 Hz UI clock = 20 MHz hardware clock
  ambientTempC?: number;
  subCircuitGateCounts?: Map<string, number>;
}): CircuitPowerSummary {
  const {
    nodes,
    wires,
    liveVals,
    waveformHistory,
    clockHz,
    autoClock,
    familyId,
    clockScaleMHzPerHz,
    ambientTempC = 27.0,
    subCircuitGateCounts,
  } = params;

  const family = LOGIC_FAMILY_SPECS[familyId] || LOGIC_FAMILY_SPECS["74HC_5V"];
  const effectiveClockMHz = Math.max(
    0.5,
    Number((clockHz * clockScaleMHzPerHz * (autoClock ? 1.25 : 1.0)).toFixed(2))
  );

  const nodeMap = new Map<number, CircuitNode>();
  for (const n of nodes) {
    nodeMap.set(n.id, n);
  }

  // 1. Identify clock source nodes and sequential clock wires
  const clockSourceNodeIds = new Set<number>();
  const sequentialClockWireIds = new Set<number>();
  const labelClockNodeIds = new Set<number>();

  for (const n of nodes) {
    if (n.type === "INPUT") {
      const lbl = (n.label || "").toUpperCase();
      if (
        lbl.includes("CLK") ||
        lbl.includes("CLOCK") ||
        lbl === "CP" ||
        lbl === "OSC"
      ) {
        labelClockNodeIds.add(n.id);
        clockSourceNodeIds.add(n.id);
      }
    }
    const spec = COMP_SPECS[n.type];
    if (spec?.seq && spec.clockPorts) {
      for (const cp of spec.clockPorts) {
        const w = wires.find(
          (wire) => wire.to.node === n.id && wire.to.port === cp
        );
        if (w) {
          sequentialClockWireIds.add(w.id);
          clockSourceNodeIds.add(w.from.node);
        }
      }
    }
  }

  // Fallback: just like pulseClockInputs in CircuitLab, if no explicit sequential clock port exists,
  // the first INPUT node (or any INPUT driving >=2 gates) acts as the primary clock/stimulus line
  const inputNodes = nodes.filter((n) => n.type === "INPUT");
  if (clockSourceNodeIds.size === 0 && inputNodes.length > 0) {
    clockSourceNodeIds.add(inputNodes[0].id);
  }

  // Propagate clock tree downstream one level through buffers/inverters/gates if directly fed by clock
  const downstreamClockWireIds = new Set<number>();
  for (const w of wires) {
    if (clockSourceNodeIds.has(w.from.node)) {
      downstreamClockWireIds.add(w.id);
    }
  }

  // 2. Compute empirical toggle activity factor alpha in [0..1] from waveformHistory for each signal key
  const signalActivityMap = new Map<string, number>();
  if (waveformHistory.length >= 2) {
    const sampleCount = waveformHistory.length;
    const allKeys = new Set<string>();
    for (const snap of waveformHistory) {
      for (const k of Object.keys(snap.signals)) {
        allKeys.add(k);
      }
    }
    for (const key of allKeys) {
      let transitions = 0;
      for (let i = 1; i < sampleCount; i++) {
        const prev = waveformHistory[i - 1].signals[key] ?? 0;
        const curr = waveformHistory[i].signals[key] ?? 0;
        if (prev !== curr) transitions++;
      }
      const empiricalAlpha = transitions / Math.max(1, sampleCount - 1);
      signalActivityMap.set(key, Math.min(1, empiricalAlpha));
    }
  }

  // 3. Build Wire Heat Signatures
  const wireSignatures = new Map<number, WireHeatSignature>();
  const wireSignaturesList: WireHeatSignature[] = [];
  let totalWireMw = 0;
  let activeClockLineCount = 0;

  for (const w of wires) {
    const fromNode = nodeMap.get(w.from.node);
    const toNode = nodeMap.get(w.to.node);
    const sigKey = `node:${w.from.node}:${w.from.port}`;
    const histAlpha = signalActivityMap.get(sigKey) ?? 0;
    const isSeqClkPin = sequentialClockWireIds.has(w.id);
    const isClkLabel = labelClockNodeIds.has(w.from.node);
    const isPrimaryOsc = clockSourceNodeIds.has(w.from.node);
    const isHighToggle = histAlpha >= 0.32;

    let clockLineReason: WireHeatSignature["clockLineReason"] = "DATA_NET";
    if (isSeqClkPin) clockLineReason = "SEQ_CLK_PIN";
    else if (isClkLabel) clockLineReason = "CLK_LABEL";
    else if (isPrimaryOsc) clockLineReason = "PRIMARY_OSC";
    else if (isHighToggle) clockLineReason = "HIGH_TOGGLE";

    const isClockLine = clockLineReason !== "DATA_NET";
    if (isClockLine) activeClockLineCount++;

    // Activity factor: clock nets toggle every cycle (alpha ~ 0.85 - 1.0), data nets scale by history or logic type
    const baseAlpha = isSeqClkPin || isClkLabel
      ? 0.96
      : isPrimaryOsc
      ? 0.82
      : Math.max(histAlpha, (liveVals[w.from.node]?.[w.from.port] ?? 0) === 1 ? 0.24 : 0.12);

    const activityFactor = Math.min(
      1.0,
      Number((baseAlpha * (autoClock ? 1.12 : 1.0)).toFixed(2))
    );

    const dx = (toNode?.x ?? 200) - (fromNode?.x ?? 100);
    const dy = (toNode?.y ?? 200) - (fromNode?.y ?? 100);
    const wireLengthPx = Math.max(60, Math.round(Math.hypot(dx, dy)));
    const wireCapPf = Number(
      (
        (wireLengthPx / 100) * family.cWirePer100PxPf +
        family.cPinPf * (isSeqClkPin ? 1.5 : 1.0)
      ).toFixed(2)
    );

    const netFreqMHz = Number((effectiveClockMHz * activityFactor).toFixed(2));

    // P_wire = 0.5 * C * Vdd^2 * f (with C in pF and f in MHz => 1e-12 * 1e6 = 1e-6 W = 1e-3 mW; scaled for bus/clock buffer drive)
    const rawCapMw =
      0.0018 * wireCapPf * family.vdd * family.vdd * netFreqMHz * (isClockLine ? 1.65 : 1.0);
    const wirePowerMw = Number(Math.max(0.02, rawCapMw).toFixed(3));
    totalWireMw += wirePowerMw;

    // Heat intensity for wire: clock lines at higher clockHz glow intensely
    const freqFactor = Math.min(1, effectiveClockMHz / (12 * clockScaleMHzPerHz));
    const rawHeat = isClockLine
      ? Math.min(1, 0.52 + 0.35 * freqFactor + 0.15 * activityFactor)
      : Math.min(0.65, 0.12 + 0.45 * activityFactor * freqFactor);

    const tempRiseC = Number((wirePowerMw * family.thetaJaCPerMw * 2.1 + (isClockLine ? 8.5 * freqFactor : 1.2)).toFixed(1));
    const wireTempC = Number((ambientTempC + tempRiseC).toFixed(1));
    const thermal = getThermalColor(rawHeat);

    const fromName =
      fromNode?.label || COMP_SPECS[fromNode?.type || ""]?.label || fromNode?.type || `N${w.from.node}`;
    const toName =
      toNode?.label || COMP_SPECS[toNode?.type || ""]?.label || toNode?.type || `N${w.to.node}`;

    const sig: WireHeatSignature = {
      wireId: w.id,
      fromNodeId: w.from.node,
      fromPort: w.from.port,
      toNodeId: w.to.node,
      toPort: w.to.port,
      netLabel: `${fromName} → ${toName}`,
      isClockLine,
      clockLineReason,
      activityFactor,
      effectiveFreqMHz: netFreqMHz,
      wireLengthPx,
      wireCapPf,
      wirePowerMw,
      tempRiseC,
      wireTempC,
      heatIntensity: Number(rawHeat.toFixed(2)),
      thermalTier: thermal.tier,
      heatColor: thermal.color,
      glowColor: thermal.glow,
    };

    wireSignatures.set(w.id, sig);
    wireSignaturesList.push(sig);
  }

  // 4. Compute Per-Node Power Consumption & Junction Temperature
  const nodeMetrics = new Map<number, NodePowerMetrics>();
  const nodeMetricsList: NodePowerMetrics[] = [];
  let totalStaticMw = 0;
  let totalDynamicMw = 0;
  let peakJunctionTempC = ambientTempC;
  let hotspotNode: NodePowerMetrics | null = null;

  for (const n of nodes) {
    const outWires = wires.filter((w) => w.from.node === n.id);
    const inWires = wires.filter((w) => w.to.node === n.id);
    const fanOutCount = outWires.length;

    let category: NodePowerMetrics["category"] = "gate";
    if (n.type === "INPUT" || n.type === "OUTPUT") category = "io";
    else if ( n.type.startsWith("SUBCKT_")) category = "subckt";
    else if (COMP_SPECS[n.type]?.seq) category = "seq";
    else if (COMP_SPECS[n.type]) category = "msi";

    const subCktGates = subCircuitGateCounts?.get(n.type);
    const gateEquivalents =
      subCktGates ?? GATE_EQUIVALENT_MAP[n.type] ?? (COMP_SPECS[n.type] ? 8.0 : 1.0);

    // Output state (for static bias asymmetry like 74LS TTL or 7SEG display segments)
    const outArr = liveVals[n.id] || [0];
    const highCount = outArr.filter((v) => v === 1).length;
    const lowCount = Math.max(1, outArr.length) - highCount;
    const highRatio = highCount / Math.max(1, outArr.length);

    let staticPowerMw =
      gateEquivalents *
      (highRatio * family.staticHighMw + (1 - highRatio) * family.staticLowMw);

    // Special handling for 7-Segment LED Display static current when segments are ON
    if (n.type === "7SEG") {
      let litSegments = 0;
      for (let p = 0; p < 7; p++) {
        const w = inWires.find((wire) => wire.to.port === p);
        const bit = w ? liveVals[w.from.node]?.[w.from.port] ?? 0 : 0;
        if (bit === 1) litSegments++;
      }
      staticPowerMw += litSegments * 4.2; // 4.2 mW per illuminated LED bar
    }

    // Activity factor from output + input wire switching
    const outSigKey = `node:${n.id}:0`;
    const selfHistAlpha = signalActivityMap.get(outSigKey) ?? 0;
    const inClockDriven = inWires.some((w) => wireSignatures.get(w.id)?.isClockLine);
    const isClockDriver = clockSourceNodeIds.has(n.id);
    const isClockedSequential = Boolean(COMP_SPECS[n.type]?.seq && inClockDriven);

    let nodeAlpha = Math.max(
      selfHistAlpha,
      inClockDriven ? 0.68 : 0.22,
      isClockDriver ? 0.92 : 0.18
    );
    if (n.type === "XOR" || n.type === "XNOR" || n.type === "7483") {
      // Parity / Adder trees have higher glitch & transition density
      nodeAlpha = Math.min(1.0, nodeAlpha * 1.25);
    }
    if (outArr[0] === 1) {
      nodeAlpha = Math.min(1.0, nodeAlpha + 0.08);
    }

    const loadCapacitancePf = Number(
      (
        gateEquivalents * family.cGatePf +
        fanOutCount * family.cPinPf +
        outWires.reduce((acc, w) => acc + (wireSignatures.get(w.id)?.wireCapPf ?? 4), 0) * 0.45
      ).toFixed(1)
    );

    const nodeFreqMHz = Number((effectiveClockMHz * nodeAlpha).toFixed(2));

    // Dynamic switching power P_dyn = alpha * C_load * V_DD^2 * f * shortCircuitFactor
    const dynamicPowerMw = Number(
      (
        0.0014 *
        loadCapacitancePf *
        family.vdd *
        family.vdd *
        nodeFreqMHz *
        family.shortCircuitFactor
      ).toFixed(3)
    );

    staticPowerMw = Number(staticPowerMw.toFixed(3));
    const totalPowerMw = Number((staticPowerMw + dynamicPowerMw).toFixed(3));

    const junctionTempC = Number(
      (ambientTempC + totalPowerMw * family.thetaJaCPerMw).toFixed(1)
    );

    // Normalize heat intensity across typical gate dissipation range (0.2 mW .. 12 mW)
    const normalizedPower = Math.min(1, totalPowerMw / 8.5);
    const heatIntensity = Number(
      Math.min(
        1,
        Math.max(
          0.08,
          normalizedPower * 0.78 + (isClockDriver || isClockedSequential ? 0.22 : 0)
        )
      ).toFixed(2)
    );

    const thermal = getThermalColor(heatIntensity);
    const displayLabel =
      n.label ||
      COMP_SPECS[n.type]?.label ||
      (n.type === "INPUT" || n.type === "OUTPUT" ? `${n.type}#${n.id}` : `${n.type} #${n.id}`);

    const metric: NodePowerMetrics = {
      nodeId: n.id,
      type: n.type,
      label: displayLabel,
      category,
      gateEquivalents,
      fanOutCount,
      loadCapacitancePf,
      activityFactor: Number(nodeAlpha.toFixed(2)),
      effectiveFreqMHz: nodeFreqMHz,
      staticPowerMw,
      dynamicPowerMw,
      totalPowerMw,
      junctionTempC,
      heatIntensity,
      thermalTier: thermal.tier,
      heatColor: thermal.color,
      isClockDriver,
      isClockedSequential,
    };

    nodeMetrics.set(n.id, metric);
    nodeMetricsList.push(metric);
    totalStaticMw += staticPowerMw;
    totalDynamicMw += dynamicPowerMw;

    if (junctionTempC >= peakJunctionTempC) {
      peakJunctionTempC = junctionTempC;
      hotspotNode = metric;
    }
  }

  // Sort list descending by totalPowerMw for telemetry table
  nodeMetricsList.sort((a, b) => b.totalPowerMw - a.totalPowerMw);

  const totalCircuitPowerMw = Number(
    (totalStaticMw + totalDynamicMw + totalWireMw).toFixed(2)
  );

  return {
    family,
    effectiveClockMHz,
    ambientTempC,
    totalStaticMw: Number(totalStaticMw.toFixed(2)),
    totalDynamicMw: Number(totalDynamicMw.toFixed(2)),
    totalWireMw: Number(totalWireMw.toFixed(2)),
    totalCircuitPowerMw,
    peakJunctionTempC: Number(peakJunctionTempC.toFixed(1)),
    hotspotNode,
    activeClockLineCount,
    nodeMetrics,
    nodeMetricsList,
    wireSignatures,
    wireSignaturesList,
  };
}
