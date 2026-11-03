import { currentUser, json, parseJson, sameOrigin, sha256 } from "../../_lib/http.js";

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return json({ error: "Request origin was not accepted." }, 403);
  if (!env.DB) return json({ error: "Accounts are not configured yet." }, 503);
  const user = await currentUser(request, env);
  if (!user) return json({ error: "Sign in to save this score." }, 401);
  const parsed = await parseJson(request, 2048);
  if (parsed.error) return json({ error: parsed.error }, 400);
  const { sessionId, token } = parsed.value;
  if (typeof sessionId !== "string" || typeof token !== "string") return json({ error: "The quiz session is incomplete." }, 400);
  const session = await env.DB.prepare(`SELECT id, status, user_id FROM quiz_sessions WHERE id = ? AND token_hash = ?`)
    .bind(sessionId, await sha256(token)).first();
  if (!session || session.status !== "completed") return json({ error: "This completed quiz could not be found." }, 404);
  if (session.user_id && session.user_id !== user.id) return json({ error: "This quiz is already linked to another account." }, 409);
  await env.DB.batch([
    env.DB.prepare("UPDATE quiz_sessions SET user_id = ? WHERE id = ? AND user_id IS NULL").bind(user.id, sessionId),
    env.DB.prepare("UPDATE quiz_runs SET user_id = ? WHERE session_id = ? AND user_id IS NULL").bind(user.id, sessionId)
  ]);
  const stats = await env.DB.prepare(`
    SELECT correct_count AS correct, question_count AS total,
      CAST(ROUND(100.0 * correct_count / question_count, 0) AS INTEGER) AS percent,
      COUNT(*) OVER () AS gamesPlayed
    FROM quiz_runs WHERE user_id = ? ORDER BY percent DESC, total DESC, completed_at ASC LIMIT 1
  `).bind(user.id).first();
  if (stats) {
    await env.DB.prepare(`
      INSERT INTO user_best_scores (user_id, best_percent, best_correct, best_question_count, games_played, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        best_percent = excluded.best_percent,
        best_correct = excluded.best_correct,
          best_question_count = excluded.best_question_count,
        games_played = excluded.games_played,
        updated_at = excluded.updated_at
    `).bind(user.id, stats.percent, stats.correct, stats.total, stats.gamesPlayed, new Date().toISOString()).run();
  }
  const best = await env.DB.prepare("SELECT best_percent, best_question_count FROM user_best_scores WHERE user_id = ?").bind(user.id).first();
  const above = best ? await env.DB.prepare(`
    SELECT COUNT(*) AS count FROM user_best_scores
    WHERE best_percent > ? OR (best_percent = ? AND best_question_count > ?)
  `).bind(best.best_percent, best.best_percent, best.best_question_count).first() : { count: 0 };
  return json({ saved: true, rank: Number(above.count) + 1 });
}
