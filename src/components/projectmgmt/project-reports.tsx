'use client';

import React from 'react';
import type { ValueType, NameType } from 'recharts/types/component/DefaultTooltipContent';
import { differenceInCalendarDays, format, isAfter, isValid, parseISO } from 'date-fns';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, Tooltip as RechartsTooltip, XAxis, YAxis } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import type { ProjectRecord, ProjectTag } from './types';
import { Badge } from '@/components/ui/badge';

type ProjectReportsProps = {
    projects: ProjectRecord[];
    tags: ProjectTag[];
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
    Project: '#6366f1',
    Support: '#10b981',
    'Ad-hoc': '#f97316',
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const safeParseISO = (value: string) => {
    try {
        const parsed = parseISO(value);
        return isValid(parsed) ? parsed : null;
    } catch {
        return null;
    }
};

const ProjectReports: React.FC<ProjectReportsProps> = ({ projects, tags }) => {
    const validProjects = React.useMemo(() => {
        return projects
            .map(project => {
                const start = safeParseISO(project.startDate);
                const due = safeParseISO(project.dueDate);
                if (!start || !due) {
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
            const completedDays = Math.round((project.percentComplete / 100) * totalDuration);
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
                switch (project.assignmentType) {
                    case 'project':
                        acc.project.count += 1;
                        acc.project.progress += project.percentComplete;
                        break;
                    case 'support':
                        acc.support.count += 1;
                        acc.support.progress += project.percentComplete;
                        break;
                    case 'ad_hoc':
                        acc.adHoc.count += 1;
                        acc.adHoc.progress += project.percentComplete;
                        break;
                }
                return acc;
            },
            {
                project: { count: 0, progress: 0 },
                support: { count: 0, progress: 0 },
                adHoc: { count: 0, progress: 0 },
            },
        );

        const total = counts.project.count + counts.support.count + counts.adHoc.count;
        return {
            total,
            items: [
                {
                    name: 'Project',
                    value: counts.project.count,
                    average: counts.project.count ? Math.round(counts.project.progress / counts.project.count) : 0,
                    color: assignmentColors.Project,
                },
                {
                    name: 'Support',
                    value: counts.support.count,
                    average: counts.support.count ? Math.round(counts.support.progress / counts.support.count) : 0,
                    color: assignmentColors.Support,
                },
                {
                    name: 'Ad-hoc',
                    value: counts.adHoc.count,
                    average: counts.adHoc.count ? Math.round(counts.adHoc.progress / counts.adHoc.count) : 0,
                    color: assignmentColors['Ad-hoc'],
                },
            ],
        };
    }, [validProjects]);

    const summaryStats = React.useMemo(() => {
        const total = projects.length;
        const completed = projects.filter(project => project.status === 'completed').length;
        const atRisk = projects.filter(project => project.status === 'at_risk').length;
        const averageProgress = total ? Math.round(projects.reduce((acc, project) => acc + project.percentComplete, 0) / total) : 0;
        return { total, completed, atRisk, averageProgress };
    }, [projects]);

    const latestLogs = React.useMemo(() => {
        return projects
            .map(project => {
                if (!project.progressLogs.length) {
                    return null;
                }
                const sorted = [...project.progressLogs].sort((a, b) => b.logDate.localeCompare(a.logDate));
                return { project, log: sorted[0] };
            })
            .filter((entry): entry is { project: ProjectRecord; log: ProjectRecord['progressLogs'][number] } => Boolean(entry));
    }, [projects]);

    const averageRemainingEffort = latestLogs.length
        ? Math.round(latestLogs.reduce((acc, entry) => acc + entry.log.remainingEffortDays, 0) / latestLogs.length)
        : 0;
    const overridesCount = latestLogs.filter(entry => entry.log.statusOverride).length;

    const supportCoverage = React.useMemo(() => {
        const shifts = projects.flatMap(project =>
            project.supportShifts.map(shift => ({
                ...shift,
                projectName: project.name,
            })),
        );

        const totalHours = shifts.reduce((acc, shift) => acc + shift.coverageHours, 0);
        const upcomingEntry = shifts
            .map(shift => {
                const start = safeParseISO(shift.shiftStart);
                const end = shift.shiftEnd ? safeParseISO(shift.shiftEnd) : null;
                return { shift, start, end };
            })
            .filter((entry): entry is { shift: (typeof shifts)[number]; start: Date; end: Date | null } => Boolean(entry.start))
            .filter(entry => isAfter(entry.end ?? entry.start, new Date()))
            .sort((a, b) => a.start.getTime() - b.start.getTime())[0];

        return {
            totalHours,
            shiftCount: shifts.length,
            upcomingShift: upcomingEntry
                ? {
                      ...upcomingEntry.shift,
                      start: upcomingEntry.start,
                      end: upcomingEntry.end ?? undefined,
                  }
                : null,
        };
    }, [projects]);

    const tagCoverage = React.useMemo(() => {
        const usage = new Map<string, { tag: ProjectTag; count: number }>();
        projects.forEach(project => {
            project.tags.forEach(link => {
                const existing = usage.get(link.tag.slug);
                if (existing) {
                    existing.count += 1;
                } else {
                    usage.set(link.tag.slug, { tag: link.tag, count: 1 });
                }
            });
        });
        const used = Array.from(usage.values()).sort((a, b) => b.count - a.count);
        const unused = tags.filter(tag => !usage.has(tag.slug));
        return { used, unused };
    }, [projects, tags]);

    const upcomingMilestones = React.useMemo(() => {
        const queue = projects.flatMap(project =>
            project.milestones.map(milestone => ({
                project,
                milestone,
                targetDate: safeParseISO(milestone.targetDate),
            })),
        );

        return queue
            .filter(({ milestone }) => {
                if (milestone.status === 'completed') return false;
                return true;
            })
            .filter(item => item.targetDate && isAfter(item.targetDate, new Date()))
            .sort((a, b) => (a.targetDate?.getTime() ?? 0) - (b.targetDate?.getTime() ?? 0))
            .slice(0, 4);
    }, [projects]);

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
                                                formatter={(value: ValueType, _name: NameType) => {
                                                    const v = Array.isArray(value) ? value.join(', ') : value;
                                                    return [`${v} days`, 'Duration'];
                                                }}
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
                        <div className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2">
                            <span>Avg. remaining effort</span>
                            <span className="font-semibold">{averageRemainingEffort}d</span>
                        </div>
                        <div className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2">
                            <span>Status overrides</span>
                            <Badge variant={overridesCount ? 'destructive' : 'secondary'}>{overridesCount}</Badge>
                        </div>
                    </div>
                    <div>
                        <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Upcoming due dates</h4>
                        <div className="mt-2 space-y-2 text-sm">
                            {upcomingMilestones.length ? (
                                upcomingMilestones.map(({ project, milestone, targetDate }) => (
                                    <div key={milestone.id} className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2">
                                        <div>
                                            <div className="font-medium">{milestone.name}</div>
                                            <p className="text-xs text-muted-foreground">
                                                {project.name} • {targetDate ? format(targetDate, 'MMM d, yyyy') : milestone.targetDate}
                                            </p>
                                        </div>
                                        <Badge variant="outline" className="capitalize">
                                            {milestone.status.replace('_', ' ')}
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
                                                formatter={(value: ValueType, name: NameType) => {
                                                    const v = Array.isArray(value) ? value.join(', ') : value;
                                                    const label = String(name) === 'ideal' ? 'Ideal remaining' : 'Actual remaining';
                                                    return [`${v} days`, label];
                                                }}
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
                                        Project: { label: 'Project', color: assignmentColors.Project },
                                        Support: { label: 'Support', color: assignmentColors.Support },
                                        'Ad-hoc': { label: 'Ad-hoc', color: assignmentColors['Ad-hoc'] },
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
                            {!!tagCoverage.used.length && (
                                <div className="mt-4 space-y-2">
                                    <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Top Tags</h4>
                                    {tagCoverage.used.slice(0, 4).map(item => (
                                        <div key={item.tag.id} className="flex items-center justify-between rounded-md border border-dashed border-border/60 px-3 py-2">
                                            <span className="flex items-center gap-2">
                                                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.tag.colorHex }} />
                                                {item.tag.name}
                                            </span>
                                            <Badge variant="outline" className="border-foreground/40 text-xs">
                                                {item.count}
                                            </Badge>
                                        </div>
                                    ))}
                                    {tagCoverage.unused.length > 0 && (
                                        <p className="text-xs text-muted-foreground">
                                            Not used:{' '}
                                            <span className="font-medium">
                                                {tagCoverage.unused
                                                    .map(tag => tag.name)
                                                    .join(', ')}
                                            </span>
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <div className="panel space-y-4 p-5">
                    <div>
                        <h3 className="text-base font-semibold">Support Coverage</h3>
                        <p className="text-sm text-muted-foreground">Shifts captured from active support engagements.</p>
                    </div>
                    <div className="space-y-3 text-sm">
                        <div className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2">
                            <span>Total shifts</span>
                            <Badge variant="secondary">{supportCoverage.shiftCount}</Badge>
                        </div>
                        <div className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2">
                            <span>Coverage hours</span>
                            <span className="font-semibold">{supportCoverage.totalHours.toFixed(1)}</span>
                        </div>
                    </div>
                    <div>
                        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Next shift</h4>
                        {supportCoverage.upcomingShift ? (
                            <div className="mt-2 space-y-1 rounded-md border border-border/60 px-3 py-2 text-sm">
                                <div className="font-medium">{supportCoverage.upcomingShift.projectName}</div>
                                <p className="text-xs text-muted-foreground">
                                    {format(supportCoverage.upcomingShift.start, 'MMM d, yyyy • HH:mm')}
                                    {supportCoverage.upcomingShift.end && ` → ${format(supportCoverage.upcomingShift.end, 'HH:mm')}`}
                                </p>
                                <p className="text-xs text-muted-foreground">Coverage {supportCoverage.upcomingShift.coverageHours} hours</p>
                            </div>
                        ) : (
                            <p className="mt-2 text-xs text-muted-foreground">No upcoming shifts scheduled.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProjectReports;
