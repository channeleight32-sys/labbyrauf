import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  LayoutDashboard,
  Layers,
  Microchip,
  Activity,
  TrendingUp,
  Waves,
  FolderKanban,
  Cpu,
  Binary,
  Radio,
  Bot,
  Wifi,
  Sparkles,
  Sliders,
  Gauge,
  FileText,
  BookOpen,
  GraduationCap,
  FlaskConical,
  Library,
  Bookmark,
  Clock,
  CircuitBoard,
  MessageSquare,
  ChevronDown,
  PanelLeftClose,
  X,
  Award,
  ShieldCheck,
} from "lucide-react";
import { ActiveTabId } from "./CurriculumGuide";
import { MASTER_DOMAINS, MasterDomainId } from "../data/master75Labs";

export interface SidebarNavItem {
  id: string;
  label: string;
  tab: ActiveTabId;
  icon: React.ComponentType<{ className?: string }>;
  metaText?: string;
  subMode?: "TRANSIENT" | "AC" | "BODE";
}

export interface SidebarNavGroup {
  key: string;
  title: string;
  items: SidebarNavItem[];
}

interface WorkspaceSidebarProps {
  activeTab: ActiveTabId;
  activeNavKey: string;
  activeDomain: MasterDomainId | null;
  onSelectNav: (
    tab: ActiveTabId,
    navKey: string,
    domain?: MasterDomainId,
    subMode?: "TRANSIENT" | "AC" | "BODE"
  ) => void;
  onOpenBenchmarks?: () => void;
  onCloseSidebar?: () => void;
  isMobile?: boolean;
  esp32CompletedCount: number;
  manualsCompletedCount: number;
  savedCircuitsCount: number;
  isAdmin?: boolean;
}

const TAB_TO_DEFAULT_GROUP: Partial<Record<ActiveTabId, string>> = {
  home: "DASHBOARD",
  "admin-dashboard": "DASHBOARD",
  lab: "DESIGN_SIMULATE",
  components: "DESIGN_SIMULATE",
  multisim: "DESIGN_SIMULATE",
  rlc: "DESIGN_SIMULATE",
  schematics: "DESIGN_SIMULATE",
  "esp32-lab": "HARDWARE_LABS",
  lca: "HARDWARE_LABS",
  cd: "HARDWARE_LABS",
  edc: "HARDWARE_LABS",
  power: "HARDWARE_LABS",
  "logic-suite": "HARDWARE_LABS",
  gates: "HARDWARE_LABS",
  kmap: "HARDWARE_LABS",
  numbers: "HARDWARE_LABS",
  sequential: "HARDWARE_LABS",
  msi: "HARDWARE_LABS",
  breadboard: "HARDWARE_LABS",
  vlc: "HARDWARE_LABS",
  "robotics-lab": "HARDWARE_LABS",
  "embedded-lab": "HARDWARE_LABS",
  "wireless-lab": "HARDWARE_LABS",
  "tool-oscilloscope": "INSTRUMENTS",
  "tool-logic-analyzer": "INSTRUMENTS",
  "tool-signal-generator": "INSTRUMENTS",
  "tool-multimeter": "INSTRUMENTS",
  instruments: "INSTRUMENTS",
  "circuit-calculator": "INSTRUMENTS",
  "master-75": "LEARNING_CENTER",
  guide: "LEARNING_CENTER",
  simulators: "LEARNING_CENTER",
  "student-learning": "LEARNING_CENTER",
  resources: "LEARNING_CENTER",
  glossary: "LEARNING_CENTER",
  checklist: "LEARNING_CENTER",
  "saved-circuits": "MY_PROJECTS",
  "recent-work": "MY_PROJECTS",
  "my-projects": "MY_PROJECTS",
};

export default function WorkspaceSidebar({
  activeTab,
  activeNavKey,
  activeDomain,
  onSelectNav,
  onOpenBenchmarks,
  onCloseSidebar,
  isMobile = false,
  esp32CompletedCount,
  manualsCompletedCount,
  savedCircuitsCount,
  isAdmin = false,
}: WorkspaceSidebarProps) {
  const groups: SidebarNavGroup[] = useMemo(
    () => [
      {
        key: "DASHBOARD",
        title: "Dashboard",
        items: [
          {
            id: "ws-dashboard",
            label: "Engineering Workbench",
            tab: "home",
            icon: LayoutDashboard,
          },
          ...(isAdmin
            ? [
                {
                  id: "ws-admin",
                  label: "Admin & Student Telemetry",
                  tab: "admin-dashboard" as ActiveTabId,
                  icon: ShieldCheck,
                  metaText: "ADMIN",
                },
              ]
            : []),
        ],
      },
      {
        key: "DESIGN_SIMULATE",
        title: "Design & Simulate",
        items: [
          {
            id: "ds-designer",
            label: "Circuit Designer",
            tab: "lab",
            icon: Layers,
          },
          {
            id: "ds-components",
            label: "Component Library",
            tab: "components",
            icon: Microchip,
            metaText: "60+",
          },
          {
            id: "ds-spice",
            label: "SPICE Simulation",
            tab: "multisim",
            icon: Activity,
          },
          {
            id: "ds-transient",
            label: "Transient Analysis",
            tab: "lca",
            icon: Waves,
            subMode: "TRANSIENT",
          },
          {
            id: "ds-ac",
            label: "AC Analysis",
            tab: "rlc",
            icon: TrendingUp,
            subMode: "AC",
          },
          {
            id: "ds-bode",
            label: "Bode Plot",
            tab: "rlc",
            icon: Activity,
            subMode: "BODE",
          },
          {
            id: "ds-examples",
            label: "Circuit Examples",
            tab: "schematics",
            icon: FolderKanban,
          },
        ],
      },
      {
        key: "HARDWARE_LABS",
        title: "Hardware Labs",
        items: [
          {
            id: "hl-esp32",
            label: "ESP32 Lab",
            tab: "esp32-lab",
            icon: Cpu,
            metaText: `${esp32CompletedCount}/20`,
          },
          {
            id: "hl-analog",
            label: "Analog Electronics",
            tab: "lca",
            icon: Waves,
          },
          {
            id: "hl-digital",
            label: "Digital Electronics",
            tab: "logic-suite",
            icon: Binary,
          },
          {
            id: "hl-vlc",
            label: "VLC Communication",
            tab: "vlc",
            icon: Sparkles,
          },
          {
            id: "hl-robotics",
            label: "Robotics",
            tab: "robotics-lab",
            icon: Bot,
          },
          {
            id: "hl-iot",
            label: "IoT Projects",
            tab: "embedded-lab",
            icon: Wifi,
          },
          {
            id: "hl-wireless",
            label: "Wireless Communication",
            tab: "wireless-lab",
            icon: Radio,
          },
        ],
      },
      {
        key: "INSTRUMENTS",
        title: "Instruments",
        items: [
          {
            id: "inst-scope",
            label: "Oscilloscope",
            tab: "tool-oscilloscope",
            icon: Waves,
          },
          {
            id: "inst-la",
            label: "Logic Analyzer",
            tab: "tool-logic-analyzer",
            icon: Sliders,
          },
          {
            id: "inst-siggen",
            label: "Signal Generator",
            tab: "tool-signal-generator",
            icon: Radio,
          },
          {
            id: "inst-dmm",
            label: "Digital Multimeter",
            tab: "tool-multimeter",
            icon: Gauge,
          },
          {
            id: "inst-rack",
            label: "Measurement Tools",
            tab: "instruments",
            icon: Activity,
            metaText: "26",
          },
        ],
      },
      {
        key: "LEARNING_CENTER",
        title: "Learning Center",
        items: [
          {
            id: "lc-manuals",
            label: "Laboratory Manuals",
            tab: "master-75",
            icon: FileText,
            metaText: `${manualsCompletedCount}/75`,
          },
          {
            id: "lc-tutorials",
            label: "Tutorials",
            tab: "guide",
            icon: BookOpen,
          },
          {
            id: "lc-lessons",
            label: "Engineering Lessons",
            tab: "simulators",
            icon: GraduationCap,
          },
          {
            id: "lc-experiments",
            label: "Practical Experiments",
            tab: "student-learning",
            icon: FlaskConical,
          },
          {
            id: "lc-guides",
            label: "Project Guides",
            tab: "resources",
            icon: Library,
          },
        ],
      },
      {
        key: "MY_PROJECTS",
        title: "My Projects",
        items: [
          {
            id: "mp-saved",
            label: "Saved Circuits",
            tab: "saved-circuits",
            icon: Bookmark,
            metaText: savedCircuitsCount > 0 ? String(savedCircuitsCount) : undefined,
          },
          {
            id: "mp-recent",
            label: "Recent Projects",
            tab: "recent-work",
            icon: Clock,
          },
          {
            id: "mp-experiments",
            label: "My Experiments",
            tab: "my-projects",
            icon: FolderKanban,
          },
        ],
      },
    ],
    [esp32CompletedCount, manualsCompletedCount, savedCircuitsCount, isAdmin]
  );

  // Determine which group owns the current route/navKey
  const activeGroupKey = useMemo(() => {
    if (activeNavKey) {
      const byNavKey = groups.find((g) =>
        g.items.some((item) => item.id === activeNavKey)
      );
      if (byNavKey) return byNavKey.key;
      if (activeNavKey.startsWith("course-")) return "LEARNING_CENTER";
    }
    return TAB_TO_DEFAULT_GROUP[activeTab] || "DASHBOARD";
  }, [activeNavKey, activeTab, groups]);

  // Strict Accordion Mode: only one category group expanded at a time (active group by default)
  const [expandedGroup, setExpandedGroup] = useState<string>(activeGroupKey);
  const [showCoursesList, setShowCoursesList] = useState<boolean>(false);

  useEffect(() => {
    setExpandedGroup(activeGroupKey);
  }, [activeGroupKey]);

  const handleToggleGroup = (key: string) => {
    setExpandedGroup((prev) => (prev === key ? "" : key));
  };

  return (
    <aside
      className="w-[260px] h-full flex flex-col bg-[#111B2B] border-r border-[#24344D] select-none shrink-0"
      aria-label="Engineering Workstation Navigation"
    >
      {/* Top Header Row */}
      <div className="px-4 py-3 border-b border-[#24344D] flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="font-mono text-[10px] uppercase tracking-wider text-[#35BDF2] font-semibold">
            Workstation
          </div>
          <div className="text-xs font-semibold text-[#F1F5FA] truncate">
            Navigation Directory
          </div>
        </div>
        {onCloseSidebar && (
          <button
            type="button"
            onClick={onCloseSidebar}
            className="p-1.5 rounded-lg text-[#9BAAC0] hover:text-[#F1F5FA] hover:bg-[#1C2B40] border border-transparent hover:border-[#24344D] transition-colors cursor-pointer"
            title={isMobile ? "Close Navigation" : "Collapse Sidebar"}
            aria-label={isMobile ? "Close Navigation" : "Collapse Sidebar"}
          >
            {isMobile ? (
              <X className="w-4 h-4" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </button>
        )}
      </div>

      {/* 6-Category Accordion Navigation */}
      <nav
        className="flex-1 overflow-y-auto px-3 py-3 space-y-1.5"
        aria-label="Primary Categories"
      >
        {groups.map((group) => {
          const isExpanded = expandedGroup === group.key;
          const groupOwnsActive = activeGroupKey === group.key;

          return (
            <div
              key={group.key}
              className="rounded-xl border border-transparent bg-transparent"
            >
              <button
                type="button"
                onClick={() => handleToggleGroup(group.key)}
                aria-expanded={isExpanded}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-[11px] font-semibold tracking-wide transition-colors cursor-pointer ${
                  groupOwnsActive
                    ? "text-[#F1F5FA] bg-[#162338]/70"
                    : "text-[#9BAAC0] hover:text-[#F1F5FA] hover:bg-[#162338]/40"
                }`}
              >
                <span className="uppercase font-mono tracking-wider">
                  {group.title}
                </span>
                <motion.span
                  animate={{ rotate: isExpanded ? 0 : -90 }}
                  transition={{ duration: 0.15 }}
                  className="inline-flex text-[#9BAAC0]"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </motion.span>
              </button>

              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.16, ease: "easeOut" }}
                    className="mt-1 pl-1 space-y-0.5 overflow-hidden"
                  >
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const isActive =
                        activeNavKey === item.id ||
                        (activeNavKey === "" && activeTab === item.tab && !item.subMode);

                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() =>
                            onSelectNav(item.tab, item.id, undefined, item.subMode)
                          }
                          className={`relative w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                            isActive
                              ? "text-[#F1F5FA] bg-[#1C2B40] border border-[#35BDF2]/45"
                              : "text-[#9BAAC0] hover:text-[#F1F5FA] hover:bg-[#162338] border border-transparent"
                          }`}
                        >
                          <span className="flex items-center gap-2.5 min-w-0">
                            <Icon
                              className={`w-3.5 h-3.5 shrink-0 ${
                                isActive ? "text-[#35BDF2]" : "text-[#9BAAC0]"
                              }`}
                            />
                            <span className="truncate">{item.label}</span>
                          </span>
                          {item.metaText && (
                            <span className="font-mono text-[10px] tabular-nums text-[#9BAAC0] shrink-0">
                              {item.metaText}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}

        {/* Compact Degree Courses A-E Sub-Jump */}
        <div className="pt-2 mt-2 border-t border-[#24344D]">
          <button
            type="button"
            onClick={() => setShowCoursesList((v) => !v)}
            className="w-full flex items-center justify-between px-2.5 py-1.5 text-[10px] font-mono font-semibold uppercase tracking-wider text-[#9BAAC0] hover:text-[#F1F5FA] cursor-pointer"
          >
            <span>Curriculum Courses (A–E)</span>
            <motion.span
              animate={{ rotate: showCoursesList ? 0 : -90 }}
              transition={{ duration: 0.15 }}
              className="inline-flex"
            >
              <ChevronDown className="w-3 h-3" />
            </motion.span>
          </button>

          <AnimatePresence initial={false}>
            {showCoursesList && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.16, ease: "easeOut" }}
                className="mt-1 space-y-0.5 overflow-hidden"
              >
                {(["A", "B", "C", "D", "E"] as MasterDomainId[]).map((domId) => {
                  const dom = MASTER_DOMAINS[domId];
                  const isDomActive =
                    activeDomain === domId && activeTab === "master-75";
                  return (
                    <button
                      key={domId}
                      type="button"
                      onClick={() =>
                        onSelectNav("master-75", `course-${domId}`, domId)
                      }
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] transition-colors cursor-pointer flex items-center justify-between gap-2 ${
                        isDomActive
                          ? "bg-[#1C2B40] text-[#F1F5FA] border border-[#35BDF2]/45"
                          : "text-[#9BAAC0] hover:text-[#F1F5FA] hover:bg-[#162338] border border-transparent"
                      }`}
                    >
                      <span className="truncate">
                        <strong className="font-mono text-[#35BDF2] mr-1.5">
                          {domId}
                        </strong>
                        {dom.title.split("/")[0].trim()}
                      </span>
                      <span className="font-mono text-[10px] tabular-nums text-[#9BAAC0]">
                        15
                      </span>
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </nav>

      {/* Clean Workstation Footer Links */}
      <div className="p-3 border-t border-[#24344D] space-y-1 bg-[#0B1220]/70">
        <button
          type="button"
          onClick={() => onSelectNav("breadboard", "footer-breadboard")}
          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
            activeTab === "breadboard"
              ? "bg-[#1C2B40] text-[#F1F5FA] border border-[#35BDF2]/45"
              : "text-[#9BAAC0] hover:text-[#F1F5FA] hover:bg-[#162338] border border-transparent"
          }`}
        >
          <span className="flex items-center gap-2">
            <CircuitBoard className="w-3.5 h-3.5 text-[#48C99A]" />
            <span>3D Breadboard Studio</span>
          </span>
        </button>

        {onOpenBenchmarks && (
          <button
            type="button"
            onClick={onOpenBenchmarks}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-[#9BAAC0] hover:text-[#F1F5FA] hover:bg-[#162338] border border-transparent transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <Award className="w-3.5 h-3.5 text-[#F1B65B]" />
              <span>10 Calibrated Benchmarks</span>
            </span>
          </button>
        )}

        <button
          type="button"
          onClick={() => onSelectNav("contact", "footer-contact")}
          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
            activeTab === "contact"
              ? "bg-[#1C2B40] text-[#F1F5FA] border border-[#35BDF2]/45"
              : "text-[#9BAAC0] hover:text-[#F1F5FA] hover:bg-[#162338] border border-transparent"
          }`}
        >
          <span className="flex items-center gap-2">
            <MessageSquare className="w-3.5 h-3.5 text-[#35BDF2]" />
            <span>Contact &amp; Suggestions</span>
          </span>
        </button>
      </div>
    </aside>
  );
}
