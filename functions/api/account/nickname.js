import { currentUser, json, nicknameError, nicknameIsBanned, normalizeNickname, parseJson, sameOrigin } from "../../_lib/http.js";

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return json({ error: "Request origin was not accepted." }, 403);
  if (!env.DB) return json({ error: "Accounts are not configured yet." }, 503);
  const user = await currentUser(request, env);
  if (!user) return json({ error: "Sign in to change your nickname." }, 401);
  const { value, error } = await parseJson(request, 2048);
  if (error) return json({ error }, 400);
  const nickname = String(value.nickname || "").normalize("NFKC").trim();
  const invalid = nicknameError(nickname);
  if (invalid) return json({ error: invalid }, 400);
  if (await nicknameIsBanned(env.DB, nickname)) return json({ error: "That nickname is not available. Try another." }, 400);
  try {
    await env.DB.prepare("UPDATE users SET nickname = ?, nickname_normalized = ?, updated_at = ? WHERE id = ?")
      .bind(nickname, normalizeNickname(nickname), new Date().toISOString(), user.id).run();
  } catch {
    return json({ error: "That nickname is already in use. Try another." }, 409);
  }
  return json({ nickname });
}
