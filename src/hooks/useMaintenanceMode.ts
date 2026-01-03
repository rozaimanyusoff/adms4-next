'use client';

import { useCallback, useEffect, useState } from 'react';

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

const parseState = (raw: string | null): MaintenanceState => {
    if (!raw) return DEFAULT_STATE;
    try {
        const parsed = JSON.parse(raw);
        return { ...DEFAULT_STATE, ...parsed, active: Boolean(parsed?.active) };
    } catch (error) {
        console.error('Failed to parse maintenance mode from storage', error);
        return DEFAULT_STATE;
    }
};

const persistState = (state: MaintenanceState) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(MAINTENANCE_STORAGE_KEY, JSON.stringify(state));
};

export const readMaintenanceState = (): MaintenanceState => {
    if (typeof window === 'undefined') return DEFAULT_STATE;
    const raw = localStorage.getItem(MAINTENANCE_STORAGE_KEY);
    return parseState(raw);
};

type SetStateArg = MaintenanceState | ((prev: MaintenanceState) => MaintenanceState);

export const useMaintenanceMode = () => {
    const [maintenance, setMaintenanceState] = useState<MaintenanceState>(DEFAULT_STATE);

    useEffect(() => {
        setMaintenanceState(readMaintenanceState());
        const handleStorage = (event: StorageEvent) => {
            if (event.key === MAINTENANCE_STORAGE_KEY) {
                setMaintenanceState(parseState(event.newValue));
            }
        };
        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, []);

    const setMaintenance = useCallback((next: SetStateArg) => {
        setMaintenanceState(prev => {
            const computed = typeof next === 'function' ? (next as (prev: MaintenanceState) => MaintenanceState)(prev) : next;
            const merged = { ...DEFAULT_STATE, ...computed };
            persistState(merged);
            return merged;
        });
    }, []);

    const clearMaintenance = useCallback(() => {
        setMaintenance(DEFAULT_STATE);
    }, [setMaintenance]);

    return {
        maintenance,
        isActive: Boolean(maintenance?.active),
        setMaintenance,
        clearMaintenance,
    };
};

export default useMaintenanceMode;
