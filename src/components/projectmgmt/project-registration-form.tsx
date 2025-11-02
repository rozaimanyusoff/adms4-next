'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { differenceInCalendarDays, isValid as isDateValid, parseISO, addDays } from 'date-fns';
import type { DeliverableType, ProjectDeliverableAttachment, ProjectFormValues, ProjectTag } from './types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SingleSelect, MultiSelect, type ComboboxOption } from '@/components/ui/combobox';
import { Plus, Trash2, MoreVertical, ArrowUp, ArrowDown } from 'lucide-react';
import Flatpickr from 'react-flatpickr';
import 'flatpickr/dist/flatpickr.css';
import { authenticatedApi } from '@/config/api';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

type ProjectRegistrationFormProps = {
    onSubmit: (values: ProjectFormValues) => void;
    assignorOptions: string[];
    assigneeOptions: string[];
    availableTags: ProjectTag[];
    editProjectId?: string;
};

const deliverableTypeOptions: Array<{ value: DeliverableType; label: string }> = [
    { value: 'discovery', label: 'Discovery' },
    { value: 'design', label: 'Design' },
    { value: 'development', label: 'Development' },
    { value: 'testing', label: 'Testing' },
    { value: 'deployment', label: 'Deployment' },
    { value: 'documentation', label: 'Documentation' },
    { value: 'training', label: 'Training' },
];

// Scope task group options (multi-select) using numeric codes 1..6
const TASK_GROUP_OPTIONS: ComboboxOption[] = [
    { value: '1', label: 'Planning & Analysis' },
    { value: '2', label: 'Design & Architecture' },
    { value: '3', label: 'Development & Implementation' },
    { value: '4', label: 'Testing & Quality Assurance' },
    { value: '5', label: 'Deployment & Operations' },
    { value: '6', label: 'Maintenance & Support' },
];

// Project tags now a simple string input (API: projectTags)

const generateId = (prefix: string) => {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
        return `${prefix}_${(crypto as any).randomUUID()}`;
    }
    return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
};

const createEmptyDeliverable = () => ({
    id: generateId('deliverable'),
    name: '',
    type: 'development' as DeliverableType,
    description: '',
    startDate: '',
    endDate: '',
    attachments: [] as ProjectDeliverableAttachment[],
    progress: 0,
    taskGroups: [] as string[],
    assignee: '',
    status: 'not_started' as const,
    actualStartDate: '',
    actualEndDate: '',
    actualMandays: 0,
});

// attachments removed from UI; keep helper unused intentionally minimal
const readFileAsDataUrl = (file: File) =>
    new Promise<string>((resolve) => resolve(''));

const BASE_FORM_VALUES = {
    code: '',
    name: '',
    description: '',
    assignmentType: 'project' as const,
    assignor: '',
    assignee: '',
    assignmentRole: 'developer' as const,
    startDate: '',
    dueDate: '',
    percentComplete: 10,
    tagSlugs: [] as string[],
};

const ProjectRegistrationForm: React.FC<ProjectRegistrationFormProps> = ({ onSubmit, assignorOptions, assigneeOptions, availableTags, editProjectId }) => {
    const [assigneeChoices, setAssigneeChoices] = useState<Array<{ value: string; label: string }>>([]);
    const [assigneeLoading, setAssigneeLoading] = useState(false);
    const [assigneeError, setAssigneeError] = useState<string | null>(null);
    // Main form
    const {
        control,
        register,
        handleSubmit,
        watch,
        getValues,
        reset,
        setValue,
        formState: { errors, isValid, isSubmitting },
    } = useForm<ProjectFormValues>({
        mode: 'onChange',
        reValidateMode: 'onChange',
        defaultValues: {
            ...BASE_FORM_VALUES,
            deliverables: [],
        },
    });

    const { fields: deliverableFields, append, remove, update, move } = useFieldArray({
        control,
        name: 'deliverables',
    });

    // Subscribe to deliverables to reflect nested changes (e.g., progress sliders)
    const watchDeliverables = useWatch({ control, name: 'deliverables' });

    // Draft deliverable form (aside)
    const {
        control: draftControl,
        register: registerDraft,
        reset: resetDraft,
        handleSubmit: handleDraftSubmit,
        setValue: setDraftValue,
        watch: watchDraft,
        formState: { errors: draftErrors },
    } = useForm<{ 
        name: string; 
        type: DeliverableType; 
        description: string; 
        startDate: string; 
        endDate: string; 
        attachments: ProjectDeliverableAttachment[]; 
        progress: number;
        taskGroups: string[];
        assignee: string;
        actualStartDate: string;
        actualEndDate: string;
        files: File[];
    }>({
        defaultValues: {
            name: '',
            type: 'development',
            description: '',
            startDate: '',
            endDate: '',
            attachments: [],
            progress: 0,
            taskGroups: [],
            assignee: '',
            actualStartDate: '',
            actualEndDate: '',
            files: [],
        },
    });

    const draftAttachments = watchDraft('attachments') ?? [];
    const draftFiles = watchDraft('files') ?? [];
    const draftStart = watchDraft('startDate');
    const draftEnd = watchDraft('endDate');
    const draftActualStart = watchDraft('actualStartDate');
    const draftActualEnd = watchDraft('actualEndDate');

    const calcMandays = (startISO?: string, endISO?: string) => {
        if (!startISO || !endISO) return 0;
        const s = parseISO(startISO);
        const e = parseISO(endISO);
        if (!isDateValid(s) || !isDateValid(e) || e < s) return 0;
        let d = s;
        let count = 0;
        while (d <= e) {
            const day = d.getDay();
            if (day !== 0 && day !== 6) count += 1; // Mon-Fri only
            d = addDays(d, 1);
        }
        return count;
    };

    const draftMandays = useMemo(() => calcMandays(draftStart, draftEnd), [draftStart, draftEnd]);
    const draftActualMandays = useMemo(() => calcMandays(draftActualStart, draftActualEnd), [draftActualStart, draftActualEnd]);
    const [editingScopeIndex, setEditingScopeIndex] = useState<number | null>(null);
    // Force-remount draft inputs (esp. Flatpickr) after save to ensure UI clears
    const [scopeFormKey, setScopeFormKey] = useState(0);
    const [savingProgressId, setSavingProgressId] = useState<string | null>(null);

    // If actual dates are blank, mirror planned dates when planned changes
    useEffect(() => {
        const actualStart = watchDraft('actualStartDate');
        const actualEnd = watchDraft('actualEndDate');
        if (draftStart && !actualStart) {
            setDraftValue('actualStartDate', draftStart, { shouldDirty: true });
        }
        if (draftEnd && !actualEnd) {
            setDraftValue('actualEndDate', draftEnd, { shouldDirty: true });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [draftStart, draftEnd]);

    // Inline progress change handler (save immediately when in edit mode)
    const handleInlineProgressChange = async (index: number, val: number) => {
        setValue(`deliverables.${index}.progress`, val, { shouldDirty: true });
        const status = val <= 0 ? 'not_started' : val >= 100 ? 'completed' : 'in_progress';
        setValue(`deliverables.${index}.status`, status as any, { shouldDirty: true });
        const current: any = (getValues('deliverables') as any[])?.[index] || {};
        const serverId = current?.serverId;
        if (editProjectId && serverId) {
            try {
                setSavingProgressId(String(serverId));
                const formData = new FormData();
                formData.append('progress', String(val));
                formData.append('status', status);
                await authenticatedApi.put(`/api/projects/${editProjectId}/scopes/${serverId}`, formData);
            } catch (err: any) {
                toast.error(err?.response?.data?.message || err?.message || 'Failed to update scope progress');
            } finally {
                setSavingProgressId(null);
            }
        }
    };

    const handleReorder = async (from: number, to: number) => {
        const total = deliverableFields.length;
        if (to < 0 || to >= total || from === to) return;
        const currentList: any[] = (getValues('deliverables') as any[]) || [];
        const newOrder = [...currentList];
        const [sp] = newOrder.splice(from, 1);
        newOrder.splice(to, 0, sp);
        // Move visually
        move(from, to);
        if (editProjectId) {
            try {
                const payload = {
                    project_id: editProjectId,
                    scopes: newOrder
                        .map((d, idx) => (d?.serverId ? { id: String(d.serverId), order_index: idx } : null))
                        .filter(Boolean),
                } as any;
                await authenticatedApi.put(`/api/projects/${editProjectId}/scopes/reorder`, payload);
                toast.success('Scopes reordered');
            } catch (err: any) {
                toast.error(err?.response?.data?.message || err?.message || 'Failed to reorder scopes');
                // revert
                move(to, from);
            }
        }
    };

    // Load active employees (Technology dept) for assignee field
    useEffect(() => {
        let cancelled = false;
        const fetchAssignees = async () => {
            try {
                setAssigneeLoading(true);
                setAssigneeError(null);
                const res: any = await authenticatedApi.get('/api/assets/employees', { params: { status: 'active', dept: 16 } });
                const data = res?.data?.data ?? res?.data ?? [];
                const list = Array.isArray(data) ? data : [data];
                const mapped: Array<{ value: string; label: string }> = list
                    .filter((e: any) => e && e.ramco_id && e.full_name)
                    .map((e: any) => ({ value: String(e.ramco_id), label: String(e.full_name) }));
                if (!cancelled) setAssigneeChoices(mapped);
            } catch (err: any) {
                if (!cancelled) {
                    setAssigneeError(err?.message ?? 'Failed to load assignees');
                    // Fallback to provided options if any
                    if (assigneeOptions?.length) {
                        setAssigneeChoices(assigneeOptions.map(x => ({ value: x, label: x })));
                    }
                }
            } finally {
                if (!cancelled) setAssigneeLoading(false);
            }
        };
        fetchAssignees();
        return () => {
            cancelled = true;
        };
    }, [assigneeOptions]);

    // Hydrate form when editing an existing project
    useEffect(() => {
        let cancelled = false;
        const toDateOnly = (v?: string | null) => (v ? String(v).slice(0, 10) : '');
        const fetchProject = async () => {
            if (!editProjectId) return;
            try {
                const res: any = await authenticatedApi.get(`/api/projects/${editProjectId}`);
                const data = res?.data?.data ?? res?.data;
                if (!data || cancelled) return;
                // Map API -> form values
                const scopes = Array.isArray(data.scopes) ? data.scopes : [];
                const deliverables = scopes.map((s: any) => ({
                    id: String(s.id ?? generateId('deliverable')),
                    serverId: s.id != null ? String(s.id) : undefined,
                    name: s.title || '',
                    type: 'development' as DeliverableType,
                    description: s.description || '',
                    startDate: toDateOnly(s.planned_start_date),
                    endDate: toDateOnly(s.planned_end_date),
                    attachments: [],
                    progress: Number(s.progress ?? 0) || 0,
                    mandays: Number(s.planned_mandays ?? 0) || 0,
                    taskGroups: String(s.task_groups || '')
                        .split(',')
                        .map((x: string) => x.trim())
                        .filter(Boolean),
                    assignee: s.assignee || '',
                    status: (s.status as any) || undefined,
                    actualStartDate: toDateOnly(s.actual_start_date),
                    actualEndDate: toDateOnly(s.actual_end_date),
                    actualMandays: Number(s.actual_mandays ?? 0) || 0,
                }));

                reset({
                    ...BASE_FORM_VALUES,
                    code: data.code || '',
                    name: data.name || '',
                    description: data.description || '',
                    assignmentType: (data.assignment_type as any) || 'project',
                    startDate: toDateOnly(data.start_date),
                    dueDate: toDateOnly(data.due_date),
                    percentComplete: Number(data.overall_progress ?? 0) || 0,
                    tagSlugs: [],
                    deliverables,
                });
                // Also set API-aligned extras used during submit
                setValue('projectTags' as any, data.project_tags || '');
                setValue('priority' as any, data.priority || 'medium');
            } catch (err) {
                // ignore for now; errors surfaced in list
            }
        };
        void fetchProject();
        return () => {
            cancelled = true;
        };
    }, [editProjectId, reset, setValue]);

    const timeline = useMemo(() => {
        const valid = (watchDeliverables ?? []).filter(d => d?.startDate && d?.endDate);
        if (!valid.length) return { startDate: '', endDate: '' };
        const sortedByStart = [...valid].sort((a, b) => a.startDate.localeCompare(b.startDate));
        const sortedByEnd = [...valid].sort((a, b) => a.endDate.localeCompare(b.endDate));
        return { startDate: sortedByStart[0].startDate, endDate: sortedByEnd[sortedByEnd.length - 1].endDate };
    }, [watchDeliverables]);

    const durationDays = useMemo(() => {
        if (!timeline.startDate || !timeline.endDate) return 0;
        const start = parseISO(timeline.startDate);
        const end = parseISO(timeline.endDate);
        if (!isDateValid(start) || !isDateValid(end)) return 0;
        const diff = differenceInCalendarDays(end, start) + 1;
        return diff > 0 ? diff : 0;
    }, [timeline]);

    const overallProgress = useMemo(() => {
        const list = (watchDeliverables ?? []).map((d: any) => (typeof d?.progress === 'number' ? d.progress : 0));
        if (!list.length) return 0;
        const sum = list.reduce((acc, v) => acc + (Number.isFinite(v) ? v : 0), 0);
        return Math.round(sum / list.length);
    }, [watchDeliverables]);

    useEffect(() => {
        setValue('percentComplete', overallProgress);
    }, [overallProgress, setValue]);

    const [successOpen, setSuccessOpen] = useState(false);
    const [successInfo, setSuccessInfo] = useState<{ code: string; name: string } | null>(null);
    const [deletingScopeId, setDeletingScopeId] = useState<string | null>(null);

    const submitHandler = async (values: ProjectFormValues) => {
        const deliverables = (values.deliverables ?? []).map(d => ({
            ...d,
            id: d.id || generateId('deliverable'),
            attachments: (d.attachments ?? []).map(a => ({ ...a, id: a.id || generateId('attachment') })),
        }));

        const startDate = timeline.startDate || values.startDate;
        const dueDate = timeline.endDate || values.dueDate;
        // Build API-aligned payload with snake_case
        const apiJson = {
            code: values.code,
            name: values.name,
            description: values.description,
            assignment_type: values.assignmentType,
            start_date: startDate,
            due_date: dueDate,
            priority: (watch as any)('priority') ?? 'medium',
            overall_progress: overallProgress,
            project_tags: (watch as any)('projectTags') ?? '',
            scopes: (deliverables ?? []).map(d => ({
                id: d.serverId,
                title: d.name,
                task_groups: (d.taskGroups ?? []).join(','),
                description: d.description ?? '',
                assignee: d.assignee ?? '',
                planned_start_date: d.startDate,
                planned_end_date: d.endDate,
                planned_mandays: d.mandays ?? calcMandays(d.startDate, d.endDate),
                // attachments via FormData below
                progress: d.progress ?? 0,
                status: (d.status as any) ?? ((d.progress ?? 0) <= 0 ? 'not_started' : (d.progress ?? 0) >= 100 ? 'completed' : 'in_progress'),
                actual_start_date: d.actualStartDate ?? '',
                actual_end_date: d.actualEndDate ?? '',
                actual_mandays: d.actualMandays ?? calcMandays(d.actualStartDate, d.actualEndDate),
            })),
        } as const;

        const formData = new FormData();
        if (apiJson.code && apiJson.code.trim()) {
            formData.append('code', apiJson.code.trim());
        }
        formData.append('name', apiJson.name);
        if (apiJson.description) formData.append('description', apiJson.description);
        formData.append('assignment_type', apiJson.assignment_type);
        if (apiJson.start_date) formData.append('start_date', apiJson.start_date);
        if (apiJson.due_date) formData.append('due_date', apiJson.due_date);
        formData.append('priority', apiJson.priority);
        formData.append('overall_progress', String(apiJson.overall_progress));
        if (apiJson.project_tags) formData.append('project_tags', apiJson.project_tags);
        if (!editProjectId) {
            // Append scopes as indexed fields + files for backend-friendly parsing
            (apiJson.scopes || []).forEach((s, i) => {
                if (s.id != null && s.id !== '') formData.append(`scopes[${i}][id]`, String(s.id));
                formData.append(`scopes[${i}][title]`, s.title || '');
                formData.append(`scopes[${i}][task_groups]`, s.task_groups || '');
                formData.append(`scopes[${i}][description]`, s.description || '');
                formData.append(`scopes[${i}][assignee]`, s.assignee || '');
                if (s.planned_start_date) formData.append(`scopes[${i}][planned_start_date]`, s.planned_start_date);
                if (s.planned_end_date) formData.append(`scopes[${i}][planned_end_date]`, s.planned_end_date);
                formData.append(`scopes[${i}][planned_mandays]`, String(s.planned_mandays ?? ''));
                formData.append(`scopes[${i}][progress]`, String(s.progress ?? 0));
                formData.append(`scopes[${i}][status]`, s.status || 'not_started');
                if (s.actual_start_date) formData.append(`scopes[${i}][actual_start_date]`, s.actual_start_date);
                if (s.actual_end_date) formData.append(`scopes[${i}][actual_end_date]`, s.actual_end_date);
                formData.append(`scopes[${i}][actual_mandays]`, String(s.actual_mandays ?? ''));
            });
            // Append files per scope (if any) — server uses singular key `attachment`
            (deliverables || []).forEach((d, i) => {
                const files = (d as any).fileBlobs as File[] | undefined;
                if (Array.isArray(files)) files.forEach(file => formData.append(`scopes[${i}][attachment]`, file));
            });
        }

        try {
            if (editProjectId) {
                await authenticatedApi.put(`/api/projects/${editProjectId}`, formData);
                toast.success('Project updated');
                setSuccessInfo({ code: (values.code || '').trim(), name: values.name });
                setSuccessOpen(true);
            } else {
                await authenticatedApi.post('/api/projects', formData);
                toast.success('Project created');
                setSuccessInfo({ code: (values.code || '').trim(), name: values.name });
                setSuccessOpen(true);
                reset({
                    ...BASE_FORM_VALUES,
                    assignmentType: values.assignmentType,
                    assignmentRole: values.assignmentRole,
                    deliverables: [],
                });
            }
        } catch (err: any) {
            const msg = err?.response?.data?.message || err?.message || 'Failed to create project';
            toast.error(msg);
        }
    };

    const handleDraftAttachmentUpload = async (files: FileList | null) => {
        if (!files?.length) return;
        const list = Array.from(files);
        setDraftValue('files', [...draftFiles, ...list], { shouldDirty: true });
    };
    const handleDraftAttachmentRemove = (index: number) => {
        const next = [...draftFiles];
        next.splice(index, 1);
        setDraftValue('files', next, { shouldDirty: true });
    };

    const onAddDeliverable = handleDraftSubmit(async values => {
        const prog = typeof values.progress === 'number' ? values.progress : 0;
        const status = prog <= 0 ? 'not_started' : prog >= 100 ? 'completed' : 'in_progress';

        // If editing an existing project, POST scope immediately to API
        if (editProjectId) {
            const formData = new FormData();
            formData.append('title', values.name || '');
            formData.append('task_groups', (values.taskGroups || []).join(','));
            formData.append('description', values.description || '');
            formData.append('assignee', values.assignee || '');
            if (values.startDate) formData.append('planned_start_date', values.startDate);
            if (values.endDate) formData.append('planned_end_date', values.endDate);
            formData.append('planned_mandays', String(calcMandays(values.startDate, values.endDate)));
            formData.append('progress', String(prog));
            formData.append('status', status);
            if (values.actualStartDate) formData.append('actual_start_date', values.actualStartDate);
            if (values.actualEndDate) formData.append('actual_end_date', values.actualEndDate);
            formData.append('actual_mandays', String(calcMandays(values.actualStartDate, values.actualEndDate)));
            const files = values.files || [];
            if (Array.isArray(files)) {
                files.forEach(file => formData.append('attachment', file));
            }

            try {
                const res: any = await authenticatedApi.post(`/api/projects/${editProjectId}/scopes`, formData);
                const scope = res?.data?.data ?? res?.data ?? null;
                const serverId = scope?.id != null ? String(scope.id) : undefined;
                const plannedStart = scope?.planned_start_date ? String(scope.planned_start_date).slice(0,10) : values.startDate;
                const plannedEnd = scope?.planned_end_date ? String(scope.planned_end_date).slice(0,10) : values.endDate;

                append({
                    id: generateId('deliverable'),
                    serverId,
                    name: values.name,
                    type: 'development',
                    description: values.description,
                    startDate: plannedStart,
                    endDate: plannedEnd,
                    attachments: [],
                    progress: prog,
                    mandays: calcMandays(plannedStart, plannedEnd),
                    taskGroups: values.taskGroups ?? [],
                    assignee: values.assignee ?? '',
                    status,
                    actualStartDate: values.actualStartDate ?? '',
                    actualEndDate: values.actualEndDate ?? '',
                    actualMandays: calcMandays(values.actualStartDate, values.actualEndDate),
                    fileBlobs: [],
                });

                toast.success('Scope added');
                resetDraft({ name: '', type: 'development', description: '', startDate: '', endDate: '', attachments: [], progress: 0, taskGroups: [], assignee: '', actualStartDate: '', actualEndDate: '', files: [] });
                setScopeFormKey(k => k + 1);
                return;
            } catch (err: any) {
                const msg = err?.response?.data?.message || err?.message || 'Failed to add scope';
                toast.error(msg);
                return;
            }
        }

        // Otherwise (create mode), just add locally
        append({
            id: generateId('deliverable'),
            name: values.name,
            type: 'development',
            description: values.description,
            startDate: values.startDate,
            endDate: values.endDate,
            attachments: [],
            progress: prog,
            mandays: calcMandays(values.startDate, values.endDate),
            taskGroups: values.taskGroups ?? [],
            assignee: values.assignee ?? '',
            status,
            actualStartDate: values.actualStartDate ?? '',
            actualEndDate: values.actualEndDate ?? '',
            actualMandays: calcMandays(values.actualStartDate, values.actualEndDate),
            fileBlobs: values.files ?? [],
        });
        resetDraft({ name: '', type: 'development', description: '', startDate: '', endDate: '', attachments: [], progress: 0, taskGroups: [], assignee: '', actualStartDate: '', actualEndDate: '', files: [] });
    });

    // Format a JS Date as local date-only (YYYY-MM-DD), avoiding timezone shifts
    function toDateOnlyLocal(d?: Date | null): string {
        if (!d || !(d instanceof Date)) return '';
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    }

    function formatDMY(startDate: string): string | number | readonly string[] | undefined {
        if (!startDate) return '';
        try {
            const d = parseISO(startDate);
            if (!isDateValid(d)) return '';
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = d.getFullYear();
            return `${day}/${month}/${year}`;
        } catch {
            return '';
        }
    }
    return (
        <div className="panel space-y-6 p-5">
            <div>
                <h2 className="text-lg font-semibold">{editProjectId ? 'Edit Project' : 'Register Project'}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{editProjectId ? 'Update details, add scopes, and save changes.' : 'Capture core delivery details and planned scopes.'}</p>
            </div>

            <form onSubmit={handleSubmit(submitHandler)} className="flex flex-col gap-6">
                {/* Project tags and priority (API-aligned) */}
                <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                        <Label htmlFor="projectTags">Project tags</Label>
                        <Input id="projectTags" placeholder="e.g. adms4" value={(watch('projectTags' as any) as any) || ''} onChange={e => setValue('projectTags' as any, e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label>Priority</Label>
                        <Controller
                            control={control}
                            name={'priority' as any}
                            render={({ field }) => (
                                <Select value={field.value || 'medium'} onValueChange={field.onChange}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select priority" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="low">Low</SelectItem>
                                        <SelectItem value="medium">Medium</SelectItem>
                                        <SelectItem value="high">High</SelectItem>
                                        <SelectItem value="critical">Critical</SelectItem>
                                    </SelectContent>
                                </Select>
                            )}
                        />
                    </div>
                </div>

                {/* Main + Aside layout */}
                <div className="grid gap-6 md:grid-cols-[1fr_360px]">
                    {/* Main project details */}
                    <div className="space-y-6">
                        <div className="grid gap-4 md:grid-cols-3">
                            <div className="space-y-2">
                                <Label htmlFor="code">Project code (optional)</Label>
                                <Input id="code" className='uppercase' placeholder="e.g. OPS-2024-08" {...register('code')} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="name">Project name</Label>
                                <Input id="name" className='capitalize' placeholder="e.g. Employee Onboarding Portal" {...register('name', { required: 'Project name is required' })} />
                                {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label>Assignment type</Label>
                                <Controller
                                    control={control}
                                    name="assignmentType"
                                    rules={{ required: 'Assignment type is required' }}
                                    render={({ field }) => (
                                        <Select value={field.value} onValueChange={field.onChange}>
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder="Select type" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="project">Project</SelectItem>
                                                <SelectItem value="support">Support</SelectItem>
                                                <SelectItem value="ad_hoc">Ad-hoc</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                                {errors.assignmentType && <p className="text-sm text-destructive">{errors.assignmentType.message}</p>}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea id="description" placeholder="Optional context that helps assignees understand the project" rows={3} {...register('description')} />
                        </div>

                        <div className="grid gap-4 md:grid-cols-3">
                            <div className="space-y-2">
                                <Label htmlFor="overallProgress">Overall progress (%)</Label>
                                <div className="grid grid-cols-[1fr_auto] items-center gap-2">
                                    <Input id="overallProgress" type="range" min={0} max={100} step={5} value={overallProgress} disabled readOnly />
                                    <span className="w-12 text-right text-sm text-muted-foreground">{overallProgress}%</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-3">
                            <div className="space-y-2">
                                <Label>Project start (auto)</Label>
                                <Input value={timeline.startDate ? formatDMY(timeline.startDate) : ''} readOnly placeholder="Derived from scopes" />
                            </div>
                            <div className="space-y-2">
                                <Label>Project due (auto)</Label>
                                <Input value={timeline.endDate ? formatDMY(timeline.endDate) : ''} readOnly placeholder="Derived from scopes" />
                            </div>
                            <div className="space-y-2">
                                <Label>Duration (days)</Label>
                                <Input value={durationDays ? `${durationDays} days` : ''} readOnly placeholder="Auto calculated" />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2">
                            {editProjectId && (
                                <Button
                                    type="button"
                                    variant="destructive"
                                    onClick={async () => {
                                        const ok = typeof window !== 'undefined' ? window.confirm('Delete this project and all its scopes?') : true;
                                        if (!ok) return;
                                        try {
                                            await authenticatedApi.delete(`/api/projects/${editProjectId}`);
                                            toast.success('Project deleted');
                                        } catch (err:any) {
                                            toast.error(err?.response?.data?.message || err?.message || 'Failed to delete project');
                                        }
                                    }}
                                >
                                    Delete project
                                </Button>
                            )}
                            <Button type="submit" disabled={!isValid || isSubmitting} aria-disabled={!isValid || isSubmitting}>
                                {editProjectId ? 'Update project' : 'Save project'}
                            </Button>
                        </div>
                    </div>

                    {/* Aside: Scope creator */}
                    <aside className="space-y-4 md:sticky md:top-4 self-start md:border-l md:border-border/60 md:pl-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-base font-semibold">Scope</h3>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="dl-name">Title</Label>
                            <Input id="dl-name" className='capitalize' placeholder="e.g. API contract design" {...registerDraft('name', { required: 'Title is required' })} />
                            {draftErrors.name && <p className="text-sm text-destructive">{draftErrors.name.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label>Task groups</Label>
                            <Controller
                                control={draftControl}
                                name="taskGroups"
                                render={({ field }) => (
                                    <MultiSelect
                                        options={TASK_GROUP_OPTIONS}
                                        value={field.value || []}
                                        onValueChange={field.onChange}
                                        placeholder="Select groups"
                                        clearable
                                    />
                                )}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="dl-desc">Description</Label>
                            <Textarea id="dl-desc" rows={3} placeholder="Notes, scope, success criteria..." {...registerDraft('description')} />
                        </div>
                        <div className="space-y-2">
                            <Label>Assignee</Label>
                            <Controller
                                control={draftControl}
                                name="assignee"
                                render={({ field }) => (
                                    <SingleSelect
                                        options={assigneeChoices as ComboboxOption[]}
                                        value={field.value}
                                        onValueChange={field.onChange}
                                        placeholder={assigneeLoading ? 'Loading...' : 'Select assignee'}
                                        clearable
                                    />
                                )}
                            />
                            {assigneeError && (
                                <p className="text-xs text-muted-foreground">{assigneeError}. Using fallback list if available.</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label>Planned dates</Label>
                            <Flatpickr
                                key={`planned-${scopeFormKey}`}
                                options={{ mode: 'range', dateFormat: 'd/m/Y', position: 'auto left' }}
                                className="form-input"
                                value={(() => {
                                    const s = watchDraft('startDate');
                                    const e = watchDraft('endDate');
                                    const ss = s && isDateValid(parseISO(s)) ? parseISO(s) : null;
                                    const ee = e && isDateValid(parseISO(e)) ? parseISO(e) : null;
                                    return [ss, ee].filter(Boolean) as unknown as Date[];
                                })()}
                                onChange={(dates: any[]) => {
                                    const [s, e] = dates || [];
                                    if (s instanceof Date) {
                                        const d = toDateOnlyLocal(s);
                                        setDraftValue('startDate', d, { shouldDirty: true });
                                        // Keep actuals in sync with planned when planned changes
                                        setDraftValue('actualStartDate', d, { shouldDirty: true });
                                    }
                                    if (e instanceof Date) {
                                        const d = toDateOnlyLocal(e);
                                        setDraftValue('endDate', d, { shouldDirty: true });
                                        // Keep actuals in sync with planned when planned changes
                                        setDraftValue('actualEndDate', d, { shouldDirty: true });
                                    }
                                }}
                            />
                            <p className="text-xs text-muted-foreground">Mandays (Mon–Fri): {draftMandays || 0}</p>
                            <input type="hidden" {...registerDraft('startDate', { required: 'Start date is required' })} />
                            <input
                                type="hidden"
                                {...registerDraft('endDate', {
                                    required: 'End date is required',
                                    validate: endDate => {
                                        const startDate = watchDraft('startDate') ?? '';
                                        if (!startDate || !endDate) return true;
                                        if (!isDateValid(parseISO(startDate)) || !isDateValid(parseISO(endDate))) return true;
                                        return endDate >= startDate || 'End must be on/after start';
                                    },
                                })}
                            />
                            {(draftErrors.startDate || draftErrors.endDate) && (
                                <p className="text-sm text-destructive">{draftErrors.startDate?.message || draftErrors.endDate?.message}</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label>Actual dates</Label>
                            <Flatpickr
                                key={`actual-${scopeFormKey}`}
                                options={{ mode: 'range', dateFormat: 'd/m/Y', position: 'auto left' }}
                                className="form-input"
                                value={(() => {
                                    const s = watchDraft('actualStartDate');
                                    const e = watchDraft('actualEndDate');
                                    const ss = s && isDateValid(parseISO(s)) ? parseISO(s) : null;
                                    const ee = e && isDateValid(parseISO(e)) ? parseISO(e) : null;
                                    return [ss, ee].filter(Boolean) as unknown as Date[];
                                })()}
                                onChange={(dates: any[]) => {
                                    const [s, e] = dates || [];
                                    if (s instanceof Date) setDraftValue('actualStartDate', toDateOnlyLocal(s), { shouldDirty: true });
                                    if (e instanceof Date) setDraftValue('actualEndDate', toDateOnlyLocal(e), { shouldDirty: true });
                                }}
                            />
                            <p className="text-xs text-muted-foreground">Actual mandays (Mon–Fri): {draftActualMandays || 0}</p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="dl-progress">Progress (%)</Label>
                            <div className="grid grid-cols-[1fr_auto] items-center gap-2">
                                <Input id="dl-progress" type="range" min={0} max={100} step={5} {...registerDraft('progress', { valueAsNumber: true })} />
                                <span className="w-12 text-right text-sm text-muted-foreground">{watchDraft('progress') ?? 0}%</span>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Attachments</Label>
                            <div className="flex flex-wrap gap-2">
                                {draftFiles.map((file: File, idx: number) => (
                                    <span key={`${file.name}-${idx}`} className="inline-flex items-center gap-2 rounded-md border border-border/60 px-3 py-1 text-xs">
                                        <span className="font-medium truncate max-w-[160px]">{file.name}</span>
                                        <button type="button" className="text-muted-foreground transition hover:text-destructive" onClick={() => handleDraftAttachmentRemove(idx)}>
                                            remove
                                        </button>
                                    </span>
                                ))}
                                <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-border/60 px-3 py-1 text-xs font-medium text-muted-foreground hover:border-primary/60 hover:text-primary">
                                    <input
                                        type="file"
                                        multiple
                                        className="hidden"
                                        onChange={event => {
                                            void handleDraftAttachmentUpload(event.target.files);
                                            if (event.target) event.target.value = '';
                                        }}
                                    />
                                    <Plus className="h-3.5 w-3.5" />
                                    Add files
                                </label>
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-2">
                            {editingScopeIndex !== null && (
                                <Button type="button" variant="ghost" onClick={() => { setEditingScopeIndex(null); resetDraft({ name: '', type: 'development', description: '', startDate: '', endDate: '', attachments: [], progress: 0, taskGroups: [], assignee: '', actualStartDate: '', actualEndDate: '', files: [] }); }}>Cancel</Button>
                            )}
                            <Button type="button" variant="secondary" onClick={editingScopeIndex !== null ? handleDraftSubmit(async (values)=>{
                                const prog = typeof values.progress === 'number' ? values.progress : 0;
                                const status = prog <= 0 ? 'not_started' : prog >= 100 ? 'completed' : 'in_progress';
                                const idx = editingScopeIndex!;
                                const current: any = watchDeliverables?.[idx] || {};
                                const payload: any = {
                                    id: current.id,
                                    serverId: current.serverId,
                                    name: values.name,
                                    type: 'development',
                                    description: values.description,
                                    startDate: values.startDate,
                                    endDate: values.endDate,
                                    attachments: [],
                                    progress: prog,
                                    mandays: calcMandays(values.startDate, values.endDate),
                                    taskGroups: values.taskGroups ?? [],
                                    assignee: values.assignee ?? '',
                                    status,
                                    actualStartDate: values.actualStartDate ?? '',
                                    actualEndDate: values.actualEndDate ?? '',
                                    actualMandays: calcMandays(values.actualStartDate, values.actualEndDate),
                                    fileBlobs: [],
                                };
                                if (editProjectId && current.serverId) {
                                    const formData = new FormData();
                                    formData.append('title', values.name || '');
                                    formData.append('task_groups', (values.taskGroups || []).join(','));
                                    formData.append('description', values.description || '');
                                    formData.append('assignee', values.assignee || '');
                                    if (values.startDate) formData.append('planned_start_date', values.startDate);
                                    if (values.endDate) formData.append('planned_end_date', values.endDate);
                                    formData.append('planned_mandays', String(calcMandays(values.startDate, values.endDate)));
                                    formData.append('progress', String(prog));
                                    formData.append('status', status);
                                    if (values.actualStartDate) formData.append('actual_start_date', values.actualStartDate);
                                    if (values.actualEndDate) formData.append('actual_end_date', values.actualEndDate);
                                    formData.append('actual_mandays', String(calcMandays(values.actualStartDate, values.actualEndDate)));
                                    try {
                                        await authenticatedApi.put(`/api/projects/${editProjectId}/scopes/${current.serverId}`, formData);
                                        update(idx, payload);
                                        toast.success('Scope updated');
                                    } catch (err:any) {
                                        toast.error(err?.response?.data?.message || err?.message || 'Failed to update scope');
                                        return;
                                    }
                                } else {
                                    update(idx, payload);
                                }
                                setEditingScopeIndex(null);
                                resetDraft({ name: '', type: 'development', description: '', startDate: '', endDate: '', attachments: [], progress: 0, taskGroups: [], assignee: '', actualStartDate: '', actualEndDate: '', files: [] });
                                setScopeFormKey(k => k + 1);
                            }) : onAddDeliverable}>
                                <Plus className="mr-2 h-4 w-4" />
                                {editingScopeIndex !== null ? 'Save scope' : 'Add scope'}
                            </Button>
                        </div>
                    </aside>
                </div>

                {/* Scopes list (rows) */}
                <div className="space-y-3">
                    <div>
                        <h3 className="text-base font-semibold">Scopes</h3>
                        <p className="text-sm text-muted-foreground">Scopes you add will appear below.</p>
                    </div>
                    {deliverableFields.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No scopes yet. Use the sidebar to add.</p>
                    ) : (
                        <div className="overflow-hidden rounded-md border border-border/60">
                            <div className="grid grid-cols-12 bg-muted px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                <div className="col-span-3">Title</div>
                                <div className="col-span-2">Groups</div>
                                <div className="col-span-2">Assignee</div>
                                <div className="col-span-2">Dates</div>
                                <div className="col-span-1">Mandays</div>
                                <div className="col-span-1">Progress/Status</div>
                                <div className="col-span-1 text-right">Actions</div>
                            </div>
                            <div className="divide-y">
                                {deliverableFields.map((field, index) => (
                                    <div key={field.id} className="grid grid-cols-12 items-center px-3 py-2 text-sm gap-2">
                                        <div className="col-span-3 truncate">{watchDeliverables?.[index]?.name || '-'}</div>
                                        <div className="col-span-2 truncate">
                                            {(watchDeliverables?.[index]?.taskGroups || [])
                                                .map((val: string) => TASK_GROUP_OPTIONS.find(o => o.value === val)?.label || val)
                                                .join(', ') || '-'}
                                        </div>
                                        <div className="col-span-2 truncate">
                                            {(() => {
                                                const v = watchDeliverables?.[index]?.assignee;
                                                const opt = (assigneeChoices as ComboboxOption[]).find(o => o.value === v);
                                                return opt?.label || v || '-';
                                            })()}
                                        </div>
                                        <div className="col-span-2">
                                            <div className="flex flex-col">
                                                <span className="text-xs">Planned: {formatDMY(watchDeliverables?.[index]?.startDate) || '-'} → {formatDMY(watchDeliverables?.[index]?.endDate) || '-'}</span>
                                                <span className="text-xs text-muted-foreground">Actual: {formatDMY(watchDeliverables?.[index]?.actualStartDate || '') || '-'} → {formatDMY(watchDeliverables?.[index]?.actualEndDate || '') || '-'}</span>
                                            </div>
                                        </div>
                                        <div className="col-span-1">
                                            {watchDeliverables?.[index]?.mandays ?? calcMandays(watchDeliverables?.[index]?.startDate, watchDeliverables?.[index]?.endDate)}
                                        </div>
                                        <div className="col-span-1">
                                            <div className="flex flex-col gap-1">
                                                <input
                                                    type="range"
                                                    min={0}
                                                    max={100}
                                                    step={5}
                                                    value={watchDeliverables?.[index]?.progress ?? 0}
                                                    disabled={Boolean(savingProgressId) && String(watchDeliverables?.[index]?.serverId || '') === savingProgressId}
                                                    onChange={e => handleInlineProgressChange(index, Number(e.target.value))}
                                                />
                                                <span className="text-[10px] text-muted-foreground">
                                                    {(watchDeliverables?.[index]?.status as string) || ((watchDeliverables?.[index]?.progress ?? 0) <= 0 ? 'not_started' : (watchDeliverables?.[index]?.progress ?? 0) >= 100 ? 'completed' : 'in_progress')}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="col-span-1 flex items-center justify-end gap-1">
                                            <Button type="button" variant="ghost" size="icon" aria-label="Move up" onClick={() => handleReorder(index, index - 1)}>
                                                <ArrowUp className="h-4 w-4" />
                                            </Button>
                                            <Button type="button" variant="ghost" size="icon" aria-label="Move down" onClick={() => handleReorder(index, index + 1)}>
                                                <ArrowDown className="h-4 w-4" />
                                            </Button>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" aria-label="Scope actions">
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => {
                                                        const current: any = watchDeliverables?.[index] || {};
                                                        setEditingScopeIndex(index);
                                                        setDraftValue('name', current.name || '');
                                                        setDraftValue('description', current.description || '');
                                                        setDraftValue('taskGroups', current.taskGroups || []);
                                                        setDraftValue('assignee', current.assignee || '');
                                                        setDraftValue('startDate', current.startDate || '');
                                                        setDraftValue('endDate', current.endDate || '');
                                                        setDraftValue('actualStartDate', current.actualStartDate || current.startDate || '');
                                                        setDraftValue('actualEndDate', current.actualEndDate || current.endDate || '');
                                                        setDraftValue('progress', current.progress ?? 0);
                                                    }}>Edit</DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => {
                                                        const current: any = watchDeliverables?.[index] || {};
                                                        toast.info(`Add issues for: ${current.name || 'scope'}`);
                                                    }}>Add Issues</DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        className="text-destructive focus:text-destructive"
                                                        onClick={async () => {
                                                            const current = watchDeliverables?.[index] as any;
                                                            const serverId = current?.serverId;
                                                            if (editProjectId && serverId) {
                                                                try {
                                                                    setDeletingScopeId(String(serverId));
                                                                    await authenticatedApi.delete(`/api/projects/${editProjectId}/scopes/${serverId}`);
                                                                    remove(index);
                                                                    toast.success('Scope removed');
                                                                } catch (err: any) {
                                                                    const msg = err?.response?.data?.message || err?.message || 'Failed to remove scope';
                                                                    toast.error(msg);
                                                                } finally {
                                                                    setDeletingScopeId(null);
                                                                }
                                                            } else {
                                                                remove(index);
                                                            }
                                                        }}
                                                    >
                                                        Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                
            </form>
            <Dialog open={successOpen} onOpenChange={setSuccessOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Project Created</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-1">
                        <p className="text-sm">Your project has been created successfully.</p>
                        {successInfo && (
                            <p className="text-sm text-muted-foreground">
                                {successInfo.code ? (
                                    <>
                                        {successInfo.code} — {successInfo.name}
                                    </>
                                ) : (
                                    <>{successInfo.name}</>
                                )}
                            </p>
                        )}
                    </div>
                    <DialogFooter>
                        <Button onClick={() => setSuccessOpen(false)}>OK</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

// Success dialog rendered at the end of component

export default ProjectRegistrationForm;
