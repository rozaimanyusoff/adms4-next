'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { authenticatedApi } from '@/config/api';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { OTPInput } from '@/components/ui/otp-input';
import { useSearchParams } from 'next/navigation';

//http://localhost:3000/compliance/assessment/portal/149?code=003461197910

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
  const [pendingDownloadId, setPendingDownloadId] = useState<number | null>(null);

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

  const loadSummary = async (assessId: number) => {
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

  const openAcceptance = async (assessId: number) => {
    setOpenSummaryId(assessId);
    await loadSummary(assessId);
  };

  const mysqlNow = () => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  };

  const acceptAssessment = async () => {
    if (!openSummaryId) return;
    setAccepting(true);
    try {
      await authenticatedApi.put(`/api/compliance/assessments/${openSummaryId}/acceptance`, {
        acceptance_status: 1,
        acceptance_date: mysqlNow(),
      } as any);
      toast.success('Acceptance recorded');
      await fetchRows();
      const toDownload = pendingDownloadId;
      setOpenSummaryId(null);
      setPendingDownloadId(null);
      if (toDownload) setTimeout(() => downloadSummary(toDownload), 50);
    } catch (err) {
      console.error('Failed to update acceptance', err);
      toast.error('Failed to update acceptance');
    } finally {
      setAccepting(false);
    }
  };

  const computeNcrCounts = (details: AssessmentDetail[]) => {
    let comply = 0; let notComply = 0;
    for (const d of details) {
      if ((d.qset_type || '').toUpperCase() === 'NCR') {
        if (d.adt_ncr === 1) comply++; else if (d.adt_ncr === 2) notComply++;
      }
    }
    return { comply, notComply };
  };

  const downloadSummary = async (assessId: number) => {
    try {
      const res = await authenticatedApi.get(`/api/compliance/assessments/${assessId}`);
      const payload: any = (res as any)?.data?.data || (res as any)?.data || {};
      const details: AssessmentDetail[] = Array.isArray(payload?.details) ? payload.details : [];
      const { comply, notComply } = computeNcrCounts(details);
      const rate = parseRate(payload?.a_rate);

      const safe = (v: any) => (v === null || v === undefined ? '' : String(v));
      const vehicleNo = safe(payload?.asset?.register_number);
      const locationCode = safe(payload?.assessment_location?.code || payload?.asset?.location?.code);
      const driverId = safe(payload?.asset?.owner?.ramco_id);
      const driverName = safe(payload?.asset?.owner?.full_name);
      const vehicleAge = safe(payload?.asset?.age);
      const makeModel = [safe(payload?.asset?.make), safe(payload?.asset?.model)].filter(Boolean).join(' ').trim();

      const headerHtml = `
        <div style="background:#2d2d2d;color:#fff;padding:6px 10px;font-weight:600">VEHICLE ASSESSMENT FORM</div>
        <table style="width:100%;border-collapse:collapse;font-size:10px">
          <tbody>
            <tr>
              <td style="border:1px solid #cbd5e1;padding:6px;width:25%">Assessment Date:</td>
              <td style="border:1px solid #cbd5e1;padding:6px;width:25%">${formatDMY(payload?.a_date || payload?.a_dt)}</td>
              <td style="border:1px solid #cbd5e1;padding:6px;width:25%">Driver's:</td>
              <td style="border:1px solid #cbd5e1;padding:6px;width:25%">${driverName || '&nbsp;'}</td>
            </tr>
            <tr>
              <td style="border:1px solid #cbd5e1;padding:6px">Assessed Location:</td>
              <td style="border:1px solid #cbd5e1;padding:6px">${locationCode || '&nbsp;'}</td>
              <td style="border:1px solid #cbd5e1;padding:6px">Driver's Employee ID:</td>
              <td style="border:1px solid #cbd5e1;padding:6px">${driverId || '&nbsp;'}</td>
            </tr>
            <tr>
              <td style="border:1px solid #cbd5e1;padding:6px">Vehicle Registration No:</td>
              <td style="border:1px solid #cbd5e1;padding:6px">${vehicleNo || '&nbsp;'}</td>
              <td style="border:1px solid #cbd5e1;padding:6px">Vehicle Age:</td>
              <td style="border:1px solid #cbd5e1;padding:6px">${vehicleAge || '&nbsp;'} year(s)</td>
            </tr>
          </tbody>
        </table>
        <div style="margin:10px 0 0 0;font-size:10px;color:#111827;text-align:center;font-weight:600">Comply: ${comply} &nbsp;&nbsp; Not-comply: ${notComply} &nbsp;&nbsp; NCR (Not-comply): ${payload?.a_ncr ?? 0} &nbsp;&nbsp; Rate: ${rate !== null ? rate.toFixed(2) : '-'}%</div>
      `;

      const rowsHtml = details.map((d, idx) => {
        const type = (d.qset_type || '').toUpperCase();
        const ncrLabel = type === 'NCR' ? (d.adt_ncr === 1 ? 'Comply' : (d.adt_ncr === 2 ? 'Not-comply' : '')) : '';
        let rateCell = '';
        if (type === 'NCR') {
          const r = Number(d.adt_rate);
          rateCell = r === 0 ? 'N/A' : '';
        } else if (type === 'SELECTION') {
          const v = Number(d.adt_rate2);
          rateCell = v === 1 ? 'Equipped' : (v === 2 ? 'Missing' : 'N/A');
        } else if (type === 'RATING') {
          const n = Number(typeof d.adt_rate === 'number' ? d.adt_rate : (d.adt_rate ?? ''));
          rateCell = Number.isFinite(n) ? (n === 0 ? 'N/A' : String(n)) : '';
        } else {
          rateCell = typeof d.adt_rate === 'number' ? String(d.adt_rate) : String(d.adt_rate ?? '');
        }
        return `
          <tr>
            <td style="border:1px solid #e5e7eb;padding:6px">${idx + 1}</td>
            <td style="border:1px solid #e5e7eb;padding:6px">${d.qset_desc || ''}</td>
            <td style="border:1px solid #e5e7eb;padding:6px">${ncrLabel}</td>
            <td style="border:1px solid #e5e7eb;padding:6px">${rateCell}</td>
            <td style="border:1px solid #e5e7eb;padding:6px">${type}</td>
          </tr>`;
      }).join('');

      const html = `<!doctype html>
        <html><head><meta charset="utf-8" />
        <title>Assessment ${assessId} Summary</title>
        <style>
          body{font-family:Inter,ui-sans-serif,system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif; padding:20px; font-size:10px;}
          table{border-collapse:collapse;width:100%;font-size:10px}
          thead{background:#f9fafb}
          th,td{border:1px solid #e5e7eb;padding:6px;text-align:left}
          .toolbar{display:flex;gap:8px;margin-bottom:12px}
          .btn{padding:6px 10px;border:1px solid #cbd5e1;border-radius:6px;background:#f3f4f6;cursor:pointer}
          .btn.red{background:#fee2e2;border-color:#fecaca;color:#991b1b}
          @media print{ .toolbar{ display:none } @page{ size:A4 portrait; margin:12mm } }
        </style>
        <script src="https://cdn.jsdelivr.net/npm/html2pdf.js@0.10.1/dist/html2pdf.bundle.min.js"></script>
        </head><body>
        <div class="toolbar">
          <button class="btn red" onclick="window.close()">Close</button>
          <button class="btn" onclick="(function(){
            const el = document.getElementById('summary-root');
            if (!window.html2pdf || !el) { window.print(); return; }
            window.html2pdf().from(el).set({ margin: 10, filename: 'assessment-${assessId}-summary.pdf', image:{ type:'jpeg', quality:0.98 }, html2canvas:{ scale:2, useCORS:true }, jsPDF:{ unit:'mm', format:'a4', orientation:'portrait' } }).save();
          })()">Save PDF</button>
        </div>
        <div id="summary-root">
        ${headerHtml}
        <div style="margin-top:10px"></div>
        <table>
          <thead><tr><th>Item</th><th>Description</th><th>NCR</th><th>Rate</th><th>Type</th></tr></thead>
          <tbody>${rowsHtml}</tbody>
        </table>
        <div style="margin-top:8px;font-size:10px;color:#374151">Skala: 1-Tidak Memuaskan / Tidak Berfungsi 2-Memuaskan 3-Baik 4-Cemerlang / Berfungsi Dengan Baik</div>
        </div>
        </body></html>`;

      // Open in a new tab (user can Print or Save PDF from toolbar)
      const w = window.open('', '_blank');
      if (w) { w.document.open(); w.document.write(html); w.document.close(); }
    } catch (err) {
      console.error('Failed to download summary', err);
      toast.error('Failed to download summary');
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
        <div className="grid grid-cols-1 gap-4">
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
                    <div className="space-y-1">
                      <div><span className="text-gray-500">Date</span><div className="font-medium">{formatDMY(row.a_date ?? row.a_dt)}</div></div>
                      <div><span className="text-gray-500">Location</span><div className="font-medium">{loc}</div></div>
                      <div><span className="text-gray-500">NCR (Not-comply)</span><div className="font-medium">{row.a_ncr ?? 0}</div></div>
                      <div><span className="text-gray-500">Rate</span><div className="font-medium">{rate !== null ? `${rate.toFixed(2)}%` : '-'}</div></div>
                      <div>
                        <span className="text-gray-500">Photos</span>
                        {uploads.length ? (
                          <div className="mt-1 flex gap-2">
                            {uploads.slice(0, 3).map((u, i) => (
                              <img key={i} src={u} alt={`upload-${i+1}`} className="h-14 w-20 object-cover rounded border" />
                            ))}
                            {uploads.length > 3 ? (
                              <div className="h-14 w-20 flex items-center justify-center rounded border bg-gray-50 text-xs text-gray-600">+{uploads.length - 3}</div>
                            ) : null}
                          </div>
                        ) : (
                          <div className="font-medium">—</div>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" onClick={async () => {
                        const acceptedNow = Boolean(row.acceptance_status);
                        if (!acceptedNow) {
                          setPendingDownloadId(row.assess_id);
                          await openAcceptance(row.assess_id);
                        } else {
                          downloadSummary(row.assess_id);
                        }
                      }}>Show Summary</Button>
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

      <Dialog open={openSummaryId !== null} onOpenChange={(o) => { if (!o) { setOpenSummaryId(null); setPendingDownloadId(null); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Confirm Acceptance</DialogTitle>
            <DialogDescription>Please accept to view the summary.</DialogDescription>
          </DialogHeader>
          {summaryLoading ? (
            <div className="py-6">Loading…</div>
          ) : (
            <div className="space-y-2 text-sm">
              {summaryHeader ? (
                <div className="space-y-2">
                  <div><span className="text-gray-500">Assessment</span><div className="font-medium">#{openSummaryId}</div></div>
                  <div><span className="text-gray-500">Vehicle</span><div className="font-medium">{summaryHeader?.asset?.register_number || '-'}</div></div>
                  <div><span className="text-gray-500">Location</span><div className="font-medium">{summaryHeader?.assessment_location?.code || summaryHeader?.asset?.location?.code || '-'}</div></div>
                  <div><span className="text-gray-500">Date</span><div className="font-medium">{formatDMY(summaryHeader?.a_date || summaryHeader?.a_dt)}</div></div>
                  {(() => {
                    let comply = 0, notComply = 0;
                    for (const d of summaryDetails) {
                      if ((d.qset_type || '').toUpperCase() === 'NCR') {
                        if (d.adt_ncr === 1) comply++; else if (d.adt_ncr === 2) notComply++;
                      }
                    }
                    return (
                      <>
                        <div><span className="text-gray-500">Comply</span><div className="font-medium text-green-700">{comply}</div></div>
                        <div><span className="text-gray-500">Not-comply</span><div className="font-medium text-red-700">{notComply}</div></div>
                      </>
                    );
                  })()}
                </div>
              ) : null}
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setOpenSummaryId(null); setPendingDownloadId(null); }}>Cancel</Button>
            <Button onClick={acceptAssessment} disabled={accepting}>{accepting ? 'Accepting…' : 'Accept & Show'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AssessmentPortal;
