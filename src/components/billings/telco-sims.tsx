import React, { useEffect, useState } from 'react';
import { authenticatedApi } from '@/config/api';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ActionSidebar from "@components/ui/action-aside";
import { CustomDataGrid, ColumnDef } from "@/components/ui/DataGrid";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, ArrowLeftRight } from "lucide-react";
import { toast } from 'sonner';

interface SimCard {
    id: number;
    sim_sn: string;
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
        effective_date?: string;
        id?: number;
    }>({
        sim_sn: '',
        sub_no: '',
        sub_no_id: 0,
        effective_date: new Date().toISOString().split('T')[0],
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
    const [formLoading, setFormLoading] = useState(false);
    const [userOptions, setUserOptions] = useState<Employee[]>([]);
    const [subOptions, setSubOptions] = useState<SubscriberOption[]>([]);
    const [assetOptions, setAssetOptions] = useState<Asset[]>([]);
    const [subSearch, setSubSearch] = useState('');
    const [userSearch, setUserSearch] = useState('');
    const [assetSearch, setAssetSearch] = useState('');
    const [showSubSelect, setShowSubSelect] = useState(false);
    const [showUserSelect, setShowUserSelect] = useState(false);
    const [showAssetSelect, setShowAssetSelect] = useState(false);

    // Fetch SIMs
    const fetchSims = async () => {
        setLoading(true);
        try {
            const res = await authenticatedApi.get('/api/telco/sims');
            const response = res.data as { status: string; message: string; data: SimCard[] };
            setSims(response.data || []);
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
    ];

    // Handle open create
    const handleCreate = () => {
        setEditSim(null);
        setForm({
            sim_sn: '',
            sub_no: '',
            sub_no_id: 0,
            user: undefined,
            asset_id: undefined,
            effective_date: new Date().toISOString().split('T')[0],
        });
        setSubsHistory([]);
        setUserHistory([]);
        setAssetHistory([]);
        setShowSubSelect(false);
        setShowUserSelect(false);
        setShowAssetSelect(false);
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
                user: undefined,
                asset_id: undefined,
                effective_date: new Date().toISOString().split('T')[0],
                id: detail.id,
            });
            setSubsHistory(detail.sim_subs_history || []);
            setUserHistory(detail.sim_user_history || []);
            setAssetHistory(detail.sim_asset_history || []);
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
    };

    // Handle form submit
    const handleSubmit = async (e?: React.FormEvent, confirmed = false) => {
        e?.preventDefault();
        if (editSim && !confirmed) {
            setShowConfirm(true);
            return;
        }
        setFormLoading(true);
        try {
            const method = editSim ? 'PUT' : 'POST';
            const url = editSim ? `/api/telco/sims/${editSim.id}` : '/api/telco/sims';
            const payload = {
                sim_sn: form.sim_sn,
                sub_no_id: form.sub_no_id || undefined,
                ramco_id: form.user || undefined,
                asset_id: form.asset_id || undefined,
                effective_date: form.effective_date || undefined,
            };
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
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
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">SIM Cards</h2>
                <Button onClick={handleCreate} variant="default"><Plus /></Button>
            </div>
            <CustomDataGrid
                data={sims}
                columns={columns}
                pageSize={10}
                pagination={false}
                inputFilter={false}
                theme="sm"
                onRowDoubleClick={handleEdit}
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
                                <label htmlFor="sim_sn" className="block text-sm font-medium mb-1">SIM Serial Number</label>
                                <Input
                                    id="sim_sn"
                                    value={form.sim_sn}
                                    onChange={e => setForm(f => ({ ...f, sim_sn: e.target.value }))}
                                    required
                                />
                            </div>
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
                                            className="pr-10"
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
                                            className="pr-10"
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
                            </div>
                            <div>
                                <div className="mb-1 flex items-center justify-between">
                                    <label htmlFor="asset_id" className="block text-sm font-medium">Asset</label>
                                </div>
                                {showAssetSelect ? (
                                    <Select
                                        value={form.asset_id ? String(form.asset_id) : ''}
                                        onValueChange={(value) => {
                                            setForm((prev) => ({ ...prev, asset_id: Number(value) }));
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
                                                        {asset.register_number || `Asset ${asset.id}`}
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
                                                    ? (assetOptions.find((asset) => asset.id === form.asset_id)?.register_number || String(form.asset_id))
                                                    : ''
                                            }
                                            placeholder="Click change to update data"
                                            readOnly
                                            required
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
                                    onChange={e => setForm(f => ({ ...f, effective_date: e.target.value }))}
                                />
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
                                            <ul className="relative space-y-3 border-l border-border pl-4">
                                                {subsHistory.map((item, idx) => (
                                                    <li key={`${item.sub_no}-${idx}`} className="relative flex flex-col gap-1">
                                                        <span className="absolute -left-[9px`] top-1 h-3 w-3 rounded-full border border-blue-500 bg-white" />
                                                        <span className="font-medium">{item.sub_no || '-'}</span>
                                                        <span className="text-xs text-muted-foreground">{formatDate(item.effective_date)}</span>
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
                                            <ul className="relative space-y-3 border-l border-border pl-4">
                                                {userHistory.map((item, idx) => (
                                                    <li key={`user-${idx}`} className="relative flex flex-col gap-1 text-muted-foreground">
                                                        <span className="absolute -left-2.25 top-1 h-3 w-3 rounded-full border border-emerald-500 bg-white" />
                                                        <span className="text-xs">{JSON.stringify(item)}</span>
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
                                            <ul className="relative space-y-3 border-l border-border pl-4">
                                                {assetHistory.map((item, idx) => (
                                                    <li key={`asset-${idx}`} className="relative flex flex-col gap-1 text-muted-foreground">
                                                        <span className="absolute -left-2.25 top-1 h-3 w-3 rounded-full border border-amber-500 bg-white" />
                                                        <span className="text-xs">{JSON.stringify(item)}</span>
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
                        <DialogTitle>Confirm update</DialogTitle>
                    </DialogHeader>
                    <div className="text-sm text-muted-foreground">
                        Are you sure you want to update this SIM card?
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
