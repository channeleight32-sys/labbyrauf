import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Bell,
  Settings,
  User,
  ChevronRight,
  Cpu,
  Layers,
  Activity,
  FileText,
  Microchip,
  Trash2,
  LogOut,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import EngineerLogoBadge from "./EngineerLogoBadge";
import IstEmblemIcon from "./IstEmblemIcon";
import { ActiveTabId } from "./CurriculumGuide";
import { StudentProfile } from "./AcademicProfileGate";
import {
  WorkspaceState,
  formatRelativeTime,
} from "../utils/workspaceStore";
import {
  WorkstationSettings,
  GridPitchPx,
  TelemetryDecimals,
} from "../utils/workstationSettings";
import { MASTER_75_LABS } from "../data/master75Labs";
import { REALISTIC_COMPONENTS } from "../data/realisticComponentsData";
import { GUIDED_EXPERIMENTS } from "../data/guidedExperimentsData";

interface WorkstationTopBarProps {
  activeTab: ActiveTabId;
  pageTitle: string;
  categoryTitle: string;
  sidebarCollapsed: boolean;
  mobileSidebarOpen: boolean;
  onToggleDesktopSidebar: () => void;
  onToggleMobileSidebar: () => void;
  onNavigateTab: (
    tab: ActiveTabId,
    subContext?: { esp32LessonId?: number; navKey?: string }
  ) => void;
  onOpenLab?: (labId: string, domain: "A" | "B" | "C" | "D" | "E") => void;
  onOpenComponentModal?: (compId: string) => void;
  studentProfile: StudentProfile | null;
  onOpenProfileModal: () => void;
  authUserEmail?: string | null;
  authUserName?: string | null;
  onSwitchAccount?: () => void;
  onSignOut?: () => void;
  workspaceState: WorkspaceState;
  onClearNotifications: () => void;
  settings: WorkstationSettings;
  onUpdateSettings: (patch: Partial<WorkstationSettings>) => void;
  isAdmin?: boolean;
}

const ESP32_LESSONS_INDEX: { id: number; title: string; category: string }[] = [
  { id: 1, title: "Meet the ESP32", category: "Architecture & Pinout" },
  { id: 2, title: "Flash Two LEDs", category: "Digital Output" },
  { id: 3, title: "Reed Switch", category: "Digital Input" },
  { id: 4, title: "Wi-Fi Control", category: "Networking & Web Server" },
  { id: 5, title: "Buzzer Siren", category: "PWM & Tone Synthesis" },
  { id: 6, title: "Touch Piano", category: "Capacitive Touch GPIOs" },
  { id: 7, title: "RGB LED Ring", category: "Addressable WS2812B" },
  { id: 8, title: "Mood Lamp", category: "PWM RGB Mixing" },
  { id: 9, title: "Light Sensor", category: "12-Bit ADC & LDR" },
  { id: 10, title: "Ultrasonic Distance Meter", category: "Time-of-Flight" },
  { id: 11, title: "DC Motor Control", category: "H-Bridge L298N" },
  { id: 12, title: "Laser Barrier", category: "Optical Intrusion" },
  { id: 13, title: "Bluetooth Communication", category: "BLE GATT Bridge" },
  { id: 14, title: "ESP-NOW Communication", category: "Peer Mesh" },
  { id: 15, title: "Smart Parking", category: "Automation" },
  { id: 16, title: "Automatic Water Pump", category: "Relay Control" },
  { id: 17, title: "Keypad Door Lock", category: "4x4 Matrix & Servo" },
  { id: 18, title: "Solar Tracking", category: "Dual-LDR Servo" },
  { id: 19, title: "Ultrasonic Radar", category: "180° Polar Scan" },
  { id: 20, title: "Pick-and-Place Robotics", category: "Servo Kinematics" },
];

const WORKSPACE_QUICK_PAGES: {
  title: string;
  subtitle: string;
  tab: ActiveTabId;
  navKey: string;
}[] = [
  { title: "Circuit Designer", subtitle: "Schematic Editor & SPICE Solver", tab: "lab", navKey: "ds-designer" },
  { title: "ESP32 3D Learning Lab", subtitle: "20 Guided Microcontroller Labs", tab: "esp32-lab", navKey: "hl-esp32" },
  { title: "SPICE Simulation Workbench", subtitle: "Analog & Digital MNA", tab: "multisim", navKey: "ds-spice" },
  { title: "Oscilloscope", subtitle: "Dual-Trace Signal Scope", tab: "tool-oscilloscope", navKey: "inst-scope" },
  { title: "Logic Analyzer", subtitle: "Multi-Channel Timing Capture", tab: "tool-logic-analyzer", navKey: "inst-la" },
  { title: "Signal Generator", subtitle: "DDS Function Generator", tab: "tool-signal-generator", navKey: "inst-siggen" },
  { title: "Digital Multimeter", subtitle: "True-RMS Bench Meter", tab: "tool-multimeter", navKey: "inst-dmm" },
  { title: "RLC & Bode Plot Analyzer", subtitle: "AC Frequency Response & D3 Bode", tab: "rlc", navKey: "ds-bode" },
  { title: "VLC Optical Communication Lab", subtitle: "Visible Light Transceiver & TIA", tab: "vlc", navKey: "hl-vlc" },
  { title: "3D Virtual Breadboard", subtitle: "Drag-and-Drop 830-Point Board", tab: "breadboard", navKey: "footer-breadboard" },
  { title: "75 Laboratory Manuals", subtitle: "Degree Courses A–E", tab: "master-75", navKey: "lc-manuals" },
  { title: "Component Library", subtitle: "60+ Realistic Parts & Datasheets", tab: "components", navKey: "ds-components" },
  { title: "Circuit Calculator", subtitle: "Ohm's Law, Divider, 555, Op-Amp", tab: "circuit-calculator", navKey: "inst-rack" },
];

export default function WorkstationTopBar({
  activeTab,
  pageTitle,
  categoryTitle,
  sidebarCollapsed,
  mobileSidebarOpen,
  onToggleDesktopSidebar,
  onToggleMobileSidebar,
  onNavigateTab,
  onOpenLab,
  onOpenComponentModal,
  studentProfile,
  onOpenProfileModal,
  authUserEmail,
  authUserName,
  onSwitchAccount,
  onSignOut,
  workspaceState,
  onClearNotifications,
  settings,
  onUpdateSettings,
  isAdmin = false,
}: WorkstationTopBarProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [openPopover, setOpenPopover] = useState<"NONE" | "NOTIF" | "SETTINGS" | "ACCOUNT">("NONE");
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Global keyboard shortcuts (Ctrl+K or / to focus search, Escape to close popovers)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
        setOpenPopover("NONE");
        window.setTimeout(() => searchInputRef.current?.focus(), 20);
      } else if (
        e.key === "/" &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA" &&
        document.activeElement?.tagName !== "SELECT"
      ) {
        e.preventDefault();
        setSearchOpen(true);
        setOpenPopover("NONE");
        window.setTimeout(() => searchInputRef.current?.focus(), 20);
      } else if (e.key === "Escape") {
        setSearchOpen(false);
        setOpenPopover("NONE");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Click outside to close popovers
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
        setOpenPopover("NONE");
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return null;

    const pages = [
      ...WORKSPACE_QUICK_PAGES,
      ...(isAdmin
        ? [
            {
              title: "Admin Dashboard & Student Telemetry",
              subtitle: "Consented User Logs & Correct/Incorrect Circuit Stats",
              tab: "admin-dashboard" as ActiveTabId,
              navKey: "ws-admin",
            },
          ]
        : []),
    ]
      .filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.subtitle.toLowerCase().includes(q)
      )
      .slice(0, 4);

    const esp32 = ESP32_LESSONS_INDEX.filter(
      (l) =>
        l.title.toLowerCase().includes(q) ||
        l.category.toLowerCase().includes(q) ||
        String(l.id) === q
    ).slice(0, 4);

    const manuals = MASTER_75_LABS.filter(
      (m) =>
        m.id.toLowerCase().includes(q) ||
        m.title.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q)
    ).slice(0, 4);

    const components = Object.values(REALISTIC_COMPONENTS)
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.partNumber.toLowerCase().includes(q)
      )
      .slice(0, 4);

    const experiments = GUIDED_EXPERIMENTS.filter(
      (ex) =>
        ex.title.toLowerCase().includes(q) ||
        ex.category.toLowerCase().includes(q)
    ).slice(0, 3);

    return {
      pages,
      esp32,
      manuals,
      components,
      experiments,
      total:
        pages.length +
        esp32.length +
        manuals.length +
        components.length +
        experiments.length,
    };
  }, [searchQuery, isAdmin]);

  const notifications = workspaceState.simulationActivity.slice(0, 8);

  return (
    <header
      ref={containerRef}
      className="sticky top-0 z-50 w-full h-14 bg-[#111B2B] border-b border-[#24344D] px-3 sm:px-5 flex items-center justify-between gap-2 sm:gap-4"
    >
      {/* Left: Sidebar Toggle + Logo + Breadcrumb Navigation */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          type="button"
          onClick={onToggleMobileSidebar}
          className="lg:hidden p-1.5 rounded-lg bg-[#162338] border border-[#24344D] text-[#35BDF2] hover:bg-[#1C2B40] cursor-pointer shrink-0"
          title="Toggle Navigation Sidebar"
          aria-label="Toggle Navigation Sidebar"
        >
          {mobileSidebarOpen ? (
            <X className="w-4 h-4" />
          ) : (
            <Menu className="w-4 h-4" />
          )}
        </button>

        <button
          type="button"
          onClick={onToggleDesktopSidebar}
          className="hidden lg:inline-flex items-center gap-1.5 p-1.5 rounded-lg bg-[#162338] hover:bg-[#1C2B40] text-[#9BAAC0] hover:text-[#F1F5FA] border border-[#24344D] transition-colors cursor-pointer shrink-0"
          title={sidebarCollapsed ? "Expand Navigation Sidebar" : "Collapse Navigation Sidebar"}
          aria-label={sidebarCollapsed ? "Expand Navigation Sidebar" : "Collapse Navigation Sidebar"}
        >
          {sidebarCollapsed ? (
            <PanelLeftOpen className="w-4 h-4 text-[#35BDF2]" />
          ) : (
            <PanelLeftClose className="w-4 h-4" />
          )}
        </button>

        <div className="flex items-center gap-2 min-w-0">
          <EngineerLogoBadge size="sm" />
          <button
            type="button"
            onClick={() => onNavigateTab("home", { navKey: "ws-dashboard" })}
            className="flex items-center gap-2 min-w-0 cursor-pointer group text-left"
          >
            <IstEmblemIcon size="sm" glow />
            <span className="font-display text-sm font-bold tracking-tight text-[#F1F5FA] group-hover:text-[#35BDF2] transition-colors whitespace-nowrap">
              <span className="sm:hidden">IST Lab</span>
              <span className="hidden sm:inline">IST Circuit &amp; Logic Lab</span>
            </span>
          </button>
        </div>

        {/* Contextual Breadcrumbs */}
        <nav
          aria-label="Breadcrumb"
          className="hidden md:flex items-center gap-1.5 pl-2 border-l border-[#24344D] text-xs min-w-0"
        >
          <button
            type="button"
            onClick={() => onNavigateTab("home", { navKey: "ws-dashboard" })}
            className={`transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === "home"
                ? "text-[#F1F5FA] font-semibold"
                : "text-[#9BAAC0] hover:text-[#F1F5FA]"
            }`}
          >
            Home
          </button>
          {activeTab !== "home" && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-[#9BAAC0]/60 shrink-0" />
              <span className="text-[#9BAAC0] whitespace-nowrap truncate max-w-[140px]">
                {categoryTitle}
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-[#9BAAC0]/60 shrink-0" />
              <span className="text-[#F1F5FA] font-semibold truncate max-w-[220px]">
                {pageTitle}
              </span>
            </>
          )}
        </nav>
      </div>

      {/* Right: Global Search, Real Notifications, Settings, Profile */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Global Search */}
        <div className="relative">
          <div className="flex items-center">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-[#9BAAC0] absolute left-2.5 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onFocus={() => {
                  setSearchOpen(true);
                  setOpenPopover("NONE");
                }}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSearchOpen(true);
                }}
                placeholder="Search labs, parts..."
                aria-label="Search labs, experiments, and components"
                className="w-36 sm:w-52 lg:w-64 pl-8 pr-10 py-1.5 rounded-lg bg-[#0B1220] border border-[#24344D] focus:border-[#35BDF2] focus:outline-none text-xs text-[#F1F5FA] placeholder-[#9BAAC0]/70 transition-colors"
              />
              <kbd className="hidden sm:inline-block absolute right-2 px-1 py-0.5 text-[9px] font-mono text-[#9BAAC0] bg-[#162338] border border-[#24344D] rounded pointer-events-none">
                Ctrl+K
              </kbd>
            </div>
          </div>

          {searchOpen && searchQuery.trim().length > 0 && (
            <div className="absolute right-0 top-full mt-2 w-[310px] sm:w-[400px] max-h-[420px] overflow-y-auto rounded-xl bg-[#162338] border border-[#24344D] shadow-2xl p-2 z-[70] space-y-2">
              {!searchResults || searchResults.total === 0 ? (
                <div className="px-3 py-4 text-xs text-[#9BAAC0] text-center">
                  No matching labs, components, or manuals found for &ldquo;{searchQuery}&rdquo;.
                </div>
              ) : (
                <>
                  {searchResults.pages.length > 0 && (
                    <div>
                      <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-[#9BAAC0]">
                        Workspaces &amp; Instruments
                      </div>
                      {searchResults.pages.map((p) => (
                        <button
                          key={p.title}
                          type="button"
                          onClick={() => {
                            onNavigateTab(p.tab, { navKey: p.navKey });
                            setSearchOpen(false);
                            setSearchQuery("");
                          }}
                          className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-[#1C2B40] flex items-center gap-2.5 cursor-pointer"
                        >
                          <Layers className="w-3.5 h-3.5 text-[#35BDF2] shrink-0" />
                          <div className="min-w-0">
                            <div className="text-xs font-medium text-[#F1F5FA] truncate">
                              {p.title}
                            </div>
                            <div className="text-[11px] text-[#9BAAC0] truncate">
                              {p.subtitle}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {searchResults.esp32.length > 0 && (
                    <div>
                      <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-[#9BAAC0]">
                        ESP32 Experiments
                      </div>
                      {searchResults.esp32.map((l) => (
                        <button
                          key={l.id}
                          type="button"
                          onClick={() => {
                            onNavigateTab("esp32-lab", {
                              esp32LessonId: l.id,
                              navKey: "hl-esp32",
                            });
                            setSearchOpen(false);
                            setSearchQuery("");
                          }}
                          className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-[#1C2B40] flex items-center gap-2.5 cursor-pointer"
                        >
                          <Cpu className="w-3.5 h-3.5 text-[#35BDF2] shrink-0" />
                          <div className="min-w-0">
                            <div className="text-xs font-medium text-[#F1F5FA] truncate">
                              Exp #{l.id} · {l.title}
                            </div>
                            <div className="text-[11px] text-[#9BAAC0] truncate">
                              {l.category}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {searchResults.manuals.length > 0 && (
                    <div>
                      <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-[#9BAAC0]">
                        Laboratory Manuals
                      </div>
                      {searchResults.manuals.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => {
                            if (onOpenLab) {
                              onOpenLab(m.id, m.domain);
                            } else {
                              onNavigateTab("master-75", { navKey: "lc-manuals" });
                            }
                            setSearchOpen(false);
                            setSearchQuery("");
                          }}
                          className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-[#1C2B40] flex items-center gap-2.5 cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5 text-[#48C99A] shrink-0" />
                          <div className="min-w-0">
                            <div className="text-xs font-medium text-[#F1F5FA] truncate">
                              {m.id} · {m.title}
                            </div>
                            <div className="text-[11px] text-[#9BAAC0] truncate">
                              Course {m.domain} · {m.category}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {searchResults.components.length > 0 && (
                    <div>
                      <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-[#9BAAC0]">
                        Components
                      </div>
                      {searchResults.components.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            if (onOpenComponentModal) {
                              onOpenComponentModal(c.id);
                            } else {
                              onNavigateTab("components", { navKey: "ds-components" });
                            }
                            setSearchOpen(false);
                            setSearchQuery("");
                          }}
                          className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-[#1C2B40] flex items-center gap-2.5 cursor-pointer"
                        >
                          <Microchip className="w-3.5 h-3.5 text-[#648CFF] shrink-0" />
                          <div className="min-w-0">
                            <div className="text-xs font-medium text-[#F1F5FA] truncate">
                              {c.name}
                            </div>
                            <div className="text-[11px] font-mono text-[#9BAAC0] truncate">
                              {c.partNumber} · {c.manufacturer}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {searchResults.experiments.length > 0 && (
                    <div>
                      <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-[#9BAAC0]">
                        Practical Experiments
                      </div>
                      {searchResults.experiments.map((ex) => (
                        <button
                          key={ex.id}
                          type="button"
                          onClick={() => {
                            onNavigateTab("student-learning", {
                              navKey: "lc-experiments",
                            });
                            setSearchOpen(false);
                            setSearchQuery("");
                          }}
                          className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-[#1C2B40] flex items-center gap-2.5 cursor-pointer"
                        >
                          <Activity className="w-3.5 h-3.5 text-[#F1B65B] shrink-0" />
                          <div className="min-w-0">
                            <div className="text-xs font-medium text-[#F1F5FA] truncate">
                              {ex.title}
                            </div>
                            <div className="text-[11px] text-[#9BAAC0] truncate">
                              {ex.category}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Notifications Popover */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setSearchOpen(false);
              setOpenPopover((p) => (p === "NOTIF" ? "NONE" : "NOTIF"));
            }}
            aria-label="Simulation Diagnostics & Activity Notifications"
            title="Simulation Activity & Diagnostics"
            className={`relative p-2 rounded-lg border transition-colors cursor-pointer ${
              openPopover === "NOTIF"
                ? "bg-[#1C2B40] border-[#35BDF2]/50 text-[#F1F5FA]"
                : "bg-[#162338] border-[#24344D] text-[#9BAAC0] hover:text-[#F1F5FA] hover:bg-[#1C2B40]"
            }`}
          >
            <Bell className="w-4 h-4" />
            {notifications.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#35BDF2]" />
            )}
          </button>

          {openPopover === "NOTIF" && (
            <div className="absolute right-0 top-full mt-2 w-80 rounded-xl bg-[#162338] border border-[#24344D] shadow-2xl p-3 z-[70] space-y-2.5">
              <div className="flex items-center justify-between border-b border-[#24344D] pb-2">
                <span className="text-xs font-semibold text-[#F1F5FA]">
                  Workspace Activity &amp; Diagnostics
                </span>
                {notifications.length > 0 && (
                  <button
                    type="button"
                    onClick={onClearNotifications}
                    className="inline-flex items-center gap-1 text-[11px] text-[#9BAAC0] hover:text-[#F07474] cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    Clear
                  </button>
                )}
              </div>

              {notifications.length === 0 ? (
                <div className="py-5 text-center text-xs text-[#9BAAC0]">
                  No simulation diagnostics recorded yet. Run a circuit or load a benchmark to inspect activity.
                </div>
              ) : (
                <div className="max-h-64 overflow-y-auto space-y-1.5">
                  {notifications.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        onNavigateTab(item.tab);
                        setOpenPopover("NONE");
                      }}
                      className="w-full text-left p-2 rounded-lg bg-[#111B2B] hover:bg-[#1C2B40] border border-[#24344D] transition-colors cursor-pointer"
                    >
                      <div className="flex items-center justify-between gap-2 text-[11px]">
                        <span className="font-mono font-semibold text-[#35BDF2]">
                          {item.action}
                        </span>
                        <span className="font-mono text-[#9BAAC0] tabular-nums">
                          {formatRelativeTime(item.timestamp)}
                        </span>
                      </div>
                      <div className="text-xs text-[#F1F5FA] truncate mt-0.5">
                        {item.target}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Settings Popover */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setSearchOpen(false);
              setOpenPopover((p) => (p === "SETTINGS" ? "NONE" : "SETTINGS"));
            }}
            aria-label="Workstation Settings"
            title="Workstation Settings"
            className={`p-2 rounded-lg border transition-colors cursor-pointer ${
              openPopover === "SETTINGS"
                ? "bg-[#1C2B40] border-[#35BDF2]/50 text-[#F1F5FA]"
                : "bg-[#162338] border-[#24344D] text-[#9BAAC0] hover:text-[#F1F5FA] hover:bg-[#1C2B40]"
            }`}
          >
            <Settings className="w-4 h-4" />
          </button>

          {openPopover === "SETTINGS" && (
            <div className="absolute right-0 top-full mt-2 w-72 rounded-xl bg-[#162338] border border-[#24344D] shadow-2xl p-3.5 z-[70] space-y-3.5">
              <div className="border-b border-[#24344D] pb-2">
                <div className="text-xs font-semibold text-[#F1F5FA]">
                  Workstation Settings
                </div>
                <div className="text-[11px] text-[#9BAAC0]">
                  Dark Graphite Theme · Local Preferences
                </div>
              </div>

              {/* Grid Pitch */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#9BAAC0]">Schematic Grid Pitch</span>
                  <span className="font-mono text-[#35BDF2] tabular-nums">
                    {settings.gridPitch} px
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {([10, 20, 25] as GridPitchPx[]).map((pitch) => (
                    <button
                      key={pitch}
                      type="button"
                      onClick={() => onUpdateSettings({ gridPitch: pitch })}
                      className={`py-1 rounded-lg text-xs font-mono cursor-pointer border transition-colors ${
                        settings.gridPitch === pitch
                          ? "bg-[#1C2B40] text-[#35BDF2] border-[#35BDF2]/60 font-semibold"
                          : "bg-[#111B2B] text-[#9BAAC0] border-[#24344D] hover:text-[#F1F5FA]"
                      }`}
                    >
                      {pitch} px
                    </button>
                  ))}
                </div>
              </div>

              {/* Telemetry Precision */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#9BAAC0]">Telemetry Precision</span>
                  <span className="font-mono text-[#35BDF2] tabular-nums">
                    {settings.telemetryDecimals} decimals
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {([2, 3, 4] as TelemetryDecimals[]).map((dec) => (
                    <button
                      key={dec}
                      type="button"
                      onClick={() => onUpdateSettings({ telemetryDecimals: dec })}
                      className={`py-1 rounded-lg text-xs font-mono cursor-pointer border transition-colors ${
                        settings.telemetryDecimals === dec
                          ? "bg-[#1C2B40] text-[#35BDF2] border-[#35BDF2]/60 font-semibold"
                          : "bg-[#111B2B] text-[#9BAAC0] border-[#24344D] hover:text-[#F1F5FA]"
                      }`}
                    >
                      {dec} dec
                    </button>
                  ))}
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-2 pt-1 border-t border-[#24344D]">
                <label className="flex items-center justify-between gap-2 text-xs cursor-pointer">
                  <span className="text-[#F1F5FA]">Reduced Motion</span>
                  <input
                    type="checkbox"
                    checked={settings.forceReducedMotion}
                    onChange={(e) =>
                      onUpdateSettings({ forceReducedMotion: e.target.checked })
                    }
                    className="accent-[#35BDF2] cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between gap-2 text-xs cursor-pointer">
                  <span className="text-[#F1F5FA]">Auto-Save Schematics</span>
                  <input
                    type="checkbox"
                    checked={settings.autoSaveEnabled}
                    onChange={(e) =>
                      onUpdateSettings({ autoSaveEnabled: e.target.checked })
                    }
                    className="accent-[#35BDF2] cursor-pointer"
                  />
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Authenticated Account & Profile Menu */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setSearchOpen(false);
              setOpenPopover((p) => (p === "ACCOUNT" ? "NONE" : "ACCOUNT"));
            }}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#162338] hover:bg-[#1C2B40] text-[#F1F5FA] border border-[#24344D] text-xs font-medium transition-colors cursor-pointer"
            title={
              authUserEmail
                ? `Signed in as ${authUserName || studentProfile?.name || authUserEmail}`
                : "Account & Researcher Profile"
            }
          >
            <User className="w-3.5 h-3.5 text-[#35BDF2]" />
            <span className="hidden sm:inline truncate max-w-[120px]">
              {studentProfile?.name || authUserName || "Account"}
            </span>
          </button>

          {openPopover === "ACCOUNT" && (
            <div className="absolute right-0 top-full mt-2 w-72 rounded-xl bg-[#162338] border border-[#24344D] shadow-2xl p-3.5 z-[70] space-y-3">
              <div className="border-b border-[#24344D] pb-2.5 space-y-0.5">
                <div className="text-xs font-semibold text-[#F1F5FA] truncate">
                  {studentProfile?.name || authUserName || "Engineering Researcher"}
                </div>
                {authUserEmail && (
                  <div className="text-[11px] font-mono text-[#35BDF2] truncate">
                    {authUserEmail}
                  </div>
                )}
                {studentProfile?.university && (
                  <div className="text-[11px] text-[#9BAAC0] truncate">
                    {studentProfile.university}
                  </div>
                )}
                {(studentProfile?.department || studentProfile?.studentId || studentProfile?.semester) && (
                  <div className="text-[10px] font-mono text-[#9BAAC0] truncate">
                    {[studentProfile.department, studentProfile.studentId, studentProfile.semester]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      setOpenPopover("NONE");
                      onNavigateTab("admin-dashboard", { navKey: "ws-admin" });
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg bg-[#1C2B40] hover:bg-[#24344D] border border-[#35BDF2]/50 text-xs font-semibold text-[#35BDF2] flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-[#35BDF2]" />
                    <span>Open Admin Dashboard</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setOpenPopover("NONE");
                    onOpenProfileModal();
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg bg-[#111B2B] hover:bg-[#1C2B40] border border-[#24344D] text-xs text-[#F1F5FA] flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <User className="w-3.5 h-3.5 text-[#35BDF2]" />
                  <span>Edit Lab Attribution Profile</span>
                </button>

                {onSwitchAccount && (
                  <button
                    type="button"
                    onClick={() => {
                      setOpenPopover("NONE");
                      onSwitchAccount();
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg bg-[#111B2B] hover:bg-[#1C2B40] border border-[#24344D] text-xs text-[#F1F5FA] flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-[#48C99A]" />
                    <span>Switch Account (Start Clean)</span>
                  </button>
                )}

                {onSignOut && (
                  <button
                    type="button"
                    onClick={() => {
                      setOpenPopover("NONE");
                      onSignOut();
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg bg-[#111B2B] hover:bg-rose-950/50 border border-[#24344D] hover:border-rose-500/40 text-xs text-rose-300 flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5 text-rose-400" />
                    <span>Sign Out</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
