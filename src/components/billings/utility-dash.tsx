'use client';
import React, { useEffect, useState } from 'react';
import { authenticatedApi } from '@/config/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip as RechartTooltip, ResponsiveContainer, Legend, LabelList } from 'recharts';
import ExcelUtilityReport from './excel-utility-report';
import PrintingExcelReport from './excel-printing-report';
import { SingleSelect, type ComboboxOption } from '@/components/ui/combobox';

interface UtilityBill {
    util_id: number;
    account: {
        bill_id: number;
        bill_ac: string;
        provider: string;
        service: string;
        desc: string;
        beneficiary?: {
            id?: number;
            name?: string;
            logo?: string;
        };
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

type ChartPoint = { month: string; total: number; count: number; bw?: number; color?: number };

const chartPalettes = [
    { bar: '#ef4444', line: '#f59e0b' },
    { bar: '#2563eb', line: '#14b8a6' },
    { bar: '#16a34a', line: '#f97316' },
    { bar: '#9333ea', line: '#facc15' },
    { bar: '#0ea5e9', line: '#e11d48' },
    { bar: '#f472b6', line: '#22c55e' }
];

const getPalette = (index: number) => chartPalettes[index % chartPalettes.length];

const UtilityDash: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [selectedYear, setSelectedYear] = useState<string>('');
    const [yearOptions, setYearOptions] = useState<string[]>([]);
    const [serviceOptions, setServiceOptions] = useState<string[]>([]);
    const [serviceCharts, setServiceCharts] = useState<Record<string, ChartPoint[]>>({});
    const [selectedCostCenter, setSelectedCostCenter] = useState<string>('All');
    const [costCenterOptions, setCostCenterOptions] = useState<ComboboxOption[]>([]);
    const [beneficiaryLogos, setBeneficiaryLogos] = useState<Record<string, Array<{ name: string; logo?: string }>>>({});
    const [selectedBeneficiaries, setSelectedBeneficiaries] = useState<Record<string, string>>({});

    // Fetch service options and cost centers once on component mount
    useEffect(() => {
        const fetchFilterOptions = async () => {
            try {
                const costCenterRes = await authenticatedApi.get<CostCenterApiResponse>('/api/assets/costcenters');
                const costCenters: CostCenter[] = Array.isArray(costCenterRes.data.data) ? costCenterRes.data.data : [];
                const costCenterOptions = [
                    { value: 'All', label: 'All' },
                    ...costCenters.map(cc => ({ value: cc.id.toString(), label: cc.name })) as ComboboxOption[]
                ];
                setCostCenterOptions(costCenterOptions);
            } catch (err: any) {
                console.error('Error fetching filter options:', err);
                console.error('Error details:', err?.response?.data || err?.message);
                
                // Fallback: Set basic options if API calls fail
                console.log('Setting fallback options...');
                setCostCenterOptions([{ value: 'All', label: 'All' }]);
            }
        };
        fetchFilterOptions();
    }, []);

    // Fetch chart data when filters change
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                let apiUrl = '/api/bills/util';
                const params = new URLSearchParams();

                if (selectedCostCenter && selectedCostCenter !== 'All') {
                    params.append('costcenter', selectedCostCenter);
                }

                if (params.toString()) {
                    apiUrl += `?${params.toString()}`;
                }

                const res = await authenticatedApi.get<UtilityApiResponse>(apiUrl);
                const bills: UtilityBill[] = Array.isArray(res.data.data) ? res.data.data : [];

                // Build year options from fetched data
                const years = Array.from(new Set(bills.map(bill => new Date(bill.ubill_date).getFullYear().toString()))).sort();
                const yearOptions = ['All', ...years];
                const currentYear = new Date().getFullYear().toString();

                if (!selectedYear && yearOptions.includes(currentYear)) {
                    setSelectedYear(currentYear);
                } else if (!selectedYear && yearOptions.length) {
                    setSelectedYear(yearOptions[1] || 'All');
                }

                const yearMatch = (billYear: string) => selectedYear === 'All' || !selectedYear || billYear === selectedYear;
                const monthlyByService: Record<string, Record<string, { total: number; count: number; bw?: number; color?: number }>> = {};
                const beneficiaryMap: Record<string, Record<string, string | undefined>> = {};
                const servicesWithBeneficiaries = new Set<string>(['utilities', 'services', 'rental']);

                const ensureServiceMonth = (service: string, monthLabel: string, isPrinting: boolean) => {
                    if (!monthlyByService[service]) monthlyByService[service] = {};
                    if (!monthlyByService[service][monthLabel]) {
                        monthlyByService[service][monthLabel] = { total: 0, count: 0, bw: isPrinting ? 0 : undefined, color: isPrinting ? 0 : undefined };
                    }
                };

                bills.forEach(bill => {
                    const date = new Date(bill.ubill_date);
                    const year = date.getFullYear().toString();
                    if (!bill.ubill_gtotal || !yearMatch(year)) return;

                    const service = bill.account?.service || 'Unknown';
                    const serviceKey = service.toLowerCase();
                    const isPrinting = serviceKey === 'printing';
                    const beneficiaryName = bill.account?.beneficiary?.name;
                    const beneficiaryLogo = bill.account?.beneficiary?.logo;
                    if (servicesWithBeneficiaries.has(serviceKey) && beneficiaryName) {
                        if (!beneficiaryMap[serviceKey]) beneficiaryMap[serviceKey] = {};
                        beneficiaryMap[serviceKey][beneficiaryName] = beneficiaryLogo;
                    }
                    const selectedForService = selectedBeneficiaries[serviceKey] ?? 'All';
                    const monthLabel = date.toLocaleString('en-US', { month: 'short' }) + '-' + year.slice(-2);

                    ensureServiceMonth('All Services', monthLabel, false);

                    monthlyByService['All Services'][monthLabel].total += parseFloat(bill.ubill_gtotal);
                    monthlyByService['All Services'][monthLabel].count += 1;

                    const passesBeneficiaryFilter =
                        !servicesWithBeneficiaries.has(serviceKey) ||
                        selectedForService === 'All' ||
                        !beneficiaryName ||
                        beneficiaryName === selectedForService;
                    if (!passesBeneficiaryFilter) return;

                    ensureServiceMonth(service, monthLabel, isPrinting);

                    monthlyByService[service][monthLabel].total += parseFloat(bill.ubill_gtotal);
                    monthlyByService[service][monthLabel].count += 1;

                    if (isPrinting) {
                        const bw = parseFloat(bill.ubill_bw || '0');
                        const color = parseFloat(bill.ubill_color || '0');
                        monthlyByService[service][monthLabel].bw = (monthlyByService[service][monthLabel].bw || 0) + (Number.isFinite(bw) ? bw : 0);
                        monthlyByService[service][monthLabel].color = (monthlyByService[service][monthLabel].color || 0) + (Number.isFinite(color) ? color : 0);
                    }
                });

                const sortMonths = (monthMap: Record<string, { total: number; count: number; bw?: number; color?: number }>) => {
                    const monthsOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    return Object.keys(monthMap)
                        .sort((a, b) => {
                            const [aMonth, aYear] = a.split('-');
                            const [bMonth, bYear] = b.split('-');
                            return parseInt(aYear) !== parseInt(bYear)
                                ? parseInt(aYear) - parseInt(bYear)
                                : monthsOrder.indexOf(aMonth) - monthsOrder.indexOf(bMonth);
                        })
                        .map(month => ({
                            month,
                            total: monthMap[month].total,
                            count: monthMap[month].count,
                            bw: monthMap[month].bw,
                            color: monthMap[month].color
                        }));
                };

                const computedCharts: Record<string, ChartPoint[]> = {};
                Object.entries(monthlyByService).forEach(([service, monthMap]) => {
                    computedCharts[service] = sortMonths(monthMap);
                });

                const services = Object.keys(monthlyByService).filter(service => service !== 'All Services').sort();

                setServiceCharts(computedCharts);
                setServiceOptions(services);
                setYearOptions(yearOptions);
                const beneListByService: Record<string, Array<{ name: string; logo?: string }>> = {};
                Object.entries(beneficiaryMap).forEach(([svc, map]) => {
                    beneListByService[svc] = Object.entries(map).map(([name, logo]) => ({ name, logo }));
                });
                setBeneficiaryLogos(beneListByService);
                setSelectedBeneficiaries(prev => {
                    const next = { ...prev };
                    let changed = false;
                    Object.keys(beneListByService).forEach(svc => {
                        const existing = next[svc];
                        if (!existing) {
                            next[svc] = 'All';
                            changed = true;
                        }
                    });
                    // Ensure we drop selections for services no longer present
                    Object.keys(next).forEach(key => {
                        if (!beneListByService[key] && key !== 'all services') {
                            delete next[key];
                            changed = true;
                        }
                    });
                    return changed ? next : prev;
                });
            } catch (err) {
                console.error('Error fetching utility data:', err);
                setServiceCharts({});
                setServiceOptions([]);
                setYearOptions(['All']);
                if (!selectedYear) setSelectedYear('All');
            }
            setLoading(false);
        };
        fetchData();
    }, [selectedYear, selectedCostCenter, selectedBeneficiaries]);

    const renderChartCard = (service: string, paletteIndex: number) => {
        const data = serviceCharts[service] || [];
        const serviceKey = service.toLowerCase();
        const isPrinting = serviceKey === 'printing';
        const logos = beneficiaryLogos[serviceKey] || [];
        const selectedForService = selectedBeneficiaries[serviceKey] ?? 'All';
        const showSelect = (serviceKey === 'rental' || serviceKey === 'services') && logos.length > 0;
        const palette = getPalette(paletteIndex);
        const beneficiaryOptions: ComboboxOption[] = [
            { value: 'All', label: 'All' },
            ...logos
                .filter(b => !!b.name)
                .map(b => ({
                    value: b.name as string,
                    label: b.name as string,
                    render: (
                        <div className="flex items-center gap-2">
                            {b.logo && <img src={b.logo} alt={`${b.name} logo`} className="h-5 w-5 object-contain rounded" />}
                            <span>{b.name}</span>
                        </div>
                    )
                }))
        ];

        return (
            <div key={service} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2 gap-3">
                    <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{service}</span>
                        {logos.length > 0 && showSelect && (
                            <SingleSelect
                                className="min-w-45"
                                options={beneficiaryOptions}
                                value={selectedForService}
                                onValueChange={(val) => setSelectedBeneficiaries(prev => ({ ...prev, [serviceKey]: val || 'All' }))}
                                placeholder="Choose beneficiary"
                                searchPlaceholder="Search beneficiary..."
                                clearable
                            />
                        )}
                        {logos.length > 0 && !showSelect && (
                            <div className="flex flex-wrap items-center gap-1">
                                <button
                                    type="button"
                                    onClick={() => setSelectedBeneficiaries(prev => ({ ...prev, [serviceKey]: 'All' }))}
                                    className={`text-[11px] px-2 py-0.5 rounded border ${selectedForService === 'All' ? 'border-blue-500 text-blue-600' : 'border-gray-300 text-gray-600'}`}
                                >
                                    All
                                </button>
                                {logos.map((b) => {
                                    const isSelected = selectedForService === b.name;
                                    const fallback = (b.name || '?').slice(0, 2).toUpperCase();
                                    return (
                                        <button
                                            key={b.name}
                                            type="button"
                                            onClick={() => setSelectedBeneficiaries(prev => ({ ...prev, [serviceKey]: isSelected ? 'All' : b.name }))}
                                            title={b.name || 'Beneficiary'}
                                            aria-label={b.name || 'Beneficiary'}
                                            className={`h-6 w-6 rounded border flex items-center justify-center ${isSelected ? 'border-blue-500 ring-1 ring-blue-300' : 'border-gray-300'}`}
                                        >
                                            {b.logo ? (
                                                <img
                                                    src={b.logo}
                                                    alt={`${b.name || 'Beneficiary'} logo`}
                                                    title={b.name || 'Beneficiary'}
                                                    className="h-full w-full object-contain rounded"
                                                />
                                            ) : (
                                                <span className="text-[10px] text-gray-700">{fallback}</span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                    <span className="text-xs text-gray-500">{data.length ? `${data.length} months` : 'No data'}</span>
                </div>
                {data.length ? (
                    <ResponsiveContainer width="100%" height={260}>
                        <ComposedChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                            <XAxis dataKey="month" />
                            <YAxis
                                label={{ value: 'Total (RM)', angle: -90, position: 'insideLeft' }}
                                tickFormatter={value => value.toLocaleString('en-US')}
                            />
                            {!isPrinting && (
                                <YAxis
                                    yAxisId="right"
                                    orientation="right"
                                    label={{ value: 'Bill Count', angle: 90, position: 'insideRight' }}
                                    tickFormatter={value => value.toLocaleString('en-US')}
                                />
                            )}
                            {isPrinting && (
                                <YAxis
                                    yAxisId="right"
                                    orientation="right"
                                    label={{ value: 'Usage', angle: 90, position: 'insideRight' }}
                                    tickFormatter={value => value.toLocaleString('en-US')}
                                />
                            )}
                            <RechartTooltip
                                formatter={(value: number, name: string) => {
                                    if (name === 'Total Bills (RM)') {
                                        return `RM ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                                    }
                                    return value.toLocaleString('en-US');
                                }}
                            />
                            <Legend />
                            <Bar dataKey="total" fill={palette.bar} radius={[4, 4, 0, 0]} name="Total Bills (RM)">
                                <LabelList
                                    dataKey="total"
                                    position="top"
                                    formatter={(value: number) => `RM ${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
                                    className="fill-gray-700 text-[10px]"
                                />
                            </Bar>
                            {!isPrinting && (
                                <Line
                                    type="monotone"
                                    dataKey="count"
                                    stroke={palette.line}
                                    strokeWidth={3}
                                    dot={{ r: 3 }}
                                    name="Bill Count"
                                    yAxisId="right"
                                />
                            )}
                            {isPrinting && (
                                <>
                                    <Line
                                        type="monotone"
                                        dataKey="bw"
                                        stroke="#0ea5e9"
                                        strokeWidth={3}
                                        dot={{ r: 3 }}
                                        name="Black & White"
                                        yAxisId="right"
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="color"
                                        stroke="#f97316"
                                        strokeWidth={3}
                                        dot={{ r: 3 }}
                                        name="Color"
                                        yAxisId="right"
                                    />
                                </>
                            )}
                        </ComposedChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="text-sm text-gray-500">No data available.</div>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <Card className="mt-4 w-full">
                <CardHeader>
                    <CardTitle>Utility Bills by Service</CardTitle>
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
                            <span className="text-sm">Cost Center:</span>
                            <SingleSelect
                                className="min-w-55"
                                options={costCenterOptions}
                                value={selectedCostCenter}
                                onValueChange={(v) => setSelectedCostCenter(v || 'All')}
                                placeholder="Select cost center"
                                searchPlaceholder="Search cost center..."
                                clearable
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div>Loading...</div>
                    ) : (serviceOptions.length || (serviceCharts['All Services']?.length ?? 0)) ? (
                        <div className="space-y-6">
                            {renderChartCard('All Services', 0)}
                            {serviceOptions.filter(s => s.toLowerCase() !== 'telco').length > 0 && (
                            <div className="grid gap-6 md:grid-cols-2">
                                {serviceOptions
                                    .filter(s => s.toLowerCase() !== 'telco')
                                    .map((service, index) => renderChartCard(service, index + 1))}
                            </div>
                            )}
                        </div>
                    ) : (
                        <div>No data available.</div>
                    )}
                </CardContent>
            </Card>
            <ExcelUtilityReport />
            <PrintingExcelReport />
        </div>
    );
};

export default UtilityDash;
