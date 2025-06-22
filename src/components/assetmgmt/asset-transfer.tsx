'use client';
import React, { useState, useContext, useEffect } from "react";
import { AuthContext } from "@/store/AuthContext";
import { authenticatedApi } from "@/config/api";
import { Plus } from "lucide-react";
import { CustomDataGrid, ColumnDef } from "@components/ui/DataGrid";
import { Button } from "@/components/ui/button";


export default function AssetTransfer() {

    const handleRowDoubleClick = (row: any) => {
        // Open the asset transfer form in a new blank tab for editing
        if (row && row.id) {
            window.open(`/assetdata/transfer/form?id=${row.id}`, '_blank');
        } else if (row && row.request_no) {
            // Fallback if your backend uses request_no as the unique identifier
            window.open(`/assetdata/transfer/form?id=${row.request_no}`, '_blank');
        }
    };


    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setLoading(true);
        authenticatedApi.get("/api/assets/transfer-requests").then((res: any) => {
            setData(res?.data?.data || []);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    const columns: ColumnDef<any>[] = [
        { key: "request_no", header: "Request No" },
        { key: "requestor", header: "Requestor", render: row => row.requestor?.name || "-" },
        { key: "requestor_department", header: "Department", render: row => row.requestor?.department?.name || "-" },
        { key: "requestor_location", header: "Location (District)", render: row => row.requestor?.district?.name || "-" },
        { key: "items_count", header: "Items Count", render: row => row.items?.length || 0 },
        { key: "request_date", header: "Request Date", render: row => row.request_date ? new Date(row.request_date).toLocaleDateString() : "-" },
        { key: "verified_date", header: "Verified Date", render: row => row.verified_date ? new Date(row.verified_date).toLocaleDateString() : "-" },
        { key: "approval_date", header: "Approval Date", render: row => row.approval_date ? new Date(row.approval_date).toLocaleDateString() : "-" },
        { key: "request_status", header: "Status" },
    ];

    return (
        <div className="mt-4">
            <div className="flex justify-between items-center mb-2">
                <h2 className="text-xl font-bold">Asset Transfer Requests</h2>
                <Button
                    type="button"
                    variant="default"
                    size="sm"
                    title="Create New Asset Transfer"
                    onClick={() => window.open('/assetdata/transfer/form', '_blank')}
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