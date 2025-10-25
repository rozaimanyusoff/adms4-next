'use client';
import React, { useEffect, useMemo, useState, useContext } from 'react';
import { authenticatedApi } from '@/config/api';
import { AuthContext } from '@/store/AuthContext';
import { Loader2, Table as TableIcon, List as ListIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

type ApiParticipantItem = {
  participant_id: number;
  training_id: number;
  participant: {
    ramco_id: string;
    full_name: string;
  };
  training_details: {
    training_id: number;
    date: string; // e.g. "9/12/2023 9:00 AM"
    course_title: string;
    hrs?: string | number | null; // e.g. "14.00"
    days?: string | number | null;
    venue?: string | null;
    attendance_upload?: string | null;
  };
  attendance?: string | null;
};

interface TrainingParticipantProps {
  username?: string; // Ramco ID; if omitted, derive from AuthContext
  className?: string;
}

function parseDMY(dateStr: string): Date | null {
  if (!dateStr) return null;
  // Expected like "9/12/2023 9:00 AM" (DD/MM/YYYY)
  const [dpart, tpart] = dateStr.split(' ');
  if (!dpart) return null;
  const bits = dpart.split('/')
    .map(s => s.trim())
    .filter(Boolean);
  if (bits.length < 3) return null;
  const dd = parseInt(bits[0], 10);
  const mm = parseInt(bits[1], 10);
  const yyyy = parseInt(bits[2], 10);
  if (!Number.isFinite(dd) || !Number.isFinite(mm) || !Number.isFinite(yyyy)) return null;
  let hh = 0, min = 0;
  if (tpart) {
    // Handle simple 12h like "9:00 AM"
    const m = tpart.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (m) {
      hh = parseInt(m[1], 10);
      min = parseInt(m[2], 10);
      const ampm = (m[3] || '').toUpperCase();
      if (ampm === 'PM' && hh < 12) hh += 12;
      if (ampm === 'AM' && hh === 12) hh = 0;
    }
  }
  // Month in JS is 0-based
  const d = new Date(yyyy, mm - 1, dd, hh, min, 0, 0);
  return isNaN(d.getTime()) ? null : d;
}

const monthShort = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function formatDMY(dateStr?: string | null): string {
  if (!dateStr) return '-';
  const d = parseDMY(dateStr);
  if (!d) return '-';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = d.getFullYear();
  return `${dd}/${mm}/${yy}`;
}

const TrainingParticipant: React.FC<TrainingParticipantProps> = ({ username, className }) => {
  const authCtx = useContext(AuthContext);
  const effectiveUsername = username || authCtx?.authData?.user?.username || '';

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<ApiParticipantItem[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);
  const [pendingTitle, setPendingTitle] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'list'>('table');

  useEffect(() => {
    const load = async () => {
      if (!effectiveUsername) return;
      setLoading(true);
      setError(null);
      try {
        const res = await authenticatedApi.get('/api/training/participants', {
          params: { ramco: effectiveUsername },
        });
        const raw: any = res?.data;
        const list: ApiParticipantItem[] = Array.isArray(raw)
          ? raw
          : Array.isArray(raw?.data)
            ? raw.data
            : Array.isArray(raw?.items)
              ? raw.items
              : raw && raw.participant_id
                ? [raw]
                : [];
        setItems(list);
      } catch (e: any) {
        setError(e?.response?.data?.message || 'Failed to load participant trainings');
        setItems([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [effectiveUsername]);

  const structure = useMemo(() => {
    type MonthMap = { [monthIndex: number]: ApiParticipantItem[] };
    const byYear: { [year: number]: MonthMap } = {};
    let minYear: number | null = null;
    let maxYear: number | null = null;

    for (const it of items) {
      const dt = parseDMY(it?.training_details?.date || '') || null;
      if (!dt) continue;
      const y = dt.getFullYear();
      const m = dt.getMonth();
      if (!(y in byYear)) byYear[y] = {};
      if (!(m in byYear[y])) byYear[y][m] = [];
      byYear[y][m].push(it);
      if (minYear === null || y < minYear) minYear = y;
      if (maxYear === null || y > maxYear) maxYear = y;
    }

    if (minYear === null || maxYear === null) return { years: [], byYear };
    // Build contiguous range (ascending), we'll render in descending order
    const years: number[] = [];
    for (let y = minYear; y <= maxYear; y++) years.push(y);
    return { years, byYear };
  }, [items]);

  const totalsByYear = useMemo(() => {
    const totals: Record<number, number> = {};
    for (const y of structure.years) {
      let sum = 0;
      const months = structure.byYear[y] || {};
      for (let m = 0; m < 12; m++) {
        const arr = months[m] || [];
        for (const it of arr) {
          const v = it?.training_details?.hrs;
          const num = typeof v === 'string' ? parseFloat(v) : typeof v === 'number' ? v : 0;
          if (Number.isFinite(num)) sum += num;
        }
      }
      totals[y] = sum;
    }
    return totals;
  }, [structure]);

  return (
    <div className={className}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">Employee Training Records</h3>
          {effectiveUsername ? (
            <p className="text-sm text-gray-600">Ramco ID: {effectiveUsername}</p>
          ) : (
            <p className="text-sm text-red-600">No username provided.</p>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant={viewMode === 'table' ? 'default' : 'outline'}
            onClick={() => setViewMode('table')}
            title="Table view"
          >
            <TableIcon className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant={viewMode === 'list' ? 'default' : 'outline'}
            onClick={() => setViewMode('list')}
            title="List view"
          >
            <ListIcon className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Loader2 className="animate-spin w-4 h-4" /> Loading...
        </div>
      ) : error ? (
        <div className="text-sm text-red-600">{error}</div>
      ) : structure.years.length === 0 ? (
        <div className="text-sm text-gray-500">No training records found.</div>
      ) : viewMode === 'table' ? (
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-200 text-xs">
            <thead>
              <tr className="bg-gray-50 text-xs">
                <th className="border px-2 py-1 text-left">Year</th>
                {monthShort.map((m) => (
                  <th
                    key={m}
                    className="border px-2 py-1 text-center w-44 min-w-[11rem] max-w-[11rem]"
                  >
                    {m}
                  </th>
                ))}
                <th className="border px-2 py-1 text-right">Total (hrs)</th>
              </tr>
            </thead>
            <tbody>
              {[...structure.years].sort((a,b) => b - a).map((y) => {
                const months = structure.byYear[y] || {};
                return (
                  <tr key={y}>
                    <td className="border px-2 py-1 font-medium">{y}</td>
                    {Array.from({ length: 12 }, (_, mi) => {
                      const records = months[mi] || [];
                      return (
                        <td
                          key={`${y}-${mi}`}
                          className="border align-top px-2 py-1 w-44 min-w-[11rem] max-w-[11rem]"
                        >
                          {records.length === 0 ? (
                            <span className="text-gray-300">—</span>
                          ) : (
                            <ul className="list-disc list-inside space-y-0.5">
                              {records.map((it, idx) => {
                                const hrs = it?.training_details?.hrs;
                                const hrsText = typeof hrs === 'number' ? hrs.toFixed(2) : (hrs || '').toString();
                                const link = it?.training_details?.attendance_upload || '';
                                const dText = formatDMY(it?.training_details?.date);
                                return (
                                  <li key={`${it.participant_id}-${idx}`} className="leading-snug">
                                    <div className="leading-tight">
                                      {link ? (
                                        <button
                                          type="button"
                                          className="text-blue-600 text-start hover:underline"
                                          onClick={() => {
                                            setPendingUrl(link);
                                            setPendingTitle(it.training_details.course_title);
                                            setConfirmOpen(true);
                                          }}
                                        >
                                          {it.training_details.course_title}
                                        </button>
                                      ) : (
                                        <span className="text-gray-800">{it.training_details.course_title}</span>
                                      )}
                                      <div className="text-[10px] text-gray-500">{dText} ({hrsText})</div>
                                    </div>
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </td>
                      );
                    })}
                    <td className="border px-2 py-1 text-right font-semibold">
                      {totalsByYear[y].toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="space-y-3">
          {[...structure.years].sort((a,b) => b - a).map((y) => {
            const months = structure.byYear[y] || {};
            return (
              <div key={`list-${y}`} className="border rounded-md overflow-hidden">
                <div className="bg-gray-50 px-3 py-2 text-xs font-semibold flex items-center justify-between">
                  <span>Year {y}</span>
                  <span className="text-gray-600">Total: {totalsByYear[y].toFixed(2)} hrs</span>
                </div>
                <div className="p-3">
                  {Array.from({ length: 12 }, (_, mi) => {
                    const records = months[mi] || [];
                    if (records.length === 0) return null;
                    return (
                      <div key={`list-${y}-${mi}`} className="mb-3 last:mb-0">
                        <div className="text-xs font-semibold text-gray-700 mb-1">{monthShort[mi]}</div>
                        <ul className="list-disc list-inside space-y-1">
                          {records.map((it, idx) => {
                            const hrs = it?.training_details?.hrs;
                            const hrsText = typeof hrs === 'number' ? hrs.toFixed(2) : (hrs || '').toString();
                            const link = it?.training_details?.attendance_upload || '';
                            const dText = formatDMY(it?.training_details?.date);
                            return (
                              <li key={`ll-${it.participant_id}-${idx}`} className="leading-snug">
                                <div className="leading-tight">
                                  {link ? (
                                    <button
                                      type="button"
                                      className="text-blue-600 text-start hover:underline"
                                      onClick={() => {
                                        setPendingUrl(link);
                                        setPendingTitle(it.training_details.course_title);
                                        setConfirmOpen(true);
                                      }}
                                    >
                                      {it.training_details.course_title}
                                    </button>
                                  ) : (
                                    <span className="text-gray-800">{it.training_details.course_title}</span>
                                  )}
                                  <div className="text-[10px] text-gray-500">{dText} ({hrsText})</div>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Download confirmation dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Download attendance file?</DialogTitle>
            <DialogDescription>
              {pendingTitle ? `Training: ${pendingTitle}` : 'Proceed to download the attendance file.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!pendingUrl) { setConfirmOpen(false); return; }
                try {
                  // Try to trigger a direct download; fallback to opening in a new tab
                  const a = document.createElement('a');
                  a.href = pendingUrl;
                  a.download = '';
                  a.rel = 'noopener noreferrer';
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                } catch (_) {
                  window.open(pendingUrl, '_blank');
                } finally {
                  setConfirmOpen(false);
                }
              }}
            >
              Download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TrainingParticipant;
