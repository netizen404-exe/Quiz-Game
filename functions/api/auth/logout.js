import { clearCookie, json, readCookie, sameOrigin, sha256 } from "../../_lib/http.js";

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return json({ error: "Request origin was not accepted." }, 403);
  const token = readCookie(request, "__Host-currentish-session");
  if (token && env.DB) await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(await sha256(token)).run();
  return json({ ok: true }, 200, { "Set-Cookie": clearCookie("__Host-currentish-session", request) });
}
