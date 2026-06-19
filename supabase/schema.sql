create extension if not exists pgcrypto;

create table if not exists public.sessions (
  id text primary key,
  status text not null default 'waiting',
  host_id text not null,
  partner_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  relationship_stage text,
  goal text,
  current_step text not null default 'home'
);

create table if not exists public.session_state (
  session_id text primary key references public.sessions(id) on delete cascade,
  shared_state jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.relationship_spaces (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  status text not null default 'waiting',
  invite_code text not null unique,
  name text,
  created_by_user_id text,
  created_by_participant_id text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.relationship_space_members (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.relationship_spaces(id) on delete cascade,
  space_type text not null,
  user_id text,
  participant_id text,
  role text not null,
  status text not null default 'active',
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  last_seen_at timestamptz,
  display_name text,
  avatar_url text,
  unique (space_id, user_id),
  unique (space_id, participant_id)
);

create table if not exists public.exploration_sessions (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.relationship_spaces(id) on delete cascade,
  legacy_session_id text unique references public.sessions(id) on delete set null,
  mode text not null,
  status text not null default 'draft',
  relationship_stage text,
  goal text,
  current_step text not null default 'home',
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.exploration_state (
  exploration_id uuid primary key references public.exploration_sessions(id) on delete cascade,
  shared_state jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.ab_interactions (
  id uuid primary key default gen_random_uuid(),
  session_id text not null references public.sessions(id) on delete cascade,
  space_id uuid references public.relationship_spaces(id) on delete cascade,
  exploration_id uuid references public.exploration_sessions(id) on delete cascade,
  question_id text not null,
  question_text text not null,
  host_answer text,
  partner_answer text,
  host_answered_at timestamptz,
  partner_answered_at timestamptz,
  result jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.mirror_events (
  id uuid primary key default gen_random_uuid(),
  session_id text not null references public.sessions(id) on delete cascade,
  space_id uuid references public.relationship_spaces(id) on delete cascade,
  exploration_id uuid references public.exploration_sessions(id) on delete cascade,
  event_key text,
  title text not null,
  prompt text not null,
  host_choice text,
  partner_choice text,
  host_reflection text,
  partner_reflection text,
  result jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.session_summaries (
  id uuid primary key default gen_random_uuid(),
  session_id text not null references public.sessions(id) on delete cascade,
  space_id uuid references public.relationship_spaces(id) on delete cascade,
  exploration_id uuid references public.exploration_sessions(id) on delete cascade,
  summary_text text not null,
  highlights jsonb not null default '[]'::jsonb,
  suggestions jsonb not null default '[]'::jsonb,
  generated_from jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists relationship_spaces_type_idx on public.relationship_spaces(type);
create index if not exists relationship_spaces_status_idx on public.relationship_spaces(status);
create index if not exists relationship_spaces_created_by_user_id_idx on public.relationship_spaces(created_by_user_id);
create index if not exists relationship_space_members_space_id_idx on public.relationship_space_members(space_id);
create index if not exists relationship_space_members_user_id_idx on public.relationship_space_members(user_id);
create index if not exists relationship_space_members_participant_id_idx on public.relationship_space_members(participant_id);
create index if not exists relationship_space_members_space_type_status_idx on public.relationship_space_members(space_type, status);
create index if not exists exploration_sessions_space_id_idx on public.exploration_sessions(space_id);
create index if not exists exploration_sessions_mode_idx on public.exploration_sessions(mode);
create index if not exists exploration_sessions_status_idx on public.exploration_sessions(status);
create index if not exists ab_interactions_session_id_idx on public.ab_interactions(session_id);
create index if not exists ab_interactions_space_id_idx on public.ab_interactions(space_id);
create index if not exists ab_interactions_exploration_id_idx on public.ab_interactions(exploration_id);
create index if not exists ab_interactions_question_id_idx on public.ab_interactions(question_id);
create index if not exists mirror_events_session_id_idx on public.mirror_events(session_id);
create index if not exists mirror_events_space_id_idx on public.mirror_events(space_id);
create index if not exists mirror_events_exploration_id_idx on public.mirror_events(exploration_id);
create index if not exists mirror_events_event_key_idx on public.mirror_events(event_key);
create index if not exists session_summaries_session_id_idx on public.session_summaries(session_id);
create index if not exists session_summaries_space_id_idx on public.session_summaries(space_id);
create index if not exists session_summaries_exploration_id_idx on public.session_summaries(exploration_id);

alter table public.sessions replica identity full;
alter table public.session_state replica identity full;
alter table public.relationship_spaces replica identity full;
alter table public.relationship_space_members replica identity full;
alter table public.exploration_sessions replica identity full;
alter table public.exploration_state replica identity full;

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'sessions') then
    alter publication supabase_realtime add table public.sessions;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'session_state') then
    alter publication supabase_realtime add table public.session_state;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'relationship_spaces') then
    alter publication supabase_realtime add table public.relationship_spaces;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'relationship_space_members') then
    alter publication supabase_realtime add table public.relationship_space_members;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'exploration_sessions') then
    alter publication supabase_realtime add table public.exploration_sessions;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'exploration_state') then
    alter publication supabase_realtime add table public.exploration_state;
  end if;
end $$;

insert into storage.buckets (id, name, public)
values ('present-moment', 'present-moment', true)
on conflict (id) do nothing;
