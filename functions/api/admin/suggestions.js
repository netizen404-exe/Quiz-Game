import { json, parseJson, requireAdmin, sameOrigin } from "../../_lib/http.js";

export async function onRequestGet({ request, env }) {
  if (!env.DB) return json({ error: "Review tools are not configured yet." }, 503);
  const admin = await requireAdmin(request, env);
  if (!admin) return json({ error: "Admin access required." }, 403);
  const { results } = await env.DB.prepare(`
    SELECT q.id, q.category, q.prompt, q.context, q.options_json AS optionsJson,
      q.correct_index AS correctIndex, q.explanation, q.source_title AS sourceTitle,
      q.source_url AS sourceUrl, q.source2_title AS source2Title, q.source2_url AS source2Url,
      q.requires_second_source AS requiresSecondSource, q.source_published_at AS sourcePublishedAt,
      q.created_at AS createdAt, s.publisher, s.title AS storyTitle, s.canonical_url AS storyUrl
    FROM questions q LEFT JOIN stories s ON s.id = q.story_id
    WHERE q.status = 'suggested' ORDER BY q.created_at ASC LIMIT 100
  `).all();
  const active = await env.DB.prepare(`
    SELECT id, category, prompt, source_title AS sourceTitle, source_url AS sourceUrl,
      stale_at AS staleAt, reviewed_at AS reviewedAt, ai_review_due_at AS aiReviewDueAt,
      ai_reviewed_at AS aiReviewedAt, ai_review_action AS aiReviewAction, ai_review_note AS aiReviewNote
    FROM questions WHERE status = 'approved'
    ORDER BY CASE WHEN stale_at IS NULL THEN 1 ELSE 0 END, stale_at ASC, reviewed_at DESC
    LIMIT 200
  `).all();
  return json({
    suggestions: results.map((row) => ({ ...row, options: JSON.parse(row.optionsJson) })),
    activeQuestions: active.results
  });
}

export async function onRequestPatch({ request, env }) {
  if (!sameOrigin(request)) return json({ error: "Request origin was not accepted." }, 403);
  if (!env.DB) return json({ error: "Review tools are not configured yet." }, 503);
  const admin = await requireAdmin(request, env);
  if (!admin) return json({ error: "Admin access required." }, 403);
  const parsed = await parseJson(request, 8192);
  if (parsed.error) return json({ error: parsed.error }, 400);
  const body = parsed.value;
  if (typeof body.id !== "string") return json({ error: "Choose a suggestion." }, 400);
  if (body.action === "edit") {
    const question = String(body.prompt || "").trim();
    const context = String(body.context || "").trim();
    const explanation = String(body.explanation || "").trim();
    const category = String(body.category || "").trim();
    const source2Title = String(body.source2Title || "").trim();
    const source2Url = String(body.source2Url || "").trim();
    const requiresSecondSource = body.requiresSecondSource === true ? 1 : 0;
    const options = body.options;
    const correctIndex = Number(body.correctIndex);
    if (question.length < 12 || question.length > 300 || context.length > 500 || explanation.length < 20 || explanation.length > 900 || category.length < 2 || category.length > 60) {
      return json({ error: "Check the question, context, category, and explanation lengths." }, 400);
    }
    if (!Array.isArray(options) || options.length !== 4 || options.some((option) => typeof option !== "string" || !option.trim() || option.length > 180) || new Set(options.map((option) => option.trim().toLocaleLowerCase("en"))).size !== 4 || !Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex > 3) {
      return json({ error: "Add four distinct answer options and select the correct answer." }, 400);
    }
    if (!!source2Title !== !!source2Url || source2Title.length > 180 || source2Url.length > 1000) return json({ error: "Add both the second source title and its link, or leave both blank." }, 400);
    if (source2Url) { try { if (new URL(source2Url).protocol !== "https:") throw new Error(); } catch { return json({ error: "The second source link must be a valid HTTPS URL." }, 400); } }
    const result = await env.DB.prepare(`
      UPDATE questions SET category = ?, prompt = ?, context = ?, options_json = ?, correct_index = ?, explanation = ?, source2_title = ?, source2_url = ?, requires_second_source = ?, updated_at = ?
      WHERE id = ? AND status = 'suggested'
    `).bind(category, question, context, JSON.stringify(options), correctIndex, explanation, source2Title || null, source2Url || null, requiresSecondSource, new Date().toISOString(), body.id).run();
    if (result.meta?.changes !== 1) return json({ error: "That suggestion is no longer awaiting review." }, 404);
    return json({ id: body.id, status: "suggested" });
  }
  if (!["approve", "reject", "retire"].includes(body.action)) return json({ error: "Choose a valid review action." }, 400);
  const nextStatus = body.action === "approve" ? "approved" : body.action === "reject" ? "rejected" : "retired";
  if (body.action === "approve") {
    const question = await env.DB.prepare("SELECT requires_second_source, source2_url FROM questions WHERE id = ? AND status = 'suggested'").bind(body.id).first();
    if (question?.requires_second_source && !question.source2_url) return json({ error: "Add a second reliable source before approving this question." }, 409);
  }
  const reviewedAt = new Date().toISOString();
  const firstAiReviewDueAt = new Date(Date.now() + 3 * 24 * 60 * 60_000).toISOString();
  const result = await env.DB.prepare(`
    UPDATE questions SET status = ?, reviewed_by = ?, reviewed_at = ?, updated_at = ?,
      ai_review_due_at = CASE WHEN ? = 'approved' THEN ? ELSE ai_review_due_at END
    WHERE id = ? AND status IN ('suggested', 'approved')
  `).bind(nextStatus, admin.id, reviewedAt, reviewedAt, nextStatus, firstAiReviewDueAt, body.id).run();
  if (result.meta?.changes !== 1) return json({ error: "That suggestion is no longer awaiting review." }, 404);
  return json({ id: body.id, status: nextStatus });
}
