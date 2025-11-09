'use client';
import React, { useState, useContext, useEffect } from "react";
import { AuthContext } from "@/store/AuthContext";
import { authenticatedApi } from "@/config/api";
import { Plus } from "lucide-react";
import { CustomDataGrid, ColumnDef } from "@components/ui/DataGrid";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import AssetTransferForm from "./asset-transfer-form";


export default function AssetTransfer() {
    const [showForm, setShowForm] = useState(false);
    const [editId, setEditId] = useState<string | number | undefined>(undefined);
    const [formDirty, setFormDirty] = useState(false);
    const [confirmBackOpen, setConfirmBackOpen] = useState(false);

    const handleRowDoubleClick = (row: any) => {
        // Open the asset transfer form inline for editing
        // Prefer parent transfer id if present (for item-level rows)
        const parentId = row?.transfer_id ?? row?.id ?? row?.request_no;
        if (row && parentId) {
            setEditId(parentId);
            setShowForm(true);
        }
    };


    const [data, setData] = useState<any[]>([]);
    const [dataBy, setDataBy] = useState<any[]>([]); // item-level rows for To Receive
    const [loading, setLoading] = useState(false);
    const [loadingBy, setLoadingBy] = useState(false);
    const auth = useContext(AuthContext);
    const username = auth?.authData?.user?.username;

    useEffect(() => {
        if (!username) return;
        setLoading(true);
        authenticatedApi
            .get(`/api/assets/transfers?ramco=${encodeURIComponent(username)}`)
            .then((res: any) => {
                setData(res?.data?.data || []);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [username]);

    // Fetch transfer items where current user is a new owner (for bottom grid)
    useEffect(() => {
        if (!username) return;
        setLoadingBy(true);
        const urlItems = `/api/assets/transfers/items?new_owner=${encodeURIComponent(username)}`;
        authenticatedApi
            .get(urlItems)
            .then((res: any) => {
                setDataBy(res?.data?.data || []);
            })
            .catch(() => {
                // ignore errors but ensure loader is hidden
            })
            .then(() => setLoadingBy(false));
    }, [username]);

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
    const renderDate = (row: any) => row.transfer_date ? new Date(row.transfer_date).toLocaleDateString() : "-";

    // Columns per grid
    const columnsTransferTo: ColumnDef<any>[] = [
        { key: "id", header: "ID" },
        { key: "new_owner", header: "New Owner", filter: 'input', render: renderNewOwners },
        { key: "total_items", header: "Items", render: row => row.total_items ?? 0 },
        { key: "transfer_date", header: "Transfer Date", render: renderDate },
        { key: "transfer_status", header: "Status" },
    ];

    const columnsTransferByItems: ColumnDef<any>[] = [
        { key: "id", header: "Item ID" },
        { key: "transfer_id", header: "Transfer ID" },
        { key: "transfer_by", header: "Transfer By", filter: 'input', render: row => row.transfer_by?.full_name || row.transfer_by?.name || row.transfer_by?.ramco_id || "-" },
        { key: "type", header: "Type", filter: 'singleSelect', render: row => row.type?.name || "-" },
        { key: "asset", header: "Register Number", render: row => row.asset?.register_number || row.asset?.id || "-" },
        { key: "current_owner", header: "Current Owner", render: row => row.current_owner?.full_name || row.current_owner?.name || row.current_owner?.ramco_id || "-" },
        { key: "effective_date", header: "Effective Date", render: row => row.effective_date ? new Date(row.effective_date).toLocaleDateString() : "-" },
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

    if (showForm) {
        return (
            <div className="py-4">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold">Asset Transfer Form</h2>
                    {/* Back button with unsaved changes confirmation */}
                    <>
                        <Button
                            type="button"
                            variant="outline"
                            className="ring-1 ring-red-500"
                            size="sm"
                            onClick={() => {
                                if (formDirty) setConfirmBackOpen(true);
                                else { setShowForm(false); setEditId(undefined); }
                            }}
                        >
                            Back to Requests
                        </Button>
                    </>
                </div>
                {/* Confirm dialog */}
                <div>
                    {confirmBackOpen && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
                            <div className="bg-white rounded shadow-lg p-4 w-full max-w-sm">
                                <div className="font-semibold mb-2">Leave Form?</div>
                                <div className="text-sm text-gray-600 mb-4">You have unsaved changes. Are you sure you want to go back?</div>
                                <div className="flex justify-end gap-2">
                                    <button className="px-3 py-2 rounded border" onClick={() => setConfirmBackOpen(false)}>Stay</button>
                                    <button
                                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded"
                                        onClick={() => { setConfirmBackOpen(false); setShowForm(false); setEditId(undefined); }}
                                    >
                                        Leave
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                <AssetTransferForm id={editId} onClose={() => { setShowForm(false); setEditId(undefined); }} onDirtyChange={setFormDirty} />
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
                <h2 className="text-xl font-bold">Transfer To</h2>
                <Button
                    type="button"
                    variant="default"
                    size="sm"
                    title="Create New Asset Transfer"
                    onClick={() => { setEditId(undefined); setShowForm(true); }}
                >
                    <Plus className="w-5 h-5" />
                </Button>
            </div>
            <CustomDataGrid
                columns={columnsTransferTo}
                data={transferToRows}
                inputFilter={false}
                onRowDoubleClick={handleRowDoubleClick}
            />

            {/* Transfer By (requests from others to me) */}
            <div className="flex justify-between items-center mt-8 mb-2">
                <h2 className="text-xl font-bold">To Received</h2>
            </div>
            <CustomDataGrid
                columns={columnsTransferByItems}
                data={transferByRows}
                inputFilter={false}
                onRowDoubleClick={handleRowDoubleClick}
            />
        </>
    );
}
