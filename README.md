# みんなの〇択

**▶ [サイトを開く](https://mataasobo.com/minna-taku/)**

正解のない質問に答えて、みんながどれを選んだか見られる投票サイト。お題は誰でも作れて、公開前にAI（Claude）が内容をチェックします。サインイン不要。

## 友達と答えくらべ

答えたお題が5問以上になると、「🤝 友達と答えくらべ」でリンクをつくれます。答えたお題から最大10問（答えた人が多い順）の「お題ID.選んだ番号」と自分の名前がリンクに入ります（`?cn=名前&ca=ID.番号~ID.番号…`）。リンクを開いた人は同じお題に1問ずつ答え、答えるたびに相手と同じだったかが出て、最後に一致率と、答えがちがったお題の一覧が出ます。前に答えたことのあるお題は、その答えでくらべます。サーバーには何も足していません（答えはリンクの中だけ）。友達が答えた票は、ふつうの票として数えられます。

## タグ

お題には、決まった6個（食べもの・恋愛・人づきあい・もしも・暮らし・あそび）から1〜2個のタグがつきます。投稿のときに AI がチェックのついでにつけるので、投稿する人は選びません。一覧はタグでしぼりこめて、答えくらべは「恋愛編」のようにテーマを選べます（リンクに `ct=恋愛` が入る）。タグを増やすときは、Edge Function と `docs/index.html` の `TAGS` を両方直します。

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
- `POST /report` お題を通報（同じ回線から1お題1回。3件で自動非表示）
- `/admin/questions…` 管理画面用（ヘッダー `x-admin-key`）

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

## 管理画面

`https://sphosino.github.io/minna-taku/admin.html` を開き、Supabaseに設定した `ADMIN_KEY` で入る。

- **要確認**：通報が来ているお題、通報で自動非表示になったお題
- **非表示にする／表示に戻す**：戻すと通報数もリセットされる
- **完全に削除**：票と通報もまとめて消える（2回押しで実行）
- パスワードを10回まちがえると、その回線からは1時間入れなくなる

自動非表示になる通報数は、Edge Functionのシークレット `REPORT_HIDE_THRESHOLD` で変えられる（初期値 3）。

## アップデートのしかた

データベースの変更があるときは `supabase/migrations/` の新しいSQLを SQL Editor で実行してから、`supabase/functions/minna/index.ts` を Edge Function のエディタ（Code タブ）に貼り直してデプロイする。

CLI（`npx supabase@2 login` 済み）なら、手元から次のようにできる。

```
npx supabase@2 link --project-ref bhnkfafrnrddtkdkwvso
npx supabase@2 db query --linked -f supabase/migrations/003_tags.sql
npx supabase@2 functions deploy minna --project-ref bhnkfafrnrddtkdkwvso --no-verify-jwt --use-api
```

## AIチェックの基準を変える

`supabase/functions/minna/index.ts` の `RULES` の文章を書き換えて、もう一度デプロイするだけです。

## 注意

- Supabaseの無料プランは、しばらくアクセスがないとプロジェクトが一時停止します。ダッシュボードから再開できます。
- AnthropicのAPIは前払いです。残高がなくなると投稿のAIチェックが失敗し、投稿できなくなります（閲覧と投票はそのまま使えます）。
