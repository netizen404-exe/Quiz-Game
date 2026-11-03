import { clearCookie, currentUser, json, makeCookie, normalizeNickname, randomToken, readCookie, sameOrigin, sha256 } from "../../_lib/http.js";

const SESSION_COOKIE = "__Host-currentish-session";
const SESSION_AGE = 60 * 60 * 24 * 30;
let jwksCache = { expires: 0, keys: [] };

function decodeBase64Url(value) {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
}

async function googleKeys() {
  if (Date.now() < jwksCache.expires && jwksCache.keys.length) return jwksCache.keys;
  const response = await fetch("https://www.googleapis.com/oauth2/v3/certs", { cf: { cacheTtl: 3600, cacheEverything: true } });
  if (!response.ok) throw new Error("Google key lookup failed");
  const data = await response.json();
  jwksCache = { keys: data.keys || [], expires: Date.now() + 60 * 60_000 };
  return jwksCache.keys;
}

async function verifyGoogleCredential(credential, clientId, nonce) {
  const parts = credential.split(".");
  if (parts.length !== 3) throw new Error("Invalid sign-in credential");
  const header = JSON.parse(new TextDecoder().decode(decodeBase64Url(parts[0])));
  const claims = JSON.parse(new TextDecoder().decode(decodeBase64Url(parts[1])));
  if (header.alg !== "RS256" || !header.kid) throw new Error("Unsupported sign-in credential");
  const keyJwk = (await googleKeys()).find((key) => key.kid === header.kid && key.kty === "RSA");
  if (!keyJwk) throw new Error("Google signing key not found");
  const key = await crypto.subtle.importKey("jwk", keyJwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  const validSignature = await crypto.subtle.verify(
    { name: "RSASSA-PKCS1-v1_5" }, key, decodeBase64Url(parts[2]), new TextEncoder().encode(`${parts[0]}.${parts[1]}`)
  );
  const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  const issuerOk = claims.iss === "accounts.google.com" || claims.iss === "https://accounts.google.com";
  const now = Date.now() / 1000;
  const expiry = Number(claims.exp);
  const issuedAt = Number(claims.iat);
  const authorizedPartyOk = !claims.azp || claims.azp === clientId;
  if (!validSignature || !issuerOk || !audiences.includes(clientId) || !authorizedPartyOk || !claims.sub || claims.nonce !== nonce || !Number.isFinite(expiry) || expiry <= now || !Number.isFinite(issuedAt) || issuedAt > now + 60) {
    throw new Error("Sign-in credential could not be verified");
  }
  return claims;
}

async function createAccount(db, googleSub, initialAdminEmail, verifiedEmail) {
  const isInitialAdmin = !!initialAdminEmail && !!verifiedEmail && verifiedEmail.toLocaleLowerCase("en") === initialAdminEmail.toLocaleLowerCase("en");
  const existing = await db.prepare("SELECT id, nickname, role, status FROM users WHERE google_sub = ?").bind(googleSub).first();
  if (existing) {
    if (existing.status !== "active") return null;
    if (isInitialAdmin && existing.role !== "admin") {
      await db.prepare("UPDATE users SET role = 'admin', updated_at = ? WHERE id = ?").bind(new Date().toISOString(), existing.id).run();
      existing.role = "admin";
    }
    return existing;
  }
  const id = crypto.randomUUID();
  const suffix = [...crypto.getRandomValues(new Uint8Array(3))].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  const nickname = `Curious-${suffix}`;
  const role = isInitialAdmin ? "admin" : "player";
  await db.prepare("INSERT INTO users (id, google_sub, nickname, nickname_normalized, role) VALUES (?, ?, ?, ?, ?)")
    .bind(id, googleSub, nickname, normalizeNickname(nickname), role).run();
  return { id, nickname, role, status: "active" };
}

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return json({ error: "Request origin was not accepted." }, 403);
  if (!env.DB || !env.GOOGLE_CLIENT_ID) return json({ error: "Sign-in is not configured yet." }, 503);
  const nonce = readCookie(request, "currentish_login_nonce");
  if (!nonce) return json({ error: "Sign-in expired. Please try again." }, 401, { "Set-Cookie": clearCookie("currentish_login_nonce", request, "/api/auth") });
  let body;
  try { body = await request.json(); } catch { return json({ error: "Invalid request." }, 400); }
  if (typeof body.credential !== "string" || body.credential.length > 16_000) return json({ error: "Sign-in credential is missing or too large." }, 400);

  try {
    const nonceRow = await env.DB.prepare("SELECT state FROM oauth_states WHERE state = ? AND expires_at > ?").bind(nonce, new Date().toISOString()).first();
    if (!nonceRow) return json({ error: "Sign-in expired. Please try again." }, 401);
    await env.DB.prepare("DELETE FROM oauth_states WHERE state = ?").bind(nonce).run();
    const claims = await verifyGoogleCredential(body.credential, env.GOOGLE_CLIENT_ID, nonce);
    const user = await createAccount(env.DB, claims.sub, env.INITIAL_ADMIN_EMAIL, claims.email_verified === true ? claims.email : null);
    if (!user) return json({ error: "This account is disabled. Contact the quiz administrator." }, 403);

    const sessionToken = randomToken(32);
    const tokenHash = await sha256(sessionToken);
    const expiresAt = new Date(Date.now() + SESSION_AGE * 1000).toISOString();
    await env.DB.prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)").bind(tokenHash, user.id, expiresAt).run();
    return json({ user: { id: user.id, nickname: user.nickname, role: user.role } }, 200, {
      "Set-Cookie": makeCookie(SESSION_COOKIE, sessionToken, request, SESSION_AGE)
    });
  } catch (error) {
    console.error("Google sign-in failed", error?.message || "unknown error");
    return json({ error: "Could not verify sign-in. Please try again." }, 401, { "Set-Cookie": clearCookie("currentish_login_nonce", request, "/api/auth") });
  }
}

export async function onRequestGet({ request, env }) {
  const user = await currentUser(request, env);
  if (!user) return json({ user: null });
  return json({ user: { id: user.id, nickname: user.nickname, role: user.role } });
}
