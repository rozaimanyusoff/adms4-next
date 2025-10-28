'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { authenticatedApi } from '@/config/api';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { downloadFuelVehicleSummary } from './excel-fuel-report';
import { Button } from '@/components/ui/button';

interface FuelBillItem {
  stmt_id: number;
  stmt_no: string;
  stmt_date: string; // ISO
  stmt_total: string; // numeric string
}

type YearSummary = {
  year: number;
  months: number[]; // 12 months
  total: number;
};

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function parseAmount(v: string | number | null | undefined): number {
  if (v === null || v === undefined) return 0;
  const n = typeof v === 'number' ? v : parseFloat(v.replace(/,/g, ''));
  return isNaN(n) ? 0 : n;
}

function formatAmount(n: number): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const FuelBillSummary: React.FC = () => {
  const [items, setItems] = useState<FuelBillItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await authenticatedApi.get<{ data: any[] }>(`/api/bills/fuel`);
        const list = Array.isArray(res.data?.data) ? res.data.data : [];
        const normalized: FuelBillItem[] = list.map((x: any) => ({
          stmt_id: Number(x.stmt_id),
          stmt_no: String(x.stmt_no ?? ''),
          stmt_date: String(x.stmt_date ?? ''),
          stmt_total: String(x.stmt_total ?? '0'),
        }));
        setItems(normalized);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const summaries = useMemo<YearSummary[]>(() => {
    const map = new Map<number, YearSummary>();
    for (const it of items) {
      if (!it.stmt_date) continue;
      const d = new Date(it.stmt_date);
      if (isNaN(d.getTime())) continue;
      const y = d.getFullYear();
      const m = d.getMonth();
      const amt = parseAmount(it.stmt_total);
      if (!map.has(y)) {
        map.set(y, { year: y, months: Array(12).fill(0), total: 0 });
      }
      const row = map.get(y)!;
      row.months[m] += amt;
      row.total += amt;
    }
    return Array.from(map.values()).sort((a,b) => b.year - a.year);
  }, [items]);

  const monthRange = (year: number, monthIndex: number) => {
    const pad = (n: number) => n.toString().padStart(2, '0');
    const from = `${year}-${pad(monthIndex + 1)}-01`;
    const last = new Date(year, monthIndex + 1, 0).getDate();
    const to = `${year}-${pad(monthIndex + 1)}-${pad(last)}`;
    const url = `/api/bills/fuel/summary/vehicle?from=${from}&to=${to}`;
    return { from, to, url };
  };

  const toggleCell = (year: number, monthIndex: number) => {
    const key = `${year}-${monthIndex}`;
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const handleExportSelection = () => {
    if (selected.size === 0) return;
    const list = Array.from(selected)
      .map(k => {
        const [y, m] = k.split('-').map(Number);
        return { y, m };
      })
      .sort((a, b) => a.y === b.y ? a.m - b.m : a.y - b.y);
    const first = list[0];
    const last = list[list.length - 1];
    const start = monthRange(first.y, first.m).from;
    const end = monthRange(last.y, last.m).to;
    downloadFuelVehicleSummary(start, end);
  };

  return (
    <Accordion type="single" collapsible>
      <AccordionItem value="fuel-summary">
        <AccordionTrigger>
          <div className="flex items-center gap-3 w-full">
            <span className="font-semibold">Fuel Bill Summary</span>
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
            <table className="min-w-full text-sm border">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border px-2 py-1 text-left">Year</th>
                  {MONTHS.map(m => (
                    <th key={m} className="border px-2 py-1 text-right">{m}</th>
                  ))}
                  <th className="border px-2 py-1 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {summaries.length === 0 ? (
                  <tr>
                    <td className="px-3 py-2 text-center" colSpan={14}>No data</td>
                  </tr>
                ) : (
                  summaries.map(row => (
                    <tr key={row.year}>
                      <td className="border px-2 py-1 font-medium">{row.year}</td>
                      {row.months.map((val, i) => {
                        const { from, to, url } = monthRange(row.year, i);
                        const key = `${row.year}-${i}`;
                        const canSelect = val > 0;
                        const isChecked = selected.has(key);
                        return (
                          <td key={i} className="border px-2 py-1">
                            <div className="flex items-center justify-end gap-2">
                              <a
                                href={url}
                                className={`hover:underline ${val > 0 ? 'text-blue-600' : 'text-gray-500'}`}
                                title={`Download vehicle summary for ${MONTHS[i]} ${row.year}`}
                                onClick={(e) => { e.preventDefault(); downloadFuelVehicleSummary(from, to); }}
                              >
                                {formatAmount(val)}
                              </a>
                              {canSelect && (
                                <input
                                  type="checkbox"
                                  aria-label={`Select ${MONTHS[i]} ${row.year}`}
                                  checked={isChecked}
                                  onChange={() => toggleCell(row.year, i)}
                                />
                              )}
                            </div>
                          </td>
                        );
                      })}
                      <td className="border px-2 py-1 text-right font-semibold">{formatAmount(row.total)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};

export default FuelBillSummary;
