'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { differenceInCalendarDays, isValid as isDateValid, parseISO, addDays, startOfWeek, endOfWeek, format as formatDate } from 'date-fns';
import type { DeliverableType, ProjectDeliverableAttachment, ProjectFormValues, ProjectTag } from './types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { type ComboboxOption } from '@/components/ui/combobox';
import { Plus, Pencil, ClipboardList as ClipboardListIcon } from 'lucide-react';
import ExcelJS from 'exceljs';
import { authenticatedApi } from '@/config/api';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import GanttChart, { type GanttTask } from './ModuleTimelineView';
import ModulesTableView, { type ModuleRow } from './ModulesTableView';
import BurnupChartView from './ModuleBurnupChartView';
import { TASK_GROUP_OPTIONS } from './module-form';

type ProjectDetailsProps = {
    onSubmit: (values: ProjectFormValues) => void;
    assignorOptions: string[];
    assigneeOptions: string[];
    availableTags: ProjectTag[];
    editProjectId?: string;
};


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

const createEmptyModule = () => ({
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

const BASE_FORM_VALUES = {
    contract: '',
    name: '',
    description: '',
    projectType: undefined,
    projectCategory: 'new' as const,
    assignor: '',
    assignee: '',
    assignmentRole: 'developer' as const,
    startDate: '',
    dueDate: '',
    percentComplete: 10,
};

const ProjectDetails: React.FC<ProjectDetailsProps> = ({ onSubmit, assignorOptions, assigneeOptions, availableTags, editProjectId }) => {
    const router = useRouter();
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
    const [projectFormVisible, setProjectFormVisible] = useState(false);

    // Shared Excel export function
    const exportGanttExcel = async () => {
        try {
            const workbook = new ExcelJS.Workbook();
            const ws = workbook.addWorksheet('Modules');
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
            moduleRows.forEach((r, i) => {
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
            const wsG = workbook.addWorksheet('Timeline Chart');
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
            a.download = `project-modules-${Date.now()}.xlsx`;
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
                void syncProjectMetaFromScopes();
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
        if (!editProjectId) return;
        const current: any = (watchDeliverables ?? [])[index] || {};
        if (!current?.serverId) {
            toast.error('Scope must be saved before editing in a new tab.');
            return;
        }
        openScopeEditor(editProjectId, String(current.serverId));
    };

    // Handler for deleting a scope from table view
    const handleTableDelete = async (index: number, serverId?: string) => {
        if (editProjectId && serverId) {
            try {
                setDeletingScopeId(String(serverId));
                await authenticatedApi.delete(`/api/projects/${editProjectId}/scopes/${serverId}`);
                remove(index);
                toast.success('Scope removed');
                void syncProjectMetaFromScopes();
            } catch (err: any) {
                const msg = err?.response?.data?.message || err?.message || 'Failed to remove scope';
                toast.error(msg);
            } finally {
                setDeletingScopeId(null);
            }
        } else {
            remove(index);
            void syncProjectMetaFromScopes();
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
                    contract: data.contract || data.code || '',
                    name: data.name || '',
                    description: data.description || '',
                    projectType: (data.projectType as any) || undefined,
                    projectCategory: (data.project_category as any) || 'new',
                    startDate: toDateOnly(data.start_date),
                    dueDate: toDateOnly(data.due_date),
                    percentComplete: Number(data.overall_progress ?? 0) || 0,
                    deliverables,
                });
                // Also set API-aligned extras used during submit
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

    const computeTimelineFromDeliverables = (items: Array<{ startDate?: string; endDate?: string }> | undefined | null) => {
        const valid = (items ?? []).filter(d => d?.startDate && d?.endDate) as Array<{ startDate: string; endDate: string }>;
        if (!valid.length) return { startDate: '', endDate: '' };
        const sortedByStart = [...valid].sort((a, b) => a.startDate.localeCompare(b.startDate));
        const sortedByEnd = [...valid].sort((a, b) => a.endDate.localeCompare(b.endDate));
        return { startDate: sortedByStart[0].startDate, endDate: sortedByEnd[sortedByEnd.length - 1].endDate };
    };

    const timeline = useMemo(
        () => computeTimelineFromDeliverables(watchDeliverables as any[] | undefined),
        [watchDeliverables],
    );

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

    // Build DataGrid rows for modules
    const moduleRows: ModuleRow[] = useMemo(() => {
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
            } as ModuleRow;
        });
    }, [deliverableFields, watchDeliverables, assigneeChoices]);

    const moduleStats = useMemo(
        () => ({
            total: moduleRows.length,
            completed: moduleRows.filter(s => s.status === 'completed').length,
            inProgress: moduleRows.filter(s => s.status === 'in_progress').length,
        }),
        [moduleRows],
    );

    const openScopeEditor = (projectId: string, scopeId?: string) => {
        const url = scopeId
            ? `/projectmgmt/scope-editor?projectId=${encodeURIComponent(projectId)}&scopeId=${encodeURIComponent(scopeId)}`
            : `/projectmgmt/scope-editor?projectId=${encodeURIComponent(projectId)}`;
        if (typeof window !== 'undefined') {
            window.open(url, '_blank', 'noopener,noreferrer');
        }
    };

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
            contract: values.contract,
            name: values.name,
            description: values.description,
            project_category: values.projectCategory,
            start_date: startDate,
            due_date: dueDate,
            priority: (watch as any)('priority') ?? 'medium',
            overall_progress: overallProgress,
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
        if (apiJson.contract && apiJson.contract.trim()) {
            formData.append('contract', apiJson.contract.trim());
        }
        formData.append('name', apiJson.name);
        if (apiJson.description) formData.append('description', apiJson.description);
        formData.append('project_category', apiJson.project_category);
        if (apiJson.start_date) formData.append('start_date', apiJson.start_date);
        if (apiJson.due_date) formData.append('due_date', apiJson.due_date);
        formData.append('priority', apiJson.priority);
        formData.append('overall_progress', String(apiJson.overall_progress));
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
                setProjectFormVisible(false);
                setSuccessInfo({ code: (values.contract || '').trim(), name: values.name });
                setSuccessOpen(true);
            } else {
                const response = await authenticatedApi.post('/api/projects', formData);
                const newProjectId = (response.data as any)?.id || (response.data as any)?.project_id;
                toast.success('Project created');
                setSuccessInfo({ code: (values.contract || '').trim(), name: values.name });
                setSuccessOpen(true);
                // Navigate to the new project's details page
                if (newProjectId) {
                    setTimeout(() => {
                        router.push(`/projectmgmt/${newProjectId}`);
                    }, 1000);
                } else {
                    reset({
                        ...BASE_FORM_VALUES,
                        projectType: values.projectType,
                        projectCategory: values.projectCategory,
                        assignmentRole: values.assignmentRole,
                        deliverables: [],
                    });
                }
            }
        } catch (err: any) {
            const msg = err?.response?.data?.message || err?.message || 'Failed to create project';
            toast.error(msg);
        }
    };

    const syncProjectMetaFromScopes = async () => {
        if (!editProjectId) return;
        const formValues = getValues();
        const allDeliverables = ((formValues as any).deliverables || []) as any[];
        const tl = computeTimelineFromDeliverables(allDeliverables);
        const overall = computeOverallProgress(allDeliverables);
        setValue('percentComplete', overall, { shouldDirty: true });

        const startDate = tl.startDate || formValues.startDate || '';
        const dueDate = tl.endDate || formValues.dueDate || '';

        const formData = new FormData();
        if (formValues.contract && formValues.contract.trim()) {
            formData.append('contract', formValues.contract.trim());
        }
        formData.append('name', formValues.name || '');
        if (formValues.description) formData.append('description', formValues.description);
        formData.append('project_category', formValues.projectCategory || 'new');
        if (startDate) formData.append('start_date', startDate);
        if (dueDate) formData.append('due_date', dueDate);
        formData.append('priority', (watch as any)('priority') ?? 'medium');
        formData.append('overall_progress', String(overall));

        try {
            await authenticatedApi.put(`/api/projects/${editProjectId}`, formData);
        } catch {
            // Best-effort background sync; errors are non-blocking for scope ops
        }
    };

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
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h1 className="text-lg font-semibold text-slate-800">Project Details</h1>
            </div>

            <form onSubmit={handleSubmit(submitHandler)} className="flex flex-col gap-6">
                {/* Scopes View Card */}
                <Card className="order-1">
                    <CardHeader className="space-y-4">
                        <div className="flex flex-col gap-2">
                            <div className="flex items-start gap-3">
                                <div className="h-10 w-10 rounded-lg bg-linear-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white">
                                    <ClipboardListIcon className="h-6 w-6" strokeWidth={2.2} />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-lg text-slate-800">
                                                {watch('name') || 'Untitled Project'}
                                            </h3>
                                            {editProjectId && (
                                                <Button
                                                    type="button"
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-8 w-8 text-amber-500 hover:text-amber-600"
                                                    onClick={() => setProjectFormVisible(true)}
                                                    aria-label="Edit project details"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                        {watch('contract') && (
                                            <p className="text-sm text-slate-500">{watch('contract')}</p>
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
                        </div>

                        {/* View Controls - hidden when form is visible during edit */}
                        {(!editProjectId || !projectFormVisible) && (
                            <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex flex-wrap items-center gap-2">
                                <Button
                                    type="button"
                                    variant={viewMode === 'table' ? 'default' : 'outline'}
                                    size="sm"
                                    disabled={moduleRows.length === 0}
                                    onClick={() => setViewMode('table')}
                                >
                                    Table View
                                </Button>
                                <Button
                                    type="button"
                                    variant={viewMode === 'gantt' ? 'default' : 'outline'}
                                    size="sm"
                                    disabled={moduleRows.length === 0}
                                    onClick={() => setViewMode('gantt')}
                                >
                                    Timeline Chart
                                </Button>
                                <Button
                                    type="button"
                                    variant={viewMode === 'burnup' ? 'default' : 'outline'}
                                    size="sm"
                                    disabled={moduleRows.length === 0}
                                    onClick={() => setViewMode('burnup')}
                                >
                                    Burnup Chart
                                </Button>
                                <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    onClick={exportGanttExcel}
                                >
                                    Export Timeline (Excel)
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

                            {editProjectId && (
                                <div className="flex items-center gap-2">
                                    <p className="text-sm">
                                        {moduleRows.length === 0 ? 'No modules yet.' : 'Add more modules.'}
                                    </p>
                                    <Button
                                        type="button"
                                        variant="default"
                                        size="sm"
                                        onClick={() => {
                                            if (!editProjectId) return;
                                            openScopeEditor(editProjectId);
                                        }}
                                    >
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </div>
                            )}
                            </div>
                        )}
                    </CardHeader>

                    <CardContent>
                        {/* Project registration fields - shown in create mode or when editing and form is visible */}
                        {(!editProjectId || projectFormVisible) && (
                            <div className="mb-6 rounded-lg border border-border/60 bg-stone-50 p-4 space-y-6">
                                <div>
                                    <h3 className="text-sm font-medium">Register Project</h3>
                                    <p className="text-xs text-muted-foreground">
                                        Capture core delivery details and planned scopes before saving.
                                    </p>
                                </div>
                                <div className="grid gap-4 md:grid-cols-3">
                                    <div className="space-y-2">
                                        <Label htmlFor="projectType_inline">Project Type</Label>
                                        <Controller
                                            control={control}
                                            name="projectType"
                                            render={({ field }) => (
                                                <Select value={field.value || ''} onValueChange={field.onChange}>
                                                    <SelectTrigger id="projectType_inline" className='w-full'>
                                                        <SelectValue placeholder="Select type" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="claimable">Claimable</SelectItem>
                                                        <SelectItem value="internal">Internal</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            )}
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
                                            <Label htmlFor="code_inline">Contract (optional)</Label>
                                            <Input id="code_inline" className="uppercase" placeholder="e.g. OPS-2024-08" {...register('contract')} />
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
                                            <Label>Project Category</Label>
                                            <Controller
                                                control={control}
                                                name="projectCategory"
                                                rules={{ required: 'Project category is required' }}
                                                render={({ field }) => (
                                                    <Select value={field.value} onValueChange={field.onChange}>
                                                        <SelectTrigger className="w-full">
                                                            <SelectValue placeholder="Select category" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="new">New Project</SelectItem>
                                                            <SelectItem value="enhancement">Enhancement</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                )}
                                            />
                                            {errors.projectCategory && <p className="text-sm text-destructive">{errors.projectCategory.message}</p>}
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

                                    <div className="flex justify-end gap-2">
                                        {editProjectId && projectFormVisible && (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => setProjectFormVisible(false)}
                                            >
                                                Cancel
                                            </Button>
                                        )}
                                        {editProjectId && projectFormVisible && (
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
                            </div>
                        )}

                        {/* Content based on view mode - hidden when form is visible during edit */}
                        {(!editProjectId || !projectFormVisible) && (
                            <>
                        {moduleRows.length === 0 ? null : viewMode === 'table' ? (
                            <ModulesTableView
                                moduleRows={moduleRows}
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
                                projectCode={watch('contract') || undefined}
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
                                        if (!editProjectId) return;
                                        const current: any = (watchDeliverables ?? [])[index] || {};
                                        if (!current?.serverId) {
                                            toast.error('Scope must be saved before editing in a new tab.');
                                            return;
                                        }
                                        openScopeEditor(editProjectId, String(current.serverId));
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
                            </>
                        )}
                    </CardContent>

                    {/* Footer Stats - displayed on all views */}
                    {moduleRows.length > 0 && timeline.startDate && timeline.endDate && (
                        <CardFooter className="bg-linear-to-r from-slate-50 to-gray-50 text-sm">
                            <div className="flex justify-between items-center text-slate-600 w-full">
                                <div className="flex items-center gap-6">
                                    <span className="font-medium">{moduleRows.length} modules total</span>
                                    <span>{moduleRows.filter(s => s.status === 'completed').length} completed</span>
                                    <span>{moduleRows.filter(s => s.status === 'in_progress').length} in progress</span>
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
                                            {moduleRows.length > 0 ? Math.round(moduleRows.reduce((sum, s) => sum + (s.progress || 0), 0) / moduleRows.length) : 0}%
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardFooter>
                    )}
                </Card>
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

export default ProjectDetails;
