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
        <div className="auth-overlay">
            <div className="auth-card animate-fade">
                <div className="auth-header">
                    <div className="sidebar-logo justify-center mb-4">
                        <div className="sidebar-logo-icon">F</div>
                        <span>FinanceManager</span>
                    </div>
                    <h2>{authMode === 'login' ? 'Welcome Back' : 'Create Account'}</h2>
                    <p>{authMode === 'login' ? 'Sign in to access your dashboard' : 'Start managing your finances today'}</p>
                </div>

                {authError && <div className="auth-error-badge">{authError}</div>}

                <form onSubmit={handleAuth}>
                    <div className="input-group">
                        <label>Username</label>
                        <div className="premium-input-wrapper">
                            <User className="input-icon" size={20} />
                            <input
                                type="text"
                                placeholder="Enter username"
                                value={loginForm.username}
                                onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    <div className="input-group">
                        <label>Password</label>
                        <div className="premium-input-wrapper">
                            <Lock className="input-icon" size={20} />
                            <input
                                type="password"
                                placeholder="Enter password"
                                value={loginForm.password}
                                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="btn-premium btn-primary-premium w-full justify-center"
                        disabled={authLoading}
                    >
                        {authLoading ? <Loader2 className="animate-spin" size={20} /> : (authMode === 'login' ? 'Sign In' : 'Register')}
                    </button>
                </form>

                <div className="auth-footer">
                    {authMode === 'login' ? (
                        <p>Don't have an account? <span onClick={() => setAuthMode('register')}>Register</span></p>
                    ) : (
                        <p>Already have an account? <span onClick={() => setAuthMode('login')}>Sign In</span></p>
                    )}
                </div>
            </div>
        </div>
    );
}
