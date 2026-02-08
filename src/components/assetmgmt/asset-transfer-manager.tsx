"use client";

import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { authenticatedApi } from "@/config/api";
import { CustomDataGrid, type ColumnDef } from "@/components/ui/DataGrid";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCcw, Info, MailWarning } from "lucide-react";
import { AuthContext } from "@/store/AuthContext";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, PieChart, Pie, Cell } from "recharts";

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
    acceptance_by?: string;
    approval_date?: string;
    status?: string;
    transfer_type?: string;
    committed_status?: string;
    committed_at?: string;
    current_costcenter?: { name?: string };
    new_costcenter?: { name?: string };
    current_department?: { name?: string; code?: string };
    new_department?: { name?: string; code?: string };
    current_location?: { name?: string };
    new_location?: { name?: string };
    transfer_id?: number | string;
};

type PendingCommitItem = {
    id?: number | string;
    asset_id?: number | string;
    register_number?: string;
    acceptance_date?: string;
    transfer_id?: number | string;
    asset?: { brand?: { name?: string }; model?: { name?: string }; register_number?: string; id?: number | string; type_id?: number | string };
    type_id?: number | string;
    type_name?: string;
    type?: { id?: number | string };
};

type PendingLookup = Record<string, PendingCommitItem>;

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
    uncommitted?: number;
    acceptance?: string;
};

const monthlyTransferChartConfig = {
    completed: {
        label: "Completed",
        color: "#16a34a",
    },
    pending: {
        label: "Not Completed",
        color: "#f59e0b",
    },
} satisfies ChartConfig;

const assetTypeColors = ["#16a34a", "#0ea5e9", "#f59e0b", "#8b5cf6", "#ef4444", "#10b981"];

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
    const unique = Array.from(new Set(labels));
    const count = unique.length;
    const noun = count === 1 ? "new owner" : "new owners";
    return (
        <span title={unique.join(", ")}>
            {count} {noun}
        </span>
    );
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

const summarizeTransferTypes = (row: TransferRow): string => {
    const details = getDetails(row);
    if (!details.length) return getTransferType(row) || "-";

    const counts: Record<string, number> = {};
    details.forEach((d) => {
        let label: string | undefined;
        const transferType = (d.transfer_type || getTransferType(row) || "").toLowerCase();
        if (transferType === "employee") {
            label = "Employee";
        } else {
            label =
                d.transfer_item?.type?.name ||
                d.asset?.type?.name ||
                (transferType ? transferType.charAt(0).toUpperCase() + transferType.slice(1) : "Asset");
        }
        counts[label] = (counts[label] || 0) + 1;
    });

    return Object.entries(counts)
        .map(([label, count]) => `${count} ${label}`)
        .join(", ");
};

const keyCandidatesForDetail = (item: TransferDetail) => {
    return [
        item.transfer_item?.id,
        item.asset?.id,
        item.transfer_item?.register_number,
        item.asset?.register_number,
        item.id,
    ]
        .filter(Boolean)
        .map((k) => String(k).toLowerCase());
};

const getUncommittedCountForRow = (row: TransferRow, lookup: PendingLookup) => {
    const details = getDetails(row);
    if (!details.length) return 0;
    return details.reduce((acc, detail) => {
        const match = keyCandidatesForDetail(detail).some((k) => lookup[k]);
        const accepted = Boolean(detail?.acceptance_date) && Boolean(detail?.acceptance_by);
        const committedStatus = String(detail?.committed_status || "").toLowerCase();
        const isAcceptedCommit = committedStatus === "accepted";
        return acc + (match && accepted && isAcceptedCommit ? 1 : 0);
    }, 0);
};

const getAcceptanceCountForRow = (row: TransferRow) => {
    const details = getDetails(row);
    const total = details.length;
    const accepted = details.filter((d) => Boolean(d?.acceptance_date) && Boolean(d?.acceptance_by)).length;
    return { accepted, total };
};

const formatTimelineDate = (value?: string) => {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
};

const formatMonthYearLabel = (value: string) => {
    if (!value) return value;
    const [year, month] = value.split("-");
    const y = Number(year);
    const m = Number(month);
    if (!y || !m || m < 1 || m > 12) return value;
    const d = new Date(y, m - 1, 1);
    return d.toLocaleString("en-US", { month: "short", year: "numeric" }).replace(" ", "-");
};

const getLatestAcceptanceDate = (row: TransferRow) => {
    const details = getDetails(row);
    const dates = details
        .map((d) => (d.acceptance_date ? new Date(d.acceptance_date) : null))
        .filter((d): d is Date => Boolean(d) && !Number.isNaN(d!.getTime()));
    if (!dates.length) return undefined;
    return new Date(Math.max(...dates.map((d) => d.getTime()))).toISOString();
};

const getCommittedDate = (row: TransferRow) => {
    const details = getDetails(row);
    if (!details.length) return undefined;
    const committedItems = details.filter(
        (d: any) =>
            String(d?.committed_status || "").toLowerCase() === "committed" &&
            d?.committed_at &&
            !Number.isNaN(new Date(d.committed_at).getTime())
    );
    if (committedItems.length !== details.length) return undefined;
    const timestamps = committedItems.map((d: any) => new Date(d.committed_at).getTime());
    return new Date(Math.max(...timestamps)).toISOString();
};

const computeStatus = (row: TransferRow) => {
    const approvalStatus = String(row?.approval_status || "").toLowerCase();
    const approvedDate = row?.approved_date ? new Date(row.approved_date) : null;
    const details = getDetails(row);
    const acceptedCount = details.filter((d) => Boolean(d?.acceptance_date) && Boolean(d?.acceptance_by)).length;
    const totalCount = details.length;
    const allAccepted = totalCount > 0 && acceptedCount === totalCount;
    const latestAcceptance = (() => {
        const dates = details
            .map((d) => (d.acceptance_date ? new Date(d.acceptance_date) : null))
            .filter((d): d is Date => Boolean(d) && !Number.isNaN(d!.getTime()));
        if (!dates.length) return null;
        return new Date(Math.max(...dates.map((d) => d.getTime())));
    })();
    const hasApproved = approvedDate && !Number.isNaN(approvedDate.getTime());
    const isComplete = Boolean(row.approval_status && row.approved_by && row.approved_date && allAccepted);

    if (isComplete) return { state: "completed" as const, date: latestAcceptance || approvedDate || null, acceptedCount, totalCount };
    if (approvalStatus.includes("reject")) return { state: "rejected" as const, date: approvedDate && !Number.isNaN(approvedDate.getTime()) ? approvedDate : null, acceptedCount, totalCount };
    if (hasApproved) return { state: "approved" as const, date: approvedDate, acceptedCount, totalCount };
    return { state: "submitted" as const, date: null, acceptedCount, totalCount };
};

const StatusBadge: React.FC<{ row: TransferRow; pendingLookup: PendingLookup }> = ({ row, pendingLookup }) => {
    const { state, acceptedCount, totalCount } = computeStatus(row);
    const uncommitted = getUncommittedCountForRow(row, pendingLookup);

    // If completed but still has uncommitted items, treat as Accepted (needs commit)
    if (state === "completed" && uncommitted > 0) {
        return (
            <Badge className="bg-green-600 text-white hover:bg-green-700">
                Accepted
            </Badge>
        );
    }

    if (state === "completed") return <Badge className="bg-emerald-600 text-white hover:bg-emerald-700">Completed</Badge>;
    if (state === "approved" && acceptedCount > 0 && acceptedCount < totalCount) {
        return <Badge className="bg-green-600 text-white hover:bg-green-700">{acceptedCount}/{totalCount} Accepted</Badge>;
    }
    if (state === "approved") return <Badge className="bg-sky-600 text-white hover:bg-sky-700">Approved</Badge>;
    if (state === "rejected") return <Badge className="bg-red-600 text-white hover:bg-red-700">Rejected</Badge>;
    return <Badge variant="secondary" className="bg-amber-500 text-white hover:bg-amber-600 truncate">Pending Approval</Badge>;
};

const DetailList: React.FC<{
    row: TransferRow;
    pendingLookup: PendingLookup;
    committing: Record<string, boolean>;
    resendAcceptanceLoading: Record<string, boolean>;
    onCommit: (item: PendingCommitItem) => void;
    onResendAcceptance: (transferId?: string | number) => void;
}> = ({ row, pendingLookup, committing, resendAcceptanceLoading, onCommit, onResendAcceptance }) => {
    const list = getDetails(row);
    if (!list.length) return <div className="p-3 text-sm text-muted-foreground">No items found for this transfer.</div>;

    return (
        <div className="p-1 space-y-1">

            <div className="flex flex-col gap-3">
                {list.map((item) => {
                    const identifier = item.transfer_item?.register_number || item.asset?.register_number || item.transfer_item?.ramco_id || item.transfer_item?.id || item.id;
                    const typeName = item.transfer_item?.type?.name || item.asset?.type?.name;
                    const transferTypeLabel = item.transfer_type || getTransferType(row);
                    const owner = Array.isArray(item.new_owner)
                        ? item.new_owner.map((n) => n.full_name || n.ramco_id).join(", ")
                        : item.new_owner?.full_name || item.new_owner?.ramco_id || "-";
                    const initiatedDate = row.transfer_date;
                    const approvedDate = row.approved_date;
                    const acceptedAt = Boolean(item?.acceptance_date) && Boolean(item?.acceptance_by)
                        ? item?.acceptance_date || ""
                        : "";
                    const committedDate = String(item?.committed_status || "").toLowerCase() === "committed"
                        ? item?.committed_at || ""
                        : "";
                    const timeline = [
                        { label: "Initiated", date: initiatedDate },
                        { label: "Approved", date: approvedDate },
                        { label: "Accepted", date: acceptedAt },
                        { label: "Completed", date: committedDate },
                    ];

                    const candidateKeys = [
                        item.transfer_item?.id,
                        item.asset?.id,
                        item.transfer_item?.register_number,
                        item.asset?.register_number,
                    ]
                        .filter(Boolean)
                        .map((k) => String(k).toLowerCase());

                    const pendingMatchKey = candidateKeys.find((k) => pendingLookup[k]);
                    const pendingMatch = pendingMatchKey ? pendingLookup[pendingMatchKey] : undefined;
                    const commitBusy = pendingMatchKey ? committing[pendingMatchKey] : false;
                    const transferIdForAcceptance = item?.transfer_id ?? row?.id;
                    const resendBusy = transferIdForAcceptance ? resendAcceptanceLoading[String(transferIdForAcceptance)] : false;
                    const isUncommitted = Boolean(pendingMatch);
                    return (
                        <div
                            key={`${row.id}-${item.id}`}
                            className={`rounded border border-border p-3 shadow-sm ${isUncommitted ? "bg-amber-50/70 border-amber-200" : "bg-stone-200"}`}
                        >
                            <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-4">
                                {/* Left: content */}
                                <div className="flex flex-col gap-3">
                                    <div className="flex flex-wrap items-center gap-2 text-xs md:text-sm">
                                        {transferTypeLabel && (
                                            <Badge className="bg-slate-800 text-white hover:bg-slate-900 rounded-full text-[11px] uppercase tracking-wide">
                                                {transferTypeLabel.toLowerCase() === "employee" ? "Employee" : "Asset"}
                                            </Badge>
                                        )}
                                        {item.id && (
                                            <span className="text-[11px] font-semibold text-slate-600">
                                                #{item.id}
                                            </span>
                                        )}
                                        {identifier && <span className="font-semibold">{identifier}</span>}
                                        <span className="text-muted-foreground">|</span>
                                        <span>{typeName || "-"}</span>
                                        {item.transfer_item?.brand?.name && (
                                            <>
                                                <span className="text-muted-foreground">|</span>
                                                <span>{item.transfer_item.brand.name}</span>
                                            </>
                                        )}
                                        {item.transfer_item?.model?.name && (
                                            <>
                                                <span className="text-muted-foreground">|</span>
                                                <span>{item.transfer_item.model.name}</span>
                                            </>
                                        )}
                                        {item.transfer_item?.serial_number && (
                                            <>
                                                <span className="text-muted-foreground">|</span>
                                                <span>SN: {item.transfer_item.serial_number}</span>
                                            </>
                                        )}
                                    </div>

                                    <div className="text-xs">
                                        <div className="overflow-x-auto">
                                            <table className="max-w-1/2 text-xs rounded border border-border w-full">
                                                <thead className="font-semibold border-b border-border">
                                                    <tr>
                                                        <th className="px-3 py-1 text-left font-semibold">Field</th>
                                                        <th className="px-3 py-1 text-left font-semibold">Current</th>
                                                        <th className="px-3 py-1 text-left font-semibold">New</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y border-border">
                                                    <tr>
                                                        <td className="px-3 py-1 font-medium text-foreground">Owner</td>
                                                        <td className="px-3 py-1">{item.current_owner?.full_name || item.current_owner?.ramco_id || "-"}</td>
                                                        <td className="px-3 py-1">{owner || "-"}</td>
                                                    </tr>
                                                    <tr>
                                                        <td className="px-3 py-1 font-medium text-foreground">Cost Center</td>
                                                        <td className="px-3 py-1">{item.current_costcenter?.name || "-"}</td>
                                                        <td className="px-3 py-1">{item.new_costcenter?.name || "-"}</td>
                                                    </tr>
                                                    <tr>
                                                        <td className="px-3 py-1 font-medium text-foreground">Department</td>
                                                        <td className="px-3 py-1">{item.current_department?.name || item.current_department?.code || "-"}</td>
                                                        <td className="px-3 py-1">{item.new_department?.name || item.new_department?.code || "-"}</td>
                                                    </tr>
                                                    <tr>
                                                        <td className="px-3 py-1 font-medium text-foreground">Location</td>
                                                        <td className="px-3 py-1">{item.current_location?.name || "-"}</td>
                                                        <td className="px-3 py-1">{item.new_location?.name || "-"}</td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>

                                {/* Right: timeline */}
                                <div className="flex flex-col gap-2 text-xs md:text-sm">
                                    <div className="font-semibold text-sm">Transfer Progress</div>
                                    <div className="relative flex flex-col gap-3 pl-4 before:content-[''] before:absolute before:left-1.75 before:top-1 before:bottom-1 before:w-0.5 before:bg-black/50">
                                        {timeline.map((ev) => {
                                            const isDone = Boolean(ev.date);
                                            const isUncommittedStep = ev.label === "Completed" && Boolean(pendingMatch);
                                            const isPendingAcceptanceStep = ev.label === "Accepted" && !isDone;
                                            const color =
                                                ev.label === "Initiated"
                                                    ? "rgb(234 179 8)"
                                                    : ev.label === "Approved"
                                                        ? "rgb(14 165 233)"
                                                        : ev.label === "Accepted"
                                                            ? "rgb(22 163 74)"
                                                            : isUncommittedStep
                                                                ? "rgb(245 158 11)"
                                                                : "rgb(16 185 129)";
                                            return (
                                                <div key={`${identifier}-${ev.label}`} className="relative flex items-start gap-2">
                                                    <span
                                                        className="absolute -left-4 top-0 h-4 w-4 rounded-full border-2 border-white shadow-sm"
                                                        style={{ backgroundColor: isDone ? color : "rgba(148, 163, 184, 0.6)", borderColor: color }}
                                                    />
                                                    <div className="flex flex-col leading-tight">
                                                        <div className="flex items-center gap-2 pl-3">
                                                            <span className="font-semibold text-xs">
                                                                {isUncommittedStep ? "Uncommitted" : isPendingAcceptanceStep ? "Pending Acceptance" : ev.label}
                                                            </span>
                                                            {isPendingAcceptanceStep && transferIdForAcceptance && (
                                                                <Button
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    className="h-4 w-4 p-0 text-blue-600 hover:text-blue-700"
                                                                    disabled={resendBusy}
                                                                    title="Resend acceptance notification to new owner"
                                                                    onClick={() => onResendAcceptance(transferIdForAcceptance)}
                                                                >
                                                                    <MailWarning className="h-3.5 w-3.5" />
                                                                </Button>
                                                            )}
                                                            {isUncommittedStep && pendingMatch && (
                                                                <div className="flex items-center gap-1">
                                                                    <button
                                                                        type="button"
                                                                        className="text-blue-600 hover:underline text-xs font-semibold"
                                                                        disabled={commitBusy}
                                                                        onClick={() => onCommit(pendingMatch)}
                                                                    >
                                                                        {commitBusy ? "Committing…" : "Commit transfer now!"}
                                                                    </button>
                                                                    <div className="relative group inline-block">
                                                                        <Info className="h-3.5 w-3.5 text-slate-600" aria-hidden />
                                                                        <span className="absolute z-10 hidden group-hover:block mt-2 w-56 text-[11px] leading-snug text-slate-800 bg-white border border-slate-200 shadow-lg rounded p-2">
                                                                            This action will update transfer records according to the effective date.
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            )}
                                                            <span className="text-xs text-shadow-muted">
                                                                {isUncommittedStep || isPendingAcceptanceStep ? "" : isDone ? formatTimelineDate(ev.date) : "—"}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
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
    const auth = useContext(AuthContext);
    const username = auth?.authData?.user?.username;

    const [rows, setRows] = useState<TransferRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [managerTypeIds, setManagerTypeIds] = useState<number[]>([]);
    const [pendingLookup, setPendingLookup] = useState<PendingLookup>({});
    const [pendingLoading, setPendingLoading] = useState(false);
    const [committing, setCommitting] = useState<Record<string, boolean>>({});
    const [resendAcceptanceLoading, setResendAcceptanceLoading] = useState<Record<string, boolean>>({});
    const pendingCount = useMemo(() => Object.keys(pendingLookup).length, [pendingLookup]);

    // Identify asset manager types for the current user
    useEffect(() => {
        if (!username) return;
        let cancelled = false;
        (async () => {
            try {
                const res: any = await authenticatedApi.get("/api/assets/managers");
                const list: any[] = res?.data?.data || res?.data || [];
                const matches = list.filter((m: any) => {
                    const ramco = m?.ramco_id || m?.employee?.ramco_id;
                    const active = String(m?.is_active ?? "").toLowerCase();
                    const isActive = active === "1" || active === "true" || m?.is_active === 1 || m?.is_active === true;
                    return isActive && ramco && String(ramco) === String(username);
                });
                const ids = Array.from(new Set(matches
                    .map((m: any) => m?.manager_id ?? m?.id)
                    .filter((v: any) => v !== undefined && v !== null)
                    .map((v: any) => Number(v))
                ));
                if (!cancelled) setManagerTypeIds(ids);
            } catch (err) {
                if (!cancelled) setManagerTypeIds([]);
            }
        })();
        return () => { cancelled = true; };
    }, [username]);

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

    const buildPendingKeys = (item: PendingCommitItem) => {
        const keys = [
            item.asset_id,
            item.asset?.id,
            item.register_number,
            item.asset?.register_number,
            item.id,
        ]
            .filter(Boolean)
            .map((k) => String(k).toLowerCase());
        return keys.length ? keys : [String(item.id ?? "")];
    };

    const fetchPendingCommits = useCallback(async (typeIds: number[]) => {
        if (!typeIds.length) {
            setPendingLookup({});
            return;
        }
        setPendingLoading(true);
        try {
            const responses = await Promise.all(typeIds.map(async (tid) => {
                try {
                    const res: any = await authenticatedApi.get(`/api/assets/transfers?type_id=${encodeURIComponent(tid)}`);
                    const payload = res?.data?.data || res?.data || [];
                    return Array.isArray(payload) ? payload : [];
                } catch (err) {
                    return [];
                }
            }));

            const allTransfers = responses.flat();
            const map: PendingLookup = {};

            allTransfers.forEach((transfer: any) => {
                const details = Array.isArray(transfer?.details) ? transfer.details : Array.isArray(transfer?.items) ? transfer.items : [];
                details.forEach((it: any) => {
                    const committedStatus = String(it?.committed_status || "").toLowerCase();
                    const isAccepted = Boolean(it?.acceptance_date) && Boolean(it?.acceptance_by) && committedStatus === "accepted";
                    if (!isAccepted) return;
                    if (it?.committed_at) return; // already committed
                    const enriched: PendingCommitItem = {
                        ...it,
                        type_id: it?.transfer_item?.type?.id || it?.asset?.type?.id || transfer?.transfer_type_id,
                        type_name: it?.transfer_item?.type?.name || it?.asset?.type?.name || transfer?.transfer_type,
                        transfer_id: it?.transfer_id || transfer?.id,
                        acceptance_date: it?.acceptance_date,
                        register_number: it?.transfer_item?.register_number || it?.asset?.register_number || it?.register_number,
                    };
                    buildPendingKeys(enriched).forEach((key) => { map[key] = enriched; });
                });
            });

            setPendingLookup(map);
        } finally {
            setPendingLoading(false);
        }
    }, []);

    useEffect(() => {
        if (managerTypeIds.length) {
            fetchPendingCommits(managerTypeIds);
        } else {
            setPendingLookup({});
        }
    }, [managerTypeIds, fetchPendingCommits]);

    const handleCommitTransfer = async (item: PendingCommitItem) => {
        const key = buildPendingKeys(item)[0];
        if (!key) return;
        setCommitting((prev) => ({ ...prev, [key]: true }));
        try {
            const transferId = item.transfer_id;
            await authenticatedApi.post(`/api/assets/transfer-commit/${encodeURIComponent(String(transferId))}`, {
                type_id: item.type_id ?? item.asset?.type_id ?? item.type?.id,
                item_ids: [item.id ?? item.asset_id ?? item.register_number].filter(Boolean),
                committed_by: username,
                transfer_date: item.acceptance_date || undefined,
            });
            toast.success("Transfer committed");
            await fetchPendingCommits(managerTypeIds);
            await loadTransfers();
        } catch (err: any) {
            const message = err?.response?.data?.message || "Failed to commit transfer";
            toast.error(message);
        } finally {
            setCommitting((prev) => ({ ...prev, [key]: false }));
        }
    };

    const handleResendAcceptance = async (transferId?: string | number) => {
        if (!transferId) return;
        const key = String(transferId);
        setResendAcceptanceLoading((prev) => ({ ...prev, [key]: true }));
        try {
            await authenticatedApi.post(`/api/transfers/${encodeURIComponent(String(transferId))}/resend-acceptance-notification`);
            toast.success("Acceptance notification sent.");
        } catch (err: any) {
            const message = err?.response?.data?.message || "Failed to resend acceptance notification.";
            toast.error(message);
        } finally {
            setResendAcceptanceLoading((prev) => ({ ...prev, [key]: false }));
        }
    };

    const handleRefresh = () => {
        loadTransfers();
        fetchPendingCommits(managerTypeIds);
    };

    useEffect(() => {
        loadTransfers();
    }, []);

    const columns = useMemo<ColumnDef<TransferRow>[]>(() => [
        { key: "id", header: "Transfer ID" },
        { key: "transfer_date", header: "Application Date", render: (row) => formatDateTime(row.transfer_date || "") },
        { key: "transfer_by", header: "Transfer By", filter: "input", render: (row) => row.transfer_by?.full_name || row.transfer_by?.name || row.transfer_by?.ramco_id || "-" },
        { key: "details", header: "Total Items", render: (row) => getDetails(row).length },
        {
            key: "transfer_type",
            header: "Transfer Items",
            filter: "input",
            render: (row) => summarizeTransferTypes(row),
            filterValue: (row) => summarizeTransferTypes(row),
        },
        {
            key: "new_owner",
            header: "New Owner(s)",
            filter: "input",
            render: (row) => renderOwners(row.new_owner),
            filterValue: (row) => {
                const owners = row.new_owner || [];
                if (!Array.isArray(owners)) return "";
                return owners
                    .map((o) => o.full_name || o.name || o.ramco_id)
                    .filter(Boolean)
                    .join(", ");
            },
        },
        {
            key: "acceptance",
            header: "Acceptance",
            colClass: "text-center",
            render: (row) => {
                const { state, acceptedCount, totalCount } = computeStatus(row);
                const uncommitted = getUncommittedCountForRow(row, pendingLookup);
                const isPartialAccepted = state === "approved" && acceptedCount > 0 && acceptedCount < totalCount;
                const isAccepted = state === "completed" && uncommitted > 0; // completed but not committed yet shows as "Accepted"
                const hideAcceptance = state === "submitted" || (state === "approved" && !isPartialAccepted) || (state === "completed" && !isAccepted);
                if (hideAcceptance) return "-";
                const { accepted, total } = getAcceptanceCountForRow(row);
                if (!total) return "-";
                return `${accepted}/${total}`;
            },
        },
        {
            key: "uncommitted",
            header: "Uncommitted",
            colClass: "text-center",
            render: (row) => {
                const details = getDetails(row);
                if (!details.length) return "-";
                const count = details.reduce((acc, detail) => {
                    const match = keyCandidatesForDetail(detail).some((k) => pendingLookup[k]);
                    return acc + (match ? 1 : 0);
                }, 0);
                return count > 0 ? count : "-";
            },
        },
        { key: "approval_status", header: "Status", colClass: "truncate text-center", render: (row) => <StatusBadge row={row} pendingLookup={pendingLookup} /> },

    ], [pendingLookup]);

    const summary = useMemo(() => {
        const typeCounts: Record<string, number> = {};
        const monthCounts: Record<string, { total: number; completed: number }> = {};
        let totalItems = 0;
        let assetItems = 0;
        let employeeItems = 0;
        let pendingApproval = 0;
        let approved = 0;
        let initiatedItems = 0;
        let pendingApprovalItems = 0;
        let approvedItems = 0;
        let approvedPendingAcceptanceItems = 0;
        let acceptedPendingCommittedItems = 0;

        rows.forEach((row) => {
            const details = getDetails(row);
            totalItems += details.length;
            const allCommitted = details.length > 0 && details.every((d) => String(d?.committed_status || "").toLowerCase() === "committed");

            if (row?.transfer_date) {
                const d = new Date(row.transfer_date);
                if (!Number.isNaN(d.getTime())) {
                    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
                    if (!monthCounts[key]) monthCounts[key] = { total: 0, completed: 0 };
                    monthCounts[key].total += 1;
                    if (allCommitted) monthCounts[key].completed += 1;
                }
            }

            const state = computeStatus(row).state;
            if (state === "submitted") {
                pendingApproval += 1;
                pendingApprovalItems += details.length;
                initiatedItems += details.length;
            } else {
                initiatedItems += details.length;
            }
            if (state === "approved" || state === "completed") {
                approved += 1;
                approvedItems += details.length;
            }

            const hasApproved = Boolean(row?.approved_date) || state === "approved" || state === "completed";
            if (hasApproved) {
                approvedPendingAcceptanceItems += details.filter(
                    (d) => !(Boolean(d?.acceptance_date) && Boolean(d?.acceptance_by))
                ).length;
                acceptedPendingCommittedItems += details.filter((d) => {
                    const accepted = Boolean(d?.acceptance_date) && Boolean(d?.acceptance_by);
                    return accepted && String(d?.committed_status || "").toLowerCase() === "accepted";
                }).length;
            }

            details.forEach((d) => {
                const baseTransferType = String(d?.transfer_type || row?.transfer_type || "").toLowerCase();
                if (baseTransferType === "employee") employeeItems += 1;
                else assetItems += 1;

                const typeLabel =
                    d?.transfer_item?.type?.name ||
                    d?.asset?.type?.name ||
                    (baseTransferType === "employee" ? "Employee" : "Asset");
                typeCounts[typeLabel] = (typeCounts[typeLabel] || 0) + 1;
            });
        });

        return {
            totalTransfers: rows.length,
            totalItems,
            assetItems,
            employeeItems,
            pendingApproval,
            approved,
            initiatedItems,
            pendingApprovalItems,
            approvedItems,
            approvedPendingAcceptanceItems,
            acceptedPendingCommittedItems,
            assetTypeBreakdown: Object.entries(typeCounts).sort((a, b) => b[1] - a[1]),
            monthlyTransfers: Object.entries(monthCounts)
                .map(([month, value]) => ({
                    month,
                    total: value.total,
                    completed: value.completed,
                    pending: Math.max(value.total - value.completed, 0),
                }))
                .sort((a, b) => a.month.localeCompare(b.month)),
        };
    }, [rows]);

    const assetTypeChartData = useMemo(
        () =>
            summary.assetTypeBreakdown.map(([name, value], idx) => ({
                name,
                value,
                fill: assetTypeColors[idx % assetTypeColors.length],
            })),
        [summary.assetTypeBreakdown]
    );

    const assetTypeChartConfig = useMemo(
        () =>
            assetTypeChartData.reduce((acc, cur, idx) => {
                acc[`type${idx}`] = { label: cur.name, color: cur.fill };
                return acc;
            }, {} as ChartConfig),
        [assetTypeChartData]
    );

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">Asset Transfer Manager</h2>
                </div>
                <Button size="sm" variant="outline" onClick={handleRefresh} disabled={loading} className="flex items-center gap-2">
                    <RefreshCcw className="h-4 w-4" />
                    Refresh
                </Button>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
            {loading && <p className="text-sm text-muted-foreground">Loading transfers…</p>}

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                <Card className="border border-border bg-stone-100/90">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Transfer Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 pb-3">
                        <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                            <li>Total Transfers <span className="font-medium text-foreground">{summary.totalTransfers}</span></li>
                            <li>Items <span className="font-medium text-foreground">{summary.totalItems}</span></li>
                            <li>Asset <span className="font-medium text-foreground">{summary.assetItems}</span></li>
                            <li>Employee <span className="font-medium text-foreground">{summary.employeeItems}</span></li>
                        </ul>
                    </CardContent>
                </Card>

                <Card className="border border-border bg-stone-100/90">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Transfer Status Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 pb-3">
                        <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                            <li>
                                Initiated{" "}
                                <span className="font-medium text-foreground">{summary.totalTransfers}/{summary.totalTransfers || 0}</span>
                                <span className="text-muted-foreground"> | Items </span>
                                <span className="font-medium text-foreground">{summary.initiatedItems}/{summary.totalItems || 0}</span>
                            </li>
                            <li>
                                Pending Approval{" "}
                                <span className="font-medium text-foreground">{summary.pendingApproval}/{summary.totalTransfers || 0}</span>
                                <span className="text-muted-foreground"> | Items </span>
                                <span className="font-medium text-foreground">{summary.pendingApprovalItems}/{summary.totalItems || 0}</span>
                            </li>
                            <li>
                                Approved{" "}
                                <span className="font-medium text-foreground">{summary.approved}/{summary.totalTransfers || 0}</span>
                                <span className="text-muted-foreground"> | Items </span>
                                <span className="font-medium text-foreground">{summary.approvedItems}/{summary.totalItems || 0}</span>
                            </li>
                            <li>Approved Pending Acceptance <span className="font-medium text-foreground">{summary.approvedPendingAcceptanceItems}/{summary.totalItems || 0}</span></li>
                            <li>Accepted Pending Commit <span className="font-medium text-foreground">{summary.acceptedPendingCommittedItems}/{summary.totalItems || 0}</span></li>
                        </ul>
                    </CardContent>
                </Card>

                <Card className="border border-border bg-stone-100/90">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Asset Type Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 pb-4">
                        {assetTypeChartData.length > 0 ? (
                            <>
                                <ChartContainer config={assetTypeChartConfig} className="h-48 w-full">
                                    <PieChart>
                                        <Pie
                                            data={assetTypeChartData}
                                            dataKey="value"
                                            nameKey="name"
                                            innerRadius={48}
                                            outerRadius={78}
                                            paddingAngle={2}
                                            stroke="#fff"
                                        >
                                            {assetTypeChartData.map((entry, index) => (
                                                <Cell key={`cell-${entry.name}-${index}`} fill={entry.fill} />
                                            ))}
                                        </Pie>
                                        <ChartTooltip
                                            content={
                                                <ChartTooltipContent
                                                    formatter={(value, name) => [value, name]}
                                                    labelFormatter={(label) => `Type: ${label}`}
                                                />
                                            }
                                        />
                                    </PieChart>
                                </ChartContainer>
                                <div className="flex flex-wrap items-center justify-center gap-3 text-xs mt-3">
                                    {assetTypeChartData.map((item) => (
                                        <span key={item.name} className="inline-flex items-center gap-1 text-muted-foreground">
                                            <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: item.fill }} />
                                            <span className="text-foreground font-medium">{item.name}</span>
                                            <span className="text-muted-foreground">{item.value}</span>
                                        </span>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <p className="text-sm text-muted-foreground">No asset type data.</p>
                        )}
                    </CardContent>
                </Card>

                <Card className="border border-border bg-stone-100/90">
                <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Monthly Transfer Overview</CardTitle>
                    </CardHeader>
                    <CardContent className="py-5">
                        {summary.monthlyTransfers.length > 0 ? (
                            <ChartContainer config={monthlyTransferChartConfig} className="h-32 w-full aspect-auto">
                                <BarChart data={summary.monthlyTransfers} margin={{ top: 4, right: 8, left: -8, bottom: 0 }} barGap={4}>
                                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                                    <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={6} tickFormatter={formatMonthYearLabel} />
                                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={24} />
                                    <ChartTooltip
                                        content={
                                            <ChartTooltipContent
                                                formatter={(value, name, item) => {
                                                    if (name === "pending") return [value, "Not Completed"];
                                                    if (name === "completed") return [value, "Completed"];
                                                    return [value, String(name)];
                                                }}
                                                labelFormatter={(label, payload) => {
                                                    const row = payload?.[0]?.payload as any;
                                                    return `${formatMonthYearLabel(String(label))} (Total: ${row?.total ?? 0})`;
                                                }}
                                            />
                                        }
                                    />
                                    <Bar dataKey="completed" stackId="status" fill="#16a34a" radius={[3, 3, 0, 0]} />
                                    <Bar dataKey="pending" stackId="status" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                                </BarChart>
                            </ChartContainer>
                        ) : (
                            <p className="text-sm text-muted-foreground">No monthly transfer data.</p>
                        )}
                        <div className="flex items-center justify-center gap-4 text-xs mt-3">
                            <span className="inline-flex items-center gap-1 text-muted-foreground">
                                <span className="h-2.5 w-2.5 rounded-sm bg-green-600" />
                                Completed
                            </span>
                            <span className="inline-flex items-center gap-1 text-muted-foreground">
                                <span className="h-2.5 w-2.5 rounded-sm bg-amber-500" />
                                Not Completed
                            </span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <CustomDataGrid
                data={rows}
                columns={columns}
                pagination={false}
                inputFilter={false}
                rowExpandable={{ enabled: true, render: (row) => (
                    <DetailList
                        row={row}
                        pendingLookup={pendingLookup}
                        committing={committing}
                        resendAcceptanceLoading={resendAcceptanceLoading}
                        onCommit={handleCommitTransfer}
                        onResendAcceptance={handleResendAcceptance}
                    />
                ) }}
            />
        </div>
    );
};

export default AssetTransferManager;
