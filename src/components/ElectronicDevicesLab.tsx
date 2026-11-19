import React, { useState, useMemo, useEffect } from "react";
import { Activity, CheckCircle2, AlertTriangle } from "lucide-react";
import SeriesParallelBuilder from "./SeriesParallelBuilder";
import MasterLabWorkbench from "./MasterLabWorkbench";
import AnalogStage3D from "./AnalogStage3D";

type EDCTab =
  | "CUSTOM_BUILDER"
  | "BJT_CE_AMP"
  | "MOSFET_CS_AMP"
  | "OPAMP_LAB"
  | "MASTER_15_EDC"
  | "MASTER_15_LIC";
type OpAmpMode = "INVERTING" | "NON_INVERTING" | "DIFFERENTIAL";

interface ElectronicDevicesLabProps {
  initialTab?: EDCTab;
  initialScenarioName?: string;
  initialOpMode?: OpAmpMode;
  syncKey?: number | string;
}

export default function ElectronicDevicesLab({
  initialTab,
  initialScenarioName,
  initialOpMode,
  syncKey,
}: ElectronicDevicesLabProps = {}) {
  const [activeTab, setActiveTab] = useState<EDCTab>(initialTab || "CUSTOM_BUILDER");

  // --- Exp 1: BJT Common-Emitter Amplifier State ---
  const [vcc, setVcc] = useState<number>(12); // V
  const [r1K, setR1K] = useState<number>(33); // kOhm
  const [r2K, setR2K] = useState<number>(10); // kOhm
  const [rcK, setRcK] = useState<number>(2.2); // kOhm
  const [reK, setReK] = useState<number>(1.0); // kOhm
  const [betaDC, setBetaDC] = useState<number>(150);
  const [bypassCe, setBypassCe] = useState<boolean>(true);
  const [vinMv, setVinMv] = useState<number>(15); // mV peak

  // --- Exp 2: MOSFET Common-Source State ---
  const [vdd, setVdd] = useState<number>(12); // V
  const [vgs, setVgs] = useState<number>(3.2); // V
  const [vth, setVth] = useState<number>(1.5); // V
  const [knMaV2, setKnMaV2] = useState<number>(2.0); // mA/V^2
  const [rdK, setRdK] = useState<number>(2.0); // kOhm

  // --- Exp 3: Operational Amplifier State ---
  const [opMode, setOpMode] = useState<OpAmpMode>(initialOpMode || "INVERTING");
  const [rinK, setRinK] = useState<number>(10); // kOhm
  const [rfK, setRfK] = useState<number>(47); // kOhm
  const [opVinPeak, setOpVinPeak] = useState<number>(1.5); // V
  const [opVref2, setOpVref2] = useState<number>(0.5); // V (for differential)
  const [vSupplyRail, setVSupplyRail] = useState<number>(15); // +/- V

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
    if (initialOpMode) setOpMode(initialOpMode);
  }, [initialTab, initialOpMode, syncKey]);

  // --- Exp 1 BJT CE Bias & Small-Signal Hybrid-pi Solver ---
  const bjtStats = useMemo(() => {
    const r1 = r1K * 1000;
    const r2 = r2K * 1000;
    const rc = rcK * 1000;
    const re = reK * 1000;

    // Thevenin base equivalent
    const vbb = vcc * (r2 / (r1 + r2));
    const rbb = (r1 * r2) / (r1 + r2);
    const vbe = 0.7;

    let ib_uA = 0;
    let icQ_mA = 0;
    let vceQ = vcc;
    let region: "CUTOFF" | "ACTIVE" | "SATURATION" = "ACTIVE";

    if (vbb <= vbe) {
      region = "CUTOFF";
    } else {
      const ib = (vbb - vbe) / (rbb + (betaDC + 1) * re);
      ib_uA = ib * 1e6;
      const icIdeal = betaDC * ib;
      const icSat = (vcc - 0.2) / (rc + re);
      if (icIdeal >= icSat) {
        region = "SATURATION";
        icQ_mA = icSat * 1000;
        vceQ = 0.2;
      } else {
        region = "ACTIVE";
        icQ_mA = icIdeal * 1000;
        vceQ = vcc - icIdeal * (rc + re);
      }
    }

    const icSatLoadLine_mA = (vcc / (rc + re)) * 1000;
    // Small-signal Hybrid-pi parameters at VT = 26 mV
    const vt = 0.026;
    const gm_mS = region === "ACTIVE" ? icQ_mA / (vt * 1000) * 1000 : 0; // mA/V = mS
    const reSmallOhm = gm_mS > 0 ? 1000 / gm_mS : 9999;
    const rPiKOhm = gm_mS > 0 ? betaDC / gm_mS : 999;

    const av =
      region !== "ACTIVE"
        ? 0
        : bypassCe
        ? -rc / reSmallOhm
        : -rc / (reSmallOhm + re);

    const avDb = Math.abs(av) > 0.01 ? 20 * Math.log10(Math.abs(av)) : -40;
    const voutPeakV = Math.abs(av) * (vinMv / 1000);

    return {
      vbb,
      rbbK: rbb / 1000,
      ib_uA,
      icQ_mA,
      vceQ,
      icSatLoadLine_mA,
      region,
      gm_mS,
      rPiKOhm,
      av,
      avDb,
      voutPeakV,
    };
  }, [vcc, r1K, r2K, rcK, reK, betaDC, bypassCe, vinMv]);

  // --- Exp 2 MOSFET CS Bias & Characteristic Solver ---
  const mosfetStats = useMemo(() => {
    const vov = vgs - vth;
    let region: "CUTOFF" | "SATURATION" | "TRIODE (OHMIC)" = "SATURATION";
    let id_mA = 0;
    let vds = vdd;

    if (vov <= 0) {
      region = "CUTOFF";
      id_mA = 0;
      vds = vdd;
    } else {
      // Assume saturation first: ID = 0.5 * kn * Vov^2
      const idSat = 0.5 * knMaV2 * vov ** 2;
      const vdsSat = vdd - idSat * rdK;
      if (vdsSat >= vov) {
        region = "SATURATION";
        id_mA = idSat;
        vds = vdsSat;
      } else {
        region = "TRIODE (OHMIC)";
        // Solve quadratic in triode: ID = kn * [Vov*VDS - 0.5*VDS^2] and VDS = VDD - ID*RD
        // Approximate along load line in triode
        const idMax = vdd / rdK;
        id_mA = Math.min(idMax * 0.92, idSat);
        vds = Math.max(0.15, vdd - id_mA * rdK);
      }
    }

    const gm_mS = region === "SATURATION" ? knMaV2 * Math.max(0, vov) : 0;
    const av = -gm_mS * rdK;

    return {
      vov,
      region,
      id_mA,
      vds,
      gm_mS,
      av,
      idMaxLoad_mA: vdd / rdK,
    };
  }, [vdd, vgs, vth, knMaV2, rdK]);

  // --- Exp 3 Op-Amp Solver ---
  const opAmpStats = useMemo(() => {
    let closedLoopGain = 1;
    if (opMode === "INVERTING") {
      closedLoopGain = -(rfK / rinK);
    } else if (opMode === "NON_INVERTING") {
      closedLoopGain = 1 + rfK / rinK;
    } else {
      closedLoopGain = rfK / rinK;
    }

    const idealPeakOut =
      opMode === "DIFFERENTIAL"
        ? closedLoopGain * (opVinPeak - opVref2)
        : closedLoopGain * opVinPeak;

    const vSat = vSupplyRail - 1.2; // Practical rail saturation
    const isClipped = Math.abs(idealPeakOut) > vSat;
    const actualPeakOut = Math.max(
      -vSat,
      Math.min(vSat, idealPeakOut)
    );
    // Gain-Bandwidth Product (1 MHz for 741)
    const bandwidthKhz = 1000 / Math.max(1, Math.abs(closedLoopGain));

    return {
      closedLoopGain,
      idealPeakOut,
      actualPeakOut,
      vSat,
      isClipped,
      bandwidthKhz,
    };
  }, [opMode, rinK, rfK, opVinPeak, opVref2, vSupplyRail]);

  return (
    <div className="space-y-6">
      {/* Sub-Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#111827] border border-slate-800 rounded-xl p-3">
        <div className="flex flex-wrap items-center gap-2">
          {[
            {
              id: "CUSTOM_BUILDER" as EDCTab,
              label: "01. Interactive Circuit Builder (Drag & Drop)",
            },
            {
              id: "BJT_CE_AMP" as EDCTab,
              label: "02. BJT Common-Emitter Bias & Small-Signal Amp",
            },
            {
              id: "MOSFET_CS_AMP" as EDCTab,
              label: "03. MOSFET Common-Source & I_D–V_DS Curves",
            },
            {
              id: "OPAMP_LAB" as EDCTab,
              label: "04. Operational Amplifier (741) Active Circuits",
            },
            {
              id: "MASTER_15_EDC" as EDCTab,
              label: "05. Domain E: All 15 EDC Master Labs",
            },
            {
              id: "MASTER_15_LIC" as EDCTab,
              label: "06. Domain B: All 15 Linear IC Master Labs",
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
          Electronic Devices &amp; Circuits (EDC) Lab
        </span>
      </div>

      {activeTab === "CUSTOM_BUILDER" && (
        <SeriesParallelBuilder
          labMode="edc"
          initialScenarioName={initialScenarioName}
          scenarioSyncKey={syncKey}
        />
      )}

      {activeTab === "MASTER_15_EDC" && (
        <MasterLabWorkbench
          fixedDomain="E"
          onLaunchInteractiveBuilder={() => setActiveTab("CUSTOM_BUILDER")}
        />
      )}

      {activeTab === "MASTER_15_LIC" && (
        <MasterLabWorkbench
          fixedDomain="B"
          onLaunchInteractiveBuilder={() => setActiveTab("CUSTOM_BUILDER")}
        />
      )}

      {/* EXP 1: BJT COMMON-EMITTER AMPLIFIER */}
      {activeTab === "BJT_CE_AMP" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-4 bg-[#111827] border border-slate-800 rounded-xl p-5 space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">
                2N3904 Voltage-Divider CE Stage
              </h3>
              <button
                type="button"
                onClick={() => setBypassCe((v) => !v)}
                className={`px-2.5 py-1 rounded text-xs font-mono border cursor-pointer ${
                  bypassCe
                    ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300 font-bold"
                    : "bg-slate-900 border-slate-800 text-slate-400"
                }`}
              >
                {bypassCe ? "C_E Bypass: ON" : "C_E Bypass: OFF"}
              </button>
            </div>

            {[
              {
                label: "Collector Supply V_CC",
                val: vcc,
                set: setVcc,
                min: 5,
                max: 24,
                step: 1,
                unit: "V",
              },
              {
                label: "Upper Bias R1",
                val: r1K,
                set: setR1K,
                min: 5,
                max: 100,
                step: 1,
                unit: "kΩ",
              },
              {
                label: "Lower Bias R2",
                val: r2K,
                set: setR2K,
                min: 2,
                max: 50,
                step: 1,
                unit: "kΩ",
              },
              {
                label: "Collector Resistor R_C",
                val: rcK,
                set: setRcK,
                min: 0.5,
                max: 10,
                step: 0.1,
                unit: "kΩ",
              },
              {
                label: "Emitter Resistor R_E",
                val: reK,
                set: setReK,
                min: 0.2,
                max: 5,
                step: 0.1,
                unit: "kΩ",
              },
              {
                label: "Current Gain β_DC (h_FE)",
                val: betaDC,
                set: setBetaDC,
                min: 50,
                max: 300,
                step: 10,
                unit: "",
              },
              {
                label: "AC Input Signal v_in(pk)",
                val: vinMv,
                set: setVinMv,
                min: 2,
                max: 100,
                step: 2,
                unit: "mV",
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
          </div>

          <div className="lg:col-span-8 space-y-5">
            <AnalogStage3D
              mode="BJT"
              title="2N3904 CE Amp"
              topologyTag={bypassCe ? "CE_BYPASSED" : "CE_UNBYPASSED"}
              vin={vcc}
              vout={bjtStats.vceQ}
              currentMa={bjtStats.icQ_mA}
              rVal={rcK * 1000}
              isClipped={bjtStats.region === "SATURATION"}
              regionLabel={`${bjtStats.region} · Av=${bjtStats.av.toFixed(1)}`}
              onInteractiveStep={() => setBypassCe((v) => !v)}
            />
            {/* Telemetry Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
              <div className="bg-[#111827] border border-slate-800 rounded-xl p-3.5">
                <div className="text-[11px] text-slate-400">
                  Operating Region
                </div>
                <div
                  className={`text-base font-bold mt-0.5 ${
                    bjtStats.region === "ACTIVE"
                      ? "text-emerald-400"
                      : "text-amber-400"
                  }`}
                >
                  {bjtStats.region}
                </div>
              </div>
              <div className="bg-[#111827] border border-slate-800 rounded-xl p-3.5">
                <div className="text-[11px] text-slate-400">
                  Q-Point (V_CEQ, I_CQ)
                </div>
                <div className="text-base font-bold text-cyan-400 mt-0.5">
                  {bjtStats.vceQ.toFixed(2)}V, {bjtStats.icQ_mA.toFixed(2)}mA
                </div>
              </div>
              <div className="bg-[#111827] border border-slate-800 rounded-xl p-3.5">
                <div className="text-[11px] text-slate-400">
                  Transconductance g_m
                </div>
                <div className="text-base font-bold text-purple-400 mt-0.5">
                  {bjtStats.gm_mS.toFixed(1)} mS
                </div>
              </div>
              <div className="bg-[#111827] border border-slate-800 rounded-xl p-3.5">
                <div className="text-[11px] text-slate-400">
                  Voltage Gain A_v
                </div>
                <div className="text-base font-bold text-amber-400 mt-0.5">
                  {bjtStats.av.toFixed(1)} V/V ({bjtStats.avDb.toFixed(1)} dB)
                </div>
              </div>
            </div>

            {/* Dual Visual: Left DC Load Line + Right 180-deg Phase-Inverted Oscilloscope */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#070A12] border border-slate-800 rounded-xl p-4">
                <div className="text-xs font-mono text-white font-semibold mb-2">
                  DC LOAD LINE &amp; QUIESCENT Q-POINT
                </div>
                <svg viewBox="0 0 320 220" className="w-full h-auto block">
                  <rect
                    x="45"
                    y="15"
                    width="250"
                    height="175"
                    fill="#0b1020"
                    stroke="#1e293b"
                  />
                  {/* Load line from (45, 25) to (285, 190) */}
                  <line
                    x1="45"
                    y1="25"
                    x2="285"
                    y2="190"
                    stroke="#38bdf8"
                    strokeWidth="2.2"
                  />
                  {(() => {
                    const qX = 45 + (bjtStats.vceQ / vcc) * 240;
                    const qY =
                      190 -
                      (bjtStats.icQ_mA /
                        Math.max(0.1, bjtStats.icSatLoadLine_mA)) *
                        165;
                    return (
                      <>
                        <circle
                          cx={qX}
                          cy={qY}
                          r="6"
                          fill="#22c55e"
                          stroke="#ffffff"
                          strokeWidth="2"
                        />
                        <text
                          x={Math.min(210, qX + 8)}
                          y={Math.max(32, qY - 6)}
                          fill="#86efac"
                          fontSize="10"
                          fontFamily="JetBrains Mono"
                          fontWeight="700"
                        >
                          Q({bjtStats.vceQ.toFixed(1)}V,{" "}
                          {bjtStats.icQ_mA.toFixed(1)}mA)
                        </text>
                      </>
                    );
                  })()}
                  <text
                    x="170"
                    y="208"
                    textAnchor="middle"
                    fill="#94a3b8"
                    fontSize="10"
                    fontFamily="JetBrains Mono"
                  >
                    V_CE (0V → V_CC = {vcc}V)
                  </text>
                </svg>
              </div>

              <div className="bg-[#070A12] border border-slate-800 rounded-xl p-4">
                <div className="text-xs font-mono text-white font-semibold mb-2">
                  CE AMPLIFIER WAVEFORMS (180° PHASE INVERSION)
                </div>
                <svg viewBox="0 0 320 220" className="w-full h-auto block">
                  <rect
                    x="30"
                    y="15"
                    width="270"
                    height="175"
                    fill="#0b1020"
                    stroke="#1e293b"
                  />
                  <line
                    x1="30"
                    y1="102.5"
                    x2="300"
                    y2="102.5"
                    stroke="#334155"
                  />
                  {(() => {
                    let inP = "";
                    let outP = "";
                    const maxSwing = Math.max(0.5, vcc / 2);

                    for (let i = 0; i <= 120; i++) {
                      const theta = (i / 120) * 4 * Math.PI;
                      const x = 30 + (i / 120) * 270;
                      const yIn = 102.5 - Math.sin(theta) * 22;
                      const rawOut =
                        -Math.sin(theta) *
                        Math.min(maxSwing, bjtStats.voutPeakV);
                      const yOut = 102.5 - (rawOut / maxSwing) * 72;
                      inP += `${i === 0 ? "M" : "L"} ${x.toFixed(1)},${yIn.toFixed(1)} `;
                      outP += `${i === 0 ? "M" : "L"} ${x.toFixed(1)},${yOut.toFixed(1)} `;
                    }
                    return (
                      <>
                        <path
                          d={inP}
                          fill="none"
                          stroke="#38bdf8"
                          strokeWidth="1.8"
                          strokeDasharray="4 3"
                        />
                        <path
                          d={outP}
                          fill="none"
                          stroke="#22c55e"
                          strokeWidth="2.5"
                        />
                      </>
                    );
                  })()}
                  <text
                    x="165"
                    y="208"
                    textAnchor="middle"
                    fill="#94a3b8"
                    fontSize="10"
                    fontFamily="JetBrains Mono"
                  >
                    v_out(pk) = {bjtStats.voutPeakV.toFixed(2)} V (Inverted)
                  </text>
                </svg>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EXP 2: MOSFET COMMON-SOURCE AMPLIFIER */}
      {activeTab === "MOSFET_CS_AMP" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-4 bg-[#111827] border border-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white">
              N-Channel Enhancement MOSFET (2N7000)
            </h3>

            {[
              {
                label: "Drain Supply V_DD",
                val: vdd,
                set: setVdd,
                min: 5,
                max: 24,
                step: 1,
                unit: "V",
              },
              {
                label: "Gate-to-Source Voltage V_GS",
                val: vgs,
                set: setVgs,
                min: 0.5,
                max: 6.0,
                step: 0.1,
                unit: "V",
              },
              {
                label: "Threshold Voltage V_th",
                val: vth,
                set: setVth,
                min: 0.8,
                max: 3.0,
                step: 0.1,
                unit: "V",
              },
              {
                label: "Transconductance Parameter k_n",
                val: knMaV2,
                set: setKnMaV2,
                min: 0.5,
                max: 5.0,
                step: 0.25,
                unit: "mA/V²",
              },
              {
                label: "Drain Resistor R_D",
                val: rdK,
                set: setRdK,
                min: 0.5,
                max: 10,
                step: 0.25,
                unit: "kΩ",
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

            <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3.5 space-y-1.5 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400">Overdrive V_OV = V_GS − V_th:</span>
                <span className="text-cyan-300 font-bold">
                  {mosfetStats.vov.toFixed(2)} V
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Operating Region:</span>
                <span className="text-emerald-400 font-bold">
                  {mosfetStats.region}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Drain Current I_DQ:</span>
                <span className="text-white font-bold">
                  {mosfetStats.id_mA.toFixed(2)} mA
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Voltage Gain A_v = −g_m·R_D:</span>
                <span className="text-amber-300 font-bold">
                  {mosfetStats.av.toFixed(2)} V/V
                </span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-8 space-y-5">
            <AnalogStage3D
              mode="MOSFET"
              title="MOSFET CS Amp"
              topologyTag="MOSFET_CS"
              vin={vdd}
              vout={mosfetStats.vds}
              currentMa={mosfetStats.id_mA}
              rVal={rdK * 1000}
              dutyRatio={Math.min(1, vgs / 6)}
              regionLabel={`${mosfetStats.region} · gm=${mosfetStats.gm_mS.toFixed(1)}mS`}
              onInteractiveStep={() => setVgs((v) => (v >= 5 ? 2.0 : Number((v + 0.5).toFixed(1))))}
            />
            <div className="bg-[#070A12] border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3 text-xs font-mono">
              <span className="text-white font-semibold">
                MOSFET SQUARE-LAW TRANSFER CURVE: I_D = ½·k_n·(V_GS − V_th)²
              </span>
              <span className="text-emerald-400">
                V_DSQ = {mosfetStats.vds.toFixed(2)} V · g_m ={" "}
                {mosfetStats.gm_mS.toFixed(2)} mS
              </span>
            </div>

            <svg viewBox="0 0 680 260" className="w-full h-auto block">
              <rect
                x="55"
                y="20"
                width="580"
                height="205"
                fill="#0b1020"
                stroke="#1e293b"
              />
              {(() => {
                const maxVgs = 6.0;
                const maxId = Math.max(
                  10,
                  0.5 * knMaV2 * (maxVgs - vth) ** 2
                );
                let curvePath = "";
                for (let i = 0; i <= 80; i++) {
                  const v = (i / 80) * maxVgs;
                  const id = v <= vth ? 0 : 0.5 * knMaV2 * (v - vth) ** 2;
                  const x = 55 + (v / maxVgs) * 580;
                  const y = 225 - (id / maxId) * 200;
                  curvePath += `${i === 0 ? "M" : "L"} ${x.toFixed(1)},${y.toFixed(1)} `;
                }
                const qX = 55 + (vgs / maxVgs) * 580;
                const qY = 225 - (mosfetStats.id_mA / maxId) * 200;
                return (
                  <>
                    <path
                      d={curvePath}
                      fill="none"
                      stroke="#22c55e"
                      strokeWidth="2.8"
                    />
                    <circle
                      cx={qX}
                      cy={qY}
                      r="6"
                      fill="#38bdf8"
                      stroke="#fff"
                      strokeWidth="2"
                    />
                    <text
                      x={Math.min(520, qX + 10)}
                      y={Math.max(40, qY - 8)}
                      fill="#7dd3fc"
                      fontSize="11"
                      fontFamily="JetBrains Mono"
                      fontWeight="700"
                    >
                      V_GS={vgs}V, I_D={mosfetStats.id_mA.toFixed(2)}mA
                    </text>
                  </>
                );
              })()}
            </svg>
            </div>
          </div>
        </div>
      )}

      {/* EXP 3: OPERATIONAL AMPLIFIER LAB */}
      {activeTab === "OPAMP_LAB" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-4 bg-[#111827] border border-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white">
              LM741 / TL082 Op-Amp Configuration
            </h3>
            <div className="grid grid-cols-3 gap-1.5 text-xs font-mono">
              {(
                [
                  { id: "INVERTING", label: "Inverting" },
                  { id: "NON_INVERTING", label: "Non-Inv" },
                  { id: "DIFFERENTIAL", label: "Diff Amp" },
                ] as const
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setOpMode(m.id)}
                  className={`py-2 px-2 rounded-lg border cursor-pointer ${
                    opMode === m.id
                      ? "bg-cyan-500/20 border-cyan-400 text-cyan-200 font-bold"
                      : "bg-slate-900 border-slate-800 text-slate-400"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {[
              {
                label: "Input Resistor R_in (R1)",
                val: rinK,
                set: setRinK,
                min: 1,
                max: 100,
                step: 1,
                unit: "kΩ",
              },
              {
                label: "Feedback Resistor R_f",
                val: rfK,
                set: setRfK,
                min: 1,
                max: 220,
                step: 1,
                unit: "kΩ",
              },
              {
                label: "Input Amplitude V_in(pk)",
                val: opVinPeak,
                set: setOpVinPeak,
                min: 0.1,
                max: 5.0,
                step: 0.1,
                unit: "V",
              },
              {
                label: "Dual Supply Rails ±V_CC",
                val: vSupplyRail,
                set: setVSupplyRail,
                min: 5,
                max: 18,
                step: 1,
                unit: "V",
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
                opAmpStats.isClipped
                  ? "bg-amber-950/30 border-amber-500/40 text-amber-300"
                  : "bg-emerald-950/30 border-emerald-500/40 text-emerald-300"
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold">
                {opAmpStats.isClipped ? (
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                )}
                <span>
                  {opAmpStats.isClipped
                    ? `Rail Saturation Clipping at ±${opAmpStats.vSat.toFixed(1)}V`
                    : "Linear Closed-Loop Operation"}
                </span>
              </div>
              <div className="text-slate-300">
                Gain A_CL = {opAmpStats.closedLoopGain.toFixed(2)} V/V · −3dB BW
                = {opAmpStats.bandwidthKhz.toFixed(1)} kHz
              </div>
            </div>
          </div>

          <div className="lg:col-span-8 space-y-5">
            <AnalogStage3D
              mode="OPAMP"
              title={`LM741 ${opMode}`}
              topologyTag={opMode}
              vin={vSupplyRail}
              vout={Math.abs(opAmpStats.actualPeakOut)}
              currentMa={Math.abs(opAmpStats.actualPeakOut / Math.max(1, rfK)) * 10}
              rVal={rfK * 1000}
              isClipped={opAmpStats.isClipped}
              regionLabel={`Acl=${opAmpStats.closedLoopGain.toFixed(2)} · ${opAmpStats.isClipped ? "CLIPPED" : "LINEAR"}`}
              onInteractiveStep={() =>
                setOpMode((m) =>
                  m === "INVERTING" ? "NON_INVERTING" : m === "NON_INVERTING" ? "DIFFERENTIAL" : "INVERTING"
                )
              }
            />
            {/* Dynamic Op-Amp Topology Schematic */}
            <div className="bg-[#070A12] border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2">
                <span className="text-white font-bold">OP-AMP FEEDBACK TOPOLOGY ({opMode})</span>
                <span className="text-cyan-400">Rin={rinK}kΩ · Rf={rfK}kΩ · A_CL={opAmpStats.closedLoopGain.toFixed(2)}</span>
              </div>
              <svg viewBox="0 0 600 135" className="w-full h-auto block font-mono">
                <rect x="0" y="0" width="600" height="135" fill="#0b1020" rx="6" />
                {/* Op-Amp triangle */}
                <polygon points="270,35 370,70 270,105" fill="#0f172a" stroke="#22d3ee" strokeWidth="2.2" />
                <text x="282" y="57" fill="#ef4444" fontSize="13" fontWeight="700">-</text>
                <text x="282" y="88" fill="#38bdf8" fontSize="13" fontWeight="700">+</text>
                <text x="312" y="74" fill="#94a3b8" fontSize="10" textAnchor="middle" fontWeight="700">LM741</text>
                {/* Feedback network Rf */}
                <path d="M 240 52 L 240 16 L 285 16 L 345 16 L 395 16 L 395 70" fill="none" stroke="#f59e0b" strokeWidth="1.8" />
                <rect x="288" y="8" width="56" height="16" rx="3" fill="#0f172a" stroke="#f59e0b" strokeWidth="1.8" />
                <text x="316" y="19" fill="#fbbf24" fontSize="9" textAnchor="middle" fontWeight="700">Rf {rfK}kΩ</text>
                {/* Output */}
                <line x1="370" y1="70" x2="540" y2="70" stroke="#10b981" strokeWidth="2.2" />
                <text x="546" y="74" fill="#34d399" fontSize="10" fontWeight="700">Vo ({opAmpStats.actualPeakOut.toFixed(1)}V)</text>
                {/* Input Rin */}
                <line x1="215" y1="52" x2="270" y2="52" stroke="#38bdf8" strokeWidth="2" />
                <rect x="135" y="44" width="56" height="16" rx="3" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.8" />
                <text x="163" y="55" fill="#38bdf8" fontSize="9" textAnchor="middle" fontWeight="700">Rin {rinK}kΩ</text>
                <line x1="90" y1="52" x2="135" y2="52" stroke="#38bdf8" strokeWidth="2" />
                <line x1="191" y1="52" x2="215" y2="52" stroke="#38bdf8" strokeWidth="2" />

                {opMode === "INVERTING" && (
                  <>
                    <text x="72" y="55" fill="#fca5a5" fontSize="10" textAnchor="middle" fontWeight="700">Vin</text>
                    <line x1="270" y1="86" x2="220" y2="86" stroke="#64748b" strokeWidth="2" />
                    <line x1="220" y1="86" x2="220" y2="112" stroke="#64748b" strokeWidth="2" />
                    <line x1="208" y1="112" x2="232" y2="112" stroke="#64748b" strokeWidth="2.2" />
                    <text x="220" y="126" fill="#94a3b8" fontSize="8.5" textAnchor="middle">GND</text>
                  </>
                )}
                {opMode === "NON_INVERTING" && (
                  <>
                    <line x1="78" y1="52" x2="78" y2="112" stroke="#64748b" strokeWidth="2" />
                    <line x1="66" y1="112" x2="90" y2="112" stroke="#64748b" strokeWidth="2.2" />
                    <line x1="90" y1="52" x2="78" y2="52" stroke="#64748b" strokeWidth="2" />
                    <line x1="115" y1="86" x2="270" y2="86" stroke="#38bdf8" strokeWidth="2" />
                    <text x="86" y="90" fill="#fca5a5" fontSize="10" fontWeight="700">Vin (+)</text>
                  </>
                )}
                {opMode === "DIFFERENTIAL" && (
                  <>
                    <text x="68" y="55" fill="#fca5a5" fontSize="10" fontWeight="700">V1(-)</text>
                    <line x1="115" y1="86" x2="270" y2="86" stroke="#38bdf8" strokeWidth="2" />
                    <rect x="135" y="78" width="56" height="16" rx="3" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.6" />
                    <text x="163" y="89" fill="#38bdf8" fontSize="8.5" textAnchor="middle">R1 {rinK}kΩ</text>
                    <line x1="240" y1="86" x2="240" y2="116" stroke="#64748b" strokeWidth="1.8" />
                    <text x="240" y="128" fill="#fbbf24" fontSize="8.5" textAnchor="middle">Rg {rfK}kΩ → GND</text>
                    <text x="68" y="90" fill="#38bdf8" fontSize="10" fontWeight="700">V2(+)</text>
                  </>
                )}
              </svg>
            </div>
            <div className="bg-[#070A12] border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3 text-xs font-mono">
              <span className="text-white font-semibold inline-flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-cyan-400" />
                OP-AMP OSCILLOSCOPE: v_in(t) vs. CLOSED-LOOP v_out(t)
              </span>
              <span className="text-emerald-400">
                V_out(pk) = {opAmpStats.actualPeakOut.toFixed(2)} V
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
                let inPath = "";
                let outPath = "";
                const scaleY = 90 / vSupplyRail;

                for (let i = 0; i <= 240; i++) {
                  const theta = (i / 240) * 4 * Math.PI;
                  const x = 50 + (i / 240) * 600;
                  const vinVal = opVinPeak * Math.sin(theta);
                  const rawOut = vinVal * opAmpStats.closedLoopGain;
                  const clippedOut = Math.max(
                    -opAmpStats.vSat,
                    Math.min(opAmpStats.vSat, rawOut)
                  );

                  const yIn = 125 - vinVal * scaleY;
                  const yOut = 125 - clippedOut * scaleY;
                  inPath += `${i === 0 ? "M" : "L"} ${x.toFixed(1)},${yIn.toFixed(1)} `;
                  outPath += `${i === 0 ? "M" : "L"} ${x.toFixed(1)},${yOut.toFixed(1)} `;
                }
                return (
                  <>
                    <path
                      d={inPath}
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth="2"
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
        </div>
      )}
    </div>
  );
}
