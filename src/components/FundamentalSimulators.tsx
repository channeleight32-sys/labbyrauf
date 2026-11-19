import React, { useState } from "react";
import { StepForward, RotateCcw, Cpu, Code2 } from "lucide-react";
import { CIRCUIT_PRESETS, PresetNodeDef, PresetWireDef } from "../data/logicSpecs";
import DigitalWaveformView from "./DigitalWaveformView";

type SimulatorTab =
  | "GATES"
  | "HALF_ADDER"
  | "FULL_ADDER"
  | "MUX_4_1"
  | "FLIP_FLOPS";

interface FundamentalSimulatorsProps {
  onOpenInSchematicLab: (circuit: {
    title: string;
    nodes: PresetNodeDef[];
    wires: PresetWireDef[];
  }) => void;
}

export default function FundamentalSimulators({
  onOpenInSchematicLab,
}: FundamentalSimulatorsProps) {
  const [activeSim, setActiveSim] = useState<SimulatorTab>("FULL_ADDER");

  // 1. Primitive Gates State (AND, OR, NOT, XOR)
  const [gateType, setGateType] = useState<"AND" | "OR" | "NOT" | "XOR">("XOR");
  const [gateA, setGateA] = useState<number>(1);
  const [gateB, setGateB] = useState<number>(0);

  // 2. Half-Adder State
  const [haA, setHaA] = useState<number>(1);
  const [haB, setHaB] = useState<number>(1);

  // 3. Full-Adder State
  const [faA, setFaA] = useState<number>(1);
  const [faB, setFaB] = useState<number>(1);
  const [faCin, setFaCin] = useState<number>(0);

  // 4. 4:1 Multiplexer State
  const [muxInputs, setMuxInputs] = useState<[number, number, number, number]>([
    1, 0, 1, 1,
  ]);
  const [muxSel, setMuxSel] = useState<[number, number]>([1, 0]); // [S1, S0]

  // 5. Flip-Flop Simulator State (D, JK, T)
  const [ffType, setFfType] = useState<"D" | "JK" | "T">("JK");
  const [ffD, setFfD] = useState<number>(1);
  const [ffJ, setFfJ] = useState<number>(1);
  const [ffK, setFfK] = useState<number>(1);
  const [ffT, setFfT] = useState<number>(1);
  const [ffQ, setFfQ] = useState<number>(0);
  const [ffClockCount, setFfClockCount] = useState<number>(0);
  const [ffHistory, setFfHistory] = useState<
    { edge: number; inputs: string; qPrev: number; qNext: number }[]
  >([]);

  // Evaluations
  const gateOut =
    gateType === "AND"
      ? gateA & gateB
      : gateType === "OR"
      ? gateA | gateB
      : gateType === "NOT"
      ? gateA ^ 1
      : gateA ^ gateB;

  const haSum = haA ^ haB;
  const haCarry = haA & haB;

  const faP = faA ^ faB;
  const faG = faA & faB;
  const faH = faP & faCin;
  const faSum = faP ^ faCin;
  const faCout = faG | faH;

  const muxIndex = (muxSel[0] << 1) | muxSel[1];
  const muxOut = muxInputs[muxIndex];

  // Next state preview for Flip-Flop before clock edge
  const ffNextQ =
    ffType === "D"
      ? ffD
      : ffType === "T"
      ? ffT
        ? ffQ ^ 1
        : ffQ
      : ffJ && ffK
      ? ffQ ^ 1
      : ffJ
      ? 1
      : ffK
      ? 0
      : ffQ;

  const triggerFlipFlopClock = () => {
    const nextQ = ffNextQ;
    const inputDesc =
      ffType === "D"
        ? `D=${ffD}`
        : ffType === "T"
        ? `T=${ffT}`
        : `J=${ffJ}, K=${ffK}`;
    setFfQ(nextQ);
    setFfClockCount((c) => c + 1);
    setFfHistory((prev) => [
      ...prev.slice(-7),
      {
        edge: ffClockCount + 1,
        inputs: inputDesc,
        qPrev: ffQ,
        qNext: nextQ,
      },
    ]);
  };

  return (
    <div className="space-y-10">
      {/* Section 1: Focused Interactive Fundamental Circuit Simulators */}
      <div className="bg-[#111827] border border-slate-800 rounded-xl p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white">
              01. Interactive Fundamental Circuit Simulators
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Select a fundamental building block below to toggle its inputs,
              inspect internal intermediate nets, and examine its simulation
              implementation logic.
            </p>
          </div>

          {/* Circuit Type Selector */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl">
            {(
              [
                { id: "GATES", label: "AND / OR / NOT / XOR" },
                { id: "HALF_ADDER", label: "Half-Adder" },
                { id: "FULL_ADDER", label: "Full-Adder" },
                { id: "MUX_4_1", label: "4:1 Multiplexer" },
                { id: "FLIP_FLOPS", label: "Flip-Flops (D, JK, T)" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSim(tab.id)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  activeSim === tab.id
                    ? "bg-cyan-500/20 text-cyan-300 font-semibold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* SIMULATOR 1: PRIMITIVE GATES (AND, OR, NOT, XOR) */}
        {activeSim === "GATES" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-7 bg-[#070A12] border border-slate-800 rounded-xl p-5 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-lg border border-slate-800">
                  {(["AND", "OR", "NOT", "XOR"] as const).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGateType(g)}
                      className={`px-3 py-1 rounded text-xs font-mono font-bold cursor-pointer ${
                        gateType === g
                          ? "bg-cyan-500/20 text-cyan-300"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      {g} Gate
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setGateA((v) => v ^ 1)}
                    className={`px-3.5 py-1.5 rounded-lg font-mono text-xs font-bold border cursor-pointer ${
                      gateA === 1
                        ? "bg-emerald-500/20 border-emerald-500 text-emerald-300"
                        : "bg-slate-900 border-slate-700 text-slate-300"
                    }`}
                  >
                    Input A = {gateA}
                  </button>
                  {gateType !== "NOT" && (
                    <button
                      type="button"
                      onClick={() => setGateB((v) => v ^ 1)}
                      className={`px-3.5 py-1.5 rounded-lg font-mono text-xs font-bold border cursor-pointer ${
                        gateB === 1
                          ? "bg-emerald-500/20 border-emerald-500 text-emerald-300"
                          : "bg-slate-900 border-slate-700 text-slate-300"
                      }`}
                    >
                      Input B = {gateB}
                    </button>
                  )}
                </div>
              </div>

              {/* Interactive SVG Gate Diagram */}
              <svg viewBox="0 0 500 180" className="w-full h-48 block">
                {/* Input Wires */}
                <line
                  x1={70}
                  y1={gateType === "NOT" ? 90 : 65}
                  x2={190}
                  y2={gateType === "NOT" ? 90 : 65}
                  stroke={gateA ? "#22c55e" : "#334155"}
                  strokeWidth={3.5}
                />
                <text
                  x={55}
                  y={gateType === "NOT" ? 95 : 70}
                  textAnchor="end"
                  fill={gateA ? "#4ade80" : "#94a3b8"}
                  fontSize="14"
                  fontWeight="bold"
                  fontFamily="JetBrains Mono, monospace"
                >
                  A={gateA}
                </text>

                {gateType !== "NOT" && (
                  <>
                    <line
                      x1={70}
                      y1={115}
                      x2={190}
                      y2={115}
                      stroke={gateB ? "#22c55e" : "#334155"}
                      strokeWidth={3.5}
                    />
                    <text
                      x={55}
                      y={120}
                      textAnchor="end"
                      fill={gateB ? "#4ade80" : "#94a3b8"}
                      fontSize="14"
                      fontWeight="bold"
                      fontFamily="JetBrains Mono, monospace"
                    >
                      B={gateB}
                    </text>
                  </>
                )}

                {/* Gate Body */}
                <rect
                  x={190}
                  y={40}
                  width={120}
                  height={100}
                  rx={14}
                  fill={gateOut ? "rgba(6, 182, 212, 0.16)" : "#111827"}
                  stroke={gateOut ? "#06b6d4" : "#475569"}
                  strokeWidth={2.5}
                />
                <text
                  x={250}
                  y={88}
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="18"
                  fontWeight="bold"
                  fontFamily="JetBrains Mono, monospace"
                >
                  {gateType}
                </text>
                <text
                  x={250}
                  y={112}
                  textAnchor="middle"
                  fill="#38bdf8"
                  fontSize="12"
                  fontFamily="JetBrains Mono, monospace"
                >
                  {gateType === "AND" && "Y = A · B"}
                  {gateType === "OR" && "Y = A + B"}
                  {gateType === "NOT" && "Y = A'"}
                  {gateType === "XOR" && "Y = A ⊕ B"}
                </text>

                {/* Output Wire */}
                <line
                  x1={310}
                  y1={90}
                  x2={420}
                  y2={90}
                  stroke={gateOut ? "#22c55e" : "#334155"}
                  strokeWidth={3.5}
                />
                <circle
                  cx={435}
                  cy={90}
                  r={16}
                  fill={gateOut ? "#22c55e" : "#1e293b"}
                  stroke={gateOut ? "#86efac" : "#475569"}
                  strokeWidth={2}
                />
                <text
                  x={435}
                  y={95}
                  textAnchor="middle"
                  fill={gateOut ? "#052e16" : "#94a3b8"}
                  fontSize="14"
                  fontWeight="bold"
                  fontFamily="JetBrains Mono, monospace"
                >
                  {gateOut}
                </text>
              </svg>
            </div>

            <div className="lg:col-span-5 space-y-4">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 font-mono text-xs space-y-2">
                <div className="text-cyan-400 font-semibold">
                  Simulator Evaluation Function (TypeScript &amp; Verilog)
                </div>
                <pre className="text-slate-300 overflow-x-auto leading-relaxed">
{`// Web Simulator Evaluation Kernel
const evaluate${gateType} = (A: 0|1, B: 0|1): 0|1 => {
  return ${
    gateType === "AND"
      ? "(A & B) as 0|1;"
      : gateType === "OR"
      ? "(A | B) as 0|1;"
      : gateType === "NOT"
      ? "(A ^ 1) as 0|1;"
      : "(A ^ B) as 0|1;"
  }
};

// Equivalent Synthesizable Verilog HDL
assign Y = ${
  gateType === "AND"
    ? "A & B;"
    : gateType === "OR"
    ? "A | B;"
    : gateType === "NOT"
    ? "~A;"
    : "A ^ B;"
}`}
                </pre>
              </div>
            </div>

            <div className="lg:col-span-12">
              <DigitalWaveformView
                title={`Mathematically Proved ${gateType} Gate Timing Diagram`}
                subtitle="Click any minterm column (m0..m3) to set inputs A and B and verify the Boolean identity."
                equations={[
                  {
                    label: `${gateType} Boolean Function`,
                    expr:
                      gateType === "AND"
                        ? "Y = A · B"
                        : gateType === "OR"
                        ? "Y = A + B"
                        : gateType === "NOT"
                        ? "Y = A'"
                        : "Y = A ⊕ B = A·B' + A'·B",
                    substitution: (sIdx) => {
                      if (gateType === "NOT") {
                        const a = sIdx & 1;
                        return `A=${a} ⇒ Y = ${a ^ 1}`;
                      }
                      const a = (sIdx >> 1) & 1;
                      const b = sIdx & 1;
                      const y =
                        gateType === "AND"
                          ? a & b
                          : gateType === "OR"
                          ? a | b
                          : a ^ b;
                      return `A=${a}, B=${b} ⇒ Y = ${y}`;
                    },
                  },
                ]}
                verificationNote="100% Truth-Table Verified"
                stepLabels={
                  gateType === "NOT" ? ["m0", "m1"] : ["m0(00)", "m1(01)", "m2(10)", "m3(11)"]
                }
                activeStepIndex={
                  gateType === "NOT" ? gateA : (gateA << 1) | gateB
                }
                onSelectStep={(sIdx) => {
                  if (gateType === "NOT") {
                    setGateA(sIdx & 1);
                  } else {
                    setGateA((sIdx >> 1) & 1);
                    setGateB(sIdx & 1);
                  }
                }}
                channels={
                  gateType === "NOT"
                    ? [
                        { id: "g-a", label: "Input A", role: "input", values: [0, 1] },
                        {
                          id: "g-y",
                          label: "Output Y",
                          role: "output",
                          values: [1, 0],
                          formula: "Y = A'",
                        },
                      ]
                    : [
                        {
                          id: "g-a",
                          label: "Input A",
                          role: "input",
                          values: [0, 0, 1, 1],
                        },
                        {
                          id: "g-b",
                          label: "Input B",
                          role: "input",
                          values: [0, 1, 0, 1],
                        },
                        {
                          id: "g-y",
                          label: "Output Y",
                          role: "output",
                          values:
                            gateType === "AND"
                              ? [0, 0, 0, 1]
                              : gateType === "OR"
                              ? [0, 1, 1, 1]
                              : [0, 1, 1, 0],
                          formula:
                            gateType === "AND"
                              ? "A · B"
                              : gateType === "OR"
                              ? "A + B"
                              : "A ⊕ B",
                        },
                      ]
                }
              />
            </div>
          </div>
        )}

        {/* SIMULATOR 2: HALF-ADDER */}
        {activeSim === "HALF_ADDER" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-7 bg-[#070A12] border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setHaA((v) => v ^ 1)}
                    className={`px-3.5 py-1.5 rounded-lg font-mono text-xs font-bold border cursor-pointer ${
                      haA === 1
                        ? "bg-emerald-500/20 border-emerald-500 text-emerald-300"
                        : "bg-slate-900 border-slate-700 text-slate-300"
                    }`}
                  >
                    Input A = {haA}
                  </button>
                  <button
                    type="button"
                    onClick={() => setHaB((v) => v ^ 1)}
                    className={`px-3.5 py-1.5 rounded-lg font-mono text-xs font-bold border cursor-pointer ${
                      haB === 1
                        ? "bg-emerald-500/20 border-emerald-500 text-emerald-300"
                        : "bg-slate-900 border-slate-700 text-slate-300"
                    }`}
                  >
                    Input B = {haB}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const p = CIRCUIT_PRESETS["Half Adder"];
                    onOpenInSchematicLab({
                      title: "Half Adder",
                      nodes: p.nodes,
                      wires: p.wires,
                    });
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 cursor-pointer"
                >
                  <Cpu className="w-3.5 h-3.5" />
                  Open in Schematic Canvas
                </button>
              </div>

              <svg viewBox="0 0 540 210" className="w-full h-52 block">
                {/* Input A distribution */}
                <path
                  d="M 60,55 L 200,55 M 130,55 L 130,135 L 200,135"
                  fill="none"
                  stroke={haA ? "#22c55e" : "#334155"}
                  strokeWidth={3}
                />
                <text
                  x={48}
                  y={60}
                  textAnchor="end"
                  fill={haA ? "#4ade80" : "#94a3b8"}
                  fontSize="13"
                  fontWeight="bold"
                  fontFamily="JetBrains Mono, monospace"
                >
                  A={haA}
                </text>

                {/* Input B distribution */}
                <path
                  d="M 60,165 L 200,165 M 100,165 L 100,85 L 200,85"
                  fill="none"
                  stroke={haB ? "#22c55e" : "#334155"}
                  strokeWidth={3}
                />
                <text
                  x={48}
                  y={170}
                  textAnchor="end"
                  fill={haB ? "#4ade80" : "#94a3b8"}
                  fontSize="13"
                  fontWeight="bold"
                  fontFamily="JetBrains Mono, monospace"
                >
                  B={haB}
                </text>

                {/* XOR Gate (Sum) */}
                <rect
                  x={200}
                  y={40}
                  width={120}
                  height={60}
                  rx={10}
                  fill={haSum ? "rgba(6, 182, 212, 0.18)" : "#111827"}
                  stroke={haSum ? "#06b6d4" : "#475569"}
                  strokeWidth={2.2}
                />
                <text
                  x={260}
                  y={74}
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="13"
                  fontWeight="bold"
                  fontFamily="JetBrains Mono, monospace"
                >
                  XOR (A ⊕ B)
                </text>

                {/* AND Gate (Carry) */}
                <rect
                  x={200}
                  y={120}
                  width={120}
                  height={60}
                  rx={10}
                  fill={haCarry ? "rgba(6, 182, 212, 0.18)" : "#111827"}
                  stroke={haCarry ? "#06b6d4" : "#475569"}
                  strokeWidth={2.2}
                />
                <text
                  x={260}
                  y={154}
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="13"
                  fontWeight="bold"
                  fontFamily="JetBrains Mono, monospace"
                >
                  AND (A · B)
                </text>

                {/* Output Wires */}
                <line
                  x1={320}
                  y1={70}
                  x2={420}
                  y2={70}
                  stroke={haSum ? "#22c55e" : "#334155"}
                  strokeWidth={3}
                />
                <text
                  x={430}
                  y={75}
                  fill={haSum ? "#4ade80" : "#94a3b8"}
                  fontSize="13"
                  fontWeight="bold"
                  fontFamily="JetBrains Mono, monospace"
                >
                  Sum = {haSum}
                </text>

                <line
                  x1={320}
                  y1={150}
                  x2={420}
                  y2={150}
                  stroke={haCarry ? "#22c55e" : "#334155"}
                  strokeWidth={3}
                />
                <text
                  x={430}
                  y={155}
                  fill={haCarry ? "#4ade80" : "#94a3b8"}
                  fontSize="13"
                  fontWeight="bold"
                  fontFamily="JetBrains Mono, monospace"
                >
                  Carry = {haCarry}
                </text>
              </svg>
            </div>

            <div className="lg:col-span-5 space-y-4">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 font-mono text-xs space-y-2">
                <div className="text-cyan-400 font-semibold">
                  Arithmetic Result: {haA}₂ + {haB}₂ = {haCarry}
                  {haSum}₂ ({haCarry * 2 + haSum}₁₀)
                </div>
                <pre className="text-slate-300 overflow-x-auto leading-relaxed">
{`// Half-Adder Simulator Kernel
function simulateHalfAdder(A: number, B: number) {
  const Sum   = (A ^ B) & 1; // Exclusive-OR
  const Carry = (A & B) & 1; // Logical AND
  return { Sum, Carry };
}`}
                </pre>
              </div>
            </div>

            <div className="lg:col-span-12">
              <DigitalWaveformView
                title="Mathematically Proved 1-Bit Half-Adder Timing Waveform"
                subtitle="Exhaustive 4-state binary addition proof: A + B = 2·Carry + Sum."
                equations={[
                  {
                    label: "Sum Equation",
                    expr: "Sum = A ⊕ B = A·B' + A'·B",
                    substitution: (sIdx) => {
                      const a = (sIdx >> 1) & 1;
                      const b = sIdx & 1;
                      return `${a} ⊕ ${b} = ${a ^ b}`;
                    },
                  },
                  {
                    label: "Carry Equation",
                    expr: "Carry = A · B",
                    substitution: (sIdx) => {
                      const a = (sIdx >> 1) & 1;
                      const b = sIdx & 1;
                      return `${a} · ${b} = ${a & b} (Arithmetic: ${a}+${b}=${a + b}₁₀)`;
                    },
                  },
                ]}
                verificationNote="Arithmetic Identity A + B = 2·Carry + Sum Verified"
                stepLabels={["0+0 (m0)", "0+1 (m1)", "1+0 (m2)", "1+1 (m3)"]}
                activeStepIndex={(haA << 1) | haB}
                onSelectStep={(sIdx) => {
                  setHaA((sIdx >> 1) & 1);
                  setHaB(sIdx & 1);
                }}
                channels={[
                  { id: "ha-a", label: "Input A", role: "input", values: [0, 0, 1, 1] },
                  { id: "ha-b", label: "Input B", role: "input", values: [0, 1, 0, 1] },
                  {
                    id: "ha-sum",
                    label: "Sum (S)",
                    role: "output",
                    values: [0, 1, 1, 0],
                    formula: "A ⊕ B",
                  },
                  {
                    id: "ha-carry",
                    label: "Carry (C)",
                    role: "output",
                    values: [0, 0, 0, 1],
                    formula: "A · B",
                  },
                  {
                    id: "ha-bus",
                    label: "A + B (2-Bit)",
                    role: "bus",
                    values: ["00₂ (0)", "01₂ (1)", "01₂ (1)", "10₂ (2)"],
                  },
                ]}
              />
            </div>
          </div>
        )}

        {/* SIMULATOR 3: FULL-ADDER */}
        {activeSim === "FULL_ADDER" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-7 bg-[#070A12] border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setFaA((v) => v ^ 1)}
                    className={`px-3 py-1.5 rounded-lg font-mono text-xs font-bold border cursor-pointer ${
                      faA === 1
                        ? "bg-emerald-500/20 border-emerald-500 text-emerald-300"
                        : "bg-slate-900 border-slate-700 text-slate-300"
                    }`}
                  >
                    A = {faA}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFaB((v) => v ^ 1)}
                    className={`px-3 py-1.5 rounded-lg font-mono text-xs font-bold border cursor-pointer ${
                      faB === 1
                        ? "bg-emerald-500/20 border-emerald-500 text-emerald-300"
                        : "bg-slate-900 border-slate-700 text-slate-300"
                    }`}
                  >
                    B = {faB}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFaCin((v) => v ^ 1)}
                    className={`px-3 py-1.5 rounded-lg font-mono text-xs font-bold border cursor-pointer ${
                      faCin === 1
                        ? "bg-emerald-500/20 border-emerald-500 text-emerald-300"
                        : "bg-slate-900 border-slate-700 text-slate-300"
                    }`}
                  >
                    Cin = {faCin}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const p = CIRCUIT_PRESETS["Full Adder"];
                    onOpenInSchematicLab({
                      title: "Full Adder",
                      nodes: p.nodes,
                      wires: p.wires,
                    });
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 cursor-pointer"
                >
                  <Cpu className="w-3.5 h-3.5" />
                  Open in Schematic Canvas
                </button>
              </div>

              {/* Internal Signal Telemetry Bar */}
              <div className="grid grid-cols-3 gap-2 font-mono text-xs">
                <div className="bg-slate-900/90 border border-slate-800 rounded-lg px-3 py-2">
                  <span className="text-slate-400">Propagate P=A⊕B: </span>
                  <strong
                    className={
                      faP === 1 ? "text-cyan-300" : "text-slate-500"
                    }
                  >
                    {faP}
                  </strong>
                </div>
                <div className="bg-slate-900/90 border border-slate-800 rounded-lg px-3 py-2">
                  <span className="text-slate-400">Generate G=A·B: </span>
                  <strong
                    className={
                      faG === 1 ? "text-cyan-300" : "text-slate-500"
                    }
                  >
                    {faG}
                  </strong>
                </div>
                <div className="bg-slate-900/90 border border-slate-800 rounded-lg px-3 py-2">
                  <span className="text-slate-400">PropCarry P·Cin: </span>
                  <strong
                    className={
                      faH === 1 ? "text-cyan-300" : "text-slate-500"
                    }
                  >
                    {faH}
                  </strong>
                </div>
              </div>

              {/* Full Adder Block Schematic */}
              <svg viewBox="0 0 600 220" className="w-full h-52 block">
                {/* Stage 1 XOR (P = A ^ B) */}
                <rect
                  x={110}
                  y={25}
                  width={105}
                  height={48}
                  rx={8}
                  fill={faP ? "rgba(6, 182, 212, 0.18)" : "#111827"}
                  stroke={faP ? "#06b6d4" : "#475569"}
                  strokeWidth={2}
                />
                <text
                  x={162}
                  y={54}
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="12"
                  fontWeight="bold"
                  fontFamily="JetBrains Mono, monospace"
                >
                  XOR1 (P={faP})
                </text>

                {/* Stage 2 XOR (Sum = P ^ Cin) */}
                <rect
                  x={280}
                  y={45}
                  width={115}
                  height={48}
                  rx={8}
                  fill={faSum ? "rgba(34, 197, 94, 0.18)" : "#111827"}
                  stroke={faSum ? "#22c55e" : "#475569"}
                  strokeWidth={2}
                />
                <text
                  x={337}
                  y={74}
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="12"
                  fontWeight="bold"
                  fontFamily="JetBrains Mono, monospace"
                >
                  XOR2 (Sum={faSum})
                </text>

                {/* AND1 (G = A & B) */}
                <rect
                  x={110}
                  y={145}
                  width={105}
                  height={48}
                  rx={8}
                  fill={faG ? "rgba(6, 182, 212, 0.18)" : "#111827"}
                  stroke={faG ? "#06b6d4" : "#475569"}
                  strokeWidth={2}
                />
                <text
                  x={162}
                  y={174}
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="12"
                  fontWeight="bold"
                  fontFamily="JetBrains Mono, monospace"
                >
                  AND1 (G={faG})
                </text>

                {/* AND2 (H = P & Cin) */}
                <rect
                  x={280}
                  y={115}
                  width={115}
                  height={48}
                  rx={8}
                  fill={faH ? "rgba(6, 182, 212, 0.18)" : "#111827"}
                  stroke={faH ? "#06b6d4" : "#475569"}
                  strokeWidth={2}
                />
                <text
                  x={337}
                  y={144}
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="12"
                  fontWeight="bold"
                  fontFamily="JetBrains Mono, monospace"
                >
                  AND2 (H={faH})
                </text>

                {/* OR (Cout = G | H) */}
                <rect
                  x={435}
                  y={135}
                  width={110}
                  height={52}
                  rx={8}
                  fill={faCout ? "rgba(34, 197, 94, 0.18)" : "#111827"}
                  stroke={faCout ? "#22c55e" : "#475569"}
                  strokeWidth={2}
                />
                <text
                  x={490}
                  y={165}
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="12"
                  fontWeight="bold"
                  fontFamily="JetBrains Mono, monospace"
                >
                  OR (Cout={faCout})
                </text>

                {/* Interconnect lines */}
                <line
                  x1={45}
                  y1={40}
                  x2={110}
                  y2={40}
                  stroke={faA ? "#22c55e" : "#334155"}
                  strokeWidth={2.5}
                />
                <line
                  x1={45}
                  y1={60}
                  x2={110}
                  y2={60}
                  stroke={faB ? "#22c55e" : "#334155"}
                  strokeWidth={2.5}
                />
                <line
                  x1={45}
                  y1={82}
                  x2={280}
                  y2={82}
                  stroke={faCin ? "#22c55e" : "#334155"}
                  strokeWidth={2.5}
                />
                <line
                  x1={215}
                  y1={50}
                  x2={280}
                  y2={58}
                  stroke={faP ? "#22c55e" : "#334155"}
                  strokeWidth={2.5}
                />
                <line
                  x1={245}
                  y1={54}
                  x2={280}
                  y2={130}
                  stroke={faP ? "#22c55e" : "#334155"}
                  strokeWidth={2}
                />
                <line
                  x1={215}
                  y1={170}
                  x2={435}
                  y2={170}
                  stroke={faG ? "#22c55e" : "#334155"}
                  strokeWidth={2.5}
                />
                <line
                  x1={395}
                  y1={140}
                  x2={435}
                  y2={150}
                  stroke={faH ? "#22c55e" : "#334155"}
                  strokeWidth={2.5}
                />
                <line
                  x1={395}
                  y1={69}
                  x2={545}
                  y2={69}
                  stroke={faSum ? "#22c55e" : "#334155"}
                  strokeWidth={3}
                />
              </svg>
            </div>

            <div className="lg:col-span-5 space-y-4">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 font-mono text-xs space-y-2">
                <div className="text-emerald-400 font-bold text-sm">
                  Result: {faA} + {faB} + {faCin} = {faCout}
                  {faSum}₂ ({faCout * 2 + faSum}₁₀)
                </div>
                <pre className="text-slate-300 overflow-x-auto leading-relaxed">
{`// Full-Adder Two-Stage Half-Adder Decomposition
function simulateFullAdder(A: number, B: number, Cin: number) {
  const P    = A ^ B;          // Half-Adder 1 Sum
  const G    = A & B;          // Half-Adder 1 Carry
  const Sum  = P ^ Cin;        // Half-Adder 2 Sum
  const Cout = G | (P & Cin);  // Carry Merge OR
  return { Sum, Cout, P, G };
}`}
                </pre>
              </div>
            </div>

            <div className="lg:col-span-12">
              <DigitalWaveformView
                title="Mathematically Proved 1-Bit Full-Adder Timing Waveform (All 8 Minterms)"
                subtitle="Traces inputs (A, B, Cin), internal propagate/generate nets (P, G, H), and outputs (Sum, Cout) with arithmetic proof A + B + Cin = 2·Cout + Sum."
                equations={[
                  {
                    label: "Full-Adder Sum",
                    expr: "Sum = A ⊕ B ⊕ Cin = P ⊕ Cin",
                    substitution: (sIdx) => {
                      const a = (sIdx >> 2) & 1;
                      const b = (sIdx >> 1) & 1;
                      const cin = sIdx & 1;
                      return `${a} ⊕ ${b} ⊕ ${cin} = ${a ^ b ^ cin}`;
                    },
                  },
                  {
                    label: "Full-Adder Carry-Out",
                    expr: "Cout = A·B + Cin·(A ⊕ B) = G + P·Cin",
                    substitution: (sIdx) => {
                      const a = (sIdx >> 2) & 1;
                      const b = (sIdx >> 1) & 1;
                      const cin = sIdx & 1;
                      const cout = (a & b) | ((a ^ b) & cin);
                      return `${a & b} + ${(a ^ b) & cin} = ${cout} (Total = ${a + b + cin}₁₀)`;
                    },
                  },
                ]}
                verificationNote="∑m(1,2,4,7) Sum · ∑m(3,5,6,7) Cout Verified"
                stepLabels={[0, 1, 2, 3, 4, 5, 6, 7].map(
                  (m) => `m${m}(${m.toString(2).padStart(3, "0")})`
                )}
                activeStepIndex={(faA << 2) | (faB << 1) | faCin}
                onSelectStep={(sIdx) => {
                  setFaA((sIdx >> 2) & 1);
                  setFaB((sIdx >> 1) & 1);
                  setFaCin(sIdx & 1);
                }}
                channels={[
                  {
                    id: "fa-a",
                    label: "Input A",
                    role: "input",
                    values: [0, 0, 0, 0, 1, 1, 1, 1],
                  },
                  {
                    id: "fa-b",
                    label: "Input B",
                    role: "input",
                    values: [0, 0, 1, 1, 0, 0, 1, 1],
                  },
                  {
                    id: "fa-cin",
                    label: "Carry-In (Cin)",
                    role: "input",
                    values: [0, 1, 0, 1, 0, 1, 0, 1],
                  },
                  {
                    id: "fa-p",
                    label: "Net P = A⊕B",
                    role: "intermediate",
                    values: [0, 0, 1, 1, 1, 1, 0, 0],
                    formula: "Propagate",
                  },
                  {
                    id: "fa-g",
                    label: "Net G = A·B",
                    role: "intermediate",
                    values: [0, 0, 0, 0, 0, 0, 1, 1],
                    formula: "Generate",
                  },
                  {
                    id: "fa-sum",
                    label: "Output Sum",
                    role: "output",
                    values: [0, 1, 1, 0, 1, 0, 0, 1],
                    formula: "A ⊕ B ⊕ Cin",
                  },
                  {
                    id: "fa-cout",
                    label: "Output Cout",
                    role: "output",
                    values: [0, 0, 0, 1, 0, 1, 1, 1],
                    formula: "AB + Cin(A⊕B)",
                  },
                  {
                    id: "fa-bus",
                    label: "A+B+Cin",
                    role: "bus",
                    values: ["00₂(0)", "01₂(1)", "01₂(1)", "10₂(2)", "01₂(1)", "10₂(2)", "10₂(2)", "11₂(3)"],
                  },
                ]}
              />
            </div>
          </div>
        )}

        {/* SIMULATOR 4: 4:1 MULTIPLEXER */}
        {activeSim === "MUX_4_1" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-7 bg-[#070A12] border border-slate-800 rounded-xl p-5 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  {muxInputs.map((val, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() =>
                        setMuxInputs((prev) => {
                          const next = [...prev] as [
                            number,
                            number,
                            number,
                            number
                          ];
                          next[idx] ^= 1;
                          return next;
                        })
                      }
                      className={`px-3 py-1.5 rounded-lg font-mono text-xs font-bold border cursor-pointer ${
                        idx === muxIndex
                          ? "bg-cyan-500/25 border-cyan-400 text-cyan-200"
                          : "bg-slate-900 border-slate-800 text-slate-400"
                      }`}
                    >
                      I{idx} = {val}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setMuxSel(([s1, s0]) => [s1 ^ 1, s0])
                    }
                    className="px-3 py-1.5 rounded-lg font-mono text-xs font-bold bg-amber-500/20 border border-amber-400 text-amber-200 cursor-pointer"
                  >
                    S1 = {muxSel[0]}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setMuxSel(([s1, s0]) => [s1, s0 ^ 1])
                    }
                    className="px-3 py-1.5 rounded-lg font-mono text-xs font-bold bg-amber-500/20 border border-amber-400 text-amber-200 cursor-pointer"
                  >
                    S0 = {muxSel[1]}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2.5 font-mono text-xs">
                {[0, 1, 2, 3].map((ch) => {
                  const isSelected = ch === muxIndex;
                  return (
                    <div
                      key={ch}
                      className={`p-3 rounded-lg border text-center ${
                        isSelected
                          ? "bg-cyan-500/15 border-cyan-400 text-white"
                          : "bg-slate-900/60 border-slate-800 text-slate-500"
                      }`}
                    >
                      <div className="text-[10px]">
                        Channel {ch} (S={ch.toString(2).padStart(2, "0")})
                      </div>
                      <div className="text-lg font-bold mt-0.5">
                        I{ch} = {muxInputs[ch]}
                      </div>
                      <div className="text-[10px] mt-0.5">
                        {isSelected ? "● ROUTED TO Y" : "Blocked"}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-lg p-3.5 flex items-center justify-between font-mono text-xs">
                <span className="text-slate-300">
                  Selected Channel:{" "}
                  <strong className="text-amber-300">
                    S1S0 = {muxSel[0]}
                    {muxSel[1]}₂ (I{muxIndex})
                  </strong>
                </span>
                <span
                  className={
                    muxOut === 1
                      ? "text-emerald-400 font-bold text-sm"
                      : "text-slate-400 font-bold text-sm"
                  }
                >
                  Output Y = I{muxIndex} = {muxOut}
                </span>
              </div>
            </div>

            <div className="lg:col-span-5 space-y-4">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 font-mono text-xs space-y-2">
                <div className="text-cyan-400 font-semibold">
                  4:1 MUX Sum-of-Minterms Equation &amp; Implementation
                </div>
                <pre className="text-slate-300 overflow-x-auto leading-relaxed">
{`// Boolean Equation:
// Y = S1'·S0'·I0 + S1'·S0·I1 + S1·S0'·I2 + S1·S0·I3

function simulateMux4to1(
  I: [number, number, number, number],
  S1: number,
  S0: number
): number {
  const index = ((S1 & 1) << 1) | (S0 & 1);
  return I[index] & 1;
}`}
                </pre>
              </div>
            </div>

            <div className="lg:col-span-12">
              <DigitalWaveformView
                title="Mathematically Proved 4:1 Multiplexer Channel Routing Waveform"
                subtitle="Sweeps select lines S1,S0 across 00, 01, 10, 11 to prove Y(t) = I_{2·S1 + S0}(t)."
                equations={[
                  {
                    label: "Shannon Expansion",
                    expr: "Y = S1'·S0'·I0 + S1'·S0·I1 + S1·S0'·I2 + S1·S0·I3",
                    substitution: (sIdx) => {
                      const s1 = (sIdx >> 1) & 1;
                      const s0 = sIdx & 1;
                      return `S1=${s1}, S0=${s0} ⇒ Routed Channel I${sIdx} = ${muxInputs[sIdx]}`;
                    },
                  },
                ]}
                verificationNote="4-Channel Data Routing Verified"
                stepLabels={["S=00 (I0)", "S=01 (I1)", "S=10 (I2)", "S=11 (I3)"]}
                activeStepIndex={muxIndex}
                onSelectStep={(sIdx) => {
                  setMuxSel([(sIdx >> 1) & 1, sIdx & 1]);
                }}
                channels={[
                  { id: "mux-s1", label: "Select S1", role: "input", values: [0, 0, 1, 1] },
                  { id: "mux-s0", label: "Select S0", role: "input", values: [0, 1, 0, 1] },
                  {
                    id: "mux-i0",
                    label: `Data I0 (${muxInputs[0]})`,
                    role: "intermediate",
                    values: [muxInputs[0], muxInputs[0], muxInputs[0], muxInputs[0]],
                  },
                  {
                    id: "mux-i1",
                    label: `Data I1 (${muxInputs[1]})`,
                    role: "intermediate",
                    values: [muxInputs[1], muxInputs[1], muxInputs[1], muxInputs[1]],
                  },
                  {
                    id: "mux-i2",
                    label: `Data I2 (${muxInputs[2]})`,
                    role: "intermediate",
                    values: [muxInputs[2], muxInputs[2], muxInputs[2], muxInputs[2]],
                  },
                  {
                    id: "mux-i3",
                    label: `Data I3 (${muxInputs[3]})`,
                    role: "intermediate",
                    values: [muxInputs[3], muxInputs[3], muxInputs[3], muxInputs[3]],
                  },
                  {
                    id: "mux-y",
                    label: "Output Y",
                    role: "output",
                    values: [muxInputs[0], muxInputs[1], muxInputs[2], muxInputs[3]],
                    formula: "I[2·S1+S0]",
                  },
                ]}
              />
            </div>
          </div>
        )}

        {/* SIMULATOR 5: EDGE-TRIGGERED FLIP-FLOPS (D, JK, T) */}
        {activeSim === "FLIP_FLOPS" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-7 bg-[#070A12] border border-slate-800 rounded-xl p-5 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-lg border border-slate-800">
                  {(["D", "JK", "T"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setFfType(t)}
                      className={`px-3 py-1 rounded text-xs font-mono font-bold cursor-pointer ${
                        ffType === t
                          ? "bg-cyan-500/20 text-cyan-300"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      {t} Flip-Flop
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  {ffType === "D" && (
                    <button
                      type="button"
                      onClick={() => setFfD((v) => v ^ 1)}
                      className={`px-3.5 py-1.5 rounded-lg font-mono text-xs font-bold border cursor-pointer ${
                        ffD === 1
                          ? "bg-cyan-500/20 border-cyan-400 text-cyan-200"
                          : "bg-slate-900 border-slate-700 text-slate-300"
                      }`}
                    >
                      D = {ffD}
                    </button>
                  )}
                  {ffType === "JK" && (
                    <>
                      <button
                        type="button"
                        onClick={() => setFfJ((v) => v ^ 1)}
                        className={`px-3.5 py-1.5 rounded-lg font-mono text-xs font-bold border cursor-pointer ${
                          ffJ === 1
                            ? "bg-cyan-500/20 border-cyan-400 text-cyan-200"
                            : "bg-slate-900 border-slate-700 text-slate-300"
                        }`}
                      >
                        J = {ffJ}
                      </button>
                      <button
                        type="button"
                        onClick={() => setFfK((v) => v ^ 1)}
                        className={`px-3.5 py-1.5 rounded-lg font-mono text-xs font-bold border cursor-pointer ${
                          ffK === 1
                            ? "bg-cyan-500/20 border-cyan-400 text-cyan-200"
                            : "bg-slate-900 border-slate-700 text-slate-300"
                        }`}
                      >
                        K = {ffK}
                      </button>
                    </>
                  )}
                  {ffType === "T" && (
                    <button
                      type="button"
                      onClick={() => setFfT((v) => v ^ 1)}
                      className={`px-3.5 py-1.5 rounded-lg font-mono text-xs font-bold border cursor-pointer ${
                        ffT === 1
                          ? "bg-cyan-500/20 border-cyan-400 text-cyan-200"
                          : "bg-slate-900 border-slate-700 text-slate-300"
                      }`}
                    >
                      T = {ffT}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={triggerFlipFlopClock}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg font-mono text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors cursor-pointer"
                  >
                    <StepForward className="w-3.5 h-3.5" />
                    Trigger Rising CLK (↑)
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setFfQ(0);
                      setFfHistory([]);
                      setFfClockCount(0);
                    }}
                    className="px-2.5 py-1.5 rounded-lg font-mono text-xs text-slate-400 hover:text-white bg-slate-900 border border-slate-800 cursor-pointer"
                  >
                    Async CLR
                  </button>
                </div>
              </div>

              {/* Flip-Flop State Comparison Cards */}
              <div className="grid grid-cols-3 gap-3 font-mono">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
                  <div className="text-xs text-slate-400">Stored Q(t)</div>
                  <div
                    className={`text-3xl font-bold mt-1 ${
                      ffQ === 1 ? "text-emerald-400" : "text-slate-300"
                    }`}
                  >
                    {ffQ}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Complement Q&apos; = {ffQ ^ 1}
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
                  <div className="text-xs text-slate-400">
                    Pending Next Q(t+1)
                  </div>
                  <div className="text-3xl font-bold text-cyan-300 mt-1">
                    {ffNextQ}
                  </div>
                  <div className="text-[11px] text-amber-300 mt-0.5">
                    Latches on next ↑ CLK
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
                  <div className="text-xs text-slate-400">Operating Mode</div>
                  <div className="text-base font-bold text-white mt-2">
                    {ffType === "D" && (ffD ? "SET (1)" : "RESET (0)")}
                    {ffType === "T" && (ffT ? "TOGGLE (Q')" : "HOLD (Q)")}
                    {ffType === "JK" &&
                      (ffJ && ffK
                        ? "TOGGLE (Q')"
                        : ffJ
                        ? "SET (1)"
                        : ffK
                        ? "RESET (0)"
                        : "HOLD (Q)")}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Edges pulsed: {ffClockCount}
                  </div>
                </div>
              </div>

              {/* Clock Edge Log */}
              <div className="flex flex-wrap gap-1.5 font-mono text-xs">
                {ffHistory.length === 0 ? (
                  <span className="text-slate-500">
                    Click &quot;Trigger Rising CLK (↑)&quot; to capture edge-triggered
                    state transitions.
                  </span>
                ) : (
                  ffHistory.map((h) => (
                    <span
                      key={h.edge}
                      className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300"
                    >
                      ↑#{h.edge} ({h.inputs}): Q {h.qPrev} →{" "}
                      <strong className="text-emerald-400">{h.qNext}</strong>
                    </span>
                  ))
                )}
              </div>
            </div>

            <div className="lg:col-span-5 space-y-4">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 font-mono text-xs space-y-2">
                <div className="text-cyan-400 font-semibold">
                  Edge-Triggered Flip-Flop State Update Architecture
                </div>
                <pre className="text-slate-300 overflow-x-auto leading-relaxed">
{`// Rising-Edge Detector & State Transition Engine
function stepFlipFlop(prevClk: 0|1, currClk: 0|1, Q: 0|1) {
  const risingEdge = prevClk === 0 && currClk === 1;
  if (!risingEdge) return Q; // Level-insensitive hold!
  ${
    ffType === "D"
      ? "return D;"
      : ffType === "T"
      ? "return (T === 1 ? (Q ^ 1) : Q) as 0|1;"
      : "if (J && K) return (Q ^ 1) as 0|1;\n  if (J) return 1;\n  if (K) return 0;\n  return Q;"
  }
}`}
                </pre>
              </div>
            </div>

            <div className="lg:col-span-12">
              <DigitalWaveformView
                title={`Mathematically Proved ${ffType} Flip-Flop Synchronous Clocked Waveform`}
                subtitle="Demonstrates positive-edge (CLK↑) state transitions and level-insensitive hold intervals."
                equations={[
                  {
                    label: `${ffType} Characteristic Equation`,
                    expr:
                      ffType === "D"
                        ? "Q(t+1) = D"
                        : ffType === "T"
                        ? "Q(t+1) = T ⊕ Q(t)"
                        : "Q(t+1) = J·Q'(t) + K'·Q(t)",
                  },
                ]}
                verificationNote="Positive-Edge Triggered Recurrence Verified"
                stepLabels={[
                  "t0(CLK=0)",
                  "t1(↑SET)",
                  "t2(CLK=0)",
                  "t3(↑HOLD)",
                  "t4(CLK=0)",
                  "t5(↑RST)",
                  "t6(CLK=0)",
                  "t7(↑TOG)",
                ]}
                channels={
                  ffType === "D"
                    ? [
                        {
                          id: "ff-clk",
                          label: "CLK",
                          role: "clock",
                          values: [0, 1, 0, 1, 0, 1, 0, 1],
                        },
                        {
                          id: "ff-d",
                          label: "Input D",
                          role: "input",
                          values: [1, 1, 1, 1, 0, 0, 1, 1],
                        },
                        {
                          id: "ff-q",
                          label: "State Q(t)",
                          role: "output",
                          values: [0, 1, 1, 1, 1, 0, 0, 1],
                          formula: "Q(t+1) = D",
                        },
                        {
                          id: "ff-qb",
                          label: "Comp Q'(t)",
                          role: "output",
                          values: [1, 0, 0, 0, 0, 1, 1, 0],
                        },
                      ]
                    : ffType === "T"
                    ? [
                        {
                          id: "ff-clk",
                          label: "CLK",
                          role: "clock",
                          values: [0, 1, 0, 1, 0, 1, 0, 1],
                        },
                        {
                          id: "ff-t",
                          label: "Input T",
                          role: "input",
                          values: [1, 1, 0, 0, 1, 1, 1, 1],
                        },
                        {
                          id: "ff-q",
                          label: "State Q(t)",
                          role: "output",
                          values: [0, 1, 1, 1, 1, 0, 0, 1],
                          formula: "T ⊕ Q(t)",
                        },
                        {
                          id: "ff-qb",
                          label: "Comp Q'(t)",
                          role: "output",
                          values: [1, 0, 0, 0, 0, 1, 1, 0],
                        },
                      ]
                    : [
                        {
                          id: "ff-clk",
                          label: "CLK",
                          role: "clock",
                          values: [0, 1, 0, 1, 0, 1, 0, 1],
                        },
                        {
                          id: "ff-j",
                          label: "Input J",
                          role: "input",
                          values: [1, 1, 0, 0, 0, 0, 1, 1],
                        },
                        {
                          id: "ff-k",
                          label: "Input K",
                          role: "input",
                          values: [0, 0, 0, 0, 1, 1, 1, 1],
                        },
                        {
                          id: "ff-q",
                          label: "State Q(t)",
                          role: "output",
                          values: [0, 1, 1, 1, 1, 0, 0, 1],
                          formula: "J·Q' + K'·Q",
                        },
                        {
                          id: "ff-qb",
                          label: "Comp Q'(t)",
                          role: "output",
                          values: [1, 0, 0, 0, 0, 1, 1, 0],
                        },
                      ]
                }
              />
            </div>
          </div>
        )}
      </div>

      {/* Section 2: Web-Based Digital Logic Simulator Architectural Blueprint */}
      <div className="bg-[#111827] border border-slate-800 rounded-xl p-6 space-y-5">
        <div className="flex items-center gap-2">
          <Code2 className="w-5 h-5 text-cyan-400" />
          <h3 className="text-lg font-bold text-white">
            02. Architectural Blueprint: Implementing Web-Based Digital Logic Simulators
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-2">
            <div className="text-xs font-mono text-cyan-400 font-semibold">
              STAGE 1 · DIRECTED GRAPH NETLIST
            </div>
            <h4 className="text-sm font-bold text-white">
              Nodes, Typed Ports &amp; Directed Wires
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Represent every component as a node with indexed input/output pins
              and internal state. Store wires as directed edges{" "}
              <code className="text-cyan-300">
                (fromNode, outPort) → (toNode, inPort)
              </code>{" "}
              indexed in an O(1) hash map by destination pin.
            </p>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-2">
            <div className="text-xs font-mono text-cyan-400 font-semibold">
              STAGE 2 · COMBINATIONAL RELAXATION
            </div>
            <h4 className="text-sm font-bold text-white">
              Fixed-Point Iterative Settlement
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Evaluate pure combinational gates in a bounded relaxation loop
              (up to 60 passes) until all node output vectors reach a stable
              fixed point{" "}
              <code className="text-cyan-300">nextOuts[id] === outs[id]</code>,
              supporting both DAGs and cross-coupled SR latches.
            </p>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-2">
            <div className="text-xs font-mono text-cyan-400 font-semibold">
              STAGE 3 · TWO-PHASE SEQUENTIAL STEP
            </div>
            <h4 className="text-sm font-bold text-white">
              Rising-Edge Detection &amp; State Commit
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Compare previous clock pin state{" "}
              <code className="text-cyan-300">prevClk</code> against settled
              current clock <code className="text-cyan-300">currClk</code>.
              Commit flip-flop state transitions simultaneously after edge
              detection to prevent shoot-through races.
            </p>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-2">
            <div className="text-xs font-mono text-cyan-400 font-semibold">
              STAGE 4 · REACTIVE SVG &amp; WAVEFORMS
            </div>
            <h4 className="text-sm font-bold text-white">
              Zero-Latency Schematic &amp; Trace HUD
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Bind settled net values to SVG bezier wire strokes, 7-segment LED
              polygons, and a sliding-window ring buffer that plots multi-channel
              timing diagrams on every input or clock event.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
