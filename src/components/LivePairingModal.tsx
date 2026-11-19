import React, { useEffect, useState } from "react";
import {
  Check,
  Copy,
  Link2,
  LogOut,
  Radio,
  ShieldCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import {
  GUEST_COLOR,
  HOST_COLOR,
  isValidPairCode,
  normalizePairCode,
  type LivePairSessionSnapshot,
  type LivePairTransport,
  type PairingUser,
} from "../utils/livePairingService";

interface LivePairingModalProps {
  isOpen: boolean;
  onClose: () => void;
  pairingUser: PairingUser | null;
  session: LivePairSessionSnapshot | null;
  transportHint: LivePairTransport | null;
  initialJoinCode?: string;
  isBusy: boolean;
  errorMessage: string | null;
  onCreateSession: () => Promise<void>;
  onJoinSession: (code: string) => Promise<void>;
  onLeaveSession: () => Promise<void>;
}

export default function LivePairingModal({
  isOpen,
  onClose,
  pairingUser,
  session,
  transportHint,
  initialJoinCode = "",
  isBusy,
  errorMessage,
  onCreateSession,
  onJoinSession,
  onLeaveSession,
}: LivePairingModalProps) {
  const [joinCodeInput, setJoinCodeInput] = useState<string>(() =>
    normalizePairCode(initialJoinCode)
  );
  const [copiedMode, setCopiedMode] = useState<"code" | "link" | null>(null);

  useEffect(() => {
    if (initialJoinCode) {
      setJoinCodeInput(normalizePairCode(initialJoinCode));
    }
  }, [initialJoinCode]);

  if (!isOpen) return null;

  const normalizedInput = normalizePairCode(joinCodeInput);
  const canJoin = isValidPairCode(normalizedInput) && !isBusy && Boolean(pairingUser);
  const shareUrl = session
    ? `${window.location.origin}${window.location.pathname}?pair=${session.code}`
    : "";

  const handleCopy = async (mode: "code" | "link") => {
    if (!session) return;
    const text = mode === "code" ? session.code : shareUrl;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMode(mode);
      window.setTimeout(() => setCopiedMode(null), 2000);
    } catch {
      // Clipboard API blocked in restricted context
    }
  };

  const activeTransport = session?.transport || transportHint || "rtdb";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="live-pairing-title"
    >
      <div className="w-full max-w-xl bg-[#0B1220] border border-[#24344D] rounded-xl shadow-2xl overflow-hidden text-[#F1F5FA]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-[#111B2B] border-b border-[#24344D]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#162338] border border-[#24344D] flex items-center justify-center">
              <Users className="w-4 h-4 text-[#35BDF2]" />
            </div>
            <div>
              <h2
                id="live-pairing-title"
                className="text-sm font-semibold tracking-tight text-[#F1F5FA]"
              >
                Live Pairing Workspace
              </h2>
              <p className="text-[11px] font-mono text-[#9BAAC0]">
                2-Student Real-Time Schematic Collaboration · Authenticated
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[#162338] hover:bg-[#1E2E49] border border-[#24344D] text-[#9BAAC0] hover:text-[#F1F5FA] transition-colors cursor-pointer"
            aria-label="Close Live Pairing dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Verified Identity & Transport Metadata Strip */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 rounded-lg bg-[#111B2B] border border-[#24344D] text-xs font-mono">
            <div className="flex items-center gap-2 min-w-0">
              <ShieldCheck
                className={`w-4 h-4 shrink-0 ${
                  pairingUser ? "text-[#48C99A]" : "text-amber-400"
                }`}
              />
              <span className="text-[#9BAAC0] truncate">
                {pairingUser
                  ? `${pairingUser.displayName}${pairingUser.email ? ` · ${pairingUser.email}` : ""}`
                  : "Google Student Sign-In Required"}
              </span>
            </div>
            <span className="text-[11px] text-[#35BDF2] shrink-0">
              {activeTransport === "rtdb"
                ? "Firebase Realtime DB"
                : "Firebase Cloud Sync (RTDB Ready)"}
            </span>
          </div>

          {!pairingUser && (
            <div className="p-3.5 rounded-lg bg-amber-950/35 border border-amber-500/40 text-xs text-amber-200 leading-relaxed">
              Live Pairing requires an authenticated verified student Google session
              so partner presence, cursors, and circuit edits stay strictly scoped
              to 2 authorized participants.
            </div>
          )}

          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-500/50 text-xs text-rose-200 font-mono">
              {errorMessage}
            </div>
          )}

          {!session ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Create Room Card */}
              <div className="p-4 rounded-lg bg-[#111B2B] border border-[#24344D] flex flex-col justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="text-xs font-mono font-semibold text-[#35BDF2]">
                    HOST NEW SESSION
                  </div>
                  <p className="text-xs text-[#9BAAC0] leading-relaxed">
                    Generate a 6-character pairing code from your current schematic
                    and share it with one lab partner.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={!pairingUser || isBusy}
                  onClick={() => void onCreateSession()}
                  className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-lg bg-[#35BDF2] hover:bg-[#55CAFA] disabled:opacity-45 disabled:cursor-not-allowed text-[#0B1220] text-xs font-mono font-bold transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Radio className="w-3.5 h-3.5" />
                  <span>{isBusy ? "Starting Room..." : "Create Pairing Room"}</span>
                </button>
              </div>

              {/* Join Room Card */}
              <div className="p-4 rounded-lg bg-[#111B2B] border border-[#24344D] flex flex-col justify-between gap-3">
                <div className="space-y-1.5">
                  <div className="text-xs font-mono font-semibold text-[#48C99A]">
                    JOIN PARTNER ROOM
                  </div>
                  <p className="text-xs text-[#9BAAC0] leading-relaxed">
                    Enter the 6-character code shared by your classmate to sync
                    canvas edits and live cursors.
                  </p>
                </div>
                <div className="space-y-2.5">
                  <input
                    type="text"
                    value={normalizedInput}
                    onChange={(e) => setJoinCodeInput(normalizePairCode(e.target.value))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && canJoin) {
                        void onJoinSession(normalizedInput);
                      }
                    }}
                    maxLength={6}
                    placeholder="E.G. K7M9P2"
                    className="w-full px-3 py-2 rounded-lg bg-[#0B1220] border border-[#24344D] focus:border-[#48C99A] focus:outline-none text-center font-mono text-sm font-bold tracking-[0.25em] text-[#F1F5FA] uppercase placeholder:tracking-normal placeholder:text-[#617390]"
                  />
                  <button
                    type="button"
                    disabled={!canJoin}
                    onClick={() => void onJoinSession(normalizedInput)}
                    className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-lg bg-[#162338] hover:bg-[#1E2E49] disabled:opacity-45 disabled:cursor-not-allowed border border-[#48C99A]/60 text-[#48C99A] text-xs font-mono font-bold transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>{isBusy ? "Joining..." : "Join Session"}</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Active Code & Invite Share Bar */}
              <div className="p-4 rounded-lg bg-[#111B2B] border border-[#24344D] flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-[11px] font-mono text-[#9BAAC0]">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        session.status === "paired"
                          ? "bg-[#48C99A]"
                          : "bg-[#35BDF2] animate-pulse"
                      }`}
                    />
                    <span>
                      {session.status === "paired"
                        ? "LIVE · 2 STUDENTS PAIRED"
                        : "WAITING FOR PARTNER (1/2)"}
                    </span>
                  </div>
                  <div className="mt-1 font-mono text-2xl font-bold tracking-[0.22em] text-[#F1F5FA] tabular-nums">
                    {session.code}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void handleCopy("code")}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#162338] hover:bg-[#1E2E49] border border-[#24344D] text-xs font-mono text-[#F1F5FA] transition-colors cursor-pointer whitespace-nowrap"
                  >
                    {copiedMode === "code" ? (
                      <Check className="w-3.5 h-3.5 text-[#48C99A]" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-[#35BDF2]" />
                    )}
                    <span>{copiedMode === "code" ? "Copied Code" : "Copy Code"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleCopy("link")}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#162338] hover:bg-[#1E2E49] border border-[#24344D] text-xs font-mono text-[#F1F5FA] transition-colors cursor-pointer whitespace-nowrap"
                  >
                    {copiedMode === "link" ? (
                      <Check className="w-3.5 h-3.5 text-[#48C99A]" />
                    ) : (
                      <Link2 className="w-3.5 h-3.5 text-[#35BDF2]" />
                    )}
                    <span>{copiedMode === "link" ? "Copied Link" : "Copy Invite"}</span>
                  </button>
                </div>
              </div>

              {/* Participant Slots (Strictly 2 Students Max) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-[#111B2B] border border-[#24344D] flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-[#9BAAC0]">
                      Host Seat {session.role === "host" ? "· You" : ""}
                    </div>
                    <div className="mt-0.5 text-xs font-medium text-[#F1F5FA] truncate">
                      {session.hostName}
                    </div>
                  </div>
                  <span
                    className="w-3 h-3 rounded-sm shrink-0 border border-white/20"
                    style={{ backgroundColor: HOST_COLOR }}
                    title="Host cursor color"
                  />
                </div>

                <div className="p-3 rounded-lg bg-[#111B2B] border border-[#24344D] flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-[#9BAAC0]">
                      Partner Seat {session.role === "guest" ? "· You" : ""}
                    </div>
                    <div className="mt-0.5 text-xs font-medium text-[#F1F5FA] truncate">
                      {session.guestName || "Open · Waiting for 1 student"}
                    </div>
                  </div>
                  <span
                    className="w-3 h-3 rounded-sm shrink-0 border border-white/20"
                    style={{
                      backgroundColor: session.guestUid ? GUEST_COLOR : "#24344D",
                    }}
                    title="Partner cursor color"
                  />
                </div>
              </div>

              {/* Revision & Workspace Telemetry */}
              <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-lg bg-[#111B2B] border border-[#24344D] text-[11px] font-mono text-[#9BAAC0] tabular-nums">
                <span>
                  Rev #{session.revision} · {session.schematic.nodes.length} nodes ·{" "}
                  {session.schematic.wires.length} wires
                </span>
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => void onLeaveSession()}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-rose-950/60 hover:bg-rose-900/70 border border-rose-500/40 text-rose-200 font-semibold transition-colors cursor-pointer whitespace-nowrap"
                >
                  <LogOut className="w-3 h-3" />
                  <span>
                    {session.role === "host" ? "End Session" : "Leave Session"}
                  </span>
                </button>
              </div>
            </div>
          )}

          {activeTransport === "firestore" && (
            <p className="text-[11px] font-mono text-[#7C8DA8] leading-relaxed">
              Note: Firebase Realtime Database URL is not yet configured in this
              project, so Live Pairing is operating seamlessly over deployed
              Firestore real-time listeners. Add{" "}
              <span className="text-[#9BAAC0]">VITE_FIREBASE_DATABASE_URL</span>{" "}
              once RTDB is enabled in Firebase Console to switch automatically.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
