'use client';

import React from 'react';
import type { ProjectRecord, AssignmentType, ProjectStatus } from './types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, parseISO, eachDayOfInterval, isWeekend } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { LayoutGrid, Plus, Table } from 'lucide-react';
import { HolidayAPI } from 'holidayapi';

// Store public holidays in memory
let cachedHolidays: string[] = [];
let holidaysLoaded = false;

// Fetch Malaysian public holidays for current year
const fetchPublicHolidays = async () => {
    if (holidaysLoaded) return cachedHolidays;
    
    try {
        const key = '1b8cdf82-ff7a-432a-9455-da9f50bcad22';
        const holidayApi = new HolidayAPI({ key });
        const currentYear = new Date().getFullYear();
        
        const response = await holidayApi.holidays({
            country: 'MY-01',
            year: currentYear,
        });
        
        // Extract dates from response
        if (response && response.holidays) {
            cachedHolidays = response.holidays.map((holiday: any) => holiday.date);
            holidaysLoaded = true;
        }
    } catch (error) {
        console.error('Failed to fetch holidays:', error);
        cachedHolidays = [];
    }
    
    return cachedHolidays;
};

// Calculate business days excluding weekends and public holidays
const calculateBusinessDays = (startDate: string, endDate: string): number => {
    if (!startDate || !endDate) return 0;
    
    try {
        const start = parseISO(startDate);
        const end = parseISO(endDate);
        
        if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
        if (end < start) return 0;
        
        const days = eachDayOfInterval({ start, end });
        
        return days.filter(day => {
            // Exclude weekends
            if (isWeekend(day)) return false;
            
            // Exclude public holidays
            const dateStr = format(day, 'yyyy-MM-dd');
            if (cachedHolidays.includes(dateStr)) return false;
            
            return true;
        }).length;
    } catch {
        return 0;
    }
};

type ProjectOverviewTableProps = {
    projects: ProjectRecord[];
    assignmentTypeFilter: AssignmentType | 'all';
    projectTypeFilter: 'all' | 'dev' | 'it';
    onAssignmentTypeFilterChange: (value: AssignmentType | 'all') => void;
    onProjectTypeFilterChange: (value: 'all' | 'dev' | 'it') => void;
    onCreateProject?: () => void;
    onOpenProject?: (projectId: string) => void;
};

const TYPE_LABEL: Record<AssignmentType, string> = {
    project: 'Project',
    support: 'Support',
    ad_hoc: 'Ad-hoc',
};

const ROLE_LABEL: Record<'developer' | 'collaborator' | 'supervisor', string> = {
    developer: 'Developer',
    collaborator: 'Collaborator',
    supervisor: 'Supervisor',
};

const STATUS_META: Record<ProjectStatus, { label: string; className: string }> = {
    not_started: { label: 'Not Started', className: 'bg-red-500 text-white text-xs truncate' },
    in_progress: { label: 'In Progress', className: 'bg-amber-400/70 text-primary text-xs truncate' },
    completed: { label: 'Completed', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300 text-xs truncate' },
    at_risk: { label: 'At Risk', className: 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300 text-xs truncate' },
};

const STATUS_PROGRESS_COLORS: Record<ProjectStatus, { indicator: string; track: string }> = {
    not_started: { indicator: 'bg-muted-foreground/30', track: 'bg-muted' },
    in_progress: { indicator: 'bg-amber-500', track: 'bg-amber-100' },
    completed: { indicator: 'bg-emerald-500', track: 'bg-emerald-100' },
    at_risk: { indicator: 'bg-amber-600', track: 'bg-amber-100' },
};

const formatDisplayDate = (value: string) => {
    try {
        const parsed = parseISO(value);
        return format(parsed, 'MMM d, yyyy');
    } catch {
        return value;
    }
};

const getPriorityMeta = (priority?: string) => {
    const normalized = (priority || 'medium').toLowerCase();
    const label = normalized.charAt(0).toUpperCase() + normalized.slice(1);

    if (normalized === 'high') {
        return { label, className: 'border-red-500 text-red-700 dark:text-red-400' };
    }

    if (normalized === 'low') {
        return { label, className: 'border-slate-400 text-slate-600 dark:text-slate-400' };
    }

    return { label, className: 'border-amber-500 text-amber-700 dark:text-amber-400' };
};

const ProjectOverviewTable: React.FC<ProjectOverviewTableProps> = ({
    projects,
    assignmentTypeFilter,
    projectTypeFilter,
    onAssignmentTypeFilterChange,
    onProjectTypeFilterChange,
    onCreateProject,
    onOpenProject,
}) => {
    // Fetch holidays on component mount
    React.useEffect(() => {
        fetchPublicHolidays().catch(console.error);
    }, []);

    const filtered = React.useMemo(() => {
        return projects.filter(project => {
            const matchesAssignment = assignmentTypeFilter === 'all' ? true : project.assignmentType === assignmentTypeFilter;
            const matchesProjectType = projectTypeFilter === 'all' ? true : (project.projectType || 'dev') === projectTypeFilter;
            return matchesAssignment && matchesProjectType;
        });
    }, [projects, assignmentTypeFilter, projectTypeFilter]);

    const sorted = React.useMemo(() => {
        return [...filtered].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    }, [filtered]);

    const [viewMode, setViewMode] = React.useState<'card' | 'table'>('card');

    return (
        <div className="panel space-y-4 p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                    <h2 className="text-lg font-semibold">Active Projects</h2>
                    <p className="text-sm text-muted-foreground">Track ownership, timelines, and delivery confidence.</p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Assignment type</span>
                        <Select value={assignmentTypeFilter} onValueChange={value => onAssignmentTypeFilterChange(value as AssignmentType | 'all')}>
                            <SelectTrigger className="w-[160px] sm:w-[180px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All</SelectItem>
                                <SelectItem value="project">Project</SelectItem>
                                <SelectItem value="support">Support</SelectItem>
                                <SelectItem value="ad_hoc">Ad-hoc</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Project type</span>
                        <Select value={projectTypeFilter} onValueChange={value => onProjectTypeFilterChange(value as 'all' | 'dev' | 'it')}>
                            <SelectTrigger className="w-[160px] sm:w-[180px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="dev">Dev</SelectItem>
                                <SelectItem value="it">IT</SelectItem>
                                <SelectItem value="all">All</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex items-center gap-1 rounded-lg border border-border/60 bg-muted/50 p-1">
                        <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className={cn(
                                'h-9 rounded-md px-3 text-sm',
                                viewMode === 'card' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground'
                            )}
                            aria-pressed={viewMode === 'card'}
                            onClick={() => setViewMode('card')}
                        >
                            <LayoutGrid className="h-4 w-4" />
                            <span className="hidden sm:inline">Card</span>
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className={cn(
                                'h-9 rounded-md px-3 text-sm',
                                viewMode === 'table' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground'
                            )}
                            aria-pressed={viewMode === 'table'}
                            onClick={() => setViewMode('table')}
                        >
                            <Table className="h-4 w-4" />
                            <span className="hidden sm:inline">Table</span>
                        </Button>
                    </div>
                    {onCreateProject && (
                        <Button onClick={onCreateProject} className="self-end sm:self-auto">
                            <Plus className="mr-2 h-4 w-4" />
                            Create project
                        </Button>
                    )}
                </div>
            </div>

            {viewMode === 'card' ? (
                sorted.length ? (
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {sorted.map(project => {
                            const primaryAssignment = project.assignments[0];
                            const statusMeta = STATUS_META[project.status];
                            const progressColors = STATUS_PROGRESS_COLORS[project.status];
                            const priorityMeta = getPriorityMeta((project as any).priority as string | undefined);
                            const businessDays = calculateBusinessDays(project.startDate, project.dueDate);
                            const collaboratorsCountFromScopes = new Set(
                                project.deliverables
                                    .map(d => d.assignee)
                                    .filter((assignee): assignee is string => Boolean(assignee))
                            ).size;
                            const teamCount = project.assignments.length || collaboratorsCountFromScopes;

                            return (
                                <Card
                                    key={project.id}
                                    className="border-border/70 h-full shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition hover:-translate-y-0.5 hover:shadow-sm bg-slate-50/60"
                                    onClick={() => onOpenProject && onOpenProject(String(project.id))}
                                    role="button"
                                    tabIndex={0}
                                    onKeyUp={event => {
                                        if (event.key === 'Enter' || event.key === ' ') {
                                            onOpenProject && onOpenProject(String(project.id));
                                        }
                                    }}
                                >
                                    <CardHeader className="flex flex-col gap-2">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex-1 space-y-1">
                                                <CardTitle className="flex items-center gap-2 text-base">
                                                    <span className="line-clamp-1 leading-tight">{project.name}</span>
                                                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusMeta.className}`}>
                                                        {statusMeta.label}
                                                    </span>
                                                </CardTitle>
                                                <CardDescription className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-wide">
                                                    <span className="font-semibold text-foreground">{project.code}</span>
                                                </CardDescription>
                                            </div>
                                            <CardAction className="flex items-start justify-end">
                                                <Badge variant="outline" className={priorityMeta.className}>
                                                    {priorityMeta.label}
                                                </Badge>
                                            </CardAction>
                                        </div>
                                        {project.description && (
                                            <p className="text-sm text-muted-foreground line-clamp-2">{project.description}</p>
                                        )}
                                        {!!project.tags.length && (
                                            <div className="flex flex-wrap gap-1 pt-1">
                                                {project.tags.map(link => (
                                                    <Badge
                                                        key={link.id}
                                                        variant="outline"
                                                        className="border px-2 py-0 text-[10px] font-semibold uppercase tracking-wide"
                                                        style={{ borderColor: link.tag.colorHex, color: link.tag.colorHex }}
                                                    >
                                                        {link.tag.name}
                                                    </Badge>
                                                ))}
                                            </div>
                                        )}
                                    </CardHeader>
                                    <CardContent className="flex-1 space-y-4">
                                        <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-2">
                                            <div className="space-y-1">
                                                <p className="text-xs uppercase tracking-wide text-muted-foreground">Timeline</p>
                                                <p className="text-sm">
                                                    {project.startDate ? formatDisplayDate(project.startDate) : '—'} → {project.dueDate ? formatDisplayDate(project.dueDate) : '—'}
                                                </p>
                                                <p className="text-xs text-muted-foreground">{businessDays} business days</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-xs uppercase tracking-wide text-muted-foreground">Team</p>
                                                <p className="text-sm font-medium">{teamCount} {teamCount === 1 ? 'member' : 'members'}</p>
                                                <p className="text-xs text-muted-foreground">Primary: {primaryAssignment?.assignee || 'Unassigned'}</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                    <CardFooter className="mt-auto flex-col items-stretch gap-2 px-4 pb-2 pt-3">
                                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                                            <span>Progress</span>
                                            <span className="font-semibold text-foreground">{Math.min(project.percentComplete, 100)}%</span>
                                        </div>
                                        <Progress
                                            value={Math.min(project.percentComplete, 100)}
                                            indicatorClassName={progressColors.indicator}
                                            trackClassName={progressColors.track}
                                        />
                                    </CardFooter>
                                </Card>
                            );
                        })}
                    </div>
                ) : (
                    <div className="rounded-lg border border-dashed border-border/70 bg-muted/40 px-4 py-10 text-center text-sm text-muted-foreground">
                        No projects captured yet. Create your first record to begin tracking delivery.
                    </div>
                )
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="border-b border-border/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                                <th className="px-4 py-3 w-12">#</th>
                                <th className="px-4 py-3">Project</th>
                                <th className="px-4 py-3">Assignment</th>
                                <th className="px-4 py-3">Priority</th>
                                <th className="px-4 py-3">Collaborators</th>
                                <th className="px-4 py-3">Duration</th>
                                <th className="px-4 py-3">Progress</th>
                                <th className="px-4 py-3 text-right">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sorted.map((project, index) => {
                                const primaryAssignment = project.assignments[0];
                                const statusMeta = STATUS_META[project.status];
                                const progressColors = STATUS_PROGRESS_COLORS[project.status];
                                const priorityMeta = getPriorityMeta((project as any).priority as string | undefined);
                                const collaboratorsCountFromScopes = new Set(
                                    project.deliverables
                                        .map(d => d.assignee)
                                        .filter((assignee): assignee is string => Boolean(assignee))
                                ).size;
                                const teamCount = project.assignments.length || collaboratorsCountFromScopes;

                                return (
                                    <tr
                                        key={project.id}
                                        className="border-b border-border/40 text-sm transition hover:bg-muted/40 cursor-pointer"
                                        onDoubleClick={() => onOpenProject && onOpenProject(String(project.id))}
                                    >
                                        <td className="px-4 py-3 text-muted-foreground font-medium">
                                            {index + 1}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="font-medium">{project.name}</div>
                                            <div className="text-xs uppercase tracking-wide text-muted-foreground">{project.code}</div>
                                            {project.description && <p className="text-xs text-muted-foreground">{project.description}</p>}
                                            {!!project.tags.length && (
                                                <div className="mt-2 flex flex-wrap gap-1">
                                                    {project.tags.map(link => (
                                                        <Badge
                                                            key={link.id}
                                                            variant="outline"
                                                            className="border px-2 py-0 text-[10px] font-semibold uppercase tracking-wide"
                                                            style={{ borderColor: link.tag.colorHex, color: link.tag.colorHex }}
                                                        >
                                                            {link.tag.name}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-wrap items-center gap-1">
                                                <Badge variant="secondary">{TYPE_LABEL[project.assignmentType]}</Badge>
                                                {primaryAssignment && (
                                                    <Badge variant="outline" className="text-[11px] uppercase">
                                                        {ROLE_LABEL[primaryAssignment.role]}
                                                    </Badge>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <Badge variant="outline" className={priorityMeta.className}>
                                                {priorityMeta.label}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-1">
                                                <span className="font-medium">{teamCount}</span>
                                                <span className="text-xs text-muted-foreground">
                                                    {teamCount === 1 ? 'member' : 'members'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col">
                                                <div className="text-xs text-muted-foreground">
                                                    {project.startDate ? formatDisplayDate(project.startDate) : '—'} → {project.dueDate ? formatDisplayDate(project.dueDate) : '—'}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-medium">
                                                        {calculateBusinessDays(project.startDate, project.dueDate)} days
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">
                                                        (business days)
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className={`h-2 w-full overflow-hidden rounded-full ${progressColors.track}`}>
                                                    <div
                                                        className={`h-full rounded-full ${progressColors.indicator}`}
                                                        style={{ width: `${Math.min(project.percentComplete, 100)}%` }}
                                                    />
                                                </div>
                                                <span className="w-12 text-right font-medium tabular-nums">{project.percentComplete}%</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${statusMeta.className}`}>
                                                {statusMeta.label}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                            {!sorted.length && (
                                <tr>
                                    <td colSpan={8} className="px-4 py-6 text-center text-sm text-muted-foreground">
                                        No projects captured yet. Create your first record to begin tracking delivery.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default ProjectOverviewTable;
