"use client";
import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, BarChart, XAxis, YAxis, Tooltip, Legend, Bar } from 'recharts';
import { authenticatedApi } from '@/config/api';

interface SummonRecord {
    summon_date?: string;
    receipt_date?: string;
    summon_agency?: string;
}

const SummonSummary: React.FC = () => {
    const [rows, setRows] = useState<SummonRecord[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let mounted = true;
        setLoading(true);
        authenticatedApi.get('/api/compliance/summon')
            .then(res => {
                const data = (res as any).data?.data || (res as any).data || [];
                if (mounted) setRows(Array.isArray(data) ? data : []);
            })
            .catch(() => { if (mounted) setRows([]); })
            .then(() => { if (mounted) setLoading(false); });
        return () => { mounted = false; };
    }, []);

    // Annual summary: group by YYYY and count open vs closed (closed if receipt_date exists)
    const annualSummary = useMemo(() => {
        const map: Record<string, { year: string; open: number; closed: number }> = {};
        rows.forEach(r => {
            let key = 'Unknown';
            if (r.summon_date) {
                const d = new Date(r.summon_date);
                if (!isNaN(d.getTime())) key = String(d.getFullYear());
            }
            if (!map[key]) map[key] = { year: key, open: 0, closed: 0 };
            const closed = !!r.receipt_date;
            if (closed) map[key].closed += 1; else map[key].open += 1;
        });
        return Object.values(map).sort((a, b) => a.year.localeCompare(b.year));
    }, [rows]);

    // Cases by year stacked by agency
    const agencyList = useMemo(() => {
        const s = new Set<string>();
        rows.forEach(r => { if (r.summon_agency) s.add(r.summon_agency); else s.add('Unknown'); });
        return Array.from(s).sort();
    }, [rows]);

    const casesByYearAgency = useMemo(() => {
        const map: Record<string, any> = {};
        rows.forEach(r => {
            const d = r.summon_date ? new Date(r.summon_date) : null;
            const year = (d && !isNaN(d.getTime())) ? String(d.getFullYear()) : 'Unknown';
            if (!map[year]) map[year] = { year };
            const agency = r.summon_agency || 'Unknown';
            map[year][agency] = (map[year][agency] || 0) + 1;
        });
        const years = Object.keys(map).sort();
        return years.map(y => {
            const obj = { year: y } as any;
            agencyList.forEach(a => { obj[a] = map[y][a] || 0; });
            return obj;
        });
    }, [rows, agencyList]);

    const annualTotals = useMemo(() => {
        let open = 0; let closed = 0;
        (annualSummary || []).forEach((s: any) => { open += s.open || 0; closed += s.closed || 0; });
        return { open, closed };
    }, [annualSummary]);

    const agencyTotals = useMemo(() => {
        const totals: Record<string, number> = {};
        (casesByYearAgency || []).forEach((row: any) => { agencyList.forEach(a => { totals[a] = (totals[a] || 0) + (row[a] || 0); }); });
        return totals;
    }, [casesByYearAgency, agencyList]);

    return (
        <div className="my-4 flex gap-4 items-stretch">
            <Card className="flex-1 flex flex-col">
                <CardHeader className="py-2">
                    <CardTitle>Annual Summons (Open vs Closed)</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 p-2 h-44">
                    <div className="w-full h-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={annualSummary} margin={{ right: 16 }}>
                                <XAxis dataKey="year" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="open" stackId="a" name={`Open (${annualTotals.open || 0})`} fill="#f59e0b" />
                                <Bar dataKey="closed" stackId="a" name={`Closed (${annualTotals.closed || 0})`} fill="#10b981" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            <Card className="flex-1 flex flex-col">
                <CardHeader className="py-2">
                    <CardTitle>Cases by Year (stacked by Agency)</CardTitle>
                </CardHeader>
                <CardContent className="h-44 p-2">
                    <div className="w-full h-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={casesByYearAgency}>
                                <XAxis dataKey="year" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                {agencyList.map((a, idx) => (
                                    <Bar key={a} dataKey={a} stackId="a" name={`${a} (${agencyTotals[a] || 0})`} fill={['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6'][idx % 5]} />
                                ))}
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default SummonSummary;
