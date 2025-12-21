'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import ModuleForm, { type ModuleFormValues } from '@/components/projectmgmt/module-form';
import { toast } from 'sonner';
import { authenticatedApi } from '@/config/api';
import type { ComboboxOption } from '@/components/ui/combobox';

const EMPTY_MODULE_FORM: ModuleFormValues = {
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
    featureKeys: [],
    checklistDetails: [],
};

type ModuleEditorClientProps = {
    projectId: string;
    moduleId?: string | null;
};

const ModuleEditorClient: React.FC<ModuleEditorClientProps> = ({ projectId, moduleId }) => {
    const router = useRouter();
    const [initialValues, setInitialValues] = useState<ModuleFormValues>(EMPTY_MODULE_FORM);
    const [loading, setLoading] = useState<boolean>(!!moduleId);
    const [assigneeChoices, setAssigneeChoices] = useState<ComboboxOption[]>([]);
    const [assigneeLoading, setAssigneeLoading] = useState(false);
    const [assigneeError, setAssigneeError] = useState<string | null>(null);
    const detailsPath = useMemo(() => `/projectmgmt/${encodeURIComponent(projectId)}`, [projectId]);

    const handleClose = () => {
        if (typeof window !== 'undefined') {
            window.close();
            setTimeout(() => {
                if (!window.closed) {
                    router.push(detailsPath);
                }
            }, 100);
            return;
        }
        router.push(detailsPath);
    };

    useEffect(() => {
        const fetchAssignees = async () => {
            try {
                setAssigneeLoading(true);
                setAssigneeError(null);
                const res: any = await authenticatedApi.get('/api/assets/employees', { params: { status: 'active', dept: 16 } });
                const data = res?.data?.data ?? res?.data ?? [];
                const list = Array.isArray(data) ? data : [data];
                const mapped: ComboboxOption[] = list
                    .filter((e: any) => e && e.ramco_id && e.full_name)
                    .map((e: any) => ({ value: String(e.ramco_id), label: String(e.full_name) }));
                setAssigneeChoices(mapped);
            } catch (err: any) {
                setAssigneeError(err?.message ?? 'Failed to load assignees');
            } finally {
                setAssigneeLoading(false);
            }
        };
        void fetchAssignees();
    }, []);

    useEffect(() => {
        if (!projectId || !moduleId) return;
        const fetchModule = async () => {
            try {
                setLoading(true);
                const res: any = await authenticatedApi.get(`/api/projects/${projectId}`);
                const data = res?.data?.data ?? res?.data;
                const modules = Array.isArray(data?.modules) ? data.modules : [];
                const module = modules.find((m: any) => String(m.id) === String(moduleId));
                if (module) {
                    const toDateOnly = (v?: string | null) => (v ? String(v).slice(0, 10) : '');
                    setInitialValues({
                        ...EMPTY_MODULE_FORM,
                        name: module.title || '',
                        description: module.description || '',
                        taskGroups: String(module.task_groups || '')
                            .split(',')
                            .map((x: string) => x.trim())
                            .filter(Boolean),
                        assignee: module.assignee || '',
                        startDate: toDateOnly(module.planned_start_date),
                        endDate: toDateOnly(module.planned_end_date),
                        actualStartDate: toDateOnly(module.actual_start_date),
                        actualEndDate: toDateOnly(module.actual_end_date),
                        progress: Number(module.progress ?? 0) || 0,
                        featureKeys: Array.isArray(module.featureKeys) ? module.featureKeys : [],
                        checklistDetails: Array.isArray(module.checklistDetails) ? module.checklistDetails : [],
                    });
                }
            } catch (err: any) {
                toast.error(err?.response?.data?.message || err?.message || 'Failed to load module');
            } finally {
                setLoading(false);
            }
        };
        void fetchModule();
    }, [projectId, moduleId]);

    const calcMandays = (startISO?: string, endISO?: string) => {
        if (!startISO || !endISO) return 0;
        const s = new Date(startISO);
        const e = new Date(endISO);
        if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime()) || e < s) return 0;
        let d = s;
        let count = 0;
        while (d <= e) {
            const day = d.getDay();
            if (day !== 0 && day !== 6) count += 1;
            d = new Date(d.getTime() + 86400000);
        }
        return count;
    };

    const handleSubmit = async (values: ModuleFormValues) => {
        if (!projectId) {
            toast.error('Project ID is required.');
            return false;
        }
        const prog = typeof values.progress === 'number' ? values.progress : 0;
        const status = prog <= 0 ? 'not_started' : prog >= 100 ? 'completed' : 'in_progress';
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
        if (Array.isArray(files)) files.forEach(file => formData.append('attachment', file));

        try {
            if (moduleId) {
                await authenticatedApi.put(`/api/projects/${projectId}/modules/${moduleId}`, formData);
                toast.success('Module updated');
            } else {
                await authenticatedApi.post(`/api/projects/${projectId}/modules`, formData);
                toast.success('Module added');
            }
            handleClose();
            return true;
        } catch (err: any) {
            const msg = err?.response?.data?.message || err?.message || 'Failed to save module';
            toast.error(msg);
            return false;
        }
    };

    const moduleStats = useMemo(() => ({ total: 0, completed: 0, inProgress: 0 }), []);

    if (loading) {
        return <div className="p-6 text-sm text-muted-foreground">Loading module...</div>;
    }

    return (
        <>
            <ModuleForm
                isOpen
                onClose={handleClose}
                onSubmit={handleSubmit}
                onCancelEdit={handleClose}
                editingModuleIndex={moduleId ? 0 : null}
                assigneeChoices={assigneeChoices}
                assigneeLoading={assigneeLoading}
                assigneeError={assigneeError}
                moduleStats={moduleStats}
                calcMandays={calcMandays}
                initialValues={initialValues}
                shouldCloseOnSubmit
            />
        </>
    );
};

export default ModuleEditorClient;
