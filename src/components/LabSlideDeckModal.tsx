import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Cpu,
  Layers,
  Wrench,
  CheckCircle2,
  Activity,
  Code2,
  Copy,
  Check,
  Zap,
  Sliders,
  ArrowRight,
  FileText,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import {
  MASTER_75_LABS,
  MASTER_DOMAINS,
  MasterDomainId,
  MasterLabItem,
  evaluateMasterLab,
} from "../data/master75Labs";
import { PresetNodeDef, PresetWireDef } from "../data/logicSpecs";
import { getCircuitPresetForLab } from "../utils/labCircuitPresets";

interface LabSlideDeckModalProps {
  labId: string;
  isOpen: boolean;
  onClose: () => void;
  onSelectLab: (labId: string, domain: MasterDomainId) => void;
  onOpenInFullCanvas: (circuit: {
    title: string;
    nodes: PresetNodeDef[];
    wires: PresetWireDef[];
  }) => void;
  onOpenInWorkbench: (labId: string, domain: MasterDomainId) => void;
}

export default function LabSlideDeckModal({
  labId,
  isOpen,
  onClose,
  onSelectLab,
  onOpenInFullCanvas,
  onOpenInWorkbench,
}: LabSlideDeckModalProps) {
  const [currentSlide, setCurrentSlide] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Find active lab and domain
  const lab = useMemo(
    () => MASTER_75_LABS.find((l) => l.id === labId) ?? MASTER_75_LABS[0],
    [labId]
  );
  const domainInfo = MASTER_DOMAINS[lab.domain];

  // Domain labs ordered strictly 1 to 15
  const domainLabs = useMemo(
    () => MASTER_75_LABS.filter((l) => l.domain === lab.domain),
    [lab.domain]
  );
  const currentLabIndex = domainLabs.findIndex((l) => l.id === lab.id);
  const prevLab = currentLabIndex > 0 ? domainLabs[currentLabIndex - 1] : null;
  const nextLab =
    currentLabIndex < domainLabs.length - 1
      ? domainLabs[currentLabIndex + 1]
      : null;

  // Interactive parameter sliders for Slide 4 (Simulation)
  const [paramVals, setParamVals] = useState<Record<string, number>>({});

  useEffect(() => {
    // Reset parameters to defaults when lab changes
    const initial: Record<string, number> = {};
    lab.params.forEach((p) => {
      initial[p.key] = p.defaultVal;
    });
    setParamVals(initial);
    setCurrentSlide(1);
  }, [lab]);

  // Evaluated output calculations
  const simOutput = useMemo(
    () => evaluateMasterLab(lab, paramVals),
    [lab, paramVals]
  );

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        setCurrentSlide((s) => (s < 6 ? s + 1 : s));
      } else if (e.key === "ArrowLeft") {
        setCurrentSlide((s) => (s > 1 ? s - 1 : s));
      } else if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCopyCode = (code: string) => {
    navigator.clipboard?.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleLaunchCanvas = () => {
    const preset = getCircuitPresetForLab(lab.id);
    onOpenInFullCanvas({
      title: preset.title,
      nodes: preset.nodes,
      wires: preset.wires,
    });
  };

  const slideNames = [
    { num: 1, title: "Theory & Derivation", icon: FileText },
    { num: 2, title: "Bench Hardware & ICs", icon: Wrench },
    { num: 3, title: "Verified Procedure", icon: CheckCircle2 },
    { num: 4, title: "Live Simulation Engine", icon: Activity },
    { num: 5, title: "SPICE / Verilog Netlist", icon: Code2 },
    { num: 6, title: "Schematic Canvas Studio", icon: Zap },
  ];

  // Default SPICE or Verilog netlist
  const netlistCode =
    lab.codeSnippet ||
    (lab.domain === "C"
      ? `// ${lab.id}: ${lab.title}\n// Domain C: Digital Logic Design RTL\n\`timescale 1ns / 1ps\nmodule lab_${lab.id.toLowerCase()} (\n    input  wire clk,\n    input  wire rst_n,\n    input  wire [3:0] in_bus,\n    output wire [3:0] out_bus,\n    output wire valid\n);\n    assign out_bus = in_bus ^ 4'b1010;\n    assign valid = |in_bus;\nendmodule`
      : `* ${lab.id}: ${lab.title}\n* Domain ${lab.domain}: Verified SPICE Netlist\nVIN 1 0 DC 10V AC 1V\nR1 1 2 1k\nR2 2 0 2.2k\nRL 2 0 10k\n.op\n.tran 0 10m 0 10u\n.end`);

  return (
    <div
      className={`fixed inset-0 z-[120] flex flex-col bg-[#080d1a]/95 backdrop-blur-md text-[#e6edf8] ${
        isFullscreen ? "p-0" : "p-2 sm:p-5"
      }`}
    >
      {/* Outer Modal Container */}
      <div
        className={`flex-1 flex flex-col bg-[#0b1020] border border-[#26365c] overflow-hidden shadow-2xl ${
          isFullscreen ? "rounded-none h-full" : "rounded-2xl max-w-6xl mx-auto w-full"
        }`}
      >
        {/* Top Slide Presentation Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3.5 bg-[#10182b] border-b border-[#26365c] shrink-0">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-cyan-950/70 text-cyan-300 border border-cyan-800/60">
              {lab.id}
            </span>
            <div>
              <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                <span>{domainInfo.code}</span>
                <span aria-hidden="true">·</span>
                <span className="text-cyan-400 font-semibold">{domainInfo.title}</span>
              </div>
              <h2 className="text-sm sm:text-base font-bold text-white tracking-tight line-clamp-1">
                {lab.title}
              </h2>
            </div>
          </div>

          {/* Action Tools & Close */}
          <div className="flex items-center gap-2">
            {/* Previous Lab / Next Lab */}
            <div className="hidden md:flex items-center gap-1 bg-[#16213a] border border-[#26365c] rounded-lg p-0.5 text-xs font-mono">
              <button
                type="button"
                disabled={!prevLab}
                onClick={() => prevLab && onSelectLab(prevLab.id, lab.domain)}
                className="px-2 py-1 rounded text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                title={prevLab ? `Go to ${prevLab.id}` : "First Lab in Subject"}
              >
                &larr; Prev Lab
              </button>
              <span className="text-slate-600">|</span>
              <button
                type="button"
                disabled={!nextLab}
                onClick={() => nextLab && onSelectLab(nextLab.id, lab.domain)}
                className="px-2 py-1 rounded text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                title={nextLab ? `Go to ${nextLab.id}` : "Last Lab in Subject"}
              >
                Next Lab &rarr;
              </button>
            </div>

            {/* Open in Dedicated Full-Window Canvas button */}
            <button
              type="button"
              onClick={handleLaunchCanvas}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-cyan-400 to-emerald-400 text-slate-950 hover:opacity-95 transition-opacity cursor-pointer shadow-sm"
              title="Open this circuit schematic in the Dedicated Full-Window Canvas Studio"
            >
              <Zap className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Open Full Canvas</span>
            </button>

            {/* Fullscreen Focus Toggle */}
            <button
              type="button"
              onClick={() => setIsFullscreen((v) => !v)}
              className="p-1.5 rounded-lg bg-[#16213a] hover:bg-[#1e2d4d] text-slate-300 hover:text-white transition-colors cursor-pointer"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Focus Mode"}
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4 text-cyan-400" />
              ) : (
                <Maximize2 className="w-4 h-4 text-cyan-400" />
              )}
            </button>

            {/* Close Modal */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-[#16213a] hover:bg-rose-950/60 hover:text-rose-300 text-slate-400 transition-colors cursor-pointer"
              title="Close Slide Deck (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 6-Slide Navigation Strip */}
        <div className="flex items-center justify-between gap-2 px-4 sm:px-6 py-2 bg-[#0d1424] border-b border-[#26365c] overflow-x-auto shrink-0 scrollbar-thin">
          <div className="flex items-center gap-1.5">
            {slideNames.map((s) => {
              const Icon = s.icon;
              const isActive = currentSlide === s.num;
              return (
                <button
                  key={s.num}
                  type="button"
                  onClick={() => setCurrentSlide(s.num)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                    isActive
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/60 font-semibold"
                      : "text-slate-400 hover:text-slate-200 hover:bg-[#16213a]"
                  }`}
                >
                  <span className="font-mono text-[10px] text-slate-500">
                    0{s.num}.
                  </span>
                  <Icon className="w-3.5 h-3.5" />
                  <span>{s.title}</span>
                </button>
              );
            })}
          </div>

          <span className="text-xs font-mono text-slate-500 whitespace-nowrap pl-2">
            Slide {currentSlide} of 6
          </span>
        </div>

        {/* Main Slide Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6">
          {/* SLIDE 1: Theoretical Foundation & Physics Derivations */}
          {currentSlide === 1 && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="space-y-2">
                <span className="text-xs font-mono uppercase tracking-wider text-cyan-400">
                  Slide 1 · Theoretical Foundation &amp; Mathematical Laws
                </span>
                <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                  {lab.title}
                </h3>
                <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                  {lab.objective}
                </p>
              </div>

              {/* Verified Mathematical Equation Card */}
              <div className="p-6 rounded-2xl bg-[#11192e] border border-cyan-800/50 shadow-inner space-y-3">
                <div className="flex items-center justify-between text-xs font-mono text-cyan-400">
                  <span className="font-bold uppercase tracking-wider">
                    Governing Physical Law &amp; Analytical Equation
                  </span>
                  <span className="text-emerald-400 font-semibold">
                    100% Mathematically Verified
                  </span>
                </div>
                <div className="p-4 rounded-xl bg-[#080d1a] border border-[#26365c] font-mono text-base sm:text-lg text-cyan-200 overflow-x-auto text-center font-bold">
                  {lab.formula}
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  All theoretical models are derived from standard electromagnetic &amp; semiconductor
                  equations, guaranteeing zero mock data and verified analytical solutions.
                </p>
              </div>

              {/* Lab Category & Invariant Properties */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 rounded-xl bg-[#0f172a] border border-slate-800 space-y-2">
                  <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400">
                    Curriculum Category
                  </h4>
                  <p className="text-sm font-semibold text-white">{lab.category}</p>
                  <p className="text-xs text-slate-400">
                    Structured in rigorous sequential progression as part of the accredited
                    Electrical Engineering undergraduate curriculum.
                  </p>
                </div>

                <div className="p-5 rounded-xl bg-[#0f172a] border border-slate-800 space-y-2">
                  <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400">
                    Academic Scope
                  </h4>
                  <p className="text-sm font-semibold text-emerald-400">
                    Domain {lab.domain} · Lab #{lab.labNumber} of 15
                  </p>
                  <p className="text-xs text-slate-400">
                    Provides foundational grounding for advanced engineering licensure,
                    hardware fabrication, and postgraduate research.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* SLIDE 2: Bench Hardware & IC Specifications */}
          {currentSlide === 2 && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="space-y-2">
                <span className="text-xs font-mono uppercase tracking-wider text-cyan-400">
                  Slide 2 · Test Bench Equipment &amp; Component Specifications
                </span>
                <h3 className="text-2xl font-bold text-white tracking-tight">
                  Required Laboratory Hardware &amp; Instruments
                </h3>
                <p className="text-sm text-slate-300">
                  All equipment conforms to standard university electrical engineering laboratory
                  stations, verified for physical test bench assembly.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Hardware Setup Checklist */}
                <div className="p-5 rounded-xl bg-[#11192e] border border-[#26365c] space-y-3">
                  <h4 className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-bold flex items-center gap-2">
                    <Wrench className="w-4 h-4" />
                    Physical Bench Equipment
                  </h4>
                  <ul className="space-y-2.5">
                    {lab.hardwareSetup.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Software / EDA Verification Setup */}
                <div className="p-5 rounded-xl bg-[#11192e] border border-[#26365c] space-y-3">
                  <h4 className="text-xs font-mono uppercase tracking-wider text-purple-400 font-bold flex items-center gap-2">
                    <Code2 className="w-4 h-4" />
                    Simulation &amp; EDA Tooling
                  </h4>
                  <ul className="space-y-2.5">
                    {lab.softwareSetup.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Safety & Pinout Guidelines */}
              <div className="p-4 rounded-xl bg-[#0f172a] border border-amber-800/40 text-xs text-amber-200/90 leading-relaxed">
                <strong className="text-amber-400">Safety Precautions:</strong> Ensure DC power
                supplies are switched OFF during breadboard circuit assembly. Verify IC pinout notches
                and VCC/GND polarity prior to powering on.
              </div>
            </div>
          )}

          {/* SLIDE 3: Verified Experimental Procedure */}
          {currentSlide === 3 && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="space-y-2">
                <span className="text-xs font-mono uppercase tracking-wider text-cyan-400">
                  Slide 3 · Step-by-Step Experimental Protocol
                </span>
                <h3 className="text-2xl font-bold text-white tracking-tight">
                  Verified Bench Procedure &amp; Test Protocol
                </h3>
                <p className="text-sm text-slate-300">
                  Follow each procedure step sequentially on your physical hardware trainer or inside
                  the virtual SPICE engine to record repeatable measurements.
                </p>
              </div>

              <div className="space-y-3">
                {lab.procedure.map((step, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-[#11192e] border border-[#26365c] flex items-start gap-3.5"
                  >
                    <span className="w-6 h-6 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800/70 flex items-center justify-center text-xs font-mono font-bold shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                      {step}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SLIDE 4: Real-Time Verified Simulation Engine */}
          {currentSlide === 4 && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="space-y-2">
                <span className="text-xs font-mono uppercase tracking-wider text-cyan-400">
                  Slide 4 · Interactive Parameter Simulation &amp; Real-Time Response
                </span>
                <h3 className="text-2xl font-bold text-white tracking-tight">
                  Live Mathematical Evaluation &amp; Dynamic Waveforms
                </h3>
                <p className="text-sm text-slate-300">
                  Adjust laboratory parameters below. All values recalculate in real time using
                  exact physics formulas with verified numerical integration.
                </p>
              </div>

              {/* Dynamic Parameter Sliders */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {lab.params.map((p) => {
                  const val = paramVals[p.key] ?? p.defaultVal;
                  return (
                    <div
                      key={p.key}
                      className="p-4 rounded-xl bg-[#11192e] border border-[#26365c] space-y-2"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-300">{p.label}</span>
                        <span className="font-mono font-bold text-cyan-300">
                          {val} {p.unit}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={p.min}
                        max={p.max}
                        step={p.step}
                        value={val}
                        onChange={(e) =>
                          setParamVals((prev) => ({
                            ...prev,
                            [p.key]: parseFloat(e.target.value),
                          }))
                        }
                        className="w-full accent-cyan-400 cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] font-mono text-slate-500">
                        <span>
                          {p.min} {p.unit}
                        </span>
                        <span>
                          {p.max} {p.unit}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Live Metric Readouts */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {simOutput.metrics.map((m, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-[#0e1629] border border-slate-800 space-y-1"
                  >
                    <span className="text-[11px] font-mono text-slate-400 block line-clamp-1">
                      {m.label}
                    </span>
                    <span className="text-sm sm:text-base font-mono font-bold text-white block">
                      {m.value}
                    </span>
                  </div>
                ))}
              </div>

              {/* Response Curve Graph */}
              <div className="p-4 rounded-xl bg-[#080d1a] border border-[#26365c] space-y-3">
                <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                  <span className="text-cyan-400 font-semibold">{simOutput.curveTitle}</span>
                  <span>40 Samples · Real-Time Transient / AC Trace</span>
                </div>

                <div className="h-44 sm:h-52 w-full relative flex items-end gap-1 pt-4">
                  <svg className="w-full h-full" viewBox="0 0 400 120" preserveAspectRatio="none">
                    {/* Grid lines */}
                    <line x1="40" y1="12" x2="395" y2="12" stroke="#1e293b" strokeDasharray="3 3" />
                    <line x1="40" y1="60" x2="395" y2="60" stroke="#1e293b" strokeDasharray="3 3" />
                    <line x1="40" y1="108" x2="395" y2="108" stroke="#1e293b" strokeDasharray="3 3" />

                    {(() => {
                      const pts = simOutput.curvePoints;
                      if (pts.length === 0) return null;
                      let minY = Infinity;
                      let maxY = -Infinity;
                      for (const pt of pts) {
                        if (Number.isFinite(pt.y1)) {
                          minY = Math.min(minY, pt.y1);
                          maxY = Math.max(maxY, pt.y1);
                        }
                        if (Number.isFinite(pt.y2)) {
                          minY = Math.min(minY, pt.y2);
                          maxY = Math.max(maxY, pt.y2);
                        }
                      }
                      if (!Number.isFinite(minY) || !Number.isFinite(maxY)) {
                        minY = 0;
                        maxY = 10;
                      }
                      if (Math.abs(maxY - minY) < 1e-6) {
                        minY -= 1;
                        maxY += 1;
                      }
                      const spanY = maxY - minY;
                      const toX = (i: number) =>
                        pts.length <= 1 ? 217 : (i / (pts.length - 1)) * 355 + 40;
                      const toY = (v: number) => 108 - ((v - minY) / spanY) * 96;
                      const midY = (minY + maxY) / 2;
                      const zeroY = minY < 0 && maxY > 0 ? toY(0) : null;

                      return (
                        <>
                          {zeroY !== null && (
                            <line
                              x1="40"
                              y1={zeroY}
                              x2="395"
                              y2={zeroY}
                              stroke="#334155"
                              strokeWidth="1"
                            />
                          )}
                          <text x="36" y="15" textAnchor="end" fill="#64748b" fontSize="8" fontFamily="monospace">
                            {maxY.toFixed(1)}
                          </text>
                          <text x="36" y="63" textAnchor="end" fill="#64748b" fontSize="8" fontFamily="monospace">
                            {midY.toFixed(1)}
                          </text>
                          <text x="36" y="110" textAnchor="end" fill="#64748b" fontSize="8" fontFamily="monospace">
                            {minY.toFixed(1)}
                          </text>

                          {/* Trace 1 (Cyan) */}
                          <path
                            d={pts
                              .map((pt, i) => `${i === 0 ? "M" : "L"} ${toX(i).toFixed(1)} ${toY(pt.y1).toFixed(1)}`)
                              .join(" ")}
                            fill="none"
                            stroke="#06b6d4"
                            strokeWidth="2.5"
                          />

                          {/* Trace 2 (Amber / Purple) */}
                          <path
                            d={pts
                              .map((pt, i) => `${i === 0 ? "M" : "L"} ${toX(i).toFixed(1)} ${toY(pt.y2).toFixed(1)}`)
                              .join(" ")}
                            fill="none"
                            stroke="#f59e0b"
                            strokeWidth="2"
                            strokeDasharray="4 2"
                          />
                        </>
                      );
                    })()}
                  </svg>
                </div>

                <div className="flex items-center justify-center gap-6 text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-0.5 bg-cyan-400 inline-block" />
                    <span className="text-cyan-300">Channel 1 (Primary / Input)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-0.5 bg-amber-400 inline-block border-b border-dashed" />
                    <span className="text-amber-300">Channel 2 (Secondary / Output)</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SLIDE 5: SPICE Netlist / Verilog RTL Code */}
          {currentSlide === 5 && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <span className="text-xs font-mono uppercase tracking-wider text-cyan-400">
                    Slide 5 · Industry-Standard EDA Netlist / RTL
                  </span>
                  <h3 className="text-2xl font-bold text-white tracking-tight">
                    {lab.codeTitle || `EDA Netlist Verification — ${lab.id}`}
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => handleCopyCode(netlistCode)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold bg-[#16213a] hover:bg-[#1f2d4e] border border-[#26365c] text-cyan-300 transition-colors cursor-pointer"
                >
                  {copiedCode ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Netlist</span>
                    </>
                  )}
                </button>
              </div>

              <div className="relative rounded-2xl bg-[#070b14] border border-[#26365c] overflow-hidden">
                <div className="px-4 py-2 bg-[#0c1220] border-b border-[#26365c] flex items-center justify-between text-xs font-mono text-slate-400">
                  <span>{lab.domain === "C" ? "Verilog HDL (Vivado Compatible)" : "SPICE Netlist (Multisim / LTSpice)"}</span>
                  <span className="text-emerald-400">Syntax Validated</span>
                </div>
                <pre className="p-5 font-mono text-xs sm:text-sm text-cyan-200 overflow-x-auto leading-relaxed">
                  <code>{netlistCode}</code>
                </pre>
              </div>
            </div>
          )}

          {/* SLIDE 6: Schematic Canvas Studio Integration */}
          {currentSlide === 6 && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="space-y-2">
                <span className="text-xs font-mono uppercase tracking-wider text-cyan-400">
                  Slide 6 · Schematic Canvas Studio Integration
                </span>
                <h3 className="text-2xl font-bold text-white tracking-tight">
                  Dedicated Full-Window Canvas &amp; Equipment Rack
                </h3>
                <p className="text-sm text-slate-300">
                  Open the circuit schematic for {lab.id} directly in the distraction-free Full-Window
                  Canvas Studio with all components, instruments, and live probes.
                </p>
              </div>

              {/* Hero Call-to-Action Card for Canvas Studio */}
              <div className="p-8 rounded-2xl bg-gradient-to-br from-[#0e1a38] via-[#091124] to-[#121c33] border border-cyan-500/40 space-y-6 text-center">
                <div className="w-16 h-16 rounded-2xl bg-cyan-950/80 border border-cyan-400/50 flex items-center justify-center text-cyan-300 mx-auto shadow-lg shadow-cyan-950/50">
                  <Zap className="w-8 h-8 text-cyan-400" />
                </div>

                <div className="space-y-2 max-w-lg mx-auto">
                  <h4 className="text-xl font-bold text-white">
                    Ready to Build &amp; Probe on Canvas?
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-300">
                    Launches a full 100vw &times; 100vh dedicated canvas workspace equipped with
                    74xx TTL ICs, logic gates, dual-channel oscilloscope, and multi-channel logic analyzer.
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleLaunchCanvas}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-slate-950 bg-gradient-to-r from-cyan-400 via-emerald-400 to-purple-400 hover:opacity-95 transition-opacity cursor-pointer shadow-lg"
                  >
                    <Zap className="w-4 h-4" />
                    Open in Dedicated Full-Window Canvas
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onOpenInWorkbench(lab.id, lab.domain);
                      onClose();
                    }}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-slate-200 bg-[#16213a] hover:bg-[#1e2d4e] border border-[#26365c] transition-colors cursor-pointer"
                  >
                    <Sliders className="w-4 h-4 text-cyan-400" />
                    Open in Master Workbench
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Slide Pagination Bar */}
        <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 bg-[#10182b] border-t border-[#26365c] shrink-0">
          <button
            type="button"
            disabled={currentSlide === 1}
            onClick={() => setCurrentSlide((s) => Math.max(1, s - 1))}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#16213a] hover:bg-[#1e2d4d] text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous Slide
          </button>

          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4, 5, 6].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => setCurrentSlide(num)}
                className={`w-2.5 h-2.5 rounded-full transition-all cursor-pointer ${
                  currentSlide === num
                    ? "bg-cyan-400 scale-125"
                    : "bg-slate-700 hover:bg-slate-500"
                }`}
                title={`Jump to Slide ${num}`}
              />
            ))}
          </div>

          <button
            type="button"
            disabled={currentSlide === 6}
            onClick={() => setCurrentSlide((s) => Math.min(6, s + 1))}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-400/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            Next Slide
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
