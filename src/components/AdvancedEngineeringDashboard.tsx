import React, { useState, useMemo } from "react";
import {
  Search,
  X,
  Play,
  BookOpen,
  FileText,
  Sliders,
  Activity,
  Cpu,
  Layers,
  Zap,
  GraduationCap,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import {
  MASTER_DOMAINS,
  MASTER_75_LABS,
  MasterDomainId,
  MasterLabItem,
} from "../data/master75Labs";
import { ActiveTabId } from "./CurriculumGuide";
import { PresetNodeDef, PresetWireDef } from "../data/logicSpecs";

interface AdvancedEngineeringDashboardProps {
  onNavigateTab: (tab: ActiveTabId) => void;
  onOpenLabSlideDeck: (labId: string, domain: MasterDomainId) => void;
  onOpenLabInWorkbench: (labId: string, domain: MasterDomainId) => void;
  onOpenFullWindowCanvas: (circuit?: {
    title: string;
    nodes: PresetNodeDef[];
    wires: PresetWireDef[];
  }) => void;
  onOpenGeneralSchematic?: () => void;
  studentProfile?: { name: string; university: string } | null;
  onEditProfile?: () => void;
}

interface UniversityCourse {
  domainId: MasterDomainId;
  code: string;
  name: string;
  semester: string;
  description: string;
}

const UNIVERSITY_COURSES: UniversityCourse[] = [
  {
    domainId: "A",
    code: "EE-211",
    name: "Linear Circuit Analysis",
    semester: "Semester 3",
    description: "Ohm's Law, KVL/KCL, Thevenin/Norton theorems, RLC transient & frequency response.",
  },
  {
    domainId: "B",
    code: "EE-221",
    name: "Electronic Devices & Circuits",
    semester: "Semester 4",
    description: "Diode characteristics, rectifiers, BJT biasing & amplifiers, MOSFETs, and small-signal models.",
  },
  {
    domainId: "C",
    code: "EE-231",
    name: "Digital Logic Design",
    semester: "Semester 3",
    description: "Boolean algebra, logic gates, combinational MSI circuits, flip-flops, counters, and FSMs.",
  },
  {
    domainId: "D",
    code: "EE-311",
    name: "Power Electronics",
    semester: "Semester 5",
    description: "SCR/TRIAC phase control, switching converters, inverters, and power semiconductor drives.",
  },
  {
    domainId: "E",
    code: "EE-321",
    name: "Linear Integrated Circuits",
    semester: "Semester 5",
    description: "Operational amplifiers (LM741/LM358), active filters, precision 555 timers, and comparators.",
  },
];

export default function AdvancedEngineeringDashboard({
  onNavigateTab,
  onOpenLabSlideDeck,
  onOpenLabInWorkbench,
  onOpenFullWindowCanvas,
  onOpenGeneralSchematic,
  studentProfile,
  onEditProfile,
}: AdvancedEngineeringDashboardProps) {
  const [selectedDomain, setSelectedDomain] = useState<MasterDomainId>("C");
  const [labSearchQuery, setLabSearchQuery] = useState<string>("");
  const [isCatalogDrawerOpen, setIsCatalogDrawerOpen] = useState<boolean>(false);
  const [catalogSubjectFilter, setCatalogSubjectFilter] = useState<MasterDomainId | "ALL">("ALL");
  const [catalogSearchQuery, setCatalogSearchQuery] = useState<string>("");

  const activeCourse = useMemo(() => {
    return (
      UNIVERSITY_COURSES.find((c) => c.domainId === selectedDomain) ||
      UNIVERSITY_COURSES[0]
    );
  }, [selectedDomain]);

  const courseLabs = useMemo(() => {
    return MASTER_75_LABS.filter((lab) => lab.domain === selectedDomain);
  }, [selectedDomain]);

  const filteredCourseLabs = useMemo(() => {
    if (!labSearchQuery.trim()) return courseLabs;
    const q = labSearchQuery.toLowerCase().trim();
    return courseLabs.filter(
      (lab) =>
        lab.id.toLowerCase().includes(q) ||
        lab.title.toLowerCase().includes(q) ||
        lab.objective.toLowerCase().includes(q) ||
        lab.category.toLowerCase().includes(q)
    );
  }, [courseLabs, labSearchQuery]);

  const catalogFilteredLabs = useMemo(() => {
    return MASTER_75_LABS.filter((lab) => {
      if (catalogSubjectFilter !== "ALL" && lab.domain !== catalogSubjectFilter) {
        return false;
      }
      if (catalogSearchQuery.trim()) {
        const q = catalogSearchQuery.toLowerCase().trim();
        return (
          lab.id.toLowerCase().includes(q) ||
          lab.title.toLowerCase().includes(q) ||
          lab.objective.toLowerCase().includes(q) ||
          (lab.formula && lab.formula.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [catalogSubjectFilter, catalogSearchQuery]);

  const handleStartBlankCanvas = () => {
    if (onOpenGeneralSchematic) {
      onOpenGeneralSchematic();
    } else {
      onOpenFullWindowCanvas({
        title: "Custom Schematic (Empty Canvas)",
        nodes: [],
        wires: [],
      });
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto py-4 font-sans text-slate-100">
      {/* 1. Header: Real, Academic, Clean */}
      <div className="bg-[#0e1628] border border-slate-800 rounded-2xl p-6 sm:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <span className="font-semibold text-cyan-400">
                {studentProfile?.university || "Engineering Workbench"}
              </span>
              <span aria-hidden="true">·</span>
              <span>Department of Electrical Engineering</span>
              <span aria-hidden="true">·</span>
              <span>Virtual Laboratory Station</span>
            </div>

            <div className="flex flex-wrap items-baseline gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                Welcome, {studentProfile?.name || "Student Researcher"}
              </h1>
              {onEditProfile && (
                <button
                  type="button"
                  onClick={onEditProfile}
                  className="text-xs text-cyan-400 hover:text-cyan-300 hover:underline cursor-pointer transition-colors"
                >
                  Edit Profile
                </button>
              )}
            </div>

            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              Complete engineering workbench for circuit simulation, real-time measurements, and curriculum lab experiments across analog, digital, and power electronics.
            </p>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={handleStartBlankCanvas}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-sm transition-all cursor-pointer shadow-md hover:shadow-cyan-500/20"
            >
              <Play className="w-4 h-4 fill-slate-950" />
              <span>Start Blank Canvas</span>
            </button>

            <button
              type="button"
              onClick={() => setIsCatalogDrawerOpen(true)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700 font-semibold text-sm transition-colors cursor-pointer"
            >
              <BookOpen className="w-4 h-4 text-cyan-400" />
              <span>Browse All 75 Labs</span>
            </button>
          </div>
        </div>

        {/* Real Summary Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800/80 text-xs text-slate-400">
          <div>
            <div className="text-white font-bold text-base">5 Courses</div>
            <div>Full EE Curriculum</div>
          </div>
          <div>
            <div className="text-white font-bold text-base">75 Lab Manuals</div>
            <div>Step-by-Step Guides</div>
          </div>
          <div>
            <div className="text-white font-bold text-base">60+ Components</div>
            <div>Analog, Digital &amp; Power</div>
          </div>
          <div>
            <div className="text-white font-bold text-base">Virtual Instruments</div>
            <div>Oscilloscope, Logic Analyzer, DMM</div>
          </div>
        </div>
      </div>

      {/* 2. Core Workstation Pillars */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
            Primary Workstations
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            type="button"
            onClick={() => onNavigateTab("lab")}
            className="p-5 rounded-xl bg-[#0e1628] border border-slate-800 hover:border-cyan-500/50 hover:bg-[#121c33] transition-all text-left flex flex-col justify-between group cursor-pointer"
          >
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition-transform">
                <Sliders className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors">
                Schematic Workbench
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Interactive drag-and-drop circuit simulator with live signal flow, wire probing, and real-time outputs.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-400 mt-4">
              <span>Open Simulator</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigateTab("master-75")}
            className="p-5 rounded-xl bg-[#0e1628] border border-slate-800 hover:border-purple-500/50 hover:bg-[#121c33] transition-all text-left flex flex-col justify-between group cursor-pointer"
          >
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 group-hover:scale-105 transition-transform">
                <BookOpen className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white group-hover:text-purple-300 transition-colors">
                75 Lab Manuals
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Complete university laboratory manuals with theory, circuit diagrams, formulas, and slide decks.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-400 mt-4">
              <span>View Manuals</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigateTab("multisim")}
            className="p-5 rounded-xl bg-[#0e1628] border border-slate-800 hover:border-emerald-500/50 hover:bg-[#121c33] transition-all text-left flex flex-col justify-between group cursor-pointer"
          >
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                <Activity className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white group-hover:text-emerald-300 transition-colors">
                Multisim SPICE Solver
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Modified Nodal Analysis (MNA) engine with Bode frequency plots, transient sweeps, and virtual meters.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 mt-4">
              <span>Launch SPICE</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigateTab("resources")}
            className="p-5 rounded-xl bg-[#0e1628] border border-slate-800 hover:border-amber-500/50 hover:bg-[#121c33] transition-all text-left flex flex-col justify-between group cursor-pointer"
          >
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white group-hover:text-amber-300 transition-colors">
                Learning Resources
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Reference formula sheets, 74xx IC pinout diagrams, truth tables, and academic study notes.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400 mt-4">
              <span>Explore Guides</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>
        </div>
      </div>

      {/* 3. Real Courseware & Experiments Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white">
              Curriculum Laboratory Experiments
            </h2>
            <p className="text-xs text-slate-400">
              Select an engineering course below to browse its 15 assigned experiments.
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search experiments..."
              value={labSearchQuery}
              onChange={(e) => setLabSearchQuery(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 bg-[#0e1628] border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
            />
            {labSearchQuery && (
              <button
                type="button"
                onClick={() => setLabSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Course Tabs (Clean segmented bar) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 p-1.5 bg-[#0a0f1d] border border-slate-800 rounded-xl">
          {UNIVERSITY_COURSES.map((course) => {
            const isSelected = selectedDomain === course.domainId;
            return (
              <button
                key={course.code}
                type="button"
                onClick={() => {
                  setSelectedDomain(course.domainId);
                  setLabSearchQuery("");
                }}
                className={`p-2.5 rounded-lg text-left transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? "bg-[#14233c] text-white border border-cyan-500/40 shadow-xs"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold font-mono ${isSelected ? "text-cyan-300" : "text-slate-400"}`}>
                    {course.code}
                  </span>
                  <span className="text-[10px] text-slate-500">15 Labs</span>
                </div>
                <span className="text-xs font-semibold truncate mt-0.5">
                  {course.name}
                </span>
              </button>
            );
          })}
        </div>

        {/* Course Description Banner */}
        <div className="p-3.5 rounded-xl bg-[#0e1628] border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="space-y-0.5">
            <div className="font-bold text-white flex items-center gap-2">
              <span>{activeCourse.code} · {activeCourse.name}</span>
              <span className="text-slate-400">({activeCourse.semester})</span>
            </div>
            <p className="text-slate-400">
              {activeCourse.description}
            </p>
          </div>
          <button
            type="button"
            onClick={handleStartBlankCanvas}
            className="text-cyan-400 hover:text-cyan-300 hover:underline font-semibold shrink-0 cursor-pointer"
          >
            + Start Custom {activeCourse.code} Circuit
          </button>
        </div>

        {/* Experiments List */}
        <div className="space-y-2.5">
          {filteredCourseLabs.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 bg-[#0e1628] rounded-xl border border-slate-800">
              No experiments found matching &quot;{labSearchQuery}&quot; in {activeCourse.code}.
            </div>
          ) : (
            filteredCourseLabs.map((lab) => (
              <div
                key={lab.id}
                className="p-4 rounded-xl bg-[#0e1628] border border-slate-800 hover:border-slate-700 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-mono font-bold text-cyan-300 bg-cyan-950/70 border border-cyan-800/60 px-2 py-0.5 rounded">
                      {lab.id}
                    </span>
                    <span className="text-slate-400 font-medium">
                      {lab.category}
                    </span>
                    {lab.formula && (
                      <>
                        <span aria-hidden="true" className="text-slate-600">·</span>
                        <span className="text-slate-400 font-mono text-[11px] truncate max-w-xs">
                          {lab.formula}
                        </span>
                      </>
                    )}
                  </div>

                  <h3 className="text-sm font-bold text-white leading-snug">
                    {lab.title}
                  </h3>

                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {lab.objective}
                  </p>
                </div>

                <div className="flex items-center gap-2.5 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-800">
                  <button
                    type="button"
                    onClick={() => onOpenLabInWorkbench(lab.id, lab.domain)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs transition-colors cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-slate-950" />
                    <span>Launch Simulator</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onOpenLabSlideDeck(lab.id, lab.domain)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5 text-purple-400" />
                    <span>Lab Manual</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 4. Full Catalog Slide-Out Drawer */}
      {isCatalogDrawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden animate-in fade-in duration-150">
          <div
            onClick={() => setIsCatalogDrawerOpen(false)}
            className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-2xl bg-[#090e1a] border-l border-slate-800 shadow-2xl flex flex-col h-full overflow-hidden animate-in slide-in-from-right duration-200">
              {/* Drawer Header */}
              <div className="p-5 border-b border-slate-800 bg-[#0e1628] flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-white">
                    All 75 Engineering Laboratory Manuals
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Browse and launch experiments across all 5 curriculum disciplines.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsCatalogDrawerOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Filter & Search */}
              <div className="p-4 bg-[#0a0f1d] border-b border-slate-800 space-y-3">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                  <button
                    type="button"
                    onClick={() => setCatalogSubjectFilter("ALL")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer border ${
                      catalogSubjectFilter === "ALL"
                        ? "bg-cyan-500/20 border-cyan-400 text-cyan-200 font-bold"
                        : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    All 75 Labs
                  </button>

                  {UNIVERSITY_COURSES.map((c) => {
                    const isSelected = catalogSubjectFilter === c.domainId;
                    return (
                      <button
                        key={c.code}
                        type="button"
                        onClick={() => setCatalogSubjectFilter(c.domainId)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer border ${
                          isSelected
                            ? "bg-cyan-500/20 border-cyan-400 text-cyan-200 font-bold"
                            : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                        }`}
                      >
                        {c.code}
                      </button>
                    );
                  })}
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search by experiment title, ID, or formula..."
                    value={catalogSearchQuery}
                    onChange={(e) => setCatalogSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-[#0e1628] border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              {/* Drawer Lab List */}
              <div className="p-5 overflow-y-auto flex-1 space-y-3 scrollbar-thin">
                {catalogFilteredLabs.length === 0 ? (
                  <p className="text-xs text-slate-500 py-10 text-center">
                    No experiments found matching your search.
                  </p>
                ) : (
                  catalogFilteredLabs.map((lab) => (
                    <div
                      key={lab.id}
                      className="p-4 rounded-xl bg-[#0e1628] border border-slate-800 hover:border-slate-700 transition-colors space-y-2.5"
                    >
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-mono font-bold text-cyan-300 bg-cyan-950/70 border border-cyan-800/60 px-2 py-0.5 rounded">
                          {lab.id}
                        </span>
                        <span className="text-slate-400">
                          {UNIVERSITY_COURSES.find((c) => c.domainId === lab.domain)?.code} · {lab.category}
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-white">
                        {lab.title}
                      </h4>

                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                        {lab.objective}
                      </p>

                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                        <button
                          type="button"
                          onClick={() => {
                            setIsCatalogDrawerOpen(false);
                            onOpenLabInWorkbench(lab.id, lab.domain);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-semibold transition-colors cursor-pointer"
                        >
                          <Play className="w-3 h-3 fill-slate-950" />
                          <span>Launch Simulator</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            onOpenLabSlideDeck(lab.id, lab.domain);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-xs font-medium transition-colors cursor-pointer"
                        >
                          <FileText className="w-3 h-3 text-purple-400" />
                          <span>Manual &amp; Slides</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Drawer Footer */}
              <div className="p-4 border-t border-slate-800 bg-[#0e1628] flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setIsCatalogDrawerOpen(false);
                    handleStartBlankCanvas();
                  }}
                  className="text-cyan-400 hover:underline cursor-pointer"
                >
                  + Start Blank Workbench Canvas
                </button>

                <button
                  type="button"
                  onClick={() => setIsCatalogDrawerOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
