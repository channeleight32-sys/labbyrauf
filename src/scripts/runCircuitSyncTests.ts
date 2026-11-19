/**
 * Standalone Regression Test Runner Utility
 * Runs all 10 circuit synchronization, CircuitStore isolation, pure SchematicRenderer SVG,
 * dynamic component/wire netlist, and MNA simulation tests with console PASS/FAIL reporting.
 *
 * Run via: npm run test:circuits   (or: npx tsx src/scripts/runCircuitSyncTests.ts)
 */

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import assert from "node:assert/strict";

import { SchematicRenderer } from "../components/SchematicRenderer";
import { INTERACTIVE_PROJECTS_REGISTRY } from "../data/interactiveProjectsRegistry";
import { MASTER_75_LABS } from "../data/master75Labs";
import {
  getCircuitPresetForLab,
  getInteractiveProjectIdForLab,
  getBuilderPresetNameForLab,
} from "../utils/labCircuitPresets";
import {
  projectToCircuitModel,
  addComponentToModel,
  removeComponentFromModel,
  moveComponentInModel,
  rotateComponentInModel,
  updateComponentValueInModel,
  addConnectionToModel,
  rewireTopologyInModel,
  validateCircuitGraph,
  runUnifiedCircuitSimulation,
} from "../utils/circuitModelEngine";
import {
  CircuitStore,
  createMemoryStorage,
  createHistoryState,
  pushHistoryState,
  undoHistoryState,
  redoHistoryState,
} from "../utils/circuitProjectStore";
import {
  saveCircuitToLocalStorage,
  getAutoSavedCircuit,
  getAllAutoSavedCircuits,
  clearAutoSavedCircuit,
} from "../utils/circuitAutoSave";

function renderSvgStats(model: NonNullable<ReturnType<CircuitStore["loadProject"]>>) {
  const html = renderToStaticMarkup(React.createElement(SchematicRenderer, { model }));
  const compMatches = html.match(/data-component-id="/g) || [];
  const wireMatches = html.match(/data-wire-id="/g) || [];
  return {
    html,
    renderedComponentCount: compMatches.length,
    renderedWireCount: wireMatches.length,
  };
}

function createFreshStore() {
  const mem = createMemoryStorage();
  const store = new CircuitStore({
    storage: mem,
    presetFactory: {
      hasPreset: (id) => INTERACTIVE_PROJECTS_REGISTRY.some((p) => p.id === id),
      createFreshModel: (id) => {
        const found = INTERACTIVE_PROJECTS_REGISTRY.find((p) => p.id === id);
        return found ? projectToCircuitModel(found) : null;
      },
    },
  });
  return { store, mem };
}

interface TestCase {
  name: string;
  run: () => string;
}

const TESTS: TestCase[] = [
  {
    name: "Test 1 — Series Circuit Netlist, Pure SVG Render & MNA Solve",
    run: () => {
      const { store } = createFreshStore();
      const series = store.loadProject("series_resistor_circuit");
      assert.ok(series);
      const svg = renderSvgStats(series);
      assert.equal(svg.renderedComponentCount, series.components.length);
      assert.equal(svg.renderedWireCount, series.connections.length);

      const sim = runUnifiedCircuitSimulation(series);
      assert.ok(sim.reqOhm !== null && Math.abs(sim.reqOhm - 600) < 0.5);
      assert.ok(Math.abs(sim.totalSupplyCurrentMa - 20) < 0.2);
      return `${svg.renderedComponentCount} comps, ${svg.renderedWireCount} wires, Req=${sim.reqOhm?.toFixed(1)}Ω, I=${sim.totalSupplyCurrentMa.toFixed(2)}mA`;
    },
  },
  {
    name: "Test 2 — Parallel Circuit & Genuine Topology Switch (SERIES <-> PARALLEL)",
    run: () => {
      const { store } = createFreshStore();
      const series = store.loadProject("series_resistor_circuit")!;
      const par = store.loadProject("parallel_resistor_circuit")!;

      const rewiredPar = rewireTopologyInModel(series, "PARALLEL", series);
      const svgSeries = renderSvgStats(series);
      const svgPar = renderSvgStats(rewiredPar);
      assert.notEqual(svgPar.renderedWireCount, svgSeries.renderedWireCount);

      const simPar = runUnifiedCircuitSimulation(rewiredPar);
      const simNativePar = runUnifiedCircuitSimulation(par);
      assert.ok(Math.abs(simPar.totalSupplyCurrentMa - simNativePar.totalSupplyCurrentMa) < 0.5);
      assert.ok(Math.abs(simPar.totalSupplyCurrentMa - 220) < 0.5);
      return `Series wires=${svgSeries.renderedWireCount} (20mA) -> Parallel wires=${svgPar.renderedWireCount} (${simPar.totalSupplyCurrentMa.toFixed(1)}mA)`;
    },
  },
  {
    name: "Test 3 — Component Removal Dynamically Shrinks Canvas SVG & Netlist",
    run: () => {
      const { store } = createFreshStore();
      const parallel = store.loadProject("parallel_resistor_circuit")!;
      const beforeSvg = renderSvgStats(parallel);

      const afterRemove = removeComponentFromModel(parallel, "R2");
      const afterSvg = renderSvgStats(afterRemove);

      assert.equal(afterSvg.renderedComponentCount, beforeSvg.renderedComponentCount - 1);
      assert.equal(afterSvg.renderedWireCount, beforeSvg.renderedWireCount - 2);
      assert.equal(afterSvg.html.includes('data-component-id="R2"'), false);

      const sim = runUnifiedCircuitSimulation(afterRemove);
      assert.ok(Math.abs(sim.totalSupplyCurrentMa - 160) < 0.5);
      return `Comps ${beforeSvg.renderedComponentCount}->${afterSvg.renderedComponentCount}, Wires ${beforeSvg.renderedWireCount}->${afterSvg.renderedWireCount}, I=${sim.totalSupplyCurrentMa.toFixed(1)}mA`;
    },
  },
  {
    name: "Test 4 — Loading New Project Dynamically Updates SVG Component & Wire Counts",
    run: () => {
      const { store } = createFreshStore();
      const simple = store.loadProject("simple_resistor_circuit")!;
      const bridge = store.loadProject("full_wave_bridge_rectifier")!;

      const svgSimple = renderSvgStats(simple);
      const svgBridge = renderSvgStats(bridge);

      assert.notEqual(svgSimple.renderedComponentCount, svgBridge.renderedComponentCount);
      assert.notEqual(svgSimple.renderedWireCount, svgBridge.renderedWireCount);
      assert.equal(svgSimple.renderedComponentCount, simple.components.length);
      assert.equal(svgBridge.renderedComponentCount, bridge.components.length);
      assert.equal(svgSimple.renderedWireCount, simple.connections.length);
      assert.equal(svgBridge.renderedWireCount, bridge.connections.length);
      return `Simple (${svgSimple.renderedComponentCount}c/${svgSimple.renderedWireCount}w) != Bridge (${svgBridge.renderedComponentCount}c/${svgBridge.renderedWireCount}w)`;
    },
  },
  {
    name: "Test 5 — Component Addition & Value Edit Update Netlist, SVG Labels & MNA Output",
    run: () => {
      const { store } = createFreshStore();
      const simple = store.loadProject("simple_resistor_circuit")!;
      const added = addComponentToModel(simple, {
        type: "RESISTOR",
        nominalValue: 470,
        autoWire: true,
      }).model;
      const edited = updateComponentValueInModel(added, "R1", 1000);
      const svg = renderSvgStats(edited);

      assert.equal(svg.renderedComponentCount, simple.components.length + 1);
      assert.equal(svg.renderedWireCount, simple.connections.length + 2);
      assert.ok(svg.html.includes("1 kΩ"));

      const sim = runUnifiedCircuitSimulation(edited);
      // 1000 || 470 = 319.73 Ω => I ≈ 9 / 319.73 = 28.15 mA
      assert.ok(Math.abs(sim.totalSupplyCurrentMa - 9000 / ((1000 * 470) / 1470)) < 0.3);
      return `Comps=${svg.renderedComponentCount}, Wires=${svg.renderedWireCount}, I=${sim.totalSupplyCurrentMa.toFixed(2)}mA`;
    },
  },
  {
    name: "Test 6 — CircuitStore Returns Fresh Deep-Cloned Instances (Strict Isolation)",
    run: () => {
      const { store } = createFreshStore();
      const inst1 = store.loadProject("series_resistor_circuit")!;
      const inst2 = store.loadProject("series_resistor_circuit")!;

      assert.notEqual(inst1, inst2);
      assert.notEqual(inst1.components, inst2.components);
      assert.notEqual(inst1.connections, inst2.connections);

      // Mutate inst1 directly and edit via engine
      inst1.components[1].nominalValue = 99999;
      inst1.connections.pop();
      assert.equal(inst2.components[1].nominalValue, 100);
      assert.equal(inst2.connections.length, 5);

      const unknown = store.loadProject("non_existent_project_id");
      assert.equal(unknown, null);
      return "Fresh instance cloning verified; unknown ID strictly returns null";
    },
  },
  {
    name: "Test 7 — labCircuitPresets Deep Clone & circuitAutoSave Project-Scoped Isolation",
    run: () => {
      const a1 = getCircuitPresetForLab("A01");
      const a2 = getCircuitPresetForLab("A01");
      assert.notEqual(a1.nodes, a2.nodes);
      assert.notEqual(a1.wires, a2.wires);
      a1.nodes[0].x = 9999;
      a1.wires.pop();
      assert.notEqual(a2.nodes[0].x, 9999);
      assert.equal(a2.wires.length, 9);

      // Mock localStorage in Node to verify project-scoped circuitAutoSave isolation
      const kv = new Map<string, string>();
      (globalThis as unknown as { window?: { localStorage: Storage } }).window = {
        localStorage: {
          getItem: (k: string) => kv.get(k) ?? null,
          setItem: (k: string, v: string) => {
            kv.set(k, v);
          },
          removeItem: (k: string) => {
            kv.delete(k);
          },
          clear: () => kv.clear(),
          key: () => null,
          length: 0,
        },
      };

      saveCircuitToLocalStorage("Lab A01", [{ id: 1 }, { id: 2 }], [[0, 0, 1, 0]], "lab_A01");
      saveCircuitToLocalStorage("Lab B01", [{ id: 1 }, { id: 2 }, { id: 3 }], [[0, 0, 1, 0], [1, 0, 2, 0]], "lab_B01");

      const recA = getAutoSavedCircuit("lab_A01");
      const recB = getAutoSavedCircuit("lab_B01");
      assert.ok(recA && recB);
      assert.equal(recA.componentCount, 2);
      assert.equal(recB.componentCount, 3);
      assert.equal(getAllAutoSavedCircuits().length, 2);
      clearAutoSavedCircuit();
      delete (globalThis as unknown as { window?: unknown }).window;
      return "Lab preset deep-clone & scoped localStorage autosave isolation passed";
    },
  },
  {
    name: "Test 8 — CircuitStore Save, Reload & Duplicate Custom Persistence Round-Trip",
    run: () => {
      const { store } = createFreshStore();
      let model = store.loadProject("voltage_divider_circuit")!;
      model = moveComponentInModel(model, "R2", { x: 440, y: 300 });
      model = rotateComponentInModel(model, "R2", 90);
      model = updateComponentValueInModel(model, "R2", 20000);

      store.saveProject(model);
      const reloaded = store.loadProject("voltage_divider_circuit")!;
      assert.equal(reloaded.components.find((c) => c.id === "R2")?.nominalValue, 20000);
      assert.equal(reloaded.components.find((c) => c.id === "R2")?.orientation, 180);

      const copy = store.duplicateProject(reloaded, "My 2:1 Divider");
      assert.notEqual(copy.projectId, reloaded.projectId);
      assert.equal(store.listSavedProjects().length, 2);
      assert.equal(store.deleteProject(copy.projectId), true);
      return `Saved, reloaded (R2=${reloaded.components.find((c) => c.id === "R2")?.displayValue}), duplicated & deleted`;
    },
  },
  {
    name: "Test 9 — All 19 Projects Render Distinct Schematics & All 75 Labs Route Validly",
    run: () => {
      const { store } = createFreshStore();
      const svgs = new Set<string>();
      for (const p of INTERACTIVE_PROJECTS_REGISTRY) {
        const m = store.loadProject(p.id)!;
        const svg = renderSvgStats(m);
        assert.equal(svg.renderedComponentCount, m.components.length);
        assert.equal(svg.renderedWireCount, m.connections.length);
        assert.equal(svgs.has(svg.html), false, `Duplicate SVG output for ${p.id}`);
        svgs.add(svg.html);
      }
      for (const lab of MASTER_75_LABS) {
        const pid = getInteractiveProjectIdForLab(lab.id);
        assert.ok(store.loadProject(pid));
        assert.ok(getBuilderPresetNameForLab(lab.id).length > 0);
      }
      return `${svgs.size} unique SVG schematics & ${MASTER_75_LABS.length} labs routed cleanly`;
    },
  },
  {
    name: "Test 10 — Undo/Redo History & Short-Circuit Structural Validation",
    run: () => {
      const { store } = createFreshStore();
      const init = store.loadProject("simple_resistor_circuit")!;
      let hist = createHistoryState(init);

      const step1 = addComponentToModel(hist.present, { type: "RESISTOR", nominalValue: 330, autoWire: true }).model;
      hist = pushHistoryState(hist, step1);
      assert.equal(renderSvgStats(hist.present).renderedComponentCount, init.components.length + 1);

      hist = undoHistoryState(hist);
      assert.equal(renderSvgStats(hist.present).renderedComponentCount, init.components.length);

      hist = redoHistoryState(hist);
      assert.equal(renderSvgStats(hist.present).renderedComponentCount, init.components.length + 1);

      const shorted = addConnectionToModel(hist.present, "V1", "+", "GND1", "GND");
      const val = validateCircuitGraph(shorted.components, shorted.connections);
      assert.ok(val.errors.some((e) => e.code === "SHORT_CIRCUIT"));
      return `Undo/Redo restored ${init.components.length}->${init.components.length + 1} comps; short-circuit caught`;
    },
  },
];

function main() {
  console.log("=== IST Circuit & Logic Lab — 10-Point Synchronization & Schematic Regression Suite ===");
  let passed = 0;
  let failed = 0;

  for (const t of TESTS) {
    const t0 = performance.now();
    try {
      const detail = t.run();
      const ms = (performance.now() - t0).toFixed(1);
      passed++;
      console.log(`[PASS] ${t.name} (${ms} ms) :: ${detail}`);
    } catch (err) {
      const ms = (performance.now() - t0).toFixed(1);
      failed++;
      console.error(`[FAIL] ${t.name} (${ms} ms) ::`, err instanceof Error ? err.message : err);
    }
  }

  console.log("---------------------------------------------------------------------------------------");
  console.log(`Summary: ${passed}/${TESTS.length} Passed, ${failed} Failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
