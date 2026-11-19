/**
 * Unified Single-Source-of-Truth Circuit Data Model
 *
 * Used across schematic rendering, component inspection, topology rewiring,
 * MNA/SPICE simulation, and isolated per-project persistence.
 */

import type {
  ComponentTeachingInfo,
  ComponentType,
  InteractiveProject,
  ProjectCategory,
  SchematicComponent,
  SchematicComponentPin,
  SchematicWire,
} from "./interactiveSchematic";

export type CircuitOrientation = 0 | 90 | 180 | 270;

export type CircuitTopology =
  | "ORIGINAL"
  | "SERIES"
  | "PARALLEL"
  | "COMBINATION"
  | "CUSTOM";

export type CircuitPin = SchematicComponentPin;

export interface CircuitComponentInstance {
  id: string;
  refDes: string;
  name: string;
  type: ComponentType;
  nominalValue: number;
  unit: string;
  displayValue: string;
  properties: Record<string, string | number | boolean>;
  position: { x: number; y: number };
  orientation: CircuitOrientation;
  pins: CircuitPin[];
  editable?: boolean;
  minVal?: number;
  maxVal?: number;
  stepVal?: number;
  tolerance?: string;
  rating?: string;
  packageType: string;
  partNumber: string;
  hardwarePos?: SchematicComponent["hardwarePos"];
  teachingInfo: ComponentTeachingInfo;
}

export interface CircuitConnection {
  id: string;
  sourceComponentId: string;
  sourcePinId: string;
  targetComponentId: string;
  targetPinId: string;
  netName: string;
  signalType: SchematicWire["signalType"];
  wireColor: string;
  waypoints?: { x: number; y: number }[];
}

export interface CircuitNet {
  netId: number;
  netName: string;
  isGround: boolean;
  isPower: boolean;
  connectedPins: { componentId: string; pinId: string }[];
  voltageV: number;
}

export interface CircuitSimulationConfig {
  mode: "DC" | "TRANSIENT" | "AC_SWEEP";
  supplyVoltage: number;
  supplyVoltageUnit: string;
  isPowered: boolean;
  frequencyHz: number;
  simSpeed: number;
}

export interface CircuitValidationIssue {
  severity: "error" | "warning";
  code:
    | "EMPTY_CIRCUIT"
    | "MISSING_SOURCE"
    | "MISSING_GROUND"
    | "DISCONNECTED_PIN"
    | "FLOATING_COMPONENT"
    | "SHORT_CIRCUIT";
  message: string;
  componentId?: string;
  pinId?: string;
}

export interface CircuitValidationReport {
  valid: boolean;
  errors: CircuitValidationIssue[];
  warnings: CircuitValidationIssue[];
  disconnectedPins: { componentId: string; refDes: string; pinId: string }[];
  floatingComponents: string[];
}

export interface CircuitProjectMetadata {
  createdAt: number;
  updatedAt: number;
  isModified: boolean;
  version: number;
  isCustom?: boolean;
  sourcePresetId?: string;
}

export interface CircuitProjectModel {
  projectId: string;
  circuitId: string;
  name: string;
  description: string;
  category: ProjectCategory | string;
  subjectDomain?: InteractiveProject["subjectDomain"];
  topology: CircuitTopology;
  components: CircuitComponentInstance[];
  connections: CircuitConnection[];
  nets: CircuitNet[];
  simulationConfig: CircuitSimulationConfig;
  metadata: CircuitProjectMetadata;
}
