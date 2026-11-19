import type {
  AdminLoginLogRecord,
  AdminStudentProgressRecord,
} from "../firebase";

const ADMIN_TOKEN_STORAGE_KEY = "ist_admin_session_token";

export interface AdminLoginResponse {
  authenticated: boolean;
  role?: "admin";
  token?: string;
  expiresAt?: number;
  error?: string;
}

export function getStoredAdminToken(): string | null {
  try {
    return window.sessionStorage.getItem(ADMIN_TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredAdminToken(token: string | null): void {
  try {
    if (token) {
      window.sessionStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, token);
    } else {
      window.sessionStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

function buildAdminHeaders(tokenOverride?: string | null): HeadersInit {
  const token = tokenOverride ?? getStoredAdminToken();
  if (token && token !== "cookie-session") {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
}

export async function loginAdminWithCredentials(
  username: string,
  password: string
): Promise<{ token: string; expiresAt: number }> {
  const res = await fetch("/api/admin/login", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  const data = (await res.json().catch(() => ({}))) as AdminLoginResponse;
  if (!res.ok || !data.authenticated || !data.token) {
    throw new Error(data.error || "Invalid administrator credentials.");
  }

  setStoredAdminToken(data.token);
  return {
    token: data.token,
    expiresAt: data.expiresAt || Date.now() + 8 * 60 * 60 * 1000,
  };
}

export async function verifyExistingAdminSession(): Promise<string | null> {
  const stored = getStoredAdminToken();
  try {
    const res = await fetch("/api/admin/session", {
      method: "GET",
      credentials: "include",
      headers: buildAdminHeaders(stored),
    });
    if (!res.ok) {
      setStoredAdminToken(null);
      return null;
    }
    const data = (await res.json()) as { authenticated?: boolean };
    if (data.authenticated) {
      return stored || "cookie-session";
    }
    setStoredAdminToken(null);
    return null;
  } catch {
    return null;
  }
}

export async function logoutAdminSession(): Promise<void> {
  setStoredAdminToken(null);
  try {
    await fetch("/api/admin/logout", {
      method: "POST",
      credentials: "include",
    });
  } catch {
    // ignore network errors during logout
  }
}

export async function fetchServerAdminAuditLogs(
  tokenOverride?: string | null
): Promise<AdminLoginLogRecord[]> {
  const res = await fetch("/api/admin/audit-logs", {
    method: "GET",
    credentials: "include",
    headers: buildAdminHeaders(tokenOverride),
  });
  const data = (await res.json().catch(() => ({}))) as {
    logs?: AdminLoginLogRecord[];
    error?: string;
  };
  if (!res.ok) {
    throw new Error(
      data.error ||
        (res.status === 401
          ? "Administrator credentials expired or invalid. Please sign in again."
          : "Unable to load audit logs from server.")
    );
  }
  return Array.isArray(data.logs) ? data.logs : [];
}

export async function fetchServerAdminUsers(
  tokenOverride?: string | null
): Promise<AdminStudentProgressRecord[]> {
  const res = await fetch("/api/admin/users", {
    method: "GET",
    credentials: "include",
    headers: buildAdminHeaders(tokenOverride),
  });
  const data = (await res.json().catch(() => ({}))) as {
    users?: AdminStudentProgressRecord[];
    error?: string;
  };
  if (!res.ok) {
    throw new Error(
      data.error ||
        (res.status === 401
          ? "Administrator credentials expired or invalid. Please sign in again."
          : "Unable to load user records from server.")
    );
  }
  return Array.isArray(data.users) ? data.users : [];
}

export async function importLegacyAdminRecords(
  payload: {
    logs?: AdminLoginLogRecord[];
    users?: AdminStudentProgressRecord[];
  },
  tokenOverride?: string | null
): Promise<void> {
  await fetch("/api/admin/import-legacy", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...buildAdminHeaders(tokenOverride),
    },
    body: JSON.stringify(payload),
  }).catch(() => undefined);
}

