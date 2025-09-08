'use client';
import React, { useEffect, useState } from 'react';
import { authenticatedApi } from '@/config/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip as RechartTooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import VehicleMtnReport from "./excel-fuel-report";
import MaintenanceReport from './excel-maintenance-report';

interface FuelBill {
    stmt_id: number;
    stmt_no: string;
    stmt_date: string;
    stmt_total: string;
    stmt_litre?: string;
}

type FuelApiResponse = {
    status: string;
    message: string;
    data: FuelBill[];
};

const FuelDash: React.FC = () => {
    const [chartRows, setChartRows] = useState<{ month: string; total: number }[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedYear, setSelectedYear] = useState<string>('');
    const [yearOptions, setYearOptions] = useState<string[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const res = await authenticatedApi.get<FuelApiResponse>('/api/bills/fuel');
                const bills: FuelBill[] = Array.isArray(res.data.data) ? res.data.data : [];
                // Get all years from data
                const years = Array.from(new Set(bills.map(bill => new Date(bill.stmt_date).getFullYear().toString()))).sort();
                const yearOptions = ['All', ...years];
                const currentYear = new Date().getFullYear().toString();
                if (!selectedYear && yearOptions.includes(currentYear)) {
                    setSelectedYear(currentYear);
                } else if (!selectedYear && yearOptions.length) {
                    setSelectedYear(yearOptions[1] || 'All');
                }
                // Group by month for selected year or all
                const monthlyTotals: { [month: string]: { total: number; litre: number } } = {};
                bills.forEach(bill => {
                    const date = new Date(bill.stmt_date);
                    const year = date.getFullYear().toString();
                    if ((bill.stmt_total || bill.stmt_litre) && (selectedYear === 'All' || year === selectedYear)) {
                        const monthLabel = date.toLocaleString('en-US', { month: 'short' }) + '-' + year.slice(-2);
                        if (!monthlyTotals[monthLabel]) monthlyTotals[monthLabel] = { total: 0, litre: 0 };
                        if (bill.stmt_total) monthlyTotals[monthLabel].total += parseFloat(bill.stmt_total);
                        if (bill.stmt_litre) monthlyTotals[monthLabel].litre += parseFloat(bill.stmt_litre);
                    }
                });
                const chartRows = Object.keys(monthlyTotals).sort((a, b) => {
                    // Sort by year then month
                    const [aMonth, aYear] = a.split('-');
                    const [bMonth, bYear] = b.split('-');
                    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    return parseInt(aYear) !== parseInt(bYear)
                        ? parseInt(aYear) - parseInt(bYear)
                        : months.indexOf(aMonth) - months.indexOf(bMonth);
                }).map(month => ({ month, total: monthlyTotals[month].total, litre: monthlyTotals[month].litre }));
                setChartRows(chartRows);
                setYearOptions(yearOptions);
            } catch (err) {
                setChartRows([]);
                setYearOptions(['All']);
            }
            setLoading(false);
        };
        fetchData();
    }, [selectedYear]);

    return (
        <div className="space-y-6">
        <Card className="mt-4 w-full">
            <CardHeader>
                <CardTitle>Fuel Maintenance - Monthly Statement Total</CardTitle>
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
                                label={{ value: 'Total (RM)', angle: -90, position: 'insideLeft' }}
                                tickFormatter={value => value.toLocaleString('en-US')}
                            />
                            <YAxis
                                yAxisId="right"
                                orientation="right"
                                label={{ value: 'Total Litre', angle: 90, position: 'insideRight' }}
                                tickFormatter={value => value.toLocaleString('en-US')}
                            />
                            <RechartTooltip formatter={(value: number) => value.toLocaleString('en-US')} />
                            <Legend />
                            <Bar dataKey="total" fill="#2563eb" radius={[4, 4, 0, 0]} name="Total Statement (RM)" />
                            <Line type="monotone" dataKey="litre" stroke="#22c55e" strokeWidth={3} dot={{ r: 3 }} name="Total Litre" yAxisId="right" />
                        </ComposedChart>
                    </ResponsiveContainer>
                ) : (
                    <div>No data available.</div>
                )}
            </CardContent>
        </Card>
        {/* Excel Report Components */}
        <VehicleMtnReport />
        <MaintenanceReport />
        </div>
    );
};

export default FuelDash