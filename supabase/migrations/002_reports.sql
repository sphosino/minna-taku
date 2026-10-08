-- 通報と管理画面のための追加（SQL Editor にまるごと貼って「Run」）

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
