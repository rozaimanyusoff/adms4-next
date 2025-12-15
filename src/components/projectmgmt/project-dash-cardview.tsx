'use client';

import React from 'react';
import type { ProjectRecord } from './types';
import { Badge } from '@/components/ui/badge';
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useRouter } from 'next/navigation';
import {
    calculateBusinessDays,
    formatDisplayDate,
    getPriorityMeta,
    STATUS_META,
    STATUS_PROGRESS_COLORS,
} from './project-dash-helpers';

type ProjectDashCardViewProps = {
    projects: ProjectRecord[];
    onOpenProject?: (projectId: string) => void;
};

const ProjectDashCardView: React.FC<ProjectDashCardViewProps> = ({ projects, onOpenProject }) => {
    const router = useRouter();
    const openProject = (id: string) => {
        if (onOpenProject) {
            onOpenProject(id);
        } else {
            router.push(`/projectmgmt/${encodeURIComponent(id)}`);
        }
    };

    if (!projects.length) {
        return (
            <div className="rounded-lg border border-dashed border-border/70 bg-muted/40 px-4 py-10 text-center text-sm text-muted-foreground">
                No projects captured yet. Create your first record to begin tracking delivery.
            </div>
        );
    }

    return (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {projects.map(project => {
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
                        onClick={() => openProject(String(project.id))}
                        role="button"
                        tabIndex={0}
                        onKeyUp={event => {
                            if (event.key === 'Enter' || event.key === ' ') {
                                openProject(String(project.id));
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
    );
};

export default ProjectDashCardView;
