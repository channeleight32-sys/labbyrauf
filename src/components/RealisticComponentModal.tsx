import React, { useState, useRef, useEffect } from "react";
import {
  X,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  FileText,
  Info,
  Layers,
  Sparkles,
  Zap,
  CheckCircle2,
  ExternalLink,
  Sliders,
  Copy,
  Download,
  Eye,
  AlertTriangle,
} from "lucide-react";
import {
  REALISTIC_COMPONENTS,
  RealisticComponentDef,
  calculateResistorColorBands,
} from "../data/realisticComponentsData";
import RealisticComponentRenderer from "./RealisticComponentRenderer";
import ThreeComponentInspector from "./ThreeComponentInspector";

interface RealisticComponentModalProps {
  isOpen: boolean;
  onClose: () => void;
  componentId?: string; // e.g. "RES_CARBON", "DIODE_1N4007", "IC_NE555", "BJT_BC547", etc.
  initialValue?: number;
  initialFormattedValue?: string;
  onUpdateValue?: (newVal: number, formatted: string) => void;
  onInsertToCanvas?: (componentId: string) => void;
}

export default function RealisticComponentModal({
  isOpen,
  onClose,
  componentId = "RES_CARBON",
  initialValue,
  initialFormattedValue,
  onUpdateValue,
  onInsertToCanvas,
}: RealisticComponentModalProps) {
  // Normalize component definition
  const compDef: RealisticComponentDef =
    REALISTIC_COMPONENTS[componentId] ||
    REALISTIC_COMPONENTS[
      Object.keys(REALISTIC_COMPONENTS).find(
        (k) =>
          k.toUpperCase() === componentId.toUpperCase() ||
          componentId.toUpperCase().includes(k.toUpperCase())
      ) || "RES_CARBON"
    ];

  // 3D Orbit & Inspection state
  const [rotX, setRotX] = useState<number>(15);
  const [rotY, setRotY] = useState<number>(-25);
  const [zoom, setZoom] = useState<number>(1.25);
  const [isAutoRotating, setIsAutoRotating] = useState<boolean>(true);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Visualization mode toggle: 3D WEBGL vs REAL COMPONENT 2D vs SCHEMATIC
  const [viewMode, setViewMode] = useState<"THREE_D" | "REALISTIC" | "SCHEMATIC">("THREE_D");

  // Selected terminal for pinout highlighting
  const [selectedTerminalName, setSelectedTerminalName] = useState<string | null>(null);

  // Editable value state
  const [currentValue, setCurrentValue] = useState<number>(
    initialValue ?? compDef?.defaultValues?.valueNumber ?? 1000
  );
  const [copiedDatasheet, setCopiedDatasheet] = useState<boolean>(false);

  // Sync internal state whenever the inspected component or initial value changes
  useEffect(() => {
    setCurrentValue(initialValue ?? compDef?.defaultValues?.valueNumber ?? 1000);
    setSelectedTerminalName(null);
    setCopiedDatasheet(false);
  }, [isOpen, componentId, initialValue, compDef?.id, compDef?.defaultValues?.valueNumber]);

  // Auto-rotation effect
  useEffect(() => {
    if (!isAutoRotating || !isOpen) return;
    const interval = setInterval(() => {
      setRotY((prev) => (prev + 1) % 360);
    }, 40);
    return () => clearInterval(interval);
  }, [isAutoRotating, isOpen]);

  if (!isOpen || !compDef) return null;

  const valueUnit = compDef.defaultValues?.valueUnit;
  const isResistorOrPot =
    compDef.category === "passives" &&
    (compDef.id.includes("RES") || compDef.id.includes("POT") || valueUnit === "Ω");
  const isCapacitor = compDef.category === "passives" && (compDef.id.includes("CAP") || valueUnit === "F");
  const isInductor = compDef.category === "passives" && (compDef.id.includes("IND") || valueUnit === "H");

  const formatComponentValue = (val: number): string => {
    if (isResistorOrPot) {
      if (val >= 1_000_000) return `${+(val / 1_000_000).toPrecision(3)} MΩ`;
      if (val >= 1000) return `${val >= 10000 ? +(val / 1000).toPrecision(3) : (val / 1000).toFixed(val % 1000 === 0 ? 0 : 1)} kΩ`;
      return `${Math.round(val)} Ω`;
    }
    if (isCapacitor) {
      if (val >= 1e-3) return `${+(val * 1e3).toPrecision(3)} mF`;
      if (val >= 1e-6) return `${+(val * 1e6).toPrecision(3)} µF`;
      if (val >= 1e-9) return `${+(val * 1e9).toPrecision(3)} nF`;
      return `${+(val * 1e12).toPrecision(3)} pF`;
    }
    if (isInductor) {
      if (val >= 1) return `${+val.toPrecision(3)} H`;
      if (val >= 1e-3) return `${+(val * 1e3).toPrecision(3)} mH`;
      return `${+(val * 1e6).toPrecision(3)} µH`;
    }
    return initialFormattedValue || compDef.defaultValues?.formattedValue || "";
  };

  const formattedDisplayValue = formatComponentValue(currentValue);

  // Pointer drag controls for 3D rotation
  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    setIsAutoRotating(false);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setRotY((prev) => prev + dx * 0.7);
    setRotX((prev) => Math.max(-80, Math.min(80, prev - dy * 0.7)));
    dragStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  const reset3DView = () => {
    setRotX(15);
    setRotY(-25);
    setZoom(1.25);
    setIsAutoRotating(false);
  };

  const handleCopySpecs = () => {
    const text = `${compDef.name} (${compDef.partNumber})
Manufacturer: ${compDef.manufacturer}
Package: ${compDef.packageDescription}
Datasheet Summary: ${compDef.datasheetSummary}
Absolute Maximum:
${compDef.absoluteMaximumRatings.map((r) => ` - ${r.label}: ${r.max || r.typical} ${r.unit || ""}`).join("\n")}
Typical Applications:
${compDef.typicalApplications.map((a) => ` - ${a}`).join("\n")}`;

    navigator.clipboard?.writeText(text);
    setCopiedDatasheet(true);
    setTimeout(() => setCopiedDatasheet(false), 2200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-5xl max-h-[92vh] bg-[#0b1020] border border-[#26365c] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-[#e6edf8]">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#26365c] bg-[#0f172a]/90">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white">{compDef.name}</h3>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700">
                  {compDef.partNumber}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {compDef.manufacturer}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {compDef.packageDescription}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* View Mode Segmented Control: 3D Three.js vs 2D Physical vs Schematic */}
            <div className="flex items-center bg-slate-900 border border-slate-700 rounded-xl p-1">
              <button
                type="button"
                onClick={() => setViewMode("THREE_D")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                  viewMode === "THREE_D"
                    ? "bg-cyan-500 text-slate-950 font-bold shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>3D WebGL</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("REALISTIC")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  viewMode === "REALISTIC"
                    ? "bg-cyan-500 text-slate-950 font-bold shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Physical 2D
              </button>
              <button
                type="button"
                onClick={() => setViewMode("SCHEMATIC")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  viewMode === "SCHEMATIC"
                    ? "bg-cyan-500 text-slate-950 font-bold shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Schematic (IEEE)
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body: Left = 3D / Realistic Stage, Right = Verified Datasheet Specifications */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-[#26365c]">
          {/* Left: Interactive 3D Orbit Stage */}
          <div className="lg:col-span-6 p-6 flex flex-col justify-between bg-gradient-to-b from-[#0b1020] to-[#070b14] relative">
            {viewMode === "THREE_D" ? (
              <div className="w-full h-80 sm:h-96">
                <ThreeComponentInspector
                  componentId={compDef.id}
                  selectedTerminalName={selectedTerminalName}
                  onSelectTerminal={setSelectedTerminalName}
                  className="w-full h-full"
                />
              </div>
            ) : (
              <>
                {/* Stage Controls Overlay */}
                <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-cyan-400 font-bold">
                      {viewMode === "REALISTIC" ? "AUTHENTIC 2D PACKAGE" : "IEEE 315 / IEC SYMBOL"}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>Drag to Rotate</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setIsAutoRotating(!isAutoRotating)}
                      className={`px-2.5 py-1 rounded text-[11px] font-mono border transition-colors cursor-pointer ${
                        isAutoRotating
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                          : "bg-slate-800 text-slate-400 border-slate-700 hover:text-white"
                      }`}
                    >
                      Auto-Rotate: {isAutoRotating ? "ON" : "OFF"}
                    </button>
                    <button
                      type="button"
                      onClick={reset3DView}
                      className="p-1 rounded bg-slate-800 text-slate-400 hover:text-white border border-slate-700 cursor-pointer"
                      title="Reset 3D Orientation"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setZoom((z) => Math.min(2.5, z + 0.2))}
                      className="p-1 rounded bg-slate-800 text-slate-400 hover:text-white border border-slate-700 cursor-pointer"
                      title="Zoom In"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setZoom((z) => Math.max(0.6, z - 0.2))}
                      className="p-1 rounded bg-slate-800 text-slate-400 hover:text-white border border-slate-700 cursor-pointer"
                      title="Zoom Out"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Interactive 3D Canvas / Viewport */}
                <div
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                  className="relative w-full h-72 sm:h-80 rounded-2xl border border-slate-800/80 bg-gradient-to-b from-[#0d1628] to-[#040810] flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing select-none shadow-inner"
                >
                  {/* Technical Blueprint Grid Background */}
                  <div
                    className="absolute inset-0 opacity-15 pointer-events-none"
                    style={{
                      backgroundImage:
                        "linear-gradient(to right, #38bdf8 1px, transparent 1px), linear-gradient(to bottom, #38bdf8 1px, transparent 1px)",
                      backgroundSize: "24px 24px",
                    }}
                  />

                  {/* 3D Transformed Component Model */}
                  <div
                    style={{
                      transform:
                        viewMode === "REALISTIC"
                          ? `perspective(800px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale(${zoom})`
                          : `scale(${zoom})`,
                      transition: isDragging ? "none" : "transform 0.15s ease-out",
                      transformStyle: "preserve-3d",
                    }}
                    className="w-56 h-36 flex items-center justify-center"
                  >
                    <RealisticComponentRenderer
                      type={compDef.id}
                      mode={viewMode === "REALISTIC" ? "REALISTIC" : "SCHEMATIC"}
                      width={240}
                      height={150}
                      value={currentValue}
                      formattedValue={formattedDisplayValue}
                      isConducting={true}
                      current_mA={18.5}
                    />
                  </div>

                  {/* Angle & Scale Overlay */}
                  <div className="absolute bottom-3 left-3 text-[10px] font-mono text-slate-500 bg-slate-900/80 px-2 py-1 rounded border border-slate-800 pointer-events-none">
                    Rot: ({rotX.toFixed(0)}°, {rotY.toFixed(0)}°) · Zoom: {(zoom * 100).toFixed(0)}%
                  </div>
                </div>
              </>
            )}

            {/* Terminal Pin Mapping Selector */}
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                <span className="text-cyan-300 font-bold">TERMINAL PIN CONFIGURATION ({compDef.terminals.length} PINS)</span>
                <span>Select Pin to Inspect</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {compDef.terminals.map((term) => {
                  const isSelected = selectedTerminalName === term.name;
                  return (
                    <button
                      key={term.name}
                      type="button"
                      onClick={() => setSelectedTerminalName(isSelected ? null : term.name)}
                      className={`p-2 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? "bg-cyan-500/20 border-cyan-400 text-white"
                          : "bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700"
                      }`}
                    >
                      <div className="text-[11px] font-mono font-bold text-cyan-300 truncate">
                        {term.label}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate mt-0.5">
                        {term.polarity || term.side}
                      </div>
                    </button>
                  );
                })}
              </div>

              {selectedTerminalName && (
                <div className="p-3 rounded-xl bg-slate-900/90 border border-cyan-500/40 text-xs font-mono space-y-1">
                  <div className="text-cyan-300 font-bold flex items-center justify-between">
                    <span>
                      Pin:{" "}
                      {compDef.terminals.find((t) => t.name === selectedTerminalName)?.label}
                    </span>
                    <span className="text-emerald-400">
                      Polarity:{" "}
                      {compDef.terminals.find((t) => t.name === selectedTerminalName)?.polarity || "Neutral"}
                    </span>
                  </div>
                  <p className="text-slate-300 font-sans text-xs">
                    {compDef.terminals.find((t) => t.name === selectedTerminalName)?.description}
                  </p>
                </div>
              )}
            </div>

            {/* Quick Value Tuner (for resistors, potentiometers, capacitors & inductors) */}
            {(isResistorOrPot || isCapacitor || isInductor) && (
              <div className="mt-4 p-3.5 rounded-xl bg-[#0d1628] border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-cyan-300 font-bold">
                    {isResistorOrPot
                      ? "LIVE VALUE EDITING & COLOR BANDS"
                      : isCapacitor
                      ? "CAPACITANCE TUNER (EIA MARKING)"
                      : "INDUCTANCE TUNER"}
                  </span>
                  <span className="text-emerald-400 font-bold">
                    {formattedDisplayValue}
                  </span>
                </div>

                {isResistorOrPot && (
                  <>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min={10}
                        max={100000}
                        step={10}
                        value={Math.min(100000, Math.max(10, currentValue))}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          setCurrentValue(val);
                          if (onUpdateValue) {
                            onUpdateValue(val, formatComponentValue(val));
                          }
                        }}
                        className="flex-1 accent-cyan-400 cursor-pointer"
                      />
                      <input
                        type="number"
                        min={1}
                        max={10000000}
                        value={Math.round(currentValue)}
                        onChange={(e) => {
                          const parsed = Number(e.target.value);
                          if (!Number.isFinite(parsed) || parsed <= 0) return;
                          const clamped = Math.min(10_000_000, Math.max(1, parsed));
                          setCurrentValue(clamped);
                          if (onUpdateValue) {
                            onUpdateValue(clamped, formatComponentValue(clamped));
                          }
                        }}
                        className="w-24 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-right text-xs font-mono text-white"
                      />
                    </div>
                    {/* Band Breakdown Display */}
                    {compDef.id.includes("RES") && (() => {
                      const b = calculateResistorColorBands(currentValue);
                      return (
                        <div className="flex items-center gap-2 text-[10px] font-mono pt-1 text-slate-400">
                          <span>Bands:</span>
                          <span className="px-1.5 py-0.5 rounded text-white" style={{ backgroundColor: b.band1.color }}>{b.band1.name}</span>
                          <span className="px-1.5 py-0.5 rounded text-white" style={{ backgroundColor: b.band2.color }}>{b.band2.name}</span>
                          <span className="px-1.5 py-0.5 rounded text-white" style={{ backgroundColor: b.band3.color }}>{b.band3.name}</span>
                          <span className="px-1.5 py-0.5 rounded text-slate-950 font-bold" style={{ backgroundColor: b.band4.color }}>{b.band4.name}</span>
                        </div>
                      );
                    })()}
                  </>
                )}

                {isCapacitor && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min={-10}
                        max={-2.5}
                        step={0.1}
                        value={Math.min(-2.5, Math.max(-10, Math.log10(Math.max(1e-12, currentValue))))}
                        onChange={(e) => {
                          const raw = Math.pow(10, Number(e.target.value));
                          const val = Number(raw.toPrecision(2));
                          setCurrentValue(val);
                          if (onUpdateValue) {
                            onUpdateValue(val, formatComponentValue(val));
                          }
                        }}
                        className="flex-1 accent-cyan-400 cursor-pointer"
                      />
                    </div>
                    <div className="flex flex-wrap gap-1.5 text-[10px] font-mono">
                      {[1e-10, 1e-8, 1e-7, 1e-6, 10e-6, 100e-6, 1000e-6].map((cVal) => (
                        <button
                          key={cVal}
                          type="button"
                          onClick={() => {
                            setCurrentValue(cVal);
                            if (onUpdateValue) onUpdateValue(cVal, formatComponentValue(cVal));
                          }}
                          className={`px-2 py-0.5 rounded border cursor-pointer ${
                            Math.abs(currentValue - cVal) < cVal * 0.05
                              ? "bg-cyan-500/20 border-cyan-400 text-cyan-200 font-bold"
                              : "bg-slate-900 border-slate-700 text-slate-300 hover:text-white"
                          }`}
                        >
                          {formatComponentValue(cVal)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {isInductor && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min={0.01}
                        max={100}
                        step={0.01}
                        value={Math.min(100, Math.max(0.01, currentValue * 1000))}
                        onChange={(e) => {
                          const val = Number(e.target.value) / 1000;
                          setCurrentValue(val);
                          if (onUpdateValue) {
                            onUpdateValue(val, formatComponentValue(val));
                          }
                        }}
                        className="flex-1 accent-cyan-400 cursor-pointer"
                      />
                      <span className="text-[11px] font-mono text-slate-400">mH</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 text-[10px] font-mono">
                      {[10e-6, 100e-6, 470e-6, 1e-3, 10e-3, 47e-3].map((lVal) => (
                        <button
                          key={lVal}
                          type="button"
                          onClick={() => {
                            setCurrentValue(lVal);
                            if (onUpdateValue) onUpdateValue(lVal, formatComponentValue(lVal));
                          }}
                          className={`px-2 py-0.5 rounded border cursor-pointer ${
                            Math.abs(currentValue - lVal) < lVal * 0.05
                              ? "bg-cyan-500/20 border-cyan-400 text-cyan-200 font-bold"
                              : "bg-slate-900 border-slate-700 text-slate-300 hover:text-white"
                          }`}
                        >
                          {formatComponentValue(lVal)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right: Comprehensive Verified Datasheet Specifications */}
          <div className="lg:col-span-6 p-6 space-y-5 overflow-y-auto">
            {/* Datasheet Overview */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-cyan-400 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-cyan-400" />
                  VERIFIED MANUFACTURER SPECIFICATION
                </span>
                <button
                  type="button"
                  onClick={handleCopySpecs}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  <Copy className="w-3 h-3" />
                  {copiedDatasheet ? "Copied!" : "Copy Specs"}
                </button>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed">
                {compDef.datasheetSummary}
              </p>
            </div>

            {/* Electrical Characteristics (Typical Operating Conditions) */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-mono font-bold text-emerald-400">
                RECOMMENDED OPERATING CONDITIONS (TYPICAL)
              </h4>
              <div className="border border-slate-800 rounded-xl overflow-hidden text-xs">
                <table className="w-full text-left font-mono">
                  <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="p-2.5">Parameter</th>
                      <th className="p-2.5">Typical Value</th>
                      <th className="p-2.5">Unit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 text-slate-200">
                    {compDef.electricalCharacteristics.map((spec, i) => (
                      <tr key={i} className="hover:bg-slate-900/40">
                        <td className="p-2.5 font-sans font-medium text-slate-300">{spec.label}</td>
                        <td className="p-2.5 text-emerald-400 font-bold">{spec.typical || spec.max}</td>
                        <td className="p-2.5 text-slate-400">{spec.unit || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Absolute Maximum Ratings */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-mono font-bold text-amber-400 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                ABSOLUTE MAXIMUM RATINGS (DO NOT EXCEED)
              </h4>
              <div className="border border-slate-800 rounded-xl overflow-hidden text-xs">
                <table className="w-full text-left font-mono">
                  <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="p-2.5">Limit Parameter</th>
                      <th className="p-2.5">Maximum Rating</th>
                      <th className="p-2.5">Unit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 text-slate-200">
                    {compDef.absoluteMaximumRatings.map((spec, i) => (
                      <tr key={i} className="hover:bg-slate-900/40">
                        <td className="p-2.5 font-sans font-medium text-slate-300">{spec.label}</td>
                        <td className="p-2.5 text-red-400 font-bold">{spec.max || spec.typical}</td>
                        <td className="p-2.5 text-slate-400">{spec.unit || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Key Governing Formulas */}
            {compDef.keyFormulas && compDef.keyFormulas.length > 0 && (
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5 font-mono text-xs">
                <div className="text-cyan-400 font-bold">GOVERNING CIRCUIT FORMULAS</div>
                {compDef.keyFormulas.map((f, i) => (
                  <div key={i} className="text-slate-200 bg-slate-950/60 p-2 rounded border border-slate-800/80">
                    <code>{f}</code>
                  </div>
                ))}
              </div>
            )}

            {/* Typical Applications */}
            <div className="space-y-2">
              <h4 className="text-xs font-mono font-bold text-slate-400">
                TYPICAL ENGINEERING APPLICATIONS
              </h4>
              <ul className="space-y-1.5 text-xs text-slate-300">
                {compDef.typicalApplications.map((app, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                    <span>{app}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Educational Laboratory Notes */}
            <div className="p-3.5 rounded-xl bg-cyan-950/20 border border-cyan-500/30 text-xs text-cyan-200 leading-relaxed">
              <strong>Laboratory Benchmark Note:</strong> {compDef.educationalNotes}
            </div>

            {/* Action Buttons */}
            {onInsertToCanvas && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    onInsertToCanvas(compDef.id);
                    onClose();
                  }}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 text-slate-950 font-bold text-sm hover:opacity-95 transition-opacity cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-cyan-950/50"
                >
                  <Zap className="w-4 h-4 fill-current" />
                  Place Component Into Workbench Canvas
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
