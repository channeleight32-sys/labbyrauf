import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Activity,
  Play,
  Pause,
  RotateCcw,
  Sliders,
  Zap,
  Crosshair,
  Eye,
  Download,
  Check,
  Grid,
  Layers,
  Sparkles,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Gauge,
  HelpCircle,
  MoveHorizontal,
  MoveVertical,
  Maximize2,
} from "lucide-react";
import {
  usePrefersReducedMotion,
  usePageVisibility,
} from "../utils/animationHelpers";
import OscilloscopeSignalAnalysisPanel, {
  type FftChannelInput,
} from "./OscilloscopeSignalAnalysisPanel";

export type OscilloscopeGridStyle =
  | "full"
  | "crosshair"
  | "dotted"
  | "framed"
  | "none";
export type OscilloscopeGridTheme = "cyan" | "green" | "amber" | "slate";

export const GRID_PALETTES: Record<
  OscilloscopeGridTheme,
  {
    name: string;
    majorLine: string;
    minorLine: string;
    axisLine: string;
    subTick: string;
    glow: string;
    border: string;
    accent: string;
    badgeBg: string;
  }
> = {
  cyan: {
    name: "Modern Cyan",
    majorLine: "rgba(6, 182, 212, 0.4)",
    minorLine: "rgba(6, 182, 212, 0.16)",
    axisLine: "rgba(34, 211, 238, 0.75)",
    subTick: "rgba(6, 182, 212, 0.48)",
    glow: "rgba(6, 182, 212, 0.15)",
    border: "#0e7490",
    accent: "#22d3ee",
    badgeBg: "rgba(6, 182, 212, 0.12)",
  },
  green: {
    name: "CRT Phosphor",
    majorLine: "rgba(34, 197, 94, 0.44)",
    minorLine: "rgba(34, 197, 94, 0.18)",
    axisLine: "rgba(74, 222, 128, 0.8)",
    subTick: "rgba(34, 197, 94, 0.52)",
    glow: "rgba(34, 197, 94, 0.16)",
    border: "#15803d",
    accent: "#4ade80",
    badgeBg: "rgba(34, 197, 94, 0.12)",
  },
  amber: {
    name: "Warm Amber",
    majorLine: "rgba(245, 158, 11, 0.44)",
    minorLine: "rgba(245, 158, 11, 0.18)",
    axisLine: "rgba(251, 191, 36, 0.8)",
    subTick: "rgba(245, 158, 11, 0.52)",
    glow: "rgba(245, 158, 11, 0.16)",
    border: "#b45309",
    accent: "#fbbf24",
    badgeBg: "rgba(245, 158, 11, 0.12)",
  },
  slate: {
    name: "Laboratory Slate",
    majorLine: "rgba(148, 163, 184, 0.35)",
    minorLine: "rgba(148, 163, 184, 0.14)",
    axisLine: "rgba(203, 213, 225, 0.7)",
    subTick: "rgba(148, 163, 184, 0.4)",
    glow: "rgba(148, 163, 184, 0.1)",
    border: "#475569",
    accent: "#cbd5e1",
    badgeBg: "rgba(148, 163, 184, 0.12)",
  },
};

export interface OscilloscopeChannel {
  id: string; // e.g. "node:1:0"
  label: string; // e.g. "IN: A"
  shortLabel: string; // e.g. "A"
  category: "input" | "gate" | "seq" | "output";
  color: string;
  nodeId: number;
  port: number;
}

export interface OscilloscopeSample {
  step: number;
  signals: Record<string, number>;
}

interface DigitalOscilloscopeProps {
  channels: OscilloscopeChannel[];
  history: OscilloscopeSample[];
  onClearTrace: () => void;
  onStepClock: () => void;
  onRunPatternSweep: () => void;
  selectedNodeId?: number | null;
  onSelectNode?: (nodeId: number) => void;
  gateDelayNs?: number;
  clockHz?: number;
  isSimRunning?: boolean;
  onToggleSimRunning?: () => void;
}

function DigitalOscilloscopeInner({
  channels,
  history,
  onClearTrace,
  onStepClock,
  onRunPatternSweep,
  selectedNodeId,
  onSelectNode,
  gateDelayNs = 10,
  clockHz = 2,
  isSimRunning = true,
  onToggleSimRunning,
}: DigitalOscilloscopeProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const isPageVisible = usePageVisibility();

  // Pause / Freeze Scope capture & Horizontal Pan
  const [isScopePaused, setIsScopePaused] = useState<boolean>(false);
  const [frozenSnapshot, setFrozenSnapshot] = useState<OscilloscopeSample[] | null>(null);
  const [panStepOffset, setPanStepOffset] = useState<number>(0);

  // Trigger controls (Source, Edge, Level V, Mode)
  const [triggerEdge, setTriggerEdge] = useState<"RISING" | "FALLING">("RISING");
  const [triggerLevelV, setTriggerLevelV] = useState<number>(2.5);
  const [triggerMode, setTriggerMode] = useState<"AUTO" | "NORMAL">("AUTO");
  const [sweepProgress, setSweepProgress] = useState<number>(0);

  // User-toggled hidden channels (by default, show up to 10 channels automatically)
  const [hiddenChannelIds, setHiddenChannelIds] = useState<Set<string>>(
    new Set()
  );
  // Timebase scale (ns per simulation step)
  const [nsPerStep, setNsPerStep] = useState<number>(10);
  // Horizontal zoom (pixels per step)
  const [pxPerStep, setPxPerStep] = useState<number>(34);
  // Vertical Volts per Division (1V/div, 2V/div, 2.5V/div, 5V/div)
  const [voltsPerDiv, setVoltsPerDiv] = useState<number>(2.5);
  // Auto-Scale confirmation toast/badge
  const [autoScaleNotice, setAutoScaleNotice] = useState<string | null>(null);
  // Analog slew / propagation delay rendering vs ideal square wave
  const [analogSlewMode, setAnalogSlewMode] = useState<boolean>(true);
  // Dual measurement cursors (step indices & voltage levels)
  const [cursorA, setCursorA] = useState<number>(0);
  const [cursorB, setCursorB] = useState<number>(4);
  const [cursorV1, setCursorV1] = useState<number>(4.2); // Volts (0 to 5V)
  const [cursorV2, setCursorV2] = useState<number>(0.8); // Volts (0 to 5V)
  const [cursorType, setCursorType] = useState<"ALL" | "TIME" | "VOLTAGE">("ALL");
  const [activeCursorDrag, setActiveCursorDrag] = useState<
    "A" | "B" | "V1" | "V2" | null
  >(null);
  const [showCursors, setShowCursors] = useState<boolean>(true);

  // Configurable Grid Overlay & Measurement Controls
  const [gridStyle, setGridStyle] = useState<OscilloscopeGridStyle>("full");
  const [gridIntensity, setGridIntensity] = useState<number>(65); // 20% to 100%
  const [gridTheme, setGridTheme] = useState<OscilloscopeGridTheme>("cyan");
  const [showSubdivisions, setShowSubdivisions] = useState<boolean>(true);
  const [showPeriodOverlay, setShowPeriodOverlay] = useState<boolean>(true);
  const [targetAnalysisChannelId, setTargetAnalysisChannelId] = useState<string | null>(null);
  const [isGridSettingsOpen, setIsGridSettingsOpen] = useState<boolean>(false);

  const visibleChannels = useMemo(() => {
    return channels.filter((ch) => !hiddenChannelIds.has(ch.id));
  }, [channels, hiddenChannelIds]);

  const [csvExportSuccess, setCsvExportSuccess] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const activeBuffer = isScopePaused && frozenSnapshot ? frozenSnapshot : history;

  // Apply Horizontal Pan slice
  const displayHistory = useMemo(() => {
    if (panStepOffset <= 0 || panStepOffset >= activeBuffer.length) {
      return activeBuffer;
    }
    return activeBuffer.slice(panStepOffset);
  }, [activeBuffer, panStepOffset]);

  const dsoFftChannels: FftChannelInput[] = useMemo(() => {
    return visibleChannels.map((ch) => ({
      id: ch.id,
      label: ch.shortLabel || ch.label,
      color: ch.color,
      samples: displayHistory.map((pt) => ((pt.signals[ch.id] ?? 0) === 1 ? 5.0 : 0.0)),
    }));
  }, [visibleChannels, displayHistory]);

  const dsoFftSampleRateHz = 1 / (Math.max(1, nsPerStep) * 1e-9);

  // Smooth RAF-driven live phosphor scanline when running & unpaused
  useEffect(() => {
    if (
      isScopePaused ||
      !isSimRunning ||
      prefersReducedMotion ||
      !isPageVisible ||
      displayHistory.length === 0
    ) {
      return;
    }
    let rafId = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      setSweepProgress((p) => (p + dt * 0.45) % 1);
      rafId = window.requestAnimationFrame(tick);
    };
    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [isScopePaused, isSimRunning, prefersReducedMotion, isPageVisible, displayHistory.length]);

  React.useEffect(() => {
    if (history.length > 0 && visibleChannels.length > 0) {
      setExportNotice(null);
    }
  }, [history.length, visibleChannels.length]);

  // Export captured DSO waveform history as CSV with timestamp and logic state columns
  const handleExportCsv = () => {
    if (history.length === 0 || visibleChannels.length === 0) {
      setExportNotice(
        "No waveform history recorded yet. Click 'Sweep Test Vectors' or 'Sample Step' to capture data before exporting CSV."
      );
      return;
    }
    setExportNotice(null);

    const lines: string[] = [];

    // Clean Row-1 CSV Headers for direct Excel / MATLAB readtable() import
    const headers = [
      "Simulation_Step",
      "Timestamp_ns",
      "Time_us",
      ...visibleChannels.flatMap((c) => [
        `"${c.label.replace(/"/g, '""')}_LogicState"`,
        `"${c.label.replace(/"/g, '""')}_Voltage_V"`,
      ]),
    ];
    lines.push(headers.join(","));

    for (const sample of history) {
      const step = sample.step;
      const t_ns = step * nsPerStep;
      const t_us = (t_ns / 1000).toFixed(4);
      const row: (string | number)[] = [step, t_ns, t_us];

      for (const c of visibleChannels) {
        const val = sample.signals[c.id] ?? 0;
        const logicState = val === 1 ? 1 : 0;
        const voltage = logicState === 1 ? 5.0 : 0.0;
        row.push(logicState);
        row.push(voltage.toFixed(1));
      }
      lines.push(row.join(","));
    }

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `dso_waveforms_${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setCsvExportSuccess(true);
    setTimeout(() => setCsvExportSuccess(false), 2500);
  };

  const toggleChannel = (id: string) => {
    setHiddenChannelIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const totalSamples = displayHistory.length;
  const clampedCursorA = Math.min(
    Math.max(0, cursorA),
    Math.max(0, totalSamples - 1)
  );
  const clampedCursorB = Math.min(
    Math.max(0, cursorB),
    Math.max(0, totalSamples - 1)
  );

  const deltaSteps = Math.abs(clampedCursorB - clampedCursorA);
  const deltaTimeNs = deltaSteps * nsPerStep;
  const eqFreqMHz =
    deltaTimeNs > 0 ? (1000 / deltaTimeNs).toFixed(2) : "—";

  // Compute per-channel statistics (Duty Cycle %, Rising Edges, Falling Edges, Current State)
  const channelStats = useMemo(() => {
    const map = new Map<
      string,
      {
        highPct: number;
        risingEdges: number;
        fallingEdges: number;
        latest: number;
        valAtA: number;
        valAtB: number;
      }
    >();

    for (const ch of channels) {
      if (displayHistory.length === 0) {
        map.set(ch.id, {
          highPct: 0,
          risingEdges: 0,
          fallingEdges: 0,
          latest: 0,
          valAtA: 0,
          valAtB: 0,
        });
        continue;
      }

      let highCount = 0;
      let rising = 0;
      let falling = 0;

      displayHistory.forEach((pt, idx) => {
        const v = pt.signals[ch.id] ?? 0;
        if (v === 1) highCount++;
        if (idx > 0) {
          const prev = displayHistory[idx - 1].signals[ch.id] ?? 0;
          if (prev === 0 && v === 1) rising++;
          if (prev === 1 && v === 0) falling++;
        }
      });

      const latest = displayHistory[displayHistory.length - 1]?.signals[ch.id] ?? 0;
      const valAtA = displayHistory[clampedCursorA]?.signals[ch.id] ?? 0;
      const valAtB = displayHistory[clampedCursorB]?.signals[ch.id] ?? 0;

      map.set(ch.id, {
        highPct: Math.round((highCount / displayHistory.length) * 100),
        risingEdges: rising,
        fallingEdges: falling,
        latest,
        valAtA,
        valAtB,
      });
    }

    return map;
  }, [channels, displayHistory, clampedCursorA, clampedCursorB]);

  // Active target channel for fundamental period & timing analysis
  const activeAnalysisChannel = useMemo(() => {
    if (targetAnalysisChannelId) {
      const found = channels.find((c) => c.id === targetAnalysisChannelId);
      if (found) return found;
    }
    if (selectedNodeId) {
      const byNode = channels.find((c) => c.nodeId === selectedNodeId);
      if (byNode) return byNode;
    }
    return visibleChannels[0] || channels[0] || null;
  }, [channels, visibleChannels, targetAnalysisChannelId, selectedNodeId]);

  const activeRowIdx = useMemo(() => {
    if (activeAnalysisChannel) {
      const idx = visibleChannels.findIndex((c) => c.id === activeAnalysisChannel.id);
      if (idx >= 0) return idx;
    }
    return 0;
  }, [visibleChannels, activeAnalysisChannel]);

  // Automatic Signal Analysis: Detect fundamental period T and pulse width tw
  const autoPeriodAnalysis = useMemo(() => {
    if (!activeAnalysisChannel || displayHistory.length < 2) return null;
    const chId = activeAnalysisChannel.id;

    const risingSteps: number[] = [];
    const fallingSteps: number[] = [];

    for (let i = 1; i < displayHistory.length; i++) {
      const prev = displayHistory[i - 1].signals[chId] ?? 0;
      const curr = displayHistory[i].signals[chId] ?? 0;
      if (prev === 0 && curr === 1) {
        risingSteps.push(i);
      } else if (prev === 1 && curr === 0) {
        fallingSteps.push(i);
      }
    }

    let periodSteps = 0;
    let startStep = 0;
    let endStep = 0;
    let pulseWidthSteps = 0;

    if (risingSteps.length >= 2) {
      startStep = risingSteps[0];
      endStep = risingSteps[1];
      periodSteps = endStep - startStep;
    } else if (risingSteps.length === 1 && displayHistory.length > risingSteps[0] + 1) {
      startStep = risingSteps[0];
      endStep = Math.min(displayHistory.length - 1, startStep + 4);
      periodSteps = endStep - startStep;
    }

    if (risingSteps.length >= 1 && fallingSteps.length >= 1) {
      const nextFalling = fallingSteps.find((f) => f > risingSteps[0]);
      if (nextFalling !== undefined) {
        pulseWidthSteps = nextFalling - risingSteps[0];
      }
    }

    const periodNs = periodSteps * nsPerStep;
    const pulseWidthNs = pulseWidthSteps * nsPerStep;
    const freqMHz = periodNs > 0 ? (1000 / periodNs).toFixed(2) : "—";
    const dutyPct =
      periodNs > 0 && pulseWidthNs > 0
        ? Math.round((pulseWidthNs / periodNs) * 100)
        : null;

    return {
      startStep,
      endStep,
      periodSteps,
      periodNs,
      pulseWidthNs,
      freqMHz,
      dutyPct,
      risingCount: risingSteps.length,
      fallingCount: fallingSteps.length,
    };
  }, [activeAnalysisChannel, displayHistory, nsPerStep]);

  // Real Trigger Lock Detection on active channel & triggerLevelV (0-5V)
  const triggerMatchStep = useMemo(() => {
    if (!activeAnalysisChannel || displayHistory.length < 2) return null;
    const chId = activeAnalysisChannel.id;
    const normThresh = triggerLevelV / 5.0;
    for (let i = 1; i < displayHistory.length; i++) {
      const prevV = displayHistory[i - 1].signals[chId] ?? 0;
      const currV = displayHistory[i].signals[chId] ?? 0;
      if (triggerEdge === "RISING" && prevV < normThresh && currV >= normThresh) {
        return i;
      }
      if (triggerEdge === "FALLING" && prevV >= normThresh && currV < normThresh) {
        return i;
      }
    }
    return null;
  }, [activeAnalysisChannel, displayHistory, triggerEdge, triggerLevelV]);

  const isTriggerArmed = triggerMode === "AUTO" || triggerMatchStep !== null;

  // Quick Auto-Scale: Automatically adjusts the timebase and voltage per division to fit the displayed waveform
  const handleQuickAutoScale = () => {
    if (visibleChannels.length === 0) {
      setHiddenChannelIds(new Set());
    }

    // 1. Analyze frequency / period across active channels
    let detectedPeriodSteps = 0;
    if (autoPeriodAnalysis && autoPeriodAnalysis.periodSteps > 0) {
      detectedPeriodSteps = autoPeriodAnalysis.periodSteps;
    } else {
      // Scan all visible channels for transitions
      for (const ch of visibleChannels) {
        const stats = channelStats.get(ch.id);
        if (stats && (stats.risingEdges > 0 || stats.fallingEdges > 0)) {
          const totalEdges = stats.risingEdges + stats.fallingEdges;
          if (totalEdges > 1 && totalSamples > 2) {
            detectedPeriodSteps = Math.max(2, Math.round((totalSamples - 1) / (stats.risingEdges || 1)));
            break;
          }
        }
      }
    }

    // 2. Select optimal Timebase & Zoom so 2-4 periods or the full waveform comfortably fill the screen
    let optimalNs = 10;
    let optimalPx = 34;

    if (detectedPeriodSteps > 0) {
      if (detectedPeriodSteps <= 4) {
        optimalNs = 5;
        optimalPx = 54;
      } else if (detectedPeriodSteps <= 10) {
        optimalNs = 10;
        optimalPx = 40;
      } else {
        optimalNs = 25;
        optimalPx = 28;
      }
    } else if (totalSamples > 0) {
      if (totalSamples <= 8) {
        optimalPx = 54;
        optimalNs = 5;
      } else if (totalSamples <= 18) {
        optimalPx = 40;
        optimalNs = 10;
      } else {
        optimalPx = 28;
        optimalNs = 25;
      }
    }

    // 3. Set Voltage Per Division: Standard 5V digital logic fits best at 2.5V/div (2 vertical divisions)
    const optimalVoltsPerDiv = 2.5;

    setNsPerStep(optimalNs);
    setPxPerStep(optimalPx);
    setVoltsPerDiv(optimalVoltsPerDiv);

    // 4. Align measurement cursors to full logic swing (0V to 5V) and active cycle
    setCursorV1(5.0);
    setCursorV2(0.0);

    if (autoPeriodAnalysis && autoPeriodAnalysis.periodSteps > 0) {
      setCursorA(autoPeriodAnalysis.startStep);
      setCursorB(autoPeriodAnalysis.endStep);
    } else if (totalSamples > 0) {
      setCursorA(0);
      setCursorB(Math.min(totalSamples - 1, Math.max(1, Math.round(totalSamples * 0.75))));
    }

    setShowCursors(true);
    setCursorType("ALL");
    setShowPeriodOverlay(true);

    const msg = `Auto-Scaled: ${optimalNs} ns/div timebase · ${optimalVoltsPerDiv} V/div · Waveform fitted`;
    setAutoScaleNotice(msg);
    setTimeout(() => {
      setAutoScaleNotice(null);
    }, 3000);
  };

  // Action: Snap Cursors to 1 Period (T)
  const handleSnapToPeriod = () => {
    if (!autoPeriodAnalysis || autoPeriodAnalysis.periodSteps === 0) {
      setCursorA(0);
      setCursorB(Math.min(totalSamples - 1, 4));
    } else {
      setCursorA(autoPeriodAnalysis.startStep);
      setCursorB(autoPeriodAnalysis.endStep);
    }
    setShowCursors(true);
    setCursorType("TIME");
    setShowPeriodOverlay(true);
  };

  // Action: Snap Cursors to Pulse Width (tw)
  const handleSnapToPulseWidth = () => {
    if (!autoPeriodAnalysis) return;
    setCursorA(autoPeriodAnalysis.startStep);
    if (autoPeriodAnalysis.pulseWidthNs > 0) {
      const pwSteps = Math.round(autoPeriodAnalysis.pulseWidthNs / nsPerStep);
      setCursorB(Math.min(totalSamples - 1, autoPeriodAnalysis.startStep + pwSteps));
    } else {
      setCursorB(Math.min(totalSamples - 1, autoPeriodAnalysis.startStep + 2));
    }
    setShowCursors(true);
    setCursorType("TIME");
    setShowPeriodOverlay(true);
  };

  const activeGridPalette = GRID_PALETTES[gridTheme];

  // SVG Layout dimensions
  const leftLabelW = 165;
  const rightStatsW = 135;
  const topRulerH = 30;
  const rowH = 46;
  const minStepsShown = Math.max(totalSamples, 18);
  const traceAreaW = Math.max(minStepsShown * pxPerStep, 520);
  const svgW = leftLabelW + traceAreaW + rightStatsW;
  const svgH = topRulerH + Math.max(1, visibleChannels.length) * rowH + 16;

  const handleSvgPointer = (
    clientX: number,
    clientY: number,
    targetCursor?: "A" | "B" | "V1" | "V2"
  ) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const which = targetCursor || activeCursorDrag;
    if (!which) return;

    if (which === "A" || which === "B") {
      if (totalSamples === 0) return;
      const scaleX = svgW / rect.width;
      const relX = (clientX - rect.left) * scaleX - leftLabelW;
      const stepIdx = Math.max(0, Math.min(totalSamples - 1, Math.floor(relX / pxPerStep)));
      if (which === "A") setCursorA(stepIdx);
      else setCursorB(stepIdx);
    } else if (which === "V1" || which === "V2") {
      const scaleY = svgH / rect.height;
      const ySvg = (clientY - rect.top) * scaleY;
      const yLaneTop = topRulerH + activeRowIdx * rowH;
      const yLaneHigh = yLaneTop + 10;
      const yLaneLow = yLaneTop + rowH - 10;
      const ratio = Math.max(
        0,
        Math.min(1, (yLaneLow - ySvg) / Math.max(1, yLaneLow - yLaneHigh))
      );
      const v = Math.round(ratio * 50) / 10;
      if (which === "V1") setCursorV1(v);
      else setCursorV2(v);
    }
  };

  return (
    <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 space-y-4">
      {/* Top Oscilloscope Header & Instrument Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/40 flex items-center justify-center">
            <Activity className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-tight">
                Multi-Channel Digital Storage Oscilloscope (DSO)
              </h3>
              <span className="px-2 py-0.5 text-[10px] font-mono font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 rounded">
                {visibleChannels.length}/{channels.length} CHANNELS ARMED
              </span>
              <span className="px-2 py-0.5 text-[10px] font-mono font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 rounded">
                {autoPeriodAnalysis && autoPeriodAnalysis.freqMHz !== "—"
                  ? `f = ${autoPeriodAnalysis.freqMHz} MHz · 5.0 Vpp`
                  : `t_pd = ${gateDelayNs} ns/gate · f_clk = ${clockHz} Hz`}
              </span>
              <span
                className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded border ${
                  isScopePaused
                    ? "bg-amber-500/15 text-amber-300 border-amber-500/40"
                    : triggerMatchStep !== null
                    ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/40"
                    : "bg-slate-800 text-slate-300 border-slate-700"
                }`}
              >
                {isScopePaused
                  ? "HOLD (FROZEN)"
                  : triggerMatchStep !== null
                  ? `TRIG'D @ ${(triggerMatchStep + panStepOffset) * nsPerStep}ns`
                  : triggerMode === "AUTO"
                  ? "AUTO RUN"
                  : "WAIT TRIG"}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Simultaneous time-domain logic &amp; propagation-slew traces across
              inputs, internal logic gates, sequential flip-flops, and outputs.
            </p>
          </div>
        </div>

        {/* Oscilloscope Action & Timebase Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Pause / Resume Live Trace Capture */}
          <button
            type="button"
            onClick={() => {
              if (!isScopePaused) {
                setFrozenSnapshot(history);
                setIsScopePaused(true);
              } else {
                setFrozenSnapshot(null);
                setIsScopePaused(false);
              }
            }}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold border transition-colors cursor-pointer whitespace-nowrap ${
              isScopePaused
                ? "bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/50"
                : "bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border-emerald-500/40"
            }`}
            title={isScopePaused ? "Resume live waveform capture" : "Pause / Freeze current oscilloscope trace"}
          >
            {isScopePaused ? <Play className="w-3.5 h-3.5 fill-amber-300" /> : <Pause className="w-3.5 h-3.5" />}
            <span>{isScopePaused ? "Resume" : "Pause"}</span>
          </button>

          {onToggleSimRunning && (
            <button
              type="button"
              onClick={onToggleSimRunning}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold border transition-colors cursor-pointer whitespace-nowrap ${
                isSimRunning
                  ? "bg-slate-800 text-emerald-300 border-emerald-500/40 hover:bg-slate-700"
                  : "bg-amber-500/15 text-amber-300 border-amber-500/40 hover:bg-amber-500/25"
              }`}
              title="Toggle Circuit Simulator RUN/STOP"
            >
              <span>{isSimRunning ? "Sim: RUN" : "Sim: STOP"}</span>
            </button>
          )}

          <button
            type="button"
            onClick={onRunPatternSweep}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-500/50 transition-colors cursor-pointer whitespace-nowrap"
            title="Automatically sweep input binary patterns or clock cycles to populate full timing traces"
          >
            <Zap className="w-3.5 h-3.5 text-cyan-300" />
            Sweep Test Vectors
          </button>

          <button
            type="button"
            onClick={onStepClock}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Play className="w-3 h-3 text-emerald-400" />
            Sample Step
          </button>

          {/* Quick Auto-Scale Button */}
          <button
            type="button"
            onClick={() => {
              setPanStepOffset(0);
              handleQuickAutoScale();
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold bg-gradient-to-r from-cyan-500/25 via-blue-500/25 to-indigo-500/25 hover:from-cyan-500/35 hover:to-indigo-500/35 text-cyan-200 border border-cyan-400/60 shadow-[0_0_12px_rgba(6,182,212,0.25)] transition-all cursor-pointer whitespace-nowrap active:scale-95"
            title="Quick Auto-Scale: Automatically adjusts the timebase and voltage per division to fit the displayed waveform"
          >
            <Maximize2 className="w-3.5 h-3.5 text-cyan-300" />
            <span>Quick Auto-Scale</span>
          </button>

          {/* Timebase selector */}
          <div
            className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-[11px] font-mono"
            title="Oscilloscope Horizontal Timebase (nanoseconds per division)"
          >
            <span className="text-[9.5px] text-slate-500 font-semibold px-1.5 uppercase">T:</span>
            {[5, 10, 25].map((ns) => (
              <button
                key={ns}
                type="button"
                onClick={() => setNsPerStep(ns)}
                className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                  nsPerStep === ns
                    ? "bg-cyan-500/20 text-cyan-300 font-semibold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {ns}ns/div
              </button>
            ))}
          </div>

          {/* Vertical Volts per Division selector */}
          <div
            className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-[11px] font-mono"
            title="Oscilloscope Vertical Voltage Scale (volts per division)"
          >
            <span className="text-[9.5px] text-slate-500 font-semibold px-1.5 uppercase">V:</span>
            {[1, 2, 2.5, 5].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setVoltsPerDiv(v)}
                className={`px-1.5 py-1 rounded transition-colors cursor-pointer ${
                  voltsPerDiv === v
                    ? "bg-emerald-500/20 text-emerald-300 font-semibold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {v}V/div
              </button>
            ))}
          </div>

          {/* Horizontal Zoom */}
          <div
            className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-[11px] font-mono"
            title="Horizontal Trace Zoom"
          >
            {[
              { label: "1×", px: 28 },
              { label: "1.5×", px: 40 },
              { label: "2×", px: 54 },
            ].map((z) => (
              <button
                key={z.label}
                type="button"
                onClick={() => setPxPerStep(z.px)}
                className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                  pxPerStep === z.px
                    ? "bg-purple-500/20 text-purple-300 font-semibold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {z.label}
              </button>
            ))}
          </div>

          {/* Analog Gate Delay Slew vs Ideal Digital Step */}
          <button
            type="button"
            onClick={() => setAnalogSlewMode((v) => !v)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono border transition-colors cursor-pointer ${
              analogSlewMode
                ? "bg-amber-500/15 border-amber-500/40 text-amber-300"
                : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
            }`}
            title="Toggle realistic gate propagation delay & rise/fall slew visualization"
          >
            <Sliders className="w-3 h-3" />
            {analogSlewMode ? "Mode: Gate Slew (τpd)" : "Mode: Ideal Square"}
          </button>

          {/* Dual Cursors Toggle */}
          <button
            type="button"
            onClick={() => setShowCursors((v) => !v)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono border transition-colors cursor-pointer ${
              showCursors
                ? "bg-purple-500/15 border-purple-500/40 text-purple-300"
                : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
            }`}
            title="Toggle T1 / T2 Timing Measurement Cursors"
          >
            <Crosshair className="w-3 h-3" />
            Cursors
          </button>

          {/* Configurable Grid Overlay & Period Analysis Toggle */}
          <button
            type="button"
            onClick={() => setIsGridSettingsOpen((v) => !v)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono border transition-colors cursor-pointer ${
              isGridSettingsOpen || gridStyle !== "none"
                ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.15)]"
                : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
            }`}
            title="Configure Oscilloscope CRT Grid Overlays, Division Intensity & Period Measurement"
          >
            <Grid className="w-3.5 h-3.5 text-cyan-400" />
            <span>Grid Overlay</span>
            <ChevronDown
              className={`w-3 h-3 transition-transform ${
                isGridSettingsOpen ? "rotate-180 text-cyan-300" : "text-slate-500"
              }`}
            />
          </button>

          {/* Export Waveforms as CSV */}
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-500/40 transition-colors cursor-pointer whitespace-nowrap"
            title="Export captured waveform channels as CSV file with timestamp and logic state columns"
          >
            {csvExportSuccess ? (
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
            onClick={onClearTrace}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-mono text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            Clear
          </button>
        </div>
      </div>

      {/* Auto-Scale Confirmation Toast */}
      {autoScaleNotice && (
        <div className="flex items-center justify-between gap-3 px-3.5 py-2 rounded-lg bg-cyan-950/70 border border-cyan-400/50 text-cyan-200 text-xs font-mono shadow-[0_0_12px_rgba(6,182,212,0.2)]">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-300 animate-spin" />
            <span className="font-semibold">{autoScaleNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setAutoScaleNotice(null)}
            className="px-2 py-0.5 rounded bg-cyan-900/60 hover:bg-cyan-800 text-cyan-100 font-bold cursor-pointer shrink-0"
            aria-label="Dismiss auto-scale notice"
          >
            ×
          </button>
        </div>
      )}

      {/* Dismissible Notice Banner for CSV Export / Capture Validation */}
      {exportNotice && (
        <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-lg bg-amber-950/50 border border-amber-500/40 text-amber-200 text-xs font-mono">
          <span>{exportNotice}</span>
          <button
            type="button"
            onClick={() => setExportNotice(null)}
            className="px-2 py-0.5 rounded bg-amber-900/50 hover:bg-amber-800/70 text-amber-100 font-bold cursor-pointer shrink-0"
            aria-label="Dismiss notice"
          >
            ×
          </button>
        </div>
      )}

      {/* Multi-Node Channel Probe Selector Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-950/70 border border-slate-800/90 rounded-lg px-3.5 py-2.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 mr-1 inline-flex items-center gap-1">
            <Eye className="w-3 h-3 text-cyan-400" />
            Probed Nodes:
          </span>
          {channels.map((ch) => {
            const active = !hiddenChannelIds.has(ch.id);
            const isSelectedNode = selectedNodeId === ch.nodeId;
            return (
              <button
                key={ch.id}
                type="button"
                onClick={() => {
                  toggleChannel(ch.id);
                  if (onSelectNode) onSelectNode(ch.nodeId);
                }}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono border transition-all cursor-pointer ${
                  active
                    ? "bg-slate-900 text-white border-slate-700 shadow-xs"
                    : "bg-slate-950/40 text-slate-500 border-slate-800/60 opacity-60 hover:opacity-90"
                } ${isSelectedNode ? "ring-1 ring-cyan-400" : ""}`}
                title={`${ch.label} — Click to toggle oscilloscope channel probe`}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{
                    backgroundColor: active ? ch.color : "#475569",
                  }}
                />
                <span>{ch.label}</span>
              </button>
            );
          })}
        </div>

        {hiddenChannelIds.size > 0 && (
          <button
            type="button"
            onClick={() => setHiddenChannelIds(new Set())}
            className="text-[11px] font-mono text-cyan-400 hover:underline cursor-pointer"
          >
            Show All ({channels.length})
          </button>
        )}
      </div>

      {/* Trigger Controls & Horizontal Pan Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/75 border border-slate-800 rounded-lg px-3.5 py-2 text-[11px] font-mono">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-amber-300 font-bold uppercase">TRIG:</span>
          <select
            value={activeAnalysisChannel?.id || ""}
            onChange={(e) => setTargetAnalysisChannelId(e.target.value || null)}
            className="bg-slate-900 border border-slate-700 text-slate-200 rounded px-2 py-0.5 text-[11px]"
            title="Select trigger source channel"
          >
            {visibleChannels.map((ch) => (
              <option key={ch.id} value={ch.id}>
                {ch.label}
              </option>
            ))}
          </select>
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded p-0.5">
            {(["RISING", "FALLING"] as const).map((edge) => (
              <button
                key={edge}
                type="button"
                onClick={() => setTriggerEdge(edge)}
                className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                  triggerEdge === edge
                    ? "bg-amber-500/20 text-amber-300 font-bold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {edge === "RISING" ? "↑ Rising" : "↓ Falling"}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded px-2 py-0.5">
            <span className="text-slate-400">Level:</span>
            <input
              type="range"
              min={0.5}
              max={4.5}
              step={0.5}
              value={triggerLevelV}
              onChange={(e) => setTriggerLevelV(parseFloat(e.target.value))}
              className="w-16 accent-amber-400 cursor-pointer"
            />
            <span className="text-amber-300 font-bold tabular-nums w-9">
              {triggerLevelV.toFixed(1)}V
            </span>
          </div>
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded p-0.5">
            {(["AUTO", "NORMAL"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setTriggerMode(m)}
                className={`px-2 py-0.5 rounded cursor-pointer ${
                  triggerMode === m
                    ? "bg-cyan-500/20 text-cyan-300 font-bold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Horizontal Pan Offset */}
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400 uppercase flex items-center gap-1">
            <MoveHorizontal className="w-3 h-3 text-cyan-400" />
            Pan:
          </span>
          <button
            type="button"
            disabled={panStepOffset <= 0}
            onClick={() => setPanStepOffset((p) => Math.max(0, p - 1))}
            className="p-1 rounded bg-slate-900 border border-slate-800 text-slate-300 disabled:opacity-40 cursor-pointer"
            title="Pan Left"
          >
            <ChevronLeft className="w-3 h-3" />
          </button>
          <input
            type="range"
            min={0}
            max={Math.max(0, activeBuffer.length - 4)}
            step={1}
            value={Math.min(panStepOffset, Math.max(0, activeBuffer.length - 4))}
            onChange={(e) => setPanStepOffset(parseInt(e.target.value, 10))}
            className="w-20 accent-cyan-400 cursor-pointer"
            title="Scrub horizontal time window"
          />
          <button
            type="button"
            disabled={panStepOffset >= Math.max(0, activeBuffer.length - 4)}
            onClick={() =>
              setPanStepOffset((p) =>
                Math.min(Math.max(0, activeBuffer.length - 4), p + 1)
              )
            }
            className="p-1 rounded bg-slate-900 border border-slate-800 text-slate-300 disabled:opacity-40 cursor-pointer"
            title="Pan Right"
          >
            <ChevronRight className="w-3 h-3" />
          </button>
          <span className="text-cyan-300 tabular-nums">
            +{panStepOffset * nsPerStep}ns
          </span>
          {panStepOffset > 0 && (
            <button
              type="button"
              onClick={() => setPanStepOffset(0)}
              className="text-cyan-400 hover:underline cursor-pointer ml-1"
            >
              0ns
            </button>
          )}
        </div>
      </div>

      {/* Dual-Axis Cursor Timing & Voltage Measurement Telemetry Ribbon */}
      {showCursors && (
        <div className="bg-slate-950/90 border border-slate-800 rounded-lg p-3 space-y-2 text-xs font-mono">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-slate-400 font-bold flex items-center gap-1">
                <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
                Graticule Cursors:
              </span>

              {/* Vertical Time Cursors */}
              {(cursorType === "ALL" || cursorType === "TIME") && totalSamples > 0 && (
                <>
                  <div className="flex items-center gap-1 bg-slate-900 px-2 py-0.5 rounded border border-amber-500/30">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    <span className="text-amber-300 font-semibold">
                      T1: {clampedCursorA * nsPerStep} ns
                    </span>
                  </div>
                  <div className="flex items-center gap-1 bg-slate-900 px-2 py-0.5 rounded border border-fuchsia-500/30">
                    <span className="w-2 h-2 rounded-full bg-fuchsia-400" />
                    <span className="text-fuchsia-300 font-semibold">
                      T2: {clampedCursorB * nsPerStep} ns
                    </span>
                  </div>
                  <div className="flex items-center gap-1 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-500/40 text-cyan-200 font-bold">
                    <span>Δt: {deltaTimeNs} ns</span>
                  </div>
                  <div className="flex items-center gap-1 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 text-purple-300 font-semibold">
                    <span>1/Δt: {deltaTimeNs > 0 ? `${eqFreqMHz} MHz` : "0 Hz"}</span>
                  </div>
                </>
              )}

              {/* Horizontal Voltage Cursors */}
              {(cursorType === "ALL" || cursorType === "VOLTAGE") && (
                <>
                  <div className="flex items-center gap-1 bg-slate-900 px-2 py-0.5 rounded border border-emerald-500/30">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="text-emerald-300 font-semibold">
                      V1: {cursorV1.toFixed(1)} V
                    </span>
                  </div>
                  <div className="flex items-center gap-1 bg-slate-900 px-2 py-0.5 rounded border border-purple-500/30">
                    <span className="w-2 h-2 rounded-full bg-purple-400" />
                    <span className="text-purple-300 font-semibold">
                      V2: {cursorV2.toFixed(1)} V
                    </span>
                  </div>
                  <div className="flex items-center gap-1 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/40 text-emerald-200 font-bold">
                    <span>ΔV: {Math.abs(cursorV1 - cursorV2).toFixed(1)} V</span>
                  </div>
                </>
              )}
            </div>

            {/* Cursor Type Selector */}
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded p-0.5 text-[10px]">
              {(["ALL", "TIME", "VOLTAGE"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setCursorType(mode)}
                  className={`px-2 py-0.5 rounded font-semibold transition-colors cursor-pointer ${
                    cursorType === mode
                      ? "bg-cyan-500/20 text-cyan-300 font-bold"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {mode === "ALL" ? "Both (H+V)" : mode === "TIME" ? "Time (V)" : "Volt (H)"}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Snap Voltage Cursors */}
          {(cursorType === "ALL" || cursorType === "VOLTAGE") && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-800/80 text-[10px] text-slate-400">
              <span className="text-slate-400 font-semibold">Snap Voltage:</span>
              <button
                type="button"
                onClick={() => {
                  setCursorV1(5.0);
                  setCursorV2(0.0);
                }}
                className="px-1.5 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-cyan-300 cursor-pointer"
              >
                5.0V / 0.0V (Full)
              </button>
              <button
                type="button"
                onClick={() => {
                  setCursorV1(3.3);
                  setCursorV2(0.0);
                }}
                className="px-1.5 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-emerald-300 cursor-pointer"
              >
                3.3V / 0.0V (LVTTL)
              </button>
              <button
                type="button"
                onClick={() => {
                  setCursorV1(2.0);
                  setCursorV2(0.8);
                }}
                className="px-1.5 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-amber-300 cursor-pointer"
              >
                TTL Levels (2.0V / 0.8V)
              </button>
            </div>
          )}
        </div>
      )}

      {/* Configurable Graticule Grid & Precision Signal/Period Analysis Control Console */}
      {isGridSettingsOpen && (
        <div className="bg-slate-950/95 border border-cyan-500/30 rounded-xl p-3.5 space-y-3 text-xs font-mono shadow-[0_4px_20px_rgba(0,0,0,0.35)]">
          {/* Header & Status Indicator */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                <Grid className="w-4 h-4" />
              </span>
              <div>
                <span className="font-bold text-white tracking-wide">
                  Graticule Grid &amp; Signal Period Analyzer
                </span>
                <span className="text-[10.5px] text-slate-400 block">
                  Configurable CRT overlay reticle with precision division ticks &amp; fundamental period measurement
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-slate-900 border border-slate-700 text-slate-300">
                Div Scale: {nsPerStep * 2} ns/div · 5.0 V/screen
              </span>
              <button
                type="button"
                onClick={() => setIsGridSettingsOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 cursor-pointer"
                title="Collapse Grid Console"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Row 1: Grid Reticle Style, Phosphor Theme, Intensity & Subdivisions */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {/* 1. Graticule Style */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2.5 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10.5px] text-slate-400 font-bold uppercase tracking-wider">
                  Grid Reticle Style
                </span>
                <span className="text-[10px] text-cyan-400 font-semibold uppercase">
                  {gridStyle}
                </span>
              </div>
              <div className="grid grid-cols-5 gap-1 text-[10px]">
                {(
                  [
                    { id: "full", label: "Full" },
                    { id: "crosshair", label: "Axis" },
                    { id: "dotted", label: "Dots" },
                    { id: "framed", label: "Frame" },
                    { id: "none", label: "Off" },
                  ] as const
                ).map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setGridStyle(s.id)}
                    className={`py-1 rounded font-semibold transition-all cursor-pointer text-center ${
                      gridStyle === s.id
                        ? "bg-cyan-500/25 text-cyan-200 border border-cyan-400/60 shadow-[0_0_8px_rgba(6,182,212,0.25)]"
                        : "bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Phosphor Theme Palette */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2.5 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10.5px] text-slate-400 font-bold uppercase tracking-wider">
                  Phosphor Color
                </span>
                <span className="text-[10px] font-semibold" style={{ color: activeGridPalette.accent }}>
                  {activeGridPalette.name}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1 text-[10px]">
                {(
                  [
                    { id: "cyan", label: "Cyan", color: "#06b6d4" },
                    { id: "green", label: "Green", color: "#22c55e" },
                    { id: "amber", label: "Amber", color: "#f59e0b" },
                    { id: "slate", label: "Slate", color: "#94a3b8" },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setGridTheme(t.id)}
                    className={`flex items-center justify-center gap-1 py-1 rounded font-semibold transition-all cursor-pointer ${
                      gridTheme === t.id
                        ? "bg-slate-800 text-white border border-slate-600 shadow-sm"
                        : "bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800"
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color }} />
                    <span>{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Grid Intensity & Opacity */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2.5 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10.5px] text-slate-400 font-bold uppercase tracking-wider">
                  Graticule Intensity
                </span>
                <span className="text-[10px] text-amber-300 font-bold">
                  {gridIntensity}%
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {[25, 50, 75, 100].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setGridIntensity(val)}
                    className={`flex-1 py-1 rounded text-[10px] font-semibold transition-all cursor-pointer ${
                      gridIntensity === val
                        ? "bg-amber-500/25 text-amber-200 border border-amber-500/50"
                        : "bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800"
                    }`}
                  >
                    {val}%
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Reticle Sub-ticks & Period Caliper Overlay Toggles */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2.5 space-y-1.5 flex flex-col justify-between">
              <span className="text-[10.5px] text-slate-400 font-bold uppercase tracking-wider">
                Precision Overlays
              </span>
              <div className="flex items-center gap-1.5 text-[10px]">
                <button
                  type="button"
                  onClick={() => setShowSubdivisions((v) => !v)}
                  className={`flex-1 py-1 px-1.5 rounded font-semibold transition-all cursor-pointer text-center ${
                    showSubdivisions
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                      : "bg-slate-950 text-slate-400 border border-slate-800"
                  }`}
                  title="5 graduation marks per major division (0.2 div resolution)"
                >
                  Sub-ticks: {showSubdivisions ? "ON" : "OFF"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowPeriodOverlay((v) => !v)}
                  className={`flex-1 py-1 px-1.5 rounded font-semibold transition-all cursor-pointer text-center ${
                    showPeriodOverlay
                      ? "bg-purple-500/20 text-purple-300 border border-purple-500/40"
                      : "bg-slate-950 text-slate-400 border border-slate-800"
                  }`}
                  title="Show highlighted period measurement caliper span between T1 and T2"
                >
                  Caliper: {showPeriodOverlay ? "ON" : "OFF"}
                </button>
              </div>
            </div>
          </div>

          {/* Row 2: Precision Signal Analysis & Automatic Period Snapping */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-2.5 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
                  <Gauge className="w-3.5 h-3.5 text-emerald-400" />
                  Signal Period &amp; Frequency Analysis:
                </span>
                {/* Channel Selector */}
                <select
                  value={activeAnalysisChannel?.id || ""}
                  onChange={(e) => setTargetAnalysisChannelId(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded px-2 py-0.5 text-[11px] text-cyan-300 font-mono font-semibold focus:outline-none focus:border-cyan-400 cursor-pointer"
                >
                  {visibleChannels.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label} ({c.id})
                    </option>
                  ))}
                </select>
              </div>

              {/* Instant Period Snap Actions */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleSnapToPeriod}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded font-bold text-[10.5px] bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border border-emerald-500/40 cursor-pointer transition-colors shadow-sm"
                  title="Detect fundamental signal period and snap cursors T1 & T2 to exactly 1 cycle (T)"
                >
                  <MoveHorizontal className="w-3 h-3 text-emerald-400" />
                  <span>Snap 1T Period ({autoPeriodAnalysis?.periodNs ?? 0}ns)</span>
                </button>
                <button
                  type="button"
                  onClick={handleSnapToPulseWidth}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded font-bold text-[10.5px] bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-500/40 cursor-pointer transition-colors shadow-sm"
                  title="Snap cursors T1 & T2 across active high pulse width (tw)"
                >
                  <MoveHorizontal className="w-3 h-3 text-cyan-400" />
                  <span>Snap Pulse Width ({autoPeriodAnalysis?.pulseWidthNs ?? 0}ns)</span>
                </button>
              </div>
            </div>

            {/* Live Readout Values for Target Signal */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-1.5 pt-1 border-t border-slate-800/80 text-[10.5px]">
              <div className="bg-slate-950 rounded px-2 py-1 border border-slate-800/80">
                <span className="text-slate-400 block text-[9.5px]">Period (T)</span>
                <span className="font-bold text-emerald-300">
                  {autoPeriodAnalysis && autoPeriodAnalysis.periodNs > 0
                    ? `${autoPeriodAnalysis.periodNs} ns`
                    : "Awaiting Clock"}
                </span>
              </div>
              <div className="bg-slate-950 rounded px-2 py-1 border border-slate-800/80">
                <span className="text-slate-400 block text-[9.5px]">Frequency (f)</span>
                <span className="font-bold text-cyan-300">
                  {autoPeriodAnalysis && autoPeriodAnalysis.freqMHz !== "—"
                    ? `${autoPeriodAnalysis.freqMHz} MHz`
                    : "—"}
                </span>
              </div>
              <div className="bg-slate-950 rounded px-2 py-1 border border-slate-800/80">
                <span className="text-slate-400 block text-[9.5px]">Pulse Width (tw)</span>
                <span className="font-bold text-purple-300">
                  {autoPeriodAnalysis && autoPeriodAnalysis.pulseWidthNs > 0
                    ? `${autoPeriodAnalysis.pulseWidthNs} ns`
                    : "—"}
                </span>
              </div>
              <div className="bg-slate-950 rounded px-2 py-1 border border-slate-800/80">
                <span className="text-slate-400 block text-[9.5px]">Duty Cycle</span>
                <span className="font-bold text-amber-300">
                  {autoPeriodAnalysis?.dutyPct !== null && autoPeriodAnalysis?.dutyPct !== undefined
                    ? `${autoPeriodAnalysis.dutyPct}%`
                    : "—"}
                </span>
              </div>
              <div className="bg-slate-950 rounded px-2 py-1 border border-slate-800/80">
                <span className="text-slate-400 block text-[9.5px]">Peak-to-Peak (Vpp)</span>
                <span className="font-bold text-emerald-300">5.0 V</span>
              </div>
              <div className="bg-slate-950 rounded px-2 py-1 border border-slate-800/80">
                <span className="text-slate-400 block text-[9.5px]">Active Cursor Δt</span>
                <span className="font-bold text-cyan-300">
                  {deltaTimeNs} ns ({eqFreqMHz} MHz)
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Synchronized Multi-Channel Oscilloscope CRT Graticule Canvas */}
      {visibleChannels.length === 0 || totalSamples === 0 ? (
        <div className="bg-[#060911] border border-slate-800 rounded-xl py-12 px-4 text-center space-y-3">
          <p className="text-xs font-mono text-slate-400">
            No oscilloscope trace samples or active probes selected.
          </p>
          <button
            type="button"
            onClick={() => {
              setHiddenChannelIds(new Set());
              onRunPatternSweep();
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5" />
            Arm All Probes &amp; Run Pattern Sweep
          </button>
        </div>
      ) : (
        <div className="bg-[#050811] border border-slate-800 rounded-xl overflow-x-auto select-none">
          <svg
            ref={svgRef}
            width={svgW}
            height={svgH}
            viewBox={`0 0 ${svgW} ${svgH}`}
            className="block min-w-full cursor-crosshair"
            onPointerDown={(e) => {
              if (!showCursors) return;
              const rect = svgRef.current?.getBoundingClientRect();
              if (!rect) return;
              const scaleX = svgW / rect.width;
              const scaleY = svgH / rect.height;
              const relX = (e.clientX - rect.left) * scaleX - leftLabelW;
              const ySvg = (e.clientY - rect.top) * scaleY;
              if (relX < 0 || relX > traceAreaW) return;
              if (cursorType === "VOLTAGE") {
                const yLaneTop = topRulerH + activeRowIdx * rowH;
                const yLaneHigh = yLaneTop + 10;
                const yLaneLow = yLaneTop + rowH - 10;
                const ratio = Math.max(
                  0,
                  Math.min(1, (yLaneLow - ySvg) / Math.max(1, yLaneLow - yLaneHigh))
                );
                const clickedV = ratio * 5;
                const pickV: "V1" | "V2" =
                  Math.abs(clickedV - cursorV1) <= Math.abs(clickedV - cursorV2)
                    ? "V1"
                    : "V2";
                setActiveCursorDrag(pickV);
                handleSvgPointer(e.clientX, e.clientY, pickV);
                return;
              }
              const clickedStep = Math.floor(relX / pxPerStep);
              const pick: "A" | "B" =
                Math.abs(clickedStep - clampedCursorA) <=
                Math.abs(clickedStep - clampedCursorB)
                  ? "A"
                  : "B";
              setActiveCursorDrag(pick);
              handleSvgPointer(e.clientX, e.clientY, pick);
            }}
            onPointerMove={(e) => {
              if (!activeCursorDrag) return;
              handleSvgPointer(e.clientX, e.clientY, activeCursorDrag);
            }}
            onPointerUp={() => setActiveCursorDrag(null)}
            onPointerLeave={() => setActiveCursorDrag(null)}
          >
            <defs>
              <pattern
                id="dso-subgrid"
                width={pxPerStep}
                height={rowH}
                patternUnits="userSpaceOnUse"
              >
                <line
                  x1={pxPerStep}
                  y1={0}
                  x2={pxPerStep}
                  y2={rowH}
                  stroke="#0f172a"
                  strokeWidth="1"
                />
                <line
                  x1={0}
                  y1={rowH / 2}
                  x2={pxPerStep}
                  y2={rowH / 2}
                  stroke="#0f172a"
                  strokeDasharray="2 3"
                  strokeWidth="0.8"
                />
              </pattern>
            </defs>

            {/* Left Channel Header */}
            <rect
              x={0}
              y={0}
              width={leftLabelW}
              height={topRulerH}
              fill="#0b1020"
            />
            <text
              x={12}
              y={19}
              fill="#94a3b8"
              style={{
                fontSize: "10px",
                fontFamily: "var(--font-mono)",
                fontWeight: 700,
              }}
            >
              CHANNEL / NODE
            </text>

            {/* Top Timebase Ruler */}
            <rect
              x={leftLabelW}
              y={0}
              width={traceAreaW}
              height={topRulerH}
              fill="#080d1a"
            />
            {Array.from({ length: minStepsShown }).map((_, idx) => {
              const x = leftLabelW + idx * pxPerStep;
              const isMajor = idx % 2 === 0;
              return (
                <g key={`ruler-${idx}`}>
                  <line
                    x1={x}
                    y1={isMajor ? 16 : 22}
                    x2={x}
                    y2={topRulerH}
                    stroke={isMajor ? "#334155" : "#1e293b"}
                    strokeWidth="1"
                  />
                  {isMajor && (
                    <text
                      x={x + 3}
                      y={13}
                      fill="#64748b"
                      style={{
                        fontSize: "9.5px",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {(idx + panStepOffset) * nsPerStep}ns
                    </text>
                  )}
                </g>
              );
            })}

            {/* Right Telemetry Column Header */}
            <rect
              x={leftLabelW + traceAreaW}
              y={0}
              width={rightStatsW}
              height={topRulerH}
              fill="#0b1020"
            />
            <text
              x={leftLabelW + traceAreaW + 10}
              y={19}
              fill="#94a3b8"
              style={{
                fontSize: "10px",
                fontFamily: "var(--font-mono)",
                fontWeight: 700,
              }}
            >
              DUTY / EDGES
            </text>

            {/* Trace Graticule Screen Base & Dynamic Configurable Grid Overlay */}
            <rect
              x={leftLabelW}
              y={topRulerH}
              width={traceAreaW}
              height={visibleChannels.length * rowH}
              fill="#040711"
            />

            {/* Configurable Reticle Grid Rendering */}
            {gridStyle !== "none" && (() => {
              const graticuleH = visibleChannels.length * rowH;
              const op = gridIntensity / 100;
              const midX = leftLabelW + traceAreaW / 2;
              const midY = topRulerH + graticuleH / 2;

              return (
                <g className="pointer-events-none select-none">
                  {/* Mode: FULL GRATICULE */}
                  {gridStyle === "full" && (
                    <>
                      {/* Vertical Division Lines */}
                      {Array.from({ length: minStepsShown + 1 }).map((_, idx) => {
                        const x = leftLabelW + idx * pxPerStep;
                        const isMajor = idx % 2 === 0;
                        return (
                          <g key={`dso-vert-${idx}`}>
                            <line
                              x1={x}
                              y1={topRulerH}
                              x2={x}
                              y2={topRulerH + graticuleH}
                              stroke={isMajor ? activeGridPalette.majorLine : activeGridPalette.minorLine}
                              strokeWidth={isMajor ? 1.2 : 0.8}
                              strokeDasharray={isMajor ? undefined : "2 3"}
                              opacity={op}
                            />
                            {/* Reticle Subdivisions (0.2 div ticks across 2*pxPerStep major division) along center horizontal axis */}
                            {showSubdivisions && isMajor && idx < minStepsShown - 1 && (
                              Array.from({ length: 4 }).map((__, subIdx) => {
                                const subX = x + ((subIdx + 1) * (2 * pxPerStep)) / 5;
                                return (
                                  <line
                                    key={`dso-sub-${idx}-${subIdx}`}
                                    x1={subX}
                                    y1={midY - 2.5}
                                    x2={subX}
                                    y2={midY + 2.5}
                                    stroke={activeGridPalette.subTick}
                                    strokeWidth="0.8"
                                    opacity={op * 0.9}
                                  />
                                );
                              })
                            )}
                          </g>
                        );
                      })}

                      {/* Horizontal Division Lines per Channel */}
                      {visibleChannels.map((_, rowIdx) => {
                        const yTop = topRulerH + rowIdx * rowH;
                        const yMid = yTop + rowH / 2;
                        const yBot = yTop + rowH;
                        return (
                          <g key={`dso-horiz-${rowIdx}`}>
                            <line
                              x1={leftLabelW}
                              y1={yMid}
                              x2={leftLabelW + traceAreaW}
                              y2={yMid}
                              stroke={activeGridPalette.minorLine}
                              strokeWidth="0.8"
                              strokeDasharray="2 3"
                              opacity={op}
                            />
                            <line
                              x1={leftLabelW}
                              y1={yBot}
                              x2={leftLabelW + traceAreaW}
                              y2={yBot}
                              stroke={activeGridPalette.majorLine}
                              strokeWidth="1"
                              opacity={op}
                            />
                          </g>
                        );
                      })}
                    </>
                  )}

                  {/* Mode: CENTER CROSSHAIR AXES ONLY */}
                  {gridStyle === "crosshair" && (
                    <>
                      {/* Center Horizontal Axis */}
                      <line
                        x1={leftLabelW}
                        y1={midY}
                        x2={leftLabelW + traceAreaW}
                        y2={midY}
                        stroke={activeGridPalette.axisLine}
                        strokeWidth="1.6"
                        opacity={op}
                      />
                      {/* Center Vertical Axis */}
                      <line
                        x1={midX}
                        y1={topRulerH}
                        x2={midX}
                        y2={topRulerH + graticuleH}
                        stroke={activeGridPalette.axisLine}
                        strokeWidth="1.6"
                        opacity={op}
                      />
                      {/* Reticle graduation ticks along horizontal center axis (0.2 major div = 2*pxPerStep/5) */}
                      {Array.from({ length: Math.floor((minStepsShown * 5) / 2) + 1 }).map((_, sIdx) => {
                        const tickX = leftLabelW + (sIdx * (2 * pxPerStep)) / 5;
                        const isDiv = sIdx % 5 === 0;
                        return (
                          <line
                            key={`ch-h-tick-${sIdx}`}
                            x1={tickX}
                            y1={midY - (isDiv ? 5 : 2.5)}
                            x2={tickX}
                            y2={midY + (isDiv ? 5 : 2.5)}
                            stroke={isDiv ? activeGridPalette.accent : activeGridPalette.subTick}
                            strokeWidth={isDiv ? 1.2 : 0.8}
                            opacity={op}
                          />
                        );
                      })}
                      {/* Reticle graduation ticks along vertical center axis */}
                      {Array.from({ length: visibleChannels.length * 5 }).map((_, sIdx) => {
                        const tickY = topRulerH + (sIdx * rowH) / 5;
                        const isDiv = sIdx % 5 === 0;
                        return (
                          <line
                            key={`ch-v-tick-${sIdx}`}
                            x1={midX - (isDiv ? 5 : 2.5)}
                            y1={tickY}
                            x2={midX + (isDiv ? 5 : 2.5)}
                            y2={tickY}
                            stroke={isDiv ? activeGridPalette.accent : activeGridPalette.subTick}
                            strokeWidth={isDiv ? 1.2 : 0.8}
                            opacity={op}
                          />
                        );
                      })}
                    </>
                  )}

                  {/* Mode: DOTTED MATRIX */}
                  {gridStyle === "dotted" && (
                    <>
                      {Array.from({ length: minStepsShown + 1 }).flatMap((_, colIdx) =>
                        Array.from({ length: visibleChannels.length * 2 + 1 }).map((__, rowIdx) => {
                          const cx = leftLabelW + colIdx * pxPerStep;
                          const cy = topRulerH + (rowIdx * rowH) / 2;
                          const isMajor = colIdx % 2 === 0 && rowIdx % 2 === 0;
                          return (
                            <circle
                              key={`dot-${colIdx}-${rowIdx}`}
                              cx={cx}
                              cy={cy}
                              r={isMajor ? 1.5 : 0.9}
                              fill={activeGridPalette.accent}
                              opacity={isMajor ? op * 0.9 : op * 0.45}
                            />
                          );
                        })
                      )}
                    </>
                  )}

                  {/* Mode: FRAMED BOUNDARY */}
                  {gridStyle === "framed" && (
                    <>
                      <rect
                        x={leftLabelW}
                        y={topRulerH}
                        width={traceAreaW}
                        height={graticuleH}
                        fill="none"
                        stroke={activeGridPalette.border}
                        strokeWidth="1.5"
                        opacity={op}
                      />
                      {/* Inward border division ticks */}
                      {Array.from({ length: minStepsShown + 1 }).map((_, idx) => {
                        const x = leftLabelW + idx * pxPerStep;
                        return (
                          <React.Fragment key={`frame-tick-${idx}`}>
                            <line x1={x} y1={topRulerH} x2={x} y2={topRulerH + 4} stroke={activeGridPalette.accent} strokeWidth="1" opacity={op} />
                            <line x1={x} y1={topRulerH + graticuleH - 4} x2={x} y2={topRulerH + graticuleH} stroke={activeGridPalette.accent} strokeWidth="1" opacity={op} />
                          </React.Fragment>
                        );
                      })}
                    </>
                  )}
                </g>
              );
            })()}

            {/* Period Measurement Caliper Band Overlay (Between Cursors T1 and T2) */}
            {showPeriodOverlay && totalSamples > 0 && (() => {
              const graticuleH = visibleChannels.length * rowH;
              const xA = leftLabelW + (clampedCursorA + 0.5) * pxPerStep;
              const xB = leftLabelW + (clampedCursorB + 0.5) * pxPerStep;
              const minX = Math.min(xA, xB);
              const spanW = Math.max(2, Math.abs(xB - xA));
              const badgeW = 104;
              const badgeX = Math.max(leftLabelW + 6, Math.min(leftLabelW + traceAreaW - badgeW - 6, minX + (spanW - badgeW) / 2));

              return (
                <g className="pointer-events-none select-none">
                  {/* Highlighted Period Span Caliper Band */}
                  <rect
                    x={minX}
                    y={topRulerH}
                    width={spanW}
                    height={graticuleH}
                    fill={activeGridPalette.glow}
                    fillOpacity={0.12}
                    stroke={activeGridPalette.accent}
                    strokeWidth="1.2"
                    strokeDasharray="4 3"
                  />

                  {/* Top Period Measurement Dimension Caliper Line */}
                  <line
                    x1={minX}
                    y1={topRulerH + 11}
                    x2={minX + spanW}
                    y2={topRulerH + 11}
                    stroke={activeGridPalette.accent}
                    strokeWidth="1.6"
                  />
                  {/* Left Caliper End T-Bar */}
                  <line
                    x1={minX}
                    y1={topRulerH + 5}
                    x2={minX}
                    y2={topRulerH + 17}
                    stroke={activeGridPalette.accent}
                    strokeWidth="2"
                  />
                  {/* Right Caliper End T-Bar */}
                  <line
                    x1={minX + spanW}
                    y1={topRulerH + 5}
                    x2={minX + spanW}
                    y2={topRulerH + 17}
                    stroke={activeGridPalette.accent}
                    strokeWidth="2"
                  />

                  {/* Caliper Dimension Readout Pill Badge */}
                  <rect
                    x={badgeX}
                    y={topRulerH + 3}
                    width={badgeW}
                    height={16}
                    rx={3.5}
                    fill="#070c18"
                    stroke={activeGridPalette.border}
                    strokeWidth="1.2"
                  />
                  <text
                    x={badgeX + badgeW / 2}
                    y={topRulerH + 14.5}
                    textAnchor="middle"
                    fill={activeGridPalette.accent}
                    style={{
                      fontSize: "9px",
                      fontFamily: "var(--font-mono)",
                      fontWeight: 800,
                    }}
                  >
                    T = {deltaTimeNs}ns ({eqFreqMHz}MHz)
                  </text>
                </g>
              );
            })()}

            {/* Channel Rows & Waveforms */}
            {visibleChannels.map((ch, rowIdx) => {
              const yTop = topRulerH + rowIdx * rowH;
              const yHigh = yTop + 10;
              const yLow = yTop + rowH - 10;
              const stats = channelStats.get(ch.id);

              // Simulate realistic propagation slew scaled by gateDelayNs (gates lag inputs, outputs lag gates)
              const delayScale = Math.min(2.2, Math.max(0.4, gateDelayNs / 10));
              const slewPx = analogSlewMode
                ? ch.category === "input"
                  ? 2.2
                  : ch.category === "gate" || ch.category === "seq"
                  ? Math.min(pxPerStep * 0.42, 5.0 * delayScale)
                  : Math.min(pxPerStep * 0.58, 7.5 * delayScale)
                : 0;

              let pathD = "";
              let fillD = "";
              const edgeMarkers: {
                x: number;
                rising: boolean;
              }[] = [];

              displayHistory.forEach((pt, sIdx) => {
                const v = pt.signals[ch.id] ?? 0;
                const x0 = leftLabelW + sIdx * pxPerStep;
                const x1 = leftLabelW + (sIdx + 1) * pxPerStep;
                const y = v === 1 ? yHigh : yLow;

                if (sIdx === 0) {
                  pathD += `M ${x0},${y} L ${x1},${y}`;
                  fillD += `M ${x0},${yLow} L ${x0},${y} L ${x1},${y}`;
                } else {
                  const prevV = displayHistory[sIdx - 1].signals[ch.id] ?? 0;
                  const prevY = prevV === 1 ? yHigh : yLow;
                  if (prevY !== y) {
                    const transX = Math.min(x1 - 2, x0 + slewPx);
                    pathD += ` L ${transX},${y}`;
                    fillD += ` L ${transX},${y}`;
                    edgeMarkers.push({
                      x: (x0 + transX) / 2,
                      rising: v === 1,
                    });
                  }
                  pathD += ` L ${x1},${y}`;
                  fillD += ` L ${x1},${y}`;
                }

                if (sIdx === displayHistory.length - 1) {
                  fillD += ` L ${x1},${yLow} Z`;
                }
              });

              const isHighlighted = selectedNodeId === ch.nodeId;

              return (
                <g key={ch.id}>
                  {/* Row background */}
                  <rect
                    x={0}
                    y={yTop}
                    width={svgW}
                    height={rowH}
                    fill={
                      isHighlighted
                        ? "rgba(56, 189, 248, 0.06)"
                        : rowIdx % 2 === 0
                        ? "transparent"
                        : "rgba(15, 23, 42, 0.35)"
                    }
                  />
                  <line
                    x1={0}
                    y1={yTop + rowH}
                    x2={svgW}
                    y2={yTop + rowH}
                    stroke="#1e293b"
                    strokeWidth="1"
                  />

                  {/* Left Channel Label & Live Voltage Level */}
                  <g
                    className="cursor-pointer"
                    onClick={() => onSelectNode && onSelectNode(ch.nodeId)}
                  >
                    <rect
                      x={0}
                      y={yTop}
                      width={leftLabelW}
                      height={rowH}
                      fill="#090e1c"
                    />
                    <rect
                      x={0}
                      y={yTop}
                      width={4}
                      height={rowH}
                      fill={ch.color}
                    />
                    <text
                      x={12}
                      y={yTop + 19}
                      fill="#f8fafc"
                      style={{
                        fontSize: "11px",
                        fontFamily: "var(--font-mono)",
                        fontWeight: 700,
                      }}
                    >
                      {ch.label}
                    </text>
                    <text
                      x={12}
                      y={yTop + 34}
                      fill={stats?.latest === 1 ? ch.color : "#64748b"}
                      style={{
                        fontSize: "9.5px",
                        fontFamily: "var(--font-mono)",
                        fontWeight: 600,
                      }}
                    >
                      {stats?.latest === 1 ? "HIGH (5.0V)" : "LOW (0.0V)"}
                    </text>

                    {/* Logic 1 / 0 reference ticks */}
                    <text
                      x={leftLabelW - 8}
                      y={yHigh + 3}
                      textAnchor="end"
                      fill="#475569"
                      style={{
                        fontSize: "8.5px",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      1
                    </text>
                    <text
                      x={leftLabelW - 8}
                      y={yLow + 3}
                      textAnchor="end"
                      fill="#475569"
                      style={{
                        fontSize: "8.5px",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      0
                    </text>
                  </g>

                  {/* Waveform Shaded Fill & Crisp Signal Trace */}
                  {fillD && (
                    <path d={fillD} fill={ch.color} fillOpacity={0.11} />
                  )}
                  {pathD && (
                    <path
                      d={pathD}
                      fill="none"
                      stroke={ch.color}
                      strokeWidth={2.3}
                      strokeLinejoin="round"
                    />
                  )}

                  {/* Rising / Falling Edge Transition Arrows */}
                  {edgeMarkers.map((em, eIdx) => {
                    const midY = (yHigh + yLow) / 2;
                    return (
                      <path
                        key={`edge-${eIdx}`}
                        d={
                          em.rising
                            ? `M ${em.x - 2.5},${midY + 2} L ${em.x},${
                                midY - 3
                              } L ${em.x + 2.5},${midY + 2}`
                            : `M ${em.x - 2.5},${midY - 2} L ${em.x},${
                                midY + 3
                              } L ${em.x + 2.5},${midY - 2}`
                        }
                        fill="none"
                        stroke={ch.color}
                        strokeWidth="1.5"
                      />
                    );
                  })}

                  {/* Trigger Threshold Line & Marker on Trigger Channel */}
                  {activeAnalysisChannel?.id === ch.id && (
                    <g className="pointer-events-none">
                      {(() => {
                        const yTrig = yLow - (triggerLevelV / 5.0) * (yLow - yHigh);
                        return (
                          <>
                            <line
                              x1={leftLabelW}
                              y1={yTrig}
                              x2={leftLabelW + traceAreaW}
                              y2={yTrig}
                              stroke="#f59e0b"
                              strokeWidth="1"
                              strokeDasharray="4 4"
                              opacity={0.65}
                            />
                            {triggerMatchStep !== null && (
                              <circle
                                cx={leftLabelW + triggerMatchStep * pxPerStep}
                                cy={yTrig}
                                r={3.5}
                                fill="#f59e0b"
                                stroke="#020617"
                                strokeWidth="1"
                              />
                            )}
                          </>
                        );
                      })()}
                    </g>
                  )}

                  {/* Per-step binary bit values inside trace when zoomed in */}
                  {pxPerStep >= 34 &&
                    displayHistory.map((pt, sIdx) => {
                      const v = pt.signals[ch.id] ?? 0;
                      const cx = leftLabelW + (sIdx + 0.5) * pxPerStep;
                      return (
                        <text
                          key={`bit-${sIdx}`}
                          x={cx}
                          y={v === 1 ? yHigh + 11 : yLow - 4}
                          textAnchor="middle"
                          fill={v === 1 ? ch.color : "#475569"}
                          opacity={0.75}
                          style={{
                            fontSize: "8.5px",
                            fontFamily: "var(--font-mono)",
                          }}
                        >
                          {v}
                        </text>
                      );
                    })}

                  {/* Right Telemetry Column (Duty Cycle %, Edge Counts & Cursor Values) */}
                  <rect
                    x={leftLabelW + traceAreaW}
                    y={yTop}
                    width={rightStatsW}
                    height={rowH}
                    fill="#090e1c"
                  />
                  <text
                    x={leftLabelW + traceAreaW + 10}
                    y={yTop + 18}
                    fill="#e2e8f0"
                    style={{
                      fontSize: "10px",
                      fontFamily: "var(--font-mono)",
                      fontWeight: 600,
                    }}
                  >
                    Duty: {stats?.highPct ?? 0}%
                  </text>
                  <text
                    x={leftLabelW + traceAreaW + 10}
                    y={yTop + 34}
                    fill="#94a3b8"
                    style={{
                      fontSize: "9.5px",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    ↑{stats?.risingEdges ?? 0} ↓{stats?.fallingEdges ?? 0}
                    {showCursors
                      ? ` · T1:${stats?.valAtA ?? 0} T2:${stats?.valAtB ?? 0}`
                      : ""}
                  </text>
                </g>
              );
            })}

            {/* Live Animated Phosphor Scanline when Running & Unpaused */}
            {!isScopePaused && isSimRunning && !prefersReducedMotion && isPageVisible && displayHistory.length > 0 && (
              <line
                x1={leftLabelW + sweepProgress * Math.max(pxPerStep, displayHistory.length * pxPerStep)}
                y1={topRulerH}
                x2={leftLabelW + sweepProgress * Math.max(pxPerStep, displayHistory.length * pxPerStep)}
                y2={svgH - 16}
                stroke="rgba(34, 211, 238, 0.48)"
                strokeWidth="1.5"
                className="pointer-events-none"
              />
            )}

            {/* Vertical Section Dividers */}
            <line
              x1={leftLabelW}
              y1={0}
              x2={leftLabelW}
              y2={svgH}
              stroke="#334155"
              strokeWidth="1.5"
            />
            <line
              x1={leftLabelW + traceAreaW}
              y1={0}
              x2={leftLabelW + traceAreaW}
              y2={svgH}
              stroke="#334155"
              strokeWidth="1.5"
            />

            {/* Interactive Dual-Axis Measurement Cursors (Vertical T1/T2 & Horizontal V1/V2) */}
            {showCursors && (
              <>
                {/* Vertical Time Cursors T1 & T2 */}
                {(cursorType === "ALL" || cursorType === "TIME") && totalSamples > 0 && (
                  <>
                    {/* Cursor T1 (A) */}
                    {(() => {
                      const xA = leftLabelW + (clampedCursorA + 0.5) * pxPerStep;
                      return (
                        <g
                          className="cursor-ew-resize"
                          onPointerDown={(e) => {
                            e.stopPropagation();
                            setActiveCursorDrag("A");
                          }}
                        >
                          <line
                            x1={xA}
                            y1={topRulerH}
                            x2={xA}
                            y2={svgH}
                            stroke="#f59e0b"
                            strokeWidth="1.6"
                            strokeDasharray="4 3"
                          />
                          <rect
                            x={xA - 14}
                            y={2}
                            width={28}
                            height={15}
                            rx={4}
                            fill="#f59e0b"
                          />
                          <text
                            x={xA}
                            y={13}
                            textAnchor="middle"
                            fill="#090e1c"
                            style={{
                              fontSize: "9.5px",
                              fontFamily: "var(--font-mono)",
                              fontWeight: 800,
                            }}
                          >
                            T1
                          </text>
                        </g>
                      );
                    })()}

                    {/* Cursor T2 (B) */}
                    {(() => {
                      const xB = leftLabelW + (clampedCursorB + 0.5) * pxPerStep;
                      return (
                        <g
                          className="cursor-ew-resize"
                          onPointerDown={(e) => {
                            e.stopPropagation();
                            setActiveCursorDrag("B");
                          }}
                        >
                          <line
                            x1={xB}
                            y1={topRulerH}
                            x2={xB}
                            y2={svgH}
                            stroke="#e879f9"
                            strokeWidth="1.6"
                            strokeDasharray="4 3"
                          />
                          <rect
                            x={xB - 14}
                            y={2}
                            width={28}
                            height={15}
                            rx={4}
                            fill="#e879f9"
                          />
                          <text
                            x={xB}
                            y={13}
                            textAnchor="middle"
                            fill="#090e1c"
                            style={{
                              fontSize: "9.5px",
                              fontFamily: "var(--font-mono)",
                              fontWeight: 800,
                            }}
                          >
                            T2
                          </text>
                        </g>
                      );
                    })()}
                  </>
                )}

                {/* Horizontal Voltage Cursors V1 & V2 mapped to activeAnalysisChannel lane */}
                {(cursorType === "ALL" || cursorType === "VOLTAGE") &&
                  (() => {
                    const yLaneTop = topRulerH + activeRowIdx * rowH;
                    const yLaneHigh = yLaneTop + 10;
                    const yLaneLow = yLaneTop + rowH - 10;
                    const yV1 =
                      yLaneLow -
                      (Math.max(0, Math.min(5, cursorV1)) / 5) * (yLaneLow - yLaneHigh);
                    const yV2 =
                      yLaneLow -
                      (Math.max(0, Math.min(5, cursorV2)) / 5) * (yLaneLow - yLaneHigh);
                    const minY = Math.min(yV1, yV2);
                    const spanH = Math.abs(yV2 - yV1);

                    return (
                      <>
                        {/* Highlighted ΔV caliper band inside active channel lane */}
                        <rect
                          x={leftLabelW}
                          y={minY}
                          width={traceAreaW}
                          height={Math.max(1, spanH)}
                          fill="#10b981"
                          fillOpacity={0.08}
                          className="pointer-events-none"
                        />

                        {/* Voltage Cursor V1 (Emerald) */}
                        <g
                          className="cursor-ns-resize"
                          onPointerDown={(e) => {
                            e.stopPropagation();
                            setActiveCursorDrag("V1");
                          }}
                        >
                          <line
                            x1={leftLabelW}
                            y1={yV1}
                            x2={leftLabelW + traceAreaW}
                            y2={yV1}
                            stroke="#10b981"
                            strokeWidth="1.8"
                            strokeDasharray="5 3"
                          />
                          <rect
                            x={leftLabelW - 32}
                            y={yV1 - 8}
                            width={30}
                            height={16}
                            rx={3}
                            fill="#10b981"
                          />
                          <text
                            x={leftLabelW - 17}
                            y={yV1 + 4}
                            textAnchor="middle"
                            fill="#062817"
                            style={{
                              fontSize: "9px",
                              fontFamily: "var(--font-mono)",
                              fontWeight: 800,
                            }}
                          >
                            V1
                          </text>
                          <text
                            x={leftLabelW + traceAreaW - 6}
                            y={yV1 - 4}
                            textAnchor="end"
                            fill="#34d399"
                            style={{
                              fontSize: "9px",
                              fontFamily: "var(--font-mono)",
                              fontWeight: 700,
                            }}
                          >
                            {cursorV1.toFixed(1)}V
                          </text>
                        </g>

                        {/* Voltage Cursor V2 (Purple) */}
                        <g
                          className="cursor-ns-resize"
                          onPointerDown={(e) => {
                            e.stopPropagation();
                            setActiveCursorDrag("V2");
                          }}
                        >
                          <line
                            x1={leftLabelW}
                            y1={yV2}
                            x2={leftLabelW + traceAreaW}
                            y2={yV2}
                            stroke="#c084fc"
                            strokeWidth="1.8"
                            strokeDasharray="5 3"
                          />
                          <rect
                            x={leftLabelW - 32}
                            y={yV2 - 8}
                            width={30}
                            height={16}
                            rx={3}
                            fill="#c084fc"
                          />
                          <text
                            x={leftLabelW - 17}
                            y={yV2 + 4}
                            textAnchor="middle"
                            fill="#2e1065"
                            style={{
                              fontSize: "9px",
                              fontFamily: "var(--font-mono)",
                              fontWeight: 800,
                            }}
                          >
                            V2
                          </text>
                          <text
                            x={leftLabelW + traceAreaW - 6}
                            y={yV2 - 4}
                            textAnchor="end"
                            fill="#e9d5ff"
                            style={{
                              fontSize: "9px",
                              fontFamily: "var(--font-mono)",
                              fontWeight: 700,
                            }}
                          >
                            {cursorV2.toFixed(1)}V
                          </text>
                        </g>
                      </>
                    );
                  })()}
              </>
            )}
          </svg>
        </div>
      )}

      <OscilloscopeSignalAnalysisPanel
        channels={dsoFftChannels}
        sampleRateHz={dsoFftSampleRateHz}
        subtitle="Automatic FFT frequency spectrum across probed logic & node traces (0V–5V)"
      />
    </div>
  );
}

const DigitalOscilloscope = React.memo(DigitalOscilloscopeInner);
export default DigitalOscilloscope;
