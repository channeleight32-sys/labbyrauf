import React, { useState } from "react";
import {
  Layers,
  Cpu,
  Zap,
  Info,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  Maximize2,
  Radio,
  Wifi,
  Activity,
  ArrowRight,
} from "lucide-react";

export type WirelessCircuitId = "LORA_SX1278" | "WIFI_BLE_RF" | "FRIIS_PROPAGATION";

interface WirelessSchematicProps {
  circuitId: WirelessCircuitId;
  onOpenInWorkbench?: () => void;
}

interface ComponentSpecItem {
  designator: string;
  name: string;
  value: string;
  packageType: string;
  connections: string;
  rationale: string;
}

export const WirelessSchematicViewer: React.FC<WirelessSchematicProps> = ({
  circuitId,
  onOpenInWorkbench,
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [copiedBOM, setCopiedBOM] = useState<boolean>(false);

  const getBOM = (id: WirelessCircuitId): ComponentSpecItem[] => {
    switch (id) {
      case "LORA_SX1278":
        return [
          {
            designator: "U1",
            name: "Master Microcontroller",
            value: "ESP32 DevKit V1 (Tensilica 240MHz)",
            packageType: "DIP-30 Module",
            connections: "SPI: SCK=GPIO18, MISO=GPIO19, MOSI=GPIO23, NSS=GPIO5, RST=GPIO14, DIO0=GPIO2",
            rationale: "Manages SPI bus register transactions, LoRa modem state machine, packet queues, and timestamping.",
          },
          {
            designator: "U2",
            name: "LoRa Transceiver IC",
            value: "Semtech SX1278 (137-525 MHz Chirp Spread Spectrum)",
            packageType: "QFN-28 (6x6mm)",
            connections: "SPI Bus to ESP32, RF_IN/RF_OUT to LC Matching Network, XTAL to TCXO",
            rationale: "Proprietary Semtech Chirp Spread Spectrum modulation engine capable of receiving signals 20dB below noise floor.",
          },
          {
            designator: "Y1",
            name: "Precision TCXO Oscillator",
            value: "32.000 MHz (±0.5 ppm Stability)",
            packageType: "SMD-4 (3.2x2.5mm)",
            connections: "Pin 3 (Out) to SX1278 OSC_IN, Pin 4 to +3.3V, Pin 2 to GND",
            rationale: "Ultra-low frequency drift oscillator essential for narrow-band LoRa receptions and high Spreading Factors (SF10-SF12).",
          },
          {
            designator: "L1",
            name: "RF Matching Inductor (Series)",
            value: "12 nH (High-Q Multilayer, ±2%)",
            packageType: "0603 SMD",
            connections: "SX1278 RFO / PA_BOOST pin to Node N_RF1",
            rationale: "Transforms high power amplifier output impedance to 50Ω intermediate conjugate match.",
          },
          {
            designator: "L2",
            name: "RF Harmonic Filter Inductor",
            value: "18 nH (High-Q Air-Core)",
            packageType: "0603 SMD",
            connections: "Series branch between Node N_RF1 and Antenna SMA Pin",
            rationale: "Forms low-pass Butterworth $\\pi$-filter suppressing 2nd harmonic (866 MHz) and 3rd harmonic (1.3 GHz).",
          },
          {
            designator: "C1",
            name: "RF Shunt Capacitor",
            value: "4.7 pF (COG/NPO Ceramic, ±0.1pF)",
            packageType: "0603 SMD",
            connections: "From PA_BOOST to GND",
            rationale: "Cancels parasitic inductive reactance at 433 MHz carrier resonance.",
          },
          {
            designator: "C2",
            name: "RF Low-Pass Filter Shunt Cap",
            value: "10.0 pF (COG/NPO Ceramic, 50V)",
            packageType: "0603 SMD",
            connections: "From Node N_RF1 to RF Ground Plane",
            rationale: "Filters VHF/UHF out-of-band harmonics to comply with ETSI EN 300 220 radio standards.",
          },
          {
            designator: "C3",
            name: "DC Blocking / Antenna Match Cap",
            value: "6.8 pF (COG/NPO Ceramic)",
            packageType: "0603 SMD",
            connections: "Series coupling between L2 and SMA Center Pin",
            rationale: "Blocks DC supply voltage from reaching antenna coil while presenting < 0.5Ω RF impedance at 433MHz.",
          },
          {
            designator: "J1",
            name: "Antenna Connector",
            value: "SMA Female PCB Edge Mount (50Ω)",
            packageType: "Through-Hole / Edge 50Ω",
            connections: "Center Pin to C3, 4 Shield Flanges to Solid Ground Plane",
            rationale: "Gold-plated low-VSWR (<1.15) RF port for 433MHz rubber duck or dipole antenna connection.",
          },
          {
            designator: "C4, C5",
            name: "Supply Decoupling Capacitors",
            value: "100 nF + 10 µF (Ceramic X7R + Tantalum)",
            packageType: "0603 / 1206 SMD",
            connections: "SX1278 VDD_RF & VDD_ANA pins directly to GND",
            rationale: "Suppresses voltage droop during 100mA (+20dBm) PA transmit bursts, preventing RF phase jitter.",
          },
        ];

      case "WIFI_BLE_RF":
        return [
          {
            designator: "U1",
            name: "System-on-Chip (SoC)",
            value: "Espressif ESP32-D0WDQ6 Dual-Core 240MHz",
            packageType: "QFN-48 (5x5mm)",
            connections: "Pin 1 (LNA_IN / PA_OUT) to RF Matching Network",
            rationale: "Integrates 802.11 b/g/n 2.4GHz Wi-Fi baseband and Bluetooth 4.2 / 5.0 BLE transceiver with built-in PA/LNA.",
          },
          {
            designator: "L1",
            name: "Pi-Network Series Inductor",
            value: "2.4 nH (High-Q RF Murata LQG15HS)",
            packageType: "0402 SMD",
            connections: "Between ESP32 Pin 1 and Node N_ANT",
            rationale: "Matches internal complex impedance (typically (30 + j10)Ω) to 50Ω single-ended antenna transmission line.",
          },
          {
            designator: "C1",
            name: "Pi-Network Input Shunt Cap",
            value: "1.2 pF (COG/NPO Ceramic, ±0.05pF)",
            packageType: "0402 SMD",
            connections: "ESP32 Pin 1 to RF Shield Ground",
            rationale: "Forms input branch of 2.45 GHz low-pass matching network.",
          },
          {
            designator: "C2",
            name: "Pi-Network Output Shunt Cap",
            value: "1.0 pF (COG/NPO Ceramic, ±0.05pF)",
            packageType: "0402 SMD",
            connections: "Node N_ANT to Ground Plane",
            rationale: "Fine-tunes impedance looking into antenna feed to achieve VSWR < 1.2:1 across 2400-2484 MHz ISM band.",
          },
          {
            designator: "ANT1",
            name: "PCB Meander Inverted-F Antenna",
            value: "MIFA 2.4 GHz (Quarter-Wave Resonant)",
            packageType: "Copper Microstrip (FR4 1.6mm)",
            connections: "Feed point to Node N_ANT, Ground point to Top Ground Coplanar",
            rationale: "Compact omnidirectional radiator with 2.0 dBi peak gain and 85 MHz bandwidth covering Wi-Fi channels 1-13.",
          },
          {
            designator: "FB1",
            name: "Ferrite Bead Noise Choke",
            value: "BLM18HE152SN1D (1500Ω @ 100MHz, 500mA)",
            packageType: "0603 SMD",
            connections: "In series with +3.3V power feed to RF analog rail (VDD33)",
            rationale: "Isolates high-frequency digital switching noise of dual Tensilica cores from sensitive analog RF synthesizer.",
          },
          {
            designator: "Y1",
            name: "Main System Crystal",
            value: "40.000 MHz (±10 ppm Tolerance)",
            packageType: "SMD-4 (3.2x2.5mm)",
            connections: "Pins XTAL_P and XTAL_N on ESP32",
            rationale: "Primary clock generating 2.4GHz carrier through on-chip fractional-N PLL frequency multiplier.",
          },
        ];

      case "FRIIS_PROPAGATION":
        return [
          {
            designator: "PA1",
            name: "RF Power Amplifier Stage",
            value: "RFMD BGA616 MMIC / 2SC3356 Silicon RF BJT",
            packageType: "SOT-343 / SOT-89",
            connections: "Base to RF Input Signal, Collector to L_RFC Choke, Emitter to GND",
            rationale: "Amplifies modulated carrier to +20 dBm (100 mW) transmission power prior to antenna radiation.",
          },
          {
            designator: "L_RFC",
            name: "RF Choke Inductor",
            value: "100 nH (High Self-Resonant Frequency > 1.8GHz)",
            packageType: "0805 SMD Wirewound",
            connections: "+5V DC supply rail to Transistor Collector",
            rationale: "Supplies DC operating bias current while presenting open-circuit RF impedance (> 2.7 kΩ at 433 MHz).",
          },
          {
            designator: "C_BLK",
            name: "DC Blocking Capacitor",
            value: "100 pF (High-Q Low-ESR RF)",
            packageType: "0603 SMD",
            connections: "PA Collector to Transmit Antenna Feed",
            rationale: "Transmits RF power to antenna while blocking +5V DC voltage from shorting through antenna radiating elements.",
          },
          {
            designator: "ANT_TX",
            name: "Transmitting Radiator",
            value: "Half-Wave Dipole Antenna (Gain G_t = 2.15 dBi)",
            packageType: "Copper Rods (L = 34.6 cm @ 433MHz)",
            connections: "Balanced feed from transmitter RF output",
            rationale: "Converts guided RF transmission-line electrical currents into radiated spherical electromagnetic waves.",
          },
          {
            designator: "ANT_RX",
            name: "Receiving Radiator",
            value: "Half-Wave Dipole Antenna (Gain G_r = 2.15 dBi)",
            packageType: "Copper Rods (L = 34.6 cm @ 433MHz)",
            connections: "Captures incoming wavefront power and delivers to LNA input",
            rationale: "Effective receiving aperture: A_eff = (lambda^2 / 4*pi) * G_r = 0.043 m^2.",
          },
          {
            designator: "LNA1",
            name: "Low Noise Amplifier (LNA)",
            value: "Infineon BFP420 Low-Noise RF Transistor (NF = 1.1 dB)",
            packageType: "SOT-343",
            connections: "Input from ANT_RX through LC bandpass, Output to Demodulator Mixer",
            rationale: "Boosts microvolt-level received RF signals with minimal added thermal noise, establishing system noise figure.",
          },
        ];
    }
  };

  const bom = getBOM(circuitId);

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
      {/* Schematic Viewer Header & Controls */}
      <div className="bg-[#0b1122] border border-cyan-500/30 rounded-xl p-4 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              <Layers className="w-4 h-4" />
            </span>
            <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider">
              {circuitId === "LORA_SX1278" && "Complete LoRa SX1278 + ESP32 RF Subsystem Schematic"}
              {circuitId === "WIFI_BLE_RF" && "Complete ESP32 Wi-Fi & BLE RF Frontend & Matching Schematic"}
              {circuitId === "FRIIS_PROPAGATION" && "Complete Friis Free-Space RF Link & PA/LNA Transceiver Schematic"}
            </h3>
          </div>
          <p className="text-xs font-mono text-slate-400 mt-1">
            IEEE 315 / IEC 60617 Standard Electronic Circuit Diagram with All Passives, Inductors, Crystals, and IC Pins
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-slate-900/80 border border-slate-800 rounded-lg p-1 text-xs font-mono">
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.max(0.75, z - 0.15))}
              className="px-2.5 py-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 cursor-pointer"
              title="Zoom Out"
            >
              -
            </button>
            <span className="px-2 text-cyan-300 font-bold">{Math.round(zoomLevel * 100)}%</span>
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.min(1.5, z + 0.15))}
              className="px-2.5 py-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 cursor-pointer"
              title="Zoom In"
            >
              +
            </button>
            <button
              type="button"
              onClick={() => setZoomLevel(1)}
              className="px-2 py-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 cursor-pointer text-[10px]"
            >
              Reset
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

      {/* Interactive Circuit Schematic SVG Canvas */}
      <div className="bg-[#03060f] border border-cyan-500/20 rounded-xl p-4 shadow-2xl overflow-x-auto relative min-h-[460px] flex items-center justify-center">
        {/* Subtle engineering grid background */}
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
          {circuitId === "LORA_SX1278" && (
            <svg viewBox="0 0 980 460" className="w-[960px] h-[450px] select-none">
              <defs>
                <linearGradient id="icGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1e293b" />
                  <stop offset="100%" stopColor="#0f172a" />
                </linearGradient>
                <linearGradient id="rfGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#06b6d4" />
                  <stop offset="100%" stopColor="#10b981" />
                </linearGradient>
                <filter id="glowRf" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Title Header */}
              <text x="30" y="32" fill="#38bdf8" fontSize="14" fontWeight="bold" fontFamily="monospace">
                CIRCUIT DIAGRAM: SX1278 LORA TRANSCEIVER + ESP32 MASTER INTERFACE
              </text>
              <text x="30" y="48" fill="#64748b" fontSize="10" fontFamily="monospace">
                Semtech SX1278 (QFN-28) · SPI Interface · LC Harmonic Filter · 50Ω SMA Port · 32MHz TCXO Reference
              </text>

              {/* ==================== 1. ESP32 MCU BOX ==================== */}
              <rect x="30" y="75" width="220" height="340" rx="6" fill="url(#icGrad)" stroke="#38bdf8" strokeWidth="2" />
              <rect x="30" y="75" width="220" height="26" rx="6" fill="#0284c7" fillOpacity="0.3" />
              <text x="140" y="93" fill="#ffffff" fontSize="11" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                U1: ESP32 DEVKIT V1
              </text>

              {/* ESP32 Pin Labels */}
              {[
                { name: "+3.3V (VDD)", y: 130, color: "#f87171" },
                { name: "GND (VSS)", y: 165, color: "#94a3b8" },
                { name: "GPIO18 (SCK)", y: 200, color: "#38bdf8" },
                { name: "GPIO19 (MISO)", y: 235, color: "#38bdf8" },
                { name: "GPIO23 (MOSI)", y: 270, color: "#38bdf8" },
                { name: "GPIO5 (NSS/CS)", y: 305, color: "#fbbf24" },
                { name: "GPIO14 (RST)", y: 340, color: "#fbbf24" },
                { name: "GPIO2 (DIO0)", y: 375, color: "#34d399" },
              ].map((pin, i) => (
                <g key={i}>
                  <rect x="180" y={pin.y - 12} width="65" height="18" rx="3" fill="#0f172a" stroke="#334155" />
                  <text x="240" y={pin.y + 1} fill={pin.color} fontSize="9" fontWeight="bold" textAnchor="end" fontFamily="monospace">
                    {pin.name}
                  </text>
                  <circle cx="250" cy={pin.y} r="3" fill={pin.color} />
                </g>
              ))}

              {/* ==================== 2. SPI BUS BUSBAR ==================== */}
              <path d="M 250 200 L 400 200" stroke="#38bdf8" strokeWidth="1.5" />
              <path d="M 250 235 L 400 235" stroke="#38bdf8" strokeWidth="1.5" />
              <path d="M 250 270 L 400 270" stroke="#38bdf8" strokeWidth="1.5" />
              <path d="M 250 305 L 400 305" stroke="#fbbf24" strokeWidth="1.5" />
              <path d="M 250 340 L 400 340" stroke="#fbbf24" strokeWidth="1.5" />
              <path d="M 250 375 L 400 375" stroke="#34d399" strokeWidth="1.5" />

              {/* Animated data packet indicators on SPI bus */}
              <circle r="3" fill="#38bdf8">
                <animateMotion dur="0.9s" repeatCount="indefinite" path="M 250 200 L 400 200" />
              </circle>
              <circle r="3" fill="#34d399">
                <animateMotion dur="1.1s" repeatCount="indefinite" path="M 400 235 L 250 235" />
              </circle>
              <circle r="3" fill="#67e8f9">
                <animateMotion dur="1.0s" repeatCount="indefinite" path="M 250 270 L 400 270" />
              </circle>
              <circle r="3" fill="#4ade80">
                <animateMotion dur="1.3s" repeatCount="indefinite" path="M 400 375 L 250 375" />
              </circle>

              {/* ==================== 3. SX1278 LORA IC BOX ==================== */}
              <rect x="400" y="75" width="240" height="340" rx="6" fill="url(#icGrad)" stroke="#10b981" strokeWidth="2" />
              <rect x="400" y="75" width="240" height="26" rx="6" fill="#059669" fillOpacity="0.3" />
              <text x="520" y="93" fill="#ffffff" fontSize="11" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                U2: SEMTECH SX1278 (QFN-28)
              </text>

              {/* SX1278 Left Pins (Control/SPI) */}
              {[
                { name: "SCK (Pin 16)", y: 200, color: "#38bdf8" },
                { name: "MISO (Pin 17)", y: 235, color: "#38bdf8" },
                { name: "MOSI (Pin 18)", y: 270, color: "#38bdf8" },
                { name: "NSS (Pin 19)", y: 305, color: "#fbbf24" },
                { name: "RESET (Pin 7)", y: 340, color: "#fbbf24" },
                { name: "DIO0 (Pin 8)", y: 375, color: "#34d399" },
              ].map((pin, i) => (
                <g key={i}>
                  <circle cx="400" cy={pin.y} r="3" fill={pin.color} />
                  <rect x="405" y={pin.y - 10} width="95" height="18" rx="3" fill="#0f172a" stroke="#334155" />
                  <text x="410" y={pin.y + 2} fill={pin.color} fontSize="9" fontWeight="bold" fontFamily="monospace">
                    {pin.name}
                  </text>
                </g>
              ))}

              {/* SX1278 Right Pins (RF & XTAL) */}
              <g>
                <circle cx="640" cy="140" r="3" fill="#f87171" />
                <text x="632" y="143" fill="#f87171" fontSize="9" fontWeight="bold" textAnchor="end" fontFamily="monospace">
                  VDD_RF (Pin 21)
                </text>

                <circle cx="640" cy="200" r="3" fill="#06b6d4" />
                <text x="632" y="203" fill="#06b6d4" fontSize="9" fontWeight="bold" textAnchor="end" fontFamily="monospace">
                  PA_BOOST (Pin 27)
                </text>

                <circle cx="640" cy="300" r="3" fill="#a78bfa" />
                <text x="632" y="303" fill="#a78bfa" fontSize="9" fontWeight="bold" textAnchor="end" fontFamily="monospace">
                  OSC_IN (Pin 6)
                </text>
              </g>

              {/* ==================== 4. 32MHz TCXO OSCILLATOR ==================== */}
              <rect x="520" y="380" width="130" height="45" rx="4" fill="#1e1b4b" stroke="#818cf8" strokeWidth="1.5" />
              <text x="585" y="400" fill="#c7d2fe" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                Y1: 32.000 MHz TCXO
              </text>
              <text x="585" y="415" fill="#94a3b8" fontSize="8" textAnchor="middle" fontFamily="monospace">
                ±0.5 ppm / Ultra-Low Phase Noise
              </text>
              <path d="M 585 380 L 585 300 L 640 300" stroke="#818cf8" strokeWidth="1.5" fill="none" />

              {/* ==================== 5. RF MATCHING & FILTER NETWORK ==================== */}
              {/* Trace from PA_BOOST */}
              <path d="M 640 200 L 675 200" stroke="#06b6d4" strokeWidth="2.5" />

              {/* Shunt Capacitor C1 (4.7 pF) */}
              <circle cx="675" cy="200" r="3" fill="#06b6d4" />
              <path d="M 675 200 L 675 235" stroke="#94a3b8" strokeWidth="1.5" />
              {/* Capacitor symbol C1 */}
              <line x1="667" y1="235" x2="683" y2="235" stroke="#38bdf8" strokeWidth="2" />
              <line x1="667" y1="240" x2="683" y2="240" stroke="#38bdf8" strokeWidth="2" />
              <line x1="675" y1="240" x2="675" y2="255" stroke="#94a3b8" strokeWidth="1.5" />
              <line x1="668" y1="255" x2="682" y2="255" stroke="#64748b" strokeWidth="2" />
              <line x1="671" y1="258" x2="679" y2="258" stroke="#64748b" strokeWidth="1.5" />
              <text x="690" y="240" fill="#38bdf8" fontSize="8.5" fontWeight="bold" fontFamily="monospace">
                C1: 4.7pF
              </text>

              {/* Series Inductor L1 (12 nH) */}
              <path d="M 675 200 L 705 200" stroke="#06b6d4" strokeWidth="2.5" />
              {/* Inductor coil graphic L1 */}
              <path
                d="M 705 200 A 6 6 0 0 1 717 200 A 6 6 0 0 1 729 200 A 6 6 0 0 1 741 200"
                fill="none"
                stroke="#34d399"
                strokeWidth="2.5"
              />
              <text x="723" y="185" fill="#34d399" fontSize="8.5" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                L1: 12nH
              </text>
              <path d="M 741 200 L 765 200" stroke="#06b6d4" strokeWidth="2.5" />

              {/* Shunt Capacitor C2 (10 pF) */}
              <circle cx="765" cy="200" r="3" fill="#06b6d4" />
              <path d="M 765 200 L 765 235" stroke="#94a3b8" strokeWidth="1.5" />
              <line x1="757" y1="235" x2="773" y2="235" stroke="#38bdf8" strokeWidth="2" />
              <line x1="757" y1="240" x2="773" y2="240" stroke="#38bdf8" strokeWidth="2" />
              <line x1="765" y1="240" x2="765" y2="255" stroke="#94a3b8" strokeWidth="1.5" />
              <line x1="758" y1="255" x2="772" y2="255" stroke="#64748b" strokeWidth="2" />
              <line x1="761" y1="258" x2="769" y2="258" stroke="#64748b" strokeWidth="1.5" />
              <text x="780" y="240" fill="#38bdf8" fontSize="8.5" fontWeight="bold" fontFamily="monospace">
                C2: 10pF
              </text>

              {/* Series Inductor L2 (18 nH) */}
              <path
                d="M 765 200 L 790 200 A 6 6 0 0 1 802 200 A 6 6 0 0 1 814 200 A 6 6 0 0 1 826 200"
                fill="none"
                stroke="#34d399"
                strokeWidth="2.5"
              />
              <text x="808" y="185" fill="#34d399" fontSize="8.5" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                L2: 18nH
              </text>
              <path d="M 826 200 L 850 200" stroke="#06b6d4" strokeWidth="2.5" />

              {/* Series DC Block Capacitor C3 (6.8 pF) */}
              <line x1="850" y1="192" x2="850" y2="208" stroke="#38bdf8" strokeWidth="2.5" />
              <line x1="855" y1="192" x2="855" y2="208" stroke="#38bdf8" strokeWidth="2.5" />
              <text x="852" y="182" fill="#38bdf8" fontSize="8.5" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                C3: 6.8pF
              </text>
              <path d="M 855 200 L 890 200" stroke="#06b6d4" strokeWidth="2.5" />
              <circle r="3.5" fill="#22d3ee">
                <animateMotion dur="1.0s" repeatCount="indefinite" path="M 640 200 L 890 200" />
              </circle>

              {/* ==================== 6. 50-OHM SMA ANTENNA PORT ==================== */}
              <rect x="890" y="175" width="45" height="50" rx="3" fill="#1e293b" stroke="#e2e8f0" strokeWidth="1.5" />
              <text x="912" y="193" fill="#e2e8f0" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                J1: SMA
              </text>
              <text x="912" y="206" fill="#38bdf8" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                50 Ω
              </text>
              {/* Antenna Radiation Symbol */}
              <path d="M 935 200 L 965 200 L 975 170" stroke="#f59e0b" strokeWidth="2" fill="none" />
              <path d="M 965 200 L 975 230" stroke="#f59e0b" strokeWidth="2" fill="none" />
              <line x1="975" y1="170" x2="975" y2="230" stroke="#f59e0b" strokeWidth="2.5" />
              <text x="965" y="160" fill="#f59e0b" fontSize="8.5" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                ANT 433MHz
              </text>

              {/* Electromagnetic Wave Ripples from Antenna */}
              <path
                d="M 975 185 A 15 15 0 0 1 975 215"
                fill="none"
                stroke="#06b6d4"
                strokeWidth="1.5"
                opacity="0.8"
                className="animate-pulse"
              />
              <path
                d="M 975 175 A 25 25 0 0 1 975 225"
                fill="none"
                stroke="#06b6d4"
                strokeWidth="1.5"
                opacity="0.5"
                className="animate-pulse"
              />

              {/* Power Supply Bypass Block at Top */}
              <g>
                <path d="M 250 130 L 320 130 L 320 70 L 675 70 L 675 140 L 640 140" stroke="#f87171" strokeWidth="1.5" fill="none" />
                <circle cx="490" cy="70" r="3" fill="#f87171" />
                {/* Decoupling cap C4 100nF */}
                <path d="M 490 70 L 490 90" stroke="#94a3b8" strokeWidth="1.5" />
                <line x1="482" y1="90" x2="498" y2="90" stroke="#38bdf8" strokeWidth="2" />
                <line x1="482" y1="94" x2="498" y2="94" stroke="#38bdf8" strokeWidth="2" />
                <line x1="490" y1="94" x2="490" y2="105" stroke="#94a3b8" strokeWidth="1.5" />
                <line x1="484" y1="105" x2="496" y2="105" stroke="#64748b" strokeWidth="1.5" />
                <text x="505" y="94" fill="#38bdf8" fontSize="8" fontFamily="monospace">
                  C4: 100nF (X7R)
                </text>
              </g>

              {/* Note Legend */}
              <rect x="30" y="425" width="920" height="25" rx="4" fill="#0f172a" stroke="#1e293b" />
              <text x="40" y="441" fill="#94a3b8" fontSize="8.5" fontFamily="monospace">
                NOTE: Keep trace length between SX1278 PA_BOOST and SMA connector under 12mm. Use 50Ω coplanar waveguide geometry with continuous GND plane underneath.
              </text>
            </svg>
          )}

          {circuitId === "WIFI_BLE_RF" && (
            <svg viewBox="0 0 980 460" className="w-[960px] h-[450px] select-none">
              <defs>
                <linearGradient id="wifiIcGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1e293b" />
                  <stop offset="100%" stopColor="#0f172a" />
                </linearGradient>
              </defs>

              <text x="30" y="32" fill="#38bdf8" fontSize="14" fontWeight="bold" fontFamily="monospace">
                CIRCUIT DIAGRAM: ESP32 2.4 GHz WI-FI &amp; BLE RF FRONT-END (PI-MATCHING + MIFA)
              </text>
              <text x="30" y="48" fill="#64748b" fontSize="10" fontFamily="monospace">
                IEEE 802.11 b/g/n &amp; BLE 5.0 · Pi-Filter Network (C1, L1, C2) · 40MHz Main Reference · PCB Inverted-F Antenna
              </text>

              {/* ESP32 SoC Core */}
              <rect x="50" y="80" width="280" height="320" rx="8" fill="url(#wifiIcGrad)" stroke="#38bdf8" strokeWidth="2" />
              <rect x="50" y="80" width="280" height="28" rx="8" fill="#0284c7" fillOpacity="0.3" />
              <text x="190" y="100" fill="#ffffff" fontSize="12" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                U1: ESP32-D0WDQ6 SoC
              </text>

              {/* Pins */}
              <g>
                <circle cx="330" cy="180" r="4" fill="#06b6d4" />
                <text x="320" y="184" fill="#06b6d4" fontSize="10" fontWeight="bold" textAnchor="end" fontFamily="monospace">
                  LNA_IN / PA_OUT (Pin 1)
                </text>

                <circle cx="330" cy="120" r="3" fill="#f87171" />
                <text x="320" y="124" fill="#f87171" fontSize="9" fontWeight="bold" textAnchor="end" fontFamily="monospace">
                  VDD33_RF (Analog 3.3V)
                </text>

                <circle cx="330" cy="280" r="3" fill="#a78bfa" />
                <text x="320" y="284" fill="#a78bfa" fontSize="9" fontWeight="bold" textAnchor="end" fontFamily="monospace">
                  XTAL_P (Pin 28)
                </text>

                <circle cx="330" cy="310" r="3" fill="#a78bfa" />
                <text x="320" y="314" fill="#a78bfa" fontSize="9" fontWeight="bold" textAnchor="end" fontFamily="monospace">
                  XTAL_N (Pin 29)
                </text>
              </g>

              {/* 40MHz Crystal */}
              <rect x="400" y="270" width="100" height="50" rx="4" fill="#1e1b4b" stroke="#818cf8" strokeWidth="1.5" />
              <text x="450" y="292" fill="#c7d2fe" fontSize="9.5" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                Y1: 40.000 MHz
              </text>
              <text x="450" y="307" fill="#94a3b8" fontSize="8" textAnchor="middle" fontFamily="monospace">
                CL = 12 pF / ±10 ppm
              </text>
              <path d="M 330 280 L 400 280" stroke="#818cf8" strokeWidth="1.5" />
              <path d="M 330 310 L 400 310" stroke="#818cf8" strokeWidth="1.5" />

              {/* RF Pi-Network */}
              <path d="M 330 180 L 420 180" stroke="#06b6d4" strokeWidth="2.5" />

              {/* Shunt Cap C1 (1.2 pF) */}
              <circle cx="420" cy="180" r="3.5" fill="#06b6d4" />
              <path d="M 420 180 L 420 220" stroke="#94a3b8" strokeWidth="1.5" />
              <line x1="410" y1="220" x2="430" y2="220" stroke="#38bdf8" strokeWidth="2" />
              <line x1="410" y1="225" x2="430" y2="225" stroke="#38bdf8" strokeWidth="2" />
              <line x1="420" y1="225" x2="420" y2="240" stroke="#94a3b8" strokeWidth="1.5" />
              <line x1="412" y1="240" x2="428" y2="240" stroke="#64748b" strokeWidth="2" />
              <text x="438" y="224" fill="#38bdf8" fontSize="9" fontWeight="bold" fontFamily="monospace">
                C1: 1.2pF (COG)
              </text>

              {/* Series Inductor L1 (2.4 nH) */}
              <path d="M 420 180 L 460 180" stroke="#06b6d4" strokeWidth="2.5" />
              <path
                d="M 460 180 A 6 6 0 0 1 472 180 A 6 6 0 0 1 484 180 A 6 6 0 0 1 496 180"
                fill="none"
                stroke="#34d399"
                strokeWidth="2.5"
              />
              <text x="478" y="165" fill="#34d399" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                L1: 2.4nH
              </text>
              <path d="M 496 180 L 540 180" stroke="#06b6d4" strokeWidth="2.5" />

              {/* Shunt Cap C2 (1.0 pF) */}
              <circle cx="540" cy="180" r="3.5" fill="#06b6d4" />
              <path d="M 540 180 L 540 220" stroke="#94a3b8" strokeWidth="1.5" />
              <line x1="530" y1="220" x2="550" y2="220" stroke="#38bdf8" strokeWidth="2" />
              <line x1="530" y1="225" x2="550" y2="225" stroke="#38bdf8" strokeWidth="2" />
              <line x1="540" y1="225" x2="540" y2="240" stroke="#94a3b8" strokeWidth="1.5" />
              <line x1="532" y1="240" x2="548" y2="240" stroke="#64748b" strokeWidth="2" />
              <text x="558" y="224" fill="#38bdf8" fontSize="9" fontWeight="bold" fontFamily="monospace">
                C2: 1.0pF (COG)
              </text>

              {/* 50-Ohm Microstrip Feedline */}
              <path d="M 540 180 L 640 180" stroke="#06b6d4" strokeWidth="3" />
              <circle r="3.5" fill="#22d3ee">
                <animateMotion dur="0.95s" repeatCount="indefinite" path="M 330 180 L 640 180" />
              </circle>
              <text x="590" y="172" fill="#06b6d4" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                Z0 = 50 Ω
              </text>

              {/* PCB Inverted-F Antenna (MIFA) Layout Pattern */}
              <g transform="translate(640, 90)">
                <rect x="0" y="0" width="300" height="230" rx="4" fill="#042f2e" stroke="#14b8a6" strokeWidth="1.5" />
                <text x="150" y="25" fill="#2dd4bf" fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                  ANT1: 2.4GHz INVERTED-F PCB ANTENNA (MIFA)
                </text>

                {/* Ground plane copper */}
                <rect x="15" y="40" width="100" height="175" fill="#0f766e" opacity="0.6" />
                <text x="65" y="130" fill="#99f6e4" fontSize="9" textAnchor="middle" fontFamily="monospace">
                  GND PLANE
                </text>

                {/* Inverted F radiator arm */}
                <path
                  d="M 115 90 L 150 90 L 150 55 L 280 55 L 280 75 L 200 75 L 200 95 L 280 95 L 280 115 L 200 115"
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="6"
                  strokeLinecap="square"
                />
                {/* Feed connection */}
                <circle cx="150" cy="90" r="4" fill="#06b6d4" />
                <text x="150" y="108" fill="#38bdf8" fontSize="8.5" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                  50Ω Feed
                </text>
                {/* Shorting pin to ground */}
                <path d="M 115 55 L 150 55" stroke="#f59e0b" strokeWidth="6" />
                <text x="110" y="48" fill="#f59e0b" fontSize="8" fontFamily="monospace">
                  Shorting Stub
                </text>

                <text x="150" y="215" fill="#cbd5e1" fontSize="8.5" textAnchor="middle" fontFamily="monospace">
                  Resonant Freq: 2.45 GHz · Bandwidth: 85 MHz · Peak Gain: +2.0 dBi
                </text>
              </g>

              {/* Power supply choke FB1 */}
              <g>
                <path d="M 330 120 L 400 120" stroke="#f87171" strokeWidth="2" />
                <rect x="400" y="112" width="30" height="16" rx="2" fill="#334155" stroke="#f87171" />
                <text x="415" y="123" fill="#fecaca" fontSize="7.5" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                  FB1
                </text>
                <text x="415" y="142" fill="#f87171" fontSize="8" textAnchor="middle" fontFamily="monospace">
                  1500Ω @ 100MHz
                </text>
                <path d="M 430 120 L 480 120" stroke="#f87171" strokeWidth="2" />
                <text x="510" y="123" fill="#f87171" fontSize="9" fontWeight="bold" fontFamily="monospace">
                  +3.3V VDD
                </text>
              </g>

              <rect x="50" y="420" width="890" height="25" rx="4" fill="#0f172a" stroke="#1e293b" />
              <text x="60" y="436" fill="#94a3b8" fontSize="8.5" fontFamily="monospace">
                CRITICAL RF LAYOUT: Isolate the antenna keepout area on all layers. No copper ground planes, signal routing, or battery metals within 15mm of MIFA trace.
              </text>
            </svg>
          )}

          {circuitId === "FRIIS_PROPAGATION" && (
            <svg viewBox="0 0 980 460" className="w-[960px] h-[450px] select-none">
              <defs>
                <linearGradient id="friisGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#0284c7" />
                  <stop offset="100%" stopColor="#10b981" />
                </linearGradient>
              </defs>

              <text x="30" y="32" fill="#38bdf8" fontSize="14" fontWeight="bold" fontFamily="monospace">
                CIRCUIT &amp; PROPAGATION DIAGRAM: FRIIS FREE-SPACE TRANSMISSION (TX PA $\to$ EM WAVE $\to$ RX LNA)
              </text>
              <text x="30" y="48" fill="#64748b" fontSize="10" fontFamily="monospace">
                Power Amplifier Stage · Half-Wave Dipoles · Free Space Propagation Loss ($FSPL$) · Low Noise Amplifier Stage
              </text>

              {/* ==================== 1. TRANSMITTER STAGE ==================== */}
              <rect x="30" y="80" width="260" height="320" rx="8" fill="#0f172a" stroke="#0284c7" strokeWidth="2" />
              <rect x="30" y="80" width="260" height="28" rx="8" fill="#0284c7" fillOpacity="0.25" />
              <text x="160" y="99" fill="#38bdf8" fontSize="11" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                TRANSMITTER RF POWER STAGE
              </text>

              {/* BJT RF Power Transistor */}
              <circle cx="160" cy="220" r="30" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.5" />
              {/* BJT Symbol */}
              <line x1="145" y1="205" x2="145" y2="235" stroke="#ffffff" strokeWidth="2.5" />
              {/* Base */}
              <line x1="120" y1="220" x2="145" y2="220" stroke="#38bdf8" strokeWidth="2" />
              <text x="90" y="223" fill="#38bdf8" fontSize="9" fontWeight="bold" fontFamily="monospace">
                RF IN
              </text>
              {/* Collector */}
              <line x1="145" y1="212" x2="175" y2="195" stroke="#38bdf8" strokeWidth="2" />
              {/* Emitter with arrow */}
              <line x1="145" y1="228" x2="175" y2="245" stroke="#38bdf8" strokeWidth="2" />
              <polygon points="175,245 168,238 165,245" fill="#38bdf8" />
              {/* Emitter to ground */}
              <line x1="175" y1="245" x2="175" y2="280" stroke="#94a3b8" strokeWidth="1.5" />
              <line x1="167" y1="280" x2="183" y2="280" stroke="#64748b" strokeWidth="2" />

              {/* RF Choke L_RFC on Collector */}
              <path d="M 175 195 L 175 150" stroke="#f87171" strokeWidth="2" />
              <path
                d="M 175 150 A 5 5 0 0 1 175 140 A 5 5 0 0 1 175 130 A 5 5 0 0 1 175 120"
                fill="none"
                stroke="#34d399"
                strokeWidth="2"
              />
              <text x="210" y="135" fill="#34d399" fontSize="8" fontWeight="bold" fontFamily="monospace">
                L_RFC: 100nH
              </text>
              <line x1="175" y1="120" x2="175" y2="110" stroke="#f87171" strokeWidth="2" />
              <text x="175" y="105" fill="#f87171" fontSize="8.5" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                +5V DC
              </text>

              {/* DC Block Cap to Antenna */}
              <circle cx="175" cy="195" r="3" fill="#38bdf8" />
              <line x1="175" y1="195" x2="220" y2="195" stroke="#38bdf8" strokeWidth="2" />
              <line x1="220" y1="187" x2="220" y2="203" stroke="#38bdf8" strokeWidth="2.5" />
              <line x1="225" y1="187" x2="225" y2="203" stroke="#38bdf8" strokeWidth="2.5" />
              <text x="222" y="178" fill="#38bdf8" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                C_BLK: 100pF
              </text>
              <line x1="225" y1="195" x2="260" y2="195" stroke="#38bdf8" strokeWidth="2" />

              {/* TX Dipole Antenna */}
              <line x1="260" y1="140" x2="260" y2="250" stroke="#f59e0b" strokeWidth="3" />
              <circle cx="260" cy="195" r="3.5" fill="#f59e0b" />
              <text x="250" y="132" fill="#f59e0b" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                ANT_TX (Gt)
              </text>
              <text x="160" y="380" fill="#94a3b8" fontSize="8.5" textAnchor="middle" fontFamily="monospace">
                P_tx = +14 to +20 dBm (100mW)
              </text>

              {/* ==================== 2. WIRELESS PROPAGATION SPACE ==================== */}
              <g transform="translate(310, 80)">
                <rect x="0" y="0" width="360" height="320" rx="8" fill="#050a16" stroke="#1e293b" />
                <text x="180" y="25" fill="#38bdf8" fontSize="10.5" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                  FREE-SPACE EM PATH (DISTANCE: d)
                </text>

                {/* Spherical Wavefronts */}
                {[50, 90, 130, 170, 210, 250, 290].map((radius, idx) => (
                  <path
                    key={idx}
                    d={`M 10 ${160 - radius * 0.4} A ${radius} ${radius} 0 0 1 10 ${160 + radius * 0.4}`}
                    fill="none"
                    stroke="#06b6d4"
                    strokeWidth="1.5"
                    strokeDasharray={idx % 2 === 0 ? "none" : "4 4"}
                    opacity={Math.max(0.15, 1 - idx * 0.12)}
                  />
                ))}
                <circle r="4" fill="#22d3ee">
                  <animateMotion dur="1.4s" repeatCount="indefinite" path="M 0 160 L 360 115" />
                </circle>
                <circle r="3.5" fill="#34d399">
                  <animateMotion dur="1.4s" begin="0.7s" repeatCount="indefinite" path="M 0 160 L 360 115" />
                </circle>

                {/* Friis Law Formula Box */}
                <rect x="30" y="210" width="300" height="90" rx="6" fill="#0c172e" stroke="#0284c7" strokeWidth="1" />
                <text x="180" y="230" fill="#38bdf8" fontSize="11" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                  FRIIS TRANSMISSION FORMULA:
                </text>
                <text x="180" y="252" fill="#ffffff" fontSize="11" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                  P_rx = P_tx · G_tx · G_rx · [ λ / (4πd) ]²
                </text>
                <text x="180" y="272" fill="#34d399" fontSize="9.5" textAnchor="middle" fontFamily="monospace">
                  FSPL (dB) = 20·log10(d) + 20·log10(f) + 32.44
                </text>
                <text x="180" y="288" fill="#94a3b8" fontSize="8" textAnchor="middle" fontFamily="monospace">
                  λ = c / f = 3×10⁸ m/s ÷ 433 MHz = 0.692 m
                </text>
              </g>

              {/* ==================== 3. RECEIVER LNA STAGE ==================== */}
              <g transform="translate(690, 80)">
                <rect x="0" y="0" width="260" height="320" rx="8" fill="#0f172a" stroke="#10b981" strokeWidth="2" />
                <rect x="0" y="0" width="260" height="28" rx="8" fill="#10b981" fillOpacity="0.25" />
                <text x="130" y="19" fill="#34d399" fontSize="11" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                  RECEIVER LNA STAGE
                </text>

                {/* RX Antenna */}
                <line x1="20" y1="60" x2="20" y2="170" stroke="#f59e0b" strokeWidth="3" />
                <circle cx="20" cy="115" r="3.5" fill="#f59e0b" />
                <text x="20" y="50" fill="#f59e0b" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                  ANT_RX (Gr)
                </text>

                <line x1="20" y1="115" x2="60" y2="115" stroke="#34d399" strokeWidth="2" />

                {/* LC Pre-selection filter */}
                <path
                  d="M 60 115 A 5 5 0 0 1 70 115 A 5 5 0 0 1 80 115"
                  fill="none"
                  stroke="#34d399"
                  strokeWidth="2"
                />
                <line x1="80" y1="115" x2="110" y2="115" stroke="#34d399" strokeWidth="2" />

                {/* LNA BFP420 Transistor */}
                <circle cx="140" cy="140" r="28" fill="#1e293b" stroke="#10b981" strokeWidth="1.5" />
                <line x1="126" y1="126" x2="126" y2="154" stroke="#ffffff" strokeWidth="2.5" />
                <line x1="110" y1="140" x2="126" y2="140" stroke="#34d399" strokeWidth="2" />
                <line x1="126" y1="133" x2="154" y2="118" stroke="#34d399" strokeWidth="2" />
                <line x1="126" y1="147" x2="154" y2="162" stroke="#34d399" strokeWidth="2" />

                {/* Output to mixer */}
                <line x1="154" y1="118" x2="210" y2="118" stroke="#34d399" strokeWidth="2" />
                <circle cx="210" cy="118" r="3" fill="#34d399" />
                <text x="210" y="105" fill="#34d399" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                  TO MIXER / ADC
                </text>

                <text x="130" y="240" fill="#94a3b8" fontSize="8.5" textAnchor="middle" fontFamily="monospace">
                  LNA Gain: +18 dB · Noise Figure: 1.1 dB
                </text>
                <text x="130" y="260" fill="#38bdf8" fontSize="8.5" textAnchor="middle" fontFamily="monospace">
                  P_rx Sensitivity: down to -137 dBm
                </text>
              </g>

              <rect x="30" y="420" width="920" height="25" rx="4" fill="#0f172a" stroke="#1e293b" />
              <text x="40" y="436" fill="#94a3b8" fontSize="8.5" fontFamily="monospace">
                PHYSICAL PRINCIPLE: Received power drops inversely with the square of distance (1/d²). Doubling distance reduces signal by -6.02 dB.
              </text>
            </svg>
          )}
        </div>
      </div>

      {/* Bill of Materials (BOM) Table */}
      <div className="bg-[#0b1122] border border-cyan-500/30 rounded-xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
              Engineering Bill of Materials (BOM) &amp; Component Specifications
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
                <th className="py-2.5 px-3">Terminal Wiring / Connections</th>
                <th className="py-2.5 px-3">Circuit Function &amp; Rationale</th>
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

export default WirelessSchematicViewer;
