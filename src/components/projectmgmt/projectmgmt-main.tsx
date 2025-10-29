'use client';

import React from 'react';
import { isBefore, isValid, parseISO, differenceInCalendarDays } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ProjectRegistrationForm from './project-registration-form';
import ProjectOverviewTable from './project-overview-table';
import ProjectReports from './project-reports';
import { ProjectFormValues, ProjectRecord, ProjectStatus, AssignmentType } from './types';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

const assignorDirectory = ['PMO Lead', 'Service Desk Manager', 'Finance Head', 'Operations Director'];
const assigneeDirectory = ['Melissa Carter', 'Benjamin Lee', 'April Ramos', 'Liam Patel', 'Natalie Chen', 'Omar Idris'];

const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return `proj_${Math.random().toString(36).slice(2, 10)}`;
};

const computeDurationDays = (startDate: string, dueDate: string) => {
    const start = parseISO(startDate);
    const due = parseISO(dueDate);
    if (!isValid(start) || !isValid(due)) {
        return 0;
    }
    const diff = differenceInCalendarDays(due, start) + 1;
    return diff > 0 ? diff : 0;
};

const inferStatus = (project: ProjectRecord, today = new Date()): ProjectStatus => {
    if (project.progress >= 100) {
        return 'Completed';
    }

    const start = parseISO(project.startDate);
    const due = parseISO(project.dueDate);

    if (isValid(due) && differenceInCalendarDays(due, today) < 0) {
        return 'At Risk';
    }

    if (isValid(due) && project.progress < 80) {
        const daysRemaining = differenceInCalendarDays(due, today);
        if (daysRemaining <= 2) {
            return 'At Risk';
        }
    }

    if (isValid(start) && isBefore(today, start) && project.progress === 0) {
        return 'Not Started';
    }

    if (project.progress <= 0) {
        return 'Not Started';
    }

    return 'In Progress';
};

const hydrateRecord = (values: ProjectFormValues): ProjectRecord => {
    const durationDays = computeDurationDays(values.startDate, values.dueDate);
    const baseRecord: ProjectRecord = {
        id: generateId(),
        name: values.name,
        description: values.description,
        assignmentType: values.assignmentType,
        assignor: values.assignor,
        assignee: values.assignee,
        startDate: values.startDate,
        dueDate: values.dueDate,
        durationDays,
        progress: Math.max(0, Math.min(100, Math.round(values.progress))),
        status: 'Not Started',
    };

    return { ...baseRecord, status: inferStatus(baseRecord) };
};

const defaultProjects: ProjectRecord[] = [
    hydrateRecord({
        name: 'Customer Support Ticket Automation',
        description: 'Integrate AI triage rules for high-volume support queues.',
        assignmentType: 'task',
        assignor: assignorDirectory[0],
        assignee: assigneeDirectory[0],
        startDate: '2024-10-01',
        dueDate: '2024-12-15',
        progress: 55,
    }),
    hydrateRecord({
        name: 'Finance Month-End Stabilization',
        description: 'Support finance team during quarter close with reconciliations.',
        assignmentType: 'support',
        assignor: assignorDirectory[2],
        assignee: assigneeDirectory[2],
        startDate: '2024-11-10',
        dueDate: '2025-01-05',
        progress: 35,
    }),
    hydrateRecord({
        name: 'Operations Playbook Refresh',
        description: 'Update SOPs to reflect the new logistics workflow.',
        assignmentType: 'task',
        assignor: assignorDirectory[3],
        assignee: assigneeDirectory[4],
        startDate: '2024-09-18',
        dueDate: '2024-11-22',
        progress: 85,
    }),
    hydrateRecord({
        name: 'Service Desk Holiday Coverage',
        description: 'Coordinate backup support schedule for holiday period.',
        assignmentType: 'support',
        assignor: assignorDirectory[1],
        assignee: assigneeDirectory[1],
        startDate: '2024-12-01',
        dueDate: '2025-01-10',
        progress: 15,
    }),
];

const ProjectMgmtMain: React.FC = () => {
    const [projects, setProjects] = React.useState<ProjectRecord[]>(defaultProjects);
    const [assignmentFilter, setAssignmentFilter] = React.useState<AssignmentType | 'all'>('all');

    const refreshStatuses = React.useCallback(() => {
        setProjects(prev =>
            prev.map(project => {
                const recomputed = { ...project, status: inferStatus(project) };
                return recomputed;
            }),
        );
    }, []);

    React.useEffect(() => {
        refreshStatuses();
    }, [refreshStatuses]);

    const handleCreateProject = React.useCallback(
        (values: ProjectFormValues) => {
            const record = hydrateRecord(values);
            setProjects(prev => [record, ...prev]);
            toast.success('Project registered', {
                description: `${record.name} assigned to ${record.assignee}`,
            });
        },
        [],
    );

    const portfolioSnapshot = React.useMemo(() => {
        const total = projects.length;
        const tasks = projects.filter(project => project.assignmentType === 'task').length;
        const support = projects.filter(project => project.assignmentType === 'support').length;
        const dueSoon = projects.filter(project => {
            const due = parseISO(project.dueDate);
            if (!isValid(due)) return false;
            const diff = differenceInCalendarDays(due, new Date());
            return diff >= 0 && diff <= 7;
        }).length;
        const averageProgress = total ? Math.round(projects.reduce((acc, project) => acc + project.progress, 0) / total) : 0;
        return { total, tasks, support, dueSoon, averageProgress };
    }, [projects]);

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-semibold">Project Management</h1>
                <p className="mt-1 text-sm text-muted-foreground">Register initiatives, manage owners, and surface delivery insights.</p>
            </div>
            <Tabs defaultValue="manage" className="space-y-6">
                <TabsList className="grid w-full gap-2 sm:w-[360px] sm:grid-cols-2">
                    <TabsTrigger value="manage">Registry</TabsTrigger>
                    <TabsTrigger value="reports">Support Reports</TabsTrigger>
                </TabsList>

                <TabsContent value="manage" className="space-y-6">
                    <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                        <ProjectRegistrationForm onSubmit={handleCreateProject} assignorOptions={assignorDirectory} assigneeOptions={assigneeDirectory} />
                        <div className="panel space-y-4 p-5">
                            <div>
                                <h2 className="text-lg font-semibold">Portfolio Snapshot</h2>
                                <p className="text-sm text-muted-foreground">Quick stats to anchor planning conversations.</p>
                            </div>
                            <div className="grid gap-3 text-sm">
                                <div className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2">
                                    <span>Total projects</span>
                                    <span className="font-semibold">{portfolioSnapshot.total}</span>
                                </div>
                                <div className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2">
                                    <span>Task assignments</span>
                                    <Badge variant="secondary">{portfolioSnapshot.tasks}</Badge>
                                </div>
                                <div className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2">
                                    <span>Support assignments</span>
                                    <Badge variant="secondary">{portfolioSnapshot.support}</Badge>
                                </div>
                                <div className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2">
                                    <span>Due this week</span>
                                    <Badge variant={portfolioSnapshot.dueSoon ? 'destructive' : 'secondary'}>{portfolioSnapshot.dueSoon}</Badge>
                                </div>
                                <div className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2">
                                    <span>Average progress</span>
                                    <span className="font-semibold">{portfolioSnapshot.averageProgress}%</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <ProjectOverviewTable
                        projects={projects}
                        assignmentTypeFilter={assignmentFilter}
                        onAssignmentTypeFilterChange={setAssignmentFilter}
                    />
                </TabsContent>

                <TabsContent value="reports">
                    <ProjectReports projects={projects} />
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default ProjectMgmtMain;

