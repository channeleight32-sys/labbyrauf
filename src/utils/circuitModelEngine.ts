/**
 * Unified Circuit Graph Engine, Topology Rewiring & MNA Simulation Bridge
 *
 * Single source of truth for:
 * - Rotated schematic pin geometry
 * - Disjoint-Set Union electrical net calculation
 * - Structural & electrical validation (disconnected pins, floating nodes, shorts)
 * - Immutable circuit editing operations (add, remove, duplicate, move, rotate, value, wires, topology)
 * - Netlist-driven MNA SPICE simulation via ngspiceEngine
 */

import type {
  CircuitComponentInstance,
  CircuitConnection,
  CircuitNet,
  CircuitOrientation,
  CircuitProjectModel,
  CircuitTopology,
  CircuitValidationIssue,
  CircuitValidationReport,
} from "../types/circuitModel";
import type {
  ComponentType,
  InteractiveProject,
  ProjectBOMItem,
  SchematicComponent,
  SchematicWire,
  SimulationResultMetrics,
  WaveformPoint,
} from "../types/interactiveSchematic";
import type {
  AnalogCompType,
  AnalogNode,
  AnalogWire,
} from "../components/SeriesParallelBuilder";
import {
  runNgspiceOperatingPoint,
  runNgspiceTransient,
  runNgspiceAcSweep,
  type TransientAnalysisResult,
  type AcSweepResult,
  type AcSweepOptions,
  type NetlistDiagnostic,
} from "./ngspiceEngine";

/* ============================================================================
 * 1. Value Formatting & Conversion Helpers
 * ============================================================================ */

export function formatComponentDisplayValue(
  type: ComponentType | string,
  rawVal: number,
  unit: string
): string {
  if (!isFinite(rawVal)) return String(rawVal);
  const u = (unit || "").trim();

  if (type === "RESISTOR" || type === "POTENTIOMETER" || u === "Ω" || u.toLowerCase() === "ohm") {
    if (rawVal >= 1_000_000) return `${Number((rawVal / 1_000_000).toFixed(2))} MΩ`;
    if (rawVal >= 1000) return `${Number((rawVal / 1000).toFixed(2))} kΩ`;
    return `${Number(rawVal.toFixed(1))} Ω`;
  }

  if (u === "F") {
    if (rawVal < 1e-9) return `${Number((rawVal * 1e12).toFixed(1))} pF`;
    if (rawVal < 1e-6) return `${Number((rawVal * 1e9).toFixed(1))} nF`;
    if (rawVal < 1e-3) return `${Number((rawVal * 1e6).toFixed(2))} µF`;
    return `${Number((rawVal * 1e3).toFixed(2))} mF`;
  }

  if (u === "uF" || u === "µF") {
    if (rawVal < 0.001) return `${Number((rawVal * 1e6).toFixed(1))} pF`;
    if (rawVal < 1) return `${Number((rawVal * 1000).toFixed(1))} nF`;
    return `${Number(rawVal.toFixed(2))} µF`;
  }

  if (u === "mH" || u === "uH" || u === "µH" || u === "H") {
    return `${Number(rawVal.toFixed(2))} ${u}`;
  }

  if (type === "SWITCH") {
    return rawVal >= 1 ? "CLOSED (ON)" : "OPEN (OFF)";
  }

  if (u) {
    return `${Number(rawVal.toFixed(2))} ${u}`;
  }
  return String(rawVal);
}

/**
 * Converts capacitor value expressed in model units ("F", "uF", "µF") into microfarads (uF)
 * for ngspiceEngine / Builder compatibility.
 */
export function getCapacitanceInUf(comp: Pick<CircuitComponentInstance, "nominalValue" | "unit">): number {
  const u = (comp.unit || "").trim();
  if (u === "F") return comp.nominalValue * 1e6;
  if (u === "nF") return comp.nominalValue * 1e-3;
  if (u === "pF") return comp.nominalValue * 1e-6;
  return comp.nominalValue; // uF or µF
}

/* ============================================================================
 * 2. Rotated Pin Geometry
 * ============================================================================ */

export function getBasePinOffset(compType: string, pinId: string): { dx: number; dy: number } {
  const pid = pinId.toUpperCase();
  switch (compType) {
    case "VOLTAGE_SOURCE":
      if (pid === "+" || pid === "1" || pid === "SIG_OUT" || pid === "VCC" || pid === "POS") {
        return { dx: 0, dy: -26 };
      }
      if (pid === "-" || pid === "2" || pid === "GND" || pid === "NEG") {
        return { dx: 0, dy: 26 };
      }
      return { dx: 0, dy: -26 };
    case "GROUND":
      return { dx: 0, dy: -22 };
    case "RESISTOR":
    case "INDUCTOR":
    case "SWITCH":
    case "POTENTIOMETER":
      if (pid === "1" || pid === "A" || pid === "IN") return { dx: -30, dy: 0 };
      if (pid === "2" || pid === "B" || pid === "OUT") return { dx: 30, dy: 0 };
      if (pid === "3" || pid === "W" || pid === "WIPER") return { dx: 0, dy: -24 };
      return { dx: 0, dy: 0 };
    case "CAPACITOR":
    case "CAPACITOR_POLARIZED":
      if (pid === "1" || pid === "+" || pid === "A") return { dx: 0, dy: -26 };
      if (pid === "2" || pid === "-" || pid === "K" || pid === "GND") return { dx: 0, dy: 26 };
      return { dx: 0, dy: 0 };
    case "DIODE":
      if (pid === "A" || pid === "1" || pid === "ANODE") return { dx: -26, dy: 0 };
      if (pid === "K" || pid === "2" || pid === "CATHODE") return { dx: 26, dy: 0 };
      return { dx: 0, dy: 0 };
    case "LED":
      if (pid === "A" || pid === "1" || pid === "ANODE") return { dx: 0, dy: -26 };
      if (pid === "K" || pid === "2" || pid === "CATHODE" || pid === "GND") return { dx: 0, dy: 26 };
      return { dx: 0, dy: 0 };
    case "BJT_NPN":
    case "BJT_PNP":
      if (pid === "B" || pid === "2") return { dx: -22, dy: 0 };
      if (pid === "C" || pid === "1") return { dx: 12, dy: -28 };
      if (pid === "E" || pid === "3") return { dx: 12, dy: 28 };
      return { dx: 0, dy: 0 };
    case "MOSFET_N":
      if (pid === "G" || pid === "1") return { dx: -22, dy: 0 };
      if (pid === "D" || pid === "2") return { dx: 14, dy: -28 };
      if (pid === "S" || pid === "3") return { dx: 14, dy: 28 };
      return { dx: 0, dy: 0 };
    case "OPAMP":
      if (pid === "3" || pid === "+") return { dx: -36, dy: 12 };
      if (pid === "2" || pid === "-") return { dx: -36, dy: -12 };
      if (pid === "6" || pid === "OUT") return { dx: 38, dy: 0 };
      if (pid === "7" || pid === "V+") return { dx: 0, dy: -26 };
      if (pid === "4" || pid === "V-") return { dx: 0, dy: 26 };
      return { dx: 0, dy: 0 };
    case "TEST_POINT":
      if (pid === "IN" || pid === "TIP" || pid === "1") return { dx: 0, dy: -6 };
      if (pid === "GND" || pid === "CLIP" || pid === "2") return { dx: 0, dy: 20 };
      return { dx: 0, dy: 0 };
    default: {
      const pNum = parseInt(pinId, 10);
      if (!isNaN(pNum)) {
        if (pNum <= 4) return { dx: -38, dy: -18 + (pNum - 1) * 12 };
        if (pNum <= 8) return { dx: 38, dy: 18 - (pNum - 5) * 12 };
        if (pNum <= 12) return { dx: -38, dy: -20 + (pNum - 9) * 10 };
        return { dx: 38, dy: 20 - (pNum - 13) * 10 };
      }
      return { dx: 0, dy: 0 };
    }
  }
}

export function rotatePointOffset(
  dx: number,
  dy: number,
  orientation: CircuitOrientation = 0
): { dx: number; dy: number } {
  const norm = (((orientation % 360) + 360) % 360) as CircuitOrientation;
  switch (norm) {
    case 90:
      return { dx: -dy, dy: dx };
    case 180:
      return { dx: -dx, dy: -dy };
    case 270:
      return { dx: dy, dy: -dx };
    default:
      return { dx, dy };
  }
}

export function getPinWorldPosition(
  comp: Pick<CircuitComponentInstance, "type" | "position" | "orientation">,
  pinId: string
): { x: number; y: number } {
  const base = getBasePinOffset(comp.type, pinId);
  const rotated = rotatePointOffset(base.dx, base.dy, comp.orientation);
  return {
    x: comp.position.x + rotated.dx,
    y: comp.position.y + rotated.dy,
  };
}

/* ============================================================================
 * 3. Adapters: InteractiveProject <-> CircuitProjectModel
 * ============================================================================ */

export function schematicCompToInstance(c: SchematicComponent): CircuitComponentInstance {
  const normRot = ((((c.schematicPos.rotation || 0) % 360) + 360) % 360);
  const orientation: CircuitOrientation =
    normRot === 90 || normRot === 180 || normRot === 270 ? normRot : 0;

  return {
    id: c.id,
    refDes: c.refDes,
    name: c.name,
    type: c.type,
    nominalValue: c.nominalValue,
    unit: c.unit,
    displayValue: c.displayValue || formatComponentDisplayValue(c.type, c.nominalValue, c.unit),
    properties: {
      tolerance: c.tolerance || "±1%",
      rating: c.rating || "Standard",
      packageType: c.packageType,
      partNumber: c.partNumber,
    },
    position: { x: c.schematicPos.x, y: c.schematicPos.y },
    orientation,
    pins: c.pins.map((p) => ({ ...p })),
    editable: c.editable,
    minVal: c.minVal,
    maxVal: c.maxVal,
    stepVal: c.stepVal,
    tolerance: c.tolerance,
    rating: c.rating,
    packageType: c.packageType,
    partNumber: c.partNumber,
    hardwarePos: c.hardwarePos ? { ...c.hardwarePos } : undefined,
    teachingInfo: { ...c.teachingInfo },
  };
}

export function instanceToSchematicComp(c: CircuitComponentInstance): SchematicComponent {
  return {
    id: c.id,
    refDes: c.refDes,
    name: c.name,
    type: c.type,
    nominalValue: c.nominalValue,
    unit: c.unit,
    displayValue: c.displayValue,
    editable: c.editable,
    minVal: c.minVal,
    maxVal: c.maxVal,
    stepVal: c.stepVal,
    tolerance: c.tolerance,
    rating: c.rating,
    packageType: c.packageType,
    partNumber: c.partNumber,
    pins: c.pins.map((p) => ({ ...p })),
    schematicPos: { x: c.position.x, y: c.position.y, rotation: c.orientation },
    hardwarePos: c.hardwarePos ? { ...c.hardwarePos } : undefined,
    teachingInfo: { ...c.teachingInfo },
  };
}

export function schematicWireToConnection(w: SchematicWire): CircuitConnection {
  return {
    id: w.id,
    sourceComponentId: w.from.componentId,
    sourcePinId: w.from.pinId,
    targetComponentId: w.to.componentId,
    targetPinId: w.to.pinId,
    netName: w.netName,
    signalType: w.signalType,
    wireColor: w.wireColor,
    waypoints: w.waypoints ? w.waypoints.map((pt) => ({ ...pt })) : undefined,
  };
}

export function connectionToSchematicWire(c: CircuitConnection): SchematicWire {
  return {
    id: c.id,
    from: { componentId: c.sourceComponentId, pinId: c.sourcePinId },
    to: { componentId: c.targetComponentId, pinId: c.targetPinId },
    netName: c.netName,
    signalType: c.signalType,
    wireColor: c.wireColor,
    waypoints: c.waypoints ? c.waypoints.map((pt) => ({ ...pt })) : undefined,
  };
}

export function projectToCircuitModel(
  project: InteractiveProject,
  overrides?: { topology?: CircuitTopology; supplyVoltage?: number; isPowered?: boolean }
): CircuitProjectModel {
  const components = project.components.map(schematicCompToInstance);
  const connections = project.wires.map(schematicWireToConnection);
  const supplyVoltage = overrides?.supplyVoltage ?? project.defaultSupplyVoltage;
  const nets = computeCircuitNets(components, connections, supplyVoltage);
  const now = Date.now();

  return {
    projectId: project.id,
    circuitId: `ckt_${project.id}`,
    name: project.title,
    description: project.description,
    category: project.category,
    subjectDomain: project.subjectDomain,
    topology: overrides?.topology ?? "ORIGINAL",
    components,
    connections,
    nets,
    simulationConfig: {
      mode: "DC",
      supplyVoltage,
      supplyVoltageUnit: project.supplyVoltageUnit || "V",
      isPowered: overrides?.isPowered ?? true,
      frequencyHz: 1000,
      simSpeed: 1.0,
    },
    metadata: {
      createdAt: now,
      updatedAt: now,
      isModified: false,
      version: 1,
      sourcePresetId: project.id,
    },
  };
}

/* ============================================================================
 * 4. Net Computation & Electrical Validation (Disjoint-Set Union)
 * ============================================================================ */

function pinKey(componentId: string, pinId: string): string {
  return `${componentId}::${pinId}`;
}

export function computeCircuitNets(
  components: CircuitComponentInstance[],
  connections: CircuitConnection[],
  supplyVoltage = 5.0
): CircuitNet[] {
  const parent = new Map<string, string>();
  const allPins: { key: string; componentId: string; pinId: string; isGndPin: boolean; isSrcPos: boolean }[] = [];

  for (const comp of components) {
    for (const p of comp.pins) {
      const k = pinKey(comp.id, p.id);
      parent.set(k, k);
      const isGndPin =
        comp.type === "GROUND" ||
        (comp.type === "VOLTAGE_SOURCE" && (p.id === "-" || p.id === "GND" || p.id === "2"));
      const isSrcPos =
        comp.type === "VOLTAGE_SOURCE" && (p.id === "+" || p.id === "1" || p.id === "SIG_OUT");
      allPins.push({ key: k, componentId: comp.id, pinId: p.id, isGndPin, isSrcPos });
    }
  }

  // Ensure connection endpoints not explicitly listed in pins array are registered
  for (const w of connections) {
    const k1 = pinKey(w.sourceComponentId, w.sourcePinId);
    const k2 = pinKey(w.targetComponentId, w.targetPinId);
    if (!parent.has(k1)) {
      parent.set(k1, k1);
      allPins.push({ key: k1, componentId: w.sourceComponentId, pinId: w.sourcePinId, isGndPin: false, isSrcPos: false });
    }
    if (!parent.has(k2)) {
      parent.set(k2, k2);
      allPins.push({ key: k2, componentId: w.targetComponentId, pinId: w.targetPinId, isGndPin: false, isSrcPos: false });
    }
  }

  const find = (x: string): string => {
    let curr = x;
    while (parent.get(curr) !== curr) {
      const next = parent.get(curr)!;
      parent.set(curr, parent.get(next)!);
      curr = next;
    }
    return curr;
  };

  const union = (a: string, b: string) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(rb, ra);
  };

  // All GROUND component instances share global reference net GND
  const groundKeys = allPins.filter((p) => {
    const comp = components.find((c) => c.id === p.componentId);
    return comp?.type === "GROUND";
  });
  for (let i = 1; i < groundKeys.length; i++) {
    union(groundKeys[0].key, groundKeys[i].key);
  }

  for (const w of connections) {
    const k1 = pinKey(w.sourceComponentId, w.sourcePinId);
    const k2 = pinKey(w.targetComponentId, w.targetPinId);
    union(k1, k2);
  }

  const groups = new Map<string, typeof allPins>();
  for (const p of allPins) {
    const root = find(p.key);
    const list = groups.get(root) || [];
    list.push(p);
    groups.set(root, list);
  }

  // Preferred net names from wire metadata
  const rootPreferredNames = new Map<string, string>();
  for (const w of connections) {
    const root = find(pinKey(w.sourceComponentId, w.sourcePinId));
    if (w.netName && !rootPreferredNames.has(root)) {
      rootPreferredNames.set(root, w.netName);
    }
  }

  const nets: CircuitNet[] = [];
  let nextNetId = 1;
  const usedNames = new Set<string>();

  for (const [root, members] of groups.entries()) {
    const isGround = members.some((m) => {
      const c = components.find((x) => x.id === m.componentId);
      return c?.type === "GROUND" || m.isGndPin;
    });
    const isPower = !isGround && members.some((m) => m.isSrcPos);

    let netName = isGround
      ? "GND"
      : rootPreferredNames.get(root) || (isPower ? "VCC" : `N${nextNetId}`);

    if (!isGround && usedNames.has(netName)) {
      netName = `${netName}_${nextNetId}`;
    }
    usedNames.add(netName);

    const netId = isGround ? 0 : nextNetId++;
    nets.push({
      netId,
      netName,
      isGround,
      isPower,
      connectedPins: members.map((m) => ({ componentId: m.componentId, pinId: m.pinId })),
      voltageV: isGround ? 0 : isPower ? supplyVoltage : 0,
    });
  }

  return nets.sort((a, b) => a.netId - b.netId);
}

export function validateCircuitGraph(
  components: CircuitComponentInstance[],
  connections: CircuitConnection[]
): CircuitValidationReport {
  const errors: CircuitValidationIssue[] = [];
  const warnings: CircuitValidationIssue[] = [];
  const disconnectedPins: { componentId: string; refDes: string; pinId: string }[] = [];
  const floatingComponents: string[] = [];

  if (components.length === 0) {
    errors.push({
      severity: "error",
      code: "EMPTY_CIRCUIT",
      message: "Circuit contains no components.",
    });
    return { valid: false, errors, warnings, disconnectedPins, floatingComponents };
  }

  const hasSource = components.some((c) => c.type === "VOLTAGE_SOURCE");
  const hasGround = components.some((c) => c.type === "GROUND");
  if (!hasSource) {
    warnings.push({
      severity: "warning",
      code: "MISSING_SOURCE",
      message: "No Voltage Source present — nodal potentials default to 0 V.",
    });
  }
  if (!hasGround) {
    errors.push({
      severity: "error",
      code: "MISSING_GROUND",
      message: "Missing Ground (0V Reference) component required for MNA nodal matrix.",
    });
  }

  for (const comp of components) {
    if (comp.type === "GROUND" || comp.type === "TEST_POINT") continue;
    if (!Number.isFinite(comp.nominalValue)) {
      errors.push({
        severity: "error",
        code: "INVALID_VALUE" as CircuitValidationIssue["code"],
        message: `Component ${comp.refDes} has invalid numeric value (${comp.nominalValue}).`,
        componentId: comp.id,
      });
    } else if (
      (comp.type === "RESISTOR" ||
        comp.type === "POTENTIOMETER" ||
        comp.type === "CAPACITOR" ||
        comp.type === "CAPACITOR_POLARIZED" ||
        comp.type === "INDUCTOR") &&
      comp.nominalValue <= 0
    ) {
      errors.push({
        severity: "error",
        code: "INVALID_VALUE" as CircuitValidationIssue["code"],
        message: `Component ${comp.refDes} (${comp.type}) must have a positive value > 0 (got ${comp.nominalValue}).`,
        componentId: comp.id,
      });
    }
  }

  // Build adjacency of connected pins
  const connectedPinSet = new Set<string>();
  const compAdj = new Map<string, Set<string>>();
  for (const c of components) compAdj.set(c.id, new Set());

  for (const w of connections) {
    connectedPinSet.add(pinKey(w.sourceComponentId, w.sourcePinId));
    connectedPinSet.add(pinKey(w.targetComponentId, w.targetPinId));
    compAdj.get(w.sourceComponentId)?.add(w.targetComponentId);
    compAdj.get(w.targetComponentId)?.add(w.sourceComponentId);
  }

  const criticalPinCheckTypes = new Set<ComponentType>([
    "RESISTOR",
    "CAPACITOR",
    "CAPACITOR_POLARIZED",
    "INDUCTOR",
    "DIODE",
    "LED",
    "VOLTAGE_SOURCE",
    "GROUND",
    "SWITCH",
  ]);

  for (const comp of components) {
    const checkPins = comp.pins.slice(0, 2);
    let connectedCount = 0;
    for (const pin of comp.pins) {
      if (connectedPinSet.has(pinKey(comp.id, pin.id))) {
        connectedCount++;
      } else if (criticalPinCheckTypes.has(comp.type) && checkPins.some((cp) => cp.id === pin.id)) {
        disconnectedPins.push({ componentId: comp.id, refDes: comp.refDes, pinId: pin.id });
        warnings.push({
          severity: "warning",
          code: "DISCONNECTED_PIN",
          message: `Component ${comp.refDes} pin ${pin.name || pin.id} is disconnected (open circuit).`,
          componentId: comp.id,
          pinId: pin.id,
        });
      }
    }

    if (connectedCount === 0 && components.length > 1) {
      floatingComponents.push(comp.id);
      warnings.push({
        severity: "warning",
        code: "FLOATING_COMPONENT",
        message: `Component ${comp.refDes} has no wire connections and is floating.`,
        componentId: comp.id,
      });
    }
  }

  // BFS from Ground components to find completely ungrounded islands
  const gndIds = components.filter((c) => c.type === "GROUND").map((c) => c.id);
  if (gndIds.length > 0) {
    const visited = new Set<string>(gndIds);
    const queue = [...gndIds];
    while (queue.length > 0) {
      const cur = queue.shift()!;
      for (const nxt of compAdj.get(cur) || []) {
        if (!visited.has(nxt)) {
          visited.add(nxt);
          queue.push(nxt);
        }
      }
    }
    for (const comp of components) {
      if (!visited.has(comp.id) && !floatingComponents.includes(comp.id)) {
        floatingComponents.push(comp.id);
        warnings.push({
          severity: "warning",
          code: "FLOATING_COMPONENT",
          message: `Component ${comp.refDes} is isolated from the Ground return path.`,
          componentId: comp.id,
        });
      }
    }
  }

  // Short-circuit check: VOLTAGE_SOURCE '+' and '-' directly on same electrical net
  const nets = computeCircuitNets(components, connections);
  for (const src of components.filter((c) => c.type === "VOLTAGE_SOURCE")) {
    const posPin = src.pins[0]?.id || "+";
    const negPin = src.pins[1]?.id || "-";
    const posNet = nets.find((n) =>
      n.connectedPins.some((p) => p.componentId === src.id && p.pinId === posPin)
    );
    const negNet = nets.find((n) =>
      n.connectedPins.some((p) => p.componentId === src.id && p.pinId === negPin)
    );
    if (posNet && negNet && posNet.netId === negNet.netId) {
      errors.push({
        severity: "error",
        code: "SHORT_CIRCUIT",
        message: `Voltage source ${src.refDes} has + and - terminals shorted on net ${posNet.netName}.`,
        componentId: src.id,
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    disconnectedPins,
    floatingComponents,
  };
}

/* ============================================================================
 * 5. Immutable Single-Source-of-Truth Editing Operations
 * ============================================================================ */

function touchModel(
  model: CircuitProjectModel,
  components: CircuitComponentInstance[],
  connections: CircuitConnection[],
  topology: CircuitTopology = model.topology,
  isModified = true
): CircuitProjectModel {
  const nets = computeCircuitNets(components, connections, model.simulationConfig.supplyVoltage);
  return {
    ...model,
    topology,
    components,
    connections,
    nets,
    metadata: {
      ...model.metadata,
      updatedAt: Date.now(),
      isModified,
    },
  };
}

export interface AddComponentSpec {
  type: "RESISTOR" | "CAPACITOR" | "CAPACITOR_POLARIZED" | "INDUCTOR" | "LED" | "DIODE" | "SWITCH" | "POTENTIOMETER";
  nominalValue?: number;
  name?: string;
  position?: { x: number; y: number };
  autoWire?: boolean;
}

const DEFAULT_ADD_SPECS: Record<
  AddComponentSpec["type"],
  {
    prefix: string;
    name: string;
    part: string;
    pkg: string;
    val: number;
    unit: string;
    min: number;
    max: number;
    step: number;
    pins: CircuitComponentInstance["pins"];
  }
> = {
  RESISTOR: {
    prefix: "R",
    name: "Carbon Film Resistor",
    part: "RES-1/4W",
    pkg: "Axial 1/4W",
    val: 1000,
    unit: "Ω",
    min: 10,
    max: 100000,
    step: 10,
    pins: [
      { id: "1", name: "Pin 1", number: 1, type: "passive" },
      { id: "2", name: "Pin 2", number: 2, type: "passive" },
    ],
  },
  POTENTIOMETER: {
    prefix: "RV",
    name: "Rotary Potentiometer",
    part: "RV09-10K",
    pkg: "3-Pin Panel",
    val: 10000,
    unit: "Ω",
    min: 100,
    max: 100000,
    step: 100,
    pins: [
      { id: "1", name: "Pin 1", number: 1, type: "passive" },
      { id: "2", name: "Pin 2", number: 2, type: "passive" },
      { id: "3", name: "Wiper", number: 3, type: "passive" },
    ],
  },
  CAPACITOR: {
    prefix: "C",
    name: "Ceramic Capacitor",
    part: "CAP-50V",
    pkg: "Radial Disc",
    val: 10,
    unit: "uF",
    min: 0.1,
    max: 470,
    step: 0.5,
    pins: [
      { id: "1", name: "1", number: 1, type: "passive" },
      { id: "2", name: "2", number: 2, type: "passive" },
    ],
  },
  CAPACITOR_POLARIZED: {
    prefix: "C",
    name: "Electrolytic Capacitor",
    part: "UHE1C101",
    pkg: "Radial Can",
    val: 100,
    unit: "uF",
    min: 1,
    max: 4700,
    step: 1,
    pins: [
      { id: "1", name: "+", number: 1, type: "passive" },
      { id: "2", name: "-", number: 2, type: "ground" },
    ],
  },
  INDUCTOR: {
    prefix: "L",
    name: "Toroid Inductor",
    part: "IND-10mH",
    pkg: "Radial",
    val: 10,
    unit: "mH",
    min: 1,
    max: 500,
    step: 1,
    pins: [
      { id: "1", name: "1", number: 1, type: "passive" },
      { id: "2", name: "2", number: 2, type: "passive" },
    ],
  },
  LED: {
    prefix: "D",
    name: "Indicator LED",
    part: "LED-5MM",
    pkg: "T-1 3/4",
    val: 2.0,
    unit: "V",
    min: 1.6,
    max: 3.6,
    step: 0.1,
    pins: [
      { id: "A", name: "ANODE", number: 1, type: "passive" },
      { id: "K", name: "CATHODE", number: 2, type: "ground" },
    ],
  },
  DIODE: {
    prefix: "D",
    name: "Silicon Rectifier Diode",
    part: "1N4007",
    pkg: "DO-41",
    val: 0.7,
    unit: "V",
    min: 0.2,
    max: 1.2,
    step: 0.1,
    pins: [
      { id: "A", name: "ANODE", number: 1, type: "passive" },
      { id: "K", name: "CATHODE", number: 2, type: "passive" },
    ],
  },
  SWITCH: {
    prefix: "SW",
    name: "SPST Toggle Switch",
    part: "SW-SPST",
    pkg: "PCB Through-Hole",
    val: 1,
    unit: "",
    min: 0,
    max: 1,
    step: 1,
    pins: [
      { id: "1", name: "COM", number: 1, type: "passive" },
      { id: "2", name: "NO", number: 2, type: "passive" },
    ],
  },
};

function generateNextRefDes(prefix: string, components: CircuitComponentInstance[]): string {
  const existing = new Set(components.map((c) => c.refDes.toUpperCase()));
  let idx = 1;
  while (existing.has(`${prefix}${idx}`.toUpperCase())) {
    idx++;
  }
  return `${prefix}${idx}`;
}

export function addComponentToModel(
  model: CircuitProjectModel,
  spec: AddComponentSpec
): { model: CircuitProjectModel; addedComponent: CircuitComponentInstance } {
  const d = DEFAULT_ADD_SPECS[spec.type];
  const val = spec.nominalValue ?? d.val;
  const idx = model.components.length + 1;
  const id = `${d.prefix.toLowerCase()}_u_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const refDes = generateNextRefDes(d.prefix, model.components);
  const pos = spec.position ?? {
    x: 180 + ((idx * 110) % 560),
    y: 150 + ((Math.floor(idx / 5) * 110) % 240),
  };

  const disp = formatComponentDisplayValue(spec.type, val, d.unit);
  const newComp: CircuitComponentInstance = {
    id,
    refDes,
    name: spec.name || d.name,
    type: spec.type,
    nominalValue: val,
    unit: d.unit,
    displayValue: disp,
    properties: {
      partNumber: d.part,
      packageType: d.pkg,
    },
    position: pos,
    orientation: 0,
    pins: d.pins.map((p) => ({ ...p })),
    editable: true,
    minVal: d.min,
    maxVal: d.max,
    stepVal: d.step,
    packageType: d.pkg,
    partNumber: d.part,
    hardwarePos: {
      type: "BREADBOARD",
      col: Math.min(28, 6 + ((idx * 4) % 22)),
      row: "C",
      pinSpan: 2,
    },
    teachingInfo: {
      role: `User-added ${spec.name || d.name} (${refDes}) wired into circuit model.`,
      rationale: "Extends circuit topology while staying bound to the single source of truth.",
      electricalProps: `Nominal ${disp} (${d.part})`,
      inOutExplanation: "Conducts current between terminal pins according to impedance/bias.",
      circuitImpact: "Updates nodal voltages, total impedance, branch currents, and schematic.",
    },
  };

  const addedConns: CircuitConnection[] = [];
  if (spec.autoWire !== false) {
    const src = model.components.find((c) => c.type === "VOLTAGE_SOURCE");
    const gnd = model.components.find((c) => c.type === "GROUND");
    const p1 = newComp.pins[0]?.id || "1";
    const p2 = newComp.pins[1]?.id || "2";
    if (src) {
      addedConns.push({
        id: `w_add_a_${id}`,
        sourceComponentId: src.id,
        sourcePinId: src.pins[0]?.id || "+",
        targetComponentId: newComp.id,
        targetPinId: p1,
        netName: "VCC",
        signalType: "POWER",
        wireColor: "#ef4444",
      });
    }
    if (gnd || src) {
      const target = gnd || src!;
      addedConns.push({
        id: `w_add_b_${id}`,
        sourceComponentId: newComp.id,
        sourcePinId: p2,
        targetComponentId: target.id,
        targetPinId: gnd ? (gnd.pins[0]?.id || "GND") : (src!.pins[1]?.id || "-"),
        netName: "GND",
        signalType: "GROUND",
        wireColor: "#64748b",
      });
    }
  }

  return {
    addedComponent: newComp,
    model: touchModel(
      model,
      [...model.components, newComp],
      [...model.connections, ...addedConns],
      model.topology === "ORIGINAL" ? "CUSTOM" : model.topology
    ),
  };
}

export function removeComponentFromModel(
  model: CircuitProjectModel,
  componentId: string
): CircuitProjectModel {
  const nextComponents = model.components.filter((c) => c.id !== componentId);
  const nextConnections = model.connections.filter(
    (w) => w.sourceComponentId !== componentId && w.targetComponentId !== componentId
  );
  return touchModel(
    model,
    nextComponents,
    nextConnections,
    model.topology === "ORIGINAL" ? "CUSTOM" : model.topology
  );
}

export function duplicateComponentInModel(
  model: CircuitProjectModel,
  componentId: string
): { model: CircuitProjectModel; duplicatedComponent: CircuitComponentInstance | null } {
  const src = model.components.find((c) => c.id === componentId);
  if (!src) return { model, duplicatedComponent: null };

  const prefix = src.refDes.replace(/[0-9_]+$/g, "") || src.type.slice(0, 1);
  const refDes = generateNextRefDes(prefix, model.components);
  const id = `${src.id}_copy_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;

  const copy: CircuitComponentInstance = {
    ...src,
    id,
    refDes,
    properties: { ...src.properties },
    position: {
      x: Math.min(820, src.position.x + 40),
      y: Math.min(480, src.position.y + 40),
    },
    pins: src.pins.map((p) => ({ ...p })),
    hardwarePos: src.hardwarePos ? { ...src.hardwarePos } : undefined,
    teachingInfo: { ...src.teachingInfo },
  };

  return {
    duplicatedComponent: copy,
    model: touchModel(model, [...model.components, copy], model.connections, model.topology),
  };
}

export function moveComponentInModel(
  model: CircuitProjectModel,
  componentId: string,
  position: { x: number; y: number }
): CircuitProjectModel {
  const clamped = {
    x: Math.max(40, Math.min(840, Math.round(position.x))),
    y: Math.max(40, Math.min(500, Math.round(position.y))),
  };
  const nextComponents = model.components.map((c) =>
    c.id === componentId ? { ...c, position: clamped } : c
  );
  return touchModel(model, nextComponents, model.connections, model.topology);
}

export function rotateComponentInModel(
  model: CircuitProjectModel,
  componentId: string,
  deltaDeg = 90
): CircuitProjectModel {
  const nextComponents = model.components.map((c) => {
    if (c.id !== componentId) return c;
    const next = (((c.orientation + deltaDeg) % 360) + 360) % 360;
    const orientation: CircuitOrientation =
      next === 90 || next === 180 || next === 270 ? next : 0;
    return { ...c, orientation };
  });
  return touchModel(model, nextComponents, model.connections, model.topology);
}

export function updateComponentValueInModel(
  model: CircuitProjectModel,
  componentId: string,
  nominalValue: number,
  extraProperties?: Record<string, string | number | boolean>
): CircuitProjectModel {
  let supplyVoltage = model.simulationConfig.supplyVoltage;
  const nextComponents = model.components.map((c) => {
    if (c.id !== componentId) return c;
    const safeVal = Math.max(0, nominalValue);
    if (c.type === "VOLTAGE_SOURCE") {
      supplyVoltage = safeVal;
    }
    return {
      ...c,
      nominalValue: safeVal,
      displayValue: formatComponentDisplayValue(c.type, safeVal, c.unit),
      properties: extraProperties ? { ...c.properties, ...extraProperties } : c.properties,
    };
  });

  const nets = computeCircuitNets(nextComponents, model.connections, supplyVoltage);
  return {
    ...model,
    components: nextComponents,
    nets,
    simulationConfig: {
      ...model.simulationConfig,
      supplyVoltage,
    },
    metadata: {
      ...model.metadata,
      updatedAt: Date.now(),
      isModified: true,
    },
  };
}

export function addConnectionToModel(
  model: CircuitProjectModel,
  sourceComponentId: string,
  sourcePinId: string,
  targetComponentId: string,
  targetPinId: string,
  opts?: { netName?: string; signalType?: SchematicWire["signalType"]; wireColor?: string }
): CircuitProjectModel {
  if (sourceComponentId === targetComponentId && sourcePinId === targetPinId) {
    return model;
  }

  const alreadyExists = model.connections.some(
    (w) =>
      (w.sourceComponentId === sourceComponentId &&
        w.sourcePinId === sourcePinId &&
        w.targetComponentId === targetComponentId &&
        w.targetPinId === targetPinId) ||
      (w.sourceComponentId === targetComponentId &&
        w.sourcePinId === targetPinId &&
        w.targetComponentId === sourceComponentId &&
        w.targetPinId === sourcePinId)
  );
  if (alreadyExists) return model;

  const isGroundWire =
    model.components.find((c) => c.id === sourceComponentId)?.type === "GROUND" ||
    model.components.find((c) => c.id === targetComponentId)?.type === "GROUND";
  const isPowerWire =
    !isGroundWire &&
    (model.components.find((c) => c.id === sourceComponentId)?.type === "VOLTAGE_SOURCE" ||
      model.components.find((c) => c.id === targetComponentId)?.type === "VOLTAGE_SOURCE");

  const newWire: CircuitConnection = {
    id: `w_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    sourceComponentId,
    sourcePinId,
    targetComponentId,
    targetPinId,
    netName:
      opts?.netName ||
      (isGroundWire ? "GND" : isPowerWire ? "VCC" : `NET_${model.connections.length + 1}`),
    signalType:
      opts?.signalType ||
      (isGroundWire ? "GROUND" : isPowerWire ? "POWER" : "ANALOG_SIGNAL"),
    wireColor:
      opts?.wireColor || (isGroundWire ? "#64748b" : isPowerWire ? "#ef4444" : "#38bdf8"),
  };

  return touchModel(
    model,
    model.components,
    [...model.connections, newWire],
    model.topology === "ORIGINAL" ? "CUSTOM" : model.topology
  );
}

export function removeConnectionFromModel(
  model: CircuitProjectModel,
  connectionId: string
): CircuitProjectModel {
  const nextConnections = model.connections.filter((w) => w.id !== connectionId);
  return touchModel(
    model,
    model.components,
    nextConnections,
    model.topology === "ORIGINAL" ? "CUSTOM" : model.topology
  );
}

export function disconnectPinInModel(
  model: CircuitProjectModel,
  componentId: string,
  pinId: string
): CircuitProjectModel {
  const nextConnections = model.connections.filter(
    (w) =>
      !(w.sourceComponentId === componentId && w.sourcePinId === pinId) &&
      !(w.targetComponentId === componentId && w.targetPinId === pinId)
  );
  return touchModel(
    model,
    model.components,
    nextConnections,
    model.topology === "ORIGINAL" ? "CUSTOM" : model.topology
  );
}

/**
 * Rewires all 2-terminal branch components into true SERIES, PARALLEL, or COMBINATION netlists.
 * Completely replaces connections so Series (single sequential loop) and Parallel (shared rails)
 * always yield both distinct schematic wiring AND distinct MNA electrical matrices.
 */
export function rewireTopologyInModel(
  model: CircuitProjectModel,
  mode: "ORIGINAL" | "SERIES" | "PARALLEL" | "COMBINATION",
  originalModel?: CircuitProjectModel
): CircuitProjectModel {
  if (mode === "ORIGINAL" && originalModel) {
    const clonedComps = originalModel.components.map((c) => ({
      ...c,
      position: { ...c.position },
      pins: c.pins.map((p) => ({ ...p })),
      properties: { ...c.properties },
      teachingInfo: { ...c.teachingInfo },
    }));
    const clonedConns = originalModel.connections.map((w) => ({
      ...w,
      waypoints: w.waypoints ? w.waypoints.map((pt) => ({ ...pt })) : undefined,
    }));
    return touchModel(model, clonedComps, clonedConns, "ORIGINAL", false);
  }

  const branchTypes = new Set<ComponentType>([
    "RESISTOR",
    "CAPACITOR",
    "CAPACITOR_POLARIZED",
    "INDUCTOR",
    "DIODE",
    "LED",
    "SWITCH",
    "POTENTIOMETER",
  ]);

  let src = model.components.find((c) => c.type === "VOLTAGE_SOURCE");
  let gnd = model.components.find((c) => c.type === "GROUND");
  const extraComponents: CircuitComponentInstance[] = [];

  if (!src) {
    src = {
      id: `v_src_${Date.now()}`,
      refDes: "V1",
      name: "DC Laboratory Supply",
      type: "VOLTAGE_SOURCE",
      nominalValue: model.simulationConfig.supplyVoltage || 12,
      unit: "V",
      displayValue: `${model.simulationConfig.supplyVoltage || 12} V DC`,
      properties: {},
      position: { x: 110, y: 240 },
      orientation: 0,
      pins: [
        { id: "+", name: "+V", number: 1, type: "power" },
        { id: "-", name: "GND", number: 2, type: "ground" },
      ],
      packageType: "Bench PSU",
      partNumber: "DC-PSU",
      teachingInfo: {
        role: "DC power source",
        rationale: "Provides reference excitation voltage.",
        electricalProps: `${model.simulationConfig.supplyVoltage || 12}V DC`,
        inOutExplanation: "Drives current into circuit.",
        circuitImpact: "Required for non-zero solution.",
      },
    };
    extraComponents.push(src);
  }

  if (!gnd) {
    gnd = {
      id: `gnd_ref_${Date.now()}`,
      refDes: "GND",
      name: "System Ground Reference",
      type: "GROUND",
      nominalValue: 0,
      unit: "V",
      displayValue: "0V",
      properties: {},
      position: { x: 110, y: 400 },
      orientation: 0,
      pins: [{ id: "GND", name: "GND", number: 1, type: "ground" }],
      packageType: "Common",
      partNumber: "GND",
      teachingInfo: {
        role: "Zero-volt reference",
        rationale: "KVL/MNA ground node.",
        electricalProps: "0V fixed",
        inOutExplanation: "Return current sink.",
        circuitImpact: "Required reference.",
      },
    };
    extraComponents.push(gnd);
  }

  const branches = model.components.filter((c) => branchTypes.has(c.type));
  if (branches.length === 0) {
    return touchModel(
      model,
      [...model.components, ...extraComponents],
      model.connections,
      mode === "ORIGINAL" ? "CUSTOM" : mode
    );
  }

  const rewiredConns: CircuitConnection[] = [];
  const layoutMap = new Map<
    string,
    { x: number; y: number; orientation: CircuitOrientation; col: number }
  >();

  layoutMap.set(src.id, { x: 110, y: 240, orientation: 0, col: 4 });
  layoutMap.set(gnd.id, { x: 110, y: 400, orientation: 0, col: 4 });

  rewiredConns.push({
    id: `rw_src_gnd_${Date.now()}`,
    sourceComponentId: src.id,
    sourcePinId: src.pins[1]?.id || "-",
    targetComponentId: gnd.id,
    targetPinId: gnd.pins[0]?.id || "GND",
    netName: "GND",
    signalType: "GROUND",
    wireColor: "#64748b",
  });

  if (mode === "SERIES") {
    const stepX = Math.min(145, Math.max(95, Math.floor(620 / branches.length)));
    branches.forEach((b, idx) => {
      // Components with default vertical pins (CAPACITOR/LED) rotate 90 deg for clean horizontal series loop
      const needsRotate =
        b.type === "CAPACITOR" || b.type === "CAPACITOR_POLARIZED" || b.type === "LED";
      layoutMap.set(b.id, {
        x: 230 + idx * stepX,
        y: 130,
        orientation: needsRotate ? 270 : 0,
        col: Math.min(28, 8 + idx * 4),
      });
    });

    rewiredConns.push({
      id: `rw_s_head_${Date.now()}`,
      sourceComponentId: src.id,
      sourcePinId: src.pins[0]?.id || "+",
      targetComponentId: branches[0].id,
      targetPinId: branches[0].pins[0]?.id || "1",
      netName: "VCC_SERIES",
      signalType: "POWER",
      wireColor: "#ef4444",
    });

    for (let i = 0; i < branches.length - 1; i++) {
      rewiredConns.push({
        id: `rw_s_link_${i}_${Date.now()}`,
        sourceComponentId: branches[i].id,
        sourcePinId: branches[i].pins[1]?.id || "2",
        targetComponentId: branches[i + 1].id,
        targetPinId: branches[i + 1].pins[0]?.id || "1",
        netName: `SERIES_N${i + 1}`,
        signalType: "ANALOG_SIGNAL",
        wireColor: "#22d3ee",
      });
    }

    const last = branches[branches.length - 1];
    rewiredConns.push({
      id: `rw_s_tail_${Date.now()}`,
      sourceComponentId: last.id,
      sourcePinId: last.pins[1]?.id || "2",
      targetComponentId: gnd.id,
      targetPinId: gnd.pins[0]?.id || "GND",
      netName: "GND",
      signalType: "GROUND",
      wireColor: "#64748b",
    });
  } else if (mode === "COMBINATION" && branches.length >= 2) {
    const head = branches[0];
    const rest = branches.slice(1);
    const headNeedsRotate =
      head.type === "CAPACITOR" || head.type === "CAPACITOR_POLARIZED" || head.type === "LED";
    layoutMap.set(head.id, {
      x: 250,
      y: 130,
      orientation: headNeedsRotate ? 270 : 0,
      col: 8,
    });

    rewiredConns.push({
      id: `rw_c_head_${Date.now()}`,
      sourceComponentId: src.id,
      sourcePinId: src.pins[0]?.id || "+",
      targetComponentId: head.id,
      targetPinId: head.pins[0]?.id || "1",
      netName: "VCC_FEED",
      signalType: "POWER",
      wireColor: "#ef4444",
    });

    const stepX = Math.min(130, Math.max(95, Math.floor(460 / rest.length)));
    rest.forEach((b, idx) => {
      const needsRotate =
        b.type === "RESISTOR" ||
        b.type === "INDUCTOR" ||
        b.type === "DIODE" ||
        b.type === "SWITCH";
      layoutMap.set(b.id, {
        x: 420 + idx * stepX,
        y: 250,
        orientation: needsRotate ? 90 : 0,
        col: Math.min(28, 14 + idx * 4),
      });

      rewiredConns.push({
        id: `rw_c_top_${idx}_${Date.now()}`,
        sourceComponentId: head.id,
        sourcePinId: head.pins[1]?.id || "2",
        targetComponentId: b.id,
        targetPinId: b.pins[0]?.id || "1",
        netName: "COMBO_NODE",
        signalType: "ANALOG_SIGNAL",
        wireColor: "#22d3ee",
      });
      rewiredConns.push({
        id: `rw_c_bot_${idx}_${Date.now()}`,
        sourceComponentId: b.id,
        sourcePinId: b.pins[1]?.id || "2",
        targetComponentId: gnd!.id,
        targetPinId: gnd!.pins[0]?.id || "GND",
        netName: "GND",
        signalType: "GROUND",
        wireColor: "#64748b",
      });
    });
  } else {
    // PARALLEL bank across VCC bus & GND bus
    const stepX = Math.min(130, Math.max(95, Math.floor(620 / branches.length)));
    branches.forEach((b, idx) => {
      const needsRotate =
        b.type === "RESISTOR" ||
        b.type === "INDUCTOR" ||
        b.type === "DIODE" ||
        b.type === "SWITCH";
      layoutMap.set(b.id, {
        x: 240 + idx * stepX,
        y: 250,
        orientation: needsRotate ? 90 : 0,
        col: Math.min(28, 8 + idx * 4),
      });

      rewiredConns.push({
        id: `rw_p_top_${idx}_${Date.now()}`,
        sourceComponentId: src!.id,
        sourcePinId: src!.pins[0]?.id || "+",
        targetComponentId: b.id,
        targetPinId: b.pins[0]?.id || "1",
        netName: "PARALLEL_BUS_POS",
        signalType: "POWER",
        wireColor: "#ef4444",
      });
      rewiredConns.push({
        id: `rw_p_bot_${idx}_${Date.now()}`,
        sourceComponentId: b.id,
        sourcePinId: b.pins[1]?.id || "2",
        targetComponentId: gnd!.id,
        targetPinId: gnd!.pins[0]?.id || "GND",
        netName: "GND",
        signalType: "GROUND",
        wireColor: "#64748b",
      });
    });
  }

  const nextComps = [...model.components, ...extraComponents].map((c) => {
    const nextPos = layoutMap.get(c.id);
    if (!nextPos) return c;
    return {
      ...c,
      position: { x: nextPos.x, y: nextPos.y },
      orientation: nextPos.orientation,
      hardwarePos: c.hardwarePos
        ? { ...c.hardwarePos, col: nextPos.col }
        : { type: "BREADBOARD" as const, col: nextPos.col, row: "C", pinSpan: 2 },
    };
  });

  const nextTopology: CircuitTopology = mode === "ORIGINAL" ? "ORIGINAL" : mode;
  return touchModel(model, nextComps, rewiredConns, nextTopology);
}

/* ============================================================================
 * 6. Netlist-Driven MNA / SPICE Unified Simulation Engine
 * ============================================================================ */

function mapComponentToAnalogType(comp: CircuitComponentInstance): AnalogCompType | null {
  const partUpper = (comp.partNumber || "").toUpperCase();
  switch (comp.type) {
    case "VOLTAGE_SOURCE":
      return "VS";
    case "GROUND":
      return "GND";
    case "RESISTOR":
      return "R";
    case "POTENTIOMETER":
      return "POT";
    case "INDUCTOR":
      return "L";
    case "CAPACITOR":
      return "C";
    case "CAPACITOR_POLARIZED":
      return "CPOL";
    case "SWITCH":
      return "SW";
    case "LED":
      return "LED";
    case "DIODE":
      if (partUpper.includes("1N47") || partUpper.includes("ZENER") || comp.name.toLowerCase().includes("zener")) {
        return "ZD";
      }
      return "D";
    case "BJT_NPN":
    case "BJT_PNP":
      return "BJT";
    case "MOSFET_N":
      return "MOS";
    case "OPAMP":
      return "OPAMP";
    case "TIMER_555":
      return "NE555";
    case "VOLTAGE_REGULATOR":
      return "REG7805";
    default:
      return null;
  }
}

function mapPinToAnalogTermIndex(comp: CircuitComponentInstance, pinId: string): number {
  const pid = pinId.toUpperCase();
  if (comp.type === "GROUND") return 0;
  if (comp.type === "VOLTAGE_SOURCE") {
    return pid === "-" || pid === "2" || pid === "GND" ? 1 : 0;
  }
  if (comp.type === "BJT_NPN" || comp.type === "BJT_PNP") {
    if (pid === "C" || pid === "1") return 0;
    if (pid === "E" || pid === "3") return 1;
    return 2; // B
  }
  if (comp.type === "MOSFET_N") {
    if (pid === "D" || pid === "2") return 0;
    if (pid === "S" || pid === "3") return 1;
    return 2; // G
  }
  if (comp.type === "POTENTIOMETER") {
    if (pid === "1") return 0;
    if (pid === "2") return 1;
    return 2;
  }
  const idx = comp.pins.findIndex((p) => p.id.toUpperCase() === pid);
  if (idx >= 0) return idx;
  if (pid === "2" || pid === "K" || pid === "CATHODE" || pid === "-" || pid === "GND") return 1;
  return 0;
}

export interface UnifiedSimulationOutput {
  netVoltages: Record<string, number>;
  branchCurrents: Record<string, number>;
  componentTelemetry: Record<
    string,
    { vDrop: number; current_mA: number; power_mW: number; operatingRegion: string }
  >;
  reqOhm: number | null;
  totalSupplyCurrentMa: number;
  totalLoadPowerMw: number;
  topologyClass: string;
  validation: CircuitValidationReport;
  waveforms: WaveformPoint[];
  metrics: SimulationResultMetrics[];
  converged?: boolean;
  abortedReason?: string;
  kclMaxResidualA?: number;
  acSweep?: AcSweepResult;
  transientRaw?: TransientAnalysisResult;
}

export interface CircuitModelAnalogConversion {
  analogNodes: AnalogNode[];
  analogWires: AnalogWire[];
  idToNum: Map<string, number>;
  numToComp: Map<number, CircuitComponentInstance>;
}

/**
 * Single-Source-of-Truth conversion from CircuitProjectModel schematic graph
 * to the MNA solver node/wire representation.
 */
export function circuitModelToAnalogGraph(model: CircuitProjectModel): CircuitModelAnalogConversion {
  const idToNum = new Map<string, number>();
  const numToComp = new Map<number, CircuitComponentInstance>();
  const analogNodes: AnalogNode[] = [];
  let nextNumId = 1;

  for (const comp of model.components) {
    const analogType = mapComponentToAnalogType(comp);
    if (!analogType) continue;
    const numId = nextNumId++;
    idToNum.set(comp.id, numId);
    numToComp.set(numId, comp);

    let val = comp.nominalValue;
    if (analogType === "C" || analogType === "CPOL" || analogType === "CNP") {
      val = getCapacitanceInUf(comp);
    }

    analogNodes.push({
      id: numId,
      type: analogType,
      label: comp.refDes,
      value: val,
      x: comp.position.x,
      y: comp.position.y,
      orient: comp.orientation === 90 || comp.orientation === 270 ? "V" : "H",
    });
  }

  const analogWires: AnalogWire[] = [];
  let wireIdCounter = 1;
  for (const conn of model.connections) {
    const fromNum = idToNum.get(conn.sourceComponentId);
    const toNum = idToNum.get(conn.targetComponentId);
    const fromComp = model.components.find((c) => c.id === conn.sourceComponentId);
    const toComp = model.components.find((c) => c.id === conn.targetComponentId);
    if (!fromNum || !toNum || !fromComp || !toComp) continue;

    analogWires.push({
      id: wireIdCounter++,
      from: { node: fromNum, term: mapPinToAnalogTermIndex(fromComp, conn.sourcePinId) },
      to: { node: toNum, term: mapPinToAnalogTermIndex(toComp, conn.targetPinId) },
    });
  }

  return { analogNodes, analogWires, idToNum, numToComp };
}

/**
 * Standalone AC small-signal complex MNA frequency sweep on the active CircuitProjectModel.
 */
export function runUnifiedAcSimulation(
  model: CircuitProjectModel,
  options: Omit<AcSweepOptions, "outputNetId"> & { outputNetName?: string; outputComponentId?: string }
): AcSweepResult {
  const { analogNodes, analogWires, idToNum } = circuitModelToAnalogGraph(model);
  const dcOp = runNgspiceOperatingPoint(analogNodes, analogWires, undefined, { strictGround: true });
  const dcV = dcOp.convergence.solutionVectorX.slice(0, dcOp.convergence.unknownNodesCount);

  let outputNetId: number | undefined;
  if (options.outputComponentId) {
    const numId = idToNum.get(options.outputComponentId);
    if (numId !== undefined) {
      const n0 = dcOp.getTermNet(numId, 0);
      const n1 = dcOp.getTermNet(numId, 1);
      outputNetId = n0 !== 0 ? n0 : n1;
    }
  } else if (options.outputNetName) {
    const net = model.nets.find((n) => n.netName === options.outputNetName);
    if (net && net.connectedPins.length > 0) {
      const cp = net.connectedPins[0];
      const numId = idToNum.get(cp.componentId);
      const comp = model.components.find((c) => c.id === cp.componentId);
      if (numId !== undefined && comp) {
        outputNetId = dcOp.getTermNet(numId, mapPinToAnalogTermIndex(comp, cp.pinId));
      }
    }
  }

  return runNgspiceAcSweep(analogNodes, analogWires, {
    ...options,
    outputNetId,
    strictGround: true,
    dcOperatingVoltages: dcV,
  });
}

/**
 * Standalone MNA Time-Domain Transient simulation on the active CircuitProjectModel.
 */
export function runUnifiedTransientSimulation(
  model: CircuitProjectModel,
  options: {
    tStart?: number;
    tStop: number;
    dt: number;
    method?: "BE" | "TRAPEZOIDAL";
    initialCapVoltagesByCompId?: Record<string, number>;
    initialIndCurrentsByCompId?: Record<string, number>;
    sourceTimeOverridesByCompId?: Record<string, (tSec: number) => number>;
  }
): TransientAnalysisResult & { compIdToNum: Map<string, number> } {
  const { analogNodes, analogWires, idToNum } = circuitModelToAnalogGraph(model);
  const initialCapVoltages: Record<number, number> = {};
  const initialIndCurrents: Record<number, number> = {};
  const sourceTimeOverrides: Record<number, (tSec: number) => number> = {};

  if (options.initialCapVoltagesByCompId) {
    for (const [cid, v] of Object.entries(options.initialCapVoltagesByCompId)) {
      const nid = idToNum.get(cid);
      if (nid !== undefined) initialCapVoltages[nid] = v;
    }
  }
  if (options.initialIndCurrentsByCompId) {
    for (const [cid, iVal] of Object.entries(options.initialIndCurrentsByCompId)) {
      const nid = idToNum.get(cid);
      if (nid !== undefined) initialIndCurrents[nid] = iVal;
    }
  }
  if (options.sourceTimeOverridesByCompId) {
    for (const [cid, fn] of Object.entries(options.sourceTimeOverridesByCompId)) {
      const nid = idToNum.get(cid);
      if (nid !== undefined) sourceTimeOverrides[nid] = fn;
    }
  }

  const res = runNgspiceTransient(analogNodes, analogWires, {
    tStart: options.tStart ?? 0,
    tStop: options.tStop,
    dt: options.dt,
    method: options.method ?? "TRAPEZOIDAL",
    initialCapVoltages,
    initialIndCurrents,
    sourceTimeOverrides,
    strictGround: true,
  });

  return { ...res, compIdToNum: idToNum };
}

export function runUnifiedCircuitSimulation(
  model: CircuitProjectModel,
  options?: {
    simTime?: number;
    legacyFallbackProject?: InteractiveProject;
    acSweep?: Omit<AcSweepOptions, "outputNetId">;
    transient?: { tStop?: number; dt?: number; method?: "BE" | "TRAPEZOIDAL" };
  }
): UnifiedSimulationOutput {
  const simTime = options?.simTime ?? 0;
  const isPowered = model.simulationConfig.isPowered;
  const supplyVoltage = model.simulationConfig.supplyVoltage;
  const validation = validateCircuitGraph(model.components, model.connections);

  if (!isPowered) {
    const offNets: Record<string, number> = { GND: 0 };
    model.nets.forEach((n) => {
      offNets[n.netName] = 0;
    });
    return {
      netVoltages: offNets,
      branchCurrents: { I_supply: 0 },
      componentTelemetry: {},
      reqOhm: null,
      totalSupplyCurrentMa: 0,
      totalLoadPowerMw: 0,
      topologyClass: "POWER OFF",
      validation,
      converged: true,
      waveforms: Array.from({ length: 40 }).map((_, i) => ({
        time: Number((i * 0.01).toFixed(3)),
        vIn: 0,
        vOut: 0,
        vCap: 0,
        current: 0,
      })),
      metrics: [
        { label: "Operating State", value: "POWER OFF", unit: "" },
        { label: "Supply Voltage", value: "0.00", unit: "V" },
        { label: "Total Supply Current", value: "0.00", unit: "mA" },
        { label: "Total Power", value: "0.00", unit: "mW" },
      ],
    };
  }

  // Only delegate purely programmable / digital-ic behavior (MCU, Logic IC, 555 Timer, OpAmp macromodel)
  // when unmodified and valid, while solving all discrete, RLC, diode, BJT, MOSFET, regulator stages through real MNA!
  const hasBehavioralIc = model.components.some(
    (c) =>
      c.type === "TIMER_555" ||
      c.type === "MICROCONTROLLER" ||
      c.type === "IC_LOGIC" ||
      c.type === "OPAMP"
  );

  if (
    hasBehavioralIc &&
    model.topology === "ORIGINAL" &&
    options?.legacyFallbackProject &&
    validation.errors.length === 0
  ) {
    const valMap: Record<string, number> = {};
    model.components.forEach((c) => {
      valMap[c.id] = c.nominalValue;
    });
    const legacyResult = options.legacyFallbackProject.simulationModel.compute(
      valMap,
      supplyVoltage,
      true,
      simTime
    );

    const anyDisconnIc = validation.disconnectedPins.some((dp) => {
      const comp = model.components.find((c) => c.id === dp.componentId);
      return comp && comp.type !== "TEST_POINT";
    });

    if (anyDisconnIc || validation.floatingComponents.length > 0) {
      return {
        netVoltages: { ...legacyResult.netVoltages, PULSE_OUT: 0, V_OUT: 0 },
        branchCurrents: { ...legacyResult.branchCurrents, I_supply: 0, I_load: 0 },
        componentTelemetry: {},
        reqOhm: null,
        totalSupplyCurrentMa: 0,
        totalLoadPowerMw: 0,
        topologyClass: `${model.topology} (Open/Floating Warning)`,
        validation,
        converged: false,
        abortedReason: "Component pin disconnected or floating circuit island detected.",
        waveforms: legacyResult.waveforms.map((pt) => ({ ...pt, vOut: 0, current: 0 })),
        metrics: [
          { label: "Circuit State", value: "OPEN / FLOATING", unit: "", formula: "Pin disconnected" },
          ...legacyResult.metrics.slice(1, 5),
        ],
      };
    }

    return {
      netVoltages: legacyResult.netVoltages,
      branchCurrents: legacyResult.branchCurrents,
      componentTelemetry: {},
      reqOhm: null,
      totalSupplyCurrentMa:
        legacyResult.branchCurrents.I_supply ??
        legacyResult.branchCurrents.I_vcc ??
        0,
      totalLoadPowerMw: 0,
      topologyClass: `${options.legacyFallbackProject.category}`,
      validation,
      converged: true,
      waveforms: legacyResult.waveforms,
      metrics: legacyResult.metrics,
    };
  }

  // Abort cleanly on blocking structural validation errors (Missing Ground, Short Circuit, Invalid Value)
  if (!validation.valid) {
    const reason = validation.errors.map((e) => `[${e.code}] ${e.message}`).join(" | ");
    return {
      netVoltages: { GND: 0 },
      branchCurrents: {},
      componentTelemetry: {},
      reqOhm: null,
      totalSupplyCurrentMa: 0,
      totalLoadPowerMw: 0,
      topologyClass: "VALIDATION ERROR",
      validation,
      converged: false,
      abortedReason: reason,
      waveforms: [],
      metrics: [
        {
          label: "Validation Error",
          value: validation.errors[0]?.code || "ERROR",
          unit: "",
          formula: validation.errors[0]?.message || reason,
        },
      ],
    };
  }

  // Convert active CircuitProjectModel to MNA graph
  const { analogNodes, analogWires, idToNum, numToComp } = circuitModelToAnalogGraph(model);

  const mna = runNgspiceOperatingPoint(analogNodes, analogWires, undefined, { strictGround: true });

  if (!mna.convergence.converged || !mna.validation.valid) {
    const extraErrors: CircuitValidationIssue[] = mna.validation.errors.map((d: NetlistDiagnostic) => ({
      severity: "error",
      code: d.code as CircuitValidationIssue["code"],
      message: d.message,
    }));
    const mergedValidation: CircuitValidationReport = {
      ...validation,
      valid: false,
      errors: [...validation.errors, ...extraErrors],
    };
    const reason = mna.abortedReason || extraErrors[0]?.message || "MNA Solver failed to converge.";
    return {
      netVoltages: { GND: 0 },
      branchCurrents: {},
      componentTelemetry: {},
      reqOhm: null,
      totalSupplyCurrentMa: 0,
      totalLoadPowerMw: 0,
      topologyClass: "SOLVER ERROR",
      validation: mergedValidation,
      converged: false,
      abortedReason: reason,
      kclMaxResidualA: mna.convergence.kclMaxResidualA,
      waveforms: [],
      metrics: [
        {
          label: "Solver Status",
          value: "FAILED",
          unit: "",
          formula: reason,
        },
      ],
    };
  }

  // Build netVoltages dictionary mapped to user-facing netNames
  const netVoltages: Record<string, number> = { GND: 0 };
  for (const net of model.nets) {
    let matchedV = 0;
    for (const cp of net.connectedPins) {
      const comp = model.components.find((c) => c.id === cp.componentId);
      const numId = idToNum.get(cp.componentId);
      if (comp && numId) {
        const termIdx = mapPinToAnalogTermIndex(comp, cp.pinId);
        const mnaNetId = mna.getTermNet(numId, termIdx);
        matchedV = mna.getNetVoltage(mnaNetId);
        break;
      }
    }
    netVoltages[net.netName] = Number(matchedV.toFixed(4));
  }

  const componentTelemetry: UnifiedSimulationOutput["componentTelemetry"] = {};
  const branchCurrents: Record<string, number> = {};
  let totalSupplyCurrentMa = 0;

  for (const branch of mna.branchSolutions) {
    const comp = numToComp.get(branch.nodeId);
    if (!comp) continue;
    componentTelemetry[comp.id] = {
      vDrop: Number(branch.vDrop.toFixed(4)),
      current_mA: Number(branch.current_mA.toFixed(3)),
      power_mW: Number(branch.power_mW.toFixed(3)),
      operatingRegion: branch.operatingRegion,
    };
    branchCurrents[`I_${comp.refDes}`] = Number(branch.current_mA.toFixed(3));
    if (comp.type === "VOLTAGE_SOURCE") {
      totalSupplyCurrentMa += Math.abs(branch.current_mA);
      branchCurrents["I_supply"] = Number(totalSupplyCurrentMa.toFixed(3));
    }
  }

  if (branchCurrents["I_supply"] === undefined) {
    branchCurrents["I_supply"] = Number((mna.totalLoadPowerMw / Math.max(0.1, supplyVoltage)).toFixed(3));
  }

  // Genuine Numerical MNA Time-Domain Transient Solver for Waveforms
  const caps = model.components.filter((c) => c.type === "CAPACITOR" || c.type === "CAPACITOR_POLARIZED");
  const inductors = model.components.filter((c) => c.type === "INDUCTOR");
  const resistors = model.components.filter((c) => c.type === "RESISTOR" || c.type === "POTENTIOMETER");
  const vSrcComps = model.components.filter((c) => c.type === "VOLTAGE_SOURCE");
  const isAcSourceProject =
    model.name.toLowerCase().includes("rectifier") ||
    model.projectId.includes("rectifier") ||
    vSrcComps.some((v) => v.name.toLowerCase().includes("ac") || v.partNumber.toLowerCase().includes("ac"));

  const hasReactiveOrAc = caps.length > 0 || inductors.length > 0 || isAcSourceProject;

  let waveforms: WaveformPoint[] = [];
  let transientRaw: TransientAnalysisResult | undefined;

  if (hasReactiveOrAc && (options?.transient || caps.length > 0 || inductors.length > 0 || isAcSourceProject)) {
    const rEst = resistors.reduce((acc, r) => acc + Math.max(1, r.nominalValue), 0) || 1000;
    const cEst = caps.reduce((acc, c) => acc + getCapacitanceInUf(c) * 1e-6, 0);
    const lEst = inductors.reduce((acc, l) => acc + l.nominalValue * 1e-3, 0);

    let defaultTStop = 0.04; // 40ms = 2 cycles @ 50Hz
    if (!isAcSourceProject) {
      if (cEst > 0) defaultTStop = Math.max(1e-4, Math.min(2.0, 5 * rEst * cEst));
      else if (lEst > 0) defaultTStop = Math.max(1e-5, Math.min(2.0, 5 * (lEst / rEst)));
    }
    const tStop = options?.transient?.tStop ?? defaultTStop;
    const steps = 100;
    const dt = options?.transient?.dt ?? tStop / steps;

    const sourceTimeOverrides: Record<number, (tSec: number) => number> = {};
    if (isAcSourceProject) {
      for (const vsComp of vSrcComps) {
        const vsNum = idToNum.get(vsComp.id);
        if (vsNum !== undefined) {
          const vPk = vsComp.nominalValue || supplyVoltage;
          sourceTimeOverrides[vsNum] = (tSec: number) => vPk * Math.sin(2 * Math.PI * 50 * tSec);
        }
      }
    }

    transientRaw = runNgspiceTransient(analogNodes, analogWires, {
      tStart: 0,
      tStop,
      dt,
      method: options?.transient?.method ?? "TRAPEZOIDAL",
      sourceTimeOverrides,
      strictGround: true,
    });

    if (transientRaw.converged && transientRaw.timePointsS.length > 0) {
      const vsNum = vSrcComps[0] ? idToNum.get(vSrcComps[0].id) : undefined;
      const vsNetPos = vsNum !== undefined ? mna.getTermNet(vsNum, 0) : 1;

      // Pick primary output net from solved non-VCC non-GND nets
      const probeNetObj =
        model.nets.find((n) => !n.isGround && !n.netName.startsWith("VCC") && !n.netName.includes("PARALLEL_BUS_POS")) ||
        model.nets.find((n) => !n.isGround);

      let outNetId = vsNetPos;
      if (caps.length > 0) {
        const capNum = idToNum.get(caps[0].id);
        if (capNum !== undefined) {
          const c0 = mna.getTermNet(capNum, 0);
          const c1 = mna.getTermNet(capNum, 1);
          outNetId = c0 !== 0 ? c0 : c1;
        }
      } else if (probeNetObj && probeNetObj.connectedPins.length > 0) {
        const cp = probeNetObj.connectedPins[0];
        const cpNum = idToNum.get(cp.componentId);
        const cpComp = model.components.find((c) => c.id === cp.componentId);
        if (cpNum !== undefined && cpComp) {
          outNetId = mna.getTermNet(cpNum, mapPinToAnalogTermIndex(cpComp, cp.pinId));
        }
      }

      const capNumFirst = caps[0] ? idToNum.get(caps[0].id) : undefined;
      // Downsample evenly to <= 80 points for smooth chart rendering while keeping exact solved values
      const totalPts = transientRaw.timePointsS.length;
      const stride = Math.max(1, Math.floor(totalPts / 80));

      for (let i = 0; i < totalPts; i += stride) {
        const tMs = transientRaw.timePointsS[i] * 1000;
        const vInVal = transientRaw.netVoltagesHistory[vsNetPos]?.[i] ?? supplyVoltage;
        const vOutVal = transientRaw.netVoltagesHistory[outNetId]?.[i] ?? 0;
        const vCapVal =
          capNumFirst !== undefined
            ? transientRaw.capVoltagesHistory[capNumFirst]?.[i] ?? vOutVal
            : vOutVal;
        const iSupMa =
          vsNum !== undefined
            ? Math.abs(transientRaw.compCurrentsMaHistory[vsNum]?.[i] ?? 0)
            : totalSupplyCurrentMa;

        waveforms.push({
          time: Number(tMs.toFixed(3)),
          vIn: Number(vInVal.toFixed(4)),
          vOut: Number(vOutVal.toFixed(4)),
          vCap: Number(vCapVal.toFixed(4)),
          current: Number(iSupMa.toFixed(3)),
        });
      }
    }
  }

  // For pure DC resistive / steady-state circuits, output true DC operating point across time
  if (waveforms.length === 0) {
    const probeKey =
      Object.keys(netVoltages).find(
        (k) => k !== "GND" && k !== "VCC" && !k.startsWith("VCC_")
      ) ||
      Object.keys(netVoltages).find((k) => k !== "GND") ||
      "VCC";
    const vProbe = netVoltages[probeKey] ?? 0;

    for (let i = 0; i < 40; i++) {
      waveforms.push({
        time: i,
        vIn: supplyVoltage,
        vOut: Number(vProbe.toFixed(4)),
        vCap: Number(vProbe.toFixed(4)),
        current: Number(totalSupplyCurrentMa.toFixed(3)),
      });
    }
  }

  const acSweep = options?.acSweep ? runUnifiedAcSimulation(model, options.acSweep) : undefined;

  const nonZeroVoltages = Object.entries(netVoltages).filter(([k]) => k !== "GND");
  const primaryOutNet =
    nonZeroVoltages.find(([k]) => !k.startsWith("VCC") && !k.includes("PARALLEL_BUS_POS")) ||
    nonZeroVoltages[0];

  const metrics: SimulationResultMetrics[] = [
    {
      label: "Topology",
      value: mna.topologyClass.length > 22 ? mna.topologyClass.slice(0, 22) : mna.topologyClass,
      unit: "",
      formula: "MNA Netlist Graph",
    },
    {
      label: "Equivalent Resistance",
      value: mna.reqOhm !== null && isFinite(mna.reqOhm) ? mna.reqOhm.toFixed(2) : "N/A",
      unit: mna.reqOhm !== null ? "Ω" : "",
      formula: "R_eq = V_S / I_total",
    },
    {
      label: "Total Supply Current",
      value: totalSupplyCurrentMa.toFixed(3),
      unit: "mA",
      formula: "KCL Supply Branch",
    },
    {
      label: "Total Load Power",
      value: mna.totalLoadPowerMw.toFixed(2),
      unit: "mW",
      formula: "P = Σ V_drop · I",
    },
    {
      label: primaryOutNet ? `V(${primaryOutNet[0]})` : "V_out",
      value: (primaryOutNet ? primaryOutNet[1] : 0).toFixed(3),
      unit: "V",
      formula: "MNA Nodal Potential",
    },
    {
      label: "Components / Nets",
      value: `${model.components.length} / ${model.nets.length}`,
      unit: "",
      formula: validation.valid ? "MNA Converged" : `${validation.errors.length} Error(s)`,
    },
  ];

  return {
    netVoltages,
    branchCurrents,
    componentTelemetry,
    reqOhm: mna.reqOhm,
    totalSupplyCurrentMa: Number(totalSupplyCurrentMa.toFixed(4)),
    totalLoadPowerMw: Number(mna.totalLoadPowerMw.toFixed(4)),
    topologyClass: mna.topologyClass,
    validation,
    converged: mna.convergence.converged,
    kclMaxResidualA: mna.convergence.kclMaxResidualA,
    acSweep,
    transientRaw,
    waveforms,
    metrics,
  };
}

/* ============================================================================
 * 7. Dynamic Bill of Materials Builder
 * ============================================================================ */

export function buildDynamicBOM(components: CircuitComponentInstance[]): ProjectBOMItem[] {
  const grouped = new Map<
    string,
    {
      designators: string[];
      description: string;
      partNumber: string;
      packageType: string;
      unitCost: string;
    }
  >();

  for (const c of components) {
    if (c.type === "GROUND" || c.type === "TEST_POINT") continue;
    const key = `${c.type}::${c.displayValue}::${c.partNumber}`;
    const existing = grouped.get(key);
    if (existing) {
      existing.designators.push(c.refDes);
    } else {
      grouped.set(key, {
        designators: [c.refDes],
        description: `${c.name} (${c.displayValue})`,
        partNumber: c.partNumber || c.type,
        packageType: c.packageType || "Standard",
        unitCost:
          c.type === "MICROCONTROLLER"
            ? "$4.50"
            : c.type === "OPAMP" || c.type === "TIMER_555" || c.type === "IC_LOGIC"
            ? "$0.65"
            : c.type === "RESISTOR"
            ? "$0.02"
            : "$0.15",
      });
    }
  }

  let itemNumber = 1;
  return Array.from(grouped.values()).map((g) => ({
    itemNumber: itemNumber++,
    designators: g.designators,
    quantity: g.designators.length,
    description: g.description,
    partNumber: g.partNumber,
    manufacturer: "Verified Lab Stock",
    package: g.packageType,
    estUnitCost: g.unitCost,
  }));
}
