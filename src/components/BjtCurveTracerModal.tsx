import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  X,
  Cpu,
  Activity,
  Sliders,
  TrendingUp,
  Download,
  Copy,
  Check,
  Sparkles,
  HelpCircle,
  Plus,
  Crosshair,
  Zap,
  Layers,
  ArrowRight,
  Maximize2,
  Minimize2,
} from "lucide-react";

export interface BjtComponentItem {
  id: number;
  label: string;
  type: string; // "BJT" | "BC547" | "BC557" | etc.
  modelName: string;
  beta: number;
  vbe_on: number;
  vce_sat: number;
  va: number; // Early voltage (V)
  isPnp?: boolean;
  // Live simulated circuit telemetry (if available)
  liveVce?: number;
  liveIc_mA?: number;
  liveIb_uA?: number;
  liveVbe?: number;
  operatingRegion?: "ACTIVE" | "SATURATION" | "CUTOFF" | "OPEN / FLOATING";
}

interface BjtCurveTracerModalProps {
  isOpen: boolean;
  onClose: () => void;
  bjtList: BjtComponentItem[];
  onSelectNodeInCanvas?: (nodeId: number) => void;
  onAddBjtToCanvas?: (model: string) => void;
  vccSupply?: number;
  rcCollectorResistor?: number;
}

const PRESET_BJT_MODELS = [
  {
    modelName: "2N2222A",
    type: "NPN",
    beta: 150,
    vbe_on: 0.7,
    vce_sat: 0.2,
    va: 100,
    bv_ceo: 40,
    desc: "Universal fast switching & RF NPN transistor",
  },
  {
    modelName: "BC547B",
    type: "NPN",
    beta: 250,
    vbe_on: 0.68,
    vce_sat: 0.18,
    va: 120,
    bv_ceo: 45,
    desc: "Low-noise audio & general amplification NPN",
  },
  {
    modelName: "2N3904",
    type: "NPN",
    beta: 200,
    vbe_on: 0.7,
    vce_sat: 0.2,
    va: 74,
    bv_ceo: 40,
    desc: "Classic general purpose small-signal amplifier",
  },
  {
    modelName: "BD139",
    type: "NPN",
    beta: 100,
    vbe_on: 0.72,
    vce_sat: 0.35,
    va: 80,
    bv_ceo: 80,
    desc: "Medium power driver & audio output stage",
  },
  {
    modelName: "BC557B",
    type: "PNP",
    beta: 220,
    vbe_on: 0.68,
    vce_sat: 0.18,
    va: 90,
    bv_ceo: 45,
    desc: "Complementary PNP small-signal transistor",
  },
];

export default function BjtCurveTracerModal({
  isOpen,
  onClose,
  bjtList,
  onSelectNodeInCanvas,
  onAddBjtToCanvas,
  vccSupply = 12,
  rcCollectorResistor = 1000,
}: BjtCurveTracerModalProps) {
  // Currently selected BJT from the circuit or fallback model
  const [selectedBjtId, setSelectedBjtId] = useState<number>(
    bjtList.length > 0 ? bjtList[0].id : -1
  );

  // Fallback standalone model if canvas has no BJT
  const [activePresetIdx, setActivePresetIdx] = useState<number>(0);

  // Tracer sweep parameters
  const [maxVce, setMaxVce] = useState<number>(12); // Max Vce sweep in Volts
  const [ibStep_uA, setIbStep_uA] = useState<number>(10); // Base current step in uA
  const [numCurves, setNumCurves] = useState<number>(6); // Number of Ib curves (e.g. 10uA, 20uA, 30uA...)
  const [showLoadLine, setShowLoadLine] = useState<boolean>(true);
  const [loadLineVcc, setLoadLineVcc] = useState<number>(vccSupply || 12);
  const [loadLineRc, setLoadLineRc] = useState<number>(rcCollectorResistor || 1000);
  const [customBeta, setCustomBeta] = useState<number | null>(null);
  const [customVa, setCustomVa] = useState<number | null>(null);
  const [customVceSat, setCustomVceSat] = useState<number | null>(null);

  // Hover cursor state on plot
  const [hoverData, setHoverData] = useState<{
    vce: number;
    ic_mA: number;
    ib_uA: number;
    ro_kOhm: number;
    gm_mS: number;
    curveLabel: string;
  } | null>(null);

  const [copiedSpice, setCopiedSpice] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Keep selectedBjtId valid whenever canvas BJT list updates
  useEffect(() => {
    if (bjtList.length > 0) {
      if (!bjtList.some((b) => b.id === selectedBjtId)) {
        setSelectedBjtId(bjtList[0].id);
      }
    } else if (selectedBjtId !== -1) {
      setSelectedBjtId(-1);
    }
  }, [bjtList, selectedBjtId]);

  // Sync load line supply/collector resistor when modal opens with updated props
  useEffect(() => {
    if (!isOpen) return;
    setLoadLineVcc(Math.max(0.5, vccSupply || 12));
    setLoadLineRc(Math.max(1, rcCollectorResistor || 1000));
  }, [isOpen, vccSupply, rcCollectorResistor]);

  // Reset custom slider overrides when switching transistor or preset
  useEffect(() => {
    setCustomBeta(null);
    setCustomVa(null);
    setCustomVceSat(null);
  }, [selectedBjtId, activePresetIdx]);

  // Determine active transistor configuration
  const activeBjt = useMemo(() => {
    const found = bjtList.find((b) => b.id === selectedBjtId);
    if (found) return found;

    const preset = PRESET_BJT_MODELS[activePresetIdx];
    return {
      id: -1,
      label: `${preset.modelName} (Preset)`,
      type: "BJT",
      modelName: preset.modelName,
      beta: preset.beta,
      vbe_on: preset.vbe_on,
      vce_sat: preset.vce_sat,
      va: preset.va,
      isPnp: preset.type === "PNP",
      liveVce: undefined,
      liveIc_mA: undefined,
      liveIb_uA: undefined,
      liveVbe: undefined,
      operatingRegion: undefined,
    } as BjtComponentItem;
  }, [bjtList, selectedBjtId, activePresetIdx]);

  const effectiveBeta = customBeta ?? activeBjt.beta ?? 150;
  const effectiveVa = customVa ?? activeBjt.va ?? 100;
  const effectiveVceSat = customVceSat ?? activeBjt.vce_sat ?? 0.2;

  // Generate Family of I-V Curves
  // Ic = beta * Ib * (1 - exp(-Vce / Vknee)) * (1 + Vce / Va)
  const curveSeries = useMemo(() => {
    const curves: {
      ib_uA: number;
      label: string;
      color: string;
      points: { vce: number; ic_mA: number }[];
    }[] = [];

    const colors = [
      "#38bdf8", // Sky blue
      "#34d399", // Emerald
      "#fbbf24", // Amber
      "#f472b6", // Pink
      "#a78bfa", // Purple
      "#fb923c", // Orange
      "#22d3ee", // Cyan
      "#e879f9", // Fuchsia
    ];

    const vKnee = Math.max(0.04, effectiveVceSat / 2.6);
    const stepsCount = 120;

    for (let c = 1; c <= numCurves; c++) {
      const ib = c * ibStep_uA;
      const points: { vce: number; ic_mA: number }[] = [];

      for (let i = 0; i <= stepsCount; i++) {
        const vce = (i / stepsCount) * maxVce;
        // Saturation knee transition
        const satFactor = 1 - Math.exp(-vce / vKnee);
        // Early effect active slope
        const earlyFactor = 1 + vce / effectiveVa;
        // Base current in mA = ib / 1000
        const ic_ideal_mA = effectiveBeta * (ib / 1000);
        const ic_mA = Math.max(0, ic_ideal_mA * satFactor * earlyFactor);

        points.push({ vce, ic_mA });
      }

      curves.push({
        ib_uA: ib,
        label: `I_B = ${ib} μA`,
        color: colors[(c - 1) % colors.length],
        points,
      });
    }

    return curves;
  }, [effectiveBeta, effectiveVa, effectiveVceSat, maxVce, ibStep_uA, numCurves]);

  // Compute maximum Ic for scaling the SVG Y-axis
  const maxIcPlot = useMemo(() => {
    let m = 0.5;
    for (const c of curveSeries) {
      for (const pt of c.points) {
        if (pt.ic_mA > m) m = pt.ic_mA;
      }
    }
    // If DC load line enabled, factor in load line saturation current Vcc/Rc
    if (showLoadLine && loadLineRc > 0) {
      const icSatLoadLine = (loadLineVcc / loadLineRc) * 1000;
      if (icSatLoadLine > m) m = icSatLoadLine;
    }
    // Also factor in live Q-point
    if (activeBjt.liveIc_mA && activeBjt.liveIc_mA > m) {
      m = activeBjt.liveIc_mA;
    }
    return Math.ceil(m * 1.15);
  }, [curveSeries, showLoadLine, loadLineVcc, loadLineRc, activeBjt.liveIc_mA]);

  // Plot dimension math
  const plotW = isExpanded ? 760 : 540;
  const plotH = isExpanded ? 400 : 310;
  const padL = 55;
  const padR = 52;
  const padT = 20;
  const padB = 40;

  const toSvgX = (vce: number) => padL + (vce / maxVce) * (plotW - padL - padR);
  const toSvgY = (ic_mA: number) =>
    plotH - padB - (ic_mA / maxIcPlot) * (plotH - padT - padB);

  // Invert SVG coordinate back to Vce and Ic
  const handleSvgPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const x = ((e.clientX - rect.left) / rect.width) * plotW;
    const y = ((e.clientY - rect.top) / rect.height) * plotH;

    if (x < padL || x > plotW - padR || y < padT || y > plotH - padB) {
      setHoverData(null);
      return;
    }

    const vceHover = ((x - padL) / (plotW - padL - padR)) * maxVce;
    const icHover_mA =
      ((plotH - padB - y) / (plotH - padT - padB)) * maxIcPlot;

    // Find nearest curve
    let bestDist = Infinity;
    let bestCurve = curveSeries[0];
    let bestIc = 0;

    for (const c of curveSeries) {
      const vKnee = Math.max(0.04, effectiveVceSat / 2.6);
      const satFactor = 1 - Math.exp(-vceHover / vKnee);
      const earlyFactor = 1 + vceHover / effectiveVa;
      const ic_ideal = effectiveBeta * (c.ib_uA / 1000);
      const ic_actual = Math.max(0, ic_ideal * satFactor * earlyFactor);
      const dist = Math.abs(ic_actual - icHover_mA);

      if (dist < bestDist) {
        bestDist = dist;
        bestCurve = c;
        bestIc = ic_actual;
      }
    }

    if (!bestCurve) return;

    // Small-signal parameters at cursor
    const ro_kOhm =
      bestIc > 0.01 ? (effectiveVa + vceHover) / bestIc : 999;
    const gm_mS = bestIc > 0.01 ? bestIc / 0.026 : 0;

    setHoverData({
      vce: vceHover,
      ic_mA: bestIc,
      ib_uA: bestCurve.ib_uA,
      ro_kOhm,
      gm_mS,
      curveLabel: bestCurve.label,
    });
  };

  // Export I-V Curve data as CSV
  const handleExportCsv = () => {
    const lines: string[] = [];
    lines.push(`# LogiCraft BJT I-V Characteristic Curve Tracer Export`);
    lines.push(`# Component: ${activeBjt.label} (${activeBjt.modelName})`);
    lines.push(`# Polarity: ${activeBjt.isPnp ? "PNP" : "NPN"}`);
    lines.push(`# Gain (Beta): ${effectiveBeta}, Early Voltage (VA): ${effectiveVa}V, Vce(sat): ${effectiveVceSat}V`);
    lines.push(`# Date: ${new Date().toISOString()}`);
    lines.push(``);

    // Headers: Vce, followed by each Ib curve
    const headers = ["V_CE (V)", ...curveSeries.map((c) => `I_C (mA) @ I_B=${c.ib_uA}uA`)];
    lines.push(headers.join(","));

    const rowCount = curveSeries[0]?.points.length || 0;
    for (let i = 0; i < rowCount; i++) {
      const vceVal = curveSeries[0].points[i].vce.toFixed(3);
      const row = [vceVal];
      for (const c of curveSeries) {
        row.push(c.points[i]?.ic_mA.toFixed(4) || "0.0000");
      }
      lines.push(row.join(","));
    }

    const csvContent = lines.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `bjt_iv_curves_${activeBjt.modelName.toLowerCase()}_${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Copy SPICE .MODEL card
  const handleCopySpice = () => {
    const spiceCard = `.MODEL ${activeBjt.modelName} ${
      activeBjt.isPnp ? "PNP" : "NPN"
    }(BF=${effectiveBeta} VAF=${effectiveVa} IS=1E-14 RB=10 RC=1 RE=0.5 CJE=8PF CJC=4PF VCEO=${
      activeBjt.isPnp ? 45 : 40
    })`;
    navigator.clipboard?.writeText(spiceCard);
    setCopiedSpice(true);
    setTimeout(() => setCopiedSpice(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-5 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className={`relative w-full ${
          isExpanded ? "max-w-6xl" : "max-w-4xl"
        } bg-[#0b1020] border border-cyan-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto transition-all`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-[#0d162b] via-[#111e3b] to-[#0d162b] border-b border-cyan-500/30">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/40 flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide font-display">
                  BJT I-V Characteristic Curve Tracer
                </h2>
                <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px] font-mono font-bold">
                  Collector Curves: I_C vs V_CE
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Interactive Tektronix-style semiconductor curve tracer plotting the family of collector curves across stepped base currents (I_B).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsExpanded((v) => !v)}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title={isExpanded ? "Standard View" : "Enlarge Tracer Window"}
            >
              {isExpanded ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-300 hover:text-white border border-rose-500/30 transition-colors cursor-pointer"
              title="Close Curve Tracer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Transistor Selector & Circuit Presence Bar */}
        <div className="px-5 py-2.5 bg-[#0f172a] border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-400 font-mono font-semibold">
              Target Transistor:
            </span>

            {bjtList.length > 0 ? (
              <select
                value={selectedBjtId}
                onChange={(e) => setSelectedBjtId(Number(e.target.value))}
                className="bg-slate-900 border border-cyan-500/40 text-cyan-200 rounded-lg px-2.5 py-1 font-mono font-bold focus:outline-none focus:border-cyan-400 cursor-pointer"
              >
                {bjtList.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.label} ({b.modelName} {b.isPnp ? "PNP" : "NPN"} · β={b.beta})
                  </option>
                ))}
              </select>
            ) : (
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono text-[11px]">
                  No BJT on canvas (Using Standalone Model)
                </span>
                <select
                  value={activePresetIdx}
                  onChange={(e) => setActivePresetIdx(Number(e.target.value))}
                  className="bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-2 py-1 font-mono cursor-pointer"
                >
                  {PRESET_BJT_MODELS.map((p, idx) => (
                    <option key={p.modelName} value={idx}>
                      {p.modelName} ({p.type} · β={p.beta})
                    </option>
                  ))}
                </select>
                {onAddBjtToCanvas && (
                  <button
                    type="button"
                    onClick={() =>
                      onAddBjtToCanvas(PRESET_BJT_MODELS[activePresetIdx].modelName)
                    }
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-semibold font-mono text-[11px] cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    + Add to Canvas
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Circuit Live Operating Q-Point Readout */}
          <div className="flex items-center gap-2 font-mono text-[11px]">
            {activeBjt.liveVce !== undefined && activeBjt.liveIc_mA !== undefined ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-950/50 border border-cyan-500/40 text-cyan-300">
                <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
                <span>
                  Circuit Q-Point:{" "}
                  <strong className="text-white">
                    V_CE={activeBjt.liveVce.toFixed(2)}V
                  </strong>
                  ,{" "}
                  <strong className="text-white">
                    I_C={activeBjt.liveIc_mA.toFixed(2)}mA
                  </strong>
                </span>
                {activeBjt.operatingRegion && (
                  <span
                    className={`ml-1 px-1.5 py-0.5 rounded font-bold text-[10px] ${
                      activeBjt.operatingRegion === "ACTIVE"
                        ? "bg-emerald-500/20 text-emerald-300"
                        : activeBjt.operatingRegion === "SATURATION"
                        ? "bg-amber-500/20 text-amber-300"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {activeBjt.operatingRegion}
                  </span>
                )}
              </div>
            ) : (
              <span className="text-slate-400 italic">
                Simulated Theoretical Curve Family
              </span>
            )}
          </div>
        </div>

        {/* Main Content Layout: Left Plot Area + Right Control Panel */}
        <div className="p-5 flex flex-col lg:flex-row gap-5 items-start">
          {/* Main SVG I-V Curve Graph */}
          <div className="flex-1 w-full bg-[#070b14] border border-cyan-500/25 rounded-xl p-3 shadow-inner flex flex-col items-center select-none">
            {/* Graph Legend & Status */}
            <div className="w-full flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-slate-400 mb-2 px-1">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-cyan-400 font-bold">
                  Y: Collector Current I_C (mA)
                </span>
                <span>vs</span>
                <span className="text-emerald-400 font-bold">
                  X: Collector-Emitter V_CE (V)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-400/80" />
                <span className="text-[11px] text-amber-300">
                  Saturation Knee: V_CE &lt; {effectiveVceSat}V
                </span>
              </div>
            </div>

            {/* SVG Canvas Plot */}
            <svg
              width="100%"
              height="100%"
              viewBox={`0 0 ${plotW} ${plotH}`}
              className="w-full h-auto max-h-[460px] bg-[#070a13] rounded-lg cursor-crosshair border border-slate-800/80"
              onPointerMove={handleSvgPointerMove}
              onPointerLeave={() => setHoverData(null)}
            >
              <defs>
                {/* Saturation Region Soft Gradient */}
                <linearGradient id="satGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Saturation Zone Shading (Vce < Vce_sat) */}
              <rect
                x={padL}
                y={padT}
                width={Math.max(4, toSvgX(effectiveVceSat) - padL)}
                height={plotH - padT - padB}
                fill="url(#satGrad)"
              />
              <line
                x1={toSvgX(effectiveVceSat)}
                y1={padT}
                x2={toSvgX(effectiveVceSat)}
                y2={plotH - padB}
                stroke="#f59e0b"
                strokeWidth="1.2"
                strokeDasharray="3 3"
              />
              <text
                x={toSvgX(effectiveVceSat) + 4}
                y={padT + 12}
                fill="#f59e0b"
                fontSize="9"
                fontFamily="JetBrains Mono, monospace"
                fontWeight="600"
              >
                V_CE(sat)
              </text>

              {/* Grid Lines & Ticks */}
              {/* Horizontal Grid Lines (Current Ic in mA) */}
              {[0, 0.25, 0.5, 0.75, 1.0].map((frac) => {
                const icVal = frac * maxIcPlot;
                const y = toSvgY(icVal);
                return (
                  <g key={`y-grid-${frac}`}>
                    <line
                      x1={padL}
                      y1={y}
                      x2={plotW - padR}
                      y2={y}
                      stroke="rgba(51, 65, 85, 0.35)"
                      strokeWidth="1"
                      strokeDasharray="3 3"
                    />
                    <text
                      x={padL - 8}
                      y={y + 3.5}
                      textAnchor="end"
                      fill="#94a3b8"
                      fontSize="9.5"
                      fontFamily="JetBrains Mono, monospace"
                    >
                      {icVal.toFixed(1)}
                    </text>
                  </g>
                );
              })}

              {/* Vertical Grid Lines (Voltage Vce in Volts) */}
              {[0, 0.25, 0.5, 0.75, 1.0].map((frac) => {
                const vceVal = frac * maxVce;
                const x = toSvgX(vceVal);
                return (
                  <g key={`x-grid-${frac}`}>
                    <line
                      x1={x}
                      y1={padT}
                      x2={x}
                      y2={plotH - padB}
                      stroke="rgba(51, 65, 85, 0.35)"
                      strokeWidth="1"
                      strokeDasharray="3 3"
                    />
                    <text
                      x={x}
                      y={plotH - padB + 16}
                      textAnchor="middle"
                      fill="#94a3b8"
                      fontSize="9.5"
                      fontFamily="JetBrains Mono, monospace"
                    >
                      {vceVal.toFixed(1)}V
                    </text>
                  </g>
                );
              })}

              {/* Plot Axes */}
              <line
                x1={padL}
                y1={padT}
                x2={padL}
                y2={plotH - padB}
                stroke="#64748b"
                strokeWidth="2"
              />
              <line
                x1={padL}
                y1={plotH - padB}
                x2={plotW - padR}
                y2={plotH - padB}
                stroke="#64748b"
                strokeWidth="2"
              />

              {/* Family of I-V Curves */}
              {curveSeries.map((c) => {
                const d = c.points
                  .map(
                    (pt, idx) =>
                      `${idx === 0 ? "M" : "L"} ${toSvgX(pt.vce).toFixed(
                        1
                      )} ${toSvgY(pt.ic_mA).toFixed(1)}`
                  )
                  .join(" ");

                const lastPt = c.points[c.points.length - 1];

                return (
                  <g key={c.label}>
                    {/* Main Trace */}
                    <path
                      d={d}
                      fill="none"
                      stroke={c.color}
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {/* Curve Label at Right Edge */}
                    {lastPt && (
                      <text
                        x={toSvgX(lastPt.vce) + 4}
                        y={toSvgY(lastPt.ic_mA) + 3}
                        fill={c.color}
                        fontSize="9"
                        fontFamily="JetBrains Mono, monospace"
                        fontWeight="600"
                      >
                        {c.ib_uA}μA
                      </text>
                    )}
                  </g>
                );
              })}

              {/* DC Load Line (if enabled) */}
              {showLoadLine && loadLineRc > 0 && (
                <g>
                  {(() => {
                    const icSat_mA = (loadLineVcc / loadLineRc) * 1000;
                    const xVcc = toSvgX(Math.min(maxVce, loadLineVcc));
                    const yIcSat = toSvgY(Math.min(maxIcPlot, icSat_mA));

                    return (
                      <>
                        <line
                          x1={toSvgX(0)}
                          y1={yIcSat}
                          x2={xVcc}
                          y2={toSvgY(0)}
                          stroke="#ef4444"
                          strokeWidth="2"
                          strokeDasharray="5 3"
                        />
                        <text
                          x={xVcc - 14}
                          y={toSvgY(0) - 6}
                          fill="#ef4444"
                          fontSize="9.5"
                          fontFamily="JetBrains Mono, monospace"
                          fontWeight="bold"
                        >
                          V_CC ({loadLineVcc}V)
                        </text>
                        <text
                          x={toSvgX(0) + 6}
                          y={yIcSat + 11}
                          fill="#ef4444"
                          fontSize="9"
                          fontFamily="JetBrains Mono, monospace"
                          fontWeight="bold"
                        >
                          I_C(sat)={icSat_mA.toFixed(1)}mA
                        </text>
                      </>
                    );
                  })()}
                </g>
              )}

              {/* Actual Circuit Operating Q-Point (Crosshair & Label) */}
              {activeBjt.liveVce !== undefined &&
                activeBjt.liveIc_mA !== undefined &&
                activeBjt.liveVce <= maxVce &&
                activeBjt.liveIc_mA <= maxIcPlot && (
                  <g>
                    {/* Pulsing Outer Halo */}
                    <circle
                      cx={toSvgX(activeBjt.liveVce)}
                      cy={toSvgY(activeBjt.liveIc_mA)}
                      r="10"
                      fill="#38bdf8"
                      opacity="0.25"
                      className="animate-ping"
                    />
                    <circle
                      cx={toSvgX(activeBjt.liveVce)}
                      cy={toSvgY(activeBjt.liveIc_mA)}
                      r="6"
                      fill="#0ea5e9"
                      stroke="#ffffff"
                      strokeWidth="2"
                    />
                    <circle
                      cx={toSvgX(activeBjt.liveVce)}
                      cy={toSvgY(activeBjt.liveIc_mA)}
                      r="2"
                      fill="#ffffff"
                    />
                    {/* Q-point callout flag */}
                    <rect
                      x={toSvgX(activeBjt.liveVce) + 10}
                      y={toSvgY(activeBjt.liveIc_mA) - 22}
                      width="130"
                      height="20"
                      rx="4"
                      fill="#0f172a"
                      stroke="#38bdf8"
                      strokeWidth="1.2"
                    />
                    <text
                      x={toSvgX(activeBjt.liveVce) + 15}
                      y={toSvgY(activeBjt.liveIc_mA) - 8}
                      fill="#38bdf8"
                      fontSize="9.5"
                      fontFamily="JetBrains Mono, monospace"
                      fontWeight="bold"
                    >
                      Q ({activeBjt.liveVce.toFixed(2)}V,{" "}
                      {activeBjt.liveIc_mA.toFixed(2)}mA)
                    </text>
                  </g>
                )}

              {/* Interactive Hover Point & Reticle */}
              {hoverData && (
                <g pointerEvents="none">
                  {/* Vertical Reticle */}
                  <line
                    x1={toSvgX(hoverData.vce)}
                    y1={padT}
                    x2={toSvgX(hoverData.vce)}
                    y2={plotH - padB}
                    stroke="rgba(255, 255, 255, 0.4)"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                  />
                  {/* Horizontal Reticle */}
                  <line
                    x1={padL}
                    y1={toSvgY(hoverData.ic_mA)}
                    x2={plotW - padR}
                    y2={toSvgY(hoverData.ic_mA)}
                    stroke="rgba(255, 255, 255, 0.4)"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                  />
                  {/* Target Node Point */}
                  <circle
                    cx={toSvgX(hoverData.vce)}
                    cy={toSvgY(hoverData.ic_mA)}
                    r="4.5"
                    fill="#38bdf8"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                  />
                </g>
              )}
            </svg>

            {/* Hover Telemetry Readout Box */}
            <div className="w-full mt-3 p-2.5 rounded-lg bg-[#0d1424] border border-cyan-500/20 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
              {hoverData ? (
                <>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-400">Curve:</span>
                    <strong className="text-cyan-300">
                      I_B = {hoverData.ib_uA} μA
                    </strong>
                    <span className="text-slate-500">|</span>
                    <span className="text-slate-400">V_CE:</span>
                    <strong className="text-emerald-300">
                      {hoverData.vce.toFixed(2)} V
                    </strong>
                    <span className="text-slate-500">|</span>
                    <span className="text-slate-400">I_C:</span>
                    <strong className="text-white">
                      {hoverData.ic_mA.toFixed(3)} mA
                    </strong>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-400">r_o (slope):</span>
                    <strong className="text-amber-300">
                      {hoverData.ro_kOhm.toFixed(1)} kΩ
                    </strong>
                    <span className="text-slate-500">|</span>
                    <span className="text-slate-400">g_m:</span>
                    <strong className="text-purple-300">
                      {hoverData.gm_mS.toFixed(1)} mS
                    </strong>
                  </div>
                </>
              ) : (
                <div className="w-full text-center text-slate-400 italic">
                  Hover mouse over curve area to inspect precise instantaneous operating parameters (V_CE, I_C, r_o, g_m).
                </div>
              )}
            </div>
          </div>

          {/* Right Parameter Controls & Mathematical Workbench */}
          <div className="w-full lg:w-80 space-y-4">
            {/* SPICE Parameters Card */}
            <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                  Transistor Parameters
                </span>
                <span className="text-[10px] font-mono text-cyan-300 px-1.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-800">
                  {activeBjt.modelName} ({activeBjt.isPnp ? "PNP" : "NPN"})
                </span>
              </div>

              {/* Beta (hFE) Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-400">Current Gain (β / hFE):</span>
                  <span className="text-cyan-300 font-bold">{effectiveBeta}×</span>
                </div>
                <input
                  type="range"
                  min="30"
                  max="450"
                  step="10"
                  value={effectiveBeta}
                  onChange={(e) => setCustomBeta(Number(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>

              {/* Early Voltage (VA) Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-400">Early Voltage (V_A):</span>
                  <span className="text-cyan-300 font-bold">{effectiveVa} V</span>
                </div>
                <input
                  type="range"
                  min="40"
                  max="200"
                  step="5"
                  value={effectiveVa}
                  onChange={(e) => setCustomVa(Number(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>

              {/* Saturation Voltage Vce(sat) Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-400">V_CE(sat):</span>
                  <span className="text-amber-300 font-bold">
                    {effectiveVceSat.toFixed(2)} V
                  </span>
                </div>
                <input
                  type="range"
                  min="0.10"
                  max="0.50"
                  step="0.02"
                  value={effectiveVceSat}
                  onChange={(e) => setCustomVceSat(Number(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>
            </div>

            {/* Sweep & Curve Generation Settings */}
            <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-4 space-y-3">
              <span className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                Tracer Sweep Settings
              </span>

              {/* Base Current Step Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-400">Base Current Step (ΔI_B):</span>
                  <span className="text-emerald-300 font-bold">
                    {ibStep_uA} μA/step
                  </span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="25"
                  step="1"
                  value={ibStep_uA}
                  onChange={(e) => setIbStep_uA(Number(e.target.value))}
                  className="w-full accent-emerald-400 cursor-pointer"
                />
              </div>

              {/* Number of Curves */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-400">Family Trace Steps:</span>
                  <span className="text-cyan-300 font-bold">{numCurves} Curves</span>
                </div>
                <input
                  type="range"
                  min="3"
                  max="8"
                  step="1"
                  value={numCurves}
                  onChange={(e) => setNumCurves(Number(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>

              {/* Max Vce Sweep Range */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-400">Max V_CE Sweep:</span>
                  <span className="text-white font-bold">{maxVce} V</span>
                </div>
                <div className="flex items-center gap-1">
                  {[6, 12, 18, 24].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setMaxVce(v)}
                      className={`flex-1 py-1 rounded text-xs font-mono font-semibold transition-colors cursor-pointer ${
                        maxVce === v
                          ? "bg-cyan-500/25 border border-cyan-400 text-cyan-200"
                          : "bg-slate-900 border border-slate-700 text-slate-400 hover:text-white"
                      }`}
                    >
                      {v}V
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* DC Load Line Controls */}
            <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono font-bold text-white flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showLoadLine}
                    onChange={(e) => setShowLoadLine(e.target.checked)}
                    className="accent-red-500 rounded cursor-pointer"
                  />
                  <span>Show DC Load Line</span>
                </label>
                <span className="text-[10px] font-mono text-rose-300">
                  R_C: {loadLineRc}Ω · V_CC: {loadLineVcc}V
                </span>
              </div>

              {showLoadLine && (
                <div className="space-y-2 pt-1 border-t border-slate-800/80">
                  <div className="flex items-center gap-2 text-xs font-mono">
                    <span className="text-slate-400 w-16">V_CC (V):</span>
                    <input
                      type="number"
                      min="0.5"
                      max="100"
                      step="0.5"
                      value={loadLineVcc}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setLoadLineVcc(Number.isFinite(val) ? Math.max(0.5, Math.min(100, val)) : 0.5);
                      }}
                      className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white text-xs font-mono"
                    />
                  </div>
                  <div className="flex items-center gap-2 text-xs font-mono">
                    <span className="text-slate-400 w-16">R_C (Ω):</span>
                    <input
                      type="number"
                      min="1"
                      max="100000"
                      step="100"
                      value={loadLineRc}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setLoadLineRc(Number.isFinite(val) ? Math.max(1, val) : 1);
                      }}
                      className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white text-xs font-mono"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Export & SPICE Model Actions */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={handleExportCsv}
                className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-500/40 text-xs font-mono font-bold transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4 text-cyan-300" />
                Export I-V Curves (.CSV)
              </button>

              <button
                type="button"
                onClick={handleCopySpice}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-mono transition-colors cursor-pointer"
              >
                {copiedSpice ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    SPICE .MODEL Card Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                    Copy SPICE .MODEL Card
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
