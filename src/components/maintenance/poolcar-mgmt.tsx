'use client';
import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthContext } from '@/store/AuthContext';
import { authenticatedApi } from '@/config/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CustomDataGrid } from '@/components/ui/DataGrid';
import type { ColumnDef } from '@/components/ui/DataGrid';
import { Ban, CheckCircle2, Clock, RefreshCw, Circle } from 'lucide-react';
import { toast } from 'sonner';
import PoolcarCalendar from './poolcar-calendar';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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
  vehicle?: string;
  recommendationStat?: number | string | null;
  recommendationDate?: string;
  approvalStat?: number | string | null;
  approvalDate?: string;
  returnAt?: string;
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

const columns: ColumnDef<PoolcarRecord>[] = [
  { key: 'id', header: 'ID', sortable: true },
  { key: 'request_date', header: 'Request Date', sortable: true },
  { key: 'employee', header: 'Employee', sortable: true, filter: 'input' },
  { key: 'department', header: 'Dept', sortable: true, filter: 'singleSelect' },
  { key: 'type', header: 'Poolcar Type', sortable: true, filter: 'input' },
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
  { key: 'destination', header: 'Destination', sortable: true, filter: 'input' },
  { key: 'vehicle', header: 'Assigned Poolcar', sortable: true, filter: 'singleSelect' },
  {
    key: 'recommendationStat',
    header: 'Recommendation',
    sortable: false,
    filter: 'singleSelect',
    render: (row) => renderStatusCell(row.recommendationStat, row.recommendationDate),
  },
  {
    key: 'approvalStat',
    header: 'Approval',
    sortable: false,
    filter: 'singleSelect',
    render: (row) => renderStatusCell(row.approvalStat, row.approvalDate),
  },
  { key: 'returnAt', header: 'Return Date/Time', sortable: true },
];

const PoolcarMgmt: React.FC = () => {
  const auth = React.useContext(AuthContext);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [rows, setRows] = React.useState<PoolcarRecord[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [statusFilter, setStatusFilter] = React.useState<string>('');
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [detail, setDetail] = React.useState<any>(null);
  const [fleetLoading, setFleetLoading] = React.useState(false);
  const [fleet, setFleet] = React.useState<any[]>([]);
  const [availabilityLoading, setAvailabilityLoading] = React.useState(false);
  const [availability, setAvailability] = React.useState<Record<number, any>>({});
  const [selectedAssetId, setSelectedAssetId] = React.useState<number | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      // For admins, load all poolcar requests (endpoint to be confirmed)
      const res = await authenticatedApi.get(`/api/mtn/poolcars${statusFilter ? `?status=${encodeURIComponent(statusFilter)}` : ''}`);
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
        returnAt: formatReturnDateTime(d.pcar_retdate, d.pcar_rettime),
        destination: d.pcar_dest ?? '-',
        vehicle: d.asset?.register_number || String(d.vehicle_id ?? '-') ,
        recommendationStat: d.recommendation_stat,
        recommendationDate: d.recommendation_date,
        approvalStat: d.approval_stat,
        approvalDate: d.approval_date,
        __raw: d,
      }));
      setRows(mapped);
    } catch (e) {
      toast.error('Failed to load poolcar requests');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  // Sync selectedId from query param
  React.useEffect(() => {
    const id = searchParams?.get('id') ?? null;
    setSelectedId(id);
  }, [searchParams]);

  // Load left-pane details when an id is selected
  const loadDetail = React.useCallback(async (id: string) => {
    if (!id) return;
    setDetailLoading(true);
    try {
      const res = await authenticatedApi.get(`/api/mtn/poolcars/${id}`);
      const payload = res?.data as any;
      const data = payload?.data ?? payload; // support either shape
      setDetail(data || null);
    } catch (e) {
      toast.error('Failed to load application details');
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (selectedId) loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  // Load poolcar fleet (active assets with purpose=pool)
  const loadFleet = React.useCallback(async () => {
    setFleetLoading(true);
    try {
      const res = await authenticatedApi.get(`/api/assets?status=active&purpose=pool`);
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
      setFleet(list);
    } catch (e) {
      toast.error('Failed to load poolcar fleet');
      setFleet([]);
    } finally {
      setFleetLoading(false);
    }
  }, []);

  // Load availability map for poolcars
  const loadAvailability = React.useCallback(async () => {
    setAvailabilityLoading(true);
    try {
      const res = await authenticatedApi.get(`/api/mtn/poolcars/available`);
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
      const map: Record<number, any> = {};
      for (const it of list) {
        const aid = Number(it.asset_id);
        if (!Number.isNaN(aid)) map[aid] = it;
      }
      setAvailability(map);
    } catch (e) {
      toast.error('Failed to load poolcar availability');
      setAvailability({});
    } finally {
      setAvailabilityLoading(false);
    }
  }, []);

  // Load fleet and availability when viewing an application
  React.useEffect(() => {
    if (selectedId) {
      loadFleet();
      loadAvailability();
    }
  }, [selectedId, loadFleet, loadAvailability]);

  // Build calendar bookings for current month based on loaded rows
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

  // When a row is double-clicked, navigate to this page with the id param
  const handleRowDoubleClick = (row: PoolcarRecord) => {
    const id = row?.id;
    if (id !== undefined && id !== null) {
      router.push(`/mtn/poolcar/mgmt?id=${encodeURIComponent(String(id))}`);
    }
  };

  // If an item is selected, render 3-pane admin view
  if (selectedId) {
    const d = detail;
    const fmt = (v?: string) => (v ? formatDMYHM(v) : '-');
    const safe = (v: any, fallback = '-') => (v === null || v === undefined || v === '' ? fallback : v);

    return (
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-lg font-semibold">Poolcar Management</div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/mtn/poolcar/mgmt')}
            >
              Back to List
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-stretch">
          {/* Left Pane: Application Details */}
          <div className="md:col-span-4 space-y-3 flex flex-col">
            <Card className="h-full flex flex-col">
              <CardHeader className="py-3">
                <CardTitle className="text-base">Application Details #{selectedId}</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-auto">
                {detailLoading ? (
                  <div className="text-sm text-muted-foreground">Loading details...</div>
                ) : d ? (
                  <div className="text-sm space-y-2">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="text-muted-foreground">Requested</div>
                      <div className="col-span-2">{formatDMY(d.pcar_datereq)}</div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="text-muted-foreground">Employee</div>
                      <div className="col-span-2">{safe(d.pcar_empid?.full_name || d.pcar_empid?.ramco_id)}</div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="text-muted-foreground">Contact</div>
                      <div className="col-span-2">{safe(d.ctc_m)}</div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="text-muted-foreground">Dept / Location</div>
                      <div className="col-span-2">{safe(d.department?.code || d.dept_id)} • {safe(d.location?.name || d.loc_id)}</div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="text-muted-foreground">Type</div>
                      <div className="col-span-2">{getPoolcarTypeLabel(d.pcar_type)}</div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="text-muted-foreground">From</div>
                      <div className="col-span-2">{fmt(d.pcar_datefr)}</div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="text-muted-foreground">To</div>
                      <div className="col-span-2">{fmt(d.pcar_dateto)}</div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="text-muted-foreground">Duration</div>
                      <div className="col-span-2">{`${d.pcar_day ?? 0}d ${d.pcar_hour ?? 0}h`}</div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="text-muted-foreground">Destination</div>
                      <div className="col-span-2">{safe(d.pcar_dest)}</div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="text-muted-foreground">Purpose</div>
                      <div className="col-span-2">{safe(d.pcar_purp)}</div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="text-muted-foreground">Options</div>
                      <div className="col-span-2">
                        {(() => {
                          const normalize = (s: string) => {
                            const n = String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
                            if (n === 'tng') return 'touchngo';
                            if (n === 'touchn' + 'go' || n === 'touchandgo') return 'touchngo';
                            if (n === 'smarttagdevice') return 'smarttag';
                            return n;
                          };
                          const optRaw = String(d.pcar_opt ?? '');
                          const tokenList = optRaw
                            .split(',')
                            .map(s => s.trim())
                            .filter(Boolean)
                            .map(normalize);
                          const tokens = new Set(tokenList);
                          const items: { key: string; label: string; checked: boolean }[] = [
                            { key: 'fleetcard', label: 'Fleetcard', checked: tokens.has('fleetcard') },
                            { key: 'touchngo', label: "Touch n' Go", checked: tokens.has('touchngo') },
                            { key: 'smarttag', label: 'Smart TAG device', checked: tokens.has('smarttag') },
                            { key: 'driver', label: 'Driver', checked: tokens.has('driver') },
                          ];
                          return (
                            <ul className="space-y-1">
                              {items.map(it => (
                                <li key={it.key} className="flex items-center gap-2">
                                  {it.checked ? (
                                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                  ) : (
                                    <Circle className="h-4 w-4 text-muted-foreground" />
                                  )}
                                  <span className={it.checked ? '' : 'line-through text-muted-foreground'}>{it.label}</span>
                                </li>
                              ))}
                            </ul>
                          );
                        })()}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="text-muted-foreground">Vehicle</div>
                      <div className="col-span-2">{safe(d.asset?.register_number || d.vehicle_id)}</div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="text-muted-foreground">Driver</div>
                      <div className="col-span-2">{safe(d.pcar_driver?.full_name || d.pcar_driver?.ramco_id)}</div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="text-muted-foreground">Passengers</div>
                      <div className="col-span-2">
                        {Array.isArray(d.passenger) && d.passenger.length > 0 ? (
                          <ol className="list-decimal pl-5 space-y-0.5">
                            {d.passenger.map((p: any, idx: number) => (
                              <li key={idx} className="marker:text-muted-foreground">
                                {p.full_name || p.ramco_id}
                              </li>
                            ))}
                          </ol>
                        ) : (
                          <div>-</div>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="text-muted-foreground">Recommendation</div>
                      <div className="col-span-2">
                        {renderStatusCell(d.recommendation_stat, d.recommendation_date)}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="text-muted-foreground">Approval</div>
                      <div className="col-span-2">
                        {renderStatusCell(d.approval_stat, d.approval_date)}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="text-muted-foreground">Return</div>
                      <div className="col-span-2">{formatReturnDateTime(d.pcar_retdate, d.pcar_rettime)}</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">No details available.</div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Area (2/3 width): Fleet with two-side layout */}
          <div className="md:col-span-8 space-y-3 flex flex-col">
            <Card className="h-full flex flex-col">
              <CardHeader className="py-3">
                <CardTitle className="text-base">Poolcar Fleet</CardTitle>
              </CardHeader>
              <CardContent className="flex-1">
                {fleetLoading || availabilityLoading ? (
                  <div className="text-sm text-muted-foreground">Loading fleet...</div>
                ) : (
                  <div className="h-full grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Left division: Summary + scrollable list */}
                    <div className="flex flex-col h-full">
                      {/* Summary badges */}
                      {(() => {
                        const total = fleet.length;
                        const isAvailable = (assetId: number) => {
                          const st = availability[assetId]?.status;
                          return (st ? String(st).toLowerCase() : 'available') === 'available';
                        };
                        const availableCount = fleet.reduce((acc, a) => acc + (isAvailable(Number(a?.id)) ? 1 : 0), 0);
                        const hiredCount = total - availableCount;
                        return (
                          <div className="mb-2 flex items-center gap-2">
                            <Badge variant="secondary">Total: {total}</Badge>
                            <Badge variant="secondary" className="bg-emerald-600 text-white border-emerald-600">Available: {availableCount}</Badge>
                            <Badge variant="destructive" className='text-white'>Hired: {hiredCount}</Badge>
                          </div>
                        );
                      })()}

                      {/* Fleet list fills remaining height */}
                      <div className="flex-1 border border-border rounded-sm divide-y divide-border overflow-auto">
                        {fleet.map((a) => {
                          const aid = Number(a?.id);
                          const info = availability[aid];
                          const status = String(info?.status || 'available').toLowerCase();
                          const isAvail = status === 'available';
                          const isSelected = selectedAssetId === aid;
                          return (
                            <div
                              key={aid}
                              className={`p-2 flex items-center justify-between gap-3 transition ${isAvail ? 'cursor-pointer hover:bg-accent/40' : 'cursor-not-allowed opacity-80'} ${isSelected ? 'ring-2 ring-primary/70 bg-primary/5' : ''}`}
                              onClick={() => {
                                if (!isAvail) return;
                                setSelectedAssetId(prev => (prev === aid ? null : aid));
                              }}
                              role={isAvail ? 'button' : undefined}
                              aria-disabled={!isAvail}
                              aria-selected={isSelected}
                            >
                              <div className="min-w-0">
                                <div className="font-medium truncate">{a?.register_number || `Asset #${aid}`}</div>
                                <div className="text-xs text-muted-foreground truncate">
                                  {a?.brand?.name ?? ''} {a?.model?.name ?? ''} • {a?.category?.name ?? ''}
                                </div>
                              </div>
                              <div className="shrink-0 text-right">
                                {isAvail ? (
                                  isSelected ? (
                                    <Badge variant="secondary" className="bg-primary text-primary-foreground border-primary">selected</Badge>
                                  ) : (
                                    <Badge variant="secondary" className="bg-emerald-600 text-white border-emerald-600">available</Badge>
                                  )
                                ) : (
                                  <div className="flex flex-col items-end gap-1">
                                    <Badge variant="destructive" className='text-white'>hired</Badge>
                                    {info?.pcar_id && (
                                      <div className="text-[10px] text-muted-foreground">req #{info.pcar_id}</div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                        {fleet.length === 0 && (
                          <div className="p-3 text-sm text-muted-foreground">No poolcars found.</div>
                        )}
                      </div>
                    </div>

                    {/* Right division: Form area and actions */}
                    <div className="flex flex-col h-full border border-border rounded-sm p-3">
                      <div className="text-sm font-semibold mb-2">Assignment Form</div>
                      <div className="text-xs text-muted-foreground mb-3">
                        Select an available poolcar on the left.
                      </div>

                      <div className="mt-auto flex items-center justify-between gap-3">
                        <div className="text-xs text-muted-foreground truncate">
                          {selectedAssetId
                            ? (() => {
                                const selected = fleet.find((f) => Number(f?.id) === selectedAssetId);
                                const plate = selected?.register_number || `Asset #${selectedAssetId}`;
                                return `Selected: ${plate}`;
                              })()
                            : 'No poolcar selected'}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={!selectedAssetId}
                            onClick={() => setSelectedAssetId(null)}
                          >
                            Clear
                          </Button>
                          <Button
                            size="sm"
                            disabled={!selectedAssetId}
                            onClick={() => {
                              if (!selectedId || !selectedAssetId) return;
                              toast.info('Attach action pending API spec');
                            }}
                          >
                            Attach to Request
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
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
        <div className="text-lg font-semibold">Poolcar Management</div>
        <div className="flex items-center gap-2">
          <Input placeholder="Filter by status (e.g. pending)" className="h-8 w-56"
                 value={statusFilter}
                 onChange={e => setStatusFilter(e.target.value)} />
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="p-4 text-sm text-muted-foreground">Loading...</div>
      ) : (
        <div className="min-w-full">
          <CustomDataGrid<PoolcarRecord>
            data={rows}
            columns={columns}
            pagination={false}
            inputFilter={false}
            dataExport={false}
            theme="sm"
            onRowDoubleClick={handleRowDoubleClick}
            rowClass={(row) =>
              isPendingStatus(row.recommendationStat) || isPendingStatus(row.approvalStat)
                ? 'bg-amber-50 dark:bg-amber-900/20'
                : ''
            }
          />
        </div>
      )}
    </div>
  );
};

export default PoolcarMgmt;
