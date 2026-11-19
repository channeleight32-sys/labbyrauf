import React, { useState, useMemo } from "react";
import {
  FolderKanban,
  Clock,
  Bookmark,
  ArrowRight,
  Trash2,
  Play,
  Plus,
  Cpu,
  Radio,
  Bot,
  Wifi,
  Layers,
  Sparkles,
  CircuitBoard,
} from "lucide-react";
import { ActiveTabId } from "./CurriculumGuide";
import {
  WorkspaceState,
  formatRelativeTime,
} from "../utils/workspaceStore";
import {
  getAutoSavedCircuit,
  getSessionVersionSnapshots,
  deleteSessionVersionSnapshot,
  CircuitVersionSnapshot,
} from "../utils/circuitAutoSave";
import {
  listSavedCircuitProjects,
  deleteSavedCircuitProject,
  listBuilderProjects,
  deleteBuilderProject,
  type BuilderProjectRecord,
} from "../utils/circuitProjectStore";
import type { CircuitProjectModel } from "../types/circuitModel";
import { PresetNodeDef, PresetWireDef } from "../data/logicSpecs";

interface WorkspaceCollectionsViewProps {
  mode: "my-projects" | "recent-work" | "saved-circuits";
  workspaceState: WorkspaceState;
  onNavigateTab: (tab: ActiveTabId) => void;
  onRestoreCircuitToLab: (circuit: {
    title: string;
    nodes: PresetNodeDef[];
    wires: PresetWireDef[];
  }) => void;
  onOpenUnifiedProject?: (projectId: string) => void;
  onOpenBuilderProject?: (scenarioName: string) => void;
  onAddBookmark: (bookmark: {
    title: string;
    category: string;
    tab: ActiveTabId;
    notes: string;
  }) => void;
  onRemoveBookmark: (id: string) => void;
}

const CORE_PROJECT_SHOWCASE = [
  {
    id: "proj-vlc",
    title: "VLC Communication Lab (Project 001)",
    category: "VLC Communication",
    tab: "vlc" as ActiveTabId,
    icon: Sparkles,
    desc: "Dual ESP32 Visible Light Communication transceiver with Lambertian channel, PIN photodiode TIA, Eye Diagram & BER.",
  },
  {
    id: "proj-esp32-learn",
    title: "Interactive 3D ESP32 Learning Lab",
    category: "ESP32 Projects",
    tab: "esp32-lab" as ActiveTabId,
    icon: Cpu,
    desc: "20 guided hardware experiments on a 3D ESP32 DevKit V1 with pinout explorer, Arduino code editor & Serial Monitor.",
  },
  {
    id: "proj-embedded",
    title: "Embedded Multi-MCU Studio",
    category: "ESP32 Projects",
    tab: "embedded-lab" as ActiveTabId,
    icon: Cpu,
    desc: "ESP32 DevKit/S3/C3, Arduino Uno, STM32 BluePill & Raspberry Pi Pico GPIO matrix and C++/MicroPython simulator.",
  },
  {
    id: "proj-iot-wireless",
    title: "IoT & LoRa SX1278 Sub-GHz Studio",
    category: "IoT & Wireless Communication",
    tab: "wireless-lab" as ActiveTabId,
    icon: Wifi,
    desc: "Sub-GHz LoRa packet injection, Wi-Fi/BLE protocol simulator, and Friis free-space RF link budget calculator.",
  },
  {
    id: "proj-robotics",
    title: "Robotics & Mechatronics Automation",
    category: "Robotics Projects",
    tab: "robotics-lab" as ActiveTabId,
    icon: Bot,
    desc: "180° ultrasonic polar radar sweep, 2D smart car obstacle avoidance arena, SG90 servo & L298N H-bridge.",
  },
  {
    id: "proj-schematics",
    title: "Student 6-Tab IEEE 315 Projects",
    category: "Student Projects",
    tab: "schematics" as ActiveTabId,
    icon: Layers,
    desc: "NE555 Astable, Buck Converter, LM7805 Regulator & 74193 Counter with synchronized schematic, breadboard, BOM & reports.",
  },
];

export default function WorkspaceCollectionsView({
  mode,
  workspaceState,
  onNavigateTab,
  onRestoreCircuitToLab,
  onOpenUnifiedProject,
  onOpenBuilderProject,
  onAddBookmark,
  onRemoveBookmark,
}: WorkspaceCollectionsViewProps) {
  const [snapshots, setSnapshots] = useState<CircuitVersionSnapshot[]>(() =>
    getSessionVersionSnapshots()
  );
  const [savedUnifiedProjects, setSavedUnifiedProjects] = useState<CircuitProjectModel[]>(() =>
    listSavedCircuitProjects()
  );
  const [savedBuilderProjects, setSavedBuilderProjects] = useState<BuilderProjectRecord[]>(() =>
    listBuilderProjects()
  );
  const autoSaved = useMemo(() => getAutoSavedCircuit(), []);
  const [newProjTitle, setNewProjTitle] = useState("");
  const [newProjNotes, setNewProjNotes] = useState("");
  const [newProjTab, setNewProjTab] = useState<ActiveTabId>("lab");

  const handleDeleteSnapshot = (id: string) => {
    deleteSessionVersionSnapshot(id);
    setSnapshots(getSessionVersionSnapshots());
  };

  const handleDeleteUnified = (projectId: string) => {
    deleteSavedCircuitProject(projectId);
    setSavedUnifiedProjects(listSavedCircuitProjects());
  };

  const handleDeleteBuilder = (projectId: string) => {
    deleteBuilderProject(projectId);
    setSavedBuilderProjects(listBuilderProjects());
  };

  if (mode === "my-projects") {
    return (
      <div className="space-y-6">
        <div className="bg-[#0d1424] border border-[#1e2d4a] rounded-2xl p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs font-mono text-cyan-400 font-semibold">
                WORKSPACE · MY PROJECTS
              </div>
              <h2 className="font-display text-2xl font-bold text-white">
                Engineering Project Suites &amp; Custom Bookmarks
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab("lab")}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-cyan-400 text-slate-950 hover:bg-cyan-300 cursor-pointer"
            >
              <CircuitBoard className="w-3.5 h-3.5" />
              New Schematic Project
            </button>
          </div>

          {/* Core Engineering Project Suites */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {CORE_PROJECT_SHOWCASE.map((proj) => {
              const Icon = proj.icon;
              return (
                <div
                  key={proj.id}
                  onClick={() => onNavigateTab(proj.tab)}
                  className="bg-[#080d18] border border-[#1e2d4a] hover:border-cyan-400/60 rounded-xl p-4 flex flex-col justify-between gap-3 cursor-pointer transition-colors"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="text-cyan-400 font-semibold">{proj.category}</span>
                      <Icon className="w-4 h-4 text-cyan-400" />
                    </div>
                    <h3 className="text-sm font-bold text-white">{proj.title}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">{proj.desc}</p>
                  </div>
                  <div className="text-xs font-mono text-cyan-300 flex items-center gap-1 pt-2 border-t border-slate-800/80">
                    Open Project <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Custom Saved Project Bookmarks */}
        <div className="bg-[#0d1424] border border-[#1e2d4a] rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <FolderKanban className="w-4 h-4 text-emerald-400" />
              Custom Project Notes &amp; Quick-Launch Bookmarks
            </h3>
            <span className="font-mono text-xs text-slate-400 tabular-nums">
              {workspaceState.savedProjects.length} saved
            </span>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newProjTitle.trim()) return;
              onAddBookmark({
                title: newProjTitle.trim(),
                category: "Custom Workspace Bookmark",
                tab: newProjTab,
                notes: newProjNotes.trim() || "Engineering workspace note",
              });
              setNewProjTitle("");
              setNewProjNotes("");
            }}
            className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 bg-[#080d18] border border-[#1e2d4a] rounded-xl p-3.5"
          >
            <input
              type="text"
              value={newProjTitle}
              onChange={(e) => setNewProjTitle(e.target.value)}
              placeholder="Project title (e.g. Lab 4 inverting op-amp test)..."
              className="sm:col-span-4 px-3 py-2 rounded-lg bg-[#0d1424] border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
            />
            <select
              value={newProjTab}
              onChange={(e) => setNewProjTab(e.target.value as ActiveTabId)}
              className="sm:col-span-3 px-3 py-2 rounded-lg bg-[#0d1424] border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
            >
              <option value="lab">Circuit Designer</option>
              <option value="esp32-lab">ESP32 Learning Lab</option>
              <option value="vlc">VLC Optical Lab</option>
              <option value="multisim">SPICE Simulator</option>
              <option value="robotics-lab">Robotics Lab</option>
              <option value="wireless-lab">Wireless &amp; IoT Lab</option>
            </select>
            <input
              type="text"
              value={newProjNotes}
              onChange={(e) => setNewProjNotes(e.target.value)}
              placeholder="Notes or target metrics..."
              className="sm:col-span-3 px-3 py-2 rounded-lg bg-[#0d1424] border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
            />
            <button
              type="submit"
              className="sm:col-span-2 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-emerald-400 hover:bg-emerald-300 text-slate-950 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Save
            </button>
          </form>

          {workspaceState.savedProjects.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {workspaceState.savedProjects.map((b) => (
                <div
                  key={b.id}
                  className="bg-[#080d18] border border-[#1e2d4a] rounded-xl p-4 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="text-xs font-bold text-white truncate">{b.title}</div>
                    <div className="text-[11px] text-slate-400 truncate">{b.notes}</div>
                    <div className="text-[10px] font-mono text-slate-500">
                      Added {formatRelativeTime(b.timestamp)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => onNavigateTab(b.tab)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 cursor-pointer"
                    >
                      Open
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemoveBookmark(b.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 cursor-pointer"
                      title="Delete project bookmark"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (mode === "recent-work") {
    return (
      <div className="bg-[#0d1424] border border-[#1e2d4a] rounded-2xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-mono text-cyan-400 font-semibold">
              WORKSPACE · RECENT WORK
            </div>
            <h2 className="font-display text-2xl font-bold text-white">
              Recent Laboratories &amp; Simulation Sessions
            </h2>
          </div>
          <Clock className="w-5 h-5 text-cyan-400" />
        </div>

        {workspaceState.recentWork.length === 0 ? (
          <div className="rounded-xl bg-[#080d18] border border-[#1e2d4a] p-8 text-center space-y-3">
            <p className="text-sm text-slate-300">
              Your recent engineering labs, schematics, and ESP32 lessons will appear automatically here as you explore the workbench.
            </p>
            <button
              type="button"
              onClick={() => onNavigateTab("esp32-lab")}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-cyan-400 text-slate-950 cursor-pointer"
            >
              Start with ESP32 Learning Lab <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {workspaceState.recentWork.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigateTab(item.tab)}
                className="text-left p-4 rounded-xl bg-[#080d18] hover:bg-[#10192d] border border-[#1e2d4a] hover:border-cyan-400/50 transition-colors cursor-pointer flex items-center justify-between gap-3"
              >
                <div className="min-w-0 space-y-1">
                  <div className="text-[11px] font-mono text-cyan-400">{item.category}</div>
                  <div className="text-sm font-bold text-white truncate">{item.title}</div>
                  <div className="text-xs text-slate-400 truncate">{item.subtitle}</div>
                </div>
                <div className="text-right shrink-0 space-y-1">
                  <div className="text-[10px] font-mono text-slate-500 tabular-nums">
                    {formatRelativeTime(item.timestamp)}
                  </div>
                  <div className="text-xs font-mono text-cyan-300">Resume →</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // saved-circuits mode
  return (
    <div className="space-y-6">
      <div className="bg-[#0d1424] border border-[#1e2d4a] rounded-2xl p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-mono text-cyan-400 font-semibold">
              WORKSPACE · SAVED CIRCUITS
            </div>
            <h2 className="font-display text-2xl font-bold text-white">
              Auto-Saved Schematic &amp; Version Snapshots
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab("lab")}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-cyan-400 text-slate-950 hover:bg-cyan-300 cursor-pointer"
          >
            Open Circuit Designer
          </button>
        </div>

        {/* Active Auto-Save Slot */}
        {autoSaved ? (
          <div className="rounded-xl bg-[#080d18] border border-emerald-500/40 p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-[11px] font-mono text-emerald-400 font-bold">
                LATEST AUTO-SAVE SLOT
              </div>
              <div className="text-base font-bold text-white">{autoSaved.title}</div>
              <div className="text-xs font-mono text-slate-400 tabular-nums">
                {autoSaved.componentCount} components · {autoSaved.wireCount} wires · Saved at{" "}
                {autoSaved.savedAtFormatted}
              </div>
            </div>
            <button
              type="button"
              onClick={() =>
                onRestoreCircuitToLab({
                  title: autoSaved.title,
                  nodes: autoSaved.nodes,
                  wires: autoSaved.wires,
                })
              }
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-400 hover:bg-emerald-300 text-slate-950 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Load Into Circuit Designer
            </button>
          </div>
        ) : (
          <div className="rounded-xl bg-[#080d18] border border-[#1e2d4a] p-4 text-xs text-slate-400">
            No active auto-saved schematic yet. Any circuit built on the Circuit Designer canvas is saved automatically.
          </div>
        )}

        {/* Saved Snapshots */}
        <div className="space-y-2.5 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Bookmark className="w-4 h-4 text-cyan-400" />
              Saved Schematic Snapshots ({snapshots.length})
            </h3>
          </div>

          {snapshots.length === 0 ? (
            <div className="rounded-xl bg-[#080d18] border border-[#1e2d4a] p-6 text-center text-xs text-slate-400">
              Use &quot;Save Version Snapshot&quot; inside Circuit Designer to store named schematic revisions here.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {snapshots.map((snap) => (
                <div
                  key={snap.id}
                  className="bg-[#080d18] border border-[#1e2d4a] rounded-xl p-4 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="text-sm font-bold text-white truncate">{snap.name}</div>
                    <div className="text-xs text-slate-400 truncate">{snap.presetTitle}</div>
                    <div className="text-[11px] font-mono text-slate-500 tabular-nums">
                      {snap.componentCount} components · {snap.wireCount} wires · {snap.timeFormatted}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        onRestoreCircuitToLab({
                          title: snap.name,
                          nodes: snap.nodes,
                          wires: snap.wires,
                        })
                      }
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 cursor-pointer"
                    >
                      Restore
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteSnapshot(snap.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 cursor-pointer"
                      title="Delete snapshot"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Isolated Per-Project Circuit Schematics */}
        <div className="space-y-2.5 pt-3 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              Isolated Per-Project Schematics ({savedUnifiedProjects.length + savedBuilderProjects.length})
            </h3>
          </div>

          {savedUnifiedProjects.length === 0 && savedBuilderProjects.length === 0 ? (
            <div className="rounded-xl bg-[#080d18] border border-[#1e2d4a] p-5 text-xs text-slate-400">
              No custom isolated schematics saved yet. Use &quot;Save Project&quot; in Interactive Schematics or Series/Parallel Builder to store independent per-project schematics.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {savedUnifiedProjects.map((proj) => (
                <div
                  key={proj.projectId}
                  className="bg-[#080d18] border border-emerald-500/30 rounded-xl p-4 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="text-[10px] font-mono text-emerald-400 font-bold">
                      INTERACTIVE SCHEMATIC · {proj.topology}
                    </div>
                    <div className="text-sm font-bold text-white truncate">{proj.name}</div>
                    <div className="text-[11px] font-mono text-slate-400">
                      {proj.components.length} components · {proj.connections.length} wires · v{proj.metadata.version}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        onOpenUnifiedProject
                          ? onOpenUnifiedProject(proj.projectId)
                          : onNavigateTab("schematics")
                      }
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 cursor-pointer"
                    >
                      Open
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteUnified(proj.projectId)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 cursor-pointer"
                      title="Delete saved project"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              {savedBuilderProjects.map((rec) => (
                <div
                  key={rec.projectId}
                  className="bg-[#080d18] border border-cyan-500/30 rounded-xl p-4 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="text-[10px] font-mono text-cyan-400 font-bold">
                      ANALOG BUILDER ({rec.labMode.toUpperCase()})
                    </div>
                    <div className="text-sm font-bold text-white truncate">{rec.name}</div>
                    <div className="text-[11px] font-mono text-slate-400">
                      {rec.nodes.length} components · {rec.wires.length} wires
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        onOpenBuilderProject
                          ? onOpenBuilderProject(rec.name)
                          : onNavigateTab("lca")
                      }
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 cursor-pointer"
                    >
                      Open
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteBuilder(rec.projectId)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 cursor-pointer"
                      title="Delete saved builder project"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
