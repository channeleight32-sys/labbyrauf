import React, { useMemo, useState } from "react";
import {
  Activity,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Clock,
  Layers,
  Maximize2,
  Pause,
  Play,
  RotateCcw,
  Search,
  Square,
  StepForward,
  X,
} from "lucide-react";
import type { CircuitNode } from "./CircuitLab";

export const TIMING_WINDOW_MS = 500;

export interface TimingTransitionSample {
  timestampMs: number;
  values: Record<number, number>; // nodeId -> 1 (HIGH), 0 (LOW), or -1 (Z)
}

interface TimingDiagramOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  nodes: CircuitNode[];
  liveVals: Record<number, number[]>;
  monitoredNodeIds: number[];
  onToggleMonitorNode: (nodeId: number) => void;
  onMonitorAllNodes: () => void;
  onMonitorIOAndClocks: () => void;
  onClearMonitoredNodes: () => void;
  transitionsHistory: TimingTransitionSample[];
  windowNowMs: number;
  isCapturePaused: boolean;
  onToggleCapturePause: () => void;
  onClearHistory: () => void;
  isSimRunning: boolean;
  autoClock: boolean;
  onToggleAutoClock: () => void;
  clockHz: number;
  onStepClock: () => void;
  onOpenFullDiagramModal?: () => void;
}

const TRACE_COLORS = [
  "#35BDF2",
  "#48C99A",
  "#F1B65B",
  "#A78BFA",
  "#F472B6",
  "#38BDF8",
  "#2DD4BF",
  "#FB923C",
];

const TIME_TICKS_REL_MS = [-500, -400, -300, -200, -100, 0] as const;

function getNodeRoleTag(type: string): string {
  if (type === "CLOCK") return "CLK";
  if (type === "INPUT" || type.startsWith("SWITCH_") || type.includes("BUTTON")) return "IN";
  if (type === "OUTPUT" || type === "LED" || type === "7SEG") return "OUT";
  if (type === "DFF" || type === "JKFF" || type === "TFF" || type.includes("FF") || type.includes("LATCH")) {
    return "FF";
  }
  if (["AND", "OR", "NAND", "NOR", "XOR", "XNOR", "NOT", "BUF"].includes(type)) return "GATE";
  return "NODE";
}

function getLiveNodeState(node: CircuitNode, liveVals: Record<number, number[]>): number {
  if (node.type === "INPUT" || node.type === "CLOCK") {
    return node.value ? 1 : 0;
  }
  return liveVals[node.id]?.[0] ?? 0;
}

export const TimingDiagramOverlay: React.FC<TimingDiagramOverlayProps> = ({
  isOpen,
  onClose,
  nodes,
  liveVals,
  monitoredNodeIds,
  onToggleMonitorNode,
  onMonitorAllNodes,
  onMonitorIOAndClocks,
  onClearMonitoredNodes,
  transitionsHistory,
  windowNowMs,
  isCapturePaused,
  onToggleCapturePause,
  onClearHistory,
  isSimRunning,
  autoClock,
  onToggleAutoClock,
  clockHz,
  onStepClock,
  onOpenFullDiagramModal,
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isNodePickerOpen, setIsNodePickerOpen] = useState(false);
  const [nodeFilterQuery, setNodeFilterQuery] = useState("");
  const [hoverRelMs, setHoverRelMs] = useState<number | null>(null);
  const [cursorARelMs, setCursorARelMs] = useState<number | null>(null);
  const [cursorBRelMs, setCursorBRelMs] = useState<number | null>(null);

  const windowEndMs = windowNowMs;
  const windowStartMs = windowEndMs - TIMING_WINDOW_MS;

  const monitoredDescriptors = useMemo(() => {
    const idSet = new Set(monitoredNodeIds);
    return nodes
      .filter((n) => idSet.has(n.id))
      .map((n, idx) => ({
        id: n.id,
        label: n.label || `${n.type} #${n.id}`,
        type: n.type,
        role: getNodeRoleTag(n.type),
        color: TRACE_COLORS[idx % TRACE_COLORS.length],
        currentVal: getLiveNodeState(n, liveVals),
      }));
  }, [nodes, monitoredNodeIds, liveVals]);

  const filteredAllNodes = useMemo(() => {
    const q = nodeFilterQuery.trim().toLowerCase();
    return nodes
      .map((n) => ({
        id: n.id,
        label: n.label || `${n.type} #${n.id}`,
        type: n.type,
        role: getNodeRoleTag(n.type),
        currentVal: getLiveNodeState(n, liveVals),
      }))
      .filter((n) => {
        if (!q) return true;
        return (
          n.label.toLowerCase().includes(q) ||
          n.type.toLowerCase().includes(q) ||
          n.role.toLowerCase().includes(q)
        );
      });
  }, [nodes, liveVals, nodeFilterQuery]);

  // Sort samples chronologically and separate left-edge anchor vs samples inside (windowStartMs, windowEndMs]
  const { anchorSample, windowSamples } = useMemo(() => {
    const sorted = [...transitionsHistory].sort((a, b) => a.timestampMs - b.timestampMs);
    let anchor: TimingTransitionSample | null = null;
    const inWin: TimingTransitionSample[] = [];
    for (const s of sorted) {
      if (s.timestampMs <= windowStartMs) {
        anchor = s;
      } else if (s.timestampMs <= windowEndMs) {
        inWin.push(s);
      }
    }
    return { anchorSample: anchor, windowSamples: inWin };
  }, [transitionsHistory, windowStartMs, windowEndMs]);

  // Compute waveform geometry & transition events for each monitored node over the 500ms window
  const leftColWidth = 176;
  const waveWidth = 620;
  const rightPad = 14;
  const svgWidth = leftColWidth + waveWidth + rightPad;
  const headerHeight = 24;
  const rowHeight = 34;
  const svgHeight = headerHeight + Math.max(1, monitoredDescriptors.length) * rowHeight + 6;

  const traceSeries = useMemo(() => {
    return monitoredDescriptors.map((nodeDesc) => {
      const initialVal =
        anchorSample?.values[nodeDesc.id] ??
        windowSamples[0]?.values[nodeDesc.id] ??
        nodeDesc.currentVal;

      const segments: { t0: number; t1: number; val: number }[] = [];
      const edges: { t: number; from: number; to: number }[] = [];

      let curT = windowStartMs;
      let curVal = initialVal;

      for (const s of windowSamples) {
        const nextVal = s.values[nodeDesc.id] ?? curVal;
        const clampedT = Math.max(windowStartMs, Math.min(windowEndMs, s.timestampMs));
        if (clampedT > curT) {
          segments.push({ t0: curT, t1: clampedT, val: curVal });
        }
        if (nextVal !== curVal) {
          edges.push({ t: clampedT, from: curVal, to: nextVal });
        }
        curT = clampedT;
        curVal = nextVal;
      }

      if (curT < windowEndMs) {
        segments.push({ t0: curT, t1: windowEndMs, val: curVal });
      }
      if (segments.length === 0) {
        segments.push({ t0: windowStartMs, t1: windowEndMs, val: curVal });
      }

      return {
        node: nodeDesc,
        segments,
        edges,
      };
    });
  }, [monitoredDescriptors, anchorSample, windowSamples, windowStartMs, windowEndMs]);

  const totalEdgesInWindow = useMemo(
    () => traceSeries.reduce((acc, item) => acc + item.edges.length, 0),
    [traceSeries]
  );

  // Sample state at hoverRelMs (-500 .. 0) for live cursor readout
  const hoverSnapshot = useMemo(() => {
    if (hoverRelMs === null) return null;
    const targetMs = windowEndMs + hoverRelMs;
    const vals: Record<number, number> = {};
    for (const ts of traceSeries) {
      const seg =
        ts.segments.find((s) => targetMs >= s.t0 && targetMs <= s.t1) ??
        ts.segments[ts.segments.length - 1];
      vals[ts.node.id] = seg ? seg.val : ts.node.currentVal;
    }
    return { relMs: hoverRelMs, vals };
  }, [hoverRelMs, windowEndMs, traceSeries]);

  if (!isOpen) return null;

  const mapTimeToX = (tsMs: number) => {
    const ratio = (tsMs - windowStartMs) / TIMING_WINDOW_MS;
    return leftColWidth + Math.max(0, Math.min(1, ratio)) * waveWidth;
  };

  const handleSvgMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const scaleX = svgWidth / Math.max(1, rect.width);
    const localX = (e.clientX - rect.left) * scaleX;
    if (localX < leftColWidth || localX > leftColWidth + waveWidth) {
      setHoverRelMs(null);
      return;
    }
    const ratio = (localX - leftColWidth) / waveWidth;
    const rel = Math.round(-TIMING_WINDOW_MS + ratio * TIMING_WINDOW_MS);
    setHoverRelMs(Math.max(-TIMING_WINDOW_MS, Math.min(0, rel)));
  };

  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const scaleX = svgWidth / Math.max(1, rect.width);
    const localX = (e.clientX - rect.left) * scaleX;
    if (localX < leftColWidth || localX > leftColWidth + waveWidth) return;
    const ratio = (localX - leftColWidth) / waveWidth;
    const rel = Math.round(-TIMING_WINDOW_MS + ratio * TIMING_WINDOW_MS);
    const clamped = Math.max(-TIMING_WINDOW_MS, Math.min(0, rel));
    if (cursorARelMs === null) {
      setCursorARelMs(clamped);
    } else if (cursorBRelMs === null) {
      setCursorBRelMs(clamped);
    } else {
      setCursorARelMs(clamped);
      setCursorBRelMs(null);
    }
  };

  return (
    <div
      className="bg-[#111B2B]/96 border border-[#35BDF2]/55 rounded-xl shadow-2xl backdrop-blur-md overflow-visible"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Overlay Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 bg-[#162338] border-b border-[#24344D] rounded-t-xl">
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#0B1220] border border-[#35BDF2]/40 flex items-center justify-center">
            <Activity className="w-4 h-4 text-[#35BDF2]" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-mono font-bold text-[#F1F5FA] tracking-tight">
                Timing Diagram Overlay
              </span>
              <span className="px-1.5 py-0.5 rounded bg-[#0B1220] border border-[#24344D] text-[10px] font-mono font-bold text-[#35BDF2] tabular-nums">
                Last 500ms
              </span>
              <span className="px-1.5 py-0.5 rounded bg-[#0B1220] border border-[#24344D] text-[10px] font-mono text-[#9BAAC0] tabular-nums">
                {monitoredDescriptors.length} Monitored · {totalEdgesInWindow} Edge
                {totalEdgesInWindow === 1 ? "" : "s"}
              </span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border ${
                  !isSimRunning
                    ? "bg-amber-950/50 border-[#F1B65B]/50 text-[#F1B65B]"
                    : isCapturePaused
                    ? "bg-amber-950/50 border-[#F1B65B]/50 text-[#F1B65B]"
                    : "bg-emerald-950/50 border-[#48C99A]/50 text-[#48C99A]"
                }`}
              >
                {!isSimRunning
                  ? "SIM STANDBY"
                  : isCapturePaused
                  ? "CAPTURE FROZEN"
                  : "LIVE CAPTURE"}
              </span>
            </div>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs">
          {/* Monitored Node Picker Popover */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsNodePickerOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0B1220] hover:bg-[#1C2B40] border border-[#24344D] text-[11px] font-semibold text-[#F1F5FA] cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5 text-[#35BDF2]" />
              <span>Monitor Nodes ({monitoredDescriptors.length})</span>
              <ChevronDown className="w-3 h-3 text-[#9BAAC0]" />
            </button>

            {isNodePickerOpen && (
              <div className="absolute right-0 bottom-full mb-2 w-72 z-50 bg-[#111B2B] border border-[#35BDF2]/50 rounded-xl shadow-2xl p-2.5 space-y-2">
                <div className="flex items-center justify-between border-b border-[#24344D] pb-1.5">
                  <span className="text-[11px] font-bold text-[#35BDF2]">
                    Monitored Nodes ({monitoredDescriptors.length}/{nodes.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsNodePickerOpen(false)}
                    className="text-[#9BAAC0] hover:text-[#F1F5FA] cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="relative">
                  <Search className="w-3 h-3 text-[#9BAAC0] absolute left-2 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={nodeFilterQuery}
                    onChange={(e) => setNodeFilterQuery(e.target.value)}
                    placeholder="Filter nodes..."
                    className="w-full pl-6 pr-2 py-1 text-[11px] rounded bg-[#0B1220] border border-[#24344D] text-[#F1F5FA] placeholder-[#5E708A] focus:outline-none focus:border-[#35BDF2]"
                  />
                </div>

                <div className="flex items-center gap-1 text-[10px]">
                  <button
                    type="button"
                    onClick={onMonitorAllNodes}
                    className="px-2 py-0.5 rounded bg-[#162338] hover:bg-[#1C2B40] border border-[#24344D] text-[#F1F5FA] cursor-pointer"
                  >
                    All ({nodes.length})
                  </button>
                  <button
                    type="button"
                    onClick={onMonitorIOAndClocks}
                    className="px-2 py-0.5 rounded bg-[#162338] hover:bg-[#1C2B40] border border-[#24344D] text-[#35BDF2] cursor-pointer"
                  >
                    I/O &amp; Clocks
                  </button>
                  <button
                    type="button"
                    onClick={onClearMonitoredNodes}
                    className="px-2 py-0.5 rounded bg-[#162338] hover:bg-[#1C2B40] border border-[#24344D] text-[#F07474] ml-auto cursor-pointer"
                  >
                    Clear
                  </button>
                </div>

                <div className="max-h-44 overflow-y-auto space-y-1 pr-0.5">
                  {filteredAllNodes.length === 0 ? (
                    <div className="text-center py-3 text-[11px] text-[#9BAAC0]">
                      No circuit nodes found.
                    </div>
                  ) : (
                    filteredAllNodes.map((n) => {
                      const checked = monitoredNodeIds.includes(n.id);
                      return (
                        <button
                          key={n.id}
                          type="button"
                          onClick={() => onToggleMonitorNode(n.id)}
                          className={`w-full flex items-center justify-between px-2 py-1 rounded text-[11px] cursor-pointer text-left border ${
                            checked
                              ? "bg-[#162338] border-[#35BDF2]/50 text-[#F1F5FA]"
                              : "bg-[#0B1220] border-[#24344D] text-[#9BAAC0] hover:text-[#F1F5FA]"
                          }`}
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            {checked ? (
                              <CheckSquare className="w-3.5 h-3.5 text-[#35BDF2] shrink-0" />
                            ) : (
                              <Square className="w-3.5 h-3.5 text-[#5E708A] shrink-0" />
                            )}
                            <span className="truncate font-semibold">{n.label}</span>
                            <span className="text-[9.5px] text-[#5E708A] shrink-0">
                              [{n.role}]
                            </span>
                          </div>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-bold shrink-0 ${
                              n.currentVal === 1
                                ? "bg-emerald-950/60 text-[#48C99A]"
                                : n.currentVal === -1
                                ? "bg-amber-950/60 text-[#F1B65B]"
                                : "bg-[#162338] text-[#9BAAC0]"
                            }`}
                          >
                            {n.currentVal === -1 ? "Z" : n.currentVal === 1 ? "H" : "L"}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Freeze / Resume 500ms Capture */}
          <button
            type="button"
            onClick={onToggleCapturePause}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer ${
              isCapturePaused
                ? "bg-amber-500/20 border-[#F1B65B] text-[#F1B65B]"
                : "bg-[#0B1220] hover:bg-[#1C2B40] border-[#24344D] text-[#48C99A]"
            }`}
            title={isCapturePaused ? "Resume live 500ms capture" : "Freeze 500ms window to inspect transitions"}
          >
            {isCapturePaused ? (
              <>
                <Play className="w-3 h-3" />
                <span>Resume</span>
              </>
            ) : (
              <>
                <Pause className="w-3 h-3" />
                <span>Freeze</span>
              </>
            )}
          </button>

          {/* Auto Clock Run/Pause */}
          <button
            type="button"
            onClick={onToggleAutoClock}
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold border cursor-pointer ${
              autoClock
                ? "bg-[#35BDF2]/20 border-[#35BDF2] text-[#35BDF2]"
                : "bg-[#0B1220] hover:bg-[#1C2B40] border-[#24344D] text-[#9BAAC0]"
            }`}
            title="Toggle automatic clock pulses"
          >
            <Clock className="w-3 h-3" />
            <span>{autoClock ? `CLK ${clockHz}Hz` : "Auto CLK"}</span>
          </button>

          {/* Step Clock */}
          <button
            type="button"
            onClick={onStepClock}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#0B1220] hover:bg-[#1C2B40] border border-[#24344D] text-[11px] text-[#F1F5FA] cursor-pointer"
            title="Pulse clock input once"
          >
            <StepForward className="w-3 h-3 text-[#35BDF2]" />
            <span>Step</span>
          </button>

          {/* Clear 500ms History */}
          <button
            type="button"
            onClick={() => {
              onClearHistory();
              setCursorARelMs(null);
              setCursorBRelMs(null);
            }}
            className="p-1.5 rounded-lg bg-[#0B1220] hover:bg-[#1C2B40] border border-[#24344D] text-[#9BAAC0] hover:text-[#F1F5FA] cursor-pointer"
            title="Clear 500ms transition buffer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Optional Full Modal Launcher */}
          {onOpenFullDiagramModal && (
            <button
              type="button"
              onClick={onOpenFullDiagramModal}
              className="p-1.5 rounded-lg bg-[#0B1220] hover:bg-[#1C2B40] border border-[#24344D] text-[#35BDF2] cursor-pointer"
              title="Open Expanded Timing Diagram Modal"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Minimize / Expand */}
          <button
            type="button"
            onClick={() => setIsMinimized((v) => !v)}
            className="p-1.5 rounded-lg bg-[#0B1220] hover:bg-[#1C2B40] border border-[#24344D] text-[#9BAAC0] hover:text-[#F1F5FA] cursor-pointer"
            title={isMinimized ? "Expand Timing Diagram Overlay" : "Minimize Timing Diagram Overlay"}
          >
            {isMinimized ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {/* Close Overlay */}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[#0B1220] hover:bg-rose-950/60 border border-[#24344D] text-[#9BAAC0] hover:text-[#F07474] cursor-pointer"
            title="Close Timing Diagram Overlay"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main 500ms Waveform Body */}
      {!isMinimized && (
        <div className="p-2.5 space-y-2 bg-[#0B1220] rounded-b-xl">
          {monitoredDescriptors.length === 0 ? (
            <div className="py-5 px-4 text-center space-y-2 border border-[#24344D] rounded-lg bg-[#111B2B]">
              <p className="text-xs font-mono text-[#F1F5FA] font-semibold">
                No nodes are currently monitored for the 500ms Timing Diagram.
              </p>
              <p className="text-[11px] text-[#9BAAC0]">
                Select nodes via &quot;Monitor Nodes&quot; or choose a quick preset below to track HIGH/LOW transitions.
              </p>
              <div className="flex items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={onMonitorAllNodes}
                  className="px-3 py-1 rounded-lg bg-[#35BDF2] hover:bg-[#58CAF5] text-[#0B1220] text-xs font-mono font-bold cursor-pointer"
                >
                  Monitor All Nodes ({nodes.length})
                </button>
                <button
                  type="button"
                  onClick={onMonitorIOAndClocks}
                  className="px-3 py-1 rounded-lg bg-[#162338] hover:bg-[#1C2B40] border border-[#24344D] text-[#35BDF2] text-xs font-mono font-semibold cursor-pointer"
                >
                  I/O &amp; Clocks Only
                </button>
              </div>
            </div>
          ) : (
            <div className="border border-[#24344D] rounded-lg overflow-hidden bg-[#0B1220]">
              <div className="max-h-56 overflow-y-auto overflow-x-auto">
                <svg
                  viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                  className="w-full min-w-[660px] h-auto block select-none font-mono"
                  onMouseMove={handleSvgMouseMove}
                  onMouseLeave={() => setHoverRelMs(null)}
                  onClick={handleSvgClick}
                >
                  {/* Time Grid Vertical Lines every 100ms */}
                  {TIME_TICKS_REL_MS.map((relMs) => {
                    const x = mapTimeToX(windowEndMs + relMs);
                    return (
                      <g key={`tick-${relMs}`}>
                        <line
                          x1={x}
                          y1={headerHeight - 4}
                          x2={x}
                          y2={svgHeight - 4}
                          stroke={relMs === 0 ? "#35BDF2" : "#24344D"}
                          strokeWidth={relMs === 0 ? 1.2 : 1}
                          strokeDasharray={relMs === 0 ? undefined : "3 3"}
                        />
                        <text
                          x={relMs === 0 ? x - 2 : relMs === -500 ? x + 2 : x}
                          y={15}
                          textAnchor={relMs === 0 ? "end" : relMs === -500 ? "start" : "middle"}
                          fill={relMs === 0 ? "#35BDF2" : "#9BAAC0"}
                          fontSize="9.5"
                          fontWeight="600"
                        >
                          {relMs === 0 ? "0ms (NOW)" : `${relMs}ms`}
                        </text>
                      </g>
                    );
                  })}

                  {/* Left Column Header */}
                  <rect x={0} y={0} width={leftColWidth} height={svgHeight} fill="#111B2B" />
                  <line
                    x1={leftColWidth}
                    y1={0}
                    x2={leftColWidth}
                    y2={svgHeight}
                    stroke="#24344D"
                    strokeWidth="1"
                  />
                  <text x={10} y={15} fill="#9BAAC0" fontSize="9.5" fontWeight="700">
                    MONITORED NODE
                  </text>
                  <text
                    x={leftColWidth - 10}
                    y={15}
                    textAnchor="end"
                    fill="#9BAAC0"
                    fontSize="9.5"
                  >
                    STATE
                  </text>

                  {/* Channel Rows & 500ms Square Waveforms */}
                  {traceSeries.map((series, idx) => {
                    const { node, segments, edges } = series;
                    const rowY = headerHeight + idx * rowHeight;
                    const highY = rowY + 7;
                    const lowY = rowY + rowHeight - 7;
                    const midY = rowY + rowHeight / 2;

                    let tracePath = "";
                    let fillPath = "";
                    let prevY = lowY;

                    segments.forEach((seg, sIdx) => {
                      const x0 = mapTimeToX(seg.t0);
                      const x1 = mapTimeToX(seg.t1);
                      const y = seg.val === 1 ? highY : seg.val === -1 ? midY : lowY;
                      if (sIdx === 0) {
                        tracePath += `M ${x0.toFixed(2)},${y} L ${x1.toFixed(2)},${y}`;
                        fillPath += `M ${x0.toFixed(2)},${lowY} L ${x0.toFixed(2)},${y} L ${x1.toFixed(2)},${y}`;
                      } else {
                        if (prevY !== y) {
                          tracePath += ` L ${x0.toFixed(2)},${y}`;
                          fillPath += ` L ${x0.toFixed(2)},${y}`;
                        }
                        tracePath += ` L ${x1.toFixed(2)},${y}`;
                        fillPath += ` L ${x1.toFixed(2)},${y}`;
                      }
                      prevY = y;
                    });
                    const endX = mapTimeToX(windowEndMs);
                    const startX = mapTimeToX(windowStartMs);
                    fillPath += ` L ${endX.toFixed(2)},${lowY} L ${startX.toFixed(2)},${lowY} Z`;

                    return (
                      <g key={node.id}>
                        {/* Row Background */}
                        <rect
                          x={leftColWidth}
                          y={rowY}
                          width={waveWidth + rightPad}
                          height={rowHeight}
                          fill={idx % 2 === 0 ? "rgba(17, 27, 43, 0.35)" : "rgba(11, 18, 32, 0.45)"}
                        />
                        <line
                          x1={0}
                          y1={rowY}
                          x2={svgWidth}
                          y2={rowY}
                          stroke="#1C2B40"
                          strokeWidth="1"
                        />

                        {/* Left Label Cell */}
                        <rect x={0} y={rowY} width={3.5} height={rowHeight} fill={node.color} />
                        <text
                          x={10}
                          y={rowY + 14}
                          fill="#F1F5FA"
                          fontSize="10.5"
                          fontWeight="700"
                        >
                          {node.label.length > 14 ? `${node.label.slice(0, 13)}…` : node.label}
                        </text>
                        <text x={10} y={rowY + 26} fill="#9BAAC0" fontSize="8.5">
                          {node.role} · {edges.length} edge{edges.length === 1 ? "" : "s"}
                        </text>

                        {/* Current State Badge */}
                        <rect
                          x={leftColWidth - 36}
                          y={rowY + 8}
                          width={28}
                          height={18}
                          rx={4}
                          fill={
                            node.currentVal === 1
                              ? "rgba(72, 201, 154, 0.18)"
                              : node.currentVal === -1
                              ? "rgba(241, 182, 91, 0.18)"
                              : "rgba(22, 35, 56, 0.9)"
                          }
                          stroke={
                            node.currentVal === 1
                              ? "#48C99A"
                              : node.currentVal === -1
                              ? "#F1B65B"
                              : "#24344D"
                          }
                          strokeWidth="1"
                        />
                        <text
                          x={leftColWidth - 22}
                          y={rowY + 20.5}
                          textAnchor="middle"
                          fill={
                            node.currentVal === 1
                              ? "#48C99A"
                              : node.currentVal === -1
                              ? "#F1B65B"
                              : "#9BAAC0"
                          }
                          fontSize="9.5"
                          fontWeight="700"
                        >
                          {node.currentVal === -1 ? "Z" : node.currentVal === 1 ? "H" : "L"}
                        </text>

                        {/* HIGH area fill & digital square wave trace */}
                        <path d={fillPath} fill={node.color} fillOpacity="0.14" />
                        <path
                          d={tracePath}
                          fill="none"
                          stroke={node.color}
                          strokeWidth="2"
                          strokeLinecap="square"
                          strokeLinejoin="miter"
                        />

                        {/* Edge transition dots */}
                        {edges.map((ed, eIdx) => {
                          const ex = mapTimeToX(ed.t);
                          return (
                            <circle
                              key={`edge-${eIdx}`}
                              cx={ex}
                              cy={midY}
                              r={2.5}
                              fill={ed.to === 1 ? "#48C99A" : "#F1B65B"}
                              stroke="#0B1220"
                              strokeWidth="1"
                            />
                          );
                        })}
                      </g>
                    );
                  })}

                  {/* Measurement Cursors T1 & T2 */}
                  {cursorARelMs !== null && (
                    <g>
                      <line
                        x1={mapTimeToX(windowEndMs + cursorARelMs)}
                        y1={headerHeight}
                        x2={mapTimeToX(windowEndMs + cursorARelMs)}
                        y2={svgHeight}
                        stroke="#35BDF2"
                        strokeWidth="1.5"
                      />
                    </g>
                  )}
                  {cursorBRelMs !== null && (
                    <g>
                      <line
                        x1={mapTimeToX(windowEndMs + cursorBRelMs)}
                        y1={headerHeight}
                        x2={mapTimeToX(windowEndMs + cursorBRelMs)}
                        y2={svgHeight}
                        stroke="#F1B65B"
                        strokeWidth="1.5"
                      />
                    </g>
                  )}

                  {/* Hover Crosshair */}
                  {hoverRelMs !== null && (
                    <line
                      x1={mapTimeToX(windowEndMs + hoverRelMs)}
                      y1={headerHeight}
                      x2={mapTimeToX(windowEndMs + hoverRelMs)}
                      y2={svgHeight}
                      stroke="#F1F5FA"
                      strokeOpacity="0.65"
                      strokeWidth="1"
                      strokeDasharray="3 2"
                    />
                  )}
                </svg>
              </div>
            </div>
          )}

          {/* Footer Readout Bar: Hover Sample / Cursor Delta Timing */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-[#111B2B] border border-[#24344D] text-[11px] font-mono tabular-nums">
            <div className="flex flex-wrap items-center gap-2.5">
              {hoverSnapshot ? (
                <>
                  <span className="text-[#35BDF2] font-bold">
                    t = {hoverSnapshot.relMs}ms:
                  </span>
                  {traceSeries.slice(0, 6).map(({ node }) => {
                    const v = hoverSnapshot.vals[node.id] ?? 0;
                    return (
                      <span key={node.id} className="inline-flex items-center gap-1">
                        <span style={{ color: node.color }} className="font-semibold">
                          {node.label}=
                        </span>
                        <span className={v === 1 ? "text-[#48C99A] font-bold" : v === -1 ? "text-[#F1B65B] font-bold" : "text-[#9BAAC0]"}>
                          {v === -1 ? "Z" : v === 1 ? "1 (HIGH)" : "0 (LOW)"}
                        </span>
                      </span>
                    );
                  })}
                </>
              ) : (
                <span className="text-[#9BAAC0]">
                  Hover trace to inspect states at any millisecond · Click waveform to place T1/T2 timing cursors
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {cursorARelMs !== null && (
                <span className="text-[#35BDF2]">T1: {cursorARelMs}ms</span>
              )}
              {cursorBRelMs !== null && (
                <span className="text-[#F1B65B]">T2: {cursorBRelMs}ms</span>
              )}
              {cursorARelMs !== null && cursorBRelMs !== null && (
                <span className="text-[#48C99A] font-bold">
                  Δt = {Math.abs(cursorBRelMs - cursorARelMs)}ms
                </span>
              )}
              {(cursorARelMs !== null || cursorBRelMs !== null) && (
                <button
                  type="button"
                  onClick={() => {
                    setCursorARelMs(null);
                    setCursorBRelMs(null);
                  }}
                  className="px-1.5 py-0.5 rounded bg-[#162338] hover:bg-[#1C2B40] border border-[#24344D] text-[10px] text-[#9BAAC0] hover:text-[#F1F5FA] cursor-pointer"
                >
                  Clear Δt
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimingDiagramOverlay;
