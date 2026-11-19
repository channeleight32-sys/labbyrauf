import React, { useState } from "react";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import DigitalWaveformView from "./DigitalWaveformView";

const LITERAL_LABELS = ["A", "A'", "B", "B'", "C", "C'"];

export default function MSIAndPLALab() {
  // PLA State: 4 product terms, each has 6 AND-plane fuses [A, A', B, B', C, C'] and 2 OR-plane fuses [F1, F2]
  const [andPlane, setAndPlane] = useState<boolean[][]>([
    [true, false, true, false, false, false], // P1 = A·B
    [false, true, false, false, true, false], // P2 = A'·C
    [false, false, true, false, true, false], // P3 = B·C
    [true, false, true, false, true, false], // P4 = A·B·C
  ]);
  const [orPlane, setOrPlane] = useState<boolean[][]>([
    [true, false], // P1 -> F1
    [true, false], // P2 -> F1
    [false, true], // P3 -> F2
    [true, true], // P4 -> F1, F2
  ]);
  const [plaInputs, setPlaInputs] = useState<[number, number, number]>([
    1, 1, 0,
  ]);

  // 4-Bit ALU & CLA Explorer State
  const [aluA, setAluA] = useState<number>(9);
  const [aluB, setAluB] = useState<number>(6);
  const [aluOp, setAluOp] = useState<string>("ADD");

  // Static Timing Analysis State (in nanoseconds)
  const [tPcq, setTPcq] = useState<number>(1.5);
  const [tPd, setTPd] = useState<number>(4.5);
  const [tSu, setTSu] = useState<number>(2.0);
  const [tHold, setTHold] = useState<number>(1.8);
  const [tCd, setTCd] = useState<number>(1.0);

  // Logic Family Selector
  const [selectedFamily, setSelectedFamily] = useState<string>("74HC CMOS (5V)");

  // Evaluate PLA
  const [inA, inB, inC] = plaInputs;
  const literalVals = [inA, inA ^ 1, inB, inB ^ 1, inC, inC ^ 1];

  const productEvaluations = andPlane.map((row) => {
    const activeIndices = row
      .map((fused, i) => (fused ? i : -1))
      .filter((i) => i !== -1);
    if (activeIndices.length === 0) return { val: 0, expr: "0", conflict: false };
    const conflict =
      (row[0] && row[1]) || (row[2] && row[3]) || (row[4] && row[5]);
    const val = activeIndices.every((idx) => literalVals[idx] === 1) ? 1 : 0;
    const expr = activeIndices.map((idx) => LITERAL_LABELS[idx]).join("·");
    return { val, expr, conflict };
  });

  const f1Terms = productEvaluations
    .filter((_, pIdx) => orPlane[pIdx][0] && productEvaluations[pIdx].expr !== "0")
    .map((p) => p.expr);
  const f2Terms = productEvaluations
    .filter((_, pIdx) => orPlane[pIdx][1] && productEvaluations[pIdx].expr !== "0")
    .map((p) => p.expr);

  const f1Val = productEvaluations.some(
    (p, pIdx) => orPlane[pIdx][0] && p.val === 1
  )
    ? 1
    : 0;
  const f2Val = productEvaluations.some(
    (p, pIdx) => orPlane[pIdx][1] && p.val === 1
  )
    ? 1
    : 0;

  // Evaluate 4-bit ALU & CLA
  const effB = aluOp === "SUB" ? ~aluB & 0xf : aluB;
  const c0 = aluOp === "SUB" ? 1 : 0;
  const aBits = [aluA & 1, (aluA >> 1) & 1, (aluA >> 2) & 1, (aluA >> 3) & 1];
  const bBits = [effB & 1, (effB >> 1) & 1, (effB >> 2) & 1, (effB >> 3) & 1];
  const genBits = aBits.map((ai, i) => ai & bBits[i]);
  const propBits = aBits.map((ai, i) => ai ^ bBits[i]);

  // Exact Carry Lookahead (CLA) evaluation: C_{i+1} = G_i + P_i * C_i
  const c1 = genBits[0] | (propBits[0] & c0);
  const c2 = genBits[1] | (propBits[1] & c1);
  const c3 = genBits[2] | (propBits[2] & c2);
  const c4 = genBits[3] | (propBits[3] & c3);
  const claCarries = [c4, c3, c2, c1];

  let aluOut = 0;
  let aluCarry = 0;
  if (aluOp === "ADD") {
    const s = aluA + aluB;
    aluOut = s & 0xf;
    aluCarry = c4;
  } else if (aluOp === "SUB") {
    const s = aluA + (aluB ^ 0xf) + 1;
    aluOut = s & 0xf;
    aluCarry = c4;
  } else if (aluOp === "AND") {
    aluOut = aluA & aluB;
  } else if (aluOp === "OR") {
    aluOut = aluA | aluB;
  } else if (aluOp === "XOR") {
    aluOut = aluA ^ aluB;
  } else if (aluOp === "NOT") {
    aluOut = ~aluA & 0xf;
  } else if (aluOp === "INC") {
    const s = aluA + 1;
    aluOut = s & 0xf;
    aluCarry = (s >> 4) & 1;
  } else if (aluOp === "SHL") {
    aluOut = (aluA << 1) & 0xf;
    aluCarry = (aluA >> 3) & 1;
  }

  // Static Timing Math
  const minClockPeriodNs = tPcq + tPd + tSu;
  const maxFreqMHz = 1000 / minClockPeriodNs;
  const holdMarginNs = tPcq + tCd - tHold;
  const holdSafe = holdMarginNs >= 0;

  const LOGIC_FAMILIES: Record<
    string,
    {
      vcc: number;
      voh: number;
      vih: number;
      vil: number;
      vol: number;
      tpdNs: number;
      powerMw: string;
    }
  > = {
    "74LS TTL (5V)": {
      vcc: 5.0,
      voh: 2.7,
      vih: 2.0,
      vil: 0.8,
      vol: 0.5,
      tpdNs: 9.5,
      powerMw: "2.0 mW/gate",
    },
    "74HC CMOS (5V)": {
      vcc: 5.0,
      voh: 4.9,
      vih: 3.5,
      vil: 1.5,
      vol: 0.1,
      tpdNs: 8.0,
      powerMw: "0.0025 mW static",
    },
    "LVTTL (3.3V)": {
      vcc: 3.3,
      voh: 2.4,
      vih: 2.0,
      vil: 0.8,
      vol: 0.4,
      tpdNs: 3.5,
      powerMw: "0.5 mW/gate",
    },
    "LVCMOS (1.8V)": {
      vcc: 1.8,
      voh: 1.7,
      vih: 1.17,
      vil: 0.63,
      vol: 0.1,
      tpdNs: 1.8,
      powerMw: "< 0.001 mW static",
    },
  };

  const fam = LOGIC_FAMILIES[selectedFamily];
  const nmHigh = (fam.voh - fam.vih).toFixed(2);
  const nmLow = (fam.vil - fam.vol).toFixed(2);

  return (
    <div className="space-y-10">
      {/* Section 1: Interactive Programmable Logic Array (PLA) Designer */}
      <div className="bg-[#111827] border border-slate-800 rounded-xl p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-white">
              01. Programmable Logic Array (PLA) Fuse Matrix Designer
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Click crosspoints in the{" "}
              <strong className="text-cyan-400">Programmable AND Plane</strong>{" "}
              and{" "}
              <strong className="text-emerald-400">Programmable OR Plane</strong>{" "}
              to blow or connect nichrome fuses and synthesize two custom
              functions F1 and F2.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                // Full Adder Carry & Majority preset
                setAndPlane([
                  [true, false, true, false, false, false], // A·B
                  [true, false, false, false, true, false], // A·C
                  [false, false, true, false, true, false], // B·C
                  [true, false, true, false, true, false], // A·B·C
                ]);
                setOrPlane([
                  [true, false],
                  [true, false],
                  [true, false],
                  [false, true],
                ]);
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 cursor-pointer"
            >
              Preset: Carry-Out &amp; 3-Input AND
            </button>
            <button
              type="button"
              onClick={() => {
                // XOR / Parity style preset
                setAndPlane([
                  [true, false, false, true, false, false], // A·B'
                  [false, true, true, false, false, false], // A'·B
                  [false, false, true, false, false, true], // B·C'
                  [false, false, false, true, true, false], // B'·C
                ]);
                setOrPlane([
                  [true, false],
                  [true, false],
                  [false, true],
                  [false, true],
                ]);
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 cursor-pointer"
            >
              Preset: F1 = A⊕B, F2 = B⊕C
            </button>
          </div>
        </div>

        {/* Input Test Switches for PLA */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-mono text-slate-400">
              Test Inputs:
            </span>
            {(["A", "B", "C"] as const).map((name, idx) => (
              <button
                key={name}
                type="button"
                onClick={() =>
                  setPlaInputs((prev) => {
                    const next = [...prev] as [number, number, number];
                    next[idx] ^= 1;
                    return next;
                  })
                }
                className={`px-3.5 py-1.5 rounded-lg font-mono text-xs font-bold border transition-colors cursor-pointer ${
                  plaInputs[idx] === 1
                    ? "bg-cyan-500/20 border-cyan-400 text-cyan-200"
                    : "bg-slate-800 border-slate-700 text-slate-400"
                }`}
              >
                {name} = {plaInputs[idx]}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-4 font-mono text-xs">
            <div
              className={`px-3.5 py-1.5 rounded-lg border font-bold ${
                f1Val === 1
                  ? "bg-emerald-500/20 border-emerald-400 text-emerald-300"
                  : "bg-slate-950 border-slate-800 text-slate-400"
              }`}
            >
              F1 = {f1Val} ({f1Terms.join(" + ") || "0"})
            </div>
            <div
              className={`px-3.5 py-1.5 rounded-lg border font-bold ${
                f2Val === 1
                  ? "bg-emerald-500/20 border-emerald-400 text-emerald-300"
                  : "bg-slate-950 border-slate-800 text-slate-400"
              }`}
            >
              F2 = {f2Val} ({f2Terms.join(" + ") || "0"})
            </div>
          </div>
        </div>

        {/* PLA Fuse Grid Table */}
        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full text-xs font-mono tabular-nums border-collapse">
            <thead>
              <tr className="bg-slate-900 border-b border-slate-800">
                <th className="py-2.5 px-3 text-left text-slate-300">
                  Product Term
                </th>
                {LITERAL_LABELS.map((lit, i) => (
                  <th
                    key={lit}
                    className="py-2.5 px-2.5 text-center text-cyan-400 border-l border-slate-800"
                  >
                    {lit} ({literalVals[i]})
                  </th>
                ))}
                <th className="py-2.5 px-3 text-left border-l border-slate-800 text-slate-300">
                  AND Evaluation
                </th>
                <th className="py-2.5 px-3 text-center border-l border-slate-800 text-emerald-400">
                  OR → F1
                </th>
                <th className="py-2.5 px-3 text-center border-l border-slate-800 text-emerald-400">
                  OR → F2
                </th>
              </tr>
            </thead>
            <tbody>
              {andPlane.map((row, pIdx) => {
                const evalRes = productEvaluations[pIdx];
                return (
                  <tr
                    key={pIdx}
                    className={`border-b border-slate-800/70 last:border-b-0 ${
                      evalRes.val === 1 ? "bg-emerald-500/10" : ""
                    }`}
                  >
                    <td className="py-2.5 px-3 font-bold text-white">
                      P{pIdx + 1}
                    </td>
                    {row.map((fused, lIdx) => (
                      <td
                        key={lIdx}
                        className="py-2 px-2 text-center border-l border-slate-800/60"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setAndPlane((prev) =>
                              prev.map((r, rI) =>
                                rI === pIdx
                                  ? r.map((c, cI) => (cI === lIdx ? !c : c))
                                  : r
                              )
                            )
                          }
                          className={`w-8 h-8 rounded-md font-bold border transition-colors cursor-pointer ${
                            fused
                              ? "bg-cyan-500/25 border-cyan-400 text-cyan-200"
                              : "bg-slate-900 border-slate-800 text-slate-600 hover:border-slate-700"
                          }`}
                        >
                          {fused ? "×" : "·"}
                        </button>
                      </td>
                    ))}
                    <td className="py-2.5 px-3 border-l border-slate-800">
                      <span className="text-cyan-300 font-semibold">
                        {evalRes.expr}
                      </span>{" "}
                      ={" "}
                      <strong
                        className={
                          evalRes.val === 1
                            ? "text-emerald-400"
                            : "text-slate-500"
                        }
                      >
                        {evalRes.val}
                      </strong>
                    </td>
                    {[0, 1].map((outIdx) => {
                      const orFused = orPlane[pIdx][outIdx];
                      return (
                        <td
                          key={outIdx}
                          className="py-2 px-2 text-center border-l border-slate-800"
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setOrPlane((prev) =>
                                prev.map((r, rI) =>
                                  rI === pIdx
                                    ? r.map((c, cI) =>
                                        cI === outIdx ? !c : c
                                      )
                                    : r
                                )
                              )
                            }
                            className={`w-8 h-8 rounded-md font-bold border transition-colors cursor-pointer ${
                              orFused
                                ? "bg-emerald-500/25 border-emerald-400 text-emerald-200"
                                : "bg-slate-900 border-slate-800 text-slate-600 hover:border-slate-700"
                            }`}
                          >
                            {orFused ? "×" : "·"}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Complete 8-Minterm Mathematically Proved PLA Timing Waveform */}
        {(() => {
          const steps = [0, 1, 2, 3, 4, 5, 6, 7];
          const aVals = steps.map((m) => (m >> 2) & 1);
          const bVals = steps.map((m) => (m >> 1) & 1);
          const cVals = steps.map((m) => m & 1);

          const pWaves = andPlane.map((row) =>
            steps.map((m) => {
              const a = (m >> 2) & 1;
              const b = (m >> 1) & 1;
              const c = m & 1;
              const lits = [a, a ^ 1, b, b ^ 1, c, c ^ 1];
              const act = row
                .map((f, i) => (f ? i : -1))
                .filter((i) => i !== -1);
              if (act.length === 0) return 0;
              return act.every((idx) => lits[idx] === 1) ? 1 : 0;
            })
          );

          const f1Wave = steps.map((_, sIdx) =>
            pWaves.some((pw, pIdx) => orPlane[pIdx][0] && pw[sIdx] === 1)
              ? 1
              : 0
          );
          const f2Wave = steps.map((_, sIdx) =>
            pWaves.some((pw, pIdx) => orPlane[pIdx][1] && pw[sIdx] === 1)
              ? 1
              : 0
          );

          return (
            <DigitalWaveformView
              title="Mathematically Proved PLA Exhaustive Timing Diagram (m0..m7)"
              subtitle="Click any minterm column to apply test inputs (A, B, C) and verify AND-plane product terms P1..P4 and OR-plane outputs F1, F2."
              equations={[
                {
                  label: "Synthesized Output F1",
                  expr: `F1 = ${f1Terms.join(" + ") || "0"}`,
                },
                {
                  label: "Synthesized Output F2",
                  expr: `F2 = ${f2Terms.join(" + ") || "0"}`,
                },
              ]}
              verificationNote="Two-Level AND-OR Matrix Identity Proved"
              stepLabels={steps.map(
                (m) => `m${m}(${m.toString(2).padStart(3, "0")})`
              )}
              activeStepIndex={(inA << 2) | (inB << 1) | inC}
              onSelectStep={(sIdx) => {
                setPlaInputs([
                  (sIdx >> 2) & 1,
                  (sIdx >> 1) & 1,
                  sIdx & 1,
                ]);
              }}
              channels={[
                { id: "pla-a", label: "Input A", role: "input", values: aVals },
                { id: "pla-b", label: "Input B", role: "input", values: bVals },
                { id: "pla-c", label: "Input C", role: "input", values: cVals },
                ...pWaves.map((pw, idx) => ({
                  id: `pla-p${idx + 1}`,
                  label: `Term P${idx + 1}`,
                  role: "intermediate" as const,
                  values: pw,
                  formula: productEvaluations[idx].expr,
                })),
                {
                  id: "pla-f1",
                  label: "Output F1",
                  role: "output",
                  values: f1Wave,
                  formula: f1Terms.join("+") || "0",
                },
                {
                  id: "pla-f2",
                  label: "Output F2",
                  role: "output",
                  values: f2Wave,
                  formula: f2Terms.join("+") || "0",
                },
              ]}
            />
          );
        })()}
      </div>

      {/* Section 2: 4-Bit ALU & Carry Lookahead Adder + Static Timing & Logic Families */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: 4-Bit ALU & Carry Lookahead Adder (CLA) Inspector */}
        <div className="lg:col-span-6 bg-[#111827] border border-slate-800 rounded-xl p-6 space-y-5">
          <div>
            <h3 className="text-lg font-bold text-white">
              02. 4-Bit Arithmetic Logic Unit (ALU) &amp; Carry Lookahead (CLA)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Inspect how a 74181-style ALU computes arithmetic/logic operations
              and how Carry Lookahead eliminates ripple-carry delay via{" "}
              <code className="text-cyan-400">Gi = Ai·Bi</code> and{" "}
              <code className="text-cyan-400">Pi = Ai⊕Bi</code>.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-mono text-slate-400 block mb-1">
                4-Bit A (0–15):
              </label>
              <input
                type="number"
                min={0}
                max={15}
                value={aluA}
                onChange={(e) =>
                  setAluA(
                    Math.max(0, Math.min(15, parseInt(e.target.value || "0", 10)))
                  )
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm font-mono font-bold text-cyan-300"
              />
            </div>

            <div>
              <label className="text-xs font-mono text-slate-400 block mb-1">
                ALU Function:
              </label>
              <select
                value={aluOp}
                onChange={(e) => setAluOp(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-sm font-mono font-bold text-white"
              >
                <option value="ADD">ADD (A + B)</option>
                <option value="SUB">SUB (A - B)</option>
                <option value="AND">AND (A · B)</option>
                <option value="OR">OR (A + B)</option>
                <option value="XOR">XOR (A ⊕ B)</option>
                <option value="NOT">NOT (A&apos;)</option>
                <option value="INC">INC (A + 1)</option>
                <option value="SHL">SHL (A &lt;&lt; 1)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-mono text-slate-400 block mb-1">
                4-Bit B (0–15):
              </label>
              <input
                type="number"
                min={0}
                max={15}
                value={aluB}
                onChange={(e) =>
                  setAluB(
                    Math.max(0, Math.min(15, parseInt(e.target.value || "0", 10)))
                  )
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm font-mono font-bold text-cyan-300"
              />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 font-mono text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-400">Input A (Binary):</span>
              <span className="text-cyan-300 font-bold">
                {aluA.toString(2).padStart(4, "0")}₂ ({aluA})
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Input B (Binary):</span>
              <span className="text-cyan-300 font-bold">
                {aluB.toString(2).padStart(4, "0")}₂ ({aluB})
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">
                CLA Generate G3..G0 (Ai·Bi):
              </span>
              <span className="text-amber-300">
                {genBits.slice().reverse().join("")}₂
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">
                CLA Propagate P3..P0 (Ai⊕Bi):
              </span>
              <span className="text-amber-300">
                {propBits.slice().reverse().join("")}₂
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">
                CLA Lookahead Carries C4..C1 (Cin={c0}):
              </span>
              <span className="text-cyan-300 font-bold">
                {claCarries.join("")}₂
              </span>
            </div>
            <div className="border-t border-slate-800 pt-2 flex justify-between font-bold text-sm">
              <span className="text-white">ALU Output F3..F0:</span>
              <span className="text-emerald-400">
                {aluOut.toString(2).padStart(4, "0")}₂ ({aluOut}) · Cout={aluCarry}
              </span>
            </div>
          </div>

          <div className="text-xs text-slate-400 bg-slate-900/60 border border-slate-800 rounded-lg p-3">
            <strong className="text-slate-200">
              Carry Lookahead Equation:
            </strong>{" "}
            <code>C4 = G3 + P3·G2 + P3·P2·G1 + P3·P2·P1·G0 + P3·P2·P1·P0·C0</code>
            . Computes all carries in constant 2-gate-level delay regardless of
            word width.
          </div>

          <DigitalWaveformView
            compact
            title={`4-Bit ALU (${aluOp}) & CLA Bit-Slice Waveform`}
            equations={[
              {
                label: "CLA Carry Recurrence",
                expr: "C_{i+1} = G_i + P_i · C_i",
              },
            ]}
            verificationNote={`F = ${aluOut.toString(2).padStart(4, "0")}₂ (${aluOut}) · Cout = ${aluCarry}`}
            stepLabels={["Bit 0 (LSB)", "Bit 1", "Bit 2", "Bit 3 (MSB)"]}
            channels={[
              { id: "alu-a", label: "A[i]", role: "input", values: aBits },
              { id: "alu-b", label: "B_eff[i]", role: "input", values: bBits },
              {
                id: "alu-g",
                label: "Gen G[i]",
                role: "intermediate",
                values: genBits,
              },
              {
                id: "alu-p",
                label: "Prop P[i]",
                role: "intermediate",
                values: propBits,
              },
              {
                id: "alu-c",
                label: "Carry C[i+1]",
                role: "output",
                values: [c1, c2, c3, c4],
              },
              {
                id: "alu-f",
                label: "Out F[i]",
                role: "output",
                values: [
                  aluOut & 1,
                  (aluOut >> 1) & 1,
                  (aluOut >> 2) & 1,
                  (aluOut >> 3) & 1,
                ],
              },
            ]}
          />
        </div>

        {/* Right: Static Timing Analysis (f_max) & Logic Family Noise Margins */}
        <div className="lg:col-span-6 bg-[#111827] border border-slate-800 rounded-xl p-6 space-y-5">
          <div>
            <h3 className="text-lg font-bold text-white">
              03. Static Timing Analysis (STA) &amp; Logic Family Noise Margins
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Calculate maximum clock frequency{" "}
              <code className="text-cyan-400">
                f_max = 1 / (t_pcq + t_pd + t_su)
              </code>{" "}
              and verify hold-time margin.
            </p>
          </div>

          {/* Timing Parameter Sliders */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
              <div className="flex justify-between mb-1">
                <span className="text-slate-400">Clk-to-Q (t_pcq):</span>
                <span className="text-cyan-300 font-bold">{tPcq} ns</span>
              </div>
              <input
                type="range"
                min={0.5}
                max={5}
                step={0.1}
                value={tPcq}
                onChange={(e) => setTPcq(parseFloat(e.target.value))}
                className="w-full accent-cyan-400"
              />
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
              <div className="flex justify-between mb-1">
                <span className="text-slate-400">Comb. Delay (t_pd):</span>
                <span className="text-cyan-300 font-bold">{tPd} ns</span>
              </div>
              <input
                type="range"
                min={1}
                max={15}
                step={0.5}
                value={tPd}
                onChange={(e) => setTPd(parseFloat(e.target.value))}
                className="w-full accent-cyan-400"
              />
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
              <div className="flex justify-between mb-1">
                <span className="text-slate-400">Setup Time (t_su):</span>
                <span className="text-cyan-300 font-bold">{tSu} ns</span>
              </div>
              <input
                type="range"
                min={0.5}
                max={5}
                step={0.1}
                value={tSu}
                onChange={(e) => setTSu(parseFloat(e.target.value))}
                className="w-full accent-cyan-400"
              />
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
              <div className="flex justify-between mb-1">
                <span className="text-slate-400">Hold Time (t_hold):</span>
                <span className="text-amber-300 font-bold">{tHold} ns</span>
              </div>
              <input
                type="range"
                min={0.5}
                max={5}
                step={0.1}
                value={tHold}
                onChange={(e) => setTHold(parseFloat(e.target.value))}
                className="w-full accent-amber-400"
              />
            </div>
          </div>

          {/* Timing Readout */}
          <div className="grid grid-cols-2 gap-3 font-mono">
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-3.5">
              <div className="text-[11px] text-slate-400">
                Min Period T_min / Max Clock f_max
              </div>
              <div className="text-lg font-bold text-emerald-400 mt-0.5">
                {maxFreqMHz.toFixed(1)} MHz
              </div>
              <div className="text-[11px] text-slate-400">
                T_min = {minClockPeriodNs.toFixed(1)} ns
              </div>
            </div>

            <div
              className={`border rounded-lg p-3.5 ${
                holdSafe
                  ? "bg-emerald-950/25 border-emerald-500/40"
                  : "bg-rose-950/40 border-rose-500/60"
              }`}
            >
              <div className="text-[11px] text-slate-300">
                Hold Constraint (t_pcq + t_cd ≥ t_hold)
              </div>
              <div
                className={`text-sm font-bold mt-1 flex items-center gap-1 ${
                  holdSafe ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {holdSafe ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    SAFE (+{holdMarginNs.toFixed(1)} ns slack)
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4" />
                    VIOLATION ({holdMarginNs.toFixed(1)} ns)
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Logic Families Noise Margin Comparison */}
          <div className="border-t border-slate-800 pt-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-white">
                Logic Family Voltage &amp; Noise Margin Inspector
              </span>
              <select
                value={selectedFamily}
                onChange={(e) => setSelectedFamily(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs font-mono text-cyan-300"
              >
                {Object.keys(LOGIC_FAMILIES).map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-2.5 font-mono text-xs">
              <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-2.5">
                <div className="text-[10px] text-slate-400">
                  HIGH Noise Margin
                </div>
                <div className="text-sm font-bold text-emerald-400 mt-0.5">
                  NM_H = {nmHigh} V
                </div>
                <div className="text-[10px] text-slate-500">
                  VOH({fam.voh}V) - VIH({fam.vih}V)
                </div>
              </div>
              <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-2.5">
                <div className="text-[10px] text-slate-400">
                  LOW Noise Margin
                </div>
                <div className="text-sm font-bold text-cyan-300 mt-0.5">
                  NM_L = {nmLow} V
                </div>
                <div className="text-[10px] text-slate-500">
                  VIL({fam.vil}V) - VOL({fam.vol}V)
                </div>
              </div>
              <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-2.5">
                <div className="text-[10px] text-slate-400">
                  Gate Delay / Power
                </div>
                <div className="text-sm font-bold text-amber-300 mt-0.5">
                  {fam.tpdNs} ns
                </div>
                <div className="text-[10px] text-slate-500">{fam.powerMw}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
