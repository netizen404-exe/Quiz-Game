import { json } from "../_lib/http.js";

export async function onRequestGet({ env }) {
  if (!env.DB) return json({ leaderboard: [], preview: true });
  const { results } = await env.DB.prepare(`
    SELECT users.nickname, user_best_scores.best_percent AS percent,
      user_best_scores.best_correct AS correct,
      user_best_scores.best_question_count AS total,
      user_best_scores.games_played AS gamesPlayed
    FROM user_best_scores JOIN users ON users.id = user_best_scores.user_id
    WHERE users.status = 'active'
    ORDER BY user_best_scores.best_percent DESC, user_best_scores.best_question_count DESC, user_best_scores.updated_at ASC
    LIMIT 100
  `).all();
  let previousPercent = null;
  let rank = 0;
  const leaderboard = results.map((row, index) => {
    if (row.percent !== previousPercent) rank = index + 1;
    previousPercent = row.percent;
    return { rank, nickname: row.nickname, percent: row.percent, correct: row.correct, total: row.total, gamesPlayed: row.gamesPlayed };
  });
  return json({ leaderboard, preview: false });
}
