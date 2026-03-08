'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useData } from '@/lib/DataContext';
import axios from 'axios';
import {
    UserCog, Plus, Trash2, KeyRound, Edit2,
    CheckCircle2, XCircle, Shield, User, Loader2, X
} from 'lucide-react';

const ROLE_META = {
    admin: { label: 'Admin',   bg: '#f5f3ff', color: '#7c3aed' },
    user:  { label: 'User',    bg: '#f0fdf4', color: '#16a34a' },
};

function RoleBadge({ role }) {
    const m = ROLE_META[role] || ROLE_META.user;
    return (
        <span style={{ background: m.bg, color: m.color, fontWeight: 700, fontSize: '0.72rem', padding: '0.2rem 0.65rem', borderRadius: 20 }}>
            {m.label}
        </span>
    );
}

export default function UsersPage() {
    const { user: currentUser } = useData();
    const router = useRouter();
    const isAdmin = currentUser?.role === 'admin';

    const [users, setUsers]             = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(true);
    const [toast, setToast]             = useState(null); // { type, msg }

    // Create user modal
    const [showCreate, setShowCreate]   = useState(false);
    const [createForm, setCreateForm]   = useState({ username: '', password: '', full_name: '', email: '', role: 'user' });
    const [creating, setCreating]       = useState(false);

    // Edit role
    const [editingRole, setEditingRole] = useState(null); // userId
    const [newRole, setNewRole]         = useState('user');
    const [savingRole, setSavingRole]   = useState(false);

    // Reset password
    const [resetUserId, setResetUserId] = useState(null);
    const [newPassword, setNewPassword] = useState('');
    const [resetting, setResetting]     = useState(false);

    // Confirm delete
    const [pendingDelete, setPendingDelete] = useState(null);

    const authHeaders = () => {
        const token = localStorage.getItem('token');
        return { headers: { Authorization: `Bearer ${token}` } };
    };

    const showToast = (type, msg) => {
        setToast({ type, msg });
        setTimeout(() => setToast(null), 3500);
    };

    const fetchUsers = async () => {
        try {
            const res = await axios.get('/api/users', authHeaders());
            setUsers(res.data);
        } catch {
            showToast('error', 'Failed to load users.');
        } finally {
            setLoadingUsers(false);
        }
    };

    useEffect(() => {
        if (!isAdmin && currentUser !== null) {
            router.replace('/dashboard');
            return;
        }
        if (isAdmin) fetchUsers();
    }, [isAdmin, currentUser]);

    const handleCreate = async (e) => {
        e.preventDefault();
        setCreating(true);
        try {
            await axios.post('/api/users', createForm, authHeaders());
            showToast('success', `User "${createForm.username}" created.`);
            setShowCreate(false);
            setCreateForm({ username: '', password: '', full_name: '', email: '', role: 'user' });
            fetchUsers();
        } catch (err) {
            showToast('error', err.response?.data?.error || 'Failed to create user.');
        } finally {
            setCreating(false);
        }
    };

    const handleSaveRole = async (userId) => {
        setSavingRole(true);
        try {
            const target = users.find(u => u.id === userId);
            await axios.put(`/api/users/${userId}`, {
                full_name: target.full_name,
                email: target.email,
                department: target.department,
                role: newRole
            }, authHeaders());
            showToast('success', 'Role updated.');
            setEditingRole(null);
            fetchUsers();
        } catch (err) {
            showToast('error', err.response?.data?.error || 'Failed to update role.');
        } finally {
            setSavingRole(false);
        }
    };

    const handleResetPassword = async () => {
        if (!newPassword || newPassword.length < 6) {
            showToast('error', 'Password must be at least 6 characters.');
            return;
        }
        setResetting(true);
        try {
            await axios.post(`/api/users/${resetUserId}/reset-password`, { new_password: newPassword }, authHeaders());
            showToast('success', 'Password reset successfully.');
            setResetUserId(null);
            setNewPassword('');
        } catch (err) {
            showToast('error', err.response?.data?.error || 'Failed to reset password.');
        } finally {
            setResetting(false);
        }
    };

    const handleDelete = async (userId) => {
        try {
            await axios.delete(`/api/users/${userId}`, authHeaders());
            showToast('success', 'User deleted.');
            setPendingDelete(null);
            fetchUsers();
        } catch (err) {
            showToast('error', err.response?.data?.error || 'Failed to delete user.');
        }
    };

    if (!isAdmin && currentUser !== null) return null;

    return (
        <div className="animate-fade">
            {/* Toast */}
            {toast && (
                <div style={{
                    position: 'fixed', top: '1.5rem', right: '1.5rem', zIndex: 9999,
                    background: toast.type === 'success' ? '#ecfdf5' : '#fff1f2',
                    color: toast.type === 'success' ? '#10b981' : '#e11d48',
                    border: `1px solid ${toast.type === 'success' ? '#a7f3d0' : '#fecdd3'}`,
                    borderRadius: 12, padding: '0.85rem 1.25rem',
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    fontWeight: 600, fontSize: '0.88rem', boxShadow: '0 8px 25px rgba(0,0,0,0.1)'
                }}>
                    {toast.type === 'success' ? <CheckCircle2 size={16}/> : <XCircle size={16}/>}
                    {toast.msg}
                </div>
            )}

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem' }}>
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-800 mb-1">User Management</h1>
                    <p className="text-slate-500 font-medium">Manage system users, roles, and access.</p>
                </div>
                <button
                    onClick={() => setShowCreate(true)}
                    className="btn-premium btn-primary-premium shadow-lg shadow-violet-200"
                >
                    <Plus size={18} /> Invite User
                </button>
            </div>

            {/* Users table */}
            <div className="premium-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <UserCog size={18} color="#7c3aed" />
                    <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>System Users</span>
                    <span style={{ marginLeft: '0.5rem', background: '#f1f5f9', color: '#64748b', fontSize: '0.72rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: 20 }}>
                        {users.length}
                    </span>
                </div>

                {loadingUsers ? (
                    <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8', fontWeight: 600 }}>
                        <Loader2 size={28} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 0.75rem' }} />
                        Loading users...
                    </div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid #f1f5f9', background: '#fafafa' }}>
                                {['User', 'Email', 'Department', 'Role', 'Joined', 'Actions'].map(h => (
                                    <th key={h} style={{ padding: '0.7rem 1.25rem', textAlign: h === 'Actions' ? 'right' : 'left', fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(u => (
                                <tr key={u.id} style={{ borderBottom: '1px solid #f8fafc', background: u.id === currentUser?.id ? '#faf9ff' : 'white' }}>
                                    <td style={{ padding: '0.9rem 1.25rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                                            <div style={{ width: 34, height: 34, borderRadius: '50%', background: u.role === 'admin' ? '#f5f3ff' : '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                {u.role === 'admin' ? <Shield size={16} color="#7c3aed" /> : <User size={16} color="#16a34a" />}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#1e293b' }}>
                                                    {u.full_name || u.username}
                                                    {u.id === currentUser?.id && <span style={{ marginLeft: '0.4rem', fontSize: '0.68rem', color: '#94a3b8', fontWeight: 600 }}>(you)</span>}
                                                </div>
                                                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>@{u.username}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ padding: '0.9rem 1.25rem', fontSize: '0.82rem', color: '#64748b' }}>{u.email || '—'}</td>
                                    <td style={{ padding: '0.9rem 1.25rem', fontSize: '0.82rem', color: '#64748b' }}>{u.department || '—'}</td>
                                    <td style={{ padding: '0.9rem 1.25rem' }}>
                                        {editingRole === u.id ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                <select
                                                    value={newRole}
                                                    onChange={e => setNewRole(e.target.value)}
                                                    style={{ border: '1px solid #e2e8f0', borderRadius: 6, padding: '0.25rem 0.5rem', fontSize: '0.8rem', fontWeight: 600 }}
                                                >
                                                    <option value="user">User</option>
                                                    <option value="admin">Admin</option>
                                                </select>
                                                <button onClick={() => handleSaveRole(u.id)} disabled={savingRole}
                                                    style={{ background: '#7c3aed', color: 'white', border: 'none', borderRadius: 5, padding: '0.25rem 0.5rem', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}>
                                                    {savingRole ? '...' : 'Save'}
                                                </button>
                                                <button onClick={() => setEditingRole(null)}
                                                    style={{ background: '#f1f5f9', color: '#374151', border: 'none', borderRadius: 5, padding: '0.25rem 0.5rem', cursor: 'pointer', fontSize: '0.75rem' }}>
                                                    ✕
                                                </button>
                                            </div>
                                        ) : (
                                            <RoleBadge role={u.role || 'user'} />
                                        )}
                                    </td>
                                    <td style={{ padding: '0.9rem 1.25rem', fontSize: '0.78rem', color: '#94a3b8' }}>
                                        {new Date(u.created_at).toLocaleDateString()}
                                    </td>
                                    <td style={{ padding: '0.9rem 1.25rem', textAlign: 'right' }}>
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem' }}>
                                            {/* Edit role */}
                                            <button
                                                onClick={() => { setEditingRole(u.id); setNewRole(u.role || 'user'); }}
                                                title="Change role"
                                                style={{ background: '#f5f3ff', color: '#7c3aed', border: 'none', borderRadius: 6, padding: '0.35rem 0.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                            ><Edit2 size={13} /></button>
                                            {/* Reset password */}
                                            <button
                                                onClick={() => { setResetUserId(u.id); setNewPassword(''); }}
                                                title="Reset password"
                                                style={{ background: '#fff7ed', color: '#ea580c', border: 'none', borderRadius: 6, padding: '0.35rem 0.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                            ><KeyRound size={13} /></button>
                                            {/* Delete */}
                                            {u.id !== currentUser?.id && (
                                                pendingDelete === u.id ? (
                                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                                                        <button onClick={() => handleDelete(u.id)} style={{ background: '#e11d48', color: 'white', border: 'none', borderRadius: 5, padding: '0.25rem 0.5rem', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}>Confirm</button>
                                                        <button onClick={() => setPendingDelete(null)} style={{ background: '#f1f5f9', color: '#374151', border: 'none', borderRadius: 5, padding: '0.25rem 0.5rem', fontSize: '0.72rem', cursor: 'pointer' }}>Cancel</button>
                                                    </span>
                                                ) : (
                                                    <button
                                                        onClick={() => setPendingDelete(u.id)}
                                                        title="Delete user"
                                                        style={{ background: '#fff1f2', color: '#e11d48', border: 'none', borderRadius: 6, padding: '0.35rem 0.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                                    ><Trash2 size={13} /></button>
                                                )
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Create User Modal */}
            {showCreate && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: 'white', borderRadius: 18, padding: '2rem', width: 420, boxShadow: '0 25px 50px rgba(0,0,0,0.2)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2 style={{ fontWeight: 800, fontSize: '1.1rem' }}>Create New User</h2>
                            <button onClick={() => setShowCreate(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {[
                                { key: 'username',  label: 'Username *',  type: 'text',     ph: 'johndoe' },
                                { key: 'password',  label: 'Password *',  type: 'password', ph: 'Min. 6 characters' },
                                { key: 'full_name', label: 'Full Name',   type: 'text',     ph: 'John Doe' },
                                { key: 'email',     label: 'Email',       type: 'email',    ph: 'john@example.com' },
                            ].map(({ key, label, type, ph }) => (
                                <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</label>
                                    <input
                                        type={type} placeholder={ph}
                                        value={createForm[key]}
                                        onChange={e => setCreateForm({ ...createForm, [key]: e.target.value })}
                                        required={['username', 'password'].includes(key)}
                                        style={{ padding: '0.7rem 0.9rem', border: '1px solid #e2e8f0', borderRadius: 9, fontSize: '0.88rem', outline: 'none' }}
                                    />
                                </div>
                            ))}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Role</label>
                                <select
                                    value={createForm.role}
                                    onChange={e => setCreateForm({ ...createForm, role: e.target.value })}
                                    style={{ padding: '0.7rem 0.9rem', border: '1px solid #e2e8f0', borderRadius: 9, fontSize: '0.88rem', fontWeight: 600, outline: 'none' }}
                                >
                                    <option value="user">User (Standard)</option>
                                    <option value="admin">Admin (Full Access)</option>
                                </select>
                            </div>
                            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                                <button type="button" onClick={() => setShowCreate(false)}
                                    style={{ flex: 1, padding: '0.7rem', border: '1px solid #e2e8f0', borderRadius: 9, fontWeight: 600, background: 'white', cursor: 'pointer' }}>
                                    Cancel
                                </button>
                                <button type="submit" disabled={creating}
                                    style={{ flex: 1, padding: '0.7rem', background: '#7c3aed', color: 'white', border: 'none', borderRadius: 9, fontWeight: 700, cursor: creating ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                                    {creating ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Creating...</> : 'Create User'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Reset Password Modal */}
            {resetUserId && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: 'white', borderRadius: 18, padding: '2rem', width: 360, boxShadow: '0 25px 50px rgba(0,0,0,0.2)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                            <h2 style={{ fontWeight: 800, fontSize: '1rem' }}>Reset Password</h2>
                            <button onClick={() => setResetUserId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={20} /></button>
                        </div>
                        <p style={{ fontSize: '0.83rem', color: '#64748b', marginBottom: '1rem' }}>
                            Set a new password for <strong>{users.find(u => u.id === resetUserId)?.username}</strong>.
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '1.25rem' }}>
                            <label style={{ fontSize: '0.73rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>New Password</label>
                            <input
                                type="password" placeholder="Min. 6 characters"
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                                style={{ padding: '0.7rem 0.9rem', border: '1px solid #e2e8f0', borderRadius: 9, fontSize: '0.88rem', outline: 'none' }}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <button onClick={() => setResetUserId(null)}
                                style={{ flex: 1, padding: '0.65rem', border: '1px solid #e2e8f0', borderRadius: 9, fontWeight: 600, background: 'white', cursor: 'pointer' }}>
                                Cancel
                            </button>
                            <button onClick={handleResetPassword} disabled={resetting}
                                style={{ flex: 1, padding: '0.65rem', background: '#ea580c', color: 'white', border: 'none', borderRadius: 9, fontWeight: 700, cursor: resetting ? 'not-allowed' : 'pointer' }}>
                                {resetting ? 'Resetting...' : 'Reset Password'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
