import { currentUser, json, parseJson, randomToken, sameOrigin, sha256 } from "../../_lib/http.js";

function publicQuestion(row) {
  return {
    id: row.id, category: row.category, prompt: row.prompt, context: row.context,
    options: JSON.parse(row.options_json), source: row.source_title,
    sourceUrl: row.source_url, date: row.source_published_at
  };
}

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return json({ error: "Request origin was not accepted." }, 403);
  if (!env.DB) return json({ error: "Live quizzes are not configured yet." }, 503);
  const parsed = await parseJson(request, 1024);
  if (parsed.error) return json({ error: parsed.error }, 400);
  const length = Number(parsed.value.length);
  if (![3, 5, 10].includes(length)) return json({ error: "Choose a 3, 5, or 10 question quiz." }, 400);
  const { results } = await env.DB.prepare(`
    SELECT id, category, prompt, context, options_json, source_title, source_url, source_published_at
    FROM questions WHERE status = 'approved' AND (stale_at IS NULL OR stale_at > ?)
    ORDER BY random() LIMIT ?
  `).bind(new Date().toISOString(), length).all();
  if (results.length < length) return json({ error: `There are not enough approved questions for a ${length} question quiz yet.` }, 409);

  const user = await currentUser(request, env);
  const sessionId = crypto.randomUUID();
  const sessionToken = randomToken(32);
  const tokenHash = await sha256(sessionToken);
  const expiresAt = new Date(Date.now() + 2 * 60 * 60_000).toISOString();
  const statements = [
    env.DB.prepare(`INSERT INTO quiz_sessions (id, token_hash, user_id, question_count, expires_at) VALUES (?, ?, ?, ?, ?)`)
      .bind(sessionId, tokenHash, user?.id || null, length, expiresAt),
    ...results.map((question, position) => env.DB.prepare(`INSERT INTO quiz_session_questions (session_id, question_id, position) VALUES (?, ?, ?)`)
      .bind(sessionId, question.id, position))
  ];
  await env.DB.batch(statements);
  return json({ sessionId, token: sessionToken, questions: results.map(publicQuestion) });
}
