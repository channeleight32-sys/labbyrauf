import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  GATE_SPECS,
  COMP_SPECS,
  CIRCUIT_PRESETS,
  SEG_LINES,
  computeGate,
  PresetNodeDef,
  PresetWireDef,
} from "../data/logicSpecs";
import { MasterDomainId } from "../data/master75Labs";
import CircuitLab3DView from "./CircuitLab3DView";
import { getUserScopedKey } from "../utils/userStorageScope";
import {
  Play,
  Pause,
  RotateCcw,
  Trash2,
  StepForward,
  Activity,
  Cpu,
  AlertTriangle,
  AlertCircle,
  Zap,
  Compass,
  Flame,
  Crosshair,
  CheckCircle2,
  HelpCircle,
  Table,
  Maximize2,
  Minimize2,
  Magnet,
  Sliders,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  Save,
  HardDrive,
  Check,
  RefreshCw,
  Layers,
  X,
  PlusCircle,
  FileText,
  Eye,
  EyeOff,
  Wand2,
  History,
  Bookmark,
  Undo2,
  Redo2,
  BookOpen,
  Search,
  Clock,
  GitCommit,
  Gauge,
  Grid,
  Copy,
  Scissors,
  ClipboardPaste,
  CopyPlus,
  GitBranch,
  AlignStartVertical,
  AlignStartHorizontal,
  AlignVerticalSpaceAround,
  Move,
  ZoomIn,
  ZoomOut,
  Hand,
  Palette,
  ChevronDown,
  ChevronUp,
  Sun,
  Moon,
  Link2,
  Download,
  Pin,
  PinOff,
  Box,
  FolderKanban,
  Users,
  Lock,
  Unlock,
} from "lucide-react";
import CircuitLabCinematic3D from "./CircuitLabCinematic3D";
import NewProjectTemplateModal from "./NewProjectTemplateModal";
import LivePairingModal from "./LivePairingModal";
import { auth } from "../firebase";
import {
  computePairingSchematicSig,
  createPairingSession,
  detectLivePairingTransport,
  GUEST_COLOR,
  HOST_COLOR,
  isValidPairCode,
  joinPairingSession,
  normalizePairCode,
  type LivePairingHandle,
  type LivePairSessionSnapshot,
  type LivePairTransport,
  type PairingUser,
} from "../utils/livePairingService";
import { CircuitProjectTemplate } from "../data/circuitProjectTemplates";
import {
  GridPitch,
  AlignmentGuide,
  MultiAlignAction,
  computeSnappedNodePosition,
  snapValueToGrid,
  snapAllNodesToGrid,
  alignNodesOnGrid,
  autoArrangeCircuitOnGrid,
} from "../utils/schematicGrid";
import QuickAccess74Toolbar from "./QuickAccess74Toolbar";
import LogicAnalyzerOverlay, {
  LogicNetDescriptor,
  LogicTimingSample,
} from "./LogicAnalyzerOverlay";
import LogicAnalyzerModal, {
  SubscribableWireSignal,
  LA_CHANNEL_PALETTE,
} from "./LogicAnalyzerModal";
import MultiChannelLogicAnalyzer from "./MultiChannelLogicAnalyzer";
import DigitalOscilloscope, {
  OscilloscopeChannel,
  OscilloscopeSample,
} from "./DigitalOscilloscope";
import {
  usePrefersReducedMotion,
  usePageVisibility,
} from "../utils/animationHelpers";
import {
  saveCircuitToLocalStorage,
  getAutoSavedCircuit,
  clearAutoSavedCircuit,
  formatTimeAgo,
  AutoSavedCircuitData,
  CircuitVersionSnapshot,
  getSessionVersionSnapshots,
  saveSessionVersionSnapshot,
  deleteSessionVersionSnapshot,
  clearAllSessionVersionSnapshots,
} from "../utils/circuitAutoSave";
import {
  findDigitalOpenCircuits,
  analyzeCircuitDiagnostics,
  CircuitDiagnosticReport,
  OpenCircuitIssue,
} from "../utils/openCircuitDetector";
import BjtCurveTracerModal, {
  BjtComponentItem,
} from "./BjtCurveTracerModal";
import {
  analyzeCircuitOperations,
  GateOperationInsight,
} from "../utils/circuitAnalyzer";
import DigitalWaveformView from "./DigitalWaveformView";
import SimulationErrorBoundary from "./SimulationErrorBoundary";
import { generateCircuitLabWaveformProof } from "../utils/waveformProofEngine";
import RechartsWaveformProbe, {
  RealtimeWaveformSample,
  extractSignalPathValues,
} from "./RechartsWaveformProbe";
import FloatingCanvasHUD from "./FloatingCanvasHUD";
import ComponentPropertySidebar from "./ComponentPropertySidebar";
import LogicTimingDiagram, { NodeTimingSample } from "./LogicTimingDiagram";
import TimingDiagramOverlay, {
  TIMING_WINDOW_MS,
  TimingTransitionSample,
} from "./TimingDiagramOverlay";
import {
  solveCircuitLabAnalog,
  solveCircuitLabTransient,
  isAnalogOrPassiveType,
  CircuitLabSolverResult,
  serializeCircuitLabToSpiceNetlist,
} from "../utils/circuitLabAnalogSolver";
import {
  PROBE_CHANNELS,
  AttachedWireProbe,
  ProbedWireSignal,
  SvgWireProbeClip,
  OscilloscopeProbeDock,
  WireProbePopupWindow,
} from "./WireProbePopupWindow";
import ActiveProbeHoverHUD, { ProbeScreenPoint } from "./ActiveProbeHoverHUD";
import RealisticComponentRenderer from "./RealisticComponentRenderer";
import RealisticComponentModal from "./RealisticComponentModal";
import PmeGuidanceModal from "./PmeGuidanceModal";
import {
  computeCircuitWireFlows,
  formatSpiceFreq,
  type WireFlowTelemetry,
} from "../utils/wireFlowEngine";

export type CanvasColorThemeId =
  | "slate"
  | "paper"
  | "cream"
  | "blueprint"
  | "pcb"
  | "charcoal"
  | "dark";

export interface CanvasThemeDef {
  id: CanvasColorThemeId;
  name: string;
  label: string;
  bg: string;
  containerBg: string;
  gridMinor: string;
  gridMajor: string;
  dots: string;
  breadboardBase: string;
  gateStroke: string;
  gateFill: string;
  gateFillOn: string;
  gateBubbleFill: string;
  compStroke: string;
  compFill: string;
  compLabel: string;
  compPinLabel: string;
  wireOff: string;
  isLight?: boolean;
  desc: string;
}

export const CANVAS_COLOR_THEMES: Record<CanvasColorThemeId, CanvasThemeDef> = {
  slate: {
    id: "slate",
    name: "High-Visibility Slate Navy (Default)",
    label: "Slate Navy",
    bg: "#0d1729",
    containerBg: "#0d1729",
    gridMinor: "#162540",
    gridMajor: "#263a62",
    dots: "#4b6287",
    breadboardBase: "#101d36",
    gateStroke: "#38bdf8",
    gateFill: "rgba(56, 189, 248, 0.12)",
    gateFillOn: "rgba(34, 197, 94, 0.22)",
    gateBubbleFill: "#0d1729",
    compStroke: "#38bdf8",
    compFill: "rgba(18, 32, 58, 0.96)",
    compLabel: "#f8fafc",
    compPinLabel: "#94a3b8",
    wireOff: "#60799f",
    desc: "Specially calibrated navy slate for maximum contrast, glowing signals, and reduced eye strain",
  },
  paper: {
    id: "paper",
    name: "Multisim CAD Paper (Light)",
    label: "Paper Light",
    bg: "#f8fafc",
    containerBg: "#f8fafc",
    gridMinor: "#e2e8f0",
    gridMajor: "#cbd5e1",
    dots: "#94a3b8",
    breadboardBase: "#ffffff",
    gateStroke: "#0f172a",
    gateFill: "rgba(15, 23, 42, 0.05)",
    gateFillOn: "rgba(16, 185, 129, 0.22)",
    gateBubbleFill: "#ffffff",
    compStroke: "#1e293b",
    compFill: "rgba(255, 255, 255, 0.98)",
    compLabel: "#0f172a",
    compPinLabel: "#475569",
    wireOff: "#475569",
    isLight: true,
    desc: "Clean university textbook & Multisim white paper for ultimate daytime clarity & sharp schematics",
  },
  cream: {
    id: "cream",
    name: "Drafting Vellum / Warm Paper (Light)",
    label: "Warm Cream",
    bg: "#faf7f0",
    containerBg: "#f2ece0",
    gridMinor: "#ebe3d3",
    gridMajor: "#d5c7b0",
    dots: "#a89b88",
    breadboardBase: "#fcfaf4",
    gateStroke: "#1e293b",
    gateFill: "rgba(30, 41, 59, 0.05)",
    gateFillOn: "rgba(13, 148, 136, 0.22)",
    gateBubbleFill: "#faf7f0",
    compStroke: "#334155",
    compFill: "rgba(255, 255, 255, 0.98)",
    compLabel: "#0f172a",
    compPinLabel: "#64748b",
    wireOff: "#57534e",
    isLight: true,
    desc: "Gentle warm drafting paper reduces eye fatigue while keeping circuits crystal clear",
  },
  blueprint: {
    id: "blueprint",
    name: "Altium Blueprint Blue",
    label: "Blueprint",
    bg: "#081d3d",
    containerBg: "#081d3d",
    gridMinor: "#12386e",
    gridMajor: "#1c509c",
    dots: "#38bdf8",
    breadboardBase: "#0c274f",
    gateStroke: "#e0f2fe",
    gateFill: "rgba(224, 242, 254, 0.15)",
    gateFillOn: "rgba(74, 222, 128, 0.28)",
    gateBubbleFill: "#081d3d",
    compStroke: "#7dd3fc",
    compFill: "rgba(12, 36, 75, 0.96)",
    compLabel: "#ffffff",
    compPinLabel: "#bae6fd",
    wireOff: "#7dd3fc",
    desc: "Engineering CAD schematic blueprint with bright, high-contrast cyan traces",
  },
  pcb: {
    id: "pcb",
    name: "PCB Workbench Green",
    label: "PCB Green",
    bg: "#072016",
    containerBg: "#072016",
    gridMinor: "#0e422e",
    gridMajor: "#165f42",
    dots: "#34d399",
    breadboardBase: "#0a2e20",
    gateStroke: "#34d399",
    gateFill: "rgba(52, 211, 153, 0.12)",
    gateFillOn: "rgba(250, 204, 21, 0.25)",
    gateBubbleFill: "#072016",
    compStroke: "#10b981",
    compFill: "rgba(10, 42, 30, 0.96)",
    compLabel: "#ecfdf5",
    compPinLabel: "#a7f3d0",
    wireOff: "#059669",
    desc: "Circuit board finish with vivid emerald and gold traces",
  },
  charcoal: {
    id: "charcoal",
    name: "Studio Charcoal",
    label: "Charcoal",
    bg: "#161c28",
    containerBg: "#161c28",
    gridMinor: "#263144",
    gridMajor: "#3b4b68",
    dots: "#64748b",
    breadboardBase: "#1f2737",
    gateStroke: "#60a5fa",
    gateFill: "rgba(96, 165, 250, 0.12)",
    gateFillOn: "rgba(34, 197, 94, 0.22)",
    gateBubbleFill: "#161c28",
    compStroke: "#3b82f6",
    compFill: "rgba(28, 36, 52, 0.96)",
    compLabel: "#f8fafc",
    compPinLabel: "#94a3b8",
    wireOff: "#71829e",
    desc: "Soft neutral studio dark with relaxed, balanced contrast",
  },
  dark: {
    id: "dark",
    name: "OLED Deep Space",
    label: "OLED Dark",
    bg: "#060913",
    containerBg: "#060913",
    gridMinor: "#131b2e",
    gridMajor: "#222f4c",
    dots: "#334155",
    breadboardBase: "#0b1020",
    gateStroke: "#38bdf8",
    gateFill: "rgba(56, 189, 248, 0.1)",
    gateFillOn: "rgba(34, 197, 94, 0.22)",
    gateBubbleFill: "#060913",
    compStroke: "#0284c7",
    compFill: "rgba(14, 22, 38, 0.96)",
    compLabel: "#e2e8f0",
    compPinLabel: "#8fa3c8",
    wireOff: "#556885",
    desc: "Deep OLED dark with glowing electric neon traces",
  },
};

export interface CircuitNode {
  id: number;
  type: string;
  x: number;
  y: number;
  rotation?: 0 | 90 | 180 | 270;
  isMirrored?: boolean;
  value?: number;
  label?: string;
  state?: Record<string, number>;
  prevClk?: Record<number, number>;
  delayNs?: number;
  clockHz?: number;
  // Digital / Microcontroller & IoT Configuration
  digitalConfig?: {
    boardModel?: "ESP32_WROOM" | "ESP32_S3" | "ESP32_C3" | "ARDUINO_NANO";
    cpuFreqMhz?: 80 | 160 | 240;
    flashSizeMb?: 4 | 8 | 16;
    flashMode?: "QIO" | "DIO" | "QOUT";
    wifiMode?: "OFF" | "STA" | "AP" | "AP_STA";
    wifiSSID?: string;
    wifiPass?: string;
    bluetoothMode?: "OFF" | "BLE_SERVER" | "CLASSIC_SPP";
    baudRate?: number;
    adcBits?: 9 | 10 | 11 | 12;
    firmwareMode?: "BLINK" | "PWM_SERVO" | "UART_ECHO" | "ADC_STREAM" | "CUSTOM";
    wifiEnabled?: boolean;
    gpioModes?: Record<string, "INPUT" | "OUTPUT" | "PWM" | "ADC" | "DAC">;
    customCode?: string;
    isFirmwareVerified?: boolean;
    lastVerificationError?: string | null;
    serialLog?: string[];
  };
  // General Electrical / Analog Device Parameters
  analogParams?: {
    resistanceOhms?: number;
    capacitanceUf?: number;
    inductanceMh?: number;
    dcVoltageV?: number;
    acVoltageV?: number;
    frequencyHz?: number;
    diodeModel?: string;
    transistorBeta?: number;
    loadPowerW?: number;
    userValue?: number;
    userUnit?: string;
    formattedValue?: string;
  };
}

export interface CircuitWire {
  id: number;
  from: { node: number; port: number; dir?: "in" | "out" };
  to: { node: number; port: number; dir?: "in" | "out" };
  midX?: number;
  color?: string;
  isVirtualInstrumentWire?: boolean;
  virtualTag?: string;
}

export interface CompulsoryInputViolation {
  nodeId: number;
  gateType: string;
  gateLabel: string;
  missingPorts: number[]; // [0] for Pin A, [1] for Pin B, or [0, 1] for both
  connectedPorts: number[];
  x: number;
  y: number;
  message: string;
}

/**
 * Detects any logic gate with 2 compulsory inputs (AND, OR, NAND, NOR, XOR, XNOR)
 * where the user connected one input pin but missed/forgot to feed the second,
 * or connected the gate's output into the circuit while leaving inputs floating.
 */
export function detectCompulsoryGateViolations(
  nodeList: CircuitNode[],
  wireList: CircuitWire[]
): CompulsoryInputViolation[] {
  const wireMap = new Map<string, CircuitWire>();
  for (const w of wireList) {
    wireMap.set(`${w.to.node}:${w.to.port}`, w);
  }

  const violations: CompulsoryInputViolation[] = [];
  for (const n of nodeList) {
    const spec = GATE_SPECS[n.type];
    if (!spec || spec.inputs !== 2) continue;

    const hasIn0 = wireMap.has(`${n.id}:0`);
    const hasIn1 = wireMap.has(`${n.id}:1`);
    const hasOutWire = wireList.some((w) => w.from.node === n.id);

    // Violation condition:
    // 1) Student connected one input, but forgot/missed second (hasIn0 !== hasIn1)
    // 2) Student wired output of the gate into the circuit, but connected neither input (!hasIn0 && !hasIn1 && hasOutWire)
    if (hasIn0 !== hasIn1 || (!hasIn0 && !hasIn1 && hasOutWire)) {
      const missingPorts: number[] = [];
      const connectedPorts: number[] = [];
      if (!hasIn0) missingPorts.push(0);
      else connectedPorts.push(0);
      if (!hasIn1) missingPorts.push(1);
      else connectedPorts.push(1);

      let msg = "";
      if (missingPorts.length === 1) {
        const missLabel =
          missingPorts[0] === 0 ? "Pin A (Input 1)" : "Pin B (Input 2)";
        const connLabel = connectedPorts[0] === 0 ? "Pin A" : "Pin B";
        msg = `Pin ${connLabel} is wired, but ${missLabel} is missing! All 2-input gates require both inputs.`;
      } else {
        msg = `Gate output is connected to circuit, but both Pin A and Pin B inputs are floating!`;
      }

      violations.push({
        nodeId: n.id,
        gateType: n.type,
        gateLabel: n.label || `${n.type} Gate (Node #${n.id})`,
        missingPorts,
        connectedPorts,
        x: n.x,
        y: n.y,
        message: msg,
      });
    }
  }

  return violations;
}

interface CircuitLabProps {
  externalCircuit?: {
    title: string;
    nodes: PresetNodeDef[];
    wires: PresetWireDef[];
  } | null;
  onClearExternalCircuit?: () => void;
  isFullWindowStudio?: boolean;
  onToggleFullWindowStudio?: () => void;
  activeDomain?: MasterDomainId | null;
  currentLabId?: string | null;
  preferredGridPitch?: GridPitch;
  autoSaveEnabled?: boolean;
  telemetryDecimals?: number;
  onLogSimulationActivity?: (
    action: string,
    target: string,
    status?: "PASS" | "WARN" | "INFO"
  ) => void;
  pairingUser?: PairingUser | null;
  initialPairCode?: string | null;
}

export function GateSymbolIcon({ type }: { type: string }) {
  if (type === "INPUT") {
    return (
      <svg viewBox="0 0 62 42" className="gsym">
        <line x1="10" y1="21" x2="22" y2="21" stroke="#38bdf8" strokeWidth="2" />
        <circle cx="22" cy="21" r="2.5" fill="#38bdf8" />
        <line x1="22" y1="21" x2="38" y2="13" stroke="#22d3ee" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="42" cy="21" r="2.5" fill="#38bdf8" />
        <line x1="42" y1="21" x2="52" y2="21" stroke="#38bdf8" strokeWidth="2" />
      </svg>
    );
  }
  if (type === "OUTPUT") {
    return (
      <svg viewBox="0 0 62 42" className="gsym">
        <line x1="12" y1="21" x2="24" y2="21" stroke="#38bdf8" strokeWidth="2" />
        <circle cx="35" cy="21" r="10" fill="none" stroke="#22c55e" strokeWidth="2" />
        <line x1="28" y1="14" x2="42" y2="28" stroke="#22c55e" strokeWidth="2" />
        <line x1="28" y1="28" x2="42" y2="14" stroke="#22c55e" strokeWidth="2" />
      </svg>
    );
  }
  if (GATE_SPECS[type]) {
    const s = GATE_SPECS[type];
    return (
      <svg viewBox="-14 -8 106 66" className="gsym">
        <path d={s.path(0, 0)} />
        {s.extra && <path className="gsym-arc" d={s.extra(0, 0)} />}
        {s.bubble && (
          <circle cx={s.bubble.cx} cy={s.bubble.cy} r={s.bubble.r} />
        )}
      </svg>
    );
  }
  if (type === "RES" || type === "RESISTOR" || type.startsWith("RES_")) {
    return (
      <svg viewBox="0 0 62 42" className="gsym">
        <line x1="4" y1="21" x2="14" y2="21" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
        <path
          d="M 14 21 L 18 13 L 24 29 L 30 13 L 36 29 L 42 13 L 46 21"
          fill="none"
          stroke="#38bdf8"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <line x1="46" y1="21" x2="58" y2="21" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  if (type === "POT") {
    return (
      <svg viewBox="0 0 62 42" className="gsym">
        <line x1="6" y1="24" x2="16" y2="24" stroke="#38bdf8" strokeWidth="2" />
        <path
          d="M 16 24 L 20 18 L 26 30 L 32 18 L 38 30 L 42 24"
          fill="none"
          stroke="#38bdf8"
          strokeWidth="2"
        />
        <line x1="42" y1="24" x2="56" y2="24" stroke="#38bdf8" strokeWidth="2" />
        <line x1="29" y1="6" x2="29" y2="16" stroke="#22d3ee" strokeWidth="2" />
        <polygon points="29,18 26,13 32,13" fill="#22d3ee" />
      </svg>
    );
  }
  if (type === "CAP_NP" || type === "CAPACITOR") {
    return (
      <svg viewBox="0 0 62 42" className="gsym">
        <line x1="8" y1="21" x2="26" y2="21" stroke="#38bdf8" strokeWidth="2" />
        <line x1="26" y1="10" x2="26" y2="32" stroke="#38bdf8" strokeWidth="2.6" strokeLinecap="round" />
        <line x1="36" y1="10" x2="36" y2="32" stroke="#38bdf8" strokeWidth="2.6" strokeLinecap="round" />
        <line x1="36" y1="21" x2="54" y2="21" stroke="#38bdf8" strokeWidth="2" />
      </svg>
    );
  }
  if (type === "CAP_POL") {
    return (
      <svg viewBox="0 0 62 42" className="gsym">
        <line x1="8" y1="21" x2="26" y2="21" stroke="#38bdf8" strokeWidth="2" />
        <line x1="26" y1="10" x2="26" y2="32" stroke="#38bdf8" strokeWidth="2.6" strokeLinecap="round" />
        <path d="M 36 10 Q 32 21 36 32" fill="none" stroke="#38bdf8" strokeWidth="2.6" strokeLinecap="round" />
        <line x1="36" y1="21" x2="54" y2="21" stroke="#38bdf8" strokeWidth="2" />
        <text x="18" y="15" fill="#38bdf8" fontSize="9" fontWeight="bold">+</text>
      </svg>
    );
  }
  if (type === "IND") {
    return (
      <svg viewBox="0 0 62 42" className="gsym">
        <line x1="8" y1="23" x2="16" y2="23" stroke="#38bdf8" strokeWidth="2" />
        <path d="M 16 23 A 5 5 0 0 1 26 23 A 5 5 0 0 1 36 23 A 5 5 0 0 1 46 23" fill="none" stroke="#38bdf8" strokeWidth="2.2" />
        <line x1="46" y1="23" x2="54" y2="23" stroke="#38bdf8" strokeWidth="2" />
      </svg>
    );
  }
  if (type.includes("DIODE") || type.includes("ZENER") || type.includes("LED")) {
    const isLed = type.includes("LED");
    return (
      <svg viewBox="0 0 62 42" className="gsym">
        <line x1="8" y1="21" x2="22" y2="21" stroke="#38bdf8" strokeWidth="2" />
        <polygon points="22,11 22,31 40,21" fill="rgba(56,189,248,0.2)" stroke="#38bdf8" strokeWidth="2" />
        <line x1="40" y1="11" x2="40" y2="31" stroke="#38bdf8" strokeWidth="2.5" />
        <line x1="40" y1="21" x2="54" y2="21" stroke="#38bdf8" strokeWidth="2" />
        {isLed && (
          <g stroke="#22c55e" strokeWidth="1.5">
            <line x1="32" y1="12" x2="38" y2="6" />
            <polygon points="38,6 35,7 37,9" fill="#22c55e" />
          </g>
        )}
      </svg>
    );
  }
  if (type.includes("BC547") || type.includes("BC557") || type.includes("2N2222") || type.includes("BJT")) {
    return (
      <svg viewBox="0 0 62 42" className="gsym">
        <line x1="10" y1="21" x2="24" y2="21" stroke="#38bdf8" strokeWidth="2" />
        <line x1="24" y1="11" x2="24" y2="31" stroke="#38bdf8" strokeWidth="2.8" />
        <line x1="24" y1="16" x2="42" y2="8" stroke="#38bdf8" strokeWidth="2" />
        <line x1="24" y1="26" x2="42" y2="34" stroke="#38bdf8" strokeWidth="2" />
        <polygon points="42,34 35,31 37,36" fill="#38bdf8" />
      </svg>
    );
  }
  if (type.includes("OPAMP") || type.includes("741") || type.includes("LM358")) {
    return (
      <svg viewBox="0 0 62 42" className="gsym">
        <polygon points="16,8 16,34 46,21" fill="rgba(56,189,248,0.12)" stroke="#38bdf8" strokeWidth="2" />
        <line x1="6" y1="14" x2="16" y2="14" stroke="#38bdf8" strokeWidth="1.8" />
        <line x1="6" y1="28" x2="16" y2="28" stroke="#38bdf8" strokeWidth="1.8" />
        <line x1="46" y1="21" x2="56" y2="21" stroke="#38bdf8" strokeWidth="1.8" />
        <text x="20" y="16" fill="#38bdf8" fontSize="8" fontWeight="bold">-</text>
        <text x="20" y="30" fill="#38bdf8" fontSize="8" fontWeight="bold">+</text>
      </svg>
    );
  }
  if (type === "GND") {
    return (
      <svg viewBox="0 0 62 42" className="gsym">
        <line x1="31" y1="6" x2="31" y2="22" stroke="#38bdf8" strokeWidth="2.5" />
        <line x1="16" y1="22" x2="46" y2="22" stroke="#38bdf8" strokeWidth="2.8" strokeLinecap="round" />
        <line x1="21" y1="27" x2="41" y2="27" stroke="#38bdf8" strokeWidth="2.2" strokeLinecap="round" />
        <line x1="26" y1="32" x2="36" y2="32" stroke="#38bdf8" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  if (
    type === "VOLTMETER" ||
    type === "AMMETER" ||
    type === "OHMMETER" ||
    type === "POWER_METER" ||
    type === "WATTMETER"
  ) {
    const isA = type === "AMMETER";
    const isOhm = type === "OHMMETER";
    const isW = type === "POWER_METER" || type === "WATTMETER";
    const sym = isA ? "A" : isOhm ? "Ω" : isW ? "W" : "V";
    const strokeCol = isA ? "#10b981" : isOhm ? "#f59e0b" : isW ? "#a855f7" : "#38bdf8";
    const fillCol = isA
      ? "rgba(16,185,129,0.12)"
      : isOhm
      ? "rgba(245,158,11,0.12)"
      : isW
      ? "rgba(168,85,247,0.12)"
      : "rgba(56,189,248,0.12)";
    return (
      <svg viewBox="0 0 62 42" className="gsym">
        <line x1="6" y1="21" x2="17" y2="21" stroke={strokeCol} strokeWidth="2" />
        <line x1="45" y1="21" x2="56" y2="21" stroke={strokeCol} strokeWidth="2" />
        <circle cx="31" cy="21" r="14" fill={fillCol} stroke={strokeCol} strokeWidth="2" />
        <text x="31" y="26" fill={strokeCol} fontSize="13" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
          {sym}
        </text>
      </svg>
    );
  }
  if (type.includes("VCC") || type.includes("DC_VOLTAGE")) {
    return (
      <svg viewBox="0 0 62 42" className="gsym">
        <line x1="31" y1="6" x2="31" y2="16" stroke="#38bdf8" strokeWidth="2" />
        <line x1="18" y1="16" x2="44" y2="16" stroke="#38bdf8" strokeWidth="2.8" />
        <line x1="24" y1="22" x2="38" y2="22" stroke="#38bdf8" strokeWidth="2" />
        <line x1="31" y1="22" x2="31" y2="36" stroke="#38bdf8" strokeWidth="2" />
        <text x="44" y="14" fill="#38bdf8" fontSize="9" fontWeight="bold">+</text>
      </svg>
    );
  }
  if (type === "AC_SOURCE" || type === "AC_SINE" || type === "AC_VOLTAGE_SOURCE") {
    return (
      <svg viewBox="0 0 62 42" className="gsym">
        <line x1="6" y1="21" x2="17" y2="21" stroke="#38bdf8" strokeWidth="2" />
        <line x1="45" y1="21" x2="56" y2="21" stroke="#38bdf8" strokeWidth="2" />
        <circle cx="31" cy="21" r="14" fill="rgba(56,189,248,0.12)" stroke="#38bdf8" strokeWidth="2" />
        <path d="M 23 21 Q 27 13 31 21 Q 35 29 39 21" fill="none" stroke="#38bdf8" strokeWidth="2" />
      </svg>
    );
  }
  if (type === "BUFFER" || type === "BUF") {
    return (
      <svg viewBox="0 0 62 42" className="gsym">
        <line x1="8" y1="21" x2="20" y2="21" stroke="#38bdf8" strokeWidth="2" />
        <polygon points="20,9 20,33 46,21" fill="rgba(56,189,248,0.12)" stroke="#38bdf8" strokeWidth="2.2" />
        <line x1="46" y1="21" x2="56" y2="21" stroke="#38bdf8" strokeWidth="2" />
      </svg>
    );
  }
  if (type.includes("SWITCH") || type === "SW_SPST" || type === "SW_SPDT" || type.includes("BUTTON")) {
    return (
      <svg viewBox="0 0 62 42" className="gsym">
        <line x1="6" y1="21" x2="20" y2="21" stroke="#38bdf8" strokeWidth="2" />
        <line x1="44" y1="21" x2="56" y2="21" stroke="#38bdf8" strokeWidth="2" />
        <circle cx="20" cy="21" r="2.5" fill="#090d16" stroke="#38bdf8" strokeWidth="1.8" />
        <circle cx="44" cy="21" r="2.5" fill="#090d16" stroke="#38bdf8" strokeWidth="1.8" />
        <line x1="20" y1="21" x2="42" y2="11" stroke="#38bdf8" strokeWidth="2.2" />
      </svg>
    );
  }
  if (type.includes("FUSE")) {
    return (
      <svg viewBox="0 0 62 42" className="gsym">
        <line x1="6" y1="21" x2="20" y2="21" stroke="#38bdf8" strokeWidth="2" />
        <line x1="44" y1="21" x2="56" y2="21" stroke="#38bdf8" strokeWidth="2" />
        <path d="M 20 21 C 26 13, 26 29, 32 21 C 38 13, 38 29, 44 21" fill="none" stroke="#38bdf8" strokeWidth="2.2" />
      </svg>
    );
  }
  if (type.includes("TRANSFORMER")) {
    return (
      <svg viewBox="0 0 62 42" className="gsym">
        <line x1="6" y1="12" x2="18" y2="12" stroke="#38bdf8" strokeWidth="1.8" />
        <line x1="6" y1="30" x2="18" y2="30" stroke="#38bdf8" strokeWidth="1.8" />
        <path d="M 18 12 A 3 3 0 0 1 18 18 A 3 3 0 0 1 18 24 A 3 3 0 0 1 18 30" fill="none" stroke="#38bdf8" strokeWidth="2" />
        <line x1="30" y1="8" x2="30" y2="34" stroke="#22d3ee" strokeWidth="1.8" />
        <line x1="34" y1="8" x2="34" y2="34" stroke="#22d3ee" strokeWidth="1.8" />
        <line x1="44" y1="12" x2="56" y2="12" stroke="#38bdf8" strokeWidth="1.8" />
        <line x1="44" y1="30" x2="56" y2="30" stroke="#38bdf8" strokeWidth="1.8" />
        <path d="M 44 12 A 3 3 0 0 0 44 18 A 3 3 0 0 0 44 24 A 3 3 0 0 0 44 30" fill="none" stroke="#38bdf8" strokeWidth="2" />
      </svg>
    );
  }
  if (COMP_SPECS[type]) {
    const label = COMP_SPECS[type].iconLabel || COMP_SPECS[type].label || type;
    const fs = label.length > 4 ? 9 : label.length > 2 ? 11.5 : 15;
    return (
      <svg viewBox="0 0 62 42" className="gsym">
        <rect x="3" y="5" width="56" height="32" rx="6" />
        <text x="31" y="26" className="gsym-txt" style={{ fontSize: `${fs}px` }}>
          {label}
        </text>
      </svg>
    );
  }
  return null;
}

export default function CircuitLab({
  externalCircuit,
  onClearExternalCircuit,
  isFullWindowStudio,
  onToggleFullWindowStudio,
  activeDomain,
  currentLabId,
  preferredGridPitch,
  autoSaveEnabled = true,
  telemetryDecimals = 2,
  onLogSimulationActivity,
  pairingUser = null,
  initialPairCode = null,
}: CircuitLabProps) {
  const dec = Math.min(4, Math.max(2, telemetryDecimals));
  const svgRef = useRef<SVGSVGElement | null>(null);
  const canvasViewportRef = useRef<HTMLDivElement | null>(null);

  const [internalFullStudio, setInternalFullStudio] = useState<boolean>(false);
  const isFullStudio = isFullWindowStudio ?? internalFullStudio;
  const toggleFullStudio = onToggleFullWindowStudio ?? (() => setInternalFullStudio((v) => !v));

  const prefersReducedMotion = usePrefersReducedMotion();
  const isPageVisible = usePageVisibility();
  const [simBannerPhase, setSimBannerPhase] = useState<"STARTED" | "STOPPED" | null>(null);
  const simBannerTimerRef = useRef<number | null>(null);

  const [nodes, setNodes] = useState<CircuitNode[]>([]);
  const [wires, setWires] = useState<CircuitWire[]>([]);
  const [selected, setSelected] = useState<{
    type: "node" | "wire";
    id: number;
  } | null>(null);

  // Real Component Mode vs Schematic Mode (IEEE/IEC) toggle with persistent preference (Defaults to IEEE standard symbols)
  const [componentViewMode, setComponentViewMode] = useState<"REALISTIC" | "SCHEMATIC">("SCHEMATIC");
  const [lab3DMode, setLab3DMode] = useState<"OFF" | "SPLIT" | "ONLY_3D">("OFF");
  const [isCinematic3DView, setIsCinematic3DView] = useState<boolean>(false);
  const [inspectingComponentId, setInspectingComponentId] = useState<string | null>(null);

  // Precision Measurement Equipment (PME) Metrology Assistant Modal State
  const [isPmeModalOpen, setIsPmeModalOpen] = useState<boolean>(false);
  const [pmeModalMeterType, setPmeModalMeterType] = useState<
    "VOLTMETER" | "AMMETER" | "OHMMETER" | "POWER_METER" | "DIAGNOSTICS"
  >("DIAGNOSTICS");

  // Real-Time Signal Trace Visualizer: Highlights current flow path with animated particles
  const [signalTraceNodeId, setSignalTraceNodeId] = useState<number | null>(null);
  const [isSignalTraceEnabled, setIsSignalTraceEnabled] = useState<boolean>(true);
  const [signalTraceSpeed, setSignalTraceSpeed] = useState<number>(1.0);
  const [isSignalTraceHudMinimized, setIsSignalTraceHudMinimized] = useState<boolean>(false);

  // Multi-Selection & Clipboard State for Rapid Sub-Circuit Prototyping
  const [selectedNodeIds, setSelectedNodeIds] = useState<number[]>([]);
  const [selectedWireIds, setSelectedWireIds] = useState<number[]>([]);
  const [marqueeBox, setMarqueeBox] = useState<{
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  } | null>(null);
  const [clipboardNotice, setClipboardNotice] = useState<string | null>(null);
  const [clipboard, setClipboard] = useState<{
    nodes: CircuitNode[];
    wires: CircuitWire[];
    center: { x: number; y: number };
    timestamp: number;
  } | null>(() => {
    try {
      const raw = localStorage.getItem(getUserScopedKey("logicraft_circuit_clipboard"));
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const showClipboardNotice = useCallback((msg: string) => {
    setClipboardNotice(msg);
    setTimeout(() => setClipboardNotice(null), 3200);
  }, []);

  // Undo / Redo Structural History Stack for CircuitLab
  type LabEditSnapshot = { nodes: CircuitNode[]; wires: CircuitWire[]; sig: string };
  const [editHistoryPast, setEditHistoryPast] = useState<LabEditSnapshot[]>([]);
  const [editHistoryFuture, setEditHistoryFuture] = useState<LabEditSnapshot[]>([]);
  const isApplyingLabHistoryRef = useRef<boolean>(false);
  const lastLabSnapRef = useRef<LabEditSnapshot | null>(null);

  const labEditSig = useMemo(() => {
    const ns = nodes
      .map((n) => `${n.id}:${n.type}:${n.label}:${n.value ?? ""}:${JSON.stringify(n.analogParams || null)}`)
      .join("|");
    const ws = wires
      .map((w) => `${w.id}:${w.from.node}.${w.from.port}-${w.to.node}.${w.to.port}`)
      .join(",");
    return `${ns}##${ws}`;
  }, [nodes, wires]);

  useEffect(() => {
    const snap: LabEditSnapshot = {
      nodes: JSON.parse(JSON.stringify(nodes)),
      wires: JSON.parse(JSON.stringify(wires)),
      sig: labEditSig,
    };
    if (!lastLabSnapRef.current) {
      lastLabSnapRef.current = snap;
      return;
    }
    if (lastLabSnapRef.current.sig === labEditSig) return;
    if (isApplyingLabHistoryRef.current) {
      isApplyingLabHistoryRef.current = false;
      lastLabSnapRef.current = snap;
      return;
    }
    const prevSnap = lastLabSnapRef.current;
    setEditHistoryPast((p) => [...p.slice(-39), prevSnap]);
    setEditHistoryFuture([]);
    lastLabSnapRef.current = snap;
  }, [labEditSig, nodes, wires]);

  const handleLabUndo = useCallback(() => {
    if (editHistoryPast.length === 0) return;
    const prev = editHistoryPast[editHistoryPast.length - 1];
    const cur: LabEditSnapshot = {
      nodes: JSON.parse(JSON.stringify(nodes)),
      wires: JSON.parse(JSON.stringify(wires)),
      sig: labEditSig,
    };
    isApplyingLabHistoryRef.current = true;
    setEditHistoryPast((p) => p.slice(0, -1));
    setEditHistoryFuture((f) => [cur, ...f]);
    setNodes(prev.nodes);
    setWires(prev.wires);
    setSelected(null);
  }, [editHistoryPast, nodes, wires, labEditSig]);

  const handleLabRedo = useCallback(() => {
    if (editHistoryFuture.length === 0) return;
    const next = editHistoryFuture[0];
    const cur: LabEditSnapshot = {
      nodes: JSON.parse(JSON.stringify(nodes)),
      wires: JSON.parse(JSON.stringify(wires)),
      sig: labEditSig,
    };
    isApplyingLabHistoryRef.current = true;
    setEditHistoryFuture((f) => f.slice(1));
    setEditHistoryPast((p) => [...p, cur]);
    setNodes(next.nodes);
    setWires(next.wires);
    setSelected(null);
  }, [editHistoryFuture, nodes, wires, labEditSig]);

  const isNodeSelected = useCallback(
    (id: number) => {
      return selectedNodeIds.includes(id) || (selected?.type === "node" && selected.id === id);
    },
    [selected, selectedNodeIds]
  );

  const isWireSelected = useCallback(
    (id: number) => {
      return selectedWireIds.includes(id) || (selected?.type === "wire" && selected.id === id);
    },
    [selected, selectedWireIds]
  );
  const [pendingWire, setPendingWire] = useState<{
    node: number;
    port: number;
    dir: "in" | "out";
  } | null>(null);
  const pendingWireRef = useRef(pendingWire);
  pendingWireRef.current = pendingWire;

  const [mouseWorld, setMouseWorld] = useState<{ x: number; y: number } | null>(
    null
  );
  const mouseWorldRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [canvasZoom, setCanvasZoom] = useState<number>(0.85); // 0.85x default: fine, compact, adorable component sizing
  const [isPanning, setIsPanning] = useState(false);
  const panAnimFrameRef = useRef<number | null>(null);

  // Collapsed sections for component library tray (separated sections by class/type)
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  // Multi-Touch Gesture Navigation State (Pinch-to-Zoom & Two-Finger-Pan for Mobile)
  const [isTwoFingerGesturing, setIsTwoFingerGesturing] = useState(false);
  const [twoFingerGestureMode, setTwoFingerGestureMode] = useState<
    "PINCH" | "PAN" | "COMBINED"
  >("COMBINED");
  const isTwoFingerGesturingRef = useRef(false);
  const lastGestureEndTimeRef = useRef(0);
  const gestureDataRef = useRef<{
    initialDist: number;
    initialZoom: number;
    initialPan: { x: number; y: number };
    initialMid: { x: number; y: number };
    worldFocal: { x: number; y: number };
  } | null>(null);
  const panRef = useRef(pan);
  const canvasZoomRef = useRef(canvasZoom);
  panRef.current = pan;
  canvasZoomRef.current = canvasZoom;
  const wasNodeDraggedRef = useRef(false);
  const [activePreset, setActivePreset] = useState<string>("Custom Schematic (Empty Canvas)");
  const [autoClock, setAutoClock] = useState(false);
  const [clockHz, setClockHz] = useState<number>(2);
  const [measuredPulseHz, setMeasuredPulseHz] = useState<number>(0);
  const lastPulseTsRef = useRef<number>(0);
  const [simSpeed, setSimSpeed] = useState<number>(1); // Simulation speed multiplier: 0.1x, 0.5x, 1x, 2x, 5x
  const [waveformHistory, setWaveformHistory] = useState<
    { step: number; signals: Record<string, number> }[]
  >([]);
  const [rechartsSamples, setRechartsSamples] = useState<
    RealtimeWaveformSample[]
  >([]);
  const [haltAlertToast, setHaltAlertToast] = useState<string | null>(null);
  const [showCanvasHUD, setShowCanvasHUD] = useState<boolean>(false);
  const [hoveredWireId, setHoveredWireId] = useState<number | null>(null);

  // Grid Snap & Component Precision Alignment
  const [snapToGrid, setSnapToGrid] = useState<boolean>(true);
  const [gridPitch, setGridPitch] = useState<GridPitch>(preferredGridPitch ?? 20);
  useEffect(() => {
    if (preferredGridPitch) {
      setGridPitch(preferredGridPitch);
    }
  }, [preferredGridPitch]);
  const [magneticGuidesEnabled, setMagneticGuidesEnabled] = useState<boolean>(true);
  const [activeAlignmentGuides, setActiveAlignmentGuides] = useState<AlignmentGuide[]>([]);
  const [activelyDraggedNodeId, setActivelyDraggedNodeId] = useState<number | null>(null);
  const [dragCoordBadge, setDragCoordBadge] = useState<{ x: number; y: number } | null>(null);
  const [gridVisualMode, setGridVisualMode] = useState<
    "breadboard" | "breadboard-classic" | "cad" | "dots"
  >("breadboard");

  // Real-time 2-student Live Pairing Workspace state & refs
  const resolvedPairingUser: PairingUser | null = useMemo(() => {
    if (pairingUser?.uid) return pairingUser;
    const cur = auth.currentUser;
    if (!cur || !cur.emailVerified) return null;
    return {
      uid: cur.uid,
      displayName: cur.displayName || cur.email?.split("@")[0] || "Student",
      email: cur.email || undefined,
    };
  }, [pairingUser]);
  const [pairingSession, setPairingSession] =
    useState<LivePairSessionSnapshot | null>(null);
  const [pairingTransportHint, setPairingTransportHint] =
    useState<LivePairTransport | null>(null);
  const [isLivePairingModalOpen, setIsLivePairingModalOpen] =
    useState<boolean>(false);
  const [pairingBusy, setPairingBusy] = useState<boolean>(false);
  const [pairingError, setPairingError] = useState<string | null>(null);
  const pairingHandleRef = useRef<LivePairingHandle | null>(null);
  const isApplyingRemotePairingRef = useRef<boolean>(false);
  const lastSyncedPairingSigRef = useRef<string>("");
  const lastCursorEmitAtRef = useRef<number>(0);
  const livePairingSyncTimerRef = useRef<number | null>(null);
  const activelyDraggedNodeIdRef = useRef<number | null>(null);
  activelyDraggedNodeIdRef.current = activelyDraggedNodeId;
  const autoJoinedPairCodeRef = useRef<string | null>(null);

  // High-Visibility Canvas Color & Schematic Themes
  const [canvasThemeId, setCanvasThemeId] = useState<CanvasColorThemeId>(() => {
    try {
      const saved = localStorage.getItem(getUserScopedKey("ist_circuit_canvas_color"));
      if (
        saved &&
        ["slate", "paper", "cream", "blueprint", "pcb", "charcoal", "dark"].includes(saved)
      ) {
        return saved as CanvasColorThemeId;
      }
    } catch {
      // ignore
    }
    return "slate";
  });
  const [isCanvasColorMenuOpen, setIsCanvasColorMenuOpen] = useState<boolean>(false);
  const canvasColorMenuRef = useRef<HTMLDivElement>(null);

  const activeCanvasTheme = useMemo(
    () => CANVAS_COLOR_THEMES[canvasThemeId] || CANVAS_COLOR_THEMES.slate,
    [canvasThemeId]
  );

  const themeCssVars = useMemo(() => {
    const t = activeCanvasTheme;
    return {
      "--gate-fill": t.gateFill,
      "--gate-stroke": t.gateStroke,
      "--gate-fill-on": t.gateFillOn,
      "--gate-bubble-fill": t.gateBubbleFill,
      "--gate-label": t.isLight ? "#0f172a" : t.compLabel || "#f8fafc",
      "--comp-fill": t.compFill,
      "--comp-stroke": t.compStroke,
      "--comp-label": t.isLight ? "#0f172a" : t.compLabel,
      "--comp-pin-label": t.isLight ? "#475569" : t.compPinLabel,
      "--wire-off-color": t.wireOff,
      "--io-box-fill": t.isLight ? "#ffffff" : t.compFill,
      "--io-box-stroke": t.isLight ? "#0f172a" : t.compStroke,
      "--io-text-color": t.isLight ? "#0f172a" : "#94a3b8",
      "--port-in-fill": t.isLight ? "#ffffff" : "#0b1020",
      "--port-stroke": t.isLight ? "#334155" : "#4a6fa5",
      "--port-out-fill": t.isLight ? "#2563eb" : "#4a6fa5",
      "--port-out-stroke": t.isLight ? "#1d4ed8" : "#6b8fd0",
      "--canvas-bg": t.bg,
      "--grid-minor": t.gridMinor,
      "--grid-major": t.gridMajor,
      "--grid-dots": t.dots,
    } as React.CSSProperties;
  }, [activeCanvasTheme]);

  const handleSelectCanvasTheme = (themeId: CanvasColorThemeId) => {
    setCanvasThemeId(themeId);
    setIsCanvasColorMenuOpen(false);
    try {
      localStorage.setItem(getUserScopedKey("ist_circuit_canvas_color"), themeId);
    } catch {
      // ignore
    }
    showClipboardNotice(`Canvas Theme: ${CANVAS_COLOR_THEMES[themeId]?.name || themeId}`);
  };

  const handleToggleDayNight = () => {
    if (activeCanvasTheme.isLight) {
      handleSelectCanvasTheme("slate");
    } else {
      handleSelectCanvasTheme("paper");
    }
  };

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        canvasColorMenuRef.current &&
        !canvasColorMenuRef.current.contains(e.target as Node)
      ) {
        setIsCanvasColorMenuOpen(false);
      }
    };
    if (isCanvasColorMenuOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isCanvasColorMenuOpen]);

  // Larger Canvas Fullscreen Mode & Adaptable Equipment Tray
  const [isMaxCanvas, setIsMaxCanvas] = useState<boolean>(false);
  const [trayMode, setTrayMode] = useState<"docked" | "floating" | "hidden">(
    "docked"
  );
  const [trayPos, setTrayPos] = useState<{ x: number; y: number }>({
    x: 24,
    y: 70,
  });

  // Library Navigation Drawers & Categorized Slots
  const [isCircuitLibraryOpen, setIsCircuitLibraryOpen] = useState<boolean>(false);
  const [isTemplateLibraryOpen, setIsTemplateLibraryOpen] = useState<boolean>(false);
  const [isTheoryLibraryOpen, setIsTheoryLibraryOpen] = useState<boolean>(false);
  const [isInstrumentsDrawerOpen, setIsInstrumentsDrawerOpen] = useState<boolean>(true);
  const [componentSlotFilter, setComponentSlotFilter] = useState<string>("ALL");
  const [componentQuery, setComponentQuery] = useState<string>("");

  // Pin View: locks schematic viewport on screen and blocks outer page scrolling during wheel pan/zoom
  const [isPinViewEnabled, setIsPinViewEnabled] = useState<boolean>(false);
  // Board Lock: locks breadboard/schematic on current installation view by default; unlock to move ahead/back/forth
  const [isBoardLocked, setIsBoardLocked] = useState<boolean>(true);
  const isBoardLockedRef = useRef<boolean>(isBoardLocked);
  isBoardLockedRef.current = isBoardLocked;

  // Auto-Attach Instrument Engine: click virtual instrument in sidebar/dock -> click circuit node -> auto color-coded virtual connection
  type AutoAttachInstrumentSpec = {
    instrumentType: string;
    label: string;
    color: string;
    mode:
      | "PARALLEL"
      | "SERIES"
      | "SINGLE"
      | "DOCK_SCOPE_CH1"
      | "DOCK_SCOPE_CH2"
      | "DOCK_DMM_POS"
      | "DOCK_DMM_COM"
      | "DOCK_SIGGEN";
    tag: string;
  };
  const VIRTUAL_INSTRUMENT_SPECS: Record<string, AutoAttachInstrumentSpec> = useMemo(
    () => ({
      VOLTMETER: { instrumentType: "VOLTMETER", label: "Voltmeter [V]", color: "#38bdf8", mode: "PARALLEL", tag: "DVM V+" },
      AMMETER: { instrumentType: "AMMETER", label: "Ammeter [A]", color: "#10b981", mode: "SERIES", tag: "AMM I" },
      OHMMETER: { instrumentType: "OHMMETER", label: "Ohmmeter [Ω]", color: "#a855f7", mode: "PARALLEL", tag: "OHM Ω" },
      POWER_METER: { instrumentType: "POWER_METER", label: "Wattmeter [W]", color: "#f97316", mode: "PARALLEL", tag: "WATT" },
      DMM_PROBE: { instrumentType: "DMM_PROBE", label: "DMM Probe", color: "#22d3ee", mode: "PARALLEL", tag: "DMM" },
      OUTPUT: { instrumentType: "OUTPUT", label: "LED Indicator", color: "#34d399", mode: "SINGLE", tag: "LED" },
      LED_RED: { instrumentType: "LED_RED", label: "Red LED", color: "#f87171", mode: "SINGLE", tag: "LED-R" },
      LED_GREEN: { instrumentType: "LED_GREEN", label: "Green LED", color: "#4ade80", mode: "SINGLE", tag: "LED-G" },
      LED_BLUE: { instrumentType: "LED_BLUE", label: "Blue LED", color: "#60a5fa", mode: "SINGLE", tag: "LED-B" },
      BUZZER: { instrumentType: "BUZZER", label: "Piezo Buzzer", color: "#fbbf24", mode: "SINGLE", tag: "BUZ" },
      "7SEG": { instrumentType: "7SEG", label: "7-Seg Display", color: "#ec4899", mode: "SINGLE", tag: "7SEG" },
    }),
    []
  );
  const [isAutoAttachEnabled, setIsAutoAttachEnabled] = useState<boolean>(true);
  const [pendingAutoAttach, setPendingAutoAttach] = useState<AutoAttachInstrumentSpec | null>(null);

  // Auto-adapt component library slot according to active engineering domain
  useEffect(() => {
    if (activeDomain === "A") setComponentSlotFilter("ANALOG");
    else if (activeDomain === "B") setComponentSlotFilter("DEVICES");
    else if (activeDomain === "C") setComponentSlotFilter("GATES");
    else if (activeDomain === "D") setComponentSlotFilter("POWER");
    else if (activeDomain === "E") setComponentSlotFilter("ANALOG_IC");
  }, [activeDomain]);

  // Sidebar Property Editor
  const [isPropertySidebarOpen, setIsPropertySidebarOpen] =
    useState<boolean>(false);

  // Virtual Oscilloscope Wire Probes & Real-Time Waveform Pop-Up Window
  const [attachedProbes, setAttachedProbes] = useState<AttachedWireProbe[]>([]);
  const [activeProbeTool, setActiveProbeTool] = useState<
    "CH1" | "CH2" | "CH3" | "CH4" | null
  >(null);
  const [isProbePopupOpen, setIsProbePopupOpen] = useState<boolean>(false);
  const [isProbeHoverHudVisible, setIsProbeHoverHudVisible] = useState<boolean>(true);
  const [hoveredProbeChannel, setHoveredProbeChannel] = useState<
    "CH1" | "CH2" | "CH3" | "CH4" | null
  >(null);
  const [canvasViewportSize, setCanvasViewportSize] = useState<{
    width: number;
    height: number;
  }>({ width: 960, height: 540 });
  useEffect(() => {
    const el = canvasViewportRef.current;
    if (!el) return;
    const update = () => {
      setCanvasViewportSize({
        width: el.clientWidth || 960,
        height: el.clientHeight || 540,
      });
    };
    update();
    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(update);
      ro.observe(el);
      return () => ro.disconnect();
    }
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  const [reDraggingProbe, setReDraggingProbe] = useState<{
    channelId: "CH1" | "CH2" | "CH3" | "CH4";
    x: number;
    y: number;
  } | null>(null);

  // Circuit Completeness Verification & Missing Connection Highlighting
  const [isSimRunning, setIsSimRunning] = useState<boolean>(true);
  const [missingConnections, setMissingConnections] = useState<
    {
      nodeId: number;
      port: number;
      gateType: string;
      gateLabel: string;
      pinName: string;
      x: number;
      y: number;
      message: string;
    }[]
  >([]);
  const [circuitVerifyNotice, setCircuitVerifyNotice] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const compulsoryViolations = useMemo(
    () => detectCompulsoryGateViolations(nodes, wires),
    [nodes, wires]
  );
  const isSimulationHalted = compulsoryViolations.length > 0;

  // Open Circuits detection & highlight overlay state
  const [showOpenCircuitsOverlay, setShowOpenCircuitsOverlay] = useState<boolean>(false);
  // Dedicated BJT I-V Characteristic Curve Tracer modal state
  const [isBjtCurveTracerOpen, setIsBjtCurveTracerOpen] = useState<boolean>(false);

  // Searchable Quick-Access Toolbar for standard 74-Series TTL chips (default off to avoid overhead)
  const [show74QuickBar, setShow74QuickBar] = useState<boolean>(false);

  // Multi-Channel Digital Logic Analyzer Overlay state (default off to avoid overhead)
  const [showLogicAnalyzerOverlay, setShowLogicAnalyzerOverlay] = useState<boolean>(false);
  const [isFullLogicAnalyzerOpen, setIsFullLogicAnalyzerOpen] = useState<boolean>(false);
  const [selectedWireIdsForAnalyzer, setSelectedWireIdsForAnalyzer] = useState<number[]>([]);
  const [analyzerHistory, setAnalyzerHistory] = useState<LogicTimingSample[]>([]);
  const analyzerHistoryRef = useRef<LogicTimingSample[]>(analyzerHistory);
  analyzerHistoryRef.current = analyzerHistory;

  // Logic Timing Diagram State & Real-Time Transitions History
  const [selectedNodeIdsForTiming, setSelectedNodeIdsForTiming] = useState<number[]>([]);
  const [nodeTimingHistory, setNodeTimingHistory] = useState<NodeTimingSample[]>([]);
  const [isTimingDiagramModalOpen, setIsTimingDiagramModalOpen] = useState<boolean>(false);

  // Embedded 500ms Timing Diagram View Overlay state & rolling transition buffer
  const [showTimingDiagramOverlay, setShowTimingDiagramOverlay] = useState<boolean>(false);
  const [isTimingCapturePaused, setIsTimingCapturePaused] = useState<boolean>(false);
  const [timingWindowNowMs, setTimingWindowNowMs] = useState<number>(() => Date.now());
  const [timing500msHistory, setTiming500msHistory] = useState<TimingTransitionSample[]>([]);
  const isTimingCapturePausedRef = useRef<boolean>(false);
  isTimingCapturePausedRef.current = isTimingCapturePaused;

  // Auto-Sync Instruments: automatically binds Oscilloscope probes & Logic Analyzer channels
  // to the most critical nodes/wires whenever a circuit loads or simulation starts.
  const [autoSyncInstruments, setAutoSyncInstruments] = useState<boolean>(true);
  const autoSyncInstrumentsRef = useRef<boolean>(true);
  useEffect(() => {
    autoSyncInstrumentsRef.current = autoSyncInstruments;
  }, [autoSyncInstruments]);

  // Bottom Instrument Console View State (Bench Dock, Timing Diagram, Logic Analyzer, Oscilloscope, Diagnostics, MNA, Truth Table)
  const [bottomInstrumentTab, setBottomInstrumentTab] = useState<
    "BENCH_DOCK" | "DIAGNOSTICS" | "MNA_NETLIST" | "TIMING_DIAGRAM" | "LOGIC_ANALYZER" | "OSCILLOSCOPE" | "TRUTH_TABLE" | "PROBE"
  >("BENCH_DOCK");
  const [isBottomConsoleSplit, setIsBottomConsoleSplit] = useState<boolean>(false);
  const [bottomConsoleHeight, setBottomConsoleHeight] = useState<number>(260);
  const handleStartConsoleResize = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      const startY = e.clientY;
      const startH = bottomConsoleHeight;
      const onMove = (ev: PointerEvent) => {
        const delta = startY - ev.clientY;
        setBottomConsoleHeight(Math.max(180, Math.min(560, startH + delta)));
      };
      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [bottomConsoleHeight]
  );

  // Persistent Dock Instrument Attachments (Oscilloscope XSC1, Digital Multimeter XMM1, Signal Generator XFG1)
  const [dockScopeCh1NodeId, setDockScopeCh1NodeId] = useState<number | null>(null);
  const [dockScopeCh2NodeId, setDockScopeCh2NodeId] = useState<number | null>(null);
  const [dockScopeTimebaseMs, setDockScopeTimebaseMs] = useState<number>(5);
  const [dockScopeRunning, setDockScopeRunning] = useState<boolean>(true);
  const [dockScopeTick, setDockScopeTick] = useState<number>(0);

  const [dockDmmMode, setDockDmmMode] = useState<"VDC" | "VAC" | "MA" | "OHMS" | "HZ">("VDC");
  const [dockDmmPosNodeId, setDockDmmPosNodeId] = useState<number | null>(null);
  const [dockDmmComNodeId, setDockDmmComNodeId] = useState<number | null>(null);

  const [dockSigGen, setDockSigGen] = useState<{
    enabled: boolean;
    nodeId: number | null;
    waveform: "SINE" | "SQUARE" | "TRIANGLE" | "CLOCK";
    freqHz: number;
    ampVpp: number;
    offsetV: number;
  }>({
    enabled: false,
    nodeId: null,
    waveform: "SINE",
    freqHz: 2.0,
    ampVpp: 5.0,
    offsetV: 2.5,
  });

  useEffect(() => {
    if (!isSimRunning || (!dockScopeRunning && !dockSigGen.enabled)) return;
    const timer = window.setInterval(() => {
      setDockScopeTick((t) => (t + 1) % 10000);
    }, 80);
    return () => window.clearInterval(timer);
  }, [isSimRunning, dockScopeRunning, dockSigGen.enabled]);

  // Keep Signal Generator attached node parameters synced when enabled
  useEffect(() => {
    if (!dockSigGen.enabled || dockSigGen.nodeId === null) return;
    setNodes((prev) =>
      prev.map((n) => {
        if (n.id !== dockSigGen.nodeId) return n;
        if (n.type === "AC_SINE" || n.type === "AC_VOLTAGE_SOURCE") {
          return {
            ...n,
            analogParams: {
              ...n.analogParams,
              acVoltageV: Number((dockSigGen.ampVpp / 2).toFixed(2)),
              frequencyHz: dockSigGen.freqHz,
              formattedValue: `${(dockSigGen.ampVpp / 2).toFixed(1)}Vp ${dockSigGen.freqHz}Hz`,
            },
          };
        }
        if (n.type === "CLOCK") {
          return { ...n, clockHz: dockSigGen.freqHz };
        }
        return n;
      })
    );
  }, [dockSigGen.enabled, dockSigGen.nodeId, dockSigGen.ampVpp, dockSigGen.freqHz]);

  // Periodic Auto-Save & Session Recovery state
  const [autoSaveRecoveryPrompt, setAutoSaveRecoveryPrompt] = useState<AutoSavedCircuitData | null>(null);
  const [lastAutoSaveTimestamp, setLastAutoSaveTimestamp] = useState<number | null>(null);
  const [autoSaveNotice, setAutoSaveNotice] = useState<string | null>(null);
  const [isAutoSaveMenuOpen, setIsAutoSaveMenuOpen] = useState<boolean>(false);

  // Local Session Version Snapshots for quick experimentation and state restoration
  const [sessionSnapshots, setSessionSnapshots] = useState<CircuitVersionSnapshot[]>([]);
  const [isVersionMenuOpen, setIsVersionMenuOpen] = useState<boolean>(false);
  const [newSnapshotName, setNewSnapshotName] = useState<string>("");

  // High-performance electrical signature: only updates on topology/value mutations (ignores pure x, y drag shifts)
  const circuitElectricalHash = useMemo(() => {
    const nodeSig = nodes
      .map(
        (n) =>
          `${n.id}:${n.type}:${n.value ?? 0}:${JSON.stringify(n.state || {})}:${
            n.analogParams
              ? `${n.analogParams.resistanceOhms}_${n.analogParams.capacitanceUf}_${n.analogParams.inductanceMh}_${n.analogParams.dcVoltageV}_${n.analogParams.acVoltageV}_${n.analogParams.frequencyHz}_${n.analogParams.transistorBeta}`
              : ""
          }`
      )
      .join("|");
    const wireSig = wires
      .map(
        (w) =>
          `${w.id}:${w.from.node}.${w.from.port}.${w.from.dir || ""}->${w.to.node}.${w.to.port}.${w.to.dir || ""}`
      )
      .join("|");
    return `${nodeSig}##${wireSig}`;
  }, [nodes, wires]);

  // Visual Diagnostic Tool: Analyzes short circuits, floating nodes, output contention, and open paths
  const circuitDiagnosticReport = useMemo<CircuitDiagnosticReport>(() => {
    return analyzeCircuitDiagnostics(nodes, wires);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [circuitElectricalHash]);

  const openCircuitIssues = circuitDiagnosticReport.issues;

  // Real-Time MNA Circuit & Ohm's Law (V = IR) Solver
  const analogSolution = useMemo<CircuitLabSolverResult>(() => {
    return solveCircuitLabAnalog(nodes, wires, isSimRunning);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [circuitElectricalHash, isSimRunning]);

  // Unified SPICE Simulation Frequency & CSS Animation Cycle Duration Helpers
  const computeAnimDurStr = useCallback(
    (freqHz: number) => {
      const spd = Math.max(0.2, simSpeed || 1);
      if (!freqHz || !Number.isFinite(freqHz) || freqHz <= 0) {
        return `${(1.15 / spd).toFixed(2)}s`;
      }
      const raw =
        freqHz <= 6
          ? 1 / Math.max(0.45, freqHz)
          : 1 / (1.8 + Math.log10(freqHz) * 0.72);
      const clamped = Math.max(0.22, Math.min(2.2, raw / spd));
      return `${clamped.toFixed(2)}s`;
    },
    [simSpeed]
  );

  const circuitSpiceFreqHz = useMemo(() => {
    if (!isSimRunning) return 0;
    const acNode = nodes.find(
      (n) =>
        n.type === "AC_SINE" ||
        n.type === "AC_VOLTAGE_SOURCE" ||
        n.type === "TRANSFORMER"
    );
    if (acNode) {
      return Math.max(
        0.5,
        acNode.analogParams?.frequencyHz ??
          (dockSigGen.enabled ? dockSigGen.freqHz : 50)
      );
    }
    const timerNode = nodes.find((n) => n.type === "TIMER_555");
    if (timerNode) {
      if (
        timerNode.analogParams?.frequencyHz &&
        timerNode.analogParams.frequencyHz > 0
      ) {
        return timerNode.analogParams.frequencyHz;
      }
      return autoClock ? Math.max(0.5, clockHz) : 1.5;
    }
    if (dockSigGen.enabled && dockSigGen.freqHz > 0) {
      return dockSigGen.freqHz;
    }
    const hasClock = nodes.some((n) => n.type === "CLOCK");
    if (hasClock && (autoClock || measuredPulseHz > 0)) {
      return Math.max(0.25, measuredPulseHz || clockHz);
    }
    if (autoClock) return Math.max(0.25, clockHz);
    if (measuredPulseHz > 0) return measuredPulseHz;
    return 0;
  }, [
    isSimRunning,
    nodes,
    dockSigGen.enabled,
    dockSigGen.freqHz,
    autoClock,
    clockHz,
    measuredPulseHz,
  ]);

  const getNodeSpiceFreqHz = useCallback(
    (n: CircuitNode) => {
      if (!isSimRunning) return 0;
      if (n.analogParams?.frequencyHz && n.analogParams.frequencyHz > 0) {
        return n.analogParams.frequencyHz;
      }
      if (n.clockHz && n.clockHz > 0) return n.clockHz;
      return circuitSpiceFreqHz;
    },
    [isSimRunning, circuitSpiceFreqHz]
  );

  // Sync selected node with Signal Trace Visualizer
  useEffect(() => {
    if (isSignalTraceEnabled && selected?.type === "node") {
      setSignalTraceNodeId(selected.id);
    }
  }, [selected, isSignalTraceEnabled]);

  // Real-Time Signal Trace Engine: Resolves interconnected current flow path, wire directions, and node telemetry
  const tracedSignalNet = useMemo(() => {
    if (!isSignalTraceEnabled || signalTraceNodeId === null) return null;
    const rootNode = nodes.find((n) => n.id === signalTraceNodeId);
    if (!rootNode) return null;

    const tracedNodeIds = new Set<number>([signalTraceNodeId]);
    const tracedWireIds = new Set<number>();
    const wireDirections = new Map<number, boolean>(); // true: from -> to, false: to -> from
    const queue: number[] = [signalTraceNodeId];

    // BFS through interconnected wires and components
    while (queue.length > 0 && tracedNodeIds.size < 64) {
      const currId = queue.shift()!;

      // Wires connected where currId is source/from
      const outWires = wires.filter((w) => w.from.node === currId);
      for (const w of outWires) {
        tracedWireIds.add(w.id);
        const vFrom = analogSolution?.getPinVoltage?.(w.from.node, w.from.port, "out") ?? 0;
        const vTo = analogSolution?.getPinVoltage?.(w.to.node, w.to.port, "in") ?? 0;
        const flowFromTo = Math.abs(vFrom - vTo) > 0.04 ? vFrom >= vTo : true;
        wireDirections.set(w.id, flowFromTo);

        if (!tracedNodeIds.has(w.to.node)) {
          tracedNodeIds.add(w.to.node);
          queue.push(w.to.node);
        }
      }

      // Wires connected where currId is destination/to
      const inWires = wires.filter((w) => w.to.node === currId);
      for (const w of inWires) {
        tracedWireIds.add(w.id);
        const vFrom = analogSolution?.getPinVoltage?.(w.from.node, w.from.port, "out") ?? 0;
        const vTo = analogSolution?.getPinVoltage?.(w.to.node, w.to.port, "in") ?? 0;
        const flowFromTo = Math.abs(vFrom - vTo) > 0.04 ? vFrom >= vTo : true;
        wireDirections.set(w.id, flowFromTo);

        if (!tracedNodeIds.has(w.from.node)) {
          tracedNodeIds.add(w.from.node);
          queue.push(w.from.node);
        }
      }
    }

    // Determine path components telemetry
    const connectedComponents = Array.from(tracedNodeIds).map((id) => {
      const node = nodes.find((n) => n.id === id);
      const telem = analogSolution?.compTelemetry?.get(id);
      const pinV = analogSolution?.getPinVoltage?.(id, 0) ?? (node?.value ? 5.0 : 0.0);
      return {
        id,
        label: node?.label || `${node?.type || "Unit"} #${id}`,
        type: node?.type || "COMP",
        voltage: telem?.vDrop ?? pinV,
        currentMa: telem?.current_mA ?? (telem?.isConducting ? 12.0 : 0.0),
        isRoot: id === signalTraceNodeId,
      };
    });

    const rootTelem = analogSolution?.compTelemetry?.get(signalTraceNodeId);
    const rootPinV =
      analogSolution?.getPinVoltage?.(signalTraceNodeId, 0) ?? (rootNode.value ? 5.0 : 0.0);
    const rootCurrentMa = rootTelem?.current_mA ?? (analogSolution?.loopCurrentMa || 0);

    const hasPower = Array.from(tracedNodeIds).some((id) => {
      const n = nodes.find((item) => item.id === id);
      return (
        n &&
        (n.type === "VCC" ||
          n.type === "VCC_5V" ||
          n.type === "VCC_12V" ||
          n.type === "BATTERY" ||
          n.type === "DC_VOLTAGE" ||
          n.type === "DC_VOLTAGE_SOURCE" ||
          n.type === "AC_SINE" ||
          n.type === "AC_VOLTAGE_SOURCE" ||
          (n.type === "INPUT" && n.value === 1))
      );
    });
    const hasGround = Array.from(tracedNodeIds).some((id) => {
      const n = nodes.find((item) => item.id === id);
      return n && (n.type === "GND" || (n.type === "INPUT" && n.value === 0));
    });

    return {
      rootNodeId: signalTraceNodeId,
      rootNode,
      tracedNodeIds,
      tracedWireIds,
      wireDirections,
      connectedComponents,
      voltage: rootPinV,
      currentMa: rootCurrentMa,
      logicState: (rootNode.value !== undefined ? rootNode.value : "ANALOG") as 0 | 1 | "ANALOG",
      isClosedLoop: hasPower && hasGround,
      hasPower,
      hasGround,
    };
  }, [isSignalTraceEnabled, signalTraceNodeId, nodes, wires, analogSolution]);

  // Extract BJT transistors currently in the circuit with live MNA telemetry for the I-V Curve Tracer
  const bjtComponentItems = useMemo<BjtComponentItem[]>(() => {
    return nodes
      .filter(
        (n) =>
          n.type === "BC547" ||
          n.type === "BC557" ||
          n.type === "BJT" ||
          n.type === "BJT_NPN" ||
          n.type === "BJT_PNP" ||
          n.type === "2N2222"
      )
      .map((n) => {
        const isPnp = n.type === "BC557" || n.type === "BJT_PNP";
        const beta = n.analogParams?.transistorBeta ?? (isPnp ? 220 : 250);
        const vbeOn = 0.68;
        const vceSat = 0.18;

        const vB = analogSolution.getPinVoltage(n.id, 0, "in");
        const vC = analogSolution.getPinVoltage(n.id, isPnp ? 2 : 1, "in");
        const vE = analogSolution.getPinVoltage(n.id, isPnp ? 1 : 2, "in");

        const hasBaseWire = wires.some(
          (w) =>
            (w.to.node === n.id && w.to.port === 0 && (w.to.dir || "in") === "in") ||
            (w.from.node === n.id && w.from.port === 0 && w.from.dir === "in")
        );
        const collectorPort = isPnp ? 2 : 1;
        const hasCollectorWire = wires.some(
          (w) =>
            (w.to.node === n.id && w.to.port === collectorPort && (w.to.dir || "in") === "in") ||
            (w.from.node === n.id && w.from.port === collectorPort && w.from.dir === "in") ||
            (w.from.node === n.id && (w.from.port === 0 || w.from.port === 1) && (w.from.dir || "out") === "out")
        );

        const signedVbe = isPnp ? vE - vB : vB - vE;
        const signedVce = isPnp ? vE - vC : vC - vE;

        let liveIb_uA = 0;
        let liveIc_mA = 0;
        let operatingRegion: BjtComponentItem["operatingRegion"] = "CUTOFF";

        if (!hasBaseWire && !hasCollectorWire) {
          operatingRegion = "OPEN / FLOATING";
        } else if (signedVbe >= 0.55) {
          const ibA = Math.max(0, (signedVbe - 0.7) / 180);
          liveIb_uA = Number((ibA * 1e6).toFixed(2));
          if (signedVce <= 0.25) {
            operatingRegion = "SATURATION";
            liveIc_mA = Number(
              ((ibA * beta * 0.65 + Math.max(0, 0.25 - signedVce) / 4) * 1000).toFixed(2)
            );
          } else {
            operatingRegion = "ACTIVE";
            liveIc_mA = Number((ibA * beta * 1000).toFixed(2));
          }
        } else {
          operatingRegion = "CUTOFF";
        }

        const telem = analogSolution.compTelemetry.get(n.id);
        if (telem && telem.current_mA > 0.001 && liveIc_mA === 0) {
          liveIc_mA = Number(telem.current_mA.toFixed(2));
        }

        const modelName =
          n.type === "2N2222" ? "2N2222A" : isPnp ? "BC557B" : "BC547B";

        return {
          id: n.id,
          label: n.label || `${n.type} #${n.id}`,
          type: n.type,
          modelName,
          beta,
          vbe_on: vbeOn,
          vce_sat: vceSat,
          va: n.type === "2N2222" ? 100 : isPnp ? 90 : 120,
          isPnp,
          liveVbe: Number(signedVbe.toFixed(3)),
          liveVce: Number(signedVce.toFixed(3)),
          liveIc_mA: Math.max(0, liveIc_mA),
          liveIb_uA: Math.max(0, liveIb_uA),
          operatingRegion,
        };
      });
  }, [nodes, wires, analogSolution]);

  const bjtSupplyParams = useMemo(() => {
    const supplyNode = nodes.find(
      (n) =>
        n.type === "VCC_12V" ||
        n.type === "VCC_5V" ||
        n.type === "VCC" ||
        n.type === "BATTERY" ||
        n.type === "DC_VOLTAGE" ||
        n.type === "DC_VOLTAGE_SOURCE"
    );
    const vccSupply = supplyNode
      ? supplyNode.type === "VCC_12V"
        ? 12
        : supplyNode.type === "VCC_5V" || supplyNode.type === "VCC"
        ? 5
        : supplyNode.analogParams?.dcVoltageV ?? (supplyNode.type === "BATTERY" ? 9 : 5)
      : analogSolution.sourceVoltageV > 0
      ? analogSolution.sourceVoltageV
      : 5;

    const collectorResNode =
      nodes.find(
        (n) =>
          (n.type === "RES" || n.type === "RESISTOR") &&
          (n.label?.toLowerCase().includes("rc") ||
            n.label?.toLowerCase().includes("coll") ||
            n.label?.toLowerCase().includes("load"))
      ) || nodes.find((n) => n.type === "RES" || n.type === "RESISTOR");

    const rcCollectorResistor = collectorResNode?.analogParams?.resistanceOhms ?? 1000;
    return { vccSupply, rcCollectorResistor };
  }, [nodes, analogSolution.sourceVoltageV]);

  const idCounterRef = useRef(1);
  const cascadeRef = useRef(0);
  const sweepStepRef = useRef(0);
  const nodesRef = useRef<CircuitNode[]>(nodes);
  const wiresRef = useRef<CircuitWire[]>(wires);
  // Preserve last settled node outputs so bistable latches (SR NOR/NAND) hold memory state
  const prevOutsRef = useRef<Record<number, number[]>>({});

  nodesRef.current = nodes;
  wiresRef.current = wires;

  const buildWireMap = useCallback((wireList: CircuitWire[]) => {
    const map = new Map<string, CircuitWire>();
    for (const w of wireList) {
      map.set(`${w.to.node}:${w.to.port}`, w);
    }
    return map;
  }, []);

  const getInputVal = useCallback(
    (
      nodeId: number,
      port: number,
      outs: Record<number, number[]>,
      wireMap: Map<string, CircuitWire>,
      defaultVal = 0
    ): number => {
      const w = wireMap.get(`${nodeId}:${port}`);
      if (!w) return defaultVal;
      const arr = outs[w.from.node];
      return arr ? arr[w.from.port] ?? defaultVal : defaultVal;
    },
    []
  );

  /**
   * Pure combinational + latch relaxation engine using Gauss-Seidel in-place updates
   * so cross-coupled bistable latches converge deterministically without oscillation
   * and OUTPUT nodes always receive their driven wire value.
   */
  const settlePure = useCallback(
    (
      nodeList: CircuitNode[],
      wireList: CircuitWire[],
      seedOuts?: Record<number, number[]>
    ) => {
      const wireMap = buildWireMap(wireList);
      const outs: Record<number, number[]> = {};

      for (const n of nodeList) {
        if (n.type === "INPUT") {
          outs[n.id] = [n.value ? 1 : 0];
        } else if (COMP_SPECS[n.type]) {
          const spec = COMP_SPECS[n.type];
          outs[n.id] =
            spec.seq && spec.stateOutputs
              ? spec.stateOutputs(n.state || spec.init || {})
              : seedOuts?.[n.id]
              ? [...seedOuts[n.id]]
              : new Array(spec.outputs.length).fill(0);
        } else if (seedOuts?.[n.id]) {
          outs[n.id] = [...seedOuts[n.id]];
        } else {
          outs[n.id] = [0];
        }
      }

      for (let iter = 0; iter < 64; iter++) {
        let changed = false;
        for (const n of nodeList) {
          let nextVal: number[];
          if (n.type === "INPUT") {
            nextVal = [n.value ? 1 : 0];
          } else if (n.type === "OUTPUT") {
            const hasW = wireMap.has(`${n.id}:0`);
            if (!hasW) {
              nextVal = [-1]; // Not connected
            } else {
              const inVal = getInputVal(n.id, 0, outs, wireMap, -1);
              nextVal = [inVal];
            }
          } else if (COMP_SPECS[n.type]) {
            const comp = COMP_SPECS[n.type];
            if (comp.seq && comp.stateOutputs) {
              nextVal = comp.stateOutputs(n.state || comp.init || {});
            } else if (comp.compute) {
              const ins = comp.inputs.map((pin, i) =>
                getInputVal(n.id, i, outs, wireMap, pin.defaultVal ?? 0)
              );
              // If any input receives a halted signal (-1), downstream outputs halt to -1
              if (ins.some((v) => v === -1)) {
                nextVal = new Array(comp.outputs.length).fill(-1);
              } else {
                nextVal = comp.compute(ins);
              }
            } else {
              nextVal = [];
            }
          } else if (GATE_SPECS[n.type]) {
            const spec = GATE_SPECS[n.type];
            if (spec.inputs === 2) {
              const hasW0 = wireMap.has(`${n.id}:0`);
              const hasW1 = wireMap.has(`${n.id}:1`);
              const hasOutW = wireList.some((w) => w.from.node === n.id);

              // Compulsory 2-input gate verification:
              // - If 1 input is connected and the second is missing/forgotten (hasW0 !== hasW1)
              // - Or if output is wired into circuit but both inputs are missing
              if (hasW0 !== hasW1 || (!hasW0 && !hasW1 && hasOutW)) {
                nextVal = [-1]; // Undetermined / Halted / High-Z
              } else if (!hasW0 && !hasW1) {
                // Completely isolated gate sitting on canvas without wires
                nextVal = [0];
              } else {
                const in0 = getInputVal(n.id, 0, outs, wireMap, 0);
                const in1 = getInputVal(n.id, 1, outs, wireMap, 0);
                if (in0 === -1 || in1 === -1) {
                  nextVal = [-1]; // Propagate halted state
                } else {
                  nextVal = [computeGate(n.type, [in0, in1])];
                }
              }
            } else {
              // 1-input gate (NOT gate)
              const hasW0 = wireMap.has(`${n.id}:0`);
              const hasOutW = wireList.some((w) => w.from.node === n.id);
              if (!hasW0 && hasOutW) {
                nextVal = [-1];
              } else if (!hasW0) {
                nextVal = [0];
              } else {
                const in0 = getInputVal(n.id, 0, outs, wireMap, 0);
                if (in0 === -1) {
                  nextVal = [-1];
                } else {
                  nextVal = [computeGate(n.type, [in0])];
                }
              }
            }
          } else {
            nextVal = [0];
          }

          const prevVal = outs[n.id];
          if (
            !prevVal ||
            nextVal.length !== prevVal.length ||
            nextVal.some((v, idx) => v !== prevVal[idx])
          ) {
            changed = true;
            outs[n.id] = nextVal;
          }
        }
        if (!changed) break;
      }

      return { outs, wireMap };
    },
    [buildWireMap, getInputVal]
  );

  /**
   * Full two-phase evaluation:
   * 1. Settle combinational network
   * 2. Detect rising clock edges & asynchronous resets/presets/loads on sequential ICs
   * 3. Re-settle combinational network if any sequential state changed
   */
  const evaluateCircuit = useCallback(
    (currentNodes: CircuitNode[], currentWires: CircuitWire[]) => {
      let { outs, wireMap } = settlePure(
        currentNodes,
        currentWires,
        prevOutsRef.current
      );
      let stateMutated = false;

      const updatedNodes = currentNodes.map((n) => {
        const spec = COMP_SPECS[n.type];
        if (!spec || !spec.seq || !spec.step) return n;

        const ins = spec.inputs.map((pin, i) =>
          getInputVal(n.id, i, outs, wireMap, pin.defaultVal ?? 0)
        );
        const clockPorts = spec.clockPorts || [];
        const prevClk = { ...(n.prevClk || {}) };
        let firstRun = false;
        if (!n.prevClk || Object.keys(n.prevClk).length === 0) {
          for (const cp of clockPorts) {
            prevClk[cp] = getInputVal(
              n.id,
              cp,
              outs,
              wireMap,
              spec.inputs[cp]?.defaultVal ?? 0
            );
          }
          firstRun = true;
        }

        const edges = clockPorts.map((cp) => {
          if (firstRun) return false;
          const clkVal = getInputVal(
            n.id,
            cp,
            outs,
            wireMap,
            spec.inputs[cp]?.defaultVal ?? 0
          );
          const prev = prevClk[cp] ?? 0;
          prevClk[cp] = clkVal;
          return prev === 0 && clkVal === 1;
        });

        const st = n.state || spec.init || {};
        if (ins.some((v) => v === -1)) {
          return n; // Simulation halted on floating input
        }
        // Preserve astable NE555 phase controlled by frequency-synced oscillator when RESET is HIGH
        if (n.type === "TIMER_555" && n.analogParams?.frequencyHz && ins[2] !== 0) {
          return n;
        }
        const newState = spec.step(ins, st, edges);
        const eq = Object.keys(st).every((k) => st[k] === newState[k]);
        if (!eq) {
          stateMutated = true;
        }
        return {
          ...n,
          state: newState,
          prevClk,
        };
      });

      if (stateMutated) {
        const res = settlePure(updatedNodes, currentWires, outs);
        outs = res.outs;
        wireMap = res.wireMap;
      }

      prevOutsRef.current = outs;
      return { updatedNodes, outs, wireMap, stateMutated };
    },
    [getInputVal, settlePure]
  );

  // Live Pairing real-time schematic serialization & snapshot synchronization
  const buildPairingPayload = useCallback(
    (
      nodeList: CircuitNode[],
      wireList: CircuitWire[],
      titleText: string,
      running: boolean,
      hz: number,
      autoClk: boolean,
      spd: number
    ) => ({
      title: titleText || "Collaborative Schematic",
      nodes: nodeList.map((n) => ({
        id: n.id,
        type: n.type,
        x: n.x,
        y: n.y,
        rotation: n.rotation,
        isMirrored: n.isMirrored,
        value: autoClk && n.type === "CLOCK" ? 0 : n.value,
        label: n.label,
        delayNs: n.delayNs,
        clockHz: n.clockHz,
        digitalConfig: n.digitalConfig as Record<string, unknown> | undefined,
        analogParams: n.analogParams as Record<string, unknown> | undefined,
      })),
      wires: wireList.map((w) => ({
        id: w.id,
        from: { ...w.from },
        to: { ...w.to },
        midX: w.midX,
        color: w.color,
        isVirtualInstrumentWire: w.isVirtualInstrumentWire,
        virtualTag: w.virtualTag,
      })),
      isSimRunning: running,
      clockHz: hz,
      autoClock: autoClk,
      simSpeed: spd,
    }),
    []
  );

  const localPairingPayload = useMemo(
    () =>
      buildPairingPayload(
        nodes,
        wires,
        activePreset,
        isSimRunning,
        clockHz,
        autoClock,
        simSpeed
      ),
    [
      buildPairingPayload,
      nodes,
      wires,
      activePreset,
      isSimRunning,
      clockHz,
      autoClock,
      simSpeed,
    ]
  );

  const localPairingSig = useMemo(
    () => computePairingSchematicSig(localPairingPayload),
    [localPairingPayload]
  );

  const applyIncomingPairingSnapshot = useCallback(
    (snap: LivePairSessionSnapshot) => {
      setPairingSession(snap);

      if (snap.status === "closed" && snap.role === "guest") {
        void pairingHandleRef.current?.leaveSession();
        pairingHandleRef.current = null;
        setPairingSession(null);
        setPairingError("Host ended the Live Pairing session.");
        setIsLivePairingModalOpen(true);
        return;
      }

      const incomingSig = computePairingSchematicSig(snap.schematic);
      if (incomingSig === lastSyncedPairingSigRef.current) {
        return;
      }

      lastSyncedPairingSigRef.current = incomingSig;
      isApplyingRemotePairingRef.current = true;

      const existingMap = new Map<number, CircuitNode>();
      for (const curNode of nodesRef.current) {
        existingMap.set(curNode.id, curNode);
      }

      let maxRemoteId = idCounterRef.current;
      const rebuiltNodes: CircuitNode[] = snap.schematic.nodes.map((rn) => {
        if (rn.id >= maxRemoteId) maxRemoteId = rn.id + 1;
        const prev = existingMap.get(rn.id);
        const isBeingDraggedLocally = activelyDraggedNodeIdRef.current === rn.id;
        const spec = COMP_SPECS[rn.type];
        const nextNode: CircuitNode = {
          id: rn.id,
          type: rn.type,
          x: isBeingDraggedLocally && prev ? prev.x : rn.x,
          y: isBeingDraggedLocally && prev ? prev.y : rn.y,
          ...(rn.rotation !== undefined ? { rotation: rn.rotation } : {}),
          ...(rn.isMirrored !== undefined ? { isMirrored: rn.isMirrored } : {}),
          ...(rn.value !== undefined ? { value: rn.value } : {}),
          ...(rn.label !== undefined ? { label: rn.label } : {}),
          ...(rn.delayNs !== undefined ? { delayNs: rn.delayNs } : {}),
          ...(rn.clockHz !== undefined ? { clockHz: rn.clockHz } : {}),
          ...(rn.digitalConfig
            ? { digitalConfig: rn.digitalConfig as CircuitNode["digitalConfig"] }
            : {}),
          ...(rn.analogParams
            ? { analogParams: rn.analogParams as CircuitNode["analogParams"] }
            : {}),
        };
        if (spec?.seq) {
          nextNode.state = prev?.state
            ? { ...prev.state }
            : { ...(spec.init || {}) };
          nextNode.prevClk = prev?.prevClk ? { ...prev.prevClk } : {};
        }
        return nextNode;
      });

      const rebuiltWires: CircuitWire[] = snap.schematic.wires.map((rw) => {
        if (rw.id >= maxRemoteId) maxRemoteId = rw.id + 1;
        return {
          id: rw.id,
          from: { ...rw.from },
          to: { ...rw.to },
          ...(rw.midX !== undefined ? { midX: rw.midX } : {}),
          ...(rw.color ? { color: rw.color } : {}),
          ...(rw.isVirtualInstrumentWire !== undefined
            ? { isVirtualInstrumentWire: rw.isVirtualInstrumentWire }
            : {}),
          ...(rw.virtualTag ? { virtualTag: rw.virtualTag } : {}),
        };
      });

      if (maxRemoteId > idCounterRef.current) {
        idCounterRef.current = maxRemoteId;
      }

      const { updatedNodes } = evaluateCircuit(rebuiltNodes, rebuiltWires);
      isApplyingLabHistoryRef.current = true;
      setNodes(updatedNodes);
      setWires(rebuiltWires);
      setActivePreset(snap.schematic.title || "Collaborative Schematic");
      setIsSimRunning(snap.schematic.isSimRunning);
      setClockHz(snap.schematic.clockHz);
      setAutoClock(snap.schematic.autoClock);
      setSimSpeed(snap.schematic.simSpeed);

      window.setTimeout(() => {
        isApplyingRemotePairingRef.current = false;
        isApplyingLabHistoryRef.current = false;
      }, 60);
    },
    [evaluateCircuit]
  );

  const handleCreatePairingSession = useCallback(async () => {
    if (!resolvedPairingUser) {
      setPairingError(
        "Sign in with a verified Google student account before creating a Live Pairing room."
      );
      return;
    }
    setPairingBusy(true);
    setPairingError(null);
    try {
      if (pairingHandleRef.current) {
        await pairingHandleRef.current.leaveSession();
        pairingHandleRef.current = null;
      }
      lastSyncedPairingSigRef.current = localPairingSig;
      const handle = await createPairingSession({
        user: resolvedPairingUser,
        initialSchematic: localPairingPayload,
        onSnapshot: applyIncomingPairingSnapshot,
        onError: (msg) => {
          setPairingError(msg);
          pairingHandleRef.current = null;
          setPairingSession(null);
        },
      });
      pairingHandleRef.current = handle;
      setPairingTransportHint(handle.transport);
      onLogSimulationActivity?.(
        "Created Live Pairing Room",
        `Room ${handle.code}`,
        "INFO"
      );
    } catch (err) {
      setPairingError(
        err instanceof Error ? err.message : "Could not start Live Pairing session."
      );
    } finally {
      setPairingBusy(false);
    }
  }, [
    resolvedPairingUser,
    localPairingSig,
    localPairingPayload,
    applyIncomingPairingSnapshot,
    onLogSimulationActivity,
  ]);

  const handleJoinPairingSession = useCallback(
    async (rawCode: string) => {
      if (!resolvedPairingUser) {
        setPairingError(
          "Sign in with a verified Google student account before joining a Live Pairing room."
        );
        return;
      }
      const code = normalizePairCode(rawCode);
      if (!isValidPairCode(code)) {
        setPairingError("Enter a valid 6-character alphanumeric pairing code.");
        return;
      }
      setPairingBusy(true);
      setPairingError(null);
      try {
        if (pairingHandleRef.current) {
          await pairingHandleRef.current.leaveSession();
          pairingHandleRef.current = null;
        }
        lastSyncedPairingSigRef.current = "";
        const handle = await joinPairingSession({
          user: resolvedPairingUser,
          pairCode: code,
          onSnapshot: applyIncomingPairingSnapshot,
          onError: (msg) => {
            setPairingError(msg);
            pairingHandleRef.current = null;
            setPairingSession(null);
          },
        });
        pairingHandleRef.current = handle;
        setPairingTransportHint(handle.transport);
        onLogSimulationActivity?.(
          "Joined Live Pairing Room",
          `Room ${handle.code}`,
          "PASS"
        );
      } catch (err) {
        setPairingError(
          err instanceof Error ? err.message : "Unable to join pairing room."
        );
      } finally {
        setPairingBusy(false);
      }
    },
    [resolvedPairingUser, applyIncomingPairingSnapshot, onLogSimulationActivity]
  );

  const handleLeavePairingSession = useCallback(async () => {
    setPairingBusy(true);
    try {
      if (livePairingSyncTimerRef.current) {
        window.clearTimeout(livePairingSyncTimerRef.current);
        livePairingSyncTimerRef.current = null;
      }
      if (pairingHandleRef.current) {
        await pairingHandleRef.current.leaveSession();
        pairingHandleRef.current = null;
      }
      setPairingSession(null);
      setPairingError(null);
    } finally {
      setPairingBusy(false);
    }
  }, []);

  // Push local schematic mutations to pairing room (debounced, echo-guarded)
  useEffect(() => {
    const handle = pairingHandleRef.current;
    if (!handle || isApplyingRemotePairingRef.current) return;
    if (localPairingSig === lastSyncedPairingSigRef.current) return;

    if (livePairingSyncTimerRef.current) {
      window.clearTimeout(livePairingSyncTimerRef.current);
    }
    const nextSig = localPairingSig;
    const nextPayload = localPairingPayload;
    livePairingSyncTimerRef.current = window.setTimeout(() => {
      if (!pairingHandleRef.current || isApplyingRemotePairingRef.current) return;
      lastSyncedPairingSigRef.current = nextSig;
      void pairingHandleRef.current.pushSchematic(nextPayload).catch((err) => {
        setPairingError(
          err instanceof Error ? err.message : "Failed to sync schematic change."
        );
      });
    }, 110);
  }, [localPairingSig, localPairingPayload]);

  // Sync currently selected component ID with partner presence
  useEffect(() => {
    const handle = pairingHandleRef.current;
    if (!handle) return;
    const selectedId = selected?.type === "node" ? selected.id : null;
    void handle.updatePresence({ selectedNodeId: selectedId }).catch(() => undefined);
  }, [selected, pairingSession?.status]);

  // Detect RTDB vs Firestore fallback when modal opens
  useEffect(() => {
    if (!isLivePairingModalOpen || pairingTransportHint) return;
    void detectLivePairingTransport()
      .then((res) => setPairingTransportHint(res.transport))
      .catch(() => setPairingTransportHint("firestore"));
  }, [isLivePairingModalOpen, pairingTransportHint]);

  // Auto-open & join when navigated via ?pair=XXXXXX invite link
  useEffect(() => {
    const normalized = initialPairCode ? normalizePairCode(initialPairCode) : "";
    if (!isValidPairCode(normalized)) return;
    if (autoJoinedPairCodeRef.current === normalized) return;
    autoJoinedPairCodeRef.current = normalized;
    setIsLivePairingModalOpen(true);
    if (resolvedPairingUser && !pairingHandleRef.current) {
      void handleJoinPairingSession(normalized);
    }
  }, [initialPairCode, resolvedPairingUser, handleJoinPairingSession]);

  // Clean up Live Pairing on CircuitLab unmount
  useEffect(() => {
    return () => {
      if (livePairingSyncTimerRef.current) {
        window.clearTimeout(livePairingSyncTimerRef.current);
      }
      if (pairingHandleRef.current) {
        void pairingHandleRef.current.leaveSession();
        pairingHandleRef.current = null;
      }
    };
  }, []);

  // Capture node HIGH/LOW/Z state transitions over a continuous 500ms rolling window
  const record500msTransitionSnapshot = useCallback(
    (nodeList: CircuitNode[], outs: Record<number, number[]>, force = false) => {
      if (isTimingCapturePausedRef.current && !force) return;
      const now = Date.now();
      const cutoff = now - TIMING_WINDOW_MS;
      const values: Record<number, number> = {};
      for (const n of nodeList) {
        if (n.type === "INPUT" || n.type === "CLOCK") {
          values[n.id] = n.value ? 1 : 0;
        } else {
          values[n.id] = outs[n.id]?.[0] ?? 0;
        }
      }

      setTiming500msHistory((prev) => {
        let anchor: TimingTransitionSample | null = null;
        const inWindow: TimingTransitionSample[] = [];
        for (const s of prev) {
          if (s.timestampMs <= cutoff) {
            anchor = s;
          } else {
            inWindow.push(s);
          }
        }
        const trimmed = anchor ? [anchor, ...inWindow] : inWindow;
        const last = trimmed[trimmed.length - 1];
        if (!force && last) {
          const lastKeys = Object.keys(last.values);
          const curKeys = Object.keys(values);
          let changed = lastKeys.length !== curKeys.length;
          if (!changed) {
            for (const k of curKeys) {
              const idNum = Number(k);
              if (last.values[idNum] !== values[idNum]) {
                changed = true;
                break;
              }
            }
          }
          if (!changed && now - last.timestampMs < 40) {
            return trimmed;
          }
        }
        return [...trimmed, { timestampMs: now, values }].slice(-1500);
      });
      setTimingWindowNowMs(now);
    },
    []
  );

  // Record a snapshot into the Logic Analyzer waveform history
  const pushWaveformSnapshot = useCallback(
    (nodeList: CircuitNode[], outs: Record<number, number[]>) => {
      record500msTransitionSnapshot(nodeList, outs);
      const inputs = nodeList.filter((n) => n.type === "INPUT");
      const outputs = nodeList.filter((n) => n.type === "OUTPUT");
      const segs = nodeList.filter((n) => n.type === "7SEG");
      if (inputs.length === 0 && outputs.length === 0 && segs.length === 0)
        return;

      const wireMap = buildWireMap(wiresRef.current);
      const signals: Record<string, number> = {};
      inputs.slice(0, 8).forEach((inp, idx) => {
        signals[inp.label || `I${idx + 1}`] = inp.value ? 1 : 0;
      });
      outputs.slice(0, 10).forEach((outp, idx) => {
        signals[outp.label || `O${idx + 1}`] = outs[outp.id]?.[0] ?? 0;
      });
      if (outputs.length === 0 && segs.length > 0) {
        const segNode = segs[0];
        (["a", "b", "c", "d", "e", "f", "g"] as const).forEach((sName, pIdx) => {
          signals[`seg_${sName}`] = getInputVal(
            segNode.id,
            pIdx,
            outs,
            wireMap,
            0
          );
        });
      }

      // Record per-wire signals so wire-probed Oscilloscope traces update in lockstep
      wiresRef.current.forEach((w) => {
        const srcNode = nodeList.find((n) => n.id === w.from.node);
        const val =
          srcNode?.type === "INPUT"
            ? srcNode.value
              ? 1
              : 0
            : outs[w.from.node]?.[w.from.port] ?? 0;
        signals[`w_${w.id}`] = val === 1 ? 5.0 : 0.0;
      });

      setWaveformHistory((prev) => {
        const nextStep = prev.length > 0 ? prev[prev.length - 1].step + 1 : 1;
        const next = [...prev, { step: nextStep, signals }];
        return next.slice(-24);
      });

      const pathVals = extractSignalPathValues(
        nodeList,
        wiresRef.current,
        outs
      );
      setRechartsSamples((prev) => {
        const nextStep = prev.length > 0 ? prev[prev.length - 1].step + 1 : 1;
        const next: RealtimeWaveformSample[] = [
          ...prev,
          {
            step: nextStep,
            timeLabel: `t${nextStep}`,
            timestampMs: Date.now(),
            values: pathVals,
          },
        ];
        return next.slice(-24);
      });

      // Record multi-channel digital logic analyzer samples across all schematic nets
      const netValues: Record<number, 0 | 1> = {};
      wiresRef.current.forEach((w) => {
        const srcNode = nodeList.find((n) => n.id === w.from.node);
        let val = 0;
        if (srcNode?.type === "INPUT") {
          val = srcNode.value ? 1 : 0;
        } else {
          val = outs[w.from.node]?.[w.from.port] ?? 0;
        }
        netValues[w.id] = val === 1 ? 1 : 0;
      });

      setAnalyzerHistory((prev) => {
        const nextStep = prev.length > 0 ? prev[prev.length - 1].step + 1 : 1;
        const next: LogicTimingSample = {
          step: nextStep,
          timeLabel: `T${nextStep}`,
          netValues,
        };
        return [...prev.slice(-31), next];
      });

      // Record node timing samples for Logic Timing Diagram
      const nodeVals: Record<number, number> = {};
      nodeList.forEach((n) => {
        let val = 0;
        if (n.type === "INPUT" || n.type === "CLOCK") {
          val = n.value ? 1 : 0;
        } else {
          val = outs[n.id]?.[0] ?? 0;
        }
        nodeVals[n.id] = val;
      });

      setNodeTimingHistory((prev) => {
        const nextStep = prev.length > 0 ? prev[prev.length - 1].step + 1 : 1;
        const nextSample: NodeTimingSample = {
          step: nextStep,
          timestampMs: Date.now(),
          timeLabel: `T${nextStep}`,
          nodeValues: nodeVals,
        };
        return [...prev.slice(-47), nextSample];
      });
    },
    [buildWireMap, getInputVal, record500msTransitionSnapshot]
  );

  // --- Copy, Cut, Paste & Sub-Circuit Prototyping Engine ---
  const handleCopy = useCallback(() => {
    const currentNodes = nodesRef.current;
    const currentWires = wiresRef.current;

    let nodesToCopy: CircuitNode[] = [];
    let wiresToCopy: CircuitWire[] = [];

    if (selectedNodeIds.length > 0) {
      const idSet = new Set(selectedNodeIds);
      nodesToCopy = currentNodes.filter((n) => idSet.has(n.id));
      wiresToCopy = currentWires.filter(
        (w) => idSet.has(w.from.node) && idSet.has(w.to.node)
      );
      // Also include any explicitly selected wires
      if (selectedWireIds.length > 0) {
        const extraWires = currentWires.filter(
          (w) => selectedWireIds.includes(w.id) && !wiresToCopy.some((ew) => ew.id === w.id)
        );
        wiresToCopy.push(...extraWires);
      }
    } else if (selected?.type === "node") {
      const n = currentNodes.find((x) => x.id === selected.id);
      if (n) nodesToCopy = [n];
    } else if (selected?.type === "wire") {
      const w = currentWires.find((x) => x.id === selected.id);
      if (w) wiresToCopy = [w];
    } else if (selectedWireIds.length > 0) {
      wiresToCopy = currentWires.filter((w) => selectedWireIds.includes(w.id));
    }

    if (nodesToCopy.length === 0 && wiresToCopy.length === 0) {
      showClipboardNotice("Nothing selected to copy. Click or Shift+drag on components.");
      return false;
    }

    // Determine center of copied elements for relative placement
    let cx = 0;
    let cy = 0;
    if (nodesToCopy.length > 0) {
      const xs = nodesToCopy.map((n) => n.x);
      const ys = nodesToCopy.map((n) => n.y);
      cx = (Math.min(...xs) + Math.max(...xs)) / 2;
      cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    } else {
      cx = 240;
      cy = 200;
    }

    const clipData = {
      nodes: JSON.parse(JSON.stringify(nodesToCopy)) as CircuitNode[],
      wires: JSON.parse(JSON.stringify(wiresToCopy)) as CircuitWire[],
      center: { x: cx, y: cy },
      timestamp: Date.now(),
    };

    setClipboard(clipData);
    try {
      localStorage.setItem(
        getUserScopedKey("logicraft_circuit_clipboard"),
        JSON.stringify(clipData)
      );
    } catch {}

    if (nodesToCopy.length > 1) {
      showClipboardNotice(
        `Copied sub-circuit (${nodesToCopy.length} components, ${wiresToCopy.length} wires)`
      );
    } else if (nodesToCopy.length === 1) {
      showClipboardNotice(
        `Copied ${nodesToCopy[0].label || nodesToCopy[0].type} #${nodesToCopy[0].id} to clipboard`
      );
    } else {
      showClipboardNotice(`Copied ${wiresToCopy.length} wire(s) to clipboard`);
    }
    return true;
  }, [selected, selectedNodeIds, selectedWireIds, showClipboardNotice]);

  const handleCut = useCallback(() => {
    const currentNodes = nodesRef.current;
    const currentWires = wiresRef.current;

    const hasCopied = handleCopy();
    if (!hasCopied) return;

    const nodesToDelete = new Set<number>(selectedNodeIds);
    if (selected?.type === "node") nodesToDelete.add(selected.id);

    const wiresToDelete = new Set<number>(selectedWireIds);
    if (selected?.type === "wire") wiresToDelete.add(selected.id);

    if (nodesToDelete.size === 0 && wiresToDelete.size === 0) return;

    const updatedNodes = currentNodes.filter((n) => !nodesToDelete.has(n.id));
    const updatedWires = currentWires.filter(
      (w) =>
        !wiresToDelete.has(w.id) &&
        !nodesToDelete.has(w.from.node) &&
        !nodesToDelete.has(w.to.node)
    );

    const { updatedNodes: finalNodes, outs } = evaluateCircuit(updatedNodes, updatedWires);
    setNodes(finalNodes);
    setWires(updatedWires);
    pushWaveformSnapshot(finalNodes, outs);

    setSelected(null);
    setSelectedNodeIds([]);
    setSelectedWireIds([]);
    setIsPropertySidebarOpen(false);

    showClipboardNotice(
      `Cut ${nodesToDelete.size > 0 ? `${nodesToDelete.size} component(s)` : ""}${
        wiresToDelete.size > 0 ? ` ${wiresToDelete.size} wire(s)` : ""
      } to clipboard`
    );
  }, [
    handleCopy,
    selected,
    selectedNodeIds,
    selectedWireIds,
    evaluateCircuit,
    pushWaveformSnapshot,
    showClipboardNotice,
  ]);

  const handlePaste = useCallback(
    (customTargetPos?: { x: number; y: number }) => {
      let clip = clipboard;
      if (!clip) {
        try {
          const raw = localStorage.getItem(
            getUserScopedKey("logicraft_circuit_clipboard")
          );
          if (raw) clip = JSON.parse(raw);
        } catch {}
      }

      if (!clip || (clip.nodes.length === 0 && clip.wires.length === 0)) {
        showClipboardNotice("Clipboard is empty. Copy or cut a component or sub-circuit first.");
        return;
      }

      const pitch = snapToGrid ? gridPitch : 10;

      let targetX = 0;
      let targetY = 0;

      if (customTargetPos) {
        targetX = customTargetPos.x;
        targetY = customTargetPos.y;
      } else if (mouseWorldRef.current && mouseWorldRef.current.x > -200 && mouseWorldRef.current.y > -200) {
        targetX = mouseWorldRef.current.x;
        targetY = mouseWorldRef.current.y;
      } else if (mouseWorld && mouseWorld.x > -200 && mouseWorld.y > -200) {
        targetX = mouseWorld.x;
        targetY = mouseWorld.y;
      } else {
        targetX = clip.center.x + 40;
        targetY = clip.center.y + 40;
      }

      targetX = Math.round(targetX / pitch) * pitch;
      targetY = Math.round(targetY / pitch) * pitch;

      const dx = targetX - clip.center.x;
      const dy = targetY - clip.center.y;

      const maxExistingId = Math.max(
        0,
        ...nodesRef.current.map((n) => n.id),
        ...wiresRef.current.map((w) => w.id)
      );
      if (idCounterRef.current <= maxExistingId) {
        idCounterRef.current = maxExistingId + 1;
      }

      const idMap = new Map<number, number>();
      const newNodes: CircuitNode[] = clip.nodes.map((node) => {
        const newId = idCounterRef.current++;
        idMap.set(node.id, newId);
        const nx = Math.round((node.x + dx) / pitch) * pitch;
        const ny = Math.round((node.y + dy) / pitch) * pitch;
        return {
          ...JSON.parse(JSON.stringify(node)),
          id: newId,
          x: nx,
          y: ny,
        };
      });

      const newWires: CircuitWire[] = clip.wires
        .filter((w) => idMap.has(w.from.node) && idMap.has(w.to.node))
        .map((w) => ({
          id: idCounterRef.current++,
          from: {
            node: idMap.get(w.from.node)!,
            port: w.from.port,
            ...(w.from.dir ? { dir: w.from.dir } : {}),
          },
          to: {
            node: idMap.get(w.to.node)!,
            port: w.to.port,
            ...(w.to.dir ? { dir: w.to.dir } : {}),
          },
          midX: w.midX !== undefined ? w.midX + dx : undefined,
        }));

      const nextNodes = [...nodesRef.current, ...newNodes];
      const nextWires = [...wiresRef.current, ...newWires];

      const { updatedNodes, outs } = evaluateCircuit(nextNodes, nextWires);
      setNodes(updatedNodes);
      setWires(nextWires);
      pushWaveformSnapshot(updatedNodes, outs);

      const newIds = newNodes.map((n) => n.id);
      setSelectedNodeIds(newIds);
      setSelectedWireIds(newWires.map((w) => w.id));
      if (newIds.length === 1) {
        setSelected({ type: "node", id: newIds[0] });
        setIsPropertySidebarOpen(true);
      } else {
        setSelected(null);
      }

      // Step center forward by +40, +40 so consecutive paste calls cascade cleanly
      setClipboard((prev) => (prev ? { ...prev, center: { x: targetX, y: targetY } } : null));

      showClipboardNotice(
        `Pasted ${newNodes.length} component${newNodes.length === 1 ? "" : "s"}${
          newWires.length > 0
            ? ` & ${newWires.length} wire${newWires.length === 1 ? "" : "s"}`
            : ""
        }`
      );
    },
    [
      clipboard,
      mouseWorld,
      snapToGrid,
      gridPitch,
      evaluateCircuit,
      pushWaveformSnapshot,
      showClipboardNotice,
    ]
  );

  const handleDuplicate = useCallback(() => {
    const currentNodes = nodesRef.current;
    const hasCopied = handleCopy();
    if (!hasCopied) return;

    let cx = 0;
    let cy = 0;
    if (selectedNodeIds.length > 0) {
      const selNodes = currentNodes.filter((n) => selectedNodeIds.includes(n.id));
      if (selNodes.length > 0) {
        cx =
          (Math.min(...selNodes.map((n) => n.x)) +
            Math.max(...selNodes.map((n) => n.x))) /
          2;
        cy =
          (Math.min(...selNodes.map((n) => n.y)) +
            Math.max(...selNodes.map((n) => n.y))) /
          2;
      }
    } else if (selected?.type === "node") {
      const n = currentNodes.find((x) => x.id === selected.id);
      if (n) {
        cx = n.x;
        cy = n.y;
      }
    }

    handlePaste({ x: cx + 40, y: cy + 40 });
  }, [handleCopy, handlePaste, selected, selectedNodeIds]);

  const handleSelectAll = useCallback(() => {
    const allNodeIds = nodesRef.current.map((n) => n.id);
    const allWireIds = wiresRef.current.map((w) => w.id);
    setSelectedNodeIds(allNodeIds);
    setSelectedWireIds(allWireIds);
    setSelected(null);
    showClipboardNotice(
      `Selected all: ${allNodeIds.length} components, ${allWireIds.length} wires`
    );
  }, [showClipboardNotice]);

  const handleSelectConnectedSubcircuit = useCallback(
    (startNodeId?: number) => {
      const currentNodes = nodesRef.current;
      const currentWires = wiresRef.current;
      const targetId =
        startNodeId ??
        (selected?.type === "node" ? selected.id : selectedNodeIds[0]);

      if (!targetId || !currentNodes.some((n) => n.id === targetId)) {
        showClipboardNotice(
          "Select a component first to trace its connected sub-circuit"
        );
        return;
      }

      // Breadth-First Search through interconnecting wires
      const visited = new Set<number>([targetId]);
      const queue = [targetId];

      while (queue.length > 0) {
        const curr = queue.shift()!;
        currentWires.forEach((w) => {
          let neighbor: number | null = null;
          if (w.from.node === curr) neighbor = w.to.node;
          else if (w.to.node === curr) neighbor = w.from.node;

          if (
            neighbor !== null &&
            !visited.has(neighbor) &&
            currentNodes.some((n) => n.id === neighbor)
          ) {
            visited.add(neighbor);
            queue.push(neighbor);
          }
        });
      }

      const subNodeIds = Array.from(visited);
      const subWireIds = currentWires
        .filter((w) => visited.has(w.from.node) && visited.has(w.to.node))
        .map((w) => w.id);

      setSelectedNodeIds(subNodeIds);
      setSelectedWireIds(subWireIds);
      if (subNodeIds.length === 1) {
        setSelected({ type: "node", id: subNodeIds[0] });
      } else {
        setSelected(null);
      }

      showClipboardNotice(
        `Selected connected sub-circuit: ${subNodeIds.length} component${
          subNodeIds.length === 1 ? "" : "s"
        }, ${subWireIds.length} wire${subWireIds.length === 1 ? "" : "s"}`
      );
    },
    [selected, selectedNodeIds, showClipboardNotice]
  );

  const computeCriticalInstrumentTargets = useCallback(
    (
      targetNodes: CircuitNode[],
      targetWires: CircuitWire[],
      sampleHistory?: LogicTimingSample[]
    ) => {
      const nodeById = new Map<number, CircuitNode>();
      targetNodes.forEach((n) => nodeById.set(n.id, n));

      // Compute empirical switching/toggle frequency per wire from simulation samples
      const toggleRateByWireId = new Map<number, number>();
      if (sampleHistory && sampleHistory.length > 1) {
        const stepsCount = sampleHistory.length - 1;
        targetWires.forEach((w) => {
          let transitions = 0;
          for (let i = 1; i < sampleHistory.length; i++) {
            const prev = sampleHistory[i - 1].netValues[w.id];
            const curr = sampleHistory[i].netValues[w.id];
            if (prev !== undefined && curr !== undefined && prev !== curr) {
              transitions++;
            }
          }
          toggleRateByWireId.set(w.id, transitions / stepsCount);
        });
      }

      const CLOCK_LABEL_RE = /\b(CLK|CLOCK|XTAL|OSC|SCLK|SCK|MCLK|BCLK|PWM|SYNC)\b|CLK|CLOCK|OSC/i;
      const DATA_LABEL_RE =
        /^(D\d*|Q\d*|QA|QB|QC|QD|A\d*|B\d*|S\d*|Y\d*|OUT\d*|DATA|SDA|SCL|MOSI|MISO|TX|RX|BIT\d*|SUM|COUT|C_OUT|Z\d*|CNT\d*)$/i;

      const analyzeWire = (w: CircuitWire) => {
        const src = nodeById.get(w.from.node);
        const dst = nodeById.get(w.to.node);
        const srcLbl = (src?.label || "").trim();
        const dstLbl = (dst?.label || "").trim();
        const srcPinName =
          src && COMP_SPECS[src.type]
            ? COMP_SPECS[src.type].outputs[w.from.port]?.name || ""
            : "";
        const dstPinName =
          dst && COMP_SPECS[dst.type]
            ? COMP_SPECS[dst.type].inputs[w.to.port]?.name || ""
            : "";

        const feedsClockPin = Boolean(
          dst && COMP_SPECS[dst.type]?.clockPorts?.includes(w.to.port)
        );
        const isClockSource =
          src?.type === "CLOCK" ||
          src?.type === "XTAL" ||
          src?.type === "TIMER_555" ||
          src?.type === "AC_SINE" ||
          src?.type === "AC_SOURCE" ||
          src?.type === "AC_VOLTAGE_SOURCE" ||
          src?.type === "TRANSFORMER";

        const isClockLine =
          isClockSource ||
          feedsClockPin ||
          CLOCK_LABEL_RE.test(`${srcLbl} ${dstLbl} ${srcPinName} ${dstPinName}`);

        const toggleRate = toggleRateByWireId.get(w.id) ?? 0;
        const paramFreqHz = Math.max(
          src?.analogParams?.frequencyHz ?? 0,
          dst?.analogParams?.frequencyHz ?? 0
        );
        const freqBoost =
          paramFreqHz > 0 ? Math.min(28, Math.round(Math.log10(paramFreqHz + 1) * 7)) : 0;

        const isDataLineLabel =
          DATA_LABEL_RE.test(srcLbl) ||
          DATA_LABEL_RE.test(dstLbl) ||
          DATA_LABEL_RE.test(srcPinName);

        const isHighFreqDataLine =
          !isClockLine &&
          (toggleRate >= 0.25 ||
            paramFreqHz >= 10 ||
            isDataLineLabel ||
            Boolean(src && COMP_SPECS[src.type]?.seq));

        let score = 0;

        // Tier 1: Clocks, Oscillators & Flip-Flop/Counter Clock Inputs
        if (isClockSource) score += 95;
        if (feedsClockPin) score += 75;
        if (CLOCK_LABEL_RE.test(`${srcLbl} ${srcPinName} ${dstLbl} ${dstPinName}`)) {
          score += 55;
        }

        // Tier 2: Measured High-Frequency Switching & Configured Frequency
        score += Math.round(toggleRate * 85) + freqBoost;
        if (isHighFreqDataLine) score += 32;

        // Tier 3: Primary Outputs, Displays & Active Sequential / Combinational Data Stages
        if (
          dst?.type === "OUTPUT" ||
          dst?.type?.startsWith("LED") ||
          dst?.type === "7SEG" ||
          dst?.type === "BUZZER" ||
          dst?.type === "DC_MOTOR" ||
          src?.type === "BRIDGE_RECT" ||
          dst?.type === "BRIDGE_RECT" ||
          dst?.type === "VOLTMETER" ||
          dst?.type === "AMMETER"
        ) {
          score += 24;
        }

        if (
          (src && COMP_SPECS[src.type]?.seq) ||
          src?.type === "7483" ||
          src?.type === "74193" ||
          src?.type === "74194" ||
          src?.type === "MUX4" ||
          src?.type === "XOR" ||
          src?.type === "AND" ||
          src?.type === "NAND"
        ) {
          score += 18;
        }

        // Tier 4: Analog & Semiconductor Stages
        if (
          src?.type === "DIODE_1N4007" ||
          dst?.type === "DIODE_1N4007" ||
          src?.type === "OPAMP_741" ||
          dst?.type === "OPAMP_741" ||
          src?.type === "LM358" ||
          src?.type === "BC547" ||
          src?.type === "MOSFET_N" ||
          src?.type === "CAP_POL" ||
          dst?.type === "CAP_POL" ||
          src?.type === "RES" ||
          dst?.type === "RES"
        ) {
          score += 15;
        }

        // Tier 5: Primary Digital Inputs
        if (
          src?.type === "INPUT" ||
          src?.type === "SWITCH_SPST" ||
          src?.type === "PUSHBUTTON"
        ) {
          score += 20;
        }

        // Deprioritize static DC power rails & GND return paths
        if (
          (src?.type === "VCC" ||
            src?.type === "VCC_5V" ||
            src?.type === "VCC_12V" ||
            src?.type === "BATTERY") &&
          toggleRate === 0
        ) {
          score -= 18;
        }
        if (src?.type === "GND" || dst?.type === "GND") {
          score -= 45;
        }

        return { wire: w, score, isClockLine, isHighFreqDataLine };
      };

      const analyzed = targetWires
        .map((w) => analyzeWire(w))
        .sort((a, b) => b.score - a.score);

      // Smart-Sync First 4 Channels (CH1..CH4):
      // Prioritize distinct driver nets (`from.node:from.port`) so CH1..CH4 capture
      // the primary clocks and highest-frequency distinct data lines without duplicate fan-out copies.
      const seenDriverNets = new Set<string>();
      const smartFirst4: typeof analyzed = [];
      for (const item of analyzed) {
        const netKey = `${item.wire.from.node}:${item.wire.from.port}`;
        if (!seenDriverNets.has(netKey)) {
          seenDriverNets.add(netKey);
          smartFirst4.push(item);
          if (smartFirst4.length >= 4) break;
        }
      }
      if (smartFirst4.length < 4) {
        for (const item of analyzed) {
          if (!smartFirst4.some((s) => s.wire.id === item.wire.id)) {
            smartFirst4.push(item);
            if (smartFirst4.length >= 4) break;
          }
        }
      }

      const probes: AttachedWireProbe[] = smartFirst4.map((item, idx) => ({
        channelId: PROBE_CHANNELS[idx].channelId,
        wireId: item.wire.id,
        tPos: 0.35 + (idx % 3) * 0.16,
      }));

      const first4Ids = new Set(smartFirst4.map((s) => s.wire.id));
      const remainingWires = analyzed
        .filter((s) => !first4Ids.has(s.wire.id))
        .slice(0, 6)
        .map((s) => s.wire.id);
      const analyzerWireIds = [
        ...smartFirst4.map((s) => s.wire.id),
        ...remainingWires,
      ];

      const clockCount = smartFirst4.filter((s) => s.isClockLine).length;
      const highFreqCount = smartFirst4.filter(
        (s) => !s.isClockLine && s.isHighFreqDataLine
      ).length;

      const scoreNode = (n: CircuitNode) => {
        if (n.type === "CLOCK" || n.type === "AC_SINE" || n.type === "TIMER_555")
          return 45;
        if (n.type === "OUTPUT" || n.type?.startsWith("LED")) return 32;
        if (n.type === "INPUT") return 26;
        if (COMP_SPECS[n.type]?.seq) return 24;
        if (n.type === "GND") return -10;
        return 12;
      };
      const timingNodeIds = [...targetNodes]
        .filter((n) => n.type !== "GND")
        .sort((a, b) => scoreNode(b) - scoreNode(a))
        .slice(0, 8)
        .map((n) => n.id);

      return {
        probes,
        analyzerWireIds,
        timingNodeIds,
        smartSyncStats: { clockCount, highFreqCount },
      };
    },
    []
  );

  const loadCircuitDefs = useCallback(
    (title: string, defs: PresetNodeDef[], wireDefs: PresetWireDef[]) => {
      idCounterRef.current = 1;
      prevOutsRef.current = {};
      sweepStepRef.current = 0;
      const newNodes: CircuitNode[] = defs.map((d) => {
        const n: CircuitNode = {
          id: idCounterRef.current++,
          type: d.type,
          x: d.x,
          y: d.y,
          label: d.label,
          analogParams: d.analogParams ? { ...d.analogParams } : undefined,
        };
        if (d.type === "INPUT" || d.type === "CLOCK") n.value = d.value ?? 0;
        if (COMP_SPECS[d.type]?.seq) {
          n.state = { ...(COMP_SPECS[d.type].init || {}) };
          if (d.type === "CLOCK" && d.value !== undefined) {
            n.state.clk = d.value ? 1 : 0;
          }
          n.prevClk = {};
        }
        return n;
      });

      const newWires: CircuitWire[] = wireDefs.map((w) => ({
        id: idCounterRef.current++,
        from: { node: newNodes[w[0]].id, port: w[1], ...(w[4] ? { dir: w[4] } : {}) },
        to: { node: newNodes[w[2]].id, port: w[3], ...(w[5] ? { dir: w[5] } : {}) },
      }));

      // Pre-seed 8 real-time waveform steps so Oscilloscope & Logic Analyzer plot immediately
      const inputNodesList = newNodes.filter((n) => n.type === "INPUT");
      const hasClockOrSeq = newNodes.some(
        (n) => n.type === "CLOCK" || COMP_SPECS[n.type]?.seq
      );
      const seedSamples: RealtimeWaveformSample[] = [];
      const seedWaveHist: { step: number; signals: Record<string, number> }[] = [];
      const seedAnalyzerHist: LogicTimingSample[] = [];
      const seedNodeTimingHist: NodeTimingSample[] = [];
      let simNodes: CircuitNode[] = newNodes.map((n) => ({
        ...n,
        state: n.state ? { ...n.state } : undefined,
        prevClk: n.prevClk ? { ...n.prevClk } : undefined,
      }));

      const numSeedSteps =
        inputNodesList.length > 0 ? 8 : hasClockOrSeq ? 6 : 1;
      for (let s = 0; s < numSeedSteps; s++) {
        const isLast = s === numSeedSteps - 1;
        const stepNodes = simNodes.map((n) => {
          if (n.type === "CLOCK") {
            const clkVal = isLast ? (newNodes.find((o) => o.id === n.id)?.value ?? 0) : s % 2;
            return {
              ...n,
              value: clkVal,
              state: { ...(n.state || {}), clk: clkVal },
            };
          }
          if (n.type !== "INPUT") return n;
          if (isLast) {
            const orig = newNodes.find((o) => o.id === n.id);
            return { ...n, value: orig?.value ?? 0 };
          }
          const inpIdx = inputNodesList.findIndex((x) => x.id === n.id);
          // Vary primary inputs cleanly while keeping active-low CLR/PRE/LOAD/G2 inactive
          if (
            n.label?.includes("CLR1") ||
            n.label?.includes("CLR2") ||
            n.label?.includes("PRE") ||
            n.label?.includes("LOAD") ||
            n.label === "G1"
          ) {
            return { ...n, value: 1 };
          }
          if (
            n.label === "CLR" ||
            n.label?.includes("G2") ||
            n.label === "LT" ||
            n.label === "BI"
          ) {
            return { ...n, value: 0 };
          }
          const bit = inpIdx < 4 ? (s >> inpIdx) & 1 : n.value ?? 0;
          return { ...n, value: bit };
        });

        const { updatedNodes: evalN, outs: evalO } = evaluateCircuit(
          stepNodes,
          newWires
        );
        simNodes = evalN;

        const pathVals = extractSignalPathValues(evalN, newWires, evalO);
        seedSamples.push({
          step: s + 1,
          timeLabel: `t${s + 1}`,
          timestampMs: Date.now() + s * 100,
          values: pathVals,
        });

        const sigs: Record<string, number> = {};
        evalN
          .filter((x) => x.type === "INPUT")
          .slice(0, 8)
          .forEach((inp, idx) => {
            sigs[inp.label || `I${idx + 1}`] = inp.value ? 1 : 0;
          });
        evalN
          .filter((x) => x.type === "OUTPUT")
          .slice(0, 10)
          .forEach((outp, idx) => {
            sigs[outp.label || `O${idx + 1}`] = evalO[outp.id]?.[0] ?? 0;
          });

        const stepNetVals: Record<number, 0 | 1> = {};
        newWires.forEach((w) => {
          const srcNode = evalN.find((n) => n.id === w.from.node);
          const val =
            srcNode?.type === "INPUT"
              ? srcNode.value
                ? 1
                : 0
              : evalO[w.from.node]?.[w.from.port] ?? 0;
          const bitVal: 0 | 1 = val === 1 ? 1 : 0;
          stepNetVals[w.id] = bitVal;
          sigs[`w_${w.id}`] = bitVal === 1 ? 5.0 : 0.0;
        });

        seedWaveHist.push({ step: s + 1, signals: sigs });
        seedAnalyzerHist.push({
          step: s + 1,
          timeLabel: `T${s + 1}`,
          netValues: stepNetVals,
        });

        const stepNodeVals: Record<number, number> = {};
        evalN.forEach((n) => {
          stepNodeVals[n.id] =
            n.type === "INPUT" || n.type === "CLOCK"
              ? n.value
                ? 1
                : 0
              : evalO[n.id]?.[0] ?? 0;
        });
        seedNodeTimingHist.push({
          step: s + 1,
          timestampMs: Date.now() + s * 100,
          timeLabel: `T${s + 1}`,
          nodeValues: stepNodeVals,
        });
      }

      prevOutsRef.current = {};
      const { updatedNodes, outs } = evaluateCircuit(newNodes, newWires);
      prevOutsRef.current = outs;
      setNodes(updatedNodes);
      setWires(newWires);
      setSelected(null);
      setPendingWire(null);
      setPan({ x: 0, y: 0 });
      setActivePreset(title);
      setWaveformHistory(seedWaveHist);
      setRechartsSamples(seedSamples);
      setAnalyzerHistory(
        seedAnalyzerHist.length > 0
          ? seedAnalyzerHist
          : [{ step: 1, timeLabel: "T1", netValues: {} }]
      );

      if (autoSyncInstrumentsRef.current) {
        const targets = computeCriticalInstrumentTargets(
          updatedNodes,
          newWires,
          seedAnalyzerHist
        );
        setAttachedProbes(targets.probes);
        setSelectedWireIdsForAnalyzer(targets.analyzerWireIds);
        setSelectedNodeIdsForTiming(targets.timingNodeIds);
      } else {
        setAttachedProbes([]);
        const autoSelectedNodes: number[] = [];
        updatedNodes.forEach((n) => {
          if (n.type === "INPUT" || n.type === "CLOCK" || n.type === "OUTPUT") {
            autoSelectedNodes.push(n.id);
          } else if (autoSelectedNodes.length < 8) {
            autoSelectedNodes.push(n.id);
          }
        });
        setSelectedNodeIdsForTiming(autoSelectedNodes);
      }

      setNodeTimingHistory(
        seedNodeTimingHist.length > 0
          ? seedNodeTimingHist
          : [
              {
                step: 1,
                timestampMs: Date.now(),
                timeLabel: "T1",
                nodeValues: {},
              },
            ]
      );

      // Seed the 500ms transition overlay buffer cleanly across [now - 450ms, now]
      const seedNow = Date.now();
      if (seedNodeTimingHist.length > 0) {
        const span = seedNodeTimingHist.length > 1 ? 450 : 0;
        const seeded500ms: TimingTransitionSample[] = seedNodeTimingHist.map(
          (entry, idx) => ({
            timestampMs:
              seedNodeTimingHist.length > 1
                ? seedNow - span + Math.round((idx / (seedNodeTimingHist.length - 1)) * span)
                : seedNow,
            values: { ...entry.nodeValues },
          })
        );
        setTiming500msHistory(seeded500ms);
      } else {
        const initialVals: Record<number, number> = {};
        updatedNodes.forEach((n) => {
          initialVals[n.id] =
            n.type === "INPUT" || n.type === "CLOCK"
              ? n.value
                ? 1
                : 0
              : outs[n.id]?.[0] ?? 0;
        });
        setTiming500msHistory([{ timestampMs: seedNow, values: initialVals }]);
      }
      setTimingWindowNowMs(seedNow);
    },
    [evaluateCircuit, computeCriticalInstrumentTargets]
  );

  // Sync instruments automatically when simulation starts (if Auto-Sync is enabled)
  const prevSimRunForSyncRef = useRef<boolean>(isSimRunning);
  useEffect(() => {
    const justStarted = !prevSimRunForSyncRef.current && isSimRunning;
    prevSimRunForSyncRef.current = isSimRunning;
    if (!justStarted || !autoSyncInstrumentsRef.current) return;

    const curNodes = nodesRef.current;
    const curWires = wiresRef.current;
    if (curNodes.length === 0 || curWires.length === 0) return;

    const targets = computeCriticalInstrumentTargets(
      curNodes,
      curWires,
      analyzerHistoryRef.current
    );
    setAttachedProbes(targets.probes);
    setSelectedWireIdsForAnalyzer(targets.analyzerWireIds);
    setSelectedNodeIdsForTiming(targets.timingNodeIds);

    const { updatedNodes, outs } = evaluateCircuit(curNodes, curWires);
    pushWaveformSnapshot(updatedNodes, outs);
  }, [
    isSimRunning,
    computeCriticalInstrumentTargets,
    evaluateCircuit,
    pushWaveformSnapshot,
  ]);

  // Check auto-saved session on mount (canvas starts clean and empty by default for students)
  useEffect(() => {
    const saved = getAutoSavedCircuit();
    if (saved && saved.nodes && saved.nodes.length > 0) {
      setAutoSaveRecoveryPrompt(saved);
    }
  }, []);

  // Synchronize armed nets for the logic analyzer when wires change
  useEffect(() => {
    if (wires.length === 0) return;
    setSelectedWireIdsForAnalyzer((prev) => {
      const valid = prev.filter((id) => wires.some((w) => w.id === id));
      if (valid.length > 0) return valid;
      if (autoSyncInstrumentsRef.current) {
        return computeCriticalInstrumentTargets(
          nodesRef.current,
          wires,
          analyzerHistoryRef.current
        ).analyzerWireIds;
      }
      return wires.slice(0, 6).map((w) => w.id);
    });
  }, [wires, computeCriticalInstrumentTargets]);

  // Periodic Auto-Save Effect (persists to localStorage every 12 seconds when enabled & modified)
  const lastSavedSigRef = useRef<string>("");
  useEffect(() => {
    if (!autoSaveEnabled || nodes.length === 0) return;
    const interval = setInterval(() => {
      const curSig = `${nodes.length}:${wires.length}:${activePreset}:${circuitElectricalHash}`;
      if (curSig === lastSavedSigRef.current) return;
      const success = saveCircuitToLocalStorage(activePreset, nodes, wires, activePreset);
      if (success) {
        lastSavedSigRef.current = curSig;
        setLastAutoSaveTimestamp(Date.now());
      }
    }, 12000);

    const handleBeforeUnload = () => {
      if (nodes.length > 0 && autoSaveEnabled) {
        saveCircuitToLocalStorage(activePreset, nodes, wires, activePreset);
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [autoSaveEnabled, nodes, wires, activePreset, circuitElectricalHash]);

  // Auto-Save Actions
  const handleRestoreAutoSavedSession = useCallback(() => {
    if (!autoSaveRecoveryPrompt) return;
    loadCircuitDefs(
      autoSaveRecoveryPrompt.title || "Restored Session",
      autoSaveRecoveryPrompt.nodes,
      autoSaveRecoveryPrompt.wires
    );
    setAutoSaveRecoveryPrompt(null);
    setAutoSaveNotice("Auto-saved session successfully restored!");
    setTimeout(() => setAutoSaveNotice(null), 4000);
  }, [autoSaveRecoveryPrompt, loadCircuitDefs]);

  const handleManualSaveSnapshot = useCallback(() => {
    if (nodes.length === 0) return;
    const success = saveCircuitToLocalStorage(activePreset, nodes, wires, activePreset);
    if (success) {
      setLastAutoSaveTimestamp(Date.now());
      const issueCount = compulsoryViolations.length + openCircuitIssues.length;
      setAutoSaveNotice("Circuit snapshot saved to localStorage!");
      onLogSimulationActivity?.(
        issueCount > 0
          ? `Saved Snapshot (${issueCount} issue${issueCount > 1 ? "s" : ""})`
          : "Saved Snapshot",
        activePreset || "Custom Schematic",
        issueCount > 0 ? "WARN" : "PASS"
      );
      setTimeout(() => setAutoSaveNotice(null), 3000);
    }
  }, [nodes, wires, activePreset, onLogSimulationActivity, compulsoryViolations.length, openCircuitIssues.length]);

  // Load session version snapshots on mount
  useEffect(() => {
    setSessionSnapshots(getSessionVersionSnapshots());
  }, []);

  // Session Version Snapshots Actions
  const handleCreateVersionSnapshot = useCallback(() => {
    if (nodes.length === 0) return;
    const snap = saveSessionVersionSnapshot(
      newSnapshotName,
      activePreset,
      nodes,
      wires
    );
    if (snap) {
      setSessionSnapshots(getSessionVersionSnapshots());
      setNewSnapshotName("");
      setCircuitVerifyNotice({
        type: "success",
        text: `Version snapshot "${snap.name}" saved successfully!`,
      });
      onLogSimulationActivity?.("Created Version", snap.name, "INFO");
      setTimeout(() => setCircuitVerifyNotice(null), 3500);
    }
  }, [nodes, wires, activePreset, newSnapshotName, onLogSimulationActivity]);

  const handleRestoreVersionSnapshot = useCallback(
    (snap: CircuitVersionSnapshot) => {
      loadCircuitDefs(snap.name, snap.nodes, snap.wires);
      setIsVersionMenuOpen(false);
      setCircuitVerifyNotice({
        type: "success",
        text: `Restored snapshot "${snap.name}" (${snap.componentCount} components, ${snap.wireCount} wires).`,
      });
      setTimeout(() => setCircuitVerifyNotice(null), 3500);
    },
    [loadCircuitDefs]
  );

  const handleDeleteVersionSnapshot = useCallback((id: string) => {
    deleteSessionVersionSnapshot(id);
    setSessionSnapshots(getSessionVersionSnapshots());
  }, []);

  const handleClearAllVersionSnapshots = useCallback(() => {
    clearAllSessionVersionSnapshots();
    setSessionSnapshots([]);
  }, []);

  const handleClearSavedState = useCallback(() => {
    clearAutoSavedCircuit();
    setAutoSaveRecoveryPrompt(null);
    setLastAutoSaveTimestamp(null);
    setAutoSaveNotice("Auto-save storage cleared.");
    setTimeout(() => setAutoSaveNotice(null), 3000);
  }, []);

  // Compute detailed descriptor for all wire nets
  const logicNetsList: LogicNetDescriptor[] = useMemo(() => {
    return wires.map((w) => {
      const srcNode = nodes.find((n) => n.id === w.from.node);
      const tgtNode = nodes.find((n) => n.id === w.to.node);

      let srcPinName = `P${w.from.port}`;
      if (srcNode?.type === "INPUT") {
        srcPinName = "OUT";
      } else if (srcNode && COMP_SPECS[srcNode.type]) {
        srcPinName =
          COMP_SPECS[srcNode.type].outputs[w.from.port]?.name ||
          `Y${w.from.port}`;
      } else if (srcNode && GATE_SPECS[srcNode.type]) {
        srcPinName = "Y";
      }

      let tgtPinName = `P${w.to.port}`;
      if (tgtNode?.type === "OUTPUT") {
        tgtPinName = "IN";
      } else if (tgtNode && COMP_SPECS[tgtNode.type]) {
        tgtPinName =
          COMP_SPECS[tgtNode.type].inputs[w.to.port]?.name || `In${w.to.port}`;
      } else if (tgtNode && GATE_SPECS[tgtNode.type]) {
        tgtPinName = tgtNode.type === "NOT" ? "A" : w.to.port === 0 ? "A" : "B";
      }

      const srcLabel =
        srcNode?.label || srcNode?.type || `Node_${w.from.node}`;
      const tgtLabel =
        tgtNode?.label || tgtNode?.type || `Node_${w.to.node}`;

      const currentLogic: 0 | 1 =
        srcNode?.type === "INPUT"
          ? srcNode.value
            ? 1
            : 0
          : (prevOutsRef.current[w.from.node]?.[w.from.port] ?? 0) === 1
          ? 1
          : 0;

      return {
        wireId: w.id,
        netName: `${srcLabel}:${srcPinName} → ${tgtLabel}:${tgtPinName}`,
        sourceLabel: srcLabel,
        targetLabel: tgtLabel,
        sourceType: srcNode?.type || "UNKNOWN",
        targetType: tgtNode?.type || "UNKNOWN",
        currentLogic,
      };
    });
  }, [wires, nodes]);

  // Subscribable wire signals for the full-featured LogicAnalyzerModal
  const allWireSignals: SubscribableWireSignal[] = useMemo(() => {
    return logicNetsList.map((net, idx) => {
      const w = wires.find((x) => x.id === net.wireId);
      const tgtNode = w ? nodes.find((n) => n.id === w.to.node) : undefined;
      const feedsClkPort = Boolean(
        w && tgtNode && COMP_SPECS[tgtNode.type]?.clockPorts?.includes(w.to.port)
      );
      return {
        wireId: net.wireId,
        channelIndex: idx,
        netName: net.netName,
        sourceLabel: net.sourceLabel,
        targetLabel: net.targetLabel,
        sourceNodeId: w ? w.from.node : 0,
        sourcePort: w ? w.from.port : 0,
        targetNodeId: w ? w.to.node : 0,
        targetPort: w ? w.to.port : 0,
        isClockLine:
          net.sourceType === "CLOCK" ||
          net.sourceType === "TIMER_555" ||
          net.sourceType === "XTAL" ||
          feedsClkPort ||
          net.sourceLabel.toLowerCase().includes("clk") ||
          net.targetLabel.toLowerCase().includes("clk"),
        isInputDriven: net.sourceType === "INPUT",
        isOutputTarget: net.targetType === "OUTPUT",
        stageDepth: 1,
        delayNs: 5,
        currentLogic: net.currentLogic,
        color: LA_CHANNEL_PALETTE[idx % LA_CHANNEL_PALETTE.length],
        stepSamples: analyzerHistory.map((s) => s.netValues[net.wireId] ?? 0),
      };
    });
  }, [logicNetsList, wires, nodes, analyzerHistory]);

  // Map of schematic nodes currently captured by the Oscilloscope probes or Logic Analyzer channels
  const capturedNodeInstrumentsMap = useMemo(() => {
    const map = new Map<
      number,
      { scopeChannels: string[]; analyzerChannels: number[] }
    >();
    const ensure = (nodeId: number) => {
      let entry = map.get(nodeId);
      if (!entry) {
        entry = { scopeChannels: [], analyzerChannels: [] };
        map.set(nodeId, entry);
      }
      return entry;
    };

    attachedProbes.forEach((probe) => {
      const w = wires.find((item) => item.id === probe.wireId);
      if (!w) return;
      [w.from.node, w.to.node].forEach((nid) => {
        const entry = ensure(nid);
        if (!entry.scopeChannels.includes(probe.channelId)) {
          entry.scopeChannels.push(probe.channelId);
        }
      });
    });

    selectedWireIdsForAnalyzer.forEach((wireId, idx) => {
      const w = wires.find((item) => item.id === wireId);
      if (!w) return;
      const chNum = idx + 1;
      [w.from.node, w.to.node].forEach((nid) => {
        const entry = ensure(nid);
        if (!entry.analyzerChannels.includes(chNum)) {
          entry.analyzerChannels.push(chNum);
        }
      });
    });

    return map;
  }, [attachedProbes, selectedWireIdsForAnalyzer, wires]);


  // Load external circuit if synthesized from K-Map solver or Core Simulators
  useEffect(() => {
    if (externalCircuit) {
      loadCircuitDefs(
        externalCircuit.title,
        externalCircuit.nodes,
        externalCircuit.wires
      );
      if (onClearExternalCircuit) {
        onClearExternalCircuit();
      }
    }
  }, [externalCircuit, loadCircuitDefs, onClearExternalCircuit]);

  // Auto-clear halt alert toast
  useEffect(() => {
    if (!haltAlertToast) return;
    const t = setTimeout(() => setHaltAlertToast(null), 4500);
    return () => clearTimeout(t);
  }, [haltAlertToast]);

  // Auto-Fix helper: creates an INPUT switch and wires it directly to the missing compulsory gate port
  const handleAutoFixMissingPin = useCallback(
    (nodeId: number, targetPort: number) => {
      const targetNode = nodes.find((n) => n.id === nodeId);
      if (!targetNode) return;

      const newSwitchId = ++idCounterRef.current;
      const pinYOffset = targetPort === 0 ? 15 : 35;
      const switchX = Math.max(30, targetNode.x - 140);
      const switchY = Math.max(30, targetNode.y + pinYOffset - 25);

      const newSwitchNode: CircuitNode = {
        id: newSwitchId,
        type: "INPUT",
        x: switchX,
        y: switchY,
        value: 0,
        label: targetPort === 0 ? `In_A` : `In_B`,
      };

      const newWire: CircuitWire = {
        id: ++idCounterRef.current,
        from: { node: newSwitchId, port: 0 },
        to: { node: nodeId, port: targetPort },
      };

      const nextNodes = [...nodes, newSwitchNode];
      const nextWires = [...wires, newWire];

      const { updatedNodes, outs } = evaluateCircuit(nextNodes, nextWires);
      setNodes(updatedNodes);
      setWires(nextWires);
      setSelected({ type: "node", id: newSwitchId });
      pushWaveformSnapshot(updatedNodes, outs);
    },
    [nodes, wires, evaluateCircuit, pushWaveformSnapshot]
  );

  // Apply truth table row input combination directly to circuit switches
  const handleApplyRowInputs = useCallback(
    (ins: number[]) => {
      const currentNodes = nodesRef.current;
      const currentWires = wiresRef.current;
      const inputs = currentNodes.filter((n) => n.type === "INPUT");
      if (inputs.length === 0) return;

      const nextNodes = currentNodes.map((n) => {
        if (n.type !== "INPUT") return n;
        const idx = inputs.findIndex((x) => x.id === n.id);
        if (idx === -1 || idx >= ins.length) return n;
        return { ...n, value: ins[idx] };
      });

      const { updatedNodes, outs } = evaluateCircuit(nextNodes, currentWires);
      setNodes(updatedNodes);
      pushWaveformSnapshot(updatedNodes, outs);
    },
    [evaluateCircuit, pushWaveformSnapshot]
  );

  // Step Clock / Auto Clock handler
  const pulseClockInputs = useCallback(() => {
    const currentNodes = nodesRef.current;
    const currentWires = wiresRef.current;

    // Check if simulation is halted due to missing compulsory gate inputs
    const currentViolations = detectCompulsoryGateViolations(
      currentNodes,
      currentWires
    );
    if (currentViolations.length > 0) {
      const v = currentViolations[0];
      const missLabel = v.missingPorts
        .map((p) => (p === 0 ? "Pin A" : "Pin B"))
        .join(" & ");
      setHaltAlertToast(
        `Simulation halted: ${v.gateLabel} is missing compulsory input (${missLabel}). Wire both inputs before stepping clock.`
      );
      return;
    }

    const clockNodeIds = new Set<number>();
    for (const n of currentNodes) {
      if (n.type === "CLOCK") {
        clockNodeIds.add(n.id);
      }
      if (n.type === "TIMER_555") {
        const trigFromInput = currentWires.some((wire) => {
          if (wire.to.node !== n.id || wire.to.port !== 0) return false;
          const src = currentNodes.find((item) => item.id === wire.from.node);
          return src?.type === "INPUT";
        });
        if (!trigFromInput) {
          clockNodeIds.add(n.id);
        }
      }
      const spec = COMP_SPECS[n.type];
      if (!spec?.seq) continue;
      for (const cp of spec.clockPorts || []) {
        const w = currentWires.find(
          (wire) => wire.to.node === n.id && wire.to.port === cp
        );
        if (w) clockNodeIds.add(w.from.node);
      }
    }

    if (clockNodeIds.size === 0) {
      const firstIn = currentNodes.find((n) => n.type === "INPUT");
      if (firstIn) clockNodeIds.add(firstIn.id);
    }

    if (clockNodeIds.size === 0) return;

    const toggled = currentNodes.map((n) => {
      if (!clockNodeIds.has(n.id)) return n;
      if (n.type === "CLOCK") {
        const nextClk = (n.state?.clk ?? n.value ?? 0) ? 0 : 1;
        return {
          ...n,
          value: nextClk,
          state: { ...(n.state || {}), clk: nextClk },
        };
      }
      if (n.type === "TIMER_555") {
        const nextQ = (n.state?.q ?? n.value ?? 0) ? 0 : 1;
        return {
          ...n,
          value: nextQ,
          state: { ...(n.state || {}), q: nextQ },
        };
      }
      if (n.type === "INPUT") {
        return { ...n, value: (n.value ? 1 : 0) ^ 1 };
      }
      return n;
    });
    const nowMs = performance.now();
    if (lastPulseTsRef.current > 0) {
      const dtSec = (nowMs - lastPulseTsRef.current) / 1000;
      if (dtSec > 0.02 && dtSec < 5) {
        const instHz = Math.min(25, 1 / (dtSec * 2));
        setMeasuredPulseHz((prev) => (prev > 0 ? prev * 0.6 + instHz * 0.4 : instHz));
      } else if (dtSec >= 5) {
        setMeasuredPulseHz(0);
      }
    }
    lastPulseTsRef.current = nowMs;

    const { updatedNodes, outs } = evaluateCircuit(toggled, currentWires);
    setNodes(updatedNodes);
    pushWaveformSnapshot(updatedNodes, outs);
  }, [evaluateCircuit, pushWaveformSnapshot]);

  // Step & Sample Signal Sweep (advances combinational inputs or clocks sequential circuits)
  const triggerSignalSweepStep = useCallback(() => {
    const currentNodes = nodesRef.current;
    const currentWires = wiresRef.current;

    // Halt check
    const currentViolations = detectCompulsoryGateViolations(
      currentNodes,
      currentWires
    );
    if (currentViolations.length > 0) {
      const v = currentViolations[0];
      const missLabel = v.missingPorts
        .map((p) => (p === 0 ? "Pin A" : "Pin B"))
        .join(" & ");
      setHaltAlertToast(
        `Simulation halted: ${v.gateLabel} is missing compulsory input (${missLabel}). Wire both inputs before sampling.`
      );
      return;
    }

    const hasSeqNode = currentNodes.some((n) => COMP_SPECS[n.type]?.seq);
    if (hasSeqNode) {
      pulseClockInputs();
      return;
    }
    const inputs = currentNodes.filter((n) => n.type === "INPUT");
    if (inputs.length === 0) return;
    sweepStepRef.current += 1;
    const mask = sweepStepRef.current;
    const nextNodes = currentNodes.map((n) => {
      if (n.type !== "INPUT") return n;
      const idx = inputs.findIndex((x) => x.id === n.id);
      if (idx < 0 || idx >= 4) return n;
      return { ...n, value: (mask >> idx) & 1 };
    });
    const { updatedNodes, outs } = evaluateCircuit(nextNodes, currentWires);
    setNodes(updatedNodes);
    pushWaveformSnapshot(updatedNodes, outs);
  }, [evaluateCircuit, pulseClockInputs, pushWaveformSnapshot]);

  useEffect(() => {
    if (!autoClock || isSimulationHalted) return;
    const effectiveClockHz = Math.max(0.05, clockHz * simSpeed);
    const intervalMs = Math.max(30, Math.round(1000 / (effectiveClockHz * 2)));
    const timer = setInterval(pulseClockInputs, intervalMs);
    return () => clearInterval(timer);
  }, [autoClock, clockHz, simSpeed, pulseClockInputs, isSimulationHalted]);

  // Keyboard shortcuts for Delete / Escape / Copy / Cut / Paste / Duplicate / Select All
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = document.activeElement?.tagName || "";
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      // Clipboard shortcuts (Ctrl or Meta)
      if (e.ctrlKey || e.metaKey) {
        const key = e.key.toLowerCase();
        if (key === "c") {
          e.preventDefault();
          handleCopy();
          return;
        }
        if (key === "x") {
          e.preventDefault();
          handleCut();
          return;
        }
        if (key === "v") {
          e.preventDefault();
          handlePaste();
          return;
        }
        if (key === "d") {
          e.preventDefault();
          handleDuplicate();
          return;
        }
        if (key === "a") {
          e.preventDefault();
          handleSelectAll();
          return;
        }
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedNodeIds.length > 0 || selectedWireIds.length > 0 || selected) {
          e.preventDefault();
          const nodesToDelete = new Set<number>(selectedNodeIds);
          if (selected?.type === "node") nodesToDelete.add(selected.id);
          const wiresToDelete = new Set<number>(selectedWireIds);
          if (selected?.type === "wire") wiresToDelete.add(selected.id);

          const currentNodes = nodesRef.current;
          const currentWires = wiresRef.current;

          const updatedNodes = currentNodes.filter((n) => !nodesToDelete.has(n.id));
          const updatedWires = currentWires.filter(
            (w) =>
              !wiresToDelete.has(w.id) &&
              !nodesToDelete.has(w.from.node) &&
              !nodesToDelete.has(w.to.node)
          );

          const { updatedNodes: finalNodes, outs } = evaluateCircuit(updatedNodes, updatedWires);
          setNodes(finalNodes);
          setWires(updatedWires);
          pushWaveformSnapshot(finalNodes, outs);

          setSelected(null);
          setSelectedNodeIds([]);
          setSelectedWireIds([]);
          setIsPropertySidebarOpen(false);

          showClipboardNotice(
            `Deleted ${nodesToDelete.size > 0 ? `${nodesToDelete.size} component(s)` : ""}${
              wiresToDelete.size > 0 ? ` ${wiresToDelete.size} wire(s)` : ""
            }`
          );
        }
      } else if (e.key === "Escape") {
        setSelected(null);
        setSelectedNodeIds([]);
        setSelectedWireIds([]);
        setPendingWire(null);
      } else if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        // Arrow keys: Nudge selected components on grid (Shift for 1px micro-nudge)
        const activeIds = selected?.type === "node"
          ? Array.from(new Set([...selectedNodeIds, selected.id]))
          : selectedNodeIds;
        if (activeIds.length > 0) {
          e.preventDefault();
          const step = e.shiftKey ? 1 : (snapToGrid ? gridPitch : 5);
          const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
          const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
          const currentNodes = nodesRef.current;
          const targetSet = new Set(activeIds);
          const updated = currentNodes.map((item) => {
            if (targetSet.has(item.id)) {
              return {
                ...item,
                x: snapToGrid ? Math.round((item.x + dx) / gridPitch) * gridPitch : item.x + dx,
                y: snapToGrid ? Math.round((item.y + dy) / gridPitch) * gridPitch : item.y + dy,
              };
            }
            return item;
          });
          const { updatedNodes, outs } = evaluateCircuit(updated, wiresRef.current);
          setNodes(updatedNodes);
          pushWaveformSnapshot(updatedNodes, outs);
        }
      } else if (e.key === "g" || e.key === "G") {
        setSnapToGrid((prev) => {
          const next = !prev;
          if (next) {
            setNodes((curr) =>
              curr.map((n) => ({
                ...n,
                x: snapValueToGrid(n.x, gridPitch, true),
                y: snapValueToGrid(n.y, gridPitch, true),
              }))
            );
          }
          showClipboardNotice(`Snap-to-Grid: ${next ? "ENABLED" : "DISABLED"} (${gridPitch}px)`);
          return next;
        });
      } else if (e.key === "m" || e.key === "M") {
        setMagneticGuidesEnabled((prev) => {
          const next = !prev;
          showClipboardNotice(`Pin Laser Guides: ${next ? "ENABLED" : "DISABLED"}`);
          return next;
        });
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    selected,
    selectedNodeIds,
    selectedWireIds,
    snapToGrid,
    gridPitch,
    handleCopy,
    handleCut,
    handlePaste,
    handleDuplicate,
    handleSelectAll,
    evaluateCircuit,
    pushWaveformSnapshot,
    showClipboardNotice,
  ]);

  const toWorld = useCallback(
    (clientX: number, clientY: number) => {
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      return {
        x: (clientX - rect.left - pan.x) / canvasZoom,
        y: (clientY - rect.top - pan.y) / canvasZoom,
      };
    },
    [pan, canvasZoom]
  );

  const handleZoom = useCallback((delta: number) => {
    setCanvasZoom((prev) => {
      const next = Math.max(0.35, Math.min(2.5, Math.round((prev + delta) * 100) / 100));
      return next;
    });
  }, []);

  const handleResetZoom = useCallback(() => {
    setCanvasZoom(0.85);
    setPan({ x: 0, y: 0 });
    showClipboardNotice("Reset Zoom (85%) & Centered Canvas");
  }, [showClipboardNotice]);

  // Non-passive native wheel scroll lock when Pin View is enabled (prevents outer page scrolling while panning/zooming)
  useEffect(() => {
    if (!isPinViewEnabled) return;
    const viewport = canvasViewportRef.current;
    if (!viewport) return;

    const handleNativeWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (isBoardLockedRef.current) return;

      if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        setPan((prev) => ({
          x: Math.round(prev.x - (e.deltaX || e.deltaY)),
          y: Math.round(prev.y - (e.shiftKey ? 0 : e.deltaY)),
        }));
      } else {
        const factor = e.deltaY < 0 ? 1.08 : 0.92;
        const rect = svgRef.current?.getBoundingClientRect();
        const prevZoom = canvasZoomRef.current;
        const prevPan = panRef.current;
        const nextZoom = Math.max(0.35, Math.min(2.5, Math.round(prevZoom * factor * 100) / 100));
        if (rect) {
          const mouseScreenX = e.clientX - rect.left;
          const mouseScreenY = e.clientY - rect.top;
          const worldX = (mouseScreenX - prevPan.x) / prevZoom;
          const worldY = (mouseScreenY - prevPan.y) / prevZoom;
          setPan({
            x: Math.round(mouseScreenX - worldX * nextZoom),
            y: Math.round(mouseScreenY - worldY * nextZoom),
          });
        }
        setCanvasZoom(nextZoom);
      }
    };

    viewport.addEventListener("wheel", handleNativeWheel, { passive: false });
    return () => {
      viewport.removeEventListener("wheel", handleNativeWheel);
    };
  }, [isPinViewEnabled]);

  const handleFitToView = useCallback(() => {
    if (nodes.length === 0) {
      setPan({ x: 0, y: 0 });
      setCanvasZoom(0.85);
      return;
    }
    const svgRect = svgRef.current?.getBoundingClientRect();
    const viewW = svgRect?.width || 1000;
    const viewH = svgRect?.height || 600;

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    nodes.forEach((n) => {
      const comp = COMP_SPECS[n.type];
      const spec = GATE_SPECS[n.type];
      const w = comp ? comp.w : spec ? spec.outX : 75;
      const h = comp ? comp.h : 50;
      if (n.x < minX) minX = n.x;
      if (n.x + w > maxX) maxX = n.x + w;
      if (n.y < minY) minY = n.y;
      if (n.y + h > maxY) maxY = n.y + h;
    });

    const cW = maxX - minX + 80;
    const cH = maxY - minY + 80;
    const fitScale = Math.max(0.45, Math.min(1.15, Math.min(viewW / cW, viewH / cH) * 0.9));
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    const roundedScale = Math.round(fitScale * 100) / 100;
    setCanvasZoom(roundedScale);
    setPan({
      x: Math.round(viewW / 2 - centerX * roundedScale),
      y: Math.round(viewH / 2 - centerY * roundedScale),
    });
    showClipboardNotice(`Fitted circuit to screen (${Math.round(roundedScale * 100)}%)`);
  }, [nodes, showClipboardNotice]);

  // Mobile Pinch-to-Zoom and Two-Finger-Pan Touch Gesture Controller
  useEffect(() => {
    const target = canvasViewportRef.current || svgRef.current;
    if (!target) return;

    const handleTouchStart = (evt: Event) => {
      const e = evt as TouchEvent;
      if (e.touches.length === 2) {
        e.preventDefault();
        const t0 = e.touches[0];
        const t1 = e.touches[1];
        const dist = Math.hypot(t0.clientX - t1.clientX, t0.clientY - t1.clientY);
        const midX = (t0.clientX + t1.clientX) / 2;
        const midY = (t0.clientY + t1.clientY) / 2;

        const svgEl = svgRef.current || (target as unknown as SVGSVGElement);
        const rect = svgEl.getBoundingClientRect();
        const focalScreenX = midX - rect.left;
        const focalScreenY = midY - rect.top;

        const currentPan = panRef.current;
        const currentZoom = canvasZoomRef.current;

        const worldFocalX = (focalScreenX - currentPan.x) / currentZoom;
        const worldFocalY = (focalScreenY - currentPan.y) / currentZoom;

        gestureDataRef.current = {
          initialDist: Math.max(dist, 1),
          initialZoom: currentZoom,
          initialPan: { ...currentPan },
          initialMid: { x: midX, y: midY },
          worldFocal: { x: worldFocalX, y: worldFocalY },
        };

        isTwoFingerGesturingRef.current = true;
        setIsTwoFingerGesturing(true);

        // Cancel any pending single-finger node drag or wire construction
        setPendingWire(null);
        setMarqueeBox(null);
        setActiveAlignmentGuides([]);
        setActivelyDraggedNodeId(null);
        setDragCoordBadge(null);
        setIsPanning(false);
      } else if (e.touches.length > 2) {
        e.preventDefault();
      }
    };

    const handleTouchMove = (evt: Event) => {
      const e = evt as TouchEvent;
      if (e.touches.length === 2 && gestureDataRef.current) {
        e.preventDefault();
        const t0 = e.touches[0];
        const t1 = e.touches[1];
        const dist = Math.hypot(t0.clientX - t1.clientX, t0.clientY - t1.clientY);
        const midX = (t0.clientX + t1.clientX) / 2;
        const midY = (t0.clientY + t1.clientY) / 2;

        const g = gestureDataRef.current;
        const distRatio = dist / g.initialDist;

        // Detect predominant gesture mode for student HUD feedback
        const dMidDist = Math.hypot(midX - g.initialMid.x, midY - g.initialMid.y);
        const zoomDelta = Math.abs(distRatio - 1);
        if (zoomDelta > 0.08 && dMidDist < 16) {
          setTwoFingerGestureMode("PINCH");
        } else if (dMidDist > 20 && zoomDelta < 0.05) {
          setTwoFingerGestureMode("PAN");
        } else {
          setTwoFingerGestureMode("COMBINED");
        }

        const rawZoom = g.initialZoom * distRatio;
        const newZoom = Math.max(0.35, Math.min(2.5, Math.round(rawZoom * 100) / 100));

        const svgEl = svgRef.current || (target as unknown as SVGSVGElement);
        const rect = svgEl.getBoundingClientRect();
        const currentFocalScreenX = midX - rect.left;
        const currentFocalScreenY = midY - rect.top;

        // Focal anchoring: screenPos = worldFocal * newZoom + newPan => newPan = screenPos - worldFocal * newZoom
        const newPanX = Math.round(currentFocalScreenX - g.worldFocal.x * newZoom);
        const newPanY = Math.round(currentFocalScreenY - g.worldFocal.y * newZoom);

        setCanvasZoom(newZoom);
        setPan({ x: newPanX, y: newPanY });
      }
    };

    const handleTouchEnd = (evt: Event) => {
      const e = evt as TouchEvent;
      if (e.touches.length < 2 && isTwoFingerGesturingRef.current) {
        isTwoFingerGesturingRef.current = false;
        gestureDataRef.current = null;
        setIsTwoFingerGesturing(false);
        lastGestureEndTimeRef.current = Date.now();
      }
    };

    const handleTouchCancel = (evt: Event) => {
      const e = evt as TouchEvent;
      if (isTwoFingerGesturingRef.current) {
        isTwoFingerGesturingRef.current = false;
        gestureDataRef.current = null;
        setIsTwoFingerGesturing(false);
        lastGestureEndTimeRef.current = Date.now();
      }
    };

    target.addEventListener("touchstart", handleTouchStart, { passive: false });
    target.addEventListener("touchmove", handleTouchMove, { passive: false });
    target.addEventListener("touchend", handleTouchEnd);
    target.addEventListener("touchcancel", handleTouchCancel);

    return () => {
      target.removeEventListener("touchstart", handleTouchStart);
      target.removeEventListener("touchmove", handleTouchMove);
      target.removeEventListener("touchend", handleTouchEnd);
      target.removeEventListener("touchcancel", handleTouchCancel);
    };
  }, []);

  const addNodeAt = (type: string, x: number, y: number) => {
    const n: CircuitNode = {
      id: idCounterRef.current++,
      type,
      x: snapValueToGrid(x, gridPitch, snapToGrid),
      y: snapValueToGrid(y, gridPitch, snapToGrid),
    };
    if (type === "INPUT") n.value = 0;
    if (COMP_SPECS[type]?.seq) {
      n.state = { ...(COMP_SPECS[type].init || {}) };
      n.prevClk = {};
    }
    if (type === "CLOCK") n.value = 0;
    if (type === "AC_SINE" || type === "AC_VOLTAGE_SOURCE") {
      n.label = "AC Sine Gen";
      n.analogParams = {
        acVoltageV: 5.0,
        frequencyHz: 1000,
        userValue: 5.0,
        userUnit: "V",
        formattedValue: "5.0V 1kHz",
      };
    } else if (type === "RES" || type === "RESISTOR") {
      n.label = "Resistor";
      n.analogParams = {
        resistanceOhms: 1000,
        userValue: 1,
        userUnit: "kΩ",
        formattedValue: "1.0 kΩ",
      };
    } else if (type === "GND") {
      n.label = "Earth GND";
    }

    const nextNodes = [...nodes, n];
    const { updatedNodes, outs } = evaluateCircuit(nextNodes, wires);
    setNodes(updatedNodes);
    pushWaveformSnapshot(updatedNodes, outs);
  };

  const addNodeAuto = (type: string) => {
    const baseX = -pan.x + 110 + (cascadeRef.current % 6) * 45;
    const baseY = -pan.y + 90 + (cascadeRef.current % 6) * 45;
    cascadeRef.current += 1;
    addNodeAt(type, baseX, baseY);
  };

  // Drag-and-drop & Quick Add for standard 74-Series chips
  const handleAddChipFromToolbar = (chipType: string) => {
    const centerX = Math.round((-pan.x + 360) / 20) * 20;
    const centerY = Math.round((-pan.y + 220) / 20) * 20;
    addNodeAt(chipType, Math.max(40, centerX), Math.max(40, centerY));
  };

  const getNodeCenter = (n: CircuitNode) => {
    if (n.type === "INPUT" || n.type === "OUTPUT") {
      return { cx: n.x + 28, cy: n.y + 25 };
    }
    const comp = COMP_SPECS[n.type];
    if (comp) {
      return { cx: n.x + comp.w / 2, cy: n.y + comp.h / 2 };
    }
    const spec = GATE_SPECS[n.type];
    return { cx: n.x + (spec?.outX || 75) / 2, cy: n.y + 25 };
  };

  const getPortPos = (nodeId: number, port: number, dir: "in" | "out") => {
    const n = nodes.find((x) => x.id === nodeId);
    if (!n) return null;
    let rawX = 0;
    let rawY = 0;
    const center = getNodeCenter(n);

    if (n.type === "INPUT") {
      rawX = n.x + 56;
      rawY = n.y + 25;
    } else if (n.type === "OUTPUT") {
      rawX = n.x;
      rawY = n.y + 25;
    } else {
      const comp = COMP_SPECS[n.type];
      if (comp) {
        const pin = (dir === "in" ? comp.inputs : comp.outputs)[port];
        if (!pin) return null;
        rawX = dir === "in" ? n.x : n.x + comp.w;
        rawY = n.y + pin.y;
      } else {
        const spec = GATE_SPECS[n.type];
        if (!spec) return null;
        if (dir === "out") {
          rawX = n.x + spec.outX;
          rawY = n.y + 25;
        } else {
          const offs = spec.inputs === 1 ? [25] : [15, 35];
          rawX = n.x;
          rawY = n.y + (offs[port] ?? 25);
        }
      }
    }

    const rotation = n.rotation || 0;
    if (rotation === 0) return { x: rawX, y: rawY };

    const rad = (rotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const dx = rawX - center.cx;
    const dy = rawY - center.cy;
    return {
      x: Math.round(center.cx + dx * cos - dy * sin),
      y: Math.round(center.cy + dx * sin + dy * cos),
    };
  };

  const getNodeBounds = (n: CircuitNode) => {
    const comp = COMP_SPECS[n.type];
    let w = 72;
    let h = 66;
    if (comp) {
      w = comp.w + 24;
      h = comp.h + 24;
    } else if (n.type !== "INPUT" && n.type !== "OUTPUT") {
      const spec = GATE_SPECS[n.type];
      w = (spec?.outX || 75) + 28;
      h = 88;
    }
    const center = getNodeCenter(n);
    const isSwapped = n.rotation === 90 || n.rotation === 270;
    const finalW = isSwapped ? h : w;
    const finalH = isSwapped ? w : h;
    return {
      x: center.cx - finalW / 2,
      y: center.cy - finalH / 2,
      w: finalW,
      h: finalH,
    };
  };

  const handleRotateNode = (nodeId: number) => {
    setNodes((prev) =>
      prev.map((n) => {
        if (n.id !== nodeId) return n;
        const currentRot = n.rotation || 0;
        const nextRot = ((currentRot + 90) % 360) as 0 | 90 | 180 | 270;
        return { ...n, rotation: nextRot };
      })
    );
  };

  const updateNode = (id: number, updates: Partial<CircuitNode>) => {
    setNodes((prev) =>
      prev.map((n) => {
        if (n.id !== id) return n;
        return { ...n, ...updates };
      })
    );
  };

  const inferDefaultEndDir = useCallback(
    (nodeList: CircuitNode[], nodeId: number, role: "from" | "to"): "in" | "out" => {
      const n = nodeList.find((x) => x.id === nodeId);
      if (n) {
        if (
          n.type === "VOLTMETER" ||
          n.type === "DMM_PROBE" ||
          n.type === "OHMMETER" ||
          n.type === "OUTPUT"
        ) {
          return "in";
        }
        if (
          n.type === "VCC" ||
          n.type === "VCC_5V" ||
          n.type === "VCC_12V" ||
          n.type === "DC_VOLTAGE" ||
          n.type === "DC_VOLTAGE_SOURCE" ||
          n.type === "BATTERY" ||
          n.type === "AC_SINE" ||
          n.type === "AC_VOLTAGE_SOURCE" ||
          n.type === "INPUT" ||
          n.type === "CLOCK"
        ) {
          return "out";
        }
      }
      return role === "from" ? "out" : "in";
    },
    []
  );

  const findWireAtPin = useCallback(
    (
      nodeList: CircuitNode[],
      wireList: CircuitWire[],
      nodeId: number,
      port: number,
      dir: "in" | "out"
    ):
      | {
          wire: CircuitWire;
          otherNode: number;
          otherPort: number;
          otherDir: "in" | "out";
          matchedAt: "from" | "to";
        }
      | undefined => {
      for (const w of wireList) {
        const wFromDir = w.from.dir || inferDefaultEndDir(nodeList, w.from.node, "from");
        const wToDir = w.to.dir || inferDefaultEndDir(nodeList, w.to.node, "to");
        if (w.to.node === nodeId && w.to.port === port && wToDir === dir) {
          return {
            wire: w,
            otherNode: w.from.node,
            otherPort: w.from.port,
            otherDir: wFromDir,
            matchedAt: "to",
          };
        }
        if (w.from.node === nodeId && w.from.port === port && wFromDir === dir) {
          return {
            wire: w,
            otherNode: w.to.node,
            otherPort: w.to.port,
            otherDir: wToDir,
            matchedAt: "from",
          };
        }
      }
      return undefined;
    },
    [inferDefaultEndDir]
  );

  const removeNode = (id: number) => {
    const curNodes = nodesRef.current;
    const curWires = wiresRef.current;
    const removedWireIds = new Set(
      curWires.filter((w) => w.from.node === id || w.to.node === id).map((w) => w.id)
    );
    const nextNodes = curNodes.filter((n) => n.id !== id);
    const nextWires = curWires.filter((w) => w.from.node !== id && w.to.node !== id);
    const { updatedNodes, outs } = evaluateCircuit(nextNodes, nextWires);
    setNodes(updatedNodes);
    setWires(nextWires);
    setAttachedProbes((prev) => prev.filter((p) => !removedWireIds.has(p.wireId)));
    setSelectedNodeIds((prev) => prev.filter((nid) => nid !== id));
    setSelectedWireIds((prev) => prev.filter((wid) => !removedWireIds.has(wid)));
    if (signalTraceNodeId === id) {
      setSignalTraceNodeId(null);
    }
    if (selected?.type === "node" && selected.id === id) {
      setSelected(null);
      setIsPropertySidebarOpen(false);
    }
    pushWaveformSnapshot(updatedNodes, outs);
  };

  const removeWire = (id: number) => {
    const curNodes = nodesRef.current;
    const curWires = wiresRef.current;
    const nextWires = curWires.filter((w) => w.id !== id);
    const { updatedNodes, outs } = evaluateCircuit(curNodes, nextWires);
    setNodes(updatedNodes);
    setWires(nextWires);
    setAttachedProbes((prev) => prev.filter((p) => p.wireId !== id));
    setSelectedWireIds((prev) => prev.filter((wid) => wid !== id));
    if (selected?.type === "wire" && selected.id === id) {
      setSelected(null);
      setIsPropertySidebarOpen(false);
    }
    pushWaveformSnapshot(updatedNodes, outs);
  };

  const handlePortClick = (
    nodeId: number,
    port: number,
    dir: "in" | "out",
    e: React.PointerEvent
  ) => {
    e.stopPropagation();
    if (isTwoFingerGesturingRef.current || Date.now() - lastGestureEndTimeRef.current < 250) {
      return;
    }
    if (!pendingWire) {
      setPendingWire({ node: nodeId, port, dir });
      setMouseWorld(toWorld(e.clientX, e.clientY));
      return;
    }

    if (
      pendingWire.node === nodeId &&
      pendingWire.port === port &&
      pendingWire.dir === dir
    ) {
      setPendingWire(null);
      return;
    }

    const n1 = nodes.find((x) => x.id === pendingWire.node);
    const n2 = nodes.find((x) => x.id === nodeId);
    const isV1 = n1?.type === "VOLTMETER" || n1?.type === "DMM_PROBE";
    const isV2 = n2?.type === "VOLTMETER" || n2?.type === "DMM_PROBE";
    const isVoltmeterInvolved = isV1 || isV2;

    const isGnd1 = n1?.type === "GND";
    const isGnd2 = n2?.type === "GND";
    const isGndInvolved = isGnd1 || isGnd2;

    const isAnalog1 = n1 ? isAnalogOrPassiveType(n1.type) : false;
    const isAnalog2 = n2 ? isAnalogOrPassiveType(n2.type) : false;
    const isAnalogInvolved = isAnalog1 || isAnalog2;

    // Disallow same-direction wiring ONLY for strict unidirectional digital logic gates (e.g. AND, OR, Flip-Flops).
    // For Ground (GND), AC Sine generator, Voltmeters, and analog/passive components, bidirectional electrical wiring is valid.
    if (
      !isVoltmeterInvolved &&
      !isGndInvolved &&
      !isAnalogInvolved &&
      pendingWire.dir === dir
    ) {
      setPendingWire({ node: nodeId, port, dir });
      setMouseWorld(toWorld(e.clientX, e.clientY));
      return;
    }

    if (pendingWire.node === nodeId) {
      setPendingWire(null);
      return;
    }

    let from: { node: number; port: number; dir?: "in" | "out" };
    let to: { node: number; port: number; dir?: "in" | "out" };

    if (isVoltmeterInvolved) {
      if (isV1) {
        to = { node: pendingWire.node, port: pendingWire.port, dir: "in" };
        from = { node: nodeId, port, dir };
      } else {
        to = { node: nodeId, port, dir: "in" };
        from = { node: pendingWire.node, port: pendingWire.port, dir: pendingWire.dir };
      }
    } else if (isGndInvolved) {
      // Connect to GND node: make GND the 'to' node or 'from' node
      if (isGnd2) {
        from = { node: pendingWire.node, port: pendingWire.port, dir: pendingWire.dir };
        to = { node: nodeId, port, dir };
      } else {
        from = { node: nodeId, port, dir };
        to = { node: pendingWire.node, port: pendingWire.port, dir: pendingWire.dir };
      }
    } else if (pendingWire.dir === "out" && dir === "in") {
      from = { node: pendingWire.node, port: pendingWire.port, dir: "out" };
      to = { node: nodeId, port, dir: "in" };
    } else if (pendingWire.dir === "in" && dir === "out") {
      from = { node: nodeId, port, dir: "out" };
      to = { node: pendingWire.node, port: pendingWire.port, dir: "in" };
    } else {
      // Both are 'out' or both are 'in' (e.g. AC- to return rail or series junction)
      from = { node: pendingWire.node, port: pendingWire.port, dir: pendingWire.dir };
      to = { node: nodeId, port, dir };
    }

    if (from.node !== to.node) {
      // Check for exact duplicate wire between this pair of ports
      const isDuplicate = wires.some(
        (w) =>
          (w.from.node === from.node &&
            w.from.port === from.port &&
            (w.from.dir || "out") === (from.dir || "out") &&
            w.to.node === to.node &&
            w.to.port === to.port &&
            (w.to.dir || "in") === (to.dir || "in")) ||
          (w.from.node === to.node &&
            w.from.port === to.port &&
            (w.from.dir || "out") === (to.dir || "in") &&
            w.to.node === from.node &&
            w.to.port === from.port &&
            (w.to.dir || "in") === (from.dir || "out"))
      );

      if (!isDuplicate) {
        const targetNode = nodes.find((x) => x.id === to.node);
        const sourceNode = nodes.find((x) => x.id === from.node);
        const allowsMultipleConnections =
          targetNode?.type === "GND" ||
          sourceNode?.type === "GND" ||
          isAnalogOrPassiveType(targetNode?.type || "") ||
          isAnalogOrPassiveType(sourceNode?.type || "") ||
          isVoltmeterInvolved;

        const filtered = allowsMultipleConnections
          ? wires
          : wires.filter((w) => !(w.to.node === to.node && w.to.port === to.port));

        const nextWires: CircuitWire[] = [
          ...filtered,
          { id: idCounterRef.current++, from, to },
        ];
        const { updatedNodes, outs } = evaluateCircuit(nodes, nextWires);
        setWires(nextWires);
        setNodes(updatedNodes);
        pushWaveformSnapshot(updatedNodes, outs);
      }
    }
    setPendingWire(null);
  };

  // Cubic Bezier evaluation for probe placement on curved wires
  const getWirePointAt = useCallback(
    (w: CircuitWire, t = 0.5) => {
      const fromDir = w.from.dir || "out";
      const toDir = w.to.dir || "in";
      const from = getPortPos(w.from.node, w.from.port, fromDir);
      const to = getPortPos(w.to.node, w.to.port, toDir);
      if (!from || !to) return null;
      const p0 = from;
      const dxFrom = fromDir === "out" ? 55 : -55;
      const dxTo = toDir === "in" ? -55 : 55;
      const p1 = { x: from.x + dxFrom, y: from.y };
      const p2 = { x: to.x + dxTo, y: to.y };
      const p3 = to;
      const mt = 1 - t;
      const x =
        mt * mt * mt * p0.x +
        3 * mt * mt * t * p1.x +
        3 * mt * t * t * p2.x +
        t * t * t * p3.x;
      const y =
        mt * mt * mt * p0.y +
        3 * mt * mt * t * p1.y +
        3 * mt * t * t * p2.y +
        t * t * t * p3.y;
      return { x, y };
    },
    [getPortPos]
  );

  const attachProbeToWire = useCallback(
    (
      channelId: "CH1" | "CH2" | "CH3" | "CH4",
      wireId: number,
      tPos = 0.5
    ) => {
      setAttachedProbes((prev) => {
        const filtered = prev.filter((p) => p.channelId !== channelId);
        const sameCount = filtered.filter((p) => p.wireId === wireId).length;
        const adjT = Math.max(0.2, Math.min(0.8, tPos + sameCount * 0.15));
        return [...filtered, { channelId, wireId, tPos: adjT }];
      });
      setActiveProbeTool(null);
      setIsProbeHoverHudVisible(true);
    },
    []
  );

  // Circuit Completeness & Missing Connection Validator
  const validateCircuitCompleteness = useCallback(() => {
    const wireMap = new Map<string, CircuitWire>();
    for (const w of wires) {
      wireMap.set(`${w.to.node}:${w.to.port}`, w);
    }

    const missing: {
      nodeId: number;
      port: number;
      gateType: string;
      gateLabel: string;
      pinName: string;
      x: number;
      y: number;
      message: string;
    }[] = [];

    for (const n of nodes) {
      const spec = GATE_SPECS[n.type];
      if (spec) {
        for (let p = 0; p < spec.inputs; p++) {
          if (!wireMap.has(`${n.id}:${p}`)) {
            const pinName =
              spec.inputs === 2 ? (p === 0 ? "Pin A" : "Pin B") : "Input Pin";
            const pos = getPortPos(n.id, p, "in");
            missing.push({
              nodeId: n.id,
              port: p,
              gateType: n.type,
              gateLabel: n.label || `${n.type}_${n.id}`,
              pinName,
              x: pos?.x ?? n.x,
              y: pos?.y ?? n.y,
              message: `Gate [${n.label || n.type}] ${pinName} is unconnected.`,
            });
          }
        }
      } else if (n.type === "OUTPUT") {
        if (!wireMap.has(`${n.id}:0`)) {
          const pos = getPortPos(n.id, 0, "in");
          missing.push({
            nodeId: n.id,
            port: 0,
            gateType: "OUTPUT",
            gateLabel: n.label || `OUT_${n.id}`,
            pinName: "Input Pin",
            x: pos?.x ?? n.x,
            y: pos?.y ?? n.y,
            message: `Output indicator [${n.label || "LED"}] has no incoming wire.`,
          });
        }
      }
    }
    return missing;
  }, [nodes, wires, getPortPos]);

  const handleCheckAndStartSimulation = useCallback(() => {
    const missing = validateCircuitCompleteness();
    if (missing.length > 0) {
      setMissingConnections(missing);
      setCircuitVerifyNotice({
        type: "error",
        text: `Simulation Paused: ${missing.length} missing connection${
          missing.length > 1 ? "s" : ""
        } detected! Please wire the highlighted pins.`,
      });
      setIsSimRunning(false);
      onLogSimulationActivity?.(
        `Verify Failed (${missing.length} open pin${missing.length > 1 ? "s" : ""})`,
        activePreset || "Schematic",
        "WARN"
      );
    } else {
      setMissingConnections([]);
      setCircuitVerifyNotice({
        type: "success",
        text: `Circuit Complete & Verified! All ${wires.length} wire nets active. Simulation Running.`,
      });
      setIsSimRunning(true);
      onLogSimulationActivity?.(
        "Verified & Energized Circuit",
        `${activePreset || "Schematic"} (${wires.length} nets)`,
        "PASS"
      );
      setTimeout(() => setCircuitVerifyNotice(null), 4500);
    }
  }, [validateCircuitCompleteness, wires.length, activePreset, onLogSimulationActivity]);

  const handleNodePointerDown = (nodeId: number, e: React.PointerEvent) => {
    e.stopPropagation();
    if (isTwoFingerGesturingRef.current || Date.now() - lastGestureEndTimeRef.current < 250) {
      return;
    }
    const n = nodes.find((x) => x.id === nodeId);
    if (!n) return;

    // Auto-Attach Mode: Clicking any node when a virtual instrument is armed creates the color-coded connection immediately
    if (pendingAutoAttach) {
      executeAutoAttachToNode(nodeId, pendingAutoAttach);
      return;
    }

    wasNodeDraggedRef.current = false;

    if (e.shiftKey) {
      // Toggle node in multi-selection
      setSelectedNodeIds((prev) => {
        const next = prev.includes(nodeId)
          ? prev.filter((id) => id !== nodeId)
          : [...prev, nodeId];
        if (next.length === 1) {
          setSelected({ type: "node", id: next[0] });
        } else {
          setSelected(null);
        }
        const nextSet = new Set(next);
        const interWires = wiresRef.current
          .filter((w) => nextSet.has(w.from.node) && nextSet.has(w.to.node))
          .map((w) => w.id);
        setSelectedWireIds(interWires);
        return next;
      });
      return;
    }

    let activeNodeIds = selectedNodeIds;
    if (!selectedNodeIds.includes(nodeId)) {
      activeNodeIds = [nodeId];
      setSelectedNodeIds([nodeId]);
      setSelected({ type: "node", id: nodeId });
      setSelectedWireIds([]);
    }

    // Always engage Signal Trace visualizer on the clicked node in real-time
    setSignalTraceNodeId(nodeId);
    setIsSignalTraceEnabled(true);

    const start = toWorld(e.clientX, e.clientY);
    const originalPositions = new Map<number, { x: number; y: number }>();
    nodesRef.current.forEach((item) => {
      if (activeNodeIds.includes(item.id)) {
        originalPositions.set(item.id, { x: item.x, y: item.y });
      }
    });

    let moved = false;
    let animFrameId: number | null = null;

    const onMove = (ev: PointerEvent) => {
      if (isTwoFingerGesturingRef.current || Date.now() - lastGestureEndTimeRef.current < 250) {
        if (animFrameId !== null) cancelAnimationFrame(animFrameId);
        return;
      }
      const p = toWorld(ev.clientX, ev.clientY);
      const dx = p.x - start.x;
      const dy = p.y - start.y;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
        moved = true;
      }

      if (animFrameId !== null) cancelAnimationFrame(animFrameId);
      animFrameId = requestAnimationFrame(() => {
        const origPrimary = originalPositions.get(nodeId) || { x: n.x, y: n.y };
        const rawTargetX = origPrimary.x + dx;
        const rawTargetY = origPrimary.y + dy;

        const otherNodes = nodesRef.current.filter((other) => !activeNodeIds.includes(other.id));

        const snapRes = computeSnappedNodePosition({
          rawX: rawTargetX,
          rawY: rawTargetY,
          draggedNode: n,
          otherNodes,
          pitch: gridPitch,
          snapToGrid,
          magneticGuides: magneticGuidesEnabled,
        });

        const effectiveDx = snapRes.x - origPrimary.x;
        const effectiveDy = snapRes.y - origPrimary.y;

        setActiveAlignmentGuides(snapRes.guides);
        setActivelyDraggedNodeId(nodeId);
        setDragCoordBadge({ x: snapRes.x, y: snapRes.y });

        setNodes((prev) =>
          prev.map((item) => {
            const orig = originalPositions.get(item.id);
            if (orig) {
              return {
                ...item,
                x: orig.x + effectiveDx,
                y: orig.y + effectiveDy,
              };
            }
            return item;
          })
        );
      });
    };

    const onUp = () => {
      if (animFrameId !== null) cancelAnimationFrame(animFrameId);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      setActiveAlignmentGuides([]);
      setActivelyDraggedNodeId(null);
      setDragCoordBadge(null);

      if (isTwoFingerGesturingRef.current || Date.now() - lastGestureEndTimeRef.current < 250) {
        setNodes((prev) =>
          prev.map((item) => {
            const orig = originalPositions.get(item.id);
            return orig ? { ...item, x: orig.x, y: orig.y } : item;
          })
        );
        return;
      }

      if (activeNodeIds.length === 1) {
        setSelected({ type: "node", id: nodeId });
        setSignalTraceNodeId(nodeId);
        setIsSignalTraceEnabled(true);
        // Single click selects & repositions/sets without forcing sidebar open
      }
      setPendingWire(null);
      if (moved) {
        wasNodeDraggedRef.current = true;
        setTimeout(() => {
          wasNodeDraggedRef.current = false;
        }, 250);
      }
      if (!moved) {
        if (n.type === "INPUT") {
          const toggled = nodesRef.current.map((item) =>
            item.id === nodeId
              ? { ...item, value: item.value ? 0 : 1 }
              : item
          );
          const { updatedNodes, outs } = evaluateCircuit(
            toggled,
            wiresRef.current
          );
          setNodes(updatedNodes);
          pushWaveformSnapshot(updatedNodes, outs);
        }
      } else {
        const { updatedNodes, outs } = evaluateCircuit(
          nodesRef.current,
          wiresRef.current
        );
        setNodes(updatedNodes);
        pushWaveformSnapshot(updatedNodes, outs);
      }
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const handleCanvasPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (isTwoFingerGesturingRef.current || Date.now() - lastGestureEndTimeRef.current < 250) {
      return;
    }
    const isShiftMarquee = e.shiftKey;
    const startClient = { x: e.clientX, y: e.clientY };
    const startWorld = toWorld(e.clientX, e.clientY);
    const startPan = { ...pan };
    let moved = false;

    if (isShiftMarquee) {
      const onMove = (ev: PointerEvent) => {
        if (isTwoFingerGesturingRef.current || Date.now() - lastGestureEndTimeRef.current < 250) {
          return;
        }
        const currWorld = toWorld(ev.clientX, ev.clientY);
        if (Math.abs(currWorld.x - startWorld.x) > 4 || Math.abs(currWorld.y - startWorld.y) > 4) {
          moved = true;
          setMarqueeBox({
            x1: Math.min(startWorld.x, currWorld.x),
            y1: Math.min(startWorld.y, currWorld.y),
            x2: Math.max(startWorld.x, currWorld.x),
            y2: Math.max(startWorld.y, currWorld.y),
          });
        }
      };

      const onUp = (ev: PointerEvent) => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        setMarqueeBox(null);
        if (isTwoFingerGesturingRef.current || Date.now() - lastGestureEndTimeRef.current < 250) {
          return;
        }
        if (moved) {
          const currWorld = toWorld(ev.clientX, ev.clientY);
          const minX = Math.min(startWorld.x, currWorld.x);
          const maxX = Math.max(startWorld.x, currWorld.x);
          const minY = Math.min(startWorld.y, currWorld.y);
          const maxY = Math.max(startWorld.y, currWorld.y);

          // Find enclosed nodes
          const enclosedNodes = nodesRef.current.filter((n) => {
            return n.x >= minX - 30 && n.x <= maxX + 30 && n.y >= minY - 30 && n.y <= maxY + 30;
          });
          const enclosedIds = enclosedNodes.map((n) => n.id);
          const idSet = new Set(enclosedIds);

          // Find wires between enclosed nodes
          const enclosedWires = wiresRef.current.filter(
            (w) => idSet.has(w.from.node) && idSet.has(w.to.node)
          );

          setSelectedNodeIds(enclosedIds);
          setSelectedWireIds(enclosedWires.map((w) => w.id));
          if (enclosedIds.length === 1) {
            setSelected({ type: "node", id: enclosedIds[0] });
          } else {
            setSelected(null);
          }
          if (enclosedIds.length > 0) {
            showClipboardNotice(`Selected ${enclosedIds.length} components & ${enclosedWires.length} wires`);
          }
        }
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      return;
    }

    const onMove = (ev: PointerEvent) => {
      if (isTwoFingerGesturingRef.current || Date.now() - lastGestureEndTimeRef.current < 250) {
        return;
      }
      if (isBoardLockedRef.current) {
        return;
      }
      const dx = ev.clientX - startClient.x;
      const dy = ev.clientY - startClient.y;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        moved = true;
        setIsPanning(true);
      }
      if (moved) {
        if (panAnimFrameRef.current !== null) {
          cancelAnimationFrame(panAnimFrameRef.current);
        }
        panAnimFrameRef.current = requestAnimationFrame(() => {
          setPan({ x: startPan.x + dx, y: startPan.y + dy });
        });
      }
    };

    const onUp = () => {
      if (panAnimFrameRef.current !== null) {
        cancelAnimationFrame(panAnimFrameRef.current);
      }
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      setIsPanning(false);
      if (isTwoFingerGesturingRef.current || Date.now() - lastGestureEndTimeRef.current < 250) {
        return;
      }
      if (!moved) {
        setSelected(null);
        setSelectedNodeIds([]);
        setSelectedWireIds([]);
        setPendingWire(null);
      }
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  // Memoized live electrical values: only re-evaluates when circuit electrical state changes,
  // making canvas panning and dragging 120 FPS buttery smooth!
  const { outs: liveVals, wireMap: liveWireMap } = useMemo(() => {
    return settlePure(nodes, wires, prevOutsRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [circuitElectricalHash, settlePure]);
  prevOutsRef.current = liveVals;

  // Keep selectedNodeIdsForTiming pruned to existing nodes
  useEffect(() => {
    const validIds = new Set(nodes.map((n) => n.id));
    setSelectedNodeIdsForTiming((prev) => {
      const next = prev.filter((id) => validIds.has(id));
      return next.length === prev.length ? prev : next;
    });
  }, [nodes]);

  // Capture any live node state changes immediately into the 500ms timing buffer
  useEffect(() => {
    if (!isSimRunning || isTimingCapturePaused) return;
    record500msTransitionSnapshot(nodes, liveVals);
  }, [liveVals, nodes, isSimRunning, isTimingCapturePaused, record500msTransitionSnapshot]);

  // Advance rolling 500ms time axis while overlay is open and capture is live
  useEffect(() => {
    if (!showTimingDiagramOverlay || isTimingCapturePaused || !isSimRunning) return;
    const tickMs = prefersReducedMotion ? 66 : 33;
    const interval = window.setInterval(() => {
      const now = Date.now();
      const cutoff = now - TIMING_WINDOW_MS;
      setTimingWindowNowMs(now);
      setTiming500msHistory((prev) => {
        if (prev.length <= 1) return prev;
        let anchor: TimingTransitionSample | null = null;
        const inWindow: TimingTransitionSample[] = [];
        for (const s of prev) {
          if (s.timestampMs <= cutoff) {
            anchor = s;
          } else {
            inWindow.push(s);
          }
        }
        const next = anchor ? [anchor, ...inWindow] : inWindow;
        return next.length === prev.length ? prev : next;
      });
    }, tickMs);
    return () => window.clearInterval(interval);
  }, [showTimingDiagramOverlay, isTimingCapturePaused, isSimRunning, prefersReducedMotion]);

  const probedWireSignals = useMemo<ProbedWireSignal[]>(() => {
    const acSourceNode = nodes.find((n) => n.type === "AC_SINE" || n.type === "TRANSFORMER" || n.type === "AC_VOLTAGE_SOURCE");
    const hasAcSource = !!acSourceNode;
    const acFrequencyHz = Math.max(0.5, acSourceNode?.analogParams?.frequencyHz ?? 50);

    // Run true numerical MNA transient solver whenever at least one analog wire probe is attached
    const hasAnalogProbe = attachedProbes.some((p) => {
      const w = wires.find((item) => item.id === p.wireId);
      if (!w) return false;
      const fn = nodes.find((n) => n.id === w.from.node);
      const tn = nodes.find((n) => n.id === w.to.node);
      return (fn ? isAnalogOrPassiveType(fn.type) : false) || (tn ? isAnalogOrPassiveType(tn.type) : false);
    });

    const tranData = (() => {
      if (!hasAnalogProbe || !isSimRunning) return null;
      const capNodes = nodes.filter((n) => n.type === "CAP_NP" || n.type === "CAPACITOR" || n.type === "CAP_POL");
      const resNodes = nodes.filter((n) => n.type === "RES" || n.type === "RESISTOR");
      const maxCapF = Math.max(0, ...capNodes.map((c) => (c.analogParams?.capacitanceUf ?? 10) * 1e-6));
      const maxResOhm = Math.max(100, ...resNodes.map((r) => r.analogParams?.resistanceOhms ?? 1000));
      const rcTau = maxCapF * maxResOhm;
      const tStop = hasAcSource
        ? 2 / acFrequencyHz
        : rcTau > 1e-6
        ? Math.min(2.0, Math.max(0.02, 5 * rcTau))
        : 0.05;
      const dt = tStop / 96;
      const res = solveCircuitLabTransient(nodes, wires, {
        tStart: 0,
        tStop,
        dt,
        method: "TRAPEZOIDAL",
      });
      return res.transient.converged ? res : null;
    })();

    return attachedProbes.map((p) => {
      const w = wires.find((item) => item.id === p.wireId);
      const fromNode = w ? nodes.find((n) => n.id === w.from.node) : null;
      const toNode = w ? nodes.find((n) => n.id === w.to.node) : null;

      const level =
        w && liveVals[w.from.node]
          ? liveVals[w.from.node][w.from.port] ?? 0
          : 0;

      const vFrom =
        w && analogSolution?.getPinVoltage
          ? analogSolution.getPinVoltage(w.from.node, w.from.port, "out")
          : 0;
      const vTo =
        w && analogSolution?.getPinVoltage
          ? analogSolution.getPinVoltage(w.to.node, w.to.port, "in")
          : 0;

      const fromTelem = fromNode ? analogSolution?.compTelemetry?.get(fromNode.id) : null;
      const toTelem = toNode ? analogSolution?.compTelemetry?.get(toNode.id) : null;
      const currentMa = fromTelem?.current_mA ?? toTelem?.current_mA ?? (analogSolution?.loopCurrentMa || 0);

      const isFromAnalog = fromNode ? isAnalogOrPassiveType(fromNode.type) : false;
      const isToAnalog = toNode ? isAnalogOrPassiveType(toNode.type) : false;
      const isWireAnalog = isFromAnalog || isToAnalog;

      const isGndWire =
        fromNode?.type === "GND" ||
        toNode?.type === "GND" ||
        (fromNode?.type === "AC_SINE" && w?.from.port === 1) ||
        (toNode?.type === "AC_SINE" && w?.to.port === 1);

      let waveformType:
        | "AC_SINE"
        | "HALF_RECTIFIED"
        | "FULL_RECTIFIED"
        | "FILTERED_DC"
        | "DC"
        | "DIGITAL"
        | "PULSE" = "DIGITAL";
      let v = level === 1 ? 5.0 : 0.0;
      let peakVoltage = 5.0;
      let dcVoltage = 0.0;
      let rmsVoltage = 0.0;
      let rippleVoltage = 0.0;
      let frequencyHz = acFrequencyHz;
      let solvedAnalogSamples: number[] | null = null;

      if (isGndWire) {
        waveformType = "DC";
        v = 0.0;
        peakVoltage = 0.0;
        dcVoltage = 0.0;
        rmsVoltage = 0.0;
      } else if (isWireAnalog) {
        // Resolve real transient time-series for the probed wire's electrical net
        if (tranData && w) {
          const pinTarget =
            tranData.getPinTarget(w.from.node, w.from.port, w.from.dir || "out") ??
            tranData.getPinTarget(w.to.node, w.to.port, w.to.dir || "in");
          if (pinTarget) {
            const netId = tranData.transient.netlist.getTermNet(pinTarget.node, pinTarget.term);
            const rawSeries = tranData.transient.netVoltagesHistory[netId];
            if (rawSeries && rawSeries.length > 1) {
              solvedAnalogSamples = rawSeries;
            }
          }
        }

        if (solvedAnalogSamples && solvedAnalogSamples.length > 1) {
          let sum = 0;
          let sumSq = 0;
          let minV = Infinity;
          let maxV = -Infinity;
          let maxAbs = 0;
          for (const sample of solvedAnalogSamples) {
            sum += sample;
            sumSq += sample * sample;
            if (sample < minV) minV = sample;
            if (sample > maxV) maxV = sample;
            if (Math.abs(sample) > maxAbs) maxAbs = Math.abs(sample);
          }
          const nPts = solvedAnalogSamples.length;
          dcVoltage = Number((sum / nPts).toFixed(3));
          rmsVoltage = Number(Math.sqrt(sumSq / nPts).toFixed(3));
          peakVoltage = Number(maxAbs.toFixed(3));
          rippleVoltage = Number((maxV - minV).toFixed(3));
          v = solvedAnalogSamples[nPts - 1] ?? dcVoltage;

          if (minV < -0.1 * maxAbs && maxV > 0.1 * maxAbs) {
            waveformType = "AC_SINE";
          } else if (rippleVoltage > 0.15 * Math.max(0.1, maxAbs)) {
            waveformType = hasAcSource ? "HALF_RECTIFIED" : "DC";
          } else {
            waveformType = hasAcSource && rippleVoltage > 0.01 ? "FILTERED_DC" : "DC";
          }
        } else {
          // Exact DC operating point from MNA solution
          const netV = Math.abs(vFrom) >= Math.abs(vTo) ? vFrom : vTo;
          waveformType = "DC";
          v = netV;
          peakVoltage = Math.abs(netV);
          dcVoltage = netV;
          rmsVoltage = Math.abs(netV);
          rippleVoltage = 0.0;
        }
      } else if (fromNode?.type === "CLOCK" || toNode?.type === "CLOCK") {
        waveformType = "PULSE";
        peakVoltage = 5.0;
        v = level === 1 ? 5.0 : 0.0;
        frequencyHz = clockHz;
      } else {
        waveformType = "DIGITAL";
        v = level === 1 ? 5.0 : 0.0;
        peakVoltage = 5.0;
      }

      const spec = PROBE_CHANNELS.find((ch) => ch.channelId === p.channelId);
      const isFloatingWire =
        !w ||
        !fromNode ||
        level === -1 ||
        circuitDiagnosticReport.floatingNodeWireIds.has(w.id);

      const effectiveV = isFloatingWire ? 0 : isSimRunning ? v : 0;
      const effectiveRms = isFloatingWire ? 0 : isSimRunning ? rmsVoltage : 0;
      const effectiveDc = isFloatingWire ? 0 : isSimRunning ? dcVoltage : 0;
      const effectiveMa = isFloatingWire ? 0 : isSimRunning ? currentMa : 0;
      const logicEvalVoltage =
        waveformType === "AC_SINE" ? effectiveRms : effectiveV;
      const logicState: "HIGH" | "LOW" | "Z" = isFloatingWire
        ? "Z"
        : !isSimRunning
        ? "LOW"
        : isWireAnalog
        ? Math.abs(logicEvalVoltage) >= 2.0
          ? "HIGH"
          : "LOW"
        : level === 1
        ? "HIGH"
        : "LOW";

      const key = `w_${p.wireId}`;
      const historySamples = waveformHistory.map(
        (s) => s.signals[key] ?? effectiveV
      );
      const stepSamples =
        isWireAnalog && solvedAnalogSamples && solvedAnalogSamples.length > 1 && isSimRunning && !isFloatingWire
          ? solvedAnalogSamples
          : historySamples.length > 0
          ? historySamples
          : [effectiveV, effectiveV];

      return {
        channelId: p.channelId,
        wireId: p.wireId,
        netName: `Net ${fromNode?.label || fromNode?.type || "?"} → ${
          toNode?.label || toNode?.type || "?"
        }`,
        sourceLabel: fromNode?.label || `${fromNode?.type}_${fromNode?.id}`,
        targetLabel: toNode?.label || `${toNode?.type}_${toNode?.id}`,
        color: spec?.color ?? "#38bdf8",
        currentVoltage: effectiveV,
        currentMa: Number(effectiveMa.toFixed(2)),
        logicLevel: (logicState === "HIGH" ? 1 : 0) as 0 | 1,
        logicState,
        isFloating: isFloatingWire,
        delayNs: fromNode?.delayNs ?? 8,
        stepSamples,
        waveformType,
        peakVoltage,
        frequencyHz,
        rmsVoltage: effectiveRms,
        dcVoltage: effectiveDc,
        rippleVoltage,
      };
    });
  }, [
    attachedProbes,
    wires,
    nodes,
    liveVals,
    waveformHistory,
    analogSolution,
    clockHz,
    circuitDiagnosticReport.floatingNodeWireIds,
    isSimRunning,
  ]);

  // SPICE-Driven Dynamic Wire Flow Telemetry (Velocity, Signal State & MNA Polarity per Wire)
  const wireFlowMap = useMemo<Map<number, WireFlowTelemetry>>(() => {
    return computeCircuitWireFlows({
      nodes,
      wires,
      analogSolution,
      liveVals,
      diagnosticReport: circuitDiagnosticReport,
      probedSignals: probedWireSignals,
      waveformHistory,
      isSimRunning,
      isSimulationHalted,
      autoClock,
      clockHz,
      measuredPulseHz,
      simSpeed,
      sigGen: {
        enabled: dockSigGen.enabled,
        nodeId: dockSigGen.nodeId,
        waveform: dockSigGen.waveform,
        freqHz: dockSigGen.freqHz,
      },
    });
  }, [
    nodes,
    wires,
    analogSolution,
    liveVals,
    circuitDiagnosticReport,
    probedWireSignals,
    waveformHistory,
    isSimRunning,
    isSimulationHalted,
    autoClock,
    clockHz,
    measuredPulseHz,
    simSpeed,
    dockSigGen.enabled,
    dockSigGen.nodeId,
    dockSigGen.waveform,
    dockSigGen.freqHz,
  ]);

  const hoveredWireFlow = useMemo(() => {
    if (hoveredWireId === null) return null;
    return wireFlowMap.get(hoveredWireId) ?? null;
  }, [hoveredWireId, wireFlowMap]);

  const probeScreenPoints = useMemo<ProbeScreenPoint[]>(() => {
    const pts: ProbeScreenPoint[] = [];
    attachedProbes.forEach((p) => {
      const w = wires.find((item) => item.id === p.wireId);
      if (!w) return;
      const worldPt = getWirePointAt(w, p.tPos ?? 0.5);
      if (!worldPt) return;
      pts.push({
        channelId: p.channelId,
        wireId: p.wireId,
        screenX: pan.x + worldPt.x * canvasZoom,
        screenY: pan.y + worldPt.y * canvasZoom,
      });
    });
    return pts;
  }, [attachedProbes, wires, getWirePointAt, pan, canvasZoom]);

  // Compute Truth Table - memoized & only calculated when Truth Table tab or HUD is visible, and pauses during drag
  const inputNodes = useMemo(() => nodes.filter((n) => n.type === "INPUT"), [nodes]);
  const outputNodes = useMemo(() => nodes.filter((n) => n.type === "OUTPUT"), [nodes]);
  const hasSeq = useMemo(() => nodes.some((n) => COMP_SPECS[n.type]?.seq), [nodes]);

  const truthRowsData: { ins: number[]; outs: number[]; isActive: boolean }[] = useMemo(() => {
    const isTruthTableVisible = showCanvasHUD || bottomInstrumentTab === "TRUTH_TABLE";
    if (!isTruthTableVisible || activelyDraggedNodeId !== null) {
      return [];
    }
    if (inputNodes.length === 0 || inputNodes.length > 6 || outputNodes.length === 0) {
      return [];
    }

    const totalRows = 1 << inputNodes.length;
    const rows: { ins: number[]; outs: number[]; isActive: boolean }[] = [];

    for (let i = 0; i < totalRows; i++) {
      const rowIns: number[] = [];
      let tempNodes = nodes.map((n) => {
        const idx = inputNodes.findIndex((inp) => inp.id === n.id);
        if (idx === -1) return n;
        const bit = (i >> (inputNodes.length - 1 - idx)) & 1;
        rowIns[idx] = bit;
        return { ...n, value: bit };
      });

      let { outs: rowSettled, wireMap: rowWireMap } = settlePure(
        tempNodes,
        wires,
        prevOutsRef.current
      );

      if (hasSeq) {
        tempNodes = tempNodes.map((n) => {
          const spec = COMP_SPECS[n.type];
          if (!spec || !spec.seq || !spec.step) return n;
          const ins = spec.inputs.map((pin, pIdx) =>
            getInputVal(
              n.id,
              pIdx,
              rowSettled,
              rowWireMap,
              pin.defaultVal ?? 0
            )
          );
          const edges = (spec.clockPorts || []).map(
            (cp) =>
              getInputVal(
                n.id,
                cp,
                rowSettled,
                rowWireMap,
                spec.inputs[cp]?.defaultVal ?? 0
              ) === 1
          );
          const nextSt = spec.step(ins, n.state || spec.init || {}, edges);
          return { ...n, state: nextSt };
        });
        rowSettled = settlePure(tempNodes, wires, rowSettled).outs;
      }

      const rowOuts = outputNodes.map((o) => rowSettled[o.id]?.[0] ?? 0);
      const isActive = inputNodes.every(
        (inp, idx) => (inp.value ? 1 : 0) === rowIns[idx]
      );
      rows.push({ ins: rowIns, outs: rowOuts, isActive });
    }
    return rows;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showCanvasHUD, bottomInstrumentTab, activelyDraggedNodeId, circuitElectricalHash, inputNodes, outputNodes, hasSeq, getInputVal, settlePure]);

  // Smart-Sync fallback: auto-arm prioritized clock & high-frequency channels if empty
  useEffect(() => {
    if (wires.length > 0 && selectedWireIdsForAnalyzer.length === 0) {
      if (autoSyncInstrumentsRef.current) {
        const targets = computeCriticalInstrumentTargets(
          nodesRef.current,
          wires,
          analyzerHistoryRef.current
        );
        setSelectedWireIdsForAnalyzer(targets.analyzerWireIds);
        if (attachedProbes.length === 0 && targets.probes.length > 0) {
          setAttachedProbes(targets.probes);
        }
      } else {
        setSelectedWireIdsForAnalyzer(wires.slice(0, 10).map((w) => w.id));
      }
    }
  }, [
    wires,
    selectedWireIdsForAnalyzer.length,
    attachedProbes.length,
    computeCriticalInstrumentTargets,
  ]);

  // Prepare channels and sample traces for the virtual digital oscilloscope
  const oscilloscopeChannels: OscilloscopeChannel[] = useMemo(() => {
    return nodes.map((n, idx) => {
      const isInput = n.type === "INPUT";
      const isOutput = n.type === "OUTPUT";
      const isSeq = COMP_SPECS[n.type]?.seq;
      return {
        id: `node:${n.id}:0`,
        label: isInput
          ? `IN: ${n.label || `Switch ${idx + 1}`}`
          : isOutput
          ? `OUT: ${n.label || `LED ${idx + 1}`}`
          : isSeq
          ? `SEQ: ${n.type} #${n.id}`
          : `GATE: ${n.type} #${n.id}`,
        shortLabel: n.label || `${n.type[0]}${idx + 1}`,
        category: isInput ? "input" : isOutput ? "output" : isSeq ? "seq" : "gate",
        color: isInput ? "#38bdf8" : isOutput ? "#22c55e" : isSeq ? "#a855f7" : "#f59e0b",
        nodeId: n.id,
        port: 0,
      };
    });
  }, [nodes]);

  const oscilloscopeHistory: OscilloscopeSample[] = useMemo(() => {
    if (waveformHistory.length === 0) return [];
    return waveformHistory.map((s, idx) => {
      const signals: Record<string, number> = {};
      nodes.forEach((n, nIdx) => {
        const key =
          n.label ||
          (n.type === "INPUT"
            ? `I${nIdx + 1}`
            : n.type === "OUTPUT"
            ? `OUT${nIdx + 1}`
            : `${n.type}#${n.id}`);
        const isAnalog = isAnalogOrPassiveType(n.type);
        if (isAnalog) {
          const pinV = analogSolution?.getPinVoltage?.(n.id, 0) ?? 0;
          signals[`node:${n.id}:0`] = pinV;
        } else {
          const val = s.signals[key] ?? (liveVals[n.id] ?? 0);
          signals[`node:${n.id}:0`] = val === 1 ? 1 : 0;
        }
      });
      return {
        step: idx,
        signals,
      };
    });
  }, [waveformHistory, nodes, liveVals, analogSolution]);

  // Comprehensive Pattern Sweep: Automatically steps through binary combinations or clocks
  const runFullPatternSweep = useCallback(() => {
    const currentNodes = nodesRef.current;
    const currentWires = wiresRef.current;
    const hasSeqNode = currentNodes.some((n) => COMP_SPECS[n.type]?.seq);
    if (hasSeqNode) {
      for (let s = 0; s < 12; s++) {
        pulseClockInputs();
      }
      return;
    }
    const inputs = currentNodes.filter((n) => n.type === "INPUT");
    if (inputs.length === 0) return;
    const numCombos = Math.min(16, 1 << Math.min(inputs.length, 4));
    let localNodes = [...currentNodes];
    for (let c = 0; c < numCombos; c++) {
      localNodes = localNodes.map((n) => {
        if (n.type !== "INPUT") return n;
        const idx = inputs.findIndex((x) => x.id === n.id);
        if (idx < 0 || idx >= 4) return n;
        return { ...n, value: (c >> idx) & 1 };
      });
      const { updatedNodes, outs } = evaluateCircuit(localNodes, currentWires);
      localNodes = updatedNodes;
      pushWaveformSnapshot(updatedNodes, outs);
    }
    setNodes(localNodes);
  }, [evaluateCircuit, pulseClockInputs, pushWaveformSnapshot]);

  const basicGateList = [
    "INPUT",
    "OUTPUT",
    "AND",
    "OR",
    "NOT",
    "NAND",
    "NOR",
    "XOR",
    "XNOR",
  ];
  const ffList = ["DFF", "JKFF", "SRFF", "TFF", "7473", "7474"];
  const msiList = [
    "MUX4",
    "DEMUX4",
    "74138",
    "7483",
    "7485",
    "74193",
    "74194",
    "7447",
    "7SEG",
  ];

  // Universal Electric, Electronics, Network Analysis & Power Components
  const generalAnalogList = [
    "RES",
    "POT",
    "CAP_NP",
    "CAP_POL",
    "IND",
    "TRANSFORMER",
    "FUSE",
    "XTAL",
    "DIODE_1N4007",
    "ZENER_BZX84",
    "LED_RED",
    "BC547",
    "BC557",
    "MOSFET_N",
    "JFET_N",
    "OPAMP_741",
    "LM7805",
    "SCR",
    "TRIAC",
    "DIAC",
    "RELAY_SPDT",
    "OPTO_PC817",
  ];

  // Microcontrollers, ESP32 IoT & Programmable Mixed-Signal Processors
  const digitalDeviceList = [
    "ESP32",
    "ESP32_S3",
    "ESP32_C3",
    "ARDUINO_NANO",
    "ADC0804",
    "DAC0808",
    "SENSOR_DHT22",
  ];

  // Comprehensive Categorized Library Components (Analogue, Digital, Devices, Power, Meters, MCUs)
  const ALL_COMPONENT_ITEMS = useMemo(() => {
    return [
      // 1. Basic Logic Gates (DLD)
      { type: "AND", label: "AND Gate", slot: "GATES", subtext: "2-Input AND Gate" },
      { type: "OR", label: "OR Gate", slot: "GATES", subtext: "2-Input OR Gate" },
      { type: "NOT", label: "NOT Gate", slot: "GATES", subtext: "Logic Inverter" },
      { type: "NAND", label: "NAND Gate", slot: "GATES", subtext: "Universal NAND Gate" },
      { type: "NOR", label: "NOR Gate", slot: "GATES", subtext: "Universal NOR Gate" },
      { type: "XOR", label: "XOR Gate", slot: "GATES", subtext: "Exclusive-OR Gate" },
      { type: "XNOR", label: "XNOR Gate", slot: "GATES", subtext: "Equivalence Gate" },

      // 2. Power Supplies, Signal Sources & Ground
      { type: "VCC_5V", label: "+5V DC Source", slot: "SOURCES", subtext: "+5V Regulated DC Rail" },
      { type: "VCC_12V", label: "+12V DC Source", slot: "SOURCES", subtext: "+12V System Rail" },
      { type: "GND", label: "Ground (GND)", slot: "SOURCES", subtext: "0V Reference Ground" },
      { type: "AC_SINE", label: "AC Sine Gen", slot: "SOURCES", subtext: "1kHz 10Vpp Sine Wave" },
      { type: "CLOCK", label: "Clock Gen", slot: "SOURCES", subtext: "Periodic Square Pulse" },
      { type: "INPUT", label: "Logic Switch", slot: "SOURCES", subtext: "SPST 0/1 Toggle Switch" },
      { type: "PUSHBUTTON", label: "Pushbutton", slot: "SOURCES", subtext: "Momentary NO Switch" },
      { type: "SWITCH_SPST", label: "SPST Switch", slot: "SOURCES", subtext: "In-line Toggle Switch" },

      // 3. Passive Linear Elements (LCA / Analog)
      { type: "RES", label: "Resistor", slot: "ANALOG", subtext: "1kΩ Linear Resistor" },
      { type: "POT", label: "Potentiometer", slot: "ANALOG", subtext: "10kΩ Variable Resistor" },
      { type: "CAP_NP", label: "Capacitor", slot: "ANALOG", subtext: "100nF Ceramic / Film Cap" },
      { type: "CAP_POL", label: "Electrolytic Cap", slot: "ANALOG", subtext: "Polarized 10µF Cap" },
      { type: "IND", label: "Inductor", slot: "ANALOG", subtext: "10mH High-Q Coil" },
      { type: "TRANSFORMER", label: "Transformer", slot: "ANALOG", subtext: "230V/12V Center-Tap" },
      { type: "FUSE", label: "Protection Fuse", slot: "ANALOG", subtext: "1A Fast-Blow Fuse" },
      { type: "XTAL", label: "Crystal Quartz", slot: "ANALOG", subtext: "16MHz Quartz Resonator" },

      // 4. Semiconductor Diodes & Transistors (EDC / Devices)
      { type: "DIODE_1N4007", label: "1N4007 Diode", slot: "DEVICES", subtext: "1000V 1A Silicon Diode" },
      { type: "ZENER", label: "Zener 5.1V (1N4733A)", slot: "DEVICES", subtext: "5.1V 1W Shunt Zener" },
      { type: "ZENER_BZX84", label: "Zener BZX84", slot: "DEVICES", subtext: "5.1V SMD Zener Diode" },
      { type: "SCHOTTKY", label: "Schottky Diode", slot: "DEVICES", subtext: "1N5819 Low-Vf Fast Diode" },
      { type: "PHOTODIODE", label: "Photodiode (BPW34)", slot: "DEVICES", subtext: "Si PIN Optical Receiver" },
      { type: "BRIDGE_RECT", label: "Bridge Rectifier", slot: "DEVICES", subtext: "Full-Wave 4-Diode Bridge" },
      { type: "BC547", label: "BC547 NPN BJT", slot: "DEVICES", subtext: "General NPN Transistor" },
      { type: "BC557", label: "BC557 PNP BJT", slot: "DEVICES", subtext: "General PNP Transistor" },
      { type: "2N2222", label: "2N2222A NPN", slot: "DEVICES", subtext: "High-Speed NPN Switch" },
      { type: "MOSFET_N", label: "N-MOSFET", slot: "DEVICES", subtext: "IRF540N Power Switch" },
      { type: "MOSFET_P", label: "P-MOSFET", slot: "DEVICES", subtext: "IRF9540 High-Side Switch" },
      { type: "JFET_N", label: "N-JFET", slot: "DEVICES", subtext: "2N5457 Depletion JFET" },

      // 5. Analog ICs, Operational Amplifiers & Timers
      { type: "OPAMP_741", label: "LM741 Op-Amp", slot: "ANALOG_IC", subtext: "Operational Amplifier" },
      { type: "LM358", label: "LM358 Dual Op-Amp", slot: "ANALOG_IC", subtext: "Dual Low-Power Op-Amp" },
      { type: "LM393", label: "LM393 Comparator", slot: "ANALOG_IC", subtext: "Dual Voltage Comparator" },
      { type: "TIMER_555", label: "NE555 Timer", slot: "ANALOG_IC", subtext: "Astable/Monostable Timer" },
      { type: "LM7805", label: "LM7805 Regulator", slot: "ANALOG_IC", subtext: "+5V Positive Voltage Reg" },
      { type: "LM317", label: "LM317 Adj Reg", slot: "ANALOG_IC", subtext: "1.25V-37V Adj Regulator" },
      { type: "OPTO_PC817", label: "PC817 Optocoupler", slot: "ANALOG_IC", subtext: "Galvanic Optical Isolator" },

      // 6. Power Electronics & Switches
      { type: "SCR", label: "Thyristor SCR", slot: "POWER", subtext: "2N6509 Phase SCR" },
      { type: "TRIAC", label: "TRIAC", slot: "POWER", subtext: "BTA16 AC Power Switch" },
      { type: "DIAC", label: "DB3 DIAC", slot: "POWER", subtext: "Bidirectional Trigger Diode" },
      { type: "RELAY_SPDT", label: "SPDT Relay", slot: "POWER", subtext: "Electro-Mechanical Relay" },

      // 7. Measuring Equipment & Output Displays
      { type: "VOLTMETER", label: "Digital Voltmeter", slot: "METERS", subtext: "DC/AC Voltage Meter [V] · Parallel" },
      { type: "AMMETER", label: "In-Line Ammeter", slot: "METERS", subtext: "DC Current Meter [mA] · Series Loop" },
      { type: "OHMMETER", label: "Digital Ohmmeter", slot: "METERS", subtext: "Resistance Meter [Ω] · De-Energized" },
      { type: "POWER_METER", label: "Digital Wattmeter", slot: "METERS", subtext: "Active Power Meter [W/mW] · Dual-Coil" },
      { type: "DMM_PROBE", label: "DMM Test Probe", slot: "METERS", subtext: "Multimeter Signal Probe" },
      { type: "OUTPUT", label: "LED Indicator", slot: "METERS", subtext: "Visual High/Low Probe" },
      { type: "LED_RED", label: "Red LED", slot: "METERS", subtext: "2.0V Red Indicator LED" },
      { type: "LED_GREEN", label: "Green LED", slot: "METERS", subtext: "2.2V Green Indicator LED" },
      { type: "LED_BLUE", label: "Blue LED", slot: "METERS", subtext: "3.2V Blue Indicator LED" },
      { type: "BUZZER", label: "Piezo Buzzer", slot: "METERS", subtext: "Audible Alarm Indicator" },
      { type: "7SEG", label: "7-Segment Display", slot: "METERS", subtext: "Hex Numeric LED Readout" },

      // 8. Flip-Flops & Sequential Storage
      { type: "DFF", label: "D Flip-Flop", slot: "FLIPFLOPS", subtext: "Data / Edge-Triggered" },
      { type: "JKFF", label: "JK Flip-Flop", slot: "FLIPFLOPS", subtext: "Universal Toggle FF" },
      { type: "SRFF", label: "SR Latch", slot: "FLIPFLOPS", subtext: "Set-Reset Storage" },
      { type: "TFF", label: "T Flip-Flop", slot: "FLIPFLOPS", subtext: "Toggle Counter Divider" },
      { type: "7474", label: "7474 Dual D-FF", slot: "FLIPFLOPS", subtext: "TTL 7474 Dual D-FF" },
      { type: "7473", label: "7473 Dual JK-FF", slot: "FLIPFLOPS", subtext: "TTL 7473 Dual JK-FF" },
      { type: "7476", label: "7476 Dual JK-FF (PRE/CLR)", slot: "FLIPFLOPS", subtext: "TTL 7476 Dual JK-FF" },

      // 9. 74-Series TTL Chips
      { type: "7400", label: "7400 Quad NAND", slot: "TTL74", subtext: "4x 2-Input NAND" },
      { type: "7402", label: "7402 Quad NOR", slot: "TTL74", subtext: "4x 2-Input NOR" },
      { type: "7404", label: "7404 Hex Inverter", slot: "TTL74", subtext: "6x NOT Inverters" },
      { type: "7408", label: "7408 Quad AND", slot: "TTL74", subtext: "4x 2-Input AND" },
      { type: "7432", label: "7432 Quad OR", slot: "TTL74", subtext: "4x 2-Input OR" },
      { type: "7486", label: "7486 Quad XOR", slot: "TTL74", subtext: "4x 2-Input XOR" },
      { type: "74138", label: "74138 3-to-8 Demux", slot: "TTL74", subtext: "Decoder / Demultiplexer" },
      { type: "74151", label: "74151 8-to-1 MUX", slot: "TTL74", subtext: "Data Selector MUX" },
      { type: "74153", label: "74153 Dual 4:1 MUX", slot: "TTL74", subtext: "Dual 4-to-1 Selector" },
      { type: "74157", label: "74157 Quad 2:1 MUX", slot: "TTL74", subtext: "Quad 2-Input MUX" },
      { type: "74161", label: "74161 4-Bit Sync Ctr", slot: "TTL74", subtext: "Synchronous Binary Ctr" },
      { type: "74193", label: "74193 4-Bit Counter", slot: "TTL74", subtext: "Up/Down Sync Counter" },
      { type: "74194", label: "74194 Shift Reg", slot: "TTL74", subtext: "Bi-directional Universal" },
      { type: "7447", label: "7447 BCD Decoder", slot: "TTL74", subtext: "BCD to 7-Segment" },
      { type: "7483", label: "7483 4-Bit Adder", slot: "TTL74", subtext: "Binary Full Adder" },
      { type: "7485", label: "7485 Comparator", slot: "TTL74", subtext: "4-Bit Magnitude Comp" },

      // 10. MSI Functions
      { type: "MUX4", label: "4-to-1 MUX", slot: "MSI", subtext: "4-Input Data Selector" },
      { type: "DEMUX4", label: "1-to-4 DEMUX", slot: "MSI", subtext: "1-to-4 Data Distributor" },

      // 11. IoT & Embedded Microcontrollers
      { type: "ESP32", label: "ESP32-WROOM", slot: "MCU", subtext: "Dual-Core 240MHz Wi-Fi/BLE" },
      { type: "ESP32_S3", label: "ESP32-S3 AI", slot: "MCU", subtext: "Dual-Core Vector AI & USB-OTG" },
      { type: "ESP32_C3", label: "ESP32-C3 RISC-V", slot: "MCU", subtext: "32-bit RISC-V Ultra Low-Power" },
      { type: "ARDUINO_NANO", label: "Arduino Nano", slot: "MCU", subtext: "ATmega328P Core" },
      { type: "ADC0804", label: "ADC0804", slot: "MCU", subtext: "8-Bit Analog-Digital" },
      { type: "DAC0808", label: "DAC0808", slot: "MCU", subtext: "8-Bit Digital-Analog" },
      { type: "SENSOR_DHT22", label: "DHT22 Sensor", slot: "MCU", subtext: "Temperature & Humidity" },
    ];
  }, []);

  const COMPONENT_SECTIONS_CONFIG = useMemo(() => [
    {
      id: "SOURCES",
      title: "Power Sources & References",
      badge: "DC/AC/GND",
      iconName: "Zap",
      color: "from-amber-500/20 to-yellow-500/20 border-amber-500/40 text-amber-300",
      description: "Regulated DC rails, AC sinusoidal generator, clock pulser, and ground reference.",
    },
    {
      id: "INPUTS_SWITCHES",
      title: "Switches & User Inputs",
      badge: "Controls",
      iconName: "Sliders",
      color: "from-blue-500/20 to-cyan-500/20 border-blue-500/40 text-blue-300",
      description: "SPST toggle switches, momentary pushbuttons, and logic input keys.",
    },
    {
      id: "PASSIVES",
      title: "Passive RLC Elements",
      badge: "RLC / Filters",
      iconName: "Cpu",
      color: "from-emerald-500/20 to-teal-500/20 border-emerald-500/40 text-emerald-300",
      description: "Linear resistors, precision potentiometers, ceramic/electrolytic caps, inductors, transformers.",
    },
    {
      id: "SEMICONDUCTORS",
      title: "Semiconductors & Diodes",
      badge: "Diodes / BJTs / FETs",
      iconName: "Sparkles",
      color: "from-violet-500/20 to-purple-500/20 border-violet-500/40 text-violet-300",
      description: "1N4007 rectifiers, Schottky, Zener, BC547/BC557 BJTs, 2N2222, power MOSFETs, JFETs.",
    },
    {
      id: "ANALOG_ICS",
      title: "Analog ICs & Regulators",
      badge: "Op-Amps / 555",
      iconName: "Activity",
      color: "from-sky-500/20 to-indigo-500/20 border-sky-500/40 text-sky-300",
      description: "LM741, LM358 op-amps, LM393 comparator, NE555 timer, LM7805/LM317 regulators, PC817.",
    },
    {
      id: "POWER_ELECTRONICS",
      title: "Power Electronics & Relays",
      badge: "Thyristors / Relays",
      iconName: "Flame",
      color: "from-rose-500/20 to-red-500/20 border-rose-500/40 text-rose-300",
      description: "SCR thyristors, TRIACs, DIACs, and electromechanical SPDT relays.",
    },
    {
      id: "METERS_PROBES",
      title: "Meters, Probes & Displays",
      badge: "PME Metrology",
      iconName: "Gauge",
      color: "from-cyan-500/20 to-teal-500/20 border-cyan-500/40 text-cyan-300",
      description: "Voltmeter [V], Ammeter [A], Ohmmeter [Ω], Wattmeter [W], color LEDs, 7-Segment, Piezo buzzer.",
    },
    {
      id: "LOGIC_GATES",
      title: "Primary Digital Logic Gates",
      badge: "IEEE 315 Gates",
      iconName: "GitMerge",
      color: "from-indigo-500/20 to-cyan-500/20 border-indigo-500/40 text-indigo-300",
      description: "AND, OR, NOT inverter, NAND, NOR, XOR, XNOR universal and primary logic gates.",
    },
    {
      id: "SEQUENTIAL_STORAGE",
      title: "Flip-Flops & Sequential Blocks",
      badge: "Latches / FSM",
      iconName: "Clock",
      color: "from-fuchsia-500/20 to-pink-500/20 border-fuchsia-500/40 text-fuchsia-300",
      description: "Edge-triggered D-FF, JK-FF, SR Latch, T-FF, dual 7474 D-FF, dual 7473 JK-FF.",
    },
    {
      id: "TTL_74XX",
      title: "74-Series Standard TTL ICs",
      badge: "DIP-14 / DIP-16",
      iconName: "Grid",
      color: "from-amber-500/20 to-orange-500/20 border-amber-500/40 text-amber-300",
      description: "7400, 7402, 7404, 7408, 7432, 7486, 74138, 74151, 74193, 74194, 7447, 7483, 7485.",
    },
    {
      id: "MSI_CIRCUITS",
      title: "MSI Combinational Blocks",
      badge: "MUX / DEMUX",
      iconName: "Layers",
      color: "from-teal-500/20 to-emerald-500/20 border-teal-500/40 text-teal-300",
      description: "4-to-1 Multiplexers (MUX4) and 1-to-4 Demultiplexers (DEMUX4).",
    },
    {
      id: "IOT_MCUS",
      title: "Embedded Microcontrollers & IoT",
      badge: "ESP32 / MCU",
      iconName: "Terminal",
      color: "from-emerald-500/20 to-cyan-500/20 border-emerald-500/40 text-emerald-300",
      description: "ESP32-WROOM, ESP32-S3 AI, ESP32-C3 RISC-V, Arduino Nano, ADC0804, DAC0808, DHT22.",
    },
  ], []);

  // Map each component to its canonical section
  const getSectionIdForComponent = useCallback((type: string, slot: string): string => {
    if (type === "INPUT" || type === "PUSHBUTTON" || type === "SWITCH_SPST") return "INPUTS_SWITCHES";
    if (slot === "SOURCES") return "SOURCES";
    if (slot === "ANALOG") return "PASSIVES";
    if (slot === "DEVICES") return "SEMICONDUCTORS";
    if (slot === "ANALOG_IC") return "ANALOG_ICS";
    if (slot === "POWER") return "POWER_ELECTRONICS";
    if (slot === "METERS") return "METERS_PROBES";
    if (slot === "GATES") return "LOGIC_GATES";
    if (slot === "FLIPFLOPS") return "SEQUENTIAL_STORAGE";
    if (slot === "TTL74") return "TTL_74XX";
    if (slot === "MSI") return "MSI_CIRCUITS";
    if (slot === "MCU") return "IOT_MCUS";
    return "LOGIC_GATES";
  }, []);

  const filteredComponentItems = useMemo(() => {
    return ALL_COMPONENT_ITEMS.filter((item) => {
      if (componentSlotFilter !== "ALL") {
        const itemSection = getSectionIdForComponent(item.type, item.slot);
        if (componentSlotFilter !== item.slot && componentSlotFilter !== itemSection) {
          return false;
        }
      }
      if (componentQuery.trim()) {
        const q = componentQuery.toLowerCase().trim();
        const matchType = item.type.toLowerCase().includes(q);
        const matchLabel = item.label.toLowerCase().includes(q);
        const matchSub = item.subtext ? item.subtext.toLowerCase().includes(q) : false;
        const matchKeywords = (
          (item.type.includes("RES") && (q.includes("ohm") || q.includes("resist"))) ||
          (item.type.includes("CAP") && (q.includes("farad") || q.includes("cap"))) ||
          (item.type.includes("VOLT") && (q.includes("meter") || q.includes("dmm") || q.includes("probe") || q.includes("measur"))) ||
          (item.type.includes("AMM") && (q.includes("curr") || q.includes("amp") || q.includes("meter"))) ||
          (item.type.includes("OHM") && (q.includes("ohm") || q.includes("resist") || q.includes("meter"))) ||
          (item.type.includes("POWER") && (q.includes("watt") || q.includes("power") || q.includes("meter"))) ||
          (item.type.includes("DMM") && (q.includes("meter") || q.includes("multimeter") || q.includes("probe"))) ||
          (item.type.includes("VCC") && (q.includes("dc") || q.includes("power") || q.includes("supply") || q.includes("volt"))) ||
          (item.type.includes("GND") && (q.includes("ground") || q.includes("earth") || q.includes("0v") || q.includes("ref"))) ||
          (item.type.includes("AC") && (q.includes("sine") || q.includes("alternating") || q.includes("gen"))) ||
          (item.type.includes("BC5") && (q.includes("transistor") || q.includes("bjt") || q.includes("npn") || q.includes("pnp"))) ||
          (item.type.includes("2N22") && (q.includes("transistor") || q.includes("bjt") || q.includes("npn"))) ||
          (item.type.includes("MOSFET") && (q.includes("fet") || q.includes("transistor") || q.includes("switch"))) ||
          (item.type.includes("OPAMP") && (q.includes("amplifier") || q.includes("lm741") || q.includes("741") || q.includes("analog"))) ||
          (item.type.includes("TIMER") && (q.includes("555") || q.includes("astable") || q.includes("monostable") || q.includes("pulse")))
        );
        return matchType || matchLabel || matchSub || matchKeywords;
      }
      return true;
    });
  }, [ALL_COMPONENT_ITEMS, componentSlotFilter, componentQuery, getSectionIdForComponent]);

  // Group filtered items into separate categorized sections by class/type
  const categorizedSections = useMemo(() => {
    const map = new Map<string, typeof ALL_COMPONENT_ITEMS>();
    for (const sec of COMPONENT_SECTIONS_CONFIG) {
      map.set(sec.id, []);
    }
    for (const item of filteredComponentItems) {
      const secId = getSectionIdForComponent(item.type, item.slot);
      const list = map.get(secId) || [];
      list.push(item);
      map.set(secId, list);
    }
    return COMPONENT_SECTIONS_CONFIG.map((sec) => ({
      ...sec,
      items: map.get(sec.id) || [],
    })).filter((sec) => sec.items.length > 0);
  }, [filteredComponentItems, COMPONENT_SECTIONS_CONFIG, getSectionIdForComponent]);

  const signalKeys =
    waveformHistory.length > 0
      ? Object.keys(waveformHistory[waveformHistory.length - 1].signals)
      : [];

  const circuitOps = analyzeCircuitOperations(nodes, wires);
  const insightByNodeId = new Map<number, GateOperationInsight>();
  for (const ins of circuitOps.gateInsights) {
    insightByNodeId.set(ins.nodeId, ins);
  }
  const waveformProof = generateCircuitLabWaveformProof(
    nodes,
    wires,
    activePreset
  );

  const GATE_CASCADE_DEMOS: {
    name: string;
    nodes: PresetNodeDef[];
    wires: PresetWireDef[];
  }[] = [
    {
      name: "AND → NOT ⇒ NAND",
      nodes: [
        { type: "INPUT", x: 60, y: 150, value: 1, label: "A" },
        { type: "INPUT", x: 60, y: 250, value: 1, label: "B" },
        { type: "AND", x: 230, y: 200 },
        { type: "NOT", x: 420, y: 200 },
        { type: "OUTPUT", x: 600, y: 200, label: "Y" },
      ],
      wires: [
        [0, 0, 2, 0],
        [1, 0, 2, 1],
        [2, 0, 3, 0],
        [3, 0, 4, 0],
      ],
    },
    {
      name: "OR → NOT ⇒ NOR",
      nodes: [
        { type: "INPUT", x: 60, y: 150, value: 0, label: "A" },
        { type: "INPUT", x: 60, y: 250, value: 0, label: "B" },
        { type: "OR", x: 230, y: 200 },
        { type: "NOT", x: 420, y: 200 },
        { type: "OUTPUT", x: 600, y: 200, label: "Y" },
      ],
      wires: [
        [0, 0, 2, 0],
        [1, 0, 2, 1],
        [2, 0, 3, 0],
        [3, 0, 4, 0],
      ],
    },
    {
      name: "NAND → NAND ⇒ AND",
      nodes: [
        { type: "INPUT", x: 60, y: 150, value: 1, label: "A" },
        { type: "INPUT", x: 60, y: 250, value: 1, label: "B" },
        { type: "NAND", x: 230, y: 200 },
        { type: "NAND", x: 420, y: 200 },
        { type: "OUTPUT", x: 600, y: 200, label: "Y" },
      ],
      wires: [
        [0, 0, 2, 0],
        [1, 0, 2, 1],
        [2, 0, 3, 0],
        [2, 0, 3, 1],
        [3, 0, 4, 0],
      ],
    },
    {
      name: "De Morgan NAND ⇒ OR",
      nodes: [
        { type: "INPUT", x: 60, y: 130, value: 1, label: "A" },
        { type: "INPUT", x: 60, y: 270, value: 0, label: "B" },
        { type: "NOT", x: 210, y: 130 },
        { type: "NOT", x: 210, y: 270 },
        { type: "NAND", x: 400, y: 200 },
        { type: "OUTPUT", x: 590, y: 200, label: "Y" },
      ],
      wires: [
        [0, 0, 2, 0],
        [1, 0, 3, 0],
        [2, 0, 4, 0],
        [3, 0, 4, 1],
        [4, 0, 5, 0],
      ],
    },
    {
      name: "4× NAND ⇒ XOR",
      nodes: [
        { type: "INPUT", x: 50, y: 130, value: 1, label: "A" },
        { type: "INPUT", x: 50, y: 270, value: 0, label: "B" },
        { type: "NAND", x: 200, y: 200 },
        { type: "NAND", x: 360, y: 120 },
        { type: "NAND", x: 360, y: 280 },
        { type: "NAND", x: 530, y: 200 },
        { type: "OUTPUT", x: 700, y: 200, label: "Y" },
      ],
      wires: [
        [0, 0, 2, 0],
        [1, 0, 2, 1],
        [0, 0, 3, 0],
        [2, 0, 3, 1],
        [2, 0, 4, 0],
        [1, 0, 4, 1],
        [3, 0, 5, 0],
        [4, 0, 5, 1],
        [5, 0, 6, 0],
      ],
    },
    {
      name: "XOR → NOT ⇒ XNOR",
      nodes: [
        { type: "INPUT", x: 60, y: 150, value: 1, label: "A" },
        { type: "INPUT", x: 60, y: 250, value: 1, label: "B" },
        { type: "XOR", x: 230, y: 200 },
        { type: "NOT", x: 420, y: 200 },
        { type: "OUTPUT", x: 600, y: 200, label: "Y" },
      ],
      wires: [
        [0, 0, 2, 0],
        [1, 0, 2, 1],
        [2, 0, 3, 0],
        [3, 0, 4, 0],
      ],
    },
    {
      name: "AND → AND ⇒ 3-In AND",
      nodes: [
        { type: "INPUT", x: 60, y: 110, value: 1, label: "A" },
        { type: "INPUT", x: 60, y: 200, value: 1, label: "B" },
        { type: "INPUT", x: 60, y: 290, value: 1, label: "C" },
        { type: "AND", x: 230, y: 150 },
        { type: "AND", x: 420, y: 220 },
        { type: "OUTPUT", x: 600, y: 220, label: "Y" },
      ],
      wires: [
        [0, 0, 3, 0],
        [1, 0, 3, 1],
        [3, 0, 4, 0],
        [2, 0, 4, 1],
        [4, 0, 5, 0],
      ],
    },
    {
      name: "AC 5V · 3-Resistor Series (Ohm's Law V = IR & KVL)",
      nodes: [
        {
          type: "AC_SINE",
          x: 50,
          y: 220,
          label: "AC 5V Gen",
          analogParams: {
            acVoltageV: 5.0,
            frequencyHz: 1000,
            userValue: 5.0,
            userUnit: "V",
            formattedValue: "5.0V 1kHz",
          },
        },
        {
          type: "AMMETER",
          x: 210,
          y: 220,
          label: "In-Line Ammeter",
        },
        {
          type: "RES",
          x: 350,
          y: 220,
          label: "R1 (100Ω)",
          analogParams: {
            resistanceOhms: 100,
            userValue: 100,
            userUnit: "Ω",
            formattedValue: "100 Ω",
          },
        },
        {
          type: "RES",
          x: 480,
          y: 220,
          label: "R2 (100Ω)",
          analogParams: {
            resistanceOhms: 100,
            userValue: 100,
            userUnit: "Ω",
            formattedValue: "100 Ω",
          },
        },
        {
          type: "RES",
          x: 610,
          y: 220,
          label: "R3 (100Ω)",
          analogParams: {
            resistanceOhms: 100,
            userValue: 100,
            userUnit: "Ω",
            formattedValue: "100 Ω",
          },
        },
        {
          type: "GND",
          x: 750,
          y: 220,
          label: "Earth GND",
        },
        {
          type: "VOLTMETER",
          x: 480,
          y: 60,
          label: "DMM Across R2",
        },
      ],
      wires: [
        [0, 0, 1, 0], // AC+ (out:0) -> Ammeter IN (in:0)
        [1, 0, 2, 0], // Ammeter OUT (out:0) -> R1 IN (in:0)
        [2, 0, 3, 0], // R1 OUT (out:0) -> R2 IN (in:0)
        [3, 0, 4, 0], // R2 OUT (out:0) -> R3 IN (in:0)
        [4, 0, 5, 0], // R3 OUT (out:0) -> GND IN (in:0)
        [0, 1, 5, 0], // AC- (out:1) -> GND 0V_REF (out:0) [Black Ground Wire connected to GND]
        [6, 0, 3, 0], // Voltmeter V+ (in:0) -> R2 IN (in:0)
        [6, 1, 3, 0], // Voltmeter V- (in:1) -> R2 OUT (out:0)
      ],
    },
  ];

  // Metrology Calculation Engine: Helper to determine potential at a wire connection point or node pin
  const getNodeVoltageAt = useCallback(
    (nodeId: number, port = 0, dir: "in" | "out" = "out"): number => {
      const targetNode = nodes.find((x) => x.id === nodeId);
      if (!targetNode) return 0;
      if (targetNode.type === "GND") return 0.0;
      if (targetNode.type === "VCC_5V" || targetNode.type === "VCC") return 5.0;
      if (targetNode.type === "VCC_12V") return 12.0;

      // Query real-time MNA solver solution for exact electrical potential
      if (targetNode.type === "AC_SINE") {
        const telem = analogSolution.compTelemetry.get(targetNode.id);
        if (telem) {
          return port === 0 ? telem.vTerm0 : telem.vTerm1;
        }
        return port === 0 ? (targetNode.analogParams?.acVoltageV ?? 5.0) : 0.0;
      }

      if (isAnalogOrPassiveType(targetNode.type)) {
        const telem = analogSolution.compTelemetry.get(targetNode.id);
        if (telem) {
          if (dir === "in") return telem.vTerm0;
          return telem.vTerm1;
        }
        return analogSolution.getPinVoltage(nodeId, port, dir);
      }

      if (targetNode.type === "DC_VOLTAGE" || targetNode.type === "BATTERY") {
        return targetNode.analogParams?.dcVoltageV ?? (targetNode.type === "BATTERY" ? 9.0 : 5.0);
      }
      if (targetNode.type === "INPUT") {
        return (targetNode.value ?? 0) === 1 ? 5.0 : 0.0;
      }
      // If we are looking at an "in" pin of a component, find which upstream wire feeds it
      if (dir === "in") {
        const feedingWire = wires.find((w) => w.to.node === nodeId && w.to.port === port);
        if (feedingWire) {
          return getNodeVoltageAt(
            feedingWire.from.node,
            feedingWire.from.port,
            feedingWire.from.dir || "out"
          );
        }
        return 0.0;
      }
      // "out" pin of general component / gate / IC
      const val = liveVals[targetNode.id]?.[port] ?? 0;
      if (val === -1) return 0.0;
      return val === 1 ? 5.0 : 0.0;
    },
    [nodes, wires, liveVals, analogSolution]
  );

  const getVoltmeterData = useCallback(
    (n: CircuitNode) => {
      // Pin 0 is V+ (Red lead), Pin 1 is V- (COM lead)
      const w0 = wires.find((w) => w.to.node === n.id && w.to.port === 0);
      const w1 = wires.find((w) => w.to.node === n.id && w.to.port === 1);

      const hasVPlus = !!w0;
      const hasVMinus = !!w1;

      let vPlus = 0.0;
      let vMinus = 0.0;
      let labelPlus = "Floating";
      let labelMinus = "Floating";

      if (w0) {
        vPlus = getNodeVoltageAt(w0.from.node, w0.from.port, w0.from.dir || "out");
        const nodeSrc = nodes.find((x) => x.id === w0.from.node);
        labelPlus = nodeSrc ? `${nodeSrc.label || nodeSrc.type}` : `N#${w0.from.node}`;
      }
      if (w1) {
        vMinus = getNodeVoltageAt(w1.from.node, w1.from.port, w1.from.dir || "out");
        const nodeSrc = nodes.find((x) => x.id === w1.from.node);
        labelMinus = nodeSrc ? `${nodeSrc.label || nodeSrc.type}` : `N#${w1.from.node}`;
      }

      let diffV = 0.0;
      let displayStr = "---.- V";
      let statusNote = "Open Leads (Attach Red V+ & Black COM across component)";
      let isConnected = false;
      let isAcross = false;
      let isSeriesBlocked = false;
      let faultWarning: string | undefined = undefined;

      const src0 = w0 ? nodes.find((x) => x.id === w0.from.node) : null;
      const src1 = w1 ? nodes.find((x) => x.id === w1.from.node) : null;

      // Detect if voltmeter is mistakenly placed in series blocking a load loop
      if (
        src0 &&
        src1 &&
        src0.id !== src1.id &&
        (src0.type.includes("VCC") || src0.type.includes("VOLTAGE") || src0.type === "BATTERY") &&
        src1.type !== "GND" &&
        wires.filter((w) => w.to.node === src1.id || w.from.node === src1.id).length <= 2
      ) {
        isSeriesBlocked = true;
        faultWarning = "Voltmeter wired in series blocks current (10 MΩ)! Connect in parallel.";
      }

      if (hasVPlus && hasVMinus) {
        isConnected = true;
        diffV = vPlus - vMinus;
        displayStr = `${diffV >= 0 ? "+" : ""}${diffV.toFixed(2)} V`;
        if (isSeriesBlocked) {
          statusNote = "⚠️ HIGH-Z SERIES BLOCK: 10MΩ internal resistance blocks current to load! Place in parallel.";
        } else if (w0.from.node === w1.from.node) {
          isAcross = true;
          const compName =
            nodes.find((x) => x.id === w0.from.node)?.label ||
            nodes.find((x) => x.id === w0.from.node)?.type;
          statusNote = `Parallel Across ${compName} (V+ = ${vPlus.toFixed(2)}V, V- = ${vMinus.toFixed(2)}V)`;
        } else {
          statusNote = `Diff: ${labelPlus} (+) to ${labelMinus} (-)`;
        }
      } else if (hasVPlus) {
        isConnected = true;
        diffV = vPlus;
        displayStr = `${diffV >= 0 ? "+" : ""}${diffV.toFixed(2)} V`;
        statusNote = `${labelPlus} referenced to GND (COM open)`;
      } else if (hasVMinus) {
        isConnected = true;
        diffV = -vMinus;
        displayStr = `${diffV >= 0 ? "+" : ""}${diffV.toFixed(2)} V`;
        statusNote = `COM attached to ${labelMinus} (V+ open)`;
      }

      return {
        vPlus,
        vMinus,
        diffV,
        displayStr,
        statusNote,
        isConnected,
        isAcross,
        isSeriesBlocked,
        faultWarning,
        labelPlus,
        labelMinus,
        hasVPlus,
        hasVMinus,
      };
    },
    [nodes, wires, getNodeVoltageAt]
  );

  const getAmmeterData = useCallback(
    (n: CircuitNode) => {
      // Ammeter must be placed IN SERIES:
      // Port 0 IN (left) connects to upstream supply / net
      // Port 0 OUT (right) connects to downstream load
      const wIn = wires.find((w) => w.to.node === n.id && w.to.port === 0);
      const wOut = wires.find((w) => w.from.node === n.id && w.from.port === 0);

      const hasIn = !!wIn;
      const hasOut = !!wOut;

      let current_mA = 0.0;
      let displayStr = "0.00 mA";
      let statusNote = "Open Loop (Insert in-line series between source & load)";
      let isShortCircuit = false;
      let isSeriesValid = false;
      let loadDescription = "None";
      let faultWarning: string | undefined = undefined;

      if (!hasIn || !hasOut) {
        if (hasIn && !hasOut) {
          displayStr = "0.00 mA";
          statusNote = "Open series output (Connect I_OUT to downstream load)";
        } else if (!hasIn && hasOut) {
          displayStr = "0.00 mA";
          statusNote = "Open series input (Connect I_IN from voltage source)";
        } else {
          displayStr = "0.00 mA";
          statusNote = "Unconnected (Ammeter must be placed in-series)";
        }
        return {
          hasIn,
          hasOut,
          current_mA,
          displayStr,
          statusNote,
          isShortCircuit,
          isSeriesValid,
          loadDescription,
          faultWarning,
        };
      }

      // Both in and out are wired: series loop is closed!
      isSeriesValid = true;
      const telem = analogSolution.compTelemetry.get(n.id);
      if (telem && telem.current_mA > 0.001) {
        current_mA = telem.current_mA;
        if (current_mA > 2400) {
          isShortCircuit = true;
          displayStr = "> 2.50 A ⚠️";
          statusNote = "🚨 DEAD SHORT CIRCUIT! Ammeter placed directly across supply without load!";
          faultWarning = "Dead short hazard! Ammeter shunt resistance is ~0.001Ω. Insert a load in series.";
        } else {
          displayStr =
            current_mA >= 1000
              ? `${(current_mA / 1000).toFixed(2)} A`
              : `${current_mA.toFixed(2)} mA`;
          statusNote = `In-Series Closed Loop: I = ${displayStr} (Ohm's Law V = IR Verified across ${analogSolution.totalLoopResistanceOhms.toFixed(0)}Ω load)`;
        }
        return {
          hasIn,
          hasOut,
          current_mA,
          displayStr,
          statusNote,
          isShortCircuit,
          isSeriesValid: true,
          loadDescription: "Series Loop",
          faultWarning,
        };
      }

      const vin = getNodeVoltageAt(wIn.from.node, wIn.from.port, wIn.from.dir || "out");
      const loadNode = nodes.find((x) => x.id === wOut.to.node);

      if (!loadNode) {
        displayStr = "0.00 mA";
        statusNote = "Unknown load connection";
        return {
          hasIn,
          hasOut,
          current_mA,
          displayStr,
          statusNote,
          isShortCircuit,
          isSeriesValid,
          loadDescription,
          faultWarning,
        };
      }

      loadDescription = loadNode.label || loadNode.type;

      // Check if downstream is connected straight to GND without a load resistor -> dangerous short circuit!
      if (loadNode.type === "GND") {
        if (vin > 0.5) {
          isShortCircuit = true;
          displayStr = "> 2.50 A ⚠️";
          statusNote = "⚠️ SHORT CIRCUIT! Ammeter placed in parallel across supply! Add series load.";
          current_mA = 2500;
          faultWarning = "Dead short circuit! Do not wire ammeter directly from supply to ground.";
        } else {
          displayStr = "0.00 mA";
          statusNote = "Series to GND (0V drive)";
        }
        return {
          hasIn,
          hasOut,
          current_mA,
          displayStr,
          statusNote,
          isShortCircuit,
          isSeriesValid,
          loadDescription,
          faultWarning,
        };
      }

      if (vin <= 0.01) {
        displayStr = "0.00 mA";
        statusNote = `Series loop closed to ${loadDescription} (0.0V source)`;
        return {
          hasIn,
          hasOut,
          current_mA,
          displayStr,
          statusNote,
          isShortCircuit,
          isSeriesValid,
          loadDescription,
          faultWarning,
        };
      }

      // Calculate current based on downstream load
      if (loadNode.type === "RESISTOR" || loadNode.type === "RES") {
        const rOhms = loadNode.analogParams?.resistanceOhms ?? 1000;
        current_mA = (vin / rOhms) * 1000;
        displayStr =
          current_mA >= 1000
            ? `${(current_mA / 1000).toFixed(2)} A`
            : `${current_mA.toFixed(2)} mA`;
        statusNote = `Series with ${loadDescription} (${rOhms}Ω, Vin=${vin.toFixed(1)}V)`;
      } else if (loadNode.type === "LED") {
        current_mA = 15.0;
        displayStr = "15.00 mA";
        statusNote = `Series forward current driving ${loadDescription}`;
      } else if (loadNode.type === "POTENTIOMETER" || loadNode.type === "POT") {
        const rOhms = loadNode.analogParams?.resistanceOhms ?? 10000;
        current_mA = (vin / rOhms) * 1000;
        displayStr = `${current_mA.toFixed(2)} mA`;
        statusNote = `Series with ${loadDescription} (${rOhms}Ω)`;
      } else if (loadNode.type === "OUTPUT") {
        current_mA = 12.5;
        displayStr = "12.50 mA";
        statusNote = `Series loop terminating at ${loadDescription}`;
      } else {
        // Digital logic input loading
        current_mA = 3.3;
        displayStr = "3.30 mA";
        statusNote = `Series driving ${loadDescription} logic input`;
      }

      return {
        hasIn,
        hasOut,
        current_mA,
        displayStr,
        statusNote,
        isShortCircuit,
        isSeriesValid,
        loadDescription,
        faultWarning,
      };
    },
    [nodes, wires, getNodeVoltageAt, analogSolution]
  );

  const getOhmmeterData = useCallback(
    (n: CircuitNode) => {
      // Pin 0 is Ω+ (Red lead), Pin 1 is Ω- (Black lead)
      const w0 = wires.find((w) => w.to.node === n.id && w.to.port === 0);
      const w1 = wires.find((w) => w.to.node === n.id && w.to.port === 1);

      const has0 = !!w0;
      const has1 = !!w1;

      if (!has0 || !has1) {
        return {
          has0,
          has1,
          isConnected: false,
          isLiveCircuit: false,
          isSneakPath: false,
          displayStr: "O.L. MΩ",
          resistanceOhms: Infinity,
          statusNote: has0 || has1 ? "Open probe (Connect both Ω+ and Ω- across DUT)" : "Open test leads (Circuit must be unpowered)",
          faultWarning: undefined,
        };
      }

      // Both leads connected: check if circuit is energized
      const src0 = w0 ? nodes.find((x) => x.id === w0.from.node) : null;
      const src1 = w1 ? nodes.find((x) => x.id === w1.from.node) : null;
      const v0 = src0 ? analogSolution.getPinVoltage(src0.id, w0.from.port ?? 0, w0.from.dir || "out") : 0;
      const v1 = src1 ? analogSolution.getPinVoltage(src1.id, w1.from.port ?? 0, w1.from.dir || "out") : 0;
      const vDiff = Math.abs(v0 - v1);

      if (vDiff > 0.05 || Math.abs(v0) > 0.1 || Math.abs(v1) > 0.1) {
        return {
          has0: true,
          has1: true,
          isConnected: true,
          isLiveCircuit: true,
          isSneakPath: false,
          displayStr: "⚡ LIVE CKT!",
          resistanceOhms: NaN,
          statusNote: `⚡ LIVE CIRCUIT! External voltage (${vDiff.toFixed(2)}V) detected. Disconnect power to measure resistance!`,
          faultWarning: `External voltage ${vDiff.toFixed(2)}V detected across leads! Disconnect power to prevent meter damage.`,
        };
      }

      // Unpowered circuit: determine equivalent resistance
      let measuredR = 0;
      let isSneakPath = false;
      let dutLabel = "Component";

      if (w0.from.node === w1.from.node && src0) {
        dutLabel = src0.label || src0.type;
        if (src0.type === "RES" || src0.type === "RESISTOR") {
          measuredR = src0.analogParams?.resistanceOhms ?? 1000;
        } else if (src0.type === "POT") {
          measuredR = src0.analogParams?.resistanceOhms ?? 10000;
        } else if (src0.type === "WIRE" || src0.type === "FUSE") {
          measuredR = 0.01;
        } else if (src0.type === "DIODE_1N4007" || src0.type === "SCHOTTKY") {
          measuredR = Infinity;
        } else {
          measuredR = src0.analogParams?.resistanceOhms ?? 1000;
        }

        const otherWires = wires.filter(
          (w) =>
            (w.from.node === src0.id || w.to.node === src0.id) &&
            w.to.node !== n.id
        );
        if (otherWires.length > 0) {
          isSneakPath = true;
        }
      } else {
        const brs = nodes.filter((x) => x.type === "RES" || x.type === "RESISTOR" || x.type === "POT");
        if (brs.length > 0) {
          measuredR = brs[0].analogParams?.resistanceOhms ?? 1000;
        } else {
          measuredR = Infinity;
        }
      }

      let displayStr = "---.- Ω";
      if (!isFinite(measuredR) || isNaN(measuredR)) {
        displayStr = "O.L. MΩ";
      } else if (measuredR >= 1e6) {
        displayStr = `${(measuredR / 1e6).toFixed(2)} MΩ`;
      } else if (measuredR >= 1e3) {
        displayStr = `${(measuredR / 1e3).toFixed(2)} kΩ`;
      } else {
        displayStr = `${measuredR.toFixed(1)} Ω`;
      }

      return {
        has0: true,
        has1: true,
        isConnected: true,
        isLiveCircuit: false,
        isSneakPath,
        displayStr,
        resistanceOhms: measuredR,
        statusNote: isSneakPath
          ? `In-Circuit ${dutLabel}: ${displayStr} (Note: parallel branches may reduce reading; lift 1 pin to isolate)`
          : `Isolated ${dutLabel}: ${displayStr} (100% precision reading)`,
        faultWarning: isSneakPath ? "In-circuit parallel sneak path detected. Isolate one terminal for precision reading." : undefined,
      };
    },
    [nodes, wires, analogSolution]
  );

  const getPowerMeterData = useCallback(
    (n: CircuitNode) => {
      // Inputs:
      // port 0 in: V+ (Red)
      // port 1 in: V- (COM)
      // port 2 in: I_IN (+)
      // Output:
      // port 0 out: I_OUT (-)
      const wV0 = wires.find((w) => w.to.node === n.id && w.to.port === 0);
      const wV1 = wires.find((w) => w.to.node === n.id && w.to.port === 1);
      const wIIn = wires.find((w) => w.to.node === n.id && w.to.port === 2);
      const wIOut = wires.find((w) => w.from.node === n.id && w.from.port === 0);

      const hasV0 = !!wV0;
      const hasV1 = !!wV1;
      const hasIIn = !!wIIn;
      const hasIOut = !!wIOut;

      const hasVCoil = hasV0 && hasV1;
      const hasICoil = hasIIn && hasIOut;

      const srcV0 = wV0 ? nodes.find((x) => x.id === wV0.from.node) : null;
      const srcV1 = wV1 ? nodes.find((x) => x.id === wV1.from.node) : null;
      const v0 = srcV0 && wV0 ? analogSolution.getPinVoltage(srcV0.id, wV0.from.port ?? 0, wV0.from.dir || "out") : 0;
      const v1 = srcV1 && wV1 ? analogSolution.getPinVoltage(srcV1.id, wV1.from.port ?? 0, wV1.from.dir || "out") : 0;
      const vDrop = hasVCoil ? v0 - v1 : hasV0 ? v0 : hasV1 ? -v1 : 0;
      const absVDrop = Math.abs(vDrop);

      const telem = analogSolution.compTelemetry.get(n.id);
      const current_mA = telem ? telem.current_mA : 0;
      const isShortCircuit =
        hasICoil &&
        ((nodes.find((x) => x.id === wIOut?.to.node)?.type === "GND" &&
          nodes.find((x) => x.id === wIIn?.from.node)?.type.includes("VCC")) ||
          current_mA > 2400);

      const power_W = vDrop * (current_mA / 1000);
      const absPower_W = Math.abs(power_W);
      const power_mW = absPower_W * 1000;

      let displayStr = "---.- mW";
      let statusNote = "4-Terminal Wattmeter (Wire V-coil in parallel & I-coil in series)";
      let faultWarning: string | undefined = undefined;

      if (isShortCircuit) {
        displayStr = "⚠️ SHORT CKT!";
        statusNote = "🚨 Current coil dead short! Current coil has ~0Ω shunt. Do not place across power rails.";
        faultWarning = "Current coil dead short hazard! Insert a series load resistor.";
      } else if (hasVCoil && hasICoil) {
        if (absPower_W >= 1.0) {
          displayStr = `${power_W.toFixed(2)} W`;
        } else if (power_mW >= 1.0) {
          displayStr = `${(power_W * 1000).toFixed(1)} mW`;
        } else {
          displayStr = `${(power_W * 1e6).toFixed(0)} µW`;
        }
        statusNote = `Optimal Dual-Coil: P = V·I = ${displayStr} (V = ${absVDrop.toFixed(2)}V, I = ${current_mA.toFixed(1)}mA)`;
        if (power_W < -0.001) {
          faultWarning = "Negative power reading: reverse probe polarity on voltage or current coil.";
        }
      } else if (hasVCoil && !hasICoil) {
        displayStr = `0.00 mW (I OPEN)`;
        statusNote = `Voltage coil connected (${absVDrop.toFixed(2)}V), but current coil is open. Connect I_IN & I_OUT in series with load.`;
        faultWarning = "Missing current coil connection. P = V × 0 = 0 W.";
      } else if (!hasVCoil && hasICoil) {
        displayStr = `0.00 mW (V OPEN)`;
        statusNote = `Current coil carrying ${current_mA.toFixed(1)}mA, but voltage sense leads (V+, V-) are disconnected.`;
        faultWarning = "Missing voltage coil connection. P = 0 × I = 0 W.";
      } else {
        displayStr = "0.00 mW";
        statusNote = "Unconnected dual-coil wattmeter. Connect V+ & V- across load, and I_IN & I_OUT in series.";
      }

      return {
        hasVCoil,
        hasICoil,
        hasV0,
        hasV1,
        hasIIn,
        hasIOut,
        vDrop,
        absVDrop,
        current_mA,
        power_W,
        power_mW,
        displayStr,
        statusNote,
        isShortCircuit,
        faultWarning,
      };
    },
    [nodes, wires, analogSolution]
  );

  const meterFaultCount = useMemo(() => {
    let count = 0;
    for (const n of nodes) {
      if (n.type === "AMMETER") {
        const aData = getAmmeterData(n);
        if (aData.isShortCircuit) count++;
      } else if (n.type === "VOLTMETER") {
        const vData = getVoltmeterData(n);
        if (vData.isSeriesBlocked) count++;
      } else if (n.type === "OHMMETER") {
        const oData = getOhmmeterData(n);
        if (oData.isLiveCircuit) count++;
      } else if (n.type === "POWER_METER" || n.type === "WATTMETER") {
        const pData = getPowerMeterData(n);
        if (pData.isShortCircuit || (!pData.hasVCoil && pData.hasICoil) || (pData.hasVCoil && !pData.hasICoil)) count++;
      }
    }
    return count;
  }, [nodes, getAmmeterData, getVoltmeterData, getOhmmeterData, getPowerMeterData]);

  const firstFaultInfo = useMemo(() => {
    for (const n of nodes) {
      if (n.type === "AMMETER") {
        const aData = getAmmeterData(n);
        if (aData.isShortCircuit) {
          const title = "Dead Short Circuit Hazard";
          const message = "In-Line Ammeter is wired directly across power rails without a series load! Its 0.001 Ω shunt causes a dead short.";
          return {
            nodeId: n.id,
            type: "AMMETER",
            meterType: "AMMETER" as const,
            title,
            description: message,
            tip: "Insert a current-limiting resistor in series between I_OUT and Ground.",
            fault: {
              nodeId: n.id,
              type: "AMMETER",
              meterType: "AMMETER" as const,
              title,
              message,
            },
          };
        }
      } else if (n.type === "VOLTMETER") {
        const vData = getVoltmeterData(n);
        if (vData.isSeriesBlocked) {
          const title = "High-Impedance Series Block";
          const message = "Voltmeter is wired in series with the load. Its 10 MΩ internal resistance blocks current to the circuit.";
          return {
            nodeId: n.id,
            type: "VOLTMETER",
            meterType: "VOLTMETER" as const,
            title,
            description: message,
            tip: "Rewire the voltmeter in PARALLEL across the load instead of breaking the line.",
            fault: {
              nodeId: n.id,
              type: "VOLTMETER",
              meterType: "VOLTMETER" as const,
              title,
              message,
            },
          };
        }
      } else if (n.type === "OHMMETER") {
        const oData = getOhmmeterData(n);
        if (oData.isLiveCircuit) {
          const title = "Live Circuit Voltage Hazard";
          const message = "External voltage detected on ohmmeter leads! An ohmmeter requires a completely de-energized component (0V).";
          return {
            nodeId: n.id,
            type: "OHMMETER",
            meterType: "OHMMETER" as const,
            title,
            description: message,
            tip: "Disconnect or switch off power sources before taking resistance measurements.",
            fault: {
              nodeId: n.id,
              type: "OHMMETER",
              meterType: "OHMMETER" as const,
              title,
              message,
            },
          };
        }
      } else if (n.type === "POWER_METER" || n.type === "WATTMETER") {
        const pData = getPowerMeterData(n);
        if (pData.isShortCircuit) {
          const title = "Wattmeter Current Coil Short Circuit";
          const message = "Wattmeter current coil (I_IN to I_OUT) is connected directly from supply to ground without a series load.";
          return {
            nodeId: n.id,
            type: "POWER_METER",
            meterType: "POWER_METER" as const,
            title,
            description: message,
            tip: "Place a load resistor in series with the current coil.",
            fault: {
              nodeId: n.id,
              type: "POWER_METER",
              meterType: "POWER_METER" as const,
              title,
              message,
            },
          };
        }
        if (!pData.hasVCoil && pData.hasICoil) {
          const title = "Missing Voltage Coil Connection";
          const message = "Wattmeter current coil is carrying current, but voltage sense leads (V+, V-) are disconnected. P = 0 × I = 0W.";
          return {
            nodeId: n.id,
            type: "POWER_METER",
            meterType: "POWER_METER" as const,
            title,
            description: message,
            tip: "Connect V+ and V- in parallel across the load.",
            fault: {
              nodeId: n.id,
              type: "POWER_METER",
              meterType: "POWER_METER" as const,
              title,
              message,
            },
          };
        }
        if (pData.hasVCoil && !pData.hasICoil) {
          const title = "Missing Current Coil Connection";
          const message = "Wattmeter voltage coil is sensing voltage, but current coil is open. P = V × 0 = 0W.";
          return {
            nodeId: n.id,
            type: "POWER_METER",
            meterType: "POWER_METER" as const,
            title,
            description: message,
            tip: "Insert I_IN and I_OUT in series into the load current loop.",
            fault: {
              nodeId: n.id,
              type: "POWER_METER",
              meterType: "POWER_METER" as const,
              title,
              message,
            },
          };
        }
      }
    }
    return null;
  }, [nodes, getAmmeterData, getVoltmeterData, getOhmmeterData, getPowerMeterData]);

  // Smart 1-Click Auto-Probe across selected component for University Engineers
  const handleAutoMeasureComponent = useCallback(
    (targetNodeId: number, meterType: "VOLTMETER" | "AMMETER" | "OHMMETER" | "POWER_METER") => {
      const target = nodes.find((n) => n.id === targetNodeId);
      if (!target) return;

      const comp = COMP_SPECS[target.type];
      const targetW = comp?.w || 80;
      const targetH = comp?.h || 60;

      if (meterType === "VOLTMETER") {
        // Place voltmeter in parallel across target component
        const meterId = idCounterRef.current++;
        const newMeter: CircuitNode = {
          id: meterId,
          type: "VOLTMETER",
          label: `DVM Across ${target.label || target.type}`,
          x: target.x,
          y: target.y + targetH + 35,
        };

        const w1: CircuitWire = {
          id: idCounterRef.current++,
          from: { node: target.id, port: 0, dir: "in" },
          to: { node: meterId, port: 0 },
        };
        const w2: CircuitWire = {
          id: idCounterRef.current++,
          from: { node: target.id, port: 0, dir: "out" },
          to: { node: meterId, port: 1 },
        };

        const nextNodes = [...nodes, newMeter];
        const nextWires = [...wires, w1, w2];
        const { updatedNodes, outs } = evaluateCircuit(nextNodes, nextWires);
        setNodes(updatedNodes);
        setWires(nextWires);
        setSelected({ type: "node", id: meterId });
        pushWaveformSnapshot(updatedNodes, outs);
        showClipboardNotice(`Auto-Wired Voltmeter in PARALLEL across ${target.label || target.type}`);
      } else if (meterType === "AMMETER") {
        // Place ammeter in series before target component
        const meterId = idCounterRef.current++;
        const newMeter: CircuitNode = {
          id: meterId,
          type: "AMMETER",
          label: `Ammeter for ${target.label || target.type}`,
          x: Math.max(20, target.x - 140),
          y: target.y,
        };

        const existingInWireIdx = wires.findIndex(
          (w) => w.to.node === target.id && w.to.port === 0
        );

        let nextWires = [...wires];
        if (existingInWireIdx >= 0) {
          const oldW = nextWires[existingInWireIdx];
          nextWires[existingInWireIdx] = {
            ...oldW,
            to: { node: meterId, port: 0 },
          };
        }

        nextWires.push({
          id: idCounterRef.current++,
          from: { node: meterId, port: 0, dir: "out" },
          to: { node: target.id, port: 0 },
        });

        const nextNodes = [...nodes, newMeter];
        const { updatedNodes, outs } = evaluateCircuit(nextNodes, nextWires);
        setNodes(updatedNodes);
        setWires(nextWires);
        setSelected({ type: "node", id: meterId });
        pushWaveformSnapshot(updatedNodes, outs);
        showClipboardNotice(`Auto-Wired Ammeter IN SERIES with ${target.label || target.type}`);
      } else if (meterType === "OHMMETER") {
        // Attach ohmmeter across component (de-energized testing)
        const meterId = idCounterRef.current++;
        const newMeter: CircuitNode = {
          id: meterId,
          type: "OHMMETER",
          label: `Ohmmeter on ${target.label || target.type}`,
          x: target.x,
          y: target.y + targetH + 35,
        };

        const w1: CircuitWire = {
          id: idCounterRef.current++,
          from: { node: target.id, port: 0, dir: "in" },
          to: { node: meterId, port: 0 },
        };
        const w2: CircuitWire = {
          id: idCounterRef.current++,
          from: { node: target.id, port: 0, dir: "out" },
          to: { node: meterId, port: 1 },
        };

        const nextNodes = [...nodes, newMeter];
        const nextWires = [...wires, w1, w2];
        const { updatedNodes, outs } = evaluateCircuit(nextNodes, nextWires);
        setNodes(updatedNodes);
        setWires(nextWires);
        setSelected({ type: "node", id: meterId });
        pushWaveformSnapshot(updatedNodes, outs);
        showClipboardNotice(`Attached Ohmmeter across ${target.label || target.type} (De-energized testing)`);
      } else if (meterType === "POWER_METER") {
        // Place 4-terminal wattmeter: V-coil across load, I-coil in series
        const meterId = idCounterRef.current++;
        const newMeter: CircuitNode = {
          id: meterId,
          type: "POWER_METER",
          label: `Wattmeter on ${target.label || target.type}`,
          x: target.x + targetW + 40,
          y: target.y,
        };

        const wV0: CircuitWire = {
          id: idCounterRef.current++,
          from: { node: target.id, port: 0, dir: "in" },
          to: { node: meterId, port: 0 },
        };
        const wV1: CircuitWire = {
          id: idCounterRef.current++,
          from: { node: target.id, port: 0, dir: "out" },
          to: { node: meterId, port: 1 },
        };

        const nextNodes = [...nodes, newMeter];
        const nextWires = [...wires, wV0, wV1];
        const { updatedNodes, outs } = evaluateCircuit(nextNodes, nextWires);
        setNodes(updatedNodes);
        setWires(nextWires);
        setSelected({ type: "node", id: meterId });
        pushWaveformSnapshot(updatedNodes, outs);
        showClipboardNotice(`Auto-Wired Wattmeter dual-coil to ${target.label || target.type}`);
      }
    },
    [nodes, wires, evaluateCircuit, pushWaveformSnapshot, showClipboardNotice]
  );

  // Auto-Attach handler: creates logical, color-coded virtual wire connections or snaps dock probes to the clicked node
  const executeAutoAttachToNode = useCallback(
    (targetNodeId: number, spec: AutoAttachInstrumentSpec) => {
      const target = nodes.find((n) => n.id === targetNodeId);
      if (!target) {
        setPendingAutoAttach(null);
        return;
      }

      if (spec.mode === "DOCK_SCOPE_CH1") {
        setDockScopeCh1NodeId(targetNodeId);
        setIsInstrumentsDrawerOpen(true);
        setBottomInstrumentTab("BENCH_DOCK");
        setPendingAutoAttach(null);
        showClipboardNotice(`Auto-Attached XSC1 CH1 (Yellow) → ${target.label || target.type} #${target.id}`);
        return;
      }
      if (spec.mode === "DOCK_SCOPE_CH2") {
        setDockScopeCh2NodeId(targetNodeId);
        setIsInstrumentsDrawerOpen(true);
        setBottomInstrumentTab("BENCH_DOCK");
        setPendingAutoAttach(null);
        showClipboardNotice(`Auto-Attached XSC1 CH2 (Cyan) → ${target.label || target.type} #${target.id}`);
        return;
      }
      if (spec.mode === "DOCK_DMM_POS") {
        setDockDmmPosNodeId(targetNodeId);
        setIsInstrumentsDrawerOpen(true);
        setBottomInstrumentTab("BENCH_DOCK");
        setPendingAutoAttach(null);
        showClipboardNotice(`Auto-Attached DMM V+ (Sky) → ${target.label || target.type} #${target.id}`);
        return;
      }
      if (spec.mode === "DOCK_DMM_COM") {
        setDockDmmComNodeId(targetNodeId);
        setIsInstrumentsDrawerOpen(true);
        setBottomInstrumentTab("BENCH_DOCK");
        setPendingAutoAttach(null);
        showClipboardNotice(`Auto-Attached DMM COM (Slate) → ${target.label || target.type} #${target.id}`);
        return;
      }
      if (spec.mode === "DOCK_SIGGEN") {
        setDockSigGen((prev) => ({ ...prev, enabled: true, nodeId: targetNodeId }));
        setIsInstrumentsDrawerOpen(true);
        setBottomInstrumentTab("BENCH_DOCK");
        setPendingAutoAttach(null);
        showClipboardNotice(`Auto-Attached Signal Generator XFG1 (Amber) → ${target.label || target.type} #${target.id}`);
        return;
      }

      const compSpec = COMP_SPECS[target.type];
      const gateSpec = GATE_SPECS[target.type];
      const targetW = compSpec?.w || gateSpec?.outX || 72;
      const targetH = compSpec?.h || 56;
      const hasBothInOut = Boolean(
        compSpec && compSpec.inputs.length > 0 && compSpec.outputs.length > 0
      );

      if (spec.mode === "SERIES" && spec.instrumentType === "AMMETER") {
        const meterId = idCounterRef.current++;
        const newMeter: CircuitNode = {
          id: meterId,
          type: "AMMETER",
          label: `Ammeter (${target.label || target.type})`,
          x: snapValueToGrid(Math.max(20, target.x - 150), gridPitch, snapToGrid),
          y: snapValueToGrid(target.y, gridPitch, snapToGrid),
        };
        const existingInWireIdx = wires.findIndex(
          (w) => w.to.node === target.id && w.to.port === 0
        );
        const nextWires = [...wires];
        if (existingInWireIdx >= 0) {
          nextWires[existingInWireIdx] = {
            ...nextWires[existingInWireIdx],
            to: { node: meterId, port: 0, dir: "in" },
            color: spec.color,
            isVirtualInstrumentWire: true,
            virtualTag: `${spec.tag} IN`,
          };
        }
        nextWires.push({
          id: idCounterRef.current++,
          from: { node: meterId, port: 0, dir: "out" },
          to: { node: target.id, port: 0, dir: "in" },
          color: spec.color,
          isVirtualInstrumentWire: true,
          virtualTag: `${spec.tag} OUT`,
        });
        const nextNodes = [...nodes, newMeter];
        const { updatedNodes, outs } = evaluateCircuit(nextNodes, nextWires);
        setNodes(updatedNodes);
        setWires(nextWires);
        setSelected({ type: "node", id: meterId });
        pushWaveformSnapshot(updatedNodes, outs);
        setPendingAutoAttach(null);
        showClipboardNotice(`Auto-Attached ${spec.label} in SERIES with ${target.label || target.type}`);
        return;
      }

      if (spec.mode === "PARALLEL") {
        const meterId = idCounterRef.current++;
        const meterX = snapValueToGrid(target.x + 10, gridPitch, snapToGrid);
        const meterY = snapValueToGrid(target.y + targetH + 48, gridPitch, snapToGrid);
        const newMeter: CircuitNode = {
          id: meterId,
          type: spec.instrumentType,
          label: `${spec.label} (${target.label || target.type})`,
          x: meterX,
          y: meterY,
        };

        const addedNodes: CircuitNode[] = [newMeter];
        const addedWires: CircuitWire[] = [];

        if (hasBothInOut) {
          addedWires.push(
            {
              id: idCounterRef.current++,
              from: { node: target.id, port: 0, dir: "in" },
              to: { node: meterId, port: 0, dir: "in" },
              color: spec.color,
              isVirtualInstrumentWire: true,
              virtualTag: `${spec.tag} +`,
            },
            {
              id: idCounterRef.current++,
              from: { node: target.id, port: 0, dir: "out" },
              to: { node: meterId, port: 1, dir: "in" },
              color: "#94a3b8",
              isVirtualInstrumentWire: true,
              virtualTag: "COM",
            }
          );
        } else {
          const isInputOnlyNode =
            target.type === "OUTPUT" ||
            (compSpec && compSpec.outputs.length === 0 && compSpec.inputs.length > 0);
          const sourceDir: "in" | "out" = isInputOnlyNode ? "in" : "out";
          addedWires.push({
            id: idCounterRef.current++,
            from: { node: target.id, port: 0, dir: sourceDir },
            to: { node: meterId, port: 0, dir: "in" },
            color: spec.color,
            isVirtualInstrumentWire: true,
            virtualTag: `${spec.tag} +`,
          });

          let gndNode = nodes.find((x) => x.type === "GND");
          if (!gndNode) {
            const gndId = idCounterRef.current++;
            gndNode = {
              id: gndId,
              type: "GND",
              label: "Earth GND",
              x: snapValueToGrid(meterX - 110, gridPitch, snapToGrid),
              y: snapValueToGrid(meterY + 10, gridPitch, snapToGrid),
            };
            addedNodes.push(gndNode);
          }
          addedWires.push({
            id: idCounterRef.current++,
            from: { node: gndNode.id, port: 0, dir: "out" },
            to: { node: meterId, port: 1, dir: "in" },
            color: "#94a3b8",
            isVirtualInstrumentWire: true,
            virtualTag: "GND",
          });
        }

        const nextNodes = [...nodes, ...addedNodes];
        const nextWires = [...wires, ...addedWires];
        const { updatedNodes, outs } = evaluateCircuit(nextNodes, nextWires);
        setNodes(updatedNodes);
        setWires(nextWires);
        setSelected({ type: "node", id: meterId });
        pushWaveformSnapshot(updatedNodes, outs);
        setPendingAutoAttach(null);
        showClipboardNotice(`Auto-Attached ${spec.label} to ${target.label || target.type}`);
        return;
      }

      // Single-input visual/audio probe (LED, Output, Buzzer, 7-Segment)
      const instId = idCounterRef.current++;
      const instX = snapValueToGrid(target.x + targetW + 64, gridPitch, snapToGrid);
      const instY = snapValueToGrid(target.y, gridPitch, snapToGrid);
      const newInst: CircuitNode = {
        id: instId,
        type: spec.instrumentType,
        label: `${spec.label} (${target.label || target.type})`,
        x: instX,
        y: instY,
      };
      const isInputOnlyTarget =
        target.type === "OUTPUT" ||
        (compSpec && compSpec.outputs.length === 0 && compSpec.inputs.length > 0);
      const wireOut: CircuitWire = {
        id: idCounterRef.current++,
        from: { node: target.id, port: 0, dir: isInputOnlyTarget ? "in" : "out" },
        to: { node: instId, port: 0, dir: "in" },
        color: spec.color,
        isVirtualInstrumentWire: true,
        virtualTag: spec.tag,
      };
      const nextNodes = [...nodes, newInst];
      const nextWires = [...wires, wireOut];
      const { updatedNodes, outs } = evaluateCircuit(nextNodes, nextWires);
      setNodes(updatedNodes);
      setWires(nextWires);
      setSelected({ type: "node", id: instId });
      pushWaveformSnapshot(updatedNodes, outs);
      setPendingAutoAttach(null);
      showClipboardNotice(`Auto-Attached ${spec.label} → ${target.label || target.type}`);
    },
    [nodes, wires, gridPitch, snapToGrid, evaluateCircuit, pushWaveformSnapshot, showClipboardNotice]
  );

  const handleAutoFixMeterFault = useCallback(
    (fault: { nodeId: number; type: string; title: string }) => {
      const targetMeter = nodes.find((n) => n.id === fault.nodeId);
      if (!targetMeter) return;

      if (fault.type === "VOLTMETER") {
        const wIn = wires.find((w) => w.to.node === targetMeter.id && w.to.port === 0);
        const wOut = wires.find((w) => w.to.node === targetMeter.id && w.to.port === 1);

        if (wIn && wOut && wIn.from.node !== wOut.from.node) {
          const bypassWire: CircuitWire = {
            id: idCounterRef.current++,
            from: { node: wIn.from.node, port: wIn.from.port, dir: wIn.from.dir },
            to: { node: wOut.from.node, port: wOut.from.port },
          };
          const gndNode = nodes.find((n) => n.type === "GND");
          const nextWires = wires.map((w) => {
            if (w.id === wOut.id && gndNode) {
              return { ...w, from: { node: gndNode.id, port: 0, dir: "out" as const } };
            }
            return w;
          });
          nextWires.push(bypassWire);
          const { updatedNodes, outs } = evaluateCircuit(nodes, nextWires);
          setNodes(updatedNodes);
          setWires(nextWires);
          pushWaveformSnapshot(updatedNodes, outs);
          showClipboardNotice("Auto-Corrected: Voltmeter rewired in PARALLEL. Load current restored.");
          return;
        }
      } else if (fault.type === "AMMETER") {
        const wOut = wires.find((w) => w.from.node === targetMeter.id && w.from.port === 0);
        if (wOut) {
          const loadId = idCounterRef.current++;
          const loadRes: CircuitNode = {
            id: loadId,
            type: "RES",
            label: "Load Resistor (1kΩ)",
            x: targetMeter.x + 140,
            y: targetMeter.y,
            analogParams: { resistanceOhms: 1000, userValue: 1, userUnit: "kΩ", formattedValue: "1.0 kΩ" },
          };

          const oldDest = wOut.to;
          const nextWires = wires.map((w) => {
            if (w.id === wOut.id) {
              return { ...w, to: { node: loadId, port: 0 } };
            }
            return w;
          });
          nextWires.push({
            id: idCounterRef.current++,
            from: { node: loadId, port: 0, dir: "out" },
            to: oldDest,
          });

          const nextNodes = [...nodes, loadRes];
          const { updatedNodes, outs } = evaluateCircuit(nextNodes, nextWires);
          setNodes(updatedNodes);
          setWires(nextWires);
          pushWaveformSnapshot(updatedNodes, outs);
          showClipboardNotice("Auto-Corrected: Inserted 1kΩ series load resistor to eliminate dead short.");
          return;
        }
      } else if (fault.type === "OHMMETER") {
        const w0 = wires.find((w) => w.to.node === targetMeter.id && w.to.port === 0);
        const w1 = wires.find((w) => w.to.node === targetMeter.id && w.to.port === 1);
        const src0Id = w0?.from.node;
        const src1Id = w1?.from.node;

        const nextWires = wires.filter((w) => {
          const fromNode = nodes.find((n) => n.id === w.from.node);
          const isPowerSource = fromNode && (fromNode.type.includes("VCC") || fromNode.type === "AC_SINE" || fromNode.type === "BATTERY");
          if (isPowerSource && (w.to.node === src0Id || w.to.node === src1Id)) {
            return false;
          }
          return true;
        });

        const { updatedNodes, outs } = evaluateCircuit(nodes, nextWires);
        setNodes(updatedNodes);
        setWires(nextWires);
        pushWaveformSnapshot(updatedNodes, outs);
        showClipboardNotice("Auto-Corrected: Disconnected active power sources. Circuit de-energized for resistance measurement.");
        return;
      } else if (fault.type === "POWER_METER") {
        const wV0 = wires.find((w) => w.to.node === targetMeter.id && w.to.port === 0);
        const wV1 = wires.find((w) => w.to.node === targetMeter.id && w.to.port === 1);
        const wIIn = wires.find((w) => w.to.node === targetMeter.id && w.to.port === 2);
        const wIOut = wires.find((w) => w.from.node === targetMeter.id && w.from.port === 0);

        let nextWires = [...wires];
        const gndNode = nodes.find((n) => n.type === "GND");
        const vccNode = nodes.find((n) => n.type.includes("VCC") || n.type === "BATTERY");

        if (!wV0 && vccNode) {
          nextWires.push({
            id: idCounterRef.current++,
            from: { node: vccNode.id, port: 0, dir: "out" },
            to: { node: targetMeter.id, port: 0 },
          });
        }
        if (!wV1 && gndNode) {
          nextWires.push({
            id: idCounterRef.current++,
            from: { node: gndNode.id, port: 0, dir: "out" },
            to: { node: targetMeter.id, port: 1 },
          });
        }
        if (!wIIn && vccNode) {
          nextWires.push({
            id: idCounterRef.current++,
            from: { node: vccNode.id, port: 0, dir: "out" },
            to: { node: targetMeter.id, port: 2 },
          });
        }
        if (!wIOut) {
          const loadRes = nodes.find((n) => n.type === "RES" && n.id !== targetMeter.id);
          if (loadRes) {
            nextWires.push({
              id: idCounterRef.current++,
              from: { node: targetMeter.id, port: 0, dir: "out" },
              to: { node: loadRes.id, port: 0 },
            });
          }
        }

        const { updatedNodes, outs } = evaluateCircuit(nodes, nextWires);
        setNodes(updatedNodes);
        setWires(nextWires);
        pushWaveformSnapshot(updatedNodes, outs);
        showClipboardNotice("Auto-Corrected: Wired Wattmeter 4-terminal dual-coil correctly.");
        return;
      }

      showClipboardNotice("PME Guide: Review standard wiring rules in the guidance manual.");
    },
    [nodes, wires, evaluateCircuit, pushWaveformSnapshot, showClipboardNotice]
  );

  const handleAutoFixAllMeterFaults = useCallback(() => {
    if (firstFaultInfo) {
      handleAutoFixMeterFault(firstFaultInfo);
    }
  }, [firstFaultInfo, handleAutoFixMeterFault]);

  return (
    <div
      className={
        isFullStudio
          ? "fixed inset-0 z-[115] w-screen h-screen flex flex-col bg-[#070A12] overflow-y-auto p-3 sm:p-4 space-y-4"
          : "space-y-6"
      }
    >
      {/* Dedicated Full-Window Canvas Studio Header Bar */}
      {isFullStudio && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0d1424] border border-cyan-500/40 rounded-xl px-4 py-2.5 shadow-lg">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
            <div className="space-y-0.5">
              <span className="text-xs font-mono font-bold text-cyan-300 uppercase tracking-wider block">
                IST Circuit Canvas Studio · Dedicated Full-Window View
              </span>
              <span className="text-[11px] text-slate-300 font-mono">
                Circuit: <strong className="text-white">{activePreset || "Custom Schematic"}</strong> · {nodes.length} Components · {wires.length} Wire Nets
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (!document.fullscreenElement) {
                  document.documentElement.requestFullscreen?.().catch(() => {});
                } else {
                  document.exitFullscreen?.().catch(() => {});
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold bg-[#16213a] hover:bg-[#1e2d4d] border border-[#26365c] text-slate-200 transition-colors cursor-pointer"
              title="Toggle Browser Fullscreen"
            >
              <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
              Browser Fullscreen
            </button>

            <button
              type="button"
              onClick={toggleFullStudio}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold bg-rose-950/60 hover:bg-rose-900/70 border border-rose-500/40 text-rose-200 transition-colors cursor-pointer"
              title="Exit Dedicated Full-Window Canvas Studio"
            >
              <X className="w-3.5 h-3.5" />
              Exit Studio
            </button>
          </div>
        </div>
      )}

      {/* Top Telemetry & Quick Controls Ribbon */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#111827] border border-slate-800 rounded-xl px-4 py-2.5 shadow-sm">
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          {/* Running Status Icon Indicator */}
          {isSimulationHalted ? (
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-300 font-semibold cursor-help"
              title={`Simulation Halted: ${compulsoryViolations.length} gate inputs require connections`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span>{compulsoryViolations.length} Input{compulsoryViolations.length > 1 ? "s" : ""}</span>
            </span>
          ) : isSimRunning ? (
            <span
              className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-lg border font-semibold cursor-help ${
                simSpeed < 1
                  ? "bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.2)]"
                  : "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
              }`}
              title={`Simulation Active · Speed: ${simSpeed}x · ${
                simSpeed < 1
                  ? "Slow-Motion Mode: Observing step-by-step logic transitions"
                  : "Real-time gate propagation"
              }`}
            >
              <span className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  simSpeed < 1 ? "bg-amber-400" : "bg-emerald-400"
                }`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${
                  simSpeed < 1 ? "bg-amber-400" : "bg-emerald-400"
                }`}></span>
              </span>
              <Activity className={`w-3.5 h-3.5 ${simSpeed < 1 ? "text-amber-400" : "text-emerald-400"}`} />
              <span className="text-[11px] font-mono font-bold">
                {simSpeed < 1 ? `${simSpeed}x Slow-Mo` : `${simSpeed}x`}
              </span>
            </span>
          ) : (
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#162338] border border-[#24344D] text-[#F1B65B] font-semibold cursor-help"
              title="Simulation Idle / Standby — Click Run to energize schematic"
            >
              <Pause className="w-3.5 h-3.5 text-[#F1B65B]" />
              <span className="text-[11px] font-mono">IDLE / STANDBY</span>
            </span>
          )}

          {/* Circuit Preset & Node/Net Counts as Minimal Icon Badges */}
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 max-w-[170px] truncate"
            title={`Circuit: ${activePreset}`}
          >
            <Layers className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="truncate">{activePreset}</span>
          </span>

          <span
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300"
            title={`${nodes.length} Components Placed`}
          >
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span>{nodes.length}</span>
          </span>

          <span
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300"
            title={`${wires.length} Wire Connections`}
          >
            <GitCommit className="w-3.5 h-3.5 text-purple-400" />
            <span>{wires.length}</span>
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {/* Verify & Start Simulation Icon Button */}
          <button
            type="button"
            onClick={handleCheckAndStartSimulation}
            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold border transition-all cursor-pointer whitespace-nowrap shadow-sm ${
              missingConnections.length > 0
                ? "bg-rose-950/70 border-rose-500/70 text-rose-200 hover:bg-rose-900/80 animate-pulse"
                : isSimRunning
                ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/30"
                : "bg-cyan-500/20 border-cyan-400 text-cyan-200 hover:bg-cyan-500/30"
            }`}
            title={
              missingConnections.length > 0
                ? `Missing ${missingConnections.length} pins - Click to inspect`
                : isSimRunning
                ? "Simulation Running · Click to Re-verify"
                : "Verify Topology & Run"
            }
          >
            {missingConnections.length > 0 ? (
              <>
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                <span>{missingConnections.length}</span>
              </>
            ) : isSimRunning ? (
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            ) : (
              <Play className="w-4 h-4 text-cyan-400" />
            )}
          </button>

          {/* PME Guide & Metrology Diagnostics Button */}
          <button
            type="button"
            onClick={() => {
              setPmeModalMeterType(firstFaultInfo?.meterType || "DIAGNOSTICS");
              setIsPmeModalOpen(true);
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer border shadow-sm ${
              meterFaultCount > 0
                ? "bg-red-950/70 border-red-500/70 text-red-200 hover:bg-red-900/80 animate-pulse shadow-red-950"
                : "bg-slate-900 hover:bg-cyan-950/60 border-slate-700 hover:border-cyan-500/50 text-slate-200 hover:text-white"
            }`}
            title="Precision Measurement Equipment (PME) Metrology Guide & Real-Time Fault Diagnostics"
          >
            <Compass className={`w-3.5 h-3.5 ${meterFaultCount > 0 ? "text-red-400" : "text-cyan-400"}`} />
            <span>PME Guide</span>
            {meterFaultCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-red-600 text-white font-bold animate-pulse">
                {meterFaultCount} {meterFaultCount === 1 ? "Fault" : "Faults"}
              </span>
            )}
          </button>

          {/* Snap-to-Grid, Precision Pitch, Magnetic Guides & Multi-Align Toolbar */}
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1 text-xs font-mono">
            {/* Snap Toggle */}
            <button
              type="button"
              onClick={() => {
                const nextState = !snapToGrid;
                setSnapToGrid(nextState);
                if (nextState) {
                  setNodes((prev) => snapAllNodesToGrid(prev, gridPitch));
                }
                showClipboardNotice(`Snap-to-Grid: ${nextState ? "ON" : "OFF"} (${gridPitch}px)`);
              }}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-md font-bold transition-all cursor-pointer ${
                snapToGrid
                  ? "bg-cyan-500/25 text-cyan-200 border border-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.3)]"
                  : "bg-slate-800 text-slate-400 hover:text-white border border-slate-700"
              }`}
              title={`Snap-to-Grid: ${snapToGrid ? "ON" : "OFF"} [G] (Click to Toggle)`}
            >
              <Magnet className={`w-3.5 h-3.5 ${snapToGrid ? "text-cyan-400" : "text-slate-500"}`} />
              <span className="text-[10.5px]">Snap</span>
            </button>

            {/* Pitch values: 10px, 20px, 25px, 40px */}
            <div className="flex items-center bg-slate-950/80 rounded px-1 py-0.5 border border-slate-800/80 gap-0.5">
              {([10, 20, 25, 40] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    setGridPitch(p as GridPitch);
                    setSnapToGrid(true);
                    setNodes((prev) => snapAllNodesToGrid(prev, p as GridPitch));
                    showClipboardNotice(`Grid Snap Pitch set to ${p}px`);
                  }}
                  className={`px-1.5 py-0.5 rounded text-[10.5px] cursor-pointer transition-colors ${
                    gridPitch === p && snapToGrid
                      ? "bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40"
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                  title={`Set Grid Snap Pitch to ${p}px`}
                >
                  {p}px
                </button>
              ))}
            </div>

            {/* Smart Pin & Column Magnetic Laser Guides Toggle */}
            <button
              type="button"
              onClick={() => {
                setMagneticGuidesEnabled((prev) => {
                  const next = !prev;
                  showClipboardNotice(`Magnetic Pin Guides: ${next ? "ON" : "OFF"}`);
                  return next;
                });
              }}
              className={`inline-flex items-center gap-1 px-1.5 py-1 rounded-md text-[10.5px] font-bold border transition-all cursor-pointer ${
                magneticGuidesEnabled
                  ? "bg-emerald-500/20 text-emerald-200 border-emerald-500/50 shadow-sm"
                  : "bg-slate-800 text-slate-400 hover:text-slate-200 border-slate-700"
              }`}
              title={`Magnetic Laser Guides: ${magneticGuidesEnabled ? "ON" : "OFF"} [M] (Snaps gate pins into straight horizontal alignment & column guides)`}
            >
              <Sparkles className={`w-3.5 h-3.5 ${magneticGuidesEnabled ? "text-emerald-400" : "text-slate-500"}`} />
              <span className="hidden sm:inline">Guides</span>
            </button>

            {/* Visual Surface Mode: Breadboard / CAD / Dots */}
            <div className="flex items-center bg-slate-950/80 rounded px-1 py-0.5 border border-slate-800/80 gap-0.5">
              <button
                type="button"
                onClick={() => setGridVisualMode("breadboard")}
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10.5px] cursor-pointer transition-colors ${
                  gridVisualMode === "breadboard"
                    ? "bg-cyan-500/25 text-cyan-200 font-bold border border-cyan-500/40"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                title="Solderless Breadboard - Lab Dark (Power Rails, Pin Sockets, Tie Strips)"
              >
                <Layers className="w-3 h-3 text-cyan-400" />
                <span>BB</span>
              </button>
              <button
                type="button"
                onClick={() => setGridVisualMode("cad")}
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10.5px] cursor-pointer transition-colors ${
                  gridVisualMode === "cad"
                    ? "bg-cyan-500/25 text-cyan-200 font-bold border border-cyan-500/40"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                title="CAD Engineering Grid Lines"
              >
                <Grid className="w-3 h-3 text-cyan-400/80" />
                <span>CAD</span>
              </button>
              <button
                type="button"
                onClick={() => setGridVisualMode("dots")}
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10.5px] cursor-pointer transition-colors ${
                  gridVisualMode === "dots"
                    ? "bg-cyan-500/25 text-cyan-200 font-bold border border-cyan-500/40"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                title="Minimalist Dot Matrix"
              >
                <Crosshair className="w-3 h-3 text-emerald-400/80" />
                <span>Dots</span>
              </button>
            </div>

            {/* Canvas Color & High-Visibility Contrast Theme Switcher */}
            <div className="relative" ref={canvasColorMenuRef}>
              <div className="flex items-center bg-slate-950/80 rounded px-1 py-0.5 border border-slate-800/80 gap-1">
                {/* 1-Click Day / Night Toggle */}
                <button
                  type="button"
                  onClick={handleToggleDayNight}
                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10.5px] font-bold transition-all cursor-pointer ${
                    activeCanvasTheme.isLight
                      ? "bg-amber-400/25 text-amber-200 border border-amber-400/50 shadow-xs"
                      : "bg-slate-800/90 text-cyan-300 hover:text-white"
                  }`}
                  title={`1-Click Day/Night Toggle: Switch to ${activeCanvasTheme.isLight ? "Slate Navy (Dark)" : "Multisim Paper (Light)"}`}
                >
                  {activeCanvasTheme.isLight ? (
                    <>
                      <Sun className="w-3 h-3 text-amber-400" />
                      <span className="hidden xl:inline">Light</span>
                    </>
                  ) : (
                    <>
                      <Moon className="w-3 h-3 text-cyan-300" />
                      <span className="hidden xl:inline">Dark</span>
                    </>
                  )}
                </button>

                {/* Theme Dropdown Trigger */}
                <button
                  type="button"
                  onClick={() => setIsCanvasColorMenuOpen((v) => !v)}
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10.5px] text-slate-300 hover:text-white hover:bg-slate-850 cursor-pointer transition-colors"
                  title="Choose Canvas Background Color (Paper Light, Slate Navy, Blueprint, Warm Cream, PCB Green)"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full border border-white/40 shadow-xs shrink-0"
                    style={{ backgroundColor: activeCanvasTheme.bg }}
                  />
                  <Palette className="w-3 h-3 text-cyan-400" />
                  <span className="hidden lg:inline">{activeCanvasTheme.label}</span>
                  <ChevronDown className={`w-2.5 h-2.5 text-slate-400 transition-transform ${isCanvasColorMenuOpen ? "rotate-180" : ""}`} />
                </button>
              </div>

              {isCanvasColorMenuOpen && (
                <div className="absolute top-full right-0 mt-1.5 w-72 rounded-xl bg-[#0b1020]/95 backdrop-blur-xl border border-cyan-500/40 shadow-2xl p-2 z-50 space-y-1 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-2 py-1.5 border-b border-slate-800/80 flex items-center justify-between">
                    <span className="text-[11px] font-mono font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Palette className="w-3.5 h-3.5 text-cyan-400" />
                      Canvas Color & Contrast
                    </span>
                    <span className="text-[9.5px] font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-700/50">
                      7 Themes
                    </span>
                  </div>

                  <div className="max-h-72 overflow-y-auto space-y-1 pt-1 pr-0.5">
                    {(Object.values(CANVAS_COLOR_THEMES) as CanvasThemeDef[]).map((thm) => {
                      const isSelected = thm.id === canvasThemeId;
                      return (
                        <button
                          key={thm.id}
                          type="button"
                          onClick={() => handleSelectCanvasTheme(thm.id)}
                          className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-all cursor-pointer border ${
                            isSelected
                              ? "bg-cyan-500/20 border-cyan-400/80 text-white shadow-sm shadow-cyan-500/20"
                              : "bg-slate-900/60 hover:bg-slate-850 border-slate-800 text-slate-300 hover:text-white"
                          }`}
                        >
                          <div
                            className="w-5 h-5 rounded-md border border-white/30 shrink-0 shadow-inner flex items-center justify-center"
                            style={{ backgroundColor: thm.bg }}
                          >
                            {isSelected && (
                              <Check className={`w-3 h-3 ${thm.isLight ? "text-slate-900" : "text-white"} font-bold`} />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-[11px] font-mono font-bold truncate">
                                {thm.name}
                              </span>
                              <span
                                className={`text-[8px] font-mono font-bold px-1.5 py-0.2 rounded border ${
                                  thm.isLight
                                    ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                                    : "bg-slate-800 text-slate-300 border-slate-700"
                                }`}
                              >
                                {thm.isLight ? "LIGHT" : "DARK"}
                              </span>
                            </div>
                            <p className="text-[9.5px] text-slate-400 leading-tight mt-0.5 line-clamp-1">
                              {thm.desc}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 px-2 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span>Click theme to apply</span>
                    <button
                      type="button"
                      onClick={() => handleSelectCanvasTheme("paper")}
                      className="text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
                    >
                      Multisim Light
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Multi-Node Alignment Actions */}
            <div className="flex items-center bg-slate-950/80 rounded px-1 py-0.5 border border-slate-800/80 gap-0.5">
              <button
                type="button"
                onClick={() => {
                  if (nodes.length === 0) return;
                  const targetIds = selectedNodeIds.length >= 2
                    ? selectedNodeIds
                    : (selected?.type === "node" ? [selected.id] : nodes.map((n) => n.id));
                  const updated = alignNodesOnGrid(nodes, targetIds, "align-left", gridPitch);
                  const { updatedNodes, outs } = evaluateCircuit(updated, wires);
                  setNodes(updatedNodes);
                  pushWaveformSnapshot(updatedNodes, outs);
                  showClipboardNotice(`Aligned components into vertical column`);
                }}
                className="p-1 rounded text-slate-400 hover:text-cyan-300 hover:bg-slate-800 transition-colors cursor-pointer"
                title="Align Column: Aligns selected gates vertically to the same X position"
              >
                <AlignStartVertical className="w-3.5 h-3.5 text-cyan-400" />
              </button>
              <button
                type="button"
                onClick={() => {
                  if (nodes.length === 0) return;
                  const targetIds = selectedNodeIds.length >= 2
                    ? selectedNodeIds
                    : (selected?.type === "node" ? [selected.id] : nodes.map((n) => n.id));
                  const updated = alignNodesOnGrid(nodes, targetIds, "align-top", gridPitch);
                  const { updatedNodes, outs } = evaluateCircuit(updated, wires);
                  setNodes(updatedNodes);
                  pushWaveformSnapshot(updatedNodes, outs);
                  showClipboardNotice(`Aligned components into horizontal row`);
                }}
                className="p-1 rounded text-slate-400 hover:text-cyan-300 hover:bg-slate-800 transition-colors cursor-pointer"
                title="Align Row: Aligns selected gates horizontally to the same Y position"
              >
                <AlignStartHorizontal className="w-3.5 h-3.5 text-cyan-400" />
              </button>
              <button
                type="button"
                onClick={() => {
                  if (nodes.length < 2) return;
                  const targetIds = selectedNodeIds.length >= 2
                    ? selectedNodeIds
                    : nodes.map((n) => n.id);
                  const updated = alignNodesOnGrid(nodes, targetIds, "distribute-y", gridPitch);
                  const { updatedNodes, outs } = evaluateCircuit(updated, wires);
                  setNodes(updatedNodes);
                  pushWaveformSnapshot(updatedNodes, outs);
                  showClipboardNotice(`Distributed components evenly on Y axis`);
                }}
                className="p-1 rounded text-slate-400 hover:text-cyan-300 hover:bg-slate-800 transition-colors cursor-pointer"
                title="Distribute Y: Evenly spaces selected gates vertically along the grid"
              >
                <AlignVerticalSpaceAround className="w-3.5 h-3.5 text-cyan-400" />
              </button>
            </div>

            {/* Clean Up & Auto-Tidy Topological Placement Button */}
            <button
              type="button"
              onClick={() => {
                if (nodes.length === 0) return;
                const updated = autoArrangeCircuitOnGrid(nodes, wires, undefined, gridPitch);
                const { updatedNodes, outs } = evaluateCircuit(updated, wires);
                setNodes(updatedNodes);
                pushWaveformSnapshot(updatedNodes, outs);
                setCircuitVerifyNotice({
                  type: "success",
                  text: `Clean Up complete! Snapped and aligned ${nodes.length} components into optimal schematic columns.`,
                });
                setTimeout(() => setCircuitVerifyNotice(null), 3500);
              }}
              className="inline-flex items-center justify-center p-2 rounded-md font-bold text-xs bg-gradient-to-r from-cyan-500/20 to-purple-500/20 hover:from-cyan-500/30 hover:to-purple-500/30 text-cyan-200 hover:text-white border border-cyan-400/50 shadow-sm transition-all cursor-pointer"
              title="Clean Up Schematic: Auto-align components into tidy topological stages on grid"
            >
              <Wand2 className="w-3.5 h-3.5 text-cyan-400" />
            </button>
          </div>

          {/* General Schematic: New Blank Circuit (Draw Mode) */}
          <button
            type="button"
            onClick={() => {
              prevOutsRef.current = {};
              setNodes([]);
              setWires([]);
              setSelected(null);
              setPendingWire(null);
              setWaveformHistory([]);
              setActivePreset("Custom User Schematic (Draw Mode)");
              onClearExternalCircuit?.();
              setAttachedProbes([]);
            }}
            className="inline-flex items-center justify-center p-2 rounded-lg text-xs font-mono font-bold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-400/40 transition-all cursor-pointer shadow-sm"
            title="New Blank Circuit (Draw Custom Schematic from Scratch)"
          >
            <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
          </button>

          {/* New Project Template Library Button */}
          <button
            type="button"
            onClick={() => setIsTemplateLibraryOpen(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold bg-[#14233c] hover:bg-[#1a2f52] border border-cyan-500/40 text-cyan-200 transition-colors cursor-pointer whitespace-nowrap shrink-0 shadow-sm"
            title="New Project Template Library: Initialize 555 Astable, 74LS Binary Counter, BJT Amplifier & more"
          >
            <FolderKanban className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden lg:inline">New Template</span>
          </button>

          {/* Live Pairing 2-Student Collaboration Button */}
          <button
            type="button"
            onClick={() => setIsLivePairingModalOpen(true)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              pairingSession
                ? pairingSession.status === "paired"
                  ? "bg-emerald-950/70 hover:bg-emerald-900/70 border-[#48C99A]/70 text-[#48C99A]"
                  : "bg-cyan-950/70 hover:bg-cyan-900/70 border-[#35BDF2]/70 text-[#35BDF2]"
                : "bg-[#111B2B] hover:bg-[#162338] border-[#24344D] text-cyan-200"
            }`}
            title="Live Pairing: Collaborate in real time with one authenticated classmate on this schematic"
          >
            <Users className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden lg:inline">
              {pairingSession
                ? `Live · ${pairingSession.code}`
                : "Live Pairing"}
            </span>
          </button>

          {/* Larger Canvas View Toggle */}
          <button
            type="button"
            onClick={() => setIsMaxCanvas((v) => !v)}
            className={`inline-flex items-center justify-center p-2 rounded-lg text-xs font-mono font-bold border transition-colors cursor-pointer ${
              isMaxCanvas
                ? "bg-cyan-500/25 border-cyan-400 text-cyan-200"
                : "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700"
            }`}
            title={
              isMaxCanvas
                ? "Exit Expanded Canvas Mode"
                : "Expand Canvas to Larger View"
            }
          >
            {isMaxCanvas ? (
              <Minimize2 className="w-3.5 h-3.5 text-cyan-400" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
            )}
          </button>

          {/* Dedicated Full-Window Canvas Studio Toggle */}
          <button
            type="button"
            onClick={toggleFullStudio}
            className={`inline-flex items-center justify-center p-2 rounded-lg text-xs font-mono font-bold border transition-colors cursor-pointer ${
              isFullStudio
                ? "bg-gradient-to-r from-cyan-500/30 to-emerald-500/30 border-cyan-400 text-cyan-200 shadow-md shadow-cyan-950/50"
                : "bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border-cyan-400/50"
            }`}
            title={
              isFullStudio
                ? "Exit Dedicated Full-Window Canvas"
                : "Open Dedicated Full-Window Canvas Studio"
            }
          >
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
          </button>

          {/* Component Tray Hide/Show Toggle */}
          <button
            type="button"
            onClick={() => {
              setTrayMode((prev) => (prev === "hidden" ? "docked" : "hidden"));
            }}
            className={`inline-flex items-center justify-center p-2 rounded-lg text-xs font-mono font-bold border transition-all cursor-pointer shadow-sm ${
              trayMode === "hidden"
                ? "bg-amber-500/25 hover:bg-amber-500/35 text-amber-200 border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.3)] animate-pulse"
                : "bg-slate-800 hover:bg-slate-750 text-slate-200 border-slate-700"
            }`}
            title={
              trayMode === "hidden"
                ? "Show Component Library Tray"
                : "Hide Component Tray (Enlarge Canvas)"
            }
          >
            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
          </button>

          {/* Mode Switcher: Real Component Mode (3D Package) vs Schematic Mode (IEEE/IEC) */}
          <div className="flex items-center bg-[#0d1628] border border-cyan-500/40 rounded-lg p-0.5 shadow-sm">
            <button
              type="button"
              onClick={() => setComponentViewMode("REALISTIC")}
              className={`px-2.5 py-1 rounded text-[11px] font-mono font-bold transition-all cursor-pointer ${
                componentViewMode === "REALISTIC"
                  ? "bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
              title="Render components as realistic manufactured physical packages (authentic color bands, pin count, IC packages)"
            >
              Real 3D
            </button>
            <button
              type="button"
              onClick={() => setComponentViewMode("SCHEMATIC")}
              className={`px-2.5 py-1 rounded text-[11px] font-mono font-bold transition-all cursor-pointer ${
                componentViewMode === "SCHEMATIC"
                  ? "bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
              title="Render components as standard IEEE/IEC schematic circuit symbols"
            >
              Schematic
            </button>
          </div>

          {/* Interactive 3D WebGL Bench Twin Toggle */}
          <div className="flex items-center bg-[#0d1628] border border-emerald-500/40 rounded-lg p-0.5 shadow-sm">
            {(
              [
                { id: "OFF", label: "2D Canvas" },
                { id: "SPLIT", label: "2D + 3D Twin" },
                { id: "ONLY_3D", label: "3D Bench" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  setLab3DMode(opt.id);
                  if (opt.id !== "OFF") {
                    setIsCinematic3DView(false);
                  }
                }}
                className={`px-2 py-1 rounded text-[11px] font-mono font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  !isCinematic3DView && lab3DMode === opt.id
                    ? "bg-emerald-400 text-slate-950"
                    : "text-slate-300 hover:text-white"
                }`}
                title="Synchronize WebGL 3D PCB hardware view with live digital logic & MNA SPICE simulation"
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* 3D Cinematic View Toggle (CSS 3D Transform Workstation Scene) */}
          <button
            type="button"
            onClick={() => {
              setIsCinematic3DView((prev) => {
                const next = !prev;
                if (next) setLab3DMode("OFF");
                return next;
              });
            }}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold border transition-colors cursor-pointer whitespace-nowrap shrink-0 shadow-sm ${
              isCinematic3DView
                ? "bg-cyan-400 text-slate-950 border-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.4)]"
                : "bg-[#0d1628] hover:bg-[#16233b] border-cyan-500/40 text-cyan-200"
            }`}
            title="Toggle 3D Cinematic View: Replace 2D schematic with CSS 3D breadboard & bench equipment workstation"
          >
            <Box className="w-3.5 h-3.5" />
            <span>3D Cinematic View</span>
          </button>

          {/* Real-Time Signal Trace Visualizer Toggle Button */}
          <button
            type="button"
            onClick={() => {
              if (isSignalTraceEnabled && signalTraceNodeId !== null) {
                // If active, toggle HUD minimization
                setIsSignalTraceHudMinimized((v) => !v);
              } else {
                setIsSignalTraceEnabled(true);
                const targetId = selected?.type === "node" ? selected.id : nodes[0]?.id ?? null;
                setSignalTraceNodeId(targetId);
              }
            }}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold border transition-all cursor-pointer shadow-sm ${
              isSignalTraceEnabled && signalTraceNodeId !== null
                ? "bg-gradient-to-r from-cyan-500/30 to-blue-500/30 text-cyan-200 border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.4)]"
                : "bg-[#14233c] hover:bg-[#1a2f52] border-slate-700 text-slate-300"
            }`}
            title="Real-Time Signal Trace Visualizer: Click any node to trace current flow path with animated particles"
          >
            <Zap
              className={`w-3.5 h-3.5 ${
                isSignalTraceEnabled && signalTraceNodeId !== null
                  ? "text-cyan-400 animate-pulse"
                  : "text-slate-400"
              }`}
            />
            <span className="hidden sm:inline">
              Signal Trace{isSignalTraceEnabled && signalTraceNodeId !== null ? ": On" : ""}
            </span>
          </button>

          {/* Inspect 3D Component Model & Official Datasheet Button */}
          <button
            type="button"
            onClick={() => {
              const selectedNodeType = selected?.type === "node"
                ? nodes.find((n) => n.id === selected.id)?.type || "RES_CARBON"
                : "RES_CARBON";
              setInspectingComponentId(selectedNodeType);
            }}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-purple-500/20 hover:from-cyan-500/30 hover:to-purple-500/30 border border-cyan-400/50 text-cyan-200 transition-colors cursor-pointer shadow-sm"
            title="Inspect 3D Component Model, Pinout & Official Datasheets"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden xl:inline">3D Component &amp; Datasheets</span>
          </button>

          {/* Circuit Presets & 75 Labs Library Modal Toggle */}
          <button
            type="button"
            onClick={() => setIsCircuitLibraryOpen(true)}
            className="inline-flex items-center justify-center p-2 rounded-lg text-xs font-mono font-bold bg-[#16213a] hover:bg-[#1e2d4e] border border-cyan-500/40 text-cyan-300 transition-colors cursor-pointer shadow-sm"
            title="Open Circuit Presets & 75 Engineering Labs Catalog"
          >
            <Layers className="w-4 h-4 text-cyan-400" />
          </button>

          {/* Dedicated Real-Time 500ms Timing Diagram Overlay Toggle */}
          <button
            type="button"
            onClick={() => {
              setShowTimingDiagramOverlay((prev) => {
                const next = !prev;
                if (next) {
                  if (selectedNodeIdsForTiming.length === 0 && nodes.length > 0) {
                    setSelectedNodeIdsForTiming(nodes.map((n) => n.id));
                  }
                  setIsTimingCapturePaused(false);
                  record500msTransitionSnapshot(nodes, liveVals, true);
                }
                return next;
              });
            }}
            className={`inline-flex items-center gap-1 p-2 rounded-lg text-xs font-mono font-bold border transition-colors cursor-pointer shadow-sm ${
              showTimingDiagramOverlay
                ? "bg-cyan-500/25 border-cyan-400 text-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.35)]"
                : "bg-[#14233c] hover:bg-[#1a2f52] border-cyan-400/60 text-cyan-200"
            }`}
            title={`Toggle 500ms Timing Diagram Overlay (${selectedNodeIdsForTiming.length} Traces active)`}
          >
            <Activity className="w-4 h-4 text-cyan-400" />
            {selectedNodeIdsForTiming.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-cyan-950 border border-cyan-700 text-cyan-300 font-bold">
                {selectedNodeIdsForTiming.length}
              </span>
            )}
          </button>

          {/* Virtual Instruments Rack Drawer Toggle */}
          <button
            type="button"
            onClick={() => setIsInstrumentsDrawerOpen((v) => !v)}
            className={`inline-flex items-center gap-1 p-2 rounded-lg text-xs font-mono font-bold border transition-all cursor-pointer shadow-sm ${
              isInstrumentsDrawerOpen
                ? "bg-cyan-500/25 text-cyan-200 border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.3)]"
                : "bg-[#16213a] hover:bg-[#1e2d4e] border-slate-700 text-slate-300"
            }`}
            title={`Virtual Instruments Rack (Oscilloscope, Logic Analyzer, DMM, Signal Probes - ${attachedProbes.length} active)`}
          >
            <Gauge className="w-4 h-4 text-cyan-400" />
            {attachedProbes.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-cyan-950 border border-cyan-700 text-cyan-300 font-bold">
                {attachedProbes.length}
              </span>
            )}
          </button>

          {/* Smart-Sync & Auto-Sync Instruments Toggle */}
          <button
            type="button"
            onClick={() => {
              const next = !autoSyncInstruments;
              setAutoSyncInstruments(next);
              if (next && nodes.length > 0 && wires.length > 0) {
                const targets = computeCriticalInstrumentTargets(
                  nodes,
                  wires,
                  analyzerHistoryRef.current
                );
                setAttachedProbes(targets.probes);
                setSelectedWireIdsForAnalyzer(targets.analyzerWireIds);
                setSelectedNodeIdsForTiming(targets.timingNodeIds);
                setCircuitVerifyNotice({
                  type: "success",
                  text: `Smart-Sync ON: bound ${targets.smartSyncStats.clockCount} clock & ${targets.smartSyncStats.highFreqCount} high-frequency line(s) to Logic Analyzer CH1–CH4 and ${targets.probes.length} Scope probe(s).`,
                });
                setTimeout(() => setCircuitVerifyNotice(null), 3500);
              }
            }}
            aria-pressed={autoSyncInstruments}
            className={`inline-flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-mono font-bold border transition-all cursor-pointer shadow-sm ${
              autoSyncInstruments
                ? "bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border-cyan-400/70 shadow-[0_0_12px_rgba(6,182,212,0.22)]"
                : "bg-[#16213a] hover:bg-[#1e2d4e] text-slate-400 border-slate-700"
            }`}
            title="Smart-Sync & Auto-Sync Instruments: Automatically detects clock & high-frequency data lines and binds them to Logic Analyzer CH1–CH4 and Oscilloscope probes on circuit initialization"
          >
            <Link2 className={`w-3.5 h-3.5 ${autoSyncInstruments ? "text-cyan-300" : "text-slate-500"}`} />
            <span className="hidden lg:inline text-[11px] tracking-tight">
              Smart-Sync
            </span>
            <span
              className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold ${
                autoSyncInstruments
                  ? "bg-cyan-950/80 text-cyan-300 border border-cyan-500/40"
                  : "bg-slate-900 text-slate-500 border border-slate-700"
              }`}
            >
              {autoSyncInstruments ? "ON" : "OFF"}
            </span>
          </button>

          {/* Theory, Formulas & Equations Library Modal Toggle */}
          <button
            type="button"
            onClick={() => setIsTheoryLibraryOpen(true)}
            className="inline-flex items-center justify-center p-2 rounded-lg text-xs font-mono font-bold bg-[#16213a] hover:bg-[#1e2d4e] border border-purple-500/40 text-purple-300 transition-colors cursor-pointer shadow-sm"
            title="Theory, Formulas & Boolean Derivation Reference"
          >
            <BookOpen className="w-4 h-4 text-purple-400" />
          </button>

          {/* Explicit Run / Stop Simulation Toggle Button */}
          <button
            type="button"
            onClick={() => {
              const nextRunning = !isSimRunning;
              setIsSimRunning(nextRunning);
              if (!nextRunning) {
                setAutoClock(false);
              }
              const issueCount = compulsoryViolations.length + openCircuitIssues.length;
              onLogSimulationActivity?.(
                nextRunning
                  ? issueCount > 0
                    ? `Started Simulation (${issueCount} error${issueCount > 1 ? "s" : ""})`
                    : "Started Simulation"
                  : "Set Simulation Standby",
                activePreset || "Circuit Designer",
                nextRunning ? (issueCount > 0 ? "WARN" : "PASS") : "INFO"
              );
              setSimBannerPhase(nextRunning ? "STARTED" : "STOPPED");
              if (simBannerTimerRef.current) {
                window.clearTimeout(simBannerTimerRef.current);
              }
              simBannerTimerRef.current = window.setTimeout(() => {
                setSimBannerPhase(null);
              }, 2400);
            }}
            className={`inline-flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-mono font-bold border transition-all cursor-pointer shadow-sm ${
              !isSimRunning
                ? "bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-400/60 shadow-[0_0_12px_rgba(245,158,11,0.25)]"
                : "bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border-emerald-400/60 shadow-[0_0_12px_rgba(16,185,129,0.25)]"
            }`}
            title={
              isSimRunning
                ? "Simulation Running · Click to Stop & Return Actuators to Rest"
                : "Simulation Stopped · Click to Run Circuit"
            }
          >
            {isSimRunning ? (
              <>
                <Pause className="w-4 h-4 text-emerald-400" />
                <span className="hidden md:inline text-[11px] tracking-wider">RUNNING</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 text-amber-400 fill-amber-400" />
                <span className="hidden md:inline text-[11px] tracking-wider">RUN</span>
              </>
            )}
          </button>

          {/* Reset Simulation State Button */}
          <button
            type="button"
            onClick={() => {
              prevOutsRef.current = {};
              const { updatedNodes } = evaluateCircuit(nodes, wires);
              setNodes(updatedNodes);
              setCircuitVerifyNotice({
                type: "success",
                text: "Simulation state reset and re-evaluated from primary circuit inputs.",
              });
              setTimeout(() => setCircuitVerifyNotice(null), 3000);
            }}
            className="inline-flex items-center justify-center p-2 rounded-lg text-xs font-mono font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer"
            title="Reset Flip-Flops, Registers & Simulation State"
          >
            <RotateCcw className="w-4 h-4 text-cyan-400" />
          </button>

          {/* Single Step Pulse */}
          <button
            type="button"
            onClick={pulseClockInputs}
            className={`inline-flex items-center justify-center p-2 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
              isSimulationHalted
                ? "bg-slate-850 text-slate-400 border-slate-800 hover:border-amber-500/40"
                : "bg-slate-800 hover:bg-slate-700 text-slate-100 border-slate-700"
            }`}
            title="Single Step Clock Pulse Forward by 1 Period"
          >
            <StepForward className="w-4 h-4 text-cyan-400" />
          </button>

          {/* Auto Clock Oscillator */}
          <button
            type="button"
            onClick={() => {
              if (!autoClock && !isSimRunning) {
                setIsSimRunning(true);
              }
              setAutoClock((v) => !v);
            }}
            className={`inline-flex items-center justify-center p-2 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
              isSimulationHalted
                ? "bg-amber-950/30 border-amber-500/30 text-amber-300"
                : autoClock && isSimRunning
                ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-sm shadow-emerald-500/25"
                : "bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200"
            }`}
            title={autoClock ? "Automatic Clock Oscillator: ON (Click to Stop)" : "Automatic Clock Oscillator: OFF (Click to Start)"}
          >
            <Clock className={`w-4 h-4 ${autoClock && isSimRunning && !prefersReducedMotion ? "text-emerald-400 motor-rotor-spin" : "text-cyan-400"}`} />
          </button>

          {/* Simulation Clock / Pulse Frequency (Hz) Selector (syncs wire dash flow speed) */}
          <div
            className="flex items-center gap-1 bg-[#0e1628] border border-[#26365c] rounded-xl px-2 py-1 text-xs font-mono"
            title="Clock & Signal Pulse Frequency (Hz) — directly drives clock tick rate and animated wire signal-flow dash velocity"
          >
            <span className="text-[10px] font-bold text-slate-400 hidden xl:inline">Freq:</span>
            <select
              value={clockHz}
              onChange={(e) => setClockHz(parseFloat(e.target.value) || 2)}
              aria-label="Simulation Clock Frequency Hz"
              className="bg-[#080d1a] border border-slate-700/80 hover:border-cyan-400/80 text-emerald-300 text-[11px] font-bold rounded-lg px-1.5 py-0.5 cursor-pointer focus:outline-none tabular-nums"
            >
              <option value={0.5}>0.5 Hz</option>
              <option value={1}>1 Hz</option>
              <option value={2}>2 Hz</option>
              <option value={5}>5 Hz</option>
              <option value={10}>10 Hz</option>
              <option value={20}>20 Hz</option>
            </select>
          </div>

          {/* SIMULATION SPEED CONTROLLER (Slider / Dropdown / Pills: 0.1x, 0.5x, 1x, 2x, 5x) */}
          <div
            className="flex items-center gap-1.5 bg-[#0e1628] border border-[#26365c] rounded-xl px-2.5 py-1 text-xs font-mono shadow-inner"
            title="Simulation Speed Controller: Slow down to 0.1x or 0.5x to observe gate propagation and sequential state transitions step-by-step"
          >
            <div className="flex items-center gap-1 shrink-0">
              <Gauge className={`w-3.5 h-3.5 ${simSpeed < 1 ? "text-amber-400" : "text-cyan-400"}`} />
              <span className="hidden lg:inline text-[11px] font-bold text-slate-300">
                Speed:
              </span>
            </div>

            {/* Dropdown Selector (Universal responsive select) */}
            <select
              value={simSpeed}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setSimSpeed(val);
                if (!autoClock && isSimRunning) {
                  // If clock was off, prompt or step
                }
              }}
              className="bg-[#080d1a] border border-slate-700/80 hover:border-cyan-400/80 text-cyan-300 text-[11px] font-bold rounded-lg px-2 py-1 cursor-pointer focus:outline-none focus:ring-1 focus:ring-cyan-400"
              title="Select Simulation Speed (0.1x, 0.5x, 1x, 2x, 5x)"
            >
              <option value={0.1}>0.1x (Slow Motion · Step Tracing)</option>
              <option value={0.5}>0.5x (Half Speed)</option>
              <option value={1}>1.0x (Real-Time Standard)</option>
              <option value={2}>2.0x (2x Speed)</option>
              <option value={5}>5.0x (5x Turbo)</option>
            </select>

            {/* Speed Range Slider (0.1x -> 0.5x -> 1x -> 2x -> 5x) */}
            <div className="hidden sm:flex items-center gap-1.5 pl-1.5 border-l border-slate-800">
              <input
                type="range"
                min={0}
                max={4}
                step={1}
                value={[0.1, 0.5, 1, 2, 5].indexOf(simSpeed) >= 0 ? [0.1, 0.5, 1, 2, 5].indexOf(simSpeed) : 2}
                onChange={(e) => {
                  const speeds = [0.1, 0.5, 1, 2, 5];
                  const idx = parseInt(e.target.value, 10);
                  setSimSpeed(speeds[idx]);
                }}
                className={`w-16 h-1.5 accent-cyan-400 cursor-pointer ${
                  simSpeed < 1 ? "accent-amber-400" : "accent-cyan-400"
                }`}
                title={`Simulation Speed Slider: ${simSpeed}x (Move left for slow-motion logic inspection)`}
              />
            </div>

            {/* Quick Segmented Pill Buttons (0.1x, 0.5x, 1x, 2x, 5x) */}
            <div className="hidden xl:flex items-center gap-0.5 bg-[#080d1a] p-0.5 rounded-lg border border-slate-800 shrink-0">
              {([0.1, 0.5, 1, 2, 5] as const).map((spd) => {
                const isSelected = simSpeed === spd;
                return (
                  <button
                    key={spd}
                    type="button"
                    onClick={() => setSimSpeed(spd)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                      isSelected
                        ? spd <= 0.5
                          ? "bg-amber-400 text-slate-950 font-black shadow-[0_0_8px_rgba(245,158,11,0.4)]"
                          : spd === 1
                          ? "bg-cyan-400 text-slate-950 font-black shadow-[0_0_8px_rgba(6,182,212,0.4)]"
                          : "bg-emerald-400 text-slate-950 font-black shadow-[0_0_8px_rgba(16,185,129,0.4)]"
                        : "text-slate-400 hover:text-white hover:bg-slate-800"
                    }`}
                    title={
                      spd < 1
                        ? `Slow down to ${spd}x: Observe slow gate transitions and step-by-step state changes`
                        : spd === 1
                        ? `Standard 1x real-time simulation`
                        : `Fast-forward ${spd}x simulation speed`
                    }
                  >
                    {spd}x
                  </button>
                );
              })}
            </div>

            {/* Slow-Mo Status Tag */}
            {simSpeed < 1 && (
              <span className="hidden 2xl:inline-flex items-center gap-1 text-[10px] font-bold text-amber-300 bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 rounded">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                Slow-Mo
              </span>
            )}
          </div>

          {/* Board Lock: Keep Breadboard/Canvas Locked on Current Installation View or Unlock to Move Ahead/Forth */}
          <button
            type="button"
            onClick={() => {
              setIsBoardLocked((v) => {
                const next = !v;
                showClipboardNotice(
                  next
                    ? "Board Locked on current installation view (component drag & wire routing active)"
                    : "Board Unlocked: Drag background or scroll to move ahead, back & forth"
                );
                return next;
              });
            }}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold border transition-colors cursor-pointer ${
              isBoardLocked
                ? "bg-amber-500/20 border-amber-400/70 text-amber-200"
                : "bg-emerald-500/20 border-emerald-400/70 text-emerald-200"
            }`}
            title={
              isBoardLocked
                ? "Board is locked on current view. Click to unlock and move ahead/back/forth."
                : "Board is unlocked. Pan or zoom ahead/back, then click to lock on current view."
            }
          >
            {isBoardLocked ? (
              <Lock className="w-3.5 h-3.5 text-amber-300" />
            ) : (
              <Unlock className="w-3.5 h-3.5 text-emerald-300" />
            )}
            <span>{isBoardLocked ? "Locked View" : "Unlocked · Move"}</span>
          </button>

          {/* Pin View: Lock Component Canvas & Block Accidental Page Scroll */}
          <button
            type="button"
            onClick={() => {
              setIsPinViewEnabled((v) => {
                const next = !v;
                showClipboardNotice(
                  next
                    ? "Pin View ON: Canvas locked on screen & page scroll prevented during pan/zoom"
                    : "Pin View OFF: Standard scrollable page layout"
                );
                return next;
              });
            }}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold border transition-colors cursor-pointer ${
              isPinViewEnabled
                ? "bg-cyan-500/25 border-cyan-400 text-cyan-200 shadow-[0_0_12px_rgba(34,211,238,0.3)]"
                : "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700"
            }`}
            title="Pin View: Lock the schematic canvas on screen and block accidental page scrolling while panning"
          >
            {isPinViewEnabled ? <Pin className="w-3.5 h-3.5 text-cyan-300" /> : <PinOff className="w-3.5 h-3.5 text-slate-400" />}
            <span>Pin View: {isPinViewEnabled ? "ON" : "OFF"}</span>
          </button>

          {/* Reset Zoom & Pan */}
          <button
            type="button"
            onClick={handleResetZoom}
            className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-mono font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
            title="Reset Zoom (85%) & Center Canvas Pan"
          >
            <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden xl:inline">Reset Zoom</span>
          </button>

          {/* Visual Diagnostic Tool: Short Circuit & Floating Node Inspector Button */}
          <button
            type="button"
            onClick={() => setShowOpenCircuitsOverlay((v) => !v)}
            className={`inline-flex items-center gap-1.5 p-2 rounded-lg text-xs font-mono font-bold border transition-all cursor-pointer ${
              showOpenCircuitsOverlay
                ? circuitDiagnosticReport.shortCircuitCount > 0
                  ? "bg-red-500/25 border-red-400 text-red-200 shadow-[0_0_14px_rgba(239,68,68,0.5)]"
                  : "bg-amber-500/25 border-amber-400 text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.4)]"
                : circuitDiagnosticReport.shortCircuitCount > 0
                ? "bg-red-950/60 hover:bg-red-900/70 border-red-500 text-red-200 shadow-[0_0_8px_rgba(239,68,68,0.35)] animate-pulse"
                : circuitDiagnosticReport.floatingNodeCount > 0
                ? "bg-amber-950/50 hover:bg-amber-900/60 border-amber-500/70 text-amber-200"
                : "bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300"
            }`}
            title="Visual Diagnostic Tool: Inspect Short Circuits (Glowing Red) & Floating Nodes (Glowing Amber)"
          >
            <AlertTriangle
              className={`w-4 h-4 ${
                circuitDiagnosticReport.shortCircuitCount > 0
                  ? "text-red-400 animate-bounce"
                  : circuitDiagnosticReport.floatingNodeCount > 0 || showOpenCircuitsOverlay
                  ? "text-amber-400"
                  : "text-slate-400"
              }`}
            />
            {circuitDiagnosticReport.shortCircuitCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-red-600 text-white font-bold shadow-sm">
                ⚡ {circuitDiagnosticReport.shortCircuitCount}
              </span>
            )}
            {circuitDiagnosticReport.floatingNodeCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-500 text-slate-950 font-bold shadow-sm">
                ? {circuitDiagnosticReport.floatingNodeCount}
              </span>
            )}
          </button>

          {/* Download Netlist (.CIR) Button */}
          <button
            type="button"
            onClick={() => {
              const cirText = serializeCircuitLabToSpiceNetlist(
                activePreset || "Circuit Designer Schematic",
                nodes,
                wires
              );
              const blob = new Blob([cirText], { type: "text/plain;charset=utf-8" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              const slug = (activePreset || "circuit_designer")
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "_")
                .replace(/^_|_$/g, "");
              a.href = url;
              a.download = `${slug || "circuit_designer"}.cir`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            }}
            disabled={nodes.length === 0}
            className="inline-flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-mono font-bold bg-emerald-500/20 hover:bg-emerald-500/30 disabled:opacity-40 text-emerald-200 border border-emerald-500/40 transition-colors cursor-pointer"
            title="Download standard SPICE compatible .CIR netlist for academic reporting"
          >
            <Download className="w-4 h-4 text-emerald-300" />
            <span className="hidden lg:inline">Download Netlist</span>
          </button>

          {/* BJT I-V Curve Tracer Button */}
          <button
            type="button"
            onClick={() => setIsBjtCurveTracerOpen(true)}
            className="inline-flex items-center justify-center p-2 rounded-lg text-xs font-mono font-bold bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-500/40 transition-colors cursor-pointer"
            title="BJT I-V Curve Tracer (Plot Ic vs Vce)"
          >
            <TrendingUp className="w-4 h-4 text-cyan-300" />
          </button>

          {/* Logic Analyzer Overlay Toggle Button */}
          <button
            type="button"
            onClick={() => setShowLogicAnalyzerOverlay((v) => !v)}
            className={`inline-flex items-center gap-1 p-2 rounded-lg text-xs font-mono font-bold border transition-colors cursor-pointer ${
              showLogicAnalyzerOverlay
                ? "bg-cyan-500/25 border-cyan-400 text-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.35)]"
                : "bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300"
            }`}
            title="Embedded Multi-Channel Digital Logic Analyzer"
          >
            <Layers className="w-4 h-4 text-cyan-400" />
            {selectedWireIdsForAnalyzer.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-cyan-950 border border-cyan-700 text-cyan-300 font-bold">
                {selectedWireIdsForAnalyzer.length}
              </span>
            )}
          </button>

          {/* 74-Series Quick Bar Toggle Button */}
          <button
            type="button"
            onClick={() => setShow74QuickBar((v) => !v)}
            className={`inline-flex items-center justify-center p-2 rounded-lg text-xs font-mono font-bold border transition-colors cursor-pointer ${
              show74QuickBar
                ? "bg-cyan-500/20 border-cyan-400 text-cyan-300"
                : "bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-400"
            }`}
            title="Toggle 74-Series TTL ICs Toolbar"
          >
            <Cpu className="w-4 h-4 text-cyan-300" />
          </button>

          {/* Save Version Snapshot Button & Version History Dropdown */}
          <div className="relative">
            <div className="inline-flex items-center rounded-lg bg-gradient-to-r from-purple-500/20 to-cyan-500/20 border border-purple-500/40 p-0.5 shadow-sm">
              <button
                type="button"
                onClick={() => {
                  handleCreateVersionSnapshot();
                }}
                className="inline-flex items-center justify-center p-1.5 rounded-md text-xs font-mono font-bold text-purple-200 hover:text-white hover:bg-purple-500/25 transition-all cursor-pointer"
                title="Create New Circuit Version Snapshot"
              >
                <Bookmark className="w-4 h-4 text-purple-400" />
              </button>

              <button
                type="button"
                onClick={() => setIsVersionMenuOpen((v) => !v)}
                className="px-2 py-1.5 rounded-md text-xs font-mono text-purple-300 hover:text-white hover:bg-purple-500/25 transition-colors cursor-pointer border-l border-purple-500/30 flex items-center gap-1"
                title="View and restore saved circuit version snapshots"
              >
                <History className="w-3.5 h-3.5 text-cyan-400" />
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-purple-950 font-bold border border-purple-700/60 text-purple-200">
                  {sessionSnapshots.length}
                </span>
              </button>
            </div>

            {/* Version Snapshots Modal / Dropdown */}
            {isVersionMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 z-50 bg-[#0c1222] border border-purple-500/50 rounded-xl shadow-2xl p-3.5 text-xs font-mono space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <History className="w-4 h-4 text-purple-400" />
                    <span>Version Snapshots ({sessionSnapshots.length})</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsVersionMenuOpen(false)}
                    className="text-slate-400 hover:text-white text-xs px-1.5 py-0.5 rounded hover:bg-slate-800 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                {/* Create Custom Named Version */}
                <div className="space-y-1.5 bg-[#070b16] p-2.5 rounded-lg border border-slate-800">
                  <label className="text-[10px] text-slate-300 font-semibold block">
                    Save New Snapshot:
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      placeholder={`v${sessionSnapshots.length + 1} experiment...`}
                      value={newSnapshotName}
                      onChange={(e) => setNewSnapshotName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleCreateVersionSnapshot();
                        }
                      }}
                      className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white placeholder-slate-500 focus:border-purple-400 outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleCreateVersionSnapshot}
                      disabled={nodes.length === 0}
                      className="px-2.5 py-1 rounded bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-bold cursor-pointer transition-colors"
                    >
                      Save
                    </button>
                  </div>
                </div>

                {/* List of Saved Snapshots */}
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {sessionSnapshots.length === 0 ? (
                    <div className="text-center py-4 text-slate-500 text-[11px]">
                      No version snapshots saved yet.<br />
                      Click &quot;Save Version&quot; before testing changes.
                    </div>
                  ) : (
                    sessionSnapshots.map((snap) => (
                      <div
                        key={snap.id}
                        className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-900/80 border border-slate-800 hover:border-purple-500/40 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-purple-200 truncate text-[11.5px]">
                            {snap.name}
                          </div>
                          <div className="text-[9.5px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                            <span>{snap.timeFormatted}</span>
                            <span>•</span>
                            <span className="text-cyan-400">{snap.componentCount} comps</span>
                            <span>•</span>
                            <span>{snap.wireCount} wires</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleRestoreVersionSnapshot(snap)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-purple-950 hover:bg-purple-900 border border-purple-500/50 text-purple-200 text-[10px] font-bold cursor-pointer transition-colors"
                            title="Restore this circuit version snapshot"
                          >
                            <Undo2 className="w-3 h-3 text-purple-400" />
                            Restore
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteVersionSnapshot(snap.id)}
                            className="p-1 rounded hover:bg-rose-950/60 text-slate-500 hover:text-rose-400 cursor-pointer transition-colors"
                            title="Delete snapshot"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {sessionSnapshots.length > 0 && (
                  <div className="pt-1 border-t border-slate-800 flex justify-between items-center text-[10px]">
                    <span className="text-slate-500">Stored in browser session</span>
                    <button
                      type="button"
                      onClick={handleClearAllVersionSnapshots}
                      className="text-rose-400 hover:text-rose-300 hover:underline cursor-pointer"
                    >
                      Clear all versions
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Auto-Save Status Badge & Recovery Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsAutoSaveMenuOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-mono bg-slate-850 hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-white transition-colors cursor-pointer whitespace-nowrap"
              title="Auto-save status & session recovery options"
            >
              <HardDrive className={`w-3.5 h-3.5 ${autoSaveEnabled ? "text-[#48C99A]" : "text-[#9BAAC0]"}`} />
              <span className="text-[11px] flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${autoSaveEnabled ? "bg-[#48C99A]" : "bg-[#5E708A]"}`} />
                {!autoSaveEnabled
                  ? "Auto-Save Off"
                  : lastAutoSaveTimestamp
                  ? `Saved ${formatTimeAgo(lastAutoSaveTimestamp)}`
                  : "Auto-Save"}
              </span>
            </button>

            {isAutoSaveMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 z-50 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-3 text-xs font-mono space-y-2">
                <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                  <span className="font-bold text-white flex items-center gap-1">
                    <Save className="w-3.5 h-3.5 text-cyan-400" /> Auto-Save Manager
                  </span>
                  <span className={`text-[10px] font-bold px-1 rounded ${autoSaveEnabled ? "text-[#48C99A] bg-emerald-950" : "text-[#9BAAC0] bg-slate-800"}`}>
                    {autoSaveEnabled ? "Active" : "Manual Only"}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                  Circuit state is periodically persisted to browser localStorage to protect your work against accidental reloads or closes.
                </p>
                <div className="pt-1 flex flex-col gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      handleManualSaveSnapshot();
                      setIsAutoSaveMenuOpen(false);
                    }}
                    className="w-full py-1.5 px-2 rounded bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 font-semibold text-center cursor-pointer transition-colors"
                  >
                    Save Snapshot Now
                  </button>
                  {autoSaveRecoveryPrompt && (
                    <button
                      type="button"
                      onClick={() => {
                        handleRestoreAutoSavedSession();
                        setIsAutoSaveMenuOpen(false);
                      }}
                      className="w-full py-1.5 px-2 rounded bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 font-semibold text-center cursor-pointer transition-colors"
                    >
                      Restore Saved Circuit
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      handleClearSavedState();
                      setIsAutoSaveMenuOpen(false);
                    }}
                    className="w-full py-1 px-2 rounded bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 text-[10.5px] text-center cursor-pointer transition-colors"
                  >
                    Clear Auto-Saved State
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Undo / Redo Edit History Group */}
          <div className="flex items-center gap-0.5 bg-[#090f1d] border border-slate-700/80 p-0.5 rounded-xl">
            <button
              type="button"
              onClick={handleLabUndo}
              disabled={editHistoryPast.length === 0}
              className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-mono font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer"
              title="Undo Last Schematic Edit"
            >
              <Undo2 className="w-3.5 h-3.5 text-cyan-400" />
            </button>
            <button
              type="button"
              onClick={handleLabRedo}
              disabled={editHistoryFuture.length === 0}
              className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-mono font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer"
              title="Redo Schematic Edit"
            >
              <Redo2 className="w-3.5 h-3.5 text-cyan-400" />
            </button>
          </div>

          {/* Clipboard Action Group: Cut, Copy, Paste, Duplicate, Sub-Circuit Selector */}
          <div className="flex items-center gap-1 bg-[#090f1d] border border-slate-700/80 p-0.5 rounded-xl shadow-inner">
            <button
              type="button"
              onClick={handleCut}
              disabled={!selected && selectedNodeIds.length === 0 && selectedWireIds.length === 0}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-mono font-semibold bg-slate-800 hover:bg-amber-950/40 text-slate-300 hover:text-amber-200 disabled:opacity-35 disabled:cursor-not-allowed border border-slate-700/80 hover:border-amber-500/40 transition-colors cursor-pointer"
              title="Cut Selection to Clipboard (Ctrl+X / Cmd+X)"
            >
              <Scissors className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Cut</span>
            </button>

            <button
              type="button"
              onClick={handleCopy}
              disabled={!selected && selectedNodeIds.length === 0 && selectedWireIds.length === 0}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-mono font-semibold bg-slate-800 hover:bg-cyan-950/40 text-slate-300 hover:text-cyan-200 disabled:opacity-35 disabled:cursor-not-allowed border border-slate-700/80 hover:border-cyan-500/40 transition-colors cursor-pointer"
              title="Copy Selection to Clipboard (Ctrl+C / Cmd+C)"
            >
              <Copy className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Copy</span>
            </button>

            <button
              type="button"
              onClick={() => handlePaste()}
              disabled={
                !clipboard &&
                !localStorage.getItem(getUserScopedKey("logicraft_circuit_clipboard"))
              }
              className="relative inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-mono font-semibold bg-slate-800 hover:bg-emerald-950/40 text-slate-300 hover:text-emerald-200 disabled:opacity-35 disabled:cursor-not-allowed border border-slate-700/80 hover:border-emerald-500/40 transition-colors cursor-pointer"
              title="Paste from Clipboard (Ctrl+V / Cmd+V) · Clones at cursor or offset"
            >
              <ClipboardPaste className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Paste</span>
              {clipboard && (clipboard.nodes.length > 0 || clipboard.wires.length > 0) && (
                <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40">
                  {clipboard.nodes.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={handleDuplicate}
              disabled={!selected && selectedNodeIds.length === 0 && selectedWireIds.length === 0}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-mono font-semibold bg-slate-800 hover:bg-purple-950/40 text-slate-300 hover:text-purple-200 disabled:opacity-35 disabled:cursor-not-allowed border border-slate-700/80 hover:border-purple-500/40 transition-colors cursor-pointer"
              title="Duplicate Selection in Place (Ctrl+D / Cmd+D)"
            >
              <CopyPlus className="w-3.5 h-3.5 text-purple-400" />
              <span className="hidden md:inline">Duplicate</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectConnectedSubcircuit()}
              disabled={!selected && selectedNodeIds.length === 0}
              className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-mono font-semibold bg-cyan-950/30 hover:bg-cyan-900/50 text-cyan-300 hover:text-cyan-100 disabled:opacity-35 disabled:cursor-not-allowed border border-cyan-700/50 transition-colors cursor-pointer"
              title="Trace and Select Entire Connected Sub-Circuit"
            >
              <GitBranch className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden lg:inline text-[11px]">Sub-Circuit</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              const nodesToDelete = new Set<number>(selectedNodeIds);
              if (selected?.type === "node") nodesToDelete.add(selected.id);
              const wiresToDelete = new Set<number>(selectedWireIds);
              if (selected?.type === "wire") wiresToDelete.add(selected.id);

              if (nodesToDelete.size === 0 && wiresToDelete.size === 0) return;

              const currentNodes = nodesRef.current;
              const currentWires = wiresRef.current;

              const updatedNodes = currentNodes.filter((n) => !nodesToDelete.has(n.id));
              const updatedWires = currentWires.filter(
                (w) =>
                  !wiresToDelete.has(w.id) &&
                  !nodesToDelete.has(w.from.node) &&
                  !nodesToDelete.has(w.to.node)
              );

              const { updatedNodes: finalNodes, outs } = evaluateCircuit(updatedNodes, updatedWires);
              setNodes(finalNodes);
              setWires(updatedWires);
              pushWaveformSnapshot(finalNodes, outs);

              setSelected(null);
              setSelectedNodeIds([]);
              setSelectedWireIds([]);
              setIsPropertySidebarOpen(false);

              showClipboardNotice(
                `Deleted ${nodesToDelete.size > 0 ? `${nodesToDelete.size} component(s)` : ""}${
                  wiresToDelete.size > 0 ? ` ${wiresToDelete.size} wire(s)` : ""
                }`
              );
            }}
            disabled={!selected && selectedNodeIds.length === 0 && selectedWireIds.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-slate-800 hover:bg-rose-950/60 hover:border-rose-500/40 text-slate-300 disabled:opacity-40 border border-slate-700 transition-colors cursor-pointer whitespace-nowrap"
            title="Delete Selected Component(s) & Wires (Delete / Backspace)"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            Delete
          </button>
        </div>
      </div>

      {/* Active Live Pairing Session Strip */}
      {pairingSession && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 rounded-lg bg-[#111B2B] border border-[#24344D] text-xs font-mono">
          <div className="flex flex-wrap items-center gap-3 min-w-0">
            <span className="inline-flex items-center gap-1.5 font-bold text-[#F1F5FA]">
              <span
                className={`w-2 h-2 rounded-full ${
                  pairingSession.status === "paired"
                    ? "bg-[#48C99A]"
                    : "bg-[#35BDF2] animate-pulse"
                }`}
              />
              <span>
                {pairingSession.status === "paired"
                  ? "LIVE PAIRING · 2/2"
                  : "WAITING FOR PARTNER · 1/2"}
              </span>
            </span>
            <span className="text-[#9BAAC0] tabular-nums">
              Room <strong className="text-[#35BDF2]">{pairingSession.code}</strong>
              {" · "}Rev #{pairingSession.revision}
              {" · "}
              {pairingSession.transport === "rtdb"
                ? "Realtime DB"
                : "Cloud Sync"}
            </span>
            <span className="inline-flex items-center gap-2 text-[#9BAAC0]">
              <span className="inline-flex items-center gap-1">
                <span
                  className="w-2 h-2 rounded-sm inline-block"
                  style={{ backgroundColor: HOST_COLOR }}
                />
                {pairingSession.hostName}
              </span>
              <span>·</span>
              <span className="inline-flex items-center gap-1">
                <span
                  className="w-2 h-2 rounded-sm inline-block"
                  style={{
                    backgroundColor: pairingSession.guestUid
                      ? GUEST_COLOR
                      : "#24344D",
                  }}
                />
                {pairingSession.guestName || "Open Partner Slot"}
              </span>
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsLivePairingModalOpen(true)}
              className="px-2.5 py-1 rounded bg-[#162338] hover:bg-[#1E2E49] border border-[#24344D] text-[#35BDF2] text-[11px] font-semibold cursor-pointer whitespace-nowrap"
            >
              Manage / Invite
            </button>
            <button
              type="button"
              disabled={pairingBusy}
              onClick={() => void handleLeavePairingSession()}
              className="px-2.5 py-1 rounded bg-rose-950/60 hover:bg-rose-900/70 border border-rose-500/40 text-rose-200 text-[11px] font-semibold cursor-pointer whitespace-nowrap"
            >
              {pairingSession.role === "host" ? "End" : "Leave"}
            </button>
          </div>
        </div>
      )}

      {/* Virtual Oscilloscope 4-Channel Probe Dock Bar */}
      <OscilloscopeProbeDock
        attachedProbes={attachedProbes}
        activeProbeTool={activeProbeTool}
        onSelectProbeTool={(ch) =>
          setActiveProbeTool((prev) => (prev === ch ? null : ch))
        }
        onOpenPopup={() => setIsProbePopupOpen(true)}
        onAutoProbeWires={() => {
          if (wires.length === 0) return;
          const nextProbes: AttachedWireProbe[] = wires.slice(0, 4).map((w, idx) => ({
            channelId: PROBE_CHANNELS[idx].channelId,
            wireId: w.id,
            tPos: 0.45 + (idx % 2) * 0.15,
          }));
          setAttachedProbes(nextProbes);
          setIsProbePopupOpen(true);
        }}
        onClearAllProbes={() => setAttachedProbes([])}
        isPopupOpen={isProbePopupOpen}
      />

      {/* Circuit Completeness & Missing Connection Notification Banner */}
      {circuitVerifyNotice && (
        <div
          className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl border text-xs font-mono shadow-xl ${
            circuitVerifyNotice.type === "error"
              ? "bg-rose-950/90 border-rose-500/60 text-rose-200"
              : "bg-emerald-950/90 border-emerald-500/60 text-emerald-200"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {circuitVerifyNotice.type === "error" ? (
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 animate-bounce" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            )}
            <span className="font-semibold text-sm">
              {circuitVerifyNotice.text}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setCircuitVerifyNotice(null)}
            className="text-xs px-2.5 py-1 rounded-lg border border-white/20 hover:bg-white/10 cursor-pointer font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Simulation Halted Notification Toast */}
      {haltAlertToast && (
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg bg-amber-950/90 border border-amber-500/60 text-amber-200 text-xs font-mono shadow-xl">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
            <span>{haltAlertToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setHaltAlertToast(null)}
            className="text-amber-400 hover:text-white text-xs px-2 py-0.5 rounded border border-amber-500/30 hover:bg-amber-500/20 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Split Console: Categorized Equipment Library Tray + Right Interactive Schematic Canvas */}
      <div
        className={
          trayMode === "hidden"
            ? "w-full flex flex-col gap-3 items-start"
            : trayMode === "floating"
            ? "relative flex flex-col gap-4 items-start w-full"
            : "w-full grid grid-cols-1 lg:grid-cols-[310px_minmax(0,1fr)] gap-4 items-start"
        }
      >
        {/* Left Categorized Component Library Shelf: Only rendered when NOT hidden */}
        {trayMode !== "hidden" && (
          <aside
            className={
              trayMode === "floating"
                ? "fixed lg:absolute left-4 top-2 z-30 w-80 max-h-[80vh] overflow-y-auto bg-[#0d1424]/95 backdrop-blur-md border border-cyan-500/50 rounded-xl p-3.5 shadow-2xl space-y-3"
                : "w-full lg:w-[310px] shrink-0 bg-[#0e1629] border border-slate-800 rounded-xl p-3.5 space-y-3 shadow-xl"
            }
          >
            {/* Tray Header with Auto-Attach Toggle & Explicit Hide Button */}
            <div className="space-y-2 pb-2.5 border-b border-slate-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                    Component Library
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                    {filteredComponentItems.length}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setTrayMode("hidden")}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 transition-colors cursor-pointer"
                  title="Hide component tray to enlarge canvas to 100% full width"
                >
                  <EyeOff className="w-3.5 h-3.5" />
                  <span>Hide Tray</span>
                </button>
              </div>
              <div className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 text-[10.5px] font-mono">
                <span className="text-slate-300 flex items-center gap-1.5">
                  <Link2 className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Instrument Auto-Attach</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsAutoAttachEnabled((v) => {
                      const next = !v;
                      if (!next) setPendingAutoAttach(null);
                      return next;
                    });
                  }}
                  className={`px-2 py-0.5 rounded font-bold border cursor-pointer transition-colors ${
                    isAutoAttachEnabled
                      ? "bg-emerald-500/20 border-emerald-400/60 text-emerald-300"
                      : "bg-slate-800 border-slate-700 text-slate-400"
                  }`}
                  title="When ON: click any virtual meter or probe in the library, then click a circuit node to auto-wire with color-coded virtual leads"
                >
                  {isAutoAttachEnabled ? "ON" : "OFF"}
                </button>
              </div>
            </div>

            {/* Component Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search gates, 74xx, analog, IoT..."
                value={componentQuery}
                onChange={(e) => setComponentQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-850 rounded-lg text-xs text-white placeholder-slate-500 focus:border-cyan-400 outline-none font-mono"
              />
              {componentQuery && (
                <button
                  type="button"
                  onClick={() => setComponentQuery("")}
                  className="absolute right-2 top-2 text-slate-400 hover:text-white text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Class / Type Quick Filter & Expand All Toggle */}
            <div className="flex items-center justify-between gap-1 text-[10.5px] font-mono border-b border-slate-800 pb-1.5">
              <div className="flex items-center gap-1 overflow-x-auto scrollbar-thin flex-1 pr-1">
                <button
                  type="button"
                  onClick={() => setComponentSlotFilter("ALL")}
                  className={`px-2 py-0.5 rounded-md shrink-0 cursor-pointer transition-colors ${
                    componentSlotFilter === "ALL"
                      ? "bg-cyan-500/25 text-cyan-200 font-bold border border-cyan-400/60 shadow-xs"
                      : "text-slate-400 hover:text-slate-200 bg-slate-900/60 border border-slate-800"
                  }`}
                >
                  All Classes ({categorizedSections.reduce((acc, s) => acc + s.items.length, 0)})
                </button>
                {categorizedSections.map((sec) => (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => setComponentSlotFilter(sec.id)}
                    className={`px-2 py-0.5 rounded-md shrink-0 cursor-pointer transition-colors ${
                      componentSlotFilter === sec.id
                        ? "bg-cyan-500/25 text-cyan-200 font-bold border border-cyan-400/60 shadow-xs"
                        : "text-slate-400 hover:text-slate-200 bg-slate-900/60 border border-slate-800"
                    }`}
                  >
                    {sec.title.split(" ")[0]} ({sec.items.length})
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => {
                  const anyCollapsed = Object.values(collapsedSections).some(Boolean);
                  if (anyCollapsed) {
                    setCollapsedSections({});
                  } else {
                    const allCol: Record<string, boolean> = {};
                    categorizedSections.forEach((s) => (allCol[s.id] = true));
                    setCollapsedSections(allCol);
                  }
                }}
                className="shrink-0 text-[10px] text-cyan-400 hover:text-cyan-200 underline cursor-pointer pl-1"
                title="Expand or collapse all component class sections"
              >
                {Object.values(collapsedSections).some(Boolean) ? "Expand All" : "Collapse All"}
              </button>
            </div>

            {/* Quick 1-Click Check Output Across Selected Component */}
            {(() => {
              const selectedComp = selected?.type === "node" ? nodes.find((n) => n.id === selected.id) : null;
              if (!selectedComp || ["VOLTMETER", "AMMETER", "OHMMETER", "POWER_METER", "WATTMETER"].includes(selectedComp.type)) {
                return null;
              }
              return (
                <div className="p-2.5 rounded-lg bg-gradient-to-br from-cyan-950/60 via-slate-900 to-slate-950 border border-cyan-500/40 text-xs font-mono space-y-2 shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-cyan-300 flex items-center gap-1.5 truncate">
                      <Activity className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span>Check Output: <strong className="text-white">{selectedComp.label || selectedComp.type}</strong></span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setPmeModalMeterType("DIAGNOSTICS");
                        setIsPmeModalOpen(true);
                      }}
                      className="text-[9.5px] text-cyan-400 hover:text-cyan-200 underline cursor-pointer shrink-0 ml-1"
                    >
                      PME Guide
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleAutoMeasureComponent(selectedComp.id, "VOLTMETER")}
                      className="py-1 px-1 rounded-md bg-sky-950/80 hover:bg-sky-900 border border-sky-500/50 text-sky-200 text-[10px] font-bold flex flex-col items-center cursor-pointer transition-colors shadow-xs"
                      title="Attach Voltmeter in Parallel across component (10MΩ load)"
                    >
                      <span>[ V ]</span>
                      <span className="text-[8px] font-normal text-sky-300/80">Voltage</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAutoMeasureComponent(selectedComp.id, "AMMETER")}
                      className="py-1 px-1 rounded-md bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/50 text-emerald-200 text-[10px] font-bold flex flex-col items-center cursor-pointer transition-colors shadow-xs"
                      title="Insert Ammeter in Series loop with component (0.001Ω shunt)"
                    >
                      <span>[ A ]</span>
                      <span className="text-[8px] font-normal text-emerald-300/80">Current</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAutoMeasureComponent(selectedComp.id, "OHMMETER")}
                      className="py-1 px-1 rounded-md bg-amber-950/80 hover:bg-amber-900 border border-amber-500/50 text-amber-200 text-[10px] font-bold flex flex-col items-center cursor-pointer transition-colors shadow-xs"
                      title="Attach Ohmmeter across component (Requires unpowered 0V circuit)"
                    >
                      <span>[ Ω ]</span>
                      <span className="text-[8px] font-normal text-amber-300/80">Resistance</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAutoMeasureComponent(selectedComp.id, "POWER_METER")}
                      className="py-1 px-1 rounded-md bg-purple-950/80 hover:bg-purple-900 border border-purple-500/50 text-purple-200 text-[10px] font-bold flex flex-col items-center cursor-pointer transition-colors shadow-xs"
                      title="Wire 4-terminal Wattmeter: V-coil parallel & I-coil series"
                    >
                      <span>[ W ]</span>
                      <span className="text-[8px] font-normal text-purple-300/80">Power</span>
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* PME Metrology Quick Guidelines when viewing Meters slot */}
            {(componentSlotFilter === "METERS" || componentSlotFilter === "METERS_PROBES") && (
              <div className="p-2.5 rounded-lg bg-slate-900/90 border border-cyan-500/35 text-[10.5px] font-mono space-y-1.5 shadow-xs">
                <div className="flex items-center justify-between text-cyan-300 font-bold border-b border-slate-800 pb-1">
                  <span className="flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5 text-cyan-400" />
                    PME Metrology Standard
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setPmeModalMeterType("DIAGNOSTICS");
                      setIsPmeModalOpen(true);
                    }}
                    className="text-[9.5px] text-cyan-400 hover:text-cyan-200 underline cursor-pointer"
                  >
                    Open PME Guide
                  </button>
                </div>
                <div className="text-[10px] text-slate-300 space-y-1 leading-snug">
                  <div>• <strong className="text-sky-300">Voltmeter [V]:</strong> Wire in <em>PARALLEL</em> across components (10 MΩ).</div>
                  <div>• <strong className="text-emerald-300">Ammeter [A]:</strong> Wire in <em>SERIES</em> in line with the load (0.001 Ω).</div>
                  <div>• <strong className="text-amber-300">Ohmmeter [Ω]:</strong> Measure <em>UNPOWERED</em> components only (0V).</div>
                  <div>• <strong className="text-purple-300">Wattmeter [W]:</strong> <em>DUAL-COIL</em> (V-coil parallel, I-coil series).</div>
                </div>
              </div>
            )}

            {/* Structured Sections for Each Component Class / Type */}
            <div className="space-y-3 max-h-[calc(100vh-420px)] min-h-[340px] overflow-y-auto pr-1">
              {categorizedSections.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500 font-mono">
                  No components match &quot;{componentQuery}&quot;. Clear search to view library.
                </div>
              ) : (
                categorizedSections.map((sec) => {
                  const isCollapsed = !!collapsedSections[sec.id];
                  return (
                    <div
                      key={sec.id}
                      className="rounded-xl border border-slate-800/90 bg-slate-900/50 overflow-hidden shadow-xs"
                    >
                      {/* Section Class Header */}
                      <button
                        type="button"
                        onClick={() =>
                          setCollapsedSections((prev) => ({
                            ...prev,
                            [sec.id]: !prev[sec.id],
                          }))
                        }
                        className={`w-full flex items-center justify-between p-2.5 text-left bg-gradient-to-r ${sec.color} hover:brightness-110 transition-all cursor-pointer border-b ${
                          isCollapsed ? "border-transparent" : "border-slate-800"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-2 h-2 rounded-full bg-cyan-400" />
                          <span className="text-xs font-mono font-bold tracking-wide text-white truncate">
                            {sec.title}
                          </span>
                          <span className="text-[9.5px] font-mono px-1.5 py-0.2 rounded-full bg-slate-950/80 text-cyan-300 border border-slate-700">
                            {sec.items.length}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="hidden sm:inline text-[9px] font-mono text-slate-400 uppercase tracking-wider">
                            {sec.badge}
                          </span>
                          <ChevronDown
                            className={`w-3.5 h-3.5 text-slate-300 transition-transform duration-200 ${
                              isCollapsed ? "-rotate-90" : "rotate-0"
                            }`}
                          />
                        </div>
                      </button>

                      {/* Section Component Grid */}
                      {!isCollapsed && (
                        <div className="p-2 space-y-1.5 bg-slate-950/40">
                          <p className="text-[9.5px] text-slate-400 font-mono italic px-1 pb-1 border-b border-slate-900">
                            {sec.description}
                          </p>
                          <div className="grid grid-cols-2 gap-1.5 pt-1">
                            {sec.items.map((item) => {
                              const attachSpec = VIRTUAL_INSTRUMENT_SPECS[item.type];
                              const canAutoAttach = Boolean(isAutoAttachEnabled && attachSpec && nodes.length > 0);
                              const isArmed = pendingAutoAttach?.instrumentType === item.type;
                              return (
                                <button
                                  key={item.type}
                                  type="button"
                                  draggable
                                  onDragStart={(e) => {
                                    e.dataTransfer.setData("text/plain", item.type);
                                    e.dataTransfer.effectAllowed = "copy";
                                  }}
                                  onClick={() => {
                                    if (canAutoAttach && attachSpec) {
                                      if (isArmed) {
                                        setPendingAutoAttach(null);
                                      } else {
                                        setPendingAutoAttach(attachSpec);
                                        showClipboardNotice(`Auto-Attach Armed (${attachSpec.label}): Click any circuit node on canvas`);
                                      }
                                    } else {
                                      addNodeAuto(item.type);
                                    }
                                  }}
                                  className={`relative flex flex-col items-center justify-between p-2 rounded-lg border transition-all cursor-grab active:cursor-grabbing text-left group shadow-xs ${
                                    isArmed
                                      ? "bg-cyan-500/25 border-cyan-400 ring-1 ring-cyan-400"
                                      : "bg-slate-900/90 border-slate-800/90 hover:border-cyan-400/60 hover:bg-cyan-500/10"
                                  }`}
                                  title={
                                    canAutoAttach
                                      ? `Auto-Attach: Click then click any circuit node to wire ${item.label} automatically (or drag to place manually)`
                                      : `Click to add or drag ${item.label} (${item.type}) onto schematic`
                                  }
                                >
                                  {canAutoAttach && (
                                    <span
                                      className="absolute top-1 right-1 px-1 py-0.2 rounded text-[8px] font-mono font-bold border"
                                      style={{
                                        backgroundColor: isArmed ? attachSpec.color : "rgba(15, 23, 42, 0.9)",
                                        color: isArmed ? "#020617" : attachSpec.color,
                                        borderColor: attachSpec.color,
                                      }}
                                    >
                                      {isArmed ? "ARMED" : "AUTO"}
                                    </span>
                                  )}
                                  <div className="w-12 h-7 flex items-center justify-center my-0.5">
                                    <GateSymbolIcon type={item.type} />
                                  </div>
                                  <div className="w-full text-center mt-1">
                                    <span className="text-[10.5px] font-mono font-bold text-slate-200 group-hover:text-cyan-300 block truncate">
                                      {item.label}
                                    </span>
                                    <span className="text-[8.5px] font-mono text-slate-400 block truncate">
                                      {item.subtext || item.type}
                                    </span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Quick Actions Footer */}
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  prevOutsRef.current = {};
                  setNodes([]);
                  setWires([]);
                  setSelected(null);
                  setPendingWire(null);
                  setWaveformHistory([]);
                  setActivePreset("Custom Blank");
                  onClearExternalCircuit?.();
                  setAttachedProbes([]);
                }}
                className="flex-1 py-1.5 px-2 rounded-lg text-[11px] font-mono font-semibold text-rose-300 bg-rose-950/30 hover:bg-rose-950/60 border border-rose-800/50 transition-colors cursor-pointer text-center"
              >
                Clear Canvas
              </button>
              <button
                type="button"
                onClick={() => setTrayMode("hidden")}
                className="py-1.5 px-3 rounded-lg text-[11px] font-mono font-bold text-amber-300 bg-amber-950/30 hover:bg-amber-950/50 border border-amber-600/40 transition-colors cursor-pointer"
                title="Hide tray to give maximum room to canvas"
              >
                Hide Tray
              </button>
            </div>
          </aside>
        )}

        {/* Right Primary Interactive Schematic Canvas Viewport */}
        <div className="flex-1 min-w-0 w-full space-y-3">
          {/* Active Circuit Info & Missing Input Alerts: compact, non-overheading */}
          {compulsoryViolations.length > 0 && (
            <div className="bg-amber-950/40 border border-amber-500/50 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-amber-300 animate-pulse">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  Simulation Suspended: {compulsoryViolations.length} gate(s) missing compulsory inputs (
                  {compulsoryViolations.map((v) => `${v.gateType} #${v.nodeId}`).join(", ")})
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (compulsoryViolations[0]) {
                    handleAutoFixMissingPin(compulsoryViolations[0].nodeId, compulsoryViolations[0].missingPorts[0] || 0);
                  }
                }}
                className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-200 text-[11px] font-bold cursor-pointer transition-colors"
              >
                Auto-Feed Pin
              </button>
            </div>
          )}

          {/* Precision Measurement Equipment (PME) Misconnection & Operator Guidance Banner */}
          {meterFaultCount > 0 && firstFaultInfo && (
            <div className="bg-red-950/70 border border-red-500/80 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-red-200 shadow-xl shadow-red-950/50 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-red-600/30 border border-red-500 flex items-center justify-center shrink-0 shadow-inner">
                  <AlertTriangle className="w-4 h-4 text-red-400 animate-pulse" />
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-white flex items-center gap-2 flex-wrap">
                    <span className="text-red-300">PME Metrology Alert:</span>
                    <span>{firstFaultInfo.title}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-red-900/90 border border-red-500/70 text-red-100 font-bold">
                      {firstFaultInfo.meterType} #{firstFaultInfo.nodeId}
                    </span>
                  </div>
                  <p className="text-[11px] text-red-200/90 truncate max-w-2xl mt-0.5">
                    {firstFaultInfo.description}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setPmeModalMeterType(firstFaultInfo.meterType);
                    setIsPmeModalOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/70 text-cyan-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
                  title="Open PME Guidance Manual for IEEE/IEC placement rules"
                >
                  <Compass className="w-3.5 h-3.5 text-cyan-400" />
                  <span>How to Use PME</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAutoFixMeterFault(firstFaultInfo.fault)}
                  className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-md"
                  title="Auto-correct meter wiring according to IEEE 315 / IEC 60617 standard"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-200" />
                  <span>Auto-Correct Wiring</span>
                </button>
                {meterFaultCount > 1 && (
                  <button
                    type="button"
                    onClick={handleAutoFixAllMeterFaults}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 font-medium text-xs cursor-pointer transition-colors"
                  >
                    Fix All ({meterFaultCount})
                  </button>
                )}
              </div>
            </div>
          )}

          {/* SVG Schematic Canvas & Property Sidebar Container */}
          <div
            className={`relative bg-[#070A12] border rounded-xl overflow-hidden transition-all duration-300 flex w-full ${
              isPinViewEnabled
                ? "sticky top-2 z-20 h-[52vh] min-h-[380px] max-h-[580px] border-cyan-400/75 shadow-[0_20px_50px_rgba(0,0,0,0.72)] overscroll-contain"
                : isFullStudio
                ? "h-[calc(100vh-190px)] min-h-[540px] sm:min-h-[660px] border-cyan-500/60 shadow-2xl shadow-cyan-950/40"
                : isMaxCanvas
                ? "h-[86vh] min-h-[580px] sm:min-h-[720px] border-cyan-500/50 shadow-2xl shadow-cyan-950/30"
                : "h-[56vh] min-h-[430px] max-h-[620px] border-slate-800"
            }`}
          >
            {/* Floating Quick Action Button when Tray is Hidden */}
            {trayMode === "hidden" && (
              <div
                className={`absolute left-3.5 z-20 flex items-center gap-2 ${
                  isCinematic3DView ? "top-14" : "top-3.5"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setTrayMode("docked")}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0d1424]/90 hover:bg-[#131e36] text-cyan-300 hover:text-white border border-cyan-500/40 hover:border-cyan-400 shadow-xl backdrop-blur-md text-xs font-mono font-bold transition-all cursor-pointer"
                  title="Open Component Library Tray (Dock to side)"
                >
                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  <span>+ Component Library</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsCircuitLibraryOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0d1424]/90 hover:bg-[#131e36] text-purple-300 hover:text-white border border-purple-500/40 hover:border-purple-400 shadow-xl backdrop-blur-md text-xs font-mono font-bold transition-all cursor-pointer"
                  title="Open Circuit Presets Library"
                >
                  <BookOpen className="w-3.5 h-3.5 text-purple-400" />
                  <span>Circuit Presets</span>
                </button>
              </div>
            )}
            {/* Primary SVG Canvas Workspace */}
            <div
              ref={canvasViewportRef}
              style={{ backgroundColor: activeCanvasTheme.bg, ...themeCssVars }}
              className={`relative flex-1 h-full overflow-hidden transition-colors duration-200 ${
                isPinViewEnabled ? "overscroll-contain touch-none" : ""
              }`}
            >
              {/* Empty Canvas Starter Guidance Overlay for University Students */}
              {!isCinematic3DView && nodes.length === 0 && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6 z-10">
                  <div className="pointer-events-auto max-w-xl w-full bg-[#0c1220]/95 backdrop-blur-md border border-cyan-500/35 rounded-2xl p-6 shadow-2xl text-center space-y-4">
                    <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mx-auto text-cyan-400">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white tracking-wide font-mono">
                        {activePreset.startsWith("Custom") || activePreset === "Empty Canvas"
                          ? "Clean Schematic Workbench · Ready to Build"
                          : activePreset}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1 font-sans">
                        Canvas is clean and ready. Click or drag components from the left component tray to build your circuit, or pick a starter component below:
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => addNodeAuto("RES")}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800/90 hover:bg-cyan-500/20 border border-slate-700 hover:border-cyan-400/50 text-slate-200 hover:text-white text-xs font-mono transition-colors cursor-pointer"
                        title="Add 1kΩ Resistor"
                      >
                        + Resistor (1kΩ)
                      </button>
                      <button
                        type="button"
                        onClick={() => addNodeAuto("CAP_NP")}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800/90 hover:bg-cyan-500/20 border border-slate-700 hover:border-cyan-400/50 text-slate-200 hover:text-white text-xs font-mono transition-colors cursor-pointer"
                        title="Add 100nF Capacitor"
                      >
                        + Capacitor (100nF)
                      </button>
                      <button
                        type="button"
                        onClick={() => addNodeAuto("DIODE_1N4007")}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800/90 hover:bg-cyan-500/20 border border-slate-700 hover:border-cyan-400/50 text-slate-200 hover:text-white text-xs font-mono transition-colors cursor-pointer"
                        title="Add 1N4007 Silicon Diode"
                      >
                        + 1N4007 Diode
                      </button>
                      <button
                        type="button"
                        onClick={() => addNodeAuto("BC547")}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800/90 hover:bg-cyan-500/20 border border-slate-700 hover:border-cyan-400/50 text-slate-200 hover:text-white text-xs font-mono transition-colors cursor-pointer"
                        title="Add BC547 NPN BJT"
                      >
                        + BC547 NPN
                      </button>
                      <button
                        type="button"
                        onClick={() => addNodeAuto("OPAMP_741")}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800/90 hover:bg-cyan-500/20 border border-slate-700 hover:border-cyan-400/50 text-slate-200 hover:text-white text-xs font-mono transition-colors cursor-pointer"
                        title="Add LM741 Operational Amplifier"
                      >
                        + LM741 Op-Amp
                      </button>
                      <button
                        type="button"
                        onClick={() => addNodeAuto("VCC_5V")}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800/90 hover:bg-cyan-500/20 border border-slate-700 hover:border-cyan-400/50 text-slate-200 hover:text-white text-xs font-mono transition-colors cursor-pointer"
                        title="Add +5V DC Supply Rail"
                      >
                        + DC Supply (+5V)
                      </button>
                      <button
                        type="button"
                        onClick={() => addNodeAuto("GND")}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800/90 hover:bg-cyan-500/20 border border-slate-700 hover:border-cyan-400/50 text-slate-200 hover:text-white text-xs font-mono transition-colors cursor-pointer"
                        title="Add Ground Terminal"
                      >
                        + Ground (GND)
                      </button>
                      <button
                        type="button"
                        onClick={() => addNodeAuto("INPUT")}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800/90 hover:bg-cyan-500/20 border border-slate-700 hover:border-cyan-400/50 text-slate-200 hover:text-white text-xs font-mono transition-colors cursor-pointer"
                        title="Add Toggle Switch"
                      >
                        + Switch (0/1)
                      </button>
                      <button
                        type="button"
                        onClick={() => addNodeAuto("AND")}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800/90 hover:bg-cyan-500/20 border border-slate-700 hover:border-cyan-400/50 text-slate-200 hover:text-white text-xs font-mono transition-colors cursor-pointer"
                        title="Add 2-Input AND Gate"
                      >
                        + AND Gate
                      </button>
                      <button
                        type="button"
                        onClick={() => addNodeAuto("VOLTMETER")}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800/90 hover:bg-cyan-500/20 border border-slate-700 hover:border-cyan-400/50 text-cyan-300 hover:text-white text-xs font-mono transition-colors cursor-pointer"
                        title="Add Digital Voltmeter"
                      >
                        + Voltmeter [V]
                      </button>
                      <button
                        type="button"
                        onClick={() => addNodeAuto("OUTPUT")}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800/90 hover:bg-cyan-500/20 border border-slate-700 hover:border-cyan-400/50 text-emerald-300 hover:text-white text-xs font-mono transition-colors cursor-pointer"
                        title="Add LED Probe"
                      >
                        + LED Probe
                      </button>
                    </div>

                    <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400 font-mono">
                      <span>Click ports to wire · Shift+Drag Box-Select · Ctrl+C Copy · Ctrl+X Cut · Ctrl+V Paste · Ctrl+D Duplicate</span>
                      <button
                        type="button"
                        onClick={() => {
                          const sample = CIRCUIT_PRESETS["Half Adder"];
                          if (sample) {
                            loadCircuitDefs("Half Adder Sample", sample.nodes, sample.wires);
                          }
                        }}
                        className="text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
                        title="Load reference template if you need guidance"
                      >
                        Load Reference Template
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Floating Auto-Attach Armed Banner */}
              {pendingAutoAttach && (
                <div className="absolute top-14 left-1/2 -translate-x-1/2 z-40">
                  <div
                    className="flex flex-wrap items-center gap-2.5 px-4 py-2 rounded-full bg-[#090f1d]/95 border-2 shadow-2xl backdrop-blur-md text-xs font-mono text-white font-bold"
                    style={{ borderColor: pendingAutoAttach.color }}
                  >
                    <Link2 className="w-3.5 h-3.5 shrink-0" style={{ color: pendingAutoAttach.color }} />
                    <span>
                      AUTO-ATTACH ARMED ({pendingAutoAttach.label}): Click any circuit node on canvas
                    </span>
                    {!pendingAutoAttach.mode.startsWith("DOCK_") && (
                      <button
                        type="button"
                        onClick={() => {
                          const t = pendingAutoAttach.instrumentType;
                          setPendingAutoAttach(null);
                          addNodeAuto(t);
                        }}
                        className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10.5px] text-cyan-300 border border-slate-600 cursor-pointer"
                      >
                        Place Unwired
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setPendingAutoAttach(null)}
                      className="px-2 py-0.5 rounded bg-rose-950/70 hover:bg-rose-900 text-[10.5px] text-rose-200 border border-rose-500/50 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Floating Clipboard Action Feedback Toast */}
              {clipboardNotice && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 pointer-events-none transition-all duration-300">
                  <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#090f1d]/95 border border-cyan-400/80 shadow-2xl shadow-cyan-950/70 backdrop-blur-md text-xs font-mono text-cyan-200 font-bold">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-300 animate-spin" />
                    <span>{clipboardNotice}</span>
                  </div>
                </div>
              )}

              {/* Mobile Multi-Touch Gesture Feedback Pill (Pinch-to-Zoom & Two-Finger-Pan) */}
              {isTwoFingerGesturing && (
                <div className="absolute top-14 left-1/2 -translate-x-1/2 z-40 pointer-events-none transition-all duration-200">
                  <div className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-[#080d1a]/95 border border-cyan-400/90 shadow-2xl shadow-cyan-950/80 backdrop-blur-md text-xs font-mono text-cyan-200 font-bold">
                    {twoFingerGestureMode === "PINCH" ? (
                      <ZoomIn className="w-4 h-4 text-cyan-300 animate-pulse shrink-0" />
                    ) : twoFingerGestureMode === "PAN" ? (
                      <Move className="w-4 h-4 text-cyan-300 animate-pulse shrink-0" />
                    ) : (
                      <Hand className="w-4 h-4 text-cyan-300 animate-pulse shrink-0" />
                    )}
                    <span className="flex items-center gap-1.5">
                      <span>
                        {twoFingerGestureMode === "PINCH"
                          ? "Pinch-to-Zoom"
                          : twoFingerGestureMode === "PAN"
                          ? "Two-Finger Pan"
                          : "Pinch & Pan Active"}
                      </span>
                      <span className="text-cyan-300 font-bold bg-cyan-950/90 px-2 py-0.5 rounded border border-cyan-700/60 text-[11px]">
                        {Math.round(canvasZoom * 100)}%
                      </span>
                    </span>
                  </div>
                </div>
              )}

              {/* Floating Quick Canvas Contrast / Theme Pill (Always visible & accessible on 2D canvas) */}
              {!isCinematic3DView && (
                <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 p-1 rounded-xl bg-[#090e1a]/90 backdrop-blur-md border border-slate-700/80 shadow-xl text-xs font-mono">
                  <button
                    type="button"
                    onClick={handleToggleDayNight}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold border transition-all cursor-pointer ${
                      activeCanvasTheme.isLight
                        ? "bg-amber-400/25 text-amber-200 border-amber-400/60 hover:bg-amber-400/35 shadow-xs"
                        : "bg-indigo-950/80 text-cyan-200 border-indigo-700/60 hover:bg-indigo-900/80"
                    }`}
                    title={`1-Click Day/Night Toggle: Switch to ${activeCanvasTheme.isLight ? "Dark Slate Navy" : "Multisim Paper Light"}`}
                  >
                    {activeCanvasTheme.isLight ? (
                      <>
                        <Sun className="w-3.5 h-3.5 text-amber-400" />
                        <span className="text-[10.5px]">Paper (Day)</span>
                      </>
                    ) : (
                      <>
                        <Moon className="w-3.5 h-3.5 text-cyan-300" />
                        <span className="text-[10.5px]">Slate (Night)</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCanvasColorMenuOpen((o) => !o)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700/80 transition-colors cursor-pointer text-[10.5px] font-bold"
                    title="Change Canvas Background Color & Schematic Contrast Theme"
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full border border-white/50 shrink-0"
                      style={{ backgroundColor: activeCanvasTheme.bg }}
                    />
                    <span>{activeCanvasTheme.label}</span>
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                  </button>
                </div>
              )}

              {/* Simulation RUN/STOP Choreography Status Pill */}
              {!isCinematic3DView && (simBannerPhase || !isSimRunning) && (
                <div className="absolute top-3 right-3 z-20 pointer-events-none">
                  <div
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[11px] font-mono font-bold shadow-lg transition-all ${
                      simBannerPhase === "STARTED" || isSimRunning
                        ? "bg-emerald-950/90 border-emerald-500/60 text-emerald-200"
                        : "bg-amber-950/90 border-amber-500/60 text-amber-200"
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isSimRunning ? "bg-emerald-400" : "bg-amber-400"
                      }`}
                    />
                    <span>
                      {simBannerPhase === "STARTED"
                        ? "SIMULATION STARTED · ACTIVE NETS ILLUMINATED"
                        : simBannerPhase === "STOPPED"
                        ? "SIMULATION STOPPED · ALL ACTUATORS AT REST"
                        : "SIMULATION PAUSED · CLICK RUN TO ENERGIZE"}
                    </span>
                  </div>
                </div>
              )}

              {isCinematic3DView ? (
                <CircuitLabCinematic3D
                  circuitTitle={activePreset || "Custom Schematic"}
                  isRunning={isSimRunning}
                  simSpeed={simSpeed}
                  spiceFreqHz={circuitSpiceFreqHz}
                  supplyVoltageV={analogSolution.sourceVoltageV || 5}
                  selectedNodeId={selected?.type === "node" ? selected.id : null}
                  prefersReducedMotion={prefersReducedMotion}
                  isPageVisible={isPageVisible}
                  probedSignals={probedWireSignals.map((p) => ({
                    channelId: p.channelId,
                    netName: p.netName,
                    color: p.color,
                    currentVoltage: p.currentVoltage,
                    frequencyHz: p.frequencyHz ?? 0,
                    waveformType: p.waveformType ?? "DC",
                    stepSamples: p.stepSamples ?? [],
                  }))}
                  nodes={nodes.map((n) => {
                    const out0 = liveVals[n.id]?.[0] ?? 0;
                    const telem = analogSolution?.compTelemetry?.get(n.id);
                    const currentMa =
                      telem?.current_mA ?? (telem?.isConducting ? 12 : 0);
                    const pinV =
                      analogSolution?.getPinVoltage?.(n.id, 0) ??
                      (out0 === 1 ? 5 : 0);
                    const isInputType =
                      n.type === "INPUT" ||
                      n.type === "CLOCK" ||
                      n.type === "SWITCH_SPST" ||
                      n.type === "SWITCH_SPDT" ||
                      n.type.includes("BUTTON");
                    const segments =
                      n.type === "7SEG"
                        ? [0, 1, 2, 3, 4, 5, 6].map(
                            (idx) =>
                              getInputVal(n.id, idx, liveVals, liveWireMap, 0) === 1
                          )
                        : undefined;
                    const inputDriven =
                      n.type === "OUTPUT" ||
                      n.type.startsWith("LED") ||
                      n.type === "BUZZER"
                        ? getInputVal(n.id, 0, liveVals, liveWireMap, 0) === 1
                        : false;
                    return {
                      id: n.id,
                      type: n.type,
                      label: n.label || COMP_SPECS[n.type]?.label || n.type,
                      x: n.x,
                      y: n.y,
                      value:
                        n.analogParams?.resistanceOhms ??
                        n.analogParams?.dcVoltageV ??
                        n.value ??
                        0,
                      formattedValue: n.analogParams?.formattedValue,
                      isHigh:
                        n.type === "INPUT" || n.type === "CLOCK"
                          ? (n.value ?? 0) === 1
                          : out0 === 1 || inputDriven || Math.abs(currentMa) > 0.5,
                      isConducting:
                        (telem?.isConducting ?? false) ||
                        inputDriven ||
                        out0 === 1,
                      currentMa,
                      voltageV: pinV,
                      simFreqHz: getNodeSpiceFreqHz(n),
                      segments,
                      isInteractive: isInputType,
                    };
                  })}
                  wires={wires.map((w) => {
                    const fromHigh =
                      (liveVals[w.from.node]?.[w.from.port] ?? 0) === 1;
                    const telFrom = analogSolution?.compTelemetry?.get(w.from.node);
                    const telTo = analogSolution?.compTelemetry?.get(w.to.node);
                    const cur = Math.max(
                      Math.abs(telFrom?.current_mA ?? 0),
                      Math.abs(telTo?.current_mA ?? 0)
                    );
                    const fromNodeObj = nodes.find((nd) => nd.id === w.from.node);
                    return {
                      id: w.id,
                      fromId: w.from.node,
                      toId: w.to.node,
                      isEnergized: isSimRunning && (fromHigh || cur > 0.2),
                      currentMa: cur || (fromHigh ? 10 : 0),
                      freqHz: fromNodeObj
                        ? getNodeSpiceFreqHz(fromNodeObj)
                        : circuitSpiceFreqHz,
                    };
                  })}
                  onSelectNode={(id) => {
                    setSelected({ type: "node", id });
                    setSelectedNodeIds([id]);
                  }}
                  onToggleInteractiveNode={(id) => {
                    const targetNode = nodes.find((nd) => nd.id === id);
                    if (!targetNode) return;
                    if (targetNode.type === "CLOCK") {
                      pulseClockInputs();
                      return;
                    }
                    const toggled = nodes.map((nd) =>
                      nd.id === id ? { ...nd, value: nd.value === 1 ? 0 : 1 } : nd
                    );
                    const { updatedNodes, outs } = evaluateCircuit(toggled, wires);
                    setNodes(updatedNodes);
                    pushWaveformSnapshot(updatedNodes, outs);
                  }}
                  onExitCinematic={() => setIsCinematic3DView(false)}
                />
              ) : (
              <svg
                ref={svgRef}
                id="canvas"
                style={themeCssVars}
                className={`w-full h-full block touch-none ${
                isPanning ? "cursor-grabbing" : "cursor-default"
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "copy";
              }}
              onDrop={(e) => {
                e.preventDefault();
                const rawData = e.dataTransfer.getData("text/plain");
                if (!rawData) return;
                if (rawData.startsWith("PROBE:")) {
                  const chId = rawData.replace("PROBE:", "") as any;
                  const p = toWorld(e.clientX, e.clientY);
                  let closestWireId: number | null = null;
                  let minDist = 180;
                  wires.forEach((w) => {
                    const p1 = getPortPos(w.from.node, w.from.port, "out");
                    const p2 = getPortPos(w.to.node, w.to.port, "in");
                    if (!p1 || !p2) return;
                    const midX = (p1.x + p2.x) / 2;
                    const midY = (p1.y + p2.y) / 2;
                    const dist = Math.hypot(p.x - midX, p.y - midY);
                    if (dist < minDist) {
                      minDist = dist;
                      closestWireId = w.id;
                    }
                  });
                  if (closestWireId !== null) {
                    attachProbeToWire(chId, closestWireId);
                  } else if (wires.length > 0) {
                    attachProbeToWire(chId, wires[0].id);
                  }
                  return;
                }
                const p = toWorld(e.clientX, e.clientY);
                addNodeAt(rawData, p.x - 30, p.y - 25);
              }}
              onPointerDown={handleCanvasPointerDown}
              onPointerMove={(e) => {
                if (!isTwoFingerGesturingRef.current) {
                  const world = toWorld(e.clientX, e.clientY);
                  mouseWorldRef.current = world;
                  if (pendingWireRef.current) {
                    setMouseWorld(world);
                  }
                  if (pairingHandleRef.current) {
                    const now = performance.now();
                    if (now - lastCursorEmitAtRef.current >= 85) {
                      lastCursorEmitAtRef.current = now;
                      void pairingHandleRef.current
                        .updatePresence({ cursorX: world.x, cursorY: world.y })
                        .catch(() => undefined);
                    }
                  }
                }
              }}
              onWheel={(e) => {
                if (isPinViewEnabled) {
                  // Handled cleanly by the non-passive native wheel listener when Pin View is active
                  return;
                }
                if (isBoardLockedRef.current) {
                  return;
                }
                e.preventDefault();
                if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
                  setPan((prev) => ({
                    x: Math.round(prev.x - (e.deltaX || e.deltaY)),
                    y: Math.round(prev.y - (e.shiftKey ? 0 : e.deltaY)),
                  }));
                } else {
                  const factor = e.deltaY < 0 ? 1.08 : 0.92;
                  const rect = svgRef.current?.getBoundingClientRect();
                  if (rect) {
                    const mouseScreenX = e.clientX - rect.left;
                    const mouseScreenY = e.clientY - rect.top;
                    setCanvasZoom((prevZoom) => {
                      const nextZoom = Math.max(0.35, Math.min(2.5, Math.round(prevZoom * factor * 100) / 100));
                      const worldX = (mouseScreenX - pan.x) / prevZoom;
                      const worldY = (mouseScreenY - pan.y) / prevZoom;
                      setPan({
                        x: Math.round(mouseScreenX - worldX * nextZoom),
                        y: Math.round(mouseScreenY - worldY * nextZoom),
                      });
                      return nextZoom;
                    });
                  } else {
                    setCanvasZoom((prev) => Math.max(0.35, Math.min(2.5, Math.round(prev * factor * 100) / 100)));
                  }
                }
              }}
            >
              <defs>
                {/* 1. Solderless Breadboard Pattern - Lab Dark */}
                {(() => {
                  const p = gridPitch;
                  const w = p * 10;
                  const h = p * 16;
                  const uRows = [3, 4, 5, 6, 7];
                  const lRows = [9, 10, 11, 12, 13];
                  return (
                    <pattern
                      id="breadboard-grid"
                      width={w}
                      height={h}
                      patternUnits="userSpaceOnUse"
                      patternTransform={`translate(${pan.x}, ${pan.y}) scale(${canvasZoom})`}
                    >
                      {/* Dark Polymer Breadboard Base */}
                      <rect width={w} height={h} fill="#090e1a" />
                      <path d={`M 0 ${h} L ${w} ${h}`} stroke="#1e293b" strokeWidth="1.5" />

                      {/* Top Red VCC (+) Power Rail */}
                      <line x1={0} y1={p * 0.5} x2={w} y2={p * 0.5} stroke="#ef4444" strokeWidth="1.6" strokeOpacity="0.75" />
                      <text x={8} y={p * 0.45} fill="#ef4444" fontSize="8" fontFamily="monospace" fontWeight="bold">+ VCC</text>

                      {/* Top Blue GND (-) Power Rail */}
                      <line x1={0} y1={p * 1.5} x2={w} y2={p * 1.5} stroke="#38bdf8" strokeWidth="1.6" strokeOpacity="0.75" />
                      <text x={8} y={p * 1.45} fill="#38bdf8" fontSize="8" fontFamily="monospace" fontWeight="bold">- GND</text>

                      {/* Top Separator Groove */}
                      <line x1={0} y1={p * 2.1} x2={w} y2={p * 2.1} stroke="#1e293b" strokeWidth="1" strokeDasharray="4 2" />

                      {/* Column Coordinates */}
                      <text x={0.5 * p} y={p * 2.75} textAnchor="middle" fill="#64748b" fontSize="7.5" fontFamily="monospace" fontWeight="bold">1</text>
                      <text x={4.5 * p} y={p * 2.75} textAnchor="middle" fill="#64748b" fontSize="7.5" fontFamily="monospace" fontWeight="bold">5</text>
                      <text x={9.5 * p} y={p * 2.75} textAnchor="middle" fill="#64748b" fontSize="7.5" fontFamily="monospace" fontWeight="bold">10</text>

                      {/* Row Letters a-e */}
                      {["a", "b", "c", "d", "e"].map((ltr, i) => (
                        <text key={`bb-dark-u-${ltr}`} x={3} y={(uRows[i] + 0.5) * p + 2.5} fill="#475569" fontSize="7" fontFamily="monospace" fontWeight="bold">
                          {ltr}
                        </text>
                      ))}

                      {/* Central DIP IC Trough Groove (0.3" / 1-pitch standard DIP channel) */}
                      <rect x={0} y={p * 8} width={w} height={p} fill="#050812" stroke="#1e293b" strokeWidth="1" />
                      <line x1={0} y1={p * 8.5} x2={w} y2={p * 8.5} stroke="#1e293b" strokeWidth="1.2" strokeDasharray="6 4" />
                      <text x={w / 2} y={p * 8.5 + 2.5} textAnchor="middle" fill="#475569" fontSize="6.5" fontFamily="monospace" letterSpacing="2">
                        DIP IC TROUGH
                      </text>

                      {/* Row Letters f-j */}
                      {["f", "g", "h", "i", "j"].map((ltr, i) => (
                        <text key={`bb-dark-l-${ltr}`} x={3} y={(lRows[i] + 0.5) * p + 2.5} fill="#475569" fontSize="7" fontFamily="monospace" fontWeight="bold">
                          {ltr}
                        </text>
                      ))}

                      {/* Bottom Power Rails */}
                      <line x1={0} y1={p * 14.5} x2={w} y2={p * 14.5} stroke="#38bdf8" strokeWidth="1.6" strokeOpacity="0.75" />
                      <text x={8} y={p * 14.45} fill="#38bdf8" fontSize="8" fontFamily="monospace" fontWeight="bold">- GND</text>
                      <line x1={0} y1={p * 15.5} x2={w} y2={p * 15.5} stroke="#ef4444" strokeWidth="1.6" strokeOpacity="0.75" />
                      <text x={8} y={p * 15.45} fill="#ef4444" fontSize="8" fontFamily="monospace" fontWeight="bold">+ VCC</text>

                      {/* Sockets and 5-hole Conductive Tie-Strips */}
                      {Array.from({ length: 10 }).map((_, c) => {
                        const cx = (c + 0.5) * p;
                        return (
                          <g key={`bb-dark-c-${c}`}>
                            {/* Upper 5-pin vertical tie strip */}
                            <rect x={cx - 1.5} y={(uRows[0] + 0.1) * p} width="3" height={(uRows.length - 0.2) * p} rx="1.5" fill="rgba(30, 41, 59, 0.45)" />
                            {/* Lower 5-pin vertical tie strip */}
                            <rect x={cx - 1.5} y={(lRows[0] + 0.1) * p} width="3" height={(lRows.length - 0.2) * p} rx="1.5" fill="rgba(30, 41, 59, 0.45)" />

                            {/* Power Rail Sockets Row 0 & 1 */}
                            <g transform={`translate(${cx}, ${p * 0.5})`}>
                              <rect x="-3.2" y="-3.2" width="6.4" height="6.4" rx="1.5" fill="#04070e" stroke="#1e293b" strokeWidth="0.8" />
                              <line x1="-1.2" y1="-2" x2="-1.2" y2="2" stroke="#475569" strokeWidth="0.8" />
                              <line x1="1.2" y1="-2" x2="1.2" y2="2" stroke="#475569" strokeWidth="0.8" />
                              <circle cx="0" cy="0" r="0.75" fill="#64748b" />
                            </g>
                            <g transform={`translate(${cx}, ${p * 1.5})`}>
                              <rect x="-3.2" y="-3.2" width="6.4" height="6.4" rx="1.5" fill="#04070e" stroke="#1e293b" strokeWidth="0.8" />
                              <line x1="-1.2" y1="-2" x2="-1.2" y2="2" stroke="#475569" strokeWidth="0.8" />
                              <line x1="1.2" y1="-2" x2="1.2" y2="2" stroke="#475569" strokeWidth="0.8" />
                              <circle cx="0" cy="0" r="0.75" fill="#64748b" />
                            </g>

                            {/* Upper Terminal Sockets a-e */}
                            {uRows.map((r) => (
                              <g key={`bb-dark-u-${c}-${r}`} transform={`translate(${cx}, ${(r + 0.5) * p})`}>
                                <rect x="-3.2" y="-3.2" width="6.4" height="6.4" rx="1.5" fill="#04070e" stroke="#1e293b" strokeWidth="0.8" />
                                <line x1="-1.2" y1="-2" x2="-1.2" y2="2" stroke="#475569" strokeWidth="0.8" />
                                <line x1="1.2" y1="-2" x2="1.2" y2="2" stroke="#475569" strokeWidth="0.8" />
                                <circle cx="0" cy="0" r="0.75" fill="#64748b" />
                              </g>
                            ))}

                            {/* Lower Terminal Sockets f-j */}
                            {lRows.map((r) => (
                              <g key={`bb-dark-l-${c}-${r}`} transform={`translate(${cx}, ${(r + 0.5) * p})`}>
                                <rect x="-3.2" y="-3.2" width="6.4" height="6.4" rx="1.5" fill="#04070e" stroke="#1e293b" strokeWidth="0.8" />
                                <line x1="-1.2" y1="-2" x2="-1.2" y2="2" stroke="#475569" strokeWidth="0.8" />
                                <line x1="1.2" y1="-2" x2="1.2" y2="2" stroke="#475569" strokeWidth="0.8" />
                                <circle cx="0" cy="0" r="0.75" fill="#64748b" />
                              </g>
                            ))}

                            {/* Power Rail Sockets Row 14 & 15 */}
                            <g transform={`translate(${cx}, ${p * 14.5})`}>
                              <rect x="-3.2" y="-3.2" width="6.4" height="6.4" rx="1.5" fill="#04070e" stroke="#1e293b" strokeWidth="0.8" />
                              <line x1="-1.2" y1="-2" x2="-1.2" y2="2" stroke="#475569" strokeWidth="0.8" />
                              <line x1="1.2" y1="-2" x2="1.2" y2="2" stroke="#475569" strokeWidth="0.8" />
                              <circle cx="0" cy="0" r="0.75" fill="#64748b" />
                            </g>
                            <g transform={`translate(${cx}, ${p * 15.5})`}>
                              <rect x="-3.2" y="-3.2" width="6.4" height="6.4" rx="1.5" fill="#04070e" stroke="#1e293b" strokeWidth="0.8" />
                              <line x1="-1.2" y1="-2" x2="-1.2" y2="2" stroke="#475569" strokeWidth="0.8" />
                              <line x1="1.2" y1="-2" x2="1.2" y2="2" stroke="#475569" strokeWidth="0.8" />
                              <circle cx="0" cy="0" r="0.75" fill="#64748b" />
                            </g>
                          </g>
                        );
                      })}
                    </pattern>
                  );
                })()}

                {/* 2. Solderless Breadboard Pattern - Classic White / Ivory MB-102 */}
                {(() => {
                  const p = gridPitch;
                  const w = p * 10;
                  const h = p * 16;
                  const uRows = [3, 4, 5, 6, 7];
                  const lRows = [9, 10, 11, 12, 13];
                  return (
                    <pattern
                      id="breadboard-classic"
                      width={w}
                      height={h}
                      patternUnits="userSpaceOnUse"
                      patternTransform={`translate(${pan.x}, ${pan.y}) scale(${canvasZoom})`}
                    >
                      {/* Classic Ivory / White Polymer Base */}
                      <rect width={w} height={h} fill="#f8fafc" />
                      <path d={`M 0 ${h} L ${w} ${h}`} stroke="#cbd5e1" strokeWidth="1.5" />

                      {/* Top Red VCC (+) Power Rail */}
                      <line x1={0} y1={p * 0.5} x2={w} y2={p * 0.5} stroke="#dc2626" strokeWidth="1.8" />
                      <text x={8} y={p * 0.45} fill="#dc2626" fontSize="8" fontFamily="monospace" fontWeight="bold">+ VCC</text>

                      {/* Top Blue GND (-) Power Rail */}
                      <line x1={0} y1={p * 1.5} x2={w} y2={p * 1.5} stroke="#2563eb" strokeWidth="1.8" />
                      <text x={8} y={p * 1.45} fill="#2563eb" fontSize="8" fontFamily="monospace" fontWeight="bold">- GND</text>

                      {/* Top Separator Groove */}
                      <line x1={0} y1={p * 2.1} x2={w} y2={p * 2.1} stroke="#cbd5e1" strokeWidth="1" strokeDasharray="4 2" />

                      {/* Column Coordinates */}
                      <text x={0.5 * p} y={p * 2.75} textAnchor="middle" fill="#475569" fontSize="7.5" fontFamily="monospace" fontWeight="bold">1</text>
                      <text x={4.5 * p} y={p * 2.75} textAnchor="middle" fill="#475569" fontSize="7.5" fontFamily="monospace" fontWeight="bold">5</text>
                      <text x={9.5 * p} y={p * 2.75} textAnchor="middle" fill="#475569" fontSize="7.5" fontFamily="monospace" fontWeight="bold">10</text>

                      {/* Row Letters a-e */}
                      {["a", "b", "c", "d", "e"].map((ltr, i) => (
                        <text key={`bb-cls-u-${ltr}`} x={3} y={(uRows[i] + 0.5) * p + 2.5} fill="#475569" fontSize="7" fontFamily="monospace" fontWeight="bold">
                          {ltr}
                        </text>
                      ))}

                      {/* Central DIP IC Trough Groove */}
                      <rect x={0} y={p * 8} width={w} height={p} fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1" />
                      <line x1={0} y1={p * 8.5} x2={w} y2={p * 8.5} stroke="#94a3b8" strokeWidth="1.2" strokeDasharray="6 4" />
                      <text x={w / 2} y={p * 8.5 + 2.5} textAnchor="middle" fill="#64748b" fontSize="6.5" fontFamily="monospace" letterSpacing="2">
                        DIP IC TROUGH
                      </text>

                      {/* Row Letters f-j */}
                      {["f", "g", "h", "i", "j"].map((ltr, i) => (
                        <text key={`bb-cls-l-${ltr}`} x={3} y={(lRows[i] + 0.5) * p + 2.5} fill="#475569" fontSize="7" fontFamily="monospace" fontWeight="bold">
                          {ltr}
                        </text>
                      ))}

                      {/* Bottom Power Rails */}
                      <line x1={0} y1={p * 14.5} x2={w} y2={p * 14.5} stroke="#2563eb" strokeWidth="1.8" />
                      <text x={8} y={p * 14.45} fill="#2563eb" fontSize="8" fontFamily="monospace" fontWeight="bold">- GND</text>
                      <line x1={0} y1={p * 15.5} x2={w} y2={p * 15.5} stroke="#dc2626" strokeWidth="1.8" />
                      <text x={8} y={p * 15.45} fill="#dc2626" fontSize="8" fontFamily="monospace" fontWeight="bold">+ VCC</text>

                      {/* Sockets and 5-hole Conductive Tie-Strips */}
                      {Array.from({ length: 10 }).map((_, c) => {
                        const cx = (c + 0.5) * p;
                        return (
                          <g key={`bb-cls-c-${c}`}>
                            {/* Upper 5-pin vertical tie strip */}
                            <rect x={cx - 1.5} y={(uRows[0] + 0.1) * p} width="3" height={(uRows.length - 0.2) * p} rx="1.5" fill="rgba(203, 213, 225, 0.6)" />
                            {/* Lower 5-pin vertical tie strip */}
                            <rect x={cx - 1.5} y={(lRows[0] + 0.1) * p} width="3" height={(lRows.length - 0.2) * p} rx="1.5" fill="rgba(203, 213, 225, 0.6)" />

                            {/* Power Rail Sockets Row 0 & 1 */}
                            <g transform={`translate(${cx}, ${p * 0.5})`}>
                              <rect x="-3.2" y="-3.2" width="6.4" height="6.4" rx="1.5" fill="#0f172a" stroke="#94a3b8" strokeWidth="0.8" />
                              <line x1="-1.2" y1="-2" x2="-1.2" y2="2" stroke="#cbd5e1" strokeWidth="0.8" />
                              <line x1="1.2" y1="-2" x2="1.2" y2="2" stroke="#cbd5e1" strokeWidth="0.8" />
                              <circle cx="0" cy="0" r="0.75" fill="#475569" />
                            </g>
                            <g transform={`translate(${cx}, ${p * 1.5})`}>
                              <rect x="-3.2" y="-3.2" width="6.4" height="6.4" rx="1.5" fill="#0f172a" stroke="#94a3b8" strokeWidth="0.8" />
                              <line x1="-1.2" y1="-2" x2="-1.2" y2="2" stroke="#cbd5e1" strokeWidth="0.8" />
                              <line x1="1.2" y1="-2" x2="1.2" y2="2" stroke="#cbd5e1" strokeWidth="0.8" />
                              <circle cx="0" cy="0" r="0.75" fill="#475569" />
                            </g>

                            {/* Upper Terminal Sockets a-e */}
                            {uRows.map((r) => (
                              <g key={`bb-cls-u-${c}-${r}`} transform={`translate(${cx}, ${(r + 0.5) * p})`}>
                                <rect x="-3.2" y="-3.2" width="6.4" height="6.4" rx="1.5" fill="#0f172a" stroke="#94a3b8" strokeWidth="0.8" />
                                <line x1="-1.2" y1="-2" x2="-1.2" y2="2" stroke="#cbd5e1" strokeWidth="0.8" />
                                <line x1="1.2" y1="-2" x2="1.2" y2="2" stroke="#cbd5e1" strokeWidth="0.8" />
                                <circle cx="0" cy="0" r="0.75" fill="#475569" />
                              </g>
                            ))}

                            {/* Lower Terminal Sockets f-j */}
                            {lRows.map((r) => (
                              <g key={`bb-cls-l-${c}-${r}`} transform={`translate(${cx}, ${(r + 0.5) * p})`}>
                                <rect x="-3.2" y="-3.2" width="6.4" height="6.4" rx="1.5" fill="#0f172a" stroke="#94a3b8" strokeWidth="0.8" />
                                <line x1="-1.2" y1="-2" x2="-1.2" y2="2" stroke="#cbd5e1" strokeWidth="0.8" />
                                <line x1="1.2" y1="-2" x2="1.2" y2="2" stroke="#cbd5e1" strokeWidth="0.8" />
                                <circle cx="0" cy="0" r="0.75" fill="#475569" />
                              </g>
                            ))}

                            {/* Power Rail Sockets Row 14 & 15 */}
                            <g transform={`translate(${cx}, ${p * 14.5})`}>
                              <rect x="-3.2" y="-3.2" width="6.4" height="6.4" rx="1.5" fill="#0f172a" stroke="#94a3b8" strokeWidth="0.8" />
                              <line x1="-1.2" y1="-2" x2="-1.2" y2="2" stroke="#cbd5e1" strokeWidth="0.8" />
                              <line x1="1.2" y1="-2" x2="1.2" y2="2" stroke="#cbd5e1" strokeWidth="0.8" />
                              <circle cx="0" cy="0" r="0.75" fill="#475569" />
                            </g>
                            <g transform={`translate(${cx}, ${p * 15.5})`}>
                              <rect x="-3.2" y="-3.2" width="6.4" height="6.4" rx="1.5" fill="#0f172a" stroke="#94a3b8" strokeWidth="0.8" />
                              <line x1="-1.2" y1="-2" x2="-1.2" y2="2" stroke="#cbd5e1" strokeWidth="0.8" />
                              <line x1="1.2" y1="-2" x2="1.2" y2="2" stroke="#cbd5e1" strokeWidth="0.8" />
                              <circle cx="0" cy="0" r="0.75" fill="#475569" />
                            </g>
                          </g>
                        );
                      })}
                    </pattern>
                  );
                })()}

                {/* 3. CAD Engineering Grid Pattern */}
                <pattern
                  id="cad-grid"
                  width={gridPitch * 5}
                  height={gridPitch * 5}
                  patternUnits="userSpaceOnUse"
                  patternTransform={`translate(${pan.x}, ${pan.y}) scale(${canvasZoom})`}
                >
                  {Array.from({ length: 5 }).map((_, i) => (
                    <React.Fragment key={`cad-minor-${i}`}>
                      <line
                        x1={i * gridPitch}
                        y1={0}
                        x2={i * gridPitch}
                        y2={gridPitch * 5}
                        stroke={activeCanvasTheme.gridMinor}
                        strokeWidth="1"
                      />
                      <line
                        x1={0}
                        y1={i * gridPitch}
                        x2={gridPitch * 5}
                        y2={i * gridPitch}
                        stroke={activeCanvasTheme.gridMinor}
                        strokeWidth="1"
                      />
                    </React.Fragment>
                  ))}
                  <path
                    d={`M ${gridPitch * 5} 0 L 0 0 0 ${gridPitch * 5}`}
                    fill="none"
                    stroke={activeCanvasTheme.gridMajor}
                    strokeWidth="1.5"
                  />
                  <circle cx={gridPitch * 5} cy={gridPitch * 5} r="1.5" fill={activeCanvasTheme.dots} opacity={activeCanvasTheme.isLight ? 0.75 : 0.45} />
                </pattern>

                {/* 4. Minimalist Dots Pattern */}
                <pattern
                  id="dots-grid"
                  width={gridPitch}
                  height={gridPitch}
                  patternUnits="userSpaceOnUse"
                  patternTransform={`translate(${pan.x}, ${pan.y}) scale(${canvasZoom})`}
                >
                  <circle cx={gridPitch} cy={gridPitch} r="1.3" fill={activeCanvasTheme.dots} />
                </pattern>
              </defs>
              <rect
                width="100%"
                height="100%"
                fill={
                  gridVisualMode === "breadboard-classic"
                    ? "#f8fafc"
                    : gridVisualMode === "breadboard"
                    ? (activeCanvasTheme.isLight ? "#e2e8f0" : activeCanvasTheme.breadboardBase || "#090e1a")
                    : activeCanvasTheme.bg
                }
              />
              <rect
                width="100%"
                height="100%"
                fill={`url(#${
                  gridVisualMode === "breadboard"
                    ? "breadboard-grid"
                    : gridVisualMode === "breadboard-classic"
                    ? "breadboard-classic"
                    : gridVisualMode === "cad"
                    ? "cad-grid"
                    : "dots-grid"
                })`}
              />

              <g transform={`translate(${pan.x},${pan.y}) scale(${canvasZoom})`}>
                {/* Wires */}
                {wires.map((w) => {
                  const fromDir = w.from.dir || "out";
                  const toDir = w.to.dir || "in";
                  const from = getPortPos(w.from.node, w.from.port, fromDir);
                  const to = getPortPos(w.to.node, w.to.port, toDir);
                  if (!from || !to) return null;
                  const dxFrom = fromDir === "out" ? 55 : -55;
                  const dxTo = toDir === "in" ? -55 : 55;
                  const d = `M ${from.x},${from.y} C ${from.x + dxFrom},${from.y} ${
                    to.x + dxTo
                  },${to.y} ${to.x},${to.y}`;
                  const fromVal = liveVals[w.from.node]?.[w.from.port] ?? 0;
                  const live = fromVal === 1 && isSimRunning;
                  const isHaltedWire = fromVal === -1;
                  const isSel = isWireSelected(w.id);
                  const probe = attachedProbes.find((p) => p.wireId === w.id);
                  const probePt = probe
                    ? getWirePointAt(w, probe.tPos ?? 0.5)
                    : null;
                  const probeSpec = probe
                    ? PROBE_CHANNELS.find((ch) => ch.channelId === probe.channelId)
                    : null;

                  const isVoltProbePlus =
                    (w.to.node &&
                      nodes.find((n) => n.id === w.to.node)?.type === "VOLTMETER" &&
                      w.to.port === 0) ||
                    (w.from.node &&
                      nodes.find((n) => n.id === w.from.node)?.type === "VOLTMETER" &&
                      w.from.port === 0);
                  const isVoltProbeMinus =
                    (w.to.node &&
                      nodes.find((n) => n.id === w.to.node)?.type === "VOLTMETER" &&
                      w.to.port === 1) ||
                    (w.from.node &&
                      nodes.find((n) => n.id === w.from.node)?.type === "VOLTMETER" &&
                      w.from.port === 1);

                  const fromNode = nodes.find((n) => n.id === w.from.node);
                  const toNode = nodes.find((n) => n.id === w.to.node);

                  const isGndWire =
                    fromNode?.type === "GND" ||
                    toNode?.type === "GND" ||
                    (fromNode?.type === "AC_SINE" && w.from.port === 1) ||
                    (toNode?.type === "AC_SINE" && w.to.port === 1);

                  const isAcPhaseWire =
                    (fromNode?.type === "AC_SINE" && w.from.port === 0) ||
                    (toNode?.type === "AC_SINE" && w.to.port === 0);

                  const wireFlow = wireFlowMap.get(w.id);
                  const isAnalogLive =
                    wireFlow?.signalState === "DC_ACTIVE" ||
                    wireFlow?.signalState === "AC_OSCILLATING";
                  const wireDashDurationSec = wireFlow?.dashDurationSec ?? 0.85;
                  const wireBeadDurationSec = wireFlow?.beadDurationSec ?? 0.98;
                  const isWireHovered = hoveredWireId === w.id;

                  // Visual Diagnostic Tool: Short Circuit & Floating Node Wire Detection
                  const isShortCircuitWire = circuitDiagnosticReport.shortCircuitWireIds.has(w.id);
                  const isFloatingNodeWire = circuitDiagnosticReport.floatingNodeWireIds.has(w.id);

                  return (
                    <g key={w.id}>
                      {isWireHovered && (
                        <path
                          d={d}
                          fill="none"
                          stroke="#38bdf8"
                          strokeWidth={7.5}
                          strokeOpacity={0.28}
                          strokeLinecap="round"
                          pointerEvents="none"
                        />
                      )}
                      {/* Visual Diagnostic Tool: Short Circuit Glowing Pulsing Red Halo */}
                      {isShortCircuitWire && (
                        <g className="diagnostic-short-glow pointer-events-none">
                          <path
                            d={d}
                            fill="none"
                            stroke="#ef4444"
                            strokeWidth={9}
                            strokeOpacity={0.65}
                            strokeLinecap="round"
                            className="wire-short-circuit-pulse"
                            filter="drop-shadow(0 0 14px #ef4444) drop-shadow(0 0 6px #dc2626)"
                          />
                          <path
                            d={d}
                            fill="none"
                            stroke="#fecaca"
                            strokeWidth={3.5}
                            strokeDasharray="8 6"
                            strokeLinecap="round"
                            className={
                              !prefersReducedMotion && isPageVisible && isSimRunning
                                ? "wire-short-circuit-dash"
                                : ""
                            }
                            style={
                              {
                                "--wire-flow-dur": `${wireDashDurationSec.toFixed(2)}s`,
                              } as React.CSSProperties
                            }
                          />
                          {(() => {
                            const midPt = getWirePointAt(w, 0.5);
                            if (!midPt) return null;
                            return (
                              <g transform={`translate(${midPt.x}, ${midPt.y})`}>
                                <circle r="8.5" fill="#ef4444" stroke="#ffffff" strokeWidth="1.5" filter="drop-shadow(0 0 6px #ef4444)" />
                                <text x="0" y="3.5" fill="#ffffff" fontSize="9.5" fontWeight="bold" textAnchor="middle" fontFamily="monospace">⚡</text>
                              </g>
                            );
                          })()}
                        </g>
                      )}

                      {/* Visual Diagnostic Tool: Floating Node Glowing Pulsing Amber Halo */}
                      {isFloatingNodeWire && !isShortCircuitWire && (
                        <g className="diagnostic-floating-glow pointer-events-none">
                          <path
                            d={d}
                            fill="none"
                            stroke="#f59e0b"
                            strokeWidth={8}
                            strokeOpacity={0.6}
                            strokeLinecap="round"
                            className="wire-floating-node-pulse"
                            filter="drop-shadow(0 0 12px #f59e0b) drop-shadow(0 0 5px #d97706)"
                          />
                          <path
                            d={d}
                            fill="none"
                            stroke="#fef3c7"
                            strokeWidth={3}
                            strokeDasharray="6 6"
                            strokeLinecap="round"
                            className="wire-floating-node-dash"
                          />
                          {(() => {
                            const midPt = getWirePointAt(w, 0.5);
                            if (!midPt) return null;
                            return (
                              <g transform={`translate(${midPt.x}, ${midPt.y})`}>
                                <circle r="8" fill="#f59e0b" stroke="#ffffff" strokeWidth="1.5" filter="drop-shadow(0 0 5px #f59e0b)" />
                                <text x="0" y="3" fill="#ffffff" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="monospace">?</text>
                              </g>
                            );
                          })()}
                        </g>
                      )}

                      {/* Base Wire Trace */}
                      {isShortCircuitWire ? (
                        <path
                          d={d}
                          fill="none"
                          stroke="#ef4444"
                          strokeWidth={isSel ? 4.5 : 3.2}
                          strokeLinecap="round"
                          filter={
                            isSel
                              ? "drop-shadow(0 0 10px #ef4444)"
                              : "drop-shadow(0 0 6px #ef4444)"
                          }
                        />
                      ) : isFloatingNodeWire ? (
                        <path
                          d={d}
                          fill="none"
                          stroke="#f59e0b"
                          strokeWidth={isSel ? 4.2 : 2.8}
                          strokeLinecap="round"
                          strokeDasharray="6 4"
                          filter={
                            isSel
                              ? "drop-shadow(0 0 8px #f59e0b)"
                              : "drop-shadow(0 0 5px #f59e0b)"
                          }
                        />
                      ) : w.isVirtualInstrumentWire && w.color ? (
                        <g>
                          <path
                            d={d}
                            fill="none"
                            stroke={w.color}
                            strokeWidth={isSel ? 4.2 : 2.8}
                            strokeDasharray="7 3"
                            strokeLinecap="round"
                            filter={`drop-shadow(0 0 5px ${w.color})`}
                          />
                          {w.virtualTag && (() => {
                            const midPt = getWirePointAt(w, 0.5);
                            if (!midPt) return null;
                            const tagW = Math.max(36, w.virtualTag.length * 6 + 10);
                            return (
                              <g transform={`translate(${midPt.x}, ${midPt.y})`} className="pointer-events-none select-none">
                                <rect
                                  x={-tagW / 2}
                                  y={-8}
                                  width={tagW}
                                  height={16}
                                  rx={4}
                                  fill="#060b16"
                                  stroke={w.color}
                                  strokeWidth={1.2}
                                />
                                <text
                                  x={0}
                                  y={3}
                                  textAnchor="middle"
                                  fill={w.color}
                                  fontSize="8"
                                  fontFamily="monospace"
                                  fontWeight="bold"
                                >
                                  {w.virtualTag}
                                </text>
                              </g>
                            );
                          })()}
                        </g>
                      ) : isVoltProbePlus ? (
                        <path
                          d={d}
                          fill="none"
                          stroke="#ef4444"
                          strokeWidth={isSel ? 3.6 : 2.6}
                          strokeLinecap="round"
                          filter={
                            isSel
                              ? "drop-shadow(0 0 6px #ef4444)"
                              : "drop-shadow(0 0 3px rgba(239, 68, 68, 0.45))"
                          }
                        />
                      ) : isVoltProbeMinus ? (
                        <path
                          d={d}
                          fill="none"
                          stroke="#64748b"
                          strokeWidth={isSel ? 3.6 : 2.6}
                          strokeDasharray="6 3"
                          strokeLinecap="round"
                          filter={isSel ? "drop-shadow(0 0 6px #94a3b8)" : undefined}
                        />
                      ) : isGndWire ? (
                        <>
                          <path
                            d={d}
                            fill="none"
                            stroke="#0f172a"
                            strokeWidth={isSel ? 4.5 : 3.2}
                            strokeLinecap="round"
                            filter={isSel ? "drop-shadow(0 0 6px #38bdf8)" : undefined}
                          />
                          <path
                            d={d}
                            fill="none"
                            stroke="#64748b"
                            strokeWidth={1.5}
                            strokeDasharray="6 4"
                            strokeLinecap="round"
                          />
                        </>
                      ) : isAcPhaseWire ? (
                        <path
                          d={d}
                          fill="none"
                          stroke="#ef4444"
                          strokeWidth={isSel ? 4.2 : 3}
                          strokeLinecap="round"
                          filter={
                            isSel
                              ? "drop-shadow(0 0 6px #ef4444)"
                              : "drop-shadow(0 0 4px rgba(239, 68, 68, 0.5))"
                          }
                        />
                      ) : isAnalogLive ? (
                        <path
                          d={d}
                          fill="none"
                          stroke="#10b981"
                          strokeWidth={isSel ? 3.8 : 2.6}
                          strokeLinecap="round"
                          filter={
                            isSel
                              ? "drop-shadow(0 0 6px #10b981)"
                              : "drop-shadow(0 0 3px rgba(16, 185, 129, 0.45))"
                          }
                        />
                      ) : (
                        <path
                          d={d}
                          className={`wire ${live ? "on" : ""} ${
                            isHaltedWire ? "halted" : ""
                          } ${isSel ? "sel" : ""}`}
                        />
                      )}

                      {/* SPICE-Driven Dynamic Signal Propagation Pulse Dashes & Particle Bead */}
                      {isSimRunning &&
                        wireFlow &&
                        wireFlow.isAnimated &&
                        wireFlow.signalState !== "SHORT_CIRCUIT" && (
                        <>
                          <path
                            d={d}
                            fill="none"
                            stroke={wireFlow.strokeColor}
                            strokeWidth={wireFlow.strokeWidth}
                            strokeOpacity={wireFlow.strokeOpacity}
                            strokeDasharray="8 6"
                            strokeLinecap="round"
                            className={
                              !prefersReducedMotion && isPageVisible
                                ? wireFlow.direction === "reverse"
                                  ? "wire-flowing-pulse-rev"
                                  : "wire-flowing-pulse"
                                : ""
                            }
                            style={
                              {
                                "--wire-flow-dur": `${wireDashDurationSec.toFixed(2)}s`,
                                "--wire-glow-color": wireFlow.glowColor,
                                animationDuration: `${wireDashDurationSec.toFixed(2)}s`,
                              } as React.CSSProperties
                            }
                            pointerEvents="none"
                          />
                          {/* Animated Electric Particle Bead */}
                          {!prefersReducedMotion && isPageVisible && wireFlow.showBead && (
                            <circle
                              r="4.2"
                              fill="#ffffff"
                              filter={`drop-shadow(0 0 6px ${wireFlow.glowColor})`}
                              pointerEvents="none"
                            >
                              <animateMotion
                                key={`bead-${w.id}-${wireFlow.direction}-${wireBeadDurationSec.toFixed(2)}`}
                                path={d}
                                dur={`${wireBeadDurationSec.toFixed(2)}s`}
                                repeatCount="indefinite"
                                keyPoints={wireFlow.direction === "reverse" ? "1;0" : "0;1"}
                                keyTimes="0;1"
                              />
                            </circle>
                          )}
                        </>
                      )}

                      {/* Real-Time Signal Trace Visualizer: Flowing Current Particles & Neon Path Glow */}
                      {isSimRunning && tracedSignalNet && tracedSignalNet.tracedWireIds.has(w.id) && (() => {
                        const traceFwd = wireFlow
                          ? wireFlow.direction === "forward"
                          : tracedSignalNet.wireDirections.get(w.id) ?? true;
                        const traceDashDur = Math.max(
                          0.1,
                          wireDashDurationSec / Math.max(0.25, signalTraceSpeed)
                        );
                        const traceBeadDur = Math.max(
                          0.16,
                          (wireDashDurationSec * 1.25) / Math.max(0.25, signalTraceSpeed)
                        );
                        return (
                        <g className="signal-trace-wire pointer-events-none">
                          {/* Ambient cyan glow halo along wire */}
                          <path
                            d={d}
                            fill="none"
                            stroke="#06b6d4"
                            strokeWidth={7.5}
                            strokeOpacity={0.35}
                            strokeLinecap="round"
                            filter="drop-shadow(0 0 10px #06b6d4)"
                          />
                          {/* Vibrant primary pulsating trace line (SPICE-velocity synced) */}
                          <path
                            d={d}
                            fill="none"
                            stroke="#22d3ee"
                            strokeWidth={3.8}
                            strokeDasharray="8 6"
                            strokeLinecap="round"
                            className={
                              !prefersReducedMotion && isPageVisible
                                ? !traceFwd
                                  ? "wire-flowing-pulse-rev"
                                  : "wire-flowing-pulse"
                                : ""
                            }
                            style={
                              {
                                "--wire-flow-dur": `${traceDashDur.toFixed(2)}s`,
                                "--wire-glow-color": "#22d3ee",
                                animationDuration: `${traceDashDur.toFixed(2)}s`,
                              } as React.CSSProperties
                            }
                            filter="drop-shadow(0 0 8px #22d3ee)"
                          />
                          {/* Real-time Connection Junction Rings at Terminal Ports */}
                          <g>
                            <circle cx={from.x} cy={from.y} r={4.5} fill="#ffffff" stroke="#06b6d4" strokeWidth={1.8} filter="drop-shadow(0 0 6px #22d3ee)" />
                            <circle cx={to.x} cy={to.y} r={4.5} fill="#ffffff" stroke="#06b6d4" strokeWidth={1.8} filter="drop-shadow(0 0 6px #22d3ee)" />
                          </g>
                          {/* Animated Electric Current Particle Stream (Flowing in direction of real-time SPICE current) */}
                          {!prefersReducedMotion && isPageVisible && [0, 0.2, 0.4, 0.6, 0.8].map((offsetSec, pIdx) => {
                            const dur = `${traceBeadDur.toFixed(2)}s`;
                            return (
                              <g key={`trace-particle-${w.id}-${pIdx}`}>
                                {/* Outer luminous photon halo */}
                                <circle
                                  r={6.5}
                                  fill="#22d3ee"
                                  opacity={0.65}
                                  filter="drop-shadow(0 0 6px #06b6d4)"
                                >
                                  <animateMotion
                                    key={`thalo-${w.id}-${pIdx}-${traceFwd ? "f" : "r"}-${dur}`}
                                    path={d}
                                    dur={dur}
                                    begin={`${(-offsetSec * traceBeadDur).toFixed(2)}s`}
                                    repeatCount="indefinite"
                                    keyPoints={traceFwd ? "0;1" : "1;0"}
                                    keyTimes="0;1"
                                  />
                                </circle>
                                {/* Core energetic electron */}
                                <circle
                                  r={3.8}
                                  fill="#ffffff"
                                  stroke="#0891b2"
                                  strokeWidth={1.5}
                                  filter="drop-shadow(0 0 8px #ffffff)"
                                >
                                  <animateMotion
                                    key={`tcore-${w.id}-${pIdx}-${traceFwd ? "f" : "r"}-${dur}`}
                                    path={d}
                                    dur={dur}
                                    begin={`${(-offsetSec * traceBeadDur).toFixed(2)}s`}
                                    repeatCount="indefinite"
                                    keyPoints={traceFwd ? "0;1" : "1;0"}
                                    keyTimes="0;1"
                                  />
                                </circle>
                              </g>
                            );
                          })}
                        </g>
                        );
                      })()}

                      {/* Interactive Wire Hit Target */}
                      <path
                        d={d}
                        className="wire-hit"
                        onPointerEnter={() => setHoveredWireId(w.id)}
                        onPointerLeave={() =>
                          setHoveredWireId((cur) => (cur === w.id ? null : cur))
                        }
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = "copy";
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const rawData = e.dataTransfer.getData("text/plain");
                          if (rawData && rawData.startsWith("PROBE:")) {
                            const chId = rawData.replace("PROBE:", "") as any;
                            attachProbeToWire(chId, w.id);
                          }
                        }}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          if (probe) {
                            setIsProbePopupOpen(true);
                          }
                        }}
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          if (
                            pendingWire &&
                            nodes.find((n) => n.id === pendingWire.node)?.type === "VOLTMETER"
                          ) {
                            const vNodeId = pendingWire.node;
                            const vPort = pendingWire.port;
                            const nextWires: CircuitWire[] = [
                              ...wires.filter(
                                (item) =>
                                  !(item.to.node === vNodeId && item.to.port === vPort)
                              ),
                              {
                                id: idCounterRef.current++,
                                from: {
                                  node: w.from.node,
                                  port: w.from.port,
                                  dir: w.from.dir || "out",
                                },
                                to: { node: vNodeId, port: vPort, dir: "in" },
                              },
                            ];
                            const { updatedNodes, outs } = evaluateCircuit(nodes, nextWires);
                            setWires(nextWires);
                            setNodes(updatedNodes);
                            pushWaveformSnapshot(updatedNodes, outs);
                            setPendingWire(null);
                            return;
                          }
                          if (activeProbeTool) {
                            attachProbeToWire(activeProbeTool, w.id);
                          } else {
                            if (e.shiftKey) {
                              setSelectedWireIds((prev) =>
                                prev.includes(w.id)
                                  ? prev.filter((id) => id !== w.id)
                                  : [...prev, w.id]
                              );
                            } else {
                              setSelected({ type: "wire", id: w.id });
                              setSelectedWireIds([w.id]);
                              setSelectedNodeIds([]);
                            }
                            setPendingWire(null);
                          }
                        }}
                      />

                      {/* Attached Virtual Oscilloscope Wire Probe Clip */}
                      {probe && probePt && probeSpec && (() => {
                        const probedSig = probedWireSignals.find(
                          (ps) => ps.channelId === probe.channelId
                        );
                        const clipLogic =
                          probedSig?.logicState ??
                          (isHaltedWire || isFloatingNodeWire
                            ? "Z"
                            : live
                            ? "HIGH"
                            : "LOW");
                        const clipValueLabel =
                          clipLogic === "Z"
                            ? "High-Z (Z)"
                            : probedSig?.waveformType === "AC_SINE" &&
                              probedSig.rmsVoltage !== undefined
                            ? `${probedSig.rmsVoltage.toFixed(2)}Vrms · ${clipLogic}`
                            : probedSig
                            ? `${probedSig.currentVoltage.toFixed(2)}V · ${clipLogic}`
                            : live
                            ? "5.00V · HIGH"
                            : "0.00V · LOW";
                        return (
                          <SvgWireProbeClip
                            x={probePt.x}
                            y={probePt.y}
                            channelId={probe.channelId}
                            color={probeSpec.color}
                            netLabel={`W#${w.id}`}
                            valueLabel={clipValueLabel}
                            logicState={clipLogic}
                            isHighlighted={hoveredProbeChannel === probe.channelId}
                            onHoverChange={(hovered) =>
                              setHoveredProbeChannel(hovered ? probe.channelId : null)
                            }
                            onRemove={() => {
                              setAttachedProbes((prev) =>
                                prev.filter((p) => p.channelId !== probe.channelId)
                              );
                            }}
                            onOpenPopup={() => setIsProbePopupOpen(true)}
                          />
                        );
                      })()}
                    </g>
                  );
                })}

                {/* Pending Wire Preview */}
                {pendingWire &&
                  mouseWorld &&
                  (() => {
                    const p = getPortPos(
                      pendingWire.node,
                      pendingWire.port,
                      pendingWire.dir
                    );
                    if (!p) return null;
                    const d =
                      pendingWire.dir === "out"
                        ? `M ${p.x},${p.y} C ${p.x + 55},${p.y} ${
                            mouseWorld.x - 55
                          },${mouseWorld.y} ${mouseWorld.x},${mouseWorld.y}`
                        : `M ${mouseWorld.x},${mouseWorld.y} C ${
                            mouseWorld.x + 55
                          },${mouseWorld.y} ${p.x - 55},${p.y} ${p.x},${p.y}`;
                    return <path d={d} className="wire preview" />;
                  })()}

                {/* Real-Time Signal Trace: Node Boundary Glowing Auras & Source Badge */}
                {tracedSignalNet &&
                  nodes.map((n) => {
                    if (!tracedSignalNet.tracedNodeIds.has(n.id)) return null;
                    const isSource = tracedSignalNet.rootNodeId === n.id;
                    const compSpec = COMP_SPECS[n.type];
                    const gateSpec = GATE_SPECS[n.type];
                    const nodeW = compSpec ? compSpec.w : gateSpec ? gateSpec.outX : 64;
                    const nodeH = compSpec ? compSpec.h : gateSpec ? 50 : 60;
                    const center = getNodeCenter(n);
                    const rotTransform = n.rotation
                      ? `rotate(${n.rotation}, ${center.cx}, ${center.cy})`
                      : undefined;
                    return (
                      <g
                        key={`trace-aura-${n.id}`}
                        transform={rotTransform}
                        className="pointer-events-none select-none"
                      >
                        {/* Glowing node boundary aura */}
                        <rect
                          x={n.x - 7}
                          y={n.y - 7}
                          width={nodeW + 14}
                          height={nodeH + 14}
                          rx={12}
                          fill={isSource ? "rgba(245, 158, 11, 0.16)" : "rgba(6, 182, 212, 0.14)"}
                          stroke={isSource ? "#f59e0b" : "#06b6d4"}
                          strokeWidth={isSource ? 2.5 : 2}
                          strokeDasharray={isSource ? "none" : "5 3"}
                          filter={
                            isSource
                              ? "drop-shadow(0 0 10px rgba(245, 158, 11, 0.7))"
                              : "drop-shadow(0 0 8px rgba(6, 182, 212, 0.55))"
                          }
                          className="animate-pulse"
                        />
                        {/* Callout badge on trace source or connected node */}
                        {isSource ? (
                          <g transform={`translate(${n.x + nodeW / 2}, ${n.y - 14})`}>
                            <rect
                              x={-46}
                              y={-10}
                              width={92}
                              height={18}
                              rx={4}
                              fill="#0b1320"
                              stroke="#f59e0b"
                              strokeWidth={1.4}
                              filter="drop-shadow(0 0 6px rgba(245, 158, 11, 0.6))"
                            />
                            <text
                              x={0}
                              y={2.5}
                              textAnchor="middle"
                              fill="#fde68a"
                              fontSize="8.5"
                              fontFamily="monospace"
                              fontWeight="bold"
                            >
                              ⚡ TRACE ORIGIN
                            </text>
                          </g>
                        ) : (
                          <g transform={`translate(${n.x + nodeW / 2}, ${n.y - 12})`}>
                            <rect
                              x={-36}
                              y={-8}
                              width={72}
                              height={16}
                              rx={4}
                              fill="#090d16"
                              stroke="#06b6d4"
                              strokeWidth={1}
                              filter="drop-shadow(0 0 4px rgba(6, 182, 212, 0.4))"
                            />
                            <text
                              x={0}
                              y={3.5}
                              textAnchor="middle"
                              fill="#67e8f9"
                              fontSize="8"
                              fontFamily="monospace"
                              fontWeight="bold"
                            >
                              CONNECTED
                            </text>
                          </g>
                        )}
                      </g>
                    );
                  })}

                {/* Oscilloscope & Logic Analyzer Capture Glowing Pulse Indicators */}
                {capturedNodeInstrumentsMap.size > 0 &&
                  nodes.map((n) => {
                    const cap = capturedNodeInstrumentsMap.get(n.id);
                    if (!cap) return null;
                    const compSpec = COMP_SPECS[n.type];
                    const gateSpec = GATE_SPECS[n.type];
                    const nodeW =
                      n.type === "INPUT" || n.type === "OUTPUT"
                        ? 56
                        : compSpec
                        ? compSpec.w
                        : gateSpec?.outX || 75;
                    const nodeH =
                      n.type === "INPUT" || n.type === "OUTPUT"
                        ? 50
                        : compSpec
                        ? compSpec.h
                        : 50;
                    const center = getNodeCenter(n);
                    const rotTransform = n.rotation
                      ? `rotate(${n.rotation}, ${center.cx}, ${center.cy})`
                      : undefined;
                    const hasScope = cap.scopeChannels.length > 0;
                    const hasLa = cap.analyzerChannels.length > 0;
                    const hasPriorityLa = cap.analyzerChannels.some((c) => c <= 4);
                    const animatePulse = !prefersReducedMotion && isPageVisible;

                    const pulseClass = animatePulse
                      ? hasScope && hasLa
                        ? "instrument-capture-pulse-dual"
                        : hasScope
                        ? "instrument-capture-pulse-osc"
                        : "instrument-capture-pulse-la"
                      : "";

                    const strokeColor =
                      hasScope && hasLa
                        ? "#22d3ee"
                        : hasScope
                        ? "#fbbf24"
                        : "#38bdf8";
                    const fillTint =
                      hasScope && hasLa
                        ? "rgba(34, 211, 238, 0.12)"
                        : hasScope
                        ? "rgba(251, 191, 36, 0.11)"
                        : "rgba(56, 189, 248, 0.1)";

                    const scopeTag = hasScope ? `OSC ${cap.scopeChannels[0]}` : "";
                    const laTag = hasLa ? `LA CH${cap.analyzerChannels[0]}` : "";
                    const badgeLabel =
                      hasScope && hasLa
                        ? `${cap.scopeChannels[0]}·LA${cap.analyzerChannels[0]}`
                        : scopeTag || laTag;
                    const badgeWidth = Math.max(46, badgeLabel.length * 5.8 + 16);

                    return (
                      <g
                        key={`instrument-capture-aura-${n.id}`}
                        transform={rotTransform}
                        className="pointer-events-none select-none"
                      >
                        <rect
                          x={n.x - 6}
                          y={n.y - 6}
                          width={nodeW + 12}
                          height={nodeH + 12}
                          rx={13}
                          fill={fillTint}
                          stroke={strokeColor}
                          strokeWidth={hasScope || hasPriorityLa ? 2.1 : 1.5}
                          strokeDasharray={!hasScope && !hasPriorityLa ? "5 3" : undefined}
                          className={pulseClass}
                        />
                        {hasScope && hasLa && (
                          <rect
                            x={n.x - 3.5}
                            y={n.y - 3.5}
                            width={nodeW + 7}
                            height={nodeH + 7}
                            rx={11}
                            fill="none"
                            stroke="#fbbf24"
                            strokeWidth={1.3}
                            strokeDasharray="5 3"
                            opacity={0.85}
                          />
                        )}
                        <g transform={`translate(${n.x + nodeW / 2}, ${n.y + nodeH + 11})`}>
                          <rect
                            x={-badgeWidth / 2}
                            y={-7.5}
                            width={badgeWidth}
                            height={15}
                            rx={7.5}
                            fill="#070c17"
                            fillOpacity={0.94}
                            stroke={strokeColor}
                            strokeWidth={1.1}
                          />
                          <circle
                            cx={-badgeWidth / 2 + 7.5}
                            cy={0}
                            r={2.5}
                            fill={hasScope && !hasLa ? "#fbbf24" : strokeColor}
                            className={animatePulse ? "instrument-capture-dot" : ""}
                          />
                          <text
                            x={4}
                            y={2.7}
                            textAnchor="middle"
                            fill={hasScope && !hasLa ? "#fde68a" : "#bae6fd"}
                            fontSize="7.6"
                            fontFamily="monospace"
                            fontWeight="bold"
                          >
                            {badgeLabel}
                          </text>
                        </g>
                      </g>
                    );
                  })}

                {/* Nodes */}
                {nodes.map((n) => {
                  const val = liveVals[n.id]?.[0] ?? 0;
                  const center = getNodeCenter(n);
                  const rotTransform = n.rotation
                    ? `rotate(${n.rotation}, ${center.cx}, ${center.cy})`
                    : undefined;

                  if (n.type === "INPUT") {
                    const hi = (n.value ?? 0) === 1;
                    const isSel = isNodeSelected(n.id);
                    return (
                      <g
                        key={n.id}
                        transform={rotTransform}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          if (wasNodeDraggedRef.current) return;
                          setSelected({ type: "node", id: n.id });
                          setSelectedNodeIds([n.id]);
                          setIsPropertySidebarOpen(true);
                        }}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleRotateNode(n.id);
                        }}
                        onPointerDown={(e) => handleNodePointerDown(n.id, e)}
                        className="cursor-pointer"
                      >
                        {isSel && (
                          <rect
                            x={n.x - 3}
                            y={n.y - 3}
                            width={62}
                            height={56}
                            rx={13}
                            fill="none"
                            stroke="#22d3ee"
                            strokeWidth={2}
                            strokeDasharray="4 2"
                          />
                        )}
                        <rect
                          x={n.x}
                          y={n.y}
                          width={56}
                          height={50}
                          rx={11}
                          className={`io-box ${hi ? "hi" : "lo"}`}
                        />
                        <text
                          x={n.x + 28}
                          y={n.y + (n.analogParams?.formattedValue ? 26 : 32)}
                          className={`io-text ${hi ? "hi" : ""}`}
                        >
                          {hi ? "1" : "0"}
                        </text>
                        {n.analogParams?.formattedValue && (
                          <text
                            x={n.x + 28}
                            y={n.y + 40}
                            textAnchor="middle"
                            fill="#34d399"
                            fontFamily="monospace"
                            fontSize="8.5"
                            fontWeight="bold"
                          >
                            {n.analogParams.formattedValue}
                          </text>
                        )}
                        {n.label && (
                          <text
                            x={n.x + 28}
                            y={n.y - 6}
                            className="gate-label"
                          >
                            {n.label}
                          </text>
                        )}
                        <circle
                          cx={n.x + 56}
                          cy={n.y + 25}
                          r={5}
                          className={`port out ${hi ? "hi" : ""}`}
                        />
                        <circle
                          cx={n.x + 56}
                          cy={n.y + 25}
                          r={10}
                          className="port-hit"
                          onPointerDown={(e) =>
                            handlePortClick(n.id, 0, "out", e)
                          }
                        />
                      </g>
                    );
                  }

                  if (n.type === "OUTPUT") {
                    const isHaltedOutput = val === -1;
                    const hi = val === 1;
                    const isSel = isNodeSelected(n.id);
                    return (
                      <g
                        key={n.id}
                        transform={rotTransform}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          if (wasNodeDraggedRef.current) return;
                          setSelected({ type: "node", id: n.id });
                          setSelectedNodeIds([n.id]);
                          setIsPropertySidebarOpen(true);
                        }}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleRotateNode(n.id);
                        }}
                        onPointerDown={(e) => handleNodePointerDown(n.id, e)}
                        className="cursor-grab"
                      >
                        {isSel && (
                          <rect
                            x={n.x - 3}
                            y={n.y - 3}
                            width={62}
                            height={56}
                            rx={13}
                            fill="none"
                            stroke="#22d3ee"
                            strokeWidth={2}
                            strokeDasharray="4 2"
                          />
                        )}
                        <rect
                          x={n.x}
                          y={n.y}
                          width={56}
                          height={50}
                          rx={11}
                          className={`io-box ${
                            isHaltedOutput ? "halted" : hi ? "hi" : "lo"
                          }`}
                        />
                        {(() => {
                          const outFreqHz = getNodeSpiceFreqHz(n);
                          const canPulseOut =
                            isSimRunning &&
                            hi &&
                            outFreqHz > 0 &&
                            !prefersReducedMotion &&
                            isPageVisible;
                          const outDur = computeAnimDurStr(outFreqHz);
                          return (
                            <>
                              {canPulseOut && (
                                <circle
                                  cx={n.x + 28}
                                  cy={n.y + 25}
                                  r={17}
                                  fill="rgba(34, 197, 94, 0.28)"
                                  className="spice-led-halo pointer-events-none"
                                  style={{ "--spice-cycle-dur": outDur } as React.CSSProperties}
                                />
                              )}
                              <circle
                                cx={n.x + 28}
                                cy={n.y + 25}
                                r={13}
                                className={`led-dot ${
                                  isHaltedOutput ? "halted" : hi ? "hi" : "lo"
                                } ${canPulseOut ? "spice-led-pulse" : ""}`}
                                style={
                                  canPulseOut
                                    ? ({ "--spice-cycle-dur": outDur } as React.CSSProperties)
                                    : undefined
                                }
                              />
                            </>
                          );
                        })()}
                        <text
                          x={n.x + 28}
                          y={n.y + 31}
                          className={`io-text ${hi ? "hi" : ""}`}
                          fill={isHaltedOutput ? "#fbbf24" : undefined}
                        >
                          {isHaltedOutput ? "Z" : hi ? "1" : "0"}
                        </text>
                        {n.label && (
                          <text
                            x={n.x + 28}
                            y={n.y - 6}
                            className="gate-label"
                            fill={isHaltedOutput ? "#f59e0b" : undefined}
                          >
                            {n.label}
                            {isHaltedOutput ? " (Halted)" : ""}
                          </text>
                        )}
                        <circle
                          cx={n.x}
                          cy={n.y + 25}
                          r={5}
                          className={`port in ${
                            hi ? "hi" : ""
                          } ${isHaltedOutput ? "missing-pulse" : ""}`}
                        />
                        <circle
                          cx={n.x}
                          cy={n.y + 25}
                          r={10}
                          className="port-hit"
                          onPointerDown={(e) =>
                            handlePortClick(n.id, 0, "in", e)
                          }
                        />
                      </g>
                    );
                  }

                  const comp = COMP_SPECS[n.type];
                  if (comp) {
                    const isSel = isNodeSelected(n.id);
                    return (
                      <g
                        key={n.id}
                        transform={rotTransform}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          if (wasNodeDraggedRef.current) return;
                          setSelected({ type: "node", id: n.id });
                          setSelectedNodeIds([n.id]);
                          setIsPropertySidebarOpen(true);
                        }}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleRotateNode(n.id);
                        }}
                        onPointerDown={(e) => handleNodePointerDown(n.id, e)}
                        className="cursor-grab"
                      >
                        {isSel && (
                          <rect
                            x={n.x - 4}
                            y={n.y - 4}
                            width={comp.w + 8}
                            height={comp.h + 8}
                            rx={12}
                            fill="none"
                            stroke="#22d3ee"
                            strokeWidth={2}
                            strokeDasharray="4 2"
                          />
                        )}
                        {n.type === "7SEG" ? (
                          <>
                            <rect
                              x={n.x}
                              y={n.y}
                              width={comp.w}
                              height={comp.h}
                              rx={8}
                              fill="#0a0e18"
                              stroke="#4a6fa5"
                              strokeWidth={2}
                            />
                            <svg
                              x={n.x + 8}
                              y={n.y + 8}
                              width={comp.w - 16}
                              height={comp.h - 16}
                              viewBox="0 0 60 100"
                              preserveAspectRatio="xMidYMid meet"
                              className="pointer-events-none"
                            >
                              {(["a", "b", "c", "d", "e", "f", "g"] as const).map(
                                (segName, idx) => {
                                  const on =
                                    getInputVal(
                                      n.id,
                                      idx,
                                      liveVals,
                                      liveWireMap,
                                      0
                                    ) === 1;
                                  const [x1, y1, x2, y2] = SEG_LINES[segName];
                                  return (
                                    <line
                                      key={segName}
                                      x1={x1}
                                      y1={y1}
                                      x2={x2}
                                      y2={y2}
                                      strokeWidth={8}
                                      className={`seg ${on ? "on" : "off"}`}
                                    />
                                  );
                                }
                              )}
                            </svg>
                          </>
                        ) : n.type === "VOLTMETER" ? (
                          <>
                            {(() => {
                              const vData = getVoltmeterData(n);
                              const isAlert = vData.isSeriesBlocked;
                              if (componentViewMode === "SCHEMATIC") {
                                const cx = n.x + comp.w / 2;
                                const cy = n.y + comp.h / 2 - 4;
                                return (
                                  <g
                                    onDoubleClick={(e) => {
                                      e.stopPropagation();
                                      if (wasNodeDraggedRef.current) return;
                                      setPmeModalMeterType("VOLTMETER");
                                      setIsPmeModalOpen(true);
                                    }}
                                  >
                                    <line x1={n.x} y1={n.y + comp.inputs[0].y} x2={cx - 17} y2={cy} stroke={isAlert ? "#ef4444" : "#38bdf8"} strokeWidth={1.6} />
                                    <line x1={n.x} y1={n.y + comp.inputs[1].y} x2={cx - 17} y2={cy} stroke={isAlert ? "#ef4444" : "#94a3b8"} strokeWidth={1.6} />
                                    <circle cx={cx} cy={cy} r={17} fill="rgba(56,189,248,0.08)" stroke={isAlert ? "#ef4444" : "#38bdf8"} strokeWidth={2} />
                                    <text x={cx} y={cy + 2} textAnchor="middle" fill={isAlert ? "#f87171" : "#38bdf8"} fontFamily="monospace" fontSize="11" fontWeight="bold">V</text>
                                    <text x={cx} y={cy + 12} textAnchor="middle" fill={isAlert ? "#fca5a5" : "#e2e8f0"} fontFamily="monospace" fontSize="7.5" fontWeight="bold">
                                      {vData.displayStr}
                                    </text>
                                    <text x={cx} y={n.y + comp.h - 2} textAnchor="middle" fill={isAlert ? "#f87171" : "#64748b"} fontFamily="monospace" fontSize="6.8" fontWeight="bold">
                                      {isAlert ? "SERIES BLK" : "DVM 10MΩ"}
                                    </text>
                                  </g>
                                );
                              }
                              return (
                                <>
                                  <rect
                                    x={n.x}
                                    y={n.y}
                                    width={comp.w}
                                    height={comp.h}
                                    rx={6}
                                    fill="#090e1d"
                                    stroke={isAlert ? "#ef4444" : "#0284c7"}
                                    strokeWidth={isAlert ? 2 : 1.6}
                                  />
                                  <g
                                    className="cursor-pointer"
                                    onDoubleClick={(e) => {
                                      e.stopPropagation();
                                      if (wasNodeDraggedRef.current) return;
                                      setPmeModalMeterType("VOLTMETER");
                                      setIsPmeModalOpen(true);
                                    }}
                                  >
                                    <text x={n.x + 6} y={n.y + 11} fill={isAlert ? "#f87171" : "#38bdf8"} fontFamily="monospace" fontSize="7.5" fontWeight="bold">VOLT</text>
                                    <text x={n.x + comp.w - 6} y={n.y + 11} textAnchor="end" fill={isAlert ? "#fca5a5" : "#7dd3fc"} fontFamily="monospace" fontSize="6.5" fontWeight="bold">
                                      {isAlert ? "BLK" : "PAR"}
                                    </text>
                                  </g>
                                  <rect x={n.x + 6} y={n.y + 15} width={comp.w - 12} height={24} rx={3} fill="#020617" stroke={isAlert ? "#7f1d1d" : "#1e293b"} />
                                  <text x={n.x + comp.w / 2} y={n.y + 31} textAnchor="middle" fill={isAlert ? "#ef4444" : vData.isConnected ? "#38bdf8" : "#64748b"} fontFamily="monospace" fontSize="11" fontWeight="bold">
                                    {vData.displayStr}
                                  </text>
                                  <text x={n.x + comp.w / 2} y={n.y + comp.h - 5} textAnchor="middle" fill={isAlert ? "#fca5a5" : vData.isAcross ? "#22c55e" : "#94a3b8"} fontFamily="monospace" fontSize="6.5" fontWeight="bold">
                                    {isAlert ? "REWIRE PARALLEL" : vData.isAcross ? "ACROSS LOAD" : "10MΩ DVM"}
                                  </text>
                                </>
                              );
                            })()}
                          </>
                        ) : n.type === "AMMETER" ? (
                          <>
                            {(() => {
                              const aData = getAmmeterData(n);
                              const isAlert = aData.isShortCircuit;
                              if (componentViewMode === "SCHEMATIC") {
                                const cx = n.x + comp.w / 2;
                                const cy = n.y + comp.h / 2 - 4;
                                return (
                                  <g
                                    onDoubleClick={(e) => {
                                      e.stopPropagation();
                                      if (wasNodeDraggedRef.current) return;
                                      setPmeModalMeterType("AMMETER");
                                      setIsPmeModalOpen(true);
                                    }}
                                  >
                                    <line x1={n.x} y1={n.y + comp.inputs[0].y} x2={cx - 17} y2={cy} stroke={isAlert ? "#ef4444" : "#10b981"} strokeWidth={1.8} />
                                    <line x1={cx + 17} y1={cy} x2={n.x + comp.w} y2={n.y + comp.outputs[0].y} stroke={isAlert ? "#ef4444" : "#10b981"} strokeWidth={1.8} />
                                    <circle cx={cx} cy={cy} r={17} fill="rgba(16,185,129,0.08)" stroke={isAlert ? "#ef4444" : "#10b981"} strokeWidth={2} />
                                    <text x={cx} y={cy + 2} textAnchor="middle" fill={isAlert ? "#f87171" : "#34d399"} fontFamily="monospace" fontSize="11" fontWeight="bold">A</text>
                                    <text x={cx} y={cy + 12} textAnchor="middle" fill={isAlert ? "#fca5a5" : "#e2e8f0"} fontFamily="monospace" fontSize="7" fontWeight="bold">
                                      {aData.displayStr}
                                    </text>
                                    <text x={cx} y={n.y + comp.h - 2} textAnchor="middle" fill={isAlert ? "#f87171" : "#64748b"} fontFamily="monospace" fontSize="6.8" fontWeight="bold">
                                      {isAlert ? "SHORT CKT" : "SERIES A"}
                                    </text>
                                  </g>
                                );
                              }
                              return (
                                <>
                                  <rect
                                    x={n.x}
                                    y={n.y}
                                    width={comp.w}
                                    height={comp.h}
                                    rx={6}
                                    fill="#061a12"
                                    stroke={isAlert ? "#ef4444" : "#10b981"}
                                    strokeWidth={isAlert ? 2 : 1.6}
                                  />
                                  <g
                                    className="cursor-pointer"
                                    onDoubleClick={(e) => {
                                      e.stopPropagation();
                                      if (wasNodeDraggedRef.current) return;
                                      setPmeModalMeterType("AMMETER");
                                      setIsPmeModalOpen(true);
                                    }}
                                  >
                                    <text x={n.x + 6} y={n.y + 11} fill={isAlert ? "#f87171" : "#34d399"} fontFamily="monospace" fontSize="7.5" fontWeight="bold">AMM</text>
                                    <text x={n.x + comp.w - 6} y={n.y + 11} textAnchor="end" fill={isAlert ? "#fca5a5" : "#6ee7b7"} fontFamily="monospace" fontSize="6.5" fontWeight="bold">
                                      {isAlert ? "SHORT" : "SER"}
                                    </text>
                                  </g>
                                  <rect x={n.x + 6} y={n.y + 15} width={comp.w - 12} height={24} rx={3} fill="#020617" stroke={isAlert ? "#7f1d1d" : "#134e4a"} />
                                  <text x={n.x + comp.w / 2} y={n.y + 31} textAnchor="middle" fill={isAlert ? "#ef4444" : aData.isSeriesValid ? "#34d399" : "#64748b"} fontFamily="monospace" fontSize={aData.displayStr.length > 8 ? "9.5" : "11"} fontWeight="bold">
                                    {aData.displayStr}
                                  </text>
                                  <text x={n.x + comp.w / 2} y={n.y + comp.h - 5} textAnchor="middle" fill={isAlert ? "#fca5a5" : aData.isSeriesValid ? "#6ee7b7" : "#94a3b8"} fontFamily="monospace" fontSize="6.5" fontWeight="bold">
                                    {isAlert ? "DEAD SHORT!" : aData.isSeriesValid ? "IN-LINE LOOP" : "OPEN LOOP"}
                                  </text>
                                </>
                              );
                            })()}
                          </>
                        ) : n.type === "OHMMETER" ? (
                          <>
                            {(() => {
                              const oData = getOhmmeterData(n);
                              const isAlert = oData.isLiveCircuit;
                              if (componentViewMode === "SCHEMATIC") {
                                const cx = n.x + comp.w / 2;
                                const cy = n.y + comp.h / 2 - 4;
                                return (
                                  <g
                                    onDoubleClick={(e) => {
                                      e.stopPropagation();
                                      if (wasNodeDraggedRef.current) return;
                                      setPmeModalMeterType("OHMMETER");
                                      setIsPmeModalOpen(true);
                                    }}
                                  >
                                    <line x1={n.x} y1={n.y + comp.inputs[0].y} x2={cx - 17} y2={cy} stroke={isAlert ? "#ef4444" : "#f59e0b"} strokeWidth={1.6} />
                                    <line x1={n.x} y1={n.y + comp.inputs[1].y} x2={cx - 17} y2={cy} stroke={isAlert ? "#ef4444" : "#94a3b8"} strokeWidth={1.6} />
                                    <circle cx={cx} cy={cy} r={17} fill="rgba(245,158,11,0.08)" stroke={isAlert ? "#ef4444" : "#f59e0b"} strokeWidth={2} />
                                    <text x={cx} y={cy + 2} textAnchor="middle" fill={isAlert ? "#f87171" : "#fbbf24"} fontFamily="monospace" fontSize="11" fontWeight="bold">Ω</text>
                                    <text x={cx} y={cy + 12} textAnchor="middle" fill={isAlert ? "#fca5a5" : "#e2e8f0"} fontFamily="monospace" fontSize="7" fontWeight="bold">
                                      {oData.displayStr}
                                    </text>
                                    <text x={cx} y={n.y + comp.h - 2} textAnchor="middle" fill={isAlert ? "#f87171" : "#64748b"} fontFamily="monospace" fontSize="6.8" fontWeight="bold">
                                      {isAlert ? "LIVE CKT!" : "0V OHM"}
                                    </text>
                                  </g>
                                );
                              }
                              return (
                                <>
                                  <rect
                                    x={n.x}
                                    y={n.y}
                                    width={comp.w}
                                    height={comp.h}
                                    rx={6}
                                    fill="#1c1304"
                                    stroke={isAlert ? "#ef4444" : "#f59e0b"}
                                    strokeWidth={isAlert ? 2 : 1.6}
                                  />
                                  <g
                                    className="cursor-pointer"
                                    onDoubleClick={(e) => {
                                      e.stopPropagation();
                                      if (wasNodeDraggedRef.current) return;
                                      setPmeModalMeterType("OHMMETER");
                                      setIsPmeModalOpen(true);
                                    }}
                                  >
                                    <text x={n.x + 6} y={n.y + 11} fill={isAlert ? "#f87171" : "#fbbf24"} fontFamily="monospace" fontSize="7.5" fontWeight="bold">OHM</text>
                                    <text x={n.x + comp.w - 6} y={n.y + 11} textAnchor="end" fill={isAlert ? "#fca5a5" : "#fde68a"} fontFamily="monospace" fontSize="6.5" fontWeight="bold">
                                      {isAlert ? "LIVE!" : "0V"}
                                    </text>
                                  </g>
                                  <rect x={n.x + 6} y={n.y + 15} width={comp.w - 12} height={24} rx={3} fill="#020617" stroke={isAlert ? "#7f1d1d" : "#451a03"} />
                                  <text x={n.x + comp.w / 2} y={n.y + 31} textAnchor="middle" fill={isAlert ? "#ef4444" : oData.isConnected ? "#fbbf24" : "#64748b"} fontFamily="monospace" fontSize={oData.displayStr.length > 8 ? "9.5" : "11"} fontWeight="bold">
                                    {oData.displayStr}
                                  </text>
                                  <text x={n.x + comp.w / 2} y={n.y + comp.h - 5} textAnchor="middle" fill={isAlert ? "#fca5a5" : oData.isConnected ? "#fde68a" : "#94a3b8"} fontFamily="monospace" fontSize="6.5" fontWeight="bold">
                                    {isAlert ? "0V REQUIRED" : oData.isConnected ? "DE-ENERGIZED" : "OPEN LEADS"}
                                  </text>
                                </>
                              );
                            })()}
                          </>
                        ) : n.type === "POWER_METER" || n.type === "WATTMETER" ? (
                          <>
                            {(() => {
                              const pData = getPowerMeterData(n);
                              const isAlert = pData.isShortCircuit || (!pData.hasVCoil && pData.hasICoil) || (pData.hasVCoil && !pData.hasICoil);
                              if (componentViewMode === "SCHEMATIC") {
                                const cx = n.x + comp.w / 2;
                                const cy = n.y + comp.h / 2 - 4;
                                return (
                                  <g
                                    onDoubleClick={(e) => {
                                      e.stopPropagation();
                                      if (wasNodeDraggedRef.current) return;
                                      setPmeModalMeterType("POWER_METER");
                                      setIsPmeModalOpen(true);
                                    }}
                                  >
                                    <line x1={n.x} y1={n.y + comp.inputs[0].y} x2={cx - 18} y2={cy - 6} stroke="#ef4444" strokeWidth={1.5} />
                                    <line x1={n.x} y1={n.y + comp.inputs[1].y} x2={cx - 18} y2={cy} stroke="#94a3b8" strokeWidth={1.5} />
                                    <line x1={n.x} y1={n.y + comp.inputs[2].y} x2={cx - 18} y2={cy + 6} stroke="#10b981" strokeWidth={1.5} />
                                    <line x1={cx + 18} y1={cy} x2={n.x + comp.w} y2={n.y + comp.outputs[0].y} stroke="#10b981" strokeWidth={1.5} />
                                    <circle cx={cx} cy={cy} r={18} fill="rgba(168,85,247,0.08)" stroke={pData.isShortCircuit ? "#ef4444" : "#a855f7"} strokeWidth={2} />
                                    <text x={cx} y={cy + 2} textAnchor="middle" fill={pData.isShortCircuit ? "#f87171" : "#c084fc"} fontFamily="monospace" fontSize="11" fontWeight="bold">W</text>
                                    <text x={cx} y={cy + 13} textAnchor="middle" fill="#e9d5ff" fontFamily="monospace" fontSize="7" fontWeight="bold">
                                      {pData.displayStr}
                                    </text>
                                    <text x={cx} y={n.y + comp.h - 2} textAnchor="middle" fill={isAlert ? "#fbbf24" : "#94a3b8"} fontFamily="monospace" fontSize="6.5" fontWeight="bold">
                                      {pData.isShortCircuit ? "SHORT CKT" : "WATTMETER"}
                                    </text>
                                  </g>
                                );
                              }
                              return (
                                <>
                                  <rect
                                    x={n.x}
                                    y={n.y}
                                    width={comp.w}
                                    height={comp.h}
                                    rx={6}
                                    fill="#150a24"
                                    stroke={pData.isShortCircuit ? "#ef4444" : "#a855f7"}
                                    strokeWidth={isAlert ? 2 : 1.6}
                                  />
                                  <g
                                    className="cursor-pointer"
                                    onDoubleClick={(e) => {
                                      e.stopPropagation();
                                      if (wasNodeDraggedRef.current) return;
                                      setPmeModalMeterType("POWER_METER");
                                      setIsPmeModalOpen(true);
                                    }}
                                  >
                                    <text x={n.x + 6} y={n.y + 11} fill={pData.isShortCircuit ? "#f87171" : "#c084fc"} fontFamily="monospace" fontSize="7.5" fontWeight="bold">WATT</text>
                                    <text x={n.x + comp.w - 6} y={n.y + 11} textAnchor="end" fill="#e9d5ff" fontFamily="monospace" fontSize="6.5" fontWeight="bold">P=VI</text>
                                  </g>
                                  <rect x={n.x + 6} y={n.y + 15} width={comp.w - 12} height={28} rx={3} fill="#020617" stroke={pData.isShortCircuit ? "#7f1d1d" : "#3b0764"} />
                                  <text x={n.x + comp.w / 2} y={n.y + 33} textAnchor="middle" fill={pData.isShortCircuit ? "#ef4444" : pData.hasVCoil && pData.hasICoil ? "#c084fc" : "#94a3b8"} fontFamily="monospace" fontSize={pData.displayStr.length > 8 ? "9.5" : "11"} fontWeight="bold">
                                    {pData.displayStr}
                                  </text>
                                  <text x={n.x + comp.w / 2} y={n.y + comp.h - 5} textAnchor="middle" fill={pData.isShortCircuit ? "#fca5a5" : pData.hasVCoil && pData.hasICoil ? "#a7f3d0" : "#fbbf24"} fontFamily="monospace" fontSize="6.5" fontWeight="bold">
                                    {pData.isShortCircuit ? "COIL SHORT!" : pData.hasVCoil && pData.hasICoil ? `${pData.absVDrop.toFixed(1)}V·${pData.current_mA.toFixed(0)}mA` : "DUAL-COIL"}
                                  </text>
                                </>
                              );
                            })()}
                          </>
                        ) : n.type === "DMM_PROBE" ? (
                          <>
                            {(() => {
                              const in0 = getInputVal(n.id, 0, liveVals, liveWireMap, 0);
                              const hasW0 = liveWireMap.has(`${n.id}:0`);
                              const valStr = hasW0 ? (in0 === 1 ? "5.00V" : "0.00V") : "---V";
                              if (componentViewMode === "SCHEMATIC") {
                                const cx = n.x + comp.w / 2;
                                const cy = n.y + comp.h / 2 - 4;
                                return (
                                  <g>
                                    <line x1={n.x} y1={n.y + comp.inputs[0].y} x2={cx - 17} y2={cy} stroke="#f59e0b" strokeWidth={1.6} />
                                    <line x1={n.x} y1={n.y + comp.inputs[1].y} x2={cx - 17} y2={cy} stroke="#94a3b8" strokeWidth={1.6} />
                                    <line x1={cx + 17} y1={cy} x2={n.x + comp.w} y2={n.y + comp.outputs[0].y} stroke="#f59e0b" strokeWidth={1.6} />
                                    <circle cx={cx} cy={cy} r={17} fill="rgba(245,158,11,0.08)" stroke="#f59e0b" strokeWidth={2} />
                                    <text x={cx} y={cy + 2} textAnchor="middle" fill="#fbbf24" fontFamily="monospace" fontSize="8.5" fontWeight="bold">DMM</text>
                                    <text x={cx} y={cy + 12} textAnchor="middle" fill="#fde68a" fontFamily="monospace" fontSize="7" fontWeight="bold">{valStr}</text>
                                    <text x={cx} y={n.y + comp.h - 2} textAnchor="middle" fill="#94a3b8" fontFamily="monospace" fontSize="6.5" fontWeight="bold">PROBE</text>
                                  </g>
                                );
                              }
                              return (
                                <>
                                  <rect x={n.x} y={n.y} width={comp.w} height={comp.h} rx={6} fill="#1c1917" stroke="#f59e0b" strokeWidth={1.6} />
                                  <rect x={n.x + 6} y={n.y + 6} width={comp.w - 12} height={24} rx={3} fill="#020617" stroke="#292524" />
                                  <text x={n.x + comp.w / 2} y={n.y + 22} textAnchor="middle" fill="#fbbf24" fontFamily="monospace" fontSize="10" fontWeight="bold">
                                    {valStr}
                                  </text>
                                  <text x={n.x + comp.w / 2} y={n.y + comp.h - 7} textAnchor="middle" fill="#d6d3d1" fontFamily="monospace" fontSize="8" fontWeight="bold">
                                    DMM PROBE
                                  </text>
                                </>
                              );
                            })()}
                          </>
                        ) : n.type === "LED_RED" ||
                          n.type === "LED_GREEN" ||
                          n.type === "LED_BLUE" ? (
                          <>
                            {componentViewMode !== "SCHEMATIC" && (
                              <rect
                                x={n.x}
                                y={n.y}
                                width={comp.w}
                                height={comp.h}
                                rx={8}
                                className="comp-box"
                              />
                            )}
                            {(() => {
                              const in0 = getInputVal(n.id, 0, liveVals, liveWireMap, 0);
                              const telem = analogSolution.compTelemetry.get(n.id);
                              const isLit = isSimRunning && (in0 === 1 || (telem?.isConducting ?? false));
                              const ledMa = isLit ? (telem?.current_mA || (in0 === 1 ? 15 : 0)) : 0;
                              const glowOpacity = isLit ? Math.min(1, Math.max(0.45, ledMa / 15)) : 0;
                              const col =
                                n.type === "LED_RED"
                                  ? "#ef4444"
                                  : n.type === "LED_GREEN"
                                  ? "#10b981"
                                  : "#3b82f6";
                              const dimCol =
                                n.type === "LED_RED"
                                  ? "#7f1d1d"
                                  : n.type === "LED_GREEN"
                                  ? "#064e3b"
                                  : "#1e3a8a";
                              const cx = n.x + comp.w / 2;
                              const cy = n.y + comp.h / 2 - 4;
                              const ledFreqHz = getNodeSpiceFreqHz(n);
                              const canPulseLed =
                                isLit &&
                                ledFreqHz > 0 &&
                                !prefersReducedMotion &&
                                isPageVisible;
                              const ledCycleDur = computeAnimDurStr(ledFreqHz);
                              return (
                                <>
                                  {componentViewMode === "SCHEMATIC" ? (
                                    /* Pure IEEE 315 Optoelectronic Diode Schematic Symbol */
                                    <g stroke={isLit ? col : "#38bdf8"} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round">
                                      {canPulseLed && (
                                        <circle
                                          cx={cx}
                                          cy={cy}
                                          r={16}
                                          fill={col}
                                          stroke="none"
                                          opacity={0.25}
                                          className="spice-led-halo"
                                          style={{ "--spice-cycle-dur": ledCycleDur } as React.CSSProperties}
                                        />
                                      )}
                                      <line x1={cx - 24} y1={cy} x2={cx - 9} y2={cy} />
                                      <line x1={cx + 9} y1={cy} x2={cx + 24} y2={cy} />
                                      <polygon points={`${cx - 9},${cy - 10} ${cx - 9},${cy + 10} ${cx + 9},${cy}`} fill={isLit ? col : "rgba(56, 189, 248, 0.15)"} fillOpacity={isLit ? glowOpacity : 1} />
                                      <line x1={cx + 9} y1={cy - 10} x2={cx + 9} y2={cy + 10} strokeWidth={2.6} />
                                      {/* Photon Emission Arrows */}
                                      <g
                                        className={canPulseLed ? "spice-led-pulse" : undefined}
                                        style={canPulseLed ? ({ "--spice-cycle-dur": ledCycleDur } as React.CSSProperties) : undefined}
                                      >
                                        <line x1={cx + 1} y1={cy - 9} x2={cx + 9} y2={cy - 17} stroke={isLit ? "#ffffff" : col} strokeWidth={1.6} />
                                        <polygon points={`${cx + 9},${cy - 17} ${cx + 5},${cy - 16} ${cx + 8},${cy - 13}`} fill={isLit ? "#ffffff" : col} stroke="none" />
                                        <line x1={cx + 7} y1={cy - 7} x2={cx + 15} y2={cy - 15} stroke={isLit ? "#ffffff" : col} strokeWidth={1.6} />
                                        <polygon points={`${cx + 15},${cy - 15} ${cx + 11},${cy - 14} ${cx + 14},${cy - 11}`} fill={isLit ? "#ffffff" : col} stroke="none" />
                                      </g>
                                    </g>
                                  ) : (
                                    /* 5mm Diffused Package */
                                    <g>
                                      {isLit && (
                                        <circle
                                          cx={cx}
                                          cy={cy}
                                          r={18}
                                          fill={col}
                                          opacity={0.3 * glowOpacity}
                                          className={canPulseLed ? "spice-led-halo" : undefined}
                                          style={canPulseLed ? ({ "--spice-cycle-dur": ledCycleDur } as React.CSSProperties) : undefined}
                                        />
                                      )}
                                      <circle
                                        cx={cx}
                                        cy={cy}
                                        r={12}
                                        fill={isLit ? col : dimCol}
                                        fillOpacity={isLit ? Math.max(0.65, glowOpacity) : 1}
                                        stroke={isLit ? "#ffffff" : "#475569"}
                                        strokeWidth={1.5}
                                        className={canPulseLed ? "spice-led-pulse" : undefined}
                                        style={canPulseLed ? ({ "--spice-cycle-dur": ledCycleDur } as React.CSSProperties) : undefined}
                                      />
                                      {isLit && (
                                        <circle
                                          cx={cx - 3.5}
                                          cy={cy - 3.5}
                                          r={3.5}
                                          fill="#ffffff"
                                          opacity={0.6 * glowOpacity}
                                        />
                                      )}
                                    </g>
                                  )}
                                  <text
                                    x={n.x + comp.w / 2}
                                    y={n.y + comp.h - 4}
                                    className="comp-label"
                                  >
                                    {comp.label}
                                  </text>
                                </>
                              );
                            })()}
                          </>
                        ) : n.type === "BUZZER" ? (
                          <>
                            {componentViewMode !== "SCHEMATIC" && (
                              <rect
                                x={n.x}
                                y={n.y}
                                width={comp.w}
                                height={comp.h}
                                rx={8}
                                className="comp-box"
                              />
                            )}
                            {(() => {
                              const in0 = getInputVal(n.id, 0, liveVals, liveWireMap, 0);
                              const telem = analogSolution.compTelemetry.get(n.id);
                              const isBeeping = isSimRunning && (in0 === 1 || (telem?.isConducting ?? false));
                              const cx = n.x + comp.w / 2;
                              const cy = n.y + comp.h / 2 - 4;
                              if (componentViewMode === "SCHEMATIC") {
                                return (
                                  <g stroke={isBeeping ? "#f59e0b" : "#38bdf8"} strokeWidth={1.8} fill="none" strokeLinejoin="round">
                                    <line x1={cx - 24} y1={cy - 5} x2={cx - 10} y2={cy - 5} />
                                    <line x1={cx - 24} y1={cy + 5} x2={cx - 10} y2={cy + 5} />
                                    <rect x={cx - 10} y={cy - 10} width={12} height={20} fill={isBeeping ? "rgba(245,158,11,0.18)" : "rgba(56,189,248,0.08)"} />
                                    <polygon points={`${cx + 2},${cy - 8} ${cx + 18},${cy - 16} ${cx + 18},${cy + 16} ${cx + 2},${cy + 8}`} />
                                    <text x={cx} y={n.y + comp.h - 2} textAnchor="middle" stroke="none" className="comp-label">{comp.label}</text>
                                  </g>
                                );
                              }
                              return (
                                <>
                                  <circle
                                    cx={cx}
                                    cy={cy}
                                    r={13}
                                    fill="#1e293b"
                                    stroke={isBeeping ? "#f59e0b" : "#475569"}
                                    strokeWidth={2}
                                  />
                                  <circle
                                    cx={cx}
                                    cy={cy}
                                    r={5}
                                    fill={isBeeping ? "#f59e0b" : "#64748b"}
                                  />
                                  <text
                                    x={n.x + comp.w / 2}
                                    y={n.y + comp.h - 4}
                                    className="comp-label"
                                  >
                                    {comp.label}
                                  </text>
                                </>
                              );
                            })()}
                          </>
                        ) : n.type === "AC_SINE" || n.type === "AC_VOLTAGE_SOURCE" ? (
                          <>
                            {(() => {
                              const telem = analogSolution.compTelemetry.get(n.id);
                              const isLoopClosed = isSimRunning && (telem?.current_mA ?? 0) > 0.01;
                              if (componentViewMode === "SCHEMATIC") {
                                const cx = n.x + comp.w / 2;
                                const cy = n.y + comp.h / 2 - 4;
                                return (
                                  <g>
                                    <circle cx={cx} cy={cy} r={16} fill="rgba(56,189,248,0.08)" stroke={isSimRunning ? "#38bdf8" : "#64748b"} strokeWidth={2} />
                                    <path
                                      d={`M ${cx - 9} ${cy} Q ${cx - 4.5} ${cy - 8}, ${cx} ${cy} T ${cx + 9} ${cy}`}
                                      fill="none"
                                      stroke={isSimRunning ? "#22d3ee" : "#64748b"}
                                      strokeWidth={2}
                                    />
                                    <line x1={cx + 16} y1={cy} x2={n.x + comp.w} y2={n.y + comp.outputs[0].y} stroke="#ef4444" strokeWidth={1.6} />
                                    <line x1={cx + 16} y1={cy + 6} x2={n.x + comp.w} y2={n.y + comp.outputs[1].y} stroke="#94a3b8" strokeWidth={1.4} />
                                    <text x={cx} y={n.y + comp.h - 2} textAnchor="middle" fill={isLoopClosed ? "#34d399" : "#94a3b8"} fontFamily="monospace" fontSize="6.8" fontWeight="bold">
                                      {`${n.analogParams?.acVoltageV ?? 5.0}V~ 1kHz`}
                                    </text>
                                  </g>
                                );
                              }
                              return (
                                <>
                                  <rect
                                    x={n.x}
                                    y={n.y}
                                    width={comp.w}
                                    height={comp.h}
                                    rx={6}
                                    fill="#091322"
                                    stroke={isSimRunning ? "#0284c7" : "#334155"}
                                    strokeWidth={1.6}
                                  />
                                  <text x={n.x + 6} y={n.y + 11} fill={isSimRunning ? "#38bdf8" : "#64748b"} fontFamily="monospace" fontSize="7" fontWeight="bold">AC~</text>
                                  <text x={n.x + comp.w - 6} y={n.y + 11} textAnchor="end" fill="#7dd3fc" fontFamily="monospace" fontSize="6.5" fontWeight="bold">
                                    {n.analogParams?.acVoltageV ?? 5.0}V
                                  </text>
                                  <rect x={n.x + 6} y={n.y + 15} width={comp.w - 12} height={21} rx={3} fill="#020617" stroke="#1e293b" />
                                  <path
                                    d={`M ${n.x + 12} ${n.y + 25.5} Q ${n.x + 21} ${n.y + 17}, ${n.x + 30} ${n.y + 25.5} T ${n.x + 48} ${n.y + 25.5} T ${n.x + 64} ${n.y + 25.5}`}
                                    fill="none"
                                    stroke={isSimRunning ? "#22c55e" : "#475569"}
                                    strokeWidth={1.8}
                                  />
                                  <text x={n.x + comp.w / 2} y={n.y + comp.h - 4} textAnchor="middle" fill={isLoopClosed ? "#34d399" : "#94a3b8"} fontFamily="monospace" fontSize="6.5" fontWeight="bold">
                                    {isLoopClosed ? `${telem!.current_mA.toFixed(1)}mA` : "1kHz SINE"}
                                  </text>
                                </>
                              );
                            })()}
                          </>
                        ) : n.type === "GND" ? (
                          <>
                            {componentViewMode !== "SCHEMATIC" && (
                              <rect
                                x={n.x}
                                y={n.y}
                                width={comp.w}
                                height={comp.h}
                                rx={6}
                                fill="#050a14"
                                stroke="#0284c7"
                                strokeWidth={1.4}
                                strokeDasharray="4 2"
                              />
                            )}
                            {/* Ground Stem */}
                            <line
                              x1={n.x + comp.w / 2}
                              y1={n.y + 8}
                              x2={n.x + comp.w / 2}
                              y2={n.y + 24}
                              stroke="#38bdf8"
                              strokeWidth={2.2}
                              strokeLinecap="round"
                            />
                            {/* 3 Descending Ground Plates */}
                            <line
                              x1={n.x + comp.w / 2 - 16}
                              y1={n.y + 24}
                              x2={n.x + comp.w / 2 + 16}
                              y2={n.y + 24}
                              stroke="#38bdf8"
                              strokeWidth={2.6}
                              strokeLinecap="round"
                            />
                            <line
                              x1={n.x + comp.w / 2 - 10}
                              y1={n.y + 30}
                              x2={n.x + comp.w / 2 + 10}
                              y2={n.y + 30}
                              stroke="#38bdf8"
                              strokeWidth={2.2}
                              strokeLinecap="round"
                            />
                            <line
                              x1={n.x + comp.w / 2 - 4}
                              y1={n.y + 36}
                              x2={n.x + comp.w / 2 + 4}
                              y2={n.y + 36}
                              stroke="#38bdf8"
                              strokeWidth={1.8}
                              strokeLinecap="round"
                            />
                            {/* 0.00V Label */}
                            <text
                              x={n.x + comp.w / 2}
                              y={n.y + comp.h - 4}
                              textAnchor="middle"
                              fill="#7dd3fc"
                              fontFamily="monospace"
                              fontSize="7.5"
                              fontWeight="bold"
                            >
                              GND 0V
                            </text>
                          </>
                        ) : (
                          <>
                            {/* Realistic Manufactured Electronic Component or Standard IEEE/IEC Schematic Symbol */}
                            <svg
                              x={n.x}
                              y={n.y}
                              width={comp.w}
                              height={comp.h}
                              viewBox={componentViewMode === "SCHEMATIC" ? "0 0 100 60" : "0 0 120 70"}
                              preserveAspectRatio="xMidYMid meet"
                              className="overflow-visible pointer-events-none"
                            >
                              <RealisticComponentRenderer
                                type={n.type}
                                mode={componentViewMode}
                                width={componentViewMode === "SCHEMATIC" ? 100 : 120}
                                height={componentViewMode === "SCHEMATIC" ? 60 : 70}
                                value={n.analogParams?.resistanceOhms || (n.analogParams as any)?.resistanceOhm || (n.analogParams as any)?.capacitanceF || n.analogParams?.capacitanceUf}
                                formattedValue={n.analogParams?.formattedValue}
                                label={n.label || comp.label}
                                isConducting={
                                  isSimRunning &&
                                  ((analogSolution.compTelemetry.get(n.id)?.isConducting ?? false) ||
                                    (n.type === "RELAY_SPDT" &&
                                      ((liveVals[n.id]?.[0] ?? 0) === 1 ||
                                        (analogSolution.compTelemetry.get(n.id)?.current_mA ?? 0) > 0.2)))
                                }
                                current_mA={isSimRunning ? (analogSolution.compTelemetry.get(n.id)?.current_mA ?? 0) : 0}
                                vDrop={isSimRunning ? (analogSolution.compTelemetry.get(n.id)?.vDrop ?? 0) : 0}
                                isMirrored={n.isMirrored}
                                isSimRunning={isSimRunning}
                                simSpeed={simSpeed}
                                simFrequencyHz={
                                  isSimRunning && !prefersReducedMotion && isPageVisible
                                    ? getNodeSpiceFreqHz(n)
                                    : 0
                                }
                              />
                            </svg>

                            {/* Live Ohm's Law Telemetry Badge (V = IR) */}
                            {(() => {
                              const telem = analogSolution.compTelemetry.get(n.id);
                              if (!telem || !isSimRunning) return null;
                              if (telem.current_mA <= 0.001) {
                                return (
                                  <text
                                    x={n.x + comp.w / 2}
                                    y={n.y + comp.h - 4}
                                    textAnchor="middle"
                                    fill="#64748b"
                                    fontFamily="monospace"
                                    fontSize="7"
                                  >
                                    0.00V · 0 mA (Open)
                                  </text>
                                );
                              }
                              return (
                                <text
                                  x={n.x + comp.w / 2}
                                  y={n.y + comp.h - 4}
                                  textAnchor="middle"
                                  fill="#34d399"
                                  fontFamily="monospace"
                                  fontSize="7.5"
                                  fontWeight="bold"
                                >
                                  {`ΔV:${telem.vDrop.toFixed(2)}V · ${telem.current_mA.toFixed(1)}mA`}
                                </text>
                              );
                            })()}
                          </>
                        )}

                        {/* Input Pins */}
                        {comp.inputs.map((pin, idx) => {
                          const live =
                            getInputVal(
                              n.id,
                              idx,
                              liveVals,
                              liveWireMap,
                              pin.defaultVal ?? 0
                            ) === 1;
                          const isGndComp = n.type === "GND";
                          const pinUpper = (pin.name || "").trim().toUpperCase();
                          const isGndPin =
                            isGndComp ||
                            pinUpper === "GND" ||
                            pinUpper === "0" ||
                            pinUpper === "0V" ||
                            pinUpper.includes("GND");

                          return (
                            <g key={`in-${idx}`}>
                              {!comp.noLabels && pin.name && (
                                <text
                                  x={n.x + 10}
                                  y={n.y + pin.y + 3.5}
                                  className={
                                    isGndPin
                                      ? "fill-sky-400 font-mono text-[8.5px] font-bold"
                                      : "comp-pin-label"
                                  }
                                >
                                  {isGndComp ? "⏚ GND" : isGndPin ? `⏚ ${pin.name}` : pin.name}
                                </text>
                              )}
                              {n.type === "VOLTMETER" ? (
                                <circle
                                  cx={n.x}
                                  cy={n.y + pin.y}
                                  r={5}
                                  fill={idx === 0 ? "#ef4444" : "#1e293b"}
                                  stroke={idx === 0 ? "#fca5a5" : "#94a3b8"}
                                  strokeWidth={1.8}
                                />
                              ) : n.type === "AMMETER" ? (
                                <circle
                                  cx={n.x}
                                  cy={n.y + pin.y}
                                  r={5}
                                  fill="#059669"
                                  stroke="#6ee7b7"
                                  strokeWidth={1.8}
                                />
                              ) : n.type === "OHMMETER" ? (
                                <circle
                                  cx={n.x}
                                  cy={n.y + pin.y}
                                  r={5}
                                  fill={idx === 0 ? "#f59e0b" : "#1e293b"}
                                  stroke={idx === 0 ? "#fbbf24" : "#94a3b8"}
                                  strokeWidth={1.8}
                                />
                              ) : n.type === "POWER_METER" || n.type === "WATTMETER" ? (
                                <circle
                                  cx={n.x}
                                  cy={n.y + pin.y}
                                  r={5}
                                  fill={idx === 0 ? "#ef4444" : idx === 1 ? "#1e293b" : "#059669"}
                                  stroke={idx === 0 ? "#fca5a5" : idx === 1 ? "#94a3b8" : "#6ee7b7"}
                                  strokeWidth={1.8}
                                />
                              ) : isGndPin ? (
                                <circle
                                  cx={n.x}
                                  cy={n.y + pin.y}
                                  r={5.5}
                                  fill="#0369a1"
                                  stroke="#38bdf8"
                                  strokeWidth={2}
                                />
                              ) : (
                                <circle
                                  cx={n.x}
                                  cy={n.y + pin.y}
                                  r={4}
                                  className={`port in ${live ? "hi" : ""}`}
                                />
                              )}
                              <circle
                                cx={n.x}
                                cy={n.y + pin.y}
                                r={12}
                                className="port-hit cursor-pointer"
                                onPointerDown={(e) =>
                                  handlePortClick(n.id, idx, "in", e)
                                }
                              >
                                <title>
                                  {isGndPin
                                    ? `Global Ground Reference (${pin.name}) - Bound to Net 0 (0.00V)`
                                    : pin.name}
                                </title>
                              </circle>
                            </g>
                          );
                        })}

                        {/* Output Pins */}
                        {comp.outputs.map((pin, idx) => {
                          const outVal = liveVals[n.id]?.[idx] ?? 0;
                          const live = outVal === 1;
                          const isAcSine = n.type === "AC_SINE";
                          const isAcPhase = isAcSine && idx === 0;
                          const isAcGnd = isAcSine && idx === 1;
                          const isGndComp = n.type === "GND";
                          const pinUpper = (pin.name || "").trim().toUpperCase();
                          const isGndPin =
                            isGndComp ||
                            isAcGnd ||
                            pinUpper === "GND" ||
                            pinUpper === "0" ||
                            pinUpper === "0V" ||
                            pinUpper === "NEUTRAL" ||
                            pinUpper === "NEUTRAL_GND" ||
                            pinUpper.includes("GND");

                          return (
                            <g key={`out-${idx}`}>
                              {!comp.noLabels && pin.name && (
                                <text
                                  x={n.x + comp.w - (isAcSine ? 14 : 10)}
                                  y={n.y + pin.y + 3.5}
                                  textAnchor="end"
                                  className={
                                    isAcPhase
                                      ? "fill-red-400 font-mono text-[9px] font-bold"
                                      : isAcGnd
                                      ? "fill-slate-300 font-mono text-[9px] font-bold"
                                      : isGndPin
                                      ? "fill-sky-400 font-mono text-[8.5px] font-bold"
                                      : "comp-pin-label"
                                  }
                                >
                                  {isAcPhase
                                    ? "PHASE (~)"
                                    : isAcGnd
                                    ? "NEUTRAL (⏚)"
                                    : isGndComp
                                    ? "⏚ 0V"
                                    : isGndPin
                                    ? `⏚ ${pin.name}`
                                    : pin.name}
                                </text>
                              )}
                              {n.type === "AMMETER" || n.type === "POWER_METER" || n.type === "WATTMETER" ? (
                                <circle
                                  cx={n.x + comp.w}
                                  cy={n.y + pin.y}
                                  r={5}
                                  fill="#059669"
                                  stroke="#6ee7b7"
                                  strokeWidth={1.8}
                                />
                              ) : isAcPhase ? (
                                <circle
                                  cx={n.x + comp.w}
                                  cy={n.y + pin.y}
                                  r={6}
                                  fill="#ef4444"
                                  stroke="#fca5a5"
                                  strokeWidth={2}
                                  filter="drop-shadow(0 0 4px rgba(239,68,68,0.6))"
                                />
                              ) : isAcGnd ? (
                                <circle
                                  cx={n.x + comp.w}
                                  cy={n.y + pin.y}
                                  r={6}
                                  fill="#090d16"
                                  stroke="#94a3b8"
                                  strokeWidth={2.2}
                                  filter="drop-shadow(0 0 3px rgba(148,163,184,0.5))"
                                />
                              ) : isGndPin ? (
                                <circle
                                  cx={n.x + comp.w}
                                  cy={n.y + pin.y}
                                  r={5.5}
                                  fill="#0369a1"
                                  stroke="#38bdf8"
                                  strokeWidth={2}
                                />
                              ) : (
                                <circle
                                  cx={n.x + comp.w}
                                  cy={n.y + pin.y}
                                  r={4}
                                  className={`port out ${live ? "hi" : ""}`}
                                />
                              )}
                              <circle
                                cx={n.x + comp.w}
                                cy={n.y + pin.y}
                                r={12}
                                className="port-hit cursor-pointer"
                                onPointerDown={(e) =>
                                  handlePortClick(n.id, idx, "out", e)
                                }
                              >
                                <title>
                                  {isAcPhase
                                    ? "Phase / Live Terminal (Connects to load ~)"
                                    : isAcGnd
                                    ? "Neutral / Ground Terminal (Bound to common circuit ground reference ⏚)"
                                    : isGndPin
                                    ? `Global Ground Reference (${pin.name}) - Bound to Net 0 (0.00V)`
                                    : pin.name}
                                </title>
                              </circle>
                            </g>
                          );
                        })}
                      </g>
                    );
                  }

                  const spec = GATE_SPECS[n.type];
                  if (!spec) return null;
                  const offs = spec.inputs === 1 ? [25] : [15, 35];
                  const violation = compulsoryViolations.find(
                    (v: CompulsoryInputViolation) => v.nodeId === n.id
                  );
                  const isHaltedGate = !!violation;

                  const isSel = isNodeSelected(n.id);
                  return (
                    <g
                      key={n.id}
                      transform={rotTransform}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        if (wasNodeDraggedRef.current) return;
                        setSelected({ type: "node", id: n.id });
                        setSelectedNodeIds([n.id]);
                        setIsPropertySidebarOpen(true);
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleRotateNode(n.id);
                      }}
                      onPointerDown={(e) => handleNodePointerDown(n.id, e)}
                      className="cursor-grab"
                    >
                      {isSel && (
                        <rect
                          x={n.x - 4}
                          y={n.y - 4}
                          width={spec.outX + 14}
                          height={74}
                          rx={10}
                          fill="none"
                          stroke="#22d3ee"
                          strokeWidth={2}
                          strokeDasharray="4 2"
                        />
                      )}
                      <path
                        d={spec.path(n.x, n.y)}
                        className={`gate-body ${val === 1 ? "on" : ""} ${
                          isHaltedGate ? "halted" : ""
                        }`}
                      />
                      {isHaltedGate && (
                        <path
                          d={spec.path(n.x, n.y)}
                          fill="none"
                          stroke="#f59e0b"
                          strokeWidth={2.8}
                          strokeDasharray="6 3"
                        />
                      )}
                      {spec.extra && (
                        <path
                          d={spec.extra(n.x, n.y)}
                          className="gate-extra"
                          style={
                            val === 1
                              ? { stroke: "#38bdf8" }
                              : isHaltedGate
                              ? { stroke: "#f59e0b" }
                              : undefined
                          }
                        />
                      )}
                      {spec.bubble && (
                        <circle
                          cx={n.x + spec.bubble.cx}
                          cy={n.y + spec.bubble.cy}
                          r={spec.bubble.r}
                          className={`gate-bubble ${val === 1 ? "on" : ""} ${
                            isHaltedGate ? "halted" : ""
                          }`}
                        />
                      )}
                      {/* Adorable & Fine Micro Capsule Label */}
                      <g transform={`translate(${n.x + spec.outX / 2}, ${n.y + 57})`} pointerEvents="none">
                        <rect
                          x={-34}
                          y={-2}
                          width={68}
                          height={14}
                          rx={4}
                          fill={activeCanvasTheme.isLight ? "#ffffff" : "#090e1a"}
                          stroke={val === 1 ? "#0284c7" : isHaltedGate ? "#f59e0b" : activeCanvasTheme.isLight ? "#cbd5e1" : "#334155"}
                          strokeWidth={0.8}
                          fillOpacity={activeCanvasTheme.isLight ? 0.95 : 0.9}
                        />
                        <text
                          x={0}
                          y={8}
                          textAnchor="middle"
                          fill={val === 1 ? (activeCanvasTheme.isLight ? "#0284c7" : "#38bdf8") : isHaltedGate ? "#fbbf24" : activeCanvasTheme.isLight ? "#0f172a" : "#94a3b8"}
                          fontSize={8.5}
                          fontFamily="JetBrains Mono, monospace"
                          fontWeight="700"
                        >
                          {n.label || n.type} · {val === 1 ? "5V" : val === -1 ? "Z" : "0V"}
                        </text>
                      </g>

                      {offs.map((off, idx) => {
                        const isMissing =
                          violation?.missingPorts.includes(idx);
                        const live =
                          getInputVal(n.id, idx, liveVals, liveWireMap, 0) ===
                          1;
                        return (
                          <g key={`gin-${idx}`}>
                            {/* Animated halo and (!) label on missing compulsory input */}
                            {isMissing && (
                              <>
                                <circle
                                  cx={n.x}
                                  cy={n.y + off}
                                  r={13}
                                  fill="none"
                                  stroke="#f59e0b"
                                  strokeWidth={2}
                                  strokeDasharray="3 2"
                                  opacity={0.85}
                                />
                                <circle
                                  cx={n.x}
                                  cy={n.y + off}
                                  r={18}
                                  fill="none"
                                  stroke="#ef4444"
                                  strokeWidth={1.5}
                                  opacity={0.45}
                                />
                                <text
                                  x={n.x - 12}
                                  y={n.y + off + 3.5}
                                  textAnchor="end"
                                  fill="#f59e0b"
                                  style={{
                                    fontSize: "10.5px",
                                    fontWeight: 800,
                                    fontFamily: "var(--font-mono)",
                                  }}
                                >
                                  Pin {idx === 0 ? "A" : "B"} (!)
                                </text>
                              </>
                            )}
                            <circle
                              cx={n.x}
                              cy={n.y + off}
                              r={5}
                              className={`port in ${live ? "hi" : ""} ${
                                isMissing ? "missing-pulse" : ""
                              }`}
                            />
                            <circle
                              cx={n.x}
                              cy={n.y + off}
                              r={10}
                              className="port-hit"
                              onPointerDown={(e) =>
                                handlePortClick(n.id, idx, "in", e)
                              }
                            />
                          </g>
                        );
                      })}

                      <circle
                        cx={n.x + spec.outX}
                        cy={n.y + 25}
                        r={5}
                        className={`port out ${val === 1 ? "hi" : ""} ${
                          val === -1 ? "missing-pulse" : ""
                        }`}
                      />
                      {val === -1 && (
                        <g className="pointer-events-none">
                          <rect
                            x={n.x + spec.outX - 8}
                            y={n.y + 25 - 20}
                            width={16}
                            height={14}
                            rx={3}
                            fill="#78350f"
                            stroke="#f59e0b"
                            strokeWidth={1}
                          />
                          <text
                            x={n.x + spec.outX}
                            y={n.y + 25 - 9}
                            textAnchor="middle"
                            fill="#fef08a"
                            style={{
                              fontSize: "9px",
                              fontWeight: 800,
                              fontFamily: "var(--font-mono)",
                            }}
                          >
                            Z
                          </text>
                        </g>
                      )}
                      <circle
                        cx={n.x + spec.outX}
                        cy={n.y + 25}
                        r={10}
                        className="port-hit"
                        onPointerDown={(e) =>
                          handlePortClick(n.id, 0, "out", e)
                        }
                      />
                    </g>
                  );
                })}

                {/* Selection Outlines for Active Selection / Sub-Circuit */}
                {(() => {
                  const activeNodeList = selectedNodeIds.length > 0
                    ? nodes.filter((n) => selectedNodeIds.includes(n.id))
                    : selected?.type === "node"
                    ? nodes.filter((n) => n.id === selected.id)
                    : [];

                  if (activeNodeList.length === 0) return null;

                  return (
                    <g className="pointer-events-none select-none">
                      {activeNodeList.map((n) => {
                        const b = getNodeBounds(n);
                        return (
                          <rect
                            key={`sel-outline-${n.id}`}
                            x={b.x}
                            y={b.y}
                            width={b.w}
                            height={b.h}
                            rx={10}
                            className="sel-outline"
                          />
                        );
                      })}

                      {/* Collective Sub-Circuit Bounding Box if 2+ components selected */}
                      {activeNodeList.length > 1 && (() => {
                        const allBounds = activeNodeList.map((n) => getNodeBounds(n));
                        const minX = Math.min(...allBounds.map((b) => b.x)) - 8;
                        const minY = Math.min(...allBounds.map((b) => b.y)) - 8;
                        const maxX = Math.max(...allBounds.map((b) => b.x + b.w)) + 8;
                        const maxY = Math.max(...allBounds.map((b) => b.y + b.h)) + 8;

                        return (
                          <g>
                            <rect
                              x={minX}
                              y={minY}
                              width={maxX - minX}
                              height={maxY - minY}
                              rx={14}
                              fill="rgba(6, 182, 212, 0.03)"
                              stroke="#06b6d4"
                              strokeWidth={1.4}
                              strokeDasharray="6 4"
                            />
                            <g transform={`translate(${minX + 8}, ${minY - 10})`}>
                              <rect
                                x={0}
                                y={0}
                                width={180}
                                height={18}
                                rx={5}
                                fill="#070e1c"
                                stroke="#0891b2"
                                strokeWidth={1}
                              />
                              <text
                                x={90}
                                y={12}
                                textAnchor="middle"
                                fill="#22d3ee"
                                fontSize="9"
                                fontFamily="monospace"
                                fontWeight="bold"
                              >
                                ⚡ SUB-CIRCUIT ({activeNodeList.length} UNITS)
                              </text>
                            </g>
                          </g>
                        );
                      })()}
                    </g>
                  );
                })()}

                {/* Interactive Marquee Drag-Selection Box */}
                {marqueeBox && (
                  <g className="pointer-events-none select-none">
                    <rect
                      x={marqueeBox.x1}
                      y={marqueeBox.y1}
                      width={marqueeBox.x2 - marqueeBox.x1}
                      height={marqueeBox.y2 - marqueeBox.y1}
                      fill="rgba(6, 182, 212, 0.12)"
                      stroke="#06b6d4"
                      strokeWidth={1.8}
                      strokeDasharray="5 3"
                      rx={4}
                    />
                  </g>
                )}

                {/* Visual Missing Connection Highlights (Pulsing Red Rings with Pin Name Callout) */}
                {missingConnections.map((m, idx) => (
                  <g
                    key={`missing-pin-${m.nodeId}-${m.port}-${idx}`}
                    className="pointer-events-none select-none"
                  >
                    <circle
                      cx={m.x}
                      cy={m.y}
                      r={18}
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth={2.5}
                      strokeDasharray="4 3"
                      className="animate-ping"
                      opacity={0.85}
                    />
                    <circle
                      cx={m.x}
                      cy={m.y}
                      r={11}
                      fill="rgba(239, 68, 68, 0.3)"
                      stroke="#ef4444"
                      strokeWidth={2}
                    />
                    <g transform={`translate(${m.x}, ${m.y - 24})`}>
                      <rect
                        x={-44}
                        y={-9}
                        width={88}
                        height={18}
                        rx={4}
                        fill="#450a0a"
                        stroke="#ef4444"
                        strokeWidth={1.2}
                      />
                      <text
                        x={0}
                        y={3.5}
                        textAnchor="middle"
                        fill="#fecaca"
                        fontSize={9}
                        fontWeight="700"
                        fontFamily="var(--font-mono)"
                      >
                        ⚠ {m.pinName} Open
                      </text>
                    </g>
                  </g>
                ))}

                {/* Find Open Circuits Visual Overlay on Schematic Canvas */}
                {showOpenCircuitsOverlay && (
                  <g className="pointer-events-none select-none">
                    {openCircuitIssues.map((issue) => {
                      if (issue.type === "FLOATING_NODE") {
                        return (
                          <g key={issue.id}>
                            <rect
                              x={issue.x - 10}
                              y={issue.y - 10}
                              width={76}
                              height={70}
                              rx={10}
                              fill="rgba(245, 158, 11, 0.12)"
                              stroke="#f59e0b"
                              strokeWidth="2.5"
                              strokeDasharray="6 4"
                            />
                            <rect
                              x={issue.x - 25}
                              y={issue.y - 28}
                              width={106}
                              height={18}
                              rx={4}
                              fill="#0f172a"
                              stroke="#f59e0b"
                              strokeWidth="1.2"
                            />
                            <text
                              x={issue.x + 28}
                              y={issue.y - 15}
                              textAnchor="middle"
                              fill="#fbbf24"
                              fontSize="9"
                              fontFamily="JetBrains Mono, monospace"
                              fontWeight="bold"
                            >
                              ⚠ FLOATING NODE
                            </text>
                          </g>
                        );
                      }

                      // Unterminated input pin or broken path
                      return (
                        <g key={issue.id}>
                          <circle
                            cx={issue.x}
                            cy={issue.y}
                            r={15}
                            fill="rgba(239, 68, 68, 0.18)"
                            stroke="#ef4444"
                            strokeWidth="2.2"
                            strokeDasharray="4 3"
                          />
                          <circle
                            cx={issue.x}
                            cy={issue.y}
                            r={5}
                            fill="#ef4444"
                            stroke="#ffffff"
                            strokeWidth="1.5"
                          />
                          <g transform={`translate(${issue.x + 8}, ${issue.y - 14})`}>
                            <rect
                              x={0}
                              y={0}
                              width={78}
                              height={17}
                              rx={4}
                              fill="#180c0c"
                              stroke="#ef4444"
                              strokeWidth="1"
                            />
                            <text
                              x={39}
                              y={12}
                              textAnchor="middle"
                              fill="#fca5a5"
                              fontSize="8.5"
                              fontFamily="JetBrains Mono, monospace"
                              fontWeight="bold"
                            >
                              ⚡ UNTERMINATED
                            </text>
                          </g>
                        </g>
                      );
                    })}
                  </g>
                )}

                {/* Active Magnetic Alignment Laser Guides (Column & Pin Straight-Wire Alignment) */}
                {activeAlignmentGuides.length > 0 && (
                  <g className="pointer-events-none select-none">
                    {activeAlignmentGuides.map((guide, idx) => {
                      if (guide.axis === "x") {
                        return (
                          <g key={`x-guide-${idx}`}>
                            <line
                              x1={guide.position}
                              y1={guide.start}
                              x2={guide.position}
                              y2={guide.end}
                              stroke="#06b6d4"
                              strokeWidth="1.5"
                              strokeDasharray="4 3"
                              strokeOpacity="0.8"
                            />
                            <g transform={`translate(${guide.position}, ${guide.start + 14})`}>
                              <rect
                                x={-36}
                                y={-10}
                                width={72}
                                height={18}
                                rx={4}
                                fill="#070d1a"
                                stroke="#06b6d4"
                                strokeWidth="1"
                                fillOpacity="0.95"
                              />
                              <text
                                x={0}
                                y={2}
                                textAnchor="middle"
                                fill="#67e8f9"
                                fontSize="9"
                                fontFamily="JetBrains Mono, monospace"
                                fontWeight="bold"
                              >
                                {guide.label}
                              </text>
                            </g>
                          </g>
                        );
                      }

                      const isPortAlign = guide.kind === "port";
                      const strokeColor = isPortAlign ? "#10b981" : "#a855f7";
                      const badgeTextColor = isPortAlign ? "#6ee7b7" : "#d8b4fe";
                      return (
                        <g key={`y-guide-${idx}`}>
                          <line
                            x1={guide.start}
                            y1={guide.position}
                            x2={guide.end}
                            y2={guide.position}
                            stroke={strokeColor}
                            strokeWidth={isPortAlign ? "1.75" : "1.25"}
                            strokeDasharray={isPortAlign ? "5 3" : "4 3"}
                            strokeOpacity="0.85"
                          />
                          <g transform={`translate(${guide.start + 32}, ${guide.position})`}>
                            <rect
                              x={-42}
                              y={-18}
                              width={84}
                              height={18}
                              rx={4}
                              fill="#070d1a"
                              stroke={strokeColor}
                              strokeWidth="1"
                              fillOpacity="0.95"
                            />
                            <text
                              x={0}
                              y={-6}
                              textAnchor="middle"
                              fill={badgeTextColor}
                              fontSize="8.5"
                              fontFamily="JetBrains Mono, monospace"
                              fontWeight="bold"
                            >
                              {guide.label}
                            </text>
                          </g>
                        </g>
                      );
                    })}
                  </g>
                )}

                {/* Bench Dock Virtual Instrument Probe Leads & Badges */}
                {[
                  { nodeId: dockScopeCh1NodeId, tag: "XSC CH1", color: "#facc15", dy: -22, dx: -16 },
                  { nodeId: dockScopeCh2NodeId, tag: "XSC CH2", color: "#22d3ee", dy: -22, dx: 24 },
                  { nodeId: dockDmmPosNodeId, tag: "XMM V+", color: "#38bdf8", dy: 28, dx: -18 },
                  { nodeId: dockDmmComNodeId, tag: "XMM COM", color: "#94a3b8", dy: 28, dx: 26 },
                  {
                    nodeId: dockSigGen.enabled ? dockSigGen.nodeId : null,
                    tag: `XFG ${dockSigGen.waveform.slice(0, 3)}`,
                    color: "#f59e0b",
                    dy: -38,
                    dx: 0,
                  },
                ].map((probeLead) => {
                  if (probeLead.nodeId === null) return null;
                  const targetNode = nodes.find((x) => x.id === probeLead.nodeId);
                  if (!targetNode) return null;
                  const c = getNodeCenter(targetNode);
                  const tx = c.cx + probeLead.dx;
                  const ty = c.cy + probeLead.dy;
                  const bw = probeLead.tag.length * 6 + 14;
                  return (
                    <g key={`dock-probe-${probeLead.tag}-${probeLead.nodeId}`} className="pointer-events-none select-none">
                      <line
                        x1={c.cx}
                        y1={c.cy}
                        x2={tx}
                        y2={ty}
                        stroke={probeLead.color}
                        strokeWidth={2}
                        strokeDasharray="4 2"
                      />
                      <circle cx={c.cx} cy={c.cy} r={4.5} fill={probeLead.color} stroke="#060b16" strokeWidth={1.5} />
                      <g transform={`translate(${tx}, ${ty})`}>
                        <rect
                          x={-bw / 2}
                          y={-9}
                          width={bw}
                          height={18}
                          rx={5}
                          fill="#060b16"
                          stroke={probeLead.color}
                          strokeWidth={1.4}
                          filter={`drop-shadow(0 0 6px ${probeLead.color})`}
                        />
                        <text
                          x={0}
                          y={3}
                          textAnchor="middle"
                          fill={probeLead.color}
                          fontSize="8.5"
                          fontFamily="monospace"
                          fontWeight="bold"
                        >
                          {probeLead.tag}
                        </text>
                      </g>
                    </g>
                  );
                })}

                {/* Floating Snap Coordinate Badge above currently dragged node */}
                {activelyDraggedNodeId !== null && dragCoordBadge && (
                  <g
                    transform={`translate(${dragCoordBadge.x}, ${dragCoordBadge.y - 18})`}
                    className="pointer-events-none select-none"
                  >
                    <rect
                      x={-6}
                      y={-18}
                      width={128}
                      height={20}
                      rx={5}
                      fill="#070e1d"
                      stroke="#06b6d4"
                      strokeWidth="1.2"
                      fillOpacity="0.95"
                    />
                    <text
                      x={58}
                      y={-5}
                      textAnchor="middle"
                      fill="#67e8f9"
                      fontSize="9.5"
                      fontFamily="JetBrains Mono, monospace"
                      fontWeight="bold"
                    >
                      X:{dragCoordBadge.x} Y:{dragCoordBadge.y} ({gridPitch}px)
                    </text>
                  </g>
                )}
                {/* Partner Live Selection Highlight & Cursor Overlay */}
                {pairingSession?.partnerPresence &&
                  (() => {
                    const pp = pairingSession.partnerPresence;
                    const partnerNode =
                      pp.selectedNodeId !== null
                        ? nodes.find((nd) => nd.id === pp.selectedNodeId) || null
                        : null;
                    const pColor =
                      pp.color ||
                      (pairingSession.role === "host" ? GUEST_COLOR : HOST_COLOR);
                    return (
                      <g className="pointer-events-none select-none">
                        {partnerNode &&
                          (() => {
                            const comp = COMP_SPECS[partnerNode.type];
                            const spec = GATE_SPECS[partnerNode.type];
                            const w =
                              partnerNode.type === "INPUT" ||
                              partnerNode.type === "OUTPUT"
                                ? 56
                                : comp
                                  ? comp.w
                                  : spec?.outX || 75;
                            const h = comp ? comp.h : 50;
                            return (
                              <g
                                transform={`translate(${partnerNode.x - 6}, ${partnerNode.y - 6})`}
                              >
                                <rect
                                  x={0}
                                  y={0}
                                  width={w + 12}
                                  height={h + 12}
                                  rx={8}
                                  fill="none"
                                  stroke={pColor}
                                  strokeWidth={2}
                                  strokeDasharray="5 3"
                                />
                                <rect
                                  x={0}
                                  y={-18}
                                  width={Math.max(
                                    64,
                                    Math.min(148, pp.displayName.length * 6.5 + 16)
                                  )}
                                  height={15}
                                  rx={3}
                                  fill="#0B1220"
                                  stroke={pColor}
                                  strokeWidth={1}
                                />
                                <text
                                  x={6}
                                  y={-8}
                                  fill={pColor}
                                  fontSize="9"
                                  fontFamily="JetBrains Mono, monospace"
                                  fontWeight="bold"
                                >
                                  {pp.displayName.slice(0, 18)}
                                </text>
                              </g>
                            );
                          })()}

                        {pp.online &&
                          pp.cursorX !== null &&
                          pp.cursorY !== null && (
                            <g transform={`translate(${pp.cursorX}, ${pp.cursorY})`}>
                              <path
                                d="M 0 0 L 0 16 L 4.5 12 L 8.5 19 L 11 17.5 L 7 10.5 L 13 10.5 Z"
                                fill={pColor}
                                stroke="#0B1220"
                                strokeWidth={1.2}
                              />
                              <rect
                                x={14}
                                y={12}
                                width={Math.max(
                                  58,
                                  Math.min(145, pp.displayName.length * 6.5 + 14)
                                )}
                                height={17}
                                rx={4}
                                fill="#0B1220"
                                stroke={pColor}
                                strokeWidth={1}
                                fillOpacity={0.94}
                              />
                              <text
                                x={20}
                                y={23}
                                fill={pColor}
                                fontSize="9.5"
                                fontFamily="JetBrains Mono, monospace"
                                fontWeight="bold"
                              >
                                {pp.displayName.slice(0, 18)}
                              </text>
                            </g>
                          )}
                      </g>
                    );
                  })()}
              </g>
            </svg>
              )}

            {lab3DMode !== "OFF" && (
              <div
                className={
                  lab3DMode === "ONLY_3D"
                    ? "absolute inset-0 z-20 p-2 bg-[#060a14]"
                    : "border-t border-slate-800 p-2 bg-[#060a14]"
                }
              >
                <CircuitLab3DView
                  title="CircuitLab Live 3D WebGL Bench"
                  isRunning={isSimRunning}
                  selectedNodeId={selected?.type === "node" ? selected.id : null}
                  supplyVoltageV={analogSolution.sourceVoltageV || 5}
                  className={lab3DMode === "ONLY_3D" ? "!h-full" : "!h-[340px]"}
                  nodes={nodes.map((n) => {
                    const out0 = liveVals[n.id]?.[0] ?? 0;
                    const telem = analogSolution?.compTelemetry?.get(n.id);
                    const currentMa = telem?.current_mA ?? (telem?.isConducting ? 12 : 0);
                    const pinV = analogSolution?.getPinVoltage?.(n.id, 0) ?? (out0 === 1 ? 5 : 0);
                    const isInputType =
                      n.type === "INPUT" ||
                      n.type === "SWITCH_SPST" ||
                      n.type === "SWITCH_SPDT" ||
                      n.type.includes("BUTTON");
                    const segments =
                      n.type === "7SEG"
                        ? [0, 1, 2, 3, 4, 5, 6].map(
                            (idx) => getInputVal(n.id, idx, liveVals, liveWireMap, 0) === 1
                          )
                        : undefined;
                    const inputDriven =
                      n.type === "OUTPUT" || n.type === "LED" || n.type === "BUZZER"
                        ? getInputVal(n.id, 0, liveVals, liveWireMap, 0) === 1
                        : false;
                    return {
                      id: n.id,
                      type: n.type,
                      label: n.label || n.type,
                      x: n.x,
                      y: n.y,
                      value:
                        n.analogParams?.resistanceOhms ??
                        n.analogParams?.dcVoltageV ??
                        n.value ??
                        0,
                      isHigh:
                        n.type === "INPUT"
                          ? (n.value ?? 0) === 1
                          : out0 === 1 || inputDriven || Math.abs(currentMa) > 0.5,
                      currentMa,
                      voltageV: pinV,
                      segments,
                      isInteractive: isInputType,
                    };
                  })}
                  wires={wires.map((w) => {
                    const fromHigh = (liveVals[w.from.node]?.[w.from.port] ?? 0) === 1;
                    const telFrom = analogSolution?.compTelemetry?.get(w.from.node);
                    const telTo = analogSolution?.compTelemetry?.get(w.to.node);
                    const cur = Math.max(
                      Math.abs(telFrom?.current_mA ?? 0),
                      Math.abs(telTo?.current_mA ?? 0)
                    );
                    return {
                      id: w.id,
                      fromId: w.from.node,
                      toId: w.to.node,
                      isEnergized: isSimRunning && (fromHigh || cur > 0.2),
                      currentMa: cur || (fromHigh ? 10 : 0),
                    };
                  })}
                  onSelectNode={(id) => {
                    const numId = Number(id);
                    setSelected({ type: "node", id: numId });
                    setSelectedNodeIds([numId]);
                  }}
                  onToggleInteractiveNode={(id) => {
                    const numId = Number(id);
                    setNodes((prev) =>
                      prev.map((n) =>
                        n.id === numId ? { ...n, value: n.value === 1 ? 0 : 1 } : n
                      )
                    );
                  }}
                />
              </div>
            )}

            {/* Top-Left Canvas Controls Overlay (2D Schematic Mode) */}
            {!isCinematic3DView && (
            <div className="absolute left-2.5 sm:left-3.5 top-2.5 sm:top-3 z-10 flex flex-wrap items-center gap-1.5 sm:gap-2 max-w-[calc(100vw-3rem)] sm:max-w-none">
              <button
                type="button"
                onClick={() => setShowCanvasHUD((v) => !v)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium border transition-colors cursor-pointer shadow-lg backdrop-blur-md ${
                  showCanvasHUD
                    ? "bg-[#0B0F19]/90 border-cyan-500/50 text-cyan-300 hover:border-cyan-400"
                    : "bg-[#0B0F19]/80 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700"
                }`}
                title="Toggle on-canvas Floating HUD: Gate Count, Propagation Delay, Truth Table & Timing"
              >
                <Cpu className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span className="hidden sm:inline">Gate & Timing HUD</span>
                <span className="sm:hidden">HUD</span>
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    showCanvasHUD
                      ? "bg-emerald-400 animate-pulse"
                      : "bg-slate-600"
                  }`}
                />
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsSignalTraceEnabled((v) => !v);
                  if (!isSignalTraceEnabled && selected?.type === "node") {
                    setSignalTraceNodeId(selected.id);
                  }
                }}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium border transition-colors cursor-pointer shadow-lg backdrop-blur-md ${
                  isSignalTraceEnabled
                    ? "bg-[#0B0F19]/90 border-cyan-500/50 text-cyan-300 hover:border-cyan-400"
                    : "bg-[#0B0F19]/80 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700"
                }`}
                title="Toggle Real-Time Signal Trace Visualizer (highlights current flow path with animated particles)"
              >
                <Zap className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span className="hidden sm:inline">Signal Trace</span>
                <span className="sm:hidden">Trace</span>
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isSignalTraceEnabled && signalTraceNodeId !== null
                      ? "bg-cyan-400 animate-pulse"
                      : isSignalTraceEnabled
                      ? "bg-slate-500"
                      : "bg-slate-700"
                  }`}
                />
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowTimingDiagramOverlay((prev) => {
                    const next = !prev;
                    if (next) {
                      if (selectedNodeIdsForTiming.length === 0 && nodes.length > 0) {
                        setSelectedNodeIdsForTiming(nodes.map((n) => n.id));
                      }
                      setIsTimingCapturePaused(false);
                      record500msTransitionSnapshot(nodes, liveVals, true);
                    }
                    return next;
                  });
                }}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium border transition-colors cursor-pointer shadow-lg backdrop-blur-md ${
                  showTimingDiagramOverlay
                    ? "bg-[#0B0F19]/92 border-cyan-400 text-cyan-200"
                    : "bg-[#0B0F19]/85 hover:bg-[#121c32] border-cyan-500/40 text-cyan-300 hover:text-white"
                }`}
                title="Toggle Timing Diagram Overlay (500ms rolling HIGH/LOW state transitions)"
              >
                <Activity className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span className="hidden sm:inline">Timing Diagram</span>
                <span className="sm:hidden">Timing</span>
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    showTimingDiagramOverlay ? "bg-[#48C99A]" : "bg-slate-600"
                  }`}
                />
              </button>

              {/* Canvas Zoom & Fit to Screen Controls (Compact & Adorable sizing) */}
              <div className="flex items-center bg-[#0B0F19]/90 border border-cyan-500/30 rounded-lg p-0.5 shadow-lg backdrop-blur-md text-xs font-mono">
                <button
                  type="button"
                  onClick={() => handleZoom(-0.1)}
                  className="p-1.5 min-w-[28px] min-h-[28px] flex items-center justify-center text-slate-400 hover:text-cyan-300 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                  title="Zoom Out (Smaller adorable component size) [Ctrl + Wheel]"
                >
                  <ZoomOut className="w-3.5 h-3.5 text-cyan-400" />
                </button>
                <button
                  type="button"
                  onClick={() => setCanvasZoom(0.85)}
                  className="px-2 py-1 text-[11px] font-bold text-cyan-300 hover:text-white transition-colors cursor-pointer"
                  title="Reset to Compact & Fine View (85%)"
                >
                  {Math.round(canvasZoom * 100)}%
                </button>
                <button
                  type="button"
                  onClick={() => handleZoom(0.1)}
                  className="p-1.5 min-w-[28px] min-h-[28px] flex items-center justify-center text-slate-400 hover:text-cyan-300 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                  title="Zoom In [Ctrl + Wheel]"
                >
                  <ZoomIn className="w-3.5 h-3.5 text-cyan-400" />
                </button>
                <div className="h-4 w-px bg-slate-800 mx-0.5" />
                <button
                  type="button"
                  onClick={handleFitToView}
                  className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-emerald-300 hover:bg-emerald-500/20 rounded transition-colors cursor-pointer"
                  title="Fit All: Automatically center and scale the circuit adorably on screen"
                >
                  <Maximize2 className="w-3 h-3 text-emerald-400" />
                  <span>Fit All</span>
                </button>
                <div className="h-4 w-px bg-slate-800 mx-0.5" />
                <button
                  type="button"
                  onClick={() => setIsBoardLocked((v) => !v)}
                  className={`inline-flex items-center gap-1 px-2 py-1 text-[11px] font-bold rounded transition-colors cursor-pointer ${
                    isBoardLocked
                      ? "bg-amber-500/20 text-amber-200 border border-amber-400/60"
                      : "bg-emerald-500/20 text-emerald-200 border border-emerald-400/60"
                  }`}
                  title={isBoardLocked ? "Locked on current view — click to unlock & move ahead/forth" : "Unlocked — click to lock current view"}
                >
                  {isBoardLocked ? <Lock className="w-3 h-3 text-amber-300" /> : <Unlock className="w-3 h-3 text-emerald-300" />}
                  <span>{isBoardLocked ? "Locked" : "Unlocked"}</span>
                </button>
                <div className="h-4 w-px bg-slate-800 mx-0.5" />
                <button
                  type="button"
                  onClick={() => setIsPinViewEnabled((v) => !v)}
                  className={`inline-flex items-center gap-1 px-2 py-1 text-[11px] font-bold rounded transition-colors cursor-pointer ${
                    isPinViewEnabled
                      ? "bg-cyan-500/25 text-cyan-200 border border-cyan-400/60"
                      : "text-slate-300 hover:text-white hover:bg-slate-800"
                  }`}
                  title="Pin View: Lock component canvas on screen & prevent accidental page scrolling"
                >
                  {isPinViewEnabled ? <Pin className="w-3 h-3 text-cyan-300" /> : <PinOff className="w-3 h-3 text-slate-400" />}
                  <span>{isPinViewEnabled ? "Pinned" : "Pin View"}</span>
                </button>
              </div>
            </div>
            )}

            {/* Selected Element Quick Action Capsule (Never automatically opens component editor!) */}
            {selected && (
              <div
                className={`absolute right-3.5 z-20 flex items-center gap-1.5 bg-[#0b101c]/95 border border-cyan-500/40 px-2.5 py-1.5 rounded-xl shadow-2xl backdrop-blur-md text-xs font-mono animate-in fade-in ${
                  isCinematic3DView ? "top-14" : "top-3"
                }`}
              >
                <span className="text-slate-200 font-bold px-1.5 py-0.5 rounded bg-slate-800 text-[11px]">
                  {selected.type === "node"
                    ? `${nodes.find((n) => n.id === selected.id)?.label || nodes.find((n) => n.id === selected.id)?.type || "Component"} #${selected.id}`
                    : `Wire #${selected.id}`}
                </span>

                {selected.type === "node" && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setIsSignalTraceEnabled(true);
                        setSignalTraceNodeId(selected.id);
                      }}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-bold cursor-pointer transition-colors ${
                        signalTraceNodeId === selected.id && isSignalTraceEnabled
                          ? "bg-cyan-500/30 text-cyan-200 border border-cyan-400"
                          : "bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40"
                      }`}
                      title="Trace current flow path and animated particles through this component"
                    >
                      <Zap className="w-3 h-3 text-cyan-400" />
                      <span>{signalTraceNodeId === selected.id && isSignalTraceEnabled ? "Tracing Net" : "Trace Net"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!selectedNodeIdsForTiming.includes(selected.id)) {
                          setSelectedNodeIdsForTiming((prev) => [...prev, selected.id]);
                        }
                        setIsTimingCapturePaused(false);
                        record500msTransitionSnapshot(nodes, liveVals, true);
                        setShowTimingDiagramOverlay(true);
                      }}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 text-[11px] font-bold cursor-pointer transition-colors"
                      title="Monitor this node in the 500ms Timing Diagram Overlay"
                    >
                      <Activity className="w-3 h-3 text-cyan-400" />
                      <span>Timing</span>
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => setIsPropertySidebarOpen(true)}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-[11px] cursor-pointer transition-colors"
                  title="Open Property Editor if you wish to adjust parameters"
                >
                  <Sliders className="w-3 h-3 text-slate-400" />
                  <span>Properties</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (selected.type === "node") {
                      removeNode(selected.id);
                    } else {
                      removeWire(selected.id);
                    }
                    setSelected(null);
                    setIsPropertySidebarOpen(false);
                  }}
                  className="p-1 rounded bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/50 cursor-pointer transition-colors"
                  title="Delete selected item"
                >
                  <Trash2 className="w-3 h-3" />
                </button>

                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer transition-colors"
                  title="Deselect"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* Real-Time Signal Trace Visualizer HUD */}
            {isSignalTraceEnabled && tracedSignalNet && (
              <div
                className={`absolute ${
                  selected ? "top-14" : "top-3"
                } right-3.5 z-20 w-80 sm:w-96 bg-[#090d16]/95 border border-cyan-500/40 rounded-xl shadow-2xl backdrop-blur-md overflow-hidden transition-all text-xs font-mono`}
              >
                {/* Header */}
                <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-cyan-950/60 to-slate-900 border-b border-cyan-500/30">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                    </span>
                    <span className="font-bold text-white tracking-wider flex items-center gap-1.5 text-[11.5px]">
                      <Zap className="w-3.5 h-3.5 text-cyan-400" />
                      SIGNAL TRACE VISUALIZER
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setIsSignalTraceHudMinimized((v) => !v)}
                      className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer"
                      title={isSignalTraceHudMinimized ? "Expand HUD" : "Minimize HUD"}
                    >
                      {isSignalTraceHudMinimized ? (
                        <Maximize2 className="w-3 h-3" />
                      ) : (
                        <Minimize2 className="w-3 h-3" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSignalTraceNodeId(null)}
                      className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                      title="Clear Signal Trace"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {!isSignalTraceHudMinimized && (
                  <div className="p-3 space-y-2.5">
                    {/* Active Root Component Telemetry */}
                    <div className="flex items-center justify-between bg-slate-900/80 border border-slate-800 rounded-lg p-2">
                      <div>
                        <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                          Origin Component
                        </div>
                        <div className="font-bold text-cyan-300 text-xs">
                          {tracedSignalNet.rootNode.label ||
                            `${tracedSignalNet.rootNode.type} #${tracedSignalNet.rootNodeId}`}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                          Potential & State
                        </div>
                        <div className="font-bold text-emerald-400 text-xs">
                          {tracedSignalNet.voltage.toFixed(2)} V{" "}
                          <span className="text-[10px] text-slate-400">
                            (
                            {tracedSignalNet.logicState === "ANALOG"
                              ? "ANALOG"
                              : tracedSignalNet.logicState === 1
                              ? "HIGH"
                              : "LOW"}
                            )
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Net Metrics Grid */}
                    <div className="grid grid-cols-3 gap-1.5 text-center">
                      <div className="bg-slate-900/60 border border-slate-800/80 rounded p-1.5">
                        <div className="text-[9px] text-slate-400 uppercase">Loop Current</div>
                        <div className="font-bold text-amber-300 text-xs mt-0.5">
                          {tracedSignalNet.currentMa.toFixed(1)} mA
                        </div>
                      </div>
                      <div className="bg-slate-900/60 border border-slate-800/80 rounded p-1.5">
                        <div className="text-[9px] text-slate-400 uppercase">Net Units</div>
                        <div className="font-bold text-cyan-300 text-xs mt-0.5">
                          {tracedSignalNet.tracedNodeIds.size} nodes
                        </div>
                      </div>
                      <div className="bg-slate-900/60 border border-slate-800/80 rounded p-1.5">
                        <div className="text-[9px] text-slate-400 uppercase">Wires Traced</div>
                        <div className="font-bold text-purple-300 text-xs mt-0.5">
                          {tracedSignalNet.tracedWireIds.size} wires
                        </div>
                      </div>
                    </div>

                    {/* Circuit Continuity & Status */}
                    <div className="flex items-center justify-between text-[11px] px-2 py-1 bg-slate-900/40 rounded border border-slate-800">
                      <span className="text-slate-400">Circuit Continuity:</span>
                      <span
                        className={`font-semibold flex items-center gap-1 ${
                          tracedSignalNet.isClosedLoop
                            ? "text-emerald-400"
                            : "text-amber-400"
                        }`}
                      >
                        {tracedSignalNet.isClosedLoop ? (
                          <>
                            <CheckCircle2 className="w-3 h-3" /> Closed Conducting Loop
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-3 h-3" /> Branch / Unterminated
                          </>
                        )}
                      </span>
                    </div>

                    {/* Interconnected Component Flow Path Badges */}
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-1">
                        Interconnected Signal Path:
                      </div>
                      <div className="flex flex-wrap items-center gap-1 max-h-20 overflow-y-auto p-1 bg-slate-950/60 rounded border border-slate-800/80 scrollbar-thin">
                        {tracedSignalNet.connectedComponents.map((comp, idx) => (
                          <React.Fragment key={comp.id}>
                            <button
                              type="button"
                              onClick={() => {
                                setSelected({ type: "node", id: comp.id });
                                setSignalTraceNodeId(comp.id);
                              }}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                                comp.isRoot
                                  ? "bg-amber-500/20 text-amber-300 border-amber-500/50"
                                  : "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700"
                              }`}
                              title={`Focus ${comp.label} (${comp.voltage.toFixed(2)}V)`}
                            >
                              {comp.label}
                            </button>
                            {idx < tracedSignalNet.connectedComponents.length - 1 && (
                              <span className="text-cyan-500 text-[10px]">➔</span>
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>

                    {/* Flow Particle Speed Selector & Clear Button */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[10px]">
                      <div className="flex items-center gap-1 text-slate-400">
                        <span>Speed:</span>
                        {[0.5, 1.0, 2.0].map((spd) => (
                          <button
                            key={spd}
                            type="button"
                            onClick={() => setSignalTraceSpeed(spd)}
                            className={`px-1.5 py-0.5 rounded font-mono font-bold transition-colors cursor-pointer ${
                              signalTraceSpeed === spd
                                ? "bg-cyan-500/30 text-cyan-300 border border-cyan-400"
                                : "bg-slate-800 hover:bg-slate-700 text-slate-400"
                            }`}
                          >
                            {spd}x
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSignalTraceNodeId(null)}
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                        >
                          Clear
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsSignalTraceEnabled(false);
                            setSignalTraceNodeId(null);
                          }}
                          className="px-2 py-1 rounded bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/40 transition-colors cursor-pointer"
                        >
                          Disable
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Hovering Probe Telemetry HUD near active probe points (Voltage & High/Low/Z state) */}
            {!isCinematic3DView && probedWireSignals.length > 0 && isProbeHoverHudVisible && (
              <ActiveProbeHoverHUD
                probedSignals={probedWireSignals}
                probeScreenPoints={probeScreenPoints}
                viewportSize={canvasViewportSize}
                isSimRunning={isSimRunning}
                hoveredChannel={hoveredProbeChannel}
                onHoverChannel={setHoveredProbeChannel}
                onFocusProbeWire={(wireId) => {
                  setSelected({ type: "wire", id: wireId });
                  setSelectedWireIds([wireId]);
                }}
                onRemoveProbe={(ch) =>
                  setAttachedProbes((prev) => prev.filter((p) => p.channelId !== ch))
                }
                onOpenScopePopup={() => setIsProbePopupOpen(true)}
                onHideHud={() => setIsProbeHoverHudVisible(false)}
              />
            )}

            {/* Compact restore chip when Probe Hover HUD is hidden while probes remain attached */}
            {!isCinematic3DView && probedWireSignals.length > 0 && !isProbeHoverHudVisible && (
              <button
                type="button"
                onClick={() => setIsProbeHoverHudVisible(true)}
                className="absolute right-3 bottom-12 z-20 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#070d1a]/92 border border-cyan-500/50 text-cyan-200 hover:text-white hover:border-cyan-400 shadow-lg text-[10.5px] font-mono font-bold cursor-pointer transition-all"
                title="Show Hovering Live Probe HUD"
              >
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
                <span>Live Probe HUD ({probedWireSignals.length})</span>
              </button>
            )}

            {/* On-Canvas Floating Quick View HUD: Live Truth Table, Output Timing & Gate Telemetry */}
            {showCanvasHUD && (
              <FloatingCanvasHUD
                nodes={nodes}
                wires={wires}
                inputNodes={inputNodes}
                outputNodes={outputNodes}
                hasSeq={hasSeq}
                truthRowsData={truthRowsData}
                waveformHistory={waveformHistory}
                signalKeys={signalKeys}
                liveVals={liveVals}
                isSimulationHalted={isSimulationHalted}
                compulsoryViolations={compulsoryViolations}
                onApplyRowInputs={handleApplyRowInputs}
                onStepClock={pulseClockInputs}
                onToggleAutoClock={() => setAutoClock((v) => !v)}
                autoClock={autoClock}
                clockHz={Number((clockHz * simSpeed).toFixed(2))}
                simSpeed={simSpeed}
                onSetSimSpeed={setSimSpeed}
                onClose={() => setShowCanvasHUD(false)}
              />
            )}

            {/* Hovered Wire SPICE Telemetry & Velocity Readout */}
            {!isCinematic3DView && hoveredWireFlow && (
              <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-3 z-25 flex items-center gap-3 rounded-lg bg-[#070d1a]/95 border border-slate-700/80 px-3 py-1.5 shadow-xl font-mono tabular-nums text-[11px] text-slate-200 backdrop-blur-sm">
                <span className="text-cyan-300 font-semibold">
                  W#{hoveredWireFlow.wireId}
                </span>
                <span className="text-slate-500">|</span>
                <span
                  className={
                    hoveredWireFlow.signalState === "SHORT_CIRCUIT"
                      ? "text-rose-400 font-semibold"
                      : hoveredWireFlow.signalState === "FLOATING" || hoveredWireFlow.signalState === "HIGH_Z"
                      ? "text-amber-300"
                      : hoveredWireFlow.signalState === "AC_OSCILLATING"
                      ? "text-rose-300"
                      : hoveredWireFlow.signalState === "CLOCK_PULSE"
                      ? "text-sky-300"
                      : hoveredWireFlow.isAnimated
                      ? "text-emerald-300"
                      : "text-slate-400"
                  }
                >
                  {hoveredWireFlow.stateLabel}
                </span>
                {hoveredWireFlow.frequencyHz > 0 && (
                  <>
                    <span className="text-slate-500">|</span>
                    <span className="text-slate-300">
                      {formatSpiceFreq(hoveredWireFlow.frequencyHz)}
                    </span>
                  </>
                )}
                <span className="text-slate-500">|</span>
                <span className="text-slate-300">
                  {hoveredWireFlow.isAnimated
                    ? `${hoveredWireFlow.velocityPxPerSec} px/s (${hoveredWireFlow.relativeSpeed.toFixed(2)}x) ${
                        hoveredWireFlow.direction === "reverse" ? "←" : "→"
                      }`
                    : "0 px/s (Static)"}
                </span>
              </div>
            )}

            {!isCinematic3DView && !showTimingDiagramOverlay && (
              <div className="absolute left-2.5 sm:left-3.5 bottom-2.5 sm:bottom-3 z-10 bg-[#0B0E17]/90 border border-slate-800 px-3 py-1.5 rounded-lg text-xs text-slate-400 pointer-events-none flex items-center gap-2">
                <span className="hidden md:inline">
                  <strong className="text-cyan-400">Drag</strong> to position ·{" "}
                  <strong className="text-cyan-400">
                    Click Output → Input Pin
                  </strong>{" "}
                  to wire ·{" "}
                  <strong className="text-cyan-400">Click Input Box</strong> to
                  toggle 0/1 · <strong className="text-cyan-400">Del</strong> to
                  remove
                </span>
                <span className="md:hidden flex items-center gap-1.5 text-[11px] text-cyan-300 font-mono font-medium">
                  <Hand className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>Pinch to zoom · 2 fingers to pan</span>
                </span>
              </div>
            )}

            {/* Dedicated Floating Board Lock, Ahead/Back Zoom & Reset Control Capsule on 2D Canvas */}
            {!isCinematic3DView && (
            <div
              className={`absolute right-3 z-20 flex items-center gap-1.5 bg-[#090f1d]/95 border border-cyan-500/45 rounded-xl p-1 shadow-2xl backdrop-blur-md text-[11px] font-mono ${
                showTimingDiagramOverlay ? "bottom-44" : "bottom-3"
              }`}
            >
              <button
                type="button"
                onClick={() => setIsBoardLocked((v) => !v)}
                className={`px-2 py-1 rounded-lg font-bold flex items-center gap-1 cursor-pointer transition-colors border ${
                  isBoardLocked
                    ? "bg-amber-500/20 border-amber-400/60 text-amber-200 hover:bg-amber-500/30"
                    : "bg-emerald-500/20 border-emerald-400/60 text-emerald-200 hover:bg-emerald-500/30"
                }`}
                title={
                  isBoardLocked
                    ? "Board locked at current view. Click to unlock and move ahead/back/forth."
                    : "Board unlocked. Pan/zoom ahead or back, then click to lock current view."
                }
              >
                {isBoardLocked ? <Lock className="w-3 h-3 text-amber-300" /> : <Unlock className="w-3 h-3 text-emerald-300" />}
                <span className="hidden sm:inline">{isBoardLocked ? "Locked View" : "Unlocked"}</span>
              </button>
              {!isBoardLocked && (
                <>
                  <button
                    type="button"
                    onClick={() => handleZoom(-0.12)}
                    className="inline-flex items-center gap-0.5 px-1.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold cursor-pointer transition-colors"
                    title="Move Back (Zoom Out)"
                  >
                    <ZoomOut className="w-3 h-3 text-emerald-300" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleZoom(0.12)}
                    className="inline-flex items-center gap-0.5 px-1.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold cursor-pointer transition-colors"
                    title="Move Ahead (Zoom In)"
                  >
                    <ZoomIn className="w-3 h-3 text-emerald-300" />
                  </button>
                </>
              )}
              <span className="px-1.5 text-cyan-300 font-bold tabular-nums">
                {Math.round(canvasZoom * 100)}%
              </span>
              <button
                type="button"
                onClick={handleResetZoom}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/35 border border-cyan-400/60 text-cyan-200 font-bold cursor-pointer transition-colors"
                title="Reset Zoom to 85% and center schematic view"
              >
                <RotateCcw className="w-3 h-3 text-cyan-300" />
                <span>Reset Zoom</span>
              </button>
            </div>
            )}

            {/* Embedded 500ms Digital Logic Timing Diagram View Overlay */}
            {showTimingDiagramOverlay && (
              <div className="absolute left-3 right-3 bottom-3 z-30">
                <TimingDiagramOverlay
                  isOpen={showTimingDiagramOverlay}
                  onClose={() => setShowTimingDiagramOverlay(false)}
                  nodes={nodes}
                  liveVals={liveVals}
                  monitoredNodeIds={selectedNodeIdsForTiming}
                  onToggleMonitorNode={(nodeId) => {
                    setSelectedNodeIdsForTiming((prev) =>
                      prev.includes(nodeId)
                        ? prev.filter((id) => id !== nodeId)
                        : [...prev, nodeId]
                    );
                  }}
                  onMonitorAllNodes={() => {
                    setSelectedNodeIdsForTiming(nodes.map((n) => n.id));
                  }}
                  onMonitorIOAndClocks={() => {
                    setSelectedNodeIdsForTiming(
                      nodes
                        .filter(
                          (n) =>
                            n.type === "INPUT" ||
                            n.type === "CLOCK" ||
                            n.type === "OUTPUT" ||
                            n.type === "LED" ||
                            n.type === "7SEG"
                        )
                        .map((n) => n.id)
                    );
                  }}
                  onClearMonitoredNodes={() => setSelectedNodeIdsForTiming([])}
                  transitionsHistory={timing500msHistory}
                  windowNowMs={timingWindowNowMs}
                  isCapturePaused={isTimingCapturePaused}
                  onToggleCapturePause={() => setIsTimingCapturePaused((v) => !v)}
                  onClearHistory={() => {
                    record500msTransitionSnapshot(nodes, liveVals, true);
                    setTiming500msHistory((prev) => prev.slice(-1));
                  }}
                  isSimRunning={isSimRunning}
                  autoClock={autoClock}
                  onToggleAutoClock={() => setAutoClock((v) => !v)}
                  clockHz={Number((clockHz * simSpeed).toFixed(2))}
                  onStepClock={pulseClockInputs}
                  onOpenFullDiagramModal={() => setIsTimingDiagramModalOpen(true)}
                />
              </div>
            )}
          </div>

          {/* Visual Diagnostic Tool: Short Circuit & Floating Node HUD Panel */}
          {showOpenCircuitsOverlay && (
            <div className={`border rounded-xl p-3.5 shadow-2xl space-y-3 animate-in fade-in ${
              circuitDiagnosticReport.shortCircuitCount > 0
                ? "bg-[#160b0b] border-red-500/60 shadow-[0_0_20px_rgba(239,68,68,0.25)]"
                : "bg-[#171004] border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.2)]"
            }`}>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                    circuitDiagnosticReport.shortCircuitCount > 0
                      ? "bg-red-500/20 border border-red-500/50 text-red-400"
                      : "bg-amber-500/20 border border-amber-500/40 text-amber-400"
                  }`}>
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
                      Visual Diagnostic Tool
                      <span className="text-[10px] text-slate-400 font-normal">
                        (Live Short Circuit &amp; Floating Node Wire Inspector)
                      </span>
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                      {circuitDiagnosticReport.shortCircuitCount > 0 && (
                        <span className="px-2 py-0.5 rounded bg-red-500/20 border border-red-500/40 text-red-300 text-[10.5px] font-mono font-bold animate-pulse">
                          ⚡ {circuitDiagnosticReport.shortCircuitCount} Short Circuit(s) [Glowing Red]
                        </span>
                      )}
                      {circuitDiagnosticReport.floatingNodeCount > 0 && (
                        <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10.5px] font-mono font-bold">
                          ? {circuitDiagnosticReport.floatingNodeCount} Floating Node(s) [Glowing Amber]
                        </span>
                      )}
                      {openCircuitIssues.length === 0 && (
                        <span className="text-[11px] font-mono text-emerald-400 font-medium">
                          All nets terminated &amp; healthy
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowOpenCircuitsOverlay(false)}
                  className="text-xs font-mono text-slate-400 hover:text-white px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 cursor-pointer transition-colors"
                >
                  Close Inspector ✕
                </button>
              </div>

              {openCircuitIssues.length === 0 ? (
                <div className="flex items-center gap-2 py-1.5 px-3 rounded-lg bg-emerald-950/30 border border-emerald-500/30 text-emerald-300 text-xs font-mono">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>All circuit nodes and wire paths are fully closed and correctly terminated. Zero short circuits or floating pins detected!</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto pr-1">
                  {openCircuitIssues.map((issue) => {
                    const isShort = issue.category === "SHORT_CIRCUIT" || issue.type === "SHORT_CIRCUIT" || issue.type === "OUTPUT_CONTENTION" || issue.type === "BRIDGED_TERMINALS";
                    return (
                      <div
                        key={issue.id}
                        onClick={() => {
                          if (issue.wireIds && issue.wireIds.length > 0) {
                            setSelected({ type: "wire", id: issue.wireIds[0] });
                          } else {
                            setSelected({ type: "node", id: issue.nodeId });
                          }
                          setPan({ x: -issue.x + 360, y: -issue.y + 240 });
                        }}
                        className={`p-2.5 rounded-lg border text-xs font-mono space-y-1.5 cursor-pointer transition-all ${
                          isShort
                            ? "bg-[#1c0808]/90 border-red-500/40 hover:border-red-400 text-red-200 hover:shadow-[0_0_10px_rgba(239,68,68,0.3)]"
                            : "bg-[#130b02]/90 border-amber-500/35 hover:border-amber-400 text-amber-200 hover:shadow-[0_0_10px_rgba(245,158,11,0.25)]"
                        }`}
                        title="Click to pan and focus this fault location"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className={`font-bold flex items-center gap-1.5 text-[11px] ${isShort ? "text-red-300" : "text-amber-300"}`}>
                            <span>{isShort ? "⚡" : "⚠"}</span>
                            <span className="truncate">{issue.title}</span>
                          </span>
                          <span className={`text-[9.5px] px-1.5 py-0.5 rounded font-bold uppercase shrink-0 ${
                            isShort ? "bg-red-950 text-red-400 border border-red-500/40" : "bg-amber-950 text-amber-400 border border-amber-500/40"
                          }`}>
                            {issue.type.replace(/_/g, " ")}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300 leading-relaxed">
                          {issue.description}
                        </p>
                        <div className={`text-[10.5px] p-1.5 rounded font-sans flex items-start gap-1 ${
                          isShort ? "bg-red-950/60 text-red-300 border border-red-900/50" : "bg-amber-950/60 text-amber-300 border border-amber-900/50"
                        }`}>
                          <span className="font-bold shrink-0">Remedy:</span>
                          <span>{issue.remedy}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Sidebar Property Editor on Canvas */}
          {isPropertySidebarOpen && selected && (
            <div className="relative w-80 shrink-0 h-full border-l border-slate-800 bg-[#0c1220]/95 backdrop-blur-md z-20 shadow-2xl overflow-hidden flex flex-col">
              <ComponentPropertySidebar
                isOpen={isPropertySidebarOpen}
                onClose={() => setIsPropertySidebarOpen(false)}
                selectedItem={selected}
                nodes={nodes}
                wires={wires}
                liveVals={liveVals}
                analogSolution={analogSolution}
                onUpdateNode={(id, updates) => updateNode(id, updates)}
                onDeleteNode={(id) => {
                  removeNode(id);
                  setIsPropertySidebarOpen(false);
                }}
                onDeleteWire={(id) => {
                  removeWire(id);
                  setIsPropertySidebarOpen(false);
                }}
                onDuplicateNode={(n) => {
                  addNodeAt(n.type, n.x + 35, n.y + 35);
                }}
                onSnapNodeToGrid={(id) => {
                  setNodes((nds) =>
                    nds.map((nd) => {
                      if (nd.id !== id) return nd;
                      return {
                        ...nd,
                        x: Math.round(nd.x / gridPitch) * gridPitch,
                        y: Math.round(nd.y / gridPitch) * gridPitch,
                      };
                    })
                  );
                }}
                onAttachProbeToWire={(wireId) => {
                  const nextCh =
                    PROBE_CHANNELS.find(
                      (ch) =>
                        !attachedProbes.some((p) => p.channelId === ch.channelId)
                    )?.channelId || "CH1";
                  attachProbeToWire(nextCh, wireId);
                }}
                onRotateNode={(id) => handleRotateNode(id)}
                onInspectComponent={(type) => setInspectingComponentId(type)}
                onOpenPmeGuide={(type) => {
                  setPmeModalMeterType(type || "DIAGNOSTICS");
                  setIsPmeModalOpen(true);
                }}
              />
            </div>
          )}
        </div>

        {/* Multi-Channel Digital Logic Analyzer Overlay */}
        {showLogicAnalyzerOverlay && (
          <LogicAnalyzerOverlay
            isOpen={showLogicAnalyzerOverlay}
            onClose={() => setShowLogicAnalyzerOverlay(false)}
            nets={logicNetsList}
            selectedWireIds={selectedWireIdsForAnalyzer}
            onToggleSelectNet={(wireId) => {
              setSelectedWireIdsForAnalyzer((prev) =>
                prev.includes(wireId)
                  ? prev.filter((id) => id !== wireId)
                  : [...prev, wireId]
              );
            }}
            onSelectAllNets={() => {
              setSelectedWireIdsForAnalyzer(wires.map((w) => w.id));
            }}
            onClearSelectedNets={() => {
              setSelectedWireIdsForAnalyzer([]);
            }}
            onSelectInputsOnly={() => {
              const inputWireIds = wires
                .filter((w) =>
                  nodes.find((n) => n.id === w.from.node)?.type === "INPUT"
                )
                .map((w) => w.id);
              setSelectedWireIdsForAnalyzer(inputWireIds);
            }}
            onSelectOutputsOnly={() => {
              const outputWireIds = wires
                .filter((w) =>
                  nodes.find((n) => n.id === w.to.node)?.type === "OUTPUT"
                )
                .map((w) => w.id);
              setSelectedWireIdsForAnalyzer(outputWireIds);
            }}
            history={analyzerHistory}
            autoClock={autoClock}
            onToggleAutoClock={() => setAutoClock((v) => !v)}
            clockHz={clockHz}
            onStepClock={pulseClockInputs}
            onClearHistory={() => setAnalyzerHistory([])}
            onOpenFullAnalyzerModal={() => setIsFullLogicAnalyzerOpen(true)}
          />
        )}

          {/* Compact Bottom Engineering Results Console Toggle Bar (Always accessible) */}
          <div className="bg-[#111B2B] border border-[#24344D] rounded-xl px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
            <div className="flex flex-wrap items-center gap-3">
              <span className={isSimRunning ? "text-[#48C99A] font-bold" : "text-[#F1B65B] font-bold"}>
                {isSimRunning ? "STATUS: RUNNING" : "STATUS: IDLE / STANDBY"}
              </span>
              <span className="text-[#5E708A]" aria-hidden="true">|</span>
              <span className="text-[#9BAAC0] tabular-nums">
                Nets: <strong className="text-[#F1F5FA]">{wires.length}</strong>
              </span>
              <span className="text-[#9BAAC0] tabular-nums">
                Open/Faults:{" "}
                <strong className={openCircuitIssues.length > 0 ? "text-[#F1B65B]" : "text-[#48C99A]"}>
                  {openCircuitIssues.length}
                </strong>
              </span>
              <span className="text-[#9BAAC0] tabular-nums">
                KCL: <strong className={analogSolution.kclSatisfied ? "text-[#48C99A]" : "text-[#F07474]"}>
                  {analogSolution.kclSatisfied ? "PASS" : "CHECK"}
                </strong>
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setBottomInstrumentTab("BENCH_DOCK");
                  setIsInstrumentsDrawerOpen(true);
                }}
                className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold cursor-pointer ${
                  bottomInstrumentTab === "BENCH_DOCK" && isInstrumentsDrawerOpen
                    ? "bg-cyan-500/25 border-cyan-400 text-cyan-200"
                    : "bg-[#162338] hover:bg-[#1C2B40] border-[#24344D] text-cyan-300"
                }`}
              >
                Bench Instruments (DSO · DMM · XFG)
              </button>
              <button
                type="button"
                onClick={() => {
                  setBottomInstrumentTab("DIAGNOSTICS");
                  setIsInstrumentsDrawerOpen(true);
                }}
                className="px-2.5 py-1 rounded-lg bg-[#162338] hover:bg-[#1C2B40] border border-[#24344D] text-[11px] text-[#F1F5FA] cursor-pointer"
              >
                Diagnostics ({openCircuitIssues.length + compulsoryViolations.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setBottomInstrumentTab("MNA_NETLIST");
                  setIsInstrumentsDrawerOpen(true);
                }}
                className="px-2.5 py-1 rounded-lg bg-[#162338] hover:bg-[#1C2B40] border border-[#24344D] text-[11px] text-[#35BDF2] cursor-pointer"
              >
                MNA Node Voltages
              </button>
              <button
                type="button"
                onClick={() => setIsInstrumentsDrawerOpen((v) => !v)}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-[#35BDF2] hover:bg-[#58CAF5] text-[#0B1220] font-bold text-[11px] cursor-pointer"
              >
                {isInstrumentsDrawerOpen ? (
                  <>
                    <ChevronDown className="w-3.5 h-3.5" />
                    <span>Collapse Dock</span>
                  </>
                ) : (
                  <>
                    <ChevronUp className="w-3.5 h-3.5" />
                    <span>Open Instrument Dock</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Resizable & Collapsible Bottom Engineering Results & Virtual Instruments Dock */}
          {isInstrumentsDrawerOpen && (
            <div className="bg-[#111B2B] border border-[#24344D] rounded-xl overflow-hidden shadow-2xl">
              {/* Top Height Resize Handle */}
              <div
                onPointerDown={handleStartConsoleResize}
                className="h-3 bg-[#162338] hover:bg-[#35BDF2]/25 border-b border-[#24344D] flex items-center justify-center gap-2 cursor-ns-resize select-none"
                title="Drag vertically to resize Instrument Dock height (180px – 560px)"
              >
                <span className="w-12 h-1 rounded-full bg-[#3A4D6B]" />
                <span className="text-[9px] font-mono text-[#9BAAC0] uppercase">Drag to Resize Dock ({bottomConsoleHeight}px)</span>
                <span className="w-12 h-1 rounded-full bg-[#3A4D6B]" />
              </div>

              <div className="p-4 space-y-4">
              {/* Header with Title and Tab Switcher */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#24344D] pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#162338] border border-[#24344D] flex items-center justify-center">
                    <Activity className="w-4 h-4 text-[#35BDF2]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#F1F5FA] flex items-center gap-2 font-mono">
                      <span>Engineering Results &amp; Virtual Instruments Dock</span>
                    </h3>
                    <p className="text-xs text-[#9BAAC0] font-sans">
                      Snap Oscilloscope (XSC1), DMM (XMM1), &amp; Signal Generator (XFG1) to nodes while circuit stays visible ({bottomConsoleHeight}px)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsBottomConsoleSplit((v) => !v)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold border transition-colors cursor-pointer ${
                      isBottomConsoleSplit
                        ? "bg-cyan-500/20 border-cyan-400 text-cyan-200"
                        : "bg-[#162338] border-[#24344D] text-[#9BAAC0] hover:text-[#F1F5FA]"
                    }`}
                    title="Toggle side-by-side split view with Truth Table"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Split with Truth Table</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsInstrumentsDrawerOpen(false)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold bg-[#162338] hover:bg-[#1C2B40] border border-[#24344D] text-[#9BAAC0] hover:text-[#F1F5FA] cursor-pointer transition-colors"
                    title="Collapse Instrument Dock to maximize canvas area"
                  >
                    <X className="w-4 h-4 text-[#9BAAC0]" />
                    <span>Collapse</span>
                  </button>
                </div>
              </div>

              {/* Instrument & Engineering Console Switcher Tabs Bar */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setBottomInstrumentTab("BENCH_DOCK")}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                    bottomInstrumentTab === "BENCH_DOCK"
                      ? "bg-cyan-500/25 border border-cyan-400 text-cyan-200 shadow-[0_0_12px_rgba(34,211,238,0.3)]"
                      : "bg-[#162338] hover:bg-[#1C2B40] text-[#9BAAC0] hover:text-[#F1F5FA] border border-[#24344D]"
                  }`}
                >
                  <Gauge className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Bench Instruments (DSO · DMM · XFG)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setBottomInstrumentTab("DIAGNOSTICS")}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                    bottomInstrumentTab === "DIAGNOSTICS"
                      ? "bg-[#35BDF2]/20 border border-[#35BDF2] text-[#F1F5FA]"
                      : "bg-[#162338] hover:bg-[#1C2B40] text-[#9BAAC0] hover:text-[#F1F5FA] border border-[#24344D]"
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-[#F1B65B]" />
                  <span>Diagnostics ({openCircuitIssues.length + compulsoryViolations.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setBottomInstrumentTab("MNA_NETLIST")}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                    bottomInstrumentTab === "MNA_NETLIST"
                      ? "bg-[#35BDF2]/20 border border-[#35BDF2] text-[#F1F5FA]"
                      : "bg-[#162338] hover:bg-[#1C2B40] text-[#9BAAC0] hover:text-[#F1F5FA] border border-[#24344D]"
                  }`}
                >
                  <Cpu className="w-3.5 h-3.5 text-[#48C99A]" />
                  <span>MNA Voltages ({analogSolution.netVoltages.size})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setBottomInstrumentTab("TIMING_DIAGRAM")}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                    bottomInstrumentTab === "TIMING_DIAGRAM"
                      ? "bg-cyan-500/25 border border-cyan-400 text-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.35)]"
                      : "bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-white border border-slate-800"
                  }`}
                >
                  <Activity className="w-4 h-4 text-cyan-400" />
                  <span>Logic Timing Diagram</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-cyan-950 border border-cyan-700 text-cyan-300">
                    {selectedNodeIdsForTiming.length} Traces
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setBottomInstrumentTab("LOGIC_ANALYZER")}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                    bottomInstrumentTab === "LOGIC_ANALYZER"
                      ? "bg-cyan-500/25 border border-cyan-400 text-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.35)]"
                      : "bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-white border border-slate-800"
                  }`}
                >
                  <Activity className="w-4 h-4 text-cyan-400" />
                  <span>Multi-Channel Logic Analyzer</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-cyan-950 border border-cyan-700 text-cyan-300">
                    {selectedWireIdsForAnalyzer.length} Armed
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setBottomInstrumentTab("OSCILLOSCOPE")}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                    bottomInstrumentTab === "OSCILLOSCOPE"
                      ? "bg-purple-500/25 border border-purple-400 text-purple-200 shadow-[0_0_12px_rgba(168,85,247,0.35)]"
                      : "bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-white border border-slate-800"
                  }`}
                >
                  <Crosshair className="w-4 h-4 text-purple-400" />
                  <span>Storage Oscilloscope</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-purple-950 border border-purple-700 text-purple-300">
                    Cursors
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setBottomInstrumentTab("PROBE")}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                    bottomInstrumentTab === "PROBE"
                      ? "bg-amber-500/25 border border-amber-400 text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.35)]"
                      : "bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-white border border-slate-800"
                  }`}
                >
                  <Sliders className="w-4 h-4 text-amber-400" />
                  <span>Signal Path Probe</span>
                </button>

                <button
                  type="button"
                  onClick={() => setBottomInstrumentTab("TRUTH_TABLE")}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                    bottomInstrumentTab === "TRUTH_TABLE"
                      ? "bg-emerald-500/25 border border-emerald-400 text-emerald-200 shadow-[0_0_12px_rgba(16,185,129,0.35)]"
                      : "bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-white border border-slate-800"
                  }`}
                >
                  <Table className="w-4 h-4 text-emerald-400" />
                  <span>Circuit Truth Table</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-950 border border-emerald-700 text-emerald-300">
                    {truthRowsData.length} Rows
                  </span>
                </button>
              </div>

              <div style={{ maxHeight: `${bottomConsoleHeight}px` }} className="overflow-y-auto pr-1">
              {(bottomInstrumentTab === "DIAGNOSTICS" || bottomInstrumentTab === "MNA_NETLIST") && !isBottomConsoleSplit && (
                <SimulationErrorBoundary
                  contextLabel="CircuitLab MNA Solver"
                  validationErrors={analogSolution.validationErrors.map((msg) => ({
                    message: msg,
                    severity: "ERROR" as const,
                  }))}
                  converged={analogSolution.converged}
                >
                  <>
              {bottomInstrumentTab === "DIAGNOSTICS" && (
                <div className="space-y-3 pt-1 font-mono text-xs">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-[#0B1220] border border-[#24344D] rounded-lg p-3">
                      <div className="text-[#9BAAC0] text-[10px]">ENGINE STATE</div>
                      <div className={`font-bold mt-0.5 ${isSimRunning ? "text-[#48C99A]" : "text-[#F1B65B]"}`}>
                        {isSimRunning ? "RUNNING" : "IDLE / STANDBY"}
                      </div>
                    </div>
                    <div className="bg-[#0B1220] border border-[#24344D] rounded-lg p-3">
                      <div className="text-[#9BAAC0] text-[10px]">KCL RESIDUAL</div>
                      <div className="text-[#F1F5FA] font-bold mt-0.5 tabular-nums">
                        {analogSolution.maxKclResidualMa.toFixed(dec)} mA
                      </div>
                    </div>
                    <div className="bg-[#0B1220] border border-[#24344D] rounded-lg p-3">
                      <div className="text-[#9BAAC0] text-[10px]">LOOP CURRENT</div>
                      <div className="text-[#35BDF2] font-bold mt-0.5 tabular-nums">
                        {analogSolution.loopCurrentMa.toFixed(dec)} mA
                      </div>
                    </div>
                    <div className="bg-[#0B1220] border border-[#24344D] rounded-lg p-3">
                      <div className="text-[#9BAAC0] text-[10px]">DIAGNOSTIC ISSUES</div>
                      <div className={`font-bold mt-0.5 tabular-nums ${openCircuitIssues.length + compulsoryViolations.length > 0 ? "text-[#F1B65B]" : "text-[#48C99A]"}`}>
                        {openCircuitIssues.length + compulsoryViolations.length}
                      </div>
                    </div>
                  </div>
                  {compulsoryViolations.length === 0 && openCircuitIssues.length === 0 ? (
                    <div className="p-3 rounded-lg bg-[#0B1220] border border-[#24344D] text-[#48C99A]">
                      All connected logic pins and analog paths passed connectivity checks.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {compulsoryViolations.map((v, i) => (
                        <div key={`cv-${i}`} className="p-2.5 rounded-lg bg-[#162338] border border-[#F1B65B]/40 text-[#F1B65B]">
                          <strong>{v.gateLabel}</strong> ({v.gateType}): missing compulsory input pin(s) {v.missingPorts.join(", ")}.
                        </div>
                      ))}
                      {openCircuitIssues.map((iss, i) => (
                        <div key={`oc-${i}`} className="p-2.5 rounded-lg bg-[#162338] border border-[#24344D] text-[#F1F5FA]">
                          <strong className="text-[#F1B65B]">{iss.title}:</strong> {iss.description}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {bottomInstrumentTab === "MNA_NETLIST" && (
                <div className="space-y-3 pt-1 font-mono text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap gap-2">
                      {Array.from(analogSolution.netVoltages.entries()).map(([netId, volts]) => (
                        <div key={netId} className="px-2.5 py-1 rounded bg-[#0B1220] border border-[#24344D] tabular-nums">
                          <span className="text-[#9BAAC0]">V(N{netId}) = </span>
                          <span className="text-[#48C99A] font-bold">{volts.toFixed(dec)} V</span>
                        </div>
                      ))}
                      {analogSolution.netVoltages.size === 0 && (
                        <span className="text-[#9BAAC0]">Place analog sources or passive components to populate MNA node voltages.</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const cirText = serializeCircuitLabToSpiceNetlist(
                          activePreset || "Circuit Designer Schematic",
                          nodes,
                          wires
                        );
                        const blob = new Blob([cirText], { type: "text/plain;charset=utf-8" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        const slug = (activePreset || "circuit_designer")
                          .toLowerCase()
                          .replace(/[^a-z0-9]+/g, "_")
                          .replace(/^_|_$/g, "");
                        a.href = url;
                        a.download = `${slug || "circuit_designer"}.cir`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                      }}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-200 text-[11px] font-bold cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download .CIR Netlist</span>
                    </button>
                  </div>
                  {analogSolution.compTelemetry.size > 0 && (
                    <div className="overflow-x-auto rounded-lg border border-[#24344D]">
                      <table className="w-full text-xs font-mono tabular-nums border-collapse">
                        <thead>
                          <tr className="bg-[#162338] text-[#35BDF2] border-b border-[#24344D]">
                            <th className="py-1.5 px-2.5 text-left">Component</th>
                            <th className="py-1.5 px-2.5 text-right">V(+)</th>
                            <th className="py-1.5 px-2.5 text-right">V(-)</th>
                            <th className="py-1.5 px-2.5 text-right">ΔV</th>
                            <th className="py-1.5 px-2.5 text-right">Current (mA)</th>
                            <th className="py-1.5 px-2.5 text-right">Power (mW)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Array.from(analogSolution.compTelemetry.entries()).map(([nodeId, t]) => {
                            const nd = nodes.find((x) => x.id === nodeId);
                            return (
                              <tr key={nodeId} className="border-b border-[#24344D]/60 text-[#F1F5FA]">
                                <td className="py-1.5 px-2.5 font-semibold">{nd?.label || nd?.type || `N${nodeId}`}</td>
                                <td className="py-1.5 px-2.5 text-right">{t.vTerm0.toFixed(dec)} V</td>
                                <td className="py-1.5 px-2.5 text-right">{t.vTerm1.toFixed(dec)} V</td>
                                <td className="py-1.5 px-2.5 text-right text-[#F1B65B]">{t.vDrop.toFixed(dec)} V</td>
                                <td className="py-1.5 px-2.5 text-right text-[#48C99A]">{t.current_mA.toFixed(dec)} mA</td>
                                <td className="py-1.5 px-2.5 text-right text-[#35BDF2]">{t.power_mW.toFixed(dec)} mW</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {analogSolution.matrixDebug && analogSolution.matrixDebug.matrixA.length > 0 && (
                    <div className="rounded-lg border border-[#24344D] bg-[#0B1220] p-2.5 space-y-2">
                      <div className="text-[11px] font-bold text-[#35BDF2]">
                        MNA Matrix Debug Snapshot ([A] · [x] = [b] · {analogSolution.matrixDebug.matrixA.length}×{analogSolution.matrixDebug.matrixA.length})
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-[11px] tabular-nums border-collapse">
                          <thead>
                            <tr className="border-b border-[#24344D] text-[#9BAAC0]">
                              <th className="p-1 text-left">Var</th>
                              {analogSolution.matrixDebug.variableLabels.map((lbl, idx) => (
                                <th key={idx} className="p-1 text-right text-cyan-300">{lbl}</th>
                              ))}
                              <th className="p-1 text-right text-emerald-400">Sol [x]</th>
                              <th className="p-1 text-right text-amber-300">RHS [b]</th>
                            </tr>
                          </thead>
                          <tbody>
                            {analogSolution.matrixDebug.matrixA.map((row, rIdx) => (
                              <tr key={rIdx} className="border-b border-[#24344D]/40 text-slate-300">
                                <td className="p-1 font-bold text-cyan-300">{analogSolution.matrixDebug!.variableLabels[rIdx]}</td>
                                {row.map((v, cIdx) => (
                                  <td key={cIdx} className="p-1 text-right">
                                    {Math.abs(v) < 1e-12 ? "0" : Math.abs(v) < 1e-3 || Math.abs(v) >= 1000 ? v.toExponential(1) : v.toFixed(4)}
                                  </td>
                                ))}
                                <td className="p-1 text-right font-bold text-emerald-400">
                                  {(analogSolution.matrixDebug!.solutionVectorX[rIdx] ?? 0).toFixed(4)}
                                </td>
                                <td className="p-1 text-right text-amber-300">
                                  {(analogSolution.matrixDebug!.vectorB[rIdx] ?? 0).toFixed(4)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
                  </>
                </SimulationErrorBoundary>
              )}

              {/* Persistent Bench Instruments Dock: Oscilloscope (XSC1), Multimeter (XMM1), Signal Generator (XFG1) */}
              {bottomInstrumentTab === "BENCH_DOCK" && !isBottomConsoleSplit && (() => {
                const resolveNodeVoltage = (nid: number | null) => {
                  if (nid === null) return { v: 0, isAc: false, freq: 0, ma: 0, label: "Disconnected" };
                  const nd = nodes.find((x) => x.id === nid);
                  if (!nd) return { v: 0, isAc: false, freq: 0, ma: 0, label: "Missing Node" };
                  const tel = analogSolution.compTelemetry.get(nid);
                  const logicOut = liveVals[nid]?.[0] ?? 0;
                  const pinV = analogSolution.getPinVoltage?.(nid, 0);
                  const isSigGenAttached = dockSigGen.enabled && dockSigGen.nodeId === nid;
                  let v =
                    typeof pinV === "number" && Number.isFinite(pinV)
                      ? pinV
                      : tel
                      ? tel.vTerm0
                      : logicOut === 1
                      ? 5.0
                      : 0;
                  let freq = nd.analogParams?.frequencyHz ?? nd.clockHz ?? (nd.type === "CLOCK" ? clockHz : 0);
                  let isAc = nd.type === "AC_SINE" || nd.type === "AC_VOLTAGE_SOURCE" || nd.type === "CLOCK" || freq > 0;
                  if (isSigGenAttached) {
                    v = dockSigGen.offsetV + dockSigGen.ampVpp / 2;
                    freq = dockSigGen.freqHz;
                    isAc = true;
                  }
                  return {
                    v,
                    isAc,
                    freq,
                    ma: tel?.current_mA ?? 0,
                    label: `${nd.label || nd.type} #${nd.id}`,
                    ohm: nd.analogParams?.resistanceOhms,
                  };
                };

                const ch1 = resolveNodeVoltage(dockScopeCh1NodeId);
                const ch2 = resolveNodeVoltage(dockScopeCh2NodeId);
                const dmmPos = resolveNodeVoltage(dockDmmPosNodeId);
                const dmmCom = resolveNodeVoltage(dockDmmComNodeId);
                const dmmPosNode = dockDmmPosNodeId !== null ? nodes.find((x) => x.id === dockDmmPosNodeId) : undefined;
                const dmmDiffV = dockDmmPosNodeId === null ? 0 : dmmPos.v - (dockDmmComNodeId === null ? 0 : dmmCom.v);

                let dmmReadout = `${dmmDiffV.toFixed(dec)} V`;
                let dmmSub = dockDmmPosNodeId !== null ? `Across ${dmmPos.label}${dockDmmComNodeId !== null ? ` − ${dmmCom.label}` : " (vs GND)"}` : "Click Auto-Attach or select node";
                if (dockDmmMode === "VAC") {
                  dmmReadout = `${(Math.abs(dmmDiffV) * 0.7071).toFixed(dec)} V~`;
                } else if (dockDmmMode === "MA") {
                  dmmReadout = `${dmmPos.ma.toFixed(dec)} mA`;
                } else if (dockDmmMode === "OHMS") {
                  const r = dmmPosNode?.analogParams?.resistanceOhms;
                  dmmReadout = typeof r === "number" ? (r >= 1000 ? `${(r / 1000).toFixed(2)} kΩ` : `${r.toFixed(1)} Ω`) : "OL (Open)";
                  dmmSub = isSimRunning ? "Pause simulation for passive Ω check" : dmmSub;
                } else if (dockDmmMode === "HZ") {
                  dmmReadout = `${dmmPos.freq.toFixed(2)} Hz`;
                }

                const sampleTracePoint = (nid: number | null, idx: number) => {
                  const info = resolveNodeVoltage(nid);
                  if (nid === null) return 0;
                  const phase = idx * 0.18 + (dockScopeRunning && isSimRunning ? dockScopeTick * 0.28 : 0);
                  const isSigAttached = dockSigGen.enabled && dockSigGen.nodeId === nid;
                  if (isSigAttached) {
                    const amp = dockSigGen.ampVpp / 2;
                    const off = dockSigGen.offsetV;
                    if (dockSigGen.waveform === "SQUARE" || dockSigGen.waveform === "CLOCK") {
                      return off + (Math.sin(phase * Math.max(0.5, dockSigGen.freqHz * 0.5)) >= 0 ? amp : -amp);
                    }
                    if (dockSigGen.waveform === "TRIANGLE") {
                      const norm = ((phase * Math.max(0.5, dockSigGen.freqHz * 0.25)) % (Math.PI * 2)) / (Math.PI * 2);
                      return off + (norm < 0.5 ? -amp + 4 * amp * norm : 3 * amp - 4 * amp * norm);
                    }
                    return off + Math.sin(phase * Math.max(0.5, dockSigGen.freqHz * 0.5)) * amp;
                  }
                  const nd = nodes.find((x) => x.id === nid);
                  if (nd?.type === "AC_SINE" || nd?.type === "AC_VOLTAGE_SOURCE") {
                    return Math.sin(phase) * (nd.analogParams?.acVoltageV ?? 5);
                  }
                  if (nd?.type === "CLOCK" || nd?.type === "TIMER_555") {
                    const logic = liveVals[nid]?.[0] ?? 0;
                    return Math.sin(phase + (logic ? 0 : Math.PI)) >= 0 ? 5 : 0;
                  }
                  return info.v;
                };

                const exportDockCsv = () => {
                  const rows = ["Sample,Time_ms,CH1_V,CH2_V"];
                  for (let i = 0; i < 100; i++) {
                    const tMs = ((i / 99) * dockScopeTimebaseMs * 10).toFixed(4);
                    rows.push(`${i},${tMs},${sampleTracePoint(dockScopeCh1NodeId, i).toFixed(4)},${sampleTracePoint(dockScopeCh2NodeId, i).toFixed(4)}`);
                  }
                  const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `schematic_scope_${Date.now()}.csv`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                  showClipboardNotice("Exported Bench Oscilloscope transient CSV");
                };

                return (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 pt-1 font-mono text-xs">
                    {/* 1. XSC1 Oscilloscope Card */}
                    <div className="bg-[#0B1220] border border-amber-500/45 rounded-xl p-3 space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-slate-800 pb-2">
                        <div className="flex items-center gap-2">
                          <Activity className="w-4 h-4 text-amber-400" />
                          <span className="font-bold text-white">XSC1 · OSCILLOSCOPE</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setDockScopeRunning((r) => !r)}
                            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-amber-300 cursor-pointer"
                          >
                            {dockScopeRunning ? "STOP" : "RUN"}
                          </button>
                          <button
                            type="button"
                            onClick={exportDockCsv}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-[10px] font-bold text-cyan-200 cursor-pointer"
                            title="Download transient points as CSV"
                          >
                            <Download className="w-3 h-3" />
                            <span>Download CSV</span>
                          </button>
                        </div>
                      </div>

                      {/* Channel Node Snap Controls */}
                      <div className="grid grid-cols-2 gap-2 text-[10.5px]">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-yellow-300 font-bold">
                            <span>CH1 (Yellow)</span>
                            <button
                              type="button"
                              onClick={() =>
                                setPendingAutoAttach({
                                  instrumentType: "DOCK_SCOPE_CH1",
                                  label: "XSC1 CH1",
                                  color: "#facc15",
                                  mode: "DOCK_SCOPE_CH1",
                                  tag: "CH1",
                                })
                              }
                              className="px-1.5 py-0.2 rounded bg-yellow-400/20 hover:bg-yellow-400/35 border border-yellow-400/60 text-yellow-200 cursor-pointer"
                            >
                              Auto-Attach
                            </button>
                          </div>
                          <select
                            value={dockScopeCh1NodeId ?? ""}
                            onChange={(e) => setDockScopeCh1NodeId(e.target.value ? Number(e.target.value) : null)}
                            className="w-full bg-[#060b16] border border-slate-700 rounded px-1.5 py-1 text-slate-200"
                          >
                            <option value="">-- Disconnected --</option>
                            {nodes.map((n) => (
                              <option key={n.id} value={n.id}>
                                {n.label || n.type} #{n.id}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-cyan-300 font-bold">
                            <span>CH2 (Cyan)</span>
                            <button
                              type="button"
                              onClick={() =>
                                setPendingAutoAttach({
                                  instrumentType: "DOCK_SCOPE_CH2",
                                  label: "XSC1 CH2",
                                  color: "#22d3ee",
                                  mode: "DOCK_SCOPE_CH2",
                                  tag: "CH2",
                                })
                              }
                              className="px-1.5 py-0.2 rounded bg-cyan-400/20 hover:bg-cyan-400/35 border border-cyan-400/60 text-cyan-200 cursor-pointer"
                            >
                              Auto-Attach
                            </button>
                          </div>
                          <select
                            value={dockScopeCh2NodeId ?? ""}
                            onChange={(e) => setDockScopeCh2NodeId(e.target.value ? Number(e.target.value) : null)}
                            className="w-full bg-[#060b16] border border-slate-700 rounded px-1.5 py-1 text-slate-200"
                          >
                            <option value="">-- Disconnected --</option>
                            {nodes.map((n) => (
                              <option key={n.id} value={n.id}>
                                {n.label || n.type} #{n.id}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Mini CRT Waveform Display */}
                      <div className="relative h-28 bg-[#030712] border border-slate-700 rounded-lg overflow-hidden p-1.5">
                        <svg viewBox="0 0 300 90" className="w-full h-full">
                          <line x1="0" y1="45" x2="300" y2="45" stroke="#1e293b" strokeDasharray="3 3" />
                          <line x1="150" y1="0" x2="150" y2="90" stroke="#1e293b" strokeDasharray="3 3" />
                          {dockScopeCh1NodeId !== null && (
                            <path
                              d={Array.from({ length: 60 }, (_, i) => {
                                const x = (i / 59) * 300;
                                const v = sampleTracePoint(dockScopeCh1NodeId, i);
                                const y = Math.max(4, Math.min(86, 45 - v * 5.2));
                                return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
                              }).join(" ")}
                              fill="none"
                              stroke="#facc15"
                              strokeWidth="2"
                            />
                          )}
                          {dockScopeCh2NodeId !== null && (
                            <path
                              d={Array.from({ length: 60 }, (_, i) => {
                                const x = (i / 59) * 300;
                                const v = sampleTracePoint(dockScopeCh2NodeId, i);
                                const y = Math.max(4, Math.min(86, 45 - v * 5.2));
                                return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
                              }).join(" ")}
                              fill="none"
                              stroke="#22d3ee"
                              strokeWidth="1.8"
                              strokeDasharray="4 2"
                            />
                          )}
                        </svg>
                        <div className="absolute bottom-1 left-2 right-2 flex justify-between text-[10px] text-slate-300">
                          <span className="text-yellow-300">CH1: {dockScopeCh1NodeId !== null ? `${ch1.v.toFixed(2)}V` : "OFF"}</span>
                          <span className="text-cyan-300">CH2: {dockScopeCh2NodeId !== null ? `${ch2.v.toFixed(2)}V` : "OFF"}</span>
                          <span className="text-slate-400">{dockScopeTimebaseMs}ms/div</span>
                        </div>
                      </div>
                    </div>

                    {/* 2. XMM1 Digital Multimeter Card */}
                    <div className="bg-[#0B1220] border border-cyan-500/45 rounded-xl p-3 space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-slate-800 pb-2">
                        <div className="flex items-center gap-2">
                          <Gauge className="w-4 h-4 text-cyan-400" />
                          <span className="font-bold text-white">XMM1 · MULTIMETER</span>
                        </div>
                        <div className="flex items-center gap-0.5 bg-slate-900 border border-slate-700 rounded p-0.5 text-[10px]">
                          {(["VDC", "VAC", "MA", "OHMS", "HZ"] as const).map((m) => (
                            <button
                              key={m}
                              type="button"
                              onClick={() => setDockDmmMode(m)}
                              className={`px-1.5 py-0.5 rounded font-bold cursor-pointer ${
                                dockDmmMode === m ? "bg-cyan-400 text-slate-950" : "text-slate-300 hover:text-white"
                              }`}
                            >
                              {m}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="bg-black border border-cyan-500/40 rounded-lg px-3 py-2 flex items-baseline justify-between gap-2">
                        <span className="text-2xl font-black text-cyan-300 tabular-nums">{dmmReadout}</span>
                        <span className="text-[10px] text-cyan-500 font-bold">{dockDmmMode}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[10.5px]">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-sky-300 font-bold">
                            <span>V+ Lead</span>
                            <button
                              type="button"
                              onClick={() =>
                                setPendingAutoAttach({
                                  instrumentType: "DOCK_DMM_POS",
                                  label: "XMM1 V+",
                                  color: "#38bdf8",
                                  mode: "DOCK_DMM_POS",
                                  tag: "V+",
                                })
                              }
                              className="px-1.5 py-0.2 rounded bg-sky-500/20 hover:bg-sky-500/35 border border-sky-400/60 text-sky-200 cursor-pointer"
                            >
                              Auto-Attach
                            </button>
                          </div>
                          <select
                            value={dockDmmPosNodeId ?? ""}
                            onChange={(e) => setDockDmmPosNodeId(e.target.value ? Number(e.target.value) : null)}
                            className="w-full bg-[#060b16] border border-slate-700 rounded px-1.5 py-1 text-slate-200"
                          >
                            <option value="">-- Select Node --</option>
                            {nodes.map((n) => (
                              <option key={n.id} value={n.id}>
                                {n.label || n.type} #{n.id}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-slate-300 font-bold">
                            <span>COM (−)</span>
                            <button
                              type="button"
                              onClick={() =>
                                setPendingAutoAttach({
                                  instrumentType: "DOCK_DMM_COM",
                                  label: "XMM1 COM",
                                  color: "#94a3b8",
                                  mode: "DOCK_DMM_COM",
                                  tag: "COM",
                                })
                              }
                              className="px-1.5 py-0.2 rounded bg-slate-700/60 hover:bg-slate-600/80 border border-slate-500 text-slate-200 cursor-pointer"
                            >
                              Auto-Attach
                            </button>
                          </div>
                          <select
                            value={dockDmmComNodeId ?? ""}
                            onChange={(e) => setDockDmmComNodeId(e.target.value ? Number(e.target.value) : null)}
                            className="w-full bg-[#060b16] border border-slate-700 rounded px-1.5 py-1 text-slate-200"
                          >
                            <option value="">Ground Reference (0V)</option>
                            {nodes.map((n) => (
                              <option key={n.id} value={n.id}>
                                {n.label || n.type} #{n.id}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">{dmmSub}</div>
                    </div>

                    {/* 3. XFG1 Signal Generator Card */}
                    <div className="bg-[#0B1220] border border-emerald-500/45 rounded-xl p-3 space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-slate-800 pb-2">
                        <div className="flex items-center gap-2">
                          <Zap className="w-4 h-4 text-emerald-400" />
                          <span className="font-bold text-white">XFG1 · SIGNAL GEN</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setDockSigGen((s) => ({ ...s, enabled: !s.enabled }))}
                          className={`px-2 py-0.5 rounded font-bold text-[10px] border cursor-pointer ${
                            dockSigGen.enabled
                              ? "bg-emerald-500 text-slate-950 border-emerald-300"
                              : "bg-slate-800 text-slate-300 border-slate-700"
                          }`}
                        >
                          {dockSigGen.enabled ? "OUTPUT ON" : "STANDBY"}
                        </button>
                      </div>

                      <div className="flex items-center justify-between gap-2 text-[10.5px]">
                        <select
                          value={dockSigGen.nodeId ?? ""}
                          onChange={(e) =>
                            setDockSigGen((s) => ({
                              ...s,
                              nodeId: e.target.value ? Number(e.target.value) : null,
                            }))
                          }
                          className="flex-1 bg-[#060b16] border border-slate-700 rounded px-1.5 py-1 text-slate-200"
                        >
                          <option value="">-- Target Injection Node --</option>
                          {nodes.map((n) => (
                            <option key={n.id} value={n.id}>
                              {n.label || n.type} #{n.id}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() =>
                            setPendingAutoAttach({
                              instrumentType: "DOCK_SIGGEN",
                              label: "XFG1 Signal Gen",
                              color: "#f59e0b",
                              mode: "DOCK_SIGGEN",
                              tag: "XFG",
                            })
                          }
                          className="px-2 py-1 rounded bg-amber-500/20 hover:bg-amber-500/35 border border-amber-400/60 text-amber-200 font-bold cursor-pointer shrink-0"
                        >
                          Auto-Attach
                        </button>
                      </div>

                      <div className="grid grid-cols-4 gap-1 text-[10px]">
                        {(["SINE", "SQUARE", "TRIANGLE", "CLOCK"] as const).map((wf) => (
                          <button
                            key={wf}
                            type="button"
                            onClick={() => setDockSigGen((s) => ({ ...s, waveform: wf }))}
                            className={`py-1 rounded font-bold border cursor-pointer ${
                              dockSigGen.waveform === wf
                                ? "bg-amber-400/25 border-amber-400 text-amber-200"
                                : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                            }`}
                          >
                            {wf}
                          </button>
                        ))}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[10.5px]">
                        <label className="space-y-0.5 text-slate-300">
                          <span>Freq: <strong className="text-emerald-300">{dockSigGen.freqHz.toFixed(1)} Hz</strong></span>
                          <input
                            type="range"
                            min={0.5}
                            max={50}
                            step={0.5}
                            value={dockSigGen.freqHz}
                            onChange={(e) => setDockSigGen((s) => ({ ...s, freqHz: parseFloat(e.target.value) || 1 }))}
                            className="w-full accent-emerald-400 cursor-pointer"
                          />
                        </label>
                        <label className="space-y-0.5 text-slate-300">
                          <span>Amp: <strong className="text-amber-300">{dockSigGen.ampVpp.toFixed(1)} Vpp</strong></span>
                          <input
                            type="range"
                            min={1}
                            max={15}
                            step={0.5}
                            value={dockSigGen.ampVpp}
                            onChange={(e) => setDockSigGen((s) => ({ ...s, ampVpp: parseFloat(e.target.value) || 5 }))}
                            className="w-full accent-amber-400 cursor-pointer"
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Instrument Viewport Body */}
              {bottomInstrumentTab === "PROBE" && !isBottomConsoleSplit && (
                <div className="pt-2">
                  <RechartsWaveformProbe
                    nodes={nodes}
                    wires={wires}
                    liveVals={liveVals}
                    selectedCanvasItem={selected}
                    insightByNodeId={insightByNodeId}
                    history={rechartsSamples}
                    onClearHistory={() => {
                      const pathVals = extractSignalPathValues(nodes, wires, liveVals);
                      setRechartsSamples([
                        {
                          step: 1,
                          timeLabel: "t1",
                          timestampMs: Date.now(),
                          values: pathVals,
                        },
                      ]);
                    }}
                    onTriggerStepSweep={triggerSignalSweepStep}
                    onSelectCanvasItem={(item) => setSelected(item)}
                    isHalted={isSimulationHalted}
                    haltReason={
                      compulsoryViolations.length > 0
                        ? `${compulsoryViolations[0].gateLabel} is missing compulsory input (${compulsoryViolations[0].missingPorts.map((p: number) => (p === 0 ? "Pin A" : "Pin B")).join(" & ")}). Logic propagation paused.`
                        : undefined
                    }
                  />
                </div>
              )}

              {isBottomConsoleSplit ? (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 pt-2">
                  {/* Left Column: Selected Active Instrument */}
                  <div>
                    {bottomInstrumentTab === "TIMING_DIAGRAM" ? (
                      <LogicTimingDiagram
                        nodes={nodes}
                        wires={wires}
                        liveVals={liveVals}
                        history={nodeTimingHistory}
                        selectedNodeIds={selectedNodeIdsForTiming}
                        onToggleSelectNode={(nodeId) => {
                          setSelectedNodeIdsForTiming((prev) =>
                            prev.includes(nodeId)
                              ? prev.filter((id) => id !== nodeId)
                              : [...prev, nodeId]
                          );
                        }}
                        onSelectAllNodes={() => {
                          setSelectedNodeIdsForTiming(nodes.map((n) => n.id));
                        }}
                        onClearSelectedNodes={() => {
                          setSelectedNodeIdsForTiming([]);
                        }}
                        onSelectInputsOnly={() => {
                          setSelectedNodeIdsForTiming(
                            nodes
                              .filter((n) => n.type === "INPUT" || n.type === "CLOCK")
                              .map((n) => n.id)
                          );
                        }}
                        onSelectOutputsOnly={() => {
                          setSelectedNodeIdsForTiming(
                            nodes.filter((n) => n.type === "OUTPUT").map((n) => n.id)
                          );
                        }}
                        autoClock={autoClock}
                        onToggleAutoClock={() => setAutoClock((v) => !v)}
                        clockHz={Number((clockHz * simSpeed).toFixed(2))}
                        onStepClock={pulseClockInputs}
                        onRunPatternSweep={runFullPatternSweep}
                        onClearHistory={() => setNodeTimingHistory([])}
                      />
                    ) : bottomInstrumentTab === "OSCILLOSCOPE" ? (
                      <DigitalOscilloscope
                        channels={oscilloscopeChannels}
                        history={oscilloscopeHistory}
                        onClearTrace={() => setWaveformHistory([])}
                        onStepClock={pulseClockInputs}
                        onRunPatternSweep={runFullPatternSweep}
                        selectedNodeId={selected?.type === "node" ? selected.id : null}
                        onSelectNode={(nodeId) => setSelected({ type: "node", id: nodeId })}
                        gateDelayNs={10}
                        clockHz={Number((clockHz * simSpeed).toFixed(2))}
                        isSimRunning={isSimRunning}
                        onToggleSimRunning={() => setIsSimRunning((prev) => !prev)}
                      />
                    ) : bottomInstrumentTab === "PROBE" ? (
                      <RechartsWaveformProbe
                        nodes={nodes}
                        wires={wires}
                        liveVals={liveVals}
                        selectedCanvasItem={selected}
                        insightByNodeId={insightByNodeId}
                        history={rechartsSamples}
                        onClearHistory={() => {
                          const pathVals = extractSignalPathValues(nodes, wires, liveVals);
                          setRechartsSamples([
                            {
                              step: 1,
                              timeLabel: "t1",
                              timestampMs: Date.now(),
                              values: pathVals,
                            },
                          ]);
                        }}
                        onTriggerStepSweep={triggerSignalSweepStep}
                        onSelectCanvasItem={(item) => setSelected(item)}
                        isHalted={isSimulationHalted}
                        haltReason={
                          compulsoryViolations.length > 0
                            ? `${compulsoryViolations[0].gateLabel} is missing compulsory input.`
                            : undefined
                        }
                      />
                    ) : (
                      <MultiChannelLogicAnalyzer
                        signals={allWireSignals}
                        selectedWireIds={selectedWireIdsForAnalyzer}
                        onToggleSelectSignal={(wireId) => {
                          setSelectedWireIdsForAnalyzer((prev) =>
                            prev.includes(wireId)
                              ? prev.filter((id) => id !== wireId)
                              : [...prev, wireId]
                          );
                        }}
                        onSelectAllSignals={() => {
                          setSelectedWireIdsForAnalyzer(wires.map((w) => w.id));
                        }}
                        onClearSelectedSignals={() => setSelectedWireIdsForAnalyzer([])}
                        onSelectInputsOnly={() => {
                          const inputWireIds = wires
                            .filter((w) =>
                              nodes.find((n) => n.id === w.from.node)?.type === "INPUT"
                            )
                            .map((w) => w.id);
                          setSelectedWireIdsForAnalyzer(inputWireIds);
                        }}
                        onSelectOutputsOnly={() => {
                          const outputWireIds = wires
                            .filter((w) =>
                              nodes.find((n) => n.id === w.to.node)?.type === "OUTPUT"
                            )
                            .map((w) => w.id);
                          setSelectedWireIdsForAnalyzer(outputWireIds);
                        }}
                        onSelectGatesOnly={() => {
                          const gateWireIds = wires
                            .filter((w) => {
                              const src = nodes.find((n) => n.id === w.from.node);
                              return src && src.type !== "INPUT" && src.type !== "OUTPUT";
                            })
                            .map((w) => w.id);
                          setSelectedWireIdsForAnalyzer(gateWireIds);
                        }}
                        history={analyzerHistory}
                        autoClock={autoClock}
                        onToggleAutoClock={() => setAutoClock((v) => !v)}
                        clockHz={clockHz}
                        onStepClock={pulseClockInputs}
                        onRunPatternSweep={runFullPatternSweep}
                        onClearHistory={() => setAnalyzerHistory([])}
                      />
                    )}
                  </div>

                  {/* Right Column: Truth Table */}
                  <div className="bg-[#111827] border border-slate-800 rounded-xl p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <h3 className="text-sm font-semibold text-white">
                        {hasSeq
                          ? "Sequential Next-State & Output Table"
                          : "Combinational Truth Table"}
                      </h3>
                      <span className="text-xs font-mono text-slate-400">
                        {inputNodes.length} Inputs · {outputNodes.length} Outputs
                        {hasSeq ? " · Clocked Next State" : ""}
                      </span>
                    </div>

                    {isSimulationHalted && (
                      <div className="mb-3 p-2.5 rounded-lg bg-amber-950/40 border border-amber-500/40 text-amber-300 text-xs flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>
                          Truth table contains floating states (Z). Complete second input
                          on {compulsoryViolations[0]?.gateType} to evaluate definitive output columns.
                        </span>
                      </div>
                    )}

                    {truthRowsData.length === 0 ? (
                      <p className="text-xs text-slate-400 py-8 text-center">
                        {inputNodes.length > 6
                          ? "Circuit has more than 6 inputs (64 rows max for real-time table)."
                          : outputNodes.length === 0
                          ? "Add at least one OUTPUT node to view the truth table."
                          : "Add at least one INPUT and one OUTPUT node to auto-generate the circuit truth table."}
                      </p>
                    ) : (
                      <div className="max-h-80 overflow-auto rounded-lg border border-slate-800">
                        <table className="w-full text-xs font-mono tabular-nums border-collapse">
                          <thead>
                            <tr className="bg-slate-900 text-cyan-400 border-b border-slate-800">
                              {inputNodes.map((inp, idx) => (
                                <th key={inp.id} className="py-2 px-2.5 text-center">
                                  {inp.label || `I${idx + 1}`}
                                </th>
                              ))}
                              {outputNodes.map((outp, idx) => (
                                <th
                                  key={outp.id}
                                  className="py-2 px-2.5 text-center border-l border-slate-800 text-emerald-400"
                                >
                                  {outp.label || `O${idx + 1}`}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {truthRowsData.map((r, rIdx) => (
                              <tr
                                key={rIdx}
                                className={`border-b border-slate-800/60 transition-colors ${
                                  r.isActive
                                    ? "bg-cyan-500/15 text-white font-bold"
                                    : "text-slate-400 hover:bg-slate-900/40"
                                }`}
                              >
                                {r.ins.map((v, cIdx) => (
                                  <td
                                    key={`i-${cIdx}`}
                                    className={`py-1.5 px-2 text-center ${
                                      v === 1 ? "text-cyan-300" : ""
                                    }`}
                                  >
                                    {v}
                                  </td>
                                ))}
                                {r.outs.map((v, cIdx) => (
                                  <td
                                    key={`o-${cIdx}`}
                                    className={`py-1.5 px-2 text-center border-l border-slate-800/60 ${
                                      v === 1
                                        ? "text-emerald-400 font-bold"
                                        : v === -1
                                        ? "text-amber-400 font-bold"
                                        : "text-slate-500"
                                    }`}
                                  >
                                    {v === -1 ? "Z" : v}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Full Width Instrument View */
                <div className="pt-2">
                  {bottomInstrumentTab === "TIMING_DIAGRAM" && (
                    <LogicTimingDiagram
                      nodes={nodes}
                      wires={wires}
                      liveVals={liveVals}
                      history={nodeTimingHistory}
                      selectedNodeIds={selectedNodeIdsForTiming}
                      onToggleSelectNode={(nodeId) => {
                        setSelectedNodeIdsForTiming((prev) =>
                          prev.includes(nodeId)
                            ? prev.filter((id) => id !== nodeId)
                            : [...prev, nodeId]
                        );
                      }}
                      onSelectAllNodes={() => {
                        setSelectedNodeIdsForTiming(nodes.map((n) => n.id));
                      }}
                      onClearSelectedNodes={() => {
                        setSelectedNodeIdsForTiming([]);
                      }}
                      onSelectInputsOnly={() => {
                        setSelectedNodeIdsForTiming(
                          nodes
                            .filter((n) => n.type === "INPUT" || n.type === "CLOCK")
                            .map((n) => n.id)
                        );
                      }}
                      onSelectOutputsOnly={() => {
                        setSelectedNodeIdsForTiming(
                          nodes.filter((n) => n.type === "OUTPUT").map((n) => n.id)
                        );
                      }}
                      autoClock={autoClock}
                      onToggleAutoClock={() => setAutoClock((v) => !v)}
                      clockHz={clockHz}
                      onStepClock={pulseClockInputs}
                      onRunPatternSweep={runFullPatternSweep}
                      onClearHistory={() => setNodeTimingHistory([])}
                    />
                  )}

                  {bottomInstrumentTab === "LOGIC_ANALYZER" && (
                    <MultiChannelLogicAnalyzer
                      signals={allWireSignals}
                      selectedWireIds={selectedWireIdsForAnalyzer}
                      onToggleSelectSignal={(wireId) => {
                        setSelectedWireIdsForAnalyzer((prev) =>
                          prev.includes(wireId)
                            ? prev.filter((id) => id !== wireId)
                            : [...prev, wireId]
                        );
                      }}
                      onSelectAllSignals={() => {
                        setSelectedWireIdsForAnalyzer(wires.map((w) => w.id));
                      }}
                      onClearSelectedSignals={() => setSelectedWireIdsForAnalyzer([])}
                      onSelectInputsOnly={() => {
                        const inputWireIds = wires
                          .filter((w) =>
                            nodes.find((n) => n.id === w.from.node)?.type === "INPUT"
                          )
                          .map((w) => w.id);
                        setSelectedWireIdsForAnalyzer(inputWireIds);
                      }}
                      onSelectOutputsOnly={() => {
                        const outputWireIds = wires
                          .filter((w) =>
                            nodes.find((n) => n.id === w.to.node)?.type === "OUTPUT"
                          )
                          .map((w) => w.id);
                        setSelectedWireIdsForAnalyzer(outputWireIds);
                      }}
                      onSelectGatesOnly={() => {
                        const gateWireIds = wires
                          .filter((w) => {
                            const src = nodes.find((n) => n.id === w.from.node);
                            return src && src.type !== "INPUT" && src.type !== "OUTPUT";
                          })
                          .map((w) => w.id);
                        setSelectedWireIdsForAnalyzer(gateWireIds);
                      }}
                      history={analyzerHistory}
                      autoClock={autoClock}
                      onToggleAutoClock={() => setAutoClock((v) => !v)}
                      clockHz={Number((clockHz * simSpeed).toFixed(2))}
                      onStepClock={pulseClockInputs}
                      onRunPatternSweep={runFullPatternSweep}
                      onClearHistory={() => setAnalyzerHistory([])}
                    />
                  )}

                  {bottomInstrumentTab === "OSCILLOSCOPE" && (
                    <DigitalOscilloscope
                      channels={oscilloscopeChannels}
                      history={oscilloscopeHistory}
                      onClearTrace={() => setWaveformHistory([])}
                      onStepClock={pulseClockInputs}
                      onRunPatternSweep={runFullPatternSweep}
                      selectedNodeId={selected?.type === "node" ? selected.id : null}
                      onSelectNode={(nodeId) => setSelected({ type: "node", id: nodeId })}
                      gateDelayNs={10}
                      clockHz={Number((clockHz * simSpeed).toFixed(2))}
                      isSimRunning={isSimRunning}
                      onToggleSimRunning={() => setIsSimRunning((prev) => !prev)}
                    />
                  )}

                  {bottomInstrumentTab === "TRUTH_TABLE" && (
                    <div className="bg-[#111827] border border-slate-800 rounded-xl p-5">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                        <h3 className="text-sm font-semibold text-white">
                          {hasSeq
                            ? "Sequential Next-State & Output Table"
                            : "Combinational Truth Table"}
                        </h3>
                        <span className="text-xs font-mono text-slate-400">
                          {inputNodes.length} Inputs · {outputNodes.length} Outputs
                          {hasSeq ? " · Clocked Next State" : ""}
                        </span>
                      </div>

                      {isSimulationHalted && (
                        <div className="mb-3 p-2.5 rounded-lg bg-amber-950/40 border border-amber-500/40 text-amber-300 text-xs flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                          <span>
                            Truth table contains floating states (Z). Complete second input
                            on {compulsoryViolations[0]?.gateType} to evaluate definitive output columns.
                          </span>
                        </div>
                      )}

                      {truthRowsData.length === 0 ? (
                        <p className="text-xs text-slate-400 py-8 text-center">
                          {inputNodes.length > 6
                            ? "Circuit has more than 6 inputs (64 rows max for real-time table)."
                            : outputNodes.length === 0
                            ? "Add at least one OUTPUT node to view the truth table."
                            : "Add at least one INPUT and one OUTPUT node to auto-generate the circuit truth table."}
                        </p>
                      ) : (
                        <div className="max-h-80 overflow-auto rounded-lg border border-slate-800">
                          <table className="w-full text-xs font-mono tabular-nums border-collapse">
                            <thead>
                              <tr className="bg-slate-900 text-cyan-400 border-b border-slate-800">
                                {inputNodes.map((inp, idx) => (
                                  <th key={inp.id} className="py-2 px-2.5 text-center">
                                    {inp.label || `I${idx + 1}`}
                                  </th>
                                ))}
                                {outputNodes.map((outp, idx) => (
                                  <th
                                    key={outp.id}
                                    className="py-2 px-2.5 text-center border-l border-slate-800 text-emerald-400"
                                  >
                                    {outp.label || `O${idx + 1}`}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {truthRowsData.map((r, rIdx) => (
                                <tr
                                  key={rIdx}
                                  className={`border-b border-slate-800/60 transition-colors ${
                                    r.isActive
                                      ? "bg-cyan-500/15 text-white font-bold"
                                      : "text-slate-400 hover:bg-slate-900/40"
                                  }`}
                                >
                                  {r.ins.map((v, cIdx) => (
                                    <td
                                      key={`i-${cIdx}`}
                                      className={`py-1.5 px-2 text-center ${
                                        v === 1 ? "text-cyan-300" : ""
                                      }`}
                                    >
                                      {v}
                                    </td>
                                  ))}
                                  {r.outs.map((v, cIdx) => (
                                    <td
                                      key={`o-${cIdx}`}
                                      className={`py-1.5 px-2 text-center border-l border-slate-800/60 ${
                                        v === 1
                                          ? "text-emerald-400 font-bold"
                                          : v === -1
                                          ? "text-amber-400 font-bold"
                                          : "text-slate-500"
                                      }`}
                                    >
                                      {v === -1 ? "Z" : v}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              </div>
              </div>
            </div>
          )}

          {/* Library Slot: Dedicated Logic Timing Diagram Standalone Modal */}
          {isTimingDiagramModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in">
              <LogicTimingDiagram
                nodes={nodes}
                wires={wires}
                liveVals={liveVals}
                history={nodeTimingHistory}
                selectedNodeIds={selectedNodeIdsForTiming}
                onToggleSelectNode={(nodeId) => {
                  setSelectedNodeIdsForTiming((prev) =>
                    prev.includes(nodeId)
                      ? prev.filter((id) => id !== nodeId)
                      : [...prev, nodeId]
                  );
                }}
                onSelectAllNodes={() => {
                  setSelectedNodeIdsForTiming(nodes.map((n) => n.id));
                }}
                onClearSelectedNodes={() => {
                  setSelectedNodeIdsForTiming([]);
                }}
                onSelectInputsOnly={() => {
                  setSelectedNodeIdsForTiming(
                    nodes
                      .filter((n) => n.type === "INPUT" || n.type === "CLOCK")
                      .map((n) => n.id)
                  );
                }}
                onSelectOutputsOnly={() => {
                  setSelectedNodeIdsForTiming(
                    nodes.filter((n) => n.type === "OUTPUT").map((n) => n.id)
                  );
                }}
                autoClock={autoClock}
                onToggleAutoClock={() => setAutoClock((v) => !v)}
                clockHz={clockHz}
                onStepClock={pulseClockInputs}
                onRunPatternSweep={runFullPatternSweep}
                onClearHistory={() => setNodeTimingHistory([])}
                onClose={() => setIsTimingDiagramModalOpen(false)}
                isStandaloneModal={true}
              />
            </div>
          )}

          {/* Library Slot: Theory, Formulas & Formal Proofs Library Modal */}
          {isTheoryLibraryOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
              <div className="bg-[#0b101e] border border-purple-500/40 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
                {/* Modal Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#0f172a]/70">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center">
                      <BookOpen className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white font-mono flex items-center gap-2">
                        <span>Circuit Theory &amp; Formal Equations Library</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-950 border border-purple-700 text-purple-300">
                          Library Slot: Theory
                        </span>
                      </h3>
                      <p className="text-xs text-slate-400">
                        Formal algebraic expressions, canonical SOP/POS minterms, and mathematically proved timing diagrams
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsTheoryLibraryOpen(false)}
                    className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-400 hover:text-white cursor-pointer transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Modal Content */}
                <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-200">
                  {/* Quick Telemetry Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-[#111827] border border-slate-800 rounded-xl p-3">
                      <span className="text-[11px] text-slate-400 font-mono block">Active Circuit</span>
                      <span className="text-sm font-bold text-white font-mono truncate block">{activePreset}</span>
                    </div>
                    <div className="bg-[#111827] border border-slate-800 rounded-xl p-3">
                      <span className="text-[11px] text-slate-400 font-mono block">Components / Nodes</span>
                      <span className="text-sm font-bold text-cyan-300 font-mono">{nodes.length} Elements</span>
                    </div>
                    <div className="bg-[#111827] border border-slate-800 rounded-xl p-3">
                      <span className="text-[11px] text-slate-400 font-mono block">Interconnect Wires</span>
                      <span className="text-sm font-bold text-emerald-300 font-mono">{wires.length} Nets</span>
                    </div>
                    <div className="bg-[#111827] border border-slate-800 rounded-xl p-3">
                      <span className="text-[11px] text-slate-400 font-mono block">Primary I/O</span>
                      <span className="text-sm font-bold text-purple-300 font-mono">{inputNodes.length} In / {outputNodes.length} Out</span>
                    </div>
                  </div>

                  {/* Mathematical Proof and Waveform View */}
                  {waveformProof ? (
                    <DigitalWaveformView {...waveformProof} />
                  ) : (
                    <div className="text-center py-12 border border-dashed border-slate-800 rounded-xl">
                      <p className="text-slate-400 text-sm">
                        Connect at least one INPUT and OUTPUT node on the canvas to generate formal equations and mathematical proof.
                      </p>
                    </div>
                  )}
                </div>

                {/* Modal Footer */}
                <div className="px-6 py-3.5 border-t border-slate-800 bg-[#0f172a]/50 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setIsTheoryLibraryOpen(false)}
                    className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-mono text-xs font-bold transition-colors cursor-pointer"
                  >
                    Done &amp; Return to Schematic Board
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Library Slot: Schematic Circuit Blueprints & 75-Lab Library Modal */}
          {isCircuitLibraryOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
              <div className="bg-[#0b101e] border border-cyan-500/40 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
                {/* Modal Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#0f172a]/70">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center">
                      <Layers className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white font-mono flex items-center gap-2">
                        <span>Schematic Circuit Library</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-700 text-cyan-300">
                          Library Slot: Blueprints
                        </span>
                      </h3>
                      <p className="text-xs text-slate-400">
                        Categorized library of verified combinational, sequential, arithmetic, and MSI circuits
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCircuitLibraryOpen(false)}
                    className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-400 hover:text-white cursor-pointer transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Category Filter & Search Bar */}
                <div className="p-4 bg-[#0a0e19] border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {[
                      { id: "ALL", label: "All Circuits" },
                      { id: "Combinational", label: "Combinational" },
                      { id: "Sequential", label: "Sequential & Latches" },
                      { id: "Counters", label: "Counters & Registers" },
                      { id: "MSI", label: "MSI / Multiplexers" },
                    ].map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setComponentSlotFilter(cat.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer ${
                          componentSlotFilter === cat.id
                            ? "bg-cyan-500/25 border border-cyan-400 text-cyan-200"
                            : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>

                  <div className="relative min-w-[200px]">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search circuit library..."
                      value={componentQuery}
                      onChange={(e) => setComponentQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono"
                    />
                  </div>
                </div>

                {/* Circuit Cards Grid */}
                <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 flex-1">
                  {/* Blank Draw Option */}
                  <div
                    onClick={() => {
                      prevOutsRef.current = {};
                      setNodes([]);
                      setWires([]);
                      setSelected(null);
                      setPendingWire(null);
                      setWaveformHistory([]);
                      setActivePreset("Custom User Schematic (Draw Mode)");
                      onClearExternalCircuit?.();
                      setAttachedProbes([]);
                      setIsCircuitLibraryOpen(false);
                    }}
                    className="p-4 rounded-xl border border-dashed border-emerald-500/40 bg-emerald-950/10 hover:bg-emerald-950/20 hover:border-emerald-400 transition-all cursor-pointer flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono font-bold text-sm text-emerald-300 group-hover:text-emerald-200">
                          + Custom Blank Board
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-900/60 text-emerald-300">
                          Draw Mode
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">
                        Start completely from scratch with a pristine, empty schematic canvas.
                      </p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-emerald-500/20 text-xs font-mono font-bold text-emerald-400 flex items-center gap-1">
                      <span>Open Clean Canvas →</span>
                    </div>
                  </div>

                  {/* Preset Items from CIRCUIT_PRESETS */}
                  {Object.entries(CIRCUIT_PRESETS)
                    .filter(([name, item]) => {
                      const matchesCategory =
                        componentSlotFilter === "ALL" ||
                        (componentSlotFilter === "Combinational" && item.category?.toLowerCase().includes("combinational")) ||
                        (componentSlotFilter === "Sequential" && (item.category?.toLowerCase().includes("sequential") || item.category?.toLowerCase().includes("latch") || item.category?.toLowerCase().includes("flip"))) ||
                        (componentSlotFilter === "Counters" && (item.category?.toLowerCase().includes("counter") || item.category?.toLowerCase().includes("register"))) ||
                        (componentSlotFilter === "MSI" && (item.category?.toLowerCase().includes("msi") || item.category?.toLowerCase().includes("mux") || item.category?.toLowerCase().includes("decoder")));

                      const matchesSearch =
                        !componentQuery ||
                        name.toLowerCase().includes(componentQuery.toLowerCase()) ||
                        item.description?.toLowerCase().includes(componentQuery.toLowerCase());

                      return matchesCategory && matchesSearch;
                    })
                    .map(([name, item]) => (
                      <div
                        key={name}
                        onClick={() => {
                          loadCircuitDefs(name, item.nodes, item.wires);
                          setIsCircuitLibraryOpen(false);
                        }}
                        className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between group ${
                          activePreset === name
                            ? "bg-cyan-950/30 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)]"
                            : "bg-[#111827] border-slate-800 hover:border-cyan-500/50 hover:bg-[#131e33]"
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-mono font-bold text-sm text-white group-hover:text-cyan-300">
                              {name}
                            </span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                              {item.category || "Logic"}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 line-clamp-2">
                            {item.description}
                          </p>
                        </div>
                        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
                          <span className="text-slate-500">
                            {item.nodes.length} Nodes · {item.wires.length} Nets
                          </span>
                          <span className="text-cyan-400 font-bold group-hover:underline">
                            Load Schematic →
                          </span>
                        </div>
                      </div>
                    ))}
                </div>

                {/* Modal Footer */}
                <div className="px-6 py-3.5 border-t border-slate-800 bg-[#0f172a]/50 flex justify-between items-center text-xs font-mono text-slate-400">
                  <span>Browse 15+ foundational presets or draw custom topologies</span>
                  <button
                    type="button"
                    onClick={() => setIsCircuitLibraryOpen(false)}
                    className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-mono text-xs font-bold transition-colors cursor-pointer"
                  >
                    Close Catalog
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Draggable Virtual Oscilloscope Waveform Probe Popup Window with Time-Markers */}
      <WireProbePopupWindow
        isOpen={isProbePopupOpen}
        onClose={() => setIsProbePopupOpen(false)}
        mode={
          nodes.some((n) => isAnalogOrPassiveType(n.type))
            ? "analog"
            : "digital"
        }
        circuitTitle={
          activePreset && activePreset !== "Custom Blank"
            ? `${activePreset} (Lab Simulator)`
            : "Circuit & Logic Oscilloscope"
        }
        probedSignals={probedWireSignals}
        onRemoveProbe={(ch) =>
          setAttachedProbes((prev) => prev.filter((p) => p.channelId !== ch))
        }
        onClearAllProbes={() => setAttachedProbes([])}
        onAutoProbeWires={() => {
          if (wires.length === 0) return;
          // Priority selection: prefer wires connected to AC_SINE, DIODE, LOAD, or active nets
          const prioritizedWires = [...wires].sort((a, b) => {
            const aSrc = nodes.find((n) => n.id === a.from.node);
            const aDst = nodes.find((n) => n.id === a.to.node);
            const bSrc = nodes.find((n) => n.id === b.from.node);
            const bDst = nodes.find((n) => n.id === b.to.node);

            const score = (src?: CircuitNode, dst?: CircuitNode) => {
              if (!src && !dst) return 0;
              let s = 0;
              if (src?.type === "AC_SINE" || dst?.type === "AC_SINE") s += 10;
              if (src?.type === "DIODE_1N4007" || dst?.type === "DIODE_1N4007") s += 8;
              if (src?.type === "BRIDGE_RECT" || dst?.type === "BRIDGE_RECT") s += 8;
              if (src?.type === "RES" || dst?.type === "RES") s += 6;
              if (src?.type === "OUTPUT" || dst?.type === "OUTPUT") s += 5;
              if (src?.type === "GND" || dst?.type === "GND") s += 4;
              return s;
            };
            return score(bSrc, bDst) - score(aSrc, aDst);
          });

          const nextProbes: AttachedWireProbe[] = prioritizedWires
            .slice(0, 4)
            .map((w, idx) => ({
              channelId: PROBE_CHANNELS[idx].channelId,
              wireId: w.id,
              tPos: 0.4 + (idx % 3) * 0.15,
            }));
          setAttachedProbes(nextProbes);
        }}
        onStepClock={pulseClockInputs}
        clockHz={clockHz}
      />

      {/* Dedicated BJT I-V Characteristic Curve Tracer Modal */}
      <BjtCurveTracerModal
        isOpen={isBjtCurveTracerOpen}
        onClose={() => setIsBjtCurveTracerOpen(false)}
        bjtList={bjtComponentItems}
        onSelectNodeInCanvas={(id) => {
          setSelected({ type: "node", id });
          const target = nodes.find((n) => n.id === id);
          if (target) setPan({ x: -target.x + 360, y: -target.y + 240 });
        }}
        onAddBjtToCanvas={(model) => {
          const type = model.includes("557") ? "BC557" : "BC547";
          addNodeAt(type, 380, 220);
        }}
        vccSupply={5}
        rcCollectorResistor={1000}
      />

      {/* Interactive 3D Orbit Component Model & Verified Datasheets Modal */}
      {inspectingComponentId && (
        <RealisticComponentModal
          isOpen={!!inspectingComponentId}
          onClose={() => setInspectingComponentId(null)}
          componentId={inspectingComponentId}
          initialValue={
            selected?.type === "node"
              ? nodes.find((n) => n.id === selected.id)?.analogParams?.resistanceOhms
              : undefined
          }
          initialFormattedValue={
            selected?.type === "node"
              ? nodes.find((n) => n.id === selected.id)?.analogParams?.formattedValue
              : undefined
          }
          onUpdateValue={(newVal, fmt) => {
            if (selected?.type === "node") {
              updateNode(selected.id, {
                analogParams: {
                  ...nodes.find((n) => n.id === selected.id)?.analogParams,
                  resistanceOhms: newVal,
                  formattedValue: fmt,
                },
              });
            }
          }}
          onInsertToCanvas={(type) => {
            addNodeAuto(type);
          }}
        />
      )}

      {/* Precision Measurement Equipment (PME) Guidance & Metrology Standards Assistant Modal */}
      <PmeGuidanceModal
        isOpen={isPmeModalOpen}
        onClose={() => setIsPmeModalOpen(false)}
        activeMeterType={pmeModalMeterType}
        nodes={nodes}
        wires={wires}
        analogSolution={analogSolution}
        onAutoFixFault={handleAutoFixMeterFault}
      />

      {/* New Project Template Library Modal */}
      <NewProjectTemplateModal
        isOpen={isTemplateLibraryOpen}
        onClose={() => setIsTemplateLibraryOpen(false)}
        onCreateBlank={() => {
          prevOutsRef.current = {};
          setNodes([]);
          setWires([]);
          setSelected(null);
          setPendingWire(null);
          setWaveformHistory([]);
          setActivePreset("Custom User Schematic (Draw Mode)");
          onClearExternalCircuit?.();
          setAttachedProbes([]);
        }}
        onSelectTemplate={(tpl: CircuitProjectTemplate) => {
          loadCircuitDefs(tpl.name, tpl.nodes, tpl.wires);
          setIsSimRunning(true);
          if (tpl.defaultFreqHz > 0 && tpl.defaultFreqHz <= 20) {
            setClockHz(tpl.defaultFreqHz);
          }
          setAutoClock(tpl.autoStartClock);
        }}
      />

      {/* Live Pairing 2-Student Collaboration Modal */}
      <LivePairingModal
        isOpen={isLivePairingModalOpen}
        onClose={() => setIsLivePairingModalOpen(false)}
        pairingUser={resolvedPairingUser}
        session={pairingSession}
        transportHint={pairingTransportHint}
        initialJoinCode={initialPairCode || ""}
        isBusy={pairingBusy}
        errorMessage={pairingError}
        onCreateSession={handleCreatePairingSession}
        onJoinSession={handleJoinPairingSession}
        onLeaveSession={handleLeavePairingSession}
      />
    </div>
  );
}
