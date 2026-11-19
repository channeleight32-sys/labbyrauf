import React, { useState, useMemo } from "react";
import {
  Search,
  X,
  ChevronDown,
  ChevronRight,
  Sliders,
  Cpu,
  Activity,
  BookOpen,
  Layers,
  Home,
  CheckCircle2,
  PanelLeftClose,
  PanelLeftOpen,
  Zap,
  CircuitBoard,
  Binary,
  Gauge,
  Wrench,
} from "lucide-react";
import {
  MASTER_75_LABS,
  MASTER_DOMAINS,
  MasterDomainId,
  MasterLabItem,
} from "../data/master75Labs";
import { ActiveTabId } from "./CurriculumGuide";

export interface SubjectSimulationLink {
  id: string;
  label: string;
  sublabel: string;
  tab: ActiveTabId;
  dldSubTab?: "SIMULATOR" | "GATES" | "MASTER_15_DLD" | "GUIDE";
  multisimMode?: "ANALOG_SPICE" | "DIGITAL_SPICE";
}

export const SUBJECT_SIMULATIONS_MAP: Record<
  MasterDomainId,
  SubjectSimulationLink[]
> = {
  A: [
    {
      id: "sim-a-lca",
      label: "Network Theorems & Nodal/Mesh Solver",
      sublabel: "KVL/KCL, Superposition, Thevenin/Norton, Max Power & RC/RL Step",
      tab: "lca",
    },
    {
      id: "sim-a-rlc",
      label: "RLC Series/Parallel & Bode Analyzer",
      sublabel: "0 Hz – 10 GHz Sweep, Resonance, Q-Factor, Phasors & Filters",
      tab: "rlc",
    },
    {
      id: "sim-a-spice",
      label: "Multisim Analog SPICE Workbench",
      sublabel: "MNA Solver, Virtual DMM (XMM1), DSO (XSC1), Bode (XBP1) & .CIR",
      tab: "multisim",
      multisimMode: "ANALOG_SPICE",
    },
  ],
  B: [
    {
      id: "sim-b-opamp",
      label: "741 Op-Amp & Linear IC Simulator",
      sublabel: "Inverting, Non-Inverting, Summing, Integrator & Active Stages",
      tab: "edc",
    },
    {
      id: "sim-b-filters",
      label: "Active Filter & Bode Frequency Response",
      sublabel: "LPF, HPF, BPF, Notch & Sallen-Key Frequency/Phase Plots",
      tab: "rlc",
    },
    {
      id: "sim-b-spice",
      label: "Multisim Linear IC & 555 Timer SPICE",
      sublabel: "Real-Time Waveform Gen (XFG1), 4-Ch Oscilloscope & Netlist",
      tab: "multisim",
      multisimMode: "ANALOG_SPICE",
    },
    {
      id: "sim-b-vlc",
      label: "Project 001: IST Optical Wireless VLC Lab",
      sublabel: "Visible Light Communication, ESP32 Transceiver, TIA & BER Simulation",
      tab: "vlc",
    },
    {
      id: "sim-b-embedded",
      label: "Embedded & ESP32 Virtual Studio",
      sublabel: "ESP32 DevKit/S3/C3, Uno, STM32, Pico, Dual C++/MicroPython & Pin Matrix",
      tab: "embedded-lab",
    },
    {
      id: "sim-b-wireless",
      label: "Wireless & LoRa SX1278 Sub-GHz Lab",
      sublabel: "LoRa Transceiver, Packet Injector, ESP32 Wi-Fi/BLE & Friis RF Link Budget",
      tab: "wireless-lab",
    },
    {
      id: "sim-b-robotics",
      label: "Robotics & Automation Mechatronics Lab",
      sublabel: "ESP32 Radar, Ultrasonic Sensor, SG90 Servo, L298N DC Motor & Smart Car 2D Arena",
      tab: "robotics-lab",
    },
    {
      id: "sim-b-schematics",
      label: "6-Tab Interactive Projects (IEEE 315)",
      sublabel: "Schematic, Hardware, Wiring Workbench, Firmware, Instruments & Lab Report",
      tab: "schematics",
    },
  ],
  C: [
    {
      id: "sim-c-schematic",
      label: "Interactive Logic Schematic & Oscilloscope",
      sublabel: "Drag-and-Drop Gates, Wire Probes, Logic Analyzer & Sub-Circuits",
      tab: "logic-suite",
      dldSubTab: "SIMULATOR",
    },
    {
      id: "sim-c-kmap",
      label: "K-Map, Quine-McCluskey & Boolean Solver",
      sublabel: "Simplify Expression (Minimal SOP), Truth Table & Gate Synthesis",
      tab: "kmap",
    },
    {
      id: "sim-c-seq",
      label: "Sequential Logic, Flip-Flops & FSM Studio",
      sublabel: "SR, JK, D, T Flip-Flops, Mealy/Moore State Graphs & Counters",
      tab: "sequential",
    },
    {
      id: "sim-c-numbers",
      label: "Number Systems, 2's Comp & Hamming(7,4)",
      sublabel: "Radix Converter, Signed Adder, Gray/BCD/Excess-3 & SEC Code",
      tab: "numbers",
    },
    {
      id: "sim-c-msi",
      label: "PLA Matrix, 4-Bit ALU & Timing (STA)",
      sublabel: "Programmable AND-OR Plane, 74181 ALU, CLA & f_max Calculator",
      tab: "msi",
    },
    {
      id: "sim-c-gates",
      label: "TTL 74LSxx Gate & MSI IC Library",
      sublabel: "Interactive Truth Tables, CMOS Transistor Networks & Pinouts",
      tab: "gates",
    },
    {
      id: "sim-c-core",
      label: "Half/Full Adder & 4:1 MUX Testbenches",
      sublabel: "Dedicated Interactive Combinational & Sequential Modules",
      tab: "simulators",
    },
  ],
  D: [
    {
      id: "sim-d-power",
      label: "Power Converters, SCR & SPWM Inverter Lab",
      sublabel: "Buck, Boost, Buck-Boost CCM/DCM, Controlled Rectifier & H-Bridge",
      tab: "power",
    },
    {
      id: "sim-d-spice",
      label: "Power Electronics SPICE & Wattmeter Bench",
      sublabel: "Virtual Wattmeter (XWM1), Power Factor & Transient Waveforms",
      tab: "multisim",
      multisimMode: "ANALOG_SPICE",
    },
  ],
  E: [
    {
      id: "sim-e-cd",
      label: "PN Diode Shockley I-V, Clippers & Zener Lab",
      sublabel: "Newton-Raphson Q-Point Load Line, Wave Shapers & Regulators",
      tab: "cd",
    },
    {
      id: "sim-e-edc",
      label: "BJT Common-Emitter & MOSFET Amplifier Lab",
      sublabel: "2N3904 Voltage-Divider Bias, Hybrid-π Gain & N-MOSFET Curves",
      tab: "edc",
    },
    {
      id: "sim-e-spice",
      label: "Semiconductor Curve Tracer & SPICE Bench",
      sublabel: "Interactive Component Sweep, DSO Probing & Netlist Generator",
      tab: "multisim",
      multisimMode: "ANALOG_SPICE",
    },
  ],
};

interface SubjectLeftSidebarProps {
  activeTab: ActiveTabId;
  activeDomain: MasterDomainId | null;
  selectedLabId: string;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  sidebarWidth: number;
  onChangeSidebarWidth: (width: number) => void;
  onSelectHome: () => void;
  onSelectSubjectOverview: (domain: MasterDomainId) => void;
  onSelectSimulation: (
    domain: MasterDomainId,
    sim: SubjectSimulationLink
  ) => void;
  onSelectLab: (lab: MasterLabItem) => void;
  onSelectResourceTab: (
    tab: ActiveTabId,
    domain?: MasterDomainId | "ALL"
  ) => void;
}

const DOMAIN_BADGE_STYLES: Record<
  MasterDomainId,
  { badge: string; border: string; text: string }
> = {
  A: {
    badge: "bg-amber-400 text-slate-950",
    border: "border-amber-500/40",
    text: "text-amber-300",
  },
  B: {
    badge: "bg-sky-400 text-slate-950",
    border: "border-sky-500/40",
    text: "text-sky-300",
  },
  C: {
    badge: "bg-cyan-400 text-slate-950",
    border: "border-cyan-500/40",
    text: "text-cyan-300",
  },
  D: {
    badge: "bg-purple-400 text-slate-950",
    border: "border-purple-500/40",
    text: "text-purple-300",
  },
  E: {
    badge: "bg-emerald-400 text-slate-950",
    border: "border-emerald-500/40",
    text: "text-emerald-300",
  },
};

export default function SubjectLeftSidebar({
  activeTab,
  activeDomain,
  selectedLabId,
  isCollapsed,
  onToggleCollapse,
  sidebarWidth,
  onChangeSidebarWidth,
  onSelectHome,
  onSelectSubjectOverview,
  onSelectSimulation,
  onSelectLab,
  onSelectResourceTab,
}: SubjectLeftSidebarProps) {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [expandedDomains, setExpandedDomains] = useState<
    Record<MasterDomainId, boolean>
  >({
    A: true,
    B: true,
    C: true,
    D: true,
    E: true,
  });
  const [domainSubSectionOpen, setDomainSubSectionOpen] = useState<
    Record<string, boolean>
  >({
    "A-sims": true,
    "A-labs": true,
    "B-sims": true,
    "B-labs": false,
    "C-sims": true,
    "C-labs": true,
    "D-sims": true,
    "D-labs": false,
    "E-sims": true,
    "E-labs": false,
  });
  const [showWidthSlider, setShowWidthSlider] = useState<boolean>(false);

  const toggleDomain = (domId: MasterDomainId) => {
    setExpandedDomains((prev) => ({ ...prev, [domId]: !prev[domId] }));
  };

  const toggleSubSection = (key: string) => {
    setDomainSubSectionOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const expandAllSubjects = () => {
    setExpandedDomains({ A: true, B: true, C: true, D: true, E: true });
    setDomainSubSectionOpen({
      "A-sims": true,
      "A-labs": true,
      "B-sims": true,
      "B-labs": true,
      "C-sims": true,
      "C-labs": true,
      "D-sims": true,
      "D-labs": true,
      "E-sims": true,
      "E-labs": true,
    });
  };

  const collapseAllLabs = () => {
    setDomainSubSectionOpen({
      "A-sims": true,
      "A-labs": false,
      "B-sims": true,
      "B-labs": false,
      "C-sims": true,
      "C-labs": false,
      "D-sims": true,
      "D-labs": false,
      "E-sims": true,
      "E-labs": false,
    });
  };

  const globalLabIndex = useMemo(() => {
    const idx = MASTER_75_LABS.findIndex((l) => l.id === selectedLabId);
    return idx >= 0 ? idx : 0;
  }, [selectedLabId]);

  const currentGlobalLab = MASTER_75_LABS[globalLabIndex] ?? MASTER_75_LABS[0];

  // Collapsed narrow rail view
  if (isCollapsed) {
    return (
      <aside className="w-16 shrink-0 bg-[#0d1426] border-r border-[#26365c] flex flex-col items-center py-3 gap-2.5 sticky top-[57px] h-[calc(100vh-57px)] z-30">
        <button
          type="button"
          onClick={onToggleCollapse}
          className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-cyan-400 border border-slate-700 cursor-pointer"
          title="Expand Subject & Lab Left Panel"
        >
          <PanelLeftOpen className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={onSelectHome}
          className={`p-2.5 rounded-xl border transition-colors cursor-pointer ${
            activeTab === "home"
              ? "bg-cyan-400 text-slate-950 border-cyan-300 font-bold"
              : "bg-slate-900/80 text-slate-300 hover:text-white border-slate-800"
          }`}
          title="Home & All Subjects Overview"
        >
          <Home className="w-4 h-4" />
        </button>

        <div className="w-8 border-t border-slate-800 my-0.5" />

        {(["A", "B", "C", "D", "E"] as MasterDomainId[]).map((domId) => {
          const dom = MASTER_DOMAINS[domId];
          const isActive = activeDomain === domId;
          return (
            <button
              key={domId}
              type="button"
              onClick={() => onSelectSubjectOverview(domId)}
              className={`w-10 h-10 rounded-xl font-mono text-xs font-bold border transition-all cursor-pointer flex items-center justify-center ${
                isActive
                  ? "bg-cyan-400 text-slate-950 border-cyan-300 shadow-sm"
                  : "bg-slate-900/90 text-slate-200 hover:border-cyan-400/50 border-slate-800"
              }`}
              title={`Subject ${domId}: ${dom.title} (15 Labs + Simulations)`}
            >
              {domId}
            </button>
          );
        })}

        <div className="w-8 border-t border-slate-800 my-0.5" />

        <button
          type="button"
          onClick={() => onSelectResourceTab("resources", "ALL")}
          className={`p-2.5 rounded-xl border transition-colors cursor-pointer ${
            activeTab === "resources"
              ? "bg-emerald-400 text-slate-950 border-emerald-300"
              : "bg-slate-900/80 text-emerald-300 hover:text-white border-slate-800"
          }`}
          title="Learning Resources, Formulas & IC Pinouts"
        >
          <BookOpen className="w-4 h-4" />
        </button>
      </aside>
    );
  }

  return (
    <aside
      style={{ width: `${sidebarWidth}px` }}
      className="shrink-0 bg-[#0d1426] border-r border-[#26365c] flex flex-col sticky top-[57px] h-[calc(100vh-57px)] z-30 select-none"
    >
      {/* Top Control Header of Left Panel */}
      <div className="p-3.5 border-b border-[#26365c] bg-[#0a1020] space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Layers className="w-4 h-4 text-cyan-400 shrink-0" />
            <span className="text-xs font-mono font-bold text-white uppercase tracking-wider truncate">
              5 Subjects · 75 Labs &amp; Sims
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setShowWidthSlider((v) => !v)}
              className={`p-1.5 rounded-lg border text-xs transition-colors cursor-pointer ${
                showWidthSlider
                  ? "bg-cyan-500/20 border-cyan-400/50 text-cyan-300"
                  : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
              }`}
              title="Toggle Panel Width & Master Lab Slider"
            >
              <Sliders className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onToggleCollapse}
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 cursor-pointer"
              title="Collapse Left Panel"
            >
              <PanelLeftClose className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Interactive Master 75-Lab Scrubber Slider & Panel Width Slider */}
        <div className="bg-[#111a2e] border border-slate-800 rounded-xl p-2.5 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className="text-slate-400">Quick Lab Slider (1–75):</span>
            <span className="text-cyan-300 font-bold tabular-nums">
              {currentGlobalLab.id} · #{globalLabIndex + 1}/75
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={MASTER_75_LABS.length - 1}
            step={1}
            value={globalLabIndex}
            onChange={(e) => {
              const idx = parseInt(e.target.value, 10);
              const targetLab = MASTER_75_LABS[idx];
              if (targetLab) {
                onSelectLab(targetLab);
              }
            }}
            className="w-full accent-cyan-400 cursor-pointer"
          />
          <div className="flex items-center justify-between gap-2 text-[10px] font-mono text-slate-400">
            <span className="truncate text-slate-300">
              {currentGlobalLab.title}
            </span>
            <button
              type="button"
              onClick={() => onSelectLab(currentGlobalLab)}
              className="px-2 py-0.5 rounded bg-cyan-400/20 text-cyan-300 border border-cyan-400/40 font-semibold shrink-0 hover:bg-cyan-400 hover:text-slate-950 transition-colors cursor-pointer"
            >
              Open {currentGlobalLab.id}
            </button>
          </div>

          {showWidthSlider && (
            <div className="pt-2 border-t border-slate-800/90 space-y-1">
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                <span>Left Panel Width Slider:</span>
                <span className="text-emerald-300 tabular-nums">
                  {sidebarWidth} px
                </span>
              </div>
              <input
                type="range"
                min={280}
                max={440}
                step={10}
                value={sidebarWidth}
                onChange={(e) =>
                  onChangeSidebarWidth(parseInt(e.target.value, 10))
                }
                className="w-full accent-emerald-400 cursor-pointer"
              />
            </div>
          )}
        </div>

        {/* Search Input for Subjects, Simulations & 75 Labs */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter subjects, labs (A01–E15) or sims..."
            className="w-full pl-8 pr-7 py-1.5 bg-[#070b14] border border-slate-700/80 focus:border-cyan-400 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Quick Expand / Collapse Controls */}
        <div className="flex items-center justify-between gap-1.5 text-[11px] font-mono">
          <button
            type="button"
            onClick={onSelectHome}
            className={`flex-1 py-1 px-2 rounded-lg border text-left flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === "home"
                ? "bg-cyan-400 text-slate-950 border-cyan-300 font-bold"
                : "bg-slate-900/90 text-slate-300 hover:text-white border-slate-800"
            }`}
          >
            <Home className="w-3 h-3 shrink-0" />
            <span className="truncate">Home Hub</span>
          </button>
          <button
            type="button"
            onClick={expandAllSubjects}
            className="py-1 px-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 cursor-pointer"
            title="Expand all subjects, simulations & 75 labs"
          >
            Expand All
          </button>
          <button
            type="button"
            onClick={collapseAllLabs}
            className="py-1 px-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 cursor-pointer"
            title="Show only simulations under each subject"
          >
            Compact
          </button>
        </div>
      </div>

      {/* Scrollable Subject, Simulation & Lab Tree with Custom Slider Scrollbar */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {(["A", "B", "C", "D", "E"] as MasterDomainId[]).map((domId) => {
          const dom = MASTER_DOMAINS[domId];
          const style = DOMAIN_BADGE_STYLES[domId];
          const sims = SUBJECT_SIMULATIONS_MAP[domId];
          const allDomainLabs = MASTER_75_LABS.filter(
            (l) => l.domain === domId
          );

          const q = searchQuery.trim().toLowerCase();
          const matchingSims = sims.filter(
            (s) =>
              !q ||
              s.label.toLowerCase().includes(q) ||
              s.sublabel.toLowerCase().includes(q) ||
              dom.title.toLowerCase().includes(q)
          );
          const matchingLabs = allDomainLabs.filter(
            (l) =>
              !q ||
              l.id.toLowerCase().includes(q) ||
              l.title.toLowerCase().includes(q) ||
              l.objective.toLowerCase().includes(q) ||
              l.category.toLowerCase().includes(q)
          );

          if (q && matchingSims.length === 0 && matchingLabs.length === 0) {
            return null;
          }

          const isExpanded = q ? true : expandedDomains[domId];
          const isSimsOpen = q ? true : domainSubSectionOpen[`${domId}-sims`];
          const isLabsOpen = q ? true : domainSubSectionOpen[`${domId}-labs`];
          const isSubjectActive = activeDomain === domId;

          const activeLabInThisDomain =
            allDomainLabs.find((l) => l.id === selectedLabId) ??
            allDomainLabs[0];

          return (
            <div
              key={domId}
              className={`rounded-2xl border transition-colors overflow-hidden ${
                isSubjectActive
                  ? `bg-[#121c34] ${style.border}`
                  : "bg-[#0f172a] border-slate-800/90"
              }`}
            >
              {/* Subject Accordion Header */}
              <div className="p-2.5 bg-[#15203b]/80 flex items-start justify-between gap-2">
                <button
                  type="button"
                  onClick={() => toggleDomain(domId)}
                  className="flex items-start gap-2 text-left flex-1 min-w-0 cursor-pointer"
                >
                  <span
                    className={`px-2 py-0.5 rounded-md text-xs font-mono font-bold shrink-0 mt-0.5 ${style.badge}`}
                  >
                    {domId}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-white leading-snug line-clamp-2">
                      {dom.title}
                    </div>
                    <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                      {sims.length} Live Simulators · 15 Labs
                    </div>
                  </div>
                </button>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => onSelectSubjectOverview(domId)}
                    className="px-2 py-1 rounded-md text-[10px] font-mono font-semibold bg-slate-900 hover:bg-cyan-400 hover:text-slate-950 text-cyan-300 border border-slate-700 transition-colors cursor-pointer"
                    title={`Open Subject ${domId} Complete Workbench`}
                  >
                    Open
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleDomain(domId)}
                    className="p-1 text-slate-400 hover:text-white cursor-pointer"
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="p-2.5 space-y-2.5 border-t border-slate-800/80">
                  {/* 1. Interactive Subject Simulations Sub-Group */}
                  <div className="space-y-1.5">
                    <button
                      type="button"
                      onClick={() => toggleSubSection(`${domId}-sims`)}
                      className="w-full flex items-center justify-between px-1.5 py-1 text-[11px] font-mono font-bold text-cyan-300 hover:text-white cursor-pointer"
                    >
                      <span className="flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5 text-cyan-400" />
                        Interactive Simulations ({matchingSims.length})
                      </span>
                      {isSimsOpen ? (
                        <ChevronDown className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5" />
                      )}
                    </button>

                    {isSimsOpen && (
                      <div className="space-y-1">
                        {matchingSims.map((sim) => {
                          const isSimSelected =
                            activeTab === sim.tab &&
                            (!sim.dldSubTab || sim.dldSubTab === "SIMULATOR");
                          return (
                            <button
                              key={sim.id}
                              type="button"
                              onClick={() => onSelectSimulation(domId, sim)}
                              className={`w-full text-left p-2 rounded-xl border transition-colors cursor-pointer ${
                                isSimSelected
                                  ? "bg-cyan-500/15 border-cyan-400/60 text-white"
                                  : "bg-slate-900/70 border-slate-800/80 text-slate-300 hover:bg-slate-900 hover:border-slate-700"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1.5">
                                <span className="text-xs font-semibold text-white leading-tight">
                                  {sim.label}
                                </span>
                                <span className="text-[10px] font-mono text-emerald-400 shrink-0">
                                  Sim
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
                                {sim.sublabel}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* 2. All 15 Respective Labs + Per-Subject Lab Slider */}
                  <div className="space-y-1.5 pt-1 border-t border-slate-800/70">
                    <button
                      type="button"
                      onClick={() => toggleSubSection(`${domId}-labs`)}
                      className="w-full flex items-center justify-between px-1.5 py-1 text-[11px] font-mono font-bold text-emerald-300 hover:text-white cursor-pointer"
                    >
                      <span className="flex items-center gap-1.5">
                        <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                        Curriculum Labs ({matchingLabs.length} / 15)
                      </span>
                      {isLabsOpen ? (
                        <ChevronDown className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5" />
                      )}
                    </button>

                    {/* Subject 1-15 Lab Scrubber Slider */}
                    {isLabsOpen && !q && (
                      <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2 space-y-1">
                        <div className="flex items-center justify-between text-[10px] font-mono">
                          <span className="text-slate-400">
                            Slide {domId}01–{domId}15:
                          </span>
                          <span className={style.text}>
                            {activeLabInThisDomain.id} (Exp #
                            {activeLabInThisDomain.labNumber}/15)
                          </span>
                        </div>
                        <input
                          type="range"
                          min={1}
                          max={15}
                          step={1}
                          value={activeLabInThisDomain.labNumber}
                          onChange={(e) => {
                            const num = parseInt(e.target.value, 10);
                            const found = allDomainLabs.find(
                              (l) => l.labNumber === num
                            );
                            if (found) onSelectLab(found);
                          }}
                          className="w-full accent-emerald-400 cursor-pointer"
                        />
                      </div>
                    )}

                    {isLabsOpen && (
                      <div className="space-y-1 max-h-64 overflow-y-auto pr-0.5">
                        {matchingLabs.map((lab) => {
                          const isLabSelected =
                            selectedLabId === lab.id &&
                            (activeTab === "master-75" ||
                              activeDomain === domId);
                          return (
                            <button
                              key={lab.id}
                              type="button"
                              onClick={() => onSelectLab(lab)}
                              className={`w-full text-left px-2 py-1.5 rounded-lg border transition-colors cursor-pointer flex items-start gap-2 ${
                                isLabSelected
                                  ? "bg-emerald-500/15 border-emerald-400/60 text-white"
                                  : "bg-slate-900/50 border-slate-800/60 text-slate-300 hover:bg-slate-900 hover:border-slate-700"
                              }`}
                            >
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold shrink-0 mt-0.5 ${
                                  isLabSelected
                                    ? "bg-emerald-400 text-slate-950"
                                    : "bg-slate-800 text-slate-300"
                                }`}
                              >
                                {lab.id}
                              </span>
                              <span className="text-[11px] leading-snug line-clamp-2">
                                {lab.title}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* 3. Subject Learning Resources Quick Link */}
                  <button
                    type="button"
                    onClick={() => onSelectResourceTab("resources", domId)}
                    className="w-full py-1.5 px-2.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-[11px] font-mono text-purple-300 flex items-center justify-between cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-purple-400" />
                      Subject {domId} Formulas, ICs &amp; Viva Q&amp;A
                    </span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {/* Dedicated Learning Resources & Reference Library Card in Sidebar */}
        <div className="rounded-2xl border border-purple-500/30 bg-[#11182b] p-3 space-y-2">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-purple-300 uppercase tracking-wider">
            <BookOpen className="w-4 h-4 text-purple-400" />
            Learning Resources &amp; Guides
          </div>
          <div className="space-y-1">
            {[
              {
                tab: "components" as ActiveTabId,
                label: "3D Component Library",
                desc: "Manufactured Packages, Pinouts & Datasheets",
              },
              {
                tab: "student-learning" as ActiveTabId,
                label: "Guided Labs & Viva Hub",
                desc: "23 Structured Experiments & Formal Lab Reports",
              },
              {
                tab: "resources" as ActiveTabId,
                label: "All 5 Subjects Formula & Viva Hub",
                desc: "Theorems, IC Pinouts (741, 555, 74LS) & Q&A",
              },
              {
                tab: "guide" as ActiveTabId,
                label: "9-Unit University Syllabus Guide",
                desc: "Curriculum Breakdown & Equations",
              },
              {
                tab: "glossary" as ActiveTabId,
                label: "Engineering Technical Glossary",
                desc: "Searchable Definitions & Relations",
              },
              {
                tab: "checklist" as ActiveTabId,
                label: "Design & Lab Verification Checklist",
                desc: "Timing, Power, DRC & Sign-Off",
              },
              {
                tab: "contact" as ActiveTabId,
                label: "Contact Us & Suggestions",
                desc: "Abdul Rauf · WhatsApp +923215339417 · raufalvi32@gmail.com",
              },
            ].map((res) => (
              <button
                key={res.tab}
                type="button"
                onClick={() => onSelectResourceTab(res.tab, "ALL")}
                className={`w-full text-left p-2 rounded-xl border transition-colors cursor-pointer ${
                  activeTab === res.tab
                    ? "bg-purple-500/20 border-purple-400/60 text-white"
                    : "bg-slate-900/70 border-slate-800 text-slate-300 hover:bg-slate-900"
                }`}
              >
                <div className="text-xs font-semibold text-white">
                  {res.label}
                </div>
                <div className="text-[10px] text-slate-400">{res.desc}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}
