export type AssignmentType = 'task' | 'support';

export type ProjectStatus = 'Not Started' | 'In Progress' | 'Completed' | 'At Risk';

export interface ProjectRecord {
    id: string;
    name: string;
    description?: string;
    assignmentType: AssignmentType;
    assignor: string;
    assignee: string;
    startDate: string;
    dueDate: string;
    durationDays: number;
    progress: number;
    status: ProjectStatus;
}

export interface ProjectFormValues {
    name: string;
    description?: string;
    assignmentType: AssignmentType;
    assignor: string;
    assignee: string;
    startDate: string;
    dueDate: string;
    progress: number;
}
