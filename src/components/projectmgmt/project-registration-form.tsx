'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { differenceInCalendarDays, isValid as isDateValid, parseISO, addDays, addWeeks, startOfWeek, endOfWeek, format as formatDate } from 'date-fns';
import type { DeliverableType, ProjectDeliverableAttachment, ProjectFormValues, ProjectTag } from './types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SingleSelect, MultiSelect, type ComboboxOption } from '@/components/ui/combobox';
import { Plus, Trash2, MoreVertical, ArrowUp, ArrowDown, Pencil } from 'lucide-react';
import { CustomDataGrid, type ColumnDef } from '@/components/ui/DataGrid';
import ExcelJS from 'exceljs';
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend, LabelList } from 'recharts';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { authenticatedApi } from '@/config/api';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import GanttChart, { type GanttTask } from './ScopeGanttChartView';
import ScopesTableView, { type ScopeRow } from './ScopesTableView';
import BurnupChartView from './ScopeBurnupChartView';
import Flatpickr from 'react-flatpickr';
import ActionSidebar from '@/components/ui/action-aside';

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

// Task color palette for Gantt chart
const TASK_COLORS = [
    '#3b82f6', // blue
    '#ef4444', // red  
    '#10b981', // emerald
    '#f59e0b', // amber
    '#8b5cf6', // violet
    '#06b6d4', // cyan
    '#f97316', // orange
    '#84cc16', // lime
];

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

    const computeOverallProgress = (items: any[] | undefined | null): number => {
        const list = (items ?? []).map((d: any) => (typeof d?.progress === 'number' ? d.progress : 0));
        if (!list.length) return 0;
        const sum = list.reduce((acc, v) => acc + (Number.isFinite(v) ? v : 0), 0);
        return Math.round(sum / list.length);
    };
    // Burnup planned mode: 'scope' (recommended) or 'linear'
    const [plannedMode, setPlannedMode] = useState<'scope' | 'linear'>('scope');
    const [showPlanned, setShowPlanned] = useState(true);
    const [showActual, setShowActual] = useState(true);
    const [showValues, setShowValues] = useState(true);
    const [completionMode, setCompletionMode] = useState<'actual' | 'planned'>('actual');
    const [projectDetailsOpen, setProjectDetailsOpen] = useState(false);
    const [scopeDialogOpen, setScopeDialogOpen] = useState(false);

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

    // Shared Excel export function
    const exportGanttExcel = async () => {
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
                    progress: `${r.progress}%`,
                    status: r.status,
                });
            });
            ws.getRow(1).font = { bold: true };
            const wsG = workbook.addWorksheet('Gantt Chart');
            if (ganttTasks.length > 0 && timeline.startDate && timeline.endDate) {
                const start = parseISO(timeline.startDate);
                const end = parseISO(timeline.endDate);
                if (isDateValid(start) && isDateValid(end)) {
                    const weeks: Date[] = [];
                    let c = startOfWeek(start, { weekStartsOn: 1 });
                    const finalWeek = endOfWeek(end, { weekStartsOn: 1 });
                    while (c <= finalWeek) {
                        weeks.push(c);
                        c = addDays(c, 7);
                    }
                    const metaCols = ['Title', 'Planned Start', 'Planned End', 'Mandays', 'Progress (%)'];
                    const header = [...metaCols, ...weeks.map(w => formatDate(w, 'MMM dd'))];
                    wsG.addRow(header);
                    wsG.getRow(1).font = { bold: true };
                    const palette = ['FFE0F7FA', 'FFFFF9C4', 'FFC5E1A5', 'FFFFCCBC', 'FFD1C4E9'];
                    ganttTasks.forEach((task, i) => {
                        const d = (watchDeliverables ?? [])[task.index] as any;
                        const r = wsG.addRow([
                            task.name,
                            task.startDate ? formatDate(parseISO(task.startDate), 'yyyy-MM-dd') : '',
                            task.endDate ? formatDate(parseISO(task.endDate), 'yyyy-MM-dd') : '',
                            task.mandays,
                            task.progress,
                        ]);
                        const added = r as any;
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
                                const progressCells = Math.round(((task.progress ?? 0) / 100) * totalCells);
                                indices.forEach((wIdx, order) => {
                                    const firstWeekCol = metaCols.length + 1;
                                    const c = wIdx + firstWeekCol;
                                    const cell = added.getCell(c);
                                    cell.value = '';
                                    const fillColor = order < progressCells ? 'FFF59E0B' : baseColor;
                                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } } as any;
                                    cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } } as any;
                                });
                            }
                        }
                    });
                    wsG.getColumn(1).width = 36;
                    wsG.getColumn(2).width = 14;
                    wsG.getColumn(3).width = 14;
                    wsG.getColumn(4).width = 10;
                    wsG.getColumn(5).width = 12;
                    for (let c = metaCols.length + 1; c <= header.length; c++) wsG.getColumn(c).width = 4;
                    wsG.views = [{ state: 'frozen', xSplit: 1, ySplit: 1 }];
                }
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
    };

    // Inline progress change handler (save immediately when in edit mode)
    const handleInlineProgressChange = async (index: number, val: number) => {
        setValue(`deliverables.${index}.progress`, val, { shouldDirty: true });
        const status = val <= 0 ? 'not_started' : val >= 100 ? 'completed' : 'in_progress';
        setValue(`deliverables.${index}.status`, status as any, { shouldDirty: true });
        const allDeliverables = (getValues('deliverables') as any[]) || [];
        const newOverall = computeOverallProgress(allDeliverables);
        setValue('percentComplete', newOverall, { shouldDirty: true });
        const current: any = allDeliverables[index] || {};
        const serverId = current?.serverId;
        if (editProjectId && serverId) {
            try {
                setSavingProgressId(String(serverId));
                const formData = new FormData();
                formData.append('progress', String(val));
                formData.append('status', status);
                 // Ensure project-level overall_progress stays in sync with scope changes
                formData.append('overall_progress', String(newOverall));
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

    // Handler for editing a scope from table view
    const handleTableEdit = (index: number) => {
        const current: any = (watchDeliverables ?? [])[index] || {};
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
        setScopeDialogOpen(true);
    };

    // Handler for deleting a scope from table view
    const handleTableDelete = async (index: number, serverId?: string) => {
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
    // Ref for scope dialog root (for Flatpickr appendTo)
    const scopeDialogRootRef = useRef<HTMLDivElement | null>(null);

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

    const overallProgress = useMemo(
        () => computeOverallProgress(watchDeliverables as any[] | undefined),
        [watchDeliverables],
    );

    useEffect(() => {
        setValue('percentComplete', overallProgress);
    }, [overallProgress, setValue]);

    const [successOpen, setSuccessOpen] = useState(false);
    const [successInfo, setSuccessInfo] = useState<{ code: string; name: string } | null>(null);
    const [deletingScopeId, setDeletingScopeId] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'table' | 'gantt' | 'burnup'>('gantt'); // Default to Gantt view

    // Convert deliverables to GanttTask format
    const ganttTasks: GanttTask[] = useMemo(() => {
        return (watchDeliverables ?? []).map((deliverable: any, index) => {
            const assigneeText = (() => {
                const v = deliverable.assignee;
                const opt = (assigneeChoices as ComboboxOption[]).find(o => o.value === v);
                return opt?.label || v || '';
            })();

            return {
                id: deliverable.id || `task-${index}`,
                index,
                name: deliverable.name || `Scope ${index + 1}`,
                startDate: deliverable.startDate || '',
                endDate: deliverable.endDate || '',
                progress: deliverable.progress || 0,
                status: deliverable.status || 'not_started',
                assignee: assigneeText,
                mandays: deliverable.mandays || calcMandays(deliverable.startDate, deliverable.endDate),
                actualStartDate: deliverable.actualStartDate || '',
                actualEndDate: deliverable.actualEndDate || '',
                taskGroups: deliverable.taskGroups || [],
                color: TASK_COLORS[index % TASK_COLORS.length],
            } as GanttTask;
        });
    }, [watchDeliverables, assigneeChoices]);

    // Build DataGrid rows for scopes
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
            const actualMandays = typeof d.actualMandays === 'number' ? d.actualMandays : calcMandays(d.actualStartDate, d.actualEndDate);
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
                actualMandays,
                progress: d.progress ?? 0,
                status,
            } as ScopeRow;
        });
    }, [deliverableFields, watchDeliverables, assigneeChoices]);

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
                setProjectDetailsOpen(false);
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
        if (!editProjectId) {
            toast.error('Please save the project before adding scopes.');
            return;
        }
        const prog = typeof values.progress === 'number' ? values.progress : 0;
        const status = prog <= 0 ? 'not_started' : prog >= 100 ? 'completed' : 'in_progress';

        // When editing an existing project, POST scope immediately to API
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

        // Local create mode is no longer supported (scopes require a saved project)
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
                {/* Main + Aside layout (align aside with very top, incl. tags) – now hidden in favor of dialog-based scopes */}
                {false && (
                    <div className="order-2 grid gap-6 md:grid-cols-[1fr_360px] items-stretch">
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
                                    {draftErrors.name && <p className="text-sm text-destructive">{draftErrors.name?.message}</p>}
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
                                                setScopeFormKey(k => k + 1);
                                            }}
                                        >
                                            Clear
                                        </Button>
                                    </div>
                                    <Calendar
                                        mode="range"
                                        numberOfMonths={2}
                                        selected={(() => {
                                            const s = watchDraft('startDate');
                                            const e = watchDraft('endDate');
                                            return {
                                                from: s && isDateValid(parseISO(s)) ? parseISO(s) : undefined,
                                                to: e && isDateValid(parseISO(e)) ? parseISO(e) : undefined,
                                            };
                                        })()}
                                        onSelect={value => {
                                            if (!value?.from) {
                                                setDraftValue('startDate', '', { shouldDirty: true });
                                                setDraftValue('endDate', '', { shouldDirty: true });
                                                setDraftValue('actualStartDate', '', { shouldDirty: true });
                                                setDraftValue('actualEndDate', '', { shouldDirty: true });
                                                return;
                                            }
                                            const from = value.from;
                                            const to = value.to ?? value.from;
                                            const startStr = toDateOnlyLocal(from);
                                            const endStr = toDateOnlyLocal(to);
                                            setDraftValue('startDate', startStr, { shouldDirty: true });
                                            setDraftValue('endDate', endStr, { shouldDirty: true });
                                            setDraftValue('actualStartDate', startStr, { shouldDirty: true });
                                            setDraftValue('actualEndDate', endStr, { shouldDirty: true });
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
                                    <Calendar
                                        mode="range"
                                        numberOfMonths={2}
                                        selected={(() => {
                                            const s = watchDraft('actualStartDate') || watchDraft('startDate');
                                            const e = watchDraft('actualEndDate') || watchDraft('endDate');
                                            return {
                                                from: s && isDateValid(parseISO(s)) ? parseISO(s) : undefined,
                                                to: e && isDateValid(parseISO(e)) ? parseISO(e) : undefined,
                                            };
                                        })()}
                                        onSelect={value => {
                                            if (!value?.from) {
                                                setDraftValue('actualStartDate', '', { shouldDirty: true });
                                                setDraftValue('actualEndDate', '', { shouldDirty: true });
                                                return;
                                            }
                                            const from = value.from;
                                            const to = value.to ?? value.from;
                                            const startStr = toDateOnlyLocal(from);
                                            const endStr = toDateOnlyLocal(to);
                                            setDraftValue('actualStartDate', startStr, { shouldDirty: true });
                                            setDraftValue('actualEndDate', endStr, { shouldDirty: true });
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
                )}

                {/* Scopes View Card */}
                <Card className="order-1">
                    <CardHeader>
                        <div className="flex items-start justify-between gap-4">
                            {/* Project Info */}
                            <div className="flex items-start gap-3">
                                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                    </svg>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2">
                                        <div>
                                            <h3 className="font-bold text-lg text-slate-800">
                                                {watch('name') || 'Untitled Project'}
                                            </h3>
                                            {watch('code') && (
                                                <p className="text-sm text-slate-500">{watch('code')}</p>
                                            )}
                                        </div>
                                        {editProjectId && (
                                            <Button
                                                type="button"
                                                size="icon"
                                                variant="ghost"
                                                className="h-8 w-8 text-amber-500 hover:text-amber-600"
                                                onClick={() => setProjectDetailsOpen(true)}
                                                aria-label="Edit project details"
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                                        {((watch('projectTags' as any) as any) || '').trim() && (
                                            <span className="font-medium capitalize">
                                                {(watch('projectTags' as any) as any) || ''}
                                            </span>
                                        )}
                                        {watch('description') && (
                                            <span className="max-w-2xl truncate">
                                                {watch('description')}
                                            </span>
                                        )}
                                    </div>
                                    {timeline.startDate && timeline.endDate && (
                                        <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                                            <span>
                                                Start:{' '}
                                                {formatDate(parseISO(timeline.startDate), 'MMM dd, yyyy')}
                                            </span>
                                            <span>
                                                End:{' '}
                                                {formatDate(parseISO(timeline.endDate), 'MMM dd, yyyy')}
                                            </span>
                                            <span>
                                                Duration: {durationDays || 0} md
                                            </span>
                                            <span>
                                                Progress: {overallProgress || 0}%
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* View Controls */}
                            <div className="flex items-center gap-2">
                                {/* View Mode Toggle */}
                                <div className="flex items-center gap-2">
                                    <Button
                                        type="button"
                                        variant={viewMode === 'table' ? 'default' : 'outline'}
                                        size="sm"
                                        disabled={scopeRows.length === 0}
                                        onClick={() => setViewMode('table')}
                                    >
                                        Table View
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={viewMode === 'gantt' ? 'default' : 'outline'}
                                        size="sm"
                                        disabled={scopeRows.length === 0}
                                        onClick={() => setViewMode('gantt')}
                                    >
                                        Gantt Chart
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={viewMode === 'burnup' ? 'default' : 'outline'}
                                        size="sm"
                                        disabled={scopeRows.length === 0}
                                        onClick={() => setViewMode('burnup')}
                                    >
                                        Burnup Chart
                                    </Button>
                                </div>

                                <div className="flex items-center gap-2">
                                    {/* Export Buttons */}
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        size="sm"
                                        onClick={exportGanttExcel}
                                    >
                                        Export Gantt (Excel)
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        size="sm"
                                        onClick={downloadBurnupPNG}
                                    >
                                        Download Burnup (PNG)
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent>
                        {/* Create mode: inline project registration fields inside scopes card */}
                        {!editProjectId && (
                            <div className="mb-6 rounded-lg border border-border/60 bg-stone-50 p-4 space-y-6">
                                <div>
                                    <h3 className="text-sm font-medium">Register Project</h3>
                                    <p className="text-xs text-muted-foreground">
                                        Capture core delivery details and planned scopes before saving.
                                    </p>
                                </div>
                                <div className="grid gap-4 md:grid-cols-3">
                                    <div className="space-y-2">
                                        <Label htmlFor="projectTags_inline">Project tags</Label>
                                        <Input
                                            id="projectTags_inline"
                                            placeholder="e.g. adms4"
                                            value={(watch('projectTags' as any) as any) || ''}
                                            onChange={e => setValue('projectTags' as any, e.target.value)}
                                        />
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

                                <div className="space-y-6">
                                    <div className="grid gap-4 md:grid-cols-3">
                                        <div className="space-y-2">
                                            <Label htmlFor="code_inline">Project code (optional)</Label>
                                            <Input id="code_inline" className="uppercase" placeholder="e.g. OPS-2024-08" {...register('code')} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="name_inline">Project name</Label>
                                            <Input
                                                id="name_inline"
                                                className="capitalize"
                                                placeholder="e.g. Employee Onboarding Portal"
                                                {...register('name', { required: 'Project name is required' })}
                                            />
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
                                        <Label htmlFor="description_inline">Description</Label>
                                        <Textarea
                                            id="description_inline"
                                            placeholder="Optional context that helps assignees understand the project"
                                            rows={3}
                                            {...register('description')}
                                        />
                                    </div>

                                    <div className="grid gap-4 md:grid-cols-3">
                                        <div className="space-y-2">
                                            <Label htmlFor="overallProgress_inline">Overall progress (%)</Label>
                                            <div className="grid grid-cols-[1fr_auto] items-center gap-2">
                                                <Input
                                                    id="overallProgress_inline"
                                                    type="range"
                                                    min={0}
                                                    max={100}
                                                    step={5}
                                                    value={overallProgress}
                                                    disabled
                                                    readOnly
                                                    className="accent-emerald-600"
                                                />
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

                                    <div className="flex justify-end">
                                        <Button type="submit" disabled={!isValid || isSubmitting} aria-disabled={!isValid || isSubmitting}>
                                            Save project
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Add / empty state helper */}
                        {editProjectId && (
                            <div className="mb-2 flex items-center justify-end gap-2">
                                <p className="text-sm">
                                    {scopeRows.length === 0 ? 'No scopes yet.' : 'Add more scopes.'}
                                </p>
                                <Button
                                    type="button"
                                    variant="default"
                                    size="sm"
                                    onClick={() => {
                                        setEditingScopeIndex(null);
                                        resetDraft({
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
                                        });
                                        setScopeFormKey(k => k + 1);
                                        setScopeDialogOpen(true);
                                    }}
                                >
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                        )}

                        {/* Content based on view mode */}
                        {scopeRows.length === 0 ? null : viewMode === 'table' ? (
                            <ScopesTableView
                                scopeRows={scopeRows}
                                savingProgressId={savingProgressId}
                                editProjectId={editProjectId}
                                onProgressChange={handleInlineProgressChange}
                                onReorder={handleReorder}
                                onEdit={handleTableEdit}
                                onDelete={handleTableDelete}
                            />
                        ) : viewMode === 'burnup' ? (
                            timeline.startDate && timeline.endDate ? (
                                <BurnupChartView
                                    projectName={watch('name') || 'Untitled Project'}
                                    timeline={timeline}
                                    deliverables={watchDeliverables ?? []}
                                    totalPlannedEffort={totalPlannedEffort}
                                    calcMandays={calcMandays}
                                    chartRef={burnupRef}
                                />
                            ) : (
                                <p className="text-sm text-muted-foreground">Set project start and end dates to view burnup chart.</p>
                            )
                        ) : (
                            <GanttChart
                                tasks={ganttTasks}
                                projectStart={timeline.startDate}
                                projectEnd={timeline.endDate}
                                projectName={watch('name') || 'Untitled Project'}
                                projectCode={watch('code') || undefined}
                                onTasksReorder={(reorderedTasks: GanttTask[]) => {
                                    // Map reordered tasks back to deliverables and update form state
                                    const reorderedDeliverables = reorderedTasks.map(task => {
                                        const index = ganttTasks.findIndex(t => t.id === task.id);
                                        return (watchDeliverables ?? [])[index];
                                    }).filter(Boolean);

                                    // Update the form state with reordered deliverables
                                    setValue('deliverables', reorderedDeliverables);

                                    // If editing, sync with backend
                                    if (editProjectId) {
                                        const payload = {
                                            project_id: editProjectId,
                                            scopes: reorderedDeliverables
                                                .map((d: any, idx) => (d?.serverId ? { id: String(d.serverId), order_index: idx } : null))
                                                .filter(Boolean),
                                        } as any;
                                        authenticatedApi.put(`/api/projects/${editProjectId}/scopes/reorder`, payload)
                                            .then(() => toast.success('Scopes reordered'))
                                            .catch((err: any) => {
                                                toast.error(err?.response?.data?.message || err?.message || 'Failed to reorder scopes');
                                            });
                                    }
                                }}
                                onTaskClick={(task: GanttTask) => {
                                    console.log('Task clicked:', task);
                                    // Could open edit dialog here
                                }}
                                onTaskEdit={(taskId: string) => {
                                    const index = ganttTasks.findIndex(t => t.id === taskId);
                                    if (index !== -1) {
                                        const current: any = (watchDeliverables ?? [])[index] || {};
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
                                        setScopeDialogOpen(true);
                                    }
                                }}
                                onTaskDelete={async (taskId: string) => {
                                    const index = ganttTasks.findIndex(t => t.id === taskId);
                                    if (index === -1) return;

                                    const current = (watchDeliverables ?? [])[index] as any;
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
                                        toast.success('Scope removed');
                                    }
                                }}
                                className="min-h-[400px]"
                            />
                        )}
                    </CardContent>

                    {/* Footer Stats - displayed on all views */}
                    {scopeRows.length > 0 && timeline.startDate && timeline.endDate && (
                        <CardFooter className="bg-gradient-to-r from-slate-50 to-gray-50 text-sm">
                            <div className="flex justify-between items-center text-slate-600 w-full">
                                <div className="flex items-center gap-6">
                                    <span className="font-medium">{scopeRows.length} tasks total</span>
                                    <span>{scopeRows.filter(s => s.status === 'completed').length} completed</span>
                                    <span>{scopeRows.filter(s => s.status === 'in_progress').length} in progress</span>
                                </div>
                                <div className="flex items-center gap-6">
                                    <div className="text-right">
                                        <div className="text-xs text-slate-500">Project Duration</div>
                                        <div className="font-semibold text-slate-700">
                                            {formatDate(parseISO(timeline.startDate), 'MMM dd, yyyy')} - {formatDate(parseISO(timeline.endDate), 'MMM dd, yyyy')}
                                            <span className="ml-2 text-xs text-slate-500">
                                                ({Math.ceil(differenceInCalendarDays(parseISO(timeline.endDate), parseISO(timeline.startDate)) / 7)} weeks)
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs text-slate-500">Overall Progress</div>
                                        <div className="font-semibold text-emerald-600 text-lg">
                                            {scopeRows.length > 0 ? Math.round(scopeRows.reduce((sum, s) => sum + (s.progress || 0), 0) / scopeRows.length) : 0}%
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardFooter>
                    )}
                </Card>

                {/* Project details dialog for edit mode */}
                {editProjectId && (
                    <Dialog open={projectDetailsOpen} onOpenChange={setProjectDetailsOpen}>
                        <DialogContent className="min-w-4xl">
                            <DialogHeader>
                                <DialogTitle>Edit project details</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-6">
                                <div className="grid gap-4 md:grid-cols-3">
                                    <div className="space-y-2">
                                        <Label htmlFor="projectTags_dialog">Project tags</Label>
                                        <Input
                                            id="projectTags_dialog"
                                            placeholder="e.g. adms4"
                                            value={(watch('projectTags' as any) as any) || ''}
                                            onChange={e => setValue('projectTags' as any, e.target.value)}
                                        />
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

                                <div className="space-y-6">
                                    <div className="grid gap-4 md:grid-cols-3">
                                        <div className="space-y-2">
                                            <Label htmlFor="code_dialog">Project code (optional)</Label>
                                            <Input id="code_dialog" className="uppercase" placeholder="e.g. OPS-2024-08" {...register('code')} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="name_dialog">Project name</Label>
                                            <Input
                                                id="name_dialog"
                                                className="capitalize"
                                                placeholder="e.g. Employee Onboarding Portal"
                                                {...register('name', { required: 'Project name is required' })}
                                            />
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
                                        <Label htmlFor="description_dialog">Description</Label>
                                        <Textarea
                                            id="description_dialog"
                                            placeholder="Optional context that helps assignees understand the project"
                                            rows={3}
                                            {...register('description')}
                                        />
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
                                        <Button
                                            type="button"
                                            variant="destructive"
                                            onClick={async () => {
                                                if (!editProjectId) return;
                                                const ok = typeof window !== 'undefined' ? window.confirm('Delete this project and all its scopes?') : true;
                                                if (!ok) return;
                                                try {
                                                    await authenticatedApi.delete(`/api/projects/${editProjectId}`);
                                                    toast.success('Project deleted');
                                                    setProjectDetailsOpen(false);
                                                } catch (err: any) {
                                                    toast.error(err?.response?.data?.message || err?.message || 'Failed to delete project');
                                                }
                                            }}
                                        >
                                            Delete project
                                        </Button>
                                        <Button
                                            type="button"
                                            disabled={isSubmitting}
                                            aria-disabled={isSubmitting}
                                            onClick={handleSubmit(submitHandler)}
                                        >
                                            Update project
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                )}

                {/* Scope editor sidebar (add / edit) – only after project is registered */}
                {editProjectId && (
                    <ActionSidebar
                        isOpen={scopeDialogOpen}
                        onClose={() => setScopeDialogOpen(false)}
                        size="lg"
                        title={editingScopeIndex !== null ? 'Edit scope' : 'Add scope'}
                        content={
                            <div ref={scopeDialogRootRef} className="space-y-3">
                                <div className="space-y-2">
                                    <Label htmlFor="dl-name-dialog">Title</Label>
                                    <Input
                                        id="dl-name-dialog"
                                        className="capitalize"
                                        placeholder="e.g. API contract design"
                                        {...registerDraft('name', { required: 'Title is required' })}
                                    />
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
                                    <Label htmlFor="dl-desc-dialog">Description</Label>
                                    <Textarea
                                        id="dl-desc-dialog"
                                        rows={3}
                                        placeholder="Notes, scope, success criteria..."
                                        {...registerDraft('description')}
                                    />
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
                                        <p className="text-xs text-muted-foreground">
                                            {assigneeError}. Using fallback list if available.
                                        </p>
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
                                                setScopeFormKey(k => k + 1);
                                            }}
                                        >
                                            Clear
                                        </Button>
                                    </div>
                                    <Flatpickr
                                        key={`planned-${scopeFormKey}`}
                                        options={{
                                            mode: 'range',
                                            dateFormat: 'Y-m-d',
                                            showMonths: 2,
                                            inline: true,
                                            disableMobile: true,
                                            locale: { firstDayOfWeek: 1 },
                                        }}
                                        value={(() => {
                                            const s = watchDraft('startDate');
                                            const e = watchDraft('endDate');
                                            const dates: Date[] = [];
                                            if (s && isDateValid(parseISO(s))) dates.push(parseISO(s));
                                            if (e && isDateValid(parseISO(e))) dates.push(parseISO(e));
                                            return dates;
                                        })()}
                                        onChange={(selectedDates: Date[]) => {
                                            if (!selectedDates || selectedDates.length === 0) {
                                                setDraftValue('startDate', '', { shouldDirty: true });
                                                setDraftValue('endDate', '', { shouldDirty: true });
                                                setDraftValue('actualStartDate', '', { shouldDirty: true });
                                                setDraftValue('actualEndDate', '', { shouldDirty: true });
                                                return;
                                            }
                                            if (selectedDates.length === 1) {
                                                const fromDate = selectedDates[0];
                                                const startStr = toDateOnlyLocal(fromDate);
                                                setDraftValue('startDate', startStr, { shouldDirty: true });
                                                setDraftValue('endDate', '', { shouldDirty: true });
                                                setDraftValue('actualStartDate', startStr, { shouldDirty: true });
                                                setDraftValue('actualEndDate', '', { shouldDirty: true });
                                                return;
                                            }
                                            const [from, toRaw] = selectedDates;
                                            const fromDate = from;
                                            const toDate = toRaw || fromDate;
                                            const startStr = toDateOnlyLocal(fromDate);
                                            const endStr = toDateOnlyLocal(toDate);
                                            setDraftValue('startDate', startStr, { shouldDirty: true });
                                            setDraftValue('endDate', endStr, { shouldDirty: true });
                                            setDraftValue('actualStartDate', startStr, { shouldDirty: true });
                                            setDraftValue('actualEndDate', endStr, { shouldDirty: true });
                                        }}
                                        className="w-64 rounded-md border border-input bg-background px-2 py-2 text-xs"
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
                                        <p className="text-sm text-destructive">
                                            {draftErrors.startDate?.message || draftErrors.endDate?.message}
                                        </p>
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
                                        options={{
                                            mode: 'range',
                                            dateFormat: 'Y-m-d',
                                            showMonths: 2,
                                            inline: true,
                                            disableMobile: true,
                                            locale: { firstDayOfWeek: 1 },
                                        }}
                                        value={(() => {
                                            const s = watchDraft('actualStartDate');
                                            const e = watchDraft('actualEndDate');
                                            const dates: Date[] = [];
                                            if (s && isDateValid(parseISO(s))) dates.push(parseISO(s));
                                            if (e && isDateValid(parseISO(e))) dates.push(parseISO(e));
                                            return dates;
                                        })()}
                                        onChange={(selectedDates: Date[]) => {
                                            if (!selectedDates || selectedDates.length === 0) {
                                                setDraftValue('actualStartDate', '', { shouldDirty: true });
                                                setDraftValue('actualEndDate', '', { shouldDirty: true });
                                                return;
                                            }
                                            if (selectedDates.length === 1) {
                                                const fromDate = selectedDates[0];
                                                const startStr = toDateOnlyLocal(fromDate);
                                                setDraftValue('actualStartDate', startStr, { shouldDirty: true });
                                                setDraftValue('actualEndDate', '', { shouldDirty: true });
                                                return;
                                            }
                                            const [from, toRaw] = selectedDates;
                                            const fromDate = from;
                                            const toDate = toRaw || fromDate;
                                            const startStr = toDateOnlyLocal(fromDate);
                                            const endStr = toDateOnlyLocal(toDate);
                                            setDraftValue('actualStartDate', startStr, { shouldDirty: true });
                                            setDraftValue('actualEndDate', endStr, { shouldDirty: true });
                                        }}
                                        className="w-64 rounded-md border border-input bg-background px-2 py-2 text-xs"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Actual mandays (Mon–Fri): {draftActualMandays || 0}
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="dl-progress-dialog">Progress (%)</Label>
                                    <div className="grid grid-cols-[1fr_auto] items-center gap-2">
                                        <Input
                                            id="dl-progress-dialog"
                                            type="range"
                                            min={0}
                                            max={100}
                                            step={5}
                                            {...registerDraft('progress', { valueAsNumber: true })}
                                        />
                                        <span className="w-12 text-right text-sm text-muted-foreground">
                                            {watchDraft('progress') ?? 0}%
                                        </span>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Attachments</Label>
                                    <div className="flex flex-wrap gap-2">
                                        {draftFiles.map((file: File, idx: number) => (
                                            <span
                                                key={`${file.name}-${idx}`}
                                                className="inline-flex items-center gap-2 rounded-md border border-border/60 px-3 py-1 text-xs"
                                            >
                                                <span className="font-medium truncate max-w-[160px]">{file.name}</span>
                                                <button
                                                    type="button"
                                                    className="text-muted-foreground transition hover:text-destructive"
                                                    onClick={() => handleDraftAttachmentRemove(idx)}
                                                >
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
                                <div className="flex items-center justify-between">
                                    <div className="text-xs text-muted-foreground">
                                        {scopeRows.length} scopes · {scopeRows.filter(s => s.status === 'completed').length} completed ·{' '}
                                        {scopeRows.filter(s => s.status === 'in_progress').length} in progress
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {editingScopeIndex !== null && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                onClick={() => {
                                                    setEditingScopeIndex(null);
                                                    resetDraft({
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
                                                    });
                                                    setScopeFormKey(k => k + 1);
                                                    setScopeDialogOpen(false);
                                                }}
                                            >
                                                Cancel
                                            </Button>
                                        )}
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            onClick={
                                                editingScopeIndex !== null
                                                    ? handleDraftSubmit(async values => {
                                                        const prog = typeof values.progress === 'number' ? values.progress : 0;
                                                        const status =
                                                            prog <= 0 ? 'not_started' : prog >= 100 ? 'completed' : 'in_progress';
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
                                                            actualMandays: calcMandays(
                                                                values.actualStartDate,
                                                                values.actualEndDate,
                                                            ),
                                                            fileBlobs: [],
                                                        };
                                                        if (editProjectId && current.serverId) {
                                                            const formData = new FormData();
                                                            formData.append('title', values.name || '');
                                                            formData.append(
                                                                'task_groups',
                                                                (values.taskGroups || []).join(','),
                                                            );
                                                            formData.append('description', values.description || '');
                                                            formData.append('assignee', values.assignee || '');
                                                            if (values.startDate) {
                                                                formData.append('planned_start_date', values.startDate);
                                                            }
                                                            if (values.endDate) {
                                                                formData.append('planned_end_date', values.endDate);
                                                            }
                                                            formData.append(
                                                                'planned_mandays',
                                                                String(calcMandays(values.startDate, values.endDate)),
                                                            );
                                                            formData.append('progress', String(prog));
                                                            formData.append('status', status);
                                                            if (values.actualStartDate) {
                                                                formData.append(
                                                                    'actual_start_date',
                                                                    values.actualStartDate,
                                                                );
                                                            }
                                                            if (values.actualEndDate) {
                                                                formData.append('actual_end_date', values.actualEndDate);
                                                            }
                                                            formData.append(
                                                                'actual_mandays',
                                                                String(
                                                                    calcMandays(
                                                                        values.actualStartDate,
                                                                        values.actualEndDate,
                                                                    ),
                                                                ),
                                                            );
                                                            try {
                                                                await authenticatedApi.put(
                                                                    `/api/projects/${editProjectId}/scopes/${current.serverId}`,
                                                                    formData,
                                                                );
                                                                update(idx, payload);
                                                                toast.success('Scope updated');
                                                            } catch (err: any) {
                                                                toast.error(
                                                                    err?.response?.data?.message ||
                                                                    err?.message ||
                                                                    'Failed to update scope',
                                                                );
                                                                return;
                                                            }
                                                        } else {
                                                            update(idx, payload);
                                                        }
                                                        setEditingScopeIndex(null);
                                                        resetDraft({
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
                                                        });
                                                        setScopeFormKey(k => k + 1);
                                                        setScopeDialogOpen(false);
                                                    })
                                                    : onAddDeliverable
                                            }
                                        >
                                            <Plus className="mr-2 h-4 w-4" />
                                            {editingScopeIndex !== null ? 'Save scope' : 'Add scope'}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        }
                    />
                )}

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
