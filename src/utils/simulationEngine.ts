/**
 * Modified Nodal Analysis (MNA) & Nonlinear Newton-Raphson Simulation Engine
 *
 * Implements DC operating-point circuit analysis via Modified Nodal Analysis:
 *   [ G(x)   B ] [ v ]   [ i(x) ]
 *   [ C      D ] [ j ] = [  e   ]
 * where:
 *   - G(x) is the (N x N) linearized conductance / Jacobian block
 *   - B is the (N x M) voltage-source incidence matrix (C = B^T, D = 0)
 *   - v are unknown non-ground node voltages (Net 1 .. Net N)
 *   - j are branch currents through the M independent voltage sources
 *   - i(x), e are excitation & nonlinear companion current vectors
 *
 * Linear systems are solved via dense Gaussian elimination with scaled partial pivoting.
 * Nonlinear circuits (diodes, BJTs, MOSFETs) are solved using Newton-Raphson with SPICE3
 * `pnjlim` thermal voltage limiting plus automatic Gmin stepping and Source stepping homotopy
 * continuation fallbacks when direct iteration struggles to converge.
 */

export type MnaComponentType = "R" | "V" | "I" | "D" | "Q" | "BJT" | "M" | "MOS";

export interface MnaCircuitElement {
  id: string;
  type: MnaComponentType;
  /** Positive / first terminal node name (Collector / Drain / Anode / V+) */
  nodePos: string;
  /** Negative / second terminal node name (Emitter / Source / Cathode / V-) */
  nodeNeg: string;
  /** Control terminal node name for 3-terminal devices (Base for BJT, Gate for MOSFET) */
  nodeCtrl?: string;
  /** Primary numeric value: Resistance (Ω) for R, Voltage (V) for V, Current (A) for I, nominal Vf (V) for D, Beta for Q/BJT, Kn (A/V^2) for M/MOS */
  value: number;
  /** Optional SPICE device model parameters for nonlinear semiconductors */
  saturationCurrentA?: number;
  idealityFactor?: number;
  seriesResistanceOhm?: number;
  beta?: number;
  earlyVoltageV?: number;
  vthV?: number;
  knAV2?: number;
  lambdaVInv?: number;
  polarity?: "NPN" | "PNP" | "NMOS" | "PMOS";
}

export interface MnaCircuitDefinition {
  groundNode?: string;
  elements: MnaCircuitElement[];
}

export type MnaErrorCode =
  | "EMPTY_CIRCUIT"
  | "MISSING_GROUND_REFERENCE"
  | "INVALID_COMPONENT"
  | "VOLTAGE_SOURCE_LOOP"
  | "NON_CONVERGENT"
  | "SINGULAR_MATRIX";

export interface MnaMatrixSnapshot {
  variableLabels: string[];
  matrixA: number[][];
  vectorB: number[];
  solutionVectorX?: number[];
  singularRowIndices?: number[];
}

export class MnaSimulationError extends Error {
  public readonly code: MnaErrorCode;
  public readonly title: string;
  public readonly remediation: string[];
  public readonly matrixSnapshot?: MnaMatrixSnapshot;

  constructor(
    code: MnaErrorCode,
    title: string,
    message: string,
    remediation: string[],
    matrixSnapshot?: MnaMatrixSnapshot
  ) {
    super(message);
    this.name = "MnaSimulationError";
    this.code = code;
    this.title = title;
    this.remediation = remediation;
    this.matrixSnapshot = matrixSnapshot;
  }
}

export type ConvergenceStrategy = "LINEAR" | "DIRECT_NR" | "GMIN_STEPPING" | "SOURCE_STEPPING";

export interface MnaNrIterationRecord {
  stage: ConvergenceStrategy;
  iteration: number;
  gminSiemens: number;
  sourceScale: number;
  maxDeltaV: number;
  residualNormA: number;
}

export interface MnaElementResult {
  id: string;
  type: MnaComponentType;
  nodePos: string;
  nodeNeg: string;
  nodeCtrl?: string;
  vPos: number;
  vNeg: number;
  vCtrl?: number;
  /** Voltage drop V(nodePos) - V(nodeNeg) in Volts */
  voltageDropV: number;
  /** Current flowing from nodePos to nodeNeg in Amperes (for V: delivered current out of nodePos) */
  currentA: number;
  /** Current in milliamperes */
  currentMa: number;
  /** Control terminal current (e.g. BJT base current I_B in Amperes) when applicable */
  ctrlCurrentA?: number;
  /** Power dissipated (+) or supplied (-) in Watts */
  powerW: number;
  operatingRegion?: string;
}

export interface MnaEngineResult {
  converged: boolean;
  iterations: number;
  strategyUsed: ConvergenceStrategy;
  gminStepsExecuted: number;
  sourceStepsExecuted: number;
  finalGminSiemens: number;
  finalSourceScale: number;
  groundNode: string;
  nodeNames: string[];
  variableLabels: string[];
  /** Node voltage map in Volts (ground = 0 V) */
  nodeVoltages: Record<string, number>;
  /** Independent voltage source branch currents in Amperes */
  sourceCurrentsA: Record<string, number>;
  /** Per-element voltage, current, and power */
  elementResults: Record<string, MnaElementResult>;
  /** Raw assembled MNA matrix A and excitation vector b */
  matrixA: number[][];
  vectorB: number[];
  solutionVectorX: number[];
  iterationHistory: MnaNrIterationRecord[];
  /** Max KCL residual across all non-ground nodes (Amperes) */
  maxKclResidualA: number;
  /** Equivalent resistance seen by the first voltage source (V / I), null if no active current */
  equivalentResistanceOhm: number | null;
}

const GROUND_ALIASES = new Set(["0", "GND", "GROUND", "COM", "EARTH", "VSS_0V"]);

export function isGroundNodeName(name: string, explicitGround?: string): boolean {
  const clean = name.trim();
  if (explicitGround && clean === explicitGround.trim()) return true;
  return GROUND_ALIASES.has(clean.toUpperCase());
}

/**
 * SPICE3 pnjlim thermal voltage step limiter to prevent exponential overflow
 * during large Newton-Raphson voltage excursions across PN junctions.
 */
function pnjlimVoltage(vNew: number, vOld: number, nVt: number, vCrit: number): number {
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

function isNonlinearElementType(type: MnaComponentType): boolean {
  return type === "D" || type === "Q" || type === "BJT" || type === "M" || type === "MOS";
}

function isThreeTerminalElementType(type: MnaComponentType): boolean {
  return type === "Q" || type === "BJT" || type === "M" || type === "MOS";
}

/**
 * Dense linear system solver A * x = b using Gaussian elimination with scaled partial pivoting.
 * Throws MnaSimulationError("SINGULAR_MATRIX") if the matrix is singular or ill-conditioned.
 */
export function solveGaussianElimination(
  A: number[][],
  b: number[],
  variableLabels?: string[]
): number[] {
  const n = b.length;
  if (n === 0) return [];
  const labels =
    variableLabels && variableLabels.length === n
      ? variableLabels
      : Array.from({ length: n }, (_, i) => `x${i + 1}`);

  if (A.length !== n) {
    throw new MnaSimulationError(
      "SINGULAR_MATRIX",
      "Singular Matrix",
      `MNA dimension mismatch: matrix has ${A.length} rows but RHS has ${n} entries.`,
      ["Verify all components have valid terminal connections."],
      { variableLabels: labels, matrixA: A, vectorB: b }
    );
  }

  const rowScale = new Array<number>(n).fill(0);
  const zeroRows: number[] = [];
  const M: number[][] = A.map((row, i) => {
    if (row.length !== n) {
      throw new MnaSimulationError(
        "SINGULAR_MATRIX",
        "Singular Matrix",
        `Malformed MNA matrix row ${i}.`,
        ["Verify circuit netlist integrity."],
        { variableLabels: labels, matrixA: A, vectorB: b }
      );
    }
    let maxAbs = 0;
    for (let j = 0; j < n; j++) {
      const val = row[j];
      if (!Number.isFinite(val)) {
        throw new MnaSimulationError(
          "SINGULAR_MATRIX",
          "Singular Matrix",
          `Non-finite matrix entry encountered at (${i}, ${j}).`,
          ["Check component values for NaN or Infinity."],
          { variableLabels: labels, matrixA: A, vectorB: b, singularRowIndices: [i] }
        );
      }
      maxAbs = Math.max(maxAbs, Math.abs(val));
    }
    if (!Number.isFinite(b[i])) {
      throw new MnaSimulationError(
        "SINGULAR_MATRIX",
        "Singular Matrix",
        `Non-finite RHS excitation entry at row ${i} (${labels[i]}).`,
        ["Check voltage and current source values."],
        { variableLabels: labels, matrixA: A, vectorB: b, singularRowIndices: [i] }
      );
    }
    if (maxAbs === 0) {
      zeroRows.push(i);
    }
    rowScale[i] = maxAbs;
    return [...row, b[i]];
  });

  if (zeroRows.length > 0) {
    const r0 = zeroRows[0];
    throw new MnaSimulationError(
      "SINGULAR_MATRIX",
      "Singular Matrix (Floating Node)",
      `Zero row detected in MNA matrix at equation ${r0 + 1} (${labels[r0]}): at least one node or subcircuit is completely floating with no DC conductance path.`,
      [
        "Ensure every node has a continuous electrical connection to at least two terminals.",
        "Connect all disconnected/floating components back to the ground reference loop.",
      ],
      {
        variableLabels: labels,
        matrixA: A,
        vectorB: b,
        singularRowIndices: zeroRows,
      }
    );
  }

  // Forward elimination with scaled partial pivoting
  for (let col = 0; col < n; col++) {
    let pivotRow = col;
    let bestScore = 0;
    for (let r = col; r < n; r++) {
      const score = Math.abs(M[r][col]) / Math.max(1e-18, rowScale[r]);
      if (score > bestScore) {
        bestScore = score;
        pivotRow = r;
      }
    }

    if (bestScore < 1e-12 || Math.abs(M[pivotRow][col]) < 1e-15) {
      throw new MnaSimulationError(
        "SINGULAR_MATRIX",
        "Singular Matrix",
        `Gaussian elimination encountered a zero or near-singular pivot at column ${col + 1} (${labels[col]}, scaled ratio=${bestScore.toExponential(2)}). This indicates a floating circuit island or conflicting ideal voltage sources.`,
        [
          "Check for floating/disconnected nodes that lack a DC path to Ground (GND).",
          "Check for ideal voltage sources wired directly in parallel (short-circuit loop).",
          "Ensure switches or open branches do not isolate a capacitive/floating node.",
        ],
        {
          variableLabels: labels,
          matrixA: A,
          vectorB: b,
          singularRowIndices: [col],
        }
      );
    }

    if (pivotRow !== col) {
      const tmp = M[col];
      M[col] = M[pivotRow];
      M[pivotRow] = tmp;
      const sTmp = rowScale[col];
      rowScale[col] = rowScale[pivotRow];
      rowScale[pivotRow] = sTmp;
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

  // Back substitution
  const x = new Array<number>(n).fill(0);
  for (let r = n - 1; r >= 0; r--) {
    let sum = M[r][n];
    for (let c = r + 1; c < n; c++) {
      sum -= M[r][c] * x[c];
    }
    const diag = M[r][r];
    if (!Number.isFinite(diag) || Math.abs(diag) < 1e-15) {
      throw new MnaSimulationError(
        "SINGULAR_MATRIX",
        "Singular Matrix",
        `Zero diagonal encountered during back-substitution at row ${r + 1} (${labels[r]}).`,
        ["Verify every node has a closed resistive/source path to ground."],
        {
          variableLabels: labels,
          matrixA: A,
          vectorB: b,
          singularRowIndices: [r],
        }
      );
    }
    x[r] = sum / diag;
  }

  return x;
}

interface ParsedCircuitContext {
  groundNode: string;
  unknownNodes: string[];
  nodeToIdx: Map<string, number>;
  resistors: MnaCircuitElement[];
  vSources: MnaCircuitElement[];
  iSources: MnaCircuitElement[];
  nonlinearElements: MnaCircuitElement[];
  variableLabels: string[];
  numN: number;
  numM: number;
  dim: number;
}

function parseAndValidateCircuit(circuit: MnaCircuitDefinition): ParsedCircuitContext {
  if (!circuit.elements || circuit.elements.length === 0) {
    throw new MnaSimulationError(
      "EMPTY_CIRCUIT",
      "Empty Circuit",
      "Cannot build MNA equations: circuit has no elements.",
      ["Add at least one voltage source, resistor, and ground reference before simulating."]
    );
  }

  let detectedGround: string | null = null;
  const allNodeNames = new Set<string>();

  for (const el of circuit.elements) {
    if (!Number.isFinite(el.value)) {
      throw new MnaSimulationError(
        "INVALID_COMPONENT",
        "Invalid Component Value",
        `Element "${el.id}" has non-finite value (${el.value}).`,
        ["Enter a valid numeric component value."]
      );
    }
    if (el.type === "R" && el.value <= 0) {
      throw new MnaSimulationError(
        "INVALID_COMPONENT",
        "Invalid Resistance Value",
        `Resistor "${el.id}" has non-positive resistance (${el.value} Ω). Resistance must be > 0 Ω.`,
        ["Set resistor value strictly greater than 0 Ω."]
      );
    }
    const p = el.nodePos.trim();
    const n = el.nodeNeg.trim();
    if (!p || !n) {
      throw new MnaSimulationError(
        "INVALID_COMPONENT",
        "Unconnected Terminal",
        `Element "${el.id}" has an empty terminal net name.`,
        ["Connect both terminals of every component before simulating."]
      );
    }
    allNodeNames.add(p);
    allNodeNames.add(n);
    if (!detectedGround && isGroundNodeName(p, circuit.groundNode)) detectedGround = p;
    if (!detectedGround && isGroundNodeName(n, circuit.groundNode)) detectedGround = n;

    if (isThreeTerminalElementType(el.type)) {
      const ctrl = el.nodeCtrl?.trim();
      if (!ctrl) {
        throw new MnaSimulationError(
          "INVALID_COMPONENT",
          "Unconnected Control Terminal",
          `Three-terminal device "${el.id}" (${el.type}) is missing its Base/Gate nodeCtrl net.`,
          ["Specify nodeCtrl (Base for BJT, Gate for MOSFET) for every transistor."]
        );
      }
      allNodeNames.add(ctrl);
      if (!detectedGround && isGroundNodeName(ctrl, circuit.groundNode)) detectedGround = ctrl;
    }
  }

  if (!detectedGround) {
    throw new MnaSimulationError(
      "MISSING_GROUND_REFERENCE",
      "Missing Ground Reference",
      "Missing Ground Reference: no ground node ('0' or 'GND') is connected in this circuit. MNA cannot establish a 0 V reference potential.",
      [
        "Place a Ground (GND / 0 V) reference node on the schematic.",
        "Wire the negative return rail (e.g. negative terminal of V1) to GND.",
      ]
    );
  }

  const unknownNodes: string[] = [];
  const nodeToIdx = new Map<string, number>();
  for (const nodeName of allNodeNames) {
    if (!isGroundNodeName(nodeName, detectedGround)) {
      nodeToIdx.set(nodeName, unknownNodes.length);
      unknownNodes.push(nodeName);
    }
  }

  const resistors = circuit.elements.filter((el) => el.type === "R");
  const vSources = circuit.elements.filter((el) => el.type === "V");
  const iSources = circuit.elements.filter((el) => el.type === "I");
  const nonlinearElements = circuit.elements.filter((el) => isNonlinearElementType(el.type));

  for (const vs of vSources) {
    const idxPos = nodeToIdx.get(vs.nodePos.trim());
    const idxNeg = nodeToIdx.get(vs.nodeNeg.trim());
    if (idxPos === idxNeg) {
      throw new MnaSimulationError(
        "VOLTAGE_SOURCE_LOOP",
        "Singular Matrix (Shorted Voltage Source)",
        `Voltage source "${vs.id}" has both terminals shorted to the same node ("${vs.nodePos}").`,
        ["Remove the wire shorting the positive and negative terminals of the voltage source."]
      );
    }
  }

  const numN = unknownNodes.length;
  const numM = vSources.length;
  const dim = numN + numM;
  const variableLabels: string[] = [
    ...unknownNodes.map((nm) => `V(${nm})`),
    ...vSources.map((vs) => `I(${vs.id})`),
  ];

  return {
    groundNode: detectedGround,
    unknownNodes,
    nodeToIdx,
    resistors,
    vSources,
    iSources,
    nonlinearElements,
    variableLabels,
    numN,
    numM,
    dim,
  };
}

function stampConductance(
  A: number[][],
  idxA: number | undefined,
  idxB: number | undefined,
  g: number
) {
  if (idxA !== undefined) A[idxA][idxA] += g;
  if (idxB !== undefined) A[idxB][idxB] += g;
  if (idxA !== undefined && idxB !== undefined) {
    A[idxA][idxB] -= g;
    A[idxB][idxA] -= g;
  }
}

function stampCurrent(
  b: number[],
  idxFrom: number | undefined,
  idxTo: number | undefined,
  iFromTo: number
) {
  // Current leaving idxFrom and entering idxTo: KCL sum out = 0 -> subtract from idxFrom, add to idxTo
  if (idxFrom !== undefined) b[idxFrom] -= iFromTo;
  if (idxTo !== undefined) b[idxTo] += iFromTo;
}

function stampVccs(
  A: number[][],
  outPos: number | undefined,
  outNeg: number | undefined,
  ctrlPos: number | undefined,
  ctrlNeg: number | undefined,
  gm: number
) {
  if (outPos !== undefined && ctrlPos !== undefined) A[outPos][ctrlPos] += gm;
  if (outPos !== undefined && ctrlNeg !== undefined) A[outPos][ctrlNeg] -= gm;
  if (outNeg !== undefined && ctrlPos !== undefined) A[outNeg][ctrlPos] -= gm;
  if (outNeg !== undefined && ctrlNeg !== undefined) A[outNeg][ctrlNeg] += gm;
}

interface DiodeEval {
  iTotalA: number;
  gEq: number;
  region: string;
}

function evaluateDiodeJunction(
  vJunction: number,
  el: MnaCircuitElement,
  gmin: number
): DiodeEval {
  const vt = 0.02585;
  const nFactor = Math.max(0.5, el.idealityFactor ?? 1.752);
  const nVt = nFactor * vt;
  // If Is explicitly given use it; else calibrate against nominal Vf (default ~0.7V @ 15mA) or fallback 2.52nA
  let isA = el.saturationCurrentA;
  if (isA === undefined) {
    if (el.value > 0.25 && el.value < 5.0) {
      isA = Math.max(1e-18, 0.015 / Math.max(1, Math.exp(Math.min(35, el.value / nVt)) - 1));
    } else {
      isA = 2.52e-9;
    }
  }
  const arg = Math.min(36, Math.max(-40, vJunction / nVt));
  const expVal = Math.exp(arg);
  const iTotalA = isA * (expVal - 1) + gmin * vJunction;
  const gEq = Math.max(gmin, (isA / nVt) * expVal + gmin);
  const region =
    vJunction >= (el.value > 0.25 ? el.value * 0.7 : 0.45)
      ? `Forward Conducting (V_D=${vJunction.toFixed(3)}V)`
      : vJunction >= -0.05
      ? `Knee / Sub-threshold (V_D=${vJunction.toFixed(3)}V)`
      : `Reverse Biased (V_D=${vJunction.toFixed(3)}V)`;
  return { iTotalA, gEq, region };
}

interface BjtEval {
  iC_A: number;
  iB_A: number;
  iE_A: number;
  gPi: number;
  gMu: number;
  gm: number;
  gO: number;
  region: string;
}

function evaluateBjtEbersMoll(
  vBeRaw: number,
  vBcRaw: number,
  el: MnaCircuitElement,
  gmin: number
): BjtEval {
  const vt = 0.02585;
  const nF = Math.max(0.8, el.idealityFactor ?? 1.0);
  const nVt = nF * vt;
  const isA = el.saturationCurrentA ?? 1e-14;
  const bf = Math.max(1, el.beta ?? (el.value > 1 ? el.value : 100));
  const br = 2.0;
  const va = Math.max(10, el.earlyVoltageV ?? 100);

  const argBe = Math.min(36, Math.max(-40, vBeRaw / nVt));
  const argBc = Math.min(36, Math.max(-40, vBcRaw / nVt));
  const expBe = Math.exp(argBe);
  const expBc = Math.exp(argBc);

  const vCe = vBeRaw - vBcRaw;
  const earlyFactor = 1 + Math.max(0, vCe) / va;

  const iBf = (isA / bf) * (expBe - 1);
  const iBr = (isA / br) * (expBc - 1);
  const iTrans = isA * (expBe - expBc) * earlyFactor;

  const iB_A = iBf + iBr + gmin * (vBeRaw + vBcRaw);
  const iC_A = iTrans - iBr + gmin * vCe;
  const iE_A = -(iC_A + iB_A);

  const gPi = Math.max(gmin, (isA / (bf * nVt)) * expBe + gmin);
  const gMu = Math.max(gmin, (isA / (br * nVt)) * expBc + gmin);
  const gm = Math.max(0, (isA / nVt) * expBe * earlyFactor);
  const gBcTrans = Math.max(0, (isA / nVt) * expBc * earlyFactor);
  const gO = Math.max(gmin, vCe > 0 ? Math.abs(iTrans) / (va + vCe) + gmin : gBcTrans + gmin);

  let region = "Cutoff (OFF)";
  if (vBeRaw >= 0.48 && vBcRaw < 0.45) {
    region = `Forward Active (β=${bf.toFixed(0)}, V_CE=${vCe.toFixed(2)}V)`;
  } else if (vBeRaw >= 0.48 && vBcRaw >= 0.45) {
    region = `Saturation (V_CE=${vCe.toFixed(2)}V)`;
  } else if (vBcRaw >= 0.48 && vBeRaw < 0.45) {
    region = "Reverse Active";
  }

  return { iC_A, iB_A, iE_A, gPi, gMu, gm, gO, region };
}

interface MosEval {
  iD_A: number;
  gm: number;
  gds: number;
  region: string;
}

function evaluateMosfetLevel1(
  vGsRaw: number,
  vDsRaw: number,
  el: MnaCircuitElement,
  gmin: number
): MosEval {
  const isPmos = el.polarity === "PMOS";
  const vthAbs = Math.abs(el.vthV ?? 2.0);
  const kn = Math.max(1e-5, el.knAV2 ?? (el.value > 0 && el.value < 50 ? el.value : 0.04));
  const lambda = Math.max(0, el.lambdaVInv ?? 0.01);

  const vCtrl = isPmos ? -vGsRaw : vGsRaw;
  const vCh = isPmos ? -vDsRaw : vDsRaw;
  const vOv = vCtrl - vthAbs;

  if (vOv <= 0) {
    return {
      iD_A: gmin * vDsRaw,
      gm: 0,
      gds: Math.max(gmin, 1e-9),
      region: "Cutoff (OFF)",
    };
  }

  if (vCh < vOv) {
    // Triode / Linear region
    const iMag = kn * (vOv * vCh - 0.5 * vCh * vCh) * (1 + lambda * Math.max(0, vCh));
    const gm = kn * Math.max(0, vCh);
    const gds = Math.max(gmin, kn * (vOv - vCh) + 1e-6);
    return {
      iD_A: isPmos ? -iMag : iMag,
      gm,
      gds,
      region: "Triode / Ohmic",
    };
  }

  // Saturation region
  const iMag = 0.5 * kn * vOv * vOv * (1 + lambda * Math.max(0, vCh));
  const gm = kn * vOv * (1 + lambda * Math.max(0, vCh));
  const gds = Math.max(gmin, 0.5 * kn * vOv * vOv * lambda + 1e-6);
  return {
    iD_A: isPmos ? -iMag : iMag,
    gm,
    gds,
    region: "Saturation (Pinch-off)",
  };
}

/**
 * Stamps the linearized MNA Jacobian [A] and RHS [b] at state vector `xCurr`
 * with given shunt `gmin` and independent source scale factor `sourceScale`.
 */
function assembleMnaSystemAtState(
  ctx: ParsedCircuitContext,
  xCurr: number[],
  gmin: number,
  sourceScale: number
): { matrixA: number[][]; vectorB: number[] } {
  const { dim, numN, nodeToIdx, resistors, vSources, iSources, nonlinearElements } = ctx;
  const A: number[][] = Array.from({ length: dim }, () => new Array<number>(dim).fill(0));
  const b = new Array<number>(dim).fill(0);

  const getV = (nodeName: string): number => {
    const idx = nodeToIdx.get(nodeName.trim());
    return idx === undefined ? 0 : xCurr[idx] ?? 0;
  };

  // 1. Linear Resistors
  for (const r of resistors) {
    const g = 1 / r.value;
    stampConductance(A, nodeToIdx.get(r.nodePos.trim()), nodeToIdx.get(r.nodeNeg.trim()), g);
  }

  // 2. Independent Current Sources (scaled during source stepping)
  for (const isrc of iSources) {
    stampCurrent(
      b,
      nodeToIdx.get(isrc.nodePos.trim()),
      nodeToIdx.get(isrc.nodeNeg.trim()),
      isrc.value * sourceScale
    );
  }

  // 3. Nonlinear Devices (Diodes, BJTs, MOSFETs) linearized around xCurr
  for (const el of nonlinearElements) {
    const idxPos = nodeToIdx.get(el.nodePos.trim());
    const idxNeg = nodeToIdx.get(el.nodeNeg.trim());
    const idxCtrl = el.nodeCtrl ? nodeToIdx.get(el.nodeCtrl.trim()) : undefined;

    if (el.type === "D") {
      const vDrop = getV(el.nodePos) - getV(el.nodeNeg);
      const ev = evaluateDiodeJunction(vDrop, el, gmin);
      const iEq = ev.iTotalA - ev.gEq * vDrop;
      stampConductance(A, idxPos, idxNeg, ev.gEq);
      stampCurrent(b, idxPos, idxNeg, iEq);
    } else if (el.type === "Q" || el.type === "BJT") {
      // nodePos = C, nodeNeg = E, nodeCtrl = B
      const isPnp = el.polarity === "PNP";
      const vC = getV(el.nodePos);
      const vE = getV(el.nodeNeg);
      const vB = el.nodeCtrl ? getV(el.nodeCtrl) : 0;
      const vBe = isPnp ? vE - vB : vB - vE;
      const vBc = isPnp ? vC - vB : vB - vC;
      const ev = evaluateBjtEbersMoll(vBe, vBc, el, gmin);

      if (!isPnp) {
        // NPN stamps:
        // Base-Emitter diode gPi, Base-Collector diode gMu
        stampConductance(A, idxCtrl, idxNeg, ev.gPi);
        stampConductance(A, idxCtrl, idxPos, ev.gMu);
        // Transconductance gm*(vB - vE) from Collector to Emitter, plus output conductance gO
        stampVccs(A, idxPos, idxNeg, idxCtrl, idxNeg, ev.gm);
        stampConductance(A, idxPos, idxNeg, ev.gO);

        // Equivalent companion currents: I(x_k) - J * x_k
        const iC_lin = ev.gm * vBe + ev.gO * (vC - vE) - ev.gMu * vBc;
        const iB_lin = ev.gPi * vBe + ev.gMu * vBc;
        const iC_comp = ev.iC_A - iC_lin;
        const iB_comp = ev.iB_A - iB_lin;

        // KCL injections: positive current enters terminal from external circuit -> add to outgoing RHS
        if (idxPos !== undefined) b[idxPos] -= iC_comp;
        if (idxCtrl !== undefined) b[idxCtrl] -= iB_comp;
        if (idxNeg !== undefined) b[idxNeg] += iC_comp + iB_comp;
      } else {
        // PNP stamps (symmetric sign inversion):
        stampConductance(A, idxNeg, idxCtrl, ev.gPi);
        stampConductance(A, idxPos, idxCtrl, ev.gMu);
        stampVccs(A, idxNeg, idxPos, idxNeg, idxCtrl, ev.gm);
        stampConductance(A, idxNeg, idxPos, ev.gO);

        const vEc = vE - vC;
        const iE_lin = ev.gm * vBe + ev.gO * vEc + ev.gPi * vBe;
        const iB_lin = -(ev.gPi * vBe + ev.gMu * vBc);
        const iE_comp = (ev.iC_A + ev.iB_A) - iE_lin;
        const iB_comp = -ev.iB_A - iB_lin;
        const iC_comp = -(iE_comp + iB_comp);

        if (idxNeg !== undefined) b[idxNeg] -= iE_comp;
        if (idxCtrl !== undefined) b[idxCtrl] -= iB_comp;
        if (idxPos !== undefined) b[idxPos] -= iC_comp;
      }
    } else if (el.type === "M" || el.type === "MOS") {
      // nodePos = Drain, nodeNeg = Source, nodeCtrl = Gate
      const vD = getV(el.nodePos);
      const vS = getV(el.nodeNeg);
      const vG = el.nodeCtrl ? getV(el.nodeCtrl) : 0;
      const vGs = vG - vS;
      const vDs = vD - vS;
      const ev = evaluateMosfetLevel1(vGs, vDs, el, gmin);

      if (idxCtrl !== undefined) A[idxCtrl][idxCtrl] += Math.max(gmin, 1e-11);
      stampVccs(A, idxPos, idxNeg, idxCtrl, idxNeg, ev.gm);
      stampConductance(A, idxPos, idxNeg, ev.gds);

      const iComp = ev.iD_A - ev.gm * vGs - ev.gds * vDs;
      stampCurrent(b, idxPos, idxNeg, iComp);
    }
  }

  // 4. Gmin node-to-ground stabilization shunt (active > 0 during Gmin stepping / nonlinear solve)
  if (gmin > 0) {
    for (let i = 0; i < numN; i++) {
      A[i][i] += gmin;
    }
  }

  // 5. Independent Voltage Sources (scaled during source stepping)
  vSources.forEach((vs, k) => {
    const mIdx = numN + k;
    const idxPos = nodeToIdx.get(vs.nodePos.trim());
    const idxNeg = nodeToIdx.get(vs.nodeNeg.trim());

    if (idxPos !== undefined) {
      A[idxPos][mIdx] += 1;
      A[mIdx][idxPos] += 1;
    }
    if (idxNeg !== undefined) {
      A[idxNeg][mIdx] -= 1;
      A[mIdx][idxNeg] -= 1;
    }
    b[mIdx] = vs.value * sourceScale;
  });

  return { matrixA: A, vectorB: b };
}

/**
 * Computes ||A*x - b||_inf residual norm for convergence verification.
 */
function computeResidualNorm(A: number[][], b: number[], x: number[]): number {
  let maxRes = 0;
  for (let r = 0; r < b.length; r++) {
    let rowSum = 0;
    for (let c = 0; c < b.length; c++) {
      rowSum += A[r][c] * x[c];
    }
    const diff = Math.abs(rowSum - b[r]);
    if (diff > maxRes) maxRes = diff;
  }
  return maxRes;
}

/**
 * Runs a damped Newton-Raphson inner loop with SPICE3 pnjlim limiting at a fixed
 * `(gmin, sourceScale)` homotopy point, starting from `initialX`.
 */
function runNewtonRaphsonStage(
  ctx: ParsedCircuitContext,
  initialX: number[],
  gmin: number,
  sourceScale: number,
  maxIter: number,
  stage: ConvergenceStrategy,
  history: MnaNrIterationRecord[]
): {
  converged: boolean;
  x: number[];
  matrixA: number[][];
  vectorB: number[];
  iterationsUsed: number;
  lastError?: MnaSimulationError;
} {
  const RELTOL = 1e-5;
  const VNTOL = 1e-6;
  const { numN, dim, nodeToIdx, nonlinearElements, variableLabels } = ctx;

  let xCurr = [...initialX];
  let lastA: number[][] = [];
  let lastB: number[] = [];
  let iters = 0;

  // Track previous diode / BJT junction voltages for SPICE3 pnjlim limiting
  const prevJunctionMap = new Map<string, number>();

  for (let iter = 1; iter <= maxIter; iter++) {
    iters = iter;
    const { matrixA: A, vectorB: b } = assembleMnaSystemAtState(ctx, xCurr, gmin, sourceScale);
    lastA = A;
    lastB = b;

    let xSolved: number[];
    try {
      xSolved = solveGaussianElimination(A, b, variableLabels);
    } catch (err) {
      return {
        converged: false,
        x: xCurr,
        matrixA: lastA,
        vectorB: lastB,
        iterationsUsed: iters,
        lastError: err instanceof MnaSimulationError ? err : undefined,
      };
    }

    // Apply pnjlim thermal voltage limiting & adaptive step damping across non-ground nodes
    const xLimited = [...xSolved];
    for (const el of nonlinearElements) {
      if (el.type === "D") {
        const idxP = nodeToIdx.get(el.nodePos.trim());
        const idxN = nodeToIdx.get(el.nodeNeg.trim());
        const vNew =
          (idxP !== undefined ? xSolved[idxP] : 0) -
          (idxN !== undefined ? xSolved[idxN] : 0);
        const vOld =
          prevJunctionMap.get(el.id) ??
          ((idxP !== undefined ? xCurr[idxP] : 0) -
            (idxN !== undefined ? xCurr[idxN] : 0));
        const nVt = (el.idealityFactor ?? 1.752) * 0.02585;
        const vCrit = nVt * Math.log(nVt / (Math.SQRT2 * (el.saturationCurrentA ?? 2.52e-9)));
        const vLim = pnjlimVoltage(vNew, vOld, nVt, vCrit);
        if (Math.abs(vLim - vNew) > 1e-9) {
          const scale = vNew !== vOld ? (vLim - vOld) / (vNew - vOld) : 1;
          if (idxP !== undefined) xLimited[idxP] = xCurr[idxP] + scale * (xSolved[idxP] - xCurr[idxP]);
          if (idxN !== undefined) xLimited[idxN] = xCurr[idxN] + scale * (xSolved[idxN] - xCurr[idxN]);
        }
        prevJunctionMap.set(el.id, vLim);
      } else if (el.type === "Q" || el.type === "BJT") {
        const idxC = nodeToIdx.get(el.nodePos.trim());
        const idxE = nodeToIdx.get(el.nodeNeg.trim());
        const idxB = el.nodeCtrl ? nodeToIdx.get(el.nodeCtrl.trim()) : undefined;
        const isPnp = el.polarity === "PNP";

        const getPair = (arr: number[], a?: number, bIdx?: number) =>
          (a !== undefined ? arr[a] : 0) - (bIdx !== undefined ? arr[bIdx] : 0);

        const vBeNew = isPnp ? getPair(xSolved, idxE, idxB) : getPair(xSolved, idxB, idxE);
        const vBeOld =
          prevJunctionMap.get(`${el.id}_BE`) ??
          (isPnp ? getPair(xCurr, idxE, idxB) : getPair(xCurr, idxB, idxE));
        const nVt = (el.idealityFactor ?? 1.0) * 0.02585;
        const vCrit = nVt * Math.log(nVt / (Math.SQRT2 * (el.saturationCurrentA ?? 1e-14)));
        const vBeLim = pnjlimVoltage(vBeNew, vBeOld, nVt, vCrit);
        if (Math.abs(vBeLim - vBeNew) > 1e-9 && vBeNew !== vBeOld) {
          const factor = Math.max(0.05, Math.min(1, (vBeLim - vBeOld) / (vBeNew - vBeOld)));
          if (idxB !== undefined) xLimited[idxB] = xCurr[idxB] + factor * (xSolved[idxB] - xCurr[idxB]);
          if (idxE !== undefined) xLimited[idxE] = xCurr[idxE] + factor * (xSolved[idxE] - xCurr[idxE]);
        }
        prevJunctionMap.set(`${el.id}_BE`, vBeLim);

        const vBcNew = isPnp ? getPair(xSolved, idxC, idxB) : getPair(xSolved, idxB, idxC);
        const vBcOld =
          prevJunctionMap.get(`${el.id}_BC`) ??
          (isPnp ? getPair(xCurr, idxC, idxB) : getPair(xCurr, idxB, idxC));
        const vBcLim = pnjlimVoltage(vBcNew, vBcOld, nVt, vCrit);
        if (Math.abs(vBcLim - vBcNew) > 1e-9 && vBcNew !== vBcOld) {
          const factor = Math.max(0.05, Math.min(1, (vBcLim - vBcOld) / (vBcNew - vBcOld)));
          if (idxC !== undefined) xLimited[idxC] = xCurr[idxC] + factor * (xSolved[idxC] - xCurr[idxC]);
        }
        prevJunctionMap.set(`${el.id}_BC`, vBcLim);
      }
    }

    let maxDeltaV = 0;
    for (let i = 0; i < numN; i++) {
      // Light relaxation on later steps to prevent oscillation around piecewise corners
      if (iter > 12 && Math.abs(xLimited[i] - xCurr[i]) > 0.25) {
        xLimited[i] = 0.5 * (xCurr[i] + xLimited[i]);
      }
      maxDeltaV = Math.max(maxDeltaV, Math.abs(xLimited[i] - xCurr[i]));
    }
    for (let i = numN; i < dim; i++) {
      xLimited[i] = xSolved[i];
    }

    xCurr = xLimited;

    const checkEval = assembleMnaSystemAtState(ctx, xCurr, gmin, sourceScale);
    const residualNormA = computeResidualNorm(checkEval.matrixA, checkEval.vectorB, xCurr);

    history.push({
      stage,
      iteration: iter,
      gminSiemens: gmin,
      sourceScale,
      maxDeltaV,
      residualNormA,
    });

    const vMag = Math.max(1, ...xCurr.slice(0, numN).map(Math.abs));
    if (iter > 1 && maxDeltaV <= RELTOL * vMag + VNTOL && residualNormA <= 1e-5) {
      return {
        converged: true,
        x: xCurr,
        matrixA: checkEval.matrixA,
        vectorB: checkEval.vectorB,
        iterationsUsed: iters,
      };
    }
  }

  return {
    converged: false,
    x: xCurr,
    matrixA: lastA,
    vectorB: lastB,
    iterationsUsed: iters,
  };
}

/**
 * Builds an initial MNA matrix [A]{x} = {b} for resistors, voltage sources, and ground references.
 * (Preserved for direct unit inspection of linear circuits.)
 */
export function buildMnaMatrices(circuit: MnaCircuitDefinition): {
  groundNode: string;
  unknownNodes: string[];
  nodeToIdx: Map<string, number>;
  resistors: MnaCircuitElement[];
  vSources: MnaCircuitElement[];
  variableLabels: string[];
  matrixA: number[][];
  vectorB: number[];
} {
  const ctx = parseAndValidateCircuit(circuit);
  const zeros = new Array<number>(ctx.dim).fill(0);
  const { matrixA, vectorB } = assembleMnaSystemAtState(ctx, zeros, 0, 1.0);
  return {
    groundNode: ctx.groundNode,
    unknownNodes: ctx.unknownNodes,
    nodeToIdx: ctx.nodeToIdx,
    resistors: ctx.resistors,
    vSources: ctx.vSources,
    variableLabels: ctx.variableLabels,
    matrixA,
    vectorB,
  };
}

/**
 * Solves linear or nonlinear DC circuits using Modified Nodal Analysis:
 * - Linear circuits ("R", "V", "I"): direct Gaussian elimination with scaled partial pivoting.
 * - Nonlinear circuits ("D", "Q"/"BJT", "M"/"MOS"): Newton-Raphson with SPICE3 `pnjlim` limiting,
 *   automatic Gmin stepping fallback, and automatic Source stepping continuation fallback.
 *
 * Throws MnaSimulationError with attached MnaMatrixSnapshot if unrecoverable singularity occurs.
 */
export function solveMnaCircuit(circuit: MnaCircuitDefinition): MnaEngineResult {
  const ctx = parseAndValidateCircuit(circuit);
  const {
    groundNode,
    unknownNodes,
    nodeToIdx,
    resistors,
    vSources,
    iSources,
    nonlinearElements,
    variableLabels,
    numN,
    dim,
  } = ctx;

  const hasNonlinear = nonlinearElements.length > 0;
  const iterationHistory: MnaNrIterationRecord[] = [];
  let strategyUsed: ConvergenceStrategy = hasNonlinear ? "DIRECT_NR" : "LINEAR";
  let gminStepsExecuted = 0;
  let sourceStepsExecuted = 0;
  let finalGminSiemens = hasNonlinear ? 1e-12 : 0;
  let finalSourceScale = 1.0;

  let x: number[] = new Array<number>(dim).fill(0);
  let finalA: number[][] = [];
  let finalB: number[] = [];
  let converged = false;
  let totalIterations = 0;

  if (!hasNonlinear) {
    const assembled = assembleMnaSystemAtState(ctx, x, 0, 1.0);
    finalA = assembled.matrixA;
    finalB = assembled.vectorB;
    x = solveGaussianElimination(finalA, finalB, variableLabels);
    totalIterations = 1;
    converged = true;
    iterationHistory.push({
      stage: "LINEAR",
      iteration: 1,
      gminSiemens: 0,
      sourceScale: 1.0,
      maxDeltaV: 0,
      residualNormA: computeResidualNorm(finalA, finalB, x),
    });
  } else {
    // Stage 1: Direct Newton-Raphson (Gmin = 1e-12 S, Source Scale = 100%)
    const directRes = runNewtonRaphsonStage(
      ctx,
      new Array<number>(dim).fill(0),
      1e-12,
      1.0,
      50,
      "DIRECT_NR",
      iterationHistory
    );
    totalIterations += directRes.iterationsUsed;
    x = directRes.x;
    finalA = directRes.matrixA;
    finalB = directRes.vectorB;
    converged = directRes.converged;

    // Stage 2: Gmin Stepping Homotopy (sweep Gmin from 1e-2 S logarithmically down to 1e-12 S)
    if (!converged) {
      strategyUsed = "GMIN_STEPPING";
      const gminSchedule = [
        1e-2, 1e-3, 1e-4, 1e-5, 1e-6, 1e-7, 1e-8, 1e-9, 1e-10, 1e-11, 1e-12,
      ];
      let gX = new Array<number>(dim).fill(0);
      let gminChainOk = true;
      for (const gminStep of gminSchedule) {
        gminStepsExecuted++;
        const stepRes = runNewtonRaphsonStage(
          ctx,
          gX,
          gminStep,
          1.0,
          35,
          "GMIN_STEPPING",
          iterationHistory
        );
        totalIterations += stepRes.iterationsUsed;
        gX = stepRes.x;
        finalA = stepRes.matrixA;
        finalB = stepRes.vectorB;
        finalGminSiemens = gminStep;
        if (!stepRes.converged) {
          gminChainOk = false;
          break;
        }
      }
      if (gminChainOk) {
        x = gX;
        converged = true;
      }
    }

    // Stage 3: Source Stepping Homotopy (ramp excitations 0% -> 100% with adaptive bisection)
    if (!converged) {
      strategyUsed = "SOURCE_STEPPING";
      let sX = new Array<number>(dim).fill(0);
      let alpha = 0;
      let stepSize = 0.1;
      let sourceChainOk = true;

      while (alpha < 1.0 - 1e-9) {
        const nextAlpha = Math.min(1.0, alpha + stepSize);
        sourceStepsExecuted++;
        const stepRes = runNewtonRaphsonStage(
          ctx,
          sX,
          1e-10,
          nextAlpha,
          35,
          "SOURCE_STEPPING",
          iterationHistory
        );
        totalIterations += stepRes.iterationsUsed;
        finalA = stepRes.matrixA;
        finalB = stepRes.vectorB;

        if (stepRes.converged) {
          sX = stepRes.x;
          alpha = nextAlpha;
          finalSourceScale = alpha;
          // Gently grow step size back up if converged easily
          if (stepRes.iterationsUsed <= 8) {
            stepSize = Math.min(0.25, stepSize * 1.5);
          }
        } else {
          stepSize *= 0.5;
          if (stepSize < 0.005 || sourceStepsExecuted > 40) {
            sourceChainOk = false;
            break;
          }
        }
      }

      if (sourceChainOk) {
        // Final polish at full source (1.0) and nominal Gmin (1e-12)
        const polishRes = runNewtonRaphsonStage(
          ctx,
          sX,
          1e-12,
          1.0,
          30,
          "SOURCE_STEPPING",
          iterationHistory
        );
        totalIterations += polishRes.iterationsUsed;
        finalA = polishRes.matrixA;
        finalB = polishRes.vectorB;
        finalGminSiemens = 1e-12;
        finalSourceScale = 1.0;
        if (polishRes.converged) {
          x = polishRes.x;
          converged = true;
        }
      }
    }

    if (!converged) {
      throw new MnaSimulationError(
        "NON_CONVERGENT",
        "Nonlinear Solver Convergence Failure",
        `Newton-Raphson failed to converge after Direct NR, Gmin Stepping (${gminStepsExecuted} steps), and Source Stepping (${sourceStepsExecuted} steps).`,
        [
          "Verify diode and transistor polarities and check for missing base/gate bias resistors.",
          "Inspect the Matrix Debug view to identify floating junctions or extreme conductance ratios.",
        ],
        {
          variableLabels,
          matrixA: finalA,
          vectorB: finalB,
          solutionVectorX: x,
        }
      );
    }
  }

  const nodeVoltages: Record<string, number> = { [groundNode]: 0 };
  unknownNodes.forEach((name, idx) => {
    nodeVoltages[name] = x[idx];
  });

  const getV = (nodeName: string): number => {
    const clean = nodeName.trim();
    if (isGroundNodeName(clean, groundNode)) return 0;
    return nodeVoltages[clean] ?? 0;
  };

  const sourceCurrentsA: Record<string, number> = {};
  const elementResults: Record<string, MnaElementResult> = {};

  for (const r of resistors) {
    const vPos = getV(r.nodePos);
    const vNeg = getV(r.nodeNeg);
    const vDrop = vPos - vNeg;
    const iA = vDrop / r.value;
    elementResults[r.id] = {
      id: r.id,
      type: "R",
      nodePos: r.nodePos,
      nodeNeg: r.nodeNeg,
      vPos,
      vNeg,
      voltageDropV: vDrop,
      currentA: iA,
      currentMa: iA * 1000,
      powerW: vDrop * iA,
      operatingRegion: "Ohmic Linear",
    };
  }

  for (const isrc of iSources) {
    const vPos = getV(isrc.nodePos);
    const vNeg = getV(isrc.nodeNeg);
    const vDrop = vPos - vNeg;
    elementResults[isrc.id] = {
      id: isrc.id,
      type: "I",
      nodePos: isrc.nodePos,
      nodeNeg: isrc.nodeNeg,
      vPos,
      vNeg,
      voltageDropV: vDrop,
      currentA: isrc.value,
      currentMa: isrc.value * 1000,
      powerW: -vDrop * isrc.value,
      operatingRegion: "Ideal Current Source",
    };
  }

  for (const el of nonlinearElements) {
    const vPos = getV(el.nodePos);
    const vNeg = getV(el.nodeNeg);
    const vCtrl = el.nodeCtrl ? getV(el.nodeCtrl) : undefined;
    const vDrop = vPos - vNeg;

    if (el.type === "D") {
      const ev = evaluateDiodeJunction(vDrop, el, finalGminSiemens);
      elementResults[el.id] = {
        id: el.id,
        type: "D",
        nodePos: el.nodePos,
        nodeNeg: el.nodeNeg,
        vPos,
        vNeg,
        voltageDropV: vDrop,
        currentA: ev.iTotalA,
        currentMa: ev.iTotalA * 1000,
        powerW: vDrop * ev.iTotalA,
        operatingRegion: ev.region,
      };
    } else if (el.type === "Q" || el.type === "BJT") {
      const isPnp = el.polarity === "PNP";
      const vB = vCtrl ?? 0;
      const vBe = isPnp ? vNeg - vB : vB - vNeg;
      const vBc = isPnp ? vPos - vB : vB - vPos;
      const ev = evaluateBjtEbersMoll(vBe, vBc, el, finalGminSiemens);
      const icMag = isPnp ? -ev.iC_A : ev.iC_A;
      elementResults[el.id] = {
        id: el.id,
        type: el.type,
        nodePos: el.nodePos,
        nodeNeg: el.nodeNeg,
        nodeCtrl: el.nodeCtrl,
        vPos,
        vNeg,
        vCtrl,
        voltageDropV: vDrop,
        currentA: icMag,
        currentMa: icMag * 1000,
        ctrlCurrentA: isPnp ? -ev.iB_A : ev.iB_A,
        powerW: Math.abs(vDrop * ev.iC_A) + Math.abs(vBe * ev.iB_A),
        operatingRegion: ev.region,
      };
    } else if (el.type === "M" || el.type === "MOS") {
      const vGs = (vCtrl ?? 0) - vNeg;
      const ev = evaluateMosfetLevel1(vGs, vDrop, el, finalGminSiemens);
      elementResults[el.id] = {
        id: el.id,
        type: el.type,
        nodePos: el.nodePos,
        nodeNeg: el.nodeNeg,
        nodeCtrl: el.nodeCtrl,
        vPos,
        vNeg,
        vCtrl,
        voltageDropV: vDrop,
        currentA: ev.iD_A,
        currentMa: ev.iD_A * 1000,
        ctrlCurrentA: 0,
        powerW: vDrop * ev.iD_A,
        operatingRegion: ev.region,
      };
    }
  }

  vSources.forEach((vs, k) => {
    const iBranch = x[numN + k];
    // Convention: x[numN + k] leaves + terminal into V-source, so delivered current out of nodePos is -iBranch
    const iDeliveredA = -iBranch;
    const vPos = getV(vs.nodePos);
    const vNeg = getV(vs.nodeNeg);
    const vDrop = vPos - vNeg;
    sourceCurrentsA[vs.id] = iDeliveredA;
    elementResults[vs.id] = {
      id: vs.id,
      type: "V",
      nodePos: vs.nodePos,
      nodeNeg: vs.nodeNeg,
      vPos,
      vNeg,
      voltageDropV: vDrop,
      currentA: iDeliveredA,
      currentMa: iDeliveredA * 1000,
      powerW: vDrop * iDeliveredA,
      operatingRegion: "Ideal DC Voltage Source",
    };
  });

  // Verify KCL residual directly from solved system [A]*{x} - {b} across node equations
  let maxKclResidualA = 0;
  for (let r = 0; r < numN; r++) {
    let rowSum = 0;
    for (let c = 0; c < dim; c++) {
      rowSum += finalA[r][c] * x[c];
    }
    maxKclResidualA = Math.max(maxKclResidualA, Math.abs(rowSum - finalB[r]));
  }

  let equivalentResistanceOhm: number | null = null;
  if (vSources.length === 1 && !hasNonlinear) {
    const vs0 = vSources[0];
    const iDeliv = sourceCurrentsA[vs0.id];
    if (Math.abs(iDeliv) > 1e-12 && Math.abs(vs0.value) > 0) {
      equivalentResistanceOhm = vs0.value / iDeliv;
    }
  }

  return {
    converged,
    iterations: totalIterations,
    strategyUsed,
    gminStepsExecuted,
    sourceStepsExecuted,
    finalGminSiemens,
    finalSourceScale,
    groundNode,
    nodeNames: [groundNode, ...unknownNodes],
    variableLabels,
    nodeVoltages,
    sourceCurrentsA,
    elementResults,
    matrixA: finalA,
    vectorB: finalB,
    solutionVectorX: x,
    iterationHistory,
    maxKclResidualA,
    equivalentResistanceOhm,
  };
}

/**
 * Non-throwing wrapper returning discriminated result for UI error boundaries.
 */
export function trySolveMnaCircuit(
  circuit: MnaCircuitDefinition
):
  | { ok: true; result: MnaEngineResult }
  | { ok: false; error: MnaSimulationError } {
  try {
    const result = solveMnaCircuit(circuit);
    return { ok: true, result };
  } catch (err) {
    if (err instanceof MnaSimulationError) {
      return { ok: false, error: err };
    }
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      error: new MnaSimulationError("SINGULAR_MATRIX", "Simulation Error", msg, [
        "Inspect circuit connections and component values.",
      ]),
    };
  }
}
