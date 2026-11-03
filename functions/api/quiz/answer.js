import { json, parseJson, sameOrigin, sha256 } from "../../_lib/http.js";

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return json({ error: "Request origin was not accepted." }, 403);
  if (!env.DB) return json({ error: "Live quizzes are not configured yet." }, 503);
  const parsed = await parseJson(request, 4096);
  if (parsed.error) return json({ error: parsed.error }, 400);
  const { sessionId, token, questionId } = parsed.value;
  const answer = Number(parsed.value.answer);
  if (typeof sessionId !== "string" || typeof token !== "string" || typeof questionId !== "string" || !Number.isInteger(answer) || answer < 0 || answer > 3) {
    return json({ error: "The answer request is incomplete." }, 400);
  }
  const session = await env.DB.prepare(`
    SELECT id FROM quiz_sessions WHERE id = ? AND token_hash = ? AND status = 'active' AND expires_at > ?
  `).bind(sessionId, await sha256(token), new Date().toISOString()).first();
  if (!session) return json({ error: "This quiz session has expired." }, 410);
  const row = await env.DB.prepare(`
    SELECT sq.position, sq.answered, q.correct_index, q.explanation, q.source_title, q.source_url,
      q.source2_title, q.source2_url, q.source_published_at
    FROM quiz_session_questions sq JOIN questions q ON q.id = sq.question_id
    WHERE sq.session_id = ? AND sq.question_id = ?
  `).bind(sessionId, questionId).first();
  if (!row) return json({ error: "That question is not part of this quiz." }, 404);
  if (row.answered) return json({ error: "You have already answered this question." }, 409);
  const next = await env.DB.prepare(`SELECT MIN(position) AS position FROM quiz_session_questions WHERE session_id = ? AND answered = 0`).bind(sessionId).first();
  if (next?.position !== row.position) return json({ error: "Answer the questions in order." }, 409);
  const isCorrect = answer === row.correct_index;
  const update = await env.DB.prepare(`
    UPDATE quiz_session_questions SET answered = 1, was_correct = ? WHERE session_id = ? AND question_id = ? AND answered = 0
  `).bind(isCorrect ? 1 : 0, sessionId, questionId).run();
  if (update.meta?.changes !== 1) return json({ error: "This answer has already been submitted." }, 409);
  await env.DB.prepare("UPDATE quiz_sessions SET answered_count = answered_count + 1 WHERE id = ? AND status = 'active'").bind(sessionId).run();
  return json({
    correct: isCorrect, correctIndex: row.correct_index, explanation: row.explanation,
    source: row.source_title, sourceUrl: row.source_url, source2Title: row.source2_title,
    source2Url: row.source2_url, date: row.source_published_at
  });
}
