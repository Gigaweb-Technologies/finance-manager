'use client';

import React from 'react';
import {
    LayoutDashboard,
    Users,
    UserCog,
    ArrowRightLeft,
    FileText,
    Settings,
    LogOut
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useData } from '@/lib/DataContext';

const Sidebar = () => {
    const pathname = usePathname();
    const router = useRouter();
    const { user } = useData();
    const isAdmin = user?.role === 'admin';

    const mainNavItems = [
        { name: 'Dashboard',    icon: <LayoutDashboard size={20} />, href: '/dashboard' },
        { name: 'Clients',      icon: <Users size={20} />,           href: '/clients' },
        { name: 'Reports',      icon: <FileText size={20} />,        href: '/reports' },
        { name: 'Transactions', icon: <ArrowRightLeft size={20} />,  href: '/transactions' },
    ];

    const handleLogout = () => {
        localStorage.removeItem('token');
        router.push('/login');
    };

    return (
        <aside className="sidebar">
            <div className="sidebar-logo">
                <div className="sidebar-logo-icon">F</div>
                <span>FinanceBridge</span>
            </div>

            <nav className="sidebar-nav">
                {mainNavItems.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`nav-item ${pathname === item.href ? 'active' : ''}`}
                    >
                        {item.icon}
                        <span>{item.name}</span>
                    </Link>
                ))}

                {isAdmin && (
                    <Link
                        href="/users"
                        className={`nav-item ${pathname === '/users' ? 'active' : ''}`}
                        style={{ marginTop: '0.25rem' }}
                    >
                        <UserCog size={20} />
                        <span>User Management</span>
                    </Link>
                )}
            </nav>

            <div className="sidebar-footer">
                <Link
                    href="/settings"
                    className={`nav-item ${pathname === '/settings' ? 'active' : ''}`}
                    style={{ marginBottom: '0.5rem' }}
                >
                    <Settings size={20} />
                    <span>Account Settings</span>
                </Link>
                <div 
                    className="nav-item text-rose-500 hover:bg-rose-50"
                    onClick={handleLogout}
                >
                    <LogOut size={20} />
                    <span>Log Out</span>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
