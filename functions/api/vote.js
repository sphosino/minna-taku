// POST /api/vote  { questionId, choice, voter }  … 1人1票（あとから変更可）

import { json, err, ipHash, allow, isId } from "../../lib/util.js";

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return err("送信内容を読めませんでした。");
  }
  const { questionId, choice, voter } = body;
  if (!isId(questionId) || !isId(voter) || !Number.isInteger(choice)) return err("投票内容が正しくありません。");

  const q = await env.DB.prepare("SELECT choices FROM questions WHERE id = ? AND hidden = 0").bind(questionId).first();
  if (!q) return err("このお題は見つかりませんでした。", 404);
  if (choice < 0 || choice >= JSON.parse(q.choices).length) return err("選択肢が正しくありません。");

  const hash = await ipHash(request, env);
  if (!(await allow(env, hash, "vote", 120, 60000))) return err("投票が速すぎます。少し待ってください。", 429);

  await env.DB.prepare(
    `INSERT INTO votes (question_id, voter_id, choice, created_at) VALUES (?, ?, ?, ?)
     ON CONFLICT(question_id, voter_id) DO UPDATE SET choice = excluded.choice`
  ).bind(questionId, voter, choice, Date.now()).run();
  return json({ ok: true });
}
