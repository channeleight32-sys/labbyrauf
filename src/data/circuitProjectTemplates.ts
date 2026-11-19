import { PresetNodeDef, PresetWireDef } from "./logicSpecs";

export type TemplateCategory =
  | "ALL"
  | "Oscillators & Timing"
  | "74LS Digital & Counters"
  | "Analog & Amplifiers"
  | "Power & Switching";

export interface CircuitProjectTemplate {
  id: string;
  name: string;
  shortTag: string;
  category: Exclude<TemplateCategory, "ALL">;
  difficulty: "Foundational" | "Intermediate" | "Advanced";
  summary: string;
  theoryNote: string;
  expectedBehavior: string;
  defaultFreqHz: number;
  autoStartClock: boolean;
  bom: string[];
  nodes: PresetNodeDef[];
  wires: PresetWireDef[];
}

export const CIRCUIT_PROJECT_TEMPLATES: CircuitProjectTemplate[] = [
  {
    id: "ne555-astable-oscillator",
    name: "Standard 555 Astable Oscillator",
    shortTag: "NE555 · RC ASTABLE",
    category: "Oscillators & Timing",
    difficulty: "Foundational",
    summary:
      "Classic NE555 astable multivibrator with R1/R2 charge-discharge timing network, electrolytic capacitor, and current-limited status LED.",
    theoryNote:
      "f = 1.44 / ((R1 + 2·R2) · C1). R1 (1kΩ) and R2 (10kΩ) charge C1 (47µF) toward 2/3 VCC before DISCH pulls down to 1/3 VCC.",
    expectedBehavior:
      "Continuous ~1.5 Hz square-wave pulse train on Pin 3 (OUT), synced with C1 charge/discharge cycles and LED flash cadence.",
    defaultFreqHz: 1.5,
    autoStartClock: true,
    bom: ["NE555P Timer", "1kΩ & 10kΩ Timing Resistors", "47µF Electrolytic Cap", "330Ω Limiter", "Red LED", "+5V Rail & GND"],
    nodes: [
      { type: "VCC_5V", x: 60, y: 120, label: "+5V VCC" },
      {
        type: "RES",
        x: 200,
        y: 60,
        label: "R1 1kΩ",
        analogParams: { resistanceOhms: 1000, formattedValue: "1.0 kΩ" },
      },
      {
        type: "RES",
        x: 200,
        y: 155,
        label: "R2 10kΩ",
        analogParams: { resistanceOhms: 10000, formattedValue: "10 kΩ" },
      },
      {
        type: "CAP_POL",
        x: 200,
        y: 260,
        label: "C1 47µF",
        analogParams: { capacitanceUf: 47, frequencyHz: 1.5, formattedValue: "47 µF" },
      },
      {
        type: "TIMER_555",
        x: 390,
        y: 120,
        label: "NE555 Astable",
        analogParams: { frequencyHz: 1.5, formattedValue: "1.5 Hz Astable" },
      },
      {
        type: "RES",
        x: 580,
        y: 125,
        label: "R3 330Ω",
        analogParams: { resistanceOhms: 330, formattedValue: "330 Ω" },
      },
      { type: "LED_RED", x: 730, y: 125, label: "OUT LED" },
      { type: "GND", x: 730, y: 265, label: "GND" },
    ],
    wires: [
      [0, 0, 1, 0],
      [1, 0, 2, 0],
      [2, 0, 3, 0],
      [3, 0, 4, 0],
      [3, 0, 4, 1],
      [0, 0, 4, 2],
      [4, 0, 5, 0],
      [5, 0, 6, 0],
      [6, 0, 7, 0],
      [3, 0, 7, 0],
    ],
  },
  {
    id: "74ls161-binary-counter",
    name: "74LS161 4-Bit Binary Counter + 7-Seg",
    shortTag: "74LS161 · MOD-16",
    category: "74LS Digital & Counters",
    difficulty: "Foundational",
    summary:
      "Synchronous 4-bit presettable binary counter (SN74LS161) driven by a TTL clock generator, decoded to 4 binary LED indicators and a 7-segment display.",
    theoryNote:
      "Counts 0000 → 1111 on each rising CLK edge when CLR̅=1, LOAD̅=1, ENP=1, ENT=1. RCO asserts on count 15 (1111).",
    expectedBehavior:
      "Binary outputs Q0–Q3 increment sequentially from 0 to 15 in lockstep with the 7447 BCD-to-7-Segment readout.",
    defaultFreqHz: 2,
    autoStartClock: true,
    bom: ["TTL Clock Gen", "SN74LS161AN Counter", "74LS47 BCD Decoder", "7-Segment Display", "4× Binary LEDs (Q0–Q3)"],
    nodes: [
      { type: "CLOCK", x: 40, y: 120, value: 0, label: "SYS_CLK" },
      { type: "INPUT", x: 40, y: 220, value: 1, label: "CLR̅ / EN" },
      { type: "INPUT", x: 40, y: 310, value: 1, label: "LOAD̅" },
      { type: "74161", x: 220, y: 110, label: "74LS161" },
      { type: "7447", x: 460, y: 90, label: "74LS47" },
      { type: "7SEG", x: 690, y: 80, label: "HEX/BCD" },
      { type: "OUTPUT", x: 470, y: 310, label: "Q0 (LSB)" },
      { type: "OUTPUT", x: 550, y: 310, label: "Q1" },
      { type: "OUTPUT", x: 630, y: 310, label: "Q2" },
      { type: "OUTPUT", x: 710, y: 310, label: "Q3 (MSB)" },
    ],
    wires: [
      [0, 0, 3, 4],
      [1, 0, 3, 5],
      [2, 0, 3, 6],
      [1, 0, 3, 7],
      [1, 0, 3, 8],
      [3, 0, 4, 0],
      [3, 1, 4, 1],
      [3, 2, 4, 2],
      [3, 3, 4, 3],
      [4, 0, 5, 0],
      [4, 1, 5, 1],
      [4, 2, 5, 2],
      [4, 3, 5, 3],
      [4, 4, 5, 4],
      [4, 5, 5, 5],
      [4, 6, 5, 6],
      [3, 0, 6, 0],
      [3, 1, 7, 0],
      [3, 2, 8, 0],
      [3, 3, 9, 0],
    ],
  },
  {
    id: "bc547-bjt-amplifier",
    name: "Basic Common-Emitter BJT Amplifier Stage",
    shortTag: "BC547 · CLASS-A AMP",
    category: "Analog & Amplifiers",
    difficulty: "Intermediate",
    summary:
      "Single-stage NPN BC547 common-emitter voltage amplifier with AC signal injection, input/output coupling capacitors, voltage-divider bias, and collector load.",
    theoryNote:
      "Q-point stabilized by R_B1/R_B2 and R_E. Small-signal AC input couples via C_IN to base; inverted amplified signal appears across R_C & R_LOAD.",
    expectedBehavior:
      "Base biased near ~1.8V (V_BE ≈ 0.7V), active-region collector current Ic flowing through Rc, and live AC waveform coupling across C_IN/C_OUT.",
    defaultFreqHz: 50,
    autoStartClock: false,
    bom: ["AC Signal Source (1Vpp)", "VCC +12V Supply", "BC547 NPN (hFE=250)", "C_IN 10µF & C_OUT 10µF", "Bias/Load Resistors", "GND"],
    nodes: [
      {
        type: "AC_SINE",
        x: 40,
        y: 190,
        label: "V_IN AC",
        analogParams: { acVoltageV: 1.0, frequencyHz: 50, formattedValue: "1.0Vp 50Hz" },
      },
      {
        type: "CAP_NP",
        x: 200,
        y: 190,
        label: "C_IN 10µF",
        analogParams: { capacitanceUf: 10, frequencyHz: 50, formattedValue: "10 µF" },
      },
      { type: "VCC_12V", x: 200, y: 50, label: "+12V VCC" },
      {
        type: "RES",
        x: 340,
        y: 50,
        label: "R_C 2.2kΩ",
        analogParams: { resistanceOhms: 2200, formattedValue: "2.2 kΩ" },
      },
      {
        type: "RES",
        x: 340,
        y: 165,
        label: "R_B 22kΩ",
        analogParams: { resistanceOhms: 22000, formattedValue: "22 kΩ" },
      },
      {
        type: "BC547",
        x: 500,
        y: 120,
        label: "Q1 BC547",
        analogParams: { formattedValue: "β=250" },
      },
      {
        type: "CAP_POL",
        x: 680,
        y: 120,
        label: "C_OUT 47µF",
        analogParams: { capacitanceUf: 47, frequencyHz: 50, formattedValue: "47 µF" },
      },
      {
        type: "RES",
        x: 820,
        y: 120,
        label: "R_LOAD 10kΩ",
        analogParams: { resistanceOhms: 10000, formattedValue: "10 kΩ" },
      },
      { type: "GND", x: 500, y: 290, label: "GND" },
    ],
    wires: [
      [0, 0, 1, 0],
      [1, 0, 4, 0],
      [4, 0, 5, 0],
      [2, 0, 3, 0],
      [3, 0, 5, 1],
      [5, 1, 6, 0],
      [6, 0, 7, 0],
      [7, 0, 8, 0],
      [0, 1, 8, 0],
      [5, 0, 8, 0],
    ],
  },
  {
    id: "relay-flyback-driver",
    name: "BJT Relay Driver with Flyback Protection",
    shortTag: "RELAY · 1N4007 FLYBACK",
    category: "Power & Switching",
    difficulty: "Intermediate",
    summary:
      "Clocked NPN transistor low-side relay coil driver with 1N4007A inductive kickback clamp diode and dual NO/NC indicator loads.",
    theoryNote:
      "BC547 sinks coil current when base is driven HIGH; 1N4007A clamps reverse EMF spike at turn-off while SPDT contacts switch NO/NC LED loads.",
    expectedBehavior:
      "Relay coil energizes on every clock HIGH half-cycle, visibly pivoting the SPDT armature and alternating NO/NC LEDs.",
    defaultFreqHz: 1,
    autoStartClock: true,
    bom: ["TTL Clock Gen", "+5V VCC", "R_B 1kΩ", "BC547 NPN", "1N4007A Flyback", "SPDT Relay", "Red & Green LEDs", "GND"],
    nodes: [
      { type: "CLOCK", x: 40, y: 150, value: 1, label: "DRIVE_CLK" },
      {
        type: "RES",
        x: 180,
        y: 150,
        label: "R_B 1kΩ",
        analogParams: { resistanceOhms: 1000, formattedValue: "1.0 kΩ" },
      },
      { type: "BC547", x: 340, y: 140, label: "Q1 Driver" },
      { type: "VCC_5V", x: 340, y: 40, label: "+5V VCC" },
      { type: "DIODE_1N4007", x: 500, y: 45, label: "D1 Flyback" },
      { type: "RELAY_SPDT", x: 520, y: 150, label: "K1 SPDT" },
      { type: "LED_GREEN", x: 710, y: 120, label: "NO LOAD" },
      { type: "LED_RED", x: 710, y: 225, label: "NC LOAD" },
      { type: "GND", x: 520, y: 300, label: "GND" },
    ],
    wires: [
      [0, 0, 1, 0],
      [1, 0, 2, 0],
      [3, 0, 2, 1],
      [2, 0, 5, 0],
      [3, 0, 5, 2],
      [5, 0, 4, 0],
      [4, 0, 8, 0],
      [5, 0, 6, 0],
      [5, 1, 7, 0],
      [6, 0, 8, 0],
      [7, 0, 8, 0],
    ],
  },
  {
    id: "rc-lowpass-filter",
    name: "First-Order RC Low-Pass Filter",
    shortTag: "RC FILTER · fc ≈ 159Hz",
    category: "Analog & Amplifiers",
    difficulty: "Foundational",
    summary:
      "Passive first-order resistor-capacitor low-pass network excited by an AC sine generator with real-time transient & dielectric charge animation.",
    theoryNote:
      "Cutoff frequency fc = 1 / (2π · R · C). For R = 1kΩ and C = 1µF, fc ≈ 159.15 Hz with -20 dB/decade roll-off.",
    expectedBehavior:
      "Capacitor charges and discharges smoothly with source frequency; attach Oscilloscope probes across input and V_OUT to inspect phase lag.",
    defaultFreqHz: 50,
    autoStartClock: false,
    bom: ["AC Sine Gen (5Vpp 50Hz)", "1kΩ Series Resistor", "1µF Film Capacitor", "Output Node", "GND"],
    nodes: [
      {
        type: "AC_SINE",
        x: 60,
        y: 150,
        label: "AC 5Vpp 50Hz",
        analogParams: { acVoltageV: 5.0, frequencyHz: 50, formattedValue: "5.0Vp 50Hz" },
      },
      {
        type: "RES",
        x: 270,
        y: 135,
        label: "R1 1kΩ",
        analogParams: { resistanceOhms: 1000, formattedValue: "1.0 kΩ" },
      },
      {
        type: "CAP_NP",
        x: 470,
        y: 135,
        label: "C1 1µF",
        analogParams: { capacitanceUf: 1, frequencyHz: 50, formattedValue: "1.0 µF" },
      },
      { type: "GND", x: 470, y: 275, label: "GND" },
      { type: "OUTPUT", x: 670, y: 140, label: "V_OUT" },
    ],
    wires: [
      [0, 0, 1, 0],
      [1, 0, 2, 0],
      [2, 0, 3, 0],
      [0, 1, 3, 0],
      [1, 0, 4, 0],
    ],
  },
  {
    id: "lm7805-linear-psu",
    name: "LM7805 +5V Linear Regulated Power Supply",
    shortTag: "LM7805 · 12V → 5V",
    category: "Power & Switching",
    difficulty: "Foundational",
    summary:
      "Classic 12V DC-to-5V regulated power supply stage featuring input/output decoupling capacitors, LM7805 linear regulator, and pilot LED load.",
    theoryNote:
      "LM7805 maintains a tight 5.0V output for Vin ≥ 7.0V while input/output electrolytic capacitors suppress ripple and transient droop.",
    expectedBehavior:
      "Regulated +5.0V output rail drives a 330Ω current-limited green pilot LED with steady MNA branch current.",
    defaultFreqHz: 0,
    autoStartClock: false,
    bom: ["+12V DC Rail", "100µF Input Bulk Cap", "LM7805CT Regulator", "10µF Output Cap", "330Ω Resistor", "Green LED", "GND"],
    nodes: [
      { type: "VCC_12V", x: 50, y: 140, label: "+12V IN" },
      {
        type: "CAP_POL",
        x: 200,
        y: 135,
        label: "C_IN 100µF",
        analogParams: { capacitanceUf: 100, formattedValue: "100 µF" },
      },
      { type: "LM7805", x: 370, y: 130, label: "U1 LM7805" },
      {
        type: "CAP_POL",
        x: 540,
        y: 135,
        label: "C_OUT 10µF",
        analogParams: { capacitanceUf: 10, formattedValue: "10 µF" },
      },
      {
        type: "RES",
        x: 700,
        y: 135,
        label: "R_LED 330Ω",
        analogParams: { resistanceOhms: 330, formattedValue: "330 Ω" },
      },
      { type: "LED_GREEN", x: 850, y: 135, label: "5V PWR OK" },
      { type: "GND", x: 450, y: 290, label: "GND" },
    ],
    wires: [
      [0, 0, 1, 0],
      [1, 0, 2, 0],
      [2, 0, 3, 0],
      [3, 0, 4, 0],
      [4, 0, 5, 0],
      [5, 0, 6, 0],
      [1, 0, 6, 0],
      [3, 0, 6, 0],
    ],
  },
  {
    id: "lm741-comparator-stage",
    name: "LM741 Op-Amp Zero-Crossing Comparator",
    shortTag: "LM741 · COMPARATOR",
    category: "Analog & Amplifiers",
    difficulty: "Intermediate",
    summary:
      "Operational amplifier voltage comparator stage comparing a sinusoidal AC waveform against a DC reference to drive a threshold indicator LED.",
    theoryNote:
      "Open-loop LM741 saturates output HIGH (+Vsat) whenever V+ > V- and snaps LOW whenever V+ < V-.",
    expectedBehavior:
      "Output toggles between rails at the input signal frequency, driving the output LED and oscilloscope square-wave trace.",
    defaultFreqHz: 2,
    autoStartClock: true,
    bom: ["AC Sine Input", "V_REF Control", "UA741CN Op-Amp", "330Ω Limiter", "Green LED", "GND"],
    nodes: [
      {
        type: "AC_SINE",
        x: 50,
        y: 90,
        label: "V_IN+ AC",
        analogParams: { acVoltageV: 5, frequencyHz: 2, formattedValue: "5Vp 2Hz" },
      },
      { type: "INPUT", x: 50, y: 210, value: 0, label: "V_REF-" },
      { type: "OPAMP_741", x: 250, y: 120, label: "U1 LM741" },
      {
        type: "RES",
        x: 440,
        y: 125,
        label: "R_OUT 330Ω",
        analogParams: { resistanceOhms: 330, formattedValue: "330 Ω" },
      },
      { type: "LED_GREEN", x: 600, y: 125, label: "COMP OUT" },
      { type: "GND", x: 440, y: 270, label: "GND" },
    ],
    wires: [
      [0, 0, 2, 0],
      [1, 0, 2, 1],
      [2, 0, 3, 0],
      [3, 0, 4, 0],
      [4, 0, 5, 0],
      [0, 1, 5, 0],
    ],
  },
  {
    id: "74ls193-updown-counter",
    name: "74LS193 Synchronous Up/Down Counter",
    shortTag: "74LS193 · BIDIR COUNTER",
    category: "74LS Digital & Counters",
    difficulty: "Intermediate",
    summary:
      "Dual-clock 4-bit up/down synchronous binary counter with active-LOW parallel load, master reset, terminal count indicators, and 7-segment readout.",
    theoryNote:
      "Rising edge on UP increments count (0→15) with TCU pulsing at 15; toggling CLR resets to 0000.",
    expectedBehavior:
      "Auto-clocked UP input steps 4-bit LEDs and 7-segment display continuously through 0–F.",
    defaultFreqHz: 2,
    autoStartClock: true,
    bom: ["Clock Generator", "CLR & LOAD̅ Controls", "SN74LS193N Counter", "7447 Decoder", "7-Seg + 4× Outputs"],
    nodes: [
      { type: "CLOCK", x: 40, y: 110, value: 0, label: "UP_CLK" },
      { type: "INPUT", x: 40, y: 200, value: 0, label: "CLR" },
      { type: "INPUT", x: 40, y: 285, value: 1, label: "LOAD̅" },
      { type: "74193", x: 210, y: 100, label: "74LS193" },
      { type: "7447", x: 450, y: 90, label: "74LS47" },
      { type: "7SEG", x: 680, y: 80, label: "COUNT" },
      { type: "OUTPUT", x: 460, y: 300, label: "Q0" },
      { type: "OUTPUT", x: 540, y: 300, label: "Q1" },
      { type: "OUTPUT", x: 620, y: 300, label: "Q2" },
      { type: "OUTPUT", x: 700, y: 300, label: "Q3" },
    ],
    wires: [
      [0, 0, 3, 4],
      [1, 0, 3, 6],
      [2, 0, 3, 7],
      [3, 0, 4, 0],
      [3, 1, 4, 1],
      [3, 2, 4, 2],
      [3, 3, 4, 3],
      [4, 0, 5, 0],
      [4, 1, 5, 1],
      [4, 2, 5, 2],
      [4, 3, 5, 3],
      [4, 4, 5, 4],
      [4, 5, 5, 5],
      [4, 6, 5, 6],
      [3, 0, 6, 0],
      [3, 1, 7, 0],
      [3, 2, 8, 0],
      [3, 3, 9, 0],
    ],
  },
];
