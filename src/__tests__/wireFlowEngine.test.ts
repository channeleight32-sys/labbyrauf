import test from "node:test";
import assert from "node:assert/strict";
import type { CircuitNode, CircuitWire } from "../components/CircuitLab";
import { solveCircuitLabAnalog } from "../utils/circuitLabAnalogSolver";
import { analyzeCircuitDiagnostics } from "../utils/openCircuitDetector";
import {
  computeCircuitWireFlows,
  computeCurrentCycleDurationSec,
  computeFrequencyCycleDurationSec,
} from "../utils/wireFlowEngine";

function runFlowForCircuit(
  nodes: CircuitNode[],
  wires: CircuitWire[],
  liveVals: Record<number, number[]>,
  overrides: {
    isSimRunning?: boolean;
    isSimulationHalted?: boolean;
    autoClock?: boolean;
    clockHz?: number;
    measuredPulseHz?: number;
    simSpeed?: number;
  } = {}
) {
  const isSimRunning = overrides.isSimRunning ?? true;
  const analogSolution = solveCircuitLabAnalog(nodes, wires, isSimRunning);
  const diagnosticReport = analyzeCircuitDiagnostics(nodes, wires);
  return computeCircuitWireFlows({
    nodes,
    wires,
    analogSolution,
    liveVals,
    diagnosticReport,
    isSimRunning,
    isSimulationHalted: overrides.isSimulationHalted ?? false,
    autoClock: overrides.autoClock ?? false,
    clockHz: overrides.clockHz ?? 2,
    measuredPulseHz: overrides.measuredPulseHz ?? 0,
    simSpeed: overrides.simSpeed ?? 1,
  });
}

test("SPICE frequency curve strictly increases velocity across 1Hz -> 50Hz -> 10kHz", () => {
  const d1 = computeFrequencyCycleDurationSec(1, 1);
  const d50 = computeFrequencyCycleDurationSec(50, 1);
  const d10k = computeFrequencyCycleDurationSec(10_000, 1);
  assert.ok(d1 > d50, `Expected 1Hz duration (${d1}s) > 50Hz (${d50}s)`);
  assert.ok(d50 > d10k, `Expected 50Hz duration (${d50}s) > 10kHz (${d10k}s)`);
  assert.ok(d10k >= 0.13, `Expected flicker-free lower bound >= 0.13s, got ${d10k}s`);
});

test("DC current curve increases velocity monotonically with SPICE current (mA)", () => {
  const dSlow = computeCurrentCycleDurationSec(0.5, 1);
  const dMid = computeCurrentCycleDurationSec(15, 1);
  const dFast = computeCurrentCycleDurationSec(120, 1);
  assert.ok(dSlow > dMid && dMid > dFast, `Expected monotonic speedup: ${dSlow} > ${dMid} > ${dFast}`);
});

test("AC RC circuit propagates SPICE frequency to series wires and speeds up with Hz", () => {
  const makeRc = (freqHz: number): { nodes: CircuitNode[]; wires: CircuitWire[] } => ({
    nodes: [
      { id: 1, type: "AC_SINE", x: 0, y: 0, analogParams: { acVoltageV: 5, frequencyHz: freqHz } },
      { id: 2, type: "RES", x: 100, y: 0, analogParams: { resistanceOhms: 1000 } },
      { id: 3, type: "CAP_NP", x: 200, y: 0, analogParams: { capacitanceUf: 10 } },
      { id: 4, type: "GND", x: 300, y: 0 },
    ],
    wires: [
      { id: 10, from: { node: 1, port: 0, dir: "out" }, to: { node: 2, port: 0, dir: "in" } },
      { id: 11, from: { node: 2, port: 0, dir: "out" }, to: { node: 3, port: 0, dir: "in" } },
      { id: 12, from: { node: 3, port: 0, dir: "out" }, to: { node: 4, port: 0, dir: "in" } },
    ],
  });

  const low = makeRc(1);
  const high = makeRc(1000);
  const flowsLow = runFlowForCircuit(low.nodes, low.wires, {});
  const flowsHigh = runFlowForCircuit(high.nodes, high.wires, {});

  const w11Low = flowsLow.get(11)!;
  const w11High = flowsHigh.get(11)!;
  assert.equal(w11Low.signalState, "AC_OSCILLATING");
  assert.equal(w11High.signalState, "AC_OSCILLATING");
  assert.equal(w11Low.frequencyHz, 1);
  assert.equal(w11High.frequencyHz, 1000);
  assert.ok(w11High.velocityPxPerSec > w11Low.velocityPxPerSec);
});

test("Open switch enters HIGH_Z cutoff state with zero velocity, closing restores DC_ACTIVE", () => {
  const buildSwitchedDc = (closed: boolean, resistanceOhms: number) => {
    const nodes: CircuitNode[] = [
      { id: 1, type: "BATTERY", x: 0, y: 0, analogParams: { dcVoltageV: 9 } },
      { id: 2, type: "SWITCH_SPST", x: 100, y: 0, value: closed ? 1 : 0 },
      { id: 3, type: "RES", x: 200, y: 0, analogParams: { resistanceOhms } },
      { id: 4, type: "GND", x: 300, y: 0 },
    ];
    const wires: CircuitWire[] = [
      { id: 20, from: { node: 1, port: 0, dir: "out" }, to: { node: 2, port: 0, dir: "in" } },
      { id: 21, from: { node: 2, port: 0, dir: "out" }, to: { node: 3, port: 0, dir: "in" } },
      { id: 22, from: { node: 3, port: 0, dir: "out" }, to: { node: 4, port: 0, dir: "in" } },
      { id: 23, from: { node: 4, port: 0, dir: "out" }, to: { node: 1, port: 1, dir: "out" } },
    ];
    return { nodes, wires };
  };

  const openCircuit = buildSwitchedDc(false, 100);
  const openFlows = runFlowForCircuit(openCircuit.nodes, openCircuit.wires, {});
  assert.equal(openFlows.get(21)!.signalState, "HIGH_Z");
  assert.equal(openFlows.get(21)!.isAnimated, false);
  assert.equal(openFlows.get(21)!.velocityPxPerSec, 0);

  const highR = buildSwitchedDc(true, 10_000);
  const lowR = buildSwitchedDc(true, 100);
  const flowHighR = runFlowForCircuit(highR.nodes, highR.wires, {});
  const flowLowR = runFlowForCircuit(lowR.nodes, lowR.wires, {});

  assert.equal(flowLowR.get(21)!.signalState, "DC_ACTIVE");
  assert.equal(flowLowR.get(21)!.isAnimated, true);
  assert.ok(flowLowR.get(21)!.velocityPxPerSec > flowHighR.get(21)!.velocityPxPerSec);
  // Check BAT(-) -> GND / GND -> BAT(-) polarity consistency (wire 23 goes GND -> BAT(-), conventional current flows GND -> BAT(-), so forward)
  assert.equal(flowLowR.get(23)!.direction, "forward");
});

test("Reversed MNA wiring polarity flips wire flow direction to reverse", () => {
  const nodes: CircuitNode[] = [
    { id: 1, type: "BATTERY", x: 0, y: 0, analogParams: { dcVoltageV: 9 } },
    { id: 2, type: "RES", x: 100, y: 0, analogParams: { resistanceOhms: 200 } },
    { id: 3, type: "GND", x: 200, y: 0 },
  ];
  // Backwards-drawn wire 30 from GND -> RES, and 31 from RES -> BAT(+)
  const wires: CircuitWire[] = [
    { id: 30, from: { node: 3, port: 0, dir: "out" }, to: { node: 2, port: 0, dir: "out" } },
    { id: 31, from: { node: 2, port: 0, dir: "in" }, to: { node: 1, port: 0, dir: "out" } },
    { id: 32, from: { node: 1, port: 1, dir: "out" }, to: { node: 3, port: 0, dir: "in" } },
  ];

  const flows = runFlowForCircuit(nodes, wires, {});
  assert.equal(flows.get(31)!.direction, "reverse");
  assert.equal(flows.get(32)!.direction, "reverse");
});

test("Clock signal state differentiates HIGH pulse vs LOW trough and respects pause", () => {
  const nodes: CircuitNode[] = [
    { id: 1, type: "CLOCK", x: 0, y: 0, value: 1, clockHz: 5 },
    { id: 2, type: "OUTPUT", x: 100, y: 0 },
  ];
  const wires: CircuitWire[] = [
    { id: 40, from: { node: 1, port: 0, dir: "out" }, to: { node: 2, port: 0, dir: "in" } },
  ];

  const highFlows = runFlowForCircuit(nodes, wires, { 1: [1] }, { autoClock: true, clockHz: 5 });
  const lowFlows = runFlowForCircuit(nodes, wires, { 1: [0] }, { autoClock: true, clockHz: 5 });
  const pausedFlows = runFlowForCircuit(nodes, wires, { 1: [1] }, { isSimRunning: false });

  assert.equal(highFlows.get(40)!.signalState, "CLOCK_PULSE");
  assert.equal(highFlows.get(40)!.showBead, true);
  assert.equal(lowFlows.get(40)!.signalState, "CLOCK_PULSE");
  assert.equal(lowFlows.get(40)!.showBead, false);
  assert.ok(highFlows.get(40)!.velocityPxPerSec > lowFlows.get(40)!.velocityPxPerSec);
  assert.equal(pausedFlows.get(40)!.signalState, "PAUSED");
  assert.equal(pausedFlows.get(40)!.isAnimated, false);
});
