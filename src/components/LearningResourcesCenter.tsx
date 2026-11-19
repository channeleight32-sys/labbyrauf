import React, { useState, useMemo } from "react";
import {
  BookOpen,
  Cpu,
  Wrench,
  Search,
  X,
  ArrowUpRight,
  HelpCircle,
  CheckCircle2,
  Sliders,
  Layers,
  Sparkles,
  FileCode2,
} from "lucide-react";
import {
  MASTER_DOMAINS,
  MASTER_75_LABS,
  RECOMMENDED_LAB_SETUP,
  MasterDomainId,
} from "../data/master75Labs";
import { ActiveTabId } from "./CurriculumGuide";

interface LearningResourcesCenterProps {
  initialDomain?: MasterDomainId | "ALL";
  onNavigateTab: (tab: ActiveTabId) => void;
  onOpenLabInWorkbench: (labId: string, domain: MasterDomainId) => void;
}

interface SubjectFormulaCard {
  id: string;
  domain: MasterDomainId;
  topic: string;
  formula: string;
  variables: string;
  engineeringNote: string;
  relatedLabId: string;
  simulatorTab: ActiveTabId;
}

interface ICReferenceSpec {
  partNumber: string;
  name: string;
  domain: MasterDomainId;
  packageType: string;
  supplyRails: string;
  keySpecs: string[];
  pinSummary: string;
  simulatorTab: ActiveTabId;
}

interface VivaQuestionItem {
  id: string;
  domain: MasterDomainId;
  labRef: string;
  question: string;
  answer: string;
}

const SUBJECT_FORMULA_COMPENDIUM: SubjectFormulaCard[] = [
  // Domain A: Electronics Network Analysis
  {
    id: "FA-1",
    domain: "A",
    topic: "Thevenin & Norton Equivalent Network Reduction",
    formula: "V_th = V_oc ,   I_N = I_sc ,   R_th = R_N = V_oc / I_sc",
    variables: "V_oc: Open-circuit terminal voltage · I_sc: Short-circuit current · R_th: Equivalent resistance with independent sources deactivated",
    engineeringNote:
      "Replace voltage sources with short circuits (0 Ω) and current sources with open circuits (∞ Ω) when computing R_th for non-dependent linear networks.",
    relatedLabId: "A03",
    simulatorTab: "lca",
  },
  {
    id: "FA-2",
    domain: "A",
    topic: "Maximum Power Transfer & Efficiency Theorem",
    formula: "R_L = R_th  (DC) ,   Z_L = Z_th* = R_th - jX_th  (AC) ,   P_max = V_th² / (4 · R_th)",
    variables: "Z_L: Load impedance · Z_th*: Complex conjugate of source impedance · η = R_L / (R_th + R_L) = 50% at P_max",
    engineeringNote:
      "Conjugate matching cancels reactive reactance (X_L = -X_th) so the net loop operates at unity power factor and transfers maximum real power.",
    relatedLabId: "A04",
    simulatorTab: "lca",
  },
  {
    id: "FA-3",
    domain: "A",
    topic: "Series & Parallel RLC Resonance, Q-Factor & Bandwidth",
    formula: "f_0 = 1 / (2π√(LC)) ,   Q_series = (1/R)√(L/C) ,   BW = f_2 - f_1 = f_0 / Q",
    variables: "f_0: Resonant frequency (Hz) · Q: Quality factor · f_1, f_2: -3 dB half-power cutoff frequencies",
    engineeringNote:
      "At series resonance XL = XC, impedance is purely resistive and minimal (Z = R), and voltage across L or C can reach Q · V_in.",
    relatedLabId: "A07",
    simulatorTab: "rlc",
  },
  {
    id: "FA-4",
    domain: "A",
    topic: "Two-Port Network Z, Y, h & ABCD Transmission Parameters",
    formula: "[V_1; V_2] = [Z_11 Z_12; Z_21 Z_22][I_1; I_2] ,   AD - BC = 1 (Reciprocal)",
    variables: "Z_11: Input driving-point impedance · Z_21: Forward transfer impedance · A,B,C,D: Cascade transmission matrix",
    engineeringNote:
      "Cascaded two-port networks multiply their ABCD matrices directly; series connections add Z-matrices; parallel connections add Y-matrices.",
    relatedLabId: "A08",
    simulatorTab: "lca",
  },

  // Domain B: Linear Integrated Circuits (LIC)
  {
    id: "FB-1",
    domain: "B",
    topic: "Inverting, Non-Inverting & Differential Op-Amp Closed-Loop Gain",
    formula: "A_v(inv) = -R_f / R_in ,   A_v(non) = 1 + (R_f / R_1) ,   CMRR_dB = 20·log10(|A_d / A_cm|)",
    variables: "R_f: Feedback resistor · R_in: Input resistor · A_d: Differential gain · A_cm: Common-mode gain",
    engineeringNote:
      "Negative feedback enforces a virtual short (V_+ ≈ V_-) at the op-amp input terminals with near-zero input current.",
    relatedLabId: "B01",
    simulatorTab: "edc",
  },
  {
    id: "FB-2",
    domain: "B",
    topic: "Op-Amp Active Sallen-Key 2nd-Order Filter & Cutoff Frequency",
    formula: "f_c = 1 / (2π√(R_1 R_2 C_1 C_2)) ,   A_0 = 1 + (R_b / R_a) ,   Q = 1 / (3 - A_0)",
    variables: "f_c: Critical corner frequency · A_0: Passband gain · Butterworth flat response occurs at A_0 = 1.586 (Q = 0.707)",
    engineeringNote:
      "If passband gain A_0 ≥ 3 in an equal-component Sallen-Key stage, the poles move into the right-half s-plane and the circuit oscillates.",
    relatedLabId: "B05",
    simulatorTab: "rlc",
  },
  {
    id: "FB-3",
    domain: "B",
    topic: "Wein Bridge & RC Phase-Shift Sine Wave Oscillators",
    formula: "f_osc(Wein) = 1 / (2πRC)  (A_v ≥ 3) ,   f_osc(RC-Phase) = 1 / (2πRC√6)  (|A_v| ≥ 29)",
    variables: "Barkhausen Criterion: Loop Gain |β·A| ≥ 1 and total loop phase shift ∠βA = 0° or 360°",
    engineeringNote:
      "Wein bridge uses lead-lag feedback (β = 1/3 at f_0), requiring non-inverting gain of 3; 3-stage RC ladder attenuates by 1/29 at 180° phase shift.",
    relatedLabId: "B10",
    simulatorTab: "multisim",
  },
  {
    id: "FB-4",
    domain: "B",
    topic: "NE555 Astable & Monostable Multivibrator Timing Equations",
    formula: "f = 1.44 / ((R_A + 2R_B)·C) ,   Duty = (R_A + R_B)/(R_A + 2R_B) ,   T_mono = 1.1·R·C",
    variables: "R_A, R_B: Charging/discharging resistors · C: Timing capacitor cycling between 1/3 V_CC and 2/3 V_CC",
    engineeringNote:
      "To achieve <50% duty cycle in an astable 555 timer, connect a signal diode (1N4148) in parallel with R_B to bypass R_B during charging.",
    relatedLabId: "B12",
    simulatorTab: "multisim",
  },

  // Domain C: Digital Logic Design (DLD)
  {
    id: "FC-1",
    domain: "C",
    topic: "Boolean Algebra, De Morgan's Laws & Quine-McCluskey Minimal SOP",
    formula: "(A · B)' = A' + B' ,   (A + B)' = A' · B' ,   AB + A'C + BC = AB + A'C (Consensus)",
    variables: "Prime Implicant (PI): Merged minterm group · Essential PI: Covers at least one unique minterm not covered by any other PI",
    engineeringNote:
      "Any minimal Sum-of-Products (SOP) expression synthesizes directly into a 2-level NAND-NAND gate network with identical logic behavior.",
    relatedLabId: "C01",
    simulatorTab: "kmap",
  },
  {
    id: "FC-2",
    domain: "C",
    topic: "Full Adder, Carry-Lookahead (CLA) & Two's Complement Overflow",
    formula: "S_i = P_i ⊕ C_i ,   C_{i+1} = G_i + P_i·C_i   where P_i = A_i ⊕ B_i , G_i = A_i·B_i",
    variables: "P_i: Carry Propagate · G_i: Carry Generate · Signed Overflow V = C_{n-1} ⊕ C_n",
    engineeringNote:
      "Carry-Lookahead eliminates O(N) ripple delay by expanding C_1..C_4 in two gate levels directly from C_0, P_i, and G_i.",
    relatedLabId: "C03",
    simulatorTab: "msi",
  },
  {
    id: "FC-3",
    domain: "C",
    topic: "Flip-Flop Characteristic Equations & Static Timing (f_max)",
    formula: "Q(t+1)_JK = J·Q' + K'·Q ,   Q(t+1)_D = D ,   Q(t+1)_T = T ⊕ Q ,   T_clk ≥ t_cq + t_comb + t_su",
    variables: "t_cq: Clock-to-Q delay · t_comb: Critical combinational path delay · t_su: Setup time · f_max = 1 / T_clk(min)",
    engineeringNote:
      "Hold-time safety requires t_cq(min) + t_comb(min) ≥ t_hold + t_skew; hold violations cannot be fixed by slowing down the clock frequency.",
    relatedLabId: "C07",
    simulatorTab: "sequential",
  },
  {
    id: "FC-4",
    domain: "C",
    topic: "DAC Resolution, R-2R Ladder & Successive Approximation ADC",
    formula: "LSB = V_ref / (2^N - 1) ,   V_out = V_ref · (D / 2^N) ,   SNR_ideal = 6.02·N + 1.76 dB",
    variables: "N: Converter bit resolution · D: Digital input word · T_conv(SAR) = N · T_clk",
    engineeringNote:
      "An R-2R ladder requires only two precision resistor values (R and 2R), solving the huge resistor spread (2^{N-1}:1) of binary-weighted DACs.",
    relatedLabId: "C13",
    simulatorTab: "logic-suite",
  },

  // Domain D: Power Electronics
  {
    id: "FD-1",
    domain: "D",
    topic: "Single-Phase & Three-Phase Controlled SCR Rectifier DC Output",
    formula: "V_dc(1Φ-Full) = (2V_m / π)·cos(α) ,   V_dc(3Φ-Full) = (3√3·V_m / π)·cos(α)",
    variables: "V_m: Peak phase voltage · α: SCR gate firing delay angle · With Freewheeling Diode: V_dc = (V_m/π)(1 + cos α)",
    engineeringNote:
      "For α > 90° with an inductive load and back-EMF source (RLE load), a full-wave bridge without freewheeling diode operates in line-commutated inverter mode.",
    relatedLabId: "D04",
    simulatorTab: "power",
  },
  {
    id: "FD-2",
    domain: "D",
    topic: "DC-DC Buck, Boost & Buck-Boost Converter Volt-Second Balance",
    formula: "V_o(Buck) = D·V_in ,   V_o(Boost) = V_in / (1 - D) ,   V_o(Buck-Boost) = -V_in · (D / (1 - D))",
    variables: "D = T_on / T_s: PWM duty ratio (0 < D < 1) · L_crit(Buck) = (1 - D)·R / (2·f_sw)",
    engineeringNote:
      "Steady-state inductor volt-second balance requires ∫v_L(t)dt = 0 over every switching period T_s in Continuous Conduction Mode (CCM).",
    relatedLabId: "D08",
    simulatorTab: "power",
  },
  {
    id: "FD-3",
    domain: "D",
    topic: "Single-Phase & Three-Phase SPWM Inverter Fundamental & THD",
    formula: "V_1(rms) = m_a · V_dc / √2  (Full-Bridge) ,   THD = √(∑_{n=2}^∞ V_n²) / V_1 × 100%",
    variables: "m_a = V_control / V_tri: Amplitude modulation index · m_f = f_carrier / f_ref: Frequency modulation ratio",
    engineeringNote:
      "Space Vector PWM (SVPWM) achieves a 15.5% higher fundamental line-to-line output voltage than sinusoidal PWM before entering overmodulation.",
    relatedLabId: "D10",
    simulatorTab: "power",
  },

  // Domain E: Electronic Devices & Circuits (EDC)
  {
    id: "FE-1",
    domain: "E",
    topic: "Shockley PN Junction Diode Equation & Zener Voltage Regulation",
    formula: "I_D = I_S · (exp(V_D / (n·V_T)) - 1) ,   r_d = n·V_T / I_DQ ≈ 26 mV / I_DQ",
    variables: "I_S: Reverse saturation current · n: Ideality factor (1–2) · V_T = kT/q ≈ 25.85 mV at 300 K · r_d: Dynamic AC resistance",
    engineeringNote:
      "The operating Q-point (V_DQ, I_DQ) is the intersection of the exponential Shockley curve and the linear DC load line I_D = (V_SS - V_D)/R.",
    relatedLabId: "E01",
    simulatorTab: "cd",
  },
  {
    id: "FE-2",
    domain: "E",
    topic: "BJT Common-Emitter Bias Stability & Hybrid-π Small-Signal Gain",
    formula: "g_m = I_CQ / V_T ,   r_π = β / g_m ,   A_v = -g_m · (R_C || R_L || r_o)",
    variables: "I_CQ: Quiescent collector current · g_m: Transconductance · r_π: Base-emitter input resistance",
    engineeringNote:
      "Voltage-divider bias with an emitter resistor R_E makes the DC Q-point virtually independent of transistor β variations when (β+1)R_E ≫ R_th.",
    relatedLabId: "E08",
    simulatorTab: "edc",
  },
  {
    id: "FE-3",
    domain: "E",
    topic: "MOSFET Square-Law Saturation & Common-Source Amplifier",
    formula: "I_D(sat) = ½·k_n·(V_GS - V_th)²·(1 + λV_DS) ,   g_m = √(2·k_n·I_DQ) = 2·I_DQ / (V_GS - V_th)",
    variables: "k_n = μ_n·C_ox·(W/L): Process transconductance parameter · V_th: Threshold voltage · V_ov = V_GS - V_th: Overdrive voltage",
    engineeringNote:
      "Unlike BJTs, MOSFETs have an insulated gate (SiO2) with virtually infinite DC input impedance (I_G ≈ 0 A).",
    relatedLabId: "E06",
    simulatorTab: "edc",
  },
];

const IC_REFERENCE_CARDS: ICReferenceSpec[] = [
  {
    partNumber: "UA741 / LM741",
    name: "General-Purpose Operational Amplifier",
    domain: "B",
    packageType: "8-Pin DIP",
    supplyRails: "±15 V Dual Tracking (or ±5 V to ±18 V)",
    keySpecs: [
      "Open-Loop Gain A_OL: 200,000 (106 dB)",
      "Gain-Bandwidth Product (GBW): 1.0 MHz",
      "Slew Rate (SR): 0.5 V/μs",
      "Input Resistance R_in: 2 MΩ, Output R_out: 75 Ω",
    ],
    pinSummary:
      "Pin 2: Inverting Input (-) · Pin 3: Non-Inverting Input (+) · Pin 4: V- (-15V) · Pin 6: Output · Pin 7: V+ (+15V) · Pins 1,5: Offset Null",
    simulatorTab: "edc",
  },
  {
    partNumber: "NE555 / LM555",
    name: "Precision Timer / Astable & Monostable IC",
    domain: "B",
    packageType: "8-Pin DIP",
    supplyRails: "+4.5 V to +16 V DC",
    keySpecs: [
      "Internal 3× 5kΩ Voltage Divider (1/3 V_CC & 2/3 V_CC comparators)",
      "Output Sink/Source Current: Up to 200 mA",
      "Timing accuracy: ±1% temperature stability",
      "Max Operating Frequency: ~500 kHz – 1 MHz",
    ],
    pinSummary:
      "Pin 1: GND · Pin 2: Trigger (<1/3 Vcc) · Pin 3: Output · Pin 4: Reset (Active Low) · Pin 5: Control Voltage · Pin 6: Threshold (>2/3 Vcc) · Pin 7: Discharge · Pin 8: Vcc",
    simulatorTab: "multisim",
  },
  {
    partNumber: "74LS00 / 74LS74 / 74LS138 / 74LS181",
    name: "TTL 74LSxx Digital Logic & MSI Family",
    domain: "C",
    packageType: "14-Pin / 16-Pin / 24-Pin DIP",
    supplyRails: "+5.0 V ± 5% Regulated TTL Supply",
    keySpecs: [
      "74LS00: Quad 2-Input NAND Gate (t_pd ≈ 9 ns)",
      "74LS74: Dual Positive-Edge D Flip-Flop with Preset/Clear",
      "74LS138: 3-to-8 Line Decoder / Demultiplexer (Active-Low Outputs)",
      "74LS181: 4-Bit Arithmetic Logic Unit (16 Arithmetic + 16 Logic Ops)",
    ],
    pinSummary:
      "Standard TTL Corner Power: Pin 7 (or 8/12) = GND · Pin 14 (or 16/24) = +5V V_CC · Noise Margins: NM_H = 0.7V, NM_L = 0.4V",
    simulatorTab: "gates",
  },
  {
    partNumber: "2N3904 / IRF540N / 2N1595",
    name: "Discrete Semiconductor & Power Switching Devices",
    domain: "D",
    packageType: "TO-92 (BJT) / TO-220 (Power MOSFET & SCR)",
    supplyRails: "Up to 40V (2N3904) / 100V 33A (IRF540N) / 400V (SCR)",
    keySpecs: [
      "2N3904 NPN BJT: β_DC = 100–300, f_T = 300 MHz, V_CE(max) = 40 V",
      "IRF540N N-Channel Power MOSFET: R_DS(on) = 44 mΩ, V_GS(th) = 2–4 V",
      "SCR Thyristor: Latches ON upon gate pulse I_G when V_AK > 0; turns OFF when I_A < I_holding",
    ],
    pinSummary:
      "2N3904: 1-Emitter, 2-Base, 3-Collector · IRF540N: 1-Gate, 2-Drain, 3-Source · SCR: 1-Cathode, 2-Anode, 3-Gate",
    simulatorTab: "power",
  },
];

const VIVA_QUESTIONS: VivaQuestionItem[] = [
  {
    id: "VQ-A1",
    domain: "A",
    labRef: "Labs A02–A04",
    question:
      "Why does Maximum Power Transfer occur at 50% efficiency, and why don't utility power grids operate at R_L = R_th?",
    answer:
      "When R_L = R_th, half of the total power generated by V_th is dissipated internally inside R_th and half is delivered to R_L (η = 50%). Utility power systems instead minimize source impedance (R_th ≪ R_L) to achieve >95% efficiency and tight voltage regulation, whereas RF/communication receivers match impedances (50 Ω) to maximize signal power and prevent reflections.",
  },
  {
    id: "VQ-B1",
    domain: "B",
    labRef: "Labs B01–B03",
    question:
      "Why do practical Op-Amp Integrators require a large feedback resistor R_f in parallel with the feedback capacitor C_f?",
    answer:
      "An ideal integrator has infinite DC gain because X_C = 1/(2πfC) → ∞ at f = 0 Hz. Even microvolts of input offset voltage V_io or bias current I_B will charge C_f until the op-amp saturates at ±V_sat. Adding R_f in parallel limits the DC gain to -R_f/R_1 and provides a DC discharge path for C_f.",
  },
  {
    id: "VQ-C1",
    domain: "C",
    labRef: "Labs C01 & K-Map/Q-M",
    question:
      "When is the Quine-McCluskey tabular algorithm preferred over a Karnaugh Map (K-Map)?",
    answer:
      "K-Maps rely on visual pattern recognition of adjacent Gray-code cells, which becomes three-dimensional and error-prone beyond 4 or 5 variables. Quine-McCluskey systematically groups minterms by Hamming weight (number of 1s) and guarantees finding all Prime Implicants and Essential Prime Implicants algorithmically for any number of variables.",
  },
  {
    id: "VQ-C2",
    domain: "C",
    labRef: "Labs C07–C11",
    question:
      "What is the difference between a Mealy FSM and a Moore FSM in terms of output timing and state count?",
    answer:
      "In a Moore machine, outputs depend strictly on the current state Q(t), making outputs synchronous with the clock and glitch-free, though often requiring more states. In a Mealy machine, outputs depend on both current state Q(t) and current inputs X(t), allowing immediate response within the same clock cycle and fewer states, at the risk of asynchronous input glitches propagating to outputs.",
  },
  {
    id: "VQ-D1",
    domain: "D",
    labRef: "Labs D04 & D06",
    question:
      "How does adding a Freewheeling Diode across an RL load improve a phase-controlled SCR rectifier?",
    answer:
      "Without a freewheeling diode, stored inductor energy forces the SCR to continue conducting after the AC source voltage reverses negative, reducing average DC output voltage and lagging the input power factor. The freewheeling diode conducts as soon as v_s(t) crosses zero, clamping load voltage ≥ 0 V, increasing average V_dc, and commutating the SCR cleanly.",
  },
  {
    id: "VQ-E1",
    domain: "E",
    labRef: "Labs E04–E09",
    question:
      "Why does an unbypassed emitter resistor R_E stabilize the BJT Q-point and increase bandwidth, while reducing voltage gain?",
    answer:
      "An unbypassed R_E introduces negative current-series feedback: if I_C rises with temperature, V_E = I_E·R_E rises, reducing V_BE = V_B - V_E and counteracting the drift. For AC signals, it lowers voltage gain to A_v ≈ -R_C/R_E, increases input impedance by (1 + g_m·R_E), reduces harmonic distortion, and extends upper cutoff frequency f_H by preserving the Gain-Bandwidth Product.",
  },
];

export default function LearningResourcesCenter({
  initialDomain = "ALL",
  onNavigateTab,
  onOpenLabInWorkbench,
}: LearningResourcesCenterProps) {
  const [selectedDomain, setSelectedDomain] = useState<MasterDomainId | "ALL">(
    initialDomain
  );
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeResourceSection, setActiveResourceSection] = useState<
    "ALL" | "FORMULAS" | "IC_PINOUTS" | "VIVA_QA" | "BENCH_SETUP"
  >("ALL");
  const [expandedVivaIds, setExpandedVivaIds] = useState<
    Record<string, boolean>
  >({
    "VQ-A1": true,
    "VQ-B1": true,
    "VQ-C1": true,
  });
  const [quickLabIndex, setQuickLabIndex] = useState<number>(0);

  const domainLabs = useMemo(() => {
    if (selectedDomain === "ALL") return MASTER_75_LABS;
    return MASTER_75_LABS.filter((l) => l.domain === selectedDomain);
  }, [selectedDomain]);

  const sliderSelectedLab =
    domainLabs[Math.min(quickLabIndex, Math.max(0, domainLabs.length - 1))] ??
    MASTER_75_LABS[0];

  const filteredFormulas = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return SUBJECT_FORMULA_COMPENDIUM.filter((f) => {
      if (selectedDomain !== "ALL" && f.domain !== selectedDomain) return false;
      if (!q) return true;
      return (
        f.topic.toLowerCase().includes(q) ||
        f.formula.toLowerCase().includes(q) ||
        f.variables.toLowerCase().includes(q) ||
        f.engineeringNote.toLowerCase().includes(q)
      );
    });
  }, [selectedDomain, searchQuery]);

  const filteredICs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return IC_REFERENCE_CARDS.filter((ic) => {
      if (selectedDomain !== "ALL" && ic.domain !== selectedDomain)
        return false;
      if (!q) return true;
      return (
        ic.partNumber.toLowerCase().includes(q) ||
        ic.name.toLowerCase().includes(q) ||
        ic.pinSummary.toLowerCase().includes(q) ||
        ic.keySpecs.some((s) => s.toLowerCase().includes(q))
      );
    });
  }, [selectedDomain, searchQuery]);

  const filteredViva = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return VIVA_QUESTIONS.filter((v) => {
      if (selectedDomain !== "ALL" && v.domain !== selectedDomain) return false;
      if (!q) return true;
      return (
        v.question.toLowerCase().includes(q) ||
        v.answer.toLowerCase().includes(q) ||
        v.labRef.toLowerCase().includes(q)
      );
    });
  }, [selectedDomain, searchQuery]);

  const toggleViva = (id: string) => {
    setExpandedVivaIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-6">
      {/* Top Hero & Subject Filter Header */}
      <div className="bg-gradient-to-br from-[#0f182c] via-[#0b1120] to-[#131d36] border border-[#26365c] rounded-2xl p-6 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1.5 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-cyan-400">
              <span>ENGINEERING LEARNING RESOURCES &amp; REFERENCE LIBRARY</span>
              <span>·</span>
              <span className="text-emerald-300">
                5 SUBJECTS · 75 LABS · FORMULAS · IC PINOUTS · VIVA Q&amp;A
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Comprehensive Electronics Engineering Learning Resources
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Structured engineering formulas, theorem proofs, standard IC
              pinout references (`UA741`, `NE555`, `74LSxx`, `IRF540N`),
              recommended hardware/EDA setups, and viva-voce question banks for
              all 5 core subjects.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onNavigateTab("guide")}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-cyan-500/30 transition-colors cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5" />
              9-Unit DLD Syllabus Guide
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab("glossary")}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-purple-300 border border-purple-500/30 transition-colors cursor-pointer"
            >
              <FileCode2 className="w-3.5 h-3.5" />
              Engineering Glossary
            </button>
          </div>
        </div>

        {/* Interactive Lab & Resource Scrubber Slider */}
        <div className="bg-[#090e1a]/90 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-cyan-300">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <span>
                Interactive Curriculum Lab Explorer Slider (
                {selectedDomain === "ALL"
                  ? "All 75 Labs"
                  : `Subject ${selectedDomain}: 15 Labs`}
                )
              </span>
            </div>
            <span className="text-xs font-mono text-emerald-400 font-bold tabular-nums">
              Selected: {sliderSelectedLab.id} — {sliderSelectedLab.title}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <input
              type="range"
              min={0}
              max={Math.max(0, domainLabs.length - 1)}
              step={1}
              value={Math.min(
                quickLabIndex,
                Math.max(0, domainLabs.length - 1)
              )}
              onChange={(e) => setQuickLabIndex(parseInt(e.target.value, 10))}
              className="flex-1 accent-cyan-400 cursor-pointer"
            />
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() =>
                  onOpenLabInWorkbench(
                    sliderSelectedLab.id,
                    sliderSelectedLab.domain
                  )
                }
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-cyan-400 text-slate-950 hover:bg-cyan-300 transition-colors cursor-pointer"
              >
                Open {sliderSelectedLab.id} Lab &amp; DSO
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() =>
                  onNavigateTab(
                    MASTER_DOMAINS[sliderSelectedLab.domain].appTab
                  )
                }
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
              >
                Subject {sliderSelectedLab.domain} Simulator
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 pt-1">
            <span>
              <strong className="text-slate-200">Objective:</strong>{" "}
              {sliderSelectedLab.objective}
            </span>
            <code className="text-cyan-300 font-mono text-[11px] bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
              {sliderSelectedLab.formula}
            </code>
          </div>
        </div>

        {/* Subject Filter Buttons + Resource Section Tabs + Search */}
        <div className="space-y-3 pt-2 border-t border-slate-800/80">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setSelectedDomain("ALL");
                setQuickLabIndex(0);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                selectedDomain === "ALL"
                  ? "bg-cyan-400 text-slate-950 font-bold"
                  : "bg-slate-900/90 text-slate-300 hover:text-white border border-slate-800"
              }`}
            >
              All 5 Subjects
            </button>
            {(["A", "B", "C", "D", "E"] as MasterDomainId[]).map((domId) => {
              const dom = MASTER_DOMAINS[domId];
              const active = selectedDomain === domId;
              return (
                <button
                  key={domId}
                  type="button"
                  onClick={() => {
                    setSelectedDomain(domId);
                    setQuickLabIndex(0);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    active
                      ? "bg-gradient-to-r from-cyan-400 to-purple-400 text-slate-950 font-bold"
                      : "bg-slate-900/90 text-slate-300 hover:text-white border border-slate-800"
                  }`}
                >
                  Subject {domId}: {dom.title.split("/")[0].trim()}
                </button>
              );
            })}
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search formulas, theorems, IC pinouts (741, 555, 74LS, SCR), viva Q&A..."
                className="w-full pl-8 pr-8 py-1.5 bg-[#090e1a] border border-slate-700/80 focus:border-cyan-400 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: "ALL" as const, label: "All Resources" },
                { id: "FORMULAS" as const, label: "Formulas & Theorems" },
                { id: "IC_PINOUTS" as const, label: "IC Pinouts & Specs" },
                { id: "VIVA_QA" as const, label: "Viva-Voce Q&A" },
                { id: "BENCH_SETUP" as const, label: "Hardware & EDA Stack" },
              ].map((sec) => (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => setActiveResourceSection(sec.id)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                    activeResourceSection === sec.id
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 font-semibold"
                      : "bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800"
                  }`}
                >
                  {sec.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 1: Engineering Formulas & Theorems Compendium */}
      {(activeResourceSection === "ALL" ||
        activeResourceSection === "FORMULAS") && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">
              01. Core Engineering Formulas, Models &amp; Theorems (
              {filteredFormulas.length})
            </h3>
            <span className="text-xs font-mono text-slate-400">
              Linked to Interactive Simulators &amp; Labs
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredFormulas.map((item) => {
              const dom = MASTER_DOMAINS[item.domain];
              return (
                <div
                  key={item.id}
                  className="bg-[#111827] border border-slate-800 hover:border-slate-700 rounded-2xl p-5 flex flex-col justify-between gap-4"
                >
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                      <span className="text-cyan-400 font-semibold">
                        Subject {item.domain} · {dom.title.split("/")[0].trim()}
                      </span>
                      <span className="text-slate-400">
                        Ref Lab: {item.relatedLabId}
                      </span>
                    </div>

                    <h4 className="text-base font-bold text-white">
                      {item.topic}
                    </h4>

                    <div className="p-3 rounded-xl bg-[#070b14] border border-cyan-500/30 font-mono text-xs sm:text-sm font-bold text-cyan-300 overflow-x-auto">
                      {item.formula}
                    </div>

                    <p className="text-xs text-slate-400 font-mono leading-relaxed">
                      {item.variables}
                    </p>

                    <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/70 border border-slate-800/80 rounded-xl p-3">
                      <strong className="text-emerald-400 font-mono mr-1.5">
                        Design Insight:
                      </strong>
                      {item.engineeringNote}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80">
                    <button
                      type="button"
                      onClick={() => onNavigateTab(item.simulatorTab)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 transition-colors cursor-pointer"
                    >
                      Launch Interactive Simulator
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onOpenLabInWorkbench(item.relatedLabId, item.domain)
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
                    >
                      Open Lab {item.relatedLabId}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 2: Standard IC Pinout & Semiconductor Reference Cards */}
      {(activeResourceSection === "ALL" ||
        activeResourceSection === "IC_PINOUTS") && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">
              02. Standard IC Pinouts, Packages &amp; Semiconductor Datasheet
              Reference ({filteredICs.length})
            </h3>
            <span className="text-xs font-mono text-slate-400">
              Bench Wiring &amp; Parameter Guide
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredICs.map((ic) => (
              <div
                key={ic.partNumber}
                className="bg-[#111827] border border-slate-800 rounded-2xl p-5 space-y-3.5 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="text-xs font-mono text-purple-300">
                        Subject {ic.domain} · {ic.packageType}
                      </div>
                      <h4 className="text-base font-bold text-white mt-0.5">
                        {ic.partNumber} — {ic.name}
                      </h4>
                    </div>
                    <span className="text-xs font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-2.5 py-1 rounded-lg">
                      {ic.supplyRails}
                    </span>
                  </div>

                  <div className="bg-[#070b14] border border-slate-800 rounded-xl p-3 text-xs font-mono text-cyan-200 leading-relaxed">
                    <span className="text-slate-400 block mb-1 uppercase text-[10px]">
                      Pinout &amp; Terminal Assignment:
                    </span>
                    {ic.pinSummary}
                  </div>

                  <ul className="space-y-1.5">
                    {ic.keySpecs.map((spec) => (
                      <li
                        key={spec}
                        className="text-xs text-slate-300 flex items-start gap-2"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                        <span>{spec}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex justify-end">
                  <button
                    type="button"
                    onClick={() => onNavigateTab(ic.simulatorTab)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 transition-colors cursor-pointer"
                  >
                    Open Interactive IC Testbench
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 3: Interactive Lab Viva-Voce & Self-Assessment Q&A */}
      {(activeResourceSection === "ALL" ||
        activeResourceSection === "VIVA_QA") && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">
              03. Laboratory Viva-Voce &amp; Conceptual Mastery Q&amp;A (
              {filteredViva.length})
            </h3>
            <span className="text-xs font-mono text-slate-400">
              Click any question to reveal detailed engineering answer
            </span>
          </div>

          <div className="space-y-3">
            {filteredViva.map((item) => {
              const isOpen = !!expandedVivaIds[item.id];
              return (
                <div
                  key={item.id}
                  className="bg-[#111827] border border-slate-800 rounded-2xl overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => toggleViva(item.id)}
                    className="w-full text-left p-4 sm:p-5 flex items-start justify-between gap-4 hover:bg-slate-900/60 transition-colors cursor-pointer"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
                        <HelpCircle className="w-3.5 h-3.5" />
                        <span>
                          Subject {item.domain} ({MASTER_DOMAINS[item.domain].title.split("/")[0].trim()})
                        </span>
                        <span>·</span>
                        <span className="text-slate-400">{item.labRef}</span>
                      </div>
                      <h4 className="text-sm sm:text-base font-bold text-white">
                        {item.question}
                      </h4>
                    </div>
                    <span className="text-xs font-mono text-cyan-300 shrink-0 px-2.5 py-1 rounded bg-slate-900 border border-slate-700">
                      {isOpen ? "Hide Answer" : "Show Answer"}
                    </span>
                  </button>

                  {isOpen && (
                    <div className="px-4 sm:px-5 pb-5 pt-2 border-t border-slate-800/80 bg-[#0b1120] text-xs sm:text-sm text-slate-300 leading-relaxed">
                      <strong className="text-emerald-400 font-mono mr-2">
                        Engineering Explanation:
                      </strong>
                      {item.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 4: Recommended Hardware Bench & EDA Software Stack */}
      {(activeResourceSection === "ALL" ||
        activeResourceSection === "BENCH_SETUP") && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-white">
            04. Recommended Laboratory Hardware Instruments &amp; EDA Software
            Suite
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-300 uppercase tracking-wider">
                <Wrench className="w-4 h-4 text-amber-400" />
                Standard Hardware Bench Equipment (7 Core Instruments)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {RECOMMENDED_LAB_SETUP.hardware.map((hw) => (
                  <div
                    key={hw.name}
                    className="p-3 rounded-xl bg-slate-900/80 border border-slate-800"
                  >
                    <div className="text-xs font-bold text-white">{hw.name}</div>
                    <div className="text-[11px] text-slate-400 mt-1 leading-snug">
                      {hw.spec}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-cyan-300 uppercase tracking-wider">
                <Cpu className="w-4 h-4 text-cyan-400" />
                Standard EDA &amp; FPGA Simulation Stack (6 Industry Tools)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {RECOMMENDED_LAB_SETUP.software.map((sw) => (
                  <div
                    key={sw.name}
                    className="p-3 rounded-xl bg-slate-900/80 border border-slate-800"
                  >
                    <div className="text-xs font-bold text-cyan-300">
                      {sw.name}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1 leading-snug">
                      {sw.spec}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
