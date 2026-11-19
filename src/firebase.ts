import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  type Timestamp,
} from "firebase/firestore";
import { getDatabase, type Database } from "firebase/database";
import firebaseConfig from "../firebase-applet-config.json";
import {
  sanitizeCircuitProgress,
  sanitizeKnowledgeChecks,
  summarizeKnowledgeChecks,
  type CircuitOutcomeEntry,
  type WorkspaceState,
} from "./utils/workspaceStore";
import type { WorkstationSettings } from "./utils/workstationSettings";

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

let cachedRtdbUrl: string | null | undefined;

export async function resolveRealtimeDatabaseUrl(): Promise<string | null> {
  if (cachedRtdbUrl !== undefined) return cachedRtdbUrl;

  const configWithRtdb = firebaseConfig as typeof firebaseConfig & {
    databaseURL?: string;
  };
  const explicitUrl =
    (import.meta.env?.VITE_FIREBASE_DATABASE_URL as string | undefined)?.trim() ||
    configWithRtdb.databaseURL?.trim() ||
    "";

  if (explicitUrl) {
    cachedRtdbUrl = explicitUrl.replace(/\/+$/, "");
    return cachedRtdbUrl;
  }

  const candidateUrls = [
    `https://${firebaseConfig.projectId}-default-rtdb.firebaseio.com`,
    `https://${firebaseConfig.projectId}-default-rtdb.asia-southeast1.firebasedatabase.app`,
    `https://${firebaseConfig.projectId}-default-rtdb.europe-west1.firebasedatabase.app`,
    `https://${firebaseConfig.projectId}.firebaseio.com`,
  ];

  for (const candidate of candidateUrls) {
    try {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 1600);
      const res = await fetch(`${candidate}/.json?shallow=true`, {
        method: "GET",
        signal: controller.signal,
      });
      window.clearTimeout(timeoutId);
      // 200 or 401 (rules deny unauthenticated root read) means an RTDB instance exists at this URL; 404 means none provisioned
      if (res.status !== 404) {
        cachedRtdbUrl = candidate;
        return cachedRtdbUrl;
      }
    } catch {
      // Ignore network/abort errors and check next candidate
    }
  }

  cachedRtdbUrl = null;
  return null;
}

export async function getRealtimeDbInstance(): Promise<{
  rtdb: Database | null;
  rtdbUrl: string | null;
}> {
  const rtdbUrl = await resolveRealtimeDatabaseUrl();
  if (!rtdbUrl) {
    return { rtdb: null, rtdbUrl: null };
  }
  try {
    return {
      rtdb: getDatabase(app, rtdbUrl),
      rtdbUrl,
    };
  } catch {
    return { rtdb: null, rtdbUrl: null };
  }
}

export const PRIMARY_ADMIN_EMAIL = "rfengineer099@gmail.com";
export const CURRENT_CONSENT_VERSION = "v1.0-2026";

export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection(): Promise<void> {
  try {
    await getDocFromServer(doc(db, "test", "connection"));
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("the client is offline")
    ) {
      console.error(
        "Please check your Firebase configuration (Firestore offline)."
      );
    }
  }
}
void testConnection();

export function sanitizeFirestoreId(raw: string): string {
  const cleaned = raw
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 120);
  return cleaned || `item_${Date.now()}`;
}

export async function signInWithGooglePopup(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function signOutFirebaseUser(): Promise<void> {
  await signOut(auth);
}

export interface CloudUserProfileDoc {
  uid: string;
  displayName: string;
  email: string;
  university: string;
  department?: string;
  studentId?: string;
  semester?: string;
  photoURL?: string;
  providerId?: string;
  consentGiven?: boolean;
  consentAtMs?: number | null;
  lastLoginAtMs?: number | null;
  loginCount: number;
}

export interface UserProfileUpdateInput {
  displayName?: string;
  university?: string;
  department?: string;
  studentId?: string;
  semester?: string;
  consentGiven?: boolean;
  bumpLogin?: boolean;
}

function timestampToMs(val: unknown): number | null {
  if (!val) return null;
  if (typeof val === "number" && Number.isFinite(val)) return val;
  if (typeof (val as Timestamp).toMillis === "function") {
    return (val as Timestamp).toMillis();
  }
  return null;
}

function isFirestoreTimestamp(val: unknown): val is Timestamp {
  return Boolean(val && typeof (val as Timestamp).toMillis === "function");
}

function cleanOptionalText(val: unknown, maxLen: number): string | undefined {
  if (typeof val !== "string") return undefined;
  const trimmed = val.trim().slice(0, maxLen);
  return trimmed.length > 0 ? trimmed : undefined;
}

function safeBoundedInt(val: unknown, min: number, max: number): number {
  const num = typeof val === "number" ? val : Number(val);
  if (!Number.isFinite(num)) return min;
  return Math.min(max, Math.max(min, Math.round(num)));
}

const docOpQueues = new Map<string, Promise<unknown>>();

function runSerializedDocOp<T>(
  docKey: string,
  task: () => Promise<T>
): Promise<T> {
  const prev = docOpQueues.get(docKey) ?? Promise.resolve();
  const next = prev.catch(() => undefined).then(task);
  const tracked = next.finally(() => {
    if (docOpQueues.get(docKey) === tracked) {
      docOpQueues.delete(docKey);
    }
  });
  docOpQueues.set(docKey, tracked);
  return next;
}

export async function loadOrCreateUserProfileDoc(
  user: User,
  updatesOrUniversity?: UserProfileUpdateInput | string,
  overrideDisplayName?: string
): Promise<CloudUserProfileDoc> {
  const userPath = `users/${user.uid}`;
  return runSerializedDocOp(userPath, async () => {
  const updates: UserProfileUpdateInput =
    typeof updatesOrUniversity === "string"
      ? {
          university: updatesOrUniversity,
          displayName: overrideDisplayName,
        }
      : updatesOrUniversity || {};

  const ref = doc(db, "users", user.uid);

  let snap;
  try {
    snap = await getDoc(ref);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, userPath);
  }

  const defaultName =
    (
      updates.displayName ||
      user.displayName ||
      user.email?.split("@")[0] ||
      "Engineering Researcher"
    )
      .trim()
      .slice(0, 120) || "Engineering Researcher";
  const defaultUni =
    (updates.university || "Department of Electrical Engineering")
      .trim()
      .slice(0, 180) || "Department of Electrical Engineering";
  const cleanEmail =
    (user.email || "user@example.com").trim().slice(0, 200) ||
    "user@example.com";
  const cleanPhoto =
    user.photoURL && user.photoURL.length <= 500 ? user.photoURL : undefined;
  const providerId =
    (user.providerData?.[0]?.providerId || "google.com").slice(0, 64);

  if (!snap.exists()) {
    const initialConsent =
      typeof updates.consentGiven === "boolean"
        ? updates.consentGiven
        : undefined;
    const initialLoginCount = updates.bumpLogin ? 1 : 0;

    const payload: Record<string, unknown> = {
      uid: user.uid,
      displayName: defaultName,
      email: cleanEmail,
      university: defaultUni,
      providerId,
      lastLoginAt: serverTimestamp(),
      loginCount: initialLoginCount,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    const dept = cleanOptionalText(updates.department, 120);
    const sid = cleanOptionalText(updates.studentId, 64);
    const sem = cleanOptionalText(updates.semester, 64);
    if (dept) payload.department = dept;
    if (sid) payload.studentId = sid;
    if (sem) payload.semester = sem;
    if (cleanPhoto) payload.photoURL = cleanPhoto;
    if (typeof initialConsent === "boolean") {
      payload.consentGiven = initialConsent;
      payload.consentAt = initialConsent ? serverTimestamp() : null;
    }

    try {
      await setDoc(ref, payload);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, userPath);
    }
    return {
      uid: user.uid,
      displayName: defaultName,
      email: cleanEmail,
      university: defaultUni,
      department: dept,
      studentId: sid,
      semester: sem,
      photoURL: cleanPhoto,
      providerId,
      consentGiven: initialConsent,
      consentAtMs: initialConsent ? Date.now() : null,
      lastLoginAtMs: Date.now(),
      loginCount: initialLoginCount,
    };
  }

  const existing = snap.data() as Record<string, unknown>;
  const resolvedName =
    (
      updates.displayName ||
      (typeof existing.displayName === "string" && existing.displayName) ||
      defaultName
    )
      .trim()
      .slice(0, 120) || defaultName;
  const resolvedUni =
    (
      updates.university ||
      (typeof existing.university === "string" && existing.university) ||
      defaultUni
    )
      .trim()
      .slice(0, 180) || defaultUni;
  const resolvedDept =
    updates.department !== undefined
      ? cleanOptionalText(updates.department, 120)
      : cleanOptionalText(existing.department, 120);
  const resolvedSid =
    updates.studentId !== undefined
      ? cleanOptionalText(updates.studentId, 64)
      : cleanOptionalText(existing.studentId, 64);
  const resolvedSem =
    updates.semester !== undefined
      ? cleanOptionalText(updates.semester, 64)
      : cleanOptionalText(existing.semester, 64);
  const resolvedPhoto =
    cleanPhoto ||
    (typeof existing.photoURL === "string" && existing.photoURL.length <= 500
      ? existing.photoURL
      : undefined);

  const existingConsent =
    typeof existing.consentGiven === "boolean"
      ? existing.consentGiven
      : undefined;
  const resolvedConsent =
    typeof updates.consentGiven === "boolean"
      ? updates.consentGiven
      : existingConsent;

  const existingLoginCount =
    typeof existing.loginCount === "number" && Number.isFinite(existing.loginCount)
      ? Math.max(0, Math.round(existing.loginCount))
      : 0;
  const nextLoginCount = updates.bumpLogin
    ? Math.min(1000000, existingLoginCount + 1)
    : existingLoginCount;

  const shouldUpdate =
    Boolean(updates.displayName) ||
    Boolean(updates.university) ||
    updates.department !== undefined ||
    updates.studentId !== undefined ||
    updates.semester !== undefined ||
    typeof updates.consentGiven === "boolean" ||
    Boolean(updates.bumpLogin);

  if (shouldUpdate) {
    const updatePayload: Record<string, unknown> = {
      displayName: resolvedName,
      email: cleanEmail,
      university: resolvedUni,
      providerId,
      loginCount: nextLoginCount,
      updatedAt: serverTimestamp(),
    };
    if (resolvedDept !== undefined) {
      updatePayload.department = resolvedDept;
    }
    if (resolvedSid !== undefined) {
      updatePayload.studentId = resolvedSid;
    }
    if (resolvedSem !== undefined) {
      updatePayload.semester = resolvedSem;
    }
    if (resolvedPhoto) {
      updatePayload.photoURL = resolvedPhoto;
    }
    if (updates.bumpLogin) {
      updatePayload.lastLoginAt = serverTimestamp();
    }
    if (typeof updates.consentGiven === "boolean") {
      updatePayload.consentGiven = updates.consentGiven;
      updatePayload.consentAt = updates.consentGiven ? serverTimestamp() : null;
    }
    try {
      await updateDoc(ref, updatePayload);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, userPath);
    }
  }

  return {
    uid: user.uid,
    displayName: resolvedName,
    email: cleanEmail,
    university: resolvedUni,
    department: resolvedDept,
    studentId: resolvedSid,
    semester: resolvedSem,
    photoURL: resolvedPhoto,
    providerId,
    consentGiven: resolvedConsent,
    consentAtMs:
      updates.consentGiven === true
        ? Date.now()
        : updates.consentGiven === false
          ? null
          : timestampToMs(existing.consentAt),
    lastLoginAtMs: updates.bumpLogin
      ? Date.now()
      : timestampToMs(existing.lastLoginAt),
    loginCount: nextLoginCount,
  };
  });
}

function getBrowserSummary(): string {
  if (typeof navigator === "undefined") return "Web Workstation";
  const ua = navigator.userAgent || "Web Browser";
  const platform =
    (navigator as Navigator & { userAgentData?: { platform?: string } })
      .userAgentData?.platform ||
    navigator.platform ||
    "Desktop";
  const browser = ua.includes("Edg/")
    ? "Edge"
    : ua.includes("Chrome/")
      ? "Chrome"
      : ua.includes("Firefox/")
        ? "Firefox"
        : ua.includes("Safari/")
          ? "Safari"
          : "Browser";
  return `${browser} on ${platform}`.slice(0, 180);
}

let cachedClientNetworkMeta: {
  ipAddress?: string;
  location?: string;
  expiresAt: number;
} | null = null;
let inFlightClientNetworkMeta: Promise<{
  ipAddress?: string;
  location?: string;
}> | null = null;

async function fetchClientNetworkMeta(): Promise<{
  ipAddress?: string;
  location?: string;
}> {
  if (cachedClientNetworkMeta && cachedClientNetworkMeta.expiresAt > Date.now()) {
    return {
      ipAddress: cachedClientNetworkMeta.ipAddress,
      location: cachedClientNetworkMeta.location,
    };
  }
  if (inFlightClientNetworkMeta) return inFlightClientNetworkMeta;

  inFlightClientNetworkMeta = (async () => {
    try {
      const controller = new AbortController();
      const timer = window.setTimeout(() => controller.abort(), 3200);
      const res = await fetch("/api/client-meta", { signal: controller.signal });
      window.clearTimeout(timer);
      if (!res.ok) return {};
      const data = (await res.json()) as {
        ipAddress?: unknown;
        location?: unknown;
      };
      const meta = {
        ipAddress: cleanOptionalText(data.ipAddress, 64),
        location: cleanOptionalText(data.location, 160),
      };
      if (
        meta.ipAddress &&
        meta.ipAddress !== "Unavailable" &&
        meta.location &&
        !meta.location.includes("Pending") &&
        !meta.location.includes("Unavailable")
      ) {
        cachedClientNetworkMeta = {
          ...meta,
          expiresAt: Date.now() + 10 * 60 * 1000,
        };
      }
      return meta;
    } catch {
      return {};
    } finally {
      inFlightClientNetworkMeta = null;
    }
  })();

  return inFlightClientNetworkMeta;
}

async function postVerifiedTelemetry(
  endpoint: string,
  user: User,
  body: Record<string, unknown>
): Promise<{ ipAddress?: string; location?: string } | null> {
  try {
    const idToken = await user.getIdToken();
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 4000);
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    window.clearTimeout(timer);
    if (!res.ok) return null;
    const data = (await res.json().catch(() => ({}))) as {
      geo?: { ipAddress?: unknown; location?: unknown };
    };
    if (data.geo) {
      const ipAddress = cleanOptionalText(data.geo.ipAddress, 64);
      const location = cleanOptionalText(data.geo.location, 160);
      if (ipAddress && location) {
        cachedClientNetworkMeta = {
          ipAddress,
          location,
          expiresAt: Date.now() + 10 * 60 * 1000,
        };
      }
      return { ipAddress, location };
    }
    return null;
  } catch {
    return null;
  }
}

export async function recordConsentedLoginLog(
  user: User,
  profile: CloudUserProfileDoc
): Promise<void> {
  if (profile.consentGiven !== true) return;
  const logId = sanitizeFirestoreId(`${user.uid}_${Date.now()}`);
  const path = `login_logs/${logId}`;
  const ref = doc(db, "login_logs", logId);
  const providerId = (
    user.providerData?.[0]?.providerId ||
    profile.providerId ||
    "google.com"
  ).slice(0, 64);
  const userAgentSummary = getBrowserSummary();

  const serverGeo = await postVerifiedTelemetry("/api/telemetry/login", user, {
    logId,
    displayName: profile.displayName.slice(0, 120),
    email: profile.email.slice(0, 200),
    university: profile.university.slice(0, 180),
    department: cleanOptionalText(profile.department, 120),
    studentId: cleanOptionalText(profile.studentId, 64),
    semester: cleanOptionalText(profile.semester, 64),
    photoURL: cleanOptionalText(profile.photoURL, 500),
    providerId,
    consentGiven: true,
    consentVersion: CURRENT_CONSENT_VERSION,
    userAgentSummary,
    loginCount: profile.loginCount,
  });

  const netMeta =
    serverGeo && (serverGeo.ipAddress || serverGeo.location)
      ? serverGeo
      : await fetchClientNetworkMeta();

  const payload: Record<string, unknown> = {
    logId,
    uid: user.uid,
    displayName: profile.displayName.slice(0, 120),
    email: profile.email.slice(0, 200),
    university: profile.university.slice(0, 180),
    providerId,
    emailVerified: Boolean(user.emailVerified),
    consentGiven: true,
    consentVersion: CURRENT_CONSENT_VERSION,
    userAgentSummary,
    loggedInAt: serverTimestamp(),
  };

  const dept = cleanOptionalText(profile.department, 120);
  const sid = cleanOptionalText(profile.studentId, 64);
  const sem = cleanOptionalText(profile.semester, 64);
  const photo = cleanOptionalText(profile.photoURL, 500);
  if (dept) payload.department = dept;
  if (sid) payload.studentId = sid;
  if (sem) payload.semester = sem;
  if (photo) payload.photoURL = photo;
  if (netMeta.ipAddress) payload.ipAddress = netMeta.ipAddress;
  if (netMeta.location) payload.location = netMeta.location;

  try {
    await setDoc(ref, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function syncStudentProgressToCloud(
  user: User,
  profile: CloudUserProfileDoc,
  workspaceState: WorkspaceState,
  savedCircuitsCount: number,
  completedExperimentsCount: number
): Promise<void> {
  if (profile.consentGiven !== true) return;

  const path = `student_progress/${user.uid}`;
  return runSerializedDocOp(path, async () => {
    const ref = doc(db, "student_progress", user.uid);
    let snap;
    try {
      snap = await getDoc(ref);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }

    const isUpdate = snap.exists();
    const snapData = isUpdate ? (snap.data() as Record<string, unknown>) : null;
    const createdAt =
      snapData && isFirestoreTimestamp(snapData.createdAt)
        ? snapData.createdAt
        : serverTimestamp();
    const consentAt =
      snapData && isFirestoreTimestamp(snapData.consentAt)
        ? snapData.consentAt
        : serverTimestamp();
    const lastLoginAt =
      snapData && isFirestoreTimestamp(snapData.lastLoginAt)
        ? snapData.lastLoginAt
        : serverTimestamp();

    const progress = sanitizeCircuitProgress(workspaceState.circuitProgress);
    const quizSummary = summarizeKnowledgeChecks(workspaceState.knowledgeChecks);
    const esp32CompletedCount = safeBoundedInt(
      Object.values(workspaceState.completedEsp32Lessons || {}).filter(Boolean)
        .length,
      0,
      20
    );
    const manualsCompletedCount = safeBoundedInt(
      Object.values(workspaceState.completedManuals || {}).filter(Boolean)
        .length,
      0,
      75
    );

    const cleanDisplayName =
      (
        profile.displayName ||
        user.displayName ||
        user.email?.split("@")[0] ||
        "Engineering Researcher"
      )
        .trim()
        .slice(0, 120) || "Engineering Researcher";
    const cleanEmail =
      (profile.email || user.email || "user@example.com").trim().slice(0, 200) ||
      "user@example.com";
    const cleanUniversity =
      (
        profile.university ||
        "Department of Electrical Engineering"
      )
        .trim()
        .slice(0, 180) || "Department of Electrical Engineering";
    const cleanProviderId =
      (
        user.providerData?.[0]?.providerId ||
        profile.providerId ||
        "google.com"
      )
        .trim()
        .slice(0, 64) || "google.com";

    const dept = cleanOptionalText(profile.department, 120);
    const sid = cleanOptionalText(profile.studentId, 64);
    const sem = cleanOptionalText(profile.semester, 64);
    const photo = cleanOptionalText(profile.photoURL, 500);

    const serverGeo = await postVerifiedTelemetry("/api/telemetry/user-record", user, {
      displayName: cleanDisplayName,
      email: cleanEmail,
      university: cleanUniversity,
      department: dept,
      studentId: sid,
      semester: sem,
      photoURL: photo,
      providerId: cleanProviderId,
      consentGiven: true,
      consentAtMs: profile.consentAtMs ?? Date.now(),
      lastLoginAtMs: profile.lastLoginAtMs ?? Date.now(),
      loginCount: safeBoundedInt(profile.loginCount, 0, 1000000),
      correctDesignsCount: safeBoundedInt(progress.correctDesigns, 0, 100000),
      incorrectDesignsCount: safeBoundedInt(progress.incorrectDesigns, 0, 100000),
      correctSimulationsCount: safeBoundedInt(
        progress.correctSimulations,
        0,
        100000
      ),
      incorrectSimulationsCount: safeBoundedInt(
        progress.incorrectSimulations,
        0,
        100000
      ),
      totalSavedCircuits: safeBoundedInt(savedCircuitsCount, 0, 5000),
      esp32CompletedCount,
      manualsCompletedCount,
      experimentsCompletedCount: safeBoundedInt(
        completedExperimentsCount,
        0,
        50
      ),
      recentOutcomes: progress.recentOutcomes.slice(0, 20),
      knowledgeChecksPassed: safeBoundedInt(quizSummary.passed, 0, 500),
      knowledgeChecksAttempted: safeBoundedInt(quizSummary.attempted, 0, 500),
      quizCorrectCount: safeBoundedInt(quizSummary.totalCorrect, 0, 5000),
      quizTotalCount: safeBoundedInt(quizSummary.totalQuestions, 0, 5000),
    });

    const netMeta =
      serverGeo && (serverGeo.ipAddress || serverGeo.location)
        ? serverGeo
        : await fetchClientNetworkMeta();

    const payload: Record<string, unknown> = {
      uid: user.uid,
      displayName: cleanDisplayName,
      email: cleanEmail,
      university: cleanUniversity,
      providerId: cleanProviderId,
      consentGiven: true,
      consentAt,
      lastLoginAt,
      loginCount: safeBoundedInt(profile.loginCount, 0, 1000000),
      correctDesignsCount: safeBoundedInt(progress.correctDesigns, 0, 100000),
      incorrectDesignsCount: safeBoundedInt(progress.incorrectDesigns, 0, 100000),
      correctSimulationsCount: safeBoundedInt(
        progress.correctSimulations,
        0,
        100000
      ),
      incorrectSimulationsCount: safeBoundedInt(
        progress.incorrectSimulations,
        0,
        100000
      ),
      totalSavedCircuits: safeBoundedInt(savedCircuitsCount, 0, 5000),
      esp32CompletedCount,
      manualsCompletedCount,
      experimentsCompletedCount: safeBoundedInt(
        completedExperimentsCount,
        0,
        50
      ),
      recentOutcomes: progress.recentOutcomes.slice(0, 20),
      knowledgeChecksPassed: safeBoundedInt(quizSummary.passed, 0, 500),
      knowledgeChecksAttempted: safeBoundedInt(quizSummary.attempted, 0, 500),
      quizCorrectCount: safeBoundedInt(quizSummary.totalCorrect, 0, 5000),
      quizTotalCount: safeBoundedInt(quizSummary.totalQuestions, 0, 5000),
      createdAt,
      updatedAt: serverTimestamp(),
    };

    if (dept) payload.department = dept;
    if (sid) payload.studentId = sid;
    if (sem) payload.semester = sem;
    if (photo) payload.photoURL = photo;
    if (netMeta.ipAddress) payload.ipAddress = netMeta.ipAddress;
    if (netMeta.location) payload.location = netMeta.location;

    try {
      await setDoc(ref, payload);
    } catch (error) {
      handleFirestoreError(
        error,
        isUpdate ? OperationType.UPDATE : OperationType.CREATE,
        path
      );
    }
  });
}

export async function revokeConsentedAdminRecords(uid: string): Promise<void> {
  if (auth.currentUser && auth.currentUser.uid === uid) {
    void postVerifiedTelemetry("/api/telemetry/revoke", auth.currentUser, {});
  }

  const progressPath = `student_progress/${uid}`;
  await runSerializedDocOp(progressPath, async () => {
    try {
      await deleteDoc(doc(db, "student_progress", uid));
    } catch (error) {
      // Ignore if doc did not exist; handle genuine errors
      const msg = error instanceof Error ? error.message : String(error);
      if (!msg.includes("not-found")) {
        handleFirestoreError(error, OperationType.DELETE, progressPath);
      }
    }
  });

  const logsPath = "login_logs";
  try {
    const q = query(collection(db, "login_logs"), where("uid", "==", uid));
    const snap = await getDocs(q);
    await Promise.all(
      snap.docs.map((d) => deleteDoc(doc(db, "login_logs", d.id)))
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, logsPath);
  }
}

export async function checkIsAdminUser(user: User | null): Promise<boolean> {
  if (!user || !user.emailVerified) return false;
  if (user.email?.toLowerCase() === PRIMARY_ADMIN_EMAIL) return true;
  try {
    const snap = await getDoc(doc(db, "admins", user.uid));
    return snap.exists();
  } catch {
    return false;
  }
}

export interface AdminLoginLogRecord {
  logId: string;
  uid: string;
  role?: "user" | "admin";
  displayName: string;
  email: string;
  university: string;
  department?: string;
  studentId?: string;
  semester?: string;
  photoURL?: string;
  providerId: string;
  emailVerified: boolean;
  consentGiven: boolean;
  consentVersion: string;
  userAgentSummary?: string;
  ipAddress?: string;
  location?: string;
  city?: string;
  region?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  isp?: string;
  timezone?: string;
  loggedInAtMs: number | null;
}

export interface AdminStudentProgressRecord {
  uid: string;
  displayName: string;
  email: string;
  university: string;
  department?: string;
  studentId?: string;
  semester?: string;
  photoURL?: string;
  providerId?: string;
  consentGiven: boolean;
  consentAtMs: number | null;
  lastLoginAtMs: number | null;
  loginCount: number;
  correctDesignsCount: number;
  incorrectDesignsCount: number;
  correctSimulationsCount: number;
  incorrectSimulationsCount: number;
  totalSavedCircuits: number;
  esp32CompletedCount: number;
  manualsCompletedCount: number;
  experimentsCompletedCount: number;
  recentOutcomes: CircuitOutcomeEntry[];
  knowledgeChecksPassed: number;
  knowledgeChecksAttempted: number;
  quizCorrectCount: number;
  quizTotalCount: number;
  ipAddress?: string;
  location?: string;
  city?: string;
  region?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  isp?: string;
  timezone?: string;
  updatedAtMs: number | null;
}

export async function fetchAdminLoginLogs(): Promise<AdminLoginLogRecord[]> {
  const path = "login_logs";
  try {
    const q = query(
      collection(db, "login_logs"),
      orderBy("loggedInAt", "desc"),
      limit(150)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data() as Record<string, unknown>;
      return {
        logId: String(data.logId || d.id),
        uid: String(data.uid || ""),
        displayName: String(data.displayName || "Researcher"),
        email: String(data.email || ""),
        university: String(data.university || ""),
        department:
          typeof data.department === "string" ? data.department : undefined,
        studentId:
          typeof data.studentId === "string" ? data.studentId : undefined,
        semester: typeof data.semester === "string" ? data.semester : undefined,
        photoURL: typeof data.photoURL === "string" ? data.photoURL : undefined,
        providerId: String(data.providerId || "google.com"),
        emailVerified: Boolean(data.emailVerified),
        consentGiven: Boolean(data.consentGiven),
        consentVersion: String(data.consentVersion || CURRENT_CONSENT_VERSION),
        userAgentSummary:
          typeof data.userAgentSummary === "string"
            ? data.userAgentSummary
            : undefined,
        ipAddress:
          typeof data.ipAddress === "string" ? data.ipAddress : undefined,
        location:
          typeof data.location === "string" ? data.location : undefined,
        loggedInAtMs: timestampToMs(data.loggedInAt),
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function fetchAdminStudentProgress(): Promise<
  AdminStudentProgressRecord[]
> {
  const path = "student_progress";
  try {
    const q = query(
      collection(db, "student_progress"),
      orderBy("updatedAt", "desc"),
      limit(150)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data() as Record<string, unknown>;
      const sanitized = sanitizeCircuitProgress({
        recentOutcomes: data.recentOutcomes,
      });
      return {
        uid: String(data.uid || d.id),
        displayName: String(data.displayName || "Researcher"),
        email: String(data.email || ""),
        university: String(data.university || ""),
        department:
          typeof data.department === "string" ? data.department : undefined,
        studentId:
          typeof data.studentId === "string" ? data.studentId : undefined,
        semester: typeof data.semester === "string" ? data.semester : undefined,
        photoURL: typeof data.photoURL === "string" ? data.photoURL : undefined,
        providerId:
          typeof data.providerId === "string" ? data.providerId : undefined,
        consentGiven: Boolean(data.consentGiven),
        consentAtMs: timestampToMs(data.consentAt),
        lastLoginAtMs: timestampToMs(data.lastLoginAt),
        loginCount: Number(data.loginCount || 0),
        correctDesignsCount: Number(data.correctDesignsCount || 0),
        incorrectDesignsCount: Number(data.incorrectDesignsCount || 0),
        correctSimulationsCount: Number(data.correctSimulationsCount || 0),
        incorrectSimulationsCount: Number(data.incorrectSimulationsCount || 0),
        totalSavedCircuits: Number(data.totalSavedCircuits || 0),
        esp32CompletedCount: Number(data.esp32CompletedCount || 0),
        manualsCompletedCount: Number(data.manualsCompletedCount || 0),
        experimentsCompletedCount: Number(data.experimentsCompletedCount || 0),
        recentOutcomes: sanitized.recentOutcomes,
        knowledgeChecksPassed: Number(data.knowledgeChecksPassed || 0),
        knowledgeChecksAttempted: Number(data.knowledgeChecksAttempted || 0),
        quizCorrectCount: Number(data.quizCorrectCount || 0),
        quizTotalCount: Number(data.quizTotalCount || 0),
        ipAddress:
          typeof data.ipAddress === "string" ? data.ipAddress : undefined,
        location:
          typeof data.location === "string" ? data.location : undefined,
        updatedAtMs: timestampToMs(data.updatedAt),
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export interface CloudWorkspacePayload {
  workspaceState: WorkspaceState;
  settings: WorkstationSettings;
  completedExperiments: string[];
}

export async function fetchCloudWorkspaceState(
  uid: string
): Promise<CloudWorkspacePayload | null> {
  const path = `users/${uid}/workspace/state`;
  const ref = doc(db, "users", uid, "workspace", "state");
  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    const data = snap.data() as Record<string, unknown>;
    const completedEsp32Lessons: Record<number, boolean> = {};
    if (
      data.completedEsp32Lessons &&
      typeof data.completedEsp32Lessons === "object"
    ) {
      for (const [k, v] of Object.entries(
        data.completedEsp32Lessons as Record<string, unknown>
      )) {
        const num = Number(k);
        if (Number.isFinite(num) && typeof v === "boolean") {
          completedEsp32Lessons[num] = v;
        }
      }
    }
    const completedManuals: Record<string, boolean> = {};
    if (data.completedManuals && typeof data.completedManuals === "object") {
      for (const [k, v] of Object.entries(
        data.completedManuals as Record<string, unknown>
      )) {
        if (typeof v === "boolean") {
          completedManuals[k] = v;
        }
      }
    }
    const settingsRaw = (data.settings || {}) as Record<string, unknown>;
    const settings: WorkstationSettings = {
      gridPitch:
        settingsRaw.gridPitch === 10 ||
        settingsRaw.gridPitch === 20 ||
        settingsRaw.gridPitch === 25
          ? settingsRaw.gridPitch
          : 20,
      telemetryDecimals:
        settingsRaw.telemetryDecimals === 2 ||
        settingsRaw.telemetryDecimals === 3 ||
        settingsRaw.telemetryDecimals === 4
          ? settingsRaw.telemetryDecimals
          : 2,
      forceReducedMotion: Boolean(settingsRaw.forceReducedMotion),
      autoSaveEnabled:
        typeof settingsRaw.autoSaveEnabled === "boolean"
          ? settingsRaw.autoSaveEnabled
          : true,
    };
    return {
      workspaceState: {
        recentWork: Array.isArray(data.recentWork) ? data.recentWork : [],
        simulationActivity: Array.isArray(data.simulationActivity)
          ? data.simulationActivity
          : [],
        savedProjects: Array.isArray(data.savedProjects)
          ? data.savedProjects
          : [],
        completedEsp32Lessons,
        completedManuals,
        lastEsp32LessonId:
          typeof data.lastEsp32LessonId === "number"
            ? Math.min(20, Math.max(1, data.lastEsp32LessonId))
            : 1,
        circuitProgress: sanitizeCircuitProgress(data.circuitProgress),
        knowledgeChecks: sanitizeKnowledgeChecks(data.knowledgeChecks),
      },
      settings,
      completedExperiments: Array.isArray(data.completedExperiments)
        ? data.completedExperiments.filter(
            (item): item is string => typeof item === "string"
          )
        : [],
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

function normalizeMapForRules(
  obj: Record<string | number, boolean>,
  maxKeys: number
): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  let count = 0;
  for (const [k, v] of Object.entries(obj)) {
    if (count >= maxKeys) break;
    out[String(k)] = Boolean(v);
    count++;
  }
  return out;
}

export async function saveCloudWorkspaceState(
  uid: string,
  state: WorkspaceState,
  settings: WorkstationSettings,
  completedExperiments: string[]
): Promise<void> {
  const path = `users/${uid}/workspace/state`;
  return runSerializedDocOp(path, async () => {
    const ref = doc(db, "users", uid, "workspace", "state");
    let snap;
    try {
      snap = await getDoc(ref);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }

    const filterMaps = <T>(arr: T[] | undefined, max: number): T[] =>
      (Array.isArray(arr) ? arr : [])
        .filter((item) => item && typeof item === "object" && !Array.isArray(item))
        .slice(0, max);

    const isUpdate = snap.exists();
    const snapData = isUpdate ? (snap.data() as Record<string, unknown>) : null;
    const createdAt =
      snapData && isFirestoreTimestamp(snapData.createdAt)
        ? snapData.createdAt
        : serverTimestamp();

    const payload = {
      ownerUid: uid,
      lastEsp32LessonId: safeBoundedInt(state.lastEsp32LessonId || 1, 1, 20),
      recentWork: filterMaps(state.recentWork, 20),
      simulationActivity: filterMaps(state.simulationActivity, 30),
      savedProjects: filterMaps(state.savedProjects, 30),
      completedEsp32Lessons: normalizeMapForRules(
        state.completedEsp32Lessons || {},
        25
      ),
      completedManuals: normalizeMapForRules(
        state.completedManuals || {},
        100
      ),
      completedExperiments: (
        Array.isArray(completedExperiments) ? completedExperiments : []
      )
        .filter((item): item is string => typeof item === "string")
        .slice(0, 50),
      settings: {
        gridPitch: Number(settings.gridPitch) || 20,
        telemetryDecimals: Number(settings.telemetryDecimals) || 2,
        forceReducedMotion: Boolean(settings.forceReducedMotion),
        autoSaveEnabled: Boolean(settings.autoSaveEnabled),
      },
      circuitProgress: sanitizeCircuitProgress(state.circuitProgress),
      knowledgeChecks: sanitizeKnowledgeChecks(state.knowledgeChecks),
      createdAt,
      updatedAt: serverTimestamp(),
    };

    try {
      await setDoc(ref, payload);
    } catch (error) {
      handleFirestoreError(
        error,
        isUpdate ? OperationType.UPDATE : OperationType.CREATE,
        path
      );
    }
  });
}

export type CloudProjectKind =
  | "unified_schematic"
  | "builder_circuit"
  | "designer_snapshot"
  | "autosave_slot";

export interface CloudProjectRecord {
  ownerUid: string;
  projectId: string;
  kind: CloudProjectKind;
  name: string;
  labMode?: string;
  topology?: string;
  circuitData: Record<string, unknown>;
  componentCount: number;
  wireCount: number;
}

export async function fetchAllCloudProjects(
  uid: string
): Promise<CloudProjectRecord[]> {
  const path = `users/${uid}/projects`;
  const colRef = collection(db, "users", uid, "projects");
  const q = query(colRef, where("ownerUid", "==", uid));
  try {
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as CloudProjectRecord);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function upsertCloudProject(
  uid: string,
  input: Omit<CloudProjectRecord, "ownerUid">
): Promise<void> {
  const safeId = sanitizeFirestoreId(input.projectId);
  const path = `users/${uid}/projects/${safeId}`;
  return runSerializedDocOp(path, async () => {
    const ref = doc(db, "users", uid, "projects", safeId);

    let snap;
    try {
      snap = await getDoc(ref);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }

    const isUpdate = snap.exists();
    const snapData = isUpdate ? (snap.data() as Record<string, unknown>) : null;
    const createdAt =
      snapData && isFirestoreTimestamp(snapData.createdAt)
        ? snapData.createdAt
        : serverTimestamp();
    const cleanName =
      (input.name || "Untitled Circuit").trim().slice(0, 160) ||
      "Untitled Circuit";
    const cleanCircuitData =
      input.circuitData &&
      typeof input.circuitData === "object" &&
      !Array.isArray(input.circuitData)
        ? input.circuitData
        : {};

    const payload: Record<string, unknown> = {
      ownerUid: uid,
      projectId: safeId,
      kind: input.kind,
      name: cleanName,
      circuitData: cleanCircuitData,
      componentCount: safeBoundedInt(input.componentCount, 0, 2000),
      wireCount: safeBoundedInt(input.wireCount, 0, 5000),
      createdAt,
      updatedAt: serverTimestamp(),
    };
    if (input.labMode) payload.labMode = String(input.labMode).slice(0, 64);
    if (input.topology) payload.topology = String(input.topology).slice(0, 64);

    try {
      await setDoc(ref, payload);
    } catch (error) {
      handleFirestoreError(
        error,
        isUpdate ? OperationType.UPDATE : OperationType.CREATE,
        path
      );
    }
  });
}

export async function deleteCloudProject(
  uid: string,
  projectId: string
): Promise<void> {
  const safeId = sanitizeFirestoreId(projectId);
  const path = `users/${uid}/projects/${safeId}`;
  try {
    await deleteDoc(doc(db, "users", uid, "projects", safeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
