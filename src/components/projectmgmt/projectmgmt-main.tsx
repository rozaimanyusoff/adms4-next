'use client';

import React from 'react';
import { differenceInCalendarDays, isBefore, isValid, parseISO } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ProjectRegistrationForm from './project-registration-form';
import ProjectOverviewTable from './project-overview-table';
import ProjectReports from './project-reports';
import type {
    ProjectFormValues,
    ProjectRecord,
    ProjectStatus,
    AssignmentType,
    ProjectTag,
    ProjectAssignment,
    ProjectMilestone,
    ProjectProgressLog,
    ProjectSupportShift,
    ProjectTagLink,
    ProjectDeliverable,
} from './types';
import { toast } from 'sonner';

const assignorDirectory = ['PMO Lead', 'Service Desk Manager', 'Finance Head', 'Operations Director'];
const assigneeDirectory = ['Melissa Carter', 'Benjamin Lee', 'April Ramos', 'Liam Patel', 'Natalie Chen', 'Omar Idris'];

const PROJECT_TAGS: ProjectTag[] = [
    { id: 'tag_ops', name: 'Operational Excellence', slug: 'operational-excellence', colorHex: '#0ea5e9' },
    { id: 'tag_ai', name: 'Automation', slug: 'automation', colorHex: '#6366f1' },
    { id: 'tag_fin', name: 'Finance', slug: 'finance', colorHex: '#f59e0b' },
    { id: 'tag_support', name: 'Support Coverage', slug: 'support-coverage', colorHex: '#10b981' },
    { id: 'tag_risk', name: 'Risk Watch', slug: 'risk-watch', colorHex: '#ef4444' },
];

const PROJECT_TAG_LOOKUP = PROJECT_TAGS.reduce<Record<string, ProjectTag>>((acc, tag) => {
    acc[tag.slug] = tag;
    return acc;
}, {});

const clampPercent = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

const generateId = (prefix = 'proj') => {
    const core =
        typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID().replace(/-/g, '')
            : Math.random().toString(36).slice(2, 10);
    return `${prefix}_${core}`;
};

const normalizeProjectCode = (code: string) => code.trim().toUpperCase().replace(/\s+/g, '-');

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
    if (values.assignmentType !== 'support') {
        return [];
    }

    return [
        {
            id: generateId('shift'),
            projectId,
            shiftStart: `${values.startDate}T09:00:00Z`,
            shiftEnd: `${values.startDate}T17:00:00Z`,
            coverageHours: 8,
            notes: 'Primary coverage established at registration.',
            createdAt: timestamp,
        },
    ];
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
    const code = normalizeProjectCode(values.code || generateId('code'));
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
    const tags = buildTagLinks(projectId, values.tagSlugs, createdAt, tagLookup);

    return {
        id: projectId,
        code,
        name: values.name,
        description: values.description,
        assignmentType: values.assignmentType,
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
            code: 'CS-OPS-001',
            name: 'Customer Support Ticket Automation',
            description: 'Integrate AI triage rules for high-volume support queues.',
            assignmentType: 'project',
            assignor: assignorDirectory[0],
            assignee: assigneeDirectory[0],
            assignmentRole: 'developer',
            startDate: '2024-10-01',
            dueDate: '2024-12-15',
            percentComplete: 55,
            tagSlugs: ['operational-excellence', 'automation'],
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
            code: 'FIN-SUP-014',
            name: 'Finance Month-End Stabilization',
            description: 'Support finance team during quarter close with reconciliations.',
            assignmentType: 'support',
            assignor: assignorDirectory[2],
            assignee: assigneeDirectory[2],
            assignmentRole: 'developer',
            startDate: '2024-11-10',
            dueDate: '2025-01-05',
            percentComplete: 35,
            tagSlugs: ['finance', 'risk-watch'],
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
            code: 'OPS-PLAY-007',
            name: 'Operations Playbook Refresh',
            description: 'Update SOPs to reflect the new logistics workflow.',
            assignmentType: 'ad_hoc',
            assignor: assignorDirectory[3],
            assignee: assigneeDirectory[4],
            assignmentRole: 'supervisor',
            startDate: '2024-09-18',
            dueDate: '2024-11-22',
            percentComplete: 85,
            tagSlugs: ['operational-excellence'],
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
            code: 'SD-SHIFT-003',
            name: 'Service Desk Holiday Coverage',
            description: 'Coordinate backup support schedule for holiday period.',
            assignmentType: 'support',
            assignor: assignorDirectory[1],
            assignee: assigneeDirectory[1],
            assignmentRole: 'developer',
            startDate: '2024-12-01',
            dueDate: '2025-01-10',
            percentComplete: 15,
            tagSlugs: ['support-coverage', 'risk-watch'],
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

const ProjectMgmtMain: React.FC = () => {
    const [projects, setProjects] = React.useState<ProjectRecord[]>(defaultProjects);
    const [assignmentFilter, setAssignmentFilter] = React.useState<AssignmentType | 'all'>('all');
    const [isCreating, setIsCreating] = React.useState(false);

    const refreshStatuses = React.useCallback(() => {
        setProjects(prev =>
            prev.map(project => {
                const recalculated = inferStatus({
                    startDate: project.startDate,
                    dueDate: project.dueDate,
                    percentComplete: project.percentComplete,
                });

                if (recalculated === project.status) {
                    return project;
                }

                return { ...project, status: recalculated, updatedAt: new Date().toISOString() };
            }),
        );
    }, []);

    React.useEffect(() => {
        refreshStatuses();
    }, [refreshStatuses]);

    const handleCreateProject = React.useCallback(
        (values: ProjectFormValues) => {
            const record = hydrateRecord(values, PROJECT_TAG_LOOKUP);
            setProjects(prev => [record, ...prev]);
            toast.success('Project registered', {
                description: `${record.name} assigned to ${record.assignments[0]?.assignee ?? 'team'}`,
            });
            setIsCreating(false);
        },
        [],
    );

    const portfolioSnapshot = React.useMemo(() => {
        const total = projects.length;
        const projectAssignments = projects.filter(project => project.assignmentType === 'project').length;
        const supportAssignments = projects.filter(project => project.assignmentType === 'support').length;
        const adHocAssignments = projects.filter(project => project.assignmentType === 'ad_hoc').length;
        const dueSoon = projects.filter(project => {
            const due = parseISO(project.dueDate);
            if (!isValid(due)) return false;
            const diff = differenceInCalendarDays(due, new Date());
            return diff >= 0 && diff <= 7;
        }).length;
        const averageProgress = total
            ? Math.round(projects.reduce((acc, project) => acc + project.percentComplete, 0) / total)
            : 0;
        return { total, projectAssignments, supportAssignments, adHocAssignments, dueSoon, averageProgress };
    }, [projects]);

    const summaryCards = React.useMemo(
        () => [
            { label: 'Total projects', value: portfolioSnapshot.total },
            { label: 'Project assignments', value: portfolioSnapshot.projectAssignments },
            { label: 'Support assignments', value: portfolioSnapshot.supportAssignments },
            { label: 'Ad-hoc assignments', value: portfolioSnapshot.adHocAssignments },
            { label: 'Due this week', value: portfolioSnapshot.dueSoon },
            { label: 'Average progress', value: `${portfolioSnapshot.averageProgress}%` },
        ],
        [portfolioSnapshot],
    );

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
                    <div className="space-y-4">
                        {!isCreating && (
                            <>
                                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
                                    {summaryCards.map(card => (
                                        <div key={card.label} className="rounded-xl border border-border/60 bg-background px-4 py-3 shadow-sm">
                                            <p className="text-sm text-muted-foreground">{card.label}</p>
                                            <p className="mt-2 text-2xl font-semibold tabular-nums">{card.value}</p>
                                        </div>
                                    ))}
                                </div>

                                <ProjectOverviewTable
                                    projects={projects}
                                    assignmentTypeFilter={assignmentFilter}
                                    onAssignmentTypeFilterChange={setAssignmentFilter}
                                    onCreateProject={() => setIsCreating(true)}
                                />
                            </>
                        )}

                        {isCreating && (
                            <div className="panel space-y-6 p-5">
                                <button
                                    type="button"
                                    className="inline-flex items-center text-sm font-medium text-primary hover:underline"
                                    onClick={() => setIsCreating(false)}
                                >
                                    ← Back to projects
                                </button>
                                <ProjectRegistrationForm
                                    onSubmit={handleCreateProject}
                                    assignorOptions={assignorDirectory}
                                    assigneeOptions={assigneeDirectory}
                                    availableTags={PROJECT_TAGS}
                                />
                            </div>
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="reports">
                    <ProjectReports projects={projects} tags={PROJECT_TAGS} />
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default ProjectMgmtMain;
