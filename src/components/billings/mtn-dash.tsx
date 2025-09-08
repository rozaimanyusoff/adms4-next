'use client';
import React, { useEffect, useState } from 'react';
import { authenticatedApi } from '@/config/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { WrenchIcon, TrendingUpIcon, DollarSignIcon, AlertTriangleIcon } from 'lucide-react';
import { toast } from 'sonner';

interface MaintenanceBill {
    inv_id: number;
    inv_no: string | null;
    inv_date: string | null;
    svc_order: string;
    asset: {
        id: number;
        register_number: string;
        fuel_type: string;
        costcenter: {
            id: number;
            name: string;
        } | null;
        location: {
            id: number;
            name: string;
        } | null;
    };
    workshop: {
        id: number;
        name: string;
    } | null;
    svc_date: string | null;
    svc_odo: string | null;
    inv_total: string;
    inv_stat: string | null;
    inv_remarks?: string | null;
    running_no: number;
}

type MaintenanceApiResponse = {
    status: string;
    message: string;
    data: MaintenanceBill[];
};

interface DashboardData {
    totalAmount: number;
    totalBills: number;
    activeWorkshops: number;
    averageCost: number;
    monthlyData: Array<{
        month: string;
        amount: number;
        count: number;
    }>;
    workshopData: Array<{
        name: string;
        amount: number;
        count: number;
    }>;
    costCenterData: Array<{
        name: string;
        amount: number;
    }>;
}

const CHART_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const MaintenanceDashboard: React.FC = () => {
    const [data, setData] = useState<DashboardData>({
        totalAmount: 0,
        totalBills: 0,
        activeWorkshops: 0,
        averageCost: 0,
        monthlyData: [],
        workshopData: [],
        costCenterData: []
    });
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
    const [loading, setLoading] = useState(false);
    const [availableYears, setAvailableYears] = useState<string[]>([]);

    // Format currency
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-MY', {
            style: 'currency',
            currency: 'MYR',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    // Process maintenance bills data into dashboard statistics
    const processMaintenanceData = (bills: MaintenanceBill[], year: string) => {
        const filteredBills = bills.filter(bill => {
            if (year === 'All') return true;
            if (!bill.inv_date) return false; // Skip bills without dates
            return new Date(bill.inv_date).getFullYear().toString() === year;
        });

        // Calculate totals
        const totalAmount = filteredBills.reduce((sum, bill) => sum + (parseFloat(bill.inv_total) || 0), 0);
        const totalBills = filteredBills.length;
        const activeWorkshops = new Set(filteredBills
            .filter(bill => bill.workshop)
            .map(bill => bill.workshop!.name)
        ).size;
        const averageCost = totalBills > 0 ? totalAmount / totalBills : 0;

        // Monthly data
        const monthlyTotals: { [key: string]: { amount: number; count: number } } = {};
        filteredBills.forEach(bill => {
            if (!bill.inv_date) return; // Skip bills without dates
            const date = new Date(bill.inv_date);
            const monthKey = date.toLocaleString('en-US', { month: 'short', year: '2-digit' });
            if (!monthlyTotals[monthKey]) {
                monthlyTotals[monthKey] = { amount: 0, count: 0 };
            }
            monthlyTotals[monthKey].amount += parseFloat(bill.inv_total) || 0;
            monthlyTotals[monthKey].count += 1;
        });

        const monthlyData = Object.entries(monthlyTotals)
            .sort(([a], [b]) => {
                const dateA = new Date(a.replace('-', ' 20'));
                const dateB = new Date(b.replace('-', ' 20'));
                return dateA.getTime() - dateB.getTime();
            })
            .map(([month, data]) => ({
                month,
                amount: data.amount,
                count: data.count
            }));

        // Workshop data
        const workshopTotals: { [key: string]: { amount: number; count: number } } = {};
        filteredBills.forEach(bill => {
            const workshopName = bill.workshop?.name || 'Unknown Workshop';
            if (!workshopTotals[workshopName]) {
                workshopTotals[workshopName] = { amount: 0, count: 0 };
            }
            workshopTotals[workshopName].amount += parseFloat(bill.inv_total) || 0;
            workshopTotals[workshopName].count += 1;
        });

        const workshopData = Object.entries(workshopTotals)
            .sort(([, a], [, b]) => b.amount - a.amount)
            .slice(0, 6) // Top 6 workshops
            .map(([name, data]) => ({
                name: name.length > 20 ? name.substring(0, 20) + '...' : name,
                amount: data.amount,
                count: data.count
            }));

        // Cost center data
        const costCenterTotals: { [key: string]: number } = {};
        filteredBills.forEach(bill => {
            const costCenterName = bill.asset?.costcenter?.name || 'Unassigned';
            if (!costCenterTotals[costCenterName]) {
                costCenterTotals[costCenterName] = 0;
            }
            costCenterTotals[costCenterName] += parseFloat(bill.inv_total) || 0;
        });

        const costCenterData = Object.entries(costCenterTotals)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 8) // Top 8 cost centers
            .map(([name, amount]) => ({
                name: name.length > 15 ? name.substring(0, 15) + '...' : name,
                amount
            }));

        return {
            totalAmount,
            totalBills,
            activeWorkshops,
            averageCost,
            monthlyData,
            workshopData,
            costCenterData
        };
    };

    // Fetch dashboard data
    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            const response = await authenticatedApi.get<MaintenanceApiResponse>('/api/bills/mtn');
            const bills: MaintenanceBill[] = Array.isArray(response.data.data) ? response.data.data : [];
            
            // Get available years
            const years = Array.from(new Set(bills
                .filter(bill => bill.inv_date) // Only include bills with dates
                .map(bill => new Date(bill.inv_date!).getFullYear().toString())
            )).sort().reverse();
            const yearOptions = ['All', ...years];
            setAvailableYears(yearOptions);

            // Set default year if not set
            if (!selectedYear || !yearOptions.includes(selectedYear)) {
                const currentYear = new Date().getFullYear().toString();
                const defaultYear = years.includes(currentYear) ? currentYear : years[0] || 'All';
                setSelectedYear(defaultYear);
            }

            // Process data for selected year
            const dashboardData = processMaintenanceData(bills, selectedYear);
            setData(dashboardData);

        } catch (error) {
            console.error('Error fetching maintenance data:', error);
            toast.error('Failed to fetch maintenance data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, [selectedYear]);

    // Custom tooltip for charts
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                    <p className="font-medium">{label}</p>
                    {payload.map((entry: any, index: number) => (
                        <p key={index} style={{ color: entry.color }}>
                            {entry.dataKey === 'amount' ? 'Amount: ' + formatCurrency(entry.value) : `${entry.dataKey}: ${entry.value}`}
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    const StatCard = ({ title, value, icon: Icon, trend, trendValue }: {
        title: string;
        value: string | number;
        icon: React.ComponentType<any>;
        trend?: 'up' | 'down' | 'neutral';
        trendValue?: string;
    }) => (
        <Card className="transition-all hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">{title}</CardTitle>
                <Icon className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                {trendValue && (
                    <p className={`text-xs ${
                        trend === 'up' ? 'text-green-600' : 
                        trend === 'down' ? 'text-red-600' : 
                        'text-gray-500'
                    }`}>
                        {trendValue}
                    </p>
                )}
            </CardContent>
        </Card>
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Maintenance Dashboard</h2>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger className="w-32">
                        <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent>
                        {availableYears.map(year => (
                            <SelectItem key={year} value={year}>
                                {year}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Total Amount"
                    value={formatCurrency(data.totalAmount)}
                    icon={DollarSignIcon}
                    trend="up"
                    trendValue="YTD Total"
                />
                <StatCard
                    title="Total Bills"
                    value={data.totalBills.toLocaleString()}
                    icon={WrenchIcon}
                    trend="neutral"
                    trendValue="This year"
                />
                <StatCard
                    title="Active Workshops"
                    value={data.activeWorkshops}
                    icon={AlertTriangleIcon}
                    trend="neutral"
                    trendValue="Providers"
                />
                <StatCard
                    title="Average Cost"
                    value={formatCurrency(data.averageCost)}
                    icon={TrendingUpIcon}
                    trend="up"
                    trendValue="Per service"
                />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Monthly Trend Chart */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Monthly Maintenance Spending</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={data.monthlyData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="month" />
                                <YAxis tickFormatter={(value) => formatCurrency(value)} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="amount" fill="#0088FE" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Workshop Distribution */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Top Workshops by Amount</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={data.workshopData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="amount"
                                >
                                    {data.workshopData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Cost Center Breakdown */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Cost Center Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={data.costCenterData} layout="horizontal">
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" tickFormatter={(value) => formatCurrency(value)} />
                            <YAxis dataKey="name" type="category" width={120} />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="amount" fill="#00C49F" radius={[0, 4, 4, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
    );
};

export default MaintenanceDashboard;
