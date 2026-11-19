import React, { useState, useMemo, useEffect } from "react";
import {
  Cpu,
  X,
  CheckCircle2,
  AlertCircle,
  Wand2,
  BookOpen,
  Table,
  Layers,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import {
  analyzeBooleanExpression,
  synthesizeBooleanFunctionToCircuit,
  BOOLEAN_PRESET_FUNCTIONS,
  BOOLEAN_ALGEBRA_LAWS_REFERENCE,
  SynthesisArchitecture,
} from "../utils/booleanAlgebraEngine";
import { PresetNodeDef, PresetWireDef } from "../data/logicSpecs";

interface BooleanFunctionGeneratorPanelProps {
  onSynthesizeCircuit: (circuit: {
    title: string;
    nodes: PresetNodeDef[];
    wires: PresetWireDef[];
  }) => void;
  onSyncToKMap?: (numVars: 2 | 3 | 4, minterms: number[]) => void;
  isModal?: boolean;
  onClose?: () => void;
}

export const BooleanFunctionGeneratorPanel: React.FC<
  BooleanFunctionGeneratorPanelProps
> = ({ onSynthesizeCircuit, onSyncToKMap, isModal = false, onClose }) => {
  const [expressionInput, setExpressionInput] = useState<string>(
    "A'*B*C' + A'*B*C + A*B'*C' + A*B'*C + A*B*C"
  );
  const [outputVarName, setOutputVarName] = useState<string>("F");
  const [selectedArch, setSelectedArch] =
    useState<SynthesisArchitecture>("SOP_AND_OR");
  const [activeSubView, setActiveSubView] = useState<
    "QUINE_MCCLUSKEY" | "DERIVATION" | "TRUTH_TABLE" | "LAWS_REFERENCE"
  >("QUINE_MCCLUSKEY");
  const [mintermQuickInput, setMintermQuickInput] = useState<string>("1, 3, 5, 7");
  const [mintermVarCount, setMintermVarCount] = useState<2 | 3 | 4>(3);
  const [simplifiedHighlight, setSimplifiedHighlight] = useState<{
    originalExpr: string;
    minimalSOP: string;
    timestamp: number;
  } | null>(null);
  const [copiedSOP, setCopiedSOP] = useState(false);

  useEffect(() => {
    setSimplifiedHighlight(null);
  }, [expressionInput]);

  const analysis = useMemo(
    () => analyzeBooleanExpression(expressionInput),
    [expressionInput]
  );

  const insertToken = (tok: string) => {
    setExpressionInput((prev) => `${prev}${tok}`);
  };

  const handleSimplifyExpressionQM = () => {
    if (!analysis.valid) return;
    setSimplifiedHighlight({
      originalExpr: expressionInput.trim(),
      minimalSOP: analysis.minimizedSOP,
      timestamp: Date.now(),
    });
    setActiveSubView("QUINE_MCCLUSKEY");
    if (
      onSyncToKMap &&
      (analysis.numVars === 2 || analysis.numVars === 3 || analysis.numVars === 4)
    ) {
      onSyncToKMap(analysis.numVars as 2 | 3 | 4, analysis.minterms);
    }
  };

  const handleReplaceInputWithMinimalSOP = () => {
    if (!analysis.valid) return;
    setExpressionInput(analysis.minimizedSOP);
  };

  const handleCopyMinimalSOP = () => {
    if (!analysis.valid) return;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(`${outputVarName} = ${analysis.minimizedSOP}`);
      setCopiedSOP(true);
      setTimeout(() => setCopiedSOP(false), 1800);
    }
  };

  const handleApplyMintermList = () => {
    const vars = ["A", "B", "C", "D"].slice(0, mintermVarCount);
    const maxIdx = (1 << mintermVarCount) - 1;
    const nums = Array.from(
      new Set(
        mintermQuickInput
          .split(/[\s,]+/)
          .map((s) => parseInt(s.trim(), 10))
          .filter((n) => !Number.isNaN(n) && n >= 0 && n <= maxIdx)
      )
    ).sort((a, b) => a - b);

    if (nums.length === 0) {
      setExpressionInput("0");
      return;
    }

    const terms = nums.map((m) => {
      const bin = m.toString(2).padStart(mintermVarCount, "0");
      return vars
        .map((v, idx) => (bin[idx] === "1" ? v : `${v}'`))
        .join("*");
    });
    const newExpr = terms.join(" + ");
    setExpressionInput(newExpr);
  };

  const handleGenerateSchematic = () => {
    if (!analysis.valid) return;
    const circuit = synthesizeBooleanFunctionToCircuit(
      analysis,
      selectedArch,
      outputVarName.trim() || "F"
    );
    onSynthesizeCircuit(circuit);
    if (isModal && onClose) {
      onClose();
    }
  };

  return (
    <div className="bg-[#0b1020] border border-cyan-500/35 rounded-2xl overflow-hidden shadow-2xl">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 bg-[#0f172a] border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-400/40 flex items-center justify-center text-cyan-300">
            <Wand2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
              Boolean Function Generator &amp; Quine-McCluskey Algebraic Solver
            </h2>
            <p className="text-xs text-slate-400">
              Simplify any Boolean expression to minimal Sum-of-Products (SOP) via
              Quine-McCluskey tabular reduction and synthesize gate schematics
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={!analysis.valid}
            onClick={handleSimplifyExpressionQM}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-emerald-400 hover:bg-emerald-300 disabled:opacity-40 text-slate-950 transition-colors cursor-pointer shadow-md shadow-emerald-500/10"
            title="Run Quine-McCluskey Tabular Minimization to compute Minimal Sum-of-Products (SOP)"
          >
            <Sparkles className="w-4 h-4" />
            Simplify Expression
          </button>
          <button
            type="button"
            disabled={!analysis.valid}
            onClick={handleGenerateSchematic}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-cyan-400 hover:bg-cyan-300 disabled:opacity-40 text-slate-950 transition-colors cursor-pointer"
          >
            <Cpu className="w-4 h-4" />
            Generate &amp; Load Circuit into Schematic
          </button>
          {isModal && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg bg-rose-950/60 hover:bg-rose-900/80 text-rose-200 border border-rose-500/40 cursor-pointer"
              title="Close Boolean Function Generator"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-5 sm:p-6 space-y-6">
        {/* Top Row: Equation Input + Minterm Generator + Presets */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left 7 Cols: Boolean Expression Editor & Operator Pad */}
          <div className="lg:col-span-7 bg-[#111827] border border-slate-800 rounded-xl p-4 space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                Boolean Algebra Equation Input
              </label>
              <span className="text-[11px] font-mono text-slate-400">
                Supports: A&apos;, !A, A*B, AB, A+B, A^B (XOR), A~^B (XNOR)
              </span>
            </div>

            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
              <input
                type="text"
                value={outputVarName}
                onChange={(e) => setOutputVarName(e.target.value.slice(0, 6))}
                className="w-14 bg-slate-950 border border-slate-700 rounded-lg px-2 py-2.5 text-sm font-mono font-bold text-emerald-400 text-center focus:outline-none focus:border-cyan-400"
                title="Output Signal Name"
              />
              <span className="font-mono text-lg font-bold text-slate-400">=</span>
              <input
                type="text"
                value={expressionInput}
                onChange={(e) => setExpressionInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && analysis.valid) {
                    handleSimplifyExpressionQM();
                  }
                }}
                placeholder="e.g. A'B + AB' + BC  or  (A + B)' * C"
                className="flex-1 min-w-[200px] bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm sm:text-base font-mono font-bold text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400"
              />
              <button
                type="button"
                disabled={!analysis.valid}
                onClick={handleSimplifyExpressionQM}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg text-xs font-bold bg-emerald-400 hover:bg-emerald-300 disabled:opacity-40 text-slate-950 transition-all cursor-pointer whitespace-nowrap shadow-md shadow-emerald-500/10"
                title="Simplify entered expression into Minimal Sum-of-Products (SOP) using the Quine-McCluskey algorithm"
              >
                <Sparkles className="w-4 h-4" />
                Simplify Expression
              </button>
              <button
                type="button"
                onClick={() => {
                  setExpressionInput("");
                  setSimplifiedHighlight(null);
                }}
                className="px-3 py-2.5 rounded-lg text-xs font-mono bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer"
              >
                Clear
              </button>
            </div>

            {/* Quick Symbol & Variable Keypad */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { label: "A", insert: "A" },
                { label: "B", insert: "B" },
                { label: "C", insert: "C" },
                { label: "D", insert: "D" },
                { label: "NOT (')", insert: "'" },
                { label: "AND (·)", insert: " * " },
                { label: "OR (+)", insert: " + " },
                { label: "XOR (⊕)", insert: " ^ " },
                { label: "XNOR (⊙)", insert: " ~^ " },
                { label: "NAND", insert: " NAND " },
                { label: "NOR", insert: " NOR " },
                { label: "(", insert: "(" },
                { label: ")", insert: ")" },
              ].map((btn) => (
                <button
                  key={btn.label}
                  type="button"
                  onClick={() => insertToken(btn.insert)}
                  className="px-2.5 py-1 rounded-md text-xs font-mono font-semibold bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 transition-colors cursor-pointer"
                >
                  {btn.label}
                </button>
              ))}
            </div>

            {/* Quine-McCluskey Minimal SOP Result Card (Always live when valid, highlighted when Simplify Expression is clicked) */}
            {analysis.valid ? (
              <div
                className={`rounded-xl p-3.5 transition-all border ${
                  simplifiedHighlight
                    ? "bg-emerald-950/35 border-emerald-400/70 shadow-lg shadow-emerald-500/10"
                    : "bg-slate-950/90 border-emerald-500/35"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-400 text-slate-950">
                      Quine-McCluskey Minimal SOP
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      {analysis.primeImplicants.length} Prime Implicant
                      {analysis.primeImplicants.length === 1 ? "" : "s"} ·{" "}
                      {analysis.quineMcCluskey.essentialPrimeImplicants.length}{" "}
                      Essential (EPI)
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {analysis.quineMcCluskey.literalReductionPercent > 0 && (
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                        {analysis.quineMcCluskey.inputLiteralCount} →{" "}
                        {analysis.quineMcCluskey.minimalSopLiteralCount} literals (
                        -{analysis.quineMcCluskey.literalReductionPercent}%)
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={handleReplaceInputWithMinimalSOP}
                      className="px-2.5 py-1 rounded text-[11px] font-mono font-semibold bg-slate-900 hover:bg-slate-800 text-emerald-300 border border-emerald-500/40 cursor-pointer transition-colors"
                      title="Replace the input field expression with the simplified Minimal SOP expression"
                    >
                      Use as Input
                    </button>
                    <button
                      type="button"
                      onClick={handleCopyMinimalSOP}
                      className="px-2.5 py-1 rounded text-[11px] font-mono font-semibold bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 cursor-pointer transition-colors"
                    >
                      {copiedSOP ? "Copied!" : "Copy SOP"}
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-baseline justify-between gap-3 bg-slate-950/90 border border-slate-800/90 rounded-lg px-3.5 py-2.5">
                  <div className="font-mono text-base sm:text-lg font-bold text-emerald-300 break-all">
                    {outputVarName}
                    <sub className="text-[10px] text-emerald-500">SOP(min)</sub> ={" "}
                    <span className="text-white">{analysis.minimizedSOP}</span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-400">
                    ∑m({analysis.minterms.join(", ") || "∅"}) ·{" "}
                    {analysis.gateCost.sopGates} gates
                  </div>
                </div>

                {/* Prime Implicant Terms Pills */}
                {analysis.primeImplicants.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                    <span className="text-[11px] font-mono text-slate-400 mr-1">
                      Selected Prime Implicants:
                    </span>
                    {analysis.primeImplicants.map((pi) => (
                      <span
                        key={pi.mask}
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono border ${
                          pi.essential
                            ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-200"
                            : "bg-cyan-500/15 border-cyan-500/40 text-cyan-200"
                        }`}
                      >
                        <strong className="text-white">{pi.termSOP}</strong>
                        <span className="text-slate-400">[{pi.mask}]</span>
                        <span className="text-[10px] text-slate-400">
                          m({pi.minterms.join(",")})
                        </span>
                        {pi.essential && (
                          <span className="text-[9px] font-bold uppercase px-1 rounded bg-emerald-400/20 text-emerald-300">
                            EPI
                          </span>
                        )}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-rose-500/15 border border-rose-500/40 text-xs font-mono text-rose-200">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{analysis.error}</span>
              </div>
            )}
          </div>

          {/* Right 5 Cols: Minterm ∑m(...) Generator & Preset Functions */}
          <div className="lg:col-span-5 bg-[#111827] border border-slate-800 rounded-xl p-4 space-y-3.5">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
                  Canonical Minterm ∑m(...) Generator
                </span>
                <div className="flex items-center gap-1">
                  {([2, 3, 4] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setMintermVarCount(v)}
                      className={`px-2 py-0.5 rounded text-[11px] font-mono cursor-pointer ${
                        mintermVarCount === v
                          ? "bg-amber-400 text-slate-950 font-bold"
                          : "bg-slate-900 text-slate-400 border border-slate-800"
                      }`}
                    >
                      {v} Vars
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-slate-400">∑m(</span>
                <input
                  type="text"
                  value={mintermQuickInput}
                  onChange={(e) => setMintermQuickInput(e.target.value)}
                  placeholder="e.g. 1, 2, 5, 7"
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-amber-200 focus:outline-none focus:border-amber-400"
                />
                <span className="font-mono text-xs text-slate-400">)</span>
                <button
                  type="button"
                  onClick={handleApplyMintermList}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 cursor-pointer whitespace-nowrap"
                >
                  Build Equation
                </button>
              </div>
            </div>

            {/* Preset Engineering Functions */}
            <div className="pt-2 border-t border-slate-800">
              <div className="text-xs font-semibold text-slate-400 mb-2">
                Load Standard Boolean Engineering Function:
              </div>
              <div className="grid grid-cols-2 gap-1.5 max-h-44 overflow-y-auto pr-1">
                {BOOLEAN_PRESET_FUNCTIONS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => setExpressionInput(preset.expression)}
                    className="text-left p-2 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-800 transition-colors cursor-pointer"
                    title={preset.description}
                  >
                    <div className="text-xs font-semibold text-white truncate">
                      {preset.name}
                    </div>
                    <div className="text-[11px] font-mono text-cyan-400 truncate">
                      {preset.expression}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Middle Row: Hardware Synthesis Architecture Selector + 6 Canonical & Minimized Algebraic Forms */}
        {analysis.valid && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left 7 Cols: All 6 Algebraic Representations */}
            <div className="lg:col-span-7 bg-[#111827] border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  Equivalent Boolean Algebra Forms
                </h3>
                <span className="text-[11px] font-mono text-slate-400">
                  {outputVarName}({analysis.variables.join(", ")})
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 font-mono text-xs">
                <div className="bg-slate-950/90 border border-emerald-500/35 rounded-lg p-3">
                  <div className="text-[11px] text-slate-400 mb-1">
                    1. Minimized Sum of Products (SOP — Quine-McCluskey)
                  </div>
                  <div className="text-sm font-bold text-emerald-400 break-words">
                    {outputVarName} = {analysis.minimizedSOP}
                  </div>
                </div>

                <div className="bg-slate-950/90 border border-amber-500/35 rounded-lg p-3">
                  <div className="text-[11px] text-slate-400 mb-1">
                    2. Minimized Product of Sums (POS)
                  </div>
                  <div className="text-sm font-bold text-amber-300 break-words">
                    {outputVarName} = {analysis.minimizedPOS}
                  </div>
                </div>

                <div className="bg-slate-950/90 border border-cyan-500/30 rounded-lg p-3">
                  <div className="text-[11px] text-slate-400 mb-1">
                    3. Universal 7400 NAND-Only (De Morgan)
                  </div>
                  <div className="text-xs font-bold text-cyan-300 break-words">
                    {outputVarName} = {analysis.nandOnlyExpression}
                  </div>
                </div>

                <div className="bg-slate-950/90 border border-purple-500/30 rounded-lg p-3">
                  <div className="text-[11px] text-slate-400 mb-1">
                    4. Universal 7402 NOR-Only (De Morgan)
                  </div>
                  <div className="text-xs font-bold text-purple-300 break-words">
                    {outputVarName} = {analysis.norOnlyExpression}
                  </div>
                </div>

                <div className="bg-slate-950/90 border border-slate-800 rounded-lg p-3">
                  <div className="text-[11px] text-slate-400 mb-1">
                    5. Reed-Muller XOR Polynomial (ANF)
                  </div>
                  <div className="text-xs font-bold text-pink-300 break-words">
                    {outputVarName} = {analysis.reedMullerANF}
                  </div>
                </div>

                <div className="bg-slate-950/90 border border-slate-800 rounded-lg p-3">
                  <div className="text-[11px] text-slate-400 mb-1">
                    6. Canonical Minterm / Maxterm Index
                  </div>
                  <div className="text-xs text-slate-200 break-words">
                    ∑m({analysis.minterms.join(", ") || "∅"}) · ∏M(
                    {analysis.maxterms.join(", ") || "∅"})
                  </div>
                </div>
              </div>
            </div>

            {/* Right 5 Cols: Target Hardware Synthesis Architecture Picker */}
            <div className="lg:col-span-5 bg-[#111827] border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-3">
              <div className="space-y-2.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" />
                  Select Function Generator Hardware Topology
                </h3>
                <p className="text-xs text-slate-400">
                  Choose how the Boolean Function Generator synthesizes gates and
                  wires onto the schematic canvas:
                </p>

                <div className="space-y-1.5">
                  {(
                    [
                      {
                        id: "SOP_AND_OR",
                        title: "2-Level Minimized SOP (AND → OR)",
                        sub: `Uses ${analysis.gateCost.sopGates} gates · Direct Sum-of-Products network`,
                      },
                      {
                        id: "POS_OR_AND",
                        title: "2-Level Minimized POS (OR → AND)",
                        sub: "Maxterm Product-of-Sums gate network",
                      },
                      {
                        id: "NAND_ONLY",
                        title: "Universal 7400 NAND-Only Network",
                        sub: `Uses ${analysis.gateCost.nandOnlyGates} NAND gates via De Morgan's Law`,
                      },
                      {
                        id: "NOR_ONLY",
                        title: "Universal 7402 NOR-Only Network",
                        sub: `Uses ${analysis.gateCost.norOnlyGates} NOR gates via De Morgan's Law`,
                      },
                      {
                        id: "DECODER_74138",
                        title: "74138 3-to-8 Decoder + OR Minterm Generator",
                        sub: "MSI Decoder canonical minterm synthesis (for 2–3 vars)",
                      },
                    ] as {
                      id: SynthesisArchitecture;
                      title: string;
                      sub: string;
                    }[]
                  ).map((arch) => (
                    <button
                      key={arch.id}
                      type="button"
                      onClick={() => setSelectedArch(arch.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                        selectedArch === arch.id
                          ? "bg-cyan-500/15 border-cyan-400 text-white"
                          : "bg-slate-900/70 border-slate-800 text-slate-300 hover:bg-slate-900"
                      }`}
                    >
                      <div>
                        <div className="text-xs font-bold">{arch.title}</div>
                        <div className="text-[11px] font-mono text-slate-400">
                          {arch.sub}
                        </div>
                      </div>
                      <ArrowRight
                        className={`w-4 h-4 shrink-0 ${
                          selectedArch === arch.id
                            ? "text-cyan-300"
                            : "text-slate-600"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={handleGenerateSchematic}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 text-slate-950 shadow-lg shadow-cyan-500/10 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Cpu className="w-4 h-4" />
                Synthesize &amp; Launch in Interactive Circuit Lab
              </button>
            </div>
          </div>
        )}

        {/* Bottom Tabs: Quine-McCluskey Tabular Solver | Step-by-Step Algebraic Proof | Complete Truth Table | Boolean Algebra Laws Reference */}
        {analysis.valid && (
          <div className="bg-[#111827] border border-slate-800 rounded-xl p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveSubView("QUINE_MCCLUSKEY")}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                    activeSubView === "QUINE_MCCLUSKEY"
                      ? "bg-emerald-400 text-slate-950 font-bold"
                      : "bg-slate-900 text-slate-300 hover:text-white border border-slate-800"
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Quine-McCluskey Tabular Solver &amp; Prime Implicant Chart
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSubView("DERIVATION")}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                    activeSubView === "DERIVATION"
                      ? "bg-cyan-400 text-slate-950 font-bold"
                      : "bg-slate-900 text-slate-300 hover:text-white border border-slate-800"
                  }`}
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  Step-by-Step Boolean Algebra Derivation (
                  {analysis.algebraicSteps.length} Steps)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSubView("TRUTH_TABLE")}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                    activeSubView === "TRUTH_TABLE"
                      ? "bg-cyan-400 text-slate-950 font-bold"
                      : "bg-slate-900 text-slate-300 hover:text-white border border-slate-800"
                  }`}
                >
                  <Table className="w-3.5 h-3.5" />
                  Canonical Minterm &amp; Maxterm Truth Table (
                  {analysis.truthTable.length} Rows)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSubView("LAWS_REFERENCE")}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                    activeSubView === "LAWS_REFERENCE"
                      ? "bg-cyan-400 text-slate-950 font-bold"
                      : "bg-slate-900 text-slate-300 hover:text-white border border-slate-800"
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  Boolean Algebra Axioms &amp; Theorems Reference (13 Laws)
                </button>
              </div>
            </div>

            {/* Subview 0: Quine-McCluskey Tabular Method & Prime Implicant Coverage Matrix */}
            {activeSubView === "QUINE_MCCLUSKEY" && (
              <div className="space-y-5">
                {analysis.minterms.length === 0 ? (
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-400">
                    Function has no ON-set minterms (∑m = ∅). Minimal SOP = 0.
                  </div>
                ) : (
                  <>
                    {/* Stage 1: Iterative Hamming-Weight Implicant Merging Columns */}
                    <div className="space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                          Stage 1 — Quine-McCluskey Binary Mask Merging Columns (
                          {analysis.variables.join("")})
                        </h4>
                        <span className="text-[11px] font-mono text-slate-400">
                          ✓ = Combined into next column · ★ PI = Unmerged Prime
                          Implicant
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                        {analysis.quineMcCluskey.passes.map((pass) => (
                          <div
                            key={pass.passIndex}
                            className="bg-slate-950/90 border border-slate-800 rounded-xl p-3 space-y-2.5"
                          >
                            <div>
                              <div className="text-xs font-bold text-cyan-300">
                                {pass.title}
                              </div>
                              <div className="text-[11px] text-slate-400">
                                {pass.description}
                              </div>
                            </div>

                            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                              {pass.groups.map((grp) => (
                                <div
                                  key={grp.onesCount}
                                  className="bg-slate-900/70 border border-slate-800/80 rounded-lg p-2 space-y-1"
                                >
                                  <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-300 border-b border-slate-800 pb-1">
                                    Group G{grp.onesCount} ({grp.onesCount} One
                                    {grp.onesCount === 1 ? "" : "s"})
                                  </div>
                                  {grp.items.map((item) => (
                                    <div
                                      key={`${item.mask}-${item.minterms.join("_")}`}
                                      className="flex items-center justify-between gap-2 text-xs font-mono py-0.5"
                                    >
                                      <span className="text-slate-300">
                                        m({item.minterms.join(",")})
                                      </span>
                                      <div className="flex items-center gap-2">
                                        <span className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-cyan-300 font-bold">
                                          {item.mask}
                                        </span>
                                        <span className="text-slate-400">
                                          {item.termSOP}
                                        </span>
                                        {item.combined ? (
                                          <span
                                            className="text-emerald-400 font-bold"
                                            title="Merged into higher-order implicant"
                                          >
                                            ✓
                                          </span>
                                        ) : (
                                          <span
                                            className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40"
                                            title="Prime Implicant (cannot be combined further)"
                                          >
                                            ★ PI
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Stage 2: Prime Implicant Coverage Chart */}
                    <div className="space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                          Stage 2 — Prime Implicant Coverage Chart &amp; Essential
                          PI Selection
                        </h4>
                        <span className="text-[11px] font-mono text-slate-400">
                          ● = Unique Minterm Column (Essential Prime Implicant) · ×
                          = Covered Minterm
                        </span>
                      </div>

                      <div className="overflow-x-auto rounded-xl border border-slate-800">
                        <table className="w-full text-xs font-mono tabular-nums border-collapse">
                          <thead>
                            <tr className="bg-slate-900 text-slate-300 border-b border-slate-800">
                              <th className="py-2 px-3 text-left">Status</th>
                              <th className="py-2 px-3 text-left">
                                Prime Implicant Term
                              </th>
                              <th className="py-2 px-3 text-center">
                                Binary Mask ({analysis.variables.join("")})
                              </th>
                              <th className="py-2 px-3 text-left">
                                Covered Minterms
                              </th>
                              {analysis.minterms.map((m) => {
                                const isUnique =
                                  analysis.quineMcCluskey.uniqueMintermColumns.includes(
                                    m
                                  );
                                return (
                                  <th
                                    key={m}
                                    className={`py-2 px-2.5 text-center border-l border-slate-800 ${
                                      isUnique
                                        ? "bg-emerald-500/15 text-emerald-300 font-bold"
                                        : "text-cyan-300"
                                    }`}
                                  >
                                    m{m}
                                  </th>
                                );
                              })}
                            </tr>
                          </thead>
                          <tbody>
                            {analysis.quineMcCluskey.allPrimeImplicants.map(
                              (pi) => (
                                <tr
                                  key={pi.mask}
                                  className={`border-b border-slate-800/70 ${
                                    pi.selectedInMinimalCover
                                      ? "bg-emerald-500/10 text-white"
                                      : "bg-slate-950/70 text-slate-400"
                                  }`}
                                >
                                  <td className="py-2 px-3">
                                    {pi.essential ? (
                                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-400 text-slate-950">
                                        ★ Essential PI
                                      </span>
                                    ) : pi.selectedInMinimalCover ? (
                                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-400 text-slate-950">
                                        Selected PI
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400">
                                        Redundant
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-2 px-3 font-bold text-emerald-300">
                                    {pi.termSOP}
                                  </td>
                                  <td className="py-2 px-3 text-center text-cyan-300">
                                    {pi.mask}
                                  </td>
                                  <td className="py-2 px-3 text-slate-300">
                                    m({pi.minterms.join(", ")})
                                  </td>
                                  {analysis.minterms.map((m) => {
                                    const covers = pi.minterms.includes(m);
                                    const isUnique =
                                      analysis.quineMcCluskey.uniqueMintermColumns.includes(
                                        m
                                      );
                                    return (
                                      <td
                                        key={m}
                                        className={`py-2 px-2.5 text-center border-l border-slate-800 ${
                                          covers && isUnique
                                            ? "bg-emerald-500/20 text-emerald-300 font-bold"
                                            : covers
                                            ? "text-cyan-300 font-bold"
                                            : "text-slate-700"
                                        }`}
                                      >
                                        {covers ? (isUnique ? "●" : "×") : "·"}
                                      </td>
                                    );
                                  })}
                                </tr>
                              )
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Subview 1: Step-by-Step Algebraic Derivation */}
            {activeSubView === "DERIVATION" && (
              <div className="space-y-3">
                {analysis.algebraicSteps.map((step, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-bold text-cyan-300">
                        {step.ruleName}
                      </span>
                      <span className="text-xs font-mono text-amber-300">
                        Identity: {step.lawFormula}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 font-mono text-xs">
                      <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2.5">
                        <div className="text-[10px] text-slate-500 mb-0.5">
                          BEFORE
                        </div>
                        <div className="text-slate-300 break-words">
                          {step.expressionBefore}
                        </div>
                      </div>
                      <div className="bg-slate-900/90 border border-emerald-500/30 rounded-lg p-2.5">
                        <div className="text-[10px] text-emerald-400 mb-0.5">
                          AFTER REDUCTION
                        </div>
                        <div className="text-emerald-300 font-bold break-words">
                          {step.expressionAfter}
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400">{step.explanation}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Subview 2: Truth Table with Canonical Minterms & Maxterms */}
            {activeSubView === "TRUTH_TABLE" && (
              <div className="max-h-72 overflow-auto rounded-lg border border-slate-800">
                <table className="w-full text-xs font-mono tabular-nums border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-cyan-400 border-b border-slate-800">
                      <th className="py-2 px-3 text-left">#</th>
                      {analysis.variables.map((v) => (
                        <th key={v} className="py-2 px-3 text-center">
                          {v}
                        </th>
                      ))}
                      <th className="py-2 px-3 text-center border-l border-slate-800 text-emerald-400">
                        {outputVarName}
                      </th>
                      <th className="py-2 px-3 text-left border-l border-slate-800 text-slate-300">
                        Canonical Minterm (m_i)
                      </th>
                      <th className="py-2 px-3 text-left border-l border-slate-800 text-slate-300">
                        Canonical Maxterm (M_i)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysis.truthTable.map((row) => (
                      <tr
                        key={row.index}
                        className={`border-b border-slate-800/60 ${
                          row.output === 1
                            ? "bg-emerald-500/10 text-white"
                            : "text-slate-400"
                        }`}
                      >
                        <td className="py-1.5 px-3 text-slate-500">
                          m{row.index}
                        </td>
                        {row.bits.map((b, i) => (
                          <td
                            key={i}
                            className={`py-1.5 px-3 text-center ${
                              b === 1 ? "text-cyan-300 font-bold" : ""
                            }`}
                          >
                            {b}
                          </td>
                        ))}
                        <td
                          className={`py-1.5 px-3 text-center border-l border-slate-800 font-bold ${
                            row.output === 1
                              ? "text-emerald-400"
                              : "text-slate-500"
                          }`}
                        >
                          {row.output}
                        </td>
                        <td className="py-1.5 px-3 border-l border-slate-800 text-emerald-300">
                          m{row.index} = {row.mintermTerm}
                        </td>
                        <td className="py-1.5 px-3 border-l border-slate-800 text-amber-300">
                          M{row.index} = {row.maxtermTerm}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Subview 3: Complete Boolean Algebra Laws Reference Table */}
            {activeSubView === "LAWS_REFERENCE" && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {BOOLEAN_ALGEBRA_LAWS_REFERENCE.map((law) => (
                  <div
                    key={law.name}
                    className="bg-slate-950/90 border border-slate-800 rounded-lg p-3 space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-white">{law.name}</span>
                      <span className="text-[11px] font-mono text-slate-400">
                        {law.category}
                      </span>
                    </div>
                    <div className="font-mono text-xs text-cyan-300 font-bold">
                      AND: {law.andForm}
                    </div>
                    <div className="font-mono text-xs text-emerald-300 font-bold">
                      OR: {law.orForm}
                    </div>
                    <p className="text-[11px] text-slate-400">
                      {law.description}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

interface BooleanFunctionGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSynthesizeCircuit: (circuit: {
    title: string;
    nodes: PresetNodeDef[];
    wires: PresetWireDef[];
  }) => void;
}

export const BooleanFunctionGeneratorModal: React.FC<
  BooleanFunctionGeneratorModalProps
> = ({ isOpen, onClose, onSynthesizeCircuit }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-3 sm:p-5 overflow-y-auto">
      <div className="w-full max-w-[1260px] max-h-[92vh] overflow-y-auto">
        <BooleanFunctionGeneratorPanel
          isModal={true}
          onClose={onClose}
          onSynthesizeCircuit={onSynthesizeCircuit}
        />
      </div>
    </div>
  );
};

export default BooleanFunctionGeneratorModal;
