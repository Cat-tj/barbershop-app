'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

type UserAccount = {
  id: number
  username: string
  role: 'admin' | 'user'
  active: boolean
  created_at: string
}

type Member = {
  id: number
  name: string
  phone: string
  tier_id: number
  total_points: number
  total_spent: number
  visit_count: number
  notes?: string | null
  tier_name?: string
  color?: string
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function formatRp(n: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n)
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export default function AdminPage() {
  /* ---- data ------------------------------------------------------ */
  const [users, setUsers] = useState<UserAccount[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<{ id: number; username: string; role: string } | null>(null)

  /* ---- UI state -------------------------------------------------- */
  const [activeTab, setActiveTab] = useState<'users' | 'members'>('users')
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [memberSearch, setMemberSearch] = useState('')
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)

  /* ---- user form ------------------------------------------------- */
  const [showUserForm, setShowUserForm] = useState(false)
  const [editingUserId, setEditingUserId] = useState<number | null>(null)
  const [formUsername, setFormUsername] = useState('')
  const [formPassword, setFormPassword] = useState('')
  const [formRole, setFormRole] = useState<'admin' | 'user'>('user')

  /* ---- delete confirmation --------------------------------------- */
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; username: string } | null>(null)

  /* ---- fetch all ------------------------------------------------- */
  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [uRes, mRes] = await Promise.all([
        supabase.from('user_accounts').select('id, username, role, active, created_at').order('username'),
        supabase.from('members').select(`
          id, name, phone, tier_id, total_points, total_spent, visit_count, notes,
          member_tiers!inner (name, color)
        `).order('name'),
      ])
      if (uRes.data) setUsers(uRes.data)
      if (mRes.data) {
        setMembers(mRes.data.map((m: Record<string, unknown>) => {
          const tier = (m.member_tiers as { name: string; color: string }) || { name: 'Unknown', color: '#6b7280' }
          return {
            id: m.id as number,
            name: m.name as string,
            phone: m.phone as string,
            tier_id: m.tier_id as number,
            total_points: m.total_points as number,
            total_spent: m.total_spent as number,
            visit_count: m.visit_count as number,
            notes: m.notes as string | null,
            tier_name: tier.name,
            color: tier.color,
          }
        }))
      }
    } catch (err) {
      console.error('Failed to load admin data', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  /* ---- detect current user from cookie --------------------------- */
  useEffect(() => {
    const getCookie = (name: string) => {
      const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'))
      return match ? decodeURIComponent(match[1]) : null
    }
    const session = getCookie('session')
    if (session) {
      try {
        const payload = JSON.parse(atob(session.split('.')[1]))
        setCurrentUser({ id: payload.id, username: payload.username, role: payload.role })
      } catch {
        // ignore
      }
    }
  }, [])

  /* ---- user CRUD ------------------------------------------------- */
  const openAddUser = () => {
    setEditingUserId(null)
    setFormUsername('')
    setFormPassword('')
    setFormRole('user')
    setShowUserForm(true)
  }

  const openEditUser = (u: UserAccount) => {
    setEditingUserId(u.id)
    setFormUsername(u.username)
    setFormPassword('')
    setFormRole(u.role)
    setShowUserForm(true)
  }

  const saveUser = async () => {
    const username = formUsername.trim()
    if (!username) {
      setAlert({ type: 'error', message: 'Username is required.' })
      return
    }
    if (!editingUserId && !formPassword) {
      setAlert({ type: 'error', message: 'Password is required for new users.' })
      return
    }

    setAlert(null)
    try {
      const res = await fetch('/api/admin/users', {
        method: editingUserId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingUserId
          ? { id: editingUserId, username, role: formRole, password: formPassword || undefined }
          : { username, password: formPassword, role: formRole }
        ),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(err.error || `Server error: ${res.status}`)
      }

      setShowUserForm(false)
      fetchData()
      setAlert({ type: 'success', message: editingUserId ? 'User updated.' : 'User created.' })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save user.'
      setAlert({ type: 'error', message })
    }
  }

  const toggleUserActive = async (u: UserAccount) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: u.id, active: !u.active }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(err.error)
      }
      fetchData()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update user.'
      setAlert({ type: 'error', message })
    }
  }

  const confirmDeleteUser = (u: UserAccount) => {
    setDeleteTarget({ id: u.id, username: u.username })
  }

  const executeDeleteUser = async () => {
    if (!deleteTarget) return
    try {
      const res = await fetch(`/api/admin/users/${deleteTarget.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(err.error)
      }
      setDeleteTarget(null)
      fetchData()
      setAlert({ type: 'success', message: `User "${deleteTarget.username}" deleted.` })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete user.'
      setAlert({ type: 'error', message })
    }
  }

  /* ---- member notes update --------------------------------------- */
  const updateMemberNotes = async (memberId: number, notes: string) => {
    try {
      await supabase.from('members').update({ notes }).eq('id', memberId)
      if (selectedMember && selectedMember.id === memberId) {
        setSelectedMember({ ...selectedMember, notes })
      }
      fetchData()
    } catch {
      setAlert({ type: 'error', message: 'Failed to update notes.' })
    }
  }

  /* ---- filtered members ------------------------------------------ */
  const filteredMembers = members.filter(m => {
    if (!memberSearch.trim()) return true
    const q = memberSearch.toLowerCase()
    return m.name.toLowerCase().includes(q) || m.phone.includes(q)
  })

  /* ---- loading --------------------------------------------------- */
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-zinc-500 text-sm">Loading admin panel…</span>
        </div>
      </div>
    )
  }

  /* ---- render ---------------------------------------------------- */
  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Alert */}
      {alert && (
        <div className={`mx-4 mt-3 px-4 py-3 rounded-lg text-sm font-medium flex items-center justify-between ${
          alert.type === 'success'
            ? 'bg-emerald-900/40 border border-emerald-700 text-emerald-300'
            : 'bg-red-900/40 border border-red-700 text-red-300'
        }`}>
          <span>{alert.message}</span>
          <button onClick={() => setAlert(null)} className="ml-3 text-zinc-400 hover:text-zinc-200 text-lg leading-none">&times;</button>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-5 w-80 space-y-4">
            <p className="text-sm text-zinc-200">
              Delete user <span className="font-semibold text-amber-400">{deleteTarget.username}</span>?
            </p>
            <p className="text-xs text-zinc-500">This action cannot be undone.</p>
            {currentUser && currentUser.id === deleteTarget.id && (
              <p className="text-xs text-red-400 font-medium">Cannot delete yourself!</p>
            )}
            <div className="flex gap-2">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 h-9 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-zinc-300 hover:bg-zinc-700 transition-colors">Cancel</button>
              <button
                onClick={executeDeleteUser}
                disabled={currentUser?.id === deleteTarget.id}
                className="flex-1 h-9 rounded-lg bg-red-600 hover:bg-red-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-sm text-white font-medium transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
        <h1 className="text-base font-bold tracking-tight text-zinc-100">Admin Panel</h1>
        {activeTab === 'users' && (
          <button
            onClick={openAddUser}
            className="h-9 px-4 rounded-lg bg-amber-500 hover:bg-amber-600 text-zinc-950 text-xs font-semibold transition-colors"
          >
            + Add User
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-800">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
            activeTab === 'users' ? 'text-amber-500 border-b-2 border-amber-500 bg-zinc-800/40' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Users
        </button>
        <button
          onClick={() => setActiveTab('members')}
          className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
            activeTab === 'members' ? 'text-amber-500 border-b-2 border-amber-500 bg-zinc-800/40' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Members
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* ---- Users Tab ---- */}
        {activeTab === 'users' && (
          <>
            {/* User form modal */}
            {showUserForm && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
                <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-5 w-80 space-y-3">
                  <h3 className="text-sm font-semibold text-zinc-200">{editingUserId ? 'Edit User' : 'Add User'}</h3>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Username</label>
                    <input
                      value={formUsername}
                      onChange={e => setFormUsername(e.target.value)}
                      className="w-full h-9 px-3 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500/50"
                      placeholder="Username"
                      disabled={!!editingUserId}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Password{editingUserId ? ' (leave blank to keep)' : ''}</label>
                    <input
                      type="password"
                      value={formPassword}
                      onChange={e => setFormPassword(e.target.value)}
                      className="w-full h-9 px-3 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500/50"
                      placeholder={editingUserId ? '••••••••' : 'Password'}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Role</label>
                    <select
                      value={formRole}
                      onChange={e => setFormRole(e.target.value as 'admin' | 'user')}
                      className="w-full h-9 px-3 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-amber-500/50"
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={saveUser} className="flex-1 h-9 rounded-lg bg-amber-500 hover:bg-amber-600 text-zinc-950 text-xs font-semibold transition-colors">
                      {editingUserId ? 'Update' : 'Create'}
                    </button>
                    <button onClick={() => setShowUserForm(false)} className="h-9 px-4 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-xs transition-colors">Cancel</button>
                  </div>
                </div>
              </div>
            )}

            {/* Users table */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-800/40">
                    <th className="text-left px-3 py-2 text-xs font-medium text-zinc-500 uppercase">Username</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-zinc-500 uppercase">Role</th>
                    <th className="text-center px-3 py-2 text-xs font-medium text-zinc-500 uppercase">Active</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-zinc-500 uppercase">Created</th>
                    <th className="text-center px-3 py-2 text-xs font-medium text-zinc-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {users.length === 0 && (
                    <tr><td colSpan={5} className="px-3 py-6 text-center text-xs text-zinc-600">No users found.</td></tr>
                  )}
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="px-3 py-2.5 text-xs font-medium text-zinc-200">
                        {u.username}
                        {currentUser?.id === u.id && <span className="ml-2 text-[10px] text-amber-500">(you)</span>}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`text-[11px] px-1.5 py-0.5 rounded ${u.role === 'admin' ? 'bg-amber-900/30 text-amber-400' : 'bg-zinc-700/50 text-zinc-400'}`}>{u.role}</span>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <button
                          onClick={() => toggleUserActive(u)}
                          className={`relative inline-flex h-6 w-10 items-center rounded-full transition-colors focus:outline-none ${
                            u.active ? 'bg-emerald-600' : 'bg-zinc-600'
                          }`}
                        >
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            u.active ? 'translate-x-5' : 'translate-x-1'
                          }`} />
                        </button>
                      </td>
                      <td className="px-3 py-2.5 text-[11px] text-zinc-500">{new Date(u.created_at).toLocaleDateString('id-ID')}</td>
                      <td className="px-3 py-2.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => openEditUser(u)} className="h-7 w-7 inline-flex items-center justify-center rounded hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors text-xs">✎</button>
                          <button onClick={() => confirmDeleteUser(u)} className="h-7 w-7 inline-flex items-center justify-center rounded hover:bg-red-900/40 text-zinc-500 hover:text-red-400 transition-colors text-sm">&times;</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ---- Members Tab ---- */}
        {activeTab === 'members' && (
          <>
            {/* Search */}
            <div>
              <input
                type="text"
                value={memberSearch}
                onChange={e => setMemberSearch(e.target.value)}
                placeholder="Search by name or phone..."
                className="w-full h-9 px-3 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500/50"
              />
            </div>

            {/* Members table */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-800/40">
                    <th className="text-left px-3 py-2 text-xs font-medium text-zinc-500 uppercase">Name</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-zinc-500 uppercase">Phone</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-zinc-500 uppercase">Tier</th>
                    <th className="text-right px-3 py-2 text-xs font-medium text-zinc-500 uppercase">Points</th>
                    <th className="text-right px-3 py-2 text-xs font-medium text-zinc-500 uppercase">Spent</th>
                    <th className="text-right px-3 py-2 text-xs font-medium text-zinc-500 uppercase">Visits</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {filteredMembers.length === 0 && (
                    <tr><td colSpan={6} className="px-3 py-6 text-center text-xs text-zinc-600">No members found.</td></tr>
                  )}
                  {filteredMembers.map(m => (
                    <tr
                      key={m.id}
                      onClick={() => setSelectedMember(selectedMember?.id === m.id ? null : m)}
                      className={`hover:bg-zinc-800/30 transition-colors cursor-pointer ${
                        selectedMember?.id === m.id ? 'bg-zinc-800/40 border-l-2 border-l-amber-500' : ''
                      }`}
                    >
                      <td className="px-3 py-2.5 text-xs font-medium text-zinc-200">{m.name}</td>
                      <td className="px-3 py-2.5 text-xs text-zinc-400 font-mono">{m.phone}</td>
                      <td className="px-3 py-2.5">
                        <span
                          className="text-[11px] px-1.5 py-0.5 rounded font-medium"
                          style={{ backgroundColor: `${m.color || '#6b7280'}20`, color: m.color || '#9ca3af' }}
                        >
                          {m.tier_name || '—'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-emerald-400 text-right tabular-nums font-medium">{m.total_points.toLocaleString()}</td>
                      <td className="px-3 py-2.5 text-xs text-zinc-300 text-right tabular-nums">{formatRp(m.total_spent)}</td>
                      <td className="px-3 py-2.5 text-xs text-zinc-300 text-right tabular-nums">{m.visit_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Selected member detail */}
            {selectedMember && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-zinc-100">{selectedMember.name}</h3>
                    <p className="text-xs text-zinc-500 font-mono">{selectedMember.phone}</p>
                  </div>
                  <span
                    className="text-[11px] px-2 py-0.5 rounded font-medium"
                    style={{ backgroundColor: `${selectedMember.color || '#6b7280'}20`, color: selectedMember.color || '#9ca3af' }}
                  >
                    {selectedMember.tier_name}
                  </span>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-zinc-800 rounded-lg p-2 text-center">
                    <div className="text-[10px] text-zinc-500">Points</div>
                    <div className="text-sm font-bold text-emerald-400 tabular-nums">{selectedMember.total_points.toLocaleString()}</div>
                  </div>
                  <div className="bg-zinc-800 rounded-lg p-2 text-center">
                    <div className="text-[10px] text-zinc-500">Spent</div>
                    <div className="text-sm font-bold text-zinc-200 tabular-nums">{formatRp(selectedMember.total_spent)}</div>
                  </div>
                  <div className="bg-zinc-800 rounded-lg p-2 text-center">
                    <div className="text-[10px] text-zinc-500">Visits</div>
                    <div className="text-sm font-bold text-zinc-200 tabular-nums">{selectedMember.visit_count}</div>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Notes</label>
                  <textarea
                    value={selectedMember.notes || ''}
                    onChange={e => {
                      const val = e.target.value
                      setSelectedMember({ ...selectedMember, notes: val })
                    }}
                    onBlur={e => updateMemberNotes(selectedMember.id, e.target.value)}
                    rows={3}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500/50 resize-none"
                    placeholder="Add notes about this member..."
                  />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
