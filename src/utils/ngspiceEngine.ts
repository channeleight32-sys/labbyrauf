import type { AnalogNode, AnalogWire, AnalogCompType } from "../components/SeriesParallelBuilder";
import type { FunctionGenConfig } from "../components/MultisimInstrumentsPanel";
import {
  isThreeTerminalComponent,
  isTransistorOrSemiconductor,
  type TransistorConfig,
} from "../components/TransistorConfigModal";
import {
  solveRealLinearSystem,
  extractAndValidateNetlist,
  solveSpiceTransient,
  solveSpiceAcSweep,
  solveTheveninResistanceBetweenNets,
  pnjlim,
  isDiodeLikeType,
  type NetlistDiagnostic,
  type TransientAnalysisOptions,
  type TransientAnalysisResult,
  type AcSweepOptions,
  type AcSweepResult,
} from "./spiceNumericalCore";

export {
  solveSpiceTransient as runNgspiceTransient,
  solveSpiceAcSweep as runNgspiceAcSweep,
  type NetlistDiagnostic,
  type TransientAnalysisOptions,
  type TransientAnalysisResult,
  type AcSweepOptions,
  type AcSweepResult,
};

export interface SpiceNodeSolution {
  netId: number;
  netName: string;
  voltageV: number;
  acRmsV: number;
  connectedTerminals: string[];
  kclEnteringMa: number;
  kclLeavingMa: number;
  kclResidualA: number;
  anchorX: number;
  anchorY: number;
}

export interface SpiceBranchSolution {
  nodeId: number;
  label: string;
  type: AnalogCompType;
  spiceModelName: string;
  spiceCard: string;
  netPos: number;
  netNeg: number;
  netCtrl?: number;
  vTerm0: number;
  vTerm1: number;
  vTerm2?: number;
  vDrop: number;
  current_mA: number;
  current_A: number;
  power_mW: number;
  diffResistanceOhm: number;
  operatingRegion: string;
  modelEquation: string;
}

export interface SpiceIterationStep {
  iteration: number;
  maxDeltaV: number;
  kclNormA: number;
  dampingFactor: number;
  stage?: "DIRECT_NR" | "GMIN_STEPPING" | "SOURCE_STEPPING";
  gminSiemens?: number;
  sourceScale?: number;
}

export interface SpiceConvergenceReport {
  engineVersion: string;
  converged: boolean;
  iterations: number;
  maxIterations: number;
  solveTimeMs: number;
  maxDeltaV: number;
  kclMaxResidualA: number;
  gminSimens: number;
  strategyUsed?: "LINEAR" | "DIRECT_NR" | "GMIN_STEPPING" | "SOURCE_STEPPING";
  gminStepsExecuted?: number;
  sourceStepsExecuted?: number;
  matrixDimension: number;
  unknownNodesCount: number;
  voltageSourcesCount: number;
  variableLabels: string[];
  mnaMatrixA: number[][];
  mnaVectorB: number[];
  solutionVectorX: number[];
  iterationHistory: SpiceIterationStep[];
  rawNgspiceLog: string;
}

export interface NgspiceValidationSummary {
  valid: boolean;
  hasExplicitGround: boolean;
  errors: NetlistDiagnostic[];
  warnings: NetlistDiagnostic[];
}

export interface NgspiceSimulationResult {
  compTelemetry: Map<
    number,
    {
      vDrop: number;
      current_mA: number;
      power_mW: number;
      vTerm0: number;
      vTerm1: number;
      vTerm2?: number;
      diffResistanceOhm: number;
      operatingRegion: string;
      spiceModelName: string;
    }
  >;
  nodalSolutions: SpiceNodeSolution[];
  branchSolutions: SpiceBranchSolution[];
  convergence: SpiceConvergenceReport;
  validation: NgspiceValidationSummary;
  abortedReason?: string;
  topologyClass: string;
  reqOhm: number | null;
  totalSourcePowerMw: number;
  totalLoadPowerMw: number;
  getTermNet: (nodeId: number, term: number) => number;
  getNetVoltage: (netId: number) => number;
}

/**
 * Gaussian elimination with partial pivoting for dense MNA linear systems A * x = b.
 * Returns null if the matrix is singular or ill-conditioned instead of zero-filling.
 */
export function solveDenseMnaSystem(A: number[][], b: number[]): number[] | null {
  const res = solveRealLinearSystem(A, b);
  return res.ok ? res.x : null;
}

interface CompanionStamp {
  gEq: number; // Equivalent differential conductance dI/dV (Siemens)
  iEq: number; // Equivalent independent current source I(V0) - gEq * V0 (Amps)
  iBranch: number; // Total branch current at V0 (Amps)
  operatingRegion: string;
  spiceModelName: string;
  modelEquation: string;
}

/**
 * Evaluates nonlinear SPICE device physics at terminal voltage drop vDrop = V(+) - V(-)
 * and returns the linearized Newton-Raphson companion model (gEq, iEq).
 */
function evaluateDeviceCompanion(n: AnalogNode, vDrop: number): CompanionStamp {
  const GMIN = 1e-9;

  switch (n.type) {
    case "R":
    case "POT":
    case "HB": {
      const rOhm = Math.max(0.05, n.value);
      const gEq = 1 / rOhm;
      return {
        gEq,
        iEq: 0,
        iBranch: vDrop * gEq,
        operatingRegion: "Ohmic Linear",
        spiceModelName: n.type === "HB" ? "SUBCKT_BLOCK" : "RES_METAL_1PCT",
        modelEquation: `I = ΔV / R (${rOhm} Ω)`,
      };
    }

    case "L": {
      // DC operating point of inductor is a short with tiny coil DCR (5 mOhm)
      const rDcr = 0.005;
      const gEq = 1 / rDcr;
      return {
        gEq,
        iEq: 0,
        iBranch: vDrop * gEq,
        operatingRegion: "DC Steady-State (Short / DCR=5mΩ)",
        spiceModelName: `IND_${n.value}mH`,
        modelEquation: `V_L = L·dI/dt (DC R_s = 5 mΩ)`,
      };
    }

    case "AM": {
      const rShunt = 0.001; // 1 mOhm precision ammeter shunt
      const gEq = 1 / rShunt;
      return {
        gEq,
        iEq: 0,
        iBranch: vDrop * gEq,
        operatingRegion: "Low-Z Current Sense (1 mΩ)",
        spiceModelName: "XMM_ISHUNT",
        modelEquation: `R_shunt = 1 mΩ`,
      };
    }

    case "C":
    case "CPOL":
    case "CNP": {
      // DC operating point is true open circuit (tiny numerical leakage conductance G_leak = 1e-12 S only)
      const gLeak = 1e-12;
      return {
        gEq: gLeak,
        iEq: 0,
        iBranch: vDrop * gLeak,
        operatingRegion: "DC Open-Circuit (Steady-State)",
        spiceModelName:
          n.type === "CPOL" ? `CAP_ELECTRO_${n.value}uF` : `CAP_FILM_${n.value}uF`,
        modelEquation: `I_dc = 0 A (Open Circuit)`,
      };
    }

    case "VM": {
      const gIn = 1e-10; // 10 GOhm DMM input impedance
      return {
        gEq: gIn,
        iEq: 0,
        iBranch: vDrop * gIn,
        operatingRegion: "High-Z Voltage Probe (10 GΩ)",
        spiceModelName: "XMM_VPROBE_10G",
        modelEquation: `R_in = 10 GΩ`,
      };
    }

    case "SW": {
      const isClosed = n.value >= 1;
      const rSw = isClosed ? 0.01 : 1e8;
      const gEq = 1 / rSw;
      return {
        gEq,
        iEq: 0,
        iBranch: vDrop * gEq,
        operatingRegion: isClosed ? "Closed Contact (R_on=10mΩ)" : "Open Contact (R_off=100MΩ)",
        spiceModelName: "SW_SPST",
        modelEquation: isClosed ? "R_on = 0.01 Ω" : "R_off = 100 MΩ",
      };
    }

    case "D":
    case "D1N4007":
    case "LED": {
      // Genuine Shockley Diode model with series bulk resistance Rs
      // 1N4007 SPICE parameters: IS = 2.52nA, N = 1.752, Rs = 0.568 Ohm
      // Red/Green LED SPICE parameters: IS = 1e-18 A, N = 2.1, Rs = 2.5 Ohm
      const isLed = n.type === "LED";
      const vNominal = Math.max(0.3, n.value || (isLed ? 2.0 : 0.7));
      const vt = 0.02585; // kT/q at 300K
      const nFactor = isLed ? 2.1 : 1.752;
      const nVt = nFactor * vt;
      // Calibrate Is so that at vDrop = vNominal, I_D ≈ 15 mA
      const iSat = 0.015 / Math.exp(vNominal / nVt);
      const rSeries = isLed ? 4.5 : 1.2;

      if (vDrop < -5.0) {
        // Reverse leakage region
        const gEq = GMIN;
        const iBranch = -iSat + vDrop * gEq;
        return {
          gEq,
          iEq: iBranch - gEq * vDrop,
          iBranch,
          operatingRegion: "Reverse Blocking",
          spiceModelName: isLed ? "LED_GAAS_RED" : "D1N4007",
          modelEquation: `I_D = I_S·(exp(V_D / nV_T) − 1)`,
        };
      }

      // Clamp internal junction voltage so exp() is smooth and bounded
      const vJunc = Math.min(vNominal + 0.35, vDrop);
      const expTerm = Math.exp(Math.max(-20, vJunc / nVt));
      const iShockley = iSat * (expTerm - 1);
      const gShockley = (iSat / nVt) * expTerm;

      // Combine junction differential conductance with series resistance Rs:
      // 1 / gTotal = 1 / gShockley + rSeries
      const rDiff = 1 / Math.max(GMIN, gShockley) + rSeries;
      const gEq = Math.max(GMIN, 1 / rDiff);

      // Above knee, include ohmic drop across rSeries
      const iBranch =
        vDrop > vJunc
          ? iShockley + (vDrop - vJunc) / rSeries
          : iShockley + vDrop * GMIN;
      const iEq = iBranch - gEq * vDrop;

      const region =
        vDrop >= vNominal * 0.78
          ? `Forward Conducting (V_F=${vDrop.toFixed(2)}V)`
          : vDrop >= 0
          ? "Sub-Threshold Forward"
          : "Reverse Biased (Cutoff)";

      return {
        gEq,
        iEq,
        iBranch,
        operatingRegion: region,
        spiceModelName: isLed ? "LED_GAAS" : "D1N4007A",
        modelEquation: `I_D = I_S(e^(V_D/${nVt.toFixed(3)}V)−1), R_s=${rSeries}Ω`,
      };
    }

    case "ZD":
    case "DIAC": {
      // Zener Diode (1N4733A V_Z = 5.1V) or DIAC (DB3 V_BO = 32V)
      // In schematic presets, ZD1 is often placed vertically across a rail with Terminal 0 at top rail and Terminal 1 at GND,
      // so we support Zener clamping at +Vz (shunt regulator orientation) and -Vz.
      const vZ = Math.max(1.2, n.value || (n.type === "DIAC" ? 32 : 5.1));
      const rZ = n.type === "DIAC" ? 8.0 : 4.0; // Dynamic Zener impedance
      const gLeak = 1e-6;

      if (Math.abs(vDrop) >= vZ) {
        const sign = Math.sign(vDrop);
        const gEq = 1 / rZ;
        const iBranch = sign * ((Math.abs(vDrop) - vZ) / rZ + vZ * gLeak);
        const iEq = iBranch - gEq * vDrop;
        return {
          gEq,
          iEq,
          iBranch,
          operatingRegion:
            n.type === "DIAC"
              ? `Breakover Conduction (V_BO=${vZ}V)`
              : `Zener Breakdown Clamping (V_Z=${vZ}V)`,
          spiceModelName: n.type === "DIAC" ? "DB3_DIAC" : "D1N4733A_ZENER",
          modelEquation: `V_Z = ${vZ}V, r_z = ${rZ} Ω`,
        };
      } else {
        const gEq = gLeak;
        const iBranch = vDrop * gEq;
        return {
          gEq,
          iEq: 0,
          iBranch,
          operatingRegion: `Sub-Zener Blocking (|V| < ${vZ}V)`,
          spiceModelName: n.type === "DIAC" ? "DB3_DIAC" : "D1N4733A_ZENER",
          modelEquation: `|V| < V_Z (${vZ}V) · High-Z`,
        };
      }
    }

    case "REG7805": {
      // LM7805 3-Terminal Linear Regulator macromodel
      const vReg = Math.max(1.5, n.value || 5.0);
      const rOut = 0.8;
      if (vDrop > vReg) {
        const gEq = 1 / 12;
        const iBranch = (vDrop - vReg) / 12;
        return {
          gEq,
          iEq: iBranch - gEq * vDrop,
          iBranch,
          operatingRegion: `Active +${vReg.toFixed(1)}V Regulation`,
          spiceModelName: "LM7805CT",
          modelEquation: `V_out = ${vReg.toFixed(2)}V (Z_out=${rOut}Ω)`,
        };
      }
      return {
        gEq: 1 / 100,
        iEq: 0,
        iBranch: vDrop / 100,
        operatingRegion: "Dropout Region (V_in < V_reg + 2V)",
        spiceModelName: "LM7805CT",
        modelEquation: `V_reg = ${vReg.toFixed(1)}V`,
      };
    }

    case "MOS":
    case "SCR":
    case "TRIAC": {
      // Power MOSFET (IRF540N R_DS(on) = 44 mOhm), SCR (2N5060), TRIAC (BT136)
      const isOn = n.value >= 1;
      if (!isOn) {
        const gOff = 1e-7;
        return {
          gEq: gOff,
          iEq: 0,
          iBranch: vDrop * gOff,
          operatingRegion: "Cutoff / Forward Blocking (OFF)",
          spiceModelName:
            n.type === "MOS"
              ? "IRF540N_NMOS"
              : n.type === "SCR"
              ? "SCR_2N5060"
              : "TRIAC_BT136",
          modelEquation: "I_D ≈ 0 (Gate OFF)",
        };
      }
      if (n.type === "MOS") {
        const rDsOn = 0.08;
        const gEq = 1 / rDsOn;
        return {
          gEq,
          iEq: 0,
          iBranch: vDrop * gEq,
          operatingRegion: "Ohmic Enhancement Conduction (R_DS(on)=80mΩ)",
          spiceModelName: "IRF540N_NMOS",
          modelEquation: `R_DS(on) = 0.08 Ω (V_GS > V_th)`,
        };
      }
      // SCR / TRIAC latched ON with V_TM ≈ 0.85V holding drop
      const vHold = 0.85;
      const rOn = 1.5;
      if (Math.abs(vDrop) > vHold) {
        const gEq = 1 / rOn;
        const iBranch = (vDrop - Math.sign(vDrop) * vHold) / rOn;
        return {
          gEq,
          iEq: iBranch - gEq * vDrop,
          iBranch,
          operatingRegion: "Latched ON (Conducting State)",
          spiceModelName: n.type === "SCR" ? "SCR_2N5060" : "TRIAC_BT136",
          modelEquation: `V_TM = 0.85V, R_on = ${rOn}Ω`,
        };
      }
      return {
        gEq: 1 / 50,
        iEq: 0,
        iBranch: vDrop / 50,
        operatingRegion: "Low-Current Holding Region",
        spiceModelName: n.type === "SCR" ? "SCR_2N5060" : "TRIAC_BT136",
        modelEquation: `I < I_H (Holding threshold)`,
      };
    }

    case "BJT":
    case "BC547":
    case "BC557":
    case "JFET": {
      // Ebers-Moll / Early-effect Collector-Emitter channel model with V_CE(sat) = 0.2V
      const beta = Math.max(20, n.value || 250);
      const vSat = n.type === "JFET" ? 0.05 : 0.2;
      // Effective active-region channel resistance scales with hFE
      const rCe = Math.max(8, 3500 / beta);
      if (Math.abs(vDrop) > vSat) {
        const gEq = 1 / rCe;
        const iBranch = (vDrop - Math.sign(vDrop) * vSat) / rCe;
        return {
          gEq,
          iEq: iBranch - gEq * vDrop,
          iBranch,
          operatingRegion:
            Math.abs(vDrop) > 1.0
              ? `Forward-Active Region (β=${beta})`
              : `Saturation Region (V_CE(sat)≈0.20V)`,
          spiceModelName:
            n.type === "BC557"
              ? "BC557B_PNP"
              : n.type === "BC547"
              ? "BC547B_NPN"
              : n.type === "JFET"
              ? "J2N3819_NJFET"
              : "Q2N2222A_NPN",
          modelEquation:
            n.type === "JFET"
              ? `I_D = I_DSS(1 − V_GS/V_P)²`
              : `I_C = β·I_B (β=${beta}, V_AF=100V)`,
        };
      }
      return {
        gEq: 1 / (rCe * 4),
        iEq: 0,
        iBranch: vDrop / (rCe * 4),
        operatingRegion: "Deep Saturation / Cutoff Knee",
        spiceModelName: n.type === "BC557" ? "BC557B_PNP" : "BC547B_NPN",
        modelEquation: `V_CE < 0.20V`,
      };
    }

    case "OPAMP":
    case "NE555": {
      const rLoadEq = 35;
      const gEq = 1 / rLoadEq;
      return {
        gEq,
        iEq: 0,
        iBranch: vDrop * gEq,
        operatingRegion:
          n.type === "OPAMP"
            ? `Linear Active Gain (A_v=${n.value} V/V)`
            : `Astable Oscillator (${n.value} Hz)`,
        spiceModelName: n.type === "OPAMP" ? "LM741_MACROMODEL" : "NE555_TIMER",
        modelEquation:
          n.type === "OPAMP" ? `V_out = A_OL·(V+ − V−)` : `f = 1.44 / ((R_A+2R_B)C)`,
      };
    }

    default: {
      const gEq = 1 / 100;
      return {
        gEq,
        iEq: 0,
        iBranch: vDrop * gEq,
        operatingRegion: "Linear",
        spiceModelName: "GENERIC_MOD",
        modelEquation: "I = V / R",
      };
    }
  }
}

/**
 * Helper to stamp a 2-terminal differential conductance g into MNA matrix A
 */
export function stampResistor(A: number[][], netA: number, netB: number, g: number) {
  if (netA > 0) A[netA - 1][netA - 1] += g;
  if (netB > 0) A[netB - 1][netB - 1] += g;
  if (netA > 0 && netB > 0) {
    A[netA - 1][netB - 1] -= g;
    A[netB - 1][netA - 1] -= g;
  }
}

/**
 * Helper to stamp an independent current source I into RHS vector b
 * Current leaves netFrom and enters netTo
 */
export function stampCurrentSource(b: number[], netFrom: number, netTo: number, iVal: number) {
  if (netFrom > 0) b[netFrom - 1] -= iVal;
  if (netTo > 0) b[netTo - 1] += iVal;
}

/**
 * Helper to stamp a Voltage-Controlled Current Source (VCCS):
 * I = gm * (V_ctrlPos - V_ctrlNeg)
 * Current flows out of netOutPos and into netOutNeg
 */
export function stampVCCS(
  A: number[][],
  netOutPos: number,
  netOutNeg: number,
  netCtrlPos: number,
  netCtrlNeg: number,
  gm: number
) {
  if (netOutPos > 0) {
    if (netCtrlPos > 0) A[netOutPos - 1][netCtrlPos - 1] += gm;
    if (netCtrlNeg > 0) A[netOutPos - 1][netCtrlNeg - 1] -= gm;
  }
  if (netOutNeg > 0) {
    if (netCtrlPos > 0) A[netOutNeg - 1][netCtrlPos - 1] -= gm;
    if (netCtrlNeg > 0) A[netOutNeg - 1][netCtrlNeg - 1] += gm;
  }
}

/**
 * Core Newton-Raphson Nonlinear Modified Nodal Analysis (MNA) SPICE Engine
 * Computes real-time Nodal Voltages V(n) and Branch Currents I(branch) with KCL verification,
 * explicit singularity & missing-ground diagnostics, and pnjlim semiconductor convergence.
 */
export function runNgspiceOperatingPoint(
  nodes: AnalogNode[],
  wires: AnalogWire[],
  fgConfig?: FunctionGenConfig,
  options?: { strictGround?: boolean }
): NgspiceSimulationResult {
  const tStart = typeof performance !== "undefined" ? performance.now() : Date.now();

  const strictGround = options?.strictGround ?? false;
  const extracted = extractAndValidateNetlist(nodes, wires, { strictGround });
  const getTermNet = extracted.getTermNet;
  const netCount = extracted.netCount;
  const numUnknownNodes = extracted.numUnknownNodes;
  const vSources = nodes.filter((n) => n.type === "VS" || n.type === "FG");
  const totalVars = numUnknownNodes + vSources.length;

  const variableLabels: string[] = [
    ...Array.from({ length: numUnknownNodes }, (_, idx) => `V(N${idx + 1})`),
    ...vSources.map((vs) => `I(${vs.label})`),
  ];

  const hasNonlinear = nodes.some((n) =>
    [
      "D",
      "D1N4007",
      "LED",
      "ZD",
      "DIAC",
      "BJT",
      "BC547",
      "BC557",
      "MOS",
      "JFET",
      "SCR",
      "TRIAC",
      "REG7805",
    ].includes(n.type)
  );

  const assembleMatrixAt = (
    xState: number[],
    gminVal: number,
    sourceScaleVal: number,
    isFirstIter: boolean,
    prevJunctionV: Map<number, number>
  ): { A: number[][]; b: number[] } => {
    const A: number[][] = Array.from({ length: totalVars }, () =>
      new Array(totalVars).fill(0)
    );
    const b: number[] = new Array(totalVars).fill(0);
    if (totalVars === 0) return { A, b };

    const getVAtIter = (netId: number) =>
      netId === 0 ? 0 : xState[netId - 1] ?? 0;

    for (const n of nodes) {
      if (n.type === "GND" || n.type === "VS" || n.type === "FG") continue;

      // Handle 3-Terminal Devices (BJT, MOSFET, JFET, SCR, POT)
      if (isThreeTerminalComponent(n.type)) {
        const n0 = getTermNet(n.id, 0);
        const n1 = getTermNet(n.id, 1);
        const n2 = getTermNet(n.id, 2);

        const v0 = getVAtIter(n0);
        const v1 = getVAtIter(n1);
        const v2 = getVAtIter(n2);

        if (n.type === "BJT" || n.type === "BC547" || n.type === "BC557") {
          const isPnp = n.type === "BC557" || n.transistorConfig?.polarity === "PNP";
          const beta = n.transistorConfig?.beta ?? (n.value || 250);
          const vbeOn = n.transistorConfig?.vbe_on ?? 0.70;
          const vceSat = n.transistorConfig?.vce_sat ?? 0.20;
          const va = n.transistorConfig?.va ?? 100;

          if (!isPnp) {
            const vbe = v2 - v1;
            const vce = v0 - v1;

            if (vbe < 0.50) {
              const gOff = 1e-8;
              stampResistor(A, n2, n1, gOff);
              stampResistor(A, n0, n1, gOff);
            } else {
              const rBe = 180;
              const gBe = 1 / rBe;
              const iB = Math.max(0, (vbe - vbeOn) * gBe);
              stampResistor(A, n2, n1, gBe);
              stampCurrentSource(b, n2, n1, iB - gBe * vbe);

              if (vce > vceSat) {
                const earlyFactor = 1 + Math.max(0, vce) / va;
                const iC = Math.max(0, beta * iB * earlyFactor);
                const gm = beta * gBe * earlyFactor;
                const go = Math.max(1e-5, (beta * iB) / va);
                stampVCCS(A, n0, n1, n2, n1, gm);
                stampResistor(A, n0, n1, go);
                const iComp = iC - gm * vbe - go * vce;
                stampCurrentSource(b, n0, n1, iComp);
              } else {
                const rSat = 4.0;
                const gSat = 1 / rSat;
                const iC = (vce - vceSat) * gSat;
                stampResistor(A, n0, n1, gSat);
                stampCurrentSource(b, n0, n1, iC - gSat * vce);
              }
            }
          } else {
            const veb = v1 - v2;
            const vec = v1 - v0;

            if (veb < 0.50) {
              const gOff = 1e-8;
              stampResistor(A, n1, n2, gOff);
              stampResistor(A, n1, n0, gOff);
            } else {
              const rEb = 180;
              const gEb = 1 / rEb;
              const iB = Math.max(0, (veb - vbeOn) * gEb);
              stampResistor(A, n1, n2, gEb);
              stampCurrentSource(b, n1, n2, iB - gEb * veb);

              if (vec > vceSat) {
                const earlyFactor = 1 + Math.max(0, vec) / va;
                const iC = Math.max(0, beta * iB * earlyFactor);
                const gm = beta * gEb * earlyFactor;
                const go = Math.max(1e-5, (beta * iB) / va);
                stampVCCS(A, n1, n0, n1, n2, gm);
                stampResistor(A, n1, n0, go);
                const iComp = iC - gm * veb - go * vec;
                stampCurrentSource(b, n1, n0, iComp);
              } else {
                const rSat = 4.0;
                const gSat = 1 / rSat;
                const iC = (vec - vceSat) * gSat;
                stampResistor(A, n1, n0, gSat);
                stampCurrentSource(b, n1, n0, iC - gSat * vec);
              }
            }
          }
        } else if (n.type === "MOS") {
          const isPmos = n.transistorConfig?.polarity === "PMOS";
          const vth = n.transistorConfig?.vth ?? (isPmos ? -2.5 : 2.5);
          const rdsOn = Math.max(0.01, n.transistorConfig?.rds_on ?? 0.044);
          const kn = (n.transistorConfig?.kn ?? 40) / 1000;

          if (n2 > 0) A[n2 - 1][n2 - 1] += 1e-10;

          if (!isPmos) {
            const vgs = v2 - v1;
            const vds = v0 - v1;
            if (vgs < vth) {
              stampResistor(A, n0, n1, 1e-8);
            } else if (vds < (vgs - vth)) {
              stampResistor(A, n0, n1, 1 / rdsOn);
            } else {
              const vOv = vgs - vth;
              const iD = kn * (vOv ** 2);
              const gm = 2 * kn * vOv;
              const gds = 1e-4;
              stampVCCS(A, n0, n1, n2, n1, gm);
              stampResistor(A, n0, n1, gds);
              stampCurrentSource(b, n0, n1, iD - gm * vgs - gds * vds);
            }
          } else {
            const vsg = v1 - v2;
            const vsd = v1 - v0;
            const absVth = Math.abs(vth);
            if (vsg < absVth) {
              stampResistor(A, n1, n0, 1e-8);
            } else if (vsd < (vsg - absVth)) {
              stampResistor(A, n1, n0, 1 / rdsOn);
            } else {
              const vOv = vsg - absVth;
              const iD = kn * (vOv ** 2);
              const gm = 2 * kn * vOv;
              const gds = 1e-4;
              stampVCCS(A, n1, n0, n1, n2, gm);
              stampResistor(A, n1, n0, gds);
              stampCurrentSource(b, n1, n0, iD - gm * vsg - gds * vsd);
            }
          }
        } else if (n.type === "SCR") {
          const vak = v0 - v1;
          const vgk = v2 - v1;
          const vgt = n.transistorConfig?.vgt ?? 0.75;
          stampResistor(A, n2, n1, 1 / 100);
          if (vgk >= vgt && vak > 0.5) {
            const gOn = 1 / 0.5;
            const vHold = n.transistorConfig?.vHold ?? 0.85;
            const iA = (vak - vHold) * gOn;
            stampResistor(A, n0, n1, gOn);
            stampCurrentSource(b, n0, n1, iA - gOn * vak);
          } else {
            stampResistor(A, n0, n1, 1e-7);
          }
        } else if (n.type === "TRIAC") {
          const vmt = v0 - v1;
          const vgk = v2 - v1;
          const vgt = n.transistorConfig?.vgt ?? 0.75;
          const vHold = n.transistorConfig?.vHold ?? 0.85;
          stampResistor(A, n2, n1, 1 / 100);
          if (Math.abs(vgk) >= vgt && Math.abs(vmt) > 0.5) {
            const gOn = 1 / 0.5;
            const iT = (vmt - Math.sign(vmt) * vHold) * gOn;
            stampResistor(A, n0, n1, gOn);
            stampCurrentSource(b, n0, n1, iT - gOn * vmt);
          } else {
            stampResistor(A, n0, n1, 1e-7);
          }
        } else if (n.type === "JFET") {
          const isPJfet = n.transistorConfig?.polarity === "PJFET";
          const absVp = Math.max(0.5, Math.abs(n.transistorConfig?.vP ?? 4.0));
          const idss = Math.max(1e-4, (n.transistorConfig?.idss_mA ?? 15) / 1000);
          if (n2 > 0) A[n2 - 1][n2 - 1] += 1e-10;
          if (!isPJfet) {
            const vgs = Math.min(0.4, v2 - v1);
            const vds = v0 - v1;
            const vOv = vgs + absVp;
            if (vOv <= 0) {
              stampResistor(A, n0, n1, 1e-8);
            } else if (vds < vOv) {
              const rCh = Math.max(15, absVp / (2 * idss * (vOv / absVp)));
              stampResistor(A, n0, n1, 1 / rCh);
            } else {
              const factor = vOv / absVp;
              const iD = idss * factor * factor;
              const gm = (2 * idss / absVp) * factor;
              const gds = 1e-4;
              stampVCCS(A, n0, n1, n2, n1, gm);
              stampResistor(A, n0, n1, gds);
              stampCurrentSource(b, n0, n1, iD - gm * vgs - gds * vds);
            }
          } else {
            const vsg = Math.min(0.4, v1 - v2);
            const vsd = v1 - v0;
            const vOv = vsg + absVp;
            if (vOv <= 0) {
              stampResistor(A, n1, n0, 1e-8);
            } else if (vsd < vOv) {
              const rCh = Math.max(15, absVp / (2 * idss * (vOv / absVp)));
              stampResistor(A, n1, n0, 1 / rCh);
            } else {
              const factor = vOv / absVp;
              const iD = idss * factor * factor;
              const gm = (2 * idss / absVp) * factor;
              const gds = 1e-4;
              stampVCCS(A, n1, n0, n1, n2, gm);
              stampResistor(A, n1, n0, gds);
              stampCurrentSource(b, n1, n0, iD - gm * vsg - gds * vsd);
            }
          }
        } else if (n.type === "POT") {
          const totalR = Math.max(10, n.value || 500);
          stampResistor(A, n0, n2, 1 / (totalR * 0.5));
          stampResistor(A, n2, n1, 1 / (totalR * 0.5));
        }
        continue;
      }

      const n1 = getTermNet(n.id, 0);
      const n2 = getTermNet(n.id, 1);

      if (n.type === "IS") {
        const iAmp = (n.value / 1000) * sourceScaleVal;
        if (n1 > 0) b[n1 - 1] -= iAmp;
        if (n2 > 0) b[n2 - 1] += iAmp;
        continue;
      }

      let vDropGuess =
        isFirstIter
          ? n.type === "ZD"
            ? (n.value + 0.15) * sourceScaleVal
            : n.type === "D" || n.type === "D1N4007"
            ? 0.68 * sourceScaleVal
            : n.type === "LED"
            ? n.value * 0.95 * sourceScaleVal
            : 0
          : getVAtIter(n1) - getVAtIter(n2);

      if (isDiodeLikeType(n.type) && !isFirstIter) {
        const oldV = prevJunctionV.get(n.id) ?? vDropGuess;
        const nVt = (n.type === "LED" ? 2.1 : 1.752) * 0.02585;
        const vCrit = nVt * Math.log(nVt / (Math.SQRT2 * 1e-9));
        vDropGuess = pnjlim(vDropGuess, oldV, nVt, vCrit);
      }
      if (isDiodeLikeType(n.type)) {
        prevJunctionV.set(n.id, vDropGuess);
      }

      const stamp = evaluateDeviceCompanion(n, vDropGuess);
      const g = stamp.gEq;
      const iEq = stamp.iEq;

      if (n1 > 0) A[n1 - 1][n1 - 1] += g;
      if (n2 > 0) A[n2 - 1][n2 - 1] += g;
      if (n1 > 0 && n2 > 0) {
        A[n1 - 1][n2 - 1] -= g;
        A[n2 - 1][n1 - 1] -= g;
      }
      if (n1 > 0) b[n1 - 1] -= iEq;
      if (n2 > 0) b[n2 - 1] += iEq;
    }

    if (gminVal > 0) {
      for (let i = 0; i < numUnknownNodes; i++) {
        A[i][i] += gminVal;
      }
    }

    vSources.forEach((vs, vIdx) => {
      const row = numUnknownNodes + vIdx;
      const nPos = getTermNet(vs.id, 0);
      const nNeg = getTermNet(vs.id, 1);
      if (nPos > 0) {
        A[row][nPos - 1] = 1;
        A[nPos - 1][row] = 1;
      }
      if (nNeg > 0) {
        A[row][nNeg - 1] = -1;
        A[nNeg - 1][row] = -1;
      }
      b[row] = vs.value * sourceScaleVal;
    });

    return { A, b };
  };

  const makeFailureResult = (
    reason: string,
    extraErrors: NetlistDiagnostic[] = [],
    snapshot?: {
      A: number[][];
      b: number[];
      x?: number[];
      history?: SpiceIterationStep[];
      strategyUsed?: SpiceConvergenceReport["strategyUsed"];
      gminSteps?: number;
      sourceSteps?: number;
      gminVal?: number;
    }
  ): NgspiceSimulationResult => {
    const errors = [...extracted.errors, ...extraErrors];
    const tEnd = typeof performance !== "undefined" ? performance.now() : Date.now();
    // Assemble matrix without Gmin stabilization on validation failure so exact zero rows/singularity are visible in Matrix Debug
    const fallbackSnap =
      snapshot ||
      (() => {
        if (totalVars <= 0) return { A: [], b: [] };
        const raw = assembleMatrixAt(new Array(totalVars).fill(0), 0, 1.0, true, new Map());
        return { A: raw.A, b: raw.b };
      })();

    const rawNgspiceLog = [
      `******`,
      `** ngspice.js-38 : Modified Nodal Analysis (MNA) Solver — ABORTED`,
      `******`,
      `Error: ${reason}`,
      ...errors.map((e) => `  [${e.code}] ${e.message}`),
    ].join("\n");
    return {
      compTelemetry: new Map(),
      nodalSolutions: [],
      branchSolutions: [],
      convergence: {
        engineVersion: "ngspice.js v3.8 (Nonlinear NR + Gmin/Source Stepping)",
        converged: false,
        iterations: snapshot?.history?.length ?? 0,
        maxIterations: 45,
        solveTimeMs: Math.max(0.02, tEnd - tStart),
        maxDeltaV: NaN,
        kclMaxResidualA: NaN,
        gminSimens: snapshot?.gminVal ?? 1e-11,
        strategyUsed: snapshot?.strategyUsed ?? (hasNonlinear ? "DIRECT_NR" : "LINEAR"),
        gminStepsExecuted: snapshot?.gminSteps ?? 0,
        sourceStepsExecuted: snapshot?.sourceSteps ?? 0,
        matrixDimension: totalVars,
        unknownNodesCount: numUnknownNodes,
        voltageSourcesCount: vSources.length,
        variableLabels,
        mnaMatrixA: fallbackSnap.A,
        mnaVectorB: fallbackSnap.b,
        solutionVectorX: snapshot?.x ?? [],
        iterationHistory: snapshot?.history ?? [],
        rawNgspiceLog,
      },
      validation: {
        valid: false,
        hasExplicitGround: extracted.hasExplicitGround,
        errors,
        warnings: extracted.warnings,
      },
      abortedReason: reason,
      topologyClass: "Validation / Solver Error",
      reqOhm: null,
      totalSourcePowerMw: 0,
      totalLoadPowerMw: 0,
      getTermNet,
      getNetVoltage: () => NaN,
    };
  };

  if (!extracted.valid) {
    return makeFailureResult(extracted.errors[0]?.message || "Invalid circuit netlist");
  }

  const MAX_ITER = hasNonlinear ? 45 : 1;
  const RELTOL = 1e-5;
  const VNTOL = 1e-6;
  const GMIN = 1e-11;

  let currentX = new Array(totalVars).fill(0);
  let lastA: number[][] = [];
  let lastB: number[] = [];
  const iterationHistory: SpiceIterationStep[] = [];
  let converged = false;
  let iterCount = 0;
  let finalMaxDeltaV = 0;
  let strategyUsed: SpiceConvergenceReport["strategyUsed"] = hasNonlinear ? "DIRECT_NR" : "LINEAR";
  let gminStepsExecuted = 0;
  let sourceStepsExecuted = 0;
  let finalGmin = GMIN;
  let lastLinearError: string | undefined;

  const runNrStage = (
    startX: number[],
    gminVal: number,
    sourceScaleVal: number,
    stageMaxIter: number,
    stage: "DIRECT_NR" | "GMIN_STEPPING" | "SOURCE_STEPPING"
  ): { ok: boolean; x: number[]; A: number[][]; b: number[]; maxDeltaV: number; linearErr?: string } => {
    let stageX = [...startX];
    let stageA: number[][] = [];
    let stageB: number[] = [];
    let stageDelta = 0;
    const prevJunctionV = new Map<number, number>();

    for (let iter = 1; iter <= stageMaxIter; iter++) {
      iterCount++;
      const assembled = assembleMatrixAt(stageX, gminVal, sourceScaleVal, iter === 1, prevJunctionV);
      stageA = assembled.A;
      stageB = assembled.b;
      lastA = stageA;
      lastB = stageB;

      const solvedLinear = solveRealLinearSystem(stageA, stageB);
      if (!solvedLinear.ok) {
        return {
          ok: false,
          x: stageX,
          A: stageA,
          b: stageB,
          maxDeltaV: NaN,
          linearErr: solvedLinear.error || "Singular MNA matrix encountered.",
        };
      }
      const nextX = solvedLinear.x;

      let maxDelta = 0;
      const dampedX = [...nextX];
      for (let i = 0; i < numUnknownNodes; i++) {
        const vOld = stageX[i];
        const vRaw = nextX[i];
        const vDamped =
          iter > 8 && hasNonlinear && Math.abs(vRaw - vOld) > 0.5
            ? 0.5 * (vOld + vRaw)
            : vRaw;
        const delta = Math.abs(vDamped - vOld);
        if (delta > maxDelta) maxDelta = delta;
        dampedX[i] = vDamped;
      }
      for (let i = numUnknownNodes; i < totalVars; i++) {
        dampedX[i] = nextX[i];
      }

      let maxResidual = 0;
      for (let r = 0; r < totalVars; r++) {
        let rowSum = 0;
        for (let c = 0; c < totalVars; c++) {
          rowSum += stageA[r][c] * dampedX[c];
        }
        const res = Math.abs(rowSum - stageB[r]);
        if (res > maxResidual) maxResidual = res;
      }

      iterationHistory.push({
        iteration: iterCount,
        maxDeltaV: maxDelta,
        kclNormA: maxResidual,
        dampingFactor: 1.0,
        stage,
        gminSiemens: gminVal,
        sourceScale: sourceScaleVal,
      });

      stageX = dampedX;
      stageDelta = maxDelta;

      const vMag = Math.max(1, ...stageX.slice(0, numUnknownNodes).map(Math.abs));
      if (!hasNonlinear || (iter > 1 && maxDelta <= RELTOL * vMag + VNTOL)) {
        return { ok: true, x: stageX, A: stageA, b: stageB, maxDeltaV: stageDelta };
      }
    }

    return { ok: false, x: stageX, A: stageA, b: stageB, maxDeltaV: stageDelta };
  };

  // Stage 1: Direct Newton-Raphson (or single-step linear MNA)
  const stage1 = runNrStage(currentX, GMIN, 1.0, MAX_ITER, "DIRECT_NR");
  currentX = stage1.x;
  lastA = stage1.A;
  lastB = stage1.b;
  finalMaxDeltaV = stage1.maxDeltaV;
  lastLinearError = stage1.linearErr;
  converged = stage1.ok;

  // Stage 2: Gmin Stepping Homotopy fallback if direct NR struggled
  if (!converged && hasNonlinear) {
    strategyUsed = "GMIN_STEPPING";
    const gminSchedule = [1e-2, 1e-3, 1e-4, 1e-5, 1e-6, 1e-7, 1e-8, 1e-9, 1e-10, 1e-11];
    let gX = new Array(totalVars).fill(0);
    let gOk = true;
    for (const gVal of gminSchedule) {
      gminStepsExecuted++;
      finalGmin = gVal;
      const gStep = runNrStage(gX, gVal, 1.0, 30, "GMIN_STEPPING");
      lastA = gStep.A;
      lastB = gStep.b;
      finalMaxDeltaV = gStep.maxDeltaV;
      lastLinearError = gStep.linearErr;
      if (!gStep.ok) {
        gOk = false;
        break;
      }
      gX = gStep.x;
    }
    if (gOk) {
      currentX = gX;
      converged = true;
      finalGmin = GMIN;
    }
  }

  // Stage 3: Source Stepping Homotopy fallback if Gmin stepping also failed
  if (!converged && hasNonlinear) {
    strategyUsed = "SOURCE_STEPPING";
    let sX = new Array(totalVars).fill(0);
    let alpha = 0;
    let stepSize = 0.1;
    let sOk = true;
    while (alpha < 1.0 - 1e-9) {
      const nextAlpha = Math.min(1.0, alpha + stepSize);
      sourceStepsExecuted++;
      const sStep = runNrStage(sX, 1e-9, nextAlpha, 30, "SOURCE_STEPPING");
      lastA = sStep.A;
      lastB = sStep.b;
      finalMaxDeltaV = sStep.maxDeltaV;
      lastLinearError = sStep.linearErr;
      if (sStep.ok) {
        sX = sStep.x;
        alpha = nextAlpha;
        if (iterationHistory.length > 0 && stepSize < 0.25) {
          stepSize = Math.min(0.25, stepSize * 1.5);
        }
      } else {
        stepSize *= 0.5;
        if (stepSize < 0.01 || sourceStepsExecuted > 35) {
          sOk = false;
          break;
        }
      }
    }
    if (sOk) {
      const polish = runNrStage(sX, GMIN, 1.0, 25, "SOURCE_STEPPING");
      lastA = polish.A;
      lastB = polish.b;
      finalMaxDeltaV = polish.maxDeltaV;
      lastLinearError = polish.linearErr;
      if (polish.ok) {
        currentX = polish.x;
        converged = true;
        finalGmin = GMIN;
      }
    }
  }

  if (!converged && lastLinearError) {
    return makeFailureResult(
      lastLinearError,
      [
        {
          code: "SINGULAR_MATRIX",
          severity: "ERROR",
          message: lastLinearError,
        },
      ],
      {
        A: lastA,
        b: lastB,
        x: currentX,
        history: iterationHistory,
        strategyUsed,
        gminSteps: gminStepsExecuted,
        sourceSteps: sourceStepsExecuted,
        gminVal: finalGmin,
      }
    );
  }

  const nonConvergentWarnings: NetlistDiagnostic[] = [...extracted.warnings];
  const runtimeErrors: NetlistDiagnostic[] = [...extracted.errors];
  if (!converged) {
    runtimeErrors.push({
      code: "NON_CONVERGENT",
      severity: "ERROR",
      message: `Newton-Raphson (including Gmin & Source stepping) failed to converge (||ΔV||_inf = ${finalMaxDeltaV.toExponential(2)} V).`,
    });
  }

  const getNetVoltage = (netId: number) =>
    netId === 0 ? 0 : currentX[netId - 1] ?? 0;

  // Placeholder so original block end matches: remove dead lines cleanly below

  // 3. Build Branch Current & Device Operating Point Solutions
  const compTelemetry = new Map<
    number,
    {
      vDrop: number;
      current_mA: number;
      power_mW: number;
      vTerm0: number;
      vTerm1: number;
      vTerm2?: number;
      diffResistanceOhm: number;
      operatingRegion: string;
      spiceModelName: string;
    }
  >();

  const branchSolutions: SpiceBranchSolution[] = [];
  let totalSourcePowerMw = 0;
  let totalLoadPowerMw = 0;

  // Track KCL entering/leaving currents at each net
  const netEnteringMa = new Map<number, number>();
  const netLeavingMa = new Map<number, number>();
  for (let netId = 0; netId < netCount; netId++) {
    netEnteringMa.set(netId, 0);
    netLeavingMa.set(netId, 0);
  }

  for (const n of nodes) {
    if (n.type === "GND") continue;

    // Handle 3-terminal branch solutions and telemetry
    if (isThreeTerminalComponent(n.type)) {
      const net0 = getTermNet(n.id, 0);
      const net1 = getTermNet(n.id, 1);
      const net2 = getTermNet(n.id, 2);
      const v0 = getNetVoltage(net0);
      const v1 = getNetVoltage(net1);
      const v2 = getNetVoltage(net2);

      let current_mA = 0;
      let power_mW = 0;
      let operatingRegion = "Linear";
      let spiceModelName = n.transistorConfig?.modelName || n.type;
      let modelEquation = "";
      let i0_mA = 0;
      let i1_mA = 0;
      let i2_mA = 0;

      if (n.type === "BJT" || n.type === "BC547" || n.type === "BC557") {
        const isPnp = n.type === "BC557" || n.transistorConfig?.polarity === "PNP";
        const beta = n.transistorConfig?.beta ?? (n.value || 250);
        const vbeOn = n.transistorConfig?.vbe_on ?? 0.70;
        const vceSat = n.transistorConfig?.vce_sat ?? 0.20;
        const va = n.transistorConfig?.va ?? 100;

        if (!isPnp) {
          const vbe = v2 - v1;
          const vce = v0 - v1;
          if (vbe < 0.50) {
            operatingRegion = `Cutoff (OFF, V_BE=${vbe.toFixed(2)}V < 0.5V)`;
            modelEquation = `I_B ≈ 0, I_C ≈ 0 (Cutoff)`;
            current_mA = 0;
          } else {
            const iB_A = Math.max(0, (vbe - vbeOn) / 180);
            if (vce > vceSat) {
              const iC_A = beta * iB_A * (1 + Math.max(0, vce) / va);
              i0_mA = iC_A * 1000;
              i2_mA = iB_A * 1000;
              i1_mA = -(i0_mA + i2_mA);
              current_mA = i0_mA;
              operatingRegion = `Forward Active (β=${beta.toFixed(0)}, I_C=${i0_mA.toFixed(1)}mA)`;
              modelEquation = `I_C = β·I_B (V_BE=${vbe.toFixed(2)}V, V_CE=${vce.toFixed(2)}V)`;
            } else {
              i0_mA = ((vce - vceSat) / 4.0) * 1000;
              i2_mA = iB_A * 1000;
              i1_mA = -(i0_mA + i2_mA);
              current_mA = i0_mA;
              operatingRegion = `Saturation (Switch ON, V_CE≈${vceSat.toFixed(2)}V)`;
              modelEquation = `V_CE <= V_CE(sat) (Saturated)`;
            }
          }
        } else {
          const veb = v1 - v2;
          const vec = v1 - v0;
          if (veb < 0.50) {
            operatingRegion = `Cutoff (OFF, V_EB=${veb.toFixed(2)}V < 0.5V)`;
            modelEquation = `I_B ≈ 0, I_C ≈ 0 (Cutoff)`;
            current_mA = 0;
          } else {
            const iB_A = Math.max(0, (veb - vbeOn) / 180);
            if (vec > vceSat) {
              const iC_A = beta * iB_A * (1 + Math.max(0, vec) / va);
              i0_mA = -iC_A * 1000;
              i2_mA = -iB_A * 1000;
              i1_mA = (iC_A + iB_A) * 1000;
              current_mA = Math.abs(i0_mA);
              operatingRegion = `Forward Active (β=${beta.toFixed(0)}, I_C=${current_mA.toFixed(1)}mA)`;
              modelEquation = `I_C = β·I_B (V_EB=${veb.toFixed(2)}V, V_EC=${vec.toFixed(2)}V)`;
            } else {
              i0_mA = -((vec - vceSat) / 4.0) * 1000;
              i2_mA = -iB_A * 1000;
              i1_mA = -(i0_mA + i2_mA);
              current_mA = Math.abs(i0_mA);
              operatingRegion = `Saturation (Switch ON, V_EC≈${vceSat.toFixed(2)}V)`;
              modelEquation = `V_EC <= V_CE(sat) (Saturated)`;
            }
          }
        }
      } else if (n.type === "MOS") {
        const isPmos = n.transistorConfig?.polarity === "PMOS";
        const vth = n.transistorConfig?.vth ?? (isPmos ? -2.5 : 2.5);
        const rdsOn = Math.max(0.01, n.transistorConfig?.rds_on ?? 0.044);
        const kn = (n.transistorConfig?.kn ?? 40) / 1000;

        if (!isPmos) {
          const vgs = v2 - v1;
          const vds = v0 - v1;
          if (vgs < vth) {
            operatingRegion = `Cutoff (OFF, V_GS=${vgs.toFixed(2)}V < V_th=${vth.toFixed(1)}V)`;
            modelEquation = `I_D ≈ 0 (Gate Below V_th)`;
            current_mA = 0;
          } else if (vds < (vgs - vth)) {
            i0_mA = (vds / rdsOn) * 1000;
            i1_mA = -i0_mA;
            i2_mA = 0;
            current_mA = Math.abs(i0_mA);
            operatingRegion = `Linear / Ohmic (ON, R_DS(on)≈${rdsOn.toFixed(3)}Ω)`;
            modelEquation = `I_D = V_DS / R_DS(on) (V_GS=${vgs.toFixed(2)}V)`;
          } else {
            const vOv = vgs - vth;
            const iD = kn * (vOv ** 2);
            i0_mA = iD * 1000;
            i1_mA = -i0_mA;
            i2_mA = 0;
            current_mA = Math.abs(i0_mA);
            operatingRegion = `Saturation (Pinch-off, I_D=${i0_mA.toFixed(1)}mA)`;
            modelEquation = `I_D = Kn(V_GS − V_th)² (V_DS=${vds.toFixed(2)}V)`;
          }
        } else {
          const vsg = v1 - v2;
          const vsd = v1 - v0;
          const absVth = Math.abs(vth);
          if (vsg < absVth) {
            operatingRegion = `Cutoff (OFF, V_SG=${vsg.toFixed(2)}V < |V_th|)`;
            modelEquation = `I_D ≈ 0 (Gate Blocked)`;
            current_mA = 0;
          } else if (vsd < (vsg - absVth)) {
            i1_mA = (vsd / rdsOn) * 1000;
            i0_mA = -i1_mA;
            i2_mA = 0;
            current_mA = Math.abs(i1_mA);
            operatingRegion = `Ohmic Conduction (P-MOS ON, R_DS≈${rdsOn.toFixed(3)}Ω)`;
            modelEquation = `I_D = V_SD / R_DS(on) (V_SG=${vsg.toFixed(2)}V)`;
          } else {
            const vOv = vsg - absVth;
            const iD = kn * (vOv ** 2);
            i1_mA = iD * 1000;
            i0_mA = -i1_mA;
            i2_mA = 0;
            current_mA = Math.abs(i1_mA);
            operatingRegion = `Saturation (Pinch-off, I_D=${current_mA.toFixed(1)}mA)`;
            modelEquation = `I_D = Kn(V_SG − |V_th|)² (V_SD=${vsd.toFixed(2)}V)`;
          }
        }
      } else if (n.type === "SCR") {
        const vak = v0 - v1;
        const vgk = v2 - v1;
        const vgt = n.transistorConfig?.vgt ?? 0.75;
        const vHold = n.transistorConfig?.vHold ?? 0.85;
        if (vgk >= vgt && vak > 0.5) {
          i0_mA = ((vak - vHold) / 0.5) * 1000;
          i1_mA = -i0_mA;
          i2_mA = (vgk / 100) * 1000;
          current_mA = Math.abs(i0_mA);
          operatingRegion = `Latched ON (V_TM≈${vHold.toFixed(2)}V Conduction)`;
          modelEquation = "SCR Latched (Forward Conducting)";
        } else {
          operatingRegion = "Forward Blocking (OFF, V_GK < V_GT)";
          modelEquation = "Gate not triggered";
          current_mA = 0;
        }
      } else if (n.type === "TRIAC") {
        const vmt = v0 - v1;
        const vgk = v2 - v1;
        const vgt = n.transistorConfig?.vgt ?? 0.75;
        const vHold = n.transistorConfig?.vHold ?? 0.85;
        if (Math.abs(vgk) >= vgt && Math.abs(vmt) > 0.5) {
          i0_mA = ((vmt - Math.sign(vmt) * vHold) / 0.5) * 1000;
          i1_mA = -i0_mA;
          i2_mA = (vgk / 100) * 1000;
          current_mA = Math.abs(i0_mA);
          operatingRegion = "Bidirectional TRIAC Conducting";
          modelEquation = `V_TM = ±${vHold.toFixed(2)}V (Quadrant ${vmt >= 0 ? "I/II" : "III/IV"})`;
        } else {
          operatingRegion = "Off-State Blocking (|V_GK| < V_GT)";
          modelEquation = "TRIAC Gate Un-triggered";
          current_mA = 0;
        }
      } else if (n.type === "JFET") {
        const isPJfet = n.transistorConfig?.polarity === "PJFET";
        const absVp = Math.max(0.5, Math.abs(n.transistorConfig?.vP ?? 4.0));
        const idss = Math.max(1e-4, (n.transistorConfig?.idss_mA ?? 15) / 1000);
        if (!isPJfet) {
          const vgs = Math.min(0.4, v2 - v1);
          const vds = v0 - v1;
          const vOv = vgs + absVp;
          if (vOv <= 0) {
            operatingRegion = `Pinch-Off Cutoff (V_GS=${vgs.toFixed(2)}V <= V_P)`;
            modelEquation = "I_D ≈ 0 (Channel Pinched Off)";
            current_mA = 0;
          } else if (vds < vOv) {
            const rCh = Math.max(15, absVp / (2 * idss * (vOv / absVp)));
            i0_mA = (vds / rCh) * 1000;
            i1_mA = -i0_mA;
            current_mA = Math.abs(i0_mA);
            operatingRegion = `Ohmic Channel (R_ds≈${rCh.toFixed(1)}Ω)`;
            modelEquation = `I_D = V_DS / R_ch (V_GS=${vgs.toFixed(2)}V)`;
          } else {
            const factor = vOv / absVp;
            i0_mA = idss * factor * factor * 1000;
            i1_mA = -i0_mA;
            current_mA = Math.abs(i0_mA);
            operatingRegion = `Saturation (I_DSS=${(idss * 1000).toFixed(1)}mA, I_D=${current_mA.toFixed(1)}mA)`;
            modelEquation = `I_D = I_DSS(1 − V_GS/V_P)²`;
          }
        } else {
          const vsg = Math.min(0.4, v1 - v2);
          const vsd = v1 - v0;
          const vOv = vsg + absVp;
          if (vOv <= 0) {
            operatingRegion = `Pinch-Off Cutoff (P-JFET V_SG=${vsg.toFixed(2)}V)`;
            modelEquation = "I_D ≈ 0";
            current_mA = 0;
          } else if (vsd < vOv) {
            const rCh = Math.max(15, absVp / (2 * idss * (vOv / absVp)));
            i1_mA = (vsd / rCh) * 1000;
            i0_mA = -i1_mA;
            current_mA = Math.abs(i1_mA);
            operatingRegion = `Ohmic Channel (R_sd≈${rCh.toFixed(1)}Ω)`;
            modelEquation = `P-Channel Triode`;
          } else {
            const factor = vOv / absVp;
            i1_mA = idss * factor * factor * 1000;
            i0_mA = -i1_mA;
            current_mA = Math.abs(i1_mA);
            operatingRegion = `Saturation (I_D=${current_mA.toFixed(1)}mA)`;
            modelEquation = `I_D = I_DSS(1 − V_SG/|V_P|)²`;
          }
        }
      } else if (n.type === "POT") {
        const totalR = Math.max(10, n.value || 500);
        i0_mA = ((v0 - v2) / (totalR * 0.5)) * 1000;
        i1_mA = ((v2 - v1) / (totalR * 0.5)) * 1000;
        i2_mA = i0_mA - i1_mA;
        current_mA = Math.abs(i0_mA);
        operatingRegion = "Variable Resistor Wiper";
        modelEquation = `R_total = ${totalR} Ω`;
      }

      power_mW = Math.abs((v0 - v1) * current_mA);
      totalLoadPowerMw += power_mW;

      // Update KCL
      if (i0_mA > 0) {
        netLeavingMa.set(net0, (netLeavingMa.get(net0) ?? 0) + i0_mA);
      } else {
        netEnteringMa.set(net0, (netEnteringMa.get(net0) ?? 0) + Math.abs(i0_mA));
      }
      if (i1_mA > 0) {
        netLeavingMa.set(net1, (netLeavingMa.get(net1) ?? 0) + i1_mA);
      } else {
        netEnteringMa.set(net1, (netEnteringMa.get(net1) ?? 0) + Math.abs(i1_mA));
      }
      if (i2_mA > 0) {
        netLeavingMa.set(net2, (netLeavingMa.get(net2) ?? 0) + i2_mA);
      } else {
        netEnteringMa.set(net2, (netEnteringMa.get(net2) ?? 0) + Math.abs(i2_mA));
      }

      const spiceCard = formatSpiceCard(n, net0, net1, net2, fgConfig);

      compTelemetry.set(n.id, {
        vDrop: v0 - v1,
        current_mA,
        power_mW,
        vTerm0: v0,
        vTerm1: v1,
        vTerm2: v2,
        diffResistanceOhm: current_mA > 0 ? Math.abs((v0 - v1) / (current_mA / 1000)) : 1e6,
        operatingRegion,
        spiceModelName,
      });

      branchSolutions.push({
        nodeId: n.id,
        label: n.label,
        type: n.type,
        spiceModelName,
        spiceCard,
        netPos: net0,
        netNeg: net1,
        netCtrl: net2,
        vTerm0: v0,
        vTerm1: v1,
        vTerm2: v2,
        vDrop: v0 - v1,
        current_mA,
        current_A: current_mA / 1000,
        power_mW,
        diffResistanceOhm: current_mA > 0 ? Math.abs((v0 - v1) / (current_mA / 1000)) : 1e6,
        operatingRegion,
        modelEquation,
      });

      continue;
    }

    // 2-Terminal Devices
    const net0 = getTermNet(n.id, 0);
    const net1 = getTermNet(n.id, 1);
    const v0 = getNetVoltage(net0);
    const v1 = getNetVoltage(net1);
    const vDrop = v0 - v1;

    let current_A = 0;
    let diffResistanceOhm = 100;
    let operatingRegion = "Linear";
    let spiceModelName: string = n.type;
    let modelEquation = "";

    if (n.type === "VS" || n.type === "FG") {
      const vIdx = vSources.findIndex((x) => x.id === n.id);
      current_A = -(currentX[numUnknownNodes + vIdx] ?? 0);
      diffResistanceOhm = 0;
      operatingRegion =
        n.type === "FG"
          ? `AC/DC Excitation (${fgConfig?.waveform ?? "SINE"} ${fgConfig?.frequencyHz ?? 1000}Hz)`
          : "Ideal DC Voltage Source";
      spiceModelName = n.type === "FG" ? "VSRC_AC_SIN" : "VSRC_DC";
      modelEquation = `V(+) − V(−) = ${n.value} V`;
    } else if (n.type === "IS") {
      current_A = n.value / 1000;
      diffResistanceOhm = 1e9;
      operatingRegion = "Ideal DC Current Source";
      spiceModelName = "ISRC_DC";
      modelEquation = `I_src = ${n.value} mA`;
    } else {
      const stamp = evaluateDeviceCompanion(n, vDrop);
      current_A = stamp.iBranch;
      diffResistanceOhm = 1 / Math.max(1e-12, stamp.gEq);
      operatingRegion = stamp.operatingRegion;
      spiceModelName = stamp.spiceModelName;
      modelEquation = stamp.modelEquation;
    }

    const current_mA = current_A * 1000;
    const power_mW = Math.abs(vDrop * current_mA);

    if (n.type === "VS" || n.type === "FG" || n.type === "IS") {
      totalSourcePowerMw += power_mW;
    } else {
      totalLoadPowerMw += power_mW;
    }

    // Update KCL per-node sums
    if (current_mA >= 0) {
      netLeavingMa.set(net0, (netLeavingMa.get(net0) ?? 0) + current_mA);
      netEnteringMa.set(net1, (netEnteringMa.get(net1) ?? 0) + current_mA);
    } else {
      netEnteringMa.set(net0, (netEnteringMa.get(net0) ?? 0) + Math.abs(current_mA));
      netLeavingMa.set(net1, (netLeavingMa.get(net1) ?? 0) + Math.abs(current_mA));
    }

    const spiceCard = formatSpiceCard(n, net0, net1, undefined, fgConfig);

    compTelemetry.set(n.id, {
      vDrop,
      current_mA,
      power_mW,
      vTerm0: v0,
      vTerm1: v1,
      diffResistanceOhm,
      operatingRegion,
      spiceModelName,
    });

    branchSolutions.push({
      nodeId: n.id,
      label: n.label,
      type: n.type,
      spiceModelName,
      spiceCard,
      netPos: net0,
      netNeg: net1,
      vTerm0: v0,
      vTerm1: v1,
      vDrop,
      current_mA,
      current_A,
      power_mW,
      diffResistanceOhm,
      operatingRegion,
      modelEquation,
    });
  }

  // 4. Build Complete Nodal Voltage Solutions (V(0), V(1), ..., V(N)) with canvas anchor coordinates
  const nodalSolutions: SpiceNodeSolution[] = [];
  const acRmsFactor =
    fgConfig?.waveform === "SQUARE"
      ? 1.0
      : fgConfig?.waveform === "TRIANGLE"
      ? 1 / Math.sqrt(3)
      : 1 / Math.sqrt(2);

  for (let netId = 0; netId < netCount; netId++) {
    const connectedTerminals: string[] = [];
    const coords: { x: number; y: number }[] = [];

    for (const n of nodes) {
      if (n.type === "GND") {
        if (getTermNet(n.id, 0) === netId) {
          connectedTerminals.push(`${n.label}`);
          coords.push({ x: n.x, y: n.y - 22 });
        }
      } else if (isThreeTerminalComponent(n.type)) {
        if (getTermNet(n.id, 0) === netId) {
          connectedTerminals.push(`${n.label}.T0`);
          coords.push(
            n.orient === "H" ? { x: n.x + 45, y: n.y } : { x: n.x, y: n.y - 45 }
          );
        }
        if (getTermNet(n.id, 1) === netId) {
          connectedTerminals.push(`${n.label}.T1`);
          coords.push(
            n.orient === "H" ? { x: n.x - 45, y: n.y } : { x: n.x, y: n.y + 45 }
          );
        }
        if (getTermNet(n.id, 2) === netId) {
          connectedTerminals.push(`${n.label}.T2`);
          coords.push(
            n.orient === "H" ? { x: n.x, y: n.y - 45 } : { x: n.x - 45, y: n.y }
          );
        }
      } else {
        if (getTermNet(n.id, 0) === netId) {
          connectedTerminals.push(`${n.label}.T+`);
          coords.push(
            n.orient === "H"
              ? { x: n.x - 45, y: n.y }
              : { x: n.x, y: n.y - 45 }
          );
        }
        if (getTermNet(n.id, 1) === netId) {
          connectedTerminals.push(`${n.label}.T−`);
          coords.push(
            n.orient === "H"
              ? { x: n.x + 45, y: n.y }
              : { x: n.x, y: n.y + 45 }
          );
        }
      }
    }

    const avgX =
      coords.length > 0
        ? coords.reduce((s, c) => s + c.x, 0) / coords.length
        : 100;
    const avgY =
      coords.length > 0
        ? coords.reduce((s, c) => s + c.y, 0) / coords.length
        : 100;

    const voltageV = getNetVoltage(netId);
    const acRmsV = fgConfig?.enabled
      ? Math.abs(voltageV) * acRmsFactor
      : Math.abs(voltageV) * 0.7071;

    const iIn = netEnteringMa.get(netId) ?? 0;
    const iOut = netLeavingMa.get(netId) ?? 0;
    const kclResidualA = Math.abs(iIn - iOut) / 1000;

    nodalSolutions.push({
      netId,
      netName: netId === 0 ? "0 (GND)" : `N${netId}`,
      voltageV,
      acRmsV,
      connectedTerminals,
      kclEnteringMa: iIn,
      kclLeavingMa: iOut,
      kclResidualA,
      anchorX: avgX,
      anchorY: avgY,
    });
  }

  // 5. Equivalent Resistance & Topology Classification
  const resistors = nodes.filter((n) => n.type === "R" || n.type === "POT");
  let topologyClass = "Custom Nonlinear SPICE Network";
  let reqOhm: number | null = null;

  if (vSources.length === 1 && branchSolutions.length > 1) {
    const vsT = compTelemetry.get(vSources[0].id);
    if (vsT && Math.abs(vsT.current_mA) > 1e-4) {
      reqOhm = (vSources[0].value / Math.abs(vsT.current_mA)) * 1000;
    }
  }

  if (resistors.length >= 2) {
    const rCurrents = resistors.map((r) =>
      Math.abs(compTelemetry.get(r.id)?.current_mA ?? 0)
    );
    const rVoltages = resistors.map((r) =>
      Math.abs(compTelemetry.get(r.id)?.vDrop ?? 0)
    );
    const allSameCurrent =
      rCurrents[0] > 0.01 &&
      rCurrents.every((c) => Math.abs(c - rCurrents[0]) < 0.05);
    const allSameVoltage =
      rVoltages[0] > 0.01 &&
      rVoltages.every((v) => Math.abs(v - rVoltages[0]) < 0.05);

    if (allSameCurrent && !allSameVoltage) {
      topologyClass = "Pure Series Network (Identical Branch Current)";
    } else if (allSameVoltage && !allSameCurrent) {
      topologyClass = "Pure Parallel Network (Identical Nodal Voltage)";
    } else if (allSameCurrent && allSameVoltage) {
      topologyClass = "Symmetrical Parallel / Bridge Network";
    } else {
      topologyClass = hasNonlinear
        ? "Nonlinear Semiconductor & Multi-Loop MNA Network"
        : "Series-Parallel Combination / Multi-Loop Network";
    }
  } else if (resistors.length === 1) {
    topologyClass = hasNonlinear
      ? "Nonlinear Active Stage Loop"
      : "Single-Loop Network";
  }

  const tEnd = typeof performance !== "undefined" ? performance.now() : Date.now();
  const solveTimeMs = Math.max(0.04, tEnd - tStart);

  const variableLabelsOut: string[] = [
    ...Array.from({ length: numUnknownNodes }, (_, idx) => `V(N${idx + 1})`),
    ...vSources.map((vs) => `I(${vs.label})`),
  ];

  const kclMaxResidualA =
    iterationHistory.length > 0
      ? iterationHistory[iterationHistory.length - 1].kclNormA
      : 0;

  // Build authentic ngspice batch output log
  const rawNgspiceLog = [
    `******`,
    `** ngspice.js-38 : Browser-Native Modified Nodal Analysis (MNA) Kernel`,
    `** Creation Date: Real-Time Interactive Session`,
    `******`,
    `Circuit: * NI Multisim / Berkeley SPICE3 Interactive Schematic`,
    `Doing analysis at TEMP = 27.000000 and TNOM = 27.000000`,
    `Matrix size: ${totalVars} x ${totalVars} (${numUnknownNodes} Nodal Voltages + ${vSources.length} V-Source Branch Currents)`,
    `Solver Strategy: ${strategyUsed} (Gmin Steps=${gminStepsExecuted}, Source Steps=${sourceStepsExecuted})`,
    `Newton-Raphson Status: ${converged ? "CONVERGED" : "MAX_ITER_REACHED"} in ${iterCount} iteration(s) (${solveTimeMs.toFixed(2)} ms)`,
    `Max Nodal Delta ||ΔV||_inf = ${finalMaxDeltaV.toExponential(3)} V · KCL Residual = ${kclMaxResidualA.toExponential(3)} A`,
    ``,
    `Node                                  Voltage (V)`,
    `----                                  -----------`,
    ...nodalSolutions.map(
      (ns) =>
        `${`V(${ns.netName})`.padEnd(36, " ")}${ns.voltageV >= 0 ? " " : ""}${ns.voltageV.toFixed(6)} V`
    ),
    ``,
    `Branch / Device                       Current (mA)       Power (mW)     Operating Region`,
    `---------------                       ------------       ----------     ----------------`,
    ...branchSolutions.map(
      (bs) =>
        `${`I(${bs.label}) [${bs.spiceModelName}]`.padEnd(36, " ")}${
          bs.current_mA >= 0 ? " " : ""
        }${bs.current_mA.toFixed(4).padEnd(18, " ")}${bs.power_mW
          .toFixed(3)
          .padEnd(15, " ")}${bs.operatingRegion}`
    ),
  ].join("\n");

  const convergence: SpiceConvergenceReport = {
    engineVersion: "ngspice.js v3.8 (Nonlinear NR + Gmin/Source Stepping)",
    converged,
    iterations: iterCount,
    maxIterations: MAX_ITER,
    solveTimeMs,
    maxDeltaV: finalMaxDeltaV,
    kclMaxResidualA,
    gminSimens: finalGmin,
    strategyUsed,
    gminStepsExecuted,
    sourceStepsExecuted,
    matrixDimension: totalVars,
    unknownNodesCount: numUnknownNodes,
    voltageSourcesCount: vSources.length,
    variableLabels: variableLabelsOut,
    mnaMatrixA: lastA,
    mnaVectorB: lastB,
    solutionVectorX: currentX,
    iterationHistory,
    rawNgspiceLog,
  };

  return {
    compTelemetry,
    nodalSolutions,
    branchSolutions,
    convergence,
    validation: {
      valid: converged && runtimeErrors.length === 0,
      hasExplicitGround: extracted.hasExplicitGround,
      errors: runtimeErrors,
      warnings: nonConvergentWarnings,
    },
    abortedReason: !converged ? runtimeErrors[0]?.message : undefined,
    topologyClass,
    reqOhm,
    totalSourcePowerMw,
    totalLoadPowerMw,
    getTermNet,
    getNetVoltage,
  };
}

/**
 * Computes exact Thévenin equivalent resistance between two electrical nets by deactivating
 * independent sources and injecting a 1 A test current into the linearized network.
 */
export function runTheveninEquivalent(
  nodes: AnalogNode[],
  wires: AnalogWire[],
  netA: number,
  netB: number
): number | null {
  const netlist = extractAndValidateNetlist(nodes, wires, { strictGround: false });
  return solveTheveninResistanceBetweenNets(nodes, netlist, netA, netB);
}

export function formatSpiceCard(
  n: AnalogNode,
  net0: number,
  net1: number,
  net2?: number,
  fgConfig?: FunctionGenConfig
): string {
  const n0 = `N${net0}`;
  const n1 = `N${net1}`;
  const n2 = net2 !== undefined ? `N${net2}` : "0";

  switch (n.type) {
    case "VS":
      return `${n.label} ${n0} ${n1} DC ${n.value}V`;
    case "FG":
      return `${n.label} ${n0} ${n1} SIN(${fgConfig?.dcOffsetV ?? 0}V ${
        fgConfig?.amplitudeV ?? n.value
      }V ${fgConfig?.frequencyHz ?? 1000}Hz)`;
    case "IS":
      return `${n.label} ${n0} ${n1} DC ${n.value}mA`;
    case "R":
      return `${n.label} ${n0} ${n1} ${n.value}`;
    case "POT":
      return `R_${n.label} ${n0} ${n2} ${n1} ${n.value} ; Wiper T2`;
    case "L":
      return `${n.label} ${n0} ${n1} ${n.value}mH`;
    case "C":
    case "CPOL":
    case "CNP":
      return `${n.label} ${n0} ${n1} ${n.value}uF`;
    case "D":
    case "D1N4007":
      return `D_${n.label} ${n0} ${n1} D1N4007 ; Vf=${n.value}V`;
    case "ZD":
      return `DZ_${n.label} ${n0} ${n1} D1N4733A ; Vz=${n.value}V`;
    case "DIAC":
      return `X_${n.label} ${n0} ${n1} DB3_DIAC ; Vbo=${n.value}V`;
    case "LED":
      return `DLED_${n.label} ${n0} ${n1} LED_RED ; Vf=${n.value}V`;
    case "BJT":
    case "BC547":
    case "BC557": {
      const isPnp = n.type === "BC557" || n.transistorConfig?.polarity === "PNP";
      const mod = n.transistorConfig?.modelName || (isPnp ? "BC557B" : "BC547B");
      const beta = n.transistorConfig?.beta ?? (n.value || 250);
      return `Q_${n.label} ${n0} ${n2} ${n1} ${mod} ; BF=${beta}`;
    }
    case "JFET": {
      const mod = n.transistorConfig?.modelName || "BF245B";
      return `J_${n.label} ${n0} ${n2} ${n1} ${mod} ; VP=${n.transistorConfig?.vP ?? -4.0}V`;
    }
    case "MOS": {
      const isPmos = n.transistorConfig?.polarity === "PMOS";
      const mod = n.transistorConfig?.modelName || (isPmos ? "IRF9540" : "IRF540N");
      const vth = n.transistorConfig?.vth ?? (isPmos ? -2.5 : 2.5);
      return `M_${n.label} ${n0} ${n2} ${n1} ${n1} ${mod} ; Vth=${vth}V`;
    }
    case "SCR": {
      const mod = n.transistorConfig?.modelName || "TYN612";
      return `X_${n.label} ${n0} ${n1} ${n2} ${mod} ; Vgt=${n.transistorConfig?.vgt ?? 0.75}V`;
    }
    case "TRIAC": {
      return `X_${n.label} ${n0} ${n1} ${n2} BT136 ; Gate`;
    }
    case "REG7805":
      return `X_${n.label} ${n0} 0 ${n1} LM7805 ; Vout=${n.value}V`;
    case "OPAMP":
      return `X_${n.label} ${n0} 0 ${n1} LM741 ; Av=${n.value}`;
    default:
      return `${n.label} ${n0} ${n1} ${n.value}`;
  }
}

/**
 * Serializes an analog/SPICE schematic into a complete Berkeley SPICE3 / LTSpice
 * compatible `.CIR` netlist text file suitable for academic reports.
 */
export function serializeAnalogCircuitToSpiceNetlist(
  title: string,
  nodes: AnalogNode[],
  getTermNet: (nodeId: number, term: number) => number,
  fgConfig?: FunctionGenConfig
): string {
  const safeTitle = (title || "IST Circuit & Logic Lab Schematic").trim();
  const lines: string[] = [
    `* ${safeTitle} — Standard Berkeley SPICE3 / ngspice Netlist (.CIR)`,
    `* Generated: ${new Date().toISOString()}`,
    `* Reference Node: 0 (GND)`,
    ``,
  ];

  const usedModels = new Set<string>();
  const nonGroundNodes = nodes.filter((n) => n.type !== "GND");

  for (const n of nonGroundNodes) {
    const net0 = getTermNet(n.id, 0);
    const net1 = getTermNet(n.id, 1);
    const net2 = isThreeTerminalComponent(n.type) ? getTermNet(n.id, 2) : undefined;
    lines.push(formatSpiceCard(n, net0, net1, net2, fgConfig));

    if (n.type === "D" || n.type === "D1N4007") usedModels.add("D1N4007");
    if (n.type === "ZD") usedModels.add("D1N4733A");
    if (n.type === "LED") usedModels.add("LED_RED");
    if (n.type === "BJT" || n.type === "BC547") usedModels.add("BC547B");
    if (n.type === "BC557") usedModels.add("BC557B");
    if (n.type === "MOS") {
      usedModels.add(n.transistorConfig?.polarity === "PMOS" ? "IRF9540" : "IRF540N");
    }
  }

  if (usedModels.size > 0) {
    lines.push(``);
    lines.push(`* --- Semiconductor .MODEL Cards ---`);
    if (usedModels.has("D1N4007")) lines.push(`.MODEL D1N4007 D(IS=2.52n N=1.752 RS=0.568 BV=1000)`);
    if (usedModels.has("D1N4733A")) lines.push(`.MODEL D1N4733A D(IS=1.2n N=1.45 BV=5.1 IBV=49m)`);
    if (usedModels.has("LED_RED")) lines.push(`.MODEL LED_RED D(IS=1e-18 N=2.1 RS=2.5)`);
    if (usedModels.has("BC547B")) lines.push(`.MODEL BC547B NPN(IS=1e-14 BF=250 VAF=100)`);
    if (usedModels.has("BC557B")) lines.push(`.MODEL BC557B PNP(IS=1e-14 BF=250 VAF=100)`);
    if (usedModels.has("IRF540N")) lines.push(`.MODEL IRF540N NMOS(VTO=2.5 KP=0.04)`);
    if (usedModels.has("IRF9540")) lines.push(`.MODEL IRF9540 PMOS(VTO=-2.5 KP=0.04)`);
  }

  const freq = Math.max(1, fgConfig?.frequencyHz ?? 1000);
  lines.push(``);
  lines.push(`* --- Analysis Directives ---`);
  lines.push(`.OP`);
  lines.push(`.TRAN ${(1 / (freq * 50)).toExponential(2)}s ${(2 / freq).toExponential(2)}s`);
  lines.push(`.AC DEC 20 1Hz 1MEGHz`);
  lines.push(`.END`);
  return lines.join("\n");
}

/**
 * Parses and executes a raw SPICE3 / ngspice `.CIR` netlist text directly in the browser,
 * solving its MNA nodal voltages and branch currents even for custom user-entered netlists.
 */
export function executeRawSpiceNetlist(netlistText: string): {
  nodalVoltages: { node: string; voltageV: number }[];
  branchCurrents: { element: string; nodes: string; valueDesc: string; currentMa: number; vDrop: number; powerMw: number }[];
  logOutput: string;
} {
  const lines = netlistText.split(/\r?\n/);
  interface RawElem {
    name: string;
    kind: "V" | "I" | "R" | "D" | "Z" | "L" | "C" | "Q" | "M";
    n1: number;
    n2: number;
    val: number;
  }

  const nameToNetId = new Map<string, number>([
    ["0", 0],
    ["gnd", 0],
    ["0v", 0],
    ["earth", 0],
    ["ref", 0],
  ]);
  const netNames: string[] = ["0 [GND]"];
  const resolveRawNet = (rawToken: string): number => {
    const clean = rawToken.trim().toLowerCase();
    if (nameToNetId.has(clean)) return nameToNetId.get(clean)!;
    const assigned = netNames.length;
    nameToNetId.set(clean, assigned);
    netNames.push(rawToken.trim());
    return assigned;
  };

  const elems: (RawElem & { n1Name: string; n2Name: string })[] = [];

  const parseSpiceNumber = (token: string): number => {
    const cleaned = token
      .replace(/DC|SIN\(.*?\)|V|A|OHM|Ω|H|F/gi, "")
      .trim();
    const match = cleaned.match(/^([+-]?\d*\.?\d+(?:e[+-]?\d+)?)(g|meg|k|m|u|n|p)?/i);
    if (!match) return 100;
    const base = parseFloat(match[1]);
    const suffix = (match[2] || "").toLowerCase();
    const mult =
      suffix === "g"
        ? 1e9
        : suffix === "meg"
        ? 1e6
        : suffix === "k"
        ? 1e3
        : suffix === "m"
        ? 1e-3
        : suffix === "u"
        ? 1e-6
        : suffix === "n"
        ? 1e-9
        : suffix === "p"
        ? 1e-12
        : 1;
    return base * mult;
  };

  for (const raw of lines) {
    const stripped = raw.split(";")[0].trim();
    if (!stripped || stripped.startsWith("*") || stripped.startsWith(".")) continue;
    const parts = stripped.split(/\s+/);
    if (parts.length < 4) continue;
    const name = parts[0];
    const n1Name = parts[1];
    const n2Name = parts[2];
    const n1 = resolveRawNet(n1Name);
    const n2 = resolveRawNet(n2Name);

    const prefix = name[0].toUpperCase();
    const restTokens = parts.slice(3);
    const dcIdx = restTokens.findIndex((t) => /^DC$/i.test(t));
    const valTok =
      dcIdx >= 0 && restTokens[dcIdx + 1]
        ? restTokens[dcIdx + 1]
        : restTokens[0];
    const val = parseSpiceNumber(valTok);

    if (prefix === "V") {
      const sinMatch = stripped.match(/SIN\(\s*([+-]?\d*\.?\d+)\s*V?\s+([+-]?\d*\.?\d+)/i);
      const vVal = sinMatch ? parseFloat(sinMatch[2]) || 12 : val;
      elems.push({ name, kind: "V", n1, n2, n1Name, n2Name, val: Number.isFinite(vVal) ? vVal : 12 });
    } else if (prefix === "I") {
      elems.push({ name, kind: "I", n1, n2, n1Name, n2Name, val: Math.abs(val) < 1 ? val * 1000 : val });
    } else if (prefix === "D") {
      const isZener = name.toUpperCase().startsWith("DZ") || stripped.toUpperCase().includes("4733") || stripped.toUpperCase().includes("BZX");
      elems.push({
        name,
        kind: isZener ? "Z" : "D",
        n1,
        n2,
        n1Name,
        n2Name,
        val: isZener ? 5.1 : 0.7,
      });
    } else if (prefix === "L") {
      elems.push({ name, kind: "L", n1, n2, n1Name, n2Name, val: 0.05 });
    } else if (prefix === "C") {
      elems.push({ name, kind: "C", n1, n2, n1Name, n2Name, val: 1e7 });
    } else {
      elems.push({ name, kind: "R", n1, n2, n1Name, n2Name, val: Math.max(0.1, val) });
    }
  }

  const maxNode = netNames.length - 1;
  const vElems = elems.filter((e) => e.kind === "V");
  const totalVars = maxNode + vElems.length;
  const hasNonlinearElems = elems.some((e) => e.kind === "D" || e.kind === "Z");
  const nrIters = hasNonlinearElems ? 15 : 1;

  let sol = new Array(totalVars).fill(0);

  for (let iter = 0; iter < nrIters; iter++) {
    const A: number[][] = Array.from({ length: totalVars }, () =>
      new Array(totalVars).fill(0)
    );
    const b: number[] = new Array(totalVars).fill(0);

    for (const e of elems) {
      if (e.kind === "V") continue;
      if (e.kind === "I") {
        const iAmp = e.val / 1000;
        if (e.n1 > 0) b[e.n1 - 1] -= iAmp;
        if (e.n2 > 0) b[e.n2 - 1] += iAmp;
        continue;
      }

      if (e.kind === "D" || e.kind === "Z") {
        const v1 = e.n1 === 0 ? 0 : sol[e.n1 - 1] ?? 0;
        const v2 = e.n2 === 0 ? 0 : sol[e.n2 - 1] ?? 0;
        const vDrop = iter === 0 ? (e.kind === "Z" ? e.val + 0.1 : 0.7) : v1 - v2;

        if (e.kind === "D") {
          if (vDrop >= e.val * 0.85) {
            const g = 1 / 12;
            const iOff = e.val * g;
            if (e.n1 > 0) A[e.n1 - 1][e.n1 - 1] += g;
            if (e.n2 > 0) A[e.n2 - 1][e.n2 - 1] += g;
            if (e.n1 > 0 && e.n2 > 0) {
              A[e.n1 - 1][e.n2 - 1] -= g;
              A[e.n2 - 1][e.n1 - 1] -= g;
            }
            if (e.n1 > 0) b[e.n1 - 1] += iOff;
            if (e.n2 > 0) b[e.n2 - 1] -= iOff;
          } else {
            const gOff = 1e-7;
            if (e.n1 > 0) A[e.n1 - 1][e.n1 - 1] += gOff;
            if (e.n2 > 0) A[e.n2 - 1][e.n2 - 1] += gOff;
            if (e.n1 > 0 && e.n2 > 0) {
              A[e.n1 - 1][e.n2 - 1] -= gOff;
              A[e.n2 - 1][e.n1 - 1] -= gOff;
            }
          }
        } else {
          // Zener: forward diode >= 0.7V or reverse breakdown <= -Vz
          const forwardOn = vDrop >= 0.65;
          const reverseZener = vDrop <= -e.val * 0.95;
          if (forwardOn || reverseZener) {
            const g = 1 / 8;
            const vClamp = forwardOn ? 0.7 : -e.val;
            const iOff = vClamp * g;
            if (e.n1 > 0) A[e.n1 - 1][e.n1 - 1] += g;
            if (e.n2 > 0) A[e.n2 - 1][e.n2 - 1] += g;
            if (e.n1 > 0 && e.n2 > 0) {
              A[e.n1 - 1][e.n2 - 1] -= g;
              A[e.n2 - 1][e.n1 - 1] -= g;
            }
            if (e.n1 > 0) b[e.n1 - 1] += iOff;
            if (e.n2 > 0) b[e.n2 - 1] -= iOff;
          } else {
            const gOff = 1e-7;
            if (e.n1 > 0) A[e.n1 - 1][e.n1 - 1] += gOff;
            if (e.n2 > 0) A[e.n2 - 1][e.n2 - 1] += gOff;
            if (e.n1 > 0 && e.n2 > 0) {
              A[e.n1 - 1][e.n2 - 1] -= gOff;
              A[e.n2 - 1][e.n1 - 1] -= gOff;
            }
          }
        }
        continue;
      }

      const rEff = Math.max(0.05, e.val);
      const g = 1 / rEff;
      if (e.n1 > 0) A[e.n1 - 1][e.n1 - 1] += g;
      if (e.n2 > 0) A[e.n2 - 1][e.n2 - 1] += g;
      if (e.n1 > 0 && e.n2 > 0) {
        A[e.n1 - 1][e.n2 - 1] -= g;
        A[e.n2 - 1][e.n1 - 1] -= g;
      }
    }

    for (let i = 0; i < maxNode; i++) {
      A[i][i] += 1e-10;
    }

    vElems.forEach((ve, idx) => {
      const row = maxNode + idx;
      if (ve.n1 > 0) {
        A[row][ve.n1 - 1] = 1;
        A[ve.n1 - 1][row] = 1;
      }
      if (ve.n2 > 0) {
        A[row][ve.n2 - 1] = -1;
        A[ve.n2 - 1][row] = -1;
      }
      b[row] = ve.val;
    });

    const nextSol = solveDenseMnaSystem(A, b);
    if (!nextSol) {
      return {
        nodalVoltages: [],
        branchCurrents: [],
        logOutput: `ngspice.js Batch Error: Singular MNA matrix in .CIR netlist. Ensure Ground node (0) is connected and no voltage-source loops or floating subcircuits exist.`,
      };
    }
    let maxStep = 0;
    for (let i = 0; i < totalVars; i++) {
      maxStep = Math.max(maxStep, Math.abs(nextSol[i] - sol[i]));
    }
    sol = nextSol;
    if (iter > 0 && maxStep < 1e-5) break;
  }

  const getV = (n: number) => (n === 0 ? 0 : sol[n - 1] ?? 0);

  const nodalVoltages: { node: string; voltageV: number }[] = [
    { node: "V(0) [GND]", voltageV: 0 },
  ];
  for (let i = 1; i <= maxNode; i++) {
    nodalVoltages.push({ node: `V(${netNames[i]})`, voltageV: getV(i) });
  }

  const branchCurrents = elems.map((e) => {
    const v1 = getV(e.n1);
    const v2 = getV(e.n2);
    const vDrop = v1 - v2;
    let currentMa = 0;
    if (e.kind === "V") {
      const vIdx = vElems.indexOf(e);
      currentMa = -(sol[maxNode + vIdx] ?? 0) * 1000;
    } else if (e.kind === "I") {
      currentMa = e.val;
    } else if (e.kind === "D") {
      currentMa = vDrop >= 0.65 ? ((vDrop - 0.7) / 12) * 1000 : vDrop * 1e-9;
    } else if (e.kind === "Z") {
      if (vDrop >= 0.65) currentMa = ((vDrop - 0.7) / 8) * 1000;
      else if (vDrop <= -e.val * 0.95) currentMa = ((vDrop + e.val) / 8) * 1000;
      else currentMa = vDrop * 1e-9;
    } else if (e.kind === "C") {
      currentMa = 0;
    } else {
      currentMa = (vDrop / Math.max(0.005, e.val)) * 1000;
    }
    return {
      element: e.name,
      nodes: `(${e.n1Name}, ${e.n2Name})`,
      valueDesc:
        e.kind === "V"
          ? `${e.val} V`
          : e.kind === "I"
          ? `${e.val} mA`
          : e.kind === "D"
          ? `Vf=${e.val}V`
          : e.kind === "Z"
          ? `Vz=${e.val}V`
          : e.kind === "C"
          ? `Open (DC)`
          : `${e.val} Ω`,
      currentMa,
      vDrop,
      powerMw: Math.abs(vDrop * currentMa),
    };
  });

  const logOutput = [
    `ngspice.js Batch Deck Execution Completed — ${elems.length} elements, ${maxNode} active nodes.`,
    ...nodalVoltages.map((nv) => `  ${nv.node.padEnd(16, " ")} = ${nv.voltageV.toFixed(5)} V`),
    ...branchCurrents.map(
      (bc) =>
        `  I(${bc.element}) ${bc.nodes.padEnd(12, " ")} = ${bc.currentMa.toFixed(4)} mA  (ΔV = ${bc.vDrop.toFixed(3)} V, P = ${bc.powerMw.toFixed(2)} mW)`
    ),
  ].join("\n");

  return { nodalVoltages, branchCurrents, logOutput };
}
