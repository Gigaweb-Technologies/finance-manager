'use client';

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
    User,
    Shield,
    Bell,
    SlidersHorizontal,
    Settings,
    Eye,
    EyeOff,
    CheckCircle2,
    XCircle,
    Loader2,
} from 'lucide-react';
import { useData } from '@/lib/DataContext';

const TAB_PROFILE      = 'profile';
const TAB_SECURITY     = 'security';
const TAB_NOTIFICATIONS = 'notifications';
const TAB_SYSTEM       = 'system';

export default function SettingsPage() {
    const { user, setUser } = useData();
    const fileInputRef = useRef(null);

    // ── Profile tab state ────────────────────────────────────────────────────
    const [profile, setProfile] = useState({
        first_name: '',
        last_name: '',
        email: '',
        department: '',
        phone: '',
        photo_url: ''
    });
    const [isLoadingProfile, setIsLoadingProfile] = useState(false);
    const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
    const [profileStatus, setProfileStatus] = useState(null); // 'success' | 'error'

    // ── Security tab state ──────────────────────────────────────────────────
    const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' });
    const [showPw, setShowPw] = useState({ current: false, newPw: false, confirm: false });
    const [pwLoading, setPwLoading] = useState(false);
    const [pwStatus, setPwStatus] = useState(null); // { type: 'success'|'error', msg: string }

    // ── Active tab ──────────────────────────────────────────────────────────
    const [activeTab, setActiveTab] = useState(TAB_PROFILE);

    // Fetch profile on mount (same as legacy)
    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await axios.get('/api/user/profile', {
                    headers: { Authorization: `Bearer ${token}` }
                });

                const parts = (res.data.full_name || '').split(' ');
                setProfile({
                    first_name: parts[0] || '',
                    last_name:  parts.slice(1).join(' ') || '',
                    email:      res.data.email || '',
                    department: res.data.department || '',
                    phone:      res.data.phone || '',
                    photo_url:  res.data.photo_url || ''
                });
            } catch (err) {
                console.error('Failed to fetch profile', err);
            }
        };
        fetchProfile();
    }, []);

    // ── Handlers ─────────────────────────────────────────────────────────────
    const handlePhotoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsUploadingPhoto(true);
        const formData = new FormData();
        formData.append('photo', file);

        try {
            const token = localStorage.getItem('token');
            const res = await axios.post('/api/user/photo', formData, {
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
            });

            const newPhotoUrl = res.data.photo_url;
            setProfile(prev => ({ ...prev, photo_url: newPhotoUrl }));

            if (setUser && user) {
                const updatedUser = { ...user, photo_url: newPhotoUrl };
                setUser(updatedUser);
                localStorage.setItem('user', JSON.stringify(updatedUser));
            }
        } catch (err) {
            console.error('Failed to upload photo', err);
        } finally {
            setIsUploadingPhoto(false);
        }
    };

    const handleSaveProfile = async () => {
        setIsLoadingProfile(true);
        setProfileStatus(null);
        try {
            const token = localStorage.getItem('token');
            const full_name = `${profile.first_name} ${profile.last_name}`.trim();

            await axios.put('/api/user/profile', {
                email: profile.email,
                full_name,
                department: profile.department
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setProfileStatus('success');
            if (setUser && user) {
                const updatedUser = { ...user, email: profile.email, full_name, department: profile.department };
                setUser(updatedUser);
                localStorage.setItem('user', JSON.stringify(updatedUser));
            }
            setTimeout(() => setProfileStatus(null), 3000);
        } catch (err) {
            console.error('Failed to save profile', err);
            setProfileStatus('error');
        } finally {
            setIsLoadingProfile(false);
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        if (pwForm.newPw !== pwForm.confirm) {
            setPwStatus({ type: 'error', msg: 'New passwords do not match.' });
            return;
        }
        if (pwForm.newPw.length < 6) {
            setPwStatus({ type: 'error', msg: 'New password must be at least 6 characters.' });
            return;
        }

        setPwLoading(true);
        setPwStatus(null);
        try {
            const token = localStorage.getItem('token');
            await axios.post('/api/user/change-password', {
                current_password: pwForm.current,
                new_password: pwForm.newPw
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setPwStatus({ type: 'success', msg: 'Password changed successfully!' });
            setPwForm({ current: '', newPw: '', confirm: '' });
            setTimeout(() => setPwStatus(null), 4000);
        } catch (err) {
            setPwStatus({ type: 'error', msg: err.response?.data?.error || 'Failed to change password.' });
        } finally {
            setPwLoading(false);
        }
    };

    const TABS = [
        { id: TAB_PROFILE,       label: 'Profile Information', icon: <User size={18} /> },
        { id: TAB_SECURITY,      label: 'Security',            icon: <Shield size={18} /> },
        { id: TAB_NOTIFICATIONS, label: 'Notifications',       icon: <Bell size={18} /> },
        { id: TAB_SYSTEM,        label: 'System Preferences',  icon: <SlidersHorizontal size={18} /> },
    ];

    return (
        <div className="animate-fade">
            <div style={{ marginBottom: '2.5rem' }}>
                <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.4rem' }}>Account Settings</h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>Manage your profile, security, and system preferences.</p>
            </div>

            <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
                {/* Sidebar Nav */}
                <aside style={{
                    width: 220, flexShrink: 0,
                    background: 'white', border: '1px solid var(--border-color)',
                    borderRadius: 16, padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.25rem'
                }}>
                    {TABS.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '0.65rem',
                                padding: '0.7rem 1rem', borderRadius: 10, border: 'none',
                                background: activeTab === tab.id ? '#f5f3ff' : 'transparent',
                                color: activeTab === tab.id ? '#7c3aed' : 'var(--text-muted)',
                                fontWeight: activeTab === tab.id ? 700 : 500,
                                fontSize: '0.875rem', cursor: 'pointer', textAlign: 'left', width: '100%',
                                transition: 'all 0.15s'
                            }}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </aside>

                {/* Content panel */}
                <main style={{
                    flex: 1, background: 'white', border: '1px solid var(--border-color)',
                    borderRadius: 16, padding: '2rem'
                }} className="animate-fade">

                    {/* ── Profile Tab ──────────────────────────────── */}
                    {activeTab === TAB_PROFILE && (
                        <div>
                            <div style={{ marginBottom: '2rem' }}>
                                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '0.2rem' }}>Profile Information</h3>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Update your account details and profile picture.</p>
                            </div>

                            {/* Avatar section */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '2rem', padding: '1.25rem', background: '#f8fafc', borderRadius: 12 }}>
                                <div style={{
                                    width: 80, height: 80, borderRadius: '50%',
                                    background: '#ede9fe', border: '2px solid #e2e8f0',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    overflow: 'hidden', flexShrink: 0
                                }}>
                                    {profile.photo_url ? (
                                        <img src={profile.photo_url} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <User size={38} color="#7c3aed" />
                                    )}
                                </div>
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.25rem' }}>Profile Photo</div>
                                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>JPG, PNG or GIF. Max size 2MB.</p>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handlePhotoUpload}
                                        accept="image/jpeg,image/png,image/gif"
                                        style={{ display: 'none' }}
                                    />
                                    <button
                                        onClick={() => fileInputRef.current.click()}
                                        disabled={isUploadingPhoto}
                                        style={{
                                            background: '#7c3aed', color: 'white', border: 'none',
                                            borderRadius: 8, padding: '0.5rem 1.1rem',
                                            fontSize: '0.82rem', fontWeight: 700, cursor: isUploadingPhoto ? 'not-allowed' : 'pointer',
                                            opacity: isUploadingPhoto ? 0.7 : 1
                                        }}
                                    >
                                        {isUploadingPhoto ? 'Uploading...' : 'Change Photo'}
                                    </button>
                                </div>
                            </div>

                            {/* Form */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
                                {[['first_name','First Name','text','First name'],['last_name','Last Name','text','Last name']].map(([field, lbl, type, ph]) => (
                                    <div key={field} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                        <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{lbl}</label>
                                        <input
                                            type={type}
                                            value={profile[field]}
                                            onChange={e => setProfile({ ...profile, [field]: e.target.value })}
                                            placeholder={ph}
                                            style={{ width: '100%', padding: '0.75rem 1rem', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: '0.9rem', fontWeight: 500, color: '#1e293b', background: '#f8fafc', outline: 'none', boxSizing: 'border-box' }}
                                        />
                                    </div>
                                ))}
                            </div>

                            {[['email','Email Address','email','your@email.com'],['department','Role / Department','text','e.g. Finance Operations'],['phone','Phone Number','text','+234 801 234 5678']].map(([field, lbl, type, ph]) => (
                                <div key={field} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1.25rem' }}>
                                    <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{lbl}</label>
                                    <input
                                        type={type}
                                        value={profile[field]}
                                        onChange={e => setProfile({ ...profile, [field]: e.target.value })}
                                        placeholder={ph}
                                        style={{ width: '100%', padding: '0.75rem 1rem', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: '0.9rem', fontWeight: 500, color: '#1e293b', background: '#f8fafc', outline: 'none', boxSizing: 'border-box' }}
                                    />
                                </div>
                            ))}

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                                <div>
                                    {profileStatus === 'success' && (
                                        <span style={{ color: '#10b981', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                            <CheckCircle2 size={16} /> Profile updated successfully!
                                        </span>
                                    )}
                                    {profileStatus === 'error' && (
                                        <span style={{ color: '#e11d48', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                            <XCircle size={16} /> Failed to update profile.
                                        </span>
                                    )}
                                </div>
                                <div style={{ display: 'flex', gap: '0.75rem' }}>
                                    <button
                                        onClick={() => setActiveTab(TAB_PROFILE)}
                                        style={{ background: 'white', border: '1px solid var(--border-color)', borderRadius: 8, padding: '0.6rem 1.2rem', fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem' }}
                                    >Cancel</button>
                                    <button
                                        onClick={handleSaveProfile}
                                        disabled={isLoadingProfile}
                                        style={{
                                            background: '#7c3aed', color: 'white', border: 'none',
                                            borderRadius: 8, padding: '0.6rem 1.4rem',
                                            fontWeight: 700, cursor: isLoadingProfile ? 'not-allowed' : 'pointer',
                                            fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
                                            opacity: isLoadingProfile ? 0.8 : 1
                                        }}
                                    >
                                        {isLoadingProfile ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Saving...</> : 'Save Changes'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Security Tab ─────────────────────────────── */}
                    {activeTab === TAB_SECURITY && (
                        <div>
                            <div style={{ marginBottom: '2rem' }}>
                                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '0.2rem' }}>Security</h3>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Manage your password and account security settings.</p>
                            </div>

                            <div style={{ background: '#f8fafc', border: '1px solid var(--border-color)', borderRadius: 12, padding: '1.5rem', marginBottom: '2rem' }}>
                                <h4 style={{ fontWeight: 700, marginBottom: '1.25rem' }}>Change Password</h4>
                                <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                                    {[
                                        { key: 'current', label: 'Current Password',  placeholder: 'Enter current password' },
                                        { key: 'newPw',   label: 'New Password',       placeholder: 'Min. 6 characters' },
                                        { key: 'confirm', label: 'Confirm New Password', placeholder: 'Repeat new password' }
                                    ].map(({ key, label, placeholder }) => (
                                        <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</label>
                                            <div style={{ position: 'relative' }}>
                                                <input
                                                    type={showPw[key] ? 'text' : 'password'}
                                                    value={pwForm[key]}
                                                    onChange={e => setPwForm({ ...pwForm, [key]: e.target.value })}
                                                    placeholder={placeholder}
                                                    required
                                                    style={{ width: '100%', padding: '0.75rem 1rem', paddingRight: '2.75rem', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: '0.9rem', fontWeight: 500, color: '#1e293b', background: 'white', outline: 'none', boxSizing: 'border-box' }}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPw(s => ({ ...s, [key]: !s[key] }))}
                                                    style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}
                                                >
                                                    {showPw[key] ? <EyeOff size={16} /> : <Eye size={16} />}
                                                </button>
                                            </div>
                                        </div>
                                    ))}

                                    {pwStatus && (
                                        <div style={{
                                            padding: '0.75rem 1rem', borderRadius: 8,
                                            background: pwStatus.type === 'success' ? '#ecfdf5' : '#fff1f2',
                                            color: pwStatus.type === 'success' ? '#10b981' : '#e11d48',
                                            fontSize: '0.85rem', fontWeight: 600,
                                            display: 'flex', alignItems: 'center', gap: '0.5rem'
                                        }}>
                                            {pwStatus.type === 'success' ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
                                            {pwStatus.msg}
                                        </div>
                                    )}

                                    <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '0.5rem' }}>
                                        <button
                                            type="submit"
                                            disabled={pwLoading}
                                            style={{
                                                background: '#7c3aed', color: 'white', border: 'none',
                                                borderRadius: 8, padding: '0.65rem 1.5rem', fontWeight: 700,
                                                cursor: pwLoading ? 'not-allowed' : 'pointer', fontSize: '0.875rem',
                                                display: 'flex', alignItems: 'center', gap: '0.5rem',
                                                opacity: pwLoading ? 0.8 : 1
                                            }}
                                        >
                                            {pwLoading ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Changing...</> : 'Change Password'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* ── Notifications Tab ─────────────────────────── */}
                    {activeTab === TAB_NOTIFICATIONS && (
                        <div>
                            <div style={{ marginBottom: '2rem' }}>
                                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '0.2rem' }}>Notification Preferences</h3>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Choose how you receive alerts and updates.</p>
                            </div>
                            {[
                                { title: 'Email Alerts', desc: 'Receive daily summary of transactions via email' },
                                { title: 'System Notifications', desc: 'In-app alerts for new client deposits' },
                                { title: 'Weekly Reports', desc: 'Get a summary of your weekly performance' },
                            ].map((item, i) => (
                                <div key={i} style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    padding: '1rem 1.25rem', borderRadius: 10, border: '1px solid #f1f5f9',
                                    marginBottom: '0.75rem', background: '#fafafa'
                                }}>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{item.title}</div>
                                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{item.desc}</div>
                                    </div>
                                    <div style={{ width: 40, height: 22, background: '#7c3aed', borderRadius: 11, position: 'relative', cursor: 'pointer', flexShrink: 0 }}>
                                        <div style={{ position: 'absolute', right: 3, top: 3, width: 16, height: 16, background: 'white', borderRadius: '50%' }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* ── System Preferences Tab ──────────────────── */}
                    {activeTab === TAB_SYSTEM && (
                        <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                            <div style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
                                <Settings size={48} style={{ opacity: 0.2 }} />
                            </div>
                            <h3 style={{ fontWeight: 800 }}>System Preferences</h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>This section is currently under development.</p>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}
