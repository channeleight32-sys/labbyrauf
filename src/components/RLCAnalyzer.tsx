import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { RotateCcw, Download } from "lucide-react";
import D3BodePlotPanel from "./D3BodePlotPanel";
import AnalogStage3D from "./AnalogStage3D";

type CircuitKind = "RC" | "RL" | "LC" | "RLC";
type ConfigKind = "series" | "parallel";
type OutputTap = "R" | "C" | "L";
type SweepTab = "freq" | "r" | "c" | "l";

const C_UNITS: Record<string, number> = {
  pF: 1e-12,
  nF: 1e-9,
  uF: 1e-6,
  mF: 1e-3,
  F: 1,
};

const L_UNITS: Record<string, number> = {
  nH: 1e-9,
  uH: 1e-6,
  mH: 1e-3,
  H: 1,
};

const FR_ABS_MIN = 1e-6;
const FR_ABS_MAX = 1e10;
const SLIDER_MAX = 1000;
const LOG_MIN = -6;
const LOG_MAX = 10;
const SWEEP_POINTS = 12;

function fmt(x: number, sig = 4): string {
  if (x === Infinity) return "∞";
  if (x === -Infinity) return "-∞";
  if (typeof x !== "number" || !isFinite(x) || isNaN(x)) return "--";
  if (x === 0) return "0";
  const a = Math.abs(x);
  if (a >= 1e7 || a < 1e-4) return x.toExponential(3);
  let s = x.toPrecision(sig);
  if (s.indexOf("e") >= 0) return s;
  if (s.indexOf(".") >= 0) s = s.replace(/0+$/, "").replace(/\.$/, "");
  return s;
}

function siHz(v: number): string {
  if (v === 0) return "0 Hz";
  if (v === Infinity) return "∞";
  if (!isFinite(v) || isNaN(v)) return "--";
  const u: [number, string][] = [
    [1e9, "GHz"],
    [1e6, "MHz"],
    [1e3, "kHz"],
    [1, "Hz"],
    [1e-3, "mHz"],
    [1e-6, "µHz"],
  ];
  for (let i = 0; i < u.length; i++) {
    if (v >= u[i][0]) {
      const n = v / u[i][0];
      return (
        (n >= 100 ? n.toFixed(0) : n >= 10 ? n.toFixed(1) : n.toFixed(2)) +
        " " +
        u[i][1]
      );
    }
  }
  return v.toExponential(1) + " Hz";
}

function siOhm(v: number): string {
  if (!isFinite(v)) return "∞";
  const a = Math.abs(v);
  if (a === 0) return "0 Ω";
  if (a >= 1e6) return (v / 1e6).toFixed(3) + " MΩ";
  if (a >= 1e3) return (v / 1e3).toFixed(3) + " kΩ";
  if (a < 1e-3) return v.toExponential(2) + " Ω";
  return v.toFixed(3) + " Ω";
}

function siUnit(v: number, unit: "F" | "H"): string {
  if (!isFinite(v)) return "--";
  const a = Math.abs(v);
  if (unit === "F") {
    if (a >= 1) return v.toFixed(3) + " F";
    if (a >= 1e-3) return (v / 1e-3).toFixed(3) + " mF";
    if (a >= 1e-6) return (v / 1e-6).toFixed(3) + " µF";
    if (a >= 1e-9) return (v / 1e-9).toFixed(3) + " nF";
    return (v / 1e-12).toFixed(3) + " pF";
  }
  if (unit === "H") {
    if (a >= 1) return v.toFixed(3) + " H";
    if (a >= 1e-3) return (v / 1e-3).toFixed(3) + " mH";
    if (a >= 1e-6) return (v / 1e-6).toFixed(3) + " µH";
    return (v / 1e-9).toFixed(3) + " nH";
  }
  return v.toPrecision(4);
}

function computeZ(
  circuit: CircuitKind,
  config: ConfigKind,
  f: number,
  R: number,
  C: number,
  L: number
): { re: number; im: number } {
  const w = 2 * Math.PI * Math.max(f, 1e-12);
  if (config === "series") {
    let re = 0;
    let im = 0;
    if (circuit !== "LC") re = R;
    if (circuit === "RL" || circuit === "RLC" || circuit === "LC") im += w * L;
    if (circuit === "RC" || circuit === "RLC" || circuit === "LC")
      im -= 1 / (w * C);
    return { re, im };
  }
  let Gre = 0;
  let Gim = 0;
  if (circuit !== "LC" && isFinite(R) && R > 0) Gre += 1 / R;
  if (
    (circuit === "RL" || circuit === "RLC" || circuit === "LC") &&
    isFinite(L) &&
    L > 0
  )
    Gim -= 1 / (w * L);
  if (
    (circuit === "RC" || circuit === "RLC" || circuit === "LC") &&
    isFinite(C) &&
    C > 0
  )
    Gim += w * C;
  const Y2 = Gre * Gre + Gim * Gim;
  if (Y2 < 1e-40) return { re: Infinity, im: 0 };
  return { re: Gre / Y2, im: -Gim / Y2 };
}

interface CalcPointResult {
  f: number;
  R: number;
  C: number;
  L: number;
  Xc: number;
  Xl: number;
  Zre: number;
  Zim: number;
  Zmag: number;
  Zang: number;
  phi: number;
  I: number;
  Vr: number;
  Vc: number;
  VL: number;
  Ir: number;
  Ic: number;
  IL: number;
  PF: number;
  S: number;
  P: number;
  Q: number;
  gainMag: number;
  gainDb: number;
  gainPhaseDeg: number;
}

function cDiv(ar: number, ai: number, br: number, bi: number): { re: number; im: number } {
  const denom = br * br + bi * bi;
  if (!isFinite(denom) || denom < 1e-40) {
    if (!isFinite(br) || !isFinite(bi)) return { re: 0, im: 0 };
    return { re: 0, im: 0 };
  }
  return {
    re: (ar * br + ai * bi) / denom,
    im: (ai * br - ar * bi) / denom,
  };
}

function calcPoint(
  circuit: CircuitKind,
  config: ConfigKind,
  outputTap: OutputTap,
  V: number,
  f: number,
  R: number,
  C: number,
  L: number
): CalcPointResult {
  const w = 2 * Math.PI * Math.max(f, 1e-12);
  const Xc = circuit !== "RL" ? 1 / (w * C) : NaN;
  const Xl = circuit !== "RC" ? w * L : NaN;
  const Z = computeZ(circuit, config, f, R, C, L);
  const Zre = Z.re;
  const Zim = Z.im;
  const Zmag = Math.sqrt(Zre * Zre + Zim * Zim);
  const Zang = (Math.atan2(Zim, Zre) * 180) / Math.PI;
  const phi = -Zang;
  const I = Zmag > 0 ? V / Zmag : Infinity;

  let Vr = NaN,
    Vc = NaN,
    VL = NaN;
  let Ir = NaN,
    Ic = NaN,
    IL = NaN;

  if (config === "series") {
    // Series: common current I flows through all components
    if (circuit !== "LC") {
      Vr = I * R;
      Ir = I;
    }
    if (circuit !== "RL") {
      Vc = I * Xc;
      Ic = I;
    }
    if (circuit !== "RC") {
      VL = I * Xl;
      IL = I;
    }
  } else {
    // Parallel: supply voltage V appears across each branch; branch currents differ
    if (circuit !== "LC") {
      Vr = V;
      Ir = V / R;
    }
    if (circuit !== "RL") {
      Vc = V;
      Ic = V / Xc;
    }
    if (circuit !== "RC") {
      VL = V;
      IL = V / Xl;
    }
  }

  const PF = Zmag > 0 && isFinite(Zmag) ? Zre / Zmag : 0;
  const S = V * I;
  const P = I * I * Zre;
  const Q = I * I * Math.abs(Zim);

  // Compute Complex Voltage/Current Transfer Function H(jw) = |H|∠θ
  let hRe = 1;
  let hIm = 0;
  if (circuit === "RC") {
    if (config === "series") {
      const h =
        outputTap === "C"
          ? cDiv(0, -Xc, R, -Xc)
          : cDiv(R, 0, R, -Xc);
      hRe = h.re;
      hIm = h.im;
    } else {
      const gR = 1 / R;
      const bC = 1 / Xc;
      const h =
        outputTap === "C"
          ? cDiv(0, bC, gR, bC)
          : cDiv(gR, 0, gR, bC);
      hRe = h.re;
      hIm = h.im;
    }
  } else if (circuit === "RL") {
    if (config === "series") {
      const h =
        outputTap === "R"
          ? cDiv(R, 0, R, Xl)
          : cDiv(0, Xl, R, Xl);
      hRe = h.re;
      hIm = h.im;
    } else {
      const gR = 1 / R;
      const bL = -1 / Xl;
      const h =
        outputTap === "R"
          ? cDiv(gR, 0, gR, bL)
          : cDiv(0, bL, gR, bL);
      hRe = h.re;
      hIm = h.im;
    }
  } else if (circuit === "RLC") {
    if (config === "series") {
      const zIm = Xl - Xc;
      const h =
        outputTap === "C"
          ? cDiv(0, -Xc, R, zIm)
          : outputTap === "L"
          ? cDiv(0, Xl, R, zIm)
          : cDiv(R, 0, R, zIm);
      hRe = h.re;
      hIm = h.im;
    } else {
      const Ztank = computeZ("LC", "parallel", f, R, C, L);
      if (!isFinite(Ztank.re) || !isFinite(Ztank.im)) {
        hRe = outputTap === "R" ? 0 : 1;
        hIm = 0;
      } else if (outputTap === "R") {
        // Notch / Band-Stop output across series R feeding parallel LC tank
        const h = cDiv(R, 0, R + Ztank.re, Ztank.im);
        hRe = h.re;
        hIm = h.im;
      } else {
        const h = cDiv(Ztank.re, Ztank.im, R + Ztank.re, Ztank.im);
        hRe = h.re;
        hIm = h.im;
      }
    }
  } else if (circuit === "LC") {
    const z0 = Math.sqrt(L / C);
    const rParasitic = Math.max(1e-3, z0 * 0.02);
    if (config === "series") {
      const h = cDiv(rParasitic, 0, rParasitic, Xl - Xc);
      hRe = h.re;
      hIm = h.im;
    } else {
      const Ztank = computeZ("LC", "parallel", f, rParasitic, C, L);
      if (!isFinite(Ztank.re) || !isFinite(Ztank.im)) {
        hRe = 0;
        hIm = 0;
      } else {
        const h = cDiv(rParasitic, 0, rParasitic + Ztank.re, Ztank.im);
        hRe = h.re;
        hIm = h.im;
      }
    }
  }

  const gainMag = Math.hypot(hRe, hIm);
  const gainDb = gainMag > 1e-9 ? 20 * Math.log10(gainMag) : -180;
  const gainPhaseDeg = (Math.atan2(hIm, hRe) * 180) / Math.PI;

  return {
    f,
    R,
    C,
    L,
    Xc,
    Xl,
    Zre,
    Zim,
    Zmag,
    Zang,
    phi,
    I,
    Vr,
    Vc,
    VL,
    Ir,
    Ic,
    IL,
    PF,
    S,
    P,
    Q,
    gainMag,
    gainDb,
    gainPhaseDeg,
  };
}

function sampleLog(lo: number, hi: number, n: number): number[] {
  const res: number[] = [];
  const lgL = Math.log10(lo);
  const lgH = Math.log10(hi);
  for (let i = 0; i < n; i++) {
    res.push(Math.pow(10, lgL + ((lgH - lgL) * i) / (n - 1)));
  }
  return res;
}

export interface RLCInitialConfig {
  circuit?: CircuitKind;
  config?: ConfigKind;
  outputTap?: OutputTap;
  vin?: number;
  rVal?: number;
  cVal?: number;
  cUnit?: string;
  lVal?: number;
  lUnit?: string;
  fVal?: number;
  loadKey?: number | string;
}

export default function RLCAnalyzer({ initialConfig }: { initialConfig?: RLCInitialConfig } = {}) {
  const [circuit, setCircuit] = useState<CircuitKind>("RLC");
  const [config, setConfig] = useState<ConfigKind>("series");
  const [outputTap, setOutputTap] = useState<OutputTap>("C");
  const [sweepTab, setSweepTab] = useState<SweepTab>("freq");

  // Component & operating point inputs
  const [vin, setVin] = useState<number>(10);
  const [rVal, setRVal] = useState<number>(1000);
  const [cVal, setCVal] = useState<number>(1);
  const [cUnit, setCUnit] = useState<string>("uF");
  const [lVal, setLVal] = useState<number>(10);
  const [lUnit, setLUnit] = useState<string>("mH");
  const [fVal, setFVal] = useState<number>(1000);

  // Sweep range inputs
  const [fMin, setFMin] = useState<number>(1);
  const [fMax, setFMax] = useState<number>(1000000000);
  const [rMin, setRMin] = useState<number>(100);
  const [rMax, setRMax] = useState<number>(100000);
  const [cMin, setCMin] = useState<number>(0.001);
  const [cMax, setCMax] = useState<number>(1000);
  const [lMin, setLMin] = useState<number>(0.01);
  const [lMax, setLMax] = useState<number>(10000);

  // Canvas refs
  const bandBarRef = useRef<HTMLCanvasElement | null>(null);
  const chart1Ref = useRef<HTMLCanvasElement | null>(null);
  const chart2Ref = useRef<HTMLCanvasElement | null>(null);
  const chart3Ref = useRef<HTMLCanvasElement | null>(null);
  const chartBodeRef = useRef<HTMLCanvasElement | null>(null);
  const chartPhasorRef = useRef<HTMLCanvasElement | null>(null);
  const chartPowerTriRef = useRef<HTMLCanvasElement | null>(null);
  const chartTimeRef = useRef<HTMLCanvasElement | null>(null);
  const chartPwrFreqRef = useRef<HTMLCanvasElement | null>(null);
  const chartSweepRRef = useRef<HTMLCanvasElement | null>(null);
  const chartSweepCRef = useRef<HTMLCanvasElement | null>(null);
  const chartSweepLRef = useRef<HTMLCanvasElement | null>(null);

  // Keep outputTap valid when switching between RC and RL
  useEffect(() => {
    if (circuit === "RC" && outputTap === "L") setOutputTap("C");
    if (circuit === "RL" && outputTap === "C") setOutputTap("R");
    if (
      (sweepTab === "r" && circuit === "LC") ||
      (sweepTab === "c" && circuit === "RL") ||
      (sweepTab === "l" && circuit === "RC")
    ) {
      setSweepTab("freq");
    }
  }, [circuit, outputTap, sweepTab]);

  useEffect(() => {
    if (!initialConfig) return;
    if (initialConfig.circuit) setCircuit(initialConfig.circuit);
    if (initialConfig.config) setConfig(initialConfig.config);
    if (initialConfig.outputTap) setOutputTap(initialConfig.outputTap);
    if (initialConfig.vin !== undefined) setVin(initialConfig.vin);
    if (initialConfig.rVal !== undefined) setRVal(initialConfig.rVal);
    if (initialConfig.cVal !== undefined) setCVal(initialConfig.cVal);
    if (initialConfig.cUnit) setCUnit(initialConfig.cUnit);
    if (initialConfig.lVal !== undefined) setLVal(initialConfig.lVal);
    if (initialConfig.lUnit) setLUnit(initialConfig.lUnit);
    if (initialConfig.fVal !== undefined) setFVal(initialConfig.fVal);
  }, [initialConfig]);

  // Derived SI values & complete state
  const st = useMemo(() => {
    const V = vin;
    const f = fVal;
    const R = circuit === "LC" ? NaN : rVal;
    const C = circuit === "RL" ? NaN : cVal * C_UNITS[cUnit];
    const L = circuit === "RC" ? NaN : lVal * L_UNITS[lUnit];

    let ok = isFinite(V) && V >= 0 && isFinite(f) && f >= 0 && f <= FR_ABS_MAX;
    if (circuit !== "LC" && (!isFinite(R) || R <= 0)) ok = false;
    if (circuit !== "RL" && (!isFinite(C) || C <= 0)) ok = false;
    if (circuit !== "RC" && (!isFinite(L) || L <= 0)) ok = false;

    if (!ok) {
      return {
        ok: false,
        circuit,
        config,
        V,
        R,
        C,
        L,
        f,
        Xc: NaN,
        Xl: NaN,
        Zre: NaN,
        Zim: NaN,
        Zmag: NaN,
        Zang: NaN,
        phi: NaN,
        I: NaN,
        Vr: NaN,
        Vc: NaN,
        VL: NaN,
        Ir: NaN,
        Ic: NaN,
        IL: NaN,
        PF: NaN,
        S: NaN,
        P: NaN,
        Q: NaN,
        fc: NaN,
        f0: NaN,
        f1: NaN,
        f2: NaN,
        tau: NaN,
        T: NaN,
        Qfactor: NaN,
        BW: NaN,
        Vm: NaN,
        Im: NaN,
        Y: NaN,
        G: NaN,
        B: NaN,
        gainMag: NaN,
        gainDb: NaN,
        gainPhaseDeg: NaN,
        zeta: NaN,
        dampingMode: "--",
      };
    }

    const pt = calcPoint(circuit, config, outputTap, V, f, R, C, L);
    let fc = NaN,
      f0 = NaN,
      f1 = NaN,
      f2 = NaN,
      tau = NaN,
      Qfactor = NaN,
      BW = NaN,
      zeta = NaN,
      dampingMode = "First-Order Exponential";

    if (circuit === "RC") {
      fc = 1 / (2 * Math.PI * R * C);
      tau = R * C;
    } else if (circuit === "RL") {
      fc = R / (2 * Math.PI * L);
      tau = L / R;
    } else if (circuit === "LC" || circuit === "RLC") {
      f0 = 1 / (2 * Math.PI * Math.sqrt(L * C));
    }

    if (circuit === "RLC" && R > 0) {
      const Z0 = Math.sqrt(L / C);
      Qfactor = config === "series" ? Z0 / R : R / Z0;
      zeta = 1 / (2 * Qfactor);
      tau = config === "series" ? (2 * L) / R : 2 * R * C;
      if (Math.abs(zeta - 1) < 0.02) dampingMode = "Critically Damped (ζ ≈ 1)";
      else if (zeta > 1) dampingMode = "Overdamped (ζ > 1, Non-Oscillatory)";
      else dampingMode = "Underdamped (ζ < 1, Ringing)";

      if (f0) BW = f0 / Qfactor;
      const x = 1 / (2 * Qfactor);
      f1 = f0 * (-x + Math.sqrt(x * x + 1));
      f2 = f0 * (x + Math.sqrt(x * x + 1));
    } else if (circuit === "LC") {
      Qfactor = Infinity;
      zeta = 0;
      dampingMode = "Undamped Harmonic Oscillator (ζ = 0)";
      f1 = f0;
      f2 = f0;
      BW = 0;
    }

    const T = f > 0 ? 1 / f : Infinity;
    const Vm = V * Math.SQRT2;
    const Im = pt.I * Math.SQRT2;
    const Zm2 = pt.Zmag * pt.Zmag;
    const Y = Zm2 > 0 ? 1 / pt.Zmag : Infinity;
    const G = Zm2 > 0 ? pt.Zre / Zm2 : 0;
    const B = Zm2 > 0 ? -pt.Zim / Zm2 : 0;

    return {
      ok: true,
      circuit,
      config,
      V,
      ...pt,
      fc,
      f0,
      f1,
      f2,
      tau,
      T,
      Qfactor,
      BW,
      Vm,
      Im,
      Y,
      G,
      B,
      zeta,
      dampingMode,
    };
  }, [circuit, config, outputTap, vin, rVal, cVal, cUnit, lVal, lUnit, fVal]);

  const bodeRechartsInfo = useMemo(() => {
    if (!st.ok) {
      return {
        data: [],
        logLo: 0,
        logHi: 6,
        decadeTicks: [0, 2, 4, 6],
        dbMax: 6,
        opLogF: null as number | null,
        resLogF: null as number | null,
      };
    }
    const N = 160;
    const lo = isFinite(fMin) && fMin >= FR_ABS_MIN ? fMin : FR_ABS_MIN;
    let hi = isFinite(fMax) && fMax > lo ? fMax : lo * 1000;
    if (hi > FR_ABS_MAX) hi = FR_ABS_MAX;
    const logLo = Math.log10(lo);
    const logHi = Math.log10(hi);
    const critHz = isFinite(st.f0) ? st.f0 : isFinite(st.fc) ? st.fc : NaN;

    const freqSet = new Set<number>();
    for (let i = 0; i <= N; i++) {
      freqSet.add(Math.pow(10, logLo + ((logHi - logLo) * i) / N));
    }
    if (isFinite(st.f) && st.f >= lo && st.f <= hi) freqSet.add(st.f);
    if (isFinite(critHz) && critHz >= lo && critHz <= hi) freqSet.add(critHz);
    if (isFinite(st.f1) && st.f1 >= lo && st.f1 <= hi) freqSet.add(st.f1);
    if (isFinite(st.f2) && st.f2 >= lo && st.f2 <= hi) freqSet.add(st.f2);

    const sortedFreqs = Array.from(freqSet).sort((a, b) => a - b);
    let maxDbSeen = 0;
    const data = sortedFreqs.map((fq) => {
      const p = calcPoint(circuit, config, outputTap, st.V, fq, st.R, st.C, st.L);
      const clampedDb = Math.max(-60, Math.min(30, p.gainDb));
      if (clampedDb > maxDbSeen) maxDbSeen = clampedDb;
      return {
        logF: Number(Math.log10(fq).toFixed(4)),
        freqHz: fq,
        freqLabel: siHz(fq).replace(" ", ""),
        gainDb: Number(clampedDb.toFixed(2)),
        gainMag: Number(p.gainMag.toFixed(4)),
        phaseDeg: Number(p.gainPhaseDeg.toFixed(1)),
        circuitPhiDeg: Number(p.phi.toFixed(1)),
        zMag: Number(p.Zmag.toFixed(2)),
      };
    });

    const spanDecades = Math.max(1, Math.floor(logHi) - Math.ceil(logLo));
    const tickStep = spanDecades > 7 ? 2 : 1;
    const decadeTicks: number[] = [];
    for (let e = Math.ceil(logLo); e <= Math.floor(logHi); e += tickStep) {
      decadeTicks.push(e);
    }

    const dbMax = Math.max(6, Math.min(30, Math.ceil((maxDbSeen + 2) / 6) * 6));
    const opLogF = isFinite(st.f) && st.f >= lo && st.f <= hi ? Math.log10(st.f) : null;
    const resLogF = isFinite(critHz) && critHz >= lo && critHz <= hi ? Math.log10(critHz) : null;

    return {
      data,
      logLo,
      logHi,
      decadeTicks,
      dbMax,
      opLogF,
      resLogF,
    };
  }, [st, fMin, fMax, circuit, config, outputTap]);

  // Filter classification
  const filterInfo = useMemo(() => {
    if (!st.ok) return null;
    const { R, C, L } = st;
    const info = {
      type: "" as "lpf" | "hpf" | "bpf" | "bsf",
      icon: "?",
      name: "",
      desc: "",
      fc: NaN,
      f0: NaN,
      f1: NaN,
      f2: NaN,
      bw: NaN,
      Q: NaN,
      passband: "",
      stopband: "",
    };

    if (circuit === "RC") {
      const fcRC = 1 / (2 * Math.PI * R * C);
      info.fc = fcRC;
      if (outputTap === "C") {
        info.type = "lpf";
        info.icon = "LP";
        info.name = "Low Pass Filter (LPF)";
        info.desc =
          "Output across C — passes low frequencies, attenuates above fc. At fc, gain = −3 dB (0.707).";
        info.passband = `0 Hz → ${siHz(fcRC)} (DC up to cutoff)`;
        info.stopband = `${siHz(fcRC)} → ∞ (−20 dB/decade roll-off)`;
      } else {
        info.type = "hpf";
        info.icon = "HP";
        info.name = "High Pass Filter (HPF)";
        info.desc =
          "Output across R — passes high frequencies, attenuates below fc. At fc, gain = −3 dB (0.707).";
        info.passband = `${siHz(fcRC)} → ∞ (from cutoff)`;
        info.stopband = `0 Hz → ${siHz(fcRC)} (+20 dB/decade roll-off)`;
      }
    } else if (circuit === "RL") {
      const fcRL = R / (2 * Math.PI * L);
      info.fc = fcRL;
      if (outputTap === "R") {
        info.type = "lpf";
        info.icon = "LP";
        info.name = "Low Pass Filter (LPF)";
        info.desc = "Output across R — inductor blocks high frequencies above fc.";
        info.passband = `0 Hz → ${siHz(fcRL)}`;
        info.stopband = `${siHz(fcRL)} → ∞`;
      } else {
        info.type = "hpf";
        info.icon = "HP";
        info.name = "High Pass Filter (HPF)";
        info.desc = "Output across L — attenuates low frequencies below fc.";
        info.passband = `${siHz(fcRL)} → ∞`;
        info.stopband = `0 Hz → ${siHz(fcRL)}`;
      }
    } else if (circuit === "LC") {
      info.f0 = st.f0;
      info.f1 = st.f0;
      info.f2 = st.f0;
      info.bw = 0;
      if (config === "series") {
        info.type = "bpf";
        info.icon = "BP";
        info.name = "Band Pass Filter (BPF)";
        info.desc =
          "Ideal LC series — impedance minimum (Z → 0) at f₀, passes resonant frequency.";
        info.passband = `≈ ${siHz(st.f0)} (ideal narrow band)`;
        info.stopband = `0 – ${siHz(st.f0)} and ${siHz(st.f0)} – ∞`;
      } else {
        info.type = "bsf";
        info.icon = "BS";
        info.name = "Band Stop (Notch) Filter";
        info.desc =
          "Ideal LC parallel tank — impedance maximum (Z → ∞) at f₀, rejects resonant frequency.";
        info.stopband = `≈ ${siHz(st.f0)} (ideal narrow notch)`;
        info.passband = `0 – ${siHz(st.f0)} and ${siHz(st.f0)} – ∞`;
      }
    } else {
      info.f0 = st.f0;
      info.f1 = st.f1;
      info.f2 = st.f2;
      info.bw = st.BW;
      info.Q = st.Qfactor;
      if (config === "series") {
        info.type = "bpf";
        info.icon = "BP";
        info.name = "Band Pass Filter (BPF)";
        info.desc =
          "Series RLC — passes frequencies between f₁ and f₂ (−3 dB points). |Z| minimum = R at f₀.";
        info.passband = `${siHz(st.f1)} → ${siHz(st.f2)} (BW = ${siHz(st.BW)})`;
        info.stopband = `0 – ${siHz(st.f1)} and ${siHz(st.f2)} – ∞`;
      } else {
        info.type = "bsf";
        info.icon = "BS";
        info.name = "Band Stop (Notch) Filter";
        info.desc =
          "Parallel RLC — rejects frequencies between f₁ and f₂ (−3 dB points). |Z| maximum = R at f₀.";
        info.stopband = `${siHz(st.f1)} → ${siHz(st.f2)} (BW = ${siHz(st.BW)})`;
        info.passband = `0 – ${siHz(st.f1)} and ${siHz(st.f2)} – ∞`;
      }
    }

    return info;
  }, [st, circuit, config, outputTap]);

  const getFRange = useCallback(() => {
    let lo = isFinite(fMin) && fMin >= FR_ABS_MIN ? fMin : FR_ABS_MIN;
    let hi = isFinite(fMax) && fMax > lo ? fMax : lo * 1000;
    if (hi > FR_ABS_MAX) hi = FR_ABS_MAX;
    return { lo, hi };
  }, [fMin, fMax]);

  const getRRange = useCallback(() => {
    const lo = isFinite(rMin) && rMin > 0 ? rMin : 1e-3;
    const hi = isFinite(rMax) && rMax > lo ? rMax : lo * 100;
    return { lo, hi };
  }, [rMin, rMax]);

  const getCRange = useCallback(() => {
    const u = C_UNITS[cUnit];
    const lo = isFinite(cMin) && cMin > 0 ? cMin * u : 1e-15;
    const hi = isFinite(cMax) && cMax * u > lo ? cMax * u : lo * 100;
    return { lo, hi };
  }, [cMin, cMax, cUnit]);

  const getLRange = useCallback(() => {
    const u = L_UNITS[lUnit];
    const lo = isFinite(lMin) && lMin > 0 ? lMin * u : 1e-15;
    const hi = isFinite(lMax) && lMax * u > lo ? lMax * u : lo * 100;
    return { lo, hi };
  }, [lMin, lMax, lUnit]);

  // Build Sweep Table Data
  const sweepData = useMemo(() => {
    if (!st.ok) return null;
    const { V, R: fixedR, C: fixedC, L: fixedL, f: fixedF } = st;
    const fRes = circuit === "RC" || circuit === "RL" ? st.fc : st.f0;

    if (sweepTab === "freq") {
      const fr = getFRange();
      const fVals = sampleLog(fr.lo, fr.hi, SWEEP_POINTS);
      const header =
        circuit === "LC"
          ? [
              "f (Hz)",
              "XC (Ω)",
              "XL (Ω)",
              "|Z| (Ω)",
              "φ (°)",
              "PF",
              "I (A)",
              "Vc (V)",
              "VL (V)",
              "P (W)",
              "Q (VAR)",
              "S (VA)",
            ]
          : circuit === "RC"
          ? [
              "f (Hz)",
              "XC (Ω)",
              "|Z| (Ω)",
              "φ (°)",
              "PF",
              "I (A)",
              "Vr (V)",
              "Vc (V)",
              "P (W)",
              "Q (VAR)",
              "S (VA)",
            ]
          : circuit === "RL"
          ? [
              "f (Hz)",
              "XL (Ω)",
              "|Z| (Ω)",
              "φ (°)",
              "PF",
              "I (A)",
              "Vr (V)",
              "VL (V)",
              "P (W)",
              "Q (VAR)",
              "S (VA)",
            ]
          : [
              "f (Hz)",
              "XC (Ω)",
              "XL (Ω)",
              "|Z| (Ω)",
              "φ (°)",
              "PF",
              "I (A)",
              "Vr (V)",
              "Vc (V)",
              "VL (V)",
              "P (W)",
              "Q (VAR)",
              "S (VA)",
            ];

      let minZ = Infinity,
        maxZ = 0,
        atMin = 0,
        atMax = 0;
      const rows = fVals.map((fv) => {
        const p = calcPoint(
          circuit,
          config,
          outputTap,
          V,
          fv,
          fixedR,
          fixedC,
          fixedL
        );
        if (isFinite(p.Zmag) && p.Zmag > 0) {
          if (p.Zmag < minZ) {
            minZ = p.Zmag;
            atMin = fv;
          }
          if (p.Zmag > maxZ) {
            maxZ = p.Zmag;
            atMax = fv;
          }
        }
        if (circuit === "LC")
          return [
            fv,
            p.Xc,
            p.Xl,
            p.Zmag,
            p.phi,
            p.PF,
            p.I,
            p.Vc,
            p.VL,
            p.P,
            p.Q,
            p.S,
          ];
        if (circuit === "RC")
          return [
            fv,
            p.Xc,
            p.Zmag,
            p.phi,
            p.PF,
            p.I,
            p.Vr,
            p.Vc,
            p.P,
            p.Q,
            p.S,
          ];
        if (circuit === "RL")
          return [
            fv,
            p.Xl,
            p.Zmag,
            p.phi,
            p.PF,
            p.I,
            p.Vr,
            p.VL,
            p.P,
            p.Q,
            p.S,
          ];
        return [
          fv,
          p.Xc,
          p.Xl,
          p.Zmag,
          p.phi,
          p.PF,
          p.I,
          p.Vr,
          p.Vc,
          p.VL,
          p.P,
          p.Q,
          p.S,
        ];
      });
      return {
        tab: sweepTab,
        header,
        rows,
        lo: fr.lo,
        hi: fr.hi,
        minZ,
        maxZ,
        atMin,
        atMax,
        fRes,
      };
    }

    if (sweepTab === "r") {
      const rr = getRRange();
      const rVals = sampleLog(rr.lo, rr.hi, SWEEP_POINTS);
      const header = [
        "R (Ω)",
        "XC (Ω)",
        "XL (Ω)",
        "|Z| (Ω)",
        "φ (°)",
        "PF",
        "I (A)",
        "Vr (V)",
        "P (W)",
        "Q (VAR)",
        "S (VA)",
      ];
      let minZ = Infinity,
        maxZ = 0,
        atMin = 0,
        atMax = 0;
      const rows = rVals.map((rv) => {
        const p = calcPoint(
          circuit,
          config,
          outputTap,
          V,
          fixedF,
          rv,
          fixedC,
          fixedL
        );
        if (isFinite(p.Zmag) && p.Zmag > 0) {
          if (p.Zmag < minZ) {
            minZ = p.Zmag;
            atMin = rv;
          }
          if (p.Zmag > maxZ) {
            maxZ = p.Zmag;
            atMax = rv;
          }
        }
        return [
          rv,
          p.Xc,
          p.Xl,
          p.Zmag,
          p.phi,
          p.PF,
          p.I,
          p.Vr,
          p.P,
          p.Q,
          p.S,
        ];
      });
      return {
        tab: sweepTab,
        header,
        rows,
        lo: rr.lo,
        hi: rr.hi,
        minZ,
        maxZ,
        atMin,
        atMax,
        fRes,
      };
    }

    if (sweepTab === "c") {
      const cr = getCRange();
      const cVals = sampleLog(cr.lo, cr.hi, SWEEP_POINTS);
      const header = [
        "C (F)",
        "XC (Ω)",
        "XL (Ω)",
        "|Z| (Ω)",
        "φ (°)",
        "PF",
        "I (A)",
        "Vc (V)",
        "P (W)",
        "Q (VAR)",
        "S (VA)",
      ];
      let minZ = Infinity,
        maxZ = 0,
        atMin = 0,
        atMax = 0;
      const rows = cVals.map((cv) => {
        const p = calcPoint(
          circuit,
          config,
          outputTap,
          V,
          fixedF,
          fixedR,
          cv,
          fixedL
        );
        if (isFinite(p.Zmag) && p.Zmag > 0) {
          if (p.Zmag < minZ) {
            minZ = p.Zmag;
            atMin = cv;
          }
          if (p.Zmag > maxZ) {
            maxZ = p.Zmag;
            atMax = cv;
          }
        }
        return [
          cv,
          p.Xc,
          p.Xl,
          p.Zmag,
          p.phi,
          p.PF,
          p.I,
          p.Vc,
          p.P,
          p.Q,
          p.S,
        ];
      });
      return {
        tab: sweepTab,
        header,
        rows,
        lo: cr.lo,
        hi: cr.hi,
        minZ,
        maxZ,
        atMin,
        atMax,
        fRes,
      };
    }

    const lr = getLRange();
    const lVals = sampleLog(lr.lo, lr.hi, SWEEP_POINTS);
    const header = [
      "L (H)",
      "XC (Ω)",
      "XL (Ω)",
      "|Z| (Ω)",
      "φ (°)",
      "PF",
      "I (A)",
      "VL (V)",
      "P (W)",
      "Q (VAR)",
      "S (VA)",
    ];
    let minZ = Infinity,
      maxZ = 0,
      atMin = 0,
      atMax = 0;
    const rows = lVals.map((lv) => {
      const p = calcPoint(
        circuit,
        config,
        outputTap,
        V,
        fixedF,
        fixedR,
        fixedC,
        lv
      );
      if (isFinite(p.Zmag) && p.Zmag > 0) {
        if (p.Zmag < minZ) {
          minZ = p.Zmag;
          atMin = lv;
        }
        if (p.Zmag > maxZ) {
          maxZ = p.Zmag;
          atMax = lv;
        }
      }
      return [
        lv,
        p.Xc,
        p.Xl,
        p.Zmag,
        p.phi,
        p.PF,
        p.I,
        p.VL,
        p.P,
        p.Q,
        p.S,
      ];
    });
    return {
      tab: sweepTab,
      header,
      rows,
      lo: lr.lo,
      hi: lr.hi,
      minZ,
      maxZ,
      atMin,
      atMax,
      fRes,
    };
  }, [
    st,
    circuit,
    config,
    outputTap,
    sweepTab,
    getFRange,
    getRRange,
    getCRange,
    getLRange,
  ]);

  // Draw all canvases whenever state or window size changes
  const drawAllCanvases = useCallback(() => {
    const prepCanvas = (cv: HTMLCanvasElement | null, defaultH: number) => {
      if (!cv) return null;
      const dpr = window.devicePixelRatio || 1;
      const cssW = cv.clientWidth || 640;
      const cssH = cv.clientHeight || defaultH;
      cv.width = Math.round(cssW * dpr);
      cv.height = Math.round(cssH * dpr);
      const ctx = cv.getContext("2d");
      if (!ctx) return null;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cssW, cssH);
      return { ctx, w: cssW, h: cssH };
    };

    const fr = getFRange();

    // 0. Band Bar Canvas
    const bb = prepCanvas(bandBarRef.current, 44);
    if (bb && filterInfo && st.ok) {
      const { ctx, w: cssW, h: cssH } = bb;
      const lgL = Math.log10(fr.lo);
      const lgH = Math.log10(fr.hi);
      const X = (fq: number) => {
        if (!isFinite(fq) || fq <= 0) return 0;
        const v = Math.log10(Math.max(fq, fr.lo));
        return ((v - lgL) / (lgH - lgL)) * cssW;
      };
      const pass = "rgba(52,211,153,0.28)";
      const stop = "rgba(248,113,113,0.15)";
      const passEdge =
        filterInfo.type === "lpf"
          ? "#34d399"
          : filterInfo.type === "hpf"
          ? "#a78bfa"
          : filterInfo.type === "bpf"
          ? "#38bdf8"
          : "#f472b6";

      if (filterInfo.type === "lpf") {
        const xc = X(filterInfo.fc);
        ctx.fillStyle = stop;
        ctx.fillRect(xc, 0, cssW - xc, cssH);
        ctx.fillStyle = pass;
        ctx.fillRect(0, 0, xc, cssH);
        ctx.strokeStyle = passEdge;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(xc, 0);
        ctx.lineTo(xc, cssH);
        ctx.stroke();
      } else if (filterInfo.type === "hpf") {
        const xc = X(filterInfo.fc);
        ctx.fillStyle = stop;
        ctx.fillRect(0, 0, xc, cssH);
        ctx.fillStyle = pass;
        ctx.fillRect(xc, 0, cssW - xc, cssH);
        ctx.strokeStyle = passEdge;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(xc, 0);
        ctx.lineTo(xc, cssH);
        ctx.stroke();
      } else if (filterInfo.type === "bpf") {
        const x1 = X(filterInfo.f1);
        const x2 = X(filterInfo.f2);
        ctx.fillStyle = stop;
        ctx.fillRect(0, 0, x1, cssH);
        ctx.fillRect(x2, 0, cssW - x2, cssH);
        ctx.fillStyle = pass;
        ctx.fillRect(x1, 0, x2 - x1, cssH);
        ctx.strokeStyle = passEdge;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x1, 0);
        ctx.lineTo(x1, cssH);
        ctx.moveTo(x2, 0);
        ctx.lineTo(x2, cssH);
        ctx.stroke();
      } else {
        const x1 = X(filterInfo.f1);
        const x2 = X(filterInfo.f2);
        ctx.fillStyle = pass;
        ctx.fillRect(0, 0, x1, cssH);
        ctx.fillRect(x2, 0, cssW - x2, cssH);
        ctx.fillStyle = "rgba(244,114,182,0.22)";
        ctx.fillRect(x1, 0, x2 - x1, cssH);
        ctx.strokeStyle = passEdge;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x1, 0);
        ctx.lineTo(x1, cssH);
        ctx.moveTo(x2, 0);
        ctx.lineTo(x2, cssH);
        ctx.stroke();
      }
    }

    const freqAxis = (
      ctx: CanvasRenderingContext2D,
      padL: number,
      padT: number,
      W: number,
      H: number,
      fLo: number,
      fHi: number
    ) => {
      const lgMin = Math.log10(fLo);
      const lgMax = Math.log10(fHi);
      const X = (fq: number) => {
        const v = Math.log10(Math.min(Math.max(fq, fLo), fHi));
        return padL + ((v - lgMin) / (lgMax - lgMin)) * W;
      };
      ctx.font = "11px JetBrains Mono, monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      for (let e = Math.ceil(lgMin); e <= Math.floor(lgMax); e++) {
        const fq = Math.pow(10, e);
        if (fq < fLo || fq > fHi) continue;
        const x = X(fq);
        ctx.beginPath();
        ctx.moveTo(x, padT);
        ctx.lineTo(x, padT + H);
        ctx.strokeStyle = "#1a2537";
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = "#7f93af";
        ctx.fillText(siHz(fq), x, padT + H + 6);
      }
      return X;
    };

    const drawMarkerLine = (
      ctx: CanvasRenderingContext2D,
      X: (fq: number) => number,
      padT: number,
      H: number,
      fq: number,
      color: string,
      label: string
    ) => {
      if (!isFinite(fq) || fq <= 0) return;
      const x = X(fq);
      ctx.save();
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(x, padT);
      ctx.lineTo(x, padT + H);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.3;
      ctx.stroke();
      ctx.restore();
      ctx.fillStyle = color;
      ctx.font = "10px JetBrains Mono, monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.fillText(label, x, padT - 3);
    };

    // 1. Chart 1: |Z| vs Frequency (log-log)
    const c1 = prepCanvas(chart1Ref.current, 320);
    if (c1 && st.ok) {
      const { ctx, w, h } = c1;
      const padL = 68,
        padR = 30,
        padT = 26,
        padB = 34;
      const W = Math.max(10, w - padL - padR);
      const H = Math.max(10, h - padT - padB);
      ctx.fillStyle = "#0c1526";
      ctx.fillRect(padL, padT, W, H);
      const X = freqAxis(ctx, padL, padT, W, H, fr.lo, fr.hi);

      const N = 320;
      const samples: { f: number; mag: number }[] = [];
      let minZ = Infinity,
        maxZ = 0;
      for (let i = 0; i <= N; i++) {
        const fq = Math.pow(
          10,
          Math.log10(fr.lo) +
            ((Math.log10(fr.hi) - Math.log10(fr.lo)) * i) / N
        );
        const p = calcPoint(
          circuit,
          config,
          outputTap,
          st.V,
          fq,
          st.R,
          st.C,
          st.L
        );
        samples.push({ f: fq, mag: p.Zmag });
        if (isFinite(p.Zmag) && p.Zmag > 0) {
          if (p.Zmag < minZ) minZ = p.Zmag;
          if (p.Zmag > maxZ) maxZ = p.Zmag;
        }
      }
      if (!isFinite(minZ) || minZ <= 0) minZ = 1e-3;
      if (maxZ <= 0) maxZ = 1;
      const yLo = Math.max(minZ / 3, 1e-6);
      const yHi = Math.max(yLo * 10, Math.min(maxZ * 3, 1e12));
      const lgYlo = Math.log10(yLo);
      const lgYhi = Math.log10(yHi);
      const Y = (m: number) =>
        padT +
        (1 - (Math.log10(Math.max(m, yLo)) - lgYlo) / (lgYhi - lgYlo)) * H;

      for (let e = Math.ceil(lgYlo); e <= Math.floor(lgYhi); e++) {
        const mv = Math.pow(10, e);
        const y = Y(mv);
        ctx.beginPath();
        ctx.moveTo(padL, y);
        ctx.lineTo(padL + W, y);
        ctx.strokeStyle = "#1a2537";
        ctx.stroke();
        ctx.fillStyle = "#7f93af";
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        ctx.fillText(siOhm(mv), padL - 8, y);
      }

      ctx.beginPath();
      samples.forEach((s, idx) => {
        const px = X(s.f);
        const py = Y(s.mag);
        if (idx === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 2.4;
      ctx.stroke();

      if (st.f > 0 && st.f >= fr.lo && st.f <= fr.hi) {
        ctx.beginPath();
        ctx.arc(X(st.f), Y(st.Zmag), 4.5, 0, Math.PI * 2);
        ctx.fillStyle = "#38bdf8";
        ctx.fill();
      }
      if (filterInfo) {
        if (isFinite(filterInfo.fc))
          drawMarkerLine(ctx, X, padT, H, filterInfo.fc, "#34d399", "fc");
        if (isFinite(filterInfo.f0))
          drawMarkerLine(ctx, X, padT, H, filterInfo.f0, "#34d399", "f₀");
        if (isFinite(filterInfo.f1) && filterInfo.f1 !== filterInfo.f2) {
          drawMarkerLine(ctx, X, padT, H, filterInfo.f1, "#fbbf24", "f₁");
          drawMarkerLine(ctx, X, padT, H, filterInfo.f2, "#fbbf24", "f₂");
        }
      }
      ctx.strokeStyle = "#2b3a55";
      ctx.strokeRect(padL, padT, W, H);
    }

    // 2. Chart 2: Phase Angle vs Frequency
    const c2 = prepCanvas(chart2Ref.current, 320);
    if (c2 && st.ok) {
      const { ctx, w, h } = c2;
      const padL = 58,
        padR = 30,
        padT = 26,
        padB = 34;
      const W = Math.max(10, w - padL - padR);
      const H = Math.max(10, h - padT - padB);
      ctx.fillStyle = "#0c1526";
      ctx.fillRect(padL, padT, W, H);
      const X = freqAxis(ctx, padL, padT, W, H, fr.lo, fr.hi);
      const Y = (p: number) => padT + ((90 - p) / 180) * H;
      [90, 45, 0, -45, -90].forEach((p) => {
        const y = Y(p);
        ctx.beginPath();
        ctx.moveTo(padL, y);
        ctx.lineTo(padL + W, y);
        ctx.strokeStyle = p === 0 ? "#2b3a55" : "#1a2537";
        ctx.stroke();
        ctx.fillStyle = "#7f93af";
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        ctx.fillText(`${p}°`, padL - 8, y);
      });

      const N = 320;
      ctx.beginPath();
      for (let i = 0; i <= N; i++) {
        const fq = Math.pow(
          10,
          Math.log10(fr.lo) +
            ((Math.log10(fr.hi) - Math.log10(fr.lo)) * i) / N
        );
        const p = calcPoint(
          circuit,
          config,
          outputTap,
          st.V,
          fq,
          st.R,
          st.C,
          st.L
        );
        const px = X(fq);
        const py = Y(p.phi);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.strokeStyle = "#a78bfa";
      ctx.lineWidth = 2.4;
      ctx.stroke();

      if (st.f > 0 && st.f >= fr.lo && st.f <= fr.hi) {
        ctx.beginPath();
        ctx.arc(X(st.f), Y(st.phi), 4.5, 0, Math.PI * 2);
        ctx.fillStyle = "#a78bfa";
        ctx.fill();
      }
      ctx.strokeStyle = "#2b3a55";
      ctx.strokeRect(padL, padT, W, H);
    }

    // 3. Chart 3: Power Factor vs Frequency
    const c3 = prepCanvas(chart3Ref.current, 320);
    if (c3 && st.ok) {
      const { ctx, w, h } = c3;
      const padL = 58,
        padR = 30,
        padT = 26,
        padB = 34;
      const W = Math.max(10, w - padL - padR);
      const H = Math.max(10, h - padT - padB);
      ctx.fillStyle = "#0c1526";
      ctx.fillRect(padL, padT, W, H);
      const X = freqAxis(ctx, padL, padT, W, H, fr.lo, fr.hi);
      const Y = (pf: number) => padT + (1 - pf) * H;
      [0, 0.25, 0.5, 0.707, 1].forEach((g) => {
        const y = Y(g);
        ctx.beginPath();
        ctx.moveTo(padL, y);
        ctx.lineTo(padL + W, y);
        ctx.strokeStyle = g === 0.707 ? "#2b3a55" : "#1a2537";
        ctx.stroke();
        ctx.fillStyle = "#7f93af";
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        ctx.fillText(g === 0.707 ? "0.707" : String(g), padL - 8, y);
      });

      const N = 320;
      ctx.beginPath();
      for (let i = 0; i <= N; i++) {
        const fq = Math.pow(
          10,
          Math.log10(fr.lo) +
            ((Math.log10(fr.hi) - Math.log10(fr.lo)) * i) / N
        );
        const p = calcPoint(
          circuit,
          config,
          outputTap,
          st.V,
          fq,
          st.R,
          st.C,
          st.L
        );
        const px = X(fq);
        const py = Y(Math.abs(p.PF));
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.strokeStyle = "#34d399";
      ctx.lineWidth = 2.4;
      ctx.stroke();

      if (st.f > 0 && st.f >= fr.lo && st.f <= fr.hi) {
        ctx.beginPath();
        ctx.arc(X(st.f), Y(Math.abs(st.PF)), 4.5, 0, Math.PI * 2);
        ctx.fillStyle = "#34d399";
        ctx.fill();
      }
      ctx.strokeStyle = "#2b3a55";
      ctx.strokeRect(padL, padT, W, H);
    }

    // 4. Bode Voltage Gain |H(jw)| in dB vs Frequency
    const cBode = prepCanvas(chartBodeRef.current, 320);
    if (cBode && st.ok) {
      const { ctx, w, h } = cBode;
      const padL = 58,
        padR = 30,
        padT = 26,
        padB = 34;
      const W = Math.max(10, w - padL - padR);
      const H = Math.max(10, h - padT - padB);
      ctx.fillStyle = "#0c1526";
      ctx.fillRect(padL, padT, W, H);
      const X = freqAxis(ctx, padL, padT, W, H, fr.lo, fr.hi);
      // dB axis from 0 dB down to -60 dB
      const Y = (db: number) => {
        const clamped = Math.max(-60, Math.min(6, db));
        return padT + ((6 - clamped) / 66) * H;
      };
      [0, -3, -20, -40, -60].forEach((db) => {
        const y = Y(db);
        ctx.beginPath();
        ctx.moveTo(padL, y);
        ctx.lineTo(padL + W, y);
        ctx.strokeStyle = db === -3 ? "#fbbf24" : "#1a2537";
        ctx.stroke();
        ctx.fillStyle = db === -3 ? "#fbbf24" : "#7f93af";
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        ctx.fillText(`${db} dB`, padL - 6, y);
      });

      const N = 320;
      ctx.beginPath();
      for (let i = 0; i <= N; i++) {
        const fq = Math.pow(
          10,
          Math.log10(fr.lo) +
            ((Math.log10(fr.hi) - Math.log10(fr.lo)) * i) / N
        );
        const p = calcPoint(
          circuit,
          config,
          outputTap,
          st.V,
          fq,
          st.R,
          st.C,
          st.L
        );
        const px = X(fq);
        const py = Y(p.gainDb);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.strokeStyle = "#f59e0b";
      ctx.lineWidth = 2.4;
      ctx.stroke();

      if (st.f > 0 && st.f >= fr.lo && st.f <= fr.hi) {
        ctx.beginPath();
        ctx.arc(X(st.f), Y(st.gainDb), 4.5, 0, Math.PI * 2);
        ctx.fillStyle = "#f59e0b";
        ctx.fill();
      }
      ctx.strokeStyle = "#2b3a55";
      ctx.strokeRect(padL, padT, W, H);
    }

    // 5. Phasor Diagram
    const cPhasor = prepCanvas(chartPhasorRef.current, 360);
    if (cPhasor && st.ok) {
      const { ctx, w, h } = cPhasor;
      const pad = 16;
      const W = w - pad * 2;
      const H = h - pad * 2;
      ctx.fillStyle = "#0c1526";
      ctx.fillRect(pad, pad, W, H);
      const ox = pad + W / 2;
      const oy = pad + H / 2;
      const Rmax = Math.max(20, Math.min(W, H) / 2 - 34);

      ctx.strokeStyle = "#1a2537";
      ctx.beginPath();
      ctx.moveTo(pad + 8, oy);
      ctx.lineTo(pad + W - 8, oy);
      ctx.moveTo(ox, pad + 8);
      ctx.lineTo(ox, pad + H - 8);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(ox, oy, Rmax, 0, Math.PI * 2);
      ctx.stroke();

      const arrow = (
        x1: number,
        y1: number,
        x2: number,
        y2: number,
        color: string,
        label: string
      ) => {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const len = Math.hypot(dx, dy);
        if (len < 1) return;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.6;
        ctx.stroke();
        const a = Math.atan2(dy, dx);
        const hl = Math.min(10, len * 0.35);
        const hw = hl * 0.55;
        const bx = x2 - hl * Math.cos(a);
        const by = y2 - hl * Math.sin(a);
        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(bx + hw * Math.sin(a), by - hw * Math.cos(a));
        ctx.lineTo(bx - hw * Math.sin(a), by + hw * Math.cos(a));
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
        ctx.font = "bold 11px JetBrains Mono, monospace";
        ctx.fillText(label, x2 + 6, y2 - 6);
      };

      const maxVec = Math.max(
        st.V || 1,
        isFinite(st.Vr) ? st.Vr : 0,
        isFinite(st.Vc) ? st.Vc : 0,
        isFinite(st.VL) ? st.VL : 0
      );
      const scale = (Rmax * 0.8) / (maxVec || 1);
      const phiRad = (st.phi * Math.PI) / 180;

      arrow(ox, oy, ox + st.V * scale, oy, "#9fb3cf", "Vin");
      arrow(
        ox,
        oy,
        ox + Rmax * 0.68 * Math.cos(phiRad),
        oy - Rmax * 0.68 * Math.sin(phiRad),
        "#34d399",
        "I"
      );

      if (circuit !== "LC" && isFinite(st.Vr) && st.Vr > 0) {
        arrow(
          ox,
          oy,
          ox + st.Vr * scale * Math.cos(phiRad),
          oy - st.Vr * scale * Math.sin(phiRad),
          "#38bdf8",
          "Vr"
        );
      }
      if (circuit !== "RL" && isFinite(st.Vc) && st.Vc > 0) {
        const a2 = phiRad - Math.PI / 2;
        arrow(
          ox,
          oy,
          ox + st.Vc * scale * Math.cos(a2),
          oy - st.Vc * scale * Math.sin(a2),
          "#f59e0b",
          "Vc"
        );
      }
      if (circuit !== "RC" && isFinite(st.VL) && st.VL > 0) {
        const a3 = phiRad + Math.PI / 2;
        arrow(
          ox,
          oy,
          ox + st.VL * scale * Math.cos(a3),
          oy - st.VL * scale * Math.sin(a3),
          "#a78bfa",
          "VL"
        );
      }
      ctx.strokeStyle = "#2b3a55";
      ctx.strokeRect(pad, pad, W, H);
    }

    // 6. Power Triangle
    const cPwrTri = prepCanvas(chartPowerTriRef.current, 360);
    if (cPwrTri && st.ok) {
      const { ctx, w, h } = cPwrTri;
      const pad = 16;
      const W = w - pad * 2;
      const H = h - pad * 2;
      ctx.fillStyle = "#0c1526";
      ctx.fillRect(pad, pad, W, H);

      const P = Math.abs(st.P) || 0;
      const Q = Math.abs(st.Q) || 0;
      const S = Math.abs(st.S) || 0;
      const isCap = st.phi > 0;
      const ox = pad + 65;
      const oy = pad + H / 2 + (isCap ? 50 : -50);
      const maxDim = Math.max(P, Q, 1e-9);
      const scale = Math.min(W - 140, H - 120) / maxDim;
      const pX = ox + P * scale;
      const pY = oy;
      const qY = isCap ? oy - Q * scale : oy + Q * scale;

      ctx.strokeStyle = "#34d399";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(ox, oy);
      ctx.lineTo(pX, pY);
      ctx.stroke();

      ctx.strokeStyle = "#f472b6";
      ctx.beginPath();
      ctx.moveTo(pX, pY);
      ctx.lineTo(pX, qY);
      ctx.stroke();

      ctx.strokeStyle = "#38bdf8";
      ctx.beginPath();
      ctx.moveTo(ox, oy);
      ctx.lineTo(pX, qY);
      ctx.stroke();

      ctx.font = "bold 11px JetBrains Mono, monospace";
      ctx.fillStyle = "#34d399";
      ctx.fillText(`P = ${fmt(P, 3)} W`, (ox + pX) / 2 - 25, oy + 18);
      ctx.fillStyle = "#f472b6";
      ctx.fillText(`Q = ${fmt(Q, 3)} VAR`, pX + 8, (oy + qY) / 2);
      ctx.fillStyle = "#38bdf8";
      ctx.fillText(`S = ${fmt(S, 3)} VA`, (ox + pX) / 2 - 35, (oy + qY) / 2 - 10);

      ctx.strokeStyle = "#2b3a55";
      ctx.lineWidth = 1;
      ctx.strokeRect(pad, pad, W, H);
    }

    // 7. Time-Domain Waveforms
    const cTime = prepCanvas(chartTimeRef.current, 300);
    if (cTime && st.ok && st.f > 0) {
      const { ctx, w, h } = cTime;
      const padL = 54,
        padR = 30,
        padT = 22,
        padB = 34;
      const W = Math.max(10, w - padL - padR);
      const H = Math.max(10, h - padT - padB);
      ctx.fillStyle = "#0c1526";
      ctx.fillRect(padL, padT, W, H);

      const T = 1 / st.f;
      const cycles = 2.5;
      const tMax = cycles * T;
      const X = (t: number) => padL + (t / tMax) * W;
      const Y = (v: number) => padT + ((1 - v) / 2) * H;

      ctx.strokeStyle = "#1a2537";
      ctx.beginPath();
      ctx.moveTo(padL, Y(0));
      ctx.lineTo(padL + W, Y(0));
      ctx.stroke();

      const phiRad = (st.phi * Math.PI) / 180;
      const N = 400;
      // v(t)
      ctx.beginPath();
      for (let i = 0; i <= N; i++) {
        const t = (tMax * i) / N;
        const wt = 2 * Math.PI * st.f * t;
        const px = X(t);
        const py = Y(Math.sin(wt));
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 2.2;
      ctx.stroke();

      // i(t)
      ctx.beginPath();
      for (let i = 0; i <= N; i++) {
        const t = (tMax * i) / N;
        const wt = 2 * Math.PI * st.f * t;
        const px = X(t);
        const py = Y(Math.sin(wt + phiRad));
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.strokeStyle = "#34d399";
      ctx.lineWidth = 2.2;
      ctx.stroke();

      ctx.strokeStyle = "#2b3a55";
      ctx.lineWidth = 1;
      ctx.strokeRect(padL, padT, W, H);
    }

    // 8. Power vs Frequency
    const cPwrF = prepCanvas(chartPwrFreqRef.current, 300);
    if (cPwrF && st.ok) {
      const { ctx, w, h } = cPwrF;
      const padL = 62,
        padR = 30,
        padT = 24,
        padB = 34;
      const W = Math.max(10, w - padL - padR);
      const H = Math.max(10, h - padT - padB);
      ctx.fillStyle = "#0c1526";
      ctx.fillRect(padL, padT, W, H);
      const X = freqAxis(ctx, padL, padT, W, H, fr.lo, fr.hi);

      const N = 300;
      const samples: { f: number; P: number; Q: number; S: number }[] = [];
      let maxP = 1e-12;
      for (let i = 0; i <= N; i++) {
        const fq = Math.pow(
          10,
          Math.log10(fr.lo) +
            ((Math.log10(fr.hi) - Math.log10(fr.lo)) * i) / N
        );
        const p = calcPoint(
          circuit,
          config,
          outputTap,
          st.V,
          fq,
          st.R,
          st.C,
          st.L
        );
        const P = isFinite(p.P) ? p.P : 0;
        const Q = isFinite(p.Q) ? Math.abs(p.Q) : 0;
        const S = isFinite(p.S) ? p.S : 0;
        samples.push({ f: fq, P, Q, S });
        maxP = Math.max(maxP, P, Q, S);
      }
      const Ymax = maxP * 1.1 || 1;
      const Y = (val: number) => padT + (1 - val / Ymax) * H;

      [
        { key: "Q" as const, col: "#f472b6" },
        { key: "P" as const, col: "#34d399" },
        { key: "S" as const, col: "#38bdf8" },
      ].forEach((serie) => {
        ctx.beginPath();
        samples.forEach((s, idx) => {
          const px = X(s.f);
          const py = Y(s[serie.key]);
          if (idx === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
        ctx.strokeStyle = serie.col;
        ctx.lineWidth = 2.2;
        ctx.stroke();
      });

      ctx.strokeStyle = "#2b3a55";
      ctx.lineWidth = 1;
      ctx.strokeRect(padL, padT, W, H);
    }

    // 9. Parameter Sweep Charts (|Z| vs R, C, L)
    const drawParamChart = (
      ref: HTMLCanvasElement | null,
      param: "R" | "C" | "L"
    ) => {
      const cp = prepCanvas(ref, 220);
      if (!cp || !st.ok) return;
      const { ctx, w, h } = cp;
      const padL = 56,
        padR = 20,
        padT = 18,
        padB = 30;
      const W = Math.max(10, w - padL - padR);
      const H = Math.max(10, h - padT - padB);
      ctx.fillStyle = "#0c1526";
      ctx.fillRect(padL, padT, W, H);

      const range =
        param === "R"
          ? getRRange()
          : param === "C"
          ? getCRange()
          : getLRange();
      const N = 160;
      const pts: { p: number; mag: number }[] = [];
      let minZ = Infinity,
        maxZ = 0;
      for (let i = 0; i <= N; i++) {
        const pv = Math.pow(
          10,
          Math.log10(range.lo) +
            ((Math.log10(range.hi) - Math.log10(range.lo)) * i) / N
        );
        const R2 = param === "R" ? pv : st.R;
        const C2 = param === "C" ? pv : st.C;
        const L2 = param === "L" ? pv : st.L;
        const res = calcPoint(
          circuit,
          config,
          outputTap,
          st.V,
          Math.max(st.f, 1e-12),
          R2,
          C2,
          L2
        );
        const mag = isFinite(res.Zmag) ? res.Zmag : 1e12;
        pts.push({ p: pv, mag });
        if (mag > maxZ) maxZ = mag;
        if (mag < minZ && mag > 0) minZ = mag;
      }
      if (!isFinite(minZ) || minZ <= 0) minZ = 1e-3;
      const yLo = Math.max(minZ / 2, 1e-6);
      const yHi = Math.max(yLo * 10, Math.min(maxZ * 2, 1e12));
      const lgXlo = Math.log10(range.lo);
      const lgXhi = Math.log10(range.hi);
      const lgYlo = Math.log10(yLo);
      const lgYhi = Math.log10(yHi);
      const X = (p: number) =>
        padL + ((Math.log10(p) - lgXlo) / (lgXhi - lgXlo)) * W;
      const Y = (m: number) =>
        padT +
        (1 - (Math.log10(Math.max(m, yLo)) - lgYlo) / (lgYhi - lgYlo)) * H;

      ctx.beginPath();
      pts.forEach((pt, idx) => {
        const px = X(pt.p);
        const py = Y(pt.mag);
        if (idx === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 2.2;
      ctx.stroke();
      ctx.strokeStyle = "#2b3a55";
      ctx.lineWidth = 1;
      ctx.strokeRect(padL, padT, W, H);
    };

    if (circuit !== "LC") drawParamChart(chartSweepRRef.current, "R");
    if (circuit !== "RL") drawParamChart(chartSweepCRef.current, "C");
    if (circuit !== "RC") drawParamChart(chartSweepLRef.current, "L");
  }, [
    st,
    filterInfo,
    circuit,
    config,
    outputTap,
    getFRange,
    getRRange,
    getCRange,
    getLRange,
  ]);

  useEffect(() => {
    drawAllCanvases();
    const handleResize = () => drawAllCanvases();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [drawAllCanvases]);

  // Logarithmic slider value
  const sliderVal = useMemo(() => {
    if (!isFinite(fVal) || fVal <= 0) return 0;
    const t =
      (Math.log10(Math.max(fVal, 1e-6)) - LOG_MIN) / (LOG_MAX - LOG_MIN);
    return Math.round(Math.min(1, Math.max(0, t)) * SLIDER_MAX);
  }, [fVal]);

  const handleSliderChange = (val: number) => {
    if (val === 0) {
      setFVal(0);
      return;
    }
    const t = val / SLIDER_MAX;
    const fq = Math.pow(10, LOG_MIN + t * (LOG_MAX - LOG_MIN));
    setFVal(Number(fq.toPrecision(4)));
  };

  const handleReset = () => {
    setCircuit("RLC");
    setConfig("series");
    setOutputTap("C");
    setSweepTab("freq");
    setVin(10);
    setRVal(1000);
    setCVal(1);
    setCUnit("uF");
    setLVal(10);
    setLUnit("mH");
    setFVal(1000);
    setFMin(1);
    setFMax(1000000000);
    setRMin(100);
    setRMax(100000);
    setCMin(0.001);
    setCMax(1000);
    setLMin(0.01);
    setLMax(10000);
  };

  const handleDownloadCSV = () => {
    if (!sweepData || sweepData.rows.length === 0) return;
    const lines: string[] = [];
    lines.push(sweepData.header.map((h) => `"${h}"`).join(","));
    sweepData.rows.forEach((row) => {
      lines.push(
        row
          .map((v) => {
            if (typeof v !== "number" || !isFinite(v)) return "";
            if (Math.abs(v) > 0 && (Math.abs(v) >= 1e7 || Math.abs(v) < 1e-4))
              return v.toExponential(6);
            return v.toPrecision(8);
          })
          .join(",")
      );
    });
    const meta =
      `\ufeff# RLC Sweep -- ${circuit} (${config})\n` +
      `# Range: ${sweepData.lo} to ${sweepData.hi}\n` +
      `# Tab: ${sweepData.tab} · points: ${sweepData.rows.length}\n\n`;
    const blob = new Blob([meta + lines.join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rlc-sweep-${sweepData.tab}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  // Resonance / Capacitive / Inductive state classification
  const isResonance =
    st.ok &&
    (circuit === "LC" || circuit === "RLC") &&
    isFinite(st.f0) &&
    st.f0 > 0 &&
    Math.abs(st.f - st.f0) / st.f0 < 0.01;

  return (
    <div className="space-y-6">
      {/* 1. Circuit Type & Topology Picker */}
      <section className="bg-[#16213a] border border-[#26365c] rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1">
                Circuit Network
              </label>
              <select
                value={circuit}
                onChange={(e) => setCircuit(e.target.value as CircuitKind)}
                className="bg-[#0d1526] border border-[#26365c] rounded-lg px-3.5 py-2 text-sm font-bold text-white cursor-pointer"
              >
                <option value="RC">RC Circuit</option>
                <option value="RL">RL Circuit</option>
                <option value="LC">LC Circuit</option>
                <option value="RLC">RLC Circuit</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1">
                Topology Configuration
              </label>
              <div className="flex bg-[#0d1526] border border-[#26365c] rounded-lg overflow-hidden p-0.5">
                {(["series", "parallel"] as const).map((cfg) => (
                  <button
                    key={cfg}
                    type="button"
                    onClick={() => setConfig(cfg)}
                    className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer capitalize ${
                      config === cfg
                        ? "bg-cyan-400 text-slate-950 font-bold"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {cfg}
                  </button>
                ))}
              </div>
            </div>

            {(circuit === "RC" || circuit === "RL") && (
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">
                  Filter Output Tap (Vout)
                </label>
                <div className="flex bg-[#0d1526] border border-[#26365c] rounded-lg overflow-hidden p-0.5">
                  <button
                    type="button"
                    onClick={() => setOutputTap("R")}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md cursor-pointer ${
                      outputTap === "R"
                        ? "bg-cyan-400 text-slate-950 font-bold"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Across R
                  </button>
                  {circuit === "RC" && (
                    <button
                      type="button"
                      onClick={() => setOutputTap("C")}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md cursor-pointer ${
                        outputTap === "C"
                          ? "bg-cyan-400 text-slate-950 font-bold"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      Across C
                    </button>
                  )}
                  {circuit === "RL" && (
                    <button
                      type="button"
                      onClick={() => setOutputTap("L")}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md cursor-pointer ${
                        outputTap === "L"
                          ? "bg-cyan-400 text-slate-950 font-bold"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      Across L
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#0d1526] hover:bg-slate-800 text-slate-300 border border-[#26365c] cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Defaults
            </button>
            <button
              type="button"
              onClick={handleDownloadCSV}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Export Sweep CSV
            </button>
          </div>
        </div>
      </section>

      {/* 2. Components & Operating Point */}
      <section className="bg-[#16213a] border border-[#26365c] rounded-xl p-5 space-y-4">
        <h2 className="text-xs font-mono font-semibold text-slate-400 tracking-wider">
          COMPONENTS &amp; OPERATING POINT
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">
              Supply Voltage V (RMS)
            </label>
            <div className="flex items-stretch gap-1.5">
              <input
                type="number"
                min={0}
                step={0.1}
                value={vin}
                onChange={(e) => setVin(parseFloat(e.target.value || "0"))}
                className="flex-1 min-w-0 bg-[#0d1526] border border-[#26365c] rounded-lg px-3 py-2 text-sm font-mono text-white"
              />
              <span className="px-2.5 flex items-center bg-[#0d1526] border border-[#26365c] rounded-lg text-xs font-mono text-slate-400">
                V
              </span>
            </div>
          </div>

          <div className={circuit === "LC" ? "opacity-35 pointer-events-none" : ""}>
            <label className="block text-xs text-slate-400 mb-1.5">
              Resistance R {circuit === "LC" && "(n/a)"}
            </label>
            <div className="flex items-stretch gap-1.5">
              <input
                type="number"
                min={0.000001}
                step={10}
                value={rVal}
                onChange={(e) => setRVal(parseFloat(e.target.value || "0"))}
                className="flex-1 min-w-0 bg-[#0d1526] border border-[#26365c] rounded-lg px-3 py-2 text-sm font-mono text-white"
              />
              <span className="px-2.5 flex items-center bg-[#0d1526] border border-[#26365c] rounded-lg text-xs font-mono text-slate-400">
                Ω
              </span>
            </div>
          </div>

          <div className={circuit === "RL" ? "opacity-35 pointer-events-none" : ""}>
            <label className="block text-xs text-slate-400 mb-1.5">
              Capacitance C {circuit === "RL" && "(n/a)"}
            </label>
            <div className="flex items-stretch gap-1.5">
              <input
                type="number"
                min={0}
                step={0.1}
                value={cVal}
                onChange={(e) => setCVal(parseFloat(e.target.value || "0"))}
                className="flex-1 min-w-0 bg-[#0d1526] border border-[#26365c] rounded-lg px-3 py-2 text-sm font-mono text-white"
              />
              <select
                value={cUnit}
                onChange={(e) => setCUnit(e.target.value)}
                className="bg-[#0d1526] border border-[#26365c] rounded-lg px-2 text-xs font-mono text-cyan-300 cursor-pointer"
              >
                <option value="pF">pF</option>
                <option value="nF">nF</option>
                <option value="uF">µF</option>
                <option value="mF">mF</option>
                <option value="F">F</option>
              </select>
            </div>
          </div>

          <div className={circuit === "RC" ? "opacity-35 pointer-events-none" : ""}>
            <label className="block text-xs text-slate-400 mb-1.5">
              Inductance L {circuit === "RC" && "(n/a)"}
            </label>
            <div className="flex items-stretch gap-1.5">
              <input
                type="number"
                min={0}
                step={0.1}
                value={lVal}
                onChange={(e) => setLVal(parseFloat(e.target.value || "0"))}
                className="flex-1 min-w-0 bg-[#0d1526] border border-[#26365c] rounded-lg px-3 py-2 text-sm font-mono text-white"
              />
              <select
                value={lUnit}
                onChange={(e) => setLUnit(e.target.value)}
                className="bg-[#0d1526] border border-[#26365c] rounded-lg px-2 text-xs font-mono text-cyan-300 cursor-pointer"
              >
                <option value="nH">nH</option>
                <option value="uH">µH</option>
                <option value="mH">mH</option>
                <option value="H">H</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1.5">
              Operating Frequency f
            </label>
            <div className="flex items-stretch gap-1.5">
              <input
                type="number"
                min={0}
                max={1e10}
                step="any"
                value={fVal}
                onChange={(e) => setFVal(parseFloat(e.target.value || "0"))}
                className="flex-1 min-w-0 bg-[#0d1526] border border-[#26365c] rounded-lg px-3 py-2 text-sm font-mono text-cyan-300 font-bold"
              />
              <span className="px-2.5 flex items-center bg-[#0d1526] border border-[#26365c] rounded-lg text-xs font-mono text-slate-400">
                Hz
              </span>
            </div>
          </div>
        </div>

        {/* Logarithmic Frequency Slider */}
        <div className="pt-1">
          <input
            type="range"
            min={0}
            max={SLIDER_MAX}
            step={1}
            value={sliderVal}
            onChange={(e) => handleSliderChange(parseInt(e.target.value, 10))}
            className="w-full accent-cyan-400 cursor-pointer"
          />
          <div className="flex justify-between text-[11px] font-mono text-slate-400 mt-1">
            <span>0 Hz / DC</span>
            <span className="text-cyan-300">
              Current f = {siHz(fVal)} (Drag to sweep log-scale)
            </span>
            <span>10 GHz</span>
          </div>
        </div>
      </section>

      {/* Live Synchronized 2D IEEE Schematic & 3D RLC Hardware Bench */}
      <section className="bg-[#16213a] border border-[#26365c] rounded-xl p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
          <span className="font-bold text-cyan-300">
            Interactive {circuit} ({config === "series" ? "Series" : "Parallel"}) IEEE Schematic &amp; 3D Bench
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { key: "R", active: circuit === "RC" || circuit === "RL" || circuit === "RLC", toggle: () => setCircuit(circuit === "RLC" ? "LC" : circuit === "LC" ? "RLC" : circuit) },
                { key: "L", active: circuit === "RL" || circuit === "LC" || circuit === "RLC", toggle: () => setCircuit(circuit === "RLC" ? "RC" : circuit === "RC" ? "RLC" : circuit === "LC" ? "RC" : "RLC") },
                { key: "C", active: circuit === "RC" || circuit === "LC" || circuit === "RLC", toggle: () => setCircuit(circuit === "RLC" ? "RL" : circuit === "RL" ? "RLC" : circuit === "LC" ? "RL" : "RLC") },
              ] as const
            ).map((comp) => (
              <button
                key={comp.key}
                type="button"
                onClick={comp.toggle}
                className={`px-2 py-0.5 rounded border text-[10px] font-bold cursor-pointer transition-colors ${
                  comp.active
                    ? "bg-emerald-500/15 border-emerald-400/60 text-emerald-300 hover:bg-rose-500/15 hover:border-rose-400/60 hover:text-rose-200"
                    : "bg-slate-900 border-slate-700 text-slate-400 hover:border-cyan-400 hover:text-cyan-300"
                }`}
                title={comp.active ? `Remove ${comp.key} element` : `Add ${comp.key} element`}
              >
                {comp.active ? `✓ ${comp.key} In-Circuit` : `+ Add ${comp.key}`}
              </button>
            ))}
            <span className="text-slate-300 tabular-nums ml-2">
              {st.ok
                ? `f = ${siHz(st.f)} · I = ${(st.I * 1000).toFixed(2)} mA · |Z| = ${fmt(st.Zmag)} Ω`
                : "Adjust parameters to energize RLC bench"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
          {/* Dynamic Live 2D IEEE Schematic reflecting Series vs Parallel & Active Elements */}
          <div className="bg-[#070B14] border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pb-2 border-b border-slate-800/80">
              <span className="text-white font-bold">
                IEEE 315 Live Topology ({circuit} · {config.toUpperCase()})
              </span>
              <span className="text-cyan-400">
                Vout Tap: Across {outputTap}
              </span>
            </div>
            <svg viewBox="0 0 460 220" className="w-full h-auto my-auto block font-mono">
              <rect x="0" y="0" width="460" height="220" fill="#070B14" rx="8" />
              {/* AC Source on Left */}
              <circle cx="52" cy="110" r="20" fill="#0f172a" stroke="#ef4444" strokeWidth="2.2" />
              <path d="M 42 110 Q 47 100 52 110 T 62 110" fill="none" stroke="#f87171" strokeWidth="1.8" />
              <text x="52" y="144" fill="#fca5a5" fontSize="9.5" textAnchor="middle" fontWeight="700">
                {vin}V AC
              </text>
              <text x="52" y="156" fill="#94a3b8" fontSize="8.5" textAnchor="middle">
                {siHz(fVal)}
              </text>
              {/* Ground symbol bottom-left */}
              <line x1="52" y1="130" x2="52" y2="180" stroke="#64748b" strokeWidth="2" />
              <line x1="40" y1="180" x2="64" y2="180" stroke="#64748b" strokeWidth="2.2" />
              <line x1="44" y1="185" x2="60" y2="185" stroke="#64748b" strokeWidth="1.8" />
              <line x1="48" y1="190" x2="56" y2="190" stroke="#64748b" strokeWidth="1.4" />

              {(() => {
                const elems: { kind: "R" | "L" | "C"; valStr: string }[] = [];
                if (circuit === "RC" || circuit === "RL" || circuit === "RLC") {
                  elems.push({ kind: "R", valStr: `${rVal >= 1000 ? `${(rVal / 1000).toFixed(2)}k` : rVal}Ω` });
                }
                if (circuit === "RL" || circuit === "LC" || circuit === "RLC") {
                  elems.push({ kind: "L", valStr: `${lVal}${lUnit}` });
                }
                if (circuit === "RC" || circuit === "LC" || circuit === "RLC") {
                  elems.push({ kind: "C", valStr: `${cVal}${cUnit}` });
                }

                if (config === "series") {
                  const startX = 95;
                  const slotW = elems.length === 3 ? 105 : 150;
                  const topY = 50;
                  const botY = 180;
                  const endX = startX + elems.length * slotW;
                  return (
                    <>
                      {/* Input riser from AC source */}
                      <path d={`M 52 90 L 52 ${topY} L ${startX} ${topY}`} fill="none" stroke="#38bdf8" strokeWidth="2.2" />
                      {/* Return loop */}
                      <path d={`M ${endX} ${topY} L ${endX + 22} ${topY} L ${endX + 22} ${botY} L 52 ${botY}`} fill="none" stroke="#64748b" strokeWidth="2.2" />
                      {elems.map((el, idx) => {
                        const x0 = startX + idx * slotW;
                        const cx = x0 + slotW / 2;
                        const isTap = outputTap === el.kind;
                        return (
                          <g key={el.kind}>
                            {isTap && (
                              <rect x={cx - 32} y={topY - 24} width="64" height="50" rx="6" fill="rgba(16,185,129,0.12)" stroke="#10b981" strokeDasharray="3 2" />
                            )}
                            <line x1={x0} y1={topY} x2={cx - 24} y2={topY} stroke="#38bdf8" strokeWidth="2.2" />
                            <line x1={cx + 24} y1={topY} x2={x0 + slotW} y2={topY} stroke="#38bdf8" strokeWidth="2.2" />
                            {el.kind === "R" && (
                              <path d={`M ${cx - 24} ${topY} L ${cx - 18} ${topY - 8} L ${cx - 10} ${topY + 8} L ${cx - 2} ${topY - 8} L ${cx + 6} ${topY + 8} L ${cx + 14} ${topY - 8} L ${cx + 20} ${topY + 8} L ${cx + 24} ${topY}`} fill="none" stroke="#facc15" strokeWidth="2.4" strokeLinejoin="round" />
                            )}
                            {el.kind === "L" && (
                              <path d={`M ${cx - 24} ${topY} A 6 6 0 0 1 ${cx - 12} ${topY} A 6 6 0 0 1 ${cx} ${topY} A 6 6 0 0 1 ${cx + 12} ${topY} A 6 6 0 0 1 ${cx + 24} ${topY}`} fill="none" stroke="#a855f7" strokeWidth="2.4" />
                            )}
                            {el.kind === "C" && (
                              <>
                                <line x1={cx - 24} y1={topY} x2={cx - 5} y2={topY} stroke="#38bdf8" strokeWidth="2.2" />
                                <line x1={cx - 5} y1={topY - 12} x2={cx - 5} y2={topY + 12} stroke="#22d3ee" strokeWidth="2.8" />
                                <line x1={cx + 5} y1={topY - 12} x2={cx + 5} y2={topY + 12} stroke="#22d3ee" strokeWidth="2.8" />
                                <line x1={cx + 5} y1={topY} x2={cx + 24} y2={topY} stroke="#38bdf8" strokeWidth="2.2" />
                              </>
                            )}
                            <text x={cx} y={topY - 14} fill={isTap ? "#34d399" : "#e2e8f0"} fontSize="10" fontWeight="700" textAnchor="middle">
                              {el.kind} {isTap ? "(Vout)" : ""}
                            </text>
                            <text x={cx} y={topY + 24} fill="#38bdf8" fontSize="9.5" fontWeight="700" textAnchor="middle">
                              {el.valStr}
                            </text>
                          </g>
                        );
                      })}
                      <text x="255" y="135" fill="#94a3b8" fontSize="10" textAnchor="middle">
                        SINGLE LOOP CURRENT I = {st.ok ? `${(st.I * 1000).toFixed(2)} mA` : "--"}
                      </text>
                    </>
                  );
                }

                // Parallel Shunt Branches between top bus (y=46) and bottom ground bus (y=180)
                const xs = elems.length === 3 ? [165, 275, 385] : [185, 345];
                const lastX = xs[xs.length - 1];
                return (
                  <>
                    <path d={`M 52 90 L 52 46 L ${lastX} 46`} fill="none" stroke="#38bdf8" strokeWidth="2.2" />
                    <line x1="52" y1="180" x2={lastX} y2="180" stroke="#64748b" strokeWidth="2.2" />
                    {elems.map((el, idx) => {
                      const bx = xs[idx];
                      const isTap = outputTap === el.kind;
                      return (
                        <g key={el.kind}>
                          {isTap && (
                            <rect x={bx - 30} y="62" width="60" height="100" rx="6" fill="rgba(16,185,129,0.12)" stroke="#10b981" strokeDasharray="3 2" />
                          )}
                          <circle cx={bx} cy="46" r="3" fill="#38bdf8" />
                          <circle cx={bx} cy="180" r="3" fill="#64748b" />
                          <line x1={bx} y1="46" x2={bx} y2="86" stroke="#38bdf8" strokeWidth="2" />
                          <line x1={bx} y1="138" x2={bx} y2="180" stroke="#64748b" strokeWidth="2" />
                          {el.kind === "R" && (
                            <path d={`M ${bx} 86 L ${bx - 8} 92 L ${bx + 8} 100 L ${bx - 8} 108 L ${bx + 8} 116 L ${bx - 8} 124 L ${bx + 8} 132 L ${bx} 138`} fill="none" stroke="#facc15" strokeWidth="2.3" strokeLinejoin="round" />
                          )}
                          {el.kind === "L" && (
                            <path d={`M ${bx} 86 A 7 6.5 0 0 1 ${bx} 99 A 7 6.5 0 0 1 ${bx} 112 A 7 6.5 0 0 1 ${bx} 125 A 7 6.5 0 0 1 ${bx} 138`} fill="none" stroke="#a855f7" strokeWidth="2.3" />
                          )}
                          {el.kind === "C" && (
                            <>
                              <line x1={bx} y1="86" x2={bx} y2="107" stroke="#38bdf8" strokeWidth="2" />
                              <line x1={bx - 12} y1="107" x2={bx + 12} y2="107" stroke="#22d3ee" strokeWidth="2.8" />
                              <line x1={bx - 12} y1="117" x2={bx + 12} y2="117" stroke="#22d3ee" strokeWidth="2.8" />
                              <line x1={bx} y1="117" x2={bx} y2="138" stroke="#38bdf8" strokeWidth="2" />
                            </>
                          )}
                          <text x={bx + 16} y="106" fill={isTap ? "#34d399" : "#e2e8f0"} fontSize="10" fontWeight="700">
                            {el.kind}
                          </text>
                          <text x={bx + 16} y="120" fill="#38bdf8" fontSize="9.5" fontWeight="700">
                            {el.valStr}
                          </text>
                        </g>
                      );
                    })}
                  </>
                );
              })()}
            </svg>
          </div>

          <AnalogStage3D
            mode="RLC"
            title={`${circuit} ${config}`}
            config={config}
            circuitType={circuit}
            vin={st.ok ? st.V : vin}
            vout={st.ok ? (outputTap === "C" ? st.Vc : outputTap === "L" ? st.VL : st.Vr) : 0}
            currentMa={st.ok ? st.I * 1000 : 0}
            freqHz={fVal}
            resonanceHz={isFinite(st.f0) ? st.f0 : undefined}
            isResonant={isResonance}
            rVal={rVal}
            cVal={cVal}
            lVal={lVal}
            regionLabel={
              isResonance
                ? `RESONANCE f0 = ${siHz(st.f0)}`
                : st.ok && isFinite(st.Zang)
                ? st.Zang > 2
                  ? "INDUCTIVE (+PHASE)"
                  : st.Zang < -2
                  ? "CAPACITIVE (-PHASE)"
                  : "RESISTIVE (IN-PHASE)"
                : "STANDBY"
            }
            onInteractiveStep={() => {
              if (isFinite(st.f0) && st.f0 > 0) {
                setFVal(Number(st.f0.toPrecision(4)));
              }
            }}
          />
        </div>
      </section>

      {/* 3. Sweep Ranges */}
      <section className="bg-[#16213a] border border-[#26365c] rounded-xl p-5 space-y-3">
        <h2 className="text-xs font-mono font-semibold text-slate-400 tracking-wider">
          SWEEP RANGES · CONTROLS THE TABLES &amp; GRAPHS BELOW
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 font-mono text-xs">
          <div className="bg-[#0d1526] border border-[#26365c] rounded-lg p-3 space-y-1.5">
            <span className="text-slate-400 text-[11px]">Frequency Range (Hz)</span>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                value={fMin}
                onChange={(e) => setFMin(parseFloat(e.target.value || "1"))}
                className="w-full bg-[#0a1220] border border-[#26365c] rounded px-2 py-1 text-white"
              />
              <span className="text-slate-500">→</span>
              <input
                type="number"
                value={fMax}
                onChange={(e) => setFMax(parseFloat(e.target.value || "1000"))}
                className="w-full bg-[#0a1220] border border-[#26365c] rounded px-2 py-1 text-white"
              />
            </div>
          </div>

          <div
            className={`bg-[#0d1526] border border-[#26365c] rounded-lg p-3 space-y-1.5 ${
              circuit === "LC" ? "opacity-35 pointer-events-none" : ""
            }`}
          >
            <span className="text-slate-400 text-[11px]">Resistance Range (Ω)</span>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                value={rMin}
                onChange={(e) => setRMin(parseFloat(e.target.value || "10"))}
                className="w-full bg-[#0a1220] border border-[#26365c] rounded px-2 py-1 text-white"
              />
              <span className="text-slate-500">→</span>
              <input
                type="number"
                value={rMax}
                onChange={(e) => setRMax(parseFloat(e.target.value || "10000"))}
                className="w-full bg-[#0a1220] border border-[#26365c] rounded px-2 py-1 text-white"
              />
            </div>
          </div>

          <div
            className={`bg-[#0d1526] border border-[#26365c] rounded-lg p-3 space-y-1.5 ${
              circuit === "RL" ? "opacity-35 pointer-events-none" : ""
            }`}
          >
            <span className="text-slate-400 text-[11px]">
              Capacitance Range ({cUnit})
            </span>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                value={cMin}
                onChange={(e) => setCMin(parseFloat(e.target.value || "0.001"))}
                className="w-full bg-[#0a1220] border border-[#26365c] rounded px-2 py-1 text-white"
              />
              <span className="text-slate-500">→</span>
              <input
                type="number"
                value={cMax}
                onChange={(e) => setCMax(parseFloat(e.target.value || "1000"))}
                className="w-full bg-[#0a1220] border border-[#26365c] rounded px-2 py-1 text-white"
              />
            </div>
          </div>

          <div
            className={`bg-[#0d1526] border border-[#26365c] rounded-lg p-3 space-y-1.5 ${
              circuit === "RC" ? "opacity-35 pointer-events-none" : ""
            }`}
          >
            <span className="text-slate-400 text-[11px]">
              Inductance Range ({lUnit})
            </span>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                value={lMin}
                onChange={(e) => setLMin(parseFloat(e.target.value || "0.01"))}
                className="w-full bg-[#0a1220] border border-[#26365c] rounded px-2 py-1 text-white"
              />
              <span className="text-slate-500">→</span>
              <input
                type="number"
                value={lMax}
                onChange={(e) => setLMax(parseFloat(e.target.value || "10000"))}
                className="w-full bg-[#0a1220] border border-[#26365c] rounded px-2 py-1 text-white"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 4. Filter Classification & Frequency Ranges */}
      {filterInfo && (
        <section className="bg-[#16213a] border border-[#26365c] rounded-xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xs font-mono font-semibold text-slate-400 tracking-wider">
              FILTER CLASSIFICATION &amp; FREQUENCY RANGES
            </h2>
            {isFinite(st.f0 || st.fc) && (
              <button
                type="button"
                onClick={() => setFVal(Number((st.f0 || st.fc).toPrecision(5)))}
                className="px-3 py-1 rounded-lg text-xs font-mono font-semibold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 cursor-pointer"
              >
                Jump f to {isFinite(st.f0) ? `f₀ (${siHz(st.f0)})` : `fc (${siHz(st.fc)})`}
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-4 bg-[#0d1526] border-2 border-cyan-500/40 rounded-xl p-4">
            <div className="w-12 h-12 rounded-full bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center font-mono font-bold text-cyan-300 text-base shrink-0">
              {filterInfo.icon}
            </div>
            <div className="flex-1 min-w-[200px]">
              <div className="text-lg font-bold text-white">
                {filterInfo.name}
              </div>
              <div className="text-xs text-slate-300 mt-0.5">
                {filterInfo.desc}
              </div>
            </div>
            <div className="font-mono text-xs bg-[#0a1220] border border-[#26365c] rounded-lg px-3 py-2 text-cyan-300 font-bold">
              {isFinite(filterInfo.f0)
                ? `f₀ = ${siHz(filterInfo.f0)}`
                : `fc = ${siHz(filterInfo.fc)}`}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 font-mono text-xs">
            <div className="bg-[#0d1526] border border-[#26365c] rounded-lg p-3">
              <div className="text-[11px] text-slate-400">Passband Range</div>
              <div className="text-emerald-400 font-bold mt-1">
                {filterInfo.passband}
              </div>
            </div>
            <div className="bg-[#0d1526] border border-[#26365c] rounded-lg p-3">
              <div className="text-[11px] text-slate-400">Stopband Range</div>
              <div className="text-rose-300 font-bold mt-1">
                {filterInfo.stopband}
              </div>
            </div>
            <div className="bg-[#0d1526] border border-[#26365c] rounded-lg p-3">
              <div className="text-[11px] text-slate-400">
                Gain |H(jω)| at f = {siHz(st.f)}
              </div>
              <div className="text-amber-300 font-bold mt-1">
                {fmt(st.gainMag, 3)} ({fmt(st.gainDb, 3)} dB)
              </div>
            </div>
            <div className="bg-[#0d1526] border border-[#26365c] rounded-lg p-3">
              <div className="text-[11px] text-slate-400">
                Transient Step Damping
              </div>
              <div className="text-cyan-300 font-bold mt-1">
                {st.dampingMode}
                {isFinite(st.zeta) ? ` (ζ=${fmt(st.zeta, 3)})` : ""}
              </div>
            </div>
          </div>

          <div className="relative h-11 bg-[#0a1220] border border-[#26365c] rounded-lg overflow-hidden">
            <canvas ref={bandBarRef} className="w-full h-full block" />
          </div>
        </section>
      )}

      {/* 5. Circuit Behaviour Banner + Primary & Power Outputs */}
      <section className="bg-[#16213a] border border-[#26365c] rounded-xl p-5 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0d1526] border border-[#26365c] rounded-xl p-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-full bg-slate-800 flex items-center justify-center text-lg font-bold text-cyan-300">
              {isResonance
                ? "◎"
                : st.phi > 1
                ? "∿"
                : st.phi < -1
                ? "⌁"
                : "―"}
            </div>
            <div>
              <div className="text-base font-bold text-white uppercase tracking-wide">
                {isResonance
                  ? "At Resonance (XL ≈ XC)"
                  : st.phi > 1
                  ? "Capacitive Regime (Current Leads Voltage)"
                  : st.phi < -1
                  ? "Inductive Regime (Current Lags Voltage)"
                  : "Resistive Regime (In-Phase)"}
              </div>
              <div className="text-xs text-slate-400">
                |Z| = {siOhm(st.Zmag)} · Phase φ = {fmt(st.phi, 3)}° · Power
                Factor = {fmt(st.PF, 3)}
              </div>
            </div>
          </div>
        </div>

        {/* Primary Electrical Parameters */}
        <div>
          <h3 className="text-xs font-mono font-semibold text-slate-400 mb-2.5">
            IMPEDANCE, REACTANCE, CURRENT &amp; COMPONENT VOLTAGES
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 font-mono">
            {circuit !== "RL" && (
              <div className="bg-[#0d1526] border border-[#26365c] rounded-lg p-3">
                <div className="text-[10px] text-slate-400">XC (Cap Reactance)</div>
                <div className="text-sm font-bold text-white mt-1">
                  {fmt(st.Xc)} <span className="text-xs text-slate-400">Ω</span>
                </div>
              </div>
            )}
            {circuit !== "RC" && (
              <div className="bg-[#0d1526] border border-[#26365c] rounded-lg p-3">
                <div className="text-[10px] text-slate-400">XL (Ind Reactance)</div>
                <div className="text-sm font-bold text-white mt-1">
                  {fmt(st.Xl)} <span className="text-xs text-slate-400">Ω</span>
                </div>
              </div>
            )}
            <div className="bg-[#0d1526] border border-[#26365c] rounded-lg p-3">
              <div className="text-[10px] text-slate-400">|Z| (Impedance)</div>
              <div className="text-sm font-bold text-cyan-300 mt-1">
                {fmt(st.Zmag)} <span className="text-xs text-slate-400">Ω</span>
              </div>
            </div>
            <div className="bg-[#0d1526] border border-[#26365c] rounded-lg p-3">
              <div className="text-[10px] text-slate-400">∠Z (Imp Phase)</div>
              <div className="text-sm font-bold text-white mt-1">
                {fmt(st.Zang, 4)}°
              </div>
            </div>
            <div className="bg-[#0d1526] border border-[#26365c] rounded-lg p-3">
              <div className="text-[10px] text-slate-400">I (Total RMS)</div>
              <div className="text-sm font-bold text-emerald-400 mt-1">
                {fmt(st.I)} <span className="text-xs text-slate-400">A</span>
              </div>
            </div>
            <div className="bg-[#0d1526] border border-emerald-500/40 rounded-lg p-3">
              <div className="text-[10px] text-emerald-300">
                {circuit === "LC" || circuit === "RLC"
                  ? "f₀ (Resonance)"
                  : "fc (Cutoff)"}
              </div>
              <div className="text-sm font-bold text-emerald-400 mt-1">
                {fmt(st.fc || st.f0, 4)}{" "}
                <span className="text-xs text-slate-400">Hz</span>
              </div>
            </div>

            {circuit !== "LC" && (
              <div className="bg-[#0d1526] border border-[#26365c] rounded-lg p-3">
                <div className="text-[10px] text-slate-400">Vr / Ir (Resistor)</div>
                <div className="text-sm font-bold text-white mt-1">
                  {fmt(st.Vr)} V · {fmt(st.Ir, 3)} A
                </div>
              </div>
            )}
            {circuit !== "RL" && (
              <div className="bg-[#0d1526] border border-[#26365c] rounded-lg p-3">
                <div className="text-[10px] text-slate-400">Vc / Ic (Capacitor)</div>
                <div className="text-sm font-bold text-white mt-1">
                  {fmt(st.Vc)} V · {fmt(st.Ic, 3)} A
                </div>
              </div>
            )}
            {circuit !== "RC" && (
              <div className="bg-[#0d1526] border border-[#26365c] rounded-lg p-3">
                <div className="text-[10px] text-slate-400">VL / IL (Inductor)</div>
                <div className="text-sm font-bold text-white mt-1">
                  {fmt(st.VL)} V · {fmt(st.IL, 3)} A
                </div>
              </div>
            )}
            <div className="bg-[#0d1526] border border-[#26365c] rounded-lg p-3">
              <div className="text-[10px] text-slate-400">φ (I leads V)</div>
              <div className="text-sm font-bold text-white mt-1">
                {fmt(st.phi, 4)}°
              </div>
            </div>
            <div className="bg-[#0d1526] border border-[#26365c] rounded-lg p-3">
              <div className="text-[10px] text-slate-400">PF (cos φ)</div>
              <div className="text-sm font-bold text-white mt-1">
                {fmt(st.PF, 4)}
              </div>
            </div>
          </div>
        </div>

        {/* Power & Additional Parameters */}
        <div>
          <h3 className="text-xs font-mono font-semibold text-slate-400 mb-2.5">
            POWER, ADMITTANCE, Q-FACTOR &amp; TIME CONSTANTS
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5 font-mono">
            <div className="bg-[#0d1526] border border-pink-500/30 rounded-lg p-3">
              <div className="text-[10px] text-slate-400">S (Apparent Power)</div>
              <div className="text-sm font-bold text-white mt-1">
                {fmt(st.S)} <span className="text-xs text-slate-400">VA</span>
              </div>
            </div>
            <div className="bg-[#0d1526] border border-pink-500/30 rounded-lg p-3">
              <div className="text-[10px] text-slate-400">P (Real Power)</div>
              <div className="text-sm font-bold text-emerald-400 mt-1">
                {fmt(st.P)} <span className="text-xs text-slate-400">W</span>
              </div>
            </div>
            <div className="bg-[#0d1526] border border-pink-500/30 rounded-lg p-3">
              <div className="text-[10px] text-slate-400">Q (Reactive Power)</div>
              <div className="text-sm font-bold text-pink-300 mt-1">
                {fmt(st.Q)} <span className="text-xs text-slate-400">VAR</span>
              </div>
            </div>
            <div className="bg-[#0d1526] border border-[#26365c] rounded-lg p-3">
              <div className="text-[10px] text-slate-400">τ (Time Constant)</div>
              <div className="text-sm font-bold text-white mt-1">
                {fmt(st.tau)} <span className="text-xs text-slate-400">s</span>
              </div>
            </div>
            <div className="bg-[#0d1526] border border-[#26365c] rounded-lg p-3">
              <div className="text-[10px] text-slate-400">T (Wave Period)</div>
              <div className="text-sm font-bold text-white mt-1">
                {isFinite(st.T) ? fmt(st.T) : "∞"}{" "}
                <span className="text-xs text-slate-400">s</span>
              </div>
            </div>
            <div className="bg-[#0d1526] border border-[#26365c] rounded-lg p-3">
              <div className="text-[10px] text-slate-400">Q-Factor / BW</div>
              <div className="text-sm font-bold text-cyan-300 mt-1">
                Q={isFinite(st.Qfactor) ? fmt(st.Qfactor, 3) : "∞"} · BW=
                {fmt(st.BW, 3)}Hz
              </div>
            </div>
            <div className="bg-[#0d1526] border border-[#26365c] rounded-lg p-3">
              <div className="text-[10px] text-slate-400">Vm (Peak Source)</div>
              <div className="text-sm font-bold text-white mt-1">
                {fmt(st.Vm)} <span className="text-xs text-slate-400">V</span>
              </div>
            </div>
            <div className="bg-[#0d1526] border border-[#26365c] rounded-lg p-3">
              <div className="text-[10px] text-slate-400">Im (Peak Current)</div>
              <div className="text-sm font-bold text-white mt-1">
                {fmt(st.Im)} <span className="text-xs text-slate-400">A</span>
              </div>
            </div>
            <div className="bg-[#0d1526] border border-[#26365c] rounded-lg p-3">
              <div className="text-[10px] text-slate-400">Y (Admittance)</div>
              <div className="text-sm font-bold text-white mt-1">
                {fmt(st.Y)} <span className="text-xs text-slate-400">S</span>
              </div>
            </div>
            <div className="bg-[#0d1526] border border-[#26365c] rounded-lg p-3">
              <div className="text-[10px] text-slate-400">G (Conductance)</div>
              <div className="text-sm font-bold text-white mt-1">
                {fmt(st.G)} <span className="text-xs text-slate-400">S</span>
              </div>
            </div>
            <div className="bg-[#0d1526] border border-[#26365c] rounded-lg p-3">
              <div className="text-[10px] text-slate-400">B (Susceptance)</div>
              <div className="text-sm font-bold text-white mt-1">
                {fmt(st.B)} <span className="text-xs text-slate-400">S</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Sweep Results Table */}
      <section className="bg-[#16213a] border border-[#26365c] rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xs font-mono font-semibold text-slate-400 tracking-wider">
            SWEEP RESULTS TABLE (12 LOG-SPACED POINTS)
          </h2>
          <div className="flex items-center gap-2">
            <div className="flex bg-[#0d1526] border border-[#26365c] rounded-lg p-0.5">
              {(
                [
                  { id: "freq", label: "Frequency", disabled: false },
                  { id: "r", label: "Resistance", disabled: circuit === "LC" },
                  { id: "c", label: "Capacitance", disabled: circuit === "RL" },
                  { id: "l", label: "Inductance", disabled: circuit === "RC" },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  disabled={t.disabled}
                  onClick={() => setSweepTab(t.id)}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer disabled:opacity-35 ${
                    sweepTab === t.id
                      ? "bg-cyan-400 text-slate-950 font-bold"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {sweepData && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
              <div className="bg-[#0d1526] border border-[#26365c] rounded-lg p-3">
                <div className="text-[10px] text-slate-400">Min |Z| in Sweep</div>
                <div className="text-sm font-bold text-cyan-300 mt-0.5">
                  {siOhm(sweepData.minZ)}
                </div>
              </div>
              <div className="bg-[#0d1526] border border-[#26365c] rounded-lg p-3">
                <div className="text-[10px] text-slate-400">Max |Z| in Sweep</div>
                <div className="text-sm font-bold text-purple-300 mt-0.5">
                  {siOhm(sweepData.maxZ)}
                </div>
              </div>
              <div className="bg-[#0d1526] border border-[#26365c] rounded-lg p-3">
                <div className="text-[10px] text-slate-400">Sample Points</div>
                <div className="text-sm font-bold text-white mt-0.5">
                  {sweepData.rows.length} (Log-Spaced)
                </div>
              </div>
              <div className="bg-[#0d1526] border border-[#26365c] rounded-lg p-3">
                <div className="text-[10px] text-slate-400">
                  Characteristic Frequency
                </div>
                <div className="text-sm font-bold text-emerald-400 mt-0.5">
                  {siHz(sweepData.fRes)}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-[#26365c] bg-[#0a1220]">
              <table className="w-full text-xs font-mono tabular-nums border-collapse">
                <thead>
                  <tr className="bg-[#0d1526] text-slate-400 border-b border-[#26365c]">
                    {sweepData.header.map((h, i) => (
                      <th
                        key={h}
                        className={`py-2.5 px-3 whitespace-nowrap ${
                          i === 0 ? "text-left" : "text-right"
                        }`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sweepData.rows.map((row, rIdx) => (
                    <tr
                      key={rIdx}
                      className="border-b border-[#141e2e] last:border-b-0 hover:bg-[#0d1526]"
                    >
                      {row.map((cell, cIdx) => {
                        const colName = sweepData.header[cIdx];
                        let txt = fmt(cell, 4);
                        if (colName.includes("(Hz)")) txt = siHz(cell);
                        else if (colName.includes("(F)")) txt = siUnit(cell, "F");
                        else if (colName.includes("(H)")) txt = siUnit(cell, "H");
                        else if (colName.includes("(Ω)")) txt = siOhm(cell);
                        else if (colName.includes("(°)"))
                          txt = `${fmt(cell, 3)}°`;
                        return (
                          <td
                            key={cIdx}
                            className={`py-2 px-3 whitespace-nowrap ${
                              cIdx === 0
                                ? "text-left font-bold text-cyan-200"
                                : "text-right text-slate-300"
                            }`}
                          >
                            {txt}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {/* 6B. Dedicated Real-Time D3.js Interactive Bode Frequency Response Panel */}
      <div id="d3-bode-plot-section">
        <D3BodePlotPanel
          data={bodeRechartsInfo.data}
          logLo={bodeRechartsInfo.logLo}
          logHi={bodeRechartsInfo.logHi}
          dbMax={bodeRechartsInfo.dbMax}
          opFreqHz={st.f}
          critFreqHz={isFinite(st.f0) ? st.f0 : isFinite(st.fc) ? st.fc : NaN}
          gainDbAtOp={st.gainDb}
          gainMagAtOp={st.gainMag}
          phaseDegAtOp={st.gainPhaseDeg}
          ok={st.ok}
          circuitLabel={circuit}
          configLabel={config}
          outputTap={outputTap}
          onSelectFreqHz={(hz) => setFVal(hz)}
          formatHz={siHz}
        />
      </div>

      {/* 7. Frequency Response & Bode Plots */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <section className="bg-[#16213a] border border-[#26365c] rounded-xl p-4">
          <h2 className="text-xs font-mono font-semibold text-slate-400 mb-3">
            1 · IMPEDANCE MAGNITUDE |Z| VS FREQUENCY (LOG–LOG)
          </h2>
          <canvas ref={chart1Ref} className="w-full h-[300px] block rounded-lg" />
        </section>

        <section className="bg-[#16213a] border border-[#26365c] rounded-xl p-4">
          <h2 className="text-xs font-mono font-semibold text-slate-400 mb-3">
            2 · BODE VOLTAGE GAIN |H(jω)| (dB) VS FREQUENCY
          </h2>
          <canvas
            ref={chartBodeRef}
            className="w-full h-[300px] block rounded-lg"
          />
        </section>

        <section className="bg-[#16213a] border border-[#26365c] rounded-xl p-4">
          <h2 className="text-xs font-mono font-semibold text-slate-400 mb-3">
            3 · PHASE ANGLE φ (CURRENT LEADS VOLTAGE) VS FREQUENCY
          </h2>
          <canvas ref={chart2Ref} className="w-full h-[300px] block rounded-lg" />
        </section>

        <section className="bg-[#16213a] border border-[#26365c] rounded-xl p-4">
          <h2 className="text-xs font-mono font-semibold text-slate-400 mb-3">
            4 · POWER FACTOR |cos φ| VS FREQUENCY
          </h2>
          <canvas ref={chart3Ref} className="w-full h-[300px] block rounded-lg" />
        </section>
      </div>

      {/* 8. Phasor Diagram & Power Triangle */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <section className="bg-[#16213a] border border-[#26365c] rounded-xl p-4">
          <h2 className="text-xs font-mono font-semibold text-slate-400 mb-3">
            5 · PHASOR DIAGRAM · V, I &amp; COMPONENT VOLTAGES
          </h2>
          <canvas
            ref={chartPhasorRef}
            className="w-full h-[340px] block rounded-lg"
          />
        </section>

        <section className="bg-[#16213a] border border-[#26365c] rounded-xl p-4">
          <h2 className="text-xs font-mono font-semibold text-slate-400 mb-3">
            6 · POWER TRIANGLE · REAL (P), REACTIVE (Q) &amp; APPARENT (S)
          </h2>
          <canvas
            ref={chartPowerTriRef}
            className="w-full h-[340px] block rounded-lg"
          />
        </section>
      </div>

      {/* 9. Time-Domain Waveforms & Power vs Frequency */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <section className="bg-[#16213a] border border-[#26365c] rounded-xl p-4">
          <h2 className="text-xs font-mono font-semibold text-slate-400 mb-3">
            7 · TIME-DOMAIN WAVEFORMS · v(t)/Vm (BLUE) &amp; i(t)/Im (GREEN)
          </h2>
          <canvas
            ref={chartTimeRef}
            className="w-full h-[280px] block rounded-lg"
          />
        </section>

        <section className="bg-[#16213a] border border-[#26365c] rounded-xl p-4">
          <h2 className="text-xs font-mono font-semibold text-slate-400 mb-3">
            8 · POWER VS FREQUENCY · P (GREEN), Q (PINK), S (BLUE)
          </h2>
          <canvas
            ref={chartPwrFreqRef}
            className="w-full h-[280px] block rounded-lg"
          />
        </section>
      </div>

      {/* 10. Parameter Sweep Charts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {circuit !== "LC" && (
          <section className="bg-[#16213a] border border-[#26365c] rounded-xl p-4">
            <h2 className="text-xs font-mono font-semibold text-slate-400 mb-2">
              |Z| VS RESISTANCE R
            </h2>
            <canvas
              ref={chartSweepRRef}
              className="w-full h-[210px] block rounded-lg"
            />
          </section>
        )}
        {circuit !== "RL" && (
          <section className="bg-[#16213a] border border-[#26365c] rounded-xl p-4">
            <h2 className="text-xs font-mono font-semibold text-slate-400 mb-2">
              |Z| VS CAPACITANCE C
            </h2>
            <canvas
              ref={chartSweepCRef}
              className="w-full h-[210px] block rounded-lg"
            />
          </section>
        )}
        {circuit !== "RC" && (
          <section className="bg-[#16213a] border border-[#26365c] rounded-xl p-4">
            <h2 className="text-xs font-mono font-semibold text-slate-400 mb-2">
              |Z| VS INDUCTANCE L
            </h2>
            <canvas
              ref={chartSweepLRef}
              className="w-full h-[210px] block rounded-lg"
            />
          </section>
        )}
      </div>
    </div>
  );
}
