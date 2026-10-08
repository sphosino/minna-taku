# みんなの〇択

正解のない質問に答えて、みんながどれを選んだか見られる投票サイト。お題は誰でも作れて、公開前にAI（Claude）が内容をチェックします。サインイン不要。

## しくみ

| 部分 | 使っているもの |
|---|---|
| ページ | `public/index.html`（1ファイル） |
| API | Cloudflare Pages Functions（`functions/api/`） |
| データ | Cloudflare D1（`schema.sql`） |
| AIチェック | Anthropic API（`lib/moderate.js`） |

- `GET /api/questions?voter=<ID>` 公開中のお題、集計、自分の回答
- `POST /api/questions` お題を投稿（AIチェックでOKのものだけ保存。1時間に5回まで）
- `POST /api/vote` 投票（1人1票、あとから変更可。投票者はブラウザごとの匿名ID）
- `DELETE /api/questions/<id>` 管理者がお題を非表示にする（ヘッダー `x-admin-key`）

## 公開のしかた（Cloudflare）

1. [Cloudflare](https://dash.cloudflare.com/sign-up) に無料登録する
2. 左メニュー **Storage & databases → D1** で「Create」、名前は `minna-taku`
3. 作ったデータベースの **Console** タブに `schema.sql` の中身を貼って実行する
4. データベースIDをコピーし、`wrangler.toml` の `database_id` に貼ってコミットする
5. **Workers & Pages → Create → Pages → Connect to Git** でこのリポジトリを選ぶ
   - Build command：空のまま
   - Build output directory：`public`
6. デプロイ後、プロジェクトの **Settings → Variables and Secrets** に追加する
   - `ANTHROPIC_API_KEY`（Secret）… [Anthropic Console](https://console.anthropic.com/) で発行したキー
   - `ADMIN_KEY`（Secret）… 自分で決めた長いパスワード（お題を消すときに使う）
   - `HASH_SALT`（Secret）… 適当な長い文字列（連投制限用）
7. **Deployments** から再デプロイすると完成

## お題を消す（管理者）

```sh
curl -X DELETE https://<あなたのサイト>/api/questions/<お題ID> -H "x-admin-key: <ADMIN_KEY>"
```

## 手元で動かす

```sh
npm i -g wrangler
echo 'ANTHROPIC_API_KEY=sk-ant-...' > .dev.vars
wrangler d1 execute minna-taku --local --file=schema.sql
wrangler pages dev
```
