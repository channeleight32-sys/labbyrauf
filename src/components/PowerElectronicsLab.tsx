import React, { useState, useMemo, useEffect } from "react";
import { Zap, Activity, CheckCircle2, AlertTriangle } from "lucide-react";
import SeriesParallelBuilder from "./SeriesParallelBuilder";
import MasterLabWorkbench from "./MasterLabWorkbench";
import AnalogStage3D from "./AnalogStage3D";

type PowerLabTab =
  | "CUSTOM_BUILDER"
  | "DCDC_CONVERTERS"
  | "SCR_RECTIFIER"
  | "SPWM_INVERTER"
  | "MASTER_15_POWER";
type ConverterTopology = "BUCK" | "BOOST" | "BUCK_BOOST";
type RectifierType = "HALF_WAVE" | "FULL_BRIDGE";

interface PowerElectronicsLabProps {
  initialTab?: PowerLabTab;
  initialScenarioName?: string;
  initialTopology?: ConverterTopology;
  initialRectType?: RectifierType;
  syncKey?: number | string;
}

export default function PowerElectronicsLab({
  initialTab,
  initialScenarioName,
  initialTopology,
  initialRectType,
  syncKey,
}: PowerElectronicsLabProps = {}) {
  const [activeTab, setActiveTab] = useState<PowerLabTab>(initialTab || "CUSTOM_BUILDER");

  // --- Experiment 1: DC-DC Converter State ---
  const [topology, setTopology] = useState<ConverterTopology>(initialTopology || "BUCK");
  const [vin, setVin] = useState<number>(24); // V
  const [dutyPct, setDutyPct] = useState<number>(50); // %
  const [fswKhz, setFswKhz] = useState<number>(50); // kHz
  const [inductanceUh, setInductanceUh] = useState<number>(220); // uH
  const [capacitanceUf, setCapacitanceUf] = useState<number>(47); // uF
  const [loadOhm, setLoadOhm] = useState<number>(10); // Ohms

  // --- Experiment 2: SCR Phase-Controlled Rectifier State ---
  const [rectType, setRectType] = useState<RectifierType>(
    initialRectType || "FULL_BRIDGE"
  );
  const [acVrms, setAcVrms] = useState<number>(220); // V rms
  const [firingAlphaDeg, setFiringAlphaDeg] = useState<number>(45); // degrees
  const [rectLoadOhm, setRectLoadOhm] = useState<number>(25);

  // --- Experiment 3: H-Bridge SPWM Inverter State ---
  const [vdcLink, setVdcLink] = useState<number>(400); // V
  const [modIndexMa, setModIndexMa] = useState<number>(0.85); // 0.1 to 1.2
  const [carrierRatioMf, setCarrierRatioMf] = useState<number>(15); // odd multiple

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
    if (initialTopology) setTopology(initialTopology);
    if (initialRectType) setRectType(initialRectType);
  }, [initialTab, initialTopology, initialRectType, syncKey]);

  // --- DC-DC Converter Calculations ---
  const dcdcStats = useMemo(() => {
    const D = dutyPct / 100;
    const f = fswKhz * 1000;
    const L = inductanceUh * 1e-6;
    const C = capacitanceUf * 1e-6;
    const R = loadOhm;

    let vo = 0;
    let iL_avg = 0;
    let deltaIL = 0;
    let deltaVo = 0;
    let lCrit_uH = 0;

    if (topology === "BUCK") {
      vo = vin * D;
      const io = vo / R;
      iL_avg = io;
      deltaIL = ((vin - vo) * D) / (f * L);
      deltaVo = deltaIL / (8 * f * C);
      lCrit_uH = (((1 - D) * R) / (2 * f)) * 1e6;
    } else if (topology === "BOOST") {
      vo = vin / Math.max(0.08, 1 - D);
      const io = vo / R;
      iL_avg = io / Math.max(0.08, 1 - D);
      deltaIL = (vin * D) / (f * L);
      deltaVo = (io * D) / (f * C);
      lCrit_uH = ((D * (1 - D) ** 2 * R) / (2 * f)) * 1e6;
    } else {
      // Buck-Boost (magnitude)
      vo = (vin * D) / Math.max(0.08, 1 - D);
      const io = vo / R;
      iL_avg = io / Math.max(0.08, 1 - D);
      deltaIL = (vin * D) / (f * L);
      deltaVo = (io * D) / (f * C);
      lCrit_uH = (((1 - D) ** 2 * R) / (2 * f)) * 1e6;
    }

    const iL_min = iL_avg - deltaIL / 2;
    const iL_max = iL_avg + deltaIL / 2;
    const isCCM = iL_min >= 0;
    const pOut = (vo ** 2) / R;

    return {
      D,
      vo,
      iL_avg,
      deltaIL,
      deltaVo,
      iL_min,
      iL_max,
      lCrit_uH,
      isCCM,
      pOut,
    };
  }, [topology, vin, dutyPct, fswKhz, inductanceUh, capacitanceUf, loadOhm]);

  // --- SCR Phase-Controlled Rectifier Calculations ---
  const scrStats = useMemo(() => {
    const vm = acVrms * Math.SQRT2;
    const alphaRad = (firingAlphaDeg * Math.PI) / 180;

    // Resistive load formulas:
    const vdc =
      rectType === "HALF_WAVE"
        ? (vm / (2 * Math.PI)) * (1 + Math.cos(alphaRad))
        : (vm / Math.PI) * (1 + Math.cos(alphaRad));

    const vrmsOut =
      rectType === "HALF_WAVE"
        ? (vm / 2) *
          Math.sqrt(
            (1 / Math.PI) *
              (Math.PI - alphaRad + Math.sin(2 * alphaRad) / 2)
          )
        : vm *
          Math.sqrt(
            (1 / (2 * Math.PI)) *
              (Math.PI - alphaRad + Math.sin(2 * alphaRad) / 2)
          );

    const idc = vdc / rectLoadOhm;
    const formFactor = vdc > 0.01 ? vrmsOut / vdc : 1;
    const rippleFactor =
      formFactor > 1 ? Math.sqrt(formFactor ** 2 - 1) : 0;
    const displacementPF = Math.cos(alphaRad / 2);

    return {
      vm,
      alphaRad,
      vdc,
      vrmsOut,
      idc,
      formFactor,
      rippleFactor,
      displacementPF,
    };
  }, [rectType, acVrms, firingAlphaDeg, rectLoadOhm]);

  // --- SPWM Inverter Calculations ---
  const spwmStats = useMemo(() => {
    const vFundPeak =
      modIndexMa <= 1
        ? modIndexMa * vdcLink
        : (4 / Math.PI) * vdcLink * (0.785 + 0.215 * Math.min(1.2, modIndexMa));
    const vFundRms = vFundPeak / Math.SQRT2;
    const isOvermodulated = modIndexMa > 1.0;

    return {
      vFundPeak,
      vFundRms,
      isOvermodulated,
    };
  }, [vdcLink, modIndexMa]);

  return (
    <div className="space-y-6">
      {/* Lab Sub-Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#111827] border border-slate-800 rounded-xl p-3">
        <div className="flex flex-wrap items-center gap-2">
          {[
            {
              id: "CUSTOM_BUILDER" as PowerLabTab,
              label: "01. Interactive Circuit Builder (Drag & Drop)",
            },
            {
              id: "DCDC_CONVERTERS" as PowerLabTab,
              label: "02. DC-DC Converters (Buck / Boost / Buck-Boost)",
            },
            {
              id: "SCR_RECTIFIER" as PowerLabTab,
              label: "03. SCR Phase-Controlled Rectifier (α Firing Angle)",
            },
            {
              id: "SPWM_INVERTER" as PowerLabTab,
              label: "04. Single-Phase H-Bridge SPWM Inverter",
            },
            {
              id: "MASTER_15_POWER" as PowerLabTab,
              label: "05. Domain D: All 15 Power Electronics Master Labs",
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
          Power Electronics Lab
        </span>
      </div>

      {activeTab === "CUSTOM_BUILDER" && (
        <SeriesParallelBuilder
          labMode="power"
          initialScenarioName={initialScenarioName}
          scenarioSyncKey={syncKey}
        />
      )}

      {activeTab === "MASTER_15_POWER" && (
        <MasterLabWorkbench
          fixedDomain="D"
          onLaunchInteractiveBuilder={() => setActiveTab("CUSTOM_BUILDER")}
        />
      )}

      {/* EXPERIMENT 1: DC-DC SWITCHING CONVERTERS */}
      {activeTab === "DCDC_CONVERTERS" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-4 bg-[#111827] border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">
                Converter Topology &amp; PWM
              </h3>
              <div className="flex gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-[11px] font-mono">
                {(["BUCK", "BOOST", "BUCK_BOOST"] as const).map((top) => (
                  <button
                    key={top}
                    type="button"
                    onClick={() => setTopology(top)}
                    className={`px-2 py-1 rounded cursor-pointer ${
                      topology === top
                        ? "bg-cyan-500/20 text-cyan-300 font-bold"
                        : "text-slate-400"
                    }`}
                  >
                    {top.replace("_", "-")}
                  </button>
                ))}
              </div>
            </div>

            {[
              {
                label: "DC Input Voltage V_in",
                val: vin,
                set: setVin,
                min: 5,
                max: 60,
                step: 1,
                unit: "V",
              },
              {
                label: "PWM Duty Cycle D",
                val: dutyPct,
                set: setDutyPct,
                min: 5,
                max: 85,
                step: 1,
                unit: "%",
              },
              {
                label: "Switching Frequency f_sw",
                val: fswKhz,
                set: setFswKhz,
                min: 10,
                max: 200,
                step: 5,
                unit: "kHz",
              },
              {
                label: "Inductance L",
                val: inductanceUh,
                set: setInductanceUh,
                min: 20,
                max: 1000,
                step: 10,
                unit: "μH",
              },
              {
                label: "Output Filter Capacitor C",
                val: capacitanceUf,
                set: setCapacitanceUf,
                min: 10,
                max: 470,
                step: 5,
                unit: "μF",
              },
              {
                label: "Load Resistance R_Load",
                val: loadOhm,
                set: setLoadOhm,
                min: 2,
                max: 100,
                step: 1,
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
                        if (isFinite(v) && v >= 0) ctrl.set(v);
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
                dcdcStats.isCCM
                  ? "bg-emerald-950/30 border-emerald-500/40 text-emerald-300"
                  : "bg-amber-950/30 border-amber-500/40 text-amber-300"
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold">
                {dcdcStats.isCCM ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                )}
                <span>
                  {dcdcStats.isCCM
                    ? "Continuous Conduction Mode (CCM)"
                    : "Discontinuous Conduction Mode (DCM)"}
                </span>
              </div>
              <div className="text-slate-300">
                Critical Inductance L_crit ={" "}
                {dcdcStats.lCrit_uH.toFixed(1)} μH · I_L(min) ={" "}
                {dcdcStats.iL_min.toFixed(2)} A
              </div>
            </div>
          </div>

          <div className="lg:col-span-8 space-y-5">
            <AnalogStage3D
              mode="DCDC"
              title={`${topology} PWM`}
              topologyTag={topology}
              vin={vin}
              vout={dcdcStats.vo}
              currentMa={dcdcStats.iL_avg * 1000}
              dutyRatio={dutyPct / 100}
              lVal={inductanceUh}
              cVal={capacitanceUf}
              rVal={loadOhm}
              isResonant={dcdcStats.isCCM}
              regionLabel={`${dcdcStats.isCCM ? "CCM" : "DCM"} · D=${dutyPct}% · P=${dcdcStats.pOut.toFixed(1)}W`}
              onInteractiveStep={() => setDutyPct((d) => (d >= 80 ? 25 : d + 15))}
            />
            {/* Dynamic 2D IEEE Power Converter Schematic */}
            <div className="bg-[#070A12] border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2">
                <span className="text-white font-bold">LIVE CONVERTER TOPOLOGY SCHEMATIC ({topology})</span>
                <span className="text-cyan-400">
                  Vin={vin}V → Vo={topology === "BUCK_BOOST" ? "-" : ""}{dcdcStats.vo.toFixed(2)}V · L={inductanceUh}µH · C={capacitanceUf}µF · RL={loadOhm}Ω
                </span>
              </div>
              <svg viewBox="0 0 640 155" className="w-full h-auto block font-mono">
                <rect x="0" y="0" width="640" height="155" fill="#0b1020" rx="6" />
                <circle cx="52" cy="82" r="16" fill="#0f172a" stroke="#ef4444" strokeWidth="2" />
                <text x="52" y="86" fill="#fca5a5" fontSize="10" textAnchor="middle" fontWeight="700">{vin}V</text>
                <line x1="52" y1="66" x2="52" y2="36" stroke="#ef4444" strokeWidth="2" />
                <line x1="52" y1="98" x2="52" y2="128" stroke="#64748b" strokeWidth="2" />
                <line x1="52" y1="128" x2="585" y2="128" stroke="#64748b" strokeWidth="2" />

                {topology === "BUCK" && (
                  <>
                    <line x1="52" y1="36" x2="120" y2="36" stroke="#38bdf8" strokeWidth="2" />
                    <rect x="120" y="22" width="68" height="28" rx="4" fill="#0f172a" stroke="#22d3ee" strokeWidth="2" />
                    <text x="154" y="40" fill="#22d3ee" fontSize="10" textAnchor="middle" fontWeight="700">Q1 PWM {dutyPct}%</text>
                    <line x1="188" y1="36" x2="290" y2="36" stroke="#38bdf8" strokeWidth="2" />
                    <polygon points="224,78 238,78 231,64" fill="#f59e0b" />
                    <line x1="224" y1="64" x2="238" y2="64" stroke="#f59e0b" strokeWidth="2" />
                    <line x1="231" y1="36" x2="231" y2="128" stroke="#f59e0b" strokeWidth="1.6" strokeDasharray="3 2" />
                    <text x="244" y="75" fill="#f59e0b" fontSize="9">D1</text>
                    <path d="M 290 36 A 8 8 0 0 1 306 36 A 8 8 0 0 1 322 36 A 8 8 0 0 1 338 36 A 8 8 0 0 1 354 36" fill="none" stroke="#a855f7" strokeWidth="2.4" />
                    <text x="322" y="20" fill="#d8b4fe" fontSize="9.5" textAnchor="middle">L={inductanceUh}µH</text>
                    <line x1="354" y1="36" x2="545" y2="36" stroke="#38bdf8" strokeWidth="2" />
                  </>
                )}
                {topology === "BOOST" && (
                  <>
                    <line x1="52" y1="36" x2="115" y2="36" stroke="#38bdf8" strokeWidth="2" />
                    <path d="M 115 36 A 8 8 0 0 1 131 36 A 8 8 0 0 1 147 36 A 8 8 0 0 1 163 36 A 8 8 0 0 1 179 36" fill="none" stroke="#a855f7" strokeWidth="2.4" />
                    <text x="147" y="20" fill="#d8b4fe" fontSize="9.5" textAnchor="middle">L={inductanceUh}µH</text>
                    <line x1="179" y1="36" x2="295" y2="36" stroke="#38bdf8" strokeWidth="2" />
                    <line x1="232" y1="36" x2="232" y2="128" stroke="#22d3ee" strokeWidth="2" />
                    <rect x="200" y="66" width="64" height="28" rx="4" fill="#0f172a" stroke="#22d3ee" strokeWidth="2" />
                    <text x="232" y="84" fill="#22d3ee" fontSize="9.5" textAnchor="middle" fontWeight="700">Q1 {dutyPct}%</text>
                    <polygon points="300,26 300,46 318,36" fill="#f59e0b" />
                    <line x1="318" y1="26" x2="318" y2="46" stroke="#f59e0b" strokeWidth="2.4" />
                    <text x="309" y="20" fill="#f59e0b" fontSize="9" textAnchor="middle">D1</text>
                    <line x1="318" y1="36" x2="545" y2="36" stroke="#38bdf8" strokeWidth="2" />
                  </>
                )}
                {topology === "BUCK_BOOST" && (
                  <>
                    <line x1="52" y1="36" x2="115" y2="36" stroke="#38bdf8" strokeWidth="2" />
                    <rect x="115" y="22" width="66" height="28" rx="4" fill="#0f172a" stroke="#22d3ee" strokeWidth="2" />
                    <text x="148" y="40" fill="#22d3ee" fontSize="9.5" textAnchor="middle" fontWeight="700">Q1 {dutyPct}%</text>
                    <line x1="181" y1="36" x2="305" y2="36" stroke="#38bdf8" strokeWidth="2" />
                    <path d="M 225 56 A 6 6 0 0 1 225 68 A 6 6 0 0 1 225 80 A 6 6 0 0 1 225 92 A 6 6 0 0 1 225 104" fill="none" stroke="#a855f7" strokeWidth="2.4" />
                    <line x1="225" y1="36" x2="225" y2="56" stroke="#a855f7" strokeWidth="2" />
                    <line x1="225" y1="104" x2="225" y2="128" stroke="#a855f7" strokeWidth="2" />
                    <text x="240" y="82" fill="#d8b4fe" fontSize="9">L={inductanceUh}µH</text>
                    <polygon points="325,26 325,46 305,36" fill="#f59e0b" />
                    <line x1="305" y1="26" x2="305" y2="46" stroke="#f59e0b" strokeWidth="2.4" />
                    <text x="315" y="20" fill="#f59e0b" fontSize="9" textAnchor="middle">D1 (Inv)</text>
                    <line x1="325" y1="36" x2="545" y2="36" stroke="#38bdf8" strokeWidth="2" />
                  </>
                )}
                {/* Shunt C & RL Load */}
                <line x1="430" y1="36" x2="430" y2="74" stroke="#38bdf8" strokeWidth="2" />
                <line x1="416" y1="74" x2="444" y2="74" stroke="#22d3ee" strokeWidth="2.6" />
                <line x1="416" y1="84" x2="444" y2="84" stroke="#22d3ee" strokeWidth="2.6" />
                <line x1="430" y1="84" x2="430" y2="128" stroke="#64748b" strokeWidth="2" />
                <text x="450" y="83" fill="#22d3ee" fontSize="9.5">{capacitanceUf}µF</text>

                <line x1="545" y1="36" x2="545" y2="62" stroke="#38bdf8" strokeWidth="2" />
                <rect x="533" y="62" width="24" height="40" rx="3" fill="#0f172a" stroke="#10b981" strokeWidth="2" />
                <line x1="545" y1="102" x2="545" y2="128" stroke="#64748b" strokeWidth="2" />
                <text x="564" y="85" fill="#34d399" fontSize="9.5" fontWeight="700">RL {loadOhm}Ω</text>
              </svg>
            </div>
            {/* Telemetry Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
              <div className="bg-[#111827] border border-slate-800 rounded-xl p-3.5">
                <div className="text-[11px] text-slate-400">
                  Output Voltage V_o
                </div>
                <div className="text-lg font-bold text-emerald-400 mt-0.5">
                  {topology === "BUCK_BOOST" ? "−" : ""}
                  {dcdcStats.vo.toFixed(2)} V
                </div>
              </div>
              <div className="bg-[#111827] border border-slate-800 rounded-xl p-3.5">
                <div className="text-[11px] text-slate-400">
                  Avg Inductor Current I_L
                </div>
                <div className="text-lg font-bold text-cyan-400 mt-0.5">
                  {dcdcStats.iL_avg.toFixed(2)} A
                </div>
              </div>
              <div className="bg-[#111827] border border-slate-800 rounded-xl p-3.5">
                <div className="text-[11px] text-slate-400">
                  Inductor Ripple ΔI_L
                </div>
                <div className="text-lg font-bold text-amber-400 mt-0.5">
                  {dcdcStats.deltaIL.toFixed(2)} A_pp
                </div>
              </div>
              <div className="bg-[#111827] border border-slate-800 rounded-xl p-3.5">
                <div className="text-[11px] text-slate-400">
                  Voltage Ripple ΔV_o
                </div>
                <div className="text-lg font-bold text-purple-400 mt-0.5">
                  {(dcdcStats.deltaVo * 1000).toFixed(1)} mV_pp
                </div>
              </div>
            </div>

            {/* PWM Gate Drive & Inductor Current Waveform Oscilloscope */}
            <div className="bg-[#070A12] border border-slate-800 rounded-xl p-5">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3 text-xs font-mono">
                <span className="text-white font-semibold inline-flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  SWITCHING WAVEFORMS (3 CYCLES): V_PWM(t) &amp; INDUCTOR CURRENT
                  i_L(t)
                </span>
                <span className="text-cyan-400">
                  Gain M(D) ={" "}
                  {topology === "BUCK"
                    ? "D"
                    : topology === "BOOST"
                    ? "1 / (1 − D)"
                    : "−D / (1 − D)"}{" "}
                  · P_out = {dcdcStats.pOut.toFixed(1)} W
                </span>
              </div>

              <svg viewBox="0 0 680 250" className="w-full h-auto block">
                {/* Top Track: PWM Gate Signal */}
                <rect
                  x="60"
                  y="15"
                  width="590"
                  height="75"
                  fill="#0b1020"
                  stroke="#1e293b"
                />
                <text
                  x="12"
                  y="55"
                  fill="#38bdf8"
                  fontSize="11"
                  fontFamily="JetBrains Mono"
                  fontWeight="700"
                >
                  V_GS
                </text>

                {/* Bottom Track: Inductor Current i_L(t) */}
                <rect
                  x="60"
                  y="110"
                  width="590"
                  height="115"
                  fill="#0b1020"
                  stroke="#1e293b"
                />
                <text
                  x="12"
                  y="168"
                  fill="#22c55e"
                  fontSize="11"
                  fontFamily="JetBrains Mono"
                  fontWeight="700"
                >
                  i_L(t)
                </text>

                {(() => {
                  const cycles = 3;
                  const cycleW = 590 / cycles;
                  const dFrac = dutyPct / 100;
                  let pwmPath = "";
                  let ilPath = "";

                  for (let c = 0; c < cycles; c++) {
                    const xStart = 60 + c * cycleW;
                    const xSwitch = xStart + dFrac * cycleW;
                    const xEnd = xStart + cycleW;

                    // PWM pulse
                    pwmPath += `${
                      c === 0 ? "M" : "L"
                    } ${xStart},80 L ${xStart},25 L ${xSwitch},25 L ${xSwitch},80 L ${xEnd},80 `;

                    // Inductor current triangle
                    const yMin = dcdcStats.isCCM ? 205 : 220;
                    const yPeak = 128;
                    const xZeroEnd = dcdcStats.isCCM
                      ? xEnd
                      : xSwitch + (1 - dFrac) * 0.72 * cycleW;

                    if (c === 0) {
                      ilPath += `M ${xStart},${yMin} `;
                    }
                    ilPath += `L ${xSwitch},${yPeak} L ${xZeroEnd},${yMin} L ${xEnd},${yMin} `;
                  }

                  return (
                    <>
                      <path
                        d={pwmPath}
                        fill="none"
                        stroke="#38bdf8"
                        strokeWidth="2.4"
                      />
                      {/* Average current dashed line */}
                      <line
                        x1="60"
                        y1="166"
                        x2="650"
                        y2="166"
                        stroke="#f59e0b"
                        strokeDasharray="4 4"
                      />
                      <text
                        x="644"
                        y="160"
                        textAnchor="end"
                        fill="#f59e0b"
                        fontSize="10"
                        fontFamily="JetBrains Mono"
                      >
                        I_L(avg) = {dcdcStats.iL_avg.toFixed(2)}A
                      </text>
                      <path
                        d={ilPath}
                        fill="none"
                        stroke="#22c55e"
                        strokeWidth="2.6"
                      />
                    </>
                  );
                })()}
              </svg>
            </div>
          </div>
        </div>
      )}

      {/* EXPERIMENT 2: SCR PHASE-CONTROLLED RECTIFIER */}
      {activeTab === "SCR_RECTIFIER" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-4 bg-[#111827] border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">
                Thyristor (SCR) Gate Control
              </h3>
              <div className="flex gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-[11px] font-mono">
                {(
                  [
                    { id: "HALF_WAVE", label: "Half-Wave" },
                    { id: "FULL_BRIDGE", label: "Full-Bridge" },
                  ] as const
                ).map((rt) => (
                  <button
                    key={rt.id}
                    type="button"
                    onClick={() => setRectType(rt.id)}
                    className={`px-2 py-1 rounded cursor-pointer ${
                      rectType === rt.id
                        ? "bg-cyan-500/20 text-cyan-300 font-bold"
                        : "text-slate-400"
                    }`}
                  >
                    {rt.label}
                  </button>
                ))}
              </div>
            </div>

            {[
              {
                label: "AC Source RMS Voltage V_rms",
                val: acVrms,
                set: setAcVrms,
                min: 24,
                max: 240,
                step: 2,
                unit: "V",
              },
              {
                label: "SCR Firing Delay Angle α",
                val: firingAlphaDeg,
                set: setFiringAlphaDeg,
                min: 0,
                max: 165,
                step: 5,
                unit: "°",
              },
              {
                label: "Load Resistance R_Load",
                val: rectLoadOhm,
                set: setRectLoadOhm,
                min: 5,
                max: 200,
                step: 5,
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
                        if (isFinite(v) && v >= 0) ctrl.set(v);
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
                <span className="text-slate-400">Peak AC Voltage V_m:</span>
                <span className="text-white font-bold">
                  {scrStats.vm.toFixed(1)} V
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Average DC Output V_dc:</span>
                <span className="text-emerald-400 font-bold">
                  {scrStats.vdc.toFixed(2)} V
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">RMS Output Voltage V_rms:</span>
                <span className="text-cyan-300 font-bold">
                  {scrStats.vrmsOut.toFixed(2)} V
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Ripple Factor (RF):</span>
                <span className="text-amber-300 font-bold">
                  {(scrStats.rippleFactor * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Displacement PF:</span>
                <span className="text-purple-300 font-bold">
                  {scrStats.displacementPF.toFixed(3)} lag
                </span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-8 space-y-5">
            <AnalogStage3D
              mode="SCR"
              title={`SCR ${rectType}`}
              topologyTag={rectType}
              vin={acVrms}
              vout={scrStats.vdc}
              currentMa={scrStats.idc * 1000}
              dutyRatio={1 - firingAlphaDeg / 180}
              firingAlphaDeg={firingAlphaDeg}
              rVal={rectLoadOhm}
              regionLabel={`alpha=${firingAlphaDeg}deg · Vdc=${scrStats.vdc.toFixed(1)}V`}
              onInteractiveStep={() => setFiringAlphaDeg((a) => (a >= 150 ? 15 : a + 30))}
            />
            <div className="bg-[#070A12] border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3 text-xs font-mono">
              <span className="text-white font-semibold">
                THYRISTOR PHASE-CONTROLLED OUTPUT v_o(ωt) AT FIRING ANGLE α ={" "}
                {firingAlphaDeg}°
              </span>
              <span className="text-emerald-400">
                V_dc = {scrStats.vdc.toFixed(1)} V · I_dc ={" "}
                {scrStats.idc.toFixed(2)} A
              </span>
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
                // Plot 2 full AC cycles (0 to 4*pi)
                const totalRad = 4 * Math.PI;
                let acPath = "";
                let outPath = "";
                const alphaRad = (firingAlphaDeg * Math.PI) / 180;

                for (let i = 0; i <= 240; i++) {
                  const theta = (i / 240) * totalRad;
                  const x = 50 + (i / 240) * 600;
                  const sinVal = Math.sin(theta);
                  const yAc = 125 - sinVal * 90;
                  acPath += `${i === 0 ? "M" : "L"} ${x.toFixed(1)},${yAc.toFixed(1)} `;

                  const angleInCycle = theta % (2 * Math.PI);
                  let vNorm = 0;
                  if (
                    angleInCycle >= alphaRad &&
                    angleInCycle <= Math.PI
                  ) {
                    vNorm = Math.sin(angleInCycle);
                  } else if (
                    rectType === "FULL_BRIDGE" &&
                    angleInCycle >= Math.PI + alphaRad &&
                    angleInCycle <= 2 * Math.PI
                  ) {
                    vNorm = Math.abs(Math.sin(angleInCycle));
                  }
                  const yOut = 125 - vNorm * 90;
                  outPath += `${i === 0 ? "M" : "L"} ${x.toFixed(1)},${yOut.toFixed(1)} `;
                }

                const yVdc = 125 - (scrStats.vdc / scrStats.vm) * 90;

                return (
                  <>
                    <path
                      d={acPath}
                      fill="none"
                      stroke="#475569"
                      strokeWidth="1.6"
                      strokeDasharray="4 4"
                    />
                    <path
                      d={outPath}
                      fill="none"
                      stroke="#22c55e"
                      strokeWidth="2.6"
                    />
                    <line
                      x1="50"
                      y1={yVdc}
                      x2="650"
                      y2={yVdc}
                      stroke="#38bdf8"
                      strokeWidth="1.8"
                      strokeDasharray="6 4"
                    />
                    <text
                      x="644"
                      y={yVdc - 6}
                      textAnchor="end"
                      fill="#38bdf8"
                      fontSize="10.5"
                      fontFamily="JetBrains Mono"
                      fontWeight="700"
                    >
                      V_dc = {scrStats.vdc.toFixed(1)} V
                    </text>
                  </>
                );
              })()}
            </svg>
            </div>
          </div>
        </div>
      )}

      {/* EXPERIMENT 3: SINGLE-PHASE H-BRIDGE SPWM INVERTER */}
      {activeTab === "SPWM_INVERTER" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-4 bg-[#111827] border border-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white">
              Sinusoidal PWM (SPWM) Modulator
            </h3>

            {[
              {
                label: "DC Bus Voltage V_dc",
                val: vdcLink,
                set: setVdcLink,
                min: 48,
                max: 800,
                step: 10,
                unit: "V",
              },
              {
                label: "Amplitude Modulation Index m_a",
                val: modIndexMa,
                set: setModIndexMa,
                min: 0.2,
                max: 1.2,
                step: 0.05,
                unit: "",
              },
              {
                label: "Carrier Frequency Ratio m_f",
                val: carrierRatioMf,
                set: setCarrierRatioMf,
                min: 9,
                max: 27,
                step: 2,
                unit: "×f₁",
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
                        if (isFinite(v) && v >= 0) ctrl.set(v);
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
                <span className="text-slate-400">Modulation Regime:</span>
                <span
                  className={
                    spwmStats.isOvermodulated
                      ? "text-amber-400 font-bold"
                      : "text-emerald-400 font-bold"
                  }
                >
                  {spwmStats.isOvermodulated
                    ? "Overmodulation (m_a > 1)"
                    : "Linear SPWM (m_a ≤ 1)"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Fundamental Peak V_o1(pk):</span>
                <span className="text-cyan-300 font-bold">
                  {spwmStats.vFundPeak.toFixed(1)} V
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Fundamental RMS V_o1(rms):</span>
                <span className="text-emerald-400 font-bold">
                  {spwmStats.vFundRms.toFixed(1)} V
                </span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-8 space-y-5">
            <AnalogStage3D
              mode="INVERTER"
              title="H-Bridge SPWM"
              topologyTag="H_BRIDGE_SPWM"
              vin={vdcLink}
              vout={spwmStats.vFundRms}
              currentMa={(spwmStats.vFundRms / 15) * 1000}
              dutyRatio={Math.min(1, modIndexMa)}
              isClipped={spwmStats.isOvermodulated}
              regionLabel={spwmStats.isOvermodulated ? "OVERMODULATION" : `SPWM ma=${modIndexMa.toFixed(2)}`}
              onInteractiveStep={() => setModIndexMa((m) => (m >= 1.1 ? 0.5 : Number((m + 0.15).toFixed(2))))}
            />
            <div className="bg-[#070A12] border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3 text-xs font-mono">
              <span className="text-white font-semibold inline-flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-cyan-400" />
                CARRIER COMPARISON &amp; UNIPOLAR H-BRIDGE SPWM OUTPUT
              </span>
              <span className="text-cyan-400">
                V_o1(rms) = {spwmStats.vFundRms.toFixed(1)} V
              </span>
            </div>

            <svg viewBox="0 0 680 260" className="w-full h-auto block">
              {/* Top: Sine Ref vs Triangle Carrier */}
              <rect
                x="50"
                y="15"
                width="600"
                height="95"
                fill="#0b1020"
                stroke="#1e293b"
              />
              {/* Bottom: PWM Output Pulses */}
              <rect
                x="50"
                y="130"
                width="600"
                height="110"
                fill="#0b1020"
                stroke="#1e293b"
              />
              <line
                x1="50"
                y1="185"
                x2="650"
                y2="185"
                stroke="#334155"
                strokeWidth="1"
              />

              {(() => {
                let sinePath = "";
                let triPath = "";
                let pwmPath = "";
                let fundOutPath = "";
                const N = 360;

                for (let i = 0; i <= N; i++) {
                  const frac = i / N;
                  const theta = frac * 2 * Math.PI;
                  const x = 50 + frac * 600;

                  const vRef = modIndexMa * Math.sin(theta);
                  // Triangle wave in [-1, 1] with frequency carrierRatioMf
                  const p = (frac * carrierRatioMf) % 1;
                  const vTri =
                    p < 0.25
                      ? 4 * p
                      : p < 0.75
                      ? 2 - 4 * p
                      : -4 + 4 * p;

                  const ySine = 62.5 - vRef * 36;
                  const yTri = 62.5 - vTri * 36;
                  sinePath += `${i === 0 ? "M" : "L"} ${x.toFixed(1)},${ySine.toFixed(1)} `;
                  triPath += `${i === 0 ? "M" : "L"} ${x.toFixed(1)},${yTri.toFixed(1)} `;

                  // Unipolar SPWM level (+1, 0, -1)
                  let level = 0;
                  if (theta <= Math.PI) {
                    level = Math.abs(vRef) > (vTri + 1) / 2 ? 1 : 0;
                  } else {
                    level = Math.abs(vRef) > (vTri + 1) / 2 ? -1 : 0;
                  }
                  const yPwm = 185 - level * 42;
                  const yFund = 185 - Math.min(1.15, modIndexMa) * Math.sin(theta) * 42;
                  pwmPath += `${i === 0 ? "M" : "L"} ${x.toFixed(1)},${yPwm.toFixed(1)} `;
                  fundOutPath += `${i === 0 ? "M" : "L"} ${x.toFixed(1)},${yFund.toFixed(1)} `;
                }

                return (
                  <>
                    <path
                      d={triPath}
                      fill="none"
                      stroke="#475569"
                      strokeWidth="1.2"
                    />
                    <path
                      d={sinePath}
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth="2.4"
                    />
                    <path
                      d={pwmPath}
                      fill="none"
                      stroke="#22c55e"
                      strokeWidth="1.6"
                    />
                    <path
                      d={fundOutPath}
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="2.2"
                      strokeDasharray="5 3"
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
