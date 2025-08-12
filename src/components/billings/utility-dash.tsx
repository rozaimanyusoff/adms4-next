'use client';
import React, { useEffect, useState } from 'react';
import { authenticatedApi } from '@/config/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip as RechartTooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import ExcelUtilityReport from './excel-utility-report';

interface UtilityBill {
    util_id: number;
    account: {
        bill_id: number;
        bill_ac: string;
        provider: string;
        service: string;
        desc: string;
    };
    costcenter: {
        id: number;
        name: string;
    };
    loc_id: number;
    ubill_date: string;
    ubill_no: string;
    ubill_ref: string | null;
    ubill_submit: string | null;
    ubill_rent: string;
    ubill_color: string;
    ubill_bw: string;
    ubill_stotal: string | null;
    ubill_taxrate: string | null;
    ubill_tax: string | null;
    ubill_round: string | null;
    ubill_deduct: string | null;
    ubill_gtotal: string;
    ubill_count: string | null;
    ubill_disc: string | null;
    ubill_usage: string | null;
    ubill_payref: string | null;
    ubill_paystat: string;
}

type UtilityApiResponse = {
    status: string;
    message: string;
    data: UtilityBill[];
};

interface CostCenter {
    id: number;
    name: string;
}

type CostCenterApiResponse = {
    status: string;
    message: string;
    data: CostCenter[];
};

const UtilityDash: React.FC = () => {
    const [chartRows, setChartRows] = useState<{ month: string; total: number; count: number }[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedYear, setSelectedYear] = useState<string>('');
    const [yearOptions, setYearOptions] = useState<string[]>([]);
    const [selectedService, setSelectedService] = useState<string>('All');
    const [serviceOptions, setServiceOptions] = useState<string[]>([]);
    const [selectedCostCenter, setSelectedCostCenter] = useState<string>('All');
    const [costCenterOptions, setCostCenterOptions] = useState<{ id: string; name: string }[]>([]);

    // Fetch service options and cost centers once on component mount
    useEffect(() => {
        const fetchFilterOptions = async () => {
            try {
                console.log('Starting to fetch filter options...');
                
                // Fetch cost centers from dedicated API
                console.log('Fetching cost centers from /api/assets/costcenters...');
                const costCenterRes = await authenticatedApi.get<CostCenterApiResponse>('/api/assets/costcenters');
                console.log('Cost center response:', costCenterRes.data);
                
                const costCenters: CostCenter[] = Array.isArray(costCenterRes.data.data) ? costCenterRes.data.data : [];
                console.log('Processed cost centers:', costCenters);
                
                // Set cost center options with id and name
                const costCenterOptions = [
                    { id: 'All', name: 'All' },
                    ...costCenters.map(cc => ({ id: cc.id.toString(), name: cc.name }))
                ];
                console.log('Cost center options:', costCenterOptions);
                setCostCenterOptions(costCenterOptions);
                
                // Fetch utility bills to get service options
                console.log('Fetching utility bills from /api/bills/util...');
                const utilityRes = await authenticatedApi.get<UtilityApiResponse>('/api/bills/util');
                console.log('Utility response:', utilityRes.data);
                
                const bills: UtilityBill[] = Array.isArray(utilityRes.data.data) ? utilityRes.data.data : [];
                console.log('Processed bills count:', bills.length);
                console.log('Sample bills:', bills.slice(0, 2));
                
                // Extract services from bills
                const services = Array.from(new Set(bills
                    .filter(bill => bill.account && bill.account.service)
                    .map(bill => bill.account.service)
                )).sort();
                console.log('Extracted services:', services);
                
                // Set service options
                const serviceOptions = ['All', ...services];
                console.log('Service options:', serviceOptions);
                setServiceOptions(serviceOptions);
                
                console.log('Filter options setup complete');
            } catch (err: any) {
                console.error('Error fetching filter options:', err);
                console.error('Error details:', err?.response?.data || err?.message);
                
                // Fallback: Set basic options if API calls fail
                console.log('Setting fallback options...');
                setServiceOptions(['All', 'utilities', 'printing', 'rental', 'services']);
                setCostCenterOptions([{ id: 'All', name: 'All' }]);
            }
        };
        fetchFilterOptions();
    }, []);

    // Fetch chart data when year, service, or cost center changes
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Build API URL with service and cost center parameters
                let apiUrl = '/api/bills/util';
                const params = new URLSearchParams();
                
                if (selectedService && selectedService !== 'All') {
                    params.append('service', selectedService);
                }
                
                if (selectedCostCenter && selectedCostCenter !== 'All') {
                    params.append('costcenter', selectedCostCenter);
                }
                
                if (params.toString()) {
                    apiUrl += `?${params.toString()}`;
                }
                
                const res = await authenticatedApi.get<UtilityApiResponse>(apiUrl);
                const bills: UtilityBill[] = Array.isArray(res.data.data) ? res.data.data : [];
                
                // Get all years from filtered data
                const years = Array.from(new Set(bills.map(bill => new Date(bill.ubill_date).getFullYear().toString()))).sort();
                const yearOptions = ['All', ...years];
                const currentYear = new Date().getFullYear().toString();
                
                if (!selectedYear && yearOptions.includes(currentYear)) {
                    setSelectedYear(currentYear);
                } else if (!selectedYear && yearOptions.length) {
                    setSelectedYear(yearOptions[1] || 'All');
                }

                // Group by month for selected year (service and cost center already filtered by API)
                const monthlyTotals: { [month: string]: { total: number; count: number } } = {};
                bills.forEach(bill => {
                    const date = new Date(bill.ubill_date);
                    const year = date.getFullYear().toString();
                    
                    // Apply year filter only (service and cost center already filtered by API)
                    const yearMatch = selectedYear === 'All' || year === selectedYear;
                    
                    if (bill.ubill_gtotal && yearMatch) {
                        const monthLabel = date.toLocaleString('en-US', { month: 'short' }) + '-' + year.slice(-2);
                        if (!monthlyTotals[monthLabel]) monthlyTotals[monthLabel] = { total: 0, count: 0 };
                        
                        monthlyTotals[monthLabel].total += parseFloat(bill.ubill_gtotal);
                        monthlyTotals[monthLabel].count += 1;
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
                }).map(month => ({ 
                    month, 
                    total: monthlyTotals[month].total, 
                    count: monthlyTotals[month].count 
                }));

                // Debug logging
                console.log('API URL:', apiUrl);
                console.log('Bills count:', bills.length);
                console.log('Selected filters:', { selectedYear, selectedService, selectedCostCenter });
                console.log('Chart data:', chartRows);

                setChartRows(chartRows);
                setYearOptions(yearOptions);
            } catch (err) {
                console.error('Error fetching utility data:', err);
                setChartRows([]);
                setYearOptions(['All']);
            }
            setLoading(false);
        };
        fetchData();
    }, [selectedYear, selectedService, selectedCostCenter]);

    return (
        <div className="space-y-6">
            <Card className="mt-4 w-full">
                <CardHeader>
                    <CardTitle>Utility Bills - Monthly Total</CardTitle>
                    {/* Debug info */}
                    <div className="text-xs text-gray-500 mb-2">
                        Services: {serviceOptions.length} | Cost Centers: {costCenterOptions.length}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-4 items-center">
                        <div className="flex gap-2 items-center">
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
                        <div className="flex gap-2 items-center">
                            <span className="text-sm">Service:</span>
                            <select
                                className="border rounded px-2 py-1 text-sm"
                                value={selectedService}
                                onChange={e => setSelectedService(e.target.value)}
                            >
                                {serviceOptions.map(service => (
                                    <option key={service} value={service}>{service}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex gap-2 items-center">
                            <span className="text-sm">Cost Center:</span>
                            <select
                                className="border rounded px-2 py-1 text-sm"
                                value={selectedCostCenter}
                                onChange={e => setSelectedCostCenter(e.target.value)}
                            >
                                {costCenterOptions.map(cc => (
                                    <option key={cc.id} value={cc.id}>{cc.name}</option>
                                ))}
                            </select>
                        </div>
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
                                    label={{ value: 'Bill Count', angle: 90, position: 'insideRight' }}
                                    tickFormatter={value => value.toLocaleString('en-US')}
                                />
                                <RechartTooltip 
                                    formatter={(value: number, name: string) => {
                                        if (name === 'Total Bills (RM)') {
                                            return `RM ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                                        }
                                        return value.toLocaleString('en-US');
                                    }}
                                />
                                <Legend />
                                <Bar dataKey="total" fill="#dc2626" radius={[4, 4, 0, 0]} name="Total Bills (RM)" />
                                <Line 
                                    type="monotone" 
                                    dataKey="count" 
                                    stroke="#f59e0b" 
                                    strokeWidth={3} 
                                    dot={{ r: 3 }} 
                                    name="Bill Count" 
                                    yAxisId="right" 
                                />
                            </ComposedChart>
                        </ResponsiveContainer>
                    ) : (
                        <div>No data available.</div>
                    )}
                </CardContent>
            </Card>
            <ExcelUtilityReport />
        </div>
    );
};

export default UtilityDash;
