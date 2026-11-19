/**
 * IST Circuit & Logic Lab — Professional Interactive Circuit Schematics System
 * Core Types & Interfaces
 * 
 * Strict IEEE Std 315 / IEC 60617 schematic symbols, unified netlist definitions,
 * realistic hardware footprints, live analytical simulation, and comprehensive
 * engineering documentation.
 */

export type ProjectCategory =
  | "Embedded & Microcontroller"
  | "Analog & Op-Amp / Timers"
  | "Power Electronics"
  | "Digital Logic & FSM"
  | "Transistors & Fundamentals"
  | "Optical & Wireless";

export type ComponentType =
  | "RESISTOR"
  | "CAPACITOR"
  | "CAPACITOR_POLARIZED"
  | "INDUCTOR"
  | "DIODE"
  | "LED"
  | "BJT_NPN"
  | "BJT_PNP"
  | "MOSFET_N"
  | "OPAMP"
  | "TIMER_555"
  | "IC_LOGIC"
  | "VOLTAGE_REGULATOR"
  | "MICROCONTROLLER"
  | "VOLTAGE_SOURCE"
  | "GROUND"
  | "SWITCH"
  | "POTENTIOMETER"
  | "SENSOR"
  | "ACTUATOR"
  | "TEST_POINT";

export interface SchematicComponentPin {
  id: string;
  name: string;
  number: number | string;
  type: "input" | "output" | "power" | "ground" | "passive" | "bidirectional";
  description?: string;
  defaultVoltage?: number;
}

export interface ComponentTeachingInfo {
  role: string;
  rationale: string;
  electricalProps: string;
  inOutExplanation: string;
  circuitImpact: string;
}

export interface SchematicComponent {
  id: string;
  refDes: string; // e.g. "R1", "C1", "U1", "Q1", "ESP1"
  name: string;
  type: ComponentType;
  nominalValue: number;
  unit: string;
  displayValue: string;
  editable?: boolean;
  minVal?: number;
  maxVal?: number;
  stepVal?: number;
  tolerance?: string;
  rating?: string;
  packageType: string;
  partNumber: string;
  pins: SchematicComponentPin[];
  schematicPos: { x: number; y: number; rotation?: number };
  hardwarePos?: {
    type: "BREADBOARD" | "BOARD_HEADER" | "STANDALONE";
    col?: number;
    row?: string;
    pinSpan?: number;
    boardPinMap?: Record<string, string>;
  };
  teachingInfo: ComponentTeachingInfo;
}

export interface SchematicWire {
  id: string;
  from: { componentId: string; pinId: string };
  to: { componentId: string; pinId: string };
  netName: string;
  signalType: "POWER" | "GROUND" | "ANALOG_SIGNAL" | "DIGITAL_PULSE" | "HIGH_CURRENT";
  wireColor: string;
  waypoints?: { x: number; y: number }[];
}

export interface SchematicNet {
  name: string;
  connectedPins: { componentId: string; pinId: string }[];
  nominalVoltage: number;
  isPower?: boolean;
  isGround?: boolean;
}

export interface SimulationResultMetrics {
  label: string;
  value: string;
  unit: string;
  formula?: string;
}

export interface WaveformPoint {
  time: number;
  vIn?: number;
  vOut?: number;
  vCap?: number;
  current?: number;
  logicState?: number;
  [key: string]: number | undefined;
}

export interface ProjectSimulationModel {
  type: "ANALOG_TIMING" | "AMPLIFIER" | "POWER_CONVERTER" | "DIGITAL_LOGIC" | "MICROCONTROLLER" | "RESONANCE" | "RECTIFIER";
  compute: (
    components: Record<string, number>,
    supplyVoltage: number,
    isPowered: boolean,
    time: number
  ) => {
    netVoltages: Record<string, number>;
    branchCurrents: Record<string, number>;
    waveforms: WaveformPoint[];
    metrics: SimulationResultMetrics[];
  };
}

export interface ProjectDatasheet {
  title: string;
  manufacturer: string;
  package: string;
  absoluteMaxRatings: { parameter: string; limit: string; condition: string }[];
  recommendedOperatingConditions: { parameter: string; min: string; typ: string; max: string; unit: string }[];
  pinoutDiagram: { pinNumber: number | string; pinName: string; func: string }[];
}

export interface ProjectBOMItem {
  itemNumber: number;
  designators: string[];
  quantity: number;
  description: string;
  partNumber: string;
  manufacturer: string;
  package: string;
  estUnitCost: string;
}

export interface DesignCalculationStep {
  step: string;
  formula: string;
  calculation: string;
  result: string;
}

export interface TroubleshootingItem {
  symptom: string;
  possibleCause: string;
  diagnosticCheck: string;
  solution: string;
}

export interface ExperimentQuestion {
  question: string;
  answer: string;
  theoryRef: string;
}

export interface ProjectSourceCode {
  language: "cpp" | "python" | "verilog" | "spice" | "c";
  title: string;
  filename: string;
  code: string;
  description?: string;
  alternateFiles?: {
    filename: string;
    title: string;
    language: "cpp" | "python" | "verilog" | "spice" | "c";
    code: string;
    description?: string;
  }[];
}

export interface ProjectDocumentation {
  workingPrinciple: string;
  designCalculations: DesignCalculationStep[];
  sourceCode?: ProjectSourceCode;
  expectedWaveforms: {
    title: string;
    timebase: string;
    vDiv: string;
    expectedValues: string;
    description: string;
  };
  troubleshooting: TroubleshootingItem[];
  experimentQuestions: ExperimentQuestion[];
}

export interface InteractiveProject {
  id: string;
  title: string;
  category: ProjectCategory;
  subjectDomain: "A" | "B" | "C" | "D" | "E";
  domainTitle: string;
  description: string;
  isConceptual?: boolean;
  defaultSupplyVoltage: number;
  supplyVoltageUnit: string;
  components: SchematicComponent[];
  wires: SchematicWire[];
  simulationModel: ProjectSimulationModel;
  documentation: ProjectDocumentation;
  bom: ProjectBOMItem[];
  datasheets: Record<string, ProjectDatasheet>;
  teachingSteps: {
    title: string;
    description: string;
    highlightComponentIds: string[];
    highlightWireIds?: string[];
  }[];
}
