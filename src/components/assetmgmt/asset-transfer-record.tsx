'use client';
import React, { useState, useContext, useEffect } from "react";
import { AuthContext } from "@/store/AuthContext";
import { authenticatedApi } from "@/config/api";
import { Inbox, Plus, Send, MailWarning, ArrowRightFromLine, ArrowLeftToLine } from "lucide-react";
import { CustomDataGrid, ColumnDef } from "@components/ui/DataGrid";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import AssetTransferReceiveForm from "./asset-transfer-receive-form";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Arrow } from "@radix-ui/react-select";
import ExcelTransferItems from "./excel-transfer-items";


export default function AssetTranserRecords() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<string>(() => {
        if (typeof window !== "undefined") {
            return localStorage.getItem("assetTransferRecordsTab") || "applications";
        }
        return "applications";
    });
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const [showReceiveForm, setShowReceiveForm] = useState(false);
    const [receiveItem, setReceiveItem] = useState<any | null>(null);
    const [receiveTransferId, setReceiveTransferId] = useState<string | number | undefined>(undefined);
    const [receiveItemId, setReceiveItemId] = useState<string | number | undefined>(undefined);
    const updateReceiveParams = React.useCallback((transferId?: string | number, itemId?: string | number) => {
        if (!pathname) return;
        const params = new URLSearchParams(searchParams?.toString() || '');
        if (transferId && itemId) {
            params.set('receive_transfer', String(transferId));
            params.set('receive_item', String(itemId));
        } else {
            params.delete('receive_transfer');
            params.delete('receive_item');
        }
        const query = params.toString();
        const nextUrl = query ? `${pathname}?${query}` : pathname;
        router.replace(nextUrl);
    }, [pathname, router, searchParams]);

    useEffect(() => {
        if (typeof window !== "undefined") {
            localStorage.setItem("assetTransferRecordsTab", activeTab);
        }
    }, [activeTab]);

    const fetchReceiveItem = React.useCallback(async (transferId?: string | number, itemId?: string | number) => {
        if (!transferId || !itemId) return;
        try {
            const res: any = await authenticatedApi.get(
                `/api/assets/transfers/${encodeURIComponent(String(transferId))}/items/${encodeURIComponent(String(itemId))}`
            );
            setReceiveItem(res?.data?.data ?? res?.data ?? null);
        } catch (e) {
            toast.error("Failed to load transfer item details");
        }
    }, []);

    const handleRowDoubleClick = (row: any) => {
        // If this is an item row (has transfer_id and asset), open the Receive form
        if (row && (row.transfer_id || row.asset)) {
            const transferIdValue = row.transfer_id ?? row.id;
            setActiveTab("to-receive");
            setReceiveItem(row);
            setReceiveTransferId(transferIdValue);
            setReceiveItemId(row.id);
            setShowReceiveForm(true);
            fetchReceiveItem(transferIdValue, row.id);
            updateReceiveParams(transferIdValue, row.id);
            return;
        }
        // Otherwise open the parent transfer edit form on dedicated page
        if (row && (row.id || row.request_no)) {
            const editKey = row.id ?? row.request_no;
            router.push(`/assetdata/transfer/form?id=${encodeURIComponent(String(editKey))}`);
        }
    };
    const handleReceiveRowDoubleClick = (row: any) => {
        const transferIdValue = row?.transfer_id ?? row?.transfer?.id ?? row?.id;
        const itemIdValue = row?.id ?? row?.item_id;
        if (!transferIdValue || !itemIdValue) return;
        setActiveTab("to-receive");
        setReceiveItem(row);
        setReceiveTransferId(transferIdValue);
        setReceiveItemId(itemIdValue);
        setShowReceiveForm(true);
        fetchReceiveItem(transferIdValue, itemIdValue);
        updateReceiveParams(transferIdValue, itemIdValue);
    };


    const [data, setData] = useState<any[]>([]);
    const [dataBy, setDataBy] = useState<any[]>([]); // item-level rows for To Receive
    const [loading, setLoading] = useState(false);
    const [loadingBy, setLoadingBy] = useState(false);
    const [resendLoading, setResendLoading] = useState<Record<string, boolean>>({});
    const [resendAcceptanceLoading, setResendAcceptanceLoading] = useState<Record<string, boolean>>({});
    const [statusFilter, setStatusFilter] = useState<'all' | 'submitted' | 'approved' | 'completed'>('all');
    const auth = useContext(AuthContext);
    const username = auth?.authData?.user?.username;
    const fullName = auth?.authData?.user?.name || username || '-';

    const refreshTransfers = React.useCallback(() => {
        if (!username) return;
        setLoading(true);
        authenticatedApi
            .get(`/api/assets/transfers?ramco=${encodeURIComponent(username)}`)
            .then((res: any) => {
                setData(res?.data?.data || []);
            })
            .catch(() => { /* ignore */ })
            .then(() => setLoading(false));
    }, [username]);

    useEffect(() => {
        refreshTransfers();
    }, [refreshTransfers]);

    // Fetch transfer items where current user is a new owner (for bottom grid)
    const refreshTransferItems = React.useCallback(() => {
        if (!username) return;
        setLoadingBy(true);
        const urlItems = `/api/assets/transfers?new_owner=${encodeURIComponent(username)}`;
        authenticatedApi
            .get(urlItems)
            .then((res: any) => {
                const transfers = res?.data?.data || [];
                const flattened = Array.isArray(transfers)
                    ? transfers.flatMap((t: any) => {
                        const items = Array.isArray(t?.items) ? t.items : [];
                        return items.map((item: any) => ({
                            ...item,
                            transfer_id: t?.id,
                            transfer_by: t?.transfer_by,
                            approval_status: t?.approval_status,
                            approval_date: t?.approved_date || t?.approval_date,
                            approved_date: t?.approved_date || t?.approval_date,
                            transfer_date: t?.transfer_date,
                        }));
                    })
                    : [];
                setDataBy(flattened);
            })
            .catch(() => { /* ignore */ })
            .then(() => setLoadingBy(false));
    }, [username]);

    useEffect(() => {
        refreshTransferItems();
    }, [refreshTransferItems]);

    const handleResendApproval = async (transferId?: string | number) => {
        if (!transferId) return;
        const key = String(transferId);
        setResendLoading(prev => ({ ...prev, [key]: true }));
        try {
            await authenticatedApi.post(`/api/assets/transfers/${encodeURIComponent(String(transferId))}/resend-approval-notification`);
            toast.success('Approval email sent to supervisor/HOD.');
        } catch (e) {
            toast.error('Failed to resend approval email.');
        } finally {
            setResendLoading(prev => ({ ...prev, [key]: false }));
        }
    };

    const handleResendAcceptance = async (transferId?: string | number) => {
        if (!transferId) return;
        const key = String(transferId);
        setResendAcceptanceLoading(prev => ({ ...prev, [key]: true }));
        try {
            await authenticatedApi.post(`/api/assets/transfers/${encodeURIComponent(String(transferId))}/resend-acceptance-notification`);
            toast.success('Acceptance email sent to new owner.');
        } catch (e) {
            toast.error('Failed to resend acceptance email.');
        } finally {
            setResendAcceptanceLoading(prev => ({ ...prev, [key]: false }));
        }
    };

    const refreshAll = React.useCallback(() => {
        refreshTransfers();
        refreshTransferItems();
    }, [refreshTransfers, refreshTransferItems]);

    // Precompute filtered datasets so hooks order remains stable
    const transferToRows = React.useMemo(() => {
        const me = String(username || '');
        // Rows I initiated (make asset transfer to new owner)
        return (data || []).filter((row: any) => String(row?.transfer_by?.ramco_id || '') === me);
    }, [data, username]);

    const transferByRows = React.useMemo(() => {
        // Backend already filters by new_owner=me; show all returned items
        return Array.isArray(dataBy) ? dataBy : [];
    }, [dataBy]);
    const filteredTransferToRows = React.useMemo(() => {
        if (statusFilter === 'all') return transferToRows;
        return transferToRows.filter((row: any) => computeTransferStatus(row).state === statusFilter);
    }, [statusFilter, transferToRows]);

    // Base renderers
    const renderNewOwners = (row: any) => {
        if (!Array.isArray(row?.new_owner) || row.new_owner.length === 0) return "-";
        // Deduplicate owners (multiple items may reference the same person)
        const labels = row.new_owner
            .map((n: any) => n.full_name || n.name || n.ramco_id)
            .filter(Boolean);
        const unique = Array.from(new Set(labels));
        return unique.join(", ");
    };
    const renderDate = (row: any) => row.acceptance_date ? new Date(row.acceptance_date).toLocaleDateString() : "-";

    // Format: d/m/yyyy h:mm am/pm
    const formatApplicationDate = (value: any) => {
        if (!value) return "-";
        const d = new Date(value);
        if (isNaN(d.getTime())) return "-";
        const day = d.getDate();
        const month = d.getMonth() + 1;
        const year = d.getFullYear();
        let hours = d.getHours();
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const ampm = hours >= 12 ? 'pm' : 'am';
        hours = hours % 12;
        if (hours === 0) hours = 12;
        return `${day}/${month}/${year} ${hours}:${minutes} ${ampm}`;
    };
    const renderApplicationDate = (row: any) => formatApplicationDate(row.transfer_date);
    const renderAcceptanceStatus = (row: any) => {
        const acceptedDate = row?.acceptance_date ? new Date(row.acceptance_date) : null;
        const approvalDate = row?.approval_date ? new Date(row.approval_date) : null;
        const approvalStatus = String(row?.approval_status || '').toLowerCase();

        if (acceptedDate && !isNaN(acceptedDate.getTime())) {
            const when = acceptedDate.toLocaleString();
            return (
                <div className="flex items-center">
                    <Badge className="truncate bg-green-600 hover:bg-green-700 text-white">Accepted{when && <span className="pl-1">on {when}</span>}</Badge>
                </div>
            );
        }

        if (approvalStatus.includes('reject')) {
            return <Badge className="truncate bg-red-600 hover:bg-red-700 text-white">Rejected</Badge>;
        }

        const isApproved = (approvalDate && !isNaN(approvalDate.getTime())) || approvalStatus.includes('approve');
        if (isApproved) {
            return <Badge variant="secondary" className="truncate bg-sky-500 hover:bg-sky-600 text-white">Pending Acceptance</Badge>;
        }

        return <Badge variant="secondary" className="truncate bg-amber-500 hover:bg-amber-600 text-white">Pending Approval</Badge>;
    };

    function computeTransferStatus(row: any) {
        const approvalStatus = String(row?.approval_status || '').toLowerCase();
        const approvedDate = row?.approved_date ? new Date(row.approved_date) : null;
        const items = Array.isArray(row?.items) ? row.items : [];
        const allItemsAccepted = items.length > 0 && items.every((item: any) => item?.acceptance_by && item?.acceptance_date);
        const latestAcceptanceDate = (() => {
            const dates = items
                .map((item: any) => (item?.acceptance_date ? new Date(item.acceptance_date) : null))
                .filter((d: Date | null) => d && !isNaN(d.getTime()));
            if (!dates.length) return null;
            return new Date(Math.max(...dates.map((d: Date) => d.getTime())));
        })();
        const hasApprovedDate = approvedDate && !isNaN(approvedDate.getTime());
        const isComplete = Boolean(row?.approval_status && row?.approved_by && row?.approved_date && allItemsAccepted);

        if (isComplete) {
            return { state: 'completed' as const, date: latestAcceptanceDate || approvedDate || null };
        }
        if (approvalStatus.includes('reject')) {
            return { state: 'rejected' as const, date: approvedDate && !isNaN(approvedDate.getTime()) ? approvedDate : null };
        }
        if (hasApprovedDate) {
            return { state: 'approved' as const, date: approvedDate };
        }
        return { state: 'submitted' as const, date: null };
    }

    const renderTransferStatus = (row: any) => {
        const { state, date } = computeTransferStatus(row);
        const whenLabel = date && !isNaN(date.getTime()) ? date.toLocaleDateString() : null;

        if (state === 'completed') {
            return (
                <div className="flex items-center">
                    <Badge className="truncate bg-emerald-600 hover:bg-emerald-700 text-white">
                        Completed {whenLabel ? <span className="pl-1">on {whenLabel}</span> : null}
                    </Badge>
                </div>
            );
        }

        if (state === 'rejected') {
            return <Badge className="truncate bg-red-600 hover:bg-red-700 text-white">Rejected</Badge>;
        }

        if (state === 'approved') {
            return (
                <div className="flex items-center">
                    <Badge className="truncate bg-green-600 hover:bg-green-700 text-white">
                        Approved {whenLabel ? <span className="pl-1">on {whenLabel}</span> : null}
                    </Badge>
                </div>
            );
        }
        return <Badge variant="secondary" className="truncate bg-amber-500 hover:bg-amber-600 text-white">Pending Approval</Badge>;
    };

    // Columns per grid
    const columnsTransferTo: ColumnDef<any>[] = [
        { key: "id", header: "Transfer ID" },
        { key: "new_owner", header: "New Owner", filter: 'input', render: renderNewOwners },
        { key: "total_items", header: "Items", render: row => row.total_items ?? 0 },
        { key: "transfer_date", header: "Application Date", render: renderApplicationDate },
        { key: "approval_status", header: "Transfer Status", render: renderTransferStatus },
        {
            key: "actions",
            header: "Actions",
            render: (row) => {
                const transferId = row?.id;
                if (!transferId) return null;
                const busy = resendLoading[String(transferId)];
                return (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-blue-600 hover:text-blue-700"
                        disabled={busy}
                        onClick={() => handleResendApproval(transferId)}
                        title="Resend approval email to supervisor/HOD"
                    >
                        {busy ? 'Sending…' : <MailWarning className="w-4 h-4" />}
                    </Button>
                );
            }
        },
    ];

    // Item ordinal lookup per transfer (e.g., 1/2, 2/2)
    const itemOrdinalLookup = React.useMemo(() => {
        const byTransfer = new Map<string, any[]>();
        (transferByRows || []).forEach((row: any) => {
            const tid = row?.transfer_id ?? row?.transfer?.id;
            if (tid === undefined || tid === null) return;
            const key = String(tid);
            if (!byTransfer.has(key)) byTransfer.set(key, []);
            byTransfer.get(key)!.push(row);
        });
        const lookup: Record<string, string> = {};
        byTransfer.forEach((rows, tid) => {
            const sorted = [...rows].sort((a, b) => Number(a?.id ?? 0) - Number(b?.id ?? 0));
            const total = sorted.length || 1;
            sorted.forEach((r, idx) => {
                lookup[String(r.id)] = `${idx + 1}/${total}`;
            });
        });
        return lookup;
    }, [transferByRows]);

    // Restore receive form from URL params on load/refresh
    useEffect(() => {
        const paramTransfer = searchParams?.get('receive_transfer');
        const paramItem = searchParams?.get('receive_item');
        if (!paramTransfer || !paramItem) return;
        setActiveTab("to-receive");
        const foundRow = transferByRows.find(r => String(r.id) === String(paramItem));
        const transferIdValue = foundRow?.transfer_id ?? foundRow?.id ?? paramTransfer;
        setReceiveItem(foundRow || null);
        setReceiveTransferId(transferIdValue);
        setReceiveItemId(paramItem);
        setShowReceiveForm(true);
        fetchReceiveItem(transferIdValue, paramItem);
    }, [searchParams, transferByRows, fetchReceiveItem]);

    const columnsTransferByItems: ColumnDef<any>[] = [
        { key: "transfer_id", header: "Transfer ID" },
        { key: "id", header: "Items", render: row => itemOrdinalLookup[String(row.id)] || row.id },
        { key: "transfer_by", header: "Transfer By", colClass: "truncate", filter: 'input', render: row => row.transfer_by?.full_name || row.transfer_by?.name || row.transfer_by?.ramco_id || "-" },
        { key: "transfer_date", header: "Application Date", render: renderApplicationDate },
        { key: "type", header: "Type", filter: 'singleSelect', render: row => row.asset?.type?.name || row.type?.name || "-" },
        { key: "asset", header: "Register Number", render: row => row.asset?.register_number || row.asset?.id || "-" },
        { key: "current_owner", header: "Current Owner", render: row => row.current_owner?.full_name || row.current_owner?.name || row.current_owner?.ramco_id || "-" },
        { key: "effective_date", header: "Effective Date", render: row => row.effective_date ? new Date(row.effective_date).toLocaleDateString() : "-" },
        { key: "status", header: "Status", render: renderAcceptanceStatus },
        {
            key: "actions",
            header: "Actions",
            render: (row) => {
                const transferId = row?.transfer_id ?? row?.transfer?.id;
                if (!transferId) return null;
                const busy = resendAcceptanceLoading[String(transferId)];
                return (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-blue-600 hover:text-blue-700"
                        disabled={busy}
                        onClick={() => handleResendAcceptance(transferId)}
                        title="Resend acceptance email to new owner"
                    >
                        {busy ? 'Sending…' : <MailWarning className="w-4 h-4" />}
                    </Button>
                );
            },
        },
    ];

    // Summary counts for each status
    const summary = React.useMemo(() => {
        const counts: Record<'submitted' | 'approved' | 'completed', number> = { submitted: 0, approved: 0, completed: 0 };
        transferToRows.forEach((row: any) => {
            const { state } = computeTransferStatus(row);
            if (state === 'completed') counts.completed++;
            else if (state === 'approved') counts.approved++;
            else counts.submitted++;
        });
        return counts;
    }, [transferToRows]);
    const totalApplications = transferToRows.length;
    const toggleFilter = (status: 'submitted' | 'approved' | 'completed') => {
        setStatusFilter(prev => (prev === status ? 'all' : status));
    };

    // Counters for pending actions
    const hasValidDate = (value: any) => {
        if (!value) return false;
        const d = new Date(value);
        return !isNaN(d.getTime());
    };
    const isApproved = (row: any) => hasValidDate(row?.approval_date) || String(row?.approval_status || '').toLowerCase().includes('approve');
    const isAccepted = (row: any) => hasValidDate(row?.acceptance_date);
    const isRejected = (row: any) => String(row?.approval_status || '').toLowerCase().includes('reject');
    const pendingApprovalCount = React.useMemo(() => {
        return transferToRows.reduce((count, row) => count + (hasValidDate(row?.approved_date) ? 0 : 1), 0);
    }, [transferToRows]);
    const pendingToReceiveApprovalCount = React.useMemo(() => {
        return transferByRows.reduce((count, row) => {
            if (isAccepted(row) || isRejected(row)) return count;
            return isApproved(row) ? count : count + 1;
        }, 0);
    }, [transferByRows]);
    const pendingAcceptanceCount = React.useMemo(() => {
        return transferByRows.reduce((count, row) => {
            if (isAccepted(row) || isRejected(row)) return count;
            return isApproved(row) ? count + 1 : count;
        }, 0);
    }, [transferByRows]);

    if (showReceiveForm) {
        // Use the list from /api/assets/transfers/items?new_owner={username}
        // Navigate strictly by ascending item id
        const rowsSorted = [...transferByRows].sort((a: any, b: any) => Number(a?.id ?? 0) - Number(b?.id ?? 0));
        const currentId = receiveItemId ?? receiveItem?.id;
        const currentIndex = rowsSorted.findIndex((r: any) => String(r.id) === String(currentId ?? ''));
        const prevRow = currentIndex > 0 ? rowsSorted[currentIndex - 1] : null;
        const nextRow = currentIndex >= 0 && currentIndex < rowsSorted.length - 1 ? rowsSorted[currentIndex + 1] : null;
        const goPrev = prevRow ? () => {
            const transferIdValue = prevRow.transfer_id ?? prevRow.id;
            setReceiveItem(prevRow);
            setReceiveTransferId(transferIdValue);
            setReceiveItemId(prevRow.id);
            fetchReceiveItem(transferIdValue, prevRow.id);
            updateReceiveParams(transferIdValue, prevRow.id);
        } : undefined;
        const goNext = nextRow ? () => {
            const transferIdValue = nextRow.transfer_id ?? nextRow.id;
            setReceiveItem(nextRow);
            setReceiveTransferId(transferIdValue);
            setReceiveItemId(nextRow.id);
            fetchReceiveItem(transferIdValue, nextRow.id);
            updateReceiveParams(transferIdValue, nextRow.id);
        } : undefined;
        return (
            <div className="py-4">
                <AssetTransferReceiveForm
                    item={receiveItem}
                    transferId={receiveTransferId}
                    itemId={receiveItemId}
                    onPrev={goPrev}
                    onNext={goNext}
                    prevDisabled={!prevRow}
                    nextDisabled={!nextRow}
                    onClose={() => {
                        setShowReceiveForm(false);
                        setReceiveItem(null);
                        setReceiveTransferId(undefined);
                        setReceiveItemId(undefined);
                        updateReceiveParams(undefined, undefined);
                    }}
                    onAccepted={() => {
                        refreshTransferItems();
                        setShowReceiveForm(false);
                        setReceiveItem(null);
                        setReceiveTransferId(undefined);
                        setReceiveItemId(undefined);
                        updateReceiveParams(undefined, undefined);
                    }}
                    onDirtyChange={() => { /* no-op for now */ }}
                />
            </div>
        );
    }

    return (
        <>
            <div className="mb-6">
                <h2 className="text-2xl font-bold">Asset Transfer Management</h2>
            </div>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                <Card
                    role="button"
                    tabIndex={0}
                    onClick={() => toggleFilter('submitted')}
                    className={`cursor-pointer transition bg-stone-100 ${statusFilter === 'submitted' ? 'ring-2 ring-blue-500' : 'ring-0'}`}
                >
                    <CardHeader>
                        <CardTitle className="text-sm font-medium">Submitted</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-gray-700 dark:text-gray-200">
                            {summary.submitted} / {totalApplications}
                        </div>
                    </CardContent>
                </Card>
                <Card
                    role="button"
                    tabIndex={0}
                    onClick={() => toggleFilter('approved')}
                    className={`cursor-pointer transition bg-stone-100 ${statusFilter === 'approved' ? 'ring-2 ring-green-500' : 'ring-0'}`}
                >
                    <CardHeader>
                        <CardTitle className="text-sm font-medium">Approved</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-gray-700 dark:text-gray-200">
                            {summary.approved} / {totalApplications}
                        </div>
                    </CardContent>
                </Card>
                <Card
                    role="button"
                    tabIndex={0}
                    onClick={() => toggleFilter('completed')}
                    className={`cursor-pointer transition bg-stone-100 ${statusFilter === 'completed' ? 'ring-2 ring-emerald-500' : 'ring-0'}`}
                >
                    <CardHeader>
                        <CardTitle className="text-sm font-medium">Completed</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-gray-700 dark:text-gray-200">
                            {summary.completed} / {totalApplications}
                        </div>
                    </CardContent>
                </Card>
            </div>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList className="w-full justify-start overflow-x-auto">
                    <TabsTrigger value="applications" className="flex items-center gap-2">
                        <ArrowRightFromLine className="h-4 w-4" />
                        <span>Transfers</span>
                        {pendingApprovalCount > 0 && (
                            <Badge variant="secondary" className="ml-1 h-5 px-2 rounded-full bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold">
                                {pendingApprovalCount}
                            </Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="to-receive" className="flex items-center gap-2">
                        <ArrowLeftToLine className="h-4 w-4" />
                        <span>To Receive</span>
                        {pendingToReceiveApprovalCount > 0 && (
                            <Badge variant="secondary" className="ml-1 h-5 px-2 rounded-full bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold">
                                {pendingToReceiveApprovalCount}
                            </Badge>
                        )}
                        {pendingAcceptanceCount > 0 && (
                            <Badge variant="secondary" className="ml-1 h-5 px-2 rounded-full bg-sky-500 hover:bg-sky-600 text-white text-xs font-semibold">
                                {pendingAcceptanceCount}
                            </Badge>
                        )}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="applications" className="space-y-3">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-bold">Transfered by <span className="capitalize"> {fullName}</span></h2>
                        <Button
                            type="button"
                            variant="default"
                            size="sm"
                            title="Create New Asset Transfer"
                            onClick={() => { router.push('/assetdata/transfer/form'); }}
                        >
                            <Plus className="w-5 h-5" />
                        </Button>
                    </div>
                    <CustomDataGrid
                        columns={columnsTransferTo}
                        data={filteredTransferToRows}
                        pagination={false}
                        inputFilter={false}
                        onRowDoubleClick={handleRowDoubleClick}
                    />
                </TabsContent>

                <TabsContent value="to-receive" className="space-y-3">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-bold">To Receive by  <span className="capitalize"> {fullName}</span></h2>
                        <ExcelTransferItems items={transferByRows} />
                    </div>
                    <CustomDataGrid
                        columns={columnsTransferByItems}
                        data={transferByRows}
                        pagination={false}
                        inputFilter={false}
                        onRowDoubleClick={handleReceiveRowDoubleClick}
                    />
                </TabsContent>
            </Tabs>
        </>
    );
}
