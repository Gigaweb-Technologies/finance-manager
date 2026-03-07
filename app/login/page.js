'use client';

import React, { useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { User, Lock, Loader2 } from 'lucide-react';

export default function LoginPage() {
    const [authMode, setAuthMode] = useState('login');
    const [loginForm, setLoginForm] = useState({ username: '', password: '' });
    const [authError, setAuthError] = useState('');
    const [authLoading, setAuthLoading] = useState(false);
    const router = useRouter();

    const handleAuth = async (e) => {
        e.preventDefault();
        setAuthError('');
        setAuthLoading(true);

        const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';

        try {
            const res = await axios.post(endpoint, loginForm);
            if (authMode === 'login') {
                localStorage.setItem('token', res.data.token);
                router.push('/dashboard');
            } else {
                setAuthMode('login');
                setAuthError('Registration successful! Please login.');
            }
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
                    <h2>{authMode === 'login' ? 'Welcome Back' : 'Get Started'}</h2>
                    <p>{authMode === 'login' ? 'Enter your details to access your dashboard' : 'Join FinanceBridge and manage with ease'}</p>
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
                            authMode === 'login' ? 'Sign In' : 'Create Account'
                        )}
                    </button>
                </form>

                <div className="auth-footer-premium">
                    {authMode === 'login' ? (
                        <p>
                            Don't have an account? 
                            <span onClick={() => { setAuthMode('register'); setAuthError(''); }}>Register</span>
                        </p>
                    ) : (
                        <p>
                            Already have an account? 
                            <span onClick={() => { setAuthMode('login'); setAuthError(''); }}>Sign In</span>
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
