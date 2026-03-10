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

    if (!user) {
        return <div className="rounded-md bg-slate-100 p-4 text-sm text-slate-600 dark:bg-slate-900 dark:text-slate-300">Dashboard data is not available.</div>;
    }

    return (
        <div className="relative space-y-6">
            <div className="pointer-events-none absolute -top-6 -right-6 h-40 w-40 rounded-full bg-primary/10 blur-3xl dark:bg-primary/20" />
            <div className="pointer-events-none absolute top-72 -left-8 h-28 w-28 rounded-full bg-sky-300/20 blur-3xl dark:bg-sky-500/20" />
            <div className="panel relative overflow-hidden rounded-2xl border border-primary/20 bg-linear-to-r from-primary/10 via-primary/5 to-transparent shadow-sm transition-all duration-300 hover:shadow-md dark:border-primary/25 dark:from-primary/15 dark:via-primary/10">
                <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full border border-primary/20 bg-primary/10 dark:border-primary/30 dark:bg-primary/20" />
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight text-primary">Welcome back, {greetingName}</h1>
                        <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">This is your dashboard. Session and activity details are shown below.</p>
                        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
                            <div className="rounded-xl border border-primary/20 bg-white/80 px-3 py-2 shadow-xs transition-all duration-300 hover:-translate-y-0.5 hover:shadow-sm dark:border-primary/25 dark:bg-slate-900/70">
                                <dt className="text-xs uppercase tracking-wide text-primary/80 dark:text-primary/85">Last Login</dt>
                                <dd className="mt-1 font-medium text-slate-900 dark:text-white">{lastLogin}</dd>
                            </div>
                            <div className="rounded-xl border border-primary/20 bg-white/80 px-3 py-2 shadow-xs transition-all duration-300 hover:-translate-y-0.5 hover:shadow-sm dark:border-primary/25 dark:bg-slate-900/70">
                                <dt className="text-xs uppercase tracking-wide text-primary/80 dark:text-primary/85">Time Spent</dt>
                                <dd className="mt-1 font-medium text-slate-900 dark:text-white">{timeSpent}</dd>
                            </div>
                            <div className="rounded-xl border border-primary/20 bg-white/80 px-3 py-2 shadow-xs transition-all duration-300 hover:-translate-y-0.5 hover:shadow-sm dark:border-primary/25 dark:bg-slate-900/70">
                                <dt className="text-xs uppercase tracking-wide text-primary/80 dark:text-primary/85">Last Activity</dt>
                                <dd className="mt-1 break-all font-medium text-slate-900 dark:text-white">{lastActivity}</dd>
                            </div>
                        </dl>
                    </div>
                    <div className="flex items-center gap-2">
                        <Link href="/users/profile">
                            <Button variant="outline" className="inline-flex items-center gap-2 rounded-xl border-primary/35 bg-white/80 text-primary shadow-xs transition-all duration-300 hover:-translate-y-0.5 hover:bg-primary/10 hover:shadow-sm dark:border-primary/40 dark:bg-slate-900/70 dark:hover:bg-primary/20">
                                <span className="relative h-5 w-5 overflow-hidden rounded-full">
                                    <Image src={avatarSrc} alt="User avatar" fill className="object-cover" unoptimized />
                                </span>
                                Update Profile
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>

            <div className="panel rounded-2xl border border-primary/15 bg-primary/3 shadow-sm transition-all duration-300 hover:shadow-md dark:border-primary/20 dark:bg-primary/6">
                <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-primary/85">Last Application Performed</h2>
                {appLoading ? (
                    <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Loading application summaries...</p>
                ) : appError ? (
                    <p className="mt-3 text-sm text-amber-700 dark:text-amber-300">{appError}</p>
                ) : (
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-xl border border-primary/20 bg-white p-4 shadow-xs transition-all duration-300 hover:-translate-y-0.5 hover:shadow-sm dark:border-primary/25 dark:bg-slate-900">
                            <p className="text-xs uppercase tracking-wide text-primary/80 dark:text-primary/85">Poolcar Request</p>
                            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Pending Approval</p>
                            <p className="mt-1 text-3xl font-semibold leading-none text-primary">{poolcarSummary?.pending ?? 0}</p>
                            {(poolcarSummary?.pending ?? 0) > 0 && (
                                <p className="mt-2 text-sm text-primary">
                                    <Link href="/mtn/poolcar/record" className="font-semibold underline underline-offset-2 hover:opacity-80">
                                        View poolcar requests
                                    </Link>
                                </p>
                            )}
                        </div>

                        <div className="rounded-xl border border-primary/20 bg-white p-4 shadow-xs transition-all duration-300 hover:-translate-y-0.5 hover:shadow-sm dark:border-primary/25 dark:bg-slate-900">
                            <p className="text-xs uppercase tracking-wide text-primary/80 dark:text-primary/85">Vehicle Maintenance Request</p>
                            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Pending</p>
                            <p className="mt-1 text-3xl font-semibold leading-none text-primary">{maintenanceSummary?.pending ?? 0}</p>
                            {(maintenanceSummary?.pending ?? 0) > 0 && (
                                <p className="mt-2 text-sm text-primary">
                                    <Link href="/mtn/vehicle/record" className="font-semibold underline underline-offset-2 hover:opacity-80">
                                        View maintenance requests
                                    </Link>
                                </p>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <div className="panel rounded-2xl border border-primary/15 bg-primary/3 shadow-sm transition-all duration-300 hover:shadow-md dark:border-primary/20 dark:bg-primary/6">
                <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-primary/85">Asset Assignment</h2>
                {assetLoading ? (
                    <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Loading asset assignment...</p>
                ) : assetError ? (
                    <p className="mt-3 text-sm text-amber-700 dark:text-amber-300">{assetError}</p>
                ) : (
                    <div className="mt-3 space-y-4">
                        <div className="grid gap-3 sm:grid-cols-3">
                            <div className="rounded-xl border border-primary/20 bg-white p-3 shadow-xs transition-all duration-300 hover:-translate-y-0.5 hover:shadow-sm dark:border-primary/25 dark:bg-slate-900">
                                <p className="text-xs uppercase text-primary/80 dark:text-primary/85">Total</p>
                                <p className="text-2xl font-semibold leading-none text-primary">{assetSummary?.total ?? 0}</p>
                            </div>
                            <div className="rounded-xl border border-primary/20 bg-white p-3 shadow-xs transition-all duration-300 hover:-translate-y-0.5 hover:shadow-sm dark:border-primary/25 dark:bg-slate-900">
                                <p className="text-xs uppercase text-primary/80 dark:text-primary/85">Pending</p>
                                <p className="text-2xl font-semibold leading-none text-primary">{assetSummary?.pending ?? 0}</p>
                            </div>
                            <div className="rounded-xl border border-primary/20 bg-white p-3 shadow-xs transition-all duration-300 hover:-translate-y-0.5 hover:shadow-sm dark:border-primary/25 dark:bg-slate-900">
                                <p className="text-xs uppercase text-primary/80 dark:text-primary/85">Accepted</p>
                                <p className="text-2xl font-semibold leading-none text-primary">{assetSummary?.accepted ?? 0}</p>
                            </div>
                        </div>
                        {(assetSummary?.pending ?? 0) > 0 && (
                            <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-900/20 dark:text-amber-200">
                                You have pending asset assignment(s).{' '}
                                <Link href="/assets/transfers" className="font-semibold underline underline-offset-2 hover:no-underline">
                                    Review now
                                </Link>
                                .
                            </div>
                        )}

                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-primary/85">Latest Assignment</p>
                            {assetLatest ? (
                                <dl className="mt-2 grid gap-3 sm:grid-cols-2">
                                    <div>
                                        <dt className="text-xs uppercase text-primary/80 dark:text-primary/85">Transfer ID</dt>
                                        <dd className="text-sm font-medium text-slate-900 dark:text-white">{assetLatest.transfer_id}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs uppercase text-primary/80 dark:text-primary/85">Asset ID</dt>
                                        <dd className="text-sm font-medium text-slate-900 dark:text-white">{assetLatest.asset_id}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs uppercase text-primary/80 dark:text-primary/85">Transfer Date</dt>
                                        <dd className="text-sm font-medium text-slate-900 dark:text-white">{formatDate(assetLatest.transfer_date)}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs uppercase text-primary/80 dark:text-primary/85">Effective Date</dt>
                                        <dd className="text-sm font-medium text-slate-900 dark:text-white">{formatDate(assetLatest.effective_date)}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs uppercase text-primary/80 dark:text-primary/85">Acceptance Date</dt>
                                        <dd className="text-sm font-medium text-slate-900 dark:text-white">{formatDate(assetLatest.acceptance_date)}</dd>
                                    </div>
                                </dl>
                            ) : (
                                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">No latest assignment data available.</p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default UserDashboard;
