-- Fix search_path hijacking in SECURITY DEFINER functions
--
-- PostgreSQL SECURITY DEFINER functions execute with the privileges of the owner.
-- If the search_path is not explicitly set, a malicious user could manipulate
-- their session's search path to hijack functions or operators, leading to
-- privilege escalation.
--
-- This migration updates all vulnerable SECURITY DEFINER functions to explicitly
-- set the search_path to 'public' (or an empty string if preferred, but public
-- is standard for our use cases here).

-- Fix handle_new_user
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- Fix is_team_owner
create or replace function public.is_team_owner(p_team_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.teams
    where id = p_team_id and owner_id = p_user_id
  );
$$;

-- Fix is_team_member
create or replace function public.is_team_member(p_team_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.team_members
    where team_id = p_team_id and user_id = p_user_id
  );
$$;

-- Fix is_team_admin
create or replace function public.is_team_admin(p_team_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
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
