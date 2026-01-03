'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { authenticatedApi } from '@/config/api';
import { io, Socket } from 'socket.io-client';

export type MaintenanceState = {
    active: boolean;
    message?: string;
    until?: string;
    updatedBy?: string;
    updatedAt?: string;
};

export const MAINTENANCE_STORAGE_KEY = 'adms:maintenance-mode';
const DEFAULT_STATE: MaintenanceState = {
    active: false,
    message: '',
    until: '',
    updatedAt: '',
    updatedBy: '',
};

const normalizeState = (incoming: Partial<MaintenanceState> | null | undefined): MaintenanceState => {
    if (!incoming) return { ...DEFAULT_STATE };
    return {
        ...DEFAULT_STATE,
        ...incoming,
        active: Boolean(incoming.active),
        message: incoming.message ?? '',
        until: incoming.until ?? '',
        updatedBy: incoming.updatedBy ?? '',
        updatedAt: incoming.updatedAt ?? '',
    };
};

const readLocalCache = (): MaintenanceState => {
    if (typeof window === 'undefined') return { ...DEFAULT_STATE };
    try {
        const raw = localStorage.getItem(MAINTENANCE_STORAGE_KEY);
        if (!raw) return { ...DEFAULT_STATE };
        const parsed = JSON.parse(raw);
        return normalizeState(parsed);
    } catch (error) {
        console.error('Failed to parse maintenance cache', error);
        return { ...DEFAULT_STATE };
    }
};

const persistLocalCache = (state: MaintenanceState) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(MAINTENANCE_STORAGE_KEY, JSON.stringify(state));
};

const getStoredToken = () => {
    if (typeof window === 'undefined') return null;
    try {
        const raw = localStorage.getItem('authData');
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return parsed?.token || null;
    } catch {
        return null;
    }
};

type SetStateArg = MaintenanceState | ((prev: MaintenanceState) => MaintenanceState);

export const useMaintenanceMode = () => {
    const [maintenance, setMaintenanceState] = useState<MaintenanceState>(() => readLocalCache());
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [lastSocketAt, setLastSocketAt] = useState<string | null>(null);
    const socketRef = useRef<Socket | null>(null);

    const applyState = useCallback((next: MaintenanceState) => {
        setMaintenanceState(next);
        persistLocalCache(next);
    }, []);

    const refreshMaintenance = useCallback(async () => {
        setLoading(true);
        try {
            const res = await authenticatedApi.get('/api/admin/maintenance');
            const payload = (res.data as any)?.data ?? res.data ?? null;
            const normalized = normalizeState(payload);
            applyState(normalized);
            return normalized;
        } catch (error) {
            console.error('Failed to fetch maintenance status', error);
            return null;
        } finally {
            setLoading(false);
        }
    }, [applyState]);

    const saveMaintenance = useCallback(async (next: SetStateArg) => {
        const computed = normalizeState(typeof next === 'function' ? (next as (prev: MaintenanceState) => MaintenanceState)(maintenance) : next);
        setSaving(true);
        try {
            const res = await authenticatedApi.put('/api/admin/maintenance', computed);
            const payload = (res.data as any)?.data ?? res.data ?? computed;
            const normalized = normalizeState(payload);
            applyState(normalized);
            return normalized;
        } catch (error) {
            console.error('Failed to update maintenance status', error);
            throw error;
        } finally {
            setSaving(false);
        }
    }, [applyState, maintenance]);

    const clearMaintenance = useCallback(async () => {
        await saveMaintenance({ ...DEFAULT_STATE, active: false });
    }, [saveMaintenance]);

    useEffect(() => {
        // Initial load from server + subscribe to storage changes
        refreshMaintenance();
        const onStorage = (event: StorageEvent) => {
            if (event.key === MAINTENANCE_STORAGE_KEY) {
                applyState(readLocalCache());
            }
        };
        window.addEventListener('storage', onStorage);
        return () => window.removeEventListener('storage', onStorage);
    }, [applyState, refreshMaintenance]);

    useEffect(() => {
        const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : '');
        const token = getStoredToken();
        try {
            const socket = io(socketUrl, { auth: token ? { token } : undefined, transports: ['websocket'] });
            socketRef.current = socket;
            socket.on('backend:maintenance', (payload: any) => {
                const normalized = normalizeState(payload);
                applyState(normalized);
                setLastSocketAt(new Date().toISOString());
            });
            socket.on('connect_error', (err) => {
                console.warn('Maintenance socket connect error', err);
            });
        } catch (error) {
            console.error('Failed to init maintenance socket', error);
        }
        return () => {
            socketRef.current?.disconnect();
        };
    }, [applyState]);

    const isActive = useMemo(() => Boolean(maintenance?.active), [maintenance?.active]);

    return {
        maintenance,
        isActive,
        loading,
        saving,
        lastSocketAt,
        refreshMaintenance,
        saveMaintenance,
        clearMaintenance,
    };
};

export default useMaintenanceMode;
