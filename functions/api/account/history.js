import { currentUser, json } from "../../_lib/http.js";

export async function onRequestGet({ request, env }) {
  if (!env.DB) return json({ error: "Accounts are not configured yet." }, 503);
  const user = await currentUser(request, env);
  if (!user) return json({ error: "Sign in to view your history." }, 401);
  const { results } = await env.DB.prepare(`
    SELECT correct_count AS correct, question_count AS total, completed_at AS completedAt
    FROM quiz_runs WHERE user_id = ? ORDER BY completed_at DESC LIMIT 50
  `).bind(user.id).all();
  return json({ history: results });
}
