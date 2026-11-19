import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Check,
  Grid3X3,
  ShieldAlert,
  Activity,
} from "lucide-react";
import type {
  SpiceConvergenceReport,
  NetlistDiagnostic,
} from "../utils/ngspiceEngine";

export interface MatrixDebugViewProps {
  convergence?: SpiceConvergenceReport;
  abortedReason?: string;
  validationErrors?: NetlistDiagnostic[];
  title?: string;
}

interface RowDiagnostic {
  rowIndex: number;
  label: string;
  rowInfNorm: number;
  diagValue: number;
  isZeroRow: boolean;
  isZeroDiagOnNodeRow: boolean;
  isNonFinite: boolean;
  reason?: string;
}

export default function MatrixDebugView({
  convergence,
  abortedReason,
  validationErrors = [],
  title = "MNA Matrix [A] · [x] = [b] & Convergence Debugger",
}: MatrixDebugViewProps) {
  const [formatMode, setFormatMode] = useState<"AUTO" | "SCI" | "FIXED">("AUTO");
  const [copiedCsv, setCopiedCsv] = useState<boolean>(false);

  const matrixA = convergence?.mnaMatrixA ?? [];
  const vectorB = convergence?.mnaVectorB ?? [];
  const vectorX = convergence?.solutionVectorX ?? [];
  const labels = useMemo(() => {
    if (convergence?.variableLabels && convergence.variableLabels.length === matrixA.length) {
      return convergence.variableLabels;
    }
    return matrixA.map((_, idx) => `x${idx + 1}`);
  }, [convergence?.variableLabels, matrixA]);

  const unknownNodesCount = convergence?.unknownNodesCount ?? matrixA.length;

  const rowAnalysis = useMemo(() => {
    const diagnostics: RowDiagnostic[] = [];
    let minNonZeroDiag = Infinity;
    let maxDiag = 0;

    matrixA.forEach((row, rIdx) => {
      let rowInfNorm = 0;
      let isNonFinite = !Number.isFinite(vectorB[rIdx] ?? 0);

      for (let cIdx = 0; cIdx < row.length; cIdx++) {
        const v = row[cIdx];
        if (!Number.isFinite(v)) {
          isNonFinite = true;
        } else {
          rowInfNorm = Math.max(rowInfNorm, Math.abs(v));
        }
      }

      const diagValue = row[rIdx] ?? 0;
      const isNodeRow = rIdx < unknownNodesCount;
      const isZeroRow = rowInfNorm < 1e-18;
      const isZeroDiagOnNodeRow = isNodeRow && Math.abs(diagValue) < 1e-14;

      if (Math.abs(diagValue) > 1e-16 && Number.isFinite(diagValue)) {
        minNonZeroDiag = Math.min(minNonZeroDiag, Math.abs(diagValue));
        maxDiag = Math.max(maxDiag, Math.abs(diagValue));
      }

      const lbl = labels[rIdx] || `Row ${rIdx + 1}`;
      let reason: string | undefined;
      if (isNonFinite) {
        reason = `Row ${rIdx + 1} (${lbl}) contains NaN or Infinity — check for zero resistance or exponential overflow.`;
      } else if (isZeroRow) {
        reason = `Row ${rIdx + 1} (${lbl}) is all zeros — node/branch is completely floating with no connected conductance.`;
      } else if (isZeroDiagOnNodeRow) {
        reason = `Row ${rIdx + 1} (${lbl}) has near-zero diagonal A[${rIdx},${rIdx}] = ${diagValue.toExponential(2)} — verify DC path to GND (0 V).`;
      }

      diagnostics.push({
        rowIndex: rIdx,
        label: lbl,
        rowInfNorm,
        diagValue,
        isZeroRow,
        isZeroDiagOnNodeRow,
        isNonFinite,
        reason,
      });
    });

    const conditionEstimate =
      maxDiag > 0 && Number.isFinite(minNonZeroDiag) && minNonZeroDiag > 0
        ? maxDiag / minNonZeroDiag
        : Infinity;

    const flaggedRows = diagnostics.filter(
      (d) => d.isZeroRow || d.isZeroDiagOnNodeRow || d.isNonFinite
    );

    return { diagnostics, flaggedRows, conditionEstimate };
  }, [matrixA, vectorB, labels, unknownNodesCount]);

  const formatCell = (val: number): string => {
    if (!Number.isFinite(val)) return "NaN";
    if (Math.abs(val) < 1e-15) return "0";
    if (formatMode === "SCI") return val.toExponential(2);
    if (formatMode === "FIXED") return val.toFixed(4);
    if (Math.abs(val) >= 1000 || Math.abs(val) < 1e-3) {
      return val.toExponential(2);
    }
    return val.toFixed(4);
  };

  const handleCopyMatrixCsv = async () => {
    if (matrixA.length === 0) return;
    const header = ["Variable", ...labels, "RHS_b", "Sol_x"].join(",");
    const rows = matrixA.map((row, rIdx) =>
      [
        labels[rIdx] || `x${rIdx + 1}`,
        ...row.map((v) => v.toString()),
        (vectorB[rIdx] ?? 0).toString(),
        (vectorX[rIdx] ?? NaN).toString(),
      ].join(",")
    );
    const csv = [header, ...rows].join("\n");
    try {
      await navigator.clipboard?.writeText(csv);
      setCopiedCsv(true);
      setTimeout(() => setCopiedCsv(false), 2000);
    } catch {
      // Ignore clipboard permissions error cleanly
    }
  };

  const strategyLabel =
    convergence?.strategyUsed === "GMIN_STEPPING"
      ? `Gmin Stepping (${convergence.gminStepsExecuted ?? 0} steps)`
      : convergence?.strategyUsed === "SOURCE_STEPPING"
      ? `Source Stepping (${convergence.sourceStepsExecuted ?? 0} steps)`
      : convergence?.strategyUsed === "DIRECT_NR"
      ? "Direct Newton-Raphson"
      : "Linear Gaussian Elimination";

  return (
    <div
      data-testid="matrix-debug-view"
      className="bg-[#070B14] border border-[#24344D] rounded-xl p-4 space-y-4 font-mono text-xs"
    >
      {/* Header & Strategy Summary */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
        <div className="flex flex-wrap items-center gap-2">
          <Grid3X3 className="w-4 h-4 text-[#35BDF2]" />
          <span className="font-bold text-[#F1F5FA]">{title}</span>
          {convergence?.converged ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/40 text-[10px] font-bold text-emerald-300">
              <CheckCircle2 className="w-3 h-3" />
              CONVERGED ({strategyLabel})
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-500/20 border border-rose-500/50 text-[10px] font-bold text-rose-300">
              <ShieldAlert className="w-3 h-3" />
              SINGULAR / UNSOLVED ({strategyLabel})
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {(["AUTO", "SCI", "FIXED"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setFormatMode(m)}
              className={`px-2 py-1 rounded text-[10px] font-bold border cursor-pointer ${
                formatMode === m
                  ? "bg-[#35BDF2] text-[#070B14] border-[#35BDF2]"
                  : "bg-slate-900 text-slate-300 border-slate-700 hover:text-white"
              }`}
            >
              {m}
            </button>
          ))}
          {matrixA.length > 0 && (
            <button
              type="button"
              onClick={handleCopyMatrixCsv}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[10px] font-bold text-cyan-300 cursor-pointer"
            >
              {copiedCsv ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copiedCsv ? "Copied CSV" : "Copy CSV"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Dimension & Numerical Health Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        <div className="bg-[#0B1220] border border-[#24344D] rounded-lg p-2.5">
          <div className="text-[10px] text-slate-400">MATRIX SIZE</div>
          <div className="font-bold text-cyan-300 mt-0.5">
            {matrixA.length} × {matrixA.length}
          </div>
          <div className="text-[10px] text-slate-500">
            {convergence?.unknownNodesCount ?? 0} Nodes + {convergence?.voltageSourcesCount ?? 0} V-Src
          </div>
        </div>
        <div className="bg-[#0B1220] border border-[#24344D] rounded-lg p-2.5">
          <div className="text-[10px] text-slate-400">NR ITERATIONS</div>
          <div className="font-bold text-white mt-0.5">
            {convergence?.iterations ?? 0} iter
          </div>
          <div className="text-[10px] text-slate-500 truncate">{strategyLabel}</div>
        </div>
        <div className="bg-[#0B1220] border border-[#24344D] rounded-lg p-2.5">
          <div className="text-[10px] text-slate-400">G_MIN SHUNT</div>
          <div className="font-bold text-purple-300 mt-0.5">
            {(convergence?.gminSimens ?? 0).toExponential(1)} S
          </div>
          <div className="text-[10px] text-slate-500">Diagonal Stabilizer</div>
        </div>
        <div className="bg-[#0B1220] border border-[#24344D] rounded-lg p-2.5">
          <div className="text-[10px] text-slate-400">KCL RESIDUAL</div>
          <div className="font-bold text-emerald-300 mt-0.5">
            {Number.isFinite(convergence?.kclMaxResidualA)
              ? `${convergence!.kclMaxResidualA.toExponential(2)} A`
              : "N/A (Unsolved)"}
          </div>
          <div className="text-[10px] text-slate-500">||A·x - b||_inf</div>
        </div>
        <div className="bg-[#0B1220] border border-[#24344D] rounded-lg p-2.5">
          <div className="text-[10px] text-slate-400">DIAG RATIO</div>
          <div
            className={`font-bold mt-0.5 ${
              !Number.isFinite(rowAnalysis.conditionEstimate) ||
              rowAnalysis.conditionEstimate > 1e10
                ? "text-rose-400"
                : "text-amber-300"
            }`}
          >
            {Number.isFinite(rowAnalysis.conditionEstimate)
              ? rowAnalysis.conditionEstimate.toExponential(1)
              : "Singular (∞)"}
          </div>
          <div className="text-[10px] text-slate-500">max|Aii| / min|Aii|</div>
        </div>
      </div>

      {/* Explicit Singularity & Failure Findings */}
      {(abortedReason ||
        validationErrors.length > 0 ||
        rowAnalysis.flaggedRows.length > 0) && (
        <div className="rounded-lg border border-rose-500/50 bg-rose-950/55 p-3 space-y-1.5 text-[11px] text-rose-100">
          <div className="flex items-center gap-1.5 font-bold text-rose-300">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>Matrix Singularity &amp; Convergence Root-Cause Findings</span>
          </div>
          {abortedReason && <div className="text-rose-200">• {abortedReason}</div>}
          {validationErrors
            .filter((e) => e.message !== abortedReason)
            .map((err, i) => (
              <div key={`ve-${i}`} className="text-rose-200/90">
                • [{err.code}] {err.message}
              </div>
            ))}
          {rowAnalysis.flaggedRows.map((fr) => (
            <div key={`fr-${fr.rowIndex}`} className="text-amber-200">
              • {fr.reason}
            </div>
          ))}
        </div>
      )}

      {/* Assembled MNA Matrix [A], RHS Vector [b], Solution Vector [x] */}
      {matrixA.length === 0 ? (
        <div className="rounded-lg border border-slate-800 bg-[#0B1220] p-4 text-slate-400 text-center">
          No unknown non-ground equations assembled yet. Add a voltage source, resistor, or closed circuit loop to inspect the MNA matrix [A] and RHS vector [b].
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[#24344D] bg-[#030712]">
          <table className="w-full text-[11px] font-mono border-collapse tabular-nums">
            <thead>
              <tr className="bg-slate-900 text-slate-300 border-b border-slate-800">
                <th className="p-2 text-left text-cyan-300 sticky left-0 bg-slate-900 border-r border-slate-800">
                  Eqn / Var
                </th>
                {labels.map((lbl, cIdx) => (
                  <th
                    key={cIdx}
                    className={`p-2 text-right whitespace-nowrap ${
                      cIdx < unknownNodesCount ? "text-cyan-300" : "text-purple-300"
                    }`}
                  >
                    {lbl}
                  </th>
                ))}
                <th className="p-2 text-right text-emerald-400 border-l border-slate-800 whitespace-nowrap">
                  Sol [x]
                </th>
                <th className="p-2 text-right text-amber-300 border-l border-slate-800 whitespace-nowrap">
                  RHS [b]
                </th>
                <th className="p-2 text-right text-slate-400 border-l border-slate-800 whitespace-nowrap">
                  ||Row||∞
                </th>
              </tr>
            </thead>
            <tbody>
              {matrixA.map((row, rIdx) => {
                const diag = rowAnalysis.diagnostics[rIdx];
                const rowHasIssue =
                  diag?.isZeroRow || diag?.isZeroDiagOnNodeRow || diag?.isNonFinite;
                const solVal = vectorX[rIdx];
                const rhsVal = vectorB[rIdx] ?? 0;

                return (
                  <tr
                    key={rIdx}
                    className={`border-b border-slate-800/60 ${
                      rowHasIssue ? "bg-rose-950/35" : "hover:bg-slate-900/40"
                    }`}
                  >
                    <td
                      className={`p-2 font-bold sticky left-0 border-r border-slate-800 whitespace-nowrap ${
                        rowHasIssue
                          ? "bg-rose-950/90 text-rose-300"
                          : rIdx < unknownNodesCount
                          ? "bg-[#070B14] text-cyan-300"
                          : "bg-[#070B14] text-purple-300"
                      }`}
                    >
                      {labels[rIdx]}
                    </td>
                    {row.map((val, cIdx) => {
                      const isDiag = rIdx === cIdx;
                      const isVsrcBlock =
                        rIdx >= unknownNodesCount || cIdx >= unknownNodesCount;
                      const isBadCell =
                        !Number.isFinite(val) ||
                        (isDiag && diag?.isZeroDiagOnNodeRow);

                      return (
                        <td
                          key={cIdx}
                          className={`p-2 text-right whitespace-nowrap ${
                            isBadCell
                              ? "bg-rose-500/20 text-rose-300 font-bold"
                              : isDiag
                              ? "bg-cyan-500/10 text-white font-semibold"
                              : isVsrcBlock && Math.abs(val) > 0
                              ? "text-purple-300 font-semibold"
                              : Math.abs(val) < 1e-15
                              ? "text-slate-600"
                              : "text-slate-300"
                          }`}
                        >
                          {formatCell(val)}
                        </td>
                      );
                    })}
                    <td className="p-2 text-right font-bold border-l border-slate-800 whitespace-nowrap text-emerald-400">
                      {vectorX.length > rIdx && Number.isFinite(solVal)
                        ? formatCell(solVal)
                        : "—"}
                    </td>
                    <td className="p-2 text-right font-bold border-l border-slate-800 whitespace-nowrap text-amber-300">
                      {formatCell(rhsVal)}
                    </td>
                    <td
                      className={`p-2 text-right border-l border-slate-800 whitespace-nowrap ${
                        diag?.isZeroRow ? "text-rose-400 font-bold" : "text-slate-400"
                      }`}
                    >
                      {diag ? formatCell(diag.rowInfNorm) : "0"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Newton-Raphson / Homotopy Iteration Convergence Trace */}
      {convergence && convergence.iterationHistory.length > 0 && (
        <div className="space-y-2 pt-1">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-300">
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              Newton-Raphson &amp; Homotopy Step Trace ({convergence.iterationHistory.length} steps)
            </span>
          </div>
          <div className="overflow-x-auto max-h-44 rounded-lg border border-slate-800 bg-[#030712]">
            <table className="w-full text-[11px] font-mono border-collapse tabular-nums">
              <thead>
                <tr className="bg-slate-900 text-slate-400 border-b border-slate-800 sticky top-0">
                  <th className="py-1.5 px-2.5 text-left">Iter</th>
                  <th className="py-1.5 px-2.5 text-left">Homotopy Stage</th>
                  <th className="py-1.5 px-2.5 text-right">Gmin (S)</th>
                  <th className="py-1.5 px-2.5 text-right">Source %</th>
                  <th className="py-1.5 px-2.5 text-right">||ΔV||∞ (V)</th>
                  <th className="py-1.5 px-2.5 text-right">||A·x - b||∞ (A)</th>
                </tr>
              </thead>
              <tbody>
                {convergence.iterationHistory.slice(-25).map((step, i) => (
                  <tr key={i} className="border-b border-slate-800/50 text-slate-300">
                    <td className="py-1 px-2.5 text-slate-400">#{step.iteration}</td>
                    <td className="py-1 px-2.5 text-cyan-300">
                      {step.stage ?? "DIRECT_NR"}
                    </td>
                    <td className="py-1 px-2.5 text-right text-purple-300">
                      {(step.gminSiemens ?? convergence.gminSimens).toExponential(1)}
                    </td>
                    <td className="py-1 px-2.5 text-right text-amber-300">
                      {((step.sourceScale ?? 1) * 100).toFixed(0)}%
                    </td>
                    <td className="py-1 px-2.5 text-right text-emerald-300">
                      {Number.isFinite(step.maxDeltaV) ? step.maxDeltaV.toExponential(2) : "—"}
                    </td>
                    <td className="py-1 px-2.5 text-right text-slate-200">
                      {Number.isFinite(step.kclNormA)
                        ? step.kclNormA.toExponential(2)
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
