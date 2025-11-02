'use client';

import React from 'react';
import type { ProjectRecord, AssignmentType, ProjectStatus } from './types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

type ProjectOverviewTableProps = {
    projects: ProjectRecord[];
    assignmentTypeFilter: AssignmentType | 'all';
    onAssignmentTypeFilterChange: (value: AssignmentType | 'all') => void;
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
    not_started: { label: 'Not Started', className: 'bg-muted text-muted-foreground' },
    in_progress: { label: 'In Progress', className: 'bg-primary/10 text-primary' },
    completed: { label: 'Completed', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' },
    at_risk: { label: 'At Risk', className: 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300' },
};

const formatDisplayDate = (value: string) => {
    try {
        const parsed = parseISO(value);
        return format(parsed, 'MMM d, yyyy');
    } catch {
        return value;
    }
};

const ProjectOverviewTable: React.FC<ProjectOverviewTableProps> = ({
    projects,
    assignmentTypeFilter,
    onAssignmentTypeFilterChange,
    onCreateProject,
    onOpenProject,
}) => {
    const filtered = React.useMemo(() => {
        if (assignmentTypeFilter === 'all') {
            return projects;
        }
        return projects.filter(project => project.assignmentType === assignmentTypeFilter);
    }, [projects, assignmentTypeFilter]);

    const sorted = React.useMemo(() => {
        return [...filtered].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    }, [filtered]);

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
                    {onCreateProject && (
                        <Button onClick={onCreateProject} className="self-end sm:self-auto">
                            <Plus className="mr-2 h-4 w-4" />
                            Create project
                        </Button>
                    )}
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="border-b border-border/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                            <th className="px-4 py-3">Project</th>
                            <th className="px-4 py-3">Assignment</th>
                            <th className="px-4 py-3">Assignor</th>
                            <th className="px-4 py-3">Assignee</th>
                            <th className="px-4 py-3">Duration</th>
                            <th className="px-4 py-3">Due</th>
                            <th className="px-4 py-3">Progress</th>
                            <th className="px-4 py-3 text-right">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sorted.map(project => {
                            const primaryAssignment = project.assignments[0];
                            const statusMeta = STATUS_META[project.status];
                            return (
                                <tr
                                    key={project.id}
                                    className="border-b border-border/40 text-sm transition hover:bg-muted/40 cursor-pointer"
                                    onDoubleClick={() => onOpenProject && onOpenProject(String(project.id))}
                                >
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
                                    <td className="px-4 py-3">{primaryAssignment?.assignor ?? '—'}</td>
                                    <td className="px-4 py-3">{primaryAssignment?.assignee ?? '—'}</td>
                                    <td className="px-4 py-3">{project.durationDays} days</td>
                                    <td className="px-4 py-3">{formatDisplayDate(project.dueDate)}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                                                <div
                                                    className="h-full rounded-full bg-primary"
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
        </div>
    );
};

export default ProjectOverviewTable;
