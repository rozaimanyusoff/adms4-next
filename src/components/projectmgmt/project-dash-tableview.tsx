'use client';

import React from 'react';
import type { ProjectRecord } from './types';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import {
    calculateBusinessDays,
    formatDisplayDate,
    getPriorityMeta,
    STATUS_META,
    STATUS_PROGRESS_COLORS,
    TYPE_LABEL,
    ROLE_LABEL,
} from './project-dash-helpers';

type ProjectDashTableViewProps = {
    projects: ProjectRecord[];
    onOpenProject?: (projectId: string) => void;
};

const ProjectDashTableView: React.FC<ProjectDashTableViewProps> = ({ projects, onOpenProject }) => {
    const router = useRouter();
    const openProject = (id: string) => {
        if (onOpenProject) {
            onOpenProject(id);
        } else {
            router.push(`/projectmgmt/${encodeURIComponent(id)}`);
        }
    };

    return (
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
                    {projects.map((project, index) => {
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
                                onClick={() => openProject(String(project.id))}
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
                    {!projects.length && (
                        <tr>
                            <td colSpan={8} className="px-4 py-6 text-center text-sm text-muted-foreground">
                                No projects captured yet. Create your first record to begin tracking delivery.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default ProjectDashTableView;
