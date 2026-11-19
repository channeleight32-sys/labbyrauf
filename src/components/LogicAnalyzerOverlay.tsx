import React, { useState, useMemo } from "react";
import {
  Activity,
  Play,
  Pause,
  StepForward,
  RotateCcw,
  Maximize2,
  Minimize2,
  X,
  Sliders,
  CheckSquare,
  Square,
  ChevronDown,
  ChevronUp,
  Cpu,
  Layers,
  Sparkles,
  Search,
  Download,
  Check,
} from "lucide-react";
import { LA_CHANNEL_PALETTE } from "./LogicAnalyzerModal";

export interface LogicNetDescriptor {
  wireId: number;
  netName: string;
  sourceLabel: string;
  targetLabel: string;
  sourceType: string;
  targetType: string;
  currentLogic: 0 | 1;
}

export interface LogicTimingSample {
  step: number;
  timeLabel?: string;
  netValues: Record<number, 0 | 1>; // wireId -> logic level
}

interface LogicAnalyzerOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  nets: LogicNetDescriptor[];
  selectedWireIds: number[];
  onToggleSelectNet: (wireId: number) => void;
  onSelectAllNets: () => void;
  onClearSelectedNets: () => void;
  onSelectInputsOnly: () => void;
  onSelectOutputsOnly: () => void;
  history: LogicTimingSample[];
  autoClock: boolean;
  onToggleAutoClock: () => void;
  clockHz: number;
  onStepClock: () => void;
  onClearHistory: () => void;
  onOpenFullAnalyzerModal?: () => void;
}

export const LogicAnalyzerOverlay: React.FC<LogicAnalyzerOverlayProps> = ({
  isOpen,
  onClose,
  nets,
  selectedWireIds,
  onToggleSelectNet,
  onSelectAllNets,
  onClearSelectedNets,
  onSelectInputsOnly,
  onSelectOutputsOnly,
  history,
  autoClock,
  onToggleAutoClock,
  clockHz,
  onStepClock,
  onClearHistory,
  onOpenFullAnalyzerModal,
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isNetPickerOpen, setIsNetPickerOpen] = useState(false);
  const [netFilterQuery, setNetFilterQuery] = useState("");
  const [hoveredStepIdx, setHoveredStepIdx] = useState<number | null>(null);
  const [csvDownloaded, setCsvDownloaded] = useState(false);

  // Armed channels ordered strictly by selectedWireIds priority (Smart-Sync CH1..CH4 first)
  const activeNets = useMemo(() => {
    const orderMap = new Map<number, number>();
    selectedWireIds.forEach((id, idx) => orderMap.set(id, idx));
    return nets
      .filter((n) => orderMap.has(n.wireId))
      .sort((a, b) => (orderMap.get(a.wireId) ?? 0) - (orderMap.get(b.wireId) ?? 0))
      .map((n, idx) => ({
        ...n,
        channelIdx: idx,
        color: LA_CHANNEL_PALETTE[idx % LA_CHANNEL_PALETTE.length],
      }));
  }, [nets, selectedWireIds]);

  const filteredNetsForPicker = useMemo(() => {
    const q = netFilterQuery.trim().toLowerCase();
    if (!q) return nets;
    return nets.filter(
      (n) =>
        n.netName.toLowerCase().includes(q) ||
        n.sourceLabel.toLowerCase().includes(q) ||
        n.targetLabel.toLowerCase().includes(q)
    );
  }, [nets, netFilterQuery]);

  if (!isOpen) return null;

  const stepCount = Math.max(history.length, 12);
  const stepWidth = 26;
  const channelHeight = 32;
  const waveformWidth = Math.max(320, stepCount * stepWidth);

  const handleDownloadCsv = () => {
    if (activeNets.length === 0) return;
    const nsPerStep = Math.round(1000 / Math.max(0.1, clockHz * 2));
    const headers = [
      "Step",
      "Time_ns",
      "Time_us",
      ...activeNets.map((n) => `"${n.netName.replace(/"/g, '""')}_Logic"`),
    ];
    const lines = [headers.join(",")];
    const rowsToExport =
      history.length > 0
        ? history
        : [
            {
              step: 0,
              netValues: Object.fromEntries(
                activeNets.map((n) => [n.wireId, n.currentLogic])
              ),
            },
          ];

    rowsToExport.forEach((sample, idx) => {
      const tNs = idx * nsPerStep;
      const tUs = (tNs / 1000).toFixed(6);
      const row: (string | number)[] = [sample.step, tNs, tUs];
      activeNets.forEach((n) => {
        row.push(sample.netValues[n.wireId] ?? n.currentLogic);
      });
      lines.push(row.join(","));
    });

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `logic_analyzer_overlay_${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setCsvDownloaded(true);
    window.setTimeout(() => setCsvDownloaded(false), 2200);
  };

  return (
    <div className="bg-slate-950/95 border border-cyan-500/35 rounded-2xl shadow-2xl backdrop-blur-md overflow-hidden transition-all duration-200">
      {/* Top Header & Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 px-4 py-2.5 bg-slate-900/90 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-cyan-950/80 border border-cyan-500/50 text-cyan-400">
            <Activity className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold font-mono tracking-wider text-cyan-300 uppercase">
                Digital Logic Analyzer
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-700/80 text-cyan-400">
                {activeNets.length} Net{activeNets.length === 1 ? "" : "s"} Armed
              </span>
            </div>
            <p className="text-[10px] text-slate-400 hidden sm:block">
              Real-time multi-channel digital signal timing diagram
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Net Selector Dropdown Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsNetPickerOpen(!isNetPickerOpen)}
              className="px-2.5 py-1 text-xs font-mono rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>Select Nets ({selectedWireIds.length})</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {/* Net Selector Popover */}
            {isNetPickerOpen && (
              <div className="absolute right-0 top-full mt-2 w-72 max-h-80 z-50 bg-slate-900 border border-cyan-500/40 rounded-xl shadow-2xl p-2.5 flex flex-col gap-2">
                <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                  <span className="text-xs font-mono font-semibold text-cyan-300">
                    Schematic Nets ({nets.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsNetPickerOpen(false)}
                    className="text-slate-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="relative">
                  <Search className="w-3 h-3 text-slate-500 absolute left-2 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={netFilterQuery}
                    onChange={(e) => setNetFilterQuery(e.target.value)}
                    placeholder="Filter nets..."
                    className="w-full pl-6 pr-2 py-0.5 text-[11px] rounded bg-slate-950 border border-slate-700 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono"
                  />
                </div>

                {/* Quick Filters */}
                <div className="flex items-center gap-1 text-[10px] font-mono">
                  <button
                    type="button"
                    onClick={onSelectAllNets}
                    className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={onSelectInputsOnly}
                    className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 cursor-pointer"
                  >
                    Inputs
                  </button>
                  <button
                    type="button"
                    onClick={onSelectOutputsOnly}
                    className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-emerald-300 cursor-pointer"
                  >
                    Outputs
                  </button>
                  <button
                    type="button"
                    onClick={onClearSelectedNets}
                    className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-rose-300 ml-auto cursor-pointer"
                  >
                    Clear
                  </button>
                </div>

                {/* Nets List */}
                <div className="overflow-y-auto max-h-48 space-y-1 pr-1 scrollbar-thin scrollbar-thumb-slate-700">
                  {filteredNetsForPicker.length === 0 ? (
                    <div className="text-center py-4 text-xs text-slate-500 font-mono">
                      No nets found in schematic
                    </div>
                  ) : (
                    filteredNetsForPicker.map((net) => {
                      const isSelected = selectedWireIds.includes(net.wireId);
                      return (
                        <div
                          key={net.wireId}
                          onClick={() => onToggleSelectNet(net.wireId)}
                          className={`flex items-center justify-between px-2 py-1 rounded cursor-pointer text-xs font-mono transition-colors ${
                            isSelected
                              ? "bg-cyan-950/60 border border-cyan-800 text-cyan-200"
                              : "hover:bg-slate-800 text-slate-300"
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate pr-2">
                            {isSelected ? (
                              <CheckSquare className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                            ) : (
                              <Square className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            )}
                            <span className="truncate">{net.netName}</span>
                          </div>
                          <span
                            className={`text-[10px] font-bold px-1 rounded ${
                              net.currentLogic === 1
                                ? "bg-emerald-950 text-emerald-400"
                                : "bg-slate-800 text-slate-500"
                            }`}
                          >
                            {net.currentLogic}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Clock controls */}
          <button
            type="button"
            onClick={onToggleAutoClock}
            className={`px-2.5 py-1 text-xs font-mono rounded-lg border flex items-center gap-1.5 cursor-pointer transition-colors ${
              autoClock
                ? "bg-emerald-500/20 border-emerald-500/60 text-emerald-300 hover:bg-emerald-500/30"
                : "bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200 hover:text-white"
            }`}
            title={autoClock ? "Pause Clock" : "Run Auto Clock"}
          >
            {autoClock ? (
              <>
                <Pause className="w-3 h-3 text-emerald-400" />
                <span>Running ({clockHz}Hz)</span>
              </>
            ) : (
              <>
                <Play className="w-3 h-3 text-cyan-400" />
                <span>Auto Clock</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onStepClock}
            className="px-2 py-1 text-xs font-mono rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
            title="Single Step Simulation Clock"
          >
            <StepForward className="w-3 h-3 text-cyan-400" />
            <span>Step</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadCsv}
            disabled={activeNets.length === 0}
            className="px-2.5 py-1 text-xs font-mono font-bold rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 disabled:opacity-40 border border-cyan-500/40 text-cyan-200 flex items-center gap-1 cursor-pointer transition-colors"
            title="Download captured logic waveform data as CSV for Excel or MATLAB"
          >
            {csvDownloaded ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span>Downloaded!</span>
              </>
            ) : (
              <>
                <Download className="w-3 h-3 text-cyan-300" />
                <span>Download CSV</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onClearHistory}
            className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-white cursor-pointer transition-colors"
            title="Clear Waveform History"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Pro Modal Launcher */}
          {onOpenFullAnalyzerModal && (
            <button
              type="button"
              onClick={onOpenFullAnalyzerModal}
              className="px-2 py-1 text-xs font-mono rounded-lg bg-cyan-950/80 hover:bg-cyan-900/90 border border-cyan-500/60 text-cyan-300 flex items-center gap-1 cursor-pointer transition-colors"
              title="Open Full 16-Channel Logic Analyzer with Triggers & Bus Decoding"
            >
              <Maximize2 className="w-3 h-3" />
              <span className="hidden md:inline">Deep Analyzer</span>
            </button>
          )}

          {/* Minimize / Collapse */}
          <button
            type="button"
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-white cursor-pointer transition-colors"
            title={isMinimized ? "Expand Analyzer" : "Minimize Analyzer"}
          >
            {isMinimized ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Close */}
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg bg-slate-800 hover:bg-rose-900/40 border border-slate-700 text-slate-400 hover:text-rose-300 cursor-pointer transition-colors"
            title="Close Logic Analyzer Overlay"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Waveform Display Body */}
      {!isMinimized && (
        <div className="p-3">
          {activeNets.length === 0 ? (
            <div className="py-8 px-4 text-center space-y-2">
              <Activity className="w-7 h-7 text-cyan-400/40 mx-auto" />
              <p className="text-xs font-mono text-slate-300 font-medium">
                No schematic nets are currently armed in the logic analyzer.
              </p>
              <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                Click &quot;Select Nets&quot; in the toolbar above to choose signals, or select &quot;Inputs&quot; or &quot;Outputs&quot; to begin capturing real-time timing waveforms.
              </p>
              <div className="pt-2 flex justify-center gap-2">
                <button
                  type="button"
                  onClick={onSelectAllNets}
                  className="px-3 py-1 text-xs font-mono rounded-lg bg-cyan-950 border border-cyan-500/50 text-cyan-300 hover:bg-cyan-900/60 transition-colors cursor-pointer"
                >
                  Select All Nets
                </button>
                <button
                  type="button"
                  onClick={onSelectInputsOnly}
                  className="px-3 py-1 text-xs font-mono rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  Select All Inputs
                </button>
              </div>
            </div>
          ) : (
            <div className="flex border border-slate-800/90 rounded-xl overflow-hidden bg-slate-950">
              {/* Channel Legends (Left Column) */}
              <div className="w-48 shrink-0 border-r border-slate-800/90 bg-slate-900/60 divide-y divide-slate-800/70">
                {/* Header spacer */}
                <div className="h-6 flex items-center px-2.5 text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                  Channel / Net
                </div>
                {activeNets.map((net) => (
                  <div
                    key={net.wireId}
                    style={{ height: `${channelHeight}px` }}
                    className="flex items-center justify-between px-2.5 font-mono text-xs gap-1.5"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: net.color }}
                      />
                      <span
                        className="font-semibold truncate text-[11px]"
                        style={{ color: net.color }}
                        title={net.netName}
                      >
                        {net.netName}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          net.currentLogic === 1
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-700"
                            : "bg-slate-900 text-slate-500 border border-slate-800"
                        }`}
                      >
                        {net.currentLogic === 1 ? "H" : "L"}
                      </span>
                      <button
                        type="button"
                        onClick={() => onToggleSelectNet(net.wireId)}
                        className="text-slate-500 hover:text-rose-400 p-0.5 cursor-pointer"
                        title="Remove channel"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Multi-Channel Timing Waveform Canvas (Right Scrollable Area) */}
              <div className="flex-1 overflow-x-auto relative scrollbar-thin scrollbar-thumb-slate-700">
                <div
                  style={{ width: `${waveformWidth}px` }}
                  className="relative select-none"
                >
                  {/* Time Step Scale Axis (Top) */}
                  <div className="h-6 flex border-b border-slate-800/80 bg-slate-900/40 text-[9px] font-mono text-slate-500">
                    {Array.from({ length: stepCount }).map((_, i) => (
                      <div
                        key={i}
                        style={{ width: `${stepWidth}px` }}
                        className="shrink-0 flex items-center justify-center border-r border-slate-800/40"
                      >
                        T{i}
                      </div>
                    ))}
                  </div>

                  {/* Channels Timing SVG */}
                  <svg
                    width={waveformWidth}
                    height={activeNets.length * channelHeight}
                    className="block"
                    onMouseMove={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const x = e.clientX - rect.left;
                      const sIdx = Math.floor(x / stepWidth);
                      if (sIdx >= 0 && sIdx < history.length) {
                        setHoveredStepIdx(sIdx);
                      } else {
                        setHoveredStepIdx(null);
                      }
                    }}
                    onMouseLeave={() => setHoveredStepIdx(null)}
                  >
                    <defs>
                      <pattern
                        id="la-grid-sub"
                        width={stepWidth}
                        height={channelHeight}
                        patternUnits="userSpaceOnUse"
                      >
                        <line
                          x1={stepWidth}
                          y1="0"
                          x2={stepWidth}
                          y2={channelHeight}
                          stroke="#1e293b"
                          strokeWidth="0.8"
                          strokeDasharray="2,2"
                        />
                        <line
                          x1="0"
                          y1={channelHeight}
                          x2={stepWidth}
                          y2={channelHeight}
                          stroke="#1e293b"
                          strokeWidth="1"
                        />
                      </pattern>
                    </defs>

                    {/* Grid Background */}
                    <rect
                      x="0"
                      y="0"
                      width={waveformWidth}
                      height={activeNets.length * channelHeight}
                      fill="url(#la-grid-sub)"
                    />

                    {/* Hover cursor vertical line */}
                    {hoveredStepIdx !== null && (
                      <line
                        x1={hoveredStepIdx * stepWidth + stepWidth / 2}
                        y1="0"
                        x2={hoveredStepIdx * stepWidth + stepWidth / 2}
                        y2={activeNets.length * channelHeight}
                        stroke="#38bdf8"
                        strokeWidth="1.5"
                        strokeDasharray="3,3"
                      />
                    )}

                    {/* Channel Traces */}
                    {activeNets.map((net, rowIdx) => {
                      const rowY = rowIdx * channelHeight;
                      const highY = rowY + 6;
                      const lowY = rowY + channelHeight - 6;

                      // Build SVG path from history
                      let pathD = "";
                      if (history.length > 0) {
                        history.forEach((sample, sIdx) => {
                          const val = sample.netValues[net.wireId] ?? 0;
                          const x0 = sIdx * stepWidth;
                          const x1 = (sIdx + 1) * stepWidth;
                          const y = val === 1 ? highY : lowY;

                          if (sIdx === 0) {
                            pathD += `M ${x0},${y} L ${x1},${y}`;
                          } else {
                            const prevVal =
                              history[sIdx - 1].netValues[net.wireId] ?? 0;
                            const prevY = prevVal === 1 ? highY : lowY;
                            if (prevY !== y) {
                              pathD += ` L ${x0},${y}`;
                            }
                            pathD += ` L ${x1},${y}`;
                          }
                        });
                      } else {
                        // Default flat line at current level
                        const y = net.currentLogic === 1 ? highY : lowY;
                        pathD = `M 0,${y} L ${waveformWidth},${y}`;
                      }

                      return (
                        <g key={net.wireId}>
                          {/* Channel trace line */}
                          <path
                            d={pathD}
                            fill="none"
                            stroke={net.color}
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />

                          {/* Glow drop-shadow effect */}
                          <path
                            d={pathD}
                            fill="none"
                            stroke={net.color}
                            strokeWidth="5"
                            strokeOpacity="0.18"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </g>
                      );
                    })}
                  </svg>
                </div>
              </div>
            </div>
          )}

          {/* Hover Cursor Telemetry Footer */}
          {hoveredStepIdx !== null && history[hoveredStepIdx] && (
            <div className="mt-2 flex items-center gap-3 px-3 py-1.5 bg-slate-900 border border-cyan-500/30 rounded-lg text-xs font-mono text-slate-300">
              <span className="text-cyan-400 font-bold">
                Cursor @ Step T{hoveredStepIdx}:
              </span>
              <div className="flex items-center gap-3 flex-wrap">
                {activeNets.map((net) => {
                  const val =
                    history[hoveredStepIdx].netValues[net.wireId] ?? 0;
                  return (
                    <span key={net.wireId} className="flex items-center gap-1">
                      <span style={{ color: net.color }} className="font-semibold">
                        {net.netName}:
                      </span>
                      <span
                        className={
                          val === 1
                            ? "text-emerald-400 font-bold"
                            : "text-slate-400"
                        }
                      >
                        {val}
                      </span>
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LogicAnalyzerOverlay;
