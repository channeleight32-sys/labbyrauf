import React, { useMemo } from "react";
import {
  Layers,
  Cpu,
  Activity,
  BookOpen,
  ArrowRight,
  Clock,
  Bookmark,
  Waves,
  Sliders,
  TrendingUp,
  CircuitBoard,
  Microchip,
  Calculator,
  Award,
} from "lucide-react";
import { ActiveTabId } from "./CurriculumGuide";
import IstEmblemIcon from "./IstEmblemIcon";
import { MasterDomainId } from "../data/master75Labs";
import { StudentProfile } from "./AcademicProfileGate";
import {
  WorkspaceState,
  formatRelativeTime,
} from "../utils/workspaceStore";
import { getAutoSavedCircuit } from "../utils/circuitAutoSave";

interface HomeHubProps {
  onNavigateTab: (
    tab: ActiveTabId,
    subContext?: { esp32LessonId?: number; navKey?: string }
  ) => void;
  onSelectSubject?: (domain: MasterDomainId) => void;
  onOpenLab?: (labId: string, domain: MasterDomainId) => void;
  studentProfile?: StudentProfile | null;
  onOpenComponentModal?: (componentId: string) => void;
  onOpenBenchmarkModal?: () => void;
  workspaceState?: WorkspaceState;
  onRestoreAutoSave?: () => void;
}

const ESP32_LESSON_TITLES: Record<number, string> = {
  1: "Meet the ESP32",
  2: "Flash Two LEDs",
  3: "Reed Switch",
  4: "Wi-Fi Control",
  5: "Buzzer Siren",
  6: "Touch Piano",
  7: "RGB LED Ring",
  8: "Mood Lamp",
  9: "Light Sensor",
  10: "Ultrasonic Distance Meter",
  11: "DC Motor Control",
  12: "Laser Barrier",
  13: "Bluetooth Communication",
  14: "ESP-NOW Communication",
  15: "Smart Parking",
  16: "Automatic Water Pump",
  17: "Keypad Door Lock",
  18: "Solar Tracking",
  19: "Ultrasonic Radar",
  20: "Pick-and-Place Robotics",
};

export default function HomeHub({
  onNavigateTab,
  onOpenBenchmarkModal,
  workspaceState,
  onRestoreAutoSave,
}: HomeHubProps) {
  const autoSavedCircuit = getAutoSavedCircuit();

  const esp32CompletedCount = useMemo(
    () =>
      workspaceState
        ? Object.values(workspaceState.completedEsp32Lessons).filter(Boolean).length
        : 0,
    [workspaceState]
  );

  const manualsCompletedCount = useMemo(
    () =>
      workspaceState
        ? Object.values(workspaceState.completedManuals).filter(Boolean).length
        : 0,
    [workspaceState]
  );

  const activeEsp32Id = workspaceState?.lastEsp32LessonId ?? 1;
  const activeEsp32Title = ESP32_LESSON_TITLES[activeEsp32Id] || "Meet the ESP32";

  const recentWorkItem = useMemo(() => {
    const items = workspaceState?.recentWork ?? [];
    return items.find((item) => item.tab !== "home") || null;
  }, [workspaceState]);

  const simulationEvents = useMemo(
    () => (workspaceState?.simulationActivity ?? []).slice(0, 5),
    [workspaceState]
  );

  const primaryCards: {
    id: string;
    title: string;
    description: string;
    meta: string;
    actionLabel: string;
    icon: React.ComponentType<{ className?: string }>;
    tab: ActiveTabId;
    navKey: string;
    accentColor: string;
  }[] = [
    {
      id: "card-circuit-designer",
      title: "Circuit Designer",
      description: "Build and simulate electronic circuits.",
      meta: "60+ Components · MNA SPICE Solver · Transient & AC",
      actionLabel: "Open Designer",
      icon: Layers,
      tab: "lab",
      navKey: "ds-designer",
      accentColor: "#35BDF2",
    },
    {
      id: "card-esp32-lab",
      title: "ESP32 Lab",
      description: "Explore interactive hardware and microcontroller projects.",
      meta: `3D DevKit V1 · 20 Experiments · ${esp32CompletedCount}/20 Completed`,
      actionLabel: "Open ESP32 Lab",
      icon: Cpu,
      tab: "esp32-lab",
      navKey: "hl-esp32",
      accentColor: "#648CFF",
    },
    {
      id: "card-virtual-instruments",
      title: "Virtual Instruments",
      description: "Analyze signals and measure circuit behavior.",
      meta: "Oscilloscope · Logic Analyzer · Signal Gen · 26 Bench Tools",
      actionLabel: "Open Instruments",
      icon: Activity,
      tab: "tool-oscilloscope",
      navKey: "inst-scope",
      accentColor: "#48C99A",
    },
    {
      id: "card-learning-center",
      title: "Learning Center",
      description: "Access laboratory manuals, tutorials and lessons.",
      meta: `75 Lab Manuals · Tutorials · ${manualsCompletedCount}/75 Completed`,
      actionLabel: "Open Manuals",
      icon: BookOpen,
      tab: "master-75",
      navKey: "lc-manuals",
      accentColor: "#F1B65B",
    },
  ];

  const quickAccessItems: {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    onClick: () => void;
  }[] = [
    {
      label: "SPICE Simulator",
      icon: Activity,
      onClick: () => onNavigateTab("multisim", { navKey: "ds-spice" }),
    },
    {
      label: "Oscilloscope",
      icon: Waves,
      onClick: () => onNavigateTab("tool-oscilloscope", { navKey: "inst-scope" }),
    },
    {
      label: "Logic Analyzer",
      icon: Sliders,
      onClick: () => onNavigateTab("tool-logic-analyzer", { navKey: "inst-la" }),
    },
    {
      label: "Bode Plot",
      icon: TrendingUp,
      onClick: () => onNavigateTab("rlc", { navKey: "ds-bode" }),
    },
    {
      label: "3D Breadboard",
      icon: CircuitBoard,
      onClick: () => onNavigateTab("breadboard", { navKey: "footer-breadboard" }),
    },
    {
      label: "Component Library",
      icon: Microchip,
      onClick: () => onNavigateTab("components", { navKey: "ds-components" }),
    },
    {
      label: "Circuit Calculator",
      icon: Calculator,
      onClick: () => onNavigateTab("circuit-calculator", { navKey: "inst-rack" }),
    },
    ...(onOpenBenchmarkModal
      ? [
          {
            label: "10 Benchmarks",
            icon: Award,
            onClick: onOpenBenchmarkModal,
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-8 py-2">
      {/* Workbench Header */}
      <section className="flex items-center gap-4">
        <IstEmblemIcon size="lg" glow />
        <div className="space-y-1">
          <div className="font-mono text-[11px] uppercase tracking-wider text-[#35BDF2]">
            Electrical Engineering Workbench · Circuit &amp; Logic Lab
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#F1F5FA]">
            Engineering Workbench
          </h1>
          <p className="text-sm text-[#9BAAC0] max-w-2xl">
            Design, simulate and explore electronic systems.
          </p>
        </div>
      </section>

      {/* Primary 4-Card Workspace Grid */}
      <section aria-label="Primary Engineering Workspaces">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {primaryCards.map((card) => {
            const Icon = card.icon;
            return (
              <button
                key={card.id}
                type="button"
                onClick={() => onNavigateTab(card.tab, { navKey: card.navKey })}
                className="group text-left bg-[#162338] hover:bg-[#1C2B40] border border-[#24344D] hover:border-[#35BDF2]/50 rounded-xl p-5 transition-colors cursor-pointer flex flex-col justify-between gap-4"
              >
                <div className="flex items-start gap-3.5">
                  <div
                    className="w-10 h-10 rounded-lg bg-[#111B2B] border border-[#24344D] flex items-center justify-center shrink-0"
                    style={{ color: card.accentColor }}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="space-y-1 min-w-0">
                    <h2 className="font-display text-base font-semibold text-[#F1F5FA] group-hover:text-[#35BDF2] transition-colors">
                      {card.title}
                    </h2>
                    <p className="text-sm text-[#9BAAC0] leading-snug">
                      {card.description}
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#24344D] flex items-center justify-between gap-3">
                  <span className="font-mono text-[11px] text-[#9BAAC0] truncate tabular-nums">
                    {card.meta}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-[#35BDF2] shrink-0">
                    {card.actionLabel}
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Continue Working + Recent Activity */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Continue Working */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#F1F5FA]">
              Continue Working
            </h2>
            <button
              type="button"
              onClick={() => onNavigateTab("saved-circuits", { navKey: "mp-saved" })}
              className="text-xs text-[#35BDF2] hover:underline cursor-pointer"
            >
              Saved Projects
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Auto-Saved Schematic or New Schematic */}
            <div className="bg-[#162338] border border-[#24344D] rounded-xl p-4 flex flex-col justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[11px] text-[#35BDF2]">
                    {autoSavedCircuit ? "Auto-Saved Schematic" : "Circuit Canvas"}
                  </span>
                  {autoSavedCircuit && (
                    <span className="font-mono text-[11px] text-[#9BAAC0] tabular-nums">
                      {formatRelativeTime(autoSavedCircuit.timestamp)}
                    </span>
                  )}
                </div>
                <div className="text-sm font-medium text-[#F1F5FA] truncate">
                  {autoSavedCircuit
                    ? autoSavedCircuit.title || "Untitled Schematic"
                    : "Start a New Schematic"}
                </div>
                <div className="text-xs text-[#9BAAC0] font-mono tabular-nums">
                  {autoSavedCircuit
                    ? `${autoSavedCircuit.nodes.length} parts · ${autoSavedCircuit.wires.length} nets`
                    : "MNA SPICE · IEEE Std 315 Symbols"}
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (autoSavedCircuit && onRestoreAutoSave) {
                    onRestoreAutoSave();
                  } else {
                    onNavigateTab("lab", { navKey: "ds-designer" });
                  }
                }}
                className="w-full py-2 px-3 rounded-lg bg-[#111B2B] hover:bg-[#1C2B40] border border-[#24344D] text-xs font-medium text-[#F1F5FA] flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <Bookmark className="w-3.5 h-3.5 text-[#35BDF2]" />
                <span>{autoSavedCircuit ? "Resume Draft" : "Launch Designer"}</span>
              </button>
            </div>

            {/* Active ESP32 Experiment */}
            <div className="bg-[#162338] border border-[#24344D] rounded-xl p-4 flex flex-col justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[11px] text-[#648CFF]">
                    ESP32 Experiment #{activeEsp32Id}
                  </span>
                  <span className="font-mono text-[11px] text-[#9BAAC0] tabular-nums">
                    {esp32CompletedCount}/20
                  </span>
                </div>
                <div className="text-sm font-medium text-[#F1F5FA] truncate">
                  {activeEsp32Title}
                </div>
                <div className="text-xs text-[#9BAAC0]">
                  3D Hardware · Pinout · C++ Firmware
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  onNavigateTab("esp32-lab", {
                    esp32LessonId: activeEsp32Id,
                    navKey: "hl-esp32",
                  })
                }
                className="w-full py-2 px-3 rounded-lg bg-[#111B2B] hover:bg-[#1C2B40] border border-[#24344D] text-xs font-medium text-[#F1F5FA] flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <Cpu className="w-3.5 h-3.5 text-[#648CFF]" />
                <span>Resume Experiment</span>
              </button>
            </div>
          </div>

          {recentWorkItem && (
            <button
              type="button"
              onClick={() => onNavigateTab(recentWorkItem.tab)}
              className="w-full text-left bg-[#162338] hover:bg-[#1C2B40] border border-[#24344D] rounded-xl px-4 py-3 flex items-center justify-between gap-3 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Clock className="w-4 h-4 text-[#9BAAC0] shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-medium text-[#F1F5FA] truncate">
                    Last Opened: {recentWorkItem.title}
                  </div>
                  <div className="text-[11px] text-[#9BAAC0] truncate">
                    {recentWorkItem.subtitle} · {formatRelativeTime(recentWorkItem.timestamp)}
                  </div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-[#35BDF2] shrink-0" />
            </button>
          )}
        </div>

        {/* Recent Activity (Real Recorded Events Only) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#F1F5FA]">
              Recent Activity
            </h2>
            <button
              type="button"
              onClick={() => onNavigateTab("recent-work", { navKey: "mp-recent" })}
              className="text-xs text-[#35BDF2] hover:underline cursor-pointer"
            >
              View History
            </button>
          </div>

          <div className="bg-[#162338] border border-[#24344D] rounded-xl p-4">
            {simulationEvents.length === 0 ? (
              <div className="py-6 text-center space-y-1">
                <div className="text-xs font-medium text-[#F1F5FA]">
                  No simulation activity recorded yet
                </div>
                <p className="text-xs text-[#9BAAC0]">
                  Run a circuit simulation, load a benchmark, or test ESP32 firmware to log session events.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-[#24344D]">
                {simulationEvents.map((ev) => (
                  <li key={ev.id} className="py-2.5 first:pt-0 last:pb-0">
                    <button
                      type="button"
                      onClick={() => onNavigateTab(ev.tab)}
                      className="w-full text-left flex items-center justify-between gap-3 hover:opacity-90 cursor-pointer"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-[#F1F5FA] truncate">
                          {ev.action} · {ev.target}
                        </div>
                        <div className="text-[11px] font-mono text-[#9BAAC0]">
                          Status: {ev.status}
                        </div>
                      </div>
                      <span className="font-mono text-[11px] text-[#9BAAC0] tabular-nums shrink-0">
                        {formatRelativeTime(ev.timestamp)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      {/* Quick Access */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-[#F1F5FA]">Quick Access</h2>
        <div className="flex flex-wrap items-center gap-2">
          {quickAccessItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                type="button"
                onClick={item.onClick}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#162338] hover:bg-[#1C2B40] border border-[#24344D] hover:border-[#35BDF2]/45 text-xs font-medium text-[#F1F5FA] transition-colors cursor-pointer"
              >
                <Icon className="w-3.5 h-3.5 text-[#35BDF2]" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
