import { currentUser, json, parseJson, sameOrigin, sha256 } from "../../_lib/http.js";

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return json({ error: "Request origin was not accepted." }, 403);
  if (!env.DB) return json({ error: "Live quizzes are not configured yet." }, 503);
  const parsed = await parseJson(request, 2048);
  if (parsed.error) return json({ error: parsed.error }, 400);
  const { sessionId, token } = parsed.value;
  if (typeof sessionId !== "string" || typeof token !== "string") return json({ error: "The quiz session is incomplete." }, 400);
  const tokenHash = await sha256(token);
  const session = await env.DB.prepare("SELECT id, question_count, score, status, user_id FROM quiz_sessions WHERE id = ? AND token_hash = ? AND expires_at > ?")
    .bind(sessionId, tokenHash, new Date().toISOString()).first();
  if (!session) return json({ error: "This quiz session has expired." }, 410);
  if (session.status === "active") {
    const counts = await env.DB.prepare(`
      SELECT COUNT(*) AS answered, COALESCE(SUM(was_correct), 0) AS score
      FROM quiz_session_questions WHERE session_id = ? AND answered = 1
    `).bind(sessionId).first();
    if (counts.answered !== session.question_count) return json({ error: "Finish every question before submitting your score." }, 409);
    const score = Number(counts.score);
    const finishedAt = new Date().toISOString();
    const user = await currentUser(request, env);
    const userId = session.user_id || user?.id || null;
    const statements = [
      env.DB.prepare(`UPDATE quiz_sessions SET status = 'completed', score = ?, answered_count = ?, completed_at = ?, user_id = COALESCE(user_id, ?) WHERE id = ? AND status = 'active'`)
        .bind(score, counts.answered, finishedAt, userId, sessionId),
      env.DB.prepare(`INSERT OR IGNORE INTO quiz_runs (id, session_id, user_id, question_count, correct_count, completed_at) SELECT ?, ?, ?, ?, ?, ? FROM quiz_sessions WHERE id = ? AND status = 'completed'`)
        .bind(crypto.randomUUID(), sessionId, userId, session.question_count, score, finishedAt, sessionId)
    ];
    if (userId) {
      statements.push(env.DB.prepare(`
        INSERT INTO user_best_scores (user_id, best_percent, best_correct, best_question_count, games_played, updated_at)
        SELECT ?, CAST(ROUND(100.0 * ? / ?, 0) AS INTEGER), ?, ?, COUNT(*), ?
        FROM quiz_runs WHERE user_id = ?
        ON CONFLICT(user_id) DO UPDATE SET
          best_percent = MAX(user_best_scores.best_percent, excluded.best_percent),
          best_correct = CASE WHEN excluded.best_percent > user_best_scores.best_percent OR (excluded.best_percent = user_best_scores.best_percent AND excluded.best_question_count > user_best_scores.best_question_count) THEN excluded.best_correct ELSE user_best_scores.best_correct END,
          best_question_count = CASE WHEN excluded.best_percent > user_best_scores.best_percent OR (excluded.best_percent = user_best_scores.best_percent AND excluded.best_question_count > user_best_scores.best_question_count) THEN excluded.best_question_count ELSE user_best_scores.best_question_count END,
          games_played = excluded.games_played,
          updated_at = excluded.updated_at
      `).bind(userId, score, session.question_count, score, session.question_count, finishedAt, userId));
    }
    await env.DB.batch(statements);
  }
  const completed = await env.DB.prepare("SELECT question_count, score, user_id, status FROM quiz_sessions WHERE id = ?").bind(sessionId).first();
  if (!completed || completed.status === "active") return json({ error: "Could not save the quiz score." }, 500);
  const percent = Math.round(100 * completed.score / completed.question_count);
  let rankPercent = percent;
  let rankTotal = completed.question_count;
  if (completed.user_id) {
    const best = await env.DB.prepare("SELECT best_percent, best_question_count FROM user_best_scores WHERE user_id = ?").bind(completed.user_id).first();
    if (best) { rankPercent = best.best_percent; rankTotal = best.best_question_count; }
  }
  const above = await env.DB.prepare(`
    SELECT COUNT(*) AS count FROM user_best_scores
    WHERE best_percent > ? OR (best_percent = ? AND best_question_count > ?)
  `).bind(rankPercent, rankPercent, rankTotal).first();
  const user = await currentUser(request, env);
  return json({ score: completed.score, total: completed.question_count, percent, rank: Number(above.count) + 1, saved: !!completed.user_id || !!user });
}
