// GET  /api/questions?voter=<匿名ID>  … 公開中のお題と集計、自分の回答
// POST /api/questions                  … お題を投稿（AIチェックを通ったものだけ保存）

import { json, err, ipHash, allow, clean } from "../../lib/util.js";
import { moderate } from "../../lib/moderate.js";

export async function onRequestGet({ request, env }) {
  const voter = new URL(request.url).searchParams.get("voter") || "";
  const [qs, tallies, mine] = await Promise.all([
    env.DB.prepare(
      "SELECT id, text, choices, created_at FROM questions WHERE hidden = 0 ORDER BY created_at DESC LIMIT 500"
    ).all(),
    env.DB.prepare("SELECT question_id, choice, COUNT(*) AS n FROM votes GROUP BY question_id, choice").all(),
    voter
      ? env.DB.prepare("SELECT question_id, choice FROM votes WHERE voter_id = ?").bind(voter).all()
      : Promise.resolve({ results: [] }),
  ]);

  const counts = {};
  for (const t of tallies.results) (counts[t.question_id] ||= {})[t.choice] = t.n;
  const my = {};
  for (const v of mine.results) my[v.question_id] = v.choice;

  const questions = qs.results.map((q) => {
    const choices = JSON.parse(q.choices);
    return {
      id: q.id,
      text: q.text,
      choices,
      createdAt: q.created_at,
      counts: choices.map((_, i) => counts[q.id]?.[i] ?? 0),
    };
  });
  return json({ questions, mine: my });
}

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return err("送信内容を読めませんでした。");
  }
  const text = clean(body.text);
  const choices = Array.isArray(body.choices) ? body.choices.map(clean).filter(Boolean) : [];

  if (!text) return err("質問を入れてください。");
  if (text.length > 80) return err("質問は80文字までです。");
  if (choices.length < 2 || choices.length > 6) return err("選択肢は2〜6個にしてください。");
  if (choices.some((c) => c.length > 30)) return err("選択肢は1つ30文字までです。");
  if (new Set(choices).size !== choices.length) return err("同じ選択肢が重なっています。");

  const hash = await ipHash(request, env);
  const perHour = Number(env.POSTS_PER_HOUR || 5);
  if (!(await allow(env, hash, "post", perHour, 3600000))) {
    return err(`投稿は1時間に${perHour}回までです。少し時間をおいてください。`, 429);
  }

  let verdict;
  try {
    verdict = await moderate(env, text, choices);
  } catch (e) {
    console.error(e);
    return err("AIチェックに失敗しました。少し待ってからもう一度送ってください。", 503);
  }
  if (!verdict.ok) return json({ ok: false, reason: verdict.reason || "この内容は載せられません。表現を変えてみてください。" });

  const id = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  await env.DB.prepare(
    "INSERT INTO questions (id, text, choices, created_at, ip_hash) VALUES (?, ?, ?, ?, ?)"
  ).bind(id, text, JSON.stringify(choices), Date.now(), hash).run();
  return json({ ok: true, id });
}
