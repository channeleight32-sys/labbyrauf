import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  ShieldCheck,
  Users,
  Activity,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Download,
  Search,
  ChevronRight,
  ChevronDown,
  Clock,
  Cpu,
  FileText,
  X,
  Globe,
  MapPin,
} from "lucide-react";
import {
  fetchAdminLoginLogs,
  fetchAdminStudentProgress,
  type AdminLoginLogRecord,
  type AdminStudentProgressRecord,
} from "../firebase";
import {
  fetchServerAdminAuditLogs,
  fetchServerAdminUsers,
  importLegacyAdminRecords,
} from "../utils/adminAuthClient";
import AdminLoginGate from "./AdminLoginGate";

interface AdminDashboardViewProps {
  isBackendAdmin: boolean;
  adminSessionToken?: string | null;
  canSyncFirestoreLegacy?: boolean;
  onAdminAuthenticated?: (token: string) => void;
  currentUserEmail?: string | null;
}

type AdminSectionTab = "PROGRESS" | "LOGIN_LOGS";
type ProgressFilter = "ALL" | "WITH_ERRORS" | "CLEAN_ONLY";
type AuditRoleFilter = "ALL" | "USER" | "ADMIN";

function formatTimestamp(ms: number | null | undefined): string {
  if (!ms) return "—";
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(ms));
  } catch {
    return "—";
  }
}

function getAccuracyPercent(rec: AdminStudentProgressRecord): number | null {
  const total =
    rec.correctDesignsCount +
    rec.incorrectDesignsCount +
    rec.correctSimulationsCount +
    rec.incorrectSimulationsCount;
  if (total === 0) return null;
  const correct = rec.correctDesignsCount + rec.correctSimulationsCount;
  return Math.round((correct / total) * 100);
}

function escapeCsvCell(val: unknown): string {
  const str = String(val ?? "");
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function mergeLogsByLogId(
  primary: AdminLoginLogRecord[],
  secondary: AdminLoginLogRecord[]
): AdminLoginLogRecord[] {
  const byId = new Map<string, AdminLoginLogRecord>();
  for (const item of secondary) {
    byId.set(item.logId, item);
  }
  for (const item of primary) {
    byId.set(item.logId, item);
  }
  return Array.from(byId.values()).sort(
    (a, b) => (b.loggedInAtMs || 0) - (a.loggedInAtMs || 0)
  );
}

function mergeUsersByUid(
  primary: AdminStudentProgressRecord[],
  secondary: AdminStudentProgressRecord[]
): AdminStudentProgressRecord[] {
  const byUid = new Map<string, AdminStudentProgressRecord>();
  for (const item of secondary) {
    byUid.set(item.uid, item);
  }
  for (const item of primary) {
    const prev = byUid.get(item.uid);
    if (!prev || (item.updatedAtMs || 0) >= (prev.updatedAtMs || 0)) {
      byUid.set(item.uid, {
        ...(prev || {}),
        ...item,
        ipAddress: item.ipAddress || prev?.ipAddress,
        location: item.location || prev?.location,
      });
    }
  }
  return Array.from(byUid.values()).sort(
    (a, b) => (b.updatedAtMs || 0) - (a.updatedAtMs || 0)
  );
}

export default function AdminDashboardView({
  isBackendAdmin,
  adminSessionToken,
  canSyncFirestoreLegacy = false,
  onAdminAuthenticated,
}: AdminDashboardViewProps) {
  const [activeSection, setActiveSection] = useState<AdminSectionTab>("PROGRESS");
  const [searchQuery, setSearchQuery] = useState("");
  const [progressFilter, setProgressFilter] = useState<ProgressFilter>("ALL");
  const [auditRoleFilter, setAuditRoleFilter] = useState<AuditRoleFilter>("ALL");

  const [loginLogs, setLoginLogs] = useState<AdminLoginLogRecord[]>([]);
  const [studentProgress, setStudentProgress] = useState<
    AdminStudentProgressRecord[]
  >([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedStudentUid, setSelectedStudentUid] = useState<string | null>(
    null
  );

  const loadData = useCallback(async () => {
    if (!isBackendAdmin) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      const [serverLogs, serverUsers] = await Promise.all([
        fetchServerAdminAuditLogs(adminSessionToken),
        fetchServerAdminUsers(adminSessionToken),
      ]);

      let mergedLogs = serverLogs;
      let mergedUsers = serverUsers;

      // Optional non-blocking backfill if a Google admin also happens to be signed in
      if (canSyncFirestoreLegacy) {
        try {
          const [fsLogs, fsUsers] = await Promise.all([
            fetchAdminLoginLogs(),
            fetchAdminStudentProgress(),
          ]);
          if (fsLogs.length > 0 || fsUsers.length > 0) {
            mergedLogs = mergeLogsByLogId(serverLogs, fsLogs);
            mergedUsers = mergeUsersByUid(serverUsers, fsUsers);
            void importLegacyAdminRecords(
              { logs: fsLogs, users: fsUsers },
              adminSessionToken
            );
          }
        } catch {
          // Ignore Firestore fallback errors; credential-based server store is authoritative
        }
      }

      setLoginLogs(mergedLogs);
      setStudentProgress(mergedUsers);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Unable to load administrator records.";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  }, [isBackendAdmin, adminSessionToken, canSyncFirestoreLegacy]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const kpis = useMemo(() => {
    let correctDesigns = 0;
    let incorrectDesigns = 0;
    let correctSims = 0;
    let incorrectSims = 0;
    for (const st of studentProgress) {
      correctDesigns += st.correctDesignsCount;
      incorrectDesigns += st.incorrectDesignsCount;
      correctSims += st.correctSimulationsCount;
      incorrectSims += st.incorrectSimulationsCount;
    }
    const totalCorrect = correctDesigns + correctSims;
    const totalIncorrect = incorrectDesigns + incorrectSims;
    const grandTotal = totalCorrect + totalIncorrect;
    const avgAccuracy =
      grandTotal > 0 ? Math.round((totalCorrect / grandTotal) * 100) : null;

    return {
      consentedStudents: studentProgress.length,
      totalLogins: loginLogs.length,
      correctDesigns,
      incorrectDesigns,
      correctSims,
      incorrectSims,
      totalCorrect,
      totalIncorrect,
      avgAccuracy,
    };
  }, [studentProgress, loginLogs]);

  const filteredProgress = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return studentProgress.filter((st) => {
      if (progressFilter === "WITH_ERRORS") {
        if (st.incorrectDesignsCount + st.incorrectSimulationsCount === 0) {
          return false;
        }
      } else if (progressFilter === "CLEAN_ONLY") {
        const total =
          st.correctDesignsCount +
          st.incorrectDesignsCount +
          st.correctSimulationsCount +
          st.incorrectSimulationsCount;
        if (
          total === 0 ||
          st.incorrectDesignsCount + st.incorrectSimulationsCount > 0
        ) {
          return false;
        }
      }

      if (!q) return true;
      return (
        st.displayName.toLowerCase().includes(q) ||
        st.email.toLowerCase().includes(q) ||
        st.university.toLowerCase().includes(q) ||
        (st.department || "").toLowerCase().includes(q) ||
        (st.studentId || "").toLowerCase().includes(q) ||
        (st.semester || "").toLowerCase().includes(q) ||
        (st.ipAddress || "").toLowerCase().includes(q) ||
        (st.location || "").toLowerCase().includes(q) ||
        (st.city || "").toLowerCase().includes(q) ||
        (st.country || "").toLowerCase().includes(q) ||
        (st.isp || "").toLowerCase().includes(q)
      );
    });
  }, [studentProgress, searchQuery, progressFilter]);

  const filteredLogs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return loginLogs.filter((log) => {
      const isAdminEvent =
        log.role === "admin" || log.providerId === "admin-credentials";
      if (auditRoleFilter === "USER" && isAdminEvent) return false;
      if (auditRoleFilter === "ADMIN" && !isAdminEvent) return false;

      if (!q) return true;
      return (
        log.displayName.toLowerCase().includes(q) ||
        log.email.toLowerCase().includes(q) ||
        log.university.toLowerCase().includes(q) ||
        (log.department || "").toLowerCase().includes(q) ||
        (log.studentId || "").toLowerCase().includes(q) ||
        (log.semester || "").toLowerCase().includes(q) ||
        (log.ipAddress || "").toLowerCase().includes(q) ||
        (log.location || "").toLowerCase().includes(q) ||
        (log.city || "").toLowerCase().includes(q) ||
        (log.country || "").toLowerCase().includes(q) ||
        (log.isp || "").toLowerCase().includes(q) ||
        log.providerId.toLowerCase().includes(q)
      );
    });
  }, [loginLogs, searchQuery, auditRoleFilter]);

  const selectedStudent = useMemo(
    () => studentProgress.find((s) => s.uid === selectedStudentUid) || null,
    [studentProgress, selectedStudentUid]
  );

  const handleExportCsv = () => {
    let csvContent = "";
    let filename = "ist_lab_admin_report.csv";

    if (activeSection === "PROGRESS") {
      filename = `ist_student_circuit_progress_${new Date()
        .toISOString()
        .slice(0, 10)}.csv`;
      const headers = [
        "UID",
        "Full Name",
        "Email",
        "University",
        "Department",
        "Student ID",
        "Semester",
        "IP Address",
        "Exact Location",
        "City",
        "Region",
        "Country",
        "Latitude",
        "Longitude",
        "ISP",
        "Timezone",
        "Consent Given",
        "Login Count",
        "Correct Designs",
        "Incorrect Designs",
        "Correct Simulations",
        "Incorrect Simulations",
        "Accuracy (%)",
        "Saved Circuits",
        "ESP32 Completed (/20)",
        "Manuals Completed (/75)",
        "Experiments Completed",
        "Knowledge Checks Passed",
        "Knowledge Checks Attempted",
        "Quiz Accuracy (%)",
        "Last Updated",
      ];
      const rows = filteredProgress.map((st) => {
        const acc = getAccuracyPercent(st);
        const quizAcc =
          st.quizTotalCount > 0
            ? `${Math.round((st.quizCorrectCount / st.quizTotalCount) * 100)}%`
            : "N/A";
        return [
          st.uid,
          st.displayName,
          st.email,
          st.university,
          st.department || "",
          st.studentId || "",
          st.semester || "",
          st.ipAddress || "",
          st.location || "",
          st.city || "",
          st.region || "",
          st.country || "",
          st.latitude ?? "",
          st.longitude ?? "",
          st.isp || "",
          st.timezone || "",
          st.consentGiven ? "Yes" : "No",
          st.loginCount,
          st.correctDesignsCount,
          st.incorrectDesignsCount,
          st.correctSimulationsCount,
          st.incorrectSimulationsCount,
          acc === null ? "N/A" : `${acc}%`,
          st.totalSavedCircuits,
          st.esp32CompletedCount,
          st.manualsCompletedCount,
          st.experimentsCompletedCount,
          st.knowledgeChecksPassed,
          st.knowledgeChecksAttempted,
          quizAcc,
          formatTimestamp(st.updatedAtMs),
        ].map(escapeCsvCell);
      });
      csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join(
        "\n"
      );
    } else {
      filename = `ist_consented_login_audit_${new Date()
        .toISOString()
        .slice(0, 10)}.csv`;
      const headers = [
        "Log ID",
        "Logged In At",
        "Role",
        "UID",
        "Full Name",
        "Email",
        "Email Verified",
        "University",
        "Department",
        "Student ID",
        "Semester",
        "Provider",
        "Consent Given",
        "Consent Version",
        "Client Summary",
        "IP Address",
        "Exact Location",
        "City",
        "Region",
        "Country",
        "Latitude",
        "Longitude",
        "ISP",
        "Timezone",
      ];
      const rows = filteredLogs.map((log) =>
        [
          log.logId,
          formatTimestamp(log.loggedInAtMs),
          log.role || (log.providerId === "admin-credentials" ? "admin" : "user"),
          log.uid,
          log.displayName,
          log.email,
          log.emailVerified ? "Verified" : "Unverified",
          log.university,
          log.department || "",
          log.studentId || "",
          log.semester || "",
          log.providerId,
          log.consentGiven ? "Yes" : "No",
          log.consentVersion,
          log.userAgentSummary || "",
          log.ipAddress || "",
          log.location || "",
          log.city || "",
          log.region || "",
          log.country || "",
          log.latitude ?? "",
          log.longitude ?? "",
          log.isp || "",
          log.timezone || "",
        ].map(escapeCsvCell)
      );
      csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join(
        "\n"
      );
    }

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!isBackendAdmin) {
    return (
      <div className="py-6">
        <AdminLoginGate
          title="Administrator Credentials Required"
          subtitle="Sign in with your administrator username and password to view audit logs, user records, and exact IP/location telemetry. No Google login is required."
          onAuthenticated={(token) => onAdminAuthenticated?.(token)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#24344D] pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 font-mono text-xs text-[#35BDF2]">
            <ShieldCheck className="w-4 h-4" />
            <span>INSTRUCTOR &amp; ADMINISTRATOR CONSOLE</span>
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-[#F1F5FA]">
            Consented User Audit &amp; Student Circuit Telemetry
          </h1>
          <p className="text-xs text-[#9BAAC0]">
            Real-time log of consented user profiles, sign-in timestamps, and per-student verified vs. faulted circuit design &amp; simulation counts.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => void loadData()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#111B2B] hover:bg-[#162338] border border-[#24344D] text-xs font-medium text-[#F1F5FA] transition-colors cursor-pointer disabled:opacity-60 whitespace-nowrap"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 text-[#35BDF2] ${loading ? "animate-spin" : ""}`}
            />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#35BDF2] hover:bg-[#52C8F5] text-xs font-semibold text-[#0B1220] transition-colors cursor-pointer whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* 4-Column KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#111B2B] border border-[#24344D] rounded-xl p-4 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-[#9BAAC0]">
            <span>Consented Students</span>
            <Users className="w-4 h-4 text-[#35BDF2]" />
          </div>
          <div className="font-mono text-2xl font-bold text-[#F1F5FA] tabular-nums">
            {kpis.consentedStudents}
          </div>
          <div className="text-[11px] font-mono text-[#9BAAC0] tabular-nums">
            {kpis.totalLogins} logged sign-in session{kpis.totalLogins === 1 ? "" : "s"}
          </div>
        </div>

        <div className="bg-[#111B2B] border border-[#24344D] rounded-xl p-4 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-[#9BAAC0]">
            <span>Correct Designs &amp; Sims</span>
            <CheckCircle2 className="w-4 h-4 text-[#48C99A]" />
          </div>
          <div className="font-mono text-2xl font-bold text-[#48C99A] tabular-nums">
            {kpis.totalCorrect}
          </div>
          <div className="text-[11px] font-mono text-[#9BAAC0] tabular-nums">
            {kpis.correctDesigns} designs · {kpis.correctSims} simulations
          </div>
        </div>

        <div className="bg-[#111B2B] border border-[#24344D] rounded-xl p-4 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-[#9BAAC0]">
            <span>Incorrect Designs &amp; Sims</span>
            <AlertTriangle className="w-4 h-4 text-[#F07474]" />
          </div>
          <div className="font-mono text-2xl font-bold text-[#F07474] tabular-nums">
            {kpis.totalIncorrect}
          </div>
          <div className="text-[11px] font-mono text-[#9BAAC0] tabular-nums">
            {kpis.incorrectDesigns} designs · {kpis.incorrectSims} simulations
          </div>
        </div>

        <div className="bg-[#111B2B] border border-[#24344D] rounded-xl p-4 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-[#9BAAC0]">
            <span>Cohort Pass Rate</span>
            <Activity className="w-4 h-4 text-[#35BDF2]" />
          </div>
          <div className="font-mono text-2xl font-bold text-[#F1F5FA] tabular-nums">
            {kpis.avgAccuracy !== null ? `${kpis.avgAccuracy}%` : "—"}
          </div>
          <div className="text-[11px] font-mono text-[#9BAAC0] tabular-nums">
            Verified / total attempted runs
          </div>
        </div>
      </div>

      {/* Section Switcher + Search & Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#111B2B] border border-[#24344D] rounded-xl p-3">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveSection("PROGRESS")}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeSection === "PROGRESS"
                ? "bg-[#35BDF2] text-[#0B1220]"
                : "bg-[#162338] text-[#9BAAC0] hover:text-[#F1F5FA] border border-[#24344D]"
            }`}
          >
            Student Circuit Progress ({studentProgress.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveSection("LOGIN_LOGS")}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeSection === "LOGIN_LOGS"
                ? "bg-[#35BDF2] text-[#0B1220]"
                : "bg-[#162338] text-[#9BAAC0] hover:text-[#F1F5FA] border border-[#24344D]"
            }`}
          >
            Consented Login Audit ({loginLogs.length})
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {activeSection === "PROGRESS" ? (
            <div className="flex items-center gap-1 bg-[#0B1220] border border-[#24344D] rounded-lg p-0.5 text-[11px]">
              {(
                [
                  { id: "ALL", label: "All" },
                  { id: "WITH_ERRORS", label: "Has Errors" },
                  { id: "CLEAN_ONLY", label: "100% Clean" },
                ] as { id: ProgressFilter; label: string }[]
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setProgressFilter(f.id)}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                    progressFilter === f.id
                      ? "bg-[#1C2B40] text-[#35BDF2]"
                      : "text-[#9BAAC0] hover:text-[#F1F5FA]"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-1 bg-[#0B1220] border border-[#24344D] rounded-lg p-0.5 text-[11px]">
              {(
                [
                  { id: "ALL", label: "All Logins" },
                  { id: "USER", label: "User Logins" },
                  { id: "ADMIN", label: "Admin Access" },
                ] as { id: AuditRoleFilter; label: string }[]
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setAuditRoleFilter(f.id)}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                    auditRoleFilter === f.id
                      ? "bg-[#1C2B40] text-[#35BDF2]"
                      : "text-[#9BAAC0] hover:text-[#F1F5FA]"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#9BAAC0] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter name, email, IP, city..."
              aria-label="Filter admin records"
              className="w-56 sm:w-64 pl-8 pr-3 py-1.5 rounded-lg bg-[#0B1220] border border-[#24344D] focus:border-[#35BDF2] focus:outline-none text-xs text-[#F1F5FA] placeholder-[#9BAAC0]/60"
            />
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-rose-950/60 border border-rose-500/50 rounded-xl p-4 text-xs text-rose-200 flex items-center justify-between gap-3">
          <span>{errorMsg}</span>
          <button
            type="button"
            onClick={() => void loadData()}
            className="px-3 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-100 font-semibold cursor-pointer shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* Main Data Surface */}
      {loading ? (
        <div className="bg-[#111B2B] border border-[#24344D] rounded-xl overflow-hidden">
          <div className="divide-y divide-[#24344D]">
            {[1, 2, 3, 4, 5].map((idx) => (
              <div key={idx} className="px-4 py-3.5 flex items-center justify-between gap-4 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#162338]" />
                  <div className="space-y-1.5">
                    <div className="w-40 h-3 rounded bg-[#162338]" />
                    <div className="w-56 h-2.5 rounded bg-[#162338]" />
                  </div>
                </div>
                <div className="w-28 h-3 rounded bg-[#162338]" />
              </div>
            ))}
          </div>
        </div>
      ) : activeSection === "PROGRESS" ? (
        filteredProgress.length === 0 ? (
          <div className="bg-[#111B2B] border border-[#24344D] rounded-xl p-10 text-center space-y-2">
            <Users className="w-6 h-6 text-[#9BAAC0] mx-auto" />
            <div className="text-sm font-semibold text-[#F1F5FA]">
              {studentProgress.length === 0
                ? "No Consented Student Progress Records Yet"
                : "No Matching Students Found"}
            </div>
            <p className="text-xs text-[#9BAAC0] max-w-md mx-auto">
              {studentProgress.length === 0
                ? "When students sign in with consent enabled and verify or simulate circuits, their complete profile and correct/incorrect circuit counts appear here."
                : "Adjust your search query or outcome filter to view other consented student accounts."}
            </p>
          </div>
        ) : (
          <div className="bg-[#111B2B] border border-[#24344D] rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#24344D] bg-[#0B1220]/60 text-[11px] font-mono uppercase tracking-wider text-[#9BAAC0]">
                    <th className="py-2.5 px-4 font-semibold">Student Profile</th>
                    <th className="py-2.5 px-4 font-semibold">Institution &amp; Academic</th>
                    <th className="py-2.5 px-4 font-semibold">IP Address &amp; Exact Location</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Designs (OK / Err)</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Simulations (OK / Err)</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Accuracy</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Labs</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Last Active</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#24344D] text-xs">
                  {filteredProgress.map((st) => {
                    const acc = getAccuracyPercent(st);
                    const isSelected = selectedStudentUid === st.uid;
                    return (
                      <React.Fragment key={st.uid}>
                        <tr
                          onClick={() =>
                            setSelectedStudentUid(isSelected ? null : st.uid)
                          }
                          className={`transition-colors cursor-pointer ${
                            isSelected
                              ? "bg-[#162338]"
                              : "hover:bg-[#162338]/70"
                          }`}
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5 min-w-[200px]">
                              {st.photoURL ? (
                                <img
                                  src={st.photoURL}
                                  alt={st.displayName}
                                  referrerPolicy="no-referrer"
                                  className="w-8 h-8 rounded-lg border border-[#24344D] object-cover shrink-0"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-lg bg-[#162338] border border-[#24344D] flex items-center justify-center font-mono text-xs font-bold text-[#35BDF2] shrink-0">
                                  {st.displayName.slice(0, 2).toUpperCase()}
                                </div>
                              )}
                              <div className="min-w-0">
                                <div className="font-semibold text-[#F1F5FA] truncate">
                                  {st.displayName}
                                </div>
                                <div className="font-mono text-[11px] text-[#9BAAC0] truncate">
                                  {st.email}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-4 min-w-[190px]">
                            <div className="text-[#F1F5FA] truncate max-w-[220px]">
                              {st.university}
                            </div>
                            <div className="font-mono text-[11px] text-[#9BAAC0] truncate">
                              {[st.department, st.studentId, st.semester]
                                .filter(Boolean)
                                .join(" · ") || "Profile incomplete"}
                            </div>
                          </td>

                          <td className="py-3 px-4 min-w-[210px] font-mono text-[11px]">
                            <div className="flex items-center gap-1.5 text-[#35BDF2] font-semibold tabular-nums truncate max-w-[240px]">
                              <Globe className="w-3 h-3 shrink-0 text-[#35BDF2]" />
                              <span>{st.ipAddress || "Pending IP Capture"}</span>
                            </div>
                            <div className="flex items-center gap-1 text-[#F1F5FA] truncate max-w-[240px]">
                              <MapPin className="w-3 h-3 shrink-0 text-[#48C99A]" />
                              <span className="truncate">
                                {st.location ||
                                  [st.city, st.region, st.country]
                                    .filter(Boolean)
                                    .join(", ") ||
                                  "Location Pending"}
                              </span>
                            </div>
                            {st.isp && (
                              <div className="text-[10px] text-[#9BAAC0] truncate max-w-[240px]">
                                {st.isp}
                              </div>
                            )}
                          </td>

                          <td className="py-3 px-4 text-right font-mono tabular-nums whitespace-nowrap">
                            <span className="text-[#48C99A] font-semibold">
                              {st.correctDesignsCount}
                            </span>
                            <span className="text-[#9BAAC0] mx-1">/</span>
                            <span
                              className={
                                st.incorrectDesignsCount > 0
                                  ? "text-[#F07474] font-semibold"
                                  : "text-[#9BAAC0]"
                              }
                            >
                              {st.incorrectDesignsCount}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-right font-mono tabular-nums whitespace-nowrap">
                            <span className="text-[#48C99A] font-semibold">
                              {st.correctSimulationsCount}
                            </span>
                            <span className="text-[#9BAAC0] mx-1">/</span>
                            <span
                              className={
                                st.incorrectSimulationsCount > 0
                                  ? "text-[#F07474] font-semibold"
                                  : "text-[#9BAAC0]"
                              }
                            >
                              {st.incorrectSimulationsCount}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-right font-mono tabular-nums whitespace-nowrap">
                            {acc === null ? (
                              <span className="text-[#9BAAC0]">—</span>
                            ) : (
                              <span
                                className={`font-semibold ${
                                  acc >= 80
                                    ? "text-[#48C99A]"
                                    : acc >= 50
                                      ? "text-[#F1B65B]"
                                      : "text-[#F07474]"
                                }`}
                              >
                                {acc}%
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-right font-mono text-[11px] text-[#9BAAC0] tabular-nums whitespace-nowrap">
                            ESP {st.esp32CompletedCount}/20 · Lab{" "}
                            {st.manualsCompletedCount}/75
                            {st.knowledgeChecksAttempted > 0
                              ? ` · Quiz ${st.knowledgeChecksPassed}/${st.knowledgeChecksAttempted}`
                              : ""}
                          </td>

                          <td className="py-3 px-4 text-right font-mono text-[11px] text-[#9BAAC0] tabular-nums whitespace-nowrap">
                            {formatTimestamp(st.updatedAtMs)}
                          </td>

                          <td className="py-3 px-4 text-right">
                            <span className="inline-flex items-center gap-1 text-[11px] font-mono text-[#35BDF2]">
                              {isSelected ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                            </span>
                          </td>
                        </tr>

                        {isSelected && selectedStudent && (
                          <tr className="bg-[#0B1220]/70">
                            <td colSpan={9} className="p-4 sm:p-5 border-t border-[#24344D]">
                              <div className="space-y-4">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="text-xs font-mono font-semibold text-[#35BDF2]">
                                    COMPLETE USER RECORD · UID {selectedStudent.uid}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => setSelectedStudentUid(null)}
                                    className="inline-flex items-center gap-1 text-xs text-[#9BAAC0] hover:text-[#F1F5FA] cursor-pointer"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                    Close
                                  </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs border border-[#24344D] rounded-xl p-4 bg-[#111B2B]">
                                  <div className="space-y-1">
                                    <div className="text-[11px] font-mono text-[#9BAAC0] uppercase">
                                      Identity, IP &amp; Exact Location
                                    </div>
                                    <div className="text-[#F1F5FA] font-semibold">
                                      {selectedStudent.displayName}
                                    </div>
                                    <div className="font-mono text-[#35BDF2]">
                                      {selectedStudent.email}
                                    </div>
                                    <div className="text-[#9BAAC0]">
                                      Consent Confirmed:{" "}
                                      <span className="text-[#48C99A] font-mono">
                                        {formatTimestamp(selectedStudent.consentAtMs)}
                                      </span>
                                    </div>
                                    <div className="text-[#9BAAC0] font-mono tabular-nums">
                                      Sessions: {selectedStudent.loginCount} · Last:{" "}
                                      {formatTimestamp(selectedStudent.lastLoginAtMs)}
                                    </div>
                                    <div className="pt-1 border-t border-[#24344D]/70 space-y-0.5 font-mono text-[11px] tabular-nums">
                                      <div className="text-[#35BDF2] font-semibold">
                                        IP: {selectedStudent.ipAddress || "Unavailable"}
                                      </div>
                                      <div className="text-[#F1F5FA]">
                                        Location: {selectedStudent.location || "Unavailable"}
                                      </div>
                                      {(selectedStudent.isp || selectedStudent.timezone) && (
                                        <div className="text-[#9BAAC0]">
                                          {[selectedStudent.isp, selectedStudent.timezone]
                                            .filter(Boolean)
                                            .join(" · ")}
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  <div className="space-y-1">
                                    <div className="text-[11px] font-mono text-[#9BAAC0] uppercase">
                                      Academic Attribution
                                    </div>
                                    <div className="text-[#F1F5FA]">
                                      {selectedStudent.university}
                                    </div>
                                    <div className="text-[#9BAAC0]">
                                      Dept:{" "}
                                      <span className="text-[#F1F5FA]">
                                        {selectedStudent.department || "Not specified"}
                                      </span>
                                    </div>
                                    <div className="text-[#9BAAC0]">
                                      Student ID:{" "}
                                      <span className="font-mono text-[#F1F5FA]">
                                        {selectedStudent.studentId || "Not specified"}
                                      </span>
                                    </div>
                                    <div className="text-[#9BAAC0]">
                                      Semester:{" "}
                                      <span className="text-[#F1F5FA]">
                                        {selectedStudent.semester || "Not specified"}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="space-y-1 font-mono tabular-nums">
                                    <div className="text-[11px] text-[#9BAAC0] uppercase">
                                      Workbench Milestones
                                    </div>
                                    <div className="flex items-center justify-between text-[#F1F5FA]">
                                      <span className="inline-flex items-center gap-1.5 text-[#9BAAC0]">
                                        <Cpu className="w-3.5 h-3.5 text-[#35BDF2]" />
                                        ESP32 Labs
                                      </span>
                                      <span>{selectedStudent.esp32CompletedCount} / 20</span>
                                    </div>
                                    <div className="flex items-center justify-between text-[#F1F5FA]">
                                      <span className="inline-flex items-center gap-1.5 text-[#9BAAC0]">
                                        <FileText className="w-3.5 h-3.5 text-[#48C99A]" />
                                        Lab Manuals
                                      </span>
                                      <span>{selectedStudent.manualsCompletedCount} / 75</span>
                                    </div>
                                    <div className="flex items-center justify-between text-[#F1F5FA]">
                                      <span className="text-[#9BAAC0]">Practical Exp</span>
                                      <span>{selectedStudent.experimentsCompletedCount}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-[#F1F5FA]">
                                      <span className="text-[#9BAAC0]">Knowledge Checks</span>
                                      <span>
                                        {selectedStudent.knowledgeChecksPassed}/
                                        {selectedStudent.knowledgeChecksAttempted}
                                        {selectedStudent.quizTotalCount > 0
                                          ? ` (${Math.round(
                                              (selectedStudent.quizCorrectCount /
                                                selectedStudent.quizTotalCount) *
                                                100
                                            )}%)`
                                          : ""}
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between text-[#F1F5FA]">
                                      <span className="text-[#9BAAC0]">Saved Circuits</span>
                                      <span>{selectedStudent.totalSavedCircuits}</span>
                                    </div>
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <div className="text-[11px] font-mono uppercase tracking-wider text-[#9BAAC0]">
                                    Recent Per-Circuit Design &amp; Simulation Outcomes (Latest{" "}
                                    {selectedStudent.recentOutcomes.length})
                                  </div>
                                  {selectedStudent.recentOutcomes.length === 0 ? (
                                    <div className="text-xs text-[#9BAAC0] border border-[#24344D] rounded-lg p-3 bg-[#111B2B]">
                                      No individual circuit verify/simulation outcomes recorded yet for this student.
                                    </div>
                                  ) : (
                                    <div className="border border-[#24344D] rounded-lg overflow-hidden bg-[#111B2B]">
                                      <table className="w-full text-left text-xs">
                                        <thead>
                                          <tr className="border-b border-[#24344D] text-[10px] font-mono uppercase text-[#9BAAC0]">
                                            <th className="py-2 px-3">Circuit / Target</th>
                                            <th className="py-2 px-3">Kind</th>
                                            <th className="py-2 px-3">Outcome</th>
                                            <th className="py-2 px-3">Diagnostic</th>
                                            <th className="py-2 px-3 text-right">Time</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#24344D]">
                                          {selectedStudent.recentOutcomes.map((out) => (
                                            <tr key={out.id}>
                                              <td className="py-2 px-3 font-medium text-[#F1F5FA]">
                                                {out.circuitName}
                                              </td>
                                              <td className="py-2 px-3 font-mono text-[11px] text-[#9BAAC0]">
                                                {out.kind} · {out.labMode}
                                              </td>
                                              <td className="py-2 px-3 font-mono font-semibold text-[11px]">
                                                <span
                                                  className={
                                                    out.outcome === "CORRECT"
                                                      ? "text-[#48C99A]"
                                                      : "text-[#F07474]"
                                                  }
                                                >
                                                  {out.outcome}
                                                </span>
                                              </td>
                                              <td className="py-2 px-3 text-[#9BAAC0]">
                                                {out.reason}
                                              </td>
                                              <td className="py-2 px-3 text-right font-mono text-[11px] text-[#9BAAC0] tabular-nums whitespace-nowrap">
                                                {formatTimestamp(out.timestamp)}
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : filteredLogs.length === 0 ? (
        <div className="bg-[#111B2B] border border-[#24344D] rounded-xl p-10 text-center space-y-2">
          <Clock className="w-6 h-6 text-[#9BAAC0] mx-auto" />
          <div className="text-sm font-semibold text-[#F1F5FA]">
            {loginLogs.length === 0
              ? "No Consented Login Logs Recorded Yet"
              : "No Matching Login Records"}
          </div>
          <p className="text-xs text-[#9BAAC0] max-w-md mx-auto">
            Only authenticated users who explicitly grant consent during sign-in or profile setup are written to the login audit trail.
          </p>
        </div>
      ) : (
        <div className="bg-[#111B2B] border border-[#24344D] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#24344D] bg-[#0B1220]/60 text-[11px] font-mono uppercase tracking-wider text-[#9BAAC0]">
                  <th className="py-2.5 px-4 font-semibold">Login Timestamp</th>
                  <th className="py-2.5 px-4 font-semibold">Account &amp; Role</th>
                  <th className="py-2.5 px-4 font-semibold">Complete Academic Profile</th>
                  <th className="py-2.5 px-4 font-semibold">Provider</th>
                  <th className="py-2.5 px-4 font-semibold">Consent</th>
                  <th className="py-2.5 px-4 font-semibold">IP Address &amp; Exact Location</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#24344D] text-xs">
                {filteredLogs.map((log) => {
                  const isAdminEvent =
                    log.role === "admin" || log.providerId === "admin-credentials";
                  return (
                    <tr key={log.logId} className="hover:bg-[#162338]/70 transition-colors">
                      <td className="py-3 px-4 font-mono text-[11px] text-[#F1F5FA] tabular-nums whitespace-nowrap">
                        {formatTimestamp(log.loggedInAtMs)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5 min-w-[200px]">
                          {log.photoURL ? (
                            <img
                              src={log.photoURL}
                              alt={log.displayName}
                              referrerPolicy="no-referrer"
                              className="w-7 h-7 rounded-lg border border-[#24344D] object-cover shrink-0"
                            />
                          ) : (
                            <div
                              className={`w-7 h-7 rounded-lg bg-[#162338] border flex items-center justify-center font-mono text-[11px] font-bold shrink-0 ${
                                isAdminEvent
                                  ? "border-[#48C99A]/50 text-[#48C99A]"
                                  : "border-[#24344D] text-[#35BDF2]"
                              }`}
                            >
                              {isAdminEvent
                                ? "AD"
                                : log.displayName.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 font-semibold text-[#F1F5FA] truncate">
                              <span className="truncate">{log.displayName}</span>
                              {isAdminEvent && (
                                <span className="px-1.5 py-0.5 rounded bg-[#48C99A]/15 border border-[#48C99A]/40 text-[10px] font-mono text-[#48C99A] shrink-0">
                                  ADMIN
                                </span>
                              )}
                            </div>
                            <div className="font-mono text-[11px] text-[#35BDF2] truncate">
                              {log.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 min-w-[210px]">
                        <div className="text-[#F1F5FA] truncate max-w-[240px]">
                          {log.university}
                        </div>
                        <div className="font-mono text-[11px] text-[#9BAAC0] truncate">
                          {[log.department, log.studentId, log.semester]
                            .filter(Boolean)
                            .join(" · ") || "—"}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-[#9BAAC0] whitespace-nowrap">
                        {log.providerId} {log.emailVerified ? "· Verified" : ""}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-[#48C99A] whitespace-nowrap">
                        {isAdminEvent
                          ? "Admin Session"
                          : `Consented (${log.consentVersion})`}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-[#9BAAC0] min-w-[230px]">
                        <div className="flex items-center gap-1.5 text-[#35BDF2] font-semibold tabular-nums truncate max-w-[260px]">
                          <Globe className="w-3 h-3 shrink-0 text-[#35BDF2]" />
                          <span>{log.ipAddress || "Unavailable"}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[#F1F5FA] truncate max-w-[260px]">
                          <MapPin className="w-3 h-3 shrink-0 text-[#48C99A]" />
                          <span className="truncate">
                            {log.location ||
                              [log.city, log.region, log.country]
                                .filter(Boolean)
                                .join(", ") ||
                              "Location Unavailable"}
                          </span>
                        </div>
                        <div className="text-[10.5px] text-[#9BAAC0] truncate max-w-[260px]">
                          {[log.isp, log.userAgentSummary]
                            .filter(Boolean)
                            .join(" · ") || "Web Workstation"}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
