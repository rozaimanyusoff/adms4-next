'use client';
import React, { useState, useContext, useEffect } from "react";
import { AuthContext } from "@/store/AuthContext";
import { authenticatedApi } from "@/config/api";
import { Plus } from "lucide-react";
import { CustomDataGrid, ColumnDef } from "@components/ui/DataGrid";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import AssetTransferReceiveForm from "./asset-transfer-receive-form";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";


export default function AssetTransfer() {
    const router = useRouter();
    const [showReceiveForm, setShowReceiveForm] = useState(false);
    const [receiveItem, setReceiveItem] = useState<any | null>(null);
    const [receiveTransferId, setReceiveTransferId] = useState<string | number | undefined>(undefined);
    const [receiveItemId, setReceiveItemId] = useState<string | number | undefined>(undefined);

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
            setReceiveItem(row);
            setReceiveTransferId(transferIdValue);
            setReceiveItemId(row.id);
            setShowReceiveForm(true);
            fetchReceiveItem(transferIdValue, row.id);
            return;
        }
        // Otherwise open the parent transfer edit form on dedicated page
        if (row && (row.id || row.request_no)) {
            const editKey = row.id ?? row.request_no;
            router.push(`/assetdata/transfer/form?id=${encodeURIComponent(String(editKey))}`);
        }
    };


    const [data, setData] = useState<any[]>([]);
    const [dataBy, setDataBy] = useState<any[]>([]); // item-level rows for To Receive
    const [loading, setLoading] = useState(false);
    const [loadingBy, setLoadingBy] = useState(false);
    const auth = useContext(AuthContext);
    const username = auth?.authData?.user?.username;

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
        const urlItems = `/api/assets/transfers/items?new_owner=${encodeURIComponent(username)}`;
        authenticatedApi
            .get(urlItems)
            .then((res: any) => {
                setDataBy(res?.data?.data || []);
            })
            .catch(() => { /* ignore */ })
            .then(() => setLoadingBy(false));
    }, [username]);

    useEffect(() => {
        refreshTransferItems();
    }, [refreshTransferItems]);

    const refreshAll = React.useCallback(() => {
        refreshTransfers();
        refreshTransferItems();
    }, [refreshTransfers, refreshTransferItems]);

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
        if (row?.acceptance_date) {
            const d = new Date(row.acceptance_date);
            const when = isNaN(d.getTime()) ? '' : d.toLocaleString();
            return (
                <div className="flex items-center">
                    <Badge className="truncate bg-green-600 hover:bg-green-700 text-white">Accepted{when && <span className="pl-1">on {when}</span>}</Badge>

                </div>
            );
        }
        return <Badge variant="secondary" className="truncate bg-amber-500 hover:bg-amber-600 text-white">Pending Acceptance</Badge>;
    };

    const renderApprovalStatus = (row: any) => {
        const approvedDate = row?.approved_date ? new Date(row.approved_date) : null;
        const approvedBy = row?.approved_by?.full_name || row?.approved_by?.name || row?.approved_by || '';
        if (approvedDate && !isNaN(approvedDate.getTime())) {
            const when = approvedDate.toLocaleDateString();
            return (
                <div className="flex items-center">
                    <Badge className="truncate bg-green-600 hover:bg-green-700 text-white">
                        Approved {when ? <span className="pl-1">on {when}</span> : null}
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
        { key: "approval_status", header: "Approval Status", render: renderApprovalStatus },
        { key: "transfer_status", header: "Status" },
    ];

    const columnsTransferByItems: ColumnDef<any>[] = [
        { key: "id", header: "Item ID" },
        { key: "transfer_id", header: "Transfer ID" },
        { key: "transfer_by", header: "Transfer By", colClass: "truncate", filter: 'input', render: row => row.transfer_by?.full_name || row.transfer_by?.name || row.transfer_by?.ramco_id || "-" },
        { key: "type", header: "Type", filter: 'singleSelect', render: row => row.type?.name || "-" },
        { key: "asset", header: "Register Number", render: row => row.asset?.register_number || row.asset?.id || "-" },
        { key: "current_owner", header: "Current Owner", render: row => row.current_owner?.full_name || row.current_owner?.name || row.current_owner?.ramco_id || "-" },
        { key: "effective_date", header: "Effective Date", render: row => row.effective_date ? new Date(row.effective_date).toLocaleDateString() : "-" },
        { key: "status", header: "Status", render: renderAcceptanceStatus },
    ];

    // Summary counts for each status
    const summary = React.useMemo(() => {
        const counts = { draft: 0, submitted: 0, approved: 0, completed: 0 } as Record<string, number>;
        data.forEach((row: any) => {
            const status = (row.transfer_status || '').toLowerCase();
            if (status.includes('draft')) counts.draft++;
            else if (status.includes('submit')) counts.submitted++;
            else if (status.includes('approve')) counts.approved++;
            else if (status.includes('complete')) counts.completed++;
        });
        return counts;
    }, [data]);

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
        } : undefined;
        const goNext = nextRow ? () => {
            const transferIdValue = nextRow.transfer_id ?? nextRow.id;
            setReceiveItem(nextRow);
            setReceiveTransferId(transferIdValue);
            setReceiveItemId(nextRow.id);
            fetchReceiveItem(transferIdValue, nextRow.id);
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
                    onClose={() => { setShowReceiveForm(false); setReceiveItem(null); setReceiveTransferId(undefined); setReceiveItemId(undefined); }}
                    onAccepted={() => {
                        refreshTransferItems();
                        setShowReceiveForm(false);
                        setReceiveItem(null);
                        setReceiveTransferId(undefined);
                        setReceiveItemId(undefined);
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium">Draft</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-gray-700 dark:text-gray-200">{summary.draft}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium">Submitted</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-gray-700 dark:text-gray-200">{summary.submitted}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium">Approved</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-gray-700 dark:text-gray-200">{summary.approved}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium">Completed</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-gray-700 dark:text-gray-200">{summary.completed}</div>
                    </CardContent>
                </Card>
            </div>
            {/* Transfer To (initiated by me) */}
            <div className="flex justify-between items-center mb-2">
                <h2 className="text-xl font-bold">Transfer Application</h2>
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
                data={transferToRows}
                pagination={false}
                inputFilter={false}
                onRowDoubleClick={handleRowDoubleClick}
            />

            {/* Transfer By (requests from others to me) */}
            <div className="flex justify-between items-center mt-8 mb-2">
                <h2 className="text-xl font-bold">Asset To Receive</h2>
            </div>
            <CustomDataGrid
                columns={columnsTransferByItems}
                data={transferByRows}
                pagination={false}
                inputFilter={false}
                onRowDoubleClick={handleRowDoubleClick}
            />
        </>
    );
}
