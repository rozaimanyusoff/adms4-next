// Employee Dashboard for OrgEmp
import React, { useEffect, useState } from "react";
import { authenticatedApi } from "../../config/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    ChartLegend,
} from "@/components/ui/chart";
import {
    ComposedChart,
    XAxis,
    CartesianGrid,
    Bar,
    Line,
    PieChart,
    Pie,
    Cell,
    Tooltip as RechartsTooltip,
    ResponsiveContainer,
} from "recharts";
import type { ChartConfig } from "@/components/ui/chart";

interface Department { id: number; name: string; code: string; }
interface Position { id: number; name: string; }
interface Location { id: number; name: string; code: string; }
interface CostCenter { id: number; name: string; }
interface Employee {
    id: number;
    ramco_id: string;
    full_name: string;
    email: string;
    contact: string;
    gender: string;
    dob: string;
    avatar?: string | null;
    hire_date: string;
    resignation_date: string | null;
    employment_type: string;
    employment_status: string;
    grade: string;
    position?: Position;
    department?: Department;
    costcenter?: CostCenter;
    location?: Location;
}

const DashEmp: React.FC = () => {
    const [data, setData] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [active, setActive] = useState(0);
    const [resigned, setResigned] = useState(0);
    const [latest, setLatest] = useState<Employee[]>([]);
    const [isDark, setIsDark] = useState(false);
    const [selectedYear, setSelectedYear] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await authenticatedApi.get<any>("/api/assets/employees");
                const employees: Employee[] = Array.isArray(res.data.data) ? res.data.data : [];
                setData(employees);
                setTotal(employees.length);
                setActive(employees.filter(e => e.employment_status === "active").length);
                setResigned(employees.filter(e => e.employment_status !== "active").length);
                setLatest(employees.slice(-5).reverse());
            } catch {
                setData([]); setTotal(0); setActive(0); setResigned(0); setLatest([]);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // Detect dark mode for chart styling
    useEffect(() => {
        const match = window.matchMedia('(prefers-color-scheme: dark)');
        setIsDark(match.matches);
        const handler = (e: MediaQueryListEvent) => setIsDark(e.matches);
        match.addEventListener('change', handler);
        return () => match.removeEventListener('change', handler);
    }, []);

    // Combo chart: Hired vs Resigned by Year
    const hiresByYear: Record<string, number> = {};
    const resignsByYear: Record<string, number> = {};
    data.forEach(emp => {
        if (emp.hire_date) {
            const y = String(new Date(emp.hire_date).getFullYear());
            if (!isNaN(Number(y))) hiresByYear[y] = (hiresByYear[y] || 0) + 1;
        }
        if (emp.resignation_date) {
            const yr = String(new Date(emp.resignation_date).getFullYear());
            if (!isNaN(Number(yr))) resignsByYear[yr] = (resignsByYear[yr] || 0) + 1;
        }
    });
    const allYears = Array.from(new Set([...Object.keys(hiresByYear), ...Object.keys(resignsByYear)])).sort((a, b) => Number(a) - Number(b));
    const comboData = allYears.map(y => ({
        year: y,
        Hired: hiresByYear[y] || 0,
        Resigned: resignsByYear[y] || 0,
    }));
    const axisColor = isDark ? '#e5e7eb' : '#374151';
    const gridColor = isDark ? '#374151' : '#e5e7eb';

    const comboConfig = {
        Hired: { label: 'Hired', color: '#2563eb' },
        Resigned: { label: 'Resigned', color: '#ef4444' },
    } satisfies ChartConfig;

    // Department breakdown by year for hired/resigned
    const yearDept: Record<string, Record<string, { hired: number; resigned: number }>> = {};
    data.forEach(emp => {
        const dept = emp.department?.name || 'Unknown';
        if (emp.hire_date) {
            const y = String(new Date(emp.hire_date).getFullYear());
            if (!isNaN(Number(y))) {
                if (!yearDept[y]) yearDept[y] = {};
                if (!yearDept[y][dept]) yearDept[y][dept] = { hired: 0, resigned: 0 };
                yearDept[y][dept].hired += 1;
            }
        }
        if (emp.resignation_date) {
            const y = String(new Date(emp.resignation_date).getFullYear());
            if (!isNaN(Number(y))) {
                if (!yearDept[y]) yearDept[y] = {};
                if (!yearDept[y][dept]) yearDept[y][dept] = { hired: 0, resigned: 0 };
                yearDept[y][dept].resigned += 1;
            }
        }
    });

    // Donut charts data
    const pieColors = [
        '#2563eb', '#60a5fa', '#fbbf24', '#f87171', '#34d399', '#a78bfa', '#f472b6', '#facc15', '#4ade80', '#818cf8', '#fb7185', '#22d3ee', '#ef4444', '#10b981', '#8b5cf6'
    ];

    // Generic counter by key extractor
    const countBy = (items: Employee[], keyFn: (e: Employee) => string) => {
        const map: Record<string, number> = {};
        items.forEach(e => {
            const key = keyFn(e) || 'Unknown';
            map[key] = (map[key] || 0) + 1;
        });
        return Object.entries(map).map(([name, value]) => ({ name, value }));
    };

    // Active employees only for donut charts
    const activeEmployees = data.filter(e => (e.employment_status || '').toLowerCase() === 'active');

    const donutCostCenter = countBy(activeEmployees, e => e.costcenter?.name || 'Unknown');
    const donutDepartment = countBy(activeEmployees, e => e.department?.name || 'Unknown');
    const donutPosition = countBy(activeEmployees, e => e.position?.name || 'Unknown');
    const donutLocation = countBy(activeEmployees, e => e.location?.name || 'Unknown');
    const donutGender = countBy(activeEmployees, e => {
        const g = (e.gender || '').trim().toLowerCase();
        if (g === 'm' || g === 'male') return 'Male';
        if (g === 'f' || g === 'female') return 'Female';
        return 'Unknown';
    });

    // Service length bins for active employees
    const currentYear = new Date().getFullYear();
    const svcGroups = [
        { label: '<5 years', min: 0, max: 4 },
        { label: '5-10 years', min: 5, max: 9 },
        { label: '10-15 years', min: 10, max: 14 },
        { label: '>15 years', min: 15, max: 200 },
    ];
    const svcCounts: Record<string, number> = {};
    activeEmployees.forEach(e => {
        if (!e.hire_date) return;
        const y = new Date(e.hire_date).getFullYear();
        if (isNaN(y)) return;
        const years = currentYear - y;
        const g = svcGroups.find(g => years >= g.min && years <= g.max);
        if (g) svcCounts[g.label] = (svcCounts[g.label] || 0) + 1;
    });
    const donutService = svcGroups.map(g => ({ name: g.label, value: svcCounts[g.label] || 0 }));

    // Reusable legend+donut with filtering
    type DonutDatum = { name: string; value: number };
    const DonutTooltip: React.FC<{ active?: boolean; payload?: any[] }> = ({ active, payload }) => {
        if (!active || !payload || !payload.length) return null;
        const item = payload[0];
        return (
            <div
                className={`rounded-md border px-2 py-1 text-xs shadow ${isDark ? 'bg-gray-900 border-gray-700 text-gray-100' : 'bg-white border-gray-200 text-gray-800'}`}
            >
                <div className="font-medium">{item.name}</div>
                <div className="font-mono">{item.value?.toLocaleString()}</div>
            </div>
        );
    };

    const DonutWithLegend: React.FC<{
        data: DonutDatum[];
        title?: string;
        colorFor?: (name: string) => string | undefined;
    }> = ({ data, colorFor }) => {
        const [hidden, setHidden] = useState<Set<string>>(new Set());
        const toggle = (name: string) => setHidden(prev => {
            const next = new Set(prev);
            if (next.has(name)) next.delete(name); else next.add(name);
            return next;
        });
        const filtered = data.filter(d => !hidden.has(d.name));
        const colorMap = new Map<string, string>();
        data.forEach((d, idx) => {
            const override = colorFor?.(d.name);
            colorMap.set(d.name, override || pieColors[idx % pieColors.length]);
        });

        return (
            <div className="flex w-full gap-4">
                <div className="w-1/2 max-h-[220px] overflow-auto pr-2">
                    <ul className="space-y-1 text-xs">
                        {data.map(d => (
                            <li key={d.name}>
                                <button
                                    type="button"
                                    className={`flex w-full items-center gap-2 text-left text-xs ${hidden.has(d.name) ? 'opacity-50' : ''}`}
                                    onClick={() => toggle(d.name)}
                                    title={d.name}
                                >
                                    <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: colorMap.get(d.name) }} />
                                    <span className={`truncate flex-1 ${hidden.has(d.name) ? 'line-through' : ''}`}>{d.name}</span>
                                    <span className="font-mono tabular-nums">{d.value}</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="w-1/2">
                    <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                            <Pie
                                data={filtered}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                innerRadius={50}
                                outerRadius={80}
                                label={false}
                                labelLine={false}
                            >
                                {filtered.map((entry) => (
                                    <Cell key={entry.name} fill={colorMap.get(entry.name) || '#60a5fa'} />
                                ))}
                            </Pie>
                            <RechartsTooltip content={<DonutTooltip />} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
        );
    };

    return (
        <div className="mt-4 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader><CardTitle>Total Employees</CardTitle></CardHeader>
                    <CardContent><div className="text-3xl font-bold">{total}</div></CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Active</CardTitle></CardHeader>
                    <CardContent><div className="text-3xl font-bold text-green-600">{active}</div></CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Resigned</CardTitle></CardHeader>
                    <CardContent><div className="text-3xl font-bold text-red-500">{resigned}</div></CardContent>
                </Card>
            </div>
            {/* Combo Chart: Hired vs Resigned by Year */}
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-4">
                <h3 className="text-lg font-semibold mb-4">Hired vs Resigned by Year</h3>
                <div className="relative">
                    <ChartContainer config={comboConfig} className="max-h-[260px] w-full">
                        <ComposedChart data={comboData} height={260}>
                            <CartesianGrid vertical={false} horizontal={false} />
                            <XAxis dataKey="year" tickLine={false} tickMargin={10} axisLine={false} tickFormatter={(v) => String(v)} stroke={axisColor} />
                            {/* Hover tooltip removed; using click-based panel */}
                            <Bar
                                dataKey="Hired"
                                fill="#2563eb"
                                name="Hired"
                                radius={[4,4,0,0]}
                                onClick={(_, index) => {
                                    const y = comboData[index]?.year;
                                    if (y) setSelectedYear(y === selectedYear ? null : y);
                                }}
                                className="cursor-pointer"
                            />
                            <Line type="monotone" dataKey="Resigned" stroke="#ef4444" strokeWidth={2} dot={false} name="Resigned" />
                            <ChartLegend />
                        </ComposedChart>
                    </ChartContainer>
                    {selectedYear && (
                        <div
                            className={`absolute top-3 left-3 z-10 rounded-2xl border shadow-2xl backdrop-blur-xl dark:bg-gray-600/50 dark:border-white/10 dark:text-gray-100 bg-gray-200/50 border-black/10 text-dark w-[min(560px,95%)] p-4 text-sm`}
                        >
                            <div className="flex items-center justify-between gap-6 mb-3">
                                <div className="font-semibold text-base">{selectedYear}</div>
                                <button className="text-xs px-2 py-1 bg-red-500 text-white rounded hover:bg-black/5 dark:hover:bg-white/10" onClick={() => setSelectedYear(null)}>Close</button>
                            </div>
                            <div className="flex items-center gap-6 mb-3">
                                <div className="flex items-center gap-2">
                                    <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[#2563eb]" />
                                    <span>Hired</span>
                                    <span className="font-mono ml-2">{hiresByYear[selectedYear] || 0}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[#ef4444]" />
                                    <span>Resigned</span>
                                    <span className="font-mono ml-2">{resignsByYear[selectedYear] || 0}</span>
                                </div>
                            </div>
                            <div className="mt-2 text-xs">
                                <div className="font-semibold mb-2">By Department</div>
                                <div className="pr-2">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="text-muted-foreground border-b border-white/20 dark:border-white/10">
                                                <th className="text-left font-normal py-1 text-white-dark">Department</th>
                                                <th className="text-right font-normal py-1 text-white-dark">Hired</th>
                                                <th className="text-right font-normal py-1 text-white-dark">Resigned</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {Object.entries(yearDept[selectedYear] || {}).map(([dept, counts]) => (
                                                <tr key={dept} className="border-b border-white/10 last:border-0">
                                                    <td className="py-1 pr-2 truncate max-w-[320px]">{dept}</td>
                                                    <td className="py-1 text-right font-mono">{counts.hired || 0}</td>
                                                    <td className="py-1 text-right font-mono">{counts.resigned || 0}</td>
                                                </tr>
                                            ))}
                                            {Object.keys(yearDept[selectedYear] || {}).length === 0 && (
                                                <tr><td colSpan={3} className="text-center text-muted-foreground py-2">No data</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Donut Charts: Org breakdowns */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-6">
                <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-4">
                    <h3 className="text-lg font-semibold mb-4 text-center">By Cost Center</h3>
                    <DonutWithLegend data={donutCostCenter} />
                </div>

                <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-4">
                    <h3 className="text-lg font-semibold mb-4 text-center">By Department</h3>
                    <DonutWithLegend data={donutDepartment} />
                </div>

                <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-4">
                    <h3 className="text-lg font-semibold mb-4 text-center">By Position</h3>
                    <DonutWithLegend data={donutPosition} />
                </div>

                <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-4">
                    <h3 className="text-lg font-semibold mb-4 text-center">By Location</h3>
                    <DonutWithLegend data={donutLocation} />
                </div>

                <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-4">
                    <h3 className="text-lg font-semibold mb-4 text-center">Service Length (Active)</h3>
                    <DonutWithLegend data={donutService} />
                </div>
                <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-4">
                    <h3 className="text-lg font-semibold mb-4 text-center">By Gender</h3>
                    <DonutWithLegend
                        data={donutGender}
                        colorFor={(name) => {
                            if (name === 'Female') return '#f472b6'; // pink-400
                            if (name === 'Male') return '#3b82f6'; // blue-500
                            return undefined;
                        }}
                    />
                </div>
            </div>

            {/* Latest Employees */}
            <div className="mt-8">
                <h3 className="text-lg font-semibold mb-2">Latest Employees</h3>
                <div className="overflow-x-auto">
                    <table className="min-w-full bg-white dark:bg-gray-900 border rounded border-gray-200 dark:border-gray-700">
                        <thead>
                            <tr>
                                <th className="px-3 py-2 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">#</th>
                                <th className="px-3 py-2 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">Name</th>
                                <th className="px-3 py-2 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">Email</th>
                                <th className="px-3 py-2 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">Status</th>
                                <th className="px-3 py-2 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">Hire Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {latest.map((emp, idx) => (
                                <tr key={emp.id} className="hover:bg-gray-100 dark:hover:bg-gray-800">
                                    <td className="px-3 py-2 border border-gray-200 dark:border-gray-700">{idx + 1}</td>
                                    <td className="px-3 py-2 border border-gray-200 dark:border-gray-700">{emp.full_name}</td>
                                    <td className="px-3 py-2 border border-gray-200 dark:border-gray-700">{emp.email}</td>
                                    <td className="px-3 py-2 border border-gray-200 dark:border-gray-700">{emp.employment_status}</td>
                                    <td className="px-3 py-2 border border-gray-200 dark:border-gray-700">{emp.hire_date ? new Date(emp.hire_date).toLocaleDateString('en-GB') : '-'}</td>
                                </tr>
                            ))}
                            {latest.length === 0 && (
                                <tr><td colSpan={5} className="text-center py-4 text-gray-400 dark:text-gray-500">No data</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default DashEmp;
