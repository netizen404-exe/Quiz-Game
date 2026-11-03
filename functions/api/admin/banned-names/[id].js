import { json, requireAdmin, sameOrigin } from "../../../_lib/http.js";

export async function onRequestDelete({ request, env, params }) {
  if (!sameOrigin(request)) return json({ error: "Request origin was not accepted." }, 403);
  if (!env.DB) return json({ error: "Admin tools are not configured yet." }, 503);
  const admin = await requireAdmin(request, env);
  if (!admin) return json({ error: "Admin access required." }, 403);
  const result = await env.DB.prepare("DELETE FROM banned_names WHERE id = ?").bind(params.id).run();
  return json({ deleted: result.meta?.changes === 1 });
}
