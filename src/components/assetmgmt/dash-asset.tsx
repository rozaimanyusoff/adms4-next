// Asset Dashboard for CoreAsset
import React, { useEffect, useState } from "react";
import { authenticatedApi } from "../../config/api";
import { Bar, BarChart, XAxis, CartesianGrid } from "recharts";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface Asset {
    id: number;
    serial_number: string;
    classification?: string;
    status?: string;
    year?: string | null;
}

const DashAsset: React.FC = () => {
    const [data, setData] = useState<Asset[]>([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [active, setActive] = useState(0);
    const [inactive, setInactive] = useState(0);
    const [latest, setLatest] = useState<Asset[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await authenticatedApi.get<any>("/api/assets");
                const assets: Asset[] = Array.isArray(res.data.data) ? res.data.data : [];
                setData(assets);
                setTotal(assets.length);
                setActive(assets.filter(a => a.status && a.status.toLowerCase() === "active").length);
                setInactive(assets.filter(a => !a.status || a.status.toLowerCase() !== "active").length);
                setLatest(assets.slice(-5).reverse());
            } catch {
                setData([]); setTotal(0); setActive(0); setInactive(0); setLatest([]);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // Compute asset count by year for the bar chart
    const yearCount: Record<string, number> = {};
    data.forEach(asset => {
        if (asset.year && !isNaN(Number(asset.year))) {
            yearCount[asset.year] = (yearCount[asset.year] || 0) + 1;
        }
    });
    const chartData = Object.entries(yearCount)
        .map(([year, value]) => ({ year, value }))
        .sort((a, b) => Number(a.year) - Number(b.year));

    const chartConfig = {
        value: {
            label: "Assets",
            color: "#2563eb",
        },
    } satisfies ChartConfig;

    return (
        <div className="mt-4 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Total Assets</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{total}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Active</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-green-600">{active}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Disposed</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-red-500">{inactive}</div>
                    </CardContent>
                </Card>
            </div>
            {/* Bar Chart: Assets by Year (shadcn style) */}
            <div className="bg-white rounded shadow p-4 mb-6">
                <h3 className="text-lg font-semibold mb-4">Assets Purchased by Year</h3>
                <ChartContainer config={chartConfig} className="max-h-[200px] w-full">
                    <BarChart accessibilityLayer data={chartData}>
                        <CartesianGrid vertical={false} />
                        <XAxis
                            dataKey="year"
                            tickLine={false}
                            tickMargin={10}
                            axisLine={false}
                            tickFormatter={(value) => String(value)}
                        />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <ChartLegend content={<ChartLegendContent />} />
                        <Bar dataKey="value" fill="var(--color-value)" radius={4} />
                    </BarChart>
                </ChartContainer>
            </div>
            {/* Latest Assets Table */}
            <div className="mt-8">
                <h3 className="text-lg font-semibold mb-2">Latest Assets</h3>
                <div className="overflow-x-auto">
                    <table className="min-w-full bg-white border rounded">
                        <thead>
                            <tr>
                                <th className="px-3 py-2 border">#</th>
                                <th className="px-3 py-2 border">Serial Number</th>
                                <th className="px-3 py-2 border">Classification</th>
                                <th className="px-3 py-2 border">Status</th>
                                <th className="px-3 py-2 border">Year</th>
                            </tr>
                        </thead>
                        <tbody>
                            {latest.map((asset, idx) => (
                                <tr key={asset.id}>
                                    <td className="px-3 py-2 border">{idx + 1}</td>
                                    <td className="px-3 py-2 border">{asset.serial_number}</td>
                                    <td className="px-3 py-2 border">{asset.classification || '-'}</td>
                                    <td className="px-3 py-2 border">{asset.status || '-'}</td>
                                    <td className="px-3 py-2 border">{asset.year || '-'}</td>
                                </tr>
                            ))}
                            {latest.length === 0 && (
                                <tr><td colSpan={5} className="text-center py-4 text-gray-400">No data</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default DashAsset;
