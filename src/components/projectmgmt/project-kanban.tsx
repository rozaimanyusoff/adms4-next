'use client';

import React from 'react';
import { format, isValid, parseISO } from 'date-fns';
import type { ProjectRecord } from './types';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { CalendarRange, ListChecks, Timer } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { authenticatedApi } from '@/config/api';

type ProjectKanbanProps = {
    projects: ProjectRecord[];
};

type ScopeStatus = 'not_started' | 'in_progress' | 'to_review' | 'completed';

const STATUS_ORDER: ScopeStatus[] = ['not_started', 'in_progress', 'to_review', 'completed'];

const STATUS_META: Record<ScopeStatus, { label: string; accentClass: string; mutedClass: string }> = {
    not_started: { label: 'Not started', accentClass: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200', mutedClass: 'bg-slate-50 dark:bg-slate-900/40' },
    in_progress: { label: 'In progress', accentClass: 'bg-amber-200 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200', mutedClass: 'bg-amber-50 dark:bg-amber-900/20' },
    to_review: { label: 'To review', accentClass: 'bg-red-200 text-red-800 dark:bg-red-500/15 dark:text-red-200', mutedClass: 'bg-red-50 dark:bg-red-900/20' },
    completed: { label: 'Completed', accentClass: 'bg-emerald-200 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200', mutedClass: 'bg-emerald-50 dark:bg-emerald-900/20' },
};

const formatDate = (value: string) => {
    if (!value) return 'No date';
    const parsed = parseISO(value);
    if (!isValid(parsed)) return value;
    return format(parsed, 'MMM d, yyyy');
};

type ScopeCard = {
    id: string;
    scopeId: string;
    projectId: string;
    projectName: string;
    projectCode: string;
    title: string;
    status: ScopeStatus;
    progress: number;
    startDate: string;
    endDate: string;
    assignee?: string;
};

const ProjectKanban: React.FC<ProjectKanbanProps> = ({ projects }) => {
    const [boardProjects, setBoardProjects] = React.useState<ProjectRecord[]>(projects);
    const [draggingId, setDraggingId] = React.useState<string | null>(null);
    const [selectedProjectId, setSelectedProjectId] = React.useState<string>('all');
    const [selectedAssignee, setSelectedAssignee] = React.useState<string>('all');
    const [pendingUpdate, setPendingUpdate] = React.useState<{ card: ScopeCard; targetStatus: ScopeStatus } | null>(null);
    const [activityReason, setActivityReason] = React.useState('');
    const [saving, setSaving] = React.useState(false);

    React.useEffect(() => {
        setBoardProjects(projects);
    }, [projects]);

    const scopeCards = React.useMemo<ScopeCard[]>(() => {
        const projectFilter = selectedProjectId;
        const assigneeFilter = selectedAssignee.toLowerCase();
        const cards: ScopeCard[] = [];
        boardProjects.forEach(project => {
            if (projectFilter !== 'all' && String(project.id) !== projectFilter) return;
            project.deliverables.forEach(deliverable => {
                const status = (deliverable.status as ScopeStatus) || 'not_started';
                const cardAssignee = deliverable.assignee || '';
                if (assigneeFilter !== 'all' && cardAssignee.toLowerCase() !== assigneeFilter) return;
                cards.push({
                    id: `${project.id}_${deliverable.id}`,
                    scopeId: String(deliverable.serverId || deliverable.id),
                    projectId: String(project.id),
                    projectName: project.name,
                    projectCode: project.code,
                    title: deliverable.name || project.name,
                    status: STATUS_ORDER.includes(status) ? status : 'in_progress',
                    progress: typeof deliverable.progress === 'number' ? deliverable.progress : project.percentComplete,
                    startDate: deliverable.startDate || project.startDate,
                    endDate: deliverable.endDate || project.dueDate,
                    assignee: deliverable.assignee || project.assignments[0]?.assignee,
                });
            });
        });
        return cards;
    }, [boardProjects, selectedAssignee, selectedProjectId]);

    const assigneeOptions = React.useMemo(() => {
        const names = new Set<string>();
        boardProjects.forEach(project => {
            project.deliverables.forEach(deliverable => {
                if (deliverable.assignee) {
                    names.add(deliverable.assignee);
                }
            });
        });
        return Array.from(names).sort((a, b) => a.localeCompare(b));
    }, [boardProjects]);

    const grouped = React.useMemo(() => {
        const buckets: Record<ScopeStatus, ScopeCard[]> = {
            not_started: [],
            in_progress: [],
            to_review: [],
            completed: [],
        };

        scopeCards.forEach(card => {
            const status = STATUS_ORDER.includes(card.status) ? card.status : 'in_progress';
            buckets[status].push(card);
        });

        STATUS_ORDER.forEach(status => {
            buckets[status].sort((a, b) => a.endDate.localeCompare(b.endDate));
        });

        return buckets;
    }, [scopeCards]);

    const handleDragStart = (projectId: string) => setDraggingId(projectId);
    const handleDragEnd = () => setDraggingId(null);
    const handleDrop = (status: ScopeStatus) => {
        if (!draggingId) return;
        const card = scopeCards.find(c => c.id === draggingId);
        if (!card) {
            setDraggingId(null);
            return;
        }
        setPendingUpdate({ card, targetStatus: status });
        setActivityReason('');
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
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm text-muted-foreground">Project</span>
                        <Select value={selectedProjectId} onValueChange={value => setSelectedProjectId(value)}>
                            <SelectTrigger className="w-[220px]">
                                <SelectValue placeholder="All projects" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All projects</SelectItem>
                                {boardProjects.map(project => (
                                    <SelectItem key={project.id} value={String(project.id)}>
                                        {project.name || project.code || `Project ${project.id}`}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm text-muted-foreground">Assignee</span>
                        <Select value={selectedAssignee} onValueChange={value => setSelectedAssignee(value)}>
                            <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder="All assignees" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All assignees</SelectItem>
                                {assigneeOptions.map(name => (
                                    <SelectItem key={name} value={name}>
                                        {name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {STATUS_ORDER.map(status => {
                    const cardsInColumn = grouped[status];
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
                                                : status === 'to_review'
                                                    ? 'bg-red-500'
                                                    : status === 'in_progress'
                                                        ? 'bg-amber-500'
                                                        : 'bg-slate-400',
                                        )}
                                    />
                                    <span className="text-sm font-medium">{meta.label}</span>
                                </div>
                                <Badge variant="secondary" className={cn('text-xs font-semibold', meta.accentClass)}>
                                    {cardsInColumn.length}
                                </Badge>
                            </div>

                            <div className="flex-1 space-y-3 overflow-auto">
                                {cardsInColumn.length ? (
                                    cardsInColumn.map(card => {

                                        return (
                                            <div
                                                key={card.id}
                                                className={cn(
                                                    'select-none rounded-lg border border-border/60 bg-background/90 p-3 shadow-sm ring-1 ring-transparent transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md',
                                                    draggingId === card.id ? 'opacity-90 ring-2 ring-primary/40' : 'cursor-grab',
                                                )}
                                                draggable
                                                onDragStart={() => handleDragStart(card.id)}
                                                onDragEnd={handleDragEnd}
                                                aria-grabbed={draggingId === card.id}
                                            >
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="space-y-1">
                                                        <p className="text-xs uppercase tracking-wide text-muted-foreground">{card.projectCode || 'Uncoded'}</p>
                                                        <p className="text-sm font-semibold leading-tight">{card.title}</p>
                                                        <p className="text-xs text-muted-foreground">{card.projectName}</p>
                                                    </div>
                                                </div>

                                                <div className="mt-3 space-y-2">
                                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                        <CalendarRange className="h-4 w-4" />
                                                        <span>{card.startDate ? formatDate(card.startDate) : 'No start'} → {card.endDate ? formatDate(card.endDate) : 'No due date'}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                        <Timer className="h-4 w-4" />
                                                        <span>
                                                            {card.startDate && card.endDate
                                                                ? `${Math.max(1, Math.round((parseISO(card.endDate).getTime() - parseISO(card.startDate).getTime()) / (1000 * 60 * 60 * 24)))} days`
                                                                : 'Duration unknown'}
                                                        </span>
                                                        {card.assignee && (
                                                            <>
                                                                <span className="text-muted-foreground/50">•</span>
                                                                <ListChecks className="h-4 w-4" />
                                                                <span>{card.assignee}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                    <div className={cn('rounded-md p-2', meta.mutedClass)}>
                                                        <div className="flex items-center justify-between text-xs">
                                                            <span className="font-medium text-foreground">Progress</span>
                                                            <span className="font-semibold tabular-nums">{Math.round(card.progress)}%</span>
                                                        </div>
                                                        <Progress value={card.progress} className="mt-2 h-2" />
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border/70 text-center text-sm text-muted-foreground">
                                        <p>No projects in this stage.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            <Dialog open={Boolean(pendingUpdate)} onOpenChange={open => { if (!open) { setPendingUpdate(null); setActivityReason(''); setSaving(false); } }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Update status</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                        <p className="text-sm text-muted-foreground">
                            Provide an activity reason for moving <span className="font-medium text-foreground">{pendingUpdate?.card.title}</span> to <span className="font-medium text-foreground">
                                {STATUS_META[pendingUpdate?.targetStatus ?? 'in_progress'].label}
                            </span>.
                        </p>
                        <Textarea
                            placeholder="Critical bugs found during QA review"
                            value={activityReason}
                            onChange={e => setActivityReason(e.target.value)}
                            rows={4}
                        />
                    </div>
                    <DialogFooter className="gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => { setPendingUpdate(null); setActivityReason(''); setSaving(false); }}
                            disabled={saving}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            onClick={async () => {
                                if (!pendingUpdate) return;
                                const { card, targetStatus } = pendingUpdate;
                                const apiStatus = targetStatus;
                                setSaving(true);
                                try {
                                    await authenticatedApi.put(`/api/projects/${card.projectId}/scopes/${card.scopeId}`, {
                                        status: apiStatus,
                                        activity_reason: activityReason || 'Status updated via Kanban',
                                    });
                                    setBoardProjects(prev =>
                                        prev.map(p => {
                                            if (String(p.id) !== card.projectId) return p;
                                            return {
                                                ...p,
                                                deliverables: p.deliverables.map(d =>
                                                    String(d.serverId || d.id) === card.scopeId
                                                        ? { ...d, status: targetStatus as any }
                                                        : d,
                                                ),
                                            };
                                        }),
                                    );
                                    toast.success('Status updated');
                                } catch (err: any) {
                                    toast.error(err?.message || 'Failed to update status');
                                } finally {
                                    setSaving(false);
                                    setPendingUpdate(null);
                                    setActivityReason('');
                                }
                            }}
                            disabled={saving}
                        >
                            Save
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default ProjectKanban;
