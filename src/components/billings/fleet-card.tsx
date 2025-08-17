"use client";
import React, { useEffect, useState } from "react";
import { authenticatedApi } from "@/config/api";
import { CustomDataGrid, ColumnDef } from '@/components/ui/DataGrid';
import ActionSidebar from "@components/ui/action-aside";
import { Plus, ArrowBigLeft, ArrowBigRight, Loader2 } from "lucide-react";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";

interface FleetCard {
    id: number;
    card_no: string;
    vendor?: {
        fuel_id?: number;
        fuel_issuer?: string;
    };
    asset?: {
        id: number;
        register_number?: string;
        costcenter?: { id: number; name: string };
        fuel_type?: string;
        purpose?: string;
    };
    vehicle_id?: number;
    reg_date?: string | null;
    remarks?: string | null;
    pin_no?: string | null;
    status?: string;
    expiry?: string | null;
}

interface IssuerOption {
    fuel_id: number;
    f_issuer: string;
}

const FleetCardList: React.FC = () => {
    const [cards, setCards] = useState<FleetCard[]>([]);
    const [issuers, setIssuers] = useState<IssuerOption[]>([]);
    const [assets, setAssets] = useState<{ id: number; register_number?: string; costcenter?: { id: number; name: string } }[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [assetPickerOpen, setAssetPickerOpen] = useState(false);
    const [assetOptions, setAssetOptions] = useState<{ id: number; register_number?: string; costcenter?: { id: number; name: string } }[]>([]);
    const [assetSearch, setAssetSearch] = useState('');
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [editingCard, setEditingCard] = useState<FleetCard | null>(null);
    const [formLoading, setFormLoading] = useState(false);
    const [showDuplicatesOnly, setShowDuplicatesOnly] = useState(false);
    const [showDuplicateCardsOnly, setShowDuplicateCardsOnly] = useState(false);

    interface FleetForm {
        card_no: string;
        asset_id: string;
        fuel_id: string;
        pin: string;
        status: string;
        reg_date: string;
        expiry_date: string;
        remarks: string;
    }

    const [form, setForm] = useState<FleetForm>({
        card_no: '',
        asset_id: '',
        fuel_id: '',
        pin: '',
        status: 'active',
        reg_date: '',
        expiry_date: '',
        remarks: '',
    });

    useEffect(() => {
        setLoading(true);
        setError(null);
        Promise.all([
            authenticatedApi.get<{ data: FleetCard[] }>("/api/bills/fleet"),
            authenticatedApi.get<{ data: IssuerOption[] }>("/api/bills/fuel/issuer")
        ])
        .then(([cardsRes, issuersRes]) => {
            const fetched = cardsRes.data?.data || [];
            setCards(fetched);
            setIssuers(issuersRes.data?.data || []);
            // derive unique assets from cards so form can show register_number
            const uniqueAssetsMap = new Map<number, { id: number; register_number?: string; costcenter?: { id: number; name: string } }>();
            fetched.forEach(c => {
                if (c.asset && c.asset.id != null && !uniqueAssetsMap.has(c.asset.id)) {
                    uniqueAssetsMap.set(c.asset.id, { id: c.asset.id, register_number: c.asset.register_number, costcenter: c.asset.costcenter });
                }
            });
            setAssets(Array.from(uniqueAssetsMap.values()));
            setLoading(false);
        })
        .catch(() => {
            setError("Failed to load fleet cards.");
            setLoading(false);
        });
    }, []);

    // compute duplicated asset ids
    const duplicatedAssetIds = React.useMemo(() => {
        const counts = new Map<number, number>();
        cards.forEach(c => {
            const id = c.asset?.id;
            if (typeof id === 'number') counts.set(id, (counts.get(id) || 0) + 1);
        });
        const dup = new Set<number>();
        counts.forEach((v, k) => { if (v > 1) dup.add(k); });
        return dup;
    }, [cards]);

    const duplicatedCount = duplicatedAssetIds.size;

    // compute duplicated card numbers
    const duplicatedCardNumbers = React.useMemo(() => {
        const counts = new Map<string, number>();
        cards.forEach(c => {
            const v = c.card_no;
            if (v) counts.set(v, (counts.get(v) || 0) + 1);
        });
        const dup = new Set<string>();
        counts.forEach((v, k) => { if (v > 1) dup.add(k); });
        return dup;
    }, [cards]);

    const duplicatedCardsCount = duplicatedCardNumbers.size;

    // data to show in grid based on filter
    const displayedCards = React.useMemo(() => {
        return cards.filter(c => {
            if (showDuplicateCardsOnly && !duplicatedCardNumbers.has(c.card_no || '')) return false;
            if (showDuplicatesOnly && !(c.asset && duplicatedAssetIds.has(c.asset.id!))) return false;
            return true;
        });
    }, [cards, showDuplicatesOnly, duplicatedAssetIds, showDuplicateCardsOnly, duplicatedCardNumbers]);

    // derive singleSelect options from data
    const costcenterOptions = React.useMemo(() => {
        const set = new Set<string>();
        cards.forEach(c => {
            const name = c.asset?.costcenter?.name;
            if (name) set.add(name);
        });
        return Array.from(set);
    }, [cards]);

    const fuelTypeOptions = React.useMemo(() => {
        const set = new Set<string>();
        cards.forEach(c => {
            const v = c.asset?.fuel_type;
            if (v) set.add(v);
        });
        return Array.from(set);
    }, [cards]);

    const purposeOptions = React.useMemo(() => {
        const set = new Set<string>();
        cards.forEach(c => {
            const v = c.asset?.purpose;
            if (v) set.add(v);
        });
        return Array.from(set);
    }, [cards]);

    const statusOptions = React.useMemo(() => {
        const set = new Set<string>();
        cards.forEach(c => {
            const v = c.status;
            if (v) set.add(v);
        });
        return Array.from(set);
    }, [cards]);

    const columns: ColumnDef<FleetCard>[] = [
        {
            key: "__row" as any,
            header: '#',
            render: (row: FleetCard) => {
                const idx = displayedCards.findIndex(r => r.id === row.id);
                return idx >= 0 ? String(idx + 1) : '';
            },
            sortable: false,
            filter: undefined,
            width: 50,
        },
        {
            key: 'card_no',
            header: 'Card No',
            render: (row: FleetCard) => row.card_no || '',
            sortable: true,
            filter: 'input',
        },
        {
            key: 'vendor',
            header: 'Vendor',
            render: (row: FleetCard) => row.vendor?.fuel_issuer || '',
            filter: 'input',
        },
        {
            key: 'register_number',
            header: 'Register Number',
            render: (row: FleetCard) => row.asset?.register_number || '',
            sortable: true,
            filter: 'input',
        },
        {
            key: 'pin_no',
            header: 'PIN',
            render: (row: FleetCard) => row.pin_no || '',
            filter: 'input',
        },
        {
            key: 'fuel_type',
            header: 'Fuel Type',
            render: (row: FleetCard) => row.asset?.fuel_type || '',
            filter: 'singleSelect',
            filterParams: { options: fuelTypeOptions },
            colClass: 'capitalize',
        },
        {
            key: 'costcenter',
            header: 'Cost Center',
            render: (row: FleetCard) => row.asset?.costcenter?.name || '',
            filter: 'singleSelect',
            filterParams: { options: costcenterOptions },
        },
        {
            key: 'purpose',
            header: 'Purpose',
            render: (row: FleetCard) => row.asset?.purpose || '',
            filter: 'singleSelect',
            filterParams: { options: purposeOptions },
            colClass: 'capitalize',
        },
        {
            key: 'status',
            header: 'Status',
            render: (row: FleetCard) => row.status || '',
            filter: 'singleSelect',
            filterParams: { options: statusOptions },
            colClass: 'capitalize',
        },
        {
            key: 'reg_date',
            header: 'Registration Date',
            render: (row: FleetCard) => {
                if (!row.reg_date) return '';
                const d = new Date(row.reg_date);
                return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
            },
        },
        {
            key: 'expiry',
            header: 'Expiry Date',
            render: (row: FleetCard) => {
                if (!row.expiry) return '';
                const d = new Date(row.expiry);
                return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
            },
        },
    ] as any;

    const openEditor = (card?: FleetCard) => {
        if (card) {
            setEditingCard(card);
            setForm({
                card_no: card.card_no || '',
                asset_id: card.asset?.id ? String(card.asset.id) : '',
                fuel_id: card.vendor?.fuel_id ? String(card.vendor.fuel_id) : '',
                pin: card.pin_no || '',
                status: (card.status || 'active').toLowerCase(),
                reg_date: card.reg_date ? card.reg_date.slice(0, 10) : '',
                expiry_date: card.expiry ? card.expiry.slice(0, 10) : '',
                remarks: card.remarks || '',
            });
        } else {
            setEditingCard(null);
            setForm({ card_no: '', asset_id: '', fuel_id: '', pin: '', status: 'active', reg_date: '', expiry_date: '', remarks: '' });
        }
        setSidebarOpen(true);
    };

    // fetch active assets for picker when opened
    useEffect(() => {
        if (!assetPickerOpen) return;
        // if we already have options, use cached list to avoid duplicate requests
        if (assetOptions.length > 0) return;
        authenticatedApi.get<{ data: { id: number; register_number?: string; costcenter?: { id: number; name: string } }[] }>("/api/assets", { params: { type: 2, status: 'active' } })
            .then(res => setAssetOptions(res.data?.data || []))
            .catch(() => {
                toast.error('Failed to load assets');
                setAssetOptions([]);
            });
    }, [assetPickerOpen, assetOptions.length]);

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const payload = {
            card_no: form.card_no,
            pin: form.pin,
            fuel_id: form.fuel_id,
            asset_id: form.asset_id,
            status: form.status,
            reg_date: form.reg_date || null,
            expiry_date: form.expiry_date || null,
            remarks: form.remarks,
        };
        try {
            setFormLoading(true);
            if (editingCard) {
                await authenticatedApi.put(`/api/bills/fleet/${editingCard.id}`, payload);
                toast.success("Fleet card updated successfully");
            } else {
                await authenticatedApi.post('/api/bills/fleet', payload);
                toast.success("Fleet card created successfully");
            }
            // refresh
            const res = await authenticatedApi.get<{ data: FleetCard[] }>("/api/bills/fleet");
            setCards(res.data?.data || []);
            setSidebarOpen(false);
            setEditingCard(null);
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to save fleet card.');
        } finally {
            setFormLoading(false);
        }
    };

    if (loading) return <div className="p-4">Loading...</div>;
    if (error) return <div className="p-4 text-red-600">{error}</div>;

    return (
        <div className="mt-4">
            {/* Summary cards: duplicates info and toggles */}
            <div className="mb-4 flex items-center gap-4">
                <div className="p-3 border rounded bg-sky-100 shadow-sm">
                    <div className="text-sm text-muted-foreground">Total Cards</div>
                    <div className="text-lg font-semibold">{cards.length}</div>
                </div>
                <div
                    className={`p-3 border rounded bg-yellow-100 shadow-sm cursor-pointer ${showDuplicatesOnly ? 'ring-2 ring-amber-300' : ''}`}
                    onClick={() => setShowDuplicatesOnly(s => !s)}
                    role="button"
                    aria-pressed={showDuplicatesOnly}
                >
                    <div className="text-sm text-muted-foreground">Assets with many cards</div>
                    <div className="text-lg font-semibold">{duplicatedCount}</div>
                </div>
                <div
                    className={`p-3 border rounded bg-rose-100 shadow-sm cursor-pointer ${showDuplicateCardsOnly ? 'ring-2 ring-rose-300' : ''}`}
                    onClick={() => setShowDuplicateCardsOnly(s => !s)}
                    role="button"
                    aria-pressed={showDuplicateCardsOnly}
                >
                    <div className="text-sm text-muted-foreground">Duplicated Card Numbers</div>
                    <div className="text-lg font-semibold">{duplicatedCardsCount}</div>
                </div>
            </div>
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Fleet Cards Management</h2>
                <Button
                    variant={'default'}
                    onClick={() => openEditor()}
                >
                    <Plus size={20} />
                </Button>
            </div>
            <CustomDataGrid
                columns={columns}
                data={displayedCards}
                pagination={false}
                pageSize={10}
                dataExport={true}
                inputFilter={false}
                onRowDoubleClick={(row: FleetCard) => openEditor(row)}
                rowClass={(row: FleetCard) => {
                    if (duplicatedCardNumbers.has(row.card_no || '')) return 'bg-rose-100';
                    if (row.asset && duplicatedAssetIds.has(row.asset.id!)) return 'bg-amber-100';
                    return '';
                }}
            />

            {sidebarOpen && (
                <ActionSidebar
                    onClose={() => setSidebarOpen(false)}
                    title={editingCard ? 'Edit Fleet Card' : 'Add Fleet Card'}
                    size={assetPickerOpen ? 'md' : 'sm'}
                    content={
                        <div className={assetPickerOpen ? 'flex gap-4' : undefined}>
                            <form className="space-y-4 flex-1" onSubmit={handleSubmit}>
                            <div>
                                <label className="block text-sm font-medium mb-1">Card No</label>
                                <Input value={form.card_no} onChange={e => setForm(f => ({ ...f, card_no: e.target.value }))} required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">PIN</label>
                                <Input value={form.pin} onChange={e => setForm(f => ({ ...f, pin: e.target.value }))} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Issuer</label>
                                <Select value={form.fuel_id} onValueChange={v => setForm(f => ({ ...f, fuel_id: v }))} required>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select Issuer" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {issuers.map(i => (
                                            <SelectItem key={i.fuel_id} value={String(i.fuel_id)}>{i.f_issuer}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="relative">
                                <label className="block text-sm font-medium mb-1">Asset</label>
                                <div className="flex items-center gap-2">
                                    <div className="flex-1">
                                        <Select value={form.asset_id} onValueChange={v => setForm(f => ({ ...f, asset_id: v }))} required>
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder="Select Asset" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {assets.map(a => (
                                                    <SelectItem key={a.id} value={String(a.id)}>{a.register_number || `#${a.id}`}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <span className="text-amber-500 cursor-pointer" title="Choose from assets" onClick={() => setAssetPickerOpen(true)}>
                                        <ArrowBigRight />
                                    </span>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Status</label>
                                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))} required>
                                    <SelectTrigger className="w-full">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">Active</SelectItem>
                                        <SelectItem value="inactive">Inactive</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Remarks</label>
                                <textarea
                                    className="w-full border rounded px-3 py-2 text-sm"
                                    rows={2}
                                    value={form.remarks}
                                    onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))}
                                    placeholder="Enter remarks (optional)"
                                />
                            </div>
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <label className="block text-sm font-medium mb-1">Registration Date</label>
                                    <Input type="date" value={form.reg_date} onChange={e => setForm(f => ({ ...f, reg_date: e.target.value }))} />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-sm font-medium mb-1">Expiry Date</label>
                                    <Input type="date" value={form.expiry_date} onChange={e => setForm(f => ({ ...f, expiry_date: e.target.value }))} />
                                </div>
                            </div>
                            <div className="pt-2 flex justify-start">
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button disabled={formLoading}>
                                            {formLoading ? <Loader2 className="animate-spin mr-2" /> : null}
                                            {editingCard ? 'Update' : 'Save'}
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Confirm Submission</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Are you sure you want to submit this fleet card information?
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={handleSubmit}>Confirm</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                            </form>
                            {assetPickerOpen && (
                                <div className="w-96 border-l pl-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="font-semibold">Select Asset</h3>
                                        <Button size="sm" variant="default" onClick={() => setAssetPickerOpen(false)}>Hide List</Button>
                                    </div>
                                    <Input placeholder="Search..." value={assetSearch} onChange={e => setAssetSearch(e.target.value)} className="mb-3" />
                                    <div className="max-h-[600px] overflow-y-auto space-y-2">
                                        {assetOptions.filter(a => (a.register_number || '').toLowerCase().includes(assetSearch.toLowerCase())).map(a => {
                                            const assigned = cards.find(c => c.asset && c.asset.id === a.id)?.card_no;
                                            return (
                                                <div key={a.id} className="p-2 border rounded hover:bg-amber-50 flex items-center justify-between">
                                                    <div>
                                                        <div className="font-medium">{a.register_number || `#${a.id}`}</div>
                                                        <div className="text-xs text-gray-500">Cost Ctr: {a.costcenter?.name || '-'}</div>
                                                        <div className="text-xs text-gray-500">Current Card: <span className="text-red-600 font-bold">{assigned || '-'}</span></div>
                                                    </div>
                                                    <span className="text-green-500 cursor-pointer" onClick={() => {
                                                        setForm(f => ({ ...f, asset_id: String(a.id) }));
                                                        setAssetPickerOpen(false);
                                                    }} title="Select this asset">
                                                        <ArrowBigLeft />
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    }
                />
            )}
        </div>
    );
};

export default FleetCardList;
