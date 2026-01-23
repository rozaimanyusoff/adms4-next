import React, { useEffect, useState } from 'react';
import { authenticatedApi } from '@/config/api';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ActionSidebar from "@components/ui/action-aside";
import { CustomDataGrid, ColumnDef } from "@/components/ui/DataGrid";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, ArrowLeftRight } from "lucide-react";
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import ExcelTelcoSims from "./excel-telco-sims";

interface SimCard {
    id: number;
    sim_sn: string;
    status?: string | null;
    replacement_sim?: number | null;
    subs?: {
        id?: number;
        sub_no?: string;
        account_sub?: string;
    } | null;
    account?: {
        id?: number;
        account_master?: string;
        sub_no?: string;
    } | null;
    sim_subs_history?: Array<{
        effective_date?: string;
        sub_no?: string;
    }>;
    sim_user_history?: Array<Record<string, any>>;
    sim_asset_history?: Array<Record<string, any>>;
    user?: {
        ramco_id?: string;
        full_name?: string;
        name?: string;
    } | null;
    asset?: {
        id?: number;
        register_number?: string;
    } | null;
}

interface Employee {
    ramco_id?: string;
    full_name?: string;
    name?: string;
}

interface SubscriberOption {
    id: number;
    sub_no?: string;
    account_sub?: string;
}

interface Asset {
    id: number;
    register_number?: string;
    category?: { name?: string } | null;
    brand?: { name?: string } | null;
    model?: { name?: string } | null;
    specs?: { categories?: { name?: string } | null } | null;
}

const TelcoSims: React.FC = () => {
    const [sims, setSims] = useState<SimCard[]>([]);
    const [loading, setLoading] = useState(false);
    const [showDialog, setShowDialog] = useState(false);
    const [editSim, setEditSim] = useState<SimCard | null>(null);
    const [showConfirm, setShowConfirm] = useState(false);
    const [form, setForm] = useState<{
        sim_sn: string;
        sub_no: string;
        sub_no_id: number;
        user?: string;
        asset_id?: number;
        asset_register?: string;
        effective_date?: string;
        status: "active" | "inactive";
        replacement?: boolean | null;
        replace_sim_id?: number;
        id?: number;
    }>({
        sim_sn: '',
        sub_no: '',
        sub_no_id: 0,
        asset_register: '',
        effective_date: new Date().toISOString().split('T')[0],
        status: "active",
        replacement: null,
    });
    const [detailLoading, setDetailLoading] = useState(false);
    const [subsHistory, setSubsHistory] = useState<Array<{ effective_date?: string; sub_no?: string }>>([]);
    const [userHistory, setUserHistory] = useState<Array<Record<string, any>>>([]);
    const [assetHistory, setAssetHistory] = useState<Array<Record<string, any>>>([]);

    const formatDate = (value?: string) => {
        if (!value) return '-';
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-GB');
    };
    const formatHistoryMeta = (parts: Array<string | null | undefined>) =>
        parts.filter((part) => part && String(part).trim().length > 0).join(" • ") || "-";
    const formatUserTitle = (item: Record<string, any>) =>
        item?.user?.full_name || item?.user?.name || item?.user?.ramco_id || "-";
    const formatUserMeta = (item: Record<string, any>) =>
        formatHistoryMeta([
            item?.user?.ramco_id,
            item?.department?.name,
            item?.costcenter?.name,
            item?.location?.name,
        ]);
    const formatAssetTitle = (item: Record<string, any>) =>
        item?.asset?.register_number ||
        item?.register_number ||
        (item?.asset_id ? `Asset ${item.asset_id}` : "-");
    const formatAssetMeta = (item: Record<string, any>) =>
        formatHistoryMeta([
            item?.department?.name,
            item?.costcenter?.name,
            item?.location?.name,
        ]);
    const [formLoading, setFormLoading] = useState(false);
    const [userOptions, setUserOptions] = useState<Employee[]>([]);
    const [subOptions, setSubOptions] = useState<SubscriberOption[]>([]);
    const [assetOptions, setAssetOptions] = useState<Asset[]>([]);
    const [subSearch, setSubSearch] = useState('');
    const [userSearch, setUserSearch] = useState('');
    const [assetSearch, setAssetSearch] = useState('');
    const [replaceSimSearch, setReplaceSimSearch] = useState('');
    const [showSubSelect, setShowSubSelect] = useState(false);
    const [showUserSelect, setShowUserSelect] = useState(false);
    const [showAssetSelect, setShowAssetSelect] = useState(false);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

    // Fetch SIMs
    const fetchSims = async () => {
        setLoading(true);
        try {
            const res = await authenticatedApi.get('/api/telco/sims');
            const response = res.data as { status: string; message: string; data: SimCard[] };
            const normalized = (response.data || []).map((sim) => {
                const latestUserHist = Array.isArray(sim.sim_user_history) && sim.sim_user_history.length > 0
                    ? sim.sim_user_history[0]
                    : undefined;
                const latestAssetHist = Array.isArray(sim.sim_asset_history) && sim.sim_asset_history.length > 0
                    ? sim.sim_asset_history[0]
                    : undefined;
                const derivedAssetId = sim.asset?.id ?? latestAssetHist?.asset?.id ?? (latestAssetHist as any)?.asset_id;
                const derivedAsset =
                    sim.asset ||
                    latestAssetHist?.asset ||
                    (derivedAssetId ? { id: derivedAssetId, register_number: (latestAssetHist as any)?.register_number } : null);
                return {
                    ...sim,
                    user: sim.user || latestUserHist?.user || null,
                    asset: derivedAsset,
                };
            });
            setSims(normalized);
        } catch (err) {
            toast.error('Failed to fetch SIM cards');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSims();
    }, []);

    useEffect(() => {
        const fetchSubs = async () => {
            try {
                const res = await authenticatedApi.get('/api/telco/subs');
                const response = res.data as { status?: string; data?: SubscriberOption[] };
                setSubOptions(response.data || []);
            } catch (err) {
                toast.error('Failed to fetch subscribers');
            }
        };
        const fetchUsers = async () => {
            try {
                const res = await authenticatedApi.get('/api/assets/employees?status=active');
                const response = res.data as { status?: string; data?: Employee[] };
                setUserOptions(response.data || []);
            } catch (err) {
                toast.error('Failed to fetch users');
            }
        };
        const fetchAssets = async () => {
            try {
                const res = await authenticatedApi.get('/api/assets?manager=1&status=active');
                const response = res.data as { status?: string; data?: Asset[] };
                setAssetOptions(response.data || []);
            } catch (err) {
                toast.error('Failed to fetch assets');
            }
        };
        fetchSubs();
        fetchUsers();
        fetchAssets();
    }, []);

    const clearError = (key: string) => {
        setFormErrors(prev => {
            const next = { ...prev };
            delete next[key];
            return next;
        });
    };

    const validateForm = () => {
        const errors: Record<string, string> = {};
        if (!form.sim_sn.trim()) errors.sim_sn = "SIM serial number is required";
        if (form.replacement === null || form.replacement === undefined) {
            errors.replacement = "Type is required";
        }
        if (!form.effective_date) errors.effective_date = "Effective date is required";

        if (!editSim) {
            const isReplacement = !!form.replacement;
            if (isReplacement) {
                if (!form.replace_sim_id) errors.replace_sim_id = "Select a SIM to replace";
                if (!form.sub_no_id) errors.sub_no_id = "Sub number is required";
                if (!form.user) errors.user = "User is required";
                // Asset optional for replacement per requirement
            } else {
                // New SIM: sub number, user, asset optional
            }
        }
        return errors;
    };

    const simSummary = React.useMemo(() => {
        let withoutUser = 0;
        let withoutAsset = 0;
        const statusTotals = new Map<string, number>();
        for (const sim of sims) {
            const missingUser = !sim.user || (!sim.user.full_name && !sim.user.name && !sim.user.ramco_id);
            const missingAsset = !sim.asset || !sim.asset.id;
            const status = sim.status || "Unknown";
            statusTotals.set(status, (statusTotals.get(status) || 0) + 1);
            if (missingUser) withoutUser += 1;
            if (missingAsset) withoutAsset += 1;
        }
        return {
            withoutUser,
            withoutAsset,
            statusTotals: Array.from(statusTotals.entries()).sort((a, b) => b[1] - a[1]),
        };
    }, [sims]);

    // DataGrid columns
    const columns: ColumnDef<SimCard>[] = [
        { key: 'id', header: 'ID', sortable: false },
        { key: 'sim_sn', header: 'SIM Serial', sortable: true, filter: 'input' },
        {
            key: 'sub_no' as any,
            header: 'Sub Number',
            sortable: true,
            filter: 'input',
            render: (row) => row.subs?.sub_no || row.account?.sub_no || '—'
        },
        {
            key: 'user' as any,
            header: 'Users',
            sortable: true,
            filter: 'input',
            render: (row) => row.user?.full_name || row.user?.name || row.user?.ramco_id || '—'
        },
        {
            key: 'asset' as any,
            header: 'Asset',
            sortable: true,
            filter: 'input',
            render: (row) => row.asset?.register_number || '—'
        },
        {
            key: 'status',
            header: 'Status',
            sortable: true,
            filter: 'singleSelect',
            filterParams: { options: ['active', 'inactive'] },
            render: (row) => row.status || '—'
        },
        {
            key: 'replacement_sim',
            header: 'Remarks',
            sortable: false,
            render: (row) => {
                const repl = row.replacement_sim as any;
                if (!repl) return '—';
                const replId = typeof repl === 'object' ? repl.id : repl;
                const replSn = typeof repl === 'object' ? repl.sim_sn : null;
                if (replSn) return `Replacement of ${replSn}`;
                if (replId) return `Replacement of SIM #${replId}`;
                return 'Replacement';
            },
        },
    ];

    const rowClass = (row: SimCard) => {
        if (row.status === 'deactivated') return 'text-red-600';
        return '';
    };

    // Handle open create
    const handleCreate = () => {
        setEditSim(null);
        setForm({
            sim_sn: '',
            sub_no: '',
            sub_no_id: 0,
            asset_register: '',
            user: undefined,
            asset_id: undefined,
            effective_date: new Date().toISOString().split('T')[0],
            status: "active",
            replacement: null,
            replace_sim_id: undefined,
        });
        setSubsHistory([]);
        setUserHistory([]);
        setAssetHistory([]);
        setShowSubSelect(false);
        setShowUserSelect(false);
        setShowAssetSelect(false);
        setFormErrors({});
        setShowDialog(true);
    };

    // Handle open edit
    const handleEdit = async (sim: SimCard) => {
        setShowDialog(true);
        setDetailLoading(true);
        try {
            const res = await authenticatedApi.get(`/api/telco/sims/${sim.id}`);
            const detail = (res.data as { data?: SimCard })?.data;
            if (!detail) {
                toast.error('Failed to load SIM card details');
                return;
            }
            setEditSim(detail);
            setForm({
                sim_sn: detail.sim_sn || '',
                sub_no: detail.subs?.sub_no || detail.account?.sub_no || '',
                sub_no_id: detail.subs?.id ?? 0,
                asset_register: detail.asset?.register_number || '',
                user: undefined,
                asset_id: undefined,
                effective_date: new Date().toISOString().split('T')[0],
                status: detail.status === "inactive" ? "inactive" : "active",
                replacement: null,
                replace_sim_id: undefined,
                id: detail.id,
            });
            setSubsHistory(detail.sim_subs_history || []);
            setUserHistory(detail.sim_user_history || []);
            setAssetHistory(detail.sim_asset_history || []);
            setFormErrors({});
        } catch (err) {
            toast.error('Failed to load SIM card details');
        } finally {
            setDetailLoading(false);
        }
    };

    const handleClose = () => {
        setShowDialog(false);
        setEditSim(null);
        setSubsHistory([]);
        setUserHistory([]);
        setAssetHistory([]);
        setShowSubSelect(false);
        setShowUserSelect(false);
        setShowAssetSelect(false);
        setFormErrors({});
    };

    // Handle form submit
    const handleSubmit = async (e?: React.FormEvent, confirmed = false) => {
        e?.preventDefault();
        const errors = validateForm();
        setFormErrors(errors);
        if (Object.keys(errors).length > 0) return;
        if (!confirmed) {
            setShowConfirm(true);
            return;
        }
        setFormLoading(true);
        try {
            const method = editSim ? 'PUT' : 'POST';
            const url = editSim ? `/api/telco/sims/${editSim.id}` : '/api/telco/sims';
            let payload: Record<string, any>;
            if (editSim) {
                payload = {
                    sim_sn: form.sim_sn,
                    sub_no_id: form.sub_no_id || undefined,
                    ramco_id: form.user || undefined,
                    asset_id: form.asset_id || undefined,
                    effective_date: form.effective_date || undefined,
                    status: form.status,
                };
            } else {
                payload = {
                    sim_sn: form.sim_sn,
                    status: form.status,
                    replacement_sim: form.replacement ? (form.replace_sim_id ?? null) : null,
                    reason: form.replacement ? "replace" : "new",
                    sub_no_id: form.sub_no_id || null,
                    ramco_id: form.user || null,
                    asset_id: form.asset_id || null,
                    effective_date: form.effective_date || undefined,
                };
            }
            const res = await authenticatedApi.request({
                method,
                url,
                data: payload,
                headers: { 'Content-Type': 'application/json' },
            });
            const data = res?.data ?? {};
            if (data.status === 'success') {
                toast.success(editSim ? 'SIM updated' : 'SIM created');
                setShowDialog(false);
                setShowConfirm(false);
                fetchSims();
            } else {
                toast.error(data.message || 'Failed to save SIM');
            }
        } catch (err) {
            toast.error('Failed to save SIM');
        } finally {
            setFormLoading(false);
        }
    };

    return (
        <div className="mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                <Card className="bg-stone-100">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold">SIMs without User</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{simSummary.withoutUser}</div>
                        <div className="text-xs">No user linked to SIM</div>
                    </CardContent>
                </Card>
                <Card className="bg-stone-100">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold">SIMs without Device</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{simSummary.withoutAsset}</div>
                        <div className="text-xs">No device/asset linked to SIM</div>
                    </CardContent>
                </Card>
                <Card className="bg-stone-100">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold">Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-xs space-y-1">
                            {simSummary.statusTotals.length === 0 ? (
                                <div className="flex justify-between">
                                    <span>—</span>
                                    <span>0</span>
                                </div>
                            ) : (
                                simSummary.statusTotals.map(([status, count]) => (
                                    <div key={status} className="flex justify-between">
                                        <span className="capitalize">{status}</span>
                                        <span className="font-semibold">{count}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">SIM Cards</h2>
                <div className="flex items-center gap-2">
                    <ExcelTelcoSims />
                    <Button onClick={handleCreate} variant="default"><Plus /></Button>
                </div>
            </div>
            
            <CustomDataGrid
                data={sims}
                columns={columns}
                pageSize={10}
                pagination={false}
                inputFilter={false}
                theme="sm"
                onRowDoubleClick={handleEdit}
                rowClass={rowClass}
                dataExport={false}
            />
            <ActionSidebar
                isOpen={showDialog}
                onClose={handleClose}
                size="lg"
                title={editSim ? 'Update SIM Card' : 'Create SIM Card'}
                content={
                    <div className="flex flex-col gap-4">
                        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                            <div>
                                <div className="mb-1 flex items-center justify-between">
                                    <label htmlFor="sim_sn" className="block text-sm font-medium">SIM Serial Number</label>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <span className={form.status === "active" ? "text-emerald-600 font-semibold" : ""}>Active</span>
                                        <Switch
                                            checked={form.status === "active"}
                                            onCheckedChange={(checked) =>
                                                setForm((f) => ({ ...f, status: checked ? "active" : "inactive" }))
                                            }
                                        />
                                        <span className={form.status === "inactive" ? "text-rose-600 font-semibold" : ""}>Inactive</span>
                                    </div>
                                </div>
                                <Input
                                    id="sim_sn"
                                    value={form.sim_sn}
                                    onChange={e => {
                                        clearError("sim_sn");
                                        setForm(f => ({ ...f, sim_sn: e.target.value }));
                                    }}
                                    required
                                    aria-invalid={!!formErrors.sim_sn}
                                />
                                {formErrors.sim_sn && <p className="text-xs text-red-600 mt-1">{formErrors.sim_sn}</p>}
                            </div>
                            {!editSim && (
                                <div className="flex flex-col gap-2">
                                    <div className="flex flex-col gap-2">
                                        <span className="text-sm font-medium">Type</span>
                                        <RadioGroup
                                            className="flex flex-wrap gap-4"
                                            value={
                                                form.replacement === null || form.replacement === undefined
                                                    ? ""
                                                    : form.replacement
                                                        ? "replacement"
                                                        : "new"
                                            }
                                            onValueChange={(value) => {
                                                clearError("replace_sim_id");
                                                const isReplacement = value === "replacement";
                                                setForm(f => ({
                                                    ...f,
                                                    replacement: isReplacement,
                                                    replace_sim_id: isReplacement ? f.replace_sim_id : undefined,
                                                }));
                                                clearError("replacement");
                                            }}
                                        >
                                            <label htmlFor="sim-type-new" className="flex items-center gap-2 cursor-pointer text-sm">
                                                <RadioGroupItem id="sim-type-new" value="new" />
                                                <span>New</span>
                                            </label>
                                            <label htmlFor="sim-type-replacement" className="flex items-center gap-2 cursor-pointer text-sm">
                                                <RadioGroupItem id="sim-type-replacement" value="replacement" />
                                                <span>Replacement</span>
                                            </label>
                                        </RadioGroup>
                                    </div>
                                    <Select
                                        value={form.replace_sim_id ? String(form.replace_sim_id) : ''}
                                        onValueChange={async (value) => {
                                            const nextId = Number(value);
                                            let selected = sims.find((sim) => sim.id === nextId);
                                            try {
                                                const res = await authenticatedApi.get(`/api/telco/sims/${nextId}`);
                                                const detail = (res.data as { data?: SimCard })?.data;
                                                if (detail) selected = detail;
                                            } catch (err) {
                                                // fallback to existing list item
                                            }

                                            const latestUser = Array.isArray(selected?.sim_user_history)
                                                ? selected.sim_user_history[0]
                                                : undefined;
                                            const latestAsset = Array.isArray(selected?.sim_asset_history)
                                                ? selected.sim_asset_history[0]
                                                : undefined;
                                            setForm((prev) => {
                                                const derivedAssetId =
                                                    selected?.asset?.id ??
                                                    latestAsset?.asset?.id ??
                                                    (latestAsset as any)?.asset_id ??
                                                    prev.asset_id;
                                                const derivedAssetReg =
                                                    selected?.asset?.register_number ??
                                                    latestAsset?.asset?.register_number ??
                                                    (latestAsset as any)?.register_number ??
                                                    prev.asset_register;
                                                return {
                                                    ...prev,
                                                    replace_sim_id: nextId,
                                                    sub_no_id: selected?.subs?.id ?? prev.sub_no_id,
                                                    sub_no: selected?.subs?.sub_no || selected?.account?.sub_no || prev.sub_no,
                                                    user: selected?.user?.ramco_id ?? latestUser?.user?.ramco_id ?? prev.user,
                                                    asset_id: derivedAssetId,
                                                    asset_register: derivedAssetReg,
                                                };
                                            });
                                            clearError("replace_sim_id");
                                            setShowSubSelect(false);
                                            setShowUserSelect(false);
                                            setShowAssetSelect(false);
                                        }}
                                        disabled={!form.replacement}
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="To Replace (search SIM serial)" />
                                        </SelectTrigger>
                                        <SelectContent searchable onSearchChange={setReplaceSimSearch} searchPlaceholder="Search SIM serial...">
                                            {sims
                                                .filter((sim) => (sim.sim_sn || '').toLowerCase().includes(replaceSimSearch.toLowerCase()))
                                                .map((sim) => (
                                                    <SelectItem
                                                        key={sim.id}
                                                        value={String(sim.id)}
                                                        disabled={(sim.status || '').toLowerCase() === 'inactive'}
                                                    >
                                                        {sim.sim_sn || `SIM ${sim.id}`}
                                                    </SelectItem>
                                                ))}
                                        </SelectContent>
                                    </Select>
                                    {form.replacement && formErrors.replace_sim_id && (
                                        <p className="text-xs text-red-600">{formErrors.replace_sim_id}</p>
                                    )}
                                </div>
                            )}
                            <div>
                                <div className="mb-1 flex items-center justify-between">
                                    <label htmlFor="sub_no" className="block text-sm font-medium">Sub Number</label>
                                </div>
                                {showSubSelect ? (
                                    <Select
                                        value={form.sub_no_id ? String(form.sub_no_id) : ''}
                                        onValueChange={(value) => {
                                            const nextId = Number(value);
                                            const selected = subOptions.find((sub) => sub.id === nextId);
                                            setForm((prev) => ({
                                                ...prev,
                                                sub_no_id: nextId,
                                                sub_no: selected?.sub_no || '',
                                            }));
                                            clearError("sub_no_id");
                                            setShowSubSelect(false);
                                        }}
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Select phone number" />
                                        </SelectTrigger>
                                        <SelectContent searchable onSearchChange={setSubSearch} searchPlaceholder="Search subscriber...">
                                            {subOptions
                                                .filter((sub) => (sub.sub_no || '').toLowerCase().includes(subSearch.toLowerCase()))
                                                .map((sub) => (
                                                    <SelectItem key={sub.id} value={String(sub.id)}>
                                                        {sub.sub_no || `Subscriber ${sub.id}`}
                                                    </SelectItem>
                                                ))}
                                        </SelectContent>
                                    </Select>
                                ) : (
                                    <div className="relative">
                                        <Input
                                            id="sub_no"
                                            value={form.sub_no}
                                            placeholder="Click change to update data"
                                            readOnly
                                            required
                                            aria-invalid={!!formErrors.sub_no_id}
                                            className={`pr-10 ${formErrors.sub_no_id ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                                        />
                                        <span
                                            className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-amber-600 hover:text-amber-700"
                                            onClick={() => setShowSubSelect(true)}
                                            aria-label="Change phone number"
                                        >
                                            <ArrowLeftRight className="h-4 w-4" />
                                        </span>
                                    </div>
                                )}
                                {formErrors.sub_no_id && <p className="text-xs text-red-600 mt-1">{formErrors.sub_no_id}</p>}
                            </div>
                            <div>
                                <div className="mb-1 flex items-center justify-between">
                                    <label htmlFor="user" className="block text-sm font-medium">User</label>
                                </div>
                                {showUserSelect ? (
                                    <Select
                                        value={form.user || ''}
                                        onValueChange={(value) => {
                                            setForm((prev) => ({ ...prev, user: value }));
                                            clearError("user");
                                            setShowUserSelect(false);
                                        }}
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Select user" />
                                        </SelectTrigger>
                                        <SelectContent searchable onSearchChange={setUserSearch} searchPlaceholder="Search user...">
                                            {userOptions
                                                .filter((user) => (user.full_name || user.name || '').toLowerCase().includes(userSearch.toLowerCase()))
                                                .map((user) => (
                                                    <SelectItem key={user.ramco_id} value={user.ramco_id || ''}>
                                                        {user.full_name || user.name || user.ramco_id}
                                                    </SelectItem>
                                                ))}
                                        </SelectContent>
                                    </Select>
                                ) : (
                                    <div className="relative">
                                        <Input
                                            id="user"
                                            value={
                                                form.user
                                                    ? (userOptions.find((user) => user.ramco_id === form.user)?.full_name || form.user)
                                                    : ''
                                            }
                                            placeholder="Click change to update data"
                                            readOnly
                                            required
                                            aria-invalid={!!formErrors.user}
                                            className={`pr-10 ${formErrors.user ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                                        />
                                        <span
                                            className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-amber-600 hover:text-amber-700"
                                            onClick={() => setShowUserSelect(true)}
                                            aria-label="Change user"
                                        >
                                            <ArrowLeftRight className="h-4 w-4" />
                                        </span>
                                    </div>
                                )}
                                {formErrors.user && <p className="text-xs text-red-600 mt-1">{formErrors.user}</p>}
                            </div>
                            <div>
                                <div className="mb-1 flex items-center justify-between">
                                    <label htmlFor="asset_id" className="block text-sm font-medium">Asset</label>
                                </div>
                                {showAssetSelect ? (
                                    <Select
                                        value={form.asset_id ? String(form.asset_id) : ''}
                                        onValueChange={(value) => {
                                            setForm((prev) => {
                                                const chosen = assetOptions.find((asset) => asset.id === Number(value));
                                                return {
                                                    ...prev,
                                                    asset_id: Number(value),
                                                    asset_register: chosen?.register_number || prev.asset_register,
                                                };
                                            });
                                            setShowAssetSelect(false);
                                        }}
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Select asset" />
                                        </SelectTrigger>
                                        <SelectContent searchable onSearchChange={setAssetSearch} searchPlaceholder="Search asset...">
                                            {assetOptions
                                                .filter((asset) => (asset.register_number || '').toLowerCase().includes(assetSearch.toLowerCase()))
                                                .map((asset) => (
                                                    <SelectItem key={asset.id} value={String(asset.id)}>
                                                        <div className="flex flex-col">
                                                            <span className="font-medium">{asset.register_number || `Asset ${asset.id}`}</span>
                                                            <span className="text-xs text-muted-foreground">
                                                                {[
                                                                    asset.category?.name || asset.specs?.categories?.name,
                                                                    asset.brand?.name,
                                                                    asset.model?.name
                                                                ].filter(Boolean).join(' • ') || '—'}
                                                            </span>
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                        </SelectContent>
                                    </Select>
                                ) : (
                                    <div className="relative">
                                        <Input
                                            id="asset_id"
                                            value={
                                                form.asset_id
                                                    ? (assetOptions.find((asset) => asset.id === form.asset_id)?.register_number || form.asset_register || String(form.asset_id))
                                                    : (form.asset_register || '')
                                            }
                                            placeholder="Click change to update data"
                                            readOnly
                                            className="pr-10"
                                        />
                                        <span
                                            className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-amber-600 hover:text-amber-700"
                                            onClick={() => setShowAssetSelect(true)}
                                            aria-label="Change asset"
                                        >
                                            <ArrowLeftRight className="h-4 w-4" />
                                        </span>
                                    </div>
                                )}
                            </div>
                            <div>
                                <label htmlFor="effective_date" className="block text-sm font-medium mb-1">Effective Date</label>
                                <Input
                                    id="effective_date"
                                    type="date"
                                    value={form.effective_date || ''}
                                    onChange={e => {
                                        clearError("effective_date");
                                        setForm(f => ({ ...f, effective_date: e.target.value }));
                                    }}
                                    required
                                    aria-invalid={!!formErrors.effective_date}
                                />
                                {formErrors.effective_date && <p className="text-xs text-red-600 mt-1">{formErrors.effective_date}</p>}
                            </div>
                            <div className="flex gap-2 pt-2">
                                <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
                                <Button type="submit" variant="default" disabled={formLoading || detailLoading}>
                                    {formLoading ? 'Saving...' : (editSim ? 'Update' : 'Create')}
                                </Button>
                            </div>
                        </form>
                        {editSim && (
                            <>
                                <Separator />
                                <div className="flex flex-col gap-4 text-sm md:flex-row">
                                    <div className="flex-1">
                                        <div className="font-semibold mb-2">Subscriber History</div>
                                        {detailLoading ? (
                                            <div className="text-muted-foreground">Loading history...</div>
                                        ) : subsHistory.length > 0 ? (
                                            <ul className="space-y-5">
                                                {subsHistory.map((item, idx) => (
                                                    <li key={`${item.sub_no}-${idx}`} className="flex gap-3">
                                                        <div className="relative flex w-4 justify-center">
                                                            <span className="absolute inset-y-0 w-px bg-border" />
                                                            <span className="relative z-10 mt-4 h-3 w-3 rounded-full border border-blue-500 bg-white" />
                                                        </div>
                                                        <div className="flex flex-1 flex-col gap-1 rounded-md border border-border bg-white p-3 shadow-sm">
                                                            <span className="font-medium">{item.sub_no || '-'}</span>
                                                            <span className="text-xs text-muted-foreground">{formatDate(item.effective_date)}</span>
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <div className="text-muted-foreground">No subscriber history.</div>
                                        )}
                                    </div>
                                    <div className="hidden w-px bg-border md:block" />
                                    <div className="flex-1">
                                        <div className="font-semibold mb-2">User History</div>
                                        {detailLoading ? (
                                            <div className="text-muted-foreground">Loading history...</div>
                                        ) : userHistory.length > 0 ? (
                                            <ul className="space-y-5">
                                                {userHistory.map((item, idx) => (
                                                    <li key={`user-${idx}`} className="flex gap-3">
                                                        <div className="relative flex w-4 justify-center">
                                                            <span className="absolute inset-y-0 w-px bg-border" />
                                                            <span className="relative z-10 mt-4 h-3 w-3 rounded-full border border-emerald-500 bg-white" />
                                                        </div>
                                                        <div className="flex flex-1 flex-col gap-1 rounded-md border border-border bg-white p-3 shadow-sm">
                                                            <span className="font-medium">{formatUserTitle(item)}</span>
                                                            <span className="text-xs text-muted-foreground">{formatUserMeta(item)}</span>
                                                            <span className="text-xs text-muted-foreground">{formatDate(item.effective_date)}</span>
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <div className="text-muted-foreground">No user history.</div>
                                        )}
                                    </div>
                                    <div className="hidden w-px bg-border md:block" />
                                    <div className="flex-1">
                                        <div className="font-semibold mb-2">Asset History</div>
                                        {detailLoading ? (
                                            <div className="text-muted-foreground">Loading history...</div>
                                        ) : assetHistory.length > 0 ? (
                                            <ul className="space-y-5">
                                                {assetHistory.map((item, idx) => (
                                                    <li key={`asset-${idx}`} className="flex gap-3">
                                                        <div className="relative flex w-4 justify-center">
                                                            <span className="absolute inset-y-0 w-px bg-border" />
                                                            <span className="relative z-10 mt-4 h-3 w-3 rounded-full border border-amber-500 bg-white" />
                                                        </div>
                                                        <div className="flex flex-1 flex-col gap-1 rounded-md border border-border bg-white p-3 shadow-sm">
                                                            <span className="font-medium">{formatAssetTitle(item)}</span>
                                                            <span className="text-xs text-muted-foreground">{formatAssetMeta(item)}</span>
                                                            <span className="text-xs text-muted-foreground">{formatDate(item.effective_date)}</span>
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <div className="text-muted-foreground">No asset history.</div>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                }
            />
            <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editSim ? 'Confirm update' : 'Confirm create'}</DialogTitle>
                    </DialogHeader>
                    <div className="text-sm text-muted-foreground">
                        {editSim ? 'Are you sure you want to update this SIM card?' : 'Are you sure you want to create this SIM card?'}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowConfirm(false)}>Cancel</Button>
                        <Button onClick={() => handleSubmit(undefined, true)} disabled={formLoading || detailLoading}>
                            {formLoading ? 'Updating...' : 'Confirm'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default TelcoSims;
