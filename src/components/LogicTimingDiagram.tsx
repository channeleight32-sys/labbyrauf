import React, { useState, useMemo, useRef, useEffect } from "react";
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
  Maximize2,
  Minimize2,
  X,
  Plus,
  HelpCircle,
} from "lucide-react";
import { CircuitNode, CircuitWire } from "./CircuitLab";

export interface NodeTimingRecord {
  nodeId: number;
  label: string;
  type: string;
  role: "clock" | "input" | "output" | "gate" | "flipflop" | "other";
  color: string;
  currentValue: number;
}

export interface NodeTimingSample {
  step: number;
  timestampMs?: number;
  timeLabel?: string;
  nodeValues: Record<number, number>; // nodeId -> 0, 1, or -1 (Z)
}

export interface LogicTimingDiagramProps {
  nodes: CircuitNode[];
  wires: CircuitWire[];
  liveVals: Record<number, number[]>;
  history: NodeTimingSample[];
  selectedNodeIds: number[];
  onToggleSelectNode: (nodeId: number) => void;
  onSelectAllNodes: () => void;
  onClearSelectedNodes: () => void;
  onSelectInputsOnly: () => void;
  onSelectOutputsOnly: () => void;
  autoClock: boolean;
  onToggleAutoClock: () => void;
  clockHz: number;
  onStepClock: () => void;
  onRunPatternSweep: () => void;
  onClearHistory: () => void;
  onClose?: () => void;
  isStandaloneModal?: boolean;
}

// Color palette for channels based on functional role
const ROLE_THEMES: Record<
  string,
  { stroke: string; fill: string; badge: string; text: string; bg: string }
> = {
  clock: {
    stroke: "#f59e0b",
    fill: "rgba(245, 158, 11, 0.18)",
    badge: "bg-amber-950/80 border-amber-600/60 text-amber-300",
    text: "text-amber-400",
    bg: "rgba(245, 158, 11, 0.08)",
  },
  input: {
    stroke: "#06b6d4",
    fill: "rgba(6, 182, 212, 0.18)",
    badge: "bg-cyan-950/80 border-cyan-600/60 text-cyan-300",
    text: "text-cyan-400",
    bg: "rgba(6, 182, 212, 0.08)",
  },
  output: {
    stroke: "#10b981",
    fill: "rgba(16, 185, 129, 0.18)",
    badge: "bg-emerald-950/80 border-emerald-600/60 text-emerald-300",
    text: "text-emerald-400",
    bg: "rgba(16, 185, 129, 0.08)",
  },
  flipflop: {
    stroke: "#f43f5e",
    fill: "rgba(244, 63, 94, 0.18)",
    badge: "bg-rose-950/80 border-rose-600/60 text-rose-300",
    text: "text-rose-400",
    bg: "rgba(244, 63, 94, 0.08)",
  },
  gate: {
    stroke: "#a855f7",
    fill: "rgba(168, 85, 247, 0.18)",
    badge: "bg-purple-950/80 border-purple-600/60 text-purple-300",
    text: "text-purple-400",
    bg: "rgba(168, 85, 247, 0.08)",
  },
  other: {
    stroke: "#94a3b8",
    fill: "rgba(148, 163, 184, 0.18)",
    badge: "bg-slate-900 border-slate-700 text-slate-300",
    text: "text-slate-400",
    bg: "rgba(148, 163, 184, 0.08)",
  },
};

const PALETTE_CYCLE = [
  "#06b6d4", // cyan
  "#10b981", // emerald
  "#f59e0b", // amber
  "#a855f7", // purple
  "#ec4899", // pink
  "#3b82f6", // blue
  "#14b8a6", // teal
  "#eab308", // yellow
  "#f43f5e", // rose
  "#8b5cf6", // violet
];

export default function LogicTimingDiagram({
  nodes,
  wires,
  liveVals,
  history,
  selectedNodeIds,
  onToggleSelectNode,
  onSelectAllNodes,
  onClearSelectedNodes,
  onSelectInputsOnly,
  onSelectOutputsOnly,
  autoClock,
  onToggleAutoClock,
  clockHz,
  onStepClock,
  onRunPatternSweep,
  onClearHistory,
  onClose,
  isStandaloneModal = false,
}: LogicTimingDiagramProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [visibleStepsCount, setVisibleStepsCount] = useState<number>(24);
  const [showGridGuide, setShowGridGuide] = useState<boolean>(true);
  const [showValuesOnWave, setShowValuesOnWave] = useState<boolean>(true);
  const [cursorA, setCursorA] = useState<number | null>(null);
  const [cursorB, setCursorB] = useState<number | null>(null);
  const [dragCursor, setDragCursor] = useState<"A" | "B" | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Derive all traceable nodes with their assigned roles and labels
  const traceableNodes: NodeTimingRecord[] = useMemo(() => {
    return nodes.map((n, idx) => {
      let role: NodeTimingRecord["role"] = "other";
      let label = n.label || `${n.type} #${n.id}`;

      if (n.type === "CLOCK") {
        role = "clock";
        label = n.label || `CLK #${n.id}`;
      } else if (n.type === "INPUT") {
        role = "input";
        label = n.label || `IN #${n.id}`;
      } else if (n.type === "OUTPUT") {
        role = "output";
        label = n.label || `OUT #${n.id}`;
      } else if (
        n.type.includes("FF") ||
        n.type.includes("FLIP") ||
        n.type.includes("LATCH") ||
        n.type === "DFF" ||
        n.type === "JKFF" ||
        n.type === "TFF"
      ) {
        role = "flipflop";
        label = n.label || `${n.type} #${n.id}`;
      } else if (
        ["AND", "OR", "XOR", "NAND", "NOR", "XNOR", "NOT"].includes(n.type)
      ) {
        role = "gate";
        label = n.label || `${n.type} #${n.id}`;
      }

      // Compute current live value
      let curVal = 0;
      if (n.type === "INPUT") {
        curVal = n.value ? 1 : 0;
      } else if (n.type === "CLOCK") {
        curVal = n.value ? 1 : 0;
      } else {
        curVal = liveVals[n.id]?.[0] ?? 0;
      }

      const color = PALETTE_CYCLE[idx % PALETTE_CYCLE.length];

      return {
        nodeId: n.id,
        label,
        type: n.type,
        role,
        color,
        currentValue: curVal,
      };
    });
  }, [nodes, liveVals]);

  // Filtered nodes in the selection shelf
  const filteredTraceableNodes = useMemo(() => {
    return traceableNodes.filter((n) => {
      const matchesSearch =
        !searchQuery ||
        n.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.type.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole = roleFilter === "ALL" || n.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [traceableNodes, searchQuery, roleFilter]);

  // The active channels to render (must be in selectedNodeIds)
  const activeChannels = useMemo(() => {
    return traceableNodes.filter((n) => selectedNodeIds.includes(n.nodeId));
  }, [traceableNodes, selectedNodeIds]);

  // Windowed history samples
  const windowedSamples = useMemo(() => {
    if (history.length === 0) {
      // Synthesize an initial step sample if empty
      const initialVals: Record<number, number> = {};
      traceableNodes.forEach((n) => {
        initialVals[n.nodeId] = n.currentValue;
      });
      return [{ step: 1, nodeValues: initialVals }];
    }
    return history.slice(-visibleStepsCount);
  }, [history, visibleStepsCount, traceableNodes]);

  const stepCount = windowedSamples.length;
  const channelHeight = 46;
  const topHeaderHeight = 32;
  const leftLabelWidth = 180;
  const stepWidth = Math.max(34, Math.min(65, 800 / Math.max(stepCount, 12)));
  const totalWaveWidth = Math.max(480, stepCount * stepWidth);
  const totalSvgWidth = leftLabelWidth + totalWaveWidth + 40;
  const totalSvgHeight = topHeaderHeight + activeChannels.length * channelHeight + 20;

  // Measurement Cursors Calculation
  const cursorStats = useMemo(() => {
    if (cursorA === null || cursorB === null) return null;
    const deltaSteps = Math.abs(cursorB - cursorA);
    const safeHz = Math.max(0.1, clockHz || 2);
    const stepDurationNs = Math.round(1000 / (safeHz * 2)); // simulated half-cycle ns
    const deltaNs = deltaSteps * stepDurationNs;
    const approxFreqMhz = deltaNs > 0 ? (1000 / deltaNs).toFixed(2) : "0.00";
    return {
      deltaSteps,
      deltaNs,
      approxFreqMhz,
      stepDurationNs,
    };
  }, [cursorA, cursorB, clockHz]);

  // Handler to set cursor positions by clicking on the waveform ruler
  const handleRulerClick = (stepIndex: number) => {
    if (cursorA === null) {
      setCursorA(stepIndex);
    } else if (cursorB === null) {
      setCursorB(stepIndex);
    } else {
      // Toggle or reset
      setCursorA(stepIndex);
      setCursorB(null);
    }
  };

  // Export Diagram as SVG
  const handleExportSVG = () => {
    if (!svgRef.current) return;
    setIsExporting(true);
    try {
      const serializer = new XMLSerializer();
      let source = serializer.serializeToString(svgRef.current);
      if (!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)) {
        source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
      }
      const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `LogicTimingDiagram-${Date.now()}.svg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("SVG Export error:", err);
    } finally {
      setIsExporting(false);
    }
  };

  const [csvDownloaded, setCsvDownloaded] = useState(false);
  const handleDownloadCsv = () => {
    if (activeChannels.length === 0) return;
    const stepDurationNs = Math.round(1000 / (Math.max(0.1, clockHz || 2) * 2));
    const headers = [
      "Step",
      "Time_ns",
      "Time_us",
      ...activeChannels.map((c) => `"${c.label.replace(/"/g, '""')}_Logic"`),
    ];
    const lines = [headers.join(",")];
    const rowsToExport =
      history.length > 0
        ? history
        : [
            {
              step: 0,
              nodeValues: Object.fromEntries(
                activeChannels.map((c) => [c.nodeId, c.currentValue])
              ),
            },
          ];
    rowsToExport.forEach((sample, idx) => {
      const tNs = idx * stepDurationNs;
      const tUs = (tNs / 1000).toFixed(6);
      const row: (string | number)[] = [sample.step, tNs, tUs];
      activeChannels.forEach((c) => {
        row.push(sample.nodeValues[c.nodeId] ?? c.currentValue ?? 0);
      });
      lines.push(row.join(","));
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `logic_timing_diagram_${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setCsvDownloaded(true);
    window.setTimeout(() => setCsvDownloaded(false), 2200);
  };

  return (
    <div
      className={`bg-[#090d18] border border-cyan-500/40 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100 ${
        isStandaloneModal ? "max-h-[92vh] w-full max-w-6xl" : "w-full"
      }`}
    >
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-slate-800 bg-[#0d1424]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500/25 to-emerald-500/25 border border-cyan-400/50 flex items-center justify-center shadow-inner">
            <Activity className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold font-mono text-white tracking-tight">
                Logic Timing Diagram
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-950 border border-cyan-600/70 text-cyan-300">
                {activeChannels.length} Active Traces
              </span>
              {autoClock && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  LIVE {clockHz}Hz
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 font-sans">
              Real-time digital signal transitions (HIGH / LOW), clock edge alignment &amp; propagation delays
            </p>
          </div>
        </div>

        {/* Action Controls in Header */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Step Clock Pulse Button */}
          <button
            type="button"
            onClick={onStepClock}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 transition-colors cursor-pointer shadow-sm"
            title="Single-step clock transition (triggers edge and evaluates logic)"
          >
            <StepForward className="w-3.5 h-3.5 text-cyan-400" />
            <span>Step Clock</span>
          </button>

          {/* Auto Clock Run/Pause Button */}
          <button
            type="button"
            onClick={onToggleAutoClock}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold border transition-all cursor-pointer shadow-sm ${
              autoClock
                ? "bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border-amber-400/80 shadow-[0_0_10px_rgba(245,158,11,0.25)]"
                : "bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border-emerald-400/70"
            }`}
            title="Toggle continuous free-running clock generator"
          >
            {autoClock ? (
              <>
                <Pause className="w-3.5 h-3.5 text-amber-400" />
                <span>Pause Clock</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
                <span>Run Clock ({clockHz}Hz)</span>
              </>
            )}
          </button>

          {/* Run Truth Table Pattern Sweep */}
          <button
            type="button"
            onClick={onRunPatternSweep}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold bg-gradient-to-r from-purple-500/20 to-cyan-500/20 hover:from-purple-500/30 hover:to-cyan-500/30 text-purple-200 border border-purple-400/50 transition-all cursor-pointer shadow-sm"
            title="Auto-step all combinational input states (00, 01, 10, 11...) to generate timing proof"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>Truth Sweep</span>
          </button>

          {/* Reset / Clear History */}
          <button
            type="button"
            onClick={onClearHistory}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-700 transition-colors cursor-pointer"
            title="Clear recorded transitions buffer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Download CSV */}
          <button
            type="button"
            onClick={handleDownloadCsv}
            disabled={activeChannels.length === 0}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold bg-cyan-500/20 hover:bg-cyan-500/30 disabled:opacity-40 text-cyan-200 border border-cyan-500/40 transition-colors cursor-pointer"
            title="Download logic timing samples as CSV for Excel or MATLAB"
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

          {/* Export SVG */}
          <button
            type="button"
            onClick={handleExportSVG}
            className="p-1.5 rounded-lg text-cyan-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-700 transition-colors cursor-pointer"
            title="Export timing diagram as vector SVG image"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          {/* Close button if standalone modal */}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-700 transition-colors cursor-pointer ml-1"
              title="Close Timing Diagram"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Secondary Controls Bar: Cursors, Zoom, Guides, Selection shortcuts */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-2.5 bg-[#0b101c] border-b border-slate-800 text-xs font-mono">
        {/* Left: Quick Trace Selectors */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-slate-500 text-[11px] uppercase tracking-wider font-bold mr-1">
            Trace:
          </span>
          <button
            type="button"
            onClick={onSelectAllNodes}
            className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white cursor-pointer"
          >
            All ({traceableNodes.length})
          </button>
          <button
            type="button"
            onClick={onSelectInputsOnly}
            className="px-2 py-1 rounded bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-700/60 text-cyan-300 cursor-pointer"
          >
            Inputs
          </button>
          <button
            type="button"
            onClick={onSelectOutputsOnly}
            className="px-2 py-1 rounded bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-700/60 text-emerald-300 cursor-pointer"
          >
            Outputs
          </button>
          <button
            type="button"
            onClick={onClearSelectedNodes}
            className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-rose-300 cursor-pointer"
          >
            Clear
          </button>
        </div>

        {/* Center: Timing Cursors Delta Readout */}
        <div className="flex items-center gap-3 bg-[#070b14] border border-slate-800/80 px-3 py-1 rounded-lg">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <span className="text-slate-400">T_A:</span>
            <span className="text-cyan-300 font-bold">
              {cursorA !== null ? `Step ${cursorA + 1}` : "Click ruler"}
            </span>
          </div>
          <span className="text-slate-600">|</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="text-slate-400">T_B:</span>
            <span className="text-amber-300 font-bold">
              {cursorB !== null ? `Step ${cursorB + 1}` : "Click ruler"}
            </span>
          </div>
          {cursorStats && (
            <>
              <span className="text-slate-600">|</span>
              <div className="text-emerald-400 font-bold">
                ΔT = {cursorStats.deltaSteps} steps ({cursorStats.deltaNs} ns)
              </div>
            </>
          )}
          {(cursorA !== null || cursorB !== null) && (
            <button
              type="button"
              onClick={() => {
                setCursorA(null);
                setCursorB(null);
              }}
              className="text-[10px] text-slate-400 hover:text-white px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 cursor-pointer ml-1"
            >
              Reset Cursors
            </button>
          )}
        </div>

        {/* Right: Display Options (Grid, Values, Window Size) */}
        <div className="flex items-center gap-2">
          {/* Toggle Guides */}
          <button
            type="button"
            onClick={() => setShowGridGuide((v) => !v)}
            className={`px-2 py-1 rounded border text-[11px] transition-colors cursor-pointer ${
              showGridGuide
                ? "bg-cyan-500/20 border-cyan-400/60 text-cyan-300"
                : "bg-slate-900 border-slate-800 text-slate-400"
            }`}
            title="Toggle vertical transition step grid lines"
          >
            Grid Lines
          </button>

          {/* Toggle Digital 0/1 Labels on Waveform */}
          <button
            type="button"
            onClick={() => setShowValuesOnWave((v) => !v)}
            className={`px-2 py-1 rounded border text-[11px] transition-colors cursor-pointer ${
              showValuesOnWave
                ? "bg-cyan-500/20 border-cyan-400/60 text-cyan-300"
                : "bg-slate-900 border-slate-800 text-slate-400"
            }`}
            title="Display 0 and 1 level text directly inside each pulse"
          >
            0/1 Badges
          </button>

          {/* Visible Steps Window Selector */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 text-[11px]">
            <span className="text-slate-500 mr-1.5">Window:</span>
            {[16, 24, 32, 48].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setVisibleStepsCount(n)}
                className={`px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                  visibleStepsCount === n
                    ? "bg-cyan-500/25 text-cyan-300 font-bold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Body: Channel Selector Shelf (Left Drawer/Pill list) + Waveform Canvas (Right) */}
      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden min-h-[340px]">
        {/* Node Trace Selector Shelf */}
        <div className="w-full lg:w-64 border-b lg:border-b-0 lg:border-r border-slate-800 bg-[#070b14] flex flex-col shrink-0">
          <div className="p-2.5 border-b border-slate-800/80 flex items-center justify-between gap-2">
            <span className="text-xs font-mono font-bold text-slate-300 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-cyan-400" />
              Trace Nodes ({selectedNodeIds.length}/{traceableNodes.length})
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              Toggle to plot
            </span>
          </div>

          {/* Search & Role Filter */}
          <div className="p-2 space-y-1.5 border-b border-slate-800/60">
            <div className="relative">
              <Search className="w-3 h-3 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filter by name/type..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-7 pr-2 py-1 bg-slate-900 border border-slate-800 rounded text-xs text-slate-200 placeholder-slate-500 font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div className="flex flex-wrap gap-1">
              {["ALL", "input", "output", "clock", "gate", "flipflop"].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRoleFilter(r)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono cursor-pointer transition-colors ${
                    roleFilter === r
                      ? "bg-cyan-500/30 text-cyan-200 font-bold border border-cyan-500/50"
                      : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800/80"
                  }`}
                >
                  {r.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Traceable Nodes List */}
          <div className="flex-1 overflow-y-auto max-h-48 lg:max-h-[460px] p-2 space-y-1 scrollbar-thin">
            {filteredTraceableNodes.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center font-mono">
                No matching nodes found.
              </p>
            ) : (
              filteredTraceableNodes.map((item) => {
                const isSelected = selectedNodeIds.includes(item.nodeId);
                const theme = ROLE_THEMES[item.role] || ROLE_THEMES.other;
                return (
                  <div
                    key={item.nodeId}
                    onClick={() => onToggleSelectNode(item.nodeId)}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-mono border transition-all cursor-pointer ${
                      isSelected
                        ? "bg-[#0e172a] border-cyan-500/60 text-white shadow-sm"
                        : "bg-slate-950/40 border-slate-800 text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={`w-3.5 h-3.5 rounded flex items-center justify-center border transition-colors ${
                          isSelected
                            ? "bg-cyan-500 border-cyan-400 text-slate-950"
                            : "border-slate-700 bg-slate-900"
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <div className="truncate">
                        <span className="font-bold block truncate">
                          {item.label}
                        </span>
                        <span className="text-[10px] text-slate-500 block truncate">
                          {item.type} #{item.nodeId}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold border ${theme.badge}`}
                      >
                        {item.role.toUpperCase()}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono ${
                          item.currentValue === 1
                            ? "bg-emerald-950 text-emerald-300 border border-emerald-700/60"
                            : item.currentValue === -1
                            ? "bg-amber-950 text-amber-300 border border-amber-700/60"
                            : "bg-slate-900 text-slate-400 border border-slate-800"
                        }`}
                      >
                        {item.currentValue === -1 ? "Z" : item.currentValue}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* SVG Timing Diagram Viewport */}
        <div className="flex-1 overflow-x-auto overflow-y-auto bg-[#05070e] relative select-none scrollbar-thin">
          {activeChannels.length === 0 ? (
            <div className="h-full min-h-[300px] flex flex-col items-center justify-center p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
                <Activity className="w-6 h-6 text-cyan-400" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-white font-mono">
                  No Channels Selected for Timing Analysis
                </h4>
                <p className="text-xs text-slate-400 max-w-md font-sans">
                  Select nodes from the left list or click the quick filters (Inputs, Outputs, All) to visualize their real-time HIGH and LOW transitions over time.
                </p>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={onSelectAllNodes}
                  className="px-3 py-1.5 rounded-lg text-xs font-mono font-bold bg-cyan-600 hover:bg-cyan-500 text-white cursor-pointer transition-colors"
                >
                  Select All Nodes
                </button>
                <button
                  type="button"
                  onClick={onSelectInputsOnly}
                  className="px-3 py-1.5 rounded-lg text-xs font-mono font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer transition-colors"
                >
                  Inputs Only
                </button>
                <button
                  type="button"
                  onClick={onSelectOutputsOnly}
                  className="px-3 py-1.5 rounded-lg text-xs font-mono font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer transition-colors"
                >
                  Outputs Only
                </button>
              </div>
            </div>
          ) : (
            <svg
              ref={svgRef}
              width={totalSvgWidth}
              height={totalSvgHeight}
              className="block font-mono text-xs"
            >
              <defs>
                {/* Background Grid Pattern */}
                <pattern
                  id="timing-dot-grid"
                  width="16"
                  height="16"
                  patternUnits="userSpaceOnUse"
                >
                  <circle cx="1" cy="1" r="0.75" fill="#1e293b" opacity="0.4" />
                </pattern>

                {/* Linear Gradients for Waveform Fills */}
                {activeChannels.map((ch) => (
                  <linearGradient
                    key={`grad-${ch.nodeId}`}
                    id={`wave-grad-${ch.nodeId}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor={ch.color} stopOpacity="0.28" />
                    <stop offset="100%" stopColor={ch.color} stopOpacity="0.04" />
                  </linearGradient>
                ))}
              </defs>

              {/* Background Grid */}
              <rect
                x="0"
                y="0"
                width={totalSvgWidth}
                height={totalSvgHeight}
                fill="url(#timing-dot-grid)"
              />

              {/* Channel Row Background Strips */}
              {activeChannels.map((ch, idx) => {
                const rowY = topHeaderHeight + idx * channelHeight;
                const isEven = idx % 2 === 0;
                return (
                  <rect
                    key={`row-bg-${ch.nodeId}`}
                    x={0}
                    y={rowY}
                    width={totalSvgWidth}
                    height={channelHeight}
                    fill={isEven ? "rgba(15, 23, 42, 0.45)" : "rgba(8, 12, 22, 0.4)"}
                    stroke="rgba(30, 41, 59, 0.4)"
                    strokeWidth="1"
                  />
                );
              })}

              {/* Time Step Guides & Column Separators */}
              {showGridGuide &&
                windowedSamples.map((sample, sIdx) => {
                  const stepX = leftLabelWidth + sIdx * stepWidth;
                  return (
                    <line
                      key={`grid-line-${sIdx}`}
                      x1={stepX}
                      y1={topHeaderHeight - 4}
                      x2={stepX}
                      y2={totalSvgHeight - 10}
                      stroke="rgba(51, 65, 85, 0.45)"
                      strokeWidth="1"
                      strokeDasharray="3 3"
                    />
                  );
                })}

              {/* Header Time Axis Ruler */}
              <g id="time-axis-header">
                {/* Ruler background strip */}
                <rect
                  x={leftLabelWidth}
                  y={4}
                  width={totalWaveWidth}
                  height={topHeaderHeight - 8}
                  rx={4}
                  fill="#0c1222"
                  stroke="#1e293b"
                  strokeWidth="1"
                />

                {windowedSamples.map((sample, sIdx) => {
                  const stepX = leftLabelWidth + sIdx * stepWidth;
                  const isCursorTarget = cursorA === sIdx || cursorB === sIdx;
                  return (
                    <g
                      key={`time-tick-${sIdx}`}
                      onClick={() => handleRulerClick(sIdx)}
                      className="cursor-pointer group"
                    >
                      {/* Step Tick Line */}
                      <line
                        x1={stepX}
                        y1={18}
                        x2={stepX}
                        y2={topHeaderHeight - 4}
                        stroke={isCursorTarget ? "#38bdf8" : "#475569"}
                        strokeWidth={isCursorTarget ? "2" : "1"}
                      />
                      {/* Step Label: T0, T1, T2... */}
                      <text
                        x={stepX + stepWidth / 2}
                        y={20}
                        textAnchor="middle"
                        fill={isCursorTarget ? "#38bdf8" : "#94a3b8"}
                        fontSize="10"
                        fontWeight={isCursorTarget ? "bold" : "normal"}
                        className="group-hover:fill-cyan-300"
                      >
                        T{sample.step}
                      </text>
                    </g>
                  );
                })}
              </g>

              {/* Left Channel Labels Column */}
              <g id="channel-labels">
                {/* Left Background bar */}
                <rect
                  x={0}
                  y={0}
                  width={leftLabelWidth}
                  height={totalSvgHeight}
                  fill="#080c16"
                  stroke="#1e293b"
                  strokeWidth="1"
                />

                {/* Left Header Title */}
                <text
                  x={14}
                  y={20}
                  fill="#64748b"
                  fontSize="10.5"
                  fontWeight="bold"
                  letterSpacing="0.05em"
                >
                  SIGNAL / NODE
                </text>
                <text
                  x={leftLabelWidth - 14}
                  y={20}
                  textAnchor="end"
                  fill="#64748b"
                  fontSize="10"
                >
                  LEVEL
                </text>

                {activeChannels.map((ch, idx) => {
                  const rowY = topHeaderHeight + idx * channelHeight;
                  const theme = ROLE_THEMES[ch.role] || ROLE_THEMES.other;

                  return (
                    <g key={`label-${ch.nodeId}`}>
                      {/* Channel Color Indicator bar */}
                      <rect
                        x={0}
                        y={rowY}
                        width={4}
                        height={channelHeight}
                        fill={ch.color}
                      />

                      {/* Channel Name */}
                      <text
                        x={14}
                        y={rowY + 18}
                        fill="#f8fafc"
                        fontSize="11.5"
                        fontWeight="bold"
                      >
                        {ch.label}
                      </text>

                      {/* Channel Type & Role Pill */}
                      <g transform={`translate(14, ${rowY + 24})`}>
                        <rect
                          x={0}
                          y={0}
                          width={44}
                          height={14}
                          rx={3}
                          fill={theme.bg}
                          stroke={ch.color}
                          strokeWidth="0.8"
                        />
                        <text
                          x={22}
                          y={10.5}
                          textAnchor="middle"
                          fill={theme.stroke}
                          fontSize="8.5"
                          fontWeight="bold"
                        >
                          {ch.role.toUpperCase()}
                        </text>
                      </g>

                      {/* Current Digital Live Value Indicator */}
                      <g transform={`translate(${leftLabelWidth - 36}, ${rowY + 12})`}>
                        <rect
                          x={0}
                          y={0}
                          width={24}
                          height={20}
                          rx={4}
                          fill={
                            ch.currentValue === 1
                              ? "rgba(16, 185, 129, 0.25)"
                              : ch.currentValue === -1
                              ? "rgba(245, 158, 11, 0.25)"
                              : "rgba(30, 41, 59, 0.8)"
                          }
                          stroke={
                            ch.currentValue === 1
                              ? "#10b981"
                              : ch.currentValue === -1
                              ? "#f59e0b"
                              : "#475569"
                          }
                          strokeWidth="1"
                        />
                        <text
                          x={12}
                          y={14}
                          textAnchor="middle"
                          fill={
                            ch.currentValue === 1
                              ? "#34d399"
                              : ch.currentValue === -1
                              ? "#fbbf24"
                              : "#94a3b8"
                          }
                          fontSize="11"
                          fontWeight="bold"
                        >
                          {ch.currentValue === -1 ? "Z" : ch.currentValue}
                        </text>
                      </g>
                    </g>
                  );
                })}
              </g>

              {/* Digital Square Waveforms */}
              <g id="digital-waveforms">
                {activeChannels.map((ch, cIdx) => {
                  const rowY = topHeaderHeight + cIdx * channelHeight;
                  const highY = rowY + 9; // High level (1)
                  const lowY = rowY + 33; // Low level (0)
                  const midY = rowY + 21; // Floating Z level

                  // Build digital square wave path
                  let pathD = "";
                  let fillPathD = "";
                  let prevY = lowY;

                  windowedSamples.forEach((sample, sIdx) => {
                    const val = sample.nodeValues[ch.nodeId] ?? ch.currentValue;
                    const curY = val === 1 ? highY : val === -1 ? midY : lowY;
                    const xStart = leftLabelWidth + sIdx * stepWidth;
                    const xEnd = xStart + stepWidth;

                    if (sIdx === 0) {
                      pathD += `M ${xStart} ${curY} L ${xEnd} ${curY} `;
                      fillPathD += `M ${xStart} ${lowY} L ${xStart} ${curY} L ${xEnd} ${curY} `;
                    } else {
                      // Transition edge from prevY to curY
                      if (prevY !== curY) {
                        pathD += `L ${xStart} ${curY} `;
                        fillPathD += `L ${xStart} ${curY} `;
                      }
                      pathD += `L ${xEnd} ${curY} `;
                      fillPathD += `L ${xEnd} ${curY} `;
                    }

                    prevY = curY;
                  });

                  // Complete fill path down to baseline
                  const lastX = leftLabelWidth + windowedSamples.length * stepWidth;
                  const firstX = leftLabelWidth;
                  fillPathD += `L ${lastX} ${lowY} L ${firstX} ${lowY} Z`;

                  return (
                    <g key={`waveform-${ch.nodeId}`}>
                      {/* Translucent area fill under pulses */}
                      <path
                        d={fillPathD}
                        fill={`url(#wave-grad-${ch.nodeId})`}
                        pointerEvents="none"
                      />

                      {/* Baseline guide line */}
                      <line
                        x1={leftLabelWidth}
                        y1={lowY}
                        x2={leftLabelWidth + totalWaveWidth}
                        y2={lowY}
                        stroke="rgba(71, 85, 105, 0.25)"
                        strokeWidth="1"
                        strokeDasharray="2 2"
                      />

                      {/* Main Sharp Digital Transition Trace */}
                      <path
                        d={pathD}
                        fill="none"
                        stroke={ch.color}
                        strokeWidth="2.2"
                        strokeLinecap="square"
                        strokeLinejoin="miter"
                      />

                      {/* 0 / 1 Logic Level Text Badges on Wave */}
                      {showValuesOnWave &&
                        windowedSamples.map((sample, sIdx) => {
                          const val = sample.nodeValues[ch.nodeId] ?? ch.currentValue;
                          const curY = val === 1 ? highY : val === -1 ? midY : lowY;
                          const xCenter = leftLabelWidth + sIdx * stepWidth + stepWidth / 2;

                          return (
                            <text
                              key={`val-badge-${sIdx}`}
                              x={xCenter}
                              y={val === 1 ? curY + 11 : curY - 3}
                              textAnchor="middle"
                              fill={val === 1 ? ch.color : "#64748b"}
                              fontSize="9"
                              fontWeight="bold"
                              opacity={val === 1 ? 0.9 : 0.65}
                            >
                              {val === -1 ? "Z" : val}
                            </text>
                          );
                        })}

                      {/* Edge Transition Arrows (↑ rising edge, ↓ falling edge) */}
                      {windowedSamples.map((sample, sIdx) => {
                        if (sIdx === 0) return null;
                        const prevVal =
                          windowedSamples[sIdx - 1].nodeValues[ch.nodeId] ?? ch.currentValue;
                        const curVal = sample.nodeValues[ch.nodeId] ?? ch.currentValue;
                        if (prevVal === curVal) return null;

                        const edgeX = leftLabelWidth + sIdx * stepWidth;
                        const isRising = prevVal === 0 && curVal === 1;

                        return (
                          <g key={`edge-${sIdx}`} transform={`translate(${edgeX - 4}, ${midY - 4})`}>
                            <rect
                              x={0}
                              y={0}
                              width={8}
                              height={8}
                              rx={2}
                              fill="#090d18"
                              stroke={ch.color}
                              strokeWidth="1"
                            />
                            <text
                              x={4}
                              y={6.5}
                              textAnchor="middle"
                              fill={isRising ? "#34d399" : "#f87171"}
                              fontSize="7"
                              fontWeight="bold"
                            >
                              {isRising ? "↑" : "↓"}
                            </text>
                          </g>
                        );
                      })}
                    </g>
                  );
                })}
              </g>

              {/* Cursor A (Cyan Marker) */}
              {cursorA !== null && cursorA < windowedSamples.length && (
                <g id="cursor-a-group">
                  {(() => {
                    const curX = leftLabelWidth + cursorA * stepWidth;
                    return (
                      <>
                        <line
                          x1={curX}
                          y1={topHeaderHeight - 8}
                          x2={curX}
                          y2={totalSvgHeight - 6}
                          stroke="#06b6d4"
                          strokeWidth="2"
                          strokeDasharray="4 2"
                        />
                        <polygon
                          points={`${curX - 6},${topHeaderHeight - 8} ${curX + 6},${topHeaderHeight - 8} ${curX},${topHeaderHeight - 1}`}
                          fill="#06b6d4"
                        />
                        <rect
                          x={curX - 12}
                          y={4}
                          width={24}
                          height={16}
                          rx={3}
                          fill="#083344"
                          stroke="#06b6d4"
                          strokeWidth="1.2"
                        />
                        <text
                          x={curX}
                          y={16}
                          textAnchor="middle"
                          fill="#67e8f9"
                          fontSize="9.5"
                          fontWeight="bold"
                        >
                          C_A
                        </text>
                      </>
                    );
                  })()}
                </g>
              )}

              {/* Cursor B (Amber Marker) */}
              {cursorB !== null && cursorB < windowedSamples.length && (
                <g id="cursor-b-group">
                  {(() => {
                    const curX = leftLabelWidth + cursorB * stepWidth;
                    return (
                      <>
                        <line
                          x1={curX}
                          y1={topHeaderHeight - 8}
                          x2={curX}
                          y2={totalSvgHeight - 6}
                          stroke="#f59e0b"
                          strokeWidth="2"
                          strokeDasharray="4 2"
                        />
                        <polygon
                          points={`${curX - 6},${topHeaderHeight - 8} ${curX + 6},${topHeaderHeight - 8} ${curX},${topHeaderHeight - 1}`}
                          fill="#f59e0b"
                        />
                        <rect
                          x={curX - 12}
                          y={4}
                          width={24}
                          height={16}
                          rx={3}
                          fill="#451a03"
                          stroke="#f59e0b"
                          strokeWidth="1.2"
                        />
                        <text
                          x={curX}
                          y={16}
                          textAnchor="middle"
                          fill="#fde68a"
                          fontSize="9.5"
                          fontWeight="bold"
                        >
                          C_B
                        </text>
                      </>
                    );
                  })()}
                </g>
              )}
            </svg>
          )}
        </div>
      </div>

      {/* Footer Info & Verification Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-2.5 bg-[#0b101c] border-t border-slate-800 text-xs font-mono text-slate-400">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1.5 text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>
              HIGH = V<sub>DD</sub> (5.0V / 1)
            </span>
          </span>
          <span className="text-slate-600">·</span>
          <span className="flex items-center gap-1.5 text-slate-400">
            <span className="w-2 h-2 rounded-full bg-slate-600" />
            LOW = GND (0.0V / 0)
          </span>
          <span className="text-slate-600">·</span>
          <span className="text-cyan-400 font-semibold">
            {stepCount} Simulation Transition Steps Recorded
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-500">
            Tip: Click any time step on ruler to place cursors C<sub>A</sub> &amp; C<sub>B</sub> to measure timing ΔT
          </span>
        </div>
      </div>
    </div>
  );
}
