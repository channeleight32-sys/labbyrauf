import {
  runNgspiceOperatingPoint,
  runNgspiceTransient,
  runNgspiceAcSweep,
  runTheveninEquivalent,
} from "../utils/ngspiceEngine";
import {
  updateComponentValueInModel,
  runUnifiedCircuitSimulation,
  runUnifiedAcSimulation,
  runUnifiedTransientSimulation,
} from "../utils/circuitModelEngine";
import { CircuitStore } from "../utils/circuitProjectStore";
import { INTERACTIVE_PROJECTS_REGISTRY } from "../data/interactiveProjectsRegistry";
import { projectToCircuitModel } from "../utils/circuitModelEngine";
import { runDigitalEventSimulation } from "../utils/digitalEventSimulator";
import type { AnalogNode, AnalogWire } from "../components/SeriesParallelBuilder";
import type { CircuitNode, CircuitWire } from "../components/CircuitLab";

interface ValidationReportRow {
  testId: string;
  testName: string;
  expected: string;
  actual: string;
  toleranceOrError: string;
  status: "PASS" | "FAIL";
}

const report: ValidationReportRow[] = [];

function record(
  testId: string,
  testName: string,
  passed: boolean,
  expected: string,
  actual: string,
  toleranceOrError: string
) {
  report.push({
    testId,
    testName,
    expected,
    actual,
    toleranceOrError,
    status: passed ? "PASS" : "FAIL",
  });
  const tag = passed ? "[PASS]" : "[FAIL]";
  console.log(`${tag} ${testId} — ${testName}`);
  console.log(`       Expected : ${expected}`);
  console.log(`       Actual   : ${actual}`);
  console.log(`       Error/Tol: ${toleranceOrError}`);
}

function makeSeriesNodesWires(vSrc: number, r1: number, r2: number): {
  nodes: AnalogNode[];
  wires: AnalogWire[];
} {
  const nodes: AnalogNode[] = [
    { id: 1, type: "VS", label: "V1", x: 100, y: 200, orient: "V", value: vSrc },
    { id: 2, type: "R", label: "R1", x: 250, y: 100, orient: "H", value: r1 },
    { id: 3, type: "R", label: "R2", x: 420, y: 200, orient: "V", value: r2 },
    { id: 4, type: "GND", label: "GND", x: 100, y: 340, orient: "V", value: 0 },
  ];
  const wires: AnalogWire[] = [
    { id: 1, from: { node: 1, term: 0 }, to: { node: 2, term: 0 } },
    { id: 2, from: { node: 2, term: 1 }, to: { node: 3, term: 0 } },
    { id: 3, from: { node: 3, term: 1 }, to: { node: 1, term: 1 } },
    { id: 4, from: { node: 1, term: 1 }, to: { node: 4, term: 0 } },
  ];
  return { nodes, wires };
}

function makeParallelNodesWires(vSrc: number, r1: number, r2: number): {
  nodes: AnalogNode[];
  wires: AnalogWire[];
} {
  const nodes: AnalogNode[] = [
    { id: 1, type: "VS", label: "V1", x: 100, y: 200, orient: "V", value: vSrc },
    { id: 2, type: "R", label: "R1", x: 280, y: 200, orient: "V", value: r1 },
    { id: 3, type: "R", label: "R2", x: 440, y: 200, orient: "V", value: r2 },
    { id: 4, type: "GND", label: "GND", x: 100, y: 340, orient: "V", value: 0 },
  ];
  const wires: AnalogWire[] = [
    { id: 1, from: { node: 1, term: 0 }, to: { node: 2, term: 0 } },
    { id: 2, from: { node: 2, term: 0 }, to: { node: 3, term: 0 } },
    { id: 3, from: { node: 1, term: 1 }, to: { node: 2, term: 1 } },
    { id: 4, from: { node: 2, term: 1 }, to: { node: 3, term: 1 } },
    { id: 5, from: { node: 1, term: 1 }, to: { node: 4, term: 0 } },
  ];
  return { nodes, wires };
}

/* ============================================================================
 * TEST A — Series DC Circuit Verification (10V, R1=1kΩ, R2=1kΩ)
 * ============================================================================ */
{
  const { nodes, wires } = makeSeriesNodesWires(10, 1000, 1000);
  const res = runNgspiceOperatingPoint(nodes, wires, undefined, { strictGround: true });
  const r1Tel = res.compTelemetry.get(2)!;
  const r2Tel = res.compTelemetry.get(3)!;
  const iMa = r1Tel.current_mA;
  const req = res.reqOhm ?? 0;
  const kclErrA = res.convergence.kclMaxResidualA;
  const ok =
    res.convergence.converged &&
    Math.abs(req - 2000) < 1e-3 &&
    Math.abs(iMa - 5.0) < 1e-3 &&
    Math.abs(r1Tel.vDrop - 5.0) < 1e-3 &&
    Math.abs(r2Tel.vDrop - 5.0) < 1e-3 &&
    Math.abs(res.totalSourcePowerMw - 50.0) < 1e-2 &&
    kclErrA < 1e-9;

  record(
    "TEST A",
    "Series DC Circuit (10V, R1=1kΩ, R2=1kΩ)",
    ok,
    "Req=2000.00Ω, I=5.000mA, VR1=5.000V, VR2=5.000V, P=50.00mW",
    `Req=${req.toFixed(4)}Ω, I=${iMa.toFixed(4)}mA, VR1=${r1Tel.vDrop.toFixed(4)}V, VR2=${r2Tel.vDrop.toFixed(4)}V, P=${res.totalSourcePowerMw.toFixed(3)}mW`,
    `max|err|=${Math.max(Math.abs(req - 2000), Math.abs(iMa - 5), Math.abs(r1Tel.vDrop - 5)).toExponential(2)} (KCL=${kclErrA.toExponential(2)}A)`
  );
}

/* ============================================================================
 * TEST B — Parallel DC Circuit Verification (10V, R1=1kΩ, R2=1kΩ)
 * ============================================================================ */
{
  const { nodes, wires } = makeParallelNodesWires(10, 1000, 1000);
  const res = runNgspiceOperatingPoint(nodes, wires, undefined, { strictGround: true });
  const vsTel = res.compTelemetry.get(1)!;
  const r1Tel = res.compTelemetry.get(2)!;
  const r2Tel = res.compTelemetry.get(3)!;
  const iTotal = Math.abs(vsTel.current_mA);
  const req = res.reqOhm ?? 0;
  const ok =
    res.convergence.converged &&
    Math.abs(req - 500) < 1e-3 &&
    Math.abs(iTotal - 20.0) < 1e-3 &&
    Math.abs(r1Tel.current_mA - 10.0) < 1e-3 &&
    Math.abs(r2Tel.current_mA - 10.0) < 1e-3 &&
    Math.abs(r1Tel.vDrop - 10.0) < 1e-3;

  record(
    "TEST B",
    "Parallel DC Circuit (10V, R1=1kΩ || R2=1kΩ)",
    ok,
    "Req=500.00Ω, Itotal=20.000mA, IR1=10.000mA, IR2=10.000mA, V=10.000V",
    `Req=${req.toFixed(4)}Ω, Itotal=${iTotal.toFixed(4)}mA, IR1=${r1Tel.current_mA.toFixed(4)}mA, IR2=${r2Tel.current_mA.toFixed(4)}mA, V=${r1Tel.vDrop.toFixed(4)}V`,
    `max|err|=${Math.max(Math.abs(req - 500), Math.abs(iTotal - 20), Math.abs(r1Tel.current_mA - 10)).toExponential(2)}`
  );
}

/* ============================================================================
 * TEST C — Voltage Divider Verification (10V, 1k+1k & 3k+1k)
 * ============================================================================ */
{
  const c1 = makeSeriesNodesWires(10, 1000, 1000);
  const resEq = runNgspiceOperatingPoint(c1.nodes, c1.wires, undefined, { strictGround: true });
  const vMidEq = resEq.getNetVoltage(resEq.getTermNet(3, 0));

  const c2 = makeSeriesNodesWires(10, 3000, 1000);
  const resAsym = runNgspiceOperatingPoint(c2.nodes, c2.wires, undefined, { strictGround: true });
  const vMidAsym = resAsym.getNetVoltage(resAsym.getTermNet(3, 0));

  const ok = Math.abs(vMidEq - 5.0) < 1e-4 && Math.abs(vMidAsym - 2.5) < 1e-4;
  record(
    "TEST C",
    "Voltage Divider Midpoint (10V: 1k/1k & 3k/1k)",
    ok,
    "Vmid(1k,1k)=5.0000V; Vmid(3k,1k)=2.5000V",
    `Vmid(1k,1k)=${vMidEq.toFixed(4)}V; Vmid(3k,1k)=${vMidAsym.toFixed(4)}V`,
    `err1=${Math.abs(vMidEq - 5).toExponential(2)}, err2=${Math.abs(vMidAsym - 2.5).toExponential(2)}`
  );
}

/* ============================================================================
 * TEST D — Component Value Change Response (R1: 1kΩ -> 2kΩ)
 * ============================================================================ */
{
  const { nodes, wires } = makeSeriesNodesWires(10, 2000, 1000);
  const res = runNgspiceOperatingPoint(nodes, wires, undefined, { strictGround: true });
  const r1Tel = res.compTelemetry.get(2)!;
  const r2Tel = res.compTelemetry.get(3)!;
  const req = res.reqOhm ?? 0;
  const expI = 10 / 3; // 3.3333 mA
  const expVR1 = 20 / 3; // 6.6667 V
  const expVR2 = 10 / 3; // 3.3333 V
  const ok =
    res.convergence.converged &&
    Math.abs(req - 3000) < 1e-3 &&
    Math.abs(r1Tel.current_mA - expI) < 1e-3 &&
    Math.abs(r1Tel.vDrop - expVR1) < 1e-3 &&
    Math.abs(r2Tel.vDrop - expVR2) < 1e-3;

  record(
    "TEST D",
    "Dynamic Component Update (R1=1kΩ -> 2kΩ in Series)",
    ok,
    "Req=3000.00Ω, I=3.3333mA, VR1=6.6667V, VR2=3.3333V",
    `Req=${req.toFixed(2)}Ω, I=${r1Tel.current_mA.toFixed(4)}mA, VR1=${r1Tel.vDrop.toFixed(4)}V, VR2=${r2Tel.vDrop.toFixed(4)}V`,
    `max|err|=${Math.max(Math.abs(req - 3000), Math.abs(r1Tel.current_mA - expI), Math.abs(r1Tel.vDrop - expVR1)).toExponential(2)}`
  );
}

/* ============================================================================
 * TEST E — Topology Modification Response (Remove R2 in Series & Parallel)
 * ============================================================================ */
{
  // Parallel branch removal: 10V across 1k || 1k -> remove R2 -> becomes 10V across 1k
  const par = makeParallelNodesWires(10, 1000, 1000);
  const parBefore = runNgspiceOperatingPoint(par.nodes, par.wires, undefined, { strictGround: true });
  const nodesAfterPar = par.nodes.filter((n) => n.id !== 3);
  const wiresAfterPar = par.wires.filter((w) => w.from.node !== 3 && w.to.node !== 3);
  const parAfter = runNgspiceOperatingPoint(nodesAfterPar, wiresAfterPar, undefined, { strictGround: true });

  // Series branch removal: 10V -> R1 -> (removed R2) -> open loop
  const ser = makeSeriesNodesWires(10, 1000, 1000);
  const nodesAfterSer = ser.nodes.filter((n) => n.id !== 3);
  const wiresAfterSer = ser.wires.filter((w) => w.from.node !== 3 && w.to.node !== 3);
  const serAfter = runNgspiceOperatingPoint(nodesAfterSer, wiresAfterSer, undefined, { strictGround: true });
  const serR1Curr = serAfter.compTelemetry.get(2)?.current_mA ?? 0;

  const ok =
    Math.abs((parBefore.reqOhm ?? 0) - 500) < 1e-2 &&
    Math.abs((parAfter.reqOhm ?? 0) - 1000) < 1e-2 &&
    Math.abs(parAfter.compTelemetry.get(1)!.current_mA - 10.0) < 1e-3 &&
    serR1Curr < 1e-6;

  record(
    "TEST E",
    "Component Removal (Parallel & Series Topology Update)",
    ok,
    "Parallel: Req 500Ω->1000Ω, I 20mA->10mA; Series open: I_R1 < 1e-6mA",
    `Parallel: Req ${parBefore.reqOhm?.toFixed(1)}Ω->${parAfter.reqOhm?.toFixed(1)}Ω, I=${parAfter.compTelemetry.get(1)?.current_mA.toFixed(3)}mA; Series open I_R1=${serR1Curr.toExponential(2)}mA`,
    "Exact MNA topological update verified"
  );
}

/* ============================================================================
 * TEST F — RC Transient Charging (10V step, R=1kΩ, C=100µF, τ=0.1s)
 * ============================================================================ */
{
  const rcNodes: AnalogNode[] = [
    { id: 1, type: "VS", label: "VSTEP", x: 100, y: 200, orient: "V", value: 10 },
    { id: 2, type: "R", label: "R1", x: 250, y: 100, orient: "H", value: 1000 },
    { id: 3, type: "C", label: "C1", x: 420, y: 200, orient: "V", value: 100 }, // 100 uF
    { id: 4, type: "GND", label: "GND", x: 100, y: 340, orient: "V", value: 0 },
  ];
  const rcWires: AnalogWire[] = [
    { id: 1, from: { node: 1, term: 0 }, to: { node: 2, term: 0 } },
    { id: 2, from: { node: 2, term: 1 }, to: { node: 3, term: 0 } },
    { id: 3, from: { node: 3, term: 1 }, to: { node: 1, term: 1 } },
    { id: 4, from: { node: 1, term: 1 }, to: { node: 4, term: 0 } },
  ];

  const tran = runNgspiceTransient(rcNodes, rcWires, {
    tStart: 0,
    tStop: 0.5,
    dt: 0.001,
    method: "TRAPEZOIDAL",
    strictGround: true,
    initialCapVoltages: { 3: 0 },
  });

  const idxTau = Math.round(0.1 / 0.001); // t = 0.1s (1 tau)
  const idxEnd = tran.timePointsS.length - 1; // t = 0.5s (5 tau)
  const vcTau = tran.capVoltagesHistory[3][idxTau];
  const vcEnd = tran.capVoltagesHistory[3][idxEnd];
  const exactTau = 10 * (1 - Math.exp(-1)); // 6.321205588
  const exactEnd = 10 * (1 - Math.exp(-5)); // 9.93262053

  // Also test parametric scaling: change C=200uF -> tau=0.2s -> vC(0.2s) should equal 6.3212V
  const rcNodes2 = rcNodes.map((n) => (n.id === 3 ? { ...n, value: 200 } : n));
  const tran2 = runNgspiceTransient(rcNodes2, rcWires, {
    tStart: 0,
    tStop: 0.5,
    dt: 0.001,
    method: "TRAPEZOIDAL",
    strictGround: true,
    initialCapVoltages: { 3: 0 },
  });
  const vc2Tau = tran2.capVoltagesHistory[3][Math.round(0.2 / 0.001)];

  const errTau = Math.abs(vcTau - exactTau);
  const errEnd = Math.abs(vcEnd - exactEnd);
  const ok =
    tran.converged &&
    errTau < 0.005 &&
    errEnd < 0.005 &&
    Math.abs(vc2Tau - exactTau) < 0.005;

  record(
    "TEST F",
    "RC Transient Charging (10V, R=1kΩ, C=100µF, τ=0.1s; Trapezoidal MNA)",
    ok,
    `vC(0.1s)=${exactTau.toFixed(4)}V, vC(0.5s)=${exactEnd.toFixed(4)}V; C=200µF vC(0.2s)=${exactTau.toFixed(4)}V`,
    `vC(0.1s)=${vcTau.toFixed(4)}V, vC(0.5s)=${vcEnd.toFixed(4)}V; C=200µF vC(0.2s)=${vc2Tau.toFixed(4)}V`,
    `err@tau=${errTau.toExponential(2)}V, err@5tau=${errEnd.toExponential(2)}V (<5mV tol)`
  );
}

/* ============================================================================
 * TEST G — RC Transient Discharging (vC(0)=10V, R=1kΩ, C=100µF, Vsrc=0V)
 * ============================================================================ */
{
  const rcDisNodes: AnalogNode[] = [
    { id: 1, type: "VS", label: "VZERO", x: 100, y: 200, orient: "V", value: 0 },
    { id: 2, type: "R", label: "R1", x: 250, y: 100, orient: "H", value: 1000 },
    { id: 3, type: "C", label: "C1", x: 420, y: 200, orient: "V", value: 100 },
    { id: 4, type: "GND", label: "GND", x: 100, y: 340, orient: "V", value: 0 },
  ];
  const rcDisWires: AnalogWire[] = [
    { id: 1, from: { node: 1, term: 0 }, to: { node: 2, term: 0 } },
    { id: 2, from: { node: 2, term: 1 }, to: { node: 3, term: 0 } },
    { id: 3, from: { node: 3, term: 1 }, to: { node: 1, term: 1 } },
    { id: 4, from: { node: 1, term: 1 }, to: { node: 4, term: 0 } },
  ];

  const tran = runNgspiceTransient(rcDisNodes, rcDisWires, {
    tStart: 0,
    tStop: 0.5,
    dt: 0.001,
    method: "TRAPEZOIDAL",
    strictGround: true,
    initialCapVoltages: { 3: 10 },
  });

  const idxTau = Math.round(0.1 / 0.001);
  const idxEnd = tran.timePointsS.length - 1;
  const vcTau = tran.capVoltagesHistory[3][idxTau];
  const vcEnd = tran.capVoltagesHistory[3][idxEnd];
  const exactTau = 10 * Math.exp(-1); // 3.678794
  const exactEnd = 10 * Math.exp(-5); // 0.067379

  const errTau = Math.abs(vcTau - exactTau);
  const errEnd = Math.abs(vcEnd - exactEnd);
  const ok = tran.converged && errTau < 0.005 && errEnd < 0.005;

  record(
    "TEST G",
    "RC Transient Discharging (vC(0)=10V, R=1kΩ, C=100µF, τ=0.1s)",
    ok,
    `vC(0.1s)=${exactTau.toFixed(4)}V, vC(0.5s)=${exactEnd.toFixed(4)}V`,
    `vC(0.1s)=${vcTau.toFixed(4)}V, vC(0.5s)=${vcEnd.toFixed(4)}V`,
    `err@tau=${errTau.toExponential(2)}V, err@5tau=${errEnd.toExponential(2)}V (<5mV tol)`
  );
}

/* ============================================================================
 * TEST H — AC Frequency-Domain Sweep (RC Low-Pass & High-Pass Filter Verification)
 * ============================================================================ */
{
  const rVal = 1000;
  const cValUf = 0.1; // 100 nF => fc = 1/(2*pi*1000*1e-7) = 1591.5494 Hz
  const fcExpected = 1 / (2 * Math.PI * rVal * cValUf * 1e-6);

  const lpfNodes: AnalogNode[] = [
    { id: 1, type: "FG", label: "VIN", x: 100, y: 200, orient: "V", value: 1 },
    { id: 2, type: "R", label: "R1", x: 250, y: 100, orient: "H", value: rVal },
    { id: 3, type: "C", label: "C1", x: 420, y: 200, orient: "V", value: cValUf },
    { id: 4, type: "GND", label: "GND", x: 100, y: 340, orient: "V", value: 0 },
  ];
  const lpfWires: AnalogWire[] = [
    { id: 1, from: { node: 1, term: 0 }, to: { node: 2, term: 0 } },
    { id: 2, from: { node: 2, term: 1 }, to: { node: 3, term: 0 } },
    { id: 3, from: { node: 3, term: 1 }, to: { node: 1, term: 1 } },
    { id: 4, from: { node: 1, term: 1 }, to: { node: 4, term: 0 } },
  ];

  // Sweep with exact decade points centered around fcExpected (including fcExpected and 10*fcExpected)
  const acLpf = runNgspiceAcSweep(lpfNodes, lpfWires, {
    fStart: fcExpected / 100,
    fStop: fcExpected * 100,
    points: 41, // index 20 is exact geometric midpoint = fcExpected! index 30 is 10*fcExpected!
    sweepType: "LOG",
    strictGround: true,
  });
  const ptAtFc = acLpf.frequencies[20];
  const ptAt10Fc = acLpf.frequencies[30];

  // High-Pass flip: VIN -> C1 -> R1 -> GND (probe across R1)
  const hpfNodes: AnalogNode[] = [
    { id: 1, type: "FG", label: "VIN", x: 100, y: 200, orient: "V", value: 1 },
    { id: 2, type: "C", label: "C1", x: 250, y: 100, orient: "H", value: cValUf },
    { id: 3, type: "R", label: "R1", x: 420, y: 200, orient: "V", value: rVal },
    { id: 4, type: "GND", label: "GND", x: 100, y: 340, orient: "V", value: 0 },
  ];
  const hpfWires: AnalogWire[] = [
    { id: 1, from: { node: 1, term: 0 }, to: { node: 2, term: 0 } },
    { id: 2, from: { node: 2, term: 1 }, to: { node: 3, term: 0 } },
    { id: 3, from: { node: 3, term: 1 }, to: { node: 1, term: 1 } },
    { id: 4, from: { node: 1, term: 1 }, to: { node: 4, term: 0 } },
  ];
  const netOutHpf = acLpf.netlist.getTermNet(3, 0);
  const acHpf = runNgspiceAcSweep(hpfNodes, hpfWires, {
    fStart: fcExpected / 100,
    fStop: fcExpected * 100,
    points: 41,
    sweepType: "LOG",
    outputNetId: netOutHpf,
    strictGround: true,
  });
  // Ensure output node on HPF is node across R1 (term 0 of node 3)
  const hpfOutNetId = acHpf.netlist.getTermNet(3, 0);
  const acHpfExact = runNgspiceAcSweep(hpfNodes, hpfWires, {
    fStart: fcExpected / 100,
    fStop: fcExpected * 100,
    points: 41,
    sweepType: "LOG",
    outputNetId: hpfOutNetId,
    strictGround: true,
  });
  const hpfAtFc = acHpfExact.frequencies[20];

  // Change C to 200 nF => fc halves to ~795.77 Hz
  const lpf2x = lpfNodes.map((n) => (n.id === 3 ? { ...n, value: 0.2 } : n));
  const ac2x = runNgspiceAcSweep(lpf2x, lpfWires, {
    fStart: 10,
    fStop: 100000,
    points: 201,
    sweepType: "LOG",
    strictGround: true,
  });
  const closest3db = ac2x.frequencies.reduce((best, cur) =>
    Math.abs(cur.gainDb + 3.0103) < Math.abs(best.gainDb + 3.0103) ? cur : best
  );
  const fcExpected2x = fcExpected / 2;

  const ok =
    acLpf.converged &&
    Math.abs(ptAtFc.gainDb - -3.0103) < 0.05 &&
    Math.abs(ptAtFc.phaseDeg - -45.0) < 0.1 &&
    Math.abs(ptAt10Fc.gainDb - -20.043) < 0.05 &&
    Math.abs(hpfAtFc.gainDb - -3.0103) < 0.05 &&
    Math.abs(hpfAtFc.phaseDeg - 45.0) < 0.1 &&
    Math.abs(closest3db.freqHz - fcExpected2x) / fcExpected2x < 0.03;

  record(
    "TEST H",
    "AC Small-Signal Complex MNA Sweep (RC LPF & HPF fc + parametric C scaling)",
    ok,
    `LPF@fc(${fcExpected.toFixed(1)}Hz): -3.01dB/-45.0°, @10fc: -20.04dB; HPF@fc: -3.01dB/+45.0°; C=200nF fc=${fcExpected2x.toFixed(1)}Hz`,
    `LPF@fc(${ptAtFc.freqHz.toFixed(1)}Hz): ${ptAtFc.gainDb.toFixed(3)}dB/${ptAtFc.phaseDeg.toFixed(2)}°, @10fc: ${ptAt10Fc.gainDb.toFixed(3)}dB; HPF@fc: ${hpfAtFc.gainDb.toFixed(3)}dB/+${hpfAtFc.phaseDeg.toFixed(2)}°; C=200nF fc=${closest3db.freqHz.toFixed(1)}Hz`,
    `gainErr=${Math.abs(ptAtFc.gainDb + 3.0103).toExponential(2)}dB, phaseErr=${Math.abs(ptAtFc.phaseDeg + 45).toExponential(2)}°`
  );
}

/* ============================================================================
 * TEST I — Project Isolation & Reset
 * ============================================================================ */
{
  const store = new CircuitStore({
    presetFactory: {
      hasPreset: (id) => INTERACTIVE_PROJECTS_REGISTRY.some((p) => p.id === id),
      createFreshModel: (id) => {
        const p = INTERACTIVE_PROJECTS_REGISTRY.find((x) => x.id === id);
        return p ? projectToCircuitModel(p) : null;
      },
    },
  });

  const p1Id = INTERACTIVE_PROJECTS_REGISTRY[0].id;
  const p2Id = INTERACTIVE_PROJECTS_REGISTRY[1].id;
  const m1Orig = store.loadProject(p1Id)!;
  const m2Orig = store.loadProject(p2Id)!;

  const r1Comp = m1Orig.components.find((c) => c.type === "RESISTOR")!;
  const origVal = r1Comp.nominalValue;
  const m1Edited = updateComponentValueInModel(m1Orig, r1Comp.id, origVal * 4);
  const sim1Edited = runUnifiedCircuitSimulation(m1Edited);
  const sim2Untouched = runUnifiedCircuitSimulation(m2Orig);
  const sim2Baseline = runUnifiedCircuitSimulation(store.loadProject(p2Id)!);

  // Reset p1 back to factory preset
  const m1Reset = store.loadProject(p1Id)!;
  const sim1Reset = runUnifiedCircuitSimulation(m1Reset);
  const sim1Orig = runUnifiedCircuitSimulation(m1Orig);

  const ok =
    Math.abs(sim1Edited.totalSupplyCurrentMa - sim1Orig.totalSupplyCurrentMa) > 0.05 &&
    Math.abs(sim2Untouched.totalSupplyCurrentMa - sim2Baseline.totalSupplyCurrentMa) < 1e-6 &&
    Math.abs(sim1Reset.totalSupplyCurrentMa - sim1Orig.totalSupplyCurrentMa) < 1e-6 &&
    m1Reset.components.find((c) => c.id === r1Comp.id)!.nominalValue === origVal;

  record(
    "TEST I",
    "Project Isolation & Factory Reset (Independent Models)",
    ok,
    `Edited P1 changes (${sim1Orig.totalSupplyCurrentMa.toFixed(2)}mA->${sim1Edited.totalSupplyCurrentMa.toFixed(2)}mA), P2 invariant, Reset restores ${origVal}Ω`,
    `P2=${sim2Untouched.totalSupplyCurrentMa.toFixed(3)}mA (baseline ${sim2Baseline.totalSupplyCurrentMa.toFixed(3)}mA), Reset P1=${sim1Reset.totalSupplyCurrentMa.toFixed(2)}mA`,
    "Zero cross-project leakage verified"
  );
}

/* ============================================================================
 * TEST J — Error Handling, Nonlinear Diode Newton-Raphson, Thevenin Req & Digital Events
 * ============================================================================ */
{
  // J1: Missing GND strictly rejected
  const noGndNodes: AnalogNode[] = [
    { id: 1, type: "VS", label: "V1", x: 100, y: 100, orient: "V", value: 10 },
    { id: 2, type: "R", label: "R1", x: 250, y: 100, orient: "H", value: 1000 },
  ];
  const noGndWires: AnalogWire[] = [
    { id: 1, from: { node: 1, term: 0 }, to: { node: 2, term: 0 } },
    { id: 2, from: { node: 2, term: 1 }, to: { node: 1, term: 1 } },
  ];
  const noGndRes = runNgspiceOperatingPoint(noGndNodes, noGndWires, undefined, { strictGround: true });
  const hasMissingGnd = noGndRes.validation.errors.some((e) => e.code === "MISSING_GROUND");

  // J2: Negative/zero resistor rejected
  const badVal = makeSeriesNodesWires(10, -50, 1000);
  const badValRes = runNgspiceOperatingPoint(badVal.nodes, badVal.wires, undefined, { strictGround: true });
  const hasInvalidVal = badValRes.validation.errors.some((e) => e.code === "INVALID_VALUE");

  // J3: Unequal voltage source loop conflict rejected
  const conflictNodes: AnalogNode[] = [
    { id: 1, type: "VS", label: "V1", x: 100, y: 100, orient: "V", value: 10 },
    { id: 2, type: "VS", label: "V2", x: 220, y: 100, orient: "V", value: 5 },
    { id: 3, type: "GND", label: "GND", x: 100, y: 240, orient: "V", value: 0 },
  ];
  const conflictWires: AnalogWire[] = [
    { id: 1, from: { node: 1, term: 0 }, to: { node: 2, term: 0 } },
    { id: 2, from: { node: 1, term: 1 }, to: { node: 2, term: 1 } },
    { id: 3, from: { node: 1, term: 1 }, to: { node: 3, term: 0 } },
  ];
  const conflictRes = runNgspiceOperatingPoint(conflictNodes, conflictWires, undefined, { strictGround: true });
  const hasConflictErr =
    !conflictRes.convergence.converged &&
    conflictRes.validation.errors.some((e) => e.code === "VOLTAGE_SOURCE_LOOP" || e.code === "SINGULAR_MATRIX");

  // J4: Nonlinear Silicon Diode + 1kΩ resistor on 5V DC (Shockley Newton-Raphson + pnjlim)
  const diodeNodes: AnalogNode[] = [
    { id: 1, type: "VS", label: "V1", x: 100, y: 200, orient: "V", value: 5 },
    { id: 2, type: "D1N4007", label: "D1", x: 250, y: 100, orient: "H", value: 0.7 },
    { id: 3, type: "R", label: "RL", x: 420, y: 200, orient: "V", value: 1000 },
    { id: 4, type: "GND", label: "GND", x: 100, y: 340, orient: "V", value: 0 },
  ];
  const diodeWires: AnalogWire[] = [
    { id: 1, from: { node: 1, term: 0 }, to: { node: 2, term: 0 } },
    { id: 2, from: { node: 2, term: 1 }, to: { node: 3, term: 0 } },
    { id: 3, from: { node: 3, term: 1 }, to: { node: 1, term: 1 } },
    { id: 4, from: { node: 1, term: 1 }, to: { node: 4, term: 0 } },
  ];
  const diodeRes = runNgspiceOperatingPoint(diodeNodes, diodeWires, undefined, { strictGround: true });
  const dTel = diodeRes.compTelemetry.get(2)!;
  const diodeOk =
    diodeRes.convergence.converged &&
    dTel.vDrop > 0.55 &&
    dTel.vDrop < 0.85 &&
    Math.abs(dTel.current_mA - (5 - dTel.vDrop)) < 0.05;

  // J5: Event-Driven Digital Simulator (NOT 6ns + AND 8ns = 14ns propagation delay & oscillation guard)
  const digNodes: CircuitNode[] = [
    { id: 1, type: "INPUT", label: "A", x: 0, y: 0, value: 0 },
    { id: 2, type: "INPUT", label: "B", x: 0, y: 50, value: 1 },
    { id: 3, type: "NOT", label: "U1", x: 100, y: 0, value: 0, delayNs: 6 },
    { id: 4, type: "AND", label: "U2", x: 200, y: 25, value: 0, delayNs: 8 },
    { id: 5, type: "OUTPUT", label: "Y", x: 300, y: 25, value: 0, delayNs: 1 },
  ];
  const digWires: CircuitWire[] = [
    { id: 1, from: { node: 1, port: 0 }, to: { node: 3, port: 0 } },
    { id: 2, from: { node: 3, port: 0 }, to: { node: 4, port: 0 } },
    { id: 3, from: { node: 2, port: 0 }, to: { node: 4, port: 1 } },
    { id: 4, from: { node: 4, port: 0 }, to: { node: 5, port: 0 } },
  ];
  const digRes = runDigitalEventSimulation(digNodes, digWires, {
    stimuli: [{ timeNs: 100, nodeId: 1, value: 1 }],
  });
  const yDrop = digRes.transitions.find((t) => t.nodeId === 4 && t.timeNs >= 100 && t.nextValue === 0);

  // Ring oscillator (NOT feedback loop) -> detects oscillation cleanly
  const oscNodes: CircuitNode[] = [
    { id: 1, type: "NOT", label: "N1", x: 0, y: 0, value: 0, delayNs: 5 },
    { id: 2, type: "NOT", label: "N2", x: 80, y: 0, value: 0, delayNs: 5 },
    { id: 3, type: "NOT", label: "N3", x: 160, y: 0, value: 0, delayNs: 5 },
  ];
  const oscWires: CircuitWire[] = [
    { id: 1, from: { node: 1, port: 0 }, to: { node: 2, port: 0 } },
    { id: 2, from: { node: 2, port: 0 }, to: { node: 3, port: 0 } },
    { id: 3, from: { node: 3, port: 0 }, to: { node: 1, port: 0 } },
  ];
  const oscRes = runDigitalEventSimulation(oscNodes, oscWires, { maxEvents: 100, maxTimeNs: 5000 });

  // J6: Unified AC & Transient wrappers on CircuitProjectModel + Thevenin 1A R_eq check
  const baseProj = projectToCircuitModel(INTERACTIVE_PROJECTS_REGISTRY[0]);
  const unifiedAc = runUnifiedAcSimulation(baseProj, { fStart: 100, fStop: 10000, points: 5 });
  const unifiedTran = runUnifiedTransientSimulation(baseProj, { tStop: 0.01, dt: 0.001 });

  // Thevenin equivalent of parallel 1k || 1k = 500 Ohm (independent of source removed)
  const parTh = makeParallelNodesWires(10, 1000, 1000);
  const thNoSrcNodes = parTh.nodes.filter((n) => n.type !== "VS");
  const thNoSrcWires = parTh.wires.filter((w) => w.from.node !== 1 && w.to.node !== 1);
  // Anchor bottom rail to GND so net extraction finds both terminals cleanly
  thNoSrcWires.push({ id: 99, from: { node: 2, term: 1 }, to: { node: 4, term: 0 } });
  const thOp = runNgspiceOperatingPoint(thNoSrcNodes, thNoSrcWires, undefined, { strictGround: true });
  const rTh = runTheveninEquivalent(
    thNoSrcNodes,
    thNoSrcWires,
    thOp.getTermNet(2, 0),
    thOp.getTermNet(2, 1)
  );
  const rThOk = rTh !== null && Math.abs(rTh - 500) < 0.1;

  const ok =
    hasMissingGnd &&
    hasInvalidVal &&
    hasConflictErr &&
    diodeOk &&
    digRes.converged &&
    yDrop?.timeNs === 114 &&
    oscRes.oscillationDetected &&
    unifiedAc.converged &&
    unifiedTran.converged &&
    rThOk;

  record(
    "TEST J",
    "Validation Errors, Nonlinear Shockley Diode NR, Thevenin R_th & Digital Events",
    ok,
    "Rejects MISSING_GROUND/INVALID_VALUE/VOLTAGE_SOURCE_LOOP; Diode NR Vd~0.7V; Rth=500Ω; Gate prop=114ns; Ring osc flagged",
    `Errors=[Gnd:${hasMissingGnd}, Val:${hasInvalidVal}, Loop:${hasConflictErr}]; Diode=${dTel.vDrop.toFixed(3)}V/${dTel.current_mA.toFixed(3)}mA; Rth=${rTh?.toFixed(2)}Ω; AND fall=${yDrop?.timeNs}ns; Osc=${oscRes.oscillationDetected}`,
    `Diode KCL residual=${diodeRes.convergence.kclMaxResidualA.toExponential(2)}A`
  );
}

console.log("\n---------------------------------------------------------------------------------------");
const passedCount = report.filter((r) => r.status === "PASS").length;
const failedCount = report.length - passedCount;
console.log(`Validation Suite Summary: ${passedCount}/${report.length} Passed, ${failedCount} Failed`);
if (failedCount > 0) {
  process.exit(1);
}
