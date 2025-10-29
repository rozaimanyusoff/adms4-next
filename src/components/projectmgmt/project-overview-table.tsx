'use client';

import React from 'react';
import { ProjectRecord, AssignmentType } from './types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';

type ProjectOverviewTableProps = {
    projects: ProjectRecord[];
    assignmentTypeFilter: AssignmentType | 'all';
    onAssignmentTypeFilterChange: (value: AssignmentType | 'all') => void;
};

const TYPE_LABEL: Record<AssignmentType, string> = {
    task: 'Task',
    support: 'Support',
};

const STATUS_COLOR: Record<ProjectRecord['status'], string> = {
    'Not Started': 'bg-muted text-muted-foreground',
    'In Progress': 'bg-primary/10 text-primary',
    Completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
    'At Risk': 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
};

const formatDisplayDate = (value: string) => {
    try {
        const parsed = parseISO(value);
        return format(parsed, 'MMM d, yyyy');
    } catch {
        return value;
    }
};

const ProjectOverviewTable: React.FC<ProjectOverviewTableProps> = ({ projects, assignmentTypeFilter, onAssignmentTypeFilterChange }) => {
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
                <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Assignment type</span>
                    <Select value={assignmentTypeFilter} onValueChange={value => onAssignmentTypeFilterChange(value as AssignmentType | 'all')}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            <SelectItem value="task">Task</SelectItem>
                            <SelectItem value="support">Support</SelectItem>
                        </SelectContent>
                    </Select>
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
                        {sorted.map(project => (
                            <tr key={project.id} className="border-b border-border/40 text-sm transition hover:bg-muted/40">
                                <td className="px-4 py-3">
                                    <div className="font-medium">{project.name}</div>
                                    {project.description && <p className="text-xs text-muted-foreground">{project.description}</p>}
                                </td>
                                <td className="px-4 py-3">
                                    <Badge variant="secondary">{TYPE_LABEL[project.assignmentType]}</Badge>
                                </td>
                                <td className="px-4 py-3">{project.assignor}</td>
                                <td className="px-4 py-3">{project.assignee}</td>
                                <td className="px-4 py-3">{project.durationDays} days</td>
                                <td className="px-4 py-3">{formatDisplayDate(project.dueDate)}</td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                                            <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(project.progress, 100)}%` }} />
                                        </div>
                                        <span className="w-12 text-right font-medium tabular-nums">{project.progress}%</span>
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLOR[project.status]}`}>{project.status}</span>
                                </td>
                            </tr>
                        ))}
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

