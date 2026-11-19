import React, { useState, useMemo, useEffect } from "react";
import {
  Search,
  Sliders,
  Sparkles,
  Info,
  Zap,
  CheckCircle2,
  ExternalLink,
  Cpu,
  Layers,
  ArrowRight,
  Filter,
  Copy,
  Check,
  BookOpen,
  Eye,
  Activity,
  Maximize2,
  Minimize2,
  AlertTriangle,
} from "lucide-react";
import ComponentPinoutPopover, { PinoutPopoverData } from "./ComponentPinoutPopover";
import type { ComponentTerminal } from "../data/realisticComponentsData";

export type StandardStandardType = "IEEE_315" | "IEC_60617" | "SIDE_BY_SIDE";
export type LibraryCategory = "ALL" | "GATES" | "PASSIVES" | "SEMICONDUCTORS" | "SOURCES_GROUNDS" | "METERS";

export interface StandardSymbolItem {
  id: string;
  name: string;
  category: "GATES" | "PASSIVES" | "SEMICONDUCTORS" | "SOURCES_GROUNDS" | "METERS";
  standardIeeeName: string;
  standardIecName: string;
  ieeeDesignator: string; // e.g. "U1", "R1", "C1", "L1", "Q1", "D1", "SW1"
  iecDesignator: string;
  icPartNumber?: string;
  governingStandard: string; // e.g. "IEEE Std 315-1975 / ANSI Y32.2", "IEC 60617-12 / EN 60617"
  equationOrFormula: string;
  spiceSyntax: string;
  description: string;
  keySpecs: { label: string; value: string }[];
  // Input parameters for interactive simulation
  simType: "LOGIC" | "PASSIVE_R" | "PASSIVE_C" | "PASSIVE_L" | "DIODE" | "TRANSISTOR" | "SWITCH" | "METER";
  defaultParam?: number; // resistance, capacitance, etc.
  unit?: string;
  // Gate specific
  inputsCount?: number;
  truthTableRows?: { ins: number[]; out: number }[];
  // SVG drawing functions: return SVG child elements for 100x60 viewBox
  renderIeeeSvg: (isConducting?: boolean, paramVal?: number) => React.ReactNode;
  renderIecSvg: (isConducting?: boolean, paramVal?: number) => React.ReactNode;
}

export const STANDARD_COMPONENTS_DATA: StandardSymbolItem[] = [
  // =========================================================================
  // 1. BASIC LOGIC GATES (IEEE 315 Distinctive vs IEC 60617 Rectangular & Qualifiers)
  // =========================================================================
  {
    id: "AND",
    name: "AND Gate (Conjunction)",
    category: "GATES",
    standardIeeeName: "IEEE 315 Distinctive-Shape AND",
    standardIecName: "IEC 60617-12 Rectangular Qualifier '&'",
    ieeeDesignator: "U",
    iecDesignator: "G",
    icPartNumber: "74LS08 / 74HC08 / CD4081",
    governingStandard: "IEEE Std 315 Sec 12.2 · IEC 60617-12:1997",
    equationOrFormula: "Y = A · B (A AND B)",
    spiceSyntax: "A1 [A B] Y AND_GATE_MODEL",
    description: "Outputs HIGH (1) if and only if all inputs are HIGH (1). IEEE uses flat input face with semicircular output head; IEC uses rectangular enclosure with '&' qualifying symbol.",
    keySpecs: [
      { label: "Propagation Delay", value: "9 ns (74LS)" },
      { label: "Fan-Out", value: "10 LSTTL loads" },
      { label: "Operating Vcc", value: "4.75V – 5.25V" },
      { label: "Canonical Form", value: "m3 = A·B" },
    ],
    simType: "LOGIC",
    inputsCount: 2,
    truthTableRows: [
      { ins: [0, 0], out: 0 },
      { ins: [0, 1], out: 0 },
      { ins: [1, 0], out: 0 },
      { ins: [1, 1], out: 1 },
    ],
    renderIeeeSvg: () => (
      <g stroke="#38bdf8" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round">
        {/* Terminal leads */}
        <line x1="8" y1="20" x2="28" y2="20" />
        <line x1="8" y1="40" x2="28" y2="40" />
        <line x1="72" y1="30" x2="92" y2="30" />
        {/* IEEE Distinctive AND Body */}
        <path d="M 28 12 L 48 12 A 18 18 0 0 1 48 48 L 28 48 Z" fill="rgba(56, 189, 248, 0.08)" />
      </g>
    ),
    renderIecSvg: () => (
      <g stroke="#38bdf8" strokeWidth="2" fill="none" strokeLinecap="round">
        <line x1="8" y1="20" x2="28" y2="20" />
        <line x1="8" y1="40" x2="28" y2="40" />
        <line x1="72" y1="30" x2="92" y2="30" />
        <rect x="28" y="12" width="44" height="36" fill="rgba(56, 189, 248, 0.08)" />
        <text x="50" y="36" textAnchor="middle" fill="#38bdf8" stroke="none" fontFamily="monospace" fontSize="18" fontWeight="bold">
          &amp;
        </text>
      </g>
    ),
  },
  {
    id: "NAND",
    name: "NAND Gate (Universal Gate)",
    category: "GATES",
    standardIeeeName: "IEEE 315 Inverted AND (Bubble)",
    standardIecName: "IEC 60617-12 Rectangular '&' with Negation",
    ieeeDesignator: "U",
    iecDesignator: "G",
    icPartNumber: "74LS00 / 74HC00 / CD4011",
    governingStandard: "IEEE Std 315 Sec 12.2.3 · IEC 60617-12:1997",
    equationOrFormula: "Y = (A · B)' (NOT-AND)",
    spiceSyntax: "A1 [A B] Y NAND_GATE_MODEL",
    description: "Functionally complete universal logic gate. Outputs LOW (0) only when all inputs are HIGH. IEEE features an inversion circle bubble at output apex; IEC uses an output negation circle/triangle.",
    keySpecs: [
      { label: "Completeness", value: "Universal Gate" },
      { label: "Propagation Delay", value: "7 ns (74LS)" },
      { label: "De Morgan Form", value: "Y = A' + B'" },
      { label: "Canonical Form", value: "M3 = (A' + B')" },
    ],
    simType: "LOGIC",
    inputsCount: 2,
    truthTableRows: [
      { ins: [0, 0], out: 1 },
      { ins: [0, 1], out: 1 },
      { ins: [1, 0], out: 1 },
      { ins: [1, 1], out: 0 },
    ],
    renderIeeeSvg: () => (
      <g stroke="#38bdf8" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <line x1="8" y1="20" x2="26" y2="20" />
        <line x1="8" y1="40" x2="26" y2="40" />
        <path d="M 26 12 L 44 12 A 18 18 0 0 1 44 48 L 26 48 Z" fill="rgba(56, 189, 248, 0.08)" />
        {/* IEEE Inversion Bubble */}
        <circle cx="67" cy="30" r="4.5" fill="#090d16" stroke="#38bdf8" strokeWidth="2" />
        <line x1="71.5" y1="30" x2="92" y2="30" />
      </g>
    ),
    renderIecSvg: () => (
      <g stroke="#38bdf8" strokeWidth="2" fill="none" strokeLinecap="round">
        <line x1="8" y1="20" x2="26" y2="20" />
        <line x1="8" y1="40" x2="26" y2="40" />
        <rect x="26" y="12" width="42" height="36" fill="rgba(56, 189, 248, 0.08)" />
        <text x="47" y="36" textAnchor="middle" fill="#38bdf8" stroke="none" fontFamily="monospace" fontSize="18" fontWeight="bold">
          &amp;
        </text>
        <circle cx="73" cy="30" r="4.5" fill="#090d16" stroke="#38bdf8" strokeWidth="2" />
        <line x1="77.5" y1="30" x2="92" y2="30" />
      </g>
    ),
  },
  {
    id: "OR",
    name: "OR Gate (Disjunction)",
    category: "GATES",
    standardIeeeName: "IEEE 315 Distinctive-Shape OR (Curved)",
    standardIecName: "IEC 60617-12 Rectangular Qualifier '≥1'",
    ieeeDesignator: "U",
    iecDesignator: "G",
    icPartNumber: "74LS32 / 74HC32 / CD4071",
    governingStandard: "IEEE Std 315 Sec 12.3 · IEC 60617-12:1997",
    equationOrFormula: "Y = A + B (A OR B)",
    spiceSyntax: "A1 [A B] Y OR_GATE_MODEL",
    description: "Outputs HIGH (1) if at least one input is HIGH (1). IEEE features a concave curved back and pointed convex cusp; IEC features rectangular box with '≥1' qualifier indicating greater-than-or-equal-to 1.",
    keySpecs: [
      { label: "Propagation Delay", value: "10 ns (74LS)" },
      { label: "Min Inputs", value: "≥ 1 HIGH gives 1" },
      { label: "Canonical Minterms", value: "Σm(1, 2, 3)" },
      { label: "Dual Form", value: "Y = (A' · B')'" },
    ],
    simType: "LOGIC",
    inputsCount: 2,
    truthTableRows: [
      { ins: [0, 0], out: 0 },
      { ins: [0, 1], out: 1 },
      { ins: [1, 0], out: 1 },
      { ins: [1, 1], out: 1 },
    ],
    renderIeeeSvg: () => (
      <g stroke="#38bdf8" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <line x1="8" y1="20" x2="31" y2="20" />
        <line x1="8" y1="40" x2="31" y2="40" />
        <line x1="74" y1="30" x2="92" y2="30" />
        <path
          d="M 24 12 Q 38 30 24 48 Q 48 48 74 30 Q 48 12 24 12 Z"
          fill="rgba(56, 189, 248, 0.08)"
        />
      </g>
    ),
    renderIecSvg: () => (
      <g stroke="#38bdf8" strokeWidth="2" fill="none" strokeLinecap="round">
        <line x1="8" y1="20" x2="28" y2="20" />
        <line x1="8" y1="40" x2="28" y2="40" />
        <line x1="72" y1="30" x2="92" y2="30" />
        <rect x="28" y="12" width="44" height="36" fill="rgba(56, 189, 248, 0.08)" />
        <text x="50" y="36" textAnchor="middle" fill="#38bdf8" stroke="none" fontFamily="monospace" fontSize="16" fontWeight="bold">
          ≥1
        </text>
      </g>
    ),
  },
  {
    id: "NOR",
    name: "NOR Gate (Universal Gate)",
    category: "GATES",
    standardIeeeName: "IEEE 315 Inverted OR (Bubble)",
    standardIecName: "IEC 60617-12 Rectangular '≥1' with Negation",
    ieeeDesignator: "U",
    iecDesignator: "G",
    icPartNumber: "74LS02 / 74HC02 / CD4001",
    governingStandard: "IEEE Std 315 Sec 12.3.3 · IEC 60617-12:1997",
    equationOrFormula: "Y = (A + B)' (NOT-OR)",
    spiceSyntax: "A1 [A B] Y NOR_GATE_MODEL",
    description: "Functionally complete universal logic gate. Outputs HIGH (1) only when all inputs are LOW (0). In IEEE standard, uses curved OR body with inversion bubble; IEC uses '≥1' with output negation indicator.",
    keySpecs: [
      { label: "Completeness", value: "Universal Gate" },
      { label: "De Morgan Form", value: "Y = A' · B'" },
      { label: "Canonical Form", value: "m0 = A'·B'" },
      { label: "Propagation Delay", value: "8 ns (74LS)" },
    ],
    simType: "LOGIC",
    inputsCount: 2,
    truthTableRows: [
      { ins: [0, 0], out: 1 },
      { ins: [0, 1], out: 0 },
      { ins: [1, 0], out: 0 },
      { ins: [1, 1], out: 0 },
    ],
    renderIeeeSvg: () => (
      <g stroke="#38bdf8" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <line x1="8" y1="20" x2="29" y2="20" />
        <line x1="8" y1="40" x2="29" y2="40" />
        <path
          d="M 22 12 Q 36 30 22 48 Q 44 48 68 30 Q 44 12 22 12 Z"
          fill="rgba(56, 189, 248, 0.08)"
        />
        <circle cx="73" cy="30" r="4.5" fill="#090d16" stroke="#38bdf8" strokeWidth="2" />
        <line x1="77.5" y1="30" x2="92" y2="30" />
      </g>
    ),
    renderIecSvg: () => (
      <g stroke="#38bdf8" strokeWidth="2" fill="none" strokeLinecap="round">
        <line x1="8" y1="20" x2="26" y2="20" />
        <line x1="8" y1="40" x2="26" y2="40" />
        <rect x="26" y="12" width="42" height="36" fill="rgba(56, 189, 248, 0.08)" />
        <text x="47" y="36" textAnchor="middle" fill="#38bdf8" stroke="none" fontFamily="monospace" fontSize="16" fontWeight="bold">
          ≥1
        </text>
        <circle cx="73" cy="30" r="4.5" fill="#090d16" stroke="#38bdf8" strokeWidth="2" />
        <line x1="77.5" y1="30" x2="92" y2="30" />
      </g>
    ),
  },
  {
    id: "XOR",
    name: "XOR Gate (Exclusive-OR / Parity)",
    category: "GATES",
    standardIeeeName: "IEEE 315 Double-Arc Distinctive XOR",
    standardIecName: "IEC 60617-12 Rectangular Qualifier '=1'",
    ieeeDesignator: "U",
    iecDesignator: "G",
    icPartNumber: "74LS86 / 74HC86 / CD4070",
    governingStandard: "IEEE Std 315 Sec 12.4 · IEC 60617-12:1997",
    equationOrFormula: "Y = A ⊕ B = A'B + AB'",
    spiceSyntax: "A1 [A B] Y XOR_GATE_MODEL",
    description: "Outputs HIGH (1) when inputs are unequal (odd parity detector / half-adder sum). IEEE uses detached back arc with curved OR body; IEC uses '=1' denoting exactly 1 input must be HIGH.",
    keySpecs: [
      { label: "Function", value: "Modulo-2 Addition" },
      { label: "Parity Generator", value: "Odd-1 Detector" },
      { label: "Canonical Form", value: "Σm(1, 2)" },
      { label: "Propagation Delay", value: "10 ns (74LS)" },
    ],
    simType: "LOGIC",
    inputsCount: 2,
    truthTableRows: [
      { ins: [0, 0], out: 0 },
      { ins: [0, 1], out: 1 },
      { ins: [1, 0], out: 1 },
      { ins: [1, 1], out: 0 },
    ],
    renderIeeeSvg: () => (
      <g stroke="#38bdf8" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <line x1="8" y1="20" x2="22" y2="20" />
        <line x1="8" y1="40" x2="22" y2="40" />
        <line x1="74" y1="30" x2="92" y2="30" />
        {/* Detached Back Arc */}
        <path d="M 18 12 Q 32 30 18 48" strokeWidth="2.2" />
        {/* Main Body */}
        <path
          d="M 26 12 Q 40 30 26 48 Q 50 48 74 30 Q 50 12 26 12 Z"
          fill="rgba(56, 189, 248, 0.08)"
        />
      </g>
    ),
    renderIecSvg: () => (
      <g stroke="#38bdf8" strokeWidth="2" fill="none" strokeLinecap="round">
        <line x1="8" y1="20" x2="28" y2="20" />
        <line x1="8" y1="40" x2="28" y2="40" />
        <line x1="72" y1="30" x2="92" y2="30" />
        <rect x="28" y="12" width="44" height="36" fill="rgba(56, 189, 248, 0.08)" />
        <text x="50" y="36" textAnchor="middle" fill="#38bdf8" stroke="none" fontFamily="monospace" fontSize="16" fontWeight="bold">
          =1
        </text>
      </g>
    ),
  },
  {
    id: "XNOR",
    name: "XNOR Gate (Equivalence Gate)",
    category: "GATES",
    standardIeeeName: "IEEE 315 Inverted XOR (Bubble)",
    standardIecName: "IEC 60617-12 Rectangular '=1' with Negation",
    ieeeDesignator: "U",
    iecDesignator: "G",
    icPartNumber: "74LS266 / 74HC266 / CD4077",
    governingStandard: "IEEE Std 315 Sec 12.4.2 · IEC 60617-12:1997",
    equationOrFormula: "Y = (A ⊕ B)' = AB + A'B'",
    spiceSyntax: "A1 [A B] Y XNOR_GATE_MODEL",
    description: "Outputs HIGH (1) when inputs are equal (coincidence comparator / even parity). IEEE features detached arc with output bubble; IEC uses '=1' qualifier with output negation indicator.",
    keySpecs: [
      { label: "Function", value: "Coincidence / Equality" },
      { label: "Canonical Form", value: "Σm(0, 3)" },
      { label: "Parity Generator", value: "Even-1 Detector" },
      { label: "Propagation Delay", value: "11 ns (74LS)" },
    ],
    simType: "LOGIC",
    inputsCount: 2,
    truthTableRows: [
      { ins: [0, 0], out: 1 },
      { ins: [0, 1], out: 0 },
      { ins: [1, 0], out: 0 },
      { ins: [1, 1], out: 1 },
    ],
    renderIeeeSvg: () => (
      <g stroke="#38bdf8" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <line x1="8" y1="20" x2="20" y2="20" />
        <line x1="8" y1="40" x2="20" y2="40" />
        <path d="M 16 12 Q 30 30 16 48" strokeWidth="2.2" />
        <path
          d="M 24 12 Q 38 30 24 48 Q 46 48 68 30 Q 46 12 24 12 Z"
          fill="rgba(56, 189, 248, 0.08)"
        />
        <circle cx="73" cy="30" r="4.5" fill="#090d16" stroke="#38bdf8" strokeWidth="2" />
        <line x1="77.5" y1="30" x2="92" y2="30" />
      </g>
    ),
    renderIecSvg: () => (
      <g stroke="#38bdf8" strokeWidth="2" fill="none" strokeLinecap="round">
        <line x1="8" y1="20" x2="26" y2="20" />
        <line x1="8" y1="40" x2="26" y2="40" />
        <rect x="26" y="12" width="42" height="36" fill="rgba(56, 189, 248, 0.08)" />
        <text x="47" y="36" textAnchor="middle" fill="#38bdf8" stroke="none" fontFamily="monospace" fontSize="16" fontWeight="bold">
          =1
        </text>
        <circle cx="73" cy="30" r="4.5" fill="#090d16" stroke="#38bdf8" strokeWidth="2" />
        <line x1="77.5" y1="30" x2="92" y2="30" />
      </g>
    ),
  },
  {
    id: "NOT",
    name: "NOT Gate / Hex Inverter",
    category: "GATES",
    standardIeeeName: "IEEE 315 Triangle Inverter (Bubble)",
    standardIecName: "IEC 60617-12 Rectangular Qualifier '1' with Negation",
    ieeeDesignator: "U",
    iecDesignator: "G",
    icPartNumber: "74LS04 / 74HC04 / CD4069",
    governingStandard: "IEEE Std 315 Sec 12.1 · IEC 60617-12:1997",
    equationOrFormula: "Y = A' (NOT A)",
    spiceSyntax: "A1 A Y NOT_GATE_MODEL",
    description: "Inverts logic state (1 to 0, 0 to 1). IEEE uses a right-pointing triangle with output inversion bubble; IEC uses rectangular box with '1' and negation bubble/triangle.",
    keySpecs: [
      { label: "Function", value: "Boolean Negation" },
      { label: "Propagation Delay", value: "6 ns (74LS)" },
      { label: "Hex Package", value: "6 Inverters per 14-pin DIP" },
      { label: "Canonical Form", value: "m0 = A'" },
    ],
    simType: "LOGIC",
    inputsCount: 1,
    truthTableRows: [
      { ins: [0], out: 1 },
      { ins: [1], out: 0 },
    ],
    renderIeeeSvg: () => (
      <g stroke="#38bdf8" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <line x1="8" y1="30" x2="28" y2="30" />
        <polygon points="28,12 28,48 66,30" fill="rgba(56, 189, 248, 0.08)" />
        <circle cx="71" cy="30" r="4.5" fill="#090d16" stroke="#38bdf8" strokeWidth="2" />
        <line x1="75.5" y1="30" x2="92" y2="30" />
      </g>
    ),
    renderIecSvg: () => (
      <g stroke="#38bdf8" strokeWidth="2" fill="none" strokeLinecap="round">
        <line x1="8" y1="30" x2="28" y2="30" />
        <rect x="28" y="12" width="40" height="36" fill="rgba(56, 189, 248, 0.08)" />
        <text x="48" y="36" textAnchor="middle" fill="#38bdf8" stroke="none" fontFamily="monospace" fontSize="18" fontWeight="bold">
          1
        </text>
        <circle cx="73" cy="30" r="4.5" fill="#090d16" stroke="#38bdf8" strokeWidth="2" />
        <line x1="77.5" y1="30" x2="92" y2="30" />
      </g>
    ),
  },
  {
    id: "BUFFER",
    name: "Non-Inverting Buffer / Line Driver",
    category: "GATES",
    standardIeeeName: "IEEE 315 Triangle Buffer (No Bubble)",
    standardIecName: "IEC 60617-12 Rectangular Qualifier '1'",
    ieeeDesignator: "U",
    iecDesignator: "G",
    icPartNumber: "74LS07 / 74HC244 / CD4050",
    governingStandard: "IEEE Std 315 Sec 12.1 · IEC 60617-12:1997",
    equationOrFormula: "Y = A (Identity / High Fan-Out Driver)",
    spiceSyntax: "A1 A Y BUF_GATE_MODEL",
    description: "Preserves Boolean state while providing signal isolation, current amplification, and high fan-out drive capacity for driving long bus tracks or LED indicators.",
    keySpecs: [
      { label: "Function", value: "Signal Amplification" },
      { label: "Output Current", value: "Up to 30mA sink (7407)" },
      { label: "Propagation Delay", value: "8 ns" },
      { label: "Drive Capability", value: "High Fan-Out" },
    ],
    simType: "LOGIC",
    inputsCount: 1,
    truthTableRows: [
      { ins: [0], out: 0 },
      { ins: [1], out: 1 },
    ],
    renderIeeeSvg: () => (
      <g stroke="#38bdf8" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <line x1="8" y1="30" x2="30" y2="30" />
        <polygon points="30,12 30,48 70,30" fill="rgba(56, 189, 248, 0.08)" />
        <line x1="70" y1="30" x2="92" y2="30" />
      </g>
    ),
    renderIecSvg: () => (
      <g stroke="#38bdf8" strokeWidth="2" fill="none" strokeLinecap="round">
        <line x1="8" y1="30" x2="30" y2="30" />
        <rect x="30" y="12" width="40" height="36" fill="rgba(56, 189, 248, 0.08)" />
        <text x="50" y="36" textAnchor="middle" fill="#38bdf8" stroke="none" fontFamily="monospace" fontSize="18" fontWeight="bold">
          1
        </text>
        <line x1="70" y1="30" x2="92" y2="30" />
      </g>
    ),
  },

  // =========================================================================
  // 2. PASSIVE & REACTIVE COMPONENTS (IEEE 315 Sharp Zigzag vs IEC 60617 Box)
  // =========================================================================
  {
    id: "RES_FIXED",
    name: "Fixed Resistor (Carbon / Metal Film)",
    category: "PASSIVES",
    standardIeeeName: "IEEE 315 Sharp Zig-Zag Symbol",
    standardIecName: "IEC 60617-4 Rectangular Box Symbol (1:3)",
    ieeeDesignator: "R",
    iecDesignator: "R",
    icPartNumber: "CFR-25 / MFR-25 1/4W 1kΩ",
    governingStandard: "IEEE Std 315 Sec 2.1 · IEC 60617-4:1996",
    equationOrFormula: "V = I · R  ·  P = I²R = V²/R",
    spiceSyntax: "R1 N_IN N_OUT 1k",
    description: "Dissipates electrical energy as heat according to Joule's law. IEEE 315 specifies a continuous sharp 3-peak zig-zag; IEC 60617 specifies an elongated rectangular box with axial leads.",
    keySpecs: [
      { label: "Nominal Range", value: "1.0 Ω to 22 MΩ" },
      { label: "Standard Ratings", value: "0.25W / 0.5W / 1W" },
      { label: "Tolerance (EIA)", value: "±1% (Metal), ±5% (Carbon)" },
      { label: "Temp Coefficient", value: "±50 ppm/°C" },
    ],
    simType: "PASSIVE_R",
    defaultParam: 1000,
    unit: "Ω",
    renderIeeeSvg: () => (
      <g stroke="#38bdf8" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <line x1="8" y1="30" x2="24" y2="30" />
        <path d="M 24 30 L 30 18 L 38 42 L 46 18 L 54 42 L 62 18 L 70 42 L 76 30" />
        <line x1="76" y1="30" x2="92" y2="30" />
      </g>
    ),
    renderIecSvg: () => (
      <g stroke="#38bdf8" strokeWidth="2.2" fill="none" strokeLinecap="round">
        <line x1="8" y1="30" x2="26" y2="30" />
        <rect x="26" y="21" width="48" height="18" fill="rgba(56, 189, 248, 0.08)" />
        <line x1="74" y1="30" x2="92" y2="30" />
      </g>
    ),
  },
  {
    id: "POTENTIOMETER",
    name: "Potentiometer / Variable Voltage Divider",
    category: "PASSIVES",
    standardIeeeName: "IEEE 315 Zig-Zag with Wiper Arrow",
    standardIecName: "IEC 60617-4 Rectangular Box with Center Tap",
    ieeeDesignator: "VR / POT",
    iecDesignator: "R",
    icPartNumber: "Bourns 3362 / RV09 10kΩ",
    governingStandard: "IEEE Std 315 Sec 2.1.3 · IEC 60617-4:1996",
    equationOrFormula: "V_out = V_in · (R_wiper / R_total)",
    spiceSyntax: "R1 N_1 N_W 5k  ·  R2 N_W N_2 5k",
    description: "Three-terminal resistive voltage divider with an adjustable sliding wiper contact. IEEE specifies a zig-zag track with perpendicular/angled arrow; IEC specifies a rectangular resistor body with center wiper.",
    keySpecs: [
      { label: "Taper Types", value: "Linear (B) / Logarithmic (A)" },
      { label: "Nominal Range", value: "1kΩ to 100kΩ" },
      { label: "Rotational Angle", value: "300° ± 5°" },
      { label: "Terminal Count", value: "3 (T1, Wiper, T2)" },
    ],
    simType: "PASSIVE_R",
    defaultParam: 10000,
    unit: "Ω",
    renderIeeeSvg: () => (
      <g stroke="#38bdf8" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <line x1="8" y1="36" x2="24" y2="36" />
        <path d="M 24 36 L 29 26 L 37 46 L 45 26 L 53 46 L 61 26 L 69 46 L 76 36" />
        <line x1="76" y1="36" x2="92" y2="36" />
        {/* Wiper from top */}
        <line x1="50" y1="8" x2="50" y2="22" stroke="#22d3ee" strokeWidth="2.4" />
        <polygon points="50,26 46,19 54,19" fill="#22d3ee" stroke="none" />
      </g>
    ),
    renderIecSvg: () => (
      <g stroke="#38bdf8" strokeWidth="2.2" fill="none" strokeLinecap="round">
        <line x1="8" y1="36" x2="26" y2="36" />
        <rect x="26" y="27" width="48" height="18" fill="rgba(56, 189, 248, 0.08)" />
        <line x1="74" y1="36" x2="92" y2="36" />
        <line x1="50" y1="8" x2="50" y2="23" stroke="#22d3ee" strokeWidth="2.4" />
        <polygon points="50,27 46,20 54,20" fill="#22d3ee" stroke="none" />
      </g>
    ),
  },
  {
    id: "CAP_CERAMIC",
    name: "Non-Polarized Capacitor (Ceramic / Film)",
    category: "PASSIVES",
    standardIeeeName: "IEEE 315 Parallel Symmetrical Plates",
    standardIecName: "IEC 60617-4 Symmetrical Parallel Plates",
    ieeeDesignator: "C",
    iecDesignator: "C",
    icPartNumber: "100nF (104) C0G / X7R 50V",
    governingStandard: "IEEE Std 315 Sec 2.2 · IEC 60617-4:1996",
    equationOrFormula: "i(t) = C · (dv/dt)  ·  X_C = 1 / (2π f C)",
    spiceSyntax: "C1 N_1 N_2 100n",
    description: "Electrostatic energy storage device with equal parallel conducting plates separated by a dielectric medium. Both IEEE and IEC standards enforce two identical parallel straight lines perpendicular to leads.",
    keySpecs: [
      { label: "Nominal Value", value: "100 nF (0.1 µF)" },
      { label: "Voltage Rating", value: "50V DC" },
      { label: "Dielectric Class", value: "X7R Ceramic" },
      { label: "Impedance @ 1kHz", value: "1.59 kΩ" },
    ],
    simType: "PASSIVE_C",
    defaultParam: 1e-7,
    unit: "F",
    renderIeeeSvg: () => (
      <g stroke="#38bdf8" strokeWidth="2.2" fill="none" strokeLinecap="round">
        <line x1="8" y1="30" x2="44" y2="30" />
        <line x1="56" y1="30" x2="92" y2="30" />
        {/* Parallel Plates */}
        <line x1="44" y1="14" x2="44" y2="46" strokeWidth="3" />
        <line x1="56" y1="14" x2="56" y2="46" strokeWidth="3" />
      </g>
    ),
    renderIecSvg: () => (
      <g stroke="#38bdf8" strokeWidth="2.2" fill="none" strokeLinecap="round">
        <line x1="8" y1="30" x2="44" y2="30" />
        <line x1="56" y1="30" x2="92" y2="30" />
        <line x1="44" y1="14" x2="44" y2="46" strokeWidth="3" />
        <line x1="56" y1="14" x2="56" y2="46" strokeWidth="3" />
      </g>
    ),
  },
  {
    id: "CAP_ELECTROLYTIC",
    name: "Polarized Capacitor (Aluminum Can / Tantalum)",
    category: "PASSIVES",
    standardIeeeName: "IEEE 315 Flat Plate (+) & Concave Curved Plate (-)",
    standardIecName: "IEC 60617-4 Hollow Plate (+) & Solid Block (-)",
    ieeeDesignator: "C",
    iecDesignator: "C",
    icPartNumber: "10µF 50V Radial Aluminum",
    governingStandard: "IEEE Std 315 Sec 2.2.4 · IEC 60617-4:1996",
    equationOrFormula: "W = (1/2) · C · V²  ·  τ = R · C",
    spiceSyntax: "C1 N_POS N_NEG 10u",
    description: "Polarity-sensitive capacitor. Must be connected with positive potential on anode. IEEE 315 uses flat anode plate with concave cathode plate; IEC uses hollow positive plate with solid block negative.",
    keySpecs: [
      { label: "Nominal Value", value: "10 µF" },
      { label: "Voltage Rating", value: "25V / 50V DC" },
      { label: "ESR @ 100kHz", value: "0.25 Ω" },
      { label: "Polarity Safety", value: "Reverse bias causes thermal rupture" },
    ],
    simType: "PASSIVE_C",
    defaultParam: 1e-5,
    unit: "F",
    renderIeeeSvg: () => (
      <g stroke="#38bdf8" strokeWidth="2.2" fill="none" strokeLinecap="round">
        <line x1="8" y1="30" x2="44" y2="30" />
        <line x1="56" y1="30" x2="92" y2="30" />
        {/* Flat Anode Plate */}
        <line x1="44" y1="14" x2="44" y2="46" strokeWidth="3" />
        {/* Concave Cathode Plate */}
        <path d="M 56 14 Q 51 30 56 46" strokeWidth="3" />
        {/* Polarity Sign */}
        <text x="32" y="22" fill="#38bdf8" stroke="none" fontFamily="monospace" fontSize="13" fontWeight="bold">
          +
        </text>
      </g>
    ),
    renderIecSvg: () => (
      <g stroke="#38bdf8" strokeWidth="2.2" fill="none" strokeLinecap="round">
        <line x1="8" y1="30" x2="44" y2="30" />
        <line x1="56" y1="30" x2="92" y2="30" />
        <line x1="44" y1="14" x2="44" y2="46" strokeWidth="3" />
        {/* IEC Solid Negative Block */}
        <rect x="54" y="14" width="4" height="32" fill="#38bdf8" stroke="none" />
        <text x="32" y="22" fill="#38bdf8" stroke="none" fontFamily="monospace" fontSize="13" fontWeight="bold">
          +
        </text>
      </g>
    ),
  },
  {
    id: "INDUCTOR_AIR",
    name: "Inductor / RF Choke (Air-Core)",
    category: "PASSIVES",
    standardIeeeName: "IEEE 315 Contiguous Semicircular Loops",
    standardIecName: "IEC 60617-4 Continuous Arc Multi-Lobe Symbol",
    ieeeDesignator: "L",
    iecDesignator: "L",
    icPartNumber: "10mH 100mA Axial Inductor",
    governingStandard: "IEEE Std 315 Sec 2.3 · IEC 60617-4:1996",
    equationOrFormula: "v(t) = L · (di/dt)  ·  X_L = 2π f L",
    spiceSyntax: "L1 N_1 N_2 10m",
    description: "Magnetic energy storage inductor. IEEE standard specifies 4 contiguous tangent semicircular loops without center loop overlaps; IEC specifies 4 curved lobes along lead wire.",
    keySpecs: [
      { label: "Inductance", value: "10 mH" },
      { label: "Self-Resonance", value: "2.4 MHz" },
      { label: "DCR Resistance", value: "12 Ω" },
      { label: "Impedance @ 1kHz", value: "62.8 Ω" },
    ],
    simType: "PASSIVE_L",
    defaultParam: 0.01,
    unit: "H",
    renderIeeeSvg: () => (
      <g stroke="#38bdf8" strokeWidth="2.2" fill="none" strokeLinecap="round">
        <line x1="8" y1="34" x2="22" y2="34" />
        <path d="M 22 34 A 7 7 0 0 1 36 34 A 7 7 0 0 1 50 34 A 7 7 0 0 1 64 34 A 7 7 0 0 1 78 34" strokeWidth="2.4" />
        <line x1="78" y1="34" x2="92" y2="34" />
      </g>
    ),
    renderIecSvg: () => (
      <g stroke="#38bdf8" strokeWidth="2.2" fill="none" strokeLinecap="round">
        <line x1="8" y1="34" x2="22" y2="34" />
        <path d="M 22 34 A 7 7 0 0 1 36 34 A 7 7 0 0 1 50 34 A 7 7 0 0 1 64 34 A 7 7 0 0 1 78 34" strokeWidth="2.4" />
        <line x1="78" y1="34" x2="92" y2="34" />
      </g>
    ),
  },
  {
    id: "INDUCTOR_FERRITE",
    name: "Iron / Ferrite Core Inductor",
    category: "PASSIVES",
    standardIeeeName: "IEEE 315 Loops with Dual Continuous Core Lines",
    standardIecName: "IEC 60617-4 Lobe Arcs with Magnetic Core Lines",
    ieeeDesignator: "L",
    iecDesignator: "L",
    icPartNumber: "Toroidal Ferrite Choke 47mH",
    governingStandard: "IEEE Std 315 Sec 2.3.2 · IEC 60617-4:1996",
    equationOrFormula: "B = μ · H  ·  L = (μ · N² · A) / l",
    spiceSyntax: "L1 N_1 N_2 47m",
    description: "Inductor wound on high-permeability ferrite or laminated iron core to achieve high inductance without excessive winding turns. IEEE designates magnetic core with dual parallel straight lines above the coils.",
    keySpecs: [
      { label: "Core Material", value: "Ferrite (MnZn / NiZn)" },
      { label: "Permeability (μr)", value: "2000" },
      { label: "Saturation Current", value: "1.2 A" },
      { label: "Core Loss", value: "Low eddy currents" },
    ],
    simType: "PASSIVE_L",
    defaultParam: 0.047,
    unit: "H",
    renderIeeeSvg: () => (
      <g stroke="#38bdf8" strokeWidth="2.2" fill="none" strokeLinecap="round">
        <line x1="8" y1="36" x2="22" y2="36" />
        <path d="M 22 36 A 7 7 0 0 1 36 36 A 7 7 0 0 1 50 36 A 7 7 0 0 1 64 36 A 7 7 0 0 1 78 36" strokeWidth="2.4" />
        <line x1="78" y1="36" x2="92" y2="36" />
        {/* Dual Magnetic Ferrite Core Lines */}
        <line x1="22" y1="21" x2="78" y2="21" stroke="#22d3ee" strokeWidth="1.8" />
        <line x1="22" y1="16" x2="78" y2="16" stroke="#22d3ee" strokeWidth="1.8" />
      </g>
    ),
    renderIecSvg: () => (
      <g stroke="#38bdf8" strokeWidth="2.2" fill="none" strokeLinecap="round">
        <line x1="8" y1="36" x2="22" y2="36" />
        <path d="M 22 36 A 7 7 0 0 1 36 36 A 7 7 0 0 1 50 36 A 7 7 0 0 1 64 36 A 7 7 0 0 1 78 36" strokeWidth="2.4" />
        <line x1="78" y1="36" x2="92" y2="36" />
        <line x1="22" y1="21" x2="78" y2="21" stroke="#22d3ee" strokeWidth="1.8" />
        <line x1="22" y1="16" x2="78" y2="16" stroke="#22d3ee" strokeWidth="1.8" />
      </g>
    ),
  },
  {
    id: "TRANSFORMER",
    name: "Step-Down / Isolation Transformer",
    category: "PASSIVES",
    standardIeeeName: "IEEE 315 Opposing Inductors with Core Lines & Phase Dots",
    standardIecName: "IEC 60617-6 Coupled Two-Winding Transformer",
    ieeeDesignator: "T",
    iecDesignator: "T",
    icPartNumber: "EI-28 230V to 12V 10VA",
    governingStandard: "IEEE Std 315 Sec 6.1 · IEC 60617-6:1996",
    equationOrFormula: "V_p / V_s = N_p / N_s = I_s / I_p",
    spiceSyntax: "L_PRI N_P1 N_P2 100m  ·  L_SEC N_S1 N_S2 10m  ·  K1 L_PRI L_SEC 0.99",
    description: "Mutual inductance device providing galvanic isolation and voltage conversion. Both IEEE and IEC standards use facing coils with magnetic core lines and instantaneous polarity phasing dots.",
    keySpecs: [
      { label: "Turns Ratio (Np:Ns)", value: "10 : 1" },
      { label: "Galvanic Isolation", value: "3.75 kV RMS" },
      { label: "Coupling Factor (k)", value: "0.985" },
      { label: "Operating Freq", value: "50Hz – 400Hz" },
    ],
    simType: "PASSIVE_L",
    defaultParam: 0.1,
    unit: "H",
    renderIeeeSvg: () => (
      <g stroke="#38bdf8" strokeWidth="2" fill="none" strokeLinecap="round">
        {/* Primary Coil (Left) */}
        <line x1="8" y1="14" x2="28" y2="14" />
        <line x1="8" y1="46" x2="28" y2="46" />
        <path d="M 28 14 A 5 5 0 0 1 28 24 A 5 5 0 0 1 28 34 A 5 5 0 0 1 28 44" strokeWidth="2.2" />
        {/* Core Lines */}
        <line x1="47" y1="10" x2="47" y2="50" stroke="#22d3ee" strokeWidth="2" />
        <line x1="53" y1="10" x2="53" y2="50" stroke="#22d3ee" strokeWidth="2" />
        {/* Secondary Coil (Right) */}
        <line x1="72" y1="14" x2="92" y2="14" />
        <line x1="72" y1="46" x2="92" y2="46" />
        <path d="M 72 14 A 5 5 0 0 0 72 24 A 5 5 0 0 0 72 34 A 5 5 0 0 0 72 44" strokeWidth="2.2" />
        {/* Instantaneous Phasing Dots */}
        <circle cx="24" cy="10" r="2.2" fill="#38bdf8" stroke="none" />
        <circle cx="76" cy="10" r="2.2" fill="#38bdf8" stroke="none" />
      </g>
    ),
    renderIecSvg: () => (
      <g stroke="#38bdf8" strokeWidth="2" fill="none" strokeLinecap="round">
        <line x1="8" y1="14" x2="28" y2="14" />
        <line x1="8" y1="46" x2="28" y2="46" />
        <path d="M 28 14 A 5 5 0 0 1 28 24 A 5 5 0 0 1 28 34 A 5 5 0 0 1 28 44" strokeWidth="2.2" />
        <line x1="47" y1="10" x2="47" y2="50" stroke="#22d3ee" strokeWidth="2" />
        <line x1="53" y1="10" x2="53" y2="50" stroke="#22d3ee" strokeWidth="2" />
        <line x1="72" y1="14" x2="92" y2="14" />
        <line x1="72" y1="46" x2="92" y2="46" />
        <path d="M 72 14 A 5 5 0 0 0 72 24 A 5 5 0 0 0 72 34 A 5 5 0 0 0 72 44" strokeWidth="2.2" />
        <circle cx="24" cy="10" r="2.2" fill="#38bdf8" stroke="none" />
        <circle cx="76" cy="10" r="2.2" fill="#38bdf8" stroke="none" />
      </g>
    ),
  },
  {
    id: "FUSE",
    name: "Cartridge Fuse (Overcurrent Protection)",
    category: "PASSIVES",
    standardIeeeName: "IEEE 315 S-Wave / Open Filament Symbol",
    standardIecName: "IEC 60617-7 Rectangular Box with Axial Conductor",
    ieeeDesignator: "F",
    iecDesignator: "F",
    icPartNumber: "5x20mm Glass 2A 250V Slow-Blow",
    governingStandard: "IEEE Std 315 Sec 9.1 · IEC 60617-7:1996",
    equationOrFormula: "I²t (Melting Integral)",
    spiceSyntax: "F1 N_1 N_2 2.0A",
    description: "Sacrificial overcurrent protective device. IEEE specifies an internal curved S-shaped fuse wire; IEC specifies a clean rectangular box with through-wire running axially from end to end.",
    keySpecs: [
      { label: "Current Rating", value: "2.0 A Continuous" },
      { label: "Voltage Rating", value: "250 V AC" },
      { label: "Interrupt Rating", value: "35 A @ 250VAC" },
      { label: "Blow Characteristic", value: "Time-Lag (T) Slow-Blow" },
    ],
    simType: "PASSIVE_R",
    defaultParam: 0.05,
    unit: "Ω",
    renderIeeeSvg: () => (
      <g stroke="#38bdf8" strokeWidth="2.2" fill="none" strokeLinecap="round">
        <line x1="8" y1="30" x2="30" y2="30" />
        <line x1="70" y1="30" x2="92" y2="30" />
        {/* IEEE S-Wave Filament */}
        <path d="M 30 30 C 40 18, 40 42, 50 30 C 60 18, 60 42, 70 30" strokeWidth="2.4" />
      </g>
    ),
    renderIecSvg: () => (
      <g stroke="#38bdf8" strokeWidth="2.2" fill="none" strokeLinecap="round">
        <line x1="8" y1="30" x2="92" y2="30" />
        <rect x="28" y="21" width="44" height="18" fill="rgba(56, 189, 248, 0.08)" />
      </g>
    ),
  },
  {
    id: "SWITCH_SPST",
    name: "SPST Toggle Switch (Single Pole Single Throw)",
    category: "PASSIVES",
    standardIeeeName: "IEEE 315 Knife Contact Lever & Terminals",
    standardIecName: "IEC 60617-7 Make Contact Switch",
    ieeeDesignator: "SW / S",
    iecDesignator: "S",
    icPartNumber: "Miniature Slide Switch 12V 0.5A",
    governingStandard: "IEEE Std 315 Sec 4.1 · IEC 60617-7:1996",
    equationOrFormula: "Closed: R ≈ 0 Ω  ·  Open: R = ∞",
    spiceSyntax: "S1 N_1 N_2 V_CTRL 0 SW_MODEL",
    description: "Two-terminal mechanical contact switch. IEEE and IEC depict an open angled lever contacting between two terminal circles with standard 30° displacement.",
    keySpecs: [
      { label: "Contact Type", value: "Form A (Normally Open NO)" },
      { label: "Contact Rating", value: "3A 250VAC" },
      { label: "Contact Resistance", value: "< 20 mΩ" },
      { label: "Insulation Resistance", value: "> 1000 MΩ" },
    ],
    simType: "SWITCH",
    renderIeeeSvg: (isConducting) => (
      <g stroke="#38bdf8" strokeWidth="2.2" fill="none" strokeLinecap="round">
        <line x1="8" y1="30" x2="30" y2="30" />
        <line x1="70" y1="30" x2="92" y2="30" />
        <circle cx="30" cy="30" r="3" fill="#090d16" stroke="#38bdf8" strokeWidth="2" />
        <circle cx="70" cy="30" r="3" fill="#090d16" stroke="#38bdf8" strokeWidth="2" />
        {/* Contact Lever */}
        {isConducting ? (
          <line x1="30" y1="30" x2="70" y2="30" stroke="#22c55e" strokeWidth="3" />
        ) : (
          <line x1="30" y1="30" x2="66" y2="16" stroke="#38bdf8" strokeWidth="2.4" />
        )}
      </g>
    ),
    renderIecSvg: (isConducting) => (
      <g stroke="#38bdf8" strokeWidth="2.2" fill="none" strokeLinecap="round">
        <line x1="8" y1="30" x2="30" y2="30" />
        <line x1="70" y1="30" x2="92" y2="30" />
        <circle cx="30" cy="30" r="3" fill="#090d16" stroke="#38bdf8" strokeWidth="2" />
        <circle cx="70" cy="30" r="3" fill="#090d16" stroke="#38bdf8" strokeWidth="2" />
        {isConducting ? (
          <line x1="30" y1="30" x2="70" y2="30" stroke="#22c55e" strokeWidth="3" />
        ) : (
          <line x1="30" y1="30" x2="66" y2="16" stroke="#38bdf8" strokeWidth="2.4" />
        )}
      </g>
    ),
  },

  // =========================================================================
  // 3. SEMICONDUCTORS (DIODES & TRANSISTORS WITH STRICT IEEE GEOMETRY)
  // =========================================================================
  {
    id: "DIODE_RECTIFIER",
    name: "PN Junction Diode (1N4007)",
    category: "SEMICONDUCTORS",
    standardIeeeName: "IEEE 315 Triangle Anode & Cathode Bar",
    standardIecName: "IEC 60617-5 Semiconductor Diode",
    ieeeDesignator: "D",
    iecDesignator: "V",
    icPartNumber: "1N4007 DO-41 (1000V 1A)",
    governingStandard: "IEEE Std 315 Sec 8.1 · IEC 60617-5:1996",
    equationOrFormula: "I = I_s · [exp(V_D / (n · V_T)) - 1]",
    spiceSyntax: "D1 N_ANODE N_CATHODE D1N4007",
    description: "Unidirectional semiconductor rectifier. Triangle points in the forward current conduction direction (Anode to Cathode). Perpendicular bar represents the N-type cathode barrier.",
    keySpecs: [
      { label: "Peak Reverse (VRRM)", value: "1000 V" },
      { label: "Forward Current (IF)", value: "1.0 A" },
      { label: "Forward Drop (VF)", value: "0.7V @ 1A" },
      { label: "Reverse Leakage", value: "< 5 µA" },
    ],
    simType: "DIODE",
    renderIeeeSvg: (isConducting) => (
      <g stroke="#38bdf8" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <line x1="8" y1="30" x2="38" y2="30" />
        <line x1="62" y1="30" x2="92" y2="30" />
        {/* Anode Triangle */}
        <polygon points="38,18 38,42 62,30" fill={isConducting ? "#38bdf8" : "rgba(56, 189, 248, 0.15)"} />
        {/* Cathode Bar */}
        <line x1="62" y1="18" x2="62" y2="42" strokeWidth="3" />
      </g>
    ),
    renderIecSvg: (isConducting) => (
      <g stroke="#38bdf8" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <line x1="8" y1="30" x2="38" y2="30" />
        <line x1="62" y1="30" x2="92" y2="30" />
        <polygon points="38,18 38,42 62,30" fill={isConducting ? "#38bdf8" : "rgba(56, 189, 248, 0.15)"} />
        <line x1="62" y1="18" x2="62" y2="42" strokeWidth="3" />
      </g>
    ),
  },
  {
    id: "LED",
    name: "Light Emitting Diode (LED)",
    category: "SEMICONDUCTORS",
    standardIeeeName: "IEEE 315 Diode with Dual Photon Emission Arrows",
    standardIecName: "IEC 60617-5 Optoelectronic Diode",
    ieeeDesignator: "D / LED",
    iecDesignator: "V",
    icPartNumber: "5mm T-1 3/4 Red / Green / Blue",
    governingStandard: "IEEE Std 315 Sec 8.1.3 · IEC 60617-5:1996",
    equationOrFormula: "E = h · ν = h · (c / λ)",
    spiceSyntax: "D_LED N_A N_K LED_MODEL",
    description: "Direct bandgap electroluminescent diode. Strictly uses the IEEE diode triangle and cathode bar with two parallel outward radiation arrows pointing upper-right (NO circular bulbs).",
    keySpecs: [
      { label: "Forward Voltage (Red)", value: "1.8V – 2.1V" },
      { label: "Forward Voltage (Green)", value: "2.1V – 2.4V" },
      { label: "Nominal Current", value: "10mA – 20mA" },
      { label: "Luminous Intensity", value: "2000 mcd" },
    ],
    simType: "DIODE",
    renderIeeeSvg: (isConducting) => (
      <g stroke="#38bdf8" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <line x1="8" y1="30" x2="36" y2="30" />
        <line x1="60" y1="30" x2="92" y2="30" />
        <polygon points="36,18 36,42 60,30" fill={isConducting ? "#22c55e" : "rgba(34, 197, 94, 0.15)"} stroke="#22c55e" />
        <line x1="60" y1="18" x2="60" y2="42" stroke="#22c55e" strokeWidth="3" />
        {/* Dual Photon Emission Arrows */}
        <line x1="48" y1="16" x2="56" y2="8" stroke={isConducting ? "#ffffff" : "#22c55e"} strokeWidth="1.8" />
        <polygon points="56,8 52,9 55,12" fill={isConducting ? "#ffffff" : "#22c55e"} stroke="none" />
        <line x1="56" y1="18" x2="64" y2="10" stroke={isConducting ? "#ffffff" : "#22c55e"} strokeWidth="1.8" />
        <polygon points="64,10 60,11 63,14" fill={isConducting ? "#ffffff" : "#22c55e"} stroke="none" />
      </g>
    ),
    renderIecSvg: (isConducting) => (
      <g stroke="#38bdf8" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <line x1="8" y1="30" x2="36" y2="30" />
        <line x1="60" y1="30" x2="92" y2="30" />
        <polygon points="36,18 36,42 60,30" fill={isConducting ? "#22c55e" : "rgba(34, 197, 94, 0.15)"} stroke="#22c55e" />
        <line x1="60" y1="18" x2="60" y2="42" stroke="#22c55e" strokeWidth="3" />
        <line x1="48" y1="16" x2="56" y2="8" stroke={isConducting ? "#ffffff" : "#22c55e"} strokeWidth="1.8" />
        <polygon points="56,8 52,9 55,12" fill={isConducting ? "#ffffff" : "#22c55e"} stroke="none" />
        <line x1="56" y1="18" x2="64" y2="10" stroke={isConducting ? "#ffffff" : "#22c55e"} strokeWidth="1.8" />
        <polygon points="64,10 60,11 63,14" fill={isConducting ? "#ffffff" : "#22c55e"} stroke="none" />
      </g>
    ),
  },
  {
    id: "BJT_NPN",
    name: "NPN Bipolar Junction Transistor",
    category: "SEMICONDUCTORS",
    standardIeeeName: "IEEE 315 Linear NPN (No Vintage Circle)",
    standardIecName: "IEC 60617-5 Bipolar Transistor NPN",
    ieeeDesignator: "Q",
    iecDesignator: "V",
    icPartNumber: "BC547B / 2N2222A TO-92",
    governingStandard: "IEEE Std 315 Sec 8.4 · IEC 60617-5:1996",
    equationOrFormula: "I_C = β · I_B  ·  I_E = I_C + I_B",
    spiceSyntax: "Q1 N_C N_B N_E QBC547B",
    description: "Current-controlled amplifier/switch. Strictly linear IEEE standard symbol with heavy Base bar, Collector terminal, and Emitter arrow pointing outwards away from the base (outer circle removed).",
    keySpecs: [
      { label: "DC Current Gain (hFE)", value: "200 – 450" },
      { label: "Collector Current (IC)", value: "100 mA (BC547), 800 mA (2N2222)" },
      { label: "Vce Saturation", value: "0.2 V" },
      { label: "Transition Freq (fT)", value: "300 MHz" },
    ],
    simType: "TRANSISTOR",
    renderIeeeSvg: () => (
      <g stroke="#38bdf8" strokeWidth="2.2" fill="none" strokeLinecap="round">
        {/* Base Terminal & Heavy Bar */}
        <line x1="8" y1="30" x2="36" y2="30" />
        <line x1="36" y1="16" x2="36" y2="44" strokeWidth="3.6" />
        {/* Collector */}
        <line x1="36" y1="22" x2="68" y2="10" strokeWidth="2.2" />
        <line x1="68" y1="10" x2="92" y2="10" strokeWidth="2.2" />
        {/* Emitter with Outward Arrow */}
        <line x1="36" y1="38" x2="68" y2="50" strokeWidth="2.2" />
        <line x1="68" y1="50" x2="92" y2="50" strokeWidth="2.2" />
        <polygon points="68,50 60,42 63,48" fill="#38bdf8" stroke="none" />
        {/* Pin tags */}
        <text x="30" y="24" fill="#94a3b8" stroke="none" fontFamily="monospace" fontSize="8" fontWeight="bold">B</text>
        <text x="74" y="8" fill="#94a3b8" stroke="none" fontFamily="monospace" fontSize="8" fontWeight="bold">C</text>
        <text x="74" y="58" fill="#94a3b8" stroke="none" fontFamily="monospace" fontSize="8" fontWeight="bold">E</text>
      </g>
    ),
    renderIecSvg: () => (
      <g stroke="#38bdf8" strokeWidth="2.2" fill="none" strokeLinecap="round">
        <line x1="8" y1="30" x2="36" y2="30" />
        <line x1="36" y1="16" x2="36" y2="44" strokeWidth="3.6" />
        <line x1="36" y1="22" x2="68" y2="10" strokeWidth="2.2" />
        <line x1="68" y1="10" x2="92" y2="10" strokeWidth="2.2" />
        <line x1="36" y1="38" x2="68" y2="50" strokeWidth="2.2" />
        <line x1="68" y1="50" x2="92" y2="50" strokeWidth="2.2" />
        <polygon points="68,50 60,42 63,48" fill="#38bdf8" stroke="none" />
        <text x="30" y="24" fill="#94a3b8" stroke="none" fontFamily="monospace" fontSize="8" fontWeight="bold">B</text>
        <text x="74" y="8" fill="#94a3b8" stroke="none" fontFamily="monospace" fontSize="8" fontWeight="bold">C</text>
        <text x="74" y="58" fill="#94a3b8" stroke="none" fontFamily="monospace" fontSize="8" fontWeight="bold">E</text>
      </g>
    ),
  },

  // =========================================================================
  // 4. POWER SOURCES & GROUND REFERENCES
  // =========================================================================
  {
    id: "EARTH_GROUND",
    name: "Earth Ground (Zero-Volt Reference)",
    category: "SOURCES_GROUNDS",
    standardIeeeName: "IEEE 315 Earth Ground (3 Descending Bars)",
    standardIecName: "IEC 60617-2 Earth Ground",
    ieeeDesignator: "GND / ⏚",
    iecDesignator: "PE",
    icPartNumber: "Direct Earth Electrode Stake",
    governingStandard: "IEEE Std 315 Sec 3.9 · IEC 60617-2:1996",
    equationOrFormula: "V_ref = 0.00 V (Absolute Reference)",
    spiceSyntax: "0 (Node Zero in SPICE)",
    description: "Direct electrical connection to the earth mass for protective earthing and lightning discharge. Strictly 3 descending horizontal parallel bars centered on vertical stem.",
    keySpecs: [
      { label: "Potential", value: "0.000 V (Datum)" },
      { label: "SPICE Node", value: "Node 0 (MNA Global Datum)" },
      { label: "Impedance to Soil", value: "< 5 Ω" },
      { label: "Safety Standard", value: "NEC / IEC 60364 PE" },
    ],
    simType: "PASSIVE_R",
    renderIeeeSvg: () => (
      <g stroke="#38bdf8" strokeWidth="2.4" fill="none" strokeLinecap="round">
        <line x1="50" y1="8" x2="50" y2="30" />
        {/* 3 Descending Horizontal Plates */}
        <line x1="25" y1="30" x2="75" y2="30" strokeWidth="3" />
        <line x1="33" y1="38" x2="67" y2="38" strokeWidth="2.4" />
        <line x1="42" y1="46" x2="58" y2="46" strokeWidth="1.8" />
      </g>
    ),
    renderIecSvg: () => (
      <g stroke="#38bdf8" strokeWidth="2.4" fill="none" strokeLinecap="round">
        <line x1="50" y1="8" x2="50" y2="30" />
        <line x1="25" y1="30" x2="75" y2="30" strokeWidth="3" />
        <line x1="33" y1="38" x2="67" y2="38" strokeWidth="2.4" />
        <line x1="42" y1="46" x2="58" y2="46" strokeWidth="1.8" />
      </g>
    ),
  },
  {
    id: "CHASSIS_GROUND",
    name: "Chassis / Frame Ground",
    category: "SOURCES_GROUNDS",
    standardIeeeName: "IEEE 315 Chassis Ground (Fork / Rake)",
    standardIecName: "IEC 60617-2 Frame or Chassis Connection",
    ieeeDesignator: "GND_CHASSIS",
    iecDesignator: "GND",
    icPartNumber: "Metal Enclosure Lug",
    governingStandard: "IEEE Std 315 Sec 3.9.2 · IEC 60617-2:1996",
    equationOrFormula: "Enclosure Common Bonding",
    spiceSyntax: "R_BOND N_CHASSIS 0 0.01",
    description: "Conductive connection to the equipment chassis, metal enclosure, or vehicle frame. IEEE specifies a horizontal bar with three 45° diagonal downward rake stripes.",
    keySpecs: [
      { label: "Application", value: "Metal Enclosure Shielding" },
      { label: "Bonding Path", value: "EMI/RFI Faraday Cage" },
      { label: "Fault Safety", value: "Trips breaker on hot-chassis fault" },
      { label: "Symbol Style", value: "Rake / Fork Stripes" },
    ],
    simType: "PASSIVE_R",
    renderIeeeSvg: () => (
      <g stroke="#38bdf8" strokeWidth="2.4" fill="none" strokeLinecap="round">
        <line x1="50" y1="10" x2="50" y2="30" />
        <line x1="26" y1="30" x2="74" y2="30" strokeWidth="3" />
        {/* 3 Diagonal Stripes */}
        <line x1="36" y1="30" x2="28" y2="44" strokeWidth="2.2" />
        <line x1="50" y1="30" x2="42" y2="44" strokeWidth="2.2" />
        <line x1="64" y1="30" x2="56" y2="44" strokeWidth="2.2" />
      </g>
    ),
    renderIecSvg: () => (
      <g stroke="#38bdf8" strokeWidth="2.4" fill="none" strokeLinecap="round">
        <line x1="50" y1="10" x2="50" y2="30" />
        <line x1="26" y1="30" x2="74" y2="30" strokeWidth="3" />
        <line x1="36" y1="30" x2="28" y2="44" strokeWidth="2.2" />
        <line x1="50" y1="30" x2="42" y2="44" strokeWidth="2.2" />
        <line x1="64" y1="30" x2="56" y2="44" strokeWidth="2.2" />
      </g>
    ),
  },
  {
    id: "DC_SOURCE",
    name: "DC Voltage Source (Battery / Linear Supply)",
    category: "SOURCES_GROUNDS",
    standardIeeeName: "IEEE 315 Long (+) & Short Thick (-) Plates",
    standardIecName: "IEC 60617-2 Ideal Direct Voltage Source",
    ieeeDesignator: "V / BAT",
    iecDesignator: "G",
    icPartNumber: "5.0V Precision Regulated DC Supply",
    governingStandard: "IEEE Std 315 Sec 6.4 · IEC 60617-2:1996",
    equationOrFormula: "V(t) = V_DC (Constant)",
    spiceSyntax: "V1 N_POS N_NEG DC 5.0",
    description: "Provides fixed constant electromotive force. In IEEE 315, represented by parallel long-thin positive plate and short-thick negative plate with polarity indicators.",
    keySpecs: [
      { label: "Nominal Output", value: "+5.00 V DC" },
      { label: "Source Impedance", value: "0.01 Ω" },
      { label: "Ripple & Noise", value: "< 2 mV RMS" },
      { label: "Current Limit", value: "3.0 A" },
    ],
    simType: "PASSIVE_R",
    defaultParam: 5.0,
    unit: "V",
    renderIeeeSvg: () => (
      <g stroke="#38bdf8" strokeWidth="2.2" fill="none" strokeLinecap="round">
        <line x1="50" y1="8" x2="50" y2="24" />
        <line x1="50" y1="36" x2="50" y2="52" />
        {/* Long thin positive plate */}
        <line x1="28" y1="24" x2="72" y2="24" strokeWidth="3" />
        {/* Short thick negative plate */}
        <line x1="38" y1="36" x2="62" y2="36" strokeWidth="4.5" />
        <text x="75" y="22" fill="#38bdf8" stroke="none" fontFamily="monospace" fontSize="12" fontWeight="bold">
          +
        </text>
        <text x="75" y="44" fill="#94a3b8" stroke="none" fontFamily="monospace" fontSize="12" fontWeight="bold">
          -
        </text>
      </g>
    ),
    renderIecSvg: () => (
      <g stroke="#38bdf8" strokeWidth="2.2" fill="none" strokeLinecap="round">
        <line x1="50" y1="8" x2="50" y2="18" />
        <line x1="50" y1="42" x2="50" y2="52" />
        <circle cx="50" cy="30" r="12" fill="rgba(56, 189, 248, 0.08)" />
        <line x1="42" y1="30" x2="58" y2="30" stroke="#22d3ee" strokeWidth="2" />
        <line x1="50" y1="22" x2="50" y2="38" stroke="#22d3ee" strokeWidth="2" />
      </g>
    ),
  },
  {
    id: "AC_SOURCE",
    name: "AC Alternating Voltage Generator",
    category: "SOURCES_GROUNDS",
    standardIeeeName: "IEEE 315 Circle with Internal Sine Wave",
    standardIecName: "IEC 60617-2 Ideal Alternating Voltage Source",
    ieeeDesignator: "V_AC",
    iecDesignator: "G",
    icPartNumber: "Arbitrary Waveform Generator (1kHz 5Vpk)",
    governingStandard: "IEEE Std 315 Sec 6.4.2 · IEC 60617-2:1996",
    equationOrFormula: "v(t) = V_pk · sin(2π f t + θ)",
    spiceSyntax: "V_AC N_1 N_2 SIN(0 5 1k)",
    description: "Sinusoidal alternating voltage source. Standard symbol consists of a circle enclosing a clean single-period sine wave glyph '~'.",
    keySpecs: [
      { label: "Amplitude (Vpk)", value: "5.00 V" },
      { label: "RMS Voltage", value: "3.54 V RMS" },
      { label: "Frequency", value: "1.00 kHz" },
      { label: "Period (T)", value: "1.00 ms" },
    ],
    simType: "PASSIVE_R",
    defaultParam: 1000,
    unit: "Hz",
    renderIeeeSvg: () => (
      <g stroke="#38bdf8" strokeWidth="2.2" fill="none" strokeLinecap="round">
        <line x1="8" y1="30" x2="32" y2="30" />
        <line x1="68" y1="30" x2="92" y2="30" />
        <circle cx="50" cy="30" r="18" fill="rgba(56, 189, 248, 0.08)" />
        {/* Sine wave glyph */}
        <path d="M 38 30 Q 44 20 50 30 Q 56 40 62 30" strokeWidth="2.4" />
      </g>
    ),
    renderIecSvg: () => (
      <g stroke="#38bdf8" strokeWidth="2.2" fill="none" strokeLinecap="round">
        <line x1="8" y1="30" x2="32" y2="30" />
        <line x1="68" y1="30" x2="92" y2="30" />
        <circle cx="50" cy="30" r="18" fill="rgba(56, 189, 248, 0.08)" />
        <path d="M 38 30 Q 44 20 50 30 Q 56 40 62 30" strokeWidth="2.4" />
      </g>
    ),
  },

  // =========================================================================
  // 5. PRECISION MEASUREMENT EQUIPMENT (PME) METERS (IEEE 315 & IEC 60617)
  // =========================================================================
  {
    id: "VOLTMETER",
    name: "Digital Voltmeter (DVM)",
    category: "METERS",
    standardIeeeName: "IEEE 315 Circle 'V' (Parallel Potential)",
    standardIecName: "IEC 60617-8 Indicating Voltmeter",
    ieeeDesignator: "V / M",
    iecDesignator: "P",
    icPartNumber: "Precision DVM (10MΩ high-Z)",
    governingStandard: "IEEE Std 315-1975 Sec 10 · IEC 60617-8:1996",
    equationOrFormula: "ΔV = V_Red - V_Black = I_loop · R_load",
    spiceSyntax: "V_SENSE N_POS N_NEG 0V (or high-Z 10MEG)",
    description: "Measures electrostatic potential difference across two circuit nodes. PME Laboratory Standard requires PARALLEL connection across load terminals. Internal resistance is 10 MΩ (near-infinite) to prevent loading. NEVER wire in series, or it chokes loop current to zero.",
    keySpecs: [
      { label: "Placement", value: "PARALLEL across load" },
      { label: "Internal Impedance", value: "10 MΩ (Near-Infinite)" },
      { label: "Metrology Rule", value: "ΔV = V_Red - V_Black" },
      { label: "Series Fault", value: "Chokes load current (Open loop)" },
    ],
    simType: "METER",
    defaultParam: 5.0,
    unit: "V",
    renderIeeeSvg: () => (
      <g stroke="#38bdf8" strokeWidth="2.2" fill="none" strokeLinecap="round">
        <line x1="8" y1="30" x2="32" y2="30" />
        <line x1="68" y1="30" x2="92" y2="30" />
        <circle cx="50" cy="30" r="18" fill="rgba(56, 189, 248, 0.12)" stroke="#38bdf8" strokeWidth="2.4" />
        <text x="50" y="36" fill="#38bdf8" stroke="none" fontFamily="monospace" fontSize="16" fontWeight="bold" textAnchor="middle">
          V
        </text>
        <text x="20" y="24" fill="#ef4444" stroke="none" fontFamily="monospace" fontSize="9" fontWeight="bold">+</text>
        <text x="80" y="24" fill="#94a3b8" stroke="none" fontFamily="monospace" fontSize="9" fontWeight="bold">-</text>
      </g>
    ),
    renderIecSvg: () => (
      <g stroke="#38bdf8" strokeWidth="2.2" fill="none" strokeLinecap="round">
        <line x1="8" y1="30" x2="32" y2="30" />
        <line x1="68" y1="30" x2="92" y2="30" />
        <circle cx="50" cy="30" r="18" fill="rgba(56, 189, 248, 0.12)" stroke="#38bdf8" strokeWidth="2.4" />
        <text x="50" y="36" fill="#38bdf8" stroke="none" fontFamily="monospace" fontSize="16" fontWeight="bold" textAnchor="middle">
          V
        </text>
      </g>
    ),
  },
  {
    id: "AMMETER",
    name: "In-Line Ammeter (Current Meter)",
    category: "METERS",
    standardIeeeName: "IEEE 315 Circle 'A' (Series Loop)",
    standardIecName: "IEC 60617-8 Indicating Ammeter",
    ieeeDesignator: "A / M",
    iecDesignator: "P",
    icPartNumber: "Precision Ammeter (0.001Ω Shunt)",
    governingStandard: "IEEE Std 315-1975 Sec 10 · IEC 60617-8:1996",
    equationOrFormula: "I = dq/dt = ΔV / R_load (Series Loop)",
    spiceSyntax: "V_AMPS N_IN N_OUT 0V (0V DC source shunt)",
    description: "Measures flow rate of electric charge. PME Laboratory Standard requires IN-SERIES connection by breaking the circuit branch: current enters I_IN (+) and leaves I_OUT (-) to load. Internal shunt is 0.001 Ω. NEVER wire in parallel across a power source (causes a DEAD SHORT CIRCUIT).",
    keySpecs: [
      { label: "Placement", value: "IN SERIES with load" },
      { label: "Internal Shunt", value: "0.001 Ω (Near-Zero)" },
      { label: "Metrology Rule", value: "KCL Series Pass" },
      { label: "Parallel Fault", value: "Dead short circuit hazard" },
    ],
    simType: "METER",
    defaultParam: 15.0,
    unit: "mA",
    renderIeeeSvg: () => (
      <g stroke="#10b981" strokeWidth="2.2" fill="none" strokeLinecap="round">
        <line x1="8" y1="30" x2="32" y2="30" />
        <line x1="68" y1="30" x2="92" y2="30" />
        <circle cx="50" cy="30" r="18" fill="rgba(16, 185, 129, 0.12)" stroke="#10b981" strokeWidth="2.4" />
        <text x="50" y="36" fill="#10b981" stroke="none" fontFamily="monospace" fontSize="16" fontWeight="bold" textAnchor="middle">
          A
        </text>
        <polygon points="76,30 70,27 70,33" fill="#10b981" stroke="none" />
      </g>
    ),
    renderIecSvg: () => (
      <g stroke="#10b981" strokeWidth="2.2" fill="none" strokeLinecap="round">
        <line x1="8" y1="30" x2="32" y2="30" />
        <line x1="68" y1="30" x2="92" y2="30" />
        <circle cx="50" cy="30" r="18" fill="rgba(16, 185, 129, 0.12)" stroke="#10b981" strokeWidth="2.4" />
        <text x="50" y="36" fill="#10b981" stroke="none" fontFamily="monospace" fontSize="16" fontWeight="bold" textAnchor="middle">
          A
        </text>
      </g>
    ),
  },
  {
    id: "OHMMETER",
    name: "Digital Ohmmeter (Resistance Meter)",
    category: "METERS",
    standardIeeeName: "IEEE 315 Circle 'Ω' (De-Energized Only)",
    standardIecName: "IEC 60617-8 Indicating Ohmmeter",
    ieeeDesignator: "Ω / M",
    iecDesignator: "P",
    icPartNumber: "Precision Ohmmeter (Auto-Range)",
    governingStandard: "IEEE Std 315-1975 Sec 10 · IEC 60617-8:1996",
    equationOrFormula: "R = V_test / I_test (0V external power)",
    spiceSyntax: ".MEAS TRAN R_OHMS PARAM='V(DUT)/I(TEST)'",
    description: "Measures electrical resistance of a component. PME Laboratory Standard STRICTLY requires circuit power to be COMPLETELY OFF (0V). The meter injects its own micro-current to determine resistance. Measuring an energized circuit destroys real meter circuitry and triggers a LIVE CKT alarm.",
    keySpecs: [
      { label: "Placement", value: "Across de-energized DUT" },
      { label: "Circuit State", value: "MUST BE POWERED OFF (0V)" },
      { label: "Open Probes", value: "Displays O.L. MΩ" },
      { label: "Live Fault", value: "Destroys meter A/D input" },
    ],
    simType: "METER",
    defaultParam: 1000,
    unit: "Ω",
    renderIeeeSvg: () => (
      <g stroke="#f59e0b" strokeWidth="2.2" fill="none" strokeLinecap="round">
        <line x1="8" y1="30" x2="32" y2="30" />
        <line x1="68" y1="30" x2="92" y2="30" />
        <circle cx="50" cy="30" r="18" fill="rgba(245, 158, 11, 0.12)" stroke="#f59e0b" strokeWidth="2.4" />
        <text x="50" y="36" fill="#f59e0b" stroke="none" fontFamily="monospace" fontSize="16" fontWeight="bold" textAnchor="middle">
          Ω
        </text>
      </g>
    ),
    renderIecSvg: () => (
      <g stroke="#f59e0b" strokeWidth="2.2" fill="none" strokeLinecap="round">
        <line x1="8" y1="30" x2="32" y2="30" />
        <line x1="68" y1="30" x2="92" y2="30" />
        <circle cx="50" cy="30" r="18" fill="rgba(245, 158, 11, 0.12)" stroke="#f59e0b" strokeWidth="2.4" />
        <text x="50" y="36" fill="#f59e0b" stroke="none" fontFamily="monospace" fontSize="16" fontWeight="bold" textAnchor="middle">
          Ω
        </text>
      </g>
    ),
  },
  {
    id: "POWER_METER",
    name: "Digital Wattmeter (Active Power Meter)",
    category: "METERS",
    standardIeeeName: "IEEE 315 Circle 'W' (Dual-Coil)",
    standardIecName: "IEC 60617-8 Indicating Wattmeter",
    ieeeDesignator: "W / M",
    iecDesignator: "P",
    icPartNumber: "Precision Wattmeter (Dual-Coil 4-Terminal)",
    governingStandard: "IEEE Std 315-1975 Sec 10 · IEC 60617-8:1996",
    equationOrFormula: "P = V_drop · I_loop = I²R = V²/R",
    spiceSyntax: ".MEAS TRAN P_REAL AVG 'V(L_P,L_N)*I(V_SENSE)'",
    description: "Measures active real power dissipated in Watts/milliwatts. Requires 4 terminals: Voltage Coil (V+, V-) in parallel across the load, and Current Coil (I_IN, I_OUT) in series with the load current loop. Both coils must be active; if either is disconnected, reading is 0W.",
    keySpecs: [
      { label: "Configuration", value: "4-Terminal Dual-Coil" },
      { label: "Voltage Coil", value: "10 MΩ in PARALLEL" },
      { label: "Current Coil", value: "0.001 Ω in SERIES" },
      { label: "Missing Coil", value: "Reads 0W if coil open" },
    ],
    simType: "METER",
    defaultParam: 25.0,
    unit: "mW",
    renderIeeeSvg: () => (
      <g stroke="#a855f7" strokeWidth="2.2" fill="none" strokeLinecap="round">
        <line x1="8" y1="30" x2="32" y2="30" />
        <line x1="68" y1="30" x2="92" y2="30" />
        <circle cx="50" cy="30" r="18" fill="rgba(168, 85, 247, 0.12)" stroke="#a855f7" strokeWidth="2.4" />
        <text x="50" y="36" fill="#a855f7" stroke="none" fontFamily="monospace" fontSize="16" fontWeight="bold" textAnchor="middle">
          W
        </text>
        <circle cx="50" cy="12" r="2.5" fill="#38bdf8" stroke="none" />
        <circle cx="50" cy="48" r="2.5" fill="#38bdf8" stroke="none" />
      </g>
    ),
    renderIecSvg: () => (
      <g stroke="#a855f7" strokeWidth="2.2" fill="none" strokeLinecap="round">
        <line x1="8" y1="30" x2="32" y2="30" />
        <line x1="68" y1="30" x2="92" y2="30" />
        <circle cx="50" cy="30" r="18" fill="rgba(168, 85, 247, 0.12)" stroke="#a855f7" strokeWidth="2.4" />
        <text x="50" y="36" fill="#a855f7" stroke="none" fontFamily="monospace" fontSize="16" fontWeight="bold" textAnchor="middle">
          W
        </text>
      </g>
    ),
  },
];

function standardSymbolToPinoutData(
  item: StandardSymbolItem,
  standard: StandardStandardType
): PinoutPopoverData {
  let terminals: ComponentTerminal[];
  let isPolarized = false;

  if (item.category === "GATES") {
    const ins = item.inputsCount === 1 ? ["A"] : ["A", "B"];
    terminals = [
      ...ins.map((ch, idx) => ({
        name: `IN_${ch}`,
        pinNumber: idx + 1,
        label: `Input ${ch}`,
        side: "left" as const,
        description: `Logic Input ${ch}`,
      })),
      {
        name: "OUT_Y",
        pinNumber: ins.length + 1,
        label: "Output Y",
        side: "right",
        description: item.equationOrFormula,
      },
    ];
  } else if (item.id === "POTENTIOMETER") {
    terminals = [
      { name: "CCW", pinNumber: 1, label: "Term 1 (CCW)", side: "left", description: "Fixed resistive track end 1" },
      { name: "WIPER", pinNumber: 2, label: "Wiper (W)", side: "bottom", description: "Variable sliding wiper tap" },
      { name: "CW", pinNumber: 3, label: "Term 3 (CW)", side: "right", description: "Fixed resistive track end 2" },
    ];
  } else if (item.id === "CAP_ELECTROLYTIC" || item.id === "DIODE_RECTIFIER" || item.id === "LED") {
    isPolarized = true;
    terminals = [
      { name: "ANODE", pinNumber: 1, label: "Anode (+)", polarity: "ANODE", side: "left", description: "Positive lead (+)" },
      { name: "CATHODE", pinNumber: 2, label: "Cathode (-)", polarity: "CATHODE", side: "right", description: "Negative lead (-)" },
    ];
  } else if (item.id === "TRANSFORMER") {
    terminals = [
      { name: "PRI1", pinNumber: 1, label: "Primary L", side: "left", description: "Primary winding live" },
      { name: "PRI2", pinNumber: 2, label: "Primary N", side: "left", description: "Primary winding return" },
      { name: "SEC1", pinNumber: 3, label: "Secondary +", side: "right", description: "Secondary winding terminal 1" },
      { name: "SEC2", pinNumber: 4, label: "Secondary -", side: "right", description: "Secondary winding terminal 2" },
    ];
  } else if (item.id === "BJT_NPN") {
    isPolarized = true;
    terminals = [
      { name: "BASE", pinNumber: 2, label: "Base (B)", polarity: "BASE", side: "left", description: "Control base terminal" },
      { name: "COLLECTOR", pinNumber: 1, label: "Collector (C)", polarity: "COLLECTOR", side: "right", description: "Collector current sink" },
      { name: "EMITTER", pinNumber: 3, label: "Emitter (E)", polarity: "EMITTER", side: "bottom", description: "Emitter reference (arrow out)" },
    ];
  } else if (item.id === "EARTH_GROUND" || item.id === "CHASSIS_GROUND") {
    terminals = [
      { name: "GND", pinNumber: 1, label: "0V Reference", polarity: "NEGATIVE", side: "top", description: "Circuit reference node (0.0 V)" },
    ];
  } else if (item.id === "DC_SOURCE" || item.id === "AC_SOURCE") {
    isPolarized = item.id === "DC_SOURCE";
    terminals = [
      { name: "POS", pinNumber: 1, label: item.id === "DC_SOURCE" ? "+ Positive" : "~ Phase", polarity: "POSITIVE", side: "left", description: "Source high potential terminal" },
      { name: "NEG", pinNumber: 2, label: item.id === "DC_SOURCE" ? "- Return" : "~ Return", polarity: "NEGATIVE", side: "right", description: "Source return terminal" },
    ];
  } else if (item.id === "POWER_METER") {
    isPolarized = true;
    terminals = [
      { name: "V_POS", pinNumber: 1, label: "V+ (Shunt)", polarity: "POSITIVE", side: "left", description: "Voltage sense high (parallel)" },
      { name: "I_IN", pinNumber: 2, label: "I In (Series)", side: "left", description: "Current coil input (series)" },
      { name: "V_NEG", pinNumber: 3, label: "V- (COM)", polarity: "NEGATIVE", side: "right", description: "Voltage common return" },
      { name: "I_OUT", pinNumber: 4, label: "I Out (Load)", side: "right", description: "Current coil output to load" },
    ];
  } else if (item.category === "METERS") {
    isPolarized = true;
    terminals = [
      { name: "POS", pinNumber: 1, label: "+ Probe", polarity: "POSITIVE", side: "left", description: "Positive meter lead" },
      { name: "COM", pinNumber: 2, label: "- COM", polarity: "NEGATIVE", side: "right", description: "Common return lead" },
    ];
  } else {
    terminals = [
      { name: "T1", pinNumber: 1, label: "Terminal 1", side: "left", description: "Non-polarized lead 1" },
      { name: "T2", pinNumber: 2, label: "Terminal 2", side: "right", description: "Non-polarized lead 2" },
    ];
  }

  return {
    id: `STD_${item.id}`,
    name: item.name,
    partNumber: item.icPartNumber || `${item.ieeeDesignator} / ${item.iecDesignator}`,
    packageLabel: item.governingStandard.split("·")[0].trim(),
    isPolarized,
    terminals,
    symbolNode: standard === "IEC_60617" ? item.renderIecSvg(true) : item.renderIeeeSvg(true),
    note: item.equationOrFormula,
  };
}

interface StandardComponentLibraryProps {
  onSelectComponentToPlace?: (compId: string, standard: "IEEE_315" | "IEC_60617") => void;
  onNavigateToBreadboard?: (compId: string) => void;
}

export default function StandardComponentLibrary({
  onSelectComponentToPlace,
  onNavigateToBreadboard,
}: StandardComponentLibraryProps) {
  const [selectedStandard, setSelectedStandard] = useState<StandardStandardType>("SIDE_BY_SIDE");
  const [selectedCategory, setSelectedCategory] = useState<LibraryCategory>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedComponentId, setSelectedComponentId] = useState<string>("AND");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [hoveredPinout, setHoveredPinout] = useState<{
    item: StandardSymbolItem;
    rect: DOMRect;
  } | null>(null);

  useEffect(() => {
    if (!hoveredPinout) return;
    const dismiss = () => setHoveredPinout(null);
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    window.addEventListener("scroll", dismiss, true);
    window.addEventListener("resize", dismiss);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("scroll", dismiss, true);
      window.removeEventListener("resize", dismiss);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [hoveredPinout]);

  // Interactive Gate Test Bench State
  const [activeGateInputs, setActiveGateInputs] = useState<Record<string, number[]>>({
    AND: [1, 1],
    NAND: [1, 0],
    OR: [0, 1],
    NOR: [0, 0],
    XOR: [1, 0],
    XNOR: [1, 1],
    NOT: [0],
    BUFFER: [1],
  });

  // Interactive Passive Slider State
  const [passiveParams, setPassiveParams] = useState<Record<string, number>>({
    RES_FIXED: 1000,
    POTENTIOMETER: 5000,
    CAP_CERAMIC: 100, // nF
    CAP_ELECTROLYTIC: 10, // µF
    INDUCTOR_AIR: 10, // mH
    INDUCTOR_FERRITE: 47, // mH
    TRANSFORMER: 10, // turns ratio
    FUSE: 2.0, // A
    SWITCH_SPST: 1, // closed
    DIODE_RECTIFIER: 0.7, // V drop
    LED: 2.0, // V
    DC_SOURCE: 5.0, // V
    AC_SOURCE: 1000, // Hz
  });

  const filteredComponents = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return STANDARD_COMPONENTS_DATA.filter((comp) => {
      const matchCat = selectedCategory === "ALL" || comp.category === selectedCategory;
      if (!matchCat) return false;
      if (!q) return true;
      return (
        comp.name.toLowerCase().includes(q) ||
        comp.id.toLowerCase().includes(q) ||
        comp.governingStandard.toLowerCase().includes(q) ||
        comp.equationOrFormula.toLowerCase().includes(q) ||
        comp.description.toLowerCase().includes(q) ||
        comp.icPartNumber?.toLowerCase().includes(q)
      );
    });
  }, [selectedCategory, searchQuery]);

  const activeComponent = useMemo(() => {
    return STANDARD_COMPONENTS_DATA.find((c) => c.id === selectedComponentId) || STANDARD_COMPONENTS_DATA[0];
  }, [selectedComponentId]);

  const handleCopySpice = (spiceText: string, id: string) => {
    navigator.clipboard.writeText(spiceText);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleToggleGateBit = (gateId: string, bitIdx: number) => {
    setActiveGateInputs((prev) => {
      const current = prev[gateId] ? [...prev[gateId]] : [0, 0];
      current[bitIdx] = current[bitIdx] === 1 ? 0 : 1;
      return { ...prev, [gateId]: current };
    });
  };

  // Evaluate current gate output
  const currentGateOut = useMemo(() => {
    if (activeComponent.category !== "GATES") return 0;
    const ins = activeGateInputs[activeComponent.id] || [0, 0];
    const a = ins[0] ?? 0;
    const b = ins[1] ?? 0;
    switch (activeComponent.id) {
      case "AND": return a & b;
      case "NAND": return (a & b) ^ 1;
      case "OR": return a | b;
      case "NOR": return (a | b) ^ 1;
      case "XOR": return a ^ b;
      case "XNOR": return (a ^ b) ^ 1;
      case "NOT": return a ^ 1;
      case "BUFFER": return a;
      default: return 0;
    }
  }, [activeComponent, activeGateInputs]);

  return (
    <div className="space-y-6 text-[#E6EDF8]">
      {/* Top Banner & Standard Specification Header */}
      <div className="bg-[#111827] border border-[#26365c] rounded-2xl p-5 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs font-mono text-cyan-400 font-bold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>IEEE 315 / ANSI Y32.2 &amp; IEC 60617 STANDARD REPOSITORY</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white mt-1 tracking-tight">
              Standardized Visual Component &amp; Logic Gate Library
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-3xl leading-relaxed">
              Strict mathematical and geometric enforcement of IEEE Std 315-1975 (distinctive-shape symbols &amp; sharp zig-zags)
              and IEC 60617-12 / EN 60617 (international rectangular qualifiers). Every non-standard or generic box shape has been
              replaced with certified engineering vector geometries.
            </p>
          </div>

          {/* Standard Enforcement 3-Way Mode Switcher */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-400 font-semibold hidden md:inline">
              Standard View:
            </span>
            <div className="flex items-center bg-slate-900 border border-slate-700/80 rounded-xl p-1 shadow-inner text-xs font-mono">
              <button
                type="button"
                onClick={() => setSelectedStandard("IEEE_315")}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  selectedStandard === "IEEE_315"
                    ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20 font-black"
                    : "text-slate-400 hover:text-white"
                }`}
                title="IEEE Std 315 / ANSI Y32.2 (Distinctive curved logic gates and sharp zig-zag resistors)"
              >
                IEEE Std 315
              </button>
              <button
                type="button"
                onClick={() => setSelectedStandard("IEC_60617")}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  selectedStandard === "IEC_60617"
                    ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20 font-black"
                    : "text-slate-400 hover:text-white"
                }`}
                title="IEC 60617 / EN 60617 (European rectangular box gates with &, ≥1, =1 qualifiers)"
              >
                IEC 60617
              </button>
              <button
                type="button"
                onClick={() => setSelectedStandard("SIDE_BY_SIDE")}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  selectedStandard === "SIDE_BY_SIDE"
                    ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20 font-black"
                    : "text-slate-400 hover:text-white"
                }`}
                title="Side-by-Side Dual Comparison Mode"
              >
                Dual Comparison
              </button>
            </div>
          </div>
        </div>

        {/* Filter Categories Bar & Search Input */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 pt-4 mt-4 border-t border-slate-800">
          {/* Category Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
            {[
              { id: "ALL" as LibraryCategory, label: "All Standard Components" },
              { id: "GATES" as LibraryCategory, label: "Basic Logic Gates" },
              { id: "PASSIVES" as LibraryCategory, label: "Passives (R, C, L, T, Fuse)" },
              { id: "SEMICONDUCTORS" as LibraryCategory, label: "Semiconductors (Diodes, BJT)" },
              { id: "SOURCES_GROUNDS" as LibraryCategory, label: "Sources & Ground" },
              { id: "METERS" as LibraryCategory, label: "Meters & PME (V, A, Ω, W)" },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer border ${
                  selectedCategory === cat.id
                    ? "bg-cyan-950/80 border-cyan-400 text-cyan-200 shadow-sm"
                    : "bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative min-w-[260px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search IEEE 315 / IEC standard symbol..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Main Grid: Component Cards List + Interactive Deep Inspector Side-Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left / Center Grid of Standard Component Cards */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-4">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 px-1">
            <span>Showing {filteredComponents.length} Standardized Engineering Symbols</span>
            <span>Click any symbol card to inspect equations, pinouts &amp; live bench</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredComponents.map((item) => {
              const isSelected = item.id === selectedComponentId;
              const isGate = item.category === "GATES";
              const gateIns = activeGateInputs[item.id] || [0, 0];

              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedComponentId(item.id)}
                  onMouseEnter={(e) =>
                    setHoveredPinout({
                      item,
                      rect: e.currentTarget.getBoundingClientRect(),
                    })
                  }
                  onMouseLeave={() =>
                    setHoveredPinout((prev) => (prev?.item.id === item.id ? null : prev))
                  }
                  onFocusCapture={(e) =>
                    setHoveredPinout({
                      item,
                      rect: e.currentTarget.getBoundingClientRect(),
                    })
                  }
                  onBlurCapture={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                      setHoveredPinout((prev) => (prev?.item.id === item.id ? null : prev));
                    }
                  }}
                  className={`bg-[#111827] border rounded-2xl p-4 flex flex-col justify-between gap-3 transition-all cursor-pointer shadow-lg group ${
                    isSelected
                      ? "border-cyan-400 ring-2 ring-cyan-400/30 bg-slate-900/90"
                      : "border-slate-800 hover:border-slate-700 hover:bg-slate-900/40"
                  }`}
                >
                  {/* Card Header */}
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="font-mono text-[10.5px] font-bold text-cyan-400 uppercase tracking-wider">
                        {item.governingStandard.split("·")[0].trim()}
                      </span>
                      {item.icPartNumber && (
                        <span className="font-mono text-[10px] text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                          {item.icPartNumber.split("/")[0].trim()}
                        </span>
                      )}
                    </div>

                    <h4 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                      {item.name}
                    </h4>
                    <p className="font-mono text-xs text-amber-300 mt-0.5">
                      {item.equationOrFormula}
                    </p>
                  </div>

                  {/* Standard Vector Symbol Display Viewport */}
                  <div className="bg-[#090d16] border border-slate-800/90 rounded-xl p-3 flex items-center justify-center min-h-[90px]">
                    {selectedStandard === "IEEE_315" ? (
                      <div className="w-full flex flex-col items-center">
                        <svg viewBox="0 0 100 60" className="w-40 h-20">
                          {item.renderIeeeSvg(true)}
                        </svg>
                        <span className="text-[10px] font-mono text-cyan-400 font-bold mt-1">
                          IEEE 315 Distinctive
                        </span>
                      </div>
                    ) : selectedStandard === "IEC_60617" ? (
                      <div className="w-full flex flex-col items-center">
                        <svg viewBox="0 0 100 60" className="w-40 h-20">
                          {item.renderIecSvg(true)}
                        </svg>
                        <span className="text-[10px] font-mono text-emerald-400 font-bold mt-1">
                          IEC 60617-12
                        </span>
                      </div>
                    ) : (
                      /* Dual Comparison Viewport */
                      <div className="grid grid-cols-2 gap-2 w-full divide-x divide-slate-800">
                        <div className="flex flex-col items-center pr-1">
                          <svg viewBox="0 0 100 60" className="w-full h-16">
                            {item.renderIeeeSvg(true)}
                          </svg>
                          <span className="text-[9px] font-mono text-cyan-400 font-semibold mt-0.5">
                            IEEE 315
                          </span>
                        </div>
                        <div className="flex flex-col items-center pl-1">
                          <svg viewBox="0 0 100 60" className="w-full h-16">
                            {item.renderIecSvg(true)}
                          </svg>
                          <span className="text-[9px] font-mono text-emerald-400 font-semibold mt-0.5">
                            IEC 60617
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Quick Card Footer: Standard Designator + Action Link */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px] font-mono text-slate-400">
                    <div>
                      <span>Designator: </span>
                      <span className="font-bold text-white">{item.ieeeDesignator}</span>
                      <span className="mx-1 text-slate-600">|</span>
                      <span>IEC: </span>
                      <span className="font-bold text-white">{item.iecDesignator}</span>
                    </div>

                    <span className="text-cyan-400 font-semibold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                      Inspect &amp; Test <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Detail Panel: Deep Component Specification & Live Standard Bench */}
        <div className="lg:col-span-5 xl:col-span-4 sticky top-4 space-y-4">
          <div className="bg-[#111827] border border-cyan-500/40 rounded-2xl p-5 shadow-2xl space-y-4">
            {/* Inspector Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                    Standard Symbol Inspector
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white mt-1">
                  {activeComponent.name}
                </h3>
              </div>

              {/* SPICE Copy Button */}
              <button
                type="button"
                onClick={() => handleCopySpice(activeComponent.spiceSyntax, activeComponent.id)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-xs font-mono font-bold text-cyan-300 border border-slate-700 flex items-center gap-1.5 cursor-pointer transition-colors"
                title="Copy SPICE netlist syntax for this standard component"
              >
                {copiedId === activeComponent.id ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>SPICE</span>
                  </>
                )}
              </button>
            </div>

            {/* High-Fidelity Vector Viewport with Both Standards */}
            <div className="bg-[#090d16] border border-cyan-500/30 rounded-xl p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3 divide-x divide-slate-800">
                <div className="flex flex-col items-center">
                  <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-wider mb-1">
                    IEEE Std 315 Symbol
                  </span>
                  <svg viewBox="0 0 100 60" className="w-full h-24">
                    {activeComponent.renderIeeeSvg(true)}
                  </svg>
                  <span className="text-[9.5px] font-mono text-slate-400 text-center mt-1">
                    {activeComponent.standardIeeeName}
                  </span>
                </div>

                <div className="flex flex-col items-center pl-3">
                  <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wider mb-1">
                    IEC 60617 Symbol
                  </span>
                  <svg viewBox="0 0 100 60" className="w-full h-24">
                    {activeComponent.renderIecSvg(true)}
                  </svg>
                  <span className="text-[9.5px] font-mono text-slate-400 text-center mt-1">
                    {activeComponent.standardIecName}
                  </span>
                </div>
              </div>

              {/* Governing Standard Tag */}
              <div className="bg-slate-950/80 rounded-lg p-2 border border-slate-800/80 text-[11px] font-mono text-slate-300 flex items-center justify-between">
                <span className="text-slate-400">Standard Spec:</span>
                <span className="font-bold text-cyan-300">{activeComponent.governingStandard}</span>
              </div>
            </div>

            {/* Description & Technical Note */}
            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              {activeComponent.description}
            </p>

            {/* Key Engineering Specifications */}
            <div className="space-y-1.5 bg-slate-950/70 border border-slate-800 rounded-xl p-3 font-mono text-xs">
              <div className="text-[10.5px] uppercase font-bold text-slate-400 tracking-wider mb-1">
                Electrical Specifications
              </div>
              {activeComponent.keySpecs.map((spec) => (
                <div key={spec.label} className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-400">{spec.label}:</span>
                  <span className="font-bold text-white">{spec.value}</span>
                </div>
              ))}
              <div className="flex justify-between items-center text-[11px] pt-1 border-t border-slate-800 text-amber-300">
                <span className="text-slate-400">Netlist Syntax:</span>
                <span className="font-bold truncate max-w-[200px]">{activeComponent.spiceSyntax}</span>
              </div>
            </div>

            {/* Interactive Standard Live Bench: Meters vs Gates vs Passives */}
            {activeComponent.category === "METERS" ? (
              <div className="bg-slate-900/95 border border-cyan-500/40 rounded-xl p-3.5 space-y-3 font-mono text-xs shadow-lg">
                <div className="flex items-center justify-between font-bold text-white">
                  <span className="flex items-center gap-1.5 text-cyan-300">
                    <Activity className="w-4 h-4 text-cyan-400" />
                    PME Metrology &amp; Lab Rules
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-950 text-cyan-200 border border-cyan-700/60">
                    IEEE Std 315 Sec 10
                  </span>
                </div>

                <div className="bg-[#020617] p-2.5 rounded-lg border border-slate-800 space-y-2 text-[11px] text-slate-300">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Governing Law:</span>
                    <span className="font-bold text-amber-300">{activeComponent.equationOrFormula}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Standard Placement:</span>
                    <span className="font-bold text-emerald-400">
                      {activeComponent.id === "VOLTMETER"
                        ? "PARALLEL across load"
                        : activeComponent.id === "AMMETER"
                        ? "SERIES in-line with loop"
                        : activeComponent.id === "OHMMETER"
                        ? "Across de-energized DUT (0V)"
                        : "DUAL-COIL (V // and I series)"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Internal Impedance:</span>
                    <span className="font-bold text-cyan-300">
                      {activeComponent.id === "VOLTMETER"
                        ? "10 MΩ (High-Z)"
                        : activeComponent.id === "AMMETER"
                        ? "0.001 Ω (Near Zero)"
                        : activeComponent.id === "OHMMETER"
                        ? "Internal Test Micro-Current"
                        : "V: 10MΩ / I: 0.001Ω"}
                    </span>
                  </div>
                </div>

                <div className="bg-red-950/30 border border-red-500/40 rounded-lg p-2 text-[11px] space-y-1 text-red-200">
                  <div className="font-bold text-red-300 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                    <span>Critical Wrong-Connection Rule:</span>
                  </div>
                  <p className="text-[10.5px] text-slate-300 font-sans leading-relaxed">
                    {activeComponent.id === "VOLTMETER"
                      ? "NEVER connect in series! Its 10 MΩ impedance blocks all current to the load."
                      : activeComponent.id === "AMMETER"
                      ? "NEVER connect in parallel across power! Its 0.001 Ω shunt causes a DEAD SHORT CIRCUIT."
                      : activeComponent.id === "OHMMETER"
                      ? "NEVER connect to an active/energized circuit! External voltage destroys the meter or blows its fuse."
                      : "Both coils must be connected! If voltage or current coil is missing, power reads 0W."}
                  </p>
                </div>
              </div>
            ) : activeComponent.category === "GATES" ? (
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 space-y-3 font-mono">
                <div className="flex items-center justify-between text-xs font-bold text-white">
                  <span>Interactive Bit Bench</span>
                  <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                    currentGateOut === 1 ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40" : "bg-slate-800 text-slate-400"
                  }`}>
                    Output Y = {currentGateOut} ({currentGateOut === 1 ? "HIGH" : "LOW"})
                  </span>
                </div>

                {/* Input Bit Toggles */}
                <div className="flex items-center gap-2">
                  {Array.from({ length: activeComponent.inputsCount || 2 }).map((_, idx) => {
                    const gateInputs = activeGateInputs[activeComponent.id] || [0, 0];
                    const bit = gateInputs[idx] ?? 0;
                    const letter = String.fromCharCode(65 + idx);
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleToggleGateBit(activeComponent.id, idx)}
                        className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                          bit === 1
                            ? "bg-emerald-500/20 border-emerald-400 text-emerald-300"
                            : "bg-slate-800 border-slate-700 text-slate-400 hover:text-white"
                        }`}
                      >
                        Input {letter} = {bit}
                      </button>
                    );
                  })}
                </div>

                {/* Truth Table */}
                {activeComponent.truthTableRows && (
                  <div className="overflow-hidden rounded-lg border border-slate-800 text-[11px]">
                    <table className="w-full text-center">
                      <thead className="bg-slate-950 text-cyan-400 border-b border-slate-800">
                        <tr>
                          {Array.from({ length: activeComponent.inputsCount || 2 }).map((_, i) => (
                            <th key={i} className="py-1 px-2">{String.fromCharCode(65 + i)}</th>
                          ))}
                          <th className="py-1 px-2 border-l border-slate-800">Y</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeComponent.truthTableRows.map((r, i) => {
                          const currentIns = activeGateInputs[activeComponent.id] || [0, 0];
                          const isActive = r.ins.every((val, idx) => val === (currentIns[idx] ?? 0));
                          return (
                            <tr
                              key={i}
                              className={`border-b border-slate-800/60 last:border-b-0 ${
                                isActive ? "bg-cyan-500/20 text-white font-bold" : "text-slate-400"
                              }`}
                            >
                              {r.ins.map((v, c) => (
                                <td key={c} className="py-1 px-2">{v}</td>
                              ))}
                              <td className={`py-1 px-2 border-l border-slate-800/60 font-bold ${
                                r.out === 1 ? "text-emerald-400" : "text-slate-500"
                              }`}>
                                {r.out}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : (
              /* Passive Live Parameter Slider & Impedance / Ohm's Law Calculator */
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between font-bold text-white">
                  <span>Parameter Calculator</span>
                  <span className="text-cyan-300">
                    {passiveParams[activeComponent.id] || 1000} {activeComponent.unit || ""}
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>Component Value:</span>
                    <span className="font-bold text-white">
                      {passiveParams[activeComponent.id] || 1000} {activeComponent.unit || ""}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={10000}
                    step={10}
                    value={passiveParams[activeComponent.id] || 1000}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 1000;
                      setPassiveParams((prev) => ({ ...prev, [activeComponent.id]: val }));
                    }}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                </div>

                <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 text-[11px] space-y-1 text-slate-300">
                  <div className="text-slate-400">Equation:</div>
                  <div className="font-bold text-amber-300">{activeComponent.equationOrFormula}</div>
                </div>
              </div>
            )}

            {/* Direct Workbench & Breadboard Placement Actions */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onSelectComponentToPlace?.(activeComponent.id, "IEEE_315")}
                  className="py-2 px-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs font-mono cursor-pointer transition-all shadow-md shadow-cyan-500/20 flex items-center justify-center gap-1.5"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Place IEEE on Canvas</span>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigateToBreadboard?.(activeComponent.id)}
                  className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs font-mono border border-slate-700 cursor-pointer transition-colors flex items-center justify-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Test on Breadboard</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Schematic Pinout Hover Popover */}
      <ComponentPinoutPopover
        data={
          hoveredPinout
            ? standardSymbolToPinoutData(hoveredPinout.item, selectedStandard)
            : null
        }
        anchorRect={hoveredPinout ? hoveredPinout.rect : null}
      />
    </div>
  );
}
