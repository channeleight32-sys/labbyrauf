import { PresetNodeDef, PresetWireDef, CIRCUIT_PRESETS } from "../data/logicSpecs";
import { MASTER_75_LABS } from "../data/master75Labs";

export interface LabCircuitPreset {
  title: string;
  labId: string;
  description: string;
  nodes: PresetNodeDef[];
  wires: PresetWireDef[];
}

/**
 * Per-lab tailored schematics across all 75 master labs (A01–E15).
 * Every lab produces its own electrically faithful topology rather than sharing
 * a generic domain-wide fallback.
 */
const EXPLICIT_LAB_SCHEMATICS: Record<
  string,
  { nodes: PresetNodeDef[]; wires: PresetWireDef[] }
> = {
  // =========================================================================
  // DOMAIN A: LINEAR CIRCUIT ANALYSIS & NETWORK THEOREMS (A01 - A15)
  // =========================================================================
  A01: {
    // Ohm's Law, KVL & KCL: 12V -> R1(100Ω) -> node -> parallel R2(200Ω) || R3(300Ω) -> GND + Ammeter
    nodes: [
      { type: "DC_VOLTAGE_SOURCE", x: 70, y: 170, label: "VS 12V", analogParams: { dcVoltageV: 12 } },
      { type: "AMMETER", x: 220, y: 110, label: "I_Total" },
      { type: "RES", x: 360, y: 110, label: "R1 100Ω", analogParams: { resistanceOhms: 100, formattedValue: "100 Ω" } },
      { type: "RES", x: 520, y: 110, label: "R2 200Ω", analogParams: { resistanceOhms: 200, formattedValue: "200 Ω" } },
      { type: "RES", x: 520, y: 220, label: "R3 300Ω", analogParams: { resistanceOhms: 300, formattedValue: "300 Ω" } },
      { type: "VOLTMETER", x: 680, y: 150, label: "V_node" },
      { type: "GND", x: 360, y: 310, label: "GND" },
    ],
    wires: [
      [0, 0, 1, 0],
      [1, 0, 2, 0],
      [2, 0, 3, 0],
      [2, 0, 4, 0],
      [2, 0, 5, 0],
      [3, 0, 6, 0],
      [4, 0, 6, 0],
      [5, 1, 6, 0],
      [0, 1, 6, 0],
    ],
  },
  A02: {
    // Superposition Theorem: Dual sources VS1=12V, VS2=6V across T-network R1-R3-R2
    nodes: [
      { type: "DC_VOLTAGE_SOURCE", x: 60, y: 170, label: "VS1 12V", analogParams: { dcVoltageV: 12 } },
      { type: "RES", x: 220, y: 110, label: "R1 100Ω", analogParams: { resistanceOhms: 100 } },
      { type: "RES", x: 390, y: 200, label: "R3 150Ω", analogParams: { resistanceOhms: 150 } },
      { type: "RES", x: 550, y: 110, label: "R2 200Ω", analogParams: { resistanceOhms: 200 } },
      { type: "DC_VOLTAGE_SOURCE", x: 700, y: 170, label: "VS2 6V", analogParams: { dcVoltageV: 6 } },
      { type: "VOLTMETER", x: 390, y: 70, label: "V_A" },
      { type: "GND", x: 390, y: 320, label: "GND" },
    ],
    wires: [
      [0, 0, 1, 0],
      [1, 0, 2, 0],
      [1, 0, 3, 0],
      [1, 0, 5, 0],
      [4, 0, 3, 0],
      [2, 0, 6, 0],
      [0, 1, 6, 0],
      [4, 1, 6, 0],
      [5, 1, 6, 0],
    ],
  },
  A03: {
    // Thevenin's & Norton's Theorem: 24V -> R1(60Ω) + R2(120Ω) divider + R3(20Ω) -> R_L(60Ω)
    nodes: [
      { type: "DC_VOLTAGE_SOURCE", x: 60, y: 170, label: "Vs 24V", analogParams: { dcVoltageV: 24 } },
      { type: "RES", x: 210, y: 110, label: "R1 60Ω", analogParams: { resistanceOhms: 60 } },
      { type: "RES", x: 340, y: 210, label: "R2 120Ω", analogParams: { resistanceOhms: 120 } },
      { type: "RES", x: 470, y: 110, label: "R3 20Ω", analogParams: { resistanceOhms: 20 } },
      { type: "RES", x: 620, y: 200, label: "R_Load 60Ω", analogParams: { resistanceOhms: 60 } },
      { type: "VOLTMETER", x: 750, y: 130, label: "V_AB" },
      { type: "GND", x: 340, y: 320, label: "GND" },
    ],
    wires: [
      [0, 0, 1, 0],
      [1, 0, 2, 0],
      [1, 0, 3, 0],
      [3, 0, 4, 0],
      [3, 0, 5, 0],
      [2, 0, 6, 0],
      [4, 0, 6, 0],
      [5, 1, 6, 0],
      [0, 1, 6, 0],
    ],
  },
  A04: {
    // Maximum Power Transfer & Reciprocity: Vth=16V, Rth=50Ω, Variable Load POT=50Ω + Power Meter
    nodes: [
      { type: "DC_VOLTAGE_SOURCE", x: 70, y: 170, label: "Vth 16V", analogParams: { dcVoltageV: 16 } },
      { type: "RES", x: 230, y: 120, label: "Rth 50Ω", analogParams: { resistanceOhms: 50 } },
      { type: "AMMETER", x: 380, y: 120, label: "I_Load" },
      { type: "POT", x: 540, y: 160, label: "R_L 50Ω", analogParams: { resistanceOhms: 50 } },
      { type: "VOLTMETER", x: 700, y: 160, label: "V_Load" },
      { type: "GND", x: 380, y: 300, label: "GND" },
    ],
    wires: [
      [0, 0, 1, 0],
      [1, 0, 2, 0],
      [2, 0, 3, 0],
      [2, 0, 4, 0],
      [3, 0, 5, 0],
      [4, 1, 5, 0],
      [0, 1, 5, 0],
    ],
  },
  A05: {
    // Transient Response RC & RL: Switch + R(1kΩ) + C(10µF) + L(50mH) branch
    nodes: [
      { type: "DC_VOLTAGE_SOURCE", x: 60, y: 170, label: "V_step 10V", analogParams: { dcVoltageV: 10 } },
      { type: "SWITCH_SPST", x: 200, y: 110, label: "SW_Step", value: 1 },
      { type: "RES", x: 350, y: 110, label: "R 1kΩ", analogParams: { resistanceOhms: 1000 } },
      { type: "CAP_NP", x: 510, y: 180, label: "C 10µF", analogParams: { capacitanceUf: 10 } },
      { type: "INDUCTOR", x: 640, y: 180, label: "L 50mH", analogParams: { inductanceMh: 50 } },
      { type: "GND", x: 350, y: 310, label: "GND" },
    ],
    wires: [
      [0, 0, 1, 0],
      [1, 0, 2, 0],
      [2, 0, 3, 0],
      [2, 0, 4, 0],
      [3, 0, 5, 0],
      [4, 0, 5, 0],
      [0, 1, 5, 0],
    ],
  },
  A06: {
    // Transient & Frequency Response of Series RLC Circuit
    nodes: [
      { type: "AC_SINE", x: 60, y: 160, label: "AC Sweep 10V", analogParams: { acVoltageV: 10, frequencyHz: 500 } },
      { type: "RES", x: 220, y: 120, label: "R 100Ω", analogParams: { resistanceOhms: 100 } },
      { type: "INDUCTOR", x: 380, y: 120, label: "L 50mH", analogParams: { inductanceMh: 50 } },
      { type: "CAP_NP", x: 540, y: 180, label: "C 2µF", analogParams: { capacitanceUf: 2 } },
      { type: "VOLTMETER", x: 700, y: 160, label: "Vc(t)" },
      { type: "GND", x: 380, y: 310, label: "GND" },
    ],
    wires: [
      [0, 0, 1, 0],
      [1, 0, 2, 0],
      [2, 0, 3, 0],
      [2, 0, 4, 0],
      [3, 0, 5, 0],
      [4, 1, 5, 0],
      [0, 1, 5, 0],
    ],
  },
  A07: {
    // Series & Parallel Resonance Tank (f0, Q, BW)
    nodes: [
      { type: "AC_SINE", x: 60, y: 170, label: "RF Gen 1kHz", analogParams: { acVoltageV: 12, frequencyHz: 1006 } },
      { type: "RES", x: 220, y: 110, label: "R_s 50Ω", analogParams: { resistanceOhms: 50 } },
      { type: "INDUCTOR", x: 400, y: 180, label: "L_tank 25mH", analogParams: { inductanceMh: 25 } },
      { type: "CAP_NP", x: 540, y: 180, label: "C_tank 1µF", analogParams: { capacitanceUf: 1 } },
      { type: "VOLTMETER", x: 690, y: 140, label: "V_tank" },
      { type: "GND", x: 400, y: 310, label: "GND" },
    ],
    wires: [
      [0, 0, 1, 0],
      [1, 0, 2, 0],
      [1, 0, 3, 0],
      [1, 0, 4, 0],
      [2, 0, 5, 0],
      [3, 0, 5, 0],
      [4, 1, 5, 0],
      [0, 1, 5, 0],
    ],
  },
  A08: {
    // Two-Port Network Parameters (Symmetric T-Network Ra, Rb, Shunt Rc)
    nodes: [
      { type: "DC_VOLTAGE_SOURCE", x: 60, y: 170, label: "Port1 V1=10V", analogParams: { dcVoltageV: 10 } },
      { type: "RES", x: 220, y: 110, label: "Ra 100Ω", analogParams: { resistanceOhms: 100 } },
      { type: "RES", x: 380, y: 200, label: "Rc 200Ω", analogParams: { resistanceOhms: 200 } },
      { type: "RES", x: 540, y: 110, label: "Rb 100Ω", analogParams: { resistanceOhms: 100 } },
      { type: "VOLTMETER", x: 700, y: 140, label: "Port2 V2" },
      { type: "GND", x: 380, y: 310, label: "GND" },
    ],
    wires: [
      [0, 0, 1, 0],
      [1, 0, 2, 0],
      [1, 0, 3, 0],
      [3, 0, 4, 0],
      [2, 0, 5, 0],
      [4, 1, 5, 0],
      [0, 1, 5, 0],
    ],
  },
  A09: {
    // Ladder / Pi Attenuator Network (600Ω Matched Load)
    nodes: [
      { type: "AC_SINE", x: 60, y: 170, label: "Vin 10V", analogParams: { acVoltageV: 10, frequencyHz: 1000 } },
      { type: "RES", x: 200, y: 190, label: "R_shunt1 1.15kΩ", analogParams: { resistanceOhms: 1150 } },
      { type: "RES", x: 350, y: 110, label: "R_series 854Ω", analogParams: { resistanceOhms: 854 } },
      { type: "RES", x: 500, y: 190, label: "R_shunt2 1.15kΩ", analogParams: { resistanceOhms: 1150 } },
      { type: "RES", x: 640, y: 190, label: "Z0 600Ω", analogParams: { resistanceOhms: 600 } },
      { type: "GND", x: 350, y: 310, label: "GND" },
    ],
    wires: [
      [0, 0, 1, 0],
      [0, 0, 2, 0],
      [2, 0, 3, 0],
      [2, 0, 4, 0],
      [1, 0, 5, 0],
      [3, 0, 5, 0],
      [4, 0, 5, 0],
      [0, 1, 5, 0],
    ],
  },
  A10: {
    // Bridge Networks - Wheatstone & Wien Bridge
    nodes: [
      { type: "DC_VOLTAGE_SOURCE", x: 60, y: 180, label: "V_bridge 12V", analogParams: { dcVoltageV: 12 } },
      { type: "RES", x: 230, y: 100, label: "R1 1kΩ", analogParams: { resistanceOhms: 1000 } },
      { type: "RES", x: 430, y: 100, label: "R2 2kΩ", analogParams: { resistanceOhms: 2000 } },
      { type: "RES", x: 230, y: 230, label: "R3 1kΩ", analogParams: { resistanceOhms: 1000 } },
      { type: "POT", x: 430, y: 230, label: "Rx_Balance 2kΩ", analogParams: { resistanceOhms: 2000 } },
      { type: "VOLTMETER", x: 640, y: 170, label: "V_Null" },
      { type: "GND", x: 60, y: 310, label: "GND" },
    ],
    wires: [
      [0, 0, 1, 0],
      [0, 0, 2, 0],
      [1, 0, 3, 0],
      [1, 0, 5, 0],
      [2, 0, 4, 0],
      [2, 0, 5, 1],
      [3, 0, 6, 0],
      [4, 0, 6, 0],
      [0, 1, 6, 0],
    ],
  },
  A11: {
    // Millman's Parallel Generator Theorem (3 parallel voltage branches to common node)
    nodes: [
      { type: "DC_VOLTAGE_SOURCE", x: 60, y: 80, label: "E1 12V", analogParams: { dcVoltageV: 12 } },
      { type: "DC_VOLTAGE_SOURCE", x: 60, y: 180, label: "E2 6V", analogParams: { dcVoltageV: 6 } },
      { type: "RES", x: 240, y: 80, label: "R1 100Ω", analogParams: { resistanceOhms: 100 } },
      { type: "RES", x: 240, y: 180, label: "R2 200Ω", analogParams: { resistanceOhms: 200 } },
      { type: "RES", x: 440, y: 140, label: "R_Load 300Ω", analogParams: { resistanceOhms: 300 } },
      { type: "VOLTMETER", x: 620, y: 140, label: "V_Millman" },
      { type: "GND", x: 440, y: 290, label: "GND" },
    ],
    wires: [
      [0, 0, 2, 0],
      [1, 0, 3, 0],
      [2, 0, 4, 0],
      [3, 0, 4, 0],
      [4, 0, 5, 0],
      [4, 0, 6, 0],
      [5, 1, 6, 0],
      [0, 1, 6, 0],
      [1, 1, 6, 0],
    ],
  },
  A12: {
    // Coupled Circuits & Mutual Inductance Transformer
    nodes: [
      { type: "AC_SINE", x: 60, y: 160, label: "AC Primary 12V", analogParams: { acVoltageV: 12, frequencyHz: 1000 } },
      { type: "RES", x: 210, y: 130, label: "R_pri 50Ω", analogParams: { resistanceOhms: 50 } },
      { type: "TRANSFORMER", x: 380, y: 150, label: "M=0.8 TX" },
      { type: "RES", x: 560, y: 150, label: "R_sec 100Ω", analogParams: { resistanceOhms: 100 } },
      { type: "VOLTMETER", x: 710, y: 150, label: "V_sec" },
      { type: "GND", x: 380, y: 300, label: "GND" },
    ],
    wires: [
      [0, 0, 1, 0],
      [1, 0, 2, 0],
      [0, 1, 2, 1],
      [2, 0, 3, 0],
      [3, 0, 4, 0],
      [2, 1, 5, 0],
      [4, 1, 5, 0],
    ],
  },
  A13: {
    // Cascade Interconnection of Two-Port RC Sections
    nodes: [
      { type: "AC_SINE", x: 60, y: 160, label: "Vin 5V", analogParams: { acVoltageV: 5, frequencyHz: 1000 } },
      { type: "RES", x: 210, y: 110, label: "R1 1kΩ", analogParams: { resistanceOhms: 1000 } },
      { type: "CAP_NP", x: 340, y: 200, label: "C1 100nF", analogParams: { capacitanceUf: 0.1 } },
      { type: "RES", x: 480, y: 110, label: "R2 2.2kΩ", analogParams: { resistanceOhms: 2200 } },
      { type: "CAP_NP", x: 610, y: 200, label: "C2 47nF", analogParams: { capacitanceUf: 0.047 } },
      { type: "GND", x: 480, y: 310, label: "GND" },
    ],
    wires: [
      [0, 0, 1, 0],
      [1, 0, 2, 0],
      [1, 0, 3, 0],
      [3, 0, 4, 0],
      [2, 0, 5, 0],
      [4, 0, 5, 0],
      [0, 1, 5, 0],
    ],
  },
  A14: {
    // LTSpice Network Theorems Verification Mesh
    nodes: [
      { type: "DC_VOLTAGE_SOURCE", x: 60, y: 160, label: "Vs 15V", analogParams: { dcVoltageV: 15 } },
      { type: "RES", x: 210, y: 100, label: "R1 220Ω", analogParams: { resistanceOhms: 220 } },
      { type: "RES", x: 360, y: 100, label: "R2 330Ω", analogParams: { resistanceOhms: 330 } },
      { type: "RES", x: 360, y: 210, label: "R3 470Ω", analogParams: { resistanceOhms: 470 } },
      { type: "RES", x: 540, y: 210, label: "R4 1kΩ", analogParams: { resistanceOhms: 1000 } },
      { type: "VOLTMETER", x: 690, y: 140, label: "V_mesh" },
      { type: "GND", x: 360, y: 310, label: "GND" },
    ],
    wires: [
      [0, 0, 1, 0],
      [1, 0, 2, 0],
      [1, 0, 3, 0],
      [2, 0, 4, 0],
      [2, 0, 5, 0],
      [3, 0, 6, 0],
      [4, 0, 6, 0],
      [5, 1, 6, 0],
      [0, 1, 6, 0],
    ],
  },
  A15: {
    // Frequency Domain & Pole-Zero RLC Transfer Network
    nodes: [
      { type: "AC_SINE", x: 60, y: 160, label: "AC 10V Sweep", analogParams: { acVoltageV: 10, frequencyHz: 1590 } },
      { type: "INDUCTOR", x: 220, y: 110, label: "L 10mH", analogParams: { inductanceMh: 10 } },
      { type: "RES", x: 390, y: 110, label: "R_damp 470Ω", analogParams: { resistanceOhms: 470 } },
      { type: "CAP_NP", x: 540, y: 190, label: "C_pole 1µF", analogParams: { capacitanceUf: 1 } },
      { type: "VOLTMETER", x: 700, y: 150, label: "H(jw)" },
      { type: "GND", x: 540, y: 310, label: "GND" },
    ],
    wires: [
      [0, 0, 1, 0],
      [1, 0, 2, 0],
      [2, 0, 3, 0],
      [2, 0, 4, 0],
      [3, 0, 5, 0],
      [4, 1, 5, 0],
      [0, 1, 5, 0],
    ],
  },

  // =========================================================================
  // DOMAIN B: LINEAR INTEGRATED CIRCUITS & OP-AMPS (B01 - B15)
  // =========================================================================
  B01: {
    // Op-Amp Inverting / Non-Inverting Amplifier
    nodes: [
      { type: "AC_SINE", x: 60, y: 130, label: "Vin 1V", analogParams: { acVoltageV: 1, frequencyHz: 1000 } },
      { type: "VCC_12V", x: 60, y: 250, label: "+12V Rail" },
      { type: "RES", x: 220, y: 130, label: "Rin 10kΩ", analogParams: { resistanceOhms: 10000 } },
      { type: "OPAMP_741", x: 400, y: 150, label: "UA741" },
      { type: "RES", x: 400, y: 50, label: "Rf 100kΩ", analogParams: { resistanceOhms: 100000 } },
      { type: "VOLTMETER", x: 600, y: 150, label: "Vout (-10V)" },
      { type: "GND", x: 220, y: 290, label: "GND" },
    ],
    wires: [
      [0, 0, 2, 0],
      [2, 0, 3, 1],
      [6, 0, 3, 0],
      [1, 0, 3, 2],
      [3, 0, 4, 0],
      [4, 0, 3, 1],
      [3, 0, 5, 0],
      [5, 1, 6, 0],
    ],
  },
  B02: {
    // Op-Amp Summing Adder & Subtractor
    nodes: [
      { type: "DC_VOLTAGE_SOURCE", x: 60, y: 90, label: "V1 2V", analogParams: { dcVoltageV: 2 } },
      { type: "DC_VOLTAGE_SOURCE", x: 60, y: 200, label: "V2 3V", analogParams: { dcVoltageV: 3 } },
      { type: "RES", x: 220, y: 90, label: "R1 10kΩ", analogParams: { resistanceOhms: 10000 } },
      { type: "RES", x: 220, y: 200, label: "R2 10kΩ", analogParams: { resistanceOhms: 10000 } },
      { type: "OPAMP_741", x: 420, y: 145, label: "LM358 Adder" },
      { type: "RES", x: 420, y: 45, label: "Rf 10kΩ", analogParams: { resistanceOhms: 10000 } },
      { type: "VOLTMETER", x: 620, y: 145, label: "V_sum" },
      { type: "GND", x: 220, y: 310, label: "GND" },
    ],
    wires: [
      [0, 0, 2, 0],
      [1, 0, 3, 0],
      [2, 0, 4, 1],
      [3, 0, 4, 1],
      [7, 0, 4, 0],
      [4, 0, 5, 0],
      [5, 0, 4, 1],
      [4, 0, 6, 0],
      [6, 1, 7, 0],
    ],
  },
  B03: {
    // Op-Amp Integrator & Differentiator
    nodes: [
      { type: "AC_SINE", x: 60, y: 140, label: "Square/Sine 5V", analogParams: { acVoltageV: 5, frequencyHz: 1000 } },
      { type: "RES", x: 220, y: 140, label: "R_in 10kΩ", analogParams: { resistanceOhms: 10000 } },
      { type: "OPAMP_741", x: 410, y: 150, label: "741 Integrator" },
      { type: "CAP_NP", x: 410, y: 50, label: "Cf 100nF", analogParams: { capacitanceUf: 0.1 } },
      { type: "RES", x: 570, y: 50, label: "R_dc 100kΩ", analogParams: { resistanceOhms: 100000 } },
      { type: "VOLTMETER", x: 680, y: 150, label: "V_tri" },
      { type: "GND", x: 220, y: 290, label: "GND" },
    ],
    wires: [
      [0, 0, 1, 0],
      [1, 0, 2, 1],
      [6, 0, 2, 0],
      [2, 0, 3, 0],
      [3, 0, 2, 1],
      [2, 0, 4, 0],
      [4, 0, 2, 1],
      [2, 0, 5, 0],
      [5, 1, 6, 0],
    ],
  },
  B04: {
    // Instrumentation Amplifier Sensor Bridge Interface
    nodes: [
      { type: "DC_VOLTAGE_SOURCE", x: 60, y: 140, label: "V_bridge+ 2.6V", analogParams: { dcVoltageV: 2.6 } },
      { type: "DC_VOLTAGE_SOURCE", x: 60, y: 250, label: "V_bridge- 2.4V", analogParams: { dcVoltageV: 2.4 } },
      { type: "LM358", x: 270, y: 110, label: "U1A Buffer" },
      { type: "LM358", x: 270, y: 240, label: "U1B Buffer" },
      { type: "OPAMP_741", x: 500, y: 170, label: "U2 Diff Stage" },
      { type: "RES", x: 380, y: 170, label: "Rg 1kΩ", analogParams: { resistanceOhms: 1000 } },
      { type: "VOLTMETER", x: 690, y: 170, label: "V_diff_out" },
    ],
    wires: [
      [0, 0, 2, 0],
      [1, 0, 3, 0],
      [2, 0, 4, 0],
      [3, 0, 4, 1],
      [2, 0, 5, 0],
      [5, 0, 3, 1],
      [4, 0, 6, 0],
    ],
  },
  B05: {
    // Active 2nd-Order Sallen-Key Low-Pass Filter
    nodes: [
      { type: "AC_SINE", x: 60, y: 140, label: "Vin AC 5V", analogParams: { acVoltageV: 5, frequencyHz: 1000 } },
      { type: "RES", x: 200, y: 110, label: "R1 10kΩ", analogParams: { resistanceOhms: 10000 } },
      { type: "RES", x: 340, y: 110, label: "R2 10kΩ", analogParams: { resistanceOhms: 10000 } },
      { type: "CAP_NP", x: 340, y: 230, label: "C1 15nF", analogParams: { capacitanceUf: 0.015 } },
      { type: "CAP_NP", x: 490, y: 230, label: "C2 15nF", analogParams: { capacitanceUf: 0.015 } },
      { type: "OPAMP_741", x: 510, y: 120, label: "Sallen-Key 741" },
      { type: "VOLTMETER", x: 700, y: 120, label: "V_LPF" },
      { type: "GND", x: 490, y: 320, label: "GND" },
    ],
    wires: [
      [0, 0, 1, 0],
      [1, 0, 2, 0],
      [1, 0, 3, 0],
      [2, 0, 5, 0],
      [2, 0, 4, 0],
      [4, 0, 7, 0],
      [5, 0, 3, 0],
      [5, 0, 5, 1],
      [5, 0, 6, 0],
      [6, 1, 7, 0],
    ],
  },
  B06: {
    // Precision Half-Wave Rectifier (Op-Amp + Feedback Diode)
    nodes: [
      { type: "AC_SINE", x: 60, y: 150, label: "Vin 1Vpp", analogParams: { acVoltageV: 1, frequencyHz: 500 } },
      { type: "OPAMP_741", x: 240, y: 150, label: "741 Precision" },
      { type: "DIODE_1N4007", x: 420, y: 150, label: "D1 1N4148" },
      { type: "RES", x: 580, y: 220, label: "R_load 10kΩ", analogParams: { resistanceOhms: 10000 } },
      { type: "VOLTMETER", x: 720, y: 150, label: "V_prec_out" },
      { type: "GND", x: 580, y: 320, label: "GND" },
    ],
    wires: [
      [0, 0, 1, 0],
      [1, 0, 2, 0],
      [2, 0, 1, 1],
      [2, 0, 3, 0],
      [2, 0, 4, 0],
      [3, 0, 5, 0],
      [4, 1, 5, 0],
    ],
  },
  B07: {
    // Biased Diode Clipper & Clamper Peak Detector
    nodes: [
      { type: "AC_SINE", x: 60, y: 150, label: "Vin 10Vpp", analogParams: { acVoltageV: 10, frequencyHz: 1000 } },
      { type: "RES", x: 210, y: 120, label: "Rs 1kΩ", analogParams: { resistanceOhms: 1000 } },
      { type: "DIODE_1N4007", x: 370, y: 180, label: "D_clip" },
      { type: "DC_VOLTAGE_SOURCE", x: 370, y: 280, label: "V_bias 2.5V", analogParams: { dcVoltageV: 2.5 } },
      { type: "CAP_POL", x: 530, y: 180, label: "C_peak 10µF", analogParams: { capacitanceUf: 10 } },
      { type: "VOLTMETER", x: 690, y: 140, label: "V_clipped" },
      { type: "GND", x: 530, y: 310, label: "GND" },
    ],
    wires: [
      [0, 0, 1, 0],
      [1, 0, 2, 0],
      [2, 0, 3, 0],
      [1, 0, 4, 0],
      [1, 0, 5, 0],
      [4, 0, 6, 0],
      [5, 1, 6, 0],
      [3, 1, 6, 0],
    ],
  },
  B08: {
    // Comparator, Zero-Crossing Detector & Schmitt Trigger (LM393)
    nodes: [
      { type: "AC_SINE", x: 60, y: 140, label: "Vin Sine", analogParams: { acVoltageV: 5, frequencyHz: 1000 } },
      { type: "VCC_5V", x: 60, y: 250, label: "+5V" },
      { type: "LM393", x: 290, y: 150, label: "LM393 Schmitt" },
      { type: "RES", x: 470, y: 70, label: "R_hyst 100kΩ", analogParams: { resistanceOhms: 100000 } },
      { type: "RES", x: 470, y: 210, label: "R_pullup 2.2kΩ", analogParams: { resistanceOhms: 2200 } },
      { type: "LED_GREEN", x: 650, y: 150, label: "OUT Square" },
      { type: "GND", x: 290, y: 310, label: "GND" },
    ],
    wires: [
      [0, 0, 2, 1],
      [1, 0, 2, 2],
      [2, 0, 3, 0],
      [3, 0, 2, 0],
      [1, 0, 4, 0],
      [4, 0, 2, 0],
      [2, 0, 5, 0],
      [6, 0, 5, 1],
    ],
  },
  B09: {
    // Op-Amp Square & Triangular Waveform Generator (Astable Relaxation)
    nodes: [
      { type: "VCC_12V", x: 60, y: 120, label: "+12V" },
      { type: "OPAMP_741", x: 250, y: 140, label: "741 Hysteresis" },
      { type: "RES", x: 420, y: 140, label: "R_timing 10kΩ", analogParams: { resistanceOhms: 10000 } },
      { type: "CAP_NP", x: 420, y: 250, label: "C_timing 100nF", analogParams: { capacitanceUf: 0.1 } },
      { type: "OPAMP_741", x: 580, y: 140, label: "741 Integrator" },
      { type: "VOLTMETER", x: 740, y: 140, label: "V_tri_out" },
      { type: "GND", x: 420, y: 340, label: "GND" },
    ],
    wires: [
      [0, 0, 1, 2],
      [1, 0, 2, 0],
      [2, 0, 3, 0],
      [2, 0, 1, 1],
      [1, 0, 4, 1],
      [0, 0, 4, 2],
      [4, 0, 5, 0],
      [3, 0, 6, 0],
    ],
  },
  B10: {
    // Wien Bridge RC Sine-Wave Oscillator
    nodes: [
      { type: "VCC_12V", x: 60, y: 140, label: "+12V" },
      { type: "OPAMP_741", x: 300, y: 150, label: "741 Wien Osc" },
      { type: "RES", x: 160, y: 60, label: "R1 10kΩ", analogParams: { resistanceOhms: 10000 } },
      { type: "CAP_NP", x: 300, y: 60, label: "C1 15nF", analogParams: { capacitanceUf: 0.015 } },
      { type: "RES", x: 460, y: 240, label: "Rf 22kΩ", analogParams: { resistanceOhms: 22000 } },
      { type: "RES", x: 290, y: 240, label: "Rg 10kΩ", analogParams: { resistanceOhms: 10000 } },
      { type: "VOLTMETER", x: 660, y: 150, label: "V_sine_1kHz" },
      { type: "GND", x: 290, y: 330, label: "GND" },
    ],
    wires: [
      [0, 0, 1, 2],
      [1, 0, 2, 0],
      [2, 0, 3, 0],
      [3, 0, 1, 0],
      [1, 0, 4, 0],
      [4, 0, 1, 1],
      [1, 1, 5, 0],
      [5, 0, 7, 0],
      [1, 0, 6, 0],
    ],
  },
  B11: {
    // VCO & PLL 565 Frequency Synthesizer
    nodes: [
      { type: "AC_SINE", x: 60, y: 140, label: "F_in Reference", analogParams: { acVoltageV: 5, frequencyHz: 2000 } },
      { type: "TIMER_555", x: 270, y: 150, label: "555 VCO Stage" },
      { type: "RES", x: 450, y: 120, label: "R_loop 4.7kΩ", analogParams: { resistanceOhms: 4700 } },
      { type: "CAP_NP", x: 450, y: 230, label: "C_loop 100nF", analogParams: { capacitanceUf: 0.1 } },
      { type: "LM393", x: 610, y: 150, label: "Phase Comp" },
      { type: "OUTPUT", x: 760, y: 150, label: "PLL_LOCK" },
    ],
    wires: [
      [0, 0, 4, 0],
      [1, 0, 2, 0],
      [2, 0, 3, 0],
      [2, 0, 4, 1],
      [4, 0, 5, 0],
    ],
  },
  B12: {
    // IC 723 / LM317 Adjustable Regulator & 555 Astable Timer
    nodes: [
      { type: "VCC_12V", x: 60, y: 130, label: "Vin +12V" },
      { type: "LM317", x: 230, y: 130, label: "LM317 Adj Reg" },
      { type: "RES", x: 230, y: 240, label: "R_adj 240Ω", analogParams: { resistanceOhms: 240 } },
      { type: "TIMER_555", x: 430, y: 140, label: "NE555 Astable" },
      { type: "RES", x: 600, y: 140, label: "R_led 330Ω", analogParams: { resistanceOhms: 330 } },
      { type: "LED_RED", x: 740, y: 140, label: "Pulse LED" },
      { type: "GND", x: 430, y: 300, label: "GND" },
    ],
    wires: [
      [0, 0, 1, 0],
      [1, 0, 2, 0],
      [2, 0, 6, 0],
      [1, 0, 3, 2],
      [3, 0, 4, 0],
      [4, 0, 5, 0],
      [5, 0, 6, 0],
    ],
  },
  B13: {
    // Log / Antilog Op-Amp Amplifier (BJT Feedback)
    nodes: [
      { type: "DC_VOLTAGE_SOURCE", x: 60, y: 140, label: "Vin 2V", analogParams: { dcVoltageV: 2 } },
      { type: "RES", x: 210, y: 140, label: "Rin 10kΩ", analogParams: { resistanceOhms: 10000 } },
      { type: "OPAMP_741", x: 390, y: 150, label: "741 Log Amp" },
      { type: "BC547", x: 390, y: 50, label: "Q1 Log Feedback" },
      { type: "VOLTMETER", x: 620, y: 150, label: "V_log_out" },
      { type: "GND", x: 210, y: 280, label: "GND" },
    ],
    wires: [
      [0, 0, 1, 0],
      [1, 0, 2, 1],
      [5, 0, 2, 0],
      [2, 0, 3, 1],
      [3, 0, 2, 1],
      [2, 0, 4, 0],
      [4, 1, 5, 0],
    ],
  },
  B14: {
    // Multisim Active Band-Pass Filter Frequency Response
    nodes: [
      { type: "AC_SINE", x: 60, y: 150, label: "AC Sweep", analogParams: { acVoltageV: 5, frequencyHz: 1590 } },
      { type: "CAP_NP", x: 200, y: 130, label: "C_HP 10nF", analogParams: { capacitanceUf: 0.01 } },
      { type: "RES", x: 330, y: 130, label: "R1 10kΩ", analogParams: { resistanceOhms: 10000 } },
      { type: "OPAMP_741", x: 500, y: 150, label: "BPF Stage" },
      { type: "CAP_NP", x: 500, y: 50, label: "C_LP 10nF", analogParams: { capacitanceUf: 0.01 } },
      { type: "VOLTMETER", x: 700, y: 150, label: "V_BPF" },
      { type: "GND", x: 330, y: 290, label: "GND" },
    ],
    wires: [
      [0, 0, 1, 0],
      [1, 0, 2, 0],
      [2, 0, 3, 1],
      [6, 0, 3, 0],
      [3, 0, 4, 0],
      [4, 0, 3, 1],
      [3, 0, 5, 0],
      [5, 1, 6, 0],
    ],
  },
  B15: {
    // Op-Amp Stability, Phase Margin & Slew Rate Test Bench
    nodes: [
      { type: "AC_SINE", x: 60, y: 150, label: "Step 10V 50kHz", analogParams: { acVoltageV: 10, frequencyHz: 50000 } },
      { type: "OPAMP_741", x: 270, y: 150, label: "741 Voltage Follower" },
      { type: "CAP_NP", x: 460, y: 220, label: "C_comp 33pF", analogParams: { capacitanceUf: 0.000033 } },
      { type: "RES", x: 580, y: 220, label: "R_load 2kΩ", analogParams: { resistanceOhms: 2000 } },
      { type: "VOLTMETER", x: 710, y: 150, label: "Slew Out" },
      { type: "GND", x: 460, y: 320, label: "GND" },
    ],
    wires: [
      [0, 0, 1, 0],
      [1, 0, 1, 1],
      [1, 0, 2, 0],
      [1, 0, 3, 0],
      [1, 0, 4, 0],
      [2, 0, 5, 0],
      [3, 0, 5, 0],
      [4, 1, 5, 0],
    ],
  },

  // =========================================================================
  // DOMAIN C: DIGITAL LOGIC DESIGN (C01 - C15)
  // =========================================================================
  C01: {
    // Basic Logic Gates & Universal NAND/NOR Verification
    nodes: [
      { type: "INPUT", x: 60, y: 80, value: 1, label: "A" },
      { type: "INPUT", x: 60, y: 220, value: 1, label: "B" },
      { type: "AND", x: 260, y: 70 },
      { type: "NAND", x: 260, y: 165 },
      { type: "XOR", x: 260, y: 260 },
      { type: "OUTPUT", x: 500, y: 70, label: "A·B" },
      { type: "OUTPUT", x: 500, y: 165, label: "NAND" },
      { type: "OUTPUT", x: 500, y: 260, label: "A⊕B" },
    ],
    wires: [
      [0, 0, 2, 0],
      [1, 0, 2, 1],
      [0, 0, 3, 0],
      [1, 0, 3, 1],
      [0, 0, 4, 0],
      [1, 0, 4, 1],
      [2, 0, 5, 0],
      [3, 0, 6, 0],
      [4, 0, 7, 0],
    ],
  },
  // C02 uses "Full Adder"
  C03: {
    // 4-Bit Binary Adder (74LS83)
    nodes: [
      { type: "INPUT", x: 50, y: 60, value: 1, label: "A0" },
      { type: "INPUT", x: 50, y: 130, value: 1, label: "A1" },
      { type: "INPUT", x: 50, y: 200, value: 1, label: "B0" },
      { type: "INPUT", x: 50, y: 270, value: 0, label: "B1" },
      { type: "7483", x: 280, y: 120, label: "74LS83 4-Bit Adder" },
      { type: "OUTPUT", x: 540, y: 90, label: "S0" },
      { type: "OUTPUT", x: 540, y: 160, label: "S1" },
      { type: "OUTPUT", x: 540, y: 230, label: "S2" },
      { type: "OUTPUT", x: 540, y: 300, label: "Cout" },
    ],
    wires: [
      [0, 0, 4, 0],
      [1, 0, 4, 1],
      [2, 0, 4, 4],
      [3, 0, 4, 5],
      [4, 0, 5, 0],
      [4, 1, 6, 0],
      [4, 2, 7, 0],
      [4, 4, 8, 0],
    ],
  },
  C04: {
    // Binary to Gray Code Converter (3-Bit XOR Ladder)
    nodes: [
      { type: "INPUT", x: 60, y: 70, value: 1, label: "B2 (MSB)" },
      { type: "INPUT", x: 60, y: 160, value: 0, label: "B1" },
      { type: "INPUT", x: 60, y: 250, value: 1, label: "B0 (LSB)" },
      { type: "XOR", x: 290, y: 140, label: "B2⊕B1" },
      { type: "XOR", x: 290, y: 230, label: "B1⊕B0" },
      { type: "OUTPUT", x: 520, y: 70, label: "G2" },
      { type: "OUTPUT", x: 520, y: 150, label: "G1" },
      { type: "OUTPUT", x: 520, y: 235, label: "G0" },
    ],
    wires: [
      [0, 0, 5, 0],
      [0, 0, 3, 0],
      [1, 0, 3, 1],
      [1, 0, 4, 0],
      [2, 0, 4, 1],
      [3, 0, 6, 0],
      [4, 0, 7, 0],
    ],
  },
  // C05 uses "4:1 Multiplexer (MUX4)"
  C06: {
    // 4-Bit Magnitude Comparator (74LS85)
    nodes: [
      { type: "INPUT", x: 50, y: 70, value: 1, label: "A0" },
      { type: "INPUT", x: 50, y: 140, value: 1, label: "A1" },
      { type: "INPUT", x: 50, y: 210, value: 0, label: "B0" },
      { type: "INPUT", x: 50, y: 280, value: 1, label: "B1" },
      { type: "7485", x: 280, y: 120, label: "74LS85 CMP" },
      { type: "OUTPUT", x: 540, y: 100, label: "A > B" },
      { type: "OUTPUT", x: 540, y: 175, label: "A = B" },
      { type: "OUTPUT", x: 540, y: 250, label: "A < B" },
    ],
    wires: [
      [0, 0, 4, 0],
      [1, 0, 4, 1],
      [2, 0, 4, 4],
      [3, 0, 4, 5],
      [4, 0, 5, 0],
      [4, 1, 6, 0],
      [4, 2, 7, 0],
    ],
  },
  // C07 uses "JK Flip-Flop" / "Dual D FF (7474)"
  // C08 uses "4-Bit Counter (74193)"
  C09: {
    // 4-Bit Universal Shift Register (74LS194)
    nodes: [
      { type: "INPUT", x: 50, y: 70, value: 1, label: "SIR" },
      { type: "INPUT", x: 50, y: 140, value: 1, label: "S0" },
      { type: "INPUT", x: 50, y: 210, value: 0, label: "S1" },
      { type: "CLOCK", x: 50, y: 280, value: 0, label: "CLK" },
      { type: "74194", x: 280, y: 130, label: "74LS194 SR" },
      { type: "OUTPUT", x: 550, y: 90, label: "QA" },
      { type: "OUTPUT", x: 550, y: 160, label: "QB" },
      { type: "OUTPUT", x: 550, y: 230, label: "QC" },
      { type: "OUTPUT", x: 550, y: 300, label: "QD" },
    ],
    wires: [
      [0, 0, 4, 0],
      [1, 0, 4, 2],
      [2, 0, 4, 3],
      [3, 0, 4, 4],
      [4, 0, 5, 0],
      [4, 1, 6, 0],
      [4, 2, 7, 0],
      [4, 3, 8, 0],
    ],
  },
  C10: {
    // Johnson & Ring Counter using Feedback 74194
    nodes: [
      { type: "INPUT", x: 60, y: 90, value: 1, label: "MODE_SHIFT" },
      { type: "CLOCK", x: 60, y: 210, value: 0, label: "CLK" },
      { type: "74194", x: 260, y: 120, label: "Johnson 4-Bit" },
      { type: "NOT", x: 460, y: 290, label: "Invert QD" },
      { type: "OUTPUT", x: 540, y: 90, label: "Q0" },
      { type: "OUTPUT", x: 540, y: 155, label: "Q1" },
      { type: "OUTPUT", x: 540, y: 220, label: "Q2" },
    ],
    wires: [
      [0, 0, 2, 2],
      [1, 0, 2, 4],
      [2, 3, 3, 0],
      [3, 0, 2, 0],
      [2, 0, 4, 0],
      [2, 1, 5, 0],
      [2, 2, 6, 0],
    ],
  },
  C11: {
    // Sequence Detector Mealy/Moore FSM (Dual D Flip-Flop + Gate Logic)
    nodes: [
      { type: "INPUT", x: 60, y: 80, value: 1, label: "X_in" },
      { type: "CLOCK", x: 60, y: 210, value: 0, label: "CLK" },
      { type: "DFF", x: 240, y: 100, label: "FF_S1" },
      { type: "DFF", x: 410, y: 140, label: "FF_S0" },
      { type: "AND", x: 560, y: 130, label: "Detect 11" },
      { type: "OUTPUT", x: 710, y: 130, label: "Z_Detect" },
    ],
    wires: [
      [0, 0, 2, 0],
      [1, 0, 2, 1],
      [2, 0, 3, 0],
      [1, 0, 3, 1],
      [2, 0, 4, 0],
      [3, 0, 4, 1],
      [4, 0, 5, 0],
    ],
  },
  C12: {
    // Arithmetic & Logic Unit + 7-Segment Output Driver
    nodes: [
      { type: "INPUT", x: 50, y: 70, value: 1, label: "A0" },
      { type: "INPUT", x: 50, y: 140, value: 1, label: "B0" },
      { type: "INPUT", x: 50, y: 220, value: 0, label: "B1" },
      { type: "7483", x: 240, y: 100, label: "ALU Adder" },
      { type: "7447", x: 440, y: 120, label: "BCD 7447" },
      { type: "7SEG", x: 640, y: 110 },
    ],
    wires: [
      [0, 0, 3, 0],
      [1, 0, 3, 4],
      [2, 0, 3, 5],
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
    ],
  },
  C13: {
    // A/D and D/A Converter Interfacing (ADC0804 -> DAC0808)
    nodes: [
      { type: "DC_VOLTAGE_SOURCE", x: 60, y: 150, label: "V_analog 3.3V", analogParams: { dcVoltageV: 3.3 } },
      { type: "ADC0804", x: 250, y: 130, label: "ADC0804" },
      { type: "DAC0808", x: 480, y: 130, label: "DAC0808" },
      { type: "VOLTMETER", x: 690, y: 150, label: "V_recon" },
    ],
    wires: [
      [0, 0, 1, 0],
      [1, 0, 2, 0],
      [1, 1, 2, 1],
      [1, 2, 2, 2],
      [2, 0, 3, 0],
    ],
  },
  C14: {
    // FPGA Combinational Circuit (3-to-8 Decoder + Output Bus)
    nodes: [
      { type: "INPUT", x: 50, y: 70, value: 1, label: "SW0 (A)" },
      { type: "INPUT", x: 50, y: 150, value: 0, label: "SW1 (B)" },
      { type: "INPUT", x: 50, y: 230, value: 1, label: "SW2 (C)" },
      { type: "74138", x: 260, y: 120, label: "FPGA 3:8 LUT" },
      { type: "OUTPUT", x: 520, y: 70, label: "Y5_LED" },
      { type: "OUTPUT", x: 520, y: 150, label: "Y0_LED" },
      { type: "OUTPUT", x: 520, y: 230, label: "Y7_LED" },
    ],
    wires: [
      [0, 0, 3, 0],
      [1, 0, 3, 1],
      [2, 0, 3, 2],
      [3, 5, 4, 0],
      [3, 0, 5, 0],
      [3, 7, 6, 0],
    ],
  },
  C15: {
    // FPGA Traffic Light Controller FSM (Counter + Decoder + Red/Green LEDs)
    nodes: [
      { type: "CLOCK", x: 50, y: 120, value: 0, label: "1Hz CLK" },
      { type: "74193", x: 220, y: 110, label: "State Timer" },
      { type: "74138", x: 420, y: 110, label: "Phase Decoder" },
      { type: "LED_RED", x: 640, y: 80, label: "NS_RED" },
      { type: "LED_GREEN", x: 640, y: 190, label: "EW_GREEN" },
      { type: "GND", x: 770, y: 140, label: "GND" },
    ],
    wires: [
      [0, 0, 1, 0],
      [1, 0, 2, 0],
      [1, 1, 2, 1],
      [2, 0, 3, 0],
      [2, 2, 4, 0],
      [3, 0, 5, 0],
      [4, 0, 5, 0],
    ],
  },

  // =========================================================================
  // DOMAIN D: POWER ELECTRONICS (D01 - D15)
  // =========================================================================
  D01: {
    // Static Characteristics of SCR, Power MOSFET, IGBT, TRIAC
    nodes: [
      { type: "DC_VOLTAGE_SOURCE", x: 60, y: 150, label: "V_bus 24V", analogParams: { dcVoltageV: 24 } },
      { type: "INPUT", x: 60, y: 270, value: 1, label: "Gate_Trig" },
      { type: "SCR", x: 260, y: 140, label: "TYN612 SCR" },
      { type: "IRF540N", x: 460, y: 140, label: "IRF540N MOSFET" },
      { type: "RES", x: 630, y: 140, label: "R_load 100Ω", analogParams: { resistanceOhms: 100 } },
      { type: "GND", x: 630, y: 290, label: "GND" },
    ],
    wires: [
      [0, 0, 2, 0],
      [1, 0, 2, 1],
      [2, 0, 3, 0],
      [1, 0, 3, 2],
      [3, 0, 4, 0],
      [4, 0, 5, 0],
      [0, 1, 5, 0],
    ],
  },
  D02: {
    // SCR RC & Pulse Triggering Firing Circuit
    nodes: [
      { type: "AC_SINE", x: 60, y: 150, label: "AC 24V 50Hz", analogParams: { acVoltageV: 24, frequencyHz: 50 } },
      { type: "POT", x: 220, y: 90, label: "R_phase 10kΩ", analogParams: { resistanceOhms: 10000 } },
      { type: "CAP_NP", x: 220, y: 230, label: "C_trig 100nF", analogParams: { capacitanceUf: 0.1 } },
      { type: "DIAC", x: 370, y: 160, label: "DB3 Trigger" },
      { type: "SCR", x: 520, y: 160, label: "SCR Load Gate" },
      { type: "RES", x: 680, y: 160, label: "R_load 50Ω", analogParams: { resistanceOhms: 50 } },
      { type: "GND", x: 520, y: 310, label: "GND" },
    ],
    wires: [
      [0, 0, 1, 0],
      [1, 0, 2, 0],
      [1, 0, 3, 0],
      [3, 0, 4, 1],
      [0, 0, 4, 0],
      [4, 0, 5, 0],
      [5, 0, 6, 0],
      [2, 0, 6, 0],
      [0, 1, 6, 0],
    ],
  },
  // D03 uses "Half-Wave Diode Rectifier with Load" or Full-Wave
  D04: {
    // Single-Phase Controlled SCR Bridge with RL Load
    nodes: [
      { type: "AC_SINE", x: 60, y: 160, label: "AC 220V 50Hz", analogParams: { acVoltageV: 220, frequencyHz: 50 } },
      { type: "INPUT", x: 60, y: 280, value: 1, label: "Alpha_Gate" },
      { type: "SCR", x: 260, y: 150, label: "SCR Bridge" },
      { type: "INDUCTOR", x: 450, y: 150, label: "L_load 100mH", analogParams: { inductanceMh: 100 } },
      { type: "RES", x: 610, y: 150, label: "R_load 25Ω", analogParams: { resistanceOhms: 25 } },
      { type: "VOLTMETER", x: 740, y: 150, label: "Vdc_out" },
      { type: "GND", x: 610, y: 300, label: "GND" },
    ],
    wires: [
      [0, 0, 2, 0],
      [1, 0, 2, 1],
      [2, 0, 3, 0],
      [3, 0, 4, 0],
      [3, 0, 5, 0],
      [4, 0, 6, 0],
      [5, 1, 6, 0],
      [0, 1, 6, 0],
    ],
  },
  D05: {
    // Three-Phase / Dual-Stage Bridge Rectifier Bank
    nodes: [
      { type: "AC_SINE", x: 60, y: 160, label: "3-Ph Vline", analogParams: { acVoltageV: 230, frequencyHz: 50 } },
      { type: "BRIDGE_RECT", x: 240, y: 150, label: "6-Pulse Bridge" },
      { type: "INDUCTOR", x: 420, y: 150, label: "L_choke 47mH", analogParams: { inductanceMh: 47 } },
      { type: "CAP_POL", x: 560, y: 230, label: "C_dc 470µF", analogParams: { capacitanceUf: 470 } },
      { type: "RES", x: 690, y: 230, label: "R_load 50Ω", analogParams: { resistanceOhms: 50 } },
      { type: "GND", x: 560, y: 330, label: "GND" },
    ],
    wires: [
      [0, 0, 1, 0],
      [0, 1, 1, 1],
      [1, 0, 2, 0],
      [2, 0, 3, 0],
      [2, 0, 4, 0],
      [3, 0, 5, 0],
      [4, 0, 5, 0],
      [1, 1, 5, 0],
    ],
  },
  D06: {
    // Effect of Freewheeling Diode on Inductive Load Rectifier
    nodes: [
      { type: "AC_SINE", x: 60, y: 160, label: "AC 110V", analogParams: { acVoltageV: 110, frequencyHz: 50 } },
      { type: "SCR", x: 230, y: 140, label: "SCR1" },
      { type: "DIODE_1N4007", x: 390, y: 240, label: "D_Freewheel" },
      { type: "INDUCTOR", x: 420, y: 120, label: "L_load 120mH", analogParams: { inductanceMh: 120 } },
      { type: "RES", x: 590, y: 120, label: "R_load 30Ω", analogParams: { resistanceOhms: 30 } },
      { type: "GND", x: 590, y: 300, label: "GND" },
    ],
    wires: [
      [0, 0, 1, 0],
      [1, 0, 3, 0],
      [1, 0, 2, 0],
      [3, 0, 4, 0],
      [4, 0, 5, 0],
      [2, 0, 5, 0],
      [0, 1, 5, 0],
    ],
  },
  D07: {
    // Single-Phase AC Voltage Controller (DIAC + TRIAC Dimmer)
    nodes: [
      { type: "AC_SINE", x: 60, y: 150, label: "AC 230V 50Hz", analogParams: { acVoltageV: 230, frequencyHz: 50 } },
      { type: "POT", x: 200, y: 240, label: "R_dim 50kΩ", analogParams: { resistanceOhms: 50000 } },
      { type: "CAP_NP", x: 320, y: 240, label: "C_trig 100nF", analogParams: { capacitanceUf: 0.1 } },
      { type: "DIAC", x: 420, y: 240, label: "DB3 32V" },
      { type: "TRIAC", x: 530, y: 140, label: "BT136 TRIAC" },
      { type: "RES", x: 700, y: 140, label: "Lamp Load 100Ω", analogParams: { resistanceOhms: 100 } },
      { type: "GND", x: 700, y: 300, label: "GND" },
    ],
    wires: [
      [0, 0, 4, 0],
      [0, 0, 1, 0],
      [1, 0, 2, 0],
      [2, 0, 3, 0],
      [3, 0, 4, 1],
      [4, 0, 5, 0],
      [5, 0, 6, 0],
      [0, 1, 6, 0],
    ],
  },
  D08: {
    // DC Chopper (Buck Converter Stage: IRF540N + Diode + L + C + Load)
    nodes: [
      { type: "DC_VOLTAGE_SOURCE", x: 60, y: 160, label: "V_in 24V", analogParams: { dcVoltageV: 24 } },
      { type: "CLOCK", x: 60, y: 270, label: "PWM 50kHz" },
      { type: "IRF540N", x: 230, y: 140, label: "Buck MOSFET" },
      { type: "DIODE_1N4007", x: 370, y: 240, label: "D_Catch" },
      { type: "INDUCTOR", x: 430, y: 130, label: "L 220µH", analogParams: { inductanceMh: 0.22 } },
      { type: "CAP_POL", x: 570, y: 230, label: "C_out 47µF", analogParams: { capacitanceUf: 47 } },
      { type: "RES", x: 700, y: 230, label: "R_load 10Ω", analogParams: { resistanceOhms: 10 } },
      { type: "GND", x: 570, y: 330, label: "GND" },
    ],
    wires: [
      [0, 0, 2, 0],
      [1, 0, 2, 2],
      [2, 0, 4, 0],
      [2, 0, 3, 0],
      [4, 0, 5, 0],
      [4, 0, 6, 0],
      [3, 0, 7, 0],
      [5, 0, 7, 0],
      [6, 0, 7, 0],
      [0, 1, 7, 0],
    ],
  },
  D09: {
    // Single-Phase Half/Full Bridge Inverter with LC Filter
    nodes: [
      { type: "DC_VOLTAGE_SOURCE", x: 60, y: 150, label: "Vdc 48V", analogParams: { dcVoltageV: 48 } },
      { type: "MOSFET_N", x: 230, y: 100, label: "Q1 High-Side" },
      { type: "MOSFET_N", x: 230, y: 220, label: "Q2 Low-Side" },
      { type: "INDUCTOR", x: 420, y: 150, label: "L_filt 20mH", analogParams: { inductanceMh: 20 } },
      { type: "CAP_NP", x: 550, y: 230, label: "C_filt 10µF", analogParams: { capacitanceUf: 10 } },
      { type: "RES", x: 690, y: 150, label: "R_AC_Load 50Ω", analogParams: { resistanceOhms: 50 } },
      { type: "GND", x: 550, y: 330, label: "GND" },
    ],
    wires: [
      [0, 0, 1, 0],
      [1, 0, 2, 0],
      [1, 0, 3, 0],
      [3, 0, 4, 0],
      [3, 0, 5, 0],
      [4, 0, 6, 0],
      [5, 0, 6, 0],
      [2, 1, 6, 0],
      [0, 1, 6, 0],
    ],
  },
  D10: {
    // 3-Phase SPWM Inverter Output Filter Stage
    nodes: [
      { type: "DC_VOLTAGE_SOURCE", x: 60, y: 150, label: "DC Link 400V", analogParams: { dcVoltageV: 400 } },
      { type: "CLOCK", x: 60, y: 270, label: "SPWM Carrier" },
      { type: "IRF540N", x: 260, y: 140, label: "IGBT Phase A" },
      { type: "INDUCTOR", x: 440, y: 140, label: "L_line 5mH", analogParams: { inductanceMh: 5 } },
      { type: "CAP_NP", x: 580, y: 230, label: "C_ac 22µF", analogParams: { capacitanceUf: 22 } },
      { type: "RES", x: 700, y: 140, label: "R_phase 20Ω", analogParams: { resistanceOhms: 20 } },
      { type: "GND", x: 580, y: 330, label: "GND" },
    ],
    wires: [
      [0, 0, 2, 0],
      [1, 0, 2, 2],
      [2, 0, 3, 0],
      [3, 0, 4, 0],
      [3, 0, 5, 0],
      [4, 0, 6, 0],
      [5, 0, 6, 0],
      [0, 1, 6, 0],
    ],
  },
  D11: {
    // Cycloconverter Step-Down AC Frequency Converter
    nodes: [
      { type: "AC_SINE", x: 60, y: 150, label: "AC 50Hz Input", analogParams: { acVoltageV: 120, frequencyHz: 50 } },
      { type: "TRANSFORMER", x: 210, y: 150, label: "CT TX" },
      { type: "TRIAC", x: 390, y: 110, label: "Pos Converter" },
      { type: "TRIAC", x: 390, y: 230, label: "Neg Converter" },
      { type: "RES", x: 600, y: 160, label: "R_load 40Ω", analogParams: { resistanceOhms: 40 } },
      { type: "GND", x: 600, y: 310, label: "GND" },
    ],
    wires: [
      [0, 0, 1, 0],
      [1, 0, 2, 0],
      [1, 0, 3, 0],
      [2, 0, 4, 0],
      [3, 0, 4, 0],
      [4, 0, 5, 0],
      [0, 1, 5, 0],
    ],
  },
  D12: {
    // ZVS / ZCS Resonant Switching Tank Converter
    nodes: [
      { type: "DC_VOLTAGE_SOURCE", x: 60, y: 150, label: "V_bus 24V", analogParams: { dcVoltageV: 24 } },
      { type: "MOSFET_N", x: 220, y: 150, label: "ZVS Switch" },
      { type: "INDUCTOR", x: 380, y: 120, label: "Lr 40µH", analogParams: { inductanceMh: 0.04 } },
      { type: "CAP_NP", x: 510, y: 220, label: "Cr 100nF", analogParams: { capacitanceUf: 0.1 } },
      { type: "DIODE_1N4007", x: 580, y: 120, label: "D_rect" },
      { type: "RES", x: 720, y: 120, label: "R_load 12Ω", analogParams: { resistanceOhms: 12 } },
      { type: "GND", x: 510, y: 320, label: "GND" },
    ],
    wires: [
      [0, 0, 1, 0],
      [1, 0, 2, 0],
      [2, 0, 3, 0],
      [2, 0, 4, 0],
      [4, 0, 5, 0],
      [3, 0, 6, 0],
      [5, 0, 6, 0],
      [0, 1, 6, 0],
    ],
  },
  D13: {
    // DC Motor Armature Chopper Speed Control
    nodes: [
      { type: "DC_VOLTAGE_SOURCE", x: 60, y: 150, label: "V_arm 48V", analogParams: { dcVoltageV: 48 } },
      { type: "IRF540N", x: 230, y: 140, label: "Chopper Q1" },
      { type: "DIODE_1N4007", x: 380, y: 240, label: "D_FW" },
      { type: "INDUCTOR", x: 450, y: 130, label: "La 15mH", analogParams: { inductanceMh: 15 } },
      { type: "RES", x: 610, y: 130, label: "Ra 2.5Ω", analogParams: { resistanceOhms: 2.5 } },
      { type: "VOLTMETER", x: 740, y: 130, label: "Va_avg" },
      { type: "GND", x: 610, y: 310, label: "GND" },
    ],
    wires: [
      [0, 0, 1, 0],
      [1, 0, 3, 0],
      [1, 0, 2, 0],
      [3, 0, 4, 0],
      [3, 0, 5, 0],
      [2, 0, 6, 0],
      [4, 0, 6, 0],
      [5, 1, 6, 0],
      [0, 1, 6, 0],
    ],
  },
  D14: {
    // Induction Motor V/f Inverter & AC Voltage Drive
    nodes: [
      { type: "AC_SINE", x: 60, y: 150, label: "V/f Stator Ref", analogParams: { acVoltageV: 220, frequencyHz: 50 } },
      { type: "BRIDGE_RECT", x: 220, y: 150, label: "Rectifier" },
      { type: "CAP_POL", x: 360, y: 230, label: "C_dc 1000µF", analogParams: { capacitanceUf: 1000 } },
      { type: "IRF540N", x: 490, y: 140, label: "Inverter Leg" },
      { type: "INDUCTOR", x: 640, y: 140, label: "L_stator 35mH", analogParams: { inductanceMh: 35 } },
      { type: "GND", x: 360, y: 330, label: "GND" },
    ],
    wires: [
      [0, 0, 1, 0],
      [0, 1, 1, 1],
      [1, 0, 2, 0],
      [1, 0, 3, 0],
      [3, 0, 4, 0],
      [2, 0, 5, 0],
      [4, 0, 5, 0],
      [1, 1, 5, 0],
    ],
  },
  D15: {
    // Power Harmonics & LC Input Filter THD Benchmark
    nodes: [
      { type: "AC_SINE", x: 60, y: 150, label: "AC 230V 50Hz", analogParams: { acVoltageV: 230, frequencyHz: 50 } },
      { type: "INDUCTOR", x: 210, y: 130, label: "L_ac 10mH", analogParams: { inductanceMh: 10 } },
      { type: "BRIDGE_RECT", x: 380, y: 140, label: "Diode Bridge" },
      { type: "CAP_POL", x: 540, y: 220, label: "C_dc 220µF", analogParams: { capacitanceUf: 220 } },
      { type: "RES", x: 680, y: 220, label: "R_load 100Ω", analogParams: { resistanceOhms: 100 } },
      { type: "GND", x: 540, y: 320, label: "GND" },
    ],
    wires: [
      [0, 0, 1, 0],
      [1, 0, 2, 0],
      [0, 1, 2, 1],
      [2, 0, 3, 0],
      [2, 0, 4, 0],
      [3, 0, 5, 0],
      [4, 0, 5, 0],
      [2, 1, 5, 0],
    ],
  },

  // =========================================================================
  // DOMAIN E: ELECTRONIC DEVICES & CIRCUITS (E01 - E15)
  // =========================================================================
  E01: {
    // PN Junction & Zener Diode V-I Characteristics
    nodes: [
      { type: "DC_VOLTAGE_SOURCE", x: 60, y: 160, label: "V_sweep 5V", analogParams: { dcVoltageV: 5 } },
      { type: "RES", x: 220, y: 120, label: "Rs 220Ω", analogParams: { resistanceOhms: 220 } },
      { type: "DIODE_1N4007", x: 390, y: 120, label: "1N4007 DUT" },
      { type: "AMMETER", x: 550, y: 120, label: "I_D" },
      { type: "VOLTMETER", x: 550, y: 240, label: "V_D" },
      { type: "GND", x: 390, y: 320, label: "GND" },
    ],
    wires: [
      [0, 0, 1, 0],
      [1, 0, 2, 0],
      [2, 0, 3, 0],
      [2, 0, 4, 0],
      [3, 0, 5, 0],
      [4, 1, 5, 0],
      [0, 1, 5, 0],
    ],
  },
  E02: {
    // Zener Diode Shunt Voltage Regulator
    nodes: [
      { type: "DC_VOLTAGE_SOURCE", x: 60, y: 160, label: "Vin 15V", analogParams: { dcVoltageV: 15 } },
      { type: "RES", x: 220, y: 110, label: "Rs 220Ω", analogParams: { resistanceOhms: 220 } },
      { type: "ZENER", x: 390, y: 200, label: "1N4733A 5.1V" },
      { type: "RES", x: 540, y: 200, label: "R_Load 470Ω", analogParams: { resistanceOhms: 470 } },
      { type: "VOLTMETER", x: 690, y: 160, label: "Vz = 5.1V" },
      { type: "GND", x: 390, y: 320, label: "GND" },
    ],
    wires: [
      [0, 0, 1, 0],
      [1, 0, 2, 0],
      [1, 0, 3, 0],
      [1, 0, 4, 0],
      [2, 0, 5, 0],
      [3, 0, 5, 0],
      [4, 1, 5, 0],
      [0, 1, 5, 0],
    ],
  },
  // E03 uses "Half-Wave Diode Rectifier with Load" or "Full-Wave Bridge Rectifier with Filter"
  E04: {
    // BJT Input/Output CE Curve Tracer
    nodes: [
      { type: "DC_VOLTAGE_SOURCE", x: 60, y: 120, label: "V_BB 5V", analogParams: { dcVoltageV: 5 } },
      { type: "RES", x: 200, y: 120, label: "Rb 47kΩ", analogParams: { resistanceOhms: 47000 } },
      { type: "BC547", x: 390, y: 150, label: "Q1 BC547B" },
      { type: "RES", x: 390, y: 45, label: "Rc 1kΩ", analogParams: { resistanceOhms: 1000 } },
      { type: "VCC_12V", x: 590, y: 45, label: "Vcc +12V" },
      { type: "AMMETER", x: 590, y: 150, label: "Ic" },
      { type: "GND", x: 390, y: 290, label: "GND" },
    ],
    wires: [
      [0, 0, 1, 0],
      [1, 0, 2, 0],
      [4, 0, 3, 0],
      [3, 0, 2, 1],
      [2, 0, 5, 0],
      [5, 0, 6, 0],
      [0, 1, 6, 0],
    ],
  },
  E05: {
    // BJT Voltage-Divider Biasing & Q-Point Stability
    nodes: [
      { type: "VCC_12V", x: 60, y: 100, label: "Vcc +12V" },
      { type: "RES", x: 200, y: 70, label: "R1 33kΩ", analogParams: { resistanceOhms: 33000 } },
      { type: "RES", x: 200, y: 210, label: "R2 10kΩ", analogParams: { resistanceOhms: 10000 } },
      { type: "BC547", x: 390, y: 150, label: "Q1 2N2222" },
      { type: "RES", x: 390, y: 40, label: "Rc 2.2kΩ", analogParams: { resistanceOhms: 2200 } },
      { type: "RES", x: 390, y: 270, label: "Re 1kΩ", analogParams: { resistanceOhms: 1000 } },
      { type: "VOLTMETER", x: 600, y: 150, label: "V_CEQ" },
      { type: "GND", x: 200, y: 330, label: "GND" },
    ],
    wires: [
      [0, 0, 1, 0],
      [0, 0, 4, 0],
      [1, 0, 2, 0],
      [1, 0, 3, 0],
      [4, 0, 3, 1],
      [3, 0, 5, 0],
      [3, 1, 6, 0],
      [2, 0, 7, 0],
      [5, 0, 7, 0],
      [6, 1, 7, 0],
    ],
  },
  E06: {
    // JFET & MOSFET Drain / Transfer Characteristics
    nodes: [
      { type: "DC_VOLTAGE_SOURCE", x: 60, y: 160, label: "V_GS 3.5V", analogParams: { dcVoltageV: 3.5 } },
      { type: "VCC_12V", x: 60, y: 260, label: "V_DD +12V" },
      { type: "RES", x: 220, y: 160, label: "Rg 100kΩ", analogParams: { resistanceOhms: 100000 } },
      { type: "MOSFET_N", x: 400, y: 150, label: "M1 N-MOSFET" },
      { type: "RES", x: 400, y: 45, label: "Rd 2kΩ", analogParams: { resistanceOhms: 2000 } },
      { type: "VOLTMETER", x: 600, y: 150, label: "V_DS" },
      { type: "GND", x: 400, y: 300, label: "GND" },
    ],
    wires: [
      [0, 0, 2, 0],
      [2, 0, 3, 2],
      [1, 0, 4, 0],
      [4, 0, 3, 0],
      [3, 0, 5, 0],
      [3, 1, 6, 0],
      [0, 1, 6, 0],
      [5, 1, 6, 0],
    ],
  },
  E07: {
    // FET Biasing & MOSFET Low-Side Switch with LED Load
    nodes: [
      { type: "DC_VOLTAGE_SOURCE", x: 60, y: 140, label: "V_gate 5V", analogParams: { dcVoltageV: 5 } },
      { type: "VCC_12V", x: 60, y: 240, label: "V_DD +12V" },
      { type: "MOSFET_N", x: 280, y: 150, label: "Q1 Switch" },
      { type: "RES", x: 480, y: 80, label: "R_drain 330Ω", analogParams: { resistanceOhms: 330 } },
      { type: "LED_GREEN", x: 480, y: 200, label: "Load LED" },
      { type: "GND", x: 280, y: 310, label: "GND" },
    ],
    wires: [
      [0, 0, 2, 2],
      [1, 0, 3, 0],
      [3, 0, 4, 0],
      [4, 0, 2, 0],
      [2, 1, 5, 0],
      [0, 1, 5, 0],
    ],
  },
  E08: {
    // Single-Stage RC-Coupled BJT Amplifier
    nodes: [
      { type: "AC_SINE", x: 50, y: 150, label: "Vin 15mV 1kHz", analogParams: { acVoltageV: 0.015, frequencyHz: 1000 } },
      { type: "CAP_POL", x: 180, y: 150, label: "Cin 10µF", analogParams: { capacitanceUf: 10 } },
      { type: "RES", x: 310, y: 70, label: "R1 33kΩ", analogParams: { resistanceOhms: 33000 } },
      { type: "BC547", x: 390, y: 160, label: "Q1 BC547" },
      { type: "RES", x: 390, y: 50, label: "Rc 2.2kΩ", analogParams: { resistanceOhms: 2200 } },
      { type: "CAP_POL", x: 550, y: 160, label: "Cout 10µF", analogParams: { capacitanceUf: 10 } },
      { type: "RES", x: 690, y: 220, label: "R_load 10kΩ", analogParams: { resistanceOhms: 10000 } },
      { type: "GND", x: 390, y: 310, label: "GND" },
    ],
    wires: [
      [0, 0, 1, 0],
      [1, 0, 3, 0],
      [2, 0, 3, 0],
      [4, 0, 3, 1],
      [3, 0, 7, 0],
      [3, 1, 5, 0],
      [5, 0, 6, 0],
      [6, 0, 7, 0],
      [0, 1, 7, 0],
    ],
  },
  E09: {
    // Two-Stage RC-Coupled Cascaded Amplifier
    nodes: [
      { type: "AC_SINE", x: 50, y: 150, label: "Vin 5mV", analogParams: { acVoltageV: 0.005, frequencyHz: 1000 } },
      { type: "BC547", x: 200, y: 150, label: "Q1 Stage 1" },
      { type: "CAP_POL", x: 350, y: 150, label: "Cc 10µF", analogParams: { capacitanceUf: 10 } },
      { type: "BC547", x: 500, y: 150, label: "Q2 Stage 2" },
      { type: "RES", x: 500, y: 45, label: "Rc2 2.2kΩ", analogParams: { resistanceOhms: 2200 } },
      { type: "VOLTMETER", x: 690, y: 150, label: "Vout (High Gain)" },
      { type: "GND", x: 350, y: 300, label: "GND" },
    ],
    wires: [
      [0, 0, 1, 0],
      [1, 1, 2, 0],
      [2, 0, 3, 0],
      [4, 0, 3, 1],
      [3, 1, 5, 0],
      [1, 0, 6, 0],
      [3, 0, 6, 0],
      [0, 1, 6, 0],
      [5, 1, 6, 0],
    ],
  },
  E10: {
    // Darlington Pair Emitter Follower High-Current Buffer
    nodes: [
      { type: "DC_VOLTAGE_SOURCE", x: 60, y: 140, label: "Vin 5V", analogParams: { dcVoltageV: 5 } },
      { type: "RES", x: 190, y: 140, label: "Rb 10kΩ", analogParams: { resistanceOhms: 10000 } },
      { type: "BC547", x: 340, y: 140, label: "Q1 Driver" },
      { type: "2N2222", x: 510, y: 140, label: "Q2 Power" },
      { type: "RES", x: 510, y: 260, label: "Re_load 100Ω", analogParams: { resistanceOhms: 100 } },
      { type: "VCC_12V", x: 340, y: 40, label: "+12V" },
      { type: "GND", x: 510, y: 340, label: "GND" },
    ],
    wires: [
      [0, 0, 1, 0],
      [1, 0, 2, 0],
      [5, 0, 2, 1],
      [5, 0, 3, 1],
      [2, 0, 3, 0],
      [3, 0, 4, 0],
      [4, 0, 6, 0],
      [0, 1, 6, 0],
    ],
  },
  E11: {
    // Class-AB Complementary Symmetry Push-Pull Power Amplifier
    nodes: [
      { type: "AC_SINE", x: 50, y: 150, label: "Audio In", analogParams: { acVoltageV: 4, frequencyHz: 1000 } },
      { type: "VCC_12V", x: 60, y: 50, label: "+12V" },
      { type: "BC547", x: 260, y: 90, label: "Q1 NPN Top" },
      { type: "BC557", x: 260, y: 220, label: "Q2 PNP Bot" },
      { type: "CAP_POL", x: 450, y: 150, label: "Cout 470µF", analogParams: { capacitanceUf: 470 } },
      { type: "RES", x: 620, y: 150, label: "R_spkr 8Ω", analogParams: { resistanceOhms: 8 } },
      { type: "GND", x: 620, y: 300, label: "GND" },
    ],
    wires: [
      [0, 0, 2, 0],
      [0, 0, 3, 0],
      [1, 0, 2, 1],
      [2, 0, 4, 0],
      [3, 0, 4, 0],
      [4, 0, 5, 0],
      [5, 0, 6, 0],
      [0, 1, 6, 0],
    ],
  },
  E12: {
    // UJT / 555 Relaxation Pulse Oscillator
    nodes: [
      { type: "VCC_12V", x: 60, y: 120, label: "+12V" },
      { type: "RES", x: 200, y: 90, label: "Rt 47kΩ", analogParams: { resistanceOhms: 47000 } },
      { type: "CAP_POL", x: 200, y: 220, label: "Ct 10µF", analogParams: { capacitanceUf: 10 } },
      { type: "TIMER_555", x: 380, y: 140, label: "Relaxation Osc" },
      { type: "RES", x: 570, y: 140, label: "Rb1 47Ω", analogParams: { resistanceOhms: 47 } },
      { type: "VOLTMETER", x: 710, y: 140, label: "V_sawtooth" },
      { type: "GND", x: 200, y: 320, label: "GND" },
    ],
    wires: [
      [0, 0, 1, 0],
      [1, 0, 2, 0],
      [1, 0, 3, 0],
      [1, 0, 3, 1],
      [3, 0, 4, 0],
      [4, 0, 5, 0],
      [2, 0, 6, 0],
      [5, 1, 6, 0],
    ],
  },
  E13: {
    // SCR Half-Wave Controlled Dimmer Lab
    nodes: [
      { type: "AC_SINE", x: 60, y: 150, label: "AC 24V 50Hz", analogParams: { acVoltageV: 24, frequencyHz: 50 } },
      { type: "RES", x: 200, y: 240, label: "R_gate 1kΩ", analogParams: { resistanceOhms: 1000 } },
      { type: "DIODE_1N4007", x: 330, y: 240, label: "D_gate" },
      { type: "SCR", x: 420, y: 140, label: "SCR BT151" },
      { type: "RES", x: 600, y: 140, label: "R_load 100Ω", analogParams: { resistanceOhms: 100 } },
      { type: "GND", x: 600, y: 300, label: "GND" },
    ],
    wires: [
      [0, 0, 3, 0],
      [0, 0, 1, 0],
      [1, 0, 2, 0],
      [2, 0, 3, 1],
      [3, 0, 4, 0],
      [4, 0, 5, 0],
      [0, 1, 5, 0],
    ],
  },
  E14: {
    // LTSpice BJT & MOSFET Differential Pair Simulation
    nodes: [
      { type: "AC_SINE", x: 60, y: 90, label: "Vin1 10mV", analogParams: { acVoltageV: 0.01, frequencyHz: 1000 } },
      { type: "DC_VOLTAGE_SOURCE", x: 60, y: 210, label: "Vin2 0V Ref", analogParams: { dcVoltageV: 0 } },
      { type: "BC547", x: 280, y: 90, label: "Q1 Left" },
      { type: "BC547", x: 280, y: 220, label: "Q2 Right" },
      { type: "RES", x: 480, y: 90, label: "Rc1 4.7kΩ", analogParams: { resistanceOhms: 4700 } },
      { type: "RES", x: 480, y: 220, label: "R_tail 10kΩ", analogParams: { resistanceOhms: 10000 } },
      { type: "VOLTMETER", x: 680, y: 90, label: "V_diff_out" },
      { type: "GND", x: 480, y: 320, label: "GND" },
    ],
    wires: [
      [0, 0, 2, 0],
      [1, 0, 3, 0],
      [4, 0, 2, 1],
      [2, 0, 5, 0],
      [3, 0, 5, 0],
      [5, 0, 7, 0],
      [2, 1, 6, 0],
      [6, 1, 7, 0],
    ],
  },
  E15: {
    // Regulated +5V Dual-Stage PCB Linear Power Supply (Transformer -> Bridge -> Cap -> 7805)
    nodes: [
      { type: "AC_SINE", x: 50, y: 150, label: "AC 12Vrms", analogParams: { acVoltageV: 12, frequencyHz: 50 } },
      { type: "BRIDGE_RECT", x: 200, y: 150, label: "W04M Bridge" },
      { type: "CAP_POL", x: 340, y: 220, label: "C_in 1000µF", analogParams: { capacitanceUf: 1000 } },
      { type: "LM7805", x: 470, y: 150, label: "LM7805 +5V" },
      { type: "CAP_NP", x: 600, y: 220, label: "C_out 100nF", analogParams: { capacitanceUf: 0.1 } },
      { type: "LED_GREEN", x: 710, y: 150, label: "+5V OK" },
      { type: "GND", x: 470, y: 310, label: "GND" },
    ],
    wires: [
      [0, 0, 1, 0],
      [0, 1, 1, 1],
      [1, 0, 2, 0],
      [1, 0, 3, 0],
      [3, 0, 4, 0],
      [3, 0, 5, 0],
      [2, 0, 6, 0],
      [4, 0, 6, 0],
      [5, 0, 6, 0],
      [1, 1, 6, 0],
    ],
  },
};

function clonePresetData(
  nodes: PresetNodeDef[],
  wires: PresetWireDef[]
): { nodes: PresetNodeDef[]; wires: PresetWireDef[] } {
  return {
    nodes: nodes.map((n) => ({
      ...n,
      analogParams: n.analogParams ? { ...n.analogParams } : undefined,
    })),
    wires: wires.map((w) => [...w] as PresetWireDef),
  };
}

/**
 * Returns a verified, deep-cloned circuit schematic configuration for any given Lab ID (A01 - E15).
 * Every call returns fresh isolated node/wire arrays so edits never mutate shared presets.
 */
export function getCircuitPresetForLab(labId: string): LabCircuitPreset {
  const lab = MASTER_75_LABS.find((l) => l.id === labId);
  const labTitle = lab ? `${lab.id}: ${lab.title}` : `Lab ${labId} Circuit`;
  const desc = lab
    ? lab.objective
    : "Circuit schematic configuration for verified bench analysis.";

  // Rich named presets for matching Digital & Rectifier labs
  if (labId === "C02") {
    const p = CIRCUIT_PRESETS["Full Adder"];
    return { title: labTitle, labId, description: desc, ...clonePresetData(p.nodes, p.wires) };
  }
  if (labId === "C05") {
    const p = CIRCUIT_PRESETS["4:1 Multiplexer (MUX4)"];
    return { title: labTitle, labId, description: desc, ...clonePresetData(p.nodes, p.wires) };
  }
  if (labId === "C07") {
    const p = CIRCUIT_PRESETS["JK Flip-Flop"];
    return { title: labTitle, labId, description: desc, ...clonePresetData(p.nodes, p.wires) };
  }
  if (labId === "C08") {
    const p = CIRCUIT_PRESETS["4-Bit Counter (74193)"];
    return { title: labTitle, labId, description: desc, ...clonePresetData(p.nodes, p.wires) };
  }
  if (labId === "E03") {
    const p = CIRCUIT_PRESETS["Full-Wave Bridge Rectifier with Filter"];
    return { title: labTitle, labId, description: desc, ...clonePresetData(p.nodes, p.wires) };
  }
  if (labId === "D03") {
    const p = CIRCUIT_PRESETS["Half-Wave Diode Rectifier with Load"];
    return { title: labTitle, labId, description: desc, ...clonePresetData(p.nodes, p.wires) };
  }

  const explicit = EXPLICIT_LAB_SCHEMATICS[labId];
  if (explicit) {
    return {
      title: labTitle,
      labId,
      description: desc,
      ...clonePresetData(explicit.nodes, explicit.wires),
    };
  }

  // Fallback uses half adder / Zener regulator depending on domain (always fresh clone)
  const fallback =
    labId.startsWith("C")
      ? CIRCUIT_PRESETS["Half Adder"]
      : CIRCUIT_PRESETS["1N4007A Rectifier + Polar Cap + Zener 5.1V Regulator"];
  return {
    title: labTitle,
    labId,
    description: desc,
    ...clonePresetData(fallback.nodes, fallback.wires),
  };
}

/**
 * Maps any Master Lab ID (A01–E15) to the most relevant project ID in InteractiveCircuitSystem.
 */
export function getInteractiveProjectIdForLab(labId: string): string {
  const id = labId.toUpperCase();
  if (id === "A01") return "series_resistor_circuit";
  if (id === "A02" || id === "A11" || id === "A12") return "parallel_resistor_circuit";
  if (id === "A03" || id === "A04" || id === "A09") return "voltage_divider_circuit";
  if (id === "A10") return "simple_resistor_circuit";
  if (id === "A05") return "rc_charging_circuit";
  if (id === "A06" || id === "A07" || id === "A08" || id === "A13" || id === "A14" || id === "A15") {
    return "rc_passive_filter";
  }
  if (id === "B01" || id === "B03" || id === "B04") return "opamp_inverting_amplifier";
  if (id === "B12" || id === "B09") return "ne555_astable_timer";
  if (id.startsWith("B")) return "opamp_noninverting";
  if (id === "C01" || id === "C02" || id === "C03" || id === "C04") return "logic_gate_circuit";
  if (id === "C12" || id === "C13" || id === "C14" || id === "C15") return "esp32_sonar_radar";
  if (id.startsWith("C")) return "counter_74193";
  if (id === "D01" || id === "D03") return "half_wave_rectifier";
  if (id === "D02") return "full_wave_bridge_rectifier";
  if (id === "D05") return "power_supply_7805";
  if (id.startsWith("D")) return "buck_converter_dc";
  if (id === "E01" || id === "E04") return "led_limiting_circuit";
  if (id === "E02") return "zener_voltage_regulator";
  if (id === "E03") return "full_wave_bridge_rectifier";
  if (id === "E15") return "power_supply_7805";
  if (id.startsWith("E")) return "bjt_ce_amplifier";
  return "simple_resistor_circuit";
}

/**
 * Maps any Master Lab ID (A01–E15) to the best matching SeriesParallelBuilder preset name.
 */
export function getBuilderPresetNameForLab(labId: string): string {
  const id = labId.toUpperCase();
  if (id === "A01") return "Series Circuit (3-Resistor Voltage Divider)";
  if (id === "A02" || id === "A11") return "Dual-Source Multi-Loop KVL/KCL Network";
  if (id === "A03" || id === "A04" || id === "A09") return "Voltage Divider (2-Resistor Reference)";
  if (id === "A08") return "Parallel Circuit (3-Branch Current Divider)";
  if (id === "A10") return "Wheatstone Bridge (Balanced & Unbalanced)";
  if (id === "A12" || id === "A14") return "Simple Resistor Circuit (Single Loop)";
  if (id === "A05") return "RC Transient Charging Network";
  if (id === "A06" || id === "A07" || id === "A13" || id === "A15") {
    return "Series-Parallel RLC Filter & Impedance Network";
  }
  if (id === "D01" || id === "D03") return "Half-Wave Diode Rectifier";
  if (id === "D02" || id === "E03") return "Full-Wave Bridge Rectifier";
  if (id.startsWith("D")) return "Power MOSFET Buck Switching Stage & Inductor Filter";
  if (id === "E01") return "LED Current-Limiting Switch Circuit";
  if (id === "E02") return "Zener Diode Shunt Voltage Regulator & LED Load";
  if (id === "E04" || id === "E08" || id === "E09") {
    return "BJT Common-Emitter Voltage-Divider Linear Amplifier";
  }
  if (id.startsWith("E")) return "EDC Transistor Base-Biased LED Driver Stage";
  if (id === "B01" || id === "B03") return "Op-Amp Inverting Gain Stage (-10 V/V)";
  if (id === "B02" || id === "B04") return "Series-Parallel Combination Ladder";
  return "Simple Resistor Circuit (Single Loop)";
}

/**
 * Returns a CircuitLab schematic preset for any of the 10 Benchmark Circuits.
 */
export function getCircuitPresetForBenchmark(circuitId: string): LabCircuitPreset {
  switch (circuitId) {
    case "bench-divider":
      return getCircuitPresetForLab("A01");
    case "bench-rc-charging":
      return getCircuitPresetForLab("A05");
    case "bench-half-wave":
      return getCircuitPresetForLab("D03");
    case "bench-full-wave-bridge":
      return getCircuitPresetForLab("E03");
    case "bench-zener-regulator":
      return getCircuitPresetForLab("E02");
    case "bench-555-astable":
      return getCircuitPresetForLab("B12");
    case "bench-bjt-switch":
      return getCircuitPresetForLab("E05");
    case "bench-mosfet-switch":
      return getCircuitPresetForLab("D08");
    case "bench-opamp-inverting":
      return getCircuitPresetForLab("B01");
    case "bench-diac-triac":
      return getCircuitPresetForLab("D07");
    default:
      return getCircuitPresetForLab("A01");
  }
}
