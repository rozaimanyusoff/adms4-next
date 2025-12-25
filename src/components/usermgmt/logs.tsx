'use client';
import React from 'react';
import { AuthContext } from '@store/AuthContext';
import { authenticatedApi } from '@/config/api';
import { CustomDataGrid, ColumnDef } from '@components/ui/DataGrid';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, RefreshCcw, Download, Archive } from 'lucide-react';
import { toast } from 'sonner';

type LogEntry = {
    id?: number | string;
    action?: string;
    status?: string;
    ip?: string;
    user_agent?: string;
    details?: string | null;
    created_at?: string;
    timestamp?: string;
    level?: string;
    user?: { id?: number | string; name?: string; username?: string };
    userId?: string | number;
};

type SummaryStats = {
    total?: number;
    errors?: number;
    warnings?: number;
    suspicious?: number;
    users?: number;
    totalEntries?: number;
    dateRange?: { from?: string; to?: string; days?: number };
    byAction?: Record<string, { success?: number; fail?: number; total?: number; successRate?: number }>;
    byStatus?: { success?: number; fail?: number };
};

type LogFile = {
    filename: string;
    size?: number;
    updated_at?: string;
    entries?: number;
    date?: string;
    created?: string;
    modified?: string;
};

type SuspiciousActivity = {
    userId?: number | string;
    action?: string;
    failCount?: number;
    ipCount?: number;
    ips?: string[];
    lastAttempt?: string;
    details?: any[];
};

const formatDateTime = (value?: string) => {
    if (!value) return '-';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString();
};

const mapLog = (log: any): Required<LogEntry> & { created_at: string } => {
    return {
        id: log.id ?? log._id ?? log.uid ?? Math.random(),
        action: log.action ?? log.event ?? log.message ?? '-',
        status: log.status ?? log.level ?? '-',
        ip: log.ip ?? log.ip_address ?? '-',
        user_agent: log.user_agent ?? log.ua ?? '',
        details: log.details ?? log.meta ?? null,
        created_at: log.created_at ?? log.timestamp ?? log.time ?? new Date().toISOString(),
        timestamp: log.timestamp ?? log.created_at ?? '',
        level: log.level ?? log.status ?? '',
        user: log.user ?? { id: log.userId ?? log.user_id, name: log.user_name ?? log.username ?? '' },
        userId: log.userId ?? log.user_id ?? log.user?.id ?? '',
    };
};

const CLogs: React.FC = () => {
    const authContext = React.useContext(AuthContext);
    const user = authContext?.authData?.user;

    const [logs, setLogs] = React.useState<LogEntry[]>([]);
    const [suspiciousLogs, setSuspiciousLogs] = React.useState<SuspiciousActivity[]>([]);
    const [files, setFiles] = React.useState<LogFile[]>([]);
    const [fileTotal, setFileTotal] = React.useState<number | null>(null);
    const [summary, setSummary] = React.useState<SummaryStats>({});
    const [loadingLogs, setLoadingLogs] = React.useState(false);
    const [loadingSuspicious, setLoadingSuspicious] = React.useState(false);
    const [loadingFiles, setLoadingFiles] = React.useState(false);
    const [loadingSummary, setLoadingSummary] = React.useState(false);

    const [dateFrom, setDateFrom] = React.useState<string>('');
    const [dateTo, setDateTo] = React.useState<string>('');
    const [userFilter, setUserFilter] = React.useState<string>('');
    const [actionFilter, setActionFilter] = React.useState<string>('');
    const [statusFilter, setStatusFilter] = React.useState<string>('');

    const logColumns: ColumnDef<any>[] = [
        { key: 'row', header: '#', render: row => row.row },
        { key: 'created_at', header: 'Date/Time', sortable: true, render: row => formatDateTime(row.created_at) },
        { key: 'action', header: 'Action', sortable: true, filter: 'input' },
        { key: 'status', header: 'Status', sortable: true, filter: 'singleSelect' },
        { key: 'ip', header: 'IP', sortable: true },
        { key: 'user', header: 'User', sortable: true, render: row => row.user?.name || row.user?.username || row.userId || '-' },
        { key: 'details', header: 'Details', render: row => <span className="truncate max-w-xs inline-block align-middle" title={row.details || ''}>{row.details || '-'}</span> },
        { key: 'user_agent', header: 'User Agent', render: row => <span className="truncate max-w-xs inline-block align-middle" title={row.user_agent || ''}>{row.user_agent || '-'}</span> },
    ];

    const suspiciousColumns: ColumnDef<any>[] = [
        { key: 'row', header: '#', render: row => row.row },
        { key: 'userId', header: 'User', render: row => row.userId ?? '-' },
        { key: 'action', header: 'Action', render: row => row.action ?? '-' },
        { key: 'failCount', header: 'Failed Attempts', render: row => row.failCount ?? '-' },
        { key: 'ipCount', header: 'IPs', render: row => row.ipCount ?? '-' },
        { key: 'lastAttempt', header: 'Last Attempt', render: row => formatDateTime(row.lastAttempt) },
        { key: 'ips', header: 'IPs List', render: row => (row.ips || []).join(', ') || '-' },
    ];

    const fileColumns: ColumnDef<any>[] = [
        { key: 'row', header: '#', render: row => row.row },
        { key: 'filename', header: 'Filename', render: row => row.filename },
        { key: 'entries', header: 'Entries', render: row => row.entries ?? '-' },
        { key: 'size', header: 'Size (bytes)', render: row => row.size ?? '-' },
        { key: 'date', header: 'Date', render: row => row.date ?? '-' },
        { key: 'created', header: 'Created', render: row => formatDateTime(row.created ?? row.updated_at) },
        { key: 'modified', header: 'Modified', render: row => formatDateTime(row.modified ?? row.updated_at) },
        {
            key: 'download',
            header: 'Download',
            render: row => (
                <Button
                    size="sm"
                    variant="outline"
                    className="gap-1"
                    onClick={() => window.open(`/api/admin/logs/download/${encodeURIComponent(row.filename)}`, '_blank')}
                >
                    <Download size={14} /> Download
                </Button>
            ),
        },
    ];

    const withRows = (items: any[]) => items.map((item, idx) => ({ ...item, row: idx + 1 }));

    const fetchLogs = React.useCallback(async () => {
        if (!dateFrom || !dateTo) {
            toast.error('Please select start and end dates');
            return;
        }
        setLoadingLogs(true);
        try {
            const url = '/api/admin/logs/by-date-range';
            const params: any = {
                startDate: dateFrom,
                endDate: dateTo,
            };
            if (userFilter) params.userId = userFilter;
            if (actionFilter) params.action = actionFilter;
            if (statusFilter) params.status = statusFilter;
            const res = await authenticatedApi.get<any>(url, { params });
            const payload = Array.isArray(res.data?.data?.logs)
                ? res.data.data.logs
                : (Array.isArray(res.data?.logs) ? res.data.logs : (Array.isArray(res.data) ? res.data : []));
            const mapped = payload.map(mapLog);
            setLogs(withRows(mapped));
        } catch (err) {
            toast.error('Failed to load logs');
            setLogs([]);
        } finally {
            setLoadingLogs(false);
        }
    }, [actionFilter, dateFrom, dateTo, statusFilter, userFilter]);

    const fetchSuspicious = React.useCallback(async () => {
        setLoadingSuspicious(true);
        try {
            const res = await authenticatedApi.get<any>('/api/admin/logs/suspicious');
            const payload = Array.isArray(res.data?.data?.activities)
                ? res.data.data.activities
                : (Array.isArray(res.data?.activities) ? res.data.activities : []);
            setSuspiciousLogs(withRows(payload));
        } catch {
            toast.error('Failed to load suspicious logs');
            setSuspiciousLogs([]);
        } finally {
            setLoadingSuspicious(false);
        }
    }, []);

    const fetchSummary = React.useCallback(async () => {
        setLoadingSummary(true);
        try {
            const res = await authenticatedApi.get<any>('/api/admin/logs/summary');
            setSummary(res.data?.data ?? res.data ?? {});
        } catch {
            setSummary({});
        } finally {
            setLoadingSummary(false);
        }
    }, []);

    const fetchFiles = React.useCallback(async () => {
        setLoadingFiles(true);
        try {
            const res = await authenticatedApi.get<any>('/api/admin/logs/files');
            const payload = Array.isArray(res.data?.data?.files)
                ? res.data.data.files
                : (Array.isArray(res.data?.files) ? res.data.files : []);
            const total = res.data?.data?.totalFiles ?? res.data?.totalFiles ?? null;
            setFileTotal(total);
            setFiles(withRows(payload));
        } catch {
            setFiles([]);
            setFileTotal(null);
        } finally {
            setLoadingFiles(false);
        }
    }, []);

    React.useEffect(() => {
        const today = new Date();
        const weekAgo = new Date(today.getTime() - 6 * 24 * 3600 * 1000);
        const fmt = (d: Date) => d.toISOString().slice(0, 10);
        setDateFrom(fmt(weekAgo));
        setDateTo(fmt(today));
    }, []);

    React.useEffect(() => {
        fetchLogs();
        fetchSuspicious();
        fetchSummary();
        fetchFiles();
    }, [fetchLogs, fetchFiles, fetchSummary, fetchSuspicious]);

    const handleArchive = async () => {
        try {
            const payload = dateFrom ? { before: dateFrom } : {};
            await authenticatedApi.post('/api/admin/logs/archive', payload);
            toast.success('Archive request submitted');
            fetchFiles();
        } catch {
            toast.error('Failed to archive logs');
        }
    };

    return (
        <div className="mt-4 space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold">System Logs</h2>
                <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" className="gap-1" onClick={fetchLogs} disabled={loadingLogs}>
                        {loadingLogs ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                        Refresh
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1" onClick={handleArchive}>
                        <Archive size={14} /> Archive old logs
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader className="pb-2">
                    <CardTitle>Filters</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 items-end">
                    <div className="flex flex-col gap-1">
                        <label className="text-sm font-medium">From</label>
                        <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-sm font-medium">To</label>
                        <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-sm font-medium">User ID</label>
                        <Input placeholder="e.g. 000123" value={userFilter} onChange={e => setUserFilter(e.target.value)} />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-sm font-medium">Action</label>
                        <select
                            className="border rounded px-2 py-2 text-sm"
                            value={actionFilter}
                            onChange={e => setActionFilter(e.target.value)}
                        >
                            <option value="">Any</option>
                            <option value="login">login</option>
                            <option value="logout">logout</option>
                            <option value="register">register</option>
                            <option value="activate">activate</option>
                            <option value="reset_password">reset_password</option>
                        </select>
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-sm font-medium">Status</label>
                        <select
                            className="border rounded px-2 py-2 text-sm"
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value)}
                        >
                            <option value="">Any</option>
                            <option value="success">success</option>
                            <option value="fail">fail</option>
                        </select>
                    </div>
                    <div className="flex gap-2">
                        <Button className="flex-1" onClick={fetchLogs} disabled={loadingLogs}>Apply</Button>
                        <Button
                            variant="outline"
                            className="flex-1"
                            onClick={() => { setUserFilter(''); setActionFilter(''); setStatusFilter(''); fetchLogs(); }}
                            disabled={loadingLogs}
                        >
                            Clear
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="pb-2">
                    <CardTitle>Summary</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-4 text-sm">
                    {loadingSummary ? (
                        <div className="flex items-center gap-2 text-gray-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading summary...</div>
                    ) : (
                        <>
                            <div>Total Entries: <strong>{summary.totalEntries ?? summary.total ?? '-'}</strong></div>
                            <div>Failures: <strong>{summary.byStatus?.fail ?? summary.errors ?? '-'}</strong></div>
                            <div>Success: <strong>{summary.byStatus?.success ?? '-'}</strong></div>
                            <div>Suspicious: <strong>{summary.suspicious ?? '-'}</strong></div>
                            <div>Users: <strong>{summary.users ?? '-'}</strong></div>
                            {summary.dateRange ? (
                                <div>Date Range: <strong>{summary.dateRange.from} → {summary.dateRange.to}</strong></div>
                            ) : null}
                        </>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="pb-2">
                    <CardTitle>Logs</CardTitle>
                </CardHeader>
                <CardContent>
                    {loadingLogs ? (
                        <div className="flex items-center gap-2 text-gray-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading logs...</div>
                    ) : (
                        <CustomDataGrid
                            data={logs}
                            columns={logColumns}
                            pagination
                            pageSize={15}
                            inputFilter={false}
                            theme="sm"
                        />
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="pb-2">
                    <CardTitle>Suspicious Activity</CardTitle>
                </CardHeader>
                <CardContent>
                    {loadingSuspicious ? (
                        <div className="flex items-center gap-2 text-gray-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading suspicious logs...</div>
                    ) : (
                        <CustomDataGrid
                            data={suspiciousLogs}
                            columns={suspiciousColumns}
                            pagination={false}
                            inputFilter={false}
                            theme="sm"
                        />
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="pb-2">
                    <CardTitle>Log Files {fileTotal != null ? `(${fileTotal})` : ''}</CardTitle>
                </CardHeader>
                <CardContent>
                    {loadingFiles ? (
                        <div className="flex items-center gap-2 text-gray-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading files...</div>
                    ) : (
                        <CustomDataGrid
                            data={files}
                            columns={fileColumns}
                            pagination={false}
                            inputFilter={false}
                            theme="sm"
                        />
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default CLogs;
