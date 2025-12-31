'use client';
import React from 'react';
import { Button } from '@/components/ui/button';
import { Ban, CheckCircle2, CheckCheck, Clock, Plus, RefreshCw } from 'lucide-react';
import { CustomDataGrid } from '@/components/ui/DataGrid';
import type { ColumnDef } from '@/components/ui/DataGrid';
import { AuthContext } from '@/store/AuthContext';
import { authenticatedApi } from '@/config/api';
import { toast } from 'sonner';
import PoolcarCalendar from './poolcar-calendar';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useRouter } from 'next/navigation';
import { can } from '@/utils/permissions';

// Users who can view all poolcar requests without filtering by ramco
const poolcarAdmin: string[] = ['003456'];

type PoolcarRecord = {
  id: number | string;
  request_date: string;
  employee: string;
  department: string;
  location: string;
  type: string;
  from: string;
  to: string;
  duration: string;
  destination: string;
  purpose?: string;
  vehicle?: string;
  options?: string;
  passengers?: string;
  approvalStat?: number | string | null;
  approvalDate?: string;
  returnAt?: string;
  status?: string; // new string status from API: approved | pending | cancelled | rejected
  // keep original for potential drill-down
  __raw?: any;
};

function formatDMY(value?: string) {
  if (!value) return '-';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '-';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}
function formatDMYHM(value?: string) {
  if (!value) return '-';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '-';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}

function formatStatus(value: any) {
  if (value === null || value === undefined || value === '') return 'Pending';
  const numeric = Number(value);
  if (!Number.isNaN(numeric)) {
    const map: Record<number, string> = {
      0: 'Pending',
      1: 'Approved',
      2: 'Rejected',
      3: 'Cancelled',
    };
    return map[numeric] || String(numeric);
  }
  return String(value);
}

function formatReturnDateTime(date?: string, time?: string) {
  if (!date) return '-';
  const base = new Date(date);
  if (isNaN(base.getTime())) return '-';
  if (time) {
    const match = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(time);
    if (match) {
      const [, hh, mm, ss] = match;
      base.setHours(Number(hh ?? 0), Number(mm ?? 0), Number(ss ?? 0), 0);
    }
  }
  return formatDMYHM(base.toISOString());
}

function getPoolcarTypeLabel(val: any): string {
  const map: Record<string | number, string> = { 3: 'MPV', 5: 'Sedan', 6: 'SUV' };
  if (val == null) return '-';
  if (typeof val === 'number' || typeof val === 'string') {
    const key = Number(val);
    return map[key] || '-';
  }
  if (typeof val === 'object') {
    const id = Number(val.id ?? val.type_id ?? val.code);
    if (!Number.isNaN(id)) return map[id] || (val.name ?? '-');
    return val.name ?? '-';
  }
  return '-';
}

function renderStatusCell(status: any, date?: string) {
  const label = formatStatus(status);
  const formattedDate = date ? formatDMYHM(date) : '';
  const numeric = Number(status);
  let Icon = Clock;
  let iconClass = 'text-amber-500';
  if (!Number.isNaN(numeric)) {
    if (numeric === 1) {
      Icon = CheckCircle2;
      iconClass = 'text-emerald-600';
    } else if (numeric === 2) {
      Icon = Ban;
      iconClass = 'text-red-600';
    }
  } else if (typeof status === 'string') {
    const lowered = status.toLowerCase();
    if (lowered.includes('approve')) {
      Icon = CheckCircle2;
      iconClass = 'text-emerald-600';
    } else if (lowered.includes('reject')) {
      Icon = Ban;
      iconClass = 'text-red-600';
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Icon className={`h-4 w-4 ${iconClass}`} />
      <div className="flex flex-col">
        <span>{label}</span>
        {formattedDate ? <span className="text-xs text-muted-foreground">{formattedDate}</span> : null}
      </div>
    </div>
  );
}

function isPendingStatus(status: any) {
  if (status === null || status === undefined) return true;
  if (typeof status === 'string') {
    const trimmed = status.trim();
    if (trimmed === '') return true;
    const numeric = Number(status);
    if (!Number.isNaN(numeric)) return numeric === 0;
    return trimmed.toLowerCase() === 'pending';
  }
  const numeric = Number(status);
  return !Number.isNaN(numeric) ? numeric === 0 : false;
}

function renderStatusByString(status?: string) {
  const labelRaw = (status || '').toString().trim();
  const lowered = labelRaw.toLowerCase();
  let label = labelRaw || 'Pending';
  let Icon = Clock;
  let iconClass = 'text-amber-500';
  if (lowered === 'approved') { Icon = CheckCircle2; iconClass = 'text-emerald-600'; }
  else if (lowered === 'returned') { Icon = CheckCheck; iconClass = 'text-emerald-700'; }
  else if (lowered === 'cancelled' || lowered === 'canceled') { Icon = Ban; iconClass = 'text-red-600'; }
  else if (lowered === 'rejected') { Icon = Ban; iconClass = 'text-red-600'; }
  else if (lowered === 'pending' || !lowered) { Icon = Clock; iconClass = 'text-amber-500'; }
  return (
    <div className="flex items-center gap-2">
      <Icon className={`h-4 w-4 ${iconClass}`} />
      <span className="capitalize">{label || 'Pending'}</span>
    </div>
  );
}

const columns: ColumnDef<PoolcarRecord>[] = [
  { key: 'id', header: 'ID', sortable: true },
  { key: 'request_date', header: 'Request Date', sortable: true },
  { key: 'type', header: 'Poolcar Type', sortable: true, filter: 'singleSelect' },
  { key: 'vehicle', header: 'Assigned Poolcar', sortable: true, filter: 'singleSelect' },
  {
    key: 'from',
    header: 'Trip Window',
    sortable: true,
    render: (row) => (
      <div className="flex flex-col">
        <span>{row.from}</span>
        <span className="text-xs text-muted-foreground">to {row.to}</span>
      </div>
    ),
  },
  { key: 'duration', header: 'Duration', sortable: true },
  { key: 'destination', header: 'Destination', sortable: true },
  { key: 'returnAt', header: 'Return Date/Time', sortable: true },
  { key: 'status', header: 'Status', sortable: true, filter: 'singleSelect', render: (row) => renderStatusByString(row.status) },
];

const PoolcarRecord: React.FC = () => {
  const auth = React.useContext(AuthContext);
  const router = useRouter();
  const [rows, setRows] = React.useState<PoolcarRecord[]>([]);
  const [loading, setLoading] = React.useState(false);
  const authData = auth?.authData;
  const username = authData?.user?.username || '';

  const loadData = async () => {
    if (!username || !can('view', authData)) return;
    setLoading(true);
    try {
      const url = poolcarAdmin.includes(String(username))
        ? '/api/mtn/poolcars'
        : `/api/mtn/poolcars?ramco=${encodeURIComponent(username)}`;
      const res = await authenticatedApi.get(url);
      // Normalize list from various possible shapes
      const payload = res?.data as any;
      const list: any[] = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.items)
          ? payload.items
          : Array.isArray(payload?.data)
            ? payload.data
            : Array.isArray(payload?.result)
              ? payload.result
              : [];
      const mapped: PoolcarRecord[] = list.map((d: any) => ({
        id: d.pcar_id,
        request_date: formatDMY(d.pcar_datereq),
        employee: d.pcar_empid?.full_name || d.pcar_empid?.ramco_id || '-',
        department: d.department?.code || String(d.dept_id ?? '-'),
        location: d.location?.name || String(d.loc_id ?? '-'),
        type: getPoolcarTypeLabel(d.pcar_type),
        from: formatDMYHM(d.pcar_datefr),
        to: formatDMYHM(d.pcar_dateto),
        duration: `${d.pcar_day ?? 0}d ${d.pcar_hour ?? 0}h`,
        returnAt: formatReturnDateTime(d.pcar_retdate, d.pcar_rettime),
        destination: d.pcar_dest ?? '-',
        purpose: d.pcar_purp ?? '-',
        // Prefer latest fields: assigned_poolcar.register_number, fallback to asset.register_number or vehicle_id
        vehicle: d.assigned_poolcar?.register_number || d.asset?.register_number || String(d.vehicle_id ?? '-'),
        options: d.pcar_opt ?? '-',
        passengers: d.pass ?? '-',
        approvalStat: d.approval_stat,
        approvalDate: d.approval_date,
        status: d.status ? String(d.status) : undefined,
        __raw: d,
      }));
      setRows(mapped);
    } catch (e) {
      toast.error('Failed to load poolcar records');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadData();
     
  }, [username, authData]);

  // Build calendar bookings for current month only
  const calendarBookings = React.useMemo(() => {
    const bookings: { id: string; date: string; title: string }[] = [];
    const now = new Date();
    const cm = now.getMonth();
    const cy = now.getFullYear();
    for (const r of rows) {
      const raw = (r as any).__raw || {};
      const s = new Date(raw?.pcar_datefr || r.from);
      const e = new Date(raw?.pcar_dateto || r.to);
      if (isNaN(s.getTime()) || isNaN(e.getTime())) continue;
      // clamp to current month span
      const start = new Date(Math.max(s.getTime(), new Date(cy, cm, 1).getTime()));
      const end = new Date(Math.min(e.getTime(), new Date(cy, cm + 1, 0).getTime()));
      if (start > end) continue;
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      while (d <= end) {
        if (d.getMonth() === cm && d.getFullYear() === cy) {
          const dateStr = d.toISOString().slice(0, 10);
          bookings.push({ id: String(r.id), date: dateStr, title: `${r.type}${r.vehicle ? ` • ${r.vehicle}` : ''}` });
        }
        d.setDate(d.getDate() + 1);
      }
    }
    return bookings;
  }, [rows]);

  const handleRowDoubleClick = (row: any) => {
    if (!row) return;
    const id = row.id;
    if (id === undefined) return;
    if (!can('update', authData)) {
      toast.error('You do not have permission to update poolcar requests.');
      return;
    }
    router.push(`/mtn/poolcar/record/${id}`);
  };

  return (
    <div className="py-4 space-y-4">
      {/* Calendar Accordion */}
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="calendar">
          <AccordionTrigger>Booking Calendar</AccordionTrigger>
          <AccordionContent>
            <PoolcarCalendar bookings={calendarBookings} />
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-lg font-semibold">My Poolcar Requests</div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => router.push('/mtn/poolcar/record/new')}
            disabled={!can('create', authData)}
            title={!can('create', authData) ? 'You do not have permission to create a request' : undefined}
          >
            {loading ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={24} />}
          </Button>
        </div>
      </div>

      {!can('view', authData) ? (
        <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded">
          You do not have permission to view poolcar requests.
        </div>
      ) : loading ? (
        <div className="p-2 text-sm text-muted-foreground">Loading...</div>
      ) : (
        <div className="min-w-full">
          <CustomDataGrid<PoolcarRecord>
            data={rows}
            columns={columns}
            inputFilter={false}
            pagination={false}
            dataExport={false}
            theme="sm"
            onRowDoubleClick={handleRowDoubleClick}
            rowClass={(row) => {
              const s = (row.status || '').toString().toLowerCase();
              if (s === 'pending' || isPendingStatus(row.approvalStat)) return 'bg-amber-50 dark:bg-amber-900/20';
              if (s === 'cancelled') return 'bg-red-50 dark:bg-red-900/20';
              return '';
            }}
          />
        </div>
      )}
    </div>
  );
};

export default PoolcarRecord;
