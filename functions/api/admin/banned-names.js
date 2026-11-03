import { json, normalizeNickname, parseJson, requireAdmin, sameOrigin } from "../../_lib/http.js";

export async function onRequestGet({ request, env }) {
  if (!env.DB) return json({ error: "Admin tools are not configured yet." }, 503);
  const admin = await requireAdmin(request, env);
  if (!admin) return json({ error: "Admin access required." }, 403);
  const { results } = await env.DB.prepare("SELECT id, phrase, created_at AS createdAt FROM banned_names ORDER BY phrase_normalized").all();
  return json({ bannedNames: results });
}

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return json({ error: "Request origin was not accepted." }, 403);
  if (!env.DB) return json({ error: "Admin tools are not configured yet." }, 503);
  const admin = await requireAdmin(request, env);
  if (!admin) return json({ error: "Admin access required." }, 403);
  const parsed = await parseJson(request, 2048);
  if (parsed.error) return json({ error: parsed.error }, 400);
  const phrase = String(parsed.value.phrase || "").normalize("NFKC").trim();
  const phraseNormalized = normalizeNickname(phrase);
  if ([...phrase].length < 2 || [...phrase].length > 32 || !phraseNormalized) return json({ error: "Enter a banned term between 2 and 32 characters." }, 400);
  const id = crypto.randomUUID();
  try {
    await env.DB.prepare("INSERT INTO banned_names (id, phrase, phrase_normalized, created_by) VALUES (?, ?, ?, ?)")
      .bind(id, phrase, phraseNormalized, admin.id).run();
  } catch {
    return json({ error: "That term is already blocked." }, 409);
  }
  return json({ id, phrase }, 201);
}
