'use client';
import React, { useEffect, useState } from 'react';
import { authenticatedApi } from '@/config/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip as RechartTooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import MaintenanceReport from './excel-maintenance-report';

interface MaintenanceBill {
    inv_id: number;
    inv_no: string;
    inv_date: string;
    svc_order: string;
    asset: any;
    costcenter: any;
    district: any;
    workshop: {
        id: number;
        name: string;
    };
    svc_date: string;
    svc_odo: string;
    inv_total: string;
    inv_stat: string;
    inv_remarks: string;
    running_no: number;
}

type MaintenanceApiResponse = {
    status: string;
    message: string;
    data: MaintenanceBill[];
};

const MaintenanceDash: React.FC = () => {
    const [chartRows, setChartRows] = useState<{ month: string; total: number }[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedYear, setSelectedYear] = useState<string>('');
    const [yearOptions, setYearOptions] = useState<string[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const res = await authenticatedApi.get<MaintenanceApiResponse>('/api/bills/mtn');
                const bills: MaintenanceBill[] = Array.isArray(res.data.data) ? res.data.data : [];

                // Get all years from data
                const years = Array.from(new Set(bills.map(bill => new Date(bill.inv_date).getFullYear().toString()))).sort();
                const yearOptions = ['All', ...years];
                setYearOptions(yearOptions);

                const currentYear = new Date().getFullYear().toString();
                if (!selectedYear && yearOptions.includes(currentYear)) {
                    setSelectedYear(currentYear);
                } else if (!selectedYear && yearOptions.length) {
                    setSelectedYear(yearOptions[1] || 'All');
                }

                // Group by month for selected year or all
                const monthlyTotals: { [month: string]: { total: number } } = {};
                bills.forEach(bill => {
                    const date = new Date(bill.inv_date);
                    const year = date.getFullYear().toString();
                    if (bill.inv_total && (selectedYear === 'All' || year === selectedYear)) {
                        const monthLabel = date.toLocaleString('en-US', { month: 'short' }) + '-' + year.slice(-2);
                        if (!monthlyTotals[monthLabel]) monthlyTotals[monthLabel] = { total: 0 };
                        monthlyTotals[monthLabel].total += parseFloat(bill.inv_total) || 0;
                    }
                });

                // Sort by date
                const sortedKeys = Object.keys(monthlyTotals).sort((a, b) => {
                    const [monthA, yearA] = a.split('-');
                    const [monthB, yearB] = b.split('-');
                    const dateA = new Date(parseInt(`20${yearA}`), new Date(Date.parse(monthA + " 1, 2012")).getMonth());
                    const dateB = new Date(parseInt(`20${yearB}`), new Date(Date.parse(monthB + " 1, 2012")).getMonth());
                    return dateA.getTime() - dateB.getTime();
                });

                const chartData = sortedKeys.map(key => ({
                    month: key,
                    total: monthlyTotals[key].total
                }));

                setChartRows(chartData);
            } catch (error) {
                console.error('Error fetching maintenance data:', error);
                setChartRows([]);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [selectedYear]);

    const handleYearChange = (value: string) => {
        setSelectedYear(value);
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[200px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Vehicle Maintenance - Monthly Statement Total</CardTitle>
                    <div className="flex items-center space-x-2">
                        <label htmlFor="year-select" className="text-sm font-medium text-gray-700">Year:</label>
                        <select
                            id="year-select"
                            value={selectedYear}
                            onChange={(e) => handleYearChange(e.target.value)}
                            className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            {yearOptions.map((year) => (
                                <option key={year} value={year}>
                                    {year}
                                </option>
                            ))}
                        </select>
                    </div>
                </CardHeader>
                <CardContent>
                    {chartRows.length > 0 ? (
                        <ResponsiveContainer width="100%" height={400}>
                            <ComposedChart data={chartRows} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="month" />
                                <YAxis />
                                <RechartTooltip
                                    formatter={(value: any, name: string) => {
                                        if (name === 'total') {
                                            return [`RM ${parseFloat(value).toFixed(2)}`, 'Total Amount'];
                                        }
                                        return [value, name];
                                    }}
                                />
                                <Legend />
                                <Bar dataKey="total" fill="#ef4444" name="Total Amount" />
                                <Line type="monotone" dataKey="total" stroke="#dc2626" strokeWidth={2} dot={{ fill: '#dc2626' }} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="text-center text-gray-500 py-8">
                            No maintenance data available for the selected period.
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Excel Report Component - Can be added separately */}
            <MaintenanceReport />
        </div>
    );
};

export default MaintenanceDash;
