// 共通ヘルパー

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

export function err(message, status = 400) {
  return json({ error: message }, status);
}

export async function ipHash(request, env) {
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const data = new TextEncoder().encode((env.HASH_SALT || "minna-taku") + ":" + ip);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(buf)].slice(0, 12).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// 一定時間内の回数を数え、上限を超えたら false を返す
export async function allow(env, hash, action, limit, windowMs) {
  const now = Date.now();
  const row = await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM hits WHERE ip_hash = ? AND action = ? AND ts > ?"
  ).bind(hash, action, now - windowMs).first();
  if ((row?.n ?? 0) >= limit) return false;
  await env.DB.batch([
    env.DB.prepare("INSERT INTO hits (ip_hash, action, ts) VALUES (?, ?, ?)").bind(hash, action, now),
    // 古い記録の掃除（1日以上前）
    env.DB.prepare("DELETE FROM hits WHERE ts < ?").bind(now - 86400000),
  ]);
  return true;
}

export const clean = (s) => String(s ?? "").replace(/\s+/g, " ").trim();
export const isId = (s) => typeof s === "string" && /^[A-Za-z0-9_-]{4,64}$/.test(s);
