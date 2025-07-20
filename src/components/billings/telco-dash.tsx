'use client';
import React, { useEffect, useState } from 'react';
import { authenticatedApi } from '@/config/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ComposedChart, Bar, XAxis, YAxis, Tooltip as RechartTooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import TelcoReportControls from './telco-report-controls';

interface TelcoBill {
    id: number;
    bfcy_id: number | null;
    account: {
        id: number;
        account_no: string;
        provider: string;
    };
    bill_date: string;
    bill_no: string;
    subtotal: string;
    discount: number;
    tax: string;
    rounding: string;
    grand_total: string;
    reference: string | null;
    status: string;
}

type TelcoApiResponse = {
    status: string;
    message: string;
    data: TelcoBill[];
};

const TelcoDash: React.FC = () => {
    const [chartRows, setChartRows] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedYear, setSelectedYear] = useState<string>('');
    const [yearOptions, setYearOptions] = useState<string[]>([]);
    const [providerOptions, setProviderOptions] = useState<string[]>([]);
    const [selectedProvider, setSelectedProvider] = useState<string>('All');

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const res = await authenticatedApi.get<TelcoApiResponse>('/api/telco/bills');
                const bills: TelcoBill[] = Array.isArray(res.data.data) ? res.data.data : [];
                // Get all years from data
                const years = Array.from(new Set(bills.map(bill => new Date(bill.bill_date).getFullYear().toString()))).sort();
                const yearOptions = ['All', ...years];
                const providers = Array.from(new Set(bills.map(bill => bill.account?.provider).filter(Boolean))).sort();
                const providerOptions = ['All', ...providers];
                const currentYear = new Date().getFullYear().toString();
                if (!selectedYear && yearOptions.includes(currentYear)) {
                    setSelectedYear(currentYear);
                } else if (!selectedYear && yearOptions.length) {
                    setSelectedYear(yearOptions[1] || 'All');
                }
                if (!selectedProvider && providerOptions.length) {
                    setSelectedProvider('All');
                }
                // Group by month for selected year or all, and filter by provider
                let chartRows: any[] = [];
                if (selectedProvider === 'All') {
                    // Breakdown by provider for each month
                    const monthlyProviderTotals: { [month: string]: { [provider: string]: number } } = {};
                    bills.forEach(bill => {
                        const date = new Date(bill.bill_date);
                        const year = date.getFullYear().toString();
                        const provider = bill.account?.provider || '';
                        if (
                            bill.grand_total &&
                            (selectedYear === 'All' || year === selectedYear)
                        ) {
                            const monthLabel = date.toLocaleString('en-US', { month: 'short' }) + '-' + year.slice(-2);
                            if (!monthlyProviderTotals[monthLabel]) monthlyProviderTotals[monthLabel] = {};
                            if (!monthlyProviderTotals[monthLabel][provider]) monthlyProviderTotals[monthLabel][provider] = 0;
                            monthlyProviderTotals[monthLabel][provider] += parseFloat(bill.grand_total);
                        }
                    });
                    chartRows = Object.keys(monthlyProviderTotals).sort((a, b) => {
                        // Sort by year then month
                        const [aMonth, aYear] = a.split('-');
                        const [bMonth, bYear] = b.split('-');
                        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                        return parseInt(aYear) !== parseInt(bYear)
                            ? parseInt(aYear) - parseInt(bYear)
                            : months.indexOf(aMonth) - months.indexOf(bMonth);
                    }).map(month => {
                        const providers = monthlyProviderTotals[month];
                        const total = Object.values(providers).reduce((sum, v) => sum + (typeof v === 'number' ? v : 0), 0);
                        return { month, total, providers };
                    });
                } else {
                    // Only selected provider
                    const monthlyTotals: { [month: string]: { total: number } } = {};
                    bills.forEach(bill => {
                        const date = new Date(bill.bill_date);
                        const year = date.getFullYear().toString();
                        const provider = bill.account?.provider || '';
                        if (
                            bill.grand_total &&
                            (selectedYear === 'All' || year === selectedYear) &&
                            (selectedProvider === 'All' || provider === selectedProvider)
                        ) {
                            const monthLabel = date.toLocaleString('en-US', { month: 'short' }) + '-' + year.slice(-2);
                            if (!monthlyTotals[monthLabel]) monthlyTotals[monthLabel] = { total: 0 };
                            monthlyTotals[monthLabel].total += parseFloat(bill.grand_total);
                        }
                    });
                    chartRows = Object.keys(monthlyTotals).sort((a, b) => {
                        // Sort by year then month
                        const [aMonth, aYear] = a.split('-');
                        const [bMonth, bYear] = b.split('-');
                        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                        return parseInt(aYear) !== parseInt(bYear)
                            ? parseInt(aYear) - parseInt(bYear)
                            : months.indexOf(aMonth) - months.indexOf(bMonth);
                    }).map(month => ({ month, total: monthlyTotals[month].total }));
                }
                setChartRows(chartRows);
                setYearOptions(yearOptions);
                setProviderOptions(providerOptions);
            } catch (err) {
                setChartRows([]);
                setYearOptions(['All']);
                setProviderOptions(['All']);
            }
            setLoading(false);
        };
        fetchData();
    }, [selectedYear, selectedProvider]);

    return (
        <>
            <Card className="my-4 w-full">
                <CardHeader>
                    <CardTitle>Telco Billing - Monthly Grand Total</CardTitle>
                    <div className="mt-2 flex gap-2 items-center">
                        <span className="text-sm">Year:</span>
                        <select
                            className="border rounded px-2 py-1 text-sm"
                            value={selectedYear}
                            onChange={e => setSelectedYear(e.target.value)}
                        >
                            {yearOptions.map(year => (
                                <option key={year} value={year}>{year}</option>
                            ))}
                        </select>
                        <span className="text-sm ml-4">Provider:</span>
                        <select
                            className="border rounded px-2 py-1 text-sm"
                            value={selectedProvider}
                            onChange={e => setSelectedProvider(e.target.value)}
                        >
                            {providerOptions.map(provider => (
                                <option key={provider} value={provider}>{provider}</option>
                            ))}
                        </select>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div>Loading...</div>
                    ) : chartRows.length ? (
                        <ResponsiveContainer width="100%" height={350}>
                            <ComposedChart data={chartRows} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="month" />
                                <YAxis
                                    label={{ value: 'Grand Total (RM)', angle: -90, position: 'insideLeft' }}
                                    tickFormatter={value => value.toLocaleString('en-US')}
                                />
                                <RechartTooltip
                                    formatter={(value: number, name: string, props: any) => value.toLocaleString('en-US')}
                                    content={(props: any) => {
                                        const { active, payload, label } = props;
                                        if (active && payload && payload.length) {
                                            const row = payload[0].payload;
                                            return (
                                                <div className="bg-white p-2 rounded shadow text-xs">
                                                    <div className="font-bold mb-1">{label}</div>
                                                    <div>Total: <b>{row.total.toLocaleString('en-US')}</b></div>
                                                    {selectedProvider === 'All' && row.providers && (
                                                        <div className="mt-1">
                                                            <div className="font-semibold">Provider Breakdown:</div>
                                                            {Object.entries(row.providers).map(([prov, amt], idx) => (
                                                                <div key={prov} className="flex justify-between">
                                                                    <span>{prov}</span>
                                                                    <span>{typeof amt === 'number' ? amt.toLocaleString('en-US') : '-'}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                <Legend />
                                <Bar dataKey="total" fill="#2563eb" radius={[4, 4, 0, 0]} name="Grand Total (RM)" />
                            </ComposedChart>
                        </ResponsiveContainer>
                    ) : (
                        <div>No data available.</div>
                    )}
                </CardContent>
            </Card>
            <TelcoReportControls onExport={params => { /* TODO: implement export logic */ }} />
        </>
    );
};

export default TelcoDash;
