import React, { useState, useMemo, useRef } from "react";
import {
  Activity,
  Play,
  Pause,
  StepForward,
  RotateCcw,
  Zap,
  Sliders,
  CheckSquare,
  Square,
  Search,
  Crosshair,
  ArrowUp,
  ArrowDown,
  Layers,
  Sparkles,
  Download,
  Filter,
  Clock,
  Eye,
  Check,
  X,
} from "lucide-react";
import { SubscribableWireSignal, LA_CHANNEL_PALETTE } from "./LogicAnalyzerModal";
import { LogicTimingSample } from "./LogicAnalyzerOverlay";

export interface MultiChannelLogicAnalyzerProps {
  signals: SubscribableWireSignal[];
  selectedWireIds: number[];
  onToggleSelectSignal: (wireId: number) => void;
  onSelectAllSignals: () => void;
  onClearSelectedSignals: () => void;
  onSelectInputsOnly: () => void;
  onSelectOutputsOnly: () => void;
  onSelectGatesOnly?: () => void;
  history: LogicTimingSample[];
  autoClock: boolean;
  onToggleAutoClock: () => void;
  clockHz: number;
  onStepClock: () => void;
  onRunPatternSweep: () => void;
  onClearHistory: () => void;
  className?: string;
}

export default function MultiChannelLogicAnalyzer({
  signals,
  selectedWireIds,
  onToggleSelectSignal,
  onSelectAllSignals,
  onClearSelectedSignals,
  onSelectInputsOnly,
  onSelectOutputsOnly,
  onSelectGatesOnly,
  history,
  autoClock,
  onToggleAutoClock,
  clockHz,
  onStepClock,
  onRunPatternSweep,
  onClearHistory,
  className = "",
}: MultiChannelLogicAnalyzerProps) {
  const [searchFilter, setSearchFilter] = useState("");
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [timebaseScale, setTimebaseScale] = useState<number>(10); // ns per step
  const [zoomLevel, setZoomLevel] = useState<1 | 1.5 | 2 | 3>(1.5);
  const [showBusRow, setShowBusRow] = useState<boolean>(true);
  const [showCursors, setShowCursors] = useState<boolean>(true);
  const [cursorX1, setCursorX1] = useState<number>(1);
  const [cursorX2, setCursorX2] = useState<number>(5);
  const [activeCursorDrag, setActiveCursorDrag] = useState<"X1" | "X2" | null>(null);
  const [hoverStep, setHoverStep] = useState<number | null>(null);
  const [csvExported, setCsvExported] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const svgRef = useRef<SVGSVGElement | null>(null);

  // Filter signals list based on user search query
  const filteredSignals = useMemo(() => {
    const q = searchFilter.trim().toLowerCase();
    if (!q) return signals;
    return signals.filter(
      (s) =>
        s.netName.toLowerCase().includes(q) ||
        s.sourceLabel.toLowerCase().includes(q) ||
        s.targetLabel.toLowerCase().includes(q)
    );
  }, [signals, searchFilter]);

  // Armed channels ordered strictly by selectedWireIds priority (Smart-Sync CH1..CH4 first)
  const activeSignals = useMemo(() => {
    const orderMap = new Map<number, number>();
    selectedWireIds.forEach((id, idx) => orderMap.set(id, idx));
    return signals
      .filter((s) => orderMap.has(s.wireId))
      .sort((a, b) => (orderMap.get(a.wireId) ?? 0) - (orderMap.get(b.wireId) ?? 0))
      .map((s, idx) => ({
        ...s,
        channelColor: LA_CHANNEL_PALETTE[idx % LA_CHANNEL_PALETTE.length],
      }));
  }, [signals, selectedWireIds]);

  // Total steps available in waveform capture history
  const totalSteps = Math.max(history.length, 16);
  const stepWidth = Math.round(26 * zoomLevel);
  const rowHeight = 36;
  const leftHeaderWidth = 180;
  const waveformAreaWidth = Math.max(480, totalSteps * stepWidth);
  const totalSvgWidth = leftHeaderWidth + waveformAreaWidth + 140; // right stats column
  const topRulerHeight = 28;
  const busRowHeight = showBusRow && activeSignals.length > 0 ? 32 : 0;
  const totalSvgHeight =
    topRulerHeight +
    busRowHeight +
    Math.max(1, activeSignals.length) * rowHeight +
    12;

  // Clamped cursors
  const clampedX1 = Math.max(0, Math.min(totalSteps - 1, cursorX1));
  const clampedX2 = Math.max(0, Math.min(totalSteps - 1, cursorX2));
  const deltaSteps = Math.abs(clampedX2 - clampedX1);
  const deltaTimeNs = deltaSteps * timebaseScale;
  const deltaFreqMHz = deltaTimeNs > 0 ? (1000 / deltaTimeNs).toFixed(2) : "—";

  // Cursor dragging handler
  const handleSvgPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!svgRef.current || !showCursors) return;
    const rect = svgRef.current.getBoundingClientRect();
    const scaleX = totalSvgWidth / rect.width;
    const relX = (e.clientX - rect.left) * scaleX - leftHeaderWidth;
    if (relX < 0 || relX > waveformAreaWidth) return;

    const clickedStep = Math.max(
      0,
      Math.min(totalSteps - 1, Math.floor(relX / stepWidth))
    );

    // Pick closest cursor
    const pick: "X1" | "X2" =
      Math.abs(clickedStep - clampedX1) <= Math.abs(clickedStep - clampedX2)
        ? "X1"
        : "X2";

    setActiveCursorDrag(pick);
    if (pick === "X1") setCursorX1(clickedStep);
    else setCursorX2(clickedStep);
  };

  const handleSvgPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const scaleX = totalSvgWidth / rect.width;
    const relX = (e.clientX - rect.left) * scaleX - leftHeaderWidth;

    if (relX >= 0 && relX <= waveformAreaWidth) {
      const stepIdx = Math.max(
        0,
        Math.min(totalSteps - 1, Math.floor(relX / stepWidth))
      );
      setHoverStep(stepIdx);

      if (activeCursorDrag) {
        if (activeCursorDrag === "X1") setCursorX1(stepIdx);
        else setCursorX2(stepIdx);
      }
    } else {
      setHoverStep(null);
    }
  };

  const handleSvgPointerUp = () => {
    setActiveCursorDrag(null);
  };

  // Export captured timing samples to CSV
  const handleExportCsv = () => {
    if (history.length === 0 || activeSignals.length === 0) {
      setExportNotice(
        activeSignals.length === 0
          ? "No channels armed. Arm at least one signal via 'Select Signals' before exporting CSV."
          : "No waveform history recorded yet. Click 'Sweep Test Vectors' or 'Clock Step' first."
      );
      return;
    }
    setExportNotice(null);

    const rows: string[] = [];

    const headers = [
      "Step",
      "Time_ns",
      "Time_us",
      ...activeSignals.map((s) => `"${s.netName.replace(/"/g, '""')}_Logic"`),
    ];
    rows.push(headers.join(","));

    history.forEach((sample, idx) => {
      const tNs = idx * timebaseScale;
      const tUs = (tNs / 1000).toFixed(4);
      const row: (string | number)[] = [sample.step, tNs, tUs];
      activeSignals.forEach((s) => {
        row.push(sample.netValues[s.wireId] ?? 0);
      });
      rows.push(row.join(","));
    });

    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `logic_analyzer_timing_${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setCsvExported(true);
    setTimeout(() => setCsvExported(false), 2000);
  };

  return (
    <div
      className={`bg-[#0d1322] border border-cyan-500/35 rounded-2xl p-4 sm:p-5 shadow-2xl space-y-4 ${className}`}
    >
      {/* Header & Main Instrument Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/40 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(6,182,212,0.25)]">
            <Activity className="w-5 h-5 text-cyan-400 animate-pulse" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-white tracking-tight font-display">
                Multi-Channel Digital Logic Analyzer
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-950 border border-cyan-500/60 text-cyan-300">
                {activeSignals.length} / {signals.length} CHANNELS ARMED
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 font-semibold">
                {history.length} SAMPLES
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Interactive timing diagram displaying simultaneous digital signal transitions (HIGH/LOW logic states) over time.
            </p>
          </div>
        </div>

        {/* Instrument Operations Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Signal Channel Selector Trigger */}
          <button
            type="button"
            onClick={() => setIsFilterPanelOpen((v) => !v)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold border transition-colors cursor-pointer ${
              isFilterPanelOpen
                ? "bg-cyan-500/25 border-cyan-400 text-cyan-200"
                : "bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300"
            }`}
          >
            <Filter className="w-3.5 h-3.5 text-cyan-300" />
            <span>Select Signals ({activeSignals.length})</span>
          </button>

          {/* Pattern Sweep: Automatically sweeps truth table inputs */}
          <button
            type="button"
            onClick={() => {
              setExportNotice(null);
              onRunPatternSweep();
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-500/50 transition-colors cursor-pointer shadow-xs"
            title="Automatically sweep input binary combinations to capture complete transition timing diagrams"
          >
            <Zap className="w-3.5 h-3.5 text-cyan-300" />
            <span>Sweep Test Vectors</span>
          </button>

          {/* Sample Clock Step */}
          <button
            type="button"
            onClick={() => {
              setExportNotice(null);
              onStepClock();
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
            title="Clock one cycle and capture logic states"
          >
            <StepForward className="w-3.5 h-3.5 text-emerald-400" />
            <span>Clock Step</span>
          </button>

          {/* Auto Clock Pulse Generator */}
          <button
            type="button"
            onClick={onToggleAutoClock}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold border transition-colors cursor-pointer ${
              autoClock
                ? "bg-emerald-500/20 border-emerald-500/60 text-emerald-300 animate-pulse"
                : "bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300"
            }`}
            title="Continuous clock generator running at specified frequency"
          >
            {autoClock ? (
              <Pause className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Play className="w-3.5 h-3.5 text-emerald-400" />
            )}
            <span>Auto Clk ({clockHz}Hz)</span>
          </button>

          {/* Timebase Scale (ns/div) */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-[11px] font-mono">
            {[5, 10, 20].map((ns) => (
              <button
                key={ns}
                type="button"
                onClick={() => setTimebaseScale(ns)}
                className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                  timebaseScale === ns
                    ? "bg-cyan-500/20 text-cyan-300 font-bold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {ns}ns/div
              </button>
            ))}
          </div>

          {/* Horizontal Zoom */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-[11px] font-mono">
            {([1, 1.5, 2] as const).map((z) => (
              <button
                key={z}
                type="button"
                onClick={() => setZoomLevel(z)}
                className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                  zoomLevel === z
                    ? "bg-purple-500/20 text-purple-300 font-bold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {z}×
              </button>
            ))}
          </div>

          {/* Dual Timing Cursors Toggle */}
          <button
            type="button"
            onClick={() => setShowCursors((v) => !v)}
            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-mono border transition-colors cursor-pointer ${
              showCursors
                ? "bg-amber-500/20 border-amber-500/50 text-amber-300"
                : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
            }`}
            title="Toggle X1 & X2 Timing Cursors to measure interval and frequency"
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span>Cursors</span>
          </button>

          {/* Bus Decode Row Toggle */}
          <button
            type="button"
            onClick={() => setShowBusRow((v) => !v)}
            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-mono border transition-colors cursor-pointer ${
              showBusRow
                ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-300"
                : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
            }`}
            title="Toggle Multi-bit Synchronous Bus Decode Row"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Bus</span>
          </button>

          {/* Export CSV */}
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-500/40 transition-colors cursor-pointer"
            title="Export captured timing samples to CSV"
          >
            {csvExported ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Download className="w-3.5 h-3.5 text-cyan-300" />
            )}
            <span>{csvExported ? "Downloaded!" : "Download CSV"}</span>
          </button>

          {/* Clear Trace History */}
          <button
            type="button"
            onClick={onClearHistory}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-300 border border-slate-700/80 transition-colors cursor-pointer"
            title="Clear Waveform History"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Inline Export Notice Banner */}
      {exportNotice && (
        <div className="flex items-center justify-between gap-3 px-3.5 py-2 rounded-xl bg-amber-950/60 border border-amber-500/40 text-xs font-mono text-amber-200">
          <span>{exportNotice}</span>
          <button
            type="button"
            onClick={() => setExportNotice(null)}
            className="text-amber-300 hover:text-white p-0.5 cursor-pointer"
            aria-label="Dismiss notice"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Collapsible Signal Selection Drawer */}
      {isFilterPanelOpen && (
        <div className="bg-slate-950/90 border border-cyan-500/30 rounded-xl p-3.5 space-y-3 animate-in fade-in duration-150">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-mono uppercase font-bold text-cyan-300 flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5" />
              Arm / Disarm Schematic Signals for Logic Analyzer
            </span>

            <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
              <button
                type="button"
                onClick={onSelectAllSignals}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer"
              >
                All Signals
              </button>
              <button
                type="button"
                onClick={onSelectInputsOnly}
                className="px-2 py-1 rounded bg-cyan-950/70 hover:bg-cyan-900 border border-cyan-700/60 text-cyan-300 cursor-pointer"
              >
                Inputs Only
              </button>
              <button
                type="button"
                onClick={onSelectOutputsOnly}
                className="px-2 py-1 rounded bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-700/60 text-emerald-300 cursor-pointer"
              >
                Outputs Only
              </button>
              {onSelectGatesOnly && (
                <button
                  type="button"
                  onClick={onSelectGatesOnly}
                  className="px-2 py-1 rounded bg-purple-950/70 hover:bg-purple-900 border border-purple-700/60 text-purple-300 cursor-pointer"
                >
                  Internal Gates
                </button>
              )}
              <button
                type="button"
                onClick={onClearSelectedSignals}
                className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-rose-300 border border-slate-800 cursor-pointer"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Quick Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search schematic signals by name or connected component pin..."
              className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs font-mono text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/60"
            />
          </div>

          {/* Signal Chips Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 max-h-48 overflow-y-auto pr-1">
            {filteredSignals.map((sig) => {
              const isSelected = selectedWireIds.includes(sig.wireId);
              return (
                <button
                  key={sig.wireId}
                  type="button"
                  onClick={() => onToggleSelectSignal(sig.wireId)}
                  className={`flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-lg border text-left text-xs font-mono transition-all cursor-pointer ${
                    isSelected
                      ? "bg-slate-900 border-cyan-500/70 text-white shadow-xs"
                      : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 opacity-65 hover:opacity-100"
                  }`}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    {isSelected ? (
                      <CheckSquare className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    ) : (
                      <Square className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                    )}
                    <span className="truncate font-semibold">{sig.netName}</span>
                  </div>
                  <span
                    className={`text-[9px] px-1 py-0.5 rounded font-bold shrink-0 ${
                      sig.currentLogic === 1
                        ? "bg-emerald-950 text-emerald-400 border border-emerald-700/60"
                        : "bg-slate-800 text-slate-500 border border-slate-700/50"
                    }`}
                  >
                    {sig.currentLogic === 1 ? "H" : "L"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Dual Cursor Timing Measurement Telemetry Banner */}
      {showCursors && totalSteps > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-slate-950/90 border border-cyan-500/30 rounded-xl px-4 py-2 text-xs font-mono">
          <div className="flex items-center justify-between">
            <span className="text-amber-400 font-semibold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
              Cursor X1:
            </span>
            <span className="text-white">
              Step {clampedX1 + 1} ({clampedX1 * timebaseScale} ns)
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-cyan-400 font-semibold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block" />
              Cursor X2:
            </span>
            <span className="text-white">
              Step {clampedX2 + 1} ({clampedX2 * timebaseScale} ns)
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-emerald-400 font-semibold">Δt = |X2 − X1|:</span>
            <span className="text-emerald-300 font-bold">
              {deltaTimeNs} ns ({deltaSteps} clock steps)
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-purple-300 font-semibold">Switching Rate (1/Δt):</span>
            <span className="text-purple-200 font-bold">
              {deltaTimeNs > 0 ? `${deltaFreqMHz} MHz` : "—"}
            </span>
          </div>
        </div>
      )}

      {/* Main Multi-Channel Timing Diagram SVG Canvas */}
      {activeSignals.length === 0 ? (
        <div className="bg-[#050811] border border-slate-800 rounded-xl py-12 px-4 text-center space-y-3">
          <Activity className="w-8 h-8 text-cyan-400/30 mx-auto" />
          <p className="text-xs font-mono text-slate-300">
            No circuit signals are currently selected for logic analyzer timing capture.
          </p>
          <div className="flex justify-center gap-2 pt-1">
            <button
              type="button"
              onClick={onSelectAllSignals}
              className="px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-500/40 cursor-pointer"
            >
              Select All Circuit Signals
            </button>
            <button
              type="button"
              onClick={onSelectInputsOnly}
              className="px-3.5 py-1.5 rounded-lg text-xs font-mono font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer"
            >
              Inputs Only
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-[#040710] border border-slate-800 rounded-xl overflow-x-auto select-none shadow-inner">
          <svg
            ref={svgRef}
            width={totalSvgWidth}
            height={totalSvgHeight}
            viewBox={`0 0 ${totalSvgWidth} ${totalSvgHeight}`}
            className="block min-w-full cursor-crosshair"
            onPointerDown={handleSvgPointerDown}
            onPointerMove={handleSvgPointerMove}
            onPointerUp={handleSvgPointerUp}
            onPointerLeave={() => {
              setActiveCursorDrag(null);
              setHoverStep(null);
            }}
          >
            <defs>
              {/* Subtle background graticule grid pattern */}
              <pattern
                id="la-subgrid"
                width={stepWidth}
                height={rowHeight}
                patternUnits="userSpaceOnUse"
              >
                <line
                  x1={stepWidth}
                  y1={0}
                  x2={stepWidth}
                  y2={rowHeight}
                  stroke="#0f172a"
                  strokeWidth="0.8"
                />
                <line
                  x1={0}
                  y1={rowHeight / 2}
                  x2={stepWidth}
                  y2={rowHeight / 2}
                  stroke="#0f172a"
                  strokeDasharray="2 3"
                  strokeWidth="0.6"
                />
              </pattern>
            </defs>

            {/* Left Header Background */}
            <rect
              x={0}
              y={0}
              width={leftHeaderWidth}
              height={totalSvgHeight}
              fill="#080d1a"
            />
            {/* Top Ruler Background */}
            <rect
              x={leftHeaderWidth}
              y={0}
              width={waveformAreaWidth}
              height={topRulerHeight}
              fill="#060913"
            />
            {/* Right Telemetry Column Background */}
            <rect
              x={leftHeaderWidth + waveformAreaWidth}
              y={0}
              width={140}
              height={totalSvgHeight}
              fill="#080d1a"
            />

            {/* Left Top Label */}
            <text
              x={14}
              y={18}
              fill="#94a3b8"
              style={{
                fontSize: "10px",
                fontFamily: "var(--font-mono)",
                fontWeight: 700,
              }}
            >
              CHANNEL / NET
            </text>

            {/* Right Top Label */}
            <text
              x={leftHeaderWidth + waveformAreaWidth + 12}
              y={18}
              fill="#94a3b8"
              style={{
                fontSize: "10px",
                fontFamily: "var(--font-mono)",
                fontWeight: 700,
              }}
            >
              TRANSITIONS (↑/↓)
            </text>

            {/* Top Time Scale Ticks */}
            {Array.from({ length: totalSteps }).map((_, stepIdx) => {
              const x = leftHeaderWidth + stepIdx * stepWidth;
              const isMajor = stepIdx % 2 === 0;
              return (
                <g key={`time-tick-${stepIdx}`}>
                  <line
                    x1={x}
                    y1={isMajor ? 14 : 20}
                    x2={x}
                    y2={topRulerHeight}
                    stroke={isMajor ? "#334155" : "#1e293b"}
                    strokeWidth="1"
                  />
                  {isMajor && (
                    <text
                      x={x + 3}
                      y={12}
                      fill="#64748b"
                      style={{
                        fontSize: "9px",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {stepIdx * timebaseScale}ns
                    </text>
                  )}
                </g>
              );
            })}

            {/* Optional Bus Row */}
            {showBusRow && activeSignals.length > 0 && (
              <g transform={`translate(0, ${topRulerHeight})`}>
                <rect
                  x={0}
                  y={0}
                  width={totalSvgWidth}
                  height={busRowHeight}
                  fill="#0c1424"
                />
                <line
                  x1={0}
                  y1={busRowHeight}
                  x2={totalSvgWidth}
                  y2={busRowHeight}
                  stroke="#1e293b"
                  strokeWidth="1"
                />
                <text
                  x={14}
                  y={20}
                  fill="#38bdf8"
                  style={{
                    fontSize: "10.5px",
                    fontFamily: "var(--font-mono)",
                    fontWeight: 700,
                  }}
                >
                  HEX BUS [{activeSignals.length}b]
                </text>

                {/* Per-step Bus Decoded Value */}
                {Array.from({ length: totalSteps }).map((_, stepIdx) => {
                  const sample = history[stepIdx];
                  let hexVal = "—";
                  if (sample) {
                    let num = 0;
                    activeSignals.slice(0, 16).forEach((s, bitIdx) => {
                      const b = sample.netValues[s.wireId] ?? 0;
                      if (b === 1) num |= 1 << bitIdx;
                    });
                    hexVal =
                      "0x" +
                      num
                        .toString(16)
                        .toUpperCase()
                        .padStart(Math.ceil(activeSignals.length / 4), "0");
                  }
                  const bx = leftHeaderWidth + stepIdx * stepWidth;
                  return (
                    <g key={`bus-val-${stepIdx}`}>
                      <polygon
                        points={`${bx + 1},${busRowHeight / 2} ${bx + 4},4 ${
                          bx + stepWidth - 4
                        },4 ${bx + stepWidth - 1},${busRowHeight / 2} ${
                          bx + stepWidth - 4
                        },${busRowHeight - 4} ${bx + 4},${busRowHeight - 4}`}
                        fill="#0f2238"
                        stroke="#0284c7"
                        strokeWidth="1"
                      />
                      <text
                        x={bx + stepWidth / 2}
                        y={busRowHeight / 2 + 3.5}
                        textAnchor="middle"
                        fill="#7dd3fc"
                        style={{
                          fontSize: "8.5px",
                          fontFamily: "var(--font-mono)",
                          fontWeight: 700,
                        }}
                      >
                        {hexVal}
                      </text>
                    </g>
                  );
                })}
              </g>
            )}

            {/* Trace Lanes Graticule Pattern Fill */}
            <rect
              x={leftHeaderWidth}
              y={topRulerHeight + busRowHeight}
              width={waveformAreaWidth}
              height={activeSignals.length * rowHeight}
              fill="url(#la-subgrid)"
            />

            {/* Channel Timing Lanes */}
            {activeSignals.map((sig, channelIdx) => {
              const yLaneTop = topRulerHeight + busRowHeight + channelIdx * rowHeight;
              const yHigh = yLaneTop + 7;
              const yLow = yLaneTop + rowHeight - 7;

              // Extract step sequence for this channel
              const channelSamples: (0 | 1)[] = Array.from({ length: totalSteps }).map(
                (_, stepIdx) => {
                  const sample = history[stepIdx];
                  if (sample) {
                    return sample.netValues[sig.wireId] === 1 ? 1 : 0;
                  }
                  return sig.currentLogic === 1 ? 1 : 0;
                }
              );

              // Calculate transition counts and edge markers
              let risingEdges = 0;
              let fallingEdges = 0;
              const transitionMarkers: { x: number; isRising: boolean }[] = [];

              let pathD = "";
              let fillAreaD = "";

              channelSamples.forEach((val, stepIdx) => {
                const x0 = leftHeaderWidth + stepIdx * stepWidth;
                const x1 = leftHeaderWidth + (stepIdx + 1) * stepWidth;
                const y = val === 1 ? yHigh : yLow;

                if (stepIdx === 0) {
                  pathD = `M ${x0},${y} L ${x1},${y}`;
                  fillAreaD = `M ${x0},${yLow} L ${x0},${y} L ${x1},${y}`;
                } else {
                  const prevVal = channelSamples[stepIdx - 1];
                  const prevY = prevVal === 1 ? yHigh : yLow;

                  if (prevY !== y) {
                    // Transition edge between HIGH and LOW logic states!
                    pathD += ` L ${x0},${y}`;
                    fillAreaD += ` L ${x0},${y}`;

                    if (val === 1) {
                      risingEdges++;
                      transitionMarkers.push({ x: x0, isRising: true });
                    } else {
                      fallingEdges++;
                      transitionMarkers.push({ x: x0, isRising: false });
                    }
                  }
                  pathD += ` L ${x1},${y}`;
                  fillAreaD += ` L ${x1},${y}`;
                }

                if (stepIdx === channelSamples.length - 1) {
                  fillAreaD += ` L ${x1},${yLow} Z`;
                }
              });

              return (
                <g key={`lane-${sig.wireId}`}>
                  {/* Lane Horizontal Separator */}
                  <line
                    x1={0}
                    y1={yLaneTop + rowHeight}
                    x2={totalSvgWidth}
                    y2={yLaneTop + rowHeight}
                    stroke="#1e293b"
                    strokeWidth="1"
                  />

                  {/* Left Channel Name & Instantaneous Logic Indicator */}
                  <g
                    className="cursor-pointer"
                    onClick={() => onToggleSelectSignal(sig.wireId)}
                  >
                    <title>{`Click to disarm signal ${sig.netName}`}</title>
                    <rect
                      x={0}
                      y={yLaneTop}
                      width={leftHeaderWidth}
                      height={rowHeight}
                      fill={channelIdx % 2 === 0 ? "#070c18" : "#090e1d"}
                    />
                    {/* Left Color Swatch Bar */}
                    <rect
                      x={0}
                      y={yLaneTop}
                      width={4}
                      height={rowHeight}
                      fill={sig.channelColor}
                    />
                    {/* Channel Label */}
                    <text
                      x={14}
                      y={yLaneTop + 16}
                      fill="#f8fafc"
                      style={{
                        fontSize: "11px",
                        fontFamily: "var(--font-mono)",
                        fontWeight: 700,
                      }}
                    >
                      {sig.netName.length > 17
                        ? sig.netName.slice(0, 16) + "…"
                        : sig.netName}
                    </text>
                    <text
                      x={14}
                      y={yLaneTop + 28}
                      fill="#64748b"
                      style={{
                        fontSize: "9px",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {sig.sourceLabel} → {sig.targetLabel}
                    </text>

                    {/* Instantaneous Logic State Badge */}
                    <rect
                      x={leftHeaderWidth - 36}
                      y={yLaneTop + 9}
                      width={24}
                      height={18}
                      rx={4}
                      fill={
                        sig.currentLogic === 1
                          ? "rgba(16, 185, 129, 0.2)"
                          : "rgba(51, 65, 85, 0.3)"
                      }
                      stroke={
                        sig.currentLogic === 1
                          ? "rgba(16, 185, 129, 0.6)"
                          : "rgba(71, 85, 105, 0.5)"
                      }
                      strokeWidth="1"
                    />
                    <text
                      x={leftHeaderWidth - 24}
                      y={yLaneTop + 22}
                      textAnchor="middle"
                      fill={sig.currentLogic === 1 ? "#34d399" : "#64748b"}
                      style={{
                        fontSize: "10px",
                        fontFamily: "var(--font-mono)",
                        fontWeight: 800,
                      }}
                    >
                      {sig.currentLogic === 1 ? "1" : "0"}
                    </text>
                  </g>

                  {/* Waveform Translucent Glow Area (High State) */}
                  <path
                    d={fillAreaD}
                    fill={sig.channelColor}
                    fillOpacity={0.12}
                    pointerEvents="none"
                  />

                  {/* Sharp Timing Waveform Trace Line */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke={sig.channelColor}
                    strokeWidth={2.4}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />

                  {/* High and Low Reference Guide Ticks */}
                  <line
                    x1={leftHeaderWidth}
                    y1={yHigh}
                    x2={leftHeaderWidth + waveformAreaWidth}
                    y2={yHigh}
                    stroke="#1e293b"
                    strokeWidth="0.5"
                    strokeDasharray="2 3"
                  />
                  <line
                    x1={leftHeaderWidth}
                    y1={yLow}
                    x2={leftHeaderWidth + waveformAreaWidth}
                    y2={yLow}
                    stroke="#1e293b"
                    strokeWidth="0.5"
                    strokeDasharray="2 3"
                  />

                  {/* Transition Edge Markers (Visualizing High-to-Low and Low-to-High Transitions) */}
                  {transitionMarkers.map((em, mIdx) => {
                    const midY = (yHigh + yLow) / 2;
                    return (
                      <g key={`trans-${mIdx}`}>
                        {/* Vertical Accent Glow */}
                        <line
                          x1={em.x}
                          y1={yHigh - 2}
                          x2={em.x}
                          y2={yLow + 2}
                          stroke={em.isRising ? "#10b981" : "#f59e0b"}
                          strokeWidth="1.2"
                          strokeDasharray="2 2"
                        />
                        {/* Transition Direction Arrow Badge */}
                        <circle
                          cx={em.x}
                          cy={midY}
                          r={4.5}
                          fill={em.isRising ? "#064e3b" : "#451a03"}
                          stroke={em.isRising ? "#34d399" : "#f59e0b"}
                          strokeWidth="1.2"
                        />
                        <text
                          x={em.x}
                          y={midY + 2.5}
                          textAnchor="middle"
                          fill={em.isRising ? "#a7f3d0" : "#fed7aa"}
                          style={{
                            fontSize: "6.5px",
                            fontFamily: "var(--font-mono)",
                            fontWeight: 900,
                          }}
                        >
                          {em.isRising ? "↑" : "↓"}
                        </text>
                      </g>
                    );
                  })}

                  {/* Per-step Binary Bit Labels (0 & 1 inside waveform) */}
                  {channelSamples.map((bitVal, stepIdx) => {
                    const cx = leftHeaderWidth + (stepIdx + 0.5) * stepWidth;
                    return (
                      <text
                        key={`lbl-${stepIdx}`}
                        x={cx}
                        y={bitVal === 1 ? yHigh - 3 : yLow + 8}
                        textAnchor="middle"
                        fill={bitVal === 1 ? sig.channelColor : "#475569"}
                        opacity={0.8}
                        style={{
                          fontSize: "8.5px",
                          fontFamily: "var(--font-mono)",
                          fontWeight: 700,
                        }}
                      >
                        {bitVal}
                      </text>
                    );
                  })}

                  {/* Right Telemetry Column (Total Rising & Falling Transitions) */}
                  <rect
                    x={leftHeaderWidth + waveformAreaWidth}
                    y={yLaneTop}
                    width={140}
                    height={rowHeight}
                    fill={channelIdx % 2 === 0 ? "#070c18" : "#090e1d"}
                  />
                  <text
                    x={leftHeaderWidth + waveformAreaWidth + 12}
                    y={yLaneTop + 16}
                    fill="#e2e8f0"
                    style={{
                      fontSize: "10.5px",
                      fontFamily: "var(--font-mono)",
                      fontWeight: 600,
                    }}
                  >
                    <tspan fill="#34d399">↑{risingEdges}</tspan>{" "}
                    <tspan fill="#f59e0b">↓{fallingEdges}</tspan> edges
                  </text>
                  <text
                    x={leftHeaderWidth + waveformAreaWidth + 12}
                    y={yLaneTop + 28}
                    fill="#94a3b8"
                    style={{
                      fontSize: "9px",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {showCursors
                      ? `X1:${channelSamples[clampedX1]} · X2:${channelSamples[clampedX2]}`
                      : `${Math.round(
                          (channelSamples.filter((v) => v === 1).length /
                            channelSamples.length) *
                            100
                        )}% High Duty`}
                  </text>
                </g>
              );
            })}

            {/* Vertical Divider Lines */}
            <line
              x1={leftHeaderWidth}
              y1={0}
              x2={leftHeaderWidth}
              y2={totalSvgHeight}
              stroke="#334155"
              strokeWidth="1.5"
            />
            <line
              x1={leftHeaderWidth + waveformAreaWidth}
              y1={0}
              x2={leftHeaderWidth + waveformAreaWidth}
              y2={totalSvgHeight}
              stroke="#334155"
              strokeWidth="1.5"
            />

            {/* Hover Inspector Step Line */}
            {hoverStep !== null && (
              <g pointerEvents="none">
                <line
                  x1={leftHeaderWidth + (hoverStep + 0.5) * stepWidth}
                  y1={topRulerHeight}
                  x2={leftHeaderWidth + (hoverStep + 0.5) * stepWidth}
                  y2={totalSvgHeight}
                  stroke="#38bdf8"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />
              </g>
            )}

            {/* Interactive Dual Cursors X1 & X2 */}
            {showCursors && totalSteps > 0 && (
              <>
                {/* Cursor X1 (Amber) */}
                {(() => {
                  const x1 = leftHeaderWidth + (clampedX1 + 0.5) * stepWidth;
                  return (
                    <g className="cursor-ew-resize">
                      <line
                        x1={x1}
                        y1={topRulerHeight}
                        x2={x1}
                        y2={totalSvgHeight}
                        stroke="#f59e0b"
                        strokeWidth="2"
                        strokeDasharray="4 2"
                      />
                      {/* Draggable Top Handle Tab */}
                      <polygon
                        points={`${x1 - 10},6 ${x1 + 10},6 ${x1 + 10},18 ${x1},26 ${
                          x1 - 10
                        },18`}
                        fill="#f59e0b"
                        stroke="#78350f"
                        strokeWidth="1"
                      />
                      <text
                        x={x1}
                        y={15}
                        textAnchor="middle"
                        fill="#000"
                        style={{
                          fontSize: "9px",
                          fontFamily: "var(--font-mono)",
                          fontWeight: 900,
                        }}
                      >
                        X1
                      </text>
                    </g>
                  );
                })()}

                {/* Cursor X2 (Cyan) */}
                {(() => {
                  const x2 = leftHeaderWidth + (clampedX2 + 0.5) * stepWidth;
                  return (
                    <g className="cursor-ew-resize">
                      <line
                        x1={x2}
                        y1={topRulerHeight}
                        x2={x2}
                        y2={totalSvgHeight}
                        stroke="#06b6d4"
                        strokeWidth="2"
                        strokeDasharray="4 2"
                      />
                      {/* Draggable Top Handle Tab */}
                      <polygon
                        points={`${x2 - 10},6 ${x2 + 10},6 ${x2 + 10},18 ${x2},26 ${
                          x2 - 10
                        },18`}
                        fill="#06b6d4"
                        stroke="#164e63"
                        strokeWidth="1"
                      />
                      <text
                        x={x2}
                        y={15}
                        textAnchor="middle"
                        fill="#000"
                        style={{
                          fontSize: "9px",
                          fontFamily: "var(--font-mono)",
                          fontWeight: 900,
                        }}
                      >
                        X2
                      </text>
                    </g>
                  );
                })()}
              </>
            )}
          </svg>
        </div>
      )}
    </div>
  );
}
