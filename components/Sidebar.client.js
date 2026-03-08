'use client';

import React from 'react';
import {
    LayoutDashboard,
    Users,
    UserCog,
    ArrowRightLeft,
    FileText,
    Settings
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useData } from '@/lib/DataContext';

const Sidebar = () => {
    const pathname = usePathname();
    const { user } = useData();
    const isAdmin = user?.role === 'admin';

    const mainNavItems = [
        { name: 'Dashboard',    icon: <LayoutDashboard size={20} />, href: '/dashboard' },
        { name: 'Clients',      icon: <Users size={20} />,           href: '/clients' },
        { name: 'Reports',      icon: <FileText size={20} />,        href: '/reports' },
        { name: 'Transactions', icon: <ArrowRightLeft size={20} />,  href: '/transactions' },
    ];

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
                >
                    <Settings size={20} />
                    <span>Account Settings</span>
                </Link>
            </div>
        </aside>
    );
};

export default Sidebar;
