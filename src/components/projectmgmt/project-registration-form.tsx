'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { differenceInCalendarDays, isValid as isDateValid, parseISO, addDays, addWeeks, startOfWeek, format as formatDate } from 'date-fns';
import type { DeliverableType, ProjectDeliverableAttachment, ProjectFormValues, ProjectTag } from './types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SingleSelect, MultiSelect, type ComboboxOption } from '@/components/ui/combobox';
import { Plus, Trash2, MoreVertical, ArrowUp, ArrowDown } from 'lucide-react';
import { CustomDataGrid, type ColumnDef } from '@/components/ui/DataGrid';
import ExcelJS from 'exceljs';
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend, LabelList } from 'recharts';
import { Switch } from '@/components/ui/switch';
import Flatpickr from 'react-flatpickr';
import 'flatpickr/dist/flatpickr.css';
import { authenticatedApi } from '@/config/api';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

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
    // Burnup planned mode: 'scope' (recommended) or 'linear'
    const [plannedMode, setPlannedMode] = useState<'scope' | 'linear'>('scope');
    const [showPlanned, setShowPlanned] = useState(true);
    const [showActual, setShowActual] = useState(true);
    const [showValues, setShowValues] = useState(true);
    const [completionMode, setCompletionMode] = useState<'actual' | 'planned'>('actual');

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
                toast.success('Scope progress updated');
            } catch (err: any) {
                toast.error(err?.response?.data?.message || err?.message || 'Failed to update scope progress');
            } finally {
                setSavingProgressId(null);
            }
        } else {
            // Local create mode: still give feedback
            toast.success('Scope progress updated');
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

    // Duration in mandays (Mon–Fri), across the overall project window
    const durationDays = useMemo(() => {
        if (!timeline.startDate || !timeline.endDate) return 0;
        return calcMandays(timeline.startDate, timeline.endDate);
    }, [timeline]);

    // Total planned effort (mandays) across all scopes
    const totalPlannedEffort = useMemo(() => {
        return (watchDeliverables ?? []).reduce((acc: number, d: any) => acc + (typeof d?.mandays === 'number' ? d.mandays : calcMandays(d?.startDate, d?.endDate)), 0);
    }, [watchDeliverables]);

    // Ref to capture chart SVG for PNG export
    const burnupRef = useRef<HTMLDivElement | null>(null);

    const downloadBurnupPNG = async () => {
        try {
            const root = burnupRef.current;
            if (!root) {
                toast.error('Chart not ready');
                return;
            }
            const svg = root.querySelector('svg');
            if (!svg) {
                toast.error('Chart SVG not found');
                return;
            }
            const serializer = new XMLSerializer();
            let source = serializer.serializeToString(svg);
            if (!source.match(/^<svg[^>]+xmlns=/)) {
                source = source.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
            }
            const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const img = new Image();
            await new Promise<void>((resolve, reject) => {
                img.onload = () => resolve();
                img.onerror = () => reject(new Error('Failed loading SVG image'));
                img.src = url;
            });
            const width = Number(svg.getAttribute('width')) || Math.ceil((svg as any).clientWidth) || 900;
            const height = Number(svg.getAttribute('height')) || Math.ceil((svg as any).clientHeight) || 400;
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('Canvas not supported');
            ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--background') || '#ffffff';
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);
            URL.revokeObjectURL(url);
            const pngUrl = canvas.toDataURL('image/png');
            const a = document.createElement('a');
            a.href = pngUrl;
            a.download = `burnup-${Date.now()}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            toast.success('Burnup chart downloaded');
        } catch (err: any) {
            toast.error(err?.message || 'Failed to download chart');
        }
    };

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

    // Build DataGrid rows for scopes
    type ScopeRow = {
        id: string;
        index: number;
        serverId?: string;
        title: string;
        groupsText: string;
        assigneeText: string;
        plannedText: string;
        actualText: string;
        mandays: number;
        progress: number;
        status: string;
    };

    const scopeRows: ScopeRow[] = useMemo(() => {
        const delivs = watchDeliverables ?? [];
        return (deliverableFields || []).map((field, index) => {
            const d: any = delivs[index] || {};
            const groupsText = (d.taskGroups || [])
                .map((val: string) => TASK_GROUP_OPTIONS.find(o => o.value === val)?.label || val)
                .join(', ');
            const assigneeText = (() => {
                const v = d.assignee;
                const opt = (assigneeChoices as ComboboxOption[]).find(o => o.value === v);
                return opt?.label || v || '-';
            })();
            const plannedText = `${formatDMY(d.startDate) || '-'} → ${formatDMY(d.endDate) || '-'}`;
            const actualText = `${formatDMY(d.actualStartDate || '') || '-'} → ${formatDMY(d.actualEndDate || '') || '-'}`;
            const mandays = typeof d.mandays === 'number' ? d.mandays : calcMandays(d.startDate, d.endDate);
            const status = d.status || ((d.progress ?? 0) <= 0 ? 'not_started' : (d.progress ?? 0) >= 100 ? 'completed' : 'in_progress');
            return {
                id: field.id,
                index,
                serverId: d.serverId ? String(d.serverId) : undefined,
                title: d.name || '-',
                groupsText,
                assigneeText,
                plannedText,
                actualText,
                mandays,
                progress: d.progress ?? 0,
                status,
            } as ScopeRow;
        });
    }, [deliverableFields, watchDeliverables, assigneeChoices]);

    const scopeColumns: ColumnDef<ScopeRow>[] = [
        {
            key: 'index',
            header: '#',
            render: (row) => row.index + 1,
            colClass: 'w-10 text-right text-muted-foreground',
        },
        { key: 'title', header: 'Title', columnVisible: true },
        { key: 'groupsText', header: 'Groups' },
        { key: 'assigneeText', header: 'Assignee' },
        {
            key: 'plannedText',
            header: 'Dates',
            render: (row) => (
                <div className="flex flex-col">
                    <span className="text-xs">Planned: {row.plannedText}</span>
                    <span className="text-xs text-muted-foreground">Actual: {row.actualText}</span>
                </div>
            ),
        },
        { key: 'mandays', header: 'Mandays' },
        {
            key: 'progress',
            header: 'Progress/Status',
            render: (row) => (
                <div className="flex flex-col gap-1">
                    <input
                        type="range"
                        min={0}
                        max={100}
                        step={5}
                        value={row.progress ?? 0}
                        disabled={Boolean(savingProgressId) && String(row.serverId || '') === savingProgressId}
                        onChange={e => handleInlineProgressChange(row.index, Number(e.target.value))}
                        className="accent-emerald-600"
                    />
                    <span className="text-[10px] text-muted-foreground">{row.status}</span>
                </div>
            ),
        },
        {
            key: 'id',
            header: 'Actions',
            render: (row) => (
                <div className="flex items-center gap-1 justify-end">
                    <Button type="button" variant="ghost" size="icon" aria-label="Move up" onClick={() => handleReorder(row.index, row.index - 1)}>
                        <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" aria-label="Move down" onClick={() => handleReorder(row.index, row.index + 1)}>
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
                                const current: any = (watchDeliverables ?? [])[row.index] || {};
                                setEditingScopeIndex(row.index);
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
                                const current: any = (watchDeliverables ?? [])[row.index] || {};
                                toast.info(`Add issues for: ${current.name || 'scope'}`);
                            }}>Add Issues</DropdownMenuItem>
                            <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={async () => {
                                    const current = (watchDeliverables ?? [])[row.index] as any;
                                    const serverId = current?.serverId;
                                    if (editProjectId && serverId) {
                                        try {
                                            setDeletingScopeId(String(serverId));
                                            await authenticatedApi.delete(`/api/projects/${editProjectId}/scopes/${serverId}`);
                                            remove(row.index);
                                            toast.success('Scope removed');
                                        } catch (err: any) {
                                            const msg = err?.response?.data?.message || err?.message || 'Failed to remove scope';
                                            toast.error(msg);
                                        } finally {
                                            setDeletingScopeId(null);
                                        }
                                    } else {
                                        remove(row.index);
                                    }
                                }}
                            >
                                Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            ),
        },
    ];

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
                const plannedStart = scope?.planned_start_date ? String(scope.planned_start_date).slice(0, 10) : values.startDate;
                const plannedEnd = scope?.planned_end_date ? String(scope.planned_end_date).slice(0, 10) : values.endDate;

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

    // Small numeric label renderer for burnup points
    const BurnupValueLabel = (props: any) => {
        const { x, y, value, color } = props;
        if (value == null || Number.isNaN(Number(value))) return null;
        const yy = typeof y === 'number' ? y - 6 : 0;
        return (
            <text x={x} y={yy} textAnchor="middle" fontSize={10} fill={color || '#334155'}>
                {Number(value).toFixed(0)}
            </text>
        );
    };

    // Custom clickable legend to toggle series visibility
    const BurnupLegend = ({ payload }: any) => {
        return (
            <div className="flex items-center justify-center gap-6 pb-2 text-xs">
                <button
                    type="button"
                    onClick={() => setShowPlanned(v => !v)}
                    className={`flex items-center gap-1 ${showPlanned ? '' : 'line-through text-muted-foreground'}`}
                    aria-pressed={showPlanned}
                    title="Toggle Planned"
                >
                    <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: '#2563eb' }} />
                    Planned
                </button>
                <button
                    type="button"
                    onClick={() => setShowActual(v => !v)}
                    className={`flex items-center gap-1 ${showActual ? '' : 'line-through text-muted-foreground'}`}
                    aria-pressed={showActual}
                    title="Toggle Actual"
                >
                    <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: '#f59e0b' }} />
                    Actual
                </button>
            </div>
        );
    };

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
        <div className="space-y-6">
            <form onSubmit={handleSubmit(submitHandler)} className="flex flex-col gap-6">
                {/* Main + Aside layout (align aside with very top, incl. tags) */}
                <div className="grid gap-6 md:grid-cols-[1fr_360px] items-stretch">
                    {/* Left column: Register Project */}
                    <Card className="self-stretch h-full flex flex-col shadow-none bg-stone-50">
                        <CardHeader>
                            <CardTitle className="text-base">{editProjectId ? 'Edit Project' : 'Register Project'}</CardTitle>
                            <CardDescription>{editProjectId ? 'Update details, add scopes, and save changes.' : 'Capture core delivery details and planned scopes.'}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
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
                                        <Input id="overallProgress" type="range" min={0} max={100} step={5} value={overallProgress} disabled readOnly className="accent-emerald-600" />
                                        <span className="w-12 text-right text-sm font-semibold text-emerald-600">{overallProgress}%</span>
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
                                <div className="space-y-1">
                                    <Label>Duration (mandays, Mon–Fri)</Label>
                                    <Input value={durationDays ? `${durationDays}` : ''} readOnly placeholder="Auto calculated" />
                                    <p className="text-xs text-muted-foreground">Sum of working days between Project start and due.</p>
                                    <p className="text-xs text-muted-foreground">Scopes total: {totalPlannedEffort} md</p>
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
                                            } catch (err: any) {
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
                        </CardContent>
                    </Card>

                    {/* Aside: Manage Project Scopes */}
                    <Card className="self-stretch h-full flex flex-col shadow-none bg-stone-50">
                        <CardHeader>
                            <CardTitle className="text-base">Manage Project Scopes</CardTitle>
                            <CardDescription>Add and edit scope items for this project.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
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
                            <div className="flex items-center justify-between">
                                <Label>Planned dates</Label>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                                    onClick={() => {
                                        setDraftValue('startDate', '', { shouldDirty: true });
                                        setDraftValue('endDate', '', { shouldDirty: true });
                                        setDraftValue('actualStartDate', '', { shouldDirty: true });
                                        setDraftValue('actualEndDate', '', { shouldDirty: true });
                                        setScopeFormKey(k => k + 1); // force Flatpickr remount to clear UI
                                    }}
                                >
                                    Clear
                                </Button>
                            </div>
                            <Flatpickr
                                key={`planned-${scopeFormKey}`}
                                options={{ mode: 'range', dateFormat: 'd/m/Y', position: 'auto left', allowInput: true }}
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
                                    if (!dates || dates.length === 0) {
                                        setDraftValue('startDate', '', { shouldDirty: true });
                                        setDraftValue('endDate', '', { shouldDirty: true });
                                        setDraftValue('actualStartDate', '', { shouldDirty: true });
                                        setDraftValue('actualEndDate', '', { shouldDirty: true });
                                        return;
                                    }
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
                            <div className="flex items-center justify-between">
                                <Label>Actual dates</Label>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                                    onClick={() => {
                                        setDraftValue('actualStartDate', '', { shouldDirty: true });
                                        setDraftValue('actualEndDate', '', { shouldDirty: true });
                                        setScopeFormKey(k => k + 1);
                                    }}
                                >
                                    Clear
                                </Button>
                            </div>
                            <Flatpickr
                                key={`actual-${scopeFormKey}`}
                                options={{ mode: 'range', dateFormat: 'd/m/Y', position: 'auto left', allowInput: true }}
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
                                    if (!dates || dates.length === 0) {
                                        setDraftValue('actualStartDate', '', { shouldDirty: true });
                                        setDraftValue('actualEndDate', '', { shouldDirty: true });
                                        return;
                                    }
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
                            <Button type="button" variant="secondary" onClick={editingScopeIndex !== null ? handleDraftSubmit(async (values) => {
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
                                    } catch (err: any) {
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
                        </CardContent>
                    </Card>
                </div>

                {/* Scopes list using CustomDataGrid */}
                <div className="space-y-3">
                    <div className='flex items-center justify-between'>
                        <div>
                            <h3 className="text-base font-semibold">Scopes</h3>
                            <p className="text-sm text-muted-foreground">Scopes you add will appear below.</p>
                        </div>
                    {/* Toolbar above grid */}
                    <div className="flex items-center justify-end gap-2">
                        <Button type="button" variant="secondary" onClick={async () => {
                                try {
                                    const workbook = new ExcelJS.Workbook();
                                    const ws = workbook.addWorksheet('Scopes');
                                    ws.columns = [
                                        { header: '#', key: 'num', width: 6 },
                                        { header: 'Title', key: 'title', width: 36 },
                                        { header: 'Groups', key: 'groups', width: 40 },
                                        { header: 'Assignee', key: 'assignee', width: 24 },
                                        { header: 'Planned Start', key: 'pstart', width: 16 },
                                        { header: 'Planned End', key: 'pend', width: 16 },
                                        { header: 'Mandays', key: 'mandays', width: 10 },
                                        { header: 'Progress', key: 'progress', width: 10 },
                                        { header: 'Status', key: 'status', width: 14 },
                                    ];
                                    scopeRows.forEach((r, i) => {
                                        const d = (watchDeliverables ?? [])[r.index] as any;
                                        ws.addRow({
                                            num: i + 1,
                                            title: r.title,
                                            groups: r.groupsText,
                                            assignee: r.assigneeText,
                                            pstart: d?.startDate || '',
                                            pend: d?.endDate || '',
                                            mandays: r.mandays,
                                            progress: r.progress,
                                            status: r.status,
                                        });
                                    });

                                    // Gantt (weekly) with colored bars, plus meta columns
                                    const wsG = workbook.addWorksheet('Gantt');
                                    const rangeStart = timeline.startDate ? parseISO(timeline.startDate) : null;
                                    const rangeEnd = timeline.endDate ? parseISO(timeline.endDate) : null;
                                    if (rangeStart && rangeEnd && isDateValid(rangeStart) && isDateValid(rangeEnd)) {
                                        const weekStart = startOfWeek(rangeStart, { weekStartsOn: 1 });
                                        const metaCols = ['Title', 'Planned Start', 'Planned End', 'Mandays', 'Progress (%)'];
                                        const header = [...metaCols];
                                        const weeks: Date[] = [];
                                        let w = new Date(weekStart);
                                        while (w <= rangeEnd) {
                                            header.push(`${formatDate(w, "'Wk' ww")} ${formatDate(w, 'dd/MM')}`);
                                            weeks.push(new Date(w));
                                            w = addWeeks(w, 1);
                                        }
                                        const headerRow = wsG.addRow(header);
                                        headerRow.font = { bold: true } as any;
                                        for (let c = 1; c <= header.length; c++) {
                                            const cell = headerRow.getCell(c);
                                            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } } as any;
                                            cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } } as any;
                                        }

                                        const palette = ['FF93C5FD','FFF9A8D4','FF86EFAC','FFFDBA74','FFA5B4FC','FF67E8F9','FFFDA4AF','FFBFDBFE'];

                                        scopeRows.forEach((r, i) => {
                                            const d = (watchDeliverables ?? [])[r.index] as any;
                                            const row = new Array(header.length).fill('');
                                            row[0] = r.title;
                                            row[1] = d?.startDate || '';
                                            row[2] = d?.endDate || '';
                                            row[3] = r.mandays;
                                            row[4] = r.progress;
                                            const added = wsG.addRow(row);
                                            const baseColor = palette[i % palette.length];
                                            if (d?.startDate && d?.endDate) {
                                                const s = parseISO(d.startDate);
                                                const e = parseISO(d.endDate);
                                                if (isDateValid(s) && isDateValid(e)) {
                                                    const indices: number[] = [];
                                                    weeks.forEach((wk, idx) => {
                                                        const wkStart = wk;
                                                        const wkEnd = addDays(wk, 6);
                                                        if (wkEnd < s || wkStart > e) return;
                                                        indices.push(idx);
                                                    });
                                                    const totalCells = indices.length;
                                                    const progressCells = Math.round(((r.progress ?? 0) / 100) * totalCells);
                                                    indices.forEach((wIdx, order) => {
                                                        const firstWeekCol = metaCols.length + 1; // 1-based index of first week column
                                                        const c = wIdx + firstWeekCol; // convert to 1-based
                                                        const cell = added.getCell(c);
                                                        cell.value = '';
                                                        const fillColor = order < progressCells ? 'FFF59E0B' : baseColor; // amber for completed
                                                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } } as any;
                                                        cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } } as any;
                                                    });
                                                }
                                            }
                                        });
                                        // Column widths for meta + week columns
                                        wsG.getColumn(1).width = 36; // Title
                                        wsG.getColumn(2).width = 14; // Planned Start
                                        wsG.getColumn(3).width = 14; // Planned End
                                        wsG.getColumn(4).width = 10; // Mandays
                                        wsG.getColumn(5).width = 12; // Progress (%)
                                        for (let c = metaCols.length + 1; c <= header.length; c++) wsG.getColumn(c).width = 4;
                                        wsG.views = [{ state: 'frozen', xSplit: 1, ySplit: 1 }];
                                    }

                                    const buffer = await workbook.xlsx.writeBuffer();
                                    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = `project-scopes-${Date.now()}.xlsx`;
                                    document.body.appendChild(a);
                                    a.click();
                                    document.body.removeChild(a);
                                    URL.revokeObjectURL(url);
                                    toast.success('Excel exported');
                                } catch (err: any) {
                                    toast.error(err?.message || 'Failed to export Excel');
                                }
                        }}>Export Gantt (Excel)</Button>
                        <Button type="button" variant="secondary" onClick={downloadBurnupPNG}>Download Burnup (PNG)</Button>
                    </div>
                    </div>

                    {scopeRows.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No scopes yet. Use the sidebar to add.</p>
                    ) : (
                        <CustomDataGrid
                            data={scopeRows}
                            columns={scopeColumns}
                            pagination={false}
                            inputFilter={false}
                            dataExport={false}
                        />
                    )}
                    {/* Burnup Chart */}
                    {timeline.startDate && timeline.endDate && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <h4 className="text-sm font-semibold">Burnup Chart</h4>
                                <div className="flex items-center gap-4 text-xs">
                                    <div className="flex items-center gap-2">
                                        <span className="text-muted-foreground">Values</span>
                                        <Switch checked={showValues} onCheckedChange={setShowValues} />
                                    </div>
                                    <span className="text-muted-foreground">Planned mode</span>
                                    <Select value={plannedMode} onValueChange={(v) => setPlannedMode(v as 'scope' | 'linear')}>
                                        <SelectTrigger className="h-7 w-[160px]">
                                            <SelectValue placeholder="By scope" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="scope">By scope (recommended)</SelectItem>
                                            <SelectItem value="linear">Linear by window</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="h-[500px] max-w-5xl mx-auto border rounded-xl p-4" ref={burnupRef}>
                                <div className="text-sm font-semibold mb-2 truncate">
                                    {watch('name') || 'Untitled Project'}
                                </div>
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={(() => {
                                        const s0 = parseISO(timeline.startDate!);
                                        const e0 = parseISO(timeline.endDate!);
                                        if (!isDateValid(s0) || !isDateValid(e0)) return [] as any[];
                                        const s = startOfWeek(s0, { weekStartsOn: 1 });
                                        const rows: any[] = [];
                                        const totalPlanned = totalPlannedEffort;
                                        const today = new Date();

                                        // helper to compute planned/actual up to a date
                                        const plannedAtLinear = (date: Date) => {
                                            const totalMd = Math.max(1, calcMandays(timeline.startDate!, timeline.endDate!));
                                            const elapsedMd = Math.max(0, Math.min(totalMd, calcMandays(timeline.startDate!, date.toISOString().slice(0,10))));
                                            return totalPlanned * (elapsedMd / totalMd);
                                        };
                                        const plannedAtByScope = (date: Date) => {
                                            const dateStr = date.toISOString().slice(0,10);
                                            let sum = 0;
                                            (watchDeliverables ?? []).forEach((d: any) => {
                                                if (!d?.startDate || !d?.endDate) return;
                                                const sd = parseISO(d.startDate);
                                                const ed = parseISO(d.endDate);
                                                if (!isDateValid(sd) || !isDateValid(ed)) return;
                                                const md = typeof d?.mandays === 'number' ? d.mandays : calcMandays(d.startDate, d.endDate);
                                                const denom = Math.max(1, calcMandays(d.startDate, d.endDate));
                                                if (date < sd) return; // no contribution yet
                                                if (date >= ed) { sum += md; return; }
                                                const elapsed = Math.max(0, Math.min(denom, calcMandays(d.startDate, dateStr)));
                                                sum += md * (elapsed / denom);
                                            });
                                            return sum;
                                        };
                                        const plannedAt = (date: Date) => plannedMode === 'scope' ? plannedAtByScope(date) : plannedAtLinear(date);
                                        const actualAt = (date: Date) => {
                                            let actual = 0;
                                            (watchDeliverables ?? []).forEach((d: any) => {
                                                const mandays = typeof d?.mandays === 'number' ? d.mandays : calcMandays(d?.startDate, d?.endDate);
                                                const completed = (d?.progress ?? 0) / 100 * mandays;
                                                if (!d?.startDate || !d?.endDate) return;
                                                const sd = parseISO(d.startDate);
                                                const ed = parseISO(d.endDate);
                                                if (!isDateValid(sd) || !isDateValid(ed)) return;
                                                const activeEnd = ed < today ? ed : today;
                                                if (date < sd) return;
                                                if (date >= sd && date <= activeEnd) {
                                                    const denom = Math.max(1, differenceInCalendarDays(activeEnd, sd) + 1);
                                                    const frac = Math.min(1, (differenceInCalendarDays(date, sd) + 1) / denom);
                                                    actual += completed * frac;
                                                } else if (date > activeEnd) {
                                                    actual += completed;
                                                }
                                            });
                                            return actual;
                                        };

                                        // iterate weeks
                                        let wStart = s;
                                        while (wStart <= e0) {
                                            const wEnd = addDays(wStart, 6) > e0 ? e0 : addDays(wStart, 6);
                                            const dLabel = `${formatDate(wStart, 'dd/MM')}–${formatDate(wEnd, 'dd/MM')}`;
                                            const p = plannedAt(wEnd);
                                            const a = actualAt(wEnd);
                                            const titles: string[] = (watchDeliverables ?? []).map((d: any) => {
                                                if (!d?.startDate || !d?.endDate) return '';
                                                const sd = parseISO(d.startDate);
                                                const ed = parseISO(d.endDate);
                                                if (!isDateValid(sd) || !isDateValid(ed)) return '';
                                                const overlap = !(addDays(wStart, 6) < sd || wStart > ed);
                                                return overlap ? (d?.name || '') : '';
                                            }).filter(Boolean);
                                            rows.push({ date: dLabel, Planned: Number(p.toFixed(2)), Actual: Number(a.toFixed(2)), Scope: totalPlanned, scopeTitles: titles });
                                            wStart = addWeeks(wStart, 1);
                                        }
                                        return rows;
                                    })()}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="date" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={70} interval={0} />
                                        <YAxis tick={{ fontSize: 10 }} label={{ value: 'Mandays', angle: -90, position: 'insideLeft', offset: 10 }} />
                                        <Tooltip content={({ active, payload, label }) => {
                                            if (!active || !payload?.length) return null as any;
                                            const planned = payload.find((p: any) => p.dataKey === 'Planned')?.value;
                                            const actual = payload.find((p: any) => p.dataKey === 'Actual')?.value;
                                            const scopes = (payload?.[0]?.payload?.scopeTitles as string[] | undefined) ?? [];
                                            return (
                                                <div className="rounded border bg-background p-2 text-xs">
                                                    <div className="font-medium mb-1">{label}</div>
                                                    <div className="text-blue-600">Planned: {planned}</div>
                                                    <div className="text-amber-600">Actual: {actual}</div>
                                                    <div className="text-muted-foreground">Scope: {totalPlannedEffort}</div>
                                                    {scopes.length ? (
                                                        <div className="mt-1">
                                                            <div className="text-foreground font-medium">Scopes:</div>
                                                            <div className="max-w-[280px] whitespace-normal leading-snug">
                                                                {scopes.join(', ')}
                                                            </div>
                                                        </div>
                                                    ) : null}
                                                </div>
                                            );
                                        }} />
                                        <Legend verticalAlign="top" align="center" content={<BurnupLegend />} />
                                        {showPlanned && (
                                            <Line type="monotone" dataKey="Planned" stroke="#2563eb" strokeWidth={2} dot={{ r: 2 }}>
                                                {showValues && (
                                                    <LabelList dataKey="Planned" content={(p: any) => <BurnupValueLabel {...p} color="#2563eb" />} />
                                                )}
                                            </Line>
                                        )}
                                        {showActual && (
                                            <Line type="monotone" dataKey="Actual" stroke="#f59e0b" strokeWidth={2} dot={{ r: 2 }}>
                                                {showValues && (
                                                    <LabelList dataKey="Actual" content={(p: any) => <BurnupValueLabel {...p} color="#f59e0b" />} />
                                                )}
                                            </Line>
                                        )}
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}

                    {/* Scope Completion Trend */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <h4 className="text-sm font-semibold">Scope Completion Trend</h4>
                            <div className="flex items-center gap-2 text-xs">
                                <span className="text-muted-foreground">Completion by</span>
                                <Select value={completionMode} onValueChange={(v) => setCompletionMode(v as 'actual' | 'planned')}>
                                    <SelectTrigger className="h-7 w-[160px]">
                                        <SelectValue placeholder="Actual end" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="actual">Actual end</SelectItem>
                                        <SelectItem value="planned">Planned end</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="h-[340px] max-w-5xl mx-auto border rounded-xl p-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={(() => {
                                    const ends: { date: Date; name: string }[] = [];
                                    (watchDeliverables ?? []).forEach((d: any, i: number) => {
                                        const endStr = completionMode === 'actual' ? (d?.actualEndDate || '') : (d?.endDate || '');
                                        if (!endStr) return;
                                        const ed = parseISO(endStr);
                                        if (!isDateValid(ed)) return;
                                        ends.push({ date: ed, name: d?.name || `Scope ${i + 1}` });
                                    });
                                    if (!ends.length) return [] as any[];
                                    ends.sort((a, b) => a.date.getTime() - b.date.getTime());
                                    const minD = ends[0].date;
                                    const maxD = ends[ends.length - 1].date;
                                    const s = startOfWeek(minD, { weekStartsOn: 1 });
                                    const rows: any[] = [];
                                    let wStart = s;
                                    while (wStart <= maxD) {
                                        const wEnd = addDays(wStart, 6) > maxD ? maxD : addDays(wStart, 6);
                                        const completed = ends.filter(e => e.date <= wEnd).length;
                                        const thisWeekTitles = ends.filter(e => e.date >= wStart && e.date <= wEnd).map(e => e.name);
                                        rows.push({
                                            date: `${formatDate(wStart, 'dd/MM')}–${formatDate(wEnd, 'dd/MM')}`,
                                            Completed: completed,
                                            weekTitles: thisWeekTitles,
                                        });
                                        wStart = addWeeks(wStart, 1);
                                    }
                                    return rows;
                                })()}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="date" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={70} interval={0} />
                                    <YAxis allowDecimals={false} tick={{ fontSize: 10 }} label={{ value: '# Completed', angle: -90, position: 'insideLeft', offset: 10 }} />
                                    <Tooltip content={({ active, payload, label }) => {
                                        if (!active || !payload?.length) return null as any;
                                        const cnt = payload.find((p: any) => p.dataKey === 'Completed')?.value;
                                        const newScopes = (payload?.[0]?.payload?.weekTitles as string[] | undefined) ?? [];
                                        return (
                                            <div className="rounded border bg-background p-2 text-xs">
                                                <div className="font-medium mb-1">{label}</div>
                                                <div className="text-emerald-600">Completed: {cnt}</div>
                                                {newScopes.length ? (
                                                    <div className="mt-1">
                                                        <div className="text-foreground font-medium">This week:</div>
                                                        <div className="max-w-[280px] whitespace-normal leading-snug">{newScopes.join(', ')}</div>
                                                    </div>
                                                ) : null}
                                            </div>
                                        );
                                    }} />
                                    {showValues && (
                                        <Line type="monotone" dataKey="Completed" stroke="#10b981" strokeWidth={2} dot={{ r: 2 }}>
                                            <LabelList dataKey="Completed" content={(p: any) => <BurnupValueLabel {...p} color="#10b981" />} />
                                        </Line>
                                    )}
                                    {!showValues && (
                                        <Line type="monotone" dataKey="Completed" stroke="#10b981" strokeWidth={2} dot={{ r: 2 }} />
                                    )}
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
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
