-- みんなの〇択 データベース（Cloudflare D1 / SQLite）

CREATE TABLE IF NOT EXISTS questions (
  id         TEXT PRIMARY KEY,
  text       TEXT NOT NULL,
  choices    TEXT NOT NULL,            -- JSON配列（2〜6個）
  created_at INTEGER NOT NULL,         -- ミリ秒
  ip_hash    TEXT,
  hidden     INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_questions_created ON questions(created_at DESC);

CREATE TABLE IF NOT EXISTS votes (
  question_id TEXT NOT NULL,
  voter_id    TEXT NOT NULL,           -- ブラウザごとの匿名ID
  choice      INTEGER NOT NULL,
  created_at  INTEGER NOT NULL,
  PRIMARY KEY (question_id, voter_id)
);
CREATE INDEX IF NOT EXISTS idx_votes_question ON votes(question_id);

-- 連投制限用
CREATE TABLE IF NOT EXISTS hits (
  ip_hash TEXT NOT NULL,
  action  TEXT NOT NULL,
  ts      INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_hits ON hits(ip_hash, action, ts);

-- 最初のお題
INSERT OR IGNORE INTO questions (id, text, choices, created_at) VALUES
 ('seed01','無人島にひとつだけ持っていくなら？','["ナイフ","スマホ（圏外）","漫画全巻","寝袋"]',1791464400000),
 ('seed02','一生どれか1つしか食べられないなら？','["白米","パン","麺"]',1791464460000),
 ('seed03','目玉焼きに何かける？','["醤油","ソース","塩こしょう","ケチャップ","何もかけない"]',1791464520000),
 ('seed04','超能力をひとつもらえるなら？','["瞬間移動","透明人間","時間を止める","心が読める"]',1791464580000),
 ('seed05','休日の理想の過ごし方は？','["一歩も外に出ない","ひとりでふらっと出かける","誰かと遊ぶ"]',1791464640000),
 ('seed06','タイムマシンで行くなら？','["過去","未来"]',1791464700000),
 ('seed07','夏休みの宿題、どうしてた？','["最初に終わらせる","コツコツ毎日","最後の3日で地獄","やってない"]',1791464760000),
 ('seed08','宝くじで1億円当たったら最初にすることは？','["誰にも言わない","仕事を辞める","とりあえず貯金","パーッと使う","寄付する"]',1791464820000),
 ('seed09','生まれ変わるなら？','["猫","犬","鳥","人間でいい"]',1791464880000),
 ('seed10','コンビニのおにぎり、最初に手に取るのは？','["ツナマヨ","鮭","梅","昆布","明太子","変わり種の新作"]',1791464940000);
