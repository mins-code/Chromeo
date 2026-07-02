-- Migration: Secure SECURITY DEFINER functions from search path hijacking
-- Adding explicit SET search_path = public to prevent attackers from overriding
-- built-in functions or operators by placing malicious versions in their own schemas.

ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.is_team_owner(uuid, uuid) SET search_path = public;
ALTER FUNCTION public.is_team_member(uuid, uuid) SET search_path = public;
ALTER FUNCTION public.is_team_admin(uuid, uuid) SET search_path = public;
