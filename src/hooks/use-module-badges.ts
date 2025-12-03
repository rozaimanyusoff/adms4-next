'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { authenticatedApi } from '@/config/api';

type BadgeCounts = Record<string, number>;

interface UseModuleBadgesOptions {
  enabled?: boolean;
  socketUrl?: string;
  maintenanceBillingPath?: string;
  // Optional polling fallback if socket is unavailable
  pollIntervalMs?: number;
}

interface MaintenanceCountsResponse {
  count?: number;
  data?: { count?: number; unseen?: number };
  unseen?: number;
}

/**
 * Lightweight hook to track badge counts for key modules.
 * - Fetches initial counts from backend.
 * - Listens to Socket.IO events to update counts live.
 * - Gracefully degrades if socket is unavailable.
 */
export function useModuleBadges(options: UseModuleBadgesOptions = {}) {
  const {
    enabled = true,
    socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000',
    maintenanceBillingPath = '/billings/mtn',
    pollIntervalMs = 0,
  } = options;

  const [counts, setCounts] = useState<BadgeCounts>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Normalize aliases so sidebar paths still match even if route name changes
  const maintenancePaths = useMemo(
    () => Array.from(new Set([maintenanceBillingPath, '/billings/mtn-bill'].filter(Boolean))),
    [maintenanceBillingPath],
  );
  const paths = useMemo(() => maintenancePaths, [maintenancePaths]);

  const setCountForPaths = useCallback((pathList: string[], value: number) => {
    setCounts((prev) => {
      const next = { ...prev };
      pathList.forEach((p) => {
        next[p] = Math.max(0, value);
      });
      return next;
    });
  }, []);

  const increment = useCallback((path: string, delta = 1) => {
    setCounts((prev) => {
      const current = prev[path] ?? 0;
      return { ...prev, [path]: Math.max(0, current + delta) };
    });
  }, []);

  const loadCounts = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const res = await authenticatedApi.get<MaintenanceCountsResponse>('/api/mtn/bills/unseen-count');
      const payload = res?.data ?? {};
      const derived =
        typeof payload.count === 'number'
          ? payload.count
          : typeof payload.unseen === 'number'
            ? payload.unseen
            : typeof payload.data?.count === 'number'
              ? payload.data.count
              : typeof payload.data?.unseen === 'number'
                ? payload.data.unseen
                : 0;
      const safeValue = Number.isFinite(derived) ? derived : 0;
      setCountForPaths(maintenancePaths, safeValue);
    } catch (e) {
      setError('Failed to load badge counts');
    } finally {
      setLoading(false);
    }
  }, [enabled, maintenancePaths, setCountForPaths]);

  useEffect(() => {
    if (!enabled) return undefined;
    let socket: Socket | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let active = true;

    // Initial fetch
    loadCounts();

    try {
      socket = io(socketUrl, { transports: ['websocket'] });
      socket.on('mtn:form-uploaded', () => {
        maintenancePaths.forEach((p) => increment(p, 1));
      });
      socket.on('mtn:counts', (payload: any) => {
        const value = payload?.maintenanceBilling ?? payload?.unseenBills ?? payload?.unseen;
        if (typeof value === 'number') {
          setCountForPaths(maintenancePaths, value);
        }
      });
      socket.on('connect_error', () => {
        if (!pollIntervalMs || pollIntervalMs <= 0) return;
        if (pollTimer) return;
        pollTimer = setInterval(() => {
          if (!active) return;
          loadCounts();
        }, pollIntervalMs);
      });
    } catch {
      // If socket initialization fails, optionally fall back to polling
      if (pollIntervalMs && pollIntervalMs > 0) {
        pollTimer = setInterval(() => {
          if (!active) return;
          loadCounts();
        }, pollIntervalMs);
      }
    }

    return () => {
      active = false;
      if (socket) socket.disconnect();
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [enabled, increment, loadCounts, maintenancePaths, pollIntervalMs, setCountForPaths, socketUrl]);

  return {
    counts,
    loading,
    error,
    refresh: loadCounts,
    paths,
  };
}
