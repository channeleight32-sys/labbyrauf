import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { getUserScopedKey } from "../utils/userStorageScope";
import {
  Zap,
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Download,
  Printer,
  FileText,
  Sliders,
  Layers,
  Cpu,
  BookOpen,
  AlertTriangle,
  HelpCircle,
  Copy,
  CopyPlus,
  Check,
  ChevronRight,
  ChevronLeft,
  Eye,
  Info,
  Table,
  Code2,
  Radio,
  Palette,
  Sun,
  Moon,
  Terminal,
  GraduationCap,
  Volume2,
  VolumeX,
  Undo2,
  Redo2,
  Save,
  Trash2,
  Cable,
  Unplug,
  AlertCircle,
} from "lucide-react";
import {
  InteractiveProject,
  SchematicComponent,
} from "../types/interactiveSchematic";
import type {
  CircuitProjectModel,
  CircuitComponentInstance,
} from "../types/circuitModel";
import { INTERACTIVE_PROJECTS_REGISTRY } from "../data/interactiveProjectsRegistry";
import { calculateResistorColorBands } from "../data/realisticComponentsData";
import { ActiveTabId } from "./CurriculumGuide";
import { CANVAS_COLOR_THEMES, CanvasColorThemeId } from "./CircuitLab";
import { SchematicRenderer } from "./SchematicRenderer";
import SimulationErrorBoundary from "./SimulationErrorBoundary";
import {
  projectToCircuitModel,
  formatComponentDisplayValue,
  addComponentToModel,
  removeComponentFromModel,
  duplicateComponentInModel,
  moveComponentInModel,
  rotateComponentInModel,
  updateComponentValueInModel,
  addConnectionToModel,
  removeConnectionFromModel,
  disconnectPinInModel,
  rewireTopologyInModel,
  runUnifiedCircuitSimulation,
  buildDynamicBOM,
  type AddComponentSpec,
} from "../utils/circuitModelEngine";
import {
  CircuitStore,
  saveCircuitProject,
  loadCircuitProject,
  listSavedCircuitProjects,
  deleteSavedCircuitProject,
  duplicateCircuitProject,
  createHistoryState,
  pushHistoryState,
  undoHistoryState,
  redoHistoryState,
  type HistoryStackState,
} from "../utils/circuitProjectStore";

interface InteractiveCircuitSystemProps {
  initialProjectId?: string;
  onNavigateTab?: (tab: ActiveTabId) => void;
  onSelectComponentForInspection?: (compId: string) => void;
  onProjectsChanged?: () => void;
}

// Dedicated Six-Tab Learning Environment for Every Project
export type ProjectLearningTabId =
  | "SCHEMATIC" // 1. Circuit schematic
  | "HARDWARE" // 2. Realistic hardware components
  | "WIRING" // 3. Interactive wiring workbench
  | "CODE" // 4. Source code and firmware
  | "SIMULATION" // 5. Simulation and virtual instruments
  | "REPORT"; // 6. Theory, calculations and lab report

type HighlightMode = "NONE" | "CURRENT_FLOW" | "SIGNAL_PATH";

function mapCompToRealisticId(comp: { type?: string; partNumber?: string; name?: string }): string {
  const p = (comp.partNumber || "").toUpperCase();
  const n = (comp.name || "").toUpperCase();
  if (p.includes("BC547") || n.includes("BC547")) return "BJT_BC547";
  if (p.includes("2N2222") || n.includes("2N2222")) return "BJT_2N2222";
  if (p.includes("NE555") || p.includes("555") || n.includes("555")) return "IC_NE555";
  if (p.includes("LM741") || p.includes("741") || n.includes("741")) return "IC_LM741";
  if (p.includes("LM358") || p.includes("358") || n.includes("358")) return "IC_LM358";
  if (p.includes("7805") || n.includes("7805")) return "IC_7805";
  if (p.includes("1N47") || n.includes("ZENER")) return "DIODE_1N4007";
  if (p.includes("1N4007") || n.includes("1N4007")) return "DIODE_1N4007";
  if (p.includes("1N4148") || n.includes("1N4148")) return "DIODE_1N4148";
  if (p.includes("ESP32") || n.includes("ESP32")) return "ESP32_DEVKIT_V1";
  if (p.includes("UNO") || n.includes("ARDUINO")) return "ARDUINO_UNO_R3";
  if (p.includes("PICO") || n.includes("PICO")) return "RPI_PICO";
  if (p.includes("7400") || p.includes("74LS00")) return "IC_74LS00";
  if (p.includes("7404") || p.includes("74LS04")) return "IC_74LS04";
  if (p.includes("7408") || p.includes("74LS08")) return "IC_74LS08";
  if (p.includes("7432") || p.includes("74LS32")) return "IC_74LS32";
  if (p.includes("7486") || p.includes("74LS86")) return "IC_74LS86";
  if (p.includes("4017") || p.includes("CD4017")) return "IC_CD4017";
  if (p.includes("LORA") || n.includes("LORA")) return "MODULE_LORA_SX1278";
  if (p.includes("HC-05") || n.includes("BLUETOOTH")) return "MODULE_HC05_BLUETOOTH";
  if (comp.type === "RESISTOR") return "RES_CARBON";
  if (comp.type === "CAPACITOR") return "CAP_CERAMIC";
  if (comp.type === "CAPACITOR_POLARIZED") return "CAP_ELECTROLYTIC";
  if (comp.type === "INDUCTOR") return "IND_TOROIDAL";
  if (comp.type === "LED") return "LED_5MM_RED";
  if (comp.type === "POTENTIOMETER") return "POT_ROTARY";
  if (comp.type === "SWITCH") return "PUSHBUTTON";
  return "RES_CARBON";
}

const interactiveCircuitStore = new CircuitStore({
  presetFactory: {
    hasPreset: (id) => INTERACTIVE_PROJECTS_REGISTRY.some((p) => p.id === id),
    createFreshModel: (id) => {
      const preset = INTERACTIVE_PROJECTS_REGISTRY.find((p) => p.id === id);
      return preset ? projectToCircuitModel(preset) : null;
    },
  },
});

function buildInitialModelForId(projectId: string): {
  model: CircuitProjectModel | null;
  baseProject: InteractiveProject | null;
  error: string | null;
} {
  const loadedModel = interactiveCircuitStore.loadProject(projectId);
  const presetFromSavedSource = loadedModel?.metadata?.sourcePresetId
    ? INTERACTIVE_PROJECTS_REGISTRY.find((p) => p.id === loadedModel.metadata.sourcePresetId) || null
    : null;
  const directPreset = INTERACTIVE_PROJECTS_REGISTRY.find((p) => p.id === projectId) || null;

  if (loadedModel) {
    return {
      model: loadedModel,
      baseProject: presetFromSavedSource || directPreset || null,
      error: null,
    };
  }

  return {
    model: null,
    baseProject: null,
    error: `Requested circuit project "${projectId}" could not be found in built-in presets or saved projects.`,
  };
}

export const InteractiveCircuitSystem: React.FC<InteractiveCircuitSystemProps> = ({
  initialProjectId,
  onNavigateTab,
  onSelectComponentForInspection,
  onProjectsChanged,
}) => {
  const [savedProjectsList, setSavedProjectsList] = useState<CircuitProjectModel[]>(() =>
    listSavedCircuitProjects()
  );

  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    initialProjectId || INTERACTIVE_PROJECTS_REGISTRY[0].id
  );

  // Sync when caller explicitly requests a project ID (even if invalid -> show error cleanly!)
  useEffect(() => {
    if (initialProjectId) {
      setSelectedProjectId(initialProjectId);
    }
  }, [initialProjectId]);

  const resolvedInit = useMemo(
    () => buildInitialModelForId(selectedProjectId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedProjectId]
  );

  const [history, setHistory] = useState<HistoryStackState<CircuitProjectModel> | null>(() =>
    resolvedInit.model ? createHistoryState(resolvedInit.model) : null
  );

  const activeModel = history?.present ?? null;
  const baseProject = resolvedInit.baseProject;
  const baseDefaultModel = useMemo(
    () => (baseProject ? projectToCircuitModel(baseProject) : null),
    [baseProject]
  );

  // Reset history stack cleanly whenever switching projects
  useEffect(() => {
    const next = buildInitialModelForId(selectedProjectId);
    setHistory(next.model ? createHistoryState(next.model) : null);
    setSelectedComponentId(null);
    setSelectedNetName(null);
    setSelectedWireId(null);
    setPendingWirePin(null);
    setTeachingStepIdx(0);
    setActiveCodeFileIdx(0);
    setContinuityProbedNode(null);
  }, [selectedProjectId]);

  // Six-Tab Primary Learning Environment State
  const [activeTab, setActiveTab] = useState<ProjectLearningTabId>("SCHEMATIC");
  const [saveToast, setSaveToast] = useState<string | null>(null);

  // Simulation & Interactive Canvas States
  const [isSimulating, setIsSimulating] = useState<boolean>(true);
  const [simSpeed, setSimSpeed] = useState<number>(1.0);
  const [highlightMode, setHighlightMode] = useState<HighlightMode>("CURRENT_FLOW");
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);
  const [selectedNetName, setSelectedNetName] = useState<string | null>(null);
  const [selectedWireId, setSelectedWireId] = useState<string | null>(null);
  const [pendingWirePin, setPendingWirePin] = useState<{
    componentId: string;
    pinId: string;
  } | null>(null);

  // Teaching Mode
  const [isTeachingMode, setIsTeachingMode] = useState<boolean>(false);
  const [teachingStepIdx, setTeachingStepIdx] = useState<number>(0);

  // Source Code Switcher
  const [activeCodeFileIdx, setActiveCodeFileIdx] = useState<number>(0);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [copiedBOM, setCopiedBOM] = useState<boolean>(false);

  // Virtual Instrument State
  const [dmmMode, setDmmMode] = useState<"VDC" | "VAC" | "RES" | "CURR">("VDC");
  const [dmmProbedNet, setDmmProbedNet] = useState<string>("OUT");
  const [continuityProbedNode, setContinuityProbedNode] = useState<string | null>(null);
  const [continuitySoundActive, setContinuitySoundActive] = useState<boolean>(false);

  // Student Lab Report State
  const [studentName, setStudentName] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(getUserScopedKey("ist_lab_student_profile"));
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.name) return parsed.name;
      }
    } catch {
      // ignore
    }
    return "Engr. Student";
  });
  const [studentId, setStudentId] = useState<string>("FA22-BEE-042");
  const [studentSection, setStudentSection] = useState<string>("EE-3A / Station 04");
  const [instructorName] = useState<string>("Engr. M. Asif (Lab In-Charge)");
  const [reportDate, setReportDate] = useState<string>(() => new Date().toISOString().split("T")[0]);
  const [studentNotes, setStudentNotes] = useState<string>(
    "Experimental waveforms match theoretical calculations within tolerance. Oscilloscope traces and MNA nodal voltages verified."
  );
  const [reportPrinted, setReportPrinted] = useState<boolean>(false);

  // Zoom, Pan & Component Dragging state
  const [zoom, setZoom] = useState<number>(1.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const schematicSvgRef = useRef<SVGSVGElement | null>(null);
  const [draggingComp, setDraggingComp] = useState<{
    id: string;
    offsetX: number;
    offsetY: number;
    snapshotBeforeDrag: CircuitProjectModel;
  } | null>(null);

  // Canvas Theme state
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
  const [isCanvasColorMenuOpen, setIsCanvasColorMenuOpen] = useState(false);
  const activeCanvasTheme = CANVAS_COLOR_THEMES[canvasThemeId] || CANVAS_COLOR_THEMES.slate;

  const handleSelectCanvasTheme = (themeId: CanvasColorThemeId) => {
    setCanvasThemeId(themeId);
    setIsCanvasColorMenuOpen(false);
    try {
      localStorage.setItem(getUserScopedKey("ist_circuit_canvas_color"), themeId);
    } catch {
      // ignore
    }
  };

  const handleToggleDayNight = () => {
    handleSelectCanvasTheme(activeCanvasTheme.isLight ? "slate" : "paper");
  };

  // Safe model commit helper that always maintains Undo/Redo history
  const commitModel = useCallback((nextModel: CircuitProjectModel) => {
    setHistory((prev) => (prev ? pushHistoryState(prev, nextModel) : createHistoryState(nextModel)));
  }, []);

  const handleUndo = useCallback(() => {
    setHistory((prev) => (prev ? undoHistoryState(prev) : prev));
  }, []);

  const handleRedo = useCallback(() => {
    setHistory((prev) => (prev ? redoHistoryState(prev) : prev));
  }, []);

  // Component & Connection Mutation Handlers
  const handleTogglePower = () => {
    if (!activeModel) return;
    const nextModel: CircuitProjectModel = {
      ...activeModel,
      simulationConfig: {
        ...activeModel.simulationConfig,
        isPowered: !activeModel.simulationConfig.isPowered,
      },
      metadata: {
        ...activeModel.metadata,
        updatedAt: Date.now(),
        isModified: true,
      },
    };
    commitModel(nextModel);
  };

  const handleUpdateComponentValue = (compId: string, newVal: number) => {
    if (!activeModel) return;
    commitModel(updateComponentValueInModel(activeModel, compId, newVal));
  };

  const handleRemoveComponent = useCallback(
    (compId: string) => {
      if (!activeModel) return;
      commitModel(removeComponentFromModel(activeModel, compId));
      if (selectedComponentId === compId) {
        setSelectedComponentId(null);
      }
      if (pendingWirePin?.componentId === compId) {
        setPendingWirePin(null);
      }
    },
    [activeModel, commitModel, selectedComponentId, pendingWirePin]
  );

  const handleAddWorkingComponent = (kind: AddComponentSpec["type"]) => {
    if (!activeModel) return;
    const { model: next, addedComponent } = addComponentToModel(activeModel, { type: kind });
    commitModel(next);
    setSelectedComponentId(addedComponent.id);
  };

  const handleDuplicateComponent = (compId: string) => {
    if (!activeModel) return;
    const { model: next, duplicatedComponent } = duplicateComponentInModel(activeModel, compId);
    commitModel(next);
    if (duplicatedComponent) {
      setSelectedComponentId(duplicatedComponent.id);
    }
  };

  const handleRotateComponent = (compId: string) => {
    if (!activeModel) return;
    commitModel(rotateComponentInModel(activeModel, compId, 90));
  };

  const handleRemoveSelectedWire = () => {
    if (!activeModel || !selectedWireId) return;
    commitModel(removeConnectionFromModel(activeModel, selectedWireId));
    setSelectedWireId(null);
  };

  const handleDisconnectPin = (componentId: string, pinId: string) => {
    if (!activeModel) return;
    commitModel(disconnectPinInModel(activeModel, componentId, pinId));
  };

  const handlePinClick = (componentId: string, pinId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activeModel) return;
    if (!pendingWirePin) {
      setPendingWirePin({ componentId, pinId });
      return;
    }
    if (pendingWirePin.componentId === componentId && pendingWirePin.pinId === pinId) {
      setPendingWirePin(null);
      return;
    }
    const next = addConnectionToModel(
      activeModel,
      pendingWirePin.componentId,
      pendingWirePin.pinId,
      componentId,
      pinId
    );
    commitModel(next);
    setPendingWirePin(null);
  };

  const handleRewireTopology = (mode: "ORIGINAL" | "SERIES" | "PARALLEL" | "COMBINATION") => {
    if (!activeModel) return;
    const next = rewireTopologyInModel(
      activeModel,
      mode,
      mode === "ORIGINAL" ? baseDefaultModel ?? undefined : undefined
    );
    commitModel(next);
    setSelectedWireId(null);
    setPendingWirePin(null);
  };

  const handleSaveProject = () => {
    if (!activeModel) return;
    const saved = saveCircuitProject(activeModel);
    setHistory((prev) =>
      prev ? { ...prev, present: saved } : createHistoryState(saved)
    );
    setSavedProjectsList(listSavedCircuitProjects());
    onProjectsChanged?.();
    setSaveToast(`Saved "${saved.name}" independently.`);
    setTimeout(() => setSaveToast(null), 3000);
  };

  const handleDuplicateProjectAsCopy = () => {
    if (!activeModel) return;
    const customName = `${activeModel.name} (Copy)`;
    const created = duplicateCircuitProject(activeModel, customName);
    setSavedProjectsList(listSavedCircuitProjects());
    onProjectsChanged?.();
    setSelectedProjectId(created.projectId);
    setSaveToast(`Created independent copy "${created.name}".`);
    setTimeout(() => setSaveToast(null), 3000);
  };

  const handleResetToDefaultPreset = () => {
    if (!baseDefaultModel) return;
    deleteSavedCircuitProject(selectedProjectId);
    setSavedProjectsList(listSavedCircuitProjects());
    const fresh = projectToCircuitModel(baseProject!);
    setHistory(createHistoryState(fresh));
    setSelectedComponentId(null);
    setSelectedWireId(null);
    onProjectsChanged?.();
    setSaveToast(`Reset "${fresh.name}" to factory preset.`);
    setTimeout(() => setSaveToast(null), 3000);
  };

  // Keyboard shortcuts: Delete/Backspace component/wire, Esc cancel wire, Ctrl+Z/Y Undo/Redo
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        handleRedo();
        return;
      }
      if (e.key === "Escape") {
        setPendingWirePin(null);
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedWireId && activeModel) {
          e.preventDefault();
          commitModel(removeConnectionFromModel(activeModel, selectedWireId));
          setSelectedWireId(null);
          return;
        }
        if (selectedComponentId) {
          e.preventDefault();
          handleRemoveComponent(selectedComponentId);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    selectedComponentId,
    selectedWireId,
    activeModel,
    commitModel,
    handleRemoveComponent,
    handleUndo,
    handleRedo,
  ]);

  // SVG Coordinate Helper for Smooth Component Dragging
  const clientToSvgCoords = useCallback(
    (clientX: number, clientY: number) => {
      const svg = schematicSvgRef.current;
      if (!svg) return { x: 400, y: 260 };
      const rect = svg.getBoundingClientRect();
      // Account for CSS pan & zoom transform around center (440, 270)
      const normX = (clientX - rect.left) / Math.max(1, rect.width);
      const normY = (clientY - rect.top) / Math.max(1, rect.height);
      return {
        x: Math.round(normX * 880),
        y: Math.round(normY * 540),
      };
    },
    []
  );

  // Live simulation tick timer
  const isPowered = activeModel?.simulationConfig.isPowered ?? true;
  const [simTime, setSimTime] = useState<number>(0);
  useEffect(() => {
    if (!isSimulating || !isPowered || !activeModel) return;
    const interval = setInterval(() => {
      setSimTime((t) => t + 0.04 * simSpeed);
    }, 40);
    return () => clearInterval(interval);
  }, [isSimulating, isPowered, simSpeed, activeModel]);

  // UNIFIED NETLIST-DRIVEN MNA / SPICE SIMULATION
  const simulationResults = useMemo(() => {
    if (!activeModel) {
      return {
        netVoltages: {},
        branchCurrents: {},
        componentTelemetry: {},
        reqOhm: null,
        totalSupplyCurrentMa: 0,
        totalLoadPowerMw: 0,
        topologyClass: "NONE",
        validation: {
          valid: false,
          errors: [],
          warnings: [],
          disconnectedPins: [],
          floatingComponents: [],
        },
        waveforms: [],
        metrics: [],
      };
    }
    return runUnifiedCircuitSimulation(activeModel, {
      simTime,
      legacyFallbackProject: baseProject ?? undefined,
    });
  }, [activeModel, simTime, baseProject]);

  // Dynamic BOM directly synchronized with activeModel.components
  const dynamicBOM = useMemo(() => {
    if (!activeModel) return [];
    return buildDynamicBOM(activeModel.components);
  }, [activeModel]);

  // Selected component lookup strictly from activeModel
  const selectedComponent: CircuitComponentInstance | null = useMemo(() => {
    if (!activeModel || !selectedComponentId) return null;
    return activeModel.components.find((c) => c.id === selectedComponentId) || null;
  }, [activeModel, selectedComponentId]);

  const activeTeachingStep = useMemo(() => {
    if (!isTeachingMode || !baseProject?.teachingSteps?.length) return null;
    return baseProject.teachingSteps[teachingStepIdx % baseProject.teachingSteps.length];
  }, [isTeachingMode, teachingStepIdx, baseProject]);

  // Sound continuity & audio monitor
  const playContinuityBeep = (freq = 2400, durationMs = 120) => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durationMs / 1000);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + durationMs / 1000);
      setContinuitySoundActive(true);
      setTimeout(() => setContinuitySoundActive(false), durationMs + 80);
    } catch {
      // ignore autoplay block
    }
  };

  const [isAudioMonitorActive, setIsAudioMonitorActive] = useState<boolean>(false);
  const audioOscRef = useRef<{ ctx: AudioContext; osc: OscillatorNode; gain: GainNode } | null>(null);

  const stopAudioMonitor = () => {
    if (audioOscRef.current) {
      try {
        audioOscRef.current.osc.stop();
        audioOscRef.current.ctx.close();
      } catch {
        // ignore
      }
      audioOscRef.current = null;
    }
    setIsAudioMonitorActive(false);
  };

  const toggleAudioMonitor = () => {
    if (isAudioMonitorActive) {
      stopAudioMonitor();
      return;
    }
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      const freqMetric = simulationResults.metrics.find((m) => m.label.toLowerCase().includes("freq"));
      let targetFreq = 440;
      if (freqMetric) {
        const parsedF = parseFloat(freqMetric.value);
        if (!isNaN(parsedF) && parsedF > 20 && parsedF < 20000) targetFreq = parsedF;
      }
      osc.frequency.setValueAtTime(targetFreq, ctx.currentTime);
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      audioOscRef.current = { ctx, osc, gain };
      setIsAudioMonitorActive(true);
    } catch {
      // ignore
    }
  };

  useEffect(() => () => stopAudioMonitor(), []);
  useEffect(() => {
    if (!isPowered) stopAudioMonitor();
  }, [isPowered]);

  // Source code files (with live SPICE netlist generated dynamically alongside firmware!)
  const projectCodeFiles = useMemo(() => {
    const files: { filename: string; title: string; language: string; code: string; description?: string }[] = [];
    if (activeModel) {
      const spiceLines = [
        `* Dynamically Generated Netlist — ${activeModel.name}`,
        `* Project ID: ${activeModel.projectId} | Topology: ${activeModel.topology}`,
        ...activeModel.components.map((c) => {
          const connectedNets = activeModel.nets
            .filter((n) => n.connectedPins.some((p) => p.componentId === c.id))
            .map((n) => n.netName);
          return `${c.refDes.padEnd(8)} ${connectedNets.join(" ").padEnd(18)} ; ${c.type} = ${c.displayValue}`;
        }),
        `.op`,
        `.end`,
      ].join("\n");
      files.push({
        filename: `${activeModel.projectId}.cir`,
        title: `Live SPICE Netlist (${activeModel.topology})`,
        language: "spice",
        code: spiceLines,
        description: "Auto-generated in real time from active schematic components and wire connections.",
      });
    }
    if (baseProject?.documentation.sourceCode) {
      files.push({
        filename: baseProject.documentation.sourceCode.filename,
        title: baseProject.documentation.sourceCode.title,
        language: baseProject.documentation.sourceCode.language,
        code: baseProject.documentation.sourceCode.code,
        description: baseProject.documentation.sourceCode.description,
      });
      if (baseProject.documentation.sourceCode.alternateFiles) {
        files.push(...baseProject.documentation.sourceCode.alternateFiles);
      }
    }
    return files;
  }, [activeModel, baseProject]);

  const activeCodeFile = projectCodeFiles[activeCodeFileIdx % Math.max(1, projectCodeFiles.length)] || null;

  // Dynamic Real-Time Telemetry Log driven by activeModel + MNA solution
  const [serialLogs, setSerialLogs] = useState<string[]>([]);
  useEffect(() => {
    if (!isPowered || !isSimulating || !activeModel) return;
    const interval = setInterval(() => {
      const now = new Date().toTimeString().split(" ")[0];
      const topNets = Object.entries(simulationResults.netVoltages)
        .filter(([k]) => k !== "GND")
        .slice(0, 3)
        .map(([k, v]) => `${k}=${v.toFixed(2)}V`)
        .join(" | ");
      const reqStr =
        simulationResults.reqOhm !== null && isFinite(simulationResults.reqOhm)
          ? `R_eq=${simulationResults.reqOhm.toFixed(1)}Ω`
          : "Nonlinear";
      const msg = `[${now}] [${activeModel.topology}] ${activeModel.name}: I_sup=${simulationResults.totalSupplyCurrentMa.toFixed(2)}mA | ${reqStr}${topNets ? ` | ${topNets}` : ""}`;
      setSerialLogs((prev) => [msg, ...prev.slice(0, 35)]);
    }, 1200);
    return () => clearInterval(interval);
  }, [isPowered, isSimulating, activeModel, simulationResults]);

  // All selectable projects (Built-in registry + Custom/Saved copies)
  const allSelectableProjects = useMemo(() => {
    const builtInIds = new Set(INTERACTIVE_PROJECTS_REGISTRY.map((p) => p.id));
    const customSaved = savedProjectsList.filter((s) => !builtInIds.has(s.projectId));
    return {
      builtIn: INTERACTIVE_PROJECTS_REGISTRY,
      customSaved,
    };
  }, [savedProjectsList]);

  // Combined ordered project IDs for Prev/Next cycling
  const allProjectIds = useMemo(
    () => [
      ...allSelectableProjects.builtIn.map((p) => p.id),
      ...allSelectableProjects.customSaved.map((p) => p.projectId),
    ],
    [allSelectableProjects]
  );

  // Explicit Error / Repair State when project ID is missing/invalid (NEVER silently show a wrong schematic)
  if (!activeModel) {
    return (
      <div className="w-full max-w-4xl mx-auto p-6 bg-[#0B0F19] border border-rose-500/50 rounded-2xl space-y-4 font-mono text-slate-100">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-rose-300">
              Missing or Invalid Circuit Project Schematic
            </h2>
            <p className="text-xs text-slate-300">
              {resolvedInit.error || `Project "${selectedProjectId}" has no valid schematic data.`}
            </p>
            <p className="text-[11px] text-slate-400">
              Strict Single-Source-of-Truth enforcement prevented substituting a fallback circuit schematic.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 pt-2">
          <button
            type="button"
            onClick={() => setSelectedProjectId(INTERACTIVE_PROJECTS_REGISTRY[0].id)}
            className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs cursor-pointer"
          >
            Load Default Project ({INTERACTIVE_PROJECTS_REGISTRY[0].title})
          </button>
          {onNavigateTab && (
            <button
              type="button"
              onClick={() => onNavigateTab("home")}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs cursor-pointer"
            >
              Return to Home
            </button>
          )}
        </div>
      </div>
    );
  }

  const handleExportSVG = () => {
    if (!schematicSvgRef.current) return;
    const svgData = new XMLSerializer().serializeToString(schematicSvgRef.current);
    const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeModel.projectId}_ieee315_schematic.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrintReport = () => {
    setReportPrinted(true);
    window.print();
    setTimeout(() => setReportPrinted(false), 2000);
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-3 sm:p-5 space-y-5 text-slate-100 font-sans">
      {/* 1. PROJECT SELECTOR & ISOLATED PERSISTENCE HEADER */}
      <div className="bg-[#0B0F19] border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xl backdrop-blur-md space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
              <span className="text-cyan-400 font-bold tracking-wider">
                {baseProject?.domainTitle || "CUSTOM CIRCUIT PROJECT"}
              </span>
              <span className="text-slate-600">·</span>
              <span className="text-emerald-400 font-semibold">
                {activeModel.topology} Topology
              </span>
              <span className="text-slate-600">·</span>
              <span className="text-amber-300 font-semibold">
                VCC: {activeModel.simulationConfig.supplyVoltage} V
              </span>
              <span className="text-slate-600">·</span>
              <span className="text-slate-400">
                {activeModel.components.length} Components, {activeModel.connections.length} Connections, {activeModel.nets.length} Nets
              </span>
              {activeModel.metadata.isModified && (
                <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-400/50 text-amber-300 text-[10px] font-bold">
                  MODIFIED
                </span>
              )}
              {savedProjectsList.some((s) => s.projectId === activeModel.projectId) && (
                <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold">
                  SAVED v{activeModel.metadata.version}
                </span>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <span>{activeModel.name}</span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {activeModel.description}
            </p>
          </div>

          {/* Project Switcher & Persistence Action Strip */}
          <div className="flex flex-col items-stretch sm:items-end gap-2 shrink-0">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  const idx = allProjectIds.indexOf(selectedProjectId);
                  const prevIdx = (idx - 1 + allProjectIds.length) % allProjectIds.length;
                  setSelectedProjectId(allProjectIds[prevIdx]);
                }}
                className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white cursor-pointer transition-colors"
                title="Previous Project"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <select
                aria-label="Select Active Engineering Project"
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="bg-slate-900 border border-cyan-500/40 rounded-xl px-3 py-2 text-xs font-mono font-bold text-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-500 cursor-pointer max-w-[280px] truncate"
              >
                <optgroup label="Foundational & Course Projects">
                  {allSelectableProjects.builtIn.map((p) => (
                    <option key={p.id} value={p.id} className="bg-slate-950 text-slate-200">
                      {p.title}
                    </option>
                  ))}
                </optgroup>
                {allSelectableProjects.customSaved.length > 0 && (
                  <optgroup label="Saved Custom Copies">
                    {allSelectableProjects.customSaved.map((p) => (
                      <option key={p.projectId} value={p.projectId} className="bg-slate-950 text-emerald-300">
                        ★ {p.name}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>

              <button
                type="button"
                onClick={() => {
                  const idx = allProjectIds.indexOf(selectedProjectId);
                  const nextIdx = (idx + 1) % allProjectIds.length;
                  setSelectedProjectId(allProjectIds[nextIdx]);
                }}
                className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white cursor-pointer transition-colors"
                title="Next Project"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono">
              <button
                type="button"
                onClick={handleSaveProject}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/50 text-emerald-300 font-bold cursor-pointer"
                title="Save this project independently to browser storage"
              >
                <Save className="w-3.5 h-3.5" />
                Save Project
              </button>
              <button
                type="button"
                onClick={handleDuplicateProjectAsCopy}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 font-bold cursor-pointer"
                title="Create an independent duplicate copy of this project"
              >
                <CopyPlus className="w-3.5 h-3.5" />
                Duplicate Project
              </button>
              {baseDefaultModel && (
                <button
                  type="button"
                  onClick={handleResetToDefaultPreset}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-bold cursor-pointer"
                  title="Reset to default factory preset"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset Default
                </button>
              )}
              {baseProject && baseProject.teachingSteps.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsTeachingMode((v) => !v)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border font-bold cursor-pointer ${
                    isTeachingMode
                      ? "bg-purple-500/25 border-purple-400 text-purple-200"
                      : "bg-slate-900 border-slate-700 text-slate-300 hover:text-white"
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  Guided Tour
                </button>
              )}
            </div>
          </div>
        </div>

        {saveToast && (
          <div className="px-3 py-2 rounded-xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-xs font-mono">
            {saveToast}
          </div>
        )}

        {activeTeachingStep && (
          <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono">
            <div>
              <span className="text-purple-300 font-bold">
                Step {teachingStepIdx + 1}/{baseProject!.teachingSteps.length}: {activeTeachingStep.title}
              </span>
              <p className="text-slate-300 mt-0.5">{activeTeachingStep.description}</p>
            </div>
            <button
              type="button"
              onClick={() => setTeachingStepIdx((i) => (i + 1) % baseProject!.teachingSteps.length)}
              className="px-3 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold shrink-0 cursor-pointer"
            >
              Next Step
            </button>
          </div>
        )}

        {/* Six-Tab Navigation Bar + Universal Power/Sim Controls */}
        <div className="pt-3 border-t border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono">
            {[
              { id: "SCHEMATIC" as ProjectLearningTabId, label: "1. Circuit Schematic", icon: FileText, color: "text-cyan-300" },
              { id: "HARDWARE" as ProjectLearningTabId, label: "2. Realistic Hardware", icon: Cpu, color: "text-emerald-300" },
              { id: "WIRING" as ProjectLearningTabId, label: "3. Wiring Workbench", icon: Layers, color: "text-blue-300" },
              { id: "CODE" as ProjectLearningTabId, label: "4. Code & SPICE Netlist", icon: Code2, color: "text-purple-300" },
              { id: "SIMULATION" as ProjectLearningTabId, label: "5. Virtual Instruments", icon: Radio, color: "text-amber-300" },
              { id: "REPORT" as ProjectLearningTabId, label: "6. Theory & Lab Report", icon: GraduationCap, color: "text-rose-300" },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                    isActive
                      ? "bg-slate-800 text-white shadow-md border border-slate-700"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? tab.color : "text-slate-400"}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 self-end md:self-center">
            <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1">
              <button
                type="button"
                onClick={handleUndo}
                disabled={!history || history.past.length === 0}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-mono font-bold text-slate-200 hover:bg-slate-800 disabled:opacity-35 cursor-pointer"
                title="Undo (Ctrl+Z)"
              >
                <Undo2 className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden sm:inline">Undo</span>
              </button>
              <button
                type="button"
                onClick={handleRedo}
                disabled={!history || history.future.length === 0}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-mono font-bold text-slate-200 hover:bg-slate-800 disabled:opacity-35 cursor-pointer"
                title="Redo (Ctrl+Y)"
              >
                <Redo2 className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden sm:inline">Redo</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleTogglePower}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-mono font-bold cursor-pointer transition-all border ${
                isPowered
                  ? "bg-emerald-950/70 border-emerald-400 text-emerald-300 shadow-sm shadow-emerald-500/20"
                  : "bg-slate-900 border-slate-700 text-slate-400 hover:text-white"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isPowered ? "bg-emerald-400" : "bg-slate-500"}`} />
              <span>{isPowered ? `VCC: ${activeModel.simulationConfig.supplyVoltage}V ON` : "POWER OFF"}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsSimulating((s) => !s)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold cursor-pointer transition-all border ${
                isSimulating
                  ? "bg-cyan-950/60 border-cyan-400 text-cyan-300"
                  : "bg-amber-950/60 border-amber-400 text-amber-300"
              }`}
            >
              {isSimulating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isSimulating ? "Live" : "Paused"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Structural Graph Validation Alerts (Open / Floating / Short) */}
      {(simulationResults.validation.errors.length > 0 ||
        simulationResults.validation.warnings.length > 0) && (
        <div className="bg-[#0B0F19] border border-amber-500/40 rounded-2xl p-3.5 text-xs font-mono space-y-1.5">
          {simulationResults.validation.errors.map((err, i) => (
            <div key={`err-${i}`} className="flex items-center gap-2 text-rose-300 font-bold">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>[{err.code}] {err.message}</span>
            </div>
          ))}
          {simulationResults.validation.warnings.slice(0, 4).map((warn, i) => (
            <div key={`warn-${i}`} className="flex items-center gap-2 text-amber-300">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>[{warn.code}] {warn.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* TAB 1: CIRCUIT SCHEMATIC */}
      {activeTab === "SCHEMATIC" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-8 bg-[#090D16] border border-cyan-500/30 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[660px]">
            {/* Schematic Canvas Ribbon */}
            <div className="flex flex-wrap items-center justify-between px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 text-xs font-mono gap-2">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-cyan-400" />
                <span className="font-bold text-white tracking-wider">
                  IEEE Std 315 SCHEMATIC ({activeModel.topology})
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {/* Topology Switcher */}
                <div className="flex items-center gap-0.5 bg-slate-950 border border-slate-700 rounded-lg p-0.5">
                  {(["ORIGINAL", "SERIES", "PARALLEL", "COMBINATION"] as const).map((tm) => (
                    <button
                      key={tm}
                      type="button"
                      onClick={() => handleRewireTopology(tm)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                        activeModel.topology === tm
                          ? "bg-cyan-500 text-slate-950"
                          : "text-slate-300 hover:text-white"
                      }`}
                    >
                      {tm === "ORIGINAL"
                        ? "Original"
                        : tm === "SERIES"
                        ? "Series"
                        : tm === "PARALLEL"
                        ? "Parallel"
                        : "Combo"}
                    </button>
                  ))}
                </div>

                {/* Add Components */}
                {(
                  [
                    { kind: "RESISTOR", label: "+R" },
                    { kind: "CAPACITOR", label: "+C" },
                    { kind: "INDUCTOR", label: "+L" },
                    { kind: "LED", label: "+LED" },
                    { kind: "DIODE", label: "+D" },
                    { kind: "SWITCH", label: "+SW" },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.kind}
                    type="button"
                    onClick={() => handleAddWorkingComponent(item.kind)}
                    className="px-2 py-1 rounded bg-slate-800 hover:bg-cyan-500/20 border border-slate-700 hover:border-cyan-400/50 text-cyan-300 text-[10px] font-bold cursor-pointer"
                    title={`Add ${item.kind} to schematic`}
                  >
                    {item.label}
                  </button>
                ))}

                {/* Remove Selected Wire */}
                {selectedWireId && (
                  <button
                    type="button"
                    onClick={handleRemoveSelectedWire}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded bg-rose-950/70 border border-rose-500/50 text-rose-300 text-[10px] font-bold cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    Delete Wire
                  </button>
                )}

                {/* Theme & Zoom Controls */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsCanvasColorMenuOpen((v) => !v)}
                    className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-white cursor-pointer"
                    title="Canvas Theme"
                  >
                    <Palette className="w-3.5 h-3.5" />
                  </button>
                  {isCanvasColorMenuOpen && (
                    <div className="absolute right-0 top-full mt-1 w-44 z-40 bg-slate-900 border border-slate-700 rounded-xl p-1.5 shadow-xl">
                      {Object.values(CANVAS_COLOR_THEMES).map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => handleSelectCanvasTheme(t.id)}
                          className={`w-full text-left px-2 py-1 rounded text-[11px] cursor-pointer ${
                            canvasThemeId === t.id ? "bg-cyan-500/20 text-cyan-300 font-bold" : "text-slate-300 hover:bg-slate-800"
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleToggleDayNight}
                  className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-white cursor-pointer"
                  title="Toggle Day/Night Canvas Paper"
                >
                  {activeCanvasTheme.isLight ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setHighlightMode((m) => (m === "CURRENT_FLOW" ? "NONE" : "CURRENT_FLOW"))
                  }
                  className={`px-2 py-1 rounded text-[10px] font-bold border cursor-pointer ${
                    highlightMode === "CURRENT_FLOW"
                      ? "bg-cyan-500/20 border-cyan-400 text-cyan-300"
                      : "bg-slate-800 border-slate-700 text-slate-400"
                  }`}
                >
                  {highlightMode === "CURRENT_FLOW" ? "Flow ON" : "Flow OFF"}
                </button>

                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(2.0, z + 0.15))}
                  className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-white cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(0.6, z - 0.15))}
                  className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-white cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setZoom(1.0);
                    setPan({ x: 0, y: 0 });
                  }}
                  className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-white cursor-pointer"
                  title="Reset View"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleExportSVG}
                  className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-cyan-300 cursor-pointer"
                  title="Download SVG Schematic"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {pendingWirePin && (
              <div className="px-4 py-1.5 bg-cyan-950/70 border-b border-cyan-500/40 text-[11px] font-mono text-cyan-200 flex items-center justify-between">
                <span>
                  <Cable className="w-3.5 h-3.5 inline mr-1.5 text-cyan-400" />
                  Wiring from <strong>{pendingWirePin.componentId} (Pin {pendingWirePin.pinId})</strong> — click any target pin pad to connect wire, or Esc to cancel.
                </span>
                <button
                  type="button"
                  onClick={() => setPendingWirePin(null)}
                  className="text-cyan-300 underline cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            )}

            {/* Pure Prop-Driven Schematic SVG Renderer */}
            <SchematicRenderer
              model={activeModel}
              svgRef={schematicSvgRef}
              canvasBg={activeCanvasTheme.bg}
              isLightTheme={activeCanvasTheme.isLight}
              zoom={zoom}
              pan={pan}
              isPowered={isPowered}
              highlightFlow={highlightMode === "CURRENT_FLOW"}
              selectedComponentId={selectedComponentId}
              selectedWireId={selectedWireId}
              selectedNetName={selectedNetName}
              pendingWirePin={pendingWirePin}
              floatingComponentIds={simulationResults.validation.floatingComponents}
              disconnectedPins={simulationResults.validation.disconnectedPins}
              onCanvasMouseDown={(e) => {
                setIsPanning(true);
                panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
              }}
              onCanvasMouseMove={(e) => {
                if (draggingComp && activeModel) {
                  const pt = clientToSvgCoords(e.clientX, e.clientY);
                  const nextPos = { x: pt.x + draggingComp.offsetX, y: pt.y + draggingComp.offsetY };
                  const moved = moveComponentInModel(activeModel, draggingComp.id, nextPos);
                  setHistory((prev) => (prev ? { ...prev, present: moved } : prev));
                  return;
                }
                if (!isPanning) return;
                setPan({ x: e.clientX - panStartRef.current.x, y: e.clientY - panStartRef.current.y });
              }}
              onCanvasMouseUp={() => {
                if (draggingComp && activeModel) {
                  const finalModel = activeModel;
                  setHistory((prev) => {
                    if (!prev) return prev;
                    return {
                      past: [...prev.past, draggingComp.snapshotBeforeDrag].slice(-50),
                      present: finalModel,
                      future: [],
                    };
                  });
                  setDraggingComp(null);
                }
                setIsPanning(false);
              }}
              onCanvasMouseLeave={() => {
                if (draggingComp && activeModel) {
                  setDraggingComp(null);
                }
                setIsPanning(false);
              }}
              onWireClick={(wireId, netName) => {
                setSelectedNetName(netName);
                setSelectedWireId(wireId);
              }}
              onComponentMouseDown={(compId, e) => {
                const comp = activeModel.components.find((item) => item.id === compId);
                if (!comp) return;
                setSelectedComponentId(comp.id);
                setSelectedWireId(null);
                const pt = clientToSvgCoords(e.clientX, e.clientY);
                setDraggingComp({
                  id: comp.id,
                  offsetX: comp.position.x - pt.x,
                  offsetY: comp.position.y - pt.y,
                  snapshotBeforeDrag: activeModel,
                });
              }}
              onComponentClick={(compId) => {
                setSelectedComponentId(compId);
              }}
              onPinClick={(compId, pinId, e) => {
                handlePinClick(compId, pinId, e);
              }}
            />
          </div>

          {/* Right Inspection & Parameter Adjustment Deck */}
          <div className="lg:col-span-4 bg-[#0B0F19] border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col justify-between space-y-4 shadow-xl">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-cyan-400" />
                  <span className="font-bold text-white text-sm font-mono">
                    COMPONENT INSPECTOR
                  </span>
                </div>
                {selectedComponent && (
                  <span className="text-[11px] font-mono text-cyan-300 font-bold bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
                    {selectedComponent.refDes}
                  </span>
                )}
              </div>

              {selectedComponent ? (
                <div className="space-y-3 font-mono text-xs">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Component Name:</span>
                      <span className="text-white font-bold text-sm">{selectedComponent.name}</span>
                      <div className="text-amber-300 font-bold text-[11px] mt-0.5">
                        {selectedComponent.partNumber} ({selectedComponent.packageType}) · {selectedComponent.orientation}°
                      </div>
                    </div>
                  </div>

                  {/* Rotate 90 & Duplicate Quick Actions */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleRotateComponent(selectedComponent.id)}
                      className="py-1.5 px-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-cyan-300 font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                      Rotate 90°
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDuplicateComponent(selectedComponent.id)}
                      className="py-1.5 px-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-purple-300 font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <CopyPlus className="w-3.5 h-3.5" />
                      Duplicate
                    </button>
                  </div>

                  {selectedComponent.type === "SWITCH" ? (
                    <button
                      type="button"
                      onClick={() =>
                        handleUpdateComponentValue(
                          selectedComponent.id,
                          selectedComponent.nominalValue >= 1 ? 0 : 1
                        )
                      }
                      className={`w-full py-2 px-3 rounded-xl font-bold border cursor-pointer ${
                        selectedComponent.nominalValue >= 1
                          ? "bg-emerald-500/20 border-emerald-400 text-emerald-300"
                          : "bg-slate-900 border-slate-700 text-slate-300"
                      }`}
                    >
                      Switch State: {selectedComponent.nominalValue >= 1 ? "CLOSED (ON)" : "OPEN (OFF)"}
                    </button>
                  ) : (
                    (selectedComponent.editable || selectedComponent.nominalValue > 0) && (
                      <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                        <div className="flex justify-between items-center text-xs gap-2">
                          <span className="text-slate-300 font-bold">Value ({selectedComponent.unit || "unit"}):</span>
                          <input
                            type="number"
                            step="any"
                            value={selectedComponent.nominalValue}
                            onChange={(e) => {
                              const v = parseFloat(e.target.value);
                              if (isFinite(v) && v >= 0) {
                                handleUpdateComponentValue(selectedComponent.id, v);
                              }
                            }}
                            className="w-24 bg-slate-900 border border-slate-700 focus:border-cyan-400 rounded px-2 py-0.5 text-right text-cyan-300 font-bold focus:outline-none"
                          />
                        </div>
                        <input
                          type="range"
                          min={selectedComponent.minVal || 1}
                          max={selectedComponent.maxVal || Math.max(100, (selectedComponent.nominalValue || 10) * 5)}
                          step={selectedComponent.stepVal || 1}
                          value={selectedComponent.nominalValue}
                          onChange={(e) =>
                            handleUpdateComponentValue(selectedComponent.id, parseFloat(e.target.value))
                          }
                          className="w-full accent-cyan-400 cursor-pointer"
                        />
                      </div>
                    )
                  )}

                  {/* Live MNA Telemetry for Selected Component */}
                  {simulationResults.componentTelemetry[selectedComponent.id] && (
                    <div className="bg-slate-950/90 p-2.5 rounded-xl border border-cyan-500/30 grid grid-cols-3 gap-2 text-center">
                      <div>
                        <div className="text-[9.5px] text-slate-400">ΔV Drop</div>
                        <div className="text-amber-300 font-bold">
                          {simulationResults.componentTelemetry[selectedComponent.id].vDrop.toFixed(2)}V
                        </div>
                      </div>
                      <div>
                        <div className="text-[9.5px] text-slate-400">Current</div>
                        <div className="text-cyan-300 font-bold">
                          {simulationResults.componentTelemetry[selectedComponent.id].current_mA.toFixed(2)}mA
                        </div>
                      </div>
                      <div>
                        <div className="text-[9.5px] text-slate-400">Power</div>
                        <div className="text-emerald-300 font-bold">
                          {simulationResults.componentTelemetry[selectedComponent.id].power_mW.toFixed(1)}mW
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Terminal Pin Connection List & Disconnect Buttons */}
                  <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 space-y-1.5">
                    <div className="text-[10px] text-slate-400 uppercase font-bold">
                      Terminal Pins (Click pad on canvas or Disconnect):
                    </div>
                    {selectedComponent.pins.map((pin) => {
                      const hasWire = activeModel.connections.some(
                        (w) =>
                          (w.sourceComponentId === selectedComponent.id && w.sourcePinId === pin.id) ||
                          (w.targetComponentId === selectedComponent.id && w.targetPinId === pin.id)
                      );
                      return (
                        <div key={pin.id} className="flex items-center justify-between text-[11px] bg-slate-900/70 px-2 py-1 rounded">
                          <span className={hasWire ? "text-emerald-300" : "text-amber-300"}>
                            Pin {pin.id} ({pin.name}) · {hasWire ? "Connected" : "Open"}
                          </span>
                          {hasWire && (
                            <button
                              type="button"
                              onClick={() => handleDisconnectPin(selectedComponent.id, pin.id)}
                              className="inline-flex items-center gap-1 text-[10px] text-rose-300 hover:text-rose-200 cursor-pointer"
                            >
                              <Unplug className="w-3 h-3" />
                              Disconnect
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {selectedComponent.type !== "VOLTAGE_SOURCE" && selectedComponent.type !== "GROUND" && (
                    <button
                      type="button"
                      onClick={() => handleRemoveComponent(selectedComponent.id)}
                      className="w-full py-2 px-3 rounded-xl bg-rose-950/60 hover:bg-rose-900/70 border border-rose-500/40 text-rose-300 font-mono font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove {selectedComponent.refDes} &amp; Attached Wires</span>
                    </button>
                  )}

                  <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 space-y-1">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Circuit Role:</span>
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      {selectedComponent.teachingInfo.role}
                    </p>
                  </div>

                  {onSelectComponentForInspection && (
                    <button
                      type="button"
                      onClick={() => onSelectComponentForInspection(mapCompToRealisticId(selectedComponent))}
                      className="w-full py-2 px-3 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/40 text-cyan-300 font-mono font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
                    >
                      <Eye className="w-4 h-4 text-cyan-400" />
                      <span>Inspect 3D Physical Model</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="p-6 text-center text-slate-400 text-xs font-mono space-y-2">
                  <Info className="w-8 h-8 mx-auto text-slate-500" />
                  <p>
                    Drag any component to reposition, click any two terminal pin pads to wire, or click a component to edit values, rotate 90°, duplicate, or remove it.
                  </p>
                </div>
              )}
            </div>

            {/* Active Nets Live Readout */}
            <div className="bg-slate-950 p-3 rounded-xl border border-cyan-500/30 text-xs font-mono space-y-1.5">
              <div className="flex items-center justify-between text-[10px] uppercase text-slate-400 font-bold">
                <span>Live Solved Nets ({activeModel.nets.length})</span>
                {selectedNetName && <span className="text-cyan-300">Selected: {selectedNetName}</span>}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {activeModel.nets.slice(0, 8).map((net) => {
                  const v = simulationResults.netVoltages[net.netName] ?? 0;
                  return (
                    <button
                      key={net.netId}
                      type="button"
                      onClick={() => setSelectedNetName(net.netName)}
                      className={`px-2 py-1 rounded text-[10px] border cursor-pointer ${
                        selectedNetName === net.netName
                          ? "bg-cyan-500/25 border-cyan-400 text-cyan-200 font-bold"
                          : "bg-slate-900 border-slate-800 text-slate-300"
                      }`}
                    >
                      {net.netName}: <strong className="text-emerald-400">{v.toFixed(2)}V</strong>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: REALISTIC HARDWARE COMPONENTS & DYNAMIC BOM */}
      {activeTab === "HARDWARE" && (
        <div className="space-y-6">
          <div className="bg-[#0B0F19] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white font-mono">
                  PHYSICAL COMPONENT INVENTORY ({activeModel.components.length} Parts)
                </h3>
              </div>
              <span className="text-xs font-mono text-emerald-400">
                Synchronized with Active Model
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeModel.components.map((comp) => {
                const liveVal = comp.nominalValue;
                const bands = comp.type === "RESISTOR" ? calculateResistorColorBands(liveVal) : null;
                return (
                  <div
                    key={comp.id}
                    className="bg-slate-950/80 border border-slate-800 hover:border-emerald-500/50 rounded-xl p-4 space-y-3 font-mono transition-all"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <span className="text-emerald-400 font-bold text-xs bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
                          {comp.refDes}
                        </span>
                        <h4 className="font-bold text-white text-sm mt-1">{comp.name}</h4>
                        <div className="text-[11px] text-amber-300">{comp.partNumber}</div>
                      </div>
                      <span className="text-[10px] text-slate-400 text-right">{comp.packageType}</span>
                    </div>

                    {bands && (
                      <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 space-y-1.5">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">4-Band Color Code:</span>
                        <div className="flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded border border-slate-700" style={{ backgroundColor: bands.band1.color }} title={bands.band1.name} />
                          <span className="w-5 h-5 rounded border border-slate-700" style={{ backgroundColor: bands.band2.color }} title={bands.band2.name} />
                          <span className="w-5 h-5 rounded border border-slate-700" style={{ backgroundColor: bands.band3.color }} title={bands.band3.name} />
                          <span className="w-5 h-5 rounded border border-slate-700" style={{ backgroundColor: bands.band4.color }} title={bands.band4.name} />
                          <span className="text-[11px] text-slate-300 ml-2 font-bold">
                            {formatComponentDisplayValue(comp.type, liveVal, comp.unit)}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/60">
                      {comp.teachingInfo.role}
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10.5px] text-slate-400">
                        Value: {formatComponentDisplayValue(comp.type, liveVal, comp.unit)}
                      </span>
                      {onSelectComponentForInspection && (
                        <button
                          type="button"
                          onClick={() => onSelectComponentForInspection(mapCompToRealisticId(comp))}
                          className="px-2.5 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-400/30 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>3D View</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dynamic Bill of Materials */}
          <div className="bg-[#0B0F19] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Table className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white font-mono">
                  DYNAMIC BILL OF MATERIALS (BOM)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  const csv =
                    "Item,Designators,Qty,Description,Part Number,Package,Est Unit Cost\n" +
                    dynamicBOM
                      .map(
                        (b) =>
                          `"${b.itemNumber}","${b.designators.join(", ")}","${b.quantity}","${b.description}","${b.partNumber}","${b.package}","${b.estUnitCost}"`
                      )
                      .join("\n");
                  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `${activeModel.projectId}_bom.csv`;
                  a.click();
                  URL.revokeObjectURL(url);
                  setCopiedBOM(true);
                  setTimeout(() => setCopiedBOM(false), 2000);
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{copiedBOM ? "Exported!" : "Export BOM (.CSV)"}</span>
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-3">Item #</th>
                    <th className="p-3">Designators</th>
                    <th className="p-3">Qty</th>
                    <th className="p-3">Description</th>
                    <th className="p-3">Part Number</th>
                    <th className="p-3">Package</th>
                    <th className="p-3">Est. Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-950/60">
                  {dynamicBOM.map((b) => (
                    <tr key={b.itemNumber} className="hover:bg-slate-900/40">
                      <td className="p-3 font-bold text-cyan-300">{b.itemNumber}</td>
                      <td className="p-3 font-bold text-white">{b.designators.join(", ")}</td>
                      <td className="p-3">{b.quantity}</td>
                      <td className="p-3 text-slate-200">{b.description}</td>
                      <td className="p-3 text-amber-300">{b.partNumber}</td>
                      <td className="p-3 text-slate-400">{b.package}</td>
                      <td className="p-3 font-semibold text-emerald-400">{b.estUnitCost}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: INTERACTIVE WIRING WORKBENCH */}
      {activeTab === "WIRING" && (
        <div className="space-y-6">
          <div className="bg-[#0B0F19] border border-blue-500/30 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-blue-400" />
                <h3 className="text-base font-bold text-white font-mono">
                  SOLDERLESS BREADBOARD WIRING WORKBENCH ({activeModel.connections.length} Wires)
                </h3>
              </div>
              <div className="flex items-center gap-3 text-xs font-mono">
                {continuitySoundActive && (
                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 px-2.5 py-1 rounded-lg font-bold animate-pulse flex items-center gap-1.5">
                    <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                    CONTINUITY VERIFIED
                  </span>
                )}
                {continuityProbedNode && (
                  <span className="bg-cyan-950 text-cyan-300 border border-cyan-800 px-2.5 py-1 rounded-lg font-bold">
                    Probed: {continuityProbedNode} ({(simulationResults.netVoltages[continuityProbedNode] ?? 0).toFixed(2)}V)
                  </span>
                )}
              </div>
            </div>

            <div className="w-full bg-[#070b12] border border-slate-800 rounded-xl p-4 overflow-x-auto flex items-center justify-center">
              <svg className="w-full max-w-4xl h-[380px]" viewBox="0 0 820 380">
                <rect x="10" y="10" width="800" height="360" rx="16" fill="#f8fafc" stroke="#94a3b8" strokeWidth="4" />
                <rect x="16" y="16" width="788" height="348" rx="12" fill="#ffffff" />
                <line x1="35" y1="38" x2="780" y2="38" stroke="#ef4444" strokeWidth="2.5" />
                <line x1="35" y1="58" x2="780" y2="58" stroke="#3b82f6" strokeWidth="2.5" />
                <rect x="25" y="180" width="770" height="20" fill="#e2e8f0" />

                {Array.from({ length: 32 }).map((_, cIdx) => {
                  const colX = 50 + cIdx * 23;
                  return (
                    <g key={`bb-col-${cIdx}`}>
                      {[92, 112, 132, 152].map((rowY, rIdx) => (
                        <circle key={`t-${rIdx}`} cx={colX} cy={rowY} r="2.8" fill="#0f172a" />
                      ))}
                      {[222, 242, 262, 282].map((rowY, rIdx) => (
                        <circle key={`b-${rIdx}`} cx={colX} cy={rowY} r="2.8" fill="#0f172a" />
                      ))}
                    </g>
                  );
                })}

                {activeModel.components.map((c, idx) => {
                  const col = c.hardwarePos?.col ?? Math.min(30, 4 + ((idx * 3) % 26));
                  const x = 50 + (col - 1) * 22;
                  const isSelected = selectedComponentId === c.id;
                  const bands = c.type === "RESISTOR" ? calculateResistorColorBands(c.nominalValue) : null;
                  return (
                    <g
                      key={`bb-comp-${c.id}`}
                      transform={`translate(${x}, ${c.type === "LED" || c.type === "CAPACITOR_POLARIZED" ? 242 : 122})`}
                      className="cursor-pointer"
                      onClick={() => setSelectedComponentId(c.id)}
                    >
                      {c.type === "RESISTOR" && bands ? (
                        <>
                          <rect x="-15" y="-6" width="30" height="12" rx="3" fill="#fef08a" stroke={isSelected ? "#38bdf8" : "#d97706"} strokeWidth="1.5" />
                          <line x1="-8" y1="-6" x2="-8" y2="6" stroke={bands.band1.color} strokeWidth="3" />
                          <line x1="-2" y1="-6" x2="-2" y2="6" stroke={bands.band2.color} strokeWidth="3" />
                          <line x1="4" y1="-6" x2="4" y2="6" stroke={bands.band3.color} strokeWidth="3" />
                        </>
                      ) : (
                        <rect
                          x="-20"
                          y="-14"
                          width="40"
                          height="28"
                          rx="4"
                          fill={c.type === "VOLTAGE_SOURCE" ? "#ef4444" : c.type === "LED" && isPowered ? "#22c55e" : "#1e293b"}
                          stroke={isSelected ? "#38bdf8" : "#475569"}
                          strokeWidth="2"
                        />
                      )}
                      <text x="0" y="-18" fill="#0f172a" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                        {c.refDes}
                      </text>
                    </g>
                  );
                })}

                {activeModel.connections.map((w, idx) => {
                  const i1 = activeModel.components.findIndex((c) => c.id === w.sourceComponentId);
                  const i2 = activeModel.components.findIndex((c) => c.id === w.targetComponentId);
                  if (i1 < 0 || i2 < 0) return null;
                  const c1 = activeModel.components[i1];
                  const c2 = activeModel.components[i2];
                  const col1 = c1.hardwarePos?.col ?? Math.min(30, 4 + ((i1 * 3) % 26));
                  const col2 = c2.hardwarePos?.col ?? Math.min(30, 4 + ((i2 * 3) % 26));
                  const x1 = 50 + (col1 - 1) * 22;
                  const x2 = 50 + (col2 - 1) * 22;
                  const y1 = 148;
                  const y2 = 222;
                  const cx = (x1 + x2) / 2;
                  const cy = (y1 + y2) / 2 + (idx % 2 === 0 ? 28 : -28);
                  return (
                    <path
                      key={`bb-w-${w.id}`}
                      d={`M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`}
                      fill="none"
                      stroke={w.wireColor || "#38bdf8"}
                      strokeWidth="2.5"
                      className="cursor-pointer"
                      onClick={() => {
                        setContinuityProbedNode(w.netName);
                        playContinuityBeep(2400, 120);
                      }}
                    />
                  );
                })}
              </svg>
            </div>

            {/* Pin-to-Pin Connection Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-3">Net Name</th>
                    <th className="p-3">From Component (Pin)</th>
                    <th className="p-3">To Component (Pin)</th>
                    <th className="p-3">Signal Type</th>
                    <th className="p-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-950/60">
                  {activeModel.connections.map((w) => {
                    const cFrom = activeModel.components.find((c) => c.id === w.sourceComponentId);
                    const cTo = activeModel.components.find((c) => c.id === w.targetComponentId);
                    return (
                      <tr key={w.id} className="hover:bg-slate-900/40">
                        <td className="p-3 font-bold text-cyan-300">{w.netName}</td>
                        <td className="p-3 text-white">
                          {cFrom?.refDes || w.sourceComponentId} (Pin {w.sourcePinId})
                        </td>
                        <td className="p-3 text-white">
                          {cTo?.refDes || w.targetComponentId} (Pin {w.targetPinId})
                        </td>
                        <td className="p-3 text-slate-400">{w.signalType}</td>
                        <td className="p-3">
                          <button
                            type="button"
                            onClick={() => commitModel(removeConnectionFromModel(activeModel, w.id))}
                            className="text-rose-400 hover:text-rose-300 underline cursor-pointer"
                          >
                            Remove Wire
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: SOURCE CODE & DYNAMIC SPICE NETLIST */}
      {activeTab === "CODE" && (
        <div className="space-y-6">
          <div className="bg-[#0B0F19] border border-purple-500/30 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Code2 className="w-5 h-5 text-purple-400" />
                <h3 className="text-base font-bold text-white font-mono">
                  LIVE SPICE NETLIST &amp; FIRMWARE FILES
                </h3>
              </div>

              {projectCodeFiles.length > 1 && (
                <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono">
                  {projectCodeFiles.map((f, idx) => (
                    <button
                      key={f.filename}
                      type="button"
                      onClick={() => setActiveCodeFileIdx(idx)}
                      className={`px-3 py-1.5 rounded-lg font-bold cursor-pointer transition-colors ${
                        activeCodeFileIdx === idx
                          ? "bg-purple-600 text-white"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      {f.filename}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {activeCodeFile && (
              <div className="space-y-3 font-mono">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-white">{activeCodeFile.title}</h4>
                    {activeCodeFile.description && (
                      <p className="text-xs text-slate-400 mt-0.5">{activeCodeFile.description}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(activeCodeFile.code);
                      setCopiedCode(true);
                      setTimeout(() => setCopiedCode(false), 2000);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCode ? "Copied!" : "Copy Code"}</span>
                  </button>
                </div>

                <div className="bg-[#040711] border border-slate-800 rounded-xl p-4 overflow-x-auto text-xs text-cyan-200 leading-relaxed max-h-[420px]">
                  <pre>
                    <code>{activeCodeFile.code}</code>
                  </pre>
                </div>
              </div>
            )}
          </div>

          <div className="bg-[#0B0F19] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3 font-mono">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-white text-xs">
                  LIVE MNA / TELEMETRY STREAM
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSerialLogs([])}
                className="text-[10px] text-slate-400 hover:text-white px-2 py-0.5 rounded bg-slate-800 cursor-pointer"
              >
                Clear
              </button>
            </div>
            <div className="bg-[#040711] border border-slate-800 rounded-xl p-3 h-40 overflow-y-auto text-[11px] text-emerald-400 space-y-1">
              {serialLogs.map((log, idx) => (
                <div key={idx}>{log}</div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: SIMULATION AND VIRTUAL INSTRUMENTS */}
      {activeTab === "SIMULATION" && (
        <div className="space-y-6">
          <div className="bg-[#090D16] border border-amber-500/30 rounded-2xl p-5 shadow-2xl space-y-5 font-mono">
            <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-800 gap-3">
              <div className="flex items-center gap-2">
                <Radio className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">
                  PRECISION VIRTUAL BENCH: DSO &amp; 6.5-DIGIT DMM
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-cyan-300 font-bold bg-cyan-950/80 px-2.5 py-1 rounded-lg border border-cyan-800">
                  {simulationResults.topologyClass}
                </span>
                <button
                  type="button"
                  onClick={toggleAudioMonitor}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer ${
                    isAudioMonitorActive
                      ? "bg-amber-400 text-slate-950"
                      : "bg-slate-900 text-slate-300 border border-slate-700"
                  }`}
                >
                  {isAudioMonitorActive ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                  <span>{isAudioMonitorActive ? "Mute Audio" : "Audio Monitor"}</span>
                </button>
              </div>
            </div>

            <SimulationErrorBoundary
              contextLabel="Unified MNA Simulator"
              abortedReason={(simulationResults as { abortedReason?: string }).abortedReason}
              validationErrors={simulationResults.validation.errors.map((err) =>
                typeof err === "string"
                  ? { message: err, severity: "ERROR" as const }
                  : {
                      code: err.code,
                      message: err.message,
                      severity: err.severity === "error" ? ("ERROR" as const) : ("WARNING" as const),
                    }
              )}
              converged={simulationResults.validation.valid}
              onResetCircuit={handleResetToDefaultPreset}
            >
              <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {simulationResults.metrics.map((m, idx) => (
                <div key={idx} className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-1">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold truncate">{m.label}</div>
                  <div className="text-lg font-bold text-amber-300">
                    {m.value} <span className="text-xs text-slate-400 font-normal">{m.unit}</span>
                  </div>
                  {m.formula && <div className="text-[9px] text-slate-500 truncate">{m.formula}</div>}
                </div>
              ))}
            </div>

            {/* Virtual DSO Screen */}
            <div className="bg-[#040711] border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="h-56 w-full relative">
                <svg className="w-full h-full" viewBox="0 0 700 240" preserveAspectRatio="none">
                  <defs>
                    <pattern id="dso-grid" width="70" height="24" patternUnits="userSpaceOnUse">
                      <rect width="70" height="24" fill="none" stroke="#1e293b" strokeWidth="0.8" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#dso-grid)" />
                  <line x1="0" y1="120" x2="700" y2="120" stroke="#334155" strokeWidth="1.5" strokeDasharray="4 2" />

                  {simulationResults.waveforms.length > 1 && (
                    <>
                      <path
                        d={simulationResults.waveforms
                          .map((pt, i) => {
                            const x = (i / (simulationResults.waveforms.length - 1)) * 700;
                            const vVal = pt.vOut ?? pt.logicState ?? 0;
                            const y = 120 - vVal * 8;
                            return `${i === 0 ? "M" : "L"} ${x} ${Math.max(10, Math.min(230, y))}`;
                          })
                          .join(" ")}
                        fill="none"
                        stroke="#facc15"
                        strokeWidth="2.5"
                      />
                      <path
                        d={simulationResults.waveforms
                          .map((pt, i) => {
                            const x = (i / (simulationResults.waveforms.length - 1)) * 700;
                            const vVal = pt.vCap ?? pt.vIn ?? 0;
                            const y = 120 - vVal * 8;
                            return `${i === 0 ? "M" : "L"} ${x} ${Math.max(10, Math.min(230, y))}`;
                          })
                          .join(" ")}
                        fill="none"
                        stroke="#22d3ee"
                        strokeWidth="2"
                        strokeDasharray="2 1"
                      />
                    </>
                  )}
                </svg>
              </div>
            </div>

            {/* Virtual DMM & Live Tuning */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-300">KEYSIGHT 34461A DMM</span>
                  <span className="text-amber-400 font-bold">{dmmMode} MODE</span>
                </div>
                {(() => {
                  const availableNets = Object.keys(simulationResults.netVoltages);
                  const activeNet = availableNets.includes(dmmProbedNet) ? dmmProbedNet : (availableNets[0] || "VCC");
                  const vProbed = simulationResults.netVoltages[activeNet] ?? 0;
                  const iSupply = simulationResults.totalSupplyCurrentMa;
                  const rEq = simulationResults.reqOhm;
                  const wfSamples = simulationResults.waveforms.map((w) => w.vOut ?? w.vIn ?? 0);
                  const acRms =
                    wfSamples.length > 1
                      ? Math.sqrt(wfSamples.reduce((s, x) => s + x * x, 0) / wfSamples.length)
                      : Math.abs(vProbed);
                  return (
                    <>
                      <div className="bg-[#040711] border-2 border-slate-800 rounded-xl p-4 text-right">
                        <div className="text-3xl font-mono font-bold text-amber-300">
                          {dmmMode === "VDC"
                            ? `${vProbed.toFixed(4)} V`
                            : dmmMode === "VAC"
                            ? `${acRms.toFixed(4)} Vrms`
                            : dmmMode === "CURR"
                            ? `${iSupply.toFixed(3)} mA`
                            : rEq !== null && isFinite(rEq)
                            ? `${rEq.toFixed(2)} Ω`
                            : "Nonlinear"}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1">PROBED NET: {activeNet}</div>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {availableNets.slice(0, 8).map((net) => (
                          <button
                            key={net}
                            type="button"
                            onClick={() => setDmmProbedNet(net)}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                              activeNet === net ? "bg-cyan-500 text-slate-950" : "bg-slate-900 text-slate-300"
                            }`}
                          >
                            {net}
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center gap-2 text-xs pt-1 border-t border-slate-800">
                        {(["VDC", "VAC", "CURR", "RES"] as const).map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setDmmMode(m)}
                            className={`px-2.5 py-1 rounded font-bold cursor-pointer ${
                              dmmMode === m ? "bg-amber-400 text-slate-950" : "bg-slate-900 text-slate-300"
                            }`}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    </>
                  );
                })()}
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3 max-h-[280px] overflow-y-auto">
                <span className="text-xs font-bold text-slate-300 block">LIVE PARAMETER TUNING</span>
                {activeModel.components
                  .filter((c) => c.type !== "GROUND" && c.type !== "TEST_POINT")
                  .map((c) => (
                    <div key={c.id} className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-300 font-bold">{c.name} ({c.refDes})</span>
                        <span className="text-cyan-400 font-bold">
                          {formatComponentDisplayValue(c.type, c.nominalValue, c.unit)}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={c.minVal || 1}
                        max={c.maxVal || Math.max(100, c.nominalValue * 4)}
                        step={c.stepVal || 1}
                        value={c.nominalValue}
                        onChange={(e) => handleUpdateComponentValue(c.id, parseFloat(e.target.value))}
                        className="w-full accent-cyan-400 cursor-pointer"
                      />
                    </div>
                  ))}
              </div>
            </div>
              </>
            </SimulationErrorBoundary>
          </div>
        </div>
      )}

      {/* TAB 6: THEORY, CALCULATIONS AND LAB REPORT */}
      {activeTab === "REPORT" && (
        <div className="space-y-6">
          {baseProject && (
            <>
              <div className="bg-[#0B0F19] border border-rose-500/30 rounded-2xl p-5 shadow-xl space-y-3 font-mono">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                  <BookOpen className="w-5 h-5 text-rose-400" />
                  <h3 className="text-base font-bold text-white">THEORETICAL WORKING PRINCIPLE</h3>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/80 p-4 rounded-xl border border-slate-800">
                  {baseProject.documentation.workingPrinciple}
                </p>
              </div>

              <div className="bg-[#0B0F19] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4 font-mono">
                <h4 className="text-sm font-bold text-white">STEP-BY-STEP DESIGN CALCULATIONS</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {baseProject.documentation.designCalculations.map((calc, idx) => (
                    <div key={idx} className="bg-slate-950/90 border border-slate-800 rounded-xl p-3.5 space-y-1.5 text-xs">
                      <div className="font-bold text-white">{calc.step}</div>
                      <div className="text-cyan-300 font-bold bg-slate-900 px-2.5 py-1 rounded text-[11px]">
                        Formula: {calc.formula}
                      </div>
                      <div className="text-slate-400 text-[10.5px]">{calc.calculation}</div>
                      <div className="text-emerald-400 font-bold pt-1 border-t border-slate-800">
                        Result: {calc.result}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {baseProject.documentation.experimentQuestions.length > 0 && (
                <div className="bg-[#0B0F19] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3 font-mono">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-purple-400" />
                    VIVA VOCE &amp; PRACTICAL QUESTIONS
                  </h4>
                  <div className="space-y-2.5 text-xs">
                    {baseProject.documentation.experimentQuestions.map((q, idx) => (
                      <div key={idx} className="bg-slate-950/90 border border-slate-800 rounded-xl p-3 space-y-1.5">
                        <div className="font-bold text-white">Q{idx + 1}: {q.question}</div>
                        <div className="text-slate-300">{q.answer}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Student Lab Report Generator */}
          <div className="bg-[#090D16] border-2 border-emerald-500/40 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-5 font-mono print-academic-report">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <GraduationCap className="w-6 h-6 text-emerald-400" />
                <div>
                  <h3 className="text-base font-bold text-white">STUDENT LABORATORY REPORT</h3>
                  <p className="text-[11px] text-slate-400">
                    Engineering Workbench · Synchronized MNA Data
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handlePrintReport}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>{reportPrinted ? "Opening Print..." : "Print / Export PDF"}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <input
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                aria-label="Student Name"
                className="bg-slate-950 border border-slate-800 rounded-lg p-2 text-white font-bold"
              />
              <input
                type="text"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                aria-label="Student ID"
                className="bg-slate-950 border border-slate-800 rounded-lg p-2 text-white font-bold"
              />
              <input
                type="text"
                value={studentSection}
                onChange={(e) => setStudentSection(e.target.value)}
                aria-label="Lab Section"
                className="bg-slate-950 border border-slate-800 rounded-lg p-2 text-white font-bold"
              />
              <input
                type="date"
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
                aria-label="Date"
                className="bg-slate-950 border border-slate-800 rounded-lg p-2 text-white font-bold"
              />
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-3">Parameter</th>
                    <th className="p-3">Formula / Basis</th>
                    <th className="p-3">Simulated Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-950">
                  {simulationResults.metrics.map((m, idx) => (
                    <tr key={idx}>
                      <td className="p-3 font-bold text-white">{m.label}</td>
                      <td className="p-3 text-cyan-300">{m.formula || "MNA Solver"}</td>
                      <td className="p-3 text-emerald-400 font-bold">{m.value} {m.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <textarea
              value={studentNotes}
              onChange={(e) => setStudentNotes(e.target.value)}
              rows={3}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default InteractiveCircuitSystem;
