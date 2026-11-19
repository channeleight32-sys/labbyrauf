import React, { useState } from "react";
import {
  Layers,
  Cpu,
  Zap,
  Info,
  CheckCircle2,
  Copy,
  Check,
  Maximize2,
  Eye,
  Activity,
  ArrowRight,
  Sun,
  Radio,
} from "lucide-react";

interface ComponentSpecItem {
  designator: string;
  name: string;
  value: string;
  packageType: string;
  connections: string;
  rationale: string;
}

export const OpticalSchematicViewer: React.FC<{
  rfValueOhm?: number;
  ledColorName?: string;
  typicalVf?: number;
  driveCurrentMa?: number;
}> = ({
  rfValueOhm = 100000,
  ledColorName = "Deep Blue (450nm)",
  typicalVf = 3.1,
  driveCurrentMa = 35,
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [copiedBOM, setCopiedBOM] = useState<boolean>(false);
  const [activeStage, setActiveStage] = useState<"ALL" | "TX" | "RX">("ALL");

  const calculatedRlim = Math.max(
    10,
    Math.round((3.3 - typicalVf) / (driveCurrentMa * 1e-3))
  );

  const bom: ComponentSpecItem[] = [
    {
      designator: "U1_TX",
      name: "Transmitter Microcontroller",
      value: "ESP32 DevKit V1 (Tensilica 240MHz)",
      packageType: "DIP-30 Module",
      connections: "GPIO4 (UART2 TX) to R_B (Pin 1)",
      rationale: "Generates high-speed serial bit frames (600 - 115200 baud) with start, data, parity, and stop pulses.",
    },
    {
      designator: "R_B",
      name: "Base Current Limiting Resistor",
      value: "1.0 kΩ (1/4W, 1% Metal Film)",
      packageType: "Axial 0207 / 0805 SMD",
      connections: "Between ESP32 GPIO4 and 2N2222 Base",
      rationale: "Sets base saturation drive current: I_B = (3.3V - 0.7V) / 1kΩ = 2.6 mA, guaranteeing sharp saturation switching.",
    },
    {
      designator: "Q1",
      name: "High-Speed Switching Transistor",
      value: "2N2222A NPN BJT (fT = 300 MHz)",
      packageType: "TO-92 / SOT-23",
      connections: "Base to R_B, Emitter to GND, Collector to LED Cathode",
      rationale: "High bandwidth bipolar switch pulling LED cathode to GND in < 15 ns, supporting optical modulation up to 10 Mbps.",
    },
    {
      designator: "R_LIM",
      name: "LED Ballast / Current Limiting Resistor",
      value: `${calculatedRlim} Ω (1/2W, 1% Precision)`,
      packageType: "Axial 0411 / 1206 SMD",
      connections: "+3.3V Supply Rail to LED Anode",
      rationale: `Fixes LED optical bias current: I_LED = (3.3V - ${typicalVf}V) / ${calculatedRlim}Ω = ${driveCurrentMa} mA, preventing thermal runaway.`,
    },
    {
      designator: "D1_TX",
      name: "Visible Light Optical Emitter",
      value: `${ledColorName} High-Radiance GaN LED`,
      packageType: "5mm Clear Water Epoxy / T-1 3/4",
      connections: "Anode to R_LIM, Cathode to Q1 Collector",
      rationale: "Converts modulated drive current into optical photon flux with 20° narrow half-angle emission cone.",
    },
    {
      designator: "C_TX1, C_TX2",
      name: "TX Power Decoupling Capacitors",
      value: "10 µF Tantalum + 100 nF Ceramic X7R",
      packageType: "1206 / 0805 SMD",
      connections: "Between +3.3V and GND right next to LED",
      rationale: "Absorbs high-speed current transient spikes (35mA pulses) so power supply line does not ring or radiate EMI.",
    },
    {
      designator: "D2_RX",
      name: "Silicon PIN Photodiode",
      value: "Vishay BPW34 (Active Area: 7.5 mm²)",
      packageType: "SMD DIL Flat Glass Package",
      connections: "Cathode to +3.3V Reverse Bias, Anode to Op-Amp Inverting Node",
      rationale: "High quantum efficiency (0.62 A/W @ 850nm, 0.45 A/W @ 450nm) with 20ns rise time in photoconductive mode.",
    },
    {
      designator: "U2_RX",
      name: "Precision Transimpedance Amplifier",
      value: "Texas Instruments OPA380 / TL072 JFET",
      packageType: "SOIC-8 (Low Input Bias: 3 fA)",
      connections: "Pin 2 (In-) to Photodiode Anode, Pin 3 (In+) to +1.65V Virtual Ground, Pin 6 (Out) to Slicer",
      rationale: "Ultra-low input bias current amplifier converting nanoampere photocurrent into large analog voltage swings.",
    },
    {
      designator: "R_F",
      name: "Transimpedance Feedback Resistor",
      value: `${(rfValueOhm / 1000).toFixed(0)} kΩ (0.1% Ultra-Low Noise Thin Film)`,
      packageType: "0805 SMD (Low Parasitic Capacitance)",
      connections: "Between Op-Amp Pin 6 (Out) and Pin 2 (In-)",
      rationale: `Sets transimpedance conversion gain: V_out = I_photo × ${(rfValueOhm / 1000).toFixed(0)}kΩ. 1 µA photocurrent produces ${(rfValueOhm * 1e-6).toFixed(2)}V output.`,
    },
    {
      designator: "C_F",
      name: "Phase Margin Compensation Capacitor",
      value: "2.2 pF (COG/NPO Ceramic, ±0.1pF)",
      packageType: "0603 SMD",
      connections: "Connected in parallel with R_F",
      rationale: "Neutralizes photodiode junction capacitance (C_j = 72pF) pole, ensuring 45° phase margin and zero gain peaking.",
    },
    {
      designator: "U3_RX",
      name: "High-Speed Decision Slicer / Comparator",
      value: "LM393 Dual Differential Voltage Comparator",
      packageType: "SOIC-8 / DIP-8",
      connections: "Non-Inverting to Op-Amp Out, Inverting to V_thresh Potentiometer, Out to ESP32",
      rationale: "Converts weak analog photodiode pulse waveforms into crisp 3.3V CMOS square digital bits with 200ns propagation delay.",
    },
    {
      designator: "R_POT",
      name: "Decision Threshold Multi-Turn Trimpot",
      value: "10 kΩ 25-Turn Precision Cermet Potentiometer",
      packageType: "Bourns 3296W Through-Hole",
      connections: "Top to +3.3V, Bottom to GND, Wiper to Comparator In-",
      rationale: "Allows fine calibration of slicing decision threshold voltage (V_th) to reject ambient room light and solar DC offset.",
    },
    {
      designator: "R_PULL",
      name: "Comparator Output Pull-Up Resistor",
      value: "4.7 kΩ (1/4W, 5%)",
      packageType: "0805 SMD",
      connections: "Between LM393 Open-Collector Output and +3.3V Rail",
      rationale: "Required by open-collector output of LM393 to pull digital output rail to +3.3V during logic HIGH states.",
    },
    {
      designator: "U4_RX",
      name: "Receiver Microcontroller",
      value: "ESP32 DevKit V1 (Tensilica 240MHz)",
      packageType: "DIP-30 Module",
      connections: "GPIO34 (UART2 RX Input) connected to Comparator Sliced Out",
      rationale: "Samples incoming digital bitstream on GPIO34 interrupt/UART RX and decodes ASCII characters in real time.",
    },
  ];

  const handleCopyBOM = () => {
    const text = bom
      .map(
        (b) =>
          `${b.designator}: ${b.name} | Value: ${b.value} | Package: ${b.packageType}\n  Connections: ${b.connections}\n  Rationale: ${b.rationale}`
      )
      .join("\n\n");
    navigator.clipboard.writeText(text);
    setCopiedBOM(true);
    setTimeout(() => setCopiedBOM(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-[#0b1122] border border-cyan-500/30 rounded-xl p-4 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              <Layers className="w-4 h-4" />
            </span>
            <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider">
              Complete Visible Light Communication (VLC) Transceiver Schematic
            </h3>
          </div>
          <p className="text-xs font-mono text-slate-400 mt-1">
            IEEE / IEC Standard Electronic Circuit Diagram · High-Speed BJT LED Driver Stage → Free-Space Optical Channel → Photoconductive TIA Op-Amp → Slicer
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Stage Filter */}
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1 text-xs font-mono">
            {(["ALL", "TX", "RX"] as const).map((stage) => (
              <button
                key={stage}
                type="button"
                onClick={() => setActiveStage(stage)}
                className={`px-2.5 py-1 rounded transition cursor-pointer ${
                  activeStage === stage
                    ? "bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {stage === "ALL" ? "Full Link" : stage === "TX" ? "Transmitter" : "Receiver"}
              </button>
            ))}
          </div>

          {/* Zoom controls */}
          <div className="flex items-center gap-1 bg-slate-900/80 border border-slate-800 rounded-lg p-1 text-xs font-mono">
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.max(0.75, z - 0.15))}
              className="px-2 py-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 cursor-pointer"
            >
              -
            </button>
            <span className="px-2 text-cyan-300 font-bold">{Math.round(zoomLevel * 100)}%</span>
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.min(1.5, z + 0.15))}
              className="px-2 py-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 cursor-pointer"
            >
              +
            </button>
          </div>

          <button
            type="button"
            onClick={handleCopyBOM}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-cyan-300 hover:text-white hover:border-cyan-400 transition cursor-pointer"
          >
            {copiedBOM ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedBOM ? "BOM Copied!" : "Copy BOM"}</span>
          </button>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="bg-[#03060f] border border-cyan-500/20 rounded-xl p-4 shadow-2xl overflow-x-auto relative min-h-[480px] flex items-center justify-center">
        <div
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle, #06b6d4 1px, transparent 1px)`,
            backgroundSize: "20px 20px",
          }}
        />

        <div
          style={{
            transform: `scale(${zoomLevel})`,
            transformOrigin: "center center",
            transition: "transform 0.15s ease-out",
          }}
          className="w-full flex justify-center py-2"
        >
          <svg viewBox="0 0 1020 480" className="w-[1000px] h-[470px] select-none">
            <defs>
              <linearGradient id="optBoxGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1e293b" />
                <stop offset="100%" stopColor="#0f172a" />
              </linearGradient>
              <linearGradient id="photonBeam" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.8" />
                <stop offset="50%" stopColor="#818cf8" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#34d399" stopOpacity="0.8" />
              </linearGradient>
            </defs>

            {/* Title Header */}
            <text x="30" y="32" fill="#38bdf8" fontSize="14" fontWeight="bold" fontFamily="monospace">
              COMPLETE VLC TRANSCEIVER CIRCUIT: TRANSMITTER DRIVER &amp; RECEIVER TIA OP-AMP
            </text>
            <text x="30" y="48" fill="#64748b" fontSize="10" fontFamily="monospace">
              ESP32 GPIO4 → R_B (1kΩ) → 2N2222 BJT → LED Emitter · Optical Channel · BPW34 Photodiode → OPA380 TIA (Rf, Cf) → LM393 Slicer → ESP32 GPIO34
            </text>

            {/* ============================================================== */}
            {/* STAGE 1: TRANSMITTER (ESP32 + BJT SWITCH + LED)                 */}
            {/* ============================================================== */}
            <g opacity={activeStage === "RX" ? 0.25 : 1} style={{ transition: "opacity 0.2s" }}>
              {/* Group Enclosure */}
              <rect x="25" y="70" width="375" height="360" rx="8" fill="#0c1322" stroke="#0284c7" strokeWidth="2" />
              <rect x="25" y="70" width="375" height="28" rx="8" fill="#0284c7" fillOpacity="0.25" />
              <text x="212" y="89" fill="#38bdf8" fontSize="11" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                STAGE 1: OPTICAL TRANSMITTER (TX)
              </text>

              {/* ESP32 TX Microcontroller Block */}
              <rect x="40" y="120" width="105" height="180" rx="4" fill="url(#optBoxGrad)" stroke="#38bdf8" strokeWidth="1.5" />
              <text x="92" y="142" fill="#ffffff" fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                U1_TX
              </text>
              <text x="92" y="156" fill="#94a3b8" fontSize="8.5" textAnchor="middle" fontFamily="monospace">
                ESP32 DevKit
              </text>
              <text x="92" y="170" fill="#64748b" fontSize="8" textAnchor="middle" fontFamily="monospace">
                UART2 TX
              </text>

              {/* GPIO4 Pin Terminal */}
              <circle cx="145" cy="210" r="3.5" fill="#38bdf8" />
              <text x="138" y="213" fill="#38bdf8" fontSize="8.5" fontWeight="bold" textAnchor="end" fontFamily="monospace">
                GPIO4
              </text>

              {/* Base Resistor R_B (1k) */}
              <path d="M 145 210 L 175 210" stroke="#38bdf8" strokeWidth="2" />
              {/* Resistor zig-zag */}
              <path
                d="M 175 210 L 179 204 L 187 216 L 195 204 L 203 216 L 211 204 L 215 210"
                fill="none"
                stroke="#38bdf8"
                strokeWidth="2"
              />
              <text x="195" y="196" fill="#38bdf8" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                R_B: 1.0 kΩ
              </text>
              <path d="M 215 210 L 245 210" stroke="#38bdf8" strokeWidth="2" />
              <circle r="3" fill="#67e8f9">
                <animateMotion dur="1.1s" repeatCount="indefinite" path="M 145 210 L 245 210" />
              </circle>

              {/* Test Point TP1 */}
              <circle cx="230" cy="210" r="2.5" fill="#f59e0b" />
              <text x="230" y="200" fill="#f59e0b" fontSize="7.5" fontFamily="monospace" textAnchor="middle">
                TP1
              </text>

              {/* 2N2222 NPN BJT Driver */}
              <circle cx="265" cy="210" r="24" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.5" />
              <line x1="253" y1="198" x2="253" y2="222" stroke="#ffffff" strokeWidth="2" />
              <line x1="245" y1="210" x2="253" y2="210" stroke="#38bdf8" strokeWidth="2" />
              {/* Collector branch */}
              <line x1="253" y1="204" x2="277" y2="190" stroke="#38bdf8" strokeWidth="2" />
              {/* Emitter branch with arrow */}
              <line x1="253" y1="216" x2="277" y2="230" stroke="#38bdf8" strokeWidth="2" />
              <polygon points="277,230 271,224 268,231" fill="#38bdf8" />
              <text x="265" y="248" fill="#cbd5e1" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                Q1: 2N2222
              </text>

              {/* Emitter to GND */}
              <path d="M 277 230 L 277 270" stroke="#94a3b8" strokeWidth="2" />
              <line x1="269" y1="270" x2="285" y2="270" stroke="#64748b" strokeWidth="2" />
              <line x1="272" y1="274" x2="282" y2="274" stroke="#64748b" strokeWidth="1.5" />
              <line x1="275" y1="278" x2="279" y2="278" stroke="#64748b" strokeWidth="1" />
              <text x="277" y="292" fill="#94a3b8" fontSize="8" textAnchor="middle" fontFamily="monospace">
                GND
              </text>

              {/* Collector up to LED Cathode */}
              <path d="M 277 190 L 277 165" stroke="#38bdf8" strokeWidth="2" />
              <circle r="3" fill="#fde047">
                <animateMotion dur="1.0s" repeatCount="indefinite" path="M 277 85 L 277 190 L 277 270" />
              </circle>

              {/* Optical LED Emitter Symbol */}
              <g transform="translate(265, 140)">
                {/* Diode triangle */}
                <polygon points="12,20 0,0 24,0" fill="#0284c7" stroke="#38bdf8" strokeWidth="1.5" />
                <line x1="0" y1="20" x2="24" y2="20" stroke="#38bdf8" strokeWidth="2" />
                {/* Optical emission arrows */}
                <path d="M 24 5 L 36 -2" stroke="#f59e0b" strokeWidth="1.5" markerEnd="url(#arrow)" />
                <polygon points="36,-2 32,1 30,-3" fill="#f59e0b" />
                <path d="M 24 15 L 36 8" stroke="#f59e0b" strokeWidth="1.5" />
                <polygon points="36,8 32,11 30,7" fill="#f59e0b" />
                <text x="42" y="16" fill="#f59e0b" fontSize="8.5" fontWeight="bold" fontFamily="monospace">
                  D1: LED ({typicalVf}V)
                </text>
              </g>

              {/* Ballast Resistor R_LIM */}
              <path d="M 277 140 L 277 125" stroke="#38bdf8" strokeWidth="2" />
              {/* Resistor zig-zag vertical */}
              <path
                d="M 277 125 L 271 121 L 283 113 L 271 105 L 283 97 L 271 89 L 277 85"
                fill="none"
                stroke="#f59e0b"
                strokeWidth="2"
              />
              <text x="325" y="108" fill="#f59e0b" fontSize="8.5" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                R_LIM: {calculatedRlim} Ω
              </text>

              {/* +3.3V Power Rail */}
              <path d="M 277 85 L 277 75" stroke="#f87171" strokeWidth="2" />
              <circle cx="277" cy="75" r="3" fill="#f87171" />
              <text x="285" y="73" fill="#f87171" fontSize="9" fontWeight="bold" fontFamily="monospace">
                +3.3V VDD
              </text>

              {/* Decoupling Capacitors (10uF + 100nF) */}
              <g transform="translate(345, 120)">
                <path d="M -25 -45 L 0 -45 L 0 0" stroke="#f87171" strokeWidth="1.5" fill="none" />
                <line x1="-8" y1="0" x2="8" y2="0" stroke="#38bdf8" strokeWidth="2" />
                <line x1="-8" y1="5" x2="8" y2="5" stroke="#38bdf8" strokeWidth="2" />
                <path d="M 0 5 L 0 20" stroke="#94a3b8" strokeWidth="1.5" />
                <line x1="-6" y1="20" x2="6" y2="20" stroke="#64748b" strokeWidth="1.5" />
                <text x="12" y="4" fill="#38bdf8" fontSize="7.5" fontFamily="monospace">
                  C_dec: 10µF ∥ 100nF
                </text>
              </g>

              {/* Equation Note */}
              <rect x="40" y="320" width="345" height="95" rx="6" fill="#050a16" stroke="#1e293b" />
              <text x="50" y="340" fill="#38bdf8" fontSize="9.5" fontWeight="bold" fontFamily="monospace">
                TRANSMITTER DESIGN FORMULA:
              </text>
              <text x="50" y="360" fill="#ffffff" fontSize="9" fontFamily="monospace">
                I_LED = (V_DD - V_F - V_CE,sat) ÷ R_LIM
              </text>
              <text x="50" y="380" fill="#34d399" fontSize="8.5" fontFamily="monospace">
                I_LED = (3.3V - {typicalVf}V - 0.15V) ÷ {calculatedRlim}Ω = {driveCurrentMa} mA
              </text>
              <text x="50" y="400" fill="#94a3b8" fontSize="8" fontFamily="monospace">
                Switching rise/fall time &lt; 12ns with 2N2222A saturated drive
              </text>
            </g>

            {/* ============================================================== */}
            {/* OPTICAL PROPAGATION CHANNEL (PHOTON BEAM)                      */}
            {/* ============================================================== */}
            <g transform="translate(415, 110)">
              <rect x="0" y="0" width="150" height="250" rx="6" fill="#040b19" stroke="#1e293b" strokeDasharray="3 3" />
              <text x="75" y="25" fill="#38bdf8" fontSize="9.5" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                FREE-SPACE LINK
              </text>
              <text x="75" y="40" fill="#94a3b8" fontSize="8" textAnchor="middle" fontFamily="monospace">
                Distance: d (m)
              </text>

              {/* Light Cone Polygon */}
              <polygon points="10,125 140,50 140,200" fill="url(#photonBeam)" opacity="0.35" />

              {/* Animated Directional Photon Wave Pulses */}
              <line x1="15" y1="125" x2="140" y2="125" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="6 6">
                <animate attributeName="stroke-dashoffset" values="24;0" dur="0.9s" repeatCount="indefinite" />
              </line>
              <circle r="4" fill="#38bdf8">
                <animateMotion dur="1.1s" repeatCount="indefinite" path="M 12 125 L 142 125" />
              </circle>
              <circle r="3.5" fill="#34d399">
                <animateMotion dur="1.1s" begin="0.55s" repeatCount="indefinite" path="M 12 125 L 142 125" />
              </circle>

              <text x="75" y="225" fill="#f59e0b" fontSize="8.5" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                hν Photons
              </text>
              <text x="75" y="240" fill="#64748b" fontSize="7.5" textAnchor="middle" fontFamily="monospace">
                Lambertian Beam
              </text>
            </g>

            {/* ============================================================== */}
            {/* STAGE 2: RECEIVER (PHOTODIODE + TIA OP-AMP + SLICER + ESP32)   */}
            {/* ============================================================== */}
            <g opacity={activeStage === "TX" ? 0.25 : 1} style={{ transition: "opacity 0.2s" }}>
              <rect x="580" y="70" width="415" height="360" rx="8" fill="#0c1322" stroke="#10b981" strokeWidth="2" />
              <rect x="580" y="70" width="415" height="28" rx="8" fill="#10b981" fillOpacity="0.25" />
              <text x="787" y="89" fill="#34d399" fontSize="11" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                STAGE 2: OPTICAL RECEIVER (PHOTODIODE + TIA + SLICER)
              </text>

              {/* BPW34 Photodiode Symbol (Reverse Biased) */}
              <g transform="translate(605, 175)">
                {/* Diode symbol pointing UP (reverse bias) */}
                <polygon points="12,0 0,20 24,20" fill="#059669" stroke="#34d399" strokeWidth="1.5" />
                <line x1="0" y1="0" x2="24" y2="0" stroke="#34d399" strokeWidth="2" />

                {/* Incoming photon arrows */}
                <path d="M -15 5 L -3 12" stroke="#38bdf8" strokeWidth="1.5" />
                <polygon points="-3,12 -8,9 -6,6" fill="#38bdf8" />
                <path d="M -15 15 L -3 22" stroke="#38bdf8" strokeWidth="1.5" />
                <polygon points="-3,22 -8,19 -6,16" fill="#38bdf8" />

                <text x="12" y="-8" fill="#f87171" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                  Cathode (+3.3V)
                </text>
                <text x="12" y="32" fill="#34d399" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                  Anode (In-)
                </text>
                <text x="-18" y="2" fill="#34d399" fontSize="8.5" fontWeight="bold" fontFamily="monospace">
                  D2: BPW34
                </text>
              </g>

              {/* Reverse bias connection to +3.3V */}
              <path d="M 617 175 L 617 125" stroke="#f87171" strokeWidth="2" />
              <circle cx="617" cy="125" r="3" fill="#f87171" />
              <text x="617" y="115" fill="#f87171" fontSize="8" textAnchor="middle" fontFamily="monospace">
                +3.3V Bias
              </text>

              {/* Trace from Photodiode Anode to Op-Amp In- */}
              <path d="M 617 195 L 617 220 L 680 220" stroke="#34d399" strokeWidth="2" />
              <circle cx="650" cy="220" r="3" fill="#34d399" />

              {/* OPA380 Transimpedance Op-Amp (Triangle) */}
              <g transform="translate(680, 195)">
                <polygon points="0,0 0,60 50,30" fill="url(#optBoxGrad)" stroke="#10b981" strokeWidth="1.5" />
                {/* Inputs */}
                <text x="8" y="28" fill="#f87171" fontSize="12" fontWeight="bold" fontFamily="monospace">
                  -
                </text>
                <text x="8" y="48" fill="#38bdf8" fontSize="12" fontWeight="bold" fontFamily="monospace">
                  +
                </text>
                <text x="25" y="34" fill="#34d399" fontSize="7.5" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                  U2: TIA
                </text>
                <text x="25" y="44" fill="#94a3b8" fontSize="6.5" textAnchor="middle" fontFamily="monospace">
                  OPA380
                </text>
              </g>

              {/* Non-inverting input tied to Virtual Ground (1.65V) */}
              <path d="M 680 240 L 650 240 L 650 270" stroke="#94a3b8" strokeWidth="1.5" />
              <rect x="625" y="270" width="50" height="20" rx="3" fill="#1e293b" stroke="#64748b" />
              <text x="650" y="283" fill="#94a3b8" fontSize="8" textAnchor="middle" fontFamily="monospace">
                +1.65V REF
              </text>

              {/* Feedback Loop (Rf || Cf) */}
              <path d="M 650 220 L 650 150 L 690 150" stroke="#34d399" strokeWidth="2" />

              {/* Feedback Resistor R_F */}
              <path
                d="M 690 150 L 694 144 L 702 156 L 710 144 L 718 156 L 726 144 L 730 150"
                fill="none"
                stroke="#34d399"
                strokeWidth="2"
              />
              <text x="710" y="138" fill="#34d399" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                R_F: {(rfValueOhm / 1000).toFixed(0)} kΩ
              </text>
              <path d="M 730 150 L 755 150 L 755 225 L 730 225" stroke="#34d399" strokeWidth="2" />

              {/* Feedback Compensation Capacitor C_F (2.2pF) in Parallel */}
              <g transform="translate(685, 168)">
                <path d="M -35 -18 L -35 0 L 5 0" stroke="#38bdf8" strokeWidth="1.5" fill="none" />
                <line x1="5" y1="-8" x2="5" y2="8" stroke="#38bdf8" strokeWidth="2" />
                <line x1="10" y1="-8" x2="10" y2="8" stroke="#38bdf8" strokeWidth="2" />
                <path d="M 10 0 L 50 0 L 50 -18" stroke="#38bdf8" strokeWidth="1.5" fill="none" />
                <text x="25" y="18" fill="#38bdf8" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                  C_F: 2.2 pF
                </text>
              </g>

              {/* TIA Output Line */}
              <circle cx="755" cy="225" r="3" fill="#34d399" />
              <path d="M 755 225 L 790 225" stroke="#34d399" strokeWidth="2" />
              <circle cx="770" cy="225" r="2.5" fill="#f59e0b" />
              <text x="770" y="215" fill="#f59e0b" fontSize="7.5" fontFamily="monospace" textAnchor="middle">
                TP2 (V_analog)
              </text>
              <circle r="3" fill="#34d399">
                <animateMotion dur="1.4s" repeatCount="indefinite" path="M 617 195 L 617 220 L 680 220" />
              </circle>

              {/* ============================================================== */}
              {/* LM393 VOLTAGE COMPARATOR / SLICER                              */}
              {/* ============================================================== */}
              <g transform="translate(790, 205)">
                <polygon points="0,0 0,50 40,25" fill="url(#optBoxGrad)" stroke="#fbbf24" strokeWidth="1.5" />
                <text x="6" y="22" fill="#34d399" fontSize="11" fontWeight="bold" fontFamily="monospace">
                  +
                </text>
                <text x="6" y="42" fill="#f87171" fontSize="11" fontWeight="bold" fontFamily="monospace">
                  -
                </text>
                <text x="20" y="28" fill="#fbbf24" fontSize="7" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                  U3: LM393
                </text>
              </g>

              {/* Inverting Threshold Input from Potentiometer */}
              <path d="M 790 245 L 760 245 L 760 295" stroke="#fbbf24" strokeWidth="1.5" />
              <rect x="740" y="295" width="40" height="24" rx="3" fill="#1e293b" stroke="#fbbf24" />
              <text x="760" y="310" fill="#fbbf24" fontSize="8" textAnchor="middle" fontFamily="monospace">
                V_TH (Pot)
              </text>

              {/* Comparator Output with Pull-Up */}
              <path d="M 830 230 L 870 230" stroke="#fbbf24" strokeWidth="2" />
              <circle cx="850" cy="230" r="3" fill="#fbbf24" />
              {/* Pull up resistor R_pull 4.7k */}
              <path d="M 850 230 L 850 180" stroke="#fbbf24" strokeWidth="1.5" />
              <path
                d="M 850 180 L 846 176 L 854 168 L 846 160 L 854 152 L 846 144 L 850 140"
                fill="none"
                stroke="#38bdf8"
                strokeWidth="1.5"
              />
              <text x="880" y="162" fill="#38bdf8" fontSize="7.5" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                R_PULL: 4.7k
              </text>
              <path d="M 850 140 L 850 125" stroke="#f87171" strokeWidth="1.5" />
              <circle cx="850" cy="125" r="2.5" fill="#f87171" />
              <text x="850" y="115" fill="#f87171" fontSize="7.5" textAnchor="middle" fontFamily="monospace">
                +3.3V
              </text>

              {/* Line to ESP32 RX */}
              <path d="M 870 230 L 905 230" stroke="#34d399" strokeWidth="2.5" />
              <circle r="3" fill="#4ade80">
                <animateMotion dur="0.9s" repeatCount="indefinite" path="M 830 230 L 905 230" />
              </circle>

              {/* ESP32 RX Box */}
              <rect x="905" y="150" width="80" height="150" rx="4" fill="url(#optBoxGrad)" stroke="#10b981" strokeWidth="1.5" />
              <text x="945" y="172" fill="#ffffff" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                U4_RX
              </text>
              <text x="945" y="186" fill="#94a3b8" fontSize="8" textAnchor="middle" fontFamily="monospace">
                ESP32
              </text>
              <circle cx="905" cy="230" r="3.5" fill="#34d399" />
              <text x="915" y="233" fill="#34d399" fontSize="8" fontWeight="bold" fontFamily="monospace">
                GPIO34
              </text>
              <text x="945" y="252" fill="#64748b" fontSize="7.5" textAnchor="middle" fontFamily="monospace">
                UART2 RX
              </text>

              {/* Receiver Design Equations */}
              <rect x="595" y="330" width="385" height="85" rx="6" fill="#050a16" stroke="#1e293b" />
              <text x="605" y="350" fill="#34d399" fontSize="9.5" fontWeight="bold" fontFamily="monospace">
                RECEIVER TIA &amp; SLICER DESIGN FORMULAS:
              </text>
              <text x="605" y="370" fill="#ffffff" fontSize="9" fontFamily="monospace">
                V_out = I_photodiode × R_F = (P_rx × Responsivity R_λ) × {(rfValueOhm / 1000).toFixed(0)} kΩ
              </text>
              <text x="605" y="390" fill="#38bdf8" fontSize="8.5" fontFamily="monospace">
                Phase Margin Pole Compensation: C_F ≥ √[ C_diode ÷ (2π × R_F × f_GBW) ] = 2.2 pF
              </text>
            </g>
          </svg>
        </div>
      </div>

      {/* Bill of Materials Table */}
      <div className="bg-[#0b1122] border border-cyan-500/30 rounded-xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
              Complete Transceiver Bill of Materials (BOM) &amp; Part Engineering Specifications
            </h4>
          </div>
          <span className="text-[10px] font-mono text-cyan-400 font-bold">
            {bom.length} VERIFIED HARDWARE COMPONENTS
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900/80 text-slate-400 border-b border-slate-800 text-[11px]">
                <th className="py-2.5 px-3">Des</th>
                <th className="py-2.5 px-3">Component Name</th>
                <th className="py-2.5 px-3">Value / Rating</th>
                <th className="py-2.5 px-3">Package</th>
                <th className="py-2.5 px-3">Connections / Terminal Pinout</th>
                <th className="py-2.5 px-3">Engineering Function &amp; Rationale</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300 text-[11px]">
              {bom.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-800/30 transition">
                  <td className="py-2.5 px-3 font-bold text-cyan-400 whitespace-nowrap">{item.designator}</td>
                  <td className="py-2.5 px-3 font-semibold text-white whitespace-nowrap">{item.name}</td>
                  <td className="py-2.5 px-3 text-amber-300 font-bold whitespace-nowrap">{item.value}</td>
                  <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap">{item.packageType}</td>
                  <td className="py-2.5 px-3 text-slate-300 text-[10px]">{item.connections}</td>
                  <td className="py-2.5 px-3 text-slate-400 text-[10px] leading-relaxed">{item.rationale}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default OpticalSchematicViewer;
