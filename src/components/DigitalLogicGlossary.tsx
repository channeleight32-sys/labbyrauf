import React, { useState, useMemo } from "react";
import { Search, X } from "lucide-react";

export type GlossaryDomain =
  | "Combinational Logic"
  | "Sequential Logic"
  | "Number Systems"
  | "Boolean Algebra"
  | "Logic Gates"
  | "Flip-Flops"
  | "State Machines"
  | "Memory Elements";

export interface GlossaryEntry {
  term: string;
  domain: GlossaryDomain;
  definition: string;
  formulaOrNotation: string;
  example: string;
}

const GLOSSARY_ENTRIES: GlossaryEntry[] = [
  // Combinational Logic
  {
    term: "Combinational Circuit",
    domain: "Combinational Logic",
    definition:
      "A digital logic network whose outputs at any instant depend strictly on the present combination of inputs, with zero internal memory or feedback loops.",
    formulaOrNotation: "Y(t) = f(X_1(t), X_2(t), ..., X_n(t))",
    example:
      "Adders, Multiplexers, Decoders, Priority Encoders, and Magnitude Comparators (7485).",
  },
  {
    term: "Half-Adder (HA)",
    domain: "Combinational Logic",
    definition:
      "A 2-input combinational arithmetic circuit that adds two 1-bit binary numbers A and B, producing a Sum bit and a Carry-Out bit, without accepting a Carry-In.",
    formulaOrNotation: "Sum = A ⊕ B  ·  Carry = A · B",
    example:
      "Used for the Least Significant Bit (LSB) stage of a multi-bit binary adder when Cin = 0.",
  },
  {
    term: "Full-Adder (FA)",
    domain: "Combinational Logic",
    definition:
      "A 3-input arithmetic circuit that adds two operand bits A and B plus an incoming Carry-In (Cin), yielding a 1-bit Sum and a Carry-Out (Cout).",
    formulaOrNotation: "Sum = A ⊕ B ⊕ Cin  ·  Cout = A·B + Cin·(A ⊕ B)",
    example:
      "Cascaded 4 times inside a 7483 4-bit binary full-adder IC.",
  },
  {
    term: "Carry Lookahead Adder (CLA)",
    domain: "Combinational Logic",
    definition:
      "A high-speed binary adder that computes all carry bits in parallel using Carry Generate (G_i) and Carry Propagate (P_i) signals, avoiding O(n) ripple-carry delay.",
    formulaOrNotation: "G_i = A_i·B_i  ·  P_i = A_i ⊕ B_i  ·  C_{i+1} = G_i + P_i·C_i",
    example:
      "74182 Carry Lookahead Generator paired with 74181 4-bit ALU stages.",
  },
  {
    term: "Multiplexer (MUX / Data Selector)",
    domain: "Combinational Logic",
    definition:
      "A combinational switch that selects one of 2^n data inputs and routes it to a single output line based on an n-bit binary select address.",
    formulaOrNotation: "Y = ∑ (m_i · I_i) for i = 0 .. 2^n - 1",
    example:
      "74151 (8:1 MUX) and 74153 (Dual 4:1 MUX) used for bus routing and universal function synthesis.",
  },
  {
    term: "Decoder (Binary n-to-2^n)",
    domain: "Combinational Logic",
    definition:
      "A combinational circuit that converts an n-bit binary input code into 2^n mutually exclusive output lines, activating exactly the line matching the input minterm.",
    formulaOrNotation: "Y_k = Enable · m_k",
    example:
      "74138 (3-to-8 Line Decoder with active-low outputs) used for memory chip-select address decoding.",
  },
  {
    term: "Priority Encoder",
    domain: "Combinational Logic",
    definition:
      "An encoder that compresses 2^n request lines into an n-bit binary code corresponding to the highest-priority active input, ignoring lower-priority active inputs.",
    formulaOrNotation: "Out = argmax_i (I_i == 1)",
    example:
      "74148 8-to-3 Priority Encoder used in hardware interrupt controllers.",
  },
  {
    term: "Static Hazard (Glitch)",
    domain: "Combinational Logic",
    definition:
      "A momentary unwanted output pulse (1→0→1 for Static-1, or 0→1→0 for Static-0) caused by unequal gate propagation delays when a single input variable changes state.",
    formulaOrNotation: "Eliminated by adding redundant Consensus Prime Implicants",
    example:
      "In F = A·B + A'·C, when B=C=1 and A transitions 1→0, adding B·C prevents a momentary 0 glitch.",
  },

  // Sequential Logic
  {
    term: "Sequential Circuit",
    domain: "Sequential Logic",
    definition:
      "A digital circuit whose outputs depend on both the present inputs and the past history of inputs stored in bistable memory elements (latches or flip-flops).",
    formulaOrNotation: "S(t+1) = δ(S(t), X(t))  ·  Y(t) = λ(S(t), X(t))",
    example:
      "Binary counters (74193), shift registers (74194), and sequence detectors.",
  },
  {
    term: "Setup Time (t_su) & Hold Time (t_hold)",
    domain: "Sequential Logic",
    definition:
      "Setup time is the minimum interval data must be stable BEFORE the active clock edge; Hold time is the minimum interval data must remain stable AFTER the clock edge.",
    formulaOrNotation: "T_clk ≥ t_pcq + t_pd + t_su  ·  t_ccq + t_cd ≥ t_hold",
    example:
      "Violating t_su or t_hold drives the flip-flop into a metastable state.",
  },
  {
    term: "Metastability",
    domain: "Sequential Logic",
    definition:
      "An unstable equilibrium state in a bistable latch or flip-flop where the output voltage hovers between logic 0 and logic 1 for an unbounded resolution time.",
    formulaOrNotation: "MTBF = exp(t_r / τ) / (T_0 · f_clk · f_async)",
    example:
      "Mitigated by passing asynchronous external signals through a 2-Flip-Flop Synchronizer.",
  },
  {
    term: "Shift Register (SISO / SIPO / PISO / PIPO)",
    domain: "Sequential Logic",
    definition:
      "A cascade of flip-flops sharing a common clock where each stage passes its stored bit to the next stage on every active clock transition.",
    formulaOrNotation: "Q_i(t+1) = Q_{i+1}(t)",
    example:
      "74194 4-bit bidirectional universal shift register used in UART serial-to-parallel converters.",
  },
  {
    term: "Johnson Counter (Twisted-Ring Counter)",
    domain: "Sequential Logic",
    definition:
      "A shift-register counter in which the complemented output Q' of the last stage is fed back to the D input of the first stage, producing 2n glitch-free states.",
    formulaOrNotation: "Modulus = 2n for n flip-flops",
    example:
      "A 4-bit Johnson counter cycles through 8 states: 0000→1000→1100→1110→1111→0111→0011→0001.",
  },

  // Number Systems
  {
    term: "Two's Complement Representation",
    domain: "Number Systems",
    definition:
      "The standard signed binary number system where the MSB has negative weight (-2^{n-1}), allowing hardware adders to perform signed addition and subtraction identically.",
    formulaOrNotation: "-X = (~X) + 1  ·  Range: [-2^{n-1}, +2^{n-1} - 1]",
    example:
      "In 8-bit 2's complement, -23 is represented as 11101001₂ (256 - 23 = 233).",
  },
  {
    term: "Reflected Gray Code",
    domain: "Number Systems",
    definition:
      "A non-weighted binary code in which consecutive values differ in strictly one bit position (unit Hamming distance), preventing transient multi-bit switching errors.",
    formulaOrNotation: "G_i = B_{i+1} ⊕ B_i  (with G_{n-1} = B_{n-1})",
    example:
      "3-bit Gray sequence: 000, 001, 011, 010, 110, 111, 101, 100 (used in K-Map axes and FIFO pointers).",
  },
  {
    term: "Binary-Coded Decimal (8421 BCD)",
    domain: "Number Systems",
    definition:
      "An encoding where each decimal digit (0–9) is represented by its own 4-bit binary nibble (0000₂ to 1001₂); bit patterns 1010₂–1111₂ are invalid Don't Cares.",
    formulaOrNotation: "Value = 8·b_3 + 4·b_2 + 2·b_1 + 1·b_0 ∈ [0, 9]",
    example:
      "Decimal 42 is encoded in BCD as 0100 0010₂ and decoded by a 7447 7-segment driver.",
  },
  {
    term: "Hamming(7,4) Error-Correcting Code",
    domain: "Number Systems",
    definition:
      "A linear block code that embeds 3 even-parity check bits (P1, P2, P4) into 4 data bits (D3, D5, D6, D7) to detect and correct any single-bit error via a 3-bit syndrome.",
    formulaOrNotation: "Minimum Hamming Distance d_min = 3 (1-bit correction, 2-bit detection)",
    example:
      "A syndrome S4S2S1 = 101₂ (5) immediately identifies that bit #5 (D5) was inverted.",
  },

  // Boolean Algebra
  {
    term: "Minterm (m_i) & Maxterm (M_i)",
    domain: "Boolean Algebra",
    definition:
      "A Minterm is a standard product (AND) term containing all n variables that evaluates to 1 for exactly one input row; a Maxterm is a standard sum (OR) term evaluating to 0 for one row.",
    formulaOrNotation: "m_i = (M_i)'  ·  F = ∑ m(i) = ∏ M(j)",
    example:
      "For 3 variables (A,B,C), minterm m5 (101₂) = A·B'·C and maxterm M5 = (A' + B + C').",
  },
  {
    term: "De Morgan's Theorems",
    domain: "Boolean Algebra",
    definition:
      "Fundamental duality laws stating that the complement of a product equals the sum of the complements, and the complement of a sum equals the product of the complements.",
    formulaOrNotation: "(A · B)' = A' + B'  ·  (A + B)' = A' · B'",
    example:
      "Allows any AND-OR Sum of Products network to be converted directly into a 2-level NAND-NAND circuit.",
  },
  {
    term: "Karnaugh Map (K-Map) & Prime Implicants",
    domain: "Boolean Algebra",
    definition:
      "A 2D Gray-coded truth table grid where power-of-two rectangular loops of 1s (and Don't Cares) visually eliminate complemented variables to yield minimal SOP/POS expressions.",
    formulaOrNotation: "Group of 2^k cells in n-variable K-Map leaves (n - k) literals",
    example:
      "An 8-cell octet loop in a 4-variable K-Map eliminates 3 variables, leaving a single literal.",
  },
  {
    term: "Consensus Theorem",
    domain: "Boolean Algebra",
    definition:
      "An algebraic theorem showing that given A·B + A'·C, the third product term B·C (the consensus of A·B and A'·C) is logically redundant for steady-state value.",
    formulaOrNotation: "A·B + A'·C + B·C = A·B + A'·C",
    example:
      "Used in reverse during timing verification to eliminate Static-1 hazards.",
  },

  // Logic Gates
  {
    term: "Universal Gates (NAND & NOR)",
    domain: "Logic Gates",
    definition:
      "A logic gate type that is functionally complete on its own, meaning any Boolean function (NOT, AND, OR, XOR) can be synthesized using solely gates of that single type.",
    formulaOrNotation: "NOT(A) = A NAND A  ·  A AND B = (A NAND B) NAND (A NAND B)",
    example:
      "CMOS ASIC standard cell libraries and NAND Flash arrays rely heavily on 7400-style NAND primitives.",
  },
  {
    term: "Exclusive-OR (XOR) & Equivalence (XNOR)",
    domain: "Logic Gates",
    definition:
      "XOR outputs HIGH strictly when its two inputs differ (odd function); XNOR outputs HIGH strictly when its two inputs match (1-bit equality comparator).",
    formulaOrNotation: "A ⊕ B = A·B' + A'·B  ·  (A ⊕ B)' = A·B + A'·B'",
    example:
      "Used in binary adders, parity generators/checkers, Gray code converters, and LFSRs.",
  },
  {
    term: "Noise Margin (NM_H & NM_L)",
    domain: "Logic Gates",
    definition:
      "The maximum extraneous noise voltage amplitude that can be superimposed on a gate output signal without causing the receiving gate to misinterpret the logic state.",
    formulaOrNotation: "NM_H = V_OH(min) - V_IH(min)  ·  NM_L = V_IL(max) - V_OL(max)",
    example:
      "5V 74HC CMOS provides a 1.4V HIGH noise margin, compared to 0.7V for 74LS TTL.",
  },

  // Flip-Flops
  {
    term: "SR Latch vs. Edge-Triggered Flip-Flop",
    domain: "Flip-Flops",
    definition:
      "A latch is level-sensitive (transparent whenever Enable is active), whereas a flip-flop is edge-triggered and samples its inputs strictly at the rising (↑) or falling (↓) clock edge.",
    formulaOrNotation: "SR Latch: Q = (R + Q')'  ·  Invalid when S = R = 1",
    example:
      "7474 Dual Positive-Edge-Triggered D Flip-Flop vs. 74373 Transparent Latch.",
  },
  {
    term: "D (Data / Delay) Flip-Flop",
    domain: "Flip-Flops",
    definition:
      "A single-input edge-triggered storage element that captures the logic level on pin D at the active clock transition and holds it on Q until the next clock edge.",
    formulaOrNotation: "Q(t+1) = D",
    example:
      "Fundamental building block of CPU pipeline registers and synchronous SRAM registers.",
  },
  {
    term: "JK & T (Toggle) Flip-Flops",
    domain: "Flip-Flops",
    definition:
      "A JK flip-flop behaves like an SR flip-flop except J=K=1 toggles the output (Q' ← Q); tying J and K together forms a T (Toggle) flip-flop ideal for binary counters.",
    formulaOrNotation: "JK: Q(t+1) = J·Q' + K'·Q  ·  T: Q(t+1) = T ⊕ Q",
    example:
      "7473 Dual JK Flip-Flop used in ripple and synchronous modulo-N counters.",
  },

  // State Machines
  {
    term: "Moore Finite State Machine",
    domain: "State Machines",
    definition:
      "A synchronous FSM architecture in which the outputs are a function strictly of the present state register values, guaranteeing outputs change synchronously with the clock.",
    formulaOrNotation: "Output Z(t) = λ(Present_State(t))",
    example:
      "A 1011 sequence detector in Moore form requires 5 states (S0–S4) with output written inside each state circle.",
  },
  {
    term: "Mealy Finite State Machine",
    domain: "State Machines",
    definition:
      "A synchronous FSM architecture in which outputs depend on both the present state and the current primary inputs, allowing immediate output response in fewer states.",
    formulaOrNotation: "Output Z(t) = λ(Present_State(t), Input_X(t))",
    example:
      "A 1011 sequence detector in Mealy form requires only 4 states (S0–S3) with Input/Output labels on directed arcs.",
  },
  {
    term: "One-Hot vs. Binary State Encoding",
    domain: "State Machines",
    definition:
      "Binary encoding uses ⌈log₂(N)⌉ flip-flops for N states; One-Hot encoding uses N flip-flops where exactly one bit is HIGH per state, simplifying next-state decode logic.",
    formulaOrNotation: "8-State FSM: 3 FFs (Binary) vs. 8 FFs (One-Hot: 00000001..10000000)",
    example:
      "FPGAs (rich in flip-flops) favor One-Hot encoding for high-frequency state machines.",
  },

  // Memory Elements
  {
    term: "Programmable Logic Array (PLA) & PAL",
    domain: "Memory Elements",
    definition:
      "Two-level AND-OR programmable logic devices. A PLA has both a programmable AND plane and a programmable OR plane; a PAL has a programmable AND plane and fixed OR plane.",
    formulaOrNotation: "F_j = ∑ (OR_fuse_{j,k} · ∏ AND_fuse_{k,i})",
    example:
      "Used to implement multi-output combinational control logic with shared product terms.",
  },
  {
    term: "SRAM vs. DRAM Memory Cells",
    domain: "Memory Elements",
    definition:
      "Static RAM (SRAM) stores each bit in a 6-transistor cross-coupled CMOS inverter latch (fast, no refresh); Dynamic RAM (DRAM) stores each bit as charge on a 1T-1C capacitor requiring periodic refresh.",
    formulaOrNotation: "SRAM: 6T Bistable Latch  ·  DRAM: 1T + 1C Charge Storage",
    example:
      "CPU L1/L2 caches use SRAM; main system memory uses high-density synchronous DRAM (SDRAM).",
  },
  {
    term: "FPGA Look-Up Table (LUT)",
    domain: "Memory Elements",
    definition:
      "A small programmable SRAM truth-table memory cell paired with a multiplexer inside an FPGA Configurable Logic Block (CLB) capable of implementing any k-input Boolean function.",
    formulaOrNotation: "k-Input LUT = 2^k × 1-bit SRAM + (2^k : 1) Multiplexer",
    example:
      "A 4-input LUT (16 SRAM bits) can act as any 4-variable logic gate network in constant propagation delay.",
  },
];

const DOMAINS: ("All" | GlossaryDomain)[] = [
  "All",
  "Combinational Logic",
  "Sequential Logic",
  "Number Systems",
  "Boolean Algebra",
  "Logic Gates",
  "Flip-Flops",
  "State Machines",
  "Memory Elements",
];

export default function DigitalLogicGlossary() {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedDomain, setSelectedDomain] = useState<"All" | GlossaryDomain>(
    "All"
  );

  const filteredEntries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return GLOSSARY_ENTRIES.filter((entry) => {
      const matchesDomain =
        selectedDomain === "All" || entry.domain === selectedDomain;
      if (!matchesDomain) return false;
      if (!q) return true;
      return (
        entry.term.toLowerCase().includes(q) ||
        entry.definition.toLowerCase().includes(q) ||
        entry.formulaOrNotation.toLowerCase().includes(q) ||
        entry.example.toLowerCase().includes(q)
      );
    });
  }, [searchQuery, selectedDomain]);

  return (
    <div className="space-y-8">
      {/* Header, Search Input & Domain Filter */}
      <div className="bg-[#111827] border border-slate-800 rounded-xl p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white">
              Digital Logic Design Engineering Glossary ({GLOSSARY_ENTRIES.length}{" "}
              Core Concepts)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Search and filter across combinational logic, sequential circuits,
              number systems, Boolean algebra, logic gates, flip-flops, FSMs,
              and memory architectures.
            </p>
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search terms, ICs (74138), equations..."
              className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-8 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Domain Filter Bar */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl">
          {DOMAINS.map((dom) => (
            <button
              key={dom}
              type="button"
              onClick={() => setSelectedDomain(dom)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                selectedDomain === dom
                  ? "bg-cyan-500/20 text-cyan-300 font-semibold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {dom}
            </button>
          ))}
        </div>
      </div>

      {/* Glossary Cards Grid */}
      {filteredEntries.length === 0 ? (
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-10 text-center space-y-3">
          <p className="text-sm text-slate-300 font-semibold">
            No glossary entries matched &quot;{searchQuery}&quot; in{" "}
            {selectedDomain}.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setSelectedDomain("All");
            }}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-cyan-500 text-slate-950 cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredEntries.map((item) => (
            <div
              key={item.term}
              className="bg-[#111827] border border-slate-800 rounded-xl p-5 flex flex-col justify-between gap-4 hover:border-cyan-500/40 transition-colors"
            >
              <div className="space-y-2.5">
                <div>
                  <div className="text-xs font-mono text-cyan-400">
                    {item.domain}
                  </div>
                  <h3 className="text-base font-bold text-white mt-0.5">
                    {item.term}
                  </h3>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {item.definition}
                </p>

                <p className="text-xs text-slate-400 leading-relaxed">
                  <strong className="text-slate-200">Hardware Example: </strong>
                  {item.example}
                </p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 font-mono text-[11px] text-emerald-400 break-words">
                {item.formulaOrNotation}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
