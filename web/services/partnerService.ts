import { supabase } from './supabaseClient';
import { logger } from '../utils/logger';
import type { Partnership, Team, TeamMember, UserSearchResult } from '../types';

// ============ USER SEARCH ============

export async function searchUsersByEmail(query: string): Promise<UserSearchResult[]> {
  if (!query || query.length < 2) return [];
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .ilike('email', `%${query}%`)
    .neq('id', user.id) // Exclude current user
    .limit(10);

  if (error) {
    logger.error('Error searching users', error);
    return [];
  }

  return (data || []).map(p => ({
    id: p.id,
    email: p.email || '',
    fullName: p.full_name || undefined
  }));
}

// ============ PARTNERSHIPS ============

export async function getPartnerships(): Promise<Partnership[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('partnerships')
    .select(`
      id,
      user_id_1,
      user_id_2,
      status,
      profile1:profiles!partnerships_user_id_1_fkey(id, email, full_name),
      profile2:profiles!partnerships_user_id_2_fkey(id, email, full_name)
    `)
    .or(`user_id_1.eq.${user.id},user_id_2.eq.${user.id}`);

  if (error) {
    logger.error('Error fetching partnerships', error);
    return [];
  }

  return (data || []).map(p => {
    const isIncoming = p.user_id_2 === user.id;
    const partner = isIncoming ? p.profile1 : p.profile2;
    
    return {
      id: p.id,
      partnerId: isIncoming ? p.user_id_1 : p.user_id_2,
      partnerEmail: (partner as any)?.email || '',
      partnerName: (partner as any)?.full_name || undefined,
      status: p.status as 'pending' | 'accepted',
      isIncoming
    };
  });
}

export async function sendPartnerRequest(targetUserId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  // Check if partnership already exists
  const { data: existing } = await supabase
    .from('partnerships')
    .select('id')
    .or(`and(user_id_1.eq.${user.id},user_id_2.eq.${targetUserId}),and(user_id_1.eq.${targetUserId},user_id_2.eq.${user.id})`)
    .single();

  if (existing) {
    logger.warn('Partnership already exists');
    return false;
  }

  const { error } = await supabase
    .from('partnerships')
    .insert({
      user_id_1: user.id,
      user_id_2: targetUserId,
      status: 'pending'
    });

  if (error) {
    logger.error('Error sending partner request', error);
    return false;
  }

  return true;
}

export async function acceptPartnerRequest(partnershipId: string): Promise<boolean> {
  const { error } = await supabase
    .from('partnerships')
    .update({ status: 'accepted' })
    .eq('id', partnershipId);

  if (error) {
    logger.error('Error accepting partner request', error);
    return false;
  }

  return true;
}

export async function rejectPartnerRequest(partnershipId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from('partnerships')
    .delete()
    .eq('id', partnershipId)
    .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`); // 🛡️ SECURITY: Prevent IDOR (Defense in Depth)

  if (error) {
    logger.error('Error rejecting partner request', error);
    return false;
  }

  return true;
}

export async function removePartner(partnershipId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from('partnerships')
    .delete()
    .eq('id', partnershipId)
    .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`); // 🛡️ SECURITY: Prevent IDOR (Defense in Depth)

  if (error) {
    logger.error('Error removing partner', error);
    return false;
  }

  return true;
}

// ============ TEAMS ============

export async function getTeams(): Promise<Team[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Get teams user owns
  const { data: ownedTeams, error: ownedError } = await supabase
    .from('teams')
    .select('id, name, description, owner_id, created_at')
    .eq('owner_id', user.id);

  if (ownedError) {
    logger.error('Error fetching owned teams', ownedError);
  }

  // Get teams user is a member of
  const { data: memberTeams, error: memberError } = await supabase
    .from('team_members')
    .select(`
      team:teams(id, name, description, owner_id, created_at)
    `)
    .eq('user_id', user.id)
    .eq('status', 'accepted');

  if (memberError) {
    logger.error('Error fetching member teams', memberError);
  }

  // Combine and deduplicate
  const allTeams: Team[] = [];
  const seenIds = new Set<string>();

  for (const t of ownedTeams || []) {
    if (!seenIds.has(t.id)) {
      seenIds.add(t.id);
      // Get member count
      const { count } = await supabase
        .from('team_members')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', t.id)
        .eq('status', 'accepted');

      allTeams.push({
        id: t.id,
        name: t.name,
        description: t.description || undefined,
        ownerId: t.owner_id,
        isOwner: true,
        memberCount: (count || 0) + 1, // +1 for owner
        createdAt: t.created_at
      });
    }
  }

  for (const m of memberTeams || []) {
    const t = m.team as any;
    if (t && !seenIds.has(t.id)) {
      seenIds.add(t.id);
      const { count } = await supabase
        .from('team_members')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', t.id)
        .eq('status', 'accepted');

      allTeams.push({
        id: t.id,
        name: t.name,
        description: t.description || undefined,
        ownerId: t.owner_id,
        isOwner: t.owner_id === user.id,
        memberCount: (count || 0) + 1,
        createdAt: t.created_at
      });
    }
  }

  return allTeams;
}

export async function getTeamInvites(): Promise<Team[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('team_members')
    .select(`
      team:teams(id, name, description, owner_id, created_at)
    `)
    .eq('user_id', user.id)
    .eq('status', 'pending');

  if (error) {
    logger.error('Error fetching team invites', error);
    return [];
  }

  return (data || []).map(m => {
    const t = m.team as any;
    return {
      id: t.id,
      name: t.name,
      description: t.description || undefined,
      ownerId: t.owner_id,
      isOwner: false,
      memberCount: 0,
      createdAt: t.created_at
    };
  });
}

export async function createTeam(name: string, description?: string): Promise<Team | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('teams')
    .insert({
      owner_id: user.id,
      name,
      description: description || null
    })
    .select()
    .single();

  if (error) {
    logger.error('Error creating team', error);
    return null;
  }

  return {
    id: data.id,
    name: data.name,
    description: data.description || undefined,
    ownerId: data.owner_id,
    isOwner: true,
    memberCount: 1, // Just the owner
    createdAt: data.created_at
  };
}

export async function updateTeam(id: string, updates: { name?: string; description?: string }): Promise<Team | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('teams')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    logger.error('Error updating team', error);
    return null;
  }

  const { count } = await supabase
    .from('team_members')
    .select('*', { count: 'exact', head: true })
    .eq('team_id', id)
    .eq('status', 'accepted');

  return {
    id: data.id,
    name: data.name,
    description: data.description || undefined,
    ownerId: data.owner_id,
    isOwner: data.owner_id === user.id,
    memberCount: (count || 0) + 1,
    createdAt: data.created_at
  };
}

export async function deleteTeam(id: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from('teams')
    .delete()
    .eq('id', id)
    .eq('owner_id', user.id); // 🛡️ SECURITY: Prevent IDOR (Defense in Depth)

  if (error) {
    logger.error('Error deleting team', error);
    return false;
  }

  return true;
}

// ============ TEAM MEMBERS ============

export async function getTeamMembers(teamId: string): Promise<TeamMember[]> {
  const { data, error } = await supabase
    .from('team_members')
    .select(`
      id,
      user_id,
      role,
      status,
      profile:profiles!team_members_user_id_fkey(email, full_name)
    `)
    .eq('team_id', teamId);

  if (error) {
    logger.error('Error fetching team members', error);
    return [];
  }

  return (data || []).map(m => ({
    id: m.id,
    userId: m.user_id,
    email: (m.profile as any)?.email || '',
    name: (m.profile as any)?.full_name || undefined,
    role: m.role as 'admin' | 'member',
    status: m.status as 'pending' | 'accepted'
  }));
}

export async function addTeamMember(teamId: string, userId: string, role: 'admin' | 'member' = 'member'): Promise<boolean> {
  const { error } = await supabase
    .from('team_members')
    .insert({
      team_id: teamId,
      user_id: userId,
      role,
      status: 'pending'
    });

  if (error) {
    logger.error('Error adding team member', error);
    return false;
  }

  return true;
}

export async function updateMemberRole(memberId: string, role: 'admin' | 'member'): Promise<boolean> {
  const { error } = await supabase
    .from('team_members')
    .update({ role })
    .eq('id', memberId);

  if (error) {
    logger.error('Error updating member role', error);
    return false;
  }

  return true;
}

export async function removeTeamMember(memberId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  // We must verify the user is the owner of the team before removing the member
  // First, get the team_id for this member
  const { data: member } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('id', memberId)
    .single();

  if (!member) return false;

  // Then check if current user owns this team
  const { data: team } = await supabase
    .from('teams')
    .select('id')
    .eq('id', member.team_id)
    .eq('owner_id', user.id)
    .single();

  if (!team) return false;

  const { error } = await supabase
    .from('team_members')
    .delete()
    .eq('id', memberId); // 🛡️ SECURITY: Prevent IDOR (Defense in Depth)

  if (error) {
    logger.error('Error removing team member', error);
    return false;
  }

  return true;
}

export async function acceptTeamInvite(teamId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from('team_members')
    .update({ status: 'accepted' })
    .eq('team_id', teamId)
    .eq('user_id', user.id);

  if (error) {
    logger.error('Error accepting team invite', error);
    return false;
  }

  return true;
}

export async function rejectTeamInvite(teamId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from('team_members')
    .delete()
    .eq('team_id', teamId)
    .eq('user_id', user.id);

  if (error) {
    logger.error('Error rejecting team invite', error);
    return false;
  }

  return true;
}
