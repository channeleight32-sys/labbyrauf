import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Zap,
  Sliders,
  Activity,
  Play,
  Pause,
  RotateCcw,
  StepForward,
  AlertTriangle,
  Gauge,
  Terminal,
  BookOpen,
  RefreshCw,
  Radio,
  Eye,
  Check,
  Code2,
  Copy,
  ChevronDown,
  Layers,
  ArrowRight,
  Sparkles,
  HelpCircle,
  FileCode,
} from "lucide-react";
import {
  VlcModulation,
  VlcParity,
  VlcWavelength,
  VlcTransmitterParams,
  VlcChannelParams,
  VlcReceiverParams,
  VlcSimulationResult,
  runVlcSimulation,
} from "../utils/vlcSimulationEngine";
import {
  ESP32_TX_FIRMWARE_CPP,
  ESP32_RX_FIRMWARE_CPP,
} from "../utils/vlcFirmwareSources";
import OpticalSchematicViewer from "./OpticalSchematicViewer";
import VlcOpticalBench3D from "./VlcOpticalBench3D";
import {
  usePrefersReducedMotion,
  usePageVisibility,
} from "../utils/animationHelpers";

interface OpticalWirelessLabProps {
  onBackToWorkbench?: () => void;
}

const PRESET_EXPERIMENTS = [
  {
    id: "clean-hello",
    label: "Lab 1: Clean Baseline (HELLO)",
    description: "Ideal short-range (0.8m) link in low ambient light (50 lux) with 100% packet success.",
    text: "HELLO",
    distance: 0.8,
    ambient: 50,
    baud: 600,
    modulation: "OOK_NRZ" as VlcModulation,
    parity: "EVEN" as VlcParity,
    rf: 100000,
    autoThresh: true,
  },
  {
    id: "long-message",
    label: "Lab 2: Long Multi-Packet Stream",
    description: "Multi-character string testing asynchronous UART packet streaming and frame boundary locking.",
    text: "IST VISIBLE LIGHT COMM 2026",
    distance: 1.0,
    ambient: 120,
    baud: 600,
    modulation: "OOK_NRZ" as VlcModulation,
    parity: "EVEN" as VlcParity,
    rf: 120000,
    autoThresh: true,
  },
  {
    id: "zero-noise",
    label: "Lab 3: Zero-Noise Darkroom",
    description: "Zero ambient background (0 lux) in darkroom enclosure, yielding SNR > 30 dB and zero bit errors.",
    text: "ZERO NOISE TEST",
    distance: 0.5,
    ambient: 0,
    baud: 1200,
    modulation: "OOK_NRZ" as VlcModulation,
    parity: "NONE" as VlcParity,
    rf: 82000,
    autoThresh: true,
  },
  {
    id: "ambient-noise",
    label: "Lab 4: High Ambient Sunlight",
    description: "Intense 3500 lux lighting creating DC photocurrent offset and elevated shot noise on photodiode.",
    text: "SUNLIGHT 3500 LUX",
    distance: 1.2,
    ambient: 3500,
    baud: 600,
    modulation: "OOK_NRZ" as VlcModulation,
    parity: "EVEN" as VlcParity,
    rf: 68000,
    autoThresh: true,
  },
  {
    id: "long-range",
    label: "Lab 5: Long Range Attenuation (3.5m)",
    description: "Demonstrates 1/d^2 geometric path loss at 3.5m distance with weak received optical power (~0.4 µW).",
    text: "LONG RANGE LINK",
    distance: 3.5,
    ambient: 150,
    baud: 300,
    modulation: "OOK_NRZ" as VlcModulation,
    parity: "EVEN" as VlcParity,
    rf: 220000,
    autoThresh: true,
  },
  {
    id: "reduced-sensitivity",
    label: "Lab 6: Reduced Receiver Sensitivity",
    description: "Low TIA gain (Rf = 22kΩ) producing a compressed analog signal, testing manual threshold calibration.",
    text: "LOW GAIN SENSITIVITY",
    distance: 1.2,
    ambient: 100,
    baud: 600,
    modulation: "OOK_NRZ" as VlcModulation,
    parity: "NONE" as VlcParity,
    rf: 22000,
    autoThresh: false,
  },
  {
    id: "high-baud",
    label: "Lab 7: High-Speed Baud (2400 bps)",
    description: "Narrow bit period (416 µs) evaluating bandwidth limits and timing jitter on the Eye Diagram.",
    text: "OPTICAL 2400 BPS",
    distance: 0.9,
    ambient: 150,
    baud: 2400,
    modulation: "OOK_NRZ" as VlcModulation,
    parity: "EVEN" as VlcParity,
    rf: 47000,
    autoThresh: true,
  },
  {
    id: "manchester-immunity",
    label: "Lab 8: Manchester DC-Wander Immunity",
    description: "Differential Manchester split-phase encoding immune to fluctuating DC ambient offsets.",
    text: "MANCHESTER 802.3",
    distance: 1.4,
    ambient: 2000,
    baud: 1200,
    modulation: "MANCHESTER" as VlcModulation,
    parity: "NONE" as VlcParity,
    rf: 100000,
    autoThresh: true,
  },
];

const WAVELENGTH_CONFIGS: Record<
  VlcWavelength,
  {
    label: string;
    colorHex: string;
    beamGradient: string;
    nm: number;
    typicalVf: number;
    responsivity: number;
  }
> = {
  RED_650: {
    label: "Red (650 nm)",
    colorHex: "#ef4444",
    beamGradient: "rgba(239, 68, 68, 0.45)",
    nm: 650,
    typicalVf: 2.1,
    responsivity: 0.58,
  },
  GREEN_525: {
    label: "Green (525 nm)",
    colorHex: "#10b981",
    beamGradient: "rgba(16, 185, 129, 0.45)",
    nm: 525,
    typicalVf: 3.2,
    responsivity: 0.42,
  },
  BLUE_470: {
    label: "Blue (470 nm)",
    colorHex: "#3b82f6",
    beamGradient: "rgba(59, 130, 246, 0.45)",
    nm: 470,
    typicalVf: 3.4,
    responsivity: 0.32,
  },
  WHITE_PHOSPHOR: {
    label: "White (5500K)",
    colorHex: "#f8fafc",
    beamGradient: "rgba(248, 250, 252, 0.55)",
    nm: 550,
    typicalVf: 3.3,
    responsivity: 0.45,
  },
};

export const OpticalWirelessLab: React.FC<OpticalWirelessLabProps> = ({
  onBackToWorkbench,
}) => {
  // --- Simulation Parameters State ---
  const [message, setMessage] = useState<string>("HELLO");

  // Transmitter Settings
  const [wavelength, setWavelength] = useState<VlcWavelength>("RED_650");
  const [halfPowerAngle, setHalfPowerAngle] = useState<number>(30);
  const [driveCurrentMa, setDriveCurrentMa] = useState<number>(20);
  const [baudRate, setBaudRate] = useState<number>(600);
  const [modulation, setModulation] = useState<VlcModulation>("OOK_NRZ");
  const [parity, setParity] = useState<VlcParity>("EVEN");

  // Free-Space Channel Settings
  const [distanceM, setDistanceM] = useState<number>(0.8);
  const [irradianceAngleDeg, setIrradianceAngleDeg] = useState<number>(0);
  const [incidenceAngleDeg, setIncidenceAngleDeg] = useState<number>(0);
  const [ambientLightLux, setAmbientLightLux] = useState<number>(50);

  // Receiver Settings
  const [photodiodeAreaMm2] = useState<number>(7.5);
  const [receiverFovDeg] = useState<number>(60);
  const [lensGain, setLensGain] = useState<number>(2.0);
  const [tiaResistorOhm, setTiaResistorOhm] = useState<number>(100000);
  const [acCoupled, setAcCoupled] = useState<boolean>(true);
  const [autoThreshold, setAutoThreshold] = useState<boolean>(true);
  const [manualThresholdV, setManualThresholdV] = useState<number>(1.2);

  // UI Interactive States
  const [isTransmitting, setIsTransmitting] = useState<boolean>(false);
  const [continuousLoop, setContinuousLoop] = useState<boolean>(false);
  const [currentBitIndex, setCurrentBitIndex] = useState<number>(0);
  const [showCircuitSchematic, setShowCircuitSchematic] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<
    "OSCILLOSCOPE" | "EYE_DIAGRAM" | "LINK_TELEMETRY" | "ESP32_FIRMWARE" | "THEORY"
  >("OSCILLOSCOPE");
  const [activeFirmwareTab, setActiveFirmwareTab] = useState<"TX" | "RX">("TX");
  const [copiedDecodedText, setCopiedDecodedText] = useState<boolean>(false);
  const [copiedFirmware, setCopiedFirmware] = useState<boolean>(false);
  const [dsoTimebase, setDsoTimebase] = useState<number>(1.0); // zoom scale factor
  const [rxEyeWidgetExpanded, setRxEyeWidgetExpanded] = useState<boolean>(true);
  const [benchViewMode, setBenchViewMode] = useState<"3D" | "2D">("3D");
  const [photonPhase, setPhotonPhase] = useState<number>(0);

  const prefersReducedMotion = usePrefersReducedMotion();
  const isPageVisible = usePageVisibility();

  // Smooth RAF photon stream phase synced strictly with active VLC transmission
  useEffect(() => {
    if (!isTransmitting || prefersReducedMotion || !isPageVisible) {
      return;
    }
    let rafId = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.08, (now - last) / 1000);
      last = now;
      const rateMult = Math.max(0.6, Math.min(2.6, baudRate / 600));
      setPhotonPhase((p) => (p + dt * 0.9 * rateMult) % 1);
      rafId = window.requestAnimationFrame(tick);
    };
    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [isTransmitting, baudRate, prefersReducedMotion, isPageVisible]);

  // Build simulation parameter definitions
  const txParams: VlcTransmitterParams = useMemo(
    () => ({
      wavelength,
      halfPowerAngleDeg: halfPowerAngle,
      driveCurrentMa,
      efficiencyWPerA: 0.25,
      baudRate,
      modulation,
      parity,
    }),
    [wavelength, halfPowerAngle, driveCurrentMa, baudRate, modulation, parity]
  );

  const channelParams: VlcChannelParams = useMemo(
    () => ({
      distanceM,
      irradianceAngleDeg,
      incidenceAngleDeg,
      ambientLightLux,
    }),
    [distanceM, irradianceAngleDeg, incidenceAngleDeg, ambientLightLux]
  );

  const rxParams: VlcReceiverParams = useMemo(
    () => ({
      photodiodeAreaMm2,
      responsivityAW: WAVELENGTH_CONFIGS[wavelength].responsivity,
      receiverFovDeg,
      lensConcentratorGain: lensGain,
      tiaFeedbackResistorOhm: tiaResistorOhm,
      acCoupledFilter: acCoupled,
      autoThreshold,
      manualThresholdVolts: manualThresholdV,
    }),
    [
      photodiodeAreaMm2,
      wavelength,
      receiverFovDeg,
      lensGain,
      tiaResistorOhm,
      acCoupled,
      autoThreshold,
      manualThresholdV,
    ]
  );

  // Run the physical mathematical simulation engine
  const simResult: VlcSimulationResult = useMemo(() => {
    return runVlcSimulation(message, txParams, channelParams, rxParams);
  }, [message, txParams, channelParams, rxParams]);

  // Transmission animation timer
  const animIntervalRef = useRef<number | null>(null);

  const handleStartTransmission = () => {
    setCurrentBitIndex(0);
    setIsTransmitting(true);
  };

  const handlePauseTransmission = () => {
    setIsTransmitting(false);
  };

  const handleResetTransmission = () => {
    setIsTransmitting(false);
    setCurrentBitIndex(0);
  };

  const handleStepBit = () => {
    setCurrentBitIndex(
      (prev) => (prev + 1) % Math.max(1, simResult.transmittedBits.length)
    );
  };

  useEffect(() => {
    if (!isTransmitting) {
      if (animIntervalRef.current) clearInterval(animIntervalRef.current);
      return;
    }

    // Step rate proportional to baud rate (capped between 25ms and 300ms for visual comfort)
    const stepMs = Math.max(30, Math.min(250, 1000 / (baudRate / 3)));
    animIntervalRef.current = window.setInterval(() => {
      setCurrentBitIndex((prev) => {
        if (prev + 1 >= simResult.transmittedBits.length) {
          if (continuousLoop) {
            return 0;
          } else {
            setIsTransmitting(false);
            return prev;
          }
        }
        return prev + 1;
      });
    }, stepMs);

    return () => {
      if (animIntervalRef.current) clearInterval(animIntervalRef.current);
    };
  }, [isTransmitting, continuousLoop, baudRate, simResult.transmittedBits.length]);

  const activeBit = simResult.transmittedBits[currentBitIndex] || {
    bitIndex: 0,
    type: "IDLE",
    value: 1,
    charIndex: 0,
    char: "",
  };

  const activeRxBit = simResult.receivedRawBits[currentBitIndex] ?? 1;
  const isBitMatching = activeBit.value === activeRxBit;
  const currentWavelengthCfg = WAVELENGTH_CONFIGS[wavelength];

  const handleLoadPreset = (preset: (typeof PRESET_EXPERIMENTS)[0]) => {
    setMessage(preset.text);
    setDistanceM(preset.distance);
    setAmbientLightLux(preset.ambient);
    setBaudRate(preset.baud);
    setModulation(preset.modulation);
    setParity(preset.parity);
    setTiaResistorOhm(preset.rf);
    setAutoThreshold(preset.autoThresh);
    setCurrentBitIndex(0);
    setIsTransmitting(false);
  };

  const handleCopyDecoded = () => {
    if (simResult.decodedText) {
      navigator.clipboard.writeText(simResult.decodedText);
      setCopiedDecodedText(true);
      setTimeout(() => setCopiedDecodedText(false), 2000);
    }
  };

  const handleCopyFirmware = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedFirmware(true);
    setTimeout(() => setCopiedFirmware(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#0B1220] text-[#F1F5FA] flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Top Telemetry Header Ribbon */}
      <header className="border-b border-[#24344D] bg-[#111B2B] px-4 md:px-6 py-3 sticky top-14 z-30 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-md shadow-cyan-500/20">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-white tracking-tight">
                  IST Optical Wireless Communication Lab
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold uppercase">
                  PROJECT 001 · VLC TRANSCEIVER
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Department of Electrical Engineering · Visible Light Communication Workbench
              </p>
            </div>
          </div>

          {/* Quick Preset Selector Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 bg-[#080d1a] border border-slate-800 rounded-lg p-1 text-xs">
            <span className="text-[10px] font-mono text-slate-500 px-1.5 hidden sm:inline">
              8 Lab Manuals:
            </span>
            {PRESET_EXPERIMENTS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleLoadPreset(preset)}
                className="px-2.5 py-1 rounded text-slate-300 hover:text-white hover:bg-slate-800/90 transition-colors font-mono cursor-pointer text-[11px]"
                title={preset.description}
              >
                {preset.label.split(":")[0]}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowCircuitSchematic((v) => !v)}
              className={`px-3 py-1.5 text-xs font-mono font-medium rounded-lg border transition cursor-pointer flex items-center gap-1.5 ${
                showCircuitSchematic
                  ? "bg-cyan-500/20 border-cyan-400 text-cyan-200"
                  : "bg-slate-900 border-slate-700 text-slate-300 hover:text-white"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{showCircuitSchematic ? "Hide Circuit Wiring" : "Show Circuit Wiring"}</span>
            </button>

            {onBackToWorkbench && (
              <button
                type="button"
                onClick={onBackToWorkbench}
                className="px-3 py-1.5 text-xs font-mono font-medium rounded-lg border border-slate-700 bg-slate-900/80 text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                Exit to Home
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Workbench Body */}
      <div className="flex-1 max-w-[1720px] w-full mx-auto p-4 md:p-6 space-y-6">
        {/* 5-Stage Optical Signal-Flow Navigator */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5 bg-[#0b1122] border border-cyan-500/20 rounded-xl p-3">
          {[
            {
              step: "Stage 1 · TX Driver",
              metric: `${driveCurrentMa} mA · ${baudRate} bps`,
              action: () => setShowCircuitSchematic(true),
              active: showCircuitSchematic,
            },
            {
              step: "Stage 2 · LOS Channel",
              metric: `${distanceM.toFixed(1)}m · ${ambientLightLux} lux`,
              action: () => setShowCircuitSchematic(false),
              active: !showCircuitSchematic && activeTab === "LINK_TELEMETRY",
            },
            {
              step: "Stage 3 · RX PIN + TIA",
              metric: `${simResult.statistics.receivedPowerUw.toFixed(2)} µW · ${(tiaResistorOhm / 1000).toFixed(0)}kΩ`,
              action: () => setActiveTab("LINK_TELEMETRY"),
              active: activeTab === "LINK_TELEMETRY",
            },
            {
              step: "Stage 4 · DSO & Eye",
              metric: `SNR ${simResult.statistics.snrDb} dB · BER ${simResult.statistics.measuredBer.toExponential(1)}`,
              action: () => setActiveTab(activeTab === "EYE_DIAGRAM" ? "OSCILLOSCOPE" : "EYE_DIAGRAM"),
              active: activeTab === "OSCILLOSCOPE" || activeTab === "EYE_DIAGRAM",
            },
            {
              step: "Stage 5 · ESP32 Code",
              metric: `TX & RX .ino + Theory`,
              action: () => setActiveTab(activeTab === "ESP32_FIRMWARE" ? "THEORY" : "ESP32_FIRMWARE"),
              active: activeTab === "ESP32_FIRMWARE" || activeTab === "THEORY",
            },
          ].map((stage, i) => (
            <button
              key={stage.step}
              type="button"
              onClick={stage.action}
              className={`text-left px-3 py-2 rounded-lg border transition-colors cursor-pointer ${
                stage.active
                  ? "bg-cyan-500/15 border-cyan-400/60 text-white"
                  : "bg-[#070b14] border-slate-800 text-slate-300 hover:border-cyan-500/40"
              }`}
            >
              <div className="flex items-center justify-between text-[10px] font-mono text-cyan-400 font-bold">
                <span>{stage.step}</span>
                <span>0{i + 1}</span>
              </div>
              <div className="text-xs font-mono text-slate-200 mt-0.5 truncate tabular-nums">
                {stage.metric}
              </div>
            </button>
          ))}
        </div>

        {/* =========================================================================
            SECTION 1: PHYSICAL OPTICAL BENCH STAGE (LIVE VISUALIZATION)
            ========================================================================= */}
        <div className="bg-[#0b1122] border border-cyan-500/20 rounded-xl p-5 shadow-xl relative overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider">
              <Zap className="w-4 h-4 text-cyan-400" />
              <span>Interactive Optical Test Bench · Free-Space Line-of-Sight (LOS) Channel</span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-slate-400">
              <div className="inline-flex items-center bg-[#060a14] border border-slate-700 rounded-lg p-0.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => setBenchViewMode("3D")}
                  className={`px-2 py-0.5 rounded font-bold cursor-pointer ${
                    benchViewMode === "3D" ? "bg-cyan-400 text-slate-950" : "text-slate-400 hover:text-white"
                  }`}
                >
                  3D Optical Bench
                </button>
                <button
                  type="button"
                  onClick={() => setBenchViewMode("2D")}
                  className={`px-2 py-0.5 rounded font-bold cursor-pointer ${
                    benchViewMode === "2D" ? "bg-cyan-400 text-slate-950" : "text-slate-400 hover:text-white"
                  }`}
                >
                  2D Diagram
                </button>
              </div>
              <span>
                Link Distance: <strong className="text-cyan-300">{distanceM.toFixed(2)} m</strong>
              </span>
              <span>·</span>
              <span>
                Path Loss H(0):{" "}
                <strong className="text-amber-300">
                  {(simResult.statistics.channelDcGainH0 * 1e6).toFixed(2)} µW/W
                </strong>
              </span>
              <span>·</span>
              <span>
                Status:{" "}
                <strong
                  className={
                    isTransmitting
                      ? "text-emerald-400 font-bold"
                      : "text-slate-400"
                  }
                >
                  {isTransmitting ? "TRANSMITTING" : "STANDBY (READY)"}
                </strong>
              </span>
            </div>
          </div>

          {benchViewMode === "3D" ? (
            <VlcOpticalBench3D
              wavelengthColorHex={currentWavelengthCfg.colorHex}
              wavelengthNm={currentWavelengthCfg.nm}
              distanceM={distanceM}
              halfPowerAngleDeg={halfPowerAngle}
              irradianceAngleDeg={irradianceAngleDeg}
              incidenceAngleDeg={incidenceAngleDeg}
              driveCurrentMa={driveCurrentMa}
              ambientLightLux={ambientLightLux}
              lensGain={lensGain}
              tiaResistorOhm={tiaResistorOhm}
              receivedPowerUw={simResult.statistics.receivedPowerUw}
              snrDb={simResult.statistics.snrDb}
              isTransmitting={isTransmitting}
              txBitValue={activeBit.value}
              rxBitValue={activeRxBit}
              isBitMatching={isBitMatching}
              baudRate={baudRate}
            />
          ) : (
            <div className="w-full h-72 bg-[#040711] rounded-lg border border-slate-800 relative overflow-hidden flex items-center justify-between px-6 select-none shadow-inner">
            {/* Ambient Lighting Rays Overlay */}
            {ambientLightLux > 0 && (
              <div
                className="absolute inset-0 pointer-events-none transition-opacity duration-300"
                style={{
                  background: `radial-gradient(ellipse at 50% 0%, rgba(251, 191, 36, ${Math.min(
                    0.35,
                    (ambientLightLux / 8000) * 0.4
                  )}) 0%, transparent 80%)`,
                }}
              />
            )}

            {/* Left Station: ESP32 Transmitter Workstation */}
            <div className="z-10 flex flex-col items-center">
              {/* Detailed ESP32 Virtual Development Board */}
              <div className="w-40 bg-[#101b33] border-2 border-cyan-500/60 rounded-lg p-2.5 shadow-2xl relative">
                {/* PCB Screws */}
                <div className="absolute top-1 left-1 w-1.5 h-1.5 rounded-full bg-slate-400 border border-slate-600" />
                <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-slate-400 border border-slate-600" />
                <div className="absolute bottom-1 left-1 w-1.5 h-1.5 rounded-full bg-slate-400 border border-slate-600" />
                <div className="absolute bottom-1 right-1 w-1.5 h-1.5 rounded-full bg-slate-400 border border-slate-600" />

                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    <span className="text-[10px] font-mono font-bold text-cyan-300">ESP32-TX</span>
                  </div>
                  <div
                    className={`w-2.5 h-2.5 rounded-full border transition-all ${
                      activeBit.value === 1 && (isTransmitting || activeBit.type === "IDLE")
                        ? "bg-cyan-400 border-cyan-200 shadow-md shadow-cyan-400"
                        : "bg-slate-800 border-slate-700"
                    }`}
                    title="TX Status LED (GPIO2)"
                  />
                </div>

                {/* RF Shield / Silicon Package */}
                <div className="w-full bg-[#080d19] rounded p-1.5 border border-slate-700/80 mb-1.5 text-center shadow-inner">
                  <div className="text-[9px] font-mono text-slate-200 font-bold">ESP-WROOM-32</div>
                  <div className="text-[8px] font-mono text-slate-500">Dual-Core LX6 · 240MHz</div>
                </div>

                {/* Hardware Pinout Badges */}
                <div className="flex items-center justify-between text-[8px] font-mono text-slate-300 border-t border-slate-700/70 pt-1">
                  <span className="text-cyan-400 font-semibold">GPIO4 (TX)</span>
                  <span className="text-emerald-400 font-semibold">3.3V OUT</span>
                </div>
              </div>

              {/* Physical LED Optical Emitter Mount */}
              <div className="mt-2.5 flex flex-col items-center relative">
                <div className="relative">
                  {/* Glowing Dome LED */}
                  <div
                    className="w-8 h-8 rounded-full border-2 transition-all duration-75 flex items-center justify-center cursor-pointer shadow-lg"
                    style={{
                      backgroundColor:
                        activeBit.value === 1 && (isTransmitting || activeBit.type === "IDLE")
                          ? currentWavelengthCfg.colorHex
                          : "#1e293b",
                      borderColor: currentWavelengthCfg.colorHex,
                      boxShadow:
                        activeBit.value === 1 && (isTransmitting || activeBit.type === "IDLE")
                          ? `0 0 28px ${currentWavelengthCfg.colorHex}, 0 0 55px ${currentWavelengthCfg.colorHex}`
                          : "none",
                    }}
                    title={`Transmitter LED (${currentWavelengthCfg.label})`}
                  >
                    <div className="w-3 h-3 rounded-full bg-white/80" />
                  </div>
                </div>
                <span className="text-[9px] font-mono text-slate-200 mt-1 font-bold">
                  LED {currentWavelengthCfg.nm}nm
                </span>
                <span className="text-[8px] font-mono text-cyan-400 font-semibold">
                  {driveCurrentMa} mA · {halfPowerAngle}° Beam
                </span>
              </div>
            </div>

            {/* Center: Free-Space Optical Channel Beam */}
            <div className="flex-1 h-full mx-6 relative flex items-center justify-center">
              {/* Animated Light Cone SVG */}
              <svg
                className="w-full h-full overflow-visible"
                preserveAspectRatio="none"
                viewBox="0 0 400 120"
              >
                <defs>
                  <linearGradient id="vlcBeamGrad" x1="0%" y1="50%" x2="100%" y2="50%">
                    <stop
                      offset="0%"
                      stopColor={currentWavelengthCfg.colorHex}
                      stopOpacity={
                        activeBit.value === 1
                          ? Math.min(0.85, 0.35 + (driveCurrentMa / 50) * 0.5)
                          : 0.06
                      }
                    />
                    <stop
                      offset="100%"
                      stopColor={currentWavelengthCfg.colorHex}
                      stopOpacity={
                        activeBit.value === 1
                          ? Math.max(0.05, 0.65 / Math.pow(Math.max(0.5, distanceM), 1.35))
                          : 0.02
                      }
                    />
                  </linearGradient>
                </defs>

                {/* Optical Beam Projection Cone scaled by halfPowerAngle & distance */}
                <polygon
                  points={`0,55 0,65 400,${60 + Math.min(56, distanceM * 12 + halfPowerAngle * 0.45)} 400,${
                    60 - Math.min(56, distanceM * 12 + halfPowerAngle * 0.45)
                  }`}
                  fill="url(#vlcBeamGrad)"
                  className="transition-all duration-100"
                />

                {/* Central Optical Axis Line */}
                <line
                  x1="0"
                  y1="60"
                  x2="400"
                  y2="60"
                  stroke={currentWavelengthCfg.colorHex}
                  strokeWidth="1.5"
                  strokeDasharray="4 3"
                  strokeOpacity={activeBit.value === 1 ? 0.8 : 0.2}
                />

                {/* Ambient Light Shot-Noise Interference Sparkles scaled by ambientLightLux */}
                {ambientLightLux > 80 &&
                  Array.from({ length: Math.min(12, Math.floor(ambientLightLux / 500) + 2) }).map((_, nIdx) => {
                    const seedX = ((nIdx * 73 + Math.round(photonPhase * 120)) % 360) + 20;
                    const seedY = 18 + ((nIdx * 47 + Math.round(photonPhase * 40)) % 84);
                    const noiseOp = Math.min(0.8, ambientLightLux / 5000);
                    return (
                      <circle
                        key={`amb-${nIdx}`}
                        cx={seedX}
                        cy={seedY}
                        r={1.6}
                        fill="#fbbf24"
                        opacity={noiseOp}
                      />
                    );
                  })}

                {/* RAF-Driven Traveling Modulated Photon Pulses synced to actual bit stream */}
                {[0, 1, 2, 3, 4, 5, 6].map((slot) => {
                  const travelPct = isTransmitting
                    ? (slot / 7 + photonPhase) % 1
                    : (slot + 0.5) / 7;
                  const px = 12 + travelPct * 376;
                  // Look up corresponding bit in flight behind active cursor
                  const bitLookback = Math.max(0, currentBitIndex - (6 - slot));
                  const slotBit = simResult.transmittedBits[bitLookback]?.value ?? activeBit.value;
                  const atten = Math.max(0.22, 1 / Math.pow(Math.max(0.7, distanceM), 0.7));
                  const isHigh = slotBit === 1;
                  const spreadY = isHigh
                    ? 60 + Math.sin(travelPct * Math.PI * 4 + slot) * Math.min(14, halfPowerAngle * 0.15) * travelPct
                    : 60;
                  return (
                    <g key={`photon-${slot}`} transform={`translate(${px.toFixed(1)}, ${spreadY.toFixed(1)})`}>
                      {isHigh && isTransmitting && (
                        <circle
                          r={8 * atten}
                          fill={currentWavelengthCfg.colorHex}
                          opacity={0.22 * atten}
                        />
                      )}
                      <circle
                        r={isHigh ? 4.8 * atten + 1.5 : 2.1}
                        fill={isHigh ? currentWavelengthCfg.colorHex : "#334155"}
                        opacity={isHigh ? Math.max(0.35, 0.95 * atten) : 0.35}
                      />
                      {isHigh && (
                        <path
                          d="M -10 -4 Q -5 4 0 -4 Q 5 4 10 -4"
                          fill="none"
                          stroke={currentWavelengthCfg.colorHex}
                          strokeWidth="1.4"
                          opacity={Math.max(0.2, 0.78 * atten)}
                        />
                      )}
                    </g>
                  );
                })}
              </svg>

              {/* Floating Free-Space Channel Telemetry HUD */}
              <div className="absolute top-2.5 px-3.5 py-1.5 rounded-lg bg-[#080d19]/90 border border-slate-700/80 text-center text-xs font-mono shadow-xl">
                <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                  Free-Space Optical Propagation (LOS)
                </div>
                <div className="text-cyan-300 font-bold text-xs tabular-nums">
                  {distanceM.toFixed(2)} m · Loss: -
                  {(20 * Math.log10(Math.max(0.1, distanceM) * 10)).toFixed(1)} dB · SNR {simResult.statistics.snrDb} dB
                </div>
                <div className="text-[10px] text-amber-300 font-mono">
                  Ambient: {ambientLightLux} lux ({ambientLightLux > 1000 ? "High Shot Noise" : "Low Noise"})
                </div>
              </div>

              {/* In-Flight Bit Pulse Indicator */}
              <div
                className="absolute bottom-3 px-2.5 py-1 rounded text-[10px] font-mono font-bold tracking-wider transition-all duration-75 shadow-lg border"
                style={{
                  backgroundColor:
                    activeBit.value === 1 ? currentWavelengthCfg.colorHex : "#1e293b",
                  color: activeBit.value === 1 ? "#000000" : "#94a3b8",
                  borderColor:
                    activeBit.value === 1 ? currentWavelengthCfg.colorHex : "#475569",
                  boxShadow:
                    activeBit.value === 1
                      ? `0 0 16px ${currentWavelengthCfg.colorHex}`
                      : "none",
                }}
              >
                BIT #{currentBitIndex + 1}/{Math.max(1, simResult.transmittedBits.length)}: {activeBit.value} [{activeBit.type}]
              </div>
            </div>

            {/* Right Station: Optical Receiver Station (Photodiode + TIA + ESP32) */}
            <div className="z-10 flex flex-col items-center">
              {/* PIN Photodiode & Optical Concentrator Lens Mount */}
              <div className="mb-2.5 flex flex-col items-center">
                <div className="relative">
                  {/* Concentrator Lens Ring */}
                  <div
                    className="w-9 h-9 rounded-full border-2 flex items-center justify-center transition-all duration-100"
                    style={{
                      borderColor: activeRxBit === 1 ? "#34d399" : "#475569",
                      backgroundColor: activeRxBit === 1 ? "rgba(16,185,129,0.22)" : "rgba(15,23,42,0.8)",
                      boxShadow: activeRxBit === 1 ? "0 0 14px rgba(52,211,153,0.45)" : "none",
                    }}
                  >
                    {/* Silicon Photodiode Chip */}
                    <div className="w-4 h-4 bg-[#09101d] border border-amber-400/90 flex items-center justify-center shadow-inner">
                      <div className={`w-2.5 h-2.5 border ${activeRxBit === 1 ? "bg-emerald-400 border-emerald-200" : "bg-blue-900 border-cyan-400/70"}`} />
                    </div>
                  </div>
                </div>
                <span className="text-[9px] font-mono text-slate-200 mt-1 font-bold">
                  PIN Diode {photodiodeAreaMm2}mm²
                </span>
                <span className="text-[8px] font-mono text-amber-300 font-semibold tabular-nums">
                  {simResult.statistics.receivedPowerUw.toFixed(2)} µW ({lensGain}x Lens)
                </span>
              </div>

              {/* Detailed ESP32 Virtual Receiver Board */}
              <div className="w-40 bg-[#101b33] border-2 border-emerald-500/60 rounded-lg p-2.5 shadow-2xl relative">
                {/* PCB Screws */}
                <div className="absolute top-1 left-1 w-1.5 h-1.5 rounded-full bg-slate-400 border border-slate-600" />
                <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-slate-400 border border-slate-600" />
                <div className="absolute bottom-1 left-1 w-1.5 h-1.5 rounded-full bg-slate-400 border border-slate-600" />
                <div className="absolute bottom-1 right-1 w-1.5 h-1.5 rounded-full bg-slate-400 border border-slate-600" />

                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span className="text-[10px] font-mono font-bold text-emerald-300">ESP32-RX</span>
                  </div>
                  <div
                    className={`w-2.5 h-2.5 rounded-full border transition-all ${
                      activeRxBit === 1
                        ? "bg-emerald-400 border-emerald-200 shadow-md shadow-emerald-400"
                        : "bg-slate-800 border-slate-700"
                    }`}
                    title="RX Slicer Match Status"
                  />
                </div>

                {/* TIA Front-End Package */}
                <div className="w-full bg-[#080d19] rounded p-1.5 border border-slate-700/80 mb-1.5 text-center shadow-inner">
                  <div className="text-[9px] font-mono text-slate-200 font-bold">TIA + Slicer</div>
                  <div className="text-[8px] font-mono text-slate-400">
                    Rf = {(tiaResistorOhm / 1000).toFixed(0)}kΩ · Vth ={" "}
                    {simResult.statistics.effectiveThresholdVolts}V
                  </div>
                </div>

                {/* Receiver Logic State */}
                <div className="flex items-center justify-between text-[8px] font-mono text-slate-300 border-t border-slate-700/70 pt-1">
                  <span className="text-emerald-400 font-semibold">GPIO34 (ADC)</span>
                  <span
                    className={
                      isBitMatching
                        ? "text-emerald-400 font-bold"
                        : "text-rose-400 font-bold"
                    }
                  >
                    {isBitMatching ? "SYNC LOCKED" : "BIT ERROR"}
                  </span>
                </div>
              </div>
            </div>
          </div>
          )}

          {/* Live Binary Data Conveyor & Progressive Character Decode Bar */}
          <div className="mt-3 bg-[#050811] border border-slate-800 rounded-lg p-3 grid grid-cols-1 lg:grid-cols-12 gap-3 items-center font-mono text-xs">
            <div className="lg:col-span-7 flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0">
              <span className="text-[10px] font-bold uppercase text-cyan-400 shrink-0">
                TX → RX Bit Stream:
              </span>
              <div className="flex items-center gap-1">
                {simResult.transmittedBits
                  .slice(Math.max(0, currentBitIndex - 8), Math.max(16, currentBitIndex + 8))
                  .map((b) => {
                    const rxVal = simResult.receivedRawBits[b.bitIndex] ?? b.value;
                    const isCurr = b.bitIndex === currentBitIndex;
                    const ok = rxVal === b.value;
                    return (
                      <div
                        key={`stream-bit-${b.bitIndex}`}
                        className={`w-6 h-6 rounded flex flex-col items-center justify-center text-[10px] font-bold border transition-transform ${
                          isCurr
                            ? "scale-110 border-cyan-300 bg-cyan-500/30 text-white"
                            : ok
                            ? "border-slate-700 bg-slate-900 text-emerald-300"
                            : "border-rose-500/60 bg-rose-950/60 text-rose-300"
                        }`}
                        title={`Bit #${b.bitIndex}: TX=${b.value} RX=${rxVal} (${b.type})`}
                      >
                        <span>{b.value}</span>
                      </div>
                    );
                  })}
              </div>
            </div>

            <div className="lg:col-span-5 flex flex-wrap items-center justify-between gap-2 border-t lg:border-t-0 lg:border-l border-slate-800 pt-2 lg:pt-0 lg:pl-3">
              <div>
                <div className="text-[10px] text-slate-400 uppercase">Live Decoded Output</div>
                <div className="text-sm font-bold text-emerald-300 tracking-wider">
                  {(() => {
                    const decoded = simResult.decodedText || "";
                    if (!isTransmitting && currentBitIndex === 0) return decoded || "—";
                    const progressRatio =
                      (currentBitIndex + 1) / Math.max(1, simResult.transmittedBits.length);
                    const revealed = Math.max(1, Math.ceil(decoded.length * progressRatio));
                    return decoded.slice(0, revealed);
                  })()}
                  {isTransmitting && <span className="text-cyan-400">_</span>}
                </div>
              </div>
              <div className="text-right text-[10px] text-slate-400 tabular-nums">
                <div>V_th: <strong className="text-amber-300">{simResult.statistics.effectiveThresholdVolts} V</strong></div>
                <div>BER: <strong className={simResult.statistics.measuredBer === 0 ? "text-emerald-400" : "text-rose-400"}>{simResult.statistics.measuredBer.toExponential(1)}</strong></div>
              </div>
            </div>
          </div>

          {/* Interactive Distance & Ambient Light Controls Bar */}
          <div className="mt-4 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
            {/* Distance Slider */}
            <div className="flex items-center gap-3 flex-1 min-w-[280px]">
              <span className="text-slate-400 text-xs shrink-0 font-semibold">Link Distance:</span>
              <input
                type="range"
                min="0.1"
                max="5.0"
                step="0.1"
                value={distanceM}
                onChange={(e) => setDistanceM(parseFloat(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <span className="text-cyan-300 font-bold shrink-0 w-16 text-right">
                {distanceM.toFixed(2)} m
              </span>
            </div>

            {/* Ambient Light Slider */}
            <div className="flex items-center gap-3 flex-1 min-w-[260px]">
              <span className="text-slate-400 text-xs shrink-0 font-semibold">Ambient Light:</span>
              <input
                type="range"
                min="0"
                max="8000"
                step="50"
                value={ambientLightLux}
                onChange={(e) => setAmbientLightLux(parseInt(e.target.value, 10))}
                className="w-full accent-amber-400 cursor-pointer"
              />
              <span className="text-amber-300 font-bold shrink-0 w-20 text-right">
                {ambientLightLux} lux
              </span>
            </div>

            {/* Quick Lux Environment Presets */}
            <div className="flex items-center gap-1.5">
              {[
                { label: "Darkroom (0)", val: 0 },
                { label: "Lab Bench (150)", val: 150 },
                { label: "Office (800)", val: 800 },
                { label: "Direct Sun (4000)", val: 4000 },
              ].map((p) => (
                <button
                  key={p.val}
                  type="button"
                  onClick={() => setAmbientLightLux(p.val)}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono border transition cursor-pointer ${
                    ambientLightLux === p.val
                      ? "bg-amber-500/20 border-amber-400 text-amber-200 font-bold"
                      : "bg-slate-900 border-slate-700 text-slate-400 hover:text-white"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* =========================================================================
            CIRCUIT WIRING SCHEMATIC OVERLAY (TOGGLEABLE)
            ========================================================================= */}
        {showCircuitSchematic && (
          <div className="space-y-6">
            <OpticalSchematicViewer
              rfValueOhm={tiaResistorOhm}
              ledColorName={currentWavelengthCfg.label}
              typicalVf={currentWavelengthCfg.typicalVf}
              driveCurrentMa={driveCurrentMa}
            />

            <div className="bg-[#111B2B] border border-[#24344D] rounded-xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-[#24344D] pb-2">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#35BDF2] uppercase">
                  <Layers className="w-4 h-4" />
                  <span>Hardware Terminal Interconnections &amp; Pin Mappings</span>
                </div>
                <span className="text-xs font-mono text-[#9BAAC0]">
                  Transmitter (GPIO4 → BJT → LED) → Free-Space → Receiver (BPW34 → TIA → LM393 → GPIO34)
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs font-mono text-slate-300">
                {/* Transmitter Circuit Schematic Card */}
              <div className="bg-[#0B1220] border border-[#24344D] rounded-lg p-4 space-y-3">
                <div className="text-cyan-300 font-bold flex items-center gap-2 pb-1 border-b border-slate-800">
                  <span>TRANSMITTER TERMINALS &amp; DRIVER STAGE:</span>
                </div>
                <div className="space-y-1.5 text-[11px] leading-relaxed">
                  <div className="flex items-center justify-between p-1.5 rounded bg-slate-900/60 border border-slate-800">
                    <span className="text-slate-400">ESP32 GPIO4 (Output):</span>
                    <span className="text-cyan-300 font-bold">UART TX / LED Drive</span>
                  </div>
                  <div className="flex items-center justify-between p-1.5 rounded bg-slate-900/60 border border-slate-800">
                    <span className="text-slate-400">Switching Transistor:</span>
                    <span className="text-white">2N2222 NPN BJT / 2N7000 MOSFET Driver</span>
                  </div>
                  <div className="flex items-center justify-between p-1.5 rounded bg-slate-900/60 border border-slate-800">
                    <span className="text-slate-400">Base/Gate Resistor:</span>
                    <span className="text-white">1.0 kΩ current-limiting</span>
                  </div>
                  <div className="flex items-center justify-between p-1.5 rounded bg-slate-900/60 border border-slate-800">
                    <span className="text-slate-400">Collector Series Resistor:</span>
                    <span className="text-white">
                      R_lim = (3.3V - {currentWavelengthCfg.typicalVf}V) / {driveCurrentMa}mA ={" "}
                      {Math.max(
                        10,
                        Math.round(((3.3 - currentWavelengthCfg.typicalVf) / (driveCurrentMa * 1e-3)))
                      )}
                      Ω
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-1.5 rounded bg-slate-900/60 border border-slate-800">
                    <span className="text-slate-400">Optical Emitter:</span>
                    <span className="text-emerald-400 font-bold">
                      {currentWavelengthCfg.label} LED (Anode to +3.3V, Cathode to Collector)
                    </span>
                  </div>
                </div>
              </div>

              {/* Receiver Circuit Schematic Card */}
              <div className="bg-[#050811] border border-slate-800 rounded-lg p-4 space-y-3">
                <div className="text-emerald-300 font-bold flex items-center gap-2 pb-1 border-b border-slate-800">
                  <span>RECEIVER TERMINALS &amp; TIA STAGE:</span>
                </div>
                <div className="space-y-1.5 text-[11px] leading-relaxed">
                  <div className="flex items-center justify-between p-1.5 rounded bg-slate-900/60 border border-slate-800">
                    <span className="text-slate-400">Silicon Photodiode:</span>
                    <span className="text-emerald-300 font-bold">
                      BPW34 / BPV10 (Photoconductive Reverse Bias)
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-1.5 rounded bg-slate-900/60 border border-slate-800">
                    <span className="text-slate-400">Transimpedance Op-Amp:</span>
                    <span className="text-white">OPA380 / TL072 High-Speed JFET Input</span>
                  </div>
                  <div className="flex items-center justify-between p-1.5 rounded bg-slate-900/60 border border-slate-800">
                    <span className="text-slate-400">Feedback Network:</span>
                    <span className="text-white">
                      Rf = {(tiaResistorOhm / 1000).toFixed(0)} kΩ ∥ Cf = 2.2 pF (Phase Margin)
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-1.5 rounded bg-slate-900/60 border border-slate-800">
                    <span className="text-slate-400">Decision Slicer / Comparator:</span>
                    <span className="text-white">
                      LM393 High-Speed Voltage Slicer (Vth ={" "}
                      {simResult.statistics.effectiveThresholdVolts}V)
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-1.5 rounded bg-slate-900/60 border border-slate-800">
                    <span className="text-slate-400">ESP32 GPIO34 (Input):</span>
                    <span className="text-cyan-300 font-bold">Comparator Sliced Data Stream</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

        {/* =========================================================================
            SECTION 2: TWO WORKSTATIONS (TRANSMITTER vs RECEIVER)
            ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* WORKSTATION 1: TRANSMITTER CONSOLE (ESP32-TX) */}
          <div className="bg-[#111B2B] border border-[#24344D] rounded-xl p-5 shadow-lg flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-400 font-bold text-xs font-mono shadow-sm">
                    TX
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white tracking-wide">
                      WORKSTATION 1 — OPTICAL TRANSMITTER (ESP32-TX)
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Message Encoder · LED Modulation Driver · UART Asynchronous Framer
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                  GPIO4 / UART0
                </span>
              </div>

              {/* Message Input & Quick Test Presets */}
              <div className="space-y-3 mb-4">
                <div>
                  <div className="flex items-center justify-between mb-1 text-xs font-mono">
                    <label className="text-slate-300 font-semibold">ASCII Message Payload:</label>
                    <span className="text-slate-400">
                      {message.length} characters ({message.length * 8} payload bits)
                    </span>
                  </div>
                  <input
                    type="text"
                    value={message}
                    maxLength={48}
                    onChange={(e) => setMessage(e.target.value.toUpperCase())}
                    placeholder="Enter message to transmit (e.g. HELLO, IST VLC)..."
                    className="w-full bg-[#060a14] border border-cyan-500/30 rounded-lg px-3.5 py-2 text-white font-mono text-sm tracking-wider focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 shadow-inner"
                  />
                </div>

                {/* Quick Presets Buttons */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-mono text-slate-500">Quick Test:</span>
                  {[
                    "HELLO",
                    "OPTICAL VLC LAB",
                    "VLC TEST 2026",
                    "10101010",
                    "AAAAAAAAAAAAAAAA",
                  ].map((str) => (
                    <button
                      key={str}
                      type="button"
                      onClick={() => setMessage(str)}
                      className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:border-cyan-400/50 transition cursor-pointer"
                    >
                      "{str}"
                    </button>
                  ))}
                </div>
              </div>

              {/* Transmitter Hardware Parameter Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                {/* Modulation Scheme */}
                <div>
                  <label className="text-[10px] font-mono text-slate-400 block mb-1 font-semibold">
                    MODULATION SCHEME:
                  </label>
                  <select
                    value={modulation}
                    onChange={(e) => setModulation(e.target.value as VlcModulation)}
                    className="w-full bg-[#060a14] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-400 cursor-pointer"
                  >
                    <option value="OOK_NRZ">OOK-NRZ (Standard)</option>
                    <option value="MANCHESTER">Manchester (IEEE 802.3)</option>
                    <option value="PWM">PWM (Pulse Width)</option>
                  </select>
                </div>

                {/* Baud Rate */}
                <div>
                  <label className="text-[10px] font-mono text-slate-400 block mb-1 font-semibold">
                    BAUD RATE:
                  </label>
                  <select
                    value={baudRate}
                    onChange={(e) => setBaudRate(Number(e.target.value))}
                    className="w-full bg-[#060a14] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-400 cursor-pointer"
                  >
                    <option value={100}>100 bps</option>
                    <option value={300}>300 bps</option>
                    <option value={600}>600 bps</option>
                    <option value={1200}>1200 bps</option>
                    <option value={2400}>2400 bps</option>
                    <option value={4800}>4800 bps</option>
                    <option value={9600}>9600 bps</option>
                  </select>
                </div>

                {/* Parity */}
                <div>
                  <label className="text-[10px] font-mono text-slate-400 block mb-1 font-semibold">
                    UART PARITY:
                  </label>
                  <select
                    value={parity}
                    onChange={(e) => setParity(e.target.value as VlcParity)}
                    className="w-full bg-[#060a14] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-400 cursor-pointer"
                  >
                    <option value="NONE">None (8N1)</option>
                    <option value="EVEN">Even (8E1)</option>
                    <option value="ODD">Odd (8O1)</option>
                  </select>
                </div>

                {/* Optical Wavelength */}
                <div>
                  <label className="text-[10px] font-mono text-slate-400 block mb-1 font-semibold">
                    OPTICAL WAVELENGTH:
                  </label>
                  <select
                    value={wavelength}
                    onChange={(e) => setWavelength(e.target.value as VlcWavelength)}
                    className="w-full bg-[#060a14] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-400 cursor-pointer"
                  >
                    <option value="RED_650">Red (650 nm)</option>
                    <option value="GREEN_525">Green (525 nm)</option>
                    <option value="BLUE_470">Blue (470 nm)</option>
                    <option value="WHITE_PHOSPHOR">White (5500K Phosphor)</option>
                  </select>
                </div>

                {/* Drive Current */}
                <div>
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1 font-semibold">
                    <span>LED CURRENT (If):</span>
                    <span className="text-cyan-300 font-bold">{driveCurrentMa} mA</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="50"
                    step="1"
                    value={driveCurrentMa}
                    onChange={(e) => setDriveCurrentMa(Number(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                </div>

                {/* Half Power Angle */}
                <div>
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1 font-semibold">
                    <span>BEAM ANGLE (Φ₁/₂):</span>
                    <span className="text-cyan-300 font-bold">{halfPowerAngle}°</span>
                  </div>
                  <input
                    type="range"
                    min="15"
                    max="60"
                    step="5"
                    value={halfPowerAngle}
                    onChange={(e) => setHalfPowerAngle(Number(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                </div>
              </div>

              {/* Framed Binary Bit Stream Visualizer */}
              <div className="bg-[#060a14] border border-slate-800 rounded-lg p-2.5 mb-4 shadow-inner">
                <div className="flex items-center justify-between text-[11px] font-mono mb-1.5">
                  <span className="text-slate-400 font-semibold">Framed Binary Bit Stream:</span>
                  <span className="text-slate-400">
                    Bit {currentBitIndex + 1} / {simResult.transmittedBits.length}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-1">
                  {simResult.transmittedBits.map((b, idx) => {
                    const isCurrent = idx === currentBitIndex;
                    let badgeBg = "bg-slate-800 text-slate-400 border-slate-700";
                    if (b.type === "START") {
                      badgeBg = "bg-amber-950/70 text-amber-300 border-amber-600/50";
                    } else if (b.type === "STOP") {
                      badgeBg = "bg-purple-950/70 text-purple-300 border-purple-600/50";
                    } else if (b.type === "PARITY") {
                      badgeBg = "bg-blue-950/70 text-blue-300 border-blue-600/50";
                    } else if (b.value === 1) {
                      badgeBg = "bg-cyan-950/70 text-cyan-200 border-cyan-500/50";
                    }

                    return (
                      <span
                        key={idx}
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded border transition-all ${badgeBg} ${
                          isCurrent
                            ? "ring-2 ring-white scale-110 font-bold shadow-md"
                            : "opacity-80"
                        }`}
                        title={`${b.type} bit: ${b.value} (Char: '${b.char}')`}
                      >
                        {b.value}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Transmission Action Bar */}
            <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {!isTransmitting ? (
                  <button
                    type="button"
                    onClick={handleStartTransmission}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-cyan-500 text-slate-950 font-mono font-bold text-xs hover:bg-cyan-400 transition cursor-pointer shadow-md shadow-cyan-500/20"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Send Message</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handlePauseTransmission}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 text-slate-950 font-mono font-bold text-xs hover:bg-amber-400 transition cursor-pointer"
                  >
                    <Pause className="w-3.5 h-3.5 fill-current" />
                    <span>Pause</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleStepBit}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-slate-800 text-slate-200 font-mono text-xs hover:bg-slate-700 transition cursor-pointer border border-slate-700"
                  title="Step 1 bit forward"
                >
                  <StepForward className="w-3.5 h-3.5" />
                  <span>Step</span>
                </button>

                <button
                  type="button"
                  onClick={handleResetTransmission}
                  className="inline-flex items-center gap-1 p-2 rounded-lg bg-slate-800 text-slate-300 font-mono text-xs hover:bg-slate-700 transition cursor-pointer border border-slate-700"
                  title="Reset Transmission Index"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>

              <label className="flex items-center gap-2 text-xs font-mono text-slate-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={continuousLoop}
                  onChange={(e) => setContinuousLoop(e.target.checked)}
                  className="accent-cyan-400 rounded"
                />
                <span>Continuous Stream</span>
              </label>
            </div>
          </div>

          {/* WORKSTATION 2: RECEIVER CONSOLE (ESP32-RX) */}
          <div className="bg-[#111B2B] border border-[#24344D] rounded-xl p-5 shadow-lg flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 font-bold text-xs font-mono shadow-sm">
                    RX
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white tracking-wide">
                      WORKSTATION 2 — OPTICAL RECEIVER (ESP32-RX)
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      PIN Photodiode · Transimpedance Amp (TIA) · Slicer Comparator
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                  GPIO34 / ADC1_CH6
                </span>
              </div>

              {/* Decoded Message Output Screen */}
              <div className="space-y-3 mb-4">
                <div>
                  <div className="flex items-center justify-between mb-1 text-xs font-mono">
                    <label className="text-slate-300 font-semibold">Decoded ASCII Output:</label>
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-400 font-bold">
                        {simResult.statistics.packetsReceived} / {simResult.statistics.packetsSent} Packets OK
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyDecoded}
                        className="text-[10px] font-mono text-cyan-400 hover:text-cyan-300 transition flex items-center gap-1 cursor-pointer"
                      >
                        {copiedDecodedText ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedDecodedText ? "Copied" : "Copy"}</span>
                      </button>
                    </div>
                  </div>
                  <div className="w-full min-h-[46px] bg-[#060a14] border border-emerald-500/40 rounded-lg px-3.5 py-2.5 font-mono text-sm tracking-wider flex items-center justify-between shadow-inner">
                    <span className="text-emerald-300 font-bold">
                      {simResult.decodedText || "(No message decoded yet)"}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded font-mono font-bold ${
                        simResult.statistics.packetSuccessRatePct === 100
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                          : "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                      }`}
                    >
                      {simResult.statistics.packetSuccessRatePct}% PSR
                    </span>
                  </div>
                </div>

                {/* Hex Byte Dump Breakdown */}
                <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
                  <span className="text-slate-500">Hex Bytes:</span>
                  {simResult.decodedBytesHex.map((h, i) => (
                    <span
                      key={i}
                      className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300"
                    >
                      {h}
                    </span>
                  ))}
                </div>
              </div>

              {/* Receiver Hardware Parameters Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                {/* TIA Gain Rf */}
                <div className="col-span-2">
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1 font-semibold">
                    <span>TIA GAIN RESISTOR (Rf):</span>
                    <span className="text-emerald-300 font-bold">
                      {(tiaResistorOhm / 1000).toFixed(0)} kΩ
                    </span>
                  </div>
                  <input
                    type="range"
                    min="10000"
                    max="500000"
                    step="5000"
                    value={tiaResistorOhm}
                    onChange={(e) => setTiaResistorOhm(Number(e.target.value))}
                    className="w-full accent-emerald-400 cursor-pointer"
                  />
                </div>

                {/* Concentrator Lens Gain */}
                <div>
                  <label className="text-[10px] font-mono text-slate-400 block mb-1 font-semibold">
                    LENS GAIN:
                  </label>
                  <select
                    value={lensGain}
                    onChange={(e) => setLensGain(Number(e.target.value))}
                    className="w-full bg-[#060a14] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-emerald-300 focus:outline-none focus:border-emerald-400 cursor-pointer"
                  >
                    <option value={1.0}>1.0x (Bare Die)</option>
                    <option value={2.0}>2.0x (Standard)</option>
                    <option value={3.5}>3.5x (Hemisphere)</option>
                    <option value={5.0}>5.0x (CPC Concentrator)</option>
                  </select>
                </div>

                {/* AC-Coupled Ambient Filter Toggle */}
                <div>
                  <label className="text-[10px] font-mono text-slate-400 block mb-1 font-semibold">
                    AMBIENT FILTER:
                  </label>
                  <button
                    type="button"
                    onClick={() => setAcCoupled((v) => !v)}
                    className={`w-full py-1.5 px-2 rounded-lg text-xs font-mono font-bold border transition cursor-pointer ${
                      acCoupled
                        ? "bg-emerald-500/20 border-emerald-400 text-emerald-200"
                        : "bg-slate-900 border-slate-700 text-slate-400 hover:text-white"
                    }`}
                  >
                    {acCoupled ? "AC Coupled (DC Cut)" : "DC Direct"}
                  </button>
                </div>

                {/* Slicer Threshold Control Mode */}
                <div>
                  <label className="text-[10px] font-mono text-slate-400 block mb-1 font-semibold">
                    SLICER THRESHOLD:
                  </label>
                  <button
                    type="button"
                    onClick={() => setAutoThreshold((v) => !v)}
                    className={`w-full py-1.5 px-2 rounded-lg text-xs font-mono font-bold border transition cursor-pointer ${
                      autoThreshold
                        ? "bg-cyan-500/20 border-cyan-400 text-cyan-200"
                        : "bg-slate-900 border-slate-700 text-slate-400 hover:text-white"
                    }`}
                  >
                    {autoThreshold ? "Auto-Adaptive" : "Manual Sliders"}
                  </button>
                </div>

                {/* Manual Threshold Slider */}
                <div>
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1 font-semibold">
                    <span>Vth THRESHOLD:</span>
                    <span className="text-amber-300 font-bold">
                      {simResult.statistics.effectiveThresholdVolts.toFixed(2)} V
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="2.8"
                    step="0.05"
                    disabled={autoThreshold}
                    value={manualThresholdV}
                    onChange={(e) => setManualThresholdV(Number(e.target.value))}
                    className={`w-full accent-amber-400 cursor-pointer ${
                      autoThreshold ? "opacity-30 cursor-not-allowed" : ""
                    }`}
                  />
                </div>
              </div>

              {/* LIVE EYE DIAGRAM WIDGET (RECEIVER WORKSTATION EMBEDDED) */}
              <div className="bg-[#050811] border border-cyan-500/30 rounded-lg p-3 mb-4 shadow-inner">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Eye className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="text-[11px] font-mono font-bold text-cyan-300 uppercase tracking-wide">
                      Live Receiver Eye Diagram Widget
                    </span>
                    <span
                      className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                        simResult.eyeMetrics.eyeOpeningStatus === "WIDE_OPEN"
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                          : simResult.eyeMetrics.eyeOpeningStatus === "ACCEPTABLE"
                          ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                          : "bg-rose-500/20 text-rose-300 border-rose-500/40"
                      }`}
                    >
                      {simResult.eyeMetrics.eyeOpeningStatus}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-[10px] font-mono text-slate-400">
                    <span>
                      Eye Height: <strong className="text-emerald-400">{simResult.eyeMetrics.eyeHeightVolts}V</strong>
                    </span>
                    <span>·</span>
                    <span>
                      Jitter Width: <strong className="text-cyan-300">{simResult.eyeMetrics.eyeWidthPct}%</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => setRxEyeWidgetExpanded((v) => !v)}
                      className="text-slate-400 hover:text-white cursor-pointer ml-1 text-xs"
                      title={rxEyeWidgetExpanded ? "Minimize Widget" : "Expand Widget"}
                    >
                      {rxEyeWidgetExpanded ? "▲" : "▼"}
                    </button>
                  </div>
                </div>

                {rxEyeWidgetExpanded && (
                  <div>
                    {/* Compact Overlaid Eye Canvas */}
                    <div className="w-full h-36 bg-[#02040a] rounded border border-cyan-500/20 relative overflow-hidden flex flex-col justify-between shadow-inner">
                      {/* Reticle grid */}
                      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20">
                        <defs>
                          <pattern id="rxEyeWidgetGrid" width="30" height="20" patternUnits="userSpaceOnUse">
                            <path d="M 30 0 L 0 0 0 20" fill="none" stroke="#06b6d4" strokeWidth="0.75" />
                          </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill="url(#rxEyeWidgetGrid)" />
                        <line x1="25%" y1="0" x2="25%" y2="100%" stroke="#06b6d4" strokeWidth="1" strokeDasharray="2 2" />
                        <line x1="75%" y1="0" x2="75%" y2="100%" stroke="#06b6d4" strokeWidth="1" strokeDasharray="2 2" />
                        <line x1="50%" y1="0" x2="50%" y2="100%" stroke="#06b6d4" strokeWidth="1.5" strokeDasharray="4 2" />
                      </svg>

                      {/* Overlaid Trajectories */}
                      <svg className="w-full h-full relative z-10" viewBox="0 0 1000 140" preserveAspectRatio="none">
                        {/* Threshold line */}
                        <line
                          x1="0"
                          y1={125 - (simResult.statistics.effectiveThresholdVolts / 3.3) * 110}
                          x2="1000"
                          y2={125 - (simResult.statistics.effectiveThresholdVolts / 3.3) * 110}
                          stroke="#f59e0b"
                          strokeWidth="1.5"
                          strokeDasharray="4 2"
                          strokeOpacity="0.7"
                        />

                        {/* Multi-trace overlaid trajectories */}
                        {simResult.eyeTraces.map((trace) => (
                          <polyline
                            key={trace.traceId}
                            fill="none"
                            stroke="#06b6d4"
                            strokeWidth="1.5"
                            strokeOpacity="0.6"
                            points={trace.points
                              .map((pt) => {
                                const x = (pt.xNorm / 2.0) * 1000;
                                const y = 125 - (pt.volts / 3.3) * 110;
                                return `${x.toFixed(1)},${y.toFixed(1)}`;
                              })
                              .join(" ")}
                          />
                        ))}

                        {/* Sampling instant markers */}
                        <line x1="250" y1="5" x2="250" y2="135" stroke="#ffffff" strokeWidth="1.2" strokeDasharray="2 2" strokeOpacity="0.8" />
                        <line x1="750" y1="5" x2="750" y2="135" stroke="#ffffff" strokeWidth="1.2" strokeDasharray="2 2" strokeOpacity="0.8" />
                      </svg>

                      <div className="absolute top-1 left-2 text-[9px] font-mono text-cyan-300 font-bold z-20">
                        EYE OVERLAY (2 $T_b$) · {simResult.eyeTraces.length} TRACES
                      </div>
                      <div className="absolute bottom-1 right-2 text-[9px] font-mono text-amber-300 z-20">
                        Vth = {simResult.statistics.effectiveThresholdVolts}V · Noise Margin = {simResult.eyeMetrics.noiseMarginMv} mV
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Bit Error Verification Matrix */}
              <div className="bg-[#060a14] border border-slate-800 rounded-lg p-2.5 mb-4 shadow-inner">
                <div className="flex items-center justify-between text-[11px] font-mono mb-1.5">
                  <span className="text-slate-400 font-semibold">
                    Received Sliced Bits (Verification):
                  </span>
                  <span
                    className={
                      simResult.statistics.totalBitErrors === 0
                        ? "text-emerald-400 font-bold"
                        : "text-rose-400 font-bold"
                    }
                  >
                    {simResult.statistics.totalBitErrors} Bit Errors (BER:{" "}
                    {simResult.statistics.measuredBer.toExponential(2)})
                  </span>
                </div>
                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-1">
                  {simResult.receivedRawBits.map((b, idx) => {
                    const isMatch = simResult.bitMatchStatus[idx];
                    const isCurrent = idx === currentBitIndex;
                    return (
                      <span
                        key={idx}
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded border transition-all ${
                          isMatch
                            ? "bg-emerald-950/60 text-emerald-300 border-emerald-600/40"
                            : "bg-rose-950 text-rose-300 border-rose-500 font-bold"
                        } ${isCurrent ? "ring-2 ring-white scale-110 shadow-md" : "opacity-80"}`}
                        title={`Bit #${idx}: Got ${b}, Expected ${
                          simResult.transmittedBits[idx]?.value
                        } (${isMatch ? "MATCH" : "ERROR"})`}
                      >
                        {b}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Receiver Diagnostic Bar */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-3">
                <span className="text-slate-400">
                  Framing:{" "}
                  <strong
                    className={
                      simResult.statistics.framingErrors === 0
                        ? "text-emerald-400"
                        : "text-rose-400"
                    }
                  >
                    {simResult.statistics.framingErrors === 0
                      ? "LOCK"
                      : `${simResult.statistics.framingErrors} ERR`}
                  </strong>
                </span>
                <span className="text-slate-400">
                  Parity:{" "}
                  <strong
                    className={
                      simResult.statistics.parityErrors === 0
                        ? "text-emerald-400"
                        : "text-rose-400"
                    }
                  >
                    {simResult.statistics.parityErrors === 0
                      ? "CLEAN"
                      : `${simResult.statistics.parityErrors} ERR`}
                  </strong>
                </span>
              </div>
              <div className="text-right">
                <span className="text-slate-400">
                  Effective Throughput:{" "}
                  <strong className="text-cyan-300">
                    {simResult.statistics.throughputBps} bps
                  </strong>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================================
            SECTION 3: VISUAL INSTRUMENTATION DECK (OSCILLOSCOPE & TELEMETRY)
            ========================================================================= */}
        <div className="bg-[#111B2B] border border-[#24344D] rounded-xl p-5 shadow-lg space-y-4">
          {/* Instrument Sub-Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white tracking-wide">
                PRECISION OPTICAL &amp; ELECTRICAL INSTRUMENTATION DECK
              </h3>
            </div>

            <div className="flex flex-wrap items-center gap-1 bg-[#060a14] border border-slate-800 rounded-lg p-1 text-xs font-mono">
              <button
                type="button"
                onClick={() => setActiveTab("OSCILLOSCOPE")}
                className={`px-3 py-1 rounded transition cursor-pointer ${
                  activeTab === "OSCILLOSCOPE"
                    ? "bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Dual-Trace Oscilloscope
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("EYE_DIAGRAM")}
                className={`px-3 py-1 rounded transition cursor-pointer ${
                  activeTab === "EYE_DIAGRAM"
                    ? "bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Eye Diagram Analyzer
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("LINK_TELEMETRY")}
                className={`px-3 py-1 rounded transition cursor-pointer ${
                  activeTab === "LINK_TELEMETRY"
                    ? "bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Optical Power &amp; SNR Gauge
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("ESP32_FIRMWARE")}
                className={`px-3 py-1 rounded transition cursor-pointer ${
                  activeTab === "ESP32_FIRMWARE"
                    ? "bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                ESP32 C++ Firmware
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("THEORY")}
                className={`px-3 py-1 rounded transition cursor-pointer ${
                  activeTab === "THEORY"
                    ? "bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Physical Model &amp; Theory
              </button>
            </div>
          </div>

          {/* TAB 1: DUAL-TRACE OSCILLOSCOPE */}
          {activeTab === "OSCILLOSCOPE" && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono bg-[#060a14] p-3 rounded-lg border border-slate-800">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-yellow-400" />
                    <span className="text-yellow-300 font-bold">CH1: TX LED Drive (0-3.3V)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-cyan-400" />
                    <span className="text-cyan-300 font-bold">
                      CH2: RX TIA Output (Analog + Noise)
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-0.5 bg-amber-400" />
                    <span className="text-amber-300">
                      Vth Threshold ({simResult.statistics.effectiveThresholdVolts}V)
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-slate-400">
                  <span>
                    Bit Interval:{" "}
                    <strong className="text-white">{(1000 / baudRate).toFixed(2)} ms</strong>
                  </span>
                  <span>·</span>
                  <span>
                    Noise RMS:{" "}
                    <strong className="text-white">{simResult.statistics.noiseRmsMv} mV</strong>
                  </span>
                  <span>·</span>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-500">Zoom:</span>
                    {[0.5, 1.0, 2.0].map((z) => (
                      <button
                        key={z}
                        type="button"
                        onClick={() => setDsoTimebase(z)}
                        className={`px-1.5 py-0.5 rounded text-[10px] border cursor-pointer ${
                          dsoTimebase === z
                            ? "bg-cyan-500/20 text-cyan-300 border-cyan-400 font-bold"
                            : "bg-slate-900 border-slate-700 text-slate-400"
                        }`}
                      >
                        {z}x
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Oscilloscope Grid Canvas */}
              <div className="w-full h-72 bg-[#03060d] border border-cyan-500/30 rounded-lg p-2 relative overflow-hidden flex flex-col justify-between shadow-2xl">
                {/* Background Reticle Grid */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20">
                  <defs>
                    <pattern
                      id="dsoGridPattern"
                      width="40"
                      height="40"
                      patternUnits="userSpaceOnUse"
                    >
                      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#06b6d4" strokeWidth="0.75" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#dsoGridPattern)" />
                  <line
                    x1="0"
                    y1="50%"
                    x2="100%"
                    y2="50%"
                    stroke="#06b6d4"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                  />
                  <line
                    x1="50%"
                    y1="0"
                    x2="50%"
                    y2="100%"
                    stroke="#06b6d4"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                  />
                </svg>

                {/* Waveform Traces SVG */}
                <svg
                  className="w-full h-full relative z-10"
                  viewBox="0 0 1000 240"
                  preserveAspectRatio="none"
                >
                  {/* CH1 (Yellow) - TX Digital Drive */}
                  {simResult.waveforms.length > 1 && (
                    <polyline
                      fill="none"
                      stroke="#facc15"
                      strokeWidth="2.2"
                      points={simResult.waveforms
                        .slice(
                          0,
                          Math.max(20, Math.floor(simResult.waveforms.length / dsoTimebase))
                        )
                        .map((pt, i, arr) => {
                          const x = (i / (arr.length - 1)) * 1000;
                          const y = 95 - (pt.txDigital / 3.3) * 65;
                          return `${x.toFixed(1)},${y.toFixed(1)}`;
                        })
                        .join(" ")}
                    />
                  )}

                  {/* Vth Threshold Line (Amber Dashed) */}
                  <line
                    x1="0"
                    y1={215 - (simResult.statistics.effectiveThresholdVolts / 3.3) * 90}
                    x2="1000"
                    y2={215 - (simResult.statistics.effectiveThresholdVolts / 3.3) * 90}
                    stroke="#f59e0b"
                    strokeWidth="1.5"
                    strokeDasharray="6 4"
                    strokeOpacity="0.85"
                  />

                  {/* CH2 (Cyan) - RX TIA Analog Waveform with Physical Noise */}
                  {simResult.waveforms.length > 1 && (
                    <polyline
                      fill="none"
                      stroke="#06b6d4"
                      strokeWidth="2.2"
                      points={simResult.waveforms
                        .slice(
                          0,
                          Math.max(20, Math.floor(simResult.waveforms.length / dsoTimebase))
                        )
                        .map((pt, i, arr) => {
                          const x = (i / (arr.length - 1)) * 1000;
                          const y = 215 - (pt.rxTiaVolts / 3.3) * 90;
                          return `${x.toFixed(1)},${y.toFixed(1)}`;
                        })
                        .join(" ")}
                    />
                  )}

                  {/* Sampling Strobe Line at Current Bit Index */}
                  {simResult.waveforms.length > 0 && (
                    <line
                      x1={Math.min(
                        1000,
                        Math.max(
                          0,
                          ((currentBitIndex * 8 + 4) /
                            Math.max(
                              1,
                              Math.floor(simResult.waveforms.length / dsoTimebase)
                            )) *
                            1000
                        )
                      )}
                      y1="0"
                      x2={Math.min(
                        1000,
                        Math.max(
                          0,
                          ((currentBitIndex * 8 + 4) /
                            Math.max(
                              1,
                              Math.floor(simResult.waveforms.length / dsoTimebase)
                            )) *
                            1000
                        )
                      )}
                      y2="240"
                      stroke="#ffffff"
                      strokeWidth="1.5"
                      strokeDasharray="2 2"
                    />
                  )}
                </svg>

                {/* Oscilloscope Corner Telemetry Tags */}
                <div className="absolute top-2 left-3 text-[10px] font-mono text-yellow-300 font-bold z-20">
                  CH1 1.00V/div [TX DIGITAL DRIVE]
                </div>
                <div className="absolute bottom-2 left-3 text-[10px] font-mono text-cyan-300 font-bold z-20">
                  CH2 0.50V/div [RX TIA VOLTS + NOISE]
                </div>
                <div className="absolute top-2 right-3 text-[10px] font-mono text-slate-400 z-20">
                  TRIG: AUTO · EDGE ↑ · {baudRate} BAUD
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: EYE DIAGRAM ANALYZER */}
          {activeTab === "EYE_DIAGRAM" && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono bg-[#060a14] p-3 rounded-lg border border-slate-800">
                <div className="flex items-center gap-4">
                  <span className="text-cyan-300 font-bold">
                    Folded 2-Bit Overlay ($2 T_b$ Interval)
                  </span>
                  <span>·</span>
                  <span>
                    Eye Height:{" "}
                    <strong className="text-emerald-400">
                      {simResult.eyeMetrics.eyeHeightVolts} V
                    </strong>
                  </span>
                  <span>·</span>
                  <span>
                    Noise Margin:{" "}
                    <strong className="text-amber-300">
                      {simResult.eyeMetrics.noiseMarginMv} mV
                    </strong>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-slate-400">Eye Opening:</span>
                  <span
                    className={`px-2 py-0.5 rounded font-bold text-xs ${
                      simResult.eyeMetrics.eyeOpeningStatus === "WIDE_OPEN"
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                        : simResult.eyeMetrics.eyeOpeningStatus === "ACCEPTABLE"
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                        : "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                    }`}
                  >
                    {simResult.eyeMetrics.eyeOpeningStatus} ({simResult.eyeMetrics.eyeWidthPct}% WIDTH)
                  </span>
                </div>
              </div>

              {/* Eye Diagram Trace Reticle */}
              <div className="w-full h-72 bg-[#02050c] border border-cyan-500/30 rounded-lg p-2 relative overflow-hidden flex flex-col justify-between shadow-2xl">
                {/* Background Reticle Grid */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20">
                  <defs>
                    <pattern
                      id="eyeGridPattern"
                      width="50"
                      height="30"
                      patternUnits="userSpaceOnUse"
                    >
                      <path d="M 50 0 L 0 0 0 30" fill="none" stroke="#06b6d4" strokeWidth="0.75" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#eyeGridPattern)" />
                  <line
                    x1="25%"
                    y1="0"
                    x2="25%"
                    y2="100%"
                    stroke="#06b6d4"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                  />
                  <line
                    x1="75%"
                    y1="0"
                    x2="75%"
                    y2="100%"
                    stroke="#06b6d4"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                  />
                  <line
                    x1="50%"
                    y1="0"
                    x2="50%"
                    y2="100%"
                    stroke="#06b6d4"
                    strokeWidth="1.5"
                    strokeDasharray="4 2"
                  />
                </svg>

                {/* Overlaid Eye Traces */}
                <svg
                  className="w-full h-full relative z-10"
                  viewBox="0 0 1000 240"
                  preserveAspectRatio="none"
                >
                  {/* Decision Threshold Line */}
                  <line
                    x1="0"
                    y1={215 - (simResult.statistics.effectiveThresholdVolts / 3.3) * 190}
                    x2="1000"
                    y2={215 - (simResult.statistics.effectiveThresholdVolts / 3.3) * 190}
                    stroke="#f59e0b"
                    strokeWidth="1.5"
                    strokeDasharray="5 3"
                    strokeOpacity="0.7"
                  />

                  {/* Overlaid Trajectories */}
                  {simResult.eyeTraces.map((trace) => (
                    <polyline
                      key={trace.traceId}
                      fill="none"
                      stroke="#06b6d4"
                      strokeWidth="1.8"
                      strokeOpacity="0.55"
                      points={trace.points
                        .map((pt) => {
                          const x = (pt.xNorm / 2.0) * 1000;
                          const y = 215 - (pt.volts / 3.3) * 190;
                          return `${x.toFixed(1)},${y.toFixed(1)}`;
                        })
                        .join(" ")}
                    />
                  ))}

                  {/* Optimal Sampling Strobes at 0.5 Tb and 1.5 Tb */}
                  <line
                    x1="250"
                    y1="20"
                    x2="250"
                    y2="220"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                    strokeDasharray="2 2"
                  />
                  <line
                    x1="750"
                    y1="20"
                    x2="750"
                    y2="220"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                    strokeDasharray="2 2"
                  />
                </svg>

                <div className="absolute top-2 left-3 text-[10px] font-mono text-cyan-300 font-bold z-20">
                  EYE DIAGRAM (0 to 2 $T_b$) · {simResult.eyeTraces.length} Bit Windows Overlaid
                </div>
                <div className="absolute bottom-2 right-3 text-[10px] font-mono text-slate-400 z-20">
                  Optimum Sampling Instant: $t = 0.5 T_b$ (Noise Margin ={" "}
                  {simResult.eyeMetrics.noiseMarginMv} mV)
                </div>
              </div>

              <div className="text-xs font-mono text-slate-400 bg-[#060a14] p-3 rounded-lg border border-slate-800 leading-relaxed">
                <strong className="text-white">Engineering Interpretation:</strong> The Eye Diagram
                is the primary optical communication test for link quality. The vertical opening
                corresponds to the noise margin against bit errors; the horizontal opening indicates
                immunity to timing jitter and inter-symbol interference (ISI).
              </div>
            </div>
          )}

          {/* TAB 3: OPTICAL POWER, SNR & LINK TELEMETRY */}
          {activeTab === "LINK_TELEMETRY" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Card 1: Optical Received Power */}
                <div className="bg-[#060a14] border border-slate-800 rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                    <span>RECEIVED OPTICAL POWER:</span>
                    <Gauge className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div className="text-2xl font-mono font-bold text-cyan-300">
                    {simResult.statistics.receivedPowerUw.toFixed(3)}{" "}
                    <span className="text-xs font-normal text-slate-400">µW</span>
                  </div>
                  <div className="text-xs font-mono text-slate-400">
                    Power: <strong className="text-white">{simResult.statistics.receivedPowerDbm} dBm</strong>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden mt-2">
                    <div
                      className="bg-cyan-400 h-full transition-all duration-300"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.max(5, (simResult.statistics.receivedPowerUw / 50) * 100)
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Card 2: SNR */}
                <div className="bg-[#060a14] border border-slate-800 rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                    <span>SIGNAL-TO-NOISE RATIO (SNR):</span>
                    <Activity className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div
                    className={`text-2xl font-mono font-bold ${
                      simResult.statistics.snrDb >= 15
                        ? "text-emerald-400"
                        : simResult.statistics.snrDb >= 8
                        ? "text-amber-400"
                        : "text-rose-400"
                    }`}
                  >
                    {simResult.statistics.snrDb}{" "}
                    <span className="text-xs font-normal text-slate-400">dB</span>
                  </div>
                  <div className="text-xs font-mono text-slate-400">
                    Link Rating:{" "}
                    <strong
                      className={
                        simResult.statistics.snrDb >= 15
                          ? "text-emerald-400"
                          : simResult.statistics.snrDb >= 8
                          ? "text-amber-400"
                          : "text-rose-400"
                      }
                    >
                      {simResult.statistics.snrDb >= 15
                        ? "EXCELLENT (CLEAN)"
                        : simResult.statistics.snrDb >= 8
                        ? "MARGINAL"
                        : "CRITICAL (LOSS)"}
                    </strong>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden mt-2">
                    <div
                      className={`h-full transition-all duration-300 ${
                        simResult.statistics.snrDb >= 15
                          ? "bg-emerald-400"
                          : simResult.statistics.snrDb >= 8
                          ? "bg-amber-400"
                          : "bg-rose-500"
                      }`}
                      style={{
                        width: `${Math.min(
                          100,
                          Math.max(5, (simResult.statistics.snrDb / 30) * 100)
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Card 3: Measured vs Theoretical BER */}
                <div className="bg-[#060a14] border border-slate-800 rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                    <span>BIT ERROR RATE (BER):</span>
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="text-2xl font-mono font-bold text-amber-300">
                    {simResult.statistics.measuredBer.toExponential(2)}
                  </div>
                  <div className="text-xs font-mono text-slate-400">
                    Theoretical Q(SNR):{" "}
                    <strong className="text-white">
                      {simResult.statistics.theoreticalBer.toExponential(2)}
                    </strong>
                  </div>
                  <div className="text-[11px] font-mono text-slate-500">
                    {simResult.statistics.totalBitErrors} errors / {simResult.statistics.totalBitsTransmitted} bits
                  </div>
                </div>
              </div>

              {/* Complete Packet Statistics Table */}
              <div className="bg-[#060a14] border border-slate-800 rounded-lg p-4">
                <div className="text-xs font-mono text-cyan-300 font-bold mb-3">
                  COMPLETE OPTICAL TRANSCEIVER PACKET STATISTICS
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
                  <div className="p-2.5 rounded bg-slate-900/60 border border-slate-800">
                    <div className="text-slate-400 text-[10px]">PACKETS TRANSMITTED</div>
                    <div className="text-white font-bold text-base mt-1">
                      {simResult.statistics.packetsSent}
                    </div>
                  </div>
                  <div className="p-2.5 rounded bg-slate-900/60 border border-slate-800">
                    <div className="text-slate-400 text-[10px]">PACKETS RECEIVED OK</div>
                    <div className="text-emerald-400 font-bold text-base mt-1">
                      {simResult.statistics.packetsReceived}
                    </div>
                  </div>
                  <div className="p-2.5 rounded bg-slate-900/60 border border-slate-800">
                    <div className="text-slate-400 text-[10px]">PACKET SUCCESS RATE</div>
                    <div className="text-cyan-300 font-bold text-base mt-1">
                      {simResult.statistics.packetSuccessRatePct}%
                    </div>
                  </div>
                  <div className="p-2.5 rounded bg-slate-900/60 border border-slate-800">
                    <div className="text-slate-400 text-[10px]">CHANNEL DC GAIN H(0)</div>
                    <div className="text-amber-300 font-bold text-base mt-1">
                      {simResult.statistics.channelDcGainH0.toExponential(3)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: ESP32 HARDWARE C++ FIRMWARE CODE */}
          {activeTab === "ESP32_FIRMWARE" && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono bg-[#060a14] p-3 rounded-lg border border-slate-800">
                <div className="flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-cyan-400" />
                  <span className="text-white font-bold">
                    Actual ESP32-WROOM Embedded C++ Firmware Implementation
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveFirmwareTab("TX")}
                    className={`px-3 py-1 rounded text-xs font-mono transition cursor-pointer ${
                      activeFirmwareTab === "TX"
                        ? "bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-400"
                        : "bg-slate-900 border border-slate-700 text-slate-400"
                    }`}
                  >
                    ESP32-TX (Transmitter.ino)
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveFirmwareTab("RX")}
                    className={`px-3 py-1 rounded text-xs font-mono transition cursor-pointer ${
                      activeFirmwareTab === "RX"
                        ? "bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-400"
                        : "bg-slate-900 border border-slate-700 text-slate-400"
                    }`}
                  >
                    ESP32-RX (Receiver.ino)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleCopyFirmware(
                        activeFirmwareTab === "TX"
                          ? ESP32_TX_FIRMWARE_CPP
                          : ESP32_RX_FIRMWARE_CPP
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded text-xs font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-400 hover:bg-cyan-500/30 transition cursor-pointer"
                  >
                    {copiedFirmware ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedFirmware ? "Code Copied!" : "Copy Arduino C++"}</span>
                  </button>
                </div>
              </div>

              {/* Code Box */}
              <div className="bg-[#03060e] border border-slate-800 rounded-lg p-4 font-mono text-xs max-h-96 overflow-y-auto text-slate-300 shadow-inner">
                <pre className="leading-relaxed">
                  {activeFirmwareTab === "TX"
                    ? ESP32_TX_FIRMWARE_CPP
                    : ESP32_RX_FIRMWARE_CPP}
                </pre>
              </div>

              <div className="text-xs font-mono text-slate-400 bg-[#060a14] p-3 rounded-lg border border-slate-800 leading-relaxed">
                <strong className="text-white">Silicon vs Mathematical Simulation:</strong> While
                the interactive simulator on this workbench calculates optical channel physics,
                Lambertian propagation, shot noise, and TIA dynamics in pure JavaScript/TypeScript,
                the code above is 100% genuine Arduino C++ code that can be flashed directly onto a
                physical ESP32 dual-core microcontroller using the Arduino IDE or PlatformIO.
              </div>
            </div>
          )}

          {/* TAB 5: THEORY & MATHEMATICAL MODEL */}
          {activeTab === "THEORY" && (
            <div className="bg-[#060a14] border border-slate-800 rounded-lg p-5 font-mono text-xs space-y-4 text-slate-300 shadow-xl">
              <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
                <BookOpen className="w-4 h-4" />
                <span>
                  Visible Light Communication (VLC) Mathematical Assumptions &amp; Equations
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 leading-relaxed">
                <div>
                  <h4 className="text-white font-bold mb-1 text-xs">
                    1. Generalized Lambertian Radiant Emission:
                  </h4>
                  <p className="text-slate-400 text-[11px] mb-2">
                    The transmitter LED radiates with a generalized Lambertian spatial profile
                    characterized by order:
                  </p>
                  <div className="bg-slate-900/90 p-2.5 rounded border border-slate-700 text-cyan-300 text-[11px] mb-2">
                    m = -ln(2) / ln(cos(Φ₁/₂))
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    Where Φ₁/₂ is the semi-angle at half power (currently {halfPowerAngle}°).
                  </p>
                </div>

                <div>
                  <h4 className="text-white font-bold mb-1 text-xs">
                    2. Line-of-Sight (LOS) DC Gain H(0):
                  </h4>
                  <p className="text-slate-400 text-[11px] mb-2">
                    The optical path loss follows geometric free-space propagation:
                  </p>
                  <div className="bg-slate-900/90 p-2.5 rounded border border-slate-700 text-cyan-300 text-[11px] mb-2">
                    H(0) = [(m+1) · A_pd / (2π d²)] · cosᵐ(φ) · cos(ψ) · T_s · g(ψ)
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    d = link distance ({distanceM.toFixed(2)}m), A_pd = photodiode area (7.5 mm²),
                    g(ψ) = lens gain ({lensGain}x).
                  </p>
                </div>

                <div>
                  <h4 className="text-white font-bold mb-1 text-xs">
                    3. Photodiode &amp; Ambient Noise Physics:
                  </h4>
                  <p className="text-slate-400 text-[11px] mb-2">
                    Signal current I_sig = R_λ · P_rx. Ambient optical power induces DC photocurrent
                    and shot noise:
                  </p>
                  <div className="bg-slate-900/90 p-2.5 rounded border border-slate-700 text-amber-300 text-[11px] mb-2">
                    σ_shot² = 2 · q · (I_sig + I_amb + I_dark) · B
                    <br />
                    σ_thermal² = (4 · k_B · T / R_f) · B
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    Where q = 1.602×10⁻¹⁹ C, k_B = 1.38×10⁻²³ J/K, T = 298.15 K, R_f ={" "}
                    {(tiaResistorOhm / 1000).toFixed(0)} kΩ.
                  </p>
                </div>

                <div>
                  <h4 className="text-white font-bold mb-1 text-xs">
                    4. Transimpedance Amplification &amp; Decision Slicing:
                  </h4>
                  <p className="text-slate-400 text-[11px] mb-2">
                    Transimpedance amplifier converts photocurrent into voltage V_tia = (I_sig +
                    noise) · R_f.
                  </p>
                  <div className="bg-slate-900/90 p-2.5 rounded border border-slate-700 text-emerald-300 text-[11px] mb-2">
                    Bit = 1 if V_tia ≥ V_th, else 0
                    <br />
                    Theoretical BER = Q( √(SNR) / 2 )
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    Current Effective Threshold V_th ={" "}
                    {simResult.statistics.effectiveThresholdVolts} V.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OpticalWirelessLab;
