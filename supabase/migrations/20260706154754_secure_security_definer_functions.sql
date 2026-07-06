-- Fix search path hijacking vulnerability in SECURITY DEFINER functions
-- Adding SET search_path = public to explicitly define search path

ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.is_team_owner(uuid, uuid) SET search_path = public;
ALTER FUNCTION public.is_team_member(uuid, uuid) SET search_path = public;
ALTER FUNCTION public.is_team_admin(uuid, uuid) SET search_path = public;
