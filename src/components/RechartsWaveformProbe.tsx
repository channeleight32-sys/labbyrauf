import React, { useState, useEffect, useMemo } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Legend,
} from "recharts";
import {
  Activity,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Crosshair,
  Layers,
  CheckSquare,
  AlertTriangle,
} from "lucide-react";
import { CircuitNode, CircuitWire } from "./CircuitLab";
import { GATE_SPECS, COMP_SPECS } from "../data/logicSpecs";
import { GateOperationInsight } from "../utils/circuitAnalyzer";

export interface SignalPathDescriptor {
  id: string;
  label: string;
  shortLabel: string;
  category: "input" | "gate" | "wire" | "ic" | "output";
  color: string;
  nodeId?: number;
  portIdx?: number;
  wireId?: number;
  booleanExpr?: string;
}

export interface RealtimeWaveformSample {
  step: number;
  timeLabel: string;
  timestampMs: number;
  values: Record<string, number>;
}

interface RechartsWaveformProbeProps {
  nodes: CircuitNode[];
  wires: CircuitWire[];
  liveVals: Record<number, number[]>;
  selectedCanvasItem: { type: "node" | "wire"; id: number } | null;
  insightByNodeId: Map<number, GateOperationInsight>;
  history: RealtimeWaveformSample[];
  onClearHistory: () => void;
  onTriggerStepSweep: () => void;
  onSelectCanvasItem?: (item: { type: "node" | "wire"; id: number } | null) => void;
  isHalted?: boolean;
  haltReason?: string;
}

const PALETTE = [
  "#38bdf8", // cyan
  "#22c55e", // emerald
  "#f59e0b", // amber
  "#a855f7", // purple
  "#f43f5e", // rose
  "#eab308", // yellow
  "#14b8a6", // teal
  "#60a5fa", // blue
  "#fb923c", // orange
  "#c084fc", // violet
];

/**
 * Enumerates every probeable signal path in the current CircuitLab schematic:
 * - Input switches
 * - Internal logic gate outputs
 * - MSI / Flip-Flop IC output pins
 * - Individual schematic wire nets (From -> To)
 * - Output LEDs & 7-Segment input lines
 */
export function discoverCircuitSignalPaths(
  nodes: CircuitNode[],
  wires: CircuitWire[],
  insightByNodeId: Map<number, GateOperationInsight>
): SignalPathDescriptor[] {
  const paths: SignalPathDescriptor[] = [];
  let colorIdx = 0;
  const nextColor = () => PALETTE[colorIdx++ % PALETTE.length];

  const inputNodes = nodes.filter((n) => n.type === "INPUT");
  const outputNodes = nodes.filter((n) => n.type === "OUTPUT");

  // 1. Input Nodes
  inputNodes.forEach((inp, idx) => {
    const name = inp.label || `I${idx + 1}`;
    paths.push({
      id: `node:${inp.id}:0`,
      label: `IN · ${name}`,
      shortLabel: name,
      category: "input",
      color: nextColor(),
      nodeId: inp.id,
      portIdx: 0,
      booleanExpr: `Input Stimulus ${name}`,
    });
  });

  // 2. Logic Gates (Internal & Cascaded)
  nodes.forEach((n) => {
    if (!GATE_SPECS[n.type]) return;
    const ins = insightByNodeId.get(n.id);
    const expr = ins?.simplifiedName || `${n.type} #${n.id}`;
    paths.push({
      id: `node:${n.id}:0`,
      label: `GATE · ${n.type} #${n.id}`,
      shortLabel: `${n.type}#${n.id}`,
      category: "gate",
      color: nextColor(),
      nodeId: n.id,
      portIdx: 0,
      booleanExpr: expr,
    });
  });

  // 3. Flip-Flops & MSI Components (all output pins)
  nodes.forEach((n) => {
    const comp = COMP_SPECS[n.type];
    if (!comp || comp.outputs.length === 0) return;
    comp.outputs.forEach((pin, pIdx) => {
      const pinName = pin.name || `OUT${pIdx}`;
      paths.push({
        id: `node:${n.id}:${pIdx}`,
        label: `IC · ${comp.label}#${n.id}.${pinName}`,
        shortLabel: `${comp.label}.${pinName}`,
        category: "ic",
        color: nextColor(),
        nodeId: n.id,
        portIdx: pIdx,
        booleanExpr: `${comp.label} Pin ${pinName}`,
      });
    });
  });

  // 4. Output Nodes
  outputNodes.forEach((outp, idx) => {
    const name = outp.label || `O${idx + 1}`;
    const ins = insightByNodeId.get(outp.id);
    paths.push({
      id: `node:${outp.id}:0`,
      label: `OUT · ${name}`,
      shortLabel: name,
      category: "output",
      color: nextColor(),
      nodeId: outp.id,
      portIdx: 0,
      booleanExpr: ins?.simplifiedName || `Output ${name}`,
    });
  });

  // 5. Directed Schematic Wire Paths (for net-level probing)
  wires.forEach((w) => {
    const fromNode = nodes.find((n) => n.id === w.from.node);
    const toNode = nodes.find((n) => n.id === w.to.node);
    if (!fromNode || !toNode) return;

    const fromName =
      fromNode.label ||
      (COMP_SPECS[fromNode.type]
        ? `${COMP_SPECS[fromNode.type].label}.${
            COMP_SPECS[fromNode.type].outputs[w.from.port]?.name ?? w.from.port
          }`
        : `${fromNode.type}#${fromNode.id}`);

    const toName =
      toNode.label ||
      (COMP_SPECS[toNode.type]
        ? `${COMP_SPECS[toNode.type].label}.${
            COMP_SPECS[toNode.type].inputs[w.to.port]?.name ?? w.to.port
          }`
        : `${toNode.type}#${toNode.id}[in${w.to.port}]`);

    paths.push({
      id: `wire:${w.id}`,
      label: `NET #${w.id}: ${fromName} → ${toName}`,
      shortLabel: `${fromName}→${toName}`,
      category: "wire",
      color: nextColor(),
      wireId: w.id,
      nodeId: w.from.node,
      portIdx: w.from.port,
      booleanExpr: `Signal Path from ${fromName} to ${toName}`,
    });
  });

  return paths;
}

/**
 * Evaluates all signal path values for a given settled circuit state.
 */
export function extractSignalPathValues(
  nodes: CircuitNode[],
  wires: CircuitWire[],
  outs: Record<number, number[]>
): Record<string, number> {
  const values: Record<string, number> = {};
  for (const n of nodes) {
    const arr = outs[n.id] || [0];
    arr.forEach((v, pIdx) => {
      values[`node:${n.id}:${pIdx}`] = v === -1 ? -1 : v ? 1 : 0;
    });
  }
  for (const w of wires) {
    const v = outs[w.from.node]?.[w.from.port] ?? 0;
    values[`wire:${w.id}`] = v === -1 ? -1 : v ? 1 : 0;
  }
  return values;
}

export default function RechartsWaveformProbe({
  nodes,
  wires,
  liveVals,
  selectedCanvasItem,
  insightByNodeId,
  history,
  onClearHistory,
  onTriggerStepSweep,
  onSelectCanvasItem,
  isHalted,
  haltReason,
}: RechartsWaveformProbeProps) {
  const allPaths = useMemo(
    () => discoverCircuitSignalPaths(nodes, wires, insightByNodeId),
    [nodes, wires, insightByNodeId]
  );

  const [selectedPathIds, setSelectedPathIds] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<"STACKED" | "OVERLAY">("STACKED");
  const [categoryFilter, setCategoryFilter] = useState<
    "ALL" | "IO_GATES" | "WIRES"
  >("IO_GATES");
  const [liveStreamActive, setLiveStreamActive] = useState<boolean>(false);

  // Preserve user selection across circuit updates, populating sensible defaults on initial load
  useEffect(() => {
    const validSet = new Set(allPaths.map((p) => p.id));
    setSelectedPathIds((prev) => {
      const retained = prev.filter((id) => validSet.has(id));
      if (retained.length > 0) return retained;
      return allPaths
        .filter((p) => p.category !== "wire")
        .slice(0, 8)
        .map((p) => p.id);
    });
  }, [allPaths]);

  // Automatically add & focus a signal path when user clicks a node or wire on the schematic canvas
  useEffect(() => {
    if (!selectedCanvasItem) return;
    if (selectedCanvasItem.type === "wire") {
      const wireKey = `wire:${selectedCanvasItem.id}`;
      setSelectedPathIds((prev) =>
        prev.includes(wireKey) ? prev : [...prev, wireKey]
      );
    } else if (selectedCanvasItem.type === "node") {
      const matching = allPaths.filter(
        (p) => p.nodeId === selectedCanvasItem.id && p.category !== "wire"
      );
      if (matching.length > 0) {
        setSelectedPathIds((prev) => {
          const next = new Set(prev);
          matching.forEach((m) => next.add(m.id));
          return Array.from(next);
        });
      }
    }
  }, [selectedCanvasItem, allPaths]);

  const togglePath = (id: string) => {
    setSelectedPathIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const activePaths = useMemo(
    () => allPaths.filter((p) => selectedPathIds.includes(p.id)),
    [allPaths, selectedPathIds]
  );

  const visibleFilterPaths = useMemo(() => {
    if (categoryFilter === "ALL") return allPaths;
    if (categoryFilter === "WIRES")
      return allPaths.filter((p) => p.category === "wire");
    return allPaths.filter((p) => p.category !== "wire");
  }, [allPaths, categoryFilter]);

  // Format chart data array for Recharts
  const chartData = useMemo(() => {
    return history.map((pt) => {
      const row: Record<string, number | string> = {
        step: pt.step,
        timeLabel: pt.timeLabel,
      };
      allPaths.forEach((p) => {
        row[p.id] = pt.values[p.id] ?? 0;
      });
      return row;
    });
  }, [history, allPaths]);

  // Compute live signal statistics (Duty cycle %, Rising edges, Falling edges)
  const pathStats = useMemo(() => {
    const stats: Record<
      string,
      { highPct: number; rising: number; falling: number; current: number }
    > = {};
    const liveMap = extractSignalPathValues(nodes, wires, liveVals);

    allPaths.forEach((p) => {
      let ones = 0;
      let rising = 0;
      let falling = 0;
      history.forEach((h, idx) => {
        const v = h.values[p.id] ?? 0;
        if (v === 1) ones++;
        if (idx > 0) {
          const prev = history[idx - 1].values[p.id] ?? 0;
          if (prev === 0 && v === 1) rising++;
          if (prev === 1 && v === 0) falling++;
        }
      });
      stats[p.id] = {
        highPct:
          history.length > 0 ? Math.round((ones / history.length) * 100) : 0,
        rising,
        falling,
        current: liveMap[p.id] ?? 0,
      };
    });
    return stats;
  }, [allPaths, history, nodes, wires, liveVals]);

  // Optional continuous sampling stream for real-time visualization
  useEffect(() => {
    if (!liveStreamActive) return;
    const timer = setInterval(() => {
      onTriggerStepSweep();
    }, 650);
    return () => clearInterval(timer);
  }, [liveStreamActive, onTriggerStepSweep]);

  return (
    <div className="bg-[#111827] border border-cyan-500/30 rounded-xl p-5 space-y-5">
      {/* Top Header & Oscilloscope Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400 shrink-0" />
            <h3 className="text-base font-bold text-white">
              Real-Time Signal Path Waveform Analyzer (Recharts Logic Oscilloscope)
            </h3>
          </div>
          <p className="text-xs text-slate-400">
            Select any input, internal gate, IC pin, or wire net below — or{" "}
            <strong className="text-cyan-300">
              click any component/wire directly on the schematic canvas
            </strong>{" "}
            — to plot real-time High (1) / Low (0) transitions over time.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Switcher */}
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1">
            <button
              type="button"
              onClick={() => setViewMode("STACKED")}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono transition-colors cursor-pointer ${
                viewMode === "STACKED"
                  ? "bg-cyan-500/20 text-cyan-300 font-semibold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Stacked Channels
            </button>
            <button
              type="button"
              onClick={() => setViewMode("OVERLAY")}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono transition-colors cursor-pointer ${
                viewMode === "OVERLAY"
                  ? "bg-cyan-500/20 text-cyan-300 font-semibold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Crosshair className="w-3.5 h-3.5" />
              Multi-Signal Overlay
            </button>
          </div>

          <button
            type="button"
            onClick={onTriggerStepSweep}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 transition-colors cursor-pointer"
            title="Step through next input/clock state and plot real-time transition"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Step &amp; Sample Signal
          </button>

          <button
            type="button"
            onClick={() => setLiveStreamActive((v) => !v)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
              liveStreamActive
                ? "bg-emerald-500/20 border-emerald-400 text-emerald-300"
                : "bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200"
            }`}
          >
            {liveStreamActive ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                Live Sweep: ON
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 text-emerald-400" />
                Auto-Sweep Stream
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onClearHistory}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-mono text-slate-400 hover:text-white bg-slate-900 border border-slate-800 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Buffer
          </button>
        </div>
      </div>

      {/* Simulation Halted Notification Banner */}
      {isHalted && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-amber-950/40 border border-amber-500/50 text-amber-300 text-xs font-mono">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
          <div className="space-y-0.5">
            <span className="font-bold text-amber-200 uppercase tracking-wider">
              Oscilloscope Stream Paused:
            </span>
            <span className="ml-1.5 text-slate-300">
              {haltReason ||
                "Circuit contains compulsory 2-input gate(s) with unconnected floating pins. Logic evaluation is paused."}
            </span>
          </div>
        </div>
      )}

      {/* Signal Path Probe Selector Bar */}
      <div className="space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-mono text-slate-400">
              FILTER SIGNAL PATHS:
            </span>
            {(
              [
                { id: "IO_GATES", label: "Inputs, Gates & Outputs" },
                { id: "WIRES", label: `Schematic Wire Nets (${wires.length})` },
                { id: "ALL", label: `All Paths (${allPaths.length})` },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setCategoryFilter(f.id)}
                className={`px-2.5 py-1 rounded text-xs font-mono transition-colors cursor-pointer ${
                  categoryFilter === f.id
                    ? "bg-slate-800 text-cyan-300 border border-cyan-500/40 font-semibold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 text-xs font-mono">
            <button
              type="button"
              onClick={() =>
                setSelectedPathIds(visibleFilterPaths.slice(0, 10).map((p) => p.id))
              }
              className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300 cursor-pointer"
            >
              <CheckSquare className="w-3.5 h-3.5" />
              Select Visible
            </button>
            <span className="text-slate-600">·</span>
            <button
              type="button"
              onClick={() => setSelectedPathIds([])}
              className="text-slate-400 hover:text-slate-200 cursor-pointer"
            >
              Deselect All
            </button>
          </div>
        </div>

        {/* Selectable Signal Path Buttons */}
        <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-2.5 bg-[#070A12] border border-slate-800 rounded-xl">
          {visibleFilterPaths.map((p) => {
            const isSelected = selectedPathIds.includes(p.id);
            const st = pathStats[p.id];
            const isCanvasFocused =
              (selectedCanvasItem?.type === "wire" &&
                p.wireId === selectedCanvasItem.id) ||
              (selectedCanvasItem?.type === "node" &&
                p.nodeId === selectedCanvasItem.id &&
                p.category !== "wire");

            return (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  togglePath(p.id);
                  if (onSelectCanvasItem) {
                    if (p.wireId) {
                      onSelectCanvasItem({ type: "wire", id: p.wireId });
                    } else if (p.nodeId) {
                      onSelectCanvasItem({ type: "node", id: p.nodeId });
                    }
                  }
                }}
                className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-mono border transition-all cursor-pointer ${
                  isSelected
                    ? "bg-slate-900 text-white border-slate-600 shadow-sm"
                    : "bg-slate-950/60 text-slate-500 border-slate-800/80 hover:text-slate-300 hover:border-slate-700"
                } ${isCanvasFocused ? "ring-2 ring-cyan-400" : ""}`}
                title={`${p.label} — ${p.booleanExpr || ""}`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-sm shrink-0"
                  style={{
                    backgroundColor: isSelected ? p.color : "#334155",
                  }}
                />
                <span className="truncate max-w-[200px]">{p.label}</span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold tabular-nums ${
                    st?.current === 1
                      ? "bg-emerald-500/20 text-emerald-300"
                      : "bg-slate-800 text-slate-400"
                  }`}
                >
                  {st?.current === 1 ? "H(1)" : "L(0)"}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Recharts Waveform Plotting Area */}
      {activePaths.length === 0 ? (
        <div className="bg-[#070A12] border border-slate-800 rounded-xl py-10 text-center text-xs font-mono text-slate-400">
          Select one or more signal paths above (or click any gate/wire on the
          schematic canvas) to plot real-time High/Low waveforms.
        </div>
      ) : viewMode === "STACKED" ? (
        /* STACKED SYNCHRONIZED RECHARTS CHANNELS */
        <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
          {activePaths.map((p) => {
            const st = pathStats[p.id];
            return (
              <div
                key={p.id}
                className="bg-[#070A12] border border-slate-800/90 rounded-xl p-3 grid grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)] gap-3 items-center"
              >
                {/* Left Channel Telemetry Header */}
                <div className="space-y-1 font-mono text-xs border-b lg:border-b-0 lg:border-r border-slate-800/80 pb-2 lg:pb-0 lg:pr-3">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className="font-bold truncate"
                      style={{ color: p.color }}
                      title={p.label}
                    >
                      {p.label}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-bold tabular-nums shrink-0 ${
                        st?.current === 1
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                          : "bg-slate-900 text-slate-400 border border-slate-800"
                      }`}
                    >
                      {st?.current === 1 ? "HIGH (1)" : "LOW (0)"}
                    </span>
                  </div>
                  {p.booleanExpr && (
                    <div
                      className="text-[11px] text-slate-400 truncate"
                      title={p.booleanExpr}
                    >
                      {p.booleanExpr}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-[10px] text-slate-500 pt-0.5 tabular-nums">
                    <span>Duty: {st?.highPct ?? 0}%</span>
                    <span>·</span>
                    <span className="text-emerald-400">↑{st?.rising ?? 0}</span>
                    <span>·</span>
                    <span className="text-amber-400">↓{st?.falling ?? 0}</span>
                  </div>
                </div>

                {/* Right Recharts Step-After Digital Waveform */}
                <div className="h-24 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={chartData}
                      syncId="circuitLabWaveforms"
                      margin={{ top: 8, right: 16, left: -18, bottom: 2 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#1e293b"
                        vertical={true}
                      />
                      <XAxis
                        dataKey="timeLabel"
                        stroke="#64748b"
                        tick={{ fontSize: 10, fontFamily: "JetBrains Mono" }}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        domain={[-0.15, 1.15]}
                        ticks={[0, 1]}
                        tickFormatter={(v) => (v === 1 ? "H(1)" : "L(0)")}
                        stroke="#64748b"
                        tick={{ fontSize: 10, fontFamily: "JetBrains Mono" }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0f172a",
                          borderColor: "#334155",
                          borderRadius: "8px",
                          fontSize: "11px",
                          fontFamily: "JetBrains Mono, monospace",
                        }}
                        formatter={(value: unknown) => [
                          Number(value) === 1
                            ? "HIGH (Logic 1 · 5.0V)"
                            : Number(value) === -1
                            ? "HALTED (Floating / Undetermined)"
                            : "LOW (Logic 0 · 0.0V)",
                          p.shortLabel,
                        ]}
                      />
                      <ReferenceLine
                        y={0.5}
                        stroke="#334155"
                        strokeDasharray="2 2"
                      />
                      <Area
                        type="stepAfter"
                        dataKey={p.id}
                        name={p.shortLabel}
                        stroke={p.color}
                        strokeWidth={2.4}
                        fill={p.color}
                        fillOpacity={0.18}
                        isAnimationActive={false}
                        dot={{ r: 2.5, fill: p.color }}
                        activeDot={{ r: 4.5, fill: "#ffffff", stroke: p.color }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* COMBINED MULTI-SIGNAL OVERLAY RECHARTS VIEW */
        <div className="bg-[#070A12] border border-slate-800 rounded-xl p-4">
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 12, right: 20, left: -10, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="timeLabel"
                  stroke="#94a3b8"
                  tick={{ fontSize: 11, fontFamily: "JetBrains Mono" }}
                />
                <YAxis
                  domain={[-0.15, 1.15]}
                  ticks={[0, 1]}
                  tickFormatter={(v) => (v === 1 ? "HIGH (1)" : "LOW (0)")}
                  stroke="#94a3b8"
                  tick={{ fontSize: 11, fontFamily: "JetBrains Mono" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    borderColor: "#334155",
                    borderRadius: "8px",
                    fontSize: "11px",
                    fontFamily: "JetBrains Mono, monospace",
                  }}
                  formatter={(value: unknown, name: unknown) => [
                    Number(value) === 1
                      ? "HIGH (1)"
                      : Number(value) === -1
                      ? "HALTED (Z)"
                      : "LOW (0)",
                    String(name ?? ""),
                  ]}
                />
                <Legend
                  wrapperStyle={{
                    fontSize: "11px",
                    fontFamily: "JetBrains Mono, monospace",
                  }}
                />
                <ReferenceLine y={0.5} stroke="#334155" strokeDasharray="2 2" />
                {activePaths.map((p) => (
                  <Line
                    key={p.id}
                    type="stepAfter"
                    dataKey={p.id}
                    name={p.label}
                    stroke={p.color}
                    strokeWidth={2.5}
                    isAnimationActive={false}
                    dot={{ r: 3, fill: p.color }}
                    activeDot={{ r: 5 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
