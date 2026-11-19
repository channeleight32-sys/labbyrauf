import {
  doc,
  getDoc,
  onSnapshot as fsOnSnapshot,
  runTransaction as fsRunTransaction,
  serverTimestamp as fsServerTimestamp,
  setDoc as fsSetDoc,
  updateDoc as fsUpdateDoc,
  deleteDoc as fsDeleteDoc,
  type Unsubscribe,
} from "firebase/firestore";
import {
  off as rtdbOff,
  onDisconnect as rtdbOnDisconnect,
  onValue as rtdbOnValue,
  ref as rtdbRef,
  remove as rtdbRemove,
  runTransaction as rtdbRunTransaction,
  serverTimestamp as rtdbServerTimestamp,
  set as rtdbSet,
  update as rtdbUpdate,
  type Database,
} from "firebase/database";
import {
  OperationType,
  auth,
  db,
  getRealtimeDbInstance,
  handleFirestoreError,
} from "../firebase";

export type LivePairTransport = "rtdb" | "firestore";

export interface PairingUser {
  uid: string;
  displayName: string;
  email?: string;
}

export interface LivePairNodeDTO {
  id: number;
  type: string;
  x: number;
  y: number;
  rotation?: 0 | 90 | 180 | 270;
  isMirrored?: boolean;
  value?: number;
  label?: string;
  delayNs?: number;
  clockHz?: number;
  digitalConfig?: Record<string, unknown>;
  analogParams?: Record<string, unknown>;
}

export interface LivePairWireDTO {
  id: number;
  from: { node: number; port: number; dir?: "in" | "out" };
  to: { node: number; port: number; dir?: "in" | "out" };
  midX?: number;
  color?: string;
  isVirtualInstrumentWire?: boolean;
  virtualTag?: string;
}

export interface LivePairSchematicPayload {
  title: string;
  nodes: LivePairNodeDTO[];
  wires: LivePairWireDTO[];
  isSimRunning: boolean;
  clockHz: number;
  autoClock: boolean;
  simSpeed: number;
}

export interface LivePairMemberPresence {
  uid: string;
  displayName: string;
  role: "host" | "guest";
  color: string;
  online: boolean;
  cursorX: number | null;
  cursorY: number | null;
  selectedNodeId: number | null;
  updatedAtMs: number;
}

export interface LivePairSessionSnapshot {
  code: string;
  transport: LivePairTransport;
  rtdbUrl: string | null;
  role: "host" | "guest";
  status: "waiting" | "paired" | "closed";
  hostUid: string;
  hostName: string;
  guestUid: string | null;
  guestName: string | null;
  revision: number;
  updatedBy: string;
  schematic: LivePairSchematicPayload;
  selfPresence: LivePairMemberPresence | null;
  partnerPresence: LivePairMemberPresence | null;
}

export interface LivePairingHandle {
  code: string;
  role: "host" | "guest";
  transport: LivePairTransport;
  rtdbUrl: string | null;
  pushSchematic: (
    payload: LivePairSchematicPayload,
    explicitRevision?: number
  ) => Promise<void>;
  updatePresence: (patch: {
    cursorX?: number | null;
    cursorY?: number | null;
    selectedNodeId?: number | null;
  }) => Promise<void>;
  leaveSession: () => Promise<void>;
}

export const HOST_COLOR = "#35BDF2";
export const GUEST_COLOR = "#48C99A";
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function normalizePairCode(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 6);
}

export function isValidPairCode(code: string): boolean {
  return /^[A-Z0-9]{6}$/.test(code);
}

export function generatePairCode(): string {
  let out = "";
  const bytes =
    typeof crypto !== "undefined" && crypto.getRandomValues
      ? crypto.getRandomValues(new Uint8Array(6))
      : null;
  for (let i = 0; i < 6; i++) {
    const idx = bytes
      ? bytes[i] % CODE_ALPHABET.length
      : Math.floor(Math.random() * CODE_ALPHABET.length);
    out += CODE_ALPHABET[idx];
  }
  return out;
}

export function stripUndefinedDeep<T>(value: T): T {
  if (value === null || value === undefined) {
    return value;
  }
  if (typeof value === "number") {
    return (Number.isFinite(value) ? value : 0) as unknown as T;
  }
  if (typeof value !== "object") {
    return value;
  }
  if (Array.isArray(value)) {
    return value
      .filter((item) => item !== undefined)
      .map((item) => stripUndefinedDeep(item)) as unknown as T;
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (v === undefined) continue;
    out[k] = stripUndefinedDeep(v);
  }
  return out as T;
}

export function sanitizeSchematicPayload(
  payload: LivePairSchematicPayload
): LivePairSchematicPayload {
  const cleanTitle =
    (payload.title || "Collaborative Schematic").trim().slice(0, 160) ||
    "Collaborative Schematic";
  const cleanClockHz = Math.max(
    0,
    Math.min(1000, Number.isFinite(payload.clockHz) ? Number(payload.clockHz) : 2)
  );
  const cleanSimSpeed = Math.max(
    0.05,
    Math.min(20, Number.isFinite(payload.simSpeed) ? Number(payload.simSpeed) : 1)
  );
  const cleanNodes = stripUndefinedDeep(
    (Array.isArray(payload.nodes) ? payload.nodes : []).slice(0, 250).map((n) => ({
      id: Math.round(Number(n.id) || 0),
      type: String(n.type || "AND").slice(0, 64),
      x: Math.round((Number(n.x) || 0) * 100) / 100,
      y: Math.round((Number(n.y) || 0) * 100) / 100,
      ...(n.rotation !== undefined ? { rotation: n.rotation } : {}),
      ...(n.isMirrored !== undefined ? { isMirrored: Boolean(n.isMirrored) } : {}),
      ...(n.value !== undefined ? { value: Number(n.value) || 0 } : {}),
      ...(n.label !== undefined ? { label: String(n.label).slice(0, 120) } : {}),
      ...(n.delayNs !== undefined ? { delayNs: Number(n.delayNs) || 0 } : {}),
      ...(n.clockHz !== undefined ? { clockHz: Number(n.clockHz) || 0 } : {}),
      ...(n.digitalConfig ? { digitalConfig: n.digitalConfig } : {}),
      ...(n.analogParams ? { analogParams: n.analogParams } : {}),
    }))
  );
  const cleanWires = stripUndefinedDeep(
    (Array.isArray(payload.wires) ? payload.wires : []).slice(0, 600).map((w) => ({
      id: Math.round(Number(w.id) || 0),
      from: {
        node: Math.round(Number(w.from?.node) || 0),
        port: Math.round(Number(w.from?.port) || 0),
        ...(w.from?.dir ? { dir: w.from.dir } : {}),
      },
      to: {
        node: Math.round(Number(w.to?.node) || 0),
        port: Math.round(Number(w.to?.port) || 0),
        ...(w.to?.dir ? { dir: w.to.dir } : {}),
      },
      ...(w.midX !== undefined && Number.isFinite(Number(w.midX))
        ? { midX: Math.round(Number(w.midX) * 100) / 100 }
        : {}),
      ...(w.color ? { color: String(w.color).slice(0, 32) } : {}),
      ...(w.isVirtualInstrumentWire !== undefined
        ? { isVirtualInstrumentWire: Boolean(w.isVirtualInstrumentWire) }
        : {}),
      ...(w.virtualTag ? { virtualTag: String(w.virtualTag).slice(0, 64) } : {}),
    }))
  );

  return {
    title: cleanTitle,
    nodes: cleanNodes,
    wires: cleanWires,
    isSimRunning: Boolean(payload.isSimRunning),
    clockHz: cleanClockHz,
    autoClock: Boolean(payload.autoClock),
    simSpeed: cleanSimSpeed,
  };
}

export function computePairingSchematicSig(
  payload: LivePairSchematicPayload
): string {
  const s = sanitizeSchematicPayload(payload);
  return JSON.stringify({
    title: s.title,
    isSimRunning: s.isSimRunning,
    clockHz: s.clockHz,
    autoClock: s.autoClock,
    simSpeed: s.simSpeed,
    nodes: s.nodes.map((n) => ({
      id: n.id,
      type: n.type,
      x: Math.round(n.x * 10) / 10,
      y: Math.round(n.y * 10) / 10,
      rotation: n.rotation ?? 0,
      isMirrored: Boolean(n.isMirrored),
      label: n.label ?? "",
      value: s.autoClock && n.type === "CLOCK" ? 0 : n.value ?? 0,
      delayNs: n.delayNs ?? 0,
      clockHz: n.clockHz ?? 0,
      digitalConfig: n.digitalConfig ?? null,
      analogParams: n.analogParams ?? null,
    })),
    wires: s.wires,
  });
}

function assertVerifiedFirebaseStudent(user: PairingUser | null | undefined): string {
  const current = auth.currentUser;
  if (!user || !current || current.uid !== user.uid) {
    throw new Error(
      "Sign in with your verified Google student account to use Live Pairing."
    );
  }
  if (!current.emailVerified) {
    throw new Error(
      "Your Google account email must be verified before joining Live Pairing."
    );
  }
  const cleanName =
    (user.displayName || current.displayName || current.email?.split("@")[0] || "Student")
      .trim()
      .slice(0, 120) || "Student";
  return cleanName;
}

export async function detectLivePairingTransport(): Promise<{
  transport: LivePairTransport;
  rtdb: Database | null;
  rtdbUrl: string | null;
}> {
  const { rtdb, rtdbUrl } = await getRealtimeDbInstance();
  if (rtdb && rtdbUrl) {
    return { transport: "rtdb", rtdb, rtdbUrl };
  }
  return { transport: "firestore", rtdb: null, rtdbUrl: null };
}

function parseTimestampMs(raw: unknown): number {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (raw && typeof (raw as { toMillis?: () => number }).toMillis === "function") {
    return (raw as { toMillis: () => number }).toMillis();
  }
  return Date.now();
}

function parsePresenceObj(
  raw: Record<string, unknown> | undefined | null
): LivePairMemberPresence | null {
  if (!raw || typeof raw !== "object") return null;
  if (typeof raw.uid !== "string" || !raw.uid) return null;
  return {
    uid: raw.uid,
    displayName: String(raw.displayName || "Partner"),
    role: raw.role === "host" ? "host" : "guest",
    color: String(raw.color || (raw.role === "host" ? HOST_COLOR : GUEST_COLOR)),
    online: Boolean(raw.online),
    cursorX:
      typeof raw.cursorX === "number" && Number.isFinite(raw.cursorX)
        ? raw.cursorX
        : null,
    cursorY:
      typeof raw.cursorY === "number" && Number.isFinite(raw.cursorY)
        ? raw.cursorY
        : null,
    selectedNodeId:
      typeof raw.selectedNodeId === "number" && Number.isFinite(raw.selectedNodeId)
        ? raw.selectedNodeId
        : null,
    updatedAtMs: parseTimestampMs(raw.updatedAt),
  };
}

function safeParseJsonArray<T>(raw: unknown): T[] {
  if (Array.isArray(raw)) return raw as T[];
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function startRtdbPairingSubscription(params: {
  rtdb: Database;
  rtdbUrl: string;
  code: string;
  role: "host" | "guest";
  user: PairingUser;
  displayName: string;
  onSnapshot: (snap: LivePairSessionSnapshot) => void;
  onError: (msg: string) => void;
}): LivePairingHandle {
  const { rtdb, rtdbUrl, code, role, user, displayName, onSnapshot, onError } =
    params;
  const roomRef = rtdbRef(rtdb, `live_pairs/${code}`);
  const selfPresenceRef = rtdbRef(rtdb, `live_pairs/${code}/presence/${user.uid}`);
  const statusDisconnectRef = rtdbRef(rtdb, `live_pairs/${code}/status`);
  const guestUidDisconnectRef = rtdbRef(rtdb, `live_pairs/${code}/guestUid`);
  const guestNameDisconnectRef = rtdbRef(rtdb, `live_pairs/${code}/guestName`);

  let currentRevision = 0;
  let closed = false;
  let latestCursor: {
    cursorX: number | null;
    cursorY: number | null;
    selectedNodeId: number | null;
  } = { cursorX: null, cursorY: null, selectedNodeId: null };

  // Register onDisconnect cleanup
  try {
    void rtdbOnDisconnect(selfPresenceRef).remove();
    if (role === "host") {
      void rtdbOnDisconnect(statusDisconnectRef).set("closed");
    } else {
      void rtdbOnDisconnect(guestUidDisconnectRef).remove();
      void rtdbOnDisconnect(guestNameDisconnectRef).remove();
      void rtdbOnDisconnect(statusDisconnectRef).set("waiting");
    }
  } catch {
    // ignore onDisconnect setup edge errors
  }

  const initialPresence = {
    uid: user.uid,
    displayName,
    role,
    color: role === "host" ? HOST_COLOR : GUEST_COLOR,
    online: true,
    cursorX: null,
    cursorY: null,
    selectedNodeId: null,
    updatedAt: rtdbServerTimestamp(),
  };
  void rtdbSet(selfPresenceRef, initialPresence).catch(() => {
    // non-fatal
  });

  const valueCb = (snap: import("firebase/database").DataSnapshot) => {
    if (closed) return;
    const val = snap.val() as Record<string, unknown> | null;
    if (!val) {
      onError("Pairing session ended or was removed.");
      return;
    }

    const rev = Number(val.revision || 0);
    currentRevision = rev;
    const hostUid = String(val.hostUid || "");
    const guestUid =
      typeof val.guestUid === "string" && val.guestUid ? val.guestUid : null;
    const rawSchematic = (val.schematic || {}) as Record<string, unknown>;
    const presenceMap = (val.presence || {}) as Record<
      string,
      Record<string, unknown>
    >;
    const partnerUid = role === "host" ? guestUid : hostUid;

    const sessionSnap: LivePairSessionSnapshot = {
      code,
      transport: "rtdb",
      rtdbUrl,
      role,
      status:
        val.status === "closed"
          ? "closed"
          : val.status === "paired" || guestUid
            ? "paired"
            : "waiting",
      hostUid,
      hostName: String(val.hostName || "Host"),
      guestUid,
      guestName:
        typeof val.guestName === "string" && val.guestName ? val.guestName : null,
      revision: rev,
      updatedBy: String(val.updatedBy || hostUid),
      schematic: {
        title: String(rawSchematic.title || "Collaborative Schematic"),
        nodes: safeParseJsonArray<LivePairNodeDTO>(rawSchematic.nodesJson),
        wires: safeParseJsonArray<LivePairWireDTO>(rawSchematic.wiresJson),
        isSimRunning: Boolean(rawSchematic.isSimRunning ?? true),
        clockHz: Number(rawSchematic.clockHz ?? 2),
        autoClock: Boolean(rawSchematic.autoClock ?? false),
        simSpeed: Number(rawSchematic.simSpeed ?? 1),
      },
      selfPresence: parsePresenceObj(presenceMap[user.uid]),
      partnerPresence: partnerUid ? parsePresenceObj(presenceMap[partnerUid]) : null,
    };

    onSnapshot(sessionSnap);
  };

  rtdbOnValue(roomRef, valueCb, (err) => {
    if (!closed) {
      onError(err?.message || "Lost Realtime Database connection.");
    }
  });

  const leaveSession = async () => {
    if (closed) return;
    closed = true;
    rtdbOff(roomRef, "value", valueCb);
    try {
      await rtdbOnDisconnect(selfPresenceRef).cancel();
      if (role === "host") {
        await rtdbOnDisconnect(statusDisconnectRef).cancel();
      } else {
        await rtdbOnDisconnect(guestUidDisconnectRef).cancel();
        await rtdbOnDisconnect(guestNameDisconnectRef).cancel();
        await rtdbOnDisconnect(statusDisconnectRef).cancel();
      }
    } catch {
      // ignore cancel errors
    }
    try {
      await rtdbRemove(selfPresenceRef);
      if (role === "host") {
        await rtdbUpdate(roomRef, {
          status: "closed",
          updatedBy: user.uid,
          updatedAt: rtdbServerTimestamp(),
        });
      } else {
        await rtdbUpdate(roomRef, {
          guestUid: null,
          guestName: null,
          status: "waiting",
          updatedBy: user.uid,
          updatedAt: rtdbServerTimestamp(),
        });
      }
    } catch {
      // ignore cleanup errors if already closed
    }
  };

  return {
    code,
    role,
    transport: "rtdb",
    rtdbUrl,
    pushSchematic: async (payload, explicitRevision) => {
      if (closed) return;
      const clean = sanitizeSchematicPayload(payload);
      const nextRev =
        typeof explicitRevision === "number"
          ? explicitRevision
          : currentRevision + 1;
      currentRevision = nextRev;
      await rtdbUpdate(roomRef, {
        revision: nextRev,
        updatedBy: user.uid,
        updatedAt: rtdbServerTimestamp(),
        schematic: {
          title: clean.title,
          nodesJson: JSON.stringify(clean.nodes),
          wiresJson: JSON.stringify(clean.wires),
          isSimRunning: clean.isSimRunning,
          clockHz: clean.clockHz,
          autoClock: clean.autoClock,
          simSpeed: clean.simSpeed,
        },
      });
    },
    updatePresence: async (patch) => {
      if (closed) return;
      latestCursor = {
        cursorX:
          patch.cursorX !== undefined ? patch.cursorX : latestCursor.cursorX,
        cursorY:
          patch.cursorY !== undefined ? patch.cursorY : latestCursor.cursorY,
        selectedNodeId:
          patch.selectedNodeId !== undefined
            ? patch.selectedNodeId
            : latestCursor.selectedNodeId,
      };
      await rtdbUpdate(selfPresenceRef, {
        uid: user.uid,
        displayName,
        role,
        color: role === "host" ? HOST_COLOR : GUEST_COLOR,
        online: true,
        cursorX:
          latestCursor.cursorX !== null
            ? Math.round(latestCursor.cursorX * 10) / 10
            : null,
        cursorY:
          latestCursor.cursorY !== null
            ? Math.round(latestCursor.cursorY * 10) / 10
            : null,
        selectedNodeId: latestCursor.selectedNodeId,
        updatedAt: rtdbServerTimestamp(),
      });
    },
    leaveSession,
  };
}

function startFirestorePairingSubscription(params: {
  code: string;
  role: "host" | "guest";
  user: PairingUser;
  displayName: string;
  onSnapshot: (snap: LivePairSessionSnapshot) => void;
  onError: (msg: string) => void;
}): LivePairingHandle {
  const { code, role, user, displayName, onSnapshot, onError } = params;
  const roomPath = `live_pairs/${code}`;
  const roomDocRef = doc(db, "live_pairs", code);
  const selfPresencePath = `live_pairs/${code}/presence/${user.uid}`;
  const selfPresenceDocRef = doc(db, "live_pairs", code, "presence", user.uid);

  let closed = false;
  let currentRevision = 0;
  let presenceCreated = false;
  let activePartnerUid: string | null = null;
  let partnerUnsub: Unsubscribe | null = null;
  let latestRoomData: Record<string, unknown> | null = null;
  let latestPartnerPresence: LivePairMemberPresence | null = null;
  let latestSelfPresence: LivePairMemberPresence = {
    uid: user.uid,
    displayName,
    role,
    color: role === "host" ? HOST_COLOR : GUEST_COLOR,
    online: true,
    cursorX: null,
    cursorY: null,
    selectedNodeId: null,
    updatedAtMs: Date.now(),
  };

  const emitCombined = () => {
    if (closed || !latestRoomData) return;
    const hostUid = String(latestRoomData.hostUid || "");
    const guestUid =
      typeof latestRoomData.guestUid === "string" && latestRoomData.guestUid
        ? latestRoomData.guestUid
        : null;
    const rawSchematic = (latestRoomData.schematic || {}) as Record<
      string,
      unknown
    >;

    const snap: LivePairSessionSnapshot = {
      code,
      transport: "firestore",
      rtdbUrl: null,
      role,
      status:
        latestRoomData.status === "closed"
          ? "closed"
          : latestRoomData.status === "paired" || guestUid
            ? "paired"
            : "waiting",
      hostUid,
      hostName: String(latestRoomData.hostName || "Host"),
      guestUid,
      guestName:
        typeof latestRoomData.guestName === "string" && latestRoomData.guestName
          ? latestRoomData.guestName
          : null,
      revision: Number(latestRoomData.revision || 0),
      updatedBy: String(latestRoomData.updatedBy || hostUid),
      schematic: {
        title: String(rawSchematic.title || "Collaborative Schematic"),
        nodes: Array.isArray(rawSchematic.nodes)
          ? (rawSchematic.nodes as LivePairNodeDTO[])
          : [],
        wires: Array.isArray(rawSchematic.wires)
          ? (rawSchematic.wires as LivePairWireDTO[])
          : [],
        isSimRunning: Boolean(rawSchematic.isSimRunning ?? true),
        clockHz: Number(rawSchematic.clockHz ?? 2),
        autoClock: Boolean(rawSchematic.autoClock ?? false),
        simSpeed: Number(rawSchematic.simSpeed ?? 1),
      },
      selfPresence: latestSelfPresence,
      partnerPresence: latestPartnerPresence,
    };
    onSnapshot(snap);
  };

  const syncPartnerSubscription = (partnerUid: string | null) => {
    if (partnerUid === activePartnerUid) return;
    if (partnerUnsub) {
      partnerUnsub();
      partnerUnsub = null;
    }
    activePartnerUid = partnerUid;
    latestPartnerPresence = null;
    if (!partnerUid || closed) {
      emitCombined();
      return;
    }

    const partnerDocRef = doc(db, "live_pairs", code, "presence", partnerUid);
    partnerUnsub = fsOnSnapshot(
      partnerDocRef,
      (pSnap) => {
        if (closed) return;
        latestPartnerPresence = pSnap.exists()
          ? parsePresenceObj(pSnap.data() as Record<string, unknown>)
          : null;
        emitCombined();
      },
      () => {
        // Ignore transient permission error while room closes or partner leaves
        if (!closed) {
          latestPartnerPresence = null;
          emitCombined();
        }
      }
    );
  };

  const writeSelfPresence = async (isInitial: boolean) => {
    if (closed) return;
    const payload = {
      uid: user.uid,
      displayName,
      role,
      color: role === "host" ? HOST_COLOR : GUEST_COLOR,
      online: true,
      cursorX:
        latestSelfPresence.cursorX !== null
          ? Math.max(
              -20000,
              Math.min(20000, Math.round(latestSelfPresence.cursorX * 10) / 10)
            )
          : null,
      cursorY:
        latestSelfPresence.cursorY !== null
          ? Math.max(
              -20000,
              Math.min(20000, Math.round(latestSelfPresence.cursorY * 10) / 10)
            )
          : null,
      selectedNodeId: latestSelfPresence.selectedNodeId,
      updatedAt: fsServerTimestamp(),
    };
    try {
      if (isInitial || !presenceCreated) {
        await fsSetDoc(selfPresenceDocRef, payload);
        presenceCreated = true;
      } else {
        await fsUpdateDoc(selfPresenceDocRef, {
          displayName: payload.displayName,
          color: payload.color,
          online: payload.online,
          cursorX: payload.cursorX,
          cursorY: payload.cursorY,
          selectedNodeId: payload.selectedNodeId,
          updatedAt: payload.updatedAt,
        });
      }
    } catch {
      // Retry via setDoc if doc was deleted or not yet created
      if (!closed) {
        try {
          await fsSetDoc(selfPresenceDocRef, payload);
          presenceCreated = true;
        } catch {
          // non-fatal presence update error
        }
      }
    }
  };

  void writeSelfPresence(true);

  const roomUnsub = fsOnSnapshot(
    roomDocRef,
    (snap) => {
      if (closed) return;
      if (!snap.exists()) {
        onError("Pairing room no longer exists.");
        return;
      }
      const data = snap.data() as Record<string, unknown>;
      latestRoomData = data;
      currentRevision = Number(data.revision || 0);
      const hostUid = String(data.hostUid || "");
      const guestUid =
        typeof data.guestUid === "string" && data.guestUid ? data.guestUid : null;
      const partnerUid = role === "host" ? guestUid : hostUid || null;
      syncPartnerSubscription(partnerUid);
      emitCombined();
    },
    (err) => {
      if (!closed) {
        try {
          handleFirestoreError(err, OperationType.GET, roomPath);
        } catch (wrapped) {
          onError(
            wrapped instanceof Error
              ? wrapped.message
              : "Lost live pairing sync connection."
          );
        }
      }
    }
  );

  const leaveSession = async () => {
    if (closed) return;
    closed = true;
    window.removeEventListener("beforeunload", handleBeforeUnload);
    roomUnsub();
    if (partnerUnsub) {
      partnerUnsub();
      partnerUnsub = null;
    }
    try {
      await fsDeleteDoc(selfPresenceDocRef);
    } catch {
      // ignore if already removed
    }
    try {
      if (role === "host") {
        await fsUpdateDoc(roomDocRef, {
          status: "closed",
          updatedAt: fsServerTimestamp(),
        });
      } else {
        await fsUpdateDoc(roomDocRef, {
          guestUid: null,
          guestName: null,
          status: "waiting",
          updatedAt: fsServerTimestamp(),
        });
      }
    } catch {
      // ignore if room was already closed or deleted
    }
  };

  const handleBeforeUnload = () => {
    if (!closed) {
      void fsDeleteDoc(selfPresenceDocRef).catch(() => undefined);
      if (role === "host") {
        void fsUpdateDoc(roomDocRef, {
          status: "closed",
          updatedAt: fsServerTimestamp(),
        }).catch(() => undefined);
      } else {
        void fsUpdateDoc(roomDocRef, {
          guestUid: null,
          guestName: null,
          status: "waiting",
          updatedAt: fsServerTimestamp(),
        }).catch(() => undefined);
      }
    }
  };
  window.addEventListener("beforeunload", handleBeforeUnload);

  return {
    code,
    role,
    transport: "firestore",
    rtdbUrl: null,
    pushSchematic: async (payload, explicitRevision) => {
      if (closed) return;
      const clean = sanitizeSchematicPayload(payload);
      const nextRev =
        typeof explicitRevision === "number"
          ? explicitRevision
          : currentRevision + 1;
      currentRevision = nextRev;
      try {
        await fsUpdateDoc(roomDocRef, {
          schematic: clean,
          revision: nextRev,
          updatedBy: user.uid,
          updatedAt: fsServerTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, roomPath);
      }
    },
    updatePresence: async (patch) => {
      if (closed) return;
      latestSelfPresence = {
        ...latestSelfPresence,
        cursorX:
          patch.cursorX !== undefined ? patch.cursorX : latestSelfPresence.cursorX,
        cursorY:
          patch.cursorY !== undefined ? patch.cursorY : latestSelfPresence.cursorY,
        selectedNodeId:
          patch.selectedNodeId !== undefined
            ? patch.selectedNodeId
            : latestSelfPresence.selectedNodeId,
        updatedAtMs: Date.now(),
      };
      await writeSelfPresence(!presenceCreated).catch(() => {
        // non-fatal cursor update
      });
      void selfPresencePath;
    },
    leaveSession,
  };
}

export async function createPairingSession(params: {
  user: PairingUser;
  initialSchematic: LivePairSchematicPayload;
  onSnapshot: (snap: LivePairSessionSnapshot) => void;
  onError: (msg: string) => void;
}): Promise<LivePairingHandle> {
  const { user, initialSchematic, onSnapshot, onError } = params;
  const displayName = assertVerifiedFirebaseStudent(user);
  const cleanSchematic = sanitizeSchematicPayload(initialSchematic);
  const detected = await detectLivePairingTransport();

  if (detected.transport === "rtdb" && detected.rtdb && detected.rtdbUrl) {
    const rtdb = detected.rtdb;
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = generatePairCode();
      const roomRef = rtdbRef(rtdb, `live_pairs/${code}`);
      const tx = await rtdbRunTransaction(roomRef, (current) => {
        if (current !== null && (current as { status?: string }).status !== "closed") {
          return;
        }
        return {
          code,
          hostUid: user.uid,
          hostName: displayName,
          guestUid: null,
          guestName: null,
          maxParticipants: 2,
          status: "waiting",
          revision: 1,
          updatedBy: user.uid,
          createdAt: rtdbServerTimestamp(),
          updatedAt: rtdbServerTimestamp(),
          schematic: {
            title: cleanSchematic.title,
            nodesJson: JSON.stringify(cleanSchematic.nodes),
            wiresJson: JSON.stringify(cleanSchematic.wires),
            isSimRunning: cleanSchematic.isSimRunning,
            clockHz: cleanSchematic.clockHz,
            autoClock: cleanSchematic.autoClock,
            simSpeed: cleanSchematic.simSpeed,
          },
        };
      });
      if (tx.committed) {
        return startRtdbPairingSubscription({
          rtdb,
          rtdbUrl: detected.rtdbUrl,
          code,
          role: "host",
          user,
          displayName,
          onSnapshot,
          onError,
        });
      }
    }
    throw new Error("Could not allocate a unique pairing code. Please try again.");
  }

  // Firestore path (works out-of-the-box with deployed firestore.rules)
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generatePairCode();
    const roomPath = `live_pairs/${code}`;
    const roomDocRef = doc(db, "live_pairs", code);
    try {
      const existingSnap = await getDoc(roomDocRef);
      if (existingSnap.exists()) {
        const existingData = existingSnap.data() as Record<string, unknown>;
        if (existingData.status !== "closed") {
          continue;
        }
      }
      await fsSetDoc(roomDocRef, {
        code,
        hostUid: user.uid,
        hostName: displayName,
        maxParticipants: 2,
        status: "waiting",
        revision: 1,
        updatedBy: user.uid,
        schematic: cleanSchematic,
        createdAt: fsServerTimestamp(),
        updatedAt: fsServerTimestamp(),
      });
      return startFirestorePairingSubscription({
        code,
        role: "host",
        user,
        displayName,
        onSnapshot,
        onError,
      });
    } catch (err) {
      if (attempt === 4) {
        handleFirestoreError(err, OperationType.CREATE, roomPath);
      }
    }
  }
  throw new Error("Could not create a Live Pairing room. Please try again.");
}

export async function joinPairingSession(params: {
  user: PairingUser;
  pairCode: string;
  onSnapshot: (snap: LivePairSessionSnapshot) => void;
  onError: (msg: string) => void;
}): Promise<LivePairingHandle> {
  const { user, pairCode, onSnapshot, onError } = params;
  const displayName = assertVerifiedFirebaseStudent(user);
  const code = normalizePairCode(pairCode);
  if (!isValidPairCode(code)) {
    throw new Error("Enter a valid 6-character alphanumeric pairing code.");
  }

  const detected = await detectLivePairingTransport();

  if (detected.transport === "rtdb" && detected.rtdb && detected.rtdbUrl) {
    const rtdb = detected.rtdb;
    const roomRef = rtdbRef(rtdb, `live_pairs/${code}`);
    let rejectReason = "";
    let assignedRole: "host" | "guest" = "guest";

    const tx = await rtdbRunTransaction(roomRef, (current) => {
      if (!current || typeof current !== "object") {
        rejectReason = `Pairing room ${code} was not found.`;
        return;
      }
      const room = current as Record<string, unknown>;
      if (room.status === "closed") {
        rejectReason = `Pairing room ${code} has already ended.`;
        return;
      }
      if (room.hostUid === user.uid) {
        assignedRole = "host";
        return {
          ...room,
          hostName: displayName,
          updatedBy: user.uid,
          updatedAt: rtdbServerTimestamp(),
        };
      }
      if (room.guestUid === user.uid) {
        assignedRole = "guest";
        return {
          ...room,
          guestName: displayName,
          status: "paired",
          updatedBy: user.uid,
          updatedAt: rtdbServerTimestamp(),
        };
      }
      if (!room.guestUid && room.status === "waiting") {
        assignedRole = "guest";
        return {
          ...room,
          guestUid: user.uid,
          guestName: displayName,
          status: "paired",
          updatedBy: user.uid,
          updatedAt: rtdbServerTimestamp(),
        };
      }
      rejectReason = `Pairing room ${code} is full (maximum 2 authenticated students).`;
      return;
    });

    if (!tx.committed) {
      throw new Error(rejectReason || `Unable to join pairing room ${code}.`);
    }

    return startRtdbPairingSubscription({
      rtdb,
      rtdbUrl: detected.rtdbUrl,
      code,
      role: assignedRole,
      user,
      displayName,
      onSnapshot,
      onError,
    });
  }

  // Firestore fallback transaction
  const roomPath = `live_pairs/${code}`;
  const roomDocRef = doc(db, "live_pairs", code);
  let assignedRole: "host" | "guest" = "guest";

  try {
    await fsRunTransaction(db, async (tx) => {
      const snap = await tx.get(roomDocRef);
      if (!snap.exists()) {
        throw new Error(`Pairing room ${code} was not found.`);
      }
      const data = snap.data() as Record<string, unknown>;
      if (data.status === "closed") {
        throw new Error(`Pairing room ${code} has already ended.`);
      }
      if (data.hostUid === user.uid) {
        assignedRole = "host";
        return;
      }
      if (data.guestUid === user.uid) {
        assignedRole = "guest";
        return;
      }
      if (!data.guestUid && data.status === "waiting") {
        assignedRole = "guest";
        tx.update(roomDocRef, {
          guestUid: user.uid,
          guestName: displayName,
          status: "paired",
          updatedAt: fsServerTimestamp(),
        });
        return;
      }
      throw new Error(
        `Pairing room ${code} is full (maximum 2 authenticated students).`
      );
    });
  } catch (err) {
    if (
      err instanceof Error &&
      (err.message.includes("was not found") ||
        err.message.includes("has already ended") ||
        err.message.includes("is full"))
    ) {
      throw err;
    }
    handleFirestoreError(err, OperationType.UPDATE, roomPath);
  }

  return startFirestorePairingSubscription({
    code,
    role: assignedRole,
    user,
    displayName,
    onSnapshot,
    onError,
  });
}
