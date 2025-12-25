'use client';
import React, { useEffect, useState } from 'react';
import { authenticatedApi } from '@/config/api';
import { Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useRouter } from 'next/navigation';

interface TelcoAccount {
    id: number;
    account_master: string;
    provider: string;
    description: string;
    old_id: number;
}

interface TelcoBillDetail {
    util_id: number;
    bfcy_id: number;
    account: TelcoAccount;
    bill_date: string;
    bill_no: string;
    subtotal: string;
    tax: string;
    rounding: string;
    grand_total: string;
    status: string;
    details: TelcoBillDetailItem[];
}

interface TelcoBillDetailItem {
    util2_id: number;
    util_id_copy2: number;
    util_id: number;
    bill_id: number;
    sim_id: number;
    loc_id: number;
    costcenter_id: number;
    sim_user_id: string;
    cc_no: string;
    cc_user: string;
    plan: string;
    usage: string;
    discount: string;
    amount: string;
    cc_dt: string;
    costcenter?: { id: number; name: string };
    user?: { ramco_id: string; full_name: string };
    district?: { id: number; name: string };
    subs?: { id: number; sub_no: string };
    sim?: {
        id: number;
        no: string;
    }
}

interface TelcoBillFormProps {
    utilId: number;
    onClose?: () => void;
    onSaved?: (id?: number) => void;
    onLeaveHandlerReady?: (fn: () => void) => void;
}

const TelcoBillForm: React.FC<TelcoBillFormProps> = ({ utilId, onClose, onSaved, onLeaveHandlerReady }) => {
    const router = useRouter();
    // Track edits for details table
    const [detailsEdits, setDetailsEdits] = useState<Record<string, { usage: string; disc: string; amt: string }>>({});
    const [grandTotal, setGrandTotal] = useState('0.00');
    const [subTotal, setSubTotal] = useState('0.00');
    const [tax, setTax] = useState('0.00');
    const [rounding, setRounding] = useState('0.00');
    const [costCenterFilter, setCostCenterFilter] = useState('');
    const [showCancelDialog, setShowCancelDialog] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccessDialog, setShowSuccessDialog] = useState(false);
    const [data, setData] = useState<TelcoBillDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [accounts, setAccounts] = useState<TelcoAccount[]>([]);
    const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
    const [accountSearch, setAccountSearch] = useState('');
    const [accountSubs, setAccountSubs] = useState<any[]>([]);
    const [accountInfo, setAccountInfo] = useState<any>(null);
    // Calculate row amounts, grand total, and cost center summary
    const detailsSource = (selectedAccountId && accountSubs.length > 0) ? accountSubs : data?.details || [];
    const [costCenterSummary, setCostCenterSummary] = useState<Record<string, number>>({});
    // Dedicated state for Bill No and Bill Date
    const [billNo, setBillNo] = useState('');
    const [billDate, setBillDate] = useState('');
    // Set default status for create mode
    const [status, setStatus] = useState((!utilId || utilId <= 0) ? 'Unpaid' : '');
    const navigateBack = React.useCallback(() => {
        router.push('/billings/telco');
    }, [router]);

    const goBackToList = React.useCallback((opts?: { force?: boolean }) => {
        if (opts?.force) {
            navigateBack();
            return;
        }
        if (onClose) {
            onClose();
        } else {
            navigateBack();
        }
    }, [navigateBack, onClose]);

    // Draft storage key (create mode only)
    const draftKey = React.useMemo(() => {
        if (utilId && utilId > 0) return null;
        return 'telco-bill-draft';
    }, [utilId]);
    const [draftLoaded, setDraftLoaded] = useState(false);

    const clearDraft = React.useCallback(() => {
        if (!draftKey) return;
        try {
            localStorage.removeItem(draftKey);
        } catch {
            // ignore storage errors
        }
    }, [draftKey]);

    useEffect(() => {
        if (!draftKey) { setDraftLoaded(true); return; }
        try {
            const raw = typeof window !== 'undefined' ? localStorage.getItem(draftKey) : null;
            if (raw) {
                const draft = JSON.parse(raw);
                if (draft.selectedAccountId) setSelectedAccountId(draft.selectedAccountId);
                if (typeof draft.accountSearch === 'string') setAccountSearch(draft.accountSearch);
                if (typeof draft.billNo === 'string') setBillNo(draft.billNo);
                if (typeof draft.billDate === 'string') setBillDate(draft.billDate);
                if (typeof draft.status === 'string') setStatus(draft.status);
                if (typeof draft.tax === 'string') setTax(draft.tax);
                if (typeof draft.rounding === 'string') setRounding(draft.rounding);
                if (draft.detailsEdits && typeof draft.detailsEdits === 'object') setDetailsEdits(draft.detailsEdits);
            }
        } catch {
            // ignore parse/storage errors
        } finally {
            setDraftLoaded(true);
        }
    }, [draftKey]);

    useEffect(() => {
        if (!draftKey || !draftLoaded) return;
        try {
            const payload = {
                selectedAccountId,
                accountSearch,
                billNo,
                billDate,
                status,
                tax,
                rounding,
                detailsEdits,
            };
            localStorage.setItem(draftKey, JSON.stringify(payload));
        } catch {
            // ignore storage errors
        }
    }, [accountSearch, billDate, billNo, detailsEdits, draftKey, draftLoaded, rounding, selectedAccountId, status, tax]);

    // Save handler for form submission
    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        // Basic client-side validations with toast feedback
        const errs: string[] = [];
        if (!selectedAccountId) errs.push('Please select an account.');
        if (!billNo || billNo.trim() === '') errs.push('Bill No is required.');
        if (!billDate || String(billDate).trim() === '') errs.push('Bill Date is required.');
        if (isNaN(parseFloat(subTotal)) || parseFloat(subTotal) <= 0) errs.push('Sub-Total must be greater than 0.');
        if (isNaN(parseFloat(grandTotal)) || parseFloat(grandTotal) <= 0) errs.push('Grand Total must be greater than 0.');
        if (errs.length > 0) {
            toast.error(errs.join('\n'));
            return;
        }
        // Build payload from form state
        const selectedAccount = accounts.find(acc => acc.id === selectedAccountId);
        const payload: any = {
            account_id: selectedAccountId,
            account_master: selectedAccount?.account_master ?? '',
            bill_no: billNo,
            bill_date: billDate,
            subtotal: subTotal,
            tax: tax,
            rounding: rounding,
            grand_total: grandTotal,
            status: (!utilId || utilId <= 0) ? status : (data?.status || ''),
            details: (selectedAccountId && accountSubs.length > 0 ? accountSubs : data?.details || []).map((detail: any) => {
                const editKey = String(detail.util2_id || detail.id);
                const usage = detailsEdits[editKey]?.usage ?? detail.usage ?? '0.00';
                const disc = detailsEdits[editKey]?.disc ?? detail.discount ?? '0.00';
                let plan = (!utilId || utilId <= 0) ? accountInfo?.plan ?? '0.00' : detail.plan ?? '0.00';
                let subsId = null;
                let costcenterId = null;
                if (!utilId || utilId <= 0) {
                    // Create mode: from accountSubs structure
                    subsId =
                        (detail.subs && typeof detail.subs.id !== 'undefined') ? detail.subs.id :
                            (typeof detail.id !== 'undefined') ? detail.id :
                                (typeof detail.subs_id !== 'undefined') ? detail.subs_id :
                                    (typeof detail.sub_no !== 'undefined' && !isNaN(Number(detail.sub_no))) ? Number(detail.sub_no) :
                                        null;
                    costcenterId = detail.costcenter?.id ?? null;
                } else {
                    // Edit mode: from details structure
                    if (detail.subs && typeof detail.subs.id !== 'undefined') {
                        subsId = detail.subs.id;
                    } else if (typeof detail.sub_id !== 'undefined') {
                        subsId = detail.sub_id;
                    } else if (typeof detail.subs_id !== 'undefined') {
                        subsId = detail.subs_id;
                    } else if (typeof detail.sub_no !== 'undefined' && !isNaN(Number(detail.sub_no))) {
                        subsId = Number(detail.sub_no);
                    }
                    costcenterId = detail.costcenter?.id ?? null;
                }
                return {
                    util2_id: detail.util2_id || null,
                    old_sim_id: detail.sim_id || null,
                    new_sim_id: detail.sim?.id || null,
                    plan: plan,
                    usage: usage,
                    discount: disc,
                    amount: ((parseFloat(plan) + parseFloat(usage)) - parseFloat(disc)).toFixed(2),
                    subs_id: subsId,
                    costcenter_id: costcenterId,
                    account_id: selectedAccountId,
                    ramco_id: detail.user?.ramco_id ?? null,
                };
            })
        };
        try {
            setIsSubmitting(true);
            if (!utilId || utilId === 0) {
                const res = await authenticatedApi.post('/api/telco/bills', payload);
                toast.success('Telco bill created successfully.');
                // Attempt to capture new ID from response for highlighting
                const newId = (res as any)?.data?.data?.id ?? (res as any)?.data?.id;
                (window as any).__lastCreatedTelcoBillId = newId ?? null;
            } else {
                const res = await authenticatedApi.put(`/api/telco/bills/${utilId}`, payload);
                toast.success('Telco bill updated successfully.');
                const updatedId = utilId;
                (window as any).__lastCreatedTelcoBillId = updatedId ?? null;
            }
            setShowSuccessDialog(true);
        } catch (err: any) {
            const msg = err?.response?.data?.message || err?.message || 'Failed to save telco bill.';
            toast.error(String(msg));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancel = () => {
        setShowCancelDialog(true);
    };

    const confirmCancel = () => {
        setShowCancelDialog(false);
        clearDraft();
        goBackToList({ force: true });
    };

    const cancelCancel = () => {
        setShowCancelDialog(false);
    };

    const handleSuccessClose = () => {
        setShowSuccessDialog(false);
        const lastId = (window as any).__lastCreatedTelcoBillId ?? (utilId || undefined);
        if (onSaved) onSaved(lastId);
        clearDraft();
        goBackToList({ force: true });
    };


    useEffect(() => {
        if (!utilId || utilId <= 0) {
            // Create mode: ensure defaults are set
            setSubTotal(prev => prev === '' ? '0.00' : prev);
            setTax(prev => prev === '' ? '0.00' : prev);
            setRounding(prev => prev === '' ? '0.00' : prev);
            setGrandTotal(prev => prev === '' ? '0.00' : prev);
            setBillNo(prev => prev === '' ? '' : prev);
            setBillDate(prev => prev === '' ? '' : prev);
        } else if (data) {
            // Edit mode: set tax, rounding, billNo, billDate from API data
            setTax(data.tax !== undefined && data.tax !== null && data.tax !== '' ? data.tax : '0.00');
            setRounding(data.rounding !== undefined && data.rounding !== null && data.rounding !== '' ? data.rounding : '0.00');
            setBillNo(data.bill_no ?? '');
            setBillDate(data.bill_date ?? '');
        }
        let total = 0;
        const summary: Record<string, number> = {};
        detailsSource.forEach((detail: any) => {
            const editKey = String(detail.util2_id || detail.id);
            // Get values from edits or fallback to detail
            const usage = parseFloat(detailsEdits[editKey]?.usage ?? detail.usage ?? detail.usage ?? '0') || 0;
            const disc = parseFloat(detailsEdits[editKey]?.disc ?? detail.discount ?? detail.disc ?? '0') || 0;
            let plan = 0;
            if (!utilId || utilId <= 0) {
                plan = parseFloat(accountInfo?.plan ?? '0') || 0;
            } else {
                plan = parseFloat(detail.plan ?? '0') || 0;
            }
            const amt = (plan + usage) - disc;
            total += amt;
            let ccName = '-';
            if (detail.costcenter && detail.costcenter.name) {
                ccName = detail.costcenter.name;
            } else if (detail.cc_name) {
                ccName = detail.cc_name;
            }
            if (!summary[ccName]) summary[ccName] = 0;
            summary[ccName] += amt;
        });
        // sub-total = sum of row amounts
        setSubTotal(total.toFixed(2) === '' ? '0.00' : total.toFixed(2));
        // grand total = sub-total + tax + rounding
        const grand = (parseFloat(total.toFixed(2) === '' ? '0.00' : total.toFixed(2)) + parseFloat(tax === '' ? '0.00' : tax) + parseFloat(rounding === '' ? '0.00' : rounding)).toFixed(2);
        setGrandTotal(prev => prev !== grand ? grand : prev);
        setCostCenterSummary(prev => {
            const prevStr = JSON.stringify(prev);
            const nextStr = JSON.stringify(summary);
            return prevStr !== nextStr ? summary : prev;
        });
    }, [detailsSource, detailsEdits, accountInfo, utilId, tax, data, rounding]);

    useEffect(() => {
        setError(null);
        if (utilId && utilId > 0) {
            setLoading(true);
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
                                usage: detail.usage !== undefined && detail.usage !== null ? String(detail.usage) : '0.00',
                                disc: detail.discount !== undefined && detail.discount !== null ? String(detail.discount) : '0.00',
                                amt: detail.amount !== undefined && detail.amount !== null ? String(detail.amount) : '0.00',
                            };
                        });
                        setDetailsEdits(initialEdits);
                    }
                    // Set Bill No and Bill Date from API
                    setBillNo(res.data.data.bill_no ?? '');
                    setBillDate(res.data.data.bill_date ?? '');
                    setLoading(false);
                })
                .catch((err) => {
                    setError('Failed to load telco bill details.');
                    const msg = err?.response?.data?.message || err?.message || 'Failed to load telco bill details.';
                    toast.error(String(msg));
                    setLoading(false);
                });
        } else {
            // Create mode: avoid clearing draft values; just ensure loading state ends after draft restore.
            if (!draftLoaded && draftKey) return;
            setData(null);
            setLoading(false);
        }
    }, [draftKey, draftLoaded, utilId]);

    // Fetch accounts for select
    useEffect(() => {
        authenticatedApi.get<{ data: TelcoAccount[] }>(`/api/telco/accounts`)
            .then(res => {
                setAccounts(res.data.data);
            })
            .catch((err) => {
                setAccounts([]);
                const msg = err?.response?.data?.message || err?.message || 'Failed to load telco accounts.';
                toast.error(String(msg));
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
                    .catch((err) => {
                        setAccountInfo(null);
                        setAccountSubs([]);
                        const msg = err?.response?.data?.message || err?.message || 'Failed to load account subscribers.';
                        toast.error(String(msg));
                    });
            } else {
                setAccountInfo(null);
                setAccountSubs([]);
            }
        }
    }, [selectedAccountId, utilId]);

    const hasFormData = React.useMemo(() => {
        const hasDetailEdits = Object.values(detailsEdits || {}).some(entry => {
            if (!entry) return false;
            return (
                (entry.usage && entry.usage.trim() !== '' && entry.usage !== '0' && entry.usage !== '0.00') ||
                (entry.disc && entry.disc.trim() !== '' && entry.disc !== '0' && entry.disc !== '0.00') ||
                (entry.amt && entry.amt.trim() !== '' && entry.amt !== '0' && entry.amt !== '0.00')
            );
        });
        const hasMoney = (tax && tax !== '0' && tax !== '0.00') || (rounding && rounding !== '0' && rounding !== '0.00') || (subTotal && subTotal !== '0' && subTotal !== '0.00');
        return Boolean(
            selectedAccountId ||
            billNo.trim() ||
            (billDate || '').toString().trim() ||
            hasDetailEdits ||
            hasMoney
        );
    }, [billDate, billNo, detailsEdits, rounding, selectedAccountId, subTotal, tax]);

    React.useEffect(() => {
        if (typeof onLeaveHandlerReady === 'function') {
            onLeaveHandlerReady(() => setShowCancelDialog(true));
        }
    }, [onLeaveHandlerReady]);

    if (loading) return <div className="p-4">Loading...</div>;
    if ((utilId && utilId > 0) && !data) return <div className="p-4">No data found.</div>;

    // Enable Save only when required fields are present and totals are positive
    const canSave = (
        billNo.trim() !== '' &&
        (billDate || '').toString().trim() !== '' &&
        !isNaN(parseFloat(subTotal)) && parseFloat(subTotal) > 0 &&
        !isNaN(parseFloat(grandTotal)) && parseFloat(grandTotal) > 0
    );

    const isEditMode = !!(utilId && utilId > 0);
    const cancelWarningText = hasFormData
        ? 'You have unsaved changes. Leaving now will discard them.'
        : 'The form is empty. Leave without saving?';

    // Selected account info for subtitle under Bill Info
    // Prefer the unified object from the accounts list (has account_master/description consistently)
    const selectedAccountDisplay: any = (() => {
        if (selectedAccountId) {
            const foundFromList = accounts.find(a => a.id === selectedAccountId);
            if (foundFromList) return foundFromList;
        }
        if (accountInfo) return accountInfo;
        if (utilId && utilId > 0 && data?.account) return data.account;
        return null;
    })();

    return (
        <div className="flex flex-col lg:flex-row gap-6 mx-auto">
            <div className="w-full space-y-6">
                <Card className='bg-stone-50 dark:bg-stone-800 shadow-none'>
                    <CardHeader className="pb-2">
                        <CardTitle>Bill Info</CardTitle>
                            {selectedAccountDisplay && (() => {
                                const accNo = selectedAccountDisplay.account_master || selectedAccountDisplay.account_no || '';
                                const provider = selectedAccountDisplay.provider || '';
                                const desc = selectedAccountDisplay.description || '';
                                return (
                                    <CardDescription>
                                        <span className="font-medium text-foreground">Selected Account:</span>
                                        <span className="ml-1 text-blue-600 font-semibold">
                                            {accNo}
                                            {provider ? ` — ${provider}` : ''}
                                            {desc ? ` — ${desc}` : ''}
                                        </span>
                                    </CardDescription>
                                );
                            })()}
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit}>
                            <div className='flex flex-col md:flex-row justify-between gap-4'>
                                {/* Account No as styled list */}
                                <div className="flex flex-col md:w-1/3">
                                    <span className="font-medium mb-1">Account No</span>
                                    <ul
                                        className="border rounded max-h-60 overflow-y-auto divide-y"
                                        ref={el => {
                                            // Scroll selected/highlighted account into view in edit mode
                                            if (el && utilId && utilId > 0 && selectedAccountId) {
                                                const selectedLi = el.querySelector('li.bg-blue-600');
                                                if (selectedLi) {
                                                    selectedLi.scrollIntoView({ block: 'nearest' });
                                                }
                                            }
                                        }}
                                    >
                                        {/* Inline search inside the list */}
                                        <li className="px-2 py-2 sticky top-0 bg-white dark:bg-gray-900 z-10">
                                            <Input
                                                type="text"
                                                placeholder="Search account..."
                                                value={accountSearch}
                                                onChange={e => setAccountSearch(e.target.value)}
                                                className="h-8"
                                            />
                                        </li>
                                        {accounts.filter(acc => {
                                            const q = accountSearch.toLowerCase().trim();
                                            if (!q) return true;
                                            return (
                                                String(acc.account_master || '').toLowerCase().includes(q) ||
                                                String(acc.description || '').toLowerCase().includes(q) ||
                                                String(acc.provider || '').toLowerCase().includes(q)
                                            );
                                        }).length === 0 && (
                                            <li className="px-3 py-2 text-gray-400">No accounts found</li>
                                        )}
                                        {accounts
                                            .filter(acc => {
                                                const q = accountSearch.toLowerCase().trim();
                                                if (!q) return true;
                                                return (
                                                    String(acc.account_master || '').toLowerCase().includes(q) ||
                                                    String(acc.description || '').toLowerCase().includes(q) ||
                                                    String(acc.provider || '').toLowerCase().includes(q)
                                                );
                                            })
                                            .map(acc => {
                                            // On edit mode, highlight matched acc.id with bg-blue-600 text-white
                                            const isEditMode = utilId && utilId > 0;
                                            const isSelected = selectedAccountId === acc.id;
                                            const highlightClass = isEditMode && isSelected
                                                ? 'bg-blue-600 text-white font-semibold'
                                                : isSelected
                                                    ? 'bg-blue-600 text-white dark:bg-gray-700 font-semibold'
                                                    : '';
                                            return (
                                                <li
                                                    key={acc.id}
                                                    className={`px-3 py-2 cursor-pointer hover:bg-indigo-100 dark:hover:bg-gray-800 ${highlightClass}`}
                                                    onClick={() => setSelectedAccountId(acc.id)}
                                                >
                                                    {acc.account_master} - {acc.description}
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>
                                {/* Bill No, Bill Date, Status stacked in next column */}
                                <div className="grid grid-cols-1 md:w-1/3 space-y-2">
                                    <div className="flex flex-col">
                                        <span className="font-medium mb-1">Bill No</span>
                                        <Input type="text" value={billNo} onChange={e => setBillNo(e.target.value)} className="w-full" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-medium mb-1">Bill Date</span>
                                        <Input
                                            type="date"
                                            value={billDate ? billDate.slice(0, 10) : ''}
                                            onChange={e => setBillDate(e.target.value)}
                                            className="w-full"
                                        />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-medium mb-1">Status</span>
                                        <Select
                                            value={(!utilId || utilId <= 0) ? status : (data?.status || '')}
                                            onValueChange={val => {
                                                if (!utilId || utilId <= 0) {
                                                    setStatus(val);
                                                } else {
                                                    setData(prev => prev ? { ...prev, status: val } : prev);
                                                }
                                            }}
                                        >
                                            <SelectTrigger className="w-full text-right">
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
                                            className="w-full text-right"
                                        />
                                    </div>
                                </div>
                                {/* Sub-Total, Tax, Rounding, Grand Total remain as is */}
                                <div className='grid grid-cols-1 space-y-2 md:w-1/3'>
                                    <div className="flex flex-col">
                                        <span className="font-medium mb-1">Sub-Total</span>
                                        <Input type="text" value={subTotal === '' ? '0.00' : subTotal} readOnly className="w-full text-right" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-medium mb-1">Tax</span>
                                        <Input type="text" value={tax === '' ? '0.00' : tax} onFocus={e => e.currentTarget.select()} onChange={e => setTax(e.target.value.replace(/[^0-9.]/g, ''))} className="w-full text-right" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-medium mb-1">Rounding</span>
                                        <Input type="text" value={rounding === '' ? '0.00' : rounding} onFocus={e => e.currentTarget.select()} onChange={e => setRounding(e.target.value.replace(/[^0-9.\-]/g, ''))} className="w-full text-right" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-medium mb-1">Grand Total</span>
                                        <Input type="text" value={grandTotal === '' ? '0.00' : grandTotal} readOnly className="w-full text-right" />
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-2 mt-6 justify-center">
                                <Button type="submit" variant="default" disabled={!canSave || isSubmitting} aria-disabled={!canSave || isSubmitting}>
                                    {isSubmitting ? (
                                        <span className="inline-flex items-center gap-2">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            {isEditMode ? 'Updating...' : 'Saving...'}
                                        </span>
                                    ) : (isEditMode ? 'Update' : 'Save')}
                                </Button>
                                <Button type="button" variant="destructive" onClick={handleCancel}>Cancel</Button>
                            </div>
                        </form>
                        <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Cancel Changes?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        {cancelWarningText}
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel onClick={cancelCancel}>No, keep editing</AlertDialogCancel>
                                    <AlertDialogAction onClick={confirmCancel}>Yes, leave page</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                        <AlertDialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Success</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        {(!utilId || utilId === 0) ? 'Telco bill has been created.' : 'Telco bill has been updated.'}
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogAction onClick={handleSuccessClose}>Close</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </CardContent>
                </Card>
                <div>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-2 gap-2">
                        <h3 className="text-xl font-semibold flex items-center gap-2">Details</h3>
                        <input
                            type="text"
                            placeholder="Search Cost Center..."
                            value={costCenterFilter}
                            onChange={e => setCostCenterFilter(e.target.value)}
                            className="sm:ml-4 px-2 py-1 border rounded text-sm w-full sm:w-56"
                        />
                    </div>
                    <div className="overflow-x-auto max-h-125 overflow-y-auto mb-6">
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
                                    const usageVal = detailsEdits[editKey]?.usage ?? (detail.usage !== undefined && detail.usage !== null ? String(detail.usage) : '0.00');
                                    const discVal = detailsEdits[editKey]?.disc ?? (detail.discount !== undefined && detail.discount !== null ? String(detail.discount) : '0.00');
                                    // Calculate amount for each row
                                    let plan = (!utilId || utilId <= 0) ? parseFloat(accountInfo?.plan ?? '0') || 0 : parseFloat(detail.plan ?? '0') || 0;
                                    const usage = parseFloat(usageVal) || 0;
                                    const disc = parseFloat(discVal) || 0;
                                    const amtVal = ((plan + usage) - disc).toFixed(2);
                                    const planVal = (!utilId || utilId <= 0) ? (accountInfo?.plan ?? '-') : (detail.plan || '-');
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
                                            onFocus={e => e.currentTarget.select()}
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
                                            onFocus={e => e.currentTarget.select()}
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
            <div className="w-full lg:max-w-sm space-y-6">
                <Card className="w-full md:w-72 lg:w-80 xl:w-96 h-fit shadow-none bg-stone-50 dark:bg-stone-800">
                    <CardHeader className="pb-2">
                        <CardTitle>Amount by Cost Center</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {selectedAccountId && accountInfo && (
                            <div className="mb-4">
                                <h4 className="font-semibold mb-1">Account Info</h4>
                                <div className="flex flex-col space-x-4 mb-2 text-sm text-gray-700">
                                    <div><span className="font-medium">Account Master:</span> {accountInfo.account_master}</div>
                                    <div><span className="font-medium">Provider:</span> {accountInfo.provider}</div>
                                    <div><span className="font-medium">Description:</span> {accountInfo.description}</div>
                                </div>
                            </div>
                        )}
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
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default TelcoBillForm;
