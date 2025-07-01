'use client';
import React, { useState, useContext, useEffect } from "react";
import { AuthContext } from "@/store/AuthContext";
import { authenticatedApi } from "@/config/api";
import { Plus } from "lucide-react";
import { CustomDataGrid, ColumnDef } from "@components/ui/DataGrid";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
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

    // Summary counts for each status
    const summary = React.useMemo(() => {
        const counts = { draft: 0, submitted: 0, approved: 0, completed: 0 };
        data.forEach((row: any) => {
            const status = (row.request_status || '').toLowerCase();
            if (status.includes('draft')) counts.draft++;
            else if (status.includes('submit')) counts.submitted++;
            else if (status.includes('approve')) counts.approved++;
            else if (status.includes('complete')) counts.completed++;
        });
        return counts;
    }, [data]);

    return (
        <div className="mt-4">
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