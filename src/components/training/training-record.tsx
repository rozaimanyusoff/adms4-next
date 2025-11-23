'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Loader2, FileDown, CornerUpLeft, FileSpreadsheet } from 'lucide-react';
import ExcelJS from 'exceljs';
import { authenticatedApi } from '@/config/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { CustomDataGrid, type ColumnDef } from '@/components/ui/DataGrid';
import TrainingForm from '@/components/training/training-form';
import {
    TrainingRecord,
    normalizeTrainingRecord,
    formatDateTime,
    parseDateTime,
} from '@/components/training/utils';

const TrainingRecordList = () => {
    const [records, setRecords] = useState<TrainingRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [participantYear, setParticipantYear] = useState<string>('all');
    const [participantReport, setParticipantReport] = useState<any[]>([]);
    const [participantLoading, setParticipantLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);

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

    const handleRowDoubleClick = useCallback((record: TrainingRecord) => {
        // Open form in edit mode and let the form fetch by id
        setEditingId(record.training_id);
        setShowForm(true);
    }, []);

    const YEAR_OPTIONS = Array.from({ length: 5 }, (_, index) => String(new Date().getFullYear() - index));
    useEffect(() => {
        const loadParticipants = async () => {
            setParticipantLoading(true);
            try {
                const params = participantYear === 'all'
                    ? { status: 'active' }
                    : { year: participantYear, status: 'active' };
                const res = await authenticatedApi.get('/api/training/participants', { params } as any);
                const data = (res as any)?.data;
                const list = Array.isArray(data?.data)
                    ? data.data
                    : Array.isArray(data?.items)
                        ? data.items
                        : Array.isArray(data)
                            ? data
                            : [];
                setParticipantReport(list);
            } catch {
                setParticipantReport([]);
            } finally {
                setParticipantLoading(false);
            }
        };
        loadParticipants();
    }, [participantYear]);

    const exportParticipants = async () => {
        if (!participantReport.length) return;
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'ADMS';
        workbook.created = new Date();
        const sheet = workbook.addWorksheet('Training Participants');
        sheet.columns = [
            { header: 'No', width: 6 },
            { header: 'Ramco ID', width: 16 },
            { header: 'Name', width: 32 },
            { header: 'Department', width: 20 },
            { header: 'Location', width: 20 },
            { header: 'Position', width: 20 },
            { header: 'Training Title', width: 40 },
            { header: 'Training Date', width: 20 },
            { header: 'Hours', width: 8 },
            { header: 'Days', width: 8 },
            { header: 'Month', width: 10 },
            { header: 'Year', width: 8 },
        ];
        participantReport.forEach((item: any, index: number) => {
            // training_details may arrive as an object or an array; pick the most recent entry if multiple are present
            const detailSource = item.training_details ?? item.training ?? {};
            const detailList = Array.isArray(detailSource) ? detailSource : [detailSource];
            const details = detailList.length > 1
                ? detailList.reduce((latest, curr) => {
                    const latestDate = parseDateTime(latest?.start_date ?? latest?.sdate ?? latest?.startDate ?? null);
                    const currDate = parseDateTime(curr?.start_date ?? curr?.sdate ?? curr?.startDate ?? null);
                    if (!latestDate) return curr;
                    if (!currDate) return latest;
                    return currDate > latestDate ? curr : latest;
                }, detailList[0])
                : detailList[0];

            const startRaw = details?.start_date ?? details?.sdate ?? item.sdate ?? null;
            const startDate = parseDateTime(startRaw) ?? (startRaw ? new Date(startRaw) : null);
            const month = startDate ? startDate.toLocaleString(undefined, { month: 'short' }) : '';
            const year = startDate ? startDate.getFullYear().toString() : '';
            const trainingTitle = details?.course_title ?? details?.title ?? item.course_title ?? '';
            const trainingDate = startDate
                ? `${startDate.getDate()}/${startDate.getMonth() + 1}/${startDate.getFullYear()}`
                : startRaw || '';
            sheet.addRow([
                index + 1,
                item.participant?.ramco_id ?? '',
                item.participant?.full_name ?? '',
                item.participant?.department?.name ?? '',
                item.participant?.location?.name ?? '',
                item.participant?.position?.name ?? '',
                trainingTitle,
                trainingDate,
                details?.hrs ?? details?.hours ?? '',
                details?.days ?? details?.day ?? '',
                month,
                year,
            ]);
        });
        sheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) {
                row.font = { bold: true };
            }
        });
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12); // YYYYMMDDHHMM
        anchor.download = `training-participants-${participantYear}-${timestamp}.xlsx`;
        anchor.click();
        URL.revokeObjectURL(url);
    };

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
        <div className="space-y-4">
            <div className={`flex flex-col gap-2 sm:flex-row sm:items-center ${showForm ? 'sm:justify-end' : 'sm:justify-between'}`}>
                {!showForm && (
                    <div>
                        <h2 className="text-lg font-semibold">Training Records</h2>
                        <p className="text-sm text-muted-foreground">
                            Review scheduled trainings and double-click any row to edit in the form.
                        </p>
                    </div>
                )}
                {!showForm && (
                    <div className="flex items-center gap-2 sm:justify-end">
                        <Select value={participantYear} onValueChange={(value) => setParticipantYear(value)}>
                            <SelectTrigger className="h-10 text-sm">
                                <SelectValue placeholder="Year" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All years</SelectItem>
                                {YEAR_OPTIONS.map((year) => (
                                    <SelectItem key={year} value={year}>
                                        {year}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button
                            variant="outline"
                            onClick={() => void exportParticipants()}
                            disabled={!participantReport.length || participantLoading}
                        >
                            <FileSpreadsheet className="size-4 text-green-600" />
                            Export Records
                        </Button>
                        <Button
                            type="button"
                            onClick={() => {
                                // Toggle form; when manually opening form, clear edit state for a fresh form
                                setEditingId(null);
                                setShowForm((prev) => !prev);
                            }}
                        >
                            {loading ? (
                                <Loader2 className="size-4 animate-spin" />
                            ) : showForm ? (
                                <CornerUpLeft className="size-4" />
                            ) : (
                                <Plus className="size-4" />
                            )}
                            {showForm ? 'Back' : 'Register Training'}
                        </Button>
                    </div>
                )}
            </div>

            {showForm ? (
                <div className="space-y-4">
                    <TrainingForm
                        trainingId={editingId ?? undefined}
                        onSuccess={() => {
                            setShowForm(false);
                            setEditingId(null);
                        }}
                        onCancel={() => {
                            setShowForm(false);
                            setEditingId(null);
                        }}
                    />
                </div>
            ) : (
                <>
                    {error && <p className="mb-2 text-sm text-destructive">{error}</p>}
                    {loading && (
                        <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
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
                        onRowDoubleClick={handleRowDoubleClick}
                        dataExport={false}
                        rowColHighlight={false}
                        columnsVisibleOption={false}
                        gridSettings={false}
                    />
                </>
            )}
        </div>
    );
};

export default TrainingRecordList;
