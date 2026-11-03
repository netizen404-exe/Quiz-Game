import { json, normalizeNickname, nicknameError, nicknameIsBanned, parseJson, requireAdmin, sameOrigin } from "../../_lib/http.js";

export async function onRequestGet({ request, env }) {
  if (!env.DB) return json({ error: "Admin tools are not configured yet." }, 503);
  const admin = await requireAdmin(request, env);
  if (!admin) return json({ error: "Admin access required." }, 403);
  const { results } = await env.DB.prepare(`
    SELECT u.id, u.nickname, u.status, u.role, u.created_at AS createdAt,
      COALESCE(s.games_played, 0) AS gamesPlayed, s.best_percent AS bestPercent
    FROM users u LEFT JOIN user_best_scores s ON s.user_id = u.id
    ORDER BY u.created_at DESC LIMIT 200
  `).all();
  return json({ users: results });
}

export async function onRequestPatch({ request, env }) {
  if (!sameOrigin(request)) return json({ error: "Request origin was not accepted." }, 403);
  if (!env.DB) return json({ error: "Admin tools are not configured yet." }, 503);
  const admin = await requireAdmin(request, env);
  if (!admin) return json({ error: "Admin access required." }, 403);
  const parsed = await parseJson(request, 4096);
  if (parsed.error) return json({ error: parsed.error }, 400);
  const { userId, action } = parsed.value;
  if (typeof userId !== "string" || !["rename", "disable", "enable"].includes(action)) return json({ error: "Choose a user and a valid moderation action." }, 400);
  if (userId === admin.id && action === "disable") return json({ error: "You cannot disable your own admin account." }, 400);
  if (action === "disable" || action === "enable") {
    const status = action === "disable" ? "disabled" : "active";
    const result = await env.DB.prepare("UPDATE users SET status = ?, updated_at = ? WHERE id = ?")
      .bind(status, new Date().toISOString(), userId).run();
    if (result.meta?.changes !== 1) return json({ error: "Account not found." }, 404);
    return json({ userId, status });
  }
  const nickname = String(parsed.value.nickname || "").normalize("NFKC").trim();
  const invalid = nicknameError(nickname);
  if (invalid) return json({ error: invalid }, 400);
  if (await nicknameIsBanned(env.DB, nickname)) return json({ error: "That nickname is on the banned-name list." }, 400);
  try {
    const result = await env.DB.prepare("UPDATE users SET nickname = ?, nickname_normalized = ?, updated_at = ? WHERE id = ?")
      .bind(nickname, normalizeNickname(nickname), new Date().toISOString(), userId).run();
    if (result.meta?.changes !== 1) return json({ error: "Account not found." }, 404);
  } catch {
    return json({ error: "That nickname is already in use." }, 409);
  }
  return json({ userId, nickname });
}
