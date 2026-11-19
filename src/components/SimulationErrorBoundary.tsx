import React from "react";
import { AlertTriangle, AlertCircle, RotateCcw, RefreshCw, ShieldAlert } from "lucide-react";
import { MnaSimulationError } from "../utils/simulationEngine";

export interface SimulationDiagnosticEntry {
  code?: string;
  message: string;
  severity?: "ERROR" | "WARNING";
}

export interface SimulationErrorBoundaryProps {
  children: React.ReactNode;
  /** Optional non-throwing solver failure reason (e.g. mnaSolution.abortedReason) */
  abortedReason?: string | null;
  /** Optional structured MNA/netlist validation errors */
  validationErrors?: SimulationDiagnosticEntry[];
  /** Explicit solver convergence flag; defaults to true when omitted */
  converged?: boolean;
  /** Optional title context (e.g. "MNA Circuit Solver", "Series/Parallel Bench") */
  contextLabel?: string;
  /** If true, hides children completely during fatal solver failure instead of showing banner above children */
  blockChildrenOnDiagnostic?: boolean;
  /** Optional callback to reset the active circuit to a valid default state */
  onResetCircuit?: () => void;
  /** Optional callback triggered when the user clicks Retry */
  onRetry?: () => void;
}

interface SimulationErrorBoundaryState {
  caughtError: Error | null;
}

interface ClassifiedMnaFailure {
  category:
    | "SINGULAR_MATRIX"
    | "MISSING_GROUND_REFERENCE"
    | "VOLTAGE_SOURCE_LOOP"
    | "INVALID_VALUE"
    | "NON_CONVERGENT"
    | "UNKNOWN";
  headline: string;
  explanation: string;
  remediation: string[];
  rawMessages: string[];
}

function classifyMnaFailure(
  caughtError: Error | null,
  abortedReason?: string | null,
  validationErrors?: SimulationDiagnosticEntry[],
  converged?: boolean
): ClassifiedMnaFailure | null {
  const errItems = (validationErrors || []).filter(
    (e) => !e.severity || e.severity === "ERROR"
  );
  const hasExplicitFailure =
    Boolean(caughtError) ||
    Boolean(abortedReason) ||
    converged === false ||
    errItems.length > 0;

  if (!hasExplicitFailure) return null;

  if (caughtError instanceof MnaSimulationError) {
    return {
      category:
        caughtError.code === "EMPTY_CIRCUIT" || caughtError.code === "INVALID_COMPONENT"
          ? "INVALID_VALUE"
          : caughtError.code,
      headline: caughtError.title,
      explanation: caughtError.message,
      remediation: caughtError.remediation,
      rawMessages: [caughtError.message],
    };
  }

  const rawMessages: string[] = [];
  if (caughtError?.message) rawMessages.push(caughtError.message);
  if (abortedReason && !rawMessages.includes(abortedReason)) {
    rawMessages.push(abortedReason);
  }
  for (const item of errItems) {
    if (item.message && !rawMessages.includes(item.message)) {
      rawMessages.push(item.message);
    }
  }

  const codes = new Set(errItems.map((e) => (e.code || "").toUpperCase()));
  const combinedText = rawMessages.join(" ").toLowerCase();

  if (
    codes.has("MISSING_GROUND") ||
    codes.has("MISSING_GROUND_REFERENCE") ||
    combinedText.includes("missing ground") ||
    combinedText.includes("no ground") ||
    combinedText.includes("gnd node")
  ) {
    return {
      category: "MISSING_GROUND_REFERENCE",
      headline: "Missing Ground Reference (0 V)",
      explanation:
        "Modified Nodal Analysis requires at least one Ground (GND / 0 V) reference node so all node potentials are uniquely defined.",
      remediation: [
        "Place a GND component on the schematic canvas.",
        "Connect the negative return terminal of your primary voltage or current source to GND.",
        "Verify ground return wires are not open or broken by an open switch.",
      ],
      rawMessages,
    };
  }

  if (
    codes.has("VOLTAGE_SOURCE_LOOP") ||
    codes.has("VOLTAGE_SOURCE_SHORT") ||
    combinedText.includes("shorted") ||
    combinedText.includes("voltage source loop") ||
    combinedText.includes("parallel voltage")
  ) {
    return {
      category: "VOLTAGE_SOURCE_LOOP",
      headline: "Singular Matrix — Shorted or Conflicting Voltage Source",
      explanation:
        "An ideal voltage source is shorted directly across its own terminals or wired in parallel with another ideal voltage source, creating conflicting KVL constraints.",
      remediation: [
        "Remove any wire directly shorting a voltage source's (+) and (-) terminals.",
        "Insert a series resistance if combining multiple voltage sources onto the same node.",
        "Check that closed switches do not bypass an active supply rail directly to GND.",
      ],
      rawMessages,
    };
  }

  if (
    codes.has("SINGULAR_MATRIX") ||
    codes.has("FLOATING_NODE") ||
    codes.has("NO_GROUND_PATH") ||
    combinedText.includes("singular") ||
    combinedText.includes("floating") ||
    combinedText.includes("pivot") ||
    combinedText.includes("zero row") ||
    combinedText.includes("unconstrained")
  ) {
    return {
      category: "SINGULAR_MATRIX",
      headline: "Singular Matrix (Floating or Disconnected Node)",
      explanation:
        "The MNA conductance matrix is singular and cannot be inverted via Gaussian elimination because one or more circuit nodes lack a closed DC path to Ground.",
      remediation: [
        "Check every highlighted or newly placed component to ensure both terminals are wired into a closed loop.",
        "Verify no isolated islands or dangling resistor/capacitor pins exist without a return path to GND.",
        "If testing purely capacitive/AC branches, add a high-value bleed resistor (e.g. 1 MΩ) to Ground.",
      ],
      rawMessages,
    };
  }

  if (
    codes.has("INVALID_VALUE") ||
    codes.has("INVALID_SIM_PARAMS") ||
    combinedText.includes("non-positive") ||
    combinedText.includes("invalid resistance") ||
    combinedText.includes("invalid capacitance") ||
    combinedText.includes("invalid inductance")
  ) {
    return {
      category: "INVALID_VALUE",
      headline: "Invalid Component or Simulation Parameter",
      explanation:
        "One or more components have zero, negative, or non-finite values that violate physical constitutive equations.",
      remediation: [
        "Ensure all resistors (R > 0 Ω), capacitors (C > 0 F), and inductors (L > 0 H) are strictly positive.",
        "Check that sweep start/stop frequencies and transient time steps satisfy dt > 0 and tStop > tStart.",
      ],
      rawMessages,
    };
  }

  if (
    codes.has("NON_CONVERGENT") ||
    converged === false ||
    combinedText.includes("converge") ||
    combinedText.includes("newton")
  ) {
    return {
      category: "NON_CONVERGENT",
      headline: "Nonlinear Solver Convergence Failure",
      explanation:
        "The Newton-Raphson solver could not reach a self-consistent operating point within the maximum iteration budget.",
      remediation: [
        "Verify diode, Zener, and transistor polarity and check biasing resistor values.",
        "Ensure semiconductor gates/bases have a defined DC bias path rather than floating open.",
      ],
      rawMessages,
    };
  }

  return {
    category: "UNKNOWN",
    headline: "Simulation Engine Error",
    explanation:
      rawMessages[0] ||
      "An unexpected error occurred while assembling or solving the circuit's MNA equations.",
    remediation: [
      "Verify component values and schematic wire connections.",
      "Click Retry or Restore Default Circuit to recover cleanly.",
    ],
    rawMessages,
  };
}

export class SimulationErrorBoundary extends React.Component<
  SimulationErrorBoundaryProps,
  SimulationErrorBoundaryState
> {
  constructor(props: SimulationErrorBoundaryProps) {
    super(props);
    this.state = { caughtError: null };
  }

  static getDerivedStateFromError(error: Error): SimulationErrorBoundaryState {
    return { caughtError: error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error("[SimulationErrorBoundary] Caught MNA/simulation error:", error, info.componentStack);
  }

  private handleRetry = () => {
    this.setState({ caughtError: null });
    this.props.onRetry?.();
  };

  private renderDiagnosticPanel(failure: ClassifiedMnaFailure, isFatalThrow: boolean) {
    const isSingular =
      failure.category === "SINGULAR_MATRIX" ||
      failure.category === "VOLTAGE_SOURCE_LOOP";
    const isMissingGround = failure.category === "MISSING_GROUND_REFERENCE";

    return (
      <div
        role="alert"
        data-testid="simulation-error-boundary"
        data-error-category={failure.category}
        className="rounded-xl border border-rose-500/55 bg-rose-950/85 p-4 font-mono text-xs text-rose-100 shadow-lg space-y-3"
      >
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            {isSingular || isMissingGround ? (
              <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            )}
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold text-rose-200">
                  {failure.headline}
                </span>
                {this.props.contextLabel && (
                  <span className="px-2 py-0.5 rounded bg-rose-900/80 border border-rose-500/40 text-[10px] text-rose-200">
                    {this.props.contextLabel}
                  </span>
                )}
              </div>
              <p className="text-rose-200/90 leading-relaxed">{failure.explanation}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isFatalThrow && (
              <button
                type="button"
                onClick={this.handleRetry}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-400 text-slate-950 font-bold text-[11px] cursor-pointer transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry Simulation
              </button>
            )}
            {this.props.onResetCircuit && (
              <button
                type="button"
                onClick={this.props.onResetCircuit}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-rose-400/40 text-rose-200 font-bold text-[11px] cursor-pointer transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Circuit
              </button>
            )}
          </div>
        </div>

        {failure.rawMessages.length > 0 && (
          <div className="rounded-lg bg-slate-950/80 border border-rose-500/30 p-2.5 space-y-1 text-[11px] text-rose-300">
            {failure.rawMessages.map((msg, idx) => (
              <div key={idx} className="flex items-start gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                <span>{msg}</span>
              </div>
            ))}
          </div>
        )}

        <div className="border-t border-rose-500/25 pt-2.5">
          <div className="text-[10px] uppercase tracking-wider font-bold text-amber-300 mb-1">
            Recommended Fixes
          </div>
          <ul className="space-y-1 text-[11px] text-slate-200 list-disc list-inside">
            {failure.remediation.map((step, idx) => (
              <li key={idx}>{step}</li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  render(): React.ReactNode {
    const {
      caughtError,
    } = this.state;
    const {
      children,
      abortedReason,
      validationErrors,
      converged,
      blockChildrenOnDiagnostic = false,
    } = this.props;

    const failure = classifyMnaFailure(
      caughtError,
      abortedReason,
      validationErrors,
      converged
    );

    if (caughtError && failure) {
      return this.renderDiagnosticPanel(failure, true);
    }

    if (failure) {
      return (
        <div className="space-y-3">
          {this.renderDiagnosticPanel(failure, false)}
          {!blockChildrenOnDiagnostic && children}
        </div>
      );
    }

    return children;
  }
}

export default SimulationErrorBoundary;
