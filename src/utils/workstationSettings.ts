import { getUserScopedKey } from "./userStorageScope";

export type GridPitchPx = 10 | 20 | 25;
export type TelemetryDecimals = 2 | 3 | 4;

export interface WorkstationSettings {
  gridPitch: GridPitchPx;
  telemetryDecimals: TelemetryDecimals;
  forceReducedMotion: boolean;
  autoSaveEnabled: boolean;
}

export const WORKSTATION_SETTINGS_KEY = "ist_workstation_settings_v1";

export const DEFAULT_WORKSTATION_SETTINGS: WorkstationSettings = {
  gridPitch: 20,
  telemetryDecimals: 2,
  forceReducedMotion: false,
  autoSaveEnabled: true,
};

export function loadWorkstationSettings(): WorkstationSettings {
  if (typeof window === "undefined" || !window.localStorage) {
    return DEFAULT_WORKSTATION_SETTINGS;
  }
  try {
    const raw = window.localStorage.getItem(
      getUserScopedKey(WORKSTATION_SETTINGS_KEY)
    );
    if (!raw) return DEFAULT_WORKSTATION_SETTINGS;
    const parsed = JSON.parse(raw);
    const resolved: WorkstationSettings = {
      gridPitch:
        parsed.gridPitch === 10 || parsed.gridPitch === 20 || parsed.gridPitch === 25
          ? parsed.gridPitch
          : 20,
      telemetryDecimals:
        parsed.telemetryDecimals === 2 ||
        parsed.telemetryDecimals === 3 ||
        parsed.telemetryDecimals === 4
          ? parsed.telemetryDecimals
          : 2,
      forceReducedMotion: Boolean(parsed.forceReducedMotion),
      autoSaveEnabled:
        typeof parsed.autoSaveEnabled === "boolean" ? parsed.autoSaveEnabled : true,
    };
    applyWorkstationSettingsToDocument(resolved);
    return resolved;
  } catch {
    return DEFAULT_WORKSTATION_SETTINGS;
  }
}

export function saveWorkstationSettings(settings: WorkstationSettings): void {
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      window.localStorage.setItem(
        getUserScopedKey(WORKSTATION_SETTINGS_KEY),
        JSON.stringify(settings)
      );
    } catch {
      // ignore quota errors
    }
  }
  applyWorkstationSettingsToDocument(settings);
}

export function applyWorkstationSettingsToDocument(
  settings: WorkstationSettings
): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (settings.forceReducedMotion) {
    root.classList.add("ws-reduced-motion");
  } else {
    root.classList.remove("ws-reduced-motion");
  }
}
