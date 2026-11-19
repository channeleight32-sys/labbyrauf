import React from "react";
import { ArrowUpRight } from "lucide-react";

export type ActiveTabId =
  | "home"
  | "my-projects"
  | "recent-work"
  | "saved-circuits"
  | "esp32-lab"
  | "tool-oscilloscope"
  | "tool-logic-analyzer"
  | "tool-signal-generator"
  | "tool-multimeter"
  | "circuit-calculator"
  | "multisim"
  | "master-75"
  | "logic-suite"
  | "rlc"
  | "lca"
  | "power"
  | "cd"
  | "edc"
  | "lab"
  | "simulators"
  | "gates"
  | "kmap"
  | "numbers"
  | "sequential"
  | "msi"
  | "checklist"
  | "glossary"
  | "guide"
  | "resources"
  | "student-learning"
  | "components"
  | "breadboard"
  | "instruments"
  | "vlc"
  | "embedded-lab"
  | "wireless-lab"
  | "robotics-lab"
  | "schematics"
  | "contact"
  | "admin-dashboard";

interface CurriculumGuideProps {
  onNavigateTab: (tab: ActiveTabId) => void;
}

const CURRICULUM_UNITS: {
  num: string;
  title: string;
  targetTab: ActiveTabId;
  summary: string;
  bullets: string[];
  formula: string;
}[] = [
  {
    num: "01",
    title: "Number Systems, Signed Codes & Error Correction",
    targetTab: "numbers",
    summary:
      "Positional radices (Binary, Octal, Hex), 1's and 2's complement signed arithmetic, Gray code, BCD, Excess-3, and Hamming(7,4) SEC codes.",
    bullets: [
      "2's Complement negates a number by inverting all bits and adding 1",
      "Signed overflow occurs when carry into MSB ≠ carry out of MSB (V = C_{n-1} ⊕ C_n)",
      "Reflected Gray code changes only 1 bit per step: G_i = B_{i+1} ⊕ B_i",
    ],
    formula: "Syndrome S = H · r^T (Corrects single-bit error at bit index S)",
  },
  {
    num: "02",
    title: "Boolean Algebra, Postulates & Universal Gates",
    targetTab: "gates",
    summary:
      "Huntington's postulates, De Morgan's duality theorems, Consensus theorem, and functional completeness of NAND and NOR gates.",
    bullets: [
      "De Morgan: (A · B)' = A' + B' and (A + B)' = A' · B'",
      "Any SOP expression maps directly to a 2-level NAND-NAND network",
      "Any POS expression maps directly to a 2-level NOR-NOR network",
    ],
    formula: "Consensus: A·B + A'·C + B·C = A·B + A'·C",
  },
  {
    num: "03",
    title: "Karnaugh Maps & Quine-McCluskey Minimization",
    targetTab: "kmap",
    summary:
      "Visual and tabular reduction of canonical Sum of Products (∑m) and Product of Sums (∏M) expressions with Don't Care (X) conditions.",
    bullets: [
      "Group adjacent 1s (and helpful Xs) in powers of two: 1, 2, 4, 8, 16",
      "Edges wrap around top-to-bottom and left-to-right due to Gray ordering",
      "Essential Prime Implicants cover at least one minterm covered by no other PI",
    ],
    formula: "k-cell group in n-variable K-Map eliminates log₂(k) variables",
  },
  {
    num: "04",
    title: "Combinational Arithmetic: Adders, CLA & ALU",
    targetTab: "msi",
    summary:
      "Half Adder, Full Adder, Ripple-Carry Adder (RCA), Carry Lookahead Adder (CLA), 7485 Magnitude Comparator, and 74181 ALU.",
    bullets: [
      "Half Adder: Sum = A ⊕ B, Carry = A · B",
      "Full Adder: Sum = A ⊕ B ⊕ Cin, Cout = A·B + Cin·(A ⊕ B)",
      "CLA eliminates ripple delay via Generate (G_i = A_i·B_i) & Propagate (P_i = A_i ⊕ B_i)",
    ],
    formula: "C_{i+1} = G_i + P_i · C_i",
  },
  {
    num: "05",
    title: "Multiplexers, Decoders, Encoders & 7-Segment",
    targetTab: "lab",
    summary:
      "Data routing with 2^n:1 Multiplexers, minterm decoding with 74138 (3-to-8 Decoder), priority encoding (74148), and 7447 BCD-to-7-Segment drivers.",
    bullets: [
      "An n-select-line MUX can implement any (n+1)-variable Boolean function",
      "An n-to-2^n Decoder generates all 2^n canonical minterms",
      "74138 outputs are active-LOW; 7447 drives 7-segment display segments a–g",
    ],
    formula: "Y_MUX = ∑ (m_i · I_i)",
  },
  {
    num: "06",
    title: "Latches vs. Edge-Triggered Flip-Flops",
    targetTab: "sequential",
    summary:
      "Bistable cross-coupled SR latches, gated D latches, master-slave & edge-triggered D, JK, T, and SR flip-flops (7473 & 7474).",
    bullets: [
      "Latches are level-sensitive (transparent when Enable is active)",
      "Flip-Flops are edge-triggered (sample inputs strictly on ↑ or ↓ clock transition)",
      "JK Flip-Flop eliminates the SR=11 invalid state by toggling (Q(t+1) = Q'(t))",
    ],
    formula: "JK Characteristic: Q(t+1) = J·Q' + K'·Q",
  },
  {
    num: "07",
    title: "Shift Registers, Ring & Johnson Counters",
    targetTab: "sequential",
    summary:
      "SISO, SIPO, PISO, PIPO universal shift registers (74194), synchronous binary up/down counters (74193), Ring counters, and Johnson counters.",
    bullets: [
      "n-bit Ring Counter circulates a single 1 across n states",
      "n-bit Johnson (Twisted-Ring) Counter feeds Q0' to MSB, yielding 2n glitch-free states",
      "74193 cascades via Terminal Count Up (TCU) and Terminal Count Down (TCD)",
    ],
    formula: "Modulus of n-stage Counter = 2^n (Binary) · 2n (Johnson) · n (Ring)",
  },
  {
    num: "08",
    title: "Synchronous Finite State Machines (Mealy & Moore)",
    targetTab: "sequential",
    summary:
      "State transition diagrams, state assignment (binary vs. one-hot), state minimization, and sequence detector synthesis.",
    bullets: [
      "Moore FSM: Output Z = f(Present State) — synchronous and glitch-resistant",
      "Mealy FSM: Output Z = f(Present State, Input) — reacts in the same clock cycle",
      "Synthesis flow: State Graph → State Table → Excitation K-Maps → Gate Network",
    ],
    formula: "N states require ⌈log₂(N)⌉ flip-flops (Binary) or N flip-flops (One-Hot)",
  },
  {
    num: "09",
    title: "Programmable Logic (ROM, PAL, PLA, CPLD/FPGA) & Timing",
    targetTab: "msi",
    summary:
      "AND-OR fuse arrays (PROM, PAL, PLA), Static Timing Analysis (Setup, Hold, f_max), combinational hazards, and CMOS/TTL electrical noise margins.",
    bullets: [
      "PROM: Fixed AND (decoder) + Programmable OR plane",
      "PAL: Programmable AND + Fixed OR plane (fast, lower area)",
      "PLA: Programmable AND + Programmable OR plane (maximum term sharing)",
    ],
    formula: "T_clk ≥ t_pcq + t_pd(max) + t_su   &   t_pcq + t_cd(min) ≥ t_hold",
  },
];

export default function CurriculumGuide({
  onNavigateTab,
}: CurriculumGuideProps) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white">
          Complete Digital Logic Design Curriculum &amp; Engineering Reference
        </h2>
        <p className="text-sm text-slate-400 mt-1 max-w-3xl">
          Every topic in a standard university Digital Logic Design course is
          mapped below with its governing equations and direct links to the
          interactive simulators in this workbench.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {CURRICULUM_UNITS.map((unit) => (
          <div
            key={unit.num}
            className="bg-[#111827] border border-slate-800 rounded-xl p-5 flex flex-col justify-between gap-4 hover:border-cyan-500/40 transition-colors"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-base font-bold text-white leading-snug">
                  <span className="text-cyan-400 font-mono mr-1.5">
                    {unit.num}.
                  </span>
                  {unit.title}
                </h3>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                {unit.summary}
              </p>

              <ul className="space-y-1.5 text-xs text-slate-400 list-disc pl-4">
                {unit.bullets.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </div>

            <div className="space-y-3 pt-2 border-t border-slate-800/80">
              <div className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 font-mono text-[11px] text-cyan-300">
                {unit.formula}
              </div>

              <button
                type="button"
                onClick={() => onNavigateTab(unit.targetTab)}
                className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-cyan-500/15 text-slate-200 hover:text-cyan-300 border border-slate-800 hover:border-cyan-500/50 transition-colors cursor-pointer"
              >
                Open Interactive Module
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
