'use client';
import React from 'react';
import { authenticatedApi } from '@/config/api';
import { CustomDataGrid, ColumnDef } from '@components/ui/DataGrid';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, RefreshCcw, Download, Archive, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

type ErrorLogEntry = {
    id?: number | string;
    level?: string;
    message?: string;
    stack?: string;
    context?: string;
    service?: string;
    timestamp?: string;
    created_at?: string;
    meta?: any;
};

type ErrorSummary = {
    total?: number;
    byLevel?: Record<string, number>;
    topServices?: { service: string; count: number }[];
    dateRange?: { from?: string; to?: string; days?: number };
    days?: number;
};

type LogFile = {
    filename: string;
    size?: number;
    entries?: number;
    date?: string;
    created?: string;
    modified?: string;
    updated_at?: string;
};

const formatDateTime = (value?: string) => {
    if (!value) return '-';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString();
};

const levelBadge = (level?: string) => {
    const base = 'px-1.5 py-0.5 rounded text-xs font-semibold uppercase';
    switch ((level ?? '').toLowerCase()) {
        case 'error': return <span className={`${base} bg-red-100 text-red-700`}>{level}</span>;
        case 'warn':
        case 'warning': return <span className={`${base} bg-yellow-100 text-yellow-700`}>{level}</span>;
        case 'info': return <span className={`${base} bg-blue-100 text-blue-700`}>{level}</span>;
        case 'debug': return <span className={`${base} bg-gray-100 text-gray-600`}>{level}</span>;
        default: return <span className={`${base} bg-gray-100 text-gray-500`}>{level ?? '-'}</span>;
    }
};

const mapEntry = (entry: any, idx: number): ErrorLogEntry & { row: number } => ({
    row: idx + 1,
    id: entry.id ?? entry._id ?? idx,
    level: entry.level ?? '-',
    message: entry.message ?? entry.msg ?? '-',
    stack: entry.stack ?? entry.trace ?? '',
    context: entry.context ?? entry.ctx ?? '',
    service: entry.service ?? entry.source ?? '-',
    timestamp: entry.timestamp ?? entry.created_at ?? entry.time ?? '',
    created_at: entry.created_at ?? entry.timestamp ?? entry.time ?? '',
    meta: entry.meta ?? entry.data ?? null,
});

const withRows = (items: any[]) => items.map((item, idx) => ({ ...item, row: idx + 1 }));

const CErrorLogs: React.FC = () => {
    const [logs, setLogs] = React.useState<any[]>([]);
    const [files, setFiles] = React.useState<any[]>([]);
    const [fileTotal, setFileTotal] = React.useState<number | null>(null);
    const [summary, setSummary] = React.useState<ErrorSummary>({});
    const [summaryDays, setSummaryDays] = React.useState<number>(7);

    const [loadingLogs, setLoadingLogs] = React.useState(false);
    const [loadingFiles, setLoadingFiles] = React.useState(false);
    const [loadingSummary, setLoadingSummary] = React.useState(false);
    const [archiving, setArchiving] = React.useState(false);

    const [dateFrom, setDateFrom] = React.useState('');
    const [dateTo, setDateTo] = React.useState('');
    const [levelFilter, setLevelFilter] = React.useState('error');
    const [daysToKeep, setDaysToKeep] = React.useState(90);

    const logColumns: ColumnDef<any>[] = [
        { key: 'row', header: '#', render: row => row.row },
        { key: 'timestamp', header: 'Date/Time', sortable: true, render: row => formatDateTime(row.timestamp || row.created_at) },
        { key: 'level', header: 'Level', sortable: true, render: row => levelBadge(row.level) },
        { key: 'service', header: 'Service', sortable: true, filter: 'input' },
        { key: 'message', header: 'Message', render: row => (
            <span className="truncate max-w-sm inline-block align-middle" title={row.message}>{row.message}</span>
        )},
        { key: 'context', header: 'Context', render: row => (
            <span className="truncate max-w-xs inline-block align-middle text-gray-500" title={row.context}>{row.context || '-'}</span>
        )},
        { key: 'stack', header: 'Stack', render: row => row.stack ? (
            <details className="cursor-pointer">
                <summary className="text-xs text-blue-600 hover:underline">View</summary>
                <pre className="text-xs whitespace-pre-wrap mt-1 max-w-md max-h-32 overflow-auto bg-gray-50 p-1 rounded">{row.stack}</pre>
            </details>
        ) : <span className="text-gray-400">-</span> },
    ];

    const fileColumns: ColumnDef<any>[] = [
        { key: 'row', header: '#', render: row => row.row },
        { key: 'filename', header: 'Filename' },
        { key: 'entries', header: 'Entries', render: row => row.entries ?? '-' },
        { key: 'size', header: 'Size (bytes)', render: row => row.size != null ? row.size.toLocaleString() : '-' },
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
                    onClick={() => window.open(`/api/admin/logs/errors/download/${encodeURIComponent(row.filename)}`, '_blank')}
                >
                    <Download size={14} /> Download
                </Button>
            ),
        },
    ];

    const fetchToday = React.useCallback(async () => {
        setLoadingLogs(true);
        try {
            const res = await authenticatedApi.get<any>('/api/admin/logs/errors/today');
            const payload = Array.isArray(res.data?.data?.logs)
                ? res.data.data.logs
                : Array.isArray(res.data?.logs)
                ? res.data.logs
                : Array.isArray(res.data)
                ? res.data
                : [];
            setLogs(payload.map(mapEntry));
        } catch {
            toast.error("Failed to load today's error logs");
            setLogs([]);
        } finally {
            setLoadingLogs(false);
        }
    }, []);

    const fetchByRange = React.useCallback(async () => {
        if (!dateFrom || !dateTo) {
            toast.error('Please select start and end dates');
            return;
        }
        setLoadingLogs(true);
        try {
            const params: any = { startDate: dateFrom, endDate: dateTo };
            if (levelFilter) params.level = levelFilter;
            const res = await authenticatedApi.get<any>('/api/admin/logs/errors/by-date-range', { params });
            const payload = Array.isArray(res.data?.data?.logs)
                ? res.data.data.logs
                : Array.isArray(res.data?.logs)
                ? res.data.logs
                : Array.isArray(res.data)
                ? res.data
                : [];
            setLogs(payload.map(mapEntry));
        } catch {
            toast.error('Failed to load error logs');
            setLogs([]);
        } finally {
            setLoadingLogs(false);
        }
    }, [dateFrom, dateTo, levelFilter]);

    const fetchSummary = React.useCallback(async () => {
        setLoadingSummary(true);
        try {
            const res = await authenticatedApi.get<any>('/api/admin/logs/errors/summary', { params: { days: summaryDays } });
            setSummary(res.data?.data ?? res.data ?? {});
        } catch {
            setSummary({});
        } finally {
            setLoadingSummary(false);
        }
    }, [summaryDays]);

    const fetchFiles = React.useCallback(async () => {
        setLoadingFiles(true);
        try {
            const res = await authenticatedApi.get<any>('/api/admin/logs/errors/files');
            const payload = Array.isArray(res.data?.data?.files)
                ? res.data.data.files
                : Array.isArray(res.data?.files)
                ? res.data.files
                : [];
            setFileTotal(res.data?.data?.totalFiles ?? res.data?.totalFiles ?? null);
            setFiles(withRows(payload));
        } catch {
            setFiles([]);
            setFileTotal(null);
        } finally {
            setLoadingFiles(false);
        }
    }, []);

    const handleArchive = async () => {
        setArchiving(true);
        try {
            await authenticatedApi.post('/api/admin/logs/errors/archive', { daysToKeep });
            toast.success(`Archive submitted — keeping last ${daysToKeep} days`);
            fetchFiles();
        } catch {
            toast.error('Failed to archive error logs');
        } finally {
            setArchiving(false);
        }
    };

    React.useEffect(() => {
        const today = new Date();
        const weekAgo = new Date(today.getTime() - 6 * 24 * 3600 * 1000);
        const fmt = (d: Date) => d.toISOString().slice(0, 10);
        setDateFrom(fmt(weekAgo));
        setDateTo(fmt(today));
    }, []);

    React.useEffect(() => {
        fetchToday();
        fetchSummary();
        fetchFiles();
    }, [fetchToday, fetchSummary, fetchFiles]);

    return (
        <div className="mt-4 space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    Error Logs
                </h2>
                <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" className="gap-1" onClick={fetchToday} disabled={loadingLogs}>
                        {loadingLogs ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                        Today
                    </Button>
                </div>
            </div>

            {/* Summary */}
            <Card>
                <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                        <CardTitle>Summary</CardTitle>
                        <div className="flex items-center gap-2">
                            <label className="text-sm text-gray-500">Days:</label>
                            <select
                                className="border rounded px-2 py-1 text-sm"
                                value={summaryDays}
                                onChange={e => setSummaryDays(Number(e.target.value))}
                            >
                                <option value={1}>1</option>
                                <option value={7}>7</option>
                                <option value={14}>14</option>
                                <option value={30}>30</option>
                            </select>
                            <Button size="sm" variant="outline" onClick={fetchSummary} disabled={loadingSummary}>
                                {loadingSummary ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Load'}
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {loadingSummary ? (
                        <div className="flex items-center gap-2 text-gray-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading summary...</div>
                    ) : (
                        <div className="space-y-3">
                            <div className="flex flex-wrap gap-4 text-sm">
                                <div>Total Errors: <strong className="text-red-600">{summary.total ?? '-'}</strong></div>
                                {summary.days != null && <div>Period: <strong>Last {summary.days} days</strong></div>}
                                {summary.dateRange && (
                                    <div>Range: <strong>{summary.dateRange.from} → {summary.dateRange.to}</strong></div>
                                )}
                            </div>
                            {summary.byLevel && Object.keys(summary.byLevel).length > 0 && (
                                <div className="flex flex-wrap gap-3">
                                    {Object.entries(summary.byLevel).map(([lvl, count]) => (
                                        <div key={lvl} className="flex items-center gap-1 text-sm">
                                            {levelBadge(lvl)} <span className="font-semibold">{count}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {summary.topServices && summary.topServices.length > 0 && (
                                <div>
                                    <p className="text-xs text-gray-500 mb-1">Top Services</p>
                                    <div className="flex flex-wrap gap-2">
                                        {summary.topServices.map(s => (
                                            <span key={s.service} className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                                                {s.service}: <strong>{s.count}</strong>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Filters */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle>Filter by Date Range</CardTitle>
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
                        <label className="text-sm font-medium">Level</label>
                        <select
                            className="border rounded px-2 py-2 text-sm"
                            value={levelFilter}
                            onChange={e => setLevelFilter(e.target.value)}
                        >
                            <option value="">Any</option>
                            <option value="error">error</option>
                            <option value="warn">warn</option>
                            <option value="info">info</option>
                            <option value="debug">debug</option>
                        </select>
                    </div>
                    <div className="flex gap-2">
                        <Button className="flex-1" onClick={fetchByRange} disabled={loadingLogs}>Apply</Button>
                        <Button
                            variant="outline"
                            className="flex-1"
                            onClick={() => { setLevelFilter('error'); fetchToday(); }}
                            disabled={loadingLogs}
                        >
                            Reset
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Logs Table */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle>Error Log Entries</CardTitle>
                </CardHeader>
                <CardContent>
                    {loadingLogs ? (
                        <div className="flex items-center gap-2 text-gray-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading error logs...</div>
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

            {/* Log Files */}
            <Card>
                <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                        <CardTitle>Error Log Files {fileTotal != null ? `(${fileTotal})` : ''}</CardTitle>
                        <Button size="sm" variant="outline" className="gap-1" onClick={fetchFiles} disabled={loadingFiles}>
                            {loadingFiles ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCcw className="h-3 w-3" />}
                            Refresh
                        </Button>
                    </div>
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

            {/* Archive */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle>Archive</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap items-end gap-4">
                    <div className="flex flex-col gap-1">
                        <label className="text-sm font-medium">Keep last N days</label>
                        <Input
                            type="number"
                            min={1}
                            className="w-32"
                            value={daysToKeep}
                            onChange={e => setDaysToKeep(Number(e.target.value))}
                        />
                    </div>
                    <Button
                        variant="outline"
                        className="gap-1"
                        onClick={handleArchive}
                        disabled={archiving}
                    >
                        {archiving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive size={14} />}
                        Archive old error logs
                    </Button>
                    <p className="text-xs text-gray-400 self-end">Error log files older than the specified days will be archived.</p>
                </CardContent>
            </Card>
        </div>
    );
};

export default CErrorLogs;
