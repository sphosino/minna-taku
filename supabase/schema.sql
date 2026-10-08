-- みんなの〇択 データベース（Supabase / Postgres）
-- Supabase の SQL Editor にまるごと貼って「Run」

create table if not exists questions (
  id         text primary key,
  text       text not null,
  choices    jsonb not null,             -- 文字列の配列（2〜6個）
  created_at bigint not null,            -- ミリ秒
  ip_hash    text,
  hidden     boolean not null default false
);
create index if not exists idx_questions_created on questions (created_at desc);

create table if not exists votes (
  question_id text not null references questions(id) on delete cascade,
  voter_id    text not null,             -- ブラウザごとの匿名ID
  choice      int  not null,
  created_at  bigint not null,
  primary key (question_id, voter_id)
);

-- 連投制限用
create table if not exists hits (
  ip_hash text   not null,
  action  text   not null,
  ts      bigint not null
);
create index if not exists idx_hits on hits (ip_hash, action, ts);

-- 集計ビュー
create or replace view vote_counts with (security_invoker = true) as
  select question_id, choice, count(*)::int as n
  from votes group by question_id, choice;

-- ブラウザから直接はさわらせない（すべて Edge Function 経由）
alter table questions enable row level security;
alter table votes     enable row level security;
alter table hits      enable row level security;

-- 通報
alter table questions add column if not exists hidden_by text;      -- 'admin' か 'reports'
alter table questions add column if not exists hidden_at bigint;

create table if not exists reports (
  question_id text   not null references questions(id) on delete cascade,
  ip_hash     text   not null,
  created_at  bigint not null,
  primary key (question_id, ip_hash)        -- 同じ回線から同じお題は1回だけ
);
alter table reports enable row level security;

create or replace view report_counts with (security_invoker = true) as
  select question_id, count(*)::int as n
  from reports group by question_id;

-- 最初のお題
insert into questions (id, text, choices, created_at) values
 ('seed01','無人島にひとつだけ持っていくなら？','["ナイフ","スマホ（圏外）","漫画全巻","寝袋"]',1791464400000),
 ('seed02','一生どれか1つしか食べられないなら？','["白米","パン","麺"]',1791464460000),
 ('seed03','目玉焼きに何かける？','["醤油","ソース","塩こしょう","ケチャップ","何もかけない"]',1791464520000),
 ('seed04','超能力をひとつもらえるなら？','["瞬間移動","透明人間","時間を止める","心が読める"]',1791464580000),
 ('seed05','休日の理想の過ごし方は？','["一歩も外に出ない","ひとりでふらっと出かける","誰かと遊ぶ"]',1791464640000),
 ('seed06','タイムマシンで行くなら？','["過去","未来"]',1791464700000),
 ('seed07','夏休みの宿題、どうしてた？','["最初に終わらせる","コツコツ毎日","最後の3日で地獄","やってない"]',1791464760000),
 ('seed08','宝くじで1億円当たったら最初にすることは？','["誰にも言わない","仕事を辞める","とりあえず貯金","パーッと使う","寄付する"]',1791464820000),
 ('seed09','生まれ変わるなら？','["猫","犬","鳥","人間でいい"]',1791464880000),
 ('seed10','コンビニのおにぎり、最初に手に取るのは？','["ツナマヨ","鮭","梅","昆布","明太子","変わり種の新作"]',1791464940000)
on conflict (id) do nothing;
