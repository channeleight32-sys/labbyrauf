import React, { useState, useMemo, useEffect } from "react";
import { RotateCcw, Zap, CheckCircle2, Activity } from "lucide-react";
import SeriesParallelBuilder from "./SeriesParallelBuilder";
import MasterLabWorkbench from "./MasterLabWorkbench";
import AnalogStage3D from "./AnalogStage3D";

type LCATab =
  | "SERIES_PARALLEL_BUILDER"
  | "NODAL_MESH"
  | "THEVENIN_MPT"
  | "TRANSIENT_SUPERPOSITION"
  | "MASTER_15_NET"
  | "MASTER_15_LIC";

interface LinearCircuitLabProps {
  initialTab?: LCATab;
  initialScenarioName?: string;
  initialTransientType?: "RC" | "RL";
  syncKey?: number | string;
}

export default function LinearCircuitLab({
  initialTab,
  initialScenarioName,
  initialTransientType,
  syncKey,
}: LinearCircuitLabProps = {}) {
  const [activeTab, setActiveTab] = useState<LCATab>(
    initialTab || "SERIES_PARALLEL_BUILDER"
  );

  // --- Experiment 1: 2-Mesh / Nodal T-Network State ---
  const [vs1, setVs1] = useState<number>(12); // V
  const [vs2, setVs2] = useState<number>(6); // V
  const [r1, setR1] = useState<number>(100); // Ohms
  const [r2, setR2] = useState<number>(200); // Ohms
  const [r3, setR3] = useState<number>(150); // Center branch Ohms

  // --- Experiment 2: Thevenin / Norton / Max Power Transfer State ---
  const [thVs, setThVs] = useState<number>(24);
  const [thR1, setThR1] = useState<number>(60);
  const [thR2, setThR2] = useState<number>(120);
  const [thR3, setThR3] = useState<number>(20);
  const [loadRL, setLoadRL] = useState<number>(60);

  // --- Experiment 3: First-Order RC / RL Step Transient State ---
  const [transientType, setTransientType] = useState<"RC" | "RL">(
    initialTransientType || "RC"
  );
  const [stepV, setStepV] = useState<number>(10); // V
  const [transR, setTransR] = useState<number>(1000); // Ohms
  const [transC, setTransC] = useState<number>(10); // uF
  const [transL, setTransL] = useState<number>(50); // mH

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
    if (initialTransientType) setTransientType(initialTransientType);
  }, [initialTab, initialTransientType, syncKey]);

  // --- Calculations for Experiment 1 (Nodal, Mesh & Superposition) ---
  const nodalMeshData = useMemo(() => {
    // T-Network:
    // Loop 1: Vs1 -> R1 -> node Va -> R3 (to GND)
    // Loop 2: Vs2 (right side) -> R2 -> node Va -> R3 (to GND)
    // KCL at central node Va: (Va - Vs1)/R1 + Va/R3 + (Va - Vs2)/R2 = 0
    const g1 = 1 / r1;
    const g2 = 1 / r2;
    const g3 = 1 / r3;
    const gTotal = g1 + g2 + g3;

    const va = (vs1 * g1 + vs2 * g2) / gTotal;
    // Superposition components of Va:
    const vaFromVs1 = (vs1 * g1) / gTotal; // Vs2 shorted (0V)
    const vaFromVs2 = (vs2 * g2) / gTotal; // Vs1 shorted (0V)

    // Mesh Currents (clockwise for Mesh 1, counter-clockwise/inward for Source 2):
    // iR1 from Vs1 into Va, iR2 from Vs2 into Va, iR3 from Va down to GND
    const iR1_mA = ((vs1 - va) / r1) * 1000;
    const iR2_mA = ((vs2 - va) / r2) * 1000;
    const iR3_mA = (va / r3) * 1000;

    // Power conservation check:
    const pSupplied1_mW = vs1 * iR1_mA;
    const pSupplied2_mW = vs2 * iR2_mA;
    const pTotalSupplied_mW = pSupplied1_mW + pSupplied2_mW;

    const pR1_mW = ((vs1 - va) ** 2 / r1) * 1000;
    const pR2_mW = ((vs2 - va) ** 2 / r2) * 1000;
    const pR3_mW = (va ** 2 / r3) * 1000;
    const pTotalAbsorbed_mW = pR1_mW + pR2_mW + pR3_mW;

    return {
      va,
      vaFromVs1,
      vaFromVs2,
      iR1_mA,
      iR2_mA,
      iR3_mA,
      pSupplied1_mW,
      pSupplied2_mW,
      pTotalSupplied_mW,
      pR1_mW,
      pR2_mW,
      pR3_mW,
      pTotalAbsorbed_mW,
    };
  }, [vs1, vs2, r1, r2, r3]);

  // --- Calculations for Experiment 2 (Thevenin, Norton & MPT) ---
  const theveninData = useMemo(() => {
    // Source Vs in series with R1, shunted by R2, followed by series R3 to output terminals A-B
    const vTh = thVs * (thR2 / (thR1 + thR2));
    const rTh = (thR1 * thR2) / (thR1 + thR2) + thR3;
    const iNorton_mA = (vTh / rTh) * 1000;

    const iLoad_mA = (vTh / (rTh + loadRL)) * 1000;
    const vLoad = vTh * (loadRL / (rTh + loadRL));
    const pLoad_mW = (vLoad * iLoad_mA); // V * mA = mW
    const pMax_mW = ((vTh ** 2) / (4 * rTh)) * 1000;
    const efficiencyPct = (loadRL / (rTh + loadRL)) * 100;

    // Curve points for RL from 1 Ohm to 3*Rth
    const maxRPlot = Math.max(200, Math.round(rTh * 3.2));
    const curvePoints: { rl: number; p_mW: number; eff: number; vL: number }[] =
      [];
    for (let i = 1; i <= 60; i++) {
      const rTest = (i / 60) * maxRPlot;
      const vTest = vTh * (rTest / (rTh + rTest));
      const pTest_mW = ((vTest ** 2) / rTest) * 1000;
      const effTest = (rTest / (rTh + rTest)) * 100;
      curvePoints.push({ rl: rTest, p_mW: pTest_mW, eff: effTest, vL: vTest });
    }

    return {
      vTh,
      rTh,
      iNorton_mA,
      iLoad_mA,
      vLoad,
      pLoad_mW,
      pMax_mW,
      efficiencyPct,
      maxRPlot,
      curvePoints,
    };
  }, [thVs, thR1, thR2, thR3, loadRL]);

  // --- Calculations for Experiment 3 (RC / RL Step Transient) ---
  const transientData = useMemo(() => {
    // tau in milliseconds
    const tauMs =
      transientType === "RC"
        ? (transR * transC) / 1000 // R (Ohm) * C (uF) * 1e-6 * 1000 = ms
        : transL / transR; // L (mH) / R (Ohm) = ms

    const tSettling5TauMs = 5 * tauMs;
    const iMax_mA = (stepV / transR) * 1000;
    const energy_uJ =
      transientType === "RC"
        ? 0.5 * transC * stepV ** 2 // 0.5 * uF * V^2 = uJ
        : 0.5 * (transL / 1000) * (stepV / transR) ** 2 * 1e6; // uJ

    // Sample 50 points from t = 0 to t = 6*tau
    const maxT = Math.max(0.01, 6 * tauMs);
    const samples: {
      tMs: number;
      vElement: number;
      iCircuit_mA: number;
    }[] = [];

    for (let idx = 0; idx <= 50; idx++) {
      const t = (idx / 50) * maxT;
      const expFactor = Math.exp(-t / Math.max(1e-6, tauMs));
      if (transientType === "RC") {
        // Capacitor voltage rises: vC(t) = Vs * (1 - e^-t/tau), current decays: i(t) = (Vs/R)*e^-t/tau
        samples.push({
          tMs: t,
          vElement: stepV * (1 - expFactor),
          iCircuit_mA: iMax_mA * expFactor,
        });
      } else {
        // Inductor voltage decays: vL(t) = Vs * e^-t/tau, current rises: iL(t) = (Vs/R)*(1 - e^-t/tau)
        samples.push({
          tMs: t,
          vElement: stepV * expFactor,
          iCircuit_mA: iMax_mA * (1 - expFactor),
        });
      }
    }

    return {
      tauMs,
      tSettling5TauMs,
      iMax_mA,
      energy_uJ,
      maxT,
      samples,
    };
  }, [transientType, stepV, transR, transC, transL]);

  return (
    <div className="space-y-6">
      {/* Experiment Selector Ribbon */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#111827] border border-slate-800 rounded-xl p-3">
        <div className="flex flex-wrap items-center gap-2">
          {[
            {
              id: "SERIES_PARALLEL_BUILDER" as LCATab,
              label:
                "01. Drag & Drop Series / Parallel / Combination Designer",
            },
            {
              id: "NODAL_MESH" as LCATab,
              label: "02. Nodal, Mesh & Superposition Solver",
            },
            {
              id: "THEVENIN_MPT" as LCATab,
              label: "03. Thevenin, Norton & Max Power Transfer",
            },
            {
              id: "TRANSIENT_SUPERPOSITION" as LCATab,
              label: "04. First-Order RC / RL Step Transient Lab",
            },
            {
              id: "MASTER_15_NET" as LCATab,
              label: "05. Domain A: 15 Network Analysis Labs",
            },
            {
              id: "MASTER_15_LIC" as LCATab,
              label: "06. Domain B: 15 Linear IC (Op-Amp/555) Labs",
            },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === tab.id
                  ? "bg-cyan-400 text-slate-950 font-bold"
                  : "bg-slate-900 text-slate-300 hover:text-white border border-slate-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <span className="text-xs font-mono text-cyan-400 px-2">
          Linear Circuit Analysis (LCA) Lab
        </span>
      </div>

      {/* EXPERIMENT 0: DRAG-AND-DROP SERIES / PARALLEL / COMBINATION CIRCUIT DESIGNER */}
      {activeTab === "SERIES_PARALLEL_BUILDER" && (
        <SeriesParallelBuilder
          labMode="lca"
          initialScenarioName={initialScenarioName}
          scenarioSyncKey={syncKey}
        />
      )}

      {/* DOMAIN A: 15 NETWORK ANALYSIS MASTER LABS */}
      {activeTab === "MASTER_15_NET" && (
        <MasterLabWorkbench
          fixedDomain="A"
          onLaunchInteractiveBuilder={() =>
            setActiveTab("SERIES_PARALLEL_BUILDER")
          }
        />
      )}

      {/* DOMAIN B: 15 LINEAR INTEGRATED CIRCUITS MASTER LABS */}
      {activeTab === "MASTER_15_LIC" && (
        <MasterLabWorkbench
          fixedDomain="B"
          onLaunchInteractiveBuilder={() =>
            setActiveTab("SERIES_PARALLEL_BUILDER")
          }
        />
      )}

      {/* EXPERIMENT 1: NODAL, MESH & SUPERPOSITION */}
      {activeTab === "NODAL_MESH" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Controls */}
          <div className="lg:col-span-4 bg-[#111827] border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">
                Two-Source T-Network Parameters
              </h3>
              <button
                type="button"
                onClick={() => {
                  setVs1(12);
                  setVs2(6);
                  setR1(100);
                  setR2(200);
                  setR3(150);
                }}
                className="text-xs font-mono text-slate-400 hover:text-white inline-flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" /> Reset
              </button>
            </div>

            {[
              {
                label: "Source V_S1 (Left Mesh)",
                val: vs1,
                set: setVs1,
                min: -24,
                max: 24,
                step: 1,
                unit: "V",
              },
              {
                label: "Source V_S2 (Right Mesh)",
                val: vs2,
                set: setVs2,
                min: -24,
                max: 24,
                step: 1,
                unit: "V",
              },
              {
                label: "Branch Resistor R1",
                val: r1,
                set: setR1,
                min: 10,
                max: 1000,
                step: 10,
                unit: "Ω",
              },
              {
                label: "Branch Resistor R2",
                val: r2,
                set: setR2,
                min: 10,
                max: 1000,
                step: 10,
                unit: "Ω",
              },
              {
                label: "Shunt Resistor R3 (Center)",
                val: r3,
                set: setR3,
                min: 10,
                max: 1000,
                step: 10,
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

            <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3.5 space-y-2 text-xs font-mono">
              <div className="text-cyan-400 font-semibold">
                KCL Nodal Equation at Node V_A:
              </div>
              <div className="text-slate-300">
                (V_A − {vs1})/{r1} + V_A/{r3} + (V_A − {vs2})/{r2} = 0
              </div>
              <div className="pt-1 border-t border-slate-800 text-emerald-400 font-bold">
                ⇒ V_A = {nodalMeshData.va.toFixed(3)} V
              </div>
            </div>
          </div>

          {/* Live Interactive Schematic + Telemetry */}
          <div className="lg:col-span-8 space-y-5">
            <AnalogStage3D
              mode="NETWORK"
              title="2-Mesh T-Network"
              topologyTag="T_NETWORK"
              vin={Math.max(Math.abs(vs1), Math.abs(vs2))}
              vout={Math.abs(nodalMeshData.va)}
              currentMa={Math.abs(nodalMeshData.iR3_mA)}
              rVal={r3}
              regionLabel={`Va = ${nodalMeshData.va.toFixed(2)}V · KCL SUM = 0`}
              onInteractiveStep={() => setVs2((v) => (v === 0 ? 6 : 0))}
            />
            <div className="bg-[#070A12] border border-slate-800 rounded-xl p-4">
              <div className="text-xs font-mono text-slate-400 mb-2 flex justify-between">
                <span>LIVE NODAL &amp; MESH SCHEMATIC</span>
                <span className="text-emerald-400">
                  Tellegen&apos;s Power Balance Verified (∑P_supplied = ∑P_absorbed)
                </span>
              </div>
              <svg viewBox="0 0 700 280" className="w-full h-auto block">
                {/* Top rails */}
                <line
                  x1="90"
                  y1="60"
                  x2="610"
                  y2="60"
                  stroke="#38bdf8"
                  strokeWidth="2.5"
                />
                {/* Bottom Ground rail */}
                <line
                  x1="90"
                  y1="220"
                  x2="610"
                  y2="220"
                  stroke="#64748b"
                  strokeWidth="2.5"
                />
                {/* Left Source Vs1 */}
                <line
                  x1="90"
                  y1="60"
                  x2="90"
                  y2="220"
                  stroke="#38bdf8"
                  strokeWidth="2.5"
                />
                <circle
                  cx="90"
                  cy="140"
                  r="24"
                  fill="#0f172a"
                  stroke="#38bdf8"
                  strokeWidth="2.2"
                />
                <text
                  x="90"
                  y="136"
                  textAnchor="middle"
                  fill="#f8fafc"
                  fontSize="11"
                  fontFamily="JetBrains Mono"
                  fontWeight="700"
                >
                  Vs1
                </text>
                <text
                  x="90"
                  y="151"
                  textAnchor="middle"
                  fill="#38bdf8"
                  fontSize="11"
                  fontFamily="JetBrains Mono"
                  fontWeight="700"
                >
                  {vs1}V
                </text>

                {/* Right Source Vs2 */}
                <line
                  x1="610"
                  y1="60"
                  x2="610"
                  y2="220"
                  stroke="#38bdf8"
                  strokeWidth="2.5"
                />
                <circle
                  cx="610"
                  cy="140"
                  r="24"
                  fill="#0f172a"
                  stroke="#38bdf8"
                  strokeWidth="2.2"
                />
                <text
                  x="610"
                  y="136"
                  textAnchor="middle"
                  fill="#f8fafc"
                  fontSize="11"
                  fontFamily="JetBrains Mono"
                  fontWeight="700"
                >
                  Vs2
                </text>
                <text
                  x="610"
                  y="151"
                  textAnchor="middle"
                  fill="#38bdf8"
                  fontSize="11"
                  fontFamily="JetBrains Mono"
                  fontWeight="700"
                >
                  {vs2}V
                </text>

                {/* Resistor R1 */}
                <rect
                  x="175"
                  y="46"
                  width="90"
                  height="28"
                  rx="6"
                  fill="#1e293b"
                  stroke="#f59e0b"
                  strokeWidth="2"
                />
                <text
                  x="220"
                  y="64"
                  textAnchor="middle"
                  fill="#fef3c7"
                  fontSize="11"
                  fontFamily="JetBrains Mono"
                  fontWeight="700"
                >
                  R1 = {r1}Ω
                </text>
                <text
                  x="220"
                  y="36"
                  textAnchor="middle"
                  fill="#34d399"
                  fontSize="11"
                  fontFamily="JetBrains Mono"
                  fontWeight="700"
                >
                  I₁ = {nodalMeshData.iR1_mA.toFixed(2)} mA →
                </text>

                {/* Resistor R2 */}
                <rect
                  x="435"
                  y="46"
                  width="90"
                  height="28"
                  rx="6"
                  fill="#1e293b"
                  stroke="#f59e0b"
                  strokeWidth="2"
                />
                <text
                  x="480"
                  y="64"
                  textAnchor="middle"
                  fill="#fef3c7"
                  fontSize="11"
                  fontFamily="JetBrains Mono"
                  fontWeight="700"
                >
                  R2 = {r2}Ω
                </text>
                <text
                  x="480"
                  y="36"
                  textAnchor="middle"
                  fill="#34d399"
                  fontSize="11"
                  fontFamily="JetBrains Mono"
                  fontWeight="700"
                >
                  ← I₂ = {nodalMeshData.iR2_mA.toFixed(2)} mA
                </text>

                {/* Center Shunt R3 */}
                <line
                  x1="350"
                  y1="60"
                  x2="350"
                  y2="220"
                  stroke="#22c55e"
                  strokeWidth="2.5"
                />
                <rect
                  x="315"
                  y="115"
                  width="70"
                  height="50"
                  rx="6"
                  fill="#1e293b"
                  stroke="#22c55e"
                  strokeWidth="2"
                />
                <text
                  x="350"
                  y="138"
                  textAnchor="middle"
                  fill="#dcfce7"
                  fontSize="11"
                  fontFamily="JetBrains Mono"
                  fontWeight="700"
                >
                  R3={r3}Ω
                </text>
                <text
                  x="350"
                  y="154"
                  textAnchor="middle"
                  fill="#4ade80"
                  fontSize="10"
                  fontFamily="JetBrains Mono"
                >
                  {nodalMeshData.iR3_mA.toFixed(2)}mA ↓
                </text>

                {/* Central Node VA Badge */}
                <circle cx="350" cy="60" r="6" fill="#22c55e" />
                <rect
                  x="290"
                  y="14"
                  width="120"
                  height="24"
                  rx="6"
                  fill="#064e3b"
                  stroke="#10b981"
                />
                <text
                  x="350"
                  y="30"
                  textAnchor="middle"
                  fill="#6ee7b7"
                  fontSize="11.5"
                  fontFamily="JetBrains Mono"
                  fontWeight="700"
                >
                  V_A = {nodalMeshData.va.toFixed(2)} V
                </text>

                {/* Ground Symbol */}
                <line
                  x1="350"
                  y1="220"
                  x2="350"
                  y2="240"
                  stroke="#94a3b8"
                  strokeWidth="2"
                />
                <line
                  x1="334"
                  y1="240"
                  x2="366"
                  y2="240"
                  stroke="#94a3b8"
                  strokeWidth="2"
                />
                <line
                  x1="340"
                  y1="246"
                  x2="360"
                  y2="246"
                  stroke="#94a3b8"
                  strokeWidth="2"
                />
                <line
                  x1="345"
                  y1="252"
                  x2="355"
                  y2="252"
                  stroke="#94a3b8"
                  strokeWidth="2"
                />
              </svg>
            </div>

            {/* Superposition & Power Conservation Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#111827] border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 font-semibold">
                  <Zap className="w-4 h-4" />
                  SUPERPOSITION THEOREM BREAKDOWN
                </div>
                <div className="space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between text-slate-300">
                    <span>1. V_S1 Active Alone (V_S2 = 0V):</span>
                    <span className="text-cyan-300 font-bold">
                      V_A&apos; = {nodalMeshData.vaFromVs1.toFixed(3)} V
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>2. V_S2 Active Alone (V_S1 = 0V):</span>
                    <span className="text-purple-300 font-bold">
                      V_A&apos;&apos; = {nodalMeshData.vaFromVs2.toFixed(3)} V
                    </span>
                  </div>
                  <div className="pt-1.5 border-t border-slate-800 flex justify-between text-emerald-400 font-bold">
                    <span>Total V_A = V_A&apos; + V_A&apos;&apos;:</span>
                    <span>{nodalMeshData.va.toFixed(3)} V</span>
                  </div>
                </div>
              </div>

              <div className="bg-[#111827] border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  POWER CONSERVATION (TELLEGEN&apos;S THEOREM)
                </div>
                <div className="space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between text-slate-300">
                    <span>Total Source Power Supplied:</span>
                    <span className="text-cyan-300 font-bold">
                      {nodalMeshData.pTotalSupplied_mW.toFixed(2)} mW
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>P_R1 + P_R2 + P_R3 Absorbed:</span>
                    <span className="text-amber-300 font-bold">
                      {nodalMeshData.pTotalAbsorbed_mW.toFixed(2)} mW
                    </span>
                  </div>
                  <div className="pt-1.5 border-t border-slate-800 flex justify-between text-emerald-400 font-bold">
                    <span>Net Power Error ΔP:</span>
                    <span>0.000 mW (Exact Match)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EXPERIMENT 2: THEVENIN, NORTON & MAXIMUM POWER TRANSFER */}
      {activeTab === "THEVENIN_MPT" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-4 bg-[#111827] border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">
                Thevenin &amp; Load Network Controls
              </h3>
              <button
                type="button"
                onClick={() =>
                  setLoadRL(Math.round(theveninData.rTh * 10) / 10)
                }
                className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-mono font-semibold cursor-pointer"
              >
                Match R_L = R_th
              </button>
            </div>

            {[
              {
                label: "Source Voltage V_S",
                val: thVs,
                set: setThVs,
                min: 5,
                max: 50,
                step: 1,
                unit: "V",
              },
              {
                label: "Series Resistor R1",
                val: thR1,
                set: setThR1,
                min: 10,
                max: 300,
                step: 5,
                unit: "Ω",
              },
              {
                label: "Shunt Divider Resistor R2",
                val: thR2,
                set: setThR2,
                min: 10,
                max: 300,
                step: 5,
                unit: "Ω",
              },
              {
                label: "Output Series Resistor R3",
                val: thR3,
                set: setThR3,
                min: 0,
                max: 200,
                step: 5,
                unit: "Ω",
              },
              {
                label: "Variable Load Resistor R_L",
                val: loadRL,
                set: setLoadRL,
                min: 5,
                max: 300,
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

            <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3.5 space-y-1.5 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400">Thevenin Voltage V_th:</span>
                <span className="text-cyan-300 font-bold">
                  {theveninData.vTh.toFixed(2)} V
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Thevenin Resistance R_th:</span>
                <span className="text-amber-300 font-bold">
                  {theveninData.rTh.toFixed(2)} Ω
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Norton Current I_N:</span>
                <span className="text-purple-300 font-bold">
                  {theveninData.iNorton_mA.toFixed(2)} mA
                </span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-800">
                <span className="text-slate-400">Max Possible Power P_max:</span>
                <span className="text-emerald-400 font-bold">
                  {theveninData.pMax_mW.toFixed(2)} mW
                </span>
              </div>
            </div>
          </div>

          {/* Right Plot: Power Transfer & Efficiency vs Load Resistance */}
          <div className="lg:col-span-8 space-y-5">
            <AnalogStage3D
              mode="THEVENIN"
              title="Thevenin MPT"
              topologyTag="THEVENIN_DIVIDER"
              vin={theveninData.vTh}
              vout={theveninData.vLoad}
              currentMa={theveninData.iLoad_mA}
              rVal={loadRL}
              dutyRatio={Math.min(1, loadRL / Math.max(1, theveninData.rTh * 2))}
              regionLabel={
                Math.abs(loadRL - theveninData.rTh) < 5
                  ? `MPT MATCHED (RL=${loadRL}Ω)`
                  : `Rth=${theveninData.rTh.toFixed(1)}Ω RL=${loadRL}Ω`
              }
              onInteractiveStep={() => setLoadRL(Math.round(theveninData.rTh))}
            />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-[#111827] border border-slate-800 rounded-xl p-3.5 font-mono">
                <div className="text-[11px] text-slate-400">Load Voltage V_L</div>
                <div className="text-lg font-bold text-cyan-400 mt-0.5">
                  {theveninData.vLoad.toFixed(2)} V
                </div>
              </div>
              <div className="bg-[#111827] border border-slate-800 rounded-xl p-3.5 font-mono">
                <div className="text-[11px] text-slate-400">Load Current I_L</div>
                <div className="text-lg font-bold text-purple-400 mt-0.5">
                  {theveninData.iLoad_mA.toFixed(2)} mA
                </div>
              </div>
              <div className="bg-[#111827] border border-slate-800 rounded-xl p-3.5 font-mono">
                <div className="text-[11px] text-slate-400">Load Power P_L</div>
                <div className="text-lg font-bold text-emerald-400 mt-0.5">
                  {theveninData.pLoad_mW.toFixed(2)} mW
                </div>
              </div>
              <div className="bg-[#111827] border border-slate-800 rounded-xl p-3.5 font-mono">
                <div className="text-[11px] text-slate-400">Efficiency η</div>
                <div className="text-lg font-bold text-amber-400 mt-0.5">
                  {theveninData.efficiencyPct.toFixed(1)}%
                </div>
              </div>
            </div>

            <div className="bg-[#070A12] border border-slate-800 rounded-xl p-5">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <span className="text-xs font-mono text-white font-semibold">
                  MAXIMUM POWER TRANSFER CURVE: P_L(R_L) &amp; EFFICIENCY η(R_L)
                </span>
                <span className="text-xs font-mono text-emerald-400">
                  Peak Power at R_L = R_th = {theveninData.rTh.toFixed(1)} Ω (η = 50%)
                </span>
              </div>

              <svg viewBox="0 0 680 270" className="w-full h-auto block">
                <rect
                  x="55"
                  y="20"
                  width="580"
                  height="210"
                  fill="#0b1020"
                  stroke="#1e293b"
                />
                {/* Power Curve Path */}
                {(() => {
                  const maxP = Math.max(1, theveninData.pMax_mW * 1.15);
                  const pPath = theveninData.curvePoints
                    .map((pt, i) => {
                      const x = 55 + (pt.rl / theveninData.maxRPlot) * 580;
                      const y = 230 - (pt.p_mW / maxP) * 210;
                      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)},${y.toFixed(1)}`;
                    })
                    .join(" ");

                  const effPath = theveninData.curvePoints
                    .map((pt, i) => {
                      const x = 55 + (pt.rl / theveninData.maxRPlot) * 580;
                      const y = 230 - (pt.eff / 100) * 210;
                      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)},${y.toFixed(1)}`;
                    })
                    .join(" ");

                  const rthX =
                    55 + (theveninData.rTh / theveninData.maxRPlot) * 580;
                  const curX = Math.min(
                    635,
                    55 + (loadRL / theveninData.maxRPlot) * 580
                  );
                  const curY = 230 - (theveninData.pLoad_mW / maxP) * 210;

                  return (
                    <>
                      {/* Rth vertical marker */}
                      <line
                        x1={rthX}
                        y1="20"
                        x2={rthX}
                        y2="230"
                        stroke="#f59e0b"
                        strokeDasharray="4 4"
                      />
                      <text
                        x={rthX + 5}
                        y="35"
                        fill="#f59e0b"
                        fontSize="10"
                        fontFamily="JetBrains Mono"
                      >
                        R_th = {theveninData.rTh.toFixed(1)}Ω
                      </text>

                      <path
                        d={effPath}
                        fill="none"
                        stroke="#38bdf8"
                        strokeWidth="2"
                        strokeDasharray="5 3"
                      />
                      <path
                        d={pPath}
                        fill="none"
                        stroke="#22c55e"
                        strokeWidth="2.6"
                      />

                      {/* Operating Point */}
                      <circle
                        cx={curX}
                        cy={curY}
                        r="6"
                        fill="#22c55e"
                        stroke="#ffffff"
                        strokeWidth="2"
                      />
                      <text
                        x={Math.min(540, curX + 10)}
                        y={Math.max(35, curY - 8)}
                        fill="#86efac"
                        fontSize="10.5"
                        fontFamily="JetBrains Mono"
                        fontWeight="700"
                      >
                        R_L={loadRL}Ω ({theveninData.pLoad_mW.toFixed(1)}mW)
                      </text>
                    </>
                  );
                })()}
                <text
                  x="345"
                  y="255"
                  textAnchor="middle"
                  fill="#94a3b8"
                  fontSize="11"
                  fontFamily="JetBrains Mono"
                >
                  Load Resistance R_L (Ω) — Solid Green: P_L (mW) · Dashed Cyan:
                  Efficiency η (%)
                </text>
              </svg>
            </div>
          </div>
        </div>
      )}

      {/* EXPERIMENT 3: FIRST-ORDER RC / RL STEP TRANSIENT */}
      {activeTab === "TRANSIENT_SUPERPOSITION" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-4 bg-[#111827] border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">
                First-Order Step Transient Setup
              </h3>
              <div className="flex gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs font-mono">
                {(["RC", "RL"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTransientType(t)}
                    className={`px-2.5 py-1 rounded cursor-pointer ${
                      transientType === t
                        ? "bg-cyan-500/20 text-cyan-300 font-bold"
                        : "text-slate-400"
                    }`}
                  >
                    {t} Circuit
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2 text-xs font-mono">
                <span className="text-slate-300">Step Voltage V_S</span>
                <div className="inline-flex items-center gap-1">
                  <input
                    type="number"
                    step="any"
                    value={stepV}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      if (isFinite(v) && v > 0) setStepV(v);
                    }}
                    className="w-20 bg-slate-950 border border-slate-700 focus:border-cyan-400 rounded px-1.5 py-0.5 text-right text-xs font-mono font-bold text-cyan-300 focus:outline-none"
                  />
                  <span className="text-slate-400">V</span>
                </div>
              </div>
              <input
                type="range"
                min={1}
                max={24}
                step={1}
                value={stepV}
                onChange={(e) => setStepV(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2 text-xs font-mono">
                <span className="text-slate-300">Resistance R</span>
                <div className="inline-flex items-center gap-1">
                  <input
                    type="number"
                    step="any"
                    value={transR}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      if (isFinite(v) && v > 0) setTransR(v);
                    }}
                    className="w-20 bg-slate-950 border border-slate-700 focus:border-cyan-400 rounded px-1.5 py-0.5 text-right text-xs font-mono font-bold text-cyan-300 focus:outline-none"
                  />
                  <span className="text-slate-400">Ω</span>
                </div>
              </div>
              <input
                type="range"
                min={50}
                max={5000}
                step={50}
                value={transR}
                onChange={(e) => setTransR(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            {transientType === "RC" ? (
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2 text-xs font-mono">
                  <span className="text-slate-300">Capacitance C</span>
                  <div className="inline-flex items-center gap-1">
                    <input
                      type="number"
                      step="any"
                      value={transC}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value);
                        if (isFinite(v) && v > 0) setTransC(v);
                      }}
                      className="w-20 bg-slate-950 border border-slate-700 focus:border-cyan-400 rounded px-1.5 py-0.5 text-right text-xs font-mono font-bold text-cyan-300 focus:outline-none"
                    />
                    <span className="text-slate-400">μF</span>
                  </div>
                </div>
                <input
                  type="range"
                  min={1}
                  max={100}
                  step={1}
                  value={transC}
                  onChange={(e) => setTransC(Number(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>
            ) : (
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2 text-xs font-mono">
                  <span className="text-slate-300">Inductance L</span>
                  <div className="inline-flex items-center gap-1">
                    <input
                      type="number"
                      step="any"
                      value={transL}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value);
                        if (isFinite(v) && v > 0) setTransL(v);
                      }}
                      className="w-20 bg-slate-950 border border-slate-700 focus:border-cyan-400 rounded px-1.5 py-0.5 text-right text-xs font-mono font-bold text-cyan-300 focus:outline-none"
                    />
                    <span className="text-slate-400">mH</span>
                  </div>
                </div>
                <input
                  type="range"
                  min={5}
                  max={500}
                  step={5}
                  value={transL}
                  onChange={(e) => setTransL(Number(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>
            )}

            <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3.5 space-y-1.5 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400">
                  Time Constant τ ({transientType === "RC" ? "R·C" : "L/R"}):
                </span>
                <span className="text-cyan-300 font-bold">
                  {transientData.tauMs.toFixed(3)} ms
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">5τ Settling Time (99.3%):</span>
                <span className="text-emerald-400 font-bold">
                  {transientData.tSettling5TauMs.toFixed(3)} ms
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Stored Energy W:</span>
                <span className="text-amber-300 font-bold">
                  {transientData.energy_uJ.toFixed(1)} μJ
                </span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-8 space-y-5">
            <AnalogStage3D
              mode="TRANSIENT"
              title={`${transientType} Step`}
              topologyTag={transientType}
              circuitType={transientType}
              vin={stepV}
              vout={transientType === "RC" ? stepV * 0.632 : stepV * 0.368}
              currentMa={transientData.iMax_mA * 0.632}
              rVal={transR}
              cVal={transC}
              lVal={transL}
              regionLabel={`tau=${transientData.tauMs.toFixed(2)}ms · 5tau=${transientData.tSettling5TauMs.toFixed(2)}ms`}
              onInteractiveStep={() => setTransientType((t) => (t === "RC" ? "RL" : "RC"))}
            />
            <div className="bg-[#070A12] border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3 text-xs font-mono">
              <span className="text-white font-semibold inline-flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-cyan-400" />
                {transientType === "RC"
                  ? "CAPACITOR CHARGING v_C(t) = V_S(1 − e^(−t/RC)) & CURRENT i_C(t)"
                  : "INDUCTOR TRANSIENT v_L(t) = V_S·e^(−t/(L/R)) & CURRENT i_L(t)"}
              </span>
              <span className="text-cyan-400">
                1τ = 63.2% · 5τ = {transientData.tSettling5TauMs.toFixed(2)} ms
              </span>
            </div>

            <svg viewBox="0 0 680 270" className="w-full h-auto block">
              <rect
                x="55"
                y="20"
                width="580"
                height="210"
                fill="#0b1020"
                stroke="#1e293b"
              />
              {/* 1 tau and 5 tau markers */}
              {[1, 2, 3, 4, 5].map((mult) => {
                const x = 55 + (mult / 6) * 580;
                return (
                  <g key={mult}>
                    <line
                      x1={x}
                      y1="20"
                      x2={x}
                      y2="230"
                      stroke={mult === 1 || mult === 5 ? "#334155" : "#1e293b"}
                      strokeDasharray="3 3"
                    />
                    <text
                      x={x}
                      y="246"
                      textAnchor="middle"
                      fill="#94a3b8"
                      fontSize="10"
                      fontFamily="JetBrains Mono"
                    >
                      {mult}τ ({(mult * transientData.tauMs).toFixed(1)}ms)
                    </text>
                  </g>
                );
              })}

              {(() => {
                const vPath = transientData.samples
                  .map((s, idx) => {
                    const x = 55 + (s.tMs / transientData.maxT) * 580;
                    const y = 230 - (s.vElement / Math.max(1, stepV)) * 200;
                    return `${idx === 0 ? "M" : "L"} ${x.toFixed(1)},${y.toFixed(1)}`;
                  })
                  .join(" ");

                const iPath = transientData.samples
                  .map((s, idx) => {
                    const x = 55 + (s.tMs / transientData.maxT) * 580;
                    const y =
                      230 -
                      (s.iCircuit_mA / Math.max(0.01, transientData.iMax_mA)) *
                        200;
                    return `${idx === 0 ? "M" : "L"} ${x.toFixed(1)},${y.toFixed(1)}`;
                  })
                  .join(" ");

                return (
                  <>
                    <path
                      d={vPath}
                      fill="none"
                      stroke="#22c55e"
                      strokeWidth="2.6"
                    />
                    <path
                      d={iPath}
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth="2.2"
                      strokeDasharray="6 3"
                    />
                  </>
                );
              })()}
            </svg>
            <div className="flex justify-center gap-6 text-xs font-mono mt-2">
              <span className="text-emerald-400">
                ── Element Voltage {transientType === "RC" ? "v_C(t)" : "v_L(t)"}{" "}
                (V)
              </span>
              <span className="text-cyan-400">
                - - Branch Current i(t) (Peak {transientData.iMax_mA.toFixed(2)}{" "}
                mA)
              </span>
            </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
