import React, { useState } from "react";
import { ShieldCheck, Sparkles, X, RotateCw, Award, Lock, MessageSquare, Mail, Phone } from "lucide-react";
import raufAvatarDefault from "../assets/images/rauf_engineer_avatar_1793894567147.jpg";

interface EngineerLogoBadgeProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  showName?: boolean;
}

export default function EngineerLogoBadge({
  className = "",
  size = "md",
  showName = false,
}: EngineerLogoBadgeProps) {
  // Picture is strictly unchangeable as requested
  const avatarUrl = raufAvatarDefault;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [rotationSpeed, setRotationSpeed] = useState<"normal" | "fast" | "paused">("normal");

  // Size dimensions
  const dims = {
    sm: {
      outer: "w-8 h-8",
      inner: "w-6 h-6",
      stroke: "w-8 h-8",
    },
    md: {
      outer: "w-9 h-9 sm:w-10 sm:h-10",
      inner: "w-7 h-7 sm:w-8 sm:h-8",
      stroke: "w-9 h-9 sm:w-10 sm:h-10",
    },
    lg: {
      outer: "w-12 h-12",
      inner: "w-9 h-9",
      stroke: "w-12 h-12",
    },
  }[size];

  const rotationClass =
    rotationSpeed === "fast"
      ? "animate-rotating-logo-fast"
      : rotationSpeed === "normal"
      ? "animate-rotating-logo"
      : "";

  return (
    <>
      <div
        className={`relative inline-flex items-center gap-2 group select-none cursor-pointer ${className}`}
        onClick={() => setIsModalOpen(true)}
        title="Abdul Rauf · Lead Electrical Engineer (Click for credentials)"
      >
        {/* Outer Rotating Logo Housing */}
        <div
          className={`relative ${dims.outer} flex items-center justify-center shrink-0 [perspective:600px]`}
        >
          {/* Slowly Rotating Outer Ring SVG (⭕) */}
          <svg
            className={`absolute inset-0 ${dims.stroke} ${
              rotationSpeed !== "paused" ? "animate-[spin_16s_linear_infinite]" : ""
            } pointer-events-none`}
            viewBox="0 0 44 44"
            fill="none"
          >
            {/* Ambient Cyan Halo */}
            <circle
              cx="22"
              cy="22"
              r="20"
              stroke="#06b6d4"
              strokeWidth="1.2"
              strokeOpacity="0.5"
            />
            {/* Dashed High-Tech Accent Segments */}
            <circle
              cx="22"
              cy="22"
              r="20"
              stroke="#22d3ee"
              strokeWidth="2"
              strokeDasharray="9 7 3 7 14 6"
              strokeLinecap="round"
            />
            {/* Orbiting Quantum Nodes */}
            <circle cx="22" cy="2" r="1.8" fill="#38bdf8" />
            <circle cx="42" cy="22" r="1.5" fill="#f59e0b" />
            <circle cx="22" cy="42" r="1.8" fill="#10b981" />
            <circle cx="2" cy="22" r="1.5" fill="#a855f7" />
          </svg>

          {/* 3D Rotating Logo Medallion */}
          <div
            className={`relative ${dims.inner} rounded-full transition-transform group-hover:scale-105 ${rotationClass}`}
            style={{ transformStyle: "preserve-3d" }}
          >
            {/* Front Side: Unchangeable Avatar Portrait */}
            <div
              className="absolute inset-0 rounded-full overflow-hidden border-2 border-cyan-400/80 shadow-[0_0_12px_rgba(34,211,238,0.5)] bg-slate-900 flex items-center justify-center"
              style={{ backfaceVisibility: "hidden" }}
            >
              <img
                src={avatarUrl}
                alt="Abdul Rauf - Electrical Engineer"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover object-center pointer-events-none"
              />
              {/* Metallic Sheen Overlay */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="w-full h-full bg-gradient-to-r from-transparent via-cyan-300/30 to-transparent animate-logo-sheen" />
              </div>
            </div>

            {/* Back Side of 3D Rotating Medallion: High-Fidelity Mirrored Avatar with Gold Circuit Emblem */}
            <div
              className="absolute inset-0 rounded-full overflow-hidden border-2 border-amber-400/80 shadow-[0_0_12px_rgba(245,158,11,0.5)] bg-slate-950 flex items-center justify-center"
              style={{
                backfaceVisibility: "hidden",
                transform: "rotateY(180deg)",
              }}
            >
              <img
                src={avatarUrl}
                alt="Abdul Rauf"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover object-center opacity-85 scale-x-[-1] pointer-events-none"
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-cyan-950/70 via-transparent to-amber-950/60 flex items-center justify-center">
                <div className="w-3.5 h-3.5 rounded-full border border-amber-400/80 bg-slate-900/90 flex items-center justify-center shadow-xs">
                  <span className="text-[7px] font-mono font-black text-amber-300">AR</span>
                </div>
              </div>
            </div>
          </div>

          {/* Active Status Beacon */}
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#0b1020] shadow-[0_0_6px_#34d399]" />
        </div>

        {showName && (
          <div className="hidden sm:flex flex-col text-left leading-tight">
            <span className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors flex items-center gap-1">
              Abdul Rauf
              <ShieldCheck className="w-3 h-3 text-cyan-400" />
            </span>
            <span className="text-[10px] text-cyan-400/80 font-mono">
              Electrical Engineer
            </span>
          </div>
        )}
      </div>

      {/* Engineer Profile Credentials Modal (Unchangeable Picture & Rotating Logo Showcase) */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="relative w-full max-w-sm bg-[#0c1322] border border-cyan-500/50 rounded-2xl p-6 shadow-2xl text-center space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Large 3D Rotating Logo Display */}
            <div className="relative w-32 h-32 mx-auto flex items-center justify-center [perspective:800px]">
              {/* Outer Cybernetic Ring */}
              <svg
                className={`absolute inset-0 w-32 h-32 ${
                  rotationSpeed !== "paused" ? "animate-[spin_20s_linear_infinite]" : ""
                } pointer-events-none`}
                viewBox="0 0 100 100"
                fill="none"
              >
                <circle
                  cx="50"
                  cy="50"
                  r="46"
                  stroke="#0891b2"
                  strokeWidth="2"
                  strokeOpacity="0.4"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="46"
                  stroke="#38bdf8"
                  strokeWidth="3.5"
                  strokeDasharray="18 12 6 12 28 10"
                  strokeLinecap="round"
                />
                <circle cx="50" cy="4" r="3.5" fill="#38bdf8" />
                <circle cx="96" cy="50" r="3" fill="#f59e0b" />
                <circle cx="50" cy="96" r="3.5" fill="#10b981" />
                <circle cx="4" cy="50" r="3" fill="#a855f7" />
              </svg>

              {/* 3D Rotating Coin Emblem */}
              <div
                className={`relative w-24 h-24 rounded-full ${rotationClass}`}
                style={{ transformStyle: "preserve-3d" }}
              >
                {/* Front */}
                <div
                  className="absolute inset-0 rounded-full overflow-hidden border-2 border-cyan-400 shadow-[0_0_24px_rgba(56,189,248,0.6)] bg-slate-900"
                  style={{ backfaceVisibility: "hidden" }}
                >
                  <img
                    src={avatarUrl}
                    alt="Abdul Rauf"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover object-center pointer-events-none"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-300/35 to-transparent animate-logo-sheen pointer-events-none" />
                </div>

                {/* Back */}
                <div
                  className="absolute inset-0 rounded-full overflow-hidden border-2 border-amber-400 shadow-[0_0_24px_rgba(245,158,11,0.6)] bg-slate-950"
                  style={{
                    backfaceVisibility: "hidden",
                    transform: "rotateY(180deg)",
                  }}
                >
                  <img
                    src={avatarUrl}
                    alt="Abdul Rauf"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover object-center scale-x-[-1] opacity-80 pointer-events-none"
                  />
                  <div className="absolute inset-0 bg-gradient-to-tr from-cyan-950/70 via-slate-900/50 to-amber-950/60 flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-7 h-7 mx-auto rounded-full border border-amber-400 bg-amber-950/90 flex items-center justify-center shadow-lg">
                        <Award className="w-4 h-4 text-amber-300" />
                      </div>
                      <span className="text-[9px] font-mono font-bold text-amber-300 mt-1 block">
                        LEAD ENGINEER
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Verified Identity & Unchangeable Notice */}
            <div>
              <div className="flex items-center justify-center gap-1.5">
                <h3 className="text-base font-bold text-white tracking-wide">
                  Abdul Rauf
                </h3>
                <Sparkles className="w-4 h-4 text-cyan-400" />
              </div>
              <p className="text-xs text-cyan-300 font-mono mt-0.5">
                Department of Electrical &amp; Electronics Engineering
              </p>

              {/* Permanent Unchangeable Photo Badge */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px] font-mono mt-2.5">
                <Lock className="w-3 h-3 text-emerald-400" />
                <span>Verified Official Portrait · Permanent &amp; Unchangeable</span>
              </div>

              <p className="text-[11px] text-slate-400 mt-2.5 leading-relaxed">
                Lead Designer &amp; Electrical Engineer of the 75-Lab Digital Logic Design &amp; Multisim SPICE Workbench.
              </p>

              {/* Direct Suggestions & Contact Channels */}
              <div className="pt-2 flex flex-col gap-2">
                <a
                  href="https://wa.me/923215339417?text=Hello%20Engr.%20Abdul%20Rauf%2C%20I%20have%20a%20suggestion%20for%20IST%20Circuit%20%26%20Logic%20Lab%3A"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-mono font-bold flex items-center justify-center gap-2 transition-colors shadow-sm"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>WhatsApp: +923215339417</span>
                </a>

                <a
                  href="mailto:raufalvi32@gmail.com?subject=IST%20Circuit%20Lab%20Suggestion%20%26%20Improvement"
                  className="w-full py-2 px-3 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-500/40 text-xs font-mono font-bold flex items-center justify-center gap-2 transition-colors"
                >
                  <Mail className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Email: raufalvi32@gmail.com</span>
                </a>
              </div>
            </div>

            {/* Rotating Logo Controls */}
            <div className="pt-2 border-t border-slate-800 text-xs space-y-2">
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span className="flex items-center gap-1">
                  <RotateCw className="w-3 h-3 text-cyan-400" />
                  3D Logo Rotation:
                </span>
                <span className="text-cyan-300 font-semibold uppercase">
                  {rotationSpeed}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5 font-mono text-[11px]">
                <button
                  type="button"
                  onClick={() => setRotationSpeed("normal")}
                  className={`py-1.5 rounded-lg border transition-colors cursor-pointer ${
                    rotationSpeed === "normal"
                      ? "bg-cyan-500/20 border-cyan-500/60 text-cyan-200 font-semibold"
                      : "bg-slate-800/80 border-slate-700 text-slate-400 hover:text-white"
                  }`}
                >
                  Normal
                </button>
                <button
                  type="button"
                  onClick={() => setRotationSpeed("fast")}
                  className={`py-1.5 rounded-lg border transition-colors cursor-pointer ${
                    rotationSpeed === "fast"
                      ? "bg-purple-500/20 border-purple-500/60 text-purple-200 font-semibold"
                      : "bg-slate-800/80 border-slate-700 text-slate-400 hover:text-white"
                  }`}
                >
                  Turbine
                </button>
                <button
                  type="button"
                  onClick={() => setRotationSpeed("paused")}
                  className={`py-1.5 rounded-lg border transition-colors cursor-pointer ${
                    rotationSpeed === "paused"
                      ? "bg-amber-500/20 border-amber-500/60 text-amber-200 font-semibold"
                      : "bg-slate-800/80 border-slate-700 text-slate-400 hover:text-white"
                  }`}
                >
                  Pause
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}

