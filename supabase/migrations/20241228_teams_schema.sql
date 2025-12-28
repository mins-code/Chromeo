-- Teams table for group collaboration
create table public.teams (
  id uuid not null default gen_random_uuid() primary key,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz default now()
);

alter table public.teams enable row level security;

-- Users can see teams they own or are members of
create policy "Users can view their teams" on public.teams
  for select using (
    auth.uid() = owner_id
    OR exists (
      select 1 from public.team_members
      where team_members.team_id = teams.id
        and team_members.user_id = auth.uid()
    )
  );

-- Only authenticated users can create teams
create policy "Users can create teams" on public.teams
  for insert with check (auth.uid() = owner_id);

-- Only team owner can update
create policy "Team owner can update" on public.teams
  for update using (auth.uid() = owner_id);

-- Only team owner can delete
create policy "Team owner can delete" on public.teams
  for delete using (auth.uid() = owner_id);

-- Team members junction table
create table public.team_members (
  id uuid not null default gen_random_uuid() primary key,
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member', -- 'admin', 'member'
  status text not null default 'pending', -- 'pending', 'accepted'
  created_at timestamptz default now(),
  
  constraint unique_team_member unique (team_id, user_id)
);

alter table public.team_members enable row level security;

-- Members can see other members of teams they belong to
create policy "Users can view team members" on public.team_members
  for select using (
    exists (
      select 1 from public.teams t
      where t.id = team_members.team_id
        and (t.owner_id = auth.uid() 
          OR exists (
            select 1 from public.team_members tm
            where tm.team_id = t.id and tm.user_id = auth.uid()
          )
        )
    )
    OR user_id = auth.uid() -- Users can see invites sent to them
  );

-- Team owner or admin can add members
create policy "Team admins can add members" on public.team_members
  for insert with check (
    exists (
      select 1 from public.teams t
      where t.id = team_members.team_id
        and (t.owner_id = auth.uid()
          OR exists (
            select 1 from public.team_members tm
            where tm.team_id = t.id 
              and tm.user_id = auth.uid() 
              and tm.role = 'admin'
              and tm.status = 'accepted'
          )
        )
    )
  );

-- Team owner/admin can update roles, or user can accept their own invite
create policy "Team admins or invited user can update" on public.team_members
  for update using (
    user_id = auth.uid() -- User can accept/reject their own invite
    OR exists (
      select 1 from public.teams t
      where t.id = team_members.team_id
        and (t.owner_id = auth.uid()
          OR exists (
            select 1 from public.team_members tm
            where tm.team_id = t.id 
              and tm.user_id = auth.uid() 
              and tm.role = 'admin'
              and tm.status = 'accepted'
          )
        )
    )
  );

-- Team owner/admin can remove members, or user can remove themselves
create policy "Team admins or self can delete" on public.team_members
  for delete using (
    user_id = auth.uid() -- User can remove themselves
    OR exists (
      select 1 from public.teams t
      where t.id = team_members.team_id
        and (t.owner_id = auth.uid()
          OR exists (
            select 1 from public.team_members tm
            where tm.team_id = t.id 
              and tm.user_id = auth.uid() 
              and tm.role = 'admin'
              and tm.status = 'accepted'
          )
        )
    )
  );

-- Indexes for performance
create index team_members_team_id_idx on public.team_members(team_id);
create index team_members_user_id_idx on public.team_members(user_id);
create index teams_owner_id_idx on public.teams(owner_id);
