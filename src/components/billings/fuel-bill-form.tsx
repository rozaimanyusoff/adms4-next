import React, { useEffect, useState } from 'react';
import { authenticatedApi } from '@/config/api';
import { Loader2, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Asset {
    asset_id: number;
    register_number: string;
    fuel_type: string;
    costcenter?: CostCenter | null;
    district?: District | null;
}

interface CostCenter {
    id: number;
    name: string;
}

interface District {
    id: number;
    code: string;
}

interface FleetCard {
    id: number;
    card_no: string;
}

interface FuelDetail {
    s_id: number;
    stmt_id: number;
    asset: Asset;
    card_no?: string;
    card_id?: string;
    category?: string;
    stmt_date: string;
    start_odo: number;
    end_odo: number;
    total_km: number;
    total_litre: string;
    amount: string;
    fleetcard?: FleetCard;
}

interface FuelBillDetail {
    stmt_id: number;
    stmt_no: string;
    stmt_date: string;
    stmt_issuer: string;
    stmt_ron95: string;
    stmt_ron97: string;
    stmt_diesel: string;
    bill_payment: string;
    stmt_count: number;
    stmt_litre: string;
    stmt_total_odo: number;
    stmt_stotal: string;
    stmt_tax: string;
    stmt_rounding: string;
    stmt_disc: string;
    stmt_total: string;
    stmt_entry: string;
    details: FuelDetail[];
    fuel_issuer?: { fuel_id: number; issuer: string };
    issuer?: string;
}

interface FuelMtnDetailProps {
    stmtId: number;
}

const FuelMtnDetail: React.FC<FuelMtnDetailProps> = ({ stmtId }) => {
    // Save handler for form submission
    const handleSave = async () => {
        const payload = buildFormPayload();
        try {
            // POST for create, PUT for update
            if (!stmtId || stmtId === 0) {
                await authenticatedApi.post('/api/bills/fuel', payload);
                toast.success('Fuel statement created successfully.');
            } else {
                await authenticatedApi.put(`/api/bills/fuel/${stmtId}`, payload);
                toast.success('Fuel statement updated successfully.');
            }
            setTimeout(() => {
                if (window.opener && typeof window.opener.reloadFuelBillGrid === 'function') {
                    window.opener.reloadFuelBillGrid();
                }
                window.close();
            }, 1000);
        } catch (err: any) {
            toast.error('Failed to save fuel statement.');
        }
    };
    // ...existing state declarations...
    // Summarize amount by cost center

    const [data, setData] = useState<FuelBillDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editableDetails, setEditableDetails] = useState<FuelDetail[]>([]);
    const [search, setSearch] = useState('');

    // Split cost center summary by category (project, staffcost)
    const costCenterSummary = React.useMemo(() => {
        const summary: { [key: string]: number } = {};
        editableDetails.forEach(detail => {
            const ccName = detail.asset?.costcenter?.name || 'Unknown';
            const category = detail.category || 'project';
            // Split by cost center and category
            const key = category === 'staffcost' ? `${ccName} (Staff cost)` : ccName;
            const amt = parseFloat(detail.amount) || 0;
            if (!summary[key]) summary[key] = 0;
            summary[key] += amt;
        });
        return summary;
    }, [editableDetails]);

    // Helper to build form payload for API submission
    const buildFormPayload = () => {
        const petrolAmount = editableDetails
            .filter(d => d.asset?.fuel_type?.toLowerCase() === 'petrol')
            .reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);
        const dieselAmount = editableDetails
            .filter(d => d.asset?.fuel_type?.toLowerCase() === 'diesel')
            .reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);
        const totalKM = editableDetails.reduce((sum, d) => sum + (Number(d.total_km) || 0), 0);
        const totalLitre = editableDetails.reduce((sum, d) => sum + (parseFloat(d.total_litre) || 0), 0);

        // Helper for default value formatting
        const fmtAmount = (val: any) => {
            const num = parseFloat(val);
            return isNaN(num) ? '0.00' : num.toFixed(2);
        };
        const fmtNum = (val: any) => {
            const num = Number(val);
            return isNaN(num) ? 0 : num;
        };

        return {
            stmt_no: header.stmt_no,
            stmt_date: header.stmt_date,
            stmt_litre: fmtAmount(totalLitre),
            stmt_stotal: fmtAmount(summary.stmt_stotal),
            stmt_disc: fmtAmount(summary.stmt_disc),
            stmt_total: fmtAmount(summary.stmt_total),
            stmt_issuer: selectedIssuer,
            petrol_amount: fmtAmount(petrolAmount),
            diesel_amount: fmtAmount(dieselAmount),
            stmt_ron95: fmtAmount(summary.stmt_ron95),
            stmt_ron97: fmtAmount(summary.stmt_ron97),
            stmt_diesel: fmtAmount(summary.stmt_diesel),
            stmt_count: editableDetails.length,
            stmt_total_km: fmtNum(totalKM),
            details: editableDetails.map(detail => {
                const asset = detail.asset || {};
                const costcenter: CostCenter | null = asset.costcenter || null;
                const totalKM = fmtNum(detail.total_km);
                const litre = fmtNum(detail.total_litre);
                return {
                    asset_id: asset.asset_id,
                    stmt_date: header.stmt_date,
                    card_id: detail.card_id || '',
                    costcenter_id: costcenter ? costcenter.id : null,
                    category: detail.category || 'project',
                    start_odo: fmtNum(detail.start_odo),
                    end_odo: fmtNum(detail.end_odo),
                    total_km: totalKM,
                    total_litre: litre,
                    efficiency: litre > 0 ? fmtAmount(totalKM / litre) : '0.00',
                    amount: fmtAmount(detail.amount)
                };
            })
        };
    };

    // Add state for summary fields with default values for RON95, RON97, Diesel
    const [summary, setSummary] = useState({
        stmt_stotal: '',
        stmt_disc: '',
        stmt_tax: '',
        stmt_rounding: '',
        stmt_total: '',
        stmt_ron95: '2.05',
        stmt_ron97: '3.18',
        stmt_diesel: '2.88',
    });

    // Auto-calculate subtotal and total from details and discount
    useEffect(() => {
        const sumAmount = editableDetails.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);
        const discount = parseFloat(summary.stmt_disc) || 0;
        setSummary(prev => ({
            ...prev,
            stmt_stotal: sumAmount.toFixed(2),
            stmt_total: (sumAmount - discount).toFixed(2),
        }));
    }, [editableDetails, summary.stmt_disc]);

    // State for issuer select
    const [issuers, setIssuers] = useState<{ fuel_id: number; f_issuer: string; f_imgpath: string; image2: string }[]>([]);
    const [selectedIssuer, setSelectedIssuer] = useState<string>('');

    // State for header fields
    const [header, setHeader] = useState({
        stmt_no: '',
        stmt_date: '',
        stmt_litre: '',
    });

    // Add state for loadingDetails
    const [loadingDetails, setLoadingDetails] = useState(false);

    useEffect(() => {
        setLoading(true);
        setError(null);
        // Fetch issuers
        authenticatedApi.get<{ data: { fuel_id: number; f_issuer: string; f_imgpath: string; image2: string }[] }>(`/api/bills/fuel/issuer`)
            .then(res => {
                setIssuers(res.data.data);
            });
        // Only fetch bill detail if stmtId is a valid positive number
        if (stmtId && stmtId > 0) {
            authenticatedApi.get<{ data: FuelBillDetail }>(`/api/bills/fuel/${stmtId}`)
                .then(res => {
                    setData(res.data.data);
                    setEditableDetails(res.data.data.details.map(d => ({
                        ...d,
                        card_id: d.fleetcard ? String(d.fleetcard.id) : '',
                        card_no: d.fleetcard?.card_no ?? d.card_no ?? '',
                    })));
                    setSummary({
                        stmt_stotal: res.data.data.stmt_stotal || '',
                        stmt_disc: res.data.data.stmt_disc || '',
                        stmt_tax: res.data.data.stmt_tax || '',
                        stmt_rounding: res.data.data.stmt_rounding || '',
                        stmt_total: res.data.data.stmt_total || '',
                        stmt_ron95: res.data.data.stmt_ron95 || '2.05',
                        stmt_ron97: res.data.data.stmt_ron97 || '3.18',
                        stmt_diesel: res.data.data.stmt_diesel || '2.88',
                    });
                    setHeader({
                        stmt_no: res.data.data.stmt_no || '',
                        stmt_date: res.data.data.stmt_date ? res.data.data.stmt_date.slice(0, 10) : '',
                        stmt_litre: res.data.data.stmt_litre || '',
                    });
                    setSelectedIssuer(res.data.data.fuel_issuer?.fuel_id ? String(res.data.data.fuel_issuer.fuel_id) : '');
                    setLoading(false);
                })
                .catch(() => {
                    setError('Failed to load bill details.');
                    setLoading(false);
                });
        } else {
            // Create mode: clear form and details
            setData(null);
            setEditableDetails([]);
            setSummary({
                stmt_stotal: '',
                stmt_disc: '',
                stmt_tax: '',
                stmt_rounding: '',
                stmt_total: '',
                stmt_ron95: '2.05',
                stmt_ron97: '3.18',
                stmt_diesel: '2.88',
            });
            setHeader({
                stmt_no: '',
                stmt_date: '',
                stmt_litre: '',
            });
            setSelectedIssuer('');
            setLoading(false);
        }
    }, [stmtId]);

    const handleDetailChange = (idx: number, field: keyof FuelDetail, value: string | number) => {
        setEditableDetails(prev => prev.map((detail, i) => {
            if (i !== idx) return detail;
            let updated = { ...detail, [field]: value };
            if (field === 'start_odo' || field === 'end_odo') {
                const start = field === 'start_odo' ? Number(value) : Number(updated.start_odo);
                const end = field === 'end_odo' ? Number(value) : Number(updated.end_odo);
                updated.total_km = end - start;
            }
            return updated;
        }));
    };

    const handleSummaryChange = (field: keyof typeof summary, value: string) => {
        setSummary(prev => ({ ...prev, [field]: value }));
    };

    const handleHeaderChange = (field: keyof typeof header, value: string) => {
        setHeader(prev => ({ ...prev, [field]: value }));
    };

    // Helper for numeric input restriction
    const handleNumericInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
        const allowed = [
            'Backspace', 'Tab', 'ArrowLeft', 'ArrowRight', 'Delete', 'Home', 'End', '.', '-', // allow dot and minus for floats/negatives
        ];
        if (
            !/^[0-9.-]$/.test(e.key) &&
            !allowed.includes(e.key)
        ) {
            e.preventDefault();
        }
    };

    // Filtered details based on asset search
    const filteredDetails = editableDetails.filter(detail =>
        detail.asset?.register_number?.toLowerCase().includes(search.toLowerCase())
    );

    const handleIssuerChange = async (fuelId: string) => {
        setSelectedIssuer(fuelId);
        // Only in create mode (stmtId falsy or 0)
        if (!stmtId || stmtId === 0) {
            setLoadingDetails(true);
            try {
                const res = await authenticatedApi.get(`/api/bills/fleet/${fuelId}/issuer`);
                let items = [];
                if (res.data && typeof res.data === 'object' && 'data' in res.data && Array.isArray((res.data as any).data)) {
                    items = (res.data as any).data;
                } else if (Array.isArray(res.data)) {
                    items = res.data;
                }
                const details = items.map((item: any) => ({
                    s_id: item.id || item.fleetcard?.id || 0,
                    stmt_id: 0,
                    asset: {
                        asset_id: item.asset?.asset_id || item.asset?.id || 0,
                        register_number: item.asset?.register_number || '',
                        fuel_type: item.asset?.fuel_type || '',
                        costcenter: item.asset?.costcenter || null,
                        district: item.asset?.district || null,
                    },
                    card_no: item.fleetcard?.card_no || '',
                    card_id: item.fleetcard?.id || '',
                    category: item.category || '',
                    stmt_date: item.reg_date ? item.reg_date.slice(0, 10) : '',
                    start_odo: item.start_odo || 0,
                    end_odo: item.end_odo || 0,
                    total_km: item.total_km || 0,
                    total_litre: item.total_litre || '',
                    amount: item.amount || '',
                }));
                setEditableDetails(details);
            } catch (err) {
                toast.error('Failed to load asset details for issuer.');
                setEditableDetails([]);
            } finally {
                setLoadingDetails(false);
            }
        }
    };

    if (loading) return <div className="p-4">Loading...</div>;
    // Only show No data found if in edit mode and no data
    if ((stmtId && stmtId > 0) && !data) return <div className="p-4">No data found.</div>;

    return (
        <div className="w-full min-h-screen bg-gray-50 dark:bg-gray-800">
            <nav className="w-full bg-white dark:bg-gray-900 shadow-sm mb-6">
                <div className="max-w-6xl mx-auto px-4 py-4 flex justify-center items-center">
                    <h1 className="text-2xl font-bold text-center text-gray-800 dark:text-gray-100">Fuel Consumption Billing Form</h1>
                </div>
            </nav>
            <div className="flex gap-6 px-6 mx-auto">
                <div className="pt-4 w-full space-y-6">
                    <div className="border rounded p-4 bg-white dark:bg-gray-900 shadow-sm">
                        <h3 className="text-lg font-semibold mb-2">Statement Info</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            <div className="flex flex-col">
                                <span className="font-medium mb-1">Issuer</span>
                                <Select value={selectedIssuer} onValueChange={handleIssuerChange}>
                                    <SelectTrigger className="w-full bg-gray-100 border-0 rounded-none">
                                        <SelectValue placeholder="Select Issuer" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectGroup>
                                            <SelectLabel>Issuer</SelectLabel>
                                            {issuers.map(issuer => (
                                                <SelectItem key={issuer.fuel_id} value={String(issuer.fuel_id)}>
                                                    {issuer.f_issuer}
                                                </SelectItem>
                                            ))}
                                        </SelectGroup>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex flex-col">
                                <span className="font-medium mb-1">Statement No</span>
                                <Input
                                    type="text"
                                    value={header.stmt_no}
                                    onChange={e => handleHeaderChange('stmt_no', e.target.value)}
                                    className="w-full text-right border-0 rounded-none bg-gray-100"
                                />
                            </div>

                            <div className="flex flex-col">
                                <span className="font-medium mb-1">Statement Date</span>
                                <Input
                                    type="date"
                                    value={header.stmt_date}
                                    onChange={e => handleHeaderChange('stmt_date', e.target.value)}
                                    className="w-full text-right border-0 rounded-none bg-gray-100"
                                />
                            </div>
                            <div className="flex flex-col">
                                <span className="font-medium mb-1">Total Litre</span>
                                <Input
                                    type="text"
                                    value={editableDetails.reduce((sum, d) => sum + (parseFloat(d.total_litre) || 0), 0).toFixed(2)}
                                    readOnly
                                    className="w-full text-right border-0 rounded-none bg-gray-100"
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between gap-4 mt-4">
                            <div className="flex-1">
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-4">
                                    <div className="flex flex-col">
                                        <span className="font-medium mb-1">Subtotal</span>
                                        <Input
                                            type="text"
                                            value={summary.stmt_stotal !== undefined && summary.stmt_stotal !== null && summary.stmt_stotal !== '' && !isNaN(Number(summary.stmt_stotal)) ? Number(summary.stmt_stotal).toFixed(2) : '0.00'}
                                            readOnly
                                            className="w-full text-right border-0 rounded-none bg-gray-100"
                                        />
                                    </div>

                                    <div className="flex flex-col">
                                        <span className="font-medium mb-1">Discount/Adj.</span>
                                        <Input
                                            type="text"
                                            value={summary.stmt_disc !== undefined && summary.stmt_disc !== null && summary.stmt_disc !== '' && !isNaN(Number(summary.stmt_disc)) ? Number(summary.stmt_disc).toFixed(2) : '0.00'}
                                            onKeyDown={handleNumericInput}
                                            onChange={e => handleSummaryChange('stmt_disc', e.target.value.replace(/[^0-9.-]/g, ''))}
                                            className="w-full text-right border-0 rounded-none bg-gray-100"
                                        />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-medium mb-1">Total</span>
                                        <Input
                                            type="text"
                                            value={summary.stmt_total !== undefined && summary.stmt_total !== null && summary.stmt_total !== '' && !isNaN(Number(summary.stmt_total)) ? Number(summary.stmt_total).toFixed(2) : '0.00'}
                                            readOnly
                                            className="w-full text-right border-0 rounded-none bg-gray-100"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-2">
                                    <div className="flex flex-col">
                                        <span className="font-medium mb-1">Petrol Amount</span>
                                        <Input
                                            type="text"
                                            value={(() => {
                                                return editableDetails
                                                    .filter(d => d.asset?.fuel_type?.toLowerCase() === 'petrol')
                                                    .reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0)
                                                    .toFixed(2);
                                            })()}
                                            readOnly
                                            className="w-full text-right border-0 rounded-none bg-gray-100"
                                        />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-medium mb-1">Diesel Amount</span>
                                        <Input
                                            type="text"
                                            value={(() => {
                                                return editableDetails
                                                    .filter(d => d.asset?.fuel_type?.toLowerCase() === 'diesel')
                                                    .reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0)
                                                    .toFixed(2);
                                            })()}
                                            readOnly
                                            className="w-full text-right border-0 rounded-none bg-gray-100"
                                        />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-medium mb-1">Total KM</span>
                                        <Input
                                            type="text"
                                            value={editableDetails.reduce((sum, d) => sum + (Number(d.total_km) || 0), 0)}
                                            readOnly
                                            className="w-full text-right border-0 rounded-none bg-gray-100"
                                        />
                                    </div>
                                </div>
                            </div>
                            {/* Stack for RON95, RON97, Diesel */}
                            <div className="flex-col space-y-2">
                                <div className="flex items-center gap-2">
                                    <label className="text-xs min-w-[90px]">RON95 (RM/Litre)</label>
                                    <Input
                                        type="text"
                                        value={summary.stmt_ron95 !== undefined && summary.stmt_ron95 !== null && summary.stmt_ron95 !== '' && !isNaN(Number(summary.stmt_ron95)) ? summary.stmt_ron95 : ''}
                                        onChange={e => handleSummaryChange('stmt_ron95', e.target.value.replace(/[^0-9.-]/g, ''))}
                                        className="w-full text-right border-0 rounded-none bg-gray-100"
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <label className="text-xs min-w-[90px]">RON97 (RM/Litre)</label>
                                    <Input
                                        type="text"
                                        value={summary.stmt_ron97 !== undefined && summary.stmt_ron97 !== null && summary.stmt_ron97 !== '' && !isNaN(Number(summary.stmt_ron97)) ? summary.stmt_ron97 : ''}
                                        onChange={e => handleSummaryChange('stmt_ron97', e.target.value.replace(/[^0-9.-]/g, ''))}
                                        className="w-full text-right border-0 rounded-none bg-gray-100"
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <label className="text-xs min-w-[90px]">Diesel (RM/Litre)</label>
                                    <Input
                                        type="text"
                                        value={summary.stmt_diesel !== undefined && summary.stmt_diesel !== null && summary.stmt_diesel !== '' && !isNaN(Number(summary.stmt_diesel)) ? summary.stmt_diesel : ''}
                                        onChange={e => handleSummaryChange('stmt_diesel', e.target.value.replace(/[^0-9.-]/g, ''))}
                                        className="w-full text-right border-0 rounded-none bg-gray-100"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-center gap-2 mt-6">
                            <Button type="button" variant="default" onClick={handleSave}>Save</Button>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button type="button" variant="destructive">Close</Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Are you sure you want to close?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Any unsaved changes will be lost.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => window.close()}>Yes, Close</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </div>
                    <div>
                        <div className="flex items-center justify-between mb-2 gap-2">
                            <h3 className="text-xl font-semibold flex items-center gap-2">
                                Details
                                {loadingDetails && <Loader2 className="animate-spin text-primary w-5 h-5" />}
                            </h3>
                            <Input
                                type="text"
                                placeholder="Search Asset..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="w-56"
                            />
                        </div>
                        <div className="overflow-x-auto max-h-[500px] overflow-y-auto mb-6">
                            <table className="min-w-full border text-sm">
                                <thead className="bg-gray-200 sticky -top-1 z-10">
                                    <tr>
                                        <th className="border px-2 py-1.5">#</th>
                                        <th className="border px-2 py-1.5">Fleet Card</th>
                                        <th className="border px-2 py-1.5">Asset</th>
                                        <th className="border px-2 py-1.5">Cost Center</th>
                                        <th className="border px-2 py-1.5">Fuel Type</th>
                                        <th className="border px-2 py-1.5 text-right">Start ODO</th>
                                        <th className="border px-2 py-1.5 text-right">End ODO</th>
                                        <th className="border px-2 py-1.5 text-right">Total KM</th>
                                        <th className="border px-2 py-1.5">Litre</th>
                                        <th className="border px-2 py-1.5">Efficiency (KM/L)</th>
                                        <th className="border px-2 py-1.5">Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredDetails.map((detail, idx) => (
                                        <tr key={detail.s_id}>
                                            <td className="border px-2 text-center">{idx + 1}</td>
                                            <td className="border px-2">{detail.card_no || ''}</td>
                                            <td className="border px-2">{detail.asset?.register_number || ''}</td>
                                            <td className="border px-2">{detail.asset?.costcenter?.name || ''}</td>
                                            <td className="border px-2">{detail.asset?.fuel_type || ''}</td>
                                            <td className="border text-right">
                                                <Input
                                                    type="text"
                                                    value={detail.start_odo !== undefined && detail.start_odo !== null && !isNaN(Number(detail.start_odo)) ? detail.start_odo : 0}
                                                    onKeyDown={handleNumericInput}
                                                    onChange={e => handleDetailChange(idx, 'start_odo', e.target.value.replace(/[^0-9.-]/g, ''))}
                                                    className="w-full text-right border-0 rounded-none bg-gray-100 focus:bg-blue-200 focus:ring-0"
                                                />
                                            </td>
                                            <td className="border text-right">
                                                <Input
                                                    type="text"
                                                    value={detail.end_odo !== undefined && detail.end_odo !== null && !isNaN(Number(detail.end_odo)) ? detail.end_odo : 0}
                                                    onKeyDown={handleNumericInput}
                                                    onChange={e => handleDetailChange(idx, 'end_odo', e.target.value.replace(/[^0-9.-]/g, ''))}
                                                    className="w-full text-right border-0 rounded-none bg-gray-100 focus:bg-blue-200 focus:ring-0"
                                                />
                                            </td>
                                            <td className="border text-right">
                                                <Input
                                                    type="text"
                                                    value={detail.total_km !== undefined && detail.total_km !== null && !isNaN(Number(detail.total_km)) ? detail.total_km : 0}
                                                    readOnly
                                                    tabIndex={-1}
                                                    className="w-full text-right border-0 rounded-none bg-gray-100"
                                                />
                                            </td>
                                            <td className="border text-right">
                                                <Input
                                                    type="text"
                                                    value={detail.total_litre !== undefined && detail.total_litre !== null && !isNaN(Number(detail.total_litre)) && detail.total_litre !== '' ? detail.total_litre : 0}
                                                    onKeyDown={handleNumericInput}
                                                    onChange={e => handleDetailChange(idx, 'total_litre', e.target.value.replace(/[^0-9.-]/g, ''))}
                                                    className="w-full text-right border-0 rounded-none bg-gray-100 focus:bg-blue-200 focus:ring-0"
                                                />
                                            </td>
                                            <td className="border text-right">
                                                <Input
                                                    type="text"
                                                    value={
                                                        detail.total_litre !== undefined && detail.total_litre !== null && !isNaN(Number(detail.total_litre)) && Number(detail.total_litre) !== 0
                                                            ? (Number(detail.total_km) / Number(detail.total_litre)).toFixed(2)
                                                            : '0.00'
                                                    }
                                                    readOnly
                                                    tabIndex={-1}
                                                    className="w-full text-right border-0 rounded-none bg-gray-100"
                                                />
                                            </td>
                                            <td className="border text-right">
                                                <Input
                                                    type="text"
                                                    value={detail.amount !== undefined && detail.amount !== null && !isNaN(Number(detail.amount)) && detail.amount !== '' ? detail.amount : 0}
                                                    onKeyDown={handleNumericInput}
                                                    onChange={e => handleDetailChange(idx, 'amount', e.target.value.replace(/[^0-9.-]/g, ''))}
                                                    className="w-full text-right border-0 rounded-none bg-gray-100 focus:bg-blue-200 focus:ring-0"
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
                <div className="pt-4 max-w-sm space-y-6">
                    <div className="w-full md:w-72 lg:w-80 xl:w-96 border rounded p-4 bg-indigo-50 dark:bg-gray-900 shadow-sm h-fit">
                        <h3 className="text-lg font-semibold mb-4">Amount by Cost Center</h3>
                        <table className="min-w-full border text-xs">
                            <thead className="bg-gray-200">
                                <tr>
                                    <th className="border px-2 py-1.5 text-left">Cost Center</th>
                                    <th className="border px-2 py-1.5 text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Object.entries(costCenterSummary).map(([cc, amt]) => (
                                    <tr key={cc}>
                                        <td className="border px-2 py-1.5">{cc}</td>
                                        <td className="border px-2 py-1.5 text-right">{amt.toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>

    );
};

export default FuelMtnDetail;

/*
ToDo:
- implement logic that sum of amount column will be auto calculated and displayed in subtotal & total field
- implement submit/save handler for the form: all field in 'Statement Info' to be stored on parent table fuel_stmt while details to be stored on fuel_stmt_detail (asset_id, stmt_date, start_odo, end_odo, total_km, total_litre, amount)

*/
