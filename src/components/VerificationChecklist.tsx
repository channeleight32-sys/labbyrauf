import React, { useState, useMemo } from "react";
import {
  CheckSquare,
  Square,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
} from "lucide-react";

export interface ChecklistItem {
  id: string;
  category:
    | "Functional Correctness"
    | "Timing Considerations"
    | "Power Consumption"
    | "Testability (DFT)"
    | "Design Rules (DRC)";
  title: string;
  severity: "CRITICAL" | "HIGH" | "STANDARD";
  criterion: string;
  verificationMethod: string;
  commonPitfall: string;
  formulaOrRule: string;
}

const CHECKLIST_ITEMS: ChecklistItem[] = [
  // 1. Functional Correctness
  {
    id: "func-1",
    category: "Functional Correctness",
    title: "Exhaustive Truth-Table & Minterm Coverage",
    severity: "CRITICAL",
    criterion:
      "Verify all 2^n input combinations (for n ≤ 10) or targeted corner-case vectors match the canonical specification.",
    verificationMethod:
      "Compare post-minimization SOP/POS gate netlist output against golden canonical minterm list ∑m.",
    commonPitfall:
      "Omitting a Prime Implicant when grouping K-Map cells or misassigning Gray-code row/column indices (00, 01, 11, 10).",
    formulaOrRule: "∀ x ∈ {0,1}^n : F_impl(x) == F_spec(x)",
  },
  {
    id: "func-2",
    category: "Functional Correctness",
    title: "Don't Care (X) Safe Resolution",
    severity: "HIGH",
    criterion:
      "Confirm all Don't Care input states resolve to deterministic, safe outputs if an invalid input code (e.g., BCD 1010–1111) occurs in hardware.",
    verificationMethod:
      "Apply out-of-range input vectors (10–15 in BCD) and confirm no downstream bus contention or latch lockup is triggered.",
    commonPitfall:
      "Assuming Don't Care inputs can never occur during power-up transients or noisy sensor reads.",
    formulaOrRule: "F(X_invalid) ∈ {0, 1} (Deterministic Safe State)",
  },
  {
    id: "func-3",
    category: "Functional Correctness",
    title: "Arithmetic Overflow, Carry-Out & Sign Extension",
    severity: "CRITICAL",
    criterion:
      "Validate unsigned carry-out (Cout) and signed 2's complement overflow (V = C_{n-1} ⊕ C_n) across boundary values (-2^{n-1}, 0, +2^{n-1}-1).",
    verificationMethod:
      "Test maximum positive + 1 (e.g. +127 + 1) and minimum negative - 1 (-128 - 1) and verify status flags Z, N, C, V.",
    commonPitfall:
      "Using unsigned carry-out Cout as a signed overflow indicator, or zero-extending instead of sign-extending negative 2's complement numbers.",
    formulaOrRule: "V = C_{MSB_in} ⊕ C_{MSB_out} = A_{n-1}·B_{n-1}·S'_{n-1} + A'_{n-1}·B'_{n-1}·S_{n-1}",
  },
  {
    id: "func-4",
    category: "Functional Correctness",
    title: "FSM Unreachable & Deadlock State Recovery",
    severity: "CRITICAL",
    criterion:
      "Ensure unused state encodings (2^k - N states) transition back to the idle/reset state S0 within 1 clock cycle.",
    verificationMethod:
      "Force state flip-flops into every unused binary encoding and verify next-state logic routes to S0.",
    commonPitfall:
      "Treating unused FSM states as Don't Cares during K-Map synthesis, creating an inescapable hang loop if a cosmic ray or brownout flips a state bit.",
    formulaOrRule: "∀ S_unused : NextState(S_unused, X) = S_reset",
  },
  {
    id: "func-5",
    category: "Functional Correctness",
    title: "Deterministic Power-On Reset (POR) Initialization",
    severity: "HIGH",
    criterion:
      "Verify all sequential elements (flip-flops, counters, registers, FSM state bits) initialize to a known state upon assertion of Reset.",
    verificationMethod:
      "Simulate circuit startup with unknown (X) initial flip-flop states and assert Reset to confirm all outputs resolve to 0 or 1.",
    commonPitfall:
      "Leaving data-path pipeline registers or ring counters without an explicit preset/clear path.",
    formulaOrRule: "Reset = 1 ⇒ Q(0) = Q_init ∈ {0, 1}",
  },

  // 2. Timing Considerations
  {
    id: "time-1",
    category: "Timing Considerations",
    title: "Setup Time (t_su) & Maximum Clock Frequency (f_max)",
    severity: "CRITICAL",
    criterion:
      "Confirm worst-case combinational path delay plus clock-to-Q delay and setup time fits within the target clock period T_clk.",
    verificationMethod:
      "Identify the longest critical path (deepest cascade of gates/ripple carry) and compute T_clk - (t_pcq + t_pd_max + t_su + t_skew).",
    commonPitfall:
      "Ignoring wire interconnect capacitance or high fan-out loading on the critical path.",
    formulaOrRule: "T_clk ≥ t_pcq(max) + t_pd(max) + t_su + t_skew",
  },
  {
    id: "time-2",
    category: "Timing Considerations",
    title: "Hold Time (t_hold) Race Immunity",
    severity: "CRITICAL",
    criterion:
      "Verify shortest contamination path delay (t_ccq + t_cd) exceeds flip-flop hold time plus clock skew at every temperature/voltage corner.",
    verificationMethod:
      "Audit back-to-back shift register stages (where t_cd = 0) and clock tree routing direction.",
    commonPitfall:
      "Routing clock signals in the same direction as data flow, causing downstream flip-flops to clock late and violate hold time (irrecoverable by slowing the clock!).",
    formulaOrRule: "t_ccq(min) + t_cd(min) ≥ t_hold + t_skew",
  },
  {
    id: "time-3",
    category: "Timing Considerations",
    title: "Static & Dynamic Hazard (Glitch) Elimination",
    severity: "HIGH",
    criterion:
      "Ensure combinational outputs driving asynchronous clear/preset pins or clock-crossing interfaces are free of Static-1 and Static-0 hazards.",
    verificationMethod:
      "Inspect K-Map for adjacent 1-cells not covered by a shared Prime Implicant loop; add consensus terms where required.",
    commonPitfall:
      "Relying on minimal SOP without redundant consensus implicants when the combinational output feeds an asynchronous counter CLR pin.",
    formulaOrRule: "Add Consensus Term B·C to A·B + A'·C to prevent 1→0→1 glitch",
  },
  {
    id: "time-4",
    category: "Timing Considerations",
    title: "Asynchronous Input Synchronization & Metastability MTBF",
    severity: "CRITICAL",
    criterion:
      "Pass all external pushbuttons, sensors, and cross-domain signals through at least a 2-stage D Flip-Flop synchronizer before feeding FSM logic.",
    verificationMethod:
      "Verify no asynchronous input fans out to more than one flip-flop directly (which causes incoherent state splitting).",
    commonPitfall:
      "Feeding an unsynchronized external input into two different state flip-flops simultaneously, causing one to see 0 and the other 1 on a clock edge.",
    formulaOrRule: "MTBF = exp(t_res / τ) / (T_0 · f_clk · f_data)",
  },

  // 3. Power Consumption
  {
    id: "pwr-1",
    category: "Power Consumption",
    title: "No Floating CMOS Inputs (Crowbar Current Prevention)",
    severity: "CRITICAL",
    criterion:
      "Tie every unused input pin of CMOS ICs (including unused gates in quad/hex packages like 74HC00/74HC04) directly to VDD or GND.",
    verificationMethod:
      "Inspect schematic netlist for unconnected input pins on all multi-gate IC packages.",
    commonPitfall:
      "Leaving unused inputs floating at ~VDD/2, which turns on both PMOS and NMOS simultaneously and draws destructive short-circuit current.",
    formulaOrRule: "V_in_unused ∈ {GND, VDD} (Never Hi-Z)",
  },
  {
    id: "pwr-2",
    category: "Power Consumption",
    title: "Dynamic Switching Activity & Clock Gating",
    severity: "STANDARD",
    criterion:
      "Minimize unnecessary bit toggling on high-capacitance buses and disable clocks to idle register banks using synchronous Clock-Enable (CE).",
    verificationMethod:
      "Measure toggle rate α on wide data buses and arithmetic units during no-op cycles.",
    commonPitfall:
      "Letting a multiplier or barrel shifter continuously evaluate changing bus data when its output is not selected by the downstream MUX.",
    formulaOrRule: "P_dynamic = α · C_load · V_DD² · f_clk",
  },
  {
    id: "pwr-3",
    category: "Power Consumption",
    title: "Fan-Out & DC Drive Current Budget",
    severity: "HIGH",
    criterion:
      "Ensure the sum of input currents (∑ I_IH, ∑ I_IL) of all driven loads does not exceed the driver output rating (I_OH_max, I_OL_max).",
    verificationMethod:
      "Calculate fan-out N_max = min(|I_OH / I_IH|, |I_OL / I_IL|) especially when interfacing 74LS TTL with 74HC CMOS.",
    commonPitfall:
      "Driving more than 10 standard TTL inputs from a single gate output, degrading V_OH below the V_IH noise threshold.",
    formulaOrRule: "N_fanout ≤ min( ⌊I_OH / I_IH⌋, ⌊I_OL / I_IL⌋ )",
  },

  // 4. Testability (DFT)
  {
    id: "dft-1",
    category: "Testability (DFT)",
    title: "Single Stuck-At-0 (SA0) & Stuck-At-1 (SA1) Observability",
    severity: "HIGH",
    criterion:
      "Ensure every internal gate node can be controlled to both 0 and 1 from primary inputs and its effect observed at a primary output.",
    verificationMethod:
      "Generate a test vector set that sensitizes each internal net and propagates any SA0/SA1 fault to an output pin.",
    commonPitfall:
      "Adding redundant Consensus gates without a test-mode disable pin, making the redundant gate untestable for Stuck-At-0 faults.",
    formulaOrRule: "Fault Coverage % = (Detected SA0/SA1 Faults) / (Total Possible Faults)",
  },
  {
    id: "dft-2",
    category: "Testability (DFT)",
    title: "Scan-Chain & State Register Controllability",
    severity: "STANDARD",
    criterion:
      "Provide a mechanism (Scan-Enable muxed D flip-flops or parallel load) to shift arbitrary test patterns into deep sequential counters/FSMs.",
    verificationMethod:
      "Verify that a 16-bit counter does not require 65,536 clock cycles just to test its Terminal Count (TC) output in production testing.",
    commonPitfall:
      "Designing deeply cascaded ripple counters with no parallel load or preset pin, making test time exponential.",
    formulaOrRule: "D_scan = SE' · D_func + SE · Scan_In",
  },
  {
    id: "dft-3",
    category: "Testability (DFT)",
    title: "Probe Points & Output Visibility on Key Control Nets",
    severity: "STANDARD",
    criterion:
      "Expose critical internal state bits, carry-out signals, and error syndrome flags to observable test points or LEDs.",
    verificationMethod:
      "Confirm FSM state encoding bits Q_n..Q_0 are accessible to a logic analyzer.",
    commonPitfall:
      "Burying state registers inside an opaque module where only a single 1-bit Mealy output is visible.",
    formulaOrRule: "Observability(Node) > 0 for all FSM state variables",
  },

  // 5. Adherence to Design Rules (DRC)
  {
    id: "drc-1",
    category: "Design Rules (DRC)",
    title: "Strict Synchronous Clocking (No Logic-Gated Clocks)",
    severity: "CRITICAL",
    criterion:
      "Never drive a flip-flop CLK pin from the output of an AND/OR/XOR gate or combinational decoder; use a global clock and synchronous Enable.",
    verificationMethod:
      "Trace every flip-flop CLK pin back to the primary clock source with zero combinational gates in series.",
    commonPitfall:
      "Wiring CLK_gated = CLK · EN with an AND gate, which introduces clock skew and passes EN glitches as false clock edges.",
    formulaOrRule: "D_next = EN ? Data_In : Q_current (with direct global CLK)",
  },
  {
    id: "drc-2",
    category: "Design Rules (DRC)",
    title: "Zero Combinational Feedback Loops",
    severity: "CRITICAL",
    criterion:
      "Ensure no combinational gate output feeds back into its own input path without passing through an edge-triggered flip-flop.",
    verificationMethod:
      "Perform a directed acyclic graph (DAG) topological check on the combinational logic netlist.",
    commonPitfall:
      "Accidental feedback loops in unclocked logic that create uncontrolled ring oscillators (when inversion count is odd) or unclocked latches.",
    formulaOrRule: "Combinational Graph G = (V, E) must be a strict DAG",
  },
  {
    id: "drc-3",
    category: "Design Rules (DRC)",
    title: "Single Push-Pull Driver per Net (No Bus Contention)",
    severity: "CRITICAL",
    criterion:
      "Confirm no two totem-pole / push-pull gate outputs are wired together on the same net; use a Multiplexer or mutually-exclusive Tri-State buffers.",
    verificationMethod:
      "Check netlist for any wire driven by >1 output port.",
    commonPitfall:
      "Shorting two outputs together thinking it forms a 'wired-OR', which causes a VDD-to-GND short when one outputs 1 and the other outputs 0.",
    formulaOrRule: "∀ Net_i : |Drivers(Net_i)| ≤ 1 (or ∑ OE_k ≤ 1 for Tri-State)",
  },
  {
    id: "drc-4",
    category: "Design Rules (DRC)",
    title: "Voltage Level Translation Across Mixed Logic Families",
    severity: "HIGH",
    criterion:
      "Verify V_OH(driver) ≥ V_IH(receiver) + NM_H when connecting 5V TTL (74LS) to 5V CMOS (74HC) or 3.3V LVTTL.",
    verificationMethod:
      "Check that 74LS TTL (V_OH_min = 2.7V) uses a pull-up resistor or 74HCT buffer before driving 74HC CMOS (V_IH_min = 3.5V).",
    commonPitfall:
      "Directly connecting a 74LS output (2.7V HIGH) to a 74HC input (requires 3.5V HIGH), resulting in intermittent logic failures.",
    formulaOrRule: "Use 74HCT (V_IH = 2.0V) as level-compatible bridge from 74LS to 74HC",
  },
];

const CATEGORIES = [
  "All",
  "Functional Correctness",
  "Timing Considerations",
  "Power Consumption",
  "Testability (DFT)",
  "Design Rules (DRC)",
] as const;

export default function VerificationChecklist() {
  const [checkedIds, setCheckedIds] = useState<Record<string, boolean>>({
    "func-1": true,
    "time-1": true,
    "drc-1": true,
    "drc-3": true,
  });
  const [activeCategory, setActiveCategory] =
    useState<(typeof CATEGORIES)[number]>("All");
  const [copiedReport, setCopiedReport] = useState(false);

  // Interactive Dynamic Power & Fault Coverage Mini-Calculator
  const [gateCount, setGateCount] = useState<number>(250);
  const [clockFreqMHz, setClockFreqMHz] = useState<number>(50);
  const [supplyVdd, setSupplyVdd] = useState<number>(3.3);
  const [activityAlpha, setActivityAlpha] = useState<number>(0.2);

  const toggleItem = (id: string) => {
    setCheckedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredItems = useMemo(() => {
    if (activeCategory === "All") return CHECKLIST_ITEMS;
    return CHECKLIST_ITEMS.filter((item) => item.category === activeCategory);
  }, [activeCategory]);

  const totalCount = CHECKLIST_ITEMS.length;
  const completedCount = CHECKLIST_ITEMS.filter(
    (item) => checkedIds[item.id]
  ).length;
  const completionPct = Math.round((completedCount / totalCount) * 100);

  const criticalRemaining = CHECKLIST_ITEMS.filter(
    (item) => item.severity === "CRITICAL" && !checkedIds[item.id]
  ).length;

  // Dynamic Power calculation: P = N_gates * alpha * C_gate(5pF) * Vdd^2 * f
  const cLoadPf = 0.05; // 50 fF per gate average
  const dynamicPowerMw =
    gateCount *
    activityAlpha *
    (cLoadPf * 1e-12) *
    Math.pow(supplyVdd, 2) *
    (clockFreqMHz * 1e6) *
    1000;

  const totalStuckAtFaults = gateCount * 6; // ~6 fault sites per 2-input gate

  const handleCopySignoff = () => {
    const lines = [
      `DIGITAL LOGIC DESIGN VERIFICATION SIGN-OFF REPORT`,
      `Completion: ${completedCount}/${totalCount} (${completionPct}%) · Critical Unresolved: ${criticalRemaining}`,
      `------------------------------------------------------------`,
      ...CHECKLIST_ITEMS.map(
        (it) =>
          `[${checkedIds[it.id] ? "PASS" : "OPEN"}] (${it.severity}) ${
            it.category
          } — ${it.title}`
      ),
    ];
    navigator.clipboard?.writeText(lines.join("\n"));
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2000);
  };

  return (
    <div className="space-y-8">
      {/* Top Sign-off Summary & Category Filter Bar */}
      <div className="bg-[#111827] border border-slate-800 rounded-xl p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-white">
              01. Comprehensive Digital Logic Design Verification Checklist
            </h2>
            <p className="text-xs text-slate-400 max-w-3xl">
              Use this engineering sign-off checklist to audit your combinational
              and sequential circuits across functional correctness, static
              timing, CMOS/TTL power, DFT fault testability, and synchronous
              design rules.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                const all: Record<string, boolean> = {};
                CHECKLIST_ITEMS.forEach((it) => (all[it.id] = true));
                setCheckedIds(all);
              }}
              className="px-3 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer whitespace-nowrap"
            >
              Mark All Verified
            </button>
            <button
              type="button"
              onClick={() => setCheckedIds({})}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors cursor-pointer whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Checklist
            </button>
            <button
              type="button"
              onClick={handleCopySignoff}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-colors cursor-pointer whitespace-nowrap"
            >
              {copiedReport ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Copied Sign-Off Report
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copy Sign-Off Report
                </>
              )}
            </button>
          </div>
        </div>

        {/* Progress Bar & Telemetry Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-4">
            <div className="text-xs font-mono text-slate-400">
              VERIFICATION COVERAGE
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-mono font-bold text-white tabular-nums">
                {completedCount} / {totalCount} ({completionPct}%)
              </span>
              <span className="text-xs font-mono text-cyan-400">
                5 Core Domains
              </span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden mt-2.5">
              <div
                className="h-full bg-emerald-400 transition-all duration-200"
                style={{ width: `${completionPct}%` }}
              />
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-4">
            <div className="text-xs font-mono text-slate-400">
              CRITICAL SIGN-OFF GATE
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              {criticalRemaining === 0 ? (
                <span className="inline-flex items-center gap-1.5 text-lg font-mono font-bold text-emerald-400">
                  <CheckCircle2 className="w-5 h-5" />● READY FOR TAPE-OUT / LAB
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-lg font-mono font-bold text-amber-400">
                  <AlertTriangle className="w-5 h-5" />▲ {criticalRemaining}{" "}
                  CRITICAL CHECKS OPEN
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              All CRITICAL rules must pass to prevent bus contention, hold
              violations, or metastable lockup.
            </p>
          </div>

          {/* Category Breakdown */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-4 flex flex-col justify-between">
            <div className="text-xs font-mono text-slate-400">
              DOMAIN COMPLETION BREAKDOWN
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs font-mono mt-1.5">
              {CATEGORIES.slice(1).map((cat) => {
                const catTotal = CHECKLIST_ITEMS.filter(
                  (i) => i.category === cat
                ).length;
                const catDone = CHECKLIST_ITEMS.filter(
                  (i) => i.category === cat && checkedIds[i.id]
                ).length;
                return (
                  <div key={cat} className="flex justify-between">
                    <span className="text-slate-400 truncate">
                      {cat.split(" ")[0]}:
                    </span>
                    <span
                      className={
                        catDone === catTotal
                          ? "text-emerald-400 font-bold"
                          : "text-slate-200"
                      }
                    >
                      {catDone}/{catTotal}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Interactive Category Filter Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                activeCategory === cat
                  ? "bg-cyan-500/20 text-cyan-300 font-semibold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Checklist Cards List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredItems.map((item) => {
          const isChecked = !!checkedIds[item.id];
          return (
            <div
              key={item.id}
              onClick={() => toggleItem(item.id)}
              className={`bg-[#111827] border rounded-xl p-5 transition-colors cursor-pointer flex flex-col justify-between gap-4 ${
                isChecked
                  ? "border-emerald-500/40 bg-emerald-950/10"
                  : "border-slate-800 hover:border-cyan-500/40"
              }`}
            >
              <div className="space-y-2.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleItem(item.id);
                      }}
                      className="mt-0.5 text-cyan-400 shrink-0 cursor-pointer"
                      aria-label={`Toggle ${item.title}`}
                    >
                      {isChecked ? (
                        <CheckSquare className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <Square className="w-5 h-5 text-slate-500" />
                      )}
                    </button>
                    <div>
                      <h3
                        className={`text-base font-bold ${
                          isChecked ? "text-emerald-200" : "text-white"
                        }`}
                      >
                        {item.title}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-slate-400 mt-0.5">
                        <span>{item.category}</span>
                        <span aria-hidden="true">·</span>
                        <span
                          className={
                            item.severity === "CRITICAL"
                              ? "text-rose-400 font-semibold"
                              : item.severity === "HIGH"
                              ? "text-amber-300 font-semibold"
                              : "text-cyan-300"
                          }
                        >
                          {item.severity} PRIORITY
                        </span>
                        <span aria-hidden="true">·</span>
                        <span
                          className={
                            isChecked
                              ? "text-emerald-400 font-bold"
                              : "text-slate-500"
                          }
                        >
                          {isChecked ? "✓ VERIFIED" : "○ PENDING"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed pl-8">
                  <strong className="text-slate-100">Requirement: </strong>
                  {item.criterion}
                </p>

                <p className="text-xs text-slate-400 leading-relaxed pl-8">
                  <strong className="text-cyan-300">How to Verify: </strong>
                  {item.verificationMethod}
                </p>

                <p className="text-xs text-slate-400 leading-relaxed pl-8">
                  <strong className="text-amber-300">Failure Mode: </strong>
                  {item.commonPitfall}
                </p>
              </div>

              <div className="pl-8">
                <div className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 font-mono text-xs text-cyan-300">
                  {item.formulaOrRule}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Interactive Power & Stuck-At Fault Estimation Workbench */}
      <div className="bg-[#111827] border border-slate-800 rounded-xl p-6 space-y-5">
        <div>
          <h3 className="text-lg font-bold text-white">
            02. Interactive CMOS Dynamic Power &amp; DFT Stuck-At Fault Estimator
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Estimate dynamic switching power{" "}
            <code className="text-cyan-400">
              P_dyn = N_gates · α · C_load · V_DD² · f_clk
            </code>{" "}
            and total Single Stuck-At (SA0/SA1) fault sites for your circuit
            size.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-3.5">
            <div className="flex justify-between mb-1.5">
              <span className="text-slate-400">Gate Count (N):</span>
              <span className="text-cyan-300 font-bold">{gateCount} gates</span>
            </div>
            <input
              type="range"
              min={10}
              max={5000}
              step={10}
              value={gateCount}
              onChange={(e) => setGateCount(parseInt(e.target.value, 10))}
              className="w-full accent-cyan-400"
            />
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-lg p-3.5">
            <div className="flex justify-between mb-1.5">
              <span className="text-slate-400">Clock Freq (f_clk):</span>
              <span className="text-cyan-300 font-bold">
                {clockFreqMHz} MHz
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={500}
              step={1}
              value={clockFreqMHz}
              onChange={(e) => setClockFreqMHz(parseInt(e.target.value, 10))}
              className="w-full accent-cyan-400"
            />
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-lg p-3.5">
            <div className="flex justify-between mb-1.5">
              <span className="text-slate-400">Supply Voltage (V_DD):</span>
              <span className="text-amber-300 font-bold">{supplyVdd} V</span>
            </div>
            <input
              type="range"
              min={1.0}
              max={5.0}
              step={0.1}
              value={supplyVdd}
              onChange={(e) => setSupplyVdd(parseFloat(e.target.value))}
              className="w-full accent-amber-400"
            />
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-lg p-3.5">
            <div className="flex justify-between mb-1.5">
              <span className="text-slate-400">Activity Factor (α):</span>
              <span className="text-emerald-400 font-bold">
                {(activityAlpha * 100).toFixed(0)}%
              </span>
            </div>
            <input
              type="range"
              min={0.05}
              max={1.0}
              step={0.05}
              value={activityAlpha}
              onChange={(e) => setActivityAlpha(parseFloat(e.target.value))}
              className="w-full accent-emerald-400"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono">
          <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-4">
            <div className="text-xs text-slate-400">
              ESTIMATED DYNAMIC POWER
            </div>
            <div className="text-2xl font-bold text-emerald-400 mt-1 tabular-nums">
              {dynamicPowerMw.toFixed(2)}{" "}
              <span className="text-xs text-slate-400">mW</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1 font-sans">
              Quadratic dependence on V_DD: dropping 5V → 3.3V cuts switching
              power by 56%.
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-4">
            <div className="text-xs text-slate-400">
              DFT STUCK-AT FAULT SITES (SA0 + SA1)
            </div>
            <div className="text-2xl font-bold text-cyan-300 mt-1 tabular-nums">
              {totalStuckAtFaults.toLocaleString()}{" "}
              <span className="text-xs text-slate-400">faults</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1 font-sans">
              6 fault checkpoints per 2-input gate (2 inputs + 1 output ×
              SA0/SA1).
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-4">
            <div className="text-xs text-slate-400">
              CLOCK GATING POWER SAVINGS (AT 50% IDLE)
            </div>
            <div className="text-2xl font-bold text-amber-300 mt-1 tabular-nums">
              {(dynamicPowerMw * 0.5).toFixed(2)}{" "}
              <span className="text-xs text-slate-400">mW saved</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1 font-sans">
              Using synchronous Clock-Enable (CE) halves dynamic clock-tree
              dissipation when idle.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
