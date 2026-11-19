import React, { useState, useMemo, useEffect } from "react";
import { Activity, CheckCircle2, AlertTriangle } from "lucide-react";
import SeriesParallelBuilder from "./SeriesParallelBuilder";
import MasterLabWorkbench from "./MasterLabWorkbench";

type CDLabTab =
  | "CUSTOM_BUILDER"
  | "DIODE_IV_LOADLINE"
  | "CLIPPER_CLAMPER"
  | "ZENER_REGULATOR"
  | "MASTER_15_LIC"
  | "MASTER_15_EDC";
type DiodeMaterial = "Si" | "Ge" | "Schottky" | "GaAs_LED";
type WaveShaperMode =
  | "POS_CLIPPER"
  | "NEG_CLIPPER"
  | "DUAL_LIMITER"
  | "POS_CLAMPER"
  | "NEG_CLAMPER";

const DIODE_SPECS: Record<
  DiodeMaterial,
  { name: string; isA: number; n: number; vKnee: number; color: string }
> = {
  Si: {
    name: "Silicon (1N4007 / 1N4148)",
    isA: 1e-12,
    n: 1.75,
    vKnee: 0.7,
    color: "#22c55e",
  },
  Ge: {
    name: "Germanium (1N34A)",
    isA: 1e-6,
    n: 1.35,
    vKnee: 0.3,
    color: "#38bdf8",
  },
  Schottky: {
    name: "Schottky Barrier (1N5819)",
    isA: 5e-6,
    n: 1.15,
    vKnee: 0.24,
    color: "#f59e0b",
  },
  GaAs_LED: {
    name: "GaAs Red LED",
    isA: 1e-18,
    n: 2.1,
    vKnee: 1.8,
    color: "#ef4444",
  },
};

interface CircuitAndDevicesLabProps {
  initialTab?: CDLabTab;
  initialScenarioName?: string;
  syncKey?: number | string;
}

export default function CircuitAndDevicesLab({
  initialTab,
  initialScenarioName,
  syncKey,
}: CircuitAndDevicesLabProps = {}) {
  const [activeTab, setActiveTab] = useState<CDLabTab>(initialTab || "CUSTOM_BUILDER");

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab, syncKey]);

  // --- Exp 1: Diode Shockley I-V & Load Line ---
  const [material, setMaterial] = useState<DiodeMaterial>("Si");
  const [vSupply, setVSupply] = useState<number>(5.0); // V
  const [rSeries, setRSeries] = useState<number>(220); // Ohms
  const [tempC, setTempC] = useState<number>(25); // Celsius

  // --- Exp 2: Clipper & Clamper ---
  const [shaperMode, setShaperMode] = useState<WaveShaperMode>("POS_CLIPPER");
  const [vPeakIn, setVPeakIn] = useState<number>(10); // Vp
  const [vBiasRef, setVBiasRef] = useState<number>(2.5); // V

  // --- Exp 3: Zener Shunt Regulator ---
  const [zenerVin, setZenerVin] = useState<number>(15); // V
  const [zenerVz, setZenerVz] = useState<number>(5.1); // V
  const [zenerRs, setZenerRs] = useState<number>(220); // Ohms
  const [zenerRL, setZenerRL] = useState<number>(470); // Ohms

  // --- Exp 1 Newton-Raphson Shockley Load-Line Solver ---
  const diodeQPoint = useMemo(() => {
    const spec = DIODE_SPECS[material];
    const tempK = tempC + 273.15;
    // Thermal voltage VT = k*T/q
    const vt = (1.380649e-23 * tempK) / 1.60217663e-19;
    // Temperature-adjusted saturation current
    const isTemp = spec.isA * Math.pow(2, (tempC - 25) / 10);

    // Solve I_D(V_D) = (V_SS - V_D)/R_S via Newton-Raphson
    let vd = Math.min(vSupply, spec.vKnee);
    for (let iter = 0; iter < 40; iter++) {
      const expTerm = Math.exp(Math.min(60, vd / (spec.n * vt)));
      const id = isTemp * (expTerm - 1);
      const f = id - (vSupply - vd) / rSeries;
      const df = (isTemp / (spec.n * vt)) * expTerm + 1 / rSeries;
      const step = f / df;
      vd = Math.max(0, Math.min(vSupply, vd - step));
      if (Math.abs(step) < 1e-6) break;
    }

    const idQ_mA = ((vSupply - vd) / rSeries) * 1000;
    const iSatLoadLine_mA = (vSupply / rSeries) * 1000;
    const rdDynamicOhm =
      idQ_mA > 0.001 ? ((spec.n * vt) / (idQ_mA / 1000)) : 9999;
    const pDiode_mW = vd * idQ_mA;

    // Generate Shockley I-V curve points
    const maxVPlot = Math.max(2.5, Math.min(6, vSupply * 1.05));
    const maxIPlot_mA = Math.max(10, iSatLoadLine_mA * 1.15);
    const ivCurve: { v: number; i_mA: number }[] = [];

    for (let i = 0; i <= 80; i++) {
      const v = (i / 80) * maxVPlot;
      const cur_mA =
        isTemp * (Math.exp(Math.min(60, v / (spec.n * vt))) - 1) * 1000;
      if (cur_mA <= maxIPlot_mA * 1.05) {
        ivCurve.push({ v, i_mA: cur_mA });
      }
    }

    return {
      spec,
      vt_mV: vt * 1000,
      vdQ: vd,
      idQ_mA,
      iSatLoadLine_mA,
      rdDynamicOhm,
      pDiode_mW,
      maxVPlot,
      maxIPlot_mA,
      ivCurve,
    };
  }, [material, vSupply, rSeries, tempC]);

  // --- Exp 3 Zener Regulator Solver ---
  const zenerStats = useMemo(() => {
    // Open-Zener Thevenin voltage across RL:
    const vThev = zenerVin * (zenerRL / (zenerRs + zenerRL));
    const isRegulating = vThev >= zenerVz;

    const vLoad = isRegulating ? zenerVz : vThev;
    const iSeries_mA = ((zenerVin - vLoad) / zenerRs) * 1000;
    const iLoad_mA = (vLoad / zenerRL) * 1000;
    const iZener_mA = isRegulating ? Math.max(0, iSeries_mA - iLoad_mA) : 0;
    const pZener_mW = vLoad * iZener_mA;
    const rLMinOhm =
      zenerVin > zenerVz
        ? (zenerRs * zenerVz) / (zenerVin - zenerVz)
        : 9999;

    return {
      vThev,
      isRegulating,
      vLoad,
      iSeries_mA,
      iLoad_mA,
      iZener_mA,
      pZener_mW,
      rLMinOhm,
    };
  }, [zenerVin, zenerVz, zenerRs, zenerRL]);

  return (
    <div className="space-y-6">
      {/* Sub-Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#111827] border border-slate-800 rounded-xl p-3">
        <div className="flex flex-wrap items-center gap-2">
          {[
            {
              id: "CUSTOM_BUILDER" as CDLabTab,
              label: "01. Interactive Circuit Builder (Drag & Drop)",
            },
            {
              id: "DIODE_IV_LOADLINE" as CDLabTab,
              label: "02. PN Diode Shockley I-V & DC Load-Line",
            },
            {
              id: "CLIPPER_CLAMPER" as CDLabTab,
              label: "03. Diode Clipper & Clamper Wave Shaper",
            },
            {
              id: "ZENER_REGULATOR" as CDLabTab,
              label: "04. Zener Shunt Voltage Regulator",
            },
            {
              id: "MASTER_15_LIC" as CDLabTab,
              label: "05. Domain B: 15 Linear IC / Wave-Shaping Labs",
            },
            {
              id: "MASTER_15_EDC" as CDLabTab,
              label: "06. Domain E: 15 Devices & Circuits Labs",
            },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === t.id
                  ? "bg-cyan-400 text-slate-950 font-bold"
                  : "bg-slate-900 text-slate-300 hover:text-white border border-slate-800"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <span className="text-xs font-mono text-cyan-400 px-2">
          Circuit &amp; Devices (CD) Lab
        </span>
      </div>

      {activeTab === "CUSTOM_BUILDER" && (
        <SeriesParallelBuilder
          labMode="cd"
          initialScenarioName={initialScenarioName}
          scenarioSyncKey={syncKey}
        />
      )}

      {activeTab === "MASTER_15_LIC" && (
        <MasterLabWorkbench
          fixedDomain="B"
          onLaunchInteractiveBuilder={() => setActiveTab("CUSTOM_BUILDER")}
        />
      )}

      {activeTab === "MASTER_15_EDC" && (
        <MasterLabWorkbench
          fixedDomain="E"
          onLaunchInteractiveBuilder={() => setActiveTab("CUSTOM_BUILDER")}
        />
      )}

      {/* EXP 1: DIODE I-V & LOAD LINE */}
      {activeTab === "DIODE_IV_LOADLINE" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-4 bg-[#111827] border border-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white">
              Semiconductor Junction &amp; Bias
            </h3>

            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(DIODE_SPECS) as DiodeMaterial[]).map((mat) => (
                <button
                  key={mat}
                  type="button"
                  onClick={() => setMaterial(mat)}
                  className={`px-3 py-2 rounded-lg text-xs font-mono border text-left transition-colors cursor-pointer ${
                    material === mat
                      ? "bg-cyan-500/20 border-cyan-400 text-cyan-200 font-bold"
                      : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  {mat.replace("_", " ")} (V_γ≈{DIODE_SPECS[mat].vKnee}V)
                </button>
              ))}
            </div>

            {[
              {
                label: "Supply Voltage V_SS",
                val: vSupply,
                set: setVSupply,
                min: 0.5,
                max: 12,
                step: 0.25,
                unit: "V",
              },
              {
                label: "Current-Limiting Resistor R_S",
                val: rSeries,
                set: setRSeries,
                min: 47,
                max: 1000,
                step: 10,
                unit: "Ω",
              },
              {
                label: "Junction Temperature T",
                val: tempC,
                set: setTempC,
                min: -20,
                max: 100,
                step: 5,
                unit: "°C",
              },
            ].map((ctrl) => (
              <div key={ctrl.label} className="space-y-1">
                <div className="flex items-center justify-between gap-2 text-xs font-mono">
                  <span className="text-slate-300">{ctrl.label}</span>
                  <div className="inline-flex items-center gap-1">
                    <input
                      type="number"
                      step="any"
                      value={ctrl.val}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value);
                        if (isFinite(v)) ctrl.set(v);
                      }}
                      aria-label={`Enter ${ctrl.label}`}
                      className="w-20 bg-slate-950 border border-slate-700 focus:border-cyan-400 rounded px-1.5 py-0.5 text-right text-xs font-mono font-bold text-cyan-300 focus:outline-none"
                    />
                    <span className="text-slate-400">{ctrl.unit}</span>
                  </div>
                </div>
                <input
                  type="range"
                  min={ctrl.min}
                  max={ctrl.max}
                  step={ctrl.step}
                  value={ctrl.val}
                  onChange={(e) => ctrl.set(Number(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>
            ))}

            <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3.5 space-y-1.5 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400">Operating Q-Point V_DQ:</span>
                <span className="text-emerald-400 font-bold">
                  {diodeQPoint.vdQ.toFixed(3)} V
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Operating Current I_DQ:</span>
                <span className="text-cyan-300 font-bold">
                  {diodeQPoint.idQ_mA.toFixed(2)} mA
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Thermal Voltage V_T:</span>
                <span className="text-purple-300 font-bold">
                  {diodeQPoint.vt_mV.toFixed(2)} mV
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">AC Dynamic Resistance r_d:</span>
                <span className="text-amber-300 font-bold">
                  {diodeQPoint.rdDynamicOhm.toFixed(2)} Ω
                </span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-8 bg-[#070A12] border border-slate-800 rounded-xl p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3 text-xs font-mono">
              <span className="text-white font-semibold">
                SHOCKLEY I-V CHARACTERISTIC &amp; DC LOAD LINE INTERSECTION
                (Q-POINT)
              </span>
              <span className="text-emerald-400">
                Q = ({diodeQPoint.vdQ.toFixed(2)} V,{" "}
                {diodeQPoint.idQ_mA.toFixed(2)} mA) · P_D ={" "}
                {diodeQPoint.pDiode_mW.toFixed(2)} mW
              </span>
            </div>

            <svg viewBox="0 0 680 270" className="w-full h-auto block">
              <rect
                x="60"
                y="20"
                width="580"
                height="210"
                fill="#0b1020"
                stroke="#1e293b"
              />
              {(() => {
                const maxV = diodeQPoint.maxVPlot;
                const maxI = diodeQPoint.maxIPlot_mA;

                const ivPath = diodeQPoint.ivCurve
                  .map((pt, idx) => {
                    const x = 60 + (pt.v / maxV) * 580;
                    const y = 230 - (pt.i_mA / maxI) * 210;
                    return `${idx === 0 ? "M" : "L"} ${x.toFixed(1)},${y.toFixed(1)}`;
                  })
                  .join(" ");

                // Load line from (0, V_SS/R_S) to (V_SS, 0)
                const xVss = Math.min(640, 60 + (vSupply / maxV) * 580);
                const yIss = 230 - (diodeQPoint.iSatLoadLine_mA / maxI) * 210;

                const qX = 60 + (diodeQPoint.vdQ / maxV) * 580;
                const qY = 230 - (diodeQPoint.idQ_mA / maxI) * 210;

                return (
                  <>
                    {/* Load Line */}
                    <line
                      x1="60"
                      y1={yIss}
                      x2={xVss}
                      y2="230"
                      stroke="#38bdf8"
                      strokeWidth="2"
                      strokeDasharray="6 4"
                    />
                    {/* Shockley Curve */}
                    <path
                      d={ivPath}
                      fill="none"
                      stroke={diodeQPoint.spec.color}
                      strokeWidth="2.8"
                    />
                    {/* Q-Point Marker */}
                    <circle
                      cx={qX}
                      cy={qY}
                      r="6"
                      fill="#22c55e"
                      stroke="#ffffff"
                      strokeWidth="2"
                    />
                    <text
                      x={qX + 10}
                      y={Math.max(36, qY - 6)}
                      fill="#86efac"
                      fontSize="11"
                      fontFamily="JetBrains Mono"
                      fontWeight="700"
                    >
                      Q-Point ({diodeQPoint.vdQ.toFixed(2)}V,{" "}
                      {diodeQPoint.idQ_mA.toFixed(1)}mA)
                    </text>
                  </>
                );
              })()}
              <text
                x="350"
                y="256"
                textAnchor="middle"
                fill="#94a3b8"
                fontSize="11"
                fontFamily="JetBrains Mono"
              >
                Diode Forward Voltage V_D (V) — Solid: Shockley I_D(V_D) ·
                Dashed Cyan: DC Load Line
              </text>
            </svg>
          </div>
        </div>
      )}

      {/* EXP 2: CLIPPER & CLAMPER WAVE SHAPER */}
      {activeTab === "CLIPPER_CLAMPER" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-4 bg-[#111827] border border-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white">
              Diode Wave-Shaping Topology
            </h3>
            <div className="flex flex-col gap-1.5">
              {(
                [
                  {
                    id: "POS_CLIPPER",
                    label: "Biased Positive Clipper (Clips above +V_bias + 0.7V)",
                  },
                  {
                    id: "NEG_CLIPPER",
                    label: "Biased Negative Clipper (Clips below −V_bias − 0.7V)",
                  },
                  {
                    id: "DUAL_LIMITER",
                    label: "Dual-Ended Symmetrical Diode Limiter",
                  },
                  {
                    id: "POS_CLAMPER",
                    label: "Positive DC Clamper (Shifts Negative Peak to −0.7V)",
                  },
                  {
                    id: "NEG_CLAMPER",
                    label: "Negative DC Clamper (Shifts Positive Peak to +0.7V)",
                  },
                ] as const
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setShaperMode(m.id)}
                  className={`px-3 py-2 rounded-lg text-xs font-mono text-left border transition-colors cursor-pointer ${
                    shaperMode === m.id
                      ? "bg-cyan-500/20 border-cyan-400 text-cyan-200 font-bold"
                      : "bg-slate-900 border-slate-800 text-slate-300 hover:text-white"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-300">AC Input Peak V_p</span>
                <span className="text-cyan-400 font-bold">{vPeakIn} V</span>
              </div>
              <input
                type="range"
                min={3}
                max={20}
                step={0.5}
                value={vPeakIn}
                onChange={(e) => setVPeakIn(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-300">Reference Bias V_bias</span>
                <span className="text-cyan-400 font-bold">{vBiasRef} V</span>
              </div>
              <input
                type="range"
                min={0}
                max={10}
                step={0.5}
                value={vBiasRef}
                onChange={(e) => setVBiasRef(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>
          </div>

          <div className="lg:col-span-8 bg-[#070A12] border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3 text-xs font-mono">
              <span className="text-white font-semibold inline-flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-cyan-400" />
                DUAL-CHANNEL OSCILLOSCOPE: v_in(t) [CYAN] vs. SHAPED v_out(t)
                [GREEN]
              </span>
              <span className="text-emerald-400">Silicon V_D = 0.7 V</span>
            </div>

            <svg viewBox="0 0 680 260" className="w-full h-auto block">
              <rect
                x="50"
                y="20"
                width="600"
                height="210"
                fill="#0b1020"
                stroke="#1e293b"
              />
              <line
                x1="50"
                y1="125"
                x2="650"
                y2="125"
                stroke="#334155"
                strokeWidth="1.2"
              />

              {(() => {
                let inPath = "";
                let outPath = "";
                const scaleY = 85 / Math.max(10, vPeakIn * 2);

                for (let i = 0; i <= 240; i++) {
                  const theta = (i / 240) * 4 * Math.PI;
                  const x = 50 + (i / 240) * 600;
                  const vinVal = vPeakIn * Math.sin(theta);
                  let voutVal = vinVal;

                  const clipPos = vBiasRef + 0.7;
                  const clipNeg = -(vBiasRef + 0.7);

                  if (shaperMode === "POS_CLIPPER") {
                    voutVal = Math.min(vinVal, clipPos);
                  } else if (shaperMode === "NEG_CLIPPER") {
                    voutVal = Math.max(vinVal, clipNeg);
                  } else if (shaperMode === "DUAL_LIMITER") {
                    voutVal = Math.max(clipNeg, Math.min(clipPos, vinVal));
                  } else if (shaperMode === "POS_CLAMPER") {
                    voutVal = vinVal + (vPeakIn - 0.7) + vBiasRef;
                  } else if (shaperMode === "NEG_CLAMPER") {
                    voutVal = vinVal - (vPeakIn - 0.7) - vBiasRef;
                  }

                  const yIn = 125 - vinVal * scaleY;
                  const yOut = 125 - voutVal * scaleY;
                  inPath += `${i === 0 ? "M" : "L"} ${x.toFixed(1)},${yIn.toFixed(1)} `;
                  outPath += `${i === 0 ? "M" : "L"} ${x.toFixed(1)},${yOut.toFixed(1)} `;
                }

                return (
                  <>
                    <path
                      d={inPath}
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth="1.8"
                      strokeDasharray="5 3"
                    />
                    <path
                      d={outPath}
                      fill="none"
                      stroke="#22c55e"
                      strokeWidth="2.8"
                    />
                  </>
                );
              })()}
            </svg>
          </div>
        </div>
      )}

      {/* EXP 3: ZENER VOLTAGE REGULATOR */}
      {activeTab === "ZENER_REGULATOR" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-4 bg-[#111827] border border-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white">
              Zener Shunt Regulator Parameters
            </h3>

            {[
              {
                label: "Unregulated DC Input V_in",
                val: zenerVin,
                set: setZenerVin,
                min: 3,
                max: 30,
                step: 0.5,
                unit: "V",
              },
              {
                label: "Zener Breakdown Voltage V_Z",
                val: zenerVz,
                set: setZenerVz,
                min: 3.3,
                max: 15,
                step: 0.3,
                unit: "V",
              },
              {
                label: "Series Dropping Resistor R_S",
                val: zenerRs,
                set: setZenerRs,
                min: 47,
                max: 1000,
                step: 10,
                unit: "Ω",
              },
              {
                label: "Load Resistance R_L",
                val: zenerRL,
                set: setZenerRL,
                min: 50,
                max: 2000,
                step: 25,
                unit: "Ω",
              },
            ].map((ctrl) => (
              <div key={ctrl.label} className="space-y-1">
                <div className="flex items-center justify-between gap-2 text-xs font-mono">
                  <span className="text-slate-300">{ctrl.label}</span>
                  <div className="inline-flex items-center gap-1">
                    <input
                      type="number"
                      step="any"
                      value={ctrl.val}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value);
                        if (isFinite(v) && v > 0) ctrl.set(v);
                      }}
                      aria-label={`Enter ${ctrl.label}`}
                      className="w-20 bg-slate-950 border border-slate-700 focus:border-cyan-400 rounded px-1.5 py-0.5 text-right text-xs font-mono font-bold text-cyan-300 focus:outline-none"
                    />
                    <span className="text-slate-400">{ctrl.unit}</span>
                  </div>
                </div>
                <input
                  type="range"
                  min={ctrl.min}
                  max={ctrl.max}
                  step={ctrl.step}
                  value={ctrl.val}
                  onChange={(e) => ctrl.set(Number(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>
            ))}

            <div
              className={`rounded-lg p-3 border text-xs font-mono space-y-1 ${
                zenerStats.isRegulating
                  ? "bg-emerald-950/30 border-emerald-500/40 text-emerald-300"
                  : "bg-rose-950/30 border-rose-500/40 text-rose-300"
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold">
                {zenerStats.isRegulating ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                )}
                <span>
                  {zenerStats.isRegulating
                    ? "Zener Breakdown Regulation ACTIVE"
                    : "DROPOUT: Zener Reverse-Biased Below V_Z"}
                </span>
              </div>
              <div className="text-slate-300">
                Min Load R_L(min) for Regulation ={" "}
                {zenerStats.rLMinOhm.toFixed(1)} Ω
              </div>
            </div>
          </div>

          <div className="lg:col-span-8 space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
              <div className="bg-[#111827] border border-slate-800 rounded-xl p-3.5">
                <div className="text-[11px] text-slate-400">
                  Regulated Output V_L
                </div>
                <div className="text-lg font-bold text-emerald-400 mt-0.5">
                  {zenerStats.vLoad.toFixed(2)} V
                </div>
              </div>
              <div className="bg-[#111827] border border-slate-800 rounded-xl p-3.5">
                <div className="text-[11px] text-slate-400">
                  Series Current I_S
                </div>
                <div className="text-lg font-bold text-cyan-400 mt-0.5">
                  {zenerStats.iSeries_mA.toFixed(2)} mA
                </div>
              </div>
              <div className="bg-[#111827] border border-slate-800 rounded-xl p-3.5">
                <div className="text-[11px] text-slate-400">
                  Zener Current I_Z
                </div>
                <div className="text-lg font-bold text-amber-400 mt-0.5">
                  {zenerStats.iZener_mA.toFixed(2)} mA
                </div>
              </div>
              <div className="bg-[#111827] border border-slate-800 rounded-xl p-3.5">
                <div className="text-[11px] text-slate-400">
                  Zener Power P_Z
                </div>
                <div className="text-lg font-bold text-purple-400 mt-0.5">
                  {zenerStats.pZener_mW.toFixed(1)} mW
                </div>
              </div>
            </div>

            <div className="bg-[#070A12] border border-slate-800 rounded-xl p-5">
              <div className="text-xs font-mono text-white font-semibold mb-3">
                LINE REGULATION CURVE: OUTPUT VOLTAGE V_L vs. INPUT VOLTAGE V_in
              </div>
              <svg viewBox="0 0 680 230" className="w-full h-auto block">
                <rect
                  x="55"
                  y="15"
                  width="580"
                  height="185"
                  fill="#0b1020"
                  stroke="#1e293b"
                />
                {(() => {
                  const maxV = 30;
                  let regPath = "";
                  for (let i = 0; i <= 60; i++) {
                    const vInTest = (i / 60) * maxV;
                    const vThTest =
                      vInTest * (zenerRL / (zenerRs + zenerRL));
                    const vOutTest = Math.min(vThTest, zenerVz);
                    const x = 55 + (vInTest / maxV) * 580;
                    const y = 200 - (vOutTest / 20) * 185;
                    regPath += `${i === 0 ? "M" : "L"} ${x.toFixed(1)},${y.toFixed(1)} `;
                  }
                  const curX = 55 + (zenerVin / maxV) * 580;
                  const curY = 200 - (zenerStats.vLoad / 20) * 185;
                  return (
                    <>
                      <path
                        d={regPath}
                        fill="none"
                        stroke="#22c55e"
                        strokeWidth="2.8"
                      />
                      <circle
                        cx={curX}
                        cy={curY}
                        r="6"
                        fill="#38bdf8"
                        stroke="#fff"
                        strokeWidth="2"
                      />
                    </>
                  );
                })()}
              </svg>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
