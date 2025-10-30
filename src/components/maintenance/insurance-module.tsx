'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import ActionSidebar from '@/components/ui/action-aside';
import { authenticatedApi } from '@/config/api';
import { toast } from 'sonner';
import { Plus, RefreshCcw, Search, Save, X, Pencil, Target, Loader2 } from 'lucide-react';
import { CustomDataGrid } from '@/components/ui/DataGrid';
import type { ColumnDef } from '@/components/ui/DataGrid';
import { Separator } from '@/components/ui/separator';

type Vehicle = {
  id: number | string;
  register_number?: string;
  plate_no?: string; // legacy fallback
  models?: { id: number; name: string } | null;
  brands?: { id: number; name: string } | null;
  costcenter?: { id: number; name: string } | null;
  location?: { id: number; name: string } | null;
  classification?: string | { name?: string } | null;
};

// API response row for listing (new /api/mtn/roadtax)
type RoadtaxApiRow = {
  rt_id: number;
  insurance?: {
    id: number;
    insurer: string;
    policy: string;
    expiry: string | null;
    upload?: string | null;
  } | null;
  asset: {
    id: number;
    register_number: string;
    costcenter?: { id: number; name: string } | null;
    department?: { id: number; name: string } | null;
    location?: { id: number; name: string } | null;
    category?: { id: number; name: string } | null;
    brand?: { id: number; name: string } | null;
  };
  roadtax_expiry?: string | null;
  // Virtual keys for derived columns (for DataGrid typing only)
  row_no?: number;
  ins_remaining?: string;
  rt_remaining?: string;
  register_no?: string;
  costcenter_name?: string;
  department_name?: string;
  location_name?: string;
  insurer_name?: string;
  policy_no?: string;
  ins_exp?: string;
};

type InsuranceForm = {
  insurer: string;
  policy: string;
  expiry: string;
};

const emptyInsurance: InsuranceForm = {
  insurer: '',
  policy: '',
  expiry: '',
};

type UpdateRow = {
  id: number | string;
  register_number?: string;
  plate_no?: string;
  roadtax_expiry?: string | null;
  roadtax_price?: string | number | null;
};

const InsuranceModule: React.FC = () => {
  // Records
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<RoadtaxApiRow[]>([]);
  const [rtUpdateMode, setRtUpdateMode] = useState(false);
  const gridRef = React.useRef<{ clearSelectedRows: () => void; deselectRow: (key: string | number) => void } | null>(null);
  const [rtSelectedAssets, setRtSelectedAssets] = useState<string[]>([]);
  const [rtDate, setRtDate] = useState('');
  const [rtSubmitting, setRtSubmitting] = useState(false);

  // Create aside
  const [openCreate, setOpenCreate] = useState(false);
  const [insForm, setInsForm] = useState<InsuranceForm>(emptyInsurance);
  // simple insurance list below the form
  type SimpleInsurance = { id: number; insurer: string; policy: string; expiry: string | null };
  const [insList, setInsList] = useState<SimpleInsurance[]>([]);
  const [loadingInsList, setLoadingInsList] = useState(false);
  const [editingInsId, setEditingInsId] = useState<number | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehQuery, setVehQuery] = useState('');
  const [vehSelected, setVehSelected] = useState<Record<string | number, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [loadingVehicles, setLoadingVehicles] = useState(false);
  const vehicleListRef = React.useRef<HTMLDivElement | null>(null);
  const selectedVehCount = useMemo(() => Object.values(vehSelected).filter(Boolean).length, [vehSelected]);
  const canSubmit = useMemo(() => !!insForm.insurer && !!insForm.policy && !!insForm.expiry && selectedVehCount > 0, [insForm, selectedVehCount]);

  function resetInsurerForm() {
    setInsForm(emptyInsurance);
    setEditingInsId(null);
  }

  // Update aside
  const [openUpdate, setOpenUpdate] = useState(false);
  const [updateInsuranceId, setUpdateInsuranceId] = useState<string | number | null>(null);
  const [updateRows, setUpdateRows] = useState<UpdateRow[]>([]);
  const [savingUpdate, setSavingUpdate] = useState(false);
  const [loadingUpdate, setLoadingUpdate] = useState(false);
  const [updateSearch, setUpdateSearch] = useState('');

  async function loadRecords() {
    setLoading(true);
    try {
      // Roadtax listing replaced insurance listing
      const res: any = await authenticatedApi.get('/api/mtn/roadtax');
      const raw = res?.data?.data ?? res?.data ?? [];
      const data: RoadtaxApiRow[] = Array.isArray(raw) ? raw : [raw];
      setRecords(data.filter(Boolean));
    } catch (err) {
      console.error(err);
      toast.error('Failed to load roadtax records');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadRecords(); }, []);

  function fmtDate(value?: string | null) {
    if (!value) return '-';
    try {
      const d = new Date(value);
      if (isNaN(d.getTime())) return String(value).slice(0, 10);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    } catch {
      return String(value).slice(0, 10);
    }
  }

  // Expiry helpers and summary
  const isExpired = (value?: string | null) => {
    if (!value) return false;
    const d = new Date(value);
    if (isNaN(d.getTime())) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dd = new Date(d);
    dd.setHours(0, 0, 0, 0);
    return dd < today;
  };

  const summary = useMemo(() => {
    const total = records.length;
    let expiredIns = 0;
    let expiredRt = 0;
    for (const r of records) {
      if (isExpired(r.insurance?.expiry ?? null)) expiredIns += 1;
      if (isExpired(r.roadtax_expiry ?? null)) expiredRt += 1;
    }
    return { total, expiredIns, expiredRt };
  }, [records]);

  // Helpers to compute remaining months and days
  const startOfDay = (d: Date) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  };
  const daysInMonth = (year: number, monthZeroBased: number) => new Date(year, monthZeroBased + 1, 0).getDate();
  const addMonths = (date: Date, months: number) => {
    const y = date.getFullYear();
    const m = date.getMonth();
    const d = date.getDate();
    const totalMonths = m + months;
    const yy = y + Math.floor(totalMonths / 12);
    const mm = ((totalMonths % 12) + 12) % 12;
    const dd = Math.min(d, daysInMonth(yy, mm));
    const out = new Date(yy, mm, dd);
    out.setHours(0, 0, 0, 0);
    return out;
  };
  function diffMonthsDays(from: Date, to: Date) {
    const a = startOfDay(from);
    const b = startOfDay(to);
    const forward = b >= a;
    const start = forward ? a : b;
    const end = forward ? b : a;

    let months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    let anchor = addMonths(start, months);
    if (anchor > end) {
      months -= 1;
      anchor = addMonths(start, months);
    }
    const MS_DAY = 24 * 60 * 60 * 1000;
    const days = Math.max(0, Math.round((end.getTime() - anchor.getTime()) / MS_DAY));
    return { months, days, forward };
  }
  function remainingLabel(target?: string | null) {
    if (!target) return '-';
    const t = new Date(target);
    if (isNaN(t.getTime())) return '-';
    const now = new Date();
    const { months, days, forward } = diffMonthsDays(now, t);
    const label = `${months} mo ${days} d`;
    return (
      <span className={forward ? 'text-foreground' : 'text-red-600 dark:text-red-400'}>
        {forward ? label : `Overdue ${label}`}
      </span>
    );
  }

  // Styled variant for non-expired case
  function remainingLabelColored(target?: string | null, okClass?: string) {
    if (!target) return '-';
    const t = new Date(target);
    if (isNaN(t.getTime())) return '-';
    const now = new Date();
    const { months, days, forward } = diffMonthsDays(now, t);
    const label = `${months} mo ${days} d`;
    const ok = okClass || 'text-foreground';
    return (
      <span className={forward ? ok : 'text-red-600 dark:text-red-400'}>
        {forward ? label : `Overdue ${label}`}
      </span>
    );
  }

  const columns = useMemo<ColumnDef<RoadtaxApiRow>[]>(() => [
    {
      key: 'row_no',
      header: 'No',
      sortable: false,
      render: (_row, idx) => idx ?? '-',
    },
    {
      key: 'register_no',
      header: 'Assets',
      sortable: false,
      render: (row) => row.asset?.register_number || '-',
      filter: 'input',
    },
    {
      key: 'costcenter_name',
      header: 'Costcenter',
      sortable: true,
      render: (row) => row.asset?.costcenter?.name || '-',
      filter: 'singleSelect',
    },
    {
      key: 'department_name',
      header: 'Department',
      sortable: true,
      render: (row) => row.asset?.department?.name || '-',
      filter: 'singleSelect',
    },
    {
      key: 'location_name',
      header: 'Location',
      sortable: true,
      render: (row) => row.asset?.location?.name || '-',
      filter: 'singleSelect',
    },
    {
      key: 'insurer_name',
      header: 'Insurer',
      sortable: true,
      render: (row) => row.insurance?.insurer || '-',
      filter: 'singleSelect',
    },
    {
      key: 'policy_no',
      header: 'Policy',
      sortable: true,
      render: (row) => row.insurance?.policy || '-',
      filter: 'singleSelect',
    },
    {
      key: 'ins_exp',
      header: 'Expiry',
      sortable: true,
      render: (row) => fmtDate(row.insurance?.expiry ?? null),
    },
    {
      key: 'ins_remaining',
      header: 'Remaining',
      sortable: false,
      render: (row) => remainingLabel(row.insurance?.expiry ?? null),
    },
    {
      key: 'roadtax_expiry',
      header: 'Roadtax expiry',
      sortable: true,
      render: (row) => fmtDate(row.roadtax_expiry ?? null),
    },
    {
      key: 'rt_remaining',
      header: 'Roadtax remaining',
      sortable: false,
      render: (row) => remainingLabelColored(row.roadtax_expiry ?? null, 'text-green-600 font-semibold'),
    },
  ], []);

  function openCreateAside() {
    setInsForm(emptyInsurance);
    setVehSelected({});
    setVehQuery('');
    setEditingInsId(null);
    setOpenCreate(true);
    loadVehicles();
    loadInsurerList();
  }

  function closeCreateAside() {
    setOpenCreate(false);
  }

  async function loadVehicles() {
    setLoadingVehicles(true);
    try {
      const res: any = await authenticatedApi.get('/api/assets?status=active&manager=2&purpose=project,pool');
      const data: Vehicle[] = res?.data?.data || res?.data || [];
      const arr = Array.isArray(data) ? data : [];
      setVehicles(arr);
      // No auto-selection by default
    } catch (err) {
      console.error(err);
      toast.error('Failed to load vehicles');
      setVehicles([]);
    } finally {
      setLoadingVehicles(false);
    }
  }

  async function loadInsurerList() {
    setLoadingInsList(true);
    try {
      const res: any = await authenticatedApi.get('/api/mtn/insurance');
      const data: SimpleInsurance[] = res?.data?.data ?? res?.data ?? [];
      setInsList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load insurers');
      setInsList([]);
    } finally {
      setLoadingInsList(false);
    }
  }

  async function startEditIns(item: SimpleInsurance) {
    try {
      // Ensure vehicles are loaded so we can reflect selection state
      if (vehicles.length === 0) {
        await loadVehicles();
      }
      const res: any = await authenticatedApi.get(`/api/mtn/insurance/${item.id}`);
      const data = res?.data?.data || res?.data;
      const detail = data || {};
      setEditingInsId(detail.id ?? item.id);
      setInsForm({
        insurer: (detail.insurer ?? item.insurer ?? '').toString().toUpperCase(),
        policy: (detail.policy ?? item.policy ?? '').toString().toUpperCase(),
        expiry: detail.expiry ? String(detail.expiry).slice(0, 10) : (item.expiry ? String(item.expiry).slice(0, 10) : ''),
      });

      // Map assets to checked selection in the right pane
      const assets: Array<{ asset_id: number | string }> = Array.isArray(detail.assets) ? detail.assets : [];
      const ids = new Set((assets || []).map(a => a.asset_id));
      setVehSelected(prev => {
        // Build mapping for visible vehicles; default false then set true for ids present
        const next: Record<string | number, boolean> = {};
        if (vehicles.length > 0) {
          vehicles.forEach(v => { next[v.id] = ids.has(v.id); });
        } else {
          // Vehicles not yet loaded; pre-seed selected for these ids
          ids.forEach(id => { next[id] = true; });
        }
        return next;
      });
      setTimeout(() => scrollToFirstSelected(), 50);
    } catch (err) {
      console.error(err);
      toast.error('Failed to fetch insurer details');
    }
  }
  // Inline edit removed; we leverage the top form for editing

  const vehFiltered = useMemo(() => {
    let list = vehicles.slice();
    if (vehQuery) {
      const q = vehQuery.toLowerCase();
      list = list.filter(v => {
        const plate = (v.plate_no || v.register_number || '').toLowerCase();
        const modelName = (v.models?.name || '').toLowerCase();
        const brandName = (v.brands?.name || '').toLowerCase();
        return plate.includes(q) || modelName.includes(q) || brandName.includes(q);
      });
    }
    list.sort((a, b) => {
      const aa = (a.register_number || a.plate_no || '').toString();
      const bb = (b.register_number || b.plate_no || '').toString();
      return aa.localeCompare(bb, undefined, { sensitivity: 'base', numeric: true });
    });
    return list;
  }, [vehicles, vehQuery]);

  // Visible list derived from vehFiltered
  const visibleIds = React.useMemo(() => vehFiltered.map(v => v.id), [vehFiltered]);
  const allVisibleChecked = React.useMemo(() => visibleIds.length > 0 && visibleIds.every(id => vehSelected[id]), [visibleIds, vehSelected]);

  function toggleAllVisible(val: boolean) {
    setVehSelected(prev => {
      const next = { ...prev } as Record<string | number, boolean>;
      visibleIds.forEach(id => { next[id] = val; });
      return next;
    });
  }

  function toggleVeh(id: string | number, value: boolean) {
    setVehSelected(prev => ({ ...prev, [id]: value }));
  }

  function scrollToFirstSelected() {
    const container = vehicleListRef.current;
    if (!container) return;
    const first = vehFiltered.find(v => vehSelected[v.id]);
    if (!first) return;
    const el = container.querySelector(`[data-veh-id="${first.id}"]`) as HTMLElement | null;
    if (el) el.scrollIntoView({ block: 'center' });
  }

  async function submitCreate(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const asset_ids = Object.keys(vehSelected)
      .filter(k => vehSelected[k])
      .map(k => (isNaN(Number(k)) ? String(k) : String(Number(k))));
    if (!insForm.insurer || !insForm.policy || !insForm.expiry) {
      toast.error('Please complete insurance details');
      return;
    }
    if (asset_ids.length === 0) {
      toast.error('Please select at least one vehicle');
      return;
    }
    const payload = {
      insurer: insForm.insurer,
      policy: insForm.policy,
      // Send as YYYY-MM-DD string
      expiry: insForm.expiry,
      assets: asset_ids,
    };
    setSubmitting(true);
    try {
      let res: any;
      if (editingInsId) {
        res = await authenticatedApi.put(`/api/mtn/insurance/${editingInsId}`, payload);
      } else {
        res = await authenticatedApi.post('/api/mtn/insurance', payload);
      }
      const ok = res?.status && res.status < 300;
      if (ok) {
        toast.success(editingInsId ? 'Insurance updated' : 'Insurance created');
        loadInsurerList();
        loadRecords();
        setEditingInsId(null);
        setInsForm(emptyInsurance);
        setVehSelected({});
      } else {
        toast('Submitted, check server response');
      }
    } catch (err: any) {
      console.error(err);
      const msg = err?.response?.data?.message || 'Failed to create insurance';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function openUpdateAside(id: string | number, prefetched?: any) {
    setUpdateInsuranceId(id);
    setOpenUpdate(true);
    setLoadingUpdate(true);
    try {
      let data = prefetched;
      if (!data) {
        const res: any = await authenticatedApi.get(`/api/mtn/roadtax/${id}`);
        data = res?.data?.data || res?.data || {};
      }
      const rows: UpdateRow[] = (Array.isArray(data.assets) ? data.assets : []).map((v: any) => ({
        id: v.id,
        register_number: v.register_number || v.plate_no,
        plate_no: v.plate_no,
        roadtax_expiry: v.roadtax_expiry || '',
        roadtax_price: v.roadtax_amount || '',
      }));
      setUpdateRows(rows);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load assigned vehicles');
      setUpdateRows([]);
    } finally {
      setLoadingUpdate(false);
    }
  }

  function closeUpdateAside() {
    setOpenUpdate(false);
    setUpdateInsuranceId(null);
    setUpdateRows([]);
    setUpdateSearch('');
  }

  function setRowField(id: string | number, field: 'roadtax_expiry' | 'roadtax_price', value: string) {
    setUpdateRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  }

  async function submitUpdate() {
    if (!updateInsuranceId) return;
    const items = updateRows.map(r => ({
      asset_id: r.id,
      roadtax_expiry: r.roadtax_expiry ? String(r.roadtax_expiry).slice(0,10) : null,
      roadtax_amount: r.roadtax_price !== null && r.roadtax_price !== undefined && String(r.roadtax_price) !== '' ? Number(r.roadtax_price) : null,
    }));
    setSavingUpdate(true);
    try {
      const res: any = await authenticatedApi.put(`/api/mtn/roadtax`, { id: updateInsuranceId, items });
      const ok = res?.status && res.status < 300;
      if (ok) {
        toast.success('Roadtax updated');
        closeUpdateAside();
        loadRecords();
      } else {
        toast('Submitted, check server response');
      }
    } catch (err: any) {
      console.error(err);
      const msg = err?.response?.data?.message || 'Failed to update roadtax';
      toast.error(msg);
    } finally {
      setSavingUpdate(false);
    }
  }

  const filteredUpdateRows = React.useMemo(() => {
    if (!updateSearch) return updateRows;
    const q = updateSearch.toLowerCase();
    return updateRows.filter(r =>
      (r.register_number || r.plate_no || '').toLowerCase().includes(q)
    );
  }, [updateRows, updateSearch]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Roadtax & Insurance</h3>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={openCreateAside}>
            <Pencil className="w-4 h-4 mr-1" /> Insurance & Roadtax Maintenance
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 mb-3">
        <div className="p-3 flex items-center gap-3">
          <div className="text-sm">Enable Roadtax Update</div>
          <Switch checked={rtUpdateMode} onCheckedChange={(v) => setRtUpdateMode(Boolean(v))} />
        </div>
        {rtUpdateMode && rtSelectedAssets.length > 0 && (
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={rtDate}
                onChange={(e) => setRtDate(e.target.value)}
                className="w-[12rem]"
                placeholder="YYYY-MM-DD"
              />
              <Button
                size="sm"
                disabled={!rtDate || rtSubmitting}
                onClick={async () => {
                  if (!rtDate || rtSelectedAssets.length === 0) return;
                  setRtSubmitting(true);
                  try {
                    const payload = { rt_exp: rtDate, assets: rtSelectedAssets };
                    const res: any = await authenticatedApi.post('/api/mtn/roadtax', payload);
                    const ok = res?.status && res.status < 300;
                    if (ok) {
                      toast.success('Roadtax updated');
                      setRtDate('');
                      setRtSelectedAssets([]);
                      gridRef.current?.clearSelectedRows?.();
                      loadRecords();
                      setRtUpdateMode(false);
                    } else {
                      toast('Submitted, check server response');
                    }
                  } catch (err: any) {
                    console.error(err);
                    const msg = err?.response?.data?.message || 'Failed to update roadtax';
                    toast.error(msg);
                  } finally {
                    setRtSubmitting(false);
                  }
                }}
              >
                {rtSubmitting ? 'Updating...' : 'Update'}
              </Button>
            </div>
          )}
        <div className="shadow rounded-xl p-3 flex items-center justify-between bg-amber-100">
          <div className="text-sm">Insurance expired</div>
          <div className="text-base font-semibold">{summary.expiredIns} / {summary.total}</div>
        </div>
        <div className="shadow rounded-xl p-3 flex items-center justify-between bg-amber-100">
          <div className="text-sm">Roadtax expired</div>
          <div className="text-base font-semibold">{summary.expiredRt} / {summary.total}</div>
        </div>
      </div>

      <CustomDataGrid<RoadtaxApiRow>
        ref={gridRef as any}
        columns={columns}
        data={useMemo(() => records.map(r => ({
          ...r,
          register_no: r.asset?.register_number || '',
        })), [records])}
        inputFilter={false}
        pagination={false}
        rowSelection={{
          enabled: rtUpdateMode,
          getRowId: (row) => (row as RoadtaxApiRow).rt_id,
        }}
        onRowSelected={(_keys, rows) => {
          const assetIds = rows
            .map((r: any) => r?.asset?.id)
            .filter((x: any) => x !== undefined && x !== null)
            .map((x: any) => String(x));
          const unique = Array.from(new Set(assetIds));
          setRtSelectedAssets(unique);
        }}
      />
      {loading ? <div className="text-sm text-muted-foreground mt-2">Loading...</div> : null}
      {!loading && records.length === 0 ? <div className="text-sm text-muted-foreground mt-2">No records</div> : null}

      {openCreate && (
        <ActionSidebar
          title="Register Insurance"
          size="lg"
          onClose={closeCreateAside}
          content={
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <Label>Insurer</Label>
                  <Input className="uppercase" value={insForm.insurer} onChange={e => setInsForm(s => ({ ...s, insurer: e.target.value.toUpperCase() }))} />
                </div>
                <div>
                  <Label>Policy</Label>
                  <Input className="uppercase" value={insForm.policy} onChange={e => setInsForm(s => ({ ...s, policy: e.target.value.toUpperCase() }))} />
                </div>
                <div>
                  <Label>Coverage Expiry</Label>
                  <Input type="date" value={insForm.expiry} onChange={e => setInsForm(s => ({ ...s, expiry: e.target.value }))} />
                </div>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={resetInsurerForm}>
                    <X className="w-4 h-4 mr-1" /> Reset
                  </Button>
                  <Button onClick={submitCreate} disabled={!canSubmit || submitting}>
                    {submitting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
                    {submitting ? (editingInsId ? 'Updating...' : 'Submitting...') : (editingInsId ? 'Update' : 'Submit')}
                  </Button>
                </div>

                {/* Insurer list */}
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-start gap-2">
                    <Label className="select-none">Insurers</Label>
                    <button
                      onClick={() => !loadingInsList && loadInsurerList()}
                      aria-label="Refresh insurers"
                      disabled={loadingInsList}
                      className="p-1 rounded hover:bg-accent hover:text-accent-foreground disabled:opacity-70"
                    >
                      <RefreshCcw className={`w-4 h-4 ${loadingInsList ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                  <div className="border rounded divide-y max-h-[30rem] overflow-auto hover-scroll">
                    {loadingInsList && <div className="p-3 text-sm text-gray-500">Loading insurers...</div>}
                    {!loadingInsList && insList.length === 0 && <div className="p-3 text-sm text-gray-500">No insurers</div>}
                    {!loadingInsList && insList.map((it) => {
                      const expired = isExpired(it.expiry ?? null);
                      const remaining = remainingLabel(it.expiry ?? null);
                      const isEditing = editingInsId === it.id;
                      return (
                        <div
                          key={it.id}
                          className={`relative p-3 ${isEditing ? 'bg-primary/5 ring-1 ring-primary/40' : 'bg-background'}`}
                        >
                          {/* Watermark for expired */}
                          {expired && (
                            <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-10 text-red-600 font-extrabold text-4xl rotate-[-20deg] select-none">
                              EXPIRED
                            </div>
                          )}
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <div className="font-semibold">{it.insurer}</div>
                              <div className="text-xs text-muted-foreground">Policy: {it.policy || '-'}</div>
                              <div className="text-xs text-muted-foreground">Expiry: {fmtDate(it.expiry ?? null)} • {remaining}</div>
                            </div>
                            <Button size="icon" variant="ghost" onClick={() => startEditIns(it)} title="Edit">
                              <Pencil className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Assign Vehicles</Label>
                </div>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-gray-500" />
                  <Input placeholder="Search plate/model/brand" className="pl-7" value={vehQuery} onChange={e => setVehQuery(e.target.value)} />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-600 mb-1">
                  <div className="flex items-center gap-3">
                    <span>Showing {vehFiltered.length} of {vehicles.length}</span>
                    <span>Selected: {Object.values(vehSelected).filter(Boolean).length}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <Button size="sm" variant="outline" onClick={scrollToFirstSelected} title="Jump to first selected">
                      <Target className="w-3 h-3 mr-1" /> Find Selected
                    </Button>
                    <label className="flex items-center gap-2 text-xs">
                      <Checkbox checked={allVisibleChecked} onCheckedChange={(v) => toggleAllVisible(Boolean(v))} />
                      <span>Select All</span>
                    </label>
                  </div>
                </div>
                <div ref={vehicleListRef} className="border rounded max-h-[700px] overflow-auto divide-y hover-scroll">
                  {loadingVehicles && <div className="p-3 text-sm text-gray-500">Loading vehicles...</div>}
                  {!loadingVehicles && vehFiltered.length === 0 && <div className="p-3 text-sm text-gray-500">No vehicles</div>}
                  {!loadingVehicles && vehFiltered.map(v => {
                    const plate = v.plate_no || v.register_number || '-';
                    const brand = v.brands?.name || '';
                    const model = v.models?.name || '';
                    const costcenter = (v as any).costcenter?.name || '';
                    const location = (v as any).location?.name || '';
                    const checked = !!vehSelected[v.id];
                    return (
                      <div
                        key={v.id}
                        data-veh-id={v.id}
                        className={`flex items-center justify-between p-2 text-sm cursor-pointer ${checked ? 'bg-primary/10' : 'hover:bg-gray-50 dark:hover:bg-gray-900'}`}
                        onClick={() => toggleVeh(v.id, !checked)}
                        role="button"
                        aria-pressed={checked}
                      >
                        <div>
                          <div className="font-medium">{plate}</div>
                          <div className="text-xs text-gray-500 space-y-0.5">
                            {brand && <div>Brand: {brand}</div>}
                            {model && <div>Model: {model}</div>}
                            {costcenter && <div>Cost Center: {costcenter}</div>}
                            {location && <div>Location: {location}</div>}
                          </div>
                        </div>
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(val) => toggleVeh(v.id, Boolean(val))}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    );
                  })}
                </div>

                {/* Buttons moved to the insurance form column */}
              </div>
            </div>
          }
        />
      )}

      {/* Show scrollbars on hover only for insurer/vehicle lists */}
      <style jsx>{`
        .hover-scroll { scrollbar-width: none; }
        .hover-scroll:hover { scrollbar-width: thin; }
        .hover-scroll::-webkit-scrollbar { width: 0; height: 0; }
        .hover-scroll:hover::-webkit-scrollbar { width: 8px; height: 8px; }
        .hover-scroll::-webkit-scrollbar-track { background: transparent; }
        .hover-scroll::-webkit-scrollbar-thumb {
          background-color: rgba(100,100,100,0.35);
          border-radius: 6px;
          border: 2px solid transparent;
          background-clip: content-box;
        }
        .hover-scroll:hover::-webkit-scrollbar-thumb { background-color: rgba(100,100,100,0.55); }
      `}</style>

      {openUpdate && (
        <ActionSidebar
          title={`Update Roadtax${updateInsuranceId ? ` #${updateInsuranceId}` : ''}`}
          size="lg"
          onClose={closeUpdateAside}
          content={
            <div className="space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-gray-500" />
                <Input
                  placeholder="Search register number"
                  className="pl-7"
                  value={updateSearch}
                  onChange={e => setUpdateSearch(e.target.value)}
                />
              </div>
              <div className="border rounded overflow-hidden">
                <div className="grid grid-cols-12 bg-gray-100 dark:bg-gray-800 text-xs font-medium p-2">
                  <div className="col-span-1">No</div>
                  <div className="col-span-5">Register Number</div>
                  <div className="col-span-3">Roadtax Expiry</div>
                  <div className="col-span-3">Roadtax Price</div>
                </div>
                <div className="max-h-[30rem] overflow-auto divide-y">
                  {loadingUpdate && <div className="p-3 text-sm text-gray-500">Loading...</div>}
                  {!loadingUpdate && filteredUpdateRows.length === 0 && <div className="p-3 text-sm text-gray-500">No assigned vehicles</div>}
                  {!loadingUpdate && filteredUpdateRows.map((r, idx) => (
                    <div key={r.id} className="grid grid-cols-12 items-center p-2 text-sm">
                      <div className="col-span-1">{idx + 1}</div>
                      <div className="col-span-5 font-medium">{r.register_number || r.plate_no || '-'}</div>
                      <div className="col-span-3">
                        <Input type="date" value={r.roadtax_expiry ? String(r.roadtax_expiry).slice(0,10) : ''} onChange={e => setRowField(r.id, 'roadtax_expiry', e.target.value)} />
                      </div>
                      <div className="col-span-3">
                        <Input type="number" step="0.01" value={r.roadtax_price ?? ''} onChange={e => setRowField(r.id, 'roadtax_price', e.target.value)} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2">
                <Button variant="outline" onClick={closeUpdateAside}>
                  <X className="w-4 h-4 mr-1" /> Close
                </Button>
                <Button onClick={submitUpdate} disabled={savingUpdate}>
                  <Save className="w-4 h-4 mr-1" /> {savingUpdate ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>
          }
        />
      )}
    </div>
  );
};

export default InsuranceModule;
