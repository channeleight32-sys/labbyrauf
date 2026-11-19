import {
  solveMnaCircuit,
  trySolveMnaCircuit,
  MnaSimulationError,
  type MnaCircuitDefinition,
} from "./simulationEngine";

export interface SimulationUnitTestResult {
  name: string;
  category:
    | "Series Resistors"
    | "Voltage Divider"
    | "MNA Error Handling"
    | "Nonlinear NR / Homotopy";
  passed: boolean;
  expectedSummary: string;
  actualSummary: string;
  errorMagnitude: number;
  details?: string;
}

export interface SimulationTestSuiteReport {
  total: number;
  passed: number;
  failed: number;
  results: SimulationUnitTestResult[];
}

function approxEqual(actual: number, expected: number, tol = 1e-6): boolean {
  return Number.isFinite(actual) && Math.abs(actual - expected) <= tol;
}

/**
 * Test 1: 2-Resistor Series Circuit (10 V, R1 = 1 kΩ, R2 = 1 kΩ)
 * Expected: R_eq = 2000 Ω, I = 5.000 mA, V(R1) = 5.000 V, V(R2) = 5.000 V
 */
export function testSeriesResistorsTwoStage(): SimulationUnitTestResult {
  const circuit: MnaCircuitDefinition = {
    groundNode: "GND",
    elements: [
      { id: "V1", type: "V", nodePos: "N_SRC", nodeNeg: "GND", value: 10 },
      { id: "R1", type: "R", nodePos: "N_SRC", nodeNeg: "N_MID", value: 1000 },
      { id: "R2", type: "R", nodePos: "N_MID", nodeNeg: "GND", value: 1000 },
    ],
  };

  const res = solveMnaCircuit(circuit);
  const r1 = res.elementResults.R1;
  const r2 = res.elementResults.R2;
  const iSeriesMa = r1.currentMa;
  const rEq = res.equivalentResistanceOhm ?? 0;

  const passed =
    res.converged &&
    approxEqual(iSeriesMa, 5.0, 1e-6) &&
    approxEqual(r2.currentMa, 5.0, 1e-6) &&
    approxEqual(r1.voltageDropV, 5.0, 1e-6) &&
    approxEqual(r2.voltageDropV, 5.0, 1e-6) &&
    approxEqual(rEq, 2000.0, 1e-6) &&
    res.maxKclResidualA < 1e-12;

  const errMag = Math.max(
    Math.abs(iSeriesMa - 5.0),
    Math.abs(r1.voltageDropV - 5.0),
    Math.abs(r2.voltageDropV - 5.0),
    Math.abs(rEq - 2000.0)
  );

  return {
    name: "Series Resistors (10 V, R1=1 kΩ, R2=1 kΩ)",
    category: "Series Resistors",
    passed,
    expectedSummary: "Req=2000.00Ω, I=5.0000mA, VR1=5.0000V, VR2=5.0000V",
    actualSummary: `Req=${rEq.toFixed(2)}Ω, I=${iSeriesMa.toFixed(4)}mA, VR1=${r1.voltageDropV.toFixed(4)}V, VR2=${r2.voltageDropV.toFixed(4)}V`,
    errorMagnitude: errMag,
  };
}

/**
 * Test 2: 3-Resistor Series Circuit (12 V, R1 = 100 Ω, R2 = 200 Ω, R3 = 300 Ω)
 * Expected: R_eq = 600 Ω, I = 20.000 mA, VR1 = 2.000 V, VR2 = 4.000 V, VR3 = 6.000 V
 */
export function testSeriesResistorsThreeStage(): SimulationUnitTestResult {
  const circuit: MnaCircuitDefinition = {
    groundNode: "0",
    elements: [
      { id: "V1", type: "V", nodePos: "N1", nodeNeg: "0", value: 12 },
      { id: "R1", type: "R", nodePos: "N1", nodeNeg: "N2", value: 100 },
      { id: "R2", type: "R", nodePos: "N2", nodeNeg: "N3", value: 200 },
      { id: "R3", type: "R", nodePos: "N3", nodeNeg: "0", value: 300 },
    ],
  };

  const res = solveMnaCircuit(circuit);
  const r1 = res.elementResults.R1;
  const r2 = res.elementResults.R2;
  const r3 = res.elementResults.R3;
  const rEq = res.equivalentResistanceOhm ?? 0;

  const passed =
    res.converged &&
    approxEqual(rEq, 600.0, 1e-6) &&
    approxEqual(r1.currentMa, 20.0, 1e-6) &&
    approxEqual(r2.currentMa, 20.0, 1e-6) &&
    approxEqual(r3.currentMa, 20.0, 1e-6) &&
    approxEqual(r1.voltageDropV, 2.0, 1e-6) &&
    approxEqual(r2.voltageDropV, 4.0, 1e-6) &&
    approxEqual(r3.voltageDropV, 6.0, 1e-6);

  const errMag = Math.max(
    Math.abs(r1.currentMa - 20.0),
    Math.abs(r1.voltageDropV - 2.0),
    Math.abs(r2.voltageDropV - 4.0),
    Math.abs(r3.voltageDropV - 6.0)
  );

  return {
    name: "Series Resistors (12 V, 100 Ω + 200 Ω + 300 Ω)",
    category: "Series Resistors",
    passed,
    expectedSummary: "Req=600.00Ω, I=20.0000mA, VR1=2.0000V, VR2=4.0000V, VR3=6.0000V",
    actualSummary: `Req=${rEq.toFixed(2)}Ω, I=${r1.currentMa.toFixed(4)}mA, VR1=${r1.voltageDropV.toFixed(4)}V, VR2=${r2.voltageDropV.toFixed(4)}V, VR3=${r3.voltageDropV.toFixed(4)}V`,
    errorMagnitude: errMag,
  };
}

/**
 * Test 3: Asymmetric Unloaded Voltage Divider (12 V, R1 = 3 kΩ, R2 = 1 kΩ)
 * Expected: V_OUT = V_IN * R2 / (R1 + R2) = 12 * 1000 / 4000 = 3.0000 V, I = 3.0000 mA
 */
export function testVoltageDividerUnloaded(): SimulationUnitTestResult {
  const circuit: MnaCircuitDefinition = {
    groundNode: "GND",
    elements: [
      { id: "VIN", type: "V", nodePos: "N_IN", nodeNeg: "GND", value: 12 },
      { id: "R1", type: "R", nodePos: "N_IN", nodeNeg: "V_OUT", value: 3000 },
      { id: "R2", type: "R", nodePos: "V_OUT", nodeNeg: "GND", value: 1000 },
    ],
  };

  const res = solveMnaCircuit(circuit);
  const vOut = res.nodeVoltages.V_OUT;
  const iDividerMa = res.elementResults.R1.currentMa;
  const expectedVOut = (12 * 1000) / (3000 + 1000); // 3.0 V
  const expectedIMa = (12 / 4000) * 1000; // 3.0 mA

  const passed =
    res.converged &&
    approxEqual(vOut, expectedVOut, 1e-6) &&
    approxEqual(iDividerMa, expectedIMa, 1e-6);

  return {
    name: "Voltage Divider Unloaded (12 V, R1=3 kΩ, R2=1 kΩ)",
    category: "Voltage Divider",
    passed,
    expectedSummary: `V_OUT=${expectedVOut.toFixed(4)}V, I=${expectedIMa.toFixed(4)}mA`,
    actualSummary: `V_OUT=${vOut.toFixed(4)}V, I=${iDividerMa.toFixed(4)}mA`,
    errorMagnitude: Math.max(Math.abs(vOut - expectedVOut), Math.abs(iDividerMa - expectedIMa)),
  };
}

/**
 * Test 4: Loaded Voltage Divider (10 V, R1 = 1 kΩ, R2 = 1 kΩ || R_LOAD = 1 kΩ)
 * Expected: R_lower = 500 Ω, V_OUT = 10 * 500 / 1500 = 3.333333 V, I_R1 = 6.6667 mA, I_R2 = I_RL = 3.3333 mA
 */
export function testVoltageDividerLoaded(): SimulationUnitTestResult {
  const circuit: MnaCircuitDefinition = {
    groundNode: "GND",
    elements: [
      { id: "VIN", type: "V", nodePos: "N_IN", nodeNeg: "GND", value: 10 },
      { id: "R1", type: "R", nodePos: "N_IN", nodeNeg: "V_OUT", value: 1000 },
      { id: "R2", type: "R", nodePos: "V_OUT", nodeNeg: "GND", value: 1000 },
      { id: "RLOAD", type: "R", nodePos: "V_OUT", nodeNeg: "GND", value: 1000 },
    ],
  };

  const res = solveMnaCircuit(circuit);
  const vOut = res.nodeVoltages.V_OUT;
  const iR1Ma = res.elementResults.R1.currentMa;
  const iR2Ma = res.elementResults.R2.currentMa;
  const iRlMa = res.elementResults.RLOAD.currentMa;
  const expectedVOut = 10 / 3;
  const expectedIR1 = (10 / 1500) * 1000;
  const expectedBranch = expectedIR1 / 2;

  const passed =
    res.converged &&
    approxEqual(vOut, expectedVOut, 1e-6) &&
    approxEqual(iR1Ma, expectedIR1, 1e-6) &&
    approxEqual(iR2Ma, expectedBranch, 1e-6) &&
    approxEqual(iRlMa, expectedBranch, 1e-6);

  return {
    name: "Voltage Divider Loaded (10 V, R1=1 kΩ, R2=1 kΩ || R_LOAD=1 kΩ)",
    category: "Voltage Divider",
    passed,
    expectedSummary: `V_OUT=${expectedVOut.toFixed(4)}V, I_R1=${expectedIR1.toFixed(4)}mA, I_RL=${expectedBranch.toFixed(4)}mA`,
    actualSummary: `V_OUT=${vOut.toFixed(4)}V, I_R1=${iR1Ma.toFixed(4)}mA, I_RL=${iRlMa.toFixed(4)}mA`,
    errorMagnitude: Math.max(Math.abs(vOut - expectedVOut), Math.abs(iR1Ma - expectedIR1)),
  };
}

/**
 * Test 5: Error Detection — Missing Ground Reference & Singular Matrix (Floating Island)
 */
export function testMnaErrorDetection(): SimulationUnitTestResult[] {
  // Missing Ground Reference
  const noGnd = trySolveMnaCircuit({
    elements: [
      { id: "V1", type: "V", nodePos: "N_A", nodeNeg: "N_B", value: 9 },
      { id: "R1", type: "R", nodePos: "N_A", nodeNeg: "N_B", value: 1000 },
    ],
  });
  const missingGndOk =
    !noGnd.ok &&
    noGnd.error instanceof MnaSimulationError &&
    noGnd.error.code === "MISSING_GROUND_REFERENCE";

  // Singular Matrix from floating disconnected resistor island
  const floatingIsland = trySolveMnaCircuit({
    groundNode: "GND",
    elements: [
      { id: "V1", type: "V", nodePos: "N_SRC", nodeNeg: "GND", value: 10 },
      { id: "R1", type: "R", nodePos: "N_SRC", nodeNeg: "GND", value: 1000 },
      { id: "R_FLOAT", type: "R", nodePos: "N_ISLAND_A", nodeNeg: "N_ISLAND_B", value: 470 },
    ],
  });
  const singularOk =
    !floatingIsland.ok &&
    floatingIsland.error instanceof MnaSimulationError &&
    floatingIsland.error.code === "SINGULAR_MATRIX" &&
    (floatingIsland.error.matrixSnapshot?.matrixA.length ?? 0) > 0;

  return [
    {
      name: "Missing Ground Reference Detection",
      category: "MNA Error Handling",
      passed: missingGndOk,
      expectedSummary: "Throws MISSING_GROUND_REFERENCE",
      actualSummary: noGnd.ok ? "Unexpectedly succeeded" : `${noGnd.error.code}: ${noGnd.error.title}`,
      errorMagnitude: missingGndOk ? 0 : 1,
    },
    {
      name: "Singular Matrix Detection & MatrixSnapshot (Floating Island)",
      category: "MNA Error Handling",
      passed: singularOk,
      expectedSummary: "Throws SINGULAR_MATRIX with populated matrixSnapshot",
      actualSummary: floatingIsland.ok
        ? "Unexpectedly succeeded"
        : `${floatingIsland.error.code} (rows=${floatingIsland.error.matrixSnapshot?.matrixA.length ?? 0}): ${floatingIsland.error.title}`,
      errorMagnitude: singularOk ? 0 : 1,
    },
  ];
}

/**
 * Test 6: Forward-Biased Shockley Diode + Series Resistor (10 V, R1 = 1 kΩ, D1)
 * Verifies Newton-Raphson convergence with SPICE3 pnjlim thermal limiting,
 * realistic silicon forward drop (0.5V < VD < 0.9V), and exact KVL conservation (VD + VR1 = 10V).
 */
export function testNonlinearShockleyDiodeLoop(): SimulationUnitTestResult {
  const circuit: MnaCircuitDefinition = {
    groundNode: "GND",
    elements: [
      { id: "V1", type: "V", nodePos: "N_IN", nodeNeg: "GND", value: 10 },
      { id: "R1", type: "R", nodePos: "N_IN", nodeNeg: "N_D", value: 1000 },
      {
        id: "D1",
        type: "D",
        nodePos: "N_D",
        nodeNeg: "GND",
        value: 0.7,
        saturationCurrentA: 2.52e-9,
        idealityFactor: 1.752,
      },
    ],
  };

  const res = solveMnaCircuit(circuit);
  const d1 = res.elementResults.D1;
  const r1 = res.elementResults.R1;
  const vD = d1.voltageDropV;
  const vR1 = r1.voltageDropV;
  const kvlSum = vD + vR1;
  const iDiffMa = Math.abs(d1.currentMa - r1.currentMa);

  const passed =
    res.converged &&
    res.maxKclResidualA < 1e-8 &&
    vD > 0.5 &&
    vD < 0.9 &&
    approxEqual(kvlSum, 10.0, 1e-5) &&
    iDiffMa < 1e-4;

  return {
    name: "Nonlinear Diode Loop (10 V, R1=1 kΩ, D1 Silicon)",
    category: "Nonlinear NR / Homotopy",
    passed,
    expectedSummary: "0.5V < VD < 0.9V, VD+VR1=10.000V, ID=IR1, KCL residual < 1e-8 A",
    actualSummary: `strategy=${res.strategyUsed} (${res.iterations} iters), VD=${vD.toFixed(4)}V, ID=${d1.currentMa.toFixed(3)}mA, KVL=${kvlSum.toFixed(5)}V, res=${res.maxKclResidualA.toExponential(1)}A`,
    errorMagnitude: Math.max(Math.abs(kvlSum - 10.0), iDiffMa, res.maxKclResidualA),
  };
}

/**
 * Test 7: NPN BJT Common-Emitter Stage (VCC = 12 V, VBB = 5 V, RB = 43 kΩ, RC = 1 kΩ, β = 100)
 * Expected Forward Active bias: V_BE ≈ 0.7 V -> I_B ≈ (5 - 0.7)/43k ≈ 0.1 mA,
 * I_C ≈ β * I_B ≈ 10 mA, V_C = 12 - I_C * 1k ≈ 2.0 V.
 */
export function testNonlinearNpnBjtCommonEmitter(): SimulationUnitTestResult {
  const circuit: MnaCircuitDefinition = {
    groundNode: "GND",
    elements: [
      { id: "VCC", type: "V", nodePos: "N_VCC", nodeNeg: "GND", value: 12 },
      { id: "VBB", type: "V", nodePos: "N_VBB", nodeNeg: "GND", value: 5 },
      { id: "RB", type: "R", nodePos: "N_VBB", nodeNeg: "N_B", value: 43000 },
      { id: "RC", type: "R", nodePos: "N_VCC", nodeNeg: "N_C", value: 1000 },
      {
        id: "Q1",
        type: "Q",
        nodePos: "N_C",
        nodeNeg: "GND",
        nodeCtrl: "N_B",
        value: 100,
        beta: 100,
        polarity: "NPN",
      },
    ],
  };

  const res = solveMnaCircuit(circuit);
  const vB = res.nodeVoltages.N_B;
  const vC = res.nodeVoltages.N_C;
  const q1 = res.elementResults.Q1;
  const iBMa = (q1.ctrlCurrentA ?? 0) * 1000;
  const iCMa = q1.currentMa;

  const passed =
    res.converged &&
    res.maxKclResidualA < 1e-8 &&
    vB > 0.55 &&
    vB < 0.85 &&
    iBMa > 0.08 &&
    iBMa < 0.12 &&
    iCMa > 8.5 &&
    iCMa < 11.5 &&
    vC > 0.8 &&
    vC < 3.5;

  return {
    name: "NPN BJT Common-Emitter (VCC=12V, VBB=5V, RB=43kΩ, RC=1kΩ, β=100)",
    category: "Nonlinear NR / Homotopy",
    passed,
    expectedSummary: "VBE≈0.7V, IB≈0.10mA, IC≈10.0mA, VC≈2.0V (Forward Active)",
    actualSummary: `strategy=${res.strategyUsed} (${res.iterations} iters), VBE=${vB.toFixed(3)}V, IB=${iBMa.toFixed(3)}mA, IC=${iCMa.toFixed(2)}mA, VC=${vC.toFixed(3)}V`,
    errorMagnitude: Math.max(Math.abs(iCMa - 10.0), Math.abs(vC - 2.0)),
  };
}

/**
 * Executes all automated Series Resistors, Voltage Divider, and MNA Error unit tests.
 */
export function runBaselineMnaTests(): SimulationTestSuiteReport {
  const results: SimulationUnitTestResult[] = [
    testSeriesResistorsTwoStage(),
    testSeriesResistorsThreeStage(),
    testVoltageDividerUnloaded(),
    testVoltageDividerLoaded(),
    ...testMnaErrorDetection(),
    testNonlinearShockleyDiodeLoop(),
    testNonlinearNpnBjtCommonEmitter(),
  ];

  const passed = results.filter((r) => r.passed).length;
  return {
    total: results.length,
    passed,
    failed: results.length - passed,
    results,
  };
}

// Allow direct execution via `npx tsx src/utils/simulationTests.ts`
const isCliExecution =
  typeof process !== "undefined" &&
  Array.isArray(process.argv) &&
  process.argv.some((arg) => arg.includes("simulationTests"));

if (isCliExecution) {
  const report = runBaselineMnaTests();
  console.log("=== Baseline MNA Unit Test Suite (Series Resistors & Voltage Divider) ===");
  for (const r of report.results) {
    console.log(`${r.passed ? "[PASS]" : "[FAIL]"} ${r.name}`);
    console.log(`       Expected: ${r.expectedSummary}`);
    console.log(`       Actual  : ${r.actualSummary} (err=${r.errorMagnitude.toExponential(2)})`);
  }
  console.log(`\nSummary: ${report.passed}/${report.total} Passed, ${report.failed} Failed`);
  if (report.failed > 0 && typeof process !== "undefined") {
    process.exit(1);
  }
}
