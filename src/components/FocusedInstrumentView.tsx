import React, { useState, useMemo, useEffect } from "react";
import {
  Waves,
  Radio,
  Gauge,
  ArrowRight,
  Layers,
  Play,
  Pause,
  Crosshair,
  MoveHorizontal,
  ZoomIn,
  RotateCcw,
  Download,
  Check,
} from "lucide-react";
import { ActiveTabId } from "./CurriculumGuide";
import MultiChannelLogicAnalyzer from "./MultiChannelLogicAnalyzer";
import OscilloscopeSignalAnalysisPanel, {
  type FftChannelInput,
} from "./OscilloscopeSignalAnalysisPanel";
import { SubscribableWireSignal, LA_CHANNEL_PALETTE } from "./LogicAnalyzerModal";
import { LogicTimingSample } from "./LogicAnalyzerOverlay";
import {
  usePrefersReducedMotion,
  usePageVisibility,
} from "../utils/animationHelpers";

interface FocusedInstrumentViewProps {
  instrument:
    | "tool-oscilloscope"
    | "tool-logic-analyzer"
    | "tool-signal-generator"
    | "tool-multimeter";
  onNavigateTab: (tab: ActiveTabId) => void;
  telemetryDecimals?: number;
}

export default function FocusedInstrumentView({
  instrument,
  onNavigateTab,
  telemetryDecimals = 3,
}: FocusedInstrumentViewProps) {
  const dec = Math.min(4, Math.max(2, telemetryDecimals));
  // Signal Generator & Live Scope State
  const [waveType, setWaveType] = useState<"SINE" | "SQUARE" | "TRIANGLE" | "SAWTOOTH">("SINE");
  const [freqHz, setFreqHz] = useState<number>(1000);
  const [ampVpp, setAmpVpp] = useState<number>(5.0);
  const [dcOffsetV, setDcOffsetV] = useState<number>(0);
  const [dutyPct, setDutyPct] = useState<number>(50);

  // Oscilloscope Controls (including Quick Auto-Scale, Trigger, Zoom/Pan, Channels & Pause)
  const [timeDivMs, setTimeDivMs] = useState<number>(0.5);
  const [voltsDiv, setVoltsDiv] = useState<number>(2.0);
  const [autoScaleMsg, setAutoScaleMsg] = useState<string | null>(null);
  const [isScopeRunning, setIsScopeRunning] = useState<boolean>(true);
  const [showCh1, setShowCh1] = useState<boolean>(true);
  const [showCh2, setShowCh2] = useState<boolean>(true);
  const [horizZoom, setHorizZoom] = useState<number>(1);
  const [panMs, setPanMs] = useState<number>(0);
  const [triggerMode, setTriggerMode] = useState<"FREE_RUN" | "TRIG_LOCK">("FREE_RUN");
  const [triggerEdge, setTriggerEdge] = useState<"RISING" | "FALLING">("RISING");
  const [triggerLevelV, setTriggerLevelV] = useState<number>(0);
  const [phaseTimeSec, setPhaseTimeSec] = useState<number>(0);
  const [csvDownloaded, setCsvDownloaded] = useState<boolean>(false);

  const prefersReducedMotion = usePrefersReducedMotion();
  const isPageVisible = usePageVisibility();

  // DMM State
  const [dmmMode, setDmmMode] = useState<"VDC" | "VAC" | "IDC" | "OHM" | "CONT" | "DIODE">("VDC");
  const [dmmSourceV, setDmmSourceV] = useState<number>(12.0);
  const [dmmLoadOhm, setDmmLoadOhm] = useState<number>(470);

  // Logic Analyzer State
  const [laAutoClock, setLaAutoClock] = useState<boolean>(false);
  const [laTick, setLaTick] = useState<number>(0);
  const [selectedWireIds, setSelectedWireIds] = useState<number[]>([1, 2, 3, 4]);

  useEffect(() => {
    if (!laAutoClock || instrument !== "tool-logic-analyzer") return;
    const id = window.setInterval(() => {
      setLaTick((t) => (t + 1) % 32);
    }, 350);
    return () => window.clearInterval(id);
  }, [laAutoClock, instrument]);

  // Smooth RAF loop for live animated oscilloscope traces
  useEffect(() => {
    if (
      (instrument !== "tool-oscilloscope" && instrument !== "tool-signal-generator") ||
      !isScopeRunning ||
      prefersReducedMotion ||
      !isPageVisible
    ) {
      return;
    }
    let rafId = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.08, (now - last) / 1000);
      last = now;
      setPhaseTimeSec((p) => p + dt);
      rafId = window.requestAnimationFrame(tick);
    };
    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [instrument, isScopeRunning, prefersReducedMotion, isPageVisible]);

  const handleQuickAutoScale = () => {
    const periodMs = 1000 / Math.max(1, freqHz);
    const idealTimeDiv = Number((periodMs / 4).toFixed(3));
    const peakV = Math.abs(dcOffsetV) + ampVpp / 2;
    const idealVoltsDiv = Math.max(0.2, Number((peakV / 3).toFixed(2)));
    setTimeDivMs(idealTimeDiv);
    setVoltsDiv(idealVoltsDiv);
    setHorizZoom(1);
    setPanMs(0);
    setAutoScaleMsg(
      `Auto-Scaled: ${idealTimeDiv} ms/div · ${idealVoltsDiv} V/div`
    );
    window.setTimeout(() => setAutoScaleMsg(null), 2600);
  };

  const handleResetBench = () => {
    setWaveType("SINE");
    setFreqHz(1000);
    setAmpVpp(5.0);
    setDcOffsetV(0);
    setDutyPct(50);
    setTimeDivMs(0.5);
    setVoltsDiv(2.0);
    setHorizZoom(1);
    setPanMs(0);
    setTriggerMode("FREE_RUN");
    setTriggerEdge("RISING");
    setTriggerLevelV(0);
    setDmmMode("VDC");
    setDmmSourceV(12.0);
    setDmmLoadOhm(470);
    setLaTick(0);
    setLaAutoClock(false);
  };

  // Waveform Paths for CH1 & CH2 (Quadrature/Attenuated Reference) + Trigger Y Coordinate + Sampled CSV Points
  const { ch1Path, ch2Path, triggerLineY, sweepScanX, sampledPoints } = useMemo(() => {
    const width = 640;
    const height = 220;
    const effectiveTimeDiv = timeDivMs / horizZoom;
    const totalMs = effectiveTimeDiv * 10;
    const pts1: string[] = [];
    const pts2: string[] = [];
    const sampledPoints: { idx: number; tSec: number; v1: number; v2: number }[] = [];

    // Compute trigger phase offset when TRIG_LOCK is active so waveform stabilizes cleanly at trigger threshold
    const halfAmp = Math.max(0.001, ampVpp / 2);
    const clampedRatio = Math.max(-0.98, Math.min(0.98, (triggerLevelV - dcOffsetV) / halfAmp));
    let trigPhaseNorm = 0;
    if (triggerMode === "TRIG_LOCK") {
      if (waveType === "SINE") {
        const baseAsin = Math.asin(clampedRatio) / (2 * Math.PI);
        trigPhaseNorm = triggerEdge === "RISING" ? baseAsin : 0.5 - baseAsin;
      } else if (waveType === "TRIANGLE") {
        trigPhaseNorm = triggerEdge === "RISING" ? (clampedRatio + 1) / 4 : (3 - clampedRatio) / 4;
      } else {
        trigPhaseNorm = triggerEdge === "RISING" ? 0 : dutyPct / 100;
      }
    }

    // Visual drift speed scaled cleanly so high frequencies remain observable on CRT
    const livePhaseOffset =
      triggerMode === "FREE_RUN" ? (phaseTimeSec * Math.min(4, Math.max(0.4, freqHz / 500))) % 1 : 0;

    for (let i = 0; i <= 200; i++) {
      const x = (i / 200) * width;
      const tSec = ((i / 200) * totalMs + panMs) / 1000;
      const phase1 = ((tSec * freqHz + livePhaseOffset + trigPhaseNorm) % 1 + 1) % 1;
      const phase2 = ((phase1 + 0.25) % 1 + 1) % 1;

      const evalNorm = (ph: number) => {
        if (waveType === "SINE") return Math.sin(ph * 2 * Math.PI);
        if (waveType === "SQUARE") return ph < dutyPct / 100 ? 1 : -1;
        if (waveType === "TRIANGLE") return ph < 0.5 ? -1 + 4 * ph : 3 - 4 * ph;
        return -1 + 2 * ph;
      };

      const v1 = dcOffsetV + (ampVpp / 2) * evalNorm(phase1);
      const y1 = height / 2 - (v1 / (voltsDiv * 4)) * (height / 2);
      pts1.push(`${x.toFixed(1)},${Math.max(4, Math.min(height - 4, y1)).toFixed(1)}`);

      const v2 = (ampVpp * 0.35) * evalNorm(phase2);
      const y2 = height / 2 - (v2 / (voltsDiv * 4)) * (height / 2);
      pts2.push(`${x.toFixed(1)},${Math.max(4, Math.min(height - 4, y2)).toFixed(1)}`);

      sampledPoints.push({ idx: i, tSec, v1, v2 });
    }

    const trigYRaw = height / 2 - (triggerLevelV / (voltsDiv * 4)) * (height / 2);
    const clampedTrigY = Math.max(6, Math.min(height - 6, trigYRaw));
    const scanX = ((phaseTimeSec * 0.55) % 1) * width;

    return {
      ch1Path: `M ${pts1.join(" L ")}`,
      ch2Path: `M ${pts2.join(" L ")}`,
      triggerLineY: clampedTrigY,
      sweepScanX: scanX,
      sampledPoints,
    };
  }, [waveType, freqHz, ampVpp, dcOffsetV, dutyPct, timeDivMs, voltsDiv, horizZoom, panMs, triggerMode, triggerEdge, triggerLevelV, phaseTimeSec]);

  const { fftChannels, fftSampleRateHz } = useMemo(() => {
    const dtSec =
      sampledPoints.length >= 2
        ? Math.max(1e-9, sampledPoints[1].tSec - sampledPoints[0].tSec)
        : 1e-5;
    const chs: FftChannelInput[] = [];
    if (showCh1) {
      chs.push({
        id: "ch1",
        label: "CH1",
        color: "#22d3ee",
        samples: sampledPoints.map((p) => p.v1),
      });
    }
    if (showCh2) {
      chs.push({
        id: "ch2",
        label: "CH2",
        color: "#34d399",
        samples: sampledPoints.map((p) => p.v2),
      });
    }
    return { fftChannels: chs, fftSampleRateHz: 1 / dtSec };
  }, [sampledPoints, showCh1, showCh2]);

  const handleDownloadScopeCsv = () => {
    const lines = ["Sample,Time_s,Time_ms,CH1_V,CH2_V"];
    for (const pt of sampledPoints) {
      lines.push(
        `${pt.idx},${pt.tSec.toExponential(6)},${(pt.tSec * 1000).toFixed(6)},${pt.v1.toFixed(6)},${pt.v2.toFixed(6)}`
      );
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dso_4000x_${waveType.toLowerCase()}_${freqHz}hz_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setCsvDownloaded(true);
    window.setTimeout(() => setCsvDownloaded(false), 2200);
  };

  // Logic Analyzer 4-bit counter + clock digital history
  const laHistory: LogicTimingSample[] = useMemo(() => {
    const arr: LogicTimingSample[] = [];
    for (let s = 0; s < 16; s++) {
      const idx = s + laTick;
      const clk = (idx % 2) as 0 | 1;
      const count = Math.floor(idx / 2) % 8;
      arr.push({
        step: s,
        timeLabel: `${s * 10}ns`,
        netValues: {
          1: clk,
          2: ((count >> 0) & 1) as 0 | 1,
          3: ((count >> 1) & 1) as 0 | 1,
          4: ((count >> 2) & 1) as 0 | 1,
        },
      });
    }
    return arr;
  }, [laTick]);

  const laSignals: SubscribableWireSignal[] = useMemo(
    () => [
      {
        wireId: 1,
        channelIndex: 0,
        netName: "CLK",
        sourceLabel: "OSC",
        targetLabel: "FF0",
        sourceNodeId: 1,
        sourcePort: 0,
        targetNodeId: 2,
        targetPort: 0,
        isClockLine: true,
        isInputDriven: true,
        isOutputTarget: false,
        stageDepth: 0,
        delayNs: 0,
        currentLogic: laHistory[laHistory.length - 1]?.netValues[1] ?? 0,
        color: LA_CHANNEL_PALETTE[0],
        stepSamples: laHistory.map((h) => h.netValues[1]),
      },
      {
        wireId: 2,
        channelIndex: 1,
        netName: "Q0 (LSB)",
        sourceLabel: "74LS193",
        targetLabel: "BUS",
        sourceNodeId: 2,
        sourcePort: 0,
        targetNodeId: 3,
        targetPort: 0,
        isClockLine: false,
        isInputDriven: false,
        isOutputTarget: true,
        stageDepth: 1,
        delayNs: 9,
        currentLogic: laHistory[laHistory.length - 1]?.netValues[2] ?? 0,
        color: LA_CHANNEL_PALETTE[1],
        stepSamples: laHistory.map((h) => h.netValues[2]),
      },
      {
        wireId: 3,
        channelIndex: 2,
        netName: "Q1",
        sourceLabel: "74LS193",
        targetLabel: "BUS",
        sourceNodeId: 2,
        sourcePort: 1,
        targetNodeId: 3,
        targetPort: 1,
        isClockLine: false,
        isInputDriven: false,
        isOutputTarget: true,
        stageDepth: 2,
        delayNs: 18,
        currentLogic: laHistory[laHistory.length - 1]?.netValues[3] ?? 0,
        color: LA_CHANNEL_PALETTE[2],
        stepSamples: laHistory.map((h) => h.netValues[3]),
      },
      {
        wireId: 4,
        channelIndex: 3,
        netName: "Q2",
        sourceLabel: "74LS193",
        targetLabel: "BUS",
        sourceNodeId: 2,
        sourcePort: 2,
        targetNodeId: 3,
        targetPort: 2,
        isClockLine: false,
        isInputDriven: false,
        isOutputTarget: true,
        stageDepth: 3,
        delayNs: 27,
        currentLogic: laHistory[laHistory.length - 1]?.netValues[4] ?? 0,
        color: LA_CHANNEL_PALETTE[3],
        stepSamples: laHistory.map((h) => h.netValues[4]),
      },
    ],
    [laHistory]
  );

  const dmmDisplay = useMemo(() => {
    const currentMa = (dmmSourceV / Math.max(1, dmmLoadOhm)) * 1000;
    switch (dmmMode) {
      case "VDC":
        return { value: `${dmmSourceV.toFixed(dec)} V`, sub: "DC Coupled · 10 MΩ Input Z" };
      case "VAC":
        return { value: `${(dmmSourceV * 0.7071).toFixed(dec)} Vrms`, sub: "True-RMS AC (20 Hz – 300 kHz)" };
      case "IDC":
        return { value: `${currentMa.toFixed(dec)} mA`, sub: `Load ${dmmLoadOhm} Ω · Shunt 0.1 Ω` };
      case "OHM":
        return { value: `${dmmLoadOhm.toFixed(Math.min(dec, 2))} Ω`, sub: "4-Wire Kelvin Resistance" };
      case "CONT":
        return {
          value: dmmLoadOhm < 50 ? "SHORT · BEEP" : `${dmmLoadOhm.toFixed(1)} Ω`,
          sub: "Threshold < 50 Ω",
        };
      case "DIODE":
        return { value: `${(0.684).toFixed(dec)} V`, sub: "1N4007 Silicon Junction Test" };
    }
  }, [dmmMode, dmmSourceV, dmmLoadOhm, dec]);

  return (
    <div className="space-y-5">
      {/* Unified Header */}
      <div className="bg-[#162338] border border-[#24344D] rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs font-mono text-[#35BDF2] font-semibold">
            INSTRUMENTS · BENCH STIMULUS MODE
          </div>
          <h2 className="font-display text-xl sm:text-2xl font-bold text-[#F1F5FA] mt-0.5">
            {instrument === "tool-oscilloscope" && "Digital Storage Oscilloscope (DSO-4000X)"}
            {instrument === "tool-logic-analyzer" && "16-Channel Digital Logic Analyzer"}
            {instrument === "tool-signal-generator" && "DDS Arbitrary Signal Generator"}
            {instrument === "tool-multimeter" && "6.5-Digit True-RMS Virtual Multimeter"}
          </h2>
          <p className="text-xs text-[#9BAAC0] mt-1">
            Internal bench stimulus active. Open Circuit Designer to attach live probes to schematic nets.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleResetBench}
            className="px-3 py-2 rounded-lg text-xs font-medium bg-[#111B2B] hover:bg-[#1C2B40] text-[#9BAAC0] hover:text-[#F1F5FA] border border-[#24344D] cursor-pointer flex items-center gap-1.5"
            title="Reset Bench Instrument Controls"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
          <button
            type="button"
            onClick={() => onNavigateTab("lab")}
            className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#111B2B] hover:bg-[#1C2B40] text-[#35BDF2] border border-[#24344D] cursor-pointer flex items-center gap-1.5"
          >
            <Layers className="w-3.5 h-3.5" />
            Probe Live Circuit
          </button>
          <button
            type="button"
            onClick={() => onNavigateTab("instruments")}
            className="px-3.5 py-2 rounded-lg text-xs font-bold bg-[#35BDF2] hover:bg-[#58CAF5] text-[#0B1220] cursor-pointer flex items-center gap-1.5"
          >
            26 Bench Instruments <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Oscilloscope OR Signal Generator */}
      {(instrument === "tool-oscilloscope" || instrument === "tool-signal-generator") && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-8 bg-[#111B2B] border border-[#24344D] rounded-xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-mono text-cyan-300 font-bold flex flex-wrap items-center gap-2">
                <Waves className="w-4 h-4 text-cyan-400" />
                <span>CH1: {waveType} · {freqHz} Hz · {ampVpp.toFixed(2)} Vpp</span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] border ${
                    !isScopeRunning
                      ? "bg-[#F1B65B]/15 text-[#F1B65B] border-[#F1B65B]/40"
                      : triggerMode === "TRIG_LOCK"
                      ? "bg-[#48C99A]/15 text-[#48C99A] border-[#48C99A]/40"
                      : "bg-[#35BDF2]/15 text-[#35BDF2] border-[#35BDF2]/40"
                  }`}
                >
                  {!isScopeRunning ? "IDLE / STANDBY" : triggerMode === "TRIG_LOCK" ? "RUNNING · TRIG LOCKED" : "RUNNING · SWEEP"}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {autoScaleMsg && (
                  <span className="text-[11px] font-mono text-emerald-300 bg-emerald-500/15 px-2.5 py-1 rounded border border-emerald-500/30">
                    {autoScaleMsg}
                  </span>
                )}
                {/* Channel Toggles */}
                <button
                  type="button"
                  onClick={() => setShowCh1((v) => !v)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold border cursor-pointer ${
                    showCh1 ? "bg-cyan-500/20 text-cyan-300 border-cyan-400/50" : "bg-slate-900 text-slate-500 border-slate-800"
                  }`}
                >
                  CH1
                </button>
                <button
                  type="button"
                  onClick={() => setShowCh2((v) => !v)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold border cursor-pointer ${
                    showCh2 ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/50" : "bg-slate-900 text-slate-500 border-slate-800"
                  }`}
                >
                  CH2 (90°)
                </button>
                <button
                  type="button"
                  onClick={() => setIsScopeRunning((r) => !r)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border cursor-pointer ${
                    isScopeRunning
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/50"
                      : "bg-amber-500/20 text-amber-300 border-amber-400/50"
                  }`}
                >
                  {isScopeRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-amber-300" />}
                  {isScopeRunning ? "Pause" : "Resume"}
                </button>
                <button
                  type="button"
                  onClick={handleQuickAutoScale}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-400/50 cursor-pointer"
                >
                  Quick Auto-Scale
                </button>
                <button
                  type="button"
                  onClick={handleDownloadScopeCsv}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-500/40 cursor-pointer"
                  title="Download transient oscilloscope data points as CSV for Excel or MATLAB"
                >
                  {csvDownloaded ? (
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
              </div>
            </div>

            <div className="rounded-xl bg-[#0B1220] border border-[#24344D] p-2 overflow-hidden">
              <svg viewBox="0 0 640 220" className="w-full h-60">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
                  <line
                    key={`vx-${i}`}
                    x1={i * 64}
                    y1={0}
                    x2={i * 64}
                    y2={220}
                    stroke="#0f1f3a"
                    strokeWidth="1"
                  />
                ))}
                {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((j) => (
                  <line
                    key={`hy-${j}`}
                    x1={0}
                    y1={j * 27.5}
                    x2={640}
                    y2={j * 27.5}
                    stroke={j === 4 ? "#1e3a5f" : "#0f1f3a"}
                    strokeWidth="1"
                  />
                ))}
                {/* Trigger Level Reference Line */}
                <line
                  x1={0}
                  y1={triggerLineY}
                  x2={640}
                  y2={triggerLineY}
                  stroke="#f59e0b"
                  strokeWidth="1.2"
                  strokeDasharray="5 4"
                  opacity={0.75}
                />
                <text x={8} y={Math.max(12, triggerLineY - 4)} fill="#fbbf24" fontFamily="monospace" fontSize="9" fontWeight="bold">
                  TRIG {triggerLevelV.toFixed(1)}V ({triggerEdge === "RISING" ? "↑" : "↓"})
                </text>
                {/* Live Phosphor Scanline */}
                {isScopeRunning && !prefersReducedMotion && isPageVisible && (
                  <line
                    x1={sweepScanX}
                    y1={0}
                    x2={sweepScanX}
                    y2={220}
                    stroke="rgba(34, 211, 238, 0.35)"
                    strokeWidth="1.4"
                  />
                )}
                {showCh2 && (
                  <path
                    d={ch2Path}
                    fill="none"
                    stroke="#34d399"
                    strokeWidth="1.8"
                    strokeOpacity={0.85}
                  />
                )}
                {showCh1 && (
                  <path
                    d={ch1Path}
                    fill="none"
                    stroke="#22d3ee"
                    strokeWidth="2.4"
                  />
                )}
              </svg>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div className="bg-[#162338] border border-[#24344D] rounded-xl p-3">
                <div className="text-[#9BAAC0] text-[10px]">TIMEBASE ({horizZoom}×)</div>
                <div className="text-[#F1F5FA] font-bold tabular-nums">{(timeDivMs / horizZoom).toFixed(dec)} ms/div</div>
              </div>
              <div className="bg-[#162338] border border-[#24344D] rounded-xl p-3">
                <div className="text-[#9BAAC0] text-[10px]">VERTICAL</div>
                <div className="text-[#F1F5FA] font-bold tabular-nums">{voltsDiv} V/div</div>
              </div>
              <div className="bg-[#162338] border border-[#24344D] rounded-xl p-3">
                <div className="text-[#9BAAC0] text-[10px]">Vrms (EST)</div>
                <div className="text-[#48C99A] font-bold tabular-nums">
                  {((ampVpp / 2) * (waveType === "SINE" ? 0.7071 : waveType === "SQUARE" ? 1 : 0.577)).toFixed(dec)} V
                </div>
              </div>
              <div className="bg-[#162338] border border-[#24344D] rounded-xl p-3">
                <div className="text-[#9BAAC0] text-[10px]">PERIOD / FREQ</div>
                <div className="text-[#35BDF2] font-bold tabular-nums">
                  {(1000 / Math.max(1, freqHz)).toFixed(2)} ms · {freqHz} Hz
                </div>
              </div>
            </div>

            <OscilloscopeSignalAnalysisPanel
              channels={fftChannels}
              sampleRateHz={fftSampleRateHz}
              telemetryDecimals={dec}
              subtitle="Automatic real-time FFT spectrum, fundamental frequency, THD & harmonics of captured DSO waveform"
            />
          </div>

          <div className="lg:col-span-4 bg-[#162338] border border-[#24344D] rounded-xl p-5 space-y-4">
            <div className="text-xs font-mono font-bold text-cyan-400 flex items-center gap-1.5">
              <Radio className="w-4 h-4" />
              WAVEFORM &amp; TIMEBASE CONTROLS
            </div>

            <div className="grid grid-cols-2 gap-2">
              {(["SINE", "SQUARE", "TRIANGLE", "SAWTOOTH"] as const).map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => setWaveType(w)}
                  className={`py-2 rounded-lg text-xs font-bold cursor-pointer ${
                    waveType === w
                      ? "bg-[#35BDF2] text-[#0B1220]"
                      : "bg-[#111B2B] text-[#9BAAC0] hover:text-[#F1F5FA] border border-[#24344D]"
                  }`}
                >
                  {w}
                </button>
              ))}
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div>
                <div className="flex justify-between text-slate-300 mb-1">
                  <span>Frequency</span>
                  <span className="text-cyan-300 tabular-nums">{freqHz} Hz</span>
                </div>
                <input
                  type="range"
                  min={100}
                  max={5000}
                  step={50}
                  value={freqHz}
                  onChange={(e) => setFreqHz(parseInt(e.target.value, 10))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-300 mb-1">
                  <span>Amplitude (Vpp)</span>
                  <span className="text-cyan-300 tabular-nums">{ampVpp.toFixed(1)} V</span>
                </div>
                <input
                  type="range"
                  min={0.5}
                  max={20}
                  step={0.5}
                  value={ampVpp}
                  onChange={(e) => setAmpVpp(parseFloat(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-300 mb-1">
                  <span>DC Offset</span>
                  <span className="text-cyan-300 tabular-nums">{dcOffsetV.toFixed(1)} V</span>
                </div>
                <input
                  type="range"
                  min={-5}
                  max={5}
                  step={0.5}
                  value={dcOffsetV}
                  onChange={(e) => setDcOffsetV(parseFloat(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>

              {waveType === "SQUARE" && (
                <div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span>Duty Cycle</span>
                    <span className="text-emerald-300 tabular-nums">{dutyPct}%</span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={90}
                    step={5}
                    value={dutyPct}
                    onChange={(e) => setDutyPct(parseInt(e.target.value, 10))}
                    className="w-full accent-emerald-400 cursor-pointer"
                  />
                </div>
              )}

              <div>
                <div className="flex justify-between text-slate-300 mb-1">
                  <span>Time / Div</span>
                  <span className="text-white tabular-nums">{timeDivMs} ms</span>
                </div>
                <input
                  type="range"
                  min={0.05}
                  max={2.0}
                  step={0.05}
                  value={timeDivMs}
                  onChange={(e) => setTimeDivMs(parseFloat(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-300 mb-1">
                  <span>Volts / Div</span>
                  <span className="text-white tabular-nums">{voltsDiv} V</span>
                </div>
                <input
                  type="range"
                  min={0.5}
                  max={5.0}
                  step={0.25}
                  value={voltsDiv}
                  onChange={(e) => setVoltsDiv(parseFloat(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>

              {/* Trigger Controls */}
              <div className="pt-2 border-t border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between text-amber-300 font-bold">
                  <span className="flex items-center gap-1">
                    <Crosshair className="w-3.5 h-3.5" />
                    Trigger &amp; Zoom / Pan
                  </span>
                  <div className="flex gap-1">
                    {(["FREE_RUN", "TRIG_LOCK"] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setTriggerMode(m)}
                        className={`px-2 py-0.5 rounded text-[10px] cursor-pointer ${
                          triggerMode === m
                            ? "bg-amber-400 text-slate-950 font-bold"
                            : "bg-slate-900 text-slate-400 border border-slate-800"
                        }`}
                      >
                        {m === "TRIG_LOCK" ? "Lock" : "Free"}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-400">Edge:</span>
                  <div className="flex gap-1">
                    {(["RISING", "FALLING"] as const).map((e) => (
                      <button
                        key={e}
                        type="button"
                        onClick={() => setTriggerEdge(e)}
                        className={`px-2 py-0.5 rounded text-[10px] cursor-pointer ${
                          triggerEdge === e
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                            : "bg-slate-900 text-slate-400 border border-slate-800"
                        }`}
                      >
                        {e === "RISING" ? "↑ Rising" : "↓ Falling"}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span>Trigger Level</span>
                    <span className="text-amber-300 tabular-nums">{triggerLevelV.toFixed(1)} V</span>
                  </div>
                  <input
                    type="range"
                    min={-5}
                    max={5}
                    step={0.5}
                    value={triggerLevelV}
                    onChange={(e) => setTriggerLevelV(parseFloat(e.target.value))}
                    className="w-full accent-amber-400 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-400 flex items-center gap-1">
                    <ZoomIn className="w-3 h-3 text-cyan-400" />
                    Zoom:
                  </span>
                  <div className="flex gap-1">
                    {[0.5, 1, 2, 4].map((z) => (
                      <button
                        key={z}
                        type="button"
                        onClick={() => setHorizZoom(z)}
                        className={`px-2 py-0.5 rounded text-[10px] cursor-pointer ${
                          horizZoom === z
                            ? "bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 font-bold"
                            : "bg-slate-900 text-slate-400 border border-slate-800"
                        }`}
                      >
                        {z}×
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span className="flex items-center gap-1">
                      <MoveHorizontal className="w-3 h-3 text-cyan-400" />
                      Pan Offset
                    </span>
                    <span className="text-cyan-300 tabular-nums">{panMs.toFixed(2)} ms</span>
                  </div>
                  <input
                    type="range"
                    min={-5}
                    max={5}
                    step={0.25}
                    value={panMs}
                    onChange={(e) => setPanMs(parseFloat(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Logic Analyzer */}
      {instrument === "tool-logic-analyzer" && (
        <MultiChannelLogicAnalyzer
          signals={laSignals}
          selectedWireIds={selectedWireIds}
          onToggleSelectSignal={(id) =>
            setSelectedWireIds((prev) =>
              prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
            )
          }
          onSelectAllSignals={() => setSelectedWireIds([1, 2, 3, 4])}
          onClearSelectedSignals={() => setSelectedWireIds([])}
          onSelectInputsOnly={() => setSelectedWireIds([1])}
          onSelectOutputsOnly={() => setSelectedWireIds([2, 3, 4])}
          history={laHistory}
          autoClock={laAutoClock}
          onToggleAutoClock={() => setLaAutoClock((v) => !v)}
          clockHz={3}
          onStepClock={() => setLaTick((t) => (t + 1) % 32)}
          onRunPatternSweep={() => setLaTick((t) => (t + 4) % 32)}
          onClearHistory={() => setLaTick(0)}
        />
      )}

      {/* Virtual Multimeter */}
      {instrument === "tool-multimeter" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-7 bg-[#111B2B] border border-[#24344D] rounded-xl p-6 space-y-5">
            <div className="bg-[#0B1220] border border-[#24344D] rounded-xl p-6 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-[#35BDF2]">
                <span>FLUKE 8846A BENCH DMM · AUTO RANGE</span>
                <span>{dmmMode}</span>
              </div>
              <div className="text-4xl sm:text-5xl font-mono font-bold text-[#48C99A] tabular-nums tracking-tight">
                {dmmDisplay.value}
              </div>
              <div className="text-xs font-mono text-[#9BAAC0]">{dmmDisplay.sub}</div>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {(["VDC", "VAC", "IDC", "OHM", "CONT", "DIODE"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setDmmMode(m)}
                  className={`py-2.5 rounded-lg text-xs font-mono font-bold cursor-pointer ${
                    dmmMode === m
                      ? "bg-[#35BDF2] text-[#0B1220]"
                      : "bg-[#162338] text-[#9BAAC0] hover:text-[#F1F5FA] border border-[#24344D] hover:border-[#35BDF2]/50"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div className="lg:col-span-5 bg-[#162338] border border-[#24344D] rounded-xl p-5 space-y-4">
            <div className="text-xs font-mono font-bold text-[#35BDF2] flex items-center gap-1.5">
              <Gauge className="w-4 h-4" />
              TEST BENCH STIMULUS
            </div>
            <label className="block space-y-1.5">
              <div className="flex justify-between text-xs font-mono text-slate-300">
                <span>Applied Voltage Source</span>
                <span className="text-cyan-300 tabular-nums">{dmmSourceV.toFixed(1)} V</span>
              </div>
              <input
                type="range"
                min={0}
                max={30}
                step={0.5}
                value={dmmSourceV}
                onChange={(e) => setDmmSourceV(parseFloat(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </label>

            <label className="block space-y-1.5">
              <div className="flex justify-between text-xs font-mono text-slate-300">
                <span>Load / DUT Resistance</span>
                <span className="text-emerald-300 tabular-nums">{dmmLoadOhm} Ω</span>
              </div>
              <input
                type="range"
                min={10}
                max={10000}
                step={10}
                value={dmmLoadOhm}
                onChange={(e) => setDmmLoadOhm(parseInt(e.target.value, 10))}
                className="w-full accent-emerald-400 cursor-pointer"
              />
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
