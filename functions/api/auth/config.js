import { json } from "../../_lib/http.js";

export const onRequestGet = ({ env }) => json({ clientId: env.GOOGLE_CLIENT_ID || null });
