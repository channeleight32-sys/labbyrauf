import React, { useMemo, useRef, useState } from "react";
import {
  Activity,
  Camera,
  Eye,
  Maximize2,
  RotateCcw,
  Sliders,
  Zap,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

export interface Cinematic3DNodeItem {
  id: number;
  type: string;
  label: string;
  x: number;
  y: number;
  value?: number;
  formattedValue?: string;
  isHigh: boolean;
  isConducting: boolean;
  currentMa: number;
  voltageV: number;
  simFreqHz: number;
  segments?: boolean[];
  isInteractive: boolean;
}

export interface Cinematic3DWireItem {
  id: number;
  fromId: number;
  toId: number;
  isEnergized: boolean;
  currentMa: number;
  freqHz: number;
}

export interface Cinematic3DProbeSignal {
  channelId: string;
  netName: string;
  color: string;
  currentVoltage: number;
  frequencyHz: number;
  waveformType: string;
  stepSamples: number[];
}

interface CircuitLabCinematic3DProps {
  circuitTitle: string;
  isRunning: boolean;
  simSpeed: number;
  spiceFreqHz: number;
  supplyVoltageV: number;
  nodes: Cinematic3DNodeItem[];
  wires: Cinematic3DWireItem[];
  selectedNodeId: number | null;
  probedSignals: Cinematic3DProbeSignal[];
  prefersReducedMotion: boolean;
  isPageVisible: boolean;
  onSelectNode: (nodeId: number) => void;
  onToggleInteractiveNode: (nodeId: number) => void;
  onExitCinematic?: () => void;
}

type CameraPresetId = "workbench" | "overhead" | "macro" | "instruments";

const CAMERA_PRESETS: Record<
  CameraPresetId,
  { label: string; rx: number; rz: number; zoom: number; ty: number }
> = {
  workbench: { label: "Workbench", rx: 52, rz: -14, zoom: 0.96, ty: 18 },
  overhead: { label: "Overhead PCB", rx: 18, rz: 0, zoom: 1.02, ty: 0 },
  macro: { label: "Low Macro", rx: 66, rz: -22, zoom: 1.16, ty: 38 },
  instruments: { label: "Bench Rig", rx: 46, rz: 14, zoom: 0.88, ty: 12 },
};

function computeAnimDur(freqHz: number, simSpeed: number): string {
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
}

const WIRE_PALETTE = [
  "#38bdf8",
  "#22c55e",
  "#f59e0b",
  "#ec4899",
  "#a78bfa",
  "#fb7185",
];

export default function CircuitLabCinematic3D({
  circuitTitle,
  isRunning,
  simSpeed,
  spiceFreqHz,
  supplyVoltageV,
  nodes,
  wires,
  selectedNodeId,
  probedSignals,
  prefersReducedMotion,
  isPageVisible,
  onSelectNode,
  onToggleInteractiveNode,
  onExitCinematic,
}: CircuitLabCinematic3DProps) {
  const [preset, setPreset] = useState<CameraPresetId>("workbench");
  const [rotX, setRotX] = useState<number>(CAMERA_PRESETS.workbench.rx);
  const [rotZ, setRotZ] = useState<number>(CAMERA_PRESETS.workbench.rz);
  const [zoom, setZoom] = useState<number>(CAMERA_PRESETS.workbench.zoom);
  const [transY, setTransY] = useState<number>(CAMERA_PRESETS.workbench.ty);
  const [hoveredId, setHoveredId] = useState<number | null>(null);

  const dragRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    startRx: number;
    startRz: number;
  } | null>(null);

  const applyPreset = (id: CameraPresetId) => {
    const p = CAMERA_PRESETS[id];
    setPreset(id);
    setRotX(p.rx);
    setRotZ(p.rz);
    setZoom(p.zoom);
    setTransY(p.ty);
  };

  // Map schematic x/y coordinates cleanly onto the breadboard deck (520 x 250 px)
  const mappedNodes = useMemo(() => {
    if (nodes.length === 0) return [];
    const xs = nodes.map((n) => n.x);
    const ys = nodes.map((n) => n.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const spanX = Math.max(220, maxX - minX);
    const spanY = Math.max(140, maxY - minY);

    return nodes.map((n) => {
      const nx = 54 + ((n.x - minX) / spanX) * 412;
      const ny = 42 + ((n.y - minY) / spanY) * 164;
      return { ...n, bx: nx, by: ny };
    });
  }, [nodes]);

  const mappedById = useMemo(() => {
    const m = new Map<number, (typeof mappedNodes)[number]>();
    mappedNodes.forEach((n) => m.set(n.id, n));
    return m;
  }, [mappedNodes]);

  const totalCurrentMa = useMemo(() => {
    const sum = nodes.reduce((acc, n) => acc + Math.max(0, n.currentMa || 0), 0);
    return Number((sum / Math.max(1, Math.min(3, nodes.length))).toFixed(1));
  }, [nodes]);

  const activeNode =
    mappedNodes.find((n) => n.id === (hoveredId ?? selectedNodeId)) ||
    mappedNodes.find((n) => n.isConducting || n.isHigh) ||
    mappedNodes[0] ||
    null;

  const globalCycleDur = computeAnimDur(spiceFreqHz, simSpeed);
  const canAnimate = isRunning && !prefersReducedMotion && isPageVisible;

  // Build live oscilloscope SVG trace from probedSignals or circuit spiceFreqHz
  const scopePathD = useMemo(() => {
    const primary = probedSignals[0];
    const pts: string[] = [];
    const width = 128;
    const height = 56;
    const midY = height / 2;

    if (primary && primary.stepSamples && primary.stepSamples.length > 3) {
      const samples = primary.stepSamples.slice(-36);
      const maxAbs = Math.max(
        2.5,
        ...samples.map((v) => Math.abs(v))
      );
      samples.forEach((v, idx) => {
        const px = (idx / Math.max(1, samples.length - 1)) * width;
        const py = midY - (v / maxAbs) * (height * 0.36);
        pts.push(`${idx === 0 ? "M" : "L"} ${px.toFixed(1)} ${py.toFixed(1)}`);
      });
      return pts.join(" ");
    }

    const isSquare = nodes.some(
      (n) => n.type === "CLOCK" || n.type === "TIMER_555" || n.type.startsWith("74")
    );
    const cycles = Math.max(1.5, Math.min(5, spiceFreqHz > 0 ? 2.5 : 1.5));
    for (let i = 0; i <= 48; i++) {
      const t = i / 48;
      const px = t * width;
      const val = !isRunning
        ? 0
        : isSquare
        ? Math.sin(t * Math.PI * 2 * cycles) >= 0
          ? 1
          : -1
        : Math.sin(t * Math.PI * 2 * cycles);
      const py = midY - val * (height * 0.34);
      pts.push(`${i === 0 ? "M" : "L"} ${px.toFixed(1)} ${py.toFixed(1)}`);
    }
    return pts.join(" ");
  }, [probedSignals, nodes, spiceFreqHz, isRunning]);

  return (
    <div
      className="relative w-full h-full min-h-[460px] overflow-hidden select-none bg-[#060b14]"
      style={{
        backgroundImage:
          "radial-gradient(ellipse 80% 65% at 50% 42%, rgba(22, 42, 74, 0.55) 0%, rgba(8, 13, 24, 0.94) 60%, #04070e 100%)",
      }}
      onPointerDown={(e) => {
        const target = e.target as HTMLElement;
        if (target.closest("[data-cinematic-interactive='true']")) return;
        dragRef.current = {
          active: true,
          startX: e.clientX,
          startY: e.clientY,
          startRx: rotX,
          startRz: rotZ,
        };
      }}
      onPointerMove={(e) => {
        if (!dragRef.current?.active) return;
        const dx = e.clientX - dragRef.current.startX;
        const dy = e.clientY - dragRef.current.startY;
        setRotZ(Math.max(-45, Math.min(45, dragRef.current.startRz + dx * 0.22)));
        setRotX(Math.max(16, Math.min(72, dragRef.current.startRx - dy * 0.22)));
      }}
      onPointerUp={() => {
        dragRef.current = null;
      }}
      onPointerLeave={() => {
        dragRef.current = null;
      }}
    >
      {/* Top-Left Camera & Telemetry Strip */}
      <div
        data-cinematic-interactive="true"
        className="absolute top-3 left-3 right-3 z-30 flex flex-wrap items-center justify-between gap-2 pointer-events-none"
      >
        <div className="pointer-events-auto flex flex-wrap items-center gap-1.5 bg-[#0b1220]/90 backdrop-blur-md border border-[#24344D] rounded-xl px-2.5 py-1.5 shadow-xl">
          <div className="flex items-center gap-1.5 pr-2 border-r border-[#1E2B42]">
            <Camera className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[11px] font-mono font-bold text-[#F3F6FA] whitespace-nowrap">
              3D Cinematic Workstation
            </span>
          </div>

          {(Object.keys(CAMERA_PRESETS) as CameraPresetId[]).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => applyPreset(id)}
              className={`px-2 py-1 rounded-md text-[11px] font-mono font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                preset === id
                  ? "bg-cyan-400 text-slate-950"
                  : "text-[#9AA6BA] hover:text-white hover:bg-[#162338]"
              }`}
            >
              {CAMERA_PRESETS[id].label}
            </button>
          ))}

          <div className="flex items-center gap-1 pl-1.5 border-l border-[#1E2B42]">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.65, Number((z - 0.1).toFixed(2))))}
              className="p-1 rounded text-[#9AA6BA] hover:text-white hover:bg-[#162338] cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10.5px] font-mono text-cyan-300 tabular-nums w-9 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(1.45, Number((z + 0.1).toFixed(2))))}
              className="p-1 rounded text-[#9AA6BA] hover:text-white hover:bg-[#162338] cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => applyPreset("workbench")}
              className="p-1 rounded text-[#9AA6BA] hover:text-white hover:bg-[#162338] cursor-pointer"
              title="Reset Camera Angle"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="pointer-events-auto flex items-center gap-2 bg-[#0b1220]/90 backdrop-blur-md border border-[#24344D] rounded-xl px-3 py-1.5 shadow-xl text-[11px] font-mono tabular-nums">
          <span className="text-[#9AA6BA] truncate max-w-[160px]">{circuitTitle}</span>
          <span className="text-[#475569]">·</span>
          <span className="text-emerald-300 font-bold">
            {supplyVoltageV.toFixed(1)}V
          </span>
          <span className="text-[#475569]">·</span>
          <span className="text-cyan-300 font-bold">
            {spiceFreqHz > 0 ? `${spiceFreqHz.toFixed(1)} Hz` : "DC"}
          </span>
          <span className="text-[#475569]">·</span>
          <span className="text-amber-300">{totalCurrentMa.toFixed(1)} mA</span>
          {onExitCinematic && (
            <button
              type="button"
              onClick={onExitCinematic}
              className="ml-1 px-2 py-0.5 rounded bg-[#162338] hover:bg-[#1F314D] border border-[#2E4263] text-[#E2E8F0] text-[10.5px] cursor-pointer whitespace-nowrap shrink-0"
            >
              2D Schematic
            </button>
          )}
        </div>
      </div>

      {/* Bottom Interactive Hint & Selected Node Readout */}
      <div className="absolute bottom-3 left-3 right-3 z-30 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        <div className="bg-[#0b1220]/85 backdrop-blur-md border border-[#1E2B42] rounded-lg px-3 py-1.5 text-[11px] font-mono text-[#9AA6BA]">
          Drag backdrop to orbit bench · Click switches/clocks on breadboard to toggle live state
        </div>
        {activeNode && (
          <div className="bg-[#0b1220]/90 backdrop-blur-md border border-cyan-500/35 rounded-lg px-3 py-1.5 text-[11px] font-mono tabular-nums flex items-center gap-2 text-[#E2E8F0]">
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-bold text-white">{activeNode.label}</span>
            <span className="text-[#64748B]">·</span>
            <span className="text-cyan-300">{activeNode.voltageV.toFixed(2)} V</span>
            <span className="text-[#64748B]">·</span>
            <span className="text-emerald-300">{activeNode.currentMa.toFixed(1)} mA</span>
          </div>
        )}
      </div>

      {/* CSS 3D Perspective Stage */}
      <div
        className="w-full h-full flex items-center justify-center"
        style={{
          perspective: "1450px",
          perspectiveOrigin: "50% 42%",
        }}
      >
        {/* Camera Rig */}
        <div
          className="relative transition-transform duration-300 ease-out"
          style={{
            width: "920px",
            height: "520px",
            transformStyle: "preserve-3d",
            transform: `translate3d(0px, ${transY}px, 0px) scale(${zoom}) rotateX(${rotX}deg) rotateZ(${rotZ}deg)`,
          }}
        >
          {/* ESD Anti-Static Workstation Desk Mat */}
          <div
            className="absolute inset-0 rounded-2xl border border-[#23324b]"
            style={{
              transformStyle: "preserve-3d",
              background:
                "linear-gradient(145deg, #10192b 0%, #0b1220 55%, #070c16 100%)",
              backgroundImage:
                "linear-gradient(rgba(56, 189, 248, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(56, 189, 248, 0.05) 1px, transparent 1px), linear-gradient(145deg, #10192b 0%, #0b1220 55%, #070c16 100%)",
              backgroundSize: "32px 32px, 32px 32px, 100% 100%",
              boxShadow:
                "0 48px 90px rgba(0, 0, 0, 0.88), 0 18px 34px rgba(0, 0, 0, 0.72), inset 0 1px 0 rgba(148, 163, 184, 0.16)",
            }}
          >
            {/* Desk Front Thickness Bevel */}
            <div
              className="absolute left-0 right-0 -bottom-4 h-4 rounded-b-xl bg-[#050912] border-x border-b border-[#1c2940]"
              style={{
                transformOrigin: "top center",
                transform: "rotateX(-90deg)",
              }}
            />

            {/* Bench Harness / Equipment Leads Layer (Desk Surface Plane) */}
            <svg
              viewBox="0 0 920 520"
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{ transform: "translateZ(2px)" }}
            >
              {/* PSU Red +V and Black GND Banana Leads to Breadboard Rails */}
              <path
                d="M 190 125 C 225 140, 225 180, 232 204"
                fill="none"
                stroke="#ef4444"
                strokeWidth="4"
                strokeLinecap="round"
                opacity="0.9"
              />
              <path
                d="M 172 125 C 205 152, 200 198, 214 214"
                fill="none"
                stroke="#38bdf8"
                strokeWidth="4"
                strokeLinecap="round"
                opacity="0.85"
              />
              {/* Oscilloscope Coax Probe Lead */}
              <path
                d="M 695 128 C 655 150, 665 210, 620 226"
                fill="none"
                stroke="#22d3ee"
                strokeWidth="3.5"
                strokeDasharray={canAnimate ? "10 4" : undefined}
                className={canAnimate ? "spice-cable-shimmer" : undefined}
                style={{ "--spice-cycle-dur": globalCycleDur } as React.CSSProperties}
              />
              {/* Function Generator BNC Cable */}
              <path
                d="M 760 320 C 735 300, 710 300, 695 292"
                fill="none"
                stroke="#a78bfa"
                strokeWidth="3.2"
                strokeLinecap="round"
                opacity="0.85"
              />
              {/* Multimeter Red / Black Probe Leads */}
              <path
                d="M 162 325 C 185 310, 200 300, 222 292"
                fill="none"
                stroke="#f59e0b"
                strokeWidth="3"
                strokeLinecap="round"
                opacity="0.85"
              />
              <path
                d="M 162 346 C 188 338, 202 332, 222 324"
                fill="none"
                stroke="#64748b"
                strokeWidth="3"
                strokeLinecap="round"
                opacity="0.85"
              />
            </svg>

            {/* ==============================================================
                VIRTUAL INSTRUMENT 1: BENCH DC POWER SUPPLY (Top-Left)
               ============================================================== */}
            <div
              className="absolute left-7 top-6 w-[182px] h-[96px] rounded-xl border border-[#334155] bg-[#141f33]"
              style={{
                transformStyle: "preserve-3d",
                transform: "translateZ(26px)",
                boxShadow:
                  "0 22px 32px rgba(0, 0, 0, 0.72), 0 8px 14px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255,255,255,0.12)",
              }}
            >
              {/* Top Chassis Vent Detail */}
              <div className="px-3 pt-2 flex items-center justify-between text-[9px] font-mono text-[#94a3b8]">
                <span className="font-bold tracking-wider text-slate-200">
                  BENCH DC PSU
                </span>
                <span className="text-emerald-400 font-bold">
                  {isRunning ? "CV ON" : "STBY"}
                </span>
              </div>
              {/* Front Angled Faceplate (extruded downward) */}
              <div
                className="mx-2 mt-1.5 rounded-lg bg-[#09101d] border border-[#1e293b] p-2 font-mono tabular-nums"
                style={{
                  boxShadow: "inset 0 2px 8px rgba(0,0,0,0.8)",
                }}
              >
                <div className="flex items-baseline justify-between">
                  <span className="text-[10px] text-slate-400">CH1</span>
                  <span className="text-base font-bold text-emerald-400">
                    {supplyVoltageV.toFixed(2)} V
                  </span>
                </div>
                <div className="flex items-baseline justify-between mt-0.5">
                  <span className="text-[10px] text-slate-400">LOAD</span>
                  <span className="text-xs font-semibold text-cyan-300">
                    {totalCurrentMa.toFixed(1)} mA
                  </span>
                </div>
              </div>
              {/* Front Face Extrusion */}
              <div
                className="absolute left-0 right-0 -bottom-6 h-6 rounded-b-lg bg-[#0d1626] border-x border-b border-[#334155] flex items-center justify-end gap-2 px-3"
                style={{
                  transformOrigin: "top center",
                  transform: "rotateX(-90deg)",
                }}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 border border-red-300" />
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400 border border-sky-200" />
              </div>
            </div>

            {/* ==============================================================
                VIRTUAL INSTRUMENT 2: DIGITAL STORAGE OSCILLOSCOPE (Top-Right)
               ============================================================== */}
            <div
              className="absolute right-7 top-5 w-[240px] h-[112px] rounded-xl border border-[#334155] bg-[#162238] p-2.5"
              style={{
                transformStyle: "preserve-3d",
                transform: "translateZ(32px)",
                boxShadow:
                  "0 26px 38px rgba(0, 0, 0, 0.78), 0 10px 18px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255,255,255,0.14)",
              }}
            >
              <div className="flex items-center justify-between text-[9px] font-mono text-slate-300 mb-1.5">
                <span className="font-bold tracking-wider">DSO-2040 SCOPE</span>
                <span className="text-cyan-300 tabular-nums">
                  {spiceFreqHz > 0 ? `${spiceFreqHz.toFixed(1)} Hz` : "DC"}
                </span>
              </div>
              <div className="flex items-stretch gap-2 h-[74px]">
                {/* Phosphor Screen */}
                <div
                  className="flex-1 rounded-md bg-[#040911] border border-cyan-500/35 relative overflow-hidden"
                  style={{
                    boxShadow:
                      "inset 0 0 16px rgba(6, 182, 212, 0.16), inset 0 2px 6px rgba(0,0,0,0.9)",
                  }}
                >
                  <svg viewBox="0 0 128 56" className="w-full h-full">
                    <line
                      x1="0"
                      y1="28"
                      x2="128"
                      y2="28"
                      stroke="#162844"
                      strokeWidth="0.7"
                      strokeDasharray="2 2"
                    />
                    <line
                      x1="64"
                      y1="0"
                      x2="64"
                      y2="56"
                      stroke="#162844"
                      strokeWidth="0.7"
                      strokeDasharray="2 2"
                    />
                    <path
                      d={scopePathD}
                      fill="none"
                      stroke={isRunning ? "#22d3ee" : "#475569"}
                      strokeWidth="1.9"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                {/* Rotary Control Knobs */}
                <div className="w-11 flex flex-col items-center justify-between py-1">
                  <div className="w-5 h-5 rounded-full bg-[#1e293b] border border-slate-500 shadow-inner" />
                  <div className="w-5 h-5 rounded-full bg-[#1e293b] border border-cyan-400/50 shadow-inner" />
                  <span className="text-[8px] font-mono text-emerald-300">TRIG</span>
                </div>
              </div>
              <div
                className="absolute left-0 right-0 -bottom-7 h-7 rounded-b-lg bg-[#0c1424] border-x border-b border-[#334155]"
                style={{
                  transformOrigin: "top center",
                  transform: "rotateX(-90deg)",
                }}
              />
            </div>

            {/* ==============================================================
                VIRTUAL INSTRUMENT 3: DIGITAL MULTIMETER (Left Kickstand)
               ============================================================== */}
            <div
              className="absolute left-7 bottom-12 w-[132px] h-[165px] rounded-xl border-2 border-amber-500/70 bg-[#1a2233] p-2.5"
              style={{
                transformStyle: "preserve-3d",
                transform: "translateZ(18px) rotateZ(-4deg)",
                boxShadow:
                  "0 20px 30px rgba(0,0,0,0.75), 0 6px 12px rgba(0,0,0,0.55)",
              }}
            >
              <div className="text-[9px] font-mono font-bold text-amber-300 mb-1 flex items-center justify-between">
                <span>TRUE-RMS DMM</span>
                <span>AUTO</span>
              </div>
              <div className="rounded bg-[#0f2419] border border-emerald-500/40 px-2 py-1.5 font-mono tabular-nums text-right shadow-inner">
                <div className="text-[9px] text-emerald-400/80">
                  {activeNode ? activeNode.label : "NODE V"}
                </div>
                <div className="text-sm font-bold text-emerald-300">
                  {activeNode ? `${activeNode.voltageV.toFixed(2)} V` : "0.00 V"}
                </div>
              </div>
              {/* Rotary Range Selector */}
              <div className="mt-3 mx-auto w-14 h-14 rounded-full bg-[#0d1524] border-2 border-[#334155] flex items-center justify-center shadow-inner">
                <div className="w-2 h-9 rounded-full bg-amber-400 rotate-45 shadow" />
              </div>
              <div className="mt-2.5 flex items-center justify-center gap-2.5">
                <span className="w-3 h-3 rounded-full bg-red-500 border border-red-200" />
                <span className="w-3 h-3 rounded-full bg-slate-700 border border-slate-400" />
              </div>
            </div>

            {/* ==============================================================
                VIRTUAL INSTRUMENT 4: SIGNAL / FUNCTION GENERATOR (Right)
               ============================================================== */}
            <div
              className="absolute right-7 bottom-14 w-[144px] h-[142px] rounded-xl border border-[#334155] bg-[#141f33] p-2.5"
              style={{
                transformStyle: "preserve-3d",
                transform: "translateZ(20px) rotateZ(3deg)",
                boxShadow:
                  "0 20px 32px rgba(0,0,0,0.75), 0 6px 12px rgba(0,0,0,0.55)",
              }}
            >
              <div className="text-[9px] font-mono font-bold text-violet-300 flex items-center justify-between mb-1.5">
                <span>SIGNAL GEN</span>
                <Sliders className="w-3 h-3 text-violet-400" />
              </div>
              <div className="rounded-md bg-[#090f1c] border border-violet-500/35 p-2 font-mono tabular-nums">
                <div className="text-[9px] text-slate-400">FREQ SYNC</div>
                <div className="text-sm font-bold text-violet-300">
                  {spiceFreqHz > 0 ? `${spiceFreqHz.toFixed(2)} Hz` : "DC 0 Hz"}
                </div>
                <div className="text-[9px] text-cyan-300 mt-0.5">
                  SPEED {simSpeed}x
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between px-1">
                <div className="w-7 h-7 rounded-full bg-[#1e293b] border border-violet-400/50" />
                <div className="w-7 h-7 rounded-full bg-[#1e293b] border border-slate-500" />
              </div>
            </div>

            {/* ==============================================================
                CENTERPIECE: EXTRUDED 3D SOLDERLESS BREADBOARD (MB-102)
               ============================================================== */}
            <div
              className="absolute left-[200px] top-[168px] w-[520px] h-[252px] rounded-xl border border-[#cbd5e1]/40"
              style={{
                transformStyle: "preserve-3d",
                transform: "translateZ(18px)",
                background:
                  "linear-gradient(180deg, #e8edf5 0%, #dce4ef 55%, #cfd9e7 100%)",
                boxShadow:
                  "0 34px 55px rgba(0, 0, 0, 0.85), 0 12px 22px rgba(0, 0, 0, 0.65), inset 0 2px 0 rgba(255, 255, 255, 0.85)",
              }}
            >
              {/* Breadboard Front & Side Extruded Polymer Walls */}
              <div
                className="absolute left-0 right-0 -bottom-[18px] h-[18px] rounded-b-lg bg-[#94a3b8] border-x border-b border-[#64748b]"
                style={{
                  transformOrigin: "top center",
                  transform: "rotateX(-90deg)",
                }}
              />
              <div
                className="absolute top-0 bottom-0 -right-[18px] w-[18px] rounded-r-lg bg-[#7c8ba1] border-y border-r border-[#475569]"
                style={{
                  transformOrigin: "left center",
                  transform: "rotateY(90deg)",
                }}
              />

              {/* Top Red & Blue Power Rails */}
              <div className="absolute left-4 right-4 top-3 h-[2px] bg-red-600/80" />
              <div className="absolute left-4 right-4 top-6 h-[2px] bg-blue-600/80" />
              <span className="absolute left-1.5 top-1.5 text-[8px] font-mono font-bold text-red-700">+</span>
              <span className="absolute left-1.5 top-4.5 text-[8px] font-mono font-bold text-blue-700">-</span>

              {/* Bottom Red & Blue Power Rails */}
              <div className="absolute left-4 right-4 bottom-6 h-[2px] bg-blue-600/80" />
              <div className="absolute left-4 right-4 bottom-3 h-[2px] bg-red-600/80" />
              <span className="absolute left-1.5 bottom-4.5 text-[8px] font-mono font-bold text-blue-700">-</span>
              <span className="absolute left-1.5 bottom-1.5 text-[8px] font-mono font-bold text-red-700">+</span>

              {/* Tie-Point Pin Matrix Pattern */}
              <div
                className="absolute left-5 right-5 top-9 bottom-9 rounded"
                style={{
                  backgroundImage:
                    "radial-gradient(circle, #1e293b 1.35px, transparent 1.45px)",
                  backgroundSize: "14px 14px",
                  opacity: 0.72,
                }}
              />

              {/* Center DIP IC Trough Groove */}
              <div
                className="absolute left-4 right-4 top-1/2 -translate-y-1/2 h-4 rounded-sm bg-[#b8c4d4] border-y border-[#94a3b8]"
                style={{
                  boxShadow: "inset 0 2px 4px rgba(15, 23, 42, 0.28)",
                }}
              />

              {/* 3D Elevated Jumper Wires SVG Layer */}
              <svg
                viewBox="0 0 520 252"
                className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
                style={{ transform: "translateZ(10px)" }}
              >
                {wires.map((w, idx) => {
                  const nA = mappedById.get(w.fromId);
                  const nB = mappedById.get(w.toId);
                  if (!nA || !nB) return null;
                  const midX = (nA.bx + nB.bx) / 2;
                  const arcLift = Math.min(44, 16 + Math.hypot(nB.bx - nA.bx, nB.by - nA.by) * 0.14);
                  const midY = Math.min(nA.by, nB.by) - arcLift;
                  const wireColor = w.isEnergized
                    ? "#22d3ee"
                    : WIRE_PALETTE[idx % WIRE_PALETTE.length];
                  const wireDur = computeAnimDur(w.freqHz || spiceFreqHz, simSpeed);
                  return (
                    <g key={w.id}>
                      {/* Wire shadow on breadboard deck */}
                      <path
                        d={`M ${nA.bx} ${nA.by + 6} Q ${midX} ${midY + 12} ${nB.bx} ${nB.by + 6}`}
                        fill="none"
                        stroke="rgba(15, 23, 42, 0.28)"
                        strokeWidth="4"
                        strokeLinecap="round"
                      />
                      {/* Physical insulated jumper arc */}
                      <path
                        d={`M ${nA.bx} ${nA.by} Q ${midX} ${midY} ${nB.bx} ${nB.by}`}
                        fill="none"
                        stroke={wireColor}
                        strokeWidth={w.isEnergized ? "2.8" : "2.1"}
                        strokeLinecap="round"
                        opacity={w.isEnergized ? 0.96 : 0.72}
                      />
                      {canAnimate && w.isEnergized && (
                        <path
                          d={`M ${nA.bx} ${nA.by} Q ${midX} ${midY} ${nB.bx} ${nB.by}`}
                          fill="none"
                          stroke="#ffffff"
                          strokeWidth="1.5"
                          strokeDasharray="6 10"
                          className="spice-cable-shimmer"
                          style={{ "--spice-cycle-dur": wireDur } as React.CSSProperties}
                        />
                      )}
                    </g>
                  );
                })}
              </svg>

              {/* 3D CSS-Extruded Components Mounted on Breadboard */}
              {mappedNodes.map((n) => {
                const isSelected = n.id === selectedNodeId;
                const nodeDur = computeAnimDur(n.simFreqHz || spiceFreqHz, simSpeed);
                const pulseActive =
                  canAnimate &&
                  (n.isHigh || n.isConducting) &&
                  (n.simFreqHz > 0 || spiceFreqHz > 0);
                const upper = n.type.toUpperCase();

                const isLed =
                  upper.startsWith("LED") || upper === "OUTPUT";
                const isCap = upper.startsWith("CAP");
                const isRelay = upper.includes("RELAY");
                const isRes = upper === "RES" || upper === "RESISTOR" || upper === "POT";
                const isDiode = upper.includes("DIODE") || upper.includes("ZENER") || upper.includes("SCHOTTKY");
                const isTransistor =
                  upper.includes("BC547") ||
                  upper.includes("BC557") ||
                  upper.includes("2N2222") ||
                  upper.includes("MOSFET") ||
                  upper.includes("LM7805") ||
                  upper.includes("REG7805");
                const is7Seg = upper === "7SEG";
                const isInput =
                  upper === "INPUT" ||
                  upper === "CLOCK" ||
                  upper.includes("SWITCH") ||
                  upper.includes("BUTTON");

                const ledColor = upper.includes("GREEN")
                  ? "#10b981"
                  : upper.includes("BLUE")
                  ? "#3b82f6"
                  : "#ef4444";

                return (
                  <div
                    key={n.id}
                    data-cinematic-interactive="true"
                    onPointerEnter={() => setHoveredId(n.id)}
                    onPointerLeave={() => setHoveredId((prev) => (prev === n.id ? null : prev))}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectNode(n.id);
                      if (n.isInteractive || isInput) {
                        onToggleInteractiveNode(n.id);
                      }
                    }}
                    title={`${n.label} (${n.voltageV.toFixed(2)}V · ${n.currentMa.toFixed(1)}mA)`}
                    className="absolute cursor-pointer group"
                    style={{
                      left: `${n.bx}px`,
                      top: `${n.by}px`,
                      transformStyle: "preserve-3d",
                      transform: "translate(-50%, -50%) translateZ(6px)",
                    }}
                  >
                    {/* Contact Shadow on Breadboard */}
                    <div
                      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none"
                      style={{
                        width: isLed ? "26px" : isRes ? "44px" : "48px",
                        height: isLed ? "22px" : "28px",
                        background: "rgba(15, 23, 42, 0.38)",
                        filter: "blur(4px)",
                        transform: "translateZ(-4px)",
                      }}
                    />

                    {/* LED 3D Dome & Volumetric Glow */}
                    {isLed ? (
                      <div
                        className="relative flex flex-col items-center"
                        style={{ transformStyle: "preserve-3d" }}
                      >
                        {(n.isHigh || n.isConducting) && isRunning && (
                          <div
                            className={`absolute -inset-3 rounded-full pointer-events-none ${
                              pulseActive ? "spice-led-halo" : ""
                            }`}
                            style={{
                              background: `radial-gradient(circle, ${ledColor}aa 0%, ${ledColor}22 55%, transparent 75%)`,
                              "--spice-cycle-dur": nodeDur,
                            } as React.CSSProperties}
                          />
                        )}
                        <div
                          className={`w-6 h-7 rounded-t-full rounded-b-sm border border-white/40 transition-all ${
                            pulseActive ? "spice-led-pulse" : ""
                          }`}
                          style={{
                            transform: "translateZ(12px) rotateX(-28deg)",
                            backgroundColor:
                              (n.isHigh || n.isConducting) && isRunning
                                ? ledColor
                                : "#334155",
                            boxShadow:
                              (n.isHigh || n.isConducting) && isRunning
                                ? `0 0 18px ${ledColor}, inset 0 2px 4px rgba(255,255,255,0.65)`
                                : "inset 0 2px 3px rgba(255,255,255,0.25)",
                            "--spice-cycle-dur": nodeDur,
                          } as React.CSSProperties}
                        />
                      </div>
                    ) : isCap ? (
                      /* Standing Electrolytic / Ceramic Capacitor Can */
                      <div
                        className="relative flex flex-col items-center"
                        style={{ transformStyle: "preserve-3d" }}
                      >
                        <div
                          className={`w-7 h-9 rounded-md border flex flex-col items-center justify-between py-1 ${
                            upper === "CAP_NP" || upper === "CAPACITOR"
                              ? "bg-amber-500 border-amber-700 rounded-full"
                              : "bg-slate-900 border-slate-500"
                          }`}
                          style={{
                            transform: "translateZ(14px) rotateX(-25deg)",
                            boxShadow:
                              "0 6px 12px rgba(0,0,0,0.45), inset 0 2px 2px rgba(255,255,255,0.3)",
                          }}
                        >
                          <div className="w-4 h-1 rounded-full bg-slate-300/70" />
                          <div
                            className={`w-5 h-1.5 rounded-full bg-cyan-400 ${
                              canAnimate && (n.simFreqHz > 0 || spiceFreqHz > 0)
                                ? "spice-cap-charge"
                                : ""
                            }`}
                            style={{ "--spice-cycle-dur": nodeDur } as React.CSSProperties}
                          />
                        </div>
                      </div>
                    ) : isRelay ? (
                      /* Translucent Blue SRD-05VDC SPDT Relay Cube */
                      <div
                        className="w-14 h-11 rounded-md bg-sky-600/90 border border-sky-300/60 p-1 flex flex-col justify-between"
                        style={{
                          transform: "translateZ(15px)",
                          boxShadow:
                            "0 8px 16px rgba(0,0,0,0.5), inset 0 2px 4px rgba(255,255,255,0.35)",
                        }}
                      >
                        <div className="flex items-center justify-between px-1">
                          <div
                            className={`w-3.5 h-3.5 rounded-sm bg-amber-500 border border-amber-200 ${
                              canAnimate && (n.isHigh || n.isConducting)
                                ? "spice-relay-coil"
                                : ""
                            }`}
                            style={{ "--spice-cycle-dur": nodeDur } as React.CSSProperties}
                          />
                          <div
                            className={`w-5 h-0.5 bg-emerald-300 origin-left ${
                              pulseActive ? "spice-relay-armature" : ""
                            }`}
                            style={{ "--spice-cycle-dur": nodeDur } as React.CSSProperties}
                          />
                        </div>
                        <span className="text-[7px] font-mono font-bold text-white text-center">
                          RELAY
                        </span>
                      </div>
                    ) : isRes || isDiode ? (
                      /* Elevated Axial Resistor / Diode */
                      <div
                        className="flex items-center"
                        style={{ transform: "translateZ(8px)" }}
                      >
                        <div className="w-2.5 h-0.5 bg-slate-400" />
                        <div
                          className={`w-9 h-3.5 rounded-full border flex items-center justify-around px-1 ${
                            isDiode
                              ? "bg-slate-900 border-slate-500"
                              : "bg-amber-200 border-amber-500"
                          } ${
                            canAnimate && n.isConducting ? "spice-signal-flow" : ""
                          }`}
                          style={{ "--spice-cycle-dur": nodeDur } as React.CSSProperties}
                        >
                          {isDiode ? (
                            <span className="w-1 h-full bg-slate-200 ml-auto mr-0.5" />
                          ) : (
                            <>
                              <span className="w-0.5 h-full bg-amber-800" />
                              <span className="w-0.5 h-full bg-red-600" />
                              <span className="w-0.5 h-full bg-amber-600" />
                            </>
                          )}
                        </div>
                        <div className="w-2.5 h-0.5 bg-slate-400" />
                      </div>
                    ) : isTransistor ? (
                      /* TO-92 / TO-220 Standing Semiconductor */
                      <div
                        className="w-7 h-8 rounded-t-md bg-slate-900 border border-slate-500 flex flex-col items-center justify-center"
                        style={{
                          transform: "translateZ(14px) rotateX(-30deg)",
                          boxShadow: "0 6px 10px rgba(0,0,0,0.48)",
                        }}
                      >
                        <div className="w-5 h-2 bg-slate-400 rounded-t-sm -mt-2 mb-1" />
                        <span className="text-[7px] font-mono font-bold text-slate-100">
                          {upper.includes("7805") ? "7805" : "Q"}
                        </span>
                      </div>
                    ) : is7Seg ? (
                      /* 7-Segment LED Module */
                      <div
                        className="w-10 h-14 rounded bg-slate-950 border border-slate-600 p-1 grid place-items-center"
                        style={{
                          transform: "translateZ(10px)",
                          boxShadow: "0 8px 14px rgba(0,0,0,0.5)",
                        }}
                      >
                        <svg viewBox="0 0 24 36" className="w-6 h-9">
                          {[
                            "M5 3 H19",
                            "M20 4 V16",
                            "M20 20 V32",
                            "M5 33 H19",
                            "M4 20 V32",
                            "M4 4 V16",
                            "M5 18 H19",
                          ].map((d, idx) => (
                            <path
                              key={idx}
                              d={d}
                              stroke={n.segments?.[idx] ? "#ef4444" : "#1e293b"}
                              strokeWidth="2.8"
                              strokeLinecap="round"
                            />
                          ))}
                        </svg>
                      </div>
                    ) : isInput ? (
                      /* Clickable Tactile Switch / Clock Module */
                      <div
                        className={`px-2 py-1.5 rounded-md border font-mono text-[8px] font-bold flex items-center gap-1 ${
                          n.isHigh
                            ? "bg-emerald-600 border-emerald-300 text-white"
                            : "bg-slate-800 border-slate-500 text-slate-200"
                        }`}
                        style={{
                          transform: "translateZ(12px)",
                          boxShadow: "0 6px 12px rgba(0,0,0,0.45)",
                        }}
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            n.isHigh ? "bg-emerald-200" : "bg-slate-500"
                          } ${
                            upper === "CLOCK" && pulseActive ? "spice-ic-heartbeat" : ""
                          }`}
                          style={{ "--spice-cycle-dur": nodeDur } as React.CSSProperties}
                        />
                        <span>{upper === "CLOCK" ? "CLK" : n.isHigh ? "ON" : "OFF"}</span>
                      </div>
                    ) : (
                      /* DIP Integrated Circuit / Logic Gate / Power Rail Terminal */
                      <div
                        className={`px-2.5 py-2 rounded border text-center relative ${
                          isSelected
                            ? "bg-[#0f172a] border-cyan-400"
                            : "bg-[#111827] border-slate-600"
                        }`}
                        style={{
                          transform: "translateZ(11px)",
                          boxShadow:
                            "0 8px 14px rgba(0,0,0,0.52), inset 0 1px 0 rgba(255,255,255,0.16)",
                        }}
                      >
                        <div className="text-[8px] font-mono font-bold text-slate-100 whitespace-nowrap">
                          {n.label}
                        </div>
                        {canAnimate && (n.isHigh || n.isConducting) && (
                          <span
                            className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-cyan-400 spice-ic-heartbeat"
                            style={{ "--spice-cycle-dur": nodeDur } as React.CSSProperties}
                          />
                        )}
                      </div>
                    )}

                    {/* Floating Component Callout on Hover or Select */}
                    {(isSelected || hoveredId === n.id) && (
                      <div
                        className="absolute left-1/2 -top-7 -translate-x-1/2 px-1.5 py-0.5 rounded bg-[#09101d]/95 border border-cyan-400/70 text-[8.5px] font-mono font-bold text-cyan-200 whitespace-nowrap pointer-events-none shadow-lg"
                        style={{ transform: "translateZ(26px)" }}
                      >
                        {n.label} · {n.voltageV.toFixed(1)}V
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
