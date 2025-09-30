'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { authenticatedApi } from '@/config/api';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { OTPInput } from '@/components/ui/otp-input';
import { useSearchParams } from 'next/navigation';

type Location = { id?: number; code?: string | null } | null;
type CostCenter = { id?: number; name?: string | null } | null;
type Owner = { ramco_id?: string | null; full_name?: string | null } | null;
type Asset = {
  id?: number;
  register_number?: string | null;
  purchase_date?: string | null;
  age?: number | null;
  costcenter?: CostCenter;
  location?: Location;
  owner?: Owner;
} | null;

type Assessment = {
  assess_id: number;
  a_date: string | null;
  a_ncr: number | null;
  a_rate: string | number | null;
  a_upload?: string | null;
  a_upload2?: string | null;
  a_upload3?: string | null;
  a_upload4?: string | null;
  a_remark?: string | null;
  a_dt?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  acceptance_status?: string | null;
  acceptance_date?: string | null;
  asset?: Asset;
  assessed_location?: Location;
};

type AssessmentDetail = {
  adt_id: number;
  assess_id: number;
  adt_item: string | number;
  adt_ncr: number;
  adt_rate: string | number;
  adt_rate2: number;
  adt_rem: string | null;
  adt_image: string | null;
  qset_desc?: string | null;
  qset_type?: string | null; // e.g. 'NCR'
};

export interface AssessmentPortalProps { assetId: string }

const formatDMY = (v?: string | Date | null) => {
  if (!v) return '-';
  const d = typeof v === 'string' ? new Date(v) : v;
  if (!d || Number.isNaN(d.getTime())) return '-';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

const parseRate = (v: Assessment['a_rate']): number | null => {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return v;
  const n = parseFloat(v.replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) ? n : null;
};

const splitUploads = (s?: string | null): string[] => {
  if (!s) return [];
  return String(s)
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
};

const collectAllUploads = (row: Assessment): string[] => {
  return [row.a_upload, row.a_upload2, row.a_upload3, row.a_upload4]
    .filter(Boolean)
    .flatMap((u) => splitUploads(u as string));
};

const AssessmentPortal: React.FC<AssessmentPortalProps> = ({ assetId }) => {
  const [rows, setRows] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [openSummaryId, setOpenSummaryId] = useState<number | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryDetails, setSummaryDetails] = useState<AssessmentDetail[]>([]);
  const [summaryHeader, setSummaryHeader] = useState<any>(null);
  const [accepting, setAccepting] = useState(false);

  // Portal verification via RAMCO ID + 6-digit PIN from email link
  const searchParams = useSearchParams();
  const initialCode = searchParams?.get('code') || '';
  const [ramcoId, setRamcoId] = useState<string>('');
  const [pin, setPin] = useState<string>('');
  const [verified, setVerified] = useState<boolean>(false);

  useEffect(() => {
    if (!initialCode) return;
    if (initialCode.length > 6) {
      const p = initialCode.slice(-6);
      const r = initialCode.slice(0, -6);
      if (/^\d{6}$/.test(p)) { setRamcoId(r); setPin(p); }
    }
  }, [initialCode]);

  const fetchRows = async (): Promise<Assessment[]> => {
    setLoading(true);
    setError(null);
    try {
      const res = await authenticatedApi.get('/api/compliance/assessments', { params: { asset: assetId } });
      const list = (res as any)?.data?.data || (res as any)?.data || [];
      const arr = Array.isArray(list) ? (list as Assessment[]) : [];
      setRows(arr);
      return arr;
    } catch (err) {
      console.error('Failed to load assessments', err);
      setError('Failed to load assessments for this asset.');
      setRows([]);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Do not auto-fetch until verified.

  const latestAsset = useMemo(() => rows[0]?.asset ?? null, [rows]);

  const handleVerify = async () => {
    if (!ramcoId || !/^\d{6}$/.test(pin)) {
      toast.error('Enter RAMCO ID and 6-digit PIN');
      return;
    }
    const list = await fetchRows();
    const ownerId = list?.[0]?.asset?.owner?.ramco_id ? String(list[0].asset!.owner!.ramco_id) : null;
    if (ownerId && ownerId.trim() === String(ramcoId).trim()) {
      setVerified(true);
    } else {
      toast.error('RAMCO ID does not match assigned driver for this asset');
    }
  };

  if (!verified) {
    return (
      <div className="p-6 max-w-xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Verify Access</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="ramco">RAMCO ID</Label>
                <Input id="ramco" value={ramcoId} onChange={(e) => setRamcoId(e.target.value)} placeholder="e.g. 003461" />
              </div>
              <div>
                <Label>PIN Code</Label>
                <div className="mt-2">
                  <OTPInput value={pin} onChange={setPin} />
                </div>
                <div className="text-xs text-gray-500 mt-1">Enter the 6-digit code from your email</div>
              </div>
              <div className="pt-2">
                <Button onClick={handleVerify} disabled={loading}>{loading ? 'Checking…' : 'Continue'}</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const openSummary = async (assessId: number) => {
    setOpenSummaryId(assessId);
    setSummaryLoading(true);
    setSummaryDetails([]);
    setSummaryHeader(null);
    try {
      const res = await authenticatedApi.get(`/api/compliance/assessments/${assessId}`);
      const payload = (res as any)?.data?.data || (res as any)?.data || {};
      setSummaryHeader(payload);
      setSummaryDetails(Array.isArray(payload?.details) ? payload.details : []);
    } catch (err) {
      console.error('Failed to load assessment summary', err);
      toast.error('Failed to load assessment summary');
    } finally {
      setSummaryLoading(false);
    }
  };

  const acceptAssessment = async () => {
    if (!openSummaryId) return;
    setAccepting(true);
    try {
      await authenticatedApi.put(`/api/compliance/assessments/${assetId}/acceptance`, { assess_id: openSummaryId, ramco_id: ramcoId, pin } as any);
      toast.success('Assessment accepted');
      await fetchRows();
      setOpenSummaryId(null);
    } catch (err) {
      console.error('Failed to accept assessment', err);
      toast.error('Failed to accept assessment');
    } finally {
      setAccepting(false);
    }
  };

  if (loading) return <div className="p-6">Loading…</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => history.back()} className="p-2 rounded hover:bg-gray-100" title="Back">←</button>
          <h1 className="text-lg font-semibold">Assessment Portal</h1>
        </div>
        {latestAsset ? (
          <div className="text-sm text-gray-600">
            <span className="font-medium">Vehicle:</span> {latestAsset.register_number || '-'}
            <span className="mx-2">·</span>
            <span className="font-medium">Driver:</span> {latestAsset.owner?.full_name || 'Unassigned'}
            <span className="mx-2">·</span>
            <span className="font-medium">Location:</span> {latestAsset.location?.code || '-'}
          </div>
        ) : null}
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">No assessments found for this asset.</CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rows
            .slice()
            .sort((a, b) => new Date(b.a_date ?? b.a_dt ?? 0).getTime() - new Date(a.a_date ?? a.a_dt ?? 0).getTime())
            .map((row) => {
              const rate = parseRate(row.a_rate);
              const uploads = collectAllUploads(row);
              const accepted = Boolean(row.acceptance_status);
              const acceptedAt = row.acceptance_date ? formatDMY(row.acceptance_date) : null;
              const loc = row.assessed_location?.code || row.asset?.location?.code || '-';
              return (
                <Card key={row.assess_id} className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center justify-between">
                      <span>Assessment #{row.assess_id}</span>
                      <span className={`text-xs px-2 py-1 rounded-full border ${accepted ? 'bg-green-100 text-green-800 border-green-200' : 'bg-yellow-50 text-yellow-800 border-yellow-200'}`}>
                        {accepted ? `Accepted${acceptedAt ? ` · ${acceptedAt}` : ''}` : 'Awaiting Acceptance'}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                      <div><span className="text-gray-500">Date</span><div className="font-medium">{formatDMY(row.a_date ?? row.a_dt)}</div></div>
                      <div><span className="text-gray-500">Location</span><div className="font-medium">{loc}</div></div>
                      <div><span className="text-gray-500">NCR</span><div className="font-medium">{row.a_ncr ?? 0}</div></div>
                      <div><span className="text-gray-500">Rate</span><div className="font-medium">{rate !== null ? `${rate.toFixed(2)}%` : '-'}</div></div>
                      <div className="col-span-2"><span className="text-gray-500">Photos</span><div className="font-medium">{uploads.length ? `${uploads.length} photo${uploads.length>1?'s':''}` : '—'}</div></div>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" onClick={() => openSummary(row.assess_id)}>View Summary</Button>
                      {uploads.length ? (
                        <Button size="sm" variant="secondary" onClick={() => { window.open(uploads[0], '_blank'); }}>Open Photo</Button>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
        </div>
      )}

      <Dialog open={openSummaryId !== null} onOpenChange={(o) => { if (!o) setOpenSummaryId(null); }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Assessment Summary {openSummaryId ? `#${openSummaryId}` : ''}</DialogTitle>
          </DialogHeader>
          {summaryLoading ? (
            <div className="py-6">Loading summary…</div>
          ) : (
            <div className="space-y-3">
              {summaryHeader ? (
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-gray-500">Vehicle</span><div className="font-medium">{summaryHeader?.asset?.register_number || '-'}</div></div>
                  <div><span className="text-gray-500">Location</span><div className="font-medium">{summaryHeader?.assessment_location?.code || summaryHeader?.asset?.location?.code || '-'}</div></div>
                  <div><span className="text-gray-500">Date</span><div className="font-medium">{formatDMY(summaryHeader?.a_date || summaryHeader?.a_dt)}</div></div>
                  <div><span className="text-gray-500">NCR</span><div className="font-medium">{summaryHeader?.a_ncr ?? 0}</div></div>
                </div>
              ) : null}

              <div className="border rounded-md">
                <div className="px-3 py-2 font-medium bg-muted">Details</div>
                <div className="max-h-80 overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-gray-500">
                      <tr>
                        <th className="px-3 py-2 w-16">Item</th>
                        <th className="px-3 py-2">Description</th>
                        <th className="px-3 py-2 w-16">NCR</th>
                        <th className="px-3 py-2 w-20">Rate</th>
                        <th className="px-3 py-2">Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summaryDetails.length ? summaryDetails.map((d) => (
                        <tr key={d.adt_id} className="border-t">
                          <td className="px-3 py-2">{d.adt_item}</td>
                          <td className="px-3 py-2">{d.qset_desc || '-'}</td>
                          <td className="px-3 py-2">{d.adt_ncr}</td>
                          <td className="px-3 py-2">{typeof d.adt_rate === 'number' ? d.adt_rate.toFixed(2) : String(d.adt_rate)}</td>
                          <td className="px-3 py-2">{d.qset_type || '-'}</td>
                        </tr>
                      )) : (
                        <tr><td className="px-3 py-3 text-center text-gray-500" colSpan={5}>No details</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpenSummaryId(null)}>Close</Button>
            {(() => {
              const accepted = openSummaryId ? Boolean(rows.find(r => r.assess_id === openSummaryId)?.acceptance_status || summaryHeader?.acceptance_status) : false;
              return (
                <Button onClick={acceptAssessment} disabled={accepting || accepted}>
                  {accepting ? 'Accepting…' : (accepted ? 'Accepted' : 'Accept')}
                </Button>
              );
            })()}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AssessmentPortal;
