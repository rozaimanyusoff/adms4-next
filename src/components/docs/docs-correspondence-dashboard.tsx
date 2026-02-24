'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, CheckCircle2, Clock3, BarChart3 } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { CorrespondenceRecord } from './correspondence-tracking-data';

type CorrespondenceDashboardViewProps = {
    records: CorrespondenceRecord[];
};

export const CorrespondenceDashboardView = ({ records }: CorrespondenceDashboardViewProps) => {
    const now = new Date();
    const getRecordTimestamp = (record: CorrespondenceRecord) => {
        const candidate = record.received_at ?? record.sent_at ?? record.due_date;
        if (!candidate) return 0;
        const date = new Date(candidate);
        return Number.isNaN(date.getTime()) ? 0 : date.getTime();
    };

    const metrics = useMemo(() => {
        const total = records.length;
        const completed = records.filter((r) => r.status === 'completed').length;
        return { total, completed };
    }, [records]);

    const departmentCounts = useMemo(() => {
        const byDepartment = records.reduce<Record<string, number>>((acc, record) => {
            const key = record.department || 'Unassigned';
            acc[key] = (acc[key] ?? 0) + 1;
            return acc;
        }, {});

        const sorted = Object.entries(byDepartment)
            .map(([department, count]) => ({ department, count }))
            .sort((a, b) => b.count - a.count);

        return sorted.slice(0, 5);
    }, [records]);

    const recentActivities = useMemo(() => {
        return [...records]
            .sort((a, b) => getRecordTimestamp(b) - getRecordTimestamp(a))
            .slice(0, 6);
    }, [records]);

    const monthlyBreakdown = useMemo(
        () => [
            { month: "Sep'25", incoming: 9, outgoing: 5 },
            { month: "Oct'25", incoming: 12, outgoing: 7 },
            { month: "Nov'25", incoming: 10, outgoing: 6 },
            { month: "Dec'25", incoming: 14, outgoing: 8 },
            { month: "Jan'26", incoming: 11, outgoing: 9 },
            { month: "Feb'26", incoming: 13, outgoing: 10 },
        ],
        [],
    );

    const registeredCount = records.filter((record) => record.status === 'registered').length;
    const inProgressCount = records.filter((record) => record.status === 'in_progress').length;
    const completedCount = records.filter((record) => record.status === 'completed').length;
    const countLabel = (count: number) => `${count} correspondence${count === 1 ? '' : 's'}`;
    const workflowStatus = [
        {
            title: 'Received & Registered',
            subtitle: countLabel(metrics.total),
            state: 'done' as const,
        },
        {
            title: 'QA Verification',
            subtitle: countLabel(registeredCount),
            state: 'active' as const,
        },
        {
            title: 'Distribution Queues',
            subtitle: countLabel(inProgressCount),
            state: 'pending' as const,
        },
        {
            title: 'Department Actions',
            subtitle: countLabel(completedCount),
            state: 'pending' as const,
        },
    ];

    return (
        <div className="space-y-4">
            <div className="grid gap-4 xl:grid-cols-2">
                <Card>
                <CardHeader>
                    <CardTitle>Workflow Summary</CardTitle>
                    <CardDescription>Each timeline entry summarizes the current correspondence workflow.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-1">
                        {workflowStatus.map((step, index) => {
                            const isLast = index === workflowStatus.length - 1;
                            const dotTone =
                                step.state === 'done'
                                    ? 'bg-emerald-600'
                                    : step.state === 'active'
                                      ? 'bg-amber-500'
                                      : 'bg-slate-300';
                            const titleTone = step.state === 'pending' ? 'text-slate-500' : 'text-slate-900';
                            return (
                                <div key={step.title} className="flex gap-3">
                                    <div className="flex w-4 flex-col items-center">
                                        <span className={`mt-1 h-2.5 w-2.5 rounded-full ${dotTone}`} />
                                        {!isLast && <span className="mt-1 h-10 w-px bg-slate-200" />}
                                    </div>
                                    <div className="pb-4">
                                        <p className={`text-[17px] font-medium ${titleTone}`}>{step.title}</p>
                                        <p className="text-sm text-slate-500">{step.subtitle}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div className="mt-2 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-md border p-3">
                            <p className="text-xs text-muted-foreground">Total Records</p>
                            <p className="text-lg font-semibold text-slate-900">{metrics.total}</p>
                        </div>
                        <div className="rounded-md border p-3">
                            <p className="text-xs text-muted-foreground">Completed Records</p>
                            <p className="text-lg font-semibold text-slate-900">{metrics.completed}</p>
                        </div>
                    </div>
                </CardContent>
                </Card>

                <Card>
                <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                    <CardDescription>Latest correspondence records and their current status.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="divide-y divide-slate-200">
                    {recentActivities.map((item) => (
                        <div key={item.id} className="flex items-center justify-between gap-3 py-3">
                            <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-slate-900">{item.subject}</p>
                                <p className="truncate text-xs text-muted-foreground">
                                    {item.reference_no} • {item.owner}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                {item.status === 'completed' ? (
                                    <Badge className="bg-emerald-600 text-white hover:bg-emerald-700">
                                        <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                                        Completed
                                    </Badge>
                                ) : item.due_date && new Date(item.due_date) < now ? (
                                    <Badge className="bg-rose-600 text-white hover:bg-rose-700">
                                        <AlertTriangle className="mr-1 h-3.5 w-3.5" />
                                        Overdue
                                    </Badge>
                                ) : (
                                    <Badge variant="secondary">
                                        <Clock3 className="mr-1 h-3.5 w-3.5" />
                                        In Progress
                                    </Badge>
                                )}
                            </div>
                        </div>
                    ))}
                    </div>
                </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
                <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-amber-600" />
                        Monthly Breakdown
                    </CardTitle>
                    <CardDescription>Monthly correspondence volume for incoming and outgoing records.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="h-[260px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={monthlyBreakdown} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="month" tickLine={false} axisLine={false} />
                                <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={28} />
                                <Tooltip
                                    cursor={{ fill: 'rgba(148, 163, 184, 0.12)' }}
                                    contentStyle={{ borderRadius: 8, borderColor: '#e2e8f0' }}
                                />
                                <Bar dataKey="incoming" name="Incoming" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="outgoing" name="Outgoing" fill="#6366f1" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
                </Card>

                <Card>
                <CardHeader>
                    <CardTitle>Workload by Department</CardTitle>
                    <CardDescription>Top teams by active correspondence volume.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    {departmentCounts.map((dept) => {
                        const pct = metrics.total ? Math.round((dept.count / metrics.total) * 100) : 0;
                        return (
                            <div key={dept.department} className="space-y-1">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="font-medium text-slate-800">{dept.department}</span>
                                    <span className="text-muted-foreground">{dept.count}</span>
                                </div>
                                <Progress value={pct} className="h-2" />
                            </div>
                        );
                    })}
                </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default CorrespondenceDashboardView;
