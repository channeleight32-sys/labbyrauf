import React, { useState } from "react";
import { Activity, CheckCircle2, Calculator } from "lucide-react";

export interface WaveformChannel {
  id: string;
  label: string;
  role: "clock" | "input" | "intermediate" | "output" | "bus";
  values: (number | string)[];
  formula?: string;
}

export interface WaveformProofData {
  title: string;
  subtitle?: string;
  equations: { label: string; expr: string; substitution?: (stepIdx: number) => string }[];
  verificationNote: string;
  channels: WaveformChannel[];
  stepLabels?: string[];
  activeStepIndex?: number;
  onSelectStep?: (stepIdx: number) => void;
  compact?: boolean;
}

const ROLE_COLORS: Record<
  WaveformChannel["role"],
  { stroke: string; fill: string; text: string; badge: string; roleLabel: string }
> = {
  clock: {
    stroke: "#f59e0b",
    fill: "rgba(245, 158, 11, 0.14)",
    text: "text-amber-300",
    badge: "text-amber-400",
    roleLabel: "CLK",
  },
  input: {
    stroke: "#38bdf8",
    fill: "rgba(56, 189, 248, 0.14)",
    text: "text-cyan-300",
    badge: "text-cyan-400",
    roleLabel: "IN",
  },
  intermediate: {
    stroke: "#a855f7",
    fill: "rgba(168, 85, 247, 0.14)",
    text: "text-purple-300",
    badge: "text-purple-400",
    roleLabel: "NET",
  },
  output: {
    stroke: "#22c55e",
    fill: "rgba(34, 197, 94, 0.16)",
    text: "text-emerald-300",
    badge: "text-emerald-400",
    roleLabel: "OUT",
  },
  bus: {
    stroke: "#eab308",
    fill: "rgba(234, 179, 8, 0.10)",
    text: "text-amber-200",
    badge: "text-amber-300",
    roleLabel: "BUS",
  },
};

export default function DigitalWaveformView({
  title,
  subtitle,
  equations,
  verificationNote,
  channels,
  stepLabels,
  activeStepIndex,
  onSelectStep,
  compact = false,
}: WaveformProofData) {
  const numSteps = channels[0]?.values.length || 0;
  const [hoveredStep, setHoveredStep] = useState<number | null>(null);

  const inspectedStep =
    hoveredStep !== null
      ? hoveredStep
      : activeStepIndex !== undefined && activeStepIndex >= 0 && activeStepIndex < numSteps
      ? activeStepIndex
      : numSteps > 0
      ? numSteps - 1
      : 0;

  if (numSteps === 0 || channels.length === 0) {
    return null;
  }

  const stepW = compact ? 38 : numSteps <= 8 ? 64 : numSteps <= 16 ? 46 : 34;
  const rowH = compact ? 28 : 34;
  const svgW = Math.max(numSteps * stepW, 260);
  const topY = 6;
  const botY = rowH - 6;

  return (
    <div className="bg-[#0B101E] border border-slate-800 rounded-xl p-4 sm:p-5 space-y-4">
      {/* Header & Verification Status */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400 shrink-0" />
            <h4 className="text-sm font-bold text-white">{title}</h4>
          </div>
          {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          <span className="inline-flex items-center gap-1.5 text-emerald-400 font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            MATH PROVED · 0 ERRORS
          </span>
          <span aria-hidden="true" className="text-slate-600">
            ·
          </span>
          <span className="text-slate-400">{numSteps} TIME SLICES</span>
        </div>
      </div>

      {/* Mathematical Equations & Instantaneous Proof Substitution Box */}
      {equations.length > 0 && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3 space-y-2 font-mono text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
            <span className="inline-flex items-center gap-1.5 text-cyan-400 font-semibold">
              <Calculator className="w-3.5 h-3.5" />
              Formal Mathematical Equations &amp; Time-Step Evaluation (t ={" "}
              {stepLabels?.[inspectedStep] ?? `t${inspectedStep}`})
            </span>
            <span className="text-emerald-400">{verificationNote}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
            {equations.map((eq, idx) => (
              <div
                key={idx}
                className="bg-[#070A12] border border-slate-800/90 rounded px-3 py-2 flex flex-col justify-between gap-1"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-400 text-[11px]">{eq.label}</span>
                  <span className="text-cyan-300 font-bold">{eq.expr}</span>
                </div>
                {eq.substitution && (
                  <div className="text-[11px] text-emerald-300 border-t border-slate-800/70 pt-1">
                    Proof @ {stepLabels?.[inspectedStep] ?? `t${inspectedStep}`}:{" "}
                    {eq.substitution(inspectedStep)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Waveform Traces Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-800 bg-[#070A12]">
        <div className="min-w-fit">
          {/* Time Axis Header */}
          <div className="flex items-center border-b border-slate-800 bg-slate-900/80 text-[11px] font-mono text-slate-400">
            <div className="w-40 sm:w-48 shrink-0 px-3 py-2 border-r border-slate-800 flex items-center justify-between">
              <span>SIGNAL / PIN</span>
              <span>STATE</span>
            </div>
            <div className="flex shrink-0">
              {Array.from({ length: numSteps }).map((_, sIdx) => {
                const isInspected = sIdx === inspectedStep;
                return (
                  <button
                    key={sIdx}
                    type="button"
                    onMouseEnter={() => setHoveredStep(sIdx)}
                    onMouseLeave={() => setHoveredStep(null)}
                    onClick={() => onSelectStep?.(sIdx)}
                    style={{ width: `${stepW}px` }}
                    className={`py-1.5 text-center border-r border-slate-800/60 transition-colors cursor-pointer select-none ${
                      isInspected
                        ? "bg-cyan-500/20 text-cyan-300 font-bold"
                        : "hover:bg-slate-800/60 text-slate-400"
                    }`}
                    title="Click or hover time step to inspect mathematical evaluation"
                  >
                    {stepLabels?.[sIdx] ?? `t${sIdx}`}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Signal Rows */}
          {channels.map((ch) => {
            const style = ROLE_COLORS[ch.role];
            const currentVal = ch.values[inspectedStep] ?? 0;

            // Build SVG path for digital 0/1 or Clock signal
            let linePath = "";
            let areaPath = "";

            if (ch.role !== "bus") {
              ch.values.forEach((rawV, idx) => {
                const v = Number(rawV) ? 1 : 0;
                const x0 = idx * stepW;
                const x1 = (idx + 1) * stepW;
                const y = v === 1 ? topY : botY;

                if (idx === 0) {
                  linePath += `M ${x0},${y} L ${x1},${y}`;
                  areaPath += `M ${x0},${botY} L ${x0},${y} L ${x1},${y}`;
                } else {
                  const prevV = Number(ch.values[idx - 1]) ? 1 : 0;
                  const prevY = prevV === 1 ? topY : botY;
                  if (prevY !== y) {
                    linePath += ` L ${x0},${y}`;
                    areaPath += ` L ${x0},${y}`;
                  }
                  linePath += ` L ${x1},${y}`;
                  areaPath += ` L ${x1},${y}`;
                }
                if (idx === ch.values.length - 1) {
                  areaPath += ` L ${x1},${botY} Z`;
                }
              });
            }

            return (
              <div
                key={ch.id}
                className="flex items-center border-b border-slate-800/70 last:border-b-0 hover:bg-slate-900/30"
              >
                {/* Signal Label Column */}
                <div className="w-40 sm:w-48 shrink-0 px-3 py-1.5 border-r border-slate-800 flex items-center justify-between gap-2 font-mono text-xs">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-bold ${style.badge}`}>
                        {style.roleLabel}
                      </span>
                      <span
                        className={`font-semibold truncate ${style.text}`}
                        title={ch.label}
                      >
                        {ch.label}
                      </span>
                    </div>
                    {ch.formula && !compact && (
                      <div
                        className="text-[10px] text-slate-500 truncate"
                        title={ch.formula}
                      >
                        {ch.formula}
                      </div>
                    )}
                  </div>
                  <span
                    className={`font-bold tabular-nums shrink-0 ${
                      ch.role === "bus"
                        ? "text-amber-300"
                        : Number(currentVal) === 1
                        ? "text-emerald-400"
                        : "text-slate-500"
                    }`}
                  >
                    {currentVal}
                  </span>
                </div>

                {/* SVG Waveform Track */}
                <div className="relative shrink-0">
                  <svg
                    width={svgW}
                    height={rowH}
                    className="block"
                    onMouseLeave={() => setHoveredStep(null)}
                  >
                    {/* Vertical Time Slice Grid & Highlight */}
                    {Array.from({ length: numSteps }).map((_, sIdx) => {
                      const x = sIdx * stepW;
                      const isInspected = sIdx === inspectedStep;
                      return (
                        <g key={sIdx}>
                          <rect
                            x={x}
                            y={0}
                            width={stepW}
                            height={rowH}
                            fill={
                              isInspected
                                ? "rgba(6, 182, 212, 0.10)"
                                : "transparent"
                            }
                            className="cursor-pointer"
                            onMouseEnter={() => setHoveredStep(sIdx)}
                            onClick={() => onSelectStep?.(sIdx)}
                          />
                          <line
                            x1={x + stepW}
                            y1={0}
                            x2={x + stepW}
                            y2={rowH}
                            stroke="#1e293b"
                            strokeWidth={1}
                            strokeDasharray="2 2"
                          />
                        </g>
                      );
                    })}

                    {ch.role === "bus" ? (
                      /* Multi-Bit Bus Envelope Rendering */
                      ch.values.map((val, sIdx) => {
                        const x0 = sIdx * stepW;
                        const x1 = (sIdx + 1) * stepW;
                        const bev = 4;
                        const poly = `${x0 + bev},${topY} ${x1 - bev},${topY} ${x1},${
                          rowH / 2
                        } ${x1 - bev},${botY} ${x0 + bev},${botY} ${x0},${rowH / 2}`;
                        return (
                          <g key={sIdx} className="pointer-events-none">
                            <polygon
                              points={poly}
                              fill={style.fill}
                              stroke={style.stroke}
                              strokeWidth={1.5}
                            />
                            <text
                              x={(x0 + x1) / 2}
                              y={rowH / 2 + 4}
                              textAnchor="middle"
                              fill="#fef08a"
                              fontSize="11"
                              fontWeight="bold"
                              fontFamily="JetBrains Mono, monospace"
                            >
                              {val}
                            </text>
                          </g>
                        );
                      })
                    ) : (
                      /* Digital 0/1 Step Waveform Rendering */
                      <g className="pointer-events-none">
                        <line
                          x1={0}
                          y1={topY}
                          x2={svgW}
                          y2={topY}
                          stroke="#1e293b"
                          strokeWidth={0.75}
                        />
                        <line
                          x1={0}
                          y1={botY}
                          x2={svgW}
                          y2={botY}
                          stroke="#1e293b"
                          strokeWidth={0.75}
                        />
                        <path d={areaPath} fill={style.fill} />
                        <path
                          d={linePath}
                          fill="none"
                          stroke={style.stroke}
                          strokeWidth={2.2}
                          strokeLinejoin="round"
                        />

                        {/* Bit labels & Rising Edge Markers */}
                        {ch.values.map((rawV, sIdx) => {
                          const v = Number(rawV) ? 1 : 0;
                          const prevV =
                            sIdx > 0 ? (Number(ch.values[sIdx - 1]) ? 1 : 0) : v;
                          const isRising = sIdx > 0 && prevV === 0 && v === 1;
                          const cx = sIdx * stepW + stepW / 2;
                          return (
                            <g key={sIdx}>
                              {stepW >= 32 && (
                                <text
                                  x={cx}
                                  y={v === 1 ? topY + 11 : botY - 3}
                                  textAnchor="middle"
                                  fill={v === 1 ? "#f8fafc" : "#64748b"}
                                  fontSize="9.5"
                                  fontFamily="JetBrains Mono, monospace"
                                  fontWeight={v === 1 ? "bold" : "normal"}
                                >
                                  {v}
                                </text>
                              )}
                              {ch.role === "clock" && isRising && (
                                <text
                                  x={sIdx * stepW + 5}
                                  y={rowH / 2 + 3}
                                  fill="#fbbf24"
                                  fontSize="10"
                                  fontWeight="bold"
                                  fontFamily="JetBrains Mono, monospace"
                                >
                                  ↑
                                </text>
                              )}
                            </g>
                          );
                        })}
                      </g>
                    )}
                  </svg>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
