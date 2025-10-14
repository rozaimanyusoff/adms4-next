'use client';
import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus, RefreshCw } from 'lucide-react';
import { CustomDataGrid } from '@/components/ui/DataGrid';
import type { ColumnDef } from '@/components/ui/DataGrid';
import { AuthContext } from '@/store/AuthContext';
import { authenticatedApi } from '@/config/api';
import PoolcarApplicationForm from './poolcar-application-form';
import { toast } from 'sonner';
import PoolcarCalendar from './poolcar-calendar';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

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

const columns: ColumnDef<PoolcarRecord>[] = [
  { key: 'id', header: 'ID', sortable: true },
  { key: 'request_date', header: 'Request Date', sortable: true },
  { key: 'type', header: 'Poolcar Type', sortable: true },
  { key: 'from', header: 'From', sortable: true },
  { key: 'to', header: 'To', sortable: true },
  { key: 'duration', header: 'Duration', sortable: true },
  { key: 'destination', header: 'Destination', sortable: true },
  { key: 'vehicle', header: 'Vehicle', sortable: true },
  // Optionally include purpose/passengers/options if needed later
];

const PoolcarRecord: React.FC = () => {
  const auth = React.useContext(AuthContext);
  const [rows, setRows] = React.useState<PoolcarRecord[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [showForm, setShowForm] = React.useState(false);
  const [editId, setEditId] = React.useState<string | number | undefined>(undefined);
  const username = auth?.authData?.user?.username || '';

  const loadData = async () => {
    if (!username) return;
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
        department: d.department?.code || String(d.dept_id ?? '-') ,
        location: d.location?.name || String(d.loc_id ?? '-') ,
        type: getPoolcarTypeLabel(d.pcar_type),
        from: formatDMYHM(d.pcar_datefr),
        to: formatDMYHM(d.pcar_dateto),
        duration: `${d.pcar_day ?? 0}d ${d.pcar_hour ?? 0}h`,
        destination: d.pcar_dest ?? '-',
        purpose: d.pcar_purp ?? '-',
        vehicle: d.asset?.register_number || String(d.vehicle_id ?? '-') ,
        options: d.pcar_opt ?? '-',
        passengers: d.pass ?? '-',
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

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
    if (id !== undefined) {
      setEditId(id);
      setShowForm(true);
    }
  };

  if (showForm) {
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Poolcar Application Form</h2>
          <Button
            type="button"
            variant="outline"
            className="ring-1 ring-red-500"
            size="sm"
            onClick={() => { setShowForm(false); setEditId(undefined); }}
          >
            Back to Requests
          </Button>
        </div>
        <PoolcarApplicationForm id={editId} onClose={() => { setShowForm(false); setEditId(undefined); }} onSubmitted={loadData} />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
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
          <Button size="sm" onClick={() => { setEditId(undefined); setShowForm(true); }}>
            {loading ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={24} />}
          </Button>
        </div>
      </div>

      {loading ? (
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
          />
        </div>
      )}
    </div>
  );
};

export default PoolcarRecord;
