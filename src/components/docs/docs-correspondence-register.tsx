'use client';

import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CustomDataGrid, type ColumnDef } from '@/components/ui/DataGrid';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, Pencil, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { authenticatedApi } from '@/config/api';
import type { CorrespondenceRecord, Priority, RegisterStatus } from './correspondence-tracking-data';

const formatDate = (value?: string) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
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

type WorkflowState = {
    registered: boolean;
    qa_completed: boolean;
    endorsed: boolean;
    acknowledged: boolean;
    dates: {
        registered?: string;
        qa?: string;
        endorsed?: string;
        acknowledged?: string;
    };
};

type CorrespondenceRow = CorrespondenceRecord & {
    registered_at: string | undefined;
    workflow: WorkflowState;
};

type WorkflowCellProps = {
    row: CorrespondenceRow;
    onAction: (slug: string, action: string) => void;
};

const WORKFLOW_STAGES: {
    key: string;
    label: string;
    doneKey: keyof Omit<WorkflowState, 'dates'>;
    dateKey: keyof WorkflowState['dates'];
    action: string | null;
}[] = [
    { key: 'registered',  label: 'Registered',   doneKey: 'registered',   dateKey: 'registered',   action: null },
    { key: 'qa',          label: 'QA Review',    doneKey: 'qa_completed', dateKey: 'qa',           action: 'qa_review' },
    { key: 'endorse',     label: 'Endorsement',  doneKey: 'endorsed',     dateKey: 'endorsed',     action: 'endorse' },
    { key: 'acknowledge', label: 'Acknowledged', doneKey: 'acknowledged', dateKey: 'acknowledged', action: 'acknowledge' },
];

const WorkflowCell = ({ row, onAction }: WorkflowCellProps) => {
    const slug = toSlug(row.id || row.reference_no);
    const firstPendingIdx = WORKFLOW_STAGES.findIndex((s) => !row.workflow[s.doneKey]);

    return (
        <div className="flex flex-col">
            {WORKFLOW_STAGES.map((stage, i) => {
                const done = row.workflow[stage.doneKey];
                const isActionable = !done && i === firstPendingIdx && stage.action !== null;
                const isPending = !done && i > firstPendingIdx;
                const isLast = i === WORKFLOW_STAGES.length - 1;

                return (
                    <div key={stage.key} className="flex items-start gap-2">
                        {/* dot + connector line */}
                        <div className="flex flex-col items-center">
                            {done ? (
                                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                            ) : isActionable ? (
                                <span className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full border-2 border-amber-400 bg-amber-100" />
                            ) : (
                                <span className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full border-2 border-slate-200 bg-slate-50" />
                            )}
                            {!isLast && <span className="my-0.5 w-px grow bg-slate-200" style={{ minHeight: '10px' }} />}
                        </div>

                        {/* label / action */}
                        <div className="pb-1.5">
                            {done ? (
                                <span className="flex items-center gap-1 text-xs font-medium text-emerald-600">
                                    {stage.label}
                                    {row.workflow.dates[stage.dateKey] && (
                                        <span className="font-normal text-slate-400">{formatDate(row.workflow.dates[stage.dateKey])}</span>
                                    )}
                                </span>
                            ) : isActionable ? (
                                <Button
                                    size="sm"
                                    className="h-5 px-2 text-xs bg-amber-500 text-white hover:bg-amber-600 border-0 shadow-sm"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onAction(slug, stage.action!);
                                    }}
                                >
                                    <Pencil className="h-3 w-3" />
                                    {stage.label}
                                </Button>
                            ) : (
                                <span className={`text-xs ${isPending ? 'text-slate-300' : 'text-slate-400'}`}>
                                    {stage.label}
                                </span>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

// ─── Dashboard ───────────────────────────────────────────────────────────────

type CorrespondenceDashboardProps = {
    records: CorrespondenceRecord[];
};

export const CorrespondenceDashboard = ({ records }: CorrespondenceDashboardProps) => {
    const now = new Date();
    const summary = useMemo(() => {
        const thisMonth = now.getMonth();
        const thisYear = now.getFullYear();

        const totalThisMonth = records.filter((r) => {
            const dateStr = r.received_at ?? r.sent_at;
            if (!dateStr) return false;
            const date = new Date(dateStr);
            return !Number.isNaN(date.getTime()) && date.getMonth() === thisMonth && date.getFullYear() === thisYear;
        }).length;

        const pendingQA = records.filter((r) => r.status === 'registered').length;
        const pendingEndorsement = records.filter((r) => r.status === 'in_progress').length;
        const actionRequired = records.filter((r) => {
            if (r.status === 'completed') return false;
            if (r.priority === 'high') return true;
            if (r.due_date) {
                const due = new Date(r.due_date);
                return !Number.isNaN(due.getTime()) && due < now;
            }
            return false;
        }).length;

        return { totalThisMonth, pendingQA, pendingEndorsement, actionRequired };
    }, [records, now]);

    const stats = [
        { label: 'Total this month',     value: summary.totalThisMonth,   valueClass: 'text-blue-500' },
        { label: 'Pending QA review',    value: summary.pendingQA,        valueClass: 'text-amber-500' },
        { label: 'Pending endorsement',  value: summary.pendingEndorsement, valueClass: 'text-purple-500' },
        { label: 'Action required',      value: summary.actionRequired,   valueClass: 'text-rose-500' },
    ];

    return (
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat) => (
                <div key={stat.label} className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                    <p className={`mt-1 text-2xl font-bold ${stat.valueClass}`}>{stat.value}</p>
                </div>
            ))}
        </section>
    );
};

// ─── Records Grid ─────────────────────────────────────────────────────────────

type CorrespondenceRecordsGridProps = {
    records: CorrespondenceRow[];
    onCreateNew: () => void;
    onEditRecord: (slug: string) => void;
    onWorkflowAction: (slug: string, action: string) => void;
};

export const CorrespondenceRecordsGrid = ({
    records,
    onCreateNew,
    onEditRecord,
    onWorkflowAction,
}: CorrespondenceRecordsGridProps) => {
    const [statusFilter, setStatusFilter] = useState('all');
    const [priorityFilter, setPriorityFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');
    const [directionFilter, setDirectionFilter] = useState('all');

    const filteredRecords = useMemo(() => {
        return records.filter((r) => {
            if (statusFilter !== 'all' && r.status !== statusFilter) return false;
            if (priorityFilter !== 'all' && r.priority !== priorityFilter) return false;
            if (typeFilter !== 'all' && r.medium !== typeFilter) return false;
            if (directionFilter !== 'all' && r.direction !== directionFilter) return false;
            return true;
        });
    }, [records, statusFilter, priorityFilter, typeFilter, directionFilter]);

    const columns = useMemo<ColumnDef<CorrespondenceRow>[]>(
        () => [
            {
                key: 'reference_no',
                header: 'Reference No.',
                render: (row) => <span className="font-semibold text-slate-900">{row.reference_no}</span>,
            },
            {
                key: 'registered_at',
                header: 'Register Date',
                render: (row) => (
                    <span className="text-sm text-muted-foreground">{formatDate(row.registered_at)}</span>
                ),
            },
            {
                key: 'direction',
                header: 'Direction',
                render: (row) =>
                    row.direction === 'incoming' ? (
                        <Badge variant="outline" className="border-sky-300 bg-sky-50 text-sky-700">Incoming</Badge>
                    ) : (
                        <Badge variant="outline" className="border-indigo-300 bg-indigo-50 text-indigo-700">Outgoing</Badge>
                    ),
            },
            {
                key: 'priority',
                header: 'Priority',
                render: (row) => getPriorityBadge(row.priority),
            },
            {
                key: 'subject',
                header: 'Subject',
                render: (row) => <span className="font-medium text-slate-900">{row.subject}</span>,
            },
            {
                key: 'correspondent',
                header: 'Sender',
                render: (row) => <span className="text-sm text-slate-700">{row.correspondent}</span>,
            },
            {
                key: 'department',
                header: 'Letter Type',
                render: (row) => <span className="text-sm text-slate-700">{row.department}</span>,
            },
            {
                key: 'status',
                header: 'Status',
                render: (row) => getStatusBadge(row.status),
            },
            {
                key: 'workflow',
                header: 'Workflow',
                render: (row) => <WorkflowCell row={row} onAction={onWorkflowAction} />,
            },
        ],
        [onWorkflowAction],
    );

    return (
        <section className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-8 w-auto min-w-30 text-sm">
                        <SelectValue placeholder="All status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All status</SelectItem>
                        <SelectItem value="registered">Registered</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                </Select>

                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                    <SelectTrigger className="h-8 w-auto min-w-30 text-sm">
                        <SelectValue placeholder="All priority" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All priority</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                </Select>

                <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="h-8 w-auto min-w-30 text-sm">
                        <SelectValue placeholder="All types" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All types</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="letter">Letter</SelectItem>
                        <SelectItem value="courier">Courier</SelectItem>
                        <SelectItem value="memo">Memo</SelectItem>
                    </SelectContent>
                </Select>

                <Select value={directionFilter} onValueChange={setDirectionFilter}>
                    <SelectTrigger className="h-8 w-auto min-w-30 text-sm">
                        <SelectValue placeholder="All direction" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All direction</SelectItem>
                        <SelectItem value="incoming">Incoming</SelectItem>
                        <SelectItem value="outgoing">Outgoing</SelectItem>
                    </SelectContent>
                </Select>

                <div className="ml-auto">
                    <Button size="sm" variant="default" onClick={onCreateNew}>
                        <Plus className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <CustomDataGrid
                data={filteredRecords}
                columns={columns}
                inputFilter={false}
                pagination
                pageSize={10}
                dataExport={false}
                columnsVisibleOption={false}
                persistenceKey="correspondenceTrackingRecords"
                onRowDoubleClick={(row) => onEditRecord(toSlug(row.id || row.reference_no))}
            />
        </section>
    );
};

// ─── API Types & Mapping ──────────────────────────────────────────────────────

type ApiCorrespondenceRow = {
    id: number;
    reference_no: string;
    date_received: string | null;
    sender: string | null;
    subject: string;
    direction: 'incoming' | 'outgoing';
    registered_at: string | null;
    registered_by: string | null;
    qa_status: string | null;
    qa_reviewed_at?: string | null;
    qa_reviewed_by: string | null;
    endorsed_at?: string | null;
    acknowledged_at?: string | null;
    letter_type: string | null;
    category: string | null;
    priority: 'low' | 'normal' | 'high';
    recipients_count?: number | null;
    workflow_status?: {
        qa_completed?: boolean;
        department_head_action_pending?: number;
        department_head_action_completed?: number;
        section_head_action_pending?: number;
        section_head_action_completed?: number;
        endorsed?: boolean;
        overall_status?: RegisterStatus | null;
    } | null;
    created_at?: string | null;
    updated_at?: string | null;
};

type CorrespondenceApiResponse = {
    data?: ApiCorrespondenceRow[];
    pagination?: {
        page?: number;
        limit?: number;
        total?: number;
        pages?: number;
    };
};

type CorrespondenceQueryParams = {
    direction?: 'incoming' | 'outgoing';
    priority?: 'low' | 'normal' | 'high';
    category?: string;
    letter_type?: string;
    department?: string;
    search?: string;
    date_from?: string;
    date_to?: string;
    limit?: number;
    offset?: number;
};

const toSlug = (value: string) =>
    value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

const toRecordStatus = (row: ApiCorrespondenceRow): RegisterStatus => {
    if (row.workflow_status?.overall_status === 'completed') return 'completed';
    if (row.workflow_status?.overall_status === 'in_progress') return 'in_progress';
    return 'registered';
};

const toRecordPriority = (value: ApiCorrespondenceRow['priority']): Priority => {
    if (value === 'high' || value === 'normal' || value === 'low') return value;
    return 'normal';
};

const mapApiRowToRecord = (row: ApiCorrespondenceRow): CorrespondenceRow => ({
    id: String(row.id),
    reference_no: row.reference_no,
    subject: row.subject || '-',
    direction: row.direction,
    correspondent: row.sender || '-',
    department: row.letter_type || row.category || '-',
    medium: 'letter',
    received_at: row.date_received || undefined,
    due_date: undefined,
    status: toRecordStatus(row),
    priority: toRecordPriority(row.priority),
    owner: row.registered_by || '-',
    registered_at: row.registered_at || undefined,
    workflow: {
        registered: !!row.registered_at,
        qa_completed: !!(row.workflow_status?.qa_completed || row.qa_status === 'approved'),
        endorsed: !!(row.workflow_status?.endorsed),
        acknowledged:
            ((row.workflow_status?.department_head_action_completed ?? 0) > 0 ||
                (row.workflow_status?.section_head_action_completed ?? 0) > 0),
        dates: {
            registered: row.registered_at || undefined,
            qa: row.qa_reviewed_at || undefined,
            endorsed: row.endorsed_at || undefined,
            acknowledged: row.acknowledged_at || undefined,
        },
    },
});

// ─── Root Component ───────────────────────────────────────────────────────────

export const CorrespondenceRegister = () => {
    const router = useRouter();
    const [records, setRecords] = useState<CorrespondenceRow[]>([]);
    const [loading, setLoading] = useState(false);

    const openCreatePage = () => router.push('/docs/correspondence/new');
    const openEditPage = (slug: string) => router.push(`/docs/correspondence/${slug}/edit`);
    const handleWorkflowAction = (slug: string, action: string) =>
        router.push(`/docs/correspondence/${slug}/edit?action=${action}`);

    useEffect(() => {
        const fetchRecords = async () => {
            setLoading(true);
            try {
                const params: CorrespondenceQueryParams = { limit: 200, offset: 0 };
                const response = await authenticatedApi.get('/api/media/correspondence', { params });
                const payload = response.data as CorrespondenceApiResponse;
                const rows = Array.isArray(payload?.data) ? payload.data : [];
                setRecords(rows.map(mapApiRowToRecord));
            } catch (error) {
                console.error('Failed to fetch correspondence records:', error);
                setRecords([]);
            } finally {
                setLoading(false);
            }
        };

        fetchRecords();
    }, []);

    return (
        <div className="space-y-6">
            {loading && <p className="text-sm text-muted-foreground">Loading correspondence records...</p>}
            <CorrespondenceDashboard records={records} />
            <CorrespondenceRecordsGrid
                records={records}
                onCreateNew={openCreatePage}
                onEditRecord={openEditPage}
                onWorkflowAction={handleWorkflowAction}
            />
        </div>
    );
};

export default CorrespondenceRegister;
