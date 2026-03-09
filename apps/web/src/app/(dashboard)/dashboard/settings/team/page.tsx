'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, X, Users, Crown, Shield, Eye, Loader2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  joinedAt: string;
}

const roleColors: Record<string, string> = {
  owner: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  admin: 'bg-primary/10 text-primary border-primary/20',
  member: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  viewer: 'bg-muted text-muted-foreground border-border',
};

const roleIcons: Record<string, typeof Crown> = {
  owner: Crown,
  admin: Shield,
  member: Users,
  viewer: Eye,
};

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');
  const [inviting, setInviting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchMembers = useCallback(async () => {
    try {
      const res = await apiFetch<{ data: TeamMember[] }>('/dashboard/team/members');
      setMembers(res.data ?? []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load team members');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  async function inviteMember() {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setError(null);
    setSuccessMsg(null);
    try {
      await apiFetch<{ id: string; email: string; role: string; expires_at: string }>(
        '/dashboard/team/invite',
        {
          method: 'POST',
          body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
        }
      );
      setSuccessMsg(`Invitation sent to ${inviteEmail.trim()}`);
      setInviteEmail('');
      setInviteRole('member');
      setShowInvite(false);
      // Refresh in case the user is already signed up and was auto-added
      await fetchMembers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invitation');
    } finally {
      setInviting(false);
    }
  }

  async function removeMember(id: string) {
    setRemovingId(id);
    setError(null);
    setSuccessMsg(null);
    try {
      await apiFetch(`/dashboard/team/members/${id}`, { method: 'DELETE' });
      setMembers((prev) => prev.filter((m) => m.id !== id));
      setSuccessMsg('Member removed');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove member');
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Team Members</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage who has access to your AuditKit workspace.
          </p>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 transition-all btn-shimmer"
        >
          <Plus className="h-4 w-4" />
          Invite Member
        </button>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
          {error}
        </div>
      )}
      {successMsg && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
          {successMsg}
        </div>
      )}

      {/* Invite Form */}
      {showInvite && (
        <div className="border border-border/60 rounded-xl bg-card p-6 mb-6 shadow-lg shadow-black/10">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-semibold text-lg">Invite Team Member</h3>
            <button
              onClick={() => setShowInvite(false)}
              className="w-8 h-8 rounded-lg hover:bg-secondary flex items-center justify-center transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <input
                type="email"
                placeholder="colleague@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && inviteMember()}
                className="w-full px-3.5 py-2.5 text-sm bg-secondary/50 border border-border/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/40 transition-all"
                disabled={inviting}
              />
            </div>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as 'admin' | 'member')}
              className="px-3.5 py-2.5 text-sm bg-secondary/50 border border-border/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
              disabled={inviting}
            >
              <option value="admin">Admin</option>
              <option value="member">Member</option>
            </select>
            <button
              onClick={inviteMember}
              disabled={inviting || !inviteEmail.trim()}
              className="bg-primary text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {inviting && <Loader2 className="h-4 w-4 animate-spin" />}
              Send Invite
            </button>
          </div>
        </div>
      )}

      {/* Members List */}
      <div className="border border-border/60 rounded-xl bg-card overflow-hidden shadow-lg shadow-black/10">
        <div className="divide-y divide-border/40">
          {loading ? (
            <div className="p-12 text-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Loading team members...</p>
            </div>
          ) : members.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No team members yet. Invite someone to get started.</p>
            </div>
          ) : members.map((member) => {
            const RoleIcon = roleIcons[member.role] || Users;
            return (
              <div
                key={member.id}
                className="flex items-center gap-4 p-5 hover:bg-secondary/10 transition-all group"
              >
                {/* Avatar */}
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-purple-500/20 border border-border/60 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-primary">{getInitials(member.name)}</span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5">
                    <p className="font-semibold text-sm">{member.name}</p>
                    {member.role === 'owner' && (
                      <Crown className="h-3.5 w-3.5 text-amber-400" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground/60 mt-0.5">{member.email}</p>
                </div>

                {/* Role Badge */}
                <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider border ${roleColors[member.role] || roleColors.member}`}>
                  <span className="flex items-center gap-1">
                    <RoleIcon className="h-3 w-3" />
                    {member.role}
                  </span>
                </span>

                {/* Joined Date */}
                <div className="text-right shrink-0">
                  <p className="text-xs text-muted-foreground/50">
                    Joined {new Date(member.joinedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>

                {/* Remove */}
                <div className="shrink-0">
                  {member.role !== 'owner' ? (
                    <button
                      onClick={() => removeMember(member.id)}
                      disabled={removingId === member.id}
                      className="p-2 text-muted-foreground/40 hover:text-destructive transition rounded-lg hover:bg-secondary opacity-0 group-hover:opacity-100 disabled:opacity-50"
                      title="Remove member"
                    >
                      {removingId === member.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  ) : (
                    <div className="w-8" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
