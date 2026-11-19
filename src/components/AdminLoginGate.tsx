import React, { useState } from "react";
import {
  Lock,
  User,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { loginAdminWithCredentials } from "../utils/adminAuthClient";

interface AdminLoginGateProps {
  onAuthenticated: (token: string) => void;
  embedded?: boolean;
  title?: string;
  subtitle?: string;
}

export default function AdminLoginGate({
  onAuthenticated,
  embedded = false,
  title = "Administrator Sign-In",
  subtitle = "Enter your authorized administrator credentials to unlock the administrative console.",
}: AdminLoginGateProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setErrorMsg(null);
    setSubmitting(true);
    try {
      const { token } = await loginAdminWithCredentials(username, password);
      setPassword("");
      onAuthenticated(token);
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "Invalid administrator username or password."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const formContent = (
    <div className="space-y-4">
      {!embedded && (
        <div className="space-y-2 text-center">
          <div className="w-11 h-11 rounded-xl bg-[#111B2B] border border-[#24344D] text-[#35BDF2] flex items-center justify-center mx-auto">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="text-[11px] font-mono text-[#35BDF2] tracking-wider uppercase">
            Restricted Access
          </div>
          <h2 className="font-display text-xl font-bold text-[#F1F5FA] tracking-tight">
            {title}
          </h2>
          <p className="text-xs text-[#9BAAC0] leading-relaxed">{subtitle}</p>
        </div>
      )}

      {embedded && title && (
        <div className="bg-[#111B2B] border border-[#24344D] rounded-xl p-3.5 space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#F1F5FA]">
            <ShieldCheck className="w-4 h-4 text-[#35BDF2] shrink-0" />
            <span>{title}</span>
          </div>
          <p className="text-[11px] text-[#9BAAC0] leading-relaxed">
            {subtitle}
          </p>
        </div>
      )}

      {errorMsg && (
        <div className="bg-rose-950/60 border border-rose-500/50 rounded-xl p-3 flex items-start gap-2 text-xs text-rose-200">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3.5" autoComplete="off">
        <div>
          <label
            htmlFor="admin-username"
            className="block text-[11px] font-mono text-[#9BAAC0] mb-1.5"
          >
            Username
          </label>
          <div className="relative">
            <User className="w-4 h-4 text-[#9BAAC0] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="admin-username"
              type="text"
              required
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter administrator username"
              disabled={submitting}
              className="w-full bg-[#111B2B] border border-[#24344D] focus:border-[#35BDF2] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#F1F5FA] placeholder:text-[#9BAAC0]/50 focus:outline-none transition-colors disabled:opacity-60"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="admin-password"
            className="block text-[11px] font-mono text-[#9BAAC0] mb-1.5"
          >
            Password
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-[#9BAAC0] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="admin-password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter administrator password"
              disabled={submitting}
              className="w-full bg-[#111B2B] border border-[#24344D] focus:border-[#35BDF2] rounded-xl pl-10 pr-10 py-2.5 text-sm text-[#F1F5FA] placeholder:text-[#9BAAC0]/50 focus:outline-none transition-colors font-mono disabled:opacity-60"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9BAAC0] hover:text-[#F1F5FA] cursor-pointer"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 px-4 rounded-xl font-display font-semibold text-sm text-[#0B1220] bg-[#35BDF2] hover:bg-[#52C8F5] disabled:opacity-60 transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-lg"
        >
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
          <span>{submitting ? "Verifying Credentials..." : "Sign In as Administrator"}</span>
        </button>
      </form>
    </div>
  );

  if (embedded) {
    return formContent;
  }

  return (
    <div className="bg-[#162338] border border-[#24344D] rounded-2xl p-6 sm:p-8 max-w-md w-full mx-auto shadow-2xl">
      {formContent}
    </div>
  );
}
