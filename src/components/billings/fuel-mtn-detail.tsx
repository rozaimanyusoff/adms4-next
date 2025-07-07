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

interface FuelDetail {
    s_id: number;
    stmt_id: number;
    asset: Asset;
    fc_no?: string;
    stmt_date: string;
    start_odo: number;
    end_odo: number;
    total_km: number;
    total_litre: string;
    amount: string;
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
    const [data, setData] = useState<FuelBillDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editableDetails, setEditableDetails] = useState<FuelDetail[]>([]);
    const [search, setSearch] = useState('');

    // Add state for summary fields
    const [summary, setSummary] = useState({
        stmt_stotal: '',
        stmt_disc: '',
        stmt_tax: '',
        stmt_rounding: '',
        stmt_total: '',
    });

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
                    setEditableDetails(res.data.data.details.map(d => ({ ...d })));
                    setSummary({
                        stmt_stotal: res.data.data.stmt_stotal || '',
                        stmt_disc: res.data.data.stmt_disc || '',
                        stmt_tax: res.data.data.stmt_tax || '',
                        stmt_rounding: res.data.data.stmt_rounding || '',
                        stmt_total: res.data.data.stmt_total || '',
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
                    s_id: item.s_id || item.fc_id, // Use s_id or fallback to fc_id
                    stmt_id: item.stmt_id || 0,
                    asset: {
                        asset_id: item.asset?.asset_id || item.asset?.id || 0,
                        register_number: item.asset?.register_number || item.asset?.serial_number || '',
                        costcenter: item.asset?.costcenter || null,
                        district: item.asset?.district || null,
                    },
                    fc_no: item.fc_no || '',
                    stmt_date: item.stmt_date || '',
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
            <div className="p-4 space-y-6 max-w-6xl mx-auto">
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
                                value={header.stmt_litre}
                                onKeyDown={handleNumericInput}
                                onChange={e => handleHeaderChange('stmt_litre', e.target.value.replace(/[^0-9.-]/g, ''))}
                                className="w-full text-right border-0 rounded-none bg-gray-100"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-2">
                        <div className="flex flex-col">
                            <span className="font-medium mb-1">Subtotal</span>
                            <Input
                                type="text"
                                value={summary.stmt_stotal}
                                onKeyDown={handleNumericInput}
                                onChange={e => handleSummaryChange('stmt_stotal', e.target.value.replace(/[^0-9.-]/g, ''))}
                                className="w-full text-right border-0 rounded-none bg-gray-100"
                            />
                        </div>
                        <div className="flex flex-col">
                            <span className="font-medium mb-1">Discount</span>
                            <Input
                                type="text"
                                value={summary.stmt_disc}
                                onKeyDown={handleNumericInput}
                                onChange={e => handleSummaryChange('stmt_disc', e.target.value.replace(/[^0-9.-]/g, ''))}
                                className="w-full text-right border-0 rounded-none bg-gray-100"
                            />
                        </div>
                        <div className="flex flex-col">
                            <span className="font-medium mb-1">SST</span>
                            <Input
                                type="text"
                                value={summary.stmt_tax}
                                onKeyDown={handleNumericInput}
                                onChange={e => handleSummaryChange('stmt_tax', e.target.value.replace(/[^0-9.-]/g, ''))}
                                className="w-full text-right border-0 rounded-none bg-gray-100"
                            />
                        </div>
                        <div className="flex flex-col">
                            <span className="font-medium mb-1">Rounding</span>
                            <Input
                                type="text"
                                value={summary.stmt_rounding}
                                onKeyDown={handleNumericInput}
                                onChange={e => handleSummaryChange('stmt_rounding', e.target.value.replace(/[^0-9.-]/g, ''))}
                                className="w-full text-right border-0 rounded-none bg-gray-100"
                            />
                        </div>
                        <div className="flex flex-col">
                            <span className="font-medium mb-1">Total</span>
                            <Input
                                type="text"
                                value={summary.stmt_total}
                                onKeyDown={handleNumericInput}
                                onChange={e => handleSummaryChange('stmt_total', e.target.value.replace(/[^0-9.-]/g, ''))}
                                className="w-full text-right border-0 rounded-none bg-gray-100"
                            />
                        </div>
                    </div>
                    <div className="flex justify-center gap-2 mt-6">
                        <Button type="button" variant="default" onClick={() => {/* TODO: implement save handler */}}>Save</Button>
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
                    <div className="overflow-x-auto max-h-[700px] overflow-y-auto">
                        <table className="min-w-full border text-sm">
                            <thead className="bg-gray-200 sticky -top-1 z-10">
                                <tr>
                                    <th className="border px-2 py-1.5">#</th>
                                    <th className="border px-2 py-1.5">Fleet Card</th>
                                    <th className="border px-2 py-1.5">Asset</th>
                                    <th className="border px-2 py-1.5">Cost Center</th>
                                    <th className="border px-2 py-1.5">District</th>
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
                                        <td className="border px-2">{detail.fc_no || ''}</td>
                                        <td className="border px-2">{detail.asset?.register_number}</td>
                                        <td className="border px-2">{detail.asset?.costcenter?.name}</td>
                                        <td className="border px-2">{detail.asset?.district?.code}</td>
                                        <td className="border text-right">
                                            <Input
                                                type="text"
                                                value={detail.start_odo}
                                                onKeyDown={handleNumericInput}
                                                onChange={e => handleDetailChange(idx, 'start_odo', e.target.value.replace(/[^0-9.-]/g, ''))}
                                                className="w-full text-right border-0 rounded-none bg-gray-100"
                                            />
                                        </td>
                                        <td className="border text-right">
                                            <Input
                                                type="text"
                                                value={detail.end_odo}
                                                onKeyDown={handleNumericInput}
                                                onChange={e => handleDetailChange(idx, 'end_odo', e.target.value.replace(/[^0-9.-]/g, ''))}
                                                className="w-full text-right border-0 rounded-none bg-gray-100"
                                            />
                                        </td>
                                        <td className="border text-right">
                                            <Input
                                                type="text"
                                                value={detail.total_km}
                                                readOnly
                                                className="w-full text-right border-0 rounded-none bg-gray-100"
                                            />
                                        </td>
                                        <td className="border text-right">
                                            <Input
                                                type="text"
                                                value={detail.total_litre}
                                                onKeyDown={handleNumericInput}
                                                onChange={e => handleDetailChange(idx, 'total_litre', e.target.value.replace(/[^0-9.-]/g, ''))}
                                                className="w-full text-right border-0 rounded-none bg-gray-100"
                                            />
                                        </td>
                                        <td className="border text-right">
                                            <Input
                                                type="text"
                                                value={(() => {
                                                    const totalKM = Number(detail.end_odo) - Number(detail.start_odo);
                                                    const litre = parseFloat(detail.total_litre);
                                                    if (!litre || isNaN(litre) || litre === 0) return '';
                                                    if (!totalKM || isNaN(totalKM)) return '';
                                                    return (totalKM / litre).toFixed(2);
                                                })()}
                                                readOnly
                                                className="w-full text-right border-0 rounded-none bg-gray-100"
                                            />
                                        </td>
                                        <td className="border text-right">
                                            <Input
                                                type="text"
                                                value={detail.amount}
                                                onKeyDown={handleNumericInput}
                                                onChange={e => handleDetailChange(idx, 'amount', e.target.value.replace(/[^0-9.-]/g, ''))}
                                                className="w-full text-right border-0 rounded-none bg-gray-100"
                                            />
                                        </td>
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
