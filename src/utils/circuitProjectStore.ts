/**
 * Isolated Per-Project Circuit Storage, Undo/Redo History & Migration Layer
 *
 * Guarantees every project maintains its own independent immutable CircuitProjectModel.
 * Modifying Project A never mutates or overwrites Project B.
 */

import type { CircuitProjectModel } from "../types/circuitModel";
import type { AnalogNode, AnalogWire } from "../components/SeriesParallelBuilder";
import {
  getUserScopedKey,
  notifyCloudProjectDelete,
  notifyCloudProjectUpsert,
} from "./userStorageScope";

export const UNIFIED_PROJECTS_STORAGE_KEY = "ist_unified_circuit_projects_v1";
export const BUILDER_PROJECTS_STORAGE_KEY = "ist_builder_isolated_projects_v1";

export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function createMemoryStorage(): StorageAdapter {
  const map = new Map<string, string>();
  return {
    getItem: (k) => (map.has(k) ? map.get(k)! : null),
    setItem: (k, v) => {
      map.set(k, v);
    },
    removeItem: (k) => {
      map.delete(k);
    },
  };
}

function resolveStorage(custom?: StorageAdapter): StorageAdapter | null {
  if (custom) return custom;
  if (typeof window !== "undefined" && window.localStorage) {
    return window.localStorage;
  }
  return null;
}

/* ============================================================================
 * Deep Clone Utilities (Prevents Shared-Reference Contamination)
 * ============================================================================ */

export function cloneCircuitModel(model: CircuitProjectModel): CircuitProjectModel {
  return JSON.parse(JSON.stringify(model)) as CircuitProjectModel;
}

/* ============================================================================
 * Per-Project Isolated Persistence (Unified Schematic & Simulation Models)
 * ============================================================================ */

function resolveUnifiedKey(customStorage?: StorageAdapter): string {
  return customStorage
    ? UNIFIED_PROJECTS_STORAGE_KEY
    : getUserScopedKey(UNIFIED_PROJECTS_STORAGE_KEY);
}

function resolveBuilderKey(customStorage?: StorageAdapter): string {
  return customStorage
    ? BUILDER_PROJECTS_STORAGE_KEY
    : getUserScopedKey(BUILDER_PROJECTS_STORAGE_KEY);
}

function readProjectMap(
  storage: StorageAdapter | null,
  key: string
): Record<string, CircuitProjectModel> {
  if (!storage) return {};
  try {
    const raw = storage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, CircuitProjectModel>;
    }
    return {};
  } catch {
    return {};
  }
}

function writeProjectMap(
  storage: StorageAdapter | null,
  map: Record<string, CircuitProjectModel>,
  key: string
): boolean {
  if (!storage) return false;
  try {
    storage.setItem(key, JSON.stringify(map));
    return true;
  } catch {
    return false;
  }
}

export function saveCircuitProject(
  model: CircuitProjectModel,
  storage?: StorageAdapter
): CircuitProjectModel {
  const store = resolveStorage(storage);
  const savedCopy: CircuitProjectModel = cloneCircuitModel({
    ...model,
    metadata: {
      ...model.metadata,
      updatedAt: Date.now(),
      isModified: false,
      version: (model.metadata?.version ?? 1) + 1,
    },
  });

  if (store) {
    const key = resolveUnifiedKey(storage);
    const map = readProjectMap(store, key);
    map[savedCopy.projectId] = savedCopy;
    writeProjectMap(store, map, key);
    if (!storage) {
      notifyCloudProjectUpsert("unified_schematic", savedCopy.projectId, {
        name: savedCopy.name,
        topology: savedCopy.topology,
        circuitData: savedCopy as unknown as Record<string, unknown>,
        componentCount: savedCopy.components.length,
        wireCount: savedCopy.connections.length,
      });
    }
  }
  return cloneCircuitModel(savedCopy);
}

export function loadCircuitProject(
  projectId: string,
  storage?: StorageAdapter
): CircuitProjectModel | null {
  const store = resolveStorage(storage);
  if (!store || !projectId) return null;
  const map = readProjectMap(store, resolveUnifiedKey(storage));
  const found = map[projectId];
  if (!found || !Array.isArray(found.components) || !Array.isArray(found.connections)) {
    return null;
  }
  return cloneCircuitModel(found);
}

export function listSavedCircuitProjects(storage?: StorageAdapter): CircuitProjectModel[] {
  const store = resolveStorage(storage);
  const map = readProjectMap(store, resolveUnifiedKey(storage));
  return Object.values(map)
    .filter((p) => p && p.projectId && Array.isArray(p.components))
    .map(cloneCircuitModel)
    .sort((a, b) => (b.metadata?.updatedAt ?? 0) - (a.metadata?.updatedAt ?? 0));
}

export function deleteSavedCircuitProject(
  projectId: string,
  storage?: StorageAdapter
): boolean {
  const store = resolveStorage(storage);
  if (!store) return false;
  const key = resolveUnifiedKey(storage);
  const map = readProjectMap(store, key);
  if (!(projectId in map)) return false;
  delete map[projectId];
  const ok = writeProjectMap(store, map, key);
  if (ok && !storage) {
    notifyCloudProjectDelete(projectId);
  }
  return ok;
}

export function duplicateCircuitProject(
  source: CircuitProjectModel,
  newName?: string,
  storage?: StorageAdapter
): CircuitProjectModel {
  const now = Date.now();
  const suffix = Math.random().toString(36).slice(2, 6);
  const newProjectId = `custom_${source.projectId}_${now}_${suffix}`;
  const clone = cloneCircuitModel(source);
  const duplicated: CircuitProjectModel = {
    ...clone,
    projectId: newProjectId,
    circuitId: `ckt_${newProjectId}`,
    name: newName?.trim() || `${source.name} (Copy)`,
    metadata: {
      createdAt: now,
      updatedAt: now,
      isModified: false,
      version: 1,
      isCustom: true,
      sourcePresetId: source.metadata?.sourcePresetId || source.projectId,
    },
  };
  return saveCircuitProject(duplicated, storage);
}

/* ============================================================================
 * Strict Isolated CircuitStore Class
 * Guarantees a fresh deep-cloned CircuitProjectModel instance per project load.
 * ============================================================================ */

export interface CircuitPresetFactory {
  hasPreset(projectId: string): boolean;
  createFreshModel(projectId: string): CircuitProjectModel | null;
}

export class CircuitStore {
  private readonly storage?: StorageAdapter;
  private readonly presetFactory?: CircuitPresetFactory;

  constructor(options?: {
    storage?: StorageAdapter;
    presetFactory?: CircuitPresetFactory;
  }) {
    this.storage = options?.storage;
    this.presetFactory = options?.presetFactory;
  }

  /**
   * Returns a brand-new deep-cloned CircuitProjectModel instance for the requested projectId.
   * Mutating the returned object never mutates stored snapshots, preset templates, or other projects.
   */
  public loadProject(
    projectId: string,
    options?: { preferSaved?: boolean }
  ): CircuitProjectModel | null {
    if (!projectId) return null;

    if (options?.preferSaved !== false) {
      const saved = loadCircuitProject(projectId, this.storage);
      if (saved) {
        return cloneCircuitModel(saved);
      }
    }

    if (this.presetFactory) {
      const fresh = this.presetFactory.createFreshModel(projectId);
      return fresh ? cloneCircuitModel(fresh) : null;
    }

    return null;
  }

  public saveProject(model: CircuitProjectModel): CircuitProjectModel {
    return cloneCircuitModel(saveCircuitProject(cloneCircuitModel(model), this.storage));
  }

  public duplicateProject(
    source: CircuitProjectModel,
    newName?: string
  ): CircuitProjectModel {
    return cloneCircuitModel(
      duplicateCircuitProject(cloneCircuitModel(source), newName, this.storage)
    );
  }

  public deleteProject(projectId: string): boolean {
    return deleteSavedCircuitProject(projectId, this.storage);
  }

  public listSavedProjects(): CircuitProjectModel[] {
    return listSavedCircuitProjects(this.storage).map(cloneCircuitModel);
  }

  public resetToDefault(projectId: string): CircuitProjectModel | null {
    deleteSavedCircuitProject(projectId, this.storage);
    return this.loadProject(projectId, { preferSaved: false });
  }
}

/* ============================================================================
 * SeriesParallelBuilder Per-Project Isolated Persistence
 * ============================================================================ */

export interface BuilderProjectRecord {
  projectId: string;
  name: string;
  labMode: string;
  topologyLabel: string;
  nodes: AnalogNode[];
  wires: AnalogWire[];
  updatedAt: number;
}

function readBuilderMap(
  storage: StorageAdapter | null,
  key: string
): Record<string, BuilderProjectRecord> {
  if (!storage) return {};
  try {
    const raw = storage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, BuilderProjectRecord>)
      : {};
  } catch {
    return {};
  }
}

export function saveBuilderProject(
  record: Omit<BuilderProjectRecord, "updatedAt">,
  storage?: StorageAdapter
): BuilderProjectRecord {
  const store = resolveStorage(storage);
  const next: BuilderProjectRecord = {
    ...JSON.parse(JSON.stringify(record)),
    updatedAt: Date.now(),
  };
  if (store) {
    const key = resolveBuilderKey(storage);
    const map = readBuilderMap(store, key);
    map[next.projectId] = next;
    try {
      store.setItem(key, JSON.stringify(map));
      if (!storage) {
        notifyCloudProjectUpsert("builder_circuit", `builder_${next.projectId}`, {
          name: next.name,
          labMode: next.labMode,
          topology: next.topologyLabel,
          circuitData: next as unknown as Record<string, unknown>,
          componentCount: next.nodes.length,
          wireCount: next.wires.length,
        });
      }
    } catch {
      // ignore quota errors
    }
  }
  return JSON.parse(JSON.stringify(next));
}

export function loadBuilderProject(
  projectId: string,
  storage?: StorageAdapter
): BuilderProjectRecord | null {
  const store = resolveStorage(storage);
  if (!store) return null;
  const map = readBuilderMap(store, resolveBuilderKey(storage));
  const rec = map[projectId];
  if (!rec || !Array.isArray(rec.nodes) || !Array.isArray(rec.wires)) return null;
  return JSON.parse(JSON.stringify(rec));
}

export function listBuilderProjects(storage?: StorageAdapter): BuilderProjectRecord[] {
  const store = resolveStorage(storage);
  const map = readBuilderMap(store, resolveBuilderKey(storage));
  return Object.values(map).sort((a, b) => b.updatedAt - a.updatedAt);
}

export function deleteBuilderProject(
  projectId: string,
  storage?: StorageAdapter
): boolean {
  const store = resolveStorage(storage);
  if (!store) return false;
  const key = resolveBuilderKey(storage);
  const map = readBuilderMap(store, key);
  if (!(projectId in map)) return false;
  delete map[projectId];
  try {
    store.setItem(key, JSON.stringify(map));
    if (!storage) {
      notifyCloudProjectDelete(`builder_${projectId}`);
    }
    return true;
  } catch {
    return false;
  }
}

/* ============================================================================
 * Generic Immutable Undo / Redo History Stack
 * ============================================================================ */

export interface HistoryStackState<T> {
  past: T[];
  present: T;
  future: T[];
}

export function createHistoryState<T>(initial: T): HistoryStackState<T> {
  return { past: [], present: initial, future: [] };
}

export function pushHistoryState<T>(
  state: HistoryStackState<T>,
  nextPresent: T,
  maxDepth = 50
): HistoryStackState<T> {
  const nextPast = [...state.past, state.present];
  if (nextPast.length > maxDepth) {
    nextPast.shift();
  }
  return {
    past: nextPast,
    present: nextPresent,
    future: [],
  };
}

export function undoHistoryState<T>(state: HistoryStackState<T>): HistoryStackState<T> {
  if (state.past.length === 0) return state;
  const previous = state.past[state.past.length - 1];
  const newPast = state.past.slice(0, -1);
  return {
    past: newPast,
    present: previous,
    future: [state.present, ...state.future],
  };
}

export function redoHistoryState<T>(state: HistoryStackState<T>): HistoryStackState<T> {
  if (state.future.length === 0) return state;
  const next = state.future[0];
  const newFuture = state.future.slice(1);
  return {
    past: [...state.past, state.present],
    present: next,
    future: newFuture,
  };
}
