import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Sliders,
  Activity,
  Trash2,
  Copy,
  Zap,
  Clock,
  Magnet,
  Layers,
  ChevronRight,
  Info,
  CheckCircle2,
  Radio,
  Eye,
  CornerDownRight,
  ToggleLeft,
  ToggleRight,
  Wifi,
  Cpu,
  Settings,
  Gauge,
  Sparkles,
  Hash,
  RotateCw,
  Terminal,
  Code2,
  AlertTriangle,
  CheckCircle,
  ShieldCheck,
  Play,
  HardDrive,
  Flame,
  Compass,
  BookOpen,
  FileCode,
} from "lucide-react";
import { CircuitNode, CircuitWire } from "./CircuitLab";
import { GATE_SPECS, COMP_SPECS } from "../data/logicSpecs";
import { CircuitLabSolverResult } from "../utils/circuitLabAnalogSolver";
import {
  validateEsp32Firmware,
  ESP32_TEMPLATES,
  DEFAULT_ESP32_CONFIG,
} from "../utils/esp32FirmwareValidator";

export interface ComponentPropertySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  selectedItem: { type: "node" | "wire"; id: number } | null;
  nodes: CircuitNode[];
  wires: CircuitWire[];
  liveVals: Record<number, number[]>;
  onUpdateNode: (id: number, updates: Partial<CircuitNode>) => void;
  onDeleteNode: (id: number) => void;
  onDeleteWire: (id: number) => void;
  onDuplicateNode?: (node: CircuitNode) => void;
  onSnapNodeToGrid?: (id: number) => void;
  onAttachProbeToWire?: (wireId: number) => void;
  onRotateNode?: (id: number) => void;
  analogSolution?: CircuitLabSolverResult;
  onInspectComponent?: (type: string) => void;
  onOpenPmeGuide?: (type?: "VOLTMETER" | "AMMETER" | "OHMMETER" | "POWER_METER" | "DIAGNOSTICS") => void;
}

export const IC_PROPAGATION_PRESETS = [
  { label: "74HC (CMOS)", delayNs: 9, desc: "High-Speed CMOS (~9ns)" },
  { label: "74HCT (TTL-CMOS)", delayNs: 11, desc: "TTL-Compatible CMOS (~11ns)" },
  { label: "74LS (Low Schottky)", delayNs: 15, desc: "Classic TTL Low-Power Schottky (~15ns)" },
  { label: "74S (Schottky)", delayNs: 3, desc: "Fast Schottky TTL (~3ns)" },
  { label: "74AC (Advanced CMOS)", delayNs: 5, desc: "Advanced High-Speed CMOS (~5ns)" },
  { label: "ECL (Sub-nanosecond)", delayNs: 1.5, desc: "Emitter-Coupled Logic (~1.5ns)" },
];

// Helper to compute 4-band EIA resistor color code
const RESISTOR_COLORS: Record<number, { name: string; bg: string; text: string }> = {
  0: { name: "Black", bg: "#0f172a", text: "#94a3b8" },
  1: { name: "Brown", bg: "#78350f", text: "#fef3c7" },
  2: { name: "Red", bg: "#dc2626", text: "#fee2e2" },
  3: { name: "Orange", bg: "#ea580c", text: "#ffedd5" },
  4: { name: "Yellow", bg: "#eab308", text: "#422006" },
  5: { name: "Green", bg: "#16a34a", text: "#dcfce7" },
  6: { name: "Blue", bg: "#2563eb", text: "#dbeafe" },
  7: { name: "Violet", bg: "#9333ea", text: "#f3e8ff" },
  8: { name: "Grey", bg: "#64748b", text: "#f8fafc" },
  9: { name: "White", bg: "#f8fafc", text: "#0f172a" },
};

function getResistorColorBands(ohms: number) {
  if (ohms <= 0) return null;
  const str = ohms.toExponential();
  const parts = str.split("e");
  const mantissa = parseFloat(parts[0]);
  const exponent = parseInt(parts[1], 10);
  
  // Format as 2 significant digits
  const sig = Math.round(mantissa * 10);
  const d1 = Math.floor(sig / 10);
  const d2 = sig % 10;
  const mult = exponent - 1;

  if (d1 < 0 || d1 > 9 || d2 < 0 || d2 > 9 || mult < -2 || mult > 9) {
    return null;
  }

  return {
    band1: RESISTOR_COLORS[d1] ?? RESISTOR_COLORS[1],
    band2: RESISTOR_COLORS[d2] ?? RESISTOR_COLORS[0],
    band3: RESISTOR_COLORS[mult >= 0 ? mult : 0] ?? RESISTOR_COLORS[2],
    tolerance: { name: "Gold (±5%)", bg: "#d97706", text: "#fffbeb" },
  };
}

export default function ComponentPropertySidebar({
  isOpen,
  onClose,
  selectedItem,
  nodes,
  wires,
  liveVals,
  onUpdateNode,
  onDeleteNode,
  onDeleteWire,
  onDuplicateNode,
  onSnapNodeToGrid,
  onAttachProbeToWire,
  onRotateNode,
  analogSolution,
  onInspectComponent,
  onOpenPmeGuide,
}: ComponentPropertySidebarProps) {
  if (!isOpen || !selectedItem) return null;

  const selectedNode =
    selectedItem.type === "node"
      ? nodes.find((n) => n.id === selectedItem.id) ?? null
      : null;

  const selectedWire =
    selectedItem.type === "wire"
      ? wires.find((w) => w.id === selectedItem.id) ?? null
      : null;

  if (!selectedNode && !selectedWire) return null;

  // Node telemetry & specs
  const gateSpec = selectedNode ? GATE_SPECS[selectedNode.type] : null;
  const compSpec = selectedNode ? COMP_SPECS[selectedNode.type] : null;
  const isGate = !!gateSpec;
  const currentLive = selectedNode ? liveVals[selectedNode.id]?.[0] ?? 0 : 0;
  const inVal0 = selectedNode ? liveVals[selectedNode.id]?.[0] ?? 0 : 0;
  const inVal1 = selectedNode ? liveVals[selectedNode.id]?.[1] ?? 0 : 0;

  // Current propagation delay for this node (default to 8ns if undefined)
  const currentDelay = selectedNode?.delayNs ?? (isGate ? 8 : 1);

  // Wires connected to this node
  const connectedWires = selectedNode
    ? {
        incoming: wires.filter((w) => w.to.node === selectedNode.id),
        outgoing: wires.filter((w) => w.from.node === selectedNode.id),
      }
    : { incoming: [], outgoing: [] };

  // =========================================================================
  // Component Value & SI Unit Configuration Logic
  // =========================================================================
  const nodeType = selectedNode?.type ?? "";

  // Derive initial values and units based on node type
  const isResistor = nodeType === "RES" || nodeType === "RESISTOR" || nodeType === "POT";
  const isCapacitor = nodeType === "CAP_NP" || nodeType === "CAP_POL" || nodeType === "CAPACITOR";
  const isInductor = nodeType === "IND" || nodeType === "INDUCTOR" || nodeType === "TRANSFORMER";
  const isDcSource =
    nodeType === "VCC" ||
    nodeType === "VCC_5V" ||
    nodeType === "VCC_12V" ||
    nodeType === "DC_VOLTAGE" ||
    nodeType === "DC_VOLTAGE_SOURCE" ||
    nodeType === "BATTERY";
  const isAcSource = nodeType === "AC_SINE" || nodeType === "AC_VOLTAGE_SOURCE";
  const isClock = nodeType === "CLOCK";
  const isZener = nodeType === "ZENER_BZX84" || nodeType === "ZENER";
  const isBjt =
    nodeType === "BC547" ||
    nodeType === "BC557" ||
    nodeType === "2N2222" ||
    nodeType === "BJT" ||
    nodeType === "BJT_NPN" ||
    nodeType === "BJT_PNP";
  const isMosfet =
    nodeType === "MOSFET_N" ||
    nodeType === "MOSFET_P" ||
    nodeType === "IRF540N" ||
    nodeType === "JFET_N";
  const isRegulator = nodeType === "LM7805" || nodeType === "REG7805" || nodeType === "LM317";
  const isOpAmp = nodeType === "OPAMP_741" || nodeType === "LM358" || nodeType === "LM393";
  const isTimer555 = nodeType === "TIMER_555";
  const isVoltmeter = nodeType === "VOLTMETER";
  const isAmmeter = nodeType === "AMMETER";
  const isOhmmeter = nodeType === "OHMMETER";
  const isPowerMeter = nodeType === "POWER_METER" || nodeType === "WATTMETER";
  const isDmm = nodeType === "DMM_PROBE";
  const isFuse = nodeType === "FUSE";
  const isCrystal = nodeType === "XTAL";

  const findPinConnection = (nodeId: number, port: number, expectedDir: "in" | "out") => {
    for (const w of wires) {
      const fNode = nodes.find((x) => x.id === w.from.node);
      const tNode = nodes.find((x) => x.id === w.to.node);
      const fDefDir: "in" | "out" =
        fNode && ["VOLTMETER", "DMM_PROBE", "OHMMETER", "OUTPUT"].includes(fNode.type)
          ? "in"
          : "out";
      const tDefDir: "in" | "out" =
        tNode &&
        [
          "VCC",
          "VCC_5V",
          "VCC_12V",
          "DC_VOLTAGE",
          "DC_VOLTAGE_SOURCE",
          "BATTERY",
          "AC_SINE",
          "AC_VOLTAGE_SOURCE",
          "INPUT",
          "CLOCK",
        ].includes(tNode.type)
          ? "out"
          : "in";
      const fDir = w.from.dir ?? fDefDir;
      const tDir = w.to.dir ?? tDefDir;
      if (w.to.node === nodeId && w.to.port === port && tDir === expectedDir) {
        return { wire: w, peerNode: fNode ?? null, peerPort: w.from.port, peerDir: fDir };
      }
      if (w.from.node === nodeId && w.from.port === port && fDir === expectedDir) {
        return { wire: w, peerNode: tNode ?? null, peerPort: w.to.port, peerDir: tDir };
      }
    }
    return null;
  };

  const getFallbackNodeVoltage = (n: CircuitNode, port: number): number => {
    if (n.type === "GND") return 0;
    if (n.type === "VCC" || n.type === "VCC_5V") return n.analogParams?.dcVoltageV ?? 5;
    if (n.type === "VCC_12V") return n.analogParams?.dcVoltageV ?? 12;
    if (
      n.type === "DC_VOLTAGE" ||
      n.type === "DC_VOLTAGE_SOURCE" ||
      n.type === "BATTERY"
    ) {
      return port === 1
        ? 0
        : (n.analogParams?.dcVoltageV ?? (n.type === "BATTERY" ? 9 : 5));
    }
    if (n.type === "AC_SINE" || n.type === "AC_VOLTAGE_SOURCE") {
      return port === 1 ? 0 : (n.analogParams?.acVoltageV ?? 5);
    }
    return (liveVals[n.id]?.[port] ?? 0) === 1 ? 5 : 0;
  };

  // Check if component is a programmable microcontroller (ESP32, S3, C3, Arduino Nano)
  const isEsp32 =
    nodeType === "ESP32" || nodeType === "ESP32_S3" || nodeType === "ESP32_C3";
  const isMicrocontroller = isEsp32 || nodeType === "ARDUINO_NANO";

  // Microcontroller state
  const [espModel, setEspModel] = useState<string>(nodeType);
  const [cpuFreq, setCpuFreq] = useState<number>(
    selectedNode?.digitalConfig?.cpuFreqMhz ?? 240
  );
  const [flashSize, setFlashSize] = useState<number>(
    selectedNode?.digitalConfig?.flashSizeMb ?? 4
  );
  const [flashMode, setFlashMode] = useState<string>(
    selectedNode?.digitalConfig?.flashMode ?? "QIO"
  );
  const [wifiMode, setWifiMode] = useState<string>(
    selectedNode?.digitalConfig?.wifiMode ?? "STA"
  );
  const [wifiSSID, setWifiSSID] = useState<string>(
    selectedNode?.digitalConfig?.wifiSSID ?? "UniLab_IoT_Network"
  );
  const [wifiPass, setWifiPass] = useState<string>(
    selectedNode?.digitalConfig?.wifiPass ?? "Engineering2026"
  );
  const [baudRate, setBaudRate] = useState<number>(
    selectedNode?.digitalConfig?.baudRate ?? 115200
  );
  const [adcBits, setAdcBits] = useState<number>(
    selectedNode?.digitalConfig?.adcBits ?? 12
  );
  const [cCode, setCCode] = useState<string>("");
  const [firmwareResult, setFirmwareResult] = useState<{
    isValid?: boolean;
    errorMessage?: string | null;
    warnings?: string[];
    logs?: string[];
  }>({});
  const [mcuTab, setMcuTab] = useState<"code" | "hardware" | "terminal">("code");

  // Determine active primary value and SI unit
  const [localVal, setLocalVal] = useState<string>("");
  const [localUnit, setLocalUnit] = useState<string>("");

  useEffect(() => {
    if (!selectedNode) return;
    const p = selectedNode.analogParams;

    if (isMicrocontroller) {
      setEspModel(selectedNode.type);
      const cfg = selectedNode.digitalConfig;
      if (cfg?.cpuFreqMhz) setCpuFreq(cfg.cpuFreqMhz);
      if (cfg?.flashSizeMb) setFlashSize(cfg.flashSizeMb);
      if (cfg?.flashMode) setFlashMode(cfg.flashMode);
      if (cfg?.wifiMode) setWifiMode(cfg.wifiMode);
      if (cfg?.wifiSSID) setWifiSSID(cfg.wifiSSID);
      if (cfg?.wifiPass) setWifiPass(cfg.wifiPass);
      if (cfg?.baudRate) setBaudRate(cfg.baudRate);
      if (cfg?.adcBits) setAdcBits(cfg.adcBits);

      if (cfg?.customCode) {
        setCCode(cfg.customCode);
      } else {
        const defaultCode =
          selectedNode.type === "ESP32_S3"
            ? ESP32_TEMPLATES.ESP32_S3_AI
            : selectedNode.type === "ESP32_C3"
            ? ESP32_TEMPLATES.ESP32_C3_RISCV
            : ESP32_TEMPLATES.ESP32_WROOM_BLINK;
        setCCode(defaultCode);
      }

      setFirmwareResult({
        isValid: cfg?.isFirmwareVerified,
        errorMessage: cfg?.lastVerificationError,
        logs: cfg?.serialLog ?? [],
      });
    }

    if (p?.userValue !== undefined && p?.userUnit !== undefined) {
      setLocalVal(p.userValue.toString());
      setLocalUnit(p.userUnit);
      return;
    }

    if (isResistor) {
      const ohms = p?.resistanceOhms ?? (nodeType === "POT" ? 10000 : 1000);
      if (ohms >= 1e6) {
        setLocalVal((ohms / 1e6).toString());
        setLocalUnit("MΩ");
      } else if (ohms >= 1e3) {
        setLocalVal((ohms / 1e3).toString());
        setLocalUnit("kΩ");
      } else {
        setLocalVal(ohms.toString());
        setLocalUnit("Ω");
      }
    } else if (isCapacitor) {
      const uf = p?.capacitanceUf ?? (nodeType === "CAP_POL" ? 10 : 0.1);
      if (uf >= 1) {
        setLocalVal(uf.toString());
        setLocalUnit("µF");
      } else if (uf >= 1e-3) {
        setLocalVal((uf * 1e3).toString());
        setLocalUnit("nF");
      } else {
        setLocalVal((uf * 1e6).toString());
        setLocalUnit("pF");
      }
    } else if (isInductor) {
      const mh = p?.inductanceMh ?? 10;
      if (mh >= 1e3) {
        setLocalVal((mh / 1e3).toString());
        setLocalUnit("H");
      } else if (mh >= 1) {
        setLocalVal(mh.toString());
        setLocalUnit("mH");
      } else {
        setLocalVal((mh * 1e3).toString());
        setLocalUnit("µH");
      }
    } else if (isDcSource) {
      const defV = nodeType === "VCC_12V" ? 12 : nodeType === "BATTERY" ? 9 : 5;
      const v = p?.dcVoltageV ?? defV;
      setLocalVal(v.toString());
      setLocalUnit("V");
    } else if (isAcSource) {
      const v = p?.acVoltageV ?? 5;
      setLocalVal(v.toString());
      setLocalUnit("V");
    } else if (isClock) {
      const hz = selectedNode.clockHz ?? 2;
      if (hz >= 1e6) {
        setLocalVal((hz / 1e6).toString());
        setLocalUnit("MHz");
      } else if (hz >= 1e3) {
        setLocalVal((hz / 1e3).toString());
        setLocalUnit("kHz");
      } else {
        setLocalVal(hz.toString());
        setLocalUnit("Hz");
      }
    } else if (isZener) {
      setLocalVal((p?.dcVoltageV ?? 5.1).toString());
      setLocalUnit("V");
    } else if (isBjt) {
      setLocalVal((p?.transistorBeta ?? 200).toString());
      setLocalUnit("hFE");
    } else if (isRegulator) {
      setLocalVal((p?.dcVoltageV ?? (nodeType === "LM317" ? 3.3 : 5.0)).toString());
      setLocalUnit("V");
    } else if (isVoltmeter) {
      setLocalVal("20");
      setLocalUnit("V");
    } else if (isAmmeter) {
      setLocalVal("200");
      setLocalUnit("mA");
    } else if (isOhmmeter) {
      setLocalVal("20");
      setLocalUnit("kΩ");
    } else if (isPowerMeter) {
      setLocalVal("5");
      setLocalUnit("W");
    } else if (isFuse) {
      setLocalVal("1.0");
      setLocalUnit("A");
    } else if (isCrystal) {
      setLocalVal("16");
      setLocalUnit("MHz");
    } else {
      setLocalVal(p?.userValue?.toString() ?? "1");
      setLocalUnit(p?.userUnit ?? "");
    }
  }, [selectedNode?.id, nodeType]);

  const handleVerifyFirmware = () => {
    if (!selectedNode) return;
    const result = validateEsp32Firmware(
      cCode,
      selectedNode.type,
      wires,
      nodes,
      selectedNode.id
    );

    if (result.isValid) {
      setFirmwareResult({
        isValid: true,
        errorMessage: null,
        warnings: result.warnings,
        logs: result.simulatedSerialLogs,
      });
      onUpdateNode(selectedNode.id, {
        digitalConfig: {
          ...selectedNode.digitalConfig,
          boardModel: selectedNode.type as any,
          cpuFreqMhz: cpuFreq as any,
          flashSizeMb: flashSize as any,
          flashMode: flashMode as any,
          wifiMode: wifiMode as any,
          wifiSSID,
          wifiPass,
          baudRate,
          adcBits: adcBits as any,
          customCode: cCode,
          isFirmwareVerified: true,
          lastVerificationError: null,
          serialLog: result.simulatedSerialLogs,
        },
      });
    } else {
      setFirmwareResult({
        isValid: false,
        errorMessage: result.errorMessage,
        warnings: result.warnings,
        logs: [],
      });
      onUpdateNode(selectedNode.id, {
        digitalConfig: {
          ...selectedNode.digitalConfig,
          customCode: cCode,
          isFirmwareVerified: false,
          lastVerificationError: result.errorMessage,
          serialLog: [],
        },
      });
    }
  };

  const handleSwitchModel = (newModel: string) => {
    if (!selectedNode) return;
    setEspModel(newModel);
    let template = ESP32_TEMPLATES.ESP32_WROOM_BLINK;
    if (newModel === "ESP32_S3") template = ESP32_TEMPLATES.ESP32_S3_AI;
    if (newModel === "ESP32_C3") template = ESP32_TEMPLATES.ESP32_C3_RISCV;
    setCCode(template);
    setFirmwareResult({});
    onUpdateNode(selectedNode.id, {
      type: newModel,
      digitalConfig: {
        ...selectedNode.digitalConfig,
        boardModel: newModel as any,
        customCode: template,
        isFirmwareVerified: false,
        lastVerificationError: null,
        serialLog: [],
      },
    });
  };

  // Handle value + unit changes and synchronize standard parameters
  const handleApplyValueAndUnit = (newValStr: string, newUnit: string) => {
    if (!selectedNode) return;
    const num = parseFloat(newValStr);
    if (isNaN(num)) return;

    setLocalVal(newValStr);
    setLocalUnit(newUnit);

    const formatted = `${newValStr} ${newUnit}`;
    const updates: Partial<CircuitNode> = {
      analogParams: {
        ...selectedNode.analogParams,
        userValue: num,
        userUnit: newUnit,
        formattedValue: formatted,
      },
    };

    // Calculate standardized base unit for SPICE & simulation solvers
    if (isResistor) {
      let ohms = num;
      if (newUnit === "mΩ") ohms = num * 1e-3;
      else if (newUnit === "kΩ") ohms = num * 1e3;
      else if (newUnit === "MΩ") ohms = num * 1e6;
      else if (newUnit === "GΩ") ohms = num * 1e9;
      updates.analogParams!.resistanceOhms = ohms;
    } else if (isCapacitor) {
      let uf = num;
      if (newUnit === "pF") uf = num * 1e-6;
      else if (newUnit === "nF") uf = num * 1e-3;
      else if (newUnit === "µF") uf = num;
      else if (newUnit === "mF") uf = num * 1e3;
      else if (newUnit === "F") uf = num * 1e6;
      updates.analogParams!.capacitanceUf = uf;
    } else if (isInductor) {
      let mh = num;
      if (newUnit === "nH") mh = num * 1e-6;
      else if (newUnit === "µH") mh = num * 1e-3;
      else if (newUnit === "mH") mh = num;
      else if (newUnit === "H") mh = num * 1e3;
      updates.analogParams!.inductanceMh = mh;
    } else if (isDcSource) {
      let v = num;
      if (newUnit === "µV") v = num * 1e-6;
      else if (newUnit === "mV") v = num * 1e-3;
      else if (newUnit === "kV") v = num * 1e3;
      updates.analogParams!.dcVoltageV = v;
    } else if (isAcSource) {
      let v = num;
      if (newUnit === "µV") v = num * 1e-6;
      else if (newUnit === "mV") v = num * 1e-3;
      else if (newUnit === "kV") v = num * 1e3;
      updates.analogParams!.acVoltageV = v;
    } else if (isZener || isRegulator) {
      let v = num;
      if (newUnit === "µV") v = num * 1e-6;
      else if (newUnit === "mV") v = num * 1e-3;
      else if (newUnit === "kV") v = num * 1e3;
      updates.analogParams!.dcVoltageV = v;
    } else if (isClock) {
      let hz = num;
      if (newUnit === "kHz") hz = num * 1e3;
      else if (newUnit === "MHz") hz = num * 1e6;
      else if (newUnit === "GHz") hz = num * 1e9;
      updates.clockHz = hz;
    } else if (isBjt) {
      updates.analogParams!.transistorBeta = num;
    }

    onUpdateNode(selectedNode.id, updates);
  };

  // Supported SI units list based on component type
  const unitOptions = useMemo(() => {
    if (isResistor) return ["mΩ", "Ω", "kΩ", "MΩ"];
    if (isOhmmeter) return ["Ω", "kΩ", "MΩ"];
    if (isPowerMeter) return ["mW", "W"];
    if (isCapacitor) return ["pF", "nF", "µF", "mF", "F"];
    if (isInductor) return ["nH", "µH", "mH", "H"];
    if (isDcSource || isAcSource || isZener || isRegulator || isVoltmeter)
      return ["µV", "mV", "V", "kV"];
    if (isClock || isCrystal) return ["Hz", "kHz", "MHz", "GHz"];
    if (isAmmeter || isFuse) return ["µA", "mA", "A"];
    if (isBjt) return ["hFE"];
    return ["", "V", "mA", "Ω", "Hz"];
  }, [
    isResistor,
    isOhmmeter,
    isPowerMeter,
    isCapacitor,
    isInductor,
    isDcSource,
    isAcSource,
    isZener,
    isRegulator,
    isVoltmeter,
    isClock,
    isCrystal,
    isAmmeter,
    isFuse,
    isBjt,
  ]);

  // Standard Commercial E12 / Quick Presets per Component Type
  const quickPresets = useMemo(() => {
    if (isResistor) {
      return [
        { label: "100 Ω", val: 100, unit: "Ω" },
        { label: "220 Ω", val: 220, unit: "Ω" },
        { label: "330 Ω", val: 330, unit: "Ω" },
        { label: "470 Ω", val: 470, unit: "Ω" },
        { label: "1 kΩ", val: 1, unit: "kΩ" },
        { label: "2.2 kΩ", val: 2.2, unit: "kΩ" },
        { label: "4.7 kΩ", val: 4.7, unit: "kΩ" },
        { label: "10 kΩ", val: 10, unit: "kΩ" },
        { label: "47 kΩ", val: 47, unit: "kΩ" },
        { label: "100 kΩ", val: 100, unit: "kΩ" },
        { label: "1 MΩ", val: 1, unit: "MΩ" },
      ];
    }
    if (isCapacitor) {
      return [
        { label: "22 pF", val: 22, unit: "pF" },
        { label: "100 pF", val: 100, unit: "pF" },
        { label: "1 nF", val: 1, unit: "nF" },
        { label: "10 nF", val: 10, unit: "nF" },
        { label: "100 nF", val: 100, unit: "nF" },
        { label: "1 µF", val: 1, unit: "µF" },
        { label: "10 µF", val: 10, unit: "µF" },
        { label: "47 µF", val: 47, unit: "µF" },
        { label: "100 µF", val: 100, unit: "µF" },
        { label: "470 µF", val: 470, unit: "µF" },
      ];
    }
    if (isInductor) {
      return [
        { label: "1 µH", val: 1, unit: "µH" },
        { label: "10 µH", val: 10, unit: "µH" },
        { label: "100 µH", val: 100, unit: "µH" },
        { label: "1 mH", val: 1, unit: "mH" },
        { label: "10 mH", val: 10, unit: "mH" },
        { label: "47 mH", val: 47, unit: "mH" },
        { label: "100 mH", val: 100, unit: "mH" },
        { label: "1 H", val: 1, unit: "H" },
      ];
    }
    if (isDcSource) {
      return [
        { label: "1.8 V", val: 1.8, unit: "V" },
        { label: "3.3 V", val: 3.3, unit: "V" },
        { label: "5.0 V", val: 5.0, unit: "V" },
        { label: "9.0 V", val: 9.0, unit: "V" },
        { label: "12.0 V", val: 12.0, unit: "V" },
        { label: "15.0 V", val: 15.0, unit: "V" },
        { label: "24.0 V", val: 24.0, unit: "V" },
      ];
    }
    if (isClock) {
      return [
        { label: "1 Hz", val: 1, unit: "Hz" },
        { label: "2 Hz", val: 2, unit: "Hz" },
        { label: "5 Hz", val: 5, unit: "Hz" },
        { label: "10 Hz", val: 10, unit: "Hz" },
        { label: "1 kHz", val: 1, unit: "kHz" },
        { label: "10 kHz", val: 10, unit: "kHz" },
      ];
    }
    if (isBjt) {
      return [
        { label: "β = 100", val: 100, unit: "hFE" },
        { label: "β = 200", val: 200, unit: "hFE" },
        { label: "β = 300", val: 300, unit: "hFE" },
        { label: "β = 400", val: 400, unit: "hFE" },
      ];
    }
    return [];
  }, [isResistor, isCapacitor, isInductor, isDcSource, isClock, isBjt]);

  // Compute EIA color band preview for resistors
  const resistorBands = useMemo(() => {
    if (!isResistor || !selectedNode) return null;
    const ohms = selectedNode.analogParams?.resistanceOhms ?? 1000;
    return getResistorColorBands(ohms);
  }, [isResistor, selectedNode?.analogParams?.resistanceOhms]);

  return (
    <aside className="w-80 shrink-0 bg-[#0c1220]/95 backdrop-blur-xl border-l border-slate-800 flex flex-col h-full shadow-2xl z-30 transition-all select-none">
      {/* Top Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#0f172a] border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-300">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-mono font-bold text-white uppercase tracking-wider">
              Component Properties
            </div>
            <div className="text-[10px] font-mono text-cyan-400">
              {selectedNode
                ? `${selectedNode.type} #${selectedNode.id}`
                : `Wire Net #${selectedWire?.id}`}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {selectedNode && onRotateNode && (
            <button
              type="button"
              onClick={() => onRotateNode(selectedNode.id)}
              className="px-2 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 hover:text-cyan-100 transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-mono"
              title="Rotate 90° Clockwise (or right-click component on canvas)"
            >
              <RotateCw className="w-3.5 h-3.5 text-cyan-400" />
              <span className="font-bold">Rotate 90°</span>
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Close Inspector"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Properties Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        {selectedNode && (
          <>
            {/* Quick 3D Physical Package & Datasheet Inspector Trigger */}
            <button
              type="button"
              onClick={() => onInspectComponent?.(selectedNode.type)}
              className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-purple-500/20 hover:from-cyan-500/30 hover:to-purple-500/30 border border-cyan-400/40 text-cyan-200 text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm group"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400 group-hover:rotate-12 transition-transform" />
              <span>Inspect 3D Package &amp; Datasheet</span>
            </button>

            {isMicrocontroller ? (
              /* REALISTIC MICROCONTROLLER (ESP32 / S3 / C3 / NANO) CONFIG & C CODE STUDIO */
              <div className="bg-[#0b1329] border border-cyan-500/50 rounded-xl p-3.5 space-y-3.5 shadow-xl shadow-cyan-950/40">
                {/* Header & Silicon Board Model Selector */}
                <div className="border-b border-cyan-500/20 pb-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-cyan-400" />
                      <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                        ESP32 Silicon &amp; C Studio
                      </span>
                    </div>
                    {firmwareResult.isValid ? (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40 flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-emerald-400" />
                        Flashed ✓
                      </span>
                    ) : firmwareResult.errorMessage ? (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-bold border border-rose-500/40 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-rose-400" />
                        Error
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                        Unverified
                      </span>
                    )}
                  </div>

                  {/* Board Model Dropdown with All 3 ESP32 Variants */}
                  <div className="space-y-1">
                    <label className="text-[10.5px] font-mono text-slate-300 font-semibold flex items-center justify-between">
                      <span>Physical Board Model:</span>
                      <span className="text-cyan-400 text-[10px]">Real Hardware Profile</span>
                    </label>
                    <select
                      value={espModel}
                      onChange={(e) => handleSwitchModel(e.target.value)}
                      className="w-full bg-[#060a16] border border-cyan-500/40 text-cyan-200 text-xs font-mono rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-cyan-400 cursor-pointer"
                    >
                      <option value="ESP32">ESP32-WROOM-32D (Dual Xtensa LX6 @ 240MHz)</option>
                      <option value="ESP32_S3">ESP32-S3-WROOM-1 (Dual LX7 + Vector AI Engine)</option>
                      <option value="ESP32_C3">ESP32-C3-Mini (32-bit RISC-V Single-Core @ 160MHz)</option>
                      <option value="ARDUINO_NANO">Arduino Nano (ATmega328P @ 16MHz)</option>
                    </select>
                  </div>

                  {/* Architecture quick badge */}
                  <div className="text-[9.5px] font-mono text-slate-400 bg-[#060a16] p-2 rounded-lg border border-slate-800/80 leading-relaxed">
                    {espModel === "ESP32_S3" ? (
                      <>
                        <span className="text-purple-300 font-bold">Dual Xtensa LX7 + Vector AI:</span> 512KB SRAM, 384KB ROM, USB-OTG, 2.4GHz Wi-Fi + BLE 5.0 LE. Ideal for edge machine learning.
                      </>
                    ) : espModel === "ESP32_C3" ? (
                      <>
                        <span className="text-amber-300 font-bold">32-bit RISC-V Single Core:</span> 400KB SRAM, 384KB ROM, Wi-Fi 4 + BLE 5.0, low-power green IoT edge nodes.
                      </>
                    ) : espModel === "ARDUINO_NANO" ? (
                      <>
                        <span className="text-cyan-300 font-bold">AVR 8-bit Architecture:</span> 32KB Flash, 2KB SRAM, 1KB EEPROM, 16MHz crystal oscillator.
                      </>
                    ) : (
                      <>
                        <span className="text-cyan-300 font-bold">Dual Xtensa LX6 @ 240MHz:</span> 520KB SRAM, 448KB ROM, Wi-Fi 802.11 b/g/n + BT 4.2 BR/EDR/BLE. Standard university IoT testbed.
                      </>
                    )}
                  </div>
                </div>

                {/* Sub-Tab Navigation */}
                <div className="flex rounded-lg bg-[#070b18] p-1 border border-slate-800 text-xs font-mono">
                  <button
                    type="button"
                    onClick={() => setMcuTab("code")}
                    className={`flex-1 py-1.5 rounded text-center font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      mcuTab === "code"
                        ? "bg-cyan-500/20 text-cyan-200 border border-cyan-500/40"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <Code2 className="w-3.5 h-3.5" />
                    C Firmware
                  </button>
                  <button
                    type="button"
                    onClick={() => setMcuTab("hardware")}
                    className={`flex-1 py-1.5 rounded text-center font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      mcuTab === "hardware"
                        ? "bg-cyan-500/20 text-cyan-200 border border-cyan-500/40"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <Settings className="w-3.5 h-3.5" />
                    Hardware
                  </button>
                  <button
                    type="button"
                    onClick={() => setMcuTab("terminal")}
                    className={`flex-1 py-1.5 rounded text-center font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      mcuTab === "terminal"
                        ? "bg-cyan-500/20 text-cyan-200 border border-cyan-500/40"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <Terminal className="w-3.5 h-3.5" />
                    UART Log
                  </button>
                </div>

                {/* TAB 1: C FIRMWARE CODE EDITOR WITH HANDS-ON INPUT & INTEGRITY CHECK */}
                {mcuTab === "code" && (
                  <div className="space-y-2.5">
                    {/* Quick Template Buttons */}
                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                      <span>C Templates:</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setCCode(ESP32_TEMPLATES.ESP32_WROOM_BLINK);
                            setFirmwareResult({});
                          }}
                          className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
                        >
                          Blink
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCCode(ESP32_TEMPLATES.ESP32_S3_AI);
                            setFirmwareResult({});
                          }}
                          className="px-1.5 py-0.5 rounded bg-purple-950/60 hover:bg-purple-900 border border-purple-500/30 text-purple-200 cursor-pointer"
                        >
                          AI Vector
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCCode(ESP32_TEMPLATES.ESP32_C3_RISCV);
                            setFirmwareResult({});
                          }}
                          className="px-1.5 py-0.5 rounded bg-amber-950/60 hover:bg-amber-900 border border-amber-500/30 text-amber-200 cursor-pointer"
                        >
                          RISC-V
                        </button>
                      </div>
                    </div>

                    {/* Hands-on C Code Textarea */}
                    <div className="relative rounded-lg border border-slate-700/80 bg-[#050811] overflow-hidden focus-within:border-cyan-400">
                      <div className="flex items-center justify-between px-2.5 py-1 bg-[#090e1c] border-b border-slate-800 text-[10px] font-mono text-slate-400">
                        <span className="flex items-center gap-1">
                          <FileCode className="w-3 h-3 text-cyan-400" />
                          main.cpp / sketch.ino
                        </span>
                        <span>C/C++ Embed</span>
                      </div>
                      <textarea
                        value={cCode}
                        onChange={(e) => {
                          setCCode(e.target.value);
                          setFirmwareResult({});
                        }}
                        rows={12}
                        spellCheck={false}
                        className="w-full bg-transparent p-2.5 font-mono text-[11px] leading-relaxed text-emerald-300 placeholder-slate-600 focus:outline-none resize-none selection:bg-cyan-500/30"
                        placeholder="// Type your embedded C setup() and loop() code here..."
                      />
                    </div>

                    {/* Verify Integrity & Flash Button */}
                    <button
                      type="button"
                      onClick={handleVerifyFirmware}
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-mono font-bold text-xs shadow-lg shadow-cyan-950/40 flex items-center justify-center gap-2 transition-all cursor-pointer border border-cyan-400/30 active:scale-[0.98]"
                    >
                      <Zap className="w-4 h-4 text-cyan-200" />
                      Verify Code Integrity &amp; Flash to ESP32
                    </button>

                    {/* Verification Result Feedback */}
                    {firmwareResult.errorMessage && (
                      <div className="bg-rose-950/40 border border-rose-500/60 rounded-xl p-3 space-y-1.5">
                        <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-rose-300">
                          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                          <span>INTEGRITY VERIFICATION FAILED</span>
                        </div>
                        <p className="text-[11px] font-mono text-rose-200 leading-relaxed">
                          {firmwareResult.errorMessage}
                        </p>
                        <div className="text-[9.5px] font-mono text-rose-300/80 pt-1 border-t border-rose-500/20">
                          Operation halted. The firmware cannot run on hardware until the C syntax, pin configuration, and wiring connections are exact.
                        </div>
                      </div>
                    )}

                    {firmwareResult.isValid && (
                      <div className="bg-emerald-950/30 border border-emerald-500/50 rounded-xl p-3 space-y-2">
                        <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-300">
                          <CheckCircle className="w-4 h-4 text-emerald-400" />
                          <span>Silicon Integrity Verified &amp; Flashed</span>
                        </div>
                        <div className="text-[10px] font-mono text-slate-300 space-y-0.5">
                          <div>✓ Entry points `setup()` and `loop()` verified.</div>
                          <div>✓ Balanced delimiters &amp; C grammar syntax valid.</div>
                          <div>✓ ROM binary size: 184 KB / {flashSize * 1024} KB Flash ({((184 / (flashSize * 1024)) * 100).toFixed(1)}%).</div>
                        </div>

                        {firmwareResult.warnings && firmwareResult.warnings.length > 0 && (
                          <div className="bg-amber-950/40 border border-amber-500/30 rounded-lg p-2 text-[10px] font-mono text-amber-300 space-y-1">
                            <div className="font-bold flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-amber-400" />
                              Wiring Inconsistencies Detected:
                            </div>
                            {firmwareResult.warnings.map((w, i) => (
                              <div key={i} className="text-amber-200/90 leading-tight">
                                • {w}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 2: HARDWARE PERIPHERALS & REAL ENVIRONMENT SETTINGS */}
                {mcuTab === "hardware" && (
                  <div className="space-y-3 text-xs font-mono">
                    {/* CPU Frequency */}
                    <div className="space-y-1">
                      <label className="text-[10.5px] text-slate-300 font-semibold flex items-center justify-between">
                        <span>CPU Clock Frequency:</span>
                        <span className="text-cyan-400">{cpuFreq} MHz</span>
                      </label>
                      <select
                        value={cpuFreq}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          setCpuFreq(val);
                          onUpdateNode(selectedNode.id, {
                            digitalConfig: { ...selectedNode.digitalConfig, cpuFreqMhz: val as any },
                          });
                        }}
                        className="w-full bg-[#060a16] border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-cyan-400"
                      >
                        <option value={80}>80 MHz (Battery / Low EMI)</option>
                        <option value={160}>160 MHz (Standard System Clock)</option>
                        <option value={240}>240 MHz (Max Dual-Core Performance)</option>
                      </select>
                    </div>

                    {/* Flash Size & Mode */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-300 font-semibold">Flash Memory:</label>
                        <select
                          value={flashSize}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            setFlashSize(val);
                            onUpdateNode(selectedNode.id, {
                              digitalConfig: { ...selectedNode.digitalConfig, flashSizeMb: val as any },
                            });
                          }}
                          className="w-full bg-[#060a16] border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-cyan-400"
                        >
                          <option value={4}>4 MB SPI</option>
                          <option value={8}>8 MB Quad</option>
                          <option value={16}>16 MB Octal</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-300 font-semibold">SPI Mode:</label>
                        <select
                          value={flashMode}
                          onChange={(e) => {
                            setFlashMode(e.target.value);
                            onUpdateNode(selectedNode.id, {
                              digitalConfig: { ...selectedNode.digitalConfig, flashMode: e.target.value as any },
                            });
                          }}
                          className="w-full bg-[#060a16] border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-cyan-400"
                        >
                          <option value="QIO">QIO (Quad)</option>
                          <option value="DIO">DIO (Dual)</option>
                          <option value="QOUT">QOUT</option>
                        </select>
                      </div>
                    </div>

                    {/* Wi-Fi Configuration */}
                    <div className="bg-[#080d1a] border border-slate-800 rounded-lg p-2.5 space-y-2">
                      <div className="flex items-center justify-between text-[10.5px] font-bold text-slate-300">
                        <span className="flex items-center gap-1.5">
                          <Wifi className="w-3.5 h-3.5 text-cyan-400" />
                          Wi-Fi Subsystem
                        </span>
                        <select
                          value={wifiMode}
                          onChange={(e) => {
                            setWifiMode(e.target.value);
                            onUpdateNode(selectedNode.id, {
                              digitalConfig: { ...selectedNode.digitalConfig, wifiMode: e.target.value as any },
                            });
                          }}
                          className="bg-[#050811] border border-slate-700 text-cyan-300 text-[10px] rounded px-1.5 py-0.5 focus:outline-none cursor-pointer"
                        >
                          <option value="STA">Station (STA)</option>
                          <option value="AP">SoftAP</option>
                          <option value="AP_STA">AP+STA Dual</option>
                          <option value="OFF">Disabled</option>
                        </select>
                      </div>
                      {wifiMode !== "OFF" && (
                        <div className="space-y-1.5 pt-1">
                          <input
                            type="text"
                            value={wifiSSID}
                            placeholder="Network SSID"
                            onChange={(e) => {
                              setWifiSSID(e.target.value);
                              onUpdateNode(selectedNode.id, {
                                digitalConfig: { ...selectedNode.digitalConfig, wifiSSID: e.target.value },
                              });
                            }}
                            className="w-full bg-[#050811] border border-slate-700 rounded px-2 py-1 text-[11px] text-white focus:outline-none focus:border-cyan-400"
                          />
                          <input
                            type="password"
                            value={wifiPass}
                            placeholder="WPA2 Pre-Shared Key"
                            onChange={(e) => {
                              setWifiPass(e.target.value);
                              onUpdateNode(selectedNode.id, {
                                digitalConfig: { ...selectedNode.digitalConfig, wifiPass: e.target.value },
                              });
                            }}
                            className="w-full bg-[#050811] border border-slate-700 rounded px-2 py-1 text-[11px] text-white focus:outline-none focus:border-cyan-400"
                          />
                        </div>
                      )}
                    </div>

                    {/* UART Baud Rate & ADC Resolution */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-300 font-semibold">Baud Rate:</label>
                        <select
                          value={baudRate}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            setBaudRate(val);
                            onUpdateNode(selectedNode.id, {
                              digitalConfig: { ...selectedNode.digitalConfig, baudRate: val },
                            });
                          }}
                          className="w-full bg-[#060a16] border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-cyan-400"
                        >
                          <option value={9600}>9600</option>
                          <option value={115200}>115200</option>
                          <option value={230400}>230400</option>
                          <option value={921600}>921600</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-300 font-semibold">ADC Quantization:</label>
                        <select
                          value={adcBits}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            setAdcBits(val);
                            onUpdateNode(selectedNode.id, {
                              digitalConfig: { ...selectedNode.digitalConfig, adcBits: val as any },
                            });
                          }}
                          className="w-full bg-[#060a16] border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-cyan-400"
                        >
                          <option value={9}>9-bit (512)</option>
                          <option value={10}>10-bit (1024)</option>
                          <option value={11}>11-bit (2048)</option>
                          <option value={12}>12-bit (4096)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 3: UART SERIAL CONSOLE */}
                {mcuTab === "terminal" && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[10.5px] font-mono text-slate-400">
                      <span>UART Console @ {baudRate} baud:</span>
                      <button
                        type="button"
                        onClick={() => setFirmwareResult((prev) => ({ ...prev, logs: [] }))}
                        className="text-[10px] text-cyan-400 hover:text-cyan-300 font-bold cursor-pointer"
                      >
                        Clear
                      </button>
                    </div>
                    <div className="bg-[#050811] border border-slate-800 rounded-lg p-2.5 font-mono text-[10px] leading-relaxed max-h-48 overflow-y-auto scrollbar-thin text-slate-300 space-y-0.5">
                      {firmwareResult.logs && firmwareResult.logs.length > 0 ? (
                        firmwareResult.logs.map((log, i) => (
                          <div
                            key={i}
                            className={
                              log.includes("ERROR")
                                ? "text-rose-400"
                                : log.includes("HIGH")
                                ? "text-emerald-400"
                                : log.includes("BOOT") || log.includes("FLASH")
                                ? "text-cyan-400"
                                : "text-slate-300"
                            }
                          >
                            {log}
                          </div>
                        ))
                      ) : (
                        <div className="text-slate-500 italic py-2 text-center">
                          Click "Verify Code Integrity &amp; Flash" in the C Firmware tab to compile and view serial monitor boot logs.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : nodeType === "GND" ? (
              <div className="bg-[#0f1b33] border border-slate-700/80 rounded-xl p-3.5 space-y-2 shadow-lg">
                <div className="flex items-center justify-between border-b border-slate-700/60 pb-2">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-slate-300" />
                    <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                      Global Reference Node
                    </span>
                  </div>
                  <span className="text-[10.5px] font-mono px-2 py-0.5 rounded bg-slate-800 text-emerald-300 font-bold border border-slate-700">
                    0.00 V · Net 0
                  </span>
                </div>
                <p className="text-[10.5px] font-mono text-slate-400 leading-relaxed">
                  Earth Ground defines the fixed 0.00 V nodal reference used by KCL and KVL across the entire schematic.
                </p>
              </div>
            ) : (
              /* 1. Component Value & SI Unit Specification (USER REQUEST FEATURE) */
              <div className="bg-[#0f1b33] border border-cyan-500/40 rounded-xl p-3.5 space-y-3 shadow-lg shadow-cyan-950/30">
                <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                      Component Value &amp; SI Unit
                    </span>
                  </div>
                  {selectedNode.analogParams?.formattedValue && (
                    <span className="text-[10.5px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40">
                      {selectedNode.analogParams.formattedValue}
                    </span>
                  )}
                </div>

                {/* Exact Value & SI Unit Input Row */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono text-slate-300 font-semibold flex items-center justify-between">
                    <span>Numeric Value:</span>
                    <span>Unit (SI Prefix):</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        type="number"
                        step="any"
                        value={localVal}
                        placeholder="e.g. 4.7"
                        onChange={(e) => handleApplyValueAndUnit(e.target.value, localUnit)}
                        className="w-full bg-[#080d1a] border border-slate-700 focus:border-cyan-400 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none transition-colors"
                      />
                    </div>

                    {/* SI Unit Dropdown Selector */}
                    <select
                      value={localUnit}
                      onChange={(e) => handleApplyValueAndUnit(localVal, e.target.value)}
                      className="w-24 bg-[#080d1a] border border-slate-700 focus:border-cyan-400 text-cyan-300 font-mono font-bold text-xs rounded-lg px-2 py-1.5 focus:outline-none cursor-pointer"
                    >
                      {unitOptions.map((u) => (
                        <option key={u} value={u}>
                          {u || "None"}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Standard Commercial Presets (E12 / Common Values) */}
                {quickPresets.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <div className="text-[10px] font-mono text-slate-400 flex items-center justify-between">
                      <span>Quick Standard Values:</span>
                      <span className="text-cyan-400/80 text-[9.5px]">E12 Commercial Series</span>
                    </div>
                    <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-0.5 scrollbar-thin">
                      {quickPresets.map((p) => {
                        const isActive =
                          localVal === p.val.toString() && localUnit === p.unit;
                        return (
                          <button
                            key={p.label}
                            type="button"
                            onClick={() => handleApplyValueAndUnit(p.val.toString(), p.unit)}
                            className={`px-2 py-1 rounded text-[10px] font-mono font-semibold border transition-all cursor-pointer ${
                              isActive
                                ? "bg-cyan-500/25 border-cyan-400 text-cyan-200 shadow-xs"
                                : "bg-[#090e1c] border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                            }`}
                          >
                            {p.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Color Code Visual Preview (for Resistors) */}
                {isResistor && resistorBands && (
                  <div className="bg-[#080d1a] border border-slate-800 rounded-lg p-2.5 space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                      <span>EIA Resistor Color Bands:</span>
                      <span className="text-amber-400 font-bold">4-Band Code</span>
                    </div>
                    <div className="flex items-center gap-1.5 h-6 bg-[#d97706]/15 border border-[#d97706]/30 rounded-md px-3 justify-center">
                      <span
                        className="w-3 h-full rounded-xs shadow-xs"
                        style={{ backgroundColor: resistorBands.band1.bg }}
                        title={`Band 1: ${resistorBands.band1.name}`}
                      />
                      <span
                        className="w-3 h-full rounded-xs shadow-xs"
                        style={{ backgroundColor: resistorBands.band2.bg }}
                        title={`Band 2: ${resistorBands.band2.name}`}
                      />
                      <span
                        className="w-3 h-full rounded-xs shadow-xs"
                        style={{ backgroundColor: resistorBands.band3.bg }}
                        title={`Multiplier: ${resistorBands.band3.name}`}
                      />
                      <span className="w-3" />
                      <span
                        className="w-2.5 h-full rounded-xs shadow-xs"
                        style={{ backgroundColor: resistorBands.tolerance.bg }}
                        title={`Tolerance: ${resistorBands.tolerance.name}`}
                      />
                    </div>
                    <div className="text-[9.5px] font-mono text-slate-500 text-center truncate">
                      {resistorBands.band1.name} · {resistorBands.band2.name} · {resistorBands.band3.name} · Gold (±5%)
                    </div>
                  </div>
                )}

                <div className="text-[10px] font-mono text-slate-400 bg-[#080d1a] p-2 rounded-lg border border-slate-800 flex items-start gap-1.5 leading-relaxed">
                  <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                  <span>
                    Fixed value and SI unit update immediately in SPICE simulations and render directly on the schematic canvas.
                  </span>
                </div>
              </div>
            )}

            {/* 2. Component Designation & Schematic Label */}
            <div className="bg-[#11192e] border border-slate-800/80 rounded-xl p-3 space-y-2">
              <label className="text-[11px] font-mono font-semibold text-slate-300 flex items-center justify-between">
                <span>Schematic Reference Designation</span>
                <span className="text-[10px] text-cyan-400 font-normal">
                  ID: #{selectedNode.id}
                </span>
              </label>
              <input
                type="text"
                value={selectedNode.label || ""}
                placeholder={`${selectedNode.type}_${selectedNode.id}`}
                onChange={(e) =>
                  onUpdateNode(selectedNode.id, { label: e.target.value })
                }
                className="w-full bg-[#080d1a] border border-slate-700 focus:border-cyan-400 rounded-lg px-2.5 py-1.5 text-xs font-mono text-cyan-200 focus:outline-none transition-colors"
              />
            </div>

            {/* 3. Live Signal State & Operating Point */}
            <div className="bg-[#11192e] border border-slate-800/80 rounded-xl p-3 space-y-2.5">
              <div className="text-[11px] font-mono font-bold text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-emerald-400" />
                  Live Circuit State
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    currentLive === 1
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                      : "bg-slate-800 text-slate-400 border border-slate-700"
                  }`}
                >
                  {currentLive === 1 ? "LOGIC 1 (HIGH 5.0V)" : "LOGIC 0 (LOW 0.0V)"}
                </span>
              </div>

              {/* Pin Level Matrix for Gates */}
              {isGate && (
                <div className="grid grid-cols-3 gap-1.5 text-center text-[10px] font-mono pt-1">
                  <div className="p-1.5 rounded-lg bg-[#080d1a] border border-slate-800">
                    <div className="text-slate-400">Pin A</div>
                    <div
                      className={`font-bold ${
                        inVal0 === 1 ? "text-emerald-400" : "text-slate-500"
                      }`}
                    >
                      {inVal0 === 1 ? "1 (5V)" : "0 (0V)"}
                    </div>
                  </div>
                  <div className="p-1.5 rounded-lg bg-[#080d1a] border border-slate-800">
                    <div className="text-slate-400">Pin B</div>
                    <div
                      className={`font-bold ${
                        gateSpec.inputs === 2
                          ? inVal1 === 1
                            ? "text-emerald-400"
                            : "text-slate-500"
                          : "text-slate-600"
                      }`}
                    >
                      {gateSpec.inputs === 2
                        ? inVal1 === 1
                          ? "1 (5V)"
                          : "0 (0V)"
                        : "N/A"}
                    </div>
                  </div>
                  <div className="p-1.5 rounded-lg bg-[#080d1a] border border-cyan-500/30">
                    <div className="text-cyan-400">Output Y</div>
                    <div
                      className={`font-bold ${
                        currentLive === 1 ? "text-cyan-300" : "text-slate-500"
                      }`}
                    >
                      {currentLive === 1 ? "1 (5V)" : "0 (0V)"}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 4. Propagation Delay Specification (for Digital Gates & Flip-Flops) */}
            {isGate && (
              <div className="bg-[#11192e] border border-slate-800/80 rounded-xl p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-mono font-bold text-cyan-300 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-cyan-400" />
                    Propagation Delay (t_pd)
                  </label>
                  <span className="text-xs font-mono font-bold text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded border border-amber-500/30">
                    {currentDelay.toFixed(1)} ns
                  </span>
                </div>

                <div className="space-y-1">
                  <input
                    type="range"
                    min="0.5"
                    max="40"
                    step="0.5"
                    value={currentDelay}
                    onChange={(e) =>
                      onUpdateNode(selectedNode.id, {
                        delayNs: parseFloat(e.target.value),
                      })
                    }
                    className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
                  />
                  <div className="flex justify-between text-[9px] font-mono text-slate-500">
                    <span>0.5 ns</span>
                    <span>20 ns</span>
                    <span>40 ns</span>
                  </div>
                </div>

                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] font-mono text-slate-400">
                    IC Logic Family Presets:
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {IC_PROPAGATION_PRESETS.map((p) => (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() =>
                          onUpdateNode(selectedNode.id, { delayNs: p.delayNs })
                        }
                        className={`text-left px-2 py-1.5 rounded-lg border text-[10px] font-mono transition-all cursor-pointer ${
                          Math.abs(currentDelay - p.delayNs) < 0.1
                            ? "bg-cyan-500/20 border-cyan-400 text-cyan-200 font-bold"
                            : "bg-[#090e1c] border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200"
                        }`}
                        title={p.desc}
                      >
                        <div className="truncate">{p.label}</div>
                        <div className="text-[9px] text-amber-400 font-semibold">
                          t_pd = {p.delayNs} ns
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 5. Logic Gate Type Converter (if gate) */}
            {isGate && (
              <div className="bg-[#11192e] border border-slate-800/80 rounded-xl p-3 space-y-2.5">
                <div className="text-[11px] font-mono font-bold text-slate-300">
                  Gate Function
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {["AND", "NAND", "OR", "NOR", "XOR", "XNOR", "NOT"].map(
                    (gType) => (
                      <button
                        key={gType}
                        type="button"
                        onClick={() => onUpdateNode(selectedNode.id, { type: gType })}
                        className={`px-2 py-1.5 rounded-lg text-xs font-mono font-bold border transition-colors cursor-pointer ${
                          selectedNode.type === gType
                            ? "bg-cyan-500/25 border-cyan-400 text-cyan-200"
                            : "bg-[#080d1a] border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white"
                        }`}
                      >
                        {gType}
                      </button>
                    )
                  )}
                </div>
              </div>
            )}

            {/* 6. Switch State (for INPUT) */}
            {selectedNode.type === "INPUT" && (
              <div className="bg-[#11192e] border border-slate-800/80 rounded-xl p-3 space-y-2.5">
                <div className="text-[11px] font-mono font-bold text-slate-300">
                  Switch State Toggle
                </div>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateNode(selectedNode.id, {
                      value: selectedNode.value === 1 ? 0 : 1,
                    })
                  }
                  className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-mono font-bold border transition-colors cursor-pointer ${
                    selectedNode.value === 1
                      ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300"
                      : "bg-slate-800 border-slate-700 text-slate-400"
                  }`}
                >
                  {selectedNode.value === 1 ? (
                    <>
                      <ToggleRight className="w-4 h-4 text-emerald-400" />
                      TOGGLE: HIGH (1 · 5.0V)
                    </>
                  ) : (
                    <>
                      <ToggleLeft className="w-4 h-4 text-slate-500" />
                      TOGGLE: LOW (0 · 0.0V)
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Live Ohm's Law (V = IR) & Branch Telemetry Card */}
            {selectedNode && (isResistor || isAcSource || isDcSource || isCapacitor || isInductor || nodeType.startsWith("LED") || nodeType.startsWith("DIODE") || isVoltmeter || isAmmeter) && (() => {
              const telem = analogSolution?.compTelemetry.get(selectedNode.id);
              const rOhms = selectedNode.analogParams?.resistanceOhms ?? (nodeType === "POT" ? 10000 : 1000);
              const vDrop = telem?.vDrop ?? 0;
              const current_mA = telem?.current_mA ?? 0;
              const power_mW = telem?.power_mW ?? 0;
              const isConducting = telem?.isConducting ?? false;
              const vTerm0 = telem?.vTerm0 ?? 0;
              const vTerm1 = telem?.vTerm1 ?? 0;

              return (
                <div className="bg-[#0b162c] border border-cyan-500/50 rounded-xl p-3.5 space-y-3 shadow-lg shadow-cyan-950/40">
                  <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                        Ohm's Law &amp; Circuit Telemetry
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border ${
                        isConducting
                          ? "bg-emerald-950/80 border-emerald-600/60 text-emerald-300"
                          : "bg-slate-800 text-slate-400 border-slate-700"
                      }`}
                    >
                      {isConducting ? "Active Loop ✓" : "Open / Standby"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div className="bg-[#040816] border border-slate-800 rounded-lg p-2">
                      <div className="text-[9.5px] text-slate-400 uppercase">Input Terminal (V+)</div>
                      <div className="text-sm font-bold text-cyan-300">{vTerm0.toFixed(2)} V</div>
                    </div>
                    <div className="bg-[#040816] border border-slate-800 rounded-lg p-2">
                      <div className="text-[9.5px] text-slate-400 uppercase">Output Terminal (V−)</div>
                      <div className="text-sm font-bold text-slate-300">{vTerm1.toFixed(2)} V</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div className="bg-[#040816] border border-slate-800 rounded-lg p-2">
                      <div className="text-[9.5px] text-emerald-400/90 uppercase font-semibold">Voltage Drop (ΔV)</div>
                      <div className="text-base font-bold text-emerald-300">{vDrop.toFixed(2)} V</div>
                    </div>
                    <div className="bg-[#040816] border border-slate-800 rounded-lg p-2">
                      <div className="text-[9.5px] text-cyan-400/90 uppercase font-semibold">Branch Current (I)</div>
                      <div className="text-base font-bold text-cyan-300">
                        {current_mA < 1 ? `${(current_mA * 1000).toFixed(0)} µA` : `${current_mA.toFixed(2)} mA`}
                      </div>
                    </div>
                  </div>

                  {isResistor && (
                    <div className="bg-[#020617] border border-emerald-800/60 rounded-lg p-2.5 space-y-1.5 font-mono text-[11px]">
                      <div className="flex items-center justify-between text-emerald-400 font-bold">
                        <span>Ohm's Law: V = I × R</span>
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                      </div>
                      <div className="text-slate-300 text-[10.5px] leading-relaxed">
                        <span className="text-emerald-300 font-bold">{vDrop.toFixed(2)} V</span> ={" "}
                        <span className="text-cyan-300 font-bold">
                          {(current_mA / 1000).toFixed(4)} A
                        </span>{" "}
                        × <span className="text-amber-300 font-bold">{rOhms} Ω</span>
                      </div>
                      <div className="text-[9.5px] text-slate-400 flex items-center justify-between">
                        <span>Dissipation P = V × I:</span>
                        <strong className="text-emerald-300">{power_mW.toFixed(2)} mW</strong>
                      </div>
                      {telem?.kvlDropPercent !== undefined && telem.kvlDropPercent > 0 && (
                        <div className="text-[9.5px] text-sky-400 flex items-center justify-between border-t border-slate-800/80 pt-1">
                          <span>KVL Loop Share:</span>
                          <strong>{telem.kvlDropPercent.toFixed(1)}% of V_source</strong>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Kirchhoff's Laws (KCL & KVL) Quantitative Status */}
                  {analogSolution && analogSolution.hasClosedLoop && (
                    <div className="bg-[#03091e] border border-cyan-800/50 rounded-lg p-2.5 space-y-1 font-mono text-[10px]">
                      <div className="flex items-center justify-between text-cyan-300 font-bold">
                        <span>Kirchhoff's Laws Status</span>
                        <span className="text-[9px] text-emerald-400 font-bold bg-emerald-950/80 border border-emerald-700/50 px-1.5 py-0.5 rounded">
                          BALANCED
                        </span>
                      </div>
                      <div className="text-slate-300 flex items-center justify-between">
                        <span className="text-slate-400">KCL (Σ I_node = 0):</span>
                        <span className="text-emerald-300 font-bold">
                          {analogSolution.kclSatisfied ? "✓ Satisfied (0.00 mA)" : "Pending"}
                        </span>
                      </div>
                      <div className="text-slate-300 flex items-center justify-between">
                        <span className="text-slate-400">KVL (Σ V_drop = V_S):</span>
                        <span className="text-emerald-300 font-bold">
                          {analogSolution.kvlSatisfied
                            ? `✓ Verified (${analogSolution.sourceVoltageV.toFixed(2)}V Loop)`
                            : "Open Loop"}
                        </span>
                      </div>
                    </div>
                  )}

                  {isAcSource && (
                    <div className="bg-[#020617] border border-cyan-800/60 rounded-lg p-2.5 space-y-1.5 font-mono text-[10.5px]">
                      <div className="flex items-center justify-between text-cyan-400 font-bold">
                        <span>AC Sine Generator Terminals</span>
                        <Zap className="w-3.5 h-3.5 text-cyan-400" />
                      </div>
                      <div className="text-slate-300 leading-relaxed text-[11px] space-y-0.5">
                        <div>
                          Pin 0: <strong className="text-red-400">PHASE (Live / Phase ~)</strong>
                        </div>
                        <div>
                          Pin 1: <strong className="text-slate-300">NEUTRAL_GND (Neutral / Ground ⏚)</strong>
                        </div>
                      </div>
                      <div className="text-[10px] text-emerald-400 bg-emerald-950/50 border border-emerald-800/50 rounded p-1.5 flex items-center gap-1.5">
                        <CheckCircle className="w-3 h-3 flex-shrink-0 text-emerald-400" />
                        <span>Neutral terminal is bound to the common global ground reference (Net 0 = 0.00V).</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Metrology Panel for VOLTMETER */}
            {selectedNode.type === "VOLTMETER" && (
              <div className="bg-[#0b1329] border border-cyan-800/80 rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-cyan-300">
                    <Gauge className="w-4 h-4 text-cyan-400" />
                    <span>DC Voltmeter Metrology</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-700/60 text-cyan-300">
                    PARALLEL
                  </span>
                </div>

                {/* Physics rule callout */}
                <div className="bg-[#020617] border border-cyan-900/40 rounded-lg p-2.5 text-[11px] font-sans space-y-1.5 text-slate-300">
                  <div className="flex items-center gap-1.5 font-bold text-cyan-400">
                    <Info className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>University Metrology Rule: Parallel Placement</span>
                  </div>
                  <p className="text-slate-400 leading-relaxed text-[10.5px]">
                    Voltmeters have extremely high internal resistance (<strong className="text-slate-200">10 MΩ</strong>). Always place the probes <strong className="text-cyan-300">across</strong> the component in parallel. Never insert in series, or it will act as an open circuit and block the load current.
                  </p>
                </div>

                {/* Probe Connections */}
                {(() => {
                  const c0 = findPinConnection(selectedNode.id, 0, "in");
                  const c1 = findPinConnection(selectedNode.id, 1, "in");
                  const src0 = c0?.peerNode ?? null;
                  const src1 = c1?.peerNode ?? null;
                  const v0 = src0 && c0
                    ? analogSolution?.getPinVoltage(src0.id, c0.peerPort, c0.peerDir) ??
                      getFallbackNodeVoltage(src0, c0.peerPort)
                    : 0;
                  const v1 = src1 && c1
                    ? analogSolution?.getPinVoltage(src1.id, c1.peerPort, c1.peerDir) ??
                      getFallbackNodeVoltage(src1, c1.peerPort)
                    : 0;
                  const w0 = c0?.wire ?? null;
                  const w1 = c1?.wire ?? null;
                  const diff = w0 && w1 ? v0 - v1 : w0 ? v0 : w1 ? -v1 : 0;

                  return (
                    <div className="space-y-2">
                      <div className="bg-[#020617] border border-slate-800 rounded-lg p-2.5 space-y-2">
                        <div className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                          Test Leads &amp; Probed Terminals
                        </div>
                        <div className="flex items-center justify-between text-xs font-mono">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block ring-2 ring-red-950" />
                            <span className="text-red-400 font-bold">V+ (Red):</span>
                          </div>
                          <span className={src0 ? "text-slate-200 font-bold" : "text-slate-500 italic"}>
                            {src0 ? `${src0.label || src0.type} (${v0.toFixed(2)}V)` : "Unconnected"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs font-mono">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-slate-600 inline-block ring-2 ring-slate-900" />
                            <span className="text-slate-400 font-bold">V- (COM):</span>
                          </div>
                          <span className={src1 ? "text-slate-200 font-bold" : "text-slate-500 italic"}>
                            {src1 ? `${src1.label || src1.type} (${v1.toFixed(2)}V)` : "Unconnected (Floating)"}
                          </span>
                        </div>
                      </div>

                      {/* Live Measured Potential Difference */}
                      <div className="bg-cyan-950/40 border border-cyan-800/60 rounded-lg p-2.5 flex items-center justify-between">
                        <div>
                          <div className="text-[10px] font-mono text-cyan-400/80 uppercase">Potential Difference ΔV</div>
                          <div className="text-lg font-mono font-bold text-cyan-300">
                            {w0 || w1 ? `${diff >= 0 ? "+" : ""}${diff.toFixed(2)} V` : "---.- V"}
                          </div>
                        </div>
                        <div className="text-right">
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                              w0 && w1
                                ? "bg-emerald-950/80 border border-emerald-600/60 text-emerald-300"
                                : "bg-slate-800 text-slate-400"
                            }`}
                          >
                            {w0 && w1 ? (
                              <>
                                <CheckCircle className="w-3 h-3 text-emerald-400" />
                                Valid Differential
                              </>
                            ) : (
                              "Open Leads"
                            )}
                          </span>
                        </div>
                      </div>

                      {onOpenPmeGuide && (
                        <button
                          type="button"
                          onClick={() => onOpenPmeGuide("VOLTMETER")}
                          className="w-full mt-2 py-1.5 px-3 rounded-lg bg-sky-950/60 hover:bg-sky-900/80 border border-sky-600/50 text-sky-200 text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Compass className="w-3.5 h-3.5 text-sky-400" />
                          <span>PME Guide: How to Use Voltmeter</span>
                        </button>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Metrology Panel for AMMETER */}
            {selectedNode.type === "AMMETER" && (
              <div className="bg-[#061a12] border border-emerald-800/80 rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-300">
                    <Activity className="w-4 h-4 text-emerald-400" />
                    <span>In-Line Ammeter Metrology</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-700/60 text-emerald-300">
                    SERIES ONLY
                  </span>
                </div>

                {/* Physics rule callout */}
                <div className="bg-[#020617] border border-emerald-900/40 rounded-lg p-2.5 text-[11px] font-sans space-y-1.5 text-slate-300">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-400">
                    <Info className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>University Metrology Rule: Series In-Line Placement</span>
                  </div>
                  <p className="text-slate-400 leading-relaxed text-[10.5px]">
                    Ammeters contain a near-zero internal shunt resistance (<strong className="text-slate-200">~0.05 Ω</strong>). Always insert <strong className="text-emerald-300">in series</strong> with your load. Placing an ammeter in parallel directly across a power source causes a <strong className="text-red-400">dangerous short circuit</strong>!
                  </p>
                </div>

                {/* Series Loop Connection Details */}
                {(() => {
                  const cIn = findPinConnection(selectedNode.id, 0, "in");
                  const cOut = findPinConnection(selectedNode.id, 0, "out");
                  const srcNode = cIn?.peerNode ?? null;
                  const loadNode = cOut?.peerNode ?? null;

                  const vin = srcNode && cIn
                    ? analogSolution?.getPinVoltage(srcNode.id, cIn.peerPort, cIn.peerDir) ??
                      getFallbackNodeVoltage(srcNode, cIn.peerPort)
                    : 0;
                  const isShort = loadNode?.type === "GND" && vin > 0.5;
                  const isSeries = !!(cIn && cOut);

                  const telem = analogSolution?.compTelemetry.get(selectedNode.id);
                  let currentStr = "0.00 mA";
                  if (telem && telem.current_mA > 0.001) {
                    currentStr = telem.current_mA >= 1000 ? `${(telem.current_mA / 1000).toFixed(2)} A` : `${telem.current_mA.toFixed(2)} mA`;
                  } else if (isShort) {
                    currentStr = "> 2.50 A ⚠️";
                  } else if (isSeries && vin > 0) {
                    if (loadNode?.type === "RESISTOR" || loadNode?.type === "RES") {
                      const r = loadNode.analogParams?.resistanceOhms ?? 1000;
                      const mA = (vin / r) * 1000;
                      currentStr = mA >= 1000 ? `${(mA / 1000).toFixed(2)} A` : `${mA.toFixed(2)} mA`;
                    } else if (loadNode?.type.startsWith("LED")) {
                      currentStr = "15.00 mA";
                    } else {
                      currentStr = "5.00 mA";
                    }
                  }

                  return (
                    <div className="space-y-2">
                      <div className="bg-[#020617] border border-slate-800 rounded-lg p-2.5 space-y-2">
                        <div className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                          In-Line Current Loop Path
                        </div>
                        <div className="flex items-center justify-between text-xs font-mono">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block ring-2 ring-emerald-950" />
                            <span className="text-emerald-400 font-bold">I_IN (+) Input:</span>
                          </div>
                          <span className={srcNode ? "text-slate-200 font-bold" : "text-slate-500 italic"}>
                            {srcNode ? `${srcNode.label || srcNode.type} (${vin.toFixed(1)}V)` : "Open (No Source)"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs font-mono">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block ring-2 ring-emerald-950" />
                            <span className="text-emerald-400 font-bold">I_OUT (-) Output:</span>
                          </div>
                          <span className={loadNode ? "text-slate-200 font-bold" : "text-slate-500 italic"}>
                            {loadNode ? `${loadNode.label || loadNode.type}` : "Open (No Load)"}
                          </span>
                        </div>
                      </div>

                      {/* Alert banner if short circuit */}
                      {isShort && (
                        <div className="bg-red-950/70 border border-red-700/80 rounded-lg p-2 text-xs font-mono text-red-200 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                          <span>WARNING: Direct shunt across supply! Add a series resistor to prevent damage.</span>
                        </div>
                      )}

                      {/* Live Measured Branch Current */}
                      <div
                        className={`rounded-lg p-2.5 flex items-center justify-between ${
                          isShort
                            ? "bg-red-950/50 border border-red-800/80"
                            : "bg-emerald-950/40 border border-emerald-800/60"
                        }`}
                      >
                        <div>
                          <div className="text-[10px] font-mono text-emerald-400/80 uppercase">Branch Current I</div>
                          <div className={`text-lg font-mono font-bold ${isShort ? "text-red-400" : "text-emerald-300"}`}>
                            {currentStr}
                          </div>
                        </div>
                        <div className="text-right">
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                              isShort
                                ? "bg-red-900/60 text-red-300 border border-red-700/60"
                                : isSeries
                                ? "bg-emerald-950/80 border border-emerald-600/60 text-emerald-300"
                                : "bg-slate-800 text-slate-400"
                            }`}
                          >
                            {isShort ? (
                              <>
                                <AlertTriangle className="w-3 h-3 text-red-400" />
                                Short Circuit!
                              </>
                            ) : isSeries ? (
                              <>
                                <CheckCircle className="w-3 h-3 text-emerald-400" />
                                Series Closed
                              </>
                            ) : (
                              "Loop Open"
                            )}
                          </span>
                        </div>
                      </div>

                      {onOpenPmeGuide && (
                        <button
                          type="button"
                          onClick={() => onOpenPmeGuide("AMMETER")}
                          className="w-full mt-2 py-1.5 px-3 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-600/50 text-emerald-200 text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Compass className="w-3.5 h-3.5 text-emerald-400" />
                          <span>PME Guide: How to Use In-Line Ammeter</span>
                        </button>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Metrology Panel for OHMMETER */}
            {selectedNode.type === "OHMMETER" && (
              <div className="bg-[#1c1404] border border-amber-700/80 rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-amber-300">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span>Digital Ohmmeter Metrology</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-950/80 border border-amber-600/60 text-amber-300">
                    DE-ENERGIZED ONLY
                  </span>
                </div>

                {/* Physics rule callout */}
                <div className="bg-[#020617] border border-amber-900/40 rounded-lg p-2.5 text-[11px] font-sans space-y-1.5 text-slate-300">
                  <div className="flex items-center gap-1.5 font-bold text-amber-400">
                    <Info className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>University Metrology Rule: Power OFF Required</span>
                  </div>
                  <p className="text-slate-400 leading-relaxed text-[10.5px]">
                    An ohmmeter injects its own micro-current (I_test) to measure resistance (R = V/I). The circuit <strong className="text-amber-300">MUST be powered OFF (0V)</strong>. In a live circuit, external voltage destroys the reading and blows the meter fuse.
                  </p>
                </div>

                {/* Ohmmeter connection and calculation */}
                {(() => {
                  const c0 = findPinConnection(selectedNode.id, 0, "in");
                  const c1 = findPinConnection(selectedNode.id, 1, "in");
                  const src0 = c0?.peerNode ?? null;
                  const src1 = c1?.peerNode ?? null;

                  const v0 = src0 && c0 ? analogSolution?.getPinVoltage(src0.id, c0.peerPort, c0.peerDir) ?? getFallbackNodeVoltage(src0, c0.peerPort) : 0;
                  const v1 = src1 && c1 ? analogSolution?.getPinVoltage(src1.id, c1.peerPort, c1.peerDir) ?? getFallbackNodeVoltage(src1, c1.peerPort) : 0;
                  const vDiff = Math.abs(v0 - v1);
                  const isLive = vDiff > 0.05 || Math.abs(v0) > 0.1 || Math.abs(v1) > 0.1;
                  const isConnected = !!(c0 && c1);

                  const ohmTelem = analogSolution?.compTelemetry.get(selectedNode.id);
                  const formatOhms = (r: number) =>
                    !isFinite(r) || isNaN(r)
                      ? "O.L. MΩ"
                      : r >= 1e6
                      ? `${(r / 1e6).toFixed(2)} MΩ`
                      : r >= 1e3
                      ? `${(r / 1e3).toFixed(2)} kΩ`
                      : `${r.toFixed(1)} Ω`;

                  let rStr = "O.L. MΩ";
                  let isSneak = false;
                  if (isConnected && !isLive) {
                    if (ohmTelem?.resistanceOhms !== undefined && isFinite(ohmTelem.resistanceOhms)) {
                      rStr = formatOhms(ohmTelem.resistanceOhms);
                    } else if (src0 && src1 && src0.id === src1.id) {
                      const nom = src0.analogParams?.resistanceOhms ?? 1000;
                      rStr = formatOhms(nom);
                    }
                    if (src0 && src1 && src0.id === src1.id) {
                      const otherW = wires.filter(
                        (w) =>
                          (w.from.node === src0.id || w.to.node === src0.id) &&
                          w.from.node !== selectedNode.id &&
                          w.to.node !== selectedNode.id
                      );
                      if (otherW.length > 0) isSneak = true;
                    }
                  } else if (isLive) {
                    rStr = "⚡ LIVE CKT!";
                  }

                  return (
                    <div className="space-y-2">
                      <div className="bg-[#020617] border border-slate-800 rounded-lg p-2.5 space-y-2">
                        <div className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                          Test Probes &amp; DUT Terminals
                        </div>
                        <div className="flex items-center justify-between text-xs font-mono">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block ring-2 ring-red-950" />
                            <span className="text-red-400 font-bold">Ω+ (Red Lead):</span>
                          </div>
                          <span className={src0 ? "text-slate-200 font-bold" : "text-slate-500 italic"}>
                            {src0 ? `${src0.label || src0.type}` : "Open Lead"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs font-mono">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-slate-600 inline-block ring-2 ring-slate-900" />
                            <span className="text-slate-400 font-bold">Ω- (Black Lead):</span>
                          </div>
                          <span className={src1 ? "text-slate-200 font-bold" : "text-slate-500 italic"}>
                            {src1 ? `${src1.label || src1.type}` : "Open Lead"}
                          </span>
                        </div>
                      </div>

                      {/* Live Circuit Warning */}
                      {isLive && (
                        <div className="bg-red-950/70 border border-red-700/80 rounded-lg p-2 text-xs font-mono text-red-200 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                          <span>⚡ LIVE CIRCUIT ERROR: {vDiff.toFixed(2)}V detected! Disconnect power to measure R.</span>
                        </div>
                      )}

                      {isSneak && !isLive && (
                        <div className="bg-amber-950/50 border border-amber-700/60 rounded-lg p-2 text-[11px] font-sans text-amber-200 flex items-center gap-2">
                          <Info className="w-4 h-4 text-amber-400 flex-shrink-0" />
                          <span>Parallel sneak path detected. For 100% precision, lift one terminal of the component.</span>
                        </div>
                      )}

                      {/* Live Measured Resistance */}
                      <div
                        className={`rounded-lg p-2.5 flex items-center justify-between ${
                          isLive
                            ? "bg-red-950/50 border border-red-800/80"
                            : "bg-amber-950/40 border border-amber-800/60"
                        }`}
                      >
                        <div>
                          <div className="text-[10px] font-mono text-amber-400/80 uppercase">Measured Resistance R</div>
                          <div className={`text-lg font-mono font-bold ${isLive ? "text-red-400" : "text-amber-300"}`}>
                            {rStr}
                          </div>
                        </div>
                        <div className="text-right">
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                              isLive
                                ? "bg-red-900/60 text-red-300 border border-red-700/60"
                                : isConnected
                                ? "bg-amber-950/80 border border-amber-600/60 text-amber-300"
                                : "bg-slate-800 text-slate-400"
                            }`}
                          >
                            {isLive ? "Hazard / Live" : isConnected ? "Passive Loop" : "Open Probes"}
                          </span>
                        </div>
                      </div>

                      {onOpenPmeGuide && (
                        <button
                          type="button"
                          onClick={() => onOpenPmeGuide("OHMMETER")}
                          className="w-full mt-2 py-1.5 px-3 rounded-lg bg-amber-950/60 hover:bg-amber-900/80 border border-amber-600/50 text-amber-200 text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Compass className="w-3.5 h-3.5 text-amber-400" />
                          <span>PME Guide: How to Use Ohmmeter</span>
                        </button>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Metrology Panel for POWER_METER / WATTMETER */}
            {(selectedNode.type === "POWER_METER" || selectedNode.type === "WATTMETER") && (
              <div className="bg-[#130722] border border-purple-700/80 rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-purple-300">
                    <Flame className="w-4 h-4 text-purple-400" />
                    <span>Digital Wattmeter Metrology</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-purple-950/80 border border-purple-600/60 text-purple-300">
                    4-TERMINAL DUAL-COIL
                  </span>
                </div>

                {/* Physics rule callout */}
                <div className="bg-[#020617] border border-purple-900/40 rounded-lg p-2.5 text-[11px] font-sans space-y-1.5 text-slate-300">
                  <div className="flex items-center gap-1.5 font-bold text-purple-400">
                    <Info className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>University Metrology Rule: Dual-Coil Wiring</span>
                  </div>
                  <p className="text-slate-400 leading-relaxed text-[10.5px]">
                    Real power P = V × I. Connect the <strong className="text-sky-300">Voltage Coil (V+, V-) in parallel</strong> across the load, and the <strong className="text-emerald-300">Current Coil (I_IN, I_OUT) in series</strong> with the load loop. Both coils must be active.
                  </p>
                </div>

                {/* Live Coils Status */}
                {(() => {
                  const cV0 = findPinConnection(selectedNode.id, 0, "in");
                  const cV1 = findPinConnection(selectedNode.id, 1, "in");
                  const cIIn = findPinConnection(selectedNode.id, 2, "in");
                  const cIOut = findPinConnection(selectedNode.id, 0, "out");

                  const hasVCoil = !!(cV0 && cV1);
                  const hasICoil = !!(cIIn && cIOut);

                  const telem = analogSolution?.compTelemetry.get(selectedNode.id);
                  const v = telem?.vDrop ?? 0;
                  const iMa = telem?.current_mA ?? 0;
                  const pMw = v * iMa;
                  const pW = pMw / 1000;

                  return (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                        <div className="bg-[#020617] border border-slate-800 rounded-lg p-2 space-y-1">
                          <span className="text-[10px] text-sky-400 font-bold uppercase">Voltage Coil (//)</span>
                          <div className="text-slate-200 font-bold">{hasVCoil ? `${v.toFixed(2)} V` : "Open Coil"}</div>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded ${hasVCoil ? "bg-emerald-950 text-emerald-300" : "bg-slate-800 text-slate-400"}`}>
                            {hasVCoil ? "V-Coil Active" : "Missing V"}
                          </span>
                        </div>

                        <div className="bg-[#020617] border border-slate-800 rounded-lg p-2 space-y-1">
                          <span className="text-[10px] text-emerald-400 font-bold uppercase">Current Coil (s)</span>
                          <div className="text-slate-200 font-bold">{hasICoil ? `${iMa.toFixed(1)} mA` : "Open Coil"}</div>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded ${hasICoil ? "bg-emerald-950 text-emerald-300" : "bg-slate-800 text-slate-400"}`}>
                            {hasICoil ? "I-Coil Active" : "Missing I"}
                          </span>
                        </div>
                      </div>

                      {/* Measured Power */}
                      <div className="bg-purple-950/40 border border-purple-800/60 rounded-lg p-2.5 flex items-center justify-between">
                        <div>
                          <div className="text-[10px] font-mono text-purple-400/80 uppercase">Active Real Power P</div>
                          <div className="text-lg font-mono font-bold text-purple-300">
                            {hasVCoil && hasICoil
                              ? pW >= 1.0
                                ? `${pW.toFixed(2)} W`
                                : `${pMw.toFixed(1)} mW`
                              : hasVCoil
                              ? "0.00 mW (I Open)"
                              : hasICoil
                              ? "0.00 mW (V Open)"
                              : "---.- mW"}
                          </div>
                        </div>
                        <div className="text-right">
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                              hasVCoil && hasICoil
                                ? "bg-emerald-950/80 border border-emerald-600/60 text-emerald-300"
                                : "bg-amber-950/80 border border-amber-600/60 text-amber-300"
                            }`}
                          >
                            {hasVCoil && hasICoil ? (
                              <>
                                <CheckCircle className="w-3 h-3 text-emerald-400" />
                                Dual-Coil Valid
                              </>
                            ) : (
                              "Incomplete Wiring"
                            )}
                          </span>
                        </div>
                      </div>

                      {onOpenPmeGuide && (
                        <button
                          type="button"
                          onClick={() => onOpenPmeGuide("POWER_METER")}
                          className="w-full mt-2 py-1.5 px-3 rounded-lg bg-purple-950/60 hover:bg-purple-900/80 border border-purple-600/50 text-purple-200 text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Compass className="w-3.5 h-3.5 text-purple-400" />
                          <span>PME Guide: How to Use Wattmeter</span>
                        </button>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* 7. Canvas Position & Snap */}
            <div className="bg-[#11192e] border border-slate-800/80 rounded-xl p-3 space-y-2">
              <div className="text-[11px] font-mono font-bold text-slate-300 flex items-center justify-between">
                <span>Breadboard Coordinates</span>
                <button
                  type="button"
                  onClick={() => onSnapNodeToGrid && onSnapNodeToGrid(selectedNode.id)}
                  className="inline-flex items-center gap-1 text-[10px] font-mono text-cyan-400 hover:text-cyan-300 cursor-pointer"
                >
                  <Magnet className="w-3 h-3" />
                  Align to Holes
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="flex items-center gap-1.5 bg-[#080d1a] border border-slate-800 rounded px-2.5 py-1">
                  <span className="text-slate-500">X:</span>
                  <span className="text-slate-200">{Math.round(selectedNode.x)} px</span>
                </div>
                <div className="flex items-center gap-1.5 bg-[#080d1a] border border-slate-800 rounded px-2.5 py-1">
                  <span className="text-slate-500">Y:</span>
                  <span className="text-slate-200">{Math.round(selectedNode.y)} px</span>
                </div>
              </div>
            </div>

            {/* 8. Connected Wires */}
            <div className="bg-[#11192e] border border-slate-800/80 rounded-xl p-3 space-y-2">
              <div className="text-[11px] font-mono font-bold text-slate-300">
                Connected Wire Leads ({connectedWires.incoming.length + connectedWires.outgoing.length})
              </div>
              <div className="space-y-1 text-[10px] font-mono max-h-28 overflow-y-auto">
                {connectedWires.incoming.map((w) => (
                  <div
                    key={w.id}
                    className="flex items-center justify-between px-2 py-1 rounded bg-[#080d1a] border border-slate-800 text-slate-400"
                  >
                    <span>← In Pin {w.to.port === 0 ? "A" : "B"} (From #{w.from.node})</span>
                    {onAttachProbeToWire && (
                      <button
                        type="button"
                        onClick={() => onAttachProbeToWire(w.id)}
                        className="text-cyan-400 hover:text-cyan-300 font-bold cursor-pointer"
                      >
                        Probe
                      </button>
                    )}
                  </div>
                ))}
                {connectedWires.outgoing.map((w) => (
                  <div
                    key={w.id}
                    className="flex items-center justify-between px-2 py-1 rounded bg-[#080d1a] border border-slate-800 text-slate-400"
                  >
                    <span>→ Out Y (To #{w.to.node})</span>
                    {onAttachProbeToWire && (
                      <button
                        type="button"
                        onClick={() => onAttachProbeToWire(w.id)}
                        className="text-cyan-400 hover:text-cyan-300 font-bold cursor-pointer"
                      >
                        Probe
                      </button>
                    )}
                  </div>
                ))}
                {connectedWires.incoming.length === 0 && connectedWires.outgoing.length === 0 && (
                  <div className="text-amber-400 text-center py-1">
                    ⚠️ No jumper wires connected to this component pin.
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Selected Wire Net Properties */}
        {selectedWire && (
          <div className="space-y-3">
            <div className="bg-[#11192e] border border-slate-800/80 rounded-xl p-3 space-y-2">
              <div className="text-xs font-mono font-bold text-cyan-300">
                Breadboard Jumper Wire Net #{selectedWire.id}
              </div>
              <div className="text-[11px] font-mono text-slate-300 space-y-1">
                <div>From: Node #{selectedWire.from.node} (Port {selectedWire.from.port})</div>
                <div>To: Node #{selectedWire.to.node} (Port {selectedWire.to.port})</div>
              </div>
            </div>

            {onAttachProbeToWire && (
              <button
                type="button"
                onClick={() => onAttachProbeToWire(selectedWire.id)}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-500/40 text-xs font-mono font-bold transition-colors cursor-pointer"
              >
                <Activity className="w-4 h-4 text-cyan-400" />
                Attach Virtual Oscilloscope Probe
              </button>
            )}
          </div>
        )}
      </div>

      {/* Action Footer: Duplicate & Delete */}
      <div className="p-3 bg-[#0a0f1d] border-t border-slate-800 flex items-center gap-2">
        {selectedNode && onDuplicateNode && (
          <button
            type="button"
            onClick={() => onDuplicateNode(selectedNode)}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-semibold transition-colors cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5 text-cyan-400" />
            Duplicate
          </button>
        )}

        <button
          type="button"
          onClick={() => {
            if (selectedNode) onDeleteNode(selectedNode.id);
            else if (selectedWire) onDeleteWire(selectedWire.id);
            onClose();
          }}
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/40 text-rose-300 text-xs font-mono font-semibold transition-colors cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5 text-rose-400" />
          Delete (Del)
        </button>
      </div>
    </aside>
  );
}
