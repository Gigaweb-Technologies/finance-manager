'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar.client';
import Header from '@/components/Header.client';
import { DataProvider } from '@/lib/DataContext';

export default function DashboardLayout({ children }) {
    const router = useRouter();
    const pathname = usePathname();
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
        const token = localStorage.getItem('token');
        if (!token && pathname !== '/login') {
            router.push('/login');
        }
    }, [pathname, router]);

    if (!isClient) return null;

    if (pathname === '/login') return children;

    return (
        <DataProvider>
            <div className="app-layout">
                <Sidebar />
                <main className="main-wrapper">
                    <Header />
                    <div className="content-area">
                        {children}
                    </div>
                </main>
            </div>
        </DataProvider>
    );
}
