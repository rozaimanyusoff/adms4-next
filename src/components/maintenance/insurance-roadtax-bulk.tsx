'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { authenticatedApi } from '@/config/api';
import { toast } from 'sonner';
import { Save, RefreshCcw, Search, CheckSquare, Square } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

type Vehicle = {
  id: number | string;
  register_number?: string;
  plate_no?: string; // legacy fallback if present
  models?: { id: number; name: string } | null;
  brands?: { id: number; name: string } | null;
  department?: string | { id: number; name: string };
  costcenter?: string | { id: number; name: string };
};

type InsuranceForm = {
  insurer: string;
  policy_no: string;
  coverage_start: string; // yyyy-mm-dd
  coverage_end: string;   // yyyy-mm-dd
  premium_amount: string; // as string from input; convert to number
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

// Roadtax assignment is handled in the insurance detail view

const InsuranceRoadtaxBulk: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selected, setSelected] = useState<Record<string | number, boolean>>({});
  const [query, setQuery] = useState('');
  const [insForm, setInsForm] = useState<InsuranceForm>(emptyInsurance);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loadingInsurance, setLoadingInsurance] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, boolean>>({});

  async function loadVehicles() {
    setLoading(true);
    try {
      const res: any = await authenticatedApi.get('/api/assets?status=active&manager=2');
      const data: Vehicle[] = res?.data?.data || res?.data || [];
      setVehicles(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load active vehicles');
      setVehicles([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadVehicles();
  }, []);

  const filtered = useMemo(() => {
    if (!query) return vehicles;
    const q = query.toLowerCase();
    return vehicles.filter(v => {
      const plate = (v.plate_no || v.register_number || '').toLowerCase();
      const modelName = (v.models?.name || '').toLowerCase();
      const brandName = (v.brands?.name || '').toLowerCase();
      return plate.includes(q) || modelName.includes(q) || brandName.includes(q);
    });
  }, [vehicles, query]);

  const allSelected = useMemo(() => {
    if (!filtered.length) return false;
    return filtered.every(v => selected[v.id]);
  }, [filtered, selected]);

  function toggleAll(val: boolean) {
    const next: Record<string | number, boolean> = { ...selected };
    filtered.forEach(v => { next[v.id] = val; });
    setSelected(next);
  }

  function toggleOne(id: string | number, val: boolean) {
    setSelected(prev => ({ ...prev, [id]: val }));
  }

  function handleInsChange<K extends keyof InsuranceForm>(key: K, value: InsuranceForm[K]) {
    let next: any = value;
    if (key === 'insurer' || key === 'policy_no') {
      next = String(value || '').toUpperCase();
    }
    setInsForm(prev => ({ ...prev, [key]: next }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const asset_ids = Object.keys(selected).filter((k) => selected[k]).map(k => (isNaN(Number(k)) ? k : Number(k)));
    const errs: Record<string, boolean> = {
      insurer: !insForm.insurer,
      policy_no: !insForm.policy_no,
      coverage_start: !insForm.coverage_start,
      coverage_end: !insForm.coverage_end,
      premium_amount: !insForm.premium_amount,
      coverage_details: !insForm.coverage_details,
      assets: asset_ids.length === 0,
    };
    setFormErrors(errs);
    if (Object.values(errs).some(Boolean)) {
      toast.error(errs.assets ? 'Select at least one vehicle' : 'Please fill all required fields');
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
      // Endpoint creating an insurance record and linking vehicles
      const res: any = await authenticatedApi.post('/api/mtn/insurance', payload);
      const ok = res?.status && res.status < 300;
      if (ok) {
        const created = res?.data?.data || res?.data;
        const insuranceId = created?.id || created?.insurance?.id;
        toast.success('Insurance created and vehicles assigned');
        setInsForm(emptyInsurance);
        setSelected({});
        if (insuranceId) {
          router.push(`/mtn/insurance/${insuranceId}`);
        }
      } else {
        toast('Submitted, check server response');
      }
    } catch (err: any) {
      console.error('Submit failed', err);
      const msg = err?.response?.data?.message || 'Failed to create insurance';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  // Prefill by insurance id if present in query params
  useEffect(() => {
    const id = searchParams?.get('id');
    if (!id) return;
    async function fetchById() {
      setLoadingInsurance(true);
      try {
        const res: any = await authenticatedApi.get(`/api/mtn/insurance/${id}`);
        const data = res?.data?.data || res?.data;
        if (data) {
          setInsForm({
            insurer: String(data.insurer || '').toUpperCase(),
            policy_no: String(data.policy_no || '').toUpperCase(),
            coverage_start: data.coverage_start || '',
            coverage_end: data.coverage_end || '',
            premium_amount: data.premium_amount !== undefined && data.premium_amount !== null ? String(data.premium_amount) : '',
            coverage_details: data.coverage_details || '',
          });
          const sel: Record<string | number, boolean> = {};
          const assets = Array.isArray(data.assets) ? data.assets : [];
          assets.forEach((a: any) => { if (a?.id !== undefined) sel[a.id] = true; });
          setSelected(sel);
        }
      } catch (err) {
        console.error(err);
        toast.error('Failed to load insurance');
      } finally {
        setLoadingInsurance(false);
      }
    }
    fetchById();
  }, [searchParams]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Insurance & Roadtax (Bulk)</h3>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadVehicles} disabled={loading}>
            <RefreshCcw className="w-4 h-4 mr-1" /> Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Select Vehicles</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-3">
            <div className="relative w-full max-w-md">
              <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-gray-500" />
              <Input placeholder="Search plate/model/brand" className="pl-7" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
            <Button type="button" variant="secondary" size="sm" onClick={() => toggleAll(!allSelected)} disabled={!filtered.length}>
              {allSelected ? <CheckSquare className="w-4 h-4 mr-1" /> : <Square className="w-4 h-4 mr-1" />} {allSelected ? 'Unselect all' : 'Select all'}
            </Button>
          </div>

          <div className={`border rounded overflow-hidden ${formErrors.assets ? 'border-red-500' : ''}`}>
            <div className="grid grid-cols-12 bg-gray-100 dark:bg-gray-800 text-xs font-medium p-2">
              <div className="col-span-1"></div>
              <div className="col-span-3">Plate</div>
              <div className="col-span-3">Model</div>
              <div className="col-span-3">Brand</div>
              <div className="col-span-2">Dept/Costcenter</div>
            </div>
            <div className="max-h-72 overflow-auto divide-y">
              {loading && (
                <div className="p-3 text-sm text-gray-500">Loading vehicles...</div>
              )}
              {!loading && filtered.length === 0 && (
                <div className="p-3 text-sm text-gray-500">No vehicles found</div>
              )}
              {!loading && filtered.map((v) => {
                const plate = v.plate_no || v.register_number || '-';
                const brand = v.brands?.name || '';
                const model = v.models?.name || '';
                const dept = typeof v.department === 'string' ? v.department : (v.department?.name || '');
                const cc = typeof v.costcenter === 'string' ? v.costcenter : (v.costcenter?.name || '');
                return (
                  <div key={v.id} className="grid grid-cols-12 items-center p-2 text-sm">
                    <div className="col-span-1 flex items-center justify-center">
                      <Checkbox checked={!!selected[v.id]} onCheckedChange={(val) => toggleOne(v.id, Boolean(val))} />
                    </div>
                    <div className="col-span-3 font-medium">{plate}</div>
                    <div className="col-span-3">{model || '-'}</div>
                    <div className="col-span-3">{brand || '-'}</div>
                    <div className="col-span-2">{dept || cc || '-'}</div>
                  </div>
                );
              })}
            </div>
          </div>
          {formErrors.assets && (
            <div className="text-xs text-red-600 mt-1">Please select at least one vehicle.</div>
          )}
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Insurance Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>Insurer</Label>
                <Input value={insForm.insurer} onChange={(e) => handleInsChange('insurer', e.target.value)} placeholder="e.g. Allianz" className={formErrors.insurer ? 'ring-2 ring-red-500' : ''} />
              </div>
              <div>
                <Label>Policy No.</Label>
                <Input value={insForm.policy_no} onChange={(e) => handleInsChange('policy_no', e.target.value)} placeholder="e.g. POL-12345" className={formErrors.policy_no ? 'ring-2 ring-red-500' : ''} />
              </div>
              <div>
                <Label>Coverage Start</Label>
                <Input type="date" value={insForm.coverage_start} onChange={(e) => handleInsChange('coverage_start', e.target.value)} className={formErrors.coverage_start ? 'ring-2 ring-red-500' : ''} />
              </div>
              <div>
                <Label>Coverage End</Label>
                <Input type="date" value={insForm.coverage_end} onChange={(e) => handleInsChange('coverage_end', e.target.value)} className={formErrors.coverage_end ? 'ring-2 ring-red-500' : ''} />
              </div>
              <div className="md:col-span-2">
                <Label>Coverage Details</Label>
                <Input value={insForm.coverage_details} onChange={(e) => handleInsChange('coverage_details', e.target.value)} placeholder="Comprehensive coverage including theft and accident." className={formErrors.coverage_details ? 'ring-2 ring-red-500' : ''} />
              </div>
              <div className="md:col-span-2">
                <Label>Premium Amount (MYR)</Label>
                <Input type="number" step="0.01" value={insForm.premium_amount} onChange={(e) => handleInsChange('premium_amount', e.target.value)} placeholder="e.g. 1200.00" className={formErrors.premium_amount ? 'ring-2 ring-red-500' : ''} />
              </div>
            </div>

            <div className="pt-2">
              <Button type="submit" disabled={submitting}>
                <Save className="w-4 h-4 mr-1" /> {submitting ? 'Submitting...' : 'Create Insurance & Assign'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
};

export default InsuranceRoadtaxBulk;
