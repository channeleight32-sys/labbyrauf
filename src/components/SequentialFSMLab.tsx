import React, { useState } from "react";
import { StepForward, RotateCcw, ArrowRight } from "lucide-react";
import DigitalWaveformView from "./DigitalWaveformView";

interface FSMStateNode {
  id: string;
  label: string;
  mooreOut?: string;
  x: number;
  y: number;
}

interface FSMTransition {
  from: string;
  to: string;
  input: number;
  mealyOut?: number;
}

interface FSMPreset {
  name: string;
  type: "Mealy" | "Moore";
  description: string;
  equations: string[];
  states: FSMStateNode[];
  transitions: FSMTransition[];
}

const FSM_PRESETS: Record<string, FSMPreset> = {
  "1011 Sequence Detector (Mealy)": {
    name: "1011 Sequence Detector (Mealy)",
    type: "Mealy",
    description:
      "Detects overlapping serial bit pattern '1011'. In a Mealy machine, output Z depends on both present state and current input X, requiring only 4 states (S0–S3).",
    equations: [
      "D1 = Q1·Q0'·X + Q1'·Q0·X'",
      "D0 = Q1'·X + Q0'·X",
      "Z (Output) = Q1 · Q0 · X",
    ],
    states: [
      { id: "S0", label: "00 (Idle)", x: 110, y: 120 },
      { id: "S1", label: "01 ('1')", x: 290, y: 60 },
      { id: "S2", label: "10 ('10')", x: 470, y: 120 },
      { id: "S3", label: "11 ('101')", x: 290, y: 200 },
    ],
    transitions: [
      { from: "S0", to: "S0", input: 0, mealyOut: 0 },
      { from: "S0", to: "S1", input: 1, mealyOut: 0 },
      { from: "S1", to: "S2", input: 0, mealyOut: 0 },
      { from: "S1", to: "S1", input: 1, mealyOut: 0 },
      { from: "S2", to: "S0", input: 0, mealyOut: 0 },
      { from: "S2", to: "S3", input: 1, mealyOut: 0 },
      { from: "S3", to: "S2", input: 0, mealyOut: 0 },
      { from: "S3", to: "S1", input: 1, mealyOut: 1 },
    ],
  },
  "1011 Sequence Detector (Moore)": {
    name: "1011 Sequence Detector (Moore)",
    type: "Moore",
    description:
      "Detects overlapping pattern '1011' using a Moore architecture where output Z depends strictly on the present state, requiring 5 states (S0–S4).",
    equations: [
      "State Encoding: S0=000, S1=001, S2=010, S3=011, S4=100",
      "Z (Output) = Q2 (HIGH only in state S4)",
    ],
    states: [
      { id: "S0", label: "S0", mooreOut: "0", x: 80, y: 130 },
      { id: "S1", label: "S1 ('1')", mooreOut: "0", x: 210, y: 55 },
      { id: "S2", label: "S2 ('10')", mooreOut: "0", x: 360, y: 55 },
      { id: "S3", label: "S3 ('101')", mooreOut: "0", x: 500, y: 130 },
      { id: "S4", label: "S4 ('1011')", mooreOut: "1", x: 290, y: 210 },
    ],
    transitions: [
      { from: "S0", to: "S0", input: 0, mealyOut: 0 },
      { from: "S0", to: "S1", input: 1, mealyOut: 0 },
      { from: "S1", to: "S2", input: 0, mealyOut: 0 },
      { from: "S1", to: "S1", input: 1, mealyOut: 0 },
      { from: "S2", to: "S0", input: 0, mealyOut: 0 },
      { from: "S2", to: "S3", input: 1, mealyOut: 0 },
      { from: "S3", to: "S2", input: 0, mealyOut: 0 },
      { from: "S3", to: "S4", input: 1, mealyOut: 1 },
      { from: "S4", to: "S2", input: 0, mealyOut: 0 },
      { from: "S4", to: "S1", input: 1, mealyOut: 0 },
    ],
  },
  "2-Bit Up/Down Counter (Moore)": {
    name: "2-Bit Up/Down Counter (Moore)",
    type: "Moore",
    description:
      "Counts 00 → 01 → 10 → 11 when Input X = 1 (Up) and 11 → 10 → 01 → 00 when Input X = 0 (Down).",
    equations: [
      "T0 = 1 (LSB toggles on every clock edge)",
      "T1 = (Q0 · X) + (Q0' · X')",
      "Z (Terminal Count) = Q1 · Q0",
    ],
    states: [
      { id: "S0", label: "00 (0)", mooreOut: "0", x: 120, y: 70 },
      { id: "S1", label: "01 (1)", mooreOut: "0", x: 420, y: 70 },
      { id: "S2", label: "10 (2)", mooreOut: "0", x: 420, y: 195 },
      { id: "S3", label: "11 (3)", mooreOut: "1", x: 120, y: 195 },
    ],
    transitions: [
      { from: "S0", to: "S1", input: 1, mealyOut: 0 },
      { from: "S1", to: "S2", input: 1, mealyOut: 0 },
      { from: "S2", to: "S3", input: 1, mealyOut: 1 },
      { from: "S3", to: "S0", input: 1, mealyOut: 0 },
      { from: "S0", to: "S3", input: 0, mealyOut: 1 },
      { from: "S3", to: "S2", input: 0, mealyOut: 0 },
      { from: "S2", to: "S1", input: 0, mealyOut: 0 },
      { from: "S1", to: "S0", input: 0, mealyOut: 0 },
    ],
  },
};

const FF_CONVERSIONS: Record<
  string,
  {
    characteristic: string;
    excitation: { qt: number; qt1: number; req: string }[];
    conversions: { target: string; formula: string }[];
  }
> = {
  D: {
    characteristic: "Q(t+1) = D",
    excitation: [
      { qt: 0, qt1: 0, req: "D = 0" },
      { qt: 0, qt1: 1, req: "D = 1" },
      { qt: 1, qt1: 0, req: "D = 0" },
      { qt: 1, qt1: 1, req: "D = 1" },
    ],
    conversions: [
      { target: "D → JK Flip-Flop", formula: "D = J·Q' + K'·Q" },
      { target: "D → T Flip-Flop", formula: "D = T ⊕ Q = T·Q' + T'·Q" },
      { target: "D → SR Flip-Flop", formula: "D = S + R'·Q (with S·R = 0)" },
    ],
  },
  JK: {
    characteristic: "Q(t+1) = J·Q' + K'·Q",
    excitation: [
      { qt: 0, qt1: 0, req: "J = 0, K = X" },
      { qt: 0, qt1: 1, req: "J = 1, K = X" },
      { qt: 1, qt1: 0, req: "J = X, K = 1" },
      { qt: 1, qt1: 1, req: "J = X, K = 0" },
    ],
    conversions: [
      { target: "JK → D Flip-Flop", formula: "J = D, K = D'" },
      { target: "JK → T Flip-Flop", formula: "J = T, K = T" },
      { target: "JK → SR Flip-Flop", formula: "J = S, K = R" },
    ],
  },
  T: {
    characteristic: "Q(t+1) = T ⊕ Q",
    excitation: [
      { qt: 0, qt1: 0, req: "T = 0" },
      { qt: 0, qt1: 1, req: "T = 1" },
      { qt: 1, qt1: 0, req: "T = 1" },
      { qt: 1, qt1: 1, req: "T = 0" },
    ],
    conversions: [
      { target: "T → D Flip-Flop", formula: "T = D ⊕ Q" },
      { target: "T → JK Flip-Flop", formula: "T = J·Q' + K·Q" },
      { target: "T → SR Flip-Flop", formula: "T = S·Q' + R·Q" },
    ],
  },
  SR: {
    characteristic: "Q(t+1) = S + R'·Q  (S·R = 0)",
    excitation: [
      { qt: 0, qt1: 0, req: "S = 0, R = X" },
      { qt: 0, qt1: 1, req: "S = 1, R = 0" },
      { qt: 1, qt1: 0, req: "S = 0, R = 1" },
      { qt: 1, qt1: 1, req: "S = X, R = 0" },
    ],
    conversions: [
      { target: "SR → D Flip-Flop", formula: "S = D, R = D'" },
      { target: "SR → JK Flip-Flop", formula: "S = J·Q', R = K·Q" },
      { target: "SR → T Flip-Flop", formula: "S = T·Q', R = T·Q" },
    ],
  },
};

export default function SequentialFSMLab() {
  const [selectedFSM, setSelectedFSM] = useState<string>(
    "1011 Sequence Detector (Mealy)"
  );
  const [currentState, setCurrentState] = useState<string>("S0");
  const currentStateRef = React.useRef<string>("S0");
  currentStateRef.current = currentState;

  const [traceLog, setTraceLog] = useState<
    { step: number; from: string; input: number; to: string; output: number }[]
  >([]);
  const [selectedFF, setSelectedFF] = useState<"D" | "JK" | "T" | "SR">("JK");

  // Shift register & Ring/Johnson counter state
  const [regMode, setRegMode] = useState<"SIPO" | "RING" | "JOHNSON">("JOHNSON");
  const [regBits, setRegBits] = useState<[number, number, number, number]>([
    1, 0, 0, 0,
  ]);
  const [serialIn, setSerialIn] = useState<number>(1);

  const fsm = FSM_PRESETS[selectedFSM];

  const stepFSM = (inputBit: number) => {
    const activeSt = currentStateRef.current;
    const tr = fsm.transitions.find(
      (t) => t.from === activeSt && t.input === inputBit
    );
    if (!tr) return;
    const nextStateNode = fsm.states.find((s) => s.id === tr.to);
    const outVal =
      fsm.type === "Moore"
        ? Number(nextStateNode?.mooreOut || 0)
        : tr.mealyOut ?? 0;

    currentStateRef.current = tr.to;
    setCurrentState(tr.to);
    setTraceLog((prev) => [
      ...prev.slice(-11),
      {
        step: prev.length > 0 ? prev[prev.length - 1].step + 1 : 1,
        from: activeSt,
        input: inputBit,
        to: tr.to,
        output: outVal,
      },
    ]);
  };

  const stepRegister = () => {
    setRegBits((prev) => {
      const [q3, q2, q1, q0] = prev;
      if (regMode === "SIPO") {
        return [serialIn, q3, q2, q1];
      } else if (regMode === "RING") {
        return [q0, q3, q2, q1];
      } else {
        // Johnson (Twisted-Ring) Counter feeds Q0' back to MSB
        return [q0 ^ 1, q3, q2, q1];
      }
    });
  };

  const ffData = FF_CONVERSIONS[selectedFF];

  return (
    <div className="space-y-10">
      {/* Section 1: Interactive Finite State Machine (FSM) Studio */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 bg-[#111827] border border-slate-800 rounded-xl p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-white">
                01. Finite State Machine (FSM) Studio — Mealy vs. Moore
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Feed serial bits <code className="text-cyan-400">X = 0</code> or{" "}
                <code className="text-cyan-400">X = 1</code> to step through the
                state transition graph and compare Mealy and Moore outputs.
              </p>
            </div>

            <select
              value={selectedFSM}
              onChange={(e) => {
                setSelectedFSM(e.target.value);
                setCurrentState("S0");
                setTraceLog([]);
              }}
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-medium text-white focus:outline-none focus:border-cyan-400"
            >
              {Object.keys(FSM_PRESETS).map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>

          <p className="text-xs text-slate-300 bg-slate-900/80 border border-slate-800 rounded-lg p-3">
            {fsm.description}
          </p>

          {/* Interactive SVG State Transition Diagram */}
          <div className="bg-[#070A12] border border-slate-800 rounded-xl p-3 overflow-x-auto">
            <svg viewBox="0 0 600 265" className="w-full h-64 block">
              <defs>
                <marker
                  id="fsm-arrow"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#64748b" />
                </marker>
                <marker
                  id="fsm-arrow-active"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#22c55e" />
                </marker>
              </defs>

              {/* Transitions */}
              {fsm.transitions.map((tr, idx) => {
                const sFrom = fsm.states.find((s) => s.id === tr.from);
                const sTo = fsm.states.find((s) => s.id === tr.to);
                if (!sFrom || !sTo) return null;

                const lastTrace =
                  traceLog.length > 0 ? traceLog[traceLog.length - 1] : null;
                const isLastTaken =
                  lastTrace &&
                  lastTrace.from === tr.from &&
                  lastTrace.input === tr.input;

                const labelText =
                  fsm.type === "Mealy"
                    ? `${tr.input} / ${tr.mealyOut}`
                    : `${tr.input}`;

                if (tr.from === tr.to) {
                  // Self-loop arc
                  const d = `M ${sFrom.x - 16},${sFrom.y - 26} C ${
                    sFrom.x - 36
                  },${sFrom.y - 68} ${sFrom.x + 36},${sFrom.y - 68} ${
                    sFrom.x + 16
                  },${sFrom.y - 26}`;
                  return (
                    <g key={idx}>
                      <path
                        d={d}
                        fill="none"
                        stroke={isLastTaken ? "#22c55e" : "#334155"}
                        strokeWidth={isLastTaken ? 2.5 : 1.8}
                        markerEnd={
                          isLastTaken
                            ? "url(#fsm-arrow-active)"
                            : "url(#fsm-arrow)"
                        }
                      />
                      <text
                        x={sFrom.x}
                        y={sFrom.y - 60}
                        textAnchor="middle"
                        fill={isLastTaken ? "#4ade80" : "#94a3b8"}
                        fontSize="11"
                        fontFamily="JetBrains Mono, monospace"
                      >
                        {labelText}
                      </text>
                    </g>
                  );
                }

                const dx = sTo.x - sFrom.x;
                const dy = sTo.y - sFrom.y;
                const dist = Math.hypot(dx, dy) || 1;
                const ux = dx / dist;
                const uy = dy / dist;
                const r = 30;
                const startX = sFrom.x + ux * r;
                const startY = sFrom.y + uy * r;
                const endX = sTo.x - ux * (r + 4);
                const endY = sTo.y - uy * (r + 4);

                // Curve offset to prevent overlapping bi-directional edges
                const curveOffset = tr.input === 1 ? 18 : -18;
                const midX = (startX + endX) / 2 - uy * curveOffset;
                const midY = (startY + endY) / 2 + ux * curveOffset;

                return (
                  <g key={idx}>
                    <path
                      d={`M ${startX},${startY} Q ${midX},${midY} ${endX},${endY}`}
                      fill="none"
                      stroke={isLastTaken ? "#22c55e" : "#475569"}
                      strokeWidth={isLastTaken ? 2.6 : 1.8}
                      markerEnd={
                        isLastTaken
                          ? "url(#fsm-arrow-active)"
                          : "url(#fsm-arrow)"
                      }
                    />
                    <text
                      x={midX}
                      y={midY - 4}
                      textAnchor="middle"
                      fill={isLastTaken ? "#4ade80" : "#cbd5e1"}
                      fontSize="11"
                      fontWeight="bold"
                      fontFamily="JetBrains Mono, monospace"
                    >
                      {labelText}
                    </text>
                  </g>
                );
              })}

              {/* State Nodes */}
              {fsm.states.map((st) => {
                const active = st.id === currentState;
                return (
                  <g
                    key={st.id}
                    onClick={() => setCurrentState(st.id)}
                    className="cursor-pointer"
                  >
                    <circle
                      cx={st.x}
                      cy={st.y}
                      r={29}
                      fill={active ? "rgba(6, 182, 212, 0.22)" : "#111827"}
                      stroke={active ? "#06b6d4" : "#475569"}
                      strokeWidth={active ? 3 : 2}
                    />
                    <text
                      x={st.x}
                      y={st.y - 2}
                      textAnchor="middle"
                      fill={active ? "#ffffff" : "#cbd5e1"}
                      fontSize="11"
                      fontWeight="bold"
                      fontFamily="JetBrains Mono, monospace"
                    >
                      {st.id}
                    </text>
                    <text
                      x={st.x}
                      y={st.y + 13}
                      textAnchor="middle"
                      fill={active ? "#38bdf8" : "#94a3b8"}
                      fontSize="9.5"
                      fontFamily="JetBrains Mono, monospace"
                    >
                      {fsm.type === "Moore"
                        ? `Z=${st.mooreOut}`
                        : st.label.split(" ")[0]}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Interactive Input Controls & Sequence Feed */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-xl p-3.5">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => stepFSM(0)}
                className="px-4 py-2 rounded-lg font-mono text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition-colors cursor-pointer"
              >
                Clock Input X = 0
              </button>
              <button
                type="button"
                onClick={() => stepFSM(1)}
                className="px-4 py-2 rounded-lg font-mono text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-colors cursor-pointer"
              >
                Clock Input X = 1
              </button>
              <button
                type="button"
                onClick={() => {
                  // Auto feed '1011' test pattern
                  [1, 0, 1, 1].forEach((b, idx) => {
                    setTimeout(() => stepFSM(b), idx * 220);
                  });
                }}
                className="px-3 py-2 rounded-lg font-mono text-xs font-semibold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 transition-colors cursor-pointer"
              >
                Feed &quot;1011&quot;
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setCurrentState("S0");
                setTraceLog([]);
              }}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-mono text-slate-400 hover:text-white cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset FSM
            </button>
          </div>
        </div>

        {/* Right: State Transition Table, Synthesis Equations & Execution Trace */}
        <div className="lg:col-span-5 bg-[#111827] border border-slate-800 rounded-xl p-6 space-y-5">
          <h3 className="text-lg font-bold text-white">
            02. State Transition Table &amp; Synthesis Equations
          </h3>

          <div className="overflow-hidden rounded-lg border border-slate-800">
            <table className="w-full text-xs font-mono tabular-nums border-collapse">
              <thead>
                <tr className="bg-slate-900 text-cyan-400 border-b border-slate-800">
                  <th className="py-2 px-3 text-left">Present State</th>
                  <th className="py-2 px-3 text-center">Next (X=0)</th>
                  <th className="py-2 px-3 text-center">Next (X=1)</th>
                  <th className="py-2 px-3 text-center">Output Z</th>
                </tr>
              </thead>
              <tbody>
                {fsm.states.map((st) => {
                  const t0 = fsm.transitions.find(
                    (t) => t.from === st.id && t.input === 0
                  );
                  const t1 = fsm.transitions.find(
                    (t) => t.from === st.id && t.input === 1
                  );
                  const active = st.id === currentState;
                  return (
                    <tr
                      key={st.id}
                      className={`border-b border-slate-800/70 last:border-b-0 ${
                        active
                          ? "bg-cyan-500/15 text-white font-bold"
                          : "text-slate-300"
                      }`}
                    >
                      <td className="py-2 px-3">{st.label}</td>
                      <td className="py-2 px-3 text-center">{t0?.to || "-"}</td>
                      <td className="py-2 px-3 text-center">{t1?.to || "-"}</td>
                      <td className="py-2 px-3 text-center text-emerald-400">
                        {fsm.type === "Moore"
                          ? `Z = ${st.mooreOut}`
                          : `X=0→${t0?.mealyOut ?? 0}, X=1→${t1?.mealyOut ?? 0}`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-lg p-3.5 space-y-1.5 font-mono text-xs">
            <div className="text-slate-400 text-[11px]">
              Flip-Flop Excitation &amp; Output Equations:
            </div>
            {fsm.equations.map((eq, i) => (
              <div key={i} className="text-cyan-300 font-semibold">
                {eq}
              </div>
            ))}
          </div>

          {/* Trace History */}
          <div>
            <div className="text-xs font-semibold text-slate-400 mb-2">
              Serial Bit-Stream Execution Trace
            </div>
            {traceLog.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center bg-slate-900/60 border border-slate-800 rounded-lg">
                Click &quot;Clock Input X = 0&quot; or &quot;X = 1&quot; to
                record state transitions.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {traceLog.map((item) => (
                  <div
                    key={item.step}
                    className={`px-2.5 py-1.5 rounded-lg border font-mono text-xs ${
                      item.output === 1
                        ? "bg-emerald-500/20 border-emerald-400 text-emerald-200 font-bold"
                        : "bg-slate-900 border-slate-800 text-slate-300"
                    }`}
                  >
                    #{item.step}: {item.from} --({item.input}/{item.output})→{" "}
                    {item.to}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Full-Width FSM Mathematically Proved Timing Waveform */}
        <div className="lg:col-span-12">
          {(() => {
            const testSeq = [1, 0, 1, 1, 0, 1, 1, 0];
            let stCursor = "S0";
            const stateHistory: string[] = [];
            const nextStateHistory: string[] = [];
            const zHistory: number[] = [];
            const q1Bits: number[] = [];
            const q0Bits: number[] = [];

            testSeq.forEach((xBit) => {
              stateHistory.push(stCursor);
              const sIdx = parseInt(stCursor.replace("S", ""), 10) || 0;
              q1Bits.push((sIdx >> 1) & 1);
              q0Bits.push(sIdx & 1);
              const tr = fsm.transitions.find(
                (t) => t.from === stCursor && t.input === xBit
              );
              const nextSt = tr ? tr.to : stCursor;
              nextStateHistory.push(nextSt);
              const nextNode = fsm.states.find((s) => s.id === nextSt);
              const outZ =
                fsm.type === "Moore"
                  ? Number(nextNode?.mooreOut || 0)
                  : tr?.mealyOut ?? 0;
              zHistory.push(outZ);
              stCursor = nextSt;
            });

            return (
              <DigitalWaveformView
                title={`Mathematically Proved ${fsm.type} FSM Timing Waveform — ${fsm.name}`}
                subtitle="Evaluates overlapping bit stream X = [1, 0, 1, 1, 0, 1, 1, 0] across 8 synchronous rising clock edges."
                equations={fsm.equations.map((eq, i) => ({
                  label: `Equation ${i + 1}`,
                  expr: eq,
                }))}
                verificationNote={`${fsm.type} Machine State Transition Proof`}
                stepLabels={testSeq.map((b, i) => `CLK↑${i + 1}(X=${b})`)}
                channels={[
                  {
                    id: "fsm-clk",
                    label: "CLK",
                    role: "clock",
                    values: [1, 1, 1, 1, 1, 1, 1, 1],
                  },
                  {
                    id: "fsm-x",
                    label: "Serial Input X",
                    role: "input",
                    values: testSeq,
                  },
                  {
                    id: "fsm-q1",
                    label: "State Bit Q1",
                    role: "intermediate",
                    values: q1Bits,
                  },
                  {
                    id: "fsm-q0",
                    label: "State Bit Q0",
                    role: "intermediate",
                    values: q0Bits,
                  },
                  {
                    id: "fsm-z",
                    label: "Output Z",
                    role: "output",
                    values: zHistory,
                    formula: fsm.type === "Mealy" ? "λ(Q, X)" : "λ(Q)",
                  },
                  {
                    id: "fsm-st",
                    label: "Transition",
                    role: "bus",
                    values: stateHistory.map(
                      (s, i) => `${s}→${nextStateHistory[i]}`
                    ),
                  },
                ]}
              />
            );
          })()}
        </div>
      </div>

      {/* Section 2: Flip-Flop Excitation & Conversion Reference + Shift Register / Ring / Johnson Counter */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Flip-Flop Excitation & Conversion Table */}
        <div className="lg:col-span-6 bg-[#111827] border border-slate-800 rounded-xl p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-lg font-bold text-white">
                03. Flip-Flop Excitation &amp; Conversion Matrix
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Characteristic equations, state transition excitation inputs,
                and algebraic conversion formulas.
              </p>
            </div>

            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
              {(["D", "JK", "T", "SR"] as const).map((ff) => (
                <button
                  key={ff}
                  type="button"
                  onClick={() => setSelectedFF(ff)}
                  className={`px-3 py-1 rounded text-xs font-mono font-semibold cursor-pointer ${
                    selectedFF === ff
                      ? "bg-cyan-500/20 text-cyan-300"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {ff} FF
                </button>
              ))}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 font-mono text-xs flex items-center justify-between">
            <span className="text-slate-400">Characteristic Equation:</span>
            <span className="text-emerald-400 font-bold text-sm">
              {ffData.characteristic}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="overflow-hidden rounded-lg border border-slate-800">
              <table className="w-full text-xs font-mono tabular-nums border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-cyan-400 border-b border-slate-800">
                    <th className="py-2 px-2.5 text-center">Q(t)</th>
                    <th className="py-2 px-2.5 text-center">Q(t+1)</th>
                    <th className="py-2 px-2.5 text-left">Required Excitation</th>
                  </tr>
                </thead>
                <tbody>
                  {ffData.excitation.map((row, idx) => (
                    <tr
                      key={idx}
                      className="border-b border-slate-800/70 last:border-b-0 text-slate-300"
                    >
                      <td className="py-1.5 px-2.5 text-center">{row.qt}</td>
                      <td className="py-1.5 px-2.5 text-center font-bold text-white">
                        {row.qt1}
                      </td>
                      <td className="py-1.5 px-2.5 text-amber-300 font-semibold">
                        {row.req}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-400">
                Flip-Flop Conversion Equations
              </div>
              {ffData.conversions.map((c) => (
                <div
                  key={c.target}
                  className="bg-slate-900/90 border border-slate-800 rounded-lg p-2.5 font-mono text-xs"
                >
                  <div className="text-slate-400 text-[11px]">{c.target}</div>
                  <div className="text-cyan-300 font-bold mt-0.5">
                    {c.formula}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Interactive Shift Register, Ring Counter & Johnson Counter */}
        <div className="lg:col-span-6 bg-[#111827] border border-slate-800 rounded-xl p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-lg font-bold text-white">
                04. Shift Register, Ring &amp; Johnson Counter Animator
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Compare Serial-In Parallel-Out (SIPO), 4-state Ring Counter, and
                8-state Johnson (Twisted-Ring) Counter.
              </p>
            </div>

            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
              {(["SIPO", "RING", "JOHNSON"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setRegMode(m);
                    setRegBits([1, 0, 0, 0]);
                  }}
                  className={`px-2.5 py-1 rounded text-xs font-mono font-semibold cursor-pointer ${
                    regMode === m
                      ? "bg-cyan-500/20 text-cyan-300"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* 4-Stage Flip-Flop Register Visualization */}
          <div className="grid grid-cols-4 gap-3">
            {regBits.map((bit, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-xl border text-center font-mono transition-colors ${
                  bit === 1
                    ? "bg-emerald-500/15 border-emerald-500 text-emerald-300"
                    : "bg-slate-900 border-slate-800 text-slate-400"
                }`}
              >
                <div className="text-xs text-slate-400">Stage Q{3 - idx}</div>
                <div className="text-3xl font-bold my-1">{bit}</div>
                <div className="text-[10px]">
                  {bit === 1 ? "HIGH (1)" : "LOW (0)"}
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-xl p-3.5">
            <div className="flex items-center gap-2">
              {regMode === "SIPO" && (
                <button
                  type="button"
                  onClick={() => setSerialIn((v) => v ^ 1)}
                  className={`px-3 py-2 rounded-lg font-mono text-xs font-bold border cursor-pointer ${
                    serialIn === 1
                      ? "bg-emerald-500/20 border-emerald-500 text-emerald-300"
                      : "bg-slate-800 border-slate-700 text-slate-300"
                  }`}
                >
                  Serial Data In = {serialIn}
                </button>
              )}
              <button
                type="button"
                onClick={stepRegister}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg font-mono text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-colors cursor-pointer"
              >
                <StepForward className="w-3.5 h-3.5" />
                Pulse Shift Clock (CLK ↑)
              </button>
            </div>

            <div className="text-xs font-mono text-slate-400">
              {regMode === "SIPO" && "Feedback: Serial In → Q3 → Q2 → Q1 → Q0"}
              {regMode === "RING" && "Feedback: Q0 → Q3 (Mod-4, 4 unique states)"}
              {regMode === "JOHNSON" &&
                "Feedback: Q0' → Q3 (Mod-8, 8 unique states)"}
            </div>
          </div>

          {/* Shift Register / Ring / Johnson Counter Multi-Cycle Timing Waveform */}
          {(() => {
            const steps = 8;
            let bits: [number, number, number, number] = [1, 0, 0, 0];
            const q3Arr: number[] = [];
            const q2Arr: number[] = [];
            const q1Arr: number[] = [];
            const q0Arr: number[] = [];
            const busArr: string[] = [];

            for (let i = 0; i < steps; i++) {
              q3Arr.push(bits[0]);
              q2Arr.push(bits[1]);
              q1Arr.push(bits[2]);
              q0Arr.push(bits[3]);
              busArr.push(bits.join(""));
              const [b3, b2, b1, b0] = bits;
              if (regMode === "SIPO") {
                bits = [serialIn, b3, b2, b1];
              } else if (regMode === "RING") {
                bits = [b0, b3, b2, b1];
              } else {
                bits = [b0 ^ 1, b3, b2, b1];
              }
            }

            return (
              <DigitalWaveformView
                compact
                title={`${regMode} 4-Stage Synchronous Shift Waveform`}
                equations={[
                  {
                    label: "Recurrence Relation",
                    expr:
                      regMode === "SIPO"
                        ? "Q3(t+1)=Din, Q2(t+1)=Q3(t), Q1(t+1)=Q2(t), Q0(t+1)=Q1(t)"
                        : regMode === "RING"
                        ? "Q3(t+1)=Q0(t) [Mod-4 One-Hot Ring]"
                        : "Q3(t+1)=Q0'(t) [Mod-8 Twisted-Ring Johnson]",
                  },
                ]}
                verificationNote={
                  regMode === "JOHNSON" ? "2n = 8 States Proved" : "Shift Recurrence Proved"
                }
                stepLabels={Array.from({ length: steps }, (_, i) => `T${i}`)}
                channels={[
                  { id: "sr-q3", label: "Q3 (MSB)", role: "output", values: q3Arr },
                  { id: "sr-q2", label: "Q2", role: "output", values: q2Arr },
                  { id: "sr-q1", label: "Q1", role: "output", values: q1Arr },
                  { id: "sr-q0", label: "Q0 (LSB)", role: "output", values: q0Arr },
                  { id: "sr-bus", label: "State Q[3:0]", role: "bus", values: busArr },
                ]}
              />
            );
          })()}
        </div>
      </div>
    </div>
  );
}
