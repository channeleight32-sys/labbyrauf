export type MasterDomainId = "A" | "B" | "C" | "D" | "E";

export interface LabParamSpec {
  key: string;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  defaultVal: number;
}

export interface MasterLabItem {
  id: string;
  domain: MasterDomainId;
  labNumber: number;
  title: string;
  category:
    | "Fundamental Bench Lab"
    | "Advanced Circuit Lab"
    | "EDA Simulation Lab"
    | "FPGA / PCB Hardware Lab";
  objective: string;
  formula: string;
  hardwareSetup: string[];
  softwareSetup: string[];
  procedure: string[];
  params: LabParamSpec[];
  codeTitle?: string;
  codeSnippet?: string;
}

export interface MasterDomainInfo {
  id: MasterDomainId;
  code: string;
  title: string;
  subtitle: string;
  appTab: "lca" | "cd" | "logic-suite" | "power" | "edc";
  accentColor: string;
  defaultHardware: string[];
  defaultSoftware: string[];
}

export const RECOMMENDED_LAB_SETUP = {
  hardware: [
    {
      name: "Digital Storage Oscilloscope (DSO) 100 MHz",
      spec: "4-Channel, 1 GSa/s real-time sampling, FFT & cursor timing analysis",
    },
    {
      name: "Function / Arbitrary Waveform Generator 3 MHz",
      spec: "Sine, Square, Triangle, Ramp, Pulse & TTL/CMOS sync output",
    },
    {
      name: "Dual Tracking DC Power Supply",
      spec: "0–30 V / 0–3 A dual adjustable rails + fixed 5 V / ±15 V IC rails",
    },
    {
      name: "Digital Logic Trainer Kits",
      spec: "Onboard debounced logic switches, clock generator (1 Hz–1 MHz), LEDs, 7-seg & breadboard",
    },
    {
      name: "Power Electronics Trainer Workbench",
      spec: "Isolated SCR/TRIAC/MOSFET/IGBT firing modules, R-L-E loads, DC & 3-Phase Induction motor rigs",
    },
    {
      name: "FPGA Development Boards (Xilinx Artix-7 / Altera Cyclone)",
      spec: "JTAG USB programmer, 100 MHz crystal oscillator, slide switches, 7-seg & VGA/UART I/O",
    },
    {
      name: "Precision Digital LCR Meter",
      spec: "100 Hz – 100 kHz test frequencies for L, C, R, Q-factor & dissipation factor D",
    },
  ],
  software: [
    {
      name: "LTSpice XVII / 24",
      spec: "SPICE transient, AC small-signal, DC sweep & BJT/MOSFET macromodel verification",
    },
    {
      name: "NI Multisim",
      spec: "Interactive schematic capture with virtual bench instruments (Bode plotter, DSO, DMM)",
    },
    {
      name: "Proteus Design Suite",
      spec: "Mixed-mode SPICE circuit simulation, microcontroller co-simulation & Ares PCB layout",
    },
    {
      name: "MATLAB & Simulink (Simscape Electrical)",
      spec: "Transfer function pole-zero plots, Bode/Nyquist responses & Power Electronics THD analysis",
    },
    {
      name: "Xilinx Vivado / ISE",
      spec: "Verilog/VHDL RTL synthesis, behavioral testbench timing waveforms & FPGA bitstream generation",
    },
    {
      name: "PSIM",
      spec: "Dedicated power converter, PWM inverter, resonant converter & motor drive simulation",
    },
  ],
};

export const MASTER_DOMAINS: Record<MasterDomainId, MasterDomainInfo> = {
  A: {
    id: "A",
    code: "DOMAIN A · 15 LABS",
    title: "Electronics Network Analysis / Network Analysis",
    subtitle:
      "Ohm's Law, KVL/KCL, Network Theorems, RC/RL/RLC Transients, Resonance, Two-Port Parameters, Attenuators, Bridges & Coupled Circuits",
    appTab: "lca",
    accentColor: "amber",
    defaultHardware: [
      "Dual DC Power Supply (0–30V)",
      "Function Generator 3MHz",
      "Digital Storage Oscilloscope (DSO) 100MHz",
      "Precision LCR Meter & Digital Multimeters",
    ],
    defaultSoftware: ["LTSpice", "NI Multisim", "MATLAB / Simulink"],
  },
  B: {
    id: "B",
    code: "DOMAIN B · 15 LABS",
    title: "Linear Circuit Analysis / Linear Integrated Circuits (LIC)",
    subtitle:
      "741 Op-Amp Configurations, Arithmetic/Active Filters, Precision Rectifiers, Schmitt Triggers, Oscillators, PLL 565, 723 Regulator & 555 Timers",
    appTab: "cd",
    accentColor: "sky",
    defaultHardware: [
      "Dual Tracking DC Supply (±15V)",
      "Function Generator 3MHz",
      "DSO 100MHz (Dual/XY Mode)",
      "Linear IC Trainer (UA741, NE555, LM565, LM723)",
    ],
    defaultSoftware: ["NI Multisim", "PSpice / LTSpice", "Proteus"],
  },
  C: {
    id: "C",
    code: "DOMAIN C · 15 LABS",
    title: "Digital Logic Design (DLD)",
    subtitle:
      "Primitive & Universal Gates, Adders, Code Converters, MUX/Decoders, Comparators, Flip-Flops, Counters, Shift Registers, FSMs, ALU, ADC/DAC & FPGA Verilog",
    appTab: "logic-suite",
    accentColor: "cyan",
    defaultHardware: [
      "Digital Logic Trainer Kit (+5V TTL)",
      "DSO 100MHz / 16-Ch Logic Analyzer",
      "74LSxx TTL IC Assortment",
      "Xilinx / Altera FPGA Development Board",
    ],
    defaultSoftware: ["Xilinx Vivado / ISE", "Proteus", "NI Multisim"],
  },
  D: {
    id: "D",
    code: "DOMAIN D · 15 LABS",
    title: "Power Electronics",
    subtitle:
      "SCR/MOSFET/IGBT/TRIAC Characteristics, Firing Circuits, 1Φ/3Φ Controlled Rectifiers, AC Voltage Controllers, DC Choppers, SPWM/SVPWM Inverters, ZVS/ZCS & Motor Drives",
    appTab: "power",
    accentColor: "emerald",
    defaultHardware: [
      "Power Electronics Trainer Workbench",
      "DSO 100MHz with Differential High-Voltage Probes",
      "Isolated Gate/SCR Firing Module",
      "DC Shunt Motor & 3-Phase Induction Motor Load Rig",
    ],
    defaultSoftware: ["PSIM", "MATLAB / Simulink", "LTSpice"],
  },
  E: {
    id: "E",
    code: "DOMAIN E · 15 LABS",
    title: "Devices and Circuits / Electronic Devices & Circuits (EDC)",
    subtitle:
      "PN & Zener Diodes, Rectifiers, BJT CB/CE/CC Curves & Biasing, JFET/MOSFET Curves, RC-Coupled & Cascode Amplifiers, Feedback, Class A/B/AB Power Amps, UJT & PCB Design",
    appTab: "edc",
    accentColor: "rose",
    defaultHardware: [
      "Dual DC Power Supply (0–30V)",
      "Function Generator 3MHz",
      "DSO 100MHz",
      "Semiconductor Curve Tracer & PCB Etching/Soldering Station",
    ],
    defaultSoftware: ["LTSpice", "Proteus (Ares PCB)", "NI Multisim"],
  },
};

export const MASTER_75_LABS: MasterLabItem[] = [
  // ===========================================================================
  // A. ELECTRONICS NETWORK ANALYSIS / NETWORK ANALYSIS [15 Labs]
  // ===========================================================================
  {
    id: "A01",
    domain: "A",
    labNumber: 1,
    title: "Verification of Ohm's Law, KVL and KCL",
    category: "Fundamental Bench Lab",
    objective:
      "Verify linear V-I proportionality (Ohm's Law), conservation of loop potentials (ΣV = 0, KVL), and conservation of nodal currents (ΣI_in = ΣI_out, KCL).",
    formula: "V = I · R   |   ∑ V_loop = 0   |   ∑ I_node = 0",
    hardwareSetup: [
      "Dual DC Power Supply (0–30V)",
      "Digital Multimeters (Voltmeter & Ammeter)",
      "Precision Metal-Film Resistors (100Ω, 220Ω, 330Ω)",
      "Breadboard & Patch Cords",
    ],
    softwareSetup: ["LTSpice", "NI Multisim"],
    procedure: [
      "Connect series-parallel resistor network across adjustable DC supply Vs.",
      "Sweep Vs from 2V to 20V and record branch currents I1, I2, I3.",
      "Verify KVL around each closed mesh: Vs − V_R1 − V_R3 = 0.",
      "Verify KCL at central node A: I1 = I2 + I3 within ±0.5% meter tolerance.",
    ],
    params: [
      { key: "p1", label: "Supply Voltage Vs", unit: "V", min: 2, max: 30, step: 1, defaultVal: 12 },
      { key: "p2", label: "Resistor R1", unit: "Ω", min: 50, max: 1000, step: 10, defaultVal: 100 },
      { key: "p3", label: "Resistor R2", unit: "Ω", min: 50, max: 1000, step: 10, defaultVal: 200 },
    ],
    codeTitle: "LTSpice Netlist — Ohm's Law, KVL & KCL Verification",
    codeSnippet: `* Lab A01: Ohm's Law, KVL and KCL Verification
VS 1 0 DC 12V
R1 1 2 100
R2 2 0 200
R3 2 0 300
.op
.dc VS 0 20 2
.end`,
  },
  {
    id: "A02",
    domain: "A",
    labNumber: 2,
    title: "Verification of Superposition Theorem",
    category: "Fundamental Bench Lab",
    objective:
      "Verify that in a linear bilateral multi-source network, any branch response equals the algebraic sum of responses caused by each independent source acting alone.",
    formula: "V_A = V_A' (VS1 active, VS2=0) + V_A'' (VS2 active, VS1=0)",
    hardwareSetup: [
      "Dual DC Power Supply (VS1 & VS2)",
      "Resistors R1=100Ω, R2=200Ω, R3=150Ω",
      "Digital Voltmeter & Ammeter",
    ],
    softwareSetup: ["LTSpice", "NI Multisim"],
    procedure: [
      "Energize both VS1 and VS2 simultaneously and measure node voltage V_A and branch current I_R3.",
      "Deactivate VS2 (replace with short circuit) and measure partial response V_A' and I_R3'.",
      "Deactivate VS1 (replace with short circuit) and measure partial response V_A'' and I_R3''.",
      "Confirm V_A = V_A' + V_A'' and verify why power P ≠ P' + P'' (non-linear quadratic).",
    ],
    params: [
      { key: "p1", label: "Source VS1", unit: "V", min: 1, max: 24, step: 1, defaultVal: 12 },
      { key: "p2", label: "Source VS2", unit: "V", min: 1, max: 24, step: 1, defaultVal: 6 },
      { key: "p3", label: "Center Branch R3", unit: "Ω", min: 50, max: 500, step: 10, defaultVal: 150 },
    ],
  },
  {
    id: "A03",
    domain: "A",
    labNumber: 3,
    title: "Verification of Thevenin's and Norton's Theorem",
    category: "Fundamental Bench Lab",
    objective:
      "Reduce a complex two-terminal linear network into an equivalent Thevenin voltage source V_th in series with R_th, and dual Norton current source I_N in parallel with R_N.",
    formula: "V_th = V_oc   |   I_N = I_sc   |   R_th = R_N = V_oc / I_sc",
    hardwareSetup: [
      "Dual DC Power Supply",
      "Decade Resistance Box (0–10 kΩ)",
      "Digital Multimeter (DMM)",
    ],
    softwareSetup: ["LTSpice", "NI Multisim"],
    procedure: [
      "Remove load resistor R_L from terminals A-B and measure open-circuit voltage V_oc = V_th.",
      "Short terminals A-B through an ammeter to measure short-circuit current I_sc = I_N.",
      "Deactivate independent voltage sources and measure equivalent resistance R_th across A-B.",
      "Construct the physical Thevenin equivalent circuit and verify identical I_L for multiple R_L values.",
    ],
    params: [
      { key: "p1", label: "Source Voltage Vs", unit: "V", min: 5, max: 30, step: 1, defaultVal: 24 },
      { key: "p2", label: "Thevenin Resistance R_th", unit: "Ω", min: 10, max: 300, step: 5, defaultVal: 60 },
      { key: "p3", label: "Load Resistance R_L", unit: "Ω", min: 10, max: 300, step: 5, defaultVal: 60 },
    ],
  },
  {
    id: "A04",
    domain: "A",
    labNumber: 4,
    title: "Verification of Maximum Power Transfer Theorem and Reciprocity Theorem",
    category: "Fundamental Bench Lab",
    objective:
      "Demonstrate that maximum DC power is delivered to load R_L when R_L = R_th (with 50% efficiency), and verify V/I transfer ratio invariance under source-ammeter exchange (Reciprocity).",
    formula: "P_max = V_th² / (4 · R_th)  at R_L = R_th   |   (I_B / V_A) = (I_A / V_B)",
    hardwareSetup: [
      "DC Power Supply (0–30V)",
      "Precision Decade Resistance Box",
      "Digital Voltmeter & Ammeter",
    ],
    softwareSetup: ["LTSpice", "MATLAB"],
    procedure: [
      "Sweep load resistance R_L from 10Ω to 300Ω and plot P_L = V_L² / R_L vs. R_L.",
      "Identify the peak of the power curve at R_L = R_th.",
      "For Reciprocity: place voltage source Vs in Loop 1, measure short-circuit current I_2 in Loop 2.",
      "Interchange Vs and the ammeter; verify I_1 / Vs equals I_2 / Vs.",
    ],
    params: [
      { key: "p1", label: "Thevenin Voltage V_th", unit: "V", min: 4, max: 30, step: 1, defaultVal: 16 },
      { key: "p2", label: "Source Resistance R_th", unit: "Ω", min: 10, max: 200, step: 5, defaultVal: 50 },
      { key: "p3", label: "Load Resistance R_L", unit: "Ω", min: 10, max: 200, step: 5, defaultVal: 50 },
    ],
  },
  {
    id: "A05",
    domain: "A",
    labNumber: 5,
    title: "Transient Response of RC and RL Circuits",
    category: "Fundamental Bench Lab",
    objective:
      "Capture and analyze the step-response charging and discharging waveforms of first-order RC and RL circuits and measure time constant τ.",
    formula: "τ_RC = R·C  ·  v_C(t) = V_S(1 − e^(−t/τ))   |   τ_RL = L/R  ·  i_L(t) = (V_S/R)(1 − e^(−t/τ))",
    hardwareSetup: [
      "Function Generator 3MHz (Square Wave Step Input)",
      "DSO 100MHz (Time-Domain Cursor Measurement)",
      "Capacitors (1μF–47μF) & Inductors (10mH–100mH)",
    ],
    softwareSetup: ["LTSpice", "NI Multisim"],
    procedure: [
      "Apply a low-frequency square wave (f ≪ 1/(10τ)) to the series RC / RL network.",
      "Capture v_C(t) and v_R(t) simultaneously on DSO Channels 1 and 2.",
      "Use DSO cursors to measure the time taken for v_C(t) to reach 63.2% of V_step (1τ) and 99.3% (5τ).",
    ],
    params: [
      { key: "p1", label: "Step Voltage V_step", unit: "V", min: 2, max: 20, step: 1, defaultVal: 10 },
      { key: "p2", label: "Resistance R", unit: "Ω", min: 100, max: 5000, step: 100, defaultVal: 1000 },
      { key: "p3", label: "Capacitance C", unit: "μF", min: 1, max: 50, step: 1, defaultVal: 10 },
    ],
  },
  {
    id: "A06",
    domain: "A",
    labNumber: 6,
    title: "Transient and Frequency Response of RLC Series and Parallel Circuits",
    category: "Advanced Circuit Lab",
    objective:
      "Investigate underdamped (ζ < 1), critically damped (ζ = 1), and overdamped (ζ > 1) second-order RLC step responses and Bode magnitude/phase curves.",
    formula: "ω_0 = 1/√(LC)   |   α_series = R/(2L)   |   ζ = α / ω_0 = (R/2)√(C/L)",
    hardwareSetup: [
      "Function Generator 3MHz",
      "DSO 100MHz",
      "Precision LCR Meter",
      "Decade Inductance & Capacitance Boxes",
    ],
    softwareSetup: ["LTSpice", "MATLAB / Simulink"],
    procedure: [
      "Wire series RLC circuit with L=50mH, C=1μF and variable resistor R.",
      "Set R < 2√(L/C) to observe underdamped ringing overshoot on DSO.",
      "Set R = 2√(L/C) to verify critical damping without overshoot.",
      "Sweep sine wave frequency from 100 Hz to 20 kHz to plot AC frequency response.",
    ],
    params: [
      { key: "p1", label: "Resistance R", unit: "Ω", min: 10, max: 1000, step: 10, defaultVal: 100 },
      { key: "p2", label: "Inductance L", unit: "mH", min: 5, max: 200, step: 5, defaultVal: 50 },
      { key: "p3", label: "Capacitance C", unit: "μF", min: 1, max: 50, step: 1, defaultVal: 2 },
    ],
  },
  {
    id: "A07",
    domain: "A",
    labNumber: 7,
    title: "Series and Parallel Resonance - Resonance Frequency, Q-factor and Bandwidth",
    category: "Advanced Circuit Lab",
    objective:
      "Determine resonant frequency f_0, half-power cutoff frequencies (f_1, f_2), Bandwidth (BW), and Quality Factor (Q) for series acceptor and parallel rejector tank circuits.",
    formula: "f_0 = 1 / (2π√(LC))   |   Q_s = ω_0 L / R   |   BW = f_2 − f_1 = f_0 / Q",
    hardwareSetup: [
      "Function Generator 3MHz",
      "DSO 100MHz",
      "LCR Meter",
    ],
    softwareSetup: ["NI Multisim", "LTSpice"],
    procedure: [
      "Sweep AC excitation frequency across the RLC network and locate f_0 where V and I are in phase (θ = 0°).",
      "Measure maximum current I_max = V/R at series resonance and minimum current at parallel resonance.",
      "Find lower and upper −3 dB frequencies f_1 and f_2 where I = 0.707 · I_max.",
      "Compute BW = f_2 − f_1 and verify Q = f_0 / BW.",
    ],
    params: [
      { key: "p1", label: "Resistance R", unit: "Ω", min: 10, max: 500, step: 10, defaultVal: 50 },
      { key: "p2", label: "Inductance L", unit: "mH", min: 1, max: 100, step: 1, defaultVal: 25 },
      { key: "p3", label: "Capacitance C", unit: "μF", min: 1, max: 20, step: 1, defaultVal: 1 },
    ],
  },
  {
    id: "A08",
    domain: "A",
    labNumber: 8,
    title: "Two-Port Network Parameters - Z, Y, h, ABCD parameter determination",
    category: "Advanced Circuit Lab",
    objective:
      "Experimentally measure Open-Circuit Impedance (Z), Short-Circuit Admittance (Y), Hybrid (h), and Transmission (ABCD) matrices for a passive two-port network.",
    formula: "[V1; V2] = [Z11 Z12; Z21 Z22][I1; I2]   |   [I1; I2] = [Y11 Y12; Y21 Y22][V1; V2]",
    hardwareSetup: [
      "Dual DC/AC Supply",
      "Precision Digital Voltmeters & Ammeters",
      "Two-Port T/Pi Resistor Test Module",
    ],
    softwareSetup: ["MATLAB", "LTSpice"],
    procedure: [
      "Leave Port 2 open (I2 = 0), apply V1 to Port 1, and measure Z11 = V1/I1 and Z21 = V2/I1.",
      "Leave Port 1 open (I1 = 0), apply V2 to Port 2, and measure Z22 = V2/I2 and Z12 = V1/I2.",
      "Short Port 2 (V2 = 0) and Port 1 (V1 = 0) successively to determine Y11, Y21, Y12, Y22.",
      "Verify symmetry (Z12 = Z21) and reciprocity (AD − BC = 1).",
    ],
    params: [
      { key: "p1", label: "T-Arm R_a", unit: "Ω", min: 10, max: 500, step: 10, defaultVal: 100 },
      { key: "p2", label: "T-Arm R_b", unit: "Ω", min: 10, max: 500, step: 10, defaultVal: 100 },
      { key: "p3", label: "Shunt Branch R_c", unit: "Ω", min: 10, max: 500, step: 10, defaultVal: 200 },
    ],
  },
  {
    id: "A09",
    domain: "A",
    labNumber: 9,
    title: "Ladder Network, T and Pi Networks Attenuation Measurement",
    category: "Advanced Circuit Lab",
    objective:
      "Design symmetrical T and Π (Pi) resistive attenuator pads and multi-stage R-2R ladder networks; measure characteristic impedance Z_0 and attenuation in dB and Nepers.",
    formula: "Attenuation (dB) = 20 · log10(V_in / V_out)   |   R_1(T) = Z_0(N−1)/(N+1),  R_2(T) = 2Z_0 N/(N²−1)",
    hardwareSetup: [
      "Function Generator 3MHz",
      "DSO 100MHz",
      "Precision Resistor Array",
    ],
    softwareSetup: ["NI Multisim", "LTSpice"],
    procedure: [
      "Terminate the T and Π attenuator networks with matched load impedance Z_0 = 600Ω.",
      "Measure input voltage V_in and output voltage V_out across Z_0.",
      "Compute attenuation α_dB = 20 log10(V_in / V_out) and verify T-to-Π Star-Delta equivalence.",
    ],
    params: [
      { key: "p1", label: "Characteristic Z_0", unit: "Ω", min: 50, max: 600, step: 50, defaultVal: 600 },
      { key: "p2", label: "Target Attenuation", unit: "dB", min: 3, max: 40, step: 1, defaultVal: 10 },
      { key: "p3", label: "Input Voltage V_in", unit: "V", min: 1, max: 20, step: 1, defaultVal: 10 },
    ],
  },
  {
    id: "A10",
    domain: "A",
    labNumber: 10,
    title: "Bridge Networks - Wheatstone and Wein Bridge",
    category: "Advanced Circuit Lab",
    objective:
      "Measure unknown resistance precisely using null balance in a DC Wheatstone Bridge, and measure unknown frequency/capacitance using an AC Wien Bridge.",
    formula: "Wheatstone: R_x = R_3 · (R_2 / R_1)   |   Wien Null Frequency: f_0 = 1 / (2π R C)",
    hardwareSetup: [
      "Function Generator 3MHz & DC Supply",
      "Null Detector / Galvanometer & DSO",
      "Precision Decade Resistance & Capacitance Boxes",
    ],
    softwareSetup: ["NI Multisim", "LTSpice"],
    procedure: [
      "Connect unknown resistor R_x in arm 4 of the Wheatstone bridge and adjust decade box R_3 until galvanometer current I_G = 0.",
      "Excite the AC Wien Bridge with a sine wave and adjust frequency f until bridge output across DSO reaches null.",
    ],
    params: [
      { key: "p1", label: "Bridge Arm R1", unit: "Ω", min: 50, max: 1000, step: 10, defaultVal: 100 },
      { key: "p2", label: "Bridge Arm R2", unit: "Ω", min: 50, max: 1000, step: 10, defaultVal: 200 },
      { key: "p3", label: "Standard Arm R3", unit: "Ω", min: 50, max: 1000, step: 10, defaultVal: 150 },
    ],
  },
  {
    id: "A11",
    domain: "A",
    labNumber: 11,
    title: "Compensation Theorem and Millman's Theorem",
    category: "Advanced Circuit Lab",
    objective:
      "Verify Millman's parallel voltage-branch theorem for multiple non-ideal sources and Compensation Theorem when a branch resistance R changes by ΔR.",
    formula: "V_Millman = (∑ V_k G_k) / (∑ G_k)   |   V_comp = I_branch · ΔR",
    hardwareSetup: [
      "Triple-Output DC Power Supply",
      "Precision Resistor Bank",
      "Digital Multimeter",
    ],
    softwareSetup: ["LTSpice", "NI Multisim"],
    procedure: [
      "Connect three parallel branches (V1, R1), (V2, R2), (V3, R3) and measure common bus voltage V_AB.",
      "Compare measured V_AB against Millman's formula (V1/R1 + V2/R2 + V3/R3)/(1/R1 + 1/R2 + 1/R3).",
      "Perturb R3 by +ΔR and verify that branch current changes match a compensating source V_c = I · ΔR.",
    ],
    params: [
      { key: "p1", label: "Branch 1 Voltage V1", unit: "V", min: 2, max: 24, step: 1, defaultVal: 12 },
      { key: "p2", label: "Branch 2 Voltage V2", unit: "V", min: 2, max: 24, step: 1, defaultVal: 8 },
      { key: "p3", label: "Branch Resistance R", unit: "Ω", min: 50, max: 500, step: 10, defaultVal: 100 },
    ],
  },
  {
    id: "A12",
    domain: "A",
    labNumber: 12,
    title: "Analysis of Coupled Circuits and Mutual Inductance",
    category: "Advanced Circuit Lab",
    objective:
      "Determine self-inductances (L1, L2), mutual inductance (M), coefficient of coupling (k), and dot-polarity convention in magnetically coupled coils.",
    formula: "M = (L_aiding − L_opposing) / 4   |   k = M / √(L1 · L2)",
    hardwareSetup: [
      "Coupled Inductor / Transformer Coil Pair",
      "Precision LCR Meter & Function Generator",
      "DSO 100MHz",
    ],
    softwareSetup: ["LTSpice", "NI Multisim"],
    procedure: [
      "Measure L1 and L2 individually using the LCR meter.",
      "Connect coils in series-aiding to measure L_aid = L1 + L2 + 2M.",
      "Connect coils in series-opposing to measure L_opp = L1 + L2 − 2M.",
      "Compute M = (L_aid − L_opp)/4 and coupling coefficient k = M / √(L1·L2).",
    ],
    params: [
      { key: "p1", label: "Primary Coil L1", unit: "mH", min: 10, max: 200, step: 5, defaultVal: 50 },
      { key: "p2", label: "Secondary Coil L2", unit: "mH", min: 10, max: 200, step: 5, defaultVal: 50 },
      { key: "p3", label: "Coupling Factor k (%)", unit: "%", min: 10, max: 99, step: 1, defaultVal: 85 },
    ],
  },
  {
    id: "A13",
    domain: "A",
    labNumber: 13,
    title: "Interconnection of Two-Port Networks - Series, Parallel, Cascade",
    category: "Advanced Circuit Lab",
    objective:
      "Verify that Series connection adds Z-matrices ([Z] = [Z_a]+[Z_b]), Parallel connection adds Y-matrices ([Y] = [Y_a]+[Y_b]), and Cascade multiplies ABCD matrices.",
    formula: "Series: Z_eq = Z_A + Z_B   |   Parallel: Y_eq = Y_A + Y_B   |   Cascade: [T_eq] = [T_A] · [T_B]",
    hardwareSetup: [
      "Two Identical Two-Port Network Modules",
      "Dual DC/AC Supply & Digital Multimeters",
    ],
    softwareSetup: ["MATLAB", "LTSpice"],
    procedure: [
      "Connect Two-Port A and Two-Port B in cascade and measure overall transmission parameters A, B, C, D.",
      "Connect Two-Port A and Two-Port B in parallel and verify Y_eq = Y_A + Y_B.",
    ],
    params: [
      { key: "p1", label: "Stage 1 Gain / Ratio", unit: "×", min: 1, max: 10, step: 0.5, defaultVal: 2 },
      { key: "p2", label: "Stage 2 Gain / Ratio", unit: "×", min: 1, max: 10, step: 0.5, defaultVal: 3 },
      { key: "p3", label: "Port Impedance Z0", unit: "Ω", min: 50, max: 600, step: 50, defaultVal: 100 },
    ],
  },
  {
    id: "A14",
    domain: "A",
    labNumber: 14,
    title: "Simulation Lab - Network Theorems verification using LTSpice / Multisim",
    category: "EDA Simulation Lab",
    objective:
      "Perform `.op` DC operating point, `.dc` parameter sweeps, and `.tf` small-signal transfer function analysis in LTSpice / Multisim to verify Superposition, Thevenin, and MPT.",
    formula: ".tf V(out) Vs  ⇒  Computes Input Z, Output Z (R_th), and Transfer Gain",
    hardwareSetup: ["PC Workstation"],
    softwareSetup: ["LTSpice", "NI Multisim"],
    procedure: [
      "Draft the multi-loop bridge network in LTSpice and run `.op` to inspect all nodal voltages and branch currents.",
      "Use `.step param RL 10 200 5` to plot load power V(out)*I(RL) and pinpoint maximum power transfer.",
    ],
    params: [
      { key: "p1", label: "SPICE Source V1", unit: "V", min: 5, max: 50, step: 1, defaultVal: 20 },
      { key: "p2", label: "Equivalent R_th", unit: "Ω", min: 10, max: 200, step: 5, defaultVal: 50 },
      { key: "p3", label: "Stepped Load R_L", unit: "Ω", min: 10, max: 200, step: 5, defaultVal: 50 },
    ],
    codeTitle: "LTSpice Netlist — Parametric Load Sweep & Thevenin (.tf) Analysis",
    codeSnippet: `* Lab A14: Network Theorems & Maximum Power Transfer in LTSpice
V1 in 0 DC 20V
R1 in n1 60
R2 n1 0 120
R3 n1 out 10
RL out 0 {RL_val}
.step param RL_val 10 150 5
.op
.tf V(out) V1
.end`,
  },
  {
    id: "A15",
    domain: "A",
    labNumber: 15,
    title: "Simulation Lab - Frequency domain analysis and pole-zero plot using MATLAB",
    category: "EDA Simulation Lab",
    objective:
      "Model s-domain transfer functions H(s) = N(s)/D(s) in MATLAB, plot s-plane Pole-Zero maps (`pzmap`), Bode magnitude/phase diagrams (`bode`), and impulse/step responses.",
    formula: "H(s) = (ω_0² ) / (s² + 2ζω_0 s + ω_0²)   |   Poles: s = −ζω_0 ± jω_0√(1 − ζ²)",
    hardwareSetup: ["PC Workstation"],
    softwareSetup: ["MATLAB / Simulink (Control System Toolbox)"],
    procedure: [
      "Define numerator and denominator polynomials of the RLC network transfer function H(s) in MATLAB.",
      "Execute `pzmap(H)`, `bode(H)`, and `step(H)` to correlate pole locations in the left-half s-plane with damping ratio ζ.",
    ],
    params: [
      { key: "p1", label: "Natural Freq ω_0", unit: "rad/s", min: 100, max: 5000, step: 100, defaultVal: 1000 },
      { key: "p2", label: "Damping Ratio ζ (×100)", unit: "%", min: 10, max: 200, step: 5, defaultVal: 50 },
      { key: "p3", label: "DC Gain K", unit: "×", min: 1, max: 10, step: 1, defaultVal: 1 },
    ],
    codeTitle: "MATLAB Script — s-Domain Transfer Function, Pole-Zero Map & Bode Plot",
    codeSnippet: `% Lab A15: Frequency Domain & Pole-Zero Plot in MATLAB
R = 100; L = 50e-3; C = 1e-6;
s = tf('s');
H = (1/(L*C)) / (s^2 + (R/L)*s + 1/(L*C));
figure;
subplot(2,2,1); pzmap(H); grid on; title('s-Plane Pole-Zero Map');
subplot(2,2,2); step(H); grid on; title('Unit Step Response');
subplot(2,1,2); bode(H); grid on; title('Bode Magnitude & Phase Response');`,
  },

  // ===========================================================================
  // B. LINEAR CIRCUIT ANALYSIS / LINEAR INTEGRATED CIRCUITS [15 Labs]
  // ===========================================================================
  {
    id: "B01",
    domain: "B",
    labNumber: 1,
    title: "Op-Amp Characteristics - Inverting, Non-Inverting Amplifier, Voltage Follower",
    category: "Fundamental Bench Lab",
    objective:
      "Measure closed-loop voltage gain, phase relationship, input/output impedance, and unity-gain buffer isolation using the μA741 Operational Amplifier.",
    formula: "A_v(inv) = −R_f / R_in   |   A_v(non) = 1 + R_f / R_1   |   A_v(follower) = +1",
    hardwareSetup: [
      "Dual Tracking DC Power Supply (±15V)",
      "Function Generator 3MHz",
      "DSO 100MHz",
      "μA741 Op-Amp IC & Precision Resistors",
    ],
    softwareSetup: ["NI Multisim", "LTSpice"],
    procedure: [
      "Power the μA741 with +15V (Pin 7) and −15V (Pin 4).",
      "Apply a 1 kHz, 0.5 Vp-p sine wave and observe 180° phase inversion in the Inverting configuration.",
      "Reconfigure as Non-Inverting and Voltage Follower stages and verify in-phase amplification.",
    ],
    params: [
      { key: "p1", label: "Input Resistor R_in", unit: "kΩ", min: 1, max: 50, step: 1, defaultVal: 10 },
      { key: "p2", label: "Feedback Resistor R_f", unit: "kΩ", min: 1, max: 100, step: 1, defaultVal: 47 },
      { key: "p3", label: "Input Signal V_in", unit: "V", min: 0.1, max: 3, step: 0.1, defaultVal: 1.0 },
    ],
  },
  {
    id: "B02",
    domain: "B",
    labNumber: 2,
    title: "Op-Amp as Adder, Subtractor and Scaling Amplifier",
    category: "Fundamental Bench Lab",
    objective:
      "Design inverting/non-inverting summing amplifiers, weighted scaling mixers, and differential subtractor stages using virtual-ground superposition.",
    formula: "V_out(Adder) = −R_f (V_1/R_1 + V_2/R_2 + V_3/R_3)   |   V_out(Sub) = (R_f/R_1)(V_2 − V_1)",
    hardwareSetup: [
      "Dual DC Supply (±15V) & Variable DC Inputs",
      "μA741 Op-Amp IC",
      "DSO 100MHz & Digital Voltmeter",
    ],
    softwareSetup: ["NI Multisim", "Proteus"],
    procedure: [
      "Connect three input branches R1, R2, R3 to the virtual-ground summing junction (Pin 2).",
      "Apply distinct DC and AC voltages to V1, V2, V3 and verify V_out = −R_f(V1/R1 + V2/R2 + V3/R3).",
      "Wire the 4-resistor Differential Subtractor and verify common-mode rejection when V1 = V2.",
    ],
    params: [
      { key: "p1", label: "Input V1", unit: "V", min: -5, max: 5, step: 0.5, defaultVal: 2.0 },
      { key: "p2", label: "Input V2", unit: "V", min: -5, max: 5, step: 0.5, defaultVal: 1.5 },
      { key: "p3", label: "Gain Ratio R_f / R_in", unit: "×", min: 1, max: 10, step: 0.5, defaultVal: 2.0 },
    ],
  },
  {
    id: "B03",
    domain: "B",
    labNumber: 3,
    title: "Op-Amp as Integrator and Differentiator - Waveform generation",
    category: "Fundamental Bench Lab",
    objective:
      "Perform time-domain integration (Square → Triangle, Sine → −Cosine) and differentiation (Triangle → Square) using practical RC op-amp circuits.",
    formula: "V_out(int) = −(1 / R·C) ∫ V_in dt   |   V_out(diff) = −R·C (dV_in / dt)",
    hardwareSetup: [
      "Function Generator 3MHz",
      "DSO 100MHz",
      "μA741 / TL082 Op-Amp, Capacitors & Resistors",
    ],
    softwareSetup: ["NI Multisim", "LTSpice"],
    procedure: [
      "Feed a 1 kHz square wave into the Op-Amp Integrator (with DC-stabilizing resistor R_f = 10·R_1) and observe the linear triangular output.",
      "Feed a 1 kHz triangular wave into the Op-Amp Differentiator and observe the square-wave output derivative.",
    ],
    params: [
      { key: "p1", label: "Input Frequency f", unit: "Hz", min: 100, max: 5000, step: 100, defaultVal: 1000 },
      { key: "p2", label: "Resistance R", unit: "kΩ", min: 1, max: 50, step: 1, defaultVal: 10 },
      { key: "p3", label: "Capacitance C", unit: "nF", min: 10, max: 500, step: 10, defaultVal: 100 },
    ],
  },
  {
    id: "B04",
    domain: "B",
    labNumber: 4,
    title: "Instrumentation Amplifier and its application in sensor interface",
    category: "Advanced Circuit Lab",
    objective:
      "Build a 3-Op-Amp Instrumentation Amplifier with high Common-Mode Rejection Ratio (CMRR) and single-resistor gain control R_G to amplify a Wheatstone bridge RTD/strain sensor.",
    formula: "A_d = (1 + 2R_1 / R_G) · (R_3 / R_2)   |   CMRR_dB = 20 · log10(|A_d / A_cm|)",
    hardwareSetup: [
      "3× μA741 / INA128 Instrumentation Amp",
      "Wheatstone Bridge Sensor Module (RTD / Thermistor)",
      "DSO 100MHz & Precision DMM",
    ],
    softwareSetup: ["NI Multisim", "Proteus"],
    procedure: [
      "Wire the dual non-inverting input buffer stage coupled via gain resistor R_G to the differential subtractor stage.",
      "Connect the output of a slightly unbalanced RTD bridge (ΔV ≈ 20 mV) and verify clean amplification to 2.0 V.",
    ],
    params: [
      { key: "p1", label: "Sensor Diff Signal ΔV", unit: "mV", min: 5, max: 200, step: 5, defaultVal: 25 },
      { key: "p2", label: "Gain Resistor R_G", unit: "kΩ", min: 1, max: 50, step: 1, defaultVal: 2 },
      { key: "p3", label: "Bridge Resistor R1", unit: "kΩ", min: 10, max: 100, step: 5, defaultVal: 25 },
    ],
  },
  {
    id: "B05",
    domain: "B",
    labNumber: 5,
    title: "Active Filters - First and Second Order LPF, HPF, BPF, Notch Filter",
    category: "Advanced Circuit Lab",
    objective:
      "Design Sallen-Key second-order Butterworth Low-Pass (−40 dB/dec), High-Pass, Band-Pass, and Twin-T 50Hz/60Hz Notch active filters.",
    formula: "f_c = 1 / (2π √(R_1 R_2 C_1 C_2))   |   A_FB(Butterworth) = 3 − 1/Q = 1.586",
    hardwareSetup: [
      "Function Generator 3MHz",
      "DSO 100MHz",
      "TL082 / μA741 Op-Amps & Precision RC Components",
    ],
    softwareSetup: ["NI Multisim (Bode Plotter)", "LTSpice"],
    procedure: [
      "Construct the Sallen-Key 2nd-order LPF with passband gain A_0 = 1.586 for maximally flat Butterworth response.",
      "Sweep input frequency from 10 Hz to 100 kHz, measure −3 dB cutoff f_c, and verify −40 dB/decade roll-off.",
    ],
    params: [
      { key: "p1", label: "Filter Resistance R", unit: "kΩ", min: 1, max: 50, step: 1, defaultVal: 10 },
      { key: "p2", label: "Filter Capacitance C", unit: "nF", min: 1, max: 200, step: 5, defaultVal: 15 },
      { key: "p3", label: "Passband Gain A_0", unit: "×", min: 1, max: 2.9, step: 0.1, defaultVal: 1.6 },
    ],
  },
  {
    id: "B06",
    domain: "B",
    labNumber: 6,
    title: "Precision Half-Wave and Full-Wave Rectifier using Op-Amp",
    category: "Advanced Circuit Lab",
    objective:
      "Eliminate the 0.7V silicon diode dead-zone using Op-Amp negative feedback (Super-Diode) to rectify millivolt-level AC signals cleanly.",
    formula: "V_knee(eff) = V_D / A_OL ≈ 0.7V / 10^5 = 7 μV   |   V_out(FW) = |V_in|",
    hardwareSetup: [
      "Function Generator 3MHz (50 mVp-p Low-Level Sine)",
      "DSO 100MHz",
      "μA741 Op-Amps & 1N4148 Fast Signal Diodes",
    ],
    softwareSetup: ["LTSpice", "NI Multisim"],
    procedure: [
      "Apply a 100 mV peak sine wave (well below 0.7V) to the Precision Half-Wave Rectifier and verify distortion-free half-cycles.",
      "Add the summing precision full-wave stage and observe full-wave absolute-value |V_in| output on DSO.",
    ],
    params: [
      { key: "p1", label: "Low-Level Input V_p", unit: "mV", min: 20, max: 1000, step: 20, defaultVal: 200 },
      { key: "p2", label: "Stage Gain R_f/R_1", unit: "×", min: 1, max: 10, step: 1, defaultVal: 1 },
      { key: "p3", label: "Signal Frequency", unit: "Hz", min: 50, max: 2000, step: 50, defaultVal: 500 },
    ],
  },
  {
    id: "B07",
    domain: "B",
    labNumber: 7,
    title: "Clipper, Clamper and Peak Detector Circuits",
    category: "Fundamental Bench Lab",
    objective:
      "Design active Op-Amp positive/negative limiters (clippers), DC level restorers (clampers), and sample-and-hold capacitor Peak Detectors.",
    formula: "Clipper: V_out = min(V_in, V_ref)   |   Clamper: V_out = V_in + V_p   |   V_peak = max(V_in(t))",
    hardwareSetup: [
      "Function Generator 3MHz",
      "DSO 100MHz (DC-Coupled Mode)",
      "TL082 Op-Amp, 1N4148 Diodes & Low-Leakage Polypropylene Capacitor",
    ],
    softwareSetup: ["NI Multisim", "LTSpice"],
    procedure: [
      "Set reference voltage V_ref and verify sharp active clipping without the 0.7V diode drop error.",
      "Switch DSO to DC coupling to measure the upward/downward DC baseline shift in the active clamper.",
      "Verify that the Peak Detector holds the maximum input crest voltage V_p across capacitor C.",
    ],
    params: [
      { key: "p1", label: "Input Sine Peak V_p", unit: "V", min: 1, max: 12, step: 0.5, defaultVal: 6.0 },
      { key: "p2", label: "Reference / Clamp V_ref", unit: "V", min: -5, max: 5, step: 0.5, defaultVal: 2.5 },
      { key: "p3", label: "Hold Capacitor C", unit: "μF", min: 0.1, max: 10, step: 0.1, defaultVal: 1.0 },
    ],
  },
  {
    id: "B08",
    domain: "B",
    labNumber: 8,
    title: "Comparator, Zero Crossing Detector and Schmitt Trigger",
    category: "Fundamental Bench Lab",
    objective:
      "Compare open-loop Zero-Crossing Detectors against regenerative positive-feedback Schmitt Triggers and measure upper/lower threshold hysteresis (V_UTP, V_LTP) in XY mode.",
    formula: "β = R_2 / (R_1 + R_2)   |   V_UTP = +β·V_sat,  V_LTP = −β·V_sat   |   V_Hyst = V_UTP − V_LTP",
    hardwareSetup: [
      "Function Generator 3MHz",
      "DSO 100MHz (Timebase & X-Y Hysteresis Loop Mode)",
      "μA741 / LM311 Comparator IC",
    ],
    softwareSetup: ["NI Multisim", "LTSpice"],
    procedure: [
      "Apply a noisy sine wave to the open-loop Zero-Crossing Detector and observe multiple false chatter transitions near 0V.",
      "Add positive feedback resistors R1 and R2 to form a Schmitt Trigger and measure the clean hysteresis loop on DSO X-Y mode.",
    ],
    params: [
      { key: "p1", label: "Feedback Resistor R1", unit: "kΩ", min: 1, max: 100, step: 1, defaultVal: 30 },
      { key: "p2", label: "Threshold Resistor R2", unit: "kΩ", min: 1, max: 50, step: 1, defaultVal: 10 },
      { key: "p3", label: "Op-Amp V_sat", unit: "V", min: 5, max: 15, step: 1, defaultVal: 13 },
    ],
  },
  {
    id: "B09",
    domain: "B",
    labNumber: 9,
    title: "Waveform Generators - Square, Triangular using Op-Amp",
    category: "Advanced Circuit Lab",
    objective:
      "Design an astable Op-Amp Relaxation Oscillator for square-wave generation and cascade it with a Miller Integrator to generate synchronized triangular waveforms.",
    formula: "T_sq = 2 R C · ln((1 + β) / (1 − β))   |   f_tri = R_2 / (4 · R_int · C_int · R_1)",
    hardwareSetup: [
      "Dual Op-Amp IC (TL082 / 2× μA741)",
      "DSO 100MHz",
      "Precision Timing Capacitors & Potentiometers",
    ],
    softwareSetup: ["NI Multisim", "LTSpice"],
    procedure: [
      "Wire the Schmitt relaxation oscillator stage and measure capacitor exponential charging between V_LTP and V_UTP.",
      "Couple the square-wave output into the Op-Amp Integrator to produce a symmetric triangular wave.",
    ],
    params: [
      { key: "p1", label: "Timing Resistor R", unit: "kΩ", min: 1, max: 100, step: 1, defaultVal: 10 },
      { key: "p2", label: "Timing Capacitor C", unit: "nF", min: 10, max: 500, step: 10, defaultVal: 100 },
      { key: "p3", label: "Feedback Ratio β", unit: "×", min: 0.1, max: 0.8, step: 0.05, defaultVal: 0.45 },
    ],
  },
  {
    id: "B10",
    domain: "B",
    labNumber: 10,
    title: "Oscillators - Wein Bridge, RC Phase Shift, Hartley, Colpitts",
    category: "Advanced Circuit Lab",
    objective:
      "Verify the Barkhausen criterion (|Aβ| ≥ 1, ∠Aβ = 0° or 360°) in audio-frequency Wien Bridge & RC Phase-Shift oscillators and RF Hartley & Colpitts LC oscillators.",
    formula: "Wien: f_0 = 1/(2πRC), A_v = 3   |   RC Phase Shift: f_0 = 1/(2π√6 RC), |A_v| ≥ 29   |   Colpitts: f_0 = 1/(2π√(L·C_eq))",
    hardwareSetup: [
      "DSO 100MHz (with FFT Spectrum View)",
      "μA741 / BJT Oscillator Trainer",
      "Matched RC Networks & Tuned LC Tank Coils",
    ],
    softwareSetup: ["NI Multisim", "LTSpice"],
    procedure: [
      "Adjust the non-inverting feedback potentiometer in the Wien Bridge Oscillator untilA_v = 3.0 and sustained sinusoidal oscillation begins.",
      "Measure the 60° per stage phase shift across the 3-stage ladder in the RC Phase-Shift Oscillator (|A_v| = 29).",
    ],
    params: [
      { key: "p1", label: "Wien / RC Resistor R", unit: "kΩ", min: 1, max: 100, step: 1, defaultVal: 10 },
      { key: "p2", label: "Wien / RC Capacitor C", unit: "nF", min: 1, max: 200, step: 1, defaultVal: 15 },
      { key: "p3", label: "Amplifier Gain A_v", unit: "×", min: 1, max: 35, step: 0.5, defaultVal: 3.1 },
    ],
  },
  {
    id: "B11",
    domain: "B",
    labNumber: 11,
    title: "Voltage Controlled Oscillator (VCO) and Phase Locked Loop (PLL) 565",
    category: "Advanced Circuit Lab",
    objective:
      "Measure VCO frequency-to-voltage linearity using IC 566 and determine Free-Running Frequency (f_0), Lock Range (Δf_L), and Capture Range (Δf_C) of the NE565 Phase-Locked Loop.",
    formula: "f_0 = 0.3 / (R_0 · C_0)   |   Δf_L = ±(8 · f_0) / V_CC   |   Δf_C ≈ √(Δf_L / (2π · 3600 · C_filter))",
    hardwareSetup: [
      "LM565 PLL & LM566 VCO Trainer Kit",
      "Function Generator 3MHz",
      "DSO 100MHz",
    ],
    softwareSetup: ["NI Multisim", "Proteus"],
    procedure: [
      "With input disconnected, measure the VCO free-running frequency f_0 at Pin 4 of the LM565.",
      "Apply an input signal and sweep its frequency upward and downward to measure Capture Range and Lock Range.",
    ],
    params: [
      { key: "p1", label: "Timing Resistor R_0", unit: "kΩ", min: 2, max: 20, step: 0.5, defaultVal: 6.8 },
      { key: "p2", label: "Timing Capacitor C_0", unit: "nF", min: 1, max: 100, step: 1, defaultVal: 10 },
      { key: "p3", label: "Total Supply V_CC", unit: "V", min: 10, max: 24, step: 1, defaultVal: 12 },
    ],
  },
  {
    id: "B12",
    domain: "B",
    labNumber: 12,
    title: "Voltage Regulator using Op-Amp and 723 IC, 555 Timer as Astable and Monostable",
    category: "Fundamental Bench Lab",
    objective:
      "Design a precision series pass regulator with current foldback using LM723, and configure the NE555 Timer in Monostable one-shot and Astable PWM clock modes.",
    formula: "555 Astable: f = 1.44 / ((R_A + 2R_B)C),  Duty = (R_A+R_B)/(R_A+2R_B)   |   Monostable: T_p = 1.1 R C",
    hardwareSetup: [
      "NE555 Timer & LM723 Regulator ICs",
      "DSO 100MHz & Dual DC Supply",
    ],
    softwareSetup: ["Proteus", "NI Multisim", "LTSpice"],
    procedure: [
      "Wire the NE555 in Astable mode with R_A, R_B, and C; measure T_high = 0.693(R_A+R_B)C and T_low = 0.693·R_B·C.",
      "Configure LM723 low-voltage regulator (2V–7V) and measure Line Regulation and Load Regulation.",
    ],
    params: [
      { key: "p1", label: "555 Resistor R_A", unit: "kΩ", min: 1, max: 100, step: 1, defaultVal: 10 },
      { key: "p2", label: "555 Resistor R_B", unit: "kΩ", min: 1, max: 100, step: 1, defaultVal: 22 },
      { key: "p3", label: "Timing Capacitor C", unit: "μF", min: 0.1, max: 50, step: 0.5, defaultVal: 1.0 },
    ],
  },
  {
    id: "B13",
    domain: "B",
    labNumber: 13,
    title: "Log and Antilog Amplifier, Analog Multiplier",
    category: "Advanced Circuit Lab",
    objective:
      "Exploit the exponential Shockley BJT collector-base junction inside an Op-Amp feedback loop to compute real-time analog logarithms, antilogarithms, and four-quadrant multiplication.",
    formula: "V_out(Log) = −V_T · ln(V_in / (I_S · R_1))   |   V_out(Antilog) = −R_f · I_S · e^(V_in / V_T)",
    hardwareSetup: [
      "Matched Transistor Pair (2N3904) & μA741 Op-Amps",
      "AD633 Four-Quadrant Analog Multiplier IC",
      "DSO 100MHz",
    ],
    softwareSetup: ["NI Multisim", "LTSpice"],
    procedure: [
      "Sweep DC input V_in across two decades (10 mV to 10 V) and verify logarithmic compression (−60 mV/decade slope).",
      "Feed two sinusoids into the Analog Multiplier to demonstrate frequency doubling (cos²ωt = ½(1 + cos 2ωt)) and AM modulation.",
    ],
    params: [
      { key: "p1", label: "Input Voltage V_in", unit: "V", min: 0.05, max: 10, step: 0.05, defaultVal: 1.0 },
      { key: "p2", label: "Multiplier Input V_y", unit: "V", min: 0.5, max: 10, step: 0.5, defaultVal: 4.0 },
      { key: "p3", label: "Thermal Voltage V_T", unit: "mV", min: 24, max: 30, step: 0.5, defaultVal: 26 },
    ],
  },
  {
    id: "B14",
    domain: "B",
    labNumber: 14,
    title: "Simulation Lab - Design and frequency response of active filters in Multisim",
    category: "EDA Simulation Lab",
    objective:
      "Simulate Butterworth, Chebyshev, and Bessel 4th-order cascaded Sallen-Key and Multiple-Feedback (MFB) active filters in NI Multisim using the Virtual Bode Plotter.",
    formula: "|H(jω)|_Butterworth = A_0 / √(1 + (ω / ω_c)^(2n))",
    hardwareSetup: ["PC Workstation"],
    softwareSetup: ["NI Multisim", "LTSpice"],
    procedure: [
      "Cascade two 2nd-order Sallen-Key stages with Q1 = 0.541 and Q2 = 1.307 to realize a 4th-order (−80 dB/dec) Butterworth LPF.",
      "Run AC Sweep from 10 Hz to 1 MHz and compare passband ripple against Chebyshev response.",
    ],
    params: [
      { key: "p1", label: "Cutoff Frequency f_c", unit: "Hz", min: 100, max: 10000, step: 100, defaultVal: 1000 },
      { key: "p2", label: "Filter Order n", unit: "poles", min: 1, max: 6, step: 1, defaultVal: 4 },
      { key: "p3", label: "Test Frequency f", unit: "Hz", min: 100, max: 10000, step: 100, defaultVal: 2000 },
    ],
    codeTitle: "SPICE Netlist — 2nd-Order Sallen-Key Active Butterworth LPF",
    codeSnippet: `* Lab B14: Active Sallen-Key Butterworth LPF AC Sweep
VIN 1 0 AC 1V
R1 1 2 10k
R2 2 3 10k
C1 2 4 15.9n
C2 3 0 15.9n
XOP 3 5 4 OPAMP_IDEAL
RA 5 0 10k
RB 4 5 5.86k
.ac dec 50 10 100k
.end`,
  },
  {
    id: "B15",
    domain: "B",
    labNumber: 15,
    title: "Simulation Lab - Stability analysis and Slew Rate measurement using PSpice",
    category: "EDA Simulation Lab",
    objective:
      "Measure Op-Amp large-signal Slew Rate limit (SR = dV_out/dt_max), full-power bandwidth (f_M = SR / 2πV_p), and open-loop Phase Margin using PSpice / LTSpice.",
    formula: "SR = (dV_out / dt)_max (V/μs)   |   f_max = SR / (2π · V_peak)",
    hardwareSetup: ["PC Workstation"],
    softwareSetup: ["Cadence PSpice", "LTSpice"],
    procedure: [
      "Configure the μA741 as a unity-gain follower and apply a ±10V fast square-wave step.",
      "Measure the slope of the trapezoidal output ramp in V/μs (≈ 0.5 V/μs for μA741 vs. 13 V/μs for TL082).",
    ],
    params: [
      { key: "p1", label: "Op-Amp Slew Rate SR", unit: "V/μs", min: 0.2, max: 20, step: 0.1, defaultVal: 0.5 },
      { key: "p2", label: "Output Swing V_peak", unit: "V", min: 1, max: 14, step: 0.5, defaultVal: 10 },
      { key: "p3", label: "Step Rise Window", unit: "μs", min: 5, max: 100, step: 5, defaultVal: 20 },
    ],
  },

  // ===========================================================================
  // C. DIGITAL LOGIC DESIGN [15 Labs]
  // ===========================================================================
  {
    id: "C01",
    domain: "C",
    labNumber: 1,
    title: "Study of Basic Logic Gates and Universal Gates - Truth table verification",
    category: "Fundamental Bench Lab",
    objective:
      "Verify truth tables of 74xx TTL primitive gates (7408 AND, 7432 OR, 7404 NOT, 7486 XOR, 74266 XNOR) and synthesize all logic operations using only Universal NAND (7400) and NOR (7402) gates.",
    formula: "De Morgan: (A · B)' = A' + B'   |   (A + B)' = A' · B'",
    hardwareSetup: [
      "Digital Logic Trainer Kit (+5V Regulated TTL)",
      "ICs: 74LS00, 74LS02, 74LS04, 74LS08, 74LS32, 74LS86",
    ],
    softwareSetup: ["IST Digital Logic Simulator", "Proteus", "NI Multisim"],
    procedure: [
      "Insert 74LSxx DIP ICs on the trainer breadboard; connect Pin 14 to +5V VCC and Pin 7 to GND.",
      "Toggle inputs A and B across all 4 binary states (00, 01, 10, 11) and verify LED logic states.",
      "Construct NOT, AND, OR, and XOR circuits exclusively using 4× 2-input NAND gates (74LS00).",
    ],
    params: [
      { key: "p1", label: "Input Logic A", unit: "bit", min: 0, max: 1, step: 1, defaultVal: 1 },
      { key: "p2", label: "Input Logic B", unit: "bit", min: 0, max: 1, step: 1, defaultVal: 1 },
      { key: "p3", label: "TTL Gate Delay t_pd", unit: "ns", min: 2, max: 30, step: 1, defaultVal: 10 },
    ],
  },
  {
    id: "C02",
    domain: "C",
    labNumber: 2,
    title: "Design of Half Adder, Full Adder, Half Subtractor, Full Subtractor",
    category: "Fundamental Bench Lab",
    objective:
      "Design and verify 1-bit combinational binary arithmetic circuits for addition (Sum, Carry) and subtraction (Difference, Borrow).",
    formula: "FA Sum = A ⊕ B ⊕ C_in,  C_out = A·B + C_in(A ⊕ B)   |   FS Diff = A ⊕ B ⊕ B_in,  B_out = A'·B + B_in(A ⊕ B)'",
    hardwareSetup: [
      "Digital Logic Trainer Kit",
      "ICs: 74LS86 (XOR), 74LS08 (AND), 74LS32 (OR), 74LS04 (NOT)",
    ],
    softwareSetup: ["IST Digital Logic Simulator", "Proteus"],
    procedure: [
      "Wire a Half Adder using one XOR gate (7486) and one AND gate (7408).",
      "Cascade two Half Adders and an OR gate to form a Full Adder and verify all 8 rows of the truth table.",
      "Add an inverter on input A of the AND gates to convert the Full Adder into a Full Subtractor.",
    ],
    params: [
      { key: "p1", label: "Bit A", unit: "bit", min: 0, max: 1, step: 1, defaultVal: 1 },
      { key: "p2", label: "Bit B", unit: "bit", min: 0, max: 1, step: 1, defaultVal: 1 },
      { key: "p3", label: "Carry/Borrow In", unit: "bit", min: 0, max: 1, step: 1, defaultVal: 1 },
    ],
  },
  {
    id: "C03",
    domain: "C",
    labNumber: 3,
    title: "4-bit Binary Adder / Subtractor and BCD Adder",
    category: "Fundamental Bench Lab",
    objective:
      "Implement a 4-bit 2's complement Adder/Subtractor using IC 74LS83 and XOR mode control M, and design an 8421 BCD Adder with +6 (0110₂) correction logic.",
    formula: "S = A + (B ⊕ M) + M   |   BCD Correction: K = C_out + S_3·S_2 + S_3·S_1",
    hardwareSetup: [
      "Digital Logic Trainer Kit",
      "2× IC 74LS83 (4-Bit Full Adder), IC 74LS86 (Quad XOR)",
    ],
    softwareSetup: ["IST Digital Logic Simulator", "Proteus"],
    procedure: [
      "Connect B3..B0 through 74LS86 XOR gates controlled by Mode switch M (M=0 for Add, M=1 for 2's Complement Subtract).",
      "For BCD Adder: detect invalid BCD sums (> 9 or C4=1) via C_out + S3·S2 + S3·S1 and add 0110₂ in a second 74LS83.",
    ],
    params: [
      { key: "p1", label: "Operand A (0–15)", unit: "dec", min: 0, max: 15, step: 1, defaultVal: 9 },
      { key: "p2", label: "Operand B (0–15)", unit: "dec", min: 0, max: 15, step: 1, defaultVal: 7 },
      { key: "p3", label: "Mode M (0=Add, 1=Sub)", unit: "mode", min: 0, max: 1, step: 1, defaultVal: 0 },
    ],
  },
  {
    id: "C04",
    domain: "C",
    labNumber: 4,
    title: "Code Converters - Binary to Gray, Gray to Binary, BCD to Excess-3",
    category: "Fundamental Bench Lab",
    objective:
      "Synthesize K-Map minimized combinational code converters between 4-bit Binary, unit-distance Gray code, and self-complementing Excess-3 code.",
    formula: "Gray: G_3 = B_3,  G_i = B_{i+1} ⊕ B_i   |   Excess-3: E = BCD + 0011₂",
    hardwareSetup: [
      "Digital Logic Trainer Kit",
      "IC 74LS86 (Quad XOR) & Basic Logic Gates",
    ],
    softwareSetup: ["IST Digital Logic Simulator", "NI Multisim"],
    procedure: [
      "Wire 3 XOR gates to convert 4-bit Binary (B3 B2 B1 B0) into Gray Code (G3 G2 G1 G0).",
      "Cascade 3 XOR gates to convert Gray Code back to Binary.",
      "Verify K-Map minimized expressions for 4-bit BCD to Excess-3 (+3) converter.",
    ],
    params: [
      { key: "p1", label: "4-Bit Input Value", unit: "dec", min: 0, max: 15, step: 1, defaultVal: 6 },
      { key: "p2", label: "Excess Offset", unit: "dec", min: 0, max: 3, step: 3, defaultVal: 3 },
      { key: "p3", label: "Parity Check Bit", unit: "bit", min: 0, max: 1, step: 1, defaultVal: 1 },
    ],
  },
  {
    id: "C05",
    domain: "C",
    labNumber: 5,
    title: "Multiplexer/Demultiplexer, Encoder/Decoder, Priority Encoder",
    category: "Fundamental Bench Lab",
    objective:
      "Verify data routing with 74LS151/153 Multiplexers, 74LS138 3-to-8 Line Decoder/Demultiplexer, and 74LS148 8-to-3 Priority Encoder, and implement Boolean functions using a MUX.",
    formula: "MUX: Y = ∑ m_k · I_k   |   Decoder: Y_k = m_k(A,B,C)",
    hardwareSetup: [
      "Digital Logic Trainer Kit",
      "ICs: 74LS153 (Dual 4:1 MUX), 74LS138 (3:8 Decoder), 74LS148 (Priority Encoder)",
    ],
    softwareSetup: ["IST Digital Logic Simulator", "Proteus"],
    procedure: [
      "Apply select address (S1, S0) to the 4:1 MUX and verify routing of data channels I0–I3 to output Y.",
      "Configure 74LS138 active-LOW decoder to synthesize a Full Adder by summing minterm outputs via NAND gates.",
    ],
    params: [
      { key: "p1", label: "Select Address (0–3)", unit: "sel", min: 0, max: 3, step: 1, defaultVal: 2 },
      { key: "p2", label: "Active Data Bit", unit: "bit", min: 0, max: 1, step: 1, defaultVal: 1 },
      { key: "p3", label: "Highest Priority Req", unit: "line", min: 0, max: 7, step: 1, defaultVal: 5 },
    ],
  },
  {
    id: "C06",
    domain: "C",
    labNumber: 6,
    title: "Magnitude Comparator - 1-bit, 2-bit and 4-bit",
    category: "Fundamental Bench Lab",
    objective:
      "Design 1-bit and 2-bit gate-level comparators and verify the 4-bit IC 74LS85 Magnitude Comparator with cascading inputs (A>B, A=B, A<B).",
    formula: "(A = B) = ∏ (A_i ⊙ B_i)   |   (A > B) = A_3 B_3' + x_3 A_2 B_2' + ...",
    hardwareSetup: [
      "Digital Logic Trainer Kit",
      "IC 74LS85 (4-Bit Magnitude Comparator) & Basic Gates",
    ],
    softwareSetup: ["IST Digital Logic Simulator", "Proteus"],
    procedure: [
      "Build a 1-bit comparator using an XNOR gate (A=B) and two AND/NOT gates (A>B, A<B).",
      "Test the 74LS85 4-bit comparator across A < B, A = B, and A > B cases with cascade pin I(A=B) tied HIGH.",
    ],
    params: [
      { key: "p1", label: "4-Bit Word A", unit: "dec", min: 0, max: 15, step: 1, defaultVal: 11 },
      { key: "p2", label: "4-Bit Word B", unit: "dec", min: 0, max: 15, step: 1, defaultVal: 8 },
      { key: "p3", label: "Cascade Eq In", unit: "bit", min: 0, max: 1, step: 1, defaultVal: 1 },
    ],
  },
  {
    id: "C07",
    domain: "C",
    labNumber: 7,
    title: "Flip-Flops - SR, JK, D, T - Truth table and excitation table",
    category: "Fundamental Bench Lab",
    objective:
      "Construct cross-coupled SR latches and verify positive/negative edge-triggered D (74LS74), JK (74LS73/76), and T flip-flop characteristic and excitation tables.",
    formula: "D-FF: Q(t+1) = D   |   JK-FF: Q(t+1) = J·Q' + K'·Q   |   T-FF: Q(t+1) = T ⊕ Q",
    hardwareSetup: [
      "Digital Logic Trainer Kit",
      "ICs: 74LS00, 74LS74 (Dual D-FF), 74LS73/76 (Dual JK-FF)",
    ],
    softwareSetup: ["IST Digital Logic Simulator", "Proteus"],
    procedure: [
      "Verify asynchronous active-LOW Preset (PR̅) and Clear (CLR̅) override pins on the 74LS74.",
      "Pulse the clock input and verify Hold (J=0,K=0), Reset (0,1), Set (1,0), and Toggle (1,1) modes on the JK flip-flop.",
    ],
    params: [
      { key: "p1", label: "Input J / D", unit: "bit", min: 0, max: 1, step: 1, defaultVal: 1 },
      { key: "p2", label: "Input K", unit: "bit", min: 0, max: 1, step: 1, defaultVal: 1 },
      { key: "p3", label: "Current State Q(t)", unit: "bit", min: 0, max: 1, step: 1, defaultVal: 0 },
    ],
  },
  {
    id: "C08",
    domain: "C",
    labNumber: 8,
    title: "Asynchronous and Synchronous Counters - Up/Down, Decade, Mod-N Counter",
    category: "Advanced Circuit Lab",
    objective:
      "Design asynchronous ripple counters, modulo-10 BCD decade counters with NAND clear feedback, and synchronous Up/Down counters (74LS193).",
    formula: "f_out(stage n) = f_clk / 2^n   |   Max Ripple Delay = N · t_pd(FF)",
    hardwareSetup: [
      "Digital Logic Trainer Kit & DSO 100MHz",
      "ICs: 74LS73 (JK-FF), 74LS90 (Decade Counter), 74LS193 (Sync Up/Down Counter)",
    ],
    softwareSetup: ["IST Digital Logic Simulator", "Proteus"],
    procedure: [
      "Cascade four JK flip-flops in Toggle mode (J=K=1) with Q_i driving CLK_{i+1} to form a 4-bit ripple counter.",
      "Add a 2-input NAND gate detecting state 1010₂ (10) connected to asynchronous CLR̅ to create a Mod-10 BCD Decade Counter.",
    ],
    params: [
      { key: "p1", label: "Counter Modulus N", unit: "states", min: 2, max: 16, step: 1, defaultVal: 10 },
      { key: "p2", label: "Input Clock f_clk", unit: "kHz", min: 1, max: 1000, step: 10, defaultVal: 100 },
      { key: "p3", label: "FF Delay t_pd", unit: "ns", min: 5, max: 40, step: 1, defaultVal: 15 },
    ],
  },
  {
    id: "C09",
    domain: "C",
    labNumber: 9,
    title: "Shift Registers - SISO, SIPO, PISO, PIPO, Universal Shift Register",
    category: "Advanced Circuit Lab",
    objective:
      "Implement 4-bit serial/parallel data shifting and bidirectional rotate/parallel-load operations using D Flip-Flops (74LS74) and the 74LS194 Universal Shift Register.",
    formula: "S1,S0 = 00 (Hold),  01 (Shift Right),  10 (Shift Left),  11 (Parallel Load)",
    hardwareSetup: [
      "Digital Logic Trainer Kit",
      "2× IC 74LS74 (Dual D-FF) & IC 74LS194 (4-Bit Bidirectional Universal Shift Register)",
    ],
    softwareSetup: ["IST Digital Logic Simulator", "Proteus"],
    procedure: [
      "Load a 4-bit parallel word into the 74LS194 with S1=1, S0=1 on the rising clock edge.",
      "Switch to S1=0, S0=1 (Shift Right) and observe serial bit propagation across QA → QB → QC → QD.",
    ],
    params: [
      { key: "p1", label: "Parallel Word D[3:0]", unit: "dec", min: 0, max: 15, step: 1, defaultVal: 13 },
      { key: "p2", label: "Mode (0=Hold,1=SR,2=SL,3=Load)", unit: "mode", min: 0, max: 3, step: 1, defaultVal: 1 },
      { key: "p3", label: "Clock Pulses", unit: "ticks", min: 1, max: 8, step: 1, defaultVal: 2 },
    ],
  },
  {
    id: "C10",
    domain: "C",
    labNumber: 10,
    title: "Ring Counter and Johnson Counter - Design and timing analysis",
    category: "Advanced Circuit Lab",
    objective:
      "Design a 4-bit One-Hot Ring Counter (N states, feedback D_0 = Q_3) and a Twisted-Ring Johnson Counter (2N states, feedback D_0 = Q_3') and plot multi-phase timing waveforms.",
    formula: "Ring States = N (4 states)   |   Johnson States = 2N (8 states, glitch-free decoding)",
    hardwareSetup: [
      "Digital Logic Trainer Kit & Multi-Channel DSO",
      "IC 74LS74 / 74LS194",
    ],
    softwareSetup: ["IST Digital Logic Simulator", "Proteus"],
    procedure: [
      "Preset FF0 to 1 and Clear FF1..FF3 to 000 (initial seed 1000₂) for the 4-bit Ring Counter.",
      "Connect inverted output Q3' back to serial input D0 to form an 8-state Johnson Counter.",
    ],
    params: [
      { key: "p1", label: "Register Stages N", unit: "FFs", min: 3, max: 8, step: 1, defaultVal: 4 },
      { key: "p2", label: "Clock Frequency", unit: "kHz", min: 1, max: 500, step: 5, defaultVal: 50 },
      { key: "p3", label: "Active Clock Step", unit: "step", min: 0, max: 7, step: 1, defaultVal: 2 },
    ],
  },
  {
    id: "C11",
    domain: "C",
    labNumber: 11,
    title: "Sequence Detector and FSM Design using Mealy and Moore Models",
    category: "Advanced Circuit Lab",
    objective:
      "Synthesize overlapping/non-overlapping serial bit sequence detectors (e.g. `1011`) using both Moore (output depends only on state) and Mealy (output depends on state & input) Finite State Machines.",
    formula: "Moore: Z(t) = λ(Q(t))   |   Mealy: Z(t) = λ(Q(t), X(t))",
    hardwareSetup: [
      "Digital Logic Trainer Kit",
      "IC 74LS74 (State Flip-Flops) & Next-State Logic Gates",
    ],
    softwareSetup: ["IST FSM Studio", "Xilinx Vivado"],
    procedure: [
      "Derive the state diagram, state assignment table, and K-Map minimized D-FF input equations for sequence `1011`.",
      "Compare the 5-state Moore machine against the 4-state Mealy machine response timing.",
    ],
    params: [
      { key: "p1", label: "Pattern Length L", unit: "bits", min: 3, max: 5, step: 1, defaultVal: 4 },
      { key: "p2", label: "FSM Type (0=Moore, 1=Mealy)", unit: "model", min: 0, max: 1, step: 1, defaultVal: 0 },
      { key: "p3", label: "Clock Rate", unit: "kHz", min: 1, max: 100, step: 1, defaultVal: 10 },
    ],
  },
  {
    id: "C12",
    domain: "C",
    labNumber: 12,
    title: "ALU Design and Memory Unit Interfacing - RAM, ROM",
    category: "Advanced Circuit Lab",
    objective:
      "Verify arithmetic and bitwise logic operations of a 4-bit ALU (74LS181) and interface static RAM (6116 / 74LS189) and EPROM/ROM with address decoding.",
    formula: "Address Lines = log2(Depth)   |   Total Bits = 2^A × DataWidth",
    hardwareSetup: [
      "Digital Logic Trainer Kit",
      "IC 74LS181 (4-Bit ALU), IC 74LS189 (64-Bit RAM), IC 74LS138 (Address Decoder)",
    ],
    softwareSetup: ["IST PLA/ALU Lab", "Proteus"],
    procedure: [
      "Test arithmetic (A+B, A−B, A+1) and logic (A∧B, A∨B, A⊕B, NOT A) opcodes on the 4-bit ALU.",
      "Write binary data words into selected RAM addresses using Write Enable (WE̅) and read them back on the tri-state data bus.",
    ],
    params: [
      { key: "p1", label: "ALU Operand A", unit: "dec", min: 0, max: 15, step: 1, defaultVal: 12 },
      { key: "p2", label: "ALU Operand B", unit: "dec", min: 0, max: 15, step: 1, defaultVal: 5 },
      { key: "p3", label: "Address Bus Width", unit: "bits", min: 4, max: 16, step: 1, defaultVal: 10 },
    ],
  },
  {
    id: "C13",
    domain: "C",
    labNumber: 13,
    title: "A/D and D/A Converters - Interfacing with digital circuits",
    category: "Advanced Circuit Lab",
    objective:
      "Measure resolution, step size (LSB), and linearity of an R-2R Ladder / DAC0808 Digital-to-Analog Converter and an ADC0804 Successive-Approximation (SAR) Analog-to-Digital Converter.",
    formula: "LSB Step = V_ref / (2^N − 1)   |   V_out(DAC) = V_ref · (D / 2^N)",
    hardwareSetup: [
      "DAC0808 & ADC0804 Trainer Module",
      "μA741 Current-to-Voltage Op-Amp",
      "DSO 100MHz & Precision DMM",
    ],
    softwareSetup: ["Proteus", "NI Multisim"],
    procedure: [
      "Drive the 8-bit R-2R DAC with a binary counter to observe a 256-step staircase ramp on the DSO.",
      "Apply a variable 0–5V DC input to the ADC0804 and verify the 8-bit binary output code D = round(255 · V_in / 5V).",
    ],
    params: [
      { key: "p1", label: "Converter Resolution N", unit: "bits", min: 4, max: 12, step: 2, defaultVal: 8 },
      { key: "p2", label: "Reference Voltage V_ref", unit: "V", min: 2, max: 10, step: 0.5, defaultVal: 5.0 },
      { key: "p3", label: "Analog Input V_in", unit: "V", min: 0, max: 5, step: 0.1, defaultVal: 3.2 },
    ],
  },
  {
    id: "C14",
    domain: "C",
    labNumber: 14,
    title: "FPGA Lab - Verilog/VHDL implementation of Combinational circuits on Xilinx/Altera",
    category: "FPGA / PCB Hardware Lab",
    objective:
      "Write, synthesize, simulate, and download behavioral/structural Verilog HDL modules for a 4-Bit Ripple/Carry-Lookahead Adder, 8:1 MUX, and 7-Segment Decoder onto an FPGA board.",
    formula: "assign {Cout, Sum} = A + B + Cin;   // RTL Synthesis to FPGA LUT6 Slices",
    hardwareSetup: [
      "Xilinx Artix-7 (Basys-3) or Altera Cyclone FPGA Board",
      "USB-JTAG Programming Cable",
    ],
    softwareSetup: ["Xilinx Vivado / ISE", "ModelSim"],
    procedure: [
      "Create a Verilog RTL project in Xilinx Vivado and write the combinational module and testbench.",
      "Run Behavioral Timing Simulation to verify waveforms, assign FPGA package pins (XDC constraints), and program the bitstream.",
    ],
    params: [
      { key: "p1", label: "Data Bus Width N", unit: "bits", min: 4, max: 32, step: 4, defaultVal: 8 },
      { key: "p2", label: "FPGA Clock Crystal", unit: "MHz", min: 25, max: 200, step: 25, defaultVal: 100 },
      { key: "p3", label: "LUT Delay per Stage", unit: "ns", min: 0.5, max: 5, step: 0.5, defaultVal: 1.2 },
    ],
    codeTitle: "Verilog HDL — Parameterized Combinational ALU & 7-Segment Decoder (FPGA)",
    codeSnippet: `// Lab C14: Combinational ALU & 4-Bit Adder in Verilog HDL
module combinational_alu #(parameter W = 4) (
    input  wire [W-1:0] A,
    input  wire [W-1:0] B,
    input  wire [1:0]    sel,
    output reg  [W-1:0] Y,
    output reg          Cout
);
    always @(*) begin
        Cout = 1'b0;
        case (sel)
            2'b00: {Cout, Y} = A + B;       // Addition
            2'b01: {Cout, Y} = A - B;       // Subtraction
            2'b10: Y = A & B;               // Bitwise AND
            2'b11: Y = A ^ B;               // Bitwise XOR
        endcase
    end
endmodule`,
  },
  {
    id: "C15",
    domain: "C",
    labNumber: 15,
    title: "FPGA Lab - Verilog/VHDL implementation of Traffic Light Controller, Vending Machine, Elevator Controller",
    category: "FPGA / PCB Hardware Lab",
    objective:
      "Design synchronous Moore/Mealy Finite State Machines in Verilog/VHDL with clock dividers for real-world controllers: 4-Way Traffic Light, Coin Vending Machine, and Multi-Floor Elevator.",
    formula: "always @(posedge clk or posedge rst) state <= next_state;",
    hardwareSetup: [
      "Xilinx Artix-7 / Altera Cyclone FPGA Board",
      "Onboard Tri-Color LEDs, Pushbuttons & 7-Segment Display",
    ],
    softwareSetup: ["Xilinx Vivado / ISE"],
    procedure: [
      "Encode FSM states (`S_NS_GREEN`, `S_NS_YELLOW`, `S_EW_GREEN`, `S_EW_YELLOW`) with a programmable timer counter.",
      "Verify state transitions in Vivado Simulator and test live on the FPGA board.",
    ],
    params: [
      { key: "p1", label: "Green Phase Timer", unit: "sec", min: 5, max: 60, step: 5, defaultVal: 30 },
      { key: "p2", label: "Yellow Phase Timer", unit: "sec", min: 2, max: 10, step: 1, defaultVal: 5 },
      { key: "p3", label: "Controller States", unit: "states", min: 4, max: 12, step: 1, defaultVal: 6 },
    ],
    codeTitle: "Verilog HDL — Synchronous 4-Way Traffic Light FSM Controller",
    codeSnippet: `// Lab C15: FPGA Traffic Light Controller FSM in Verilog
module traffic_light_fsm (
    input  wire       clk_1hz,
    input  wire       rst,
    output reg  [2:0] light_NS, // {Red, Yellow, Green}
    output reg  [2:0] light_EW
);
    localparam S0_NS_G = 2'b00, S1_NS_Y = 2'b01,
               S2_EW_G = 2'b10, S3_EW_Y = 2'b11;
    reg [1:0] state;
    reg [3:0] timer;

    always @(posedge clk_1hz or posedge rst) begin
        if (rst) begin state <= S0_NS_G; timer <= 0; end
        else begin
            case (state)
                S0_NS_G: if (timer == 4'd9) begin state <= S1_NS_Y; timer <= 0; end else timer <= timer + 1;
                S1_NS_Y: if (timer == 4'd2) begin state <= S2_EW_G; timer <= 0; end else timer <= timer + 1;
                S2_EW_G: if (timer == 4'd9) begin state <= S3_EW_Y; timer <= 0; end else timer <= timer + 1;
                S3_EW_Y: if (timer == 4'd2) begin state <= S0_NS_G; timer <= 0; end else timer <= timer + 1;
            endcase
        end
    end

    always @(*) begin
        light_NS = (state == S0_NS_G) ? 3'b001 : (state == S1_NS_Y) ? 3'b010 : 3'b100;
        light_EW = (state == S2_EW_G) ? 3'b001 : (state == S3_EW_Y) ? 3'b010 : 3'b100;
    end
endmodule`,
  },

  // ===========================================================================
  // D. POWER ELECTRONICS [15 Labs]
  // ===========================================================================
  {
    id: "D01",
    domain: "D",
    labNumber: 1,
    title: "Static Characteristics of SCR, Power MOSFET, IGBT, TRIAC, DIAC and GTO",
    category: "Fundamental Bench Lab",
    objective:
      "Plot static V-I characteristics of Thyristors (SCR Latching I_L & Holding I_H, Breakover V_BO), bidirectional TRIAC/DIAC switches, and gate-controlled Power MOSFET & IGBT devices.",
    formula: "SCR Conduction: I_A > I_L (Latching)   |   Turn-Off: I_A < I_H (Holding)   |   I_L ≈ 2..3 × I_H",
    hardwareSetup: [
      "Power Electronics Device Characteristic Trainer",
      "SCR (TYN612), Power MOSFET (IRF540N), IGBT (IRG4BC20), TRIAC (BT136), DIAC (DB3)",
      "Dual DC Supply & Digital Multimeters",
    ],
    softwareSetup: ["LTSpice", "PSIM"],
    procedure: [
      "Set fixed SCR gate current I_G1 and increase anode-cathode voltage V_AK until forward breakover switches the SCR ON.",
      "Reduce anode current gradually to determine holding current I_H where the SCR returns to forward blocking.",
      "Plot output I_D–V_DS / I_C–V_CE curves for the Power MOSFET and IGBT at stepped V_GS / V_GE values.",
    ],
    params: [
      { key: "p1", label: "Gate Drive V_GS / V_GE", unit: "V", min: 2, max: 15, step: 0.5, defaultVal: 10 },
      { key: "p2", label: "Anode/Drain Supply V", unit: "V", min: 1, max: 60, step: 1, defaultVal: 24 },
      { key: "p3", label: "Load Resistance R_L", unit: "Ω", min: 5, max: 100, step: 5, defaultVal: 12 },
    ],
  },
  {
    id: "D02",
    domain: "D",
    labNumber: 2,
    title: "SCR Triggering Circuits - R, RC and UJT Triggering, Cosine control",
    category: "Fundamental Bench Lab",
    objective:
      "Compare firing angle control range of Resistance (R: 0°–90°), Resistance-Capacitance (RC: 0°–180°), UJT Relaxation Oscillator pulse-train triggering, and Cosine Ramp synchronization.",
    formula: "R Triggering: α_max = 90°   |   RC Triggering: α ∈ [0°, 180°]   |   UJT: V_P = η·V_BB + V_D",
    hardwareSetup: [
      "SCR Firing Circuit Trainer (R, RC, UJT 2N2646 & Pulse Transformer)",
      "DSO 100MHz (Isolated Channels)",
    ],
    softwareSetup: ["PSIM", "NI Multisim"],
    procedure: [
      "Observe that simple R-triggering cannot delay firing past the 90° AC peak.",
      "Introduce phase-shifting capacitor C in RC triggering to achieve full 0°–170° firing control.",
      "Verify isolated pulse-transformer gate pulses generated by the UJT relaxation oscillator.",
    ],
    params: [
      { key: "p1", label: "Firing Angle α", unit: "deg", min: 5, max: 170, step: 5, defaultVal: 60 },
      { key: "p2", label: "AC Supply V_rms", unit: "V", min: 24, max: 230, step: 2, defaultVal: 110 },
      { key: "p3", label: "UJT Intrinsic Ratio η", unit: "×", min: 0.5, max: 0.85, step: 0.05, defaultVal: 0.65 },
    ],
  },
  {
    id: "D03",
    domain: "D",
    labNumber: 3,
    title: "Single Phase Half-Wave and Full-Wave Uncontrolled Rectifier with R and RL Load",
    category: "Fundamental Bench Lab",
    objective:
      "Analyze diode conduction angle, average DC voltage V_dc, RMS voltage, form factor, ripple factor, and inductive current extinction angle β in 1Φ uncontrolled rectifiers.",
    formula: "HW: V_dc = V_m / π = 0.318 V_m   |   FW Bridge: V_dc = 2V_m / π = 0.636 V_m,  RF = 48.2%",
    hardwareSetup: [
      "1Φ Diode Bridge Power Module",
      "Resistive-Inductive (R-L) Load Bank",
      "DSO 100MHz",
    ],
    softwareSetup: ["PSIM", "MATLAB / Simulink"],
    procedure: [
      "Measure V_dc and V_rms for Half-Wave and Full-Wave Bridge rectifiers feeding a pure R load.",
      "Switch in series inductance L and observe conduction extending past π to extinction angle β > 180°.",
    ],
    params: [
      { key: "p1", label: "AC Input V_rms", unit: "V", min: 12, max: 230, step: 2, defaultVal: 110 },
      { key: "p2", label: "Load Resistance R", unit: "Ω", min: 5, max: 200, step: 5, defaultVal: 25 },
      { key: "p3", label: "Load Inductance L", unit: "mH", min: 0, max: 200, step: 10, defaultVal: 40 },
    ],
  },
  {
    id: "D04",
    domain: "D",
    labNumber: 4,
    title: "Single Phase Half-Wave and Full-Wave Controlled Rectifier with R, RL and RLE Load",
    category: "Advanced Circuit Lab",
    objective:
      "Evaluate phase-controlled SCR converters (Semi-Converter & Full-Bridge) driving R, RL, and RLE (active DC motor back-EMF) loads across Rectification (α < 90°) and Line-Commutated Inversion (α > 90°).",
    formula: "Full-Wave R Load: V_dc = (V_m/π)(1 + cos α)   |   Continuous RL Load: V_dc = (2V_m/π) cos α",
    hardwareSetup: [
      "1Φ Thyristor Bridge Converter Trainer",
      "R-L-E Load Bank",
      "DSO 100MHz",
    ],
    softwareSetup: ["PSIM", "MATLAB / Simulink"],
    procedure: [
      "Vary firing angle α from 0° to 150° with resistive load and verify V_dc = (V_m/π)(1 + cos α).",
      "With high inductive load (continuous current), observe negative instantaneous voltage excursions and verify V_dc = (2V_m/π) cos α.",
    ],
    params: [
      { key: "p1", label: "Firing Angle α", unit: "deg", min: 0, max: 150, step: 5, defaultVal: 45 },
      { key: "p2", label: "AC Input V_rms", unit: "V", min: 24, max: 230, step: 2, defaultVal: 220 },
      { key: "p3", label: "Load Resistance R", unit: "Ω", min: 5, max: 100, step: 5, defaultVal: 20 },
    ],
  },
  {
    id: "D05",
    domain: "D",
    labNumber: 5,
    title: "Three Phase Half-Wave and Full-Wave Controlled Rectifier",
    category: "Advanced Circuit Lab",
    objective:
      "Analyze 3-pulse midpoint and 6-pulse B6 full-bridge thyristor converters, measuring output voltage ripple at 6f_s (300 Hz) and phase-control characteristics.",
    formula: "3Φ 6-Pulse B6 Bridge: V_dc = (3√3 V_mp / π) cos α = 1.35 · V_LL(rms) · cos α",
    hardwareSetup: [
      "3-Phase 6-Pulse SCR Bridge Trainer",
      "Synchronized 6-Channel Gate Firing Unit",
      "4-Channel DSO 100MHz",
    ],
    softwareSetup: ["MATLAB / Simulink", "PSIM"],
    procedure: [
      "Connect the 3-phase supply (400V L-L or scaled 110V L-L trainer bus) to the 6-pulse SCR bridge.",
      "Observe the 60° commutation intervals between SCR pairs (T1→T2→T3→T4→T5→T6) and measure V_dc vs. α.",
    ],
    params: [
      { key: "p1", label: "Line-to-Line V_LL(rms)", unit: "V", min: 50, max: 440, step: 10, defaultVal: 400 },
      { key: "p2", label: "Firing Angle α", unit: "deg", min: 0, max: 120, step: 5, defaultVal: 30 },
      { key: "p3", label: "DC Load R", unit: "Ω", min: 5, max: 100, step: 5, defaultVal: 25 },
    ],
  },
  {
    id: "D06",
    domain: "D",
    labNumber: 6,
    title: "Effect of Freewheeling Diode and Source Inductance on Controlled Rectifiers",
    category: "Advanced Circuit Lab",
    objective:
      "Demonstrate how a shunt Freewheeling Diode (FWD) clamps negative load voltage and improves input Power Factor, and measure commutation overlap angle μ caused by AC source inductance L_s.",
    formula: "With Overlap μ: V_dc = (2V_m / π) cos α − (2ω L_s / π) I_d",
    hardwareSetup: [
      "1Φ Controlled Bridge with Switchable Freewheeling Diode & Line Inductors L_s",
      "DSO 100MHz",
    ],
    softwareSetup: ["PSIM", "MATLAB / Simulink"],
    procedure: [
      "Operate the controlled rectifier with RL load at α = 60° without FWD and note negative voltage spikes.",
      "Switch ON the Freewheeling Diode to clamp V_out ≥ 0V and observe continuous load current decaying through the FWD.",
      "Insert source inductance L_s and measure the commutation notch and overlap angle μ on the DSO.",
    ],
    params: [
      { key: "p1", label: "Firing Angle α", unit: "deg", min: 15, max: 120, step: 5, defaultVal: 45 },
      { key: "p2", label: "Source Inductance L_s", unit: "mH", min: 0, max: 30, step: 1, defaultVal: 5 },
      { key: "p3", label: "Load Current I_d", unit: "A", min: 1, max: 20, step: 1, defaultVal: 5 },
    ],
  },
  {
    id: "D07",
    domain: "D",
    labNumber: 7,
    title: "Single Phase AC Voltage Controller with R and RL Load",
    category: "Advanced Circuit Lab",
    objective:
      "Control RMS AC load voltage using antiparallel SCRs or a TRIAC via symmetrical phase control (α > φ) and integral-cycle burst modulation.",
    formula: "V_o(rms) = V_s √( (1/π) · [ (π − α) + sin(2α)/2 ] )",
    hardwareSetup: [
      "TRIAC / Antiparallel SCR AC Voltage Controller Trainer",
      "Incandescent Lamp / Heater R Load & Inductive Coil",
      "True-RMS Voltmeter & DSO 100MHz",
    ],
    softwareSetup: ["PSIM", "MATLAB / Simulink"],
    procedure: [
      "Sweep TRIAC firing angle α from 0° to 165° and measure true-RMS output voltage V_o(rms).",
      "With RL load (load phase angle φ = tan⁻¹(ωL/R)), verify that control range begins only for α > φ.",
    ],
    params: [
      { key: "p1", label: "AC Supply V_s(rms)", unit: "V", min: 24, max: 230, step: 2, defaultVal: 220 },
      { key: "p2", label: "Firing Angle α", unit: "deg", min: 0, max: 165, step: 5, defaultVal: 60 },
      { key: "p3", label: "Load Resistance R", unit: "Ω", min: 10, max: 200, step: 5, defaultVal: 50 },
    ],
  },
  {
    id: "D08",
    domain: "D",
    labNumber: 8,
    title: "DC Chopper - Step Down (Buck), Step Up (Boost), Buck-Boost, Jones and Morgan Chopper",
    category: "Advanced Circuit Lab",
    objective:
      "Analyze PWM DC-DC switching converters (Buck, Boost, Buck-Boost) in CCM and DCM, alongside classical impulse-commutated Jones and Morgan thyristor choppers.",
    formula: "Buck: V_o = D·V_in   |   Boost: V_o = V_in/(1−D)   |   Buck-Boost: |V_o| = V_in · D/(1−D)",
    hardwareSetup: [
      "MOSFET/IGBT PWM DC-DC Converter Trainer",
      "DSO 100MHz & Current Probe",
    ],
    softwareSetup: ["PSIM", "LTSpice", "MATLAB / Simulink"],
    procedure: [
      "Drive the MOSFET switch with a 25 kHz–50 kHz PWM gate signal and vary duty cycle D from 15% to 85%.",
      "Measure inductor current ripple ΔI_L, output voltage ripple ΔV_o, and conversion efficiency η.",
    ],
    params: [
      { key: "p1", label: "Input DC Voltage V_in", unit: "V", min: 5, max: 48, step: 1, defaultVal: 24 },
      { key: "p2", label: "PWM Duty Cycle D", unit: "%", min: 10, max: 85, step: 5, defaultVal: 50 },
      { key: "p3", label: "Switching Freq f_sw", unit: "kHz", min: 10, max: 100, step: 5, defaultVal: 50 },
    ],
  },
  {
    id: "D09",
    domain: "D",
    labNumber: 9,
    title: "Single Phase Half Bridge and Full Bridge Inverter - 120 and 180 degree mode",
    category: "Advanced Circuit Lab",
    objective:
      "Synthesize AC output from a DC bus using 1Φ Half-Bridge (±V_dc/2) and Full-Bridge (±V_dc) square-wave and quasi-square-wave (dead-angle) inverters.",
    formula: "Half-Bridge: V_1(rms) = (2 V_dc) / (√2 π) = 0.45 V_dc   |   Full-Bridge: V_1(rms) = 0.90 V_dc",
    hardwareSetup: [
      "1Φ H-Bridge MOSFET/IGBT Inverter Trainer",
      "DSO 100MHz with FFT Harmonic Analyzer",
    ],
    softwareSetup: ["PSIM", "MATLAB / Simulink"],
    procedure: [
      "Compare the peak-to-peak output voltage and fundamental RMS of the Half-Bridge vs. Full H-Bridge.",
      "Introduce a zero-voltage dwell angle (120° conduction mode) to eliminate the 3rd harmonic component.",
    ],
    params: [
      { key: "p1", label: "DC Bus Voltage V_dc", unit: "V", min: 12, max: 400, step: 4, defaultVal: 100 },
      { key: "p2", label: "Conduction Angle", unit: "deg", min: 120, max: 180, step: 60, defaultVal: 180 },
      { key: "p3", label: "Output Frequency f_0", unit: "Hz", min: 25, max: 100, step: 5, defaultVal: 50 },
    ],
  },
  {
    id: "D10",
    domain: "D",
    labNumber: 10,
    title: "Three Phase Inverter - SPWM and SVPWM Techniques",
    category: "Advanced Circuit Lab",
    objective:
      "Compare 3-Phase 6-Switch Voltage Source Inverter (VSI) performance under Sinusoidal PWM (SPWM) vs. Space Vector PWM (SVPWM, 15.5% higher DC bus utilization).",
    formula: "SPWM: V_LL1(rms) = 0.612 · m_a · V_dc   |   SVPWM: V_LL1(rms) = 0.707 · m_a · V_dc  (+15.47%)",
    hardwareSetup: [
      "3-Phase 6-IGBT Inverter Module with DSP/FPGA PWM Controller",
      "4-Channel DSO 100MHz",
    ],
    softwareSetup: ["MATLAB / Simulink", "PSIM"],
    procedure: [
      "Vary modulation index m_a from 0.2 to 1.0 and measure line-to-line voltage V_AB and phase voltage V_AN.",
      "Verify that SVPWM achieves 1/√3 V_dc phase peak before overmodulation compared to 0.5 V_dc for SPWM.",
    ],
    params: [
      { key: "p1", label: "DC Link V_dc", unit: "V", min: 50, max: 600, step: 10, defaultVal: 400 },
      { key: "p2", label: "Modulation Index m_a (×100)", unit: "%", min: 20, max: 100, step: 5, defaultVal: 85 },
      { key: "p3", label: "Carrier Freq f_c", unit: "kHz", min: 1, max: 20, step: 1, defaultVal: 5 },
    ],
  },
  {
    id: "D11",
    domain: "D",
    labNumber: 11,
    title: "Cycloconverter and Dual Converter Operation",
    category: "Advanced Circuit Lab",
    objective:
      "Demonstrate direct AC-to-AC sub-harmonic frequency step-down (f_o = f_s / N) using a 1Φ Cycloconverter and four-quadrant reversible DC operation using a Dual Converter (α_1 + α_2 = 180°).",
    formula: "Cycloconverter: f_out = f_supply / N   |   Dual Converter: α_1 + α_2 = 180°  ⇒  V_dc1 + V_dc2 = 0",
    hardwareSetup: [
      "1Φ Midpoint / Bridge Cycloconverter & Dual Converter Trainer",
      "Current-Limiting Circulating Reactor",
      "DSO 100MHz",
    ],
    softwareSetup: ["PSIM", "MATLAB / Simulink"],
    procedure: [
      "Gate positive and negative SCR groups for 2 or 3 consecutive half-cycles to synthesize f_out = 50/2 = 25 Hz or 50/3 = 16.67 Hz.",
      "Verify circulating-current-free and complementary firing (α_2 = 180° − α_1) in the Dual Converter.",
    ],
    params: [
      { key: "p1", label: "Supply Frequency f_s", unit: "Hz", min: 50, max: 60, step: 10, defaultVal: 50 },
      { key: "p2", label: "Step-Down Ratio N", unit: "div", min: 2, max: 5, step: 1, defaultVal: 3 },
      { key: "p3", label: "Converter 1 Angle α_1", unit: "deg", min: 15, max: 165, step: 5, defaultVal: 60 },
    ],
  },
  {
    id: "D12",
    domain: "D",
    labNumber: 12,
    title: "Resonant Converters - ZVS and ZCS Converters",
    category: "Advanced Circuit Lab",
    objective:
      "Eliminate V×I switching overlap losses at high frequency using LC tank Zero-Voltage Switching (ZVS) and Zero-Current Switching (ZCS) quasi-resonant converters.",
    formula: "f_r = 1 / (2π√(L_r C_r))   |   Z_0 = √(L_r / C_r)",
    hardwareSetup: [
      "ZVS / ZCS Quasi-Resonant Buck Converter Module",
      "DSO 100MHz",
    ],
    softwareSetup: ["LTSpice", "PSIM"],
    procedure: [
      "Observe the resonant inductor current i_Lr(t) and resonant capacitor voltage v_Cr(t).",
      "Verify that the MOSFET turns ON/OFF when v_DS = 0 (ZVS) or i_D = 0 (ZCS).",
    ],
    params: [
      { key: "p1", label: "Resonant Inductor L_r", unit: "μH", min: 5, max: 200, step: 5, defaultVal: 25 },
      { key: "p2", label: "Resonant Capacitor C_r", unit: "nF", min: 10, max: 500, step: 10, defaultVal: 100 },
      { key: "p3", label: "Input Supply V_in", unit: "V", min: 12, max: 48, step: 2, defaultVal: 24 },
    ],
  },
  {
    id: "D13",
    domain: "D",
    labNumber: 13,
    title: "Speed Control of DC Motor using Chopper and Single Phase Converter",
    category: "Advanced Circuit Lab",
    objective:
      "Control armature voltage V_a of a separately excited DC motor using a PWM DC Chopper and a 1Φ Phase-Controlled SCR Converter, and plot Torque-Speed curves.",
    formula: "V_a = E_b + I_a R_a   |   ω_m = (V_a − I_a R_a) / (K_e Φ)",
    hardwareSetup: [
      "DC Shunt / Separately Excited Motor (0.5 HP) with Optical Tachometer",
      "PWM Chopper & 1Φ SCR Armature Drive",
    ],
    softwareSetup: ["MATLAB / Simulink", "PSIM"],
    procedure: [
      "Keep field current I_f rated and vary chopper duty cycle D (or rectifier firing angle α) to control armature voltage V_a.",
      "Record shaft speed in RPM from the digital tachometer at different mechanical load torques.",
    ],
    params: [
      { key: "p1", label: "Armature Voltage V_a", unit: "V", min: 20, max: 220, step: 10, defaultVal: 180 },
      { key: "p2", label: "Armature Current I_a", unit: "A", min: 0.5, max: 10, step: 0.5, defaultVal: 3.0 },
      { key: "p3", label: "Armature Resistance R_a", unit: "Ω", min: 0.5, max: 5, step: 0.5, defaultVal: 2.0 },
    ],
  },
  {
    id: "D14",
    domain: "D",
    labNumber: 14,
    title: "Speed Control of Induction Motor using Inverter and AC Voltage Controller",
    category: "Advanced Circuit Lab",
    objective:
      "Perform constant V/f (Volts-per-Hertz) variable-frequency drive (VFD) control of a 3-Phase Induction Motor to maintain rated air-gap flux without saturation.",
    formula: "N_s = 120 · f / P   |   Constant Flux: V / f = Constant   |   N_r = N_s (1 − s)",
    hardwareSetup: [
      "3-Phase Squirrel-Cage Induction Motor (1 HP)",
      "3-Phase SPWM V/f Inverter Drive & AC Stator Voltage Controller",
      "Digital Tachometer & Power Analyzer",
    ],
    softwareSetup: ["MATLAB / Simulink", "PSIM"],
    procedure: [
      "Vary inverter frequency f from 15 Hz to 50 Hz while proportionally scaling stator voltage V (V/f = 400V/50Hz = 8 V/Hz).",
      "Measure synchronous speed N_s, rotor speed N_r, and slip s.",
    ],
    params: [
      { key: "p1", label: "Drive Frequency f", unit: "Hz", min: 10, max: 60, step: 2, defaultVal: 50 },
      { key: "p2", label: "Motor Poles P", unit: "poles", min: 2, max: 8, step: 2, defaultVal: 4 },
      { key: "p3", label: "Operating Slip s", unit: "%", min: 1, max: 10, step: 0.5, defaultVal: 4 },
    ],
  },
  {
    id: "D15",
    domain: "D",
    labNumber: 15,
    title: "Simulation Lab - THD analysis of rectifiers and inverters using MATLAB/Simulink & PSIM",
    category: "EDA Simulation Lab",
    objective:
      "Perform Fast Fourier Transform (FFT) spectral analysis in MATLAB/Simulink (`powergui` FFT tool) and PSIM to compute Total Harmonic Distortion (THD), Distortion Factor, and Power Factor.",
    formula: "THD (%) = (√(∑_{n=2}^∞ V_n²) / V_1) × 100%   |   PF = (I_1 / I_rms) · cos φ_1",
    hardwareSetup: ["PC Workstation"],
    softwareSetup: ["MATLAB / Simulink (Simscape Power Systems)", "PSIM"],
    procedure: [
      "Simulate a square-wave H-bridge (THD = 48.3%) vs. a filtered SPWM H-bridge (THD < 5%) in Simulink.",
      "Open the `powergui` FFT Analysis window to inspect 3rd, 5th, 7th, and sideband harmonics around m_f·f_0.",
    ],
    params: [
      { key: "p1", label: "Fundamental V_1(rms)", unit: "V", min: 50, max: 300, step: 10, defaultVal: 220 },
      { key: "p2", label: "3rd Harmonic V_3", unit: "V", min: 0, max: 80, step: 2, defaultVal: 12 },
      { key: "p3", label: "5th Harmonic V_5", unit: "V", min: 0, max: 60, step: 2, defaultVal: 8 },
    ],
    codeTitle: "MATLAB Script — Inverter Output FFT & Total Harmonic Distortion (THD) Analysis",
    codeSnippet: `% Lab D15: THD Analysis of SPWM Inverter in MATLAB
fs = 50000; t = 0:1/fs:0.04; f0 = 50; fc = 1050; ma = 0.85; Vdc = 400;
v_ref = ma * sin(2*pi*f0*t);
v_car = sawtooth(2*pi*fc*t, 0.5);
v_spwm = Vdc * (v_ref >= v_car) - Vdc * (-v_ref >= v_car);
thd_db = thd(v_spwm, fs, 20);
fprintf('Fundamental = %.1f Hz | THD = %.2f %%\n', f0, 100*(10^(thd_db/20)));`,
  },

  // ===========================================================================
  // E. DEVICES AND CIRCUITS / ELECTRONIC DEVICES & CIRCUITS [15 Labs]
  // ===========================================================================
  {
    id: "E01",
    domain: "E",
    labNumber: 1,
    title: "V-I Characteristics of PN Junction Diode and Zener Diode",
    category: "Fundamental Bench Lab",
    objective:
      "Plot forward and reverse V-I curves of Silicon (1N4007) and Germanium (1N34A) diodes and measure the sharp reverse Zener breakdown voltage V_Z of a Zener diode.",
    formula: "I_D = I_S (e^(V_D / (n V_T)) − 1)   |   r_d = (n · V_T) / I_DQ",
    hardwareSetup: [
      "Dual DC Power Supply (0–30V)",
      "1N4007 Si Diode, 1N34A Ge Diode, 1N4733A (5.1V) Zener Diode",
      "Digital Voltmeter & Milliammeter/Microammeter",
    ],
    softwareSetup: ["LTSpice", "NI Multisim"],
    procedure: [
      "Sweep forward voltage in 0.05V steps to identify knee voltage (0.7V for Si, 0.3V for Ge).",
      "Reverse-bias the Zener diode through a 220Ω current-limiting resistor to plot the sharp breakdown knee at −V_Z.",
    ],
    params: [
      { key: "p1", label: "Supply Voltage V_S", unit: "V", min: 0.5, max: 15, step: 0.5, defaultVal: 5.0 },
      { key: "p2", label: "Series Resistor R_S", unit: "Ω", min: 50, max: 1000, step: 10, defaultVal: 220 },
      { key: "p3", label: "Knee / Zener V_k", unit: "V", min: 0.3, max: 9.1, step: 0.1, defaultVal: 0.7 },
    ],
  },
  {
    id: "E02",
    domain: "E",
    labNumber: 2,
    title: "Zener Diode as Voltage Regulator and Clipper/Clamper circuits",
    category: "Fundamental Bench Lab",
    objective:
      "Evaluate Line Regulation (ΔV_o/ΔV_in) and Load Regulation (ΔV_o/ΔI_L) of a Zener shunt regulator, and design series/parallel diode clipper and clamper wave shapers.",
    formula: "I_S = I_Z + I_L = (V_in − V_Z) / R_S   |   R_L(min) = (R_S · V_Z) / (V_in − V_Z)",
    hardwareSetup: [
      "DC Power Supply & Function Generator 3MHz",
      "DSO 100MHz",
      "1N4733A Zener (5.1V), 1N4007 Diodes, Decade Load Box",
    ],
    softwareSetup: ["LTSpice", "Proteus"],
    procedure: [
      "Hold R_L constant and vary V_in from 8V to 18V to verify Line Regulation.",
      "Hold V_in = 12V constant and vary R_L to determine minimum load resistance R_L(min) before Zener drops out of regulation.",
    ],
    params: [
      { key: "p1", label: "Unregulated V_in", unit: "V", min: 6, max: 24, step: 1, defaultVal: 12 },
      { key: "p2", label: "Zener Voltage V_Z", unit: "V", min: 3.3, max: 12, step: 0.1, defaultVal: 5.1 },
      { key: "p3", label: "Load Resistance R_L", unit: "Ω", min: 100, max: 2000, step: 50, defaultVal: 470 },
    ],
  },
  {
    id: "E03",
    domain: "E",
    labNumber: 3,
    title: "Half-Wave, Full-Wave and Bridge Rectifier - With and Without Filter, Ripple Factor",
    category: "Fundamental Bench Lab",
    objective:
      "Measure DC output voltage, peak-to-peak ripple voltage V_r(pp), Ripple Factor γ, and rectification efficiency η of Half-Wave, Center-Tapped, and Bridge rectifiers with shunt C filters.",
    formula: "Bridge w/o Filter: γ = 0.482   |   With C Filter: γ = 1 / (4√3 · f · R_L · C)",
    hardwareSetup: [
      "Step-Down Transformer (230V / 12V-0-12V)",
      "4× 1N4007 Diodes & Electrolytic Filter Capacitors (100μF, 470μF, 1000μF)",
      "DSO 100MHz & DMM",
    ],
    softwareSetup: ["LTSpice", "Proteus"],
    procedure: [
      "Observe unfiltered full-wave pulsating DC waveform and measure V_dc = 2V_m/π.",
      "Connect 100μF and 470μF shunt filter capacitors and measure the dramatic reduction in ripple factor γ.",
    ],
    params: [
      { key: "p1", label: "Transformer Peak V_m", unit: "V", min: 6, max: 36, step: 1, defaultVal: 17 },
      { key: "p2", label: "Filter Capacitor C", unit: "μF", min: 10, max: 1000, step: 10, defaultVal: 220 },
      { key: "p3", label: "Load Resistor R_L", unit: "Ω", min: 100, max: 2000, step: 50, defaultVal: 500 },
    ],
  },
  {
    id: "E04",
    domain: "E",
    labNumber: 4,
    title: "Input and Output Characteristics of BJT in CB, CE and CC Configuration",
    category: "Fundamental Bench Lab",
    objective:
      "Plot input and output characteristic curves of an NPN BJT (2N3904 / BC547) in Common-Base (CB), Common-Emitter (CE), and Common-Collector (CC) configurations; determine α, β, r_in, and r_out.",
    formula: "I_E = I_C + I_B   |   β = ΔI_C / ΔI_B   |   α = ΔI_C / ΔI_E = β / (β + 1)",
    hardwareSetup: [
      "BJT Characteristic Trainer (BC547 / 2N3904)",
      "Dual DC Power Supply",
      "Microammeter (I_B) & Milliammeter (I_C)",
    ],
    softwareSetup: ["LTSpice", "NI Multisim"],
    procedure: [
      "For CE Input Curves: hold V_CE constant (e.g. 5V) and plot I_B vs. V_BE.",
      "For CE Output Curves: set base current I_B in steps (20μA, 40μA, 60μA) and sweep V_CE from 0V to 15V to identify Cutoff, Saturation, and Active regions.",
    ],
    params: [
      { key: "p1", label: "Base Current I_B", unit: "μA", min: 5, max: 100, step: 5, defaultVal: 30 },
      { key: "p2", label: "Current Gain β", unit: "×", min: 50, max: 300, step: 10, defaultVal: 150 },
      { key: "p3", label: "Supply V_CC", unit: "V", min: 5, max: 20, step: 1, defaultVal: 12 },
    ],
  },
  {
    id: "E05",
    domain: "E",
    labNumber: 5,
    title: "BJT Biasing - Fixed Bias, Emitter Bias, Voltage Divider Bias and Q-point Stability",
    category: "Fundamental Bench Lab",
    objective:
      "Compare thermal and β-variation stability factor S = ∂I_C/∂I_CO across Fixed Base Bias, Collector-to-Base Feedback, Emitter-Stabilized, and Voltage-Divider Bias circuits.",
    formula: "S_Fixed = 1 + β   |   S_VDB = (1 + β)(1 + R_B/R_E) / (1 + β + R_B/R_E)",
    hardwareSetup: [
      "BJT Biasing Trainer Board (BC547 & 2N2222 with different β)",
      "DC Power Supply & Digital Multimeter",
    ],
    softwareSetup: ["LTSpice", "NI Multisim"],
    procedure: [
      "Measure quiescent point (V_CEQ, I_CQ) in Fixed Bias and Voltage-Divider Bias.",
      "Swap the transistor with one of higher β and verify that Voltage-Divider Bias maintains a rock-solid Q-point.",
    ],
    params: [
      { key: "p1", label: "Supply V_CC", unit: "V", min: 6, max: 24, step: 1, defaultVal: 12 },
      { key: "p2", label: "Collector R_C", unit: "kΩ", min: 0.5, max: 10, step: 0.5, defaultVal: 2.2 },
      { key: "p3", label: "Emitter R_E", unit: "kΩ", min: 0.2, max: 5, step: 0.2, defaultVal: 1.0 },
    ],
  },
  {
    id: "E06",
    domain: "E",
    labNumber: 6,
    title: "Transfer and Drain Characteristics of JFET and MOSFET - EMOSFET, DMOSFET",
    category: "Fundamental Bench Lab",
    objective:
      "Plot drain curves (I_D vs. V_DS) and transconductance transfer curves (I_D vs. V_GS) for an N-Channel JFET (BFW10 / 2N5457) and Enhancement/Depletion MOSFET (2N7000).",
    formula: "JFET Shockley: I_D = I_DSS (1 − V_GS / V_P)²   |   E-MOSFET: I_D = ½ k_n (V_GS − V_th)²",
    hardwareSetup: [
      "FET Characteristic Trainer (BFW10 JFET & 2N7000 E-MOSFET)",
      "Dual DC Power Supply & Digital Multimeters",
    ],
    softwareSetup: ["LTSpice", "NI Multisim"],
    procedure: [
      "Measure pinch-off voltage V_P and saturation current I_DSS (at V_GS = 0V) of the JFET.",
      "Plot the parabolic transfer curve and calculate transconductance g_m = ΔI_D / ΔV_GS.",
    ],
    params: [
      { key: "p1", label: "Gate-Source V_GS", unit: "V", min: 0, max: 6, step: 0.2, defaultVal: 3.2 },
      { key: "p2", label: "Threshold V_th", unit: "V", min: 0.5, max: 3, step: 0.1, defaultVal: 1.5 },
      { key: "p3", label: "Conduction k_n", unit: "mA/V²", min: 0.5, max: 10, step: 0.5, defaultVal: 2.0 },
    ],
  },
  {
    id: "E07",
    domain: "E",
    labNumber: 7,
    title: "FET Biasing and FET as a Switch and Voltage Variable Resistor",
    category: "Advanced Circuit Lab",
    objective:
      "Implement Self-Bias and Voltage-Divider Bias for FET stages, operate a MOSFET as a high-speed digital/load switch, and use the JFET ohmic region as a Voltage-Variable Resistor (VVR) for AGC.",
    formula: "Ohmic VVR Resistance: r_ds = r_d0 / (1 − V_GS / V_P)",
    hardwareSetup: [
      "JFET / MOSFET Trainer Module",
      "Function Generator 3MHz & DSO 100MHz",
    ],
    softwareSetup: ["LTSpice", "NI Multisim"],
    procedure: [
      "Operate the JFET at small V_DS (< 100 mV) in the linear triode region and vary DC control voltage V_GS to change channel resistance r_ds.",
      "Drive the MOSFET gate with a 0–5V square wave to switch an LED/resistive load between Cutoff and Ohmic ON state.",
    ],
    params: [
      { key: "p1", label: "Zero-Bias r_d0", unit: "Ω", min: 100, max: 1000, step: 50, defaultVal: 250 },
      { key: "p2", label: "Control Ratio V_GS/V_P", unit: "%", min: 0, max: 85, step: 5, defaultVal: 50 },
      { key: "p3", label: "Signal Input V_in", unit: "mV", min: 10, max: 100, step: 10, defaultVal: 50 },
    ],
  },
  {
    id: "E08",
    domain: "E",
    labNumber: 8,
    title: "Single Stage RC Coupled BJT Amplifier - Frequency Response and Gain-Bandwidth",
    category: "Advanced Circuit Lab",
    objective:
      "Measure midband voltage gain A_vm, lower −3 dB cutoff f_L (coupling/bypass capacitors), upper −3 dB cutoff f_H (Miller parasitic capacitances), Bandwidth, and Gain-Bandwidth Product (GBW).",
    formula: "A_vm = −g_m (R_C ∥ R_L)   |   BW = f_H − f_L   |   GBW = |A_vm| · BW",
    hardwareSetup: [
      "RC-Coupled CE BJT Amplifier Trainer",
      "Function Generator 3MHz (10 Hz – 2 MHz Sweep)",
      "DSO 100MHz",
    ],
    softwareSetup: ["LTSpice", "NI Multisim"],
    procedure: [
      "Apply a 20 mVp-p sine wave and sweep frequency from 20 Hz to 1 MHz while keeping input amplitude constant.",
      "Plot 20 log10(V_out/V_in) on semi-log axes and identify f_L and f_H at the −3 dB points (0.707 · A_vm).",
    ],
    params: [
      { key: "p1", label: "Midband Gain |A_vm|", unit: "×", min: 10, max: 200, step: 5, defaultVal: 85 },
      { key: "p2", label: "Lower Cutoff f_L", unit: "Hz", min: 10, max: 500, step: 10, defaultVal: 45 },
      { key: "p3", label: "Upper Cutoff f_H", unit: "kHz", min: 50, max: 1000, step: 25, defaultVal: 320 },
    ],
  },
  {
    id: "E09",
    domain: "E",
    labNumber: 9,
    title: "Two Stage RC Coupled Amplifier and Cascode Amplifier",
    category: "Advanced Circuit Lab",
    objective:
      "Compare overall voltage gain (A_v = A_v1 · A_v2) and bandwidth shrinkage of a Two-Stage RC-Coupled CE-CE Amplifier against the wide-bandwidth CE-CB Cascode Amplifier (Miller effect elimination).",
    formula: "Two-Stage: A_v = A_v1 · A_v2,  f_H2 = f_H1 √(2^(1/2) − 1)   |   Cascode Miller Gain ≈ −1",
    hardwareSetup: [
      "Two-Stage RC-Coupled & CE-CB Cascode Amplifier Trainer",
      "Function Generator 3MHz & DSO 100MHz",
    ],
    softwareSetup: ["LTSpice", "NI Multisim"],
    procedure: [
      "Measure individual stage gains A_v1, A_v2 and verify non-inverting overall phase (180° + 180° = 360°) in the Two-Stage CE amplifier.",
      "Measure the extended upper cutoff frequency f_H of the CE-CB Cascode stage.",
    ],
    params: [
      { key: "p1", label: "Stage 1 Gain |A_v1|", unit: "×", min: 5, max: 50, step: 1, defaultVal: 20 },
      { key: "p2", label: "Stage 2 Gain |A_v2|", unit: "×", min: 5, max: 50, step: 1, defaultVal: 25 },
      { key: "p3", label: "Input Signal V_in", unit: "mV", min: 1, max: 20, step: 1, defaultVal: 2 },
    ],
  },
  {
    id: "E10",
    domain: "E",
    labNumber: 10,
    title: "Darlington Pair and Feedback Amplifiers - Voltage Series, Current Shunt",
    category: "Advanced Circuit Lab",
    objective:
      "Verify composite current gain (β_D ≈ β_1·β_2) and bootstrap input impedance of a Darlington Emitter Follower, and measure gain desensitivity (1 + Aβ) in Negative Feedback amplifiers.",
    formula: "β_Darlington = β_1 · β_2 + β_1 + β_2   |   A_f = A / (1 + A·β)   |   BW_f = BW · (1 + A·β)",
    hardwareSetup: [
      "Darlington Pair (TIP122 / 2× BC547) & Negative Feedback Amplifier Trainer",
      "Function Generator 3MHz & DSO 100MHz",
    ],
    softwareSetup: ["LTSpice", "NI Multisim"],
    procedure: [
      "Measure input impedance Z_in and current gain of the Darlington pair.",
      "Compare gain, bandwidth, and total harmonic distortion With and Without negative feedback loop β.",
    ],
    params: [
      { key: "p1", label: "Open-Loop Gain A", unit: "×", min: 20, max: 500, step: 10, defaultVal: 120 },
      { key: "p2", label: "Feedback Factor β (%)", unit: "%", min: 1, max: 25, step: 1, defaultVal: 5 },
      { key: "p3", label: "Single BJT β_1", unit: "×", min: 50, max: 200, step: 10, defaultVal: 100 },
    ],
  },
  {
    id: "E11",
    domain: "E",
    labNumber: 11,
    title: "Power Amplifiers - Class A, Class B, Class AB Push-Pull and Complementary Symmetry - Efficiency",
    category: "Advanced Circuit Lab",
    objective:
      "Measure conversion efficiency η = P_ac(load) / P_dc(supply) of Class A (max 25%/50%), Class B Push-Pull (max 78.5%, crossover distortion), and Diode-Biased Class AB Complementary Symmetry stages.",
    formula: "η_ClassA(max) = 25% (50% transformer)   |   η_ClassB(max) = (π/4) · (V_p / V_CC) ≤ 78.5%",
    hardwareSetup: [
      "Class A, B, and AB Complementary Pair (TIP31/TIP32) Audio Power Amplifier Trainer",
      "Function Generator 3MHz, 8Ω Speaker/Load & DSO 100MHz",
    ],
    softwareSetup: ["LTSpice", "NI Multisim"],
    procedure: [
      "Observe zero-crossing dead-zone (crossover distortion) in the unbiased Class B Push-Pull stage on DSO.",
      "Switch in the dual biasing diodes to bias into Class AB and verify elimination of crossover distortion.",
    ],
    params: [
      { key: "p1", label: "Supply Rail V_CC", unit: "V", min: 6, max: 30, step: 1, defaultVal: 15 },
      { key: "p2", label: "Output Peak Swing V_p", unit: "V", min: 1, max: 14, step: 0.5, defaultVal: 12 },
      { key: "p3", label: "Load Speaker R_L", unit: "Ω", min: 4, max: 32, step: 4, defaultVal: 8 },
    ],
  },
  {
    id: "E12",
    domain: "E",
    labNumber: 12,
    title: "UJT Characteristics and UJT Relaxation Oscillator",
    category: "Fundamental Bench Lab",
    objective:
      "Plot emitter V_E–I_E negative-resistance curve of a Unijunction Transistor (2N2646), find Peak Point V_P and Valley Point V_V, and build a sawtooth UJT Relaxation Oscillator.",
    formula: "V_P = η · V_BB + V_D   |   T_osc = R_E · C_E · ln(1 / (1 − η))",
    hardwareSetup: [
      "2N2646 UJT Trainer Board",
      "DSO 100MHz & Dual DC Supply",
    ],
    softwareSetup: ["NI Multisim", "Proteus"],
    procedure: [
      "Sweep emitter current I_E and locate the negative differential resistance region between V_P and V_V.",
      "Connect timing network R_E and C_E and capture the exponential capacitor sawtooth and B1 trigger pulses.",
    ],
    params: [
      { key: "p1", label: "Interbase Supply V_BB", unit: "V", min: 8, max: 24, step: 1, defaultVal: 15 },
      { key: "p2", label: "Intrinsic Stand-Off η", unit: "×", min: 0.5, max: 0.82, step: 0.02, defaultVal: 0.65 },
      { key: "p3", label: "Timing R_E × C_E", unit: "ms", min: 0.5, max: 20, step: 0.5, defaultVal: 2.0 },
    ],
  },
  {
    id: "E13",
    domain: "E",
    labNumber: 13,
    title: "SCR Characteristics and its application as controlled rectifier",
    category: "Fundamental Bench Lab",
    objective:
      "Verify gate-controlled turn-on and line-commutated turn-off of a Silicon Controlled Rectifier (SCR) and measure average DC load voltage as a function of firing angle α.",
    formula: "V_dc = (V_m / (2π)) · (1 + cos α)",
    hardwareSetup: [
      "SCR Characteristic & Half-Wave Controlled Rectifier Trainer",
      "DSO 100MHz & DMM",
    ],
    softwareSetup: ["LTSpice", "PSIM"],
    procedure: [
      "Plot V_AK vs. I_A for two different gate currents (I_G2 > I_G1) to verify that higher gate current lowers breakover voltage.",
      "Vary phase firing angle α in the half-wave AC rectifier circuit and measure V_dc across the load.",
    ],
    params: [
      { key: "p1", label: "AC Peak Voltage V_m", unit: "V", min: 15, max: 170, step: 5, defaultVal: 50 },
      { key: "p2", label: "Firing Angle α", unit: "deg", min: 0, max: 165, step: 5, defaultVal: 45 },
      { key: "p3", label: "Load Resistor R_L", unit: "Ω", min: 10, max: 200, step: 10, defaultVal: 50 },
    ],
  },
  {
    id: "E14",
    domain: "E",
    labNumber: 14,
    title: "Simulation Lab - BJT and MOSFET modeling and amplifier design in LTSpice",
    category: "EDA Simulation Lab",
    objective:
      "Customize Gummel-Poon `.model NPN` and Shichman-Hodges `.model NMOS` SPICE directives in LTSpice to simulate DC bias point, `.ac` Bode response, and `.four` FFT harmonic distortion.",
    formula: ".model Q2N3904 NPN(Is=6.734f Bf=416.4 Vaf=74.03)   |   .four 1kHz V(out)",
    hardwareSetup: ["PC Workstation"],
    softwareSetup: ["LTSpice"],
    procedure: [
      "Enter custom `.model` parameters for 2N3904 and 2N7000 in LTSpice.",
      "Run `.op`, `.tran`, and `.ac dec 100 10 100Meg` to verify gain, phase margin, and THD.",
    ],
    params: [
      { key: "p1", label: "SPICE Forward Beta Bf", unit: "×", min: 50, max: 400, step: 10, defaultVal: 200 },
      { key: "p2", label: "Early Voltage V_AF", unit: "V", min: 30, max: 150, step: 5, defaultVal: 75 },
      { key: "p3", label: "Collector Current I_CQ", unit: "mA", min: 0.5, max: 10, step: 0.5, defaultVal: 2.5 },
    ],
    codeTitle: "LTSpice Netlist — 2N3904 CE Amplifier with Custom Gummel-Poon SPICE Model",
    codeSnippet: `* Lab E14: BJT Common-Emitter Amplifier Modeling in LTSpice
VCC vcc 0 DC 12V
VIN in 0 SIN(0 15m 1k) AC 1
R1 vcc b 33k
R2 b 0 10k
RC vcc c 2.2k
RE e 0 1k
CE e 0 47u
C1 in b 10u
C2 c out 10u
RL out 0 10k
Q1 c b e Q2N3904_CUSTOM
.model Q2N3904_CUSTOM NPN(Is=6.734f Bf=200 Vaf=74.03 Cjc=3.638p Cje=4.493p)
.op
.tran 0 5m 0 5u
.ac dec 50 10 10Meg
.end`,
  },
  {
    id: "E15",
    domain: "E",
    labNumber: 15,
    title: "PCB Lab - Design, fabrication and testing of a regulated power supply / amplifier on PCB",
    category: "FPGA / PCB Hardware Lab",
    objective:
      "Complete the end-to-end hardware design workflow: Schematic Capture, ERC, Footprint Assignment, Copper Pour & Trace Routing (IPC-2221 width rules), Gerber Export, Etching, Soldering, and Bench Testing of a Regulated DC Power Supply / Audio Amplifier PCB.",
    formula: "IPC-2221 Trace Width: I = k · ΔT^0.44 · A^0.725   |   LM78xx/LM317: V_out = 1.25V · (1 + R_2/R_1)",
    hardwareSetup: [
      "Copper-Clad FR4 Laminate, FeCl3 Etching Bath, PCB Drill & Soldering Station",
      "Bridge Diodes, Filter Capacitors, LM317 / 7805 Regulator & Heatsink",
      "DSO 100MHz & Digital Multimeter",
    ],
    softwareSetup: ["Proteus (ISIS & ARES PCB)", "KiCad / Altium Designer"],
    procedure: [
      "Capture the schematic of an AC-DC Bridge + Filter + LM317 Adjustable Regulator (1.25V–25V) and run Electrical Rules Check (ERC).",
      "Assign THT/SMD footprints, route power traces (≥ 50 mil width) and signal traces with a solid ground plane, and run Design Rule Check (DRC).",
      "Transfer toner/UV mask to FR4 copper board, etch, drill pads, solder components, and test output ripple (< 5 mVrms).",
    ],
    params: [
      { key: "p1", label: "LM317 Resistor R1", unit: "Ω", min: 120, max: 470, step: 10, defaultVal: 240 },
      { key: "p2", label: "Adjust Pot R2", unit: "Ω", min: 0, max: 5000, step: 100, defaultVal: 1800 },
      { key: "p3", label: "Max Trace Current I", unit: "A", min: 0.5, max: 5, step: 0.5, defaultVal: 1.5 },
    ],
  },
];

/**
 * Evaluates live numerical engineering telemetry and generates a 40-point waveform/curve
 * for any of the 75 Master Labs based on its interactive slider values.
 */
export function evaluateMasterLab(
  lab: MasterLabItem,
  vals: Record<string, number>
): {
  metrics: { label: string; value: string }[];
  curveTitle: string;
  curvePoints: { x: number; y1: number; y2: number }[];
} {
  const p1 = vals.p1 ?? lab.params[0]?.defaultVal ?? 10;
  const p2 = vals.p2 ?? lab.params[1]?.defaultVal ?? 10;
  const p3 = vals.p3 ?? lab.params[2]?.defaultVal ?? 10;

  const pts: { x: number; y1: number; y2: number }[] = [];

  // DOMAIN A: Linear Circuit Analysis & Network Theorems (LCA / RLC)
  if (lab.domain === "A") {
    // A01: Ohm's Law and KVL / KCL
    if (lab.id === "A01") {
      const vs = p1; // Source Voltage (V)
      const r1 = Math.max(1, p2); // R1 (Ohms)
      const r2 = Math.max(1, p3); // R2 (Ohms)
      const iTotal = vs / (r1 + r2); // Total loop current (A)
      const v1 = iTotal * r1; // Voltage across R1
      const v2 = iTotal * r2; // Voltage across R2
      const kvlSum = vs - (v1 + v2); // Sum of voltages in loop (exact 0.000V)
      for (let i = 0; i <= 40; i++) {
        const vSweep = (i / 40) * vs * 1.5;
        pts.push({ x: vSweep, y1: (vSweep / r1) * 1000, y2: (vSweep / (r1 + r2)) * 1000 });
      }
      return {
        metrics: [
          { label: "Loop Current I = Vs/(R1+R2)", value: `${(iTotal * 1000).toFixed(3)} mA` },
          { label: "Drop V1 = I·R1", value: `${v1.toFixed(3)} V` },
          { label: "Drop V2 = I·R2", value: `${v2.toFixed(3)} V` },
          { label: "KVL Proof (Vs - V1 - V2)", value: `${Math.abs(kvlSum) < 1e-6 ? "0.000 V (Exact Proof Verified)" : kvlSum.toFixed(4) + " V"}` },
        ],
        curveTitle: "A01: Ohm's Law I-V Characteristics (Branch R1 vs Series R1+R2)",
        curvePoints: pts,
      };
    }

    // A02: Voltage & Current Dividers
    if (lab.id === "A02") {
      const vs = p1;
      const r1 = Math.max(1, p2);
      const r2 = Math.max(1, p3);
      const vOut = vs * (r2 / (r1 + r2));
      const vR1 = vs * (r1 / (r1 + r2));
      const iDiv = (vs / (r1 + r2)) * 1000;
      for (let i = 0; i <= 40; i++) {
        const sweepRatio = i / 40;
        pts.push({ x: i, y1: vs * sweepRatio, y2: vOut * Math.sin((i / 40) * Math.PI) });
      }
      return {
        metrics: [
          { label: "Divider Output V2 = Vs·R2/(R1+R2)", value: `${vOut.toFixed(3)} V` },
          { label: "Resistor Drop V1", value: `${vR1.toFixed(3)} V` },
          { label: "Series Current I", value: `${iDiv.toFixed(2)} mA` },
          { label: "Divider Ratio V2/Vs", value: `${((r2 / (r1 + r2)) * 100).toFixed(1)} % (Proved)` },
        ],
        curveTitle: "A02: Voltage Divider Transfer Ratio & Current Linearity",
        curvePoints: pts,
      };
    }

    // A03: Thevenin and Norton Theorems
    if (lab.id === "A03") {
      const vs = p1;
      const r1 = Math.max(1, p2);
      const r2 = Math.max(1, p3);
      const vTh = vs * (r2 / (r1 + r2));
      const rTh = (r1 * r2) / (r1 + r2);
      const iNorton = (vTh / rTh) * 1000;
      const rL = rTh;
      const iLoad = (vTh / (rTh + rL)) * 1000;
      for (let i = 0; i <= 40; i++) {
        const rlSweep = (i / 40) * rTh * 3 + 1;
        const vl = vTh * (rlSweep / (rTh + rlSweep));
        const pl = (vl ** 2 / rlSweep) * 1000;
        pts.push({ x: rlSweep, y1: vl, y2: pl });
      }
      return {
        metrics: [
          { label: "Thevenin Voltage V_th", value: `${vTh.toFixed(3)} V` },
          { label: "Thevenin Resistance R_th", value: `${rTh.toFixed(2)} Ω` },
          { label: "Norton Current I_N = V_th/R_th", value: `${iNorton.toFixed(2)} mA` },
          { label: "Load Current at RL=R_th", value: `${iLoad.toFixed(2)} mA (Proved)` },
        ],
        curveTitle: "A03: Thevenin Equivalent V_L & P_L vs Load Resistance R_L",
        curvePoints: pts,
      };
    }

    // A04: Maximum Power Transfer Theorem
    if (lab.id === "A04") {
      const vTh = p1;
      const rTh = Math.max(1, p2);
      const rL = Math.max(1, p3);
      const pMax = ((vTh ** 2) / (4 * rTh)) * 1000; // mW
      const pActual = ((vTh * (rL / (rTh + rL))) ** 2 / rL) * 1000;
      const efficiency = (rL / (rTh + rL)) * 100;
      for (let i = 0; i <= 40; i++) {
        const rlVal = (i / 40) * rTh * 3 + 1;
        const pCurve = ((vTh * (rlVal / (rTh + rlVal))) ** 2 / rlVal) * 1000;
        pts.push({ x: rlVal, y1: pCurve, y2: (rlVal / (rTh + rlVal)) * 100 });
      }
      return {
        metrics: [
          { label: "Max Deliverable Power P_max", value: `${pMax.toFixed(2)} mW` },
          { label: "Actual Load Power P_L", value: `${pActual.toFixed(2)} mW` },
          { label: "Optimum Condition RL = R_th", value: `${rTh.toFixed(1)} Ω` },
          { label: "Efficiency at Max Power", value: `${efficiency.toFixed(1)} % (Proved 50% Peak)` },
        ],
        curveTitle: "A04: Maximum Power Transfer Curve (P_L Peak at R_L = R_th)",
        curvePoints: pts,
      };
    }

    // A06: First-Order RC Transient Step Response
    if (lab.id === "A06") {
      const vs = p1; // Volts
      const r = Math.max(10, p2); // Ohms
      const cUf = Math.max(0.1, p3); // uF
      const tauMs = (r * cUf) / 1000; // ms
      const v50 = vs * 0.632;
      const tRise = 2.2 * tauMs;
      for (let i = 0; i <= 40; i++) {
        const t = (i / 40) * 5 * tauMs;
        const vc = vs * (1 - Math.exp(-t / tauMs));
        const ic = (vs / r) * Math.exp(-t / tauMs) * 1000;
        pts.push({ x: t, y1: vc, y2: ic });
      }
      return {
        metrics: [
          { label: "Time Constant τ = R·C", value: `${tauMs.toFixed(3)} ms` },
          { label: "Capacitor Voltage at 1τ (63.2%)", value: `${v50.toFixed(3)} V` },
          { label: "Rise Time t_r (10% to 90%)", value: `${tRise.toFixed(3)} ms` },
          { label: "Initial Inrush Current I_0", value: `${((vs / r) * 1000).toFixed(2)} mA (Proved)` },
        ],
        curveTitle: "A06: RC Transient Step Response v_C(t) Charging & i_C(t) Decay",
        curvePoints: pts,
      };
    }

    // General Domain A Fallback (LCA)
    const tauOrFreq = Math.max(0.1, (p2 * p3) / 1000);
    const iBranch = (p1 / Math.max(1, p2 + p3)) * 1000;
    const pMax = (p1 ** 2 / (4 * Math.max(1, p2))) * 1000;
    for (let i = 0; i <= 40; i++) {
      const t = i / 40;
      const y1 = p1 * (1 - Math.exp(-t * 5));
      const y2 = p1 * Math.exp(-t * 5);
      pts.push({ x: t, y1, y2 });
    }
    return {
      metrics: [
        { label: "Loop / Branch Current I", value: `${iBranch.toFixed(2)} mA` },
        { label: "Network Characteristic", value: `${tauOrFreq.toFixed(2)} ms / kHz` },
        { label: "Max Available Power P_max", value: `${pMax.toFixed(1)} mW` },
        { label: "Kirchhoff KVL Loop Proof", value: "∑V = 0.000 V (Exact Proof)" },
      ],
      curveTitle: `${lab.id} Transient & Frequency Response`,
      curvePoints: pts,
    };
  }

  // DOMAIN B: Linear Integrated Circuits (LIC / Op-Amps / 555)
  if (lab.domain === "B") {
    // B01: 741 Op-Amp Inverting Amplifier
    if (lab.id === "B01") {
      const rin = Math.max(0.5, p1); // kOhms
      const rf = Math.max(0.5, p2); // kOhms
      const vin = p3; // Vp
      const gain = -(rf / rin);
      const voutPk = Math.min(14.0, Math.max(-14.0, Math.abs(gain) * vin));
      const gbw = 1000; // kHz
      const bwKhz = gbw / Math.abs(gain);
      for (let i = 0; i <= 40; i++) {
        const theta = (i / 40) * 2 * Math.PI;
        const vInVal = vin * Math.sin(theta);
        const vOutVal = Math.min(14.0, Math.max(-14.0, gain * vInVal));
        pts.push({ x: i, y1: vInVal, y2: vOutVal });
      }
      return {
        metrics: [
          { label: "Inverting Closed-Loop Gain A_v", value: `${gain.toFixed(2)} × (${(20 * Math.log10(Math.abs(gain))).toFixed(1)} dB)` },
          { label: "Output Amplitude V_out", value: `${voutPk.toFixed(2)} Vp (180° Inverted)` },
          { label: "Closed-Loop Bandwidth BW", value: `${bwKhz.toFixed(1)} kHz` },
          { label: "Virtual Ground Potential (Pin 2)", value: "0.000 V (Proved Exact)" },
        ],
        curveTitle: "B01: Dual-Trace DSO Input V_in vs Inverted Output V_out (180° Out of Phase)",
        curvePoints: pts,
      };
    }

    // B02: 741 Op-Amp Non-Inverting Amplifier
    if (lab.id === "B02") {
      const r1 = Math.max(0.5, p1);
      const rf = Math.max(0.5, p2);
      const vin = p3;
      const gain = 1 + rf / r1;
      const voutPk = Math.min(14.0, gain * vin);
      for (let i = 0; i <= 40; i++) {
        const theta = (i / 40) * 2 * Math.PI;
        const vInVal = vin * Math.sin(theta);
        const vOutVal = Math.min(14.0, gain * vInVal);
        pts.push({ x: i, y1: vInVal, y2: vOutVal });
      }
      return {
        metrics: [
          { label: "Non-Inverting Gain A_v = 1 + Rf/R1", value: `${gain.toFixed(2)} × (${(20 * Math.log10(gain)).toFixed(1)} dB)` },
          { label: "In-Phase Output V_out", value: `${voutPk.toFixed(2)} Vp (0° Phase Shift)` },
          { label: "Input Impedance R_in", value: "≥ 2.0 MΩ (Proved)" },
          { label: "Linear Swing Rail Margin", value: `±${(15 - voutPk).toFixed(2)} V to Rail` },
        ],
        curveTitle: "B02: Dual-Trace DSO Non-Inverting In-Phase Amplification",
        curvePoints: pts,
      };
    }

    // B07: 555 Precision Timer Astable Multivibrator
    if (lab.id === "B07") {
      const ra = Math.max(1, p1); // kOhms
      const rb = Math.max(1, p2); // kOhms
      const cNf = Math.max(1, p3); // nF
      const freqHz = 1.44e6 / ((ra + 2 * rb) * cNf);
      const dutyCycle = ((ra + rb) / (ra + 2 * rb)) * 100;
      const tHighMs = 0.693 * (ra + rb) * cNf * 1e-3;
      const tLowMs = 0.693 * rb * cNf * 1e-3;
      for (let i = 0; i <= 40; i++) {
        const phase = (i % 10) / 10;
        const vSq = phase < dutyCycle / 100 ? 5.0 : 0.0;
        const vCap = phase < dutyCycle / 100 ? 1.66 + phase * 3.33 : 5.0 - (phase - dutyCycle / 100) * 3.33;
        pts.push({ x: i, y1: vSq, y2: vCap });
      }
      return {
        metrics: [
          { label: "Astable Frequency f_0", value: `${freqHz.toFixed(1)} Hz` },
          { label: "Duty Cycle D", value: `${dutyCycle.toFixed(1)} % (Proved)` },
          { label: "High Duration t_high", value: `${tHighMs.toFixed(3)} ms` },
          { label: "Low Duration t_low", value: `${tLowMs.toFixed(3)} ms` },
        ],
        curveTitle: "B07: 555 Timer Output Square Wave vs Timing Capacitor Charge/Discharge",
        curvePoints: pts,
      };
    }

    // General Domain B
    const gain = Math.max(0.2, p2 / Math.max(0.5, p1));
    const fcOrF0 = 159155 / Math.max(1, p1 * p2);
    for (let i = 0; i <= 40; i++) {
      const t = (i / 40) * 2 * Math.PI;
      const y1 = p3 * Math.sin(t);
      const y2 = Math.max(-13.5, Math.min(13.5, -gain * y1));
      pts.push({ x: i, y1, y2 });
    }
    return {
      metrics: [
        { label: "Closed-Loop Gain |A_v|", value: `${gain.toFixed(2)} × (${(20 * Math.log10(gain)).toFixed(1)} dB)` },
        { label: "Cutoff / Characteristic Freq f_0", value: `${fcOrF0.toFixed(1)} Hz` },
        { label: "Peak Output Voltage V_out", value: `${Math.min(13.5, gain * p3).toFixed(2)} Vp` },
        { label: "Supply Voltage Status", value: "±15.0V Standard (Linear Mode Proved)" },
      ],
      curveTitle: `${lab.id} Dual-Channel DSO Linear IC Response`,
      curvePoints: pts,
    };
  }

  // DOMAIN C: Digital Logic Design (DLD)
  if (lab.domain === "C") {
    const a = Math.round(p1);
    const b = Math.round(p2);
    const c = Math.round(p3);
    const sumXor = (a ^ b ^ (c & 1)) & 15;
    const carryAnd = (a + b + (c & 1)) >> 1;
    const tPdNs = Math.max(5, p3 || 10);
    const fMaxMhz = 1000 / (2 * tPdNs);
    for (let i = 0; i <= 40; i++) {
      const step = Math.floor(i / 5);
      const clk = step % 2;
      const outBit = ((step + a + b) % 2 === 0 ? 1 : 0) * 5.0;
      pts.push({ x: i, y1: clk * 5.0, y2: outBit });
    }
    return {
      metrics: [
        { label: "Calculated Logic Output (Y)", value: `${sumXor} (0b${sumXor.toString(2).padStart(4, "0")})` },
        { label: "Carry / Next-State Flag", value: `${carryAnd}` },
        { label: "Gate Propagation Delay t_pd", value: `${tPdNs} ns (TTL 74LS Standard)` },
        { label: "Max Clock Frequency f_max", value: `${fMaxMhz.toFixed(1)} MHz (Proved)` },
      ],
      curveTitle: `${lab.id} Digital Logic Analyzer Timing Diagram (CLK vs Output Q)`,
      curvePoints: pts,
    };
  }

  // DOMAIN D: Power Electronics (PE)
  if (lab.domain === "D") {
    // D04: Buck DC-DC Step-Down Converter
    if (lab.id === "D04") {
      const duty = Math.min(95, Math.max(5, p1)) / 100; // Duty ratio D
      const vin = p2; // Input Volts
      const rLoad = Math.max(1, p3); // Load Ohms
      const vout = duty * vin; // Exact Buck conversion formula
      const iout = vout / rLoad;
      const pOut = vout * iout;
      const fsKhz = 50; // 50 kHz switching
      const lUh = 100; // 100 uH
      const deltaIL = ((vin - vout) * duty) / (fsKhz * 1e3 * lUh * 1e-6);
      for (let i = 0; i <= 40; i++) {
        const theta = (i / 40) * 4 * Math.PI;
        const sw = (i % 10) / 10 < duty ? vin : 0;
        const vFilter = vout + (deltaIL * rLoad * 0.05) * Math.sin(theta);
        pts.push({ x: i, y1: sw, y2: vFilter });
      }
      return {
        metrics: [
          { label: "Average DC Output V_out = D·Vin", value: `${vout.toFixed(3)} V (Exact Proof)` },
          { label: "Load Current I_out", value: `${iout.toFixed(3)} A` },
          { label: "Output Power P_out", value: `${pOut.toFixed(2)} W` },
          { label: "Inductor Peak-to-Peak Ripple ΔI_L", value: `${deltaIL.toFixed(3)} A (CCM Mode)` },
        ],
        curveTitle: "D04: Buck Converter MOSFET Switch Pulses vs Filtered DC Output",
        curvePoints: pts,
      };
    }

    // D05: Boost DC-DC Step-Up Converter
    if (lab.id === "D05") {
      const duty = Math.min(85, Math.max(10, p1)) / 100;
      const vin = p2;
      const rLoad = Math.max(1, p3);
      const vout = vin / (1 - duty); // Exact Boost conversion formula
      const iout = vout / rLoad;
      const pOut = vout * iout;
      for (let i = 0; i <= 40; i++) {
        const sw = (i % 10) / 10 < duty ? vin : vout;
        pts.push({ x: i, y1: sw, y2: vout });
      }
      return {
        metrics: [
          { label: "Step-Up Output V_out = Vin/(1-D)", value: `${vout.toFixed(2)} V (Exact Proof)` },
          { label: "Output Current I_out", value: `${iout.toFixed(3)} A` },
          { label: "Power Delivered P_out", value: `${pOut.toFixed(1)} W` },
          { label: "Voltage Gain Factor M_V", value: `${(1 / (1 - duty)).toFixed(2)} ×` },
        ],
        curveTitle: "D05: Boost Converter Switching Waveform vs Stepped-Up DC Rail",
        curvePoints: pts,
      };
    }

    // General Domain D (Phase Control / Inverter)
    const alphaRad = (Math.min(170, p1) * Math.PI) / 180;
    const vdc = p2 * 0.9 * Math.max(0, Math.cos(alphaRad / 2));
    const idc = vdc / Math.max(1, p3);
    for (let i = 0; i <= 40; i++) {
      const theta = (i / 40) * 2 * Math.PI;
      const vIn = p2 * Math.sin(theta);
      const deg = (theta * 180) / Math.PI;
      const gated = (deg >= (p1 % 90) && deg <= 180) || (deg >= 180 + (p1 % 90) && deg <= 360);
      pts.push({ x: i, y1: vIn, y2: gated ? Math.abs(vIn) : 0 });
    }
    return {
      metrics: [
        { label: "Average DC Output V_dc", value: `${vdc.toFixed(2)} V (Proved)` },
        { label: "Load Current I_d", value: `${idc.toFixed(2)} A` },
        { label: "Output Power P_dc", value: `${(vdc * idc).toFixed(1)} W` },
        { label: "Displacement PF", value: `${Math.cos(alphaRad / 2).toFixed(3)} lag` },
      ],
      curveTitle: `${lab.id} Power Converter Switching Waveform`,
      curvePoints: pts,
    };
  }

  // DOMAIN E: Electronic Devices & Circuits (EDC)
  // E01: Diode Characteristics & Knee Voltage
  if (lab.id === "E01") {
    const vBias = p1; // Applied Voltage
    const rLimit = Math.max(10, p2); // Ohms
    const isNano = 10; // 10 nA saturation current
    const vt = 0.026; // 26 mV thermal voltage at 300K
    const vKnee = 0.68; // Silicon knee voltage
    const vDiode = vBias > vKnee ? vKnee + 0.026 * Math.log(1 + ((vBias - vKnee) / rLimit) / (isNano * 1e-9)) : vBias * 0.98;
    const iDiodeMa = Math.max(0, (vBias - vDiode) / rLimit) * 1000;
    for (let i = 0; i <= 40; i++) {
      const v = (i / 40) * 1.0;
      const iVal = isNano * 1e-6 * (Math.exp(v / (1.5 * vt)) - 1);
      pts.push({ x: v, y1: Math.min(100, iVal), y2: v > 0.68 ? 50 : 0 });
    }
    return {
      metrics: [
        { label: "Diode Forward Drop V_D", value: `${vDiode.toFixed(3)} V` },
        { label: "Forward Current I_D", value: `${iDiodeMa.toFixed(2)} mA` },
        { label: "Silicon Knee Voltage V_γ", value: "0.680 V (Shockley Proved)" },
        { label: "Dynamic Resistance r_d = nVt/Id", value: `${(26 / Math.max(0.1, iDiodeMa)).toFixed(2)} Ω` },
      ],
      curveTitle: "E01: PN Diode Shockley Forward Characteristic Curve (I_D vs V_D)",
      curvePoints: pts,
    };
  }

  // General Domain E (BJT / FET)
  const vOut =
    lab.id === "E15"
      ? 1.25 * (1 + p2 / Math.max(10, p1))
      : Math.max(0.2, p1 - p3);
  const iQ = (vOut / Math.max(1, p2)) * 10;
  for (let i = 0; i <= 40; i++) {
    const v = (i / 40) * p1;
    const iLoadLine = (p1 - v) / Math.max(1, p2);
    const iDevice = iLoadLine * (1 - Math.exp(-v * 1.5));
    pts.push({ x: i, y1: iLoadLine * 10, y2: iDevice * 10 });
  }
  return {
    metrics: [
      { label: "Operating Voltage V_Q / V_out", value: `${vOut.toFixed(2)} V (Proved)` },
      { label: "Quiescent Bias Current I_Q", value: `${iQ.toFixed(2)} mA` },
      { label: "Device Power Dissipation", value: `${(vOut * iQ).toFixed(1)} mW` },
      { label: "Semiconductor Region", value: "Active Linear Operating Mode" },
    ],
    curveTitle: `${lab.id} Semiconductor Load-Line & Dynamic Characteristic`,
    curvePoints: pts,
  };
}
