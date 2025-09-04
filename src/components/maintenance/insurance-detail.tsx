'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authenticatedApi } from '@/config/api';
import { toast } from 'sonner';
import { Save, RefreshCcw } from 'lucide-react';

type VehicleRow = {
  id: number | string;
  plate_no?: string;
  register_number?: string;
  model?: string;
  brand?: string | { id: number; name: string };
  roadtax_expiry?: string | null;
};

type InsuranceInfo = {
  id: number | string;
  insurer: string;
  policy_no: string;
  start_date?: string;
  end_date?: string;
  coverage?: string;
  premium?: string;
  vehicles?: VehicleRow[];
};

interface Props {
  insuranceId: string;
}

const InsuranceDetail: React.FC<Props> = ({ insuranceId }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [info, setInfo] = useState<InsuranceInfo | null>(null);
  const [rows, setRows] = useState<VehicleRow[]>([]);

  async function load() {
    setLoading(true);
    try {
      const res: any = await authenticatedApi.get(`/api/insurance/${insuranceId}`);
      const data: InsuranceInfo = res?.data?.data || res?.data;
      setInfo(data);
      const list = Array.isArray(data?.vehicles) ? data.vehicles : [];
      setRows(list);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load insurance');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [insuranceId]);

  function setExpiry(id: string | number, value: string) {
    setRows(prev => prev.map(r => r.id === id ? { ...r, roadtax_expiry: value } : r));
  }

  const payloadItems = useMemo(() => (
    rows
      .filter(r => r.roadtax_expiry && String(r.roadtax_expiry).length > 0)
      .map(r => ({ vehicle_id: r.id, expiry_date: String(r.roadtax_expiry).slice(0,10) }))
  ), [rows]);

  async function saveRoadtax() {
    if (!payloadItems.length) {
      toast.error('Nothing to update');
      return;
    }
    setSaving(true);
    try {
      const res: any = await authenticatedApi.put(`/api/insurance/${insuranceId}/roadtax`, { items: payloadItems });
      const ok = res?.status && res.status < 300;
      if (ok) {
        toast.success('Roadtax expiry updated');
        load();
      } else {
        toast('Submitted, check server response');
      }
    } catch (err: any) {
      console.error(err);
      const msg = err?.response?.data?.message || 'Failed to update roadtax';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Insurance Detail</h3>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCcw className="w-4 h-4 mr-1" /> Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Insurance Info</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && <div className="text-sm text-gray-500">Loading...</div>}
          {!loading && info && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div>
                <Label>Insurer</Label>
                <div className="font-medium">{info.insurer}</div>
              </div>
              <div>
                <Label>Policy No</Label>
                <div className="font-medium">{info.policy_no}</div>
              </div>
              <div>
                <Label>Coverage</Label>
                <div className="font-medium">{info.coverage || '-'}</div>
              </div>
              <div>
                <Label>Start</Label>
                <div className="font-medium">{info.start_date?.slice(0,10) || '-'}</div>
              </div>
              <div>
                <Label>End</Label>
                <div className="font-medium">{info.end_date?.slice(0,10) || '-'}</div>
              </div>
              <div>
                <Label>Premium</Label>
                <div className="font-medium">{info.premium || '-'}</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle className="text-base w-full">Assigned Vehicles</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded overflow-hidden">
            <div className="grid grid-cols-12 bg-gray-100 dark:bg-gray-800 text-xs font-medium p-2">
              <div className="col-span-3">Plate</div>
              <div className="col-span-3">Model</div>
              <div className="col-span-3">Brand</div>
              <div className="col-span-3">Roadtax Expiry</div>
            </div>
            <div className="max-h-96 overflow-auto divide-y">
              {loading && <div className="p-3 text-sm text-gray-500">Loading...</div>}
              {!loading && rows.length === 0 && (
                <div className="p-3 text-sm text-gray-500">No vehicles linked</div>
              )}
              {!loading && rows.map(r => {
                const plate = r.plate_no || r.register_number || '-';
                const brand = typeof r.brand === 'string' ? r.brand : (r.brand?.name || '');
                return (
                  <div key={r.id} className="grid grid-cols-12 items-center p-2 text-sm">
                    <div className="col-span-3 font-medium">{plate}</div>
                    <div className="col-span-3">{r.model || '-'}</div>
                    <div className="col-span-3">{brand || '-'}</div>
                    <div className="col-span-3">
                      <Input type="date" value={r.roadtax_expiry ? String(r.roadtax_expiry).slice(0,10) : ''} onChange={(e) => setExpiry(r.id, e.target.value)} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-3">
            <Button onClick={saveRoadtax} disabled={saving}>
              <Save className="w-4 h-4 mr-1" /> {saving ? 'Saving...' : 'Save Roadtax Expiry'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InsuranceDetail;

