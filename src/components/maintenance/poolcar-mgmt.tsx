'use client';
import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthContext } from '@/store/AuthContext';
import { authenticatedApi } from '@/config/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CustomDataGrid } from '@/components/ui/DataGrid';
import type { ColumnDef } from '@/components/ui/DataGrid';
import { Ban, CheckCircle2, Clock, RefreshCw, Circle, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import PoolcarCalendar from './poolcar-calendar';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Combobox, ComboboxOption } from '@/components/ui/combobox';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

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
  approvalStat?: number | string | null;
  approvalDate?: string;
  returnAt?: string;
  __raw?: any;
};

type AssignmentFormState = {
  selectedAssetId: number | null;
  fleetcardChecked: boolean;
  fleetcardSelection: string;
  touchngoChecked: boolean;
  touchngoSelection: string;
  smarttagChecked: boolean;
  smarttagSerial: string;
  cancelChecked: boolean;
  cancelReason: string;
};

type SelectOption = ComboboxOption;

type PoolcarOptionToken = 'fleetcard' | 'touchngo' | 'smarttag' | 'driver' | string;

function createEmptyAssignmentFormState(): AssignmentFormState {
  return {
    selectedAssetId: null,
    fleetcardChecked: false,
    fleetcardSelection: '',
    touchngoChecked: false,
    touchngoSelection: '',
    smarttagChecked: false,
    smarttagSerial: '',
    cancelChecked: false,
    cancelReason: '',
  };
}

function cloneAssignmentFormState(state: AssignmentFormState): AssignmentFormState {
  return { ...state };
}

function listFromApiPayload(payload: any): any[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.result)) return payload.result;
  if (Array.isArray(payload?.rows)) return payload.rows;
  return [];
}

function deriveOptionValue(item: any): string | null {
  const candidates = [
    item?.id,
    item?.tng_id,
    item?.fleetcard_id,
    item?.value,
    item?.code,
    item?.uuid,
    item?.card_id,
    item?.card_no,
    item?.card_number,
    item?.number,
    item?.ref_no,
  ];
  for (const candidate of candidates) {
    if (candidate === null || candidate === undefined || candidate === '') continue;
    return String(candidate);
  }
  return null;
}

function deriveOptionLabel(item: any, fallback?: string): string {
  const candidates = [
    item?.name,
    item?.label,
    item?.description,
    item?.card_no,
    item?.card_number,
    item?.number,
    item?.title,
  ];
  for (const candidate of candidates) {
    if (candidate === null || candidate === undefined || candidate === '') continue;
    return String(candidate);
  }
  if (fallback) return fallback;
  return 'Unknown';
}

function buildSelectOptions(
  items: any[],
  labelBuilder?: (item: any, value: string) => string,
): SelectOption[] {
  const seen = new Set<string>();
  const options: SelectOption[] = [];
  items.forEach((item) => {
    const value = deriveOptionValue(item);
    if (!value || seen.has(value)) return;
    const label = labelBuilder ? labelBuilder(item, value) : deriveOptionLabel(item, value);
    options.push({ value, label });
    seen.add(value);
  });
  return options;
}

function formatCurrencyLabel(prefix: string, value: any): string | null {
  if (value === null || value === undefined || value === '') return null;
  const numeric = Number(value);
  if (!Number.isNaN(numeric)) {
    return `${prefix}${numeric.toFixed(2)}`;
  }
  const trimmed = String(value).trim();
  return trimmed ? `${prefix}${trimmed}` : null;
}

function parseOptionalNumber(value: any): number | null {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  return Number.isNaN(num) ? null : num;
}

function formatDateTimeForPayload(date: Date): string {
  const pad = (v: number) => String(v).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function resolveUsername(auth: any): string {
  const direct =
    auth?.authData?.user?.username ||
    auth?.user?.username ||
    auth?.username ||
    auth?.authData?.username ||
    '';
  if (direct) return String(direct);
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('authData');
      if (stored) {
        const parsed = JSON.parse(stored);
        return (
          parsed?.user?.username ||
          parsed?.username ||
          ''
        );
      }
    } catch {
      // ignore parse errors
    }
  }
  return '';
}

function normalizePoolcarOption(value: any): PoolcarOptionToken | null {
  if (value === null || value === undefined) return null;
  const normalized = String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
  if (!normalized) return null;
  if (normalized === 'tng' || normalized === 'touchn' + 'go' || normalized === 'touchandgo') return 'touchngo';
  if (normalized === 'smarttagdevice' || normalized === 'smarttagid') return 'smarttag';
  return normalized;
}

function extractPoolcarOptions(raw: any): Set<PoolcarOptionToken> {
  const tokens = new Set<PoolcarOptionToken>();
  if (raw === null || raw === undefined) return tokens;
  const str = String(raw);
  str
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .forEach((part) => {
      const normalized = normalizePoolcarOption(part);
      if (normalized) tokens.add(normalized);
    });
  return tokens;
}

function getPoolcarOptionLabel(token: PoolcarOptionToken): string {
  switch (token) {
    case 'fleetcard':
      return 'Fleetcard';
    case 'touchngo':
      return "Touch n' Go";
    case 'smarttag':
      return 'Smart TAG device';
    case 'driver':
      return 'Driver';
    default:
      return String(token);
  }
}

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
  const [formState, setFormState] = React.useState<AssignmentFormState>(() => createEmptyAssignmentFormState());
  const initialFormRef = React.useRef<AssignmentFormState>(cloneAssignmentFormState(createEmptyAssignmentFormState()));
  const [fleetcardOptions, setFleetcardOptions] = React.useState<SelectOption[]>([]);
  const [tngOptions, setTngOptions] = React.useState<SelectOption[]>([]);
  const [fleetcardLoading, setFleetcardLoading] = React.useState(false);
  const [tngLoading, setTngLoading] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const confirmActionRef = React.useRef<(() => void) | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [successOpen, setSuccessOpen] = React.useState(false);
  const optionTokens = React.useMemo(() => extractPoolcarOptions(detail?.pcar_opt), [detail?.pcar_opt]);
  const showFleetcardRow = optionTokens.has('fleetcard');
  const showTouchngoRow = optionTokens.has('touchngo');
  const showSmarttagRow = optionTokens.has('smarttag');
  const isFormDirty = React.useMemo(() => {
    return JSON.stringify(formState) !== JSON.stringify(initialFormRef.current);
  }, [formState]);

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

  const fetchFleetcardOptionList = React.useCallback(async () => {
    setFleetcardLoading(true);
    try {
      const res = await authenticatedApi.get(`/api/bills/fleet`);
      const items = listFromApiPayload(res?.data);
      setFleetcardOptions(
        buildSelectOptions(items, (item, value) => {
          const cardNo = item?.card_no || item?.card_number || value;
          const plate = item?.asset?.register_number || item?.vehicle_regno || item?.pcar_poolcar;
          const vendor = item?.vendor?.name;
          const parts: string[] = [];
          parts.push(String(cardNo || value));
          if (plate) parts.push(`• ${String(plate)}`);
          if (vendor) parts.push(`(${String(vendor)})`);
          return parts.join(' ');
        }),
      );
    } catch (e) {
      toast.error('Failed to load fleetcard options');
      setFleetcardOptions([]);
    } finally {
      setFleetcardLoading(false);
    }
  }, []);

  const fetchTngOptionList = React.useCallback(async () => {
    setTngLoading(true);
    try {
      const res = await authenticatedApi.get(`/api/mtn/tng`);
      const items = listFromApiPayload(res?.data);
      setTngOptions(
        buildSelectOptions(items, (item, value) => {
          const serial = item?.tng_sn || value;
          const tagName = item?.tng_tagname;
          const balanceLabel = formatCurrencyLabel('RM ', item?.tng_bal);
          const parts = [`SN ${serial}`];
          const meta: string[] = [];
          if (tagName) meta.push(String(tagName));
          if (balanceLabel) meta.push(`Balance ${balanceLabel}`);
          if (meta.length > 0) {
            parts.push(`• ${meta.join(' • ')}`);
          }
          return parts.join(' ');
        }),
      );
    } catch (e) {
      toast.error("Failed to load Touch n' Go options");
      setTngOptions([]);
    } finally {
      setTngLoading(false);
    }
  }, []);

  // Load fleet and availability when viewing an application
  React.useEffect(() => {
    if (selectedId) {
      loadFleet();
      loadAvailability();
    }
  }, [selectedId, loadFleet, loadAvailability]);

  React.useEffect(() => {
    if (!detail) return;
    const tokens = extractPoolcarOptions(detail?.pcar_opt);
    const nextState = createEmptyAssignmentFormState();
    const assignedAssetId = Number(detail?.asset?.id ?? detail?.vehicle_id);
    if (!Number.isNaN(assignedAssetId)) {
      nextState.selectedAssetId = assignedAssetId;
    }
    if (tokens.has('fleetcard')) nextState.fleetcardChecked = true;
    if (tokens.has('touchngo')) nextState.touchngoChecked = true;
    if (tokens.has('smarttag')) nextState.smarttagChecked = true;
    const smarttagSerialCandidate =
      detail?.smart_tag_serial ??
      detail?.smarttag_serial ??
      detail?.pcar_smarttag_serial ??
      detail?.pcar_smarttagid ??
      detail?.smarttag_id ??
      '';
    if (smarttagSerialCandidate !== null && smarttagSerialCandidate !== undefined && smarttagSerialCandidate !== '') {
      nextState.smarttagSerial = String(smarttagSerialCandidate);
    }
    setFormState(nextState);
    initialFormRef.current = cloneAssignmentFormState(nextState);
  }, [detail]);

  React.useEffect(() => {
    if (!selectedId) {
      setFleetcardOptions([]);
      setTngOptions([]);
      return;
    }
    if (showFleetcardRow) {
      fetchFleetcardOptionList();
    } else {
      setFleetcardOptions([]);
    }
    if (showTouchngoRow) {
      fetchTngOptionList();
    } else {
      setTngOptions([]);
    }
  }, [selectedId, showFleetcardRow, showTouchngoRow, fetchFleetcardOptionList, fetchTngOptionList]);

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

  const recordIds = React.useMemo(() => rows.map((r) => String(r.id)), [rows]);
  const normalizedSelectedId = selectedId ? String(selectedId) : null;
  const selectedIndex = React.useMemo(() => {
    if (!normalizedSelectedId) return -1;
    return recordIds.findIndex((id) => id === normalizedSelectedId);
  }, [recordIds, normalizedSelectedId]);
  const prevRecordId = selectedIndex > 0 ? recordIds[selectedIndex - 1] : null;
  const nextRecordId =
    selectedIndex >= 0 && selectedIndex < recordIds.length - 1 ? recordIds[selectedIndex + 1] : null;
  const detailOptionItems = React.useMemo(() => {
    const keys: PoolcarOptionToken[] = ['fleetcard', 'touchngo', 'smarttag', 'driver'];
    return keys.map((key) => ({
      key,
      label: getPoolcarOptionLabel(key),
      checked: optionTokens.has(key),
    }));
  }, [optionTokens]);
  const selectedAsset = React.useMemo(() => {
    if (!formState.selectedAssetId) return null;
    return fleet.find((f) => Number(f?.id) === formState.selectedAssetId) ?? null;
  }, [formState.selectedAssetId, fleet]);

  // When a row is double-clicked, navigate to this page with the id param
  const handleRowDoubleClick = (row: PoolcarRecord) => {
    const id = row?.id;
    if (id !== undefined && id !== null) {
      router.push(`/mtn/poolcar/mgmt?id=${encodeURIComponent(String(id))}`);
    }
  };

  const executeWithUnsavedGuard = React.useCallback(
    (action: () => void) => {
      if (isFormDirty) {
        confirmActionRef.current = action;
        setConfirmOpen(true);
      } else {
        action();
      }
    },
    [isFormDirty],
  );

  const handleConfirmDialogChange = React.useCallback((open: boolean) => {
    if (!open) {
      confirmActionRef.current = null;
    }
    setConfirmOpen(open);
  }, []);

  const handleConfirmLeave = React.useCallback(() => {
    const action = confirmActionRef.current;
    confirmActionRef.current = null;
    setConfirmOpen(false);
    if (action) action();
  }, []);

  const handleConfirmStay = React.useCallback(() => {
    confirmActionRef.current = null;
    setConfirmOpen(false);
  }, []);

  const handleBackToList = React.useCallback(() => {
    executeWithUnsavedGuard(() => router.push('/mtn/poolcar/mgmt'));
  }, [executeWithUnsavedGuard, router]);

  const handleNavigateToRecord = React.useCallback(
    (targetId: string | null) => {
      if (!targetId) return;
      executeWithUnsavedGuard(() => router.push(`/mtn/poolcar/mgmt?id=${encodeURIComponent(targetId)}`));
    },
    [executeWithUnsavedGuard, router],
  );

  const handleCancelForm = React.useCallback(() => {
    executeWithUnsavedGuard(() => router.push('/mtn/poolcar/mgmt'));
  }, [executeWithUnsavedGuard, router]);

  const handleResetForm = React.useCallback(() => {
    if (!initialFormRef.current) return;
    setFormState(cloneAssignmentFormState(initialFormRef.current));
  }, []);

  const handleSuccessStay = React.useCallback(() => {
    setSuccessOpen(false);
  }, []);

  const handleSuccessBack = React.useCallback(() => {
    setSuccessOpen(false);
    router.push('/mtn/poolcar/mgmt');
  }, [router]);

  const handleSaveForm = React.useCallback(async () => {
    if (!selectedId) {
      toast.error('No poolcar request selected');
      return;
    }

    const username = resolveUsername(auth);
    const pcarId = Number(selectedId);
    if (Number.isNaN(pcarId)) {
      toast.error('Invalid poolcar request ID.');
      return;
    }
    const isCancelled =
      formState.cancelChecked ||
      (formState.cancelReason && formState.cancelReason.trim().length > 0);

    const assetId = isCancelled ? null : formState.selectedAssetId;
    const fleetcardId = isCancelled ? null : parseOptionalNumber(formState.fleetcardSelection);
    const tngId = parseOptionalNumber(formState.touchngoSelection);

    if (!isCancelled) {
      if (!assetId) {
        toast.error('Select a poolcar asset before saving.');
        return;
      }
      if (showFleetcardRow) {
        if (!formState.fleetcardChecked) {
          toast.error('Fleetcard is required for this application.');
          return;
        }
        if (!fleetcardId) {
          toast.error('Select a fleetcard.');
          return;
        }
      }
      if (showTouchngoRow && formState.touchngoChecked && !tngId) {
        toast.error("Select a Touch n' Go card.");
        return;
      }
      if (!username) {
        toast.error('Unable to determine current user for approval.');
        return;
      }
    } else if (!username) {
      toast.error('Unable to determine current user for cancellation.');
      return;
    }

    const now = new Date();
    const formattedNow = formatDateTimeForPayload(now);
    const payload = {
      pcar_id: pcarId,
      tng_id: tngId,
      fleetcard_id: fleetcardId,
      asset_id: assetId,
      approval: isCancelled ? null : username,
      approval_stat: isCancelled ? null : 1,
      approval_date: isCancelled ? null : formattedNow,
      pcar_cancel: isCancelled ? true : false,
      cancel_date: isCancelled ? formattedNow : null,
      cancel_by: isCancelled ? username : null,
      pcar_canrem: isCancelled ? (formState.cancelReason?.trim() || null) : null,
    };

    setSaving(true);
    try {
      await authenticatedApi.put(`/api/mtn/poolcars/${selectedId}/admin`, payload);
      toast.success('Assignment updated');
      initialFormRef.current = cloneAssignmentFormState(formState);
      await Promise.all([loadDetail(String(selectedId)), loadData()]);
      setSuccessOpen(true);
    } catch (error) {
      console.error('Failed to save assignment', error);
      toast.error('Failed to save assignment');
    } finally {
      setSaving(false);
    }
  }, [
    selectedId,
    formState,
    auth,
    showFleetcardRow,
    showTouchngoRow,
    loadDetail,
    loadData,
  ]);

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
              onClick={handleBackToList}
            >
              Back to List
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-stretch">
          {/* Left Pane: Application Details */}
          <div className="md:col-span-4 space-y-3 flex flex-col">
            <Card className="h-full flex flex-col">
              <CardHeader className="py-3 flex items-center justify-between gap-2">
                <CardTitle className="text-base">Application Details #{selectedId}</CardTitle>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    disabled={!prevRecordId}
                    onClick={() => handleNavigateToRecord(prevRecordId)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    disabled={!nextRecordId}
                    onClick={() => handleNavigateToRecord(nextRecordId)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
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
                        <ul className="space-y-1">
                          {detailOptionItems.map((it) => (
                            <li key={it.key} className="flex items-center gap-2">
                              {it.checked ? (
                                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                              ) : (
                                <Circle className="h-4 w-4 text-muted-foreground" />
                              )}
                              <span className={it.checked ? '' : 'line-through text-muted-foreground'}>
                                {it.label}
                              </span>
                            </li>
                          ))}
                        </ul>
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
                          const isSelected = formState.selectedAssetId === aid;
                          return (
                            <div
                              key={aid}
                              className={`p-2 flex items-center justify-between gap-3 transition ${isAvail ? 'cursor-pointer hover:bg-accent/40' : 'cursor-not-allowed opacity-80'} ${isSelected ? 'ring-2 ring-primary/70 bg-primary/5' : ''}`}
                              onClick={() => {
                                if (!isAvail) return;
                                setFormState((prev) => {
                                  const nextId = prev.selectedAssetId === aid ? null : aid;
                                  return { ...prev, selectedAssetId: nextId };
                                });
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
                      <div className="text-sm font-semibold">Assignment Form</div>
                      <div className="text-xs text-muted-foreground">
                        Select an available poolcar on the left.
                      </div>

                      <div className="mt-3 space-y-4 flex-1 overflow-auto">
                        <div className="rounded-sm border border-dashed border-border/70 bg-muted/20 p-2 text-xs">
                          {formState.selectedAssetId && selectedAsset ? (
                            <>
                              <div className="text-sm font-medium">
                                {selectedAsset.register_number || `Asset #${formState.selectedAssetId}`}
                              </div>
                              <div className="text-muted-foreground">
                                {[selectedAsset.brand?.name, selectedAsset.model?.name, selectedAsset.category?.name]
                                  .filter(Boolean)
                                  .join(' • ')}
                              </div>
                            </>
                          ) : (
                            <span className="text-muted-foreground">No poolcar selected yet.</span>
                          )}
                        </div>

                        {showFleetcardRow && (
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-3">
                              <Checkbox
                                id="option-fleetcard"
                                checked={formState.fleetcardChecked}
                                onCheckedChange={(checked) => {
                                  const enabled = checked === true;
                                  setFormState((prev) => ({
                                    ...prev,
                                    fleetcardChecked: enabled,
                                    fleetcardSelection: enabled ? prev.fleetcardSelection : '',
                                  }));
                                }}
                              />
                              <Label htmlFor="option-fleetcard" className="text-sm font-medium">
                                Fleetcard
                              </Label>
                              <div className="min-w-[200px] flex-1">
                                <Combobox
                                  options={fleetcardOptions}
                                  value={formState.fleetcardSelection}
                                  onValueChange={(value) =>
                                    setFormState((prev) => ({ ...prev, fleetcardSelection: value }))
                                  }
                                  disabled={!formState.fleetcardChecked || fleetcardLoading}
                                  placeholder={fleetcardLoading ? 'Loading...' : 'Select fleetcard'}
                                  searchPlaceholder="Search fleetcard..."
                                  emptyMessage="No fleetcard found."
                                  clearable
                                />
                              </div>
                            </div>
                            {!fleetcardLoading && formState.fleetcardChecked && fleetcardOptions.length === 0 && (
                              <div className="pl-7 text-xs text-muted-foreground">No fleetcard available.</div>
                            )}
                          </div>
                        )}

                        {showTouchngoRow && (
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-3">
                              <Checkbox
                                id="option-touchngo"
                                checked={formState.touchngoChecked}
                                onCheckedChange={(checked) => {
                                  const enabled = checked === true;
                                  setFormState((prev) => ({
                                    ...prev,
                                    touchngoChecked: enabled,
                                    touchngoSelection: enabled ? prev.touchngoSelection : '',
                                  }));
                                }}
                              />
                              <Label htmlFor="option-touchngo" className="text-sm font-medium">
                                Touch n&apos; Go
                              </Label>
                              <div className="min-w-[200px] flex-1">
                                <Combobox
                                  options={tngOptions}
                                  value={formState.touchngoSelection}
                                  onValueChange={(value) =>
                                    setFormState((prev) => ({ ...prev, touchngoSelection: value }))
                                  }
                                  disabled={!formState.touchngoChecked || tngLoading}
                                  placeholder={tngLoading ? 'Loading...' : "Select Touch n' Go"}
                                  searchPlaceholder="Search Touch n' Go..."
                                  emptyMessage="No Touch n' Go option available."
                                  clearable
                                />
                              </div>
                            </div>
                            {!tngLoading && formState.touchngoChecked && tngOptions.length === 0 && (
                              <div className="pl-7 text-xs text-muted-foreground">No Touch n&apos; Go option available.</div>
                            )}
                          </div>
                        )}

                        {showSmarttagRow && (
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-3">
                              <Checkbox
                                id="option-smarttag"
                                checked={formState.smarttagChecked}
                                onCheckedChange={(checked) => {
                                  const enabled = checked === true;
                                  setFormState((prev) => ({
                                    ...prev,
                                    smarttagChecked: enabled,
                                    smarttagSerial: enabled ? prev.smarttagSerial : '',
                                  }));
                                }}
                              />
                              <Label htmlFor="option-smarttag" className="text-sm font-medium">
                                Smart TAG device
                              </Label>
                              <div className="min-w-[200px] flex-1">
                                <Input
                                  placeholder="Serial number"
                                  value={formState.smarttagSerial}
                                  onChange={(event) =>
                                    setFormState((prev) => ({ ...prev, smarttagSerial: event.target.value }))
                                  }
                                  disabled={!formState.smarttagChecked}
                                />
                              </div>
                            </div>
                            {formState.smarttagChecked && (
                              <div className="pl-7 text-xs text-muted-foreground">
                                Provide the device serial number for record keeping.
                              </div>
                            )}
                          </div>
                        )}

                        {(showFleetcardRow || showTouchngoRow || showSmarttagRow) && <Separator />}

                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-3">
                            <Checkbox
                              id="option-cancel"
                              checked={formState.cancelChecked}
                              onCheckedChange={(checked) => {
                                const enabled = checked === true;
                                setFormState((prev) => ({
                                  ...prev,
                                  cancelChecked: enabled,
                                  cancelReason: enabled ? prev.cancelReason : '',
                                }));
                              }}
                            />
                            <Label htmlFor="option-cancel" className="text-sm font-medium">
                              Cancellation by admin
                            </Label>
                          </div>
                          <div className="pl-7 space-y-2">
                            <div className="text-xs text-muted-foreground">
                              Enable this option to cancel the application and capture the reason.
                            </div>
                            <Textarea
                              placeholder="State the cancellation reason"
                              value={formState.cancelReason}
                              onChange={(event) =>
                                setFormState((prev) => ({ ...prev, cancelReason: event.target.value }))
                              }
                              disabled={!formState.cancelChecked}
                              rows={4}
                            />
                          </div>
                        </div>
                      </div>

                      <Separator className="my-3" />

                      <div className="flex items-center justify-between gap-3">
                        <div className="text-xs text-muted-foreground truncate">
                          {formState.selectedAssetId && selectedAsset
                            ? (() => {
                                const plate = selectedAsset.register_number || `Asset #${formState.selectedAssetId}`;
                                return `Selected poolcar: ${plate}`;
                              })()
                            : 'No poolcar selected'}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleResetForm}
                            disabled={!isFormDirty || saving}
                          >
                            Reset
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCancelForm}
                            disabled={saving}
                          >
                            Cancel
                          </Button>
                          <Button size="sm" onClick={handleSaveForm} disabled={saving}>
                            {saving ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              'Save'
                            )}
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

      <AlertDialog open={successOpen} onOpenChange={setSuccessOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Assignment saved</AlertDialogTitle>
            <AlertDialogDescription>
              The poolcar assignment was updated successfully.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleSuccessStay}>Stay</AlertDialogCancel>
            <AlertDialogAction onClick={handleSuccessBack}>Back to list</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmOpen} onOpenChange={handleConfirmDialogChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Are you sure you want to leave this page?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleConfirmStay}>Stay</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmLeave}>Leave</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
              isPendingStatus(row.approvalStat) ? 'bg-amber-50 dark:bg-amber-900/20' : ''
            }
          />
        </div>
      )}
    </div>
  );
};

export default PoolcarMgmt;
