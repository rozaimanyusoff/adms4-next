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
import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

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
      if ((p as any).handover_at || (p as any).handover_to) return 'handover';
      if (p.grn_date && p.grn_no) return 'delivered';
      if (p.do_date && p.do_no) return 'delivered';
      if (p.po_date && p.po_no) return 'ordered';
      if (p.pr_date && p.pr_no) return 'requested';
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
    const capex = purchases.filter(p => p.request_type === 'CAPEX').length;
    const opex = purchases.filter(p => p.request_type === 'OPEX').length;
    const services = purchases.filter(p => p.request_type === 'SERVICES').length;

    // Highest / lowest purchase amounts (replace avg)
    const highest = amounts.length > 0 ? Math.max(...amounts) : 0;
    const lowest = amounts.length > 0 ? Math.min(...amounts) : 0;

    // Recent activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentRequests = purchases.filter(p =>
      p.pr_date && new Date(p.pr_date) >= thirtyDaysAgo
    ).length;

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
      if (!p.pr_date) return;
      const d = new Date(p.pr_date);
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
    const rows: Array<{ type: string; requested: number; ordered: number; delivered: number; handover: number; total: number }>= [];
    const map: Record<string, { requested: number; ordered: number; delivered: number; handover: number; total: number }> = {};
    const derive = (p: any): ProcStatus => {
      if (p.handover_at || p.handover_to || (p.inv_date && p.inv_no)) return 'handover';
      if (p.grn_date && p.grn_no) return 'delivered';
      if (p.do_date && p.do_no) return 'delivered';
      if (p.po_date && p.po_no) return 'ordered';
      if (p.pr_date && p.pr_no) return 'requested';
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
      if (p.pr_date) {
        const d = new Date(p.pr_date);
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

  // Chart data for purchases overview (by year)
  const chartData = useMemo(() => {
    // ensure ascending year order for chart
    const rows = (yearly || []).slice().sort((a, b) => Number(a.year) - Number(b.year));
    return rows.map(r => ({ year: r.year, count: r.count, total: Number(r.total || 0) }));
  }, [yearly]);

  // Request Type totals per year (CAPEX/OPEX/SERVICES)
  const requestTypeYearRows = useMemo(() => {
    const yearsSet = new Set<string>();
    const types = ['CAPEX', 'OPEX', 'SERVICES'];
    const map: Record<string, { total: number; perYear: Record<string, number> }> = {};

    purchases.forEach(p => {
      let year: string | null = null;
      if (p.pr_date) {
        const d = new Date(p.pr_date);
        if (!isNaN(d.getTime())) year = String(d.getFullYear());
      }

      const t = p.request_type || 'OTHER';
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
    { border: 'border-l-4 border-blue-500', icon: 'text-blue-600', bg: 'bg-blue-50' },
    { border: 'border-l-4 border-green-500', icon: 'text-green-600', bg: 'bg-green-50' },
    { border: 'border-l-4 border-amber-500', icon: 'text-amber-600', bg: 'bg-amber-50' },
    { border: 'border-l-4 border-purple-500', icon: 'text-purple-600', bg: 'bg-purple-50' },
    { border: 'border-l-4 border-rose-500', icon: 'text-rose-600', bg: 'bg-rose-50' },
    { border: 'border-l-4 border-sky-500', icon: 'text-sky-600', bg: 'bg-sky-50' },
    { border: 'border-l-4 border-indigo-500', icon: 'text-indigo-600', bg: 'bg-indigo-50' },
    { border: 'border-l-4 border-emerald-500', icon: 'text-emerald-600', bg: 'bg-emerald-50' }
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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Purchases summary (count + value) */}
    <Card className={`${pick(0).bg} ${pick(0).border} md:col-span-2`}> 
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Purchases Overview</CardTitle>
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
                <Tooltip formatter={(value: any, name: string) => (name === 'total' ? `RM ${fmtRM(Number(value))}` : value)} />
                <Bar yAxisId="right" dataKey="total" fill="#60a5fa" barSize={20} />
                <Line yAxisId="left" type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Request by Item Types (table with per-year breakdown) */}
  <Card className={`md:col-span-2 ${pick(1).bg} ${pick(1).border}`}>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Request by Item Types</CardTitle>
        </CardHeader>
        <CardContent>
          {typeYearRows.rows.length === 0 ? (
            <div className="text-sm text-gray-600">No item-typed purchases available</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs table-auto">
                <thead>
                  <tr className="text-center">
                    <th className="pb-2">Item Type</th>
                    {typeYearRows.years.map(y => (
                      <th key={y} className="pb-2 text-right">{y}</th>
                    ))}
                    <th className="pb-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
          {typeYearRows.rows.map((r, idx) => (
            <tr key={r.type} className="border-t hover:cursor-pointer hover:bg-gray-50" onClick={() => onFilter?.({ type: r.type })}>
                        <td className="py-2 text-gray-700">{r.type}</td>
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
  <Card className={`md:col-span-2 ${pick(2).bg} ${pick(2).border}`}>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Process Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-yellow-600" />
                <span className="text-sm">Requested</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">{stats.pending}</span>
                <Badge variant="secondary" className="text-xs">
                  {stats.total > 0 ? ((stats.pending / stats.total) * 100).toFixed(0) : 0}%
                </Badge>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Package className="h-4 w-4 text-blue-600" />
                <span className="text-sm">Ordered</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">{stats.ordered}</span>
                <Badge variant="default" className="text-xs">
                  {stats.total > 0 ? ((stats.ordered / stats.total) * 100).toFixed(0) : 0}%
                </Badge>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Truck className="h-4 w-4 text-amber-600" />
                <span className="text-sm">Delivered</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">{stats.delivered}</span>
                <Badge variant="outline" className="text-xs">
                  {stats.total > 0 ? ((stats.delivered / stats.total) * 100).toFixed(0) : 0}%
                </Badge>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileText className="h-4 w-4 text-purple-600" />
                <span className="text-sm">Handover</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">{stats.handover}</span>
                <Badge variant="secondary" className="text-xs">
                  {stats.total > 0 ? ((stats.handover / stats.total) * 100).toFixed(0) : 0}%
                </Badge>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm">Completed</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">{stats.completed}</span>
                <Badge variant="default" className="text-xs bg-green-600">
                  {completionRate}%
                </Badge>
              </div>
            </div>
          </div>

          {/* Breakdown by Item Type for Handover monitoring */}
          <div className="mt-4">
            <p className="text-xs text-gray-700 mb-2">By Item Type (Handover progress)</p>
            {statusByType.length === 0 ? (
              <div className="text-xs text-gray-500">No data</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left bg-gray-100">
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
  <Card className={`md:col-span-2 ${pick(3).bg} ${pick(3).border}`}>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Request Types</CardTitle>
        </CardHeader>
        <CardContent>
          {requestTypeYearRows.years.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm table-auto">
                <thead>
                  <tr className="text-left">
                    <th className="pb-2">Request Type</th>
                    {requestTypeYearRows.years.map(y => (
                      <th key={y} className="pb-2 text-right">{y}</th>
                    ))}
                    <th className="pb-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {requestTypeYearRows.rows.map(r => (
                    <tr key={r.type} className="border-t hover:cursor-pointer hover:bg-gray-50" onClick={() => onFilter?.({ request_type: r.type })}>
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
                  <span className="text-sm">CAPEX</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">{stats.capex}</span>
                  <Badge variant="outline" className="text-xs">
                    {stats.total > 0 ? ((stats.capex / stats.total) * 100).toFixed(0) : 0}%
                  </Badge>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm">OPEX</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">{stats.opex}</span>
                  <Badge variant="outline" className="text-xs">
                    {stats.total > 0 ? ((stats.opex / stats.total) * 100).toFixed(0) : 0}%
                  </Badge>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                  <span className="text-sm">SERVICES</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">{stats.services}</span>
                  <Badge variant="outline" className="text-xs">
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
