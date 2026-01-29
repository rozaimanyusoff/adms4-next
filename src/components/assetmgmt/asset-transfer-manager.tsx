"use client";

import React, { useEffect, useMemo, useState } from "react";
import { authenticatedApi } from "@/config/api";
import { CustomDataGrid, type ColumnDef } from "@/components/ui/DataGrid";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCcw } from "lucide-react";

type TransferDetail = {
    id?: number | string;
    transfer_item?: {
        register_number?: string;
        id?: string | number;
        type?: { name?: string };
        brand?: { name?: string };
        model?: { name?: string };
        serial_number?: string;
        full_name?: string;
        ramco_id?: string;
    };
    asset?: {
        register_number?: string;
        id?: string | number;
        type?: { name?: string };
        brand?: { name?: string };
        model?: { name?: string };
        serial_number?: string;
    };
    current_owner?: { full_name?: string; ramco_id?: string };
    new_owner?: { full_name?: string; ramco_id?: string } | Array<{ full_name?: string; ramco_id?: string }>;
    acceptance_date?: string;
    approval_date?: string;
    status?: string;
    transfer_type?: string;
    current_costcenter?: { name?: string };
    new_costcenter?: { name?: string };
    current_department?: { name?: string; code?: string };
    new_department?: { name?: string; code?: string };
    current_location?: { name?: string };
    new_location?: { name?: string };
};

type TransferRow = {
    id?: number | string;
    request_no?: string | number;
    transfer_by?: { full_name?: string; name?: string; ramco_id?: string };
    new_owner?: Array<{ full_name?: string; name?: string; ramco_id?: string }>;
    transfer_type?: string;
    approval_status?: string;
    approved_by?: any;
    approved_date?: string;
    transfer_date?: string;
    details?: TransferDetail[];
    items?: TransferDetail[];
};

const formatDateTime = (value?: string) => {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "-";
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
};

const renderOwners = (owners?: TransferRow["new_owner"]) => {
    if (!Array.isArray(owners) || owners.length === 0) return "-";
    const labels = owners
        .map((o) => o.full_name || o.name || o.ramco_id)
        .filter(Boolean) as string[];
    return Array.from(new Set(labels)).join(", ");
};

const getDetails = (row: TransferRow): TransferDetail[] => {
    if (Array.isArray(row.details)) return row.details;
    if (Array.isArray(row.items)) return row.items;
    return [];
};

const getTransferType = (row: TransferRow): string | undefined => {
    if (row.transfer_type) return row.transfer_type;
    const details = getDetails(row);
    if (details.length > 0) return details[0]?.transfer_type;
    return undefined;
};

const computeStatus = (row: TransferRow) => {
    const approvalStatus = String(row?.approval_status || "").toLowerCase();
    const approvedDate = row?.approved_date ? new Date(row.approved_date) : null;
    const details = getDetails(row);
    const allAccepted = details.length > 0 && details.every((d) => d.acceptance_date);
    const latestAcceptance = (() => {
        const dates = details
            .map((d) => (d.acceptance_date ? new Date(d.acceptance_date) : null))
            .filter((d): d is Date => Boolean(d) && !Number.isNaN(d!.getTime()));
        if (!dates.length) return null;
        return new Date(Math.max(...dates.map((d) => d.getTime())));
    })();
    const hasApproved = approvedDate && !Number.isNaN(approvedDate.getTime());
    const isComplete = Boolean(row.approval_status && row.approved_by && row.approved_date && allAccepted);

    if (isComplete) return { state: "completed" as const, date: latestAcceptance || approvedDate || null };
    if (approvalStatus.includes("reject")) return { state: "rejected" as const, date: approvedDate && !Number.isNaN(approvedDate.getTime()) ? approvedDate : null };
    if (hasApproved) return { state: "approved" as const, date: approvedDate };
    return { state: "submitted" as const, date: null };
};

const StatusBadge: React.FC<{ row: TransferRow }> = ({ row }) => {
    const { state, date } = computeStatus(row);
    const when = date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString() : null;
    if (state === "completed") return <Badge className="bg-emerald-600 text-white hover:bg-emerald-700">Completed {when && <span className="pl-1">on {when}</span>}</Badge>;
    if (state === "approved") return <Badge className="bg-green-600 text-white hover:bg-green-700">Approved {when && <span className="pl-1">on {when}</span>}</Badge>;
    if (state === "rejected") return <Badge className="bg-red-600 text-white hover:bg-red-700">Rejected</Badge>;
    return <Badge variant="secondary" className="bg-amber-500 text-white hover:bg-amber-600">Pending Approval</Badge>;
};

const DetailList: React.FC<{ row: TransferRow }> = ({ row }) => {
    const list = getDetails(row);
    if (!list.length) return <div className="p-3 text-sm text-muted-foreground">No items found for this transfer.</div>;

    return (
        <div className="p-1 space-y-1 bg-stone-50">

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {list.map((item) => {
                    const identifier = item.transfer_item?.register_number || item.asset?.register_number || item.transfer_item?.ramco_id || item.transfer_item?.id || item.id;
                    const typeName = item.transfer_item?.type?.name || item.asset?.type?.name;
                    const transferTypeLabel = item.transfer_type || getTransferType(row);
                    const owner = Array.isArray(item.new_owner)
                        ? item.new_owner.map((n) => n.full_name || n.ramco_id).join(", ")
                        : item.new_owner?.full_name || item.new_owner?.ramco_id || "-";
                    const status = item.acceptance_date
                        ? { label: `Accepted on ${formatDateTime(item.acceptance_date)}`, tone: "success" as const }
                        : item.approval_date
                            ? { label: `Approved on ${formatDateTime(item.approval_date)}`, tone: "info" as const }
                            : { label: "Pending", tone: "pending" as const };
                    const badgeClass = status.tone === "success"
                        ? "bg-emerald-600 text-white"
                        : status.tone === "info"
                            ? "bg-sky-600 text-white"
                            : "bg-amber-500 text-white";
                    return (
                        <div key={`${row.id}-${item.id}`} className="rounded border border-border bg-stone-100 p-3 shadow-sm">
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex flex-col gap-2">
                                    {transferTypeLabel && (
                                        <Badge className="w-fit bg-slate-800 text-white hover:bg-slate-900 rounded-full px-3 py-1 text-[11px] uppercase tracking-wide">
                                            {transferTypeLabel.toLowerCase() === "employee" ? "Employee" : "Asset"}
                                        </Badge>
                                    )}
                                    <div>
                                        <div className="text-sm font-semibold">{identifier || "Item"}</div>
                                        <div className="text-xs">
                                            {typeName || "-"}
                                            {item.transfer_item?.brand?.name ? ` · ${item.transfer_item.brand.name}` : ""}
                                            {item.transfer_item?.model?.name ? ` · ${item.transfer_item.model.name}` : ""}
                                        </div>
                                        {item.transfer_item?.serial_number && (
                                            <div className="text-xs">SN: {item.transfer_item.serial_number}</div>
                                        )}
                                    </div>
                                </div>
                                <Badge className={badgeClass}>{status.label}</Badge>
                            </div>
                            <div className="mt-3 text-xs grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                                <div className="space-y-1">
                                    <div>Current Owner: {item.current_owner?.full_name || item.current_owner?.ramco_id || "-"}</div>
                                    <div>New Owner: {owner || "-"}</div>
                                </div>
                                <div className="space-y-3 text-foreground">
                                    <div>
                                        <div className="font-semibold">Cost Center</div>
                                        <div className="flex justify-between gap-2 text-xs text-muted-foreground">
                                            <span>Current:</span>
                                            <span className="text-foreground font-medium">{item.current_costcenter?.name || "-"}</span>
                                            <span className="text-muted-foreground ml-4">New:</span>
                                            <span className="text-foreground font-medium">{item.new_costcenter?.name || "-"}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="font-semibold">Department</div>
                                        <div className="flex justify-between gap-2 text-xs text-muted-foreground">
                                            <span>Current:</span>
                                            <span className="text-foreground font-medium">{item.current_department?.name || item.current_department?.code || "-"}</span>
                                            <span className="text-muted-foreground ml-4">New:</span>
                                            <span className="text-foreground font-medium">{item.new_department?.name || item.new_department?.code || "-"}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="font-semibold">Location</div>
                                        <div className="flex justify-between gap-2 text-xs text-muted-foreground">
                                            <span>Current:</span>
                                            <span className="text-foreground font-medium">{item.current_location?.name || "-"}</span>
                                            <span className="text-muted-foreground ml-4">New:</span>
                                            <span className="text-foreground font-medium">{item.new_location?.name || "-"}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const AssetTransferManager: React.FC = () => {
    const [rows, setRows] = useState<TransferRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadTransfers = async () => {
        setLoading(true);
        setError(null);
        try {
            const res: any = await authenticatedApi.get("/api/assets/transfers");
            const payload = res?.data;
            const list: TransferRow[] = Array.isArray(payload?.data)
                ? payload.data
                : Array.isArray(payload)
                    ? payload
                    : [];
            setRows(list);
        } catch (e: any) {
            setError(e?.response?.data?.message || "Failed to load asset transfer requests");
            setRows([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadTransfers();
    }, []);

    const columns = useMemo<ColumnDef<TransferRow>[]>(() => [
        { key: "id", header: "Transfer ID" },
        { key: "transfer_by", header: "Transfer By", filter: "input", render: (row) => row.transfer_by?.full_name || row.transfer_by?.name || row.transfer_by?.ramco_id || "-" },
        { key: "transfer_type", header: "Transfer Type", filter: "singleSelect", render: (row) => getTransferType(row) || "-" },
        { key: "new_owner", header: "New Owner(s)", filter: "input", render: (row) => renderOwners(row.new_owner) },
        { key: "transfer_date", header: "Application Date", render: (row) => formatDateTime(row.transfer_date || "") },
        { key: "approval_status", header: "Status", render: (row) => <StatusBadge row={row} /> },
        { key: "details", header: "Items", render: (row) => getDetails(row).length },
    ], []);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">Asset Transfer Manager</h2>
                    <p className="text-sm text-muted-foreground">All transfer requests pulled from /api/assets/transfers</p>
                </div>
                <Button size="sm" variant="outline" onClick={loadTransfers} disabled={loading} className="flex items-center gap-2">
                    <RefreshCcw className="h-4 w-4" />
                    Refresh
                </Button>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
            {loading && <p className="text-sm text-muted-foreground">Loading transfers…</p>}

            <CustomDataGrid
                data={rows}
                columns={columns}
                pagination={false}
                inputFilter={false}
                rowExpandable={{ enabled: true, render: (row) => <DetailList row={row} /> }}
            />
        </div>
    );
};

export default AssetTransferManager;
