'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const DataContext = createContext();

export const DataProvider = ({ children }) => {
    const [clients, setClients] = useState([]);
    const [allTransactions, setAllTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [user, setUser] = useState(null);

    const fetchData = useCallback(async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            setLoading(false);
            return;
        }

        const config = { headers: { Authorization: `Bearer ${token}` } };
        try {
            const [clientsRes, txRes, userRes] = await Promise.all([
                axios.get('/api/clients', config),
                axios.get('/api/transactions', config),
                axios.get('/api/auth/me', config)
            ]);
            setClients(clientsRes.data);
            setAllTransactions(txRes.data);
            setUser(userRes.data);
            setError(null);
        } catch (err) {
            console.error('Error fetching data:', err);
            setError(err.response?.data?.error || 'Failed to fetch data');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return (
        <DataContext.Provider value={{
            clients,
            setClients,
            allTransactions,
            setAllTransactions,
            loading,
            error,
            searchQuery,
            setSearchQuery,
            user,
            setUser,
            refreshData: fetchData
        }}>
            {children}
        </DataContext.Provider>
    );
};

export const useData = () => {
    const context = useContext(DataContext);
    if (!context) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
};
