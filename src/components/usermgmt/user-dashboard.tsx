'use client';

import React, { useContext, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AuthContext } from '@/store/AuthContext';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { authenticatedApi } from '@/config/api';

const DEFAULT_AVATAR = '/assets/images/profile-34.jpeg';

const formatLastActivity = (value: string | null | undefined) => {
    if (!value) return 'No activity recorded.';
    return value;
};

const formatDateTime = (value: string | null | undefined) => {
    if (!value) return '—';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleString();
};

const formatTimeSpent = (raw: number | string | null | undefined) => {
    if (raw == null) return '—';
    const seconds = typeof raw === 'string' ? Number(raw) : raw;
    if (!Number.isFinite(seconds) || seconds < 0) return '—';
    const totalSeconds = Math.floor(seconds);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
};

type AssetAssignmentSummary = {
    total: number;
    pending: number;
    accepted: number;
};

type AssetAssignmentLatest = {
    id: number;
    transfer_id: number;
    effective_date: string | null;
    acceptance_date: string | null;
    asset_id: number;
    transfer_date: string | null;
};

type PoolcarSummary = {
    total: number;
    pending: number;
    approved: number;
    returned: number;
    cancelled: number;
    rejected: number;
};

type MaintenanceSummary = {
    total: number;
    pending: number;
    verified: number;
    recommended: number;
    approved: number;
    rejected: number;
    cancelled: number;
};

type MySummon = {
    smn_id: number;
    summon_no?: string;
    summon_date?: string;
    summon_agency?: string;
    summon_amt?: string;
    summon_loc?: string;
    type_of_summon?: string;
    receipt_date?: string;
    asset?: { register_number?: string };
    employee?: { full_name?: string };
};

type MyAsset = {
    id: number;
    asset_id?: number;
    entry_code?: string;
    register_number?: string;
    type_name?: string;
    category_name?: string;
    brand_name?: string;
    model_name?: string;
    department_name?: string;
    costcenter_name?: string;
    location_name?: string;
    condition_status?: string;
    record_status?: string;
    purpose?: string;
    age?: number;
    purchase_year?: number;
    [key: string]: unknown;
};

const Shimmer: React.FC<{ className?: string }> = ({ className = '' }) => (
    <div className={`animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700 ${className}`} />
);

const getAssetAccent = (typeName?: string): string => {
    const key = (typeName ?? '').toLowerCase();
    if (key.includes('computer')) return 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800/40';
    if (key.includes('vehicle')) return 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/40';
    if (key.includes('test')) return 'bg-violet-50 text-violet-600 border-violet-200 dark:bg-violet-900/20 dark:text-violet-400 dark:border-violet-800/40';
    if (key.includes('machine') || key.includes('machinery')) return 'bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800/40';
    return 'bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
};

const getConditionBadge = (status?: string): string => {
    const key = (status ?? '').toLowerCase();
    if (key === 'in-use') return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
    if (key.includes('maintenance')) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
    if (key === 'damaged') return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
};

const AssetTypeIcon: React.FC<{ typeName?: string }> = ({ typeName }) => {
    const key = (typeName ?? '').toLowerCase();

    if (key.includes('computer')) {
        return (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-10 w-10">
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <path d="M8 21h8M12 17v4" />
            </svg>
        );
    }
    if (key.includes('vehicle')) {
        return (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-10 w-10">
                <path d="M5 17H3a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1l2-4h10l2 4h1a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-2" />
                <circle cx="7" cy="17" r="2" />
                <circle cx="17" cy="17" r="2" />
            </svg>
        );
    }
    if (key.includes('test')) {
        return (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-10 w-10">
                <path d="M14.5 2v17.5c0 1.4-1.1 2.5-2.5 2.5s-2.5-1.1-2.5-2.5V2" />
                <path d="M8.5 2h7" />
                <path d="M14.5 16h-5" />
            </svg>
        );
    }
    if (key.includes('machine') || key.includes('machinery')) {
        return (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-10 w-10">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" />
            </svg>
        );
    }
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-10 w-10">
            <rect x="2" y="7" width="20" height="14" rx="2" />
            <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
        </svg>
    );
};

const formatDate = (value: string | null | undefined) => {
    if (!value) return '—';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleDateString();
};

const UserDashboard: React.FC = () => {
    const authContext = useContext(AuthContext);
    const user = authContext?.authData?.user;
    const [assetSummary, setAssetSummary] = useState<AssetAssignmentSummary | null>(null);
    const [assetLatest, setAssetLatest] = useState<AssetAssignmentLatest | null>(null);
    const [assetLoading, setAssetLoading] = useState(false);
    const [assetError, setAssetError] = useState<string | null>(null);
    const [poolcarSummary, setPoolcarSummary] = useState<PoolcarSummary | null>(null);
    const [maintenanceSummary, setMaintenanceSummary] = useState<MaintenanceSummary | null>(null);
    const [appLoading, setAppLoading] = useState(false);
    const [appError, setAppError] = useState<string | null>(null);
    const [myAssets, setMyAssets] = useState<MyAsset[]>([]);
    const [myAssetsLoading, setMyAssetsLoading] = useState(false);
    const [myAssetsError, setMyAssetsError] = useState<string | null>(null);
    const [showAllAssets, setShowAllAssets] = useState(false);
    const ASSETS_DEFAULT_LIMIT = 3;
    const [mySummons, setMySummons] = useState<MySummon[]>([]);
    const [mySummonsLoading, setMySummonsLoading] = useState(false);
    const [mySummonsError, setMySummonsError] = useState<string | null>(null);
    const [showAllSummons, setShowAllSummons] = useState(false);
    const SUMMONS_DEFAULT_LIMIT = 5;

    const greetingName = useMemo(() => user?.name || user?.username || 'User', [user?.name, user?.username]);
    const lastActivity = useMemo(() => formatLastActivity(user?.lastNav), [user?.lastNav]);
    const lastLogin = useMemo(() => formatDateTime(user?.lastLogin ?? null), [user?.lastLogin]);
    const timeSpent = useMemo(() => formatTimeSpent(user?.timeSpent ?? null), [user?.timeSpent]);
    const avatarSrc = useMemo(
        () => user?.avatar || user?.profile?.profileImage || user?.profile?.profile_image_url || DEFAULT_AVATAR,
        [user?.avatar, user?.profile?.profileImage, user?.profile?.profile_image_url]
    );

    useEffect(() => {
        if (!user?.username) {
            setAssetSummary(null);
            setAssetLatest(null);
            setAssetError(null);
            setAssetLoading(false);
            return;
        }

        let isActive = true;
        setAssetLoading(true);
        setAssetError(null);

        (async () => {
            try {
                const res = await authenticatedApi.get('/api/assets/transfers/items/summary', {
                    params: { new_owner: user.username },
                });
                const payload = (res as any)?.data?.data ?? (res as any)?.data ?? {};
                if (!isActive) return;
                setAssetSummary(payload?.summary ?? null);
                setAssetLatest(payload?.latest ?? null);
            } catch (error) {
                if (!isActive) return;
                setAssetSummary(null);
                setAssetLatest(null);
                setAssetError('Unable to load asset assignment summary.');
            } finally {
                if (isActive) setAssetLoading(false);
            }
        })();

        return () => {
            isActive = false;
        };
    }, [user?.username]);

    useEffect(() => {
        if (!user?.username) {
            setPoolcarSummary(null);
            setMaintenanceSummary(null);
            setAppError(null);
            setAppLoading(false);
            return;
        }

        let isActive = true;
        setAppLoading(true);
        setAppError(null);

        (async () => {
            try {
                const [poolcarRes, maintenanceRes] = await Promise.all([
                    authenticatedApi.get('/api/mtn/poolcars', { params: { ramco: user.username } }),
                    authenticatedApi.get('/api/mtn/request', { params: { ramco: user.username } }),
                ]);

                const poolcarPayload = (poolcarRes as any)?.data ?? {};
                const maintenancePayload = (maintenanceRes as any)?.data ?? {};

                if (!isActive) return;
                setPoolcarSummary(poolcarPayload?.summary ?? null);
                setMaintenanceSummary(maintenancePayload?.summary ?? null);
            } catch (error) {
                if (!isActive) return;
                setPoolcarSummary(null);
                setMaintenanceSummary(null);
                setAppError('Unable to load application summaries.');
            } finally {
                if (isActive) setAppLoading(false);
            }
        })();

        return () => {
            isActive = false;
        };
    }, [user?.username]);

    useEffect(() => {
        if (!user?.username) {
            setMyAssets([]);
            setMyAssetsError(null);
            setMyAssetsLoading(false);
            return;
        }

        let isActive = true;
        setMyAssetsLoading(true);
        setMyAssetsError(null);

        (async () => {
            try {
                const res = await authenticatedApi.get('/api/assets', {
                    params: { ramco_id: user.username },
                });
                const data = (res as any)?.data?.data ?? (res as any)?.data ?? [];
                if (!isActive) return;
                setMyAssets(Array.isArray(data) ? data : []);
            } catch {
                if (!isActive) return;
                setMyAssets([]);
                setMyAssetsError('Unable to load assigned assets.');
            } finally {
                if (isActive) setMyAssetsLoading(false);
            }
        })();

        return () => {
            isActive = false;
        };
    }, [user?.username]);

    useEffect(() => {
        if (!user?.username) {
            setMySummons([]);
            setMySummonsError(null);
            setMySummonsLoading(false);
            return;
        }
        let isActive = true;
        setMySummonsLoading(true);
        setMySummonsError(null);
        (async () => {
            try {
                const res = await authenticatedApi.get('/api/compliance/summon', {
                    params: { username: user.username },
                });
                const data = (res as any)?.data?.data ?? (res as any)?.data ?? [];
                if (!isActive) return;
                setMySummons(Array.isArray(data) ? data : []);
            } catch {
                if (!isActive) return;
                setMySummons([]);
                setMySummonsError('Unable to load summon records.');
            } finally {
                if (isActive) setMySummonsLoading(false);
            }
        })();
        return () => { isActive = false; };
    }, [user?.username]);

    const summonPending = mySummons.filter(s => !s.receipt_date).length;
    const summonPaid = mySummons.filter(s => !!s.receipt_date).length;

    if (!user) {
        return <div className="rounded-md bg-slate-100 p-4 text-sm text-slate-600 dark:bg-slate-900 dark:text-slate-300">Dashboard data is not available.</div>;
    }

    return (
        <div className="space-y-5">

            {/* ── Welcome Banner ─────────────────────────────────────── */}
            <div className="panel relative overflow-hidden rounded-2xl bg-linear-to-br from-primary to-primary/80 shadow-lg dark:from-slate-800 dark:to-slate-900 dark:ring-1 dark:ring-slate-700">
                <div className="pointer-events-none absolute -right-12 -top-12 h-56 w-56 rounded-full bg-white/5" />
                <div className="pointer-events-none absolute -bottom-10 left-1/3 h-36 w-36 rounded-full bg-white/5" />
                <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/50 dark:text-slate-500">Personal Dashboard</p>
                        <h1 className="mt-1 text-2xl font-bold text-white dark:text-slate-100">Welcome back, {greetingName}</h1>
                        <div className="mt-4 grid gap-2 sm:grid-cols-3">
                            {[
                                { label: 'Last Login', value: lastLogin },
                                { label: 'Time Spent', value: timeSpent },
                                { label: 'Last Activity', value: lastActivity },
                            ].map(({ label, value }) => (
                                <div key={label} className="rounded-xl bg-white/10 px-3.5 py-2.5 backdrop-blur-sm dark:bg-white/5 dark:ring-1 dark:ring-slate-700">
                                    <p className="text-[10px] font-semibold uppercase tracking-widest text-white/55 dark:text-slate-500">{label}</p>
                                    <p className="mt-0.5 break-all text-sm font-semibold text-white dark:text-slate-200">{value}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                    {/* ⑨ avatar card with name + role */}
                    <div className="flex shrink-0 flex-col items-center gap-2.5">
                        <div className="relative h-16 w-16 overflow-hidden rounded-full ring-4 ring-white/25 shadow-lg dark:ring-slate-600">
                            <Image src={avatarSrc} alt="User avatar" fill className="object-cover" unoptimized />
                        </div>
                        <div className="text-center">
                            <p className="text-sm font-semibold leading-tight text-white dark:text-slate-200">{user?.name || user?.username}</p>
                            {(user as any)?.profile?.department_name && (
                                <p className="text-[10px] text-white/55 dark:text-slate-500">{(user as any).profile.department_name}</p>
                            )}
                        </div>
                        <Link href="/users/profile">
                            <Button variant="outline" className="inline-flex items-center gap-1.5 rounded-lg border-white/25 bg-white/10 text-xs text-white backdrop-blur-sm hover:bg-white/20 hover:text-white dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:hover:text-white">
                                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                Edit Profile
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>

            {/* ── My Summons ─────────────────────────────────────────── */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-start justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
                    <div>
                        <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
                            My Summons
                            {!mySummonsLoading && mySummons.length > 0 && (
                                <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-600 dark:bg-red-900/30 dark:text-red-400">
                                    {mySummons.length}
                                </span>
                            )}
                        </h2>
                        <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                            {mySummonsLoading
                                ? 'Loading summons...'
                                : `${summonPending} pending · ${summonPaid} paid`}
                        </p>
                    </div>
                    {!mySummonsLoading && mySummons.length > SUMMONS_DEFAULT_LIMIT && (
                        <button
                            onClick={() => setShowAllSummons((v) => !v)}
                            className="shrink-0 text-xs font-semibold text-primary hover:underline"
                        >
                            {showAllSummons ? 'Show less ↑' : `View all (${mySummons.length}) →`}
                        </button>
                    )}
                </div>
                <div className="p-6">
                    {mySummonsLoading ? (
                        <div className="space-y-2">
                            {[0, 1, 2].map((i) => (
                                <div key={i} className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
                                    <Shimmer className="mb-2 h-3 w-32" />
                                    <Shimmer className="h-2.5 w-48" />
                                </div>
                            ))}
                        </div>
                    ) : mySummonsError ? (
                        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-amber-200 py-8 text-center dark:border-amber-800/40">
                            <svg className="h-8 w-8 text-amber-300 dark:text-amber-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                            <p className="text-sm font-medium text-amber-600 dark:text-amber-400">{mySummonsError}</p>
                        </div>
                    ) : mySummons.length === 0 ? (
                        <div className="flex flex-col items-center gap-2 py-10 text-center">
                            <div className="rounded-2xl border border-dashed border-slate-200 p-5 dark:border-slate-700">
                                <svg className="h-10 w-10 text-slate-300 dark:text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/></svg>
                            </div>
                            <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">No summon records</p>
                            <p className="text-xs text-slate-400 dark:text-slate-500">Summons assigned to you will appear here.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {summonPending > 0 && (
                                <div className="mb-3 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-800/40 dark:bg-red-900/15">
                                    <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-red-500" />
                                    <p className="text-sm text-red-800 dark:text-red-300">
                                        You have {summonPending} unpaid summon{summonPending !== 1 ? 's' : ''}.{' '}
                                        <Link href="/compliance/summon" className="font-semibold underline underline-offset-2 hover:no-underline">
                                            View now
                                        </Link>
                                    </p>
                                </div>
                            )}
                            {(showAllSummons ? mySummons : mySummons.slice(0, SUMMONS_DEFAULT_LIMIT)).map((s) => {
                                const paid = !!s.receipt_date;
                                const dateStr = s.summon_date ? new Date(s.summon_date).toLocaleDateString() : '—';
                                return (
                                    <div key={s.smn_id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/60">
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                                                {s.summon_no ?? `#${s.smn_id}`}
                                                {s.asset?.register_number && (
                                                    <span className="ml-2 font-mono text-xs text-slate-400">{s.asset.register_number}</span>
                                                )}
                                            </p>
                                            <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                                                {dateStr}{s.summon_agency ? ` · ${s.summon_agency}` : ''}{s.type_of_summon ? ` · ${s.type_of_summon}` : ''}
                                            </p>
                                        </div>
                                        <div className="ml-4 flex shrink-0 items-center gap-3">
                                            {s.summon_amt && (
                                                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">RM {Number(s.summon_amt).toFixed(2)}</span>
                                            )}
                                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                                paid
                                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                                    : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                            }`}>
                                                {paid ? 'Paid' : 'Pending'}
                                            </span>
                                            <Link
                                                href={`/compliance/summon/portal/${s.smn_id}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-[10px] font-semibold text-primary hover:underline"
                                            >
                                                Update →
                                            </Link>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Last Application Performed ─────────────────────────── */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="border-b border-slate-100 px-6 py-4 dark:border-slate-800">
                    <h2 className="text-base font-semibold text-slate-900 dark:text-white">Last Application Performed</h2>
                    {/* ⑦ dynamic subtitle */}
                    <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                        {appLoading
                            ? 'Loading summaries...'
                            : `Poolcar: ${poolcarSummary?.pending ?? 0} pending · Maintenance: ${maintenanceSummary?.pending ?? 0} pending`}
                    </p>
                </div>
                <div className="p-6">
                    {appLoading ? (
                        /* ⑧ skeleton */
                        <div className="grid gap-4 sm:grid-cols-2">
                            {[0, 1].map((i) => (
                                <div key={i} className="rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-800/60">
                                    <Shimmer className="mb-2 h-3 w-24" />
                                    <Shimmer className="mb-5 h-2.5 w-16" />
                                    <Shimmer className="h-10 w-10" />
                                </div>
                            ))}
                        </div>
                    ) : appError ? (
                        /* ④ error empty state */
                        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-amber-200 py-8 text-center dark:border-amber-800/40">
                            <svg className="h-8 w-8 text-amber-300 dark:text-amber-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                            <p className="text-sm font-medium text-amber-600 dark:text-amber-400">{appError}</p>
                        </div>
                    ) : (
                        <div className="grid gap-4 sm:grid-cols-2">
                            {[
                                { label: 'Poolcar Request', sub: 'Pending Approval', count: poolcarSummary?.pending ?? 0, href: '/mtn/poolcar/record', color: 'bg-violet-500' },
                                { label: 'Vehicle Maintenance', sub: 'Pending', count: maintenanceSummary?.pending ?? 0, href: '/mtn/vehicle/record', color: 'bg-sky-500' },
                            ].map(({ label, sub, count, href, color }) => (
                                <div key={label} className="group relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-5 transition-all hover:border-slate-300 hover:shadow-sm dark:border-slate-700 dark:bg-slate-800/60 dark:hover:border-slate-600">
                                    <div className={`absolute right-4 top-4 h-8 w-8 rounded-full ${color} flex items-center justify-center opacity-15 transition-opacity group-hover:opacity-25`} />
                                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">{label}</p>
                                    <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">{sub}</p>
                                    <p className="mt-3 text-4xl font-bold text-slate-900 dark:text-white">{count}</p>
                                    {count > 0 && (
                                        <Link href={href} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                                            View requests <span aria-hidden>→</span>
                                        </Link>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Asset Assignment ───────────────────────────────────── */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="border-b border-slate-100 px-6 py-4 dark:border-slate-800">
                    <h2 className="text-base font-semibold text-slate-900 dark:text-white">Asset Assignment</h2>
                    {/* ⑦ dynamic subtitle */}
                    <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                        {assetLoading
                            ? 'Loading summary...'
                            : `${assetSummary?.total ?? 0} transfer${(assetSummary?.total ?? 0) !== 1 ? 's' : ''} on record · ${assetSummary?.pending ?? 0} pending`}
                    </p>
                </div>
                <div className="p-6">
                    {assetLoading ? (
                        /* ⑧ skeleton */
                        <div className="space-y-5">
                            <div className="grid gap-3 sm:grid-cols-3">
                                {[0, 1, 2].map((i) => (
                                    <div key={i} className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
                                        <Shimmer className="mb-3 h-2.5 w-16" />
                                        <Shimmer className="h-9 w-10" />
                                    </div>
                                ))}
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
                                <Shimmer className="mb-4 h-2.5 w-32" />
                                <div className="grid gap-3 sm:grid-cols-2">
                                    {[0, 1, 2, 3, 4].map((i) => (
                                        <div key={i}>
                                            <Shimmer className="mb-1.5 h-2 w-16" />
                                            <Shimmer className="h-4 w-28" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : assetError ? (
                        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-amber-200 py-8 text-center dark:border-amber-800/40">
                            <svg className="h-8 w-8 text-amber-300 dark:text-amber-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                            <p className="text-sm font-medium text-amber-600 dark:text-amber-400">{assetError}</p>
                        </div>
                    ) : (
                        <div className="space-y-5">
                            <div className="grid gap-3 sm:grid-cols-3">
                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
                                    <div className="flex items-center gap-2">
                                        <span className="h-2 w-2 rounded-full bg-slate-400 dark:bg-slate-500" />
                                        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">Total</p>
                                    </div>
                                    <p className="mt-3 text-4xl font-bold text-slate-900 dark:text-white">{assetSummary?.total ?? 0}</p>
                                </div>
                                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800/40 dark:bg-amber-900/15">
                                    <div className="flex items-center gap-2">
                                        <span className="h-2 w-2 rounded-full bg-amber-400" />
                                        <p className="text-xs font-semibold uppercase tracking-widest text-amber-600 dark:text-amber-400">Pending</p>
                                    </div>
                                    <p className="mt-3 text-4xl font-bold text-amber-700 dark:text-amber-300">{assetSummary?.pending ?? 0}</p>
                                </div>
                                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800/40 dark:bg-emerald-900/15">
                                    <div className="flex items-center gap-2">
                                        <span className="h-2 w-2 rounded-full bg-emerald-400" />
                                        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Accepted</p>
                                    </div>
                                    <p className="mt-3 text-4xl font-bold text-emerald-700 dark:text-emerald-300">{assetSummary?.accepted ?? 0}</p>
                                </div>
                            </div>
                            {(assetSummary?.pending ?? 0) > 0 && (
                                <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800/40 dark:bg-amber-900/15">
                                    <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-amber-500" />
                                    <p className="text-sm text-amber-800 dark:text-amber-300">
                                        You have pending asset assignment(s).{' '}
                                        <Link href="/assets/transfers" className="font-semibold underline underline-offset-2 hover:no-underline">
                                            Review now
                                        </Link>
                                    </p>
                                </div>
                            )}
                            <div>
                                <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">Latest Assignment</p>
                                {assetLatest ? (
                                    <dl className="grid gap-x-6 gap-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2 dark:border-slate-700 dark:bg-slate-800/60">
                                        {[
                                            { label: 'Transfer ID', value: assetLatest.transfer_id },
                                            { label: 'Asset ID', value: assetLatest.asset_id },
                                            { label: 'Transfer Date', value: formatDate(assetLatest.transfer_date) },
                                            { label: 'Effective Date', value: formatDate(assetLatest.effective_date) },
                                            { label: 'Acceptance Date', value: formatDate(assetLatest.acceptance_date) },
                                        ].map(({ label, value }) => (
                                            <div key={label}>
                                                <dt className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">{label}</dt>
                                                <dd className="mt-0.5 text-sm font-semibold text-slate-800 dark:text-slate-100">{value}</dd>
                                            </div>
                                        ))}
                                    </dl>
                                ) : (
                                    /* ④ empty state */
                                    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-200 py-8 text-center dark:border-slate-700">
                                        <svg className="h-8 w-8 text-slate-300 dark:text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No assignment records</p>
                                        <p className="text-xs text-slate-400 dark:text-slate-500">No asset transfers have been made to your account yet.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── My Assets ──────────────────────────────────────────── */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-start justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
                    <div>
                        {/* ② count badge in header */}
                        <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
                            My Assets
                            {!myAssetsLoading && myAssets.length > 0 && (
                                <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary dark:bg-primary/20">
                                    {myAssets.length}
                                </span>
                            )}
                        </h2>
                        {/* ⑦ dynamic subtitle */}
                        <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                            {myAssetsLoading
                                ? 'Loading assets...'
                                : myAssets.length > 0
                                    ? `${myAssets.length} asset${myAssets.length !== 1 ? 's' : ''} currently assigned to you`
                                    : 'All assets currently assigned to you'}
                        </p>
                    </div>
                    {/* ③ expand / collapse toggle */}
                    {!myAssetsLoading && myAssets.length > ASSETS_DEFAULT_LIMIT && (
                        <button
                            onClick={() => setShowAllAssets((v) => !v)}
                            className="shrink-0 text-xs font-semibold text-primary hover:underline"
                        >
                            {showAllAssets ? 'Show less ↑' : `View all (${myAssets.length}) →`}
                        </button>
                    )}
                </div>
                <div className="p-6">
                    {myAssetsLoading ? (
                        /* ⑧ skeleton grid */
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {[0, 1, 2].map((i) => (
                                <div key={i} className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
                                    <div className="flex items-center justify-between border-b border-slate-200 bg-slate-100 px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
                                        <div className="space-y-1.5">
                                            <Shimmer className="h-2.5 w-16" />
                                            <Shimmer className="h-3 w-12" />
                                        </div>
                                        <Shimmer className="h-10 w-10 rounded-full" />
                                    </div>
                                    <div className="space-y-3 p-4">
                                        <div className="space-y-1.5">
                                            <Shimmer className="h-2 w-12" />
                                            <Shimmer className="h-4 w-36" />
                                            <Shimmer className="h-2.5 w-24" />
                                        </div>
                                        <div className="space-y-1.5 rounded-lg bg-slate-50 p-2.5 dark:bg-slate-900/60">
                                            <Shimmer className="h-2 w-20" />
                                            <Shimmer className="h-4 w-28" />
                                        </div>
                                        <div className="flex gap-1.5">
                                            <Shimmer className="h-5 w-14 rounded-full" />
                                            <Shimmer className="h-5 w-20 rounded-full" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : myAssetsError ? (
                        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-amber-200 py-8 text-center dark:border-amber-800/40">
                            <svg className="h-8 w-8 text-amber-300 dark:text-amber-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                            <p className="text-sm font-medium text-amber-600 dark:text-amber-400">{myAssetsError}</p>
                        </div>
                    ) : myAssets.length === 0 ? (
                        /* ④ empty state */
                        <div className="flex flex-col items-center gap-2 py-10 text-center">
                            <div className="rounded-2xl border border-dashed border-slate-200 p-5 dark:border-slate-700">
                                <svg className="h-10 w-10 text-slate-300 dark:text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="15"/><line x1="10.5" y1="13.5" x2="13.5" y2="13.5"/></svg>
                            </div>
                            <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">No assets assigned</p>
                            <p className="text-xs text-slate-400 dark:text-slate-500">Assets assigned to your account will appear here.</p>
                        </div>
                    ) : (
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {(showAllAssets ? myAssets : myAssets.slice(0, ASSETS_DEFAULT_LIMIT)).map((asset) => {
                                const accent = getAssetAccent(asset.type_name);
                                const conditionCls = getConditionBadge(asset.condition_status);
                                return (
                                    <div key={asset.id} className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white transition-shadow hover:shadow-md dark:border-slate-700 dark:bg-slate-800/60">
                                        <div className={`flex items-center justify-between border-b px-4 py-3 ${accent}`}>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">{asset.type_name ?? 'Asset'}</span>
                                                <span className="text-xs font-semibold">{asset.category_name ?? '—'}</span>
                                            </div>
                                            <AssetTypeIcon typeName={asset.type_name} />
                                        </div>
                                        <div className="flex flex-1 flex-col gap-3 p-4">
                                            <div>
                                                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">{asset.brand_name ?? '—'}</p>
                                                <p className="mt-0.5 text-sm font-bold leading-snug text-slate-800 dark:text-slate-100">{asset.model_name ?? '—'}</p>
                                                {/* ⑥ age + purchase year */}
                                                {(asset.purchase_year || asset.age != null) && (
                                                    <p className="mt-0.5 text-[10px] text-slate-400 dark:text-slate-500">
                                                        {asset.purchase_year ? `Purchased ${asset.purchase_year}` : ''}
                                                        {asset.purchase_year && asset.age != null ? ' · ' : ''}
                                                        {asset.age != null ? `${asset.age} yr${asset.age !== 1 ? 's' : ''} old` : ''}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-900/60">
                                                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                                                    {asset.type_name?.toLowerCase().includes('vehicle') ? 'Plate / Reg. No.' : 'Serial / Reg. No.'}
                                                </p>
                                                <p className="mt-0.5 font-mono text-sm font-bold tracking-wider text-slate-800 dark:text-slate-100">
                                                    {asset.register_number ?? '—'}
                                                </p>
                                            </div>
                                            <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-1">
                                                {asset.condition_status && (
                                                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${conditionCls}`}>
                                                        {asset.condition_status}
                                                    </span>
                                                )}
                                                {asset.location_name && (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                                                        <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>
                                                        {asset.location_name}
                                                    </span>
                                                )}
                                                {asset.department_name && (
                                                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                                                        {asset.department_name}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

        </div>
    );
};

export default UserDashboard;
