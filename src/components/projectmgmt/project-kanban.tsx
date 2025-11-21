'use client';

import React from 'react';
import { format, isValid, parseISO } from 'date-fns';
import type { ProjectRecord, ProjectStatus } from './types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { CalendarRange, ListChecks, Plus, Timer } from 'lucide-react';

type ProjectKanbanProps = {
    projects: ProjectRecord[];
    onCreateProject?: () => void;
};

const STATUS_ORDER: ProjectStatus[] = ['not_started', 'in_progress', 'at_risk', 'completed'];

const STATUS_META: Record<ProjectStatus, { label: string; accentClass: string; mutedClass: string }> = {
    not_started: { label: 'Not started', accentClass: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200', mutedClass: 'bg-slate-50 dark:bg-slate-900/40' },
    in_progress: { label: 'In progress', accentClass: 'bg-amber-200 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200', mutedClass: 'bg-amber-50 dark:bg-amber-900/20' },
    at_risk: { label: 'To review', accentClass: 'bg-red-200 text-red-800 dark:bg-red-500/15 dark:text-red-200', mutedClass: 'bg-red-50 dark:bg-red-900/20' },
    completed: { label: 'Completed', accentClass: 'bg-emerald-200 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200', mutedClass: 'bg-emerald-50 dark:bg-emerald-900/20' },
};

const formatDate = (value: string) => {
    if (!value) return 'No date';
    const parsed = parseISO(value);
    if (!isValid(parsed)) return value;
    return format(parsed, 'MMM d, yyyy');
};

const ProjectKanban: React.FC<ProjectKanbanProps> = ({ projects, onCreateProject }) => {
    const [boardProjects, setBoardProjects] = React.useState<ProjectRecord[]>(projects);
    const [draggingId, setDraggingId] = React.useState<string | null>(null);

    React.useEffect(() => {
        setBoardProjects(projects);
    }, [projects]);

    const grouped = React.useMemo(() => {
        const buckets: Record<ProjectStatus, ProjectRecord[]> = {
            not_started: [],
            in_progress: [],
            at_risk: [],
            completed: [],
        };

        boardProjects.forEach(project => {
            const status = STATUS_ORDER.includes(project.status) ? project.status : 'in_progress';
            buckets[status].push(project);
        });

        STATUS_ORDER.forEach(status => {
            buckets[status].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
        });

        return buckets;
    }, [boardProjects]);

    const handleDragStart = (projectId: string) => setDraggingId(projectId);
    const handleDragEnd = () => setDraggingId(null);
    const handleDrop = (status: ProjectStatus) => {
        if (!draggingId) return;
        setBoardProjects(prev =>
            prev.map(project =>
                project.id === draggingId
                    ? { ...project, status }
                    : project,
            ),
        );
        setDraggingId(null);
    };
    const allowDrop = (event: React.DragEvent) => {
        event.preventDefault();
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-lg font-semibold">Project Kanban</h2>
                    <p className="text-sm text-muted-foreground">Glance through delivery status and quickly spot what needs attention.</p>
                </div>
                {onCreateProject && (
                    <Button onClick={onCreateProject} size="sm">
                        <Plus className="mr-2 h-4 w-4" />
                        Create project
                    </Button>
                )}
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {STATUS_ORDER.map(status => {
                    const projectsInColumn = grouped[status];
                    const meta = STATUS_META[status];

                    return (
                        <div
                            key={status}
                            className={cn(
                                'panel flex h-full min-h-[340px] flex-col gap-3 p-4 transition',
                                draggingId ? 'shadow-sm' : '',
                            )}
                            onDragOver={allowDrop}
                            onDrop={() => handleDrop(status)}
                        >
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <span
                                        className={cn(
                                            'h-2 w-2 rounded-full',
                                            status === 'completed'
                                                ? 'bg-emerald-500'
                                                : status === 'at_risk'
                                                    ? 'bg-red-500'
                                                    : status === 'in_progress'
                                                        ? 'bg-amber-500'
                                                        : 'bg-slate-400',
                                        )}
                                    />
                                    <span className="text-sm font-medium">{meta.label}</span>
                                </div>
                                <Badge variant="secondary" className={cn('text-xs font-semibold', meta.accentClass)}>
                                    {projectsInColumn.length}
                                </Badge>
                            </div>

                            <div className="flex-1 space-y-3 overflow-auto">
                                {projectsInColumn.length ? (
                                    projectsInColumn.map(project => {
                                        const primaryAssignment = project.assignments[0];

                                        return (
                                            <div
                                                key={project.id}
                                                className={cn(
                                                    'select-none rounded-lg border border-border/60 bg-background/90 p-3 shadow-sm ring-1 ring-transparent transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md',
                                                    draggingId === project.id ? 'opacity-90 ring-2 ring-primary/40' : 'cursor-grab',
                                                )}
                                                draggable
                                                onDragStart={() => handleDragStart(project.id)}
                                                onDragEnd={handleDragEnd}
                                                aria-grabbed={draggingId === project.id}
                                            >
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="space-y-1">
                                                        <p className="text-xs uppercase tracking-wide text-muted-foreground">{project.code || 'Uncoded'}</p>
                                                        <p className="text-sm font-semibold leading-tight">{project.name}</p>
                                                    </div>
                                                    <Badge variant="outline" className="text-[11px]">
                                                        {project.assignmentType === 'ad_hoc' ? 'Ad-hoc' : project.assignmentType === 'support' ? 'Support' : 'Project'}
                                                    </Badge>
                                                </div>

                                                <div className="mt-3 space-y-2">
                                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                        <CalendarRange className="h-4 w-4" />
                                                        <span>{project.startDate ? formatDate(project.startDate) : 'No start'} → {project.dueDate ? formatDate(project.dueDate) : 'No due date'}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                        <Timer className="h-4 w-4" />
                                                        <span>{project.durationDays ? `${project.durationDays} days` : 'Duration unknown'}</span>
                                                        {primaryAssignment?.assignee && (
                                                            <>
                                                                <span className="text-muted-foreground/50">•</span>
                                                                <ListChecks className="h-4 w-4" />
                                                                <span>{primaryAssignment.assignee}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                    <div className={cn('rounded-md p-2', meta.mutedClass)}>
                                                        <div className="flex items-center justify-between text-xs">
                                                            <span className="font-medium text-foreground">Progress</span>
                                                            <span className="font-semibold tabular-nums">{project.percentComplete}%</span>
                                                        </div>
                                                        <Progress value={project.percentComplete} className="mt-2 h-2" />
                                                    </div>
                                                    {project.tags?.length ? (
                                                        <div className="flex flex-wrap gap-2">
                                                            {project.tags.map(link => (
                                                                <span
                                                                    key={link.id}
                                                                    className="rounded-full px-2 py-1 text-[11px] font-medium text-foreground/80"
                                                                    style={{ backgroundColor: `${link.tag.colorHex}20`, color: link.tag.colorHex }}
                                                                >
                                                                    {link.tag.name}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    ) : null}
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border/70 text-center text-sm text-muted-foreground">
                                        <p>No projects in this stage.</p>
                                        {onCreateProject && status === 'not_started' && (
                                            <Button size="sm" variant="ghost" onClick={onCreateProject}>
                                                <Plus className="mr-2 h-4 w-4" />
                                                Create project
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ProjectKanban;
