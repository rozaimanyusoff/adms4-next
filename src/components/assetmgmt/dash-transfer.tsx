// Asset Dashboard for CoreAsset
import React, { useEffect, useState } from "react";
import { authenticatedApi } from "../../config/api";
import { Bar, BarChart, XAxis, CartesianGrid } from "recharts";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend as RechartsLegend, ResponsiveContainer, Legend } from "recharts";

interface Asset {
    id: number;
    serial_number: string;
    classification?: string;
    status?: string;
    year?: string | null;
}

const DashTransfer: React.FC = () => {
    const [data, setData] = useState<Asset[]>([]);
    const [loading, setLoading] = useState(true);
    const [showNonAsset, setShowNonAsset] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await authenticatedApi.get<any>("/api/assets");
                const assets: Asset[] = Array.isArray(res.data.data) ? res.data.data : [];
                setData(assets);
            } catch {
                setData([]);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // Detect dark mode
    const [isDark, setIsDark] = useState(false);
    useEffect(() => {
        const match = window.matchMedia('(prefers-color-scheme: dark)');
        setIsDark(match.matches);
        const handler = (e: MediaQueryListEvent) => setIsDark(e.matches);
        match.addEventListener('change', handler);
        return () => match.removeEventListener('change', handler);
    }, []);

    // Filter data for dashboard based on switch (do NOT discount disposed here)
    const dashboardData = showNonAsset
        ? data
        : data.filter(asset => (asset.classification || '').toLowerCase() !== 'non-asset');

    // Filter for charts: exclude disposed assets
    const chartAssets = dashboardData.filter(asset => (asset.status || '').toLowerCase() !== 'disposed');

    // Compute dashboard stats
    const total = dashboardData.length;
    const active = dashboardData.filter(a => a.status && a.status.toLowerCase() === "active").length;
    const inactive = dashboardData.filter(a => !a.status || a.status.toLowerCase() !== "active").length;
    const latest = dashboardData.slice(-5).reverse();

    // Compute asset count by year for the bar chart
    const yearCount: Record<string, number> = {};
    chartAssets.forEach(asset => {
        if (asset.year && !isNaN(Number(asset.year))) {
            yearCount[asset.year] = (yearCount[asset.year] || 0) + 1;
        }
    });
    const chartData = Object.entries(yearCount)
        .map(([year, value]) => ({ year, value }))
        .sort((a, b) => Number(a.year) - Number(b.year));

    // Prepare stacked bar chart data for 'Assets Purchased by Year' by asset type
    // Use chartAssets (filtered by status) for the chart
    const allTypesSet = new Set<string>();
    chartAssets.forEach(asset => {
        const type = (asset as any).types?.name || asset.classification || 'Unknown';
        if (asset.year && !isNaN(Number(asset.year))) {
            allTypesSet.add(type);
        }
    });
    const allTypes = Array.from(allTypesSet);
    const yearTypeStacked = {} as Record<string, Record<string, number>>;
    chartAssets.forEach(asset => {
        if (asset.year && !isNaN(Number(asset.year))) {
            const year = asset.year;
            const type = (asset as any).types?.name || asset.classification || 'Unknown';
            if (!yearTypeStacked[year]) yearTypeStacked[year] = {};
            yearTypeStacked[year][type] = (yearTypeStacked[year][type] || 0) + 1;
        }
    });
    const chartDataStacked = Object.entries(yearTypeStacked)
        .map(([year, typeCounts]) => {
            const row: Record<string, any> = { year };
            allTypes.forEach(type => {
                row[type] = typeCounts[type] || 0;
            });
            return row;
        })
        .sort((a, b) => Number(a.year) - Number(b.year));

    // Group and count by type for each status
    const typeCount = (assets: Asset[]) => {
        const counts: Record<string, number> = {};
        assets.forEach(a => {
            // Use a.type or a.classification as type field (adjust as needed)
            const type = (a as any).types?.name || a.classification || 'Unknown';
            counts[type] = (counts[type] || 0) + 1;
        });
        return counts;
    };
    const totalByType = typeCount(dashboardData);
    const activeByType = typeCount(dashboardData.filter(a => a.status && a.status.toLowerCase() === "active"));
    const disposedByType = typeCount(dashboardData.filter(a => a.status && a.status.toLowerCase() === "disposed"));
    // Count non-assets (classification === 'Non-Asset', case-insensitive)
    const nonAssets = dashboardData.filter(a => (a.classification || '').toLowerCase() === 'non-asset');
    const totalNonAssets = nonAssets.length;
    const nonAssetByType = typeCount(nonAssets);

    // Pie chart: Asset by Age
    const currentYear = new Date().getFullYear();
    const ageGroups = [
        { label: '<5 years', min: 0, max: 4 },
        { label: '5-10 years', min: 5, max: 9 },
        { label: '10-15 years', min: 10, max: 14 },
        { label: '>15 years', min: 15, max: 100 }
    ];
    const ageGroupCounts: Record<string, number> = {};
    chartAssets.forEach(asset => {
        if (asset.year && !isNaN(Number(asset.year))) {
            const age = currentYear - Number(asset.year);
            const group = ageGroups.find(g => age >= g.min && age <= g.max);
            if (group) ageGroupCounts[group.label] = (ageGroupCounts[group.label] || 0) + 1;
        }
    });
    const pieDataAge = ageGroups.map(g => ({ name: g.label, value: ageGroupCounts[g.label] || 0 }));
    // Pie chart: Asset by Cost Center
    const costCenterCounts: Record<string, number> = {};
    chartAssets.forEach(asset => {
        const cc = (asset as any).cost_center || 'Unknown';
        costCenterCounts[cc] = (costCenterCounts[cc] || 0) + 1;
    });
    const pieDataCostCenter = Object.entries(costCenterCounts).map(([name, value]) => ({ name, value }));
    const axisColor = isDark ? '#e5e7eb' : '#374151';
    const gridColor = isDark ? '#374151' : '#e5e7eb';
    const legendTextColor = isDark ? '#e5e7eb' : '#374151';
    const pieColors = [
        '#2563eb', '#60a5fa', '#fbbf24', '#f87171', '#34d399', '#a78bfa', '#f472b6', '#facc15', '#4ade80', '#f87171', '#818cf8', '#f472b6', '#fbbf24', '#f87171', '#34d399', '#a78bfa', '#f472b6', '#facc15', '#4ade80', '#f87171', '#818cf8', '#f472b6'
    ];

    const chartConfig = {
        value: {
            label: "Assets",
            color: "#2563eb",
        },
    } satisfies ChartConfig;

    return (
        <div className="mt-4 space-y-6">
            <div className="flex items-center mb-2 gap-2">
                <label htmlFor="show-nonasset-switch" className="text-sm select-none cursor-pointer my-1">
                    Show Non-Asset
                </label>
                <Switch
                    id="show-nonasset-switch"
                    checked={showNonAsset}
                    onCheckedChange={setShowNonAsset}
                />
            </div>
            <div
                className="grid gap-4"
                style={{
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))'
                }}
            >
                <Card>
                    <CardHeader>
                        <CardTitle>Total Assets</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{total}</div>
                        <ul className="mt-2 text-sm text-gray-600">
                            {Object.entries(totalByType).map(([type, count]) => (
                                <li key={type}>{type}: <span className="font-semibold">{count}</span></li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
                {showNonAsset && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Total Non-Assets</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-blue-500">{totalNonAssets}</div>
                            <ul className="mt-2 text-sm text-gray-600">
                                {Object.entries(nonAssetByType).map(([type, count]) => (
                                    <li key={type}>{type}: <span className="font-semibold">{count}</span></li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>
                )}
                <Card>
                    <CardHeader>
                        <CardTitle>Active</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-green-600">{active}</div>
                        <ul className="mt-2 text-sm text-gray-600">
                            {Object.entries(activeByType).map(([type, count]) => (
                                <li key={type}>{type}: <span className="font-semibold">{count}</span></li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Disposed</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-red-500">{disposedByType ? Object.values(disposedByType).reduce((a, b) => a + b, 0) : 0}</div>
                        <ul className="mt-2 text-sm text-gray-600">
                            {Object.entries(disposedByType).map(([type, count]) => (
                                <li key={type}>{type}: <span className="font-semibold">{count}</span></li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            </div>
            {/* Pie Charts: Asset by Age & Cost Center */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-4 flex flex-col items-center">
                    <h3 className="text-lg font-semibold mb-4">Asset by Age</h3>
                    <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                            <Pie data={pieDataAge} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
                                {pieDataAge.map((entry, idx) => (
                                    <Cell key={`cell-age-${idx}`} fill={pieColors[idx % pieColors.length]} />
                                ))}
                            </Pie>
                            <RechartsTooltip contentStyle={{ background: isDark ? '#22223b' : '#fff', color: isDark ? '#e5e7eb' : '#374151' }} wrapperStyle={{ color: isDark ? '#e5e7eb' : '#374151' }} />
                            <RechartsLegend wrapperStyle={{ color: legendTextColor }} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-4 flex flex-col items-center">
                    <h3 className="text-lg font-semibold mb-4">Asset by Cost Center</h3>
                    <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                            <Pie data={pieDataCostCenter} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
                                {pieDataCostCenter.map((entry, idx) => (
                                    <Cell key={`cell-cc-${idx}`} fill={pieColors[idx % pieColors.length]} />
                                ))}
                            </Pie>
                            <RechartsTooltip contentStyle={{ background: isDark ? '#22223b' : '#fff', color: isDark ? '#e5e7eb' : '#374151' }} wrapperStyle={{ color: isDark ? '#e5e7eb' : '#374151' }} />
                            <RechartsLegend wrapperStyle={{ color: legendTextColor }} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
            {/* Stacked Bar Chart: Assets Purchased by Year by Type */}
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-4 mb-6">
                <h3 className="text-lg font-semibold mb-4">Assets Purchased by Year</h3>
                <ChartContainer config={chartConfig} className="max-h-[260px] w-full">
                    <BarChart data={chartDataStacked} height={260}>
                        <CartesianGrid vertical={false} horizontal={false} />
                        <XAxis dataKey="year" tickLine={false} tickMargin={10} axisLine={false} tickFormatter={(value) => String(value)} stroke={axisColor} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Legend wrapperStyle={{ color: legendTextColor }} />
                        {allTypes.map((type, idx) => (
                            <Bar key={type} dataKey={type} stackId="a" fill={`hsl(${(idx * 60) % 360}, 70%, 55%)`} name={type} />
                        ))}
                    </BarChart>
                </ChartContainer>
            </div>
            {/* Latest Assets Table */}
            <div className="mt-8">
                <div className="overflow-x-auto">
                    <table className="min-w-full border rounded bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100">
                        <thead>
                            <tr>
                                <th className="px-3 py-2 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100">#</th>
                                <th className="px-3 py-2 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100">Serial Number</th>
                                <th className="px-3 py-2 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100">Type</th>
                                <th className="px-3 py-2 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100">Classification</th>
                                <th className="px-3 py-2 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100">Status</th>
                                <th className="px-3 py-2 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100">Year</th>
                            </tr>
                        </thead>
                        <tbody>
                            {latest.map((asset, idx) => (
                                <tr key={asset.id} className="hover:bg-gray-100 dark:hover:bg-gray-800">
                                    <td className="px-3 py-2 border border-gray-200 dark:border-gray-700">{idx + 1}</td>
                                    <td className="px-3 py-2 border border-gray-200 dark:border-gray-700">{asset.serial_number}</td>
                                    <td className="px-3 py-2 border border-gray-200 dark:border-gray-700">{(asset as any).types?.name || asset.classification || '-'}</td>
                                    <td className="px-3 py-2 border border-gray-200 dark:border-gray-700">{asset.classification || '-'}</td>
                                    <td className="px-3 py-2 border border-gray-200 dark:border-gray-700">{asset.status || '-'}</td>
                                    <td className="px-3 py-2 border border-gray-200 dark:border-gray-700">{asset.year || '-'}</td>
                                </tr>
                            ))}
                            {latest.length === 0 && (
                                <tr><td colSpan={6} className="text-center py-4 text-gray-400 dark:text-gray-500">No data</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default DashTransfer;
