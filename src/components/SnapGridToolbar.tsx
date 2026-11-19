import React from "react";
import {
  Grid,
  Magnet,
  GitCommit,
  AlignStartVertical,
  AlignStartHorizontal,
  AlignVerticalSpaceAround,
  Wand2,
  Check,
  RotateCcw,
  Route,
  Zap,
  Sparkles,
  MousePointerClick,
} from "lucide-react";
import type {
  GridPitch,
  GridVisualStyle,
  WireRoutingMode,
  MultiAlignAction,
} from "../utils/schematicGrid";
import type { AutoRouterTelemetry } from "../utils/autoRouterEngine";

interface SnapGridToolbarProps {
  snapEnabled: boolean;
  onToggleSnap: () => void;
  gridPitch: GridPitch;
  onChangeGridPitch: (pitch: GridPitch) => void;
  gridStyle: GridVisualStyle;
  onChangeGridStyle: (style: GridVisualStyle) => void;
  magneticGuides: boolean;
  onToggleMagneticGuides: () => void;
  wireRoutingMode: WireRoutingMode;
  onChangeWireRoutingMode: (mode: WireRoutingMode) => void;
  onSnapAllNodes: () => void;
  onAlignNodes: (action: MultiAlignAction) => void;
  onAutoTidyCircuit: () => void;
  onResetWireChannels: () => void;
  hasCustomWireChannels: boolean;
  selectedCount: number;
  cursorWorld: { x: number; y: number } | null;
  // Auto-Router & Smart Pin Auto-Connect Props
  autoRouterEnabled: boolean;
  onToggleAutoRouter: () => void;
  isQuickAutoWireMode: boolean;
  onToggleQuickAutoWireMode: () => void;
  onAutoConnectUnwiredPins: () => void;
  onAutoRouteAndOptimizeAll: () => void;
  onLoadUnwiredDemoCircuit: () => void;
  routerTelemetry: AutoRouterTelemetry;
  lastAutoRouteNotice: string | null;
}

const PITCH_OPTIONS: { value: GridPitch; label: string; hint: string }[] = [
  { value: 10, label: "10px", hint: "Fine IC Pin Grid (10px)" },
  { value: 20, label: "20px", hint: "Standard Schematic Grid (20px)" },
  { value: 25, label: "25px", hint: "IEEE Gate Pitch (25px)" },
  { value: 40, label: "40px", hint: "Coarse Block Grid (40px)" },
];

export const SnapGridToolbar: React.FC<SnapGridToolbarProps> = ({
  snapEnabled,
  onToggleSnap,
  gridPitch,
  onChangeGridPitch,
  gridStyle,
  onChangeGridStyle,
  magneticGuides,
  onToggleMagneticGuides,
  wireRoutingMode,
  onChangeWireRoutingMode,
  onSnapAllNodes,
  onAlignNodes,
  onAutoTidyCircuit,
  onResetWireChannels,
  hasCustomWireChannels,
  selectedCount,
  cursorWorld,
  autoRouterEnabled,
  onToggleAutoRouter,
  isQuickAutoWireMode,
  onToggleQuickAutoWireMode,
  onAutoConnectUnwiredPins,
  onAutoRouteAndOptimizeAll,
  onLoadUnwiredDemoCircuit,
  routerTelemetry,
  lastAutoRouteNotice,
}) => {
  const totalUnwiredPins =
    routerTelemetry.unconnectedInputPins +
    routerTelemetry.unconnectedOutputPins;

  return (
    <div className="bg-gradient-to-r from-[#0c1424] via-[#111827] to-[#0c1424] border border-cyan-500/30 rounded-xl px-3.5 py-2.5 shadow-md space-y-2.5">
      {/* Row 1: Snap-to-Grid Toggle, Pitch Selector, Grid Style, Magnetic Guides & Wire Routing Mode */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onToggleSnap}
            className={`inline-flex items-center justify-center p-2 rounded-lg text-xs font-mono font-bold border transition-all cursor-pointer ${
              snapEnabled
                ? "bg-cyan-500/20 border-cyan-400 text-cyan-200 shadow-sm shadow-cyan-500/15"
                : "bg-slate-900/90 border-slate-700 text-slate-400 hover:text-slate-200"
            }`}
            title={`Snap-to-Grid: ${snapEnabled ? "ON" : "OFF"} (Click to Toggle)`}
          >
            <Grid className="w-3.5 h-3.5 text-cyan-400" />
          </button>

          {/* Grid Pitch Step Selector */}
          <div
            className="inline-flex items-center bg-slate-950/90 border border-slate-800 rounded-lg p-0.5 text-[11px] font-mono"
            title="Select Schematic Snap Grid Pitch"
          >
            {PITCH_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChangeGridPitch(opt.value)}
                title={opt.hint}
                className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                  gridPitch === opt.value
                    ? "bg-cyan-500/25 text-cyan-200 font-bold border border-cyan-500/40"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Grid Canvas Style */}
          <div
            className="inline-flex items-center bg-slate-950/90 border border-slate-800 rounded-lg p-0.5 text-[11px] font-mono"
            title="Select Schematic Background Grid Style"
          >
            {(
              [
                { id: "blueprint", label: "Blueprint" },
                { id: "dots", label: "Dots" },
                { id: "off", label: "Clean" },
              ] as { id: GridVisualStyle; label: string }[]
            ).map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => onChangeGridStyle(st.id)}
                className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                  gridStyle === st.id
                    ? "bg-slate-800 text-cyan-300 font-semibold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          {/* Smart Pin & Column Magnetic Laser Guides Toggle */}
          <button
            type="button"
            onClick={onToggleMagneticGuides}
            className={`inline-flex items-center justify-center p-2 rounded-lg text-xs font-mono font-semibold border transition-colors cursor-pointer ${
              magneticGuides
                ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-200"
                : "bg-slate-900/90 border-slate-800 text-slate-400 hover:text-slate-200"
            }`}
            title={`Pin Laser Guides: ${magneticGuides ? "ON" : "OFF"} (Snap gate pins into straight horizontal alignment)`}
          >
            <Magnet className="w-3.5 h-3.5 text-emerald-400" />
          </button>
        </div>

        {/* Right Group: Wire Routing Mode Selector */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center bg-slate-950/90 border border-slate-800 rounded-lg p-0.5 text-[11px] font-mono">
            <span className="px-2 text-[10px] text-slate-400 inline-flex items-center gap-1">
              <GitCommit className="w-3 h-3 text-cyan-400" />
              Wires:
            </span>
            {(
              [
                {
                  id: "orthogonal",
                  label: "90° A* Orthogonal",
                  tip: "A* Obstacle-avoiding Manhattan 90° wire routing with channel separation",
                },
                {
                  id: "chamfer",
                  label: "45° CAD",
                  tip: "Octilinear 45° chamfered PCB/EDA style routing",
                },
                {
                  id: "bezier",
                  label: "Smooth Curve",
                  tip: "Classic cubic Bezier curved wires",
                },
              ] as { id: WireRoutingMode; label: string; tip: string }[]
            ).map((rm) => (
              <button
                key={rm.id}
                type="button"
                onClick={() => onChangeWireRoutingMode(rm.id)}
                title={rm.tip}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  wireRoutingMode === rm.id
                    ? "bg-cyan-500/25 text-cyan-200 font-bold border border-cyan-500/40"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {rm.label}
              </button>
            ))}
          </div>

          {hasCustomWireChannels && (
            <button
              type="button"
              onClick={onResetWireChannels}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-mono bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 cursor-pointer"
              title="Reset manually dragged wire routing channels to automatic A* paths"
            >
              <RotateCcw className="w-3 h-3 text-cyan-400" />
              Reset Channels
            </button>
          )}
        </div>
      </div>

      {/* Row 2: Dedicated A* Auto-Router Algorithm & 1-Click Smart Pin Auto-Connect Suite */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-800/80 bg-slate-950/60 rounded-lg px-3 py-2 border border-emerald-500/25">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold text-emerald-300 uppercase tracking-wider">
            <Route className="w-3.5 h-3.5 text-emerald-400" />
            Auto-Router Engine:
          </span>

          {/* Toggle A* Obstacle-Avoiding Pathfinding */}
          <button
            type="button"
            onClick={onToggleAutoRouter}
            className={`inline-flex items-center justify-center p-1.5 rounded-md text-[11px] font-mono font-bold border transition-all cursor-pointer ${
              autoRouterEnabled
                ? "bg-emerald-500/20 border-emerald-400 text-emerald-200 shadow-sm shadow-emerald-500/15"
                : "bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200"
            }`}
            title={`A* Obstacle Router: ${autoRouterEnabled ? "ON" : "OFF"} (Real-time Manhattan pathfinding & de-congestion)`}
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          </button>

          {/* 1-Click Auto-Connect Unwired Pins */}
          <button
            type="button"
            onClick={onAutoConnectUnwiredPins}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-mono font-bold bg-gradient-to-r from-emerald-600/35 to-cyan-600/35 hover:from-emerald-500/45 hover:to-cyan-500/45 text-emerald-100 border border-emerald-400/60 shadow-sm shadow-emerald-500/15 transition-all cursor-pointer"
            title="Auto-Wire: Automatically connect all unconnected logic gate & IC pins on canvas"
          >
            <Zap className="w-3.5 h-3.5 text-amber-300" />
            {totalUnwiredPins > 0 && (
              <span className="text-[10px] text-emerald-200 font-bold">
                {routerTelemetry.unconnectedInputPins > 0 ? routerTelemetry.unconnectedInputPins : totalUnwiredPins}
              </span>
            )}
          </button>

          {/* 1-Click Optimize & Re-Route All Nets */}
          <button
            type="button"
            onClick={onAutoRouteAndOptimizeAll}
            className="inline-flex items-center justify-center p-1.5 rounded-md text-[11px] font-mono font-semibold bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-200 border border-cyan-500/40 transition-colors cursor-pointer"
            title="Optimize & Re-Route: Calculate clean orthogonal channels for all wires"
          >
            <Route className="w-3.5 h-3.5 text-cyan-400" />
          </button>

          {/* Interactive Click-Gate-to-Gate Quick Auto-Wire Mode */}
          <button
            type="button"
            onClick={onToggleQuickAutoWireMode}
            className={`inline-flex items-center justify-center p-1.5 rounded-md text-[11px] font-mono font-semibold border transition-colors cursor-pointer ${
              isQuickAutoWireMode
                ? "bg-amber-500/25 border-amber-400 text-amber-200 shadow-sm shadow-amber-500/20"
                : "bg-slate-900 border-slate-700/80 text-slate-300 hover:border-amber-500/50 hover:text-amber-200"
            }`}
            title={`Click-to-Click Wire Mode: ${isQuickAutoWireMode ? "ACTIVE (Click Gate A then B to connect)" : "INACTIVE (Click to enable)"}`}
          >
            <MousePointerClick className="w-3.5 h-3.5 text-amber-400" />
          </button>

          {/* Load Unwired Gate Demo */}
          <button
            type="button"
            onClick={onLoadUnwiredDemoCircuit}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-mono bg-slate-900 hover:bg-slate-800 text-violet-300 border border-violet-500/40 transition-colors cursor-pointer"
            title="Load Unwired Gates Demo to test automatic routing"
          >
            Demo Circuit
          </button>
        </div>

        {/* Live Auto-Router Telemetry Readout */}
        <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono">
          {lastAutoRouteNotice && (
            <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/50 text-emerald-200 font-bold">
              {lastAutoRouteNotice}
            </span>
          )}
          <span
            className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-emerald-300 font-semibold"
            title="Routing Manhattan Efficiency Score (Ideal Manhattan Distance / Actual Routed Length)"
          >
            Eff: {routerTelemetry.efficiencyScore}%
          </span>
          <span
            className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-cyan-300"
            title="Total Routed Wire Length & 90° Bends"
          >
            Len: {routerTelemetry.totalWireLengthPx}px · {routerTelemetry.totalBends} Bends
          </span>
          <span
            className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-amber-300"
            title="Number of Gate Bounding-Box Collisions Detoured Around by A* Pathfinding"
          >
            Detours: {routerTelemetry.gateCollisionsAvoided} · Crossings:{" "}
            {routerTelemetry.wireCrossingsCount}
          </span>
        </div>
      </div>

      {/* Row 3: 1-Click Grid Alignment, Distribution & Auto-Tidy Actions + Live Snapped Cursor Coordinates */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-slate-800/80">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mr-1">
            Quick Align{" "}
            {selectedCount >= 2 ? `(${selectedCount} Selected)` : "(Circuit)"}:
          </span>

          <button
            type="button"
            onClick={onSnapAllNodes}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-700/90 transition-colors cursor-pointer"
            title={`Snap all components on canvas to the ${gridPitch}px grid`}
          >
            <Check className="w-3 h-3 text-cyan-400" />
            Snap All ({gridPitch}px)
          </button>

          <button
            type="button"
            onClick={() => onAlignNodes("align-left")}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-mono bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 transition-colors cursor-pointer"
            title="Align selected gates (or internal gates) into a vertical column (same X)"
          >
            <AlignStartVertical className="w-3 h-3 text-cyan-400" />
            Align Column (X)
          </button>

          <button
            type="button"
            onClick={() => onAlignNodes("align-top")}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-mono bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 transition-colors cursor-pointer"
            title="Align selected gates into a horizontal row (same Y)"
          >
            <AlignStartHorizontal className="w-3 h-3 text-cyan-400" />
            Align Row (Y)
          </button>

          <button
            type="button"
            onClick={() => onAlignNodes("distribute-y")}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-mono bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 transition-colors cursor-pointer"
            title="Evenly distribute selected/column gates vertically on the grid"
          >
            <AlignVerticalSpaceAround className="w-3 h-3 text-cyan-400" />
            Distribute Y
          </button>

          <button
            type="button"
            onClick={onAutoTidyCircuit}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-mono font-bold bg-gradient-to-r from-cyan-600/30 to-emerald-600/30 hover:from-cyan-500/40 hover:to-emerald-500/40 text-cyan-200 border border-cyan-400/50 transition-all cursor-pointer"
            title="Automatically organize all INPUTs, Logic Stages, and OUTPUTs into clean grid-snapped columns & rows and re-run A* auto-router"
          >
            <Wand2 className="w-3 h-3 text-emerald-300" />
            Auto-Place &amp; Route Grid
          </button>
        </div>

        {/* Live Grid Cursor Coordinate Readout */}
        <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
          {cursorWorld ? (
            <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-cyan-300">
              Grid XY: ({cursorWorld.x}, {cursorWorld.y})
            </span>
          ) : (
            <span className="text-[10px] text-slate-500">
              Tip: Double-click any unconnected pin to auto-route it to the nearest compatible pin
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

