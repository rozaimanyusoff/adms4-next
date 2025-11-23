"use client";

import { useContext, useEffect, useMemo, useState } from 'react';
import { CalendarDays, Loader2, UserRound, FileDown } from 'lucide-react';
import { AuthContext } from '@/store/AuthContext';
import { authenticatedApi } from '@/config/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { parseDateTime, parseNumber } from '@/components/training/utils';
import { ResponsiveContainer, BarChart, Bar, XAxis, CartesianGrid, Tooltip } from 'recharts';
import { Tooltip as UiTooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

type TrainingDetail = {
    training_id?: number;
    participant_id?: number;
    start_date?: string | null;
    end_date?: string | null;
    course_title?: string | null;
    hrs?: string | number | null;
    days?: string | number | null;
    venue?: string | null;
    attendance_upload?: string | null;
};

type PersonalTrainingRecord = {
    participant?: {
        ramco_id?: string;
        full_name?: string;
        position?: { id?: number; name?: string | null };
        department?: { id?: number; name?: string | null };
        location?: { id?: number; name?: string | null };
    };
    total_training_hours?: string | null;
    trainings_count?: number | null;
    training_details?: TrainingDetail[] | TrainingDetail;
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const formatDateShort = (value?: string | null) => {
    const date = parseDateTime(value ?? undefined) ?? (value ? new Date(value) : null);
    if (!date) return '-';
    const dd = String(date.getDate());
    const mm = String(date.getMonth() + 1);
    const yyyy = date.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
};

const formatHours = (value?: string | number | null) => {
    const num = parseNumber(value ?? 0, 2);
    if (!Number.isFinite(num)) return '';
    const normalized = Number.isInteger(num) ? num : parseFloat(num.toFixed(2));
    return String(normalized);
};

const normalizeEntry = (raw: any): PersonalTrainingRecord => {
    if (!raw) return {};
    const detailsRaw = raw.training_details ?? [];
    const detailList: TrainingDetail[] = Array.isArray(detailsRaw) ? detailsRaw : [detailsRaw];
    return {
        participant: raw.participant,
        total_training_hours: raw.total_training_hours,
        trainings_count: raw.trainings_count,
        training_details: detailList,
    };
};

const TrainingPersonalSchedule = () => {
    const auth = useContext(AuthContext);
    const ramcoId = auth?.authData?.user?.username ?? '';
    const [record, setRecord] = useState<PersonalTrainingRecord | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchPersonal = async () => {
            if (!ramcoId) {
                setError('Missing Ramco ID for the current user.');
                return;
            }
            setLoading(true);
            setError(null);
            try {
                const res = await authenticatedApi.get('/api/training/participants', {
                    params: { ramco: ramcoId, status: 'active' },
                } as any);
                const payload: any = (res as any)?.data;
                let entry: any = payload;
                if (Array.isArray(payload?.data)) {
                    entry = payload.data[0];
                } else if (payload?.data && !Array.isArray(payload?.data)) {
                    entry = payload.data;
                } else if (Array.isArray(payload)) {
                    entry = payload[0];
                }
                setRecord(normalizeEntry(entry));
            } catch (e: any) {
                setError(e?.response?.data?.message || 'Unable to load your training schedule.');
                setRecord(null);
            } finally {
                setLoading(false);
            }
        };
        fetchPersonal();
    }, [ramcoId]);

    const schedule = useMemo(() => {
        const grid: Record<number, Record<number, TrainingDetail[]>> = {};
        const totals: Record<number, number> = {};
        const details = record?.training_details || [];
        (Array.isArray(details) ? details : []).forEach((detail) => {
            const d = parseDateTime(detail.start_date ?? undefined) ?? (detail.start_date ? new Date(detail.start_date) : null);
            if (!d || Number.isNaN(d.getTime())) return;
            const year = d.getFullYear();
            const month = d.getMonth();
            if (!grid[year]) grid[year] = {};
            if (!grid[year][month]) grid[year][month] = [];
            grid[year][month].push(detail);
            totals[year] = (totals[year] || 0) + parseNumber(detail.hrs, 2);
        });
        return { grid, totals };
    }, [record?.training_details]);

    const years = useMemo(() => {
        const keys = Object.keys(schedule.grid)
            .map((k) => Number(k))
            .filter((n) => !Number.isNaN(n));
        if (keys.length === 0) return [];
        const minYear = Math.min(...keys);
        const maxYear = Math.max(...keys);
        const fullRange: number[] = [];
        for (let y = maxYear; y >= minYear; y -= 1) fullRange.push(y);
        return fullRange;
    }, [schedule]);

    const chartData = useMemo(
        () =>
            years
                .slice()
                .reverse()
                .map((year) => ({
                    year: String(year),
                    hours: Number((schedule.totals[year] || 0).toFixed(2)),
                })),
        [schedule.totals, years],
    );

    const participant = record?.participant;
    const hasData = !!record && Array.isArray(record.training_details) && record.training_details.length > 0;

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                    <h1 className="text-xl font-semibold flex items-center gap-2">
                        <UserRound className="h-5 w-5" />
                        My Training Records
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Shows your trainings arranged by month and year.
                    </p>
                </div>
                {loading && (
                    <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading...
                    </div>
                )}
            </div>

            {error && <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}

            {participant && (
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <CalendarDays className="h-5 w-5" />
                            {participant.full_name || 'Participant'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:gap-10">
                            <div className="grid min-w-[240px] grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                                <div className="text-sm">
                                    <div className="text-muted-foreground">Ramco ID</div>
                                    <div className="font-medium">{participant.ramco_id || '-'}</div>
                                </div>
                                <div className="text-sm">
                                    <div className="text-muted-foreground">Department</div>
                                    <div className="font-medium">{participant.department?.name || '-'}</div>
                                </div>
                                <div className="text-sm">
                                    <div className="text-muted-foreground">Location</div>
                                    <div className="font-medium">{participant.location?.name || '-'}</div>
                                </div>
                                <div className="text-sm">
                                    <div className="text-muted-foreground">Position</div>
                                    <div className="font-medium">{participant.position?.name || '-'}</div>
                                </div>
                                <div className="text-sm">
                                    <div className="text-muted-foreground">Trainings</div>
                                    <div className="font-medium">{record?.trainings_count ?? '-'}</div>
                                </div>
                                <div className="text-sm">
                                    <div className="text-muted-foreground">Total Hours</div>
                                    <div className="font-medium">{record?.total_training_hours ?? '-'}</div>
                                </div>
                            </div>

                            {chartData.length > 0 && (
                                <div className="h-56 w-full lg:h-40 lg:flex-1">
                                    <ResponsiveContainer width="50%" height="100%">
                                        <BarChart data={chartData} margin={{ left: 8, right: 8, top: 8 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                            <XAxis dataKey="year" tickLine={false} axisLine={false} />
                                            <Tooltip />
                                            <Bar dataKey="hours" fill="#0F8CD3" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader className="pb-4">
                    <CardTitle>Schedule</CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                    <table className="min-w-full border border-border text-sm">
                        <thead className="bg-muted/40">
                            <tr>
                                <th className="min-w-[80px] border border-border px-3 py-2 text-left font-semibold">Year</th>
                                {MONTHS.map((m) => (
                                    <th key={m} className="min-w-[140px] border border-border px-3 py-2 text-left font-semibold">
                                        {m}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {years.length === 0 && (
                                <tr>
                                    <td className="border border-border px-3 py-3 text-muted-foreground" colSpan={MONTHS.length + 1}>
                                        {loading ? 'Loading...' : 'No trainings found.'}
                                    </td>
                                </tr>
                            )}
                            {years.map((year) => (
                                <tr key={year} className="align-top">
                                    <td className="border border-border px-3 py-2 font-semibold">
                                        <div className="flex items-center gap-2">
                                            <span>{year}</span>
                                            {schedule.totals[year] ? (
                                                <Badge
                                                    variant="secondary"
                                                    className="text-xs font-medium bg-blue-500 text-white hover:bg-blue-600 border-blue-500 truncate"
                                                >
                                                    {formatHours(schedule.totals[year])}h
                                                </Badge>
                                            ) : null}
                                        </div>
                                    </td>
                                    {MONTHS.map((_m, idx) => {
                                        const trainings = schedule.grid[year]?.[idx] ?? [];
                                        return (
                                            <td key={idx} className="border border-border px-2 py-2">
                                                {trainings.length === 0 ? (
                                                    <span className="text-xs text-muted-foreground">-</span>
                                                ) : (
                                                    <div className="space-y-2 bg-slate-50/50 rounded-md">
                                                        {trainings
                                                            .slice()
                                                            .sort((a, b) => {
                                                                const da = parseDateTime(a.start_date ?? undefined) ?? (a.start_date ? new Date(a.start_date) : null);
                                                                const db = parseDateTime(b.start_date ?? undefined) ?? (b.start_date ? new Date(b.start_date) : null);
                                                                const ta = da?.getTime() ?? 0;
                                                                const tb = db?.getTime() ?? 0;
                                                                return tb - ta;
                                                            })
                                                            .map((t) => (
                                                                <UiTooltip key={`${t.training_id}-${t.start_date}`}>
                                                                    <TooltipTrigger asChild>
                                                                        <div className="rounded-md border px-2 py-1 shadow-[0_1px_1px_rgba(0,0,0,0.04)]">
                                                                            <div className="text-xs font-medium leading-tight line-clamp-2">{t.course_title || 'Untitled Course'}</div>
                                                                            <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                                                                                <span>{formatDateShort(t.start_date)}</span>
                                                                                {t.hrs ? (
                                                                                    <Badge className="bg-blue-500 text-white hover:bg-blue-600 border-blue-500 truncate">
                                                                                        {formatHours(t.hrs)}h
                                                                                    </Badge>
                                                                                ) : null}
                                                                            </div>
                                                                            {t.attendance_upload ? (
                                                                                <div className="mt-1 text-[11px]">
                                                                                    <a
                                                                                        href={t.attendance_upload}
                                                                                        target="_blank"
                                                                                        rel="noreferrer"
                                                                                        className="inline-flex items-center gap-1 text-primary hover:underline"
                                                                                    >
                                                                                        <FileDown className="h-3 w-3" />
                                                                                        Download
                                                                                    </a>
                                                                                </div>
                                                                            ) : null}
                                                                        </div>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent side="top" align="start" className="max-w-xs text-left">
                                                                        <div className="font-semibold text-xs leading-tight">{t.course_title || 'Untitled Course'}</div>
                                                                        <div className="mt-1 text-[11px] leading-normal text-primary-foreground/80">
                                                                            <div>{`Date: ${formatDateShort(t.start_date)}${t.end_date ? ` → ${formatDateShort(t.end_date)}` : ''}`}</div>
                                                                            {t.venue ? <div>{`Venue: ${t.venue}`}</div> : null}
                                                                            {t.hrs ? <div>{`Hours: ${formatHours(t.hrs)}`}</div> : null}
                                                                            {t.days ? <div>{`Days: ${formatHours(t.days)}`}</div> : null}
                                                                        </div>
                                                                    </TooltipContent>
                                                                </UiTooltip>
                                                            ))}
                                                    </div>
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </CardContent>
            </Card>
        </div>
    );
};

export default TrainingPersonalSchedule;
