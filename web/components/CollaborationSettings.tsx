import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Users, UserPlus, UserMinus, Search, Check, X, 
  MoreVertical, Shield, User, Crown, Plus, 
  ChevronDown, ChevronUp, Trash2, Edit3, Loader2
} from 'lucide-react';
import Button from './Button';
import Input from './Input';
import * as PartnerService from '../services/partnerService';
import type { Partnership, Team, TeamMember, UserSearchResult } from '../types';

interface CollaborationSettingsProps {
  currentUserId?: string;
  currentUserEmail?: string;
}

export const CollaborationSettings: React.FC<CollaborationSettingsProps> = ({
  currentUserId,
  currentUserEmail
}) => {
  // Partner State
  const [partnerships, setPartnerships] = useState<Partnership[]>([]);
  const [isLoadingPartners, setIsLoadingPartners] = useState(true);
  
  // Team State
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamInvites, setTeamInvites] = useState<Team[]>([]);
  const [isLoadingTeams, setIsLoadingTeams] = useState(true);
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);
  const [teamMembers, setTeamMembers] = useState<Record<string, TeamMember[]>>({});
  
  // User Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [searchContext, setSearchContext] = useState<'partner' | { type: 'team'; teamId: string } | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  
  // Create Team Modal
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDesc, setNewTeamDesc] = useState('');
  const [isCreatingTeam, setIsCreatingTeam] = useState(false);

  // Load data on mount
  useEffect(() => {
    loadPartnerships();
    loadTeams();
  }, []);

  // Click outside to close search dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearchDropdown(false);
        setSearchContext(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      const results = await PartnerService.searchUsersByEmail(searchQuery);
      
      // Filter out existing partners if searching for partners
      if (searchContext === 'partner') {
        const partnerIds = new Set(partnerships.map(p => p.partnerId));
        setSearchResults(results.filter(r => !partnerIds.has(r.id)));
      } else if (searchContext && typeof searchContext === 'object' && searchContext.type === 'team') {
        // Filter out existing team members
        const memberIds = new Set((teamMembers[searchContext.teamId] || []).map(m => m.userId));
        setSearchResults(results.filter(r => !memberIds.has(r.id)));
      } else {
        setSearchResults(results);
      }
      setIsSearching(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, searchContext, partnerships, teamMembers]);

  const loadPartnerships = async () => {
    setIsLoadingPartners(true);
    const data = await PartnerService.getPartnerships();
    setPartnerships(data);
    setIsLoadingPartners(false);
  };

  const loadTeams = async () => {
    setIsLoadingTeams(true);
    const [teamsData, invitesData] = await Promise.all([
      PartnerService.getTeams(),
      PartnerService.getTeamInvites()
    ]);
    setTeams(teamsData);
    setTeamInvites(invitesData);
    setIsLoadingTeams(false);
  };

  const loadTeamMembers = async (teamId: string) => {
    const members = await PartnerService.getTeamMembers(teamId);
    setTeamMembers(prev => ({ ...prev, [teamId]: members }));
  };

  // Partner Actions
  const handleAddPartner = async (user: UserSearchResult) => {
    const success = await PartnerService.sendPartnerRequest(user.id);
    if (success) {
      await loadPartnerships();
      setSearchQuery('');
      setShowSearchDropdown(false);
      setSearchContext(null);
    }
  };

  const handleAcceptPartner = async (partnershipId: string) => {
    const success = await PartnerService.acceptPartnerRequest(partnershipId);
    if (success) await loadPartnerships();
  };

  const handleRejectPartner = async (partnershipId: string) => {
    const success = await PartnerService.rejectPartnerRequest(partnershipId);
    if (success) await loadPartnerships();
  };

  const handleRemovePartner = async (partnershipId: string) => {
    const success = await PartnerService.removePartner(partnershipId);
    if (success) await loadPartnerships();
  };

  // Team Actions
  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) return;
    setIsCreatingTeam(true);
    const team = await PartnerService.createTeam(newTeamName.trim(), newTeamDesc.trim() || undefined);
    if (team) {
      setTeams(prev => [...prev, team]);
      setNewTeamName('');
      setNewTeamDesc('');
      setShowCreateTeam(false);
    }
    setIsCreatingTeam(false);
  };

  const handleDeleteTeam = async (teamId: string) => {
    const success = await PartnerService.deleteTeam(teamId);
    if (success) {
      setTeams(prev => prev.filter(t => t.id !== teamId));
      if (expandedTeam === teamId) setExpandedTeam(null);
    }
  };

  const handleToggleTeam = async (teamId: string) => {
    if (expandedTeam === teamId) {
      setExpandedTeam(null);
    } else {
      setExpandedTeam(teamId);
      if (!teamMembers[teamId]) {
        await loadTeamMembers(teamId);
      }
    }
  };

  const handleAddTeamMember = async (teamId: string, user: UserSearchResult) => {
    const success = await PartnerService.addTeamMember(teamId, user.id);
    if (success) {
      await loadTeamMembers(teamId);
      await loadTeams();
      setSearchQuery('');
      setShowSearchDropdown(false);
      setSearchContext(null);
    }
  };

  const handleRemoveTeamMember = async (teamId: string, memberId: string) => {
    const success = await PartnerService.removeTeamMember(memberId);
    if (success) {
      await loadTeamMembers(teamId);
      await loadTeams();
    }
  };

  const handleUpdateMemberRole = async (memberId: string, role: 'admin' | 'member', teamId: string) => {
    const success = await PartnerService.updateMemberRole(memberId, role);
    if (success) await loadTeamMembers(teamId);
  };

  const handleAcceptTeamInvite = async (teamId: string) => {
    const success = await PartnerService.acceptTeamInvite(teamId);
    if (success) {
      await loadTeams();
    }
  };

  const handleRejectTeamInvite = async (teamId: string) => {
    const success = await PartnerService.rejectTeamInvite(teamId);
    if (success) {
      setTeamInvites(prev => prev.filter(t => t.id !== teamId));
    }
  };

  // Render User Search Dropdown
  const renderSearchDropdown = (onSelect: (user: UserSearchResult) => void) => (
    <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-white/10 shadow-xl z-50 max-h-64 overflow-y-auto">
      {isSearching ? (
        <div className="p-4 flex items-center justify-center text-slate-400">
          <Loader2 className="animate-spin mr-2" size={16} />
          Searching...
        </div>
      ) : searchResults.length === 0 ? (
        <div className="p-4 text-center text-slate-400 text-sm">
          {searchQuery.length < 2 ? 'Type at least 2 characters' : 'No users found'}
        </div>
      ) : (
        searchResults.map(user => (
          <button
            key={user.id}
            onClick={() => onSelect(user)}
            className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors text-left"
          >
            <div className="w-8 h-8 shrink-0 rounded-full bg-brand-500/10 flex items-center justify-center text-brand-500">
              <User size={16} />
            </div>
            <div className="flex-1 min-w-0 overflow-hidden">
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                {user.fullName || user.email}
              </p>
              <p className="text-xs text-slate-500 truncate">{user.email}</p>
            </div>
            <span className="shrink-0 text-xs font-medium text-brand-500 bg-brand-500/10 px-2 py-1 rounded-lg">
              Connect
            </span>
          </button>
        ))
      )}
    </div>
  );

  return (
    <div className="col-span-1 lg:col-span-2 space-y-6">
      {/* Section Header */}
      <div className="flex items-center gap-2 text-xl font-bold text-slate-800 dark:text-slate-200">
        <Users className="text-brand-500" />
        <h3>Collaboration</h3>
      </div>

      {/* Partners Section */}
      <div className="bg-white/40 dark:bg-dark-surface/30 border border-slate-200 dark:border-white/5 rounded-2xl p-6 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <UserPlus size={20} className="text-brand-500" />
            Partners
          </h4>
        </div>
        
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          Add partners to share specific tasks with them. Search by email to find registered users.
        </p>

        {/* Add Partner Search */}
        <div className="relative mb-4" ref={searchRef}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} aria-hidden="true" />
            <input
              type="text"
              aria-label="Search for a partner by email"
              placeholder="Search by email..."
              value={searchContext === 'partner' ? searchQuery : ''}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSearchContext('partner');
                setShowSearchDropdown(true);
              }}
              onFocus={() => {
                setSearchContext('partner');
                setShowSearchDropdown(true);
              }}
              className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-dark-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-all placeholder-slate-400 dark:placeholder-slate-500"
            />
          </div>
          {showSearchDropdown && searchContext === 'partner' && renderSearchDropdown(handleAddPartner)}
        </div>

        {/* Partners List */}
        {isLoadingPartners ? (
          <div className="py-8 flex items-center justify-center text-slate-400">
            <Loader2 className="animate-spin mr-2" size={20} />
            Loading partners...
          </div>
        ) : partnerships.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-sm">
            No partners yet. Search by email to add your first partner.
          </div>
        ) : (
          <div className="space-y-2">
            {partnerships.map(p => (
              <div 
                key={p.id} 
                className="flex items-center justify-between gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 shrink-0 rounded-full bg-brand-500/10 flex items-center justify-center text-brand-500">
                    <User size={20} />
                  </div>
                  <div className="min-w-0 overflow-hidden">
                    <p className="font-medium text-slate-800 dark:text-slate-200 truncate">
                      {p.partnerName || p.partnerEmail}
                    </p>
                    <p className="text-xs text-slate-500 truncate">{p.partnerEmail}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 shrink-0">
                  {p.status === 'pending' ? (
                    p.isIncoming ? (
                      <>
                        <button 
                          onClick={() => handleAcceptPartner(p.id)}
                          className="p-1.5 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 dark:hover:bg-emerald-500/30 transition-colors"
                          title="Accept"
                          aria-label="Accept partner request"
                        >
                          <Check size={16} />
                        </button>
                        <button 
                          onClick={() => handleRejectPartner(p.id)}
                          className="p-1.5 rounded-lg bg-red-500/10 dark:bg-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-500/20 dark:hover:bg-red-500/30 transition-colors"
                          title="Reject"
                          aria-label="Reject partner request"
                        >
                          <X size={16} />
                        </button>
                      </>
                    ) : (
                      <span className="text-xs px-2 py-1 rounded-full bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 font-medium">
                        Pending
                      </span>
                    )
                  ) : (
                    <>
                      <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium">
                        Connected
                      </span>
                      <button 
                        onClick={() => handleRemovePartner(p.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:bg-red-500/10 dark:hover:bg-red-500/20 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                        title="Remove"
                        aria-label="Remove partner"
                      >
                        <UserMinus size={16} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Teams Section */}
      <div className="bg-white/40 dark:bg-dark-surface/30 border border-slate-200 dark:border-white/5 rounded-2xl p-6 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Users size={20} className="text-brand-500" />
            Teams
          </h4>
          <Button size="sm" onClick={() => setShowCreateTeam(true)}>
            <Plus size={16} className="mr-1" /> Create Team
          </Button>
        </div>
        
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          Create teams to collaborate with multiple people on shared tasks.
        </p>

        {/* Team Invites */}
        {teamInvites.length > 0 && (
          <div className="mb-4 p-3 rounded-xl bg-brand-500/5 border border-brand-500/20">
            <p className="text-sm font-medium text-brand-500 mb-2">Team Invites</p>
            <div className="space-y-2">
              {teamInvites.map(team => (
                <div 
                  key={team.id} 
                  className="flex items-center justify-between p-2 rounded-lg bg-white/50 dark:bg-black/20"
                >
                  <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{team.name}</span>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleAcceptTeamInvite(team.id)}
                      className="p-1.5 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 dark:hover:bg-emerald-500/30"
                      aria-label="Accept team invite"
                    >
                      <Check size={14} />
                    </button>
                    <button 
                      onClick={() => handleRejectTeamInvite(team.id)}
                      className="p-1.5 rounded-lg bg-red-500/10 dark:bg-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-500/20 dark:hover:bg-red-500/30"
                      aria-label="Reject team invite"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Create Team Modal */}
        {showCreateTeam && (
          <div className="mb-4 p-4 rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10">
            <h5 className="font-medium text-slate-800 dark:text-slate-200 mb-3">Create New Team</h5>
            <Input
              label="Team Name"
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              placeholder="e.g., Work Projects"
            />
            <div className="mt-3">
              <Input
                label="Description (optional)"
                value={newTeamDesc}
                onChange={(e) => setNewTeamDesc(e.target.value)}
                placeholder="Brief team description"
              />
            </div>
            <div className="flex gap-2 mt-4">
              <Button size="sm" onClick={handleCreateTeam} disabled={!newTeamName.trim() || isCreatingTeam}>
                {isCreatingTeam ? <Loader2 className="animate-spin mr-1" size={14} /> : null}
                Create
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowCreateTeam(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Teams List */}
        {isLoadingTeams ? (
          <div className="py-8 flex items-center justify-center text-slate-400">
            <Loader2 className="animate-spin mr-2" size={20} />
            Loading teams...
          </div>
        ) : teams.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-sm">
            No teams yet. Create a team to start collaborating.
          </div>
        ) : (
          <div className="space-y-3">
            {teams.map(team => (
              <div 
                key={team.id} 
                className="rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 overflow-hidden"
              >
                {/* Team Header */}
                <div 
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                  onClick={() => handleToggleTeam(team.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center text-brand-500">
                      <Users size={20} />
                    </div>
                    <div>
                      <p className="font-medium text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        {team.name}
                        {team.isOwner && (
                          <Crown size={14} className="text-yellow-500" title="You own this team" />
                        )}
                      </p>
                      <p className="text-xs text-slate-500">{team.memberCount} member{team.memberCount !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {team.isOwner && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDeleteTeam(team.id); }}
                        className="p-1.5 rounded-lg text-slate-400 hover:bg-red-500/10 dark:hover:bg-red-500/20 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                        title="Delete Team"
                        aria-label="Delete team"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                    {expandedTeam === team.id ? (
                      <ChevronUp size={18} className="text-slate-400" />
                    ) : (
                      <ChevronDown size={18} className="text-slate-400" />
                    )}
                  </div>
                </div>

                {/* Expanded Team Content */}
                {expandedTeam === team.id && (
                  <div className="px-4 pb-4 border-t border-slate-200 dark:border-white/5">
                    {team.description && (
                      <p className="text-sm text-slate-500 dark:text-slate-400 py-3">
                        {team.description}
                      </p>
                    )}

                    {/* Add Member (only for owners/admins) */}
                    {team.isOwner && (
                      <div className="relative py-3" ref={searchContext && typeof searchContext === 'object' && searchContext.teamId === team.id ? searchRef : undefined}>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} aria-hidden="true" />
                          <input
                            type="text"
                            aria-label={`Search for a member by email to add to ${team.name}`}
                            placeholder="Add member by email..."
                            value={searchContext && typeof searchContext === 'object' && searchContext.teamId === team.id ? searchQuery : ''}
                            onChange={(e) => {
                              setSearchQuery(e.target.value);
                              setSearchContext({ type: 'team', teamId: team.id });
                              setShowSearchDropdown(true);
                            }}
                            onFocus={() => {
                              setSearchContext({ type: 'team', teamId: team.id });
                              setShowSearchDropdown(true);
                            }}
                            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-dark-border rounded-lg pl-9 pr-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/50 placeholder-slate-400"
                          />
                        </div>
                        {showSearchDropdown && searchContext && typeof searchContext === 'object' && searchContext.teamId === team.id && 
                          renderSearchDropdown((user) => handleAddTeamMember(team.id, user))
                        }
                      </div>
                    )}

                    {/* Members List */}
                    <div className="space-y-2 pt-2">
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Members</p>
                      {!teamMembers[team.id] ? (
                        <div className="py-4 text-center text-slate-400 text-sm">
                          <Loader2 className="animate-spin inline mr-2" size={14} />
                          Loading members...
                        </div>
                      ) : teamMembers[team.id].length === 0 ? (
                        <div className="py-4 text-center text-slate-400 text-sm">
                          No members yet
                        </div>
                      ) : (
                        teamMembers[team.id].map(member => (
                          <div 
                            key={member.id}
                            className="flex items-center justify-between p-2 rounded-lg bg-white/50 dark:bg-slate-800/50"
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                                <User size={14} className="text-slate-500" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                                  {member.name || member.email}
                                </p>
                                {member.name && (
                                  <p className="text-xs text-slate-500">{member.email}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {member.status === 'pending' ? (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">
                                  Pending
                                </span>
                              ) : (
                                <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${
                                  member.role === 'admin' 
                                    ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400' 
                                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                                }`}>
                                  {member.role === 'admin' && <Shield size={10} />}
                                  {member.role}
                                </span>
                              )}
                              {team.isOwner && (
                                <button 
                                  onClick={() => handleRemoveTeamMember(team.id, member.id)}
                                  className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                                  title="Remove member"
                                  aria-label="Remove team member"
                                >
                                  <X size={14} />
                                </button>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(CollaborationSettings);
