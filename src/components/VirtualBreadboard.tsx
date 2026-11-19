import React, { useState, useMemo, useRef, useCallback, useEffect } from "react";
import {
  Sparkles,
  Zap,
  RotateCw,
  Trash2,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Play,
  Pause,
  Layers,
  Activity,
  PlusCircle,
  Save,
  Download,
  Upload,
  Eye,
  RefreshCw,
  Search,
  Cpu,
  ChevronDown,
  ChevronUp,
  X,
  SlidersHorizontal,
  Box,
  Lock,
  Unlock,
  Crosshair,
  Pin,
  PinOff,
  Gauge,
  AlertTriangle,
  ShieldCheck,
  Plus,
  RotateCcw,
  Link2,
} from "lucide-react";
import {
  REALISTIC_COMPONENTS,
  calculateResistorColorBands,
} from "../data/realisticComponentsData";
import {
  SVG_PITCH_X,
  SVG_PITCH_Y,
  SVG_RAIL_BOT_NEG_Y,
  SVG_RAIL_BOT_POS_Y,
  SVG_RAIL_TOP_NEG_Y,
  SVG_RAIL_TOP_POS_Y,
  SVG_START_X,
  SVG_TERMINAL_A_Y,
  SVG_TERMINAL_F_Y,
  SVG_TROUGH_Y,
  compileBreadboardSpiceNetlist,
  formatCompactHole,
  formatHoleLabel,
  holeToElectricalStripKey,
  holeToSvgXY,
  svgXYToNearestHole,
  type BbCompType,
  type BreadboardComponentItem,
  type BreadboardHoleId,
  type BreadboardPmeType,
  type BreadboardWire,
  type BreadboardWireColor,
  type InstalledBreadboardPme,
} from "../utils/breadboardCoordMapper";
import Breadboard3DViewport from "./Breadboard3DViewport";

export type WireColor = BreadboardWireColor;
export type {
  BreadboardHoleId,
  BreadboardWire,
  BbCompType,
  BreadboardComponentItem,
};

// Built-in Breadboard Experiment Presets
interface BreadboardPreset {
  name: string;
  description: string;
  vSource: number;
  components: BreadboardComponentItem[];
  wires: BreadboardWire[];
}

const PRESET_LED_CIRCUIT: BreadboardPreset = {
  name: "01. Basic DC LED & Resistor Switch",
  description: "DC 5V rail feeding a 330Ω current limiting resistor in series with a 5mm Red LED to Ground.",
  vSource: 5.0,
  components: [
    {
      id: "R1",
      type: "RESISTOR",
      label: "R1 (330Ω)",
      value: 330,
      formattedValue: "330 Ω",
      pins: {
        T1: { type: "RAIL", rail: "TOP_POS", col: 10 },
        T2: { type: "TERMINAL", col: 15, row: "C" },
      },
    },
    {
      id: "LED1",
      type: "LED_RED",
      label: "LED1 (Red)",
      value: 2.0,
      formattedValue: "2.0V Red",
      pins: {
        ANODE: { type: "TERMINAL", col: 15, row: "D" },
        CATHODE: { type: "TERMINAL", col: 18, row: "D" },
      },
    },
  ],
  wires: [
    {
      id: "w1",
      from: { type: "TERMINAL", col: 18, row: "E" },
      to: { type: "RAIL", rail: "TOP_NEG", col: 18 },
      color: "#0f172a",
    },
  ],
};

const PRESET_555_TIMER: BreadboardPreset = {
  name: "02. NE555 Precision Astable LED Flasher",
  description: "NE555 DIP-8 timer straddling the center divider with timing network (Ra 10k, Rb 47k, C 10µF) driving output pin 3.",
  vSource: 9.0,
  components: [
    {
      id: "U1",
      type: "IC_NE555",
      label: "U1 (NE555P)",
      value: 555,
      formattedValue: "NE555 Timer",
      pins: {
        PIN1_GND: { type: "TERMINAL", col: 20, row: "E" },
        PIN2_TRIG: { type: "TERMINAL", col: 21, row: "E" },
        PIN3_OUT: { type: "TERMINAL", col: 22, row: "E" },
        PIN4_RST: { type: "TERMINAL", col: 23, row: "E" },
        PIN5_CTRL: { type: "TERMINAL", col: 23, row: "F" },
        PIN6_THRES: { type: "TERMINAL", col: 22, row: "F" },
        PIN7_DISCH: { type: "TERMINAL", col: 21, row: "F" },
        PIN8_VCC: { type: "TERMINAL", col: 20, row: "F" },
      },
    },
    {
      id: "R_RA",
      type: "RESISTOR",
      label: "Ra (10k)",
      value: 10000,
      formattedValue: "10 kΩ",
      pins: {
        T1: { type: "RAIL", rail: "TOP_POS", col: 20 },
        T2: { type: "TERMINAL", col: 21, row: "H" },
      },
    },
    {
      id: "R_RB",
      type: "RESISTOR",
      label: "Rb (47k)",
      value: 47000,
      formattedValue: "47 kΩ",
      pins: {
        T1: { type: "TERMINAL", col: 21, row: "J" },
        T2: { type: "TERMINAL", col: 22, row: "H" },
      },
    },
    {
      id: "C_TIME",
      type: "CAP_ELECTROLYTIC",
      label: "C1 (10µF)",
      value: 0.00001,
      formattedValue: "10 µF",
      pins: {
        ANODE: { type: "TERMINAL", col: 21, row: "B" },
        CATHODE: { type: "RAIL", rail: "BOT_NEG", col: 21 },
      },
    },
    {
      id: "R_OUT",
      type: "RESISTOR",
      label: "R_led (470Ω)",
      value: 470,
      formattedValue: "470 Ω",
      pins: {
        T1: { type: "TERMINAL", col: 22, row: "C" },
        T2: { type: "TERMINAL", col: 27, row: "C" },
      },
    },
    {
      id: "LED_OUT",
      type: "LED_BLUE",
      label: "LED (Blue)",
      value: 3.2,
      formattedValue: "Blue LED",
      pins: {
        ANODE: { type: "TERMINAL", col: 27, row: "D" },
        CATHODE: { type: "RAIL", rail: "BOT_NEG", col: 27 },
      },
    },
  ],
  wires: [
    {
      id: "w_vcc",
      from: { type: "TERMINAL", col: 20, row: "J" },
      to: { type: "RAIL", rail: "TOP_POS", col: 20 },
      color: "#ef4444",
    },
    {
      id: "w_gnd",
      from: { type: "TERMINAL", col: 20, row: "A" },
      to: { type: "RAIL", rail: "BOT_NEG", col: 20 },
      color: "#0f172a",
    },
    {
      id: "w_trig_thres",
      from: { type: "TERMINAL", col: 21, row: "C" },
      to: { type: "TERMINAL", col: 22, row: "G" },
      color: "#eab308",
    },
    {
      id: "w_rst_vcc",
      from: { type: "TERMINAL", col: 23, row: "C" },
      to: { type: "RAIL", rail: "TOP_POS", col: 23 },
      color: "#ef4444",
    },
  ],
};

const PRESET_BJT_SWITCH: BreadboardPreset = {
  name: "03. BJT BC547 Transistor Low-Side Switch",
  description: "NPN transistor driving a 12V relay/LED with base resistor limiting current from a 5V logic input.",
  vSource: 5.0,
  components: [
    {
      id: "Q1",
      type: "BJT_BC547",
      label: "Q1 (BC547)",
      value: 200,
      formattedValue: "BC547B NPN",
      pins: {
        COLLECTOR: { type: "TERMINAL", col: 35, row: "C" },
        BASE: { type: "TERMINAL", col: 36, row: "C" },
        EMITTER: { type: "TERMINAL", col: 37, row: "C" },
      },
    },
    {
      id: "R_BASE",
      type: "RESISTOR",
      label: "Rb (4.7kΩ)",
      value: 4700,
      formattedValue: "4.7 kΩ",
      pins: {
        T1: { type: "RAIL", rail: "TOP_POS", col: 32 },
        T2: { type: "TERMINAL", col: 36, row: "D" },
      },
    },
    {
      id: "R_LOAD",
      type: "RESISTOR",
      label: "Rc (330Ω)",
      value: 330,
      formattedValue: "330 Ω",
      pins: {
        T1: { type: "RAIL", rail: "TOP_POS", col: 35 },
        T2: { type: "TERMINAL", col: 35, row: "G" },
      },
    },
    {
      id: "LED_LOAD",
      type: "LED_GREEN",
      label: "LED (Green)",
      value: 2.2,
      formattedValue: "Green LED",
      pins: {
        ANODE: { type: "TERMINAL", col: 35, row: "H" },
        CATHODE: { type: "TERMINAL", col: 35, row: "B" },
      },
    },
  ],
  wires: [
    {
      id: "w_emit_gnd",
      from: { type: "TERMINAL", col: 37, row: "A" },
      to: { type: "RAIL", rail: "BOT_NEG", col: 37 },
      color: "#0f172a",
    },
  ],
};

const PRESET_VOLTAGE_DIVIDER: BreadboardPreset = {
  name: "04. Resistor Voltage Divider & Potentiometer",
  description: "Series voltage divider network with R1 (10kΩ) and R2 (4.7kΩ) illustrating KVL and midpoint potential.",
  vSource: 10.0,
  components: [
    {
      id: "R_TOP",
      type: "RESISTOR",
      label: "R1 (10kΩ)",
      value: 10000,
      formattedValue: "10 kΩ",
      pins: {
        T1: { type: "RAIL", rail: "TOP_POS", col: 12 },
        T2: { type: "TERMINAL", col: 16, row: "C" },
      },
    },
    {
      id: "R_BOT",
      type: "RESISTOR",
      label: "R2 (4.7kΩ)",
      value: 4700,
      formattedValue: "4.7 kΩ",
      pins: {
        T1: { type: "TERMINAL", col: 16, row: "D" },
        T2: { type: "RAIL", rail: "BOT_NEG", col: 16 },
      },
    },
  ],
  wires: [],
};

const PRESET_BRIDGE_RECTIFIER: BreadboardPreset = {
  name: "05. Full-Wave Bridge Rectifier with Filter",
  description: "4-diode Graetz bridge network (1N4007) with 100µF electrolytic capacitor filter smoothing DC ripple.",
  vSource: 12.0,
  components: [
    {
      id: "D1",
      type: "DIODE_1N4007",
      label: "D1 (1N4007)",
      value: 0.7,
      formattedValue: "1N4007 Diode",
      pins: {
        ANODE: { type: "RAIL", rail: "TOP_POS", col: 25 },
        CATHODE: { type: "TERMINAL", col: 28, row: "C" },
      },
    },
    {
      id: "D2",
      type: "DIODE_1N4007",
      label: "D2 (1N4007)",
      value: 0.7,
      formattedValue: "1N4007 Diode",
      pins: {
        ANODE: { type: "TERMINAL", col: 28, row: "B" },
        CATHODE: { type: "RAIL", rail: "BOT_NEG", col: 28 },
      },
    },
    {
      id: "C_FILT",
      type: "CAP_ELECTROLYTIC",
      label: "C1 (100µF)",
      value: 0.0001,
      formattedValue: "100 µF Filter",
      pins: {
        ANODE: { type: "TERMINAL", col: 30, row: "C" },
        CATHODE: { type: "RAIL", rail: "BOT_NEG", col: 30 },
      },
    },
    {
      id: "R_LOAD",
      type: "RESISTOR",
      label: "R_load (1kΩ)",
      value: 1000,
      formattedValue: "1 kΩ",
      pins: {
        T1: { type: "TERMINAL", col: 32, row: "C" },
        T2: { type: "RAIL", rail: "BOT_NEG", col: 32 },
      },
    },
  ],
  wires: [
    {
      id: "w_br1",
      from: { type: "TERMINAL", col: 28, row: "D" },
      to: { type: "TERMINAL", col: 30, row: "D" },
      color: "#ef4444",
    },
    {
      id: "w_br2",
      from: { type: "TERMINAL", col: 30, row: "E" },
      to: { type: "TERMINAL", col: 32, row: "D" },
      color: "#ef4444",
    },
  ],
};

const PRESET_ZENER_REGULATOR: BreadboardPreset = {
  name: "06. Zener Diode Voltage Regulator",
  description: "Reverse-biased 5.1V Zener diode clamp maintaining constant 5.1V across load despite line voltage shifts.",
  vSource: 12.0,
  components: [
    {
      id: "R_SERIES",
      type: "RESISTOR",
      label: "Rs (470Ω)",
      value: 470,
      formattedValue: "470 Ω",
      pins: {
        T1: { type: "RAIL", rail: "TOP_POS", col: 40 },
        T2: { type: "TERMINAL", col: 44, row: "C" },
      },
    },
    {
      id: "D_ZENER",
      type: "DIODE_ZENER",
      label: "Zener (5.1V)",
      value: 5.1,
      formattedValue: "5.1V Zener",
      pins: {
        CATHODE: { type: "TERMINAL", col: 44, row: "D" },
        ANODE: { type: "RAIL", rail: "BOT_NEG", col: 44 },
      },
    },
    {
      id: "R_LOAD_Z",
      type: "RESISTOR",
      label: "R_load (1kΩ)",
      value: 1000,
      formattedValue: "1 kΩ",
      pins: {
        T1: { type: "TERMINAL", col: 46, row: "C" },
        T2: { type: "RAIL", rail: "BOT_NEG", col: 46 },
      },
    },
  ],
  wires: [
    {
      id: "w_z1",
      from: { type: "TERMINAL", col: 44, row: "E" },
      to: { type: "TERMINAL", col: 46, row: "D" },
      color: "#eab308",
    },
  ],
};

const PRESET_BJT_AMPLIFIER: BreadboardPreset = {
  name: "07. Common-Emitter BJT Small-Signal Amplifier",
  description: "Voltage-divider biased 2N2222 transistor amplifier with collector resistor Rc (2.2k) and emitter bypass.",
  vSource: 12.0,
  components: [
    {
      id: "R_B1",
      type: "RESISTOR",
      label: "R1 (47kΩ)",
      value: 47000,
      formattedValue: "47 kΩ",
      pins: {
        T1: { type: "RAIL", rail: "TOP_POS", col: 8 },
        T2: { type: "TERMINAL", col: 12, row: "D" },
      },
    },
    {
      id: "R_B2",
      type: "RESISTOR",
      label: "R2 (10kΩ)",
      value: 10000,
      formattedValue: "10 kΩ",
      pins: {
        T1: { type: "TERMINAL", col: 12, row: "C" },
        T2: { type: "RAIL", rail: "BOT_NEG", col: 12 },
      },
    },
    {
      id: "Q_AMP",
      type: "TRANSISTOR_2N2222",
      label: "Q1 (2N2222)",
      value: 150,
      formattedValue: "hFE 150",
      pins: {
        COLLECTOR: { type: "TERMINAL", col: 14, row: "C" },
        BASE: { type: "TERMINAL", col: 13, row: "C" },
        EMITTER: { type: "TERMINAL", col: 12, row: "B" },
      },
    },
    {
      id: "R_C",
      type: "RESISTOR",
      label: "Rc (2.2kΩ)",
      value: 2200,
      formattedValue: "2.2 kΩ",
      pins: {
        T1: { type: "RAIL", rail: "TOP_POS", col: 14 },
        T2: { type: "TERMINAL", col: 14, row: "D" },
      },
    },
  ],
  wires: [
    {
      id: "w_b_conn",
      from: { type: "TERMINAL", col: 12, row: "E" },
      to: { type: "TERMINAL", col: 13, row: "D" },
      color: "#eab308",
    },
  ],
};

const PRESET_RC_FILTER: BreadboardPreset = {
  name: "08. RC Passive Low-Pass & High-Pass Filter",
  description: "First-order low-pass filter with R (1kΩ) and C (100nF) with cutoff frequency fc = 1/(2πRC) ≈ 1.59 kHz.",
  vSource: 5.0,
  components: [
    {
      id: "R_FILT",
      type: "RESISTOR",
      label: "R (1kΩ)",
      value: 1000,
      formattedValue: "1 kΩ",
      pins: {
        T1: { type: "RAIL", rail: "TOP_POS", col: 50 },
        T2: { type: "TERMINAL", col: 54, row: "C" },
      },
    },
    {
      id: "C_FILT_CER",
      type: "CAP_CERAMIC",
      label: "C (100nF)",
      value: 0.0000001,
      formattedValue: "100 nF",
      pins: {
        T1: { type: "TERMINAL", col: 54, row: "D" },
        T2: { type: "RAIL", rail: "BOT_NEG", col: 54 },
      },
    },
  ],
  wires: [],
};

const PRESET_74LS00_NAND: BreadboardPreset = {
  name: "09. 74LS00 Quad 2-Input NAND Gate Verification",
  description: "TTL Quad 2-Input NAND IC (DIP-14) with logic inputs A and B tied LOW driving output 1Y HIGH through Red LED indicator.",
  vSource: 5.0,
  components: [
    {
      id: "U_NAND",
      type: "IC_74LS00",
      label: "U1 (74LS00)",
      value: 7400,
      formattedValue: "SN74LS00N",
      pins: {
        PIN1: { type: "TERMINAL", col: 18, row: "E" },
        PIN2_1B: { type: "TERMINAL", col: 19, row: "E" },
        PIN3_1Y: { type: "TERMINAL", col: 20, row: "E" },
        PIN4_2A: { type: "TERMINAL", col: 21, row: "E" },
        PIN5_2B: { type: "TERMINAL", col: 22, row: "E" },
        PIN6_2Y: { type: "TERMINAL", col: 23, row: "E" },
        PIN7_GND: { type: "TERMINAL", col: 24, row: "E" },
        PIN8_3Y: { type: "TERMINAL", col: 24, row: "F" },
        PIN9_3A: { type: "TERMINAL", col: 23, row: "F" },
        PIN10_3B: { type: "TERMINAL", col: 22, row: "F" },
        PIN11_4Y: { type: "TERMINAL", col: 21, row: "F" },
        PIN12_4A: { type: "TERMINAL", col: 20, row: "F" },
        PIN13_4B: { type: "TERMINAL", col: 19, row: "F" },
        PIN14_VCC: { type: "TERMINAL", col: 18, row: "F" },
      },
    },
    {
      id: "R_PULL",
      type: "RESISTOR",
      label: "R_led (330Ω)",
      value: 330,
      formattedValue: "330 Ω",
      pins: {
        T1: { type: "TERMINAL", col: 20, row: "C" },
        T2: { type: "TERMINAL", col: 29, row: "C" },
      },
    },
    {
      id: "LED_NAND",
      type: "LED_RED",
      label: "LED (Red)",
      value: 2.0,
      formattedValue: "Red LED",
      pins: {
        ANODE: { type: "TERMINAL", col: 29, row: "D" },
        CATHODE: { type: "RAIL", rail: "BOT_NEG", col: 29 },
      },
    },
  ],
  wires: [
    {
      id: "w_nand_vcc",
      from: { type: "TERMINAL", col: 18, row: "J" },
      to: { type: "RAIL", rail: "TOP_POS", col: 18 },
      color: "#ef4444",
    },
    {
      id: "w_nand_gnd",
      from: { type: "TERMINAL", col: 24, row: "A" },
      to: { type: "RAIL", rail: "BOT_NEG", col: 24 },
      color: "#0f172a",
    },
    {
      id: "w_nand_1a",
      from: { type: "TERMINAL", col: 18, row: "B" },
      to: { type: "RAIL", rail: "BOT_NEG", col: 18 },
      color: "#3b82f6",
    },
    {
      id: "w_nand_1b",
      from: { type: "TERMINAL", col: 19, row: "B" },
      to: { type: "RAIL", rail: "BOT_NEG", col: 19 },
      color: "#3b82f6",
    },
  ],
};

const PRESET_LDR_SWITCH: BreadboardPreset = {
  name: "10. LDR Light-Activated Night Light Switch",
  description: "Cadmium-Sulfide (CdS) photoresistor dark-activated sensor switching a transistor load.",
  vSource: 9.0,
  components: [
    {
      id: "R_LDR_FIXED",
      type: "RESISTOR",
      label: "R_ref (10kΩ)",
      value: 10000,
      formattedValue: "10 kΩ",
      pins: {
        T1: { type: "RAIL", rail: "TOP_POS", col: 42 },
        T2: { type: "TERMINAL", col: 45, row: "C" },
      },
    },
    {
      id: "LDR_SENSE",
      type: "LDR",
      label: "CdS LDR",
      value: 5000,
      formattedValue: "5.0 kΩ (Dim)",
      pins: {
        T1: { type: "TERMINAL", col: 45, row: "D" },
        T2: { type: "RAIL", rail: "BOT_NEG", col: 45 },
      },
    },
    {
      id: "R_LIMIT_LAMP",
      type: "RESISTOR",
      label: "R_lamp (220Ω)",
      value: 220,
      formattedValue: "220 Ω",
      pins: {
        T1: { type: "RAIL", rail: "TOP_POS", col: 48 },
        T2: { type: "TERMINAL", col: 48, row: "G" },
      },
    },
    {
      id: "LED_LAMP",
      type: "LED_BLUE",
      label: "Night Lamp",
      value: 3.2,
      formattedValue: "Blue Lamp",
      pins: {
        ANODE: { type: "TERMINAL", col: 48, row: "H" },
        CATHODE: { type: "RAIL", rail: "BOT_NEG", col: 48 },
      },
    },
  ],
  wires: [],
};

const BREADBOARD_PRESETS = [
  PRESET_LED_CIRCUIT,
  PRESET_555_TIMER,
  PRESET_BJT_SWITCH,
  PRESET_VOLTAGE_DIVIDER,
  PRESET_BRIDGE_RECTIFIER,
  PRESET_ZENER_REGULATOR,
  PRESET_BJT_AMPLIFIER,
  PRESET_RC_FILTER,
  PRESET_74LS00_NAND,
  PRESET_LDR_SWITCH,
];

interface VirtualBreadboardProps {
  initialPresetName?: string;
  presetSyncKey?: number | string;
}

type AutoAttachTarget =
  | { kind: "PME"; type: BreadboardPmeType }
  | { kind: "SCOPE_CH1" | "SCOPE_CH2" | "DMM" | "SIGGEN" };

export default function VirtualBreadboard({
  initialPresetName,
  presetSyncKey,
}: VirtualBreadboardProps = {}) {
  const [selectedPresetName, setSelectedPresetName] = useState<string>(
    PRESET_LED_CIRCUIT.name
  );
  const [workspaceViewMode, setWorkspaceViewMode] = useState<"SPLIT" | "3D" | "2D">("SPLIT");
  const [components, setComponents] = useState<BreadboardComponentItem[]>(
    PRESET_LED_CIRCUIT.components
  );
  const [wires, setWires] = useState<BreadboardWire[]>(PRESET_LED_CIRCUIT.wires);
  const [selectedWireColor, setSelectedWireColor] = useState<WireColor>("#ef4444");
  const [vSourceVal, setVSourceVal] = useState<number>(5.0);
  const [simRunning, setSimRunning] = useState<boolean>(true);
  const [simFreqHz, setSimFreqHz] = useState<number>(2.0);
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);
  const componentsRef = useRef<BreadboardComponentItem[]>(components);
  componentsRef.current = components;

  // Wire creation state
  const [pendingWireStart, setPendingWireStart] = useState<BreadboardHoleId | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  // Virtual DMM Multimeter Probes & Mode State
  const [isDmmActive, setIsDmmActive] = useState<boolean>(false);
  const [dmmMode, setDmmMode] = useState<
    "VDC" | "VAC" | "IDC_MA" | "OHMS" | "CONTINUITY" | "DIODE"
  >("VDC");
  const [probeRedHole, setProbeRedHole] = useState<BreadboardHoleId | null>({
    type: "TERMINAL",
    col: 15,
    row: "C",
  });
  const [probeBlackHole, setProbeBlackHole] = useState<BreadboardHoleId | null>({
    type: "RAIL",
    rail: "TOP_NEG",
    col: 18,
  });

  // Virtual Oscilloscope Probes & Live Waveform State
  const [isScopeActive, setIsScopeActive] = useState<boolean>(true);
  const [probeScopeCh1Hole, setProbeScopeCh1Hole] = useState<BreadboardHoleId | null>({
    type: "TERMINAL",
    col: 15,
    row: "D",
  });
  const [probeScopeCh2Hole, setProbeScopeCh2Hole] = useState<BreadboardHoleId | null>({
    type: "TERMINAL",
    col: 18,
    row: "D",
  });
  const [activeProbeToPlace, setActiveProbeToPlace] = useState<
    "SCOPE_CH1" | "SCOPE_CH2" | "DMM_RED" | "DMM_BLACK" | "SIGGEN" | null
  >(null);

  // Auto-Attach Mode & Armed Instrument Target (click instrument -> click circuit node/part)
  const [isAutoAttachEnabled, setIsAutoAttachEnabled] = useState<boolean>(true);
  const [activeAutoAttachTarget, setActiveAutoAttachTarget] =
    useState<AutoAttachTarget | null>(null);

  // Virtual Signal Generator (XFG1) State
  const [isSigGenActive, setIsSigGenActive] = useState<boolean>(false);
  const [sigGenHole, setSigGenHole] = useState<BreadboardHoleId | null>({
    type: "TERMINAL",
    col: 15,
    row: "C",
  });
  const [sigGenWaveform, setSigGenWaveform] = useState<"SINE" | "SQUARE" | "TRIANGLE">("SINE");
  const [sigGenFreqHz, setSigGenFreqHz] = useState<number>(5.0);
  const [sigGenAmpVpp, setSigGenAmpVpp] = useState<number>(5.0);

  // Resizable Instrument Dock Height & Collapse State
  const [dockHeightPx, setDockHeightPx] = useState<number>(340);
  const [isDockCollapsed, setIsDockCollapsed] = useState<boolean>(false);
  const handleStartDockResize = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      const startY = e.clientY;
      const startH = dockHeightPx;
      const onMove = (ev: PointerEvent) => {
        const dy = startY - ev.clientY;
        setDockHeightPx(Math.max(200, Math.min(640, startH + dy)));
      };
      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [dockHeightPx]
  );

  // Breadboard Position Lock & Always-Shown Circuit Pinning State
  const [isBoardLocked, setIsBoardLocked] = useState<boolean>(true);
  const [isCircuitPinned, setIsCircuitPinned] = useState<boolean>(true);
  const [frameCircuitTrigger, setFrameCircuitTrigger] = useState<number>(0);
  const [highlightCircuitZone, setHighlightCircuitZone] = useState<boolean>(true);

  // Installable Breadboard PME Instruments (Voltmeter, Ammeter, Ohmmeter, Wattmeter, Logic Probe)
  const [installedPmes, setInstalledPmes] = useState<InstalledBreadboardPme[]>([]);
  const [activePmeProbePick, setActivePmeProbePick] = useState<{
    pmeId: string;
    terminal: "POS" | "NEG";
  } | null>(null);
  const [showPmeRulesStrip, setShowPmeRulesStrip] = useState<boolean>(false);

  // Scope Settings
  const [scopeVDivCh1, setScopeVDivCh1] = useState<number>(1.0);
  const [scopeVDivCh2, setScopeVDivCh2] = useState<number>(1.0);
  const [scopeTimebaseMs, setScopeTimebaseMs] = useState<number>(0.5);
  const [scopeRunning, setScopeRunning] = useState<boolean>(true);

  // Smart Wiring Telemetry Notification
  const [smartWiringToast, setSmartWiringToast] = useState<string | null>(null);

  // Animation ticker for oscilloscope live sweeps
  const [scopeTick, setScopeTick] = useState<number>(0);
  // IEEE 315 / IEC 60617 Standard Component Shape and Size Mode (Default to pure IEEE Standard Symbols)
  const [ieeeStandardMode, setIeeeStandardMode] = useState<boolean>(true);
  const [ieeeViewMode, setIeeeViewMode] = useState<"IEEE_SCHEMATIC" | "HYBRID" | "IEEE_PACKAGING">("IEEE_SCHEMATIC");
  const [isAddCompModalOpen, setIsAddCompModalOpen] = useState<boolean>(false);
  const [newCompType, setNewCompType] = useState<BbCompType>("RESISTOR");
  const [newCompValue, setNewCompValue] = useState<number>(330);
  const [newCompCol, setNewCompCol] = useState<number>(30);

  // Dedicated properties & analysis drawer: single-click drags/sets, double-click (or button) opens properties/analysis
  const [isPropertiesDrawerOpen, setIsPropertiesDrawerOpen] = useState<boolean>(false);

  // 1-Click Drag & Reposition state for all breadboard components
  const [draggedCompState, setDraggedCompState] = useState<{
    id: string;
    startClientX: number;
    startClientY: number;
    startPins: Record<string, BreadboardHoleId>;
    hasMoved: boolean;
  } | null>(null);
  const wasCompDraggedRef = useRef<boolean>(false);

  useEffect(() => {
    if (!scopeRunning || !simRunning) return;
    const step = Math.max(0.25, simFreqHz * 0.5);
    const interval = setInterval(() => {
      setScopeTick((t) => (t + step) % 3600);
    }, 35);
    return () => clearInterval(interval);
  }, [scopeRunning, simRunning, simFreqHz]);

  // Zoom & Pan state
  const [zoom, setZoom] = useState<number>(1.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const svgRef = useRef<SVGSVGElement | null>(null);
  const viewport2DRef = useRef<HTMLDivElement | null>(null);
  const isBoardLockedRef = useRef<boolean>(isBoardLocked);
  isBoardLockedRef.current = isBoardLocked;

  // Native non-passive wheel handler: Locked freezes current view; Unlocked moves ahead/back (zoom) and forth/side (pan)
  useEffect(() => {
    const el = viewport2DRef.current;
    if (!el || !isCircuitPinned) return;
    const onWheel = (ev: WheelEvent) => {
      ev.preventDefault();
      ev.stopPropagation();
      if (isBoardLockedRef.current) return;
      if (ev.shiftKey || Math.abs(ev.deltaX) > Math.abs(ev.deltaY)) {
        const dx = ev.shiftKey && ev.deltaX === 0 ? ev.deltaY : ev.deltaX;
        const dy = ev.shiftKey && ev.deltaX === 0 ? 0 : ev.deltaY;
        setPan((p) => ({
          x: Math.max(-340, Math.min(340, Math.round(p.x - dx * 0.65))),
          y: Math.max(-150, Math.min(150, Math.round(p.y - dy * 0.65))),
        }));
      } else {
        const factor = ev.deltaY < 0 ? 1.1 : 0.9;
        setZoom((z) => Math.max(0.6, Math.min(2.2, Number((z * factor).toFixed(2)))));
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [isCircuitPinned]);

  const handleResetZoom2D = useCallback(() => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
  }, []);

  const [dropPreviewHole2D, setDropPreviewHole2D] = useState<BreadboardHoleId | null>(null);
  const [isSpiceNetlistOpen, setIsSpiceNetlistOpen] = useState<boolean>(true);

  // Geometry Constants imported from breadboardCoordMapper (standard 2.54mm pitch)
  const PITCH_X = SVG_PITCH_X;
  const PITCH_Y = SVG_PITCH_Y;
  const START_X = SVG_START_X;
  const RAIL_TOP_POS_Y = SVG_RAIL_TOP_POS_Y;
  const RAIL_TOP_NEG_Y = SVG_RAIL_TOP_NEG_Y;
  const TERMINAL_A_Y = SVG_TERMINAL_A_Y;
  const TROUGH_Y = SVG_TROUGH_Y;
  const TERMINAL_F_Y = SVG_TERMINAL_F_Y;
  const RAIL_BOT_POS_Y = SVG_RAIL_BOT_POS_Y;
  const RAIL_BOT_NEG_Y = SVG_RAIL_BOT_NEG_Y;

  // Convert BreadboardHoleId to SVG (x, y) coordinates
  const getHoleCoords = useCallback((h: BreadboardHoleId) => holeToSvgXY(h), []);

  // Electrical Net Mapping: Computes which internal breadboard strip belongs to which electrical net ID
  const holeToNetKey = useCallback(
    (h: BreadboardHoleId): string => holeToElectricalStripKey(h),
    []
  );

  // Exact screen-to-SVG viewBox coordinate converter (accounts for viewBox scaling, aspect ratio, zoom & pan)
  const clientToSvgPoint = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const ctm = svg.getScreenCTM();
    if (ctm) {
      const inv = ctm.inverse();
      const pt = new DOMPoint(clientX, clientY).matrixTransform(inv);
      return { x: pt.x, y: pt.y };
    }
    const rect = svg.getBoundingClientRect();
    const scaleX = rect.width > 0 ? 1260 / rect.width : 1;
    const scaleY = rect.height > 0 ? 420 / rect.height : 1;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }, []);

  // 1-Click Drag & Reposition Effect: tracks dragging with clean breadboard hole snapping
  useEffect(() => {
    if (!draggedCompState) return;

    const rowLetters: Array<"A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "I" | "J"> = [
      "A", "B", "C", "D", "E", "F", "G", "H", "I", "J",
    ];
    const startSvg = clientToSvgPoint(
      draggedCompState.startClientX,
      draggedCompState.startClientY
    );

    const handlePointerMove = (e: PointerEvent) => {
      const curSvg = clientToSvgPoint(e.clientX, e.clientY);
      const dx = curSvg.x - startSvg.x;
      const dy = curSvg.y - startSvg.y;
      if (Math.hypot(dx, dy) > 3) {
        draggedCompState.hasMoved = true;
      }

      const colDelta = Math.round(dx / PITCH_X);
      const rowDelta = Math.round(dy / PITCH_Y);

      const initialPins = draggedCompState.startPins;
      const currentComp = componentsRef.current.find((c) => c.id === draggedCompState.id);
      if (!currentComp) return;

      // Check if column shift keeps all pins in range 1..63
      let canShiftCol = true;
      Object.values(initialPins).forEach((pin) => {
        const targetCol = pin.col + colDelta;
        if (targetCol < 1 || targetCol > 63) {
          canShiftCol = false;
        }
      });

      // Check if row shift keeps all terminal pins in range A..J (0..9)
      const isIC =
        (currentComp.type.startsWith("IC_") && currentComp.type !== "IC_LM7805") ||
        currentComp.type === "SEVEN_SEG";
      let canShiftRow = !isIC;
      if (canShiftRow) {
        Object.values(initialPins).forEach((pin) => {
          if (pin.type === "TERMINAL" && pin.row) {
            const idx = rowLetters.indexOf(pin.row);
            const targetIdx = idx + rowDelta;
            if (targetIdx < 0 || targetIdx > 9) {
              canShiftRow = false;
            }
          }
        });
      }

      const effectiveColDelta = canShiftCol ? colDelta : 0;
      const effectiveRowDelta = canShiftRow ? rowDelta : 0;

      setComponents((prev) =>
        prev.map((c) => {
          if (c.id !== draggedCompState.id) return c;
          const newPins: Record<string, BreadboardHoleId> = {};
          Object.entries(initialPins).forEach(([pinKey, pin]) => {
            const updatedPin: BreadboardHoleId = {
              ...pin,
              col: pin.col + effectiveColDelta,
            };
            if (canShiftRow && pin.type === "TERMINAL" && pin.row) {
              const idx = rowLetters.indexOf(pin.row);
              updatedPin.row = rowLetters[idx + effectiveRowDelta];
            }
            newPins[pinKey] = updatedPin;
          });
          return { ...c, pins: newPins };
        })
      );
    };

    const handlePointerUp = () => {
      if (draggedCompState.hasMoved) {
        wasCompDraggedRef.current = true;
        setTimeout(() => {
          wasCompDraggedRef.current = false;
        }, 250);
      }
      setDraggedCompState(null);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [draggedCompState, clientToSvgPoint, PITCH_X, PITCH_Y]);

  const handleCompPointerDown = (comp: BreadboardComponentItem, e: React.PointerEvent) => {
    e.stopPropagation();
    if (activeAutoAttachTarget) {
      setSelectedComponentId(comp.id);
      executeAutoAttachToComponent(comp.id, activeAutoAttachTarget);
      return;
    }
    // 1-Click: Component is selected and prepared for dragging/repositioning — DO NOT open settings or windows
    setSelectedComponentId(comp.id);
    setIsPropertiesDrawerOpen(false);
    setDraggedCompState({
      id: comp.id,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startPins: JSON.parse(JSON.stringify(comp.pins)),
      hasMoved: false,
    });
  };

  const handleCompDoubleClick = (comp: BreadboardComponentItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (wasCompDraggedRef.current) return;
    // 2-Clicks (double-click only, never on drag/realign): open properties/analysis drawer
    setSelectedComponentId(comp.id);
    setIsPropertiesDrawerOpen(true);
  };

  // Crisp rectangular IEEE standard bounding frame with alignment corners (No circular or bigger shapes)
  const renderIeeeSelectionBox = (
    cx: number,
    cy: number,
    w: number,
    h: number,
    label?: string
  ) => (
    <g pointerEvents="none">
      <rect
        x={cx - w / 2}
        y={cy - h / 2}
        width={w}
        height={h}
        rx={3}
        fill="rgba(6, 182, 212, 0.08)"
        stroke="#22d3ee"
        strokeWidth={1.8}
        strokeDasharray="4 2"
      />
      {/* 4 Corner Markers */}
      <path
        d={`M ${cx - w / 2} ${cy - h / 2 + 5} L ${cx - w / 2} ${cy - h / 2} L ${cx - w / 2 + 5} ${cy - h / 2}`}
        stroke="#06b6d4"
        strokeWidth={2}
        fill="none"
      />
      <path
        d={`M ${cx + w / 2 - 5} ${cy - h / 2} L ${cx + w / 2} ${cy - h / 2} L ${cx + w / 2} ${cy - h / 2 + 5}`}
        stroke="#06b6d4"
        strokeWidth={2}
        fill="none"
      />
      <path
        d={`M ${cx - w / 2} ${cy + h / 2 - 5} L ${cx - w / 2} ${cy + h / 2} L ${cx - w / 2 + 5} ${cy + h / 2}`}
        stroke="#06b6d4"
        strokeWidth={2}
        fill="none"
      />
      <path
        d={`M ${cx + w / 2 - 5} ${cy + h / 2} L ${cx + w / 2} ${cy + h / 2} L ${cx + w / 2} ${cy + h / 2 - 5}`}
        stroke="#06b6d4"
        strokeWidth={2}
        fill="none"
      />
      <rect
        x={cx - 52}
        y={cy - h / 2 - 12}
        width={104}
        height={12}
        rx={2}
        fill="#090f1d"
        stroke="#0891b2"
        strokeWidth={0.8}
      />
      <text
        x={cx}
        y={cy - h / 2 - 3.5}
        textAnchor="middle"
        fill="#67e8f9"
        fontFamily="monospace"
        fontSize="6.5"
        fontWeight="bold"
        letterSpacing="0.3"
      >
        1-CLICK: DRAG · 2x: PROPS
      </text>
    </g>
  );

  // Compute coordinate-mapped SPICE node list & live MNA simulation
  const simResults = useMemo(
    () => compileBreadboardSpiceNetlist(components, wires, vSourceVal, simRunning),
    [components, wires, vSourceVal, simRunning]
  );

  // Handle clicking a hole to create wires or snap DMM/Oscilloscope/PME probes
  const handleHoleClick = (h: BreadboardHoleId) => {
    // 0. If actively placing a PME module probe, attach it and finish
    if (activePmeProbePick) {
      setInstalledPmes((prev) =>
        prev.map((pm) => {
          if (pm.id !== activePmeProbePick.pmeId) return pm;
          return activePmeProbePick.terminal === "POS"
            ? { ...pm, probePosHole: h }
            : { ...pm, probeNegHole: h };
        })
      );
      setSmartWiringToast(`✓ PME Probe attached to ${formatHoleLabel(h)}`);
      setTimeout(() => setSmartWiringToast(null), 2600);
      setActivePmeProbePick(null);
      return;
    }

    // 1. If actively placing a probe (CH1, CH2, Red, Black, SigGen), snap it and finish
    if (activeProbeToPlace === "SCOPE_CH1") {
      setProbeScopeCh1Hole(h);
      setActiveProbeToPlace(null);
      return;
    }
    if (activeProbeToPlace === "SCOPE_CH2") {
      setProbeScopeCh2Hole(h);
      setActiveProbeToPlace(null);
      return;
    }
    if (activeProbeToPlace === "DMM_RED") {
      setProbeRedHole(h);
      setActiveProbeToPlace(null);
      return;
    }
    if (activeProbeToPlace === "DMM_BLACK") {
      setProbeBlackHole(h);
      setActiveProbeToPlace(null);
      return;
    }
    if (activeProbeToPlace === "SIGGEN") {
      setIsSigGenActive(true);
      setSigGenHole(h);
      setActiveProbeToPlace(null);
      return;
    }

    // 1b. If Auto-Attach is armed, clicking any socket attaches the armed instrument there
    if (activeAutoAttachTarget) {
      executeAutoAttachToHole(h, activeAutoAttachTarget);
      return;
    }

    if (!pendingWireStart) {
      setPendingWireStart(h);
    } else {
      // Create new jumper wire
      if (
        pendingWireStart.col !== h.col ||
        pendingWireStart.row !== h.row ||
        pendingWireStart.rail !== h.rail
      ) {
        const newWire: BreadboardWire = {
          id: `wire_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          from: pendingWireStart,
          to: h,
          color: selectedWireColor,
        };
        setWires((prev) => [...prev, newWire]);
      }
      setPendingWireStart(null);
    }
  };

  const handleTogglePushButton = useCallback((compId: string) => {
    setComponents((prev) =>
      prev.map((c) => {
        if (c.id !== compId || (c.type !== "PUSH_BUTTON" && c.type !== "SWITCH_SPST")) return c;
        const nextClosed = c.value !== 1;
        return {
          ...c,
          value: nextClosed ? 1 : 0,
          formattedValue: nextClosed ? "CLOSED (0.05Ω)" : "OPEN",
        };
      })
    );
  }, []);

  const handleStepPotentiometer = useCallback((compId: string, explicitPct?: number) => {
    setComponents((prev) =>
      prev.map((c) => {
        if (c.id !== compId || c.type !== "POTENTIOMETER") return c;
        const cur = c.wiperPct ?? 0.5;
        const nextPct =
          typeof explicitPct === "number"
            ? Math.max(0.05, Math.min(0.95, explicitPct))
            : cur >= 0.85
            ? 0.1
            : Number((cur + 0.2).toFixed(2));
        return {
          ...c,
          wiperPct: nextPct,
          formattedValue: `${(c.value / 1000).toFixed(1)}kΩ @ ${Math.round(nextPct * 100)}%`,
        };
      })
    );
  }, []);

  // Oscilloscope Probed Signals Calculation (includes injected XFG1 Signal Generator waveform)
  const getProbedSignal = useCallback(
    (hole: BreadboardHoleId | null) => {
      if (!hole || !simResults.find) return { vDc: 0, vpp: 0, freq: 0, waveType: "DC" as const };
      const net = simResults.find(holeToNetKey(hole));
      const v = simResults.vMap.get(net) ?? 0;

      if (isSigGenActive && sigGenHole) {
        const sigNet = simResults.find(holeToNetKey(sigGenHole));
        if (sigNet && sigNet === net) {
          return {
            vDc: sigGenAmpVpp * 0.5,
            vpp: sigGenAmpVpp,
            freq: sigGenFreqHz,
            waveType:
              sigGenWaveform === "SQUARE"
                ? ("SQUARE" as const)
                : sigGenWaveform === "TRIANGLE"
                ? ("SAWTOOTH" as const)
                : ("SINE" as const),
          };
        }
      }

      const is555Output = components.some(
        (c) => c.type === "IC_NE555" && hole.type === "TERMINAL" && hole.col === 22
      );
      const is555TimerCap = components.some(
        (c) => c.type === "IC_NE555" && hole.type === "TERMINAL" && hole.col === 21
      );
      const isRectifierRipple = components.some(
        (c) => c.type === "DIODE_1N4007" && hole.type === "TERMINAL" && (hole.col === 28 || hole.col === 30)
      );

      if (is555Output) {
        return { vDc: vSourceVal * 0.5, vpp: vSourceVal * 0.9, freq: 1.4, waveType: "SQUARE" as const };
      }
      if (is555TimerCap) {
        return { vDc: vSourceVal * 0.5, vpp: vSourceVal * 0.33, freq: 1.4, waveType: "SAWTOOTH" as const };
      }
      if (isRectifierRipple) {
        return { vDc: v, vpp: 1.8, freq: 100, waveType: "RIPPLE" as const };
      }

      return { vDc: v, vpp: 0, freq: 0, waveType: "DC" as const };
    },
    [
      components,
      simResults,
      holeToNetKey,
      vSourceVal,
      isSigGenActive,
      sigGenHole,
      sigGenAmpVpp,
      sigGenFreqHz,
      sigGenWaveform,
    ]
  );

  const ch1Signal = useMemo(() => getProbedSignal(probeScopeCh1Hole), [getProbedSignal, probeScopeCh1Hole]);
  const ch2Signal = useMemo(() => getProbedSignal(probeScopeCh2Hole), [getProbedSignal, probeScopeCh2Hole]);

  // Smart Auto-Routing Jumper Wire Engine
  const handleSmartAutoRoute = () => {
    const newWires: BreadboardWire[] = [];
    const has555 = components.some((c) => c.type === "IC_NE555");
    const hasBjt = components.some((c) => c.type.includes("BJT") || c.type.includes("TRANSISTOR"));
    const hasBridge = components.filter((c) => c.type === "DIODE_1N4007").length >= 2;
    const hasDivider = components.some((c) => c.id === "R_TOP" || c.id === "R_BOT");

    if (has555) {
      newWires.push(
        { id: "sw_vcc", from: { type: "TERMINAL", col: 20, row: "J" }, to: { type: "RAIL", rail: "TOP_POS", col: 20 }, color: "#ef4444" },
        { id: "sw_gnd", from: { type: "TERMINAL", col: 20, row: "A" }, to: { type: "RAIL", rail: "BOT_NEG", col: 20 }, color: "#0f172a" },
        { id: "sw_rst", from: { type: "TERMINAL", col: 23, row: "J" }, to: { type: "RAIL", rail: "TOP_POS", col: 23 }, color: "#ef4444" },
        { id: "sw_trig_thres", from: { type: "TERMINAL", col: 21, row: "A" }, to: { type: "TERMINAL", col: 22, row: "A" }, color: "#eab308" }
      );
    } else if (hasBjt) {
      newWires.push(
        { id: "sw_emit_gnd", from: { type: "TERMINAL", col: 37, row: "A" }, to: { type: "RAIL", rail: "BOT_NEG", col: 37 }, color: "#0f172a" },
        { id: "sw_base_drive", from: { type: "TERMINAL", col: 36, row: "A" }, to: { type: "RAIL", rail: "TOP_POS", col: 36 }, color: "#eab308" }
      );
    } else if (hasBridge) {
      newWires.push(
        { id: "sw_br1", from: { type: "TERMINAL", col: 28, row: "J" }, to: { type: "TERMINAL", col: 30, row: "J" }, color: "#ef4444" },
        { id: "sw_br2", from: { type: "TERMINAL", col: 30, row: "A" }, to: { type: "TERMINAL", col: 32, row: "A" }, color: "#ef4444" }
      );
    } else if (hasDivider) {
      newWires.push(
        { id: "sw_div_vcc", from: { type: "RAIL", rail: "TOP_POS", col: 12 }, to: { type: "TERMINAL", col: 12, row: "J" }, color: "#ef4444" },
        { id: "sw_div_gnd", from: { type: "TERMINAL", col: 16, row: "A" }, to: { type: "RAIL", rail: "BOT_NEG", col: 16 }, color: "#0f172a" }
      );
    } else {
      newWires.push(
        { id: "sw_led_gnd", from: { type: "TERMINAL", col: 18, row: "A" }, to: { type: "RAIL", rail: "BOT_NEG", col: 18 }, color: "#0f172a" }
      );
    }

    setWires(newWires);
    setSmartWiringToast("✓ Smart Wiring: Optimal jumper paths auto-routed (0 conflicts, perimeter channels optimized)");
    setTimeout(() => setSmartWiringToast(null), 4000);
  };

  // Circuit bounding box in 2D SVG & column span so laid circuit is always locatable
  const circuitBounds = useMemo(() => {
    const allHoles: BreadboardHoleId[] = [];
    components.forEach((c) => Object.values(c.pins).forEach((p) => allHoles.push(p)));
    wires.forEach((w) => allHoles.push(w.from, w.to));
    if (allHoles.length === 0) {
      return {
        hasCircuit: false,
        minCol: 1,
        maxCol: 63,
        minX: 40,
        maxX: 1220,
        minY: 18,
        maxY: 400,
        cx: 630,
        cy: 210,
      };
    }
    const pts = allHoles.map((h) => getHoleCoords(h));
    const cols = allHoles.map((h) => h.col);
    const minX = Math.max(24, Math.min(...pts.map((p) => p.x)) - 22);
    const maxX = Math.min(1236, Math.max(...pts.map((p) => p.x)) + 22);
    const minY = Math.max(16, Math.min(...pts.map((p) => p.y)) - 22);
    const maxY = Math.min(404, Math.max(...pts.map((p) => p.y)) + 22);
    return {
      hasCircuit: true,
      minCol: Math.min(...cols),
      maxCol: Math.max(...cols),
      minX,
      maxX,
      minY,
      maxY,
      cx: (minX + maxX) / 2,
      cy: (minY + maxY) / 2,
    };
  }, [components, wires, getHoleCoords]);

  const handleFindCircuit = useCallback(() => {
    // Center 2D SVG cleanly on laid circuit bounding box & trigger 3D camera frame
    if (!circuitBounds.hasCircuit) {
      setZoom(1.0);
      setPan({ x: 0, y: 0 });
    } else {
      const spanX = Math.max(240, circuitBounds.maxX - circuitBounds.minX + 120);
      const targetZoom = Math.max(1.0, Math.min(1.65, 1100 / spanX));
      const offsetSvgX = 630 - circuitBounds.cx;
      const offsetSvgY = 210 - circuitBounds.cy;
      const clampedPanX = Math.max(-320, Math.min(320, offsetSvgX * targetZoom * 0.55));
      const clampedPanY = Math.max(-120, Math.min(120, offsetSvgY * targetZoom * 0.45));
      setZoom(Number(targetZoom.toFixed(2)));
      setPan({ x: Math.round(clampedPanX), y: Math.round(clampedPanY) });
    }
    setHighlightCircuitZone(true);
    setFrameCircuitTrigger((t) => t + 1);
  }, [circuitBounds]);

  const handleExportScopeCsv = useCallback(() => {
    const rows = ["Sample,Time_ms,CH1_Voltage_V,CH2_Voltage_V"];
    for (let i = 0; i < 100; i++) {
      const tMs = ((i / 99) * scopeTimebaseMs * 10).toFixed(4);
      const t = i * 0.15 + (scopeRunning ? scopeTick * 0.2 : 0);
      const v1 = !probeScopeCh1Hole
        ? 0
        : ch1Signal.waveType === "SQUARE"
        ? (Math.sin(t * 2) >= 0 ? ch1Signal.vpp : 0)
        : ch1Signal.waveType === "SINE"
        ? ch1Signal.vDc + Math.sin(t * 2.2) * (ch1Signal.vpp * 0.5)
        : ch1Signal.waveType === "SAWTOOTH"
        ? (((t * 1.5) % 3) / 3) * (ch1Signal.vpp || ch1Signal.vDc)
        : ch1Signal.waveType === "RIPPLE"
        ? ch1Signal.vDc + Math.abs(Math.sin(t * 3)) * 1.2
        : ch1Signal.vDc;
      const v2 = !probeScopeCh2Hole
        ? 0
        : ch2Signal.waveType === "SQUARE"
        ? (Math.cos(t * 2) >= 0 ? ch2Signal.vpp : 0)
        : ch2Signal.waveType === "SINE"
        ? ch2Signal.vDc + Math.cos(t * 2.2) * (ch2Signal.vpp * 0.5)
        : ch2Signal.waveType === "SAWTOOTH"
        ? (((t * 1.5 + 1) % 3) / 3) * (ch2Signal.vpp || ch2Signal.vDc)
        : ch2Signal.waveType === "RIPPLE"
        ? ch2Signal.vDc + Math.abs(Math.cos(t * 3)) * 1.0
        : ch2Signal.vDc;
      rows.push(`${i},${tMs},${v1.toFixed(4)},${v2.toFixed(4)}`);
    }
    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `breadboard_oscilloscope_${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setSmartWiringToast("✓ Oscilloscope transient waveform exported to CSV");
    setTimeout(() => setSmartWiringToast(null), 2600);
  }, [probeScopeCh1Hole, probeScopeCh2Hole, ch1Signal, ch2Signal, scopeTimebaseMs, scopeRunning, scopeTick]);

  // Virtual DMM measurement calculation (Supports VDC, VAC, IDC mA, OHMS, CONTINUITY, DIODE)
  const dmmReading = useMemo(() => {
    if (!probeRedHole || !probeBlackHole || !simResults.find) return null;
    const netRed = simResults.find(holeToNetKey(probeRedHole));
    const netBlack = simResults.find(holeToNetKey(probeBlackHole));
    const vRed = simResults.vMap.get(netRed) ?? 0;
    const vBlack = simResults.vMap.get(netBlack) ?? 0;
    const vDiff = vRed - vBlack;

    // Match component bridging the two probe nets if any
    const matchedComp = components.find((c) => {
      const pNets = Object.values(c.pins).map((p) => simResults.find(holeToNetKey(p)));
      return pNets.includes(netRed) && pNets.includes(netBlack) && netRed !== netBlack;
    });
    const branchMa = matchedComp ? simResults.currentMap.get(matchedComp.id) ?? 0 : 0;
    const sameNet = netRed === netBlack;

    let displayMain = `${vDiff.toFixed(2)} V`;
    let unitLabel = "DC VOLTS";
    let statusText = sameNet ? "SHORT / SAME NODE" : "PARALLEL ΔV";

    if (dmmMode === "VAC") {
      const vRms = Math.abs(vDiff) * 0.7071;
      displayMain = `${vRms.toFixed(2)} V~`;
      unitLabel = "AC RMS";
    } else if (dmmMode === "IDC_MA") {
      const estMa =
        branchMa > 0
          ? branchMa
          : matchedComp && matchedComp.type === "RESISTOR" && matchedComp.value > 0
          ? (Math.abs(vDiff) / matchedComp.value) * 1000
          : 0;
      displayMain = `${estMa.toFixed(2)} mA`;
      unitLabel = "DC CURRENT";
      statusText = matchedComp ? `Branch: ${matchedComp.id}` : "Attach across load";
    } else if (dmmMode === "OHMS") {
      if (sameNet) {
        displayMain = "0.0 Ω";
      } else if (matchedComp && matchedComp.type === "RESISTOR") {
        displayMain =
          matchedComp.value >= 1000
            ? `${(matchedComp.value / 1000).toFixed(2)} kΩ`
            : `${matchedComp.value.toFixed(1)} Ω`;
      } else if (branchMa > 0.05 && Math.abs(vDiff) > 0.01) {
        const rEq = Math.abs(vDiff) / (branchMa / 1000);
        displayMain = rEq >= 1000 ? `${(rEq / 1000).toFixed(2)} kΩ` : `${rEq.toFixed(1)} Ω`;
      } else {
        displayMain = "OL (Open)";
      }
      unitLabel = simRunning ? "OHMS (Power ON!)" : "RESISTANCE (Ω)";
      statusText = simRunning ? "Pause Sim for true Ω" : "Passive Ω check OK";
    } else if (dmmMode === "CONTINUITY") {
      displayMain = sameNet ? "0.1 Ω · BEEP" : "OPEN (OL)";
      unitLabel = "CONTINUITY";
      statusText = sameNet ? "Continuity Verified" : "No direct short";
    } else if (dmmMode === "DIODE") {
      if (matchedComp && (matchedComp.type.startsWith("LED_") || matchedComp.type === "DIODE_1N4007")) {
        displayMain = `${Math.abs(vDiff) > 0.1 ? Math.abs(vDiff).toFixed(2) : matchedComp.value.toFixed(2)} Vf`;
      } else {
        displayMain = `${Math.abs(vDiff).toFixed(2)} V`;
      }
      unitLabel = "DIODE JUNCTION";
    }

    return {
      vDiff,
      formattedV: displayMain,
      unitLabel,
      statusText,
      continuity: sameNet || (Math.abs(vDiff) < 0.05 && netRed === netBlack),
    };
  }, [probeRedHole, probeBlackHole, simResults, holeToNetKey, components, dmmMode, simRunning]);

  // Execute Auto-Attach onto a clicked breadboard component
  const executeAutoAttachToComponent = useCallback(
    (compId: string, target: AutoAttachTarget) => {
      const comp = components.find((c) => c.id === compId);
      if (!comp) return;
      const pins = Object.values(comp.pins);
      const posHole: BreadboardHoleId = pins[0] || { type: "RAIL", rail: "TOP_POS", col: 12 };
      const negHole: BreadboardHoleId = pins[1] || { type: "RAIL", rail: "TOP_NEG", col: posHole.col };

      if (target.kind === "SCOPE_CH1") {
        setIsScopeActive(true);
        setProbeScopeCh1Hole(posHole);
        setSmartWiringToast(`✓ Auto-Attached Scope CH1 → ${comp.label} (${formatCompactHole(posHole)})`);
      } else if (target.kind === "SCOPE_CH2") {
        setIsScopeActive(true);
        setProbeScopeCh2Hole(posHole);
        setSmartWiringToast(`✓ Auto-Attached Scope CH2 → ${comp.label} (${formatCompactHole(posHole)})`);
      } else if (target.kind === "DMM") {
        setIsDmmActive(true);
        setProbeRedHole(posHole);
        setProbeBlackHole(negHole);
        setSmartWiringToast(`✓ Auto-Attached DMM Red/Black across ${comp.label}`);
      } else if (target.kind === "SIGGEN") {
        setIsSigGenActive(true);
        setSigGenHole(posHole);
        setSmartWiringToast(`✓ Auto-Attached SigGen XFG1 → ${comp.label} (${formatCompactHole(posHole)})`);
      } else if (target.kind === "PME") {
        const prefix =
          target.type === "VOLTMETER"
            ? "VM"
            : target.type === "AMMETER"
            ? "AM"
            : target.type === "OHMMETER"
            ? "OHM"
            : target.type === "POWER_METER"
            ? "PM"
            : "LP";
        const count = installedPmes.filter((p) => p.type === target.type).length + 1;
        const newPme: InstalledBreadboardPme = {
          id: `pme_${target.type}_${Date.now().toString(36).slice(-4)}`,
          type: target.type,
          label: `${prefix}${count}`,
          probePosHole: posHole,
          probeNegHole: target.type === "LOGIC_PROBE" ? undefined : negHole,
          targetCompId: comp.id,
        };
        setInstalledPmes((prev) => [...prev, newPme]);
        setSmartWiringToast(`✓ Auto-Attached ${newPme.label} (${target.type.replace("_", " ")}) across ${comp.label}`);
      }
      setActiveAutoAttachTarget(null);
      setTimeout(() => setSmartWiringToast(null), 3200);
    },
    [components, installedPmes]
  );

  // Execute Auto-Attach onto a clicked breadboard socket hole
  const executeAutoAttachToHole = useCallback(
    (h: BreadboardHoleId, target: AutoAttachTarget) => {
      const defaultGnd: BreadboardHoleId = { type: "RAIL", rail: "TOP_NEG", col: h.col };
      const matchedComp = components.find((c) =>
        Object.values(c.pins).some((p) => holeToNetKey(p) === holeToNetKey(h))
      );

      if (target.kind === "SCOPE_CH1") {
        setIsScopeActive(true);
        setProbeScopeCh1Hole(h);
        setSmartWiringToast(`✓ Auto-Attached Scope CH1 → ${formatCompactHole(h)}`);
      } else if (target.kind === "SCOPE_CH2") {
        setIsScopeActive(true);
        setProbeScopeCh2Hole(h);
        setSmartWiringToast(`✓ Auto-Attached Scope CH2 → ${formatCompactHole(h)}`);
      } else if (target.kind === "DMM") {
        setIsDmmActive(true);
        setProbeRedHole(h);
        setProbeBlackHole(defaultGnd);
        setSmartWiringToast(`✓ Auto-Attached DMM Red → ${formatCompactHole(h)} (Black → GND)`);
      } else if (target.kind === "SIGGEN") {
        setIsSigGenActive(true);
        setSigGenHole(h);
        setSmartWiringToast(`✓ Auto-Attached SigGen XFG1 → ${formatCompactHole(h)}`);
      } else if (target.kind === "PME") {
        const prefix =
          target.type === "VOLTMETER"
            ? "VM"
            : target.type === "AMMETER"
            ? "AM"
            : target.type === "OHMMETER"
            ? "OHM"
            : target.type === "POWER_METER"
            ? "PM"
            : "LP";
        const count = installedPmes.filter((p) => p.type === target.type).length + 1;
        const newPme: InstalledBreadboardPme = {
          id: `pme_${target.type}_${Date.now().toString(36).slice(-4)}`,
          type: target.type,
          label: `${prefix}${count}`,
          probePosHole: h,
          probeNegHole: target.type === "LOGIC_PROBE" ? undefined : defaultGnd,
          targetCompId: matchedComp?.id,
        };
        setInstalledPmes((prev) => [...prev, newPme]);
        setSmartWiringToast(`✓ Auto-Attached ${newPme.label} → ${formatCompactHole(h)}`);
      }
      setActiveAutoAttachTarget(null);
      setTimeout(() => setSmartWiringToast(null), 3200);
    },
    [components, installedPmes, holeToNetKey]
  );

  // Install a PME module directly onto the circuit (or arm Auto-Attach when active)
  const handleInstallPme = useCallback(
    (type: BreadboardPmeType) => {
      if (isAutoAttachEnabled && components.length > 0) {
        setActiveProbeToPlace(null);
        setActivePmeProbePick(null);
        setActiveAutoAttachTarget((prev) =>
          prev?.kind === "PME" && prev.type === type ? null : { kind: "PME", type }
        );
        return;
      }
      const defaultComp =
        components.find((c) => c.type === "RESISTOR") ||
        components.find((c) => c.type.startsWith("LED_")) ||
        components[0];
      const pinList = defaultComp ? Object.values(defaultComp.pins) : [];
      const posHole: BreadboardHoleId = pinList[0] || { type: "RAIL", rail: "TOP_POS", col: 12 };
      const negHole: BreadboardHoleId = pinList[1] || { type: "RAIL", rail: "TOP_NEG", col: 18 };
      const prefix =
        type === "VOLTMETER"
          ? "VM"
          : type === "AMMETER"
          ? "AM"
          : type === "OHMMETER"
          ? "OHM"
          : type === "POWER_METER"
          ? "PM"
          : "LP";
      const count = installedPmes.filter((p) => p.type === type).length + 1;
      const newPme: InstalledBreadboardPme = {
        id: `pme_${type}_${Date.now().toString(36).slice(-4)}`,
        type,
        label: `${prefix}${count}`,
        probePosHole: posHole,
        probeNegHole: type === "LOGIC_PROBE" ? undefined : negHole,
        targetCompId: defaultComp?.id,
      };
      setInstalledPmes((prev) => [...prev, newPme]);
      setSmartWiringToast(
        `✓ Installed ${newPme.label} (${type.replace("_", " ")}) onto ${defaultComp?.label || "circuit"}`
      );
      setTimeout(() => setSmartWiringToast(null), 3000);
    },
    [components, installedPmes, isAutoAttachEnabled]
  );

  const handleInstallPmeKit = useCallback(() => {
    setIsScopeActive(true);
    setIsDmmActive(true);
    const rComp = components.find((c) => c.type === "RESISTOR") || components[0];
    const lComp = components.find((c) => c.type.startsWith("LED_")) || components[1] || rComp;
    const rPins = rComp ? Object.values(rComp.pins) : [];
    const lPins = lComp ? Object.values(lComp.pins) : [];
    setInstalledPmes([
      {
        id: "pme_kit_vm",
        type: "VOLTMETER",
        label: "VM1 (Output V)",
        probePosHole: lPins[0] || { type: "TERMINAL", col: 15, row: "D" },
        probeNegHole: lPins[1] || { type: "RAIL", rail: "TOP_NEG", col: 18 },
        targetCompId: lComp?.id,
      },
      {
        id: "pme_kit_am",
        type: "AMMETER",
        label: "AM1 (Branch mA)",
        probePosHole: rPins[0] || { type: "RAIL", rail: "TOP_POS", col: 10 },
        probeNegHole: rPins[1] || { type: "TERMINAL", col: 15, row: "C" },
        targetCompId: rComp?.id,
      },
      {
        id: "pme_kit_pm",
        type: "POWER_METER",
        label: "PM1 (Load mW)",
        probePosHole: lPins[0] || { type: "TERMINAL", col: 15, row: "D" },
        probeNegHole: lPins[1] || { type: "RAIL", rail: "TOP_NEG", col: 18 },
        targetCompId: lComp?.id,
      },
    ]);
    setSmartWiringToast("✓ Installed Full PME Kit (Oscilloscope + DMM + Voltmeter + Ammeter + Wattmeter)");
    setTimeout(() => setSmartWiringToast(null), 3500);
  }, [components]);

  const handleAttachPmeToComponent = useCallback(
    (pmeId: string, compId: string) => {
      const comp = components.find((c) => c.id === compId);
      if (!comp) return;
      const pins = Object.values(comp.pins);
      setInstalledPmes((prev) =>
        prev.map((pm) => {
          if (pm.id !== pmeId) return pm;
          return {
            ...pm,
            targetCompId: compId,
            probePosHole: pins[0] || pm.probePosHole,
            probeNegHole: pm.type === "LOGIC_PROBE" ? undefined : pins[1] || pm.probeNegHole,
          };
        })
      );
    },
    [components]
  );

  const computePmeReading = useCallback(
    (pme: InstalledBreadboardPme) => {
      const nPos = simResults.find ? simResults.find(holeToNetKey(pme.probePosHole)) : holeToNetKey(pme.probePosHole);
      const nNeg = pme.probeNegHole
        ? simResults.find
          ? simResults.find(holeToNetKey(pme.probeNegHole))
          : holeToNetKey(pme.probeNegHole)
        : simResults.find
        ? simResults.find("TOP_NEG")
        : "TOP_NEG";
      const vPos = simResults.vMap.get(nPos) ?? 0;
      const vNeg = simResults.vMap.get(nNeg) ?? 0;
      const vDiff = vPos - vNeg;

      const targetComp =
        (pme.targetCompId ? components.find((c) => c.id === pme.targetCompId) : undefined) ||
        components.find((c) => {
          const nets = Object.values(c.pins).map((p) =>
            simResults.find ? simResults.find(holeToNetKey(p)) : holeToNetKey(p)
          );
          return nets.includes(nPos) && (pme.probeNegHole ? nets.includes(nNeg) : true);
        });

      const compMa = targetComp ? simResults.currentMap.get(targetComp.id) ?? 0 : 0;

      if (pme.type === "VOLTMETER") {
        const isParallel = nPos !== nNeg;
        return {
          reading: simRunning ? `${vDiff.toFixed(2)} V` : "0.00 V (OFF)",
          subtext: `ΔV = ${vPos.toFixed(2)}V − ${vNeg.toFixed(2)}V`,
          ruleStatus: isParallel ? ("OK" as const) : ("WARN" as const),
          ruleLabel: isParallel ? "Parallel ΔV OK (10MΩ)" : "Same node (0V diff)",
        };
      }
      if (pme.type === "AMMETER") {
        const maVal = simRunning ? compMa : 0;
        return {
          reading: `${maVal.toFixed(2)} mA`,
          subtext: targetComp ? `Branch: ${targetComp.label}` : "Attach to component branch",
          ruleStatus: maVal > 0.01 ? ("OK" as const) : ("WARN" as const),
          ruleLabel:
            !simRunning
              ? "Simulation paused"
              : maVal > 0.01
              ? "Series branch current OK"
              : "Zero current / open loop",
        };
      }
      if (pme.type === "OHMMETER") {
        let rText = "OL (Open)";
        if (nPos === nNeg) rText = "0.0 Ω";
        else if (targetComp && targetComp.type === "RESISTOR") {
          rText =
            targetComp.value >= 1000
              ? `${(targetComp.value / 1000).toFixed(2)} kΩ`
              : `${targetComp.value.toFixed(1)} Ω`;
        } else if (compMa > 0.05 && Math.abs(vDiff) > 0.01) {
          const rEq = Math.abs(vDiff) / (compMa / 1000);
          rText = rEq >= 1000 ? `${(rEq / 1000).toFixed(2)} kΩ` : `${rEq.toFixed(1)} Ω`;
        }
        return {
          reading: rText,
          subtext: targetComp ? `Across ${targetComp.label}` : "Across probe nodes",
          ruleStatus: simRunning ? ("WARN" as const) : ("OK" as const),
          ruleLabel: simRunning ? "Power ON — Pause Sim for true Ω" : "Unpowered Ω Check OK",
        };
      }
      if (pme.type === "POWER_METER") {
        const pMw = simRunning ? Math.abs(vDiff) * compMa : 0;
        return {
          reading: `${pMw.toFixed(2)} mW`,
          subtext: `${Math.abs(vDiff).toFixed(2)}V × ${compMa.toFixed(1)}mA`,
          ruleStatus: pMw > 250 ? ("WARN" as const) : ("OK" as const),
          ruleLabel: pMw > 250 ? "High dissipation (>250mW)" : "Wattmeter V·I OK",
        };
      }
      // LOGIC_PROBE
      const isPulse =
        components.some((c) => c.type === "IC_NE555") &&
        pme.probePosHole.type === "TERMINAL" &&
        pme.probePosHole.col === 22;
      const stateStr = !simRunning
        ? "OFF (0.0V)"
        : isPulse
        ? `PULSE ${simFreqHz.toFixed(1)}Hz`
        : vPos >= 2.4
        ? "HIGH (1)"
        : vPos <= 0.8
        ? "LOW (0)"
        : "FLOAT";
      return {
        reading: stateStr,
        subtext: `Node V = ${vPos.toFixed(2)} V`,
        ruleStatus: stateStr === "FLOAT" ? ("WARN" as const) : ("OK" as const),
        ruleLabel: "TTL/CMOS Thresholds (0.8V / 2.4V)",
      };
    },
    [simResults, holeToNetKey, components, simRunning, simFreqHz]
  );

  // Handle preset loading & auto-sync instrument probes to key preset terminals
  const loadPreset = (preset: BreadboardPreset) => {
    setSelectedPresetName(preset.name);
    setComponents(preset.components);
    setWires(preset.wires);
    setVSourceVal(preset.vSource);
    setPendingWireStart(null);
    setSelectedComponentId(null);
    setIsPropertiesDrawerOpen(false);
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
    setFrameCircuitTrigger((t) => t + 1);

    const firstPins = preset.components.flatMap((c) => Object.values(c.pins));
    const hotHole =
      firstPins.find((p) => p.type === "TERMINAL") ||
      firstPins[0] ||
      { type: "RAIL", rail: "TOP_POS", col: 10 };
    const secondHole =
      firstPins.filter((p) => p.type === "TERMINAL")[1] ||
      { type: "RAIL", rail: "TOP_NEG", col: 18 };
    setProbeScopeCh1Hole(hotHole);
    setProbeScopeCh2Hole(secondHole);
    setProbeRedHole(hotHole);
    setProbeBlackHole({ type: "RAIL", rail: "TOP_NEG", col: 18 });
  };

  useEffect(() => {
    if (!initialPresetName) return;
    const needle = initialPresetName.toLowerCase();
    const matched =
      BREADBOARD_PRESETS.find((p) => p.name.toLowerCase() === needle) ||
      BREADBOARD_PRESETS.find((p) => p.name.toLowerCase().includes(needle)) ||
      BREADBOARD_PRESETS[0];
    if (matched) {
      loadPreset(matched);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPresetName, presetSyncKey]);

  // Add component with IEEE standard geometry & default or dropped tie-points
  const handleAddIeeeComponent = (
    type: BbCompType,
    val: number,
    col: number,
    preferredRow?: "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "I" | "J"
  ) => {
    const id = `${type}_${Date.now().toString(36).substr(4, 4)}`;
    const safeCol = Math.max(1, Math.min(57, col));
    const rowStd = preferredRow || "C";
    const rowLead = preferredRow || "D";
    const rowElec = preferredRow || "B";
    let newComp: BreadboardComponentItem;

    if (type === "RESISTOR") {
      newComp = {
        id,
        type: "RESISTOR",
        label: `R (${val >= 1000 ? `${(val / 1000).toFixed(1)}kΩ` : `${val}Ω`})`,
        value: val,
        formattedValue: val >= 1000 ? `${(val / 1000).toFixed(1)} kΩ` : `${val} Ω`,
        pins: {
          T1: { type: "TERMINAL", col: safeCol, row: rowStd },
          T2: { type: "TERMINAL", col: Math.min(63, safeCol + 4), row: rowStd },
        },
      };
    } else if (type === "INDUCTOR") {
      const mH = val > 0 && val < 1 ? (val * 1000).toFixed(0) : String(val || 10);
      newComp = {
        id,
        type: "INDUCTOR",
        label: `L (${mH}mH)`,
        value: val || 0.01,
        formattedValue: `${mH} mH Choke`,
        pins: {
          T1: { type: "TERMINAL", col: safeCol, row: rowStd },
          T2: { type: "TERMINAL", col: Math.min(63, safeCol + 4), row: rowStd },
        },
      };
    } else if (type === "LDR") {
      const ldrVal = val || 5000;
      newComp = {
        id,
        type: "LDR",
        label: "CdS LDR",
        value: ldrVal,
        formattedValue: ldrVal >= 1000 ? `${(ldrVal / 1000).toFixed(1)} kΩ` : `${ldrVal} Ω`,
        pins: {
          T1: { type: "TERMINAL", col: safeCol, row: rowStd },
          T2: { type: "TERMINAL", col: Math.min(63, safeCol + 3), row: rowStd },
        },
      };
    } else if (type === "BUZZER") {
      newComp = {
        id,
        type: "BUZZER",
        label: "Piezo Buzzer",
        value: 5,
        formattedValue: "5V Active Piezo",
        pins: {
          ANODE: { type: "TERMINAL", col: safeCol, row: rowLead },
          CATHODE: { type: "TERMINAL", col: Math.min(63, safeCol + 3), row: rowLead },
        },
      };
    } else if (type.startsWith("LED_")) {
      const colorName = type.includes("RED") ? "Red" : type.includes("GREEN") ? "Green" : "Blue";
      newComp = {
        id,
        type,
        label: `LED (${colorName})`,
        value: type.includes("BLUE") ? 3.2 : type.includes("GREEN") ? 2.2 : 2.0,
        formattedValue: `${colorName} 5mm`,
        pins: {
          ANODE: { type: "TERMINAL", col: safeCol, row: rowLead },
          CATHODE: { type: "TERMINAL", col: Math.min(63, safeCol + 3), row: rowLead },
        },
      };
    } else if (type === "DIODE_1N4007" || type === "DIODE_ZENER" || type === "DIODE_1N5819") {
      const isZener = type === "DIODE_ZENER";
      const isSchottky = type === "DIODE_1N5819";
      const zV = val || 5.1;
      newComp = {
        id,
        type,
        label: isZener ? `Zener (${zV}V)` : isSchottky ? "1N5819" : "1N4007",
        value: isZener ? zV : isSchottky ? 0.3 : 0.7,
        formattedValue: isZener ? `${zV}V Zener` : isSchottky ? "1N5819 (0.3V)" : "1N4007 (0.7V)",
        pins: {
          ANODE: { type: "TERMINAL", col: safeCol, row: rowStd },
          CATHODE: { type: "TERMINAL", col: Math.min(63, safeCol + 4), row: rowStd },
        },
      };
    } else if (type === "CAP_CERAMIC") {
      newComp = {
        id,
        type: "CAP_CERAMIC",
        label: "C (100nF)",
        value: 0.0000001,
        formattedValue: "100 nF (104)",
        pins: {
          T1: { type: "TERMINAL", col: safeCol, row: rowStd },
          T2: { type: "TERMINAL", col: Math.min(63, safeCol + 3), row: rowStd },
        },
      };
    } else if (type === "CAP_ELECTROLYTIC") {
      newComp = {
        id,
        type: "CAP_ELECTROLYTIC",
        label: "C1 (10µF)",
        value: 0.00001,
        formattedValue: "10 µF (Radial)",
        pins: {
          ANODE: { type: "TERMINAL", col: safeCol, row: rowElec },
          CATHODE: { type: "TERMINAL", col: Math.min(63, safeCol + 3), row: rowElec },
        },
      };
    } else if (type === "BJT_BC547" || type === "BJT_BC557" || type === "TRANSISTOR_2N2222") {
      newComp = {
        id,
        type,
        label:
          type === "BJT_BC547"
            ? "BC547 NPN"
            : type === "BJT_BC557"
            ? "BC557 PNP"
            : "2N2222 NPN",
        value: 200,
        formattedValue:
          type === "BJT_BC547"
            ? "BC547B"
            : type === "BJT_BC557"
            ? "BC557B PNP"
            : "2N2222A",
        pins: {
          COLLECTOR: { type: "TERMINAL", col: safeCol, row: rowStd },
          BASE: { type: "TERMINAL", col: Math.min(63, safeCol + 1), row: rowStd },
          EMITTER: { type: "TERMINAL", col: Math.min(63, safeCol + 2), row: rowStd },
        },
      };
    } else if (type === "MOSFET_IRF540N") {
      newComp = {
        id,
        type: "MOSFET_IRF540N",
        label: "IRF540N N-MOS",
        value: 100,
        formattedValue: "IRF540N TO-220",
        pins: {
          GATE: { type: "TERMINAL", col: safeCol, row: rowStd },
          DRAIN: { type: "TERMINAL", col: Math.min(63, safeCol + 1), row: rowStd },
          SOURCE: { type: "TERMINAL", col: Math.min(63, safeCol + 2), row: rowStd },
        },
      };
    } else if (type === "IC_LM7805") {
      newComp = {
        id,
        type: "IC_LM7805",
        label: "LM7805 (+5V)",
        value: 5.0,
        formattedValue: "7805 Regulator",
        pins: {
          VIN: { type: "TERMINAL", col: safeCol, row: rowStd },
          GND: { type: "TERMINAL", col: Math.min(63, safeCol + 1), row: rowStd },
          VOUT: { type: "TERMINAL", col: Math.min(63, safeCol + 2), row: rowStd },
        },
      };
    } else if (type === "IC_NE555") {
      newComp = {
        id,
        type: "IC_NE555",
        label: "NE555P",
        value: 555,
        formattedValue: "NE555 Timer DIP-8",
        pins: {
          PIN1_GND: { type: "TERMINAL", col: safeCol, row: "E" },
          PIN2_TRIG: { type: "TERMINAL", col: Math.min(63, safeCol + 1), row: "E" },
          PIN3_OUT: { type: "TERMINAL", col: Math.min(63, safeCol + 2), row: "E" },
          PIN4_RST: { type: "TERMINAL", col: Math.min(63, safeCol + 3), row: "E" },
          PIN5_CTRL: { type: "TERMINAL", col: Math.min(63, safeCol + 3), row: "F" },
          PIN6_THRES: { type: "TERMINAL", col: Math.min(63, safeCol + 2), row: "F" },
          PIN7_DISCH: { type: "TERMINAL", col: Math.min(63, safeCol + 1), row: "F" },
          PIN8_VCC: { type: "TERMINAL", col: safeCol, row: "F" },
        },
      };
    } else if (type === "IC_LM741") {
      newComp = {
        id,
        type: "IC_LM741",
        label: "LM741",
        value: 741,
        formattedValue: "LM741 Op-Amp DIP-8",
        pins: {
          PIN1_GND: { type: "TERMINAL", col: safeCol, row: "E" },
          PIN2_TRIG: { type: "TERMINAL", col: Math.min(63, safeCol + 1), row: "E" },
          PIN3_OUT: { type: "TERMINAL", col: Math.min(63, safeCol + 2), row: "E" },
          PIN4_RST: { type: "TERMINAL", col: Math.min(63, safeCol + 3), row: "E" },
          PIN5_CTRL: { type: "TERMINAL", col: Math.min(63, safeCol + 3), row: "F" },
          PIN6_THRES: { type: "TERMINAL", col: Math.min(63, safeCol + 2), row: "F" },
          PIN7_DISCH: { type: "TERMINAL", col: Math.min(63, safeCol + 1), row: "F" },
          PIN8_VCC: { type: "TERMINAL", col: safeCol, row: "F" },
        },
      };
    } else if (type === "IC_74LS76") {
      const dipCol = Math.min(55, safeCol);
      newComp = {
        id,
        type: "IC_74LS76",
        label: "74LS76",
        value: 7476,
        formattedValue: "SN74LS76 Dual JK-FF",
        pins: {
          PIN1_1CLK: { type: "TERMINAL", col: dipCol, row: "E" },
          PIN2_1PRE: { type: "TERMINAL", col: dipCol + 1, row: "E" },
          PIN3_1CLR: { type: "TERMINAL", col: dipCol + 2, row: "E" },
          PIN4_1J: { type: "TERMINAL", col: dipCol + 3, row: "E" },
          PIN5_VCC: { type: "TERMINAL", col: dipCol + 4, row: "E" },
          PIN6_2CLK: { type: "TERMINAL", col: dipCol + 5, row: "E" },
          PIN7_2PRE: { type: "TERMINAL", col: dipCol + 6, row: "E" },
          PIN8_2CLR: { type: "TERMINAL", col: dipCol + 7, row: "E" },
          PIN9_2J: { type: "TERMINAL", col: dipCol + 7, row: "F" },
          PIN10_2QN: { type: "TERMINAL", col: dipCol + 6, row: "F" },
          PIN11_2Q: { type: "TERMINAL", col: dipCol + 5, row: "F" },
          PIN12_2K: { type: "TERMINAL", col: dipCol + 4, row: "F" },
          PIN13_GND: { type: "TERMINAL", col: dipCol + 3, row: "F" },
          PIN14_1QN: { type: "TERMINAL", col: dipCol + 2, row: "F" },
          PIN15_1Q: { type: "TERMINAL", col: dipCol + 1, row: "F" },
          PIN16_1K: { type: "TERMINAL", col: dipCol, row: "F" },
        },
      };
    } else if (type.startsWith("IC_74LS")) {
      const dipCol = Math.min(57, safeCol);
      const chipNames: Record<string, string> = {
        IC_74LS00: "SN74LS00 Quad NAND",
        IC_74LS04: "SN74LS04 Hex Inverter",
        IC_74LS08: "SN74LS08 Quad AND",
        IC_74LS32: "SN74LS32 Quad OR",
        IC_74LS02: "SN74LS02 Quad NOR",
        IC_74LS86: "SN74LS86 Quad XOR",
        IC_74LS74: "SN74LS74 Dual D-FF",
      };
      newComp = {
        id,
        type,
        label: type.replace("IC_", ""),
        value: val || 7400,
        formattedValue: chipNames[type] || "SN74LSxx DIP-14",
        pins: {
          PIN1: { type: "TERMINAL", col: dipCol, row: "E" },
          PIN2_1B: { type: "TERMINAL", col: dipCol + 1, row: "E" },
          PIN3_1Y: { type: "TERMINAL", col: dipCol + 2, row: "E" },
          PIN4_2A: { type: "TERMINAL", col: dipCol + 3, row: "E" },
          PIN5_2B: { type: "TERMINAL", col: dipCol + 4, row: "E" },
          PIN6_2Y: { type: "TERMINAL", col: dipCol + 5, row: "E" },
          PIN7_GND: { type: "TERMINAL", col: dipCol + 6, row: "E" },
          PIN8_3Y: { type: "TERMINAL", col: dipCol + 6, row: "F" },
          PIN9_3A: { type: "TERMINAL", col: dipCol + 5, row: "F" },
          PIN10_3B: { type: "TERMINAL", col: dipCol + 4, row: "F" },
          PIN11_4Y: { type: "TERMINAL", col: dipCol + 3, row: "F" },
          PIN12_4A: { type: "TERMINAL", col: dipCol + 2, row: "F" },
          PIN13_4B: { type: "TERMINAL", col: dipCol + 1, row: "F" },
          PIN14_VCC: { type: "TERMINAL", col: dipCol, row: "F" },
        },
      };
    } else if (type === "SEVEN_SEG") {
      const dipCol = Math.min(58, safeCol);
      newComp = {
        id,
        type: "SEVEN_SEG",
        label: "7-SEG LED",
        value: 7,
        formattedValue: "Common Cathode DIP-10",
        pins: {
          SEG_G: { type: "TERMINAL", col: dipCol, row: "E" },
          SEG_F: { type: "TERMINAL", col: dipCol + 1, row: "E" },
          COM: { type: "TERMINAL", col: dipCol + 2, row: "E" },
          SEG_A: { type: "TERMINAL", col: dipCol + 3, row: "E" },
          SEG_B: { type: "TERMINAL", col: dipCol + 4, row: "E" },
          SEG_E: { type: "TERMINAL", col: dipCol, row: "F" },
          SEG_D: { type: "TERMINAL", col: dipCol + 1, row: "F" },
          COM_GND: { type: "TERMINAL", col: dipCol + 2, row: "F" },
          SEG_C: { type: "TERMINAL", col: dipCol + 3, row: "F" },
          SEG_DP: { type: "TERMINAL", col: dipCol + 4, row: "F" },
        },
      };
    } else if (type === "PUSH_BUTTON" || type === "SWITCH_SPST") {
      newComp = {
        id,
        type,
        label: type === "SWITCH_SPST" ? "SW1 (SPST)" : "SW1 (Tactile)",
        value: 1,
        formattedValue: type === "SWITCH_SPST" ? "CLOSED (0.05Ω)" : "6x6mm Button",
        pins: {
          T1: { type: "TERMINAL", col: safeCol, row: rowLead },
          T2: { type: "TERMINAL", col: Math.min(63, safeCol + 3), row: rowLead },
        },
      };
    } else {
      // POTENTIOMETER
      newComp = {
        id,
        type: "POTENTIOMETER",
        label: "POT 10k",
        value: 10000,
        formattedValue: "10 kΩ Trimpot",
        pins: {
          T1: { type: "TERMINAL", col: safeCol, row: rowStd },
          WIPER: { type: "TERMINAL", col: Math.min(63, safeCol + 1), row: rowStd },
          T2: { type: "TERMINAL", col: Math.min(63, safeCol + 2), row: rowStd },
        },
      };
    }

    setComponents((prev) => [...prev, newComp]);
    setSelectedComponentId(newComp.id);
    setIsPropertiesDrawerOpen(false);
    setIsAddCompModalOpen(false);
    setSmartWiringToast(`✓ Placed ${newComp.label} at Col ${safeCol}${preferredRow ? ` Row ${preferredRow}` : ""} · MNA SPICE Solver Updated`);
    setTimeout(() => setSmartWiringToast(null), 4000);
  };

  const handleDropComponentAtHole = useCallback(
    (typeStr: string, val: number, hole: BreadboardHoleId) => {
      const targetRow = hole.type === "TERMINAL" && hole.row ? hole.row : "C";
      handleAddIeeeComponent(typeStr as BbCompType, val, hole.col, targetRow);
    },
    []
  );

  const handleMoveComponentToHole = useCallback(
    (compId: string, targetHole: BreadboardHoleId) => {
      const rowLetters: ("A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "I" | "J")[] = [
        "A", "B", "C", "D", "E", "F", "G", "H", "I", "J",
      ];
      setComponents((prev) =>
        prev.map((comp) => {
          if (comp.id !== compId) return comp;
          const entries = Object.entries(comp.pins);
          if (entries.length === 0) return comp;
          const anchor = entries[0][1];
          const rawDc = targetHole.col - anchor.col;
          const minCol = Math.min(...entries.map(([, p]) => p.col));
          const maxCol = Math.max(...entries.map(([, p]) => p.col));
          const dc = Math.max(1 - minCol, Math.min(63 - maxCol, rawDc));
          const isIc =
            (comp.type.startsWith("IC_") && comp.type !== "IC_LM7805") ||
            comp.type === "SEVEN_SEG";
          const targetRowIdx =
            targetHole.type === "TERMINAL" && targetHole.row
              ? rowLetters.indexOf(targetHole.row)
              : rowLetters.indexOf(anchor.row || "C");
          const anchorRowIdx = rowLetters.indexOf(anchor.row || "C");
          const dr = isIc ? 0 : targetRowIdx - anchorRowIdx;

          const updatedPins: Record<string, BreadboardHoleId> = {};
          entries.forEach(([k, p]) => {
            if (p.type === "RAIL" || isIc) {
              updatedPins[k] = { ...p, col: p.col + dc };
            } else {
              const curIdx = rowLetters.indexOf(p.row || "C");
              const nextIdx = Math.max(0, Math.min(9, curIdx + dr));
              updatedPins[k] = {
                type: "TERMINAL",
                col: p.col + dc,
                row: rowLetters[nextIdx],
              };
            }
          });
          return { ...comp, pins: updatedPins };
        })
      );
      setSmartWiringToast(`✓ Repositioned component to Col ${targetHole.col} · MNA SPICE Re-solved`);
      setTimeout(() => setSmartWiringToast(null), 2600);
    },
    []
  );

  const handleQuickPlaceIeeeComponent = (type: BbCompType, val: number) => {
    const existingCols = components.flatMap((c) => Object.values(c.pins).map((p) => p.col));
    let col = 16;
    for (let c = 10; c <= 54; c += 4) {
      if (!existingCols.includes(c) && !existingCols.includes(c + 1) && !existingCols.includes(c + 2)) {
        col = c;
        break;
      }
    }
    handleAddIeeeComponent(type, val, col);
  };

  const handleDeleteComponent = (compId: string) => {
    setComponents((prev) => prev.filter((c) => c.id !== compId));
    if (selectedComponentId === compId) {
      setSelectedComponentId(null);
    }
  };

  const selectedComponent = useMemo(
    () => components.find((c) => c.id === selectedComponentId) ?? null,
    [components, selectedComponentId]
  );

  const selectedCompTelemetry = useMemo(() => {
    if (!selectedComponent || !simResults.vMap || !simResults.find) return null;
    const pinEntries = Object.entries(selectedComponent.pins);
    if (pinEntries.length < 2) return null;
    const [, p1Hole] = pinEntries[0];
    const [, p2Hole] = pinEntries[1];
    const n1 = simResults.find(holeToNetKey(p1Hole));
    const n2 = simResults.find(holeToNetKey(p2Hole));
    const v1 = simResults.vMap.get(n1) ?? 0;
    const v2 = simResults.vMap.get(n2) ?? 0;
    const vDrop = Math.abs(v1 - v2);
    const solvedMa = simResults.currentMap.get(selectedComponent.id);
    let currentMa = solvedMa ?? 0;
    if (solvedMa === undefined) {
      if (selectedComponent.type === "RESISTOR" && selectedComponent.value > 0) {
        currentMa = (vDrop / selectedComponent.value) * 1000;
      } else if (selectedComponent.type.startsWith("LED_")) {
        const vFwd = selectedComponent.value;
        currentMa = vDrop >= vFwd ? Math.min(25, ((vDrop - vFwd) / 30) * 1000) : 0;
      } else if (selectedComponent.type === "DIODE_1N4007") {
        currentMa = vDrop >= 0.7 ? Math.min(1000, ((vDrop - 0.7) / 0.5) * 1000) : 0;
      }
    }
    return {
      v1,
      v2,
      vDrop,
      currentMa,
    };
  }, [selectedComponent, simResults, holeToNetKey]);

  const handleUpdateComponentValue = (compId: string, newVal: number, newFormattedVal: string) => {
    setComponents((prev) =>
      prev.map((c) => {
        if (c.id !== compId) return c;
        return {
          ...c,
          value: newVal,
          formattedValue: newFormattedVal,
          label: c.type === "RESISTOR"
            ? `R (${newVal >= 1000 ? `${(newVal / 1000).toFixed(1)}kΩ` : `${newVal}Ω`})`
            : c.label,
        };
      })
    );
  };

  // Pan controls (respects Breadboard Lock & clamps travel so board never disappears)
  const handleSvgPointerDown = (e: React.PointerEvent) => {
    if (isBoardLocked) return;
    if (
      e.button === 1 ||
      e.shiftKey ||
      e.target === svgRef.current ||
      (e.target as Element)?.getAttribute("data-bb-bg") === "true"
    ) {
      setIsPanning(true);
      panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    }
  };

  const handleSvgPointerMove = (e: React.PointerEvent) => {
    if (isPanning && !isBoardLocked) {
      const rawX = e.clientX - panStartRef.current.x;
      const rawY = e.clientY - panStartRef.current.y;
      setPan({
        x: Math.max(-340, Math.min(340, rawX)),
        y: Math.max(-150, Math.min(150, rawY)),
      });
    }
    if (svgRef.current) {
      setMousePos(clientToSvgPoint(e.clientX, e.clientY));
    }
  };

  const handleSvgPointerUp = () => {
    setIsPanning(false);
  };

  return (
    <div className="space-y-4 text-[#e6edf8]">
      {/* Top Breadboard Action & Instrument Ribbon */}
      <div className="bg-[#111827] border border-[#26365c] rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-300">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-white">
                Solderless Breadboard Studio (830 Tie-Points)
              </h3>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                LIVE SPICE SOLVER CONNECTED
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Standard 830-point solderless breadboard with dual power rails (+/-), 63 terminal columns, and authentic catenary jumper wires.
            </p>
          </div>
        </div>

        {/* Action Controls: Presets, Power Supply, Simulation Toggle */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Controlled Preset Selector */}
          <select
            value={selectedPresetName}
            onChange={(e) => {
              const p = BREADBOARD_PRESETS.find((x) => x.name === e.target.value);
              if (p) loadPreset(p);
            }}
            className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-mono text-cyan-300 focus:outline-none cursor-pointer"
          >
            {BREADBOARD_PRESETS.map((p) => (
              <option key={p.name} value={p.name}>
                {p.name}
              </option>
            ))}
          </select>

          {/* 3D / Split / 2D Workspace View Switcher */}
          <div className="flex items-center bg-slate-900 border border-cyan-500/40 rounded-xl p-0.5 text-xs font-mono">
            <button
              type="button"
              onClick={() => setWorkspaceViewMode("SPLIT")}
              className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                workspaceViewMode === "SPLIT"
                  ? "bg-cyan-500/30 text-cyan-200 border border-cyan-400 shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
              title="Side-by-Side 3D Hardware View + Interactive 2D Wiring Board"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>3D + 2D</span>
            </button>
            <button
              type="button"
              onClick={() => setWorkspaceViewMode("3D")}
              className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                workspaceViewMode === "3D"
                  ? "bg-cyan-500/30 text-cyan-200 border border-cyan-400 shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
              title="Full Interactive 3D Breadboard Studio"
            >
              <Box className="w-3.5 h-3.5" />
              <span>3D Setup</span>
            </button>
            <button
              type="button"
              onClick={() => setWorkspaceViewMode("2D")}
              className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                workspaceViewMode === "2D"
                  ? "bg-cyan-500/30 text-cyan-200 border border-cyan-400 shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
              title="2D Wiring & IEEE Schematic View"
            >
              <span>2D Board</span>
            </button>
          </div>

          {/* DC Power Supply Voltage */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-slate-400">Vcc:</span>
            <input
              type="number"
              min="1"
              max="24"
              step="0.5"
              value={vSourceVal}
              onChange={(e) => setVSourceVal(parseFloat(e.target.value) || 5.0)}
              className="w-14 bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 text-amber-300 font-bold text-center focus:outline-none"
            />
            <span className="text-amber-400 font-bold">V</span>
          </div>

          {/* Pulse / Signal Frequency Control (syncs 3D wire pulse velocity & oscilloscope sweep) */}
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-cyan-500/30 text-xs font-mono"
            title="Adjust simulator pulse frequency (synchronizes 3D wire electricity pulse speed and oscilloscope sweep)"
          >
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-400">Freq:</span>
            <input
              type="range"
              min="0.5"
              max="12"
              step="0.5"
              value={simFreqHz}
              onChange={(e) => setSimFreqHz(parseFloat(e.target.value) || 2.0)}
              className="w-16 accent-cyan-400 cursor-pointer"
              aria-label="Simulation Pulse Frequency Hz"
            />
            <span className="text-cyan-300 font-bold w-12 text-right tabular-nums">
              {simFreqHz.toFixed(1)}Hz
            </span>
          </div>

          {/* Breadboard Lock Toggle */}
          <button
            type="button"
            onClick={() => setIsBoardLocked((v) => !v)}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold border transition-colors cursor-pointer flex items-center gap-1.5 ${
              isBoardLocked
                ? "bg-emerald-500/20 text-emerald-200 border-emerald-400/60 shadow-sm"
                : "bg-amber-500/20 text-amber-200 border-amber-400/60"
            }`}
            title={
              isBoardLocked
                ? "Locked on current view. Click to unlock and move ahead, back, and forth."
                : "Unlocked — scroll/pan to move ahead, back, and forth. Click to lock on current view."
            }
          >
            {isBoardLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
            <span>{isBoardLocked ? "Locked on View" : "Unlocked · Move Ahead/Forth"}</span>
          </button>

          {/* Pin View / Lock Canvas Scroll Toggle */}
          <button
            type="button"
            onClick={() => setIsCircuitPinned((v) => !v)}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold border transition-colors cursor-pointer flex items-center gap-1.5 ${
              isCircuitPinned
                ? "bg-cyan-500/20 text-cyan-200 border-cyan-400/60 shadow-sm"
                : "bg-slate-900 text-slate-300 border-slate-700 hover:text-white"
            }`}
            title="Pin View: keeps the circuit breadboard locked on screen and prevents accidental outer-page scrolling while panning/inspecting"
          >
            {isCircuitPinned ? <Pin className="w-3.5 h-3.5 text-cyan-300" /> : <PinOff className="w-3.5 h-3.5" />}
            <span>Pin View: {isCircuitPinned ? "ON" : "OFF"}</span>
          </button>

          {/* Locate / Frame Laid Circuit Button */}
          <button
            type="button"
            onClick={handleFindCircuit}
            className="px-3 py-1.5 rounded-xl text-xs font-mono font-bold bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-cyan-500/50 transition-colors cursor-pointer flex items-center gap-1.5"
            title="Center & highlight where the circuit is laid in both 3D & 2D"
          >
            <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
            <span>Find Circuit</span>
          </button>

          {/* DMM Probe Toggle */}
          <button
            type="button"
            onClick={() => setIsDmmActive(!isDmmActive)}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold border transition-colors cursor-pointer flex items-center gap-1.5 ${
              isDmmActive
                ? "bg-cyan-500 text-slate-950 border-cyan-400 shadow-md"
                : "bg-slate-900 text-slate-300 border-slate-700 hover:text-white"
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>DMM: {isDmmActive ? "INSTALLED" : "OFF"}</span>
          </button>

          {/* Oscilloscope Toggle */}
          <button
            type="button"
            onClick={() => setIsScopeActive(!isScopeActive)}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold border transition-colors cursor-pointer flex items-center gap-1.5 ${
              isScopeActive
                ? "bg-amber-400 text-slate-950 border-amber-300 shadow-md shadow-amber-400/20"
                : "bg-slate-900 text-slate-300 border-slate-700 hover:text-white"
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Oscilloscope: {isScopeActive ? "INSTALLED" : "OFF"}</span>
          </button>

          {/* Signal Generator (XFG1) Toggle */}
          <button
            type="button"
            onClick={() => setIsSigGenActive((v) => !v)}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold border transition-colors cursor-pointer flex items-center gap-1.5 ${
              isSigGenActive
                ? "bg-orange-400 text-slate-950 border-orange-300 shadow-md shadow-orange-400/20"
                : "bg-slate-900 text-slate-300 border-slate-700 hover:text-white"
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>SigGen: {isSigGenActive ? "INSTALLED" : "OFF"}</span>
          </button>

          {/* Add IEEE Standard Component Button */}
          <button
            type="button"
            onClick={() => setIsAddCompModalOpen(true)}
            className="px-3 py-1.5 rounded-xl text-xs font-mono font-bold bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-400/50 transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
            title="Add IEEE standard components (Resistors, Capacitors, LEDs, Diodes, BJTs, ICs) to the breadboard"
          >
            <PlusCircle className="w-3.5 h-3.5 text-cyan-400" />
            <span>+ Add Component</span>
          </button>

          {/* IEEE Standard Mode 3-Way Selector */}
          <div className="flex items-center bg-slate-900 border border-slate-700 rounded-xl p-0.5 text-xs font-mono">
            <button
              type="button"
              onClick={() => {
                setIeeeStandardMode(true);
                setIeeeViewMode("HYBRID");
              }}
              className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                ieeeViewMode === "HYBRID"
                  ? "bg-cyan-500/30 text-cyan-200 border border-cyan-400 shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
              title="Hybrid View: Authentic 3D physical package with embossed IEEE 315 standard symbols & pinouts"
            >
              Hybrid
            </button>
            <button
              type="button"
              onClick={() => {
                setIeeeStandardMode(true);
                setIeeeViewMode("IEEE_SCHEMATIC");
              }}
              className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                ieeeViewMode === "IEEE_SCHEMATIC"
                  ? "bg-cyan-500/30 text-cyan-200 border border-cyan-400 shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
              title="IEEE 315 / ANSI Y32.2 Standard: Pure schematic circuit symbols drawn directly on breadboard holes"
            >
              IEEE 315 Symbols
            </button>
            <button
              type="button"
              onClick={() => {
                setIeeeStandardMode(true);
                setIeeeViewMode("IEEE_PACKAGING");
              }}
              className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                ieeeViewMode === "IEEE_PACKAGING"
                  ? "bg-cyan-500/30 text-cyan-200 border border-cyan-400 shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
              title="IEEE / JEDEC Standard Packaging: Physical dimensions (DO-41, TO-92, DIP-8, DIP-14) strictly conforming to 2.54mm pitch"
            >
              IEEE Packaging
            </button>
          </div>

          {/* Run/Pause Simulation */}
          <button
            type="button"
            onClick={() => setSimRunning(!simRunning)}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold border transition-colors cursor-pointer flex items-center gap-1.5 ${
              simRunning
                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                : "bg-amber-500/20 text-amber-300 border-amber-500/40"
            }`}
          >
            {simRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>Simulation: {simRunning ? "RUNNING" : "PAUSED"}</span>
          </button>
        </div>
      </div>

      {/* Jumper Wire Color Palette & Tool Dock */}
      <div className="bg-[#0f172a] border border-[#26365c] rounded-2xl px-5 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Wire Color Swatches */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-400 font-semibold mr-1">
            Jumper Wire Color:
          </span>
          {[
            { color: "#ef4444" as WireColor, name: "Red (+VCC)" },
            { color: "#0f172a" as WireColor, name: "Black (GND)" },
            { color: "#eab308" as WireColor, name: "Yellow (Signal)" },
            { color: "#3b82f6" as WireColor, name: "Blue" },
            { color: "#22c55e" as WireColor, name: "Green" },
            { color: "#f97316" as WireColor, name: "Orange" },
            { color: "#ffffff" as WireColor, name: "White" },
          ].map((item) => (
            <button
              key={item.color}
              type="button"
              onClick={() => setSelectedWireColor(item.color)}
              className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer ${
                selectedWireColor === item.color
                  ? "border-cyan-400 scale-125 shadow-[0_0_8px_rgba(6,182,212,0.8)]"
                  : "border-slate-700 hover:scale-110"
              }`}
              style={{ backgroundColor: item.color }}
              title={item.name}
            />
          ))}
          {pendingWireStart && (
            <span className="ml-2 text-xs font-mono text-cyan-300 font-bold">
              Connecting lead... Click destination hole!
            </span>
          )}
        </div>

        {/* Smart Auto-Routing, Clear Wires, and Zoom Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleSmartAutoRoute}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-emerald-500/20 hover:from-cyan-500/30 hover:to-emerald-500/30 text-xs font-mono font-bold text-cyan-200 border border-cyan-400/50 cursor-pointer flex items-center gap-1.5 shadow-sm transition-all"
            title="Auto-route optimal jumper paths avoiding overlaps and channel crossing"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Smart Auto-Route Wires</span>
          </button>
          <button
            type="button"
            onClick={() => setWires([])}
            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-mono text-rose-300 border border-slate-700 cursor-pointer flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Wires</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setZoom(1.0);
              setPan({ x: 0, y: 0 });
            }}
            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-mono text-slate-300 border border-slate-700 cursor-pointer"
          >
            Reset Zoom &amp; Pan
          </button>
        </div>
      </div>

      {/* IEEE Standard Component Library Quick-Place Dock */}
      <div className="bg-[#0f172a] border border-cyan-500/30 rounded-2xl p-3 shadow-lg space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
              IEEE 315 Component Library
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-700/60 font-semibold">
              Standard Symbols · 1-Click Place &amp; Drag
            </span>
          </div>

          {/* Quick Selection Status & Analysis Drawer Toggle */}
          {selectedComponent && (
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-slate-400">Selected:</span>
              <span className="font-bold text-cyan-300 bg-slate-900 px-2 py-0.5 rounded border border-cyan-500/40">
                {selectedComponent.label}
              </span>
              <button
                type="button"
                onClick={() => setIsPropertiesDrawerOpen(!isPropertiesDrawerOpen)}
                className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-400/50 text-[11px] font-bold cursor-pointer transition-colors flex items-center gap-1"
                title="Double-click any component directly on the breadboard or click here to toggle properties"
              >
                <span>{isPropertiesDrawerOpen ? "Close Inspector" : "Inspect Properties / Analysis"}</span>
              </button>
            </div>
          )}
        </div>

        {/* Quick Placement Grid with Authentic IEEE Symbols */}
        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1">
          {[
            {
              type: "RESISTOR" as BbCompType,
              val: 330,
              label: "330Ω",
              sub: "Resistor",
              svg: (
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 12" fill="none" stroke="#38bdf8" strokeWidth="1.8">
                  <path d="M 1 6 L 4 6 L 6 1 L 9 11 L 12 1 L 15 11 L 18 1 L 20 6 L 23 6" />
                </svg>
              ),
            },
            {
              type: "RESISTOR" as BbCompType,
              val: 1000,
              label: "1.0kΩ",
              sub: "Resistor",
              svg: (
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 12" fill="none" stroke="#38bdf8" strokeWidth="1.8">
                  <path d="M 1 6 L 4 6 L 6 1 L 9 11 L 12 1 L 15 11 L 18 1 L 20 6 L 23 6" />
                </svg>
              ),
            },
            {
              type: "RESISTOR" as BbCompType,
              val: 10000,
              label: "10kΩ",
              sub: "Pull-up",
              svg: (
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 12" fill="none" stroke="#38bdf8" strokeWidth="1.8">
                  <path d="M 1 6 L 4 6 L 6 1 L 9 11 L 12 1 L 15 11 L 18 1 L 20 6 L 23 6" />
                </svg>
              ),
            },
            {
              type: "LED_RED" as BbCompType,
              val: 2.0,
              label: "Red LED",
              sub: "IEEE Diode",
              svg: (
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 16 16" fill="none" stroke="#ef4444" strokeWidth="1.6">
                  <polygon points="2,3 2,13 10,8" fill="#ef4444" />
                  <line x1="10" y1="2" x2="10" y2="14" stroke="#ef4444" strokeWidth="2" />
                  <line x1="8" y1="3" x2="14" y2="0" stroke="#f87171" strokeWidth="1.2" />
                </svg>
              ),
            },
            {
              type: "LED_GREEN" as BbCompType,
              val: 2.2,
              label: "Green LED",
              sub: "IEEE Diode",
              svg: (
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 16 16" fill="none" stroke="#22c55e" strokeWidth="1.6">
                  <polygon points="2,3 2,13 10,8" fill="#22c55e" />
                  <line x1="10" y1="2" x2="10" y2="14" stroke="#22c55e" strokeWidth="2" />
                  <line x1="8" y1="3" x2="14" y2="0" stroke="#4ade80" strokeWidth="1.2" />
                </svg>
              ),
            },
            {
              type: "DIODE_1N4007" as BbCompType,
              val: 0.7,
              label: "1N4007",
              sub: "Rectifier",
              svg: (
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 16 16" fill="none" stroke="#38bdf8" strokeWidth="1.6">
                  <line x1="1" y1="8" x2="4" y2="8" stroke="#38bdf8" />
                  <polygon points="4,4 4,12 11,8" fill="#38bdf8" />
                  <line x1="11" y1="3" x2="11" y2="13" stroke="#38bdf8" strokeWidth="2" />
                  <line x1="11" y1="8" x2="15" y2="8" stroke="#38bdf8" />
                </svg>
              ),
            },
            {
              type: "CAP_CERAMIC" as BbCompType,
              val: 0.0000001,
              label: "100nF Cap",
              sub: "Parallel Plate",
              svg: (
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 16 16" fill="none" stroke="#38bdf8" strokeWidth="1.8">
                  <line x1="1" y1="8" x2="6" y2="8" />
                  <line x1="6" y1="2" x2="6" y2="14" strokeWidth="2.2" />
                  <line x1="10" y1="2" x2="10" y2="14" strokeWidth="2.2" />
                  <line x1="10" y1="8" x2="15" y2="8" />
                </svg>
              ),
            },
            {
              type: "CAP_ELECTROLYTIC" as BbCompType,
              val: 0.00001,
              label: "10µF Cap",
              sub: "Polarized",
              svg: (
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 16 16" fill="none" stroke="#38bdf8" strokeWidth="1.8">
                  <line x1="1" y1="8" x2="6" y2="8" />
                  <line x1="6" y1="2" x2="6" y2="14" strokeWidth="2.2" />
                  <path d="M 10 2 Q 8 8 10 14" strokeWidth="2.2" />
                  <line x1="10" y1="8" x2="15" y2="8" />
                </svg>
              ),
            },
            {
              type: "BJT_BC547" as BbCompType,
              val: 200,
              label: "BC547 BJT",
              sub: "NPN Linear",
              svg: (
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 16 16" fill="none" stroke="#38bdf8" strokeWidth="1.6">
                  <line x1="6" y1="2" x2="6" y2="14" strokeWidth="2.2" />
                  <line x1="1" y1="8" x2="6" y2="8" />
                  <line x1="6" y1="5" x2="13" y2="2" />
                  <line x1="6" y1="11" x2="13" y2="14" />
                  <polygon points="13,14 9,12 11,9" fill="#38bdf8" />
                </svg>
              ),
            },
            {
              type: "IC_NE555" as BbCompType,
              val: 555,
              label: "NE555",
              sub: "DIP-8 Timer",
              svg: (
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 16 16" fill="none" stroke="#38bdf8" strokeWidth="1.4">
                  <rect x="2" y="3" width="12" height="10" rx="1.5" />
                  <circle cx="5" cy="5" r="1" fill="#38bdf8" />
                </svg>
              ),
            },
            {
              type: "IC_LM741" as BbCompType,
              val: 741,
              label: "LM741",
              sub: "IEEE Op-Amp",
              svg: (
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 16 16" fill="none" stroke="#38bdf8" strokeWidth="1.5">
                  <polygon points="2,2 2,14 14,8" fill="rgba(56, 189, 248, 0.2)" />
                </svg>
              ),
            },
            {
              type: "IC_74LS00" as BbCompType,
              val: 7400,
              label: "74LS00",
              sub: "NAND Gate",
              svg: (
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 16 16" fill="none" stroke="#38bdf8" strokeWidth="1.4">
                  <path d="M 2 3 L 7 3 A 5 5 0 0 1 7 13 L 2 13 Z" />
                  <circle cx="13" cy="8" r="1.2" fill="#38bdf8" />
                </svg>
              ),
            },
            {
              type: "PUSH_BUTTON" as BbCompType,
              val: 1,
              label: "Button",
              sub: "Momentary",
              svg: (
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 16 16" fill="none" stroke="#38bdf8" strokeWidth="1.5">
                  <circle cx="3" cy="10" r="1.5" />
                  <circle cx="13" cy="10" r="1.5" />
                  <line x1="3" y1="6" x2="13" y2="6" strokeWidth="2" />
                  <line x1="8" y1="6" x2="8" y2="2" />
                </svg>
              ),
            },
            {
              type: "POTENTIOMETER" as BbCompType,
              val: 10000,
              label: "Pot 10k",
              sub: "Var Resistor",
              svg: (
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 16 16" fill="none" stroke="#38bdf8" strokeWidth="1.5">
                  <path d="M 1 11 L 3 11 L 5 8 L 8 14 L 11 8 L 13 11 L 15 11" />
                  <line x1="8" y1="2" x2="8" y2="9" strokeWidth="1.6" />
                  <polygon points="8,10 6,7 10,7" fill="#38bdf8" />
                </svg>
              ),
            },
            {
              type: "INDUCTOR" as BbCompType,
              val: 0.01,
              label: "10mH Coil",
              sub: "Inductor",
              svg: (
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 12" fill="none" stroke="#38bdf8" strokeWidth="1.6">
                  <path d="M 1 8 L 4 8 A 2.5 2.5 0 0 1 9 8 A 2.5 2.5 0 0 1 14 8 A 2.5 2.5 0 0 1 19 8 L 23 8" />
                </svg>
              ),
            },
            {
              type: "DIODE_ZENER" as BbCompType,
              val: 5.1,
              label: "5.1V Zener",
              sub: "Reg Diode",
              svg: (
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 16 16" fill="none" stroke="#f97316" strokeWidth="1.6">
                  <polygon points="3,4 3,12 10,8" fill="#f97316" />
                  <polyline points="8,2 10,3 10,13 12,14" />
                </svg>
              ),
            },
            {
              type: "MOSFET_IRF540N" as BbCompType,
              val: 100,
              label: "IRF540N",
              sub: "N-MOSFET",
              svg: (
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 16 16" fill="none" stroke="#a855f7" strokeWidth="1.5">
                  <line x1="2" y1="11" x2="5" y2="11" />
                  <line x1="5" y1="3" x2="5" y2="13" />
                  <line x1="8" y1="3" x2="8" y2="5" />
                  <line x1="8" y1="7" x2="8" y2="9" />
                  <line x1="8" y1="11" x2="8" y2="13" />
                  <line x1="8" y1="4" x2="14" y2="4" />
                  <line x1="8" y1="12" x2="14" y2="12" />
                </svg>
              ),
            },
            {
              type: "IC_LM7805" as BbCompType,
              val: 5,
              label: "LM7805",
              sub: "+5V Reg",
              svg: (
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 16 16" fill="none" stroke="#f59e0b" strokeWidth="1.4">
                  <rect x="3" y="3" width="10" height="10" rx="1.5" />
                  <line x1="1" y1="6" x2="3" y2="6" />
                  <line x1="13" y1="6" x2="15" y2="6" />
                  <line x1="8" y1="13" x2="8" y2="15" />
                </svg>
              ),
            },
            {
              type: "IC_74LS04" as BbCompType,
              val: 7404,
              label: "74LS04",
              sub: "Hex NOT",
              svg: (
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 16 16" fill="none" stroke="#38bdf8" strokeWidth="1.4">
                  <polygon points="3,3 3,13 11,8" />
                  <circle cx="12.5" cy="8" r="1.2" fill="#38bdf8" />
                </svg>
              ),
            },
            {
              type: "IC_74LS08" as BbCompType,
              val: 7408,
              label: "74LS08",
              sub: "Quad AND",
              svg: (
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 16 16" fill="none" stroke="#38bdf8" strokeWidth="1.4">
                  <path d="M 3 3 L 8 3 A 5 5 0 0 1 8 13 L 3 13 Z" />
                </svg>
              ),
            },
            {
              type: "IC_74LS32" as BbCompType,
              val: 7432,
              label: "74LS32",
              sub: "Quad OR",
              svg: (
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 16 16" fill="none" stroke="#38bdf8" strokeWidth="1.4">
                  <path d="M 2 3 Q 5 8 2 13 Q 10 13 14 8 Q 10 3 2 3 Z" />
                </svg>
              ),
            },
            {
              type: "IC_74LS74" as BbCompType,
              val: 7474,
              label: "74LS74",
              sub: "Dual D-FF",
              svg: (
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 16 16" fill="none" stroke="#38bdf8" strokeWidth="1.4">
                  <rect x="3" y="2" width="10" height="12" rx="1" />
                  <polyline points="3,10 5,11.5 3,13" />
                </svg>
              ),
            },
            {
              type: "SEVEN_SEG" as BbCompType,
              val: 7,
              label: "7-Seg",
              sub: "Display",
              svg: (
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 16 16" fill="none" stroke="#ef4444" strokeWidth="1.6">
                  <line x1="5" y1="2" x2="11" y2="2" />
                  <line x1="11" y1="3" x2="11" y2="7" />
                  <line x1="5" y1="8" x2="11" y2="8" />
                  <line x1="5" y1="9" x2="5" y2="13" />
                  <line x1="5" y1="14" x2="11" y2="14" />
                </svg>
              ),
            },
            {
              type: "SWITCH_SPST" as BbCompType,
              val: 1,
              label: "SPST SW",
              sub: "Toggle",
              svg: (
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 16 16" fill="none" stroke="#38bdf8" strokeWidth="1.5">
                  <circle cx="3" cy="10" r="1.5" />
                  <circle cx="13" cy="10" r="1.5" />
                  <line x1="4" y1="9" x2="12" y2="4" strokeWidth="1.8" />
                </svg>
              ),
            },
            {
              type: "BUZZER" as BbCompType,
              val: 5,
              label: "Buzzer",
              sub: "Piezo 5V",
              svg: (
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 16 16" fill="none" stroke="#38bdf8" strokeWidth="1.5">
                  <path d="M 4 5 L 4 11 L 9 11 L 13 14 L 13 2 L 9 5 Z" />
                </svg>
              ),
            },
            {
              type: "LDR" as BbCompType,
              val: 5000,
              label: "LDR",
              sub: "Photores",
              svg: (
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 16 16" fill="none" stroke="#f59e0b" strokeWidth="1.5">
                  <circle cx="8" cy="9" r="5" />
                  <line x1="2" y1="2" x2="5" y2="5" />
                </svg>
              ),
            },
          ].map((item) => (
            <button
              key={`${item.type}-${item.val}-${item.label}`}
              type="button"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData(
                  "application/ist-bb-comp",
                  JSON.stringify({ type: item.type, value: item.val, label: item.label })
                );
                e.dataTransfer.setData("text/plain", item.label);
                e.dataTransfer.effectAllowed = "copy";
              }}
              onClick={() => handleQuickPlaceIeeeComponent(item.type, item.val)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 hover:border-cyan-400/60 transition-all cursor-grab active:cursor-grabbing group shadow-xs active:scale-95"
              title={`Click or Drag & Drop ${item.label} directly onto any 3D breadboard socket`}
            >
              {item.svg}
              <div className="flex flex-col text-left">
                <span className="text-[11px] font-bold text-white group-hover:text-cyan-300 transition-colors leading-none font-mono">
                  {item.label}
                </span>
                <span className="text-[9px] text-slate-400 leading-tight font-mono">
                  {item.sub}
                </span>
              </div>
            </button>
          ))}

          <button
            type="button"
            onClick={() => setIsAddCompModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-400/60 text-xs font-mono font-bold cursor-pointer transition-all shadow-xs"
            title="Browse complete IEEE analog & digital component catalog"
          >
            <PlusCircle className="w-3.5 h-3.5 text-cyan-400" />
            <span>Full IEEE Catalog...</span>
          </button>
        </div>

        {/* Interaction Hint Banner */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-2 py-1 rounded-lg bg-slate-950/80 border border-slate-800/80 text-[10.5px] font-mono text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="text-cyan-400 font-bold">Drag &amp; Realign:</span>
            <span>Drag parts from palette or directly on locked board to reposition (no popup on drag)</span>
          </div>
          <div className="flex items-center gap-1 text-cyan-300 font-semibold">
            <span>Double-click any component to inspect properties &amp; telemetry</span>
          </div>
        </div>
      </div>

      {/* PINNED ALWAYS-SHOWN CIRCUIT BREADBOARD WORKSPACE (never moves up/down when instruments toggle) */}
      <div
        className={`${
          isCircuitPinned ? "sticky top-2 z-20 shadow-[0_18px_45px_rgba(0,0,0,0.65)]" : "relative"
        } bg-[#090f1d] border border-cyan-500/35 rounded-2xl p-3 space-y-2.5`}
      >
        {/* Always-Shown Laid Circuit Status & Quick-Jump Strip */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-2 py-1.5 rounded-xl bg-[#0f172a] border border-slate-800 text-xs font-mono">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-cyan-950/90 border border-cyan-500/40 text-cyan-300 font-bold text-[11px]">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              LAID CIRCUIT
              {circuitBounds.hasCircuit
                ? ` · Cols ${circuitBounds.minCol}–${circuitBounds.maxCol}`
                : " · Empty"}
            </span>
            {components.map((comp) => {
              const firstPin = Object.values(comp.pins)[0];
              const isSel = selectedComponentId === comp.id;
              return (
                <button
                  key={comp.id}
                  type="button"
                  onClick={() => {
                    setSelectedComponentId(comp.id);
                    handleFindCircuit();
                  }}
                  className={`px-2 py-0.5 rounded-lg border text-[10.5px] font-semibold cursor-pointer transition-colors ${
                    isSel
                      ? "bg-cyan-500/25 border-cyan-400 text-cyan-200"
                      : "bg-slate-900 border-slate-700 text-slate-300 hover:border-cyan-500/50 hover:text-white"
                  }`}
                  title={`Click to locate & select ${comp.label}`}
                >
                  {comp.label}
                  {firstPin ? ` @ ${formatCompactHole(firstPin)}` : ""}
                </button>
              );
            })}
            {wires.length > 0 && (
              <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] text-slate-400">
                +{wires.length} Jumper{wires.length > 1 ? "s" : ""}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {smartWiringToast && (
              <div className="px-2.5 py-0.5 rounded-lg bg-emerald-950/90 border border-emerald-500/50 text-[10.5px] text-emerald-200 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="truncate max-w-[260px]">{smartWiringToast}</span>
                <button
                  type="button"
                  onClick={() => setSmartWiringToast(null)}
                  className="text-emerald-400 hover:text-white cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => setHighlightCircuitZone((v) => !v)}
              className={`px-2 py-1 rounded-lg border text-[10.5px] font-bold cursor-pointer transition-colors ${
                highlightCircuitZone
                  ? "bg-cyan-500/20 border-cyan-400/60 text-cyan-200"
                  : "bg-slate-900 border-slate-700 text-slate-400"
              }`}
              title="Toggle glowing highlight box around the laid circuit"
            >
              Zone Box: {highlightCircuitZone ? "ON" : "OFF"}
            </button>
          </div>
        </div>

        {/* Interactive 3D & 2D Breadboard Stage */}
        <div
          className={`relative grid gap-4 ${
            workspaceViewMode === "SPLIT"
              ? "grid-cols-1 xl:grid-cols-2"
              : "grid-cols-1"
          }`}
        >
        {(workspaceViewMode === "3D" || workspaceViewMode === "SPLIT") && (
          <div className={workspaceViewMode === "3D" ? "h-[520px]" : "h-[480px]"}>
            <Breadboard3DViewport
              components={components}
              wires={wires}
              vSourceVal={vSourceVal}
              simRunning={simRunning}
              simFreqHz={simFreqHz}
              selectedWireColor={selectedWireColor}
              simResults={simResults}
              selectedComponentId={selectedComponentId}
              pendingWireStart={pendingWireStart}
              activeProbeToPlace={activeProbeToPlace}
              onSelectComponent={(compId) => {
                if (compId && activeAutoAttachTarget) {
                  setSelectedComponentId(compId);
                  executeAutoAttachToComponent(compId, activeAutoAttachTarget);
                  return;
                }
                setSelectedComponentId(compId);
                if (!compId) setIsPropertiesDrawerOpen(false);
              }}
              onDoubleClickComponent={(compId) => {
                setSelectedComponentId(compId);
                setIsPropertiesDrawerOpen(true);
              }}
              onHoleClick={handleHoleClick}
              onDropComponentAtHole={handleDropComponentAtHole}
              onMoveComponentToHole={handleMoveComponentToHole}
              onCancelPendingWire={() => setPendingWireStart(null)}
              onTogglePushButton={handleTogglePushButton}
              onStepPotentiometer={handleStepPotentiometer}
              isDmmActive={isDmmActive}
              probeRedHole={probeRedHole}
              probeBlackHole={probeBlackHole}
              isScopeActive={isScopeActive}
              probeScopeCh1Hole={probeScopeCh1Hole}
              probeScopeCh2Hole={probeScopeCh2Hole}
              isSigGenActive={isSigGenActive}
              sigGenHole={sigGenHole}
              holeToNetKey={holeToNetKey}
              isBoardLocked={isBoardLocked}
              pinViewEnabled={isCircuitPinned}
              onToggleBoardLock={() => setIsBoardLocked((v) => !v)}
              frameCircuitTrigger={frameCircuitTrigger}
              installedPmes={installedPmes}
              activePmeProbeLabel={
                activeAutoAttachTarget
                  ? `Auto-Attach ${
                      activeAutoAttachTarget.kind === "PME"
                        ? activeAutoAttachTarget.type.replace("_", " ")
                        : activeAutoAttachTarget.kind
                    }`
                  : activePmeProbePick
                  ? `${
                      installedPmes.find((p) => p.id === activePmeProbePick.pmeId)?.label || "PME"
                    } (${activePmeProbePick.terminal})`
                  : null
              }
            />
          </div>
        )}

        {/* Main Solderless Breadboard SVG Viewport (supports HTML5 Drag & Drop to coordinate sockets) */}
        <div
          ref={viewport2DRef}
          className={`relative w-full rounded-2xl border-2 border-[#26365c] bg-[#070b14] overflow-hidden shadow-2xl select-none ${
            isCircuitPinned ? "overscroll-contain" : ""
          } ${
            workspaceViewMode === "3D"
              ? "hidden"
              : workspaceViewMode === "2D"
              ? "h-[520px]"
              : "h-[480px]"
          }`}
          onPointerDown={handleSvgPointerDown}
          onPointerMove={handleSvgPointerMove}
          onPointerUp={handleSvgPointerUp}
          onDragOver={(e) => {
            if (!e.dataTransfer.types.includes("application/ist-bb-comp")) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = "copy";
            const pt = clientToSvgPoint(e.clientX, e.clientY);
            const nearest = svgXYToNearestHole(pt.x, pt.y);
            setDropPreviewHole2D(nearest);
          }}
          onDragLeave={() => {
            setDropPreviewHole2D(null);
          }}
          onDrop={(e) => {
            const raw = e.dataTransfer.getData("application/ist-bb-comp");
            setDropPreviewHole2D(null);
            if (!raw) return;
            e.preventDefault();
            try {
              const parsed = JSON.parse(raw) as { type: string; value: number };
              const pt = clientToSvgPoint(e.clientX, e.clientY);
              const nearest = svgXYToNearestHole(pt.x, pt.y);
              if (nearest) {
                handleDropComponentAtHole(parsed.type, parsed.value, nearest);
              } else {
                handleDropComponentAtHole(parsed.type, parsed.value, {
                  type: "TERMINAL",
                  col: 28,
                  row: "C",
                });
              }
            } catch {
              // ignore malformed payload
            }
          }}
        >
        {dropPreviewHole2D && (
          <div className="absolute top-3 left-3 z-20 pointer-events-none px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-400/70 text-[11px] font-mono text-emerald-200 shadow-lg">
            2D Drop Socket: <span className="font-bold text-white">{formatHoleLabel(dropPreviewHole2D)}</span>
            {" · "}
            <span className="text-cyan-300">
              Net {simResults.stripToSpiceName.get(holeToNetKey(dropPreviewHole2D)) || "NEW"}
            </span>
          </div>
        )}

        {activeAutoAttachTarget && (
          <div className="absolute top-3 right-3 z-20 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-cyan-950/95 border border-cyan-400/70 text-[11px] font-mono text-cyan-100 shadow-xl">
            <Link2 className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
            <span>
              <strong className="text-cyan-300">AUTO-ATTACH ARMED:</strong> Click any component or hole on the board to wire{" "}
              {activeAutoAttachTarget.kind === "PME"
                ? activeAutoAttachTarget.type.replace("_", " ")
                : activeAutoAttachTarget.kind}
            </span>
            <button
              type="button"
              onClick={() => setActiveAutoAttachTarget(null)}
              className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        )}
        <svg
          ref={svgRef}
          viewBox="0 0 1260 420"
          className="w-full h-full cursor-crosshair"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "center center",
          }}
        >
          <defs>
            {/* Breadboard Off-White Textured Plastic Surface */}
            <linearGradient id="bbPlastic" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f8fafc" />
              <stop offset="50%" stopColor="#f1f5f9" />
              <stop offset="100%" stopColor="#e2e8f0" />
            </linearGradient>

            {/* Inner Metallic Brass Spring Clip in Hole */}
            <radialGradient id="holeClip" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#090d16" />
              <stop offset="60%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#cbd5e1" />
            </radialGradient>

            {/* Component Drop Shadow */}
            <filter id="bbShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="2" dy="4" stdDeviation="3" floodColor="#000000" floodOpacity="0.5" />
            </filter>
          </defs>

          {/* 1. Solderless Breadboard Outer Plastic Body */}
          <rect
            data-bb-bg="true"
            x="20"
            y="12"
            width="1220"
            height="396"
            rx="12"
            fill="url(#bbPlastic)"
            stroke="#94a3b8"
            strokeWidth="2.5"
            filter="url(#bbShadow)"
            onClick={() => setIsPropertiesDrawerOpen(false)}
          />

          {/* Top Notch & Left/Right Dovetail Interlocking Tabs */}
          <path d="M 20 180 L 12 195 L 12 225 L 20 240 Z" fill="#cbd5e1" stroke="#94a3b8" />
          <path d="M 1240 180 L 1248 195 L 1248 225 L 1240 240 Z" fill="#cbd5e1" stroke="#94a3b8" />

          {/* 2. Red & Blue Continuous Power Rail Indicator Lines */}
          {/* Top Power Rails */}
          <line x1="45" y1="22" x2="1215" y2="22" stroke="#ef4444" strokeWidth="2.5" />
          <text x="35" y="25" fill="#ef4444" fontFamily="monospace" fontSize="13" fontWeight="bold">
            +
          </text>
          <text x="1225" y="25" fill="#ef4444" fontFamily="monospace" fontSize="13" fontWeight="bold">
            +
          </text>

          <line x1="45" y1="64" x2="1215" y2="64" stroke="#2563eb" strokeWidth="2.5" />
          <text x="35" y="67" fill="#2563eb" fontFamily="monospace" fontSize="14" fontWeight="bold">
            -
          </text>
          <text x="1225" y="67" fill="#2563eb" fontFamily="monospace" fontSize="14" fontWeight="bold">
            -
          </text>

          {/* Bottom Power Rails */}
          <line x1="45" y1="350" x2="1215" y2="350" stroke="#ef4444" strokeWidth="2.5" />
          <text x="35" y="353" fill="#ef4444" fontFamily="monospace" fontSize="13" fontWeight="bold">
            +
          </text>
          <text x="1225" y="353" fill="#ef4444" fontFamily="monospace" fontSize="13" fontWeight="bold">
            +
          </text>

          <line x1="45" y1="392" x2="1215" y2="392" stroke="#2563eb" strokeWidth="2.5" />
          <text x="35" y="395" fill="#2563eb" fontFamily="monospace" fontSize="14" fontWeight="bold">
            -
          </text>
          <text x="1225" y="395" fill="#2563eb" fontFamily="monospace" fontSize="14" fontWeight="bold">
            -
          </text>

          {/* 3. Center 0.3-inch DIP Divider Trough */}
          <rect x="25" y={TROUGH_Y} width="1210" height="16" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="1" />
          <text
            x="630"
            y={TROUGH_Y + 11}
            textAnchor="middle"
            fill="#64748b"
            fontFamily="monospace"
            fontSize="8.5"
            fontWeight="bold"
            letterSpacing="2px"
          >
            SOLDERLESS BREADBOARD · 830 TIE-POINTS · 2.54mm PITCH
          </text>

          {/* Row Letters Labeling: A, B, C, D, E (Top) and F, G, H, I, J (Bottom) */}
          {["A", "B", "C", "D", "E"].map((letter, i) => (
            <React.Fragment key={`lbl-${letter}`}>
              <text
                x="45"
                y={TERMINAL_A_Y + i * PITCH_Y + 4}
                fill="#64748b"
                fontFamily="monospace"
                fontSize="10"
                fontWeight="bold"
              >
                {letter}
              </text>
              <text
                x="1215"
                y={TERMINAL_A_Y + i * PITCH_Y + 4}
                fill="#64748b"
                fontFamily="monospace"
                fontSize="10"
                fontWeight="bold"
              >
                {letter}
              </text>
            </React.Fragment>
          ))}
          {["F", "G", "H", "I", "J"].map((letter, i) => (
            <React.Fragment key={`lbl-${letter}`}>
              <text
                x="45"
                y={TERMINAL_F_Y + i * PITCH_Y + 4}
                fill="#64748b"
                fontFamily="monospace"
                fontSize="10"
                fontWeight="bold"
              >
                {letter}
              </text>
              <text
                x="1215"
                y={TERMINAL_F_Y + i * PITCH_Y + 4}
                fill="#64748b"
                fontFamily="monospace"
                fontSize="10"
                fontWeight="bold"
              >
                {letter}
              </text>
            </React.Fragment>
          ))}

          {/* 4. Column Numbers (1, 5, 10, 15, ..., 63) */}
          {Array.from({ length: 63 }).map((_, i) => {
            const col = i + 1;
            const x = START_X + i * PITCH_X;
            if (col % 5 === 0 || col === 1 || col === 63) {
              return (
                <React.Fragment key={`col-num-${col}`}>
                  <text
                    x={x}
                    y={TERMINAL_A_Y - 14}
                    textAnchor="middle"
                    fill="#64748b"
                    fontFamily="monospace"
                    fontSize="9"
                    fontWeight="bold"
                  >
                    {col}
                  </text>
                  <text
                    x={x}
                    y={TERMINAL_F_Y + 5 * PITCH_Y + 6}
                    textAnchor="middle"
                    fill="#64748b"
                    fontFamily="monospace"
                    fontSize="9"
                    fontWeight="bold"
                  >
                    {col}
                  </text>
                </React.Fragment>
              );
            }
            return null;
          })}

          {/* 5. Breadboard Holes Grid (Top Rails, Terminal Strips, Bottom Rails) */}
          {Array.from({ length: 63 }).map((_, colIdx) => {
            const col = colIdx + 1;
            const x = START_X + colIdx * PITCH_X;

            return (
              <g key={`col-holes-${col}`}>
                {/* Top Power Rail Holes (+, -) */}
                <circle
                  cx={x}
                  cy={RAIL_TOP_POS_Y}
                  r="3.2"
                  fill="url(#holeClip)"
                  stroke="#334155"
                  strokeWidth="0.8"
                  className="hover:stroke-cyan-400 hover:scale-125 transition-transform"
                  onClick={() => handleHoleClick({ type: "RAIL", rail: "TOP_POS", col })}
                />
                <circle
                  cx={x}
                  cy={RAIL_TOP_NEG_Y}
                  r="3.2"
                  fill="url(#holeClip)"
                  stroke="#334155"
                  strokeWidth="0.8"
                  className="hover:stroke-cyan-400 hover:scale-125 transition-transform"
                  onClick={() => handleHoleClick({ type: "RAIL", rail: "TOP_NEG", col })}
                />

                {/* Upper Terminal Holes A to E */}
                {(["A", "B", "C", "D", "E"] as const).map((row, rowIdx) => (
                  <circle
                    key={`hole-${col}-${row}`}
                    cx={x}
                    cy={TERMINAL_A_Y + rowIdx * PITCH_Y}
                    r="3.2"
                    fill="url(#holeClip)"
                    stroke="#334155"
                    strokeWidth="0.8"
                    className="hover:stroke-cyan-400 hover:scale-125 transition-transform"
                    onClick={() => handleHoleClick({ type: "TERMINAL", col, row })}
                  />
                ))}

                {/* Lower Terminal Holes F to J */}
                {(["F", "G", "H", "I", "J"] as const).map((row, rowIdx) => (
                  <circle
                    key={`hole-${col}-${row}`}
                    cx={x}
                    cy={TERMINAL_F_Y + rowIdx * PITCH_Y}
                    r="3.2"
                    fill="url(#holeClip)"
                    stroke="#334155"
                    strokeWidth="0.8"
                    className="hover:stroke-cyan-400 hover:scale-125 transition-transform"
                    onClick={() => handleHoleClick({ type: "TERMINAL", col, row })}
                  />
                ))}

                {/* Bottom Power Rail Holes (+, -) */}
                <circle
                  cx={x}
                  cy={RAIL_BOT_POS_Y}
                  r="3.2"
                  fill="url(#holeClip)"
                  stroke="#334155"
                  strokeWidth="0.8"
                  className="hover:stroke-cyan-400 hover:scale-125 transition-transform"
                  onClick={() => handleHoleClick({ type: "RAIL", rail: "BOT_POS", col })}
                />
                <circle
                  cx={x}
                  cy={RAIL_BOT_NEG_Y}
                  r="3.2"
                  fill="url(#holeClip)"
                  stroke="#334155"
                  strokeWidth="0.8"
                  className="hover:stroke-cyan-400 hover:scale-125 transition-transform"
                  onClick={() => handleHoleClick({ type: "RAIL", rail: "BOT_NEG", col })}
                />
              </g>
            );
          })}

          {/* 6. Render Placed Physical & IEEE Standard Components on the Breadboard */}
          {components.map((comp) => {
            const isSelected = selectedComponentId === comp.id;

            // 1. RESISTOR (IEEE Std 315 sharp zig-zag / Standard 1/4W Axial Body)
            if (comp.type === "RESISTOR") {
              const p1 = getHoleCoords(comp.pins.T1);
              const p2 = getHoleCoords(comp.pins.T2);
              const bands = calculateResistorColorBands(comp.value);
              const midX = (p1.x + p2.x) / 2;
              const midY = (p1.y + p2.y) / 2;
              const dx = p2.x - p1.x;
              const dy = p2.y - p1.y;
              const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
              const isSchematic = ieeeViewMode === "IEEE_SCHEMATIC";

              return (
                <g
                  key={comp.id}
                  filter="url(#bbShadow)"
                  className="cursor-grab active:cursor-grabbing select-none group"
                  onPointerDown={(e) => handleCompPointerDown(comp, e)}
                  onDoubleClick={(e) => handleCompDoubleClick(comp, e)}
                >
                  {/* Lead Wires connecting tie-point holes to component */}
                  <line x1={p1.x} y1={p1.y} x2={midX - (dx * 0.28)} y2={midY - (dy * 0.28)} stroke="#94a3b8" strokeWidth="2.4" strokeLinecap="round" />
                  <line x1={p2.x} y1={p2.y} x2={midX + (dx * 0.28)} y2={midY + (dy * 0.28)} stroke="#94a3b8" strokeWidth="2.4" strokeLinecap="round" />
                  {/* Tie-Point Terminal Solder Insertion Pins */}
                  <circle cx={p1.x} cy={p1.y} r="3.2" fill="#cbd5e1" stroke="#334155" strokeWidth="1" />
                  <circle cx={p2.x} cy={p2.y} r="3.2" fill="#cbd5e1" stroke="#334155" strokeWidth="1" />

                  {/* Component Body */}
                  <g transform={`translate(${midX}, ${midY}) rotate(${angleDeg})`}>
                    {isSchematic ? (
                      /* Pure IEEE 315 Standard Schematic Zig-Zag Symbol */
                      <g>
                        <line x1="-28" y1="0" x2="-18" y2="0" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />
                        <path
                          d="M -18 0 L -14 -7 L -7 7 L 0 -7 L 7 7 L 14 -7 L 18 0"
                          fill="none"
                          stroke="#38bdf8"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <line x1="18" y1="0" x2="28" y2="0" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />
                      </g>
                    ) : (
                      /* IEEE Standard 1/4W Physical Axial Packaging with EIA Bands & IEEE Symbol */
                      <g>
                        {/* Axial Lead Extensions */}
                        <line x1="-36" y1="0" x2="-18" y2="0" stroke="#94a3b8" strokeWidth="2.2" strokeLinecap="round" />
                        <line x1="18" y1="0" x2="36" y2="0" stroke="#94a3b8" strokeWidth="2.2" strokeLinecap="round" />

                        {/* Standard 1/4W Ceramic Dumbbell Body (6.3mm x 2.3mm) */}
                        <rect x="-18" y="-6.5" width="36" height="13" rx="3.5" fill="#d97706" stroke="#b45309" strokeWidth="1" />

                        {ieeeViewMode === "HYBRID" ? (
                          <>
                            {/* EIA Bands Base */}
                            <rect x="-12" y="-6.5" width="3" height="13" fill={bands.band1.color} opacity="0.65" />
                            <rect x="-6" y="-6.5" width="3" height="13" fill={bands.band2.color} opacity="0.65" />
                            <rect x="0" y="-6.5" width="3" height="13" fill={bands.band3.color} opacity="0.65" />
                            <rect x="8" y="-6.5" width="3" height="13" fill={bands.band4.color} opacity="0.65" />
                            {/* Embossed IEEE 315 Sharp Zig-Zag Glyph */}
                            <path
                              d="M -15 0 L -11 -3.8 L -5 3.8 L 1 -3.8 L 7 3.8 L 11 -3.8 L 15 0"
                              fill="none"
                              stroke="#ffffff"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </>
                        ) : (
                          /* Pure Packaging EIA Color Bands */
                          <>
                            <rect x="-12" y="-6.5" width="3.2" height="13" fill={bands.band1.color} />
                            <rect x="-6" y="-6.5" width="3.2" height="13" fill={bands.band2.color} />
                            <rect x="0" y="-6.5" width="3.2" height="13" fill={bands.band3.color} />
                            <rect x="8" y="-6.5" width="3.2" height="13" fill={bands.band4.color} />
                          </>
                        )}
                      </g>
                    )}

                    {/* Component Value & Designator Label */}
                    <text
                      x="0"
                      y="-10"
                      textAnchor="middle"
                      fill={isSelected ? "#0284c7" : "#0f172a"}
                      fontFamily="monospace"
                      fontSize="8.5"
                      fontWeight="bold"
                    >
                      {comp.formattedValue}
                    </text>
                  </g>

                  {/* Pure IEEE Standard Rectangular Selection Indicator */}
                  {isSelected && renderIeeeSelectionBox(midX, midY, 56, 28, comp.formattedValue)}
                </g>
              );
            }

            // 2. LEDS (IEEE Std 315 Optoelectronic Diode & 5mm Diffused Package)
            if (comp.type.startsWith("LED_")) {
              const pA = getHoleCoords(comp.pins.ANODE);
              const pK = getHoleCoords(comp.pins.CATHODE);
              const isRed = comp.type.includes("RED");
              const isGreen = comp.type.includes("GREEN");
              const ledColor = isRed ? "#ef4444" : isGreen ? "#22c55e" : "#3b82f6";
              const current = simResults.currentMap.get(comp.id) ?? 0;
              const isLit = current > 1.0;
              const midX = (pA.x + pK.x) / 2;
              const midY = (pA.y + pK.y) / 2 - 12;
              const isSchematic = ieeeViewMode === "IEEE_SCHEMATIC";

              return (
                <g
                  key={comp.id}
                  filter="url(#bbShadow)"
                  className="cursor-grab active:cursor-grabbing select-none group"
                  onPointerDown={(e) => handleCompPointerDown(comp, e)}
                  onDoubleClick={(e) => handleCompDoubleClick(comp, e)}
                >
                  {/* Terminal leads into breadboard holes */}
                  <line x1={pA.x} y1={pA.y} x2={midX - 5} y2={midY + 10} stroke="#94a3b8" strokeWidth="2.2" />
                  <line x1={pK.x} y1={pK.y} x2={midX + 5} y2={midY + 10} stroke="#94a3b8" strokeWidth="2.2" />
                  <circle cx={pA.x} cy={pA.y} r="3" fill="#cbd5e1" stroke="#334155" />
                  <circle cx={pK.x} cy={pK.y} r="3" fill="#cbd5e1" stroke="#334155" />

                  {isSchematic ? (
                    /* Pure IEEE 315 Optoelectronic Diode Schematic Symbol */
                    <g transform={`translate(${midX}, ${midY})`}>
                      {/* Anode triangle pointing to cathode bar */}
                      <polygon points="-8,-6 -8,6 4,0" fill={isLit ? ledColor : "none"} stroke={ledColor} strokeWidth="1.8" />
                      <line x1="4" y1="-7" x2="4" y2="7" stroke={ledColor} strokeWidth="2.2" />
                      {/* IEEE Outward Photon Emission Arrows */}
                      <line x1="-1" y1="-8" x2="7" y2="-16" stroke={isLit ? "#ffffff" : ledColor} strokeWidth="1.5" />
                      <polygon points="7,-16 3,-15 6,-12" fill={isLit ? "#ffffff" : ledColor} />
                      <line x1="4" y1="-5" x2="12" y2="-13" stroke={isLit ? "#ffffff" : ledColor} strokeWidth="1.5" />
                      <polygon points="12,-13 8,-12 11,-9" fill={isLit ? "#ffffff" : ledColor} />
                      <text x="-12" y="10" fill="#22c55e" fontSize="7" fontWeight="bold">+</text>
                      <text x="8" y="10" fill="#94a3b8" fontSize="7" fontWeight="bold">-</text>
                    </g>
                  ) : (
                    /* IEEE Standard 5mm Diffused Package with Cathode Flat Edge Notch & Photon Arrows */
                    <g>
                      {/* 5mm Dome Cylinder */}
                      <circle cx={midX} cy={midY} r="10" fill={isLit ? ledColor : "#1e293b"} stroke="#475569" strokeWidth="1.2" />
                      {/* Cathode Flat Edge Notch */}
                      <line x1={midX + 7} y1={midY - 7} x2={midX + 7} y2={midY + 7} stroke="#334155" strokeWidth="2.4" />
                      {/* IEEE Optoelectronic Radiating Arrows */}
                      <path d={`M ${midX + 4} ${midY - 8} L ${midX + 11} ${midY - 15}`} stroke={isLit ? "#ffffff" : "#94a3b8"} strokeWidth="1.4" />
                      <polygon points={`${midX + 11},${midY - 15} ${midX + 7},${midY - 14} ${midX + 10},${midY - 11}`} fill={isLit ? "#ffffff" : "#94a3b8"} />
                      <path d={`M ${midX + 8} ${midY - 4} L ${midX + 15} ${midY - 11}`} stroke={isLit ? "#ffffff" : "#94a3b8"} strokeWidth="1.4" />
                      <polygon points={`${midX + 15},${midY - 11} ${midX + 11},${midY - 10} ${midX + 14},${midY - 7}`} fill={isLit ? "#ffffff" : "#94a3b8"} />
                      {/* Emissive Halo on current conduction */}
                      {isLit && (
                        <circle cx={midX} cy={midY} r="18" fill={ledColor} opacity="0.45" />
                      )}
                    </g>
                  )}

                  <text x={midX} y={midY - 18} textAnchor="middle" fill="#0f172a" fontFamily="monospace" fontSize="8" fontWeight="bold">
                    {comp.label} {isLit ? `(${current.toFixed(1)}mA)` : ""}
                  </text>
                  {isSelected && renderIeeeSelectionBox(midX, midY, 40, 32, comp.label)}
                </g>
              );
            }

            // 3. DIODES (IEEE Std 315 Rectifier / Zener / Schottky)
            if (
              comp.type === "DIODE_1N4007" ||
              comp.type === "DIODE_ZENER" ||
              comp.type === "DIODE_1N5819"
            ) {
              const pA = getHoleCoords(comp.pins.ANODE || comp.pins.T1);
              const pK = getHoleCoords(comp.pins.CATHODE || comp.pins.T2);
              const midX = (pA.x + pK.x) / 2;
              const midY = (pA.y + pK.y) / 2;
              const dx = pK.x - pA.x;
              const dy = pK.y - pA.y;
              const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
              const isSchematic = ieeeViewMode === "IEEE_SCHEMATIC";
              const isZener = comp.type === "DIODE_ZENER";
              const isSchottky = comp.type === "DIODE_1N5819";
              const shortLbl = isZener ? `${comp.value || 5.1}V` : isSchottky ? "1N5819" : "1N4007";

              return (
                <g
                  key={comp.id}
                  filter="url(#bbShadow)"
                  className="cursor-grab active:cursor-grabbing select-none group"
                  onPointerDown={(e) => handleCompPointerDown(comp, e)}
                  onDoubleClick={(e) => handleCompDoubleClick(comp, e)}
                >
                  <circle cx={pA.x} cy={pA.y} r="3" fill="#cbd5e1" stroke="#334155" />
                  <circle cx={pK.x} cy={pK.y} r="3" fill="#cbd5e1" stroke="#334155" />

                  <g transform={`translate(${midX}, ${midY}) rotate(${angleDeg})`}>
                    {isSchematic ? (
                      <g>
                        <line x1="-24" y1="0" x2="-8" y2="0" stroke={isZener ? "#f97316" : "#38bdf8"} strokeWidth="2.2" strokeLinecap="round" />
                        <polygon points="-8,-7 -8,7 4,0" fill={isZener ? "#f97316" : "#38bdf8"} stroke={isZener ? "#f97316" : "#38bdf8"} />
                        {isZener ? (
                          <polyline points="1,-9 5,-7 5,7 9,9" fill="none" stroke="#f97316" strokeWidth="2.2" />
                        ) : isSchottky ? (
                          <polyline points="2,-7 5,-7 5,7 8,7" fill="none" stroke="#38bdf8" strokeWidth="2.2" />
                        ) : (
                          <line x1="5" y1="-7" x2="5" y2="7" stroke="#38bdf8" strokeWidth="2.5" />
                        )}
                        <line x1="5" y1="0" x2="24" y2="0" stroke={isZener ? "#f97316" : "#38bdf8"} strokeWidth="2.2" strokeLinecap="round" />
                      </g>
                    ) : (
                      <g>
                        <line x1="-30" y1="0" x2="-16" y2="0" stroke="#94a3b8" strokeWidth="2.2" strokeLinecap="round" />
                        <line x1="16" y1="0" x2="30" y2="0" stroke="#94a3b8" strokeWidth="2.2" strokeLinecap="round" />
                        <rect x="-16" y="-6.5" width="32" height="13" rx="2" fill={isZener ? "#ea580c" : "#090d16"} stroke="#334155" strokeWidth="1" />
                        <rect x="7" y="-6.5" width="6" height="13" fill={isZener ? "#0f172a" : isSchottky ? "#facc15" : "#cbd5e1"} />
                        <polygon points="-8,-4 -8,4 2,0" fill="#ffffff" />
                        <line x1="3" y1="-4" x2="3" y2="4" stroke="#ffffff" strokeWidth="1.6" />
                      </g>
                    )}

                    <text x="0" y="-9" textAnchor="middle" fill="#0f172a" fontFamily="monospace" fontSize="8" fontWeight="bold">
                      {shortLbl}
                    </text>
                  </g>
                  {isSelected && renderIeeeSelectionBox(midX, midY, 52, 26, shortLbl)}
                </g>
              );
            }

            // 3b. INDUCTOR (IEEE Std 315 Air/Ferrite Loops)
            if (comp.type === "INDUCTOR") {
              const p1 = getHoleCoords(comp.pins.T1);
              const p2 = getHoleCoords(comp.pins.T2);
              const midX = (p1.x + p2.x) / 2;
              const midY = (p1.y + p2.y) / 2;
              const angleDeg = (Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180) / Math.PI;
              const isSchematic = ieeeViewMode === "IEEE_SCHEMATIC";
              return (
                <g
                  key={comp.id}
                  filter="url(#bbShadow)"
                  className="cursor-grab active:cursor-grabbing select-none group"
                  onPointerDown={(e) => handleCompPointerDown(comp, e)}
                  onDoubleClick={(e) => handleCompDoubleClick(comp, e)}
                >
                  <circle cx={p1.x} cy={p1.y} r="3" fill="#cbd5e1" stroke="#334155" />
                  <circle cx={p2.x} cy={p2.y} r="3" fill="#cbd5e1" stroke="#334155" />
                  <g transform={`translate(${midX}, ${midY}) rotate(${angleDeg})`}>
                    <line x1="-30" y1="0" x2="-16" y2="0" stroke={isSchematic ? "#38bdf8" : "#94a3b8"} strokeWidth="2.2" />
                    <line x1="16" y1="0" x2="30" y2="0" stroke={isSchematic ? "#38bdf8" : "#94a3b8"} strokeWidth="2.2" />
                    {isSchematic ? (
                      <path
                        d="M -16 0 A 4 5 0 0 1 -8 0 A 4 5 0 0 1 0 0 A 4 5 0 0 1 8 0 A 4 5 0 0 1 16 0"
                        fill="none"
                        stroke="#38bdf8"
                        strokeWidth="2.3"
                      />
                    ) : (
                      <g>
                        <rect x="-16" y="-6" width="32" height="12" rx="3" fill="#1e293b" stroke="#475569" />
                        {[-10, -4, 2, 8].map((wx) => (
                          <line key={wx} x1={wx} y1="-6" x2={wx + 2} y2="6" stroke="#d97706" strokeWidth="2.5" />
                        ))}
                      </g>
                    )}
                    <text x="0" y="-9" textAnchor="middle" fill="#0f172a" fontFamily="monospace" fontSize="8" fontWeight="bold">
                      {comp.label}
                    </text>
                  </g>
                  {isSelected && renderIeeeSelectionBox(midX, midY, 54, 26, comp.label)}
                </g>
              );
            }

            // 3c. LDR PHOTORESISTOR (IEEE Std 315 Light-Dependent Resistor)
            if (comp.type === "LDR") {
              const p1 = getHoleCoords(comp.pins.T1);
              const p2 = getHoleCoords(comp.pins.T2);
              const midX = (p1.x + p2.x) / 2;
              const midY = (p1.y + p2.y) / 2 - 8;
              const isSchematic = ieeeViewMode === "IEEE_SCHEMATIC";
              return (
                <g
                  key={comp.id}
                  filter="url(#bbShadow)"
                  className="cursor-grab active:cursor-grabbing select-none group"
                  onPointerDown={(e) => handleCompPointerDown(comp, e)}
                  onDoubleClick={(e) => handleCompDoubleClick(comp, e)}
                >
                  <line x1={p1.x} y1={p1.y} x2={midX - 5} y2={midY + 8} stroke="#94a3b8" strokeWidth="1.8" />
                  <line x1={p2.x} y1={p2.y} x2={midX + 5} y2={midY + 8} stroke="#94a3b8" strokeWidth="1.8" />
                  <circle cx={p1.x} cy={p1.y} r="3" fill="#cbd5e1" stroke="#334155" />
                  <circle cx={p2.x} cy={p2.y} r="3" fill="#cbd5e1" stroke="#334155" />
                  <g transform={`translate(${midX}, ${midY})`}>
                    {isSchematic ? (
                      <g>
                        <path d="M -12 0 L -8 -4 L -4 4 L 0 -4 L 4 4 L 8 -4 L 12 0" fill="none" stroke="#f59e0b" strokeWidth="2" />
                        <line x1="-10" y1="-12" x2="-4" y2="-6" stroke="#fbbf24" strokeWidth="1.5" />
                        <line x1="-3" y1="-12" x2="3" y2="-6" stroke="#fbbf24" strokeWidth="1.5" />
                      </g>
                    ) : (
                      <g>
                        <circle cx="0" cy="0" r="10" fill="#f59e0b" stroke="#b45309" strokeWidth="1.2" />
                        <path d="M -6 -2 Q 0 3 6 -2 M -6 3 Q 0 -2 6 3" fill="none" stroke="#991b1b" strokeWidth="1.4" />
                      </g>
                    )}
                    <text x="0" y="-14" textAnchor="middle" fill="#0f172a" fontFamily="monospace" fontSize="8" fontWeight="bold">
                      LDR
                    </text>
                  </g>
                  {isSelected && renderIeeeSelectionBox(midX, midY, 34, 28, "LDR")}
                </g>
              );
            }

            // 3d. PIEZO BUZZER (IEEE Std 315 Acoustic Transducer)
            if (comp.type === "BUZZER") {
              const p1 = getHoleCoords(comp.pins.ANODE || comp.pins.T1);
              const p2 = getHoleCoords(comp.pins.CATHODE || comp.pins.T2);
              const midX = (p1.x + p2.x) / 2;
              const midY = (p1.y + p2.y) / 2 - 10;
              const isSchematic = ieeeViewMode === "IEEE_SCHEMATIC";
              return (
                <g
                  key={comp.id}
                  filter="url(#bbShadow)"
                  className="cursor-grab active:cursor-grabbing select-none group"
                  onPointerDown={(e) => handleCompPointerDown(comp, e)}
                  onDoubleClick={(e) => handleCompDoubleClick(comp, e)}
                >
                  <line x1={p1.x} y1={p1.y} x2={midX - 5} y2={midY + 10} stroke="#94a3b8" strokeWidth="1.8" />
                  <line x1={p2.x} y1={p2.y} x2={midX + 5} y2={midY + 10} stroke="#94a3b8" strokeWidth="1.8" />
                  <circle cx={p1.x} cy={p1.y} r="3" fill="#cbd5e1" stroke="#334155" />
                  <circle cx={p2.x} cy={p2.y} r="3" fill="#cbd5e1" stroke="#334155" />
                  <g transform={`translate(${midX}, ${midY})`}>
                    {isSchematic ? (
                      <path d="M -8 -6 L -8 6 L -2 6 L 6 10 L 6 -10 L -2 -6 Z" fill="rgba(56,189,248,0.18)" stroke="#38bdf8" strokeWidth="1.8" />
                    ) : (
                      <g>
                        <circle cx="0" cy="0" r="12" fill="#18181b" stroke="#475569" strokeWidth="1.2" />
                        <circle cx="0" cy="0" r="3" fill="#64748b" />
                      </g>
                    )}
                    <text x="0" y="-15" textAnchor="middle" fill="#0f172a" fontFamily="monospace" fontSize="8" fontWeight="bold">
                      BUZZER
                    </text>
                  </g>
                  {isSelected && renderIeeeSelectionBox(midX, midY, 36, 32, "BUZZER")}
                </g>
              );
            }

            // 4. ELECTROLYTIC CAPACITOR (IEEE Std 315 Polarized Symbol & Radial Can)
            if (comp.type === "CAP_ELECTROLYTIC") {
              const pA = getHoleCoords(comp.pins.ANODE || comp.pins.T1);
              const pK = getHoleCoords(comp.pins.CATHODE || comp.pins.T2);
              const midX = (pA.x + pK.x) / 2;
              const midY = (pA.y + pK.y) / 2 - 10;
              const isSchematic = ieeeViewMode === "IEEE_SCHEMATIC";

              return (
                <g
                  key={comp.id}
                  filter="url(#bbShadow)"
                  className="cursor-grab active:cursor-grabbing select-none group"
                  onPointerDown={(e) => handleCompPointerDown(comp, e)}
                  onDoubleClick={(e) => handleCompDoubleClick(comp, e)}
                >
                  <line x1={pA.x} y1={pA.y} x2={midX - 4} y2={midY + 10} stroke="#94a3b8" strokeWidth="2" />
                  <line x1={pK.x} y1={pK.y} x2={midX + 4} y2={midY + 10} stroke="#94a3b8" strokeWidth="2" />
                  <circle cx={pA.x} cy={pA.y} r="3" fill="#cbd5e1" stroke="#334155" />
                  <circle cx={pK.x} cy={pK.y} r="3" fill="#cbd5e1" stroke="#334155" />

                  {isSchematic ? (
                    <g transform={`translate(${midX}, ${midY})`}>
                      <line x1="-5" y1="-8" x2="-5" y2="8" stroke="#38bdf8" strokeWidth="2.8" strokeLinecap="round" />
                      <path d="M 5 -8 Q 1 0 5 8" stroke="#38bdf8" strokeWidth="2.8" strokeLinecap="round" fill="none" />
                      <text x="-12" y="-3" fill="#38bdf8" fontSize="8" fontWeight="bold">+</text>
                    </g>
                  ) : (
                    <g>
                      <circle cx={midX} cy={midY} r="11" fill="#1e293b" stroke="#475569" strokeWidth="1.2" />
                      <path d={`M ${midX + 5} ${midY - 10} A 11 11 0 0 1 ${midX + 5} ${midY + 10}`} stroke="#ffffff" strokeWidth="4" fill="none" />
                      <text x={midX + 8} y={midY + 3} fill="#0f172a" fontSize="7" fontWeight="bold">-</text>
                      <line x1={midX - 5} y1={midY - 4} x2={midX - 5} y2={midY + 4} stroke="#38bdf8" strokeWidth="1.6" />
                      <path d={`M ${midX - 1} ${midY - 4} Q ${midX + 2} ${midY} ${midX - 1} ${midY + 4}`} stroke="#38bdf8" strokeWidth="1.6" fill="none" />
                    </g>
                  )}

                  <text x={midX} y={midY - 15} textAnchor="middle" fill="#0f172a" fontFamily="monospace" fontSize="8" fontWeight="bold">
                    {comp.formattedValue || "10µF"}
                  </text>
                  {isSelected && renderIeeeSelectionBox(midX, midY, 36, 30, comp.formattedValue || "10µF")}
                </g>
              );
            }

            // 5. CERAMIC CAPACITOR (IEEE Std 315 Non-Polarized Plates & 5mm Disc)
            if (comp.type === "CAP_CERAMIC") {
              const p1 = getHoleCoords(comp.pins.T1 || comp.pins.ANODE);
              const p2 = getHoleCoords(comp.pins.T2 || comp.pins.CATHODE);
              const midX = (p1.x + p2.x) / 2;
              const midY = (p1.y + p2.y) / 2 - 8;
              const isSchematic = ieeeViewMode === "IEEE_SCHEMATIC";

              return (
                <g
                  key={comp.id}
                  filter="url(#bbShadow)"
                  className="cursor-grab active:cursor-grabbing select-none group"
                  onPointerDown={(e) => handleCompPointerDown(comp, e)}
                  onDoubleClick={(e) => handleCompDoubleClick(comp, e)}
                >
                  <line x1={p1.x} y1={p1.y} x2={midX - 4} y2={midY + 8} stroke="#94a3b8" strokeWidth="1.8" />
                  <line x1={p2.x} y1={p2.y} x2={midX + 4} y2={midY + 8} stroke="#94a3b8" strokeWidth="1.8" />
                  <circle cx={p1.x} cy={p1.y} r="3" fill="#cbd5e1" stroke="#334155" />
                  <circle cx={p2.x} cy={p2.y} r="3" fill="#cbd5e1" stroke="#334155" />

                  {isSchematic ? (
                    <g transform={`translate(${midX}, ${midY})`}>
                      <line x1="-3" y1="-8" x2="-3" y2="8" stroke="#38bdf8" strokeWidth="2.8" strokeLinecap="round" />
                      <line x1="3" y1="-8" x2="3" y2="8" stroke="#38bdf8" strokeWidth="2.8" strokeLinecap="round" />
                    </g>
                  ) : (
                    <g>
                      <circle cx={midX} cy={midY} r="9" fill="#ea580c" stroke="#c2410c" strokeWidth="1" />
                      <line x1={midX - 3} y1={midY - 3} x2={midX - 3} y2={midY + 3} stroke="#ffffff" strokeWidth="1.6" />
                      <line x1={midX + 1} y1={midY - 3} x2={midX + 1} y2={midY + 3} stroke="#ffffff" strokeWidth="1.6" />
                    </g>
                  )}

                  <text x={midX} y={midY - 12} textAnchor="middle" fill="#0f172a" fontFamily="monospace" fontSize="8" fontWeight="bold">
                    {comp.formattedValue || "100nF"}
                  </text>
                  {isSelected && renderIeeeSelectionBox(midX, midY, 32, 26, comp.formattedValue || "100nF")}
                </g>
              );
            }

            // 6. TRANSISTORS & VOLTAGE REGULATOR (BJT NPN/PNP, N-MOSFET, LM7805)
            if (
              comp.type === "BJT_BC547" ||
              comp.type === "BJT_BC557" ||
              comp.type === "TRANSISTOR_2N2222" ||
              comp.type === "MOSFET_IRF540N" ||
              comp.type === "IC_LM7805"
            ) {
              const pinVals = Object.values(comp.pins).map(getHoleCoords);
              const p1 = pinVals[0];
              const p2 = pinVals[1] || p1;
              const p3 = pinVals[2] || p2;
              const midX = p2.x;
              const midY = p2.y - 12;
              const isSchematic = ieeeViewMode === "IEEE_SCHEMATIC";
              const isPnp = comp.type === "BJT_BC557";
              const isMosfet = comp.type === "MOSFET_IRF540N";
              const isReg = comp.type === "IC_LM7805";
              const shortLbl = isReg
                ? "LM7805"
                : isMosfet
                ? "IRF540N"
                : isPnp
                ? "BC557"
                : comp.type === "BJT_BC547"
                ? "BC547"
                : "2N2222";

              return (
                <g
                  key={comp.id}
                  filter="url(#bbShadow)"
                  className="cursor-grab active:cursor-grabbing select-none group"
                  onPointerDown={(e) => handleCompPointerDown(comp, e)}
                  onDoubleClick={(e) => handleCompDoubleClick(comp, e)}
                >
                  <line x1={p1.x} y1={p1.y} x2={midX - 7} y2={midY + 8} stroke="#94a3b8" strokeWidth="1.8" />
                  <line x1={p2.x} y1={p2.y} x2={midX} y2={midY + 8} stroke="#94a3b8" strokeWidth="1.8" />
                  <line x1={p3.x} y1={p3.y} x2={midX + 7} y2={midY + 8} stroke="#94a3b8" strokeWidth="1.8" />
                  <circle cx={p1.x} cy={p1.y} r="2.8" fill="#cbd5e1" stroke="#334155" />
                  <circle cx={p2.x} cy={p2.y} r="2.8" fill="#cbd5e1" stroke="#334155" />
                  <circle cx={p3.x} cy={p3.y} r="2.8" fill="#cbd5e1" stroke="#334155" />

                  {isSchematic ? (
                    isReg ? (
                      <g transform={`translate(${midX}, ${midY})`}>
                        <rect x="-15" y="-9" width="30" height="18" rx="2" fill="#090d16" stroke="#f59e0b" strokeWidth="1.8" />
                        <text x="0" y="3" textAnchor="middle" fill="#fcd34d" fontSize="6.5" fontWeight="bold">7805</text>
                      </g>
                    ) : isMosfet ? (
                      <g transform={`translate(${midX}, ${midY})`}>
                        <line x1="-12" y1="6" x2="-6" y2="6" stroke="#a855f7" strokeWidth="1.8" />
                        <line x1="-6" y1="-7" x2="-6" y2="7" stroke="#a855f7" strokeWidth="1.8" />
                        <line x1="-2" y1="-7" x2="-2" y2="-3" stroke="#a855f7" strokeWidth="2" />
                        <line x1="-2" y1="-1" x2="-2" y2="2" stroke="#a855f7" strokeWidth="2" />
                        <line x1="-2" y1="4" x2="-2" y2="7" stroke="#a855f7" strokeWidth="2" />
                        <line x1="-2" y1="-5" x2="8" y2="-5" stroke="#a855f7" strokeWidth="1.8" />
                        <line x1="-2" y1="6" x2="8" y2="6" stroke="#a855f7" strokeWidth="1.8" />
                      </g>
                    ) : (
                      <g transform={`translate(${midX}, ${midY})`}>
                        <line x1="-5" y1="-8" x2="-5" y2="8" stroke="#38bdf8" strokeWidth="2.5" />
                        <line x1="-12" y1="0" x2="-5" y2="0" stroke="#38bdf8" strokeWidth="1.8" />
                        <line x1="-5" y1="-4" x2="7" y2="-9" stroke="#38bdf8" strokeWidth="1.8" />
                        <line x1="-5" y1="4" x2="7" y2="9" stroke="#38bdf8" strokeWidth="1.8" />
                        {isPnp ? (
                          <polygon points="-4,4 2,5 0,9" fill="#f43f5e" />
                        ) : (
                          <polygon points="7,9 1,6 3,11" fill="#38bdf8" />
                        )}
                      </g>
                    )
                  ) : (
                    <g>
                      <path
                        d={`M ${midX - 12} ${midY + 7} L ${midX + 12} ${midY + 7} A 12 12 0 0 0 ${midX - 12} ${midY + 7} Z`}
                        fill="#0f172a"
                        stroke="#475569"
                        strokeWidth="1.2"
                      />
                    </g>
                  )}

                  <text x={midX} y={midY - 16} textAnchor="middle" fill="#0f172a" fontFamily="monospace" fontSize="8" fontWeight="bold">
                    {shortLbl}
                  </text>
                  {isSelected && renderIeeeSelectionBox(midX, midY, 38, 34, shortLbl)}
                </g>
              );
            }

            // 7. 7-SEGMENT DISPLAY & DIP IC PACKAGES (DIP-8, DIP-10, DIP-14, DIP-16 Straddling Center Divider)
            if (comp.type === "SEVEN_SEG" || comp.type.startsWith("IC_")) {
              const p1 = getHoleCoords(
                comp.pins.PIN1_GND ||
                  comp.pins.PIN1_1CLK ||
                  comp.pins.PIN1 ||
                  comp.pins.SEG_G ||
                  Object.values(comp.pins)[0]
              );
              const pinCols = new Set(Object.values(comp.pins).map((h) => h.col)).size;
              const chipWidth = Math.max(PITCH_X * 3 + 12, PITCH_X * Math.max(1, pinCols - 1) + 12);
              const is7Seg = comp.type === "SEVEN_SEG";
              const is741 = comp.type === "IC_LM741";
              const is74xx = comp.type.startsWith("IC_74LS");
              const isSchematic = ieeeViewMode === "IEEE_SCHEMATIC";
              const icText = is7Seg
                ? "7-SEG"
                : comp.type === "IC_LM741"
                ? "LM741CN"
                : comp.type === "IC_NE555"
                ? "NE555P"
                : comp.type.replace("IC_", "SN");

              return (
                <g
                  key={comp.id}
                  filter="url(#bbShadow)"
                  className="cursor-grab active:cursor-grabbing select-none group"
                  onPointerDown={(e) => handleCompPointerDown(comp, e)}
                  onDoubleClick={(e) => handleCompDoubleClick(comp, e)}
                >
                  <rect
                    x={p1.x - 6}
                    y={p1.y - 4}
                    width={chipWidth}
                    height={TROUGH_Y - p1.y + 36}
                    rx="3.5"
                    fill={isSchematic ? "#090d16" : "#18181b"}
                    stroke={is7Seg ? "#ef4444" : isSchematic ? "#0284c7" : "#475569"}
                    strokeWidth={isSchematic ? "1.8" : "1.2"}
                  />
                  <path d={`M ${p1.x - 6} ${TROUGH_Y + 4} A 4 4 0 0 0 ${p1.x - 6} ${TROUGH_Y + 12} Z`} fill="#090d16" />
                  <circle cx={p1.x + 2} cy={p1.y + 4} r="2" fill="#71717a" />

                  {is741 && (
                    <polygon
                      points={`${p1.x + chipWidth / 2 - 12},${TROUGH_Y - 2} ${p1.x + chipWidth / 2 - 12},${TROUGH_Y + 18} ${p1.x + chipWidth / 2 + 12},${TROUGH_Y + 8}`}
                      fill="rgba(56, 189, 248, 0.15)"
                      stroke="#38bdf8"
                      strokeWidth="1.6"
                    />
                  )}

                  {is74xx && (
                    <path
                      d={`M ${p1.x + chipWidth / 2 - 10} ${TROUGH_Y} L ${p1.x + chipWidth / 2} ${TROUGH_Y} A 8 8 0 0 1 ${p1.x + chipWidth / 2} ${TROUGH_Y + 16} L ${p1.x + chipWidth / 2 - 10} ${TROUGH_Y + 16} Z`}
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth="1.4"
                    />
                  )}

                  <text
                    x={p1.x + chipWidth / 2 - 6}
                    y={TROUGH_Y + 10}
                    textAnchor="middle"
                    fill={is7Seg ? "#fca5a5" : "#f8fafc"}
                    fontFamily="monospace"
                    fontSize="8"
                    fontWeight="bold"
                  >
                    {icText}
                  </text>

                  {isSelected && (
                    <g pointerEvents="none">
                      <rect
                        x={p1.x - 9}
                        y={p1.y - 7}
                        width={chipWidth + 6}
                        height={TROUGH_Y - p1.y + 42}
                        rx="4"
                        fill="rgba(6, 182, 212, 0.08)"
                        stroke="#22d3ee"
                        strokeWidth="1.8"
                        strokeDasharray="4 2"
                      />
                    </g>
                  )}
                </g>
              );
            }

            // 8. TACTILE PUSH BUTTON & SPST SWITCH (IEEE Momentary / Toggle Switch)
            if (comp.type === "PUSH_BUTTON" || comp.type === "SWITCH_SPST") {
              const p1 = getHoleCoords(comp.pins.T1 || comp.pins.P1);
              const p2 = getHoleCoords(comp.pins.T2 || comp.pins.P2);
              const midX = (p1.x + p2.x) / 2;
              const midY = (p1.y + p2.y) / 2;
              const isSchematic = ieeeViewMode === "IEEE_SCHEMATIC";
              const isClosed = comp.value === 1;
              const isSpst = comp.type === "SWITCH_SPST";

              return (
                <g
                  key={comp.id}
                  filter="url(#bbShadow)"
                  className="cursor-grab active:cursor-grabbing select-none group"
                  onPointerDown={(e) => handleCompPointerDown(comp, e)}
                  onDoubleClick={(e) => handleCompDoubleClick(comp, e)}
                >
                  <line x1={p1.x} y1={p1.y} x2={midX - 10} y2={midY} stroke="#94a3b8" strokeWidth="2" />
                  <line x1={p2.x} y1={p2.y} x2={midX + 10} y2={midY} stroke="#94a3b8" strokeWidth="2" />
                  <circle cx={p1.x} cy={p1.y} r="3" fill="#cbd5e1" stroke="#334155" />
                  <circle cx={p2.x} cy={p2.y} r="3" fill="#cbd5e1" stroke="#334155" />

                  {isSchematic ? (
                    <g transform={`translate(${midX}, ${midY})`}>
                      <circle cx="-8" cy="0" r="2.5" fill="none" stroke="#38bdf8" strokeWidth="1.6" />
                      <circle cx="8" cy="0" r="2.5" fill="none" stroke="#38bdf8" strokeWidth="1.6" />
                      {isSpst ? (
                        <line x1="-7" y1="0" x2="7" y2={isClosed ? "0" : "-8"} stroke={isClosed ? "#22c55e" : "#f59e0b"} strokeWidth="2.2" />
                      ) : (
                        <>
                          <line x1="-7" y1="-5" x2="7" y2="-5" stroke="#38bdf8" strokeWidth="2" />
                          <line x1="0" y1="-5" x2="0" y2="-10" stroke="#38bdf8" strokeWidth="1.6" />
                          <line x1="-3" y1="-10" x2="3" y2="-10" stroke="#38bdf8" strokeWidth="1.6" />
                        </>
                      )}
                    </g>
                  ) : (
                    <g>
                      <rect x={midX - 12} y={midY - 12} width="24" height="24" rx="4" fill="#1e293b" stroke="#64748b" strokeWidth="1.2" />
                      <circle cx={midX} cy={midY} r="7" fill={isClosed ? "#22c55e" : "#ef4444"} stroke="#b91c1c" strokeWidth="1.5" />
                    </g>
                  )}

                  <text x={midX} y={midY - 15} textAnchor="middle" fill="#0f172a" fontFamily="monospace" fontSize="8" fontWeight="bold">
                    {isSpst ? (isClosed ? "SW ON" : "SW OFF") : "PUSH"}
                  </text>
                  {isSelected && renderIeeeSelectionBox(midX, midY, 36, 28, isSpst ? "SPST" : "PUSH")}
                </g>
              );
            }

            // 9. POTENTIOMETER (IEEE Variable Resistor Symbol & 3-Pin Trimpot)
            if (comp.type === "POTENTIOMETER") {
              const p1 = getHoleCoords(comp.pins.T1 || comp.pins.PIN1);
              const pW = getHoleCoords(comp.pins.WIPER || comp.pins.PIN2);
              const p2 = getHoleCoords(comp.pins.T2 || comp.pins.PIN3);
              const midX = pW.x;
              const midY = pW.y - 12;
              const isSchematic = ieeeViewMode === "IEEE_SCHEMATIC";

              return (
                <g
                  key={comp.id}
                  filter="url(#bbShadow)"
                  className="cursor-grab active:cursor-grabbing select-none group"
                  onPointerDown={(e) => handleCompPointerDown(comp, e)}
                  onDoubleClick={(e) => handleCompDoubleClick(comp, e)}
                >
                  <line x1={p1.x} y1={p1.y} x2={midX - 10} y2={midY + 10} stroke="#94a3b8" strokeWidth="1.8" />
                  <line x1={pW.x} y1={pW.y} x2={midX} y2={midY + 10} stroke="#94a3b8" strokeWidth="1.8" />
                  <line x1={p2.x} y1={p2.y} x2={midX + 10} y2={midY + 10} stroke="#94a3b8" strokeWidth="1.8" />
                  <circle cx={p1.x} cy={p1.y} r="2.8" fill="#cbd5e1" stroke="#334155" />
                  <circle cx={pW.x} cy={pW.y} r="2.8" fill="#cbd5e1" stroke="#334155" />
                  <circle cx={p2.x} cy={p2.y} r="2.8" fill="#cbd5e1" stroke="#334155" />

                  {isSchematic ? (
                    <g transform={`translate(${midX}, ${midY})`}>
                      <path d="M -14 0 L -10 -5 L -5 5 L 0 -5 L 5 5 L 10 -5 L 14 0" fill="none" stroke="#38bdf8" strokeWidth="2.2" />
                      <line x1="0" y1="12" x2="0" y2="4" stroke="#38bdf8" strokeWidth="2" />
                      <polygon points="0,2 -3,6 3,6" fill="#38bdf8" />
                    </g>
                  ) : (
                    <g>
                      <circle cx={midX} cy={midY} r="12" fill="#0284c7" stroke="#0369a1" strokeWidth="1.5" />
                      <circle cx={midX} cy={midY} r="6" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1" />
                      <line x1={midX - 4} y1={midY} x2={midX + 4} y2={midY} stroke="#0f172a" strokeWidth="1.5" />
                    </g>
                  )}

                  <text x={midX} y={midY - 16} textAnchor="middle" fill="#0f172a" fontFamily="monospace" fontSize="8" fontWeight="bold">
                    POT 10k
                  </text>
                  {isSelected && renderIeeeSelectionBox(midX, midY, 44, 32, "POT 10k")}
                </g>
              );
            }

            return null;
          })}

          {/* 7. Realistic Catenary Jumper Wires */}
          {wires.map((wire) => {
            const p1 = getHoleCoords(wire.from);
            const p2 = getHoleCoords(wire.to);
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const dist = Math.hypot(dx, dy);
            const sag = Math.min(45, Math.max(15, dist * 0.18));

            // Control points for natural catenary droop
            const cx1 = p1.x + dx * 0.3;
            const cy1 = p1.y + dy * 0.3 + sag;
            const cx2 = p1.x + dx * 0.7;
            const cy2 = p1.y + dy * 0.7 + sag;

            return (
              <g key={wire.id} className="group cursor-pointer">
                {/* Wire Shadow on Breadboard */}
                <path
                  d={`M ${p1.x} ${p1.y + 4} C ${cx1} ${cy1 + 6}, ${cx2} ${cy2 + 6}, ${p2.x} ${p2.y + 4}`}
                  fill="none"
                  stroke="rgba(0, 0, 0, 0.25)"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
                {/* Colored Insulated Wire */}
                <path
                  d={`M ${p1.x} ${p1.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${p2.x} ${p2.y}`}
                  fill="none"
                  stroke={wire.color}
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  className="group-hover:stroke-cyan-400 group-hover:stroke-[4.5] transition-all"
                />
                {/* Stripped Pin Terminal Ends entering the hole */}
                <circle cx={p1.x} cy={p1.y} r="3" fill="#cbd5e1" stroke="#475569" strokeWidth="0.8" />
                <circle cx={p2.x} cy={p2.y} r="3" fill="#cbd5e1" stroke="#475569" strokeWidth="0.8" />
              </g>
            );
          })}

          {/* Pending Wire Rubberband Preview */}
          {pendingWireStart && mousePos && (() => {
            const p1 = getHoleCoords(pendingWireStart);
            return (
              <line
                x1={p1.x}
                y1={p1.y}
                x2={mousePos.x}
                y2={mousePos.y}
                stroke={selectedWireColor}
                strokeWidth="2.5"
                strokeDasharray="4 4"
              />
            );
          })()}

          {/* 2D SVG Drag & Drop Socket Target Beacon */}
          {dropPreviewHole2D && (() => {
            const dp = getHoleCoords(dropPreviewHole2D);
            return (
              <g className="pointer-events-none">
                <circle
                  cx={dp.x}
                  cy={dp.y}
                  r="10"
                  fill="rgba(16, 185, 129, 0.22)"
                  stroke="#10b981"
                  strokeWidth="2.2"
                />
                <circle cx={dp.x} cy={dp.y} r="4" fill="#10b981" />
              </g>
            );
          })()}

          {/* Virtual DMM Probes Inserted in Holes */}
          {isDmmActive && probeRedHole && (() => {
            const p = getHoleCoords(probeRedHole);
            return (
              <g className="cursor-pointer" onClick={() => setActiveProbeToPlace("DMM_RED")}>
                <circle cx={p.x} cy={p.y} r="6" fill="#ef4444" stroke="#ffffff" strokeWidth="2" />
                <line x1={p.x} y1={p.y} x2={p.x - 25} y2={p.y - 35} stroke="#ef4444" strokeWidth="3" />
                <rect x={p.x - 55} y={p.y - 50} width="60" height="16" rx="4" fill="#0f172a" stroke="#ef4444" />
                <text x={p.x - 25} y={p.y - 38} textAnchor="middle" fill="#ef4444" fontFamily="monospace" fontSize="8" fontWeight="bold">
                  PROBE (+)
                </text>
              </g>
            );
          })()}

          {isDmmActive && probeBlackHole && (() => {
            const p = getHoleCoords(probeBlackHole);
            return (
              <g className="cursor-pointer" onClick={() => setActiveProbeToPlace("DMM_BLACK")}>
                <circle cx={p.x} cy={p.y} r="6" fill="#0f172a" stroke="#ffffff" strokeWidth="2" />
                <line x1={p.x} y1={p.y} x2={p.x + 25} y2={p.y - 35} stroke="#0f172a" strokeWidth="3" />
                <rect x={p.x - 5} y={p.y - 50} width="60" height="16" rx="4" fill="#0f172a" stroke="#94a3b8" />
                <text x={p.x + 25} y={p.y - 38} textAnchor="middle" fill="#94a3b8" fontFamily="monospace" fontSize="8" fontWeight="bold">
                  PROBE (-)
                </text>
              </g>
            );
          })()}

          {/* Active Laid Circuit Zone Perimeter Overlay (ensures laid circuit is always immediately visible) */}
          {highlightCircuitZone && circuitBounds.hasCircuit && (
            <g className="pointer-events-none">
              <rect
                x={circuitBounds.minX}
                y={circuitBounds.minY}
                width={circuitBounds.maxX - circuitBounds.minX}
                height={circuitBounds.maxY - circuitBounds.minY}
                rx="8"
                fill="rgba(34, 211, 238, 0.05)"
                stroke="#22d3ee"
                strokeWidth="2"
                strokeDasharray="6 4"
              />
              <rect
                x={circuitBounds.minX}
                y={Math.max(2, circuitBounds.minY - 15)}
                width="136"
                height="14"
                rx="3"
                fill="#0b1220"
                stroke="#22d3ee"
                strokeWidth="1"
              />
              <text
                x={circuitBounds.minX + 68}
                y={Math.max(12, circuitBounds.minY - 5)}
                textAnchor="middle"
                fill="#67e8f9"
                fontFamily="monospace"
                fontSize="8"
                fontWeight="bold"
              >
                CIRCUIT · COL {circuitBounds.minCol}–{circuitBounds.maxCol}
              </text>
            </g>
          )}

          {/* Installed PME Probes on 2D Breadboard */}
          {installedPmes.map((pme) => {
            const pPos = getHoleCoords(pme.probePosHole);
            const pNeg = pme.probeNegHole ? getHoleCoords(pme.probeNegHole) : null;
            const pmeStroke =
              pme.type === "VOLTMETER"
                ? "#38bdf8"
                : pme.type === "AMMETER"
                ? "#f59e0b"
                : pme.type === "OHMMETER"
                ? "#a855f7"
                : pme.type === "POWER_METER"
                ? "#10b981"
                : "#ec4899";
            const shortTag = pme.label.split(" ")[0];
            return (
              <g key={pme.id}>
                <g
                  className="cursor-pointer"
                  onClick={() => setActivePmeProbePick({ pmeId: pme.id, terminal: "POS" })}
                >
                  <circle cx={pPos.x} cy={pPos.y} r="5.5" fill={pmeStroke} stroke="#ffffff" strokeWidth="1.5" />
                  <line x1={pPos.x} y1={pPos.y} x2={pPos.x - 16} y2={pPos.y - 28} stroke={pmeStroke} strokeWidth="2.5" />
                  <rect x={pPos.x - 40} y={pPos.y - 42} width="48" height="14" rx="3" fill="#0f172a" stroke={pmeStroke} />
                  <text
                    x={pPos.x - 16}
                    y={pPos.y - 32}
                    textAnchor="middle"
                    fill={pmeStroke}
                    fontFamily="monospace"
                    fontSize="7.5"
                    fontWeight="bold"
                  >
                    {shortTag}+
                  </text>
                </g>
                {pNeg && (
                  <g
                    className="cursor-pointer"
                    onClick={() => setActivePmeProbePick({ pmeId: pme.id, terminal: "NEG" })}
                  >
                    <circle cx={pNeg.x} cy={pNeg.y} r="5" fill="#1e293b" stroke="#ffffff" strokeWidth="1.5" />
                    <line x1={pNeg.x} y1={pNeg.y} x2={pNeg.x + 16} y2={pNeg.y - 28} stroke="#64748b" strokeWidth="2.5" />
                    <rect x={pNeg.x - 8} y={pNeg.y - 42} width="48" height="14" rx="3" fill="#0f172a" stroke="#64748b" />
                    <text
                      x={pNeg.x + 16}
                      y={pNeg.y - 32}
                      textAnchor="middle"
                      fill="#cbd5e1"
                      fontFamily="monospace"
                      fontSize="7.5"
                      fontWeight="bold"
                    >
                      {shortTag}-
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Virtual Oscilloscope Probes Snapped in Holes */}
          {isScopeActive && probeScopeCh1Hole && (() => {
            const p = getHoleCoords(probeScopeCh1Hole);
            return (
              <g className="cursor-pointer" onClick={() => setActiveProbeToPlace("SCOPE_CH1")}>
                {/* Coaxial Cable Bézier curve from bottom edge */}
                <path
                  d={`M ${p.x - 24} ${p.y - 42} C ${p.x - 70} ${p.y - 100}, ${p.x - 140} 420, 220 420`}
                  fill="none"
                  stroke="#facc15"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  opacity="0.9"
                />
                {/* Probe Body */}
                <line x1={p.x} y1={p.y} x2={p.x - 24} y2={p.y - 42} stroke="#facc15" strokeWidth="4.5" />
                <circle cx={p.x} cy={p.y} r="6" fill="#facc15" stroke="#ffffff" strokeWidth="2" />
                <rect x={p.x - 55} y={p.y - 58} width="58" height="16" rx="4" fill="#0f172a" stroke="#facc15" strokeWidth="1.5" />
                <text x={p.x - 26} y={p.y - 46} textAnchor="middle" fill="#facc15" fontFamily="monospace" fontSize="8" fontWeight="bold">
                  OSC CH1
                </text>
              </g>
            );
          })()}

          {isScopeActive && probeScopeCh2Hole && (() => {
            const p = getHoleCoords(probeScopeCh2Hole);
            return (
              <g className="cursor-pointer" onClick={() => setActiveProbeToPlace("SCOPE_CH2")}>
                {/* Coaxial Cable Bézier curve */}
                <path
                  d={`M ${p.x + 24} ${p.y - 42} C ${p.x + 70} ${p.y - 100}, ${p.x + 140} 420, 380 420`}
                  fill="none"
                  stroke="#22d3ee"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  opacity="0.9"
                />
                {/* Probe Body */}
                <line x1={p.x} y1={p.y} x2={p.x + 24} y2={p.y - 42} stroke="#22d3ee" strokeWidth="4.5" />
                <circle cx={p.x} cy={p.y} r="6" fill="#22d3ee" stroke="#ffffff" strokeWidth="2" />
                <rect x={p.x - 3} y={p.y - 58} width="58" height="16" rx="4" fill="#0f172a" stroke="#22d3ee" strokeWidth="1.5" />
                <text x={p.x + 26} y={p.y - 46} textAnchor="middle" fill="#22d3ee" fontFamily="monospace" fontSize="8" fontWeight="bold">
                  OSC CH2
                </text>
              </g>
            );
          })()}

          {isSigGenActive && sigGenHole && (() => {
            const p = getHoleCoords(sigGenHole);
            return (
              <g className="cursor-pointer" onClick={() => setActiveProbeToPlace("SIGGEN")}>
                <path
                  d={`M ${p.x + 22} ${p.y - 40} C ${p.x + 60} ${p.y - 95}, ${p.x + 120} 420, 520 420`}
                  fill="none"
                  stroke="#f97316"
                  strokeWidth="3"
                  strokeDasharray="6 3"
                  strokeLinecap="round"
                  opacity="0.9"
                />
                <line x1={p.x} y1={p.y} x2={p.x + 22} y2={p.y - 40} stroke="#f97316" strokeWidth="4" />
                <circle cx={p.x} cy={p.y} r="5.5" fill="#f97316" stroke="#ffffff" strokeWidth="2" />
                <rect x={p.x - 4} y={p.y - 56} width="54" height="16" rx="4" fill="#0f172a" stroke="#f97316" strokeWidth="1.5" />
                <text x={p.x + 23} y={p.y - 44} textAnchor="middle" fill="#fdba74" fontFamily="monospace" fontSize="8" fontWeight="bold">
                  XFG1
                </text>
              </g>
            );
          })()}

          {/* Ghost Probe Following Mouse Cursor when placing probe */}
          {(activeProbeToPlace || activePmeProbePick) && mousePos && (
            <g className="pointer-events-none opacity-90">
              <circle
                cx={mousePos.x}
                cy={mousePos.y}
                r="7"
                fill={
                  activeProbeToPlace?.includes("CH1")
                    ? "#facc15"
                    : activeProbeToPlace?.includes("CH2")
                    ? "#22d3ee"
                    : activeProbeToPlace?.includes("RED")
                    ? "#ef4444"
                    : activeProbeToPlace === "SIGGEN"
                    ? "#f97316"
                    : activePmeProbePick
                    ? "#38bdf8"
                    : "#0f172a"
                }
                stroke="#ffffff"
                strokeWidth="2"
              />
              <line
                x1={mousePos.x}
                y1={mousePos.y}
                x2={mousePos.x - 24}
                y2={mousePos.y - 42}
                stroke={
                  activeProbeToPlace?.includes("CH1")
                    ? "#facc15"
                    : activeProbeToPlace?.includes("CH2")
                    ? "#22d3ee"
                    : activeProbeToPlace === "SIGGEN"
                    ? "#f97316"
                    : activePmeProbePick
                    ? "#38bdf8"
                    : "#ef4444"
                }
                strokeWidth="4"
              />
              <rect
                x={mousePos.x - 70}
                y={mousePos.y - 62}
                width="104"
                height="18"
                rx="4"
                fill="#0f172a"
                stroke="#38bdf8"
              />
              <text
                x={mousePos.x - 18}
                y={mousePos.y - 50}
                textAnchor="middle"
                fill="#38bdf8"
                fontFamily="monospace"
                fontSize="8"
                fontWeight="bold"
              >
                Click Hole to Snap
              </text>
            </g>
          )}
        </svg>

        {/* Viewport Floating Controls: Lock Current View, Move Ahead/Back/Forth, Center & Reset */}
        <div className="absolute bottom-3 right-3 flex flex-wrap items-center gap-1.5 bg-slate-900/95 border border-slate-700/80 rounded-xl p-1 shadow-lg text-xs font-mono">
          <button
            type="button"
            onClick={() => setIsBoardLocked((v) => !v)}
            className={`px-2 py-1 rounded-lg font-bold flex items-center gap-1 cursor-pointer transition-colors ${
              isBoardLocked
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/50"
                : "bg-amber-500/20 text-amber-300 border border-amber-500/50"
            }`}
            title={
              isBoardLocked
                ? "Locked on current view. Click to unlock and move ahead, back, and forth."
                : "Unlocked — drag/scroll to move ahead, back, and forth. Click to lock on current view."
            }
          >
            {isBoardLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
            <span>{isBoardLocked ? "Locked on View" : "Unlocked · Move"}</span>
          </button>
          {!isBoardLocked && (
            <>
              <button
                type="button"
                onClick={() => setPan((p) => ({ ...p, x: Math.min(340, p.x + 48) }))}
                className="px-1.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-200 cursor-pointer"
                title="Move Forth Left"
              >
                ←
              </button>
              <button
                type="button"
                onClick={() => setPan((p) => ({ ...p, x: Math.max(-340, p.x - 48) }))}
                className="px-1.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-200 cursor-pointer"
                title="Move Forth Right"
              >
                →
              </button>
            </>
          )}
          <button
            type="button"
            onClick={handleFindCircuit}
            className="px-2 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-500/40 font-bold flex items-center gap-1 cursor-pointer"
            title="Center view directly on laid circuit"
          >
            <Crosshair className="w-3 h-3" />
            <span>Center</span>
          </button>
          <button
            type="button"
            disabled={isBoardLocked}
            onClick={() => setZoom((z) => Math.min(2.2, Number((z + 0.15).toFixed(2))))}
            className={`px-2 py-1 rounded text-white ${
              isBoardLocked ? "bg-slate-800/50 opacity-45 cursor-not-allowed" : "bg-slate-800 hover:bg-slate-700 cursor-pointer"
            }`}
            title={isBoardLocked ? "Unlock Breadboard to move ahead (zoom in)" : "Move Ahead (Zoom In)"}
          >
            +
          </button>
          <span className="px-1 text-cyan-300 font-bold tabular-nums">{Math.round(zoom * 100)}%</span>
          <button
            type="button"
            disabled={isBoardLocked}
            onClick={() => setZoom((z) => Math.max(0.6, Number((z - 0.15).toFixed(2))))}
            className={`px-2 py-1 rounded text-white ${
              isBoardLocked ? "bg-slate-800/50 opacity-45 cursor-not-allowed" : "bg-slate-800 hover:bg-slate-700 cursor-pointer"
            }`}
            title={isBoardLocked ? "Unlock Breadboard to move back (zoom out)" : "Move Back (Zoom Out)"}
          >
            -
          </button>
          <button
            type="button"
            onClick={handleResetZoom2D}
            className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-600/80 font-bold flex items-center gap-1 cursor-pointer"
            title="Reset zoom to 100% and center pan"
          >
            <RotateCcw className="w-3 h-3 text-cyan-300" />
            <span>Reset</span>
          </button>
        </div>
        </div>

        {/* Selected Component Property Inspector Drawer (Opens on Double-Click in 3D or 2D) */}
        {selectedComponent && isPropertiesDrawerOpen && (
          <div className="absolute top-3 right-3 z-30 w-80 bg-[#0b1222]/95 border border-cyan-500/40 rounded-xl shadow-2xl p-3 text-xs font-mono text-slate-200 animate-in fade-in slide-in-from-top-2 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2.5">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                <span className="font-bold text-white tracking-wide text-[11px] uppercase">
                  IEEE Component Inspector &amp; Analysis
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsPropertiesDrawerOpen(false)}
                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                title="Close Inspector (Double-click component anytime to re-open)"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Standard Compliance Badge */}
            <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-emerald-950/60 border border-emerald-500/40 text-[10px] text-emerald-300 mb-2.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>IEEE Std 315 / JEDEC Standard Physical Packaging</span>
            </div>

            {/* Component Summary */}
            <div className="space-y-1.5 bg-slate-950/70 border border-slate-800/80 rounded-lg p-2.5 mb-2.5">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Device ID:</span>
                <span className="font-bold text-cyan-300">{selectedComponent.id}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Component:</span>
                <span className="font-bold text-white">{selectedComponent.label}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Nominal Spec:</span>
                <span className="font-bold text-amber-300">{selectedComponent.formattedValue}</span>
              </div>
              <div className="flex justify-between items-center text-[10.5px]">
                <span className="text-slate-400">Package Style:</span>
                <span className="text-slate-300 font-semibold">
                  {selectedComponent.type === "RESISTOR"
                    ? "Axial 1/4W (0.400\" / 4 Holes)"
                    : selectedComponent.type.startsWith("LED_")
                    ? "Radial 5mm T-1 3/4 (3 Holes)"
                    : selectedComponent.type === "DIODE_1N4007"
                    ? "DO-41 Rectifier (4 Holes)"
                    : selectedComponent.type === "CAP_CERAMIC"
                    ? "Radial Disc (3 Holes)"
                    : selectedComponent.type === "CAP_ELECTROLYTIC"
                    ? "Aluminum Can (3 Holes)"
                    : selectedComponent.type.includes("BJT") || selectedComponent.type.includes("TRANSISTOR")
                    ? "TO-92 3-Pin EBC"
                    : selectedComponent.type.includes("NE555") || selectedComponent.type.includes("LM741")
                    ? "JEDEC MS-001 DIP-8"
                    : selectedComponent.type.includes("74LS00")
                    ? "JEDEC MS-001 DIP-14"
                    : "Standard Breadboard Footprint"}
                </span>
              </div>
            </div>

            {/* Live MNA Simulation Telemetry */}
            {selectedCompTelemetry && (
              <div className="bg-cyan-950/30 border border-cyan-800/40 rounded-lg p-2.5 mb-2.5 space-y-1 text-[11px]">
                <div className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider">
                  Live Terminal Telemetry
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Terminal V1:</span>
                  <span className="font-bold text-cyan-200">{selectedCompTelemetry.v1.toFixed(2)} V</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Terminal V2:</span>
                  <span className="font-bold text-cyan-200">{selectedCompTelemetry.v2.toFixed(2)} V</span>
                </div>
                <div className="flex justify-between border-t border-cyan-800/40 pt-1 text-slate-200">
                  <span className="font-semibold">ΔV Drop:</span>
                  <span className="font-bold text-emerald-400">{selectedCompTelemetry.vDrop.toFixed(2)} V</span>
                </div>
                <div className="flex justify-between text-slate-200">
                  <span className="font-semibold">Branch Current:</span>
                  <span className="font-bold text-amber-300">{selectedCompTelemetry.currentMa.toFixed(1)} mA</span>
                </div>
              </div>
            )}

            {/* Interactive Push Button & SPST Switch Controls */}
            {(selectedComponent.type === "PUSH_BUTTON" || selectedComponent.type === "SWITCH_SPST") && (
              <div className="mb-2.5">
                <button
                  type="button"
                  onClick={() => handleTogglePushButton(selectedComponent.id)}
                  className={`w-full py-1.5 rounded-lg text-[11px] font-bold border cursor-pointer ${
                    selectedComponent.value === 1
                      ? "bg-emerald-500/20 border-emerald-400 text-emerald-300"
                      : "bg-slate-800 border-slate-700 text-slate-200 hover:border-cyan-400"
                  }`}
                >
                  {selectedComponent.value === 1 ? "Contact CLOSED — Release/Open Switch" : "Contact OPEN — Close Switch"}
                </button>
              </div>
            )}

            {selectedComponent.type === "POTENTIOMETER" && (
              <div className="mb-2.5 space-y-1">
                <div className="flex justify-between text-[10px] text-slate-400 uppercase font-semibold">
                  <span>Wiper Position</span>
                  <span className="text-cyan-300 font-bold">
                    {Math.round((selectedComponent.wiperPct ?? 0.5) * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={95}
                  value={Math.round((selectedComponent.wiperPct ?? 0.5) * 100)}
                  onChange={(e) =>
                    handleStepPotentiometer(selectedComponent.id, parseInt(e.target.value, 10) / 100)
                  }
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>
            )}

            {/* Quick Value Presets for Resistors */}
            {selectedComponent.type === "RESISTOR" && (
              <div className="mb-2.5">
                <div className="text-[10px] text-slate-400 uppercase font-semibold mb-1">
                  Quick Resistance Presets
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {[
                    { v: 220, label: "220 Ω" },
                    { v: 330, label: "330 Ω" },
                    { v: 470, label: "470 Ω" },
                    { v: 1000, label: "1.0 kΩ" },
                    { v: 4700, label: "4.7 kΩ" },
                    { v: 10000, label: "10 kΩ" },
                  ].map((p) => (
                    <button
                      key={p.v}
                      type="button"
                      onClick={() => handleUpdateComponentValue(selectedComponent.id, p.v, p.label)}
                      className={`px-2 py-1 rounded text-[10px] font-semibold border cursor-pointer transition-colors ${
                        selectedComponent.value === p.v
                          ? "bg-cyan-500/30 border-cyan-400 text-cyan-200 font-bold"
                          : "bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Pin Connections */}
            <div className="mb-3">
              <div className="text-[10px] text-slate-400 uppercase font-semibold mb-1">
                Breadboard Terminals
              </div>
              <div className="space-y-1">
                {Object.entries(selectedComponent.pins).map(([pinKey, hole]) => (
                  <div
                    key={pinKey}
                    className="flex justify-between items-center bg-slate-800/60 px-2 py-0.5 rounded text-[10px]"
                  >
                    <span className="text-cyan-400 font-bold">{pinKey}</span>
                    <span className="text-slate-300">
                      {hole.type === "RAIL"
                        ? `${hole.rail} (Col ${hole.col})`
                        : `Hole ${hole.row}${hole.col}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Delete Component Button */}
            <button
              type="button"
              onClick={() => handleDeleteComponent(selectedComponent.id)}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/40 text-rose-300 font-semibold text-xs cursor-pointer transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Remove Component</span>
            </button>
          </div>
        )}

        {/* Add IEEE Standard Electronic Component Modal */}
        {isAddCompModalOpen && (
          <div className="absolute inset-0 z-40 bg-black/80 flex items-center justify-center p-4">
            <div className="bg-[#0B0F19] border border-cyan-500/50 rounded-2xl max-w-lg w-full shadow-2xl p-4 sm:p-5 flex flex-col gap-4 font-mono text-slate-200 animate-in fade-in zoom-in-95 duration-150">
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                    Add IEEE Standard Component
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Standard IEEE 315 / ANSI Y32.2 dimensions matching 2.54mm breadboard pitch.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddCompModalOpen(false)}
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Component Types Grid */}
              <div>
                <label className="text-[11px] uppercase font-bold text-slate-400 tracking-wider block mb-2">
                  Select Component Type & Packaging
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-64 overflow-y-auto pr-1">
                  {[
                    { type: "RESISTOR" as BbCompType, label: "Resistor", desc: "Axial 1/4W (4 Holes)", defaultVal: 330 },
                    { type: "INDUCTOR" as BbCompType, label: "Inductor 10mH", desc: "Ferrite Coil (4 Holes)", defaultVal: 0.01 },
                    { type: "CAP_CERAMIC" as BbCompType, label: "Ceramic Cap", desc: "100nF Radial (3 Holes)", defaultVal: 0.0000001 },
                    { type: "CAP_ELECTROLYTIC" as BbCompType, label: "Electrolytic Cap", desc: "10µF Can (3 Holes)", defaultVal: 0.00001 },
                    { type: "LED_RED" as BbCompType, label: "Red LED", desc: "5mm T-1 3/4 (3 Holes)", defaultVal: 2.0 },
                    { type: "LED_GREEN" as BbCompType, label: "Green LED", desc: "5mm T-1 3/4 (3 Holes)", defaultVal: 2.2 },
                    { type: "LED_BLUE" as BbCompType, label: "Blue LED", desc: "5mm T-1 3/4 (3 Holes)", defaultVal: 3.2 },
                    { type: "DIODE_1N4007" as BbCompType, label: "1N4007 Diode", desc: "DO-41 Rectifier (0.7V)", defaultVal: 0.7 },
                    { type: "DIODE_ZENER" as BbCompType, label: "Zener 5.1V", desc: "DO-35 Voltage Ref", defaultVal: 5.1 },
                    { type: "DIODE_1N5819" as BbCompType, label: "1N5819 Schottky", desc: "DO-41 Fast (0.3V)", defaultVal: 0.3 },
                    { type: "BJT_BC547" as BbCompType, label: "BC547 NPN", desc: "TO-92 NPN (3 Pins)", defaultVal: 200 },
                    { type: "BJT_BC557" as BbCompType, label: "BC557 PNP", desc: "TO-92 PNP (3 Pins)", defaultVal: 200 },
                    { type: "TRANSISTOR_2N2222" as BbCompType, label: "2N2222 NPN", desc: "TO-92 NPN (3 Pins)", defaultVal: 200 },
                    { type: "MOSFET_IRF540N" as BbCompType, label: "IRF540N N-MOS", desc: "TO-220 Power FET", defaultVal: 100 },
                    { type: "IC_LM7805" as BbCompType, label: "LM7805 +5V Reg", desc: "TO-220 Linear Reg", defaultVal: 5 },
                    { type: "IC_NE555" as BbCompType, label: "NE555 Timer", desc: "DIP-8 Package", defaultVal: 555 },
                    { type: "IC_LM741" as BbCompType, label: "LM741 Op-Amp", desc: "DIP-8 Package", defaultVal: 741 },
                    { type: "IC_74LS00" as BbCompType, label: "74LS00 NAND", desc: "DIP-14 Quad NAND", defaultVal: 7400 },
                    { type: "IC_74LS04" as BbCompType, label: "74LS04 NOT", desc: "DIP-14 Hex Inverter", defaultVal: 7404 },
                    { type: "IC_74LS08" as BbCompType, label: "74LS08 AND", desc: "DIP-14 Quad AND", defaultVal: 7408 },
                    { type: "IC_74LS32" as BbCompType, label: "74LS32 OR", desc: "DIP-14 Quad OR", defaultVal: 7432 },
                    { type: "IC_74LS02" as BbCompType, label: "74LS02 NOR", desc: "DIP-14 Quad NOR", defaultVal: 7402 },
                    { type: "IC_74LS86" as BbCompType, label: "74LS86 XOR", desc: "DIP-14 Quad XOR", defaultVal: 7486 },
                    { type: "IC_74LS74" as BbCompType, label: "74LS74 D-FF", desc: "DIP-14 Dual D-FF", defaultVal: 7474 },
                    { type: "IC_74LS76" as BbCompType, label: "74LS76 JK-FF", desc: "DIP-16 Dual JK-FF", defaultVal: 7476 },
                    { type: "SEVEN_SEG" as BbCompType, label: "7-Seg Display", desc: "DIP-10 Common Cath", defaultVal: 7 },
                    { type: "PUSH_BUTTON" as BbCompType, label: "Push Button", desc: "6x6mm SPST Tactile", defaultVal: 1 },
                    { type: "SWITCH_SPST" as BbCompType, label: "SPST Toggle SW", desc: "Slide Switch", defaultVal: 1 },
                    { type: "POTENTIOMETER" as BbCompType, label: "Potentiometer", desc: "10kΩ Rotary 3-Pin", defaultVal: 10000 },
                    { type: "BUZZER" as BbCompType, label: "Piezo Buzzer", desc: "5V Acoustic Sounder", defaultVal: 5 },
                    { type: "LDR" as BbCompType, label: "LDR Sensor", desc: "CdS Photoresistor", defaultVal: 5000 },
                  ].map((item) => (
                    <button
                      key={item.type}
                      type="button"
                      onClick={() => {
                        setNewCompType(item.type);
                        setNewCompValue(item.defaultVal);
                      }}
                      className={`flex flex-col text-left p-2 rounded-xl border text-xs cursor-pointer transition-all ${
                        newCompType === item.type
                          ? "bg-cyan-950/70 border-cyan-400 ring-1 ring-cyan-400 text-white"
                          : "bg-slate-900 hover:bg-slate-800/80 border-slate-800 text-slate-300"
                      }`}
                    >
                      <span className="font-bold text-white text-[11px]">{item.label}</span>
                      <span className="text-[10px] text-slate-400">{item.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Column Position & Parameters */}
              <div className="grid grid-cols-2 gap-3 bg-slate-900/60 border border-slate-800 rounded-xl p-3">
                <div>
                  <label className="text-[10.5px] uppercase font-bold text-slate-400 block mb-1">
                    Tie Column (1 – 58)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={1}
                      max={58}
                      value={newCompCol}
                      onChange={(e) => setNewCompCol(parseInt(e.target.value) || 1)}
                      className="w-full accent-cyan-400 cursor-pointer"
                    />
                    <span className="font-bold text-cyan-300 text-xs w-7 text-right">
                      {newCompCol}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-[10.5px] uppercase font-bold text-slate-400 block mb-1">
                    {newCompType === "RESISTOR"
                      ? "Resistance (Ω)"
                      : newCompType.startsWith("LED_")
                      ? "Forward Voltage (V)"
                      : "Nominal Value"}
                  </label>
                  {newCompType === "RESISTOR" ? (
                    <select
                      value={newCompValue}
                      onChange={(e) => setNewCompValue(parseFloat(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-cyan-400"
                    >
                      <option value={100}>100 Ω</option>
                      <option value={220}>220 Ω</option>
                      <option value={330}>330 Ω (Standard LED Limit)</option>
                      <option value={470}>470 Ω</option>
                      <option value={1000}>1.0 kΩ</option>
                      <option value={2200}>2.2 kΩ</option>
                      <option value={4700}>4.7 kΩ</option>
                      <option value={10000}>10.0 kΩ (Pull-up)</option>
                      <option value={100000}>100.0 kΩ</option>
                    </select>
                  ) : (
                    <input
                      type="number"
                      value={newCompValue}
                      onChange={(e) => setNewCompValue(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-cyan-400"
                    />
                  )}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2 border-t border-slate-800 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddCompModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleAddIeeeComponent(newCompType, newCompValue, newCompCol)}
                  className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-lg shadow-cyan-500/20"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Place on Breadboard</span>
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>

      {/* PERSISTENT, RESIZABLE INSTRUMENT & PME DOCK (Always sits BELOW the pinned breadboard) */}
      <div className="bg-[#0b1222] border border-cyan-500/35 rounded-2xl shadow-xl font-mono overflow-hidden">
        {/* Top Resize Drag Handle */}
        <div
          onPointerDown={handleStartDockResize}
          className="w-full h-2.5 bg-slate-900/90 hover:bg-cyan-500/25 border-b border-slate-800 flex items-center justify-center cursor-ns-resize transition-colors"
          title="Drag vertically to resize instrument dock height"
        >
          <div className="w-12 h-1 rounded-full bg-slate-600" />
        </div>

        <div className="p-4 space-y-4">
        {/* PME & Instrument Installer Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/15 border border-cyan-400/40 text-cyan-300">
              <Gauge className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span>Persistent Bench Instrument &amp; PME Dock</span>
                <button
                  type="button"
                  onClick={() => setIsAutoAttachEnabled((v) => !v)}
                  className={`px-2 py-0.5 rounded-lg border text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                    isAutoAttachEnabled
                      ? "bg-cyan-500/20 text-cyan-200 border-cyan-400/60"
                      : "bg-slate-900 text-slate-400 border-slate-700"
                  }`}
                  title="Auto-Attach: click an instrument below, then click any component or socket to connect automatically"
                >
                  <Link2 className="w-3 h-3" />
                  <span>Auto-Attach: {isAutoAttachEnabled ? "ON" : "OFF"}</span>
                </button>
              </div>
              <div className="text-[11px] text-slate-400">
                Snap Oscilloscope, DMM, Signal Generator, Voltmeter, Ammeter, Ohmmeter, Wattmeter, or Logic Probe to any node while keeping circuit visible
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => {
                if (isAutoAttachEnabled && !isScopeActive && components.length > 0) {
                  setActiveAutoAttachTarget({ kind: "SCOPE_CH1" });
                } else {
                  setIsScopeActive((v) => !v);
                }
              }}
              className={`px-2.5 py-1.5 rounded-xl border font-bold cursor-pointer flex items-center gap-1 transition-colors ${
                isScopeActive
                  ? "bg-amber-400 text-slate-950 border-amber-300"
                  : activeAutoAttachTarget?.kind === "SCOPE_CH1"
                  ? "bg-amber-500/30 text-amber-200 border-amber-400 ring-1 ring-amber-400"
                  : "bg-slate-900 hover:bg-slate-800 text-amber-300 border-amber-500/40"
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isScopeActive ? "Oscilloscope (On)" : "Install Oscilloscope"}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (isAutoAttachEnabled && !isDmmActive && components.length > 0) {
                  setActiveAutoAttachTarget({ kind: "DMM" });
                } else {
                  setIsDmmActive((v) => !v);
                }
              }}
              className={`px-2.5 py-1.5 rounded-xl border font-bold cursor-pointer flex items-center gap-1 transition-colors ${
                isDmmActive
                  ? "bg-cyan-400 text-slate-950 border-cyan-300"
                  : activeAutoAttachTarget?.kind === "DMM"
                  ? "bg-cyan-500/30 text-cyan-200 border-cyan-400 ring-1 ring-cyan-400"
                  : "bg-slate-900 hover:bg-slate-800 text-cyan-300 border-cyan-500/40"
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isDmmActive ? "DMM (On)" : "Install DMM"}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (isAutoAttachEnabled && !isSigGenActive && components.length > 0) {
                  setActiveAutoAttachTarget({ kind: "SIGGEN" });
                } else {
                  setIsSigGenActive((v) => !v);
                }
              }}
              className={`px-2.5 py-1.5 rounded-xl border font-bold cursor-pointer flex items-center gap-1 transition-colors ${
                isSigGenActive
                  ? "bg-orange-400 text-slate-950 border-orange-300"
                  : activeAutoAttachTarget?.kind === "SIGGEN"
                  ? "bg-orange-500/30 text-orange-200 border-orange-400 ring-1 ring-orange-400"
                  : "bg-slate-900 hover:bg-slate-800 text-orange-300 border-orange-500/40"
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isSigGenActive ? "SigGen (On)" : "SigGen (XFG1)"}</span>
            </button>
            <button
              type="button"
              onClick={() => handleInstallPme("VOLTMETER")}
              className={`px-2.5 py-1.5 rounded-xl border font-bold cursor-pointer flex items-center gap-1 ${
                activeAutoAttachTarget?.kind === "PME" && activeAutoAttachTarget.type === "VOLTMETER"
                  ? "bg-sky-500/30 text-sky-100 border-sky-400 ring-1 ring-sky-400"
                  : "bg-slate-900 hover:bg-slate-800 text-sky-300 border-sky-500/40"
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Voltmeter</span>
            </button>
            <button
              type="button"
              onClick={() => handleInstallPme("AMMETER")}
              className={`px-2.5 py-1.5 rounded-xl border font-bold cursor-pointer flex items-center gap-1 ${
                activeAutoAttachTarget?.kind === "PME" && activeAutoAttachTarget.type === "AMMETER"
                  ? "bg-amber-500/30 text-amber-100 border-amber-400 ring-1 ring-amber-400"
                  : "bg-slate-900 hover:bg-slate-800 text-amber-300 border-amber-500/40"
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Ammeter</span>
            </button>
            <button
              type="button"
              onClick={() => handleInstallPme("OHMMETER")}
              className={`px-2.5 py-1.5 rounded-xl border font-bold cursor-pointer flex items-center gap-1 ${
                activeAutoAttachTarget?.kind === "PME" && activeAutoAttachTarget.type === "OHMMETER"
                  ? "bg-purple-500/30 text-purple-100 border-purple-400 ring-1 ring-purple-400"
                  : "bg-slate-900 hover:bg-slate-800 text-purple-300 border-purple-500/40"
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Ohmmeter</span>
            </button>
            <button
              type="button"
              onClick={() => handleInstallPme("POWER_METER")}
              className={`px-2.5 py-1.5 rounded-xl border font-bold cursor-pointer flex items-center gap-1 ${
                activeAutoAttachTarget?.kind === "PME" && activeAutoAttachTarget.type === "POWER_METER"
                  ? "bg-emerald-500/30 text-emerald-100 border-emerald-400 ring-1 ring-emerald-400"
                  : "bg-slate-900 hover:bg-slate-800 text-emerald-300 border-emerald-500/40"
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Wattmeter</span>
            </button>
            <button
              type="button"
              onClick={() => handleInstallPme("LOGIC_PROBE")}
              className={`px-2.5 py-1.5 rounded-xl border font-bold cursor-pointer flex items-center gap-1 ${
                activeAutoAttachTarget?.kind === "PME" && activeAutoAttachTarget.type === "LOGIC_PROBE"
                  ? "bg-pink-500/30 text-pink-100 border-pink-400 ring-1 ring-pink-400"
                  : "bg-slate-900 hover:bg-slate-800 text-pink-300 border-pink-500/40"
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Logic Probe</span>
            </button>
            <button
              type="button"
              onClick={handleInstallPmeKit}
              className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border border-emerald-400/50 font-bold cursor-pointer flex items-center gap-1"
              title="Install Oscilloscope + DMM + Voltmeter + Ammeter + Wattmeter wired to your circuit"
            >
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              <span>Install Full PME Kit</span>
            </button>
            <button
              type="button"
              onClick={() => setShowPmeRulesStrip((v) => !v)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 font-bold cursor-pointer flex items-center gap-1"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              <span>PME Rules</span>
            </button>
            <button
              type="button"
              onClick={() => setIsDockCollapsed((v) => !v)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-bold cursor-pointer flex items-center gap-1"
              title="Collapse or expand instrument dock"
            >
              {isDockCollapsed ? <ChevronDown className="w-3.5 h-3.5 text-cyan-300" /> : <ChevronUp className="w-3.5 h-3.5 text-cyan-300" />}
              <span>{isDockCollapsed ? "Expand" : "Collapse"}</span>
            </button>
          </div>
        </div>

        {!isDockCollapsed && (
          <div
            className="overflow-y-auto pr-1 space-y-4"
            style={{ maxHeight: `${dockHeightPx}px` }}
          >

        {/* Collapsible PME Metrology Rules Strip */}
        {showPmeRulesStrip && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5 bg-slate-950/90 border border-slate-800 rounded-xl p-3 text-[11px]">
            <div className="p-2 rounded-lg border border-sky-500/30 bg-sky-950/20">
              <div className="font-bold text-sky-300">VOLTMETER (Parallel)</div>
              <div className="text-slate-400 mt-0.5">Connect Red (+) and Black (−) across component terminals (~10MΩ). Never series.</div>
            </div>
            <div className="p-2 rounded-lg border border-amber-500/30 bg-amber-950/20">
              <div className="font-bold text-amber-300">AMMETER (Series / Branch)</div>
              <div className="text-slate-400 mt-0.5">Clamps inline with a component branch (~0.05Ω shunt) to read loop current in mA.</div>
            </div>
            <div className="p-2 rounded-lg border border-purple-500/30 bg-purple-950/20">
              <div className="font-bold text-purple-300">OHMMETER (Power OFF)</div>
              <div className="text-slate-400 mt-0.5">Pause simulation before measuring passive resistance (Ω/kΩ) to avoid live-rail skew.</div>
            </div>
            <div className="p-2 rounded-lg border border-emerald-500/30 bg-emerald-950/20">
              <div className="font-bold text-emerald-300">WATTMETER &amp; SCOPE</div>
              <div className="text-slate-400 mt-0.5">Wattmeter computes P = ΔV·I (mW). DSO Scope captures transient traces with CSV export.</div>
            </div>
          </div>
        )}

        {/* Active XMM1 Multi-Mode Digital Multimeter Card */}
        {isDmmActive && dmmReading && (
          <div className="bg-[#080d18] border border-cyan-500/50 rounded-xl p-3.5 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-cyan-950 border border-cyan-700 text-cyan-300 font-bold text-xs">
                  XMM1 · MULTI-MODE DMM
                </span>
                <div className="flex flex-wrap items-center gap-1 bg-slate-900 border border-slate-700 rounded-lg p-0.5 text-[10.5px]">
                  {(
                    [
                      { id: "VDC", label: "DC V" },
                      { id: "VAC", label: "AC V~" },
                      { id: "IDC_MA", label: "DC mA" },
                      { id: "OHMS", label: "Ω Res" },
                      { id: "CONTINUITY", label: "Cont." },
                      { id: "DIODE", label: "Diode" },
                    ] as const
                  ).map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setDmmMode(m.id)}
                      className={`px-2 py-0.5 rounded font-bold cursor-pointer transition-colors ${
                        dmmMode === m.id
                          ? "bg-cyan-500 text-slate-950"
                          : "text-slate-300 hover:text-white"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={() => setActiveAutoAttachTarget({ kind: "DMM" })}
                  className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-400/50 font-bold cursor-pointer flex items-center gap-1"
                  title="Auto-Attach DMM across any clicked component or hole"
                >
                  <Link2 className="w-3 h-3" />
                  <span>Auto-Attach</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setActiveProbeToPlace(activeProbeToPlace === "DMM_RED" ? null : "DMM_RED")
                  }
                  className={`px-2.5 py-1 rounded-lg border font-bold cursor-pointer ${
                    activeProbeToPlace === "DMM_RED"
                      ? "bg-rose-500 text-white border-rose-300"
                      : "bg-slate-900 text-rose-300 border-rose-500/40 hover:bg-slate-800"
                  }`}
                >
                  Red (+): {probeRedHole ? formatCompactHole(probeRedHole) : "None"} · Snap
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setActiveProbeToPlace(activeProbeToPlace === "DMM_BLACK" ? null : "DMM_BLACK")
                  }
                  className={`px-2.5 py-1 rounded-lg border font-bold cursor-pointer ${
                    activeProbeToPlace === "DMM_BLACK"
                      ? "bg-slate-200 text-slate-950 border-white"
                      : "bg-slate-900 text-slate-300 border-slate-600 hover:bg-slate-800"
                  }`}
                >
                  Black (−): {probeBlackHole ? formatCompactHole(probeBlackHole) : "None"} · Snap
                </button>
                <button
                  type="button"
                  onClick={() => setIsDmmActive(false)}
                  className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 border border-slate-700 cursor-pointer"
                  title="Uninstall DMM"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="px-4 py-2 rounded-xl bg-black border border-cyan-500/40 flex items-baseline gap-2.5">
                <span className="text-2xl font-black text-cyan-300 tabular-nums">
                  {dmmReading.formattedV}
                </span>
                <span className="text-xs text-cyan-500 font-bold">{dmmReading.unitLabel}</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-slate-300">
                  {dmmReading.statusText}
                </span>
                {dmmReading.continuity && (
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 font-bold">
                    CONTINUITY BEEP
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Active DSO-2000X Dual-Channel Oscilloscope Station (with CSV Export) */}
        {isScopeActive && (
          <div className="bg-[#080d18] border border-amber-500/45 rounded-xl p-3.5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-2.5 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <span className="text-xs sm:text-sm font-extrabold text-white tracking-wider uppercase">
                  DSO-2000X VIRTUAL OSCILLOSCOPE
                </span>
                <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-700 text-[10px] font-bold">
                  2-CHANNEL 1 GSa/s
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                <div className="flex items-center gap-1.5 bg-slate-900 px-2.5 py-1 rounded-xl border border-yellow-500/40">
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                  <span className="text-yellow-400 font-bold">CH1:</span>
                  <span className="text-slate-300">
                    {probeScopeCh1Hole ? formatCompactHole(probeScopeCh1Hole) : "Disconnected"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveAutoAttachTarget({ kind: "SCOPE_CH1" })}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer flex items-center gap-0.5 ${
                      activeAutoAttachTarget?.kind === "SCOPE_CH1"
                        ? "bg-cyan-400 text-slate-950"
                        : "bg-cyan-500/20 text-cyan-200 hover:bg-cyan-500/30"
                    }`}
                    title="Auto-Attach Scope CH1 to clicked component or hole"
                  >
                    <Link2 className="w-2.5 h-2.5" />
                    <span>Auto</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setActiveProbeToPlace(activeProbeToPlace === "SCOPE_CH1" ? null : "SCOPE_CH1")
                    }
                    className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                      activeProbeToPlace === "SCOPE_CH1"
                        ? "bg-yellow-400 text-slate-950"
                        : "bg-slate-800 text-yellow-300 hover:bg-slate-700"
                    }`}
                  >
                    {activeProbeToPlace === "SCOPE_CH1" ? "Click Hole..." : "Snap CH1"}
                  </button>
                  {probeScopeCh1Hole && (
                    <button
                      type="button"
                      onClick={() => setProbeScopeCh1Hole(null)}
                      className="text-slate-500 hover:text-rose-400 text-[10px] font-bold cursor-pointer"
                    >
                      Detach
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5 bg-slate-900 px-2.5 py-1 rounded-xl border border-cyan-500/40">
                  <div className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                  <span className="text-cyan-400 font-bold">CH2:</span>
                  <span className="text-slate-300">
                    {probeScopeCh2Hole ? formatCompactHole(probeScopeCh2Hole) : "Disconnected"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveAutoAttachTarget({ kind: "SCOPE_CH2" })}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer flex items-center gap-0.5 ${
                      activeAutoAttachTarget?.kind === "SCOPE_CH2"
                        ? "bg-cyan-400 text-slate-950"
                        : "bg-cyan-500/20 text-cyan-200 hover:bg-cyan-500/30"
                    }`}
                    title="Auto-Attach Scope CH2 to clicked component or hole"
                  >
                    <Link2 className="w-2.5 h-2.5" />
                    <span>Auto</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setActiveProbeToPlace(activeProbeToPlace === "SCOPE_CH2" ? null : "SCOPE_CH2")
                    }
                    className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                      activeProbeToPlace === "SCOPE_CH2"
                        ? "bg-cyan-400 text-slate-950"
                        : "bg-slate-800 text-cyan-300 hover:bg-slate-700"
                    }`}
                  >
                    {activeProbeToPlace === "SCOPE_CH2" ? "Click Hole..." : "Snap CH2"}
                  </button>
                  {probeScopeCh2Hole && (
                    <button
                      type="button"
                      onClick={() => setProbeScopeCh2Hole(null)}
                      className="text-slate-500 hover:text-rose-400 text-[10px] font-bold cursor-pointer"
                    >
                      Detach
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleExportScopeCsv}
                  className="px-2.5 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-cyan-500/40 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                  title="Download transient oscilloscope data points as CSV"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download CSV</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsScopeActive(false)}
                  className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 border border-slate-700 cursor-pointer"
                  title="Uninstall Oscilloscope"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Oscilloscope Grid Screen */}
            <div className="relative w-full h-40 bg-[#030712] border-2 border-slate-700 rounded-xl overflow-hidden p-2 flex flex-col justify-between">
              <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-30">
                <defs>
                  <pattern id="scope-screen-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#0e7490" strokeWidth="0.8" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#scope-screen-grid)" />
                <line x1="50%" y1="0" x2="50%" y2="100%" stroke="#22d3ee" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="0" y1="50%" x2="100%" y2="50%" stroke="#22d3ee" strokeWidth="1" strokeDasharray="3 3" />
              </svg>

              <div className="relative z-10 w-full h-full flex items-center">
                <svg className="w-full h-28 overflow-visible">
                  {probeScopeCh1Hole && (
                    <path
                      d={Array.from({ length: 100 }, (_, i) => {
                        const x = (i / 99) * 500;
                        const t = i * 0.15 + (scopeRunning ? scopeTick * 0.2 : 0);
                        let yVal = 0;
                        if (ch1Signal.waveType === "SQUARE") {
                          yVal = (Math.sin(t * 2) >= 0 ? 1 : -1) * (28 / scopeVDivCh1);
                        } else if (ch1Signal.waveType === "SINE") {
                          yVal = Math.sin(t * 2.2) * (24 / scopeVDivCh1);
                        } else if (ch1Signal.waveType === "SAWTOOTH") {
                          yVal = (((t * 1.5) % 3) - 1.5) * (20 / scopeVDivCh1);
                        } else if (ch1Signal.waveType === "RIPPLE") {
                          yVal = Math.abs(Math.sin(t * 3)) * (24 / scopeVDivCh1);
                        } else {
                          yVal = (ch1Signal.vDc / scopeVDivCh1) * 8;
                        }
                        return `${i === 0 ? "M" : "L"} ${x} ${56 - yVal}`;
                      }).join(" ")}
                      fill="none"
                      stroke="#facc15"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      filter="drop-shadow(0 0 5px rgba(250, 204, 21, 0.8))"
                    />
                  )}
                  {probeScopeCh2Hole && (
                    <path
                      d={Array.from({ length: 100 }, (_, i) => {
                        const x = (i / 99) * 500;
                        const t = i * 0.15 + (scopeRunning ? scopeTick * 0.2 : 0) + 1.2;
                        let yVal = 0;
                        if (ch2Signal.waveType === "SQUARE") {
                          yVal = (Math.cos(t * 2) >= 0 ? 1 : -1) * (24 / scopeVDivCh2);
                        } else if (ch2Signal.waveType === "SINE") {
                          yVal = Math.cos(t * 2.2) * (20 / scopeVDivCh2);
                        } else if (ch2Signal.waveType === "SAWTOOTH") {
                          yVal = (((t * 1.5 + 1) % 3) - 1.5) * (18 / scopeVDivCh2);
                        } else if (ch2Signal.waveType === "RIPPLE") {
                          yVal = Math.abs(Math.cos(t * 3)) * (20 / scopeVDivCh2);
                        } else {
                          yVal = (ch2Signal.vDc / scopeVDivCh2) * 8;
                        }
                        return `${i === 0 ? "M" : "L"} ${x} ${74 - yVal}`;
                      }).join(" ")}
                      fill="none"
                      stroke="#22d3ee"
                      strokeWidth="2"
                      strokeDasharray="4 2"
                      strokeLinecap="round"
                      filter="drop-shadow(0 0 5px rgba(34, 211, 238, 0.7))"
                    />
                  )}
                </svg>
              </div>

              <div className="relative z-10 flex flex-wrap items-center justify-between text-[11px] bg-slate-950/85 px-3 py-1 rounded-lg border border-slate-800">
                <div className="flex items-center gap-4">
                  <span className="text-yellow-400 font-bold">
                    CH1: {probeScopeCh1Hole ? `${ch1Signal.vDc.toFixed(2)}V (Vpp=${(ch1Signal.vpp || ch1Signal.vDc).toFixed(2)}V)` : "OFF"}
                  </span>
                  <span className="text-cyan-400 font-bold">
                    CH2: {probeScopeCh2Hole ? `${ch2Signal.vDc.toFixed(2)}V (Vpp=${(ch2Signal.vpp || ch2Signal.vDc).toFixed(2)}V)` : "OFF"}
                  </span>
                  <span className="text-slate-300">TIME: {scopeTimebaseMs}ms/div</span>
                </div>
                <button
                  type="button"
                  onClick={() => setScopeRunning(!scopeRunning)}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold cursor-pointer"
                >
                  {scopeRunning ? "STOP" : "RUN"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Installed PME Modules Grid (Voltmeter, Ammeter, Ohmmeter, Wattmeter, Logic Probe) */}
        {installedPmes.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {installedPmes.map((pme) => {
              const info = computePmeReading(pme);
              const accentClass =
                pme.type === "VOLTMETER"
                  ? "border-sky-500/50 text-sky-300"
                  : pme.type === "AMMETER"
                  ? "border-amber-500/50 text-amber-300"
                  : pme.type === "OHMMETER"
                  ? "border-purple-500/50 text-purple-300"
                  : pme.type === "POWER_METER"
                  ? "border-emerald-500/50 text-emerald-300"
                  : "border-pink-500/50 text-pink-300";
              return (
                <div
                  key={pme.id}
                  className={`bg-[#080d18] border rounded-xl p-3 space-y-2 ${accentClass}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs uppercase">{pme.label}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300">
                        {pme.type.replace("_", " ")}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setInstalledPmes((prev) => prev.filter((item) => item.id !== pme.id))
                      }
                      className="text-slate-500 hover:text-rose-400 cursor-pointer"
                      title="Remove PME"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Digital PME Readout */}
                  <div className="bg-black border border-slate-800 rounded-lg px-3 py-2 flex items-baseline justify-between gap-2">
                    <span className="text-xl font-black tabular-nums">{info.reading}</span>
                    <span className="text-[10px] text-slate-400 truncate">{info.subtext}</span>
                  </div>

                  {/* Attach to Circuit Component or Re-Snap Hole Probes */}
                  <div className="flex flex-wrap items-center justify-between gap-1.5 text-[10.5px]">
                    <select
                      value={pme.targetCompId || ""}
                      onChange={(e) => handleAttachPmeToComponent(pme.id, e.target.value)}
                      className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-slate-200 focus:outline-none cursor-pointer max-w-[140px]"
                      title="Attach PME directly across any laid component"
                    >
                      <option value="">Custom Hole Probes</option>
                      {components.map((c) => (
                        <option key={c.id} value={c.id}>
                          Attach: {c.label}
                        </option>
                      ))}
                    </select>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          setActivePmeProbePick(
                            activePmeProbePick?.pmeId === pme.id && activePmeProbePick.terminal === "POS"
                              ? null
                              : { pmeId: pme.id, terminal: "POS" }
                          )
                        }
                        className={`px-2 py-0.5 rounded border font-bold cursor-pointer ${
                          activePmeProbePick?.pmeId === pme.id && activePmeProbePick.terminal === "POS"
                            ? "bg-cyan-400 text-slate-950 border-cyan-300"
                            : "bg-slate-900 text-slate-300 border-slate-700 hover:text-white"
                        }`}
                      >
                        +: {formatCompactHole(pme.probePosHole)}
                      </button>
                      {pme.probeNegHole && (
                        <button
                          type="button"
                          onClick={() =>
                            setActivePmeProbePick(
                              activePmeProbePick?.pmeId === pme.id && activePmeProbePick.terminal === "NEG"
                                ? null
                                : { pmeId: pme.id, terminal: "NEG" }
                            )
                          }
                          className={`px-2 py-0.5 rounded border font-bold cursor-pointer ${
                            activePmeProbePick?.pmeId === pme.id && activePmeProbePick.terminal === "NEG"
                              ? "bg-cyan-400 text-slate-950 border-cyan-300"
                              : "bg-slate-900 text-slate-300 border-slate-700 hover:text-white"
                          }`}
                        >
                          −: {formatCompactHole(pme.probeNegHole)}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Metrology Status Footer */}
                  <div
                    className={`flex items-center gap-1.5 text-[10px] px-2 py-1 rounded border ${
                      info.ruleStatus === "OK"
                        ? "bg-emerald-950/30 border-emerald-500/30 text-emerald-300"
                        : "bg-amber-950/30 border-amber-500/30 text-amber-300"
                    }`}
                  >
                    {info.ruleStatus === "OK" ? (
                      <ShieldCheck className="w-3 h-3 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-3 h-3 shrink-0" />
                    )}
                    <span>{info.ruleLabel}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Active XFG1 Signal Generator Card */}
        {isSigGenActive && (
          <div className="bg-[#080d18] border border-orange-500/50 rounded-xl p-3.5 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-orange-950 border border-orange-700 text-orange-300 font-bold text-xs">
                  XFG1 · SIGNAL GENERATOR
                </span>
                <div className="flex items-center gap-1 bg-slate-900 border border-slate-700 rounded-lg p-0.5 text-[10.5px]">
                  {(["SINE", "SQUARE", "TRIANGLE"] as const).map((wf) => (
                    <button
                      key={wf}
                      type="button"
                      onClick={() => setSigGenWaveform(wf)}
                      className={`px-2 py-0.5 rounded font-bold cursor-pointer ${
                        sigGenWaveform === wf
                          ? "bg-orange-400 text-slate-950"
                          : "text-slate-300 hover:text-white"
                      }`}
                    >
                      {wf}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={() => setActiveAutoAttachTarget({ kind: "SIGGEN" })}
                  className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-400/50 font-bold cursor-pointer flex items-center gap-1"
                  title="Auto-Attach XFG1 to any clicked component or hole"
                >
                  <Link2 className="w-3 h-3" />
                  <span>Auto-Attach</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setActiveProbeToPlace(activeProbeToPlace === "SIGGEN" ? null : "SIGGEN")
                  }
                  className={`px-2.5 py-1 rounded-lg border font-bold cursor-pointer ${
                    activeProbeToPlace === "SIGGEN"
                      ? "bg-orange-400 text-slate-950 border-orange-300"
                      : "bg-slate-900 text-orange-300 border-orange-500/40 hover:bg-slate-800"
                  }`}
                >
                  Out: {sigGenHole ? formatCompactHole(sigGenHole) : "None"} · Snap
                </button>
                <button
                  type="button"
                  onClick={() => setIsSigGenActive(false)}
                  className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 border border-slate-700 cursor-pointer"
                  title="Uninstall Signal Generator"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-black border border-slate-800 rounded-lg px-3 py-2 flex items-center justify-between gap-2">
                <span className="text-slate-400">Freq (Hz):</span>
                <input
                  type="range"
                  min={0.5}
                  max={50}
                  step={0.5}
                  value={sigGenFreqHz}
                  onChange={(e) => setSigGenFreqHz(parseFloat(e.target.value) || 1)}
                  className="w-28 accent-orange-400 cursor-pointer"
                />
                <span className="font-bold text-orange-300 tabular-nums w-14 text-right">
                  {sigGenFreqHz.toFixed(1)} Hz
                </span>
              </div>
              <div className="bg-black border border-slate-800 rounded-lg px-3 py-2 flex items-center justify-between gap-2">
                <span className="text-slate-400">Amplitude:</span>
                <input
                  type="range"
                  min={0.5}
                  max={12}
                  step={0.5}
                  value={sigGenAmpVpp}
                  onChange={(e) => setSigGenAmpVpp(parseFloat(e.target.value) || 5)}
                  className="w-28 accent-orange-400 cursor-pointer"
                />
                <span className="font-bold text-orange-300 tabular-nums w-16 text-right">
                  {sigGenAmpVpp.toFixed(1)} Vpp
                </span>
              </div>
            </div>
          </div>
        )}
          </div>
        )}
        </div>
      </div>

      {/* Coordinate-to-SPICE Solver Node List Panel */}
      <div className="bg-[#0f172a] border border-cyan-500/30 rounded-2xl p-4 shadow-xl space-y-3 font-mono">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <span className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
              Coordinate-Mapped SPICE Solver Node List
            </span>
            <span className="px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-700/60 text-[10px] text-cyan-300 font-semibold">
              {simResults.nodeList.length} Active Nodes · Live MNA Sync
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsSpiceNetlistOpen((v) => !v)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[11px] text-slate-300 cursor-pointer"
          >
            {isSpiceNetlistOpen ? (
              <>
                <ChevronUp className="w-3.5 h-3.5 text-cyan-400" />
                <span>Hide Netlist Table</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5 text-cyan-400" />
                <span>Show Netlist Table</span>
              </>
            )}
          </button>
        </div>

        {isSpiceNetlistOpen && (
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-[#080d18]">
            <table className="w-full text-xs border-collapse tabular-nums">
              <thead>
                <tr className="bg-[#0d1526] text-slate-400 border-b border-slate-800 text-[11px]">
                  <th className="py-2 px-3 text-left">SPICE Node</th>
                  <th className="py-2 px-3 text-right">MNA Voltage</th>
                  <th className="py-2 px-3 text-left">Breadboard Strips</th>
                  <th className="py-2 px-3 text-left">Placed Pin Coordinates (Hole · 3D X,Z)</th>
                  <th className="py-2 px-3 text-right">Quick Probe</th>
                </tr>
              </thead>
              <tbody>
                {simResults.nodeList.map((node) => {
                  const firstPin = node.connections[0]?.hole;
                  const isGnd = node.spiceNodeName.startsWith("0 ");
                  const isVcc = node.spiceNodeName.startsWith("VCC");
                  return (
                    <tr
                      key={node.spiceNodeName}
                      className="border-b border-slate-800/70 last:border-b-0 hover:bg-slate-900/60"
                    >
                      <td className="py-2 px-3 font-bold whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded border text-[11px] ${
                            isGnd
                              ? "bg-slate-900 border-slate-600 text-slate-300"
                              : isVcc
                              ? "bg-rose-950/70 border-rose-500/50 text-rose-300"
                              : "bg-cyan-950/70 border-cyan-500/40 text-cyan-300"
                          }`}
                        >
                          {node.spiceNodeName}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-emerald-300 whitespace-nowrap">
                        {simRunning ? `${node.voltage.toFixed(2)} V` : "PAUSED"}
                      </td>
                      <td className="py-2 px-3 text-[11px] text-slate-400">
                        {node.stripKeys.join(" ↔ ")}
                      </td>
                      <td className="py-2 px-3 text-[11px] text-slate-200">
                        {node.connections.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {node.connections.map((conn, idx) => (
                              <span
                                key={`${conn.compId}-${conn.pinName}-${idx}`}
                                className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700/80 text-[10px]"
                                title={`2D SVG (${Math.round(conn.svgXY.x)}, ${Math.round(conn.svgXY.y)}) · 3D World (${conn.worldXZ.x.toFixed(2)}, ${conn.worldXZ.z.toFixed(2)})`}
                              >
                                <span className="text-amber-300 font-bold">{conn.compId}.{conn.pinName}</span>
                                <span className="text-slate-400"> @ </span>
                                <span className="text-cyan-300">{formatCompactHole(conn.hole)}</span>
                                <span className="text-slate-500"> ({conn.worldXZ.x.toFixed(1)},{conn.worldXZ.z.toFixed(1)})</span>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-500">Power bus rail tie</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right whitespace-nowrap">
                        {firstPin ? (
                          <button
                            type="button"
                            onClick={() => {
                              setProbeScopeCh1Hole(firstPin);
                              setProbeRedHole(firstPin);
                              setIsScopeActive(true);
                            }}
                            className="px-2 py-0.5 rounded bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/50 text-[10px] font-bold text-cyan-200 cursor-pointer"
                          >
                            Snap CH1
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-600">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
