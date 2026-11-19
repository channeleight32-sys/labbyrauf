import React, { useState, useMemo } from "react";
import { Calculator, Zap, Activity, Sliders, Cpu, Lightbulb } from "lucide-react";

type CalcMode =
  | "OHM"
  | "DIVIDER"
  | "SERIES_PARALLEL"
  | "TIME_CONSTANT"
  | "RLC_RESONANCE"
  | "OPAMP"
  | "TIMER_555"
  | "LED_RESISTOR";

const E12_BASE = [1.0, 1.2, 1.5, 1.8, 2.2, 2.7, 3.3, 3.9, 4.7, 5.6, 6.8, 8.2];

function nearestE12(ohms: number): number {
  if (!Number.isFinite(ohms) || ohms <= 0) return 0;
  const exp = Math.floor(Math.log10(ohms));
  const norm = ohms / Math.pow(10, exp);
  let best = E12_BASE[0];
  let bestDiff = Math.abs(norm - best);
  for (const val of E12_BASE) {
    const diff = Math.abs(norm - val);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = val;
    }
  }
  const cand = best * Math.pow(10, exp);
  const upCand = E12_BASE[0] * Math.pow(10, exp + 1);
  return Math.abs(upCand - ohms) < Math.abs(cand - ohms) ? upCand : cand;
}

function fmtEng(val: number, unit: string): string {
  if (!Number.isFinite(val)) return `— ${unit}`;
  const abs = Math.abs(val);
  if (abs === 0) return `0.00 ${unit}`;
  if (abs >= 1e6) return `${(val / 1e6).toFixed(3)} M${unit}`;
  if (abs >= 1e3) return `${(val / 1e3).toFixed(3)} k${unit}`;
  if (abs >= 1) return `${val.toFixed(3)} ${unit}`;
  if (abs >= 1e-3) return `${(val * 1e3).toFixed(3)} m${unit}`;
  if (abs >= 1e-6) return `${(val * 1e6).toFixed(3)} µ${unit}`;
  if (abs >= 1e-9) return `${(val * 1e9).toFixed(3)} n${unit}`;
  return `${(val * 1e12).toFixed(3)} p${unit}`;
}

export default function CircuitCalculator() {
  const [mode, setMode] = useState<CalcMode>("OHM");

  // 1. Ohm's Law
  const [ohmPair, setOhmPair] = useState<"VR" | "VI" | "IR" | "PV">("VR");
  const [ohmV, setOhmV] = useState<number>(12);
  const [ohmI, setOhmI] = useState<number>(0.02);
  const [ohmR, setOhmR] = useState<number>(470);
  const [ohmP, setOhmP] = useState<number>(0.25);

  const ohmResult = useMemo(() => {
    let V = ohmV;
    let I = ohmI;
    let R = ohmR;
    let P = ohmP;
    if (ohmPair === "VR") {
      R = Math.max(1e-6, ohmR);
      I = V / R;
      P = V * I;
    } else if (ohmPair === "VI") {
      I = Math.max(1e-9, ohmI);
      R = V / I;
      P = V * I;
    } else if (ohmPair === "IR") {
      R = Math.max(1e-6, ohmR);
      V = I * R;
      P = I * I * R;
    } else {
      V = Math.max(1e-6, ohmV);
      I = P / V;
      R = I > 1e-9 ? V / I : Infinity;
    }
    return { V, I, R, P };
  }, [ohmPair, ohmV, ohmI, ohmR, ohmP]);

  // 2. Voltage Divider
  const [divVin, setDivVin] = useState<number>(12);
  const [divR1, setDivR1] = useState<number>(10000);
  const [divR2, setDivR2] = useState<number>(4700);
  const [divRload, setDivRload] = useState<number>(0);

  const divResult = useMemo(() => {
    const r1 = Math.max(1e-3, divR1);
    const r2 = Math.max(1e-3, divR2);
    const effR2 =
      divRload > 0 ? (r2 * divRload) / (r2 + divRload) : r2;
    const vOutUnloaded = divVin * (r2 / (r1 + r2));
    const vOutLoaded = divVin * (effR2 / (r1 + effR2));
    const iTotal = divVin / (r1 + effR2);
    const pR1 = Math.pow(divVin - vOutLoaded, 2) / r1;
    const pR2 = Math.pow(vOutLoaded, 2) / r2;
    return { vOutUnloaded, vOutLoaded, iTotal, pR1, pR2, ratio: effR2 / (r1 + effR2) };
  }, [divVin, divR1, divR2, divRload]);

  // 3. Series / Parallel
  const [spType, setSpType] = useState<"R" | "C" | "L">("R");
  const [spValuesText, setSpValuesText] = useState<string>("100, 220, 470");
  const spResult = useMemo(() => {
    const vals = spValuesText
      .split(/[,;\s]+/)
      .map((s) => parseFloat(s))
      .filter((n) => Number.isFinite(n) && n > 0);
    if (vals.length === 0) return { series: 0, parallel: 0, count: 0 };
    const sum = vals.reduce((a, b) => a + b, 0);
    const invSum = vals.reduce((a, b) => a + 1 / b, 0);
    const recip = invSum > 0 ? 1 / invSum : 0;
    if (spType === "C") {
      // Capacitors add in parallel, combine reciprocally in series
      return { series: recip, parallel: sum, count: vals.length };
    }
    return { series: sum, parallel: recip, count: vals.length };
  }, [spType, spValuesText]);

  // 4. RC / RL Time Constant
  const [tcMode, setTcMode] = useState<"RC" | "RL">("RC");
  const [tcR, setTcR] = useState<number>(10000);
  const [tcCuF, setTcCuF] = useState<number>(10);
  const [tcLmH, setTcLmH] = useState<number>(47);
  const [tcVin, setTcVin] = useState<number>(5);

  const tcResult = useMemo(() => {
    const r = Math.max(1e-3, tcR);
    const tau =
      tcMode === "RC"
        ? r * (Math.max(1e-9, tcCuF) * 1e-6)
        : (Math.max(1e-9, tcLmH) * 1e-3) / r;
    const fc = 1 / (2 * Math.PI * tau);
    const steps = [1, 2, 3, 4, 5].map((k) => ({
      mult: k,
      time: k * tau,
      pct: (1 - Math.exp(-k)) * 100,
      volts: tcVin * (1 - Math.exp(-k)),
    }));
    return { tau, fc, settle5Tau: 5 * tau, steps };
  }, [tcMode, tcR, tcCuF, tcLmH, tcVin]);

  // 5. RLC Resonance
  const [rlcTopo, setRlcTopo] = useState<"SERIES" | "PARALLEL">("SERIES");
  const [rlcR, setRlcR] = useState<number>(50);
  const [rlcLmH, setRlcLmH] = useState<number>(10);
  const [rlcCuF, setRlcCuF] = useState<number>(1);

  const rlcResult = useMemo(() => {
    const R = Math.max(1e-3, rlcR);
    const L = Math.max(1e-12, rlcLmH * 1e-3);
    const C = Math.max(1e-12, rlcCuF * 1e-6);
    const f0 = 1 / (2 * Math.PI * Math.sqrt(L * C));
    const w0 = 2 * Math.PI * f0;
    const XL = w0 * L;
    const XC = 1 / (w0 * C);
    const Q =
      rlcTopo === "SERIES"
        ? (1 / R) * Math.sqrt(L / C)
        : R * Math.sqrt(C / L);
    const bw = f0 / Math.max(1e-6, Q);
    const zeta =
      rlcTopo === "SERIES"
        ? (R / 2) * Math.sqrt(C / L)
        : (1 / (2 * R)) * Math.sqrt(L / C);
    const regime =
      zeta < 0.99
        ? "Underdamped (Oscillatory)"
        : zeta > 1.01
        ? "Overdamped (Sluggish)"
        : "Critically Damped";
    return { f0, Q, bw, XL, XC, zeta, regime };
  }, [rlcTopo, rlcR, rlcLmH, rlcCuF]);

  // 6. Op-Amp
  const [opTopo, setOpTopo] = useState<"INVERTING" | "NON_INVERTING">("NON_INVERTING");
  const [opRin, setOpRin] = useState<number>(10000);
  const [opRf, setOpRf] = useState<number>(47000);
  const [opVin, setOpVin] = useState<number>(1.0);

  const opResult = useMemo(() => {
    const rin = Math.max(1, opRin);
    const gain = opTopo === "INVERTING" ? -(opRf / rin) : 1 + opRf / rin;
    const gainDb = 20 * Math.log10(Math.max(1e-6, Math.abs(gain)));
    const vOut = opVin * gain;
    return { gain, gainDb, vOut };
  }, [opTopo, opRin, opRf, opVin]);

  // 7. 555 Timer
  const [t555Mode, setT555Mode] = useState<"ASTABLE" | "MONOSTABLE">("ASTABLE");
  const [t555Ra, setT555Ra] = useState<number>(10000);
  const [t555Rb, setT555Rb] = useState<number>(47000);
  const [t555CuF, setT555CuF] = useState<number>(10);

  const t555Result = useMemo(() => {
    const c = Math.max(1e-12, t555CuF * 1e-6);
    if (t555Mode === "MONOSTABLE") {
      const pulse = 1.1 * t555Ra * c;
      return { tHigh: pulse, tLow: 0, period: pulse, freq: 1 / pulse, duty: 100 };
    }
    const tHigh = 0.693 * (t555Ra + t555Rb) * c;
    const tLow = 0.693 * t555Rb * c;
    const period = tHigh + tLow;
    const freq = 1 / period;
    const duty = (tHigh / period) * 100;
    return { tHigh, tLow, period, freq, duty };
  }, [t555Mode, t555Ra, t555Rb, t555CuF]);

  // 8. LED Resistor
  const [ledVs, setLedVs] = useState<number>(5.0);
  const [ledVf, setLedVf] = useState<number>(2.1);
  const [ledIfMa, setLedIfMa] = useState<number>(15);

  const ledResult = useMemo(() => {
    const vDrop = Math.max(0, ledVs - ledVf);
    const iAmps = Math.max(1e-4, ledIfMa / 1000);
    const exactR = vDrop / iAmps;
    const e12R = nearestE12(exactR);
    const actualIMa = e12R > 0 ? (vDrop / e12R) * 1000 : 0;
    const powerW = Math.pow(actualIMa / 1000, 2) * e12R;
    return { vDrop, exactR, e12R, actualIMa, powerW };
  }, [ledVs, ledVf, ledIfMa]);

  const tabs: { id: CalcMode; label: string }[] = [
    { id: "OHM", label: "Ohm's & Power Law" },
    { id: "DIVIDER", label: "Voltage Divider" },
    { id: "SERIES_PARALLEL", label: "Series / Parallel" },
    { id: "TIME_CONSTANT", label: "RC & RL Constants" },
    { id: "RLC_RESONANCE", label: "RLC Resonance" },
    { id: "OPAMP", label: "Op-Amp Gain" },
    { id: "TIMER_555", label: "NE555 Timer" },
    { id: "LED_RESISTOR", label: "LED Resistor Sizing" },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-[#0d1424] border border-[#1e2d4a] rounded-2xl p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-mono text-cyan-400 font-semibold flex items-center gap-1.5">
              <Calculator className="w-3.5 h-3.5" />
              ENGINEERING TOOLS · CIRCUIT CALCULATOR
            </div>
            <h2 className="font-display text-2xl font-bold text-white mt-0.5">
              Precision Electronics Design &amp; Formula Workbench
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-400">
            Standard E12 resistor snapping included
          </span>
        </div>

        {/* Mode Selector */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-800/80">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setMode(t.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                mode === t.id
                  ? "bg-cyan-400 text-slate-950 font-bold"
                  : "bg-[#080d18] text-slate-300 hover:text-white border border-[#1e2d4a]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* OHM'S LAW */}
      {mode === "OHM" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-5 bg-[#0d1424] border border-[#1e2d4a] rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-400" />
              Known Input Pair
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: "VR", label: "Voltage (V) & Resistance (Ω)" },
                { id: "VI", label: "Voltage (V) & Current (A)" },
                { id: "IR", label: "Current (A) & Resistance (Ω)" },
                { id: "PV", label: "Power (W) & Voltage (V)" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setOhmPair(opt.id as typeof ohmPair)}
                  className={`p-2.5 rounded-lg text-xs text-left font-medium border cursor-pointer ${
                    ohmPair === opt.id
                      ? "bg-cyan-500/15 border-cyan-400 text-cyan-300"
                      : "bg-[#080d18] border-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="space-y-3 pt-2">
              {(ohmPair === "VR" || ohmPair === "VI" || ohmPair === "PV") && (
                <label className="block space-y-1">
                  <span className="text-xs font-mono text-slate-300">Voltage V (Volts)</span>
                  <input
                    type="number"
                    step="0.1"
                    value={ohmV}
                    onChange={(e) => setOhmV(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-lg bg-[#080d18] border border-slate-700 text-sm font-mono text-white"
                  />
                </label>
              )}
              {(ohmPair === "VI" || ohmPair === "IR") && (
                <label className="block space-y-1">
                  <span className="text-xs font-mono text-slate-300">Current I (Amperes)</span>
                  <input
                    type="number"
                    step="0.001"
                    value={ohmI}
                    onChange={(e) => setOhmI(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-lg bg-[#080d18] border border-slate-700 text-sm font-mono text-white"
                  />
                </label>
              )}
              {(ohmPair === "VR" || ohmPair === "IR") && (
                <label className="block space-y-1">
                  <span className="text-xs font-mono text-slate-300">Resistance R (Ω)</span>
                  <input
                    type="number"
                    step="10"
                    value={ohmR}
                    onChange={(e) => setOhmR(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-lg bg-[#080d18] border border-slate-700 text-sm font-mono text-white"
                  />
                </label>
              )}
              {ohmPair === "PV" && (
                <label className="block space-y-1">
                  <span className="text-xs font-mono text-slate-300">Power P (Watts)</span>
                  <input
                    type="number"
                    step="0.05"
                    value={ohmP}
                    onChange={(e) => setOhmP(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-lg bg-[#080d18] border border-slate-700 text-sm font-mono text-white"
                  />
                </label>
              )}
            </div>
          </div>

          <div className="lg:col-span-7 bg-[#0d1424] border border-[#1e2d4a] rounded-2xl p-5 grid grid-cols-1 sm:grid-cols-2 gap-3.5 content-start">
            {[
              { label: "Voltage (V)", value: fmtEng(ohmResult.V, "V"), formula: "V = I × R = √(P × R)", accent: "text-cyan-400" },
              { label: "Current (I)", value: fmtEng(ohmResult.I, "A"), formula: "I = V / R = P / V", accent: "text-emerald-400" },
              { label: "Resistance (R)", value: fmtEng(ohmResult.R, "Ω"), formula: "R = V / I = V² / P", accent: "text-amber-300" },
              { label: "Power (P)", value: fmtEng(ohmResult.P, "W"), formula: "P = V × I = I² × R", accent: "text-purple-300" },
            ].map((card) => (
              <div key={card.label} className="bg-[#080d18] border border-slate-800 rounded-xl p-4 space-y-1.5">
                <div className="text-xs font-mono text-slate-400">{card.label}</div>
                <div className={`text-2xl font-mono font-bold tabular-nums ${card.accent}`}>
                  {card.value}
                </div>
                <div className="text-[11px] font-mono text-slate-500">{card.formula}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VOLTAGE DIVIDER */}
      {mode === "DIVIDER" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-5 bg-[#0d1424] border border-[#1e2d4a] rounded-2xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-white">Resistive Divider Parameters</h3>
            {[
              { label: "Input Voltage Vin (V)", val: divVin, set: setDivVin, step: 0.5 },
              { label: "Top Resistor R1 (Ω)", val: divR1, set: setDivR1, step: 100 },
              { label: "Bottom Resistor R2 (Ω)", val: divR2, set: setDivR2, step: 100 },
              { label: "Optional Load R_L (Ω, 0 = unloaded)", val: divRload, set: setDivRload, step: 1000 },
            ].map((f) => (
              <label key={f.label} className="block space-y-1">
                <span className="text-xs font-mono text-slate-300">{f.label}</span>
                <input
                  type="number"
                  step={f.step}
                  value={f.val}
                  onChange={(e) => f.set(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-lg bg-[#080d18] border border-slate-700 text-sm font-mono text-white"
                />
              </label>
            ))}
          </div>

          <div className="lg:col-span-7 bg-[#0d1424] border border-[#1e2d4a] rounded-2xl p-5 grid grid-cols-1 sm:grid-cols-2 gap-3.5 content-start">
            <div className="bg-[#080d18] border border-slate-800 rounded-xl p-4">
              <div className="text-xs font-mono text-slate-400">Output Voltage (Vout)</div>
              <div className="text-2xl font-mono font-bold text-cyan-400 tabular-nums mt-1">
                {divResult.vOutLoaded.toFixed(4)} V
              </div>
              <div className="text-[11px] font-mono text-slate-500 mt-1">
                Unloaded: {divResult.vOutUnloaded.toFixed(4)} V · Ratio {(divResult.ratio * 100).toFixed(2)}%
              </div>
            </div>
            <div className="bg-[#080d18] border border-slate-800 rounded-xl p-4">
              <div className="text-xs font-mono text-slate-400">Divider Current &amp; Wattage</div>
              <div className="text-2xl font-mono font-bold text-emerald-400 tabular-nums mt-1">
                {fmtEng(divResult.iTotal, "A")}
              </div>
              <div className="text-[11px] font-mono text-slate-500 mt-1">
                P(R1)={fmtEng(divResult.pR1, "W")} · P(R2)={fmtEng(divResult.pR2, "W")}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SERIES / PARALLEL */}
      {mode === "SERIES_PARALLEL" && (
        <div className="bg-[#0d1424] border border-[#1e2d4a] rounded-2xl p-5 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: "R", label: "Resistors (Ω)" },
              { id: "C", label: "Capacitors (µF)" },
              { id: "L", label: "Inductors (mH)" },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSpType(item.id as typeof spType)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                  spType === item.id
                    ? "bg-cyan-400 text-slate-950 font-bold"
                    : "bg-[#080d18] text-slate-300 border border-slate-800"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <label className="block space-y-1.5">
            <span className="text-xs font-mono text-slate-300">
              Comma-separated values ({spType === "R" ? "Ω" : spType === "C" ? "µF" : "mH"})
            </span>
            <input
              type="text"
              value={spValuesText}
              onChange={(e) => setSpValuesText(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#080d18] border border-slate-700 text-sm font-mono text-white"
            />
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-[#080d18] border border-slate-800 rounded-xl p-4">
              <div className="text-xs font-mono text-slate-400">Series Equivalent ({spResult.count} elements)</div>
              <div className="text-2xl font-mono font-bold text-cyan-400 tabular-nums mt-1">
                {spResult.series.toFixed(4)} {spType === "R" ? "Ω" : spType === "C" ? "µF" : "mH"}
              </div>
            </div>
            <div className="bg-[#080d18] border border-slate-800 rounded-xl p-4">
              <div className="text-xs font-mono text-slate-400">Parallel Equivalent ({spResult.count} elements)</div>
              <div className="text-2xl font-mono font-bold text-emerald-400 tabular-nums mt-1">
                {spResult.parallel.toFixed(4)} {spType === "R" ? "Ω" : spType === "C" ? "µF" : "mH"}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TIME CONSTANT */}
      {mode === "TIME_CONSTANT" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-5 bg-[#0d1424] border border-[#1e2d4a] rounded-2xl p-5 space-y-3">
            <div className="flex gap-2">
              {(["RC", "RL"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setTcMode(m)}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold cursor-pointer ${
                    tcMode === m ? "bg-cyan-400 text-slate-950" : "bg-[#080d18] text-slate-300 border border-slate-800"
                  }`}
                >
                  {m} Network
                </button>
              ))}
            </div>
            <label className="block space-y-1">
              <span className="text-xs font-mono text-slate-300">Resistance R (Ω)</span>
              <input type="number" value={tcR} onChange={(e) => setTcR(parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 rounded-lg bg-[#080d18] border border-slate-700 text-sm font-mono text-white" />
            </label>
            {tcMode === "RC" ? (
              <label className="block space-y-1">
                <span className="text-xs font-mono text-slate-300">Capacitance C (µF)</span>
                <input type="number" value={tcCuF} onChange={(e) => setTcCuF(parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 rounded-lg bg-[#080d18] border border-slate-700 text-sm font-mono text-white" />
              </label>
            ) : (
              <label className="block space-y-1">
                <span className="text-xs font-mono text-slate-300">Inductance L (mH)</span>
                <input type="number" value={tcLmH} onChange={(e) => setTcLmH(parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 rounded-lg bg-[#080d18] border border-slate-700 text-sm font-mono text-white" />
              </label>
            )}
            <label className="block space-y-1">
              <span className="text-xs font-mono text-slate-300">Step Voltage Vin (V)</span>
              <input type="number" value={tcVin} onChange={(e) => setTcVin(parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 rounded-lg bg-[#080d18] border border-slate-700 text-sm font-mono text-white" />
            </label>
          </div>

          <div className="lg:col-span-7 bg-[#0d1424] border border-[#1e2d4a] rounded-2xl p-5 space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-[#080d18] border border-slate-800 rounded-xl p-3">
                <div className="text-[11px] font-mono text-slate-400">Time Constant (τ)</div>
                <div className="text-lg font-mono font-bold text-cyan-400 tabular-nums">{fmtEng(tcResult.tau, "s")}</div>
              </div>
              <div className="bg-[#080d18] border border-slate-800 rounded-xl p-3">
                <div className="text-[11px] font-mono text-slate-400">-3dB Cutoff (fc)</div>
                <div className="text-lg font-mono font-bold text-emerald-400 tabular-nums">{fmtEng(tcResult.fc, "Hz")}</div>
              </div>
              <div className="bg-[#080d18] border border-slate-800 rounded-xl p-3">
                <div className="text-[11px] font-mono text-slate-400">5τ Settling</div>
                <div className="text-lg font-mono font-bold text-amber-300 tabular-nums">{fmtEng(tcResult.settle5Tau, "s")}</div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono text-left">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="py-2">Multiple</th>
                    <th className="py-2">Elapsed Time</th>
                    <th className="py-2">Charge %</th>
                    <th className="py-2">Step Level</th>
                  </tr>
                </thead>
                <tbody>
                  {tcResult.steps.map((s) => (
                    <tr key={s.mult} className="border-b border-slate-800/60 text-slate-200 tabular-nums">
                      <td className="py-1.5 text-cyan-300">{s.mult}τ</td>
                      <td className="py-1.5">{fmtEng(s.time, "s")}</td>
                      <td className="py-1.5 text-emerald-400">{s.pct.toFixed(2)}%</td>
                      <td className="py-1.5">{s.volts.toFixed(3)} V</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* RLC RESONANCE */}
      {mode === "RLC_RESONANCE" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-5 bg-[#0d1424] border border-[#1e2d4a] rounded-2xl p-5 space-y-3">
            <div className="flex gap-2">
              {(["SERIES", "PARALLEL"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setRlcTopo(t)}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold cursor-pointer ${
                    rlcTopo === t ? "bg-cyan-400 text-slate-950" : "bg-[#080d18] text-slate-300 border border-slate-800"
                  }`}
                >
                  {t} RLC
                </button>
              ))}
            </div>
            <label className="block space-y-1">
              <span className="text-xs font-mono text-slate-300">Resistance R (Ω)</span>
              <input type="number" value={rlcR} onChange={(e) => setRlcR(parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 rounded-lg bg-[#080d18] border border-slate-700 text-sm font-mono text-white" />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-mono text-slate-300">Inductance L (mH)</span>
              <input type="number" value={rlcLmH} onChange={(e) => setRlcLmH(parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 rounded-lg bg-[#080d18] border border-slate-700 text-sm font-mono text-white" />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-mono text-slate-300">Capacitance C (µF)</span>
              <input type="number" value={rlcCuF} onChange={(e) => setRlcCuF(parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 rounded-lg bg-[#080d18] border border-slate-700 text-sm font-mono text-white" />
            </label>
          </div>

          <div className="lg:col-span-7 bg-[#0d1424] border border-[#1e2d4a] rounded-2xl p-5 grid grid-cols-1 sm:grid-cols-2 gap-3.5 content-start">
            <div className="bg-[#080d18] border border-slate-800 rounded-xl p-4">
              <div className="text-xs font-mono text-slate-400">Resonant Frequency (f₀)</div>
              <div className="text-2xl font-mono font-bold text-cyan-400 tabular-nums mt-1">{fmtEng(rlcResult.f0, "Hz")}</div>
              <div className="text-[11px] font-mono text-slate-500 mt-1">XL = XC = {fmtEng(rlcResult.XL, "Ω")}</div>
            </div>
            <div className="bg-[#080d18] border border-slate-800 rounded-xl p-4">
              <div className="text-xs font-mono text-slate-400">Quality Factor (Q) &amp; BW</div>
              <div className="text-2xl font-mono font-bold text-emerald-400 tabular-nums mt-1">Q = {rlcResult.Q.toFixed(3)}</div>
              <div className="text-[11px] font-mono text-slate-500 mt-1">Bandwidth = {fmtEng(rlcResult.bw, "Hz")}</div>
            </div>
            <div className="sm:col-span-2 bg-[#080d18] border border-slate-800 rounded-xl p-4 flex items-center justify-between">
              <div>
                <div className="text-xs font-mono text-slate-400">Damping Factor (ζ)</div>
                <div className="text-lg font-mono font-bold text-amber-300 tabular-nums">{rlcResult.zeta.toFixed(4)}</div>
              </div>
              <div className="text-xs font-mono text-white bg-[#131f38] px-3 py-1.5 rounded-lg border border-[#243454]">
                {rlcResult.regime}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* OP-AMP */}
      {mode === "OPAMP" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-5 bg-[#0d1424] border border-[#1e2d4a] rounded-2xl p-5 space-y-3">
            <div className="flex gap-2">
              {(["NON_INVERTING", "INVERTING"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setOpTopo(t)}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold cursor-pointer ${
                    opTopo === t ? "bg-cyan-400 text-slate-950" : "bg-[#080d18] text-slate-300 border border-slate-800"
                  }`}
                >
                  {t === "INVERTING" ? "Inverting" : "Non-Inverting"}
                </button>
              ))}
            </div>
            <label className="block space-y-1">
              <span className="text-xs font-mono text-slate-300">Input Resistor Rin / Rg (Ω)</span>
              <input type="number" value={opRin} onChange={(e) => setOpRin(parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 rounded-lg bg-[#080d18] border border-slate-700 text-sm font-mono text-white" />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-mono text-slate-300">Feedback Resistor Rf (Ω)</span>
              <input type="number" value={opRf} onChange={(e) => setOpRf(parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 rounded-lg bg-[#080d18] border border-slate-700 text-sm font-mono text-white" />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-mono text-slate-300">Input Signal Vin (V)</span>
              <input type="number" step="0.1" value={opVin} onChange={(e) => setOpVin(parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 rounded-lg bg-[#080d18] border border-slate-700 text-sm font-mono text-white" />
            </label>
          </div>

          <div className="lg:col-span-7 bg-[#0d1424] border border-[#1e2d4a] rounded-2xl p-5 grid grid-cols-1 sm:grid-cols-2 gap-3.5 content-start">
            <div className="bg-[#080d18] border border-slate-800 rounded-xl p-4">
              <div className="text-xs font-mono text-slate-400">Closed-Loop Gain (Av)</div>
              <div className="text-2xl font-mono font-bold text-cyan-400 tabular-nums mt-1">
                {opResult.gain.toFixed(3)} V/V ({opResult.gainDb.toFixed(2)} dB)
              </div>
              <div className="text-[11px] font-mono text-slate-500 mt-1">
                {opTopo === "INVERTING" ? "Av = -Rf / Rin" : "Av = 1 + Rf / Rg"}
              </div>
            </div>
            <div className="bg-[#080d18] border border-slate-800 rounded-xl p-4">
              <div className="text-xs font-mono text-slate-400">Output Voltage (Vout)</div>
              <div className="text-2xl font-mono font-bold text-emerald-400 tabular-nums mt-1">
                {opResult.vOut.toFixed(3)} V
              </div>
              <div className="text-[11px] font-mono text-slate-500 mt-1">
                Ideal linear model (check rail limits ±15V)
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 555 TIMER */}
      {mode === "TIMER_555" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-5 bg-[#0d1424] border border-[#1e2d4a] rounded-2xl p-5 space-y-3">
            <div className="flex gap-2">
              {(["ASTABLE", "MONOSTABLE"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setT555Mode(t)}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold cursor-pointer ${
                    t555Mode === t ? "bg-cyan-400 text-slate-950" : "bg-[#080d18] text-slate-300 border border-slate-800"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <label className="block space-y-1">
              <span className="text-xs font-mono text-slate-300">Resistor RA (Ω)</span>
              <input type="number" value={t555Ra} onChange={(e) => setT555Ra(parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 rounded-lg bg-[#080d18] border border-slate-700 text-sm font-mono text-white" />
            </label>
            {t555Mode === "ASTABLE" && (
              <label className="block space-y-1">
                <span className="text-xs font-mono text-slate-300">Resistor RB (Ω)</span>
                <input type="number" value={t555Rb} onChange={(e) => setT555Rb(parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 rounded-lg bg-[#080d18] border border-slate-700 text-sm font-mono text-white" />
              </label>
            )}
            <label className="block space-y-1">
              <span className="text-xs font-mono text-slate-300">Timing Capacitor C (µF)</span>
              <input type="number" step="0.1" value={t555CuF} onChange={(e) => setT555CuF(parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 rounded-lg bg-[#080d18] border border-slate-700 text-sm font-mono text-white" />
            </label>
          </div>

          <div className="lg:col-span-7 bg-[#0d1424] border border-[#1e2d4a] rounded-2xl p-5 grid grid-cols-2 gap-3.5 content-start">
            <div className="bg-[#080d18] border border-slate-800 rounded-xl p-4">
              <div className="text-xs font-mono text-slate-400">Output Frequency</div>
              <div className="text-2xl font-mono font-bold text-cyan-400 tabular-nums mt-1">{fmtEng(t555Result.freq, "Hz")}</div>
            </div>
            <div className="bg-[#080d18] border border-slate-800 rounded-xl p-4">
              <div className="text-xs font-mono text-slate-400">Duty Cycle</div>
              <div className="text-2xl font-mono font-bold text-emerald-400 tabular-nums mt-1">{t555Result.duty.toFixed(1)}%</div>
            </div>
            <div className="bg-[#080d18] border border-slate-800 rounded-xl p-4">
              <div className="text-xs font-mono text-slate-400">HIGH Time (Thigh)</div>
              <div className="text-lg font-mono font-bold text-white tabular-nums mt-1">{fmtEng(t555Result.tHigh, "s")}</div>
            </div>
            <div className="bg-[#080d18] border border-slate-800 rounded-xl p-4">
              <div className="text-xs font-mono text-slate-400">LOW Time (Tlow)</div>
              <div className="text-lg font-mono font-bold text-white tabular-nums mt-1">{fmtEng(t555Result.tLow, "s")}</div>
            </div>
          </div>
        </div>
      )}

      {/* LED RESISTOR SIZING */}
      {mode === "LED_RESISTOR" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-5 bg-[#0d1424] border border-[#1e2d4a] rounded-2xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-amber-400" />
              LED Bias Parameters
            </h3>
            <label className="block space-y-1">
              <span className="text-xs font-mono text-slate-300">Supply Voltage Vs (V)</span>
              <input type="number" step="0.1" value={ledVs} onChange={(e) => setLedVs(parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 rounded-lg bg-[#080d18] border border-slate-700 text-sm font-mono text-white" />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-mono text-slate-300">LED Forward Voltage Vf (V)</span>
              <input type="number" step="0.1" value={ledVf} onChange={(e) => setLedVf(parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 rounded-lg bg-[#080d18] border border-slate-700 text-sm font-mono text-white" />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-mono text-slate-300">Target Forward Current If (mA)</span>
              <input type="number" step="1" value={ledIfMa} onChange={(e) => setLedIfMa(parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 rounded-lg bg-[#080d18] border border-slate-700 text-sm font-mono text-white" />
            </label>
          </div>

          <div className="lg:col-span-7 bg-[#0d1424] border border-[#1e2d4a] rounded-2xl p-5 grid grid-cols-1 sm:grid-cols-2 gap-3.5 content-start">
            <div className="bg-[#080d18] border border-slate-800 rounded-xl p-4">
              <div className="text-xs font-mono text-slate-400">Calculated Exact Resistance</div>
              <div className="text-2xl font-mono font-bold text-cyan-400 tabular-nums mt-1">{ledResult.exactR.toFixed(1)} Ω</div>
              <div className="text-[11px] font-mono text-slate-500 mt-1">Drop across R: {ledResult.vDrop.toFixed(2)} V</div>
            </div>
            <div className="bg-[#080d18] border border-slate-800 rounded-xl p-4">
              <div className="text-xs font-mono text-slate-400">Nearest Standard E12 Resistor</div>
              <div className="text-2xl font-mono font-bold text-emerald-400 tabular-nums mt-1">{fmtEng(ledResult.e12R, "Ω")}</div>
              <div className="text-[11px] font-mono text-slate-500 mt-1">
                Actual If: {ledResult.actualIMa.toFixed(2)} mA · Power: {fmtEng(ledResult.powerW, "W")}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
