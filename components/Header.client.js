'use client';

import React from 'react';
import { Search, Bell, User } from 'lucide-react';
import { useData } from '@/lib/DataContext';

const Header = () => {
    const { searchQuery, setSearchQuery, user } = useData();

    return (
        <header className="header-premium">
            <div className="header-search">
                <Search size={18} className="text-[#94a3b8]" />
                <input
                    type="text"
                    placeholder="Search transactions, clients, or IDs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            <div className="header-actions">
                <button className="notification-btn">
                    <Bell size={22} />
                    <div className="notification-dot"></div>
                </button>

                <div className="user-profile-header">
                    <div className="user-info">
                        <span className="user-name">{user?.full_name || 'Alex Morgan'}</span>
                        <span className="user-role">{user?.department || 'Admin Manager'}</span>
                    </div>
                    <div className="user-avatar">
                        {user?.photo_url ? (
                            <img
                                src={user.photo_url}
                                alt="Avatar"
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-slate-50 text-slate-400">
                                <User size={24} />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;
