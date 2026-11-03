import { json, makeCookie, randomToken } from "../../_lib/http.js";

export async function onRequestGet({ request, env }) {
  if (!env.DB) return json({ error: "Sign-in is not configured yet." }, 503);
  const nonce = randomToken(32);
  const expiresAt = new Date(Date.now() + 5 * 60_000).toISOString();
  const now = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare("DELETE FROM oauth_states WHERE expires_at <= ?").bind(now),
    env.DB.prepare("DELETE FROM sessions WHERE expires_at <= ?").bind(now),
    env.DB.prepare("UPDATE quiz_sessions SET status = 'expired' WHERE status = 'active' AND expires_at <= ?").bind(now)
  ]);
  await env.DB.prepare("INSERT INTO oauth_states (state, nonce, code_verifier, expires_at) VALUES (?, ?, '', ?)")
    .bind(nonce, nonce, expiresAt).run();
  return json({ nonce }, 200, { "Set-Cookie": makeCookie("currentish_login_nonce", nonce, request, 300, "/api/auth") });
}
