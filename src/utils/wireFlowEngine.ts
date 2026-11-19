import type { CircuitNode, CircuitWire } from "../components/CircuitLab";
import { isAnalogOrPassiveType, type CircuitLabSolverResult } from "./circuitLabAnalogSolver";
import type { CircuitDiagnosticReport } from "./openCircuitDetector";
import type { ProbedWireSignal } from "../components/WireProbePopupWindow";
import { COMP_SPECS, GATE_SPECS } from "../data/logicSpecs";

export type SpiceWireSignalState =
  | "PAUSED"
  | "HALTED"
  | "SHORT_CIRCUIT"
  | "FLOATING"
  | "HIGH_Z"
  | "AC_OSCILLATING"
  | "CLOCK_PULSE"
  | "DC_ACTIVE"
  | "LOGIC_HIGH"
  | "LOGIC_LOW";

export type WireFlowDirection = "forward" | "reverse";

export interface WireFlowTelemetry {
  wireId: number;
  signalState: SpiceWireSignalState;
  stateLabel: string;
  isAnimated: boolean;
  direction: WireFlowDirection;
  frequencyHz: number;
  currentMa: number;
  voltageV: number;
  dashDurationSec: number;
  beadDurationSec: number;
  velocityPxPerSec: number;
  relativeSpeed: number;
  strokeColor: string;
  glowColor: string;
  strokeOpacity: number;
  strokeWidth: number;
  showBead: boolean;
}

export interface ComputeWireFlowOptions {
  nodes: CircuitNode[];
  wires: CircuitWire[];
  analogSolution: CircuitLabSolverResult;
  liveVals: Record<number, number[]>;
  diagnosticReport: CircuitDiagnosticReport;
  probedSignals?: ProbedWireSignal[];
  waveformHistory?: Array<{ step: number; signals: Record<string, number> }>;
  isSimRunning: boolean;
  isSimulationHalted: boolean;
  autoClock: boolean;
  clockHz: number;
  measuredPulseHz: number;
  simSpeed: number;
  sigGen?: {
    enabled: boolean;
    nodeId: number | null;
    waveform: "SINE" | "SQUARE" | "TRIANGLE" | "CLOCK";
    freqHz: number;
  };
}

// Period of CSS keyframes wireFlow / wireFlowReverse (stroke-dashoffset: ±28)
const WIRE_DASH_PATTERN_PX = 28;
const BASE_REFERENCE_PX_PER_SEC = WIRE_DASH_PATTERN_PX / 0.85; // ~32.94 px/s (1.0x reference)

const PASSIVE_REACTIVE_TYPES = new Set([
  "RES",
  "RESISTOR",
  "POT",
  "CAP_NP",
  "CAPACITOR",
  "CAP_POL",
  "IND",
  "INDUCTOR",
  "TRANSFORMER",
  "DIODE_1N4007",
  "SCHOTTKY",
  "ZENER",
  "ZENER_BZX84",
  "PHOTODIODE",
  "BRIDGE_RECT",
  "LED_RED",
  "LED_GREEN",
  "LED_BLUE",
  "AMMETER",
  "FUSE",
  "BUZZER",
  "XTAL",
  "VOLTMETER",
  "DMM_PROBE",
]);

const SOURCE_POS_OUT_TYPES = new Set([
  "VCC",
  "VCC_5V",
  "VCC_12V",
  "DC_VOLTAGE",
  "DC_VOLTAGE_SOURCE",
  "BATTERY",
  "AC_SINE",
  "AC_VOLTAGE_SOURCE",
  "TRANSFORMER",
  "INPUT",
  "CLOCK",
  "TIMER_555",
  "XTAL",
]);

/**
 * Formats SPICE frequency cleanly for wire telemetry readouts.
 */
export function formatSpiceFreq(freqHz: number): string {
  if (!Number.isFinite(freqHz) || freqHz <= 0) return "0 Hz";
  if (freqHz >= 1_000_000) return `${(freqHz / 1_000_000).toFixed(2)} MHz`;
  if (freqHz >= 1_000) return `${(freqHz / 1_000).toFixed(2)} kHz`;
  if (freqHz >= 10) return `${freqHz.toFixed(1)} Hz`;
  return `${freqHz.toFixed(2)} Hz`;
}

/**
 * Maps a periodic SPICE frequency (Hz) + current boost + simulation speed multiplier
 * into a smooth, anti-aliased CSS cycle duration (seconds per 28px dash cycle).
 * Monotonically decreases duration (increases velocity) as frequency increases.
 */
export function computeFrequencyCycleDurationSec(
  freqHz: number,
  simSpeed: number,
  currentMa = 0
): number {
  const spd = Math.max(0.1, Math.min(8, simSpeed || 1));
  const safeHz = Math.max(0.1, freqHz || 0.1);

  // Smooth piecewise curve:
  // - Low frequencies (0.1 Hz .. 2 Hz): direct tactile responsiveness
  // - Mid frequencies (2 Hz .. 25 Hz): power-law acceleration
  // - High frequencies (25 Hz .. 1 MHz): logarithmic boost so high-kHz signals stay legible without strobing
  let baseDur: number;
  if (safeHz <= 2) {
    baseDur = 1.65 / Math.pow(safeHz / 0.5, 0.48);
  } else if (safeHz <= 25) {
    const at2Hz = 1.65 / Math.pow(2 / 0.5, 0.48); // ~0.85s
    baseDur = at2Hz / Math.pow(safeHz / 2, 0.34);
  } else {
    const at25Hz = (1.65 / Math.pow(4, 0.48)) / Math.pow(12.5, 0.34); // ~0.36s
    const logBoost = 1 + Math.log10(safeHz / 25) * 0.24;
    baseDur = at25Hz / logBoost;
  }

  // Slight speed boost when higher analog branch current accompanies the oscillation
  const currentBoost =
    currentMa > 1 ? 1 + Math.min(0.22, Math.log10(1 + currentMa) * 0.08) : 1;

  const rawDur = baseDur / (spd * currentBoost);
  return Math.max(0.13, Math.min(3.2, Math.round(rawDur * 100) / 100));
}

/**
 * Maps steady-state SPICE DC branch current (mA) into a physical charge-drift duration.
 */
export function computeCurrentCycleDurationSec(
  currentMa: number,
  simSpeed: number
): number {
  const spd = Math.max(0.1, Math.min(8, simSpeed || 1));
  const absMa = Math.max(0.01, Math.abs(currentMa));

  // Log-scaled mapping across microamp -> amp range:
  // 0.05 mA -> ~2.1s, 1 mA -> ~1.35s, 10 mA -> ~0.90s, 50 mA -> ~0.62s, 250+ mA -> ~0.38s
  const norm = Math.log10(1 + absMa * 4);
  const baseDur = 2.05 / (1 + norm * 1.15);
  const rawDur = baseDur / spd;
  return Math.max(0.18, Math.min(3.4, Math.round(rawDur * 100) / 100));
}

/**
 * Resolves conventional current flow bias at a component terminal using SPICE MNA potentials.
 * Returns:
 *  +1 if conventional current flows OUT of this pin into the connected wire
 *  -1 if conventional current flows FROM the connected wire INTO this pin
 *   0 if undetermined / neutral
 */
function getPinOutwardFlowBias(
  node: CircuitNode | undefined,
  port: number,
  dir: "in" | "out",
  analogSolution: CircuitLabSolverResult,
  liveVals: Record<number, number[]>
): number {
  if (!node) return 0;

  if (node.type === "GND") return -0.5;
  if (node.type === "VOLTMETER" || node.type === "DMM_PROBE" || node.type === "OHMMETER") {
    return port === 0 ? -0.5 : 0.5;
  }

  if (
    node.type === "AC_SINE" ||
    node.type === "AC_VOLTAGE_SOURCE" ||
    node.type === "BATTERY" ||
    node.type === "DC_VOLTAGE" ||
    node.type === "DC_VOLTAGE_SOURCE"
  ) {
    // Port 0 = Phase / Positive (+), Port 1 = Neutral / Negative (-)
    const v0 = analogSolution.getPinVoltage(node.id, 0, "out");
    const v1 = analogSolution.getPinVoltage(node.id, 1, "out");
    if (port === 0) return v0 >= v1 ? 1 : -1;
    if (port === 1) return v0 >= v1 ? -1 : 1;
    return 0;
  }

  if (node.type === "VCC" || node.type === "VCC_5V" || node.type === "VCC_12V") {
    return 1;
  }

  if (node.type === "INPUT" || node.type === "CLOCK" || node.type === "TIMER_555") {
    if (dir === "out") {
      const val = liveVals[node.id]?.[port] ?? node.value ?? 0;
      const vPin = analogSolution.getPinVoltage(node.id, port, "out");
      if (val === 1 || vPin > 0.5) return 1;
      return -1;
    }
    return -1;
  }

  // Two-terminal passive / semiconductor components: compare this terminal's potential to the opposite terminal
  const oppositeDir: "in" | "out" = dir === "in" ? "out" : "in";
  const vHere = analogSolution.getPinVoltage(node.id, port, dir);
  let vOpposite = analogSolution.getPinVoltage(node.id, 0, oppositeDir);

  if (node.type === "ZENER" && dir === "in") {
    vOpposite = analogSolution.getPinVoltage(node.id, port === 0 ? 1 : 0, "in");
  }

  const diff = vOpposite - vHere;
  if (Math.abs(diff) > 1e-3) {
    // If opposite terminal is higher voltage, current flows through component OUT of this terminal into wire
    return diff > 0 ? 1 : -1;
  }

  const telem = analogSolution.compTelemetry.get(node.id);
  if (telem && telem.isConducting && telem.vDrop > 1e-3) {
    const signed = telem.vTerm0 - telem.vTerm1;
    if (Math.abs(signed) > 1e-3) {
      return dir === "out" ? (signed >= 0 ? 1 : -1) : signed >= 0 ? -1 : 1;
    }
  }

  // Logic gate / IC fallback: outputs push signal outward, inputs receive inward
  if (COMP_SPECS[node.type]) {
    return dir === "out" ? 1 : -1;
  }

  return 0;
}

/**
 * Computes SPICE-driven dynamic wire-flow animation metrics for every wire in the Circuit Designer.
 */
export function computeCircuitWireFlows(
  opts: ComputeWireFlowOptions
): Map<number, WireFlowTelemetry> {
  const {
    nodes,
    wires,
    analogSolution,
    liveVals,
    diagnosticReport,
    probedSignals = [],
    waveformHistory = [],
    isSimRunning,
    isSimulationHalted,
    autoClock,
    clockHz,
    measuredPulseHz,
    simSpeed,
    sigGen,
  } = opts;

  const result = new Map<number, WireFlowTelemetry>();
  if (wires.length === 0) return result;

  const nodeById = new Map<number, CircuitNode>();
  for (const n of nodes) nodeById.set(n.id, n);

  const probeByWireId = new Map<number, ProbedWireSignal>();
  for (const ps of probedSignals) {
    if (!probeByWireId.has(ps.wireId)) probeByWireId.set(ps.wireId, ps);
  }

  // Compute observed logic switching toggle ratios per wire from captured waveform history
  const toggleRatioByWire = new Map<number, number>();
  if (waveformHistory.length >= 2) {
    const windowSteps = waveformHistory.slice(-24);
    const transitionsDenom = Math.max(1, windowSteps.length - 1);
    for (const w of wires) {
      const key = `w_${w.id}`;
      let flips = 0;
      for (let i = 1; i < windowSteps.length; i++) {
        const prev = windowSteps[i - 1]?.signals?.[key];
        const curr = windowSteps[i]?.signals?.[key];
        if (prev !== undefined && curr !== undefined && prev !== curr) {
          flips++;
        }
      }
      if (flips > 0) {
        toggleRatioByWire.set(w.id, flips / transitionsDenom);
      }
    }
  }

  // Build adjacency & propagate active SPICE periodic frequencies (AC / Clock / 555 / XTAL) across closed nets
  interface PropagatedFreq {
    freqHz: number;
    domain: "AC" | "CLOCK";
  }
  const nodeFreqMap = new Map<number, PropagatedFreq>();
  const wireAdjacency = new Map<number, Array<{ neighborId: number; wire: CircuitWire }>>();
  for (const w of wires) {
    if (!wireAdjacency.has(w.from.node)) wireAdjacency.set(w.from.node, []);
    if (!wireAdjacency.has(w.to.node)) wireAdjacency.set(w.to.node, []);
    wireAdjacency.get(w.from.node)!.push({ neighborId: w.to.node, wire: w });
    wireAdjacency.get(w.to.node)!.push({ neighborId: w.from.node, wire: w });
  }

  let hasClosedAcReturn = false;
  const queue: number[] = [];
  const seedNodeFreq = (nodeId: number, freqHz: number, domain: "AC" | "CLOCK") => {
    if (!Number.isFinite(freqHz) || freqHz <= 0) return;
    const prev = nodeFreqMap.get(nodeId);
    if (!prev || (domain === "AC" && prev.domain !== "AC") || freqHz > prev.freqHz) {
      nodeFreqMap.set(nodeId, { freqHz, domain });
      queue.push(nodeId);
    }
  };

  if (isSimRunning && !isSimulationHalted) {
    for (const n of nodes) {
      const isAttachedSigGen = Boolean(sigGen?.enabled && sigGen.nodeId === n.id);
      if (isAttachedSigGen && sigGen && sigGen.freqHz > 0) {
        const dom =
          sigGen.waveform === "SINE" || sigGen.waveform === "TRIANGLE" ? "AC" : "CLOCK";
        seedNodeFreq(n.id, sigGen.freqHz, dom);
        continue;
      }

      if (
        n.type === "AC_SINE" ||
        n.type === "AC_VOLTAGE_SOURCE" ||
        n.type === "TRANSFORMER"
      ) {
        const f = n.analogParams?.frequencyHz ?? (sigGen?.enabled ? sigGen.freqHz : 50);
        seedNodeFreq(n.id, Math.max(0.25, f), "AC");
      } else if (n.type === "TIMER_555") {
        const f =
          n.analogParams?.frequencyHz && n.analogParams.frequencyHz > 0
            ? n.analogParams.frequencyHz
            : autoClock
            ? Math.max(0.5, clockHz)
            : 1.5;
        seedNodeFreq(n.id, f, "CLOCK");
      } else if (n.type === "XTAL") {
        seedNodeFreq(n.id, n.analogParams?.frequencyHz ?? 16_000_000, "CLOCK");
      } else if (n.type === "CLOCK") {
        const activeClkHz = n.clockHz || clockHz || measuredPulseHz;
        if (autoClock || measuredPulseHz > 0 || (sigGen?.enabled ?? false)) {
          seedNodeFreq(n.id, Math.max(0.2, activeClkHz), "CLOCK");
        }
      }
    }

    // Propagate AC and Clock frequency across closed conductive & active logic components
    while (queue.length > 0) {
      const currId = queue.shift()!;
      const currInfo = nodeFreqMap.get(currId);
      if (!currInfo) continue;

      const links = wireAdjacency.get(currId) || [];
      for (const { neighborId } of links) {
        const nbr = nodeById.get(neighborId);
        if (!nbr) continue;
        // Stop frequency propagation across open mechanical switches or high-Z voltmeters
        if ((nbr.type === "SWITCH_SPST" || nbr.type === "PUSHBUTTON") && (nbr.value ?? 1) < 1) {
          continue;
        }
        if (nbr.type === "VOLTMETER" || nbr.type === "DMM_PROBE" || nbr.type === "OHMMETER") {
          continue;
        }
        if (
          nbr.type === "BATTERY" ||
          nbr.type === "DC_VOLTAGE" ||
          nbr.type === "DC_VOLTAGE_SOURCE" ||
          nbr.type === "VCC" ||
          nbr.type === "VCC_5V" ||
          nbr.type === "VCC_12V"
        ) {
          continue;
        }

        // In AC domain, passive linear elements (R, L, C, transformers, closed switches, diodes) propagate AC frequency even when series capacitors block DC
        const nbrTelem = analogSolution.compTelemetry.get(nbr.id);
        const isReactiveOrActiveAc =
          currInfo.domain === "AC" &&
          (PASSIVE_REACTIVE_TYPES.has(nbr.type) ||
            nbr.type === "SWITCH_SPST" ||
            nbr.type === "PUSHBUTTON");

        if (
          currInfo.domain === "AC" &&
          !isReactiveOrActiveAc &&
          !PASSIVE_REACTIVE_TYPES.has(nbr.type) &&
          nbr.type !== "GND" &&
          nbr.type !== "OUTPUT"
        ) {
          continue;
        }

        if (
          nbr.type !== "GND" &&
          nbrTelem &&
          !nbrTelem.isConducting &&
          !isReactiveOrActiveAc &&
          PASSIVE_REACTIVE_TYPES.has(nbr.type)
        ) {
          continue;
        }

        // Sequential stages divide clock rate downstream (flip-flop / counter divide-by-2 nominal)
        const isSeqStage = Boolean(COMP_SPECS[nbr.type]?.seq) && nbr.type !== "TIMER_555";
        const nextFreq = isSeqStage ? Math.max(0.1, currInfo.freqHz * 0.5) : currInfo.freqHz;

        // Do not propagate past GND node to unrelated branches
        if (nbr.type === "GND") {
          if (currInfo.domain === "AC") {
            hasClosedAcReturn = true;
          }
          if (!nodeFreqMap.has(nbr.id)) {
            nodeFreqMap.set(nbr.id, { freqHz: nextFreq, domain: currInfo.domain });
          }
          continue;
        }
        // AC return back directly to AC source neutral (or bridged AC component)
        if (
          currInfo.domain === "AC" &&
          (nbr.type === "AC_SINE" || nbr.type === "AC_VOLTAGE_SOURCE") &&
          nbr.id !== currId
        ) {
          hasClosedAcReturn = true;
        }

        if (!nodeFreqMap.has(nbr.id)) {
          nodeFreqMap.set(nbr.id, { freqHz: nextFreq, domain: currInfo.domain });
          queue.push(nbr.id);
        }
      }
    }
  }

  for (const w of wires) {
    const fromDir = w.from.dir || "out";
    const toDir = w.to.dir || "in";
    const fromNode = nodeById.get(w.from.node);
    const toNode = nodeById.get(w.to.node);

    const fromVal = liveVals[w.from.node]?.[w.from.port] ?? 0;
    const isLogicHigh = fromVal === 1;
    const isHaltedWire = fromVal === -1 || isSimulationHalted;

    const isShortCircuitWire = diagnosticReport.shortCircuitWireIds.has(w.id);
    const isFloatingNodeWire = diagnosticReport.floatingNodeWireIds.has(w.id);

    const isVoltProbe =
      toNode?.type === "VOLTMETER" ||
      fromNode?.type === "VOLTMETER" ||
      toNode?.type === "DMM_PROBE" ||
      fromNode?.type === "DMM_PROBE";

    const isGndWire =
      fromNode?.type === "GND" ||
      toNode?.type === "GND" ||
      (fromNode?.type === "AC_SINE" && w.from.port === 1) ||
      (toNode?.type === "AC_SINE" && w.to.port === 1);

    const isAcPhaseWire =
      (fromNode?.type === "AC_SINE" && w.from.port === 0) ||
      (toNode?.type === "AC_SINE" && w.to.port === 0) ||
      (fromNode?.type === "AC_VOLTAGE_SOURCE" && w.from.port === 0) ||
      (toNode?.type === "AC_VOLTAGE_SOURCE" && w.to.port === 0);

    const fromTelem = fromNode ? analogSolution.compTelemetry.get(fromNode.id) : undefined;
    const toTelem = toNode ? analogSolution.compTelemetry.get(toNode.id) : undefined;

    // Determine real MNA branch current associated with this wire
    const nonSourceCurrent = (node: CircuitNode | undefined, telem: typeof fromTelem) => {
      if (!node || !telem) return 0;
      if (node.type === "GND" || node.type === "VOLTMETER" || node.type === "DMM_PROBE") return 0;
      return telem.current_mA ?? 0;
    };

    let wireCurrentMa = Math.max(
      nonSourceCurrent(fromNode, fromTelem),
      nonSourceCurrent(toNode, toTelem)
    );
    if (wireCurrentMa <= 0.01 && isGndWire && analogSolution.hasClosedLoop) {
      wireCurrentMa = analogSolution.loopCurrentMa || 0;
    }

    const vFrom = analogSolution.getPinVoltage(w.from.node, w.from.port, fromDir);
    const vTo = analogSolution.getPinVoltage(w.to.node, w.to.port, toDir);
    const wireVoltageV = Math.abs(vFrom) >= Math.abs(vTo) ? vFrom : vTo;

    const probedSig = probeByWireId.get(w.id);
    if (probedSig?.currentMa !== undefined && probedSig.currentMa > wireCurrentMa) {
      wireCurrentMa = probedSig.currentMa;
    }

    // Determine direction from true MNA pin biases (+1 out / -1 in)
    const fromBias = getPinOutwardFlowBias(fromNode, w.from.port, fromDir, analogSolution, liveVals);
    const toBias = getPinOutwardFlowBias(toNode, w.to.port, toDir, analogSolution, liveVals);
    // Forward means charge moves from w.from -> w.to:
    // true if from pushes out (+1) or to pulls in (-1), false if reversed
    const netPolarityScore = fromBias - toBias;
    const direction: WireFlowDirection = netPolarityScore < 0 ? "reverse" : "forward";

    // Determine periodic SPICE frequency on this wire
    const explicitNodeFreq = Math.max(
      fromNode?.analogParams?.frequencyHz ?? 0,
      toNode?.analogParams?.frequencyHz ?? 0,
      fromNode?.clockHz ?? 0
    );
    const propagatedFrom = nodeFreqMap.get(w.from.node);
    const propagatedTo = nodeFreqMap.get(w.to.node);
    const propagatedInfo =
      propagatedFrom && (!propagatedTo || propagatedFrom.domain === "AC" || propagatedFrom.freqHz >= propagatedTo.freqHz)
        ? propagatedFrom
        : propagatedTo;

    const isClockPin =
      fromNode?.type === "CLOCK" ||
      fromNode?.type === "TIMER_555" ||
      fromNode?.type === "XTAL" ||
      Boolean(toNode && COMP_SPECS[toNode.type]?.clockPorts?.includes(w.to.port));

    const toggleRatio = toggleRatioByWire.get(w.id) ?? 0;
    const probeFreqHz = probedSig?.frequencyHz ?? 0;

    const isAcProbed =
      probedSig?.waveformType === "AC_SINE" ||
      probedSig?.waveformType === "HALF_RECTIFIED" ||
      probedSig?.waveformType === "FULL_RECTIFIED" ||
      probedSig?.waveformType === "FILTERED_DC";

    const isAcDomain =
      !isVoltProbe &&
      (isAcPhaseWire ||
        isAcProbed ||
        (propagatedInfo?.domain === "AC" && (analogSolution.hasClosedLoop || wireCurrentMa > 0.01 || Boolean(fromNode && PASSIVE_REACTIVE_TYPES.has(fromNode.type)) || Boolean(toNode && PASSIVE_REACTIVE_TYPES.has(toNode.type)))));

    const isClockDomain =
      !isAcDomain &&
      !isVoltProbe &&
      (isClockPin ||
        probedSig?.waveformType === "PULSE" ||
        probedSig?.waveformType === "PWM" ||
        propagatedInfo?.domain === "CLOCK" ||
        toggleRatio > 0.05);

    let effectiveFreqHz = 0;
    if (explicitNodeFreq > 0) {
      effectiveFreqHz = explicitNodeFreq;
    } else if (probeFreqHz > 0 && (isAcDomain || isClockDomain)) {
      effectiveFreqHz = probeFreqHz;
    } else if (propagatedInfo) {
      effectiveFreqHz = propagatedInfo.freqHz;
    } else if (isClockPin && (autoClock || measuredPulseHz > 0)) {
      effectiveFreqHz = Math.max(0.2, measuredPulseHz || clockHz);
    } else if (toggleRatio > 0.05) {
      effectiveFreqHz = Math.max(0.25, (autoClock ? clockHz : Math.max(1, measuredPulseHz)) * toggleRatio);
    }

    // Check if either endpoint is a passive/analog branch with explicit open/cutoff state
    const isEndpointAnalogComponent = (node: CircuitNode | undefined) =>
      Boolean(
        node &&
          isAnalogOrPassiveType(node.type) &&
          !SOURCE_POS_OUT_TYPES.has(node.type) &&
          !GATE_SPECS[node.type] &&
          node.type !== "OUTPUT" &&
          node.type !== "GND"
      );
    const isAnalogEndpoint =
      isEndpointAnalogComponent(fromNode) || isEndpointAnalogComponent(toNode);
    const isCutoffAnalog =
      isAnalogEndpoint &&
      !isLogicHigh &&
      wireCurrentMa <= 0.01 &&
      (!isAcPhaseWire || !hasClosedAcReturn) &&
      !(isGndWire && analogSolution.hasClosedLoop);

    // Resolve Signal State & Dynamic Velocity
    let signalState: SpiceWireSignalState;
    let stateLabel: string;
    let isAnimated = false;
    let dashDurationSec = 0.85;
    let strokeColor = "#86efac";
    let glowColor = "#22c55e";
    let strokeOpacity = 0.92;
    let strokeWidth = 3.6;
    let showBead = false;

    if (!isSimRunning) {
      signalState = "PAUSED";
      stateLabel = "Paused";
    } else if (isShortCircuitWire) {
      signalState = "SHORT_CIRCUIT";
      stateLabel = wireCurrentMa > 0.1 ? `Short Circuit · ${wireCurrentMa.toFixed(0)} mA` : "Short Circuit Fault";
      isAnimated = true;
      dashDurationSec = computeFrequencyCycleDurationSec(
        Math.max(12, effectiveFreqHz || 18),
        simSpeed,
        Math.max(150, wireCurrentMa)
      );
      strokeColor = "#fecaca";
      glowColor = "#ef4444";
      strokeWidth = 3.8;
      showBead = false; // Handled by short-circuit halo
    } else if (isFloatingNodeWire) {
      signalState = "FLOATING";
      stateLabel = "Floating / High-Z";
      isAnimated = false;
    } else if (isHaltedWire) {
      signalState = "HALTED";
      stateLabel = "Simulation Halted";
      isAnimated = false;
    } else if (isVoltProbe) {
      signalState = "HIGH_Z";
      stateLabel = `Probe Sense · ${wireVoltageV.toFixed(2)}V`;
      isAnimated = false;
    } else if (
      isAcDomain &&
      (analogSolution.hasClosedLoop || wireCurrentMa > 0.005 || isAcProbed || hasClosedAcReturn)
    ) {
      signalState = "AC_OSCILLATING";
      const freq = Math.max(0.25, effectiveFreqHz || 50);
      effectiveFreqHz = freq;
      stateLabel = `AC ${formatSpiceFreq(freq)}${wireCurrentMa > 0.05 ? ` · ${wireCurrentMa.toFixed(1)} mA` : ""}`;
      isAnimated = true;
      dashDurationSec = computeFrequencyCycleDurationSec(freq, simSpeed, wireCurrentMa);
      strokeColor = isGndWire ? "#94a3b8" : "#fca5a5";
      glowColor = isGndWire ? "#94a3b8" : "#ef4444";
      strokeOpacity = isGndWire ? 0.72 : 0.94;
      strokeWidth = isGndWire ? 3.0 : 3.8;
      showBead = true;
    } else if (isClockDomain && (isLogicHigh || autoClock || measuredPulseHz > 0 || fromNode?.type === "TIMER_555" || fromNode?.type === "XTAL" || wireCurrentMa > 0.01)) {
      signalState = "CLOCK_PULSE";
      const freq = Math.max(0.2, effectiveFreqHz || clockHz || 2);
      effectiveFreqHz = freq;
      const isPulseHigh = isLogicHigh || wireCurrentMa > 0.05;
      stateLabel = `${fromNode?.type === "TIMER_555" ? "NE555" : "CLK"} ${formatSpiceFreq(freq)} · ${isPulseHigh ? "HIGH" : "LOW"}`;
      isAnimated = true;
      // Active HIGH pulse runs at full SPICE frequency velocity; LOW half-cycle runs subdued/slower
      const baseDur = computeFrequencyCycleDurationSec(freq, simSpeed, wireCurrentMa);
      dashDurationSec = isPulseHigh ? baseDur : Math.min(3.4, Number((baseDur * 1.65).toFixed(2)));
      strokeColor = isPulseHigh ? "#7dd3fc" : "#38bdf8";
      glowColor = "#0ea5e9";
      strokeOpacity = isPulseHigh ? 0.95 : 0.38;
      strokeWidth = isPulseHigh ? 3.8 : 2.5;
      showBead = isPulseHigh;
    } else if (
      wireCurrentMa > 0.01 ||
      (analogSolution.hasClosedLoop && isGndWire && Math.abs(analogSolution.loopCurrentMa) > 0.01)
    ) {
      signalState = "DC_ACTIVE";
      const effMa = wireCurrentMa > 0.01 ? wireCurrentMa : analogSolution.loopCurrentMa;
      wireCurrentMa = effMa;
      stateLabel = `DC ${effMa >= 100 ? effMa.toFixed(0) : effMa.toFixed(2)} mA · ${Math.abs(wireVoltageV).toFixed(2)}V`;
      isAnimated = true;
      dashDurationSec = computeCurrentCycleDurationSec(effMa, simSpeed);
      strokeColor = isGndWire ? "#94a3b8" : "#86efac";
      glowColor = isGndWire ? "#94a3b8" : "#22c55e";
      strokeOpacity = isGndWire ? 0.72 : 0.94;
      strokeWidth = effMa >= 25 ? 4.0 : 3.5;
      showBead = true;
    } else if (isLogicHigh) {
      signalState = "LOGIC_HIGH";
      const freq = effectiveFreqHz > 0 ? effectiveFreqHz : measuredPulseHz > 0 ? measuredPulseHz : 0;
      stateLabel = freq > 0 ? `Logic HIGH · ${formatSpiceFreq(freq)}` : "Logic HIGH (5V)";
      isAnimated = true;
      dashDurationSec =
        freq > 0
          ? computeFrequencyCycleDurationSec(freq, simSpeed, 10)
          : Math.max(0.18, Math.min(3.2, Number((0.95 / Math.max(0.1, simSpeed)).toFixed(2))));
      strokeColor = "#86efac";
      glowColor = "#22c55e";
      strokeOpacity = 0.92;
      strokeWidth = 3.7;
      showBead = true;
    } else if (isCutoffAnalog) {
      signalState = "HIGH_Z";
      stateLabel =
        Math.abs(wireVoltageV) > 0.1
          ? `Open / Cutoff · ${wireVoltageV.toFixed(2)}V (0 mA)`
          : "Cutoff / Non-Conducting";
      isAnimated = false;
    } else {
      signalState = "LOGIC_LOW";
      stateLabel = "Logic LOW (0V)";
      isAnimated = false;
    }

    const beadDurationSec = Math.max(
      0.16,
      Math.min(4.2, Number((dashDurationSec * (isGndWire ? 1.45 : 1.15)).toFixed(2)))
    );
    const velocityPxPerSec = isAnimated
      ? Number((WIRE_DASH_PATTERN_PX / Math.max(0.1, dashDurationSec)).toFixed(1))
      : 0;
    const relativeSpeed = isAnimated
      ? Number((velocityPxPerSec / BASE_REFERENCE_PX_PER_SEC).toFixed(2))
      : 0;

    result.set(w.id, {
      wireId: w.id,
      signalState,
      stateLabel,
      isAnimated,
      direction,
      frequencyHz: effectiveFreqHz,
      currentMa: wireCurrentMa,
      voltageV: wireVoltageV,
      dashDurationSec,
      beadDurationSec,
      velocityPxPerSec,
      relativeSpeed,
      strokeColor,
      glowColor,
      strokeOpacity,
      strokeWidth,
      showBead,
    });
  }

  return result;
}
