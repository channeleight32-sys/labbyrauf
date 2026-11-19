import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Activity,
  X,
  Minimize2,
  Maximize2,
  Play,
  Pause,
  Trash2,
  StepForward,
  Sparkles,
  Crosshair,
  GripHorizontal,
  Layers,
  Eye,
  RotateCcw,
  Zap,
  Download,
  Check,
} from "lucide-react";

export interface ProbeChannelSpec {
  channelId: "CH1" | "CH2" | "CH3" | "CH4";
  label: string;
  color: string;
  bgTint: string;
  borderTint: string;
  textTint: string;
}

export const PROBE_CHANNELS: ProbeChannelSpec[] = [
  {
    channelId: "CH1",
    label: "CH1 Probe",
    color: "#fbbf24",
    bgTint: "rgba(251, 191, 36, 0.15)",
    borderTint: "rgba(251, 191, 36, 0.55)",
    textTint: "#fde68a",
  },
  {
    channelId: "CH2",
    label: "CH2 Probe",
    color: "#38bdf8",
    bgTint: "rgba(56, 189, 248, 0.15)",
    borderTint: "rgba(56, 189, 248, 0.55)",
    textTint: "#bae6fd",
  },
  {
    channelId: "CH3",
    label: "CH3 Probe",
    color: "#10b981",
    bgTint: "rgba(16, 185, 129, 0.15)",
    borderTint: "rgba(16, 185, 129, 0.55)",
    textTint: "#a7f3d0",
  },
  {
    channelId: "CH4",
    label: "CH4 Probe",
    color: "#f472b6",
    bgTint: "rgba(244, 114, 182, 0.15)",
    borderTint: "rgba(244, 114, 182, 0.55)",
    textTint: "#fbcfe8",
  },
];

export interface AttachedWireProbe {
  channelId: "CH1" | "CH2" | "CH3" | "CH4";
  wireId: number;
  /** Normalized position along the wire [0.2 .. 0.8] */
  tPos?: number;
}

export type WaveformSignalType =
  | "AUTO"
  | "AC_SINE"
  | "HALF_RECTIFIED"
  | "FULL_RECTIFIED"
  | "FILTERED_DC"
  | "DC"
  | "DIGITAL"
  | "PULSE"
  | "RC_TRANSIENT"
  | "TRIANGLE"
  | "PWM";

export interface ProbedWireSignal {
  channelId: "CH1" | "CH2" | "CH3" | "CH4";
  wireId: number;
  netName: string;
  sourceLabel: string;
  targetLabel: string;
  color: string;
  /** Instantaneous value: in digital mode 0 or 1 (mapped to 0V / 5V), in analog mode voltage in Volts */
  currentVoltage: number;
  /** Optional branch current in mA for analog mode */
  currentMa?: number;
  /** Optional logic level 0 or 1 for digital mode */
  logicLevel?: 0 | 1;
  /** Real-time tri-state logic classification (High / Low / High-Z Floating) */
  logicState?: "HIGH" | "LOW" | "Z";
  /** True when probed net is floating / high impedance */
  isFloating?: boolean;
  /** Optional propagation delay in ns for digital mode */
  delayNs?: number;
  /** Historical step samples (from circuit simulator history) */
  stepSamples?: number[];
  /** Waveform classification for dynamic oscilloscope simulation */
  waveformType?: WaveformSignalType;
  peakVoltage?: number;
  frequencyHz?: number;
  phaseOffsetRad?: number;
  rmsVoltage?: number;
  dcVoltage?: number;
  rippleVoltage?: number;
}

interface SvgWireProbeClipProps {
  x: number;
  y: number;
  channelId: "CH1" | "CH2" | "CH3" | "CH4";
  color: string;
  netLabel: string;
  valueLabel: string;
  logicState?: "HIGH" | "LOW" | "Z";
  isHighlighted?: boolean;
  onHoverChange?: (hovered: boolean) => void;
  onRemove: () => void;
  onStartReDrag?: (
    channelId: "CH1" | "CH2" | "CH3" | "CH4",
    e: React.PointerEvent<SVGGElement>
  ) => void;
  onOpenPopup?: () => void;
}

/**
 * Renders an authentic Oscilloscope Probe tip + high-contrast telemetry flag directly on a schematic wire
 */
export const SvgWireProbeClip: React.FC<SvgWireProbeClipProps> = ({
  x,
  y,
  channelId,
  color,
  netLabel,
  valueLabel,
  logicState,
  isHighlighted = false,
  onHoverChange,
  onRemove,
  onStartReDrag,
  onOpenPopup,
}) => {
  const badgeText = `${channelId}: ${valueLabel}`;
  const subText =
    netLabel.length > 18 ? netLabel.slice(0, 17) + "…" : netLabel;
  const boxW = Math.max(108, Math.max(badgeText.length, subText.length) * 6.3 + 30);
  const boxH = 34;
  const activeColor = logicState === "Z" ? "#f59e0b" : color;

  return (
    <g
      className="cursor-grab active:cursor-grabbing select-none"
      onPointerEnter={() => onHoverChange?.(true)}
      onPointerLeave={() => onHoverChange?.(false)}
      onPointerDown={(e) => {
        e.stopPropagation();
        if (onStartReDrag) {
          onStartReDrag(channelId, e);
        }
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        if (onOpenPopup) onOpenPopup();
      }}
    >
      {/* Highlight halo when hovered in HUD or on schematic */}
      {isHighlighted && (
        <circle
          cx={x}
          cy={y}
          r={15}
          fill={activeColor}
          opacity={0.28}
          stroke={activeColor}
          strokeWidth={1.5}
          filter={`drop-shadow(0 0 8px ${activeColor})`}
        />
      )}
      {/* Pulsing outer contact halo on the wire */}
      <circle
        cx={x}
        cy={y}
        r={9}
        fill={activeColor}
        opacity={isHighlighted ? 0.42 : 0.22}
      />
      {/* Metallic probe hook ring on wire */}
      <circle
        cx={x}
        cy={y}
        r={5}
        fill="#090d16"
        stroke={activeColor}
        strokeWidth={2.5}
      />
      <circle cx={x} cy={y} r={2} fill={activeColor} />

      {/* Angled coaxial probe needle & barrel */}
      <line
        x1={x}
        y1={y}
        x2={x + 14}
        y2={y - 22}
        stroke={color}
        strokeWidth={2.4}
        strokeLinecap="round"
      />
      <polygon
        points={`${x + 9},${y - 16} ${x + 19},${y - 28} ${x + 25},${y - 24} ${
          x + 14
        },${y - 12}`}
        fill="#1e293b"
        stroke={color}
        strokeWidth={1.5}
      />

      {/* Floating Probe Callout Flag */}
      <g transform={`translate(${x + 16}, ${y - 54})`}>
        <rect
          x={0}
          y={0}
          width={boxW}
          height={boxH}
          rx={7}
          fill="#090d16"
          stroke={color}
          strokeWidth={1.8}
          opacity={0.96}
        />
        {/* Left color stripe */}
        <rect
          x={2.5}
          y={3}
          width={4}
          height={boxH - 6}
          rx={2}
          fill={color}
        />
        {/* Top line: CHx + Live Value */}
        <text
          x={11}
          y={13.5}
          fill="#f8fafc"
          style={{
            fontSize: "10.5px",
            fontFamily: "JetBrains Mono, monospace",
            fontWeight: 700,
          }}
        >
          {badgeText}
        </text>
        {/* Bottom line: Net name */}
        <text
          x={11}
          y={26.5}
          fill={color}
          style={{
            fontSize: "9px",
            fontFamily: "JetBrains Mono, monospace",
            fontWeight: 600,
          }}
        >
          {subText}
        </text>

        {/* Detach Probe '×' button */}
        <g
          className="cursor-pointer"
          onPointerDown={(e) => {
            e.stopPropagation();
          }}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          <rect
            x={boxW - 19}
            y={4}
            width={15}
            height={15}
            rx={4}
            fill="#1e293b"
            stroke="#475569"
            strokeWidth={1}
          />
          <text
            x={boxW - 11.5}
            y={14.5}
            textAnchor="middle"
            fill="#f87171"
            style={{
              fontSize: "11px",
              fontFamily: "JetBrains Mono, monospace",
              fontWeight: 700,
            }}
          >
            ×
          </text>
        </g>
      </g>
    </g>
  );
};

export interface OscilloscopeProbeDockProps {
  attachedProbes: AttachedWireProbe[];
  probeToolActive?: "CH1" | "CH2" | "CH3" | "CH4" | null;
  activeProbeTool?: "CH1" | "CH2" | "CH3" | "CH4" | null;
  onSelectProbeTool: (ch: "CH1" | "CH2" | "CH3" | "CH4" | null) => void;
  onRemoveProbe?: (ch: "CH1" | "CH2" | "CH3" | "CH4") => void;
  onClearAllProbes?: () => void;
  onAutoProbeWires: () => void;
  isPopupOpen: boolean;
  onTogglePopup?: () => void;
  onOpenPopup?: () => void;
  totalWiresCount?: number;
}

/**
 * Interactive Oscilloscope Probe Rack allowing users to drag CH1-CH4 probes onto any wire
 * or click a probe to clip it onto wires, plus toggle the pop-up waveform window.
 */
export const OscilloscopeProbeDock: React.FC<OscilloscopeProbeDockProps> = ({
  attachedProbes,
  probeToolActive,
  activeProbeTool,
  onSelectProbeTool,
  onRemoveProbe,
  onClearAllProbes,
  onAutoProbeWires,
  isPopupOpen,
  onTogglePopup,
  onOpenPopup,
  totalWiresCount,
}) => {
  const currentActiveTool =
    activeProbeTool !== undefined ? activeProbeTool : probeToolActive;
  const handleToggle = onTogglePopup || onOpenPopup || (() => {});
  return (
    <div className="bg-gradient-to-r from-[#0b1120] via-[#111827] to-[#0b1120] border border-cyan-500/35 rounded-xl px-4 py-3 shadow-md">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/40 flex items-center justify-center shrink-0">
            <Crosshair className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono uppercase tracking-wider font-bold text-white">
                Virtual Oscilloscope Wire Probes (Drag onto Any Wire)
              </span>
              <span className="px-2 py-0.5 rounded bg-cyan-500/15 border border-cyan-500/30 text-[10px] font-mono text-cyan-300 font-semibold">
                {attachedProbes.length} / 4 Clipped
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Drag any probe (<strong className="text-amber-300">CH1</strong>–
              <strong className="text-pink-300">CH4</strong>) onto a schematic
              wire — or select a probe and click a wire — to plot live signal
              waveforms in a pop-up oscilloscope window.
            </p>
          </div>
        </div>

        {/* 4 Draggable Channel Probes */}
        <div className="flex flex-wrap items-center gap-2">
          {PROBE_CHANNELS.map((spec) => {
            const attached = attachedProbes.find(
              (p) => p.channelId === spec.channelId
            );
            const isSelectedTool = currentActiveTool === spec.channelId;

            return (
              <div
                key={spec.channelId}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData(
                    "text/plain",
                    `PROBE:${spec.channelId}`
                  );
                  e.dataTransfer.effectAllowed = "copyMove";
                }}
                onClick={() =>
                  onSelectProbeTool(
                    isSelectedTool ? null : spec.channelId
                  )
                }
                style={{
                  borderColor:
                    isSelectedTool || attached
                      ? spec.color
                      : "rgba(51, 65, 85, 0.9)",
                  backgroundColor: isSelectedTool
                    ? spec.bgTint
                    : attached
                    ? "rgba(15, 23, 42, 0.95)"
                    : "rgba(15, 23, 42, 0.75)",
                }}
                className="group relative inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono transition-all cursor-grab active:cursor-grabbing select-none"
                title={`Drag ${spec.channelId} onto any wire on the schematic canvas, or click to arm ${spec.channelId} and click a wire`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{
                    backgroundColor: spec.color,
                    boxShadow:
                      attached || isSelectedTool
                        ? `0 0 8px ${spec.color}`
                        : "none",
                  }}
                />
                <span
                  className="font-bold"
                  style={{ color: attached || isSelectedTool ? "#fff" : spec.textTint }}
                >
                  {spec.channelId}
                </span>
                <span className="text-[10px] text-slate-400">
                  {attached
                    ? `Wire #${attached.wireId}`
                    : isSelectedTool
                    ? "Click Wire..."
                    : "Drag to Wire"}
                </span>
                {attached && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onRemoveProbe) onRemoveProbe(spec.channelId);
                    }}
                    className="ml-0.5 text-slate-400 hover:text-rose-400 cursor-pointer"
                    title={`Unclip ${spec.channelId}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}

          {/* Quick Auto-Clip & Pop-Up Controls */}
          <div className="flex items-center gap-1.5 pl-1 border-l border-slate-800">
            <button
              type="button"
              disabled={totalWiresCount !== undefined && totalWiresCount === 0}
              onClick={onAutoProbeWires}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono font-semibold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 disabled:opacity-40 transition-colors cursor-pointer"
              title="Automatically clip probes onto up to 4 circuit wires and launch the Pop-Up Oscilloscope"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              Auto-Probe Wires
            </button>

            <button
              type="button"
              onClick={handleToggle}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold border transition-colors cursor-pointer ${
                isPopupOpen
                  ? "bg-cyan-500/20 border-cyan-400 text-cyan-200"
                  : "bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-200"
              }`}
            >
              <Eye className="w-3.5 h-3.5 text-cyan-400" />
              {isPopupOpen ? "Scope Pop-Up: OPEN" : "Open Scope Pop-Up"}
            </button>

            {attachedProbes.length > 0 && (
              <button
                type="button"
                onClick={onClearAllProbes}
                className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-mono text-rose-300 bg-rose-950/40 hover:bg-rose-900/50 border border-rose-500/30 transition-colors cursor-pointer"
                title="Unclip all wire probes"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

interface WireProbePopupWindowProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: "digital" | "analog" | "auto";
  circuitTitle: string;
  probedSignals: ProbedWireSignal[];
  onRemoveProbe: (channelId: "CH1" | "CH2" | "CH3" | "CH4") => void;
  onClearAllProbes: () => void;
  onAutoProbeWires: () => void;
  /** Optional simulator callbacks for Digital mode */
  onStepClock?: () => void;
  onRunPatternSweep?: () => void;
  clockHz?: number;
}

export const WireProbePopupWindow: React.FC<WireProbePopupWindowProps> = ({
  isOpen,
  onClose,
  mode = "auto",
  circuitTitle,
  probedSignals,
  onRemoveProbe,
  onClearAllProbes,
  onAutoProbeWires,
  onStepClock,
  onRunPatternSweep,
  clockHz = 2,
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [position, setPosition] = useState<{ x: number; y: number }>({
    x: 36,
    y: 78,
  });
  const [isRunningLive, setIsRunningLive] = useState(true);
  const [displayMode, setDisplayMode] = useState<"stacked" | "overlaid">(
    "stacked"
  );
  const [activeScopeMode, setActiveScopeMode] = useState<"auto" | "analog" | "digital">(
    mode
  );
  useEffect(() => {
    setActiveScopeMode(mode);
  }, [mode]);

  const [analogSignalStyle, setAnalogSignalStyle] = useState<
    | "auto"
    | "half_rectified"
    | "full_rectified"
    | "ac_sine"
    | "filtered_dc"
    | "transient_history"
    | "pwm_chopper"
    | "rc_transient"
  >("auto");
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [timebaseZoom, setTimebaseZoom] = useState<1 | 2 | 4>(1);
  // Manual / Auto voltage scaling per division (e.g. 1V, 2V, 2.5V, 5V, or auto)
  const [manualVoltsPerDiv, setManualVoltsPerDiv] = useState<number | null>(null);
  const [autoScaleNotice, setAutoScaleNotice] = useState<string | null>(null);

  // Interactive Horizontal (V1 & V2) and Vertical (T1 & T2) Oscilloscope Cursors
  const [showTimeMarkers, setShowTimeMarkers] = useState<boolean>(true);
  const [cursorDisplayMode, setCursorDisplayMode] = useState<"ALL" | "TIME" | "VOLTAGE">("ALL");
  const [markerT1Ratio, setMarkerT1Ratio] = useState<number>(0.22); // [0 .. 1]
  const [markerT2Ratio, setMarkerT2Ratio] = useState<number>(0.58); // [0 .. 1]
  const [markerV1Ratio, setMarkerV1Ratio] = useState<number>(0.84); // [0 .. 1] (~4.2V)
  const [markerV2Ratio, setMarkerV2Ratio] = useState<number>(0.16); // [0 .. 1] (~0.8V)
  const [draggingMarker, setDraggingMarker] = useState<"T1" | "T2" | "V1" | "V2" | null>(null);

  // Configurable Grid Overlay
  const [scopeGridStyle, setScopeGridStyle] = useState<"full" | "crosshair" | "dotted" | "none">("full");
  const [scopeGridPhosphor, setScopeGridPhosphor] = useState<"cyan" | "green" | "amber" | "slate">("cyan");

  // Rolling real-time buffer of 64 time slices for each channel
  const [rollingSeries, setRollingSeries] = useState<
    {
      tick: number;
      values: Record<string, number>;
    }[]
  >([]);

  const latestSignalsRef = useRef<ProbedWireSignal[]>(probedSignals);
  useEffect(() => {
    latestSignalsRef.current = probedSignals;
  }, [probedSignals]);

  // Whenever probedSignals change (e.g., user toggles a switch, changes resistor slider, or clips a new probe),
  // immediately append a sample so the user sees instant response even if paused
  useEffect(() => {
    if (probedSignals.length === 0) return;
    setRollingSeries((prev) => {
      const nextTick = prev.length > 0 ? prev[prev.length - 1].tick + 1 : 1;
      const values: Record<string, number> = {};
      for (const sig of probedSignals) {
        values[sig.channelId] = sig.currentVoltage;
      }
      return [...prev, { tick: nextTick, values }].slice(-64);
    });
  }, [probedSignals]);

  const [cursorChannelIdx, setCursorChannelIdx] = useState<number>(0);

  const isSigDigitalMode = (sig: ProbedWireSignal): boolean => {
    if (activeScopeMode === "digital") return true;
    if (activeScopeMode === "analog") return false;
    return (
      sig.waveformType === "DIGITAL" ||
      (sig.logicLevel !== undefined && !sig.waveformType) ||
      (mode === "digital" && !sig.waveformType)
    );
  };

  const isEffectiveDigital = useMemo(() => {
    if (activeScopeMode === "digital") return true;
    if (activeScopeMode === "analog") return false;
    if (mode === "digital") return true;
    return (
      probedSignals.length > 0 &&
      probedSignals.every(
        (s) =>
          s.waveformType === "DIGITAL" ||
          (s.logicLevel !== undefined && !s.waveformType)
      )
    );
  }, [activeScopeMode, mode, probedSignals]);

  // Continuous real-time oscilloscope sweep timer (15 FPS smooth rolling trace)
  useEffect(() => {
    if (!isOpen || !isRunningLive) return;
    const interval = window.setInterval(() => {
      const currentSigs = latestSignalsRef.current;
      if (currentSigs.length === 0) return;

      setRollingSeries((prev) => {
        const nextTick = prev.length > 0 ? prev[prev.length - 1].tick + 1 : 1;
        const values: Record<string, number> = {};

        currentSigs.forEach((sig) => {
          const isDig = isSigDigitalMode(sig);

          if (isDig) {
            values[sig.channelId] = sig.currentVoltage;
            return;
          }

          if (sig.isFloating) {
            values[sig.channelId] = 0.0;
            return;
          }

          // Primary path: use real physics-solved MNA transient waveform samples
          if (sig.stepSamples && sig.stepSamples.length > 1) {
            const sampleIdx = nextTick % sig.stepSamples.length;
            values[sig.channelId] = sig.stepSamples[sampleIdx] ?? sig.currentVoltage;
            return;
          }

          // Fallback steady-state DC voltage from MNA node solution (no fake sinusoidal synthesis)
          values[sig.channelId] = Number.isFinite(sig.currentVoltage) ? sig.currentVoltage : 0.0;
        });

        return [...prev, { tick: nextTick, values }].slice(-64);
      });
    }, 70);

    return () => clearInterval(interval);
  }, [isOpen, isRunningLive, activeScopeMode, analogSignalStyle]);

  const [csvExportSuccess, setCsvExportSuccess] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  useEffect(() => {
    if (rollingSeries.length > 0 && probedSignals.length > 0) {
      setExportNotice(null);
    }
  }, [rollingSeries.length, probedSignals.length]);

  // Export captured probe waveform data as CSV for external analysis
  const handleExportCsv = () => {
    const activeSeries =
      plottedSeries.length > 0 ? plottedSeries : rollingSeries;
    if (activeSeries.length === 0 || probedSignals.length === 0) {
      setExportNotice(
        "No waveform data captured yet. Connect probes to schematic wires to collect trace samples before exporting CSV."
      );
      return;
    }
    setExportNotice(null);

    const exportModeLabel = isEffectiveDigital ? "DIGITAL" : "ANALOG";
    const lines: string[] = [];

    // Clean Row-1 CSV Column Headers for direct Excel / MATLAB import
    const headerCols = [
      "Simulation_Step",
      "Timestamp_ns",
      "Time_ms",
      ...probedSignals.flatMap((s) => [
        `${s.channelId}_Net`,
        `${s.channelId}_LogicState`,
        `${s.channelId}_Voltage_V`,
      ]),
    ];
    lines.push(headerCols.join(","));

    const nsPerStep = isEffectiveDigital ? 10 : 1000000;
    const msPerStep = isEffectiveDigital ? 0.00001 : 1.0;

    for (const sample of activeSeries) {
      const step = sample.tick;
      const t_ns = step * nsPerStep;
      const t_ms = (step * msPerStep).toFixed(4);
      const row: (string | number)[] = [step, t_ns, t_ms];

      for (const sig of probedSignals) {
        const v = sample.values[sig.channelId] ?? sig.currentVoltage ?? 0;
        const logicState = v >= 2.5 ? 1 : 0;
        row.push(`"${(sig.netName || `Wire #${sig.wireId}`).replace(/"/g, '""')}"`);
        row.push(logicState);
        row.push(v.toFixed(3));
      }
      lines.push(row.join(","));
    }

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `oscilloscope_probes_${exportModeLabel.toLowerCase()}_${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setCsvExportSuccess(true);
    setTimeout(() => setCsvExportSuccess(false), 2500);
  };

  // Dragging the pop-up window by its title bar
  const handleTitlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button")) return;
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const origX = position.x;
    const origY = position.y;

    const onMove = (ev: PointerEvent) => {
      const maxX = Math.max(20, window.innerWidth - 360);
      const maxY = Math.max(20, window.innerHeight - 120);
      setPosition({
        x: Math.max(12, Math.min(maxX, origX + (ev.clientX - startX))),
        y: Math.max(12, Math.min(maxY, origY + (ev.clientY - startY))),
      });
    };

    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  // Build unified waveform sample array for plotting
  const plottedSeries = useMemo(() => {
    const windowPoints = Math.max(12, Math.floor(48 / timebaseZoom));

    // When solver transient samples are present (analog or digital sweep), allow direct inspection when paused
    if (
      (!isRunningLive || rollingSeries.length < 4) &&
      probedSignals.some((s) => (s.stepSamples?.length ?? 0) > 1)
    ) {
      const len = Math.max(
        ...probedSignals.map((s) => s.stepSamples?.length ?? 0),
        1
      );
      const pts: { tick: number; values: Record<string, number> }[] = [];
      for (let i = 0; i < len; i++) {
        const values: Record<string, number> = {};
        for (const s of probedSignals) {
          const arr = s.stepSamples || [];
          values[s.channelId] = arr[i] ?? s.currentVoltage;
        }
        pts.push({ tick: i + 1, values });
      }
      return pts.slice(-windowPoints);
    }

    return rollingSeries.slice(-windowPoints);
  }, [rollingSeries, timebaseZoom, isEffectiveDigital, isRunningLive, probedSignals]);

  const maxAbsV = Math.max(
    5,
    ...probedSignals.map((s) => Math.abs(s.currentVoltage) * 1.25),
    ...plottedSeries.flatMap((pt) =>
      Object.values(pt.values).map((v) => Math.abs(v) * 1.2)
    )
  );

  const svgW = 640;
  const laneH =
    displayMode === "stacked" && probedSignals.length > 0
      ? Math.max(66, Math.min(86, 260 / probedSignals.length))
      : 220;
  const svgH =
    displayMode === "stacked" && probedSignals.length > 0
      ? probedSignals.length * laneH + 28
      : 248;

  const voltageScale = useMemo(() => {
    if (probedSignals.length === 0) {
      return { yTop: 28, yBot: 212, minV: -5, maxV: 5, refSigIdx: 0 };
    }
    if (displayMode === "overlaid") {
      if (isEffectiveDigital) {
        return { yTop: 40, yBot: 200, minV: 0, maxV: 5, refSigIdx: 0 };
      }
      return { yTop: 28, yBot: 212, minV: -maxAbsV, maxV: maxAbsV, refSigIdx: 0 };
    }
    const refIdx = Math.max(0, Math.min(cursorChannelIdx, probedSignals.length - 1));
    const sig = probedSignals[refIdx];
    const topY = 10 + refIdx * laneH;
    const highY = topY + 14;
    const lowY = topY + laneH - 16;
    const midY = (highY + lowY) / 2;
    const isSigDig =
      activeScopeMode === "digital" ||
      (activeScopeMode === "auto" &&
        (sig.waveformType === "DIGITAL" ||
          (sig.logicLevel !== undefined && !sig.waveformType) ||
          (mode === "digital" && !sig.waveformType)));

    if (isSigDig) {
      return { yTop: highY, yBot: lowY, minV: 0, maxV: 5, refSigIdx: refIdx };
    }
    const localMax = Math.max(
      1.0,
      sig.peakVoltage ?? 5,
      Math.abs(sig.currentVoltage) * 1.3,
      ...plottedSeries.map((p) => Math.abs(p.values[sig.channelId] ?? 0))
    );
    const halfSpan = (lowY - highY) * 0.48;
    return {
      yTop: midY - halfSpan,
      yBot: midY + halfSpan,
      minV: -localMax,
      maxV: localMax,
      refSigIdx: refIdx,
    };
  }, [
    probedSignals,
    displayMode,
    isEffectiveDigital,
    maxAbsV,
    cursorChannelIdx,
    laneH,
    activeScopeMode,
    mode,
    plottedSeries,
  ]);

  if (!isOpen) return null;

  const popupWidthClass = isExpanded
    ? "w-[92vw] max-w-[980px]"
    : "w-[92vw] max-w-[680px]";

  const v1Volts = voltageScale.minV + markerV1Ratio * (voltageScale.maxV - voltageScale.minV);
  const v2Volts = voltageScale.minV + markerV2Ratio * (voltageScale.maxV - voltageScale.minV);
  const snapVoltagePair = (targetV1: number, targetV2: number) => {
    const span = Math.max(0.001, voltageScale.maxV - voltageScale.minV);
    setMarkerV1Ratio(Math.max(0, Math.min(1, (targetV1 - voltageScale.minV) / span)));
    setMarkerV2Ratio(Math.max(0, Math.min(1, (targetV2 - voltageScale.minV) / span)));
  };

  // Quick Auto-Scale: Automatically adjusts the timebase zoom and voltage per division to fit the displayed waveform
  const handleQuickAutoScale = () => {
    if (probedSignals.length === 0) return;

    // 1. Analyze signal amplitudes across channels
    let maxObservedV = 1.0;
    let minObservedV = 0.0;
    for (const sig of probedSignals) {
      if (sig.peakVoltage && sig.peakVoltage > maxObservedV) {
        maxObservedV = sig.peakVoltage;
      }
      if (Math.abs(sig.currentVoltage) > maxObservedV) {
        maxObservedV = Math.abs(sig.currentVoltage);
      }
      for (const pt of plottedSeries) {
        const v = pt.values[sig.channelId];
        if (typeof v === "number") {
          if (v > maxObservedV) maxObservedV = v;
          if (v < minObservedV) minObservedV = v;
        }
      }
    }

    // 2. Select optimal voltage per division
    let chosenVoltsPerDiv = 2.5;
    if (maxObservedV <= 1.2) {
      chosenVoltsPerDiv = 0.5;
    } else if (maxObservedV <= 2.8) {
      chosenVoltsPerDiv = 1.0;
    } else if (maxObservedV <= 6.0) {
      chosenVoltsPerDiv = 2.5;
    } else if (maxObservedV <= 14.0) {
      chosenVoltsPerDiv = 5.0;
    } else {
      chosenVoltsPerDiv = 10.0;
    }
    setManualVoltsPerDiv(chosenVoltsPerDiv);

    // 3. Select optimal timebase zoom to display 2-4 cycles cleanly
    let chosenZoom: 1 | 2 | 4 = 1;
    const isHighFreq = probedSignals.some((s) => (s.frequencyHz ?? 0) > 200);
    const isLowFreq = probedSignals.some((s) => (s.frequencyHz ?? 0) < 15);

    if (isHighFreq) {
      chosenZoom = 4;
    } else if (isLowFreq) {
      chosenZoom = 1;
    } else {
      chosenZoom = 2;
    }
    setTimebaseZoom(chosenZoom);

    // 4. Align measurement cursors to waveform bounds
    const span = Math.max(0.1, voltageScale.maxV - voltageScale.minV);
    const targetVHigh = Math.min(voltageScale.maxV, Math.max(2.0, maxObservedV * 0.95));
    const targetVLow = Math.max(voltageScale.minV, Math.min(0.8, minObservedV * 0.95));
    setMarkerV1Ratio(Math.max(0.1, Math.min(0.95, (targetVHigh - voltageScale.minV) / span)));
    setMarkerV2Ratio(Math.max(0.05, Math.min(0.9, (targetVLow - voltageScale.minV) / span)));
    setMarkerT1Ratio(0.2);
    setMarkerT2Ratio(0.7);
    setShowTimeMarkers(true);

    const msg = `Auto-Scaled: ${chosenZoom}× timebase zoom · ${chosenVoltsPerDiv}V/div · Waveform fitted`;
    setAutoScaleNotice(msg);
    setTimeout(() => {
      setAutoScaleNotice(null);
    }, 3000);
  };

  return (
    <div
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
      className={`fixed z-50 ${
        isMinimized ? "w-80" : popupWidthClass
      } bg-[#080C16]/95 backdrop-blur-md border-2 border-cyan-500/60 rounded-2xl shadow-[0_24px_70px_rgba(0,0,0,0.85)] overflow-hidden transition-[width] duration-150`}
      role="dialog"
      aria-label="Virtual Oscilloscope Wire Probe Pop-Up Window"
    >
      {/* Draggable Pop-Up Header Bar */}
      <div
        onPointerDown={handleTitlePointerDown}
        className="flex items-center justify-between gap-2 px-4 py-2.5 bg-gradient-to-r from-[#0f172a] via-[#131d36] to-[#0f172a] border-b border-slate-800 cursor-move select-none"
      >
        <div className="flex items-center gap-2 min-w-0">
          <GripHorizontal className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <div className="truncate">
            <span className="text-xs font-mono font-bold text-white tracking-wide">
              LIVE WIRE PROBE OSCILLOSCOPE
            </span>
            <span className="hidden sm:inline text-[11px] font-mono text-cyan-400 ml-2">
              [{circuitTitle}]
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-[10px] font-mono text-emerald-300">
            {probedSignals.length} Active{" "}
            {probedSignals.length === 1 ? "Probe" : "Probes"}
          </span>

          <button
            type="button"
            onClick={() => setIsMinimized((v) => !v)}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
            title={isMinimized ? "Restore Oscilloscope Window" : "Minimize"}
          >
            <Minimize2 className="w-3.5 h-3.5" />
          </button>

          {!isMinimized && (
            <button
              type="button"
              onClick={() => setIsExpanded((v) => !v)}
              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
              title={isExpanded ? "Compact Window Size" : "Expand Window Size"}
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-300 hover:text-white border border-rose-500/30 cursor-pointer"
            title="Close Pop-Up Window"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Minimized Summary Bar */}
      {isMinimized ? (
        <div className="p-3 flex items-center justify-between gap-2 text-xs font-mono bg-[#0b101e]">
          <div className="flex items-center gap-2 flex-wrap">
            {probedSignals.length === 0 ? (
              <span className="text-slate-400">No wire probes clipped</span>
            ) : (
              probedSignals.map((s) => (
                <span
                  key={s.channelId}
                  style={{ borderColor: s.color, color: s.color }}
                  className="px-2 py-0.5 rounded border bg-slate-950 font-bold"
                >
                  {s.channelId}: {s.currentVoltage.toFixed(1)}V
                </span>
              ))
            )}
          </div>
          <button
            type="button"
            onClick={() => setIsMinimized(false)}
            className="px-2.5 py-1 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold cursor-pointer"
          >
            Expand
          </button>
        </div>
      ) : (
        <div className="p-4 space-y-3.5 max-h-[82vh] overflow-y-auto">
          {/* Top Scope Acquisition & Trigger Controls */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900/90 border border-slate-800 rounded-xl px-3 py-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsRunningLive((v) => !v)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold border transition-colors cursor-pointer ${
                  isRunningLive
                    ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300"
                    : "bg-amber-500/20 border-amber-500/50 text-amber-300"
                }`}
              >
                {isRunningLive ? (
                  <>
                    <Pause className="w-3.5 h-3.5" />
                    LIVE ROLLING
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" />
                    HELD / PAUSED
                  </>
                )}
              </button>

              {/* Domain Mode Switcher: Auto, Analog, Digital */}
              <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5 text-[11px] font-mono">
                <button
                  type="button"
                  onClick={() => setActiveScopeMode("auto")}
                  className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                    activeScopeMode === "auto"
                      ? "bg-cyan-500/25 text-cyan-200 font-bold"
                      : "text-slate-400 hover:text-white"
                  }`}
                  title="Auto-detect analog vs digital logic waveforms per wire"
                >
                  Auto
                </button>
                <button
                  type="button"
                  onClick={() => setActiveScopeMode("analog")}
                  className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                    activeScopeMode === "analog"
                      ? "bg-cyan-500/25 text-cyan-200 font-bold"
                      : "text-slate-400 hover:text-white"
                  }`}
                  title="Continuous analog oscilloscope (AC, Rectifiers, DC, Filtered)"
                >
                  Analog / AC
                </button>
                <button
                  type="button"
                  onClick={() => setActiveScopeMode("digital")}
                  className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                    activeScopeMode === "digital"
                      ? "bg-cyan-500/25 text-cyan-200 font-bold"
                      : "text-slate-400 hover:text-white"
                  }`}
                  title="Digital logic levels (0 / 1 transitions)"
                >
                  Digital
                </button>
              </div>

              {activeScopeMode === "digital" && onStepClock && (
                <button
                  type="button"
                  onClick={onStepClock}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono font-semibold bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 cursor-pointer"
                >
                  <StepForward className="w-3.5 h-3.5" />
                  Step Clock
                </button>
              )}

              {activeScopeMode === "digital" && onRunPatternSweep && (
                <button
                  type="button"
                  onClick={onRunPatternSweep}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono font-semibold bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 cursor-pointer"
                >
                  <Activity className="w-3.5 h-3.5" />
                  Sweep Burst
                </button>
              )}

              {activeScopeMode !== "digital" && (
                <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg p-0.5 text-[11px] font-mono overflow-x-auto max-w-[340px] sm:max-w-none">
                  {[
                    { id: "auto", label: "Auto-Detect" },
                    { id: "half_rectified", label: "Half-Wave Rect" },
                    { id: "full_rectified", label: "Full-Wave Rect" },
                    { id: "ac_sine", label: "AC Sine" },
                    { id: "filtered_dc", label: "Filtered DC" },
                    { id: "transient_history", label: "DC Rail" },
                    { id: "rc_transient", label: "RC Exp" },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() =>
                        setAnalogSignalStyle(
                          item.id as typeof analogSignalStyle
                        )
                      }
                      className={`px-2 py-0.5 rounded transition-colors whitespace-nowrap cursor-pointer ${
                        analogSignalStyle === item.id
                          ? "bg-cyan-500/25 text-cyan-200 font-bold"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {/* Stacked vs Overlaid Display Toggle */}
              <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5 text-[11px] font-mono">
                <button
                  type="button"
                  onClick={() => setDisplayMode("stacked")}
                  className={`px-2 py-0.5 rounded cursor-pointer ${
                    displayMode === "stacked"
                      ? "bg-cyan-500/20 text-cyan-300 font-semibold"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Stacked
                </button>
                <button
                  type="button"
                  onClick={() => setDisplayMode("overlaid")}
                  className={`px-2 py-0.5 rounded cursor-pointer ${
                    displayMode === "overlaid"
                      ? "bg-cyan-500/20 text-cyan-300 font-semibold"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Overlaid
                </button>
              </div>

              {/* Quick Auto-Scale Button */}
              <button
                type="button"
                onClick={handleQuickAutoScale}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-gradient-to-r from-cyan-500/25 via-blue-500/25 to-indigo-500/25 hover:from-cyan-500/35 hover:to-indigo-500/35 text-cyan-200 border border-cyan-400/60 shadow-[0_0_10px_rgba(6,182,212,0.25)] transition-all cursor-pointer whitespace-nowrap active:scale-95"
                title="Quick Auto-Scale: Automatically adjusts the timebase and voltage per division to fit the displayed waveform"
              >
                <Maximize2 className="w-3.5 h-3.5 text-cyan-300 animate-pulse" />
                <span>Quick Auto-Scale</span>
              </button>

              {/* Timebase Zoom */}
              <div
                className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5 text-[11px] font-mono"
                title="Oscilloscope Horizontal Timebase Zoom"
              >
                <span className="text-[9px] text-slate-500 font-semibold px-1 uppercase">T:</span>
                {([1, 2, 4] as const).map((z) => (
                  <button
                    key={z}
                    type="button"
                    onClick={() => setTimebaseZoom(z)}
                    className={`px-1.5 py-0.5 rounded cursor-pointer ${
                      timebaseZoom === z
                        ? "bg-emerald-500/20 text-emerald-300 font-semibold"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {z}×
                  </button>
                ))}
              </div>

              {/* Vertical Volts per Division */}
              <div
                className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5 text-[11px] font-mono"
                title="Oscilloscope Vertical Voltage Scale (volts per division)"
              >
                <span className="text-[9px] text-slate-500 font-semibold px-1 uppercase">V:</span>
                {[0.5, 1, 2.5, 5].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setManualVoltsPerDiv(v)}
                    className={`px-1.5 py-0.5 rounded cursor-pointer ${
                      manualVoltsPerDiv === v
                        ? "bg-cyan-500/20 text-cyan-300 font-semibold"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {v}V
                  </button>
                ))}
                {manualVoltsPerDiv !== null && (
                  <button
                    type="button"
                    onClick={() => setManualVoltsPerDiv(null)}
                    className="px-1 text-[9px] text-slate-500 hover:text-white"
                    title="Reset to Auto Voltage Span"
                  >
                    ↺
                  </button>
                )}
              </div>

              {/* Export Waveforms CSV */}
              <button
                type="button"
                onClick={handleExportCsv}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-500/40 cursor-pointer transition-colors"
                title="Export captured waveform channels as CSV file with timestamp and logic state columns"
              >
                {csvExportSuccess ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Downloaded!</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5 text-cyan-300" />
                    <span>Download CSV</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setRollingSeries([])}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                title="Clear waveform buffer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {autoScaleNotice && (
            <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-cyan-950/70 border border-cyan-400/50 text-cyan-200 text-xs font-mono shadow-[0_0_12px_rgba(6,182,212,0.25)]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-cyan-300 animate-spin" />
                <span className="font-semibold">{autoScaleNotice}</span>
              </div>
              <button
                type="button"
                onClick={() => setAutoScaleNotice(null)}
                className="px-2 py-0.5 rounded bg-cyan-900/60 hover:bg-cyan-800 text-cyan-100 font-bold cursor-pointer shrink-0"
              >
                ×
              </button>
            </div>
          )}

          {exportNotice && (
            <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-amber-950/60 border border-amber-500/40 text-amber-200 text-xs font-mono">
              <span>{exportNotice}</span>
              <button
                type="button"
                onClick={() => setExportNotice(null)}
                className="px-2 py-0.5 rounded bg-amber-900/50 hover:bg-amber-800/70 text-amber-100 font-bold cursor-pointer shrink-0"
              >
                ×
              </button>
            </div>
          )}

          {/* Empty State if no probes are attached */}
          {probedSignals.length === 0 ? (
            <div className="bg-[#050811] border border-dashed border-slate-700 rounded-xl p-8 text-center space-y-3">
              <Crosshair className="w-8 h-8 text-cyan-400 mx-auto" />
              <div className="space-y-1">
                <h4 className="text-sm font-mono font-bold text-white">
                  No Oscilloscope Probes Clipped to Wires Yet
                </h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Drag any color-coded probe (
                  <strong className="text-amber-300">CH1</strong>,{" "}
                  <strong className="text-cyan-300">CH2</strong>,{" "}
                  <strong className="text-emerald-300">CH3</strong>,{" "}
                  <strong className="text-pink-300">CH4</strong>) from the probe
                  bar onto any wire in the circuit schematic, or click below to
                  auto-clip probes onto active wires.
                </p>
              </div>
              <button
                type="button"
                onClick={onAutoProbeWires}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-mono font-bold bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-400 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-cyan-300" />
                Auto-Clip Probes to Circuit Wires Now
              </button>
            </div>
          ) : (
            <>
              {/* Interactive Dual-Axis Measurement Cursors Bar (Horizontal Voltage & Vertical Time) */}
              <div className="bg-[#0b1324] border border-cyan-500/30 rounded-xl p-2.5 flex flex-col gap-2 text-xs font-mono">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                      <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
                      Dual Graticule Cursors:
                    </span>

                    {/* Time Cursors T1 & T2 */}
                    {(cursorDisplayMode === "ALL" || cursorDisplayMode === "TIME") && (
                      <>
                        <div className="flex items-center gap-1 bg-[#060a14] px-2 py-0.5 rounded-lg border border-amber-500/40">
                          <span className="w-2 h-2 rounded-full bg-amber-400" />
                          <span className="text-amber-300 font-bold">
                            T1: {(markerT1Ratio * (isEffectiveDigital ? Math.max(plottedSeries.length, 2) * 2.5 : 100)).toFixed(1)}{isEffectiveDigital ? "ns" : "ms"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 bg-[#060a14] px-2 py-0.5 rounded-lg border border-cyan-500/40">
                          <span className="w-2 h-2 rounded-full bg-cyan-400" />
                          <span className="text-cyan-300 font-bold">
                            T2: {(markerT2Ratio * (isEffectiveDigital ? Math.max(plottedSeries.length, 2) * 2.5 : 100)).toFixed(1)}{isEffectiveDigital ? "ns" : "ms"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 bg-emerald-950/70 px-2 py-0.5 rounded-lg border border-emerald-500/50 text-emerald-300 font-bold">
                          <Zap className="w-3 h-3 text-emerald-400" />
                          <span>
                            ΔT: {Math.abs((markerT2Ratio - markerT1Ratio) * (isEffectiveDigital ? Math.max(plottedSeries.length, 2) * 2.5 : 100)).toFixed(2)} {isEffectiveDigital ? "ns" : "ms"}
                          </span>
                        </div>
                      </>
                    )}

                    {/* Voltage Cursors V1 & V2 */}
                    {(cursorDisplayMode === "ALL" || cursorDisplayMode === "VOLTAGE") && (
                      <>
                        <div className="flex items-center gap-1 bg-[#060a14] px-2 py-0.5 rounded-lg border border-emerald-500/40">
                          <span className="w-2 h-2 rounded-full bg-emerald-400" />
                          <span className="text-emerald-300 font-bold">
                            V1: {v1Volts.toFixed(2)}V
                          </span>
                        </div>
                        <div className="flex items-center gap-1 bg-[#060a14] px-2 py-0.5 rounded-lg border border-fuchsia-500/40">
                          <span className="w-2 h-2 rounded-full bg-fuchsia-400" />
                          <span className="text-fuchsia-300 font-bold">
                            V2: {v2Volts.toFixed(2)}V
                          </span>
                        </div>
                        <div className="flex items-center gap-1 bg-purple-950/70 px-2 py-0.5 rounded-lg border border-purple-500/50 text-purple-200 font-bold">
                          <span>
                            ΔV: {Math.abs(v1Volts - v2Volts).toFixed(2)}V
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Actions & Preset Triggers */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {/* Cursor Mode Selector */}
                    <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-[10px]">
                      {(["ALL", "TIME", "VOLTAGE"] as const).map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setCursorDisplayMode(m)}
                          className={`px-2 py-0.5 rounded font-semibold transition-colors cursor-pointer ${
                            cursorDisplayMode === m
                              ? "bg-cyan-500/20 text-cyan-300 font-bold"
                              : "text-slate-400 hover:text-white"
                          }`}
                        >
                          {m === "ALL" ? "Both (H+V)" : m === "TIME" ? "Time (V)" : "Volt (H)"}
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (probedSignals.length >= 2 && plottedSeries.length >= 4) {
                          const chIn = probedSignals[0].channelId;
                          const chOut = probedSignals[1].channelId;
                          const n = plottedSeries.length;
                          let inIdx = Math.floor(n * 0.25);
                          for (let i = 1; i < n; i++) {
                            const vPrev = plottedSeries[i - 1].values[chIn] ?? 0;
                            const vCurr = plottedSeries[i].values[chIn] ?? 0;
                            if (Math.abs(vCurr - vPrev) > 1.5) {
                              inIdx = i;
                              break;
                            }
                          }
                          let outIdx = inIdx + 2;
                          for (let j = inIdx; j < n; j++) {
                            const vPrev = plottedSeries[j - 1]?.values[chOut] ?? 0;
                            const vCurr = plottedSeries[j]?.values[chOut] ?? 0;
                            if (Math.abs(vCurr - vPrev) > 1.5) {
                              outIdx = j;
                              break;
                            }
                          }
                          setMarkerT1Ratio(inIdx / Math.max(1, n - 1));
                          setMarkerT2Ratio(Math.min(1, outIdx / Math.max(1, n - 1)));
                          setShowTimeMarkers(true);
                        } else {
                          setMarkerT1Ratio(0.2);
                          setMarkerT2Ratio(0.5);
                          setShowTimeMarkers(true);
                        }
                      }}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-400 text-[10px] font-bold transition-colors cursor-pointer"
                      title="Automatically detect transition edges to measure delay"
                    >
                      <Sparkles className="w-3 h-3 text-cyan-300" />
                      Auto t_pd
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowTimeMarkers((v) => !v)}
                      className={`px-2 py-0.5 rounded-lg border text-[10px] transition-colors cursor-pointer ${
                        showTimeMarkers
                          ? "bg-slate-800 border-slate-700 text-slate-200 font-semibold"
                          : "bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300"
                      }`}
                    >
                      {showTimeMarkers ? "Hide Cursors" : "Show Cursors"}
                    </button>

                    {/* Graticule Grid Controls */}
                    <div className="h-4 w-px bg-slate-800" />
                    <div className="flex items-center gap-1 bg-slate-900/80 p-0.5 rounded-lg border border-slate-800">
                      <span className="text-[9px] text-slate-500 font-mono px-1">GRID:</span>
                      {(["full", "crosshair", "dotted", "none"] as const).map((style) => (
                        <button
                          key={style}
                          type="button"
                          onClick={() => setScopeGridStyle(style)}
                          className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-mono transition-colors cursor-pointer ${
                            scopeGridStyle === style
                              ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold"
                              : "text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          {style}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-1 bg-slate-900/80 p-0.5 rounded-lg border border-slate-800">
                      {(["cyan", "green", "amber", "slate"] as const).map((clr) => {
                        const bgMap = {
                          cyan: "bg-cyan-400",
                          green: "bg-emerald-400",
                          amber: "bg-amber-400",
                          slate: "bg-slate-300",
                        };
                        return (
                          <button
                            key={clr}
                            type="button"
                            onClick={() => setScopeGridPhosphor(clr)}
                            title={`Phosphor: ${clr}`}
                            className={`w-3.5 h-3.5 rounded-full ${bgMap[clr]} transition-all cursor-pointer ${
                              scopeGridPhosphor === clr
                                ? "ring-2 ring-white scale-110 shadow-sm"
                                : "opacity-40 hover:opacity-90"
                            }`}
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Quick Voltage Threshold Presets */}
                {showTimeMarkers && (cursorDisplayMode === "ALL" || cursorDisplayMode === "VOLTAGE") && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-800/80 text-[10px] text-slate-400">
                    {displayMode === "stacked" && probedSignals.length > 1 && (
                      <div className="flex items-center gap-1 mr-1">
                        <span className="text-slate-400">Lane:</span>
                        {probedSignals.map((sig, idx) => (
                          <button
                            key={sig.channelId}
                            type="button"
                            onClick={() => setCursorChannelIdx(idx)}
                            className={`px-1.5 py-0.5 rounded font-bold cursor-pointer border ${
                              voltageScale.refSigIdx === idx
                                ? "bg-slate-800 text-white border-slate-500"
                                : "bg-slate-950 text-slate-400 border-slate-800"
                            }`}
                          >
                            {sig.channelId}
                          </button>
                        ))}
                      </div>
                    )}
                    <span className="font-semibold text-slate-300">Snap Voltage Cursors:</span>
                    <button
                      type="button"
                      onClick={() => snapVoltagePair(5.0, 0.0)}
                      className="px-1.5 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-cyan-300 cursor-pointer"
                    >
                      5.0V / 0.0V (Full Swing)
                    </button>
                    <button
                      type="button"
                      onClick={() => snapVoltagePair(3.3, 0.0)}
                      className="px-1.5 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-emerald-300 cursor-pointer"
                    >
                      3.3V / 0.0V (LVTTL)
                    </button>
                    <button
                      type="button"
                      onClick={() => snapVoltagePair(2.0, 0.8)}
                      className="px-1.5 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-amber-300 cursor-pointer"
                    >
                      TTL Thresholds (V_IH=2.0V, V_IL=0.8V)
                    </button>
                    <button
                      type="button"
                      onClick={() => snapVoltagePair(3.5, 1.5)}
                      className="px-1.5 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-purple-300 cursor-pointer"
                    >
                      CMOS 5V (3.5V / 1.5V)
                    </button>
                  </div>
                )}
              </div>

              {/* SVG Multi-Channel Real-Time Oscilloscope CRT Graticule */}
              <div className="relative bg-[#04070f] border border-slate-800 rounded-xl overflow-hidden">
                {(() => {
                  const padL = 118;
                  const padR = 18;
                  const plotW = svgW - padL - padR;
                  const numPts = Math.max(plottedSeries.length, 2);

                  return (
                    <svg
                      viewBox={`0 0 ${svgW} ${svgH}`}
                      className="w-full h-auto block select-none"
                      onPointerMove={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const relX =
                          ((e.clientX - rect.left) / rect.width) * svgW - padL;
                        const relY =
                          ((e.clientY - rect.top) / rect.height) * svgH;

                        if (draggingMarker === "T1") {
                          setMarkerT1Ratio(Math.max(0, Math.min(1, relX / plotW)));
                          return;
                        }
                        if (draggingMarker === "T2") {
                          setMarkerT2Ratio(Math.max(0, Math.min(1, relX / plotW)));
                          return;
                        }
                        if (draggingMarker === "V1") {
                          const vRatio = Math.max(
                            0,
                            Math.min(
                              1,
                              1 - (relY - voltageScale.yTop) / Math.max(1, voltageScale.yBot - voltageScale.yTop)
                            )
                          );
                          setMarkerV1Ratio(vRatio);
                          return;
                        }
                        if (draggingMarker === "V2") {
                          const vRatio = Math.max(
                            0,
                            Math.min(
                              1,
                              1 - (relY - voltageScale.yTop) / Math.max(1, voltageScale.yBot - voltageScale.yTop)
                            )
                          );
                          setMarkerV2Ratio(vRatio);
                          return;
                        }

                        if (relX < 0 || relX > plotW) {
                          setHoverIdx(null);
                          return;
                        }
                        const idx = Math.min(
                          plottedSeries.length - 1,
                          Math.max(
                            0,
                            Math.round(
                              (relX / plotW) *
                                Math.max(1, plottedSeries.length - 1)
                            )
                          )
                        );
                        setHoverIdx(idx);
                      }}
                      onPointerUp={() => setDraggingMarker(null)}
                      onPointerLeave={() => {
                        setHoverIdx(null);
                        setDraggingMarker(null);
                      }}
                    >
                      <defs>
                        {/* Phosphor specific strokes */}
                        {(() => {
                          const phosphorColor =
                            scopeGridPhosphor === "cyan"
                              ? "#06b6d4"
                              : scopeGridPhosphor === "green"
                              ? "#10b981"
                              : scopeGridPhosphor === "amber"
                              ? "#f59e0b"
                              : "#94a3b8";

                          return (
                            <>
                              <pattern
                                id="popup-scope-grid-full"
                                width="32"
                                height="24"
                                patternUnits="userSpaceOnUse"
                              >
                                <path
                                  d="M 32 0 L 0 0 0 24"
                                  fill="none"
                                  stroke={phosphorColor}
                                  strokeOpacity="0.20"
                                  strokeWidth="1"
                                />
                                <line
                                  x1="0"
                                  y1="12"
                                  x2="32"
                                  y2="12"
                                  stroke={phosphorColor}
                                  strokeOpacity="0.08"
                                  strokeDasharray="2 2"
                                  strokeWidth="0.8"
                                />
                                <line
                                  x1="16"
                                  y1="0"
                                  x2="16"
                                  y2="24"
                                  stroke={phosphorColor}
                                  strokeOpacity="0.08"
                                  strokeDasharray="2 2"
                                  strokeWidth="0.8"
                                />
                              </pattern>

                              <pattern
                                id="popup-scope-grid-dotted"
                                width="16"
                                height="16"
                                patternUnits="userSpaceOnUse"
                              >
                                <circle
                                  cx="8"
                                  cy="8"
                                  r="0.8"
                                  fill={phosphorColor}
                                  fillOpacity="0.25"
                                />
                              </pattern>
                            </>
                          );
                        })()}
                      </defs>

                      {/* Graticule Background Layer */}
                      {scopeGridStyle === "full" ? (
                        <rect
                          x={padL}
                          y={8}
                          width={plotW}
                          height={svgH - 24}
                          fill="url(#popup-scope-grid-full)"
                          stroke={
                            scopeGridPhosphor === "cyan"
                              ? "#083344"
                              : scopeGridPhosphor === "green"
                              ? "#064e3b"
                              : scopeGridPhosphor === "amber"
                              ? "#451a03"
                              : "#1e293b"
                          }
                          strokeWidth={1.5}
                        />
                      ) : scopeGridStyle === "dotted" ? (
                        <rect
                          x={padL}
                          y={8}
                          width={plotW}
                          height={svgH - 24}
                          fill="url(#popup-scope-grid-dotted)"
                          stroke="#1e293b"
                          strokeWidth={1}
                        />
                      ) : (
                        <rect
                          x={padL}
                          y={8}
                          width={plotW}
                          height={svgH - 24}
                          fill="#050a14"
                          stroke="#1e293b"
                          strokeWidth={1}
                        />
                      )}

                      {/* Crosshair Center Reticle with 0.2 div ticks */}
                      {(scopeGridStyle === "crosshair" || scopeGridStyle === "full") && (() => {
                        const centerX = padL + plotW / 2;
                        const centerY = 8 + (svgH - 24) / 2;
                        const pClr =
                          scopeGridPhosphor === "cyan"
                            ? "#06b6d4"
                            : scopeGridPhosphor === "green"
                            ? "#10b981"
                            : scopeGridPhosphor === "amber"
                            ? "#f59e0b"
                            : "#94a3b8";

                        return (
                          <g opacity={scopeGridStyle === "crosshair" ? 0.85 : 0.45}>
                            <line
                              x1={padL}
                              y1={centerY}
                              x2={padL + plotW}
                              y2={centerY}
                              stroke={pClr}
                              strokeWidth={1.2}
                            />
                            <line
                              x1={centerX}
                              y1={8}
                              x2={centerX}
                              y2={svgH - 16}
                              stroke={pClr}
                              strokeWidth={1.2}
                            />
                            {/* Graduation ticks along horizontal center line */}
                            {Array.from({ length: 21 }).map((_, i) => {
                              const tickX = padL + (i / 20) * plotW;
                              const isMajor = i % 5 === 0;
                              return (
                                <line
                                  key={`h-tick-${i}`}
                                  x1={tickX}
                                  y1={centerY - (isMajor ? 4 : 2)}
                                  x2={tickX}
                                  y2={centerY + (isMajor ? 4 : 2)}
                                  stroke={pClr}
                                  strokeWidth={isMajor ? 1 : 0.75}
                                />
                              );
                            })}
                            {/* Graduation ticks along vertical center line */}
                            {Array.from({ length: 11 }).map((_, j) => {
                              const tickY = 8 + (j / 10) * (svgH - 24);
                              const isMajor = j % 5 === 0;
                              return (
                                <line
                                  key={`v-tick-${j}`}
                                  x1={centerX - (isMajor ? 4 : 2)}
                                  y1={tickY}
                                  x2={centerX + (isMajor ? 4 : 2)}
                                  y2={tickY}
                                  stroke={pClr}
                                  strokeWidth={isMajor ? 1 : 0.75}
                                />
                              );
                            })}
                          </g>
                        );
                      })()}

                      {displayMode === "stacked" ? (
                        probedSignals.map((sig, sIdx) => {
                          const topY = 10 + sIdx * laneH;
                          const highY = topY + 14;
                          const lowY = topY + laneH - 16;
                          const midY = (highY + lowY) / 2;

                          const isSigDigital = isSigDigitalMode(sig);

                          const localMax = isSigDigital
                            ? 5
                            : Math.max(
                                1.0,
                                sig.peakVoltage ?? 5,
                                Math.abs(sig.currentVoltage) * 1.3,
                                ...plottedSeries.map((p) =>
                                  Math.abs(p.values[sig.channelId] ?? 0)
                                )
                              );

                          // Build SVG path (stepped digital wave for digital mode, smooth trace for analog)
                          let pathD = "";
                          let areaD = "";

                          plottedSeries.forEach((pt, idx) => {
                            const x =
                              padL +
                              (idx / Math.max(1, numPts - 1)) * plotW;
                            const rawV =
                              pt.values[sig.channelId] ?? sig.currentVoltage;
                            const y = isSigDigital
                              ? rawV >= 2.5
                                ? highY
                                : lowY
                              : midY -
                                (rawV / Math.max(0.1, localMax)) *
                                  ((lowY - highY) * 0.48);

                            if (idx === 0) {
                              pathD = `M ${x.toFixed(1)},${y.toFixed(1)}`;
                              areaD = `M ${x.toFixed(1)},${lowY.toFixed(
                                1
                              )} L ${x.toFixed(1)},${y.toFixed(1)}`;
                            } else {
                              if (isSigDigital) {
                                const prevRawV =
                                  plottedSeries[idx - 1].values[
                                    sig.channelId
                                  ] ?? sig.currentVoltage;
                                const prevY =
                                  prevRawV >= 2.5 ? highY : lowY;
                                pathD += ` L ${x.toFixed(1)},${prevY.toFixed(
                                  1
                                )} L ${x.toFixed(1)},${y.toFixed(1)}`;
                                areaD += ` L ${x.toFixed(1)},${prevY.toFixed(
                                  1
                                )} L ${x.toFixed(1)},${y.toFixed(1)}`;
                              } else {
                                pathD += ` L ${x.toFixed(1)},${y.toFixed(1)}`;
                                areaD += ` L ${x.toFixed(1)},${y.toFixed(1)}`;
                              }
                            }
                            if (idx === plottedSeries.length - 1) {
                              areaD += ` L ${x.toFixed(1)},${lowY.toFixed(
                                1
                              )} Z`;
                            }
                          });

                          return (
                            <g key={sig.channelId}>
                              {/* Lane divider */}
                              {sIdx > 0 && (
                                <line
                                  x1={0}
                                  y1={topY}
                                  x2={svgW}
                                  y2={topY}
                                  stroke="#1e293b"
                                  strokeDasharray="3 3"
                                />
                              )}

                              {/* Left Channel Header Label */}
                              <g
                                className="cursor-pointer"
                                onClick={() => setCursorChannelIdx(sIdx)}
                              >
                              <rect
                                x={6}
                                y={topY + 6}
                                width={padL - 14}
                                height={laneH - 12}
                                rx={6}
                                fill="#0b1324"
                                stroke={sig.color}
                                strokeWidth={voltageScale.refSigIdx === sIdx ? 2 : 1.2}
                              />
                              <text
                                x={13}
                                y={topY + 20}
                                fill={sig.color}
                                style={{
                                  fontSize: "10.5px",
                                  fontFamily: "JetBrains Mono, monospace",
                                  fontWeight: 700,
                                }}
                              >
                                {sig.channelId} · W#{sig.wireId}
                              </text>
                              <text
                                x={13}
                                y={topY + 33}
                                fill="#cbd5e1"
                                style={{
                                  fontSize: "9px",
                                  fontFamily: "JetBrains Mono, monospace",
                                }}
                              >
                                {sig.waveformType === "HALF_RECTIFIED"
                                  ? "Half-Wave Rect"
                                  : sig.waveformType === "FULL_RECTIFIED"
                                  ? "Full-Wave Rect"
                                  : sig.waveformType === "AC_SINE"
                                  ? "AC Sine 50Hz"
                                  : sig.netName.length > 13
                                  ? sig.netName.slice(0, 12) + "…"
                                  : sig.netName}
                              </text>
                              <text
                                x={13}
                                y={topY + 47}
                                fill="#f8fafc"
                                style={{
                                  fontSize: "10px",
                                  fontFamily: "JetBrains Mono, monospace",
                                  fontWeight: 700,
                                }}
                              >
                                {isSigDigital
                                  ? `${
                                      sig.currentVoltage >= 2.5 ? "HI" : "LO"
                                    } (${sig.currentVoltage.toFixed(1)}V)`
                                  : sig.waveformType === "HALF_RECTIFIED"
                                  ? `Pk: ${(sig.peakVoltage ?? sig.currentVoltage).toFixed(2)}V`
                                  : `${sig.currentVoltage.toFixed(2)}V`}
                              </text>

                              </g>
                              {/* Zero / Reference Line */}
                              <line
                                x1={padL}
                                y1={isSigDigital ? lowY : midY}
                                x2={svgW - padR}
                                y2={isSigDigital ? lowY : midY}
                                stroke={isSigDigital ? "#1e293b" : "#334155"}
                                strokeDasharray={isSigDigital ? undefined : "3 3"}
                                strokeWidth={1}
                              />

                              {/* Shaded Fill under Trace */}
                              {areaD && (
                                <path
                                  d={areaD}
                                  fill={sig.color}
                                  opacity={isSigDigital ? 0.12 : 0.08}
                                />
                              )}

                              {/* Main Signal Waveform Path */}
                              {pathD && (
                                <path
                                  d={pathD}
                                  fill="none"
                                  stroke={sig.color}
                                  strokeWidth={2.4}
                                  strokeLinejoin="round"
                                />
                              )}
                            </g>
                          );
                        })
                      ) : (
                        /* Overlaid Multi-Channel Mode */
                        <g>
                          <line
                            x1={padL}
                            y1={isEffectiveDigital ? 200 : 120}
                            x2={svgW - padR}
                            y2={isEffectiveDigital ? 200 : 120}
                            stroke="#334155"
                            strokeDasharray="4 4"
                          />
                          <text
                            x={padL - 8}
                            y={isEffectiveDigital ? 44 : 24}
                            textAnchor="end"
                            fill="#94a3b8"
                            style={{
                              fontSize: "9.5px",
                              fontFamily: "JetBrains Mono, monospace",
                            }}
                          >
                            {isEffectiveDigital ? "5.0V (HI)" : `+${maxAbsV.toFixed(1)}V`}
                          </text>
                          <text
                            x={padL - 8}
                            y={123}
                            textAnchor="end"
                            fill="#94a3b8"
                            style={{
                              fontSize: "9.5px",
                              fontFamily: "JetBrains Mono, monospace",
                            }}
                          >
                            {isEffectiveDigital ? "2.5V" : "0.0V"}
                          </text>
                          <text
                            x={padL - 8}
                            y={isEffectiveDigital ? 203 : 218}
                            textAnchor="end"
                            fill="#94a3b8"
                            style={{
                              fontSize: "9.5px",
                              fontFamily: "JetBrains Mono, monospace",
                            }}
                          >
                            {isEffectiveDigital ? "0.0V (LO)" : `-${maxAbsV.toFixed(1)}V`}
                          </text>

                          {probedSignals.map((sig, sIdx) => {
                            let pathD = "";
                            const isSigDigital = isSigDigitalMode(sig);

                            plottedSeries.forEach((pt, idx) => {
                              const x =
                                padL +
                                (idx / Math.max(1, numPts - 1)) * plotW;
                              const rawV =
                                pt.values[sig.channelId] ?? sig.currentVoltage;
                              const y = isSigDigital
                                ? rawV >= 2.5
                                  ? 40
                                  : 200
                                : 120 -
                                  (rawV / Math.max(0.1, maxAbsV)) * 92 -
                                  sIdx * 1.5;
                              if (idx === 0) {
                                pathD = `M ${x.toFixed(1)},${y.toFixed(1)}`;
                              } else if (isSigDigital) {
                                const prevRawV =
                                  plottedSeries[idx - 1].values[
                                    sig.channelId
                                  ] ?? sig.currentVoltage;
                                const prevY =
                                  prevRawV >= 2.5 ? 40 : 200;
                                pathD += ` L ${x.toFixed(1)},${prevY.toFixed(
                                  1
                                )} L ${x.toFixed(1)},${y.toFixed(1)}`;
                              } else {
                                pathD += ` L ${x.toFixed(1)},${y.toFixed(1)}`;
                              }
                            });
                            return (
                              <path
                                key={sig.channelId}
                                d={pathD}
                                fill="none"
                                stroke={sig.color}
                                strokeWidth={2.4}
                              />
                            );
                          })}
                        </g>
                      )}

                      {/* Hover Vertical Measurement Cursor */}
                      {hoverIdx !== null && plottedSeries[hoverIdx] && (
                        <g>
                          {(() => {
                            const cx =
                              padL +
                              (hoverIdx / Math.max(1, numPts - 1)) * plotW;
                            return (
                              <>
                                <line
                                  x1={cx}
                                  y1={8}
                                  x2={cx}
                                  y2={svgH - 16}
                                  stroke="#f8fafc"
                                  strokeWidth={1.2}
                                  strokeDasharray="3 3"
                                />
                                <text
                                  x={Math.min(svgW - 70, Math.max(padL + 4, cx + 6))}
                                  y={svgH - 4}
                                  fill="#38bdf8"
                                  style={{
                                    fontSize: "9.5px",
                                    fontFamily: "JetBrains Mono, monospace",
                                    fontWeight: 700,
                                  }}
                                >
                                  Sample #{plottedSeries[hoverIdx].tick}
                                </text>
                              </>
                            );
                          })()}
                        </g>
                      )}

                      {/* Interactive Draggable Oscilloscope Cursors (Horizontal V1/V2 & Vertical T1/T2) */}
                      {showTimeMarkers && (
                        <g className="select-none">
                          {/* Vertical Time Markers T1 and T2 */}
                          {(cursorDisplayMode === "ALL" || cursorDisplayMode === "TIME") &&
                            (() => {
                              const x1 = padL + markerT1Ratio * plotW;
                              const x2 = padL + markerT2Ratio * plotW;
                              const minX = Math.min(x1, x2);
                              const spanW = Math.abs(x2 - x1);

                              return (
                                <g>
                                  {/* Shaded ΔT Region */}
                                  <rect
                                    x={minX}
                                    y={8}
                                    width={spanW}
                                    height={svgH - 24}
                                    fill="#f59e0b"
                                    fillOpacity={0.08}
                                    pointerEvents="none"
                                  />

                                  {/* Marker T1 (Amber) */}
                                  <line
                                    x1={x1}
                                    y1={8}
                                    x2={x1}
                                    y2={svgH - 16}
                                    stroke="#f59e0b"
                                    strokeWidth={2}
                                    strokeDasharray="4 2"
                                  />
                                  <g
                                    className="cursor-ew-resize"
                                    onPointerDown={(e) => {
                                      e.stopPropagation();
                                      setDraggingMarker("T1");
                                    }}
                                  >
                                    <polygon
                                      points={`${x1 - 9},8 ${x1 + 9},8 ${x1 + 9},18 ${x1},26 ${x1 - 9},18`}
                                      fill="#f59e0b"
                                      stroke="#78350f"
                                      strokeWidth={1}
                                    />
                                    <text
                                      x={x1}
                                      y={16}
                                      textAnchor="middle"
                                      fill="#000"
                                      fontSize="9"
                                      fontFamily="JetBrains Mono, monospace"
                                      fontWeight="800"
                                    >
                                      T1
                                    </text>
                                  </g>

                                  {/* Marker T2 (Cyan) */}
                                  <line
                                    x1={x2}
                                    y1={8}
                                    x2={x2}
                                    y2={svgH - 16}
                                    stroke="#06b6d4"
                                    strokeWidth={2}
                                    strokeDasharray="4 2"
                                  />
                                  <g
                                    className="cursor-ew-resize"
                                    onPointerDown={(e) => {
                                      e.stopPropagation();
                                      setDraggingMarker("T2");
                                    }}
                                  >
                                    <polygon
                                      points={`${x2 - 9},8 ${x2 + 9},8 ${x2 + 9},18 ${x2},26 ${x2 - 9},18`}
                                      fill="#06b6d4"
                                      stroke="#164e63"
                                      strokeWidth={1}
                                    />
                                    <text
                                      x={x2}
                                      y={16}
                                      textAnchor="middle"
                                      fill="#000"
                                      fontSize="9"
                                      fontFamily="JetBrains Mono, monospace"
                                      fontWeight="800"
                                    >
                                      T2
                                    </text>
                                  </g>
                                </g>
                              );
                            })()}

                          {/* Horizontal Voltage Markers V1 and V2 */}
                          {(cursorDisplayMode === "ALL" || cursorDisplayMode === "VOLTAGE") &&
                            (() => {
                              const yV1 =
                                voltageScale.yTop +
                                (1 - markerV1Ratio) * (voltageScale.yBot - voltageScale.yTop);
                              const yV2 =
                                voltageScale.yTop +
                                (1 - markerV2Ratio) * (voltageScale.yBot - voltageScale.yTop);
                              const minY = Math.min(yV1, yV2);
                              const spanH = Math.abs(yV2 - yV1);
                              const v1Val = v1Volts;
                              const v2Val = v2Volts;

                              return (
                                <g>
                                  {/* Shaded ΔV Voltage Window */}
                                  <rect
                                    x={padL}
                                    y={minY}
                                    width={plotW}
                                    height={spanH}
                                    fill="#10b981"
                                    fillOpacity={0.07}
                                    pointerEvents="none"
                                  />

                                  {/* Horizontal Voltage Cursor V1 (Emerald) */}
                                  <line
                                    x1={padL}
                                    y1={yV1}
                                    x2={padL + plotW}
                                    y2={yV1}
                                    stroke="#10b981"
                                    strokeWidth={2}
                                    strokeDasharray="5 3"
                                  />
                                  {/* Draggable V1 Left Handle Tab */}
                                  <g
                                    className="cursor-ns-resize"
                                    onPointerDown={(e) => {
                                      e.stopPropagation();
                                      setDraggingMarker("V1");
                                    }}
                                  >
                                    <polygon
                                      points={`${padL - 2},${yV1} ${padL - 10},${yV1 - 8} ${padL - 34},${yV1 - 8} ${padL - 34},${yV1 + 8} ${padL - 10},${yV1 + 8}`}
                                      fill="#10b981"
                                      stroke="#064e3b"
                                      strokeWidth={1}
                                    />
                                    <text
                                      x={padL - 21}
                                      y={yV1 + 3}
                                      textAnchor="middle"
                                      fill="#000"
                                      fontSize="8.5"
                                      fontFamily="JetBrains Mono, monospace"
                                      fontWeight="900"
                                    >
                                      V1
                                    </text>
                                  </g>
                                  {/* V1 Value Tag on Right */}
                                  <text
                                    x={padL + plotW - 4}
                                    y={yV1 - 4}
                                    textAnchor="end"
                                    fill="#34d399"
                                    fontSize="8.5"
                                    fontFamily="JetBrains Mono, monospace"
                                    fontWeight="700"
                                  >
                                    {v1Val.toFixed(2)}V
                                  </text>

                                  {/* Horizontal Voltage Cursor V2 (Fuchsia) */}
                                  <line
                                    x1={padL}
                                    y1={yV2}
                                    x2={padL + plotW}
                                    y2={yV2}
                                    stroke="#e879f9"
                                    strokeWidth={2}
                                    strokeDasharray="5 3"
                                  />
                                  {/* Draggable V2 Left Handle Tab */}
                                  <g
                                    className="cursor-ns-resize"
                                    onPointerDown={(e) => {
                                      e.stopPropagation();
                                      setDraggingMarker("V2");
                                    }}
                                  >
                                    <polygon
                                      points={`${padL - 2},${yV2} ${padL - 10},${yV2 - 8} ${padL - 34},${yV2 - 8} ${padL - 34},${yV2 + 8} ${padL - 10},${yV2 + 8}`}
                                      fill="#e879f9"
                                      stroke="#701a75"
                                      strokeWidth={1}
                                    />
                                    <text
                                      x={padL - 21}
                                      y={yV2 + 3}
                                      textAnchor="middle"
                                      fill="#000"
                                      fontSize="8.5"
                                      fontFamily="JetBrains Mono, monospace"
                                      fontWeight="900"
                                    >
                                      V2
                                    </text>
                                  </g>
                                  {/* V2 Value Tag on Right */}
                                  <text
                                    x={padL + plotW - 4}
                                    y={yV2 - 4}
                                    textAnchor="end"
                                    fill="#f0abfc"
                                    fontSize="8.5"
                                    fontFamily="JetBrains Mono, monospace"
                                    fontWeight="700"
                                  >
                                    {v2Val.toFixed(2)}V
                                  </text>
                                </g>
                              );
                            })()}
                        </g>
                      )}
                    </svg>
                  );
                })()}
              </div>

              {/* Per-Probe Telemetry Readout Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {probedSignals.map((sig) => {
                  const seriesVals = plottedSeries.map(
                    (pt) => pt.values[sig.channelId] ?? sig.currentVoltage
                  );
                  const minV = Math.min(...seriesVals, sig.currentVoltage);
                  const maxV = Math.max(...seriesVals, sig.currentVoltage);
                  const vpp = maxV - minV;
                  const highCount = seriesVals.filter((v) => v >= 2.5).length;
                  const dutyPct = Math.round(
                    (highCount / Math.max(1, seriesVals.length)) * 100
                  );
                  const hoverVal =
                    hoverIdx !== null && plottedSeries[hoverIdx]
                      ? plottedSeries[hoverIdx].values[sig.channelId]
                      : undefined;

                  return (
                    <div
                      key={sig.channelId}
                      style={{ borderColor: sig.color }}
                      className="bg-slate-900/90 border rounded-xl p-2.5 flex items-center justify-between gap-2 text-xs font-mono"
                    >
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="px-1.5 py-0.5 rounded text-[10px] font-bold text-slate-950"
                            style={{ backgroundColor: sig.color }}
                          >
                            {sig.channelId}
                          </span>
                          <span className="font-bold text-white truncate">
                            {sig.netName}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {sig.sourceLabel} → {sig.targetLabel}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-300 pt-0.5">
                          {(() => {
                            const isSigDigital = isSigDigitalMode(sig);

                            if (isSigDigital) {
                              return (
                                <>
                                  <span>
                                    State:{" "}
                                    <strong className="text-emerald-300">
                                      {sig.currentVoltage >= 2.5
                                        ? "1 (5.0V)"
                                        : "0 (0.0V)"}
                                    </strong>
                                  </span>
                                  <span>Duty: {dutyPct}%</span>
                                  {sig.delayNs !== undefined && (
                                    <span className="text-amber-300">
                                      t_pd: {sig.delayNs}ns
                                    </span>
                                  )}
                                </>
                              );
                            }

                            const pk = sig.peakVoltage ?? maxV;
                            const rms =
                              sig.rmsVoltage ??
                              (sig.waveformType === "HALF_RECTIFIED"
                                ? pk / 2
                                : sig.waveformType === "FULL_RECTIFIED" ||
                                  sig.waveformType === "AC_SINE"
                                ? pk / Math.SQRT2
                                : Math.abs(sig.dcVoltage ?? sig.currentVoltage));
                            const vdc =
                              sig.dcVoltage ??
                              (sig.waveformType === "HALF_RECTIFIED"
                                ? pk / Math.PI
                                : sig.waveformType === "FULL_RECTIFIED"
                                ? (2 * pk) / Math.PI
                                : sig.waveformType === "AC_SINE"
                                ? 0
                                : sig.currentVoltage);

                            return (
                              <>
                                {sig.waveformType && sig.waveformType !== "AUTO" && (
                                  <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-cyan-950/70 border border-cyan-500/40 text-cyan-300">
                                    {sig.waveformType === "HALF_RECTIFIED"
                                      ? "Half-Wave Rectified (Si 1N4007)"
                                      : sig.waveformType === "FULL_RECTIFIED"
                                      ? "Full-Wave Bridge Rectifier"
                                      : sig.waveformType === "AC_SINE"
                                      ? "AC Sine Excitation"
                                      : sig.waveformType === "FILTERED_DC"
                                      ? "Filtered DC + Ripple"
                                      : sig.waveformType}
                                  </span>
                                )}
                                <span>
                                  V_pk:{" "}
                                  <strong className="text-amber-300">
                                    {pk.toFixed(2)}V
                                  </strong>
                                </span>
                                <span>
                                  V_dc:{" "}
                                  <strong className="text-cyan-300">
                                    {vdc.toFixed(2)}V
                                  </strong>
                                </span>
                                <span>V_rms: {rms.toFixed(2)}V</span>
                                <span>V_pp: {vpp.toFixed(2)}V</span>
                                {sig.currentMa !== undefined && (
                                  <span className="text-emerald-300">
                                    I: {sig.currentMa.toFixed(1)}mA
                                  </span>
                                )}
                              </>
                            );
                          })()}
                          {hoverVal !== undefined && (
                            <span className="text-cyan-300">
                              Cursor: {hoverVal.toFixed(2)}V
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => onRemoveProbe(sig.channelId)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-300 cursor-pointer shrink-0"
                        title={`Detach ${sig.channelId} probe from wire`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
