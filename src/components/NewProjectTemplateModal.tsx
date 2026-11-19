import React, { useMemo, useState } from "react";
import {
  CIRCUIT_PROJECT_TEMPLATES,
  CircuitProjectTemplate,
  TemplateCategory,
} from "../data/circuitProjectTemplates";
import {
  Activity,
  Cpu,
  FilePlus2,
  FolderKanban,
  Layers,
  Play,
  Search,
  X,
  Zap,
} from "lucide-react";

interface NewProjectTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: CircuitProjectTemplate) => void;
  onCreateBlank: () => void;
}

const CATEGORIES: TemplateCategory[] = [
  "ALL",
  "Oscillators & Timing",
  "74LS Digital & Counters",
  "Analog & Amplifiers",
  "Power & Switching",
];

export default function NewProjectTemplateModal({
  isOpen,
  onClose,
  onSelectTemplate,
  onCreateBlank,
}: NewProjectTemplateModalProps) {
  const [category, setCategory] = useState<TemplateCategory>("ALL");
  const [query, setQuery] = useState("");
  const [previewId, setPreviewId] = useState<string>(
    CIRCUIT_PROJECT_TEMPLATES[0]?.id ?? ""
  );

  const filteredTemplates = useMemo(() => {
    const q = query.trim().toLowerCase();
    return CIRCUIT_PROJECT_TEMPLATES.filter((t) => {
      const catOk = category === "ALL" || t.category === category;
      const qOk =
        !q ||
        t.name.toLowerCase().includes(q) ||
        t.shortTag.toLowerCase().includes(q) ||
        t.summary.toLowerCase().includes(q) ||
        t.bom.some((b) => b.toLowerCase().includes(q));
      return catOk && qOk;
    });
  }, [category, query]);

  const activePreview =
    filteredTemplates.find((t) => t.id === previewId) ||
    filteredTemplates[0] ||
    CIRCUIT_PROJECT_TEMPLATES[0];

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label="New Project Template Library"
    >
      <div className="bg-[#0b1220] border border-[#24344D] rounded-2xl w-full max-w-5xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1E2B42] bg-[#111B2B]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/35 flex items-center justify-center shrink-0">
              <FolderKanban className="w-5 h-5 text-cyan-400" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-[#F3F6FA] tracking-tight truncate">
                New Project Template Library
              </h3>
              <p className="text-xs text-[#9AA6BA] truncate">
                Initialize verified base topologies for SPICE MNA, procedural animations, and 3D workbench inspection
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg bg-[#162338] hover:bg-[#1E2E49] border border-[#24344D] text-[#9AA6BA] hover:text-white cursor-pointer transition-colors shrink-0"
            aria-label="Close Template Library"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filter & Search */}
        <div className="px-6 py-3 bg-[#0e1728] border-b border-[#1E2B42] flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer border ${
                  category === cat
                    ? "bg-cyan-500/20 border-cyan-400/70 text-cyan-200"
                    : "bg-[#111B2B] border-[#24344D] text-[#9AA6BA] hover:text-white"
                }`}
              >
                {cat === "ALL" ? "All Templates" : cat}
              </button>
            ))}
          </div>

          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 text-[#7F8BA3] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter 555, 74LS, BC547..."
              className="w-full pl-8 pr-3 py-1.5 bg-[#0B1220] border border-[#24344D] rounded-lg text-xs text-[#E2E8F0] placeholder-[#64748B] focus:outline-none focus:border-cyan-400 font-mono"
            />
          </div>
        </div>

        {/* Split Content: Template Grid + Engineering Spec Preview */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          {/* Left: Template Cards */}
          <div className="lg:col-span-7 overflow-y-auto p-5 grid grid-cols-1 sm:grid-cols-2 gap-3.5 content-start border-b lg:border-b-0 lg:border-r border-[#1E2B42]">
            {/* Blank Project Option */}
            <button
              type="button"
              onClick={() => {
                onCreateBlank();
                onClose();
              }}
              className="p-4 rounded-xl border border-dashed border-emerald-500/45 bg-emerald-950/15 hover:bg-emerald-950/25 hover:border-emerald-400 text-left transition-all cursor-pointer flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-xs font-mono font-bold text-emerald-300 flex items-center gap-1.5">
                    <FilePlus2 className="w-3.5 h-3.5" />
                    Blank Schematic
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400/90">
                    Empty Canvas
                  </span>
                </div>
                <p className="text-xs text-[#9AA6BA] leading-relaxed">
                  Start with an open breadboard workspace and place components manually.
                </p>
              </div>
              <div className="mt-3 pt-2.5 border-t border-emerald-500/20 text-[11px] font-mono font-semibold text-emerald-300">
                Initialize Empty Workspace →
              </div>
            </button>

            {filteredTemplates.map((tpl) => {
              const isSelected = activePreview?.id === tpl.id;
              return (
                <div
                  key={tpl.id}
                  onClick={() => setPreviewId(tpl.id)}
                  onDoubleClick={() => {
                    onSelectTemplate(tpl);
                    onClose();
                  }}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? "bg-[#152238] border-cyan-400/80 shadow-[0_0_0_1px_rgba(34,211,238,0.3)]"
                      : "bg-[#111B2B] border-[#1E2B42] hover:border-[#32486E] hover:bg-[#142033]"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 text-[10.5px] font-mono text-[#8B97AD] mb-1.5">
                      <span className="text-cyan-300 font-semibold truncate">
                        {tpl.shortTag}
                      </span>
                      <span className="shrink-0 tabular-nums">
                        {tpl.nodes.length} nodes · {tpl.wires.length} nets
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-[#F3F6FA] leading-snug mb-1.5">
                      {tpl.name}
                    </h4>
                    <p className="text-xs text-[#9AA6BA] line-clamp-2 leading-relaxed">
                      {tpl.summary}
                    </p>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-[#1E2B42] flex items-center justify-between gap-2 text-[11px] font-mono">
                    <span className="text-[#8B97AD]">
                      {tpl.category} · {tpl.difficulty}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectTemplate(tpl);
                        onClose();
                      }}
                      className="text-cyan-300 hover:text-cyan-200 font-bold cursor-pointer whitespace-nowrap shrink-0"
                    >
                      Use Template →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right: Selected Template Engineering Specification */}
          {activePreview && (
            <div className="lg:col-span-5 overflow-y-auto p-5 bg-[#0d1626] flex flex-col justify-between gap-4">
              <div className="space-y-4">
                <div>
                  <div className="text-[11px] font-mono text-cyan-300 mb-1">
                    {activePreview.category} · {activePreview.difficulty}
                  </div>
                  <h4 className="text-lg font-bold text-white leading-tight">
                    {activePreview.name}
                  </h4>
                  <p className="text-xs text-[#A3B1C6] mt-2 leading-relaxed">
                    {activePreview.summary}
                  </p>
                </div>

                {/* Telemetry Preview */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2.5 rounded-lg bg-[#111B2B] border border-[#1E2B42]">
                    <div className="text-[10px] font-mono text-[#7F8BA3]">NODES</div>
                    <div className="text-sm font-mono font-bold text-white tabular-nums mt-0.5">
                      {activePreview.nodes.length}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#111B2B] border border-[#1E2B42]">
                    <div className="text-[10px] font-mono text-[#7F8BA3]">NETS</div>
                    <div className="text-sm font-mono font-bold text-white tabular-nums mt-0.5">
                      {activePreview.wires.length}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#111B2B] border border-[#1E2B42]">
                    <div className="text-[10px] font-mono text-[#7F8BA3]">SPICE FREQ</div>
                    <div className="text-sm font-mono font-bold text-emerald-300 tabular-nums mt-0.5">
                      {activePreview.defaultFreqHz > 0
                        ? `${activePreview.defaultFreqHz} Hz`
                        : "DC Bias"}
                    </div>
                  </div>
                </div>

                {/* Theory & Expected Behavior */}
                <div className="p-3.5 rounded-xl bg-[#111B2B] border border-[#1E2B42] space-y-2.5">
                  <div>
                    <div className="text-[10.5px] font-mono font-bold text-cyan-300 flex items-center gap-1.5 mb-1">
                      <Zap className="w-3.5 h-3.5" />
                      CIRCUIT EQUATION & TOPOLOGY
                    </div>
                    <p className="text-xs text-[#B7C3D6] leading-relaxed font-mono">
                      {activePreview.theoryNote}
                    </p>
                  </div>
                  <div className="pt-2 border-t border-[#1E2B42]">
                    <div className="text-[10.5px] font-mono font-bold text-emerald-300 flex items-center gap-1.5 mb-1">
                      <Activity className="w-3.5 h-3.5" />
                      SIMULATION RESPONSE
                    </div>
                    <p className="text-xs text-[#B7C3D6] leading-relaxed">
                      {activePreview.expectedBehavior}
                    </p>
                  </div>
                </div>

                {/* Bill of Materials */}
                <div>
                  <div className="text-[10.5px] font-mono font-bold text-[#9AA6BA] flex items-center gap-1.5 mb-2">
                    <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                    COMPONENT BILL OF MATERIALS
                  </div>
                  <ul className="space-y-1.5">
                    {activePreview.bom.map((item) => (
                      <li
                        key={item}
                        className="text-xs font-mono text-[#CBD5E1] flex items-center gap-2"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="pt-3 border-t border-[#1E2B42] flex items-center justify-between gap-3">
                <span className="text-[11px] font-mono text-[#7F8BA3] flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  {activePreview.autoStartClock
                    ? "Auto-starts SPICE clock"
                    : "Ready for MNA & probes"}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    onSelectTemplate(activePreview);
                    onClose();
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-mono text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Play className="w-3.5 h-3.5 fill-slate-950" />
                  Initialize Template
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
