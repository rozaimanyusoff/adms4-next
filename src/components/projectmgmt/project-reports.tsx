'use client';

import React from 'react';
import { differenceInCalendarDays, format, isValid, parseISO } from 'date-fns';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, Tooltip as RechartsTooltip, XAxis, YAxis } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { ProjectRecord } from './types';
import { Badge } from '@/components/ui/badge';

type ProjectReportsProps = {
    projects: ProjectRecord[];
};

const ganttChartConfig: ChartConfig = {
    duration: {
        label: 'Duration (days)',
        color: 'hsl(var(--chart-2))',
    },
};

const burnDownConfig: ChartConfig = {
    ideal: {
        label: 'Ideal remaining effort',
        color: 'hsl(var(--chart-4))',
    },
    actual: {
        label: 'Actual remaining effort',
        color: 'hsl(var(--chart-1))',
    },
};

const assignmentColors: Record<string, string> = {
    Task: '#6366f1',
    Support: '#10b981',
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const ProjectReports: React.FC<ProjectReportsProps> = ({ projects }) => {
    const validProjects = React.useMemo(() => {
        return projects
            .map(project => {
                const start = parseISO(project.startDate);
                const due = parseISO(project.dueDate);
                if (!isValid(start) || !isValid(due)) {
                    return null;
                }
                return { ...project, start, due };
            })
            .filter((project): project is ProjectRecord & { start: Date; due: Date } => Boolean(project));
    }, [projects]);

    const ganttData = React.useMemo(() => {
        if (!validProjects.length) {
            return [];
        }
        const sorted = [...validProjects].sort((a, b) => a.start.getTime() - b.start.getTime());
        const baseline = sorted[0].start;

        return sorted.map(project => {
            const startOffset = Math.max(differenceInCalendarDays(project.start, baseline), 0);
            const duration = Math.max(project.durationDays || differenceInCalendarDays(project.due, project.start) + 1, 1);
            return {
                id: project.id,
                name: project.name,
                startOffset,
                duration,
                startLabel: format(project.start, 'MMM d'),
                dueLabel: format(project.due, 'MMM d'),
                assignmentType: project.assignmentType,
            };
        });
    }, [validProjects]);

    const burnDownData = React.useMemo(() => {
        if (!validProjects.length) {
            return [];
        }

        const today = new Date();

        return validProjects.map(project => {
            const totalDuration = Math.max(project.durationDays || differenceInCalendarDays(project.due, project.start) + 1, 1);
            const completedDays = Math.round((project.progress / 100) * totalDuration);
            const actualRemaining = Math.max(totalDuration - completedDays, 0);

            const elapsed = differenceInCalendarDays(today, project.start) + 1;
            const idealProgress = clamp(elapsed / totalDuration, 0, 1);
            const idealRemaining = Math.max(Math.round(totalDuration * (1 - idealProgress)), 0);

            return {
                name: project.name,
                ideal: idealRemaining,
                actual: actualRemaining,
            };
        });
    }, [validProjects]);

    const typeBreakdown = React.useMemo(() => {
        const counts = validProjects.reduce(
            (acc, project) => {
                if (project.assignmentType === 'task') {
                    acc.task.count += 1;
                    acc.task.progress += project.progress;
                } else {
                    acc.support.count += 1;
                    acc.support.progress += project.progress;
                }
                return acc;
            },
            {
                task: { count: 0, progress: 0 },
                support: { count: 0, progress: 0 },
            },
        );

        const total = counts.task.count + counts.support.count;
        return {
            total,
            items: [
                {
                    name: 'Task',
                    value: counts.task.count,
                    average: counts.task.count ? Math.round(counts.task.progress / counts.task.count) : 0,
                    color: assignmentColors.Task,
                },
                {
                    name: 'Support',
                    value: counts.support.count,
                    average: counts.support.count ? Math.round(counts.support.progress / counts.support.count) : 0,
                    color: assignmentColors.Support,
                },
            ],
        };
    }, [validProjects]);

    const summaryStats = React.useMemo(() => {
        const total = projects.length;
        const completed = projects.filter(project => project.status === 'Completed').length;
        const atRisk = projects.filter(project => project.status === 'At Risk').length;
        const averageProgress = total ? Math.round(projects.reduce((acc, project) => acc + project.progress, 0) / total) : 0;
        return { total, completed, atRisk, averageProgress };
    }, [projects]);

    const upcomingMilestones = React.useMemo(() => {
        return [...validProjects]
            .filter(project => project.status !== 'Completed')
            .sort((a, b) => a.due.getTime() - b.due.getTime())
            .slice(0, 4);
    }, [validProjects]);

    return (
        <div className="space-y-6">
            <div className="grid gap-6 xl:grid-cols-3">
                <div className="panel xl:col-span-2 space-y-4 p-0">
                    <div className="border-b border-border/60 px-5 py-4">
                        <h3 className="text-base font-semibold">Timeline (Gantt)</h3>
                        <p className="text-sm text-muted-foreground">Compare start offsets and delivery windows across active workstreams.</p>
                    </div>
                    <div className="p-5">
                        {ganttData.length ? (
                            <ChartContainer config={ganttChartConfig} className="!aspect-auto h-80">
                                <BarChart data={ganttData} layout="vertical" margin={{ left: 24, right: 24 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" width={200} />
                                    <ChartTooltip
                                        cursor={{ fill: 'rgba(148, 163, 184, 0.16)' }}
                                        content={
                                            <ChartTooltipContent
                                                labelFormatter={(value, payload) => {
                                                    const item = payload?.[0]?.payload;
                                                    return item ? `${item.startLabel} → ${item.dueLabel}` : value;
                                                }}
                                                formatter={(value: number) => [`${value} days`, 'Duration']}
                                            />
                                        }
                                    />
                                    <Bar dataKey="startOffset" stackId="timeline" fill="transparent" />
                                    <Bar dataKey="duration" stackId="timeline" radius={[6, 6, 6, 6]} fill="var(--color-duration)" />
                                </BarChart>
                            </ChartContainer>
                        ) : (
                            <div className="flex h-60 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
                                <span>No timeline data yet.</span>
                                <span>Add a project with valid start and due dates.</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="panel space-y-4 p-5">
                    <div>
                        <h3 className="text-base font-semibold">Delivery Pulse</h3>
                        <p className="text-sm text-muted-foreground">At-a-glance health across the portfolio.</p>
                    </div>
                    <div className="space-y-3 text-sm">
                        <div className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2">
                            <span>Total active</span>
                            <span className="font-semibold">{summaryStats.total}</span>
                        </div>
                        <div className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2">
                            <span>Avg. progress</span>
                            <span className="font-semibold">{summaryStats.averageProgress}%</span>
                        </div>
                        <div className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2">
                            <span>Completed</span>
                            <Badge variant="secondary">{summaryStats.completed}</Badge>
                        </div>
                        <div className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2">
                            <span>At risk</span>
                            <Badge variant="destructive">{summaryStats.atRisk}</Badge>
                        </div>
                    </div>
                    <div>
                        <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Upcoming due dates</h4>
                        <div className="mt-2 space-y-2 text-sm">
                            {upcomingMilestones.length ? (
                                upcomingMilestones.map(project => (
                                    <div key={project.id} className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2">
                                        <div>
                                            <div className="font-medium">{project.name}</div>
                                            <p className="text-xs text-muted-foreground">{format(project.due, 'MMM d, yyyy')}</p>
                                        </div>
                                        <Badge variant="outline" className="capitalize">
                                            {project.assignmentType}
                                        </Badge>
                                    </div>
                                ))
                            ) : (
                                <p className="text-xs text-muted-foreground">No upcoming milestones</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <div className="panel space-y-4 p-0">
                    <div className="border-b border-border/60 px-5 py-4">
                        <h3 className="text-base font-semibold">Burn-down Snapshot</h3>
                        <p className="text-sm text-muted-foreground">Contrast expected vs actual remaining effort per project.</p>
                    </div>
                    <div className="p-5">
                        {burnDownData.length ? (
                            <ChartContainer config={burnDownConfig} className="!aspect-auto h-80">
                                <LineChart data={burnDownData} margin={{ left: 12, right: 12 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis allowDecimals={false} />
                                    <ChartTooltip
                                        content={
                                            <ChartTooltipContent
                                                formatter={(value: number, name: string) => [`${value} days`, name === 'ideal' ? 'Ideal remaining' : 'Actual remaining']}
                                            />
                                        }
                                    />
                                    <Legend />
                                    <Line type="monotone" dataKey="ideal" stroke="var(--color-ideal)" strokeWidth={2} dot />
                                    <Line type="monotone" dataKey="actual" stroke="var(--color-actual)" strokeWidth={2} strokeDasharray="4 4" dot />
                                </LineChart>
                            </ChartContainer>
                        ) : (
                            <div className="flex h-60 items-center justify-center text-sm text-muted-foreground">No burn-down data to display.</div>
                        )}
                    </div>
                </div>

                <div className="panel grid gap-4 p-5">
                    <div>
                        <h3 className="text-base font-semibold">Workload Mix</h3>
                        <p className="text-sm text-muted-foreground">Understand where the team invests effort.</p>
                    </div>
                    <div className="grid gap-5 md:grid-cols-2">
                        <div className="flex items-center justify-center">
                            {typeBreakdown.total ? (
                                <ChartContainer
                                    config={{
                                        task: { label: 'Task', color: assignmentColors.Task },
                                        support: { label: 'Support', color: assignmentColors.Support },
                                    }}
                                    className="!aspect-square h-56"
                                >
                                    <PieChart>
                                        <Pie data={typeBreakdown.items} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={4}>
                                            {typeBreakdown.items.map(item => (
                                                <Cell key={item.name} fill={item.color} />
                                            ))}
                                        </Pie>
                                        <RechartsTooltip
                                            formatter={(value: number, name: string) => [`${value} projects`, `${name}`]}
                                            contentStyle={{ borderRadius: '8px', borderColor: 'hsl(var(--border))' }}
                                        />
                                        <Legend />
                                    </PieChart>
                                </ChartContainer>
                            ) : (
                                <div className="flex h-56 flex-col items-center justify-center text-sm text-muted-foreground">No workload data</div>
                            )}
                        </div>
                        <div className="space-y-3 text-sm">
                            {typeBreakdown.items.map(item => (
                                <div key={item.name} className="rounded-md border border-border/60 p-3">
                                    <div className="flex items-center justify-between">
                                        <span className="flex items-center gap-2 font-medium">
                                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                                            {item.name}
                                        </span>
                                        <Badge variant="secondary">{item.value || 0}</Badge>
                                    </div>
                                    <p className="mt-1 text-xs text-muted-foreground">Avg. progress {item.average}%</p>
                                </div>
                            ))}
                            {!typeBreakdown.total && <p className="text-xs text-muted-foreground">Create projects to populate workload trends.</p>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProjectReports;
