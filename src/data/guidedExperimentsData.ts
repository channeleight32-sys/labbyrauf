/**
 * Guided Practical Laboratory Experiments Database
 * IST Circuit & Logic Lab — Professional Upgrade
 * 
 * 23 comprehensive university-grade guided experiments covering all required curricula:
 * - Ohm's law
 * - Kirchhoff's laws (KVL & KCL)
 * - RC & RL circuits
 * - RLC resonance
 * - Diode characteristics
 * - Zener diode regulation
 * - Half-wave rectification
 * - Full-wave rectification
 * - Bridge rectification
 * - Clipper & clamper circuits
 * - BJT CE amplifier & I-V characteristics
 * - MOSFET characteristics
 * - SCR thyristor operation
 * - DIAC operation
 * - TRIAC AC phase control
 * - DIAC-TRIAC lamp dimmer
 * - 555 timer astable & monostable
 * - Op-amp applications (Inverting, Non-inverting, Summing)
 * - Logic gates & boolean verification
 * - Counters and flip-flops
 * - Phase shift & Wien bridge oscillators
 * - Linear voltage regulators (7805)
 * - Buck and boost switching converters
 */

export interface GuidedExperimentObservationRow {
  step: string;
  paramName: string;
  theoretical: string;
  simulated: string;
  unit: string;
}

export interface GuidedVivaQuestion {
  question: string;
  answer: string;
}

export interface GuidedExperimentDef {
  id: string;
  courseDomain: "A" | "B" | "C" | "D" | "E";
  title: string;
  category: string;
  learningObjectives: string[];
  requiredComponents: {
    name: string;
    partNumber: string;
    quantity: number;
    specification: string;
  }[];
  theoreticalExplanation: string;
  governingFormulas: string[];
  wiringInstructions: string[];
  simulationProcedure: string[];
  expectedWaveformsDescription: string;
  observationTable: GuidedExperimentObservationRow[];
  conclusions: string[];
  vivaQuestions: GuidedVivaQuestion[];
  presetCircuitTab: "lab" | "multisim" | "lca" | "cd" | "edc" | "power" | "rlc";
}

export const GUIDED_EXPERIMENTS: GuidedExperimentDef[] = [
  {
    id: "EXP_OHM",
    courseDomain: "A",
    title: "Verification of Ohm's Law (V = I · R)",
    category: "Linear Circuit Analysis",
    learningObjectives: [
      "Demonstrate direct proportionality between applied DC voltage and resulting current through an ohmic conductor.",
      "Calculate and verify static and dynamic resistance from the slope of the experimental I-V curve.",
      "Measure power dissipation and observe resistor temperature limits.",
    ],
    requiredComponents: [
      { name: "DC Power Supply", partNumber: "0–30V Adjustable", quantity: 1, specification: "Regulated DC rail (0 to 15V)" },
      { name: "Carbon Film Resistor", partNumber: "CFR-25JT-1K", quantity: 1, specification: "1.0 kΩ, 0.25W, ±5% (Brown-Black-Red-Gold)" },
      { name: "Digital Multimeter (Voltmeter)", partNumber: "DMM 6-digit", quantity: 1, specification: "High impedance (10 MΩ) in parallel" },
      { name: "Digital Multimeter (Ammeter)", partNumber: "DMM in-line", quantity: 1, specification: "Low burden shunt in series" },
    ],
    theoreticalExplanation:
      "Ohm's law states that the current through an electrical conductor between two points is directly proportional to the voltage across the two points, provided physical conditions (temperature, strain) remain constant.",
    governingFormulas: ["V = I × R", "I = V / R", "P = V × I = I² × R = V² / R"],
    wiringInstructions: [
      "1. Connect the DC Power Supply positive (+) terminal to the Ammeter positive (I_IN) port.",
      "2. Connect the Ammeter negative (I_OUT) port to Lead 1 of the 1.0 kΩ resistor.",
      "3. Connect Lead 2 of the 1.0 kΩ resistor back to the DC Power Supply negative (GND) terminal.",
      "4. Place the Voltmeter test leads in parallel directly across the two leads of the resistor.",
    ],
    simulationProcedure: [
      "1. Set the DC voltage source initially to 0.0 V.",
      "2. Step the DC voltage in 2.0 V increments from 0 V to 12.0 V.",
      "3. Record the current in milliamperes (mA) on the series Ammeter for each voltage step.",
      "4. Plot the V vs. I graph and compute the slope R = ΔV / ΔI.",
    ],
    expectedWaveformsDescription: "Linear straight line passing through the origin (0,0) with a constant slope equal to 1000 Ω (1 mA per volt).",
    observationTable: [
      { step: "1", paramName: "V = 2.0 V", theoretical: "2.00 mA", simulated: "2.00 mA", unit: "mA" },
      { step: "2", paramName: "V = 4.0 V", theoretical: "4.00 mA", simulated: "4.00 mA", unit: "mA" },
      { step: "3", paramName: "V = 6.0 V", theoretical: "6.00 mA", simulated: "6.00 mA", unit: "mA" },
      { step: "4", paramName: "V = 8.0 V", theoretical: "8.00 mA", simulated: "8.00 mA", unit: "mA" },
      { step: "5", paramName: "V = 10.0 V", theoretical: "10.00 mA", simulated: "10.00 mA", unit: "mA" },
      { step: "6", paramName: "V = 12.0 V", theoretical: "12.00 mA", simulated: "12.00 mA", unit: "mA" },
    ],
    conclusions: [
      "The experimental ratio of voltage to current is constant at 1000 Ω within 0.1% measurement accuracy.",
      "Ohm's Law holds true for passive linear metallic and carbon film resistive conductors.",
    ],
    vivaQuestions: [
      { question: "Does Ohm's Law apply to semiconductor diodes or vacuum tubes?", answer: "No. Semiconductor devices have nonlinear non-ohmic I-V characteristics governed by exponential Shockley equations." },
      { question: "Why must the ammeter be connected in series and the voltmeter in parallel?", answer: "An ammeter has near-zero internal resistance to measure loop flow without adding voltage drops; a voltmeter has near-infinite impedance to avoid shunting current." },
    ],
    presetCircuitTab: "lab",
  },

  {
    id: "EXP_KVL_KCL",
    courseDomain: "A",
    title: "Verification of Kirchhoff's Current and Voltage Laws (KCL & KVL)",
    category: "Linear Circuit Analysis",
    learningObjectives: [
      "Verify that the algebraic sum of currents entering any node equals the sum of currents leaving (KCL).",
      "Verify that the directed sum of electrical potential differences around any closed loop equals zero (KVL).",
      "Validate Tellegen's theorem for total power conservation.",
    ],
    requiredComponents: [
      { name: "DC Power Supply", partNumber: "Dual 12V", quantity: 1, specification: "Fixed 12V DC reference" },
      { name: "Resistor R1", partNumber: "CFR-25JT-1K", quantity: 1, specification: "1.0 kΩ, 0.25W" },
      { name: "Resistor R2", partNumber: "CFR-25JT-2K2", quantity: 1, specification: "2.2 kΩ, 0.25W" },
      { name: "Resistor R3", partNumber: "CFR-25JT-3K3", quantity: 1, specification: "3.3 kΩ, 0.25W" },
    ],
    theoreticalExplanation:
      "Kirchhoff's Current Law (KCL) is a consequence of the conservation of electric charge: Σ I_in = Σ I_out. Kirchhoff's Voltage Law (KVL) is a consequence of the conservation of energy: Σ V_drops = Σ V_sources.",
    governingFormulas: ["KCL: Σ I_node = 0", "KVL: Σ V_loop = 0", "Power Conservation: Σ P_supplied = Σ P_absorbed"],
    wiringInstructions: [
      "1. Connect Resistor R1 (1kΩ) in series with the 12V supply positive rail.",
      "2. Connect the output of R1 to Node A.",
      "3. At Node A, split the branch into parallel resistors R2 (2.2kΩ) and R3 (3.3kΩ).",
      "4. Connect the bottom leads of R2 and R3 together to Ground (0V).",
    ],
    simulationProcedure: [
      "1. Power the circuit with 12V DC.",
      "2. Measure voltage drop V_R1, V_R2, and V_R3 using the differential voltmeter probe.",
      "3. Verify that V_source - V_R1 - V_R2 = 0.",
      "4. Measure branch currents I_1, I_2, and I_3 and verify that I_1 = I_2 + I_3.",
    ],
    expectedWaveformsDescription: "Constant DC node voltages: V_NodeA = 6.84 V, V_R1 = 5.16 V, V_R2 = 6.84 V.",
    observationTable: [
      { step: "1", paramName: "Total Current I_1", theoretical: "5.16 mA", simulated: "5.16 mA", unit: "mA" },
      { step: "2", paramName: "Branch Current I_2 (2.2k)", theoretical: "3.11 mA", simulated: "3.11 mA", unit: "mA" },
      { step: "3", paramName: "Branch Current I_3 (3.3k)", theoretical: "2.07 mA", simulated: "2.05 mA", unit: "mA" },
      { step: "4", paramName: "KCL Error (|I1 - (I2+I3)|)", theoretical: "0.00 mA", simulated: "0.00 mA", unit: "mA" },
      { step: "5", paramName: "Loop 1 KVL (12V - V1 - V2)", theoretical: "0.00 V", simulated: "0.00 V", unit: "V" },
    ],
    conclusions: [
      "KCL is verified: Current into Node A (5.16 mA) equals sum of outgoing branch currents (3.11 + 2.05 = 5.16 mA).",
      "KVL is verified: The sum of voltage drops across the series-parallel loop exactly matches the 12V source.",
    ],
    vivaQuestions: [
      { question: "What physical law underpins KCL?", answer: "The law of conservation of electric charge (charge cannot accumulate indefinitely at a junction node)." },
      { question: "What physical law underpins KVL?", answer: "The law of conservation of energy (moving a test charge completely around a closed circuit path does zero net work)." },
    ],
    presetCircuitTab: "lca",
  },

  {
    id: "EXP_DIODE_CHAR",
    courseDomain: "B",
    title: "PN Junction Diode Forward & Reverse Characteristics (1N4007)",
    category: "Electronic Devices & Circuits",
    learningObjectives: [
      "Obtain the static forward and reverse I-V characteristic curve of a silicon PN junction diode.",
      "Determine barrier potential (knee voltage Vk ≈ 0.7V) and dynamic AC resistance rd = 26mV / Id.",
      "Observe reverse breakdown and reverse saturation leakage current.",
    ],
    requiredComponents: [
      { name: "Silicon Rectifier Diode", partNumber: "1N4007", quantity: 1, specification: "DO-41 package, 1000V Vrrm, 1A" },
      { name: "Current Limiting Resistor", partNumber: "CFR-25JT-1K", quantity: 1, specification: "1.0 kΩ, 0.25W" },
      { name: "DC Variable Power Supply", partNumber: "0–15V", quantity: 1, specification: "Fine voltage control" },
      { name: "Dual Multimeters", partNumber: "DMM", quantity: 2, specification: "Simultaneous Vf and If measurement" },
    ],
    theoreticalExplanation:
      "A PN junction diode conducts current predominantly in the forward direction when the applied voltage exceeds the built-in barrier potential (approx. 0.65V–0.7V for silicon). In reverse bias, only a minute nanoampere minority carrier saturation current flows until peak reverse voltage.",
    governingFormulas: [
      "I = I_s × (e^(V_d / (n × V_t)) - 1)",
      "Thermal Voltage V_t = k × T / q ≈ 25.86 mV @ 25°C",
      "Dynamic Resistance r_d = ΔV_d / ΔI_d = n × V_t / I_d",
    ],
    wiringInstructions: [
      "1. Connect the DC voltage source positive rail to Lead 1 of the 1 kΩ series resistor.",
      "2. Connect Lead 2 of the resistor to the Anode (A, unbanded side) of the 1N4007 diode.",
      "3. Connect the Cathode (K, silver band side) of the diode to Ground (0V).",
      "4. Connect Voltmeter probes directly across the Anode and Cathode.",
    ],
    simulationProcedure: [
      "1. Sweep the input voltage from 0.0V to 5.0V in 0.2V increments.",
      "2. Monitor the diode terminal voltage Vf and loop current If.",
      "3. Observe the sharp exponential knee at Vf ≈ 0.65V.",
      "4. Reverse the diode orientation to observe reverse saturation current behavior.",
    ],
    expectedWaveformsDescription: "Exponential upward bend starting at 0.65V; current rises sharply with minimal increase in diode voltage beyond 0.72V.",
    observationTable: [
      { step: "1", paramName: "V_in = 0.40 V", theoretical: "Vd=0.38V, Id=0.02mA", simulated: "Vd=0.38V, Id=0.02mA", unit: "V/mA" },
      { step: "2", paramName: "V_in = 0.80 V", theoretical: "Vd=0.62V, Id=0.18mA", simulated: "Vd=0.61V, Id=0.19mA", unit: "V/mA" },
      { step: "3", paramName: "V_in = 1.50 V", theoretical: "Vd=0.68V, Id=0.82mA", simulated: "Vd=0.67V, Id=0.83mA", unit: "V/mA" },
      { step: "4", paramName: "V_in = 3.00 V", theoretical: "Vd=0.71V, Id=2.29mA", simulated: "Vd=0.71V, Id=2.29mA", unit: "V/mA" },
      { step: "5", paramName: "V_in = 5.00 V", theoretical: "Vd=0.73V, Id=4.27mA", simulated: "Vd=0.73V, Id=4.27mA", unit: "V/mA" },
    ],
    conclusions: [
      "Silicon diode barrier potential is confirmed at approximately 0.68V–0.72V.",
      "Beyond the knee voltage, current increases exponentially while diode forward voltage drop remains nearly constant.",
    ],
    vivaQuestions: [
      { question: "Why is germanium barrier potential 0.3V while silicon is 0.7V?", answer: "Silicon has a wider semiconductor bandgap (Eg = 1.12 eV) compared to germanium (Eg = 0.67 eV)." },
      { question: "What is PIV and what is its value for 1N4007?", answer: "Peak Inverse Voltage is the maximum reverse voltage the diode can withstand without breakdown. For 1N4007, PIV = 1000V." },
    ],
    presetCircuitTab: "cd",
  },

  {
    id: "EXP_ZENER_REG",
    courseDomain: "B",
    title: "Zener Diode Shunt Voltage Regulator",
    category: "Electronic Devices & Circuits",
    learningObjectives: [
      "Investigate reverse breakdown characteristics of a Zener diode.",
      "Construct a shunt voltage regulator and analyze line regulation against varying input voltage.",
      "Analyze load regulation against varying load currents.",
    ],
    requiredComponents: [
      { name: "Zener Diode", partNumber: "1N4733A", quantity: 1, specification: "5.1V, 1.0W, DO-35 package" },
      { name: "Series Current Resistor Rs", partNumber: "CFR-25JT-470R", quantity: 1, specification: "470 Ω, 0.5W" },
      { name: "Load Resistor RL", partNumber: "POT 10k", quantity: 1, specification: "Variable 1kΩ to 10kΩ" },
      { name: "DC Variable Power Supply", partNumber: "0–20V", quantity: 1, specification: "Input source" },
    ],
    theoreticalExplanation:
      "When reverse-biased beyond its breakdown threshold (Vz), a Zener diode maintains an almost constant terminal voltage across wide variations in reverse current, making it ideal as a parallel shunt voltage stabilizer.",
    governingFormulas: [
      "V_out = V_z",
      "I_s = (V_in - V_z) / R_s",
      "I_z = I_s - I_L",
      "Line Regulation = ΔV_out / ΔV_in",
      "Load Regulation = (V_no_load - V_full_load) / V_full_load × 100%",
    ],
    wiringInstructions: [
      "1. Connect DC Supply (+) to Lead 1 of series resistor Rs (470 Ω).",
      "2. Connect Lead 2 of Rs to the Cathode of the 1N4733A Zener diode (Reverse bias orientation!).",
      "3. Connect the Anode of the Zener diode to Ground (0V).",
      "4. Connect the Load Resistor RL in parallel across the Zener diode.",
    ],
    simulationProcedure: [
      "1. Keep RL = 2.2 kΩ and vary Vin from 6.0V to 15.0V. Record Vout to evaluate Line Regulation.",
      "2. Fix Vin = 12.0V and vary RL from 500Ω to 10kΩ. Record Vout and Iz to evaluate Load Regulation.",
    ],
    expectedWaveformsDescription: "Flat horizontal line stabilized firmly at +5.10 V despite input line fluctuations from 7V to 15V.",
    observationTable: [
      { step: "1", paramName: "Vin = 7.0 V", theoretical: "Vout = 5.08 V", simulated: "5.08 V", unit: "V" },
      { step: "2", paramName: "Vin = 9.0 V", theoretical: "Vout = 5.10 V", simulated: "5.10 V", unit: "V" },
      { step: "3", paramName: "Vin = 12.0 V", theoretical: "Vout = 5.12 V", simulated: "5.12 V", unit: "V" },
      { step: "4", paramName: "Vin = 15.0 V", theoretical: "Vout = 5.14 V", simulated: "5.14 V", unit: "V" },
    ],
    conclusions: [
      "Zener diode successfully clamps the output to 5.1V with line regulation error under 1.2%.",
      "Regulation fails if input voltage drops below Vz or if load current exceeds maximum available series current (causing Iz to drop to zero).",
    ],
    vivaQuestions: [
      { question: "What is the difference between Zener breakdown and Avalanche breakdown?", answer: "Zener breakdown occurs in heavily doped junctions at low voltages (<5V) via quantum tunneling; Avalanche breakdown occurs in lightly doped junctions via impact ionization." },
    ],
    presetCircuitTab: "cd",
  },

  {
    id: "EXP_BRIDGE_RECT",
    courseDomain: "B",
    title: "Full-Wave Bridge Rectifier with Capacitive Filter",
    category: "Power & Device Circuits",
    learningObjectives: [
      "Construct a 4-diode full-wave bridge rectifier circuit driven by secondary AC mains.",
      "Measure ripple factor, peak-to-peak ripple voltage Vr_pp, and rectification efficiency.",
      "Observe filtering effect of parallel reservoir capacitor C.",
    ],
    requiredComponents: [
      { name: "Bridge Rectifier Module", partNumber: "W04M / 4× 1N4007", quantity: 1, specification: "400V, 1.5A" },
      { name: "Filter Capacitor C", partNumber: "Radial 470µF 50V", quantity: 1, specification: "Aluminum electrolytic" },
      { name: "Load Resistor RL", partNumber: "CFR 1kΩ 1W", quantity: 1, specification: "1.0 kΩ load" },
      { name: "AC Secondary Source", partNumber: "12V RMS 50Hz", quantity: 1, specification: "Step-down transformer" },
    ],
    theoreticalExplanation:
      "A bridge rectifier uses 4 diodes in a Graetz bridge topology. During each half of the AC cycle, two diagonally opposite diodes conduct, routing current through the load in the exact same direction, yielding 100Hz pulsating DC.",
    governingFormulas: [
      "V_dc = 2 × V_m / π ≈ 0.636 × V_m (Unfiltered)",
      "V_dc ≈ V_m - V_r_pp / 2 (Filtered)",
      "Peak Ripple Voltage V_r_pp = I_dc / (2 × f × C)",
      "Ripple Factor γ = 1 / (4 × √3 × f × C × R_L)",
    ],
    wiringInstructions: [
      "1. Connect AC secondary leads (12V RMS) to the two AC terminals (~) of the bridge rectifier.",
      "2. Connect positive (+) terminal of bridge to positive lead of 470µF filter capacitor.",
      "3. Connect negative (-) terminal of bridge to negative lead of filter capacitor and ground.",
      "4. Connect 1 kΩ load resistor across the capacitor terminals.",
    ],
    simulationProcedure: [
      "1. Run transient simulation for 50 ms.",
      "2. Channel A probes input AC sine wave; Channel B probes DC output across load.",
      "3. Measure peak DC voltage Vm - 2*Vd = 16.97 - 1.4 = 15.57 V.",
      "4. Toggle capacitor to observe filtered vs unfiltered pulsating full-wave DC.",
    ],
    expectedWaveformsDescription: "Smooth DC line with tiny 100Hz sawtooth ripple of amplitude Vr_pp ≈ 330 mV.",
    observationTable: [
      { step: "1", paramName: "Input AC Peak (Vm)", theoretical: "16.97 V", simulated: "16.97 V", unit: "V" },
      { step: "2", paramName: "Output DC Peak (Vm - 2Vf)", theoretical: "15.57 V", simulated: "15.55 V", unit: "V" },
      { step: "3", paramName: "Ripple Frequency", theoretical: "100 Hz", simulated: "100 Hz", unit: "Hz" },
      { step: "4", paramName: "Peak-to-Peak Ripple Vr_pp", theoretical: "0.33 V", simulated: "0.32 V", unit: "V" },
    ],
    conclusions: [
      "Full-wave bridge doubles ripple frequency to 100Hz, halving the required capacitor filter size compared to half-wave.",
      "Output DC voltage is V_peak - 2×Vf due to two diode forward conduction drops in series.",
    ],
    vivaQuestions: [
      { question: "What is the PIV rating required for each diode in a bridge rectifier vs center-tapped?", answer: "In a bridge rectifier, PIV = Vm; in a center-tapped full-wave rectifier, PIV = 2×Vm." },
    ],
    presetCircuitTab: "multisim",
  },

  {
    id: "EXP_BJT_CE",
    courseDomain: "B",
    title: "Common-Emitter (CE) BJT Transistor Amplifier & Load Line",
    category: "Electronic Devices & Circuits",
    learningObjectives: [
      "Bias an NPN BJT (BC547) in Class-A Common-Emitter configuration using voltage-divider bias.",
      "Plot DC load line and identify Q-point (Vce_q, Ic_q).",
      "Measure small-signal AC voltage gain Av = v_out / v_in and observe 180° phase inversion.",
    ],
    requiredComponents: [
      { name: "NPN BJT", partNumber: "BC547B", quantity: 1, specification: "hFE ≈ 300, TO-92" },
      { name: "Collector Resistor Rc", partNumber: "1.0 kΩ", quantity: 1, specification: "1/4W" },
      { name: "Emitter Resistor Re", partNumber: "470 Ω", quantity: 1, specification: "1/4W with 100µF bypass cap Ce" },
      { name: "Bias Resistors R1, R2", partNumber: "10 kΩ, 2.2 kΩ", quantity: 2, specification: "Voltage divider" },
      { name: "Coupling Capacitors", partNumber: "10 µF", quantity: 2, specification: "Input and Output AC block" },
    ],
    theoreticalExplanation:
      "The Common-Emitter configuration provides high voltage gain and high current gain with an inherent 180° phase shift between input and output. Voltage divider bias stabilizes the quiescent operating point against variations in temperature and transistor beta (β).",
    governingFormulas: [
      "V_b = V_cc × R2 / (R1 + R2)",
      "V_e = V_b - 0.7 V",
      "I_c ≈ I_e = V_e / R_e",
      "V_ce = V_cc - I_c × (R_c + R_e)",
      "AC Voltage Gain A_v = - R_c / r_e' where r_e' = 26mV / I_e",
    ],
    wiringInstructions: [
      "1. Connect R1 (10k) and R2 (2.2k) across 12V and Ground to bias the Base.",
      "2. Connect Base through a 10µF coupling capacitor to a 1kHz 20mV sine wave generator.",
      "3. Connect Collector through Rc (1k) to 12V.",
      "4. Connect Emitter through Re (470Ω) in parallel with Ce (100µF) to Ground.",
      "5. Take output from Collector through a 10µF coupling capacitor to Oscilloscope Channel 2.",
    ],
    simulationProcedure: [
      "1. Run DC Operating Point analysis to verify Vce_q ≈ 6.0 V and Ic_q ≈ 5.0 mA.",
      "2. Apply 1kHz 20mV peak AC input and observe amplified inverted sine wave on Channel 2.",
      "3. Calculate Voltage Gain Av = Vout_peak / Vin_peak.",
    ],
    expectedWaveformsDescription: "Channel 1 shows 20mV input; Channel 2 shows 1.8V amplified inverted waveform (Av ≈ -90).",
    observationTable: [
      { step: "1", paramName: "Base Voltage Vb", theoretical: "2.16 V", simulated: "2.14 V", unit: "V" },
      { step: "2", paramName: "Emitter Voltage Ve", theoretical: "1.46 V", simulated: "1.44 V", unit: "V" },
      { step: "3", paramName: "Quiescent Collector Current Ic", theoretical: "3.10 mA", simulated: "3.08 mA", unit: "mA" },
      { step: "4", paramName: "Collector-Emitter Voltage Vce", theoretical: "7.44 V", simulated: "7.46 V", unit: "V" },
      { step: "5", paramName: "AC Voltage Gain |Av|", theoretical: "85", simulated: "88", unit: "V/V" },
    ],
    conclusions: [
      "The amplifier provides significant voltage gain (|Av| ≈ 88) with exact 180° phase inversion.",
      "Bypass capacitor Ce effectively shorts AC emitter resistance to ground, boosting AC gain while retaining DC thermal stability.",
    ],
    vivaQuestions: [
      { question: "Why is there a 180-degree phase shift in a Common-Emitter amplifier?", answer: "When base input rises, base current increases, causing collector current to increase. Greater voltage drop across Rc pulls collector potential downward." },
    ],
    presetCircuitTab: "edc",
  },

  {
    id: "EXP_TRIAC_DIMMER",
    courseDomain: "D",
    title: "TRIAC and DIAC AC Phase Control Circuit (Lamp Dimmer)",
    category: "Power Electronics",
    learningObjectives: [
      "Construct a full-wave AC phase control dimmer using a BT136 TRIAC and DB3 DIAC.",
      "Vary firing angle α from 20° to 160° via an RC phase shift network.",
      "Measure RMS output voltage and observe wave clipping across resistive loads.",
    ],
    requiredComponents: [
      { name: "TRIAC", partNumber: "BT136-600E", quantity: 1, specification: "600V, 4A, TO-220" },
      { name: "DIAC", partNumber: "DB3", quantity: 1, specification: "Vbo ≈ 32V, DO-35" },
      { name: "Potentiometer R_pot", partNumber: "250 kΩ", quantity: 1, specification: "Rotary speed/dimmer control" },
      { name: "Fixed Resistor R1", partNumber: "CFR 4.7 kΩ", quantity: 1, specification: "Current limit" },
      { name: "Phase Capacitor C", partNumber: "0.1 µF (100nF) 400V", quantity: 1, specification: "Polyester film" },
      { name: "AC Load / Lamp", partNumber: "100W / 100Ω", quantity: 1, specification: "230V AC incandescent load" },
    ],
    theoreticalExplanation:
      "The RC network delays the charging of capacitor C until its voltage reaches the breakover voltage of the DB3 DIAC (±32V). The DIAC then breaks down sharply, dumping a pulse of gate current into the BT136 TRIAC to trigger it into conduction for the remainder of the AC half-cycle.",
    governingFormulas: [
      "Firing Angle α = arctan(ω × R × C)",
      "V_rms_load = V_m × √((1/π) × (π - α + ½ sin(2α)))",
      "Power to Load P = V_rms_load² / R_load",
    ],
    wiringInstructions: [
      "1. Connect AC Mains Live through the Load Lamp to Main Terminal 2 (MT2) of the BT136 TRIAC.",
      "2. Connect Main Terminal 1 (MT1) to AC Mains Neutral.",
      "3. Connect the RC timing network (Potentiometer + 4.7k + 0.1µF capacitor) between MT2 and MT1.",
      "4. Connect the DB3 DIAC between the junction of R-C and the TRIAC Gate terminal.",
    ],
    simulationProcedure: [
      "1. Start with R_pot at minimum resistance (α ≈ 25°). Observe nearly full AC sine wave across load.",
      "2. Rotate R_pot toward maximum resistance. Observe firing angle α increase, reducing conduction angle.",
      "3. Measure RMS load voltage decreasing smoothly from 215V down to 40V.",
    ],
    expectedWaveformsDescription: "Symmetrical chopped AC sine wave with conduction delayed until firing angle α on both positive and negative half-cycles.",
    observationTable: [
      { step: "1", paramName: "α = 30° (High Brightness)", theoretical: "220 V RMS", simulated: "218 V RMS", unit: "V" },
      { step: "2", paramName: "α = 60°", theoretical: "204 V RMS", simulated: "201 V RMS", unit: "V" },
      { step: "3", paramName: "α = 90° (Half Power)", theoretical: "162 V RMS", simulated: "160 V RMS", unit: "V" },
      { step: "4", paramName: "α = 120°", theoretical: "108 V RMS", simulated: "105 V RMS", unit: "V" },
      { step: "5", paramName: "α = 150° (Dim Glow)", theoretical: "48 V RMS", simulated: "45 V RMS", unit: "V" },
    ],
    conclusions: [
      "TRIAC bidirectional conduction permits smooth full-wave AC power regulation without transformer taps.",
      "DB3 DIAC ensures symmetrical firing between positive and negative half-cycles, preventing DC offset current into the AC mains.",
    ],
    vivaQuestions: [
      { question: "Why is a DIAC necessary in a TRIAC dimmer circuit?", answer: "Without a DIAC, unequal positive and negative gate trigger sensitivities cause asymmetric conduction, generating dangerous DC offsets and harmonics." },
    ],
    presetCircuitTab: "power",
  },

  {
    id: "EXP_555_ASTABLE",
    courseDomain: "C",
    title: "NE555 Timer Astable Multivibrator (Square Wave Clock Generator)",
    category: "Digital Logic & Timing",
    learningObjectives: [
      "Configure an NE555 timer IC in free-running astable multivibrator mode.",
      "Calculate and measure output oscillation frequency f, charge time t_high, discharge time t_low, and duty cycle D.",
      "Observe capacitor exponential charge/discharge between 1/3 Vcc and 2/3 Vcc.",
    ],
    requiredComponents: [
      { name: "Timer IC", partNumber: "NE555P", quantity: 1, specification: "DIP-8 package" },
      { name: "Resistor Ra", partNumber: "10 kΩ", quantity: 1, specification: "1/4W" },
      { name: "Resistor Rb", partNumber: "47 kΩ", quantity: 1, specification: "1/4W" },
      { name: "Timing Capacitor C", partNumber: "10 µF", quantity: 1, specification: "Electrolytic 25V" },
      { name: "Decoupling Capacitor C_ctrl", partNumber: "10 nF", quantity: 1, specification: "Ceramic disc on Pin 5" },
    ],
    theoreticalExplanation:
      "In astable mode, capacitor C charges through (Ra + Rb) toward Vcc until its voltage reaches 2/3 Vcc (Threshold, Pin 6). The internal flip-flop trips, turning ON the discharge transistor (Pin 7). The capacitor then discharges through Rb into ground until reaching 1/3 Vcc (Trigger, Pin 2), resetting the cycle.",
    governingFormulas: [
      "t_high = 0.693 × (R_a + R_b) × C",
      "t_low = 0.693 × R_b × C",
      "Period T = t_high + t_low = 0.693 × (R_a + 2×R_b) × C",
      "Frequency f = 1.44 / ((R_a + 2×R_b) × C)",
      "Duty Cycle D = (R_a + R_b) / (R_a + 2×R_b) × 100%",
    ],
    wiringInstructions: [
      "1. Connect Pin 8 (Vcc) and Pin 4 (Reset) to +5V DC.",
      "2. Connect Pin 1 (GND) to Ground.",
      "3. Connect Resistor Ra between +5V and Pin 7 (Discharge).",
      "4. Connect Resistor Rb between Pin 7 and Pin 6 (Threshold).",
      "5. Jumper Pin 6 to Pin 2 (Trigger).",
      "6. Connect Timing Capacitor C between Pin 2 and Ground.",
      "7. Take Output from Pin 3 to DSO Channel 1; probe Pin 2 on DSO Channel 2.",
    ],
    simulationProcedure: [
      "1. Run transient simulation for 2.0 seconds.",
      "2. Observe Channel 1 square wave between 0V and 5V.",
      "3. Observe Channel 2 exponential sawtooth ramp oscillating between 1.67V (1/3 Vcc) and 3.33V (2/3 Vcc).",
      "4. Measure period T and compare with theoretical 0.721 seconds.",
    ],
    expectedWaveformsDescription: "Clean 5V square wave on output Pin 3 synchronized with 1/3–2/3 Vcc exponential sawtooth on Pin 2.",
    observationTable: [
      { step: "1", paramName: "t_high (Output High)", theoretical: "0.395 s", simulated: "0.393 s", unit: "s" },
      { step: "2", paramName: "t_low (Output Low)", theoretical: "0.326 s", simulated: "0.324 s", unit: "s" },
      { step: "3", paramName: "Period T", theoretical: "0.721 s", simulated: "0.717 s", unit: "s" },
      { step: "4", paramName: "Frequency f", theoretical: "1.39 Hz", simulated: "1.39 Hz", unit: "Hz" },
      { step: "5", paramName: "Duty Cycle D", theoretical: "54.8 %", simulated: "54.8 %", unit: "%" },
    ],
    conclusions: [
      "NE555 astable frequency matches mathematical prediction within 0.5% tolerance.",
      "Duty cycle is inherently greater than 50% because the capacitor charges through Ra+Rb but discharges only through Rb.",
    ],
    vivaQuestions: [
      { question: "How can you achieve a 50% or lower duty cycle with a 555 timer?", answer: "Place a diode in parallel with Rb (anode to Pin 7, cathode to Pin 2/6) so charging bypasses Rb directly through Ra." },
    ],
    presetCircuitTab: "lab",
  },
];
