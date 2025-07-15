import React, { useEffect, useState } from 'react';
import { authenticatedApi } from '@/config/api';
import { Loader2, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { toast } from "sonner";

interface TelcoAccount {
    id: number;
    account_master: string;
    provider: string;
    old_id: number;
}

interface TelcoBillDetail {
    util_id: number;
    bfcy_id: number;
    account: TelcoAccount;
    ubill_date: string;
    ubill_no: string;
    ubill_gtotal: string;
    ubill_paystat: string;
    details: TelcoBillDetailItem[];
}

interface TelcoBillDetailItem {
    util2_id: number;
    util_id_copy2: number;
    util_id: number;
    bill_id: number;
    sim_id: number;
    loc_id: number;
    cc_id: number;
    sim_user_id: string;
    cc_no: string;
    cc_user: string;
    util2_plan: string;
    util2_usage: string;
    util2_disc: string;
    util2_amt: string;
    cc_dt: string;
    costcenter?: { id: number; name: string };
    user?: { ramco_id: string; full_name: string };
    district?: { id: number; name: string };
    subs?: { id: number; sub_no: string };
}

interface TelcoBillFormProps {
    utilId: number;
}

const TelcoBillForm: React.FC<TelcoBillFormProps> = ({ utilId }) => {
    // Track edits for details table
    const [detailsEdits, setDetailsEdits] = useState<Record<string, { usage: string; disc: string; amt: string }>>({});
    const [grandTotal, setGrandTotal] = useState('0.00');
    const [costCenterFilter, setCostCenterFilter] = useState('');
    const [showCancelDialog, setShowCancelDialog] = useState(false);

    // Dummy handleSubmit function
    const handleSubmit = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        // TODO: Implement save logic
        toast('Save action triggered.');
    };

    const handleCancel = () => {
        setShowCancelDialog(true);
    };

    const confirmCancel = () => {
        setShowCancelDialog(false);
        window.close();
    };

    const cancelCancel = () => {
        setShowCancelDialog(false);
    };
    const [data, setData] = useState<TelcoBillDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [accounts, setAccounts] = useState<TelcoAccount[]>([]);
    const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
    const [accountSubs, setAccountSubs] = useState<any[]>([]);
    const [accountInfo, setAccountInfo] = useState<any>(null);

    // Calculate row amounts, grand total, and cost center summary
    const detailsSource = (selectedAccountId && accountSubs.length > 0) ? accountSubs : data?.details || [];
    const [costCenterSummary, setCostCenterSummary] = useState<Record<string, number>>({});
    useEffect(() => {
        let total = 0;
        const summary: Record<string, number> = {};
        detailsSource.forEach((detail: any) => {
            const editKey = String(detail.util2_id || detail.id);
            // Get values from edits or fallback to detail
            const usage = parseFloat(detailsEdits[editKey]?.usage ?? detail.util2_usage ?? detail.usage ?? '0') || 0;
            const disc = parseFloat(detailsEdits[editKey]?.disc ?? detail.util2_disc ?? detail.disc ?? '0') || 0;
            // Plan logic: create mode uses accountInfo.plan, else detail.util2_plan
            let plan = 0;
            if (!utilId || utilId <= 0) {
                plan = parseFloat(accountInfo?.plan ?? '0') || 0;
            } else {
                plan = parseFloat(detail.util2_plan ?? '0') || 0;
            }
            const amt = (plan + usage) - disc;
            total += amt;
            // In create mode, costcenter may not exist, so fallback to '-'
            let ccName = '-';
            if (detail.costcenter && detail.costcenter.name) {
                ccName = detail.costcenter.name;
            } else if (detail.cc_name) {
                ccName = detail.cc_name;
            }
            if (!summary[ccName]) summary[ccName] = 0;
            summary[ccName] += amt;
        });
        // Only update state if value actually changed to avoid infinite loop
        setGrandTotal(prev => prev !== total.toFixed(2) ? total.toFixed(2) : prev);
        setCostCenterSummary(prev => {
            const prevStr = JSON.stringify(prev);
            const nextStr = JSON.stringify(summary);
            return prevStr !== nextStr ? summary : prev;
        });
    }, [detailsSource, detailsEdits, accountInfo, utilId]);

    useEffect(() => {
        setLoading(true);
        setError(null);
        if (utilId && utilId > 0) {
            authenticatedApi.get<{ data: TelcoBillDetail }>(`/api/telco/bills/${utilId}`)
                .then(res => {
                    setData(res.data.data);
                    // Automatically select account id from bill data if present
                    if (res.data.data.account && res.data.data.account.id) {
                        setSelectedAccountId(res.data.data.account.id);
                    }
                    // Only initialize detailsEdits if empty (first load)
                    if (res.data.data.details && Array.isArray(res.data.data.details) && Object.keys(detailsEdits).length === 0) {
                        const initialEdits: Record<string, { usage: string; disc: string; amt: string }> = {};
                        res.data.data.details.forEach((detail: any) => {
                            const editKey = String(detail.util2_id || detail.id);
                            initialEdits[editKey] = {
                                usage: detail.util2_usage !== undefined && detail.util2_usage !== null ? String(detail.util2_usage) : '0.00',
                                disc: detail.util2_disc !== undefined && detail.util2_disc !== null ? String(detail.util2_disc) : '0.00',
                                amt: detail.util2_amt !== undefined && detail.util2_amt !== null ? String(detail.util2_amt) : '0.00',
                            };
                        });
                        setDetailsEdits(initialEdits);
                    }
                    setLoading(false);
                })
                .catch(() => {
                    setError('Failed to load telco bill details.');
                    setLoading(false);
                });
        } else {
            setData(null);
            setDetailsEdits({});
            setLoading(false);
        }
    }, [utilId]);

    // Fetch accounts for select
    useEffect(() => {
        authenticatedApi.get<{ data: TelcoAccount[] }>(`/api/telco/accounts`)
            .then(res => {
                setAccounts(res.data.data);
            })
            .catch(() => {
                setAccounts([]);
            });
    }, []);

    // Fetch account subscribers when selectedAccountId changes
    useEffect(() => {
        // Only fetch account subscribers in create mode (utilId not set or <= 0)
        if (!utilId || utilId <= 0) {
            if (selectedAccountId) {
                authenticatedApi.get(`/api/telco/accounts/${selectedAccountId}/subs`)
                    .then(res => {
                        const resp = res.data as { data: any };
                        setAccountInfo(resp.data);
                        setAccountSubs(resp.data.subs || []);
                    })
                    .catch(() => {
                        setAccountInfo(null);
                        setAccountSubs([]);
                    });
            } else {
                setAccountInfo(null);
                setAccountSubs([]);
            }
        }
    }, [selectedAccountId]);

    if (loading) return <div className="p-4">Loading...</div>;
    if ((utilId && utilId > 0) && !data) return <div className="p-4">No data found.</div>;

    return (
        <div className="w-full min-h-screen bg-gray-50 dark:bg-gray-800">
            <nav className="w-full bg-white dark:bg-gray-900 shadow-sm mb-6">
                <div className="max-w-6xl mx-auto px-4 py-4 flex justify-center items-center">
                    <h1 className="text-2xl font-bold text-center text-gray-800 dark:text-gray-100">Telco Billing Form</h1>
                </div>
            </nav>
            <div className="flex gap-6 px-6 mx-auto">
                <div className="pt-4 w-full space-y-6">
                    <div className="border rounded p-4 bg-white dark:bg-gray-900 shadow-sm">
                        <h3 className="text-lg font-semibold mb-2">Bill Info</h3>
                        <form onSubmit={handleSubmit}>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                <div className="flex flex-col">
                                    <span className="font-medium mb-1">Account No</span>
                                    <Select value={selectedAccountId ? String(selectedAccountId) : ''} onValueChange={val => setSelectedAccountId(Number(val))}>
                                        <SelectTrigger className="w-full text-right border-0 rounded-none bg-gray-100">
                                            <SelectValue placeholder="Select account" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectGroup>
                                                <SelectLabel>Accounts</SelectLabel>
                                                {accounts.map(acc => (
                                                    <SelectItem key={acc.id} value={String(acc.id)}>
                                                        {acc.account_master} - {acc.provider}
                                                    </SelectItem>
                                                ))}
                                            </SelectGroup>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-medium mb-1">Bill No</span>
                                    <Input type="text" value={data?.ubill_no || ''} readOnly className="w-full text-right border-0 rounded-none bg-gray-100" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-medium mb-1">Bill Date</span>
                                    <Input
                                        type="date"
                                        value={data?.ubill_date ? data.ubill_date.slice(0, 10) : ''}
                                        onChange={e => {
                                            const newDate = e.target.value;
                                            setData(prev => prev ? { ...prev, ubill_date: newDate } : prev);
                                        }}
                                        className="w-full text-right border-0 rounded-none bg-gray-100"
                                    />
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-medium mb-1">Grand Total</span>
                                    <Input type="text" value={grandTotal} readOnly className="w-full text-right border-0 rounded-none bg-gray-100" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-medium mb-1">Status</span>
                                    <Select
                                        value={data?.ubill_paystat || ''}
                                        onValueChange={val => setData(prev => prev ? { ...prev, ubill_paystat: val } : prev)}
                                    >
                                        <SelectTrigger className="w-full text-right border-0 rounded-none bg-gray-100">
                                            <SelectValue placeholder="Select status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectGroup>
                                                <SelectLabel>Status</SelectLabel>
                                                <SelectItem value="Paid">Paid</SelectItem>
                                                <SelectItem value="Unpaid">Unpaid</SelectItem>
                                            </SelectGroup>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-medium mb-1">Upload Document (PDF only)</span>
                                    <Input
                                        type="file"
                                        accept="application/pdf"
                                        onChange={e => {
                                            const file = e.target.files?.[0] || null;
                                            // You may want to handle file upload logic here or store in state
                                            // Example: setDocumentFile(file);
                                        }}
                                        className="w-full text-right border-0 rounded-none bg-gray-100"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-2 mt-6 justify-center">
                                <Button type="submit" variant="default">Save</Button>
                                <Button type="button" variant="destructive" onClick={handleCancel}>Cancel</Button>
                            </div>
                        </form>
                        <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Cancel Changes?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Are you sure you want to cancel? Any unsaved changes will be lost and this tab will be closed.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel onClick={cancelCancel}>No, keep editing</AlertDialogCancel>
                                    <AlertDialogAction onClick={confirmCancel}>Yes, close tab</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                    <div>
                        <div className="flex items-center justify-between mb-2 gap-2">
                            <h3 className="text-xl font-semibold flex items-center gap-2">Details</h3>
                            <input
                                type="text"
                                placeholder="Search Cost Center..."
                                value={costCenterFilter}
                                onChange={e => setCostCenterFilter(e.target.value)}
                                className="ml-4 px-2 py-1 border rounded text-sm w-56"
                            />
                        </div>
                        <div className="overflow-x-auto max-h-[500px] overflow-y-auto mb-6">
                            <table className="min-w-full border text-sm">
                                <thead className="bg-gray-200 sticky -top-1 z-10">
                                    <tr>
                                        <th className="border px-2 py-1.5">#</th>
                                        <th className="border px-2 py-1.5">Sub Number</th>
                                        <th className="border px-2 py-1.5">Costcenter</th>
                                        <th className="border px-2 py-1.5">Plan</th>
                                        <th className="border px-2 py-1.5">Usage</th>
                                        <th className="border px-2 py-1.5">Discount/Adj.</th>
                                        <th className="border px-2 py-1.5">Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(
                                        (selectedAccountId && accountSubs.length > 0 ? accountSubs : data?.details || [])
                                            .filter((detail: any) => {
                                                const subNo = detail.subs?.sub_no || detail.sub_no || '';
                                                return subNo.toLowerCase().includes(costCenterFilter.toLowerCase());
                                            })
                                    ).map((detail: any, idx: number) => {
                                        const editKey = String(detail.util2_id || detail.id);
                                        const usageVal = detailsEdits[editKey]?.usage ?? (detail.util2_usage !== undefined && detail.util2_usage !== null ? String(detail.util2_usage) : '0.00');
                                        const discVal = detailsEdits[editKey]?.disc ?? (detail.util2_disc !== undefined && detail.util2_disc !== null ? String(detail.util2_disc) : '0.00');
                                        // Calculate amount for each row
                                        let plan = (!utilId || utilId <= 0) ? parseFloat(accountInfo?.plan ?? '0') || 0 : parseFloat(detail.util2_plan ?? '0') || 0;
                                        const usage = parseFloat(usageVal) || 0;
                                        const disc = parseFloat(discVal) || 0;
                                        const amtVal = ((plan + usage) - disc).toFixed(2);
                                        const planVal = (!utilId || utilId <= 0) ? (accountInfo?.plan ?? '-') : (detail.util2_plan || '-');
                                        return (
                                            <tr key={editKey}>
                                                <td className="border px-2 text-center">{idx + 1}</td>
                                                <td className="border px-2">{detail.subs?.sub_no || detail.sub_no || '-'}</td>
                                                <td className="border px-2">{detail.costcenter?.name || '-'}</td>
                                                <td className="border px-2 text-right">{planVal}</td>
                                                <td className="border px-2 text-right">
                                                    <Input
                                                        type="text"
                                                        step="0.01"
                                                        min="0"
                                                        value={usageVal}
                                                        onChange={e => {
                                                            const val = e.target.value;
                                                            setDetailsEdits(prev => ({
                                                                ...prev,
                                                                [editKey]: {
                                                                    ...prev[editKey],
                                                                    usage: val
                                                                }
                                                            }));
                                                        }}
                                                        className="w-full text-right border-0 rounded-none bg-gray-100"
                                                    />
                                                </td>
                                                <td className="border px-2 text-right">
                                                    <Input
                                                        type="text"
                                                        step="0.01"
                                                        min="0"
                                                        value={discVal}
                                                        onChange={e => {
                                                            const val = e.target.value;
                                                            setDetailsEdits(prev => ({
                                                                ...prev,
                                                                [editKey]: {
                                                                    ...prev[editKey],
                                                                    disc: val
                                                                }
                                                            }));
                                                        }}
                                                        className="w-full text-right border-0 rounded-none bg-gray-100"
                                                    />
                                                </td>
                                                <td className="border px-2 text-right">
                                                    <Input
                                                        type="text"
                                                        step="0.01"
                                                        min="0"
                                                        value={amtVal}
                                                        readOnly
                                                        tabIndex={-1}
                                                        className="w-full text-right border-0 rounded-none bg-gray-100"
                                                    />
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
                <div className="pt-4 max-w-sm space-y-6">
                    <div className="w-full md:w-72 lg:w-80 xl:w-96 border rounded p-4 bg-indigo-50 dark:bg-gray-900 shadow-sm h-fit">
                        {selectedAccountId && accountInfo && (
                                <div>
                                    <h4 className="font-semibold mb-1">Account Info</h4>
                                    <div className="flex flex-col space-x-4 mb-2 text-sm text-gray-700">
                                        <div><span className="font-medium">Account Master:</span> {accountInfo.account_master}</div>
                                        <div><span className="font-medium">Provider:</span> {accountInfo.provider}</div>
                                        <div><span className="font-medium">Description:</span> {accountInfo.description}</div>
                                    </div>
                                </div>
                            )}
                        <h3 className="text-lg font-semibold my-4">Amount by Cost Center</h3>
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

export default TelcoBillForm;
