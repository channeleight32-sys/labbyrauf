/**
 * Distinct Foundational & Benchmark Electronics Projects
 * Each entry provides a complete, electrically authentic schematic configuration,
 * netlist connections, BOM, documentation, and dynamic MNA-aligned compute model.
 */

import type {
  InteractiveProject,
  ProjectBOMItem,
  ProjectCategory,
  SchematicComponent,
  SchematicWire,
} from "../types/interactiveSchematic";

function makeSupply(id: string, voltage: number, name = "DC Bench Power Supply"): SchematicComponent {
  return {
    id,
    refDes: "V1",
    name,
    type: "VOLTAGE_SOURCE",
    nominalValue: voltage,
    unit: "V",
    displayValue: `${voltage.toFixed(1)} V DC`,
    editable: true,
    minVal: 1,
    maxVal: 30,
    stepVal: 0.5,
    packageType: "Lab Bench PSU",
    partNumber: "GPD-3303S",
    rating: "0–30V DC Regulated",
    schematicPos: { x: 100, y: 240, rotation: 0 },
    hardwarePos: { type: "BREADBOARD", col: 3, row: "A", pinSpan: 2 },
    pins: [
      { id: "+", name: "+V", number: 1, type: "power" },
      { id: "-", name: "GND", number: 2, type: "ground" },
    ],
    teachingInfo: {
      role: `Primary DC voltage excitation source supplying ${voltage} V.`,
      rationale: "Provides fixed reference potential for nodal analysis.",
      electricalProps: `Ideal regulated ${voltage}V DC rail.`,
      inOutExplanation: "Sources current out of + terminal; returns through - terminal.",
      circuitImpact: "Directly scales branch currents and node potentials.",
    },
  };
}

function makeGround(id = "GND1", x = 100, y = 410): SchematicComponent {
  return {
    id,
    refDes: "GND",
    name: "Common System Ground Reference",
    type: "GROUND",
    nominalValue: 0,
    unit: "V",
    displayValue: "0V Reference",
    packageType: "Chassis Common",
    partNumber: "GND-REF",
    rating: "0V Reference",
    schematicPos: { x, y, rotation: 0 },
    hardwarePos: { type: "BREADBOARD", col: 3, row: "J", pinSpan: 1 },
    pins: [{ id: "GND", name: "GND", number: 1, type: "ground" }],
    teachingInfo: {
      role: "Establishes 0.00 V reference potential for KVL/MNA equations.",
      rationale: "Every circuit requires a reference node.",
      electricalProps: "Fixed V = 0 V.",
      inOutExplanation: "Sinks return currents from all grounded branches.",
      circuitImpact: "Removing ground leaves nodal equations singular.",
    },
  };
}

function makeResistor(
  id: string,
  refDes: string,
  ohms: number,
  x: number,
  y: number,
  rotation = 0,
  col = 10,
  role = "Limits branch current and develops proportional IR voltage drop."
): SchematicComponent {
  const disp = ohms >= 1000 ? `${Number((ohms / 1000).toFixed(2))} kΩ` : `${ohms} Ω`;
  return {
    id,
    refDes,
    name: `Metal Film Resistor (${disp})`,
    type: "RESISTOR",
    nominalValue: ohms,
    unit: "Ω",
    displayValue: disp,
    editable: true,
    minVal: 10,
    maxVal: 100000,
    stepVal: ohms >= 1000 ? 100 : 10,
    packageType: 'Axial 0.4"',
    partNumber: `MFR-25-${refDes}`,
    tolerance: "±1%",
    rating: "0.25W",
    schematicPos: { x, y, rotation },
    hardwarePos: { type: "BREADBOARD", col, row: "C", pinSpan: 4 },
    pins: [
      { id: "1", name: "Pin 1", number: 1, type: "passive" },
      { id: "2", name: "Pin 2", number: 2, type: "passive" },
    ],
    teachingInfo: {
      role,
      rationale: "Standard precision passive resistive element.",
      electricalProps: `V = I × R (${disp}, ±1%).`,
      inOutExplanation: "Conducts current bidirectionally between Pin 1 and Pin 2.",
      circuitImpact: "Directly alters equivalent resistance, nodal voltage divider ratio, and current.",
    },
  };
}

function makeSimpleBom(components: SchematicComponent[]): ProjectBOMItem[] {
  let idx = 1;
  return components
    .filter((c) => c.type !== "GROUND" && c.type !== "TEST_POINT")
    .map((c) => ({
      itemNumber: idx++,
      designators: [c.refDes],
      quantity: 1,
      description: `${c.name}`,
      partNumber: c.partNumber,
      manufacturer: "Yageo / Vishay / TI",
      package: c.packageType,
      estUnitCost: c.type === "RESISTOR" ? "$0.02" : "$0.25",
    }));
}

function makeDoc(principle: string, calcFormula: string, calcResult: string, expectedValues: string) {
  return {
    workingPrinciple: principle,
    designCalculations: [
      {
        step: "1. Governing Circuit Relation",
        formula: calcFormula,
        calculation: "Evaluated live against active netlist & component values",
        result: calcResult,
      },
    ],
    expectedWaveforms: {
      title: "Circuit Telemetry & Waveform",
      timebase: "1.0 ms/div",
      vDiv: "2.0 V/div",
      expectedValues,
      description: principle,
    },
    troubleshooting: [
      {
        symptom: "Zero branch current or open circuit error",
        possibleCause: "Disconnected terminal wire or missing ground connection.",
        diagnosticCheck: "Verify continuity between positive source, load chain, and GND.",
        solution: "Reconnect broken wire or add missing ground reference.",
      },
    ],
    experimentQuestions: [
      {
        question: "How does altering resistor values affect total branch current?",
        answer: "By Ohm's Law I = V / R_eq, increasing total resistance decreases total current proportionally.",
        theoryRef: "Nilsson & Riedel Electric Circuits",
      },
    ],
  };
}

// 1. Simple Single-Resistor Circuit
const simpleResComps: SchematicComponent[] = [
  makeSupply("V1", 9.0, "9V DC Source"),
  makeResistor("R1", "R1", 470, 320, 180, 90, 14, "Primary single resistive load across 9V supply."),
  makeGround("GND1", 100, 400),
];
const simpleResWires: SchematicWire[] = [
  { id: "w_sr_1", from: { componentId: "V1", pinId: "+" }, to: { componentId: "R1", pinId: "1" }, netName: "VCC", signalType: "POWER", wireColor: "#ef4444" },
  { id: "w_sr_2", from: { componentId: "R1", pinId: "2" }, to: { componentId: "GND1", pinId: "GND" }, netName: "GND", signalType: "GROUND", wireColor: "#64748b" },
  { id: "w_sr_3", from: { componentId: "V1", pinId: "-" }, to: { componentId: "GND1", pinId: "GND" }, netName: "GND", signalType: "GROUND", wireColor: "#64748b" },
];

// 2. Series Resistor Circuit (3 chained resistors)
const seriesResComps: SchematicComponent[] = [
  makeSupply("V1", 12.0, "12V Bench Supply"),
  makeResistor("R1", "R1", 100, 250, 130, 0, 10, "First series stage resistor (100 Ω)."),
  makeResistor("R2", "R2", 200, 430, 130, 0, 16, "Second series stage resistor (200 Ω)."),
  makeResistor("R3", "R3", 300, 610, 130, 0, 22, "Final series stage resistor (300 Ω) to ground."),
  makeGround("GND1", 100, 400),
];
const seriesResWires: SchematicWire[] = [
  { id: "w_ser_1", from: { componentId: "V1", pinId: "+" }, to: { componentId: "R1", pinId: "1" }, netName: "VCC", signalType: "POWER", wireColor: "#ef4444" },
  { id: "w_ser_2", from: { componentId: "R1", pinId: "2" }, to: { componentId: "R2", pinId: "1" }, netName: "SERIES_N1", signalType: "ANALOG_SIGNAL", wireColor: "#22d3ee" },
  { id: "w_ser_3", from: { componentId: "R2", pinId: "2" }, to: { componentId: "R3", pinId: "1" }, netName: "SERIES_N2", signalType: "ANALOG_SIGNAL", wireColor: "#22d3ee" },
  { id: "w_ser_4", from: { componentId: "R3", pinId: "2" }, to: { componentId: "GND1", pinId: "GND" }, netName: "GND", signalType: "GROUND", wireColor: "#64748b" },
  { id: "w_ser_5", from: { componentId: "V1", pinId: "-" }, to: { componentId: "GND1", pinId: "GND" }, netName: "GND", signalType: "GROUND", wireColor: "#64748b" },
];

// 3. Parallel Resistor Circuit (3 parallel branches)
const parallelResComps: SchematicComponent[] = [
  makeSupply("V1", 12.0, "12V Bench Supply"),
  makeResistor("R1", "R1", 100, 280, 250, 90, 10, "Branch 1 resistor (100 Ω across supply rail)."),
  makeResistor("R2", "R2", 200, 430, 250, 90, 16, "Branch 2 resistor (200 Ω across supply rail)."),
  makeResistor("R3", "R3", 300, 580, 250, 90, 22, "Branch 3 resistor (300 Ω across supply rail)."),
  makeGround("GND1", 100, 400),
];
const parallelResWires: SchematicWire[] = [
  { id: "w_par_p1", from: { componentId: "V1", pinId: "+" }, to: { componentId: "R1", pinId: "1" }, netName: "PARALLEL_BUS_POS", signalType: "POWER", wireColor: "#ef4444" },
  { id: "w_par_p2", from: { componentId: "V1", pinId: "+" }, to: { componentId: "R2", pinId: "1" }, netName: "PARALLEL_BUS_POS", signalType: "POWER", wireColor: "#ef4444" },
  { id: "w_par_p3", from: { componentId: "V1", pinId: "+" }, to: { componentId: "R3", pinId: "1" }, netName: "PARALLEL_BUS_POS", signalType: "POWER", wireColor: "#ef4444" },
  { id: "w_par_g1", from: { componentId: "R1", pinId: "2" }, to: { componentId: "GND1", pinId: "GND" }, netName: "GND", signalType: "GROUND", wireColor: "#64748b" },
  { id: "w_par_g2", from: { componentId: "R2", pinId: "2" }, to: { componentId: "GND1", pinId: "GND" }, netName: "GND", signalType: "GROUND", wireColor: "#64748b" },
  { id: "w_par_g3", from: { componentId: "R3", pinId: "2" }, to: { componentId: "GND1", pinId: "GND" }, netName: "GND", signalType: "GROUND", wireColor: "#64748b" },
  { id: "w_par_vg", from: { componentId: "V1", pinId: "-" }, to: { componentId: "GND1", pinId: "GND" }, netName: "GND", signalType: "GROUND", wireColor: "#64748b" },
];

// 4. Precision Voltage Divider
const dividerComps: SchematicComponent[] = [
  makeSupply("V1", 10.0, "10V Precision Source"),
  makeResistor("R1", "R1", 10000, 320, 150, 90, 12, "Upper series divider resistor (10 kΩ)."),
  makeResistor("R2", "R2", 10000, 320, 290, 90, 18, "Lower shunt divider resistor (10 kΩ) to ground."),
  {
    id: "TP_VOUT",
    refDes: "V_OUT",
    name: "Divider Output Node Probe",
    type: "TEST_POINT",
    nominalValue: 5.0,
    unit: "V",
    displayValue: "V_OUT Tap",
    packageType: "PCB Test Pad",
    partNumber: "TP-OUT",
    schematicPos: { x: 470, y: 220, rotation: 0 },
    pins: [
      { id: "IN", name: "Probe", number: 1, type: "passive" },
      { id: "GND", name: "Ref", number: 2, type: "ground" },
    ],
    teachingInfo: {
      role: "Measures divided potential V_out = Vin × R2 / (R1 + R2).",
      rationale: "High-impedance nodal tap.",
      electricalProps: "Reads 5.00 V at R1=R2=10kΩ.",
      inOutExplanation: "Probes junction between R1 and R2.",
      circuitImpact: "Negligible loading current.",
    },
  },
  makeGround("GND1", 100, 400),
];
const dividerWires: SchematicWire[] = [
  { id: "w_vd_1", from: { componentId: "V1", pinId: "+" }, to: { componentId: "R1", pinId: "1" }, netName: "VCC", signalType: "POWER", wireColor: "#ef4444" },
  { id: "w_vd_2", from: { componentId: "R1", pinId: "2" }, to: { componentId: "R2", pinId: "1" }, netName: "V_DIV_OUT", signalType: "ANALOG_SIGNAL", wireColor: "#22d3ee" },
  { id: "w_vd_3", from: { componentId: "R1", pinId: "2" }, to: { componentId: "TP_VOUT", pinId: "IN" }, netName: "V_DIV_OUT", signalType: "ANALOG_SIGNAL", wireColor: "#22d3ee" },
  { id: "w_vd_4", from: { componentId: "R2", pinId: "2" }, to: { componentId: "GND1", pinId: "GND" }, netName: "GND", signalType: "GROUND", wireColor: "#64748b" },
  { id: "w_vd_5", from: { componentId: "V1", pinId: "-" }, to: { componentId: "GND1", pinId: "GND" }, netName: "GND", signalType: "GROUND", wireColor: "#64748b" },
];

// 5. LED Circuit with Current-Limiting Resistor & Switch
const ledCircuitComps: SchematicComponent[] = [
  makeSupply("V1", 5.0, "5V Regulated Supply"),
  {
    id: "SW1",
    refDes: "SW1",
    name: "SPST Power Control Switch",
    type: "SWITCH",
    nominalValue: 1,
    unit: "",
    displayValue: "CLOSED (ON)",
    editable: true,
    minVal: 0,
    maxVal: 1,
    stepVal: 1,
    packageType: "Tactile Switch",
    partNumber: "SW-SPST",
    schematicPos: { x: 240, y: 130, rotation: 0 },
    hardwarePos: { type: "BREADBOARD", col: 8, row: "C", pinSpan: 2 },
    pins: [
      { id: "1", name: "COM", number: 1, type: "passive" },
      { id: "2", name: "NO", number: 2, type: "passive" },
    ],
    teachingInfo: {
      role: "Controls loop continuity cleanly.",
      rationale: "Allows opening/closing the LED branch.",
      electricalProps: "R_on = 10 mΩ, R_off = 100 MΩ.",
      inOutExplanation: "Series control switch.",
      circuitImpact: "Cuts LED forward current to 0 when open.",
    },
  },
  makeResistor("R_LIMIT", "R1", 330, 420, 130, 0, 14, "Current-limiting resistor fixing I_LED ≈ (5V - 2V)/330Ω ≈ 9.1 mA."),
  {
    id: "D1",
    refDes: "D1",
    name: "5mm Red Indicator LED",
    type: "LED",
    nominalValue: 2.0,
    unit: "V",
    displayValue: "2.0 V LED",
    editable: true,
    minVal: 1.6,
    maxVal: 3.4,
    stepVal: 0.1,
    packageType: "T-1 3/4",
    partNumber: "WP7113ID",
    schematicPos: { x: 580, y: 240, rotation: 0 },
    hardwarePos: { type: "BREADBOARD", col: 20, row: "E", pinSpan: 2 },
    pins: [
      { id: "A", name: "ANODE", number: 1, type: "passive" },
      { id: "K", name: "CATHODE", number: 2, type: "ground" },
    ],
    teachingInfo: {
      role: "Converts forward DC current (~9 mA) into 625nm optical illumination.",
      rationale: "Protected from overcurrent by R1.",
      electricalProps: "Forward drop Vf ≈ 2.0V.",
      inOutExplanation: "Conducts from Anode to Cathode.",
      circuitImpact: "Clamps cathode/anode difference near Vf.",
    },
  },
  makeGround("GND1", 100, 400),
];
const ledCircuitWires: SchematicWire[] = [
  { id: "w_led_1", from: { componentId: "V1", pinId: "+" }, to: { componentId: "SW1", pinId: "1" }, netName: "VCC", signalType: "POWER", wireColor: "#ef4444" },
  { id: "w_led_2", from: { componentId: "SW1", pinId: "2" }, to: { componentId: "R_LIMIT", pinId: "1" }, netName: "SW_OUT", signalType: "ANALOG_SIGNAL", wireColor: "#eab308" },
  { id: "w_led_3", from: { componentId: "R_LIMIT", pinId: "2" }, to: { componentId: "D1", pinId: "A" }, netName: "LED_ANODE", signalType: "ANALOG_SIGNAL", wireColor: "#22d3ee" },
  { id: "w_led_4", from: { componentId: "D1", pinId: "K" }, to: { componentId: "GND1", pinId: "GND" }, netName: "GND", signalType: "GROUND", wireColor: "#64748b" },
  { id: "w_led_5", from: { componentId: "V1", pinId: "-" }, to: { componentId: "GND1", pinId: "GND" }, netName: "GND", signalType: "GROUND", wireColor: "#64748b" },
];

// 6. RC Charging Circuit
const rcChargeComps: SchematicComponent[] = [
  makeSupply("V1", 5.0, "5V Step Excitation"),
  makeResistor("R1", "R1", 10000, 320, 140, 0, 12, "Charging series resistor setting time constant τ = R × C."),
  {
    id: "C1",
    refDes: "C1",
    name: "Electrolytic Storage Capacitor",
    type: "CAPACITOR_POLARIZED",
    nominalValue: 100,
    unit: "uF",
    displayValue: "100 µF",
    editable: true,
    minVal: 1,
    maxVal: 1000,
    stepVal: 5,
    packageType: "Radial Can",
    partNumber: "UHE1C101MPD",
    schematicPos: { x: 500, y: 260, rotation: 0 },
    hardwarePos: { type: "BREADBOARD", col: 18, row: "E", pinSpan: 2 },
    pins: [
      { id: "1", name: "+", number: 1, type: "passive" },
      { id: "2", name: "-", number: 2, type: "ground" },
    ],
    teachingInfo: {
      role: "Charges exponentially: Vc(t) = Vs · (1 - e^(-t / τ)).",
      rationale: "100µF with 10kΩ produces τ = 1.00 s.",
      electricalProps: "V(1τ) = 3.16 V, settled (>99%) at 5τ = 5.0 s.",
      inOutExplanation: "Stores electrostatic energy between plates.",
      circuitImpact: "Determines transient rise speed inversely with current.",
    },
  },
  makeGround("GND1", 100, 400),
];
const rcChargeWires: SchematicWire[] = [
  { id: "w_rc_1", from: { componentId: "V1", pinId: "+" }, to: { componentId: "R1", pinId: "1" }, netName: "VCC", signalType: "POWER", wireColor: "#ef4444" },
  { id: "w_rc_2", from: { componentId: "R1", pinId: "2" }, to: { componentId: "C1", pinId: "1" }, netName: "VC_NODE", signalType: "ANALOG_SIGNAL", wireColor: "#22d3ee" },
  { id: "w_rc_3", from: { componentId: "C1", pinId: "2" }, to: { componentId: "GND1", pinId: "GND" }, netName: "GND", signalType: "GROUND", wireColor: "#64748b" },
  { id: "w_rc_4", from: { componentId: "V1", pinId: "-" }, to: { componentId: "GND1", pinId: "GND" }, netName: "GND", signalType: "GROUND", wireColor: "#64748b" },
];

// 7. Half-Wave Rectifier
const halfWaveComps: SchematicComponent[] = [
  makeSupply("V_AC", 12.0, "12V Peak AC Transformer"),
  {
    id: "D1",
    refDes: "D1",
    name: "1N4007 Silicon Rectifier Diode",
    type: "DIODE",
    nominalValue: 0.7,
    unit: "V",
    displayValue: "1N4007 (0.7V)",
    editable: true,
    minVal: 0.3,
    maxVal: 1.1,
    stepVal: 0.1,
    packageType: "DO-41",
    partNumber: "1N4007",
    schematicPos: { x: 300, y: 140, rotation: 0 },
    hardwarePos: { type: "BREADBOARD", col: 11, row: "C", pinSpan: 4 },
    pins: [
      { id: "A", name: "ANODE", number: 1, type: "passive" },
      { id: "K", name: "CATHODE", number: 2, type: "passive" },
    ],
    teachingInfo: {
      role: "Blocks negative half-cycles while passing positive half-cycles above Vf ≈ 0.7V.",
      rationale: "1A 1000V PIV silicon power rectifier.",
      electricalProps: "Peak output V_out_pk = V_in_pk - 0.7V.",
      inOutExplanation: "Anode receives AC; Cathode feeds pulsating DC to load.",
      circuitImpact: "Converts bipolar AC into unipolar half-wave pulses.",
    },
  },
  makeResistor("R_LOAD", "R_LOAD", 1000, 520, 260, 90, 20, "Load resistor receiving half-wave rectified output voltage."),
  makeGround("GND1", 100, 400),
];
const halfWaveWires: SchematicWire[] = [
  { id: "w_hw_1", from: { componentId: "V_AC", pinId: "+" }, to: { componentId: "D1", pinId: "A" }, netName: "AC_IN", signalType: "POWER", wireColor: "#ef4444" },
  { id: "w_hw_2", from: { componentId: "D1", pinId: "K" }, to: { componentId: "R_LOAD", pinId: "1" }, netName: "V_RECT_OUT", signalType: "ANALOG_SIGNAL", wireColor: "#22d3ee" },
  { id: "w_hw_3", from: { componentId: "R_LOAD", pinId: "2" }, to: { componentId: "GND1", pinId: "GND" }, netName: "GND", signalType: "GROUND", wireColor: "#64748b" },
  { id: "w_hw_4", from: { componentId: "V_AC", pinId: "-" }, to: { componentId: "GND1", pinId: "GND" }, netName: "GND", signalType: "GROUND", wireColor: "#64748b" },
];

// 8. Full-Wave Bridge Rectifier
function makeDiode(id: string, refDes: string, x: number, y: number, col: number): SchematicComponent {
  return {
    id,
    refDes,
    name: "1N4007 Bridge Diode",
    type: "DIODE",
    nominalValue: 0.7,
    unit: "V",
    displayValue: "1N4007",
    packageType: "DO-41",
    partNumber: "1N4007",
    schematicPos: { x, y, rotation: 0 },
    hardwarePos: { type: "BREADBOARD", col, row: "C", pinSpan: 3 },
    pins: [
      { id: "A", name: "ANODE", number: 1, type: "passive" },
      { id: "K", name: "CATHODE", number: 2, type: "passive" },
    ],
    teachingInfo: {
      role: "Full-wave Graetz bridge arm diode.",
      rationale: "Conducts in diagonal pairs every half-cycle.",
      electricalProps: "Forward drop 0.7V (2×Vf total loop drop).",
      inOutExplanation: "Routes positive and negative half-cycles identically into load.",
      circuitImpact: "Doubles ripple frequency to 2×f_line (100/120 Hz).",
    },
  };
}
const bridgeComps: SchematicComponent[] = [
  makeSupply("V_AC", 12.0, "12V Peak AC Secondary"),
  makeDiode("D1", "D1", 250, 130, 8),
  makeDiode("D2", "D2", 380, 130, 12),
  makeDiode("D3", "D3", 250, 310, 16),
  makeDiode("D4", "D4", 380, 310, 20),
  {
    id: "C_FILT",
    refDes: "C1",
    name: "Smoothing Reservoir Capacitor",
    type: "CAPACITOR_POLARIZED",
    nominalValue: 100,
    unit: "uF",
    displayValue: "100 µF",
    editable: true,
    minVal: 10,
    maxVal: 2200,
    stepVal: 10,
    packageType: "Radial Can",
    partNumber: "ECA-1EM101",
    schematicPos: { x: 540, y: 240, rotation: 0 },
    hardwarePos: { type: "BREADBOARD", col: 24, row: "E", pinSpan: 2 },
    pins: [
      { id: "1", name: "+", number: 1, type: "passive" },
      { id: "2", name: "-", number: 2, type: "ground" },
    ],
    teachingInfo: {
      role: "Maintains DC rail voltage between full-wave rectified peaks.",
      rationale: "Reduces peak-to-peak ripple inversely with C.",
      electricalProps: "V_ripple ≈ I_load / (2·f·C).",
      inOutExplanation: "Charged at peaks, supplies load during troughs.",
      circuitImpact: "Essential for clean DC output.",
    },
  },
  makeResistor("R_LOAD", "R_LOAD", 470, 680, 240, 90, 27, "DC Load Resistor fed by filtered full-wave bridge."),
  makeGround("GND1", 100, 410),
];
const bridgeWires: SchematicWire[] = [
  { id: "w_fw_1", from: { componentId: "V_AC", pinId: "+" }, to: { componentId: "D1", pinId: "A" }, netName: "AC_HI", signalType: "POWER", wireColor: "#ef4444" },
  { id: "w_fw_2", from: { componentId: "V_AC", pinId: "+" }, to: { componentId: "D3", pinId: "K" }, netName: "AC_HI", signalType: "POWER", wireColor: "#ef4444" },
  { id: "w_fw_3", from: { componentId: "V_AC", pinId: "-" }, to: { componentId: "D2", pinId: "A" }, netName: "AC_LO", signalType: "ANALOG_SIGNAL", wireColor: "#38bdf8" },
  { id: "w_fw_4", from: { componentId: "V_AC", pinId: "-" }, to: { componentId: "D4", pinId: "K" }, netName: "AC_LO", signalType: "ANALOG_SIGNAL", wireColor: "#38bdf8" },
  { id: "w_fw_5", from: { componentId: "D1", pinId: "K" }, to: { componentId: "C_FILT", pinId: "1" }, netName: "DC_BUS_POS", signalType: "POWER", wireColor: "#f59e0b" },
  { id: "w_fw_6", from: { componentId: "D2", pinId: "K" }, to: { componentId: "C_FILT", pinId: "1" }, netName: "DC_BUS_POS", signalType: "POWER", wireColor: "#f59e0b" },
  { id: "w_fw_7", from: { componentId: "C_FILT", pinId: "1" }, to: { componentId: "R_LOAD", pinId: "1" }, netName: "DC_BUS_POS", signalType: "POWER", wireColor: "#f59e0b" },
  { id: "w_fw_8", from: { componentId: "D3", pinId: "A" }, to: { componentId: "GND1", pinId: "GND" }, netName: "GND", signalType: "GROUND", wireColor: "#64748b" },
  { id: "w_fw_9", from: { componentId: "D4", pinId: "A" }, to: { componentId: "GND1", pinId: "GND" }, netName: "GND", signalType: "GROUND", wireColor: "#64748b" },
  { id: "w_fw_10", from: { componentId: "C_FILT", pinId: "2" }, to: { componentId: "GND1", pinId: "GND" }, netName: "GND", signalType: "GROUND", wireColor: "#64748b" },
  { id: "w_fw_11", from: { componentId: "R_LOAD", pinId: "2" }, to: { componentId: "GND1", pinId: "GND" }, netName: "GND", signalType: "GROUND", wireColor: "#64748b" },
];

// 9. Zener Diode Voltage Regulator
const zenerComps: SchematicComponent[] = [
  makeSupply("V1", 15.0, "15V Unregulated DC Input"),
  makeResistor("R_S", "R_S", 470, 260, 140, 0, 10, "Series dropping resistor absorbing Vin - Vz voltage overhead."),
  {
    id: "ZD1",
    refDes: "ZD1",
    name: "1N4733A 5.1V Zener Regulator Diode",
    type: "DIODE",
    nominalValue: 5.1,
    unit: "V",
    displayValue: "5.1V Zener",
    editable: true,
    minVal: 3.3,
    maxVal: 12.0,
    stepVal: 0.1,
    packageType: "DO-41",
    partNumber: "1N4733A-ZENER",
    schematicPos: { x: 430, y: 260, rotation: 90 },
    hardwarePos: { type: "BREADBOARD", col: 16, row: "E", pinSpan: 2 },
    pins: [
      { id: "K", name: "CATHODE (+Vreg)", number: 1, type: "passive" },
      { id: "A", name: "ANODE (GND)", number: 2, type: "ground" },
    ],
    teachingInfo: {
      role: "Clamps output rail at Vz = 5.1V in reverse breakdown.",
      rationale: "1W 5.1V Zener reference diode.",
      electricalProps: "V_out ≈ 5.10V when V_th > Vz.",
      inOutExplanation: "Shunts excess current Iz = Is - Iload to ground.",
      circuitImpact: "Maintains regulated 5.1V across R_LOAD despite supply fluctuations.",
    },
  },
  makeResistor("R_LOAD", "R_LOAD", 1000, 600, 260, 90, 22, "Regulated DC output load resistor."),
  makeGround("GND1", 100, 400),
];
const zenerWires: SchematicWire[] = [
  { id: "w_zn_1", from: { componentId: "V1", pinId: "+" }, to: { componentId: "R_S", pinId: "1" }, netName: "V_UNREG", signalType: "POWER", wireColor: "#ef4444" },
  { id: "w_zn_2", from: { componentId: "R_S", pinId: "2" }, to: { componentId: "ZD1", pinId: "K" }, netName: "V_REG_5V1", signalType: "ANALOG_SIGNAL", wireColor: "#22d3ee" },
  { id: "w_zn_3", from: { componentId: "ZD1", pinId: "K" }, to: { componentId: "R_LOAD", pinId: "1" }, netName: "V_REG_5V1", signalType: "ANALOG_SIGNAL", wireColor: "#22d3ee" },
  { id: "w_zn_4", from: { componentId: "ZD1", pinId: "A" }, to: { componentId: "GND1", pinId: "GND" }, netName: "GND", signalType: "GROUND", wireColor: "#64748b" },
  { id: "w_zn_5", from: { componentId: "R_LOAD", pinId: "2" }, to: { componentId: "GND1", pinId: "GND" }, netName: "GND", signalType: "GROUND", wireColor: "#64748b" },
  { id: "w_zn_6", from: { componentId: "V1", pinId: "-" }, to: { componentId: "GND1", pinId: "GND" }, netName: "GND", signalType: "GROUND", wireColor: "#64748b" },
];

// 10. Op-Amp Inverting Amplifier
const opampInvComps: SchematicComponent[] = [
  makeSupply("V_IN", 0.5, "0.5V Input Signal"),
  makeGround("GND1", 100, 400),
  makeResistor("R_IN", "R_IN", 10000, 250, 200, 0, 10, "Input resistor setting input current I_in = V_in / R_in."),
  makeResistor("R_F", "R_F", 100000, 450, 110, 0, 16, "Negative feedback resistor setting closed-loop gain Av = -R_F / R_IN."),
  {
    id: "U1",
    refDes: "U1",
    name: "LM741 Operational Amplifier",
    type: "OPAMP",
    nominalValue: 741,
    unit: "",
    displayValue: "LM741CN",
    packageType: "DIP-8",
    partNumber: "LM741CN",
    schematicPos: { x: 450, y: 230, rotation: 0 },
    hardwarePos: { type: "BREADBOARD", col: 18, row: "E", pinSpan: 4 },
    pins: [
      { id: "2", name: "IN-", number: 2, type: "input" },
      { id: "3", name: "IN+", number: 3, type: "input" },
      { id: "6", name: "OUT", number: 6, type: "output" },
      { id: "7", name: "V+", number: 7, type: "power" },
      { id: "4", name: "V-", number: 4, type: "power" },
    ],
    teachingInfo: {
      role: "High-gain differential amplifier forcing inverting terminal to virtual ground (0V).",
      rationale: "Classic linear inverting voltage amplifier.",
      electricalProps: "Open-loop gain 200,000; closed-loop Av = -R_F / R_IN.",
      inOutExplanation: "Inverts input polarity and scales by R_F / R_IN.",
      circuitImpact: "Delivers V_out = -(R_F / R_IN) * V_in into R_LOAD.",
    },
  },
  makeResistor("R_LOAD", "R_LOAD", 10000, 640, 260, 90, 24, "Output load resistor driven by LM741 pin 6."),
];
const opampInvWires: SchematicWire[] = [
  { id: "w_inv_1", from: { componentId: "V_IN", pinId: "+" }, to: { componentId: "R_IN", pinId: "1" }, netName: "V_IN_AC", signalType: "ANALOG_SIGNAL", wireColor: "#22d3ee" },
  { id: "w_inv_2", from: { componentId: "R_IN", pinId: "2" }, to: { componentId: "U1", pinId: "2" }, netName: "SUM_NODE", signalType: "ANALOG_SIGNAL", wireColor: "#eab308" },
  { id: "w_inv_3", from: { componentId: "U1", pinId: "2" }, to: { componentId: "R_F", pinId: "1" }, netName: "SUM_NODE", signalType: "ANALOG_SIGNAL", wireColor: "#eab308" },
  { id: "w_inv_4", from: { componentId: "R_F", pinId: "2" }, to: { componentId: "U1", pinId: "6" }, netName: "V_OUT", signalType: "ANALOG_SIGNAL", wireColor: "#a855f7" },
  { id: "w_inv_5", from: { componentId: "U1", pinId: "6" }, to: { componentId: "R_LOAD", pinId: "1" }, netName: "V_OUT", signalType: "ANALOG_SIGNAL", wireColor: "#a855f7" },
  { id: "w_inv_6", from: { componentId: "U1", pinId: "3" }, to: { componentId: "GND1", pinId: "GND" }, netName: "GND", signalType: "GROUND", wireColor: "#64748b" },
  { id: "w_inv_7", from: { componentId: "R_LOAD", pinId: "2" }, to: { componentId: "GND1", pinId: "GND" }, netName: "GND", signalType: "GROUND", wireColor: "#64748b" },
  { id: "w_inv_8", from: { componentId: "V_IN", pinId: "-" }, to: { componentId: "GND1", pinId: "GND" }, netName: "GND", signalType: "GROUND", wireColor: "#64748b" },
];

// 11. Logic Gate Circuit (TTL 74LS08 AND / Indicator Stage)
const logicGateComps: SchematicComponent[] = [
  makeSupply("V1", 5.0, "5V TTL VCC"),
  {
    id: "SW_A",
    refDes: "SW_A",
    name: "Logic Input A Switch",
    type: "SWITCH",
    nominalValue: 1,
    unit: "",
    displayValue: "HIGH (1)",
    editable: true,
    minVal: 0,
    maxVal: 1,
    stepVal: 1,
    packageType: "SPST Slide",
    partNumber: "SW-IN-A",
    schematicPos: { x: 240, y: 150, rotation: 0 },
    hardwarePos: { type: "BREADBOARD", col: 7, row: "C", pinSpan: 2 },
    pins: [
      { id: "1", name: "COM", number: 1, type: "passive" },
      { id: "2", name: "OUT", number: 2, type: "output" },
    ],
    teachingInfo: {
      role: "Drives Logic Gate Input A (HIGH = 5V, LOW = 0V).",
      rationale: "Interactive binary input A.",
      electricalProps: "TTL VIH ≥ 2.0V, VIL ≤ 0.8V.",
      inOutExplanation: "Feeds pin 1 of U1.",
      circuitImpact: "Gate output goes HIGH only when both A and B are HIGH.",
    },
  },
  {
    id: "SW_B",
    refDes: "SW_B",
    name: "Logic Input B Switch",
    type: "SWITCH",
    nominalValue: 1,
    unit: "",
    displayValue: "HIGH (1)",
    editable: true,
    minVal: 0,
    maxVal: 1,
    stepVal: 1,
    packageType: "SPST Slide",
    partNumber: "SW-IN-B",
    schematicPos: { x: 240, y: 270, rotation: 0 },
    hardwarePos: { type: "BREADBOARD", col: 7, row: "G", pinSpan: 2 },
    pins: [
      { id: "1", name: "COM", number: 1, type: "passive" },
      { id: "2", name: "OUT", number: 2, type: "output" },
    ],
    teachingInfo: {
      role: "Drives Logic Gate Input B (HIGH = 5V, LOW = 0V).",
      rationale: "Interactive binary input B.",
      electricalProps: "TTL VIH ≥ 2.0V, VIL ≤ 0.8V.",
      inOutExplanation: "Feeds pin 2 of U1.",
      circuitImpact: "Controls second operand of boolean AND Y = A · B.",
    },
  },
  {
    id: "U1",
    refDes: "U1",
    name: "74LS08 Quad 2-Input AND IC",
    type: "IC_LOGIC",
    nominalValue: 7408,
    unit: "",
    displayValue: "74LS08 AND",
    packageType: "DIP-14",
    partNumber: "SN74LS08N",
    schematicPos: { x: 420, y: 210, rotation: 0 },
    hardwarePos: { type: "BREADBOARD", col: 16, row: "E", pinSpan: 4 },
    pins: [
      { id: "1", name: "A", number: 1, type: "input" },
      { id: "2", name: "B", number: 2, type: "input" },
      { id: "3", name: "Y (A·B)", number: 3, type: "output" },
      { id: "7", name: "GND", number: 7, type: "ground" },
      { id: "14", name: "VCC", number: 14, type: "power" },
    ],
    teachingInfo: {
      role: "Evaluates Boolean Y = A · B combinational truth table.",
      rationale: "Foundational TTL combinational logic IC.",
      electricalProps: "VCC = 5V, propagation delay ~10ns.",
      inOutExplanation: "Drives Y HIGH only when both A=1 and B=1.",
      circuitImpact: "Drives output indicator LED through R1.",
    },
  },
  makeResistor("R1", "R1", 330, 560, 210, 0, 22, "Limits TTL output current into indicator LED D1."),
  {
    id: "D1",
    refDes: "D1",
    name: "Logic Output Indicator LED",
    type: "LED",
    nominalValue: 2.0,
    unit: "V",
    displayValue: "Green LED",
    packageType: "T-1 3/4",
    partNumber: "WP7113GD",
    schematicPos: { x: 690, y: 260, rotation: 0 },
    hardwarePos: { type: "BREADBOARD", col: 26, row: "E", pinSpan: 2 },
    pins: [
      { id: "A", name: "ANODE", number: 1, type: "passive" },
      { id: "K", name: "CATHODE", number: 2, type: "ground" },
    ],
    teachingInfo: {
      role: "Illuminates when Y = A · B = 1.",
      rationale: "Provides immediate binary HIGH/LOW indication.",
      electricalProps: "Vf = 2.0V.",
      inOutExplanation: "Anode driven by R1; Cathode grounded.",
      circuitImpact: "Visualizes gate output logic level.",
    },
  },
  makeGround("GND1", 100, 400),
];
const logicGateWires: SchematicWire[] = [
  { id: "w_lg_1", from: { componentId: "V1", pinId: "+" }, to: { componentId: "SW_A", pinId: "1" }, netName: "VCC", signalType: "POWER", wireColor: "#ef4444" },
  { id: "w_lg_2", from: { componentId: "V1", pinId: "+" }, to: { componentId: "SW_B", pinId: "1" }, netName: "VCC", signalType: "POWER", wireColor: "#ef4444" },
  { id: "w_lg_3", from: { componentId: "V1", pinId: "+" }, to: { componentId: "U1", pinId: "14" }, netName: "VCC", signalType: "POWER", wireColor: "#ef4444" },
  { id: "w_lg_4", from: { componentId: "SW_A", pinId: "2" }, to: { componentId: "U1", pinId: "1" }, netName: "IN_A", signalType: "DIGITAL_PULSE", wireColor: "#22d3ee" },
  { id: "w_lg_5", from: { componentId: "SW_B", pinId: "2" }, to: { componentId: "U1", pinId: "2" }, netName: "IN_B", signalType: "DIGITAL_PULSE", wireColor: "#38bdf8" },
  { id: "w_lg_6", from: { componentId: "U1", pinId: "3" }, to: { componentId: "R1", pinId: "1" }, netName: "Y_OUT", signalType: "DIGITAL_PULSE", wireColor: "#a855f7" },
  { id: "w_lg_7", from: { componentId: "R1", pinId: "2" }, to: { componentId: "D1", pinId: "A" }, netName: "LED_A", signalType: "ANALOG_SIGNAL", wireColor: "#22c55e" },
  { id: "w_lg_8", from: { componentId: "D1", pinId: "K" }, to: { componentId: "GND1", pinId: "GND" }, netName: "GND", signalType: "GROUND", wireColor: "#64748b" },
  { id: "w_lg_9", from: { componentId: "U1", pinId: "7" }, to: { componentId: "GND1", pinId: "GND" }, netName: "GND", signalType: "GROUND", wireColor: "#64748b" },
  { id: "w_lg_10", from: { componentId: "V1", pinId: "-" }, to: { componentId: "GND1", pinId: "GND" }, netName: "GND", signalType: "GROUND", wireColor: "#64748b" },
];

export const FOUNDATIONAL_PROJECTS: InteractiveProject[] = [
  {
    id: "simple_resistor_circuit",
    title: "Simple Resistor DC Circuit (Ohm's Law Verification)",
    category: "Transistors & Fundamentals" as ProjectCategory,
    subjectDomain: "A",
    domainTitle: "Linear Circuit Analysis (LCA)",
    description: "Fundamental single-loop circuit pairing a 9V DC bench supply with an adjustable 470Ω resistor to verify Ohm's Law I = V / R.",
    defaultSupplyVoltage: 9.0,
    supplyVoltageUnit: "V",
    components: simpleResComps,
    wires: simpleResWires,
    simulationModel: {
      type: "RESONANCE",
      compute: (vals, supplyV, isPowered) => {
        const v = vals["V1"] ?? supplyV;
        const r = Math.max(0.1, vals["R1"] ?? 470);
        const iMa = isPowered ? (v / r) * 1000 : 0;
        const pMw = isPowered ? v * iMa : 0;
        return {
          netVoltages: { VCC: isPowered ? v : 0, GND: 0 },
          branchCurrents: { I_supply: Number(iMa.toFixed(2)) },
          waveforms: Array.from({ length: 40 }).map((_, i) => ({ time: i, vOut: isPowered ? v : 0, vCap: isPowered ? v : 0, current: iMa })),
          metrics: [
            { label: "Total Resistance (R_eq)", value: r.toFixed(1), unit: "Ω", formula: "R_eq = R1" },
            { label: "Loop Current (I)", value: iMa.toFixed(2), unit: "mA", formula: "I = V1 / R1" },
            { label: "Power Dissipated", value: pMw.toFixed(1), unit: "mW", formula: "P = V² / R" },
          ],
        };
      },
    },
    documentation: makeDoc("Single closed loop verifying linear proportionality between voltage, current, and resistance.", "I = V1 / R1", "19.15 mA at 9V / 470Ω", "VCC = 9.00 V, I = 19.15 mA"),
    bom: makeSimpleBom(simpleResComps),
    datasheets: {},
    teachingSteps: [
      { title: "Step 1: Closed Loop Excitation", description: "V1 supplies 9V directly across R1 to GND.", highlightComponentIds: ["V1", "R1", "GND1"] },
    ],
  },
  {
    id: "series_resistor_circuit",
    title: "Series Resistor Network (R1=100Ω, R2=200Ω, R3=300Ω)",
    category: "Transistors & Fundamentals" as ProjectCategory,
    subjectDomain: "A",
    domainTitle: "Linear Circuit Analysis (LCA)",
    description: "Three series-chained resistors sharing identical loop current I = V / (R1 + R2 + R3) with additive KVL voltage drops.",
    defaultSupplyVoltage: 12.0,
    supplyVoltageUnit: "V",
    components: seriesResComps,
    wires: seriesResWires,
    simulationModel: {
      type: "RESONANCE",
      compute: (vals, supplyV, isPowered) => {
        const v = vals["V1"] ?? supplyV;
        const r1 = vals["R1"] ?? 100;
        const r2 = vals["R2"] ?? 200;
        const r3 = vals["R3"] ?? 300;
        const req = r1 + r2 + r3;
        const iMa = isPowered ? (v / req) * 1000 : 0;
        const v1 = isPowered ? v - (iMa / 1000) * r1 : 0;
        const v2 = isPowered ? v1 - (iMa / 1000) * r2 : 0;
        return {
          netVoltages: { VCC: isPowered ? v : 0, SERIES_N1: Number(v1.toFixed(3)), SERIES_N2: Number(v2.toFixed(3)), GND: 0 },
          branchCurrents: { I_supply: Number(iMa.toFixed(2)) },
          waveforms: Array.from({ length: 40 }).map((_, i) => ({ time: i, vOut: v1, vCap: v2, current: iMa })),
          metrics: [
            { label: "Equivalent Resistance", value: req.toFixed(2), unit: "Ω", formula: "R_eq = R1 + R2 + R3" },
            { label: "Series Loop Current", value: iMa.toFixed(2), unit: "mA", formula: "I = V / R_eq" },
            { label: "Node N1 Potential", value: v1.toFixed(2), unit: "V", formula: "V_N1 = V - I·R1" },
            { label: "Node N2 Potential", value: v2.toFixed(2), unit: "V", formula: "V_N2 = I·R3" },
          ],
        };
      },
    },
    documentation: makeDoc("Series-connected resistors carry identical current while voltage divides proportionally across each resistance.", "R_eq = R1 + R2 + R3", "600 Ω, I = 20.00 mA", "V_N1 = 10.00 V, V_N2 = 6.00 V"),
    bom: makeSimpleBom(seriesResComps),
    datasheets: {},
    teachingSteps: [
      { title: "Step 1: Series Chain", description: "Current flows sequentially through R1 -> R2 -> R3.", highlightComponentIds: ["R1", "R2", "R3"] },
    ],
  },
  {
    id: "parallel_resistor_circuit",
    title: "Parallel Resistor Bank (Current Divider R1∥R2∥R3)",
    category: "Transistors & Fundamentals" as ProjectCategory,
    subjectDomain: "A",
    domainTitle: "Linear Circuit Analysis (LCA)",
    description: "Three parallel resistor branches connected across shared VCC and GND rails. Every branch shares full 12V while total current sums by KCL.",
    defaultSupplyVoltage: 12.0,
    supplyVoltageUnit: "V",
    components: parallelResComps,
    wires: parallelResWires,
    simulationModel: {
      type: "RESONANCE",
      compute: (vals, supplyV, isPowered) => {
        const v = vals["V1"] ?? supplyV;
        const r1 = vals["R1"] ?? 100;
        const r2 = vals["R2"] ?? 200;
        const r3 = vals["R3"] ?? 300;
        const req = 1 / (1 / r1 + 1 / r2 + 1 / r3);
        const iMa = isPowered ? (v / req) * 1000 : 0;
        return {
          netVoltages: { PARALLEL_BUS_POS: isPowered ? v : 0, GND: 0 },
          branchCurrents: { I_supply: Number(iMa.toFixed(2)) },
          waveforms: Array.from({ length: 40 }).map((_, i) => ({ time: i, vOut: isPowered ? v : 0, vCap: isPowered ? v : 0, current: iMa })),
          metrics: [
            { label: "Equivalent Resistance", value: req.toFixed(2), unit: "Ω", formula: "1/Req = 1/R1 + 1/R2 + 1/R3" },
            { label: "Total Supply Current", value: iMa.toFixed(2), unit: "mA", formula: "I_tot = I1 + I2 + I3" },
          ],
        };
      },
    },
    documentation: makeDoc("Parallel branches experience identical terminal potential and reduce total equivalent resistance.", "1/Req = 1/R1 + 1/R2 + 1/R3", "54.55 Ω, I = 220.00 mA", "VCC = 12.00 V, I = 220 mA"),
    bom: makeSimpleBom(parallelResComps),
    datasheets: {},
    teachingSteps: [
      { title: "Step 1: Shared Parallel Rails", description: "R1, R2, and R3 are tied directly between PARALLEL_BUS_POS and GND.", highlightComponentIds: ["R1", "R2", "R3"] },
    ],
  },
  {
    id: "voltage_divider_circuit",
    title: "Precision 2-Resistor Voltage Divider (V_out = V_in·R2/(R1+R2))",
    category: "Transistors & Fundamentals" as ProjectCategory,
    subjectDomain: "A",
    domainTitle: "Linear Circuit Analysis (LCA)",
    description: "Classic R1–R2 potential divider producing an exact scaled reference voltage at the center node tap.",
    defaultSupplyVoltage: 10.0,
    supplyVoltageUnit: "V",
    components: dividerComps,
    wires: dividerWires,
    simulationModel: {
      type: "RESONANCE",
      compute: (vals, supplyV, isPowered) => {
        const v = vals["V1"] ?? supplyV;
        const r1 = vals["R1"] ?? 10000;
        const r2 = vals["R2"] ?? 10000;
        const vOut = isPowered ? v * (r2 / (r1 + r2)) : 0;
        const iMa = isPowered ? (v / (r1 + r2)) * 1000 : 0;
        return {
          netVoltages: { VCC: isPowered ? v : 0, V_DIV_OUT: Number(vOut.toFixed(4)), GND: 0 },
          branchCurrents: { I_supply: Number(iMa.toFixed(3)) },
          waveforms: Array.from({ length: 40 }).map((_, i) => ({ time: i, vOut, vCap: v, current: iMa })),
          metrics: [
            { label: "Divided Output (V_out)", value: vOut.toFixed(3), unit: "V", formula: "Vin·R2/(R1+R2)" },
            { label: "Bleeder Current", value: iMa.toFixed(3), unit: "mA", formula: "Vin/(R1+R2)" },
          ],
        };
      },
    },
    documentation: makeDoc("Divides input potential in exact proportion to R2 / (R1 + R2).", "V_out = V_in · R2 / (R1 + R2)", "5.000 V at 10V / 10k / 10k", "V_out = 5.000 V"),
    bom: makeSimpleBom(dividerComps),
    datasheets: {},
    teachingSteps: [
      { title: "Step 1: Divider Ratio", description: "Adjust R1 or R2 to dynamically shift V_DIV_OUT.", highlightComponentIds: ["R1", "R2", "TP_VOUT"] },
    ],
  },
  {
    id: "led_limiting_circuit",
    title: "LED Indicator Circuit with 330Ω Current-Limiting Resistor",
    category: "Transistors & Fundamentals" as ProjectCategory,
    subjectDomain: "E",
    domainTitle: "Electronic Devices & Circuits (EDC)",
    description: "5V DC source with SPST control switch and 330Ω series limiting resistor safely driving a 2.0V Red LED at ~9.1 mA.",
    defaultSupplyVoltage: 5.0,
    supplyVoltageUnit: "V",
    components: ledCircuitComps,
    wires: ledCircuitWires,
    simulationModel: {
      type: "RESONANCE",
      compute: (vals, supplyV, isPowered) => {
        const v = vals["V1"] ?? supplyV;
        const r = vals["R_LIMIT"] ?? 330;
        const vf = vals["D1"] ?? 2.0;
        const sw = vals["SW1"] ?? 1;
        const iMa = isPowered && sw >= 1 && v > vf ? ((v - vf) / r) * 1000 : 0;
        return {
          netVoltages: { VCC: isPowered ? v : 0, LED_ANODE: isPowered && sw >= 1 ? vf : 0, GND: 0 },
          branchCurrents: { I_supply: Number(iMa.toFixed(2)) },
          waveforms: Array.from({ length: 40 }).map((_, i) => ({ time: i, vOut: isPowered && sw >= 1 ? vf : 0, vCap: v, current: iMa })),
          metrics: [
            { label: "LED Forward Current", value: iMa.toFixed(2), unit: "mA", formula: "(VCC - Vf) / R1" },
            { label: "LED Forward Drop", value: vf.toFixed(2), unit: "V", formula: "Vf diode" },
          ],
        };
      },
    },
    documentation: makeDoc("Limits diode forward current to safe operating levels below 20 mA.", "I_LED = (VCC - Vf) / R1", "9.09 mA at 5V / 330Ω", "V_anode = 2.0 V, I = 9.1 mA"),
    bom: makeSimpleBom(ledCircuitComps),
    datasheets: {},
    teachingSteps: [
      { title: "Step 1: Current Limiting", description: "R1 absorbs excess (VCC - Vf) potential.", highlightComponentIds: ["SW1", "R_LIMIT", "D1"] },
    ],
  },
  {
    id: "rc_charging_circuit",
    title: "RC Transient Step Charging Network (τ = R · C)",
    category: "Analog & Op-Amp / Timers" as ProjectCategory,
    subjectDomain: "A",
    domainTitle: "Linear Circuit Analysis (LCA)",
    description: "First-order RC step charging network (R1=10kΩ, C1=100µF, τ = 1.0 s) demonstrating exponential charging vC(t) = V·(1 - e^-t/τ).",
    defaultSupplyVoltage: 5.0,
    supplyVoltageUnit: "V",
    components: rcChargeComps,
    wires: rcChargeWires,
    simulationModel: {
      type: "ANALOG_TIMING",
      compute: (vals, supplyV, isPowered) => {
        const v = vals["V1"] ?? supplyV;
        const r = vals["R1"] ?? 10000;
        const cUf = vals["C1"] ?? 100;
        const tau = r * (cUf * 1e-6);
        const pts = Array.from({ length: 50 }).map((_, i) => {
          const t = (i / 49) * 5 * tau;
          const vc = isPowered ? v * (1 - Math.exp(-t / Math.max(1e-6, tau))) : 0;
          return { time: Number(t.toFixed(3)), vOut: vc, vCap: vc, current: ((v - vc) / r) * 1000 };
        });
        return {
          netVoltages: { VCC: isPowered ? v : 0, VC_NODE: isPowered ? Number((v * 0.6321).toFixed(3)) : 0, GND: 0 },
          branchCurrents: { I_supply: 0 },
          waveforms: pts,
          metrics: [
            { label: "Time Constant (τ)", value: tau.toFixed(3), unit: "s", formula: "τ = R1 × C1" },
            { label: "Voltage at t = 1τ", value: (v * 0.6321).toFixed(3), unit: "V", formula: "0.6321 × VCC" },
          ],
        };
      },
    },
    documentation: makeDoc("Capacitor voltage charges asymptotically toward VCC with time constant τ = RC.", "Vc(t) = VCC(1 - e^(-t/RC))", "Vc(τ) = 3.161 V at τ = 1.0 s", "63.2% at 1τ, 99.3% at 5τ"),
    bom: makeSimpleBom(rcChargeComps),
    datasheets: {},
    teachingSteps: [
      { title: "Step 1: Exponential Ramp", description: "Charging current decays as Vc approaches 5V.", highlightComponentIds: ["R1", "C1"] },
    ],
  },
  {
    id: "half_wave_rectifier",
    title: "Half-Wave 1N4007 Diode Rectifier with Resistive Load",
    category: "Power Electronics" as ProjectCategory,
    subjectDomain: "D",
    domainTitle: "Power Electronics & Rectifiers",
    description: "AC secondary source feeding a single 1N4007 silicon diode in series with a 1 kΩ load resistor.",
    defaultSupplyVoltage: 12.0,
    supplyVoltageUnit: "V pk",
    components: halfWaveComps,
    wires: halfWaveWires,
    simulationModel: {
      type: "RECTIFIER",
      compute: (vals, supplyV, isPowered) => {
        const vp = vals["V_AC"] ?? supplyV;
        const vd = vals["D1"] ?? 0.7;
        const rl = vals["R_LOAD"] ?? 1000;
        const vPeakOut = isPowered ? Math.max(0, vp - vd) : 0;
        const iPeakMa = (vPeakOut / rl) * 1000;
        const pts = Array.from({ length: 60 }).map((_, i) => {
          const th = (i / 59) * 4 * Math.PI;
          const vin = vp * Math.sin(th);
          const vout = isPowered ? Math.max(0, vin - vd) : 0;
          return { time: i, vIn: vin, vOut: vout, vCap: vout, current: (vout / rl) * 1000 };
        });
        return {
          netVoltages: { AC_IN: vp, V_RECT_OUT: Number(vPeakOut.toFixed(3)), GND: 0 },
          branchCurrents: { I_supply: Number(iPeakMa.toFixed(2)) },
          waveforms: pts,
          metrics: [
            { label: "Rectified Peak V_out", value: vPeakOut.toFixed(3), unit: "V", formula: "Vp - Vf" },
            { label: "Peak Load Current", value: iPeakMa.toFixed(2), unit: "mA", formula: "Vout_pk / R_LOAD" },
          ],
        };
      },
    },
    documentation: makeDoc("Single diode passes positive half-cycles (minus 0.7V junction drop) and blocks negative half-cycles.", "V_out_pk = V_in_pk - 0.7V", "11.30 V peak at 12 V pk input", "Unipolar half-wave pulses at f_line"),
    bom: makeSimpleBom(halfWaveComps),
    datasheets: {},
    teachingSteps: [
      { title: "Step 1: Positive Conduction", description: "D1 conducts whenever AC input exceeds +0.7V.", highlightComponentIds: ["D1", "R_LOAD"] },
    ],
  },
  {
    id: "full_wave_bridge_rectifier",
    title: "Full-Wave Graetz Bridge Rectifier & RC Smoothing Filter",
    category: "Power Electronics" as ProjectCategory,
    subjectDomain: "E",
    domainTitle: "Electronic Devices & Circuits (EDC)",
    description: "Four 1N4007 diodes arranged as a full-wave bridge rectifying both AC half-cycles into a 100µF reservoir capacitor and 470Ω load.",
    defaultSupplyVoltage: 12.0,
    supplyVoltageUnit: "V pk",
    components: bridgeComps,
    wires: bridgeWires,
    simulationModel: {
      type: "RECTIFIER",
      compute: (vals, supplyV, isPowered) => {
        const vp = vals["V_AC"] ?? supplyV;
        const rl = vals["R_LOAD"] ?? 470;
        const vPeakOut = isPowered ? Math.max(0, vp - 1.4) : 0;
        const iPeakMa = (vPeakOut / rl) * 1000;
        return {
          netVoltages: { DC_BUS_POS: Number(vPeakOut.toFixed(3)), GND: 0 },
          branchCurrents: { I_supply: Number(iPeakMa.toFixed(2)) },
          waveforms: Array.from({ length: 60 }).map((_, i) => {
            const vin = vp * Math.sin((i / 59) * 4 * Math.PI);
            const vout = isPowered ? Math.max(0, Math.abs(vin) - 1.4) : 0;
            return { time: i, vIn: vin, vOut: vout, vCap: vout, current: (vout / rl) * 1000 };
          }),
          metrics: [
            { label: "Bridge Peak Output", value: vPeakOut.toFixed(2), unit: "V", formula: "Vp - 2·Vf" },
            { label: "Ripple Frequency", value: "100", unit: "Hz", formula: "2 × f_line" },
          ],
        };
      },
    },
    documentation: makeDoc("Dual diode pairs invert negative half-cycles so the load receives continuous 2×f_line full-wave rectification.", "V_dc_pk = Vp - 2·Vf", "10.60 V peak at 100 Hz ripple", "Smoothed ~10.2V DC across R_LOAD"),
    bom: makeSimpleBom(bridgeComps),
    datasheets: {},
    teachingSteps: [
      { title: "Step 1: Full-Wave Steering", description: "D1+D4 conduct on positive peaks; D2+D3 conduct on negative peaks.", highlightComponentIds: ["D1", "D2", "D3", "D4", "C_FILT"] },
    ],
  },
  {
    id: "zener_voltage_regulator",
    title: "Zener Diode Shunt Voltage Regulator (5.1V Reference Rail)",
    category: "Transistors & Fundamentals" as ProjectCategory,
    subjectDomain: "E",
    domainTitle: "Electronic Devices & Circuits (EDC)",
    description: "15V DC input regulated down to a steady 5.1V across R_LOAD=1kΩ using a series 470Ω resistor and 1N4733A Zener shunt diode.",
    defaultSupplyVoltage: 15.0,
    supplyVoltageUnit: "V",
    components: zenerComps,
    wires: zenerWires,
    simulationModel: {
      type: "POWER_CONVERTER",
      compute: (vals, supplyV, isPowered) => {
        const vin = vals["V1"] ?? supplyV;
        const rs = vals["R_S"] ?? 470;
        const vz = vals["ZD1"] ?? 5.1;
        const rl = vals["R_LOAD"] ?? 1000;
        const vth = vin * (rl / (rs + rl));
        const vOut = isPowered ? (vth >= vz ? vz : vth) : 0;
        const iSeriesMa = isPowered ? ((vin - vOut) / rs) * 1000 : 0;
        return {
          netVoltages: { V_UNREG: isPowered ? vin : 0, V_REG_5V1: Number(vOut.toFixed(3)), GND: 0 },
          branchCurrents: { I_supply: Number(iSeriesMa.toFixed(2)) },
          waveforms: Array.from({ length: 40 }).map((_, i) => ({ time: i, vIn: vin, vOut, vCap: vOut, current: iSeriesMa })),
          metrics: [
            { label: "Regulated V_out", value: vOut.toFixed(3), unit: "V", formula: "V_Z = 5.1 V" },
            { label: "Series Current (I_S)", value: iSeriesMa.toFixed(2), unit: "mA", formula: "(Vin - Vout)/Rs" },
          ],
        };
      },
    },
    documentation: makeDoc("Zener avalanche breakdown holds output voltage nearly constant against load and input variations.", "I_S = (Vin - Vz) / R_S", "5.10 V regulated across 1 kΩ load", "V_REG = 5.10 V"),
    bom: makeSimpleBom(zenerComps),
    datasheets: {},
    teachingSteps: [
      { title: "Step 1: Reverse Breakdown Regulation", description: "ZD1 clamps output node at 5.1V whenever Thevenin voltage ≥ Vz.", highlightComponentIds: ["R_S", "ZD1", "R_LOAD"] },
    ],
  },
  {
    id: "opamp_inverting_amplifier",
    title: "LM741 Operational Amplifier Inverting Gain Stage (-10 V/V)",
    category: "Analog & Op-Amp / Timers" as ProjectCategory,
    subjectDomain: "B",
    domainTitle: "Linear Integrated Circuits (LIC)",
    description: "Closed-loop inverting op-amp configuration (Rin=10kΩ, Rf=100kΩ) delivering inverted voltage gain Av = -Rf/Rin = -10.0 V/V.",
    defaultSupplyVoltage: 15.0,
    supplyVoltageUnit: "V",
    components: opampInvComps,
    wires: opampInvWires,
    simulationModel: {
      type: "AMPLIFIER",
      compute: (vals, _supplyV, isPowered) => {
        const vin = vals["V_IN"] ?? 0.5;
        const rin = vals["R_IN"] ?? 10000;
        const rf = vals["R_F"] ?? 100000;
        const av = -(rf / rin);
        const vOutDc = isPowered ? av * vin : 0;
        const pts = Array.from({ length: 50 }).map((_, i) => {
          const s = Math.sin((i / 49) * 4 * Math.PI);
          return { time: i, vIn: vin * s, vOut: isPowered ? vOutDc * s : 0, vCap: vin * s };
        });
        return {
          netVoltages: { V_IN_AC: vin, SUM_NODE: 0.0001, V_OUT: Number(vOutDc.toFixed(3)), GND: 0 },
          branchCurrents: { I_supply: Number(((Math.abs(vin) / rin) * 1000).toFixed(3)) },
          waveforms: pts,
          metrics: [
            { label: "Closed-Loop Gain (Av)", value: av.toFixed(2), unit: "V/V", formula: "Av = -Rf / Rin" },
            { label: "Output Voltage (V_out)", value: vOutDc.toFixed(3), unit: "V", formula: "Av × Vin" },
          ],
        };
      },
    },
    documentation: makeDoc("Negative feedback enforces a 0V virtual ground at Pin 2, yielding inverting gain Av = -Rf / Rin.", "Av = -Rf / Rin", "-10.0 V/V (-5.00 V out for 0.5 V in)", "180° phase inversion, Av = -10"),
    bom: makeSimpleBom(opampInvComps),
    datasheets: {},
    teachingSteps: [
      { title: "Step 1: Virtual Ground Summing Node", description: "Pin 3 grounded forces Pin 2 ≈ 0V.", highlightComponentIds: ["R_IN", "R_F", "U1"] },
    ],
  },
  {
    id: "logic_gate_circuit",
    title: "74LS08 TTL 2-Input AND Logic Gate Combinational Stage",
    category: "Digital Logic & FSM" as ProjectCategory,
    subjectDomain: "C",
    domainTitle: "Digital Logic Design (DLD)",
    description: "Interactive dual-switch TTL combinational circuit driving an SN74LS08N AND gate and LED output indicator.",
    defaultSupplyVoltage: 5.0,
    supplyVoltageUnit: "V",
    components: logicGateComps,
    wires: logicGateWires,
    simulationModel: {
      type: "DIGITAL_LOGIC",
      compute: (vals, _supplyV, isPowered) => {
        const a = (vals["SW_A"] ?? 1) >= 1 ? 1 : 0;
        const b = (vals["SW_B"] ?? 1) >= 1 ? 1 : 0;
        const y = isPowered && a && b ? 1 : 0;
        return {
          netVoltages: { VCC: isPowered ? 5 : 0, IN_A: a * 5, IN_B: b * 5, Y_OUT: y * 4.2, GND: 0 },
          branchCurrents: { I_supply: y ? 9.5 : 1.5 },
          waveforms: Array.from({ length: 40 }).map((_, i) => ({ time: i, vOut: y * 4.2, vCap: a * 5 })),
          metrics: [
            { label: "Input A / B", value: `${a} / ${b}`, unit: "bin", formula: "SW_A · SW_B" },
            { label: "Gate Output Y", value: y ? "HIGH (1)" : "LOW (0)", unit: "", formula: "Y = A · B" },
          ],
        };
      },
    },
    documentation: makeDoc("Outputs HIGH (5V logic 1) exclusively when both switches SW_A and SW_B are closed.", "Y = A · B", "Y = 1 when A=1, B=1", "LED ON only when A=1 AND B=1"),
    bom: makeSimpleBom(logicGateComps),
    datasheets: {},
    teachingSteps: [
      { title: "Step 1: Combinational Logic Evaluation", description: "Toggle SW_A or SW_B and observe Y_OUT response.", highlightComponentIds: ["SW_A", "SW_B", "U1", "D1"] },
    ],
  },
];
