'use client';

import React, { useState } from 'react';
import axios from 'axios';
import {
    User,
    Mail,
    Building,
    Save,
    Camera,
    Loader2,
    CheckCircle2,
    Settings as SettingsIcon,
    Shield,
    Bell
} from 'lucide-react';

import { useData } from '@/lib/DataContext';

export default function SettingsPage() {
    const { user, setUser } = useData();
    const [profileForm, setProfileForm] = useState({
        email: user?.email || '',
        full_name: user?.full_name || '',
        department: user?.department || ''
    });
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState('');

    const handleSave = async (e) => {
        e.preventDefault();
        setLoading(true);
        setSuccess('');
        const token = localStorage.getItem('token');
        try {
            await axios.put('/api/user/profile', profileForm, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUser({ ...user, ...profileForm });
            setSuccess('Profile updated successfully!');
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            console.error('Error updating profile:', err);
        } finally {
            setLoading(false);
        }
    };

    const handlePhotoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('photo', file);

        const token = localStorage.getItem('token');
        try {
            const res = await axios.post('/api/user/photo', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${token}`
                }
            });
            setUser({ ...user, photo_url: res.data.photo_url });
        } catch (err) {
            console.error('Error uploading photo:', err);
        }
    };

    return (
        <div className="animate-fade">
            <div className="mb-8">
                <h1 className="text-3xl font-extrabold text-slate-800 mb-1">System Settings</h1>
                <p className="text-slate-500 font-medium">Manage your personal profile and application preferences.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    <div className="premium-card">
                        <div className="flex items-center gap-2 mb-8">
                            <User size={20} className="text-violet-500" />
                            <h3 className="text-lg font-bold">Personal Information</h3>
                        </div>

                        {success && (
                            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-xl flex items-center gap-2 font-bold animate-fade">
                                <CheckCircle2 size={18} /> {success}
                            </div>
                        )}

                        <form onSubmit={handleSave} className="space-y-6">
                            <div className="flex flex-col md:flex-row gap-8 items-start mb-8">
                                <div className="relative group">
                                    <div className="w-24 h-24 rounded-2xl bg-slate-100 overflow-hidden border-2 border-slate-100 group-hover:border-violet-300 transition-colors">
                                        {user?.photo_url ? (
                                            <img src={user.photo_url} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-violet-50 text-violet-500">
                                                <User size={40} />
                                            </div>
                                        )}
                                    </div>
                                    <label className="absolute -bottom-2 -right-2 p-2 bg-white rounded-xl shadow-lg border border-slate-100 cursor-pointer hover:bg-violet-50 text-violet-600 transition-colors">
                                        <Camera size={16} />
                                        <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                                    </label>
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-bold text-slate-800 mb-1">Profile Photo</h4>
                                    <p className="text-sm text-slate-500 font-medium">Click the camera icon to update your profile image. PNG or JPG, max 5MB.</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="input-group">
                                    <label>Full Name</label>
                                    <div className="premium-input-wrapper">
                                        <User className="input-icon" size={18} />
                                        <input
                                            type="text"
                                            value={profileForm.full_name}
                                            onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                                            placeholder="Enter your full name"
                                        />
                                    </div>
                                </div>
                                <div className="input-group">
                                    <label>Email Address</label>
                                    <div className="premium-input-wrapper">
                                        <Mail className="input-icon" size={18} />
                                        <input
                                            type="email"
                                            value={profileForm.email}
                                            onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                                            placeholder="your.email@example.com"
                                        />
                                    </div>
                                </div>
                                <div className="input-group">
                                    <label>Department</label>
                                    <div className="premium-input-wrapper">
                                        <Building className="input-icon" size={18} />
                                        <input
                                            type="text"
                                            value={profileForm.department}
                                            onChange={(e) => setProfileForm({ ...profileForm, department: e.target.value })}
                                            placeholder="e.g. Finance Operations"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-100">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="btn-premium btn-primary-premium shadow-lg shadow-violet-100"
                                >
                                    {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={18} />}
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>

                    <div className="premium-card">
                        <h3 className="font-bold mb-4">Notification Preferences</h3>
                        <div className="space-y-4">
                            {[
                                { title: 'Email Alerts', desc: 'Receive daily summary of transactions via email', icon: <Mail size={16} /> },
                                { title: 'System Notifications', desc: 'In-app alerts for new client deposits', icon: <Bell size={16} /> }
                            ].map((item, i) => (
                                <div key={i} className="flex justify-between items-center p-4 rounded-xl border border-slate-50 hover:bg-slate-50 transition-colors">
                                    <div className="flex gap-4">
                                        <div className="w-10 h-10 rounded-lg bg-white shadow-sm flex items-center justify-center text-slate-400">
                                            {item.icon}
                                        </div>
                                        <div>
                                            <div className="font-bold text-sm text-slate-800">{item.title}</div>
                                            <div className="text-xs text-slate-400 font-medium">{item.desc}</div>
                                        </div>
                                    </div>
                                    <div className="w-10 h-5 bg-violet-600 rounded-full relative">
                                        <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full"></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="space-y-8">
                    <div className="premium-card bg-slate-900 border-none">
                        <h3 className="text-white font-bold mb-6 flex gap-2 items-center">
                            <Shield size={18} className="text-emerald-400" />
                            Security Status
                        </h3>
                        <div className="space-y-4">
                            <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700">
                                <div className="text-xs text-slate-400 font-bold uppercase mb-1">Access Level</div>
                                <div className="text-white font-bold">Administrator</div>
                            </div>
                            <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700">
                                <div className="text-xs text-slate-400 font-bold uppercase mb-1">2FA Status</div>
                                <div className="text-rose-400 font-bold">Disabled</div>
                            </div>
                            <button className="w-full py-3 rounded-xl bg-emerald-500 text-white font-bold text-sm hover:bg-emerald-600 transition-colors">
                                Enable 2FA Protection
                            </button>
                        </div>
                    </div>

                    <div className="premium-card">
                        <h3 className="font-bold mb-2 flex gap-2 items-center text-rose-600">
                            <SettingsIcon size={18} />
                            Danger Zone
                        </h3>
                        <p className="text-xs text-slate-400 font-medium mb-4">Deleting your account is permanent and cannot be undone.</p>
                        <button className="w-full py-3 border-2 border-rose-100 text-rose-500 font-bold text-sm rounded-xl hover:bg-rose-50 transition-colors">
                            Delete Account
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
