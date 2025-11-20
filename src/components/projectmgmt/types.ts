export type AssignmentType = 'project' | 'support' | 'ad_hoc';

export type ProjectStatus = 'not_started' | 'in_progress' | 'completed' | 'at_risk';

export type AssignmentRole = 'developer' | 'collaborator' | 'supervisor';

export type MilestoneStatus = 'not_started' | 'in_progress' | 'completed' | 'at_risk';

export type DeliverableType = 'discovery' | 'design' | 'development' | 'testing' | 'deployment' | 'documentation' | 'training';

export interface ProjectTag {
    id: string;
    name: string;
    slug: string;
    colorHex: string;
}

export interface ProjectTagLink {
    id: string;
    projectId: string;
    tag: ProjectTag;
    createdAt: string;
}

export interface ProjectAssignment {
    id: string;
    projectId: string;
    assignor: string;
    assignee: string;
    role: AssignmentRole;
    active: boolean;
    createdAt: string;
}

export interface ProjectMilestone {
    id: string;
    projectId: string;
    name: string;
    targetDate: string;
    status: MilestoneStatus;
    description?: string;
    orderIndex: number;
    createdAt: string;
    updatedAt: string;
}

export interface ProjectProgressLog {
    id: string;
    projectId: string;
    loggedBy: string;
    logDate: string;
    percentComplete: number;
    remainingEffortDays: number;
    statusOverride?: ProjectStatus;
    notes?: string;
    createdAt: string;
}

export interface ProjectSupportShift {
    id: string;
    projectId: string;
    shiftStart: string;
    shiftEnd: string;
    coverageHours: number;
    notes?: string;
    createdAt: string;
}

export interface ProjectDeliverableAttachment {
    id: string;
    name: string;
    dataUrl?: string;
}

export interface ProjectDeliverable {
    id: string;
    // Optional original server id when editing existing scope
    serverId?: string | number;
    name: string;
    type: DeliverableType;
    description?: string;
    startDate: string;
    endDate: string;
    attachments: ProjectDeliverableAttachment[];
    // Progress of this deliverable in percent (0-100)
    progress?: number;
    // Working days between start and end excluding weekends
    mandays?: number;
    // Scope-specific enrichments (optional, UI-only for now)
    taskGroups?: string[];
    assignee?: string;
    status?: MilestoneStatus;
    actualStartDate?: string;
    actualEndDate?: string;
    actualMandays?: number;
    // Optional uploaded files (for API FormData construction)
    fileBlobs?: File[];
}

export interface ProjectRecord {
    id: string;
    code: string;
    name: string;
    description?: string;
    projectType?: 'dev' | 'it';
    assignmentType: AssignmentType;
    priority?: string;
    status: ProjectStatus;
    startDate: string;
    dueDate: string;
    durationDays: number;
    percentComplete: number;
    createdAt: string;
    updatedAt: string;
    assignments: ProjectAssignment[];
    milestones: ProjectMilestone[];
    progressLogs: ProjectProgressLog[];
    supportShifts: ProjectSupportShift[];
    tags: ProjectTagLink[];
    deliverables: ProjectDeliverable[];
}

export interface ProjectFormValues {
    code: string;
    name: string;
    description?: string;
    assignmentType: AssignmentType;
    assignor: string;
    assignee: string;
    assignmentRole: AssignmentRole;
    startDate: string;
    dueDate: string;
    percentComplete: number;
    tagSlugs: string[];
    deliverables: Array<{
        id: string;
        serverId?: string | number;
        name: string;
        type: DeliverableType;
        description?: string;
        startDate: string;
        endDate: string;
        attachments: ProjectDeliverableAttachment[];
        progress?: number;
        mandays?: number;
        // Scope-specific enrichments (optional, UI-only for now)
        taskGroups?: string[];
        assignee?: string;
        status?: MilestoneStatus;
        actualStartDate?: string;
        actualEndDate?: string;
        actualMandays?: number;
        fileBlobs?: File[];
    }>;
}
