import "dotenv/config";
import crypto from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import express, { type Request, type Response } from "express";

const PORT = Number(process.env.PORT || 3000);
const IS_PRODUCTION = process.env.NODE_ENV === "production";

const SESSION_COOKIE_NAME = "ist_admin_session";
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

// Load Firebase projectId from firebase-applet-config.json for ID token verification
function loadFirebaseProjectId(): string {
  try {
    const cfgPath = path.resolve(process.cwd(), "firebase-applet-config.json");
    const raw = fs.readFileSync(cfgPath, "utf8");
    const parsed = JSON.parse(raw) as { projectId?: string };
    if (typeof parsed.projectId === "string" && parsed.projectId.trim()) {
      return parsed.projectId.trim();
    }
  } catch {
    // Fallback below
  }
  return process.env.FIREBASE_PROJECT_ID || "giga-container-907pf";
}

const FIREBASE_PROJECT_ID = loadFirebaseProjectId();

// Salted scrypt digests for server-side verification only (never sent to clients)
const ADMIN_USERNAME_SALT = "4880c9db5e6a9c563c38806f06b60b9f";
const ADMIN_USERNAME_HASH =
  "0a663340bbc840f279097315c432f07848ce1a56e890203337939afb00b2f2f8778b5b4e4c93af5c4cc2a92a7ab61301ad67c39bf7b4340c1022309c4cb67a77";

const ADMIN_PASSWORD_SALT = "f2ae8401b9aa73e18fdb4b1ccb8eae60";
const ADMIN_PASSWORD_HASH =
  "a869904eb4d923746d9147a1a61d6230cdd4ea5b609e99f7e7bc2edff2658ddd597b32ce97cb60f9f81eaf0b47106d5c9f0c6d916ee5810dc32fa58a351716b1";

const SESSION_SECRET =
  process.env.ADMIN_SESSION_SECRET || crypto.randomBytes(32).toString("hex");

interface RateLimitBucket {
  failures: number;
  resetAt: number;
}

const loginAttempts = new Map<string, RateLimitBucket>();
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;
const MAX_FAILED_ATTEMPTS = 10;

function timingSafeHexEquals(aHex: string, bHex: string): boolean {
  const aBuf = Buffer.from(aHex, "hex");
  const bBuf = Buffer.from(bHex, "hex");
  if (aBuf.length !== bBuf.length || aBuf.length === 0) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

function timingSafeUtf8Equals(a: string, b: string): boolean {
  const aHash = crypto.createHash("sha256").update(a, "utf8").digest();
  const bHash = crypto.createHash("sha256").update(b, "utf8").digest();
  return crypto.timingSafeEqual(aHash, bHash);
}

function verifyAdminCredentials(username: string, password: string): boolean {
  const cleanUser = username.trim();
  if (!cleanUser || !password) return false;

  const envUser = process.env.ADMIN_USERNAME;
  const envPass = process.env.ADMIN_PASSWORD;
  if (envUser && envPass) {
    return (
      timingSafeUtf8Equals(cleanUser, envUser) &&
      timingSafeUtf8Equals(password, envPass)
    );
  }

  const userDigest = crypto
    .scryptSync(cleanUser, ADMIN_USERNAME_SALT, 64)
    .toString("hex");
  const passDigest = crypto
    .scryptSync(password, ADMIN_PASSWORD_SALT, 64)
    .toString("hex");

  const userMatch = timingSafeHexEquals(userDigest, ADMIN_USERNAME_HASH);
  const passMatch = timingSafeHexEquals(passDigest, ADMIN_PASSWORD_HASH);
  return userMatch && passMatch;
}

interface AdminSessionPayload {
  role: "admin";
  iat: number;
  exp: number;
  jti: string;
}

function signAdminToken(payload: AdminSessionPayload): string {
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url"
  );
  const sig = crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(encoded)
    .digest("base64url");
  return `${encoded}.${sig}`;
}

function verifyAdminToken(token: string | undefined): AdminSessionPayload | null {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [encoded, sig] = parts;
  if (!encoded || !sig) return null;

  const expectedSig = crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(encoded)
    .digest("base64url");

  const sigBuf = Buffer.from(sig, "utf8");
  const expBuf = Buffer.from(expectedSig, "utf8");
  if (sigBuf.length !== expBuf.length) return null;
  if (!crypto.timingSafeEqual(sigBuf, expBuf)) return null;

  try {
    const parsed = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8")
    ) as AdminSessionPayload;
    if (
      parsed.role !== "admin" ||
      typeof parsed.exp !== "number" ||
      parsed.exp <= Date.now()
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!cookieHeader) return out;
  for (const part of cookieHeader.split(";")) {
    const idx = part.indexOf("=");
    if (idx <= 0) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    if (key) {
      try {
        out[key] = decodeURIComponent(val);
      } catch {
        out[key] = val;
      }
    }
  }
  return out;
}

function extractAdminToken(req: Request): string | undefined {
  const authHeader = req.headers.authorization;
  if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7).trim();
  }
  const cookies = parseCookies(req.headers.cookie);
  return cookies[SESSION_COOKIE_NAME];
}

function requireAdminSession(req: Request, res: Response): AdminSessionPayload | null {
  const token = extractAdminToken(req);
  const payload = verifyAdminToken(token);
  if (!payload) {
    res.status(401).json({
      error: "Administrator authentication required. Sign in with administrator credentials.",
    });
    return null;
  }
  return payload;
}

// ============================================================================
// Exact Client IP & Geographic Location Resolution
// ============================================================================

function normalizeIpCandidate(raw: string): string {
  let cleaned = raw.trim().replace(/^"+|"+$/g, "");
  if (!cleaned) return "";
  if (cleaned.startsWith("::ffff:")) {
    cleaned = cleaned.slice(7);
  }
  // Handle "[ipv6]:port"
  if (cleaned.startsWith("[")) {
    const closeBracket = cleaned.indexOf("]");
    if (closeBracket > 1) {
      cleaned = cleaned.slice(1, closeBracket);
    }
  } else if (net.isIPv4(cleaned.split(":")[0] || "") && cleaned.includes(":")) {
    // Handle "1.2.3.4:56789"
    cleaned = cleaned.split(":")[0] || cleaned;
  }
  return net.isIP(cleaned) ? cleaned : "";
}

function isPrivateOrLocalIp(ip: string): boolean {
  if (!ip) return true;
  const lower = ip.toLowerCase();
  if (lower === "::1" || lower === "127.0.0.1" || lower === "0.0.0.0") {
    return true;
  }
  if (lower.startsWith("10.") || lower.startsWith("192.168.")) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(lower)) return true;
  if (lower.startsWith("169.254.") || lower.startsWith("100.64.")) return true;
  if (lower.startsWith("fc") || lower.startsWith("fd") || lower.startsWith("fe80:")) {
    return true;
  }
  return false;
}

function getClientKey(req: Request): string {
  const candidates: string[] = [];
  const headerOrder = [
    "cf-connecting-ip",
    "true-client-ip",
    "x-real-ip",
    "x-client-ip",
  ];
  for (const h of headerOrder) {
    const val = req.headers[h];
    if (typeof val === "string" && val.trim()) {
      const normalized = normalizeIpCandidate(val);
      if (normalized) candidates.push(normalized);
    }
  }

  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    for (const part of forwarded.split(",")) {
      const normalized = normalizeIpCandidate(part);
      if (normalized) candidates.push(normalized);
    }
  } else if (Array.isArray(forwarded)) {
    for (const entry of forwarded) {
      for (const part of entry.split(",")) {
        const normalized = normalizeIpCandidate(part);
        if (normalized) candidates.push(normalized);
      }
    }
  }

  const reqIp = normalizeIpCandidate(req.ip || req.socket?.remoteAddress || "");
  if (reqIp) candidates.push(reqIp);

  // Prefer the first public routable client IP if present
  const publicIp = candidates.find((ip) => !isPrivateOrLocalIp(ip));
  if (publicIp) return publicIp;
  return candidates[0] || "local";
}

function decodeGeoHeader(val: string | string[] | undefined): string {
  if (typeof val !== "string") return "";
  const trimmed = val.trim();
  if (!trimmed || trimmed.toLowerCase() === "unknown" || trimmed === "ZZ") {
    return "";
  }
  try {
    return decodeURIComponent(trimmed).slice(0, 80);
  } catch {
    return trimmed.slice(0, 80);
  }
}

export interface ResolvedGeoInfo {
  ipAddress: string;
  location: string;
  city?: string;
  region?: string;
  country?: string;
  postal?: string;
  latitude?: number;
  longitude?: number;
  isp?: string;
  timezone?: string;
}

interface GeoCacheEntry {
  info: ResolvedGeoInfo;
  expiresAt: number;
}

const geoCache = new Map<string, GeoCacheEntry>();
const GEO_CACHE_HIT_TTL_MS = 6 * 60 * 60 * 1000;
const GEO_CACHE_MISS_TTL_MS = 5 * 60 * 1000;

function formatGeoLocationString(parts: {
  city?: string;
  region?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
}): string {
  const placeParts: string[] = [];
  for (const p of [parts.city, parts.region, parts.country]) {
    const clean = p?.trim();
    if (clean && !placeParts.some((x) => x.toLowerCase() === clean.toLowerCase())) {
      placeParts.push(clean);
    }
  }
  const base = placeParts.join(", ");
  if (
    typeof parts.latitude === "number" &&
    Number.isFinite(parts.latitude) &&
    typeof parts.longitude === "number" &&
    Number.isFinite(parts.longitude)
  ) {
    const coords = `${parts.latitude.toFixed(4)}, ${parts.longitude.toFixed(4)}`;
    return (base ? `${base} (${coords})` : coords).slice(0, 160);
  }
  return base.slice(0, 160);
}

async function fetchJsonWithTimeout(
  url: string,
  timeoutMs = 2200
): Promise<Record<string, unknown> | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json", "User-Agent": "IST-Lab-Telemetry/1.0" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as unknown;
    if (!data || typeof data !== "object" || Array.isArray(data)) return null;
    return data as Record<string, unknown>;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function toFiniteCoord(val: unknown): number | undefined {
  const num = typeof val === "number" ? val : Number(val);
  return Number.isFinite(num) && Math.abs(num) <= 180 ? num : undefined;
}

function cleanShortStr(val: unknown, maxLen = 80): string | undefined {
  if (typeof val !== "string") return undefined;
  const trimmed = val.trim().slice(0, maxLen);
  return trimmed.length > 0 ? trimmed : undefined;
}

async function resolveClientGeo(req: Request): Promise<ResolvedGeoInfo> {
  const rawIp = getClientKey(req).slice(0, 64);

  // Extract any edge/proxy geo headers first
  const headerCity =
    decodeGeoHeader(req.headers["x-appengine-city"]) ||
    decodeGeoHeader(req.headers["cf-ipcity"]) ||
    decodeGeoHeader(req.headers["x-vercel-ip-city"]);
  const headerRegion =
    decodeGeoHeader(req.headers["x-appengine-region"]) ||
    decodeGeoHeader(req.headers["cf-region"]) ||
    decodeGeoHeader(req.headers["x-vercel-ip-country-region"]);
  const headerCountry =
    decodeGeoHeader(req.headers["x-appengine-country"]) ||
    decodeGeoHeader(req.headers["cf-ipcountry"]) ||
    decodeGeoHeader(req.headers["x-vercel-ip-country"]);

  let headerLat = toFiniteCoord(
    req.headers["cf-iplatitude"] || req.headers["x-vercel-ip-latitude"]
  );
  let headerLon = toFiniteCoord(
    req.headers["cf-iplongitude"] || req.headers["x-vercel-ip-longitude"]
  );
  const cityLatLong = decodeGeoHeader(req.headers["x-appengine-citylatlong"]);
  if (cityLatLong && cityLatLong.includes(",")) {
    const [la, lo] = cityLatLong.split(",");
    headerLat = headerLat ?? toFiniteCoord(la);
    headerLon = headerLon ?? toFiniteCoord(lo);
  }

  if (!rawIp || rawIp === "local" || isPrivateOrLocalIp(rawIp)) {
    const headerLoc = formatGeoLocationString({
      city: headerCity,
      region: headerRegion,
      country: headerCountry,
      latitude: headerLat,
      longitude: headerLon,
    });
    return {
      ipAddress: rawIp && rawIp !== "local" ? rawIp : "127.0.0.1",
      location: headerLoc || "Local / Private Network",
      city: headerCity || undefined,
      region: headerRegion || undefined,
      country: headerCountry || undefined,
      latitude: headerLat,
      longitude: headerLon,
    };
  }

  const cached = geoCache.get(rawIp);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.info;
  }

  let resolved: ResolvedGeoInfo = {
    ipAddress: rawIp,
    location: "",
    city: headerCity || undefined,
    region: headerRegion || undefined,
    country: headerCountry || undefined,
    latitude: headerLat,
    longitude: headerLon,
  };

  // Provider 1: ipwho.is
  const ipwho = await fetchJsonWithTimeout(
    `https://ipwho.is/${encodeURIComponent(rawIp)}`
  );
  if (ipwho && ipwho.success !== false) {
    const conn =
      ipwho.connection && typeof ipwho.connection === "object"
        ? (ipwho.connection as Record<string, unknown>)
        : undefined;
    const tz =
      ipwho.timezone && typeof ipwho.timezone === "object"
        ? (ipwho.timezone as Record<string, unknown>)
        : undefined;
    resolved = {
      ipAddress: rawIp,
      location: "",
      city: cleanShortStr(ipwho.city) || resolved.city,
      region: cleanShortStr(ipwho.region) || resolved.region,
      country: cleanShortStr(ipwho.country) || resolved.country,
      postal: cleanShortStr(ipwho.postal, 24),
      latitude: toFiniteCoord(ipwho.latitude) ?? resolved.latitude,
      longitude: toFiniteCoord(ipwho.longitude) ?? resolved.longitude,
      isp: cleanShortStr(conn?.isp || conn?.org, 100),
      timezone: cleanShortStr(tz?.id, 64),
    };
  }

  // Provider 2 fallback: ipapi.co
  if (!resolved.city || !resolved.country) {
    const ipapi = await fetchJsonWithTimeout(
      `https://ipapi.co/${encodeURIComponent(rawIp)}/json/`
    );
    if (ipapi && !ipapi.error) {
      resolved = {
        ...resolved,
        city: resolved.city || cleanShortStr(ipapi.city),
        region: resolved.region || cleanShortStr(ipapi.region),
        country:
          resolved.country ||
          cleanShortStr(ipapi.country_name) ||
          cleanShortStr(ipapi.country),
        postal: resolved.postal || cleanShortStr(ipapi.postal, 24),
        latitude: resolved.latitude ?? toFiniteCoord(ipapi.latitude),
        longitude: resolved.longitude ?? toFiniteCoord(ipapi.longitude),
        isp: resolved.isp || cleanShortStr(ipapi.org, 100),
        timezone: resolved.timezone || cleanShortStr(ipapi.timezone, 64),
      };
    }
  }

  // Provider 3 fallback: freeipapi.com
  if (!resolved.city || !resolved.country) {
    const freeIp = await fetchJsonWithTimeout(
      `https://freeipapi.com/api/json/${encodeURIComponent(rawIp)}`
    );
    if (freeIp) {
      const tzArr = Array.isArray(freeIp.timeZones) ? freeIp.timeZones : [];
      resolved = {
        ...resolved,
        city: resolved.city || cleanShortStr(freeIp.cityName),
        region: resolved.region || cleanShortStr(freeIp.regionName),
        country: resolved.country || cleanShortStr(freeIp.countryName),
        postal: resolved.postal || cleanShortStr(freeIp.zipCode, 24),
        latitude: resolved.latitude ?? toFiniteCoord(freeIp.latitude),
        longitude: resolved.longitude ?? toFiniteCoord(freeIp.longitude),
        timezone:
          resolved.timezone ||
          (typeof tzArr[0] === "string" ? cleanShortStr(tzArr[0], 64) : undefined),
      };
    }
  }

  const formattedLoc = formatGeoLocationString(resolved);
  resolved.location = formattedLoc || "Location Lookup Pending";

  geoCache.set(rawIp, {
    info: resolved,
    expiresAt:
      Date.now() + (formattedLoc ? GEO_CACHE_HIT_TTL_MS : GEO_CACHE_MISS_TTL_MS),
  });

  return resolved;
}

// ============================================================================
// Firebase Auth ID Token Verification (RS256 against Google SecureToken X.509)
// ============================================================================

interface VerifiedFirebaseUser {
  uid: string;
  email?: string;
  emailVerified: boolean;
  name?: string;
  picture?: string;
  providerId: string;
}

let cachedGoogleCerts: { certs: Record<string, string>; expiresAt: number } | null =
  null;

async function getFirebasePublicCerts(
  forceRefresh = false
): Promise<Record<string, string>> {
  if (!forceRefresh && cachedGoogleCerts && cachedGoogleCerts.expiresAt > Date.now()) {
    return cachedGoogleCerts.certs;
  }
  const res = await fetch(
    "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com"
  );
  if (!res.ok) {
    throw new Error(`Failed to fetch Firebase public keys (${res.status})`);
  }
  const cacheControl = res.headers.get("cache-control") || "";
  const maxAgeMatch = /max-age=(\d+)/i.exec(cacheControl);
  const ttlSec = maxAgeMatch ? Math.max(60, Number(maxAgeMatch[1])) : 3600;
  const certs = (await res.json()) as Record<string, string>;
  cachedGoogleCerts = {
    certs,
    expiresAt: Date.now() + ttlSec * 1000,
  };
  return certs;
}

function decodeBase64UrlJson(segment: string): Record<string, unknown> {
  const padded = segment.replace(/-/g, "+").replace(/_/g, "/");
  const jsonStr = Buffer.from(padded, "base64").toString("utf8");
  const parsed = JSON.parse(jsonStr) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Invalid JWT segment");
  }
  return parsed as Record<string, unknown>;
}

async function verifyFirebaseIdToken(
  req: Request
): Promise<VerifiedFirebaseUser | null> {
  const authHeader = req.headers.authorization;
  if (typeof authHeader !== "string" || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.slice(7).trim();
  const segments = token.split(".");
  if (segments.length !== 3) return null;

  const [headerSeg, payloadSeg, sigSeg] = segments;
  if (!headerSeg || !payloadSeg || !sigSeg) return null;

  try {
    const header = decodeBase64UrlJson(headerSeg);
    const payload = decodeBase64UrlJson(payloadSeg);
    if (header.alg !== "RS256" || typeof header.kid !== "string") {
      return null;
    }

    let certs = await getFirebasePublicCerts(false);
    let pem = certs[header.kid];
    if (!pem) {
      certs = await getFirebasePublicCerts(true);
      pem = certs[header.kid];
    }
    if (!pem) return null;

    const verifier = crypto.createVerify("RSA-SHA256");
    verifier.update(`${headerSeg}.${payloadSeg}`);
    verifier.end();
    const signature = Buffer.from(
      sigSeg.replace(/-/g, "+").replace(/_/g, "/"),
      "base64"
    );
    if (!verifier.verify(pem, signature)) {
      return null;
    }

    const nowSec = Math.floor(Date.now() / 1000);
    const expectedIss = `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`;
    if (
      payload.aud !== FIREBASE_PROJECT_ID ||
      payload.iss !== expectedIss ||
      typeof payload.sub !== "string" ||
      !payload.sub.trim() ||
      typeof payload.exp !== "number" ||
      payload.exp < nowSec - 60 ||
      typeof payload.iat !== "number" ||
      payload.iat > nowSec + 300
    ) {
      return null;
    }

    const firebaseMeta =
      payload.firebase && typeof payload.firebase === "object"
        ? (payload.firebase as Record<string, unknown>)
        : {};

    return {
      uid: payload.sub.trim(),
      email: typeof payload.email === "string" ? payload.email : undefined,
      emailVerified: Boolean(payload.email_verified),
      name: typeof payload.name === "string" ? payload.name : undefined,
      picture: typeof payload.picture === "string" ? payload.picture : undefined,
      providerId:
        typeof firebaseMeta.sign_in_provider === "string"
          ? firebaseMeta.sign_in_provider
          : "google.com",
    };
  } catch {
    return null;
  }
}

// ============================================================================
// Persistent Server Telemetry & Audit Vault (.data/telemetry-vault.json)
// ============================================================================

export interface StoredAuditLogRecord {
  logId: string;
  uid: string;
  role: "user" | "admin";
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
  ipAddress: string;
  location: string;
  city?: string;
  region?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  isp?: string;
  timezone?: string;
  loggedInAtMs: number;
}

export interface StoredUserProgressRecord {
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
  recentOutcomes: unknown[];
  knowledgeChecksPassed: number;
  knowledgeChecksAttempted: number;
  quizCorrectCount: number;
  quizTotalCount: number;
  ipAddress: string;
  location: string;
  city?: string;
  region?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  isp?: string;
  timezone?: string;
  updatedAtMs: number;
}

interface TelemetryVaultData {
  auditLogs: StoredAuditLogRecord[];
  userRecords: Record<string, StoredUserProgressRecord>;
}

const DATA_DIR = path.resolve(process.cwd(), ".data");
const VAULT_FILE = path.join(DATA_DIR, "telemetry-vault.json");
const MAX_AUDIT_LOGS = 2000;
const MAX_USER_RECORDS = 1500;

let vaultState: TelemetryVaultData = loadVaultSync();
let vaultWriteQueue: Promise<void> = Promise.resolve();

function loadVaultSync(): TelemetryVaultData {
  try {
    if (fs.existsSync(VAULT_FILE)) {
      const raw = fs.readFileSync(VAULT_FILE, "utf8");
      const parsed = JSON.parse(raw) as Partial<TelemetryVaultData>;
      return {
        auditLogs: Array.isArray(parsed.auditLogs) ? parsed.auditLogs : [],
        userRecords:
          parsed.userRecords &&
          typeof parsed.userRecords === "object" &&
          !Array.isArray(parsed.userRecords)
            ? parsed.userRecords
            : {},
      };
    }
  } catch (err) {
    console.warn("Unable to read telemetry vault, starting clean:", err);
  }
  return { auditLogs: [], userRecords: {} };
}

function persistVault(): Promise<void> {
  vaultWriteQueue = vaultWriteQueue
    .catch(() => undefined)
    .then(async () => {
      await fsp.mkdir(DATA_DIR, { recursive: true });
      const tmpFile = `${VAULT_FILE}.${crypto.randomUUID()}.tmp`;
      await fsp.writeFile(tmpFile, JSON.stringify(vaultState, null, 2), "utf8");
      await fsp.rename(tmpFile, VAULT_FILE);
    });
  return vaultWriteQueue;
}

function sanitizeSafeText(val: unknown, maxLen: number): string | undefined {
  if (typeof val !== "string") return undefined;
  const trimmed = val.trim().slice(0, maxLen);
  return trimmed.length > 0 ? trimmed : undefined;
}

function sanitizeInt(val: unknown, min: number, max: number): number {
  const num = typeof val === "number" ? val : Number(val);
  if (!Number.isFinite(num)) return min;
  return Math.min(max, Math.max(min, Math.round(num)));
}

function getServerUserAgentSummary(req: Request): string {
  const ua = typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"] : "";
  if (!ua) return "Web Workstation";
  const browser = ua.includes("Edg/")
    ? "Edge"
    : ua.includes("Chrome/")
      ? "Chrome"
      : ua.includes("Firefox/")
        ? "Firefox"
        : ua.includes("Safari/")
          ? "Safari"
          : "Browser";
  const os = ua.includes("Windows")
    ? "Windows"
    : ua.includes("Mac OS")
      ? "macOS"
      : ua.includes("Linux")
        ? "Linux"
        : ua.includes("Android")
          ? "Android"
          : "Desktop";
  return `${browser} on ${os}`.slice(0, 180);
}

function appendAuditLog(entry: StoredAuditLogRecord): void {
  const filtered = vaultState.auditLogs.filter((item) => item.logId !== entry.logId);
  filtered.unshift(entry);
  filtered.sort((a, b) => b.loggedInAtMs - a.loggedInAtMs);
  vaultState.auditLogs = filtered.slice(0, MAX_AUDIT_LOGS);
}

function setSessionCookie(req: Request, res: Response, token: string): void {
  const isSecure =
    req.secure || req.headers["x-forwarded-proto"] === "https";
  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    path: "/",
    maxAge: SESSION_TTL_MS,
    sameSite: isSecure ? "none" : "lax",
    secure: isSecure,
  });
}

function clearSessionCookie(req: Request, res: Response): void {
  const isSecure =
    req.secure || req.headers["x-forwarded-proto"] === "https";
  res.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    path: "/",
    sameSite: isSecure ? "none" : "lax",
    secure: isSecure,
  });
}

async function startServer() {
  const app = express();
  app.set("trust proxy", true);
  app.use(express.json({ limit: "256kb" }));

  app.post("/api/admin/login", async (req: Request, res: Response) => {
    const clientKey = getClientKey(req);
    const now = Date.now();
    const bucket = loginAttempts.get(clientKey);
    if (bucket && bucket.resetAt > now && bucket.failures >= MAX_FAILED_ATTEMPTS) {
      res.status(429).json({
        error: "Too many failed sign-in attempts. Please wait a few minutes before retrying.",
      });
      return;
    }

    const body = (req.body || {}) as {
      username?: unknown;
      password?: unknown;
    };
    const username = typeof body.username === "string" ? body.username : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!verifyAdminCredentials(username, password)) {
      const nextBucket: RateLimitBucket =
        bucket && bucket.resetAt > now
          ? { failures: bucket.failures + 1, resetAt: bucket.resetAt }
          : { failures: 1, resetAt: now + RATE_LIMIT_WINDOW_MS };
      loginAttempts.set(clientKey, nextBucket);
      res.status(401).json({
        error: "Invalid administrator username or password.",
      });
      return;
    }

    loginAttempts.delete(clientKey);
    const expiresAt = now + SESSION_TTL_MS;
    const token = signAdminToken({
      role: "admin",
      iat: now,
      exp: expiresAt,
      jti: crypto.randomUUID(),
    });
    setSessionCookie(req, res, token);

    // Record administrator login into the audit log with exact IP & location
    try {
      const geo = await resolveClientGeo(req);
      appendAuditLog({
        logId: `admin_${now}_${crypto.randomBytes(4).toString("hex")}`,
        uid: "administrator",
        role: "admin",
        displayName: `Administrator (${username.trim().slice(0, 48)})`,
        email: "administrator@ist-lab.local",
        university: "Engineering Workbench Administration",
        department: "System Administration",
        providerId: "admin-credentials",
        emailVerified: true,
        consentGiven: true,
        consentVersion: "ADMIN_AUTH",
        userAgentSummary: getServerUserAgentSummary(req),
        ipAddress: geo.ipAddress,
        location: geo.location,
        city: geo.city,
        region: geo.region,
        country: geo.country,
        latitude: geo.latitude,
        longitude: geo.longitude,
        isp: geo.isp,
        timezone: geo.timezone,
        loggedInAtMs: now,
      });
      await persistVault();
    } catch {
      // Non-blocking audit write
    }

    res.json({
      authenticated: true,
      role: "admin",
      token,
      expiresAt,
    });
  });

  app.get("/api/admin/session", (req: Request, res: Response) => {
    const token = extractAdminToken(req);
    const payload = verifyAdminToken(token);
    if (!payload) {
      res.json({ authenticated: false });
      return;
    }
    res.json({
      authenticated: true,
      role: "admin",
      expiresAt: payload.exp,
    });
  });

  app.post("/api/admin/logout", (req: Request, res: Response) => {
    clearSessionCookie(req, res);
    res.json({ ok: true });
  });

  // Protected Admin Telemetry Routes (Credential-verified ONLY, no Google login required)
  app.get("/api/admin/audit-logs", (req: Request, res: Response) => {
    if (!requireAdminSession(req, res)) return;
    res.json({
      logs: vaultState.auditLogs,
      total: vaultState.auditLogs.length,
    });
  });

  app.get("/api/admin/users", (req: Request, res: Response) => {
    if (!requireAdminSession(req, res)) return;
    const users = Object.values(vaultState.userRecords).sort(
      (a, b) => (b.updatedAtMs || 0) - (a.updatedAtMs || 0)
    );
    res.json({
      users,
      total: users.length,
    });
  });

  app.post("/api/admin/import-legacy", async (req: Request, res: Response) => {
    if (!requireAdminSession(req, res)) return;
    const body = (req.body || {}) as {
      logs?: unknown[];
      users?: unknown[];
    };
    let changed = false;

    if (Array.isArray(body.logs)) {
      const existingIds = new Set(vaultState.auditLogs.map((l) => l.logId));
      for (const raw of body.logs.slice(0, 300)) {
        if (!raw || typeof raw !== "object") continue;
        const rec = raw as Record<string, unknown>;
        const logId = sanitizeSafeText(rec.logId, 128);
        const uid = sanitizeSafeText(rec.uid, 128);
        if (!logId || !uid || existingIds.has(logId)) continue;
        appendAuditLog({
          logId,
          uid,
          role: rec.role === "admin" ? "admin" : "user",
          displayName: sanitizeSafeText(rec.displayName, 120) || "Researcher",
          email: sanitizeSafeText(rec.email, 200) || "",
          university:
            sanitizeSafeText(rec.university, 180) ||
            "Department of Electrical Engineering",
          department: sanitizeSafeText(rec.department, 120),
          studentId: sanitizeSafeText(rec.studentId, 64),
          semester: sanitizeSafeText(rec.semester, 64),
          photoURL: sanitizeSafeText(rec.photoURL, 500),
          providerId: sanitizeSafeText(rec.providerId, 64) || "google.com",
          emailVerified: Boolean(rec.emailVerified),
          consentGiven: Boolean(rec.consentGiven),
          consentVersion: sanitizeSafeText(rec.consentVersion, 32) || "v1.0-2026",
          userAgentSummary: sanitizeSafeText(rec.userAgentSummary, 200),
          ipAddress: sanitizeSafeText(rec.ipAddress, 64) || "Unavailable",
          location: sanitizeSafeText(rec.location, 160) || "Location Not Recorded",
          loggedInAtMs:
            typeof rec.loggedInAtMs === "number" && Number.isFinite(rec.loggedInAtMs)
              ? rec.loggedInAtMs
              : Date.now(),
        });
        existingIds.add(logId);
        changed = true;
      }
    }

    if (Array.isArray(body.users)) {
      for (const raw of body.users.slice(0, 300)) {
        if (!raw || typeof raw !== "object") continue;
        const rec = raw as Record<string, unknown>;
        const uid = sanitizeSafeText(rec.uid, 128);
        if (!uid) continue;
        const current = vaultState.userRecords[uid];
        const incomingUpdated =
          typeof rec.updatedAtMs === "number" && Number.isFinite(rec.updatedAtMs)
            ? rec.updatedAtMs
            : 0;
        if (current && current.updatedAtMs >= incomingUpdated) continue;

        vaultState.userRecords[uid] = {
          uid,
          displayName: sanitizeSafeText(rec.displayName, 120) || "Researcher",
          email: sanitizeSafeText(rec.email, 200) || "",
          university:
            sanitizeSafeText(rec.university, 180) ||
            "Department of Electrical Engineering",
          department: sanitizeSafeText(rec.department, 120),
          studentId: sanitizeSafeText(rec.studentId, 64),
          semester: sanitizeSafeText(rec.semester, 64),
          photoURL: sanitizeSafeText(rec.photoURL, 500),
          providerId: sanitizeSafeText(rec.providerId, 64) || "google.com",
          consentGiven: Boolean(rec.consentGiven),
          consentAtMs:
            typeof rec.consentAtMs === "number" ? rec.consentAtMs : null,
          lastLoginAtMs:
            typeof rec.lastLoginAtMs === "number" ? rec.lastLoginAtMs : null,
          loginCount: sanitizeInt(rec.loginCount, 0, 1000000),
          correctDesignsCount: sanitizeInt(rec.correctDesignsCount, 0, 100000),
          incorrectDesignsCount: sanitizeInt(rec.incorrectDesignsCount, 0, 100000),
          correctSimulationsCount: sanitizeInt(rec.correctSimulationsCount, 0, 100000),
          incorrectSimulationsCount: sanitizeInt(rec.incorrectSimulationsCount, 0, 100000),
          totalSavedCircuits: sanitizeInt(rec.totalSavedCircuits, 0, 5000),
          esp32CompletedCount: sanitizeInt(rec.esp32CompletedCount, 0, 20),
          manualsCompletedCount: sanitizeInt(rec.manualsCompletedCount, 0, 75),
          experimentsCompletedCount: sanitizeInt(rec.experimentsCompletedCount, 0, 50),
          recentOutcomes: Array.isArray(rec.recentOutcomes)
            ? rec.recentOutcomes.slice(0, 20)
            : [],
          knowledgeChecksPassed: sanitizeInt(rec.knowledgeChecksPassed, 0, 500),
          knowledgeChecksAttempted: sanitizeInt(rec.knowledgeChecksAttempted, 0, 500),
          quizCorrectCount: sanitizeInt(rec.quizCorrectCount, 0, 5000),
          quizTotalCount: sanitizeInt(rec.quizTotalCount, 0, 5000),
          ipAddress:
            sanitizeSafeText(rec.ipAddress, 64) ||
            current?.ipAddress ||
            "Unavailable",
          location:
            sanitizeSafeText(rec.location, 160) ||
            current?.location ||
            "Location Not Recorded",
          updatedAtMs: incomingUpdated || Date.now(),
        };
        changed = true;
      }
    }

    if (changed) {
      await persistVault();
    }
    res.json({ ok: true });
  });

  // Verified User Telemetry Ingestion Routes (Firebase Auth JWT verified)
  app.post("/api/telemetry/login", async (req: Request, res: Response) => {
    const verifiedUser = await verifyFirebaseIdToken(req);
    if (!verifiedUser) {
      res.status(401).json({ error: "Valid Firebase user token required." });
      return;
    }

    const body = (req.body || {}) as Record<string, unknown>;
    if (body.consentGiven !== true) {
      res.status(400).json({ error: "Explicit consent is required." });
      return;
    }

    const geo = await resolveClientGeo(req);
    const now = Date.now();
    const logId =
      sanitizeSafeText(body.logId, 128) || `${verifiedUser.uid}_${now}`;

    const entry: StoredAuditLogRecord = {
      logId,
      uid: verifiedUser.uid,
      role: "user",
      displayName:
        sanitizeSafeText(body.displayName, 120) ||
        verifiedUser.name ||
        verifiedUser.email?.split("@")[0] ||
        "Engineering Researcher",
      email: (verifiedUser.email || sanitizeSafeText(body.email, 200) || "").slice(
        0,
        200
      ),
      university:
        sanitizeSafeText(body.university, 180) ||
        "Department of Electrical Engineering",
      department: sanitizeSafeText(body.department, 120),
      studentId: sanitizeSafeText(body.studentId, 64),
      semester: sanitizeSafeText(body.semester, 64),
      photoURL:
        sanitizeSafeText(body.photoURL, 500) ||
        sanitizeSafeText(verifiedUser.picture, 500),
      providerId: sanitizeSafeText(body.providerId, 64) || verifiedUser.providerId,
      emailVerified: verifiedUser.emailVerified,
      consentGiven: true,
      consentVersion: sanitizeSafeText(body.consentVersion, 32) || "v1.0-2026",
      userAgentSummary:
        sanitizeSafeText(body.userAgentSummary, 200) ||
        getServerUserAgentSummary(req),
      ipAddress: geo.ipAddress,
      location: geo.location,
      city: geo.city,
      region: geo.region,
      country: geo.country,
      latitude: geo.latitude,
      longitude: geo.longitude,
      isp: geo.isp,
      timezone: geo.timezone,
      loggedInAtMs: now,
    };

    appendAuditLog(entry);

    // Ensure user record also reflects latest authoritative IP & location immediately
    const existingRec = vaultState.userRecords[verifiedUser.uid];
    if (existingRec) {
      vaultState.userRecords[verifiedUser.uid] = {
        ...existingRec,
        displayName: entry.displayName,
        email: entry.email,
        university: entry.university,
        department: entry.department ?? existingRec.department,
        studentId: entry.studentId ?? existingRec.studentId,
        semester: entry.semester ?? existingRec.semester,
        photoURL: entry.photoURL ?? existingRec.photoURL,
        ipAddress: geo.ipAddress,
        location: geo.location,
        city: geo.city,
        region: geo.region,
        country: geo.country,
        latitude: geo.latitude,
        longitude: geo.longitude,
        isp: geo.isp,
        timezone: geo.timezone,
        lastLoginAtMs: now,
        updatedAtMs: now,
      };
    } else {
      vaultState.userRecords[verifiedUser.uid] = {
        uid: verifiedUser.uid,
        displayName: entry.displayName,
        email: entry.email,
        university: entry.university,
        department: entry.department,
        studentId: entry.studentId,
        semester: entry.semester,
        photoURL: entry.photoURL,
        providerId: entry.providerId,
        consentGiven: true,
        consentAtMs: now,
        lastLoginAtMs: now,
        loginCount: sanitizeInt(body.loginCount, 1, 1000000),
        correctDesignsCount: 0,
        incorrectDesignsCount: 0,
        correctSimulationsCount: 0,
        incorrectSimulationsCount: 0,
        totalSavedCircuits: 0,
        esp32CompletedCount: 0,
        manualsCompletedCount: 0,
        experimentsCompletedCount: 0,
        recentOutcomes: [],
        knowledgeChecksPassed: 0,
        knowledgeChecksAttempted: 0,
        quizCorrectCount: 0,
        quizTotalCount: 0,
        ipAddress: geo.ipAddress,
        location: geo.location,
        city: geo.city,
        region: geo.region,
        country: geo.country,
        latitude: geo.latitude,
        longitude: geo.longitude,
        isp: geo.isp,
        timezone: geo.timezone,
        updatedAtMs: now,
      };
    }

    await persistVault();
    res.json({ ok: true, geo });
  });

  app.post("/api/telemetry/user-record", async (req: Request, res: Response) => {
    const verifiedUser = await verifyFirebaseIdToken(req);
    if (!verifiedUser) {
      res.status(401).json({ error: "Valid Firebase user token required." });
      return;
    }

    const body = (req.body || {}) as Record<string, unknown>;
    if (body.consentGiven !== true) {
      res.status(400).json({ error: "Explicit consent is required." });
      return;
    }

    const geo = await resolveClientGeo(req);
    const now = Date.now();
    const prev = vaultState.userRecords[verifiedUser.uid];

    if (
      !prev &&
      Object.keys(vaultState.userRecords).length >= MAX_USER_RECORDS
    ) {
      // Evict oldest record if bounded cap reached
      const oldest = Object.values(vaultState.userRecords).sort(
        (a, b) => a.updatedAtMs - b.updatedAtMs
      )[0];
      if (oldest) delete vaultState.userRecords[oldest.uid];
    }

    vaultState.userRecords[verifiedUser.uid] = {
      uid: verifiedUser.uid,
      displayName:
        sanitizeSafeText(body.displayName, 120) ||
        prev?.displayName ||
        verifiedUser.name ||
        verifiedUser.email?.split("@")[0] ||
        "Engineering Researcher",
      email: (verifiedUser.email || prev?.email || "").slice(0, 200),
      university:
        sanitizeSafeText(body.university, 180) ||
        prev?.university ||
        "Department of Electrical Engineering",
      department: sanitizeSafeText(body.department, 120) ?? prev?.department,
      studentId: sanitizeSafeText(body.studentId, 64) ?? prev?.studentId,
      semester: sanitizeSafeText(body.semester, 64) ?? prev?.semester,
      photoURL:
        sanitizeSafeText(body.photoURL, 500) ||
        sanitizeSafeText(verifiedUser.picture, 500) ||
        prev?.photoURL,
      providerId:
        sanitizeSafeText(body.providerId, 64) ||
        verifiedUser.providerId ||
        prev?.providerId,
      consentGiven: true,
      consentAtMs:
        typeof body.consentAtMs === "number"
          ? body.consentAtMs
          : prev?.consentAtMs ?? now,
      lastLoginAtMs:
        typeof body.lastLoginAtMs === "number"
          ? body.lastLoginAtMs
          : prev?.lastLoginAtMs ?? now,
      loginCount: sanitizeInt(body.loginCount ?? prev?.loginCount ?? 1, 0, 1000000),
      correctDesignsCount: sanitizeInt(body.correctDesignsCount, 0, 100000),
      incorrectDesignsCount: sanitizeInt(body.incorrectDesignsCount, 0, 100000),
      correctSimulationsCount: sanitizeInt(body.correctSimulationsCount, 0, 100000),
      incorrectSimulationsCount: sanitizeInt(body.incorrectSimulationsCount, 0, 100000),
      totalSavedCircuits: sanitizeInt(body.totalSavedCircuits, 0, 5000),
      esp32CompletedCount: sanitizeInt(body.esp32CompletedCount, 0, 20),
      manualsCompletedCount: sanitizeInt(body.manualsCompletedCount, 0, 75),
      experimentsCompletedCount: sanitizeInt(body.experimentsCompletedCount, 0, 50),
      recentOutcomes: Array.isArray(body.recentOutcomes)
        ? body.recentOutcomes.slice(0, 20)
        : prev?.recentOutcomes || [],
      knowledgeChecksPassed: sanitizeInt(body.knowledgeChecksPassed, 0, 500),
      knowledgeChecksAttempted: sanitizeInt(body.knowledgeChecksAttempted, 0, 500),
      quizCorrectCount: sanitizeInt(body.quizCorrectCount, 0, 5000),
      quizTotalCount: sanitizeInt(body.quizTotalCount, 0, 5000),
      ipAddress: geo.ipAddress,
      location: geo.location,
      city: geo.city,
      region: geo.region,
      country: geo.country,
      latitude: geo.latitude,
      longitude: geo.longitude,
      isp: geo.isp,
      timezone: geo.timezone,
      updatedAtMs: now,
    };

    await persistVault();
    res.json({ ok: true, geo });
  });

  app.post("/api/telemetry/revoke", async (req: Request, res: Response) => {
    const verifiedUser = await verifyFirebaseIdToken(req);
    if (!verifiedUser) {
      res.status(401).json({ error: "Valid Firebase user token required." });
      return;
    }

    delete vaultState.userRecords[verifiedUser.uid];
    vaultState.auditLogs = vaultState.auditLogs.filter(
      (log) => log.uid !== verifiedUser.uid
    );
    await persistVault();
    res.json({ ok: true });
  });

  app.get("/api/client-meta", async (req: Request, res: Response) => {
    const geo = await resolveClientGeo(req);
    res.json(geo);
  });

  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({ ok: true, status: "healthy" });
  });

  if (!IS_PRODUCTION) {
    const { createServer } = await import("vite");
    const vite = await createServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), "dist");
    app.use(express.static(distDir));
    app.get("*", (_req: Request, res: Response) => {
      const indexFile = path.join(distDir, "index.html");
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send("Build output not found.");
      }
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`IST Circuit & Logic Lab listening on http://0.0.0.0:${PORT}`);
  });
}

void startServer();

