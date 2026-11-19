/**
 * Strict Per-User Storage Scoping Utility
 *
 * Ensures that all browser localStorage persistence keys are strictly namespaced
 * by the currently authenticated Firebase user's UID so User B never resumes or sees
 * User A's circuits, snapshots, recent history, completed labs, or settings.
 */

let activeStorageUid: string | null = null;
let cloudProjectSyncHook: ((kind: string, id: string, data: Record<string, unknown>) => void) | null = null;
let cloudProjectDeleteHook: ((id: string) => void) | null = null;

const LEGACY_SHARED_KEYS = [
  "ist_lab_student_profile",
  "ist_lab_workspace_state_v1",
  "ist_workstation_settings_v1",
  "logicraft_circuitlab_autosave_v1",
  "logicraft_circuitlab_autosave_projects_v1",
  "logicraft_circuit_snapshots_v1",
  "ist_unified_circuit_projects_v1",
  "ist_builder_isolated_projects_v1",
  "ist_lab_completed_experiments",
  "logicraft_circuit_clipboard",
  "ist_circuit_canvas_color",
  "ist_lab_user_feedback_history",
];

export function setActiveStorageUser(uid: string | null): void {
  activeStorageUid = uid ? uid.trim() || null : null;
}

export function getActiveStorageUser(): string | null {
  return activeStorageUid;
}

export function getUserScopedKey(baseKey: string): string {
  if (!activeStorageUid) {
    return baseKey;
  }
  return `${baseKey}__uid_${activeStorageUid}`;
}

export function registerCloudProjectHooks(
  onUpsert: ((kind: string, id: string, data: Record<string, unknown>) => void) | null,
  onDelete: ((id: string) => void) | null
): void {
  cloudProjectSyncHook = onUpsert;
  cloudProjectDeleteHook = onDelete;
}

export function notifyCloudProjectUpsert(
  kind: string,
  id: string,
  data: Record<string, unknown>
): void {
  if (activeStorageUid && cloudProjectSyncHook) {
    try {
      cloudProjectSyncHook(kind, id, data);
    } catch {
      // non-fatal background sync error
    }
  }
}

export function notifyCloudProjectDelete(id: string): void {
  if (activeStorageUid && cloudProjectDeleteHook) {
    try {
      cloudProjectDeleteHook(id);
    } catch {
      // non-fatal background sync error
    }
  }
}

/**
 * Purges any pre-existing unscoped legacy localStorage entries so previously
 * unauthenticated browser state never leaks into a newly logged-in user's workspace.
 */
export function purgeLegacySharedStorageKeys(): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    for (const key of LEGACY_SHARED_KEYS) {
      window.localStorage.removeItem(key);
    }
  } catch {
    // ignore storage errors
  }
}

/**
 * Clears all localStorage entries for the specified UID (useful on explicit local cache reset).
 */
export function clearUserScopedStorage(uid: string): void {
  if (typeof window === "undefined" || !window.localStorage || !uid) return;
  try {
    for (const key of LEGACY_SHARED_KEYS) {
      window.localStorage.removeItem(`${key}__uid_${uid}`);
    }
  } catch {
    // ignore
  }
}
