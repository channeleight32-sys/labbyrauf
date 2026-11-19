import type { AnalogNode, AnalogWire, AnalogCompType } from "../components/SeriesParallelBuilder";
import type { FunctionGenConfig } from "../components/MultisimInstrumentsPanel";
import { isThreeTerminalComponent } from "../components/TransistorConfigModal";

/* ============================================================================
 * Core Numerical Types & Diagnostics
 * ============================================================================ */

export interface ComplexNumber {
  re: number;
  im: number;
}

export interface NetlistDiagnostic {
  code:
    | "EMPTY_CIRCUIT"
    | "MISSING_GROUND"
    | "INVALID_VALUE"
    | "INVALID_SIM_PARAMS"
    | "VOLTAGE_SOURCE_SHORT"
    | "VOLTAGE_SOURCE_LOOP"
    | "FLOATING_NODE"
    | "NO_GROUND_PATH"
    | "OPEN_TERMINAL"
    | "SINGULAR_MATRIX"
    | "NON_CONVERGENT";
  severity: "ERROR" | "WARNING";
  message: string;
  nodeIds?: number[];
  netId?: number;
}

export interface ExtractedNetlist {
  valid: boolean;
  hasExplicitGround: boolean;
  groundRefSource: "EXPLICIT_GND" | "AUTO_VS_FALLBACK" | "NONE";
  errors: NetlistDiagnostic[];
  warnings: NetlistDiagnostic[];
  netCount: number;
  numUnknownNodes: number;
  getTermNet: (nodeId: number, term: number) => number;
  netTerminals: Map<number, string[]>;
  netAnchors: Map<number, { x: number; y: number }>;
  disconnectedNodeIds: number[];
  floatingNetIds: Set<number>;
}

export interface RealLinearSolveResult {
  ok: boolean;
  x: number[];
  error?: string;
}

export interface ComplexLinearSolveResult {
  ok: boolean;
  x: ComplexNumber[];
  error?: string;
}

/* ============================================================================
 * 1. Exact Real & Complex Dense Linear Solvers (Gaussian Elimination w/ Partial Pivoting)
 * ============================================================================ */

export function solveRealLinearSystem(
  A: number[][],
  b: number[]
): RealLinearSolveResult {
  const n = b.length;
  if (n === 0) return { ok: true, x: [] };
  if (A.length !== n) {
    return { ok: false, x: [], error: `Matrix row count ${A.length} != RHS length ${n}` };
  }

  for (let i = 0; i < n; i++) {
    if (!Number.isFinite(b[i]) || A[i].length !== n) {
      return { ok: false, x: [], error: `Invalid matrix dimension or non-finite RHS at row ${i}` };
    }
    for (let j = 0; j < n; j++) {
      if (!Number.isFinite(A[i][j])) {
        return { ok: false, x: [], error: `Non-finite matrix entry at (${i}, ${j})` };
      }
    }
  }

  // Compute row infinity norms for relative singularity detection
  const rowScale = new Array<number>(n).fill(0);
  const M = A.map((row, i) => {
    let maxAbs = 0;
    for (let j = 0; j < n; j++) {
      const av = Math.abs(row[j]);
      if (av > maxAbs) maxAbs = av;
    }
    rowScale[i] = maxAbs;
    if (maxAbs === 0) {
      return [...row, b[i]];
    }
    return [...row, b[i]];
  });

  for (let i = 0; i < n; i++) {
    if (rowScale[i] === 0) {
      return {
        ok: false,
        x: [],
        error: `Singular MNA matrix: all-zero row ${i} (floating or unconstrained node/branch).`,
      };
    }
  }

  for (let col = 0; col < n; col++) {
    let maxRow = col;
    let maxScore = 0;
    for (let r = col; r < n; r++) {
      const score = Math.abs(M[r][col]) / Math.max(1e-18, rowScale[r]);
      if (score > maxScore) {
        maxScore = score;
        maxRow = r;
      }
    }

    const pivotAbs = Math.abs(M[maxRow][col]);
    if (pivotAbs < 1e-14 * Math.max(1e-6, rowScale[maxRow])) {
      return {
        ok: false,
        x: [],
        error: `Singular MNA matrix at pivot column ${col} (|pivot|=${pivotAbs.toExponential(2)}). Check for floating subcircuits or voltage-source loops.`,
      };
    }

    if (maxRow !== col) {
      [M[col], M[maxRow]] = [M[maxRow], M[col]];
      const tmpScale = rowScale[col];
      rowScale[col] = rowScale[maxRow];
      rowScale[maxRow] = tmpScale;
    }

    const pivot = M[col][col];
    for (let r = col + 1; r < n; r++) {
      const factor = M[r][col] / pivot;
      if (factor === 0) continue;
      M[r][col] = 0;
      for (let c = col + 1; c <= n; c++) {
        M[r][c] -= factor * M[col][c];
      }
    }
  }

  const x = new Array<number>(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let sum = M[i][n];
    for (let j = i + 1; j < n; j++) {
      sum -= M[i][j] * x[j];
    }
    const diag = M[i][i];
    if (Math.abs(diag) < 1e-16) {
      return {
        ok: false,
        x: [],
        error: `Zero diagonal during back-substitution at row ${i}.`,
      };
    }
    const val = sum / diag;
    if (!Number.isFinite(val)) {
      return {
        ok: false,
        x: [],
        error: `Numerical overflow (non-finite solution) at variable ${i}.`,
      };
    }
    x[i] = val;
  }

  return { ok: true, x };
}

export function cAdd(a: ComplexNumber, b: ComplexNumber): ComplexNumber {
  return { re: a.re + b.re, im: a.im + b.im };
}
export function cSub(a: ComplexNumber, b: ComplexNumber): ComplexNumber {
  return { re: a.re - b.re, im: a.im - b.im };
}
export function cMul(a: ComplexNumber, b: ComplexNumber): ComplexNumber {
  return { re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re };
}
export function cDiv(a: ComplexNumber, b: ComplexNumber): ComplexNumber {
  const denom = b.re * b.re + b.im * b.im;
  if (denom === 0) return { re: NaN, im: NaN };
  return {
    re: (a.re * b.re + a.im * b.im) / denom,
    im: (a.im * b.re - a.re * b.im) / denom,
  };
}
export function cMag(a: ComplexNumber): number {
  return Math.hypot(a.re, a.im);
}

export function solveComplexLinearSystem(
  A: ComplexNumber[][],
  b: ComplexNumber[]
): ComplexLinearSolveResult {
  const n = b.length;
  if (n === 0) return { ok: true, x: [] };
  if (A.length !== n) {
    return { ok: false, x: [], error: `Complex matrix dimension mismatch: ${A.length} != ${n}` };
  }

  const rowScale = new Array<number>(n).fill(0);
  const M: ComplexNumber[][] = A.map((row, i) => {
    let maxMag = 0;
    for (let j = 0; j < n; j++) {
      const m = cMag(row[j]);
      if (m > maxMag) maxMag = m;
    }
    rowScale[i] = maxMag;
    return [
      ...row.map((cell) => ({ re: cell.re, im: cell.im })),
      { re: b[i].re, im: b[i].im },
    ];
  });

  for (let i = 0; i < n; i++) {
    if (rowScale[i] === 0 || !Number.isFinite(rowScale[i])) {
      return {
        ok: false,
        x: [],
        error: `Singular complex AC MNA matrix at row ${i}.`,
      };
    }
  }

  for (let col = 0; col < n; col++) {
    let maxRow = col;
    let maxScore = 0;
    for (let r = col; r < n; r++) {
      const score = cMag(M[r][col]) / Math.max(1e-18, rowScale[r]);
      if (score > maxScore) {
        maxScore = score;
        maxRow = r;
      }
    }

    const pivotMag = cMag(M[maxRow][col]);
    if (pivotMag < 1e-14 * Math.max(1e-6, rowScale[maxRow])) {
      return {
        ok: false,
        x: [],
        error: `Singular complex AC MNA matrix at column ${col} (|pivot|=${pivotMag.toExponential(2)}).`,
      };
    }

    if (maxRow !== col) {
      [M[col], M[maxRow]] = [M[maxRow], M[col]];
      const tmp = rowScale[col];
      rowScale[col] = rowScale[maxRow];
      rowScale[maxRow] = tmp;
    }

    const pivot = M[col][col];
    for (let r = col + 1; r < n; r++) {
      if (M[r][col].re === 0 && M[r][col].im === 0) continue;
      const factor = cDiv(M[r][col], pivot);
      M[r][col] = { re: 0, im: 0 };
      for (let c = col + 1; c <= n; c++) {
        M[r][c] = cSub(M[r][c], cMul(factor, M[col][c]));
      }
    }
  }

  const x: ComplexNumber[] = Array.from({ length: n }, () => ({ re: 0, im: 0 }));
  for (let i = n - 1; i >= 0; i--) {
    let sum = { re: M[i][n].re, im: M[i][n].im };
    for (let j = i + 1; j < n; j++) {
      sum = cSub(sum, cMul(M[i][j], x[j]));
    }
    const val = cDiv(sum, M[i][i]);
    if (!Number.isFinite(val.re) || !Number.isFinite(val.im)) {
      return { ok: false, x: [], error: `Non-finite complex solution at variable ${i}.` };
    }
    x[i] = val;
  }

  return { ok: true, x };
}

/* ============================================================================
 * 2. Unit Helpers & Component Terminal Definitions
 * ============================================================================ */

/**
 * In SeriesParallelBuilder / AnalogNode conventions:
 * - C, CPOL, CNP store capacitance in microfarads (uF)
 * - L stores inductance in millihenries (mH)
 * - IS stores current in milliamps (mA)
 * - R, POT store resistance in Ohms (Ω)
 * - VS, FG, ZD, LED store Volts (V)
 */
export function getCapacitorFarads(n: AnalogNode): number {
  return n.value * 1e-6;
}

export function getInductorHenries(n: AnalogNode): number {
  return n.value * 1e-3;
}

export function isVoltageSourceType(t: AnalogCompType): boolean {
  return t === "VS" || t === "FG";
}

export function isCapacitorType(t: AnalogCompType): boolean {
  return t === "C" || t === "CPOL" || t === "CNP";
}

export function isDiodeLikeType(t: AnalogCompType): boolean {
  return t === "D" || t === "D1N4007" || t === "LED" || t === "ZD" || t === "DIAC";
}

export function getComponentTerminalCount(n: AnalogNode): number {
  if (n.type === "GND") return 1;
  if (isThreeTerminalComponent(n.type)) return 3;
  return 2;
}

/* ============================================================================
 * 3. Netlist Extraction & Circuit Structural / Electrical Validation
 * ============================================================================ */

export function extractAndValidateNetlist(
  nodes: AnalogNode[],
  wires: AnalogWire[],
  options?: { strictGround?: boolean }
): ExtractedNetlist {
  const strictGround = options?.strictGround ?? true;
  const errors: NetlistDiagnostic[] = [];
  const warnings: NetlistDiagnostic[] = [];

  if (nodes.length === 0) {
    errors.push({
      code: "EMPTY_CIRCUIT",
      severity: "ERROR",
      message: "Circuit contains no components.",
    });
    return {
      valid: false,
      hasExplicitGround: false,
      groundRefSource: "NONE",
      errors,
      warnings,
      netCount: 1,
      numUnknownNodes: 0,
      getTermNet: () => 0,
      netTerminals: new Map(),
      netAnchors: new Map(),
      disconnectedNodeIds: [],
      floatingNetIds: new Set(),
    };
  }

  // Validate numeric component values
  for (const n of nodes) {
    if (n.type === "GND" || n.type === "VM" || n.type === "AM") continue;
    if (!Number.isFinite(n.value)) {
      errors.push({
        code: "INVALID_VALUE",
        severity: "ERROR",
        message: `${n.label} (${n.type}) has non-finite value (${n.value}).`,
        nodeIds: [n.id],
      });
      continue;
    }
    if ((n.type === "R" || n.type === "POT" || isCapacitorType(n.type) || n.type === "L") && n.value <= 0) {
      errors.push({
        code: "INVALID_VALUE",
        severity: "ERROR",
        message: `${n.label} (${n.type}) must have a strictly positive value (got ${n.value}).`,
        nodeIds: [n.id],
      });
    }
  }

  // Disjoint-set Union-Find across all component pins and wires
  const parent = new Map<string, string>();
  const find = (k: string): string => {
    if (!parent.has(k)) parent.set(k, k);
    if (parent.get(k) !== k) {
      parent.set(k, find(parent.get(k)!));
    }
    return parent.get(k)!;
  };
  const union = (a: string, b: string) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  };

  const nodeMap = new Map<number, AnalogNode>();
  for (const n of nodes) {
    nodeMap.set(n.id, n);
    const tCount = getComponentTerminalCount(n);
    for (let t = 0; t < tCount; t++) {
      find(`${n.id}:${t}`);
    }
  }

  // Track wire incidence count per terminal for dangling pin checks
  const wirePinCount = new Map<string, number>();
  for (const w of wires) {
    const kFrom = `${w.from.node}:${w.from.term}`;
    const kTo = `${w.to.node}:${w.to.term}`;
    if (!nodeMap.has(w.from.node) || !nodeMap.has(w.to.node)) continue;
    union(kFrom, kTo);
    wirePinCount.set(kFrom, (wirePinCount.get(kFrom) ?? 0) + 1);
    wirePinCount.set(kTo, (wirePinCount.get(kTo) ?? 0) + 1);
  }

  // Ground detection: NO silent ground fallback when strictGround is requested unless missing ground is recorded as error
  const gndNodes = nodes.filter((n) => n.type === "GND");
  const vsNodes = nodes.filter((n) => isVoltageSourceType(n.type));
  const hasExplicitGround = gndNodes.length > 0;
  const gndRoots = new Set<string>();
  let groundRefSource: "EXPLICIT_GND" | "AUTO_VS_FALLBACK" | "NONE" = "NONE";

  if (hasExplicitGround) {
    gndNodes.forEach((g) => gndRoots.add(find(`${g.id}:0`)));
    groundRefSource = "EXPLICIT_GND";
  } else {
    if (strictGround) {
      errors.push({
        code: "MISSING_GROUND",
        severity: "ERROR",
        message: "No Ground (GND) reference node found. Add a GND component and connect it to the circuit reference rail.",
      });
    } else if (vsNodes.length > 0) {
      gndRoots.add(find(`${vsNodes[0].id}:1`));
      groundRefSource = "AUTO_VS_FALLBACK";
      warnings.push({
        code: "MISSING_GROUND",
        severity: "WARNING",
        message: "No explicit GND symbol placed; temporarily using source negative terminal as reference.",
      });
    }
  }

  const rootToNet = new Map<string, number>();
  let netCount = 1;
  for (const k of parent.keys()) {
    const r = find(k);
    if (gndRoots.has(r)) {
      rootToNet.set(r, 0);
    } else if (!rootToNet.has(r)) {
      rootToNet.set(r, netCount++);
    }
  }

  const getTermNet = (nodeId: number, term: number): number => {
    const key = `${nodeId}:${term}`;
    if (!parent.has(key)) return 0;
    return rootToNet.get(find(key)) ?? 0;
  };

  const netTerminals = new Map<number, string[]>();
  const netAnchors = new Map<number, { x: number; y: number }>();

  for (const n of nodes) {
    const tCount = getComponentTerminalCount(n);
    for (let t = 0; t < tCount; t++) {
      const netId = getTermNet(n.id, t);
      if (!netTerminals.has(netId)) netTerminals.set(netId, []);
      netTerminals.get(netId)!.push(`${n.label}.T${t}`);
      if (!netAnchors.has(netId)) {
        netAnchors.set(netId, { x: n.x, y: n.y });
      }
    }
  }

  // Detect disconnected terminals & floating components
  const disconnectedNodeIds: number[] = [];
  for (const n of nodes) {
    const tCount = getComponentTerminalCount(n);
    let openCount = 0;
    for (let t = 0; t < tCount; t++) {
      if ((wirePinCount.get(`${n.id}:${t}`) ?? 0) === 0) {
        openCount++;
      }
    }
    if (openCount === tCount && nodes.length > 1) {
      disconnectedNodeIds.push(n.id);
      warnings.push({
        code: "FLOATING_NODE",
        severity: "WARNING",
        message: `${n.label} (${n.type}) has no wire connections and is electrically isolated.`,
        nodeIds: [n.id],
      });
    } else if (openCount > 0 && n.type !== "GND" && n.type !== "HB") {
      warnings.push({
        code: "OPEN_TERMINAL",
        severity: "WARNING",
        message: `${n.label} (${n.type}) has ${openCount} unconnected terminal(s) (open circuit).`,
        nodeIds: [n.id],
      });
    }
  }

  // Detect short-circuited voltage sources & conflicting voltage-source loops
  const vsNetPairs = new Map<string, { label: string; v: number; id: number }>();
  for (const vs of vsNodes) {
    const nPos = getTermNet(vs.id, 0);
    const nNeg = getTermNet(vs.id, 1);
    if (nPos === nNeg) {
      errors.push({
        code: "VOLTAGE_SOURCE_SHORT",
        severity: "ERROR",
        message: `Voltage source ${vs.label} has both terminals shorted to the same electrical net (N${nPos}).`,
        nodeIds: [vs.id],
      });
      continue;
    }
    const pairKey = nPos < nNeg ? `${nPos}:${nNeg}` : `${nNeg}:${nPos}`;
    const signedV = nPos < nNeg ? vs.value : -vs.value;
    const prev = vsNetPairs.get(pairKey);
    if (prev) {
      errors.push({
        code: "VOLTAGE_SOURCE_LOOP",
        severity: "ERROR",
        message: `Parallel voltage-source loop between ${prev.label} (${prev.v}V) and ${vs.label} (${signedV}V) across the same nets.`,
        nodeIds: [prev.id, vs.id],
      });
    } else {
      vsNetPairs.set(pairKey, { label: vs.label, v: signedV, id: vs.id });
    }
  }

  // Build component-level connectivity graph (through non-capacitor DC-conductive paths + capacitors) to find islands with no ground path
  const netAdj = new Map<number, Set<number>>();
  for (let i = 0; i < netCount; i++) netAdj.set(i, new Set());
  for (const n of nodes) {
    if (n.type === "GND") continue;
    if (n.type === "SW" && n.value < 1) continue; // Open switch does not provide DC return path
    const tCount = getComponentTerminalCount(n);
    const n0 = getTermNet(n.id, 0);
    const n1 = getTermNet(n.id, 1);
    if (tCount >= 2 && !isCapacitorType(n.type)) {
      netAdj.get(n0)?.add(n1);
      netAdj.get(n1)?.add(n0);
    }
    if (tCount === 3) {
      const n2 = getTermNet(n.id, 2);
      netAdj.get(n0)?.add(n2);
      netAdj.get(n2)?.add(n0);
      netAdj.get(n1)?.add(n2);
      netAdj.get(n2)?.add(n1);
    }
  }

  const reachableFromGnd = new Set<number>([0]);
  if (hasExplicitGround || groundRefSource !== "NONE") {
    const queue = [0];
    while (queue.length > 0) {
      const cur = queue.shift()!;
      for (const nxt of netAdj.get(cur) ?? []) {
        if (!reachableFromGnd.has(nxt)) {
          reachableFromGnd.add(nxt);
          queue.push(nxt);
        }
      }
    }
  }

  const floatingNetIds = new Set<number>();
  for (let i = 1; i < netCount; i++) {
    if (!reachableFromGnd.has(i)) {
      floatingNetIds.add(i);
      const terms = netTerminals.get(i) ?? [];
      if (terms.length > 1) {
        warnings.push({
          code: "NO_GROUND_PATH",
          severity: "WARNING",
          message: `Net N${i} (${terms.join(", ")}) has no DC path to Ground (floating or isolated behind capacitor/open switch).`,
          netId: i,
        });
      }
    }
  }

  return {
    valid: errors.length === 0,
    hasExplicitGround,
    groundRefSource,
    errors,
    warnings,
    netCount,
    numUnknownNodes: netCount - 1,
    getTermNet,
    netTerminals,
    netAnchors,
    disconnectedNodeIds,
    floatingNetIds,
  };
}

/* ============================================================================
 * 4. Semiconductor Physics Models & SPICE pnjlim Thermal Voltage Limiter
 * ============================================================================ */

const VT = 0.025851; // Thermal voltage kT/q at 300 K

/**
 * Standard SPICE3 pnjlim voltage step limiter to prevent exponential overflow
 * during Newton-Raphson iterations across forward-biased PN junctions.
 */
export function pnjlim(vNew: number, vOld: number, nVt: number, vCrit: number): number {
  if (vNew > vCrit && Math.abs(vNew - vOld) > 2 * nVt) {
    if (vOld > 0) {
      const arg = 1 + (vNew - vOld) / nVt;
      if (arg > 0) {
        return vOld + nVt * Math.log(arg);
      }
      return vCrit;
    }
    return nVt * Math.log(Math.max(1e-12, vNew / nVt));
  }
  return vNew;
}

export interface CompanionStamp {
  gEq: number;
  iEq: number; // Norton current: iBranch = gEq * vDrop + iEq  (NOTE sign: stamp A += gEq, b -= iEq on pos node)
  iBranch: number;
  operatingRegion: string;
  spiceModelName: string;
  modelEquation: string;
}

function getDiodeParams(n: AnalogNode): {
  isAmp: number;
  nFactor: number;
  rSeries: number;
  vCrit: number;
  vZener?: number;
  modelName: string;
} {
  if (n.type === "LED") {
    const vfNom = Math.max(1.2, Math.min(4.2, n.value || 2.0));
    const nFactor = 2.0;
    const iRef = 0.015;
    const isAmp = Math.max(1e-22, iRef / Math.exp(Math.min(35, (vfNom - 0.1) / (nFactor * VT))));
    const nVt = nFactor * VT;
    const vCrit = nVt * Math.log(nVt / (Math.SQRT2 * isAmp));
    return {
      isAmp,
      nFactor,
      rSeries: 4.5,
      vCrit,
      modelName: `LED_${vfNom.toFixed(1)}V`,
    };
  }

  if (n.type === "ZD") {
    const vz = Math.max(1.5, n.value || 5.1);
    const isAmp = 5e-9;
    const nFactor = 1.65;
    const nVt = nFactor * VT;
    const vCrit = nVt * Math.log(nVt / (Math.SQRT2 * isAmp));
    return {
      isAmp,
      nFactor,
      rSeries: 2.0,
      vCrit,
      vZener: vz,
      modelName: `1N47xx_${vz.toFixed(1)}V`,
    };
  }

  // Standard 1N4007 silicon rectifier diode
  const isAmp = 7.02e-9;
  const nFactor = 1.75;
  const nVt = nFactor * VT;
  const vCrit = nVt * Math.log(nVt / (Math.SQRT2 * isAmp));
  return {
    isAmp,
    nFactor,
    rSeries: 0.45,
    vCrit,
    modelName: "1N4007_SPICE",
  };
}

export function evaluateTwoTermDeviceCompanion(
  n: AnalogNode,
  vDrop: number,
  options?: { capConductance?: number; capHistCurrent?: number; indConductance?: number; indHistCurrent?: number; forAcOrDc?: "DC" | "TRAN" }
): CompanionStamp {
  const GMIN = 1e-12;
  const mode = options?.forAcOrDc ?? "DC";

  switch (n.type) {
    case "R":
    case "POT":
    case "HB": {
      const rOhm = Math.max(1e-4, n.value);
      const gEq = 1 / rOhm;
      return {
        gEq,
        iEq: 0,
        iBranch: vDrop * gEq,
        operatingRegion: "Ohmic Linear",
        spiceModelName: n.type === "HB" ? "SUBCKT_BLOCK" : "RES_IDEAL",
        modelEquation: `I = ΔV / ${rOhm} Ω`,
      };
    }

    case "L": {
      if (mode === "TRAN" && options?.indConductance !== undefined) {
        const gEq = options.indConductance;
        const iHist = options.indHistCurrent ?? 0;
        // Companion: i_L(t) = gEq * v_L(t) + iHist
        return {
          gEq,
          iEq: iHist,
          iBranch: gEq * vDrop + iHist,
          operatingRegion: "Transient Companion (L·dI/dt)",
          spiceModelName: `IND_${n.value}mH`,
          modelEquation: `v_L = L·dI/dt`,
        };
      }
      // DC operating point: winding DCR (5 mΩ)
      const rDcr = 0.005;
      const gEq = 1 / rDcr;
      return {
        gEq,
        iEq: 0,
        iBranch: vDrop * gEq,
        operatingRegion: "DC Steady-State (Short / DCR=5mΩ)",
        spiceModelName: `IND_${n.value}mH`,
        modelEquation: `DC Short (R_s = 5 mΩ)`,
      };
    }

    case "C":
    case "CPOL":
    case "CNP": {
      if (mode === "TRAN" && options?.capConductance !== undefined) {
        const gEq = options.capConductance;
        const iHist = options.capHistCurrent ?? 0;
        // Companion: i_C(t) = gEq * v_C(t) + iHist  (where iHist = -gEq*v_prev [- i_prev])
        return {
          gEq,
          iEq: iHist,
          iBranch: gEq * vDrop + iHist,
          operatingRegion: "Transient Companion (C·dV/dt)",
          spiceModelName: `CAP_${n.value}uF`,
          modelEquation: `i_C = C·dV/dt`,
        };
      }
      // DC operating point: open circuit (insulation leakage GMIN only)
      return {
        gEq: GMIN,
        iEq: 0,
        iBranch: vDrop * GMIN,
        operatingRegion: "DC Steady-State (Open Circuit)",
        spiceModelName: `CAP_${n.value}uF`,
        modelEquation: `I_dc = 0 (Open Circuit)`,
      };
    }

    case "AM": {
      const gEq = 1 / 0.001;
      return {
        gEq,
        iEq: 0,
        iBranch: vDrop * gEq,
        operatingRegion: "Zero-Drop Ammeter",
        spiceModelName: "AMMETER",
        modelEquation: `V = 0`,
      };
    }

    case "VM": {
      const gEq = 1e-10;
      return {
        gEq,
        iEq: 0,
        iBranch: vDrop * gEq,
        operatingRegion: "High-Z Voltmeter (10GΩ)",
        spiceModelName: "VOLTMETER",
        modelEquation: `I = 0`,
      };
    }

    case "SW": {
      const isClosed = n.value >= 1;
      const gEq = isClosed ? 1 / 0.005 : 1e-11;
      return {
        gEq,
        iEq: 0,
        iBranch: vDrop * gEq,
        operatingRegion: isClosed ? "Closed (5 mΩ)" : "Open (100 GΩ)",
        spiceModelName: "SW_SPST",
        modelEquation: isClosed ? "Closed" : "Open",
      };
    }

    case "D":
    case "D1N4007":
    case "LED":
    case "ZD": {
      const p = getDiodeParams(n);
      const nVt = p.nFactor * VT;

      // Reverse breakdown for Zener diode (V_d < -V_z, i.e., V_rev = -vDrop > Vz)
      if (p.vZener !== undefined && vDrop < -p.vZener + 0.15) {
        const vRev = -vDrop;
        const nVtZ = 1.8 * VT;
        const iZ0 = 1e-3;
        const vEffective = Math.min(vRev - p.vZener, 0.8);
        const iZ = iZ0 * Math.exp(Math.max(-30, Math.min(35, vEffective / nVtZ)));
        const rZ = 4.5;
        const gRaw = Math.max(1e-9, iZ / nVtZ);
        const gEff = gRaw / (1 + gRaw * rZ) + GMIN;
        const iTotal = -iZ / (1 + gRaw * rZ) + vDrop * GMIN;
        const iEq = iTotal - gEff * vDrop;
        return {
          gEq: gEff,
          iEq,
          iBranch: iTotal,
          operatingRegion:
            vRev >= p.vZener * 0.96
              ? `Zener Breakdown (Vz=${p.vZener.toFixed(1)}V)`
              : "Reverse-Biased",
          spiceModelName: p.modelName,
          modelEquation: `Zener Vz = ${p.vZener.toFixed(1)} V`,
        };
      }

      // Forward & reverse Shockley exponential equation with smooth ohmic series damping
      const vJuncMax = 28 * nVt;
      let vJ = vDrop;
      if (vJ > vJuncMax) {
        // Approximate Newton relation with series resistance Rs: vDrop = vJ + Rs * Is * exp(vJ/nVt)
        vJ = vJuncMax;
        for (let k = 0; k < 4; k++) {
          const expV = Math.exp(Math.min(38, vJ / nVt));
          const f = vJ + p.rSeries * p.isAmp * (expV - 1) - vDrop;
          const df = 1 + (p.rSeries * p.isAmp / nVt) * expV;
          vJ -= f / df;
        }
      }

      const expArg = Math.max(-40, Math.min(38, vJ / nVt));
      const expVal = Math.exp(expArg);
      const iShockley = p.isAmp * (expVal - 1);
      const gJunction = (p.isAmp / nVt) * expVal;
      // Combine junction differential conductance with series resistance Rs cleanly
      const gEff = gJunction / (1 + p.rSeries * gJunction) + GMIN;
      const iBranch = iShockley + vDrop * GMIN;
      const iEq = iBranch - gEff * vDrop;

      const region =
        iShockley > 1e-4
          ? n.type === "LED"
            ? `Forward LED Active (Vf≈${vDrop.toFixed(2)}V)`
            : `Forward Conducting (Vf≈${vDrop.toFixed(2)}V)`
          : vDrop > 0.05
          ? "Sub-Threshold Knee"
          : "Reverse-Biased Blocking";

      return {
        gEq: gEff,
        iEq,
        iBranch,
        operatingRegion: region,
        spiceModelName: p.modelName,
        modelEquation: `I_D = I_S·(e^(Vd/nVt) - 1)`,
      };
    }

    case "DIAC": {
      const vBo = Math.max(10, n.value || 32);
      if (Math.abs(vDrop) >= vBo) {
        const gEq = 1 / 12;
        const iBranch = (vDrop - Math.sign(vDrop) * (vBo * 0.45)) * gEq;
        return {
          gEq,
          iEq: iBranch - gEq * vDrop,
          iBranch,
          operatingRegion: "Breakover Avalanche ON",
          spiceModelName: "DB3_DIAC",
          modelEquation: `|V| >= ${vBo}V`,
        };
      }
      return {
        gEq: 1e-10,
        iEq: 0,
        iBranch: vDrop * 1e-10,
        operatingRegion: "Blocking",
        spiceModelName: "DB3_DIAC",
        modelEquation: `|V| < ${vBo}V`,
      };
    }

    default: {
      const gEq = 1e-7;
      return {
        gEq,
        iEq: 0,
        iBranch: vDrop * gEq,
        operatingRegion: "Linearized Element",
        spiceModelName: n.type,
        modelEquation: "G_min",
      };
    }
  }
}

/* ============================================================================
 * 5. Time-Domain Source Waveform Evaluator
 * ============================================================================ */

export function evaluateSourceVoltageAtTime(
  vs: AnalogNode,
  tSec: number,
  fgConfig?: FunctionGenConfig
): number {
  if (vs.type === "VS") {
    return vs.value;
  }

  // Signal generator (FG)
  const amp = fgConfig ? fgConfig.amplitudeV : Math.abs(vs.value) || 5;
  const freq = fgConfig ? fgConfig.frequencyHz : 50;
  const offset = fgConfig ? fgConfig.dcOffsetV : 0;
  const duty = fgConfig ? fgConfig.dutyCyclePct / 100 : 0.5;
  const waveform = fgConfig?.waveform ?? "SINE";

  if (freq <= 0) return offset + amp;
  const period = 1 / freq;
  const phaseFrac = ((tSec % period) + period) % period / period;

  const waveformStr = String(waveform);
  switch (waveformStr) {
    case "SINE":
      return offset + amp * Math.sin(2 * Math.PI * freq * tSec);
    case "SQUARE":
    case "PULSE":
      return offset + (phaseFrac < duty ? amp : -amp);
    case "TRIANGLE":
      return offset + amp * (phaseFrac < 0.5 ? -1 + 4 * phaseFrac : 3 - 4 * phaseFrac);
    case "SAWTOOTH":
      return offset + amp * (2 * phaseFrac - 1);
    default:
      return offset + amp * Math.sin(2 * Math.PI * freq * tSec);
  }
}

/* ============================================================================
 * 6. MNA Stamping Helpers
 * ============================================================================ */

function stampConductance(A: number[][], nA: number, nB: number, g: number) {
  if (nA > 0) A[nA - 1][nA - 1] += g;
  if (nB > 0) A[nB - 1][nB - 1] += g;
  if (nA > 0 && nB > 0) {
    A[nA - 1][nB - 1] -= g;
    A[nB - 1][nA - 1] -= g;
  }
}

function stampIndepCurrent(b: number[], nPos: number, nNeg: number, iFromPosToNeg: number) {
  // Current i leaves nPos and enters nNeg: RHS b is current ENTERING node.
  if (nPos > 0) b[nPos - 1] -= iFromPosToNeg;
  if (nNeg > 0) b[nNeg - 1] += iFromPosToNeg;
}

function stampVCCS(
  A: number[][],
  nOutPos: number,
  nOutNeg: number,
  nCtrlPos: number,
  nCtrlNeg: number,
  gm: number
) {
  if (nOutPos > 0 && nCtrlPos > 0) A[nOutPos - 1][nCtrlPos - 1] += gm;
  if (nOutPos > 0 && nCtrlNeg > 0) A[nOutPos - 1][nCtrlNeg - 1] -= gm;
  if (nOutNeg > 0 && nCtrlPos > 0) A[nOutNeg - 1][nCtrlPos - 1] -= gm;
  if (nOutNeg > 0 && nCtrlNeg > 0) A[nOutNeg - 1][nCtrlNeg - 1] += gm;
}

function stampThreeTerminalNonlinear(
  A: number[][],
  b: number[],
  n: AnalogNode,
  getNet: (id: number, term: number) => number,
  getV: (netId: number) => number
) {
  const n0 = getNet(n.id, 0);
  const n1 = getNet(n.id, 1);
  const n2 = getNet(n.id, 2);
  const v0 = getV(n0);
  const v1 = getV(n1);
  const v2 = getV(n2);

  if (n.type === "POT") {
    const totalR = Math.max(1, n.value || 500);
    stampConductance(A, n0, n2, 2 / totalR);
    stampConductance(A, n2, n1, 2 / totalR);
    return;
  }

  if (n.type === "BJT" || n.type === "BC547" || n.type === "BC557") {
    const isPnp = n.type === "BC557" || n.transistorConfig?.polarity === "PNP";
    const beta = Math.max(5, n.transistorConfig?.beta ?? (n.value || 200));
    const vbeOn = n.transistorConfig?.vbe_on ?? 0.7;
    const vceSat = n.transistorConfig?.vce_sat ?? 0.2;
    const va = Math.max(10, n.transistorConfig?.va ?? 100);
    const nBE = isPnp ? n1 : n2;
    const nE = isPnp ? n2 : n1;
    const nC = n0;

    // Smooth Ebers-Moll forward-active + soft saturation clamping
    const vbe = isPnp ? v1 - v2 : v2 - v1;
    const vce = isPnp ? v1 - v0 : v0 - v1;
    const isBase = 2.5e-14;
    const expVbe = Math.exp(Math.max(-35, Math.min(35, vbe / VT)));
    const iB = isBase * (expVbe - 1) + 1e-11 * vbe;
    const gPi = (isBase / VT) * expVbe + 1e-11;

    if (!isPnp) {
      stampConductance(A, n2, n1, gPi);
      stampIndepCurrent(b, n2, n1, iB - gPi * vbe);

      // Soft transition factor between Active and Saturation: satAlpha in (0..1)
      const kSat = 12;
      const satExp = Math.exp(Math.max(-30, Math.min(30, kSat * (vce - vceSat))));
      const satFactor = vce <= 0 ? Math.max(0, vce / vceSat) : satExp / (1 + satExp);
      const dSatDvce = vce <= 0 ? 1 / vceSat : (kSat * satExp) / ((1 + satExp) ** 2);

      const early = 1 + Math.max(0, vce) / va;
      const iC_raw = beta * iB * early * satFactor;
      const gm = beta * gPi * early * satFactor;
      const go = Math.max(1e-7, beta * iB * ((early / va) * satFactor + early * dSatDvce));

      stampVCCS(A, n0, n1, n2, n1, gm);
      stampConductance(A, n0, n1, go);
      stampIndepCurrent(b, n0, n1, iC_raw - gm * vbe - go * vce);
    } else {
      stampConductance(A, nBE, nE, gPi);
      stampIndepCurrent(b, nBE, nE, iB - gPi * vbe);

      const kSat = 12;
      const satExp = Math.exp(Math.max(-30, Math.min(30, kSat * (vce - vceSat))));
      const satFactor = vce <= 0 ? Math.max(0, vce / vceSat) : satExp / (1 + satExp);
      const dSatDvce = vce <= 0 ? 1 / vceSat : (kSat * satExp) / ((1 + satExp) ** 2);

      const early = 1 + Math.max(0, vce) / va;
      const iC_raw = beta * iB * early * satFactor;
      const gm = beta * gPi * early * satFactor;
      const go = Math.max(1e-7, beta * iB * ((early / va) * satFactor + early * dSatDvce));

      stampVCCS(A, n1, nC, n1, n2, gm);
      stampConductance(A, n1, nC, go);
      stampIndepCurrent(b, n1, nC, iC_raw - gm * vbe - go * vce);
    }
    void vbeOn;
    return;
  }

  if (n.type === "MOS") {
    const isPmos = n.transistorConfig?.polarity === "PMOS";
    const vth = Math.abs(n.transistorConfig?.vth ?? 2.5);
    const kn = Math.max(1e-4, (n.transistorConfig?.kn ?? 40) / 1000);
    const lambda = 0.015;
    if (n2 > 0) A[n2 - 1][n2 - 1] += 1e-11;

    if (!isPmos) {
      const vgs = v2 - v1;
      const vds = v0 - v1;
      if (vgs <= vth) {
        stampConductance(A, n0, n1, 1e-10);
      } else if (vds < vgs - vth) {
        // Triode: iD = kn * (2*(vgs-vth)*vds - vds^2) * (1 + lambda*vds)
        const vov = vgs - vth;
        const iD = kn * (2 * vov * vds - vds * vds) * (1 + lambda * Math.max(0, vds));
        const gm = Math.max(0, 2 * kn * Math.max(0, vds));
        const gds = Math.max(1e-4, 2 * kn * Math.max(0.01, vov - vds));
        stampVCCS(A, n0, n1, n2, n1, gm);
        stampConductance(A, n0, n1, gds);
        stampIndepCurrent(b, n0, n1, iD - gm * vgs - gds * vds);
      } else {
        // Saturation
        const vov = vgs - vth;
        const iD = kn * vov * vov * (1 + lambda * Math.max(0, vds));
        const gm = 2 * kn * vov * (1 + lambda * Math.max(0, vds));
        const gds = Math.max(1e-5, kn * vov * vov * lambda);
        stampVCCS(A, n0, n1, n2, n1, gm);
        stampConductance(A, n0, n1, gds);
        stampIndepCurrent(b, n0, n1, iD - gm * vgs - gds * vds);
      }
    } else {
      const vsg = v1 - v2;
      const vsd = v1 - v0;
      if (vsg <= vth) {
        stampConductance(A, n1, n0, 1e-10);
      } else if (vsd < vsg - vth) {
        const vov = vsg - vth;
        const iD = kn * (2 * vov * vsd - vsd * vsd);
        const gm = Math.max(0, 2 * kn * Math.max(0, vsd));
        const gds = Math.max(1e-4, 2 * kn * Math.max(0.01, vov - vsd));
        stampVCCS(A, n1, n0, n1, n2, gm);
        stampConductance(A, n1, n0, gds);
        stampIndepCurrent(b, n1, n0, iD - gm * vsg - gds * vsd);
      } else {
        const vov = vsg - vth;
        const iD = kn * vov * vov * (1 + lambda * Math.max(0, vsd));
        const gm = 2 * kn * vov * (1 + lambda * Math.max(0, vsd));
        const gds = Math.max(1e-5, kn * vov * vov * lambda);
        stampVCCS(A, n1, n0, n1, n2, gm);
        stampConductance(A, n1, n0, gds);
        stampIndepCurrent(b, n1, n0, iD - gm * vsg - gds * vsd);
      }
    }
    return;
  }

  if (n.type === "SCR" || n.type === "TRIAC") {
    const vmt = v0 - v1;
    const vgk = v2 - v1;
    const vgt = n.transistorConfig?.vgt ?? 0.75;
    const vHold = n.transistorConfig?.vHold ?? 0.85;
    stampConductance(A, n2, n1, 1 / 100);
    const active =
      n.type === "SCR"
        ? vgk >= vgt && vmt > 0.5
        : Math.abs(vgk) >= vgt && Math.abs(vmt) > 0.5;
    if (active) {
      const gOn = 2.0;
      const iT = (vmt - Math.sign(vmt) * vHold) * gOn;
      stampConductance(A, n0, n1, gOn);
      stampIndepCurrent(b, n0, n1, iT - gOn * vmt);
    } else {
      stampConductance(A, n0, n1, 1e-8);
    }
    return;
  }

  if (n.type === "JFET") {
    const isPJfet = n.transistorConfig?.polarity === "PJFET";
    const absVp = Math.max(0.5, Math.abs(n.transistorConfig?.vP ?? 4.0));
    const idss = Math.max(1e-4, (n.transistorConfig?.idss_mA ?? 15) / 1000);
    if (n2 > 0) A[n2 - 1][n2 - 1] += 1e-11;

    const vgs = isPJfet ? Math.min(0.4, v1 - v2) : Math.min(0.4, v2 - v1);
    const vds = isPJfet ? v1 - v0 : v0 - v1;
    const vOv = vgs + absVp;
    const nD = isPJfet ? n1 : n0;
    const nS = isPJfet ? n0 : n1;
    if (vOv <= 0) {
      stampConductance(A, nD, nS, 1e-9);
    } else if (vds < vOv) {
      const rCh = Math.max(15, absVp / (2 * idss * (vOv / absVp)));
      stampConductance(A, nD, nS, 1 / rCh);
    } else {
      const factor = vOv / absVp;
      const iD = idss * factor * factor;
      const gm = ((2 * idss) / absVp) * factor;
      const gds = 1e-4;
      stampVCCS(A, nD, nS, isPJfet ? n1 : n2, isPJfet ? n2 : n1, gm);
      stampConductance(A, nD, nS, gds);
      stampIndepCurrent(b, nD, nS, iD - gm * vgs - gds * vds);
    }
  }
}

/* ============================================================================
 * 7. Rigorous Thévenin Equivalent Resistance Calculator (1A Test Current Method)
 * ============================================================================ */

export function solveTheveninResistanceBetweenNets(
  nodes: AnalogNode[],
  netlist: ExtractedNetlist,
  netA: number,
  netB: number
): number | null {
  if (netA === netB) return 0;
  if (!netlist.valid || netlist.numUnknownNodes === 0) return null;

  const vSources = nodes.filter((n) => isVoltageSourceType(n.type));
  const totalVars = netlist.numUnknownNodes + vSources.length;
  const A: number[][] = Array.from({ length: totalVars }, () =>
    new Array<number>(totalVars).fill(0)
  );
  const b = new Array<number>(totalVars).fill(0);

  for (const n of nodes) {
    if (n.type === "GND" || isVoltageSourceType(n.type) || n.type === "IS") continue;
    if (isThreeTerminalComponent(n.type)) {
      if (n.type === "POT") {
        const n0 = netlist.getTermNet(n.id, 0);
        const n1 = netlist.getTermNet(n.id, 1);
        const n2 = netlist.getTermNet(n.id, 2);
        const r = Math.max(1, n.value || 500);
        stampConductance(A, n0, n2, 2 / r);
        stampConductance(A, n2, n1, 2 / r);
      }
      continue;
    }
    const n1 = netlist.getTermNet(n.id, 0);
    const n2 = netlist.getTermNet(n.id, 1);
    const stamp = evaluateTwoTermDeviceCompanion(n, 0, { forAcOrDc: "DC" });
    stampConductance(A, n1, n2, stamp.gEq);
  }

  const GMIN = 1e-12;
  for (let i = 0; i < netlist.numUnknownNodes; i++) {
    A[i][i] += GMIN;
  }

  // Zero out all independent voltage sources (0V short circuit)
  vSources.forEach((vs, vIdx) => {
    const row = netlist.numUnknownNodes + vIdx;
    const nPos = netlist.getTermNet(vs.id, 0);
    const nNeg = netlist.getTermNet(vs.id, 1);
    if (nPos > 0) {
      A[row][nPos - 1] = 1;
      A[nPos - 1][row] = 1;
    }
    if (nNeg > 0) {
      A[row][nNeg - 1] = -1;
      A[nNeg - 1][row] = -1;
    }
    b[row] = 0;
  });

  // Inject I_test = 1.0 A into netA and pull out of netB
  if (netA > 0) b[netA - 1] += 1.0;
  if (netB > 0) b[netB - 1] -= 1.0;

  const solved = solveRealLinearSystem(A, b);
  if (!solved.ok) return null;

  const vA = netA === 0 ? 0 : solved.x[netA - 1];
  const vB = netB === 0 ? 0 : solved.x[netB - 1];
  const rTh = vA - vB;
  if (!Number.isFinite(rTh) || rTh > 1e8 || rTh < -1e-6) return null;
  return Math.max(0, rTh);
}

/* ============================================================================
 * 8. Time-Domain MNA Transient Simulation Engine (.TRAN: Backward Euler & Trapezoidal)
 * ============================================================================ */

export interface TransientAnalysisOptions {
  tStart?: number;
  tStop: number;
  dt: number;
  method?: "BE" | "TRAPEZOIDAL";
  uic?: boolean;
  initialCapVoltages?: Record<number, number>; // nodeId -> V_C(0)
  initialIndCurrents?: Record<number, number>; // nodeId -> I_L(0)
  fgConfig?: FunctionGenConfig;
  sourceTimeOverrides?: Record<number, (tSec: number) => number>;
  strictGround?: boolean;
}

export interface TransientAnalysisResult {
  converged: boolean;
  valid: boolean;
  errors: NetlistDiagnostic[];
  warnings: NetlistDiagnostic[];
  abortedReason?: string;
  method: "BE" | "TRAPEZOIDAL";
  dt: number;
  timePointsS: number[];
  netVoltagesHistory: Record<number, number[]>; // netId -> V(t_k)
  capVoltagesHistory: Record<number, number[]>; // nodeId -> vC(t_k)
  indCurrentsHistory: Record<number, number[]>; // nodeId -> iL(t_k)
  compCurrentsMaHistory: Record<number, number[]>; // nodeId -> i_comp(t_k) in mA
  compVoltagesHistory: Record<number, number[]>; // nodeId -> vDrop(t_k) in V
  kclMaxResidualHistory: number[];
  netlist: ExtractedNetlist;
}

export function solveSpiceTransient(
  nodes: AnalogNode[],
  wires: AnalogWire[],
  options: TransientAnalysisOptions
): TransientAnalysisResult {
  const tStart = options.tStart ?? 0;
  const tStop = options.tStop;
  const dt = options.dt;
  const method = options.method ?? "TRAPEZOIDAL";

  const netlist = extractAndValidateNetlist(nodes, wires, {
    strictGround: options.strictGround ?? true,
  });

  const errors: NetlistDiagnostic[] = [...netlist.errors];
  const warnings: NetlistDiagnostic[] = [...netlist.warnings];

  if (!Number.isFinite(tStart) || !Number.isFinite(tStop) || !Number.isFinite(dt) || dt <= 0 || tStop <= tStart) {
    errors.push({
      code: "INVALID_SIM_PARAMS",
      severity: "ERROR",
      message: `Invalid transient parameters: tStart=${tStart}, tStop=${tStop}, dt=${dt}. Must satisfy dt > 0 and tStop > tStart.`,
    });
  }

  const rawSteps = dt > 0 && tStop > tStart ? Math.round((tStop - tStart) / dt) : 0;
  if (rawSteps > 12000) {
    errors.push({
      code: "INVALID_SIM_PARAMS",
      severity: "ERROR",
      message: `Requested ${rawSteps} transient steps exceeds safety cap (12,000). Increase dt or reduce tStop.`,
    });
  }

  if (errors.length > 0) {
    return {
      converged: false,
      valid: false,
      errors,
      warnings,
      abortedReason: errors[0].message,
      method,
      dt,
      timePointsS: [],
      netVoltagesHistory: {},
      capVoltagesHistory: {},
      indCurrentsHistory: {},
      compCurrentsMaHistory: {},
      compVoltagesHistory: {},
      kclMaxResidualHistory: [],
      netlist,
    };
  }

  const numSteps = Math.max(1, rawSteps);
  const actualDt = (tStop - tStart) / numSteps;
  const numUnknownNodes = netlist.numUnknownNodes;
  const vSources = nodes.filter((n) => isVoltageSourceType(n.type));
  const totalVars = numUnknownNodes + vSources.length;

  const caps = nodes.filter((n) => isCapacitorType(n.type));
  const inds = nodes.filter((n) => n.type === "L");
  const hasNonlinear = nodes.some(
    (n) => isDiodeLikeType(n.type) || isThreeTerminalComponent(n.type)
  );

  // Track previous step capacitor voltages & currents, inductor currents & voltages
  const prevCapV = new Map<number, number>();
  const prevCapI = new Map<number, number>();
  const prevIndI = new Map<number, number>();
  const prevIndV = new Map<number, number>();

  for (const c of caps) {
    prevCapV.set(c.id, options.initialCapVoltages?.[c.id] ?? 0);
    prevCapI.set(c.id, 0);
  }
  for (const l of inds) {
    prevIndI.set(l.id, options.initialIndCurrents?.[l.id] ?? 0);
    prevIndV.set(l.id, 0);
  }

  const timePointsS: number[] = [];
  const netVoltagesHistory: Record<number, number[]> = {};
  for (let nid = 0; nid < netlist.netCount; nid++) netVoltagesHistory[nid] = [];
  const capVoltagesHistory: Record<number, number[]> = {};
  caps.forEach((c) => (capVoltagesHistory[c.id] = []));
  const indCurrentsHistory: Record<number, number[]> = {};
  inds.forEach((l) => (indCurrentsHistory[l.id] = []));
  const compCurrentsMaHistory: Record<number, number[]> = {};
  const compVoltagesHistory: Record<number, number[]> = {};
  nodes.forEach((n) => {
    if (n.type !== "GND") {
      compCurrentsMaHistory[n.id] = [];
      compVoltagesHistory[n.id] = [];
    }
  });
  const kclMaxResidualHistory: number[] = [];

  const getSourceV = (vs: AnalogNode, t: number): number => {
    if (options.sourceTimeOverrides && options.sourceTimeOverrides[vs.id]) {
      return options.sourceTimeOverrides[vs.id](t);
    }
    return evaluateSourceVoltageAtTime(vs, t, options.fgConfig);
  };

  let prevX = new Array<number>(totalVars).fill(0);
  const GMIN = 1e-11;
  const MAX_NR = hasNonlinear ? 40 : 1;

  // Step 0: Solve consistent initial state at t = tStart
  // Use UIC: capacitors clamped via tiny resistance (1e-5 Ω) to initialCapVoltages, inductors via Norton current source initialIndCurrents
  const solveInitialState = (): { ok: boolean; x: number[]; maxRes: number; err?: string } => {
    let nrX = [...prevX];
    for (let iter = 1; iter <= MAX_NR; iter++) {
      const A = Array.from({ length: totalVars }, () => new Array<number>(totalVars).fill(0));
      const b = new Array<number>(totalVars).fill(0);
      const getV = (nid: number) => (nid === 0 ? 0 : nrX[nid - 1] ?? 0);

      for (const n of nodes) {
        if (n.type === "GND" || isVoltageSourceType(n.type)) continue;
        if (n.type === "IS") {
          const iA = n.value / 1000;
          stampIndepCurrent(b, netlist.getTermNet(n.id, 0), netlist.getTermNet(n.id, 1), iA);
          continue;
        }
        if (isThreeTerminalComponent(n.type)) {
          stampThreeTerminalNonlinear(A, b, n, netlist.getTermNet, getV);
          continue;
        }
        const n1 = netlist.getTermNet(n.id, 0);
        const n2 = netlist.getTermNet(n.id, 1);

        if (isCapacitorType(n.type)) {
          // Enforce vC(0) via stiff companion conductance gIc = 1e6 S with current source gIc * vC0
          const vC0 = prevCapV.get(n.id) ?? 0;
          const gIc = 1e6;
          stampConductance(A, n1, n2, gIc);
          // i = gIc * (vC - vC0) -> iEq = -gIc * vC0 -> stampIndepCurrent(..., iEq)
          stampIndepCurrent(b, n1, n2, -gIc * vC0);
          continue;
        }

        if (n.type === "L") {
          // Enforce iL(0) as current source (plus tiny parallel GMIN)
          const iL0 = prevIndI.get(n.id) ?? 0;
          stampConductance(A, n1, n2, GMIN);
          stampIndepCurrent(b, n1, n2, iL0);
          continue;
        }

        const vDrop = getV(n1) - getV(n2);
        const stamp = evaluateTwoTermDeviceCompanion(n, vDrop, { forAcOrDc: "DC" });
        stampConductance(A, n1, n2, stamp.gEq);
        stampIndepCurrent(b, n1, n2, stamp.iEq);
      }

      for (let i = 0; i < numUnknownNodes; i++) A[i][i] += GMIN;

      vSources.forEach((vs, vIdx) => {
        const row = numUnknownNodes + vIdx;
        const nPos = netlist.getTermNet(vs.id, 0);
        const nNeg = netlist.getTermNet(vs.id, 1);
        if (nPos > 0) {
          A[row][nPos - 1] = 1;
          A[nPos - 1][row] = 1;
        }
        if (nNeg > 0) {
          A[row][nNeg - 1] = -1;
          A[nNeg - 1][row] = -1;
        }
        b[row] = getSourceV(vs, tStart);
      });

      const res = solveRealLinearSystem(A, b);
      if (!res.ok) return { ok: false, x: [], maxRes: Infinity, err: res.error };

      let maxDelta = 0;
      for (let i = 0; i < numUnknownNodes; i++) {
        maxDelta = Math.max(maxDelta, Math.abs(res.x[i] - nrX[i]));
      }
      nrX = res.x;
      if (!hasNonlinear || (iter > 1 && maxDelta < 1e-6)) {
        let maxRes = 0;
        for (let r = 0; r < totalVars; r++) {
          let sum = 0;
          for (let c = 0; c < totalVars; c++) sum += A[r][c] * nrX[c];
          maxRes = Math.max(maxRes, Math.abs(sum - b[r]));
        }
        return { ok: true, x: nrX, maxRes };
      }
    }
    return {
      ok: false,
      x: nrX,
      maxRes: Infinity,
      err: `Transient initial-state Newton-Raphson did not converge at t=${tStart}s.`,
    };
  };

  const initRes = solveInitialState();
  if (!initRes.ok) {
    errors.push({
      code: "NON_CONVERGENT",
      severity: "ERROR",
      message: initRes.err || "Initial transient MNA solve failed.",
    });
    return {
      converged: false,
      valid: false,
      errors,
      warnings,
      abortedReason: initRes.err,
      method,
      dt: actualDt,
      timePointsS: [],
      netVoltagesHistory: {},
      capVoltagesHistory: {},
      indCurrentsHistory: {},
      compCurrentsMaHistory: {},
      compVoltagesHistory: {},
      kclMaxResidualHistory: [],
      netlist,
    };
  }

  prevX = initRes.x;
  const recordStep = (t: number, xVec: number[], maxRes: number, isInitialStep: boolean) => {
    timePointsS.push(t);
    kclMaxResidualHistory.push(maxRes);
    const getV = (nid: number) => (nid === 0 ? 0 : xVec[nid - 1] ?? 0);
    for (let nid = 0; nid < netlist.netCount; nid++) {
      netVoltagesHistory[nid].push(getV(nid));
    }

    const vsIndexMap = new Map<number, number>();
    vSources.forEach((vs, idx) => vsIndexMap.set(vs.id, idx));

    for (const n of nodes) {
      if (n.type === "GND") continue;
      const n1 = netlist.getTermNet(n.id, 0);
      const n2 = netlist.getTermNet(n.id, 1);
      const vDrop = getV(n1) - getV(n2);
      compVoltagesHistory[n.id].push(vDrop);

      if (isVoltageSourceType(n.type)) {
        const vIdx = vsIndexMap.get(n.id)!;
        const iBranchA = -(xVec[numUnknownNodes + vIdx] ?? 0);
        compCurrentsMaHistory[n.id].push(iBranchA * 1000);
      } else if (n.type === "IS") {
        compCurrentsMaHistory[n.id].push(n.value);
      } else if (isCapacitorType(n.type)) {
        let iCap = 0;
        if (isInitialStep) {
          const vC0 = prevCapV.get(n.id) ?? 0;
          iCap = 1e6 * (vDrop - vC0);
          prevCapV.set(n.id, vDrop);
          prevCapI.set(n.id, iCap);
        } else {
          const capF = Math.max(1e-15, getCapacitorFarads(n));
          if (method === "BE") {
            const gEq = capF / actualDt;
            const iHist = -gEq * (prevCapV.get(n.id) ?? 0);
            iCap = gEq * vDrop + iHist;
          } else {
            const gEq = (2 * capF) / actualDt;
            const iHist = -gEq * (prevCapV.get(n.id) ?? 0) - (prevCapI.get(n.id) ?? 0);
            iCap = gEq * vDrop + iHist;
          }
          prevCapV.set(n.id, vDrop);
          prevCapI.set(n.id, iCap);
        }
        capVoltagesHistory[n.id].push(vDrop);
        compCurrentsMaHistory[n.id].push(iCap * 1000);
      } else if (n.type === "L") {
        let iInd = 0;
        if (isInitialStep) {
          iInd = prevIndI.get(n.id) ?? 0;
          prevIndV.set(n.id, vDrop);
        } else {
          const indH = Math.max(1e-12, getInductorHenries(n));
          const rDcr = 0.005;
          if (method === "BE") {
            const rEq = rDcr + indH / actualDt;
            const gEq = 1 / rEq;
            const iHist = ((indH / actualDt) * (prevIndI.get(n.id) ?? 0)) * gEq;
            iInd = gEq * vDrop + iHist;
          } else {
            const rEq = rDcr + (2 * indH) / actualDt;
            const gEq = 1 / rEq;
            const vTerm = (2 * indH / actualDt - rDcr) * (prevIndI.get(n.id) ?? 0) + (prevIndV.get(n.id) ?? 0);
            const iHist = vTerm * gEq;
            iInd = gEq * vDrop + iHist;
          }
          prevIndI.set(n.id, iInd);
          prevIndV.set(n.id, vDrop);
        }
        indCurrentsHistory[n.id].push(iInd);
        compCurrentsMaHistory[n.id].push(iInd * 1000);
      } else if (isThreeTerminalComponent(n.type)) {
        const n0 = netlist.getTermNet(n.id, 0);
        const v2 = getV(netlist.getTermNet(n.id, 2));
        compCurrentsMaHistory[n.id].push(((getV(n0) - getV(n2)) * 1) + (v2 * 0));
      } else {
        const stamp = evaluateTwoTermDeviceCompanion(n, vDrop, { forAcOrDc: "DC" });
        compCurrentsMaHistory[n.id].push(stamp.iBranch * 1000);
      }
    }
  };

  recordStep(tStart, prevX, initRes.maxRes, true);

  // Time marching k = 1 .. numSteps
  for (let step = 1; step <= numSteps; step++) {
    const tk = tStart + step * actualDt;
    let nrX = [...prevX];
    let stepConverged = false;
    let stepMaxRes = 0;

    // Cache history companion coefficients for this time step (invariant inside inner NR loop!)
    const capCompMap = new Map<number, { gEq: number; iHist: number }>();
    for (const c of caps) {
      const capF = Math.max(1e-15, getCapacitorFarads(c));
      const vPrev = prevCapV.get(c.id) ?? 0;
      const iPrev = prevCapI.get(c.id) ?? 0;
      if (method === "BE") {
        const gEq = capF / actualDt;
        capCompMap.set(c.id, { gEq, iHist: -gEq * vPrev });
      } else {
        const gEq = (2 * capF) / actualDt;
        capCompMap.set(c.id, { gEq, iHist: -gEq * vPrev - iPrev });
      }
    }

    const indCompMap = new Map<number, { gEq: number; iHist: number }>();
    for (const l of inds) {
      const indH = Math.max(1e-12, getInductorHenries(l));
      const rDcr = 0.005;
      const iPrev = prevIndI.get(l.id) ?? 0;
      const vPrev = prevIndV.get(l.id) ?? 0;
      if (method === "BE") {
        const rEq = rDcr + indH / actualDt;
        const gEq = 1 / rEq;
        const iHist = ((indH / actualDt) * iPrev) * gEq;
        indCompMap.set(l.id, { gEq, iHist });
      } else {
        const rEq = rDcr + (2 * indH) / actualDt;
        const gEq = 1 / rEq;
        const iHist = ((2 * indH / actualDt - rDcr) * iPrev + vPrev) * gEq;
        indCompMap.set(l.id, { gEq, iHist });
      }
    }

    // Track per-device junction voltage for pnjlim damping
    const prevJunctionV = new Map<number, number>();
    for (const n of nodes) {
      if (isDiodeLikeType(n.type)) {
        const n1 = netlist.getTermNet(n.id, 0);
        const n2 = netlist.getTermNet(n.id, 1);
        const v1 = n1 === 0 ? 0 : nrX[n1 - 1] ?? 0;
        const v2 = n2 === 0 ? 0 : nrX[n2 - 1] ?? 0;
        prevJunctionV.set(n.id, v1 - v2);
      }
    }

    for (let iter = 1; iter <= MAX_NR; iter++) {
      const A = Array.from({ length: totalVars }, () => new Array<number>(totalVars).fill(0));
      const b = new Array<number>(totalVars).fill(0);
      const getV = (nid: number) => (nid === 0 ? 0 : nrX[nid - 1] ?? 0);

      for (const n of nodes) {
        if (n.type === "GND" || isVoltageSourceType(n.type)) continue;
        if (n.type === "IS") {
          stampIndepCurrent(
            b,
            netlist.getTermNet(n.id, 0),
            netlist.getTermNet(n.id, 1),
            n.value / 1000
          );
          continue;
        }
        if (isThreeTerminalComponent(n.type)) {
          stampThreeTerminalNonlinear(A, b, n, netlist.getTermNet, getV);
          continue;
        }

        const n1 = netlist.getTermNet(n.id, 0);
        const n2 = netlist.getTermNet(n.id, 1);

        if (isCapacitorType(n.type)) {
          const comp = capCompMap.get(n.id)!;
          stampConductance(A, n1, n2, comp.gEq);
          stampIndepCurrent(b, n1, n2, comp.iHist);
          continue;
        }

        if (n.type === "L") {
          const comp = indCompMap.get(n.id)!;
          stampConductance(A, n1, n2, comp.gEq);
          stampIndepCurrent(b, n1, n2, comp.iHist);
          continue;
        }

        let vDrop = getV(n1) - getV(n2);
        if (isDiodeLikeType(n.type) && iter > 1) {
          const p = getDiodeParams(n);
          const oldV = prevJunctionV.get(n.id) ?? 0;
          vDrop = pnjlim(vDrop, oldV, p.nFactor * VT, p.vCrit);
          prevJunctionV.set(n.id, vDrop);
        }

        const stamp = evaluateTwoTermDeviceCompanion(n, vDrop, { forAcOrDc: "TRAN" });
        stampConductance(A, n1, n2, stamp.gEq);
        stampIndepCurrent(b, n1, n2, stamp.iEq);
      }

      for (let i = 0; i < numUnknownNodes; i++) A[i][i] += GMIN;

      vSources.forEach((vs, vIdx) => {
        const row = numUnknownNodes + vIdx;
        const nPos = netlist.getTermNet(vs.id, 0);
        const nNeg = netlist.getTermNet(vs.id, 1);
        if (nPos > 0) {
          A[row][nPos - 1] = 1;
          A[nPos - 1][row] = 1;
        }
        if (nNeg > 0) {
          A[row][nNeg - 1] = -1;
          A[nNeg - 1][row] = -1;
        }
        b[row] = getSourceV(vs, tk);
      });

      const res = solveRealLinearSystem(A, b);
      if (!res.ok) {
        errors.push({
          code: "SINGULAR_MATRIX",
          severity: "ERROR",
          message: `Transient MNA failure at t=${tk.toFixed(5)}s: ${res.error}`,
        });
        return {
          converged: false,
          valid: false,
          errors,
          warnings,
          abortedReason: res.error,
          method,
          dt: actualDt,
          timePointsS,
          netVoltagesHistory,
          capVoltagesHistory,
          indCurrentsHistory,
          compCurrentsMaHistory,
          compVoltagesHistory,
          kclMaxResidualHistory,
          netlist,
        };
      }

      let maxDelta = 0;
      const dampedX = [...res.x];
      for (let i = 0; i < numUnknownNodes; i++) {
        if (iter > 12 && hasNonlinear && Math.abs(res.x[i] - nrX[i]) > 0.5) {
          dampedX[i] = 0.5 * (nrX[i] + res.x[i]);
        }
        maxDelta = Math.max(maxDelta, Math.abs(dampedX[i] - nrX[i]));
      }
      nrX = dampedX;

      let maxRes = 0;
      for (let r = 0; r < totalVars; r++) {
        let sum = 0;
        for (let c = 0; c < totalVars; c++) sum += A[r][c] * nrX[c];
        maxRes = Math.max(maxRes, Math.abs(sum - b[r]));
      }
      stepMaxRes = maxRes;

      const vScale = Math.max(1, ...nrX.slice(0, numUnknownNodes).map(Math.abs));
      if (!hasNonlinear || (iter > 1 && maxDelta <= 1e-5 * vScale + 1e-6)) {
        stepConverged = true;
        break;
      }
    }

    if (!stepConverged) {
      const msg = `Transient Newton-Raphson failed to converge at t=${tk.toExponential(3)}s.`;
      errors.push({ code: "NON_CONVERGENT", severity: "ERROR", message: msg });
      return {
        converged: false,
        valid: false,
        errors,
        warnings,
        abortedReason: msg,
        method,
        dt: actualDt,
        timePointsS,
        netVoltagesHistory,
        capVoltagesHistory,
        indCurrentsHistory,
        compCurrentsMaHistory,
        compVoltagesHistory,
        kclMaxResidualHistory,
        netlist,
      };
    }

    prevX = nrX;
    recordStep(tk, nrX, stepMaxRes, false);
  }

  return {
    converged: true,
    valid: true,
    errors,
    warnings,
    method,
    dt: actualDt,
    timePointsS,
    netVoltagesHistory,
    capVoltagesHistory,
    indCurrentsHistory,
    compCurrentsMaHistory,
    compVoltagesHistory,
    kclMaxResidualHistory,
    netlist,
  };
}

/* ============================================================================
 * 9. Complex Small-Signal AC Frequency Sweep Engine (.AC)
 * ============================================================================ */

export interface AcSweepOptions {
  fStart: number;
  fStop: number;
  points: number;
  sweepType?: "DECADE" | "LOG" | "LINEAR";
  outputNetId?: number;
  acMagnitudeV?: number;
  strictGround?: boolean;
  dcOperatingVoltages?: number[]; // Optional linearized node voltages for semiconductors
}

export interface AcFrequencyPoint {
  freqHz: number;
  omegaRadS: number;
  vIn: ComplexNumber;
  vOut: ComplexNumber;
  gainMag: number;
  gainDb: number;
  phaseDeg: number;
  inputImpedanceMag: number;
  inputImpedancePhaseDeg: number;
  realPowerW: number;
  reactivePowerVar: number;
  apparentPowerVa: number;
  powerFactor: number;
  netPhasors: Record<number, ComplexNumber>;
}

export interface AcSweepResult {
  converged: boolean;
  valid: boolean;
  errors: NetlistDiagnostic[];
  warnings: NetlistDiagnostic[];
  abortedReason?: string;
  inputNetId: number;
  outputNetId: number;
  frequencies: AcFrequencyPoint[];
  netlist: ExtractedNetlist;
}

export function solveSpiceAcSweep(
  nodes: AnalogNode[],
  wires: AnalogWire[],
  options: AcSweepOptions
): AcSweepResult {
  const { fStart, fStop, points, sweepType = "LOG" } = options;
  const netlist = extractAndValidateNetlist(nodes, wires, {
    strictGround: options.strictGround ?? true,
  });

  const errors: NetlistDiagnostic[] = [...netlist.errors];
  const warnings: NetlistDiagnostic[] = [...netlist.warnings];

  if (
    !Number.isFinite(fStart) ||
    !Number.isFinite(fStop) ||
    !Number.isFinite(points) ||
    fStart <= 0 ||
    fStop <= fStart ||
    points < 2 ||
    points > 2000
  ) {
    errors.push({
      code: "INVALID_SIM_PARAMS",
      severity: "ERROR",
      message: `Invalid AC sweep parameters: fStart=${fStart}, fStop=${fStop}, points=${points}. Must satisfy 0 < fStart < fStop and 2 <= points <= 2000.`,
    });
  }

  const vSources = nodes.filter((n) => isVoltageSourceType(n.type));
  if (vSources.length === 0) {
    errors.push({
      code: "INVALID_SIM_PARAMS",
      severity: "ERROR",
      message: "AC small-signal sweep requires at least one voltage source (VS or FG) to excite the network.",
    });
  }

  // Pick AC stimulus source (prefer FG if present, else first VS)
  const acSource = vSources.find((v) => v.type === "FG") ?? vSources[0];
  const inputNetId = acSource ? netlist.getTermNet(acSource.id, 0) : 0;

  // Choose output probe net: caller override > voltmeter > capacitor/load node > last non-ground net != inputNetId
  let outputNetId = options.outputNetId ?? -1;
  if (outputNetId < 0) {
    const vm = nodes.find((n) => n.type === "VM");
    if (vm) {
      outputNetId = netlist.getTermNet(vm.id, 0);
    } else {
      const cap = nodes.find((n) => isCapacitorType(n.type));
      if (cap) {
        const c0 = netlist.getTermNet(cap.id, 0);
        const c1 = netlist.getTermNet(cap.id, 1);
        outputNetId = c0 !== 0 && c0 !== inputNetId ? c0 : c1 !== 0 && c1 !== inputNetId ? c1 : c0 !== 0 ? c0 : c1;
      }
      if (outputNetId <= 0) {
        for (let nid = netlist.netCount - 1; nid >= 1; nid--) {
          if (nid !== inputNetId && !netlist.floatingNetIds.has(nid)) {
            outputNetId = nid;
            break;
          }
        }
      }
      if (outputNetId <= 0) outputNetId = inputNetId;
    }
  }

  if (errors.length > 0) {
    return {
      converged: false,
      valid: false,
      errors,
      warnings,
      abortedReason: errors[0].message,
      inputNetId,
      outputNetId,
      frequencies: [],
      netlist,
    };
  }

  const numUnknownNodes = netlist.numUnknownNodes;
  const totalVars = numUnknownNodes + vSources.length;
  const dcV = options.dcOperatingVoltages ?? new Array<number>(numUnknownNodes).fill(0);
  const acVinMag = options.acMagnitudeV ?? (Math.abs(acSource.value) > 0 ? Math.abs(acSource.value) : 1.0);

  // Build frequency grid
  const freqs: number[] = [];
  if (sweepType === "LINEAR") {
    for (let i = 0; i < points; i++) {
      freqs.push(fStart + ((fStop - fStart) * i) / (points - 1));
    }
  } else {
    const logLo = Math.log10(fStart);
    const logHi = Math.log10(fStop);
    for (let i = 0; i < points; i++) {
      freqs.push(Math.pow(10, logLo + ((logHi - logLo) * i) / (points - 1)));
    }
  }

  const results: AcFrequencyPoint[] = [];
  const GMIN = 1e-12;

  const stampComplexY = (
    Y: ComplexNumber[][],
    nA: number,
    nB: number,
    y: ComplexNumber
  ) => {
    if (nA > 0) Y[nA - 1][nA - 1] = cAdd(Y[nA - 1][nA - 1], y);
    if (nB > 0) Y[nB - 1][nB - 1] = cAdd(Y[nB - 1][nB - 1], y);
    if (nA > 0 && nB > 0) {
      Y[nA - 1][nB - 1] = cSub(Y[nA - 1][nB - 1], y);
      Y[nB - 1][nA - 1] = cSub(Y[nB - 1][nA - 1], y);
    }
  };

  for (const freqHz of freqs) {
    const omega = 2 * Math.PI * freqHz;
    const Y: ComplexNumber[][] = Array.from({ length: totalVars }, () =>
      Array.from({ length: totalVars }, () => ({ re: 0, im: 0 }))
    );
    const B: ComplexNumber[] = Array.from({ length: totalVars }, () => ({ re: 0, im: 0 }));

    for (const n of nodes) {
      if (n.type === "GND" || isVoltageSourceType(n.type) || n.type === "IS") continue;

      if (isThreeTerminalComponent(n.type)) {
        // Linearized small-signal conductance around DC point
        const realA = Array.from({ length: numUnknownNodes }, () => new Array<number>(numUnknownNodes).fill(0));
        const realB = new Array<number>(numUnknownNodes).fill(0);
        stampThreeTerminalNonlinear(
          realA,
          realB,
          n,
          netlist.getTermNet,
          (nid) => (nid === 0 ? 0 : dcV[nid - 1] ?? 0)
        );
        for (let r = 0; r < numUnknownNodes; r++) {
          for (let c = 0; c < numUnknownNodes; c++) {
            if (realA[r][c] !== 0) Y[r][c].re += realA[r][c];
          }
        }
        continue;
      }

      const n1 = netlist.getTermNet(n.id, 0);
      const n2 = netlist.getTermNet(n.id, 1);

      if (isCapacitorType(n.type)) {
        const capF = Math.max(1e-15, getCapacitorFarads(n));
        // Y_C = GMIN + j * omega * C
        stampComplexY(Y, n1, n2, { re: GMIN, im: omega * capF });
      } else if (n.type === "L") {
        const indH = Math.max(1e-12, getInductorHenries(n));
        const rDcr = 0.005;
        // Y_L = 1 / (R_DCR + j*omega*L) = (R - j*omega*L) / (R^2 + (omega*L)^2)
        const xL = omega * indH;
        const denom = rDcr * rDcr + xL * xL;
        stampComplexY(Y, n1, n2, { re: rDcr / denom, im: -xL / denom });
      } else {
        const v1 = n1 === 0 ? 0 : dcV[n1 - 1] ?? 0;
        const v2 = n2 === 0 ? 0 : dcV[n2 - 1] ?? 0;
        const stamp = evaluateTwoTermDeviceCompanion(n, v1 - v2, { forAcOrDc: "DC" });
        stampComplexY(Y, n1, n2, { re: stamp.gEq, im: 0 });
      }
    }

    for (let i = 0; i < numUnknownNodes; i++) {
      Y[i][i].re += GMIN;
    }

    let acSourceBranchIdx = 0;
    vSources.forEach((vs, vIdx) => {
      const row = numUnknownNodes + vIdx;
      const nPos = netlist.getTermNet(vs.id, 0);
      const nNeg = netlist.getTermNet(vs.id, 1);
      if (nPos > 0) {
        Y[row][nPos - 1] = { re: 1, im: 0 };
        Y[nPos - 1][row] = { re: 1, im: 0 };
      }
      if (nNeg > 0) {
        Y[row][nNeg - 1] = { re: -1, im: 0 };
        Y[nNeg - 1][row] = { re: -1, im: 0 };
      }
      if (vs.id === acSource.id) {
        acSourceBranchIdx = vIdx;
        B[row] = { re: acVinMag, im: 0 };
      } else {
        // Other independent DC sources have 0 AC small-signal amplitude
        B[row] = { re: 0, im: 0 };
      }
    });

    const solved = solveComplexLinearSystem(Y, B);
    if (!solved.ok) {
      errors.push({
        code: "SINGULAR_MATRIX",
        severity: "ERROR",
        message: `AC sweep failed at f=${freqHz}Hz: ${solved.error}`,
      });
      return {
        converged: false,
        valid: false,
        errors,
        warnings,
        abortedReason: solved.error,
        inputNetId,
        outputNetId,
        frequencies: results,
        netlist,
      };
    }

    const netPhasors: Record<number, ComplexNumber> = { 0: { re: 0, im: 0 } };
    for (let nid = 1; nid < netlist.netCount; nid++) {
      netPhasors[nid] = solved.x[nid - 1];
    }

    const vInPhasor = netPhasors[inputNetId] ?? { re: acVinMag, im: 0 };
    const vOutPhasor = netPhasors[outputNetId] ?? { re: 0, im: 0 };
    const H = cDiv(vOutPhasor, cMag(vInPhasor) > 1e-15 ? vInPhasor : { re: 1, im: 0 });
    const gainMag = cMag(H);
    const gainDb = gainMag > 1e-12 ? 20 * Math.log10(gainMag) : -240;
    const phaseDeg = (Math.atan2(H.im, H.re) * 180) / Math.PI;

    // Input current leaving positive terminal of AC source = -x[numUnknownNodes + acSourceBranchIdx]
    const iBr = solved.x[numUnknownNodes + acSourceBranchIdx] ?? { re: 0, im: 0 };
    const iIn = { re: -iBr.re, im: -iBr.im };
    const iInMag = cMag(iIn);
    const zIn = iInMag > 1e-15 ? cDiv(vInPhasor, iIn) : { re: 1e12, im: 0 };
    const inputImpedanceMag = cMag(zIn);
    const inputImpedancePhaseDeg = (Math.atan2(zIn.im, zIn.re) * 180) / Math.PI;

    // Sinusoidal complex power S = 0.5 * V_peak * conj(I_peak)
    const realPowerW = 0.5 * (vInPhasor.re * iIn.re + vInPhasor.im * iIn.im);
    const reactivePowerVar = 0.5 * (vInPhasor.im * iIn.re - vInPhasor.re * iIn.im);
    const apparentPowerVa = Math.hypot(realPowerW, reactivePowerVar);
    const powerFactor = apparentPowerVa > 1e-15 ? Math.min(1, Math.max(-1, realPowerW / apparentPowerVa)) : 1;

    results.push({
      freqHz,
      omegaRadS: omega,
      vIn: vInPhasor,
      vOut: vOutPhasor,
      gainMag,
      gainDb,
      phaseDeg,
      inputImpedanceMag,
      inputImpedancePhaseDeg,
      realPowerW,
      reactivePowerVar,
      apparentPowerVa,
      powerFactor,
      netPhasors,
    });
  }

  return {
    converged: true,
    valid: true,
    errors,
    warnings,
    inputNetId,
    outputNetId,
    frequencies: results,
    netlist,
  };
}
