'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import ScopeForm, { type ScopeFormValues } from '@/components/projectmgmt/scope-form';
import { toast } from 'sonner';
import { authenticatedApi } from '@/config/api';
import type { ComboboxOption } from '@/components/ui/combobox';

const EMPTY_SCOPE_FORM: ScopeFormValues = {
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
};

type ScopeEditorClientProps = {
    projectId: string;
    scopeId?: string | null;
};

const ScopeEditorClient: React.FC<ScopeEditorClientProps> = ({ projectId, scopeId }) => {
    const router = useRouter();
    const [initialValues, setInitialValues] = useState<ScopeFormValues>(EMPTY_SCOPE_FORM);
    const [loading, setLoading] = useState<boolean>(!!scopeId);
    const [assigneeChoices, setAssigneeChoices] = useState<ComboboxOption[]>([]);
    const [assigneeLoading, setAssigneeLoading] = useState(false);
    const [assigneeError, setAssigneeError] = useState<string | null>(null);

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
        if (!projectId || !scopeId) return;
        const fetchScope = async () => {
            try {
                setLoading(true);
                const res: any = await authenticatedApi.get(`/api/projects/${projectId}`);
                const data = res?.data?.data ?? res?.data;
                const scopes = Array.isArray(data?.scopes) ? data.scopes : [];
                const scope = scopes.find((s: any) => String(s.id) === String(scopeId));
                if (scope) {
                    const toDateOnly = (v?: string | null) => (v ? String(v).slice(0, 10) : '');
                    setInitialValues({
                        ...EMPTY_SCOPE_FORM,
                        name: scope.title || '',
                        description: scope.description || '',
                        taskGroups: String(scope.task_groups || '')
                            .split(',')
                            .map((x: string) => x.trim())
                            .filter(Boolean),
                        assignee: scope.assignee || '',
                        startDate: toDateOnly(scope.planned_start_date),
                        endDate: toDateOnly(scope.planned_end_date),
                        actualStartDate: toDateOnly(scope.actual_start_date),
                        actualEndDate: toDateOnly(scope.actual_end_date),
                        progress: Number(scope.progress ?? 0) || 0,
                        featureKeys: Array.isArray(scope.featureKeys) ? scope.featureKeys : [],
                    });
                }
            } catch (err: any) {
                toast.error(err?.response?.data?.message || err?.message || 'Failed to load scope');
            } finally {
                setLoading(false);
            }
        };
        void fetchScope();
    }, [projectId, scopeId]);

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

    const handleSubmit = async (values: ScopeFormValues) => {
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
            if (scopeId) {
                await authenticatedApi.put(`/api/projects/${projectId}/scopes/${scopeId}`, formData);
                toast.success('Scope updated');
            } else {
                await authenticatedApi.post(`/api/projects/${projectId}/scopes`, formData);
                toast.success('Scope added');
            }
            router.push('/projectmgmt');
            if (typeof window !== 'undefined') {
                window.close();
            }
            return true;
        } catch (err: any) {
            const msg = err?.response?.data?.message || err?.message || 'Failed to save scope';
            toast.error(msg);
            return false;
        }
    };

    const scopeStats = useMemo(() => ({ total: 0, completed: 0, inProgress: 0 }), []);

    if (loading) {
        return <div className="p-6 text-sm text-muted-foreground">Loading scope...</div>;
    }

    return (
        <>
            <ScopeForm
                isOpen
                onClose={() => router.push('/projectmgmt')}
                onSubmit={handleSubmit}
                onCancelEdit={() => router.push('/projectmgmt')}
                editingScopeIndex={scopeId ? 0 : null}
                assigneeChoices={assigneeChoices}
                assigneeLoading={assigneeLoading}
                assigneeError={assigneeError}
                scopeStats={scopeStats}
                calcMandays={calcMandays}
                initialValues={initialValues}
                shouldCloseOnSubmit
            />
        </>
    );
};

export default ScopeEditorClient;
