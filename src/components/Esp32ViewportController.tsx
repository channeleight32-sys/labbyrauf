import React from "react";
import * as THREE from "three";
import type { OrbitControls } from "three/addons/controls/OrbitControls.js";
import {
  Camera,
  ChevronDown,
  ChevronUp,
  Crosshair,
  Cable,
  Plus,
  RotateCcw,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Move,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Orbit,
  ChevronUpCircle,
  ChevronDownCircle,
} from "lucide-react";

export type Esp32CameraPreset = "ISO" | "TOP" | "SHIELD" | "SIDE" | "BENCH";

// Pre-allocated math scratch objects for zero-GC Three.js viewport manipulation
const _offset = new THREE.Vector3();
const _spherical = new THREE.Spherical();
const _right = new THREE.Vector3();
const _up = new THREE.Vector3();
const _panDelta = new THREE.Vector3();

/**
 * Orbits the Three.js camera smoothly around controls.target using spherical coordinates.
 */
export function orbitRotateCamera(
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
  dTheta: number,
  dPhi: number
): void {
  _offset.copy(camera.position).sub(controls.target);
  _spherical.setFromVector3(_offset);
  _spherical.theta += dTheta;
  _spherical.phi = THREE.MathUtils.clamp(
    _spherical.phi + dPhi,
    Math.max(0.12, controls.minPolarAngle),
    Math.min(Math.PI * 0.48, controls.maxPolarAngle || Math.PI * 0.48)
  );
  _offset.setFromSpherical(_spherical);
  camera.position.copy(controls.target).add(_offset);
  camera.lookAt(controls.target);
  controls.update();
}

/**
 * Pans both camera and controls.target along camera-aligned horizontal & vertical axes.
 */
export function panCameraView(
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
  dx: number,
  dy: number
): void {
  const dist = camera.position.distanceTo(controls.target);
  const scale = Math.max(0.15, dist * 0.08);
  camera.updateMatrixWorld();
  _right.setFromMatrixColumn(camera.matrixWorld, 0).normalize();
  _up.setFromMatrixColumn(camera.matrixWorld, 1).normalize();
  _panDelta.set(0, 0, 0).addScaledVector(_right, dx * scale).addScaledVector(_up, dy * scale);
  camera.position.add(_panDelta);
  controls.target.add(_panDelta);
  controls.update();
}

/**
 * Scales the distance between Three.js camera and controls.target within min/max zoom bounds.
 */
export function zoomCameraView(
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
  factor: number
): void {
  _offset.copy(camera.position).sub(controls.target);
  const currentDist = _offset.length();
  const minDist = controls.minDistance || 2.3;
  const maxDist = controls.maxDistance || 15;
  const nextDist = THREE.MathUtils.clamp(currentDist * factor, minDist, maxDist);
  if (currentDist > 0.0001) {
    _offset.multiplyScalar(nextDist / currentDist);
    camera.position.copy(controls.target).add(_offset);
    controls.update();
  }
}

export function computeCameraZoomPct(
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
  nominalDistance = 8.86
): number {
  const dist = Math.max(0.1, camera.position.distanceTo(controls.target));
  return Math.round(THREE.MathUtils.clamp((nominalDistance / dist) * 100, 45, 320));
}

export interface Esp32ViewportControllerProps {
  activePreset: Esp32CameraPreset;
  onSelectPreset: (preset: Esp32CameraPreset) => void;
  onRotateBy: (dTheta: number, dPhi: number) => void;
  onPanBy: (dx: number, dy: number) => void;
  onZoomBy: (factor: number) => void;
  onResetView: () => void;
  autoOrbit: boolean;
  onToggleAutoOrbit: () => void;
  zoomPct: number;
  selectedPinLabel: string | null;
  onFocusPin: (pinLabel: string) => void;
  wiringMode: boolean;
  onToggleWiringMode: () => void;
  show3DWiring: boolean;
  onToggleShow3DWiring: () => void;
  dockCollapsed: boolean;
  onToggleDockCollapsed: () => void;
}

const PRESET_LIST: { id: Esp32CameraPreset; label: string }[] = [
  { id: "ISO", label: "Isometric" },
  { id: "TOP", label: "Top" },
  { id: "SHIELD", label: "RF Shield" },
  { id: "BENCH", label: "Breadboard" },
  { id: "SIDE", label: "Side" },
];

export default function Esp32ViewportController({
  activePreset,
  onSelectPreset,
  onRotateBy,
  onPanBy,
  onZoomBy,
  onResetView,
  autoOrbit,
  onToggleAutoOrbit,
  zoomPct,
  selectedPinLabel,
  onFocusPin,
  wiringMode,
  onToggleWiringMode,
  show3DWiring,
  onToggleShow3DWiring,
  dockCollapsed,
  onToggleDockCollapsed,
}: Esp32ViewportControllerProps) {
  const holdIntervalRef = React.useRef<number | null>(null);

  const stopHold = React.useCallback(() => {
    if (holdIntervalRef.current !== null) {
      window.clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
  }, []);

  React.useEffect(() => stopHold, [stopHold]);

  const startHold = React.useCallback(
    (stepFn: () => void) => {
      stopHold();
      stepFn();
      holdIntervalRef.current = window.setInterval(stepFn, 48);
    },
    [stopHold]
  );

  return (
    <div
      className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1 max-w-[96%]"
      data-testid="esp32-viewport-controller"
    >
      <button
        type="button"
        onClick={onToggleDockCollapsed}
        className="px-3 py-1 rounded-t-lg bg-[#0b1020]/95 border border-b-0 border-[#1e2d4a] text-[10px] font-mono text-slate-300 hover:text-cyan-300 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
        title="Collapse or expand Three.js 3D Viewport Controller (Shortcut: H)"
      >
        {dockCollapsed ? (
          <>
            <ChevronUp className="w-3 h-3" />
            <span>3D Viewport Controller ({zoomPct}%)</span>
          </>
        ) : (
          <>
            <ChevronDown className="w-3 h-3" />
            <span>Hide 3D Controller (H)</span>
          </>
        )}
      </button>

      {!dockCollapsed && (
        <div className="px-2.5 py-2 rounded-xl bg-[#0b1020]/95 border border-[#1e2d4a] flex flex-wrap items-center justify-center gap-1.5 shadow-2xl">
          {/* Camera View Presets */}
          <div className="flex flex-wrap items-center gap-1 pr-1.5 border-r border-slate-800">
            <Camera className="w-3.5 h-3.5 text-cyan-400 mr-0.5 hidden sm:block" />
            {PRESET_LIST.map((cam) => (
              <button
                key={cam.id}
                type="button"
                onClick={() => onSelectPreset(cam.id)}
                className={`px-2 py-1 rounded-lg text-[11px] font-mono cursor-pointer transition-colors whitespace-nowrap shrink-0 ${
                  activePreset === cam.id
                    ? "bg-cyan-400 text-slate-950 font-bold"
                    : "bg-[#131f38] text-slate-300 hover:text-white"
                }`}
              >
                {cam.label}
              </button>
            ))}
          </div>

          {/* 3D Orbit Rotate + Tilt + Auto-Turntable */}
          <div
            className="flex items-center gap-1 pr-1.5 border-r border-slate-800"
            title="Orbit rotation controls (click or hold)"
          >
            <button
              type="button"
              onPointerDown={() => startHold(() => onRotateBy(-0.08, 0))}
              onPointerUp={stopHold}
              onPointerLeave={stopHold}
              onPointerCancel={stopHold}
              className="p-1 rounded-lg bg-[#131f38] text-slate-300 hover:text-cyan-300 cursor-pointer"
              title="Orbit Rotate Left (Hold for continuous)"
              aria-label="Orbit Rotate Left"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onPointerDown={() => startHold(() => onRotateBy(0.08, 0))}
              onPointerUp={stopHold}
              onPointerLeave={stopHold}
              onPointerCancel={stopHold}
              className="p-1 rounded-lg bg-[#131f38] text-slate-300 hover:text-cyan-300 cursor-pointer"
              title="Orbit Rotate Right (Hold for continuous)"
              aria-label="Orbit Rotate Right"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onPointerDown={() => startHold(() => onRotateBy(0, -0.05))}
              onPointerUp={stopHold}
              onPointerLeave={stopHold}
              onPointerCancel={stopHold}
              className="p-1 rounded-lg bg-[#131f38] text-slate-300 hover:text-cyan-300 cursor-pointer"
              title="Tilt Camera Higher (Top-Down)"
              aria-label="Tilt Camera Higher"
            >
              <ChevronUpCircle className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onPointerDown={() => startHold(() => onRotateBy(0, 0.05))}
              onPointerUp={stopHold}
              onPointerLeave={stopHold}
              onPointerCancel={stopHold}
              className="p-1 rounded-lg bg-[#131f38] text-slate-300 hover:text-cyan-300 cursor-pointer"
              title="Tilt Camera Lower (Side Profile)"
              aria-label="Tilt Camera Lower"
            >
              <ChevronDownCircle className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onToggleAutoOrbit}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-mono cursor-pointer border whitespace-nowrap ${
                autoOrbit
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/60 font-bold"
                  : "bg-[#131f38] text-slate-300 border-slate-700 hover:text-white"
              }`}
              title="Toggle smooth 360° turntable orbit"
            >
              <Orbit className="w-3 h-3" />
              <span>Orbit</span>
            </button>
          </div>

          {/* 3D Pan Pad */}
          <div
            className="flex items-center gap-0.5 pr-1.5 border-r border-slate-800"
            title="Pan 3D bench view (click or hold)"
          >
            <Move className="w-3 h-3 text-slate-400 mr-0.5 hidden md:block" />
            <button
              type="button"
              onPointerDown={() => startHold(() => onPanBy(-0.45, 0))}
              onPointerUp={stopHold}
              onPointerLeave={stopHold}
              onPointerCancel={stopHold}
              className="p-1 rounded bg-[#131f38] text-slate-300 hover:text-cyan-300 cursor-pointer"
              title="Pan Left"
              aria-label="Pan Left"
            >
              <ArrowLeft className="w-3 h-3" />
            </button>
            <button
              type="button"
              onPointerDown={() => startHold(() => onPanBy(0, 0.45))}
              onPointerUp={stopHold}
              onPointerLeave={stopHold}
              onPointerCancel={stopHold}
              className="p-1 rounded bg-[#131f38] text-slate-300 hover:text-cyan-300 cursor-pointer"
              title="Pan Up"
              aria-label="Pan Up"
            >
              <ArrowUp className="w-3 h-3" />
            </button>
            <button
              type="button"
              onPointerDown={() => startHold(() => onPanBy(0, -0.45))}
              onPointerUp={stopHold}
              onPointerLeave={stopHold}
              onPointerCancel={stopHold}
              className="p-1 rounded bg-[#131f38] text-slate-300 hover:text-cyan-300 cursor-pointer"
              title="Pan Down"
              aria-label="Pan Down"
            >
              <ArrowDown className="w-3 h-3" />
            </button>
            <button
              type="button"
              onPointerDown={() => startHold(() => onPanBy(0.45, 0))}
              onPointerUp={stopHold}
              onPointerLeave={stopHold}
              onPointerCancel={stopHold}
              className="p-1 rounded bg-[#131f38] text-slate-300 hover:text-cyan-300 cursor-pointer"
              title="Pan Right"
              aria-label="Pan Right"
            >
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {/* 3D Zoom Controls + Percentage */}
          <div className="flex items-center gap-1 pr-1.5 border-r border-slate-800">
            <button
              type="button"
              onPointerDown={() => startHold(() => onZoomBy(0.93))}
              onPointerUp={stopHold}
              onPointerLeave={stopHold}
              onPointerCancel={stopHold}
              className="p-1 rounded-lg bg-[#131f38] text-slate-300 hover:text-cyan-300 cursor-pointer"
              title="Zoom In (Hold for continuous)"
              aria-label="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-mono text-cyan-300 font-bold tabular-nums min-w-[34px] text-center">
              {zoomPct}%
            </span>
            <button
              type="button"
              onPointerDown={() => startHold(() => onZoomBy(1.07))}
              onPointerUp={stopHold}
              onPointerLeave={stopHold}
              onPointerCancel={stopHold}
              className="p-1 rounded-lg bg-[#131f38] text-slate-300 hover:text-cyan-300 cursor-pointer"
              title="Zoom Out (Hold for continuous)"
              aria-label="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Pin Focus & Interactive Wiring Toggles */}
          {selectedPinLabel && (
            <button
              type="button"
              onClick={() => onFocusPin(selectedPinLabel)}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 cursor-pointer whitespace-nowrap shrink-0"
              title="Smoothly zoom camera to selected GPIO pin"
            >
              <Crosshair className="w-3 h-3" />
              <span>Focus {selectedPinLabel}</span>
            </button>
          )}

          <button
            type="button"
            onClick={onToggleWiringMode}
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-mono cursor-pointer border whitespace-nowrap shrink-0 ${
              wiringMode
                ? "bg-amber-500/25 text-amber-200 border-amber-400/70 font-bold"
                : "bg-[#131f38] text-slate-300 border-slate-700 hover:text-white"
            }`}
            title="Click ESP32 GPIO pins and breadboard terminals to draw custom 3D jumper wires"
          >
            <Plus className="w-3 h-3" />
            <span>Wire Mode</span>
          </button>

          <button
            type="button"
            onClick={onToggleShow3DWiring}
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-mono cursor-pointer border whitespace-nowrap shrink-0 ${
              show3DWiring
                ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
                : "bg-[#131f38] text-slate-400 border-slate-700"
            }`}
            title="Toggle animated 3D jumper wires & current flow beads"
          >
            <Cable className="w-3 h-3" />
            <span>3D Wires</span>
          </button>

          <button
            type="button"
            onClick={onResetView}
            className="px-2 py-1 rounded-lg bg-[#131f38] text-[10px] font-mono text-slate-300 hover:text-cyan-300 border border-slate-700 cursor-pointer shrink-0"
            title="Reset 3D Camera & Pan"
          >
            Reset
          </button>
        </div>
      )}
    </div>
  );
}
