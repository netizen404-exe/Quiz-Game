export function json(data, status = 200, extraHeaders = {}) {
  const headers = extraHeaders instanceof Headers ? new Headers(extraHeaders) : new Headers(extraHeaders);
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("Cache-Control", "no-store");
  return new Response(JSON.stringify(data), { status, headers });
}

export function readCookie(request, name) {
  const cookie = request.headers.get("Cookie") || "";
  for (const part of cookie.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0) continue;
    if (part.slice(0, separator).trim() === name) return decodeURIComponent(part.slice(separator + 1).trim());
  }
  return null;
}

export function makeCookie(name, value, request, maxAge, path = "/") {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${name}=${encodeURIComponent(value)}; HttpOnly; Path=${path}; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

export function clearCookie(name, request, path = "/") {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${name}=; HttpOnly; Path=${path}; SameSite=Lax; Max-Age=0${secure}`;
}

export async function sha256(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function randomToken(size = 32) {
  const bytes = crypto.getRandomValues(new Uint8Array(size));
  return btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

export function sameOrigin(request) {
  const origin = request.headers.get("Origin");
  return !!origin && origin === new URL(request.url).origin;
}

export async function currentUser(request, env) {
  const token = readCookie(request, "__Host-currentish-session");
  if (!token || !env.DB) return null;
  const tokenHash = await sha256(token);
  return env.DB.prepare(`
    SELECT users.id, users.nickname, users.role, users.status
    FROM sessions JOIN users ON users.id = sessions.user_id
    WHERE sessions.token_hash = ? AND sessions.expires_at > strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      AND users.status = 'active'
  `).bind(tokenHash).first();
}

export async function requireAdmin(request, env) {
  const user = await currentUser(request, env);
  return user?.role === "admin" ? user : null;
}

export function normalizeNickname(value) {
  return String(value || "")
    .normalize("NFKC")
    .toLocaleLowerCase("en")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]/gu, "");
}

export function nicknameError(value) {
  const name = String(value || "").normalize("NFKC").trim();
  const length = [...name].length;
  if (length < 3 || length > 18) return "Choose a nickname between 3 and 18 characters.";
  if (!/^[\p{L}\p{N} _-]+$/u.test(name)) return "Use letters, numbers, spaces, hyphens, or underscores.";
  if (!/[\p{L}\p{N}]/u.test(name)) return "Include at least one letter or number.";
  return null;
}

export async function nicknameIsBanned(db, value) {
  const normalized = normalizeNickname(value);
  if (!normalized) return true;
  const { results } = await db.prepare("SELECT phrase_normalized FROM banned_names").all();
  return results.some(({ phrase_normalized: banned }) => banned && normalized.includes(banned));
}

export async function parseJson(request, maximumBytes = 16_384) {
  const contentType = request.headers.get("Content-Type") || "";
  if (!contentType.toLowerCase().includes("application/json")) return { error: "Send JSON." };
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > maximumBytes) return { error: "Request is too large." };
  try { return { value: JSON.parse(raw) }; }
  catch { return { error: "Invalid JSON." }; }
}
