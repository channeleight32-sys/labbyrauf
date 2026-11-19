import { ActiveTabId } from "../components/CurriculumGuide";
import { getUserScopedKey } from "./userStorageScope";

export const WORKSPACE_STORE_KEY = "ist_lab_workspace_state_v1";

export interface RecentWorkEntry {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  tab: ActiveTabId;
  timestamp: number;
}

export interface SimulationActivityEntry {
  id: string;
  action: string;
  target: string;
  status: "PASS" | "INFO" | "WARN";
  tab: ActiveTabId;
  timestamp: number;
}

export interface SavedProjectBookmark {
  id: string;
  title: string;
  category: string;
  tab: ActiveTabId;
  notes: string;
  timestamp: number;
}

export interface CircuitOutcomeEntry {
  id: string;
  circuitName: string;
  labMode: string;
  kind: "DESIGN" | "SIMULATION";
  outcome: "CORRECT" | "INCORRECT";
  reason: string;
  timestamp: number;
}

export interface CircuitProgressSummary {
  correctDesigns: number;
  incorrectDesigns: number;
  correctSimulations: number;
  incorrectSimulations: number;
  recentOutcomes: CircuitOutcomeEntry[];
}

export const DEFAULT_CIRCUIT_PROGRESS: CircuitProgressSummary = {
  correctDesigns: 0,
  incorrectDesigns: 0,
  correctSimulations: 0,
  incorrectSimulations: 0,
  recentOutcomes: [],
};

export interface KnowledgeCheckRecord {
  labId: string;
  labTitle: string;
  domain: string;
  score: number;
  totalQuestions: number;
  passed: boolean;
  attempts: number;
  completedAt: number;
}

export interface WorkspaceState {
  recentWork: RecentWorkEntry[];
  simulationActivity: SimulationActivityEntry[];
  savedProjects: SavedProjectBookmark[];
  completedEsp32Lessons: Record<number, boolean>;
  completedManuals: Record<string, boolean>;
  lastEsp32LessonId: number;
  circuitProgress: CircuitProgressSummary;
  knowledgeChecks: Record<string, KnowledgeCheckRecord>;
}

export const DEFAULT_WORKSPACE_STATE: WorkspaceState = {
  recentWork: [],
  simulationActivity: [],
  savedProjects: [],
  completedEsp32Lessons: {},
  completedManuals: {},
  lastEsp32LessonId: 1,
  circuitProgress: DEFAULT_CIRCUIT_PROGRESS,
  knowledgeChecks: {},
};

export function sanitizeKnowledgeChecks(
  raw: unknown
): Record<string, KnowledgeCheckRecord> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, KnowledgeCheckRecord> = {};
  let count = 0;
  for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
    if (count >= 150) break;
    if (!val || typeof val !== "object" || Array.isArray(val)) continue;
    const item = val as Record<string, unknown>;
    const cleanKey = key.trim().slice(0, 64);
    if (!cleanKey) continue;
    const totalQuestions = Math.max(
      1,
      Math.min(10, Math.round(Number(item.totalQuestions) || 3))
    );
    const score = Math.max(
      0,
      Math.min(totalQuestions, Math.round(Number(item.score) || 0))
    );
    out[cleanKey] = {
      labId: typeof item.labId === "string" ? item.labId.slice(0, 64) : cleanKey,
      labTitle:
        typeof item.labTitle === "string"
          ? item.labTitle.slice(0, 140)
          : cleanKey,
      domain:
        typeof item.domain === "string" ? item.domain.slice(0, 32) : "GENERAL",
      score,
      totalQuestions,
      passed: typeof item.passed === "boolean" ? item.passed : score >= 2,
      attempts: Math.max(1, Math.min(1000, Math.round(Number(item.attempts) || 1))),
      completedAt:
        typeof item.completedAt === "number" && Number.isFinite(item.completedAt)
          ? item.completedAt
          : Date.now(),
    };
    count++;
  }
  return out;
}

export function summarizeKnowledgeChecks(
  checks: Record<string, KnowledgeCheckRecord> | undefined
): {
  attempted: number;
  passed: number;
  totalCorrect: number;
  totalQuestions: number;
  accuracyPercent: number | null;
} {
  const values = Object.values(checks || {});
  const attempted = values.length;
  const passed = values.filter((c) => c.passed).length;
  const totalCorrect = values.reduce((acc, c) => acc + c.score, 0);
  const totalQuestions = values.reduce((acc, c) => acc + c.totalQuestions, 0);
  const accuracyPercent =
    totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : null;
  return { attempted, passed, totalCorrect, totalQuestions, accuracyPercent };
}

export function sanitizeCircuitProgress(raw: unknown): CircuitProgressSummary {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ...DEFAULT_CIRCUIT_PROGRESS, recentOutcomes: [] };
  }
  const obj = raw as Record<string, unknown>;
  const safeNum = (v: unknown) =>
    typeof v === "number" && Number.isFinite(v) && v >= 0
      ? Math.min(100000, Math.round(v))
      : 0;
  const recentRaw = Array.isArray(obj.recentOutcomes) ? obj.recentOutcomes : [];
  const recentOutcomes: CircuitOutcomeEntry[] = recentRaw
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item))
    .slice(0, 20)
    .map((item, idx) => ({
      id: typeof item.id === "string" ? item.id.slice(0, 80) : `out_${Date.now()}_${idx}`,
      circuitName: typeof item.circuitName === "string" ? item.circuitName.slice(0, 140) : "Untitled Circuit",
      labMode: typeof item.labMode === "string" ? item.labMode.slice(0, 48) : "lab",
      kind: item.kind === "SIMULATION" ? "SIMULATION" : "DESIGN",
      outcome: item.outcome === "INCORRECT" ? "INCORRECT" : "CORRECT",
      reason: typeof item.reason === "string" ? item.reason.slice(0, 160) : "",
      timestamp: typeof item.timestamp === "number" && Number.isFinite(item.timestamp) ? item.timestamp : Date.now(),
    }));

  return {
    correctDesigns: safeNum(obj.correctDesigns),
    incorrectDesigns: safeNum(obj.incorrectDesigns),
    correctSimulations: safeNum(obj.correctSimulations),
    incorrectSimulations: safeNum(obj.incorrectSimulations),
    recentOutcomes,
  };
}

export function loadWorkspaceState(): WorkspaceState {
  if (typeof window === "undefined" || !window.localStorage) {
    return DEFAULT_WORKSPACE_STATE;
  }
  try {
    const raw = window.localStorage.getItem(getUserScopedKey(WORKSPACE_STORE_KEY));
    if (!raw) return DEFAULT_WORKSPACE_STATE;
    const parsed = JSON.parse(raw);
    return {
      recentWork: Array.isArray(parsed.recentWork) ? parsed.recentWork : [],
      simulationActivity: Array.isArray(parsed.simulationActivity)
        ? parsed.simulationActivity
        : [],
      savedProjects: Array.isArray(parsed.savedProjects)
        ? parsed.savedProjects
        : [],
      completedEsp32Lessons:
        parsed.completedEsp32Lessons &&
        typeof parsed.completedEsp32Lessons === "object"
          ? parsed.completedEsp32Lessons
          : {},
      completedManuals:
        parsed.completedManuals && typeof parsed.completedManuals === "object"
          ? parsed.completedManuals
          : {},
      lastEsp32LessonId:
        typeof parsed.lastEsp32LessonId === "number"
          ? parsed.lastEsp32LessonId
          : 1,
      circuitProgress: sanitizeCircuitProgress(parsed.circuitProgress),
      knowledgeChecks: sanitizeKnowledgeChecks(parsed.knowledgeChecks),
    };
  } catch {
    return DEFAULT_WORKSPACE_STATE;
  }
}

export function persistWorkspaceState(state: WorkspaceState): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.setItem(
      getUserScopedKey(WORKSPACE_STORE_KEY),
      JSON.stringify(state)
    );
  } catch {
    // ignore quota errors
  }
}

export function appendRecentWork(
  prev: WorkspaceState,
  entry: Omit<RecentWorkEntry, "timestamp">
): WorkspaceState {
  const now = Date.now();
  const filtered = prev.recentWork.filter((item) => item.id !== entry.id);
  const next: WorkspaceState = {
    ...prev,
    recentWork: [{ ...entry, timestamp: now }, ...filtered].slice(0, 16),
  };
  persistWorkspaceState(next);
  return next;
}

function classifyOutcomeKind(action: string): "DESIGN" | "SIMULATION" {
  const lower = action.toLowerCase();
  if (
    lower.includes("started simulation") ||
    lower.includes("started spice") ||
    lower.includes("simulation error") ||
    lower.includes("simulation failed") ||
    lower.includes("simulation halted") ||
    lower.includes("ran esp32") ||
    lower.includes("spice run")
  ) {
    return "SIMULATION";
  }
  return "DESIGN";
}

export function appendSimulationActivity(
  prev: WorkspaceState,
  entry: Omit<SimulationActivityEntry, "id" | "timestamp">
): WorkspaceState {
  const now = Date.now();
  const id = `act_${now}_${Math.random().toString(36).slice(2, 6)}`;
  const item: SimulationActivityEntry = {
    ...entry,
    id,
    timestamp: now,
  };

  let nextProgress = sanitizeCircuitProgress(prev.circuitProgress);
  if (entry.status === "PASS" || entry.status === "WARN") {
    const outcome: "CORRECT" | "INCORRECT" =
      entry.status === "PASS" ? "CORRECT" : "INCORRECT";
    const kind = classifyOutcomeKind(entry.action);
    const outcomeEntry: CircuitOutcomeEntry = {
      id,
      circuitName: (entry.target || "Untitled Circuit").slice(0, 140),
      labMode: String(entry.tab || "lab").slice(0, 48),
      kind,
      outcome,
      reason: entry.action.slice(0, 160),
      timestamp: now,
    };

    nextProgress = {
      correctDesigns:
        nextProgress.correctDesigns +
        (kind === "DESIGN" && outcome === "CORRECT" ? 1 : 0),
      incorrectDesigns:
        nextProgress.incorrectDesigns +
        (kind === "DESIGN" && outcome === "INCORRECT" ? 1 : 0),
      correctSimulations:
        nextProgress.correctSimulations +
        (kind === "SIMULATION" && outcome === "CORRECT" ? 1 : 0),
      incorrectSimulations:
        nextProgress.incorrectSimulations +
        (kind === "SIMULATION" && outcome === "INCORRECT" ? 1 : 0),
      recentOutcomes: [outcomeEntry, ...nextProgress.recentOutcomes].slice(0, 20),
    };
  }

  const next: WorkspaceState = {
    ...prev,
    simulationActivity: [item, ...prev.simulationActivity].slice(0, 25),
    circuitProgress: nextProgress,
  };
  persistWorkspaceState(next);
  return next;
}

export function clearSimulationActivity(prev: WorkspaceState): WorkspaceState {
  const next: WorkspaceState = {
    ...prev,
    simulationActivity: [],
  };
  persistWorkspaceState(next);
  return next;
}

export function recordKnowledgeCheckResult(
  prev: WorkspaceState,
  input: {
    labId: string;
    labTitle: string;
    domain: string;
    score: number;
    totalQuestions: number;
    tab: ActiveTabId;
  }
): WorkspaceState {
  const now = Date.now();
  const prevChecks = sanitizeKnowledgeChecks(prev.knowledgeChecks);
  const existing = prevChecks[input.labId];
  const passed = input.score >= Math.ceil((input.totalQuestions * 2) / 3);
  const record: KnowledgeCheckRecord = {
    labId: input.labId.slice(0, 64),
    labTitle: input.labTitle.slice(0, 140),
    domain: input.domain.slice(0, 32),
    score: existing ? Math.max(existing.score, input.score) : input.score,
    totalQuestions: input.totalQuestions,
    passed: existing ? existing.passed || passed : passed,
    attempts: (existing?.attempts || 0) + 1,
    completedAt: now,
  };

  const actItem: SimulationActivityEntry = {
    id: `quiz_${now}_${Math.random().toString(36).slice(2, 6)}`,
    action: passed
      ? `Knowledge Check Passed (${input.score}/${input.totalQuestions})`
      : `Knowledge Check Reviewed (${input.score}/${input.totalQuestions})`,
    target: input.labTitle,
    status: "INFO",
    tab: input.tab,
    timestamp: now,
  };

  const next: WorkspaceState = {
    ...prev,
    simulationActivity: [actItem, ...prev.simulationActivity].slice(0, 25),
    knowledgeChecks: {
      ...prevChecks,
      [input.labId]: record,
    },
  };
  persistWorkspaceState(next);
  return next;
}

export function setEsp32LessonProgress(
  prev: WorkspaceState,
  lessonId: number,
  completed?: boolean
): WorkspaceState {
  const nextCompleted = { ...prev.completedEsp32Lessons };
  if (typeof completed === "boolean") {
    nextCompleted[lessonId] = completed;
  }
  const next: WorkspaceState = {
    ...prev,
    lastEsp32LessonId: lessonId,
    completedEsp32Lessons: nextCompleted,
  };
  persistWorkspaceState(next);
  return next;
}

export function setManualCompletionState(
  prev: WorkspaceState,
  labId: string,
  completed: boolean
): WorkspaceState {
  const next: WorkspaceState = {
    ...prev,
    completedManuals: {
      ...prev.completedManuals,
      [labId]: completed,
    },
  };
  persistWorkspaceState(next);
  return next;
}

export function addSavedProjectBookmark(
  prev: WorkspaceState,
  bookmark: Omit<SavedProjectBookmark, "id" | "timestamp">
): WorkspaceState {
  const now = Date.now();
  const item: SavedProjectBookmark = {
    ...bookmark,
    id: `proj_${now}_${Math.random().toString(36).slice(2, 6)}`,
    timestamp: now,
  };
  const next: WorkspaceState = {
    ...prev,
    savedProjects: [item, ...prev.savedProjects].slice(0, 24),
  };
  persistWorkspaceState(next);
  return next;
}

export function removeSavedProjectBookmark(
  prev: WorkspaceState,
  id: string
): WorkspaceState {
  const next: WorkspaceState = {
    ...prev,
    savedProjects: prev.savedProjects.filter((p) => p.id !== id),
  };
  persistWorkspaceState(next);
  return next;
}

export function formatRelativeTime(timestampMs: number): string {
  const diffSec = Math.max(0, Math.floor((Date.now() - timestampMs) / 1000));
  if (diffSec < 10) return "Just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  const mins = Math.floor(diffSec / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}
