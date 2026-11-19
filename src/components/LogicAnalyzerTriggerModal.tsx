import React from "react";
import {
  Sliders,
  X,
  Zap,
  Play,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  RotateCcw,
  Crosshair,
  ShieldAlert,
  Layers,
} from "lucide-react";
import type { SubscribableWireSignal } from "./LogicAnalyzerModal";

export type TriggerConditionType =
  | "NONE"
  | "POSEDGE"
  | "NEGEDGE"
  | "EITHER_EDGE"
  | "HIGH"
  | "LOW";

export type TriggerSweepMode = "AUTO" | "NORMAL" | "SINGLE";

export type ChannelTriggerConstraint =
  | "X" // Don't Care
  | "1" // Level High
  | "0" // Level Low
  | "R" // Rising Edge (0 -> 1)
  | "F" // Falling Edge (1 -> 0)
  | "E"; // Either Edge (0 <-> 1)

export interface LogicAnalyzerTriggerConfig {
  enabled: boolean;
  sweepMode: TriggerSweepMode;
  primaryCondition: TriggerConditionType;
  primaryWireId: number | "ALL" | "CLK_SYNTH";
  usePatternMatrix: boolean;
  patternLogicOp: "AND" | "OR";
  channelConstraints: Record<number, ChannelTriggerConstraint>;
  preTriggerPercent: 10 | 25 | 50 | 75 | 90;
  nthOccurrence: number; // 1 = trigger on 1st match, 2 = 2nd match, etc.
  minPulseSteps: number; // 1 = any width, 2 = >= 2 steps sustain
  holdoffSteps: number; // minimum steps between consecutive trigger hits
  autoAlignCursorT1: boolean;
  stopAutoClockOnSingleShot: boolean;
}

export const DEFAULT_LA_TRIGGER_CONFIG: LogicAnalyzerTriggerConfig = {
  enabled: true,
  sweepMode: "AUTO",
  primaryCondition: "POSEDGE",
  primaryWireId: "ALL",
  usePatternMatrix: false,
  patternLogicOp: "AND",
  channelConstraints: {},
  preTriggerPercent: 25,
  nthOccurrence: 1,
  minPulseSteps: 1,
  holdoffSteps: 0,
  autoAlignCursorT1: true,
  stopAutoClockOnSingleShot: true,
};

export interface TriggerEvaluationResult {
  hitStepIndices: number[];
  primaryTriggerStep: number | null; // The N-th occurrence step that anchored the capture
  matchedChannelLabels: Record<number, string[]>; // stepIndex -> list of channel names that triggered
  status: "DISABLED" | "ARMED_WAITING" | "TRIGGERED" | "FORCED";
}

/**
 * Evaluates all sample steps against the configured edge/level/pattern trigger rules.
 */
export function evaluateLogicAnalyzerTrigger(
  config: LogicAnalyzerTriggerConfig,
  subscribedSignals: SubscribableWireSignal[],
  masterClockSamples: (0 | 1)[],
  totalSteps: number,
  forcedStep: number | null
): TriggerEvaluationResult {
  if (!config.enabled || config.primaryCondition === "NONE") {
    return {
      hitStepIndices: [],
      primaryTriggerStep: null,
      matchedChannelLabels: {},
      status: "DISABLED",
    };
  }

  const hitStepIndices: number[] = [];
  const matchedChannelLabels: Record<number, string[]> = {};
  let lastAcceptedStep = -9999;

  const checkSingleSignalCondition = (
    samples: (0 | 1)[],
    s: number,
    cond: TriggerConditionType | ChannelTriggerConstraint
  ): boolean => {
    const curr = samples[s] ?? 0;
    const prev = s > 0 ? samples[s - 1] ?? 0 : curr;

    let baseMatch = false;
    if (cond === "POSEDGE" || cond === "R") {
      baseMatch = s > 0 && prev === 0 && curr === 1;
    } else if (cond === "NEGEDGE" || cond === "F") {
      baseMatch = s > 0 && prev === 1 && curr === 0;
    } else if (cond === "EITHER_EDGE" || cond === "E") {
      baseMatch = s > 0 && prev !== curr;
    } else if (cond === "HIGH" || cond === "1") {
      baseMatch = curr === 1;
    } else if (cond === "LOW" || cond === "0") {
      baseMatch = curr === 0;
    } else if (cond === "X") {
      return true;
    }

    if (!baseMatch) return false;

    // Check minimum sustain/pulse width if > 1 step
    if (config.minPulseSteps > 1) {
      for (let k = 1; k < config.minPulseSteps; k++) {
        if (s + k >= totalSteps) return false;
        const futureVal = samples[s + k] ?? 0;
        if (futureVal !== curr) return false;
      }
    }

    return true;
  };

  for (let s = 0; s < totalSteps; s++) {
    // Check holdoff constraint
    if (
      config.holdoffSteps > 0 &&
      s - lastAcceptedStep <= config.holdoffSteps
    ) {
      continue;
    }

    const stepReasons: string[] = [];
    let primaryMatched = false;

    // 1. Evaluate Primary Edge / Level Condition
    if (config.primaryWireId === "CLK_SYNTH") {
      if (
        checkSingleSignalCondition(
          masterClockSamples,
          s,
          config.primaryCondition
        )
      ) {
        primaryMatched = true;
        stepReasons.push(`CLK_SYNC (${config.primaryCondition})`);
      }
    } else {
      const targetSignals =
        config.primaryWireId === "ALL"
          ? subscribedSignals
          : subscribedSignals.filter((sig) => sig.wireId === config.primaryWireId);

      for (const sig of targetSignals) {
        if (
          checkSingleSignalCondition(
            sig.stepSamples,
            s,
            config.primaryCondition
          )
        ) {
          primaryMatched = true;
          stepReasons.push(`LA${sig.channelIndex}:${sig.sourceLabel}`);
        }
      }
    }

    // 2. Evaluate Multi-Channel Pattern Matrix if enabled
    let patternMatched = true;
    if (config.usePatternMatrix) {
      const activeConstraints = subscribedSignals.filter(
        (sig) =>
          config.channelConstraints[sig.wireId] &&
          config.channelConstraints[sig.wireId] !== "X"
      );

      if (activeConstraints.length > 0) {
        const results = activeConstraints.map((sig) => {
          const c = config.channelConstraints[sig.wireId];
          const ok = checkSingleSignalCondition(sig.stepSamples, s, c);
          if (ok) {
            stepReasons.push(`LA${sig.channelIndex}=${c}`);
          }
          return ok;
        });

        patternMatched =
          config.patternLogicOp === "AND"
            ? results.every(Boolean)
            : results.some(Boolean);
      }
    }

    const finalStepMatch = config.usePatternMatrix
      ? primaryMatched && patternMatched
      : primaryMatched;

    if (finalStepMatch) {
      hitStepIndices.push(s);
      matchedChannelLabels[s] = Array.from(new Set(stepReasons));
      lastAcceptedStep = s;
    }
  }

  const nthIndex = Math.max(0, (config.nthOccurrence || 1) - 1);
  const anchoredStep =
    hitStepIndices.length > nthIndex
      ? hitStepIndices[nthIndex]
      : forcedStep !== null && forcedStep >= 0 && forcedStep < totalSteps
      ? forcedStep
      : null;

  const status: TriggerEvaluationResult["status"] =
    hitStepIndices.length > nthIndex
      ? "TRIGGERED"
      : forcedStep !== null
      ? "FORCED"
      : "ARMED_WAITING";

  return {
    hitStepIndices,
    primaryTriggerStep: anchoredStep,
    matchedChannelLabels,
    status,
  };
}

interface LogicAnalyzerTriggerModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: LogicAnalyzerTriggerConfig;
  onChangeConfig: React.Dispatch<React.SetStateAction<LogicAnalyzerTriggerConfig>>;
  subscribedSignals: SubscribableWireSignal[];
  triggerEval: TriggerEvaluationResult;
  isArmed: boolean;
  onArmTrigger: () => void;
  onForceTrigger: () => void;
  onRunTriggeredBurst: () => void;
  onResetTriggerConfig: () => void;
  clockHz: number;
}

export const LogicAnalyzerTriggerModal: React.FC<
  LogicAnalyzerTriggerModalProps
> = ({
  isOpen,
  onClose,
  config,
  onChangeConfig,
  subscribedSignals,
  triggerEval,
  isArmed,
  onArmTrigger,
  onForceTrigger,
  onRunTriggeredBurst,
  onResetTriggerConfig,
  clockHz,
}) => {
  if (!isOpen) return null;

  const halfCycleMs = 1000 / (clockHz * 2);

  const setChannelConstraint = (
    wireId: number,
    constraint: ChannelTriggerConstraint
  ) => {
    onChangeConfig((prev) => ({
      ...prev,
      channelConstraints: {
        ...prev.channelConstraints,
        [wireId]: constraint,
      },
    }));
  };

  const applyPreset = (
    preset:
      | "CLK_POSEDGE"
      | "CLK_NEGEDGE"
      | "FIRST_OUTPUT_HIGH"
      | "ALL_HIGH_AND"
      | "SINGLE_SHOT_EDGE"
  ) => {
    if (preset === "CLK_POSEDGE") {
      const clkWire = subscribedSignals.find((s) => s.isClockLine);
      onChangeConfig({
        ...DEFAULT_LA_TRIGGER_CONFIG,
        enabled: true,
        sweepMode: "NORMAL",
        primaryCondition: "POSEDGE",
        primaryWireId: clkWire ? clkWire.wireId : "CLK_SYNTH",
        usePatternMatrix: false,
      });
    } else if (preset === "CLK_NEGEDGE") {
      const clkWire = subscribedSignals.find((s) => s.isClockLine);
      onChangeConfig({
        ...DEFAULT_LA_TRIGGER_CONFIG,
        enabled: true,
        sweepMode: "NORMAL",
        primaryCondition: "NEGEDGE",
        primaryWireId: clkWire ? clkWire.wireId : "CLK_SYNTH",
        usePatternMatrix: false,
      });
    } else if (preset === "FIRST_OUTPUT_HIGH") {
      const outWire =
        subscribedSignals.find((s) => s.isOutputTarget) ||
        subscribedSignals[subscribedSignals.length - 1];
      onChangeConfig({
        ...DEFAULT_LA_TRIGGER_CONFIG,
        enabled: true,
        sweepMode: "SINGLE",
        primaryCondition: "POSEDGE",
        primaryWireId: outWire ? outWire.wireId : "ALL",
        usePatternMatrix: false,
      });
    } else if (preset === "ALL_HIGH_AND") {
      const map: Record<number, ChannelTriggerConstraint> = {};
      subscribedSignals.slice(0, 6).forEach((s) => {
        map[s.wireId] = "1";
      });
      onChangeConfig({
        ...DEFAULT_LA_TRIGGER_CONFIG,
        enabled: true,
        sweepMode: "NORMAL",
        primaryCondition: "HIGH",
        primaryWireId: "ALL",
        usePatternMatrix: true,
        patternLogicOp: "AND",
        channelConstraints: map,
      });
    } else if (preset === "SINGLE_SHOT_EDGE") {
      onChangeConfig({
        ...DEFAULT_LA_TRIGGER_CONFIG,
        enabled: true,
        sweepMode: "SINGLE",
        primaryCondition: "EITHER_EDGE",
        primaryWireId: "ALL",
        usePatternMatrix: false,
      });
    }
  };

  const conditionCards: {
    id: TriggerConditionType;
    title: string;
    subtitle: string;
    diagram: string;
    badgeColor: string;
  }[] = [
    {
      id: "POSEDGE",
      title: "Rising Edge",
      subtitle: "Low to High (0 → 1)",
      diagram: "___/¯¯¯",
      badgeColor: "text-cyan-300 border-cyan-500/40 bg-cyan-500/10",
    },
    {
      id: "NEGEDGE",
      title: "Falling Edge",
      subtitle: "High to Low (1 → 0)",
      diagram: "¯¯¯\\___",
      badgeColor: "text-pink-300 border-pink-500/40 bg-pink-500/10",
    },
    {
      id: "EITHER_EDGE",
      title: "Either Edge",
      subtitle: "Any Transition (0 ↔ 1)",
      diagram: "__/¯\\__",
      badgeColor: "text-violet-300 border-violet-500/40 bg-violet-500/10",
    },
    {
      id: "HIGH",
      title: "Level HIGH",
      subtitle: "Logic State = 1 (+5V)",
      diagram: "¯¯¯¯¯¯¯",
      badgeColor: "text-emerald-300 border-emerald-500/40 bg-emerald-500/10",
    },
    {
      id: "LOW",
      title: "Level LOW",
      subtitle: "Logic State = 0 (0V)",
      diagram: "_______",
      badgeColor: "text-amber-300 border-amber-500/40 bg-amber-500/10",
    },
    {
      id: "NONE",
      title: "Trigger Off",
      subtitle: "Untriggered Free Capture",
      diagram: "-------",
      badgeColor: "text-slate-400 border-slate-700 bg-slate-800/60",
    },
  ];

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl max-h-[90vh] flex flex-col bg-[#0b1120] border border-amber-500/40 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 bg-[#0f172a] border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-400/40 flex items-center justify-center text-amber-300">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-base font-bold text-white tracking-tight">
                  Hardware Logic Analyzer Trigger Settings
                </h3>
                <span
                  className={`text-xs font-mono font-semibold px-2 py-0.5 rounded ${
                    triggerEval.status === "TRIGGERED"
                      ? "bg-emerald-500/20 text-emerald-300"
                      : triggerEval.status === "ARMED_WAITING" || isArmed
                      ? "bg-amber-500/20 text-amber-300"
                      : triggerEval.status === "FORCED"
                      ? "bg-purple-500/20 text-purple-300"
                      : "bg-slate-800 text-slate-400"
                  }`}
                >
                  {triggerEval.status === "TRIGGERED"
                    ? `TRIGGERED @ S${(triggerEval.primaryTriggerStep ?? 0) + 1}`
                    : triggerEval.status === "FORCED"
                    ? "FORCED CAPTURE"
                    : triggerEval.status === "ARMED_WAITING"
                    ? "ARMED · WAITING FOR CONDITION"
                    : "TRIGGER BYPASSED"}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Configure edge (rising/falling/either), logic level (HIGH/LOW),
                multi-channel pattern word, and capture sweep mode
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onResetTriggerConfig}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Defaults
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer"
              title="Close Trigger Settings"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Quick Hardware Trigger Presets Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-slate-900/90 border border-slate-800">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              Hardware Presets:
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => applyPreset("CLK_POSEDGE")}
                className="px-2.5 py-1 rounded-lg text-xs font-mono bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 cursor-pointer"
              >
                ↑ Clock Rising Edge
              </button>
              <button
                type="button"
                onClick={() => applyPreset("CLK_NEGEDGE")}
                className="px-2.5 py-1 rounded-lg text-xs font-mono bg-slate-800 hover:bg-slate-700 text-pink-300 border border-slate-700 cursor-pointer"
              >
                ↓ Clock Falling Edge
              </button>
              <button
                type="button"
                onClick={() => applyPreset("FIRST_OUTPUT_HIGH")}
                className="px-2.5 py-1 rounded-lg text-xs font-mono bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 cursor-pointer"
              >
                Single-Shot Output ↑
              </button>
              <button
                type="button"
                onClick={() => applyPreset("ALL_HIGH_AND")}
                className="px-2.5 py-1 rounded-lg text-xs font-mono bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 cursor-pointer"
              >
                Multi-Wire AND High
              </button>
              <button
                type="button"
                onClick={() => applyPreset("SINGLE_SHOT_EDGE")}
                className="px-2.5 py-1 rounded-lg text-xs font-mono bg-slate-800 hover:bg-slate-700 text-violet-300 border border-slate-700 cursor-pointer"
              >
                Any Edge Single-Shot
              </button>
            </div>
          </div>

          {/* Section 1: Acquisition Sweep Mode (Auto / Normal / Single-Shot) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                01. Acquisition Capture Mode
              </label>
              <span className="text-xs font-mono text-slate-400">
                Controls how the analyzer arms and commits incoming wire samples
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {(
                [
                  {
                    id: "AUTO",
                    title: "Auto (Free-Run)",
                    desc: "Continuously updates waveform buffer on every step while marking all trigger matches.",
                  },
                  {
                    id: "NORMAL",
                    title: "Normal (Triggered Only)",
                    desc: "Waits in Armed state until the exact edge/level condition fires before updating capture.",
                  },
                  {
                    id: "SINGLE",
                    title: "Single-Shot (Capture & Hold)",
                    desc: "Captures the first matching trigger event, freezes the buffer, and halts Auto-Clock.",
                  },
                ] as { id: TriggerSweepMode; title: string; desc: string }[]
              ).map((m) => {
                const active = config.sweepMode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() =>
                      onChangeConfig((prev) => ({
                        ...prev,
                        enabled: true,
                        sweepMode: m.id,
                      }))
                    }
                    className={`text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
                      active
                        ? "bg-amber-500/15 border-amber-400 text-white shadow-sm"
                        : "bg-slate-900/70 border-slate-800 text-slate-300 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">
                        {m.title}
                      </span>
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                          active
                            ? "bg-amber-400 text-slate-950 font-bold"
                            : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {m.id}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                      {m.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Primary Edge & Level Condition Selector */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                02. Edge &amp; Level Trigger Condition
              </label>

              {/* Trigger Source Channel Dropdown */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-semibold">
                  Trigger Source Channel:
                </span>
                <select
                  value={config.primaryWireId}
                  onChange={(e) => {
                    const val = e.target.value;
                    onChangeConfig((prev) => ({
                      ...prev,
                      primaryWireId:
                        val === "ALL" || val === "CLK_SYNTH"
                          ? val
                          : Number(val),
                    }));
                  }}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-amber-300 focus:outline-none focus:border-amber-400"
                >
                  <option value="ALL">Any Subscribed Wire Channel</option>
                  <option value="CLK_SYNTH">
                    Master Reference Clock (CLK_SYNC)
                  </option>
                  {subscribedSignals.map((sig) => (
                    <option key={sig.wireId} value={sig.wireId}>
                      LA{sig.channelIndex}: {sig.netName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              {conditionCards.map((card) => {
                const isSelected =
                  (config.enabled && config.primaryCondition === card.id) ||
                  (!config.enabled && card.id === "NONE");
                return (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() =>
                      onChangeConfig((prev) => ({
                        ...prev,
                        enabled: card.id !== "NONE",
                        primaryCondition: card.id,
                      }))
                    }
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? "bg-slate-900 border-amber-400 ring-1 ring-amber-400/30"
                        : "bg-slate-900/50 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div>
                      <div
                        className={`inline-block font-mono text-xs font-bold px-2 py-0.5 rounded border mb-2 ${card.badgeColor}`}
                      >
                        {card.diagram}
                      </div>
                      <div className="text-xs font-bold text-white">
                        {card.title}
                      </div>
                    </div>
                    <div className="text-[10px] font-mono text-slate-400 mt-1">
                      {card.subtitle}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 3: Timing Qualification, Pre-Trigger Window & N-th Event Counter */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-900/60 border border-slate-800 rounded-xl p-4">
            {/* Pre-Trigger Buffer Ratio */}
            <div>
              <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1.5">
                Pre-Trigger Buffer (%)
              </label>
              <div className="flex items-center gap-1">
                {([10, 25, 50, 75, 90] as const).map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() =>
                      onChangeConfig((prev) => ({
                        ...prev,
                        preTriggerPercent: pct,
                      }))
                    }
                    className={`flex-1 py-1.5 rounded text-xs font-mono transition-colors cursor-pointer ${
                      config.preTriggerPercent === pct
                        ? "bg-cyan-500/25 text-cyan-200 border border-cyan-400/50 font-bold"
                        : "bg-slate-900 text-slate-400 border border-slate-800 hover:text-white"
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-slate-500 font-mono mt-1">
                History shown before T = 0ms
              </p>
            </div>

            {/* N-th Occurrence Pass Counter */}
            <div>
              <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1.5">
                Trigger on N-th Match
              </label>
              <select
                value={config.nthOccurrence}
                onChange={(e) =>
                  onChangeConfig((prev) => ({
                    ...prev,
                    nthOccurrence: Number(e.target.value),
                  }))
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white"
              >
                <option value={1}>1st Occurrence (Immediate)</option>
                <option value={2}>2nd Occurrence</option>
                <option value={3}>3rd Occurrence</option>
                <option value={4}>4th Occurrence</option>
                <option value={6}>6th Occurrence</option>
                <option value={8}>8th Occurrence</option>
              </select>
              <p className="text-[10px] text-slate-500 font-mono mt-1">
                Skips initial startup edges
              </p>
            </div>

            {/* Min Pulse Width / Glitch Reject */}
            <div>
              <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1.5">
                Min Pulse Width Qualification
              </label>
              <select
                value={config.minPulseSteps}
                onChange={(e) =>
                  onChangeConfig((prev) => ({
                    ...prev,
                    minPulseSteps: Number(e.target.value),
                  }))
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white"
              >
                <option value={1}>
                  &ge; 1 Step ({Math.round(halfCycleMs)} ms) — All Edges
                </option>
                <option value={2}>
                  &ge; 2 Steps ({Math.round(halfCycleMs * 2)} ms) — Glitch Filter
                </option>
                <option value={3}>
                  &ge; 3 Steps ({Math.round(halfCycleMs * 3)} ms) — Sustained
                </option>
                <option value={4}>
                  &ge; 4 Steps ({Math.round(halfCycleMs * 4)} ms) — Long Pulse
                </option>
              </select>
              <p className="text-[10px] text-slate-500 font-mono mt-1">
                Rejects narrow combinational hazards
              </p>
            </div>

            {/* Trigger Holdoff */}
            <div>
              <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1.5">
                Trigger Holdoff Dead-Time
              </label>
              <select
                value={config.holdoffSteps}
                onChange={(e) =>
                  onChangeConfig((prev) => ({
                    ...prev,
                    holdoffSteps: Number(e.target.value),
                  }))
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white"
              >
                <option value={0}>0 Steps (No Holdoff)</option>
                <option value={1}>
                  1 Step ({Math.round(halfCycleMs)} ms Holdoff)
                </option>
                <option value={2}>
                  2 Steps ({Math.round(halfCycleMs * 2)} ms Holdoff)
                </option>
                <option value={4}>
                  4 Steps ({Math.round(halfCycleMs * 4)} ms Holdoff)
                </option>
              </select>
              <p className="text-[10px] text-slate-500 font-mono mt-1">
                Suppresses re-triggering during bursts
              </p>
            </div>
          </div>

          {/* Section 4: Multi-Channel Pattern & Edge Qualifier Matrix */}
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  03. Multi-Channel Combinational Pattern &amp; Edge Matrix
                </label>
                <button
                  type="button"
                  onClick={() =>
                    onChangeConfig((prev) => ({
                      ...prev,
                      usePatternMatrix: !prev.usePatternMatrix,
                    }))
                  }
                  className={`px-2.5 py-0.5 rounded text-xs font-mono border cursor-pointer ${
                    config.usePatternMatrix
                      ? "bg-emerald-500/20 border-emerald-400 text-emerald-200 font-bold"
                      : "bg-slate-800 border-slate-700 text-slate-400"
                  }`}
                >
                  {config.usePatternMatrix ? "ENABLED" : "OPTIONAL (OFF)"}
                </button>
              </div>

              {config.usePatternMatrix && (
                <div className="flex items-center gap-1.5 text-xs font-mono">
                  <span className="text-slate-400">Combiner:</span>
                  {(["AND", "OR"] as const).map((op) => (
                    <button
                      key={op}
                      type="button"
                      onClick={() =>
                        onChangeConfig((prev) => ({
                          ...prev,
                          patternLogicOp: op,
                        }))
                      }
                      className={`px-2.5 py-1 rounded cursor-pointer ${
                        config.patternLogicOp === op
                          ? "bg-cyan-500/25 text-cyan-200 font-bold border border-cyan-500/40"
                          : "bg-slate-900 text-slate-400 border border-slate-800"
                      }`}
                    >
                      {op === "AND" ? "AND (All Match)" : "OR (Any Match)"}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {config.usePatternMatrix && (
              <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3 max-h-48 overflow-y-auto space-y-1.5">
                {subscribedSignals.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-3">
                    Subscribe to wire signals in the Logic Analyzer to configure
                    per-channel pattern masks.
                  </p>
                ) : (
                  subscribedSignals.map((sig) => {
                    const current =
                      config.channelConstraints[sig.wireId] || "X";
                    const options: {
                      id: ChannelTriggerConstraint;
                      label: string;
                    }[] = [
                      { id: "X", label: "X (Don't Care)" },
                      { id: "1", label: "1 (HIGH)" },
                      { id: "0", label: "0 (LOW)" },
                      { id: "R", label: "↑ Rising" },
                      { id: "F", label: "↓ Falling" },
                      { id: "E", label: "↕ Either" },
                    ];
                    return (
                      <div
                        key={sig.wireId}
                        className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800/80"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: sig.color }}
                          />
                          <span className="font-mono text-xs font-bold text-slate-200 truncate">
                            LA{sig.channelIndex}: {sig.netName}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          {options.map((opt) => (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() =>
                                setChannelConstraint(sig.wireId, opt.id)
                              }
                              className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors cursor-pointer ${
                                current === opt.id
                                  ? opt.id === "X"
                                    ? "bg-slate-700 text-white font-bold"
                                    : "bg-amber-500/25 text-amber-200 border border-amber-400/50 font-bold"
                                  : "bg-slate-950 text-slate-500 hover:text-slate-300"
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Action & Live Diagnostic Footer */}
        <div className="px-5 py-3.5 bg-[#0f172a] border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
            {triggerEval.hitStepIndices.length > 0 ? (
              <span className="inline-flex items-center gap-1.5 text-emerald-300 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                {triggerEval.hitStepIndices.length} Trigger Hit
                {triggerEval.hitStepIndices.length === 1 ? "" : "s"} in Buffer ·
                Locked T=0 at Step{" "}
                {(triggerEval.primaryTriggerStep ?? 0) + 1}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-amber-300">
                <AlertCircle className="w-4 h-4 text-amber-400" />
                No matching trigger event in current buffer — Click &ldquo;Run
                Triggered Capture&rdquo; to sweep until triggered
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onForceTrigger}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-purple-200 border border-purple-500/40 transition-colors cursor-pointer"
              title="Immediately capture current buffer and anchor T=0 even if trigger condition hasn't fired"
            >
              <Crosshair className="w-3.5 h-3.5 text-purple-400" />
              Force Trigger
            </button>

            <button
              type="button"
              onClick={onArmTrigger}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                isArmed
                  ? "bg-amber-500/25 border-amber-400 text-amber-200"
                  : "bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200"
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              {isArmed ? "Trigger Armed (Waiting...)" : "Arm Trigger"}
            </button>

            <button
              type="button"
              onClick={() => {
                onRunTriggeredBurst();
                onClose();
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-amber-400 hover:bg-amber-300 text-slate-950 transition-colors cursor-pointer shadow-md"
            >
              <Play className="w-3.5 h-3.5" />
              Run Triggered Capture &amp; Apply
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-500/40 transition-colors cursor-pointer"
            >
              Apply &amp; Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LogicAnalyzerTriggerModal;
