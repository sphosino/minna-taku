# みんなの〇択

**▶ [サイトを開く](https://sphosino.github.io/minna-taku/)**

正解のない質問に答えて、みんながどれを選んだか見られる投票サイト。お題は誰でも作れて、公開前にAI（Claude）が内容をチェックします。サインイン不要。

## しくみ

| 部分 | 使っているもの | 料金 |
|---|---|---|
| ページ | GitHub Pages（`docs/index.html`） | 無料（リポジトリはPublic） |
| データベース | Supabase（`supabase/schema.sql`） | 無料枠 |
| API | Supabase Edge Functions（`supabase/functions/minna/index.ts`） | 無料枠 |
| AIチェック | Anthropic API（Claude Haiku） | 使った分だけ。1件あたり約0.0001ドル |

ブラウザはデータベースに直接さわらず、すべてEdge Function経由で読み書きします（テーブルはRLSで閉じてある）。

- `GET  /questions?voter=<ID>` 公開中のお題・集計・自分の回答
- `POST /questions` お題を投稿（AIチェックでOKのものだけ保存。同じ回線から1時間に5回まで）
- `POST /vote` 投票（1人1票、あとから変更可。投票者はブラウザごとの匿名ID）
- `DELETE /questions/<id>` 管理者がお題を非表示（ヘッダー `x-admin-key`）

## 公開のしかた

### 1. Supabase（データベースとAPI）

1. [Supabase](https://supabase.com/dashboard) で **New project**（名前は `minna-taku` など、リージョンは Tokyo）
2. 左メニュー **SQL Editor** を開き、`supabase/schema.sql` の中身をまるごと貼って **Run**
3. 左メニュー **Edge Functions → Deploy a new function → Via Editor**
   - 関数名：`minna`（この名前にしてください）
   - `supabase/functions/minna/index.ts` の中身をまるごと貼って **Deploy**
   - 関数の設定で **Enforce JWT verification（JWTの検証）をオフ**にする（サインインなしで使うため）
4. **Edge Functions → Secrets** に3つ追加
   - `ANTHROPIC_API_KEY` … [Anthropic Console](https://console.anthropic.com/) で発行したキー
   - `ADMIN_KEY` … 自分で決めた長いパスワード（お題を消すときに使う）
   - `HASH_SALT` … 適当な長い文字列（連投制限用）
5. 関数のURL（`https://xxxx.supabase.co/functions/v1/minna`）をコピー

### 2. ページ（GitHub Pages）

1. `docs/index.html` の `const API=...` を、上でコピーしたURLに書き換えてコミット
2. リポジトリの **Settings → General** の一番下で、公開範囲を **Public** にする
3. **Settings → Pages** で Source を **Deploy from a branch**、Branch を `main` / `/docs` にして Save
4. 数分後に `https://<ユーザー名>.github.io/minna-taku/` で公開される

## お題を消す（管理者）

```sh
curl -X DELETE https://xxxx.supabase.co/functions/v1/minna/questions/<お題ID> -H "x-admin-key: <ADMIN_KEY>"
```

## AIチェックの基準を変える

`supabase/functions/minna/index.ts` の `RULES` の文章を書き換えて、もう一度デプロイするだけです。

## 注意

- Supabaseの無料プランは、しばらくアクセスがないとプロジェクトが一時停止します。ダッシュボードから再開できます。
- AnthropicのAPIは前払いです。残高がなくなると投稿のAIチェックが失敗し、投稿できなくなります（閲覧と投票はそのまま使えます）。
