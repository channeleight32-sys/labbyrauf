import React, { useState, useEffect } from "react";
import {
  X,
  CheckCircle2,
  Cpu,
  Zap,
  Sliders,
  Layers,
  HelpCircle,
  ArrowRight,
  ShieldCheck,
  Activity,
  Info,
} from "lucide-react";
import type { AnalogNode, AnalogCompType } from "./SeriesParallelBuilder";

export type TransistorFamily = "BJT" | "MOSFET" | "JFET" | "SCR";
export type TransistorPolarity =
  | "NPN"
  | "PNP"
  | "NMOS"
  | "PMOS"
  | "NJFET"
  | "PJFET"
  | "SCR";

export interface TransistorConfig {
  family: TransistorFamily;
  polarity: TransistorPolarity;
  modelName: string;
  // BJT parameters
  beta: number; // hFE (e.g. 250)
  vbe_on: number; // V (e.g. 0.7)
  vce_sat: number; // V (e.g. 0.2)
  va: number; // Early voltage (e.g. 100)
  // MOSFET parameters
  vth: number; // Threshold voltage (e.g. 2.5 for NMOS, -2.5 for PMOS)
  rds_on: number; // Ohms (e.g. 0.044)
  kn: number; // mA/V^2 (e.g. 40)
  // JFET parameters
  vP: number; // V (e.g. -4.0)
  idss_mA: number; // mA (e.g. 15)
  // SCR parameters
  vgt: number; // V (e.g. 0.75)
  igt_mA: number; // mA (e.g. 5)
  vHold: number; // V (e.g. 0.85)
}

export function isTransistorOrSemiconductor(type: AnalogCompType): boolean {
  return [
    "BJT",
    "BC547",
    "BC557",
    "MOS",
    "JFET",
    "SCR",
  ].includes(type);
}

export function isThreeTerminalComponent(type: AnalogCompType): boolean {
  return [
    "BJT",
    "BC547",
    "BC557",
    "MOS",
    "JFET",
    "SCR",
    "TRIAC",
    "POT",
  ].includes(type);
}

export function getAnalogTerminalCount(type: AnalogCompType): number {
  if (type === "GND") return 1;
  if (isThreeTerminalComponent(type)) return 3;
  return 2;
}

export function getTerminalLabels(
  type: AnalogCompType,
  polarity?: TransistorPolarity
): { t0: { label: string; name: string }; t1: { label: string; name: string }; t2?: { label: string; name: string } } {
  if (type === "BJT" || type === "BC547" || type === "BC557") {
    return {
      t0: { label: "C", name: "Collector (C)" },
      t1: { label: "E", name: "Emitter (E)" },
      t2: { label: "B", name: "Base (B)" },
    };
  }
  if (type === "MOS") {
    return {
      t0: { label: "D", name: "Drain (D)" },
      t1: { label: "S", name: "Source (S)" },
      t2: { label: "G", name: "Gate (G)" },
    };
  }
  if (type === "JFET") {
    return {
      t0: { label: "D", name: "Drain (D)" },
      t1: { label: "S", name: "Source (S)" },
      t2: { label: "G", name: "Gate (G)" },
    };
  }
  if (type === "SCR") {
    return {
      t0: { label: "A", name: "Anode (A)" },
      t1: { label: "K", name: "Cathode (K)" },
      t2: { label: "G", name: "Gate (G)" },
    };
  }
  if (type === "TRIAC") {
    return {
      t0: { label: "MT2", name: "Main Terminal 2 (MT2)" },
      t1: { label: "MT1", name: "Main Terminal 1 (MT1)" },
      t2: { label: "G", name: "Gate (G)" },
    };
  }
  if (type === "POT") {
    return {
      t0: { label: "1", name: "Terminal 1" },
      t1: { label: "2", name: "Terminal 2" },
      t2: { label: "W", name: "Wiper (W)" },
    };
  }
  if (type === "GND") {
    return {
      t0: { label: "GND", name: "Earth Ground (0V)" },
      t1: { label: "", name: "" },
    };
  }
  if (type === "FG") {
    return {
      t0: { label: "+", name: "Function Gen Phase / Live (+)" },
      t1: { label: "⏚", name: "Function Gen Ground / Return (-)" },
    };
  }
  return {
    t0: { label: "+", name: "Terminal 1 (+)" },
    t1: { label: "-", name: "Terminal 2 (-)" },
  };
}

export const DEFAULT_TRANSISTOR_CONFIGS: Record<string, TransistorConfig> = {
  BJT: {
    family: "BJT",
    polarity: "NPN",
    modelName: "2N2222A",
    beta: 200,
    vbe_on: 0.7,
    vce_sat: 0.2,
    va: 100,
    vth: 2.5,
    rds_on: 0.05,
    kn: 50,
    vP: -4.0,
    idss_mA: 15,
    vgt: 0.75,
    igt_mA: 5,
    vHold: 0.85,
  },
  BC547: {
    family: "BJT",
    polarity: "NPN",
    modelName: "BC547B",
    beta: 250,
    vbe_on: 0.7,
    vce_sat: 0.2,
    va: 120,
    vth: 2.5,
    rds_on: 0.05,
    kn: 50,
    vP: -4.0,
    idss_mA: 15,
    vgt: 0.75,
    igt_mA: 5,
    vHold: 0.85,
  },
  BC557: {
    family: "BJT",
    polarity: "PNP",
    modelName: "BC557B",
    beta: 250,
    vbe_on: 0.7,
    vce_sat: 0.2,
    va: 120,
    vth: -2.5,
    rds_on: 0.05,
    kn: 50,
    vP: -4.0,
    idss_mA: 15,
    vgt: 0.75,
    igt_mA: 5,
    vHold: 0.85,
  },
  MOS: {
    family: "MOSFET",
    polarity: "NMOS",
    modelName: "IRF540N",
    beta: 250,
    vbe_on: 0.7,
    vce_sat: 0.2,
    va: 100,
    vth: 3.0,
    rds_on: 0.044,
    kn: 40,
    vP: -4.0,
    idss_mA: 15,
    vgt: 0.75,
    igt_mA: 5,
    vHold: 0.85,
  },
  JFET: {
    family: "JFET",
    polarity: "NJFET",
    modelName: "BF245B",
    beta: 250,
    vbe_on: 0.7,
    vce_sat: 0.2,
    va: 100,
    vth: 2.5,
    rds_on: 0.05,
    kn: 50,
    vP: -4.0,
    idss_mA: 15,
    vgt: 0.75,
    igt_mA: 5,
    vHold: 0.85,
  },
  SCR: {
    family: "SCR",
    polarity: "SCR",
    modelName: "TYN612",
    beta: 250,
    vbe_on: 0.7,
    vce_sat: 0.2,
    va: 100,
    vth: 2.5,
    rds_on: 0.05,
    kn: 50,
    vP: -4.0,
    idss_mA: 15,
    vgt: 0.75,
    igt_mA: 5,
    vHold: 0.85,
  },
};

export const TRANSISTOR_PRESETS: {
  category: TransistorFamily;
  polarity: TransistorPolarity;
  name: string;
  code: string;
  desc: string;
  config: TransistorConfig;
}[] = [
  // --- BJT NPN ---
  {
    category: "BJT",
    polarity: "NPN",
    name: "2N2222A",
    code: "BJT",
    desc: "General Purpose NPN High-Speed Switching & Amplifier (800mA, 40V)",
    config: {
      family: "BJT",
      polarity: "NPN",
      modelName: "2N2222A",
      beta: 200,
      vbe_on: 0.7,
      vce_sat: 0.2,
      va: 100,
      vth: 2.5,
      rds_on: 0.05,
      kn: 50,
      vP: -4.0,
      idss_mA: 15,
      vgt: 0.75,
      igt_mA: 5,
      vHold: 0.85,
    },
  },
  {
    category: "BJT",
    polarity: "NPN",
    name: "BC547B",
    code: "BC547",
    desc: "Low-Noise Audio / Small-Signal NPN BJT (hFE ≈ 250, 100mA, 45V)",
    config: {
      family: "BJT",
      polarity: "NPN",
      modelName: "BC547B",
      beta: 250,
      vbe_on: 0.7,
      vce_sat: 0.2,
      va: 120,
      vth: 2.5,
      rds_on: 0.05,
      kn: 50,
      vP: -4.0,
      idss_mA: 15,
      vgt: 0.75,
      igt_mA: 5,
      vHold: 0.85,
    },
  },
  {
    category: "BJT",
    polarity: "NPN",
    name: "2N3904",
    code: "BJT",
    desc: "Standard Fast Switching NPN Transistor (200mA, 40V, fT = 300MHz)",
    config: {
      family: "BJT",
      polarity: "NPN",
      modelName: "2N3904",
      beta: 150,
      vbe_on: 0.65,
      vce_sat: 0.18,
      va: 75,
      vth: 2.5,
      rds_on: 0.05,
      kn: 50,
      vP: -4.0,
      idss_mA: 15,
      vgt: 0.75,
      igt_mA: 5,
      vHold: 0.85,
    },
  },
  {
    category: "BJT",
    polarity: "NPN",
    name: "TIP31C",
    code: "BJT",
    desc: "Medium Power NPN Silicon Transistor (3A, 100V, 40W Audio/Motor)",
    config: {
      family: "BJT",
      polarity: "NPN",
      modelName: "TIP31C",
      beta: 50,
      vbe_on: 0.75,
      vce_sat: 0.25,
      va: 150,
      vth: 2.5,
      rds_on: 0.05,
      kn: 50,
      vP: -4.0,
      idss_mA: 15,
      vgt: 0.75,
      igt_mA: 5,
      vHold: 0.85,
    },
  },

  // --- BJT PNP ---
  {
    category: "BJT",
    polarity: "PNP",
    name: "BC557B",
    code: "BC557",
    desc: "Complementary Audio PNP Transistor to BC547 (hFE ≈ 250, -45V)",
    config: {
      family: "BJT",
      polarity: "PNP",
      modelName: "BC557B",
      beta: 250,
      vbe_on: 0.7,
      vce_sat: 0.2,
      va: 120,
      vth: -2.5,
      rds_on: 0.05,
      kn: 50,
      vP: -4.0,
      idss_mA: 15,
      vgt: 0.75,
      igt_mA: 5,
      vHold: 0.85,
    },
  },
  {
    category: "BJT",
    polarity: "PNP",
    name: "2N3906",
    code: "BC557",
    desc: "General Purpose Switching PNP Complement to 2N3904 (-200mA, -40V)",
    config: {
      family: "BJT",
      polarity: "PNP",
      modelName: "2N3906",
      beta: 150,
      vbe_on: 0.65,
      vce_sat: 0.18,
      va: 75,
      vth: -2.5,
      rds_on: 0.05,
      kn: 50,
      vP: -4.0,
      idss_mA: 15,
      vgt: 0.75,
      igt_mA: 5,
      vHold: 0.85,
    },
  },
  {
    category: "BJT",
    polarity: "PNP",
    name: "TIP32C",
    code: "BC557",
    desc: "Medium Power PNP Complement to TIP31C (-3A, -100V, 40W)",
    config: {
      family: "BJT",
      polarity: "PNP",
      modelName: "TIP32C",
      beta: 50,
      vbe_on: 0.75,
      vce_sat: 0.25,
      va: 150,
      vth: -2.5,
      rds_on: 0.05,
      kn: 50,
      vP: -4.0,
      idss_mA: 15,
      vgt: 0.75,
      igt_mA: 5,
      vHold: 0.85,
    },
  },

  // --- MOSFET NMOS ---
  {
    category: "MOSFET",
    polarity: "NMOS",
    name: "IRF540N",
    code: "MOS",
    desc: "High-Current Power N-MOSFET (100V, 33A, RDS(on) = 44 mΩ)",
    config: {
      family: "MOSFET",
      polarity: "NMOS",
      modelName: "IRF540N",
      beta: 250,
      vbe_on: 0.7,
      vce_sat: 0.2,
      va: 100,
      vth: 3.0,
      rds_on: 0.044,
      kn: 40,
      vP: -4.0,
      idss_mA: 15,
      vgt: 0.75,
      igt_mA: 5,
      vHold: 0.85,
    },
  },
  {
    category: "MOSFET",
    polarity: "NMOS",
    name: "2N7000",
    code: "MOS",
    desc: "Small-Signal N-Channel MOSFET (60V, 200mA, RDS(on) = 1.2 Ω, Vth = 2.1V)",
    config: {
      family: "MOSFET",
      polarity: "NMOS",
      modelName: "2N7000",
      beta: 250,
      vbe_on: 0.7,
      vce_sat: 0.2,
      va: 100,
      vth: 2.1,
      rds_on: 1.2,
      kn: 20,
      vP: -4.0,
      idss_mA: 15,
      vgt: 0.75,
      igt_mA: 5,
      vHold: 0.85,
    },
  },
  {
    category: "MOSFET",
    polarity: "NMOS",
    name: "AO3400A",
    code: "MOS",
    desc: "Ultra-Low Vth Logic-Level N-MOSFET (30V, 5.7A, Vth = 1.2V, RDS = 28 mΩ)",
    config: {
      family: "MOSFET",
      polarity: "NMOS",
      modelName: "AO3400A",
      beta: 250,
      vbe_on: 0.7,
      vce_sat: 0.2,
      va: 100,
      vth: 1.2,
      rds_on: 0.028,
      kn: 80,
      vP: -4.0,
      idss_mA: 15,
      vgt: 0.75,
      igt_mA: 5,
      vHold: 0.85,
    },
  },

  // --- MOSFET PMOS ---
  {
    category: "MOSFET",
    polarity: "PMOS",
    name: "IRF9540",
    code: "MOS",
    desc: "Power P-Channel MOSFET (-100V, -23A, RDS(on) = 0.11 Ω, Vth = -3.0V)",
    config: {
      family: "MOSFET",
      polarity: "PMOS",
      modelName: "IRF9540",
      beta: 250,
      vbe_on: 0.7,
      vce_sat: 0.2,
      va: 100,
      vth: -3.0,
      rds_on: 0.11,
      kn: 30,
      vP: 4.0,
      idss_mA: 15,
      vgt: 0.75,
      igt_mA: 5,
      vHold: 0.85,
    },
  },
  {
    category: "MOSFET",
    polarity: "PMOS",
    name: "BS250",
    code: "MOS",
    desc: "Small-Signal P-Channel MOSFET (-45V, -180mA, Vth = -2.0V)",
    config: {
      family: "MOSFET",
      polarity: "PMOS",
      modelName: "BS250",
      beta: 250,
      vbe_on: 0.7,
      vce_sat: 0.2,
      va: 100,
      vth: -2.0,
      rds_on: 12.0,
      kn: 15,
      vP: 4.0,
      idss_mA: 15,
      vgt: 0.75,
      igt_mA: 5,
      vHold: 0.85,
    },
  },

  // --- JFET ---
  {
    category: "JFET",
    polarity: "NJFET",
    name: "BF245B",
    code: "JFET",
    desc: "N-Channel RF/VHF JFET (IDSS = 15mA, Pinch-Off VP = -4.0V)",
    config: {
      family: "JFET",
      polarity: "NJFET",
      modelName: "BF245B",
      beta: 250,
      vbe_on: 0.7,
      vce_sat: 0.2,
      va: 100,
      vth: 2.5,
      rds_on: 0.05,
      kn: 50,
      vP: -4.0,
      idss_mA: 15,
      vgt: 0.75,
      igt_mA: 5,
      vHold: 0.85,
    },
  },
  {
    category: "JFET",
    polarity: "NJFET",
    name: "2N3819",
    code: "JFET",
    desc: "General Purpose Audio/RF N-JFET (IDSS = 10mA, VP = -3.0V)",
    config: {
      family: "JFET",
      polarity: "NJFET",
      modelName: "2N3819",
      beta: 250,
      vbe_on: 0.7,
      vce_sat: 0.2,
      va: 100,
      vth: 2.5,
      rds_on: 0.05,
      kn: 50,
      vP: -3.0,
      idss_mA: 10,
      vgt: 0.75,
      igt_mA: 5,
      vHold: 0.85,
    },
  },
  {
    category: "JFET",
    polarity: "PJFET",
    name: "2N5460",
    code: "JFET",
    desc: "P-Channel General Purpose Audio/Switch JFET (IDSS = 4mA, Pinch-Off VP = +3.0V)",
    config: {
      family: "JFET",
      polarity: "PJFET",
      modelName: "2N5460",
      beta: 250,
      vbe_on: 0.7,
      vce_sat: 0.2,
      va: 100,
      vth: -2.5,
      rds_on: 0.05,
      kn: 50,
      vP: 3.0,
      idss_mA: 4,
      vgt: 0.75,
      igt_mA: 5,
      vHold: 0.85,
    },
  },

  // --- SCR ---
  {
    category: "SCR",
    polarity: "SCR",
    name: "TYN612",
    code: "SCR",
    desc: "Sensitive Gate Silicon Controlled Rectifier (600V, 12A, IGT = 5mA)",
    config: {
      family: "SCR",
      polarity: "SCR",
      modelName: "TYN612",
      beta: 250,
      vbe_on: 0.7,
      vce_sat: 0.2,
      va: 100,
      vth: 2.5,
      rds_on: 0.05,
      kn: 50,
      vP: -4.0,
      idss_mA: 15,
      vgt: 0.75,
      igt_mA: 5,
      vHold: 0.85,
    },
  },
  {
    category: "SCR",
    polarity: "SCR",
    name: "2N5060",
    code: "SCR",
    desc: "Low-Current Precision SCR (100V, 0.8A, IGT = 0.2mA Gate Sensitivity)",
    config: {
      family: "SCR",
      polarity: "SCR",
      modelName: "2N5060",
      beta: 250,
      vbe_on: 0.7,
      vce_sat: 0.2,
      va: 100,
      vth: 2.5,
      rds_on: 0.05,
      kn: 50,
      vP: -4.0,
      idss_mA: 15,
      vgt: 0.8,
      igt_mA: 0.2,
      vHold: 0.8,
    },
  },
];

interface TransistorConfigModalProps {
  isOpen: boolean;
  node: AnalogNode | null;
  onClose: () => void;
  onSave: (updated: {
    label: string;
    type: AnalogCompType;
    value: number;
    transistorConfig: TransistorConfig;
  }) => void;
}

export default function TransistorConfigModal({
  isOpen,
  node,
  onClose,
  onSave,
}: TransistorConfigModalProps) {
  const [selectedFamily, setSelectedFamily] = useState<TransistorFamily>("BJT");
  const [selectedPolarity, setSelectedPolarity] = useState<TransistorPolarity>("NPN");
  const [modelName, setModelName] = useState<string>("BC547B");
  const [nodeLabel, setNodeLabel] = useState<string>("");

  // BJT parameters
  const [beta, setBeta] = useState<number>(250);
  const [vbeOn, setVbeOn] = useState<number>(0.7);
  const [vceSat, setVceSat] = useState<number>(0.2);
  const [va, setVa] = useState<number>(100);

  // MOSFET parameters
  const [vth, setVth] = useState<number>(2.5);
  const [rdsOn, setRdsOn] = useState<number>(0.044);
  const [kn, setKn] = useState<number>(40);

  // JFET parameters
  const [vP, setVP] = useState<number>(-4.0);
  const [idssMa, setIdssMa] = useState<number>(15);

  // SCR parameters
  const [vgt, setVgt] = useState<number>(0.75);
  const [igtMa, setIgtMa] = useState<number>(5);
  const [vHold, setVHold] = useState<number>(0.85);

  // Load from node when modal opens
  useEffect(() => {
    if (!node) return;
    setNodeLabel(node.label);

    if (node.transistorConfig) {
      const cfg = node.transistorConfig;
      setSelectedFamily(cfg.family);
      setSelectedPolarity(cfg.polarity);
      setModelName(cfg.modelName);
      setBeta(cfg.beta);
      setVbeOn(cfg.vbe_on);
      setVceSat(cfg.vce_sat);
      setVa(cfg.va);
      setVth(cfg.vth);
      setRdsOn(cfg.rds_on);
      setKn(cfg.kn);
      setVP(cfg.vP);
      setIdssMa(cfg.idss_mA);
      setVgt(cfg.vgt);
      setIgtMa(cfg.igt_mA);
      setVHold(cfg.vHold);
    } else {
      // Infer based on node.type
      if (node.type === "BC557") {
        setSelectedFamily("BJT");
        setSelectedPolarity("PNP");
        setModelName("BC557B");
        setBeta(250);
        setVbeOn(0.7);
      } else if (node.type === "BC547" || node.type === "BJT") {
        setSelectedFamily("BJT");
        setSelectedPolarity("NPN");
        setModelName(node.type === "BC547" ? "BC547B" : "2N2222A");
        setBeta(node.value || 250);
        setVbeOn(0.7);
      } else if (node.type === "MOS") {
        setSelectedFamily("MOSFET");
        setSelectedPolarity("NMOS");
        setModelName("IRF540N");
        setVth(3.0);
        setRdsOn(0.044);
        setKn(40);
      } else if (node.type === "JFET") {
        setSelectedFamily("JFET");
        setSelectedPolarity("NJFET");
        setModelName("BF245B");
        setVP(-4.0);
        setIdssMa(15);
      } else if (node.type === "SCR") {
        setSelectedFamily("SCR");
        setSelectedPolarity("SCR");
        setModelName("TYN612");
        setVgt(0.75);
        setIgtMa(5);
        setVHold(0.85);
      }
    }
  }, [node, isOpen]);

  if (!isOpen || !node) return null;

  const handleApplyPreset = (preset: (typeof TRANSISTOR_PRESETS)[0]) => {
    setSelectedFamily(preset.category);
    setSelectedPolarity(preset.polarity);
    setModelName(preset.config.modelName);
    setBeta(preset.config.beta);
    setVbeOn(preset.config.vbe_on);
    setVceSat(preset.config.vce_sat);
    setVa(preset.config.va);
    setVth(preset.config.vth);
    setRdsOn(preset.config.rds_on);
    setKn(preset.config.kn);
    setVP(preset.config.vP);
    setIdssMa(preset.config.idss_mA);
    setVgt(preset.config.vgt);
    setIgtMa(preset.config.igt_mA);
    setVHold(preset.config.vHold);
  };

  const applyFamilyAndPolarity = (fam: TransistorFamily, pol: TransistorPolarity) => {
    const preset = TRANSISTOR_PRESETS.find(
      (p) => p.category === fam && (p.polarity === pol || fam === "SCR")
    );
    if (preset) {
      handleApplyPreset(preset);
    } else {
      setSelectedFamily(fam);
      setSelectedPolarity(pol);
    }
  };

  const handleSave = () => {
    let compType: AnalogCompType = "BJT";
    let compVal = beta;

    if (selectedFamily === "BJT") {
      compType = selectedPolarity === "PNP" ? "BC557" : "BC547";
      compVal = beta;
    } else if (selectedFamily === "MOSFET") {
      compType = "MOS";
      compVal = vth;
    } else if (selectedFamily === "JFET") {
      compType = "JFET";
      compVal = idssMa;
    } else if (selectedFamily === "SCR") {
      compType = "SCR";
      compVal = 1;
    }

    const newConfig: TransistorConfig = {
      family: selectedFamily,
      polarity: selectedPolarity,
      modelName,
      beta,
      vbe_on: vbeOn,
      vce_sat: vceSat,
      va,
      vth,
      rds_on: rdsOn,
      kn,
      vP,
      idss_mA: idssMa,
      vgt,
      igt_mA: igtMa,
      vHold,
    };

    onSave({
      label: nodeLabel.trim() || node.label,
      type: compType,
      value: compVal,
      transistorConfig: newConfig,
    });
    onClose();
  };

  // Terminals descriptor based on active family
  const terminals =
    selectedFamily === "BJT"
      ? {
          t0: { name: "Collector (C)", pin: "Pin 0 (Top)", role: "Power / Load positive rail" },
          t1: { name: "Emitter (E)", pin: "Pin 1 (Bottom)", role: "Ground / degeneration rail" },
          t2: { name: "Base (B)", pin: "Pin 2 (Left)", role: "Control input (Base current drive)" },
        }
      : selectedFamily === "MOSFET"
      ? {
          t0: { name: "Drain (D)", pin: "Pin 0 (Top)", role: "Power / Load positive rail" },
          t1: { name: "Source (S)", pin: "Pin 1 (Bottom)", role: "Ground / Source return rail" },
          t2: { name: "Gate (G)", pin: "Pin 2 (Left)", role: "Voltage control gate (Insulated)" },
        }
      : selectedFamily === "JFET"
      ? {
          t0: { name: "Drain (D)", pin: "Pin 0 (Top)", role: "Positive drain supply" },
          t1: { name: "Source (S)", pin: "Pin 1 (Bottom)", role: "Source reference rail" },
          t2: { name: "Gate (G)", pin: "Pin 2 (Left)", role: "Reverse-biased control junction" },
        }
      : {
          t0: { name: "Anode (A)", pin: "Pin 0 (Top)", role: "Positive anode current entry" },
          t1: { name: "Cathode (K)", pin: "Pin 1 (Bottom)", role: "Negative cathode exit" },
          t2: { name: "Gate (G)", pin: "Pin 2 (Left)", role: "Trigger pulse injection pin" },
        };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-[#0d1424] border border-cyan-500/40 rounded-2xl shadow-2xl shadow-cyan-950/60 overflow-hidden text-[#e6edf8]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-[#0d1933] via-[#0f172a] to-[#0d1933] border-b border-cyan-900/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Cpu className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold font-display text-white tracking-wide">
                  Transistor & Semiconductor Device Configuration
                </h2>
                <span className="px-2 py-0.5 text-xs font-mono font-bold rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  3-TERMINAL MODEL
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Physical SPICE parameters · Collector/Base/Emitter · Drain/Gate/Source
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/80 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Top Selection Bar: Family & Polarity */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Family Selector */}
            <div className="bg-[#111c35] p-3.5 rounded-xl border border-slate-700/60">
              <label className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold block mb-2">
                Device Family
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {(["BJT", "MOSFET", "JFET", "SCR"] as TransistorFamily[]).map((fam) => (
                  <button
                    key={fam}
                    type="button"
                    onClick={() => {
                      const defaultPol: TransistorPolarity =
                        fam === "BJT"
                          ? "NPN"
                          : fam === "MOSFET"
                          ? "NMOS"
                          : fam === "JFET"
                          ? "NJFET"
                          : "SCR";
                      applyFamilyAndPolarity(fam, defaultPol);
                    }}
                    className={`py-2 px-1 text-xs font-mono font-bold rounded-lg border transition-all text-center cursor-pointer ${
                      selectedFamily === fam
                        ? "bg-cyan-500/20 border-cyan-400 text-cyan-200 shadow-sm shadow-cyan-500/20"
                        : "bg-[#0c1426] border-slate-700/80 text-slate-400 hover:border-slate-600 hover:text-slate-200"
                    }`}
                  >
                    {fam}
                  </button>
                ))}
              </div>
            </div>

            {/* Polarity / Channel Selector */}
            <div className="bg-[#111c35] p-3.5 rounded-xl border border-slate-700/60">
              <label className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold block mb-2">
                Polarity & Channel Type
              </label>
              <div className="flex gap-2">
                {selectedFamily === "BJT" && (
                  <>
                    <button
                      type="button"
                      onClick={() => applyFamilyAndPolarity("BJT", "NPN")}
                      className={`flex-1 py-2 text-xs font-mono font-bold rounded-lg border transition-all cursor-pointer ${
                        selectedPolarity === "NPN"
                          ? "bg-emerald-500/20 border-emerald-400 text-emerald-300"
                          : "bg-[#0c1426] border-slate-700/80 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      NPN (Arrow pointing OUT)
                    </button>
                    <button
                      type="button"
                      onClick={() => applyFamilyAndPolarity("BJT", "PNP")}
                      className={`flex-1 py-2 text-xs font-mono font-bold rounded-lg border transition-all cursor-pointer ${
                        selectedPolarity === "PNP"
                          ? "bg-amber-500/20 border-amber-400 text-amber-300"
                          : "bg-[#0c1426] border-slate-700/80 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      PNP (Arrow pointing IN)
                    </button>
                  </>
                )}

                {selectedFamily === "MOSFET" && (
                  <>
                    <button
                      type="button"
                      onClick={() => applyFamilyAndPolarity("MOSFET", "NMOS")}
                      className={`flex-1 py-2 text-xs font-mono font-bold rounded-lg border transition-all cursor-pointer ${
                        selectedPolarity === "NMOS"
                          ? "bg-emerald-500/20 border-emerald-400 text-emerald-300"
                          : "bg-[#0c1426] border-slate-700/80 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      N-Channel (Vth &gt; 0, +Gate ON)
                    </button>
                    <button
                      type="button"
                      onClick={() => applyFamilyAndPolarity("MOSFET", "PMOS")}
                      className={`flex-1 py-2 text-xs font-mono font-bold rounded-lg border transition-all cursor-pointer ${
                        selectedPolarity === "PMOS"
                          ? "bg-amber-500/20 border-amber-400 text-amber-300"
                          : "bg-[#0c1426] border-slate-700/80 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      P-Channel (Vth &lt; 0, -Gate ON)
                    </button>
                  </>
                )}

                {selectedFamily === "JFET" && (
                  <>
                    <button
                      type="button"
                      onClick={() => applyFamilyAndPolarity("JFET", "NJFET")}
                      className={`flex-1 py-2 text-xs font-mono font-bold rounded-lg border transition-all cursor-pointer ${
                        selectedPolarity === "NJFET"
                          ? "bg-emerald-500/20 border-emerald-400 text-emerald-300"
                          : "bg-[#0c1426] border-slate-700/80 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      N-Channel JFET (VP &lt; 0)
                    </button>
                    <button
                      type="button"
                      onClick={() => applyFamilyAndPolarity("JFET", "PJFET")}
                      className={`flex-1 py-2 text-xs font-mono font-bold rounded-lg border transition-all cursor-pointer ${
                        selectedPolarity === "PJFET"
                          ? "bg-amber-500/20 border-amber-400 text-amber-300"
                          : "bg-[#0c1426] border-slate-700/80 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      P-Channel JFET (VP &gt; 0)
                    </button>
                  </>
                )}

                {selectedFamily === "SCR" && (
                  <div className="flex-1 flex items-center justify-center py-2 text-xs font-mono text-cyan-400 bg-cyan-950/40 rounded-lg border border-cyan-800/40">
                    Thyristor / Silicon Controlled Rectifier (Anode, Cathode, Gate)
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick-Pick Industry Presets */}
          <div className="bg-[#111c35] p-3.5 rounded-xl border border-slate-700/60">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold">
                Industry-Standard Component Presets
              </span>
              <span className="text-[11px] text-cyan-400/80 font-mono">
                Click any part to load verified physical datasheet values
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {TRANSISTOR_PRESETS.filter(
                (p) =>
                  p.category === selectedFamily &&
                  (p.polarity === selectedPolarity || selectedFamily === "SCR")
              ).map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => handleApplyPreset(preset)}
                  className={`p-2.5 rounded-lg border text-left transition-all group cursor-pointer ${
                    modelName === preset.name
                      ? "bg-cyan-500/20 border-cyan-400 shadow-sm shadow-cyan-500/20"
                      : "bg-[#0c1426] border-slate-700 hover:border-cyan-500/50 hover:bg-[#101b33]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs text-white group-hover:text-cyan-300">
                      {preset.name}
                    </span>
                    <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-1 rounded">
                      {preset.polarity}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 line-clamp-1">
                    {preset.desc}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Dual Column: Left = Parameters & Right = Visual Schematic & Pinout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Parameter Sliders & Numeric Inputs (7 cols) */}
            <div className="lg:col-span-7 bg-[#111c35] p-4 rounded-xl border border-slate-700/60 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-700/60 pb-2">
                <span className="text-xs font-mono uppercase tracking-wider text-cyan-300 font-bold flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-cyan-400" />
                  Physical Device Parameters
                </span>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-mono text-slate-400">Label:</label>
                  <input
                    type="text"
                    value={nodeLabel}
                    onChange={(e) => setNodeLabel(e.target.value)}
                    className="w-24 px-2 py-0.5 bg-[#090f1d] border border-slate-700 rounded text-xs font-mono text-white text-center"
                  />
                </div>
              </div>

              {/* BJT Controls */}
              {selectedFamily === "BJT" && (
                <div className="space-y-4">
                  {/* Beta (hFE) */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-slate-300 font-bold">
                        Forward Current Gain β (h_FE):
                      </span>
                      <span className="text-cyan-400 font-bold">{beta}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="20"
                        max="600"
                        step="5"
                        value={beta}
                        onChange={(e) => setBeta(Number(e.target.value))}
                        className="flex-1 accent-cyan-400"
                      />
                      <input
                        type="number"
                        min="10"
                        max="1000"
                        value={beta}
                        onChange={(e) => setBeta(Math.max(1, Number(e.target.value)))}
                        className="w-16 px-2 py-1 bg-[#090f1d] border border-slate-700 rounded text-xs font-mono text-right text-white"
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 font-mono">
                      Controls collector amplification: I_C = β · I_B
                    </p>
                  </div>

                  {/* V_BE(on) */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-slate-300 font-bold">
                        Base-Emitter Turn-On Drop V_BE(on):
                      </span>
                      <span className="text-cyan-400 font-bold">{vbeOn.toFixed(2)} V</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="0.55"
                        max="0.85"
                        step="0.01"
                        value={vbeOn}
                        onChange={(e) => setVbeOn(Number(e.target.value))}
                        className="flex-1 accent-cyan-400"
                      />
                      <input
                        type="number"
                        step="0.01"
                        value={vbeOn}
                        onChange={(e) => setVbeOn(Number(e.target.value))}
                        className="w-16 px-2 py-1 bg-[#090f1d] border border-slate-700 rounded text-xs font-mono text-right text-white"
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 font-mono">
                      Forward junction threshold (typical 0.70V for Silicon, 0.3V for Ge)
                    </p>
                  </div>

                  {/* V_CE(sat) */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-slate-300 font-bold">
                        Saturation Knee Voltage V_CE(sat):
                      </span>
                      <span className="text-cyan-400 font-bold">{vceSat.toFixed(2)} V</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="0.05"
                        max="0.45"
                        step="0.01"
                        value={vceSat}
                        onChange={(e) => setVceSat(Number(e.target.value))}
                        className="flex-1 accent-cyan-400"
                      />
                      <input
                        type="number"
                        step="0.01"
                        value={vceSat}
                        onChange={(e) => setVceSat(Number(e.target.value))}
                        className="w-16 px-2 py-1 bg-[#090f1d] border border-slate-700 rounded text-xs font-mono text-right text-white"
                      />
                    </div>
                  </div>

                  {/* Early Voltage V_A */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-slate-300 font-bold">Early Voltage V_A:</span>
                      <span className="text-cyan-400 font-bold">{va} V</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="30"
                        max="300"
                        step="5"
                        value={va}
                        onChange={(e) => setVa(Number(e.target.value))}
                        className="flex-1 accent-cyan-400"
                      />
                      <input
                        type="number"
                        value={va}
                        onChange={(e) => setVa(Number(e.target.value))}
                        className="w-16 px-2 py-1 bg-[#090f1d] border border-slate-700 rounded text-xs font-mono text-right text-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* MOSFET Controls */}
              {selectedFamily === "MOSFET" && (
                <div className="space-y-4">
                  {/* Threshold Voltage V_th */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-slate-300 font-bold">
                        Threshold Voltage V_th (V_GS(th)):
                      </span>
                      <span className="text-cyan-400 font-bold">{vth.toFixed(2)} V</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min={selectedPolarity === "NMOS" ? "0.8" : "-5.0"}
                        max={selectedPolarity === "NMOS" ? "5.0" : "-0.8"}
                        step="0.1"
                        value={vth}
                        onChange={(e) => setVth(Number(e.target.value))}
                        className="flex-1 accent-cyan-400"
                      />
                      <input
                        type="number"
                        step="0.1"
                        value={vth}
                        onChange={(e) => setVth(Number(e.target.value))}
                        className="w-16 px-2 py-1 bg-[#090f1d] border border-slate-700 rounded text-xs font-mono text-right text-white"
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 font-mono">
                      Gate-Source voltage required to form the conductive inversion channel
                    </p>
                  </div>

                  {/* On-Resistance RDS(on) */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-slate-300 font-bold">
                        Drain-Source On-Resistance R_DS(on):
                      </span>
                      <span className="text-cyan-400 font-bold">
                        {rdsOn < 1 ? `${(rdsOn * 1000).toFixed(0)} mΩ` : `${rdsOn.toFixed(2)} Ω`}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="0.01"
                        max="2.5"
                        step="0.01"
                        value={rdsOn}
                        onChange={(e) => setRdsOn(Number(e.target.value))}
                        className="flex-1 accent-cyan-400"
                      />
                      <input
                        type="number"
                        step="0.01"
                        value={rdsOn}
                        onChange={(e) => setRdsOn(Number(e.target.value))}
                        className="w-16 px-2 py-1 bg-[#090f1d] border border-slate-700 rounded text-xs font-mono text-right text-white"
                      />
                    </div>
                  </div>

                  {/* Transconductance Kn */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-slate-300 font-bold">
                        Transconductance Parameter K_n:
                      </span>
                      <span className="text-cyan-400 font-bold">{kn} mA/V²</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="5"
                        max="120"
                        step="1"
                        value={kn}
                        onChange={(e) => setKn(Number(e.target.value))}
                        className="flex-1 accent-cyan-400"
                      />
                      <input
                        type="number"
                        value={kn}
                        onChange={(e) => setKn(Number(e.target.value))}
                        className="w-16 px-2 py-1 bg-[#090f1d] border border-slate-700 rounded text-xs font-mono text-right text-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* JFET Controls */}
              {selectedFamily === "JFET" && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-slate-300 font-bold">Pinch-Off Voltage V_P:</span>
                      <span className="text-cyan-400 font-bold">{vP.toFixed(1)} V</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min={selectedPolarity === "PJFET" ? "1.0" : "-7.0"}
                        max={selectedPolarity === "PJFET" ? "7.0" : "-1.0"}
                        step="0.2"
                        value={vP}
                        onChange={(e) => setVP(Number(e.target.value))}
                        className="flex-1 accent-cyan-400 cursor-pointer"
                      />
                      <input
                        type="number"
                        step="0.1"
                        value={vP}
                        onChange={(e) => setVP(Number(e.target.value))}
                        className="w-16 px-2 py-1 bg-[#090f1d] border border-slate-700 rounded text-xs font-mono text-right text-white"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-slate-300 font-bold">
                        Saturation Current I_DSS:
                      </span>
                      <span className="text-cyan-400 font-bold">{idssMa} mA</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="2"
                        max="40"
                        step="1"
                        value={idssMa}
                        onChange={(e) => setIdssMa(Number(e.target.value))}
                        className="flex-1 accent-cyan-400 cursor-pointer"
                      />
                      <input
                        type="number"
                        value={idssMa}
                        onChange={(e) => setIdssMa(Number(e.target.value))}
                        className="w-16 px-2 py-1 bg-[#090f1d] border border-slate-700 rounded text-xs font-mono text-right text-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* SCR Controls */}
              {selectedFamily === "SCR" && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-slate-300 font-bold">Gate Trigger Voltage V_GT:</span>
                      <span className="text-cyan-400 font-bold">{vgt.toFixed(2)} V</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="0.5"
                        max="1.5"
                        step="0.05"
                        value={vgt}
                        onChange={(e) => setVgt(Number(e.target.value))}
                        className="flex-1 accent-cyan-400"
                      />
                      <input
                        type="number"
                        step="0.05"
                        value={vgt}
                        onChange={(e) => setVgt(Number(e.target.value))}
                        className="w-16 px-2 py-1 bg-[#090f1d] border border-slate-700 rounded text-xs font-mono text-right text-white"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-slate-300 font-bold">Gate Trigger Current I_GT:</span>
                      <span className="text-cyan-400 font-bold">{igtMa} mA</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="0.2"
                        max="25"
                        step="0.2"
                        value={igtMa}
                        onChange={(e) => setIgtMa(Number(e.target.value))}
                        className="flex-1 accent-cyan-400"
                      />
                      <input
                        type="number"
                        step="0.1"
                        value={igtMa}
                        onChange={(e) => setIgtMa(Number(e.target.value))}
                        className="w-16 px-2 py-1 bg-[#090f1d] border border-slate-700 rounded text-xs font-mono text-right text-white"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right: Live Schematic Preview & 3-Terminal Pinout (5 cols) */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              {/* Interactive SVG Pinout Card */}
              <div className="bg-[#111c35] p-4 rounded-xl border border-slate-700/60 flex flex-col items-center">
                <span className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold self-start mb-2">
                  3-Pin Schematic Symbol Preview
                </span>

                <div className="w-full flex items-center justify-center p-3 bg-[#0a1120] rounded-xl border border-slate-800">
                  <svg width="220" height="180" viewBox="0 0 220 180" className="overflow-visible">
                    {/* Grid backing */}
                    <defs>
                      <pattern id="modalGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" strokeWidth="0.8" />
                      </pattern>
                    </defs>
                    <rect width="220" height="180" fill="url(#modalGrid)" rx="8" />

                    {/* Transistor Center is (110, 90) */}
                    {/* Leads */}
                    {/* Top Lead: Pin 0 */}
                    <line x1="110" y1="25" x2="110" y2="60" stroke="#38bdf8" strokeWidth="2.5" />
                    {/* Bottom Lead: Pin 1 */}
                    <line x1="110" y1="120" x2="110" y2="155" stroke="#38bdf8" strokeWidth="2.5" />
                    {/* Left Lead: Pin 2 */}
                    <line x1="45" y1="90" x2="88" y2="90" stroke="#38bdf8" strokeWidth="2.5" />

                    {/* Component Symbol Shape */}
                    {selectedFamily === "BJT" && (
                      <g>
                        {/* Enclosing circle */}
                        <circle cx="110" cy="90" r="30" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.8" />
                        {/* Base bar */}
                        <line x1="90" y1="72" x2="90" y2="108" stroke="#f8fafc" strokeWidth="3" />
                        {/* Collector branch */}
                        <line x1="90" y1="80" x2="110" y2="60" stroke="#38bdf8" strokeWidth="2.2" />
                        {/* Emitter branch */}
                        <line x1="90" y1="100" x2="110" y2="120" stroke="#38bdf8" strokeWidth="2.2" />
                        {/* Emitter Arrow */}
                        {selectedPolarity === "NPN" ? (
                          // NPN: Arrow pointing down/out on emitter
                          <polygon points="108,118 99,115 104,110" fill="#22c55e" stroke="#22c55e" />
                        ) : (
                          // PNP: Arrow pointing up/in towards base
                          <polygon points="93,103 102,106 97,111" fill="#f59e0b" stroke="#f59e0b" />
                        )}
                      </g>
                    )}

                    {selectedFamily === "MOSFET" && (
                      <g>
                        {/* Enclosing circle */}
                        <circle cx="110" cy="90" r="30" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.8" />
                        {/* Gate plate line */}
                        <line x1="88" y1="72" x2="88" y2="108" stroke="#f8fafc" strokeWidth="2.5" />
                        {/* Insulated gap line */}
                        <line x1="94" y1="72" x2="94" y2="82" stroke="#38bdf8" strokeWidth="2.5" />
                        <line x1="94" y1="85" x2="94" y2="95" stroke="#38bdf8" strokeWidth="2.5" />
                        <line x1="94" y1="98" x2="94" y2="108" stroke="#38bdf8" strokeWidth="2.5" />
                        {/* Drain branch */}
                        <line x1="94" y1="77" x2="110" y2="77" stroke="#38bdf8" strokeWidth="2.2" />
                        <line x1="110" y1="77" x2="110" y2="60" stroke="#38bdf8" strokeWidth="2.2" />
                        {/* Source branch */}
                        <line x1="94" y1="103" x2="110" y2="103" stroke="#38bdf8" strokeWidth="2.2" />
                        <line x1="110" y1="103" x2="110" y2="120" stroke="#38bdf8" strokeWidth="2.2" />
                        {/* Channel Substrate Arrow */}
                        <line x1="94" y1="90" x2="110" y2="90" stroke="#38bdf8" strokeWidth="2" />
                        <line x1="110" y1="90" x2="110" y2="103" stroke="#38bdf8" strokeWidth="2" />
                        {selectedPolarity === "NMOS" ? (
                          <polygon points="96,90 102,87 102,93" fill="#22c55e" stroke="#22c55e" />
                        ) : (
                          <polygon points="106,90 100,87 100,93" fill="#f59e0b" stroke="#f59e0b" />
                        )}
                      </g>
                    )}

                    {selectedFamily === "SCR" && (
                      <g>
                        {/* Diode triangle */}
                        <polygon points="98,72 122,72 110,95" fill="#0f172a" stroke="#38bdf8" strokeWidth="2.2" />
                        {/* Cathode bar */}
                        <line x1="98" y1="95" x2="122" y2="95" stroke="#38bdf8" strokeWidth="2.8" />
                        {/* Gate lead angled */}
                        <line x1="110" y1="95" x2="88" y2="108" stroke="#38bdf8" strokeWidth="2" />
                        <line x1="88" y1="108" x2="45" y2="90" stroke="#38bdf8" strokeWidth="2" />
                      </g>
                    )}

                    {selectedFamily === "JFET" && (
                      <g>
                        <circle cx="110" cy="90" r="30" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.8" />
                        <line x1="95" y1="72" x2="95" y2="108" stroke="#f8fafc" strokeWidth="3" />
                        <line x1="95" y1="77" x2="110" y2="60" stroke="#38bdf8" strokeWidth="2" />
                        <line x1="95" y1="103" x2="110" y2="120" stroke="#38bdf8" strokeWidth="2" />
                        {selectedPolarity === "PJFET" ? (
                          <polygon points="78,90 86,86 86,94" fill="#f59e0b" stroke="#f59e0b" />
                        ) : (
                          <polygon points="92,90 84,86 84,94" fill="#22c55e" stroke="#22c55e" />
                        )}
                      </g>
                    )}

                    {/* Terminal Pin Dots with Labels */}
                    {/* Pin 0 (Top) */}
                    <circle cx="110" cy="25" r="5.5" fill="#0f172a" stroke="#38bdf8" strokeWidth="2.2" />
                    <text x="122" y="28" fill="#38bdf8" fontSize="10" fontFamily="JetBrains Mono" fontWeight="700">
                      T0: {terminals.t0.name.split(" ")[0]}
                    </text>

                    {/* Pin 1 (Bottom) */}
                    <circle cx="110" cy="155" r="5.5" fill="#0f172a" stroke="#38bdf8" strokeWidth="2.2" />
                    <text x="122" y="158" fill="#38bdf8" fontSize="10" fontFamily="JetBrains Mono" fontWeight="700">
                      T1: {terminals.t1.name.split(" ")[0]}
                    </text>

                    {/* Pin 2 (Left) */}
                    <circle cx="45" cy="90" r="5.5" fill="#0f172a" stroke="#f59e0b" strokeWidth="2.2" />
                    <text x="42" y="78" textAnchor="middle" fill="#f59e0b" fontSize="10" fontFamily="JetBrains Mono" fontWeight="700">
                      T2: {terminals.t2.name.split(" ")[0]}
                    </text>
                  </svg>
                </div>

                {/* Pin Roles List */}
                <div className="w-full mt-3 space-y-1.5 text-xs font-mono">
                  <div className="flex items-center justify-between p-1.5 bg-[#0a1120] rounded border border-slate-800">
                    <span className="text-cyan-400 font-bold">{terminals.t0.pin}:</span>
                    <span className="text-slate-200">{terminals.t0.name}</span>
                  </div>
                  <div className="flex items-center justify-between p-1.5 bg-[#0a1120] rounded border border-slate-800">
                    <span className="text-cyan-400 font-bold">{terminals.t1.pin}:</span>
                    <span className="text-slate-200">{terminals.t1.name}</span>
                  </div>
                  <div className="flex items-center justify-between p-1.5 bg-[#0a1120] rounded border border-amber-500/30">
                    <span className="text-amber-400 font-bold">{terminals.t2.pin}:</span>
                    <span className="text-amber-200">{terminals.t2.name}</span>
                  </div>
                </div>
              </div>

              {/* Wiring & Physics Guidance Note */}
              <div className="bg-[#0b1426] p-3.5 rounded-xl border border-cyan-900/40 text-[11px] font-mono text-slate-300 space-y-1">
                <div className="flex items-center gap-1.5 text-cyan-400 font-bold">
                  <Info className="w-3.5 h-3.5" />
                  Engineering Wiring Tip:
                </div>
                <p className="text-slate-400 leading-relaxed">
                  {selectedFamily === "BJT"
                    ? "To operate in Forward Active amplifier mode, ensure V_BE > 0.7V by connecting Pin 2 (Base) to a DC bias resistor or signal source. Connect Pin 0 to the load and Pin 1 to Ground."
                    : selectedFamily === "MOSFET"
                    ? "MOSFETs are voltage-controlled: connect Pin 2 (Gate) to a digital logic pin or gate driver (V_GS > V_th turns channel ON). Negligible gate leakage current flows due to oxide insulation."
                    : selectedFamily === "SCR"
                    ? "Silicon Controlled Rectifiers latch ON once Pin 2 (Gate) receives a brief positive pulse (> 0.75V, > 5mA). They remain latched ON until anode current is interrupted."
                    : "JFETs are depletion-mode (normally ON): negative gate voltage pinches off the conduction channel."}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#0a101d] border-t border-slate-800">
          <div className="text-xs font-mono text-slate-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            Configured as <span className="text-white font-bold">{modelName}</span> ({selectedPolarity})
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-mono font-bold text-slate-300 bg-slate-800/80 hover:bg-slate-700 rounded-xl transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 text-xs font-mono font-bold text-slate-950 bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 rounded-xl shadow-lg shadow-cyan-500/25 flex items-center gap-2 transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              Apply &amp; Update Device
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
