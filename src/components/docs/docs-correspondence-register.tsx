'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CustomDataGrid, type ColumnDef } from '@/components/ui/DataGrid';
import { Inbox, Send, Clock3, Archive, Plus } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { CorrespondenceRecord, Priority, RegisterStatus } from './correspondence-tracking-data';
import CorrespondenceForm, { type CorrespondenceFormValues } from './docs-correspondence-form';

const formatDate = (value?: string) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
};

const getStatusBadge = (status: RegisterStatus) => {
    if (status === 'completed') {
        return <Badge className="bg-emerald-600 text-white hover:bg-emerald-700">Completed</Badge>;
    }
    if (status === 'in_progress') {
        return <Badge className="bg-blue-600 text-white hover:bg-blue-700">In Progress</Badge>;
    }
    return <Badge variant="secondary" className="bg-amber-500 text-white hover:bg-amber-600">Registered</Badge>;
};

const getPriorityBadge = (priority: Priority) => {
    if (priority === 'high') {
        return <Badge variant="destructive">High</Badge>;
    }
    if (priority === 'normal') {
        return <Badge variant="outline" className="border-blue-300 bg-blue-50 text-blue-700">Normal</Badge>;
    }
    return <Badge variant="outline" className="border-slate-300 bg-slate-100 text-slate-700">Low</Badge>;
};

type CorrespondenceDashboardProps = {
    records: CorrespondenceRecord[];
};

export const CorrespondenceDashboard = ({ records }: CorrespondenceDashboardProps) => {
    const now = new Date();
    const summary = useMemo(() => {
        const incoming = records.filter((r) => r.direction === 'incoming').length;
        const outgoing = records.filter((r) => r.direction === 'outgoing').length;
        const pending = records.filter((r) => r.status !== 'completed').length;
        const overdue = records.filter((r) => {
            if (!r.due_date || r.status === 'completed') return false;
            const due = new Date(r.due_date);
            return !Number.isNaN(due.getTime()) && due < now;
        }).length;
        return { incoming, outgoing, pending, overdue };
    }, [records, now]);

    const cards = [
        {
            label: 'Incoming Register',
            value: summary.incoming,
            hint: 'Mail received',
            icon: <Inbox className="h-5 w-5 text-sky-600" />,
            tone: 'bg-sky-50 border-sky-200',
        },
        {
            label: 'Outgoing Register',
            value: summary.outgoing,
            hint: 'Mail dispatched',
            icon: <Send className="h-5 w-5 text-indigo-600" />,
            tone: 'bg-indigo-50 border-indigo-200',
        },
        {
            label: 'Pending Action',
            value: summary.pending,
            hint: 'Requires follow up',
            icon: <Clock3 className="h-5 w-5 text-amber-600" />,
            tone: 'bg-amber-50 border-amber-200',
        },
        {
            label: 'Overdue',
            value: summary.overdue,
            hint: 'Past due date',
            icon: <Archive className="h-5 w-5 text-rose-600" />,
            tone: 'bg-rose-50 border-rose-200',
        },
    ];

    return (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map((card) => (
                <Card key={card.label} className={`border shadow-sm ${card.tone}`}>
                    <CardHeader className="pb-2">
                        <CardDescription className="text-slate-700">{card.label}</CardDescription>
                        <CardTitle className="text-3xl text-slate-900">{card.value}</CardTitle>
                    </CardHeader>
                    <CardContent className="flex items-center justify-between pt-0">
                        <span className="text-xs text-slate-600">{card.hint}</span>
                        {card.icon}
                    </CardContent>
                </Card>
            ))}
        </section>
    );
};

type CorrespondenceRecordsGridProps = {
    records: CorrespondenceRecord[];
    onCreateNew: () => void;
};

export const CorrespondenceRecordsGrid = ({ records, onCreateNew }: CorrespondenceRecordsGridProps) => {
    const columns = useMemo<ColumnDef<CorrespondenceRecord>[]>(
        () => [
            {
                key: 'reference_no',
                header: 'Reference No.',
                filter: 'input',
                render: (row) => <span className="font-semibold text-slate-900">{row.reference_no}</span>,
            },
            {
                key: 'subject',
                header: 'Subject',
                filter: 'input',
                render: (row) => (
                    <div className="flex flex-col gap-0.5">
                        <span className="font-medium text-slate-900">{row.subject}</span>
                        <span className="text-xs text-muted-foreground">{row.correspondent}</span>
                    </div>
                ),
            },
            {
                key: 'direction',
                header: 'Direction',
                filter: 'singleSelect',
                render: (row) =>
                    row.direction === 'incoming' ? (
                        <Badge variant="outline" className="border-sky-300 bg-sky-50 text-sky-700">Incoming</Badge>
                    ) : (
                        <Badge variant="outline" className="border-indigo-300 bg-indigo-50 text-indigo-700">Outgoing</Badge>
                    ),
            },
            {
                key: 'department',
                header: 'Department',
                filter: 'singleSelect',
            },
            {
                key: 'status',
                header: 'Status',
                filter: 'singleSelect',
                render: (row) => getStatusBadge(row.status),
            },
            {
                key: 'priority',
                header: 'Priority',
                filter: 'singleSelect',
                render: (row) => getPriorityBadge(row.priority),
            },
            {
                key: 'due_date',
                header: 'Due Date',
                render: (row) => <span className="text-sm text-muted-foreground">{formatDate(row.due_date)}</span>,
            },
            {
                key: 'owner',
                header: 'Owner',
                filter: 'input',
            },
        ],
        [],
    );

    return (
        <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                    <h2 className="text-xl font-semibold text-slate-900">Correspondence Register</h2>
                    <p className="text-sm text-muted-foreground">Incoming and outgoing mail records with status tracking.</p>
                </div>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={onCreateNew}>
                    <Plus className="mr-2 h-4 w-4" />
                    New Registry
                </Button>
            </div>
            <CustomDataGrid
                data={records}
                columns={columns}
                inputFilter={false}
                pagination
                pageSize={10}
                dataExport={false}
                columnsVisibleOption={false}
                persistenceKey="correspondenceTrackingRecords"
            />
        </section>
    );
};

type CorrespondenceRegisterProps = {
    records: CorrespondenceRecord[];
};

const FORM_STATE_STORAGE_KEY = 'docs.correspondence.form-state.v1';

const EMPTY_FORM_VALUES: CorrespondenceFormValues = {
    reference_no: '',
    sender: '',
    sender_ref: '',
    subject: '',
    correspondent: '',
    direction: 'incoming',
    department: '',
    owner: '',
    priority: 'normal',
    date_received: '',
    due_date: '',
    remarks: '',
};

const toSlug = (value: string) =>
    value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

const toDateInputValue = (value?: string) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().slice(0, 10);
};

const toFormValues = (record: CorrespondenceRecord): CorrespondenceFormValues => ({
    reference_no: record.reference_no,
    sender: record.correspondent,
    sender_ref: '',
    subject: record.subject,
    correspondent: record.correspondent,
    direction: record.direction,
    department: record.department,
    owner: record.owner,
    priority: record.priority,
    date_received: toDateInputValue(record.received_at),
    due_date: toDateInputValue(record.due_date),
    remarks: '',
});

export const CorrespondenceRegister = ({ records }: CorrespondenceRegisterProps) => {
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
    const [editSlug, setEditSlug] = useState<string | null>(null);
    const [formValues, setFormValues] = useState<CorrespondenceFormValues>(EMPTY_FORM_VALUES);
    const hydratedRef = useRef(false);
    const pathname = usePathname();
    const router = useRouter();

    const updateUrl = (mode: 'create' | 'edit' | 'closed', slug?: string) => {
        const params = new URLSearchParams(window.location.search);
        params.set('tab', 'records');
        params.delete('form');
        params.delete('edit');
        if (mode === 'create') params.set('form', 'new');
        if (mode === 'edit' && slug) params.set('edit', slug);
        const query = params.toString();
        router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    };

    const openCreateForm = () => {
        setIsFormOpen(true);
        setFormMode('create');
        setEditSlug(null);
        setFormValues(EMPTY_FORM_VALUES);
        updateUrl('create');
    };

    const openEditForm = (slug: string) => {
        const record = records.find((item) => {
            const slugCandidates = [toSlug(item.id), toSlug(item.reference_no)];
            return slugCandidates.includes(slug);
        });
        if (!record) return;
        setIsFormOpen(true);
        setFormMode('edit');
        setEditSlug(slug);
        setFormValues(toFormValues(record));
        updateUrl('edit', slug);
    };

    const closeForm = () => {
        setIsFormOpen(false);
        setFormMode('create');
        setEditSlug(null);
        setFormValues(EMPTY_FORM_VALUES);
        localStorage.removeItem(FORM_STATE_STORAGE_KEY);
        updateUrl('closed');
    };

    useEffect(() => {
        if (hydratedRef.current) return;
        hydratedRef.current = true;

        const params = new URLSearchParams(window.location.search);
        const editParam = params.get('edit');
        const formParam = params.get('form');

        if (editParam) {
            openEditForm(editParam);
            return;
        }
        if (formParam === 'new') {
            openCreateForm();
            return;
        }

        const raw = localStorage.getItem(FORM_STATE_STORAGE_KEY);
        if (!raw) return;

        try {
            const saved = JSON.parse(raw) as {
                isFormOpen?: boolean;
                mode?: 'create' | 'edit';
                slug?: string | null;
                values?: CorrespondenceFormValues;
            };
            if (!saved.isFormOpen) return;
            if (saved.mode === 'edit' && saved.slug) {
                const record = records.find((item) => {
                    const slugCandidates = [toSlug(item.id), toSlug(item.reference_no)];
                    return slugCandidates.includes(saved.slug as string);
                });
                if (!record) return;
                setIsFormOpen(true);
                setFormMode('edit');
                setEditSlug(saved.slug);
                setFormValues(saved.values ?? toFormValues(record));
                updateUrl('edit', saved.slug);
                return;
            }
            setIsFormOpen(true);
            setFormMode('create');
            setEditSlug(null);
            setFormValues(saved.values ?? EMPTY_FORM_VALUES);
            updateUrl('create');
        } catch {
            localStorage.removeItem(FORM_STATE_STORAGE_KEY);
        }
    }, [records]);

    useEffect(() => {
        if (!isFormOpen) return;
        localStorage.setItem(
            FORM_STATE_STORAGE_KEY,
            JSON.stringify({
                isFormOpen: true,
                mode: formMode,
                slug: editSlug,
                values: formValues,
            }),
        );
    }, [isFormOpen, formMode, editSlug, formValues]);

    return (
        <div className="space-y-6">
            {isFormOpen ? (
                <CorrespondenceForm
                    mode={formMode}
                    recordSlug={editSlug ?? undefined}
                    initialValues={formValues}
                    onValuesChange={setFormValues}
                    onCancel={closeForm}
                    onSubmit={closeForm}
                />
            ) : (
                <>
                    <CorrespondenceDashboard records={records} />
                    <CorrespondenceRecordsGrid records={records} onCreateNew={openCreateForm} />
                </>
            )}
        </div>
    );
};

export default CorrespondenceRegister;
