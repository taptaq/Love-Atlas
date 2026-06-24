-- ============================================================
-- Row Level Security 策略
-- 原则：写操作走服务端 Prisma（service role 绕过 RLS）
--       客户端只读，通过 RLS 控制访问权限
-- ============================================================

-- 启用 RLS：所有业务表
alter table sessions enable row level security;
alter table session_state enable row level security;
alter table session_participants enable row level security;
alter table session_flow_progress enable row level security;
alter table relationship_spaces enable row level security;
alter table relationship_space_members enable row level security;
alter table exploration_sessions enable row level security;
alter table exploration_state enable row level security;
alter table ab_interactions enable row level security;
alter table mirror_events enable row level security;
alter table present_moments enable row level security;
alter table relationship_map_states enable row level security;
alter table discoveries enable row level security;
alter table session_summaries enable row level security;

-- ============================================================
-- 辅助函数：判断当前用户是否为某 space 的 active 成员
-- ============================================================
create or replace function public.is_space_member(check_space_id uuid)
returns boolean
language sql
stable
security definer
as $$
  select exists (
    select 1
    from public.relationship_space_members m
    where m.space_id = check_space_id
      and m.user_id = auth.uid()::text
      and m.status = 'active'
  );
$$;

-- ============================================================
-- sessions（遗留会话）
-- ============================================================
drop policy if exists sessions_select_member on sessions;
create policy sessions_select_member
on sessions for select
to authenticated
using (
  exists (
    select 1
    from public.exploration_sessions e
    join public.relationship_spaces s on s.id = e.space_id
    where e.legacy_session_id = sessions.id
      and (s.type = 'temporary' or public.is_space_member(s.id))
  )
);

-- ============================================================
-- session_state（实时同步关键表）
-- ============================================================
drop policy if exists session_state_select_member on session_state;
create policy session_state_select_member
on session_state for select
to authenticated
using (
  exists (
    select 1
    from public.exploration_sessions e
    join public.relationship_spaces s on s.id = e.space_id
    where e.legacy_session_id = session_state.session_id
      and (s.type = 'temporary' or public.is_space_member(s.id))
  )
);

-- ============================================================
-- session_participants
-- ============================================================
drop policy if exists session_participants_select_member on session_participants;
create policy session_participants_select_member
on session_participants for select
to authenticated
using (
  participant_id = auth.uid()::text
  or exists (
    select 1
    from public.exploration_sessions e
    join public.relationship_spaces s on s.id = e.space_id
    where e.legacy_session_id = session_participants.session_id
      and (s.type = 'temporary' or public.is_space_member(s.id))
  )
);

-- ============================================================
-- session_flow_progress
-- ============================================================
drop policy if exists session_flow_progress_select_member on session_flow_progress;
create policy session_flow_progress_select_member
on session_flow_progress for select
to authenticated
using (
  exists (
    select 1
    from public.exploration_sessions e
    join public.relationship_spaces s on s.id = e.space_id
    where e.legacy_session_id = session_flow_progress.session_id
      and (s.type = 'temporary' or public.is_space_member(s.id))
  )
);

-- ============================================================
-- relationship_spaces
-- ============================================================
drop policy if exists relationship_spaces_select_member on relationship_spaces;
create policy relationship_spaces_select_member
on relationship_spaces for select
to authenticated
using (
  type = 'temporary'
  or public.is_space_member(relationship_spaces.id)
);

-- ============================================================
-- relationship_space_members
-- ============================================================
drop policy if exists relationship_space_members_select_member on relationship_space_members;
create policy relationship_space_members_select_member
on relationship_space_members for select
to authenticated
using (
  user_id = auth.uid()::text
  or public.is_space_member(relationship_space_members.space_id)
);

-- ============================================================
-- exploration_sessions
-- ============================================================
drop policy if exists exploration_sessions_select_member on exploration_sessions;
create policy exploration_sessions_select_member
on exploration_sessions for select
to authenticated
using (
  exists (
    select 1
    from public.relationship_spaces s
    where s.id = exploration_sessions.space_id
      and (s.type = 'temporary' or public.is_space_member(s.id))
  )
);

-- ============================================================
-- exploration_state（实时同步关键表）
-- ============================================================
drop policy if exists exploration_state_select_member on exploration_state;
create policy exploration_state_select_member
on exploration_state for select
to authenticated
using (
  exists (
    select 1
    from public.exploration_sessions e
    join public.relationship_spaces s on s.id = e.space_id
    where e.id = exploration_state.exploration_id
      and (s.type = 'temporary' or public.is_space_member(s.id))
  )
);

-- ============================================================
-- ab_interactions
-- ============================================================
drop policy if exists ab_interactions_select_member on ab_interactions;
create policy ab_interactions_select_member
on ab_interactions for select
to authenticated
using (
  space_id is not null and public.is_space_member(space_id)
);

-- ============================================================
-- mirror_events
-- ============================================================
drop policy if exists mirror_events_select_member on mirror_events;
create policy mirror_events_select_member
on mirror_events for select
to authenticated
using (
  space_id is not null and public.is_space_member(space_id)
);

-- ============================================================
-- present_moments
-- ============================================================
drop policy if exists present_moments_select_member on present_moments;
create policy present_moments_select_member
on present_moments for select
to authenticated
using (
  user_id = auth.uid()::text
  or (space_id is not null and public.is_space_member(space_id))
);

-- ============================================================
-- relationship_map_states
-- ============================================================
drop policy if exists relationship_map_states_select_member on relationship_map_states;
create policy relationship_map_states_select_member
on relationship_map_states for select
to authenticated
using (
  space_id is not null and public.is_space_member(space_id)
);

-- ============================================================
-- discoveries
-- ============================================================
drop policy if exists discoveries_select_member on discoveries;
create policy discoveries_select_member
on discoveries for select
to authenticated
using (
  space_id is not null and public.is_space_member(space_id)
);

-- ============================================================
-- session_summaries
-- ============================================================
drop policy if exists session_summaries_select_member on session_summaries;
create policy session_summaries_select_member
on session_summaries for select
to authenticated
using (
  space_id is not null and public.is_space_member(space_id)
);

-- ============================================================
-- Storage：present-moment bucket 策略
-- 仅允许 authenticated 用户上传/覆盖自己的对象，所有人可读（public bucket）
-- ============================================================
drop policy if exists "present-moment-upload" on storage.objects;
create policy "present-moment-upload"
on storage.objects for insert
to authenticated
with check (bucket_id = 'present-moment');

drop policy if exists "present-moment-read" on storage.objects;
create policy "present-moment-read"
on storage.objects for select
to public
using (bucket_id = 'present-moment');

drop policy if exists "present-moment-update-owner" on storage.objects;
create policy "present-moment-update-owner"
on storage.objects for update
to authenticated
using (
  bucket_id = 'present-moment'
  and owner = auth.uid()
)
with check (
  bucket_id = 'present-moment'
  and owner = auth.uid()
);

drop policy if exists "present-moment-delete-owner" on storage.objects;
create policy "present-moment-delete-owner"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'present-moment'
  and owner = auth.uid()
);
