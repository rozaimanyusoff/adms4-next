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
        if (row && (row.id || row.request_no)) {
            setEditId(row.id ?? row.request_no);
            setShowForm(true);
        }
    };


    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
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

    const columns: ColumnDef<any>[] = [
        { key: "id", header: "ID" },
        { key: "transfer_by", header: "Transfer By", render: row => row.transfer_by?.full_name || row.transfer_by?.ramco_id || "-" },
        { key: "department", header: "Department", render: row => row.department?.code || row.department?.name || row.department_id || "-" },
        { key: "costcenter", header: "Cost Center", render: row => row.costcenter?.name || row.costcenter_id || "-" },
        { key: "new_owner", header: "New Owner", render: row => Array.isArray(row.new_owner) && row.new_owner.length > 0 ? row.new_owner.map((n: any) => n.full_name || n.ramco_id).join(", ") : "-" },
        { key: "total_items", header: "Items", render: row => row.total_items ?? 0 },
        { key: "transfer_date", header: "Transfer Date", render: row => row.transfer_date ? new Date(row.transfer_date).toLocaleDateString() : "-" },
        { key: "transfer_status", header: "Status" },
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

    if (showForm) {
        return (
            <div className="p-4">
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
        <div className="p-4">
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
            <div className="flex justify-between items-center mb-2">
                <h2 className="text-xl font-bold">Asset Transfer Requests</h2>
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
                columns={columns}
                data={data}
                inputFilter={false}
                onRowDoubleClick={handleRowDoubleClick}
            />
        </div>
    );
}
