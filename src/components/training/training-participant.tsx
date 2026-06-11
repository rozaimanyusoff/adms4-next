"use client";

import React, { useContext, useEffect, useMemo, useState } from 'react';
import ExcelJS from 'exceljs';
import { authenticatedApi } from '@/config/api';
import { AuthContext } from '@/store/AuthContext';
import { CustomDataGrid, type ColumnDef } from '@/components/ui/DataGrid';
import { Loader2, FileDown, FileSpreadsheet, Filter } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { parseDateTime } from '@/components/training/utils';

type ApiParticipantItem = {
  participant_id: number;
  participant: {
    ramco_id: string;
    full_name: string;
    position?: { id: number; name: string } | null;
    department?: { id: number; name: string } | null;
    location?: { id: number; name: string } | null;
  };
  total_training_hours?: string | null;
  training_details: {
    training_id: number;
    start_date?: string | null;
    end_date?: string | null;
    course_title?: string | null;
    hrs?: string | number | null;
    days?: string | number | null;
    venue?: string | null;
    attendance_upload?: string | null;
  };
};

type TrainingDetail = {
  training_id?: number;
  start_date?: string | null;
  end_date?: string | null;
  course_title?: string | null;
  hrs?: string | number | null;
  days?: string | number | null;
  venue?: string | null;
  attendance_upload?: string | null;
};

type Row = {
  no?: number;
  participant_id: number;
  ramco_id: string;
  full_name: string;
  position: string;
  department: string;
  location: string;
  total_training_hours: string;
};

const formatDateTime = (value?: string | null) => {
  if (!value) return '-';
  return value; // API already provides friendly string like "7/8/2025 9:00 AM"
};

const toNumber = (value: string | number | null | undefined) => {
  if (value == null) return 0;
  const normalized = typeof value === 'number' ? value : Number(String(value).replace(/[^\d.-]/g, ''));
  return Number.isFinite(normalized) ? normalized : 0;
};

const MONTH_OPTIONS = [
  { value: '1', label: 'Jan' },
  { value: '2', label: 'Feb' },
  { value: '3', label: 'Mar' },
  { value: '4', label: 'Apr' },
  { value: '5', label: 'May' },
  { value: '6', label: 'Jun' },
  { value: '7', label: 'Jul' },
  { value: '8', label: 'Aug' },
  { value: '9', label: 'Sep' },
  { value: '10', label: 'Oct' },
  { value: '11', label: 'Nov' },
  { value: '12', label: 'Dec' },
] as const;

const TrainingParticipant: React.FC<{ username?: string; className?: string }> = ({ username, className }) => {
  // username is no longer used for filtering; kept for compatibility
  const authCtx = useContext(AuthContext);

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [year, setYear] = useState<string>(String(new Date().getFullYear()));
  const [months, setMonths] = useState<string[]>([]);
  const [selectedRows, setSelectedRows] = useState<Row[]>([]);
  const [exporting, setExporting] = useState(false);

  const YEAR_OPTIONS = useMemo(() => Array.from({ length: 6 }, (_, i) => String(new Date().getFullYear() - i)), []);
  const monthLabel = useMemo(() => {
    if (!months.length) return 'All months';
    const map: Record<string, string> = MONTH_OPTIONS.reduce((acc, item) => {
      acc[item.value] = item.label;
      return acc;
    }, {} as Record<string, string>);
    return months
      .slice()
      .sort((a, b) => Number(a) - Number(b))
      .map((m) => map[m] || m)
      .join(', ');
  }, [months]);

  const selectedTotalHours = useMemo(() => {
    const total = selectedRows.reduce((sum, row) => sum + toNumber(row.total_training_hours), 0);
    return Number(total.toFixed(2));
  }, [selectedRows]);

  const fetchParticipantDetails = async (ramcoId: string) => {
    const params: any = year === 'all' ? { ramco: ramcoId, status: 'active' } : { ramco: ramcoId, year, status: 'active' };
    if (months.length) {
      params.month = months.join(',');
    }

    const res = await authenticatedApi.get('/api/training/participants', { params } as any);
    const payload: any = (res as any)?.data;
    let obj: any = payload;
    if (Array.isArray(payload?.data)) obj = payload.data[0];
    else if (payload?.data && !Array.isArray(payload?.data)) obj = payload.data;
    else if (Array.isArray(payload)) obj = payload[0];

    const list: TrainingDetail[] = Array.isArray(obj?.training_details)
      ? obj.training_details
      : obj?.training_details
        ? [obj.training_details]
        : [];

    return list;
  };

  const exportRecords = async () => {
    const records = selectedRows.length ? selectedRows : rows;
    if (!records.length) return;

    setExporting(true);
    try {
      const detailGroups = await Promise.all(
        records.map(async (row) => ({
          row,
          details: await fetchParticipantDetails(row.ramco_id),
        })),
      );

      const trainingByMonth = new Map<string, { month: string; count: number }>();
      const participantDeptByMonth = new Map<string, Set<number>>();

      detailGroups.forEach(({ row, details }) => {
        details.forEach((detail) => {
          const date = parseDateTime(detail.start_date ?? null) ?? (detail.start_date ? new Date(detail.start_date) : null);
          if (!date || Number.isNaN(date.getTime())) return;
          const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          const label = date.toLocaleString(undefined, { month: 'short', year: 'numeric' });

          const current = trainingByMonth.get(key);
          if (current) {
            current.count += 1;
          } else {
            trainingByMonth.set(key, { month: label, count: 1 });
          }

          const deptKey = `${key}__${row.department}`;
          if (!participantDeptByMonth.has(deptKey)) {
            participantDeptByMonth.set(deptKey, new Set<number>());
          }
          participantDeptByMonth.get(deptKey)!.add(row.participant_id);
        });
      });

      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'ADMS';
      workbook.created = new Date();

      const summarySheet = workbook.addWorksheet('Summary');
      summarySheet.columns = [
        { header: 'Field', width: 36 },
        { header: 'Value', width: 42 },
        { header: 'Notes', width: 26 },
      ];

      summarySheet.addRow(['Training Participants Report', '', '']);
      summarySheet.addRow([]);
      summarySheet.addRow(['Year Filter', year === 'all' ? 'All years' : year, '']);
      summarySheet.addRow(['Month Filter', monthLabel, '']);
      summarySheet.addRow(['Export Scope', selectedRows.length ? 'Selected employees only' : 'All displayed employees', '']);
      summarySheet.addRow(['Employees', String(records.length), '']);
      summarySheet.addRow([]);
      summarySheet.addRow(['Summary: Number of Training by Month', '', '']);
      summarySheet.addRow(['Month', 'No. of Training', '']);

      const monthlyRows = Array.from(trainingByMonth.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([, value]) => [value.month, value.count, '']);

      if (monthlyRows.length) {
        monthlyRows.forEach((item) => summarySheet.addRow(item));
      } else {
        summarySheet.addRow(['No data', 0, '']);
      }

      summarySheet.addRow([]);
      summarySheet.addRow(['Summary: Participants by Department per Month', '', '']);
      summarySheet.addRow(['Month', 'Department', 'Participants']);

      const participantDeptRows = Array.from(participantDeptByMonth.entries())
        .map(([key, set]) => {
          const [monthKey, department] = key.split('__');
          const monthInfo = trainingByMonth.get(monthKey);
          return [monthInfo?.month || monthKey, department, set.size];
        })
        .sort((a, b) => String(a[0]).localeCompare(String(b[0])) || String(a[1]).localeCompare(String(b[1])));

      if (participantDeptRows.length) {
        participantDeptRows.forEach((item) => summarySheet.addRow(item));
      } else {
        summarySheet.addRow(['No data', '-', 0]);
      }

      summarySheet.eachRow((row, rowNumber) => {
        if ([1, 8, 9, 12, 13].includes(rowNumber)) {
          row.font = { bold: true };
        }
      });

      const recordsSheet = workbook.addWorksheet('Records');
      recordsSheet.columns = [
        { header: 'No', width: 8 },
        { header: 'Ramco ID', width: 16 },
        { header: 'Name', width: 34 },
        { header: 'Position', width: 22 },
        { header: 'Department', width: 22 },
        { header: 'Location', width: 20 },
        { header: 'Total Hours', width: 14 },
      ];

      records.forEach((row, index) => {
        recordsSheet.addRow([
          index + 1,
          row.ramco_id,
          row.full_name,
          row.position,
          row.department,
          row.location,
          toNumber(row.total_training_hours),
        ]);
      });

      recordsSheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) {
          row.font = { bold: true };
        }
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12);
      anchor.download = `training-participants-report-${year}-${timestamp}.xlsx`;
      anchor.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const params: any = year === 'all' ? { status: 'active' } : { year, status: 'active' };
        if (months.length) {
          params.month = months.join(',');
        }
        const res = await authenticatedApi.get('/api/training/participants', { params } as any);
        const data: any = (res as any)?.data;
        const list: ApiParticipantItem[] = Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data?.items)
            ? data.items
            : Array.isArray(data)
              ? data
              : [];
        const normalized: Row[] = list.map((it) => ({
          participant_id: Number(it.participant_id),
          ramco_id: it.participant?.ramco_id || '',
          full_name: it.participant?.full_name || '',
          position: it.participant?.position?.name || '-',
          department: it.participant?.department?.name || '-',
          location: it.participant?.location?.name || '-',
          total_training_hours: String(it.total_training_hours ?? it.training_details?.hrs ?? ''),
        }));
        setRows(normalized);
      } catch (e: any) {
        setError(e?.response?.data?.message || 'Unable to load training participants');
        setRows([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [year, months]);

  useEffect(() => {
    if (!selectedRows.length) return;
    const latestMap = new Map(rows.map((row) => [row.participant_id, row]));
    const nextSelected = selectedRows
      .map((row) => latestMap.get(row.participant_id))
      .filter((row): row is Row => !!row);
    if (nextSelected.length !== selectedRows.length) {
      setSelectedRows(nextSelected);
    }
  }, [rows, selectedRows]);

  const columns = useMemo<ColumnDef<Row>[]>(() => [
    { key: 'no', header: 'No', render: (_row, index) => <span>{index}</span> },
    { key: 'ramco_id', header: 'Ramco ID', filterable: true, filter: 'input' },
    { key: 'full_name', header: 'Name', filterable: true, filter: 'input' },
    { key: 'position', header: 'Position', filterable: true, filter: 'singleSelect' },
    { key: 'department', header: 'Department', filterable: true, filter: 'singleSelect' },
    { key: 'location', header: 'Location', filterable: true, filter: 'input' },
    { key: 'total_training_hours', header: 'Total Hours', sortable: true, render: (r) => (r.total_training_hours ? `${r.total_training_hours}` : '-') },
  ], []);

  const ExpandContent: React.FC<{ ramcoId: string }> = ({ ramcoId }) => {
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [errorDetails, setErrorDetails] = useState<string | null>(null);
    const [details, setDetails] = useState<{ trainings_count?: number; training_details?: any[] } | null>(null);

    useEffect(() => {
      let cancelled = false;
      const fetchDetails = async () => {
        setLoadingDetails(true);
        setErrorDetails(null);
        try {
          const params: any = year === 'all' ? { ramco: ramcoId, status: 'active' } : { ramco: ramcoId, year, status: 'active' };
          if (months.length) {
            params.month = months.join(',');
          }
          const res = await authenticatedApi.get('/api/training/participants', { params } as any);
          const payload: any = (res as any)?.data;
          if (cancelled) return;
          let obj: any = payload;
          if (Array.isArray(payload?.data)) obj = payload.data[0];
          else if (payload?.data && !Array.isArray(payload?.data)) obj = payload.data;
          else if (Array.isArray(payload)) obj = payload[0];
          const list: any[] = Array.isArray(obj?.training_details) ? obj.training_details : [];
          const count = Number(obj?.trainings_count ?? list.length);
          setDetails({ trainings_count: count, training_details: list });
        } catch (e: any) {
          if (!cancelled) setErrorDetails(e?.response?.data?.message || 'Failed to load details');
        } finally {
          if (!cancelled) setLoadingDetails(false);
        }
      };
      fetchDetails();
      return () => { cancelled = true; };
    }, [ramcoId, year, months]);

    if (loadingDetails) return (
      <div className="p-3 text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading details...</div>
    );
    if (errorDetails) return (
      <div className="p-3 text-sm text-destructive">{errorDetails}</div>
    );
    const list: any[] = Array.isArray(details?.training_details) ? details!.training_details! : [];
    return (
      <div className="p-3 space-y-2">
        <div className="text-sm text-muted-foreground">Trainings ({details?.trainings_count ?? list.length})</div>
        {list.length === 0 ? (
          <div className="text-sm text-muted-foreground">No trainings found for the selected year.</div>
        ) : (
          <ul className="space-y-2">
            {list.map((d: any) => (
              <li key={d.training_id} className="rounded border p-2">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{d.course_title || 'Untitled Course'}</div>
                  {d.hrs && <Badge variant="outline">{d.hrs} h</Badge>}
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatDateTime(d.start_date)} → {formatDateTime(d.end_date)} · Days: {d.days || '-'} · Venue: {d.venue || '-'}
                </div>
                {d.attendance_upload ? (
                  <div className="pt-1">
                    <a href={d.attendance_upload} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                      <FileDown className="h-3 w-3" /> Attendance
                    </a>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  };

  return (
    <div className={className}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Select value={year} onValueChange={(v) => setYear(v)}>
          <SelectTrigger className="h-9 w-40">
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All years</SelectItem>
            {YEAR_OPTIONS.map((y) => (
              <SelectItem key={y} value={y}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="h-9 min-w-44 justify-between">
              <span className="inline-flex items-center gap-1 truncate">
                <Filter className="h-4 w-4" />
                {monthLabel}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-52">
            <DropdownMenuLabel>Month Filter</DropdownMenuLabel>
            <DropdownMenuCheckboxItem
              checked={months.length === 0}
              onCheckedChange={(checked) => {
                if (checked) setMonths([]);
              }}
            >
              All months
            </DropdownMenuCheckboxItem>
            <DropdownMenuSeparator />
            {MONTH_OPTIONS.map((month) => (
              <DropdownMenuCheckboxItem
                key={month.value}
                checked={months.includes(month.value)}
                onCheckedChange={(checked) => {
                  setMonths((prev) => {
                    if (checked) {
                      return Array.from(new Set([...prev, month.value])).sort((a, b) => Number(a) - Number(b));
                    }
                    return prev.filter((value) => value !== month.value);
                  });
                }}
              >
                {month.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="outline"
          onClick={() => void exportRecords()}
          disabled={loading || exporting || rows.length === 0}
        >
          {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4 text-green-600" />}
          Export Records
        </Button>
      </div>
      {error && <p className="mb-2 text-sm text-destructive">{error}</p>}
      {loading && (
        <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading participants...
        </div>
      )}
      <CustomDataGrid
        data={rows}
        columns={columns}
        pagination={false}
        pageSize={10}
        inputFilter={false}
        dataExport={false}
        columnsVisibleOption={false}
        rowColHighlight={false}
        gridSettings={false}
        rowSelection={{
          enabled: true,
          getRowId: (row) => row.participant_id,
          onSelect: (_keys, selectedData) => setSelectedRows(selectedData),
        }}
        rowExpandable={{ enabled: true, render: (row: Row) => <ExpandContent ramcoId={row.ramco_id} /> }}
      />

      <div className="mt-3 rounded-md border p-3">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium">Selected Employees: {selectedRows.length}</p>
          <p className="text-sm text-muted-foreground">Total Hours (selected, filtered): {selectedTotalHours.toFixed(2)}</p>
        </div>
        {selectedRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Tick row checkbox to select employees.</p>
        ) : (
          <div className="max-h-48 overflow-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="py-1 pr-2">Ramco ID</th>
                  <th className="py-1 pr-2">Name</th>
                  <th className="py-1 pr-2">Department</th>
                  <th className="py-1 pr-2 text-right">Total Hours</th>
                </tr>
              </thead>
              <tbody>
                {selectedRows.map((row) => (
                  <tr key={row.participant_id} className="border-t">
                    <td className="py-1 pr-2">{row.ramco_id}</td>
                    <td className="py-1 pr-2">{row.full_name}</td>
                    <td className="py-1 pr-2">{row.department}</td>
                    <td className="py-1 pr-2 text-right">{toNumber(row.total_training_hours).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrainingParticipant;
