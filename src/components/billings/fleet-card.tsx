"use client";
import React, { useEffect, useState } from "react";
import { authenticatedApi } from "@/config/api";
import { CustomDataGrid, ColumnDef } from '@/components/ui/DataGrid';
import ActionSidebar from "@components/ui/action-aside";
import { Plus, ArrowBigLeft, ArrowBigRight, Loader2, AlertCircle } from "lucide-react";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import ExcelFleetRecord from "./excel-fleet-record";
import { toast } from "sonner";

interface FleetCard {
    id: number;
    card_no: string;
    vendor?: {
        id?: number;
        name?: string;
        logo?: string;
        image2?: string;
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

interface VendorOption {
    id: number;
    name: string;
    logo?: string;
    image2?: string;
}

const FleetCardList: React.FC = () => {
    const [cards, setCards] = useState<FleetCard[]>([]);
    const [vendors, setVendors] = useState<VendorOption[]>([]);
    const [assets, setAssets] = useState<{ id: number; register_number?: string; costcenter?: { id: number; name: string }; purpose?: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [assetPickerOpen, setAssetPickerOpen] = useState(false);
    const [assetOptions, setAssetOptions] = useState<{ id: number; register_number?: string; costcenter?: { id: number; name: string }; purpose?: string }[]>([]);
    const [assetSearch, setAssetSearch] = useState('');
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [editingCard, setEditingCard] = useState<FleetCard | null>(null);
    const [formLoading, setFormLoading] = useState(false);
    const [highlightDuplicates, setHighlightDuplicates] = useState(false);
    const [filterDuplicateAssets, setFilterDuplicateAssets] = useState(false);
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired'>('all');
    const [filterActiveWithoutAsset, setFilterActiveWithoutAsset] = useState(false);
    const [errors, setErrors] = useState<{
        card_no?: string;
        asset_id?: string;
        fuel_id?: string;
        status?: string;
        reg_date?: string;
        expiry_date?: string;
        purpose?: string;
        costcenter_id?: string;
    }>({});
    const [replacementMode, setReplacementMode] = useState<'new' | 'replacement'>('new');
    const [replacementOptions, setReplacementOptions] = useState<FleetCard[]>([]);
    const [replacementSelection, setReplacementSelection] = useState<string>('');
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [showAssetReplaceConfirm, setShowAssetReplaceConfirm] = useState<{
        assetId: number | null;
        cardNo: string | null;
    }>({ assetId: null, cardNo: null });
    const [pendingAssetSelection, setPendingAssetSelection] = useState<(() => void) | null>(null);

    const handleAssetSelect = (a: { id: number; register_number?: string; costcenter?: { id: number; name: string }; purpose?: string }) => {
        const existingCard = cards.find(c => c.asset?.id === a.id);
        const applySelection = () => {
            setForm(f => ({
                ...f,
                asset_id: String(a.id),
                purpose: (a.purpose || f.purpose || '').toLowerCase(),
                costcenter_id: a.costcenter?.id ? String(a.costcenter.id) : f.costcenter_id,
                assignment: existingCard ? 'replacement' : f.assignment,
                replacement_card_id: existingCard ? existingCard.id : f.replacement_card_id,
            }));
            if (existingCard) {
                setReplacementMode('replacement');
                setReplacementSelection(String(existingCard.id));
            }
            setErrors(prev => ({ ...prev, asset_id: undefined }));
            setAssetPickerOpen(false);
            setShowAssetReplaceConfirm({ assetId: null, cardNo: null });
            setPendingAssetSelection(null);
        };

        if (existingCard && !editingCard) {
            setShowAssetReplaceConfirm({ assetId: a.id, cardNo: existingCard.card_no || '' });
            setPendingAssetSelection(() => applySelection);
        } else {
            applySelection();
        }
    };

    interface FleetForm {
        card_no: string;
        asset_id: string;
        fuel_id: string;
        pin: string;
        status: string;
        reg_date: string;
        expiry_date: string;
        remarks: string;
        purpose: string;
        costcenter_id: string;
        assignment: 'new' | 'replacement';
        replacement_card_id: number | null;
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
        assignment: 'new',
        purpose: '',
        costcenter_id: '',
        replacement_card_id: null,
    });

    useEffect(() => {
        setLoading(true);
        setError(null);
        Promise.all([
            authenticatedApi.get<{ data: FleetCard[] }>("/api/bills/fleet"),
            authenticatedApi.get<{ data: VendorOption[] }>("/api/bills/fuel/vendor")
        ])
        .then(([cardsRes, vendorsRes]) => {
            const fetched = cardsRes.data?.data || [];
            setCards(fetched);
            setVendors(vendorsRes.data?.data || []);
            // derive unique assets from cards so form can show register_number
            const uniqueAssetsMap = new Map<number, { id: number; register_number?: string; costcenter?: { id: number; name: string }; purpose?: string }>();
            fetched.forEach(c => {
                if (c.asset && c.asset.id != null && !uniqueAssetsMap.has(c.asset.id)) {
                    uniqueAssetsMap.set(c.asset.id, { id: c.asset.id, register_number: c.asset.register_number, costcenter: c.asset.costcenter, purpose: c.asset.purpose });
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

    const statusStats = React.useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const threeMonthsLater = new Date(today);
        threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);

        let active = 0;
        let expired = 0;
        let expiringSoon = 0;

        cards.forEach(card => {
            const status = (card.status || '').toLowerCase();
            if (status === 'active') active++;

            const expiryDate = card.expiry ? new Date(card.expiry) : null;
            if (expiryDate) {
                expiryDate.setHours(0, 0, 0, 0);
                if (expiryDate < today) {
                    expired++;
                } else if (expiryDate <= threeMonthsLater) {
                    expiringSoon++;
                }
            } else if (status === 'expired') {
                expired++;
            }
        });

        return {
            total: cards.length,
            active,
            expired,
            expiringSoon,
        };
    }, [cards]);

    const duplicatedAssetRegisters = React.useMemo(() => {
        const seen = new Set<number>();
        const list: string[] = [];
        cards.forEach(card => {
            const assetId = card.asset?.id;
            if (assetId && duplicatedAssetIds.has(assetId) && !seen.has(assetId)) {
                seen.add(assetId);
                list.push(card.asset?.register_number || `#${assetId}`);
            }
        });
        return list;
    }, [cards, duplicatedAssetIds]);

    const activeWithoutAsset = React.useMemo(
        () =>
            cards.filter(
                card =>
                    (card.status || '').toLowerCase() === 'active' &&
                    (!card.asset || !card.asset.id)
            ).length,
        [cards]
    );

    const [initialAlertOpen, setInitialAlertOpen] = useState(false);
    const [initialAlertDismissed, setInitialAlertDismissed] = useState(false);

    useEffect(() => {
        if (loading) return;
        const uniqueAssets = new Set<number>();
        cards.forEach(c => { if (c.asset?.id) uniqueAssets.add(c.asset.id); });
        const hasDuplicates = duplicatedCount > 0;
        const cardsExceedAssets = cards.length > uniqueAssets.size;
        if ((hasDuplicates || cardsExceedAssets) && !initialAlertOpen && !initialAlertDismissed) {
            setInitialAlertOpen(true);
        }
    }, [loading, cards, duplicatedCount, initialAlertOpen, initialAlertDismissed]);

    // data to show in grid based on filter
    const displayedCards = React.useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        // Flatten nested fields needed by the grid filters/sorters
        const augmented = cards.map(c => ({
            ...c,
            // expose register_number at top-level so column input filter works
            register_number: c.asset?.register_number || '',
        }));
        return augmented.filter(c => {
            const status = (c.status || '').toLowerCase();
            const expiryDate = c.expiry ? new Date(c.expiry) : null;
            const isExpired = status === 'expired' || (expiryDate ? (expiryDate.setHours(0, 0, 0, 0), expiryDate < today) : false);
            const isActive = status === 'active';

            if (statusFilter === 'active' && !isActive) return false;
            if (statusFilter === 'expired' && !isExpired) return false;
            if (filterActiveWithoutAsset && !(isActive && (!c.asset || !c.asset.id))) return false;
            if (filterDuplicateAssets && !(c.asset && duplicatedAssetIds.has(c.asset.id))) return false;
            return true;
        });
    }, [cards, statusFilter, filterActiveWithoutAsset, filterDuplicateAssets, duplicatedAssetIds]);

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
            render: (row: FleetCard) => {
                if (!row.vendor) return '';
                const src = row.vendor.logo || row.vendor.image2 || '';
                return (
                    <div className="flex items-center gap-2">
                        {src ? <img src={src} alt={row.vendor.name || 'vendor'} className="w-8 h-8 object-contain rounded" /> : null}
                        <span>{row.vendor.name}</span>
                    </div>
                );
            },
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
                // support both new vendor.id and legacy vendor.fuel_id
                const vendorId = card.vendor?.id ?? (card.vendor as any)?.fuel_id ?? null;
                setForm({
                card_no: card.card_no || '',
                asset_id: card.asset?.id ? String(card.asset.id) : '',
                fuel_id: vendorId != null ? String(vendorId) : '',
                pin: card.pin_no || '',
                status: (card.status || 'active').toLowerCase(),
                reg_date: card.reg_date ? card.reg_date.slice(0, 10) : '',
                expiry_date: card.expiry ? card.expiry.slice(0, 10) : '',
                remarks: card.remarks || '',
                assignment: 'new',
                purpose: card.asset?.purpose ? card.asset.purpose.toLowerCase() : '',
                costcenter_id: card.asset?.costcenter?.id ? String(card.asset.costcenter.id) : '',
                replacement_card_id: null,
            });
            setReplacementMode('new');
            setReplacementSelection('');
        } else {
            setEditingCard(null);
            const today = new Date().toISOString().slice(0, 10);
            setForm({ card_no: '', asset_id: '', fuel_id: '', pin: '', status: 'active', reg_date: today, expiry_date: '', remarks: '', assignment: 'new', purpose: '', costcenter_id: '', replacement_card_id: null });
            setReplacementMode('new');
            setReplacementSelection('');
        }
        setErrors({});
        setConfirmOpen(false);
        setSidebarOpen(true);
    };

    // fetch active assets for picker when opened
    useEffect(() => {
        if (!assetPickerOpen) return;
        // if we already have options, use cached list to avoid duplicate requests
        if (assetOptions.length > 0) return;
        authenticatedApi.get<{ data: { id: number; register_number?: string; costcenter?: { id: number; name: string }; purpose?: string }[] }>("/api/assets", { params: { manager: 2, status: 'active' } })
            .then(res => setAssetOptions(res.data?.data || []))
            .catch(() => {
                toast.error('Failed to load assets');
                setAssetOptions([]);
            });
    }, [assetPickerOpen, assetOptions.length]);

    // fetch active fleet cards for replacement options
    useEffect(() => {
        if (!sidebarOpen) return;
        authenticatedApi.get<{ data: FleetCard[] }>("/api/bills/fleet", { params: { status: 'active' } })
            .then(res => setReplacementOptions(res.data?.data || []))
            .catch(() => setReplacementOptions([]));
    }, [sidebarOpen]);

    const validateForm = () => {
        const newErrors: typeof errors = {};
        if (!form.card_no) newErrors.card_no = 'Card number is required';
        if (!form.fuel_id) newErrors.fuel_id = 'Vendor is required';
        if (!form.asset_id) newErrors.asset_id = 'Asset is required';
        if (!form.costcenter_id) newErrors.costcenter_id = 'Cost center is required';
        if (!form.status) newErrors.status = 'Status is required';
        if (!form.reg_date) newErrors.reg_date = 'Registration date is required';
        if (!form.expiry_date) newErrors.expiry_date = 'Expiry date is required';
        if (!form.purpose) newErrors.purpose = 'Purpose is required';
        setErrors(newErrors);
        if (Object.keys(newErrors).length > 0) {
            toast.error('Please fill all required fields');
            return false;
        }
        return true;
    };

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!validateForm()) {
            setConfirmOpen(false);
            return;
        }
        const payload = {
            card_no: form.card_no,
            pin: form.pin,
            fuel_id: form.fuel_id ? Number(form.fuel_id) : null,
            asset_id: form.asset_id ? Number(form.asset_id) : null,
            status: form.status,
            reg_date: form.reg_date || null,
            expiry_date: form.expiry_date || null,
            remarks: form.remarks,
            assignment: replacementMode,
            replacement_card_id: replacementMode === 'replacement' ? (form.replacement_card_id ?? null) : null,
            purpose: form.purpose,
            costcenter_id: form.costcenter_id ? Number(form.costcenter_id) : null,
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
            setConfirmOpen(false);
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
            <AlertDialog
                open={initialAlertOpen}
                onOpenChange={(open) => {
                    setInitialAlertOpen(open);
                    if (!open) setInitialAlertDismissed(true);
                }}
            >
                <AlertDialogContent className="max-w-3xl bg-amber-50 border border-amber-300 shadow-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-xl font-bold text-amber-900">Action needed on fleet cards</AlertDialogTitle>
                        <AlertDialogDescription className="text-amber-900 space-y-2 text-lg">
                            <div>
                                Assets with duplicate cards: <span className="font-semibold text-red-600">{duplicatedCount}</span>.
                                Total cards: <span className="font-semibold text-amber-800">{cards.length}</span> vs unique assets: <span className="font-semibold text-amber-800">{new Set(cards.map(c => c.asset?.id).filter(Boolean)).size}</span>.
                            </div>
                            <div>Please resolve by updating card status or reassigning duplicates.</div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogAction
                            className="bg-amber-600 hover:bg-amber-700 text-white"
                            onClick={() => {
                                setInitialAlertOpen(false);
                                setInitialAlertDismissed(true);
                            }}
                        >
                            Okay
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            {/* Summary cards */}
            <div className="mb-4 grid grid-cols-1 md:grid-cols-4 gap-3">
                <Card className="bg-stone-100 shadow-sm">
                    <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                            <div>
                                <CardDescription>Fleet Status</CardDescription>
                            </div>
                            <div className="text-xs text-muted-foreground">{new Date().toLocaleDateString()}</div>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                        <div className="flex flex-wrap gap-2">
                            <Badge
                                variant="secondary"
                                className={`flex-1 min-w-27.5 justify-between items-center px-3 py-2 bg-stone-200/50 hover:bg-stone-300 shadow-sm cursor-pointer ${statusFilter === 'all' ? 'ring-1 ring-ring' : ''}`}
                                onClick={() => setStatusFilter('all')}
                            >
                                <span className="text-xs text-muted-foreground">Total</span>
                                <span className="text-lg font-semibold text-foreground">{statusStats.total}</span>
                            </Badge>
                            <Badge
                                variant="secondary"
                                className={`flex-1 min-w-27.5 justify-between items-center px-3 py-2 bg-stone-200/50 hover:bg-stone-300 shadow-sm cursor-pointer ${statusFilter === 'active' ? 'ring-1 ring-ring' : ''}`}
                                onClick={() => setStatusFilter(prev => prev === 'active' ? 'all' : 'active')}
                            >
                                <span className="text-xs text-muted-foreground">Active</span>
                                <span className="text-lg font-semibold text-emerald-600">{statusStats.active}</span>
                            </Badge>
                            <Badge
                                variant="secondary"
                                className={`flex-1 min-w-27.5 justify-between items-center px-3 py-2 bg-stone-200/50 hover:bg-stone-300 shadow-sm cursor-pointer ${statusFilter === 'expired' ? 'ring-1 ring-ring' : ''}`}
                                onClick={() => setStatusFilter(prev => prev === 'expired' ? 'all' : 'expired')}
                            >
                                <span className="text-xs text-muted-foreground">Expired</span>
                                <span className="text-lg font-semibold text-rose-600">{statusStats.expired}</span>
                            </Badge>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-stone-100 shadow-sm">
                    <CardHeader className="pb-1">
                        <CardDescription>Expiring (&lt; 3 months)</CardDescription>
                        <CardTitle className="text-2xl text-amber-600">{statusStats.expiringSoon}</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                        <p className="text-xs text-muted-foreground">Renew soon to avoid downtime.</p>
                    </CardContent>
                </Card>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Card
                                className={`bg-stone-100 shadow-sm cursor-pointer ${filterDuplicateAssets ? 'ring-2 ring-ring' : ''}`}
                                onClick={() => {
                                    setFilterDuplicateAssets(s => !s);
                                    setHighlightDuplicates(true);
                                }}
                                role="button"
                                aria-pressed={filterDuplicateAssets}
                            >
                                <CardHeader className="pb-1">
                                    <CardDescription>Assets with duplicate cards</CardDescription>
                                    <CardTitle className="text-2xl text-red-500">{duplicatedCount}</CardTitle>
                                </CardHeader>
                                <CardContent className="pt-0">
                                    <div className="text-xs text-muted-foreground">Click to filter rows</div>
                                </CardContent>
                            </Card>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-xs">
                            {duplicatedAssetRegisters.length
                                ? duplicatedAssetRegisters.join(', ')
                                : 'No assets have more than one fleet card.'}
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
                <Card
                    className={`bg-stone-100 shadow-sm cursor-pointer ${filterActiveWithoutAsset ? 'ring-2 ring-ring' : ''}`}
                    onClick={() => setFilterActiveWithoutAsset(p => !p)}
                    role="button"
                    aria-pressed={filterActiveWithoutAsset}
                >
                    <CardHeader className="pb-1">
                        <CardDescription>Active cards without asset</CardDescription>
                        <CardTitle className="text-2xl text-blue-600">{activeWithoutAsset}</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                        <div className="text-xs text-muted-foreground">Click to filter the grid to these cards.</div>
                    </CardContent>
                </Card>
            </div>
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Fleet Cards Management</h2>
                <div className="flex items-center gap-2">
                    <ExcelFleetRecord rows={displayedCards} duplicateAssetRegisters={duplicatedAssetRegisters} />
                    <Button
                        variant={'default'}
                        size={'sm'}
                        onClick={() => openEditor()}
                    >
                        <Plus size={20} />
                    </Button>
                </div>
            </div>
            <CustomDataGrid
                columns={columns}
                data={displayedCards}
                pagination={false}
                pageSize={10}
                dataExport={false}
                inputFilter={false}
                onRowDoubleClick={(row: FleetCard) => openEditor(row)}
                rowClass={(row: FleetCard) => {
                    if (highlightDuplicates && row.asset && duplicatedAssetIds.has(row.asset.id!)) return 'bg-amber-50';
                    return '';
                }}
            />

            {sidebarOpen && (
                <ActionSidebar
                    onClose={() => setSidebarOpen(false)}
                    title={editingCard ? 'Edit Fleet Card' : 'Add Fleet Card'}
                    size={assetPickerOpen ? 'lg' : 'sm'}
                    content={
                        <div className={assetPickerOpen ? 'flex gap-4' : undefined}>
                            <form
                                className="space-y-4 flex-1"
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    if (validateForm()) setConfirmOpen(true);
                                }}
                            >
                            <div>
                                <label className="block text-sm font-medium mb-1">Card No</label>
                                <Input
                                    inputMode="numeric"
                                    value={form.card_no}
                                    onChange={e => {
                                        const numeric = e.target.value.replace(/\D+/g, '');
                                        setForm(f => ({ ...f, card_no: numeric }));
                                        setErrors(prev => ({ ...prev, card_no: undefined }));
                                    }}
                                    onKeyDown={(e) => {
                                        const allowed = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End'];
                                        if (allowed.includes(e.key)) return;
                                        if (!/^\d$/.test(e.key)) {
                                            e.preventDefault();
                                        }
                                    }}
                                    className={errors.card_no ? 'border-red-500 focus-visible:ring-red-500' : undefined}
                                    required
                                />
                            </div>
                            {!editingCard && (
                                <>
                                    <div>
                                        <label className="flex items-center gap-1 text-sm font-medium mb-1">
                                            Type <AlertCircle className="h-4 w-4 text-amber-600" aria-hidden />
                                        </label>
                    <p className="text-xs text-amber-700 mb-1">Select the type of assignment: create a new card or replace an existing active card.</p>
                                        <RadioGroup
                                            className="flex gap-4"
                                            value={replacementMode}
                                            onValueChange={val => {
                                                const value = val as 'new' | 'replacement';
                                                setReplacementMode(value);
                                                if (value === 'new') {
                                                    setReplacementSelection('');
                                                    setForm(f => ({ ...f, asset_id: '', assignment: 'new', replacement_card_id: null }));
                                                } else {
                                                    setForm(f => ({ ...f, assignment: 'replacement' }));
                                                }
                                            }}
                                        >
                                            <label className="flex items-center gap-2 text-sm">
                                                <RadioGroupItem value="new" /> New
                                            </label>
                                            <label className="flex items-center gap-2 text-sm">
                                                <RadioGroupItem value="replacement" /> Replacement
                                            </label>
                                        </RadioGroup>
                                    </div>
                                    {replacementMode === 'replacement' && (
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Replacement Fleet</label>
                                            <Select
                                                value={replacementSelection}
                                                onValueChange={v => {
                                                    setReplacementSelection(v);
                                                    const selected = replacementOptions.find(opt => String(opt.id) === v);
                                                    if (selected?.asset?.id) {
                                                        setForm(f => ({
                                                            ...f,
                                                            asset_id: String(selected.asset!.id),
                                                            replacement_card_id: Number(v),
                                                            purpose: selected.asset?.purpose?.toLowerCase() || f.purpose,
                                                            costcenter_id: selected.asset?.costcenter?.id ? String(selected.asset.costcenter.id) : f.costcenter_id,
                                                        }));
                                                    }
                                                    setErrors(prev => ({ ...prev, asset_id: undefined }));
                                                }}
                                            >
                                                <SelectTrigger className="w-full">
                                                    <SelectValue placeholder="Select active fleet" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {replacementOptions.map(opt => (
                                                        <SelectItem key={opt.id} value={String(opt.id)}>
                                                            <div className="flex flex-col">
                                                                <span className="font-medium">{opt.card_no}</span>
                                                                <span className="text-xs text-muted-foreground">
                                                                    {opt.asset?.register_number || '-'} • {opt.asset?.costcenter?.name || '-'}
                                                                </span>
                                                            </div>
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <p className="text-xs text-amber-700 mt-1">Selecting a fleet will assign its asset to this card.</p>
                                        </div>
                                    )}
                                </>
                            )}
                            <div>
                                <label className="block text-sm font-medium mb-1">PIN</label>
                                <Input value={form.pin} onChange={e => setForm(f => ({ ...f, pin: e.target.value }))} />
                            </div>
                            <div>
                                <label className="flex items-center gap-1 text-sm font-medium mb-1">
                                    Vendor <AlertCircle className="h-4 w-4 text-amber-600" aria-hidden />
                                </label>
                                <p className="text-xs text-amber-700 mb-1">Pick the fuel vendor that issues/bills this card.</p>
                                <Select value={form.fuel_id} onValueChange={v => { setForm(f => ({ ...f, fuel_id: v })); setErrors(p => ({ ...p, fuel_id: undefined })); }} required>
                                    <SelectTrigger className={`w-full ${errors.fuel_id ? 'border-red-500 focus:ring-red-500' : ''}`} aria-invalid={!!errors.fuel_id}>
                                        <SelectValue placeholder="Select Vendor" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {vendors.map(i => (
                                            <SelectItem key={i.id} value={String(i.id)} className="flex items-center gap-2">
                                                {i.logo ? <img src={i.logo} alt={i.name} className="w-6 h-6 object-contain rounded" /> : null}
                                                <span>{i.name}</span>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.fuel_id && (
                                    <p className="mt-1 text-sm text-red-600">{errors.fuel_id}</p>
                                )}
                            </div>
                            <div>
                                <label className="flex items-center gap-1 text-sm font-medium mb-1">
                                    Asset <AlertCircle className="h-4 w-4 text-amber-600" aria-hidden />
                                </label>
                                <p className="text-xs text-amber-700 mb-1">Will you assign this card to an existing asset (preferred) or just register a new card without linking? Choose the asset to link.</p>
                                <div className="relative">
                                    <Input
                                        readOnly
                                        placeholder="No asset selected"
                                        className={`pr-10 cursor-pointer ${errors.asset_id ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                                        onClick={() => setAssetPickerOpen(true)}
                                        value={(() => {
                                            const id = form.asset_id;
                                            if (!id) return '';
                                            const fromAssets = assets.find(a => String(a.id) === String(id));
                                            if (fromAssets) {
                                                return fromAssets.register_number || `#${fromAssets.id}`;
                                            }
                                            const fromOptions = assetOptions.find(a => String(a.id) === String(id));
                                            if (fromOptions) {
                                                return fromOptions.register_number || `#${fromOptions.id}`;
                                            }
                                            return `#${id}`;
                                        })()}
                                    />
                                    <button
                                        type="button"
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-amber-500 hover:text-amber-600"
                                        title="Choose from assets"
                                        onClick={() => setAssetPickerOpen(true)}
                                        aria-label="Open asset picker"
                                    >
                                        <ArrowBigRight />
                                    </button>
                                </div>
                                {errors.asset_id && <p className="mt-1 text-sm text-red-600">{errors.asset_id}</p>}
                            </div>
                            <div>
                                <label className="flex items-center gap-1 text-sm font-medium mb-1">
                                    Purpose <AlertCircle className="h-4 w-4 text-amber-600" aria-hidden />
                                </label>
                                <p className="text-xs text-amber-700 mb-1">Define how this card will be used (project, staff cost, or poolcar).</p>
                                <Select
                                    value={form.purpose}
                                    onValueChange={v => { setForm(f => ({ ...f, purpose: v })); setErrors(prev => ({ ...prev, purpose: undefined })); }}
                                    required
                                >
                                    <SelectTrigger className={`w-full ${errors.purpose ? 'border-red-500 focus:ring-red-500' : ''}`}>
                                        <SelectValue placeholder="Select purpose" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="project">Project</SelectItem>
                                        <SelectItem value="staff cost">Staff Cost</SelectItem>
                                        <SelectItem value="poolcar">Poolcar</SelectItem>
                                    </SelectContent>
                                </Select>
                                {errors.purpose && <p className="mt-1 text-sm text-red-600">{errors.purpose}</p>}
                            </div>
                            <div>
                                <label className="flex items-center gap-1 text-sm font-medium mb-1">
                                    Cost Center <AlertCircle className="h-4 w-4 text-amber-600" aria-hidden />
                                </label>
                                <p className="text-xs text-amber-700 mb-1">Assign the cost center that will bear this card’s expenses.</p>
                                <Select
                                    value={form.costcenter_id}
                                    onValueChange={v => { setForm(f => ({ ...f, costcenter_id: v })); setErrors(prev => ({ ...prev, costcenter_id: undefined })); }}
                                    required
                                >
                                    <SelectTrigger className={`w-full ${errors.costcenter_id ? 'border-red-500 focus:ring-red-500' : ''}`}>
                                        <SelectValue placeholder="Select cost center" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Array.from(new Map([...assets, ...assetOptions].map(a => [a.costcenter?.id, a.costcenter?.name || '']))).filter(([id, name]) => id && name).map(([id, name]) => (
                                            <SelectItem key={String(id)} value={String(id)}>{name as string}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.costcenter_id && <p className="mt-1 text-sm text-red-600">{errors.costcenter_id}</p>}
                            </div>
                            <div>
                                <label className="flex items-center gap-1 text-sm font-medium mb-1">
                                    Status <AlertCircle className="h-4 w-4 text-amber-600" aria-hidden />
                                </label>
                                <Select value={form.status} onValueChange={v => { setForm(f => ({ ...f, status: v })); setErrors(prev => ({ ...prev, status: undefined })); }} required>
                                    <SelectTrigger className={`w-full ${errors.status ? 'border-red-500 focus:ring-red-500' : ''}`}>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">Active</SelectItem>
                                        <SelectItem value="inactive">Inactive</SelectItem>
                                    </SelectContent>
                                </Select>
                                {errors.status && <p className="mt-1 text-sm text-red-600">{errors.status}</p>}
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
                                        <label className="flex items-center gap-1 text-sm font-medium mb-1">
                                            Registration Date <AlertCircle className="h-4 w-4 text-amber-600" aria-hidden />
                                        </label>
                                        <Input
                                            type="date"
                                            value={form.reg_date}
                                            onChange={e => { setForm(f => ({ ...f, reg_date: e.target.value })); setErrors(prev => ({ ...prev, reg_date: undefined })); }}
                                            className={errors.reg_date ? 'border-red-500 focus-visible:ring-red-500' : undefined}
                                            required
                                        />
                                        {errors.reg_date && <p className="mt-1 text-sm text-red-600">{errors.reg_date}</p>}
                                    </div>
                                    <div className="flex-1">
                                        <label className="flex items-center gap-1 text-sm font-medium mb-1">
                                            Expiry Date <AlertCircle className="h-4 w-4 text-amber-600" aria-hidden />
                                        </label>
                                        <Input
                                            type="date"
                                            value={form.expiry_date}
                                            onChange={e => { setForm(f => ({ ...f, expiry_date: e.target.value })); setErrors(prev => ({ ...prev, expiry_date: undefined })); }}
                                            className={errors.expiry_date ? 'border-red-500 focus-visible:ring-red-500' : undefined}
                                            required
                                        />
                                        {errors.expiry_date && <p className="mt-1 text-sm text-red-600">{errors.expiry_date}</p>}
                                    </div>
                                </div>
                            <div className="pt-2 flex justify-start">
                                <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                                    <Button
                                        type="submit"
                                        disabled={formLoading || (!editingCard && !form.card_no)}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            if (validateForm()) setConfirmOpen(true);
                                        }}
                                    >
                                        {formLoading ? <Loader2 className="animate-spin mr-2" /> : null}
                                        {editingCard ? 'Update' : 'Save'}
                                    </Button>
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
                                    {/* Asset replacement confirmation */}
                                    <AlertDialog open={!!showAssetReplaceConfirm.assetId} onOpenChange={(open) => {
                                        if (!open) {
                                            setShowAssetReplaceConfirm({ assetId: null, cardNo: null });
                                            setPendingAssetSelection(null);
                                        }
                                    }}>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Replace existing card?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    This asset already has card {showAssetReplaceConfirm.cardNo || ''}. Do you want to set this form as a replacement?
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel onClick={() => {
                                                    setShowAssetReplaceConfirm({ assetId: null, cardNo: null });
                                                    setPendingAssetSelection(null);
                                                }}>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => {
                                                    if (pendingAssetSelection) pendingAssetSelection();
                                                }}>Yes, replace</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
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
                                    <div className="max-h-150 overflow-y-auto space-y-2">
                                        {assetOptions.filter(a => (a.register_number || '').toLowerCase().includes(assetSearch.toLowerCase())).map(a => {
                                            const assigned = cards.find(c => c.asset && c.asset.id === a.id)?.card_no;
                                            return (
                                                <div key={a.id} className="p-2 border rounded hover:bg-accent/20 flex items-center justify-between">
                                                    <div>
                                                        <div className="font-medium">{a.register_number || `#${a.id}`}</div>
                                                        <div className="text-xs text-muted-foreground">Cost Ctr: {a.costcenter?.name || '-'}</div>
                                                        <div className="text-xs text-muted-foreground capitalize">Purpose: {a.purpose || '-'}</div>
                                                        <div className="text-xs text-muted-foreground">Current Card: <span className="text-destructive font-bold">{assigned || '-'}</span></div>
                                                    </div>
                                                    <span
                                                        className="text-green-600 dark:text-green-400 cursor-pointer"
                                                        onClick={() => handleAssetSelect(a)}
                                                        title="Select this asset"
                                                    >
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
