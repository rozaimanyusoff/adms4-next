'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import ActionSidebar from '@/components/ui/action-aside';
import { authenticatedApi } from '@/config/api';
import { toast } from 'sonner';
import { Plus, RefreshCcw, Search, Save, X } from 'lucide-react';

type Vehicle = {
  id: number | string;
  register_number?: string;
  plate_no?: string; // legacy fallback
  models?: { id: number; name: string } | null;
  brands?: { id: number; name: string } | null;
};

type InsuranceRow = {
  id: number | string;
  insurer: string;
  policy_no: string;
  coverage_start?: string;
  coverage_end?: string;
  premium_amount?: number | string;
  coverage_details?: string;
};

type InsuranceForm = {
  insurer: string;
  policy_no: string;
  coverage_start: string;
  coverage_end: string;
  premium_amount: string; // keep as string from input; convert on submit
  coverage_details: string;
};

const emptyInsurance: InsuranceForm = {
  insurer: '',
  policy_no: '',
  coverage_start: '',
  coverage_end: '',
  premium_amount: '',
  coverage_details: '',
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
  const [records, setRecords] = useState<InsuranceRow[]>([]);
  const [search, setSearch] = useState('');

  // Create aside
  const [openCreate, setOpenCreate] = useState(false);
  const [insForm, setInsForm] = useState<InsuranceForm>(emptyInsurance);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehQuery, setVehQuery] = useState('');
  const [vehSelected, setVehSelected] = useState<Record<string | number, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [loadingVehicles, setLoadingVehicles] = useState(false);

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
      // Not specified: list endpoint. If backend returns a single object for GET /api/mtn/insurance, coerce to array.
      const res: any = await authenticatedApi.get('/api/mtn/insurance');
      const raw = res?.data?.data || res?.data || [];
      const data: InsuranceRow[] = Array.isArray(raw) ? raw : [raw];
      setRecords(data.filter(Boolean));
    } catch (err) {
      console.error(err);
      toast.error('Failed to load insurance records');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadRecords(); }, []);

  const filtered = useMemo(() => {
    if (!search) return records;
    const q = search.toLowerCase();
    return records.filter(r =>
      String(r.id).includes(q) ||
      (r.insurer || '').toLowerCase().includes(q) ||
      (r.policy_no || '').toLowerCase().includes(q)
    );
  }, [records, search]);

  function openCreateAside() {
    setInsForm(emptyInsurance);
    setVehSelected({});
    setVehQuery('');
    setOpenCreate(true);
    loadVehicles();
  }

  function closeCreateAside() {
    setOpenCreate(false);
  }

  async function loadVehicles() {
    setLoadingVehicles(true);
    try {
      const res: any = await authenticatedApi.get('/api/assets?status=active&manager=2');
      const data: Vehicle[] = res?.data?.data || res?.data || [];
      setVehicles(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load vehicles');
      setVehicles([]);
    } finally {
      setLoadingVehicles(false);
    }
  }

  const vehFiltered = useMemo(() => {
    if (!vehQuery) return vehicles;
    const q = vehQuery.toLowerCase();
    return vehicles.filter(v => {
      const plate = (v.plate_no || v.register_number || '').toLowerCase();
      const modelName = (v.models?.name || '').toLowerCase();
      const brandName = (v.brands?.name || '').toLowerCase();
      return plate.includes(q) || modelName.includes(q) || brandName.includes(q);
    });
  }, [vehicles, vehQuery]);

  function toggleVeh(id: string | number, value: boolean) {
    setVehSelected(prev => ({ ...prev, [id]: value }));
  }

  async function submitCreate(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const asset_ids = Object.keys(vehSelected).filter(k => vehSelected[k]).map(k => (isNaN(Number(k)) ? k : Number(k)));
    if (!insForm.insurer || !insForm.policy_no || !insForm.coverage_start || !insForm.coverage_end) {
      toast.error('Please complete insurance details');
      return;
    }
    if (asset_ids.length === 0) {
      toast.error('Please select at least one vehicle');
      return;
    }
    const payload = {
      asset_ids,
      insurance: {
        insurer: insForm.insurer,
        policy_no: insForm.policy_no,
        coverage_start: insForm.coverage_start,
        coverage_end: insForm.coverage_end,
        premium_amount: insForm.premium_amount ? Number(insForm.premium_amount) : 0,
        coverage_details: insForm.coverage_details,
      },
    };
    setSubmitting(true);
    try {
      const res: any = await authenticatedApi.post('/api/mtn/insurance', payload);
      const ok = res?.status && res.status < 300;
      if (ok) {
        toast.success('Insurance created');
        const created = res?.data?.data || res?.data;
        setOpenCreate(false);
        loadRecords();
        // Open update aside with returned assets if available
        const newId = created?.id;
        if (newId) {
          await openUpdateAside(newId, created);
        }
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
        const res: any = await authenticatedApi.get(`/api/mtn/insurance/${id}`);
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
      const res: any = await authenticatedApi.put(`/api/mtn/insurance`, { id: updateInsuranceId, items });
      const ok = res?.status && res.status < 300;
      if (ok) {
        toast.success('Roadtax updated');
        closeUpdateAside();
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
        <h3 className="text-lg font-semibold">Insurance</h3>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadRecords} disabled={loading}>
            <RefreshCcw className="w-4 h-4 mr-1" /> Refresh
          </Button>
          <Button size="sm" onClick={openCreateAside}>
            <Plus className="w-4 h-4 mr-1" /> Register Insurance
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Insurance Records</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-3">
            <div className="relative w-full max-w-md">
              <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-gray-500" />
              <Input placeholder="Search insurer/policy/id" className="pl-7" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="border rounded overflow-hidden">
            <div className="grid grid-cols-12 bg-gray-100 dark:bg-gray-800 text-xs font-medium p-2">
              <div className="col-span-2">ID</div>
              <div className="col-span-3">Insurer</div>
              <div className="col-span-3">Policy No.</div>
              <div className="col-span-2">Start</div>
              <div className="col-span-2">End</div>
            </div>
            <div className="max-h-96 overflow-auto divide-y">
              {loading && <div className="p-3 text-sm text-gray-500">Loading...</div>}
              {!loading && filtered.length === 0 && <div className="p-3 text-sm text-gray-500">No records</div>}
              {!loading && filtered.map(r => (
                <div key={r.id} className="grid grid-cols-12 items-center p-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-900">
                  <div className="col-span-2">{r.id}</div>
                  <div className="col-span-3 font-medium">{r.insurer}</div>
                  <div className="col-span-3">{r.policy_no}</div>
                  <div className="col-span-2">{r.start_date?.slice(0,10) || '-'}</div>
                  <div className="col-span-2 flex items-center gap-2">
                    {r.end_date?.slice(0,10) || '-'}
                    <Button size="sm" variant="outline" onClick={() => openUpdateAside(r.id)}>Update</Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

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
                  <Input value={insForm.insurer} onChange={e => setInsForm(s => ({ ...s, insurer: e.target.value }))} />
                </div>
                <div>
                  <Label>Policy No.</Label>
                  <Input value={insForm.policy_no} onChange={e => setInsForm(s => ({ ...s, policy_no: e.target.value }))} />
                </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                    <Label>Coverage Start</Label>
                    <Input type="date" value={insForm.coverage_start} onChange={e => setInsForm(s => ({ ...s, coverage_start: e.target.value }))} />
                    </div>
                    <div>
                    <Label>Coverage End</Label>
                    <Input type="date" value={insForm.coverage_end} onChange={e => setInsForm(s => ({ ...s, coverage_end: e.target.value }))} />
                    </div>
                  </div>
                <div>
                  <Label>Coverage Details</Label>
                  <Input value={insForm.coverage_details} onChange={e => setInsForm(s => ({ ...s, coverage_details: e.target.value }))} />
                </div>
                <div>
                  <Label>Premium Amount (MYR)</Label>
                  <Input type="number" step="0.01" value={insForm.premium_amount} onChange={e => setInsForm(s => ({ ...s, premium_amount: e.target.value }))} />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Assign Vehicles</Label>
                  <Button size="sm" variant="outline" onClick={loadVehicles} disabled={loadingVehicles}>
                    <RefreshCcw className="w-3 h-3 mr-1" /> Refresh
                  </Button>
                </div>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-gray-500" />
                  <Input placeholder="Search plate/model/brand" className="pl-7" value={vehQuery} onChange={e => setVehQuery(e.target.value)} />
                </div>
                <div className="border rounded max-h-80 overflow-auto divide-y">
                  {loadingVehicles && <div className="p-3 text-sm text-gray-500">Loading vehicles...</div>}
                  {!loadingVehicles && vehFiltered.length === 0 && <div className="p-3 text-sm text-gray-500">No vehicles</div>}
                  {!loadingVehicles && vehFiltered.map(v => {
                    const plate = v.plate_no || v.register_number || '-';
                    const brand = v.brands?.name || '';
                    const model = v.models?.name || '';
                    const checked = !!vehSelected[v.id];
                    return (
                      <label key={v.id} className="flex items-center justify-between p-2 text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900">
                        <div>
                          <div className="font-medium">{plate}</div>
                          <div className="text-xs text-gray-500">{model || ''} {brand ? `• ${brand}` : ''}</div>
                        </div>
                        <input type="checkbox" checked={checked} onChange={(e) => toggleVeh(v.id, e.target.checked)} />
                      </label>
                    );
                  })}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={closeCreateAside}>
                    <X className="w-4 h-4 mr-1" /> Cancel
                  </Button>
                  <Button onClick={submitCreate} disabled={submitting}>
                    <Save className="w-4 h-4 mr-1" /> {submitting ? 'Submitting...' : 'Submit'}
                  </Button>
                </div>
              </div>
            </div>
          }
        />
      )}

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
