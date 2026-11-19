/**
 * Automated Regression & Architectural Synchronization Test Suite
 * Tests Single Source of Truth across CircuitProjectModel, netlists, schematic geometry,
 * topology rewiring, MNA simulation, isolated persistence, and Undo/Redo history.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { INTERACTIVE_PROJECTS_REGISTRY } from "../data/interactiveProjectsRegistry";
import { MASTER_75_LABS } from "../data/master75Labs";
import {
  getInteractiveProjectIdForLab,
  getBuilderPresetNameForLab,
  getCircuitPresetForLab,
} from "../utils/labCircuitPresets";
import {
  projectToCircuitModel,
  getPinWorldPosition,
  addComponentToModel,
  removeComponentFromModel,
  duplicateComponentInModel,
  moveComponentInModel,
  rotateComponentInModel,
  updateComponentValueInModel,
  addConnectionToModel,
  removeConnectionFromModel,
  disconnectPinInModel,
  rewireTopologyInModel,
  validateCircuitGraph,
  runUnifiedCircuitSimulation,
  buildDynamicBOM,
} from "../utils/circuitModelEngine";
import {
  createMemoryStorage,
  saveCircuitProject,
  loadCircuitProject,
  listSavedCircuitProjects,
  deleteSavedCircuitProject,
  duplicateCircuitProject,
  saveBuilderProject,
  loadBuilderProject,
  listBuilderProjects,
  createHistoryState,
  pushHistoryState,
  undoHistoryState,
  redoHistoryState,
} from "../utils/circuitProjectStore";
import { runNgspiceOperatingPoint } from "../utils/ngspiceEngine";

function findProjectOrFail(id: string) {
  const proj = INTERACTIVE_PROJECTS_REGISTRY.find((p) => p.id === id);
  assert.ok(proj, `Expected project "${id}" to exist in INTERACTIVE_PROJECTS_REGISTRY`);
  return proj;
}

// ============================================================================
// Test 1 — Series Circuit Test
// ============================================================================
test("Test 1: Series resistor project produces sequential loop, correct nets, and MNA series telemetry", () => {
  const proj = findProjectOrFail("series_resistor_circuit");
  const model = projectToCircuitModel(proj);

  assert.equal(model.projectId, "series_resistor_circuit");
  assert.equal(model.components.length, 5); // V1, R1(100), R2(200), R3(300), GND1
  assert.equal(model.connections.length, 5);

  const validation = validateCircuitGraph(model.components, model.connections);
  assert.equal(validation.valid, true);
  assert.equal(validation.disconnectedPins.length, 0);
  assert.equal(validation.floatingComponents.length, 0);

  const sim = runUnifiedCircuitSimulation(model);
  // 12V across 100 + 200 + 300 = 600 Ω => I = 20 mA
  assert.ok(sim.reqOhm !== null && Math.abs(sim.reqOhm - 600) < 0.5, `Expected Req≈600Ω, got ${sim.reqOhm}`);
  assert.ok(Math.abs(sim.totalSupplyCurrentMa - 20) < 0.2, `Expected I≈20mA, got ${sim.totalSupplyCurrentMa}`);

  // Intermediate nodes: VCC=12V, SERIES_N1=10V, SERIES_N2=6V, GND=0V
  assert.ok(Math.abs(sim.netVoltages.VCC - 12) < 0.05);
  assert.ok(Math.abs(sim.netVoltages.SERIES_N1 - 10) < 0.05, `Expected SERIES_N1≈10V, got ${sim.netVoltages.SERIES_N1}`);
  assert.ok(Math.abs(sim.netVoltages.SERIES_N2 - 6) < 0.05, `Expected SERIES_N2≈6V, got ${sim.netVoltages.SERIES_N2}`);
  assert.equal(sim.netVoltages.GND, 0);
});

// ============================================================================
// Test 2 — Parallel Circuit Test & Genuine Topology Rewiring
// ============================================================================
test("Test 2: Parallel circuit & SERIES<->PARALLEL topology switching updates connections, nets, and MNA results", () => {
  const parallelProj = findProjectOrFail("parallel_resistor_circuit");
  const parModel = projectToCircuitModel(parallelProj);
  const parSim = runUnifiedCircuitSimulation(parModel);

  // 12V across 100 || 200 || 300 Ω => 1/Req = 1/100 + 1/200 + 1/300 = 11/600 => Req = 54.545 Ω, I = 220 mA
  const expectedParReq = 600 / 11;
  assert.ok(
    parSim.reqOhm !== null && Math.abs(parSim.reqOhm - expectedParReq) < 0.5,
    `Expected Parallel Req≈54.55Ω, got ${parSim.reqOhm}`
  );
  assert.ok(
    Math.abs(parSim.totalSupplyCurrentMa - 220) < 0.5,
    `Expected Parallel I≈220mA, got ${parSim.totalSupplyCurrentMa}`
  );

  // Now take the series model and genuinely switch topology to PARALLEL, COMBINATION, and back to SERIES
  const seriesProj = findProjectOrFail("series_resistor_circuit");
  const origSeries = projectToCircuitModel(seriesProj);

  const rewiredParallel = rewireTopologyInModel(origSeries, "PARALLEL", origSeries);
  assert.equal(rewiredParallel.topology, "PARALLEL");
  assert.notDeepEqual(rewiredParallel.connections, origSeries.connections);
  const rewiredParSim = runUnifiedCircuitSimulation(rewiredParallel);
  assert.ok(
    rewiredParSim.reqOhm !== null && Math.abs(rewiredParSim.reqOhm - expectedParReq) < 0.5,
    `Rewired parallel Req mismatch: ${rewiredParSim.reqOhm}`
  );
  assert.ok(Math.abs(rewiredParSim.totalSupplyCurrentMa - 220) < 0.5);

  const rewiredCombo = rewireTopologyInModel(rewiredParallel, "COMBINATION", origSeries);
  assert.equal(rewiredCombo.topology, "COMBINATION");
  // R1(100) + (R2(200) || R3(300)) = 100 + 120 = 220 Ω => I = 12 / 220 = 54.545 mA
  const comboSim = runUnifiedCircuitSimulation(rewiredCombo);
  assert.ok(comboSim.reqOhm !== null && Math.abs(comboSim.reqOhm - 220) < 0.5, `Expected Combo Req=220Ω, got ${comboSim.reqOhm}`);

  const backToSeries = rewireTopologyInModel(rewiredCombo, "SERIES", origSeries);
  const backSeriesSim = runUnifiedCircuitSimulation(backToSeries);
  assert.ok(backSeriesSim.reqOhm !== null && Math.abs(backSeriesSim.reqOhm - 600) < 0.5);
  assert.ok(Math.abs(backSeriesSim.totalSupplyCurrentMa - 20) < 0.2);

  // Switching to ORIGINAL restores exact original netlist
  const backOrig = rewireTopologyInModel(rewiredParallel, "ORIGINAL", origSeries);
  assert.equal(backOrig.connections.length, origSeries.connections.length);
  assert.equal(backOrig.topology, "ORIGINAL");
});

// ============================================================================
// Test 3 — Component Removal Test
// ============================================================================
test("Test 3: Removing a component deletes its schematic instance, purges attached wires, and updates MNA simulation", () => {
  // Removing R2 from series breaks the loop => I_supply drops to 0 mA and validation detects disconnected pins
  const seriesModel = projectToCircuitModel(findProjectOrFail("series_resistor_circuit"));
  const afterRemoveSeries = removeComponentFromModel(seriesModel, "R2");
  assert.equal(afterRemoveSeries.components.length, seriesModel.components.length - 1);
  assert.equal(afterRemoveSeries.components.some((c) => c.id === "R2"), false);
  assert.equal(
    afterRemoveSeries.connections.some((w) => w.sourceComponentId === "R2" || w.targetComponentId === "R2"),
    false
  );
  const brokenSim = runUnifiedCircuitSimulation(afterRemoveSeries);
  assert.ok(brokenSim.totalSupplyCurrentMa < 0.01, `Series loop broken must yield ~0mA, got ${brokenSim.totalSupplyCurrentMa}`);
  assert.ok(brokenSim.validation.disconnectedPins.length > 0 || brokenSim.validation.floatingComponents.length > 0);

  // Removing R2 (200 Ω) from parallel drops branch current by 12V/200Ω = 60 mA => 220 - 60 = 160 mA
  const parallelModel = projectToCircuitModel(findProjectOrFail("parallel_resistor_circuit"));
  const afterRemoveParallel = removeComponentFromModel(parallelModel, "R2");
  assert.equal(afterRemoveParallel.components.length, parallelModel.components.length - 1);
  const parAfterSim = runUnifiedCircuitSimulation(afterRemoveParallel);
  // 100 || 300 = 75 Ω => I = 12 / 75 = 160 mA
  assert.ok(parAfterSim.reqOhm !== null && Math.abs(parAfterSim.reqOhm - 75) < 0.5, `Expected 75Ω, got ${parAfterSim.reqOhm}`);
  assert.ok(Math.abs(parAfterSim.totalSupplyCurrentMa - 160) < 0.5, `Expected 160mA, got ${parAfterSim.totalSupplyCurrentMa}`);
});

// ============================================================================
// Test 4 — Component Addition Test
// ============================================================================
test("Test 4: Adding a component assigns unique ID/refDes, wires into active nets, and updates schematic & simulation", () => {
  const simpleModel = projectToCircuitModel(findProjectOrFail("simple_resistor_circuit"));
  const beforeSim = runUnifiedCircuitSimulation(simpleModel);
  // 9V / 470Ω ≈ 19.149 mA
  assert.ok(Math.abs(beforeSim.totalSupplyCurrentMa - 9000 / 470) < 0.2);

  // Add a 470 Ω resistor in parallel across supply rails
  const { model: afterAdd, addedComponent } = addComponentToModel(simpleModel, {
    type: "RESISTOR",
    nominalValue: 470,
    autoWire: true,
  });

  assert.equal(afterAdd.components.length, simpleModel.components.length + 1);
  assert.equal(addedComponent.refDes, "R2");
  assert.notEqual(addedComponent.id, "R1");
  assert.equal(afterAdd.connections.length, simpleModel.connections.length + 2);
  assert.equal(afterAdd.metadata.isModified, true);

  const afterSim = runUnifiedCircuitSimulation(afterAdd);
  // 470 || 470 = 235 Ω => 9V / 235Ω ≈ 38.298 mA
  assert.ok(afterSim.reqOhm !== null && Math.abs(afterSim.reqOhm - 235) < 0.5, `Expected Req≈235Ω, got ${afterSim.reqOhm}`);
  assert.ok(Math.abs(afterSim.totalSupplyCurrentMa - 9000 / 235) < 0.3);
});

// ============================================================================
// Test 5 — Component Value / Property Change Test
// ============================================================================
test("Test 5: Updating resistor nominal value updates formatted displayValue and live MNA simulation", () => {
  const seriesModel = projectToCircuitModel(findProjectOrFail("series_resistor_circuit"));
  // Change R1 from 100Ω to 1000Ω => Total R = 1000 + 200 + 300 = 1500 Ω, I = 12 / 1500 = 8 mA
  const updated = updateComponentValueInModel(seriesModel, "R1", 1000);
  const r1 = updated.components.find((c) => c.id === "R1");
  assert.ok(r1);
  assert.equal(r1.nominalValue, 1000);
  assert.equal(r1.displayValue, "1 kΩ");
  assert.equal(updated.metadata.isModified, true);

  const sim = runUnifiedCircuitSimulation(updated);
  assert.ok(sim.reqOhm !== null && Math.abs(sim.reqOhm - 1500) < 0.5, `Expected 1500Ω, got ${sim.reqOhm}`);
  assert.ok(Math.abs(sim.totalSupplyCurrentMa - 8) < 0.1, `Expected 8mA, got ${sim.totalSupplyCurrentMa}`);
});

// ============================================================================
// Test 6 — Project Isolation Test
// ============================================================================
test("Test 6: Editing Project A never leaks components, values, or connections into Project B", () => {
  const storage = createMemoryStorage();
  const modelA = projectToCircuitModel(findProjectOrFail("series_resistor_circuit"));
  const modelB = projectToCircuitModel(findProjectOrFail("voltage_divider_circuit"));

  // Deeply edit Project A: remove R3, change R1=1000, add capacitor, switch topology
  let editedA = removeComponentFromModel(modelA, "R3");
  editedA = updateComponentValueInModel(editedA, "R1", 1000);
  editedA = addComponentToModel(editedA, { type: "CAPACITOR", nominalValue: 47, autoWire: false }).model;

  saveCircuitProject(editedA, storage);
  saveCircuitProject(modelB, storage);

  const reloadedA = loadCircuitProject("series_resistor_circuit", storage);
  const reloadedB = loadCircuitProject("voltage_divider_circuit", storage);

  assert.ok(reloadedA && reloadedB);
  assert.notEqual(reloadedA.circuitId, reloadedB.circuitId);
  assert.equal(reloadedA.components.some((c) => c.id === "R3"), false);
  assert.equal(reloadedA.components.find((c) => c.id === "R1")?.nominalValue, 1000);

  // Project B must remain 100% untouched voltage divider (10V, R1=10k, R2=10k, TP_VOUT, GND1)
  assert.equal(reloadedB.components.length, 5);
  assert.equal(reloadedB.components.find((c) => c.id === "R1")?.nominalValue, 10000);
  assert.equal(reloadedB.components.find((c) => c.id === "R2")?.nominalValue, 10000);
  const simB = runUnifiedCircuitSimulation(reloadedB);
  assert.ok(Math.abs(simB.netVoltages.V_DIV_OUT - 5.0) < 0.05);
});

// ============================================================================
// Test 7 — Save and Reload Persistence Test
// ============================================================================
test("Test 7: Saving, reloading, duplicating, listing, and deleting custom CircuitProjectModel persists faithfully", () => {
  const storage = createMemoryStorage();
  let model = projectToCircuitModel(findProjectOrFail("voltage_divider_circuit"));
  model = moveComponentInModel(model, "R2", { x: 420, y: 310 });
  model = rotateComponentInModel(model, "R2", 90);
  model = updateComponentValueInModel(model, "R2", 30000);

  assert.equal(model.metadata.isModified, true);
  const saved = saveCircuitProject(model, storage);
  assert.equal(saved.metadata.isModified, false);

  const loaded = loadCircuitProject("voltage_divider_circuit", storage);
  assert.ok(loaded);
  assert.equal(loaded.components.find((c) => c.id === "R2")?.position.x, 420);
  assert.equal(loaded.components.find((c) => c.id === "R2")?.position.y, 310);
  assert.equal(loaded.components.find((c) => c.id === "R2")?.orientation, 180);
  assert.equal(loaded.components.find((c) => c.id === "R2")?.nominalValue, 30000);

  // Duplicate into an isolated custom project
  const dup = duplicateCircuitProject(loaded, "Voltage Divider 3:1 Custom", storage);
  assert.notEqual(dup.projectId, loaded.projectId);
  assert.equal(dup.name, "Voltage Divider 3:1 Custom");
  assert.equal(dup.metadata.isCustom, true);

  const list = listSavedCircuitProjects(storage);
  assert.equal(list.length, 2);

  assert.equal(deleteSavedCircuitProject(dup.projectId, storage), true);
  assert.equal(loadCircuitProject(dup.projectId, storage), null);
});

// ============================================================================
// Test 8 — Simulation Consistency, Rotated Pin Geometry & Direct Short Validation
// ============================================================================
test("Test 8: Simulation honors pin rewiring, rotated pin geometry transforms accurately, and shorts trigger validation error", () => {
  // 8a: Verify 90/180/270 pin rotation math matches horizontal/vertical SVG leads
  const probeComp = {
    type: "RESISTOR" as const,
    position: { x: 300, y: 200 },
    orientation: 0 as const,
  };
  assert.deepEqual(getPinWorldPosition(probeComp, "1"), { x: 270, y: 200 });
  assert.deepEqual(getPinWorldPosition(probeComp, "2"), { x: 330, y: 200 });
  assert.deepEqual(getPinWorldPosition({ ...probeComp, orientation: 90 }, "1"), { x: 300, y: 170 });
  assert.deepEqual(getPinWorldPosition({ ...probeComp, orientation: 90 }, "2"), { x: 300, y: 230 });
  assert.deepEqual(getPinWorldPosition({ ...probeComp, orientation: 180 }, "1"), { x: 330, y: 200 });
  assert.deepEqual(getPinWorldPosition({ ...probeComp, orientation: 270 }, "1"), { x: 300, y: 230 });

  // 8b: Wire disconnect + custom pin-to-pin rewiring alters electrical output
  let model = projectToCircuitModel(findProjectOrFail("voltage_divider_circuit"));
  // Change R1=1k, R2=2k on 10V => V_DIV_OUT = 6.667V
  model = updateComponentValueInModel(model, "R1", 1000);
  model = updateComponentValueInModel(model, "R2", 2000);
  let sim = runUnifiedCircuitSimulation(model);
  assert.ok(Math.abs(sim.netVoltages.V_DIV_OUT - (10 * 2) / 3) < 0.05);

  // Disconnect R2 pin 2 from GND => open divider bottom => V_DIV_OUT rises to ~10V and current drops to ~0
  model = disconnectPinInModel(model, "R2", "2");
  sim = runUnifiedCircuitSimulation(model);
  assert.ok(sim.validation.disconnectedPins.some((p) => p.componentId === "R2" && p.pinId === "2"));
  assert.ok(sim.totalSupplyCurrentMa < 0.05);

  // Add a direct short wire across V1+ and V1- => validation catches SHORT_CIRCUIT
  const shorted = addConnectionToModel(model, "V1", "+", "GND1", "GND");
  assert.equal(shorted.connections.length, model.connections.length + 1);
  assert.ok(
    validateCircuitGraph(shorted.components, shorted.connections).errors.some(
      (e) => e.code === "SHORT_CIRCUIT"
    )
  );
  // Deleting the short wire clears the SHORT_CIRCUIT error
  const lastWireId = shorted.connections[shorted.connections.length - 1].id;
  const unshorted = removeConnectionFromModel(shorted, lastWireId);
  assert.equal(
    validateCircuitGraph(unshorted.components, unshorted.connections).errors.some(
      (e) => e.code === "SHORT_CIRCUIT"
    ),
    false
  );
});

// ============================================================================
// Test 9 — Multiple Distinct Examples & All 75 Lab Routing Test
// ============================================================================
test("Test 9: All 19 built-in projects have distinct circuit models/schematics and all 75 labs map cleanly", () => {
  assert.equal(INTERACTIVE_PROJECTS_REGISTRY.length, 19);

  const ids = new Set<string>();
  const signatures = new Set<string>();

  for (const proj of INTERACTIVE_PROJECTS_REGISTRY) {
    assert.equal(ids.has(proj.id), false, `Duplicate project ID: ${proj.id}`);
    ids.add(proj.id);

    const model = projectToCircuitModel(proj);
    assert.ok(model.components.length >= 3, `${proj.id} should have at least 3 components`);
    assert.ok(model.connections.length >= 2, `${proj.id} should have at least 2 connections`);
    assert.ok(model.nets.length >= 2, `${proj.id} should produce at least 2 nets`);

    const sig =
      model.components.map((c) => `${c.type}:${c.nominalValue}`).sort().join("|") +
      "::" +
      model.connections.length +
      "::" +
      model.simulationConfig.supplyVoltage;
    assert.equal(
      signatures.has(sig),
      false,
      `Project ${proj.id} shares identical structural signature with another project: ${sig}`
    );
    signatures.add(sig);

    const sim = runUnifiedCircuitSimulation(model, { legacyFallbackProject: proj });
    assert.ok(sim.metrics.length > 0, `${proj.id} simulation must return metrics`);
    assert.ok(sim.waveforms.length > 0, `${proj.id} simulation must return waveforms`);
  }

  // Verify every one of the 75 labs maps to valid InteractiveProject, LabCircuitPreset, and non-collapsed Builder presets
  const mappedProjectIds = new Set<string>();
  const mappedBuilderNames = new Set<string>();
  for (const lab of MASTER_75_LABS) {
    const pid = getInteractiveProjectIdForLab(lab.id);
    assert.ok(ids.has(pid), `Lab ${lab.id} routed to unknown project "${pid}"`);
    mappedProjectIds.add(pid);

    const preset = getCircuitPresetForLab(lab.id);
    assert.ok(preset.nodes.length >= 3 && preset.wires.length >= 2);

    const bName = getBuilderPresetNameForLab(lab.id);
    assert.ok(bName.length > 0);
    mappedBuilderNames.add(bName);
  }
  assert.ok(mappedProjectIds.size >= 14, `Expected broad project routing coverage, got ${mappedProjectIds.size}`);
  assert.ok(mappedBuilderNames.size >= 12, `Expected broad builder preset coverage, got ${mappedBuilderNames.size}`);
});

// ============================================================================
// Test 10 — Undo/Redo History, Dynamic BOM, Builder Isolation & Legacy Solver Compatibility
// ============================================================================
test("Test 10: Undo/Redo restores exact model snapshots, BOM updates dynamically, Builder store isolates records, and MNA engine stays intact", () => {
  const initial = projectToCircuitModel(findProjectOrFail("simple_resistor_circuit"));
  let history = createHistoryState(initial);

  // Edit 1: Add component -> Edit 2: Duplicate component -> Edit 3: Update value
  const step1 = addComponentToModel(history.present, { type: "RESISTOR", nominalValue: 220, autoWire: true }).model;
  history = pushHistoryState(history, step1);

  const dupRes = duplicateComponentInModel(history.present, "R1");
  assert.ok(dupRes.duplicatedComponent);
  history = pushHistoryState(history, dupRes.model);

  const step3 = updateComponentValueInModel(history.present, "R1", 2200);
  history = pushHistoryState(history, step3);

  assert.equal(history.present.components.length, initial.components.length + 2);
  assert.equal(history.present.components.find((c) => c.id === "R1")?.nominalValue, 2200);

  // Dynamic BOM matches edited components
  const bomEdited = buildDynamicBOM(history.present.components);
  assert.ok(bomEdited.some((item) => item.description.includes("2.2 kΩ")));

  // Undo step-by-step back to initial
  history = undoHistoryState(history);
  assert.equal(history.present.components.find((c) => c.id === "R1")?.nominalValue, 470);
  history = undoHistoryState(history);
  assert.equal(history.present.components.length, initial.components.length + 1);
  history = undoHistoryState(history);
  assert.equal(history.present.components.length, initial.components.length);

  // Redo forward
  history = redoHistoryState(history);
  assert.equal(history.present.components.length, initial.components.length + 1);

  // Builder isolated storage round-trip
  const memStore = createMemoryStorage();
  saveBuilderProject(
    {
      projectId: "builder_custom_1",
      name: "Custom RC Stage",
      labMode: "RC_RL",
      topologyLabel: "RC Transient Charging Network",
      nodes: [
        { id: 1, type: "VS", label: "V1", value: 5, x: 80, y: 180, orient: "V" },
        { id: 2, type: "R", label: "R1", value: 1000, x: 240, y: 120, orient: "H" },
        { id: 3, type: "GND", label: "GND", value: 0, x: 80, y: 320, orient: "V" },
      ],
      wires: [{ id: 1, from: { node: 1, term: 0 }, to: { node: 2, term: 0 } }],
    },
    memStore
  );
  const loadedBuilder = loadBuilderProject("builder_custom_1", memStore);
  assert.ok(loadedBuilder);
  assert.equal(loadedBuilder.nodes.length, 3);
  assert.equal(listBuilderProjects(memStore).length, 1);

  // Direct legacy ngspiceEngine operating point check
  const mnaDirect = runNgspiceOperatingPoint(
    [
      { id: 1, type: "VS", label: "V1", value: 10, x: 0, y: 0, orient: "V" },
      { id: 2, type: "R", label: "R1", value: 500, x: 100, y: 0, orient: "H" },
      { id: 3, type: "R", label: "R2", value: 500, x: 200, y: 0, orient: "H" },
      { id: 4, type: "GND", label: "GND", value: 0, x: 0, y: 100, orient: "V" },
    ],
    [
      { id: 1, from: { node: 1, term: 0 }, to: { node: 2, term: 0 } },
      { id: 2, from: { node: 2, term: 1 }, to: { node: 3, term: 0 } },
      { id: 3, from: { node: 3, term: 1 }, to: { node: 4, term: 0 } },
      { id: 4, from: { node: 1, term: 1 }, to: { node: 4, term: 0 } },
    ]
  );
  assert.ok(mnaDirect.reqOhm !== null && Math.abs(mnaDirect.reqOhm - 1000) < 0.5);
});
