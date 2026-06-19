alter table relationship_spaces enable row level security;
alter table relationship_space_members enable row level security;
alter table exploration_sessions enable row level security;
alter table exploration_state enable row level security;
alter table ab_interactions enable row level security;
alter table mirror_events enable row level security;
alter table session_summaries enable row level security;

drop policy if exists relationship_spaces_select_member on relationship_spaces;
create policy relationship_spaces_select_member
on relationship_spaces for select
to authenticated
using (
  type = 'temporary'
  or exists (
    select 1
    from relationship_space_members m
    where m.space_id = relationship_spaces.id
      and m.user_id = auth.uid()::text
      and m.status = 'active'
  )
);

drop policy if exists relationship_space_members_select_member on relationship_space_members;
create policy relationship_space_members_select_member
on relationship_space_members for select
to authenticated
using (
  user_id = auth.uid()::text
  or exists (
    select 1
    from relationship_space_members m
    where m.space_id = relationship_space_members.space_id
      and m.user_id = auth.uid()::text
      and m.status = 'active'
  )
);

drop policy if exists exploration_sessions_select_member on exploration_sessions;
create policy exploration_sessions_select_member
on exploration_sessions for select
to authenticated
using (
  exists (
    select 1
    from relationship_spaces s
    left join relationship_space_members m on m.space_id = s.id
    where s.id = exploration_sessions.space_id
      and (
        s.type = 'temporary'
        or (m.user_id = auth.uid()::text and m.status = 'active')
      )
  )
);

drop policy if exists exploration_state_select_member on exploration_state;
create policy exploration_state_select_member
on exploration_state for select
to authenticated
using (
  exists (
    select 1
    from exploration_sessions e
    join relationship_spaces s on s.id = e.space_id
    left join relationship_space_members m on m.space_id = s.id
    where e.id = exploration_state.exploration_id
      and (
        s.type = 'temporary'
        or (m.user_id = auth.uid()::text and m.status = 'active')
      )
  )
);

drop policy if exists ab_interactions_select_member on ab_interactions;
create policy ab_interactions_select_member
on ab_interactions for select
to authenticated
using (
  exists (
    select 1
    from relationship_space_members m
    where m.space_id = ab_interactions.space_id
      and m.user_id = auth.uid()::text
      and m.status = 'active'
  )
);

drop policy if exists mirror_events_select_member on mirror_events;
create policy mirror_events_select_member
on mirror_events for select
to authenticated
using (
  exists (
    select 1
    from relationship_space_members m
    where m.space_id = mirror_events.space_id
      and m.user_id = auth.uid()::text
      and m.status = 'active'
  )
);

drop policy if exists session_summaries_select_member on session_summaries;
create policy session_summaries_select_member
on session_summaries for select
to authenticated
using (
  exists (
    select 1
    from relationship_space_members m
    where m.space_id = session_summaries.space_id
      and m.user_id = auth.uid()::text
      and m.status = 'active'
  )
);
