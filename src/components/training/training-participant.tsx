"use client";

import React, { useContext, useEffect, useMemo, useState } from 'react';
import { authenticatedApi } from '@/config/api';
import { AuthContext } from '@/store/AuthContext';
import { CustomDataGrid, type ColumnDef } from '@/components/ui/DataGrid';
import { Loader2, FileDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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

const TrainingParticipant: React.FC<{ username?: string; className?: string }> = ({ username, className }) => {
  // username is no longer used for filtering; kept for compatibility
  const authCtx = useContext(AuthContext);

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [year, setYear] = useState<string>(String(new Date().getFullYear()));

  const YEAR_OPTIONS = useMemo(() => Array.from({ length: 6 }, (_, i) => String(new Date().getFullYear() - i)), []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = year === 'all' ? undefined : { year };
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
  }, [year]);

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
          const params: any = year === 'all' ? { ramco: ramcoId } : { ramco: ramcoId, year };
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
    }, [ramcoId, year]);

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
      <div className="mb-3 flex items-center gap-2">
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
        rowExpandable={{ enabled: true, render: (row: Row) => <ExpandContent ramcoId={row.ramco_id} /> }}
      />
    </div>
  );
};

export default TrainingParticipant;
