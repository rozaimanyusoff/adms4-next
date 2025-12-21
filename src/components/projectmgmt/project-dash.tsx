'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { differenceInCalendarDays, isBefore, isValid, parseISO } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { LayoutGrid, Plus, Table } from 'lucide-react';
import { cn } from '@/lib/utils';
import ProjectDashCardView from './project-dash-cardview';
import ProjectDashTableView from './project-dash-tableview';
import ProjectKanban from './project-kanban';
import ProjectReports from './project-reports';
import { fetchPublicHolidays } from './project-dash-helpers';
import type {
    ProjectFormValues,
    ProjectRecord,
    ProjectStatus,
    AssignmentRole,
    ProjectTag,
    ProjectAssignment,
    ProjectMilestone,
    ProjectProgressLog,
    ProjectSupportShift,
    ProjectTagLink,
    ProjectDeliverable,
    DeliverableType,
    MilestoneStatus,
} from './types';
import { toast } from 'sonner';
import { authenticatedApi } from '@/config/api';
import { assignorDirectory, assigneeDirectory, PROJECT_TAGS, PROJECT_TAG_LOOKUP } from './project-dash-constants';

const clampPercent = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

const generateId = (prefix = 'proj') => {
    const core =
        typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID().replace(/-/g, '')
            : Math.random().toString(36).slice(2, 10);
    return `${prefix}_${core}`;
};

const normalizeContract = (code: string) => code.trim().toUpperCase().replace(/\s+/g, '-');

const computeDurationDays = (startDate: string, dueDate: string) => {
    const start = parseISO(startDate);
    const due = parseISO(dueDate);
    if (!isValid(start) || !isValid(due)) {
        return 0;
    }
    const diff = differenceInCalendarDays(due, start) + 1;
    return diff > 0 ? diff : 0;
};

const inferStatus = (
    snapshot: { startDate: string; dueDate: string; percentComplete: number },
    today = new Date(),
): ProjectStatus => {
    if (snapshot.percentComplete >= 100) {
        return 'completed';
    }

    const start = parseISO(snapshot.startDate);
    const due = parseISO(snapshot.dueDate);

    if (isValid(due) && differenceInCalendarDays(due, today) < 0) {
        return 'at_risk';
    }

    if (isValid(due) && snapshot.percentComplete < 80) {
        const daysRemaining = differenceInCalendarDays(due, today);
        if (daysRemaining <= 2) {
            return 'at_risk';
        }
    }

    if (isValid(start) && isBefore(today, start) && snapshot.percentComplete === 0) {
        return 'not_started';
    }

    if (snapshot.percentComplete <= 0) {
        return 'not_started';
    }

    return 'in_progress';
};

const buildAssignments = (projectId: string, values: ProjectFormValues, timestamp: string): ProjectAssignment[] => [
    {
        id: generateId('assign'),
        projectId,
        assignor: values.assignor,
        assignee: values.assignee,
        role: values.assignmentRole,
        active: true,
        createdAt: timestamp,
    },
];

const buildMilestones = (
    projectId: string,
    values: ProjectFormValues,
    percentComplete: number,
    timestamp: string,
): ProjectMilestone[] => {
    const start = parseISO(values.startDate);
    const due = parseISO(values.dueDate);
    let executionTarget = values.dueDate;

    if (isValid(start) && isValid(due)) {
        const totalDays = Math.max(differenceInCalendarDays(due, start), 0);
        const midPoint = new Date(start);
        midPoint.setDate(start.getDate() + Math.max(Math.round(totalDays / 2), 0));
        executionTarget = midPoint.toISOString().split('T')[0];
    }

    return [
        {
            id: generateId('milestone'),
            projectId,
            name: 'Kickoff',
            targetDate: values.startDate,
            status: percentComplete > 5 ? 'completed' : 'not_started',
            description: 'Initial alignment and scope confirmation.',
            orderIndex: 1,
            createdAt: timestamp,
            updatedAt: timestamp,
        },
        {
            id: generateId('milestone'),
            projectId,
            name: 'Execution',
            targetDate: executionTarget,
            status: percentComplete >= 75 ? 'completed' : percentComplete >= 40 ? 'in_progress' : 'not_started',
            description: 'Core delivery activities underway.',
            orderIndex: 2,
            createdAt: timestamp,
            updatedAt: timestamp,
        },
        {
            id: generateId('milestone'),
            projectId,
            name: 'Closeout',
            targetDate: values.dueDate,
            status: percentComplete >= 100 ? 'completed' : percentComplete >= 90 ? 'in_progress' : 'not_started',
            description: 'Final validation and handover.',
            orderIndex: 3,
            createdAt: timestamp,
            updatedAt: timestamp,
        },
    ];
};

const buildProgressLogs = (
    projectId: string,
    values: ProjectFormValues,
    percentComplete: number,
    durationDays: number,
    inferredStatus: ProjectStatus,
    timestamp: string,
): ProjectProgressLog[] => {
    const remainingEffortDays = Math.max(durationDays - Math.round((percentComplete / 100) * durationDays), 0);
    const statusOverride =
        percentComplete >= 100 ? 'completed' : percentComplete === 0 ? 'not_started' : percentComplete < 25 ? 'at_risk' : undefined;

    return [
        {
            id: generateId('log'),
            projectId,
            loggedBy: values.assignor,
            logDate: timestamp.split('T')[0],
            percentComplete,
            remainingEffortDays,
            statusOverride: statusOverride && statusOverride !== inferredStatus ? statusOverride : undefined,
            notes: percentComplete === 0 ? 'Project registered' : 'Initial progress captured during registration.',
            createdAt: timestamp,
        },
    ];
};

const buildSupportShifts = (projectId: string, values: ProjectFormValues, timestamp: string): ProjectSupportShift[] => {
    // Support shift management is handled separately
    return [];
};

const buildTagLinks = (
    projectId: string,
    slugs: string[],
    timestamp: string,
    tagLookup: Record<string, ProjectTag>,
): ProjectTagLink[] => {
    return slugs
        .map(slug => tagLookup[slug])
        .filter((tag): tag is ProjectTag => Boolean(tag))
        .map(tag => ({
            id: generateId('taglink'),
            projectId,
            tag,
            createdAt: timestamp,
        }));
};

const deriveTimelineFromDeliverables = (deliverables: Array<{ startDate: string; endDate: string }>) => {
    const valid = deliverables.filter(item => item.startDate && item.endDate);
    if (!valid.length) {
        return { startDate: '', endDate: '' };
    }
    const sortedByStart = [...valid].sort((a, b) => a.startDate.localeCompare(b.startDate));
    const sortedByEnd = [...valid].sort((a, b) => a.endDate.localeCompare(b.endDate));
    return {
        startDate: sortedByStart[0].startDate,
        endDate: sortedByEnd[sortedByEnd.length - 1].endDate,
    };
};

const normalizeDeliverables = (rawDeliverables: ProjectFormValues['deliverables']): { deliverables: ProjectDeliverable[]; timeline: { startDate: string; endDate: string } } => {
    const deliverables: ProjectDeliverable[] = (rawDeliverables ?? []).map(item => ({
        id: item.id || generateId('deliverable'),
        name: item.name,
        type: item.type,
        description: item.description,
        startDate: item.startDate,
        endDate: item.endDate,
        attachments: (item.attachments ?? []).map(attachment => ({
            id: attachment.id || generateId('attachment'),
            name: attachment.name,
            dataUrl: attachment.dataUrl,
        })),
    }));

    return {
        deliverables,
        timeline: deriveTimelineFromDeliverables(deliverables),
    };
};

const hydrateRecord = (values: ProjectFormValues, tagLookup: Record<string, ProjectTag>): ProjectRecord => {
    const { deliverables, timeline } = normalizeDeliverables(values.deliverables);
    const startDate = timeline.startDate || values.startDate;
    const dueDate = timeline.endDate || values.dueDate;
    const durationDays = computeDurationDays(startDate, dueDate);
    const percentComplete = clampPercent(values.percentComplete);
    const code = normalizeContract(values.contract || generateId('code'));
    const createdAt = new Date().toISOString();
    const projectId = generateId('proj');
    const status = inferStatus({
        startDate,
        dueDate,
        percentComplete,
    });

    const baseValues = { ...values, startDate, dueDate };
    const assignments = buildAssignments(projectId, baseValues, createdAt);
    const milestones = buildMilestones(projectId, baseValues, percentComplete, createdAt);
    const progressLogs = buildProgressLogs(projectId, baseValues, percentComplete, durationDays, status, createdAt);
    const supportShifts = buildSupportShifts(projectId, baseValues, createdAt);
    const tags = buildTagLinks(projectId, [], createdAt, tagLookup);

    return {
        id: projectId,
        code,
        name: values.name,
        description: values.description,
        projectType: 'claimable',
        projectCategory: values.projectCategory || 'new',
        status,
        startDate,
        dueDate,
        durationDays,
        percentComplete,
        createdAt,
        updatedAt: createdAt,
        assignments,
        milestones,
        progressLogs,
        supportShifts,
        tags,
        deliverables,
    };
};

const defaultProjects: ProjectRecord[] = [
    hydrateRecord(
        {
            contract: 'CS-OPS-001',
            name: 'Customer Support Ticket Automation',
            description: 'Integrate AI triage rules for high-volume support queues.',
            projectCategory: 'new',
            assignor: assignorDirectory[0],
            assignee: assigneeDirectory[0],
            assignmentRole: 'developer',
            startDate: '2024-10-01',
            dueDate: '2024-12-15',
            percentComplete: 55,
            deliverables: [
                {
                    id: generateId('deliverable'),
                    name: 'Ticket Journey Discovery',
                    type: 'discovery',
                    description: 'Map current support flows and identify automation opportunities.',
                    startDate: '2024-10-01',
                    endDate: '2024-10-10',
                    attachments: [],
                },
                {
                    id: generateId('deliverable'),
                    name: 'Workflow Design',
                    type: 'design',
                    description: 'Blueprint routing logic and escalation rules.',
                    startDate: '2024-10-11',
                    endDate: '2024-10-25',
                    attachments: [],
                },
                {
                    id: generateId('deliverable'),
                    name: 'Automation Build',
                    type: 'development',
                    description: 'Implement scoring model and triage bots.',
                    startDate: '2024-10-26',
                    endDate: '2024-12-05',
                    attachments: [],
                },
                {
                    id: generateId('deliverable'),
                    name: 'UAT & Cutover',
                    type: 'deployment',
                    description: 'Validate with pilot agents and roll out to production.',
                    startDate: '2024-12-06',
                    endDate: '2024-12-15',
                    attachments: [],
                },
            ],
        },
        PROJECT_TAG_LOOKUP,
    ),
    hydrateRecord(
        {
            contract: 'FIN-SUP-014',
            name: 'Finance Month-End Stabilization',
            description: 'Support finance team during quarter close with reconciliations.',
            projectCategory: 'enhancement',
            assignor: assignorDirectory[2],
            assignee: assigneeDirectory[2],
            assignmentRole: 'developer',
            startDate: '2024-11-10',
            dueDate: '2025-01-05',
            percentComplete: 35,
            deliverables: [
                {
                    id: generateId('deliverable'),
                    name: 'Close Checklist Review',
                    type: 'documentation',
                    description: 'Update checklist to reflect new controls.',
                    startDate: '2024-11-10',
                    endDate: '2024-11-17',
                    attachments: [],
                },
                {
                    id: generateId('deliverable'),
                    name: 'Ledger Automation Support',
                    type: 'development',
                    description: 'Assist on journal automation scripts for repeating entries.',
                    startDate: '2024-11-18',
                    endDate: '2024-12-22',
                    attachments: [],
                },
                {
                    id: generateId('deliverable'),
                    name: 'Holiday Coverage',
                    type: 'training',
                    description: 'Enable backup resources during holiday close.',
                    startDate: '2024-12-23',
                    endDate: '2025-01-05',
                    attachments: [],
                },
            ],
        },
        PROJECT_TAG_LOOKUP,
    ),
    hydrateRecord(
        {
            contract: 'OPS-PLAY-007',
            name: 'Operations Playbook Refresh',
            description: 'Update SOPs to reflect the new logistics workflow.',
            projectCategory: 'enhancement',
            assignor: assignorDirectory[3],
            assignee: assigneeDirectory[4],
            assignmentRole: 'supervisor',
            startDate: '2024-09-18',
            dueDate: '2024-11-22',
            percentComplete: 85,
            deliverables: [
                {
                    id: generateId('deliverable'),
                    name: 'Workflow Discovery',
                    type: 'discovery',
                    description: 'Shadow new logistics lanes and collect process notes.',
                    startDate: '2024-09-18',
                    endDate: '2024-09-30',
                    attachments: [],
                },
                {
                    id: generateId('deliverable'),
                    name: 'Draft SOP Updates',
                    type: 'documentation',
                    description: 'Draft revised SOP chapters with new SLAs.',
                    startDate: '2024-10-01',
                    endDate: '2024-10-20',
                    attachments: [],
                },
                {
                    id: generateId('deliverable'),
                    name: 'Pilot & Training',
                    type: 'training',
                    description: 'Run pilot walkthroughs with supervisors.',
                    startDate: '2024-10-21',
                    endDate: '2024-11-05',
                    attachments: [],
                },
                {
                    id: generateId('deliverable'),
                    name: 'Final Sign-off',
                    type: 'deployment',
                    description: 'Publish doc set and embed in LMS.',
                    startDate: '2024-11-06',
                    endDate: '2024-11-22',
                    attachments: [],
                },
            ],
        },
        PROJECT_TAG_LOOKUP,
    ),
    hydrateRecord(
        {
            contract: 'SD-SHIFT-003',
            name: 'Service Desk Holiday Coverage',
            description: 'Coordinate backup support schedule for holiday period.',
            projectCategory: 'new',
            assignor: assignorDirectory[1],
            assignee: assigneeDirectory[1],
            assignmentRole: 'developer',
            startDate: '2024-12-01',
            dueDate: '2025-01-10',
            percentComplete: 15,
            deliverables: [
                {
                    id: generateId('deliverable'),
                    name: 'Coverage Roster',
                    type: 'design',
                    description: 'Identify available SMEs and define shifts.',
                    startDate: '2024-12-01',
                    endDate: '2024-12-07',
                    attachments: [],
                },
                {
                    id: generateId('deliverable'),
                    name: 'Support Readiness',
                    type: 'training',
                    description: 'Brief relief team and share quick reference guides.',
                    startDate: '2024-12-08',
                    endDate: '2024-12-20',
                    attachments: [],
                },
                {
                    id: generateId('deliverable'),
                    name: 'On-call Execution',
                    type: 'deployment',
                    description: 'Run the coverage rotation through holiday weeks.',
                    startDate: '2024-12-21',
                    endDate: '2025-01-10',
                    attachments: [],
                },
            ],
        },
        PROJECT_TAG_LOOKUP,
    ),
];

const extractPersonName = (person: any): string => {
    if (!person) return '';
    if (typeof person === 'string') return person;
    if (typeof person !== 'object') return '';

    const directName = person.full_name || person.name;
    if (directName) return String(directName);

    const ramco = person.ramco_id;
    if (typeof ramco === 'string') return ramco;
    if (ramco && typeof ramco === 'object') {
        return String(ramco.full_name || ramco.name || ramco.ramco_id || '').trim();
    }

    return '';
};

// Map API project to local ProjectRecord shape
function mapApiProjectToRecord(item: any): ProjectRecord {
    const id = String(item?.id ?? generateId('proj'));
    const startDate = (item?.start_date || '').slice(0, 10);
    const dueDate = (item?.due_date || '').slice(0, 10);
    const percentComplete = Number(item?.overall_progress ?? 0) || 0;
    const durationDays = Number(item?.duration_days ?? 0) || 0;
    const projectType = (item?.project_type === 'it' || item?.project_type === 'dev') ? item.project_type : 'dev';
    
    // Determine status - override API status if conditions indicate "not_started"
    const allowed: ProjectStatus[] = ['not_started', 'in_progress', 'completed', 'at_risk'];
    const incoming = String(item?.status || '').toLowerCase();
    let status: ProjectStatus;
    
    // Override status logic: If 0% progress, always set to not_started regardless of dates
    if (percentComplete === 0) {
        status = 'not_started';
    } else if (percentComplete >= 100) {
        status = 'completed';
    } else if (allowed.includes(incoming as ProjectStatus)) {
        // Use API status if valid and doesn't conflict with above rules
        status = incoming as ProjectStatus;
    } else {
        status = 'in_progress';
    }
    
    // Map scopes/deliverables from API
    const deliverables: ProjectDeliverable[] = Array.isArray(item?.scopes) 
        ? item.scopes.map((scope: any) => ({
            id: String(scope?.id || generateId('deliverable')),
            serverId: scope?.id,
            name: scope?.title || scope?.name || '',
            type: (scope?.type || 'development') as DeliverableType,
            description: scope?.description || '',
            startDate: (scope?.planned_start_date || scope?.start_date || '').slice(0, 10),
            endDate: (scope?.planned_end_date || scope?.end_date || '').slice(0, 10),
            attachments: [],
            progress: Number(scope?.progress ?? 0) || 0,
            mandays: Number(scope?.planned_mandays ?? scope?.mandays ?? 0) || 0,
            assignee: extractPersonName(scope?.assignee),
            status: scope?.status as MilestoneStatus || 'not_started',
            actualStartDate: scope?.actual_start_date ? scope.actual_start_date.slice(0, 10) : '',
            actualEndDate: scope?.actual_end_date ? scope.actual_end_date.slice(0, 10) : '',
            actualMandays: Number(scope?.actual_mandays ?? 0) || 0,
        }))
        : [];
    
    const assignments: ProjectAssignment[] = Array.isArray(item?.assignments)
        ? item.assignments.map((assignment: any, index: number) => ({
            id: assignment?.id ? String(assignment.id) : generateId(`assign_${index}`),
            projectId: id,
            assignor: extractPersonName(assignment?.assignor),
            assignee: extractPersonName(assignment?.assignee),
            role: (assignment?.role as AssignmentRole) || 'developer',
            active: assignment?.active ?? true,
            createdAt: assignment?.created_at || item?.created_at || new Date().toISOString(),
        }))
        : [];

    return {
        id,
        code: item?.code || item?.contract || '',
        name: item?.name || '',
        description: item?.description || '',
        projectType,
        projectCategory: (item?.project_category || 'new') as any,
        priority: item?.priority || 'medium',
        status,
        startDate,
        dueDate,
        durationDays,
        percentComplete,
        createdAt: item?.created_at || new Date().toISOString(),
        updatedAt: item?.updated_at || item?.created_at || new Date().toISOString(),
        assignments,
        milestones: [],
        progressLogs: [],
        supportShifts: [],
        tags: [],
        deliverables,
    };
}

const ProjectMain: React.FC = () => {
    const router = useRouter();
    const [projects, setProjects] = React.useState<ProjectRecord[]>([]);
    const [projectCategoryFilter, setProjectCategoryFilter] = React.useState<'all' | 'new' | 'enhancement'>('all');
    const [projectTypeFilter, setProjectTypeFilter] = React.useState<'all' | 'claimable' | 'internal'>('all');
    const [viewMode, setViewMode] = React.useState<'card' | 'table'>('card');

    const fetchProjects = React.useCallback(async () => {
        try {
            const res: any = await authenticatedApi.get('/api/projects');
            const data = res?.data?.data ?? [];
            const list = Array.isArray(data) ? data : [];
            setProjects(list.map(mapApiProjectToRecord));
        } catch (err: any) {
            toast.error(err?.message || 'Failed to load projects');
        }
    }, []);

    React.useEffect(() => {
        void fetchProjects();
    }, [fetchProjects]);

    // Preload holidays for business day calculations in card/table views
    React.useEffect(() => {
        fetchPublicHolidays().catch(console.error);
    }, []);

    const portfolioSnapshot = React.useMemo(() => {
        const total = projects.length;
        const newProjects = projects.filter(project => project.projectCategory === 'new').length;
        const enhancementProjects = projects.filter(project => project.projectCategory === 'enhancement').length;
        const claimableProjects = projects.filter(project => project.projectType === 'claimable').length;
        const dueSoon = projects.filter(project => {
            const due = parseISO(project.dueDate);
            if (!isValid(due)) return false;
            const diff = differenceInCalendarDays(due, new Date());
            return diff >= 0 && diff <= 7;
        }).length;
        const averageProgress = total
            ? Math.round(projects.reduce((acc, project) => acc + project.percentComplete, 0) / total)
            : 0;
        return { total, newProjects, enhancementProjects, claimableProjects, dueSoon, averageProgress };
    }, [projects]);

    const summaryCards = React.useMemo(
        () => [
            { label: 'Total projects', value: portfolioSnapshot.total },
            { label: 'New projects', value: portfolioSnapshot.newProjects },
            { label: 'Enhancement projects', value: portfolioSnapshot.enhancementProjects },
            { label: 'Claimable projects', value: portfolioSnapshot.claimableProjects },
            { label: 'Due this week', value: portfolioSnapshot.dueSoon },
            { label: 'Average progress', value: `${portfolioSnapshot.averageProgress}%` },
        ],
        [portfolioSnapshot],
    );

    const filteredProjects = React.useMemo(() => {
        return projects.filter(project => {
            const matchesCategory = projectCategoryFilter === 'all' ? true : project.projectCategory === projectCategoryFilter;
            const matchesProjectType = projectTypeFilter === 'all' ? true : (project.projectType || 'claimable') === projectTypeFilter;
            return matchesCategory && matchesProjectType;
        });
    }, [projects, projectCategoryFilter, projectTypeFilter]);

    const sortedProjects = React.useMemo(() => {
        return [...filteredProjects].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    }, [filteredProjects]);

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-semibold">Project Management</h1>
                <p className="mt-1 text-sm text-muted-foreground">Register initiatives, manage owners, and surface delivery insights.</p>
            </div>
            <Tabs defaultValue="manage" className="space-y-6">
                <TabsList>
                    <TabsTrigger value="manage">Dashboard</TabsTrigger>
                    <TabsTrigger value="kanban">Kanban</TabsTrigger>
                    <TabsTrigger value="reports">Dashboard</TabsTrigger>
                </TabsList>

                <TabsContent value="manage" className="space-y-6">
                    <div className="space-y-4">
                        <>
                            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
                                    {summaryCards.map(card => (
                                        <div key={card.label} className="rounded-xl border border-border/60 bg-background px-4 py-3 shadow-sm">
                                            <p className="text-sm text-muted-foreground">{card.label}</p>
                                            <p className="mt-2 text-2xl font-semibold tabular-nums">{card.value}</p>
                                        </div>
                                    ))}
                                </div>

                                <div className="panel space-y-4 p-5">
                                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                        <div>
                                            <h2 className="text-lg font-semibold">Active Projects</h2>
                                            <p className="text-sm text-muted-foreground">Track ownership, timelines, and delivery confidence.</p>
                                        </div>
                                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm text-muted-foreground">Project Category</span>
                                                <Select value={projectCategoryFilter} onValueChange={value => setProjectCategoryFilter(value as 'all' | 'new' | 'enhancement')}>
                                                    <SelectTrigger className="w-40 sm:w-[180px]">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="all">All</SelectItem>
                                                        <SelectItem value="new">New Project</SelectItem>
                                                        <SelectItem value="enhancement">Enhancement</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm text-muted-foreground">Project type</span>
                                                <Select value={projectTypeFilter} onValueChange={value => setProjectTypeFilter(value as 'all' | 'claimable' | 'internal')}>
                                                    <SelectTrigger className="w-40 sm:w-[180px]">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="claimable">Claimable</SelectItem>
                                                        <SelectItem value="internal">Internal</SelectItem>
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
                                            <Button onClick={() => router.push('/projectmgmt/new')} className="self-end sm:self-auto">
                                                <Plus className="mr-2 h-4 w-4" />
                                                Create project
                                            </Button>
                                        </div>
                                    </div>

                                    {viewMode === 'card' ? (
                                        <ProjectDashCardView
                                            projects={sortedProjects}
                                            onOpenProject={(id) => router.push(`/projectmgmt/${id}`)}
                                        />
                                    ) : (
                                        <ProjectDashTableView
                                            projects={sortedProjects}
                                            onOpenProject={(id) => router.push(`/projectmgmt/${id}`)}
                                        />
                                    )}
                                </div>
                            </>
                    </div>
                </TabsContent>

                <TabsContent value="kanban">
                    <ProjectKanban projects={projects} />
                </TabsContent>

                <TabsContent value="reports">
                    <ProjectReports projects={projects} tags={PROJECT_TAGS} />
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default ProjectMain;
