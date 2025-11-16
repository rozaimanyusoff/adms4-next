'use client';

import React from 'react';
import type { ValueType, NameType } from 'recharts/types/component/DefaultTooltipContent';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Pie,
    PieChart,
    Radar,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    XAxis,
    YAxis,
} from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import type { ProjectRecord, ProjectTag } from './types';
import { Badge } from '@/components/ui/badge';
import { authenticatedApi } from '@/config/api';

type ProjectReportsProps = {
    projects: ProjectRecord[];
    tags: ProjectTag[];
};

const assignmentColors: Record<string, string> = {
    Project: '#6366f1',
    Support: '#10b981',
    'Ad-hoc': '#f97316',
};

const workloadStatusConfig: ChartConfig = {
    completed: {
        label: 'Completed scopes',
        color: '#22c55e', // green
    },
    inProgress: {
        label: 'In progress scopes',
        color: '#eab308', // yellow
    },
    notStarted: {
        label: 'Not started scopes',
        color: '#ef4444', // red
    },
};

const workloadDistributionConfig: ChartConfig = {
    mandays: {
        label: 'Planned mandays',
        color: 'hsl(var(--chart-4))',
    },
};

const ProjectReports: React.FC<ProjectReportsProps> = ({ projects, tags }) => {
    type WorkloadItem = {
        assignee: {
            ramco_id: string;
            full_name: string;
        };
        total_projects: number;
        total_scopes: number;
        total_scope_mandays: string;
        actual_duration_days: number;
        completed_scopes: string;
        in_progress_scopes: string;
        not_started_scopes: string;
        avg_progress: number;
    };

    type WorkloadRow = {
        id: string;
        name: string;
        shortName: string;
        color: string;
        totalProjects: number;
        totalScopes: number;
        totalMandays: number;
        actualDurationDays: number;
        completedScopes: number;
        inProgressScopes: number;
        notStartedScopes: number;
        avgProgress: number;
    };

    const [workloadRows, setWorkloadRows] = React.useState<WorkloadRow[]>([]);
    const [workloadLoading, setWorkloadLoading] = React.useState(false);
    const [workloadError, setWorkloadError] = React.useState<string | null>(null);

    React.useEffect(() => {
        let cancelled = false;
        const fetchWorkload = async () => {
            try {
                setWorkloadLoading(true);
                setWorkloadError(null);
                const res: any = await authenticatedApi.get('/api/projects/assignments/workload');
                const raw: WorkloadItem[] = res?.data?.data ?? res?.data ?? [];
                if (!Array.isArray(raw)) return;
                if (cancelled) return;
                const palette = ['#6366f1', '#0ea5e9', '#22c55e', '#eab308', '#f97316', '#ec4899', '#a855f7', '#14b8a6'];
                const mapped: WorkloadRow[] = raw.map((item, idx) => {
                    const fullName = item?.assignee?.full_name || 'Unknown';
                    const shortName = fullName.split(' ')[0] || fullName;
                    const toNum = (v: any) => {
                        const n = Number(v);
                        return Number.isFinite(n) ? n : 0;
                    };
                    return {
                        id: item?.assignee?.ramco_id || String(idx),
                        name: fullName,
                        shortName,
                        color: palette[idx % palette.length],
                        totalProjects: toNum(item.total_projects),
                        totalScopes: toNum(item.total_scopes),
                        totalMandays: toNum(item.total_scope_mandays),
                        actualDurationDays: toNum(item.actual_duration_days),
                        completedScopes: toNum(item.completed_scopes),
                        inProgressScopes: toNum(item.in_progress_scopes),
                        notStartedScopes: toNum(item.not_started_scopes),
                        avgProgress: toNum(item.avg_progress),
                    };
                });
                setWorkloadRows(mapped);
            } catch (err: any) {
                if (!cancelled) {
                    setWorkloadError(err?.response?.data?.message || err?.message || 'Failed to load workload');
                }
            } finally {
                if (!cancelled) setWorkloadLoading(false);
            }
        };
        void fetchWorkload();
        return () => {
            cancelled = true;
        };
    }, []);

    const workloadChartData = React.useMemo(
        () =>
            workloadRows.map(row => ({
                name: row.shortName,
                completed: row.completedScopes,
                inProgress: row.inProgressScopes,
                notStarted: row.notStartedScopes,
            })),
        [workloadRows],
    );

    const workloadDistributionData = React.useMemo(
        () =>
            workloadRows.map(row => ({
                name: row.shortName,
                mandays: row.totalMandays,
            })),
        [workloadRows],
    );

    const radarData = React.useMemo(() => {
        if (!workloadRows.length) return [];
        const buildEntry = (metric: string, selector: (row: WorkloadRow) => number) => {
            const entry: Record<string, number | string> = { metric };
            workloadRows.forEach(row => {
                entry[row.shortName] = selector(row);
            });
            return entry;
        };
        return [
            buildEntry('Total Projects', row => row.totalProjects),
            buildEntry('Total Scopes', row => row.totalScopes),
            buildEntry('Completed Scopes', row => row.completedScopes),
            buildEntry('In-Progress Scopes', row => row.inProgressScopes),
            buildEntry('Average Progress', row => row.avgProgress),
            buildEntry('Total Mandays', row => row.totalMandays),
        ];
    }, [workloadRows]);

    const radarSeriesConfig = React.useMemo(() => {
        const config: ChartConfig = {};
        workloadRows.forEach(row => {
            config[row.shortName] = {
                label: row.name,
                color: row.color,
            };
        });
        return config;
    }, [workloadRows]);

    return (
        <div className="space-y-6">
            <div className="panel space-y-4 p-5">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <h3 className="text-base font-semibold">Developer Workload</h3>
                        <p className="text-sm text-muted-foreground">
                            Workload and scope status per assignee from the past assignments.
                        </p>
                    </div>
                </div>
                {workloadLoading ? (
                    <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
                        Loading workload…
                    </div>
                ) : workloadError ? (
                    <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                        {workloadError}
                    </div>
                ) : workloadRows.length === 0 ? (
                    <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
                        No workload data available.
                    </div>
                ) : (
                    <div className="grid gap-6 lg:grid-cols-[2fr_1.8fr]">
                        <div className="space-y-4">
                            <ChartContainer config={workloadStatusConfig} className="!aspect-auto h-64">
                                <BarChart data={workloadChartData} margin={{ left: 8, right: 16, bottom: 8 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" />
                                    <YAxis
                                        allowDecimals={false}
                                        label={{
                                            value: 'Scopes',
                                            angle: -90,
                                            position: 'insideLeft',
                                            offset: 0,
                                        }}
                                    />
                                    <ChartTooltip content={<ChartTooltipContent />} />
                                    <Legend />
                                    <Bar dataKey="completed" stackId="scopes" fill="var(--color-completed)" />
                                    <Bar dataKey="inProgress" stackId="scopes" fill="var(--color-inProgress)" />
                                    <Bar dataKey="notStarted" stackId="scopes" fill="var(--color-notStarted)" />
                                </BarChart>
                            </ChartContainer>
                            <ChartContainer
                                config={workloadDistributionConfig}
                                className="!aspect-square h-52 w-full max-w-xs mx-auto"
                            >
                                <PieChart>
                                    <Pie
                                        data={workloadRows}
                                        dataKey="totalMandays"
                                        nameKey="shortName"
                                        innerRadius={40}
                                        outerRadius={70}
                                        paddingAngle={3}
                                    >
                                        {workloadRows.map(row => (
                                            <Cell key={row.id} fill={row.color} />
                                        ))}
                                    </Pie>
                                    <ChartTooltip content={<ChartTooltipContent />} />
                                </PieChart>
                            </ChartContainer>
                        </div>
                        <div className="space-y-3 text-sm">
                            {workloadRows.map(row => {
                                const balanceData = [
                                    { name: 'Completed', value: row.completedScopes, color: '#22c55e' },
                                    { name: 'In progress', value: row.inProgressScopes, color: '#eab308' },
                                    { name: 'Not started', value: row.notStartedScopes, color: '#ef4444' },
                                ];
                                return (
                                    <div
                                        key={row.id}
                                        className="rounded-md border border-border/60 px-3 py-2 flex flex-col gap-2 bg-muted/40"
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="font-medium truncate flex items-center gap-2">
                                                <span
                                                    className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                                                    style={{ backgroundColor: row.color }}
                                                />
                                                <span className="truncate">{row.name}</span>
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                {row.totalProjects} proj · {row.totalScopes} scopes
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                                                <span>Planned md: {row.totalMandays}</span>
                                                <span>Duration: {row.actualDurationDays}d</span>
                                                <span>Progress: {row.avgProgress}%</span>
                                            </div>
                                            <PieChart width={60} height={60}>
                                                <Pie
                                                    data={balanceData}
                                                    dataKey="value"
                                                    nameKey="name"
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={16}
                                                    outerRadius={24}
                                                    paddingAngle={2}
                                                >
                                                    {balanceData.map(slice => (
                                                        <Cell key={slice.name} fill={slice.color} />
                                                    ))}
                                                </Pie>
                                            </PieChart>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-3 text-xs">
                                            <span className="text-emerald-700">
                                                ✔ {row.completedScopes} completed
                                            </span>
                                            <span className="text-amber-700">
                                                ● {row.inProgressScopes} in progress
                                            </span>
                                            <span className="text-slate-500">
                                                ○ {row.notStartedScopes} not started
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {workloadRows.length > 0 && (
                <div className="panel space-y-4 p-5">
                    <div>
                        <h3 className="text-base font-semibold">Workload Distribution</h3>
                        <p className="text-sm text-muted-foreground">
                            Distribution of planned mandays across assignees.
                        </p>
                    </div>
                    <ChartContainer config={workloadDistributionConfig} className="!aspect-auto h-64">
                        <BarChart data={workloadDistributionData} margin={{ left: 8, right: 16, bottom: 8 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" />
                            <YAxis
                                allowDecimals={false}
                                label={{
                                    value: 'Planned mandays',
                                    angle: -90,
                                    position: 'insideLeft',
                                    offset: 0,
                                }}
                            />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Legend />
                            <Bar dataKey="mandays" fill="var(--color-mandays)" />
                        </BarChart>
                    </ChartContainer>
                </div>
            )}

            {radarData.length > 0 && (
                <div className="panel space-y-4 p-5">
                    <div>
                        <h3 className="text-base font-semibold">Developer Progress Radar</h3>
                        <p className="text-sm text-muted-foreground">
                            Multi-metric view of workload and performance per assignee.
                        </p>
                    </div>
                    <ChartContainer
                        config={radarSeriesConfig}
                        className="!aspect-square h-72 w-full max-w-xl mx-auto"
                    >
                        <RadarChart data={radarData}>
                            <PolarGrid />
                            <PolarAngleAxis dataKey="metric" />
                            <PolarRadiusAxis />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Legend />
                            {workloadRows.map(row => (
                                <Radar
                                    key={row.id}
                                    name={row.shortName}
                                    dataKey={row.shortName}
                                    stroke={row.color}
                                    fill={row.color}
                                    fillOpacity={0.15}
                                />
                            ))}
                        </RadarChart>
                    </ChartContainer>
                </div>
            )}
        </div>
    );
};

export default ProjectReports;
