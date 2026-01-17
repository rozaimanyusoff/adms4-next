// Asset Dashboard for CoreAsset
import React, { useEffect, useRef, useState } from "react";
import { authenticatedApi } from "../../config/api";
import { Bar, BarChart, XAxis, CartesianGrid } from "recharts";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { PieChart, Pie, Cell, Legend as RechartsLegend, ResponsiveContainer, Legend, Label, Tooltip } from "recharts";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";

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
    const [hideNonAsset, setHideNonAsset] = useState(true);
    const [hiddenTypeIds, setHiddenTypeIds] = useState<string[]>([]);
    const [activeTypeId, setActiveTypeId] = useState<string | null>(null);
    const [activeCostCenterId, setActiveCostCenterId] = useState<string | null>(null);
    const formatNumber = (value: number) => new Intl.NumberFormat('en-US').format(value);
    const [typePopoverOpen, setTypePopoverOpen] = useState(false);
    const [typePopoverSummary, setTypePopoverSummary] = useState<{ typeName: string; active: number; disposed: number; total: number } | null>(null);
    const [popoverPosition, setPopoverPosition] = useState<{ top: number; left: number } | null>(null);
    const [costCenterPopoverOpen, setCostCenterPopoverOpen] = useState(false);
    const [costCenterPopoverSummary, setCostCenterPopoverSummary] = useState<{ costCenterName: string; total: number; types: { name: string; value: number }[] } | null>(null);
    const [costCenterPopoverPosition, setCostCenterPopoverPosition] = useState<{ top: number; left: number } | null>(null);
    const [hiddenAgeGroups, setHiddenAgeGroups] = useState<string[]>([]);
    const [agePopoverOpen, setAgePopoverOpen] = useState(false);
    const [agePopoverSummary, setAgePopoverSummary] = useState<{ groupName: string; total: number; types: { name: string; value: number }[] } | null>(null);
    const [agePopoverPosition, setAgePopoverPosition] = useState<{ top: number; left: number } | null>(null);
    const [yearPopoverOpen, setYearPopoverOpen] = useState(false);
    const [yearPopoverSummary, setYearPopoverSummary] = useState<{ year: string; total: number; costCenters: { name: string; value: number }[] } | null>(null);
    const [yearPopoverPosition, setYearPopoverPosition] = useState<{ top: number; left: number } | null>(null);

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

    const nonAssetClasses = ['non-asset', 'personal', 'rental', 'consumable'];
    const isNonAssetClassification = (classification?: string) =>
        nonAssetClasses.includes((classification || '').toLowerCase());

    // Filter data for dashboard based on switch (do NOT discount disposed here)
    const dashboardData = hideNonAsset
        ? data.filter(asset => !isNonAssetClassification(asset.classification))
        : data;

    // Filter for charts: exclude disposed assets
    const chartAssets = dashboardData.filter(asset => (asset.status || '').toLowerCase() !== 'disposed');

    // Compute dashboard stats
    const active = dashboardData.filter(a => a.status && a.status.toLowerCase() === "active").length;
    const assetClassificationAssets = dashboardData.filter(a => (a.classification || '').toLowerCase() === 'asset');

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

    const getAssetTypeName = (asset: Asset) =>
        (asset as any).type?.name || (asset as any).types?.name || asset.classification || 'Unknown';
    const getAssetTypeId = (asset: Asset) =>
        (asset as any).type?.id ?? (asset as any).types?.id ?? (asset as any).type_id ?? 'unknown-type';
    const getPurchaseYear = (asset: Asset) =>
        (asset as any).purchase_year ?? asset.year;
    const getCostCenterName = (asset: Asset) =>
        (asset as any).costcenter?.name || (asset as any).cost_center?.name || (asset as any).cost_center || 'Unknown';
    const getCostCenterId = (asset: Asset) =>
        (asset as any).costcenter?.id ?? (asset as any).cost_center?.id ?? (asset as any).cost_center_id ?? (asset as any).cost_center ?? 'unknown-cc';
    const getAssetAge = (asset: Asset) => {
        const ageValue = (asset as any).age;
        if (ageValue !== undefined && ageValue !== null && !isNaN(Number(ageValue))) return Number(ageValue);
        if (asset.year && !isNaN(Number(asset.year))) return currentYear - Number(asset.year);
        return null;
    };
    const getAssetAgeGroupName = (asset: Asset) => {
        const age = getAssetAge(asset);
        if (age === null) return null;
        const group = ageGroups.find(g => age >= g.min && age <= g.max);
        return group?.label || null;
    };

    // Prepare stacked bar chart data for 'Assets Purchased by Year' by asset type
    // Use chartAssets (filtered by status) for the chart
    const allTypesSet = new Set<string>();
    chartAssets.forEach(asset => {
        const type = getAssetTypeName(asset);
        const purchaseYear = getPurchaseYear(asset);
        if (purchaseYear && !isNaN(Number(purchaseYear))) {
            allTypesSet.add(type);
        }
    });
    const allTypes = Array.from(allTypesSet);
    const yearTypeStacked = {} as Record<string, Record<string, number>>;
    chartAssets.forEach(asset => {
        const purchaseYear = getPurchaseYear(asset);
        if (purchaseYear && !isNaN(Number(purchaseYear))) {
            const year = String(purchaseYear);
            const type = getAssetTypeName(asset);
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
            const type = getAssetTypeName(a);
            counts[type] = (counts[type] || 0) + 1;
        });
        return counts;
    };
    const totalByType = typeCount(dashboardData);
    const pieDataAssetType = (() => {
        const counts: Record<string, { name: string; value: number; typeId: string }> = {};
        assetClassificationAssets.forEach(a => {
            const typeId = String(getAssetTypeId(a));
            const typeName = getAssetTypeName(a) || 'Unknown Type';
            if (!counts[typeId]) counts[typeId] = { name: typeName, value: 0, typeId };
            counts[typeId].value += 1;
        });
        return Object.values(counts);
    })();
    const pieColors = [
        '#2563eb', '#60a5fa', '#fbbf24', '#f87171', '#34d399', '#a78bfa', '#f472b6', '#facc15', '#4ade80', '#f87171', '#818cf8', '#f472b6', '#fbbf24', '#f87171', '#34d399', '#a78bfa', '#f472b6', '#facc15', '#4ade80', '#f87171', '#818cf8', '#f472b6'
    ];
    const pieDataWithColor = pieDataAssetType.map((entry, idx) => ({
        ...entry,
        color: pieColors[idx % pieColors.length],
    }));
    const hiddenTypeSet = new Set(hiddenTypeIds);
    const filteredPieData = pieDataWithColor.filter(entry => !hiddenTypeSet.has(entry.typeId));
    const toggleTypeVisibility = (typeId: string) => {
        setHiddenTypeIds(prev => prev.includes(typeId) ? prev.filter(id => id !== typeId) : [...prev, typeId]);
    };
    const pieContainerRef = React.useRef<HTMLDivElement | null>(null);
    const costCenterContainerRef = React.useRef<HTMLDivElement | null>(null);
    const ageContainerRef = useRef<HTMLDivElement | null>(null);
    const yearContainerRef = useRef<HTMLDivElement | null>(null);
    const setTypeSummaryFromTypeId = (typeId: string) => {
        const matching = assetClassificationAssets.filter(a => String(getAssetTypeId(a)) === String(typeId));
        const active = matching.filter(a => ((a as any).record_status || '').toLowerCase() === 'active').length;
        const disposed = matching.filter(a => ((a as any).record_status || '').toLowerCase() === 'disposed').length;
        setTypePopoverSummary({
            typeName: matching.length ? (getAssetTypeName(matching[0]) || 'Unknown Type') : 'Unknown Type',
            active,
            disposed,
            total: matching.length,
        });
    };
    const summarizeCostCenterTypes = (ccId: string) => {
        const matching = chartAssets.filter(a => String(getCostCenterId(a)) === String(ccId));
        const typeCounts: Record<string, number> = {};
        matching.forEach(a => {
            const typeName = getAssetTypeName(a);
            typeCounts[typeName] = (typeCounts[typeName] || 0) + 1;
        });
        const types = Object.entries(typeCounts).map(([name, value]) => ({ name, value }));
        setCostCenterPopoverSummary({
            costCenterName: matching.length ? (getCostCenterName(matching[0]) || 'Unknown') : 'Unknown',
            total: matching.length,
            types,
        });
    };
    const handleSliceClick = (data: any, _index: number, event: any) => {
        const typeId = data?.payload?.typeId;
        if (!typeId) return;
        if (pieContainerRef.current && event) {
            const rect = pieContainerRef.current.getBoundingClientRect();
            const clientX = event?.clientX ?? event?.pageX;
            const clientY = event?.clientY ?? event?.pageY;
            if (clientX != null && clientY != null) {
                setPopoverPosition({
                    left: clientX - rect.left,
                    top: clientY - rect.top,
                });
            }
        }
        setTypeSummaryFromTypeId(String(typeId));
        setActiveTypeId(String(typeId));
        setTypePopoverOpen(true);
    };
    const handleCostCenterSliceClick = (data: any, _index: number, event: any) => {
        const ccId = data?.payload?.id;
        if (!ccId) return;
        if (costCenterContainerRef.current && event) {
            const rect = costCenterContainerRef.current.getBoundingClientRect();
            const clientX = event?.clientX ?? event?.pageX;
            const clientY = event?.clientY ?? event?.pageY;
            if (clientX != null && clientY != null) {
                setCostCenterPopoverPosition({
                    left: clientX - rect.left,
                    top: clientY - rect.top,
                });
            }
        }
        summarizeCostCenterTypes(String(ccId));
        setActiveCostCenterId(String(ccId));
        setCostCenterPopoverOpen(true);
    };
    const setYearSummaryFromYear = (year: string) => {
        const matching = chartAssets.filter(a => {
            const py = getPurchaseYear(a);
            return py && String(py) === String(year);
        });
        const ccCounts: Record<string, number> = {};
        matching.forEach(a => {
            const ccName = getCostCenterName(a);
            ccCounts[ccName] = (ccCounts[ccName] || 0) + 1;
        });
        const costCenters = Object.entries(ccCounts).map(([name, value]) => ({ name, value }));
        setYearPopoverSummary({
            year: String(year),
            total: matching.length,
            costCenters,
        });
    };
    const handleYearBarClick = (data: any, _index: number, event: any) => {
        const year = data?.payload?.year;
        if (!year) return;
        if (yearContainerRef.current && event) {
            const rect = yearContainerRef.current.getBoundingClientRect();
            const clientX = event?.clientX ?? event?.pageX;
            const clientY = event?.clientY ?? event?.pageY;
            if (clientX != null && clientY != null) {
                setYearPopoverPosition({
                    left: clientX - rect.left,
                    top: clientY - rect.top,
                });
            }
        }
        setYearSummaryFromYear(String(year));
        setYearPopoverOpen(true);
    };
    const renderAssetTypeLegend = () => {
        return (
            <ul className="flex flex-wrap gap-3 text-sm">
                {pieDataWithColor.map((entry: any) => {
                    const typeId = entry?.typeId;
                    const isHidden = typeId ? hiddenTypeSet.has(typeId) : false;
                    return (
                        <li
                            key={typeId || entry.name}
                            className="flex items-center gap-1 cursor-pointer select-none"
                            onClick={() => typeId && toggleTypeVisibility(typeId)}
                        >
                            <span
                                className="inline-block w-3 h-3 rounded-sm"
                                style={{ background: entry.color, opacity: isHidden ? 0.35 : 1 }}
                            />
                            <span
                                style={{
                                    textDecoration: isHidden ? 'line-through' : 'none',
                                    color: '#111827',
                                    opacity: isHidden ? 0.5 : 1
                                }}
                            >
                                {entry.name}
                            </span>
                        </li>
                    );
                })}
            </ul>
        );
    };
    const toggleAgeGroupVisibility = (name: string) => {
        setHiddenAgeGroups(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]);
    };
    const renderAgeLegend = () => {
        return (
            <ul className="flex flex-wrap gap-3 text-sm">
                {pieDataAgeColored.map(entry => {
                    const isHidden = hiddenAgeGroupSet.has(entry.name);
                    return (
                        <li
                            key={entry.name}
                            className="flex items-center gap-1 cursor-pointer select-none"
                            onClick={() => toggleAgeGroupVisibility(entry.name)}
                        >
                            <span
                                className="inline-block w-3 h-3 rounded-sm"
                                style={{ background: entry.color, opacity: isHidden ? 0.35 : 1 }}
                            />
                            <span
                                style={{
                                    textDecoration: isHidden ? 'line-through' : 'none',
                                    color: '#111827',
                                    opacity: isHidden ? 0.5 : 1
                                }}
                            >
                                {entry.name}
                            </span>
                        </li>
                    );
                })}
            </ul>
        );
    };
    const setAgeSummaryFromGroup = (groupName: string) => {
        const matching = chartAssets.filter(a => getAssetAgeGroupName(a) === groupName);
        const typeCounts: Record<string, number> = {};
        matching.forEach(a => {
            const typeName = getAssetTypeName(a);
            typeCounts[typeName] = (typeCounts[typeName] || 0) + 1;
        });
        const types = Object.entries(typeCounts).map(([name, value]) => ({ name, value }));
        setAgePopoverSummary({
            groupName,
            total: matching.length,
            types,
        });
    };
    const handleAgeSliceClick = (data: any, _index: number, event: any) => {
        const groupName = data?.payload?.name;
        if (!groupName) return;
        if (ageContainerRef.current && event) {
            const rect = ageContainerRef.current.getBoundingClientRect();
            const clientX = event?.clientX ?? event?.pageX;
            const clientY = event?.clientY ?? event?.pageY;
            if (clientX != null && clientY != null) {
                setAgePopoverPosition({
                    left: clientX - rect.left,
                    top: clientY - rect.top,
                });
            }
        }
        setAgeSummaryFromGroup(String(groupName));
        setAgePopoverOpen(true);
    };
    const totalAssetClassification = assetClassificationAssets.length;
    const activeByType = typeCount(dashboardData.filter(a => a.status && a.status.toLowerCase() === "active"));
    const disposedByType = typeCount(dashboardData.filter(a => a.status && a.status.toLowerCase() === "disposed"));
    const disposedTotal = Object.values(disposedByType).reduce((a, b) => a + b, 0);
    // Count non-assets (classification === 'Non-Asset', case-insensitive)

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
        const groupName = getAssetAgeGroupName(asset);
        if (groupName) {
            ageGroupCounts[groupName] = (ageGroupCounts[groupName] || 0) + 1;
        }
    });
    const pieDataAge = ageGroups.map(g => ({ name: g.label, value: ageGroupCounts[g.label] || 0 }));
    const totalAgeCount = pieDataAge.reduce((sum, item) => sum + item.value, 0);
    const pieDataAgeColored = pieDataAge.map((entry, idx) => ({ ...entry, color: pieColors[idx % pieColors.length] }));
    const hiddenAgeGroupSet = new Set(hiddenAgeGroups);
    const filteredPieDataAge = pieDataAgeColored.filter(entry => !hiddenAgeGroupSet.has(entry.name));
    // Pie chart: Asset by Cost Center
    const costCenterCounts: Record<string, { id: string; name: string; value: number }> = {};
    chartAssets.forEach(asset => {
        const ccId = String(getCostCenterId(asset));
        const ccName = getCostCenterName(asset);
        if (!costCenterCounts[ccId]) costCenterCounts[ccId] = { id: ccId, name: ccName, value: 0 };
        costCenterCounts[ccId].value += 1;
    });
    const pieDataCostCenter = Object.values(costCenterCounts).map((entry, idx) => ({
        ...entry,
        color: pieColors[idx % pieColors.length],
    }));
    const axisColor = isDark ? '#e5e7eb' : '#374151';
    const gridColor = isDark ? '#374151' : '#e5e7eb';
    const legendTextColor = isDark ? '#e5e7eb' : '#374151';

    const chartConfig = {
        value: {
            label: "Assets",
            color: "#2563eb",
        },
    } satisfies ChartConfig;

    return (
        <div className="mt-4 space-y-6">
            <div className="flex items-center mb-2 gap-2">
                <label htmlFor="hide-nonasset-switch" className="text-sm select-none cursor-pointer my-1">
                    Hide Non-Asset
                </label>
                <Switch
                    id="hide-nonasset-switch"
                    checked={hideNonAsset}
                    onCheckedChange={setHideNonAsset}
                />
            </div>
            <div
                className="grid gap-4"
                style={{
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))'
                }}
            >
            </div>
            {/* Chart Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <Card className="bg-white dark:bg-gray-900 rounded-lg shadow">
                    <CardHeader className="pb-2">
                        <CardTitle>Asset Type Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col gap-3">
                            <Popover open={typePopoverOpen} onOpenChange={(open) => { setTypePopoverOpen(open); if (!open) setTypePopoverSummary(null); }}>
                                <div className="relative" ref={pieContainerRef}>
                                    <PopoverAnchor asChild>
                                        <span
                                            aria-hidden
                                            style={{
                                                position: 'absolute',
                                                top: popoverPosition ? `${popoverPosition.top}px` : '50%',
                                                left: popoverPosition ? `${popoverPosition.left}px` : '50%',
                                                width: 1,
                                                height: 1
                                            }}
                                        />
                                    </PopoverAnchor>
                                    <ResponsiveContainer width="100%" height={250}>
                                        <PieChart>
                                            <Pie
                                                data={filteredPieData}
                                                dataKey="value"
                                                nameKey="name"
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={55}
                                                outerRadius={85}
                                                paddingAngle={2}
                                                label
                                                onClick={handleSliceClick}
                                            >
                                                {filteredPieData.map((entry, idx) => (
                                                    <Cell
                                                        key={`cell-asset-type-${entry.typeId}`}
                                                        fill={entry.color}
                                                        stroke={activeTypeId === entry.typeId ? '#111827' : '#ffffff'}
                                                        strokeWidth={activeTypeId === entry.typeId ? 2 : 1}
                                                    />
                                                ))}
                                                <Label
                                                    position="center"
                                                    content={({ viewBox }) => {
                                                        const { cx, cy } = viewBox as { cx?: number; cy?: number };
                                                        if (cx === undefined || cy === undefined) return null;
                                                        return (
                                                            <text
                                                                x={cx}
                                                                y={cy}
                                                                textAnchor="middle"
                                                                dominantBaseline="middle"
                                                                className="fill-gray-800 dark:fill-gray-100 font-semibold"
                                                            >
                                                                {formatNumber(totalAssetClassification)}
                                                            </text>
                                                        );
                                                    }}
                                                />
                                            </Pie>
                                            <RechartsLegend content={renderAssetTypeLegend} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <PopoverContent className="w-56 text-sm bg-stone-100 dark:bg-stone-800 shadow-lg" side="bottom" align="center" sideOffset={8}>
                                    {typePopoverSummary ? (
                                        <div className="space-y-1">
                                            <div className="font-semibold">{typePopoverSummary.typeName}</div>
                                            <div className="flex justify-between"><span>Active</span><span>{formatNumber(typePopoverSummary.active)}</span></div>
                                            <div className="flex justify-between"><span>Disposed</span><span>{formatNumber(typePopoverSummary.disposed)}</span></div>
                                            <div className="flex justify-between border-t pt-1"><span>Total</span><span>{formatNumber(typePopoverSummary.total)}</span></div>
                                        </div>
                                    ) : (
                                        <div className="text-gray-500">Click a slice to see record status.</div>
                                    )}
                                </PopoverContent>
                            </Popover>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-white dark:bg-gray-900 rounded-lg shadow">
                    <CardHeader className="pb-2">
                        <CardTitle>Asset by Age</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center">
                        {totalAgeCount > 0 ? (
                            <>
                                <Popover open={agePopoverOpen} onOpenChange={(open) => { setAgePopoverOpen(open); if (!open) setAgePopoverSummary(null); }}>
                                    <div className="relative w-full" ref={ageContainerRef}>
                                        <PopoverAnchor asChild>
                                            <span
                                                aria-hidden
                                                style={{
                                                    position: 'absolute',
                                                    top: agePopoverPosition ? `${agePopoverPosition.top}px` : '50%',
                                                    left: agePopoverPosition ? `${agePopoverPosition.left}px` : '50%',
                                                    width: 1,
                                                    height: 1
                                                }}
                                            />
                                        </PopoverAnchor>
                                        <ResponsiveContainer width="100%" height={250}>
                                            <PieChart>
                                                <Pie data={filteredPieDataAge} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label onClick={handleAgeSliceClick}>
                                                    {filteredPieDataAge.map((entry, idx) => (
                                                        <Cell key={`cell-age-${idx}`} fill={entry.color} />
                                                    ))}
                                                </Pie>
                                                <Tooltip
                                                    contentStyle={{ background: isDark ? '#22223b' : '#fff', color: isDark ? '#f9fafb' : '#111827' }}
                                                    wrapperStyle={{ color: isDark ? '#f9fafb' : '#111827' }}
                                                    labelStyle={{ color: isDark ? '#f9fafb' : '#111827' }}
                                                    itemStyle={{ color: isDark ? '#f9fafb' : '#111827' }}
                                                />
                                                <RechartsLegend content={renderAgeLegend} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <PopoverContent className="w-64 text-sm bg-stone-100 dark:bg-stone-800 shadow-lg" side="bottom" align="center" sideOffset={8}>
                                        {agePopoverSummary ? (
                                            <div className="space-y-2">
                                                <div className="font-semibold">{agePopoverSummary.groupName}</div>
                                                <div className="space-y-1 max-h-48 overflow-auto pr-1">
                                                    {agePopoverSummary.types.map(t => (
                                                        <div key={t.name} className="flex justify-between">
                                                            <span>{t.name}</span>
                                                            <span>{formatNumber(t.value)}</span>
                                                        </div>
                                                    ))}
                                                    {agePopoverSummary.types.length === 0 && (
                                                        <div className="text-gray-500">No types found.</div>
                                                    )}
                                                </div>
                                                <div className="flex justify-between border-t pt-1 font-semibold">
                                                    <span>Total</span>
                                                    <span>{formatNumber(agePopoverSummary.total)}</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-gray-500">Click a slice to see type breakdown.</div>
                                        )}
                                    </PopoverContent>
                                </Popover>
                            </>
                        ) : (
                            <div className="text-gray-500">No age data available.</div>
                        )}
                    </CardContent>
                </Card>
                <Card className="bg-white dark:bg-gray-900 rounded-lg shadow">
                    <CardHeader className="pb-2">
                        <CardTitle>Asset by Cost Center</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Popover open={costCenterPopoverOpen} onOpenChange={(open) => { setCostCenterPopoverOpen(open); if (!open) setCostCenterPopoverSummary(null); }}>
                            <div className="relative" ref={costCenterContainerRef}>
                                <PopoverAnchor asChild>
                                    <span
                                        aria-hidden
                                        style={{
                                            position: 'absolute',
                                            top: costCenterPopoverPosition ? `${costCenterPopoverPosition.top}px` : '50%',
                                            left: costCenterPopoverPosition ? `${costCenterPopoverPosition.left}px` : '50%',
                                            width: 1,
                                            height: 1
                                        }}
                                    />
                                </PopoverAnchor>
                                <ResponsiveContainer width="100%" height={260}>
                                    <BarChart data={pieDataCostCenter} margin={{ top: 10, right: 10, left: 10, bottom: 30 }}>
                                        <XAxis
                                            dataKey="name"
                                            tickLine={false}
                                            axisLine={false}
                                            interval={0}
                                            height={40}
                                            tick={{ fill: '#111827', fontSize: 12 }}
                                            angle={-25}
                                            textAnchor="end"
                                        />
                                        <Bar
                                            dataKey="value"
                                            radius={[4, 4, 0, 0]}
                                            onClick={handleCostCenterSliceClick}
                                        >
                                            {pieDataCostCenter.map((entry) => (
                                                <Cell
                                                    key={`cell-cc-${entry.id}`}
                                                    fill={entry.color}
                                                    stroke={activeCostCenterId === entry.id ? '#111827' : entry.color}
                                                    strokeWidth={activeCostCenterId === entry.id ? 2 : 1}
                                                    cursor="pointer"
                                                />
                                            ))}
                                        </Bar>
                                        <Tooltip
                                            contentStyle={{ background: isDark ? '#1f2937' : '#ffffff', color: isDark ? '#f9fafb' : '#111827', borderColor: isDark ? '#4b5563' : '#e5e7eb' }}
                                            wrapperStyle={{ color: isDark ? '#f9fafb' : '#111827' }}
                                            labelStyle={{ color: isDark ? '#f9fafb' : '#111827' }}
                                            itemStyle={{ color: isDark ? '#f9fafb' : '#111827' }}
                                            cursor={{ fill: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}
                                            formatter={(value) => [formatNumber(Number(value)), 'Total']}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                            <PopoverContent className="w-64 text-sm bg-stone-100 dark:bg-stone-800 shadow-lg" side="bottom" align="center" sideOffset={8}>
                                {costCenterPopoverSummary ? (
                                    <div className="space-y-2">
                                        <div className="font-semibold">{costCenterPopoverSummary.costCenterName}</div>
                                        <div className="space-y-1 max-h-48 overflow-auto pr-1">
                                            {costCenterPopoverSummary.types.map((t) => (
                                                <div key={t.name} className="flex justify-between">
                                                    <span>{t.name}</span>
                                                    <span>{formatNumber(t.value)}</span>
                                                </div>
                                            ))}
                                            {costCenterPopoverSummary.types.length === 0 && (
                                                <div className="text-gray-500">No types found.</div>
                                            )}
                                        </div>
                                        <div className="flex justify-between border-t pt-1 font-semibold">
                                            <span>Total</span>
                                            <span>{formatNumber(costCenterPopoverSummary.total)}</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-gray-500">Click a bar to see type breakdown.</div>
                                )}
                            </PopoverContent>
                        </Popover>
                    </CardContent>
                </Card>
                <Card className="bg-white dark:bg-gray-900 rounded-lg shadow">
                    <CardHeader className="pb-2">
                        <CardTitle>Assets Purchased by Year</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Popover open={yearPopoverOpen} onOpenChange={(open) => { setYearPopoverOpen(open); if (!open) setYearPopoverSummary(null); }}>
                            <div className="relative" ref={yearContainerRef}>
                                <PopoverAnchor asChild>
                                    <span
                                        aria-hidden
                                        style={{
                                            position: 'absolute',
                                            top: yearPopoverPosition ? `${yearPopoverPosition.top}px` : '50%',
                                            left: yearPopoverPosition ? `${yearPopoverPosition.left}px` : '50%',
                                            width: 1,
                                            height: 1
                                        }}
                                    />
                                </PopoverAnchor>
                                <ChartContainer config={chartConfig} className="max-h-65 w-full">
                                    <BarChart data={chartDataStacked} height={260}>
                                        <CartesianGrid vertical={false} horizontal={false} />
                                        <XAxis dataKey="year" tickLine={false} tickMargin={10} axisLine={false} tickFormatter={(value) => String(value)} stroke={axisColor} />
                                        <ChartTooltip content={<ChartTooltipContent />} />
                                        <Legend wrapperStyle={{ color: legendTextColor }} />
                                        {allTypes.map((type, idx) => (
                                            <Bar
                                                key={type}
                                                dataKey={type}
                                                stackId="a"
                                                fill={`hsl(${(idx * 60) % 360}, 70%, 55%)`}
                                                name={type}
                                                onClick={handleYearBarClick}
                                                cursor="pointer"
                                            />
                                        ))}
                                    </BarChart>
                                </ChartContainer>
                            </div>
                            <PopoverContent className="w-64 text-sm bg-stone-100 dark:bg-stone-800 shadow-lg" side="bottom" align="center" sideOffset={8}>
                                {yearPopoverSummary ? (
                                    <div className="space-y-2">
                                        <div className="font-semibold">Year {yearPopoverSummary.year}</div>
                                        <div className="space-y-1 max-h-48 overflow-auto pr-1">
                                            {yearPopoverSummary.costCenters.map(cc => (
                                                <div key={cc.name} className="flex justify-between">
                                                    <span>{cc.name}</span>
                                                    <span>{formatNumber(cc.value)}</span>
                                                </div>
                                            ))}
                                            {yearPopoverSummary.costCenters.length === 0 && (
                                                <div className="text-gray-500">No cost centers found.</div>
                                            )}
                                        </div>
                                        <div className="flex justify-between border-t pt-1 font-semibold">
                                            <span>Total</span>
                                            <span>{formatNumber(yearPopoverSummary.total)}</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-gray-500">Click a bar to see cost center breakdown.</div>
                                )}
                            </PopoverContent>
                        </Popover>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default DashAsset;
