import {
  getUserScopedKey,
  notifyCloudProjectDelete,
  notifyCloudProjectUpsert,
} from "./userStorageScope";

export const CIRCUITLAB_AUTOSAVE_KEY = "logicraft_circuitlab_autosave_v1";
export const CIRCUITLAB_AUTOSAVE_BY_PROJECT_KEY = "logicraft_circuitlab_autosave_projects_v1";

export interface AutoSavedCircuitData {
  version: number;
  projectId?: string;
  timestamp: number;
  title: string;
  nodes: any[];
  wires: any[];
  componentCount: number;
  wireCount: number;
  savedAtFormatted: string;
}

function deepCloneSafe<T>(val: T): T {
  return JSON.parse(JSON.stringify(val)) as T;
}

function readScopedAutoSaveMap(): Record<string, AutoSavedCircuitData> {
  if (typeof window === "undefined" || !window.localStorage) return {};
  try {
    const raw = window.localStorage.getItem(
      getUserScopedKey(CIRCUITLAB_AUTOSAVE_BY_PROJECT_KEY)
    );
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, AutoSavedCircuitData>)
      : {};
  } catch {
    return {};
  }
}

export function saveCircuitToLocalStorage(
  title: string,
  nodes: any[],
  wires: any[],
  projectId?: string
): boolean {
  if (typeof window === "undefined" || !window.localStorage) return false;
  // Avoid saving empty or blank circuits
  if (!nodes || nodes.length === 0) return false;

  try {
    const now = Date.now();
    const resolvedProjectId = (projectId || title || "default_workspace").trim();
    const data: AutoSavedCircuitData = {
      version: 2,
      projectId: resolvedProjectId,
      timestamp: now,
      title: title || "Custom Schematic",
      nodes: deepCloneSafe(nodes),
      wires: deepCloneSafe(wires),
      componentCount: nodes.length,
      wireCount: wires.length,
      savedAtFormatted: new Date(now).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
    };

    const scopedMap = readScopedAutoSaveMap();
    scopedMap[resolvedProjectId] = data;
    window.localStorage.setItem(
      getUserScopedKey(CIRCUITLAB_AUTOSAVE_BY_PROJECT_KEY),
      JSON.stringify(scopedMap)
    );

    window.localStorage.setItem(
      getUserScopedKey(CIRCUITLAB_AUTOSAVE_KEY),
      JSON.stringify(data)
    );
    notifyCloudProjectUpsert("autosave_slot", `autosave_${resolvedProjectId}`, {
      name: data.title,
      circuitData: data as unknown as Record<string, unknown>,
      componentCount: data.componentCount,
      wireCount: data.wireCount,
    });
    return true;
  } catch (err) {
    console.warn("Auto-save to localStorage failed:", err);
    return false;
  }
}

export function getAutoSavedCircuit(projectId?: string): AutoSavedCircuitData | null {
  if (typeof window === "undefined" || !window.localStorage) return null;
  try {
    if (projectId) {
      const scopedMap = readScopedAutoSaveMap();
      const entry = scopedMap[projectId.trim()];
      if (
        entry &&
        Array.isArray(entry.nodes) &&
        entry.nodes.length > 0 &&
        Array.isArray(entry.wires)
      ) {
        return deepCloneSafe(entry);
      }
      return null;
    }

    const raw = window.localStorage.getItem(getUserScopedKey(CIRCUITLAB_AUTOSAVE_KEY));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AutoSavedCircuitData;
    if (
      parsed &&
      Array.isArray(parsed.nodes) &&
      parsed.nodes.length > 0 &&
      Array.isArray(parsed.wires)
    ) {
      return deepCloneSafe(parsed);
    }
    return null;
  } catch (err) {
    console.warn("Failed to retrieve auto-saved circuit:", err);
    return null;
  }
}

export function getAllAutoSavedCircuits(): AutoSavedCircuitData[] {
  const scopedMap = readScopedAutoSaveMap();
  return Object.values(scopedMap)
    .filter((entry) => entry && Array.isArray(entry.nodes) && entry.nodes.length > 0)
    .map((entry) => deepCloneSafe(entry))
    .sort((a, b) => b.timestamp - a.timestamp);
}

export function clearAutoSavedCircuit(projectId?: string): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    if (projectId) {
      const scopedMap = readScopedAutoSaveMap();
      delete scopedMap[projectId.trim()];
      window.localStorage.setItem(
        getUserScopedKey(CIRCUITLAB_AUTOSAVE_BY_PROJECT_KEY),
        JSON.stringify(scopedMap)
      );
      notifyCloudProjectDelete(`autosave_${projectId.trim()}`);
      return;
    }
    window.localStorage.removeItem(getUserScopedKey(CIRCUITLAB_AUTOSAVE_KEY));
    window.localStorage.removeItem(
      getUserScopedKey(CIRCUITLAB_AUTOSAVE_BY_PROJECT_KEY)
    );
  } catch (err) {
    console.warn("Failed to remove auto-saved circuit:", err);
  }
}

export function formatTimeAgo(timestampMs: number): string {
  const diffSec = Math.floor((Date.now() - timestampMs) / 1000);
  if (diffSec < 5) return "just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return new Date(timestampMs).toLocaleDateString();
}

/* ============================================================================
 * Session Version Snapshot Management
 * ============================================================================ */

export const CIRCUITLAB_SNAPSHOTS_KEY = "logicraft_circuit_snapshots_v1";

export interface CircuitVersionSnapshot {
  id: string;
  name: string;
  timestamp: number;
  timeFormatted: string;
  componentCount: number;
  wireCount: number;
  nodes: any[];
  wires: any[];
  presetTitle: string;
}

export function getSessionVersionSnapshots(): CircuitVersionSnapshot[] {
  if (typeof window === "undefined" || !window.localStorage) return [];
  try {
    const raw = window.localStorage.getItem(
      getUserScopedKey(CIRCUITLAB_SNAPSHOTS_KEY)
    );
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch (err) {
    console.warn("Failed to load session snapshots:", err);
    return [];
  }
}

export function saveSessionVersionSnapshot(
  name: string,
  presetTitle: string,
  nodes: any[],
  wires: any[]
): CircuitVersionSnapshot | null {
  if (typeof window === "undefined" || !window.localStorage) return null;
  if (!nodes || nodes.length === 0) return null;

  try {
    const now = Date.now();
    const existing = getSessionVersionSnapshots();
    const snapshotName =
      name.trim() ||
      `Version ${existing.length + 1} (${nodes.length} comps)`;

    const newSnapshot: CircuitVersionSnapshot = {
      id: `snap_${now}_${Math.random().toString(36).substring(2, 7)}`,
      name: snapshotName,
      timestamp: now,
      timeFormatted: new Date(now).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
      componentCount: nodes.length,
      wireCount: wires.length,
      nodes: JSON.parse(JSON.stringify(nodes)),
      wires: JSON.parse(JSON.stringify(wires)),
      presetTitle: presetTitle || "Custom Circuit",
    };

    // Prepend new snapshot, limit to last 20 snapshots in local session
    const updated = [newSnapshot, ...existing].slice(0, 20);
    window.localStorage.setItem(
      getUserScopedKey(CIRCUITLAB_SNAPSHOTS_KEY),
      JSON.stringify(updated)
    );
    notifyCloudProjectUpsert("designer_snapshot", newSnapshot.id, {
      name: newSnapshot.name,
      circuitData: newSnapshot as unknown as Record<string, unknown>,
      componentCount: newSnapshot.componentCount,
      wireCount: newSnapshot.wireCount,
    });
    return newSnapshot;
  } catch (err) {
    console.warn("Failed to save session snapshot:", err);
    return null;
  }
}

export function deleteSessionVersionSnapshot(id: string): boolean {
  if (typeof window === "undefined" || !window.localStorage) return false;
  try {
    const existing = getSessionVersionSnapshots();
    const filtered = existing.filter((s) => s.id !== id);
    window.localStorage.setItem(
      getUserScopedKey(CIRCUITLAB_SNAPSHOTS_KEY),
      JSON.stringify(filtered)
    );
    notifyCloudProjectDelete(id);
    return true;
  } catch (err) {
    console.warn("Failed to delete snapshot:", err);
    return false;
  }
}

export function clearAllSessionVersionSnapshots(): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.removeItem(getUserScopedKey(CIRCUITLAB_SNAPSHOTS_KEY));
  } catch (err) {
    console.warn("Failed to clear session snapshots:", err);
  }
}
