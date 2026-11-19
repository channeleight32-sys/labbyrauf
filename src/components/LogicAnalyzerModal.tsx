import React, { useState, useMemo, useEffect } from "react";
import {
  Activity,
  X,
  Play,
  StepForward,
  RotateCcw,
  CheckSquare,
  Square,
  Zap,
  Crosshair,
  Sliders,
  Maximize2,
  Minimize2,
  Cpu,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  Download,
  Check,
} from "lucide-react";
import {
  LogicAnalyzerTriggerModal,
  LogicAnalyzerTriggerConfig,
  DEFAULT_LA_TRIGGER_CONFIG,
  TriggerConditionType,
  TriggerSweepMode,
  evaluateLogicAnalyzerTrigger,
} from "./LogicAnalyzerTriggerModal";

export interface SubscribableWireSignal {
  wireId: number;
  channelIndex: number;
  netName: string;
  sourceLabel: string;
  targetLabel: string;
  sourceNodeId: number;
  sourcePort: number;
  targetNodeId: number;
  targetPort: number;
  isClockLine: boolean;
  isInputDriven: boolean;
  isOutputTarget: boolean;
  stageDepth: number;
  delayNs: number;
  currentLogic: 0 | 1;
  color: string;
  stepSamples: (0 | 1)[];
}

export const LA_CHANNEL_PALETTE = [
  "#38bdf8", // Cyan
  "#10b981", // Emerald
  "#fbbf24", // Amber
  "#f472b6", // Pink
  "#a78bfa", // Violet
  "#fb923c", // Orange
  "#2dd4bf", // Teal
  "#60a5fa", // Blue
  "#f87171", // Red
  "#c084fc", // Purple
  "#4ade80", // Green
  "#facc15", // Yellow
];

interface LogicAnalyzerModalProps {
  isOpen: boolean;
  onClose: () => void;
  circuitTitle: string;
  allWireSignals: SubscribableWireSignal[];
  subscribedWireIds: number[];
  onToggleSubscribeWire: (wireId: number) => void;
  onSetSubscribedWires: (wireIds: number[]) => void;
  stepLabels: number[];
  clockHz: number;
  gateDelayNs: number;
  autoClock: boolean;
  onToggleAutoClock: () => void;
  onStepClock: () => void;
  onRunPatternSweep: () => void;
  onClearHistory: () => void;
  isWireSubscribeMode: boolean;
  onToggleWireSubscribeMode: () => void;
  initialOpenTriggerModal?: boolean;
  onConsumeInitialTriggerModal?: () => void;
}

type ClockEdgeSyncMode = "RISING" | "FALLING" | "BOTH";
type BusRadix = "HEX" | "BIN" | "DEC";

export const LogicAnalyzerModal: React.FC<LogicAnalyzerModalProps> = ({
  isOpen,
  onClose,
  circuitTitle,
  allWireSignals,
  subscribedWireIds,
  onToggleSubscribeWire,
  onSetSubscribedWires,
  stepLabels,
  clockHz,
  gateDelayNs,
  autoClock,
  onToggleAutoClock,
  onStepClock,
  onRunPatternSweep,
  onClearHistory,
  isWireSubscribeMode,
  onToggleWireSubscribeMode,
  initialOpenTriggerModal = false,
  onConsumeInitialTriggerModal,
}) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [clockSyncMode, setClockSyncMode] = useState<ClockEdgeSyncMode>("RISING");
  const [referenceClockWireId, setReferenceClockWireId] = useState<number | "SYNTH">(
    "SYNTH"
  );
  const [showSetupHoldZones, setShowSetupHoldZones] = useState<boolean>(true);
  const [showPropagationSkew, setShowPropagationSkew] = useState<boolean>(true);
  const [showParallelBusRow, setShowParallelBusRow] = useState<boolean>(true);
  const [busRadix, setBusRadix] = useState<BusRadix>("HEX");

  // Professional Hardware Trigger Configuration & Modal State
  const [triggerConfig, setTriggerConfig] = useState<LogicAnalyzerTriggerConfig>(
    DEFAULT_LA_TRIGGER_CONFIG
  );
  const [isTriggerModalOpen, setIsTriggerModalOpen] = useState<boolean>(false);
  const [isTriggerArmed, setIsTriggerArmed] = useState<boolean>(true);
  const [forcedTriggerStep, setForcedTriggerStep] = useState<number | null>(
    null
  );
  const [frozenSignalsSnapshot, setFrozenSignalsSnapshot] = useState<
    SubscribableWireSignal[] | null
  >(null);

  const [cursorA, setCursorA] = useState<number>(1);
  const [cursorB, setCursorB] = useState<number>(6);
  const [activeCursor, setActiveCursor] = useState<"A" | "B">("B");
  const [wireFilterQuery, setWireFilterQuery] = useState("");
  const [csvDownloaded, setCsvDownloaded] = useState(false);

  useEffect(() => {
    if (isOpen && initialOpenTriggerModal) {
      setIsTriggerModalOpen(true);
      onConsumeInitialTriggerModal?.();
    }
  }, [isOpen, initialOpenTriggerModal, onConsumeInitialTriggerModal]);

  const liveSubscribedSignals = useMemo(() => {
    const orderMap = new Map<number, number>();
    subscribedWireIds.forEach((id, idx) => orderMap.set(id, idx));
    return allWireSignals
      .filter((w) => orderMap.has(w.wireId))
      .sort((a, b) => (orderMap.get(a.wireId) ?? 0) - (orderMap.get(b.wireId) ?? 0));
  }, [allWireSignals, subscribedWireIds]);

  const subscribedSignals = useMemo(() => {
    if (frozenSignalsSnapshot && frozenSignalsSnapshot.length > 0) {
      const orderMap = new Map<number, number>();
      subscribedWireIds.forEach((id, idx) => orderMap.set(id, idx));
      return frozenSignalsSnapshot
        .filter((w) => orderMap.has(w.wireId))
        .sort((a, b) => (orderMap.get(a.wireId) ?? 0) - (orderMap.get(b.wireId) ?? 0));
    }
    return liveSubscribedSignals;
  }, [frozenSignalsSnapshot, liveSubscribedSignals, subscribedWireIds]);

  const totalSteps = Math.max(
    stepLabels.length,
    subscribedSignals[0]?.stepSamples.length ||
      allWireSignals[0]?.stepSamples.length ||
      0,
    8
  );

  // Build synchronized reference clock waveform (either from a real clock wire or synthesized master clock)
  const masterClockSamples = useMemo<(0 | 1)[]>(() => {
    if (referenceClockWireId !== "SYNTH") {
      const clkWire = allWireSignals.find(
        (w) => w.wireId === referenceClockWireId
      );
      if (clkWire && clkWire.stepSamples.length > 0) {
        return clkWire.stepSamples;
      }
    }
    const autoClk = allWireSignals.find((w) => w.isClockLine);
    if (autoClk && autoClk.stepSamples.length > 0 && referenceClockWireId === "SYNTH") {
      const hasToggle = autoClk.stepSamples.some(
        (v, i, arr) => i > 0 && v !== arr[i - 1]
      );
      if (hasToggle) return autoClk.stepSamples;
    }
    return Array.from({ length: totalSteps }, (_, idx) =>
      idx % 2 === 1 ? 1 : 0
    );
  }, [referenceClockWireId, allWireSignals, totalSteps]);

  // Identify synchronized clock edges across the capture window
  const synchronizedClockEdges = useMemo(() => {
    const edges: {
      stepIndex: number;
      edgeType: "RISING" | "FALLING";
      cycleNumber: number;
    }[] = [];
    let risingCount = 0;
    for (let s = 1; s < masterClockSamples.length; s++) {
      const prev = masterClockSamples[s - 1];
      const curr = masterClockSamples[s];
      if (prev === 0 && curr === 1) {
        risingCount++;
        if (clockSyncMode === "RISING" || clockSyncMode === "BOTH") {
          edges.push({
            stepIndex: s,
            edgeType: "RISING",
            cycleNumber: risingCount,
          });
        }
      } else if (prev === 1 && curr === 0) {
        if (clockSyncMode === "FALLING" || clockSyncMode === "BOTH") {
          edges.push({
            stepIndex: s,
            edgeType: "FALLING",
            cycleNumber: risingCount,
          });
        }
      }
    }
    return edges;
  }, [masterClockSamples, clockSyncMode]);

  // Evaluate Hardware Trigger Rules across the capture window
  const triggerEval = useMemo(() => {
    return evaluateLogicAnalyzerTrigger(
      triggerConfig,
      subscribedSignals,
      masterClockSamples,
      totalSteps,
      forcedTriggerStep
    );
  }, [
    triggerConfig,
    subscribedSignals,
    masterClockSamples,
    totalSteps,
    forcedTriggerStep,
  ]);

  const triggerHitSteps = useMemo(() => {
    return new Set<number>(triggerEval.hitStepIndices);
  }, [triggerEval.hitStepIndices]);

  // Auto-align Cursor T1 to primary trigger event & handle Single-Shot capture freeze
  useEffect(() => {
    if (triggerEval.primaryTriggerStep !== null) {
      if (triggerConfig.autoAlignCursorT1) {
        setCursorA(triggerEval.primaryTriggerStep);
        setCursorB(
          Math.min(totalSteps - 1, triggerEval.primaryTriggerStep + 3)
        );
      }
      if (
        isTriggerArmed &&
        triggerConfig.sweepMode === "SINGLE" &&
        triggerEval.status === "TRIGGERED"
      ) {
        setIsTriggerArmed(false);
        setFrozenSignalsSnapshot(liveSubscribedSignals);
        if (autoClock && triggerConfig.stopAutoClockOnSingleShot) {
          onToggleAutoClock();
        }
      }
    }
  }, [
    triggerEval.primaryTriggerStep,
    triggerEval.status,
    triggerConfig.autoAlignCursorT1,
    triggerConfig.sweepMode,
    triggerConfig.stopAutoClockOnSingleShot,
    isTriggerArmed,
    totalSteps,
    liveSubscribedSignals,
    autoClock,
    onToggleAutoClock,
  ]);

  const handleArmTrigger = () => {
    setForcedTriggerStep(null);
    setFrozenSignalsSnapshot(null);
    setIsTriggerArmed(true);
    setTriggerConfig((prev) => ({
      ...prev,
      enabled: true,
      primaryCondition:
        prev.primaryCondition === "NONE" ? "POSEDGE" : prev.primaryCondition,
    }));
  };

  const handleForceTrigger = () => {
    const anchor = Math.max(
      0,
      Math.min(
        totalSteps - 1,
        Math.round((triggerConfig.preTriggerPercent / 100) * (totalSteps - 1))
      )
    );
    setForcedTriggerStep(anchor);
    setIsTriggerArmed(false);
    setCursorA(anchor);
  };

  const handleRunTriggeredBurst = () => {
    setForcedTriggerStep(null);
    setFrozenSignalsSnapshot(null);
    setIsTriggerArmed(true);
    onRunPatternSweep();
  };

  // Parallel Bus Decoder values at each sample step across subscribed channels
  const parallelBusValues = useMemo(() => {
    const activeChannels = subscribedSignals.slice(0, 12);
    if (activeChannels.length === 0) return [];
    const values: string[] = [];

    for (let s = 0; s < totalSteps; s++) {
      let word = 0;
      for (let c = 0; c < activeChannels.length; c++) {
        const bit = activeChannels[c].stepSamples[s] ?? 0;
        word = (word << 1) | bit;
      }
      if (busRadix === "HEX") {
        const hexDigits = Math.max(1, Math.ceil(activeChannels.length / 4));
        values.push(
          "0x" + word.toString(16).toUpperCase().padStart(hexDigits, "0")
        );
      } else if (busRadix === "BIN") {
        values.push(
          word.toString(2).padStart(Math.min(activeChannels.length, 8), "0")
        );
      } else {
        values.push(String(word));
      }
    }
    return values;
  }, [subscribedSignals, totalSteps, busRadix]);

  const filteredWireList = useMemo(() => {
    const q = wireFilterQuery.trim().toLowerCase();
    if (!q) return allWireSignals;
    return allWireSignals.filter(
      (w) =>
        w.netName.toLowerCase().includes(q) ||
        w.sourceLabel.toLowerCase().includes(q) ||
        w.targetLabel.toLowerCase().includes(q) ||
        `la${w.channelIndex}`.includes(q)
    );
  }, [allWireSignals, wireFilterQuery]);

  if (!isOpen) return null;

  const safeCursorA = Math.min(Math.max(0, cursorA), totalSteps - 1);
  const safeCursorB = Math.min(Math.max(0, cursorB), totalSteps - 1);
  const deltaSteps = Math.abs(safeCursorB - safeCursorA);
  const halfCycleMs = 1000 / (clockHz * 2);
  const deltaTimeMs = deltaSteps * halfCycleMs;
  const deltaClockCycles = deltaSteps / 2;

  // SVG Timing Diagram Geometry
  const labelColWidth = 225;
  const stepWidth = Math.max(42, Math.floor(680 / Math.max(totalSteps, 8)));
  const plotWidth = totalSteps * stepWidth;
  const svgWidth = labelColWidth + plotWidth + 36;

  const headerHeight = 40;
  const clockRowHeight = 52;
  const busRowHeight =
    showParallelBusRow && subscribedSignals.length > 0 ? 38 : 0;
  const channelRowHeight = 48;
  const svgHeight =
    headerHeight +
    clockRowHeight +
    busRowHeight +
    Math.max(1, subscribedSignals.length) * channelRowHeight +
    36;

  const handleTimelineClick = (stepIdx: number) => {
    if (activeCursor === "A") {
      setCursorA(stepIdx);
      setActiveCursor("B");
    } else {
      setCursorB(stepIdx);
      setActiveCursor("A");
    }
  };

  const handleDownloadCsv = () => {
    const signalsToExport =
      subscribedSignals.length > 0 ? subscribedSignals : allWireSignals.slice(0, 8);
    if (signalsToExport.length === 0) return;

    const headers = [
      "Step",
      "Time_ms",
      "Master_CLK_Logic",
      ...signalsToExport.map(
        (s) => `"LA${s.channelIndex}_${s.netName.replace(/"/g, '""')}_Logic"`
      ),
    ];
    const lines = [headers.join(",")];
    for (let s = 0; s < totalSteps; s++) {
      const timeMs = (s * halfCycleMs).toFixed(6);
      const clkBit = masterClockSamples[s] ?? 0;
      const row: (string | number)[] = [s, timeMs, clkBit];
      signalsToExport.forEach((sig) => {
        row.push(sig.stepSamples[s] ?? sig.currentLogic ?? 0);
      });
      lines.push(row.join(","));
    }

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const slug = circuitTitle.toLowerCase().replace(/[^a-z0-9]+/g, "_");
    link.download = `logic_analyzer_${slug || "capture"}_${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setCsvDownloaded(true);
    window.setTimeout(() => setCsvDownloaded(false), 2200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-3 sm:p-5">
      <div
        className={`flex flex-col bg-[#0b1020] border border-cyan-500/40 rounded-2xl shadow-2xl overflow-hidden transition-all ${
          isMaximized
            ? "w-full h-full max-w-none max-h-none"
            : "w-full max-w-[1340px] max-h-[92vh]"
        }`}
      >
        {/* Top Modal Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 bg-[#0f172a] border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-400/40 flex items-center justify-center text-cyan-300">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Multi-Channel Digital Logic Analyzer &amp; Synchronized Timing Studio
                </h2>
                <span className="text-xs font-mono text-cyan-300">
                  {subscribedSignals.length}/{allWireSignals.length} Wires Subscribed
                </span>
                <span className="text-slate-600">·</span>
                <span
                  className={`text-xs font-mono font-semibold ${
                    triggerEval.status === "TRIGGERED"
                      ? "text-emerald-300"
                      : triggerEval.status === "FORCED"
                      ? "text-purple-300"
                      : triggerEval.status === "ARMED_WAITING"
                      ? "text-amber-300"
                      : "text-slate-400"
                  }`}
                >
                  {frozenSignalsSnapshot
                    ? `SINGLE-SHOT HOLD @ S${(triggerEval.primaryTriggerStep ?? 0) + 1}`
                    : triggerEval.status === "TRIGGERED"
                    ? `TRIG LOCKED @ S${(triggerEval.primaryTriggerStep ?? 0) + 1}`
                    : triggerEval.status === "FORCED"
                    ? "FORCED TRIG"
                    : triggerEval.status === "ARMED_WAITING"
                    ? "ARMED (Waiting for Edge/Level)"
                    : "UNTRIGGERED"}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Circuit: {circuitTitle} · Master Clock: {clockHz} Hz · Gate t_pd:{" "}
                {gateDelayNs} ns · Trigger Mode: {triggerConfig.sweepMode} (
                {triggerConfig.primaryCondition})
              </p>
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsTriggerModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-400/50 transition-colors cursor-pointer"
              title="Open Hardware Trigger Settings Modal (Rising/Falling Edge, Level HIGH/LOW, Pattern Matrix & Single-Shot Capture)"
            >
              <Sliders className="w-3.5 h-3.5 text-amber-300" />
              Trigger Settings
            </button>

            <button
              type="button"
              onClick={onToggleWireSubscribeMode}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                isWireSubscribeMode
                  ? "bg-emerald-500/20 border-emerald-400 text-emerald-200"
                  : "bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200"
              }`}
              title="When active, clicking any wire on the schematic subscribes/unsubscribes it in the Logic Analyzer"
            >
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              Schematic Click-to-Subscribe: {isWireSubscribeMode ? "ON" : "OFF"}
            </button>

            <button
              type="button"
              onClick={() => {
                setFrozenSignalsSnapshot(null);
                onStepClock();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 transition-colors cursor-pointer"
            >
              <StepForward className="w-3.5 h-3.5 text-cyan-400" />
              Step Clock
            </button>

            <button
              type="button"
              onClick={handleRunTriggeredBurst}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-colors cursor-pointer"
            >
              <Play className="w-3.5 h-3.5" />
              Capture 16-Step Burst
            </button>

            <button
              type="button"
              onClick={() => {
                setFrozenSignalsSnapshot(null);
                onToggleAutoClock();
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                autoClock
                  ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300"
                  : "bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300"
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              Auto Clock: {autoClock ? "ON" : "OFF"}
            </button>

            <button
              type="button"
              onClick={handleDownloadCsv}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-500/40 transition-colors cursor-pointer"
              title="Download captured logic timing samples as CSV for Excel or MATLAB"
            >
              {csvDownloaded ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Downloaded!</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5 text-cyan-300" />
                  <span>Download CSV</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setFrozenSignalsSnapshot(null);
                setForcedTriggerStep(null);
                onClearHistory();
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
              title="Clear captured waveform buffer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Buffer
            </button>

            <button
              type="button"
              onClick={() => setIsMaximized((v) => !v)}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer"
              title={isMaximized ? "Restore Window" : "Maximize Window"}
            >
              {isMaximized ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg bg-rose-950/60 hover:bg-rose-900/80 text-rose-200 border border-rose-500/40 cursor-pointer"
              title="Close Logic Analyzer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Second Toolbar: Clock Edge Sync, Trigger Configuration, Bus Format & Cursor Readout */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-2.5 bg-[#111827] border-b border-slate-800 text-xs">
          {/* Clock Synchronization Controls */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-semibold">Clock Source:</span>
              <select
                value={referenceClockWireId}
                onChange={(e) =>
                  setReferenceClockWireId(
                    e.target.value === "SYNTH" ? "SYNTH" : Number(e.target.value)
                  )
                }
                className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs font-mono text-cyan-300"
              >
                <option value="SYNTH">Master Sync Clock (CLK_SYS)</option>
                {allWireSignals.map((w) => (
                  <option key={w.wireId} value={w.wireId}>
                    LA{w.channelIndex}: {w.netName}
                    {w.isClockLine ? " (CLK)" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1">
              {(
                [
                  { id: "RISING", label: "↑ Rising Edge" },
                  { id: "FALLING", label: "↓ Falling Edge" },
                  { id: "BOTH", label: "↑↓ Both Edges" },
                ] as { id: ClockEdgeSyncMode; label: string }[]
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setClockSyncMode(m.id)}
                  className={`px-2.5 py-1 rounded text-xs font-mono transition-colors cursor-pointer ${
                    clockSyncMode === m.id
                      ? "bg-cyan-500/25 text-cyan-200 font-bold"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setShowSetupHoldZones((v) => !v)}
              className={`px-2.5 py-1 rounded-lg border font-mono transition-colors cursor-pointer ${
                showSetupHoldZones
                  ? "bg-amber-500/15 border-amber-400/50 text-amber-200"
                  : "bg-slate-900 border-slate-800 text-slate-400"
              }`}
              title="Shade flip-flop Setup (t_su) and Hold (t_h) windows around synchronized clock edges"
            >
              t_su / t_h Zones: {showSetupHoldZones ? "ON" : "OFF"}
            </button>

            <button
              type="button"
              onClick={() => setShowPropagationSkew((v) => !v)}
              className={`px-2.5 py-1 rounded-lg border font-mono transition-colors cursor-pointer ${
                showPropagationSkew
                  ? "bg-purple-500/15 border-purple-400/50 text-purple-200"
                  : "bg-slate-900 border-slate-800 text-slate-400"
              }`}
              title="Visualize gate stage propagation skew (t_pd) relative to clock edges"
            >
              Gate Skew (t_pd): {showPropagationSkew ? "ON" : "OFF"}
            </button>
          </div>

          {/* Trigger & Parallel Bus Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex flex-wrap items-center gap-1.5 bg-slate-900/90 border border-slate-800 rounded-lg px-2.5 py-1">
              <Sliders className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-slate-400 font-semibold">Trigger:</span>
              <select
                value={
                  triggerConfig.enabled ? triggerConfig.primaryCondition : "NONE"
                }
                onChange={(e) => {
                  const val = e.target.value as TriggerConditionType;
                  setTriggerConfig((prev) => ({
                    ...prev,
                    enabled: val !== "NONE",
                    primaryCondition: val,
                  }));
                }}
                className="bg-slate-950 border border-slate-700 rounded px-2 py-0.5 text-xs font-mono text-amber-300"
              >
                <option value="POSEDGE">Rising Edge (0 → 1)</option>
                <option value="NEGEDGE">Falling Edge (1 → 0)</option>
                <option value="EITHER_EDGE">Either Edge (0 ↔ 1)</option>
                <option value="HIGH">Level HIGH (1)</option>
                <option value="LOW">Level LOW (0)</option>
                <option value="NONE">Off</option>
              </select>
              <select
                value={triggerConfig.primaryWireId}
                onChange={(e) => {
                  const val = e.target.value;
                  setTriggerConfig((prev) => ({
                    ...prev,
                    primaryWireId:
                      val === "ALL" || val === "CLK_SYNTH" ? val : Number(val),
                  }));
                }}
                className="bg-slate-950 border border-slate-700 rounded px-2 py-0.5 text-xs font-mono text-slate-200"
              >
                <option value="ALL">Any Subscribed Wire</option>
                <option value="CLK_SYNTH">Master Clock (CLK_SYNC)</option>
                {subscribedSignals.map((s) => (
                  <option key={s.wireId} value={s.wireId}>
                    LA{s.channelIndex}: {s.sourceLabel}
                  </option>
                ))}
              </select>

              {/* Sweep Mode Quick Selector */}
              <div className="flex items-center gap-0.5 bg-slate-950 border border-slate-800 rounded p-0.5">
                {(["AUTO", "NORMAL", "SINGLE"] as TriggerSweepMode[]).map(
                  (sm) => (
                    <button
                      key={sm}
                      type="button"
                      onClick={() => {
                        setFrozenSignalsSnapshot(null);
                        setTriggerConfig((prev) => ({
                          ...prev,
                          enabled: true,
                          sweepMode: sm,
                        }));
                      }}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono cursor-pointer ${
                        triggerConfig.sweepMode === sm
                          ? "bg-amber-500/25 text-amber-200 font-bold"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      {sm}
                    </button>
                  )
                )}
              </div>

              <button
                type="button"
                onClick={handleArmTrigger}
                className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold border cursor-pointer ${
                  isTriggerArmed
                    ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                    : "bg-slate-800 border-slate-700 text-slate-300 hover:text-white"
                }`}
                title="Arm trigger to wait for configured edge/level condition"
              >
                {frozenSignalsSnapshot ? "Re-Arm" : isTriggerArmed ? "Armed" : "Arm"}
              </button>

              <button
                type="button"
                onClick={() => setIsTriggerModalOpen(true)}
                className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-400/40 cursor-pointer"
              >
                Configure…
              </button>
            </div>

            <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1">
              <button
                type="button"
                onClick={() => setShowParallelBusRow((v) => !v)}
                className={`px-2 py-1 rounded text-xs font-mono cursor-pointer ${
                  showParallelBusRow
                    ? "bg-emerald-500/20 text-emerald-300 font-semibold"
                    : "text-slate-400"
                }`}
              >
                Bus Decode
              </button>
              {(["HEX", "BIN", "DEC"] as BusRadix[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => {
                    setShowParallelBusRow(true);
                    setBusRadix(r);
                  }}
                  className={`px-2 py-1 rounded text-xs font-mono cursor-pointer ${
                    showParallelBusRow && busRadix === r
                      ? "bg-cyan-500/25 text-cyan-200 font-bold"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Body: Left Wire Subscription Matrix + Right Multi-Channel Timing Diagram */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 overflow-hidden">
          {/* Left Sidebar: Wire Signal Subscription Manager */}
          <div className="lg:col-span-3 border-r border-slate-800 bg-[#0d1424] flex flex-col min-h-0">
            <div className="p-3.5 border-b border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  Wire Signal Subscriptions
                </span>
                <span className="text-[11px] font-mono text-cyan-400">
                  {subscribedSignals.length} Active
                </span>
              </div>

              {/* Quick Subscription Preset Buttons */}
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    onSetSubscribedWires(allWireSignals.map((w) => w.wireId))
                  }
                  className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 transition-colors cursor-pointer"
                >
                  Subscribe All ({allWireSignals.length})
                </button>
                <button
                  type="button"
                  onClick={() => onSetSubscribedWires([])}
                  className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
                >
                  Unsubscribe All
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onSetSubscribedWires(
                      allWireSignals
                        .filter((w) => w.isInputDriven || w.isOutputTarget)
                        .map((w) => w.wireId)
                    )
                  }
                  className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 transition-colors cursor-pointer"
                >
                  I/O Boundary Nets
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onSetSubscribedWires(
                      allWireSignals
                        .filter((w) => w.isClockLine || w.stageDepth > 0)
                        .map((w) => w.wireId)
                    )
                  }
                  className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 transition-colors cursor-pointer"
                >
                  Clock &amp; Gate Nets
                </button>
              </div>

              <input
                type="text"
                value={wireFilterQuery}
                onChange={(e) => setWireFilterQuery(e.target.value)}
                placeholder="Filter wires by pin or gate..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              />
            </div>

            {/* Scrollable Wire Subscription List */}
            <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
              {filteredWireList.length === 0 ? (
                <div className="text-xs text-slate-500 text-center py-8 px-3">
                  No wires found in schematic. Connect logic gates on the canvas to
                  subscribe to wire signals.
                </div>
              ) : (
                filteredWireList.map((wire) => {
                  const isSub = subscribedWireIds.includes(wire.wireId);
                  const toggles = wire.stepSamples.reduce<number>(
                    (acc, v, i, arr) =>
                      i > 0 && v !== arr[i - 1] ? acc + 1 : acc,
                    0
                  );
                  return (
                    <button
                      key={wire.wireId}
                      type="button"
                      onClick={() => onToggleSubscribeWire(wire.wireId)}
                      className={`w-full text-left p-2.5 rounded-xl border transition-all cursor-pointer flex items-start gap-2.5 ${
                        isSub
                          ? "bg-slate-900/95 border-cyan-500/40 shadow-sm"
                          : "bg-slate-950/50 border-slate-800/80 opacity-65 hover:opacity-100"
                      }`}
                    >
                      <div className="mt-0.5 shrink-0">
                        {isSub ? (
                          <CheckSquare
                            className="w-4 h-4"
                            style={{ color: wire.color }}
                          />
                        ) : (
                          <Square className="w-4 h-4 text-slate-500" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span
                            className="font-mono text-xs font-bold truncate"
                            style={{ color: isSub ? wire.color : "#cbd5e1" }}
                          >
                            LA{wire.channelIndex} · {wire.sourceLabel}
                          </span>
                          <span
                            className={`font-mono text-[11px] font-bold px-1.5 py-0.5 rounded ${
                              wire.currentLogic === 1
                                ? "bg-emerald-500/20 text-emerald-300"
                                : "bg-slate-800 text-slate-400"
                            }`}
                          >
                            {wire.currentLogic === 1 ? "HI (1)" : "LO (0)"}
                          </span>
                        </div>
                        <div className="text-[11px] font-mono text-slate-400 truncate mt-0.5">
                          → {wire.targetLabel}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500 mt-1">
                          <span>Stage {wire.stageDepth}</span>
                          <span>·</span>
                          <span>t_pd: {wire.delayNs}ns</span>
                          <span>·</span>
                          <span>{toggles} edges</span>
                          {wire.isClockLine && (
                            <>
                              <span>·</span>
                              <span className="text-amber-300 font-semibold">
                                CLK
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Main Viewport: Synchronized Digital Timing Diagram & Dual Cursor Telemetry */}
          <div className="lg:col-span-9 flex flex-col min-h-0 bg-[#070b14]">
            {/* Timing Diagram Canvas Container */}
            <div className="flex-1 overflow-auto p-4">
              {subscribedSignals.length === 0 ? (
                <div className="h-full min-h-[320px] flex flex-col items-center justify-center text-center border border-dashed border-slate-800 rounded-xl p-8">
                  <Activity className="w-10 h-10 text-cyan-400 mb-3 opacity-80" />
                  <h3 className="text-base font-bold text-white">
                    No Wire Signals Currently Subscribed
                  </h3>
                  <p className="text-xs text-slate-400 max-w-md mt-1 mb-4">
                    Select any wire in the left subscription panel or click
                    &ldquo;Subscribe All&rdquo; to plot multi-channel digital timing
                    waveforms with synchronized clock edges.
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      onSetSubscribedWires(allWireSignals.map((w) => w.wireId))
                    }
                    className="px-4 py-2 rounded-lg text-xs font-bold bg-cyan-400 hover:bg-cyan-300 text-slate-950 cursor-pointer"
                  >
                    Subscribe All {allWireSignals.length} Circuit Wires
                  </button>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-800 bg-[#090d18] overflow-x-auto shadow-inner">
                  <svg
                    width={svgWidth}
                    height={svgHeight}
                    className="block select-none"
                  >
                    <defs>
                      <pattern
                        id="la-subgrid"
                        width={stepWidth}
                        height={24}
                        patternUnits="userSpaceOnUse"
                      >
                        <line
                          x1={0}
                          y1={0}
                          x2={0}
                          y2={24}
                          stroke="#1e293b"
                          strokeWidth={0.7}
                        />
                      </pattern>
                    </defs>

                    {/* Left Channel Header Background */}
                    <rect
                      x={0}
                      y={0}
                      width={labelColWidth}
                      height={svgHeight}
                      fill="#0d1322"
                    />
                    <line
                      x1={labelColWidth}
                      y1={0}
                      x2={labelColWidth}
                      y2={svgHeight}
                      stroke="#334155"
                      strokeWidth={1.5}
                    />

                    {/* Top Sample Step Ruler */}
                    <rect
                      x={0}
                      y={0}
                      width={svgWidth}
                      height={headerHeight}
                      fill="#0f172a"
                    />
                    <text
                      x={14}
                      y={24}
                      fill="#94a3b8"
                      style={{
                        fontSize: "11px",
                        fontFamily: "var(--font-mono)",
                        fontWeight: 700,
                      }}
                    >
                      CHANNEL / NET NAME
                    </text>

                    {/* Step Columns & Clickable Cursor Ruler */}
                    {Array.from({ length: totalSteps }).map((_, sIdx) => {
                      const x0 = labelColWidth + sIdx * stepWidth;
                      const isTrig = triggerHitSteps.has(sIdx);
                      const isPrimaryTrig =
                        triggerEval.primaryTriggerStep === sIdx;
                      const relMs =
                        triggerEval.primaryTriggerStep !== null
                          ? Math.round(
                              (sIdx - triggerEval.primaryTriggerStep) *
                                halfCycleMs
                            )
                          : Math.round(sIdx * halfCycleMs);
                      const timeText =
                        triggerEval.primaryTriggerStep !== null
                          ? isPrimaryTrig
                            ? "0ms [TRIG]"
                            : `${relMs > 0 ? "+" : ""}${relMs}ms`
                          : `${relMs}ms`;

                      return (
                        <g
                          key={`step-col-${sIdx}`}
                          className="cursor-pointer"
                          onClick={() => handleTimelineClick(sIdx)}
                        >
                          {/* Alternating column zebra tint */}
                          {sIdx % 2 === 1 && (
                            <rect
                              x={x0}
                              y={headerHeight}
                              width={stepWidth}
                              height={svgHeight - headerHeight}
                              fill="rgba(30, 41, 59, 0.22)"
                            />
                          )}

                          {/* Pre-Trigger Buffer Shading when Trigger is Locked */}
                          {triggerEval.primaryTriggerStep !== null &&
                            sIdx < triggerEval.primaryTriggerStep && (
                              <rect
                                x={x0}
                                y={headerHeight}
                                width={stepWidth}
                                height={svgHeight - headerHeight}
                                fill="rgba(15, 23, 42, 0.35)"
                              />
                            )}

                          {/* Trigger Hit Column Highlight */}
                          {isTrig && (
                            <rect
                              x={x0}
                              y={headerHeight}
                              width={stepWidth}
                              height={svgHeight - headerHeight}
                              fill={
                                isPrimaryTrig
                                  ? "rgba(16, 185, 129, 0.14)"
                                  : "rgba(245, 158, 11, 0.08)"
                              }
                            />
                          )}

                          <line
                            x1={x0}
                            y1={0}
                            x2={x0}
                            y2={svgHeight}
                            stroke="#1e293b"
                            strokeWidth={1}
                          />

                          <text
                            x={x0 + stepWidth / 2}
                            y={16}
                            textAnchor="middle"
                            fill={
                              isPrimaryTrig
                                ? "#34d399"
                                : isTrig
                                ? "#fbbf24"
                                : "#94a3b8"
                            }
                            style={{
                              fontSize: "10px",
                              fontFamily: "var(--font-mono)",
                              fontWeight: 700,
                            }}
                          >
                            S{stepLabels[sIdx] ?? sIdx + 1}
                          </text>
                          <text
                            x={x0 + stepWidth / 2}
                            y={31}
                            textAnchor="middle"
                            fill={isPrimaryTrig ? "#6ee7b7" : "#64748b"}
                            style={{
                              fontSize: "9px",
                              fontFamily: "var(--font-mono)",
                              fontWeight: isPrimaryTrig ? 700 : 400,
                            }}
                          >
                            {timeText}
                          </text>
                        </g>
                      );
                    })}

                    {/* Row 0: Master Synchronized Clock Reference Track */}
                    <g transform={`translate(0, ${headerHeight})`}>
                      <rect
                        x={0}
                        y={0}
                        width={svgWidth}
                        height={clockRowHeight}
                        fill="rgba(6, 182, 212, 0.06)"
                      />
                      <line
                        x1={0}
                        y1={clockRowHeight}
                        x2={svgWidth}
                        y2={clockRowHeight}
                        stroke="#1e293b"
                        strokeWidth={1.2}
                      />

                      <text
                        x={14}
                        y={21}
                        fill="#22d3ee"
                        style={{
                          fontSize: "11px",
                          fontFamily: "var(--font-mono)",
                          fontWeight: 700,
                        }}
                      >
                        CLK_SYNC (Master Clock)
                      </text>
                      <text
                        x={14}
                        y={37}
                        fill="#64748b"
                        style={{
                          fontSize: "9.5px",
                          fontFamily: "var(--font-mono)",
                        }}
                      >
                        {clockHz} Hz · Sync: {clockSyncMode}
                      </text>

                      {/* Clock digital waveform path */}
                      {(() => {
                        const yHigh = 13;
                        const yLow = clockRowHeight - 11;
                        let d = "";
                        for (let s = 0; s < totalSteps; s++) {
                          const val = masterClockSamples[s] ?? 0;
                          const xStart = labelColWidth + s * stepWidth;
                          const xEnd = xStart + stepWidth;
                          const y = val === 1 ? yHigh : yLow;
                          if (s === 0) {
                            d += `M ${xStart} ${y} L ${xEnd} ${y}`;
                          } else {
                            const prevVal = masterClockSamples[s - 1] ?? 0;
                            const prevY = prevVal === 1 ? yHigh : yLow;
                            if (prevY !== y) {
                              d += ` L ${xStart} ${y}`;
                            }
                            d += ` L ${xEnd} ${y}`;
                          }
                        }
                        return (
                          <path
                            d={d}
                            fill="none"
                            stroke="#22d3ee"
                            strokeWidth={2.2}
                          />
                        );
                      })()}
                    </g>

                    {/* Row 1 (Optional): Synchronized Parallel Bus Decoder Row */}
                    {showParallelBusRow && subscribedSignals.length > 0 && (
                      <g
                        transform={`translate(0, ${
                          headerHeight + clockRowHeight
                        })`}
                      >
                        <rect
                          x={0}
                          y={0}
                          width={svgWidth}
                          height={busRowHeight}
                          fill="rgba(16, 185, 129, 0.06)"
                        />
                        <line
                          x1={0}
                          y1={busRowHeight}
                          x2={svgWidth}
                          y2={busRowHeight}
                          stroke="#1e293b"
                          strokeWidth={1.2}
                        />
                        <text
                          x={14}
                          y={16}
                          fill="#34d399"
                          style={{
                            fontSize: "10.5px",
                            fontFamily: "var(--font-mono)",
                            fontWeight: 700,
                          }}
                        >
                          BUS[0..{Math.min(subscribedSignals.length, 12) - 1}] (
                          {busRadix})
                        </text>
                        <text
                          x={14}
                          y={30}
                          fill="#64748b"
                          style={{
                            fontSize: "9px",
                            fontFamily: "var(--font-mono)",
                          }}
                        >
                          Parallel State Packet
                        </text>

                        {parallelBusValues.map((valStr, sIdx) => {
                          const x0 = labelColWidth + sIdx * stepWidth;
                          const prevSame =
                            sIdx > 0 && parallelBusValues[sIdx - 1] === valStr;
                          return (
                            <g key={`bus-val-${sIdx}`}>
                              <rect
                                x={x0 + 2}
                                y={6}
                                width={stepWidth - 4}
                                height={busRowHeight - 12}
                                rx={4}
                                fill="rgba(15, 23, 42, 0.9)"
                                stroke="#10b981"
                                strokeWidth={0.9}
                                strokeOpacity={0.6}
                              />
                              <text
                                x={x0 + stepWidth / 2}
                                y={23}
                                textAnchor="middle"
                                fill={prevSame ? "#94a3b8" : "#6ee7b7"}
                                style={{
                                  fontSize: "10px",
                                  fontFamily: "var(--font-mono)",
                                  fontWeight: 700,
                                }}
                              >
                                {valStr}
                              </text>
                            </g>
                          );
                        })}
                      </g>
                    )}

                    {/* Subscribed Wire Signal Channels */}
                    {subscribedSignals.map((sig, chIdx) => {
                      const rowTop =
                        headerHeight +
                        clockRowHeight +
                        busRowHeight +
                        chIdx * channelRowHeight;
                      const yHigh = rowTop + 12;
                      const yLow = rowTop + channelRowHeight - 10;

                      // Calculate horizontal propagation delay offset in pixels when showPropagationSkew is enabled
                      const skewPx = showPropagationSkew
                        ? Math.min(
                            stepWidth * 0.32,
                            (sig.stageDepth * gateDelayNs) / 4.5
                          )
                        : 0;

                      let wavePath = "";
                      let fillPath = "";
                      for (let s = 0; s < totalSteps; s++) {
                        const val =
                          sig.stepSamples[s] ?? sig.currentLogic ?? 0;
                        const xStart =
                          labelColWidth +
                          s * stepWidth +
                          (s > 0 ? skewPx : 0);
                        const xEnd =
                          labelColWidth + (s + 1) * stepWidth + skewPx;
                        const y = val === 1 ? yHigh : yLow;

                        if (s === 0) {
                          wavePath += `M ${xStart} ${y} L ${xEnd} ${y}`;
                          fillPath += `M ${xStart} ${yLow} L ${xStart} ${y} L ${xEnd} ${y}`;
                        } else {
                          const prevVal =
                            sig.stepSamples[s - 1] ?? sig.currentLogic ?? 0;
                          const prevY = prevVal === 1 ? yHigh : yLow;
                          if (prevY !== y) {
                            wavePath += ` L ${xStart} ${y}`;
                            fillPath += ` L ${xStart} ${y}`;
                          }
                          wavePath += ` L ${xEnd} ${y}`;
                          fillPath += ` L ${xEnd} ${y}`;
                        }
                        if (s === totalSteps - 1) {
                          fillPath += ` L ${xEnd} ${yLow} Z`;
                        }
                      }

                      const isChannelTrigSource =
                        triggerConfig.enabled &&
                        (triggerConfig.primaryWireId === "ALL" ||
                          triggerConfig.primaryWireId === sig.wireId ||
                          (triggerConfig.usePatternMatrix &&
                            triggerConfig.channelConstraints[sig.wireId] &&
                            triggerConfig.channelConstraints[sig.wireId] !==
                              "X"));

                      return (
                        <g key={`la-row-${sig.wireId}`}>
                          {/* Row Divider */}
                          <line
                            x1={0}
                            y1={rowTop + channelRowHeight}
                            x2={svgWidth}
                            y2={rowTop + channelRowHeight}
                            stroke="#1e293b"
                            strokeWidth={1}
                          />

                          {/* Left Channel Label */}
                          <circle
                            cx={14}
                            cy={rowTop + 18}
                            r={4.5}
                            fill={sig.color}
                          />
                          <text
                            x={25}
                            y={rowTop + 21}
                            fill="#f8fafc"
                            style={{
                              fontSize: "11px",
                              fontFamily: "var(--font-mono)",
                              fontWeight: 700,
                            }}
                          >
                            LA{sig.channelIndex}:{" "}
                            {sig.netName.length > 20
                              ? sig.netName.slice(0, 19) + "…"
                              : sig.netName}
                          </text>
                          <text
                            x={25}
                            y={rowTop + 36}
                            fill="#64748b"
                            style={{
                              fontSize: "9.5px",
                              fontFamily: "var(--font-mono)",
                            }}
                          >
                            Stage {sig.stageDepth} · t_pd={sig.delayNs}ns · Now={" "}
                            {sig.currentLogic}
                            {isChannelTrigSource
                              ? ` · [TRIG ${triggerConfig.primaryCondition}]`
                              : ""}
                          </text>

                          {/* Logic 1 / 0 reference guide lines */}
                          <line
                            x1={labelColWidth}
                            y1={yHigh}
                            x2={svgWidth}
                            y2={yHigh}
                            stroke="#1e293b"
                            strokeDasharray="2 4"
                            strokeWidth={0.7}
                          />
                          <line
                            x1={labelColWidth}
                            y1={yLow}
                            x2={svgWidth}
                            y2={yLow}
                            stroke="#1e293b"
                            strokeDasharray="2 4"
                            strokeWidth={0.7}
                          />

                          {/* Shaded logic HIGH area */}
                          <path
                            d={fillPath}
                            fill={sig.color}
                            fillOpacity={0.11}
                          />

                          {/* Crisp Digital Timing Trace */}
                          <path
                            d={wavePath}
                            fill="none"
                            stroke={sig.color}
                            strokeWidth={2.2}
                          />

                          {/* Per-step logic bit labels & edge transition arrows */}
                          {Array.from({ length: totalSteps }).map((_, sIdx) => {
                            const bit =
                              sig.stepSamples[sIdx] ?? sig.currentLogic ?? 0;
                            const prevBit =
                              sIdx > 0
                                ? sig.stepSamples[sIdx - 1] ?? 0
                                : bit;
                            const xEdge =
                              labelColWidth + sIdx * stepWidth + skewPx;
                            const xCenter =
                              labelColWidth + (sIdx + 0.5) * stepWidth;

                            return (
                              <g key={`bit-${sig.wireId}-${sIdx}`}>
                                {/* Rising / Falling Transition Marker on Wire */}
                                {sIdx > 0 && prevBit !== bit && (
                                  <circle
                                    cx={xEdge}
                                    cy={(yHigh + yLow) / 2}
                                    r={3}
                                    fill={sig.color}
                                  />
                                )}
                                <text
                                  x={xCenter}
                                  y={bit === 1 ? yHigh + 11 : yLow - 4}
                                  textAnchor="middle"
                                  fill={bit === 1 ? sig.color : "#475569"}
                                  style={{
                                    fontSize: "9px",
                                    fontFamily: "var(--font-mono)",
                                    fontWeight: bit === 1 ? 700 : 500,
                                  }}
                                >
                                  {bit}
                                </text>
                              </g>
                            );
                          })}
                        </g>
                      );
                    })}

                    {/* Full-Height Synchronized Clock Edge Vertical Guidelines & Setup/Hold Zones */}
                    {synchronizedClockEdges.map((edge, idx) => {
                      const xEdge = labelColWidth + edge.stepIndex * stepWidth;
                      const isRising = edge.edgeType === "RISING";
                      const edgeColor = isRising ? "#22d3ee" : "#f472b6";

                      return (
                        <g
                          key={`sync-edge-${idx}`}
                          className="pointer-events-none"
                        >
                          {/* Setup (t_su) and Hold (t_h) Window Shading around active Clock Edge */}
                          {showSetupHoldZones && (
                            <rect
                              x={xEdge - 7}
                              y={headerHeight}
                              width={14}
                              height={svgHeight - headerHeight}
                              fill={
                                isRising
                                  ? "rgba(34, 211, 238, 0.07)"
                                  : "rgba(244, 114, 182, 0.07)"
                              }
                            />
                          )}

                          {/* Synchronized Vertical Clock Edge Laser Line */}
                          <line
                            x1={xEdge}
                            y1={headerHeight}
                            x2={xEdge}
                            y2={svgHeight}
                            stroke={edgeColor}
                            strokeWidth={1.3}
                            strokeDasharray="4 3"
                            opacity={0.8}
                          />

                          {/* Clock Edge Arrow Marker on Clock Track */}
                          <polygon
                            points={
                              isRising
                                ? `${xEdge},${headerHeight + 10} ${
                                    xEdge - 4
                                  },${headerHeight + 18} ${xEdge + 4},${
                                    headerHeight + 18
                                  }`
                                : `${xEdge},${
                                    headerHeight + clockRowHeight - 10
                                  } ${xEdge - 4},${
                                    headerHeight + clockRowHeight - 18
                                  } ${xEdge + 4},${
                                    headerHeight + clockRowHeight - 18
                                  }`
                            }
                            fill={edgeColor}
                          />

                          <text
                            x={xEdge + 3}
                            y={headerHeight + 11}
                            fill={edgeColor}
                            style={{
                              fontSize: "8.5px",
                              fontFamily: "var(--font-mono)",
                              fontWeight: 700,
                            }}
                          >
                            {isRising
                              ? `↑C${edge.cycleNumber}`
                              : `↓C${edge.cycleNumber}`}
                          </text>
                        </g>
                      );
                    })}

                    {/* Hardware Trigger T=0 Reference Anchor Line */}
                    {triggerEval.primaryTriggerStep !== null && (
                      <g className="pointer-events-none">
                        {(() => {
                          const xTrig =
                            labelColWidth +
                            triggerEval.primaryTriggerStep * stepWidth;
                          return (
                            <>
                              <line
                                x1={xTrig}
                                y1={headerHeight}
                                x2={xTrig}
                                y2={svgHeight}
                                stroke="#10b981"
                                strokeWidth={2.2}
                              />
                              <rect
                                x={xTrig + 3}
                                y={headerHeight + 4}
                                width={86}
                                height={17}
                                rx={4}
                                fill="#064e3b"
                                stroke="#10b981"
                                strokeWidth={1.2}
                              />
                              <text
                                x={xTrig + 46}
                                y={headerHeight + 15}
                                textAnchor="middle"
                                fill="#6ee7b7"
                                style={{
                                  fontSize: "9px",
                                  fontFamily: "var(--font-mono)",
                                  fontWeight: 700,
                                }}
                              >
                                TRIG T=0 (S
                                {stepLabels[triggerEval.primaryTriggerStep] ??
                                  triggerEval.primaryTriggerStep + 1}
                                )
                              </text>
                            </>
                          );
                        })()}
                      </g>
                    )}

                    {/* Dual Timing Cursors T1 (Cursor A) & T2 (Cursor B) */}
                    {[
                      {
                        id: "A",
                        step: safeCursorA,
                        color: "#f59e0b",
                        label: `T1 (S${stepLabels[safeCursorA] ?? safeCursorA + 1})`,
                      },
                      {
                        id: "B",
                        step: safeCursorB,
                        color: "#a855f7",
                        label: `T2 (S${stepLabels[safeCursorB] ?? safeCursorB + 1})`,
                      },
                    ].map((cur) => {
                      const xPos =
                        labelColWidth + cur.step * stepWidth + stepWidth / 2;
                      return (
                        <g key={cur.id} className="pointer-events-none">
                          <line
                            x1={xPos}
                            y1={headerHeight}
                            x2={xPos}
                            y2={svgHeight}
                            stroke={cur.color}
                            strokeWidth={1.8}
                          />
                          <rect
                            x={xPos - 26}
                            y={svgHeight - 22}
                            width={52}
                            height={18}
                            rx={4}
                            fill="#090d16"
                            stroke={cur.color}
                            strokeWidth={1.2}
                          />
                          <text
                            x={xPos}
                            y={svgHeight - 10}
                            textAnchor="middle"
                            fill={cur.color}
                            style={{
                              fontSize: "9.5px",
                              fontFamily: "var(--font-mono)",
                              fontWeight: 700,
                            }}
                          >
                            {cur.label}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>
              )}
            </div>

            {/* Bottom Dual-Cursor & Synchronized Clock Telemetry Bar */}
            <div className="px-5 py-3 bg-[#0f172a] border-t border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
              <div className="flex flex-wrap items-center gap-4">
                <span className="inline-flex items-center gap-1.5 text-amber-300 font-semibold">
                  <Crosshair className="w-3.5 h-3.5" />
                  Cursor T1: Step {stepLabels[safeCursorA] ?? safeCursorA + 1} (
                  {Math.round(safeCursorA * halfCycleMs)}ms)
                </span>
                <span className="inline-flex items-center gap-1.5 text-purple-300 font-semibold">
                  <Crosshair className="w-3.5 h-3.5" />
                  Cursor T2: Step {stepLabels[safeCursorB] ?? safeCursorB + 1} (
                  {Math.round(safeCursorB * halfCycleMs)}ms)
                </span>
                <span className="text-slate-400">·</span>
                <span className="text-cyan-300 font-bold">
                  ΔSteps = {deltaSteps} ({deltaClockCycles.toFixed(1)} Clock
                  Cycles · Δt = {Math.round(deltaTimeMs)} ms)
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-slate-400">
                <span className="inline-flex items-center gap-1 text-cyan-300">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  Click any step column header to place Cursor{" "}
                  {activeCursor === "A" ? "T1" : "T2"}
                </span>
                <span>·</span>
                <button
                  type="button"
                  onClick={() => setIsTriggerModalOpen(true)}
                  className="inline-flex items-center gap-1 text-amber-300 hover:text-amber-200 underline decoration-amber-500/40 cursor-pointer"
                >
                  <ArrowDownRight className="w-3.5 h-3.5" />
                  Trigger Matches: {triggerHitSteps.size} (Configure Trigger)
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dedicated Hardware Logic Analyzer Trigger Settings Modal */}
      <LogicAnalyzerTriggerModal
        isOpen={isTriggerModalOpen}
        onClose={() => setIsTriggerModalOpen(false)}
        config={triggerConfig}
        onChangeConfig={setTriggerConfig}
        subscribedSignals={subscribedSignals}
        triggerEval={triggerEval}
        isArmed={isTriggerArmed}
        onArmTrigger={handleArmTrigger}
        onForceTrigger={handleForceTrigger}
        onRunTriggeredBurst={handleRunTriggeredBurst}
        onResetTriggerConfig={() => {
          setForcedTriggerStep(null);
          setFrozenSignalsSnapshot(null);
          setIsTriggerArmed(true);
          setTriggerConfig(DEFAULT_LA_TRIGGER_CONFIG);
        }}
        clockHz={clockHz}
      />
    </div>
  );
};

export default LogicAnalyzerModal;
