// DELETE /api/questions/<id>  ヘッダー x-admin-key: <ADMIN_KEY>
// 管理者がお題を非表示にする（票は残る）

import { json, err, isId } from "../../../lib/util.js";

export async function onRequestDelete({ request, env, params }) {
  const key = request.headers.get("x-admin-key");
  if (!env.ADMIN_KEY || key !== env.ADMIN_KEY) return err("権限がありません。", 403);
  if (!isId(params.id)) return err("IDが正しくありません。");
  await env.DB.prepare("UPDATE questions SET hidden = 1 WHERE id = ?").bind(params.id).run();
  return json({ ok: true });
}
