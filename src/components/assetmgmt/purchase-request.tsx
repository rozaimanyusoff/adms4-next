'use client';
import React, { useState, useContext, useEffect } from "react";
import { authenticatedApi } from "@/config/api";
import Link from "next/link";
import { Plus } from "lucide-react";
import { CustomDataGrid, ColumnDef } from "@components/ui/DataGrid";
import { Button } from "@/components/ui/button";


export interface PurchaseRequestDetail {
    id: number;
    pr_id: number;
    item_desc: string;
    quantity: number;
    priority: number;
    justification: string;
    applicant_hod_id: number | null;
    applicant_hod_verification: number | null;
    applicant_hod_verification_date: string | null;
    applicant_hod_verification_remarks: string | null;
    delivery_location: string | null;
    assetmgr_id: number | null;
    assetmgr_remarks: string | null;
    assetmgr_hod_approval: number;
    assetmgr_hod_approval_date: string | null;
    procurement_id: number | null;
    preferred_vendor: string | null;
    preferred_quotation: string | null;
    po_no: string | null;
    uploaded_po: string | null;
    procurement_hod_approval: number | null;
    procurement_hod_approval_date: string | null;
    delivery_date: string | null;
    delivery_status: number;
    finance_id: number | null;
    finance_payment_date: string | null;
    finance_payment_status: number;
    uploaded_payment: string | null;
    type: { id: number; name: string };
    category: { id: number; name: string };
}

export interface PurchaseRequestData {
    id: number;
    req_no: string;
    req_date: string;
    required_date: string;
    purpose: string;
    remarks: string;
    verified_by: string | null;
    verification_status: number | null;
    verification_date: string | null;
    approved_by: string | null;
    req_status: number;
    requestor: { ramco_id: string; name: string };
    department: { id: number; name: string };
    costcenter: { id: number; name: string };
    district: { id: number; name: string };
    total_items: number;
    details: PurchaseRequestDetail[];
}

export default function PurchaseRequest() {

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
        authenticatedApi.get("/api/purchase").then((res: any) => {
            const rows = (res?.data?.data || []).map((row: any, idx: number) => ({ ...row, row_number: idx + 1 }));
            setData(rows);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    const columns: ColumnDef<any>[] = [
        { key: "row_number", header: "#", render: row => row.row_number },
        { key: "request_type", header: "Type", render: row => row.request_type ? row.request_type.toUpperCase() : "-" },
        { key: "request_reference", header: "Reference" },
        { key: "requestor", header: "Requestor", render: row => row.requestor?.full_name || "-" },
        { key: "costcenter", header: "Cost Center", render: row => row.costcenter?.name || "-" },
        { key: "department", header: "Department", render: row => row.department?.name || "-" },
        { key: "po_no", header: "PO No" },
        { key: "do_no", header: "DO No" },
        { key: "inv_no", header: "Invoice No" },
        { key: "request_date", header: "Request Date", render: row => row.request_date ? new Date(row.request_date).toLocaleDateString() : "-" },
    ];

    return (
        <div className="mt-4">
            <ul className="mb-6 flex space-x-2 rtl:space-x-reverse">
                <li>
                    <Link href="#" className="text-primary hover:underline">
                        Asset Transfer
                    </Link>
                </li>
            </ul>
            <div className="flex justify-between items-center mb-2">
                <h2 className="text-xl font-bold">Purchase Requests</h2>
                <Button
                    type="button"
                    variant="default"
                    size="sm"
                    title="Create New Purchase Request"
                    onClick={() => window.open('/purchase/form', '_blank')}
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