import React, { useState } from "react";
import {
  Layers,
  X,
  Ungroup,
  PlusCircle,
  Cpu,
  ArrowRight,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import {
  SubCircuitDefinition,
  evaluateSubCircuitInternal,
} from "../utils/subCircuitManager";
import { GATE_SPECS, COMP_SPECS } from "../data/logicSpecs";

interface GroupCreationModalProps {
  isOpen: boolean;
  selectedCount: number;
  selectedGateTypes: string[];
  defaultName: string;
  onClose: () => void;
  onConfirmGroup: (name: string, title: string, color: string) => void;
}

const BLOCK_COLORS = [
  { label: "Violet IC", hex: "#8b5cf6" },
  { label: "Cyan Module", hex: "#06b6d4" },
  { label: "Emerald Core", hex: "#10b981" },
  { label: "Pink Logic", hex: "#ec4899" },
  { label: "Amber Slice", hex: "#f59e0b" },
];

export function GroupSubCircuitModal({
  isOpen,
  selectedCount,
  selectedGateTypes,
  defaultName,
  onClose,
  onConfirmGroup,
}: GroupCreationModalProps) {
  const [name, setName] = useState(defaultName);
  const [title, setTitle] = useState(`${defaultName} Hierarchical Module`);
  const [color, setColor] = useState("#8b5cf6");

  React.useEffect(() => {
    if (isOpen) {
      setName(defaultName);
      setTitle(`${defaultName} Hierarchical Sub-Circuit`);
    }
  }, [isOpen, defaultName]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-[#0f172a] border border-violet-500/40 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-violet-950/70 via-slate-900 to-slate-900 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-violet-400" />
            <h3 className="text-sm font-bold text-white font-mono">
              Create Hierarchical Sub-Circuit Block
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onConfirmGroup(name || defaultName, title, color);
          }}
          className="p-5 space-y-4"
        >
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-mono">
                Selected Components to Encapsulate:
              </span>
              <span className="font-mono font-bold text-violet-300 bg-violet-500/15 border border-violet-500/30 px-2 py-0.5 rounded">
                {selectedCount} Nodes
              </span>
            </div>
            <div className="text-[11px] font-mono text-slate-300 truncate">
              Contents: {selectedGateTypes.join(" + ")}
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Boundary nets entering and leaving your selection will be
              automatically mapped to labeled Input/Output pins on the new
              hierarchical IC block, and saved to your palette for reuse.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-mono font-semibold text-slate-300">
              Block Chip Symbol Name (max 10 chars)
            </label>
            <input
              type="text"
              maxLength={10}
              value={name}
              onChange={(e) => setName(e.target.value.toUpperCase())}
              placeholder="e.g. HA_BLK, ALU_2B"
              className="w-full bg-slate-950 border border-slate-700 focus:border-violet-400 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-mono font-semibold text-slate-300">
              Module Description / Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. 1-Bit Full Adder Hierarchical Stage"
              className="w-full bg-slate-950 border border-slate-700 focus:border-violet-400 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-mono font-semibold text-slate-300">
              Hierarchical Package Accent Color
            </label>
            <div className="flex items-center gap-2">
              {BLOCK_COLORS.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => setColor(c.hex)}
                  className={`flex-1 py-1.5 px-2 rounded-lg border text-[10px] font-mono font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                    color === c.hex
                      ? "border-white bg-slate-800 text-white scale-[1.02]"
                      : "border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: c.hex }}
                  />
                  <span className="truncate">{c.label.split(" ")[0]}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-violet-600 hover:bg-violet-500 border border-violet-400/40 shadow-lg shadow-violet-600/20 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Create Hierarchical Block
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface SubCircuitInternalInspectorProps {
  definition: SubCircuitDefinition | null;
  liveInputValues: number[];
  instanceNodeId: number | null;
  onClose: () => void;
  onUngroupInstance?: (nodeId: number) => void;
  onInstantiateBlock: (typeId: string) => void;
}

export function SubCircuitInternalInspector({
  definition,
  liveInputValues,
  instanceNodeId,
  onClose,
  onUngroupInstance,
  onInstantiateBlock,
}: SubCircuitInternalInspectorProps) {
  if (!definition) return null;

  const { outputs, internalOuts } = evaluateSubCircuitInternal(
    definition,
    liveInputValues
  );

  // Compute bounding box of internal nodes to center them inside the inspector SVG
  const xs = definition.internalNodes.map((n) => n.relX);
  const ys = definition.internalNodes.map((n) => n.relY);
  const minX = Math.min(...xs, -80);
  const maxX = Math.max(...xs, 80);
  const minY = Math.min(...ys, -60);
  const maxY = Math.max(...ys, 60);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;

  const svgW = 580;
  const svgH = 270;
  const offsetX = svgW / 2 - cx - 25;
  const offsetY = svgH / 2 - cy - 15;

  const getIntNodePos = (idx: number) => {
    const n = definition.internalNodes[idx];
    if (!n) return { x: 0, y: 0 };
    return {
      x: n.relX + offsetX,
      y: n.relY + offsetY,
    };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-[#0b1120] border border-violet-500/50 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3.5 bg-gradient-to-r from-violet-950/80 via-slate-900 to-slate-900 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <span
              className="w-3 h-3 rounded-sm shrink-0"
              style={{ backgroundColor: definition.color }}
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold font-mono text-white">
                  {definition.name}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-violet-500/20 text-violet-300 border border-violet-500/40">
                  HIERARCHICAL SUB-CIRCUIT
                </span>
              </div>
              <p className="text-xs text-slate-400">{definition.title}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {instanceNodeId !== null && onUngroupInstance && (
              <button
                type="button"
                onClick={() => {
                  onUngroupInstance(instanceNodeId);
                  onClose();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 cursor-pointer"
                title="Expand this hierarchical block back into individual gates on the main canvas"
              >
                <Ungroup className="w-3.5 h-3.5" />
                Ungroup / Expand on Canvas
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                onInstantiateBlock(definition.typeId);
                onClose();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-violet-500/20 hover:bg-violet-500/30 text-violet-200 border border-violet-500/40 cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Add Copy to Canvas
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body: Live Pin States + Internal Architecture SVG */}
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Live Input Pins */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3">
              <div className="text-[11px] font-mono font-semibold text-cyan-400 mb-2 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5" />
                EXTERNAL INPUT PINS ({definition.inputMap.length})
              </div>
              <div className="flex flex-wrap gap-2">
                {definition.inputMap.map((inPin, idx) => {
                  const val = liveInputValues[idx] ? 1 : 0;
                  return (
                    <div
                      key={idx}
                      className={`px-2.5 py-1 rounded-lg border text-xs font-mono flex items-center gap-2 ${
                        val === 1
                          ? "bg-cyan-500/15 border-cyan-500/50 text-cyan-200 font-bold"
                          : "bg-slate-950 border-slate-800 text-slate-400"
                      }`}
                    >
                      <span>{inPin.name}:</span>
                      <span
                        className={
                          val === 1 ? "text-emerald-400" : "text-slate-500"
                        }
                      >
                        {val} ({val === 1 ? "5.0V" : "0.0V"})
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Live Output Pins */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3">
              <div className="text-[11px] font-mono font-semibold text-emerald-400 mb-2 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                COMPUTED BLOCK OUTPUTS ({definition.outputMap.length})
              </div>
              <div className="flex flex-wrap gap-2">
                {definition.outputMap.map((outPin, idx) => {
                  const val = outputs[idx] ? 1 : 0;
                  return (
                    <div
                      key={idx}
                      className={`px-2.5 py-1 rounded-lg border text-xs font-mono flex items-center gap-2 ${
                        val === 1
                          ? "bg-emerald-500/15 border-emerald-500/50 text-emerald-200 font-bold"
                          : "bg-slate-950 border-slate-800 text-slate-400"
                      }`}
                    >
                      <span>{outPin.name}:</span>
                      <span
                        className={
                          val === 1 ? "text-emerald-400" : "text-slate-500"
                        }
                      >
                        {val} ({val === 1 ? "HI" : "LO"})
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Internal Gate-Level Schematic Preview */}
          <div className="bg-[#070A12] border border-slate-800 rounded-xl overflow-hidden relative">
            <div className="px-3.5 py-2 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span>
                INTERNAL GATE-LEVEL SCHEMATIC ({definition.internalNodes.length}{" "}
                Components · {definition.internalWires.length} Internal Nets)
              </span>
              <span className="text-violet-300">
                Real-Time Hierarchical State Evaluation
              </span>
            </div>
            <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-64 block">
              <defs>
                <pattern
                  id="subckt-grid"
                  width="20"
                  height="20"
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d="M 20 0 L 0 0 0 20"
                    fill="none"
                    stroke="#131c31"
                    strokeWidth="1"
                  />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#subckt-grid)" />

              {/* Internal Wires */}
              {definition.internalWires.map((iw, idx) => {
                const fromPos = getIntNodePos(iw.fromIdx);
                const toPos = getIntNodePos(iw.toIdx);
                const fromNode = definition.internalNodes[iw.fromIdx];
                const outX = GATE_SPECS[fromNode.type]?.outX ?? 75;
                const x1 = fromPos.x + outX;
                const y1 = fromPos.y + 25;
                const x2 = toPos.x;
                const y2 = toPos.y + (iw.toPort === 0 ? 15 : 35);
                const live = (internalOuts[iw.fromIdx]?.[iw.fromPort] ?? 0) === 1;
                const d = `M ${x1},${y1} C ${x1 + 40},${y1} ${x2 - 40},${y2} ${x2},${y2}`;
                return (
                  <path
                    key={idx}
                    d={d}
                    fill="none"
                    stroke={live ? "#22c55e" : "#475569"}
                    strokeWidth={live ? 2.8 : 2}
                  />
                );
              })}

              {/* Internal Nodes */}
              {definition.internalNodes.map((inNode, idx) => {
                const pos = getIntNodePos(idx);
                const val = internalOuts[idx]?.[0] ?? 0;
                const spec = GATE_SPECS[inNode.type];
                const comp = COMP_SPECS[inNode.type];

                if (spec) {
                  return (
                    <g key={idx}>
                      <path
                        d={spec.path(pos.x, pos.y)}
                        fill={val ? "#0f291e" : "#0f172a"}
                        stroke={val ? "#22c55e" : "#64748b"}
                        strokeWidth={2}
                      />
                      {spec.extra && (
                        <path
                          d={spec.extra(pos.x, pos.y)}
                          fill="none"
                          stroke={val ? "#22c55e" : "#64748b"}
                          strokeWidth={2}
                        />
                      )}
                      {spec.bubble && (
                        <circle
                          cx={pos.x + spec.bubble.cx}
                          cy={pos.y + spec.bubble.cy}
                          r={spec.bubble.r}
                          fill="#0f172a"
                          stroke={val ? "#22c55e" : "#64748b"}
                          strokeWidth={2}
                        />
                      )}
                      <text
                        x={pos.x + spec.outX / 2}
                        y={pos.y + 28}
                        textAnchor="middle"
                        fill="#e2e8f0"
                        style={{
                          fontSize: "10px",
                          fontFamily: "var(--font-mono)",
                          fontWeight: 700,
                        }}
                      >
                        {inNode.type}
                      </text>
                      <text
                        x={pos.x + spec.outX + 12}
                        y={pos.y + 29}
                        fill={val ? "#4ade80" : "#94a3b8"}
                        style={{
                          fontSize: "10px",
                          fontFamily: "var(--font-mono)",
                          fontWeight: 700,
                        }}
                      >
                        {val}
                      </text>
                    </g>
                  );
                }

                return (
                  <g key={idx}>
                    <rect
                      x={pos.x}
                      y={pos.y}
                      width={comp?.w || 80}
                      height={comp?.h || 52}
                      rx={8}
                      fill="#1e1b4b"
                      stroke={definition.color}
                      strokeWidth={2}
                    />
                    <text
                      x={pos.x + (comp?.w || 80) / 2}
                      y={pos.y + (comp?.h || 52) / 2 + 4}
                      textAnchor="middle"
                      fill="#e2e8f0"
                      style={{
                        fontSize: "10px",
                        fontFamily: "var(--font-mono)",
                        fontWeight: 700,
                      }}
                    >
                      {comp?.label || inNode.type}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Pin Mapping Summary */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-slate-400 bg-slate-900/60 border border-slate-800/80 rounded-lg px-3.5 py-2">
            <span>{definition.description}</span>
            <span className="inline-flex items-center gap-1 text-violet-300">
              {definition.inputMap.map((i) => i.name).join(", ")}{" "}
              <ArrowRight className="w-3 h-3" />{" "}
              {definition.outputMap.map((o) => o.name).join(", ")}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
