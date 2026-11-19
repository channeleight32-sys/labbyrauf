import React, { useMemo, useState } from "react";
import {
  Compass,
  X,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Zap,
  Cpu,
  Activity,
  Grid3X3,
  Minimize2,
  Maximize2,
  Sparkles,
  Crosshair,
} from "lucide-react";
import type { AnalogNode } from "./SeriesParallelBuilder";
import type { NgspiceSimulationResult } from "../utils/ngspiceEngine";

export type SpiceTourStepId = 1 | 2 | 3 | 4 | 5;

interface SpiceGuidedTourOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  step: SpiceTourStepId;
  onStepChange: (step: SpiceTourStepId) => void;
  nodes: AnalogNode[];
  mnaSolution: NgspiceSimulationResult;
  activeScenario: string;
  focusedNetId: number | null;
  onFocusNetId: (netId: number | null) => void;
  onOpenMatrixDebug: () => void;
  onOpenOscilloscope: () => void;
  onRunOpenCircuitAudit: () => void;
  openCircuitCount: number;
}

const STEP_META: { id: SpiceTourStepId; short: string; title: string }[] = [
  { id: 1, short: "1. GND", title: "Step 1 · Ground Reference Datum (Node 0)" },
  { id: 2, short: "2. Sources", title: "Step 2 · Sources & MNA Matrix Stamping" },
  { id: 3, short: "3. Nodes", title: "Step 3 · Key MNA Nodes & KCL Balance" },
  { id: 4, short: "4. NR Loop", title: "Step 4 · Newton-Raphson Convergence" },
  { id: 5, short: "5. Verify", title: "Step 5 · Power Balance & Transient CSV" },
];

function getStrategyExplanation(
  strategy: string | undefined,
  converged: boolean,
  iterations: number,
  gminSteps?: number,
  sourceSteps?: number,
  abortedReason?: string
): { badge: string; tone: "emerald" | "cyan" | "amber" | "rose"; summary: string } {
  if (!converged) {
    return {
      badge: "DID NOT CONVERGE",
      tone: "rose",
      summary:
        abortedReason ||
        "The Newton-Raphson solver could not settle within tolerance. Usually this happens when a wire loop is broken (floating node), a ground reference is missing, or two ideal voltage sources are shorted in parallel.",
    };
  }
  if (strategy === "LINEAR") {
    return {
      badge: "LINEAR EXACT SOLVE",
      tone: "emerald",
      summary:
        "All active elements are linear (resistors, sources, switches). MNA solved [A]·[x] = [b] directly in 1 exact matrix inversion without needing nonlinear Newton-Raphson iterations.",
    };
  }
  if (strategy === "GMIN_STEPPING") {
    return {
      badge: "GMIN HOMOTOPY CONVERGED",
      tone: "amber",
      summary: `Direct NR hit a stiff diode/transistor knee, so SPICE automatically added temporary parallel Gmin conductances and stepped them down over ${
        gminSteps ?? 0
      } homotopy stages (${iterations} total NR iterations) until real physics held.`,
    };
  }
  if (strategy === "SOURCE_STEPPING") {
    return {
      badge: "SOURCE-STEPPING CONVERGED",
      tone: "amber",
      summary: `Nonlinear junctions started too far from equilibrium, so SPICE ramped all supply voltages from 0% → 100% across ${
        sourceSteps ?? 0
      } continuation steps (${iterations} total NR iterations) to guide Newton-Raphson home.`,
    };
  }
  return {
    badge: "DIRECT NR CONVERGED",
    tone: "cyan",
    summary: `Semiconductors (diodes, LEDs, BJTs, MOSFETs) were linearized around each guess using tangent conductances (g_eq) and damped junction limiting (pnjlim), converging smoothly in ${iterations} NR iteration${
      iterations === 1 ? "" : "s"
    }.`,
  };
}

export default function SpiceGuidedTourOverlay({
  isOpen,
  onClose,
  step,
  onStepChange,
  nodes,
  mnaSolution,
  activeScenario,
  focusedNetId,
  onFocusNetId,
  onOpenMatrixDebug,
  onOpenOscilloscope,
  onRunOpenCircuitAudit,
  openCircuitCount,
}: SpiceGuidedTourOverlayProps) {
  const [isMinimized, setIsMinimized] = useState(false);

  const { convergence, validation, nodalSolutions, branchSolutions } = mnaSolution;

  const nonGroundNets = useMemo(
    () => nodalSolutions.filter((ns) => ns.netId !== 0),
    [nodalSolutions]
  );

  const activeNet = useMemo(() => {
    if (focusedNetId !== null) {
      const match = nodalSolutions.find((ns) => ns.netId === focusedNetId);
      if (match) return match;
    }
    return nonGroundNets[0] ?? nodalSolutions[0] ?? null;
  }, [focusedNetId, nodalSolutions, nonGroundNets]);

  const sourceNodes = useMemo(
    () => nodes.filter((n) => n.type === "VS" || n.type === "FG" || n.type === "IS"),
    [nodes]
  );

  const nonlinearNodes = useMemo(
    () =>
      nodes.filter((n) =>
        [
          "D",
          "D1N4007",
          "ZD",
          "LED",
          "BJT",
          "BC547",
          "BC557",
          "MOS",
          "JFET",
          "OPAMP",
          "SCR",
          "DIAC",
          "TRIAC",
        ].includes(n.type)
      ),
    [nodes]
  );

  const nrExplanation = useMemo(
    () =>
      getStrategyExplanation(
        convergence.strategyUsed,
        convergence.converged,
        convergence.iterations,
        convergence.gminStepsExecuted,
        convergence.sourceStepsExecuted,
        mnaSolution.abortedReason
      ),
    [convergence, mnaSolution.abortedReason]
  );

  if (!isOpen) return null;

  const currentMeta = STEP_META.find((m) => m.id === step) ?? STEP_META[0];
  const iterHistory = convergence.iterationHistory ?? [];
  const maxIterDelta = Math.max(
    1e-6,
    ...iterHistory.map((it) => Math.abs(it.maxDeltaV || 0))
  );

  const toneClasses = {
    emerald: "bg-[#48C99A]/15 border-[#48C99A]/45 text-[#48C99A]",
    cyan: "bg-[#35BDF2]/15 border-[#35BDF2]/45 text-[#35BDF2]",
    amber: "bg-[#F1B65B]/15 border-[#F1B65B]/45 text-[#F1B65B]",
    rose: "bg-[#F07474]/15 border-[#F07474]/45 text-[#F07474]",
  }[nrExplanation.tone];

  return (
    <div
      className="fixed bottom-4 right-4 z-40 w-[min(94vw,470px)] rounded-2xl bg-[#0D1729]/95 backdrop-blur-md border border-[#35BDF2]/45 shadow-[0_20px_60px_rgba(3,7,18,0.85)] text-[#F1F5FA] overflow-hidden"
      role="dialog"
      aria-label="SPICE Simulation Guided Tour"
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-2 px-4 py-2.5 bg-[#111B2B] border-b border-[#24344D]">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-[#35BDF2]/15 border border-[#35BDF2]/40 flex items-center justify-center shrink-0">
            <Compass className="w-4 h-4 text-[#35BDF2]" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-mono font-bold text-[#35BDF2] tracking-wide truncate">
              SIMULATION GUIDED TOUR
            </div>
            <div className="text-[10px] font-mono text-[#9BAAC0] truncate">
              {activeScenario}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
              convergence.converged
                ? "bg-[#48C99A]/15 border-[#48C99A]/40 text-[#48C99A]"
                : "bg-[#F07474]/15 border-[#F07474]/40 text-[#F07474]"
            }`}
          >
            {convergence.converged ? "NR OK" : "NR CHECK"}
          </span>
          <button
            type="button"
            onClick={() => setIsMinimized((v) => !v)}
            className="p-1.5 rounded-lg bg-[#162338] hover:bg-[#1C2B40] border border-[#24344D] text-[#9BAAC0] hover:text-white cursor-pointer"
            title={isMinimized ? "Expand Guided Tour" : "Minimize Guided Tour"}
          >
            {isMinimized ? (
              <Maximize2 className="w-3.5 h-3.5" />
            ) : (
              <Minimize2 className="w-3.5 h-3.5" />
            )}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[#162338] hover:bg-rose-950/70 border border-[#24344D] text-[#9BAAC0] hover:text-rose-200 cursor-pointer"
            title="Close Simulation Guided Tour"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <div className="p-4 space-y-3.5 max-h-[75vh] overflow-y-auto">
          {/* Step Selector Strip */}
          <div className="grid grid-cols-5 gap-1 bg-[#09101E] p-1 rounded-xl border border-[#24344D]">
            {STEP_META.map((m) => {
              const active = m.id === step;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onStepChange(m.id)}
                  className={`py-1.5 px-1 rounded-lg text-[10px] font-mono font-bold transition-colors cursor-pointer truncate ${
                    active
                      ? "bg-[#35BDF2] text-[#0B1220]"
                      : "text-[#9BAAC0] hover:text-white hover:bg-[#162338]"
                  }`}
                >
                  {m.short}
                </button>
              );
            })}
          </div>

          {/* Step Heading */}
          <div className="space-y-1">
            <h4 className="text-sm font-mono font-bold text-white">
              {currentMeta.title}
            </h4>
            <p className="text-[11px] text-[#9BAAC0] leading-relaxed">
              Highlighted target rings on the schematic mark the active MNA nodes for this step. Click any highlighted node ring on the canvas to inspect it.
            </p>
          </div>

          {/* STEP 1: GROUND REFERENCE */}
          {step === 1 && (
            <div className="space-y-2.5 text-xs">
              <div className="p-3 rounded-xl bg-[#111B2B] border border-[#24344D] space-y-1.5">
                <div className="font-mono font-bold text-[#35BDF2] text-[11px]">
                  Why SPICE Needs Node 0 (GND)
                </div>
                <p className="text-[11.5px] text-slate-300 leading-relaxed">
                  Modified Nodal Analysis solves for node potentials relative to a 0.00 V reference (<code className="text-[#35BDF2]">Node 0</code>). Without a ground datum, all voltages could shift up or down together and the matrix <code>[G]</code> becomes singular (unsolvable).
                </p>
              </div>

              <div
                className={`p-3 rounded-xl border flex items-start gap-2.5 ${
                  validation.hasExplicitGround
                    ? "bg-[#48C99A]/10 border-[#48C99A]/40"
                    : "bg-[#F1B65B]/10 border-[#F1B65B]/40"
                }`}
              >
                {validation.hasExplicitGround ? (
                  <CheckCircle2 className="w-4 h-4 text-[#48C99A] shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-[#F1B65B] shrink-0 mt-0.5" />
                )}
                <div className="space-y-1">
                  <div className="font-mono font-bold text-xs text-white">
                    {validation.hasExplicitGround
                      ? "Explicit Ground Datum Verified (V(0) = 0.000 V)"
                      : "No Explicit GND Symbol Found — Virtual Reference Active"}
                  </div>
                  <p className="text-[11px] text-slate-300">
                    {validation.hasExplicitGround
                      ? "Your GND node anchors Node 0 cleanly so every other MNA node voltage has an unambiguous physical reference."
                      : "Place a GND component and wire it to your source negative terminal for realistic lab measurements."}
                  </p>
                </div>
              </div>

              {openCircuitCount > 0 && (
                <button
                  type="button"
                  onClick={onRunOpenCircuitAudit}
                  className="w-full py-2 px-3 rounded-lg bg-[#F1B65B]/15 hover:bg-[#F1B65B]/25 border border-[#F1B65B]/50 text-[#F1B65B] text-xs font-mono font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Highlight {openCircuitCount} Open / Floating Issue{openCircuitCount > 1 ? "s" : ""} on Canvas
                </button>
              )}
            </div>
          )}

          {/* STEP 2: SOURCES & MNA STAMPING */}
          {step === 2 && (
            <div className="space-y-2.5 text-xs">
              <div className="p-3 rounded-xl bg-[#111B2B] border border-[#24344D] space-y-1.5">
                <div className="font-mono font-bold text-[#35BDF2] text-[11px]">
                  How Sources Build the MNA Matrix [A]·[x] = [b]
                </div>
                <p className="text-[11.5px] text-slate-300 leading-relaxed">
                  Resistors stamp conductances (<code className="text-emerald-300">1/R</code>) into the nodal block. Ideal voltage sources (<code className="text-amber-300">VS / FG</code>) add an extra unknown branch-current row &amp; column so SPICE solves both node voltages and source currents simultaneously.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 font-mono">
                <div className="p-2.5 rounded-xl bg-[#0B1220] border border-[#24344D]">
                  <div className="text-[10px] text-[#9BAAC0]">UNKNOWN NODES</div>
                  <div className="text-sm font-bold text-[#35BDF2] tabular-nums">
                    {convergence.unknownNodesCount}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-[#0B1220] border border-[#24344D]">
                  <div className="text-[10px] text-[#9BAAC0]">V-SRC CURRENTS</div>
                  <div className="text-sm font-bold text-[#F1B65B] tabular-nums">
                    +{convergence.voltageSourcesCount}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-[#0B1220] border border-[#24344D]">
                  <div className="text-[10px] text-[#9BAAC0]">MNA DIMENSION</div>
                  <div className="text-sm font-bold text-[#48C99A] tabular-nums">
                    {convergence.matrixDimension}×{convergence.matrixDimension}
                  </div>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-[#0B1220] border border-[#24344D] space-y-1.5">
                <div className="text-[10px] font-mono font-bold text-[#9BAAC0] uppercase">
                  Active Circuit Sources ({sourceNodes.length})
                </div>
                {sourceNodes.length === 0 ? (
                  <p className="text-[11px] text-[#F1B65B]">
                    No voltage or current source detected. Add VS or FG from the palette to energize MNA nodes.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {sourceNodes.map((src) => {
                      const tel = mnaSolution.compTelemetry.get(src.id);
                      const posNet = mnaSolution.getTermNet(src.id, 0);
                      return (
                        <button
                          key={src.id}
                          type="button"
                          onClick={() => onFocusNetId(posNet)}
                          className="px-2 py-1 rounded-lg bg-[#162338] hover:bg-[#1C2B40] border border-[#35BDF2]/40 text-[11px] font-mono text-left cursor-pointer"
                        >
                          <span className="font-bold text-[#35BDF2]">{src.label}</span>{" "}
                          <span className="text-slate-300">
                            ({src.value}
                            {src.type === "IS" ? "mA" : "V"})
                          </span>{" "}
                          <span className="text-[#48C99A]">
                            → I={Math.abs(tel?.current_mA ?? 0).toFixed(2)}mA
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: KEY MNA NODE EXPLORER */}
          {step === 3 && (
            <div className="space-y-2.5 text-xs">
              <div className="flex flex-wrap gap-1.5">
                {nodalSolutions.map((ns) => {
                  const selected = activeNet?.netId === ns.netId;
                  return (
                    <button
                      key={ns.netId}
                      type="button"
                      onClick={() => onFocusNetId(ns.netId)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold border transition-colors cursor-pointer tabular-nums ${
                        selected
                          ? "bg-[#35BDF2] border-[#35BDF2] text-[#0B1220]"
                          : "bg-[#111B2B] border-[#24344D] text-slate-200 hover:border-[#35BDF2]/60"
                      }`}
                    >
                      <Crosshair className="w-3 h-3" />
                      <span>
                        {ns.netName}: {ns.voltageV >= 0 ? "+" : ""}
                        {ns.voltageV.toFixed(2)}V
                      </span>
                    </button>
                  );
                })}
              </div>

              {activeNet ? (
                <div className="p-3 rounded-xl bg-[#111B2B] border border-[#35BDF2]/40 space-y-2 font-mono">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-[#35BDF2]">
                      Focused MNA Node: {activeNet.netName} (Net #{activeNet.netId})
                    </span>
                    <span className="text-sm font-bold text-[#48C99A] tabular-nums">
                      {activeNet.voltageV >= 0 ? "+" : ""}
                      {activeNet.voltageV.toFixed(3)} V
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-[11px]">
                    <div className="p-2 rounded-lg bg-[#0B1220] border border-[#24344D]">
                      <div className="text-[9.5px] text-[#9BAAC0]">KCL ENTERING</div>
                      <div className="font-bold text-emerald-300 tabular-nums">
                        {activeNet.kclEnteringMa.toFixed(3)} mA
                      </div>
                    </div>
                    <div className="p-2 rounded-lg bg-[#0B1220] border border-[#24344D]">
                      <div className="text-[9.5px] text-[#9BAAC0]">KCL LEAVING</div>
                      <div className="font-bold text-cyan-300 tabular-nums">
                        {activeNet.kclLeavingMa.toFixed(3)} mA
                      </div>
                    </div>
                    <div className="p-2 rounded-lg bg-[#0B1220] border border-[#24344D]">
                      <div className="text-[9.5px] text-[#9BAAC0]">KCL RESIDUAL</div>
                      <div className="font-bold text-[#48C99A] tabular-nums">
                        {activeNet.kclResidualA.toExponential(1)} A
                      </div>
                    </div>
                  </div>

                  <div className="text-[11px] font-sans text-slate-300">
                    <span className="font-mono text-[#9BAAC0] text-[10px]">
                      CONNECTED PINS:{" "}
                    </span>
                    {activeNet.connectedTerminals.length > 0
                      ? activeNet.connectedTerminals.join(" · ")
                      : "Isolated node"}
                  </div>

                  <p className="text-[11px] font-sans text-[#9BAAC0] leading-relaxed">
                    Kirchhoff&apos;s Current Law requires all currents entering {activeNet.netName} to equal currents leaving it. A KCL residual near <code>0 A</code> confirms the MNA voltage at this node satisfies circuit physics.
                  </p>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-[#111B2B] border border-[#24344D] text-[11px] text-[#9BAAC0]">
                  Add and wire components on the schematic to inspect MNA nodes.
                </div>
              )}
            </div>
          )}

          {/* STEP 4: NEWTON-RAPHSON CONVERGENCE EXPLAINER */}
          {step === 4 && (
            <div className="space-y-2.5 text-xs">
              <div className={`p-3 rounded-xl border space-y-1.5 ${toneClasses}`}>
                <div className="flex items-center justify-between gap-2 font-mono">
                  <span className="font-bold text-xs flex items-center gap-1.5">
                    {convergence.converged ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <AlertCircle className="w-4 h-4" />
                    )}
                    {nrExplanation.badge}
                  </span>
                  <span className="text-[10px] tabular-nums">
                    {convergence.solveTimeMs.toFixed(2)} ms
                  </span>
                </div>
                <p className="text-[11.5px] text-slate-200 leading-relaxed">
                  {nrExplanation.summary}
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono">
                <div className="p-2 rounded-xl bg-[#0B1220] border border-[#24344D]">
                  <div className="text-[9.5px] text-[#9BAAC0]">ITERATIONS</div>
                  <div className="text-xs font-bold text-white tabular-nums">
                    {convergence.iterations} / {convergence.maxIterations}
                  </div>
                </div>
                <div className="p-2 rounded-xl bg-[#0B1220] border border-[#24344D]">
                  <div className="text-[9.5px] text-[#9BAAC0]">MAX ΔV STEP</div>
                  <div className="text-xs font-bold text-[#35BDF2] tabular-nums">
                    {convergence.maxDeltaV.toExponential(1)} V
                  </div>
                </div>
                <div className="p-2 rounded-xl bg-[#0B1220] border border-[#24344D]">
                  <div className="text-[9.5px] text-[#9BAAC0]">KCL ERROR</div>
                  <div className="text-xs font-bold text-[#48C99A] tabular-nums">
                    {convergence.kclMaxResidualA.toExponential(1)} A
                  </div>
                </div>
                <div className="p-2 rounded-xl bg-[#0B1220] border border-[#24344D]">
                  <div className="text-[9.5px] text-[#9BAAC0]">NONLINEAR</div>
                  <div className="text-xs font-bold text-[#F1B65B] tabular-nums">
                    {nonlinearNodes.length} part{nonlinearNodes.length === 1 ? "" : "s"}
                  </div>
                </div>
              </div>

              {/* Iteration Convergence Trace */}
              <div className="p-3 rounded-xl bg-[#111B2B] border border-[#24344D] space-y-2">
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="font-bold text-[#35BDF2] uppercase">
                    Newton-Raphson Step Error (Max |ΔV| per Iteration)
                  </span>
                  <span className="text-[#9BAAC0]">
                    {iterHistory.length} recorded step{iterHistory.length === 1 ? "" : "s"}
                  </span>
                </div>
                {iterHistory.length === 0 ? (
                  <p className="text-[11px] text-[#9BAAC0]">
                    Solved in a single linear pass — no iterative error trace needed.
                  </p>
                ) : (
                  <div className="space-y-1 max-h-28 overflow-y-auto pr-1 font-mono text-[10px]">
                    {iterHistory.slice(0, 12).map((it) => {
                      const pct = Math.min(
                        100,
                        Math.max(4, (Math.abs(it.maxDeltaV) / maxIterDelta) * 100)
                      );
                      return (
                        <div key={it.iteration} className="flex items-center gap-2">
                          <span className="w-8 text-[#9BAAC0] tabular-nums">
                            #{it.iteration}
                          </span>
                          <div className="flex-1 h-2 bg-[#0B1220] rounded-full overflow-hidden border border-[#24344D]">
                            <div
                              className={`h-full rounded-full ${
                                it.maxDeltaV < 1e-3
                                  ? "bg-[#48C99A]"
                                  : it.stage === "GMIN_STEPPING" || it.stage === "SOURCE_STEPPING"
                                  ? "bg-[#F1B65B]"
                                  : "bg-[#35BDF2]"
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="w-16 text-right text-slate-200 tabular-nums">
                            {it.maxDeltaV.toExponential(1)}V
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={onOpenMatrixDebug}
                className="w-full py-2 px-3 rounded-lg bg-[#162338] hover:bg-[#1C2B40] border border-[#35BDF2]/40 text-[#35BDF2] text-xs font-mono font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Grid3X3 className="w-3.5 h-3.5" />
                Open Full MNA Matrix [A]·[x] = [b] Debugger
              </button>
            </div>
          )}

          {/* STEP 5: POWER CONSERVATION & TRANSIENT CSV */}
          {step === 5 && (
            <div className="space-y-2.5 text-xs">
              <div className="grid grid-cols-2 gap-2 font-mono">
                <div className="p-3 rounded-xl bg-[#111B2B] border border-[#24344D]">
                  <div className="text-[10px] text-[#9BAAC0]">SOURCE POWER</div>
                  <div className="text-sm font-bold text-[#48C99A] tabular-nums">
                    {mnaSolution.totalSourcePowerMw.toFixed(2)} mW
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-[#111B2B] border border-[#24344D]">
                  <div className="text-[10px] text-[#9BAAC0]">LOAD DISSIPATION</div>
                  <div className="text-sm font-bold text-[#35BDF2] tabular-nums">
                    {mnaSolution.totalLoadPowerMw.toFixed(2)} mW
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#111B2B] border border-[#24344D] space-y-1.5">
                <div className="text-[10px] font-mono font-bold text-[#9BAAC0] uppercase">
                  Key Branch Operating States ({branchSolutions.length})
                </div>
                <div className="max-h-24 overflow-y-auto space-y-1 pr-1 font-mono text-[11px]">
                  {branchSolutions.slice(0, 6).map((br) => (
                    <div
                      key={br.nodeId}
                      className="flex items-center justify-between gap-2 text-slate-300"
                    >
                      <span className="truncate">
                        <strong className="text-white">{br.label}</strong>{" "}
                        <span className="text-[#9BAAC0]">({br.operatingRegion})</span>
                      </span>
                      <span className="text-[#48C99A] shrink-0 tabular-nums">
                        {br.current_mA.toFixed(2)} mA
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#35BDF2]/10 border border-[#35BDF2]/35 space-y-2">
                <div className="flex items-center gap-1.5 font-mono font-bold text-[#35BDF2] text-[11px]">
                  <Sparkles className="w-3.5 h-3.5" />
                  Ready for Time-Domain Analysis in Excel / MATLAB
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Switch to the Virtual Instruments Oscilloscope (XSC1) and click{" "}
                  <strong className="text-white">Download CSV</strong> to export transient voltage time-series across your MNA nodes.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={onOpenMatrixDebug}
                    className="py-2 px-2.5 rounded-lg bg-[#162338] hover:bg-[#1C2B40] border border-[#24344D] text-slate-200 text-[11px] font-mono font-bold flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Cpu className="w-3.5 h-3.5 text-[#35BDF2]" />
                    Matrix Debug
                  </button>
                  <button
                    type="button"
                    onClick={onOpenOscilloscope}
                    className="py-2 px-2.5 rounded-lg bg-[#35BDF2] hover:bg-[#58CAF5] text-[#0B1220] text-[11px] font-mono font-bold flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Activity className="w-3.5 h-3.5" />
                    Oscilloscope &amp; CSV
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Footer Navigation */}
          <div className="flex items-center justify-between pt-2 border-t border-[#24344D]">
            <button
              type="button"
              disabled={step <= 1}
              onClick={() => onStepChange(Math.max(1, step - 1) as SpiceTourStepId)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#162338] hover:bg-[#1C2B40] disabled:opacity-40 disabled:cursor-not-allowed border border-[#24344D] text-xs font-mono font-semibold text-slate-200 cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Back
            </button>

            <span className="text-[11px] font-mono text-[#9BAAC0] tabular-nums">
              Step {step} of 5
            </span>

            {step < 5 ? (
              <button
                type="button"
                onClick={() => onStepChange(Math.min(5, step + 1) as SpiceTourStepId)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#35BDF2] hover:bg-[#58CAF5] text-[#0B1220] text-xs font-mono font-bold cursor-pointer"
              >
                Next
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#48C99A] hover:bg-emerald-300 text-[#0B1220] text-xs font-mono font-bold cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5" />
                Finish Tour
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
