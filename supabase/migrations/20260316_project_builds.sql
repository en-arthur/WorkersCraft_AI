create table if not exists project_builds (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid references projects(id) on delete cascade,
  user_id       uuid references auth.users(id),
  platform      text not null,
  build_type    text not null,
  status        text not null default 'queued',
  run_id        bigint,
  artifact_id   bigint,
  workflow_file text,
  error         text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

alter table project_builds enable row level security;

create policy "Users can manage their own builds"
  on project_builds for all
  using (auth.uid() = user_id);
