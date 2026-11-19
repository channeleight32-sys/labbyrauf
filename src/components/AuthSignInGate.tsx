import React, { useState } from "react";
import {
  Cpu,
  Lock,
  ShieldCheck,
  LogIn,
  Layers,
  AlertCircle,
  UserCheck,
  X,
} from "lucide-react";
import EngineerLogoBadge from "./EngineerLogoBadge";
import IstEmblemIcon from "./IstEmblemIcon";
import AdminLoginGate from "./AdminLoginGate";
import { signInWithGooglePopup } from "../firebase";

export const PENDING_LOGIN_CONSENT_KEY = "ist_pending_login_consent";

interface AuthSignInGateProps {
  authError?: string | null;
  onAdminAuthenticated?: (token: string) => void;
}

type SignInMode = "USER" | "ADMIN";

export default function AuthSignInGate({
  authError,
  onAdminAuthenticated,
}: AuthSignInGateProps) {
  const [mode, setMode] = useState<SignInMode>("USER");
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [consentChecked, setConsentChecked] = useState(true);
  const [showConsentModal, setShowConsentModal] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setLocalError(null);
    try {
      try {
        window.sessionStorage.setItem(
          PENDING_LOGIN_CONSENT_KEY,
          consentChecked ? "true" : "false"
        );
      } catch {
        // ignore storage errors
      }
      await signInWithGooglePopup();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Authentication failed. Please retry.";
      if (msg.includes("popup-closed-by-user")) {
        setLocalError("Sign-in window was closed before completing login.");
      } else if (msg.includes("popup-blocked")) {
        setLocalError(
          "Popup was blocked by your browser. Please allow popups for this site and click Sign In again."
        );
      } else {
        setLocalError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const displayError = localError || authError;

  return (
    <div className="min-h-screen w-full bg-[#0B1220] text-[#F1F5FA] flex flex-col justify-center items-center px-4 py-10">
      <div className="w-full max-w-md bg-[#162338] border border-[#24344D] rounded-2xl p-6 sm:p-8 shadow-2xl space-y-5">
        <div className="space-y-2.5 text-center">
          <div className="inline-flex items-center justify-center gap-3 text-xs font-mono text-[#35BDF2]">
            <IstEmblemIcon size="lg" glow />
            <EngineerLogoBadge size="md" />
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-[#F1F5FA]">
            IST Circuit &amp; Logic Lab
          </h1>
          <p className="text-xs text-[#9BAAC0] leading-relaxed">
            Electrical &amp; Electronics Engineering Workbench · Sign in with your own credentials to continue.
          </p>
        </div>

        {/* Role Selector Tabs */}
        <div className="grid grid-cols-2 gap-1.5 bg-[#111B2B] border border-[#24344D] rounded-xl p-1">
          <button
            type="button"
            onClick={() => {
              setMode("USER");
              setLocalError(null);
            }}
            className={`py-2 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
              mode === "USER"
                ? "bg-[#1C2B40] text-[#35BDF2] border border-[#35BDF2]/40"
                : "text-[#9BAAC0] hover:text-[#F1F5FA]"
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>User Account</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("ADMIN");
              setLocalError(null);
            }}
            className={`py-2 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
              mode === "ADMIN"
                ? "bg-[#1C2B40] text-[#35BDF2] border border-[#35BDF2]/40"
                : "text-[#9BAAC0] hover:text-[#F1F5FA]"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Administrator</span>
          </button>
        </div>

        {mode === "USER" ? (
          <>
            <div className="bg-[#111B2B] border border-[#24344D] rounded-xl p-4 space-y-2.5 text-xs text-[#9BAAC0]">
              <div className="flex items-start gap-2.5">
                <Lock className="w-4 h-4 text-[#35BDF2] shrink-0 mt-0.5" />
                <span>
                  <strong className="text-[#F1F5FA]">Strict Account Isolation:</strong> Your saved schematics, 3D circuits, snapshots, and lab completions stay bound exclusively to your account.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <Layers className="w-4 h-4 text-[#48C99A] shrink-0 mt-0.5" />
                <span>
                  <strong className="text-[#F1F5FA]">Zero Cross-User Resume:</strong> Switching or signing into a different account always starts fresh with zero previous user state.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <Cpu className="w-4 h-4 text-[#648CFF] shrink-0 mt-0.5" />
                <span>
                  <strong className="text-[#F1F5FA]">Full 3D &amp; SPICE Suite:</strong> ESP32 hardware labs, breadboard, VLC, robotics, and MNA simulation engines.
                </span>
              </div>
            </div>

            <div className="bg-[#111B2B] border border-[#24344D] rounded-xl px-3.5 py-2.5 flex items-center justify-between gap-3">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={consentChecked}
                  onChange={(e) => setConsentChecked(e.target.checked)}
                  className="w-4 h-4 accent-[#35BDF2] rounded cursor-pointer shrink-0"
                />
                <span className="text-xs font-semibold text-[#F1F5FA]">Agree</span>
              </label>
              <button
                type="button"
                onClick={() => setShowConsentModal(true)}
                className="text-[11px] font-mono text-[#35BDF2] hover:underline cursor-pointer"
              >
                Read Consent
              </button>
            </div>

            {displayError && (
              <div className="flex items-start gap-2 bg-rose-950/60 border border-rose-500/50 rounded-xl p-3 text-xs text-rose-200">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{displayError}</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full py-3 px-5 rounded-xl font-display font-semibold text-sm text-[#0B1220] bg-[#35BDF2] hover:bg-[#52C8F5] disabled:opacity-60 transition-colors cursor-pointer flex items-center justify-center gap-2.5 shadow-lg"
            >
              <LogIn className="w-4 h-4" />
              <span>{loading ? "Signing in with Google..." : "Sign in with Google"}</span>
            </button>
          </>
        ) : (
          <AdminLoginGate
            embedded
            title="Administrator Access"
            subtitle="Enter your administrator username and password manually to sign in."
            onAuthenticated={(token) => {
              onAdminAuthenticated?.(token);
            }}
          />
        )}

        <div className="pt-3 border-t border-[#24344D] flex items-center justify-between text-[11px] font-mono text-[#9BAAC0]">
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#48C99A]" />
            Private Cloud Workspace
          </span>
          <span className="text-[#35BDF2]">Electrical Engineering Suite</span>
        </div>
      </div>

      {showConsentModal && (
        <div
          className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="signin-consent-modal-title"
        >
          <div className="w-full max-w-md bg-[#111B2B] border border-[#24344D] rounded-xl p-5 shadow-2xl space-y-4 text-[#F1F5FA]">
            <div className="flex items-center justify-between border-b border-[#24344D] pb-3">
              <h2
                id="signin-consent-modal-title"
                className="text-xs font-mono font-semibold uppercase tracking-wider text-[#35BDF2]"
              >
                Authorization &amp; Consent Notice
              </h2>
              <button
                type="button"
                onClick={() => setShowConsentModal(false)}
                className="p-1 rounded bg-[#162338] hover:bg-[#1E2E49] border border-[#24344D] text-[#9BAAC0] hover:text-[#F1F5FA] cursor-pointer"
                aria-label="Close consent notice"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-xs text-[#9BAAC0] leading-relaxed">
              By selecting Agree, you authorize IST Circuit &amp; Logic Lab to record your authenticated sign-in activity, academic profile (full name, verified email, university, department, student ID, and semester), post-lab knowledge check scores, and circuit design and simulation verification outcomes, IP Address and location for review by authorized laboratory instructors and administrators. You may withdraw agreement at any time in Profile Settings.
            </p>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowConsentModal(false)}
                className="px-4 py-1.5 rounded-lg bg-[#35BDF2] hover:bg-[#52C8F5] text-[#0B1220] text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
