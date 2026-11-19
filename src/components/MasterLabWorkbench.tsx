import React, { useState, useMemo, useEffect } from "react";
import {
  Search,
  X,
  Cpu,
  Wrench,
  Code2,
  CheckCircle2,
  Sliders,
  Activity,
  RotateCcw,
  Copy,
  Check,
  Layers,
  ArrowUpRight,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Zap,
  FileText,
} from "lucide-react";
import {
  MASTER_75_LABS,
  MASTER_DOMAINS,
  RECOMMENDED_LAB_SETUP,
  MasterDomainId,
  MasterLabItem,
  evaluateMasterLab,
} from "../data/master75Labs";
import { ActiveTabId } from "./CurriculumGuide";
import { PresetNodeDef, PresetWireDef } from "../data/logicSpecs";
import {
  getCircuitPresetForLab,
  getInteractiveProjectIdForLab,
} from "../utils/labCircuitPresets";
import { type KnowledgeCheckRecord } from "../utils/workspaceStore";

interface MasterLabWorkbenchProps {
  fixedDomain?: MasterDomainId;
  externalLabId?: string;
  onSelectLab?: (labId: string) => void;
  onLaunchInteractiveBuilder?: (labId?: string) => void;
  onNavigateTab?: (tab: ActiveTabId, labId?: string) => void;
  onOpenSchematicProject?: (projectId: string) => void;
  onOpenSlideDeck?: (labId: string, domain: MasterDomainId) => void;
  onOpenFullCanvas?: (circuit: {
    title: string;
    nodes: PresetNodeDef[];
    wires: PresetWireDef[];
  }) => void;
  completedLabsExternal?: Record<string, boolean>;
  onToggleLabCompleteExternal?: (labId: string, completed: boolean) => void;
  knowledgeChecks?: Record<string, KnowledgeCheckRecord>;
  onOpenKnowledgeCheck?: (labId: string) => void;
}

function getDefaultCodeSnippet(lab: MasterLabItem, vals: Record<string, number>): {
  title: string;
  code: string;
} {
  if (lab.codeSnippet && lab.codeTitle) {
    return { title: lab.codeTitle, code: lab.codeSnippet };
  }
  const p1 = vals.p1 ?? lab.params[0]?.defaultVal ?? 10;
  const p2 = vals.p2 ?? lab.params[1]?.defaultVal ?? 10;
  const p3 = vals.p3 ?? lab.params[2]?.defaultVal ?? 10;

  if (lab.domain === "A") {
    return {
      title: `LTSpice / Multisim Netlist — ${lab.id}: ${lab.title}`,
      code: `* ${lab.id}: ${lab.title}
* Domain A: Electronics Network Analysis
* Hardware: DSO 100MHz, Function Gen 3MHz, Dual DC Supply, LCR Meter
VS 1 0 DC ${p1} AC 10
R1 1 2 ${p2}
R2 2 0 ${p3}
RL 2 0 ${Math.max(10, Math.round((p2 + p3) / 2))}
.op
.tran 0 20m 0 50u
.ac dec 50 10 1Meg
.end`,
    };
  }
  if (lab.domain === "B") {
    return {
      title: `NI Multisim / PSpice Macro Netlist — ${lab.id}: ${lab.title}`,
      code: `* ${lab.id}: ${lab.title}
* Domain B: Linear Integrated Circuits (Op-Amp / 555 / PLL)
VCC 10 0 DC 15V
VEE 11 0 DC -15V
VIN 1 0 SIN(0 ${p3} 1k) AC 1
RIN 1 2 ${p1}k
RF 2 3 ${p2}k
XOP 0 2 10 11 3 UA741
.tran 0 5m 0 10u
.ac dec 50 1 1Meg
.end`,
    };
  }
  if (lab.domain === "C") {
    return {
      title: `Xilinx Vivado Verilog RTL & Testbench — ${lab.id}: ${lab.title}`,
      code: `// ${lab.id}: ${lab.title}
// Domain C: Digital Logic Design (FPGA / TTL 74LSxx Verification)
\`timescale 1ns / 1ps
module dld_lab_${lab.id.toLowerCase()} (
    input  wire       clk,
    input  wire       rst_n,
    input  wire [3:0] a_in,
    input  wire [3:0] b_in,
    output wire [3:0] y_out,
    output wire       flag_out
);
    assign {flag_out, y_out} = a_in + b_in;
endmodule`,
    };
  }
  if (lab.domain === "D") {
    return {
      title: `PSIM / MATLAB Simulink Script — ${lab.id}: ${lab.title}`,
      code: `% ${lab.id}: ${lab.title}
% Domain D: Power Electronics Converter & Drive Verification
alpha_deg = ${p1};          % Firing Angle / Control Parameter
V_supply  = ${p2};          % Input Supply Voltage (V)
R_load    = ${p3};          % Load Parameter (Ohms)
alpha_rad = deg2rad(min(170, alpha_deg));
V_dc_avg  = (V_supply * 0.9) * cos(alpha_rad / 2);
I_dc_avg  = V_dc_avg / max(1, R_load);
fprintf('${lab.id}: V_dc = %.2f V, I_dc = %.2f A\\n', V_dc_avg, I_dc_avg);`,
    };
  }
  return {
    title: `LTSpice / Proteus SPICE Deck — ${lab.id}: ${lab.title}`,
    code: `* ${lab.id}: ${lab.title}
* Domain E: Electronic Devices & Circuits (EDC)
VCC 1 0 DC ${p1}V
R_BIAS 1 2 ${p2}
R_LOAD 2 0 ${p3}
D1 1 2 1N4007
.model 1N4007 D(Is=1e-12 N=1.75 BV=1000 IBV=1e-4)
.op
.dc VCC 0 ${p1} 0.2
.end`,
  };
}

export default function MasterLabWorkbench({
  fixedDomain,
  externalLabId,
  onSelectLab,
  onLaunchInteractiveBuilder,
  onNavigateTab,
  onOpenSchematicProject,
  onOpenSlideDeck,
  onOpenFullCanvas,
  completedLabsExternal,
  onToggleLabCompleteExternal,
  knowledgeChecks,
  onOpenKnowledgeCheck,
}: MasterLabWorkbenchProps) {
  const [selectedDomain, setSelectedDomain] = useState<MasterDomainId | "ALL">(
    fixedDomain ?? "ALL"
  );
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showSetupMatrix, setShowSetupMatrix] = useState<boolean>(false);

  // Default selected lab based on fixedDomain or externalLabId
  const initialLab = useMemo(() => {
    if (externalLabId) {
      const foundExt = MASTER_75_LABS.find((l) => l.id === externalLabId);
      if (foundExt) return foundExt;
    }
    if (fixedDomain) {
      return (
        MASTER_75_LABS.find((l) => l.domain === fixedDomain) ?? MASTER_75_LABS[0]
      );
    }
    return MASTER_75_LABS[0];
  }, [fixedDomain, externalLabId]);

  const [selectedLabId, setSelectedLabId] = useState<string>(initialLab.id);

  useEffect(() => {
    if (fixedDomain) {
      setSelectedDomain(fixedDomain);
    }
  }, [fixedDomain]);

  useEffect(() => {
    if (externalLabId) {
      const target = MASTER_75_LABS.find((l) => l.id === externalLabId);
      if (target) {
        setSelectedLabId(target.id);
        if (!fixedDomain && selectedDomain !== "ALL" && selectedDomain !== target.domain) {
          setSelectedDomain(target.domain);
        }
      }
    }
  }, [externalLabId, fixedDomain]);

  const handleSelectLabId = (id: string) => {
    setSelectedLabId(id);
    if (onSelectLab) {
      onSelectLab(id);
    }
  };

  const [customParams, setCustomParams] = useState<
    Record<string, Record<string, number>>
  >({});
  const [completedLabsLocal, setCompletedLabsLocal] = useState<Record<string, boolean>>(
    {}
  );
  const completedLabs = completedLabsExternal ?? completedLabsLocal;
  const [checkedSteps, setCheckedSteps] = useState<Record<string, boolean>>({});
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Filter labs
  const filteredLabs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return MASTER_75_LABS.filter((lab) => {
      if (selectedDomain !== "ALL" && lab.domain !== selectedDomain) {
        return false;
      }
      if (categoryFilter !== "ALL" && lab.category !== categoryFilter) {
        return false;
      }
      if (!q) return true;
      return (
        lab.id.toLowerCase().includes(q) ||
        lab.title.toLowerCase().includes(q) ||
        lab.objective.toLowerCase().includes(q) ||
        lab.hardwareSetup.some((h) => h.toLowerCase().includes(q)) ||
        lab.softwareSetup.some((s) => s.toLowerCase().includes(q))
      );
    });
  }, [selectedDomain, categoryFilter, searchQuery]);

  const activeLab = useMemo(() => {
    const found = filteredLabs.find((l) => l.id === selectedLabId);
    if (found) return found;
    return filteredLabs[0] ?? initialLab;
  }, [filteredLabs, selectedLabId, initialLab]);

  const activeLabParams = useMemo(() => {
    const saved = customParams[activeLab.id] ?? {};
    const merged: Record<string, number> = {};
    for (const p of activeLab.params) {
      merged[p.key] = saved[p.key] ?? p.defaultVal;
    }
    return merged;
  }, [activeLab, customParams]);

  const updateParam = (key: string, val: number) => {
    setCustomParams((prev) => ({
      ...prev,
      [activeLab.id]: {
        ...(prev[activeLab.id] ?? {}),
        [key]: val,
      },
    }));
  };

  const resetActiveParams = () => {
    setCustomParams((prev) => {
      const next = { ...prev };
      delete next[activeLab.id];
      return next;
    });
  };

  const evalData = useMemo(
    () => evaluateMasterLab(activeLab, activeLabParams),
    [activeLab, activeLabParams]
  );

  // Live 5-Point Parametric Sweep Observations Table around active p1 parameter
  const sweepObservations = useMemo(() => {
    const primaryParam = activeLab.params[0];
    if (!primaryParam) return [];
    const span = primaryParam.max - primaryParam.min;
    return [0.15, 0.35, 0.55, 0.75, 0.95].map((frac, idx) => {
      const sweptVal = Number(
        (primaryParam.min + span * frac).toFixed(primaryParam.step < 1 ? 2 : 1)
      );
      const res = evaluateMasterLab(activeLab, {
        ...activeLabParams,
        [primaryParam.key]: sweptVal,
      });
      return {
        run: idx + 1,
        paramLabel: `${primaryParam.label} (${primaryParam.unit})`,
        paramValue: sweptVal,
        metrics: res.metrics,
      };
    });
  }, [activeLab, activeLabParams]);

  const domainVivaQuestions = useMemo(() => {
    const t = activeLab.title;
    if (activeLab.domain === "A") {
      return [
        {
          q: `How do KVL, KCL, or Maximum Power Transfer apply to "${t}"?`,
          a: `Set load resistance equal to Thevenin equivalent impedance (Z_L = Z_th*) for maximum active power transfer; verify node voltages satisfy ∑I = 0.`,
        },
        {
          q: `Why does oscilloscope loading or source internal impedance alter bench measurements?`,
          a: `Standard 1x probes add shunt capacitance (~100 pF) and bench function generators have 50 Ω output impedance that forms a voltage divider with low-impedance loads.`,
        },
      ];
    }
    if (activeLab.domain === "B") {
      return [
        {
          q: `What limits bandwidth and slew-rate distortion in "${t}"?`,
          a: `Gain-Bandwidth Product (GBWP ≈ 1 MHz on LM741) compresses closed-loop -3dB bandwidth as gain rises, while SR ≈ 0.5 V/µs clips high-amplitude high-frequency sine waves.`,
        },
        {
          q: `Why is virtual short (V+ ≈ V−) valid only under negative feedback?`,
          a: `High open-loop gain drives the differential input toward zero only when negative feedback stabilizes the operating point inside the linear active region.`,
        },
      ];
    }
    if (activeLab.domain === "C") {
      return [
        {
          q: `How do you prevent setup/hold timing violations or glitches in "${t}"?`,
          a: `Synchronize state transitions to a single clean clock edge, include hazard-cover prime implicants in combinational K-Maps, and debounce mechanical switches.`,
        },
        {
          q: `How does FPGA / Verilog RTL synthesis compare against 74LSxx discrete breadboard testing?`,
          a: `74LS TTL exhibits ~9–15 ns gate propagation delay and requires 0.1 µF decoupling per DIP IC, whereas FPGA LUTs implement combinational equations in sub-nanosecond fabric.`,
        },
      ];
    }
    if (activeLab.domain === "D") {
      return [
        {
          q: `How do switching frequency and duty cycle/firing angle govern ripple and efficiency in "${t}"?`,
          a: `Higher PWM frequency shrinks inductor ΔI_L and output capacitor ΔV_C ripple while trading off MOSFET switching and gate-drive losses.`,
        },
        {
          q: `Why must freewheeling diodes and isolated gate drivers be used with inductive loads?`,
          a: `Inductive kickback (L·di/dt) destroys switches on turn-off without a fast Schottky/recovery freewheeling path, and floating high-side FETs need bootstrap/isolated drives.`,
        },
      ];
    }
    return [
      {
        q: `How do Q-point bias stability and temperature drift affect "${t}"?`,
        a: `Voltage-divider bias with emitter degeneration resistor R_E stabilizes I_C against β variations and ΔV_BE/ΔT (-2 mV/°C).`,
      },
      {
        q: `What causes asymmetrical clipping on an amplifier output waveform?`,
        a: `An off-center Q-point hits either saturation (V_CE ≈ 0.2V) or cutoff (I_C = 0) prematurely when peak AC swing exceeds DC headroom.`,
      },
    ];
  }, [activeLab.domain, activeLab.title]);

  const codeBlock = useMemo(
    () => getDefaultCodeSnippet(activeLab, activeLabParams),
    [activeLab, activeLabParams]
  );

  const handleCopyCode = () => {
    navigator.clipboard.writeText(codeBlock.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 1800);
  };

  const toggleLabComplete = (id: string) => {
    const nextState = !completedLabs[id];
    if (onToggleLabCompleteExternal) {
      onToggleLabCompleteExternal(id, nextState);
    } else {
      setCompletedLabsLocal((prev) => ({ ...prev, [id]: nextState }));
    }
  };

  const toggleStepCheck = (stepKey: string) => {
    setCheckedSteps((prev) => ({ ...prev, [stepKey]: !prev[stepKey] }));
  };

  // Compute SVG Plot path
  const svgChart = useMemo(() => {
    const pts = evalData.curvePoints;
    if (!pts.length) return { path1: "", path2: "", maxAbsY: 1 };
    let maxAbsY = 1;
    for (const p of pts) {
      maxAbsY = Math.max(maxAbsY, Math.abs(p.y1), Math.abs(p.y2));
    }
    const w = 540;
    const h = 190;
    const padX = 36;
    const padY = 20;
    const plotW = w - padX * 2;
    const plotH = h - padY * 2;
    const midY = padY + plotH / 2;

    const toXY = (idx: number, val: number) => {
      const x = padX + (idx / Math.max(1, pts.length - 1)) * plotW;
      const y = midY - (val / maxAbsY) * (plotH * 0.45);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    };

    const path1 =
      "M " + pts.map((p, idx) => toXY(idx, p.y1)).join(" L ");
    const path2 =
      "M " + pts.map((p, idx) => toXY(idx, p.y2)).join(" L ");

    return { path1, path2, maxAbsY, midY };
  }, [evalData]);

  const activeDomainInfo = MASTER_DOMAINS[activeLab.domain];
  const completedCount = Object.values(completedLabs).filter(Boolean).length;

  return (
    <div className="space-y-6">
      {/* Top Banner: Master 75 Labs Overview & Recommended Hardware/Software Setup Toggle */}
      <div className="bg-gradient-to-br from-[#0f182c] via-[#0b1120] to-[#131d36] border border-[#26365c] rounded-2xl p-5 sm:p-6 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1.5 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-cyan-400">
              <span className="px-2 py-0.5 rounded bg-cyan-500/15 border border-cyan-500/30 font-bold">
                {fixedDomain
                  ? `${MASTER_DOMAINS[fixedDomain].code} · COMPLETE CURRICULUM`
                  : "MASTER LAB LIST · 75 LABS ACROSS 5 SUBJECTS"}
              </span>
              <span>·</span>
              <span className="text-slate-300">
                BASIC TO ADVANCED + EDA / FPGA / PCB SIMULATION
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              {fixedDomain
                ? `${MASTER_DOMAINS[fixedDomain].title} — 15 Interactive Labs & Setup`
                : "Master Electronics Engineering Lab Workbench (75 Labs · 5 Core Subjects)"}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {fixedDomain
                ? MASTER_DOMAINS[fixedDomain].subtitle
                : "Complete interactive laboratory workbench covering Electronics Network Analysis (15 Labs), Linear Integrated Circuits (15 Labs), Digital Logic Design (15 Labs), Power Electronics (15 Labs), and Electronic Devices & Circuits (15 Labs) with full hardware bench and EDA simulation setups."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setShowSetupMatrix((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-cyan-500/30 transition-colors cursor-pointer"
            >
              <Wrench className="w-3.5 h-3.5" />
              {showSetupMatrix
                ? "Hide Recommended Lab Setup"
                : "Show Hardware & Software Setup"}
            </button>

            {/* Open 6-Slide Presentation Page */}
            {onOpenSlideDeck && (
              <button
                type="button"
                onClick={() => onOpenSlideDeck(activeLab.id, activeLab.domain)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#16213a] hover:bg-[#1e2d4d] text-cyan-300 border border-[#26365c] transition-colors cursor-pointer"
                title="Open interactive 6-slide study presentation for this lab"
              >
                <FileText className="w-3.5 h-3.5" />
                Slide Deck Focus
              </button>
            )}

            {/* Open in Dedicated Full-Window Canvas */}
            {onOpenFullCanvas && (
              <button
                type="button"
                onClick={() => {
                  const preset = getCircuitPresetForLab(activeLab.id);
                  onOpenFullCanvas({
                    title: preset.title,
                    nodes: preset.nodes,
                    wires: preset.wires,
                  });
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-400/50 transition-colors cursor-pointer"
                title="Open this lab's circuit in the Dedicated Full-Window Canvas"
              >
                <Zap className="w-3.5 h-3.5 text-cyan-400" />
                Full-Window Canvas
              </button>
            )}

            {(onNavigateTab || onOpenSchematicProject) && (
              <button
                type="button"
                onClick={() => {
                  const projectId = getInteractiveProjectIdForLab(activeLab.id);
                  if (onOpenSchematicProject) {
                    onOpenSchematicProject(projectId);
                  } else if (onNavigateTab) {
                    onNavigateTab("schematics", activeLab.id);
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-400/50 transition-colors cursor-pointer"
                title="Open Synchronized Interactive Electrical Schematic (IEEE 315 / Hardware / Simulation)"
              >
                <FileText className="w-3.5 h-3.5 text-purple-400" />
                Synchronized Schematic (IEEE 315)
              </button>
            )}

            {onLaunchInteractiveBuilder && (
              <button
                type="button"
                onClick={() => onLaunchInteractiveBuilder(activeLab.id)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-400 to-emerald-400 text-slate-950 hover:opacity-95 transition-opacity cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5" />
                Open Drag &amp; Drop Circuit Designer
              </button>
            )}
          </div>
        </div>

        {/* Recommended Hardware & Software Lab Setup Matrix */}
        {showSetupMatrix && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-3 border-t border-slate-800/90">
            {/* Hardware Bench Instruments */}
            <div className="bg-[#090e1a]/90 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-300 uppercase tracking-wider">
                  <Wrench className="w-4 h-4 text-amber-400" />
                  Recommended Bench Hardware Setup (All 5 Domains)
                </div>
                <span className="text-[11px] font-mono text-slate-400">
                  7 Core Instruments
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {RECOMMENDED_LAB_SETUP.hardware.map((hw) => (
                  <div
                    key={hw.name}
                    className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800/80"
                  >
                    <div className="text-xs font-semibold text-white">
                      {hw.name}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                      {hw.spec}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Software / EDA Simulation Stack */}
            <div className="bg-[#090e1a]/90 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-cyan-300 uppercase tracking-wider">
                  <Cpu className="w-4 h-4 text-cyan-400" />
                  Recommended EDA &amp; FPGA Software Suite
                </div>
                <span className="text-[11px] font-mono text-slate-400">
                  6 Industry Tools
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {RECOMMENDED_LAB_SETUP.software.map((sw) => (
                  <div
                    key={sw.name}
                    className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800/80"
                  >
                    <div className="text-xs font-semibold text-cyan-300">
                      {sw.name}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                      {sw.spec}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Domain Filter Tabs + Search + Category Filter */}
        <div className="space-y-3 pt-2 border-t border-slate-800/80">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setSelectedDomain("ALL");
                handleSelectLabId(MASTER_75_LABS[0].id);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                selectedDomain === "ALL"
                  ? "bg-cyan-400 text-slate-950 font-bold"
                  : "bg-slate-900/90 text-slate-300 hover:text-white border border-slate-800"
              }`}
            >
              All 5 Domains (75 Labs)
            </button>
            {(["A", "B", "C", "D", "E"] as MasterDomainId[]).map((domId) => {
              const dom = MASTER_DOMAINS[domId];
              const active = selectedDomain === domId;
              return (
                <button
                  key={domId}
                  type="button"
                  onClick={() => {
                    setSelectedDomain(domId);
                    const firstInDom = MASTER_75_LABS.find(
                      (l) => l.domain === domId
                    );
                    if (firstInDom) handleSelectLabId(firstInDom.id);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    active
                      ? "bg-gradient-to-r from-cyan-400 to-purple-400 text-slate-950 font-bold"
                      : "bg-slate-900/90 text-slate-300 hover:text-white border border-slate-800"
                  }`}
                >
                  {domId}. {dom.title.split("/")[0].trim()} (15)
                </button>
              );
            })}
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search 75 labs by topic, theorem, IC (555, 741, SCR, FPGA, LTSpice)..."
                className="w-full pl-8 pr-8 py-1.5 bg-[#090e1a] border border-slate-700/80 focus:border-cyan-400 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                "ALL",
                "Fundamental Bench Lab",
                "Advanced Circuit Lab",
                "EDA Simulation Lab",
                "FPGA / PCB Hardware Lab",
              ].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition-colors cursor-pointer ${
                    categoryFilter === cat
                      ? "bg-purple-500/25 text-purple-200 border border-purple-400/50 font-semibold"
                      : "bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800"
                  }`}
                >
                  {cat === "ALL" ? "All Types" : cat}
                </button>
              ))}
              <span className="text-[11px] font-mono text-emerald-400 ml-1">
                Verified: {completedCount}/75
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Split Workbench: Left Lab Directory (15 or 75) & Right Active Lab Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Directory List (4 cols) */}
        <div className="lg:col-span-4 bg-[#111827] border border-slate-800 rounded-2xl p-3.5 space-y-2.5 max-h-[820px] overflow-y-auto">
          <div className="flex items-center justify-between px-1 pb-2 border-b border-slate-800">
            <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
              {selectedDomain === "ALL"
                ? `All 5 Domains (${filteredLabs.length} Labs)`
                : `Domain ${selectedDomain} Labs (${filteredLabs.length} / 15)`}
            </span>
            <span className="text-[11px] font-mono text-cyan-400">
              Select or Slide Lab
            </span>
          </div>

          {/* Interactive Quick-Jump Lab Slider inside the Lab Directory */}
          {filteredLabs.length > 1 && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="text-slate-400">Lab Quick Slider:</span>
                <span className="text-cyan-300 font-bold tabular-nums">
                  {activeLab.id} ({Math.max(1, filteredLabs.findIndex((l) => l.id === activeLab.id) + 1)} / {filteredLabs.length})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const idx = filteredLabs.findIndex((l) => l.id === activeLab.id);
                    if (idx > 0) handleSelectLabId(filteredLabs[idx - 1].id);
                  }}
                  disabled={filteredLabs.findIndex((l) => l.id === activeLab.id) <= 0}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 cursor-pointer"
                  title="Previous Lab"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <input
                  type="range"
                  min={0}
                  max={Math.max(0, filteredLabs.length - 1)}
                  step={1}
                  value={Math.max(0, filteredLabs.findIndex((l) => l.id === activeLab.id))}
                  onChange={(e) => {
                    const target = filteredLabs[parseInt(e.target.value, 10)];
                    if (target) handleSelectLabId(target.id);
                  }}
                  className="flex-1 accent-cyan-400 cursor-pointer"
                />
                <button
                  type="button"
                  onClick={() => {
                    const idx = filteredLabs.findIndex((l) => l.id === activeLab.id);
                    if (idx >= 0 && idx < filteredLabs.length - 1) {
                      handleSelectLabId(filteredLabs[idx + 1].id);
                    }
                  }}
                  disabled={
                    filteredLabs.findIndex((l) => l.id === activeLab.id) >=
                    filteredLabs.length - 1
                  }
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 cursor-pointer"
                  title="Next Lab"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {filteredLabs.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">
              No labs match "{searchQuery}". Clear filters to see all 75 labs.
            </div>
          ) : (
            <div className="space-y-1.5">
              {filteredLabs.map((lab) => {
                const isSelected = lab.id === activeLab.id;
                const isDone = !!completedLabs[lab.id];
                return (
                  <button
                    key={lab.id}
                    type="button"
                    onClick={() => handleSelectLabId(lab.id)}
                    className={`w-full text-left p-2.5 rounded-xl border transition-all cursor-pointer flex items-start gap-2.5 ${
                      isSelected
                        ? "bg-cyan-500/15 border-cyan-400/70 text-white"
                        : "bg-slate-900/70 border-slate-800/80 text-slate-300 hover:bg-slate-900 hover:border-slate-700"
                    }`}
                  >
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold shrink-0 mt-0.5 ${
                        isSelected
                          ? "bg-cyan-400 text-slate-950"
                          : "bg-slate-800 text-cyan-300"
                      }`}
                    >
                      {lab.id}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold leading-snug line-clamp-2">
                        {lab.title}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        <span className="text-[10px] font-mono text-slate-400">
                          {lab.category}
                        </span>
                        {lab.softwareSetup[0] && (
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800/90 text-purple-300">
                            {lab.softwareSetup[0]}
                          </span>
                        )}
                      </div>
                    </div>
                    {isDone && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Active Lab Interactive Simulator & Setup Station (8 cols) */}
        <div className="lg:col-span-8 space-y-5">
          {/* Active Lab Header Card */}
          <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                  <span className="px-2.5 py-0.5 rounded-md bg-cyan-400 text-slate-950 font-bold">
                    LAB {activeLab.id} (EXP #{activeLab.labNumber} OF 15)
                  </span>
                  <span className="px-2.5 py-0.5 rounded-md bg-purple-500/20 border border-purple-500/40 text-purple-200">
                    {activeLab.category}
                  </span>
                  <span className="text-slate-400">
                    Domain {activeLab.domain}: {activeDomainInfo.title}
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white pt-1">
                  {activeLab.title}
                </h3>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {knowledgeChecks?.[activeLab.id] && onOpenKnowledgeCheck && (
                  <button
                    type="button"
                    onClick={() => onOpenKnowledgeCheck(activeLab.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold bg-[#0B1220] hover:bg-[#162338] text-[#35BDF2] border border-[#24344D] transition-colors cursor-pointer tabular-nums"
                    title="Retake Post-Lab Knowledge Check"
                  >
                    Quiz: {knowledgeChecks[activeLab.id].score}/
                    {knowledgeChecks[activeLab.id].totalQuestions}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => toggleLabComplete(activeLab.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                    completedLabs[activeLab.id]
                      ? "bg-emerald-500/20 border-emerald-400 text-emerald-300"
                      : "bg-slate-900 border-slate-700 text-slate-300 hover:text-white"
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {completedLabs[activeLab.id]
                    ? "Lab Verified"
                    : "Mark Lab Verified"}
                </button>

                {onNavigateTab && !fixedDomain && (
                  <button
                    type="button"
                    onClick={() => onNavigateTab(activeDomainInfo.appTab, activeLab.id)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 transition-colors cursor-pointer"
                  >
                    Open {activeLab.domain} Full Bench
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed bg-slate-900/70 border border-slate-800/80 rounded-xl p-3.5">
              <strong className="text-cyan-300 font-mono uppercase text-xs mr-2">
                Objective:
              </strong>
              {activeLab.objective}
            </p>

            {/* Governing Engineering Formula */}
            <div className="bg-[#090e1a] border border-cyan-500/30 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 shrink-0">
                Governing Relation / Model:
              </span>
              <code className="text-xs sm:text-sm font-mono font-bold text-cyan-300 break-all">
                {activeLab.formula}
              </code>
            </div>
          </div>

          {/* Interactive Parameter Controls + Live DSO / Characteristic Curve Plotter */}
          <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-cyan-400" />
                <h4 className="text-sm font-bold text-white">
                  Interactive Lab Parameter Controls &amp; Live Virtual DSO Telemetry
                </h4>
              </div>
              <button
                type="button"
                onClick={resetActiveParams}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-700 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                Reset Defaults
              </button>
            </div>

            {/* 3 Parameter Sliders + Direct Value Input Boxes */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {activeLab.params.map((param) => {
                const val = activeLabParams[param.key] ?? param.defaultVal;
                return (
                  <div
                    key={param.key}
                    className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-slate-300">
                        {param.label}
                      </span>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          step={param.step}
                          value={val}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            if (!Number.isNaN(v)) updateParam(param.key, v);
                          }}
                          className="w-20 px-1.5 py-0.5 rounded bg-slate-950 border border-slate-700 focus:border-cyan-400 focus:outline-none text-right text-cyan-300 font-mono font-bold text-xs tabular-nums"
                          title={`Type exact ${param.label} value`}
                        />
                        <span className="text-xs font-mono font-bold text-slate-400">
                          {param.unit}
                        </span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min={param.min}
                      max={param.max}
                      step={param.step}
                      value={val}
                      onChange={(e) =>
                        updateParam(param.key, parseFloat(e.target.value))
                      }
                      className="w-full accent-cyan-400 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] font-mono text-slate-500">
                      <span>
                        {param.min} {param.unit}
                      </span>
                      <span>
                        {param.max} {param.unit}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 4 Live Evaluated Telemetry Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {evalData.metrics.map((m) => (
                <div
                  key={m.label}
                  className="bg-[#090e1a] border border-slate-800 rounded-xl p-3"
                >
                  <div className="text-[11px] font-mono text-slate-400">
                    {m.label}
                  </div>
                  <div className="text-sm sm:text-base font-mono font-bold text-emerald-400 mt-1 tabular-nums">
                    {m.value}
                  </div>
                </div>
              ))}
            </div>

            {/* Virtual DSO 100MHz / Characteristic Curve Graph */}
            <div className="bg-[#070b14] border border-slate-800 rounded-xl p-4 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-mono text-cyan-300">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  <span>{evalData.curveTitle}</span>
                </div>
                <div className="flex items-center gap-4 text-[11px] font-mono">
                  <span className="inline-flex items-center gap-1.5 text-cyan-300">
                    <span className="w-2.5 h-0.5 bg-cyan-400 inline-block" />
                    CH1 (Excitation / Load-Line)
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-emerald-300">
                    <span className="w-2.5 h-0.5 bg-emerald-400 inline-block" />
                    CH2 (Output / Device Response)
                  </span>
                </div>
              </div>

              <svg
                viewBox="0 0 540 190"
                className="w-full h-44 bg-[#050811] rounded-lg border border-slate-800/90"
              >
                {/* Oscilloscope Graticule Grid */}
                {[35, 65, 95, 125, 155].map((gy) => (
                  <line
                    key={gy}
                    x1="36"
                    y1={gy}
                    x2="504"
                    y2={gy}
                    stroke="#1e293b"
                    strokeDasharray={gy === 95 ? "none" : "3 3"}
                    strokeWidth={gy === 95 ? "1.2" : "0.8"}
                  />
                ))}
                {[36, 130, 224, 318, 412, 504].map((gx) => (
                  <line
                    key={gx}
                    x1={gx}
                    y1="20"
                    x2={gx}
                    y2="170"
                    stroke="#1e293b"
                    strokeDasharray="3 3"
                    strokeWidth="0.8"
                  />
                ))}

                {/* Trace 1 (CH1 Cyan) */}
                <path
                  d={svgChart.path1}
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
                {/* Trace 2 (CH2 Emerald) */}
                <path
                  d={svgChart.path2}
                  fill="none"
                  stroke="#22c55e"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />

                {/* Scale Readout Labels */}
                <text
                  x="42"
                  y="32"
                  fill="#64748b"
                  fontSize="10"
                  fontFamily="monospace"
                >
                  +{svgChart.maxAbsY.toFixed(1)}
                </text>
                <text
                  x="42"
                  y="92"
                  fill="#64748b"
                  fontSize="10"
                  fontFamily="monospace"
                >
                  0.0
                </text>
                <text
                  x="42"
                  y="165"
                  fill="#64748b"
                  fontSize="10"
                  fontFamily="monospace"
                >
                  -{svgChart.maxAbsY.toFixed(1)}
                </text>
              </svg>
            </div>
          </div>

          {/* Hardware & Software Bench Setup + Procedure Checklist */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Lab-Specific Hardware & Software Requirements */}
            <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-300 uppercase tracking-wider">
                <Wrench className="w-4 h-4 text-amber-400" />
                Required Hardware &amp; Software Setup ({activeLab.id})
              </div>

              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-300">
                  Hardware Instruments &amp; Components:
                </div>
                <ul className="space-y-1.5">
                  {activeLab.hardwareSetup.map((hw) => (
                    <li
                      key={hw}
                      className="text-xs text-slate-300 flex items-start gap-2 bg-slate-900/80 border border-slate-800/80 rounded-lg px-3 py-2"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                      <span>{hw}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-2 pt-1">
                <div className="text-xs font-semibold text-slate-300">
                  Simulation &amp; Design Software:
                </div>
                <div className="flex flex-wrap gap-2">
                  {activeLab.softwareSetup.map((sw) => (
                    <span
                      key={sw}
                      className="px-3 py-1.5 rounded-lg text-xs font-mono font-semibold bg-cyan-500/15 border border-cyan-500/30 text-cyan-300"
                    >
                      {sw}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Interactive Step-by-Step Lab Procedure */}
            <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-emerald-300 uppercase tracking-wider">
                  <BookOpen className="w-4 h-4 text-emerald-400" />
                  Step-by-Step Bench &amp; Simulation Procedure
                </div>
                <span className="text-[11px] font-mono text-slate-400">
                  Click to check off
                </span>
              </div>

              <div className="space-y-2">
                {activeLab.procedure.map((step, idx) => {
                  const stepKey = `${activeLab.id}-${idx}`;
                  const checked = !!checkedSteps[stepKey];
                  return (
                    <button
                      key={stepKey}
                      type="button"
                      onClick={() => toggleStepCheck(stepKey)}
                      className={`w-full text-left p-2.5 rounded-xl border transition-colors cursor-pointer flex items-start gap-2.5 ${
                        checked
                          ? "bg-emerald-950/30 border-emerald-500/40 text-emerald-200"
                          : "bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700"
                      }`}
                    >
                      <span
                        className={`w-5 h-5 rounded-md text-[11px] font-mono font-bold flex items-center justify-center shrink-0 mt-0.5 ${
                          checked
                            ? "bg-emerald-400 text-slate-950"
                            : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {checked ? "✓" : idx + 1}
                      </span>
                      <span className="text-xs leading-relaxed">{step}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Copyable SPICE Netlist / Verilog RTL / MATLAB Script */}
          <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-purple-300">
                <Code2 className="w-4 h-4 text-purple-400" />
                <span>{codeBlock.title}</span>
              </div>
              <button
                type="button"
                onClick={handleCopyCode}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 cursor-pointer"
              >
                {copiedCode ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    Copied to Clipboard
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-cyan-400" />
                    Copy Netlist / Script
                  </>
                )}
              </button>
            </div>
            <pre className="p-4 rounded-xl bg-[#070b14] border border-slate-800 text-xs font-mono text-cyan-200 overflow-x-auto leading-relaxed">
              {codeBlock.code}
            </pre>
          </div>

          {/* Dynamic Observations Table + Expected Results + Viva Voce Questions */}
          <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-cyan-300 uppercase tracking-wider">
                <FileText className="w-4 h-4 text-cyan-400" />
                <span>Lab Manual Observations Table &amp; Expected Verification ({activeLab.id})</span>
              </div>
              <span className="text-[11px] font-mono text-emerald-400">
                Computed live from SPICE/analytical model
              </span>
            </div>

            {sweepObservations.length > 0 && (
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left border-collapse text-xs font-mono">
                  <thead className="bg-[#070b14] text-slate-400">
                    <tr>
                      <th className="py-2 px-3 border-b border-slate-800">Run</th>
                      <th className="py-2 px-3 border-b border-slate-800">
                        {sweepObservations[0].paramLabel}
                      </th>
                      {sweepObservations[0].metrics.map((m) => (
                        <th key={m.label} className="py-2 px-3 border-b border-slate-800">
                          {m.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 bg-[#0b1020]">
                    {sweepObservations.map((row) => (
                      <tr key={row.run} className="hover:bg-slate-900/60">
                        <td className="py-2 px-3 text-slate-500">#{row.run}</td>
                        <td className="py-2 px-3 text-cyan-300 font-bold tabular-nums">
                          {row.paramValue}
                        </td>
                        {row.metrics.map((m) => (
                          <td
                            key={m.label}
                            className="py-2 px-3 text-emerald-300 tabular-nums"
                          >
                            {m.value}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#070b14] border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="text-[11px] font-mono font-bold text-emerald-400 uppercase tracking-wider">
                  Expected Results &amp; Acceptance Criteria
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Measured bench waveforms and telemetry must track the analytical model{" "}
                  <code className="text-cyan-300 font-mono">{activeLab.formula}</code> within ±5%
                  component tolerance. Current nominal outputs: {evalData.metrics.map((m) => `${m.label}: ${m.value}`).join(" · ")}.
                </p>
              </div>

              <div className="bg-[#070b14] border border-slate-800 rounded-xl p-4 space-y-2.5">
                <div className="text-[11px] font-mono font-bold text-amber-300 uppercase tracking-wider">
                  University Viva Voce Questions
                </div>
                <div className="space-y-2">
                  {domainVivaQuestions.map((vq, idx) => (
                    <div key={idx} className="text-xs space-y-0.5">
                      <div className="font-semibold text-white">
                        Q{idx + 1}: {vq.q}
                      </div>
                      <div className="text-slate-400 leading-relaxed">{vq.a}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
