'use client';

import React, { useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { User, Lock, Loader2 } from 'lucide-react';

export default function LoginPage() {
    const [loginForm, setLoginForm] = useState({ username: '', password: '' });
    const [authError, setAuthError] = useState('');
    const [authLoading, setAuthLoading] = useState(false);
    const router = useRouter();

    const handleAuth = async (e) => {
        e.preventDefault();
        setAuthError('');
        setAuthLoading(true);

        try {
            const res = await axios.post('/api/auth/login', loginForm);
            localStorage.setItem('token', res.data.token);
            router.push('/dashboard');
        } catch (err) {
            setAuthError(err.response?.data?.error || 'Authentication failed');
        } finally {
            setAuthLoading(false);
        }
    };

    return (
        <div className="auth-page-wrapper">
            <div className="glass-card animate-fade">
                <div className="auth-header-premium">
                    <div className="sidebar-logo justify-center mb-6">
                        <div className="sidebar-logo-icon">F</div>
                        <span>FinanceBridge</span>
                    </div>
                    <h2>Welcome Back</h2>
                    <p>Enter your details to access your dashboard</p>
                </div>

                {authError && (
                    <div className="auth-error-badge">
                        <User size={18} className="flex-shrink-0" />
                        <span>{authError}</span>
                    </div>
                )}

                <form onSubmit={handleAuth} className="auth-form-premium">
                    <div className="auth-input-group">
                        <label className="auth-label">Username</label>
                        <div className="auth-input-wrapper">
                            <User className="input-icon" size={20} />
                            <input
                                type="text"
                                placeholder="Enter your username"
                                value={loginForm.username}
                                onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    <div className="auth-input-group">
                        <label className="auth-label">Password</label>
                        <div className="auth-input-wrapper">
                            <Lock className="input-icon" size={20} />
                            <input
                                type="password"
                                placeholder="••••••••"
                                value={loginForm.password}
                                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="btn-auth-full"
                        disabled={authLoading}
                    >
                        {authLoading ? (
                            <Loader2 className="animate-spin" size={20} />
                        ) : (
                            'Sign In'
                        )}
                    </button>
                </form>

                <div className="auth-footer-premium text-center mt-6">
                    <p className="text-slate-400 text-xs font-medium">
                        Access restricted to authorized personnel only.
                    </p>
                </div>
            </div>
        </div>
    );
}
