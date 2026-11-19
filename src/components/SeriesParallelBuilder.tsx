import React, { useState, useMemo, useRef, useCallback, useEffect } from "react";
import {
  RotateCw,
  Trash2,
  RotateCcw,
  Zap,
  CheckCircle2,
  Sliders,
  Search,
  X,
  Play,
  Pause,
  Layers,
  Gauge,
  Cpu,
  AlertTriangle,
  AlertCircle,
  TrendingUp,
  Sparkles,
  Undo2,
  Redo2,
  Save,
  CopyPlus,
  ChevronDown,
  ChevronUp,
  PanelLeftClose,
  PanelLeftOpen,
  FileText,
  Download,
  Grid3X3,
  Compass,
} from "lucide-react";
import {
  saveBuilderProject,
  listBuilderProjects,
  type BuilderProjectRecord,
} from "../utils/circuitProjectStore";
import {
  PROBE_CHANNELS,
  AttachedWireProbe,
  ProbedWireSignal,
  SvgWireProbeClip,
  OscilloscopeProbeDock,
  WireProbePopupWindow,
} from "./WireProbePopupWindow";
import MultisimInstrumentsPanel, {
  FunctionGenConfig,
  type SpiceAnalysisTab,
} from "./MultisimInstrumentsPanel";
import TransistorConfigModal, {
  TransistorConfig,
  DEFAULT_TRANSISTOR_CONFIGS,
  isThreeTerminalComponent,
  isTransistorOrSemiconductor,
  getTerminalLabels,
  getAnalogTerminalCount,
} from "./TransistorConfigModal";
import {
  runNgspiceOperatingPoint,
  runNgspiceTransient,
  solveDenseMnaSystem,
  formatSpiceCard,
  serializeAnalogCircuitToSpiceNetlist,
} from "../utils/ngspiceEngine";
import {
  findAnalogOpenCircuits,
  OpenCircuitIssue,
} from "../utils/openCircuitDetector";
import BjtCurveTracerModal, {
  BjtComponentItem,
} from "./BjtCurveTracerModal";
import CircuitLab3DView from "./CircuitLab3DView";
import SimulationErrorBoundary from "./SimulationErrorBoundary";
import MatrixDebugView from "./MatrixDebugView";
import SpiceGuidedTourOverlay, {
  type SpiceTourStepId,
} from "./SpiceGuidedTourOverlay";

export type AnalogCompType =
  | "VS"
  | "FG"
  | "IS"
  | "SW"
  | "R"
  | "POT"
  | "L"
  | "C"
  | "CPOL"
  | "CNP"
  | "D"
  | "D1N4007"
  | "ZD"
  | "LED"
  | "MOS"
  | "BJT"
  | "BC547"
  | "BC557"
  | "JFET"
  | "OPAMP"
  | "SCR"
  | "DIAC"
  | "TRIAC"
  | "REG7805"
  | "NE555"
  | "HB"
  | "VM"
  | "AM"
  | "GND";

export type BuilderLabMode = "lca" | "power" | "cd" | "edc" | "rlc";

export interface AnalogNode {
  id: number;
  type: AnalogCompType;
  label: string;
  x: number;
  y: number;
  orient: "H" | "V";
  value: number; // V for VS/D/ZD, mA for IS, Ohms for R, mH for L, uF for C, 1/0 for SW/MOS, beta for BJT
  transistorConfig?: TransistorConfig;
}

export interface AnalogWire {
  id: number;
  from: { node: number; term: number };
  to: { node: number; term: number };
}

interface ScenarioPreset {
  name: string;
  lab: BuilderLabMode | "all";
  category: string;
  description: string;
  formula: string;
  nodes: Omit<AnalogNode, "id">[];
  wires: [number, number, number, number][];
}

const SCENARIO_PRESETS: ScenarioPreset[] = [
  {
    name: "Series Circuit (3-Resistor Voltage Divider)",
    lab: "lca",
    category: "Series",
    description:
      "Three resistors (R1=100Ω, R2=200Ω, R3=300Ω) in a single series loop with a 12V source and interactive switch SW1. Click SW1 to open/close the loop.",
    formula: "R_eq = R1 + R2 + R3 = 600 Ω  ·  I = V_S / R_eq = 20.00 mA",
    nodes: [
      { type: "VS", label: "VS1", x: 90, y: 200, orient: "V", value: 12 },
      { type: "SW", label: "SW1", x: 200, y: 80, orient: "H", value: 1 },
      { type: "R", label: "R1", x: 350, y: 80, orient: "H", value: 100 },
      { type: "R", label: "R2", x: 510, y: 80, orient: "H", value: 200 },
      { type: "R", label: "R3", x: 630, y: 200, orient: "V", value: 300 },
      { type: "GND", label: "GND", x: 90, y: 350, orient: "V", value: 0 },
    ],
    wires: [
      [0, 0, 1, 0],
      [1, 1, 2, 0],
      [2, 1, 3, 0],
      [3, 1, 4, 0],
      [4, 1, 0, 1],
      [0, 1, 5, 0],
    ],
  },
  {
    name: "Parallel Circuit (3-Branch Current Divider)",
    lab: "lca",
    category: "Parallel",
    description:
      "Three parallel resistor branches (R1=100Ω, R2=200Ω, R3=300Ω) across a 12V source. Branch voltage is identical (12V); currents divide inversely with resistance.",
    formula:
      "1/R_eq = 1/R1 + 1/R2 + 1/R3 ⇒ R_eq = 54.55 Ω  ·  I_total = 220.00 mA",
    nodes: [
      { type: "VS", label: "VS1", x: 100, y: 190, orient: "V", value: 12 },
      { type: "R", label: "R1", x: 270, y: 190, orient: "V", value: 100 },
      { type: "R", label: "R2", x: 430, y: 190, orient: "V", value: 200 },
      { type: "R", label: "R3", x: 590, y: 190, orient: "V", value: 300 },
      { type: "GND", label: "GND", x: 100, y: 340, orient: "V", value: 0 },
    ],
    wires: [
      [0, 0, 1, 0],
      [1, 0, 2, 0],
      [2, 0, 3, 0],
      [0, 1, 1, 1],
      [1, 1, 2, 1],
      [2, 1, 3, 1],
      [0, 1, 4, 0],
    ],
  },
  {
    name: "Series-Parallel Combination Ladder",
    lab: "lca",
    category: "Combination",
    description:
      "Series resistor R1=100Ω feeding a parallel bank of R2=200Ω and R3=200Ω with a Digital Voltmeter probe across the parallel load.",
    formula: "R_eq = R1 + (R2 ∥ R3) = 100 + 100 = 200 Ω  ·  I_total = 60.00 mA",
    nodes: [
      { type: "VS", label: "VS1", x: 90, y: 190, orient: "V", value: 12 },
      { type: "R", label: "R1", x: 240, y: 80, orient: "H", value: 100 },
      { type: "R", label: "R2", x: 410, y: 200, orient: "V", value: 200 },
      { type: "R", label: "R3", x: 550, y: 200, orient: "V", value: 200 },
      { type: "VM", label: "VM1", x: 670, y: 200, orient: "V", value: 0 },
      { type: "GND", label: "GND", x: 90, y: 340, orient: "V", value: 0 },
    ],
    wires: [
      [0, 0, 1, 0],
      [1, 1, 2, 0],
      [2, 0, 3, 0],
      [3, 0, 4, 0],
      [2, 1, 0, 1],
      [3, 1, 2, 1],
      [4, 1, 3, 1],
      [0, 1, 5, 0],
    ],
  },
  {
    name: "Wheatstone Bridge (Balanced & Unbalanced)",
    lab: "lca",
    category: "Bridge",
    description:
      "Four bridge arms (R1, R2, R3, R4) with center bridge resistor R5. Adjust any resistor to observe bridge balance (I_R5 = 0 mA when R1·R4 = R2·R3).",
    formula: "Balance Condition: R1 / R3 = R2 / R4  ⇒  V_A = V_B (I_R5 = 0 mA)",
    nodes: [
      { type: "VS", label: "VS1", x: 90, y: 200, orient: "V", value: 12 },
      { type: "R", label: "R1", x: 270, y: 110, orient: "V", value: 100 },
      { type: "R", label: "R2", x: 510, y: 110, orient: "V", value: 200 },
      { type: "R", label: "R5_Bridge", x: 390, y: 200, orient: "H", value: 150 },
      { type: "R", label: "R3", x: 270, y: 290, orient: "V", value: 100 },
      { type: "R", label: "R4", x: 510, y: 290, orient: "V", value: 200 },
      { type: "GND", label: "GND", x: 90, y: 350, orient: "V", value: 0 },
    ],
    wires: [
      [0, 0, 1, 0],
      [1, 0, 2, 0],
      [1, 1, 3, 0],
      [1, 1, 4, 0],
      [2, 1, 3, 1],
      [2, 1, 5, 0],
      [4, 1, 0, 1],
      [5, 1, 4, 1],
      [0, 1, 6, 0],
    ],
  },
  {
    name: "Dual-Source Multi-Loop KVL/KCL Network",
    lab: "lca",
    category: "Superposition",
    description:
      "Two DC voltage sources (VS1=12V, VS2=6V) driving a 3-resistor T-network (R1=100Ω, R2=200Ω, R3=150Ω).",
    formula: "(V_A − VS1)/R1 + V_A/R3 + (V_A − VS2)/R2 = 0",
    nodes: [
      { type: "VS", label: "VS1", x: 90, y: 200, orient: "V", value: 12 },
      { type: "R", label: "R1", x: 240, y: 90, orient: "H", value: 100 },
      { type: "R", label: "R3", x: 380, y: 200, orient: "V", value: 150 },
      { type: "R", label: "R2", x: 520, y: 90, orient: "H", value: 200 },
      { type: "VS", label: "VS2", x: 650, y: 200, orient: "V", value: 6 },
      { type: "GND", label: "GND", x: 380, y: 340, orient: "V", value: 0 },
    ],
    wires: [
      [0, 0, 1, 0],
      [1, 1, 2, 0],
      [2, 0, 3, 0],
      [3, 1, 4, 0],
      [0, 1, 2, 1],
      [4, 1, 2, 1],
      [2, 1, 5, 0],
    ],
  },
  {
    name: "Zener Diode Shunt Voltage Regulator & LED Load",
    lab: "cd",
    category: "Circuit & Devices",
    description:
      "12V source feeding series resistor R_S=150Ω, a 5.1V Zener Regulator Diode (ZD1), and a parallel LED load indicator with current-limiting resistor.",
    formula: "V_out ≈ V_Z = 5.1 V  ·  I_S = (V_S − V_Z) / R_S",
    nodes: [
      { type: "VS", label: "VS1", x: 90, y: 200, orient: "V", value: 12 },
      { type: "R", label: "R_S", x: 240, y: 80, orient: "H", value: 150 },
      { type: "ZD", label: "ZD1", x: 390, y: 200, orient: "V", value: 5.1 },
      { type: "R", label: "R_Load", x: 540, y: 140, orient: "V", value: 220 },
      { type: "LED", label: "LED1", x: 540, y: 270, orient: "V", value: 2.0 },
      { type: "VM", label: "VM_Out", x: 670, y: 200, orient: "V", value: 0 },
      { type: "GND", label: "GND", x: 90, y: 350, orient: "V", value: 0 },
    ],
    wires: [
      [0, 0, 1, 0],
      [1, 1, 2, 0],
      [2, 0, 3, 0],
      [3, 0, 5, 0],
      [3, 1, 4, 0],
      [2, 1, 0, 1],
      [4, 1, 2, 1],
      [5, 1, 4, 1],
      [0, 1, 6, 0],
    ],
  },
  {
    name: "Power MOSFET Buck Switching Stage & Inductor Filter",
    lab: "power",
    category: "Power Electronics",
    description:
      "24V DC bus switched by N-channel Power MOSFET (MOS1) with Gate driver supply V_Gate=10V and R_G=100Ω, feeding filter inductor L1=50mH, freewheeling diode D_FW, and load R_Load=100Ω.",
    formula: "Gate Pin 2 driven: V_GS = 10V > V_th  ·  MOSFET in triode/saturation conduct stage  ·  I_D flows through L1",
    nodes: [
      { type: "VS", label: "V_DC", x: 90, y: 220, orient: "V", value: 24 },
      { type: "VS", label: "V_Gate", x: 90, y: 80, orient: "H", value: 10 },
      { type: "R", label: "R_G", x: 230, y: 80, orient: "H", value: 100 },
      {
        type: "MOS",
        label: "MOS1",
        x: 350,
        y: 130,
        orient: "V",
        value: 1,
        transistorConfig: { ...DEFAULT_TRANSISTOR_CONFIGS.MOSFET, modelName: "IRF540N", vth: 3.0, rds_on: 0.04 },
      },
      { type: "D", label: "D_FW", x: 470, y: 230, orient: "V", value: 0.7 },
      { type: "L", label: "L1", x: 570, y: 130, orient: "H", value: 50 },
      { type: "C", label: "C_Out", x: 670, y: 230, orient: "V", value: 47 },
      { type: "R", label: "R_Load", x: 770, y: 230, orient: "V", value: 100 },
      { type: "GND", label: "GND", x: 90, y: 360, orient: "V", value: 0 },
    ],
    wires: [
      [0, 0, 3, 0], // V_DC (+) -> Drain (pin 0, top)
      [1, 1, 2, 0], // V_Gate (+) -> R_G (left)
      [2, 1, 3, 2], // R_G (right) -> Gate (pin 2, left)
      [3, 1, 4, 0], // Source (pin 1, bottom) -> Cathode of D_FW
      [3, 1, 5, 0], // Source (pin 1, bottom) -> L1 (left)
      [5, 1, 6, 0], // L1 (right) -> C_Out (+)
      [5, 1, 7, 0], // L1 (right) -> R_Load (top)
      [4, 1, 0, 1], // D_FW anode -> 0V return
      [6, 1, 0, 1], // C_Out (-) -> 0V return
      [7, 1, 0, 1], // R_Load bottom -> 0V return
      [1, 0, 0, 1], // V_Gate return -> 0V return
      [0, 1, 8, 0], // 0V return -> GND
    ],
  },
  {
    name: "EDC Transistor Base-Biased LED Driver Stage",
    lab: "edc",
    category: "EDC Lab",
    description:
      "12V V_CC supply driving NPN BJT (Q1_NPN) with 3-terminal wiring: Base fed via R_B=33kΩ, Collector switching LED load with R_C=330Ω, and Emitter stabilized by R_E=68Ω.",
    formula: "I_B = (V_CC − V_BE) / R_B  ·  I_C = β·I_B  ·  V_CE = V_CC − I_C·R_C − V_LED − I_E·R_E",
    nodes: [
      { type: "VS", label: "V_CC", x: 90, y: 220, orient: "V", value: 12 },
      { type: "R", label: "R_B", x: 230, y: 190, orient: "H", value: 33000 },
      { type: "R", label: "R_C", x: 380, y: 80, orient: "H", value: 330 },
      { type: "LED", label: "LED1", x: 510, y: 80, orient: "H", value: 2.0 },
      {
        type: "BJT",
        label: "Q1_NPN",
        x: 510,
        y: 190,
        orient: "V",
        value: 150,
        transistorConfig: { ...DEFAULT_TRANSISTOR_CONFIGS.BJT, modelName: "2N2222A", beta: 150 },
      },
      { type: "R", label: "R_E", x: 510, y: 300, orient: "V", value: 68 },
      { type: "GND", label: "GND", x: 90, y: 360, orient: "V", value: 0 },
    ],
    wires: [
      [0, 0, 1, 0], // V_CC (+) -> R_B (left)
      [0, 0, 2, 0], // V_CC (+) -> R_C (left)
      [2, 1, 3, 0], // R_C (right) -> LED1 anode (left)
      [3, 1, 4, 0], // LED1 cathode (right) -> Collector (pin 0, top)
      [1, 1, 4, 2], // R_B (right) -> Base (pin 2, left)
      [4, 1, 5, 0], // Emitter (pin 1, bottom) -> R_E (top)
      [5, 1, 0, 1], // R_E (bottom) -> 0V return
      [0, 1, 6, 0], // 0V return -> GND
    ],
  },
  {
    name: "BJT Common-Emitter Voltage-Divider Linear Amplifier",
    lab: "edc",
    category: "EDC Lab",
    description:
      "Universal voltage-divider biased NPN BJT amplifier. R1=47kΩ and R2=10kΩ set base voltage V_B≈2.63V; R_C=2.2kΩ and R_E=680Ω establish stable active forward Q-point.",
    formula: "V_B ≈ V_CC · R2/(R1+R2) = 2.63V  ·  V_E = V_B − 0.7V = 1.93V  ·  I_C ≈ I_E = 2.84mA  ·  V_C = V_CC − I_C·R_C = 8.75V",
    nodes: [
      { type: "VS", label: "V_CC", x: 80, y: 200, orient: "V", value: 15 },
      { type: "R", label: "R1", x: 240, y: 90, orient: "V", value: 47000 },
      { type: "R", label: "R2", x: 240, y: 240, orient: "V", value: 10000 },
      { type: "R", label: "R_C", x: 420, y: 90, orient: "V", value: 2200 },
      {
        type: "BJT",
        label: "Q1",
        x: 420,
        y: 200,
        orient: "V",
        value: 200,
        transistorConfig: { ...DEFAULT_TRANSISTOR_CONFIGS.BJT, modelName: "BC547B", beta: 200 },
      },
      { type: "R", label: "R_E", x: 420, y: 310, orient: "V", value: 680 },
      { type: "VM", label: "VM_VC", x: 560, y: 150, orient: "V", value: 0 },
      { type: "GND", label: "GND", x: 80, y: 350, orient: "V", value: 0 },
    ],
    wires: [
      [0, 0, 1, 0], // V_CC (+) -> R1 top
      [0, 0, 3, 0], // V_CC (+) -> R_C top
      [1, 1, 2, 0], // R1 bottom -> R2 top (Base node)
      [1, 1, 4, 2], // Base node -> Q1 Base (pin 2, left)
      [3, 1, 4, 0], // R_C bottom -> Q1 Collector (pin 0, top)
      [3, 1, 6, 0], // Collector node -> VM_VC (+)
      [4, 1, 5, 0], // Q1 Emitter (pin 1, bottom) -> R_E top
      [2, 1, 0, 1], // R2 bottom -> 0V return
      [5, 1, 0, 1], // R_E bottom -> 0V return
      [6, 1, 0, 1], // VM_VC (-) -> 0V return
      [0, 1, 7, 0], // 0V return -> GND
    ],
  },
  {
    name: "Series-Parallel RLC Filter & Impedance Network",
    lab: "rlc",
    category: "RLC Lab",
    description:
      "12V source driving series resistor R1=100Ω, inductor L1=50mH, and parallel damping resistor R2=200Ω with capacitor C1=10μF.",
    formula: "Z_DC = R1 + R_L + R2 = 300.05 Ω",
    nodes: [
      { type: "VS", label: "VS1", x: 90, y: 200, orient: "V", value: 12 },
      { type: "R", label: "R1", x: 230, y: 80, orient: "H", value: 100 },
      { type: "L", label: "L1", x: 400, y: 80, orient: "H", value: 50 },
      { type: "R", label: "R2", x: 530, y: 200, orient: "V", value: 200 },
      { type: "C", label: "C1", x: 650, y: 200, orient: "V", value: 10 },
      { type: "GND", label: "GND", x: 90, y: 350, orient: "V", value: 0 },
    ],
    wires: [
      [0, 0, 1, 0],
      [1, 1, 2, 0],
      [2, 1, 3, 0],
      [3, 0, 4, 0],
      [3, 1, 0, 1],
      [4, 1, 3, 1],
      [0, 1, 5, 0],
    ],
  },
  {
    name: "Simple Resistor Circuit (Single Loop)",
    lab: "lca",
    category: "Fundamentals",
    description:
      "Single-loop Ohm's Law benchmark circuit with 10V DC source, single 250Ω load resistor R1, and series Ammeter.",
    formula: "I = V_S / R1 = 10V / 250Ω = 40.00 mA  ·  P = V² / R = 400 mW",
    nodes: [
      { type: "VS", label: "VS1", x: 110, y: 200, orient: "V", value: 10 },
      { type: "AM", label: "AM1", x: 280, y: 100, orient: "H", value: 0 },
      { type: "R", label: "R1", x: 480, y: 200, orient: "V", value: 250 },
      { type: "GND", label: "GND", x: 110, y: 340, orient: "V", value: 0 },
    ],
    wires: [
      [0, 0, 1, 0],
      [1, 1, 2, 0],
      [2, 1, 0, 1],
      [0, 1, 3, 0],
    ],
  },
  {
    name: "Voltage Divider (2-Resistor Reference)",
    lab: "lca",
    category: "Fundamentals",
    description:
      "Unloaded two-resistor resistive potential divider (R1=1kΩ, R2=2kΩ) on a 12V DC bus. V_out = 12 × 2k / 3k = 8.00V.",
    formula: "V_out = V_S · R2 / (R1 + R2) = 8.00 V  ·  I = 4.00 mA",
    nodes: [
      { type: "VS", label: "VS1", x: 100, y: 200, orient: "V", value: 12 },
      { type: "R", label: "R1", x: 310, y: 110, orient: "V", value: 1000 },
      { type: "R", label: "R2", x: 310, y: 270, orient: "V", value: 2000 },
      { type: "VM", label: "VM_Out", x: 490, y: 270, orient: "V", value: 0 },
      { type: "GND", label: "GND", x: 100, y: 350, orient: "V", value: 0 },
    ],
    wires: [
      [0, 0, 1, 0],
      [1, 1, 2, 0],
      [1, 1, 3, 0],
      [2, 1, 0, 1],
      [3, 1, 2, 1],
      [0, 1, 4, 0],
    ],
  },
  {
    name: "LED Current-Limiting Switch Circuit",
    lab: "cd",
    category: "Circuit & Devices",
    description:
      "5V DC supply switched through SW1 and current-limiting resistor R_Limit=150Ω into LED1 (Vf=2.0V), limiting forward current to 20mA.",
    formula: "I_LED = (V_S − V_F) / R_Limit = (5.0 − 2.0) / 150 = 20.0 mA",
    nodes: [
      { type: "VS", label: "VS1", x: 100, y: 200, orient: "V", value: 5 },
      { type: "SW", label: "SW1", x: 240, y: 100, orient: "H", value: 1 },
      { type: "R", label: "R_Limit", x: 410, y: 100, orient: "H", value: 150 },
      { type: "LED", label: "LED1", x: 560, y: 200, orient: "V", value: 2.0 },
      { type: "GND", label: "GND", x: 100, y: 340, orient: "V", value: 0 },
    ],
    wires: [
      [0, 0, 1, 0],
      [1, 1, 2, 0],
      [2, 1, 3, 0],
      [3, 1, 0, 1],
      [0, 1, 4, 0],
    ],
  },
  {
    name: "RC Transient Charging Network",
    lab: "lca",
    category: "Transient",
    description:
      "First-order RC step-response network (R1=1kΩ, C1=100μF, τ=100ms) with charge switch SW1 and capacitor voltmeter probe.",
    formula: "τ = R1 · C1 = 100 ms  ·  v_C(t) = V_S (1 − e^(−t/τ))",
    nodes: [
      { type: "VS", label: "VS1", x: 100, y: 200, orient: "V", value: 10 },
      { type: "SW", label: "SW1", x: 240, y: 100, orient: "H", value: 1 },
      { type: "R", label: "R1", x: 400, y: 100, orient: "H", value: 1000 },
      { type: "CPOL", label: "C1", x: 540, y: 200, orient: "V", value: 100 },
      { type: "VM", label: "VM_Cap", x: 670, y: 200, orient: "V", value: 0 },
      { type: "GND", label: "GND", x: 100, y: 350, orient: "V", value: 0 },
    ],
    wires: [
      [0, 0, 1, 0],
      [1, 1, 2, 0],
      [2, 1, 3, 0],
      [3, 0, 4, 0],
      [3, 1, 0, 1],
      [4, 1, 3, 1],
      [0, 1, 5, 0],
    ],
  },
  {
    name: "Half-Wave Diode Rectifier",
    lab: "power",
    category: "Power Electronics",
    description:
      "AC Function Generator FG1 feeding a single 1N4007 silicon rectifier diode into a 1kΩ load resistor R_Load.",
    formula: "V_peak,out = V_peak − 0.7 V  ·  V_DC ≈ 0.318 · (V_peak − 0.7 V)",
    nodes: [
      { type: "FG", label: "FG_AC", x: 100, y: 200, orient: "V", value: 12 },
      { type: "D1N4007", label: "D1", x: 310, y: 100, orient: "H", value: 0.7 },
      { type: "R", label: "R_Load", x: 520, y: 200, orient: "V", value: 1000 },
      { type: "VM", label: "VM_Load", x: 650, y: 200, orient: "V", value: 0 },
      { type: "GND", label: "GND", x: 100, y: 350, orient: "V", value: 0 },
    ],
    wires: [
      [0, 0, 1, 0],
      [1, 1, 2, 0],
      [2, 0, 3, 0],
      [2, 1, 0, 1],
      [3, 1, 2, 1],
      [0, 1, 4, 0],
    ],
  },
  {
    name: "Full-Wave Bridge Rectifier",
    lab: "power",
    category: "Power Electronics",
    description:
      "Four-diode Graetz bridge rectifier (D1–D4) converting AC input into full-wave rectified DC across 1kΩ load R_Load and filter capacitor C_Filt.",
    formula: "V_peak,out = V_peak − 1.4 V  ·  f_ripple = 2 · f_in",
    nodes: [
      { type: "FG", label: "FG_AC", x: 90, y: 200, orient: "V", value: 12 },
      { type: "D1N4007", label: "D1", x: 260, y: 100, orient: "H", value: 0.7 },
      { type: "D1N4007", label: "D2", x: 260, y: 290, orient: "H", value: 0.7 },
      { type: "D1N4007", label: "D3", x: 430, y: 100, orient: "H", value: 0.7 },
      { type: "D1N4007", label: "D4", x: 430, y: 290, orient: "H", value: 0.7 },
      { type: "CPOL", label: "C_Filt", x: 570, y: 200, orient: "V", value: 470 },
      { type: "R", label: "R_Load", x: 690, y: 200, orient: "V", value: 1000 },
      { type: "GND", label: "GND", x: 90, y: 360, orient: "V", value: 0 },
    ],
    wires: [
      [0, 0, 1, 0],
      [0, 1, 2, 0],
      [1, 1, 5, 0],
      [3, 1, 5, 0],
      [5, 0, 6, 0],
      [5, 1, 7, 0],
      [6, 1, 7, 0],
      [2, 1, 7, 0],
      [4, 1, 7, 0],
      [0, 1, 7, 0],
    ],
  },
  {
    name: "Op-Amp Inverting Gain Stage (-10 V/V)",
    lab: "edc",
    category: "EDC Lab",
    description:
      "Operational amplifier inverting configuration with R_In=1kΩ and feedback R_F=10kΩ yielding closed-loop voltage gain A_v = −10 V/V.",
    formula: "A_v = −R_F / R_In = −10 V/V  ·  V_out = −10 · V_in",
    nodes: [
      { type: "VS", label: "V_In", x: 100, y: 200, orient: "V", value: 1 },
      { type: "R", label: "R_In", x: 260, y: 120, orient: "H", value: 1000 },
      { type: "OPAMP", label: "U1_741", x: 450, y: 180, orient: "H", value: 10 },
      { type: "R", label: "R_F", x: 450, y: 70, orient: "H", value: 10000 },
      { type: "VM", label: "VM_Out", x: 640, y: 180, orient: "V", value: 0 },
      { type: "GND", label: "GND", x: 100, y: 340, orient: "V", value: 0 },
    ],
    wires: [
      [0, 0, 1, 0],
      [1, 1, 2, 0],
      [1, 1, 3, 0],
      [3, 1, 2, 1],
      [2, 1, 4, 0],
      [2, 2, 5, 0],
      [0, 1, 5, 0],
      [4, 1, 5, 0],
    ],
  },
];

function solveLinearSystem(A: number[][], b: number[]): number[] | null {
  const n = b.length;
  if (n === 0) return [];
  const M = A.map((row, i) => [...row, b[i]]);

  for (let col = 0; col < n; col++) {
    let maxRow = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(M[r][col]) > Math.abs(M[maxRow][col])) {
        maxRow = r;
      }
    }
    if (Math.abs(M[maxRow][col]) < 1e-11) continue;
    [M[col], M[maxRow]] = [M[maxRow], M[col]];

    for (let r = col + 1; r < n; r++) {
      const factor = M[r][col] / M[col][col];
      for (let c = col; c <= n; c++) {
        M[r][c] -= factor * M[col][c];
      }
    }
  }

  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let sum = M[i][n];
    for (let j = i + 1; j < n; j++) {
      sum -= M[i][j] * x[j];
    }
    x[i] = Math.abs(M[i][i]) > 1e-11 ? sum / M[i][i] : 0;
  }
  return x;
}

interface SeriesParallelBuilderProps {
  labMode?: BuilderLabMode;
  initialScenarioName?: string;
  scenarioSyncKey?: number | string;
  preferredGridPitch?: number;
  telemetryDecimals?: number;
  onLogSimulationActivity?: (
    action: string,
    target: string,
    status?: "PASS" | "WARN" | "INFO"
  ) => void;
}

function SeriesParallelBuilderInner({
  labMode = "lca",
  initialScenarioName,
  scenarioSyncKey,
  preferredGridPitch = 20,
  telemetryDecimals = 3,
  onLogSimulationActivity,
}: SeriesParallelBuilderProps) {
  const dec = Math.min(4, Math.max(2, telemetryDecimals));
  const gridPitchPx = preferredGridPitch;
  const svgRef = useRef<SVGSVGElement | null>(null);
  const idCounter = useRef<number>(1);

  const initialPreset = useMemo(() => {
    return (
      SCENARIO_PRESETS.find((p) => p.lab === labMode) || SCENARIO_PRESETS[0]
    );
  }, [labMode]);

  const [nodes, setNodes] = useState<AnalogNode[]>(() => {
    idCounter.current = 1;
    return initialPreset.nodes.map((n) => ({ ...n, id: idCounter.current++ }));
  });

  const [wires, setWires] = useState<AnalogWire[]>(() => {
    return initialPreset.wires.map((w) => ({
      id: idCounter.current++,
      from: { node: w[0] + 1, term: w[1] },
      to: { node: w[2] + 1, term: w[3] },
    }));
  });

  const [activeScenario, setActiveScenario] = useState<string>(
    initialPreset.name
  );
  const [selectedId, setSelectedId] = useState<{
    type: "node" | "wire";
    id: number;
  } | null>(null);
  const [pendingTerm, setPendingTerm] = useState<{
    node: number;
    term: number;
  } | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(
    null
  );
  const [compSearch, setCompSearch] = useState<string>("");
  const [simRunning, setSimRunning] = useState<boolean>(true);
  const [showMultisimRack, setShowMultisimRack] = useState<boolean>(false);
  const [workbenchView, setWorkbenchView] = useState<
    "SCHEMATIC" | "INSTRUMENTS" | "SPICE_TABLE" | "3D_TWIN"
  >("SCHEMATIC");
  const [showNodalBadges, setShowNodalBadges] = useState<boolean>(true);
  const [showBranchCurrents, setShowBranchCurrents] = useState<boolean>(true);
  const [selectedNodeIds, setSelectedNodeIds] = useState<number[]>([]);
  // Direct keyboard entry state for component values & pre-placement value
  const [customPlaceValue, setCustomPlaceValue] = useState<string>("");
  const [directValueInput, setDirectValueInput] = useState<string>("");
  const [subcircuitNotice, setSubcircuitNotice] = useState<string | null>(null);
  const [fgConfig, setFgConfig] = useState<FunctionGenConfig>({
    enabled: true,
    waveform: "SINE",
    frequencyHz: 1000,
    amplitudeV: 12,
    dcOffsetV: 0,
    dutyCyclePct: 50,
  });

  // Dedicated Transistor / Semiconductor Configuration Dialog Modal state
  const [isTransistorModalOpen, setIsTransistorModalOpen] = useState<boolean>(false);
  const [transistorModalNode, setTransistorModalNode] = useState<AnalogNode | null>(null);

  // Collapsible Left Palette & Resizable Bottom SPICE Results Console state
  const [isPaletteCollapsed, setIsPaletteCollapsed] = useState<boolean>(false);
  const [isSpiceConsoleOpen, setIsSpiceConsoleOpen] = useState<boolean>(false);
  const [spiceConsoleTab, setSpiceConsoleTab] = useState<
    "NODAL" | "DIAGNOSTICS" | "MATRIX_DEBUG" | "NETLIST"
  >("NODAL");
  const [spiceConsoleHeight, setSpiceConsoleHeight] = useState<number>(220);

  // Interactive Simulation Guided Tour state (MNA node highlights & NR convergence walkthrough)
  const [isGuidedTourOpen, setIsGuidedTourOpen] = useState<boolean>(false);
  const [guidedTourStep, setGuidedTourStep] = useState<SpiceTourStepId>(1);
  const [tourFocusedNetId, setTourFocusedNetId] = useState<number | null>(null);
  const [requestedInstrumentTab, setRequestedInstrumentTab] = useState<{
    tab: SpiceAnalysisTab;
    seq: number;
  } | null>(null);

  const handleStartSpiceResize = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      const startY = e.clientY;
      const startH = spiceConsoleHeight;
      const onMove = (moveEvent: PointerEvent) => {
        const delta = startY - moveEvent.clientY;
        setSpiceConsoleHeight(Math.min(420, Math.max(160, startH + delta)));
      };
      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [spiceConsoleHeight]
  );

  // Parse user-typed component value including SI prefixes (e.g. "4.7k", "10k", "1M", "100n", "47u", "220")
  const parseComponentValueInput = useCallback(
    (rawStr: string, type: AnalogCompType): number | null => {
      const cleaned = rawStr
        .trim()
        .replace(/ohm|Ω|v|a|h|f|hz|β/gi, "")
        .trim();
      if (!cleaned) return null;
      const match = cleaned.match(/^([+-]?\d*\.?\d+(?:e[+-]?\d+)?)\s*([a-zA-Zµμ]*)$/);
      if (!match) {
        const fallback = parseFloat(cleaned);
        return isFinite(fallback) ? fallback : null;
      }
      const num = parseFloat(match[1]);
      if (!isFinite(num)) return null;
      const prefix = match[2];

      // Component native units in SeriesParallelBuilder:
      // R/POT/HB: Ohms (Ω)
      // C/CPOL/CNP: microFarads (μF)
      // L: milliHenries (mH)
      // IS/JFET: milliAmps (mA)
      // VS/FG/D/ZD/LED/DIAC/REG7805: Volts (V)
      // NE555: Hz
      if (!prefix) return num;

      const pLower = prefix.toLowerCase();
      if (type === "C" || type === "CPOL" || type === "CNP") {
        // Base is uF
        if (pLower === "p") return num * 1e-6;
        if (pLower === "n") return num * 1e-3;
        if (pLower === "u" || pLower === "µ" || pLower === "μ") return num;
        if (pLower === "m") return num * 1e3;
        return num;
      }
      if (type === "L") {
        // Base is mH
        if (pLower === "u" || pLower === "µ" || pLower === "μ") return num * 1e-3;
        if (pLower === "m") return num;
        if (pLower === "k") return num * 1e6;
        return num;
      }
      if (type === "IS" || type === "JFET") {
        // Base is mA
        if (pLower === "u" || pLower === "µ" || pLower === "μ") return num * 1e-3;
        if (pLower === "m") return num;
        return num;
      }
      // Standard base unit (Ohms, Volts, Hz, Beta)
      if (pLower === "g") return num * 1e9;
      if (prefix === "M" || pLower === "meg") return num * 1e6;
      if (pLower === "k") return num * 1e3;
      if (pLower === "m") return num * 1e-3;
      if (pLower === "u" || pLower === "µ" || pLower === "μ") return num * 1e-6;
      if (pLower === "n") return num * 1e-9;
      return num;
    },
    []
  );

  // Virtual Oscilloscope Wire Probes & Pop-Up Waveform Window State
  const [attachedProbes, setAttachedProbes] = useState<AttachedWireProbe[]>([]);
  const [probeToolActive, setProbeToolActive] = useState<
    "CH1" | "CH2" | "CH3" | "CH4" | null
  >(null);
  const [isProbePopupOpen, setIsProbePopupOpen] = useState<boolean>(false);
  const [reDraggingProbe, setReDraggingProbe] = useState<{
    channelId: "CH1" | "CH2" | "CH3" | "CH4";
    x: number;
    y: number;
  } | null>(null);

  const nodeById = useMemo(() => {
    const m = new Map<number, AnalogNode>();
    for (const n of nodes) m.set(n.id, n);
    return m;
  }, [nodes]);

  const [savedProjects, setSavedProjects] = useState<BuilderProjectRecord[]>(() =>
    listBuilderProjects()
  );
  const [builderToast, setBuilderToast] = useState<string | null>(null);
  const [isBuilderDirty, setIsBuilderDirty] = useState<boolean>(false);

  // Undo / Redo Snapshot History Stack (auto-records every edit!)
  type BuilderSnapshot = { nodes: AnalogNode[]; wires: AnalogWire[]; scenario: string; sig: string };
  const [historyPast, setHistoryPast] = useState<BuilderSnapshot[]>([]);
  const [historyFuture, setHistoryFuture] = useState<BuilderSnapshot[]>([]);
  const isApplyingHistoryRef = useRef<boolean>(false);
  const lastRecordedSnapRef = useRef<BuilderSnapshot | null>(null);

  const loadScenario = (preset: ScenarioPreset) => {
    idCounter.current = 1;
    const builtNodes: AnalogNode[] = preset.nodes.map((n) => ({
      ...n,
      id: idCounter.current++,
    }));
    const builtWires: AnalogWire[] = preset.wires.map((w) => ({
      id: idCounter.current++,
      from: { node: builtNodes[w[0]].id, term: w[1] },
      to: { node: builtNodes[w[2]].id, term: w[3] },
    }));
    isApplyingHistoryRef.current = true;
    setNodes(builtNodes);
    setWires(builtWires);
    setActiveScenario(preset.name);
    setHistoryPast([]);
    setHistoryFuture([]);
    setIsBuilderDirty(false);
    setSelectedId(null);
    setPendingTerm(null);
    setAttachedProbes((prev) =>
      prev
        .map((p, idx): AttachedWireProbe | null =>
          builtWires[idx]
            ? { channelId: p.channelId, wireId: builtWires[idx].id, tPos: 0.5 }
            : null
        )
        .filter((x): x is AttachedWireProbe => x !== null)
    );
  };

  const prevLabModeRef = useRef<BuilderLabMode>(labMode);
  useEffect(() => {
    if (prevLabModeRef.current !== labMode) {
      prevLabModeRef.current = labMode;
      const preset =
        SCENARIO_PRESETS.find((p) => p.lab === labMode) || SCENARIO_PRESETS[0];
      loadScenario(preset);
    }
  }, [labMode]);

  useEffect(() => {
    if (!initialScenarioName) return;
    const needle = initialScenarioName.toLowerCase();
    const matched =
      SCENARIO_PRESETS.find((p) => p.name.toLowerCase() === needle) ||
      SCENARIO_PRESETS.find((p) => p.name.toLowerCase().includes(needle)) ||
      SCENARIO_PRESETS.find((p) => needle.includes(p.name.toLowerCase()));
    if (matched) {
      loadScenario(matched);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialScenarioName, scenarioSyncKey]);

  // Delete selected node or wire via keyboard (ignoring inputs)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (!selectedId) return;
      e.preventDefault();
      if (selectedId.type === "node") {
        setNodes((prev) => prev.filter((n) => n.id !== selectedId.id));
        setWires((prev) =>
          prev.filter(
            (w) => w.from.node !== selectedId.id && w.to.node !== selectedId.id
          )
        );
      } else {
        setWires((prev) => prev.filter((w) => w.id !== selectedId.id));
      }
      setSelectedId(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedId]);

  // Dynamically rewire all currently placed components into Series, Parallel, or Combination topology
  const convertCurrentTopology = (target: "series" | "parallel" | "combination") => {
    const srcNode = nodes.find((n) => n.type === "VS" || n.type === "FG");
    const gndNode = nodes.find((n) => n.type === "GND");
    const branchNodes = nodes.filter(
      (n) => n.type !== "VS" && n.type !== "FG" && n.type !== "GND"
    );
    if (!srcNode || branchNodes.length === 0) return;

    const updatedNodes: AnalogNode[] = [];
    const newWires: AnalogWire[] = [];

    const posSrc: AnalogNode = { ...srcNode, x: 140, y: 240, orient: "V" };
    updatedNodes.push(posSrc);

    const posGnd: AnalogNode = gndNode
      ? { ...gndNode, x: 140, y: 400, orient: "V" }
      : { id: idCounter.current++, type: "GND", label: "GND", value: 0, x: 140, y: 400, orient: "V" };
    updatedNodes.push(posGnd);

    newWires.push({
      id: idCounter.current++,
      from: { node: posSrc.id, term: 1 },
      to: { node: posGnd.id, term: 0 },
    });

    if (target === "series") {
      const gap = Math.min(140, Math.max(95, Math.floor(620 / Math.max(1, branchNodes.length))));
      const positioned = branchNodes.map((n, idx) => ({
        ...n,
        x: 260 + idx * gap,
        y: 120,
        orient: isThreeTerminalComponent(n.type) ? n.orient : ("H" as const),
      }));
      updatedNodes.push(...positioned);
      // Connect Src(+) -> branch[0].in
      newWires.push({
        id: idCounter.current++,
        from: { node: posSrc.id, term: 0 },
        to: { node: positioned[0].id, term: positioned[0].orient === "H" ? 1 : 0 },
      });
      for (let i = 0; i < positioned.length - 1; i++) {
        const a = positioned[i];
        const b = positioned[i + 1];
        newWires.push({
          id: idCounter.current++,
          from: { node: a.id, term: a.orient === "H" ? 0 : 1 },
          to: { node: b.id, term: b.orient === "H" ? 1 : 0 },
        });
      }
      const last = positioned[positioned.length - 1];
      newWires.push({
        id: idCounter.current++,
        from: { node: last.id, term: last.orient === "H" ? 0 : 1 },
        to: { node: posGnd.id, term: 0 },
      });
      setActiveScenario("Custom Series Topology");
    } else if (target === "parallel") {
      const gap = Math.min(150, Math.max(100, Math.floor(600 / Math.max(1, branchNodes.length))));
      const positioned = branchNodes.map((n, idx) => ({
        ...n,
        x: 310 + idx * gap,
        y: 240,
        orient: "V" as const,
      }));
      updatedNodes.push(...positioned);
      positioned.forEach((n) => {
        newWires.push({
          id: idCounter.current++,
          from: { node: posSrc.id, term: 0 },
          to: { node: n.id, term: 0 },
        });
        newWires.push({
          id: idCounter.current++,
          from: { node: n.id, term: 1 },
          to: { node: posGnd.id, term: 0 },
        });
      });
      setActiveScenario("Custom Parallel Topology");
    } else {
      // Combination: first element in series feed, remaining elements in parallel bank
      if (branchNodes.length === 1) {
        const only = { ...branchNodes[0], x: 340, y: 240, orient: "V" as const };
        updatedNodes.push(only);
        newWires.push(
          { id: idCounter.current++, from: { node: posSrc.id, term: 0 }, to: { node: only.id, term: 0 } },
          { id: idCounter.current++, from: { node: only.id, term: 1 }, to: { node: posGnd.id, term: 0 } }
        );
      } else {
        const seriesHead = {
          ...branchNodes[0],
          x: 270,
          y: 120,
          orient: isThreeTerminalComponent(branchNodes[0].type) ? branchNodes[0].orient : ("H" as const),
        };
        updatedNodes.push(seriesHead);
        newWires.push({
          id: idCounter.current++,
          from: { node: posSrc.id, term: 0 },
          to: { node: seriesHead.id, term: seriesHead.orient === "H" ? 1 : 0 },
        });
        const rest = branchNodes.slice(1).map((n, idx) => ({
          ...n,
          x: 420 + idx * 140,
          y: 250,
          orient: "V" as const,
        }));
        updatedNodes.push(...rest);
        rest.forEach((n) => {
          newWires.push({
            id: idCounter.current++,
            from: { node: seriesHead.id, term: seriesHead.orient === "H" ? 0 : 1 },
            to: { node: n.id, term: 0 },
          });
          newWires.push({
            id: idCounter.current++,
            from: { node: n.id, term: 1 },
            to: { node: posGnd.id, term: 0 },
          });
        });
      }
      setActiveScenario("Custom Combination Topology");
    }

    setNodes(updatedNodes);
    setWires(newWires);
    setSelectedId(null);
    setPendingTerm(null);
  };

  const getTermPos = (n: AnalogNode, term: number) => {
    if (n.type === "GND") {
      return { x: n.x, y: n.y - 22 };
    }
    if (isThreeTerminalComponent(n.type)) {
      if (n.orient === "H") {
        if (term === 0) return { x: n.x + 45, y: n.y };
        if (term === 1) return { x: n.x - 45, y: n.y };
        return { x: n.x, y: n.y - 45 };
      }
      // Standard Vertical (Collector/Drain/Anode Top, Emitter/Source/Cathode Bottom, Base/Gate/Wiper Left)
      if (term === 0) return { x: n.x, y: n.y - 45 };
      if (term === 1) return { x: n.x, y: n.y + 45 };
      return { x: n.x - 45, y: n.y };
    }
    if (n.orient === "H") {
      return term === 0 ? { x: n.x - 45, y: n.y } : { x: n.x + 45, y: n.y };
    }
    return term === 0 ? { x: n.x, y: n.y - 45 } : { x: n.x, y: n.y + 45 };
  };

  // Evaluate a point along an orthogonal 3-segment wire path at parameter t in [0, 1]
  const getAnalogWirePointAt = useCallback(
    (w: AnalogWire, t = 0.5) => {
      const nFrom = nodeById.get(w.from.node);
      const nTo = nodeById.get(w.to.node);
      if (!nFrom || !nTo) return null;
      const p1 = getTermPos(nFrom, w.from.term);
      const p2 = getTermPos(nTo, w.to.term);
      const midX = (p1.x + p2.x) / 2;
      if (t <= 0.35) {
        const u = t / 0.35;
        return { x: p1.x + (midX - p1.x) * u, y: p1.y };
      } else if (t <= 0.65) {
        const u = (t - 0.35) / 0.3;
        return { x: midX, y: p1.y + (p2.y - p1.y) * u };
      } else {
        const u = (t - 0.65) / 0.35;
        return { x: midX + (p2.x - midX) * u, y: p2.y };
      }
    },
    [nodeById]
  );

  const findNearestAnalogWire = useCallback(
    (wx: number, wy: number, maxDist = 75) => {
      let bestWire: AnalogWire | null = null;
      let bestDist = maxDist;
      let bestT = 0.5;
      for (const w of wires) {
        for (let step = 2; step <= 18; step++) {
          const t = step / 20;
          const pt = getAnalogWirePointAt(w, t);
          if (!pt) continue;
          const dist = Math.hypot(pt.x - wx, pt.y - wy);
          if (dist < bestDist) {
            bestDist = dist;
            bestWire = w;
            bestT = Math.max(0.2, Math.min(0.8, t));
          }
        }
      }
      return bestWire ? { wire: bestWire, tPos: bestT } : null;
    },
    [wires, getAnalogWirePointAt]
  );

  const attachProbeToAnalogWire = useCallback(
    (
      channelId: "CH1" | "CH2" | "CH3" | "CH4",
      wireId: number,
      tPos = 0.5
    ) => {
      setAttachedProbes((prev) => {
        const filtered = prev.filter((p) => p.channelId !== channelId);
        const sameCount = filtered.filter((p) => p.wireId === wireId).length;
        const adjT = Math.max(0.2, Math.min(0.8, tPos + sameCount * 0.15));
        return [...filtered, { channelId, wireId, tPos: adjT }];
      });
      setProbeToolActive(null);
    },
    []
  );

  const handleAutoProbeAnalogWires = useCallback(() => {
    if (wires.length === 0) return;
    const nextProbes: AttachedWireProbe[] = wires
      .slice(0, 4)
      .map((w, idx) => ({
        channelId: PROBE_CHANNELS[idx].channelId,
        wireId: w.id,
        tPos: 0.45 + (idx % 2) * 0.14,
      }));
    setAttachedProbes(nextProbes);
  }, [wires]);

  const handleStartReDragAnalogProbe = (
    channelId: "CH1" | "CH2" | "CH3" | "CH4",
    e: React.PointerEvent<SVGGElement>
  ) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const toSvg = (cx: number, cy: number) => ({
      x: ((cx - rect.left) / rect.width) * 760,
      y: ((cy - rect.top) / rect.height) * 420,
    });
    const p0 = toSvg(e.clientX, e.clientY);
    setReDraggingProbe({ channelId, x: p0.x, y: p0.y });

    const onMove = (ev: PointerEvent) => {
      const p = toSvg(ev.clientX, ev.clientY);
      setReDraggingProbe({ channelId, x: p.x, y: p.y });
    };

    const onUp = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      const p = toSvg(ev.clientX, ev.clientY);
      const nearest = findNearestAnalogWire(p.x, p.y, 90);
      if (nearest) {
        attachProbeToAnalogWire(channelId, nearest.wire.id, nearest.tPos);
      }
      setReDraggingProbe(null);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const addComponent = (
    type: AnalogCompType,
    orient: "H" | "V" = "H",
    customX?: number,
    customY?: number
  ) => {
    const countOfType = nodes.filter((n) => n.type === type).length + 1;
    const defaultVal =
      type === "VS" || type === "FG"
        ? 12
        : type === "IS"
        ? 20
        : type === "SW" || type === "MOS" || type === "SCR" || type === "TRIAC"
        ? 1
        : type === "R" || type === "HB"
        ? 100
        : type === "POT"
        ? 500
        : type === "OPAMP"
        ? 10
        : type === "NE555"
        ? 1000
        : type === "D" || type === "D1N4007"
        ? 0.7
        : type === "ZD"
        ? 5.1
        : type === "DIAC"
        ? 32
        : type === "REG7805"
        ? 5.0
        : type === "LED"
        ? 2.0
        : type === "C" || type === "CNP"
        ? 0.1
        : type === "CPOL"
        ? 100
        : type === "L"
        ? 50
        : type === "BJT" || type === "BC547" || type === "BC557"
        ? 250
        : type === "JFET"
        ? 15
        : 0;
    const parsedCustom = customPlaceValue.trim()
      ? parseComponentValueInput(customPlaceValue, type)
      : null;
    const initialVal =
      parsedCustom !== null &&
      parsedCustom > 0 &&
      type !== "GND" &&
      type !== "SW" &&
      type !== "MOS" &&
      type !== "VM" &&
      type !== "AM"
        ? parsedCustom
        : defaultVal;

    const initialConfig = isTransistorOrSemiconductor(type)
      ? { ...(DEFAULT_TRANSISTOR_CONFIGS[type] ?? DEFAULT_TRANSISTOR_CONFIGS.BJT) }
      : undefined;

    const newNode: AnalogNode = {
      id: idCounter.current++,
      type,
      label: type === "GND" ? "GND" : `${type}${countOfType}`,
      x: customX ?? 220 + ((nodes.length * 40) % 320),
      y: customY ?? 140 + ((nodes.length * 30) % 180),
      orient:
        type === "VS" ||
        type === "FG" ||
        type === "IS" ||
        type === "GND" ||
        type === "ZD" ||
        isThreeTerminalComponent(type)
          ? "V"
          : orient,
      value: initialVal,
      transistorConfig: initialConfig,
    };
    setNodes((prev) => [...prev, newNode]);
    setSelectedId({ type: "node", id: newNode.id });
    setDirectValueInput(String(newNode.value));
    setActiveScenario("Custom Student Circuit");
  };

  const handleGroupSelectedIntoSubcircuit = () => {
    setSubcircuitNotice(null);
    if (selectedNodeIds.length < 2) {
      setSubcircuitNotice(
        "Shift+Click at least 2 passive components on the canvas to collapse into a .SUBCKT."
      );
      return;
    }
    const idSet = new Set(selectedNodeIds);
    const picked = nodes.filter((n) => idSet.has(n.id));
    if (picked.length < 2) return;

    if (
      picked.some(
        (n) =>
          n.type === "VS" ||
          n.type === "FG" ||
          n.type === "IS" ||
          n.type === "GND" ||
          n.type === "VM" ||
          n.type === "AM"
      )
    ) {
      setSubcircuitNotice(
        "Sources (VS/FG/IS), GND, and meters cannot be collapsed into a 2-terminal passive .SUBCKT."
      );
      return;
    }

    // Build Union-Find over internal terminals across wires strictly inside idSet
    const termKey = (nId: number, term: number) => `${nId}:${term}`;
    const parent = new Map<string, string>();
    const findRoot = (k: string): string => {
      if (!parent.has(k)) parent.set(k, k);
      const p = parent.get(k)!;
      if (p === k) return k;
      const r = findRoot(p);
      parent.set(k, r);
      return r;
    };
    const unionTerms = (a: string, b: string) => {
      const ra = findRoot(a);
      const rb = findRoot(b);
      if (ra !== rb) parent.set(ra, rb);
    };

    for (const n of picked) {
      const count = getAnalogTerminalCount(n.type);
      for (let t = 0; t < count; t++) findRoot(termKey(n.id, t));
    }

    const internalWires = wires.filter(
      (w) => idSet.has(w.from.node) && idSet.has(w.to.node)
    );
    const externalWires = wires.filter(
      (w) => idSet.has(w.from.node) !== idSet.has(w.to.node)
    );

    for (const w of internalWires) {
      unionTerms(
        termKey(w.from.node, w.from.term),
        termKey(w.to.node, w.to.term)
      );
    }

    // Identify external boundary nets
    const boundaryRootsOrder: string[] = [];
    const boundaryRootSet = new Set<string>();
    for (const w of externalWires) {
      const internalEnd = idSet.has(w.from.node) ? w.from : w.to;
      const root = findRoot(termKey(internalEnd.node, internalEnd.term));
      if (!boundaryRootSet.has(root)) {
        boundaryRootSet.add(root);
        boundaryRootsOrder.push(root);
      }
    }

    if (boundaryRootsOrder.length !== 2) {
      setSubcircuitNotice(
        `A 2-port .SUBCKT requires exactly 2 external boundary connections (found ${boundaryRootsOrder.length}).`
      );
      return;
    }

    const port0Root = boundaryRootsOrder[0];
    const port1Root = boundaryRootsOrder[1]; // Reference 0V for R_th measurement

    const allRoots = new Set<string>();
    for (const k of parent.keys()) allRoots.add(findRoot(k));

    const rootToNet = new Map<string, number>();
    rootToNet.set(port1Root, 0);
    let netIdx = 1;
    for (const r of allRoots) {
      if (r !== port1Root) {
        rootToNet.set(r, netIdx++);
      }
    }

    const dim = netIdx - 1;
    let eqR = 100;
    if (dim >= 1) {
      const A: number[][] = Array.from({ length: dim }, () =>
        new Array(dim).fill(0)
      );
      const b: number[] = new Array(dim).fill(0);
      const stampSubG = (netA: number, netB: number, g: number) => {
        if (netA > 0) A[netA - 1][netA - 1] += g;
        if (netB > 0) A[netB - 1][netB - 1] += g;
        if (netA > 0 && netB > 0) {
          A[netA - 1][netB - 1] -= g;
          A[netB - 1][netA - 1] -= g;
        }
      };

      for (let i = 0; i < dim; i++) A[i][i] += 1e-9;

      for (const n of picked) {
        const net0 = rootToNet.get(findRoot(termKey(n.id, 0))) ?? 0;
        const net1 = rootToNet.get(findRoot(termKey(n.id, 1))) ?? 0;
        if (n.type === "POT") {
          const net2 = rootToNet.get(findRoot(termKey(n.id, 2))) ?? net1;
          const rHalf = Math.max(0.5, (n.value || 500) / 2);
          stampSubG(net0, net2, 1 / rHalf);
          stampSubG(net2, net1, 1 / rHalf);
        } else {
          let g = 1 / 100;
          if (n.type === "R" || n.type === "HB") {
            g = 1 / Math.max(0.01, n.value || 100);
          } else if (n.type === "SW") {
            g = n.value >= 1 ? 1000 : 1e-7;
          } else if (n.type === "L") {
            g = 100;
          } else if (n.type === "C" || n.type === "CPOL" || n.type === "CNP") {
            g = 1e-7;
          }
          stampSubG(net0, net1, g);
        }
      }

      const p0Net = rootToNet.get(port0Root) ?? 1;
      if (p0Net > 0) {
        b[p0Net - 1] = 1.0; // Inject 1.0 A test current into Port 0
        const vSol = solveDenseMnaSystem(A, b);
        const rMeas = vSol ? Math.abs(vSol[p0Net - 1] ?? 100) : 100;
        eqR = isFinite(rMeas) ? Math.max(0.01, Math.min(1e7, Number(rMeas.toFixed(2)))) : 100;
      }
    }

    const avgX =
      Math.round(
        picked.reduce((s, n) => s + n.x, 0) / picked.length / 10
      ) * 10;
    const avgY =
      Math.round(
        picked.reduce((s, n) => s + n.y, 0) / picked.length / 10
      ) * 10;

    const hbId = idCounter.current++;
    const hbNode: AnalogNode = {
      id: hbId,
      type: "HB",
      label: `SUB_${picked.map((p) => p.label).join("_").slice(0, 10)}`,
      x: avgX,
      y: avgY,
      orient: "H",
      value: eqR,
    };

    setNodes((prev) => [...prev.filter((n) => !idSet.has(n.id)), hbNode]);
    setWires((prev) =>
      prev
        .filter((w) => !(idSet.has(w.from.node) && idSet.has(w.to.node)))
        .map((w) => {
          let from = w.from;
          let to = w.to;
          if (idSet.has(from.node)) {
            const root = findRoot(termKey(from.node, from.term));
            from = { node: hbId, term: root === port0Root ? 0 : 1 };
          }
          if (idSet.has(to.node)) {
            const root = findRoot(termKey(to.node, to.term));
            to = { node: hbId, term: root === port0Root ? 0 : 1 };
          }
          return { ...w, from, to };
        })
    );
    setSelectedNodeIds([]);
    setSelectedId({ type: "node", id: hbId });
    setActiveScenario("Hierarchical .SUBCKT Design");
  };

  // Topology signature that ignores (x, y) coordinates so dragging components is 60 FPS with zero MNA matrix overhead
  const analogLogicSig = useMemo(() => {
    const nSig = nodes
      .map(
        (n) =>
          `${n.id}:${n.type}:${n.value}:${JSON.stringify(
            n.transistorConfig || null
          )}`
      )
      .join("|");
    const wSig = wires
      .map((w) => `${w.from.node}:${w.from.term}->${w.to.node}:${w.to.term}`)
      .join(",");
    return `${nSig}||${wSig}`;
  }, [nodes, wires]);

  // Structural + orientation + label signature for Undo/Redo history tracking
  const historyTrackSig = useMemo(() => {
    const nSig = nodes.map((n) => `${n.id}:${n.type}:${n.label}:${n.orient}:${n.value}`).join("|");
    const wSig = wires.map((w) => `${w.id}:${w.from.node}.${w.from.term}-${w.to.node}.${w.to.term}`).join(",");
    return `${nSig}##${wSig}`;
  }, [nodes, wires]);

  useEffect(() => {
    const snapNow: BuilderSnapshot = {
      nodes: JSON.parse(JSON.stringify(nodes)),
      wires: JSON.parse(JSON.stringify(wires)),
      scenario: activeScenario,
      sig: historyTrackSig,
    };
    if (!lastRecordedSnapRef.current) {
      lastRecordedSnapRef.current = snapNow;
      return;
    }
    if (lastRecordedSnapRef.current.sig === historyTrackSig) {
      return;
    }
    if (isApplyingHistoryRef.current) {
      isApplyingHistoryRef.current = false;
      lastRecordedSnapRef.current = snapNow;
      return;
    }
    const prevSnap = lastRecordedSnapRef.current;
    setHistoryPast((p) => [...p.slice(-39), prevSnap]);
    setHistoryFuture([]);
    setIsBuilderDirty(true);
    lastRecordedSnapRef.current = snapNow;
  }, [historyTrackSig, nodes, wires, activeScenario]);

  const handleBuilderUndo = useCallback(() => {
    if (historyPast.length === 0) return;
    const prevSnap = historyPast[historyPast.length - 1];
    const curSnap: BuilderSnapshot = {
      nodes: JSON.parse(JSON.stringify(nodes)),
      wires: JSON.parse(JSON.stringify(wires)),
      scenario: activeScenario,
      sig: historyTrackSig,
    };
    isApplyingHistoryRef.current = true;
    setHistoryPast((p) => p.slice(0, -1));
    setHistoryFuture((f) => [curSnap, ...f]);
    setNodes(prevSnap.nodes);
    setWires(prevSnap.wires);
    setActiveScenario(prevSnap.scenario);
    setSelectedId(null);
  }, [historyPast, nodes, wires, activeScenario, historyTrackSig]);

  const handleBuilderRedo = useCallback(() => {
    if (historyFuture.length === 0) return;
    const nextSnap = historyFuture[0];
    const curSnap: BuilderSnapshot = {
      nodes: JSON.parse(JSON.stringify(nodes)),
      wires: JSON.parse(JSON.stringify(wires)),
      scenario: activeScenario,
      sig: historyTrackSig,
    };
    isApplyingHistoryRef.current = true;
    setHistoryFuture((f) => f.slice(1));
    setHistoryPast((p) => [...p, curSnap]);
    setNodes(nextSnap.nodes);
    setWires(nextSnap.wires);
    setActiveScenario(nextSnap.scenario);
    setSelectedId(null);
  }, [historyFuture, nodes, wires, activeScenario, historyTrackSig]);

  const handleDuplicateSelectedNode = useCallback(() => {
    if (!selectedId || selectedId.type !== "node") return;
    const src = nodes.find((n) => n.id === selectedId.id);
    if (!src || src.type === "GND") return;
    const copyId = idCounter.current++;
    const copy: AnalogNode = {
      ...JSON.parse(JSON.stringify(src)),
      id: copyId,
      label: `${src.label}_copy`,
      x: Math.min(720, src.x + 50),
      y: Math.min(380, src.y + 40),
    };
    setNodes((prev) => [...prev, copy]);
    setSelectedId({ type: "node", id: copyId });
    setDirectValueInput(String(copy.value));
  }, [selectedId, nodes]);

  const handleSaveCurrentBuilderProject = useCallback(() => {
    const slug = activeScenario.toLowerCase().replace(/[^a-z0-9]+/g, "_");
    const rec = saveBuilderProject({
      projectId: `spb_${labMode}_${slug}`,
      name: activeScenario,
      labMode,
      topologyLabel: activeScenario,
      nodes,
      wires,
    });
    setSavedProjects(listBuilderProjects());
    setIsBuilderDirty(false);
    setBuilderToast(`Saved "${rec.name}" to isolated project storage.`);
    setTimeout(() => setBuilderToast(null), 3000);
  }, [activeScenario, labMode, nodes, wires]);

  const handleLoadSavedBuilderProject = useCallback((rec: BuilderProjectRecord) => {
    isApplyingHistoryRef.current = true;
    const maxId = Math.max(
      1,
      ...rec.nodes.map((n) => n.id),
      ...rec.wires.map((w) => w.id)
    );
    idCounter.current = maxId + 1;
    setNodes(JSON.parse(JSON.stringify(rec.nodes)));
    setWires(JSON.parse(JSON.stringify(rec.wires)));
    setActiveScenario(rec.name);
    setHistoryPast([]);
    setHistoryFuture([]);
    setIsBuilderDirty(false);
    setSelectedId(null);
    setBuilderToast(`Loaded saved project "${rec.name}".`);
    setTimeout(() => setBuilderToast(null), 3000);
  }, []);

  // --- Real-Time JavaScript SPICE3f5 / ngspice.js Nonlinear MNA Solver ---
  const mnaSolution = useMemo(() => {
    return runNgspiceOperatingPoint(nodes, wires, fgConfig);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analogLogicSig, fgConfig]);

  // Build real-time ProbedWireSignal array with genuine MNA transient waveforms
  const probedAnalogSignals = useMemo<ProbedWireSignal[]>(() => {
    if (attachedProbes.length === 0) return [];
    const fgNode = nodes.find((n) => n.type === "FG");
    const capNodes = nodes.filter((n) => n.type === "C" || n.type === "CPOL" || n.type === "CNP");
    const resNodes = nodes.filter((n) => n.type === "R" || n.type === "POT");
    const maxCapF = Math.max(0, ...capNodes.map((c) => (c.value || 10) * 1e-6));
    const maxResOhm = Math.max(100, ...resNodes.map((r) => r.value || 1000));
    const rcTau = maxCapF * maxResOhm;
    const freqHz = Math.max(1, fgConfig.frequencyHz || 1000);
    const tStop = fgNode
      ? 2 / freqHz
      : rcTau > 1e-6
      ? Math.min(2.0, Math.max(0.02, 5 * rcTau))
      : 0.05;
    const dt = tStop / 96;
    const tranRes = runNgspiceTransient(nodes, wires, {
      tStart: 0,
      tStop,
      dt,
      method: "TRAPEZOIDAL",
      fgConfig,
    });

    return attachedProbes
      .map((probe): ProbedWireSignal | null => {
        const w = wires.find((wire) => wire.id === probe.wireId);
        if (!w) return null;
        const nFrom = nodeById.get(w.from.node);
        const nTo = nodeById.get(w.to.node);
        if (!nFrom || !nTo) return null;

        const spec = PROBE_CHANNELS.find(
          (c) => c.channelId === probe.channelId
        )!;
        const netId = mnaSolution.getTermNet(w.from.node, w.from.term);
        const netV = mnaSolution.getNetVoltage(netId);
        const fromTelem = mnaSolution.compTelemetry.get(nFrom.id);
        const toTelem = mnaSolution.compTelemetry.get(nTo.id);
        const branchCurrentMa = Math.abs(
          toTelem?.current_mA ?? fromTelem?.current_mA ?? 0
        );

        const tNetId = tranRes.netlist.getTermNet(w.from.node, w.from.term);
        const tranSeries =
          tranRes.converged && tranRes.netVoltagesHistory[tNetId]
            ? tranRes.netVoltagesHistory[tNetId]
            : undefined;

        let dcV = netV;
        let rmsV = Math.abs(netV);
        let peakV = Math.abs(netV);
        let rippleV = 0;
        let wfType: ProbedWireSignal["waveformType"] = "DC";
        if (tranSeries && tranSeries.length > 1) {
          let sum = 0;
          let sumSq = 0;
          let minV = Infinity;
          let maxV = -Infinity;
          let maxAbs = 0;
          for (const val of tranSeries) {
            sum += val;
            sumSq += val * val;
            if (val < minV) minV = val;
            if (val > maxV) maxV = val;
            if (Math.abs(val) > maxAbs) maxAbs = Math.abs(val);
          }
          dcV = Number((sum / tranSeries.length).toFixed(4));
          rmsV = Number(Math.sqrt(sumSq / tranSeries.length).toFixed(4));
          peakV = Number(maxAbs.toFixed(4));
          rippleV = Number((maxV - minV).toFixed(4));
          if (minV < -0.1 * maxAbs && maxV > 0.1 * maxAbs) wfType = "AC_SINE";
          else if (rippleV > 0.15 * Math.max(0.1, maxAbs)) wfType = fgNode ? "HALF_RECTIFIED" : "RC_TRANSIENT";
          else wfType = fgNode && rippleV > 0.01 ? "FILTERED_DC" : "DC";
        }

        return {
          channelId: probe.channelId,
          wireId: w.id,
          netName: `Net N${netId} (${nFrom.label} → ${nTo.label})`,
          sourceLabel: `${nFrom.label}.T${w.from.term}`,
          targetLabel: `${nTo.label}.T${w.to.term}`,
          color: spec.color,
          currentVoltage: netV,
          currentMa: branchCurrentMa,
          stepSamples: tranSeries,
          waveformType: wfType,
          peakVoltage: peakV,
          rmsVoltage: rmsV,
          dcVoltage: dcV,
          rippleVoltage: rippleV,
          frequencyHz: fgNode ? freqHz : undefined,
        };
      })
      .filter((x): x is ProbedWireSignal => x !== null);
  }, [attachedProbes, wires, nodeById, mnaSolution, nodes, fgConfig]);

  // Open Circuits detection & highlight overlay state
  const [showOpenCircuitsOverlay, setShowOpenCircuitsOverlay] = useState<boolean>(false);
  // Dedicated BJT I-V Characteristic Curve Tracer modal state
  const [isBjtCurveTracerOpen, setIsBjtCurveTracerOpen] = useState<boolean>(false);

  // Detect open circuits, broken loops, floating nodes, and unterminated pins
  const openCircuitIssues = useMemo(() => {
    return findAnalogOpenCircuits(nodes, wires, getTermPos);
  }, [nodes, wires]);

  // Extract BJT transistors currently in the circuit for the I-V Curve Tracer
  const bjtComponentItems = useMemo<BjtComponentItem[]>(() => {
    return nodes
      .filter(
        (n) =>
          n.type === "BJT" ||
          n.type === "BC547" ||
          n.type === "BC557" ||
          n.transistorConfig?.family === "BJT"
      )
      .map((n) => {
        const tel = mnaSolution.compTelemetry.get(n.id);
        const cfg = n.transistorConfig;
        const vC = tel?.vTerm0;
        const vE = tel?.vTerm1;
        const vce = vC !== undefined && vE !== undefined ? Math.abs(vC - vE) : undefined;
        const ic_mA = tel?.current_mA !== undefined ? Math.abs(tel.current_mA) : undefined;
        const beta = cfg?.beta ?? n.value ?? 150;
        const ib_uA = ic_mA !== undefined && beta > 0 ? (ic_mA / beta) * 1000 : undefined;

        let region: "ACTIVE" | "SATURATION" | "CUTOFF" | "OPEN / FLOATING" = "ACTIVE";
        if (vce !== undefined) {
          if (vce < (cfg?.vce_sat ?? 0.25)) region = "SATURATION";
          else if ((ic_mA ?? 0) < 0.05) region = "CUTOFF";
          else region = "ACTIVE";
        }

        return {
          id: n.id,
          label: n.label,
          type: n.type,
          modelName:
            cfg?.modelName ||
            (n.type === "BC557"
              ? "BC557B"
              : n.type === "BC547"
              ? "BC547B"
              : "2N2222A"),
          beta,
          vbe_on: cfg?.vbe_on ?? 0.7,
          vce_sat: cfg?.vce_sat ?? 0.2,
          va: cfg?.va ?? 100,
          isPnp: n.type === "BC557" || cfg?.polarity === "PNP",
          liveVce: vce,
          liveIc_mA: ic_mA,
          liveIb_uA: ib_uA,
          operatingRegion: region,
        };
      });
  }, [nodes, mnaSolution.compTelemetry]);

  const selectedNode =
    selectedId?.type === "node" ? nodeById.get(selectedId.id) || null : null;

  const wasNodeDraggedRef = useRef(false);

  const handleNodePointerDown = (
    nodeId: number,
    e: React.PointerEvent<SVGGElement>
  ) => {
    e.stopPropagation();
    wasNodeDraggedRef.current = false;
    const n = nodeById.get(nodeId);
    if (!n || !svgRef.current) return;

    setSelectedId({ type: "node", id: nodeId });
    if (e.shiftKey || e.ctrlKey || e.metaKey) {
      setSelectedNodeIds((prev) =>
        prev.includes(nodeId)
          ? prev.filter((id) => id !== nodeId)
          : [...prev, nodeId]
      );
    } else {
      setSelectedNodeIds([nodeId]);
    }
    const rect = svgRef.current.getBoundingClientRect();
    const scaleX = 760 / rect.width;
    const scaleY = 420 / rect.height;
    const startX = (e.clientX - rect.left) * scaleX;
    const startY = (e.clientY - rect.top) * scaleY;
    const origX = n.x;
    const origY = n.y;
    let moved = false;

    const onMove = (ev: PointerEvent) => {
      const curX = (ev.clientX - rect.left) * scaleX;
      const curY = (ev.clientY - rect.top) * scaleY;
      if (Math.abs(curX - startX) > 3 || Math.abs(curY - startY) > 3) {
        moved = true;
      }
      const nx = Math.round((origX + (curX - startX)) / 10) * 10;
      const ny = Math.round((origY + (curY - startY)) / 10) * 10;
      setNodes((prev) =>
        prev.map((item) =>
          item.id === nodeId
            ? {
                ...item,
                x: Math.max(50, Math.min(710, nx)),
                y: Math.max(50, Math.min(370, ny)),
              }
            : item
        )
      );
    };

    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      if (moved) {
        wasNodeDraggedRef.current = true;
        setTimeout(() => {
          wasNodeDraggedRef.current = false;
        }, 250);
      }
      // Clicking an interactive Switch (SW) or MOSFET (MOS) without dragging toggles its ON/OFF state just like DLD INPUT switches!
      if (!moved && (n.type === "SW" || n.type === "MOS")) {
        setNodes((prev) =>
          prev.map((item) =>
            item.id === nodeId
              ? { ...item, value: item.value >= 1 ? 0 : 1 }
              : item
          )
        );
      }
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const handleTermClick = (
    nodeId: number,
    term: number,
    e: React.PointerEvent
  ) => {
    e.stopPropagation();
    if (!pendingTerm) {
      setPendingTerm({ node: nodeId, term });
      return;
    }
    if (pendingTerm.node === nodeId && pendingTerm.term === term) {
      setPendingTerm(null);
      return;
    }
    const exists = wires.some(
      (w) =>
        (w.from.node === pendingTerm.node &&
          w.from.term === pendingTerm.term &&
          w.to.node === nodeId &&
          w.to.term === term) ||
        (w.from.node === nodeId &&
          w.from.term === term &&
          w.to.node === pendingTerm.node &&
          w.to.term === pendingTerm.term)
    );
    if (!exists) {
      setWires((prev) => [
        ...prev,
        {
          id: idCounter.current++,
          from: pendingTerm,
          to: { node: nodeId, term },
        },
      ]);
      setActiveScenario("Custom Student Circuit");
    }
    setPendingTerm(null);
  };

  const paletteCatalog: {
    type: AnalogCompType;
    orient: "H" | "V";
    title: string;
    sub: string;
    keywords: string;
  }[] = [
    {
      type: "R",
      orient: "H",
      title: "Resistor (Horiz)",
      sub: "100 Ω · Series",
      keywords: "resistor ohm series",
    },
    {
      type: "R",
      orient: "V",
      title: "Resistor (Vert)",
      sub: "100 Ω · Parallel",
      keywords: "resistor ohm parallel",
    },
    {
      type: "VS",
      orient: "V",
      title: "DC Voltage Src",
      sub: "12 V Supply",
      keywords: "voltage source battery dc",
    },
    {
      type: "IS",
      orient: "V",
      title: "DC Current Src",
      sub: "20 mA Source",
      keywords: "current source dc",
    },
    {
      type: "SW",
      orient: "H",
      title: "Toggle Switch",
      sub: "Click ON/OFF",
      keywords: "switch spst toggle",
    },
    {
      type: "L",
      orient: "H",
      title: "Inductor (L)",
      sub: "50 mH Coil",
      keywords: "inductor coil rlc power",
    },
    {
      type: "C",
      orient: "V",
      title: "Capacitor (C)",
      sub: "10 μF Cap",
      keywords: "capacitor filter rlc",
    },
    {
      type: "CPOL",
      orient: "V",
      title: "Cap Polar (100µF+)",
      sub: "100 μF Electrolytic",
      keywords: "capacitor polar polarized electrolytic 100uf",
    },
    {
      type: "CNP",
      orient: "H",
      title: "Cap Non-Polar",
      sub: "100 nF Ceramic",
      keywords: "capacitor non-polar non polar ceramic 100nf",
    },
    {
      type: "D1N4007",
      orient: "H",
      title: "Diode 1N4007A",
      sub: "1000V 1A · V_F=0.7V",
      keywords: "diode 1n4007a in4007a silicon rectifier",
    },
    {
      type: "D",
      orient: "H",
      title: "PN Diode",
      sub: "V_F = 0.7V",
      keywords: "diode rectifier silicon",
    },
    {
      type: "ZD",
      orient: "V",
      title: "Zener Diode (1N4733)",
      sub: "V_Z = 5.1V Clamp",
      keywords: "zener zenor regulator diode 5.1v",
    },
    {
      type: "LED",
      orient: "V",
      title: "LED Indicator",
      sub: "Glows > 1mA",
      keywords: "led light output diode",
    },
    {
      type: "BC547",
      orient: "V",
      title: "BC547 NPN BJT",
      sub: "h_FE = 250 · NPN",
      keywords: "transistor bc547 npn bjt amplifier switch",
    },
    {
      type: "BC557",
      orient: "V",
      title: "BC557 PNP BJT",
      sub: "h_FE = 250 · PNP",
      keywords: "transistor bc557 pnp bjt",
    },
    {
      type: "MOS",
      orient: "H",
      title: "Power MOSFET",
      sub: "IRF540N ON/OFF",
      keywords: "mosfet irf540n transistor switch power",
    },
    {
      type: "JFET",
      orient: "H",
      title: "BF245B N-JFET",
      sub: "I_DSS = 15 mA",
      keywords: "jfet bf245 transistor field effect",
    },
    {
      type: "BJT",
      orient: "V",
      title: "2N2222A NPN BJT",
      sub: "β = 250",
      keywords: "bjt 2n2222 npn transistor amplifier edc",
    },
    {
      type: "FG",
      orient: "V",
      title: "AC Function Gen",
      sub: "Sine/Sq/Tri (XFG)",
      keywords: "function generator ac sine square wave multisim",
    },
    {
      type: "POT",
      orient: "H",
      title: "Potentiometer",
      sub: "500 Ω Variable",
      keywords: "potentiometer variable resistor rheostat multisim",
    },
    {
      type: "OPAMP",
      orient: "H",
      title: "LM741 Op-Amp",
      sub: "Gain = 10 V/V",
      keywords: "opamp lm741 operational amplifier linear",
    },
    {
      type: "SCR",
      orient: "H",
      title: "SCR Thyristor",
      sub: "TYN612 Gate ON/OFF",
      keywords: "scr thyristor power electronics rectifier",
    },
    {
      type: "DIAC",
      orient: "H",
      title: "DB3 DIAC",
      sub: "V_BO = 32V Trigger",
      keywords: "diac db3 bidirectional trigger diode",
    },
    {
      type: "TRIAC",
      orient: "H",
      title: "BT136 TRIAC",
      sub: "Bidirectional AC",
      keywords: "triac bt136 ac power thyristor switch",
    },
    {
      type: "REG7805",
      orient: "H",
      title: "LM7805 Regulator",
      sub: "+5.0V Linear IC",
      keywords: "lm7805 7805 voltage regulator",
    },
    {
      type: "NE555",
      orient: "H",
      title: "555 Timer IC",
      sub: "1 kHz Astable",
      keywords: "555 timer ne555 oscillator pulse",
    },
    {
      type: "VM",
      orient: "V",
      title: "Voltmeter Probe",
      sub: "Measures ΔV",
      keywords: "voltmeter voltage probe meter",
    },
    {
      type: "AM",
      orient: "H",
      title: "Ammeter Probe",
      sub: "Measures I (mA)",
      keywords: "ammeter current probe meter",
    },
    {
      type: "GND",
      orient: "V",
      title: "Ground (0V Ref)",
      sub: "GND Node",
      keywords: "ground reference 0v",
    },
  ];

  const filteredPalette = paletteCatalog.filter((item) => {
    const q = compSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      item.title.toLowerCase().includes(q) ||
      item.type.toLowerCase().includes(q) ||
      item.keywords.includes(q)
    );
  });

  const getUnit = (type: AnalogCompType) => {
    switch (type) {
      case "R":
      case "POT":
      case "HB":
        return "Ω";
      case "VS":
      case "FG":
      case "D":
      case "D1N4007":
      case "ZD":
      case "DIAC":
      case "REG7805":
      case "LED":
        return "V";
      case "IS":
      case "JFET":
        return "mA";
      case "L":
        return "mH";
      case "C":
      case "CPOL":
      case "CNP":
        return "μF";
      case "BJT":
      case "BC547":
      case "BC557":
        return "β";
      case "OPAMP":
        return "V/V";
      case "NE555":
        return "Hz";
      default:
        return "";
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Scenario Switcher & Live Equivalent Circuit Telemetry */}
      <div className="bg-[#111B2B] border border-[#24344D] rounded-xl p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white">
                Interactive Drag-and-Drop Circuit Schematic Builder (DLD-Style
                Workbench)
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Drag or click components from the left palette onto the canvas,
              click any two terminals to wire Series, Parallel, or Combination
              circuits, and click switches/MOSFETs (`SW`, `MOS`) to toggle ON/OFF.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
            <div className="flex items-center gap-1 bg-slate-900 border border-slate-700 rounded-lg p-1">
              <span className="text-[10px] text-slate-400 px-1.5">Rewire:</span>
              <button
                type="button"
                onClick={() => convertCurrentTopology("series")}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-cyan-500/20 hover:text-cyan-300 text-slate-200 font-bold cursor-pointer transition-colors"
                title="Rewire all current components in Series"
              >
                Series
              </button>
              <button
                type="button"
                onClick={() => convertCurrentTopology("parallel")}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-emerald-500/20 hover:text-emerald-300 text-slate-200 font-bold cursor-pointer transition-colors"
                title="Rewire all current components in Parallel"
              >
                Parallel
              </button>
              <button
                type="button"
                onClick={() => convertCurrentTopology("combination")}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-amber-500/20 hover:text-amber-300 text-slate-200 font-bold cursor-pointer transition-colors"
                title="Rewire current components as Series-Parallel Combination"
              >
                Combination
              </button>
            </div>
            <div className="flex items-center gap-1 bg-slate-900 border border-slate-700 rounded-lg p-1">
              <button
                type="button"
                onClick={handleBuilderUndo}
                disabled={historyPast.length === 0}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-35 text-slate-200 font-bold cursor-pointer"
                title="Undo last circuit edit"
              >
                <Undo2 className="w-3 h-3 text-cyan-400" />
                Undo
              </button>
              <button
                type="button"
                onClick={handleBuilderRedo}
                disabled={historyFuture.length === 0}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-35 text-slate-200 font-bold cursor-pointer"
                title="Redo circuit edit"
              >
                <Redo2 className="w-3 h-3 text-cyan-400" />
                Redo
              </button>
              <button
                type="button"
                onClick={handleSaveCurrentBuilderProject}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-bold cursor-pointer"
                title="Save this circuit independently without overwriting other scenarios"
              >
                <Save className="w-3 h-3" />
                Save{isBuilderDirty ? "*" : ""}
              </button>
              <button
                type="button"
                onClick={() => {
                  const cirText = serializeAnalogCircuitToSpiceNetlist(
                    activeScenario,
                    nodes,
                    mnaSolution.getTermNet,
                    fgConfig
                  );
                  const blob = new Blob([cirText], { type: "text/plain;charset=utf-8" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  const slug = (activeScenario || "spice_circuit")
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, "_")
                    .replace(/^_|_$/g, "");
                  a.href = url;
                  a.download = `${slug || "spice_circuit"}.cir`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                }}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-200 font-bold cursor-pointer"
                title="Download standard SPICE compatible .CIR netlist for academic reporting"
              >
                <Download className="w-3 h-3" />
                Download Netlist
              </button>
            </div>
            <span className="px-2.5 py-1 rounded-md bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 font-bold">
              Topology: {mnaSolution.topologyClass}
            </span>
            {mnaSolution.reqOhm !== null && (
              <span className="px-2.5 py-1 rounded-md bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 font-bold">
                R_eq = {mnaSolution.reqOhm.toFixed(2)} Ω
              </span>
            )}
          </div>
        </div>

        {builderToast && (
          <div className="px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-mono">
            {builderToast}
          </div>
        )}

        {/* One-Click Scenarios across all EE Labs + Saved Custom Copies */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-800">
          <span className="text-[11px] font-mono text-slate-400 mr-1">
            Load Lab Scenario:
          </span>
          {SCENARIO_PRESETS.map((sc) => (
            <button
              key={sc.name}
              type="button"
              onClick={() => loadScenario(sc)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-mono border transition-colors cursor-pointer ${
                activeScenario === sc.name
                  ? "bg-cyan-500/20 border-cyan-400 text-cyan-200 font-bold"
                  : sc.lab === labMode
                  ? "bg-slate-900 border-cyan-500/30 text-cyan-100 hover:border-cyan-400"
                  : "bg-slate-900 border-slate-800 text-slate-300 hover:text-white"
              }`}
            >
              [{sc.category}] {sc.name}
            </button>
          ))}
          {savedProjects.map((sp) => (
            <button
              key={sp.projectId}
              type="button"
              onClick={() => handleLoadSavedBuilderProject(sp)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-mono border border-emerald-500/40 bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 cursor-pointer"
            >
              ★ Saved: {sp.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main Split Workspace: Left Component Palette & Inspector + Right Interactive Canvas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Palette & Selected Component Value Editor */}
        {!isPaletteCollapsed && (
        <div className="lg:col-span-3 bg-[#111B2B] border border-[#24344D] rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between gap-2 pb-1 border-b border-[#24344D]">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#35BDF2]">
              Component Palette
            </span>
            <button
              type="button"
              onClick={() => setIsPaletteCollapsed(true)}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#162338] hover:bg-[#1C2B40] border border-[#24344D] text-[10px] font-mono text-[#9BAAC0] hover:text-[#F1F5FA] cursor-pointer"
              title="Collapse Component Palette to maximize schematic canvas"
            >
              <PanelLeftClose className="w-3 h-3" />
              <span>Collapse</span>
            </button>
          </div>
          {/* Quick Search Filter */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-cyan-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={compSearch}
              onChange={(e) => setCompSearch(e.target.value)}
              placeholder="Search R, L, C, Diode, MOSFET, BJT..."
              className="w-full bg-slate-900/95 border border-slate-700/90 focus:border-cyan-400 rounded-lg pl-8 pr-7 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none"
            />
            {compSearch && (
              <button
                type="button"
                onClick={() => setCompSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-0.5 rounded cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Pre-Placement Custom Component Value Input */}
          <div className="bg-slate-900/90 border border-cyan-500/30 rounded-xl p-3 space-y-1.5">
            <label className="block text-[11px] font-mono font-bold text-cyan-300">
              Enter Value Before Placing (Optional):
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={customPlaceValue}
                onChange={(e) => setCustomPlaceValue(e.target.value)}
                placeholder="e.g. 470, 4.7k, 10k, 12, 47u..."
                className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-400 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white placeholder:text-slate-500 focus:outline-none"
              />
              {customPlaceValue && (
                <button
                  type="button"
                  onClick={() => setCustomPlaceValue("")}
                  className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-mono text-slate-300 cursor-pointer shrink-0"
                  title="Clear custom pre-placement value"
                >
                  Clear
                </button>
              )}
            </div>
            <p className="text-[10px] text-slate-400 leading-snug">
              Type any value (supports <code>k</code>, <code>M</code>,{" "}
              <code>u</code>, <code>n</code>) then click or drag a component
              below, or click any placed component to enter its value directly.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              01. Drag or Click to Place ({filteredPalette.length})
            </h4>
            <div className="grid grid-cols-2 gap-1.5 max-h-[270px] overflow-y-auto pr-1">
              {filteredPalette.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData(
                      "text/plain",
                      `${item.type}:${item.orient}`
                    );
                  }}
                  onClick={() => addComponent(item.type, item.orient)}
                  className="flex flex-col items-start p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/50 transition-colors cursor-grab text-left"
                >
                  <span className="text-[11px] font-bold text-white leading-tight">
                    {item.title}
                  </span>
                  <span className="text-[10px] font-mono text-cyan-400 mt-0.5">
                    {item.sub}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Selected Component Direct Value & Label Inspector */}
          {selectedNode && (
            <div className="bg-slate-950/95 border border-cyan-400/60 rounded-xl p-3.5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-mono font-bold text-cyan-300 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5" />
                  Edit {selectedNode.label} ({selectedNode.type})
                </span>
                {selectedNode.type !== "GND" && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={handleDuplicateSelectedNode}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] font-mono text-purple-300 cursor-pointer"
                      title="Duplicate selected component"
                    >
                      <CopyPlus className="w-3 h-3" />
                      Dup
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setNodes((prev) =>
                          prev.map((n) =>
                            n.id === selectedNode.id
                              ? { ...n, orient: n.orient === "H" ? "V" : "H" }
                              : n
                          )
                        )
                      }
                      className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] font-mono text-slate-200 cursor-pointer"
                      title="Rotate 90° between Horizontal (Series) and Vertical (Parallel)"
                    >
                      <RotateCw className="w-3 h-3 text-cyan-400" />
                      Rotate 90°
                    </button>
                  </div>
                )}
              </div>

              {/* Component Label Input */}
              {selectedNode.type !== "GND" && (
                <div className="space-y-1">
                  <label className="block text-[11px] font-mono text-slate-400">
                    Component Label / ID:
                  </label>
                  <input
                    type="text"
                    value={selectedNode.label}
                    onChange={(e) => {
                      const nextLabel = e.target.value;
                      setNodes((prev) =>
                        prev.map((n) =>
                          n.id === selectedNode.id
                            ? { ...n, label: nextLabel }
                            : n
                        )
                      );
                    }}
                    className="w-full bg-slate-900 border border-slate-700 focus:border-cyan-400 rounded-lg px-2.5 py-1 text-xs font-mono text-white focus:outline-none"
                  />
                </div>
              )}

              {selectedNode.type === "SW" && (
                <button
                  type="button"
                  onClick={() =>
                    setNodes((prev) =>
                      prev.map((n) =>
                        n.id === selectedNode.id
                          ? { ...n, value: n.value >= 1 ? 0 : 1 }
                          : n
                      )
                    )
                  }
                  className={`w-full py-1.5 px-3 rounded-lg text-xs font-mono font-bold border cursor-pointer ${
                    selectedNode.value >= 1
                      ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300"
                      : "bg-slate-800 border-slate-700 text-slate-300"
                  }`}
                >
                  State:{" "}
                  {selectedNode.value >= 1
                    ? "CLOSED / ON (Conducting)"
                    : "OPEN / OFF (Blocked)"}
                </button>
              )}

              {/* Dedicated 3-Terminal Transistor / Semiconductor Inspector Card */}
              {isTransistorOrSemiconductor(selectedNode.type) && (
                <div className="p-3 bg-gradient-to-br from-cyan-950/40 via-slate-900 to-slate-950 border border-cyan-500/40 rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-cyan-300">
                      <Cpu className="w-4 h-4 text-cyan-400" />
                      <span>3-Terminal Device</span>
                    </div>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                      {selectedNode.transistorConfig?.modelName ?? selectedNode.type}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setTransistorModalNode(selectedNode);
                      setIsTransistorModalOpen(true);
                    }}
                    className="w-full py-2 px-3 rounded-lg bg-gradient-to-r from-cyan-500/20 to-emerald-500/20 hover:from-cyan-500/30 hover:to-emerald-500/30 border border-cyan-400/60 text-cyan-200 text-xs font-mono font-bold flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-all"
                  >
                    <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                    Configure Device &amp; Parameters
                  </button>

                  {/* 3-Terminal Live Readouts */}
                  {(() => {
                    const labels = getTerminalLabels(
                      selectedNode.type,
                      selectedNode.transistorConfig?.polarity
                    );
                    const tel = mnaSolution.compTelemetry.get(selectedNode.id);
                    return (
                      <div className="grid grid-cols-3 gap-1 text-[10px] font-mono text-center">
                        <div className="p-1 rounded bg-slate-900/90 border border-slate-800">
                          <div className="text-cyan-400 font-bold">
                            T0 ({labels.t0.label})
                          </div>
                          <div className="text-slate-200">
                            {tel?.vTerm0 !== undefined
                              ? `${tel.vTerm0.toFixed(2)}V`
                              : "--"}
                          </div>
                        </div>
                        <div className="p-1 rounded bg-slate-900/90 border border-slate-800">
                          <div className="text-cyan-400 font-bold">
                            T1 ({labels.t1.label})
                          </div>
                          <div className="text-slate-200">
                            {tel?.vTerm1 !== undefined
                              ? `${tel.vTerm1.toFixed(2)}V`
                              : "--"}
                          </div>
                        </div>
                        <div className="p-1 rounded bg-slate-900/90 border border-amber-500/40">
                          <div className="text-amber-400 font-bold">
                            T2 ({labels.t2?.label ?? "G"})
                          </div>
                          <div className="text-amber-200">
                            {tel?.vTerm2 !== undefined
                              ? `${tel.vTerm2.toFixed(2)}V`
                              : "--"}
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Operating Mode Badge */}
                  {mnaSolution.compTelemetry.get(selectedNode.id)?.operatingRegion && (
                    <div className="text-[11px] font-mono px-2 py-1 rounded bg-[#09101f] border border-cyan-900/50 text-cyan-300">
                      <span className="text-slate-400">Mode: </span>
                      <span className="font-bold">
                        {mnaSolution.compTelemetry.get(selectedNode.id)?.operatingRegion}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {selectedNode.type !== "GND" &&
                selectedNode.type !== "SW" &&
                selectedNode.type !== "MOS" &&
                selectedNode.type !== "SCR" &&
                selectedNode.type !== "TRIAC" &&
                selectedNode.type !== "VM" &&
                selectedNode.type !== "AM" && (
                  <div className="space-y-2.5">
                    <div className="flex justify-between items-center text-xs font-mono">
                      <span className="text-slate-300 font-semibold">
                        Enter Required Value ({getUnit(selectedNode.type)}):
                      </span>
                      <span className="text-emerald-400 font-bold">
                        {selectedNode.value} {getUnit(selectedNode.type)}
                      </span>
                    </div>

                    {/* Direct Numeric Input + Engineering Notation Input */}
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        step="any"
                        value={selectedNode.value}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (isFinite(val) && val >= 0) {
                            setNodes((prev) =>
                              prev.map((n) =>
                                n.id === selectedNode.id
                                  ? { ...n, value: val }
                                  : n
                              )
                            );
                            setDirectValueInput(e.target.value);
                          }
                        }}
                        aria-label={`Enter exact numeric value for ${selectedNode.label}`}
                        className="w-full bg-slate-900 border border-cyan-500/50 focus:border-cyan-400 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-white focus:outline-none"
                      />
                      <span className="text-xs font-mono font-bold text-cyan-300 shrink-0 px-1.5">
                        {getUnit(selectedNode.type)}
                      </span>
                    </div>

                    {/* SI Shorthand Entry (e.g., 4.7k, 10k, 1M, 47u) */}
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={directValueInput}
                        onChange={(e) => setDirectValueInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            const parsed = parseComponentValueInput(
                              directValueInput,
                              selectedNode.type
                            );
                            if (parsed !== null && parsed >= 0) {
                              setNodes((prev) =>
                                prev.map((n) =>
                                  n.id === selectedNode.id
                                    ? { ...n, value: parsed }
                                    : n
                                )
                              );
                            }
                          }
                        }}
                        placeholder={`Type e.g. ${
                          selectedNode.type === "R" ||
                          selectedNode.type === "POT"
                            ? "4.7k, 10k, 220"
                            : selectedNode.type === "VS"
                            ? "5, 9, 12, 24"
                            : "value"
                        } + Enter`}
                        className="flex-1 bg-slate-900 border border-slate-700 focus:border-emerald-400 rounded-lg px-2.5 py-1 text-[11px] font-mono text-emerald-200 placeholder:text-slate-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const parsed = parseComponentValueInput(
                            directValueInput,
                            selectedNode.type
                          );
                          if (parsed !== null && parsed >= 0) {
                            setNodes((prev) =>
                              prev.map((n) =>
                                n.id === selectedNode.id
                                  ? { ...n, value: parsed }
                                  : n
                              )
                            );
                          }
                        }}
                        className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/50 text-emerald-300 text-[11px] font-mono font-bold cursor-pointer shrink-0"
                      >
                        Set
                      </button>
                    </div>

                    {/* Quick Preset Values */}
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {(selectedNode.type === "R" ||
                      selectedNode.type === "POT" ||
                      selectedNode.type === "HB"
                        ? [10, 47, 100, 220, 330, 470, 1000, 2200, 4700, 10000]
                        : selectedNode.type === "VS" ||
                          selectedNode.type === "FG"
                        ? [3.3, 5, 9, 12, 15, 24, 48]
                        : selectedNode.type === "C" ||
                          selectedNode.type === "CPOL" ||
                          selectedNode.type === "CNP"
                        ? [0.1, 1, 4.7, 10, 47, 100, 470]
                        : selectedNode.type === "L"
                        ? [1, 10, 22, 50, 100, 250]
                        : selectedNode.type === "ZD"
                        ? [3.3, 5.1, 6.8, 9.1, 12, 15]
                        : selectedNode.type === "BJT" ||
                          selectedNode.type === "BC547" ||
                          selectedNode.type === "BC557"
                        ? [100, 150, 200, 250, 350, 400]
                        : [0.3, 0.7, 1.8, 2.0, 5.0]
                      ).map((presetVal) => (
                        <button
                          key={presetVal}
                          type="button"
                          onClick={() => {
                            setNodes((prev) =>
                              prev.map((n) =>
                                n.id === selectedNode.id
                                  ? { ...n, value: presetVal }
                                  : n
                              )
                            );
                            setDirectValueInput(String(presetVal));
                          }}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-mono border cursor-pointer ${
                            selectedNode.value === presetVal
                              ? "bg-cyan-400 text-slate-950 border-cyan-300 font-bold"
                              : "bg-slate-900 border-slate-800 text-slate-300 hover:border-cyan-500/40"
                          }`}
                        >
                          {presetVal >= 1000 &&
                          (selectedNode.type === "R" ||
                            selectedNode.type === "POT")
                            ? `${presetVal / 1000}k`
                            : presetVal}
                          {getUnit(selectedNode.type)}
                        </button>
                      ))}
                    </div>

                    {/* Fine Adjustment Slider */}
                    <input
                      type="range"
                      min={
                        selectedNode.type === "R" || selectedNode.type === "POT"
                          ? 1
                          : selectedNode.type === "D" ||
                            selectedNode.type === "D1N4007" ||
                            selectedNode.type === "LED" ||
                            selectedNode.type === "ZD"
                          ? 0.2
                          : 0.1
                      }
                      max={
                        selectedNode.type === "R" || selectedNode.type === "POT"
                          ? Math.max(1000, selectedNode.value * 2)
                          : selectedNode.type === "D" ||
                            selectedNode.type === "D1N4007" ||
                            selectedNode.type === "LED"
                          ? 3.5
                          : selectedNode.type === "ZD"
                          ? 24
                          : selectedNode.type === "L" ||
                            selectedNode.type === "C" ||
                            selectedNode.type === "CPOL" ||
                            selectedNode.type === "BJT" ||
                            selectedNode.type === "BC547" ||
                            selectedNode.type === "BC557"
                          ? Math.max(500, selectedNode.value * 1.5)
                          : Math.max(60, selectedNode.value * 1.5)
                      }
                      step={
                        selectedNode.type === "R" || selectedNode.type === "POT"
                          ? 1
                          : selectedNode.type === "D" ||
                            selectedNode.type === "D1N4007" ||
                            selectedNode.type === "LED" ||
                            selectedNode.type === "ZD"
                          ? 0.1
                          : 0.5
                      }
                      value={selectedNode.value}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setNodes((prev) =>
                          prev.map((n) =>
                            n.id === selectedNode.id ? { ...n, value: val } : n
                          )
                        );
                        setDirectValueInput(String(val));
                      }}
                      className="w-full accent-cyan-400 cursor-pointer"
                    />
                  </div>
                )}

              <button
                type="button"
                onClick={() => {
                  setNodes((prev) =>
                    prev.filter((n) => n.id !== selectedNode.id)
                  );
                  setWires((prev) =>
                    prev.filter(
                      (w) =>
                        w.from.node !== selectedNode.id &&
                        w.to.node !== selectedNode.id
                    )
                  );
                  setSelectedId(null);
                }}
                className="w-full py-1.5 px-2.5 rounded-lg bg-rose-950/50 hover:bg-rose-900/60 border border-rose-500/40 text-rose-300 text-xs font-mono font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Remove Component
              </button>
            </div>
          )}

          {selectedId?.type === "wire" && (
            <button
              type="button"
              onClick={() => {
                setWires((prev) => prev.filter((w) => w.id !== selectedId.id));
                setSelectedId(null);
              }}
              className="w-full py-2 px-3 rounded-lg bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs font-mono font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete Selected Wire
            </button>
          )}

          {selectedNodeIds.length >= 2 && (
            <button
              type="button"
              onClick={handleGroupSelectedIntoSubcircuit}
              className="w-full py-2 px-3 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/50 text-cyan-200 text-xs font-mono font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5" />
              Group {selectedNodeIds.length} Selected (.SUBCKT)
            </button>
          )}

          {subcircuitNotice && (
            <div className="p-2.5 rounded-lg bg-amber-950/60 border border-amber-500/50 text-amber-200 text-[11px] font-mono flex items-start justify-between gap-2">
              <span>{subcircuitNotice}</span>
              <button
                type="button"
                onClick={() => setSubcircuitNotice(null)}
                className="text-amber-300 hover:text-white shrink-0 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              setNodes([]);
              setWires([]);
              setSelectedId(null);
              setSelectedNodeIds([]);
              setPendingTerm(null);
              setSubcircuitNotice(null);
              setActiveScenario("Blank Breadboard");
            }}
            className="w-full py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-mono inline-flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Clear Canvas
          </button>
        </div>
        )}

        {/* Right Interactive Workspace with Focused Full-View Tabs (No Clutter) */}
        <div className={isPaletteCollapsed ? "lg:col-span-12 space-y-4" : "lg:col-span-9 space-y-4"}>
          <SimulationErrorBoundary
            contextLabel="SPICE / MNA Solver"
            abortedReason={mnaSolution.abortedReason}
            validationErrors={mnaSolution.validation?.errors?.map((e) => ({
              code: e.code,
              message: e.message,
              severity: e.severity === "ERROR" ? "ERROR" : "WARNING",
            }))}
            converged={mnaSolution.convergence.converged}
            onResetCircuit={() =>
              loadScenario(
                SCENARIO_PRESETS.find((p) => p.name === activeScenario) ||
                  initialPreset
              )
            }
          >
          {/* Focused 3-Mode View Switcher + Simulation Control Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 bg-[#111B2B] border border-[#24344D] rounded-xl p-3">
            {isPaletteCollapsed && (
              <button
                type="button"
                onClick={() => setIsPaletteCollapsed(false)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#162338] hover:bg-[#1C2B40] border border-[#24344D] text-xs font-mono font-semibold text-[#35BDF2] cursor-pointer"
                title="Expand Left Component Palette"
              >
                <PanelLeftOpen className="w-3.5 h-3.5" />
                <span>Palette</span>
              </button>
            )}
            {/* Dedicated View Tabs so everything is not thrown on screen at once */}
            <div className="flex flex-wrap items-center gap-1.5 bg-[#0B1220] p-1 rounded-xl border border-[#24344D]">
              <button
                type="button"
                onClick={() => {
                  setWorkbenchView("SCHEMATIC");
                  setShowMultisimRack(false);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-colors cursor-pointer ${
                  workbenchView === "SCHEMATIC" && !showMultisimRack
                    ? "bg-cyan-400 text-slate-950"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                01. Schematic &amp; Value Editor
              </button>
              <button
                type="button"
                onClick={() => {
                  setWorkbenchView("SPICE_TABLE");
                  setShowMultisimRack(false);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-colors cursor-pointer ${
                  workbenchView === "SPICE_TABLE" && !showMultisimRack
                    ? "bg-emerald-400 text-slate-950"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                02. SPICE Nodal &amp; Component Table (
                {nodes.filter((n) => n.type !== "GND").length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setWorkbenchView("INSTRUMENTS");
                  setShowMultisimRack(true);
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-colors cursor-pointer ${
                  workbenchView === "INSTRUMENTS" || showMultisimRack
                    ? "bg-purple-400 text-slate-950"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                <Gauge className="w-3.5 h-3.5" />
                03. Virtual Instruments Rack (DMM / DSO / Bode)
              </button>
              <button
                type="button"
                onClick={() => {
                  setWorkbenchView("3D_TWIN");
                  setShowMultisimRack(false);
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-colors cursor-pointer ${
                  workbenchView === "3D_TWIN" && !showMultisimRack
                    ? "bg-cyan-400 text-slate-950"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                04. 3D Bench Twin
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const next = !simRunning;
                  setSimRunning(next);
                  onLogSimulationActivity?.(
                    next
                      ? openCircuitIssues.length > 0
                        ? `Started SPICE Solver (${openCircuitIssues.length} open-circuit issue${openCircuitIssues.length > 1 ? "s" : ""})`
                        : "Started SPICE Solver"
                      : "Paused SPICE Solver",
                    activeScenario,
                    next ? (openCircuitIssues.length > 0 ? "WARN" : "PASS") : "INFO"
                  );
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold border transition-colors cursor-pointer ${
                  simRunning
                    ? "bg-emerald-500/20 border-emerald-400 text-[#48C99A]"
                    : "bg-amber-500/20 border-amber-400 text-[#F1B65B]"
                }`}
              >
                {simRunning ? (
                  <>
                    <Pause className="w-3.5 h-3.5" />
                    SPICE: RUNNING
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" />
                    SPICE: IDLE / STANDBY
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setShowNodalBadges((v) => !v)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono font-semibold border transition-colors cursor-pointer ${
                  showNodalBadges
                    ? "bg-cyan-500/20 border-cyan-400/60 text-cyan-200"
                    : "bg-slate-900 border-slate-700 text-slate-400"
                }`}
              >
                <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                V(n): {showNodalBadges ? "ON" : "OFF"}
              </button>

              <button
                type="button"
                onClick={() => setShowBranchCurrents((v) => !v)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono font-semibold border transition-colors cursor-pointer ${
                  showBranchCurrents
                    ? "bg-emerald-500/20 border-emerald-400/60 text-emerald-200"
                    : "bg-slate-900 border-slate-700 text-slate-400"
                }`}
              >
                I(br): {showBranchCurrents ? "ON" : "OFF"}
              </button>

              {/* Find Open Circuits Button */}
              <button
                type="button"
                onClick={() => {
                  const next = !showOpenCircuitsOverlay;
                  setShowOpenCircuitsOverlay(next);
                  if (next) {
                    onLogSimulationActivity?.(
                      "Open-Circuit Audit",
                      `${activeScenario} (${openCircuitIssues.length} issues)`,
                      openCircuitIssues.length > 0 ? "WARN" : "PASS"
                    );
                  }
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold border transition-colors cursor-pointer whitespace-nowrap ${
                  showOpenCircuitsOverlay
                    ? "bg-amber-500/25 border-amber-400 text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.4)]"
                    : openCircuitIssues.length > 0
                    ? "bg-amber-950/40 hover:bg-amber-900/50 border-amber-500/50 text-amber-300"
                    : "bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-300"
                }`}
                title="Audit schematic for open circuits, floating nodes, and unterminated pins"
              >
                <AlertTriangle
                  className={`w-3.5 h-3.5 ${
                    showOpenCircuitsOverlay || openCircuitIssues.length > 0
                      ? "text-amber-400"
                      : "text-slate-400"
                  }`}
                />
                <span>Find Open Circuits</span>
                {openCircuitIssues.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-500 text-slate-950 font-bold">
                    {openCircuitIssues.length}
                  </span>
                )}
              </button>

              {/* BJT I-V Curve Tracer Button */}
              <button
                type="button"
                onClick={() => setIsBjtCurveTracerOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-500/40 transition-colors cursor-pointer whitespace-nowrap"
                title="Launch I-V Curve Tracer (Simulate & plot collector current Ic vs Vce for BJT components)"
              >
                <TrendingUp className="w-3.5 h-3.5 text-cyan-300" />
                <span>I-V Curve Tracer</span>
                {bjtComponentItems.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-cyan-950 border border-cyan-700 text-cyan-300">
                    {bjtComponentItems.length} BJT
                  </span>
                )}
              </button>

              {/* Simulation Guided Tour Button */}
              <button
                type="button"
                onClick={() => {
                  const opening = !isGuidedTourOpen;
                  setIsGuidedTourOpen(opening);
                  if (opening) {
                    setWorkbenchView("SCHEMATIC");
                    setShowMultisimRack(false);
                    setShowNodalBadges(true);
                    if (tourFocusedNetId === null) {
                      const firstNonZero = mnaSolution.nodalSolutions.find(
                        (ns) => ns.netId !== 0
                      );
                      setTourFocusedNetId(firstNonZero?.netId ?? 0);
                    }
                  }
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold border transition-colors cursor-pointer whitespace-nowrap ${
                  isGuidedTourOpen
                    ? "bg-[#35BDF2] border-[#35BDF2] text-[#0B1220] shadow-[0_0_14px_rgba(53,189,242,0.45)]"
                    : "bg-[#162338] hover:bg-[#1C2B40] border-[#35BDF2]/45 text-[#35BDF2]"
                }`}
                title="Launch Interactive Simulation Guided Tour (Highlights MNA nodes and explains Newton-Raphson convergence)"
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Simulation Guided Tour</span>
              </button>
            </div>
          </div>

          {/* Always-Accessible Quick Component Value Direct Entry Bar */}
          <div className="bg-[#0e1628] border border-cyan-500/35 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-mono font-bold text-cyan-300 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                Quick Component Value Entry:
              </span>
              {/* Select any component in circuit to type its value immediately */}
              <select
                value={selectedNode?.id ?? ""}
                onChange={(e) => {
                  const id = Number(e.target.value);
                  const found = nodeById.get(id);
                  if (found) {
                    setSelectedId({ type: "node", id: found.id });
                    setDirectValueInput(String(found.value));
                  }
                }}
                aria-label="Select component to enter value"
                className="bg-slate-900 border border-slate-700 focus:border-cyan-400 rounded-lg px-2.5 py-1 text-xs font-mono text-white focus:outline-none cursor-pointer"
              >
                <option value="" disabled>
                  -- Select Component on Canvas --
                </option>
                {nodes
                  .filter((n) => n.type !== "GND")
                  .map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.label} ({n.type}) = {n.value} {getUnit(n.type)}
                    </option>
                  ))}
              </select>
            </div>

            {selectedNode &&
            selectedNode.type !== "GND" &&
            selectedNode.type !== "VM" &&
            selectedNode.type !== "AM" ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-mono text-slate-300">
                  Set <strong>{selectedNode.label}</strong> Value:
                </span>
                <input
                  type="number"
                  step="any"
                  value={selectedNode.value}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    if (isFinite(v) && v >= 0) {
                      setNodes((prev) =>
                        prev.map((n) =>
                          n.id === selectedNode.id ? { ...n, value: v } : n
                        )
                      );
                      setDirectValueInput(e.target.value);
                    }
                  }}
                  className="w-28 bg-slate-950 border border-cyan-400/60 focus:border-cyan-300 rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-emerald-300 focus:outline-none"
                />
                <span className="text-xs font-mono font-bold text-cyan-300">
                  {getUnit(selectedNode.type)}
                </span>
                <input
                  type="text"
                  value={directValueInput}
                  onChange={(e) => setDirectValueInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const parsed = parseComponentValueInput(
                        directValueInput,
                        selectedNode.type
                      );
                      if (parsed !== null && parsed >= 0) {
                        setNodes((prev) =>
                          prev.map((n) =>
                            n.id === selectedNode.id
                              ? { ...n, value: parsed }
                              : n
                          )
                        );
                      }
                    }
                  }}
                  placeholder="or type 4.7k, 100u + Enter"
                  className="w-40 bg-slate-950 border border-slate-700 focus:border-emerald-400 rounded-lg px-2.5 py-1 text-xs font-mono text-white placeholder:text-slate-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    const parsed = parseComponentValueInput(
                      directValueInput,
                      selectedNode.type
                    );
                    if (parsed !== null && parsed >= 0) {
                      setNodes((prev) =>
                        prev.map((n) =>
                          n.id === selectedNode.id ? { ...n, value: parsed } : n
                        )
                      );
                    }
                  }}
                  className="px-3 py-1 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-slate-950 text-xs font-mono font-bold cursor-pointer"
                >
                  Apply Value
                </button>
              </div>
            ) : (
              <span className="text-xs font-mono text-slate-400">
                Click any component on the schematic (or choose from the dropdown) to type its exact value.
              </span>
            )}
          </div>

          {/* VIEW 4: SYNCHRONIZED 3D BENCH TWIN */}
          {workbenchView === "3D_TWIN" && !showMultisimRack && (
            <CircuitLab3DView
              title={`${activeScenario} · Interactive 3D Twin`}
              isRunning={simRunning}
              selectedNodeId={selectedId?.type === "node" ? selectedId.id : null}
              supplyVoltageV={
                nodes.find((n) => n.type === "VS" || n.type === "FG")?.value ?? 12
              }
              nodes={nodes.map((n) => {
                const tel = mnaSolution.compTelemetry.get(n.id);
                const iMa = tel?.current_mA ?? 0;
                const vDrop = tel ? Math.abs((tel.vTerm0 ?? 0) - (tel.vTerm1 ?? 0)) : 0;
                const isInteractive =
                  n.type === "SW" ||
                  n.type === "MOS" ||
                  n.type === "SCR" ||
                  n.type === "TRIAC" ||
                  n.type === "POT";
                const isHigh =
                  n.type === "LED"
                    ? Math.abs(iMa) > 0.8
                    : n.type === "SW" || n.type === "MOS" || n.type === "SCR"
                    ? n.value >= 1
                    : Math.abs(iMa) > 0.2;
                return {
                  id: n.id,
                  type: n.type,
                  label: n.label,
                  x: n.x,
                  y: n.y,
                  value: n.value,
                  isHigh,
                  currentMa: iMa,
                  voltageV: tel?.vTerm0 ?? vDrop,
                  isInteractive,
                };
              })}
              wires={wires.map((w) => {
                const telFrom = mnaSolution.compTelemetry.get(w.from.node);
                const telTo = mnaSolution.compTelemetry.get(w.to.node);
                const cur = Math.max(
                  Math.abs(telFrom?.current_mA ?? 0),
                  Math.abs(telTo?.current_mA ?? 0)
                );
                return {
                  id: w.id,
                  fromId: w.from.node,
                  toId: w.to.node,
                  isEnergized: simRunning && cur > 0.15,
                  currentMa: cur,
                };
              })}
              onSelectNode={(id) => {
                const numId = Number(id);
                setSelectedId({ type: "node", id: numId });
                const found = nodeById.get(numId);
                if (found) setDirectValueInput(String(found.value));
              }}
              onToggleInteractiveNode={(id) => {
                const numId = Number(id);
                setNodes((prev) =>
                  prev.map((n) => {
                    if (n.id !== numId) return n;
                    if (n.type === "SW" || n.type === "MOS" || n.type === "SCR" || n.type === "TRIAC") {
                      return { ...n, value: n.value >= 1 ? 0 : 1 };
                    }
                    if (n.type === "POT") {
                      return { ...n, value: (n.value + 1000) % 10000 || 500 };
                    }
                    return n;
                  })
                );
              }}
            />
          )}

          {/* VIEW 1: SCHEMATIC CANVAS & QUICK NODAL READOUT */}
          {workbenchView === "SCHEMATIC" && !showMultisimRack && (
            <>
              {/* Draggable Oscilloscope Wire Probe Dock */}
              <OscilloscopeProbeDock
                attachedProbes={attachedProbes}
                probeToolActive={probeToolActive}
                onSelectProbeTool={setProbeToolActive}
                onRemoveProbe={(ch) =>
                  setAttachedProbes((prev) =>
                    prev.filter((p) => p.channelId !== ch)
                  )
                }
                onClearAllProbes={() => setAttachedProbes([])}
                onAutoProbeWires={handleAutoProbeAnalogWires}
                isPopupOpen={isProbePopupOpen}
                onTogglePopup={() => setIsProbePopupOpen((v) => !v)}
                totalWiresCount={wires.length}
              />

              <div className="relative bg-[#0B1220] border border-[#24344D] rounded-xl overflow-hidden">
                <svg
                  ref={svgRef}
                  viewBox="0 0 760 420"
                  className={`w-full h-auto block select-none ${
                    probeToolActive ? "cursor-crosshair" : ""
                  }`}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const payload = e.dataTransfer.getData("text/plain");
                    if (!payload || !svgRef.current) return;
                    const rect = svgRef.current.getBoundingClientRect();
                    const rawX = ((e.clientX - rect.left) / rect.width) * 760;
                    const rawY = ((e.clientY - rect.top) / rect.height) * 420;

                    if (payload.startsWith("PROBE:")) {
                      const ch = payload.replace("PROBE:", "") as
                        | "CH1"
                        | "CH2"
                        | "CH3"
                        | "CH4";
                      const nearest = findNearestAnalogWire(rawX, rawY, 110);
                      if (nearest) {
                        attachProbeToAnalogWire(
                          ch,
                          nearest.wire.id,
                          nearest.tPos
                        );
                      } else if (wires.length > 0) {
                        const usedIds = new Set(
                          attachedProbes.map((ap) => ap.wireId)
                        );
                        const targetWire =
                          wires.find((w) => !usedIds.has(w.id)) || wires[0];
                        attachProbeToAnalogWire(ch, targetWire.id, 0.5);
                      }
                      return;
                    }

                    const [typeStr, orientStr] = payload.split(":");
                    const snapStep = Math.max(5, gridPitchPx / 2);
                    const x = Math.round(rawX / snapStep) * snapStep;
                    const y = Math.round(rawY / snapStep) * snapStep;
                    addComponent(
                      typeStr as AnalogCompType,
                      (orientStr as "H" | "V") || "H",
                      x,
                      y
                    );
                  }}
                  onPointerMove={(e) => {
                    if (!pendingTerm || !svgRef.current) return;
                    const rect = svgRef.current.getBoundingClientRect();
                    setMousePos({
                      x: ((e.clientX - rect.left) / rect.width) * 760,
                      y: ((e.clientY - rect.top) / rect.height) * 420,
                    });
                  }}
                  onPointerDown={() => {
                    setSelectedId(null);
                    setPendingTerm(null);
                  }}
                >
                  <defs>
                    <pattern
                      id="analog-grid"
                      width={gridPitchPx}
                      height={gridPitchPx}
                      patternUnits="userSpaceOnUse"
                    >
                      <path
                        d={`M ${gridPitchPx} 0 L 0 0 0 ${gridPitchPx}`}
                        fill="none"
                        stroke="#162338"
                        strokeWidth="1"
                      />
                    </pattern>
                  </defs>
                  <rect width="760" height="420" fill="url(#analog-grid)" />

                  {/* Wires */}
                  {wires.map((w) => {
                    const nFrom = nodeById.get(w.from.node);
                    const nTo = nodeById.get(w.to.node);
                    if (!nFrom || !nTo) return null;
                    const p1 = getTermPos(nFrom, w.from.term);
                    const p2 = getTermPos(nTo, w.to.term);
                    const midX = (p1.x + p2.x) / 2;
                    const d = `M ${p1.x},${p1.y} L ${midX},${p1.y} L ${midX},${p2.y} L ${p2.x},${p2.y}`;
                    const isSel =
                      selectedId?.type === "wire" && selectedId.id === w.id;
                    const netV = mnaSolution.getNetVoltage(
                      mnaSolution.getTermNet(w.from.node, w.from.term)
                    );
                    const wireProbe = attachedProbes.find(
                      (p) => p.wireId === w.id
                    );
                    const probeSpec = wireProbe
                      ? PROBE_CHANNELS.find(
                          (c) => c.channelId === wireProbe.channelId
                        )
                      : null;

                    return (
                      <g
                        key={w.id}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        onDrop={(e) => {
                          const payload = e.dataTransfer.getData("text/plain");
                          if (
                            payload &&
                            payload.startsWith("PROBE:") &&
                            svgRef.current
                          ) {
                            e.preventDefault();
                            e.stopPropagation();
                            const ch = payload.replace("PROBE:", "") as
                              | "CH1"
                              | "CH2"
                              | "CH3"
                              | "CH4";
                            const rect = svgRef.current.getBoundingClientRect();
                            const rx =
                              ((e.clientX - rect.left) / rect.width) * 760;
                            const ry =
                              ((e.clientY - rect.top) / rect.height) * 420;
                            const nearest = findNearestAnalogWire(rx, ry, 140);
                            attachProbeToAnalogWire(
                              ch,
                              w.id,
                              nearest?.wire.id === w.id ? nearest.tPos : 0.5
                            );
                          }
                        }}
                      >
                        {probeSpec && (
                          <path
                            d={d}
                            fill="none"
                            stroke={probeSpec.color}
                            strokeWidth={7}
                            opacity={0.24}
                          />
                        )}
                        <path
                          d={d}
                          fill="none"
                          stroke={
                            isSel
                              ? "#ef4444"
                              : probeSpec
                              ? probeSpec.color
                              : Math.abs(netV) > 0.05
                              ? "#22c55e"
                              : "#475569"
                          }
                          strokeWidth={isSel ? 3.5 : 2.6}
                        />
                        <path
                          d={d}
                          fill="none"
                          stroke="transparent"
                          strokeWidth="14"
                          className="cursor-pointer"
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            if (wireProbe) {
                              setIsProbePopupOpen(true);
                            }
                          }}
                          onPointerDown={(e) => {
                            e.stopPropagation();
                            if (probeToolActive && svgRef.current) {
                              const rect =
                                svgRef.current.getBoundingClientRect();
                              const rx =
                                ((e.clientX - rect.left) / rect.width) * 760;
                              const ry =
                                ((e.clientY - rect.top) / rect.height) * 420;
                              const nearest = findNearestAnalogWire(
                                rx,
                                ry,
                                120
                              );
                              attachProbeToAnalogWire(
                                probeToolActive,
                                w.id,
                                nearest?.wire.id === w.id ? nearest.tPos : 0.5
                              );
                              return;
                            }
                            setSelectedId({ type: "wire", id: w.id });
                          }}
                        />
                      </g>
                    );
                  })}

                  {/* Pending Wire Preview */}
                  {pendingTerm &&
                    mousePos &&
                    (() => {
                      const n = nodeById.get(pendingTerm.node);
                      if (!n) return null;
                      const p = getTermPos(n, pendingTerm.term);
                      return (
                        <line
                          x1={p.x}
                          y1={p.y}
                          x2={mousePos.x}
                          y2={mousePos.y}
                          stroke="#f59e0b"
                          strokeWidth="2.2"
                          strokeDasharray="5 4"
                        />
                      );
                    })()}

                  {/* Components */}
                  {nodes.map((n) => {
                    const isSel =
                      selectedId?.type === "node" && selectedId.id === n.id;
                    const telem = mnaSolution.compTelemetry.get(n.id);
                    const t0 = getTermPos(n, 0);
                    const t1 = n.type === "GND" ? null : getTermPos(n, 1);
                    const t2 = isThreeTerminalComponent(n.type) ? getTermPos(n, 2) : null;
                    const termLabels = getTerminalLabels(n.type, n.transistorConfig?.polarity);
                    const isLedLit =
                      n.type === "LED" &&
                      Math.abs(telem?.current_mA ?? 0) > 1.0;

                    return (
                      <g
                        key={n.id}
                        onPointerDown={(e) => {
                          setDirectValueInput(String(n.value));
                          handleNodePointerDown(n.id, e);
                        }}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          if (wasNodeDraggedRef.current) return;
                          if (isTransistorOrSemiconductor(n.type)) {
                            setTransistorModalNode(n);
                            setIsTransistorModalOpen(true);
                          }
                        }}
                        className="cursor-grab group"
                      >
                        {/* Component Body */}
                        {n.type === "GND" ? (
                          <g>
                            <line
                              x1={n.x}
                              y1={n.y - 22}
                              x2={n.x}
                              y2={n.y}
                              stroke="#94a3b8"
                              strokeWidth="2.5"
                            />
                            <line
                              x1={n.x - 16}
                              y1={n.y}
                              x2={n.x + 16}
                              y2={n.y}
                              stroke="#94a3b8"
                              strokeWidth="2.5"
                            />
                            <line
                              x1={n.x - 10}
                              y1={n.y + 6}
                              x2={n.x + 10}
                              y2={n.y + 6}
                              stroke="#94a3b8"
                              strokeWidth="2.5"
                            />
                            <line
                              x1={n.x - 5}
                              y1={n.y + 12}
                              x2={n.x + 5}
                              y2={n.y + 12}
                              stroke="#94a3b8"
                              strokeWidth="2.5"
                            />
                          </g>
                        ) : n.type === "VS" ||
                          n.type === "IS" ||
                          n.type === "VM" ||
                          n.type === "AM" ? (
                          <g>
                            <line
                              x1={t0.x}
                              y1={t0.y}
                              x2={t1!.x}
                              y2={t1!.y}
                              stroke="#38bdf8"
                              strokeWidth="2.5"
                            />
                            <circle
                              cx={n.x}
                              cy={n.y}
                              r="24"
                              fill="#0f172a"
                              stroke={
                                isSel
                                  ? "#f59e0b"
                                  : n.type === "VM" || n.type === "AM"
                                  ? "#10b981"
                                  : "#38bdf8"
                              }
                              strokeWidth="2.4"
                            />
                            <text
                              x={n.x}
                              y={n.y - 4}
                              textAnchor="middle"
                              fill="#f8fafc"
                              fontSize="10"
                              fontFamily="JetBrains Mono"
                              fontWeight="700"
                            >
                              {n.label}
                            </text>
                            <text
                              x={n.x}
                              y={n.y + 11}
                              textAnchor="middle"
                              fill={
                                n.type === "VM" || n.type === "AM"
                                  ? "#4ade80"
                                  : "#38bdf8"
                              }
                              fontSize="9.5"
                              fontFamily="JetBrains Mono"
                              fontWeight="700"
                            >
                              {n.type === "VM"
                                ? `${Math.abs(telem?.vDrop ?? 0).toFixed(1)}V`
                                : n.type === "AM"
                                ? `${Math.abs(telem?.current_mA ?? 0).toFixed(
                                    1
                                  )}mA`
                                : `${n.value}${n.type === "VS" ? "V" : "mA"}`}
                            </text>
                          </g>
                        ) : isThreeTerminalComponent(n.type) ? (
                          /* 3-Terminal Device Schematic Symbols */
                          <g>
                            {/* Outer Enclosure Circle for Transistors */}
                            <circle
                              cx={n.x}
                              cy={n.y}
                              r="26"
                              fill="#0b1326"
                              stroke={isSel ? "#f59e0b" : "#38bdf8"}
                              strokeWidth={isSel ? "2.6" : "1.8"}
                              strokeDasharray={isSel ? "4 2" : undefined}
                            />

                            {/* BJT Schematic Rendering */}
                            {(n.type === "BJT" || n.type === "BC547" || n.type === "BC557") && (
                              <g>
                                {/* Collector Lead (Top: t0) */}
                                <line x1={t0.x} y1={t0.y} x2={n.x} y2={n.y - 18} stroke="#38bdf8" strokeWidth="2.2" />
                                <line x1={n.x} y1={n.y - 18} x2={n.x - 8} y2={n.y - 8} stroke="#38bdf8" strokeWidth="2.2" />

                                {/* Emitter Lead (Bottom: t1) */}
                                <line x1={n.x - 8} y1={n.y + 8} x2={n.x} y2={n.y + 18} stroke="#38bdf8" strokeWidth="2.2" />
                                <line x1={n.x} y1={n.y + 18} x2={t1!.x} y2={t1!.y} stroke="#38bdf8" strokeWidth="2.2" />

                                {/* Base Lead (Left: t2) */}
                                <line x1={t2!.x} y1={t2!.y} x2={n.x - 8} y2={n.y} stroke="#f59e0b" strokeWidth="2.2" />

                                {/* Base Bar */}
                                <line x1={n.x - 8} y1={n.y - 14} x2={n.x - 8} y2={n.y + 14} stroke="#f8fafc" strokeWidth="3.2" strokeLinecap="round" />

                                {/* Emitter Arrow (NPN points OUT towards t1, PNP points IN towards Base) */}
                                {n.type === "BC557" || n.transistorConfig?.polarity === "PNP" ? (
                                  <polygon
                                    points={`${n.x - 6},${n.y + 9} ${n.x - 1},${n.y + 12} ${n.x - 5},${n.y + 16}`}
                                    fill="#f59e0b"
                                    stroke="#f59e0b"
                                  />
                                ) : (
                                  <polygon
                                    points={`${n.x},${n.y + 18} ${n.x - 7},${n.y + 16} ${n.x - 3},${n.y + 11}`}
                                    fill="#22c55e"
                                    stroke="#22c55e"
                                  />
                                )}
                              </g>
                            )}

                            {/* MOSFET Schematic Rendering */}
                            {n.type === "MOS" && (
                              <g>
                                {/* Gate Lead (Left: t2) */}
                                <line x1={t2!.x} y1={t2!.y} x2={n.x - 10} y2={n.y} stroke="#f59e0b" strokeWidth="2.2" />
                                {/* Insulated Gate Plate */}
                                <line x1={n.x - 10} y1={n.y - 14} x2={n.x - 10} y2={n.y + 14} stroke="#f8fafc" strokeWidth="2.6" strokeLinecap="round" />

                                {/* Broken Inversion Channel Plates */}
                                <line x1={n.x - 4} y1={n.y - 14} x2={n.x - 4} y2={n.y - 6} stroke="#38bdf8" strokeWidth="2.4" />
                                <line x1={n.x - 4} y1={n.y - 4} x2={n.x - 4} y2={n.y + 4} stroke="#38bdf8" strokeWidth="2.4" />
                                <line x1={n.x - 4} y1={n.y + 6} x2={n.x - 4} y2={n.y + 14} stroke="#38bdf8" strokeWidth="2.4" />

                                {/* Drain Lead (Top: t0) */}
                                <line x1={n.x - 4} y1={n.y - 10} x2={n.x + 8} y2={n.y - 10} stroke="#38bdf8" strokeWidth="2" />
                                <line x1={n.x + 8} y1={n.y - 10} x2={n.x + 8} y2={n.y - 20} stroke="#38bdf8" strokeWidth="2" />
                                <line x1={n.x + 8} y1={n.y - 20} x2={t0.x} y2={t0.y} stroke="#38bdf8" strokeWidth="2" />

                                {/* Source Lead (Bottom: t1) */}
                                <line x1={n.x - 4} y1={n.y + 10} x2={n.x + 8} y2={n.y + 10} stroke="#38bdf8" strokeWidth="2" />
                                <line x1={n.x + 8} y1={n.y + 10} x2={n.x + 8} y2={n.y + 20} stroke="#38bdf8" strokeWidth="2" />
                                <line x1={n.x + 8} y1={n.y + 20} x2={t1!.x} y2={t1!.y} stroke="#38bdf8" strokeWidth="2" />

                                {/* Substrate Channel Arrow */}
                                <line x1={n.x - 4} y1={n.y} x2={n.x + 8} y2={n.y} stroke="#38bdf8" strokeWidth="1.8" />
                                <line x1={n.x + 8} y1={n.y} x2={n.x + 8} y2={n.y + 10} stroke="#38bdf8" strokeWidth="1.8" />
                                {n.transistorConfig?.polarity === "PMOS" ? (
                                  <polygon points={`${n.x + 5},${n.y} ${n.x},${n.y - 3} ${n.x},${n.y + 3}`} fill="#f59e0b" stroke="#f59e0b" />
                                ) : (
                                  <polygon points={`${n.x - 2},${n.y} ${n.x + 4},${n.y - 3} ${n.x + 4},${n.y + 3}`} fill="#22c55e" stroke="#22c55e" />
                                )}
                              </g>
                            )}

                            {/* SCR Schematic Rendering */}
                            {n.type === "SCR" && (
                              <g>
                                <line x1={t0.x} y1={t0.y} x2={n.x} y2={n.y - 12} stroke="#38bdf8" strokeWidth="2.2" />
                                <polygon points={`${n.x - 10},${n.y - 12} ${n.x + 10},${n.y - 12} ${n.x},${n.y + 6}`} fill="#0f172a" stroke="#38bdf8" strokeWidth="2" />
                                <line x1={n.x - 10} y1={n.y + 6} x2={n.x + 10} y2={n.y + 6} stroke="#38bdf8" strokeWidth="2.8" />
                                <line x1={n.x} y1={n.y + 6} x2={t1!.x} y2={t1!.y} stroke="#38bdf8" strokeWidth="2.2" />
                                <line x1={n.x} y1={n.y + 6} x2={n.x - 10} y2={n.y + 16} stroke="#f59e0b" strokeWidth="2" />
                                <line x1={n.x - 10} y1={n.y + 16} x2={t2!.x} y2={t2!.y} stroke="#f59e0b" strokeWidth="2" />
                              </g>
                            )}

                            {/* JFET Schematic Rendering */}
                            {n.type === "JFET" && (
                              <g>
                                <line x1={t0.x} y1={t0.y} x2={n.x} y2={n.y - 12} stroke="#38bdf8" strokeWidth="2.2" />
                                <line x1={n.x} y1={n.y - 12} x2={n.x - 6} y2={n.y - 12} stroke="#38bdf8" strokeWidth="2" />
                                <line x1={n.x - 6} y1={n.y - 14} x2={n.x - 6} y2={n.y + 14} stroke="#f8fafc" strokeWidth="3" />
                                <line x1={n.x - 6} y1={n.y + 12} x2={n.x} y2={n.y + 12} stroke="#38bdf8" strokeWidth="2" />
                                <line x1={n.x} y1={n.y + 12} x2={t1!.x} y2={t1!.y} stroke="#38bdf8" strokeWidth="2.2" />
                                <line x1={t2!.x} y1={t2!.y} x2={n.x - 6} y2={n.y} stroke="#f59e0b" strokeWidth="2.2" />
                                <polygon points={`${n.x - 7},${n.y} ${n.x - 13},${n.y - 3} ${n.x - 13},${n.y + 3}`} fill="#22c55e" stroke="#22c55e" />
                              </g>
                            )}

                            {/* TRIAC Schematic Rendering */}
                            {n.type === "TRIAC" && (
                              <g>
                                <line x1={t0.x} y1={t0.y} x2={n.x} y2={n.y - 12} stroke="#38bdf8" strokeWidth="2.2" />
                                <line x1={n.x - 13} y1={n.y - 12} x2={n.x + 13} y2={n.y - 12} stroke="#38bdf8" strokeWidth="2.4" />
                                <polygon points={`${n.x - 12},${n.y - 12} ${n.x},${n.y - 12} ${n.x - 6},${n.y + 8}`} fill="#0f172a" stroke="#38bdf8" strokeWidth="1.8" />
                                <polygon points={`${n.x},${n.y + 8} ${n.x + 12},${n.y + 8} ${n.x + 6},${n.y - 12}`} fill="#0f172a" stroke="#38bdf8" strokeWidth="1.8" />
                                <line x1={n.x - 13} y1={n.y + 8} x2={n.x + 13} y2={n.y + 8} stroke="#38bdf8" strokeWidth="2.4" />
                                <line x1={n.x} y1={n.y + 8} x2={t1!.x} y2={t1!.y} stroke="#38bdf8" strokeWidth="2.2" />
                                <line x1={n.x - 6} y1={n.y + 8} x2={n.x - 14} y2={n.y + 15} stroke="#f59e0b" strokeWidth="2" />
                                <line x1={n.x - 14} y1={n.y + 15} x2={t2!.x} y2={t2!.y} stroke="#f59e0b" strokeWidth="2" />
                              </g>
                            )}

                            {/* POT Schematic Rendering */}
                            {n.type === "POT" && (
                              <g>
                                <line x1={t0.x} y1={t0.y} x2={n.x} y2={n.y - 15} stroke="#38bdf8" strokeWidth="2.2" />
                                <rect x={n.x - 10} y={n.y - 15} width="20" height="30" fill="#1e293b" stroke="#38bdf8" strokeWidth="2" rx="2" />
                                <line x1={n.x} y1={n.y + 15} x2={t1!.x} y2={t1!.y} stroke="#38bdf8" strokeWidth="2.2" />
                                <line x1={t2!.x} y1={t2!.y} x2={n.x - 2} y2={n.y} stroke="#f59e0b" strokeWidth="2.2" />
                                <polygon points={`${n.x - 2},${n.y} ${n.x - 7},${n.y - 3} ${n.x - 7},${n.y + 3}`} fill="#f59e0b" stroke="#f59e0b" />
                              </g>
                            )}

                            {/* Component Label & Value Tag */}
                            <text
                              x={n.x + 30}
                              y={n.y - 6}
                              textAnchor="start"
                              fill="#f8fafc"
                              fontSize="10"
                              fontFamily="JetBrains Mono"
                              fontWeight="700"
                            >
                              {n.label}
                            </text>
                            <text
                              x={n.x + 30}
                              y={n.y + 8}
                              textAnchor="start"
                              fill="#38bdf8"
                              fontSize="9.5"
                              fontFamily="JetBrains Mono"
                              fontWeight="600"
                            >
                              {n.transistorConfig?.modelName || (n.value ? `${n.type === "POT" ? `${n.value}Ω` : `β=${n.value}`}` : n.type)}
                            </text>

                            {/* Telemetry Callout */}
                            {telem && showBranchCurrents && (
                              <text
                                x={n.x + 30}
                                y={n.y + 22}
                                textAnchor="start"
                                fill="#4ade80"
                                fontSize="9"
                                fontFamily="JetBrains Mono"
                                fontWeight="700"
                              >
                                {Math.abs(telem.vDrop).toFixed(2)}V · {Math.abs(telem.current_mA).toFixed(1)}mA
                              </text>
                            )}
                          </g>
                        ) : (
                          /* Standard 2-Terminal Components — Clean Engineering Schematic Symbols without Bulky Box Headers/Footers */
                          <g>
                            {/* Terminal Lead Lines */}
                            <line
                              x1={t0.x}
                              y1={t0.y}
                              x2={n.orient === "H" ? n.x - 20 : n.x}
                              y2={n.orient === "H" ? n.y : n.y - 20}
                              stroke="#64748b"
                              strokeWidth="2.4"
                            />
                            <line
                              x1={t1!.x}
                              y1={t1!.y}
                              x2={n.orient === "H" ? n.x + 20 : n.x}
                              y2={n.orient === "H" ? n.y : n.y + 20}
                              stroke="#64748b"
                              strokeWidth="2.4"
                            />

                            {/* Resistor (R): Authentic Zig-Zag Symbol */}
                            {n.type === "R" && (
                              <path
                                d={
                                  n.orient === "H"
                                    ? `M ${n.x - 20},${n.y} L ${n.x - 15},${n.y - 9} L ${n.x - 8},${n.y + 9} L ${n.x},${n.y - 9} L ${n.x + 8},${n.y + 9} L ${n.x + 15},${n.y - 9} L ${n.x + 20},${n.y}`
                                    : `M ${n.x},${n.y - 20} L ${n.x - 9},${n.y - 15} L ${n.x + 9},${n.y - 8} L ${n.x - 9},${n.y} L ${n.x + 9},${n.y + 8} L ${n.x - 9},${n.y + 15} L ${n.x},${n.y + 20}`
                                }
                                fill="none"
                                stroke={isSel ? "#f59e0b" : "#38bdf8"}
                                strokeWidth="2.6"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            )}

                            {/* Capacitor (C, CPOL, CNP): Parallel Plates (+ curved plate & polarity sign for CPOL) */}
                            {(n.type === "C" || n.type === "CPOL" || n.type === "CNP") && (
                              <g>
                                {n.orient === "H" ? (
                                  <>
                                    <line x1={n.x - 20} y1={n.y} x2={n.x - 6} y2={n.y} stroke="#64748b" strokeWidth="2.4" />
                                    <line x1={n.x + 6} y1={n.y} x2={n.x + 20} y2={n.y} stroke="#64748b" strokeWidth="2.4" />
                                    <line x1={n.x - 6} y1={n.y - 15} x2={n.x - 6} y2={n.y + 15} stroke={isSel ? "#f59e0b" : "#06b6d4"} strokeWidth="3" />
                                    {n.type === "CPOL" ? (
                                      <>
                                        <path d={`M ${n.x + 7},${n.y - 15} Q ${n.x + 2},${n.y} ${n.x + 7},${n.y + 15}`} fill="none" stroke={isSel ? "#f59e0b" : "#06b6d4"} strokeWidth="3" />
                                        <text x={n.x - 14} y={n.y - 11} fill="#38bdf8" fontSize="10" fontFamily="JetBrains Mono" fontWeight="700">+</text>
                                      </>
                                    ) : (
                                      <line x1={n.x + 6} y1={n.y - 15} x2={n.x + 6} y2={n.y + 15} stroke={isSel ? "#f59e0b" : "#06b6d4"} strokeWidth="3" />
                                    )}
                                  </>
                                ) : (
                                  <>
                                    <line x1={n.x} y1={n.y - 20} x2={n.x} y2={n.y - 6} stroke="#64748b" strokeWidth="2.4" />
                                    <line x1={n.x} y1={n.y + 6} x2={n.x} y2={n.y + 20} stroke="#64748b" strokeWidth="2.4" />
                                    <line x1={n.x - 15} y1={n.y - 6} x2={n.x + 15} y2={n.y - 6} stroke={isSel ? "#f59e0b" : "#06b6d4"} strokeWidth="3" />
                                    {n.type === "CPOL" ? (
                                      <>
                                        <path d={`M ${n.x - 15},${n.y + 7} Q ${n.x},${n.y + 2} ${n.x + 15},${n.y + 7}`} fill="none" stroke={isSel ? "#f59e0b" : "#06b6d4"} strokeWidth="3" />
                                        <text x={n.x - 18} y={n.y - 9} fill="#38bdf8" fontSize="10" fontFamily="JetBrains Mono" fontWeight="700">+</text>
                                      </>
                                    ) : (
                                      <line x1={n.x - 15} y1={n.y + 6} x2={n.x + 15} y2={n.y + 6} stroke={isSel ? "#f59e0b" : "#06b6d4"} strokeWidth="3" />
                                    )}
                                  </>
                                )}
                              </g>
                            )}

                            {/* Inductor (L): Coil Loops */}
                            {n.type === "L" && (
                              <path
                                d={
                                  n.orient === "H"
                                    ? `M ${n.x - 20},${n.y} Q ${n.x - 15},${n.y - 14} ${n.x - 10},${n.y} Q ${n.x - 5},${n.y - 14} ${n.x},${n.y} Q ${n.x + 5},${n.y - 14} ${n.x + 10},${n.y} Q ${n.x + 15},${n.y - 14} ${n.x + 20},${n.y}`
                                    : `M ${n.x},${n.y - 20} Q ${n.x - 14},${n.y - 15} ${n.x},${n.y - 10} Q ${n.x - 14},${n.y - 5} ${n.x},${n.y} Q ${n.x - 14},${n.y + 5} ${n.x},${n.y + 10} Q ${n.x - 14},${n.y + 15} ${n.x},${n.y + 20}`
                                }
                                fill="none"
                                stroke={isSel ? "#f59e0b" : "#a855f7"}
                                strokeWidth="2.4"
                              />
                            )}

                            {/* Diode / Zener / LED (D, D1N4007, ZD, LED) */}
                            {(n.type === "D" || n.type === "D1N4007" || n.type === "ZD" || n.type === "LED") && (
                              <g>
                                <polygon
                                  points={
                                    n.orient === "H"
                                      ? `${n.x - 12},${n.y - 12} ${n.x - 12},${n.y + 12} ${n.x + 10},${n.y}`
                                      : `${n.x - 12},${n.y - 10} ${n.x + 12},${n.y - 10} ${n.x},${n.y + 12}`
                                  }
                                  fill={isLedLit ? "#22c55e" : "#1e293b"}
                                  stroke={isSel ? "#f59e0b" : isLedLit ? "#22c55e" : "#38bdf8"}
                                  strokeWidth="2.2"
                                />
                                {n.type === "ZD" ? (
                                  <polyline
                                    points={
                                      n.orient === "H"
                                        ? `${n.x + 6},${n.y - 14} ${n.x + 10},${n.y - 11} ${n.x + 10},${n.y + 11} ${n.x + 14},${n.y + 14}`
                                        : `${n.x - 14},${n.y + 8} ${n.x - 11},${n.y + 12} ${n.x + 11},${n.y + 12} ${n.x + 14},${n.y + 16}`
                                    }
                                    fill="none"
                                    stroke={isSel ? "#f59e0b" : "#38bdf8"}
                                    strokeWidth="2.4"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                ) : (
                                  <line
                                    x1={n.orient === "H" ? n.x + 10 : n.x - 12}
                                    y1={n.orient === "H" ? n.y - 12 : n.y + 12}
                                    x2={n.orient === "H" ? n.x + 10 : n.x + 12}
                                    y2={n.orient === "H" ? n.y + 12 : n.y + 12}
                                    stroke={isSel ? "#f59e0b" : isLedLit ? "#22c55e" : "#38bdf8"}
                                    strokeWidth="2.4"
                                  />
                                )}
                                {n.type === "LED" && isLedLit && (
                                  <circle cx={n.x} cy={n.y} r="16" fill="rgba(34, 197, 94, 0.2)" pointerEvents="none" />
                                )}
                              </g>
                            )}

                            {/* DIAC (DB3 Bidirectional Trigger) */}
                            {n.type === "DIAC" && (
                              <g>
                                <rect x={n.x - 14} y={n.y - 14} width="28" height="28" rx="4" fill="#0f172a" stroke={isSel ? "#f59e0b" : "#38bdf8"} strokeWidth="2" />
                                <polygon points={`${n.x - 9},${n.y - 6} ${n.x + 1},${n.y - 6} ${n.x - 4},${n.y + 4}`} fill="#38bdf8" />
                                <polygon points={`${n.x - 1},${n.y + 4} ${n.x + 9},${n.y + 4} ${n.x + 4},${n.y - 6}`} fill="#f59e0b" />
                                <line x1={n.x - 10} y1={n.y - 8} x2={n.x + 10} y2={n.y - 8} stroke="#cbd5e1" strokeWidth="1.6" />
                                <line x1={n.x - 10} y1={n.y + 6} x2={n.x + 10} y2={n.y + 6} stroke="#cbd5e1" strokeWidth="1.6" />
                              </g>
                            )}

                            {/* Hierarchical Subcircuit (.SUBCKT Block) */}
                            {n.type === "HB" && (
                              <g>
                                <rect x={n.x - 22} y={n.y - 16} width="44" height="32" rx="5" fill="#0e172a" stroke={isSel ? "#f59e0b" : "#22d3ee"} strokeWidth="2.2" strokeDasharray="4 2" />
                                <text x={n.x} y={n.y + 3} textAnchor="middle" fill="#67e8f9" fontSize="9.5" fontFamily="JetBrains Mono" fontWeight="700">SUBCKT</text>
                              </g>
                            )}

                            {/* Operational Amplifier (OPAMP) */}
                            {n.type === "OPAMP" && (
                              <g>
                                <polygon
                                  points={
                                    n.orient === "H"
                                      ? `${n.x - 18},${n.y - 16} ${n.x - 18},${n.y + 16} ${n.x + 18},${n.y}`
                                      : `${n.x - 16},${n.y - 18} ${n.x + 16},${n.y - 18} ${n.x},${n.y + 18}`
                                  }
                                  fill="#0f172a"
                                  stroke={isSel ? "#f59e0b" : "#38bdf8"}
                                  strokeWidth="2.2"
                                />
                                <text x={n.orient === "H" ? n.x - 12 : n.x - 6} y={n.orient === "H" ? n.y - 3 : n.y - 5} fill="#4ade80" fontSize="9" fontFamily="JetBrains Mono" fontWeight="bold">+</text>
                                <text x={n.orient === "H" ? n.x - 12 : n.x + 4} y={n.orient === "H" ? n.y + 9 : n.y - 5} fill="#f87171" fontSize="9" fontFamily="JetBrains Mono" fontWeight="bold">−</text>
                              </g>
                            )}

                            {/* Linear Voltage Regulator (REG7805) & 555 Timer IC (NE555) */}
                            {(n.type === "REG7805" || n.type === "NE555") && (
                              <g>
                                <rect x={n.x - 20} y={n.y - 15} width="40" height="30" rx="4" fill="#0f172a" stroke={isSel ? "#f59e0b" : "#a855f7"} strokeWidth="2.2" />
                                <text x={n.x} y={n.y + 3} textAnchor="middle" fill="#e9d5ff" fontSize="9.5" fontFamily="JetBrains Mono" fontWeight="700">
                                  {n.type === "REG7805" ? "7805" : "555"}
                                </text>
                              </g>
                            )}

                            {/* Function Generator (FG) */}
                            {n.type === "FG" && (
                              <g>
                                <circle
                                  cx={n.x}
                                  cy={n.y}
                                  r="18"
                                  fill="#0f172a"
                                  stroke={isSel ? "#f59e0b" : "#38bdf8"}
                                  strokeWidth="2.2"
                                />
                                <text x={n.x} y={n.y - 4} textAnchor="middle" fill="#ef4444" fontSize="11" fontFamily="JetBrains Mono" fontWeight="bold">+</text>
                                <text x={n.x} y={n.y + 11} textAnchor="middle" fill="#94a3b8" fontSize="12" fontFamily="JetBrains Mono" fontWeight="bold">−</text>
                              </g>
                            )}

                            {/* Switch (SW) */}
                            {n.type === "SW" && (
                              <g>
                                {n.orient === "H" ? (
                                  <>
                                    <circle cx={n.x - 14} cy={n.y} r="3.5" fill="#38bdf8" />
                                    <circle cx={n.x + 14} cy={n.y} r="3.5" fill="#38bdf8" />
                                    <line
                                      x1={n.x - 14}
                                      y1={n.y}
                                      x2={n.value >= 1 ? n.x + 14 : n.x + 10}
                                      y2={n.value >= 1 ? n.y : n.y - 16}
                                      stroke={n.value >= 1 ? "#22c55e" : "#ef4444"}
                                      strokeWidth="2.8"
                                      strokeLinecap="round"
                                    />
                                  </>
                                ) : (
                                  <>
                                    <circle cx={n.x} cy={n.y - 14} r="3.5" fill="#38bdf8" />
                                    <circle cx={n.x} cy={n.y + 14} r="3.5" fill="#38bdf8" />
                                    <line
                                      x1={n.x}
                                      y1={n.y - 14}
                                      x2={n.value >= 1 ? n.x : n.x + 16}
                                      y2={n.value >= 1 ? n.y + 14 : n.y + 10}
                                      stroke={n.value >= 1 ? "#22c55e" : "#ef4444"}
                                      strokeWidth="2.8"
                                      strokeLinecap="round"
                                    />
                                  </>
                                )}
                              </g>
                            )}

                            {/* Component Designation & Nominal Spec Text */}
                            <text
                              x={n.orient === "H" ? n.x : n.x + 24}
                              y={n.orient === "H" ? n.y - 12 : n.y - 5}
                              textAnchor={n.orient === "H" ? "middle" : "start"}
                              fill="#f8fafc"
                              fontSize="10"
                              fontFamily="JetBrains Mono"
                              fontWeight="700"
                            >
                              {n.label} {n.type !== "SW" ? `(${n.value}${getUnit(n.type)})` : ""}
                            </text>

                            {/* Exact Live Circuit Values: Voltage Drop & Current Flowing */}
                            {telem && (
                              <text
                                x={n.orient === "H" ? n.x : n.x + 24}
                                y={n.orient === "H" ? n.y + 24 : n.y + 11}
                                textAnchor={n.orient === "H" ? "middle" : "start"}
                                fill="#4ade80"
                                fontSize="9.5"
                                fontFamily="JetBrains Mono"
                                fontWeight="700"
                              >
                                {Math.abs(telem.vDrop).toFixed(2)}V ·{" "}
                                {Math.abs(telem.current_mA) < 1
                                  ? `${(Math.abs(telem.current_mA) * 1000).toFixed(0)}µA`
                                  : `${Math.abs(telem.current_mA).toFixed(1)}mA`}
                              </text>
                            )}
                          </g>
                        )}

                        {/* Terminal 0 (Collector / Drain / Anode / +) */}
                        <g className="cursor-crosshair">
                          <circle
                            cx={t0.x}
                            cy={t0.y}
                            r="5.5"
                            fill={
                              pendingTerm?.node === n.id && pendingTerm.term === 0
                                ? "#f59e0b"
                                : "#0f172a"
                            }
                            stroke="#38bdf8"
                            strokeWidth="2.2"
                            onPointerDown={(e) => handleTermClick(n.id, 0, e)}
                          >
                            <title>{termLabels.t0.name}</title>
                          </circle>
                          {/* Terminal pin abbreviation text */}
                          <text
                            x={t0.x + (isThreeTerminalComponent(n.type) ? 8 : 0)}
                            y={t0.y + (isThreeTerminalComponent(n.type) ? 3 : -8)}
                            textAnchor={isThreeTerminalComponent(n.type) ? "start" : "middle"}
                            fill="#38bdf8"
                            fontSize="8.5"
                            fontFamily="JetBrains Mono"
                            fontWeight="700"
                            className="pointer-events-none select-none"
                          >
                            {termLabels.t0.label}
                          </text>
                        </g>

                        {/* Terminal 1 (Emitter / Source / Cathode / -) */}
                        {t1 && (
                          <g className="cursor-crosshair">
                            <circle
                              cx={t1.x}
                              cy={t1.y}
                              r="5.5"
                              fill={
                                pendingTerm?.node === n.id &&
                                pendingTerm.term === 1
                                  ? "#f59e0b"
                                  : "#0f172a"
                              }
                              stroke="#38bdf8"
                              strokeWidth="2.2"
                              onPointerDown={(e) => handleTermClick(n.id, 1, e)}
                            >
                              <title>{termLabels.t1.name}</title>
                            </circle>
                            <text
                              x={t1.x + (isThreeTerminalComponent(n.type) ? 8 : 0)}
                              y={t1.y + (isThreeTerminalComponent(n.type) ? 3 : 13)}
                              textAnchor={isThreeTerminalComponent(n.type) ? "start" : "middle"}
                              fill="#38bdf8"
                              fontSize="8.5"
                              fontFamily="JetBrains Mono"
                              fontWeight="700"
                              className="pointer-events-none select-none"
                            >
                              {termLabels.t1.label}
                            </text>
                          </g>
                        )}

                        {/* Terminal 2 (Base / Gate / Wiper) */}
                        {t2 && (
                          <g className="cursor-crosshair">
                            <circle
                              cx={t2.x}
                              cy={t2.y}
                              r="5.5"
                              fill={
                                pendingTerm?.node === n.id &&
                                pendingTerm.term === 2
                                  ? "#f59e0b"
                                  : "#0f172a"
                              }
                              stroke="#f59e0b"
                              strokeWidth="2.2"
                              onPointerDown={(e) => handleTermClick(n.id, 2, e)}
                            >
                              <title>{termLabels.t2?.name}</title>
                            </circle>
                            <text
                              x={t2.x}
                              y={t2.y - 8}
                              textAnchor="middle"
                              fill="#f59e0b"
                              fontSize="8.5"
                              fontFamily="JetBrains Mono"
                              fontWeight="700"
                              className="pointer-events-none select-none"
                            >
                              {termLabels.t2?.label}
                            </text>
                          </g>
                        )}
                      </g>
                    );
                  })}

                  {/* Real-Time SPICE Nodal Voltage Markers V(N1..Nk) on Schematic Canvas */}
                  {showNodalBadges &&
                    simRunning &&
                    mnaSolution.nodalSolutions.map((ns) => {
                      const bx = Math.max(48, Math.min(712, ns.anchorX));
                      const by = Math.max(24, Math.min(396, ns.anchorY - 18));
                      const labelText =
                        ns.netId === 0
                          ? `V(0) = 0.00V`
                          : `V(${ns.netName}) = ${
                              ns.voltageV >= 0 ? "+" : ""
                            }${ns.voltageV.toFixed(2)}V`;
                      const pillW = labelText.length * 5.7 + 12;
                      return (
                        <g
                          key={`nodal-badge-${ns.netId}`}
                          className="pointer-events-none"
                        >
                          <rect
                            x={bx - pillW / 2}
                            y={by - 10}
                            width={pillW}
                            height={17}
                            rx={4}
                            fill="#050b16"
                            fillOpacity={0.92}
                            stroke={ns.netId === 0 ? "#64748b" : "#22d3ee"}
                            strokeWidth={1.2}
                          />
                          <text
                            x={bx}
                            y={by + 1.5}
                            textAnchor="middle"
                            fill={ns.netId === 0 ? "#cbd5e1" : "#67e8f9"}
                            fontSize="8.8"
                            fontFamily="JetBrains Mono"
                            fontWeight="700"
                          >
                            {labelText}
                          </text>
                        </g>
                      );
                    })}

                  {/* Interactive Simulation Guided Tour MNA Node Highlight Layer */}
                  {isGuidedTourOpen &&
                    mnaSolution.nodalSolutions.map((ns) => {
                      const cx = Math.max(36, Math.min(724, ns.anchorX));
                      const cy = Math.max(36, Math.min(384, ns.anchorY));
                      const sourceNetIds = new Set<number>();
                      nodes
                        .filter(
                          (node) =>
                            node.type === "VS" ||
                            node.type === "FG" ||
                            node.type === "IS"
                        )
                        .forEach((node) => {
                          sourceNetIds.add(mnaSolution.getTermNet(node.id, 0));
                          sourceNetIds.add(mnaSolution.getTermNet(node.id, 1));
                        });

                      const isKeyForStep =
                        guidedTourStep === 1
                          ? ns.netId === 0
                          : guidedTourStep === 2
                          ? sourceNetIds.has(ns.netId)
                          : guidedTourStep === 3
                          ? tourFocusedNetId !== null
                            ? ns.netId === tourFocusedNetId
                            : ns.netId !== 0
                          : ns.netId !== 0;

                      const isFocused = tourFocusedNetId === ns.netId;
                      if (!isKeyForStep && !isFocused) return null;

                      const ringColor =
                        guidedTourStep === 4 && !mnaSolution.convergence.converged
                          ? "#f07474"
                          : ns.netId === 0
                          ? "#48c99a"
                          : isFocused || guidedTourStep === 3
                          ? "#35bdf2"
                          : "#f1b65b";

                      const badgeTitle =
                        ns.netId === 0
                          ? "MNA DATUM 0V"
                          : guidedTourStep === 4
                          ? mnaSolution.convergence.converged
                            ? `NR OK · ${ns.netName}`
                            : `NR CHECK · ${ns.netName}`
                          : `MNA ${ns.netName}`;

                      return (
                        <g
                          key={`tour-mna-highlight-${ns.netId}`}
                          className="cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            setTourFocusedNetId(ns.netId);
                            if (guidedTourStep < 3) {
                              setGuidedTourStep(3);
                            }
                          }}
                        >
                          <circle
                            cx={cx}
                            cy={cy}
                            r={isFocused ? 24 : 18}
                            fill={ringColor}
                            fillOpacity={isFocused ? 0.16 : 0.1}
                            stroke={ringColor}
                            strokeWidth={isFocused ? 2.4 : 1.8}
                            strokeDasharray="5 3"
                          />
                          <circle
                            cx={cx}
                            cy={cy}
                            r={isFocused ? 11 : 8}
                            fill="none"
                            stroke={ringColor}
                            strokeWidth={1.6}
                          />
                          <circle
                            cx={cx}
                            cy={cy}
                            r={3.5}
                            fill={ringColor}
                            stroke="#0b1220"
                            strokeWidth={1.2}
                          />
                          <g transform={`translate(${cx}, ${Math.min(404, cy + 26)})`}>
                            <rect
                              x={-44}
                              y={-9}
                              width={88}
                              height={16}
                              rx={4}
                              fill="#0b1220"
                              fillOpacity={0.95}
                              stroke={ringColor}
                              strokeWidth={1.2}
                            />
                            <text
                              x={0}
                              y={2}
                              textAnchor="middle"
                              fill={ringColor}
                              fontSize="8.2"
                              fontFamily="JetBrains Mono"
                              fontWeight="700"
                            >
                              {badgeTitle}
                            </text>
                          </g>
                        </g>
                      );
                    })}

                  {/* On-Wire Virtual Oscilloscope Probe Clips */}
                  {attachedProbes.map((probe) => {
                    const w = wires.find((wire) => wire.id === probe.wireId);
                    if (!w) return null;
                    const pt =
                      reDraggingProbe?.channelId === probe.channelId
                        ? { x: reDraggingProbe.x, y: reDraggingProbe.y }
                        : getAnalogWirePointAt(w, probe.tPos ?? 0.5);
                    if (!pt) return null;

                    const sig = probedAnalogSignals.find(
                      (s) => s.channelId === probe.channelId
                    );
                    const spec = PROBE_CHANNELS.find(
                      (c) => c.channelId === probe.channelId
                    )!;

                    return (
                      <SvgWireProbeClip
                        key={probe.channelId}
                        x={pt.x}
                        y={pt.y}
                        channelId={probe.channelId}
                        color={spec.color}
                        netLabel={sig?.netName || `Wire #${w.id}`}
                        valueLabel={`${(sig?.currentVoltage ?? 0).toFixed(2)}V`}
                        onRemove={() =>
                          setAttachedProbes((prev) =>
                            prev.filter((p) => p.channelId !== probe.channelId)
                          )
                        }
                        onStartReDrag={handleStartReDragAnalogProbe}
                        onOpenPopup={() => setIsProbePopupOpen(true)}
                      />
                    );
                  })}

                  {/* Find Open Circuits Visual Overlay on Schematic Canvas */}
                  {showOpenCircuitsOverlay && (
                    <g className="pointer-events-none select-none">
                      {openCircuitIssues.map((issue) => {
                        if (issue.type === "FLOATING_NODE") {
                          return (
                            <g key={issue.id}>
                              {/* Pulsing warning bounding ring */}
                              <rect
                                x={issue.x - 38}
                                y={issue.y - 38}
                                width={76}
                                height={76}
                                rx={10}
                                fill="rgba(245, 158, 11, 0.12)"
                                stroke="#f59e0b"
                                strokeWidth="2.5"
                                strokeDasharray="6 4"
                              />
                              <rect
                                x={issue.x - 52}
                                y={issue.y - 48}
                                width={104}
                                height={18}
                                rx={4}
                                fill="#0f172a"
                                stroke="#f59e0b"
                                strokeWidth="1.2"
                              />
                              <text
                                x={issue.x}
                                y={issue.y - 35}
                                textAnchor="middle"
                                fill="#fbbf24"
                                fontSize="9"
                                fontFamily="JetBrains Mono, monospace"
                                fontWeight="bold"
                              >
                                ⚠ FLOATING NODE
                              </text>
                            </g>
                          );
                        }

                        // Unterminated input or open stub
                        return (
                          <g key={issue.id}>
                            <circle
                              cx={issue.x}
                              cy={issue.y}
                              r={16}
                              fill="rgba(239, 68, 68, 0.18)"
                              stroke="#ef4444"
                              strokeWidth="2.2"
                              strokeDasharray="4 3"
                            />
                            <circle
                              cx={issue.x}
                              cy={issue.y}
                              r={5}
                              fill="#ef4444"
                              stroke="#ffffff"
                              strokeWidth="1.5"
                            />
                            {/* Callout flag */}
                            <g transform={`translate(${issue.x + 8}, ${issue.y - 20})`}>
                              <rect
                                x={0}
                                y={0}
                                width={68}
                                height={16}
                                rx={4}
                                fill="#180c0c"
                                stroke="#ef4444"
                                strokeWidth="1"
                              />
                              <text
                                x={34}
                                y={11.5}
                                textAnchor="middle"
                                fill="#fca5a5"
                                fontSize="8.5"
                                fontFamily="JetBrains Mono, monospace"
                                fontWeight="bold"
                              >
                                ⚡ OPEN PIN
                              </text>
                            </g>
                          </g>
                        );
                      })}
                    </g>
                  )}
                </svg>
              </div>

              {/* Open Circuit Diagnostic HUD Panel */}
              {showOpenCircuitsOverlay && (
                <div className="bg-[#171004] border border-amber-500/50 rounded-xl p-3.5 shadow-lg space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                      </div>
                      <span className="text-xs font-mono font-bold text-amber-200">
                        Open Circuit &amp; Floating Node Analysis
                      </span>
                      <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[11px] font-mono font-semibold">
                        {openCircuitIssues.length} issues identified
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowOpenCircuitsOverlay(false)}
                      className="text-xs font-mono text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-900 border border-slate-800 cursor-pointer"
                    >
                      Hide Overlay ✕
                    </button>
                  </div>

                  {openCircuitIssues.length === 0 ? (
                    <p className="text-xs text-emerald-300 font-mono flex items-center gap-1.5 py-1">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      Zero open circuits detected! All components have closed loops and connected terminals.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                      {openCircuitIssues.map((issue) => (
                        <div
                          key={issue.id}
                          onClick={() => {
                            setSelectedId({ type: "node", id: issue.nodeId });
                          }}
                          className="p-2.5 rounded-lg bg-[#0e0902] border border-amber-500/30 hover:border-amber-400 text-xs font-mono space-y-1 cursor-pointer transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-amber-300 flex items-center gap-1">
                              ⚡ {issue.title}
                            </span>
                            <span className="text-[10px] text-amber-400/80 px-1.5 py-0.5 rounded bg-amber-950/80">
                              {issue.type.replace(/_/g, " ")}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-300">
                            {issue.description}
                          </p>
                          <p className="text-[10px] text-amber-400/90 font-sans">
                            Fix: {issue.remedy}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Concise Nodal Voltage Strip + SPICE Results Console Toggle below canvas */}
              <div className="flex flex-wrap items-center justify-between gap-2 bg-[#111B2B] border border-[#24344D] rounded-xl p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-mono font-bold text-[#35BDF2]">
                    Live Nodal Voltages:
                  </span>
                  {mnaSolution.nodalSolutions.map((ns) => (
                    <span
                      key={ns.netId}
                      className="text-xs font-mono text-[#F1F5FA] bg-[#0B1220] border border-[#24344D] rounded px-2 py-0.5 tabular-nums"
                    >
                      V({ns.netName}) ={" "}
                      <strong className="text-[#48C99A]">
                        {ns.voltageV >= 0 ? "+" : ""}
                        {ns.voltageV.toFixed(dec)}V
                      </strong>
                    </span>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setWorkbenchView("SPICE_TABLE")}
                    className="text-xs font-mono text-[#35BDF2] hover:underline cursor-pointer"
                  >
                    Full Value Table →
                  </button>
                  <span className="text-[#5E708A]">·</span>
                  <button
                    type="button"
                    onClick={() => {
                      setWorkbenchView("INSTRUMENTS");
                      setShowMultisimRack(true);
                    }}
                    className="text-xs font-mono text-purple-300 hover:underline cursor-pointer"
                  >
                    Virtual Instruments →
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsSpiceConsoleOpen((v) => !v)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#35BDF2] hover:bg-[#58CAF5] text-[#0B1220] text-[11px] font-mono font-bold cursor-pointer"
                  >
                    {isSpiceConsoleOpen ? (
                      <>
                        <ChevronDown className="w-3.5 h-3.5" />
                        <span>Hide SPICE Console</span>
                      </>
                    ) : (
                      <>
                        <ChevronUp className="w-3.5 h-3.5" />
                        <span>SPICE Console</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Collapsible & Height-Resizable Bottom SPICE Results Console */}
          {isSpiceConsoleOpen && (
            <div className="bg-[#111B2B] border border-[#24344D] rounded-xl overflow-hidden shadow-xl">
              <div
                onPointerDown={handleStartSpiceResize}
                className="h-2.5 bg-[#162338] hover:bg-[#35BDF2]/25 border-b border-[#24344D] flex items-center justify-center cursor-ns-resize select-none"
                title="Drag vertically to resize SPICE Results Console height (160px – 420px)"
              >
                <span className="w-12 h-1 rounded-full bg-[#3A4D6B]" />
              </div>

              <div className="p-3.5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#24344D] pb-2.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSpiceConsoleTab("NODAL")}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold cursor-pointer border ${
                        spiceConsoleTab === "NODAL"
                          ? "bg-[#35BDF2]/20 border-[#35BDF2] text-[#F1F5FA]"
                          : "bg-[#162338] border-[#24344D] text-[#9BAAC0] hover:text-[#F1F5FA]"
                      }`}
                    >
                      MNA Nodal Voltages ({mnaSolution.nodalSolutions.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setSpiceConsoleTab("DIAGNOSTICS")}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold cursor-pointer border ${
                        spiceConsoleTab === "DIAGNOSTICS"
                          ? "bg-[#35BDF2]/20 border-[#35BDF2] text-[#F1F5FA]"
                          : "bg-[#162338] border-[#24344D] text-[#9BAAC0] hover:text-[#F1F5FA]"
                      }`}
                    >
                      Diagnostics ({openCircuitIssues.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setSpiceConsoleTab("MATRIX_DEBUG")}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono font-bold cursor-pointer border ${
                        spiceConsoleTab === "MATRIX_DEBUG"
                          ? "bg-[#35BDF2]/20 border-[#35BDF2] text-[#F1F5FA]"
                          : !mnaSolution.convergence.converged
                          ? "bg-rose-950/60 border-rose-500/50 text-rose-200 hover:bg-rose-900/60"
                          : "bg-[#162338] border-[#24344D] text-[#9BAAC0] hover:text-[#F1F5FA]"
                      }`}
                    >
                      <Grid3X3 className="w-3.5 h-3.5" />
                      <span>Matrix Debug</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSpiceConsoleTab("NETLIST")}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono font-bold cursor-pointer border ${
                        spiceConsoleTab === "NETLIST"
                          ? "bg-[#35BDF2]/20 border-[#35BDF2] text-[#F1F5FA]"
                          : "bg-[#162338] border-[#24344D] text-[#9BAAC0] hover:text-[#F1F5FA]"
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>SPICE .CIR Netlist</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] font-mono">
                    <span className={simRunning ? "text-[#48C99A] font-bold" : "text-[#F1B65B] font-bold"}>
                      {simRunning ? "RUNNING" : "IDLE / STANDBY"}
                    </span>
                    <span className="text-[#9BAAC0] tabular-nums">
                      ({spiceConsoleHeight}px)
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsSpiceConsoleOpen(false)}
                      className="p-1 rounded bg-[#162338] hover:bg-[#1C2B40] border border-[#24344D] text-[#9BAAC0] hover:text-[#F1F5FA] cursor-pointer"
                      title="Collapse SPICE Console"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div
                  className="overflow-y-auto pr-1"
                  style={{ maxHeight: `${spiceConsoleHeight}px` }}
                >
                  {spiceConsoleTab === "NODAL" && (
                    <div className="space-y-2 text-xs font-mono">
                      <div className="flex flex-wrap items-center justify-between gap-2 bg-[#0B1220] border border-[#24344D] rounded-lg px-3 py-2">
                        <span className="text-[#9BAAC0]">
                          Solver:{" "}
                          <strong className={mnaSolution.convergence.converged ? "text-[#48C99A]" : "text-[#F07474]"}>
                            {mnaSolution.convergence.converged ? "CONVERGED" : "CHECK"}
                          </strong>{" "}
                          ({mnaSolution.convergence.iterations} iter · {mnaSolution.convergence.matrixDimension}×{mnaSolution.convergence.matrixDimension} MNA)
                        </span>
                        <span className="text-[#9BAAC0] tabular-nums">
                          P_src: <strong className="text-[#48C99A]">{mnaSolution.totalSourcePowerMw.toFixed(dec)} mW</strong> · P_load:{" "}
                          <strong className="text-[#35BDF2]">{mnaSolution.totalLoadPowerMw.toFixed(dec)} mW</strong>
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {mnaSolution.nodalSolutions.map((ns) => (
                          <div
                            key={ns.netId}
                            className="p-2.5 rounded-lg bg-[#0B1220] border border-[#24344D] flex items-center justify-between gap-2 tabular-nums"
                          >
                            <div>
                              <div className="font-bold text-[#35BDF2]">
                                V({ns.netName})
                              </div>
                              <div className="text-[10px] text-[#9BAAC0] truncate max-w-[160px]">
                                KCL ∑I = {ns.kclEnteringMa.toFixed(dec)} mA
                              </div>
                            </div>
                            <span className="font-bold text-[#48C99A]">
                              {ns.voltageV >= 0 ? "+" : ""}
                              {ns.voltageV.toFixed(dec)} V
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {spiceConsoleTab === "DIAGNOSTICS" && (
                    <div className="space-y-2 text-xs font-mono">
                      {openCircuitIssues.length === 0 ? (
                        <div className="p-3 rounded-lg bg-[#0B1220] border border-[#48C99A]/40 text-[#48C99A] flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 shrink-0" />
                          <span>
                            All terminals connected &amp; ground reference satisfied ({nodes.length} nodes, {wires.length} nets).
                          </span>
                        </div>
                      ) : (
                        openCircuitIssues.map((issue) => (
                          <div
                            key={issue.id}
                            className="p-2.5 rounded-lg bg-[#0B1220] border border-[#F1B65B]/50 space-y-0.5"
                          >
                            <div className="font-bold text-[#F1B65B]">
                              [{issue.severity}] {issue.title}
                            </div>
                            <div className="text-[#9BAAC0] font-sans text-[11px]">
                              {issue.description} — Fix: {issue.remedy}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {spiceConsoleTab === "MATRIX_DEBUG" && (
                    <MatrixDebugView
                      convergence={mnaSolution.convergence}
                      abortedReason={mnaSolution.abortedReason}
                      validationErrors={mnaSolution.validation?.errors}
                      title={`SPICE Workbench — MNA Matrix [A] · [x] = [b] (${activeScenario})`}
                    />
                  )}

                  {spiceConsoleTab === "NETLIST" && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono text-slate-400">
                          Standard Berkeley SPICE3 / ngspice Netlist (.CIR)
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const cirText = serializeAnalogCircuitToSpiceNetlist(
                              activeScenario,
                              nodes,
                              mnaSolution.getTermNet,
                              fgConfig
                            );
                            const blob = new Blob([cirText], { type: "text/plain;charset=utf-8" });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            const slug = (activeScenario || "spice_circuit")
                              .toLowerCase()
                              .replace(/[^a-z0-9]+/g, "_")
                              .replace(/^_|_$/g, "");
                            a.href = url;
                            a.download = `${slug || "spice_circuit"}.cir`;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            URL.revokeObjectURL(url);
                          }}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-[11px] font-mono font-bold text-cyan-200 cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Download Netlist (.CIR)
                        </button>
                      </div>
                      <pre className="p-3 rounded-lg bg-[#0B1220] border border-[#24344D] text-[11px] font-mono text-[#F1F5FA] overflow-x-auto leading-relaxed">
                        {serializeAnalogCircuitToSpiceNetlist(
                          activeScenario,
                          nodes,
                          mnaSolution.getTermNet,
                          fgConfig
                        )}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Floating Pop-Up Window for Probed Wires */}
          <WireProbePopupWindow
            isOpen={isProbePopupOpen}
            onClose={() => setIsProbePopupOpen(false)}
            mode="analog"
            circuitTitle={activeScenario}
            probedSignals={probedAnalogSignals}
            onRemoveProbe={(ch) =>
              setAttachedProbes((prev) =>
                prev.filter((p) => p.channelId !== ch)
              )
            }
            onClearAllProbes={() => setAttachedProbes([])}
            onAutoProbeWires={handleAutoProbeAnalogWires}
          />

          {/* VIEW 2: FULL SPICE NODAL & BRANCH TABLE WITH DIRECT INLINE VALUE EDITING */}
          {workbenchView === "SPICE_TABLE" && !showMultisimRack && (
            <div className="bg-[#111827] border border-slate-800 rounded-xl p-4 space-y-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-mono text-white font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  REAL-TIME NGSPICE.JS NODAL VOLTAGES V(n), BRANCH CURRENTS &amp; DIRECT VALUE EDITOR
                </span>
                <button
                  type="button"
                  onClick={() => setWorkbenchView("SCHEMATIC")}
                  className="px-3 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-mono text-cyan-300 cursor-pointer"
                >
                  ← Back to Schematic Canvas
                </button>
              </div>

              {/* Nodal Voltage Quick-Readout Strip */}
              <div className="flex flex-wrap items-center gap-2 bg-[#0B1220] border border-[#24344D] rounded-lg p-2.5">
                <span className="text-[11px] font-mono font-bold text-cyan-400 mr-1">
                  SPICE Nodal Voltages:
                </span>
                {mnaSolution.nodalSolutions.map((ns) => (
                  <div
                    key={ns.netId}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-xs font-mono tabular-nums"
                    title={`Connected: ${ns.connectedTerminals.join(", ")} | KCL ∑I = ${ns.kclEnteringMa.toFixed(dec)} mA`}
                  >
                    <span className="text-cyan-300 font-bold">
                      V({ns.netName}):
                    </span>
                    <span className="text-emerald-400 font-bold">
                      {ns.voltageV >= 0 ? "+" : ""}
                      {ns.voltageV.toFixed(dec)} V
                    </span>
                  </div>
                ))}
              </div>

              <div className="overflow-x-auto rounded-lg border border-slate-800">
                <table className="w-full text-xs font-mono border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-cyan-400 border-b border-slate-800">
                      <th className="py-2 px-3 text-left">
                        Component / SPICE ID
                      </th>
                      <th className="py-2 px-3 text-left">
                        Enter Required Value / State
                      </th>
                      <th className="py-2 px-3 text-center">Nets (N+, N−)</th>
                      <th className="py-2 px-3 text-right">Node V(+)</th>
                      <th className="py-2 px-3 text-right">Node V(−)</th>
                      <th className="py-2 px-3 text-right">Drop ΔV</th>
                      <th className="py-2 px-3 text-right">Branch Current I</th>
                      <th className="py-2 px-3 text-right">Power P</th>
                      <th className="py-2 px-3 text-left">
                        SPICE Operating Region
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {nodes
                      .filter((n) => n.type !== "GND")
                      .map((n) => {
                        const t = mnaSolution.compTelemetry.get(n.id);
                        const netPos = mnaSolution.getTermNet(n.id, 0);
                        const netNeg = mnaSolution.getTermNet(n.id, 1);
                        const isSel =
                          selectedId?.type === "node" && selectedId.id === n.id;
                        return (
                          <tr
                            key={n.id}
                            onClick={() => {
                              setSelectedId({ type: "node", id: n.id });
                              setDirectValueInput(String(n.value));
                            }}
                            className={`border-b border-slate-800/60 cursor-pointer ${
                              isSel
                                ? "bg-cyan-500/15 text-white font-bold"
                                : "text-slate-300 hover:bg-slate-900/50"
                            }`}
                          >
                            <td className="py-1.5 px-3 text-white font-semibold whitespace-nowrap">
                              {n.label} ({n.type})
                            </td>
                            <td
                              className="py-1.5 px-3 text-cyan-300 whitespace-nowrap"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {n.type === "SW" ||
                              n.type === "MOS" ||
                              n.type === "SCR" ||
                              n.type === "TRIAC" ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setNodes((prev) =>
                                      prev.map((item) =>
                                        item.id === n.id
                                          ? {
                                              ...item,
                                              value: item.value >= 1 ? 0 : 1,
                                            }
                                          : item
                                      )
                                    )
                                  }
                                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-xs font-mono text-emerald-300 border border-slate-700 cursor-pointer"
                                >
                                  {n.value >= 1
                                    ? "ON (Conducting)"
                                    : "OFF (Blocking)"}
                                </button>
                              ) : n.type === "VM" || n.type === "AM" ? (
                                "Active Probe"
                              ) : (
                                <div className="inline-flex items-center gap-1.5">
                                  <input
                                    type="number"
                                    step="any"
                                    value={n.value}
                                    onChange={(e) => {
                                      const val = parseFloat(e.target.value);
                                      if (isFinite(val) && val >= 0) {
                                        setNodes((prev) =>
                                          prev.map((item) =>
                                            item.id === n.id
                                              ? { ...item, value: val }
                                              : item
                                          )
                                        );
                                      }
                                    }}
                                    className="w-24 bg-slate-950 border border-slate-700 focus:border-cyan-400 rounded px-2 py-0.5 text-xs font-mono text-white focus:outline-none"
                                  />
                                  <span className="text-slate-400">
                                    {getUnit(n.type)}
                                  </span>
                                </div>
                              )}
                            </td>
                            <td className="py-1.5 px-3 text-center text-slate-400 whitespace-nowrap">
                              (N{netPos}, N{netNeg})
                            </td>
                            <td className="py-1.5 px-3 text-right whitespace-nowrap tabular-nums">
                              {(t?.vTerm0 ?? 0).toFixed(dec)} V
                            </td>
                            <td className="py-1.5 px-3 text-right whitespace-nowrap tabular-nums">
                              {(t?.vTerm1 ?? 0).toFixed(dec)} V
                            </td>
                            <td className="py-1.5 px-3 text-right text-amber-300 whitespace-nowrap tabular-nums">
                              {Math.abs(t?.vDrop ?? 0).toFixed(dec)} V
                            </td>
                            <td className="py-1.5 px-3 text-right text-emerald-400 font-bold whitespace-nowrap tabular-nums">
                              {(t?.current_mA ?? 0) >= 0 ? "+" : ""}
                              {(t?.current_mA ?? 0).toFixed(dec)} mA
                            </td>
                            <td className="py-1.5 px-3 text-right text-purple-300 whitespace-nowrap tabular-nums">
                              {(t?.power_mW ?? 0).toFixed(dec)} mW
                            </td>
                            <td className="py-1.5 px-3 text-left text-[11px] text-slate-300">
                              {t?.operatingRegion ?? "Linear"}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VIEW 3: REAL-TIME NI MULTISIM VIRTUAL INSTRUMENTS & SPICE ANALYSIS SUITE */}
          {(workbenchView === "INSTRUMENTS" || showMultisimRack) && (
            <div className="space-y-3">
              <div className="flex items-center justify-between bg-[#111827] border border-slate-800 rounded-xl px-4 py-2.5">
                <span className="text-xs font-mono font-bold text-purple-300">
                  NI Multisim Virtual Instruments Rack (XMM1 · XFG1 · XSC1 · XBP1 · XWM1 · .CIR)
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setWorkbenchView("SCHEMATIC");
                    setShowMultisimRack(false);
                  }}
                  className="px-3 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-mono text-cyan-300 cursor-pointer"
                >
                  ← Back to Schematic Canvas
                </button>
              </div>
              <MultisimInstrumentsPanel
                nodes={nodes}
                wires={wires}
                compTelemetry={mnaSolution.compTelemetry}
                nodalSolutions={mnaSolution.nodalSolutions}
                branchSolutions={mnaSolution.branchSolutions}
                convergence={mnaSolution.convergence}
                getTermNet={mnaSolution.getTermNet}
                getNetVoltage={mnaSolution.getNetVoltage}
                reqOhm={mnaSolution.reqOhm}
                fgConfig={fgConfig}
                onChangeFgConfig={setFgConfig}
                simRunning={simRunning}
                requestedTab={requestedInstrumentTab}
                onImportSpiceNodes={(parsedNodes, parsedWires) => {
                  idCounter.current = 1;
                  const builtNodes: AnalogNode[] = parsedNodes.map((n) => ({
                    ...n,
                    id: idCounter.current++,
                  }));
                  const builtWires: AnalogWire[] = parsedWires
                    .filter((w) => builtNodes[w[0]] && builtNodes[w[2]])
                    .map((w) => ({
                      id: idCounter.current++,
                      from: { node: builtNodes[w[0]].id, term: w[1] },
                      to: { node: builtNodes[w[2]].id, term: w[3] },
                    }));
                  setNodes(builtNodes);
                  setWires(builtWires);
                  setActiveScenario("Imported SPICE3 .CIR Netlist");
                  setWorkbenchView("SCHEMATIC");
                  setShowMultisimRack(false);
                }}
              />
            </div>
          )}
          </SimulationErrorBoundary>
        </div>

        {/* 3-TERMINAL SEMICONDUCTOR TRANSISTOR CONFIGURATION MODAL */}
        <TransistorConfigModal
          isOpen={isTransistorModalOpen}
          node={transistorModalNode}
          onClose={() => {
            setIsTransistorModalOpen(false);
            setTransistorModalNode(null);
          }}
          onSave={(updated) => {
            if (!transistorModalNode) return;
            setNodes((prev) =>
              prev.map((n) =>
                n.id === transistorModalNode.id
                  ? {
                      ...n,
                      label: updated.label,
                      type: updated.type,
                      value: updated.value,
                      transistorConfig: updated.transistorConfig,
                    }
                  : n
              )
            );
            setIsTransistorModalOpen(false);
            setTransistorModalNode(null);
          }}
        />

        {/* Dedicated BJT I-V Characteristic Curve Tracer Modal */}
        <BjtCurveTracerModal
          isOpen={isBjtCurveTracerOpen}
          onClose={() => setIsBjtCurveTracerOpen(false)}
          bjtList={bjtComponentItems}
          onSelectNodeInCanvas={(id) => setSelectedId({ type: "node", id })}
          onAddBjtToCanvas={(_model) => {
            addComponent("BJT", "V", 360, 200);
          }}
          vccSupply={nodes.find((n) => n.type === "VS")?.value || 12}
          rcCollectorResistor={
            nodes.find(
              (n) =>
                n.type === "R" &&
                (n.label.toLowerCase().includes("c") || n.label.toLowerCase().includes("rc"))
            )?.value || 1000
          }
        />

        {/* Interactive SPICE Simulation Guided Tour Overlay */}
        <SpiceGuidedTourOverlay
          isOpen={isGuidedTourOpen}
          onClose={() => setIsGuidedTourOpen(false)}
          step={guidedTourStep}
          onStepChange={(nextStep) => {
            setGuidedTourStep(nextStep);
            if (nextStep === 1) {
              setTourFocusedNetId(0);
            } else if (nextStep === 3 && (tourFocusedNetId === null || tourFocusedNetId === 0)) {
              const firstNonZero = mnaSolution.nodalSolutions.find(
                (ns) => ns.netId !== 0
              );
              if (firstNonZero) setTourFocusedNetId(firstNonZero.netId);
            }
          }}
          nodes={nodes}
          mnaSolution={mnaSolution}
          activeScenario={activeScenario}
          focusedNetId={tourFocusedNetId}
          onFocusNetId={(netId) => {
            setTourFocusedNetId(netId);
            setWorkbenchView("SCHEMATIC");
            setShowMultisimRack(false);
          }}
          onOpenMatrixDebug={() => {
            setWorkbenchView("SCHEMATIC");
            setShowMultisimRack(false);
            setIsSpiceConsoleOpen(true);
            setSpiceConsoleTab("MATRIX_DEBUG");
          }}
          onOpenOscilloscope={() => {
            setRequestedInstrumentTab({
              tab: "TRANSIENT",
              seq: Date.now(),
            });
            setWorkbenchView("INSTRUMENTS");
            setShowMultisimRack(true);
          }}
          onRunOpenCircuitAudit={() => {
            setWorkbenchView("SCHEMATIC");
            setShowMultisimRack(false);
            setShowOpenCircuitsOverlay(true);
          }}
          openCircuitCount={openCircuitIssues.length}
        />
      </div>
    </div>
  );
}

const SeriesParallelBuilder = React.memo(SeriesParallelBuilderInner);
export default SeriesParallelBuilder;
