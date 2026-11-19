import React, { useState, useMemo } from "react";
import {
  User,
  Building2,
  ArrowRight,
  Check,
  X,
  Mail,
  BookOpen,
  IdCard,
  GraduationCap,
} from "lucide-react";
import EngineerLogoBadge from "./EngineerLogoBadge";
import { getUserScopedKey } from "../utils/userStorageScope";
import {
  summarizeKnowledgeChecks,
  type WorkspaceState,
} from "../utils/workspaceStore";

export interface StudentProfile {
  name: string;
  university: string;
  department?: string;
  studentId?: string;
  semester?: string;
  email?: string;
  consentGiven?: boolean;
}

interface AcademicProfileGateProps {
  initialProfile?: StudentProfile | null;
  verifiedEmail?: string | null;
  requireConsentChoice?: boolean;
  workspaceState?: WorkspaceState;
  completedExperimentsCount?: number;
  onComplete: (profile: StudentProfile) => void;
  onCancel?: () => void;
}

const COMMON_UNIVERSITIES = [
  "National University of Sciences & Technology (NUST)",
  "GIK Institute of Engineering Sciences & Technology",
  "University of Engineering & Technology (UET)",
  "FAST National University (NUCES)",
  "NED University of Engineering & Technology",
  "Lahore University of Management Sciences (LUMS)",
];

export default function AcademicProfileGate({
  initialProfile,
  verifiedEmail,
  requireConsentChoice = false,
  workspaceState,
  completedExperimentsCount = 0,
  onComplete,
  onCancel,
}: AcademicProfileGateProps) {
  const [name, setName] = useState(initialProfile?.name || "");
  const [university, setUniversity] = useState(
    initialProfile?.university || ""
  );
  const [department, setDepartment] = useState(
    initialProfile?.department || "Electrical Engineering"
  );
  const [studentId, setStudentId] = useState(initialProfile?.studentId || "");
  const [semester, setSemester] = useState(initialProfile?.semester || "");
  const [consentGiven, setConsentGiven] = useState<boolean>(
    initialProfile?.consentGiven ?? true
  );
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const displayEmail = verifiedEmail || initialProfile?.email || "";

  const learningProgress = useMemo(() => {
    if (!workspaceState) return null;
    const quiz = summarizeKnowledgeChecks(workspaceState.knowledgeChecks);
    const esp32Done = Object.values(
      workspaceState.completedEsp32Lessons || {}
    ).filter(Boolean).length;
    const manualsDone = Object.values(
      workspaceState.completedManuals || {}
    ).filter(Boolean).length;
    const recentQuizzes = Object.values(workspaceState.knowledgeChecks || {})
      .sort((a, b) => b.completedAt - a.completedAt)
      .slice(0, 3);
    return {
      quiz,
      esp32Done,
      manualsDone,
      experimentsDone: completedExperimentsCount,
      recentQuizzes,
    };
  }, [workspaceState, completedExperimentsCount]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    const cleanUni = university.trim();
    const cleanDept = department.trim();
    const cleanSid = studentId.trim();
    const cleanSem = semester.trim();

    if (!cleanName) {
      setErrorMsg("Please enter your formal full name.");
      return;
    }
    if (!cleanUni) {
      setErrorMsg("Please enter your university or academic institution.");
      return;
    }

    const profile: StudentProfile = {
      name: cleanName,
      university: cleanUni,
      department: cleanDept || undefined,
      studentId: cleanSid || undefined,
      semester: cleanSem || undefined,
      email: displayEmail || undefined,
      consentGiven,
    };

    try {
      localStorage.setItem(
        getUserScopedKey("ist_lab_student_profile"),
        JSON.stringify(profile)
      );
    } catch {
      // ignore
    }

    setErrorMsg(null);
    onComplete(profile);
  };

  return (
    <div
      className={
        onCancel && !requireConsentChoice
          ? "fixed inset-0 z-[80] bg-[#0B1220]/85 flex items-center justify-center p-4 overflow-y-auto"
          : requireConsentChoice
            ? "fixed inset-0 z-[80] bg-[#0B1220]/90 flex items-center justify-center p-4 overflow-y-auto"
            : "min-h-screen w-full bg-[#0B1220] text-[#F1F5FA] flex flex-col justify-center relative overflow-hidden px-4 py-8"
      }
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-modal-title"
    >
      <div className="relative z-10 max-w-xl w-full mx-auto my-auto">
        <div className="relative bg-[#162338] border border-[#24344D] rounded-2xl p-6 sm:p-7 shadow-2xl">
          {onCancel && !requireConsentChoice && (
            <button
              type="button"
              onClick={onCancel}
              aria-label="Close Profile Settings"
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-[#111B2B] hover:bg-[#1C2B40] text-[#9BAAC0] hover:text-[#F1F5FA] border border-[#24344D] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Header */}
          <div className="space-y-2 mb-5 pr-8">
            <div className="flex items-center gap-2.5 text-xs font-mono text-[#35BDF2]">
              <EngineerLogoBadge size="sm" />
              <span>IST Circuit &amp; Logic Lab · Researcher Profile</span>
            </div>

            <h1
              id="profile-modal-title"
              className="text-xl sm:text-2xl font-bold font-display text-[#F1F5FA] tracking-tight"
            >
              {requireConsentChoice
                ? "Complete Researcher Profile"
                : "Workstation Profile & Lab Attribution"}
            </h1>

            <p className="text-xs text-[#9BAAC0] leading-relaxed">
              Personalize your engineering lab reports, practical experiment submissions, and recorded knowledge check progress.
            </p>
          </div>

          {errorMsg && (
            <div className="mb-4 bg-rose-950/60 border border-rose-500/50 rounded-xl p-3 text-xs text-rose-200 text-center">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {displayEmail && (
              <div className="flex items-center justify-between gap-2 bg-[#111B2B] border border-[#24344D] rounded-xl px-3.5 py-2.5 text-xs">
                <span className="inline-flex items-center gap-2 text-[#9BAAC0]">
                  <Mail className="w-3.5 h-3.5 text-[#35BDF2]" />
                  <span>Verified Google Email</span>
                </span>
                <span className="font-mono text-[#F1F5FA] truncate">{displayEmail}</span>
              </div>
            )}

            {/* Recorded Student Learning & Knowledge Check Summary */}
            {learningProgress && !requireConsentChoice && (
              <div className="bg-[#111B2B] border border-[#24344D] rounded-xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between text-[11px] font-mono text-[#9BAAC0]">
                  <span>RECORDED LAB &amp; KNOWLEDGE CHECK PROGRESS</span>
                  <span className="text-[#35BDF2] tabular-nums">
                    {learningProgress.quiz.accuracyPercent !== null
                      ? `${learningProgress.quiz.accuracyPercent}% Quiz Score`
                      : "No Quizzes Yet"}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs font-mono tabular-nums">
                  <div className="border border-[#24344D] rounded-lg px-2.5 py-2 bg-[#0B1220]/70">
                    <div className="text-[10px] text-[#9BAAC0]">Knowledge Checks</div>
                    <div className="text-sm font-bold text-[#48C99A]">
                      {learningProgress.quiz.passed} / {learningProgress.quiz.attempted}
                    </div>
                  </div>
                  <div className="border border-[#24344D] rounded-lg px-2.5 py-2 bg-[#0B1220]/70">
                    <div className="text-[10px] text-[#9BAAC0]">Lab Manuals</div>
                    <div className="text-sm font-bold text-[#F1F5FA]">
                      {learningProgress.manualsDone} / 75
                    </div>
                  </div>
                  <div className="border border-[#24344D] rounded-lg px-2.5 py-2 bg-[#0B1220]/70">
                    <div className="text-[10px] text-[#9BAAC0]">ESP32 &amp; Exp</div>
                    <div className="text-sm font-bold text-[#35BDF2]">
                      {learningProgress.esp32Done}/20 · {learningProgress.experimentsDone}
                    </div>
                  </div>
                </div>
                {learningProgress.recentQuizzes.length > 0 && (
                  <div className="pt-1.5 border-t border-[#24344D] space-y-1">
                    {learningProgress.recentQuizzes.map((q) => (
                      <div
                        key={q.labId}
                        className="flex items-center justify-between gap-2 text-[11px]"
                      >
                        <span className="text-[#9BAAC0] truncate">
                          {q.labId} · {q.labTitle}
                        </span>
                        <span
                          className={`font-mono font-semibold tabular-nums shrink-0 ${
                            q.passed ? "text-[#48C99A]" : "text-[#F1B65B]"
                          }`}
                        >
                          {q.score}/{q.totalQuestions}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Full Name */}
            <div className="space-y-1.5">
              <label
                htmlFor="student-name"
                className="block text-xs font-mono font-semibold text-slate-200"
              >
                Full Name <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="student-name"
                  type="text"
                  required
                  autoFocus
                  maxLength={120}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Engr. Muhammad Ali, Sarah Khan"
                  className="w-full bg-[#080d19] border border-[#2b3d68] focus:border-cyan-400 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none transition-colors shadow-inner"
                />
              </div>
            </div>

            {/* University */}
            <div className="space-y-2">
              <label
                htmlFor="student-university"
                className="block text-xs font-mono font-semibold text-slate-200"
              >
                University / Institution <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="student-university"
                  type="text"
                  required
                  maxLength={180}
                  value={university}
                  onChange={(e) => setUniversity(e.target.value)}
                  placeholder="e.g. Your University / Engineering Institute"
                  className="w-full bg-[#080d19] border border-[#2b3d68] focus:border-cyan-400 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none transition-colors shadow-inner"
                />
              </div>

              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                {COMMON_UNIVERSITIES.map((uni) => {
                  const isSelected = university === uni;
                  return (
                    <button
                      key={uni}
                      type="button"
                      onClick={() => setUniversity(uni)}
                      className={`text-[11px] px-2.5 py-1 rounded-lg border font-mono transition-all text-left cursor-pointer flex items-center gap-1 ${
                        isSelected
                          ? "bg-cyan-500/25 border-cyan-400 text-cyan-200 font-semibold"
                          : "bg-[#0b1220] border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 text-cyan-300 shrink-0" />}
                      <span className="truncate max-w-[200px]">{uni}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Department + Student ID + Semester Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label
                  htmlFor="student-department"
                  className="block text-xs font-mono font-semibold text-slate-200"
                >
                  Department
                </label>
                <div className="relative">
                  <BookOpen className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="student-department"
                    type="text"
                    maxLength={120}
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="Electrical Engg"
                    className="w-full bg-[#080d19] border border-[#2b3d68] focus:border-cyan-400 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="student-id"
                  className="block text-xs font-mono font-semibold text-slate-200"
                >
                  Student / Reg ID
                </label>
                <div className="relative">
                  <IdCard className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="student-id"
                    type="text"
                    maxLength={64}
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    placeholder="e.g. 220401012"
                    className="w-full bg-[#080d19] border border-[#2b3d68] focus:border-cyan-400 rounded-xl pl-9 pr-3 py-2 text-xs font-mono text-white placeholder:text-slate-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="student-semester"
                  className="block text-xs font-mono font-semibold text-slate-200"
                >
                  Semester / Cohort
                </label>
                <div className="relative">
                  <GraduationCap className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="student-semester"
                    type="text"
                    maxLength={64}
                    value={semester}
                    onChange={(e) => setSemester(e.target.value)}
                    placeholder="e.g. Fall 2026 / 5th"
                    className="w-full bg-[#080d19] border border-[#2b3d68] focus:border-cyan-400 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Clean Agree Option (Full Notice Hidden Unless Opened) */}
            <div className="bg-[#111B2B] border border-[#24344D] rounded-xl px-3.5 py-2.5 flex items-center justify-between gap-3">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={consentGiven}
                  onChange={(e) => setConsentGiven(e.target.checked)}
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

            {/* Submit & Optional Cancel Row */}
            <div className="flex items-center gap-2.5 pt-1">
              {onCancel && !requireConsentChoice && (
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[#9BAAC0] hover:text-[#F1F5FA] bg-[#111B2B] hover:bg-[#1C2B40] border border-[#24344D] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                className="flex-1 py-2.5 px-5 rounded-xl font-display font-semibold text-xs sm:text-sm text-[#0B1220] bg-[#35BDF2] hover:bg-[#52C8F5] transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Save Profile</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>

          <div className="pt-4 mt-4 border-t border-[#24344D] flex flex-wrap items-center justify-between text-[11px] font-mono text-[#9BAAC0]">
            <span>Department of Electrical Engineering</span>
            <span className="text-[#35BDF2]">Circuit &amp; Logic Lab</span>
          </div>
        </div>
      </div>

      {showConsentModal && (
        <div
          className="fixed inset-0 z-[95] bg-black/75 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="profile-consent-modal-title"
        >
          <div className="w-full max-w-md bg-[#111B2B] border border-[#24344D] rounded-xl p-5 shadow-2xl space-y-4 text-[#F1F5FA]">
            <div className="flex items-center justify-between border-b border-[#24344D] pb-3">
              <h2
                id="profile-consent-modal-title"
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
            <p className="text-[11px] text-[#9BAAC0]/85 leading-relaxed">
              If you uncheck Agree and save, future admin logging stops and previously logged admin records are removed.
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
