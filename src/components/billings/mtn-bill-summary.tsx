'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { authenticatedApi } from '@/config/api';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import ExcelJS from 'exceljs';

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
  return new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR', minimumFractionDigits: 2 }).format(amount);
}

const MtnBillSummary: React.FC = () => {
  const [data, setData] = useState<MtnInv[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  // Build a 2D array for export where the first row is the header
  const summaryMatrix = useMemo(() => {
    const header = ['Year', ...monthShort, 'Total'];
    const rows = byYearMonth.map(([year, months]) => {
      const total = months.reduce((s, v) => s + v, 0);
      // For export, use numbers (2 decimals). Empty months as empty string
      const monthVals = months.map(v => v > 0 ? v : 0);
      return [year, ...monthVals, total];
    });
    return { header, rows };
  }, [byYearMonth]);

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

  const exportCSV = () => {
    const { header, rows } = summaryMatrix;
    const lines: string[] = [];
    const esc = (v: any) => {
      if (typeof v === 'number') return v.toFixed(2);
      const s = String(v ?? '');
      if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
      return s;
    };
    lines.push(header.join(','));
    for (const r of rows) {
      lines.push(r.map(esc).join(','));
    }
    const csv = lines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const ts = new Date().toISOString().slice(0,10);
    a.href = url;
    a.download = `mtn-invoices-summary-${ts}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportExcel = async () => {
    const { header, rows } = summaryMatrix;

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Summary');

    ws.addRow(header);
    rows.forEach(r => ws.addRow(r));

    // Style header
    const headerRow = ws.getRow(1);
    headerRow.font = { bold: true };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    // Column widths and number formats: months + total as RM currency
    ws.getColumn(1).width = 10; // Year
    for (let c = 2; c <= header.length; c++) {
      ws.getColumn(c).width = 14;
      ws.getColumn(c).numFmt = 'RM #,##0.00';
    }

    // Freeze header
    ws.views = [{ state: 'frozen', ySplit: 1 }];

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const ts = new Date().toISOString().slice(0,10);
    a.href = url;
    a.download = `mtn-invoices-summary-${ts}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="overflow-x-auto">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100">Maintenance Bills Summary</h3>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="h-4 w-4 mr-2" /> Export CSV
          </Button>
          <Button variant="default" size="sm" onClick={exportExcel}>
            <Download className="h-4 w-4 mr-2" /> Export XLSX
          </Button>
        </div>
      </div>
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
                {months.map((amt, idx) => (
                  <td key={`${year}-${idx}`} className="px-2 py-2 border text-right tabular-nums border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100">
                    {amt > 0 ? formatCurrencyMY(amt) : '-'}
                  </td>
                ))}
                <td className="px-2 py-2 border text-right font-semibold tabular-nums text-green-700 dark:text-green-400 border-gray-200 dark:border-gray-700">
                  {formatCurrencyMY(rowTotal)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default MtnBillSummary;
