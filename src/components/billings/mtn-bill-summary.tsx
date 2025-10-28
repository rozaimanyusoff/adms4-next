'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { authenticatedApi } from '@/config/api';
import { Button } from '@/components/ui/button';
// import { Download } from 'lucide-react';
// Excel generation handled by excel-maintenance-report helper
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { downloadMaintenanceVehicleSummary } from './excel-maintenance-report';

type MtnInv = {
  inv_id: number;
  inv_no: string | null;
  entry_date?: string | null;
  inv_date: string | null;
  svc_order?: string | null;
  asset?: any;
  workshop?: any;
  svc_date?: string | null;
  svc_odo?: string | null;
  inv_total: string; // might come as string
  inv_stat?: string | null;
  inv_remarks?: string | null;
  running_no?: number;
};

const monthShort = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'] as const;

function toNumber(amount: string | number | null | undefined) {
  if (amount == null) return 0;
  const n = typeof amount === 'string' ? parseFloat(amount) : amount;
  return Number.isFinite(n) ? Number(n) : 0;
}

function formatCurrencyMY(amount: number) {
  // Display as plain number with 2 decimals (no currency symbol)
  return new Intl.NumberFormat('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
}

const MtnBillSummary: React.FC = () => {
  const [data, setData] = useState<MtnInv[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await authenticatedApi.get('/api/bills/mtn/inv');
        const payload = (res.data as any) || [];
        // Normalize: support {data: [...]} or plain array
        const arr: MtnInv[] = Array.isArray(payload) ? payload : (payload.data || []);
        if (mounted) setData(arr);
      } catch (e: any) {
        if (mounted) setError('Failed to load invoice summary');
        console.error('Error fetching /api/bills/mtn/inv', e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const byYearMonth = useMemo(() => {
    const map = new Map<number, number[]>(); // year -> [12 months]
    for (const item of data) {
      if (!item.inv_date) continue;
      const d = new Date(item.inv_date);
      const year = d.getFullYear();
      const monthIdx = d.getMonth(); // 0..11
      if (!map.has(year)) map.set(year, new Array(12).fill(0));
      const mArr = map.get(year)!;
      mArr[monthIdx] += toNumber(item.inv_total);
    }
    // Sort by year descending by default for quick scanning
    return Array.from(map.entries()).sort((a, b) => b[0] - a[0]);
  }, [data]);

  // summaryMatrix removed (export now handled via selected month range)

  const monthRange = (year: number, monthIdx: number) => {
    const pad = (n: number) => n.toString().padStart(2, '0');
    const from = `${year}-${pad(monthIdx + 1)}-01`;
    const last = new Date(year, monthIdx + 1, 0).getDate();
    const to = `${year}-${pad(monthIdx + 1)}-${pad(last)}`;
    const url = `/api/bills/mtn/summary/vehicle?from=${from}&to=${to}`;
    return { from, to, url };
  };

  const toggleCell = (year: number, monthIdx: number) => {
    const key = `${year}-${monthIdx}`;
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const handleExportSelection = () => {
    if (selected.size === 0) return;
    const sels = Array.from(selected).map(s => {
      const [y, m] = s.split('-').map(Number);
      return { y, m };
    }).sort((a,b) => a.y === b.y ? a.m - b.m : a.y - b.y);
    const first = sels[0];
    const last = sels[sels.length - 1];
    const start = monthRange(first.y, first.m).from;
    const end = monthRange(last.y, last.m).to;
    downloadMaintenanceVehicleSummary(start, end);
  };

  if (loading) {
    return (
      <div className="p-4 text-sm text-gray-500">Loading summary…</div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-sm text-red-600">{error}</div>
    );
  }

  if (byYearMonth.length === 0) {
    return (
      <div className="p-4 text-sm text-gray-500">No data available.</div>
    );
  }

  // (legacy CSV/XLSX exports removed; export handled per selection via helper)

  return (
    <Accordion type="single" collapsible>
      <AccordionItem value="mtn-summary">
        <AccordionTrigger>
          <div className="flex items-center gap-3 w-full">
            <span className="font-semibold">Maintenance Bill Summary</span>
            {loading ? <span className="text-xs text-gray-500">Loading…</span> : null}
          </div>
        </AccordionTrigger>
        <AccordionContent>
          {selected.size > 0 && (
            <div className="flex justify-end mb-2">
              <Button size="sm" onClick={handleExportSelection}>
                Export Selected ({selected.size})
              </Button>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="min-w-full border text-sm border-gray-200 dark:border-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-2 py-2 text-left border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200">Year</th>
                  {monthShort.map((m) => (
                    <th key={m} className="px-2 py-2 text-right border font-normal border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200">{m}</th>
                  ))}
                  <th className="px-2 py-2 text-right border font-semibold border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200">Total</th>
                </tr>
              </thead>
              <tbody>
                {byYearMonth.map(([year, months]) => {
                  const rowTotal = months.reduce((s, v) => s + v, 0);
                  return (
                    <tr key={year} className="odd:bg-white even:bg-gray-50 dark:odd:bg-gray-900 dark:even:bg-gray-800">
                      <td className="px-2 py-2 border border-gray-200 dark:border-gray-700 font-medium text-gray-900 dark:text-gray-100">{year}</td>
                      {months.map((amt, idx) => {
                        const { from, to, url } = monthRange(year, idx);
                        const key = `${year}-${idx}`;
                        const canSelect = amt > 0;
                        const isChecked = selected.has(key);
                        return (
                          <td key={`${year}-${idx}`} className="px-2 py-2 border text-right tabular-nums border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100">
                            <div className="flex items-center justify-end gap-2">
                              {amt > 0 ? (
                                <a
                                  href={url}
                                  className="text-blue-600 hover:underline"
                                  title={`Download vehicle maintenance for ${monthShort[idx]} ${year}`}
                                  onClick={(e) => { e.preventDefault(); downloadMaintenanceVehicleSummary(from, to); }}
                                >
                                  {formatCurrencyMY(amt)}
                                </a>
                              ) : (
                                <span className="text-gray-500">-</span>
                              )}
                              {canSelect && (
                                <input
                                  type="checkbox"
                                  aria-label={`Select ${monthShort[idx]} ${year}`}
                                  checked={isChecked}
                                  onChange={() => toggleCell(year, idx)}
                                />
                              )}
                            </div>
                          </td>
                        );
                      })}
                      <td className="px-2 py-2 border text-right font-semibold tabular-nums text-green-700 dark:text-green-400 border-gray-200 dark:border-gray-700">
                        {formatCurrencyMY(rowTotal)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};

export default MtnBillSummary;
