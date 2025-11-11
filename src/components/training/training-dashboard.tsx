'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
    TrendingUp,
    Users,
    Clock4,
    MapPin,
    Loader2,
    AlertTriangle,
    Calendar,
    RefreshCcw,
} from 'lucide-react';
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    CartesianGrid,
    XAxis,
    YAxis,
    Tooltip,
    PieChart,
    Pie,
    Cell,
} from 'recharts';
import { authenticatedApi } from '@/config/api';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    TrainingRecord,
    normalizeTrainingRecord,
    formatDateTime,
    formatCurrency,
    parseDateTime,
    parseNumber,
} from '@/components/training/utils';

const sessionColors = ['#6366F1', '#F97316', '#0EA5E9', '#22C55E', '#A855F7', '#EC4899'];

type StatCardProps = {
    title: string;
    value: string;
    subtext?: string;
    icon: React.ComponentType<{ className?: string }>;
    highlight?: string;
};

const StatCard = ({ title, value, subtext, icon: Icon, highlight }: StatCardProps) => (
    <Card>
        <CardContent className="flex items-center justify-between gap-4 p-5">
            <div className="space-y-1">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{title}</p>
                <p className="text-2xl font-semibold">{value}</p>
                {subtext && <p className="text-sm text-muted-foreground">{subtext}</p>}
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
            </div>
        </CardContent>
        {highlight && (
            <div className="border-t px-5 py-2 text-xs text-muted-foreground">
                {highlight}
            </div>
        )}
    </Card>
);

const TrainingDashboard = () => {
    const [records, setRecords] = useState<TrainingRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadRecords = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await authenticatedApi.get('/api/training');
            const data = (res as any)?.data;
            const list = Array.isArray(data?.data) ? data.data : Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
            setRecords(list.map(normalizeTrainingRecord));
        } catch (err: any) {
            setError(err?.response?.data?.message || 'Unable to load training dashboard data.');
            setRecords([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadRecords();
    }, [loadRecords]);

    const stats = useMemo(() => {
        const totalHours = records.reduce((sum, record) => sum + (record.hrs_num || 0), 0);
        const totalDays = records.reduce((sum, record) => sum + (record.days_num || 0), 0);
        const totalSeats = records.reduce((sum, record) => sum + (record.seat || 0), 0);
        const attendees = records.reduce((sum, record) => sum + (record.training_count || 0), 0);
        const totalCost = records.reduce((sum, record) => sum + parseNumber(record.cost_total ?? record.event_cost ?? 0), 0);
        const fillRate = totalSeats ? Math.min(100, Math.round((attendees / totalSeats) * 100)) : 0;

        return {
            totalSessions: records.length,
            totalHours,
            totalDays,
            totalSeats,
            attendees,
            fillRate,
            totalCost,
        };
    }, [records]);

    const sessionBreakdown = useMemo(() => {
        const map = new Map<string, number>();
        records.forEach((record) => {
            const key = record.session || 'unspecified';
            map.set(key, (map.get(key) || 0) + 1);
        });
        return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
    }, [records]);

    const monthlySummary = useMemo(() => {
        const summary: Record<string, { label: string; count: number; hours: number; attendees: number }> = {};
        records.forEach((record) => {
            const date = parseDateTime(record.sdate) ?? parseDateTime(record.edate);
            if (!date) return;
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const label = date.toLocaleString(undefined, { month: 'short', year: '2-digit' });
            if (!summary[key]) {
                summary[key] = { label, count: 0, hours: 0, attendees: 0 };
            }
            summary[key].count += 1;
            summary[key].hours += record.hrs_num || 0;
            summary[key].attendees += record.training_count || 0;
        });
        return Object.entries(summary)
            .sort(([a], [b]) => (a > b ? 1 : -1))
            .map(([, value]) => value);
    }, [records]);

    const upcomingTrainings = useMemo(() => {
        const now = new Date();
        return records
            .filter((record) => {
                const date = parseDateTime(record.sdate);
                return date ? date >= now : false;
            })
            .sort((a, b) => {
                const aDate = parseDateTime(a.sdate)?.getTime() ?? 0;
                const bDate = parseDateTime(b.sdate)?.getTime() ?? 0;
                return aDate - bDate;
            })
            .slice(0, 4);
    }, [records]);

    const topVenues = useMemo(() => {
        const map = new Map<string, { venue: string; count: number; attendees: number }>();
        records.forEach((record) => {
            if (!record.venue) return;
            if (!map.has(record.venue)) {
                map.set(record.venue, { venue: record.venue, count: 0, attendees: 0 });
            }
            const current = map.get(record.venue)!;
            current.count += 1;
            current.attendees += record.training_count || 0;
        });
        return Array.from(map.values())
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
    }, [records]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-semibold">Training Dashboard</h1>
                    <p className="text-sm text-muted-foreground">Insights compiled from /api/training.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={loadRecords} disabled={loading}>
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                        Refresh
                    </Button>
                    <Button asChild variant="secondary">
                        <Link href="/training/training-record">View Records</Link>
                    </Button>
                    <Button asChild>
                        <Link href="/training/training-form">Register Training</Link>
                    </Button>
                </div>
            </div>

            {error && (
                <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                    <AlertTriangle className="h-4 w-4" />
                    {error}
                </div>
            )}

            {loading && records.length === 0 && (
                <div className="flex items-center gap-2 rounded-md border px-4 py-3 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading training insights...
                </div>
            )}

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <StatCard
                    title="Total Trainings"
                    value={stats.totalSessions.toString()}
                    subtext={`${stats.totalDays} day(s) · ${stats.totalHours} hr(s)`}
                    icon={TrendingUp}
                    highlight={`${stats.totalCost ? formatCurrency(stats.totalCost) : 'RM 0.00'} tracked`}
                />
                <StatCard
                    title="Seats Allocated"
                    value={stats.totalSeats.toString()}
                    subtext={`${stats.attendees} confirmed attendees`}
                    icon={Users}
                    highlight={`Fill rate ${stats.fillRate}%`}
                />
                <StatCard
                    title="Average Session Length"
                    value={records.length ? `${(stats.totalHours / records.length).toFixed(1)} hrs` : '0 hrs'}
                    subtext={`${(stats.totalDays / (records.length || 1)).toFixed(1)} days per session`}
                    icon={Clock4}
                />
                <StatCard
                    title="Upcoming Trainings"
                    value={upcomingTrainings.length.toString()}
                    subtext="Next 30 days"
                    icon={Calendar}
                    highlight={upcomingTrainings[0] ? formatDateTime(upcomingTrainings[0].sdate) : 'No future sessions'}
                />
            </div>

            <div className="grid gap-4 lg:grid-cols-12">
                <Card className="lg:col-span-7">
                    <CardHeader>
                        <CardTitle>Monthly Activity</CardTitle>
                        <CardDescription>Counts and attendance per month.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-80">
                        {monthlySummary.length ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={monthlySummary}>
                                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                    <XAxis dataKey="label" />
                                    <YAxis />
                                    <Tooltip />
                                    <Bar dataKey="count" name="Trainings" fill="#6366F1" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="attendees" name="Attendees" fill="#0EA5E9" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                                No date data available.
                            </div>
                        )}
                    </CardContent>
                </Card>
                <Card className="lg:col-span-5">
                    <CardHeader>
                        <CardTitle>Session Mix</CardTitle>
                        <CardDescription>Sessions by type (fullday, morning, etc.).</CardDescription>
                    </CardHeader>
                    <CardContent className="flex h-80 flex-col">
                        {sessionBreakdown.length ? (
                            <div className="flex flex-1 flex-col gap-4 md:flex-row">
                                <ResponsiveContainer width="100%" height={220}>
                                    <PieChart>
                                        <Pie
                                            data={sessionBreakdown}
                                            dataKey="value"
                                            nameKey="name"
                                            innerRadius={50}
                                            outerRadius={90}
                                            paddingAngle={3}
                                            label
                                        >
                                            {sessionBreakdown.map((entry, index) => (
                                                <Cell key={`cell-${entry.name}`} fill={sessionColors[index % sessionColors.length]} />
                                            ))}
                                        </Pie>
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="space-y-2">
                                    {sessionBreakdown.map((session, index) => (
                                        <div key={session.name} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                                            <div className="flex items-center gap-2">
                                                <span
                                                    className="h-2.5 w-2.5 rounded-full"
                                                    style={{ backgroundColor: sessionColors[index % sessionColors.length] }}
                                                />
                                                <span className="capitalize">{session.name}</span>
                                            </div>
                                            <span className="font-semibold">{session.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
                                No session data available.
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Upcoming Schedule</CardTitle>
                        <CardDescription>Next confirmed trainings.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {upcomingTrainings.length ? (
                            upcomingTrainings.map((training) => (
                                <div key={training.training_id} className="rounded-lg border p-4">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <p className="font-semibold">{training.course_title}</p>
                                        {training.session && (
                                            <Badge variant="outline" className="capitalize">
                                                {training.session}
                                            </Badge>
                                        )}
                                    </div>
                                    <p className="text-sm text-muted-foreground">{formatDateTime(training.sdate)} → {formatDateTime(training.edate)}</p>
                                    <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                                        <span className="inline-flex items-center gap-1">
                                            <MapPin className="h-3.5 w-3.5" />
                                            {training.venue || 'TBC'}
                                        </span>
                                        <span className="inline-flex items-center gap-1">
                                            <Users className="h-3.5 w-3.5" />
                                            {training.training_count || 0} / {training.seat || '-'} seats
                                        </span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-sm text-muted-foreground">No future trainings found.</p>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Top Venues</CardTitle>
                        <CardDescription>Most frequently used locations.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {topVenues.length ? (
                            topVenues.map((venue) => (
                                <div key={venue.venue} className="flex items-center justify-between rounded-lg border px-4 py-3">
                                    <div>
                                        <p className="font-medium">{venue.venue}</p>
                                        <p className="text-xs text-muted-foreground">{venue.count} training(s)</p>
                                    </div>
                                    <div className="text-right text-sm">
                                        <p className="font-semibold">{venue.attendees} attendees</p>
                                        <p className="text-xs text-muted-foreground">Avg {venue.count ? Math.round(venue.attendees / venue.count) : 0} per session</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-sm text-muted-foreground">No venue data captured.</p>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default TrainingDashboard;
