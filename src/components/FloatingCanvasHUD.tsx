import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Table,
  Activity,
  Layers,
  Minimize2,
  Maximize2,
  X,
  StepForward,
  Play,
  Pause,
  RotateCcw,
  AlertTriangle,
  Move,
  CornerDownRight,
  Sparkles,
  Clock,
  Zap,
  Cpu,
} from "lucide-react";
import { CircuitNode, CircuitWire, CompulsoryInputViolation } from "./CircuitLab";
import { GATE_SPECS, COMP_SPECS } from "../data/logicSpecs";

export interface FloatingCanvasHUDProps {
  nodes?: CircuitNode[];
  wires?: CircuitWire[];
  inputNodes: CircuitNode[];
  outputNodes: CircuitNode[];
  hasSeq: boolean;
  truthRowsData: { ins: number[]; outs: number[]; isActive: boolean }[];
  waveformHistory: { step: number; signals: Record<string, number> }[];
  signalKeys: string[];
  liveVals: Record<number, number[]>;
  isSimulationHalted: boolean;
  compulsoryViolations: CompulsoryInputViolation[];
  onApplyRowInputs?: (ins: number[]) => void;
  onStepClock?: () => void;
  onToggleAutoClock?: () => void;
  autoClock?: boolean;
  clockHz?: number;
  simSpeed?: number;
  onSetSimSpeed?: (speed: number) => void;
  onClose?: () => void;
}

export default function FloatingCanvasHUD({
  nodes = [],
  wires = [],
  inputNodes,
  outputNodes,
  hasSeq,
  truthRowsData,
  waveformHistory,
  signalKeys,
  liveVals,
  isSimulationHalted,
  compulsoryViolations,
  onApplyRowInputs,
  onStepClock,
  onToggleAutoClock,
  autoClock = false,
  clockHz = 2,
  simSpeed = 1,
  onSetSimSpeed,
  onClose,
}: FloatingCanvasHUDProps) {
  // Tabs: "SPLIT" (both), "TABLE" (truth table only), "TIMING" (output timing only)
  const [activeTab, setActiveTab] = useState<"SPLIT" | "TABLE" | "TIMING">("SPLIT");
  const [isMinimized, setIsMinimized] = useState(false);

  // Position relative to canvas container (default docked at top-right)
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hasCustomPos, setHasCustomPos] = useState(false);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; startX: number; startY: number }>({
    mouseX: 0,
    mouseY: 0,
    startX: 0,
    startY: 0,
  });

  // Handle dragging the floating HUD
  const handlePointerDown = (e: React.PointerEvent) => {
    // Only drag from header handle
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest("input")) return;
    e.stopPropagation();
    isDraggingRef.current = true;
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      startX: pos.x,
      startY: pos.y,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    e.stopPropagation();
    const dx = e.clientX - dragStartRef.current.mouseX;
    const dy = e.clientY - dragStartRef.current.mouseY;
    setPos({
      x: Math.max(-600, Math.min(60, dragStartRef.current.startX + dx)),
      y: Math.max(-10, Math.min(380, dragStartRef.current.startY + dy)),
    });
    setHasCustomPos(true);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  // Find outputs for live preview
  const outputSummary = useMemo(() => {
    if (outputNodes.length === 0) return "No Outputs";
    return outputNodes
      .map((outp) => {
        const val = liveVals[outp.id]?.[0] ?? 0;
        const label = outp.label || `O${outp.id}`;
        return `${label}=${val === -1 ? "Z" : val}`;
      })
      .join(" · ");
  }, [outputNodes, liveVals]);

  // Filter signals: prioritize outputs, then inputs for timing display
  const timingSignals = useMemo(() => {
    const outNames = new Set(
      outputNodes.map((outp, idx) => outp.label || `O${idx + 1}`)
    );
    const inNames = new Set(
      inputNodes.map((inp, idx) => inp.label || `I${idx + 1}`)
    );

    const outputs = signalKeys.filter((k) => outNames.has(k));
    const inputs = signalKeys.filter((k) => inNames.has(k));
    const others = signalKeys.filter((k) => !outNames.has(k) && !inNames.has(k));

    return [...outputs, ...inputs, ...others].slice(0, 5);
  }, [signalKeys, outputNodes, inputNodes]);

  // Compute total number of gates, current gate count, and estimated critical propagation delay
  // Compute total number of gates, current gate count, and estimated critical propagation delay
  const gateMetrics = useMemo(() => {
    // 1. Classify primitive gates and IC units
    const primitiveGates = nodes.filter((n) => GATE_SPECS[n.type]);
    const flipFlopNodes = nodes.filter((n) =>
      ["DFF", "TFF", "JKFF", "SRFF", "7473", "7474", "7476"].includes(n.type)
    );
    const digitalIcNodes = nodes.filter((n) =>
      [
        "7400", "7402", "7404", "7408", "7432", "7486",
        "7483", "7485", "74138", "74151", "74153", "74157",
        "74161", "74193", "74194", "7447", "MUX4", "DEMUX4"
      ].includes(n.type)
    );

    const isLogicOrActive = (type: string) => {
      if (GATE_SPECS[type]) return true;
      if (["DFF", "TFF", "JKFF", "SRFF", "7473", "7474", "7476"].includes(type)) return true;
      if (digitalIcNodes.some((d) => d.type === type)) return true;
      return false;
    };

    // Current discrete component count placed on schematic
    const placedLogicNodes = nodes.filter((n) => isLogicOrActive(n.type));
    const currentGateCount = placedLogicNodes.length;

    // Breakdown map
    const gateBreakdown: Record<string, number> = {};
    for (const n of placedLogicNodes) {
      gateBreakdown[n.type] = (gateBreakdown[n.type] || 0) + 1;
    }

    // Total gates: Equivalent 2-input gate complexity (standard NAND-equivalent unit count)
    let totalEquivalentGates = primitiveGates.length;
    for (const n of nodes) {
      switch (n.type) {
        case "7400":
        case "7402":
        case "7408":
        case "7432":
        case "7486":
          totalEquivalentGates += 4;
          break;
        case "7404":
          totalEquivalentGates += 6;
          break;
        case "DFF":
        case "TFF":
          totalEquivalentGates += 4;
          break;
        case "JKFF":
        case "SRFF":
          totalEquivalentGates += 6;
          break;
        case "7473":
        case "7474":
        case "7476":
          totalEquivalentGates += 8;
          break;
        case "MUX4":
        case "DEMUX4":
          totalEquivalentGates += 7;
          break;
        case "74138":
          totalEquivalentGates += 12;
          break;
        case "74151":
        case "74153":
        case "74157":
          totalEquivalentGates += 14;
          break;
        case "7483":
          totalEquivalentGates += 24;
          break;
        case "7485":
          totalEquivalentGates += 28;
          break;
        case "7447":
          totalEquivalentGates += 26;
          break;
        case "74161":
        case "74193":
        case "74194":
          totalEquivalentGates += 32;
          break;
        default:
          break;
      }
    }

    // 2. Estimated critical path propagation delay (t_pd) in nanoseconds
    const adj = new Map<number, number[]>();
    for (const w of wires) {
      const list = adj.get(w.from.node) || [];
      list.push(w.to.node);
      adj.set(w.from.node, list);
    }

    const getNodeDelay = (nodeId: number): number => {
      const targetNode = nodes.find((n) => n.id === nodeId);
      if (!targetNode) return 0;
      if (targetNode.delayNs !== undefined) return targetNode.delayNs;

      switch (targetNode.type) {
        case "NOT":
        case "7404":
          return 7.0;
        case "AND":
        case "NAND":
        case "7400":
        case "7408":
          return 8.0;
        case "OR":
        case "NOR":
        case "7402":
        case "7432":
          return 8.5;
        case "XOR":
        case "XNOR":
        case "7486":
          return 11.0;
        case "DFF":
        case "TFF":
        case "JKFF":
        case "SRFF":
        case "7473":
        case "7474":
        case "7476":
          return 14.0;
        case "MUX4":
        case "DEMUX4":
        case "74138":
        case "74151":
        case "74153":
        case "74157":
          return 16.0;
        case "7483":
        case "7485":
        case "7447":
          return 22.0;
        case "74161":
        case "74193":
        case "74194":
          return 24.0;
        case "INPUT":
        case "OUTPUT":
        case "CLOCK":
        case "VCC":
        case "GND":
        case "LED":
        case "HEX_DISPLAY":
        case "PROBE":
          return 0;
        default:
          return isLogicOrActive(targetNode.type) ? 10.0 : 0;
      }
    };

    const memoDelay = new Map<number, number>();
    const findMaxPathFrom = (currentId: number, visited: Set<number>): number => {
      if (visited.has(currentId)) return 0; // prevent loops
      if (memoDelay.has(currentId)) return memoDelay.get(currentId)!;
      visited.add(currentId);

      const thisDelay = getNodeDelay(currentId);
      const neighbors = adj.get(currentId) || [];
      let maxChild = 0;
      for (const nextId of neighbors) {
        maxChild = Math.max(maxChild, findMaxPathFrom(nextId, new Set(visited)));
      }

      const total = thisDelay + maxChild;
      memoDelay.set(currentId, total);
      return total;
    };

    let maxCriticalPathDelayNs = 0;
    for (const n of nodes) {
      if (n.type !== "OUTPUT" && n.type !== "LED" && n.type !== "HEX_DISPLAY" && n.type !== "PROBE") {
        maxCriticalPathDelayNs = Math.max(
          maxCriticalPathDelayNs,
          findMaxPathFrom(n.id, new Set())
        );
      }
    }

    if (maxCriticalPathDelayNs === 0 && currentGateCount > 0) {
      const maxSingleGate = Math.max(...placedLogicNodes.map((n) => getNodeDelay(n.id)));
      maxCriticalPathDelayNs = maxSingleGate > 0 ? maxSingleGate : 8.0;
    }

    return {
      totalGates: totalEquivalentGates,
      currentGateCount,
      primitiveCount: primitiveGates.length,
      flipFlopCount: flipFlopNodes.length,
      msiCount: digitalIcNodes.length,
      gateBreakdown,
      estimatedDelayNs: Math.round(maxCriticalPathDelayNs * 10) / 10,
    };
  }, [nodes, wires]);

  // If minimized, display a sleek compact floating capsule pill
  if (isMinimized) {
    return (
      <div
        className="absolute top-3 right-3.5 z-20 flex items-center gap-2 bg-[#0B0F19]/95 backdrop-blur-md border border-cyan-500/40 rounded-full px-3 py-1.5 shadow-xl shadow-black/60 select-none cursor-pointer transition-all hover:border-cyan-400 group"
        onClick={() => setIsMinimized(false)}
        title="Click to expand on-canvas Truth Table & Output Timing HUD"
        style={hasCustomPos ? { transform: `translate(${pos.x}px, ${pos.y}px)` } : undefined}
      >
        <div className="flex items-center gap-1.5 font-mono text-xs text-cyan-300 font-semibold">
          <Cpu className="w-3.5 h-3.5 text-cyan-400" />
          <span>{gateMetrics.currentGateCount} Gates</span>
          <span className="text-slate-600">·</span>
          <span className="text-purple-300">{gateMetrics.totalGates} Eq.</span>
          <span className="text-slate-600">·</span>
          <Clock className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-amber-300">{gateMetrics.estimatedDelayNs}ns</span>
        </div>

        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />

        <div className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
          {outputSummary}
        </div>

        {isSimulationHalted && (
          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
            ⚠️ HALTED
          </span>
        )}

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsMinimized(false);
          }}
          className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
        >
          <Maximize2 className="w-3 h-3" />
        </button>
      </div>
    );
  }

  return (
    <div
      className="absolute top-3 right-3.5 z-20 w-[380px] sm:w-[420px] max-w-[calc(100%-24px)] bg-[#0B0F19]/95 backdrop-blur-md border border-slate-700/80 rounded-xl shadow-2xl shadow-black/80 flex flex-col overflow-hidden text-xs transition-shadow"
      style={hasCustomPos ? { transform: `translate(${pos.x}px, ${pos.y}px)` } : undefined}
    >
      {/* Draggable Header Bar */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="flex items-center justify-between px-3.5 py-2.5 bg-slate-900/90 border-b border-slate-800 cursor-move select-none"
      >
        <div className="flex items-center gap-2">
          <Move className="w-3.5 h-3.5 text-slate-500" />
          <span className="font-mono font-bold tracking-wider text-slate-200 uppercase text-[11px] flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Circuit Live HUD
          </span>
          {isSimulationHalted && (
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/50">
              ⚠️ HALTED
            </span>
          )}
        </div>

        {/* Tab Selector & Window Controls */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center bg-slate-950/80 border border-slate-800 rounded-md p-0.5">
            <button
              type="button"
              onClick={() => setActiveTab("SPLIT")}
              className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors cursor-pointer ${
                activeTab === "SPLIT"
                  ? "bg-cyan-500/20 text-cyan-300 font-semibold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title="View both Truth Table and Output Timing"
            >
              Both
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("TABLE")}
              className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors cursor-pointer ${
                activeTab === "TABLE"
                  ? "bg-cyan-500/20 text-cyan-300 font-semibold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title="View Truth Table"
            >
              Table
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("TIMING")}
              className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors cursor-pointer ${
                activeTab === "TIMING"
                  ? "bg-cyan-500/20 text-cyan-300 font-semibold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title="View Output Timing Waveforms"
            >
              Timing
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsMinimized(true)}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Minimize to floating capsule"
          >
            <Minimize2 className="w-3.5 h-3.5" />
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close floating HUD"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Floating Body Content */}
      <div className="p-3 space-y-3 max-h-[380px] overflow-y-auto">
        {/* Halted Alert in HUD */}
        {isSimulationHalted && (
          <div className="p-2 rounded-lg bg-amber-950/60 border border-amber-500/50 text-amber-300 text-[11px] font-mono flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 animate-pulse" />
            <span className="truncate">
              {compulsoryViolations[0]?.gateType} missing Pin{" "}
              {compulsoryViolations[0]?.missingPorts.map((p) => (p === 0 ? "A" : "B")).join(" & ")}.
              Output is floating Z.
            </span>
          </div>
        )}

        {/* Circuit Gate Metrics & Propagation Delay Telemetry Panel */}
        <div className="bg-slate-950/70 border border-slate-800/90 rounded-lg p-2.5 space-y-2 shadow-inner">
          <div className="flex items-center justify-between font-mono text-[11px]">
            <span className="flex items-center gap-1.5 text-slate-300 font-semibold uppercase tracking-wider text-[10px]">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              Gate Metrics & Timing
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] text-amber-300/90 font-mono bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded">
              <Clock className="w-3 h-3 text-amber-400" />
              <span>t_pd: <strong>{gateMetrics.estimatedDelayNs}ns</strong></span>
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 font-mono text-center">
            {/* Total Gates (NAND-equivalent complexity) */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-md p-1.5 flex flex-col items-center justify-center">
              <span className="text-[10px] text-slate-400 uppercase tracking-tight">Total Gates</span>
              <span className="text-base font-bold text-purple-400 my-0.5">{gateMetrics.totalGates}</span>
              <span className="text-[9px] text-slate-400">Equivalent</span>
            </div>

            {/* Current Gate Count (discrete placed gates/ICs) */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-md p-1.5 flex flex-col items-center justify-center">
              <span className="text-[10px] text-slate-400 uppercase tracking-tight">Gate Count</span>
              <span className="text-base font-bold text-cyan-400 my-0.5">{gateMetrics.currentGateCount}</span>
              <span className="text-[9px] text-slate-400">Active Units</span>
            </div>

            {/* Estimated Propagation Delay */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-md p-1.5 flex flex-col items-center justify-center">
              <span className="text-[10px] text-slate-400 uppercase tracking-tight">Est. Delay</span>
              <span className="text-base font-bold text-amber-400 my-0.5">
                {gateMetrics.estimatedDelayNs}
                <span className="text-[10px] font-normal text-amber-300/70 ml-0.5">ns</span>
              </span>
              <span className="text-[9px] text-slate-400">Critical Path</span>
            </div>
          </div>

          {/* Active Gate Breakdown Pills */}
          {Object.keys(gateMetrics.gateBreakdown).length > 0 ? (
            <div className="flex flex-wrap gap-1 pt-1.5 border-t border-slate-900">
              {Object.entries(gateMetrics.gateBreakdown).map(([type, count]) => (
                <span
                  key={type}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-900/90 text-slate-300 border border-slate-800/80"
                >
                  <span className="text-cyan-300 font-semibold">{type}</span>
                  <span className="text-slate-400">×</span>
                  <span className="text-slate-200 font-bold">{count}</span>
                </span>
              ))}
            </div>
          ) : (
            <div className="text-[10px] font-mono text-slate-400 text-center py-1">
              Add gates or ICs to measure delay & gate count
            </div>
          )}
        </div>

        {/* 1. Circuit Truth Table Section */}
        {(activeTab === "TABLE" || activeTab === "SPLIT") && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between font-mono text-[11px]">
              <div className="flex items-center gap-1.5 text-cyan-400 font-semibold">
                <Table className="w-3.5 h-3.5" />
                <span>Live Truth Table</span>
                <span className="text-[10px] text-slate-400 font-normal">
                  ({truthRowsData.length} rows)
                </span>
              </div>
              <span className="text-[10px] text-slate-400">
                Click row to inject state
              </span>
            </div>

            {truthRowsData.length === 0 ? (
              <p className="text-[11px] text-slate-400 text-center py-3 bg-slate-900/50 rounded-lg border border-slate-800/80">
                {inputNodes.length === 0
                  ? "Add an INPUT node to auto-generate table."
                  : outputNodes.length === 0
                  ? "Add an OUTPUT node to show outputs."
                  : "Truth table calculating..."}
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-950/60 max-h-[160px] overflow-y-auto">
                <table className="w-full text-[11px] font-mono border-collapse">
                  <thead className="sticky top-0 bg-slate-900 text-slate-300 border-b border-slate-800 z-10">
                    <tr>
                      <th className="py-1 px-1.5 text-center text-[10px] text-slate-500 w-6">
                        #
                      </th>
                      {inputNodes.map((inp, idx) => (
                        <th
                          key={inp.id}
                          className="py-1 px-1.5 text-center text-cyan-300 font-semibold"
                        >
                          {inp.label || `I${idx + 1}`}
                        </th>
                      ))}
                      {outputNodes.map((outp, idx) => (
                        <th
                          key={outp.id}
                          className="py-1 px-1.5 text-center text-emerald-400 font-semibold border-l border-slate-800"
                        >
                          {outp.label || `O${idx + 1}`}
                        </th>
                      ))}
                      <th className="py-1 px-1.5 text-center text-[10px] text-slate-500 w-14">
                        State
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {truthRowsData.map((row, rIdx) => {
                      return (
                        <tr
                          key={rIdx}
                          onClick={() => onApplyRowInputs && onApplyRowInputs(row.ins)}
                          className={`border-b border-slate-800/50 cursor-pointer transition-colors ${
                            row.isActive
                              ? "bg-cyan-500/20 text-white font-bold ring-1 ring-inset ring-cyan-500/50"
                              : "text-slate-400 hover:bg-slate-900/60 hover:text-slate-200"
                          }`}
                          title={`Click to set inputs to: ${row.ins.join(", ")}`}
                        >
                          <td className="py-1 px-1.5 text-center text-[10px] text-slate-500 font-normal">
                            {rIdx}
                          </td>
                          {row.ins.map((v, cIdx) => (
                            <td
                              key={`in-${cIdx}`}
                              className={`py-1 px-1.5 text-center ${
                                v === 1 ? "text-cyan-300 font-semibold" : "text-slate-500"
                              }`}
                            >
                              {v}
                            </td>
                          ))}
                          {row.outs.map((v, cIdx) => (
                            <td
                              key={`out-${cIdx}`}
                              className={`py-1 px-1.5 text-center border-l border-slate-800/60 font-semibold ${
                                v === 1
                                  ? "text-emerald-400"
                                  : v === -1
                                  ? "text-amber-400"
                                  : "text-slate-500"
                              }`}
                            >
                              {v === -1 ? "Z" : v}
                            </td>
                          ))}
                          <td className="py-1 px-1.5 text-center text-[10px]">
                            {row.isActive ? (
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-400 px-1 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                                ACTIVE
                              </span>
                            ) : (
                              <span className="text-slate-600">--</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 2. Circuit Output Timing Waveforms Section */}
        {(activeTab === "TIMING" || activeTab === "SPLIT") && (
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between font-mono text-[11px]">
              <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <Activity className="w-3.5 h-3.5" />
                <span>Live Output Timing</span>
              </div>

              {/* Step & Clock Controls in HUD */}
              <div className="flex items-center gap-1">
                {onStepClock && (
                  <button
                    type="button"
                    onClick={onStepClock}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
                    title="Pulse clock or step state"
                  >
                    <StepForward className="w-3 h-3 text-cyan-400" />
                    Step
                  </button>
                )}

                {onToggleAutoClock && (
                  <button
                    type="button"
                    onClick={onToggleAutoClock}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border transition-colors cursor-pointer ${
                      autoClock
                        ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300"
                        : "bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-400"
                    }`}
                    title={autoClock ? "Pause Auto Clock" : "Run Auto Clock"}
                  >
                    {autoClock ? (
                      <Pause className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Play className="w-3 h-3 text-cyan-400" />
                    )}
                    {autoClock ? `${clockHz}Hz` : "Auto"}
                  </button>
                )}

                {/* Simulation Speed Dropdown / Multiplier */}
                {onSetSimSpeed && (
                  <div className="flex items-center gap-0.5 bg-slate-900 border border-slate-700/80 rounded px-1 py-0.5 text-[9px] font-mono">
                    <span className="text-slate-400 hidden sm:inline">Speed:</span>
                    {[0.1, 0.5, 1, 2, 5].map((spd) => (
                      <button
                        key={spd}
                        type="button"
                        onClick={() => onSetSimSpeed(spd)}
                        className={`px-1 py-0.5 rounded font-bold transition-all cursor-pointer ${
                          simSpeed === spd
                            ? spd < 1
                              ? "bg-amber-400 text-slate-950"
                              : spd === 1
                              ? "bg-cyan-400 text-slate-950"
                              : "bg-emerald-400 text-slate-950"
                            : "text-slate-400 hover:text-white"
                        }`}
                        title={`Set simulation speed to ${spd}x`}
                      >
                        {spd}x
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Timing Diagram Channels */}
            {timingSignals.length === 0 || waveformHistory.length === 0 ? (
              <p className="text-[11px] text-slate-400 text-center py-3 bg-slate-900/50 rounded-lg border border-slate-800/80">
                Click switch or step clock to trace output transitions.
              </p>
            ) : (
              <div className="space-y-1 bg-slate-950/60 p-2 rounded-lg border border-slate-800 max-h-[160px] overflow-y-auto">
                {timingSignals.map((sigName) => {
                  const isOutputSig = outputNodes.some(
                    (outp, idx) => (outp.label || `O${idx + 1}`) === sigName
                  );
                  const isInputSig = inputNodes.some(
                    (inp, idx) => (inp.label || `I${idx + 1}`) === sigName
                  );

                  const strokeColor = isOutputSig
                    ? "#22c55e"
                    : isInputSig
                    ? "#38bdf8"
                    : "#a855f7";

                  const stepW = 16;
                  const h = 22;
                  let pathD = "";

                  waveformHistory.forEach((pt, idx) => {
                    const v = pt.signals[sigName] ?? 0;
                    const x0 = idx * stepW;
                    const x1 = (idx + 1) * stepW;
                    // v === 1 is High (top), v === 0 is Low (bottom), v === -1 is mid
                    const y = v === 1 ? 4 : v === -1 ? h / 2 : h - 4;

                    if (idx === 0) {
                      pathD += `M ${x0},${y} L ${x1},${y}`;
                    } else {
                      const prevV = waveformHistory[idx - 1].signals[sigName] ?? 0;
                      const prevY = prevV === 1 ? 4 : prevV === -1 ? h / 2 : h - 4;
                      if (prevY !== y) {
                        pathD += ` L ${x0},${y}`;
                      }
                      pathD += ` L ${x1},${y}`;
                    }
                  });

                  const latestVal =
                    waveformHistory[waveformHistory.length - 1].signals[sigName] ?? 0;
                  const traceSvgW = Math.max(waveformHistory.length * stepW, 180);

                  return (
                    <div
                      key={sigName}
                      className="flex items-center gap-2 bg-slate-900/70 border border-slate-800/80 rounded px-2 py-1"
                    >
                      <div className="w-16 shrink-0 flex items-center justify-between font-mono text-[10px]">
                        <span
                          className={`font-semibold truncate ${
                            isOutputSig
                              ? "text-emerald-300"
                              : isInputSig
                              ? "text-cyan-300"
                              : "text-purple-300"
                          }`}
                        >
                          {sigName}
                        </span>
                        <span
                          className={`font-bold ${
                            latestVal === 1
                              ? "text-emerald-400"
                              : latestVal === -1
                              ? "text-amber-400"
                              : "text-slate-500"
                          }`}
                        >
                          {latestVal === -1 ? "Z" : latestVal}
                        </span>
                      </div>

                      {/* Mini Digital Step Waveform */}
                      <div className="overflow-x-auto flex-1">
                        <svg
                          width={traceSvgW}
                          height={h}
                          className="block"
                        >
                          {/* High logic rail */}
                          <line
                            x1={0}
                            y1={4}
                            x2={traceSvgW}
                            y2={4}
                            stroke="#1e293b"
                            strokeDasharray="2 2"
                          />
                          {/* Low logic rail */}
                          <line
                            x1={0}
                            y1={h - 4}
                            x2={traceSvgW}
                            y2={h - 4}
                            stroke="#1e293b"
                            strokeDasharray="2 2"
                          />
                          <path
                            d={pathD}
                            fill="none"
                            stroke={strokeColor}
                            strokeWidth={2}
                          />
                        </svg>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Quick Summary */}
      <div className="px-3 py-1.5 bg-slate-950/90 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-400">
        <span>Live Outputs: <strong className="text-emerald-400">{outputSummary}</strong></span>
        <span className="text-slate-500 flex items-center gap-1">
          <CornerDownRight className="w-2.5 h-2.5 text-cyan-400" />
          Click row to inject state
        </span>
      </div>
    </div>
  );
}
