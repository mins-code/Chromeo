-- Fix infinite recursion in team_members RLS policies
-- The issue: policies on team_members were querying team_members, causing circular evaluation

-- Step 1: Create SECURITY DEFINER helper functions to bypass RLS during policy checks
-- These functions run with elevated privileges and don't trigger RLS recursion

-- Check if user is a team owner
create or replace function public.is_team_owner(p_team_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.teams
    where id = p_team_id and owner_id = p_user_id
  );
$$;

-- Check if user is a team member (any role/status)
create or replace function public.is_team_member(p_team_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.team_members
    where team_id = p_team_id and user_id = p_user_id
  );
$$;

-- Check if user is a team admin (accepted)
create or replace function public.is_team_admin(p_team_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.team_members
    where team_id = p_team_id 
      and user_id = p_user_id 
      and role = 'admin'
      and status = 'accepted'
  );
$$;

-- Step 2: Drop all existing problematic policies
drop policy if exists "Users can view team members" on public.team_members;
drop policy if exists "Team admins can add members" on public.team_members;
drop policy if exists "Team admins or invited user can update" on public.team_members;
drop policy if exists "Team admins or self can delete" on public.team_members;
drop policy if exists "Users can view their teams" on public.teams;

-- Step 3: Recreate policies using the helper functions (no recursion!)

-- Teams: Users can see teams they own OR belong to
create policy "Users can view their teams" on public.teams
  for select using (
    auth.uid() = owner_id
    OR public.is_team_member(id, auth.uid())
  );

-- Team Members: Can see members of teams they belong to, or their own invites
create policy "Users can view team members" on public.team_members
  for select using (
    user_id = auth.uid()
    OR public.is_team_owner(team_id, auth.uid())
    OR public.is_team_member(team_id, auth.uid())
  );

-- Team Members: Owner or admin can add members
create policy "Team admins can add members" on public.team_members
  for insert with check (
    public.is_team_owner(team_id, auth.uid())
    OR public.is_team_admin(team_id, auth.uid())
  );

-- Team Members: Owner/admin can update, or user can update their own invite
create policy "Team admins or invited user can update" on public.team_members
  for update using (
    user_id = auth.uid()
    OR public.is_team_owner(team_id, auth.uid())
    OR public.is_team_admin(team_id, auth.uid())
  );

-- Team Members: Owner/admin can delete, or user can remove themselves
create policy "Team admins or self can delete" on public.team_members
  for delete using (
    user_id = auth.uid()
    OR public.is_team_owner(team_id, auth.uid())
    OR public.is_team_admin(team_id, auth.uid())
  );
