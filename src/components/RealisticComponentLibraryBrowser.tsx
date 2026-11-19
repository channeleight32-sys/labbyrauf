import React, { useState, useMemo, useEffect } from "react";
import {
  Search,
  Sparkles,
  Info,
  Zap,
  Eye,
} from "lucide-react";
import {
  REALISTIC_COMPONENTS,
  RealisticComponentDef,
} from "../data/realisticComponentsData";
import RealisticComponentRenderer from "./RealisticComponentRenderer";
import ComponentPinoutPopover, {
  realisticComponentToPinoutData,
} from "./ComponentPinoutPopover";

interface RealisticComponentLibraryBrowserProps {
  onSelectComponentForInspection: (componentId: string) => void;
  onAddCompToWorkbench?: (componentId: string) => void;
}

export type EngineeringCategoryId =
  | "ALL"
  | "Resistors"
  | "Capacitors"
  | "Inductors"
  | "Diodes"
  | "Transistors"
  | "MOSFETs"
  | "Op-Amps"
  | "Logic Gates"
  | "Timers"
  | "Sensors"
  | "Microcontrollers"
  | "Power Regulators"
  | "Actuators"
  | "Communication Modules";

const ENGINEERING_CATEGORIES: { id: EngineeringCategoryId; label: string }[] = [
  { id: "ALL", label: "All Components" },
  { id: "Resistors", label: "Resistors" },
  { id: "Capacitors", label: "Capacitors" },
  { id: "Inductors", label: "Inductors" },
  { id: "Diodes", label: "Diodes" },
  { id: "Transistors", label: "Transistors" },
  { id: "MOSFETs", label: "MOSFETs" },
  { id: "Op-Amps", label: "Op-Amps" },
  { id: "Logic Gates", label: "Logic Gates" },
  { id: "Timers", label: "Timers" },
  { id: "Sensors", label: "Sensors" },
  { id: "Microcontrollers", label: "Microcontrollers" },
  { id: "Power Regulators", label: "Power Regulators" },
  { id: "Actuators", label: "Actuators" },
  { id: "Communication Modules", label: "Communication Modules" },
];

export function getEngineeringCategoryForComponent(
  comp: RealisticComponentDef
): Exclude<EngineeringCategoryId, "ALL"> {
  const id = comp.id.toUpperCase();
  const name = comp.name.toUpperCase();

  if (id.startsWith("SENSOR_") || name.includes("PHOTODIODE") || name.includes("PHOTORESISTOR") || name.includes("TEMPERATURE SENSOR") || name.includes("ULTRASONIC")) {
    return "Sensors";
  }
  if (id.startsWith("RES_") || id.startsWith("POT_")) {
    return "Resistors";
  }
  if (id.startsWith("CAP_")) {
    return "Capacitors";
  }
  if (id.startsWith("IND_") || id.startsWith("TRANSFORMER") || id.startsWith("XTAL_")) {
    return "Inductors";
  }
  if (id.startsWith("MOSFET_")) {
    return "MOSFETs";
  }
  if (
    id.startsWith("BJT_") ||
    id.startsWith("OPTOCOUPLER_") ||
    id.startsWith("THYRISTOR_") ||
    id.startsWith("TRIAC_") ||
    id.startsWith("DIAC_")
  ) {
    return "Transistors";
  }
  if (id.startsWith("DIODE_") || id.startsWith("ZENER_") || id.startsWith("LED_") || id === "BRIDGE_RECT") {
    return "Diodes";
  }
  if (id.includes("LM741") || id.includes("LM358") || id.includes("LM339")) {
    return "Op-Amps";
  }
  if (id.includes("74LS") || id.includes("CD4017")) {
    return "Logic Gates";
  }
  if (id.includes("NE555") || name.includes("TIMER")) {
    return "Timers";
  }
  if (id.includes("7805") || id.includes("BUCK") || comp.category === "power_electronics") {
    return "Power Regulators";
  }
  if (id.includes("ARDUINO") || id.includes("ESP32") || id.includes("RPI_PICO")) {
    return "Microcontrollers";
  }
  if (id.startsWith("MODULE_") || name.includes("LORA") || name.includes("BLUETOOTH") || name.includes("NRF24")) {
    return "Communication Modules";
  }
  return "Actuators";
}

export default function RealisticComponentLibraryBrowser({
  onSelectComponentForInspection,
  onAddCompToWorkbench,
}: RealisticComponentLibraryBrowserProps) {
  const [selectedCategory, setSelectedCategory] = useState<EngineeringCategoryId>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [displayMode, setDisplayMode] = useState<"REALISTIC" | "SCHEMATIC">("SCHEMATIC");
  const [hoveredPinout, setHoveredPinout] = useState<{
    comp: RealisticComponentDef;
    rect: DOMRect;
  } | null>(null);

  useEffect(() => {
    if (!hoveredPinout) return;
    const dismiss = () => setHoveredPinout(null);
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    window.addEventListener("scroll", dismiss, true);
    window.addEventListener("resize", dismiss);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("scroll", dismiss, true);
      window.removeEventListener("resize", dismiss);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [hoveredPinout]);

  const componentList = useMemo(() => {
    return Object.values(REALISTIC_COMPONENTS);
  }, []);

  const categoryCounts = useMemo(() => {
    const counts: Record<EngineeringCategoryId, number> = {
      ALL: componentList.length,
      Resistors: 0,
      Capacitors: 0,
      Inductors: 0,
      Diodes: 0,
      Transistors: 0,
      MOSFETs: 0,
      "Op-Amps": 0,
      "Logic Gates": 0,
      Timers: 0,
      Sensors: 0,
      Microcontrollers: 0,
      "Power Regulators": 0,
      Actuators: 0,
      "Communication Modules": 0,
    };
    for (const c of componentList) {
      const cat = getEngineeringCategoryForComponent(c);
      counts[cat] += 1;
    }
    return counts;
  }, [componentList]);

  const filteredComponents = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return componentList.filter((comp) => {
      const engCat = getEngineeringCategoryForComponent(comp);
      const matchCat = selectedCategory === "ALL" || engCat === selectedCategory;
      if (!matchCat) return false;
      if (!q) return true;
      return (
        comp.name.toLowerCase().includes(q) ||
        comp.partNumber.toLowerCase().includes(q) ||
        comp.manufacturer.toLowerCase().includes(q) ||
        comp.packageDescription.toLowerCase().includes(q) ||
        engCat.toLowerCase().includes(q) ||
        comp.typicalApplications.some((a) => a.toLowerCase().includes(q))
      );
    });
  }, [componentList, selectedCategory, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Top Filter & Mode Switcher Bar */}
      <div className="bg-[#0D1424] border border-[#1E293B] rounded-2xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs font-mono text-cyan-400 font-semibold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              14-CATEGORY ELECTRONIC COMPONENT REPOSITORY
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-white mt-0.5 tracking-tight">
              Comprehensive Multi-Domain Component Library
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              Verified components with physical 2D/3D packages, IEEE/IEC circuit symbols, pinouts,
              ratings, and direct workbench insertion across all 14 engineering categories.
            </p>
          </div>

          {/* Mode Switcher: Real Component Mode vs Schematic Mode */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-400 hidden sm:inline">View Mode:</span>
            <div className="flex items-center bg-[#070B14] border border-slate-800 rounded-xl p-1">
              <button
                type="button"
                onClick={() => setDisplayMode("REALISTIC")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  displayMode === "REALISTIC"
                    ? "bg-cyan-400 text-slate-950"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Real Package (2D/3D)
              </button>
              <button
                type="button"
                onClick={() => setDisplayMode("SCHEMATIC")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  displayMode === "SCHEMATIC"
                    ? "bg-cyan-400 text-slate-950"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Schematic Symbol (IEEE)
              </button>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2 border-t border-slate-800/80">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search 14 categories (e.g. IRF540N, NE555, LM741, HC-SR04, 74LS00, ESP32, 1N4007)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-16 py-2.5 rounded-xl bg-[#070B14] border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors font-mono"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          <div className="text-xs font-mono text-cyan-400 self-center tabular-nums">
            {filteredComponents.length} / {componentList.length} Components · Hover card for schematic pinout
          </div>
        </div>

        {/* All 14 Engineering Category Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {ENGINEERING_CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            const count = categoryCounts[cat.id];
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer border ${
                  isSelected
                    ? "bg-cyan-500/15 text-cyan-300 border-cyan-400/70 font-semibold"
                    : "bg-[#070B14] text-slate-400 hover:text-white border-slate-800"
                }`}
              >
                <span>{cat.label}</span>
                <span
                  className={`text-[10px] font-mono tabular-nums px-1.5 py-0.2 rounded ${
                    isSelected ? "bg-cyan-400/20 text-cyan-200" : "bg-slate-800 text-slate-500"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Component Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredComponents.map((comp) => {
          const engCat = getEngineeringCategoryForComponent(comp);
          return (
            <div
              key={comp.id}
              onMouseEnter={(e) =>
                setHoveredPinout({
                  comp,
                  rect: e.currentTarget.getBoundingClientRect(),
                })
              }
              onMouseLeave={() =>
                setHoveredPinout((prev) => (prev?.comp.id === comp.id ? null : prev))
              }
              onFocusCapture={(e) =>
                setHoveredPinout({
                  comp,
                  rect: e.currentTarget.getBoundingClientRect(),
                })
              }
              onBlurCapture={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                  setHoveredPinout((prev) => (prev?.comp.id === comp.id ? null : prev));
                }
              }}
              className="group bg-[#0D1424] border border-[#1E293B] hover:border-cyan-400/60 rounded-2xl p-4 transition-all flex flex-col justify-between gap-3.5"
            >
              {/* Card Header */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-cyan-400 font-bold truncate max-w-[140px]">
                    {comp.partNumber}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-[#070B14] border border-slate-800 text-slate-400">
                    {engCat}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-white line-clamp-1">
                  {comp.name}
                </h4>
                <div className="text-[11px] text-slate-400 font-mono truncate">
                  {comp.manufacturer} · {comp.terminals.length} Pins · {comp.packageDescription.split(",")[0]}
                </div>
              </div>

              {/* Component Artwork Box (Real vs Schematic) */}
              <div
                onClick={() => onSelectComponentForInspection(comp.id)}
                className="w-full h-32 rounded-xl bg-[#070B14] border border-slate-800/80 p-2 flex items-center justify-center cursor-pointer group-hover:border-cyan-500/50 transition-colors relative overflow-hidden"
              >
                <div
                  className="absolute inset-0 opacity-10 pointer-events-none"
                  style={{
                    backgroundImage:
                      "linear-gradient(to right, #38bdf8 1px, transparent 1px), linear-gradient(to bottom, #38bdf8 1px, transparent 1px)",
                    backgroundSize: "16px 16px",
                  }}
                />

                <div className="w-full h-full flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
                  <RealisticComponentRenderer
                    type={comp.id}
                    mode={displayMode}
                    width={180}
                    height={100}
                    formattedValue={comp.defaultValues?.formattedValue}
                    isConducting={false}
                  />
                </div>

                <div className="absolute bottom-2 left-2 text-[10px] font-mono text-slate-400 group-hover:text-cyan-300 transition-colors">
                  Pinout ({comp.terminals.length} pins)
                </div>

                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-[#0D1424]/95 text-cyan-300 text-[10px] font-mono px-2 py-0.5 rounded border border-cyan-400/40">
                  Inspect 3D
                </div>
              </div>

              {/* Pinout Snippet & Action Buttons */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span>{comp.isPolarized ? "Polarized (+/-)" : "Bidirectional"}</span>
                  <span className="text-emerald-400 truncate max-w-[130px] tabular-nums">
                    {comp.defaultValues?.formattedValue || comp.electricalCharacteristics[0]?.typical || "Active"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => onSelectComponentForInspection(comp.id)}
                    className="w-full py-2 px-2 rounded-xl text-xs font-semibold bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5 text-cyan-400" />
                    Inspect 3D
                  </button>
                  {onAddCompToWorkbench ? (
                    <button
                      type="button"
                      onClick={() => onAddCompToWorkbench(comp.id)}
                      className="w-full py-2 px-2 rounded-xl text-xs font-bold bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      Place in Lab
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onSelectComponentForInspection(comp.id)}
                      className="w-full py-2 px-2 rounded-xl text-xs font-semibold bg-purple-500/15 text-purple-300 hover:bg-purple-500/25 border border-purple-500/40 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Info className="w-3.5 h-3.5" />
                      Datasheet
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating Schematic Pinout Hover Popover */}
      <ComponentPinoutPopover
        data={hoveredPinout ? realisticComponentToPinoutData(hoveredPinout.comp) : null}
        anchorRect={hoveredPinout ? hoveredPinout.rect : null}
      />
    </div>
  );
}
