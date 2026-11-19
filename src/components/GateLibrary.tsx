import React, { useState } from "react";
import { Sparkles, Layers, Cpu, ShieldCheck } from "lucide-react";
import { GATE_SPECS, LEARN_GATES, computeGate } from "../data/logicSpecs";
import { GateSymbolIcon } from "./CircuitLab";
import DigitalWaveformView, { WaveformChannel } from "./DigitalWaveformView";
import StandardComponentLibrary from "./StandardComponentLibrary";

function GateCard({
  gate,
}: {
  gate: (typeof LEARN_GATES)[number];
}) {
  const nInputs = GATE_SPECS[gate.type].inputs;
  const [inputs, setInputs] = useState<number[]>(new Array(nInputs).fill(0));

  const outVal = computeGate(gate.type, inputs);
  const activeRowIdx = inputs.reduce((acc, v) => acc * 2 + v, 0);

  const rows: { ins: number[]; out: number }[] = [];
  for (let i = 0; i < 1 << nInputs; i++) {
    const ins: number[] = [];
    for (let k = 0; k < nInputs; k++) {
      ins.push((i >> (nInputs - 1 - k)) & 1);
    }
    rows.push({ ins, out: computeGate(gate.type, ins) });
  }

  return (
    <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 flex flex-col justify-between gap-4 hover:border-cyan-500/40 transition-colors">
      <div className="space-y-3">
        <div className="flex items-center gap-3.5">
          <div className="w-20 h-14 rounded-lg bg-slate-900 border border-slate-800 p-2 shrink-0 flex items-center justify-center">
            <GateSymbolIcon type={gate.type} />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">{gate.name}</h3>
            <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono text-slate-400 mt-0.5">
              <span className="text-cyan-400 font-semibold">{gate.expr}</span>
              <span aria-hidden="true">·</span>
              <span>IC {gate.ic}</span>
              <span aria-hidden="true">·</span>
              <span>{gate.minterms}</span>
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">{gate.desc}</p>
      </div>

      <div className="space-y-3">
        {/* Interactive Input/Output Test Bench */}
        <div className="flex items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 rounded-lg px-3.5 py-2.5">
          <div className="flex items-center gap-2">
            {inputs.map((bit, idx) => {
              const label = String.fromCharCode(65 + idx);
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() =>
                    setInputs((prev) =>
                      prev.map((v, i) => (i === idx ? v ^ 1 : v))
                    )
                  }
                  className={`px-3 py-1.5 rounded-lg font-mono text-xs font-bold border transition-colors cursor-pointer ${
                    bit === 1
                      ? "bg-emerald-500/20 border-emerald-500 text-emerald-300"
                      : "bg-slate-800 border-slate-700 text-slate-400 hover:text-white"
                  }`}
                >
                  {label}={bit}
                </button>
              );
            })}
          </div>

          <span className="text-slate-500 font-mono text-xs">⟶</span>

          <div
            className={`px-3 py-1.5 rounded-lg font-mono text-xs font-bold border ${
              outVal === 1
                ? "bg-emerald-500/20 border-emerald-400 text-emerald-300"
                : "bg-slate-950 border-slate-800 text-slate-400"
            }`}
          >
            Y = {outVal} ({outVal === 1 ? "HIGH" : "LOW"})
          </div>
        </div>

        {/* Truth Table */}
        <div className="overflow-hidden rounded-lg border border-slate-800">
          <table className="w-full text-xs font-mono tabular-nums border-collapse">
            <thead>
              <tr className="bg-slate-900 text-cyan-400 border-b border-slate-800">
                {Array.from({ length: nInputs }).map((_, idx) => (
                  <th key={idx} className="py-1.5 px-2 text-center">
                    {String.fromCharCode(65 + idx)}
                  </th>
                ))}
                <th className="py-1.5 px-2 text-center border-l border-slate-800">
                  Y
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, rIdx) => (
                <tr
                  key={rIdx}
                  className={`border-b border-slate-800/60 last:border-b-0 ${
                    rIdx === activeRowIdx
                      ? "bg-cyan-500/15 text-white font-bold"
                      : "text-slate-400"
                  }`}
                >
                  {r.ins.map((v, cIdx) => (
                    <td
                      key={cIdx}
                      className={`py-1 px-2 text-center ${
                        v === 1 ? "text-cyan-300" : ""
                      }`}
                    >
                      {v}
                    </td>
                  ))}
                  <td
                    className={`py-1 px-2 text-center border-l border-slate-800/60 ${
                      r.out === 1
                        ? "text-emerald-400 font-bold"
                        : "text-slate-500"
                    }`}
                  >
                    {r.out}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mathematically Proved Gate Timing Waveform */}
        <DigitalWaveformView
          compact
          title={`${gate.type} Waveform (${gate.expr})`}
          equations={[
            {
              label: gate.ic,
              expr: gate.expr,
              substitution: (sIdx) => {
                const r = rows[sIdx] || rows[0];
                const inStr = r.ins
                  .map((v, i) => `${String.fromCharCode(65 + i)}=${v}`)
                  .join(", ");
                return `${inStr} ⇒ Y = ${r.out}`;
              },
            },
          ]}
          verificationNote={gate.minterms}
          stepLabels={rows.map((_, i) => `m${i}`)}
          activeStepIndex={activeRowIdx}
          onSelectStep={(sIdx) => {
            if (rows[sIdx]) setInputs([...rows[sIdx].ins]);
          }}
          channels={[
            ...Array.from({ length: nInputs }, (_, i): WaveformChannel => ({
              id: `${gate.type}-in-${i}`,
              label: String.fromCharCode(65 + i),
              role: "input",
              values: rows.map((r) => r.ins[i]),
            })),
            {
              id: `${gate.type}-out`,
              label: "Y",
              role: "output",
              values: rows.map((r) => r.out),
              formula: gate.expr,
            },
          ]}
        />
      </div>
    </div>
  );
}

const UNIVERSAL_CONVERSIONS = [
  {
    target: "NOT (Inverter)",
    expr: "Y = A'",
    nandCount: 1,
    nandFormula: "Y = (A · A)'",
    nandSteps: "Tie both inputs of a 2-input NAND gate together to input A.",
    norCount: 1,
    norFormula: "Y = (A + A)'",
    norSteps: "Tie both inputs of a 2-input NOR gate together to input A.",
  },
  {
    target: "AND Gate",
    expr: "Y = A · B",
    nandCount: 2,
    nandFormula: "Y = ((A · B)')'",
    nandSteps: "Feed A and B into a NAND gate, then invert its output with a second NAND gate.",
    norCount: 3,
    norFormula: "Y = ((A + A)' + (B + B)')'",
    norSteps: "Invert A and B using two NOR inverters, then NOR their outputs (De Morgan's Law).",
  },
  {
    target: "OR Gate",
    expr: "Y = A + B",
    nandCount: 3,
    nandFormula: "Y = ((A · A)' · (B · B)')'",
    nandSteps: "Invert A and B with two NAND inverters, then feed into a third NAND gate.",
    norCount: 2,
    norFormula: "Y = ((A + B)')'",
    norSteps: "Feed A and B into a NOR gate, then invert its output with a second NOR gate.",
  },
  {
    target: "XOR Gate",
    expr: "Y = A ⊕ B",
    nandCount: 4,
    nandFormula: "Y = ( (A · (A·B)')' · (B · (A·B)')' )'",
    nandSteps: "Compute N1 = (A·B)', then N2 = (A·N1)' and N3 = (B·N1)', and finally Y = (N2·N3)'.",
    norCount: 5,
    norFormula: "Y = ( (A+B)' + ((A+(A+B)')' + (B+(A+B)')')' )'",
    norSteps: "Construct XNOR with 4 NOR gates and invert the output with a 5th NOR gate.",
  },
  {
    target: "XNOR Gate",
    expr: "Y = (A ⊕ B)'",
    nandCount: 5,
    nandFormula: "Y = (( (A · (A·B)')' · (B · (A·B)')' )')'",
    nandSteps: "Build the 4-NAND XOR network and invert the output with a 5th NAND gate.",
    norCount: 4,
    norFormula: "Y = ( (A + (A+B)')' + (B + (A+B)')' )'",
    norSteps: "Compute N1 = (A+B)', then N2 = (A+N1)' and N3 = (B+N1)', and finally Y = (N2+N3)'.",
  },
];

interface GateLibraryProps {
  onSelectComponentToPlace?: (compId: string, standard: "IEEE_315" | "IEC_60617") => void;
  onNavigateToBreadboard?: (compId: string) => void;
}

export default function GateLibrary({
  onSelectComponentToPlace,
  onNavigateToBreadboard,
}: GateLibraryProps) {
  const [libraryMode, setLibraryMode] = useState<"STANDARD_EXPANDED" | "GATE_WORKBENCH">("STANDARD_EXPANDED");
  const [cmosGate, setCmosGate] = useState<"NOT" | "NAND" | "NOR">("NAND");
  const [cmosA, setCmosA] = useState<number>(1);
  const [cmosB, setCmosB] = useState<number>(0);

  const cmosOut =
    cmosGate === "NOT"
      ? cmosA ^ 1
      : cmosGate === "NAND"
      ? (cmosA & cmosB) ^ 1
      : (cmosA | cmosB) ^ 1;

  return (
    <div className="space-y-8">
      {/* Top Switcher: Standard Library vs Gate Timing Studio */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Standard Electronics Component &amp; Logic Gate System</span>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-cyan-950 border border-cyan-500/40 text-cyan-300 font-bold">
                IEEE 315 · IEC 60617
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Select between the certified engineering standard visual library and the timing/synthesis workbench.
            </p>
          </div>
        </div>

        <div className="flex items-center bg-slate-900 border border-slate-700/80 rounded-xl p-1 text-xs font-mono">
          <button
            type="button"
            onClick={() => setLibraryMode("STANDARD_EXPANDED")}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              libraryMode === "STANDARD_EXPANDED"
                ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20 font-black"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>IEEE 315 / IEC Visual Library</span>
          </button>
          <button
            type="button"
            onClick={() => setLibraryMode("GATE_WORKBENCH")}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              libraryMode === "GATE_WORKBENCH"
                ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20 font-black"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Logic Timing &amp; Universal Synthesis</span>
          </button>
        </div>
      </div>

      {libraryMode === "STANDARD_EXPANDED" ? (
        <StandardComponentLibrary
          onSelectComponentToPlace={onSelectComponentToPlace}
          onNavigateToBreadboard={onNavigateToBreadboard}
        />
      ) : (
        <div className="space-y-10">
          {/* Primitive Gates Grid */}
          <div>
        <div className="mb-5">
          <h2 className="text-2xl font-bold text-white">
            01. Primitive Logic Gates &amp; 74xx IC Reference
          </h2>
          <p className="text-sm text-slate-400 mt-1 max-w-3xl">
            Click input bits A and B on any gate card to inspect its live Boolean
            evaluation, canonical minterm index, and corresponding truth-table
            row.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {LEARN_GATES.map((g) => (
            <GateCard key={g.type} gate={g} />
          ))}
        </div>
      </div>

      {/* Universal Gates (NAND / NOR Synthesis Table) + CMOS Transistor Network */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 bg-[#111827] border border-slate-800 rounded-xl p-6">
          <h3 className="text-lg font-bold text-white">
            02. Universal Gate Realization (NAND &amp; NOR Completeness)
          </h3>
          <p className="text-xs text-slate-400 mt-1 mb-4">
            Because NAND and NOR are functionally complete, any Boolean function
            can be fabricated using strictly one gate type.
          </p>

          <div className="overflow-x-auto rounded-lg border border-slate-800">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-slate-300 border-b border-slate-800 font-mono">
                  <th className="py-2.5 px-3 text-left">Target Gate</th>
                  <th className="py-2.5 px-3 text-center">NAND Count</th>
                  <th className="py-2.5 px-3 text-left">NAND Algebraic Form</th>
                  <th className="py-2.5 px-3 text-center">NOR Count</th>
                  <th className="py-2.5 px-3 text-left">NOR Algebraic Form</th>
                </tr>
              </thead>
              <tbody>
                {UNIVERSAL_CONVERSIONS.map((u) => (
                  <tr
                    key={u.target}
                    className="border-b border-slate-800/70 last:border-b-0 hover:bg-slate-900/40"
                  >
                    <td className="py-2.5 px-3 font-semibold text-white">
                      <div>{u.target}</div>
                      <div className="font-mono text-[11px] text-slate-400">
                        {u.expr}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-cyan-400">
                      {u.nandCount}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-mono text-cyan-300">
                        {u.nandFormula}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {u.nandSteps}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-amber-400">
                      {u.norCount}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-mono text-amber-300">
                        {u.norFormula}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {u.norSteps}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Interactive CMOS Transistor-Level Switch Simulator */}
        <div className="lg:col-span-5 bg-[#111827] border border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-lg font-bold text-white">
                03. CMOS Transistor Switch Explorer
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                PMOS conducts when input = 0 (Pull-Up to VDD). NMOS conducts when
                input = 1 (Pull-Down to GND).
              </p>
            </div>
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
              {(["NOT", "NAND", "NOR"] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setCmosGate(g)}
                  className={`px-2.5 py-1 rounded text-xs font-mono font-semibold transition-colors cursor-pointer ${
                    cmosGate === g
                      ? "bg-cyan-500/20 text-cyan-300"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* Input Toggles */}
          <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCmosA((v) => v ^ 1)}
                className={`px-3 py-1.5 rounded-lg font-mono text-xs font-bold border cursor-pointer ${
                  cmosA === 1
                    ? "bg-emerald-500/20 border-emerald-500 text-emerald-300"
                    : "bg-slate-800 border-slate-700 text-slate-300"
                }`}
              >
                Input A = {cmosA}
              </button>
              {cmosGate !== "NOT" && (
                <button
                  type="button"
                  onClick={() => setCmosB((v) => v ^ 1)}
                  className={`px-3 py-1.5 rounded-lg font-mono text-xs font-bold border cursor-pointer ${
                    cmosB === 1
                      ? "bg-emerald-500/20 border-emerald-500 text-emerald-300"
                      : "bg-slate-800 border-slate-700 text-slate-300"
                  }`}
                >
                  Input B = {cmosB}
                </button>
              )}
            </div>

            <div
              className={`px-3 py-1.5 rounded-lg font-mono text-xs font-bold border ${
                cmosOut === 1
                  ? "bg-emerald-500/20 border-emerald-400 text-emerald-300"
                  : "bg-slate-950 border-slate-800 text-slate-400"
              }`}
            >
              Vout = {cmosOut} ({cmosOut === 1 ? "VDD" : "GND"})
            </div>
          </div>

          {/* Transistor Conductance Breakdown */}
          <div className="grid grid-cols-2 gap-3 text-xs font-mono">
            <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3 space-y-2">
              <div className="text-cyan-400 font-semibold">
                Pull-Up Network (PUN · PMOS)
              </div>
              <div className="text-[11px] text-slate-400">
                Topology:{" "}
                {cmosGate === "NOT"
                  ? "Single PMOS"
                  : cmosGate === "NAND"
                  ? "PMOS in Parallel"
                  : "PMOS in Series"}
              </div>
              <div className="space-y-1 pt-1">
                <div className="flex justify-between">
                  <span>PMOS_A (Gate={cmosA}):</span>
                  <span
                    className={
                      cmosA === 0 ? "text-emerald-400 font-bold" : "text-slate-500"
                    }
                  >
                    {cmosA === 0 ? "ON (Closed)" : "OFF (Open)"}
                  </span>
                </div>
                {cmosGate !== "NOT" && (
                  <div className="flex justify-between">
                    <span>PMOS_B (Gate={cmosB}):</span>
                    <span
                      className={
                        cmosB === 0
                          ? "text-emerald-400 font-bold"
                          : "text-slate-500"
                      }
                    >
                      {cmosB === 0 ? "ON (Closed)" : "OFF (Open)"}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3 space-y-2">
              <div className="text-amber-400 font-semibold">
                Pull-Down Network (PDN · NMOS)
              </div>
              <div className="text-[11px] text-slate-400">
                Topology:{" "}
                {cmosGate === "NOT"
                  ? "Single NMOS"
                  : cmosGate === "NAND"
                  ? "NMOS in Series"
                  : "NMOS in Parallel"}
              </div>
              <div className="space-y-1 pt-1">
                <div className="flex justify-between">
                  <span>NMOS_A (Gate={cmosA}):</span>
                  <span
                    className={
                      cmosA === 1 ? "text-emerald-400 font-bold" : "text-slate-500"
                    }
                  >
                    {cmosA === 1 ? "ON (Closed)" : "OFF (Open)"}
                  </span>
                </div>
                {cmosGate !== "NOT" && (
                  <div className="flex justify-between">
                    <span>NMOS_B (Gate={cmosB}):</span>
                    <span
                      className={
                        cmosB === 1
                          ? "text-emerald-400 font-bold"
                          : "text-slate-500"
                      }
                    >
                      {cmosB === 1 ? "ON (Closed)" : "OFF (Open)"}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="text-xs text-slate-400 bg-slate-900/60 border border-slate-800/80 rounded-lg p-3">
            <strong className="text-slate-200">Why NAND &amp; NOR are native in CMOS:</strong>{" "}
            A standard CMOS stage naturally inverts because PMOS sources VDD when
            gate is LOW and NMOS sinks to GND when gate is HIGH. Thus a 2-input
            NAND takes only 4 transistors, whereas an AND gate requires 6 (NAND +
            Inverter).
          </div>

          {/* CMOS Switching Waveform */}
          <DigitalWaveformView
            compact
            title={`CMOS ${cmosGate} Switching Waveform`}
            equations={[
              {
                label: `CMOS ${cmosGate}`,
                expr:
                  cmosGate === "NOT"
                    ? "Vout = A'"
                    : cmosGate === "NAND"
                    ? "Vout = (A · B)'"
                    : "Vout = (A + B)'",
              },
            ]}
            verificationNote="Complementary Pull-Up / Pull-Down Verified"
            stepLabels={cmosGate === "NOT" ? ["m0", "m1"] : ["m0", "m1", "m2", "m3"]}
            activeStepIndex={
              cmosGate === "NOT" ? cmosA : (cmosA << 1) | cmosB
            }
            onSelectStep={(sIdx) => {
              if (cmosGate === "NOT") {
                setCmosA(sIdx & 1);
              } else {
                setCmosA((sIdx >> 1) & 1);
                setCmosB(sIdx & 1);
              }
            }}
            channels={
              cmosGate === "NOT"
                ? [
                    { id: "cmos-a", label: "A", role: "input", values: [0, 1] },
                    { id: "cmos-vout", label: "Vout", role: "output", values: [1, 0] },
                  ]
                : [
                    {
                      id: "cmos-a",
                      label: "A",
                      role: "input",
                      values: [0, 0, 1, 1],
                    },
                    {
                      id: "cmos-b",
                      label: "B",
                      role: "input",
                      values: [0, 1, 0, 1],
                    },
                    {
                      id: "cmos-vout",
                      label: "Vout",
                      role: "output",
                      values:
                        cmosGate === "NAND" ? [1, 1, 1, 0] : [1, 0, 0, 0],
                    },
                  ]
            }
          />
        </div>
      </div>
    </div>
      )}
    </div>
  );
}
