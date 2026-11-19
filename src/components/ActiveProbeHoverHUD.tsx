import React, { useState, useRef, useMemo, useEffect } from "react";
import {
  Activity,
  Crosshair,
  GripHorizontal,
  Maximize2,
  Minimize2,
  ExternalLink,
  X,
  Zap,
} from "lucide-react";
import { ProbedWireSignal } from "./WireProbePopupWindow";

export interface ProbeScreenPoint {
  channelId: "CH1" | "CH2" | "CH3" | "CH4";
  wireId: number;
  screenX: number;
  screenY: number;
}

export interface ActiveProbeHoverHUDProps {
  probedSignals: ProbedWireSignal[];
  probeScreenPoints: ProbeScreenPoint[];
  viewportSize: { width: number; height: number };
  isSimRunning: boolean;
  hoveredChannel: "CH1" | "CH2" | "CH3" | "CH4" | null;
  onHoverChannel: (ch: "CH1" | "CH2" | "CH3" | "CH4" | null) => void;
  onFocusProbeWire?: (wireId: number) => void;
  onRemoveProbe?: (ch: "CH1" | "CH2" | "CH3" | "CH4") => void;
  onOpenScopePopup?: () => void;
  onHideHud?: () => void;
}

function getLogicBadgeClasses(logicState: "HIGH" | "LOW" | "Z") {
  if (logicState === "HIGH") {
    return "bg-emerald-500/20 text-emerald-300 border-emerald-400/60 shadow-[0_0_8px_rgba(16,185,129,0.25)]";
  }
  if (logicState === "Z") {
    return "bg-amber-500/20 text-amber-300 border-amber-400/70 shadow-[0_0_8px_rgba(245,158,11,0.3)]";
  }
  return "bg-slate-800/90 text-slate-300 border-slate-600/70";
}

function formatProbeVoltage(sig: ProbedWireSignal): string {
  if (sig.logicState === "Z" || sig.isFloating) {
    return "High-Z";
  }
  if (sig.waveformType === "AC_SINE" && sig.rmsVoltage !== undefined) {
    return `${sig.rmsVoltage.toFixed(2)} Vrms`;
  }
  return `${sig.currentVoltage.toFixed(2)} V`;
}

export const ActiveProbeHoverHUD: React.FC<ActiveProbeHoverHUDProps> = ({
  probedSignals,
  probeScreenPoints,
  viewportSize,
  isSimRunning,
  hoveredChannel,
  onHoverChannel,
  onFocusProbeWire,
  onRemoveProbe,
  onOpenScopePopup,
  onHideHud,
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [customPos, setCustomPos] = useState<{ x: number; y: number } | null>(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{
    mouseX: number;
    mouseY: number;
    startX: number;
    startY: number;
  }>({ mouseX: 0, mouseY: 0, startX: 0, startY: 0 });

  const hudWidth = isMinimized ? 236 : 292;
  const hudEstimatedHeight = isMinimized
    ? 44
    : Math.min(276, 62 + probedSignals.length * 46);

  // Compute smart position anchored near the active probe points, clamped cleanly inside viewport
  const autoPos = useMemo(() => {
    const vpW = Math.max(360, viewportSize.width || 800);
    const vpH = Math.max(260, viewportSize.height || 520);
    const padX = 12;
    const minY = 54; // Stay clear of top-left theme pill & top-right status badge
    const maxY = Math.max(minY, vpH - hudEstimatedHeight - 52);

    if (probeScreenPoints.length === 0) {
      return {
        x: Math.max(padX, vpW - hudWidth - 16),
        y: minY + 8,
      };
    }

    let minPX = Infinity;
    let maxPX = -Infinity;
    let sumPY = 0;
    probeScreenPoints.forEach((pt) => {
      if (pt.screenX < minPX) minPX = pt.screenX;
      if (pt.screenX > maxPX) maxPX = pt.screenX;
      sumPY += pt.screenY;
    });
    const avgPY = sumPY / probeScreenPoints.length;

    // Prefer placing just to the right of active probe points; flip left if near right edge
    let targetX = maxPX + 34;
    if (targetX + hudWidth > vpW - padX) {
      const leftOption = minPX - hudWidth - 34;
      targetX = leftOption >= padX ? leftOption : vpW - hudWidth - padX;
    }
    const clampedX = Math.max(padX, Math.min(vpW - hudWidth - padX, Math.round(targetX)));
    const clampedY = Math.max(
      minY,
      Math.min(maxY, Math.round(avgPY - hudEstimatedHeight * 0.45))
    );
    return { x: clampedX, y: clampedY };
  }, [probeScreenPoints, viewportSize.width, viewportSize.height, hudWidth, hudEstimatedHeight]);

  const effectivePos = useMemo(() => {
    if (!customPos) return autoPos;
    const vpW = Math.max(360, viewportSize.width || 800);
    const vpH = Math.max(260, viewportSize.height || 520);
    return {
      x: Math.max(8, Math.min(vpW - hudWidth - 8, customPos.x)),
      y: Math.max(8, Math.min(vpH - hudEstimatedHeight - 8, customPos.y)),
    };
  }, [customPos, autoPos, viewportSize.width, viewportSize.height, hudWidth, hudEstimatedHeight]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const dx = e.clientX - dragStartRef.current.mouseX;
      const dy = e.clientY - dragStartRef.current.mouseY;
      setCustomPos({
        x: dragStartRef.current.startX + dx,
        y: dragStartRef.current.startY + dy,
      });
    };
    const onUp = () => {
      isDraggingRef.current = false;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  if (probedSignals.length === 0) return null;

  return (
    <div
      style={{
        left: `${effectivePos.x}px`,
        top: `${effectivePos.y}px`,
        width: `${hudWidth}px`,
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
      className="absolute z-25 rounded-xl bg-[#070d1a]/92 backdrop-blur-md border border-cyan-500/45 shadow-[0_12px_32px_rgba(2,6,23,0.78),0_0_18px_rgba(6,182,212,0.16)] text-slate-100 select-none transition-[left,top] duration-150 ease-out"
    >
      {/* Draggable HUD Header */}
      <div
        onMouseDown={(e) => {
          if ((e.target as HTMLElement).closest("button")) return;
          isDraggingRef.current = true;
          dragStartRef.current = {
            mouseX: e.clientX,
            mouseY: e.clientY,
            startX: effectivePos.x,
            startY: effectivePos.y,
          };
        }}
        className="flex items-center justify-between gap-1.5 px-2.5 py-1.5 bg-slate-900/90 border-b border-slate-800/90 rounded-t-xl cursor-grab active:cursor-grabbing"
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <GripHorizontal className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              isSimRunning
                ? "bg-emerald-400 shadow-[0_0_8px_#34d399]"
                : "bg-amber-400"
            }`}
          />
          <span className="text-[10.5px] font-mono font-bold tracking-wide text-cyan-300 truncate">
            LIVE PROBE HUD
          </span>
          <span className="px-1.5 py-0.2 rounded bg-cyan-950/90 border border-cyan-700/60 text-[9.5px] font-mono font-bold text-cyan-200 shrink-0">
            {probedSignals.length} CH
          </span>
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          {customPos && (
            <button
              type="button"
              onClick={() => setCustomPos(null)}
              className="p-1 rounded hover:bg-slate-800 text-cyan-400 hover:text-cyan-200 transition-colors cursor-pointer"
              title="Re-anchor HUD near active probe points"
            >
              <Crosshair className="w-3 h-3" />
            </button>
          )}
          {onOpenScopePopup && (
            <button
              type="button"
              onClick={onOpenScopePopup}
              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer"
              title="Open Oscilloscope Waveform Window"
            >
              <ExternalLink className="w-3 h-3" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsMinimized((m) => !m)}
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title={isMinimized ? "Expand Probe Telemetry" : "Minimize Probe HUD"}
          >
            {isMinimized ? (
              <Maximize2 className="w-3 h-3" />
            ) : (
              <Minimize2 className="w-3 h-3" />
            )}
          </button>
          {onHideHud && (
            <button
              type="button"
              onClick={onHideHud}
              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
              title="Hide Hovering Probe HUD"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Body: Compact telemetry rows per active probe point */}
      {!isMinimized && (
        <div className="p-2 space-y-1.5 max-h-60 overflow-y-auto">
          {probedSignals.map((sig) => {
            const logicState: "HIGH" | "LOW" | "Z" =
              sig.logicState ??
              (sig.isFloating ? "Z" : sig.currentVoltage >= 2.0 ? "HIGH" : "LOW");
            const isHovered = hoveredChannel === sig.channelId;
            const vRatio =
              logicState === "Z"
                ? 0
                : Math.max(0, Math.min(1, Math.abs(sig.currentVoltage) / Math.max(5, sig.peakVoltage || 5)));

            return (
              <div
                key={sig.channelId}
                onMouseEnter={() => onHoverChannel(sig.channelId)}
                onMouseLeave={() => onHoverChannel(null)}
                onClick={() => onFocusProbeWire?.(sig.wireId)}
                className={`group rounded-lg px-2 py-1.5 border transition-all cursor-pointer ${
                  isHovered
                    ? "bg-slate-900/95 border-cyan-400/70 shadow-[0_0_12px_rgba(34,211,238,0.18)]"
                    : "bg-slate-950/75 border-slate-800/80 hover:border-slate-700"
                }`}
                title="Click to focus probed wire · Hover to highlight probe point"
              >
                <div className="flex items-center justify-between gap-2">
                  {/* Left: Channel color dot + ID + Net */}
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{
                        backgroundColor: sig.color,
                        boxShadow: `0 0 6px ${sig.color}`,
                      }}
                    />
                    <span
                      className="text-[10.5px] font-mono font-bold shrink-0"
                      style={{ color: sig.color }}
                    >
                      {sig.channelId}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 truncate">
                      {sig.sourceLabel} → {sig.targetLabel}
                    </span>
                  </div>

                  {/* Right: Real-time Voltage + Logic State (HIGH / LOW / Z) */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[11px] font-mono font-bold tabular-nums text-white">
                      {formatProbeVoltage(sig)}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded border text-[9px] font-mono font-extrabold tracking-wider ${getLogicBadgeClasses(
                        logicState
                      )}`}
                    >
                      {logicState === "Z" ? "Z · FLOAT" : logicState}
                    </span>
                    {onRemoveProbe && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveProbe(sig.channelId);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-slate-800 text-slate-500 hover:text-rose-400 transition-opacity cursor-pointer"
                        title={`Detach ${sig.channelId} probe`}
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Live voltage bar + current/frequency sub-telemetry */}
                <div className="mt-1 flex items-center gap-2">
                  <div className="flex-1 h-1 rounded-full bg-slate-800/90 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-150"
                      style={{
                        width: `${Math.round(vRatio * 100)}%`,
                        backgroundColor:
                          logicState === "Z" ? "#f59e0b" : sig.color,
                      }}
                    />
                  </div>
                  <div className="flex items-center gap-1.5 text-[9px] font-mono text-slate-400 tabular-nums shrink-0">
                    {sig.currentMa !== undefined && sig.currentMa > 0.01 && (
                      <span className="text-amber-300/90">
                        {sig.currentMa.toFixed(1)}mA
                      </span>
                    )}
                    {sig.waveformType === "AC_SINE" || sig.waveformType === "PULSE" ? (
                      <span className="text-cyan-300/90 flex items-center gap-0.5">
                        <Activity className="w-2.5 h-2.5" />
                        {sig.frequencyHz ?? 50}Hz
                      </span>
                    ) : (
                      <span>
                        {logicState === "HIGH"
                          ? "V≥2.0V"
                          : logicState === "Z"
                          ? "OPEN/Hi-Z"
                          : "V<0.8V"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {!isSimRunning && (
            <div className="flex items-center justify-center gap-1.5 pt-0.5 text-[9.5px] font-mono text-amber-300/90">
              <Zap className="w-3 h-3" />
              <span>Simulation paused · Press Run for live transients</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ActiveProbeHoverHUD;
