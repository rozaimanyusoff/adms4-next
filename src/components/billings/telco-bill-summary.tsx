'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { authenticatedApi } from '@/config/api';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface TelcoBill {
  id: number;
  bill_date: string;
  grand_total: string;
  account?: { provider?: string };
}

type YearRow = { year: number; months: number[]; total: number };

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function toNum(v: any): number {
  if (v === null || v === undefined) return 0;
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/,/g, ''));
  return isNaN(n) ? 0 : n;
}

function fmt(n: number): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const TelcoBillSummary: React.FC = () => {
  const [items, setItems] = useState<TelcoBill[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    authenticatedApi.get<{ data: TelcoBill[] }>(`/api/telco/bills`)
      .then(res => {
        const list = Array.isArray(res.data?.data) ? res.data.data : [];
        setItems(list);
      })
      .catch(() => setItems([]))
      .then(() => setLoading(false));
  }, []);

  const byProvider: Record<string, YearRow[]> = useMemo(() => {
    const groups = new Map<string, Map<number, YearRow>>();
    for (const b of items) {
      const provider = b.account?.provider || 'Unknown';
      const d = b.bill_date ? new Date(b.bill_date) : null;
      if (!d || isNaN(d.getTime())) continue;
      const y = d.getFullYear();
      const m = d.getMonth();
      const amt = toNum(b.grand_total);
      if (!groups.has(provider)) groups.set(provider, new Map<number, YearRow>());
      const ym = groups.get(provider)!;
      if (!ym.has(y)) ym.set(y, { year: y, months: Array(12).fill(0), total: 0 });
      const row = ym.get(y)!;
      row.months[m] += amt;
      row.total += amt;
    }
    const out: Record<string, YearRow[]> = {};
    for (const [prov, yearMap] of groups.entries()) {
      out[prov] = Array.from(yearMap.values()).sort((a,b) => b.year - a.year);
    }
    return out;
  }, [items]);

  const providers = useMemo(() => Object.keys(byProvider).sort(), [byProvider]);

  return (
    <Accordion type="multiple">
      {providers.map((prov) => (
        <AccordionItem value={`prov-${prov}`} key={prov}>
          <AccordionTrigger>
            <div className="flex items-center gap-3 w-full">
              <span className="font-semibold">{prov} Summary</span>
              {loading ? <span className="text-xs text-gray-500">Loading…</span> : null}
            </div>
          </AccordionTrigger>
          <AccordionContent>
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
                  {(byProvider[prov] || []).length === 0 ? (
                    <tr><td className="px-3 py-2 text-center" colSpan={14}>No data</td></tr>
                  ) : (
                    byProvider[prov].map(row => (
                      <tr key={`${prov}-${row.year}`}>
                        <td className="border px-2 py-1 font-medium">{row.year}</td>
                        {row.months.map((v, i) => (
                          <td key={i} className="border px-2 py-1 text-right">{fmt(v)}</td>
                        ))}
                        <td className="border px-2 py-1 text-right font-semibold">{fmt(row.total)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
};

export default TelcoBillSummary;

