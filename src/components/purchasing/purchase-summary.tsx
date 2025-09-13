import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ShoppingCart,
  Package,
  Truck,
  FileText,
  CheckCircle,
  DollarSign,
  TrendingUp,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

// Format number for RM display: thousand separators + 2 decimals
const fmtRM = (value: number) => {
  return Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

const PurchaseSummary: React.FC<{ purchases?: any[]; onFilter?: (f: any) => void }> = ({ purchases = [], onFilter }) => {

  // stats memo
  const stats = useMemo(() => {
    const total = purchases.length;
    // compute per-purchase amount: prefer total_price if available, else qty * unit_price
    const amounts = purchases.map(p => {
      const totalPrice = Number((p as any).total_price ?? NaN);
      if (!Number.isFinite(totalPrice)) {
        const qty = Number((p as any).qty) || 0;
        const unit = Number((p as any).unit_price ?? 0) || 0;
        return qty * unit;
      }
      return totalPrice;
    }).filter(a => Number.isFinite(a) && a > 0);

    const totalValue = amounts.reduce((s, a) => s + a, 0);

    // Calculate status counts by deriving per-purchase procurement status (match PurchaseCard logic)
    type ProcStatus = 'requested' | 'ordered' | 'delivered' | 'handover' | 'closed' | 'draft';
    const deriveStatus = (p: any): ProcStatus => {
      const ds = (p as any).deliveries as any[] | undefined;
      const latest = ds && ds.length > 0 ? ds[ds.length - 1] : undefined;
      const qty = Number(p.qty || 0);
      if ((latest?.grn_date && latest?.grn_no) || (p.grn_date && p.grn_no)) return 'closed';
      const assetRegistry = String((p as any).asset_registry || '').toLowerCase();
      if (assetRegistry === 'completed') return 'handover';
      const deliveredCount = Array.isArray(ds) ? ds.length : 0;
      const allDelivered = (qty > 0 && deliveredCount >= qty) || (!!p.do_date && !!p.do_no);
      if (allDelivered) return 'delivered';
      if (p.po_date && p.po_no) return 'ordered';
      if ((p.request && p.request.pr_date) || p.pr_date) return 'requested';
      return 'draft';
    };

    const counts: Record<ProcStatus, number> = purchases.reduce((acc, p) => {
      const st = deriveStatus(p);
      acc[st] = (acc[st] || 0) + 1;
      return acc;
    }, { requested: 0, ordered: 0, delivered: 0, handover: 0, closed: 0, draft: 0 } as Record<ProcStatus, number>);

    const pending = counts.requested;
    const ordered = counts.ordered;
    const delivered = counts.delivered;
    const handover = counts.handover;
    const completed = counts.closed;

    // Request type breakdown
    const capex = purchases.filter(p => (p.request?.request_type || p.request_type) === 'CAPEX').length;
    const opex = purchases.filter(p => (p.request?.request_type || p.request_type) === 'OPEX').length;
    const services = purchases.filter(p => (p.request?.request_type || p.request_type) === 'SERVICES').length;

    // Highest / lowest purchase amounts (replace avg)
    const highest = amounts.length > 0 ? Math.max(...amounts) : 0;
    const lowest = amounts.length > 0 ? Math.min(...amounts) : 0;

    // Recent activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentRequests = purchases.filter(p => {
      const d = p.request?.pr_date || p.pr_date;
      return d && new Date(d) >= thirtyDaysAgo;
    }).length;

    return {
      total,
      totalValue,
      pending,
      ordered,
      delivered,
      handover,
      completed,
      capex,
      opex,
      services,
      highest,
      lowest,
      recentRequests
    };
  }, [purchases]);

  const completionRate = stats.total > 0 ? ((stats.completed / stats.total) * 100).toFixed(1) : 0;

  // Yearly breakdown by PR date
  const yearly = useMemo(() => {
    const buckets: Record<string, { count: number; total: number; highest: number; lowest: number }> = {};
    purchases.forEach(p => {
      const pd = p.request?.pr_date || p.pr_date;
      if (!pd) return;
      const d = new Date(pd);
      if (isNaN(d.getTime())) return;
      const year = String(d.getFullYear());

      const totalPrice = Number((p as any).total_price ?? NaN);
      const amount = Number.isFinite(totalPrice) ? totalPrice : ((Number((p as any).qty) || 0) * (Number((p as any).unit_price ?? 0) || 0));
      if (!Number.isFinite(amount) || amount <= 0) return;

      if (!buckets[year]) buckets[year] = { count: 0, total: 0, highest: amount, lowest: amount };
      buckets[year].count += 1;
      buckets[year].total += amount;
      if (amount > buckets[year].highest) buckets[year].highest = amount;
      if (amount < buckets[year].lowest) buckets[year].lowest = amount;
    });

    // Convert to sorted array by year desc
    const rows = Object.keys(buckets).map(y => ({ year: y, ...buckets[y] }));
    rows.sort((a, b) => Number(b.year) - Number(a.year));
    return rows;
  }, [purchases]);

  // Breakdown by Item Type (total amount to date)
  const byType = useMemo(() => {
    const map: Record<string, { count: number; total: number }> = {};
    purchases.forEach(p => {
      const typeName = typeof p.type === 'string' ? p.type : (p.type && (p.type as any).name) || 'Unknown';
      const totalPrice = Number((p as any).total_price ?? NaN);
      const amount = Number.isFinite(totalPrice)
        ? totalPrice
        : ((Number((p as any).qty) || 0) * (Number((p as any).unit_price ?? 0) || 0));
      if (!Number.isFinite(amount) || amount <= 0) return;
      if (!map[typeName]) map[typeName] = { count: 0, total: 0 };
      map[typeName].count += 1;
      map[typeName].total += amount;
    });

    const rows = Object.keys(map).map(k => ({ type: k, ...map[k] }));
    rows.sort((a, b) => b.total - a.total);
    return rows;
  }, [purchases]);

  // Status breakdown by Item Type (focus on Handover monitoring)
  const statusByType = useMemo(() => {
    type ProcStatus = 'requested' | 'ordered' | 'delivered' | 'handover' | 'draft';
    const rows: Array<{ type: string; requested: number; ordered: number; delivered: number; handover: number; total: number }> = [];
    const map: Record<string, { requested: number; ordered: number; delivered: number; handover: number; total: number }> = {};
    const derive = (p: any): ProcStatus => {
      const ds = (p as any).deliveries as any[] | undefined;
      const latest = ds && ds.length > 0 ? ds[ds.length - 1] : undefined;
      const qty = Number(p.qty || 0);
      const assetRegistry = String((p as any).asset_registry || '').toLowerCase();
      if (assetRegistry === 'completed') return 'handover';
      if ((latest?.grn_date && latest?.grn_no) || (p.grn_date && p.grn_no)) return 'delivered';
      const deliveredCount = Array.isArray(ds) ? ds.length : 0;
      const allDelivered = (qty > 0 && deliveredCount >= qty) || (!!p.do_date && !!p.do_no);
      if (allDelivered) return 'delivered';
      if (p.po_date && p.po_no) return 'ordered';
      if ((p.request && p.request.pr_date) || p.pr_date) return 'requested';
      return 'draft';
    };
    purchases.forEach(p => {
      const t = typeof p.type === 'string' ? p.type : (p.type && (p.type as any).name) || 'Unknown';
      if (!map[t]) map[t] = { requested: 0, ordered: 0, delivered: 0, handover: 0, total: 0 };
      const st = derive(p);
      (map[t] as any)[st] = ((map[t] as any)[st] || 0) + 1;
      map[t].total += 1;
    });
    Object.keys(map).forEach(k => rows.push({ type: k, ...map[k] } as any));
    rows.sort((a, b) => b.total - a.total);
    return rows;
  }, [purchases]);

  // Years present (from PR dates) and per-type per-year totals
  const typeYearRows = useMemo(() => {
    const yearsSet = new Set<string>();
    const map: Record<string, { total: number; perYear: Record<string, number> }> = {};

    purchases.forEach(p => {
      // determine year (if any)
      let year: string | null = null;
      const pd = p.request?.pr_date || p.pr_date;
      if (pd) {
        const d = new Date(pd);
        if (!isNaN(d.getTime())) year = String(d.getFullYear());
      }

      const typeName = typeof p.type === 'string' ? p.type : (p.type && (p.type as any).name) || 'Unknown';
      const totalPrice = Number((p as any).total_price ?? NaN);
      const amount = Number.isFinite(totalPrice)
        ? totalPrice
        : ((Number((p as any).qty) || 0) * (Number((p as any).unit_price ?? 0) || 0));
      if (!Number.isFinite(amount) || amount <= 0) return;

      if (!map[typeName]) map[typeName] = { total: 0, perYear: {} };
      map[typeName].total += amount;
      if (year) {
        yearsSet.add(year);
        map[typeName].perYear[year] = (map[typeName].perYear[year] || 0) + amount;
      }
    });

    const years = Array.from(yearsSet).sort((a, b) => Number(a) - Number(b));
    const rows = Object.keys(map).map(t => ({ type: t, total: map[t].total, perYear: map[t].perYear }));
    rows.sort((a, b) => b.total - a.total);
    return { years, rows };
  }, [purchases]);

  // Chart data for purchases overview (by year) with stacked CAPEX + OPEX amounts
  const chartData = useMemo(() => {
    const map: Record<string, { count: number; capex: number; opex: number; total: number }> = {};
    purchases.forEach(p => {
      const pd = p.request?.pr_date || p.pr_date;
      if (!pd) return;
      const d = new Date(pd);
      if (isNaN(d.getTime())) return;
      const year = String(d.getFullYear());
      const type = (p.request?.request_type || p.request_type || '').toUpperCase();
      const totalPrice = Number((p as any).total_price ?? NaN);
      const amount = Number.isFinite(totalPrice)
        ? totalPrice
        : ((Number((p as any).qty) || 0) * (Number((p as any).unit_price ?? 0) || 0));
      if (!Number.isFinite(amount) || amount <= 0) return;
      if (!map[year]) map[year] = { count: 0, capex: 0, opex: 0, total: 0 };
      map[year].count += 1;
      if (type === 'CAPEX') map[year].capex += amount;
      if (type === 'OPEX') map[year].opex += amount;
      map[year].total += amount;
    });
    const years = Object.keys(map).sort((a, b) => Number(a) - Number(b));
    return years.map(y => ({ year: y, ...map[y] }));
  }, [purchases]);

  // Request Type totals per year (CAPEX/OPEX/SERVICES)
  const requestTypeYearRows = useMemo(() => {
    const yearsSet = new Set<string>();
    const types = ['CAPEX', 'OPEX', 'SERVICES'];
    const map: Record<string, { total: number; perYear: Record<string, number> }> = {};

    purchases.forEach(p => {
      let year: string | null = null;
      const pd = p.request?.pr_date || p.pr_date;
      if (pd) {
        const d = new Date(pd);
        if (!isNaN(d.getTime())) year = String(d.getFullYear());
      }

      const t = p.request?.request_type || p.request_type || 'OTHER';
      const totalPrice = Number((p as any).total_price ?? NaN);
      const amount = Number.isFinite(totalPrice)
        ? totalPrice
        : ((Number((p as any).qty) || 0) * (Number((p as any).unit_price ?? 0) || 0));
      if (!Number.isFinite(amount) || amount <= 0) return;

      if (!map[t]) map[t] = { total: 0, perYear: {} };
      map[t].total += amount;
      if (year) {
        yearsSet.add(year);
        map[t].perYear[year] = (map[t].perYear[year] || 0) + amount;
      }
    });

    const years = Array.from(yearsSet).sort((a, b) => Number(a) - Number(b));
    const rows = types.map(type => ({
      type,
      total: map[type]?.total || 0,
      perYear: map[type]?.perYear || {}
    }));
    return { years, rows };
  }, [purchases]);

  // Random color themes for cards (shuffled once per mount)
  const palettes = [
    // Theme-aware accents (no hard background so dark mode uses card surface)
    { border: 'border-l-4 border-blue-500 dark:border-blue-400', icon: 'text-blue-600 dark:text-blue-400' },
    { border: 'border-l-4 border-green-500 dark:border-green-400', icon: 'text-green-600 dark:text-green-400' },
    { border: 'border-l-4 border-amber-500 dark:border-amber-400', icon: 'text-amber-600 dark:text-amber-300' },
    { border: 'border-l-4 border-purple-500 dark:border-purple-400', icon: 'text-purple-600 dark:text-purple-400' },
    { border: 'border-l-4 border-rose-500 dark:border-rose-400', icon: 'text-rose-600 dark:text-rose-400' },
    { border: 'border-l-4 border-sky-500 dark:border-sky-400', icon: 'text-sky-600 dark:text-sky-400' },
    { border: 'border-l-4 border-indigo-500 dark:border-indigo-400', icon: 'text-indigo-600 dark:text-indigo-400' },
    { border: 'border-l-4 border-emerald-500 dark:border-emerald-400', icon: 'text-emerald-600 dark:text-emerald-400' }
  ];

  // Deterministic shuffle: derive seed from purchases so colors are stable for the same data
  const shuffledPalettes = useMemo(() => {
    const seededShuffle = <T,>(input: T[], seedNum: number) => {
      const out = [...input];
      let state = (seedNum >>> 0) || 1;
      for (let i = out.length - 1; i > 0; i--) {
        // simple LCG
        state = (state * 1664525 + 1013904223) >>> 0;
        const r = state / 4294967296; // 2^32
        const j = Math.floor(r * (i + 1));
        const tmp = out[i];
        out[i] = out[j];
        out[j] = tmp;
      }
      return out;
    };

    const seed = purchases.reduce((s, p) => s + (Number((p as any).id) || 0), 0) + purchases.length;
    return seededShuffle(palettes, seed);
  }, [purchases]);

  const pick = (i: number) => shuffledPalettes[i % shuffledPalettes.length];

  // Totals to date for titles
  const totalByItemTypes = useMemo(() => {
    return byType.reduce((sum, row) => sum + (Number((row as any).total) || 0), 0);
  }, [byType]);
  const totalByRequestTypes = useMemo(() => {
    return requestTypeYearRows.rows.reduce((sum, row) => sum + (Number((row as any).total) || 0), 0);
  }, [requestTypeYearRows]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Purchases summary (count + value) */}
      <Card className={`${pick(0).border} md:col-span-2`}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-[length:var(--text-size-base)] font-medium">Purchases Overview</CardTitle>
          <ShoppingCart className={`h-4 w-4 ${pick(0).icon}`} />
        </CardHeader>
        <CardContent>
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis yAxisId="left" orientation="left" />
                <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `RM ${fmtRM(Number(v))}`} />
                <Tooltip formatter={(value: any, name: string) => {
                  if (['capex','opex','total'].includes(String(name))) return `RM ${fmtRM(Number(value))}`;
                  return value;
                }} />
                <Legend
                  verticalAlign="top"
                  align="center"
                  wrapperStyle={{ fontSize: '12px', textAlign: 'center' }}
                />
                {/* Stacked bars for CAPEX and OPEX with wider bar size */}
                <Bar yAxisId="right" dataKey="capex" stackId="amount" fill="#60a5fa" barSize={100} name="capex" />
                <Bar yAxisId="right" dataKey="opex" stackId="amount" fill="#34d399" barSize={100} name="opex" />
                {/* Count line */}
                <Line yAxisId="left" type="monotone" dataKey="count" stroke="#243c5a" strokeWidth={2} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Request by Item Types (table with per-year breakdown) */}
      <Card className={`md:col-span-2 ${pick(1).border}`}>
        <CardHeader>
          <CardTitle className="text-[length:var(--text-size-base)] font-medium">
            Request by Item Types
            <span className="ml-2 text-gray-500 text-[length:var(--text-size-small)]">• Total to date: RM {fmtRM(totalByItemTypes)}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {typeYearRows.rows.length === 0 ? (
            <div className="text-[length:var(--text-size-base)] text-gray-600">No item-typed purchases available</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[length:var(--text-size-small)] table-auto">
                <thead>
                  <tr className="text-center bg-muted/50">
                    <th className="pb-2">Item Type</th>
                    {typeYearRows.years.map(y => (
                      <th key={y} className="pb-2 text-right">{y}</th>
                    ))}
                    <th className="pb-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {typeYearRows.rows.map((r, idx) => (
                    <tr key={r.type} className="border-t hover:cursor-pointer hover:bg-accent/20" onClick={() => onFilter?.({ type: r.type })}>
                      <td className="py-2 text-foreground">{r.type}</td>
                      {typeYearRows.years.map(y => (
                        <td key={y} className="py-2 text-right">{
                          r.perYear && r.perYear[y] ? `RM ${fmtRM(r.perYear[y])}` : '-'
                        }</td>
                      ))}
                      <td className="py-2 text-right font-medium">RM {fmtRM(r.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
        </CardContent>
      </Card>

      {/* Completion Rate & Pending Items removed — covered in Process Status */}

      {/* Status Breakdown */}
      <Card className={`md:col-span-2 ${pick(2).border}`}>
        <CardHeader>
          <CardTitle className="text-[length:var(--text-size-base)] font-medium">Process Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-yellow-600" />
                <span className="text-[length:var(--text-size-base)]">Requested</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-[length:var(--text-size-base)] font-medium">{stats.pending}</span>
                <Badge variant="secondary" className="text-[length:var(--text-size-small)]">
                  {stats.total > 0 ? ((stats.pending / stats.total) * 100).toFixed(0) : 0}%
                </Badge>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Package className="h-4 w-4 text-blue-600" />
                <span className="text-[length:var(--text-size-base)]">Ordered</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-[length:var(--text-size-base)] font-medium">{stats.ordered}</span>
                <Badge variant="default" className="text-[length:var(--text-size-small)]">
                  {stats.total > 0 ? ((stats.ordered / stats.total) * 100).toFixed(0) : 0}%
                </Badge>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Truck className="h-4 w-4 text-amber-600" />
                <span className="text-[length:var(--text-size-base)]">Delivered</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-[length:var(--text-size-base)] font-medium">{stats.delivered}</span>
                <Badge variant="outline" className="text-[length:var(--text-size-small)]">
                  {stats.total > 0 ? ((stats.delivered / stats.total) * 100).toFixed(0) : 0}%
                </Badge>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileText className="h-4 w-4 text-purple-600" />
                <span className="text-[length:var(--text-size-base)]">Handover</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-[length:var(--text-size-base)] font-medium">{stats.handover}</span>
                <Badge variant="secondary" className="text-[length:var(--text-size-small)]">
                  {stats.total > 0 ? ((stats.handover / stats.total) * 100).toFixed(0) : 0}%
                </Badge>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-[length:var(--text-size-base)]">Completed</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-[length:var(--text-size-base)] font-medium">{stats.completed}</span>
                <Badge variant="default" className="text-[length:var(--text-size-small)] bg-green-600">
                  {completionRate}%
                </Badge>
              </div>
            </div>
          </div>

          {/* Breakdown by Item Type for Handover monitoring */}
          <div className="mt-4">
            <p className="text-[length:var(--text-size-small)] text-muted-foreground mb-2">By Item Type (Handover progress)</p>
            {statusByType.length === 0 ? (
              <div className="text-[length:var(--text-size-small)] text-muted-foreground">No data</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[length:var(--text-size-small)]">
                  <thead>
                    <tr className="text-left bg-muted/50">
                      <th className="px-2 py-1">Type</th>
                      <th className="px-2 py-1 text-right">Handover</th>
                      <th className="px-2 py-1 text-right">Pending</th>
                      <th className="px-2 py-1 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statusByType.map(row => (
                      <tr key={row.type} className="border-t">
                        <td className="px-2 py-1">{row.type}</td>
                        <td className="px-2 py-1 text-right">{row.handover}</td>
                        <td className="px-2 py-1 text-right">{row.total - row.handover}</td>
                        <td className="px-2 py-1 text-right">{row.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Request Type Breakdown */}
      <Card className={`md:col-span-2 ${pick(3).border}`}>
        <CardHeader>
          <CardTitle className="text-[length:var(--text-size-base)] font-medium">
            Request Types
            <span className="ml-2 text-gray-500 text-[length:var(--text-size-small)]">• Total to date: RM {fmtRM(totalByRequestTypes)}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {requestTypeYearRows.years.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-[length:var(--text-size-base)] table-auto">
                <thead>
                  <tr className="text-left bg-muted/50">
                    <th className="pb-2">Request Type</th>
                    {requestTypeYearRows.years.map(y => (
                      <th key={y} className="pb-2 text-right">{y}</th>
                    ))}
                    <th className="pb-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {requestTypeYearRows.rows.map(r => (
                    <tr key={r.type} className="border-t hover:cursor-pointer hover:bg-accent/20" onClick={() => onFilter?.({ request_type: r.type })}>
                      <td className="py-2 text-gray-700">{r.type}</td>
                      {requestTypeYearRows.years.map(y => (
                        <td key={y} className="py-2 text-right">{
                          r.perYear && r.perYear[y] ? `RM ${fmtRM(r.perYear[y])}` : '-'
                        }</td>
                      ))}
                      <td className="py-2 text-right font-medium">RM {fmtRM(r.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-[length:var(--text-size-base)]">CAPEX</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-[length:var(--text-size-base)] font-medium">{stats.capex}</span>
                  <Badge variant="outline" className="text-[length:var(--text-size-small)]">
                    {stats.total > 0 ? ((stats.capex / stats.total) * 100).toFixed(0) : 0}%
                  </Badge>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-[length:var(--text-size-base)]">OPEX</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-[length:var(--text-size-base)] font-medium">{stats.opex}</span>
                  <Badge variant="outline" className="text-[length:var(--text-size-small)]">
                    {stats.total > 0 ? ((stats.opex / stats.total) * 100).toFixed(0) : 0}%
                  </Badge>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                  <span className="text-[length:var(--text-size-base)]">SERVICES</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-[length:var(--text-size-base)] font-medium">{stats.services}</span>
                  <Badge variant="outline" className="text-[length:var(--text-size-small)]">
                    {stats.total > 0 ? ((stats.services / stats.total) * 100).toFixed(0) : 0}%
                  </Badge>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Yearly breakdown moved into Total Purchases & Total Value cards */}
    </div>
  );
};

export default PurchaseSummary;
