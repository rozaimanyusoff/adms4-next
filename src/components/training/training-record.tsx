'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, RefreshCcw, FileDown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { authenticatedApi } from '@/config/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CustomDataGrid, type ColumnDef } from '@/components/ui/DataGrid';
import TrainingForm from '@/components/training/training-form';
import {
    TrainingRecord,
    normalizeTrainingRecord,
    formatDateTime,
    formatCurrency,
} from '@/components/training/utils';

const TrainingRecordList = () => {
    const [records, setRecords] = useState<TrainingRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedDetail, setSelectedDetail] = useState<TrainingRecord | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);

    const loadRecords = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await authenticatedApi.get('/api/training');
            const data = (res as any)?.data;
            const list = Array.isArray(data?.data) ? data?.data : Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
            setRecords(list.map(normalizeTrainingRecord));
        } catch (err: any) {
            const message = err?.response?.data?.message || 'Unable to load training records';
            setError(message);
            setRecords([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadRecords();
    }, [loadRecords]);

    const fetchTrainingDetail = useCallback(async (record: TrainingRecord) => {
        setDetailLoading(true);
        try {
            const res = await authenticatedApi.get(`/api/training/${record.training_id}`);
            const payload = (res as any)?.data;
            const detail = normalizeTrainingRecord(payload?.data ?? payload ?? record);
            setSelectedDetail(detail);
            toast.info('Training detail loaded', { description: detail.course_title });
        } catch (err: any) {
            const message = err?.response?.data?.message || 'Unable to load training detail';
            toast.error(message);
        } finally {
            setDetailLoading(false);
        }
    }, []);

    const columns = useMemo<ColumnDef<TrainingRecord>[]>(() => [
        {
            key: 'course_title',
            header: 'Course Title',
            sortable: true,
            filterable: true,
            filter: 'input',
            render: (row) => (
                <div className="flex flex-col">
                    <span className="font-semibold">{row.course_title}</span>
                    <span className="text-xs text-muted-foreground">{row.series || 'No series'}</span>
                </div>
            ),
        },
        {
            key: 'session',
            header: 'Session',
            filterable: true,
            filter: 'singleSelect',
            render: (row) => (
                <Badge variant="outline" className="capitalize">
                    {row.session || 'n/a'}
                </Badge>
            ),
        },
        {
            key: 'sdate',
            header: 'Start',
            filterable: true,
            filter: 'date',
            render: (row) => formatDateTime(row.sdate),
        },
        {
            key: 'edate',
            header: 'End',
            filterable: true,
            filter: 'date',
            render: (row) => formatDateTime(row.edate),
        },
        {
            key: 'hrs',
            header: 'Hours',
            sortable: true,
            render: (row) => `${row.hrs_num || 0} h`,
        },
        {
            key: 'days',
            header: 'Days',
            sortable: true,
            render: (row) => `${row.days_num || 0} d`,
        },
        {
            key: 'venue',
            header: 'Venue',
            filterable: true,
            filter: 'input',
        },
        {
            key: 'seat',
            header: 'Seat',
            sortable: true,
            render: (row) => row.seat ?? '-',
        },
        {
            key: 'attendance_upload',
            header: 'Attendance',
            render: (row) =>
                row.attendance_upload ? (
                    <a
                        href={row.attendance_upload}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                        <FileDown className="size-4" /> Download
                    </a>
                ) : (
                    <span className="text-muted-foreground">Not uploaded</span>
                ),
        },
    ], []);

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <CardTitle>Training Records</CardTitle>
                        <CardDescription>
                            {showForm
                                ? 'Use the form to register a new training session.'
                                : 'Review scheduled trainings and double-click any row for full details.'}
                        </CardDescription>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="outline" onClick={loadRecords} disabled={loading || showForm}>
                            {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCcw className="size-4" />}
                            Refresh
                        </Button>
                        <Button type="button" onClick={() => setShowForm((prev) => !prev)}>
                            <Plus className="size-4" />
                            {showForm ? 'Back to Records' : 'Register Training'}
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {showForm ? (
                        <TrainingForm />
                    ) : (
                        <>
                            {error && <p className="mb-4 text-sm text-destructive">{error}</p>}
                            {loading && (
                                <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
                                    <Loader2 className="size-4 animate-spin" />
                                    Loading training records...
                                </div>
                            )}
                            <CustomDataGrid
                                data={records}
                                columns={columns}
                                pagination={false}
                                pageSize={10}
                                inputFilter={false}
                                onRowDoubleClick={fetchTrainingDetail}
                                dataExport={false}
                                rowColHighlight={false}
                                columnsVisibleOption={false}
                                gridSettings={false}
                            />
                        </>
                    )}
                </CardContent>
            </Card>

            {!showForm && (
                <Card>
                    <CardHeader>
                        <CardTitle>Training Detail</CardTitle>
                        <CardDescription>
                            {selectedDetail ? 'Loaded from the selected record.' : 'Double-click a row to load its full detail.'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {detailLoading ? (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Loader2 className="size-4 animate-spin" /> Fetching training detail...
                            </div>
                        ) : selectedDetail ? (
                            <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Course Title</p>
                                    <p className="font-semibold">{selectedDetail.course_title}</p>
                                </div>
                                <div>
                                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Session / Series</p>
                                    <p>{selectedDetail.session || 'n/a'} · {selectedDetail.series || 'No series'}</p>
                                </div>
                                <div>
                                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Schedule</p>
                                    <p>{formatDateTime(selectedDetail.sdate)} → {formatDateTime(selectedDetail.edate)}</p>
                                </div>
                                <div>
                                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Venue</p>
                                    <p>{selectedDetail.venue || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Hours / Days</p>
                                    <p>{selectedDetail.hrs_num} hrs · {selectedDetail.days_num} day(s)</p>
                                </div>
                                <div>
                                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Seats & Attendance</p>
                                    <p>{selectedDetail.training_count || 0} attended · {selectedDetail.seat ?? '-'} seats</p>
                                </div>
                                <div>
                                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Cost Breakdown</p>
                                    <ul className="text-sm">
                                        <li>Venue: {formatCurrency(selectedDetail.cost_venue)}</li>
                                        <li>Trainer: {formatCurrency(selectedDetail.cost_trainer)}</li>
                                        <li>Lodging: {formatCurrency(selectedDetail.cost_lodging)}</li>
                                        <li>Other: {formatCurrency(selectedDetail.cost_other)}</li>
                                        <li className="font-semibold">Total: {formatCurrency(selectedDetail.cost_total ?? selectedDetail.event_cost)}</li>
                                    </ul>
                                </div>
                                <div>
                                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Documents</p>
                                    {selectedDetail.attendance_upload ? (
                                        <a
                                            href={selectedDetail.attendance_upload}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-1 text-primary hover:underline"
                                        >
                                            <FileDown className="size-4" />
                                            Attendance File
                                        </a>
                                    ) : (
                                        <p className="text-sm text-muted-foreground">No attendance document uploaded.</p>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground">Select a training via double-click to inspect its details.</p>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default TrainingRecordList;
