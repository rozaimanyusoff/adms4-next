"use client";
import React, { useEffect, useState } from "react";
import { authenticatedApi } from "@/config/api";
import { CustomDataGrid, ColumnDef } from '@/components/ui/DataGrid';
import ActionSidebar from "@components/ui/action-aside";
import { Plus, Replace, ArrowBigLeft, ArrowBigRight, Loader2 } from "lucide-react";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";

interface FleetCard {
    id: number;
    fuel: {
        fuel_id: number;
        fuel_issuer: string;
    };
    fleetcard: {
        id: number;
        card_no: string;
    };
    reg_date: string | null;
    category: string;
    remarks: string | null;
    pin_no: string | null;
    status: string;
    expiry: string | null;
    asset: {
        asset_id: number;
        register_number: string;
        fuel_type: string;
        costcenter?: {
            id: number;
            name: string;
        };
    };
}

interface AssetOption {
    asset_id: number;
    register_number: string;
    type_id?: number;
    status?: string;
    fuel_type?: string;
    card_no?: string; // Optional for displaying in asset selection
}
interface IssuerOption {
    fuel_id: number;
    f_issuer: string;
}
// Add CostCenterOption interface
interface CostCenterOption {
    id: number;
    name: string;
}

const FleetCardList: React.FC = () => {
    const [fleetCards, setFleetCards] = useState<FleetCard[]>([]);
    const [assets, setAssets] = useState<AssetOption[]>([]);
    const [issuers, setIssuers] = useState<IssuerOption[]>([]);
    const [costcenters, setCostcenters] = useState<CostCenterOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [replaceField, setReplaceField] = useState<null | 'asset' | 'issuer' | 'costcenter'>(null);
    const [optionSearch, setOptionSearch] = useState("");
    const [assetListLoading, setAssetListLoading] = useState(false);
    // --- Summary Card Filter State ---
    const [summaryFilter, setSummaryFilter] = useState<'noAsset' | 'unassignedCostcenter' | 'duplicatedAsset' | 'duplicatedCardNo' | null>(null);
    // Dialog state for asset assignment confirmation
    const [showAssetDialog, setShowAssetDialog] = useState(false);
    const [pendingAsset, setPendingAsset] = useState<AssetOption | null>(null);
    const [pendingAssetId, setPendingAssetId] = useState<number | null>(null);

    // Inline form state for ActionSidebar
    const [form, setForm] = useState({
        card_no: '',
        asset_id: '',
        fuel_id: '',
        fuel_type: '',
        pin: '',
        status: 'Active',
        reg_date: '',
        expiry_date: '',
        costcenter_id: '',
        costcenter_name: '', // Added for display
        category: 'project',
        remarks: '',
    });

    // Add this state to track edit mode
    const [editingId, setEditingId] = useState<string | number | null>(null);
    const [formLoading, setFormLoading] = useState(false);

    useEffect(() => {
        setLoading(true);
        setError(null);

        authenticatedApi.get<{ data: FleetCard[] }>("/api/bills/fleet")
            .then(res => {
                setFleetCards(res.data?.data || []);
                setLoading(false);
            })
            .catch(() => {
                setError("Failed to load fleet cards.");
                setLoading(false);
            });
        // Remove initial fetch of assets here
        // Remove: authenticatedApi.get<{ data: any[] }>("/api/assets") ...
        // Remove: setAssets(filtered);
        // Fetch issuers for form select
        authenticatedApi.get<{ data: IssuerOption[] }>("/api/bills/fuel/issuer")
            .then(res => setIssuers(res.data.data || []));
        // Fetch costcenters for form select
        authenticatedApi.get<{ data: CostCenterOption[] }>("/api/assets/costcenters")
            .then(res => setCostcenters(res.data.data || []));
    }, []);

    useEffect(() => {
        const handleSelectAsset = (e: any) => {
            if (e.detail) {
                const selectedAsset = assets.find(a => a.asset_id === e.detail);
                if (selectedAsset && selectedAsset.card_no) {
                    setPendingAsset(selectedAsset);
                    setPendingAssetId(e.detail);
                    setShowAssetDialog(true);
                    return;
                }
                setForm(f => ({ ...f, asset_id: String(e.detail) }));
            }
        };
        window.addEventListener('select-asset', handleSelectAsset);
        return () => window.removeEventListener('select-asset', handleSelectAsset);
    }, [assets]);

    const columns: ColumnDef<FleetCard>[] = ([
        {
            key: "__row" as any,
            header: '#',
            render: (row: FleetCard) => fleetCards.findIndex(fc => fc.id === row.id) + 1,
            sortable: false,
            filter: undefined,
            width: 50
        },
        {
            key: 'card_no',
            header: 'Card No',
            render: (row: FleetCard) => row.fleetcard?.card_no || '',
            filter: 'input',
        },
        {
            key: 'fuel',
            header: 'Issuer',
            render: (row: FleetCard) => row.fuel?.fuel_issuer,
            filter: 'singleSelect',
        },
        {
            key: 'asset',
            header: 'Asset',
            render: (row: FleetCard) => row.asset?.register_number,
            filter: 'input',
        },
        {
            key: 'fuel_type',
            header: 'Fuel Type',
            render: (row: FleetCard) => row.asset?.fuel_type || '',
            filter: 'singleSelect',
            colClass: 'capitalize'
        },
        {
            key: 'costcenter',
            header: 'Cost Center',
            render: (row: FleetCard) => row.asset?.costcenter?.name || 'Unassigned',
            filter: 'singleSelect',
        },
        {
            key: 'pin_no',
            header: 'PIN',
            render: (row: FleetCard) => row.pin_no,
        },
        {
            key: 'status',
            header: 'Status',
            render: (row: FleetCard) => row.status,
            filter: 'singleSelect',
            colClass: 'capitalize'
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
        {
            key: 'category',
            header: 'Category',
            render: (row: FleetCard) => {
                switch ((row.category || '').toLowerCase()) {
                    case 'staffcost':
                        return 'Staff Cost';
                    case 'project':
                        return 'Project';
                    case 'poolcar':
                        return 'Pool Car';
                    default:
                        return row.category;
                }
            },
            filter: 'singleSelect',
        },
    ]) as any;

    const handleOpenSidebar = (row?: FleetCard) => {
        setSidebarOpen(true);
        setReplaceField(null);
        setOptionSearch("");
        if (row) {
            setEditingId(row.id);
            setFormLoading(true); // Start loading
            // If assets not loaded, fetch first then set form
            const fuelTypeValue = row.asset?.fuel_type ? row.asset.fuel_type.toLowerCase() : '';
            if (assets.length === 0) {
                authenticatedApi.get<{ data: any[] }>('/api/assets?type=2&status=active')
                    .then(res => {
                        const assetsRaw = res.data.data || [];
                        let filtered: AssetOption[] = assetsRaw
                            .filter((a: any) => String(a.types?.type_id) === '2' && String(a.status).toLowerCase() === 'active')
                            .map((a: any) => ({
                                asset_id: a.id,
                                register_number: a.register_number,
                                type_id: a.types?.type_id,
                                status: a.status,
                                fuel_type: a.specs?.fuel_type, // get fuel_type from specs
                                card_no: a.specs?.card_no // get card_no from asset
                            }));

                        setAssets(filtered);
                        setForm({
                            card_no: row.fleetcard?.card_no || '',
                            asset_id: row.asset?.asset_id ? String(row.asset.asset_id) : '',
                            fuel_id: row.fuel?.fuel_id ? String(row.fuel.fuel_id) : '',
                            fuel_type: fuelTypeValue,
                            pin: row.pin_no || '',
                            status: row.status || 'Active',
                            reg_date: row.reg_date ? row.reg_date.slice(0, 10) : '',
                            expiry_date: row.expiry ? row.expiry.slice(0, 10) : '',
                            costcenter_id: row.asset?.costcenter?.id ? String(row.asset.costcenter.id) : '',
                            costcenter_name: row.asset?.costcenter?.name || '', // Added for display
                            category: row.category || 'personal',
                            remarks: row.remarks || '',
                        });
                        setFormLoading(false); // Done loading
                    });
            } else {
                // Ensure current asset is included for display
                let filtered: AssetOption[] = [...assets];
                if (row.asset?.asset_id && !filtered.some((a: AssetOption) => a.asset_id === row.asset.asset_id)) {
                    filtered = [
                        ...filtered,
                        {
                            asset_id: row.asset.asset_id,
                            register_number: row.asset.register_number,
                            type_id: undefined,
                            status: undefined
                        }
                    ];
                    setAssets(filtered);
                } else {
                    setAssets(filtered);
                }
                setForm({
                    card_no: row.fleetcard?.card_no || '',
                    asset_id: row.asset?.asset_id ? String(row.asset.asset_id) : '',
                    fuel_id: row.fuel?.fuel_id ? String(row.fuel.fuel_id) : '',
                    fuel_type: fuelTypeValue,
                    pin: row.pin_no || '',
                    status: row.status || 'Active',
                    reg_date: row.reg_date ? row.reg_date.slice(0, 10) : '',
                    expiry_date: row.expiry ? row.expiry.slice(0, 10) : '',
                    costcenter_id: row.asset?.costcenter?.id ? String(row.asset.costcenter.id) : '',
                    costcenter_name: row.asset?.costcenter?.name || '', // Added for display
                    category: row.category || 'personal',
                    remarks: row.remarks || '',
                });
                setFormLoading(false); // Done loading
            }
        } else {
            setEditingId(null);
            setForm({
                card_no: '',
                asset_id: '',
                fuel_id: '',
                fuel_type: '',
                pin: '',
                status: 'Active',
                reg_date: '',
                expiry_date: '',
                costcenter_id: '',
                costcenter_name: '', // Added for display
                category: 'project',
                remarks: '',
            });
            setFormLoading(false); // Not loading for create
        }
    };

    // Move fetchAssets to top-level so it can be passed to FleetCardForm
    const fetchAssets = () => {
        setAssetListLoading(true);
        authenticatedApi.get<{ data: any[] }>('/api/assets?type=2&status=active')
            .then(res => {
                console.log('Asset API response:', res);
                const assetsRaw: any[] = res?.data?.data || [];
                // If assetsRaw is empty, log a warning
                if (!Array.isArray(assetsRaw) || assetsRaw.length === 0) {
                    console.warn('No assets returned from backend or wrong structure:', assetsRaw);
                }
                // Try to map, but if mapping fails, fallback to raw
                let filtered: any[] = [];
                try {
                    filtered = assetsRaw
                        .map((a: any) => ({
                            asset_id: a.id,
                            register_number: a.register_number,
                            type_id: a.types?.type_id,
                            status: a.status,
                            fuel_type: a.specs?.fuel_type, // get fuel_type from specs
                            card_no: a.specs?.card_no || '' // get card_no from asset
                        }));
                } catch (err) {
                    console.error('Asset mapping error:', err);
                    filtered = assetsRaw;
                }
                setAssets(filtered);
                setAssetListLoading(false);
            })
            .catch((err) => {
                console.error('Asset API error:', err);
                setAssets([]);
                setAssetListLoading(false);
            });
    };

    // Add submit handler for create/update
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        // Get fuel_type from selected asset
        let fuel_type = '';
        if (form.asset_id) {
            const asset = assets.find(a => a.asset_id === Number(form.asset_id));
            fuel_type = asset && 'fuel_type' in asset ? (asset as any).fuel_type || '' : '';
        }
        const payload = {
            card_no: form.card_no,
            pin: form.pin,
            fuel_id: form.fuel_id,
            asset_id: form.asset_id,
            fuel_type: form.fuel_type || fuel_type, // Use form value or fetched asset type
            status: form.status,
            reg_date: form.reg_date,
            expiry_date: form.expiry_date,
            costcenter_id: form.costcenter_id,
            category: form.category,
            remarks: form.remarks,
            // costcenter_name is excluded from payload
        };
        try {
            if (editingId) {
                await authenticatedApi.put(`/api/bills/fleet/${editingId}`, payload);
                toast.success("Fleet card updated successfully");
            } else {
                await authenticatedApi.post('/api/bills/fleet', payload);
                toast.success("Fleet card created successfully");
            }
            // Refresh list and close sidebar
            const res = await authenticatedApi.get<{ data: FleetCard[] }>("/api/bills/fleet");
            setFleetCards(res.data?.data || []);
            setSidebarOpen(false);
            setEditingId(null);
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to save fleet card.');
        }
    };

    if (loading) return <div className="p-4">Loading...</div>;
    if (error) return <div className="p-4 text-red-600">{error}</div>;


    // Counts
    const cardsNoAssetCount = fleetCards.filter(fc => !fc.asset || !fc.asset.asset_id).length;
    const cardsUnassignedCostcenterCount = fleetCards.filter(fc => fc.asset && fc.asset.asset_id && (!fc.asset.costcenter || !fc.asset.costcenter.name || fc.asset.costcenter.name === 'Unassigned')).length;


    // Duplicated asset logic
    const assetIdCounts = fleetCards.reduce((acc: Record<string, number>, fc) => {
        if (fc.asset && fc.asset.asset_id) {
            const id = String(fc.asset.asset_id);
            acc[id] = (acc[id] || 0) + 1;
        }
        return acc;
    }, {});
    const duplicatedAssetIds = Object.keys(assetIdCounts).filter(id => assetIdCounts[id] > 1);
    const cardsDuplicatedAssetCount = duplicatedAssetIds.length;

    // Duplicated card_no logic
    const cardNoCounts = fleetCards.reduce((acc: Record<string, number>, fc) => {
        const cardNo = fc.fleetcard?.card_no;
        if (cardNo) {
            acc[cardNo] = (acc[cardNo] || 0) + 1;
        }
        return acc;
    }, {});
    const duplicatedCardNos = Object.keys(cardNoCounts).filter(cardNo => cardNoCounts[cardNo] > 1);
    const cardsDuplicatedCardNoCount = duplicatedCardNos.length;

    // Filtered data for grid
    const filteredFleetCards = summaryFilter === 'noAsset'
        ? fleetCards.filter(fc => !fc.asset || !fc.asset.asset_id)
        : summaryFilter === 'unassignedCostcenter'
            ? fleetCards.filter(fc => fc.asset && fc.asset.asset_id && (!fc.asset.costcenter || !fc.asset.costcenter.name || fc.asset.costcenter.name === 'Unassigned'))
            : summaryFilter === 'duplicatedAsset'
                ? fleetCards.filter(fc => fc.asset && duplicatedAssetIds.includes(String(fc.asset.asset_id)))
                : summaryFilter === 'duplicatedCardNo'
                    ? fleetCards.filter(fc => fc.fleetcard && duplicatedCardNos.includes(fc.fleetcard.card_no))
                    : fleetCards;

    return (
        <div className="mt-4">
            {/* Asset Assignment Confirmation Dialog */}
            <AlertDialog open={showAssetDialog} onOpenChange={setShowAssetDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Asset Already Assigned</AlertDialogTitle>
                        <AlertDialogDescription>
                            {pendingAsset && (
                                <>
                                    The asset <b>{pendingAsset.register_number}</b> is already assigned to card number <b>{pendingAsset.card_no}</b>.<br />
                                    Are you sure you want to assign this asset to this fleet card?
                                </>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => {
                            setShowAssetDialog(false);
                            setPendingAsset(null);
                            setPendingAssetId(null);
                        }}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => {
                            if (pendingAssetId) {
                                setForm(f => ({ ...f, asset_id: String(pendingAssetId) }));
                            }
                            setShowAssetDialog(false);
                            setPendingAsset(null);
                            setPendingAssetId(null);
                        }}>Assign Anyway</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            {/* Summary Cards */}
            <div className="flex flex-wrap gap-4 mb-4">
                {/* Card: No Asset */}
                <div
                    className={`bg-red-100 dark:bg-slate-800 rounded shadow-lg p-4 min-w-[180px] dark:border-slate-700 flex flex-col justify-between cursor-pointer transition-all ${summaryFilter === 'noAsset' ? 'bg-amber-200 dark:bg-amber-700 font-bold' : ''}`}
                    onClick={() => setSummaryFilter(summaryFilter === 'noAsset' ? null : 'noAsset')}
                >
                    <div className="font-semibold text-gray-700 dark:text-gray-200 mb-2">Cards w/o Asset</div>
                    <div className="flex items-center gap-2">
                        <span className="text-2xl font-mono">{cardsNoAssetCount}</span>
                        <span className="text-xs text-gray-500">card{cardsNoAssetCount === 1 ? '' : 's'}</span>
                    </div>
                </div>
                {/* Card: Unassigned Costcenter */}
                <div
                    className={`bg-red-100 dark:bg-slate-800 rounded shadow-lg p-4 min-w-[180px] dark:border-slate-700 flex flex-col justify-between cursor-pointer transition-all ${summaryFilter === 'unassignedCostcenter' ? 'bg-amber-200 dark:bg-amber-700 font-bold' : ''}`}
                    onClick={() => setSummaryFilter(summaryFilter === 'unassignedCostcenter' ? null : 'unassignedCostcenter')}
                >
                    <div className="font-semibold text-gray-700 dark:text-gray-200 mb-2">Unassigned Cost Center</div>
                    <div className="flex items-center gap-2">
                        <span className="text-2xl font-mono">{cardsUnassignedCostcenterCount}</span>
                        <span className="text-xs text-gray-500">card{cardsUnassignedCostcenterCount === 1 ? '' : 's'}</span>
                    </div>
                </div>
                {/* Card: Duplicated Asset */}
                <div
                    className={`bg-red-100 dark:bg-slate-800 rounded shadow-lg p-4 min-w-[180px] dark:border-slate-700 flex flex-col justify-between cursor-pointer transition-all ${summaryFilter === 'duplicatedAsset' ? 'bg-amber-200 dark:bg-amber-700 font-bold' : ''}`}
                    onClick={() => setSummaryFilter(summaryFilter === 'duplicatedAsset' ? null : 'duplicatedAsset')}
                >
                    <div className="font-semibold text-gray-700 dark:text-gray-200 mb-2">Duplicated Asset</div>
                    <div className="flex items-center gap-2">
                        <span className="text-2xl font-mono">{cardsDuplicatedAssetCount}</span>
                        <span className="text-xs text-gray-500">asset{cardsDuplicatedAssetCount === 1 ? '' : 's'}</span>
                    </div>
                </div>
                {/* Card: Duplicated Card No */}
                <div
                    className={`bg-red-100 dark:bg-slate-800 rounded shadow-lg p-4 min-w-[180px] dark:border-slate-700 flex flex-col justify-between cursor-pointer transition-all ${summaryFilter === 'duplicatedCardNo' ? 'bg-amber-200 dark:bg-amber-700 font-bold' : ''}`}
                    onClick={() => setSummaryFilter(summaryFilter === 'duplicatedCardNo' ? null : 'duplicatedCardNo')}
                >
                    <div className="font-semibold text-gray-700 dark:text-gray-200 mb-2">Duplicated Card No</div>
                    <div className="flex items-center gap-2">
                        <span className="text-2xl font-mono">{cardsDuplicatedCardNoCount}</span>
                        <span className="text-xs text-gray-500">card{cardsDuplicatedCardNoCount === 1 ? '' : 's'}</span>
                    </div>
                </div>
            </div>
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Fleet Cards Management</h2>
                <Button
                    variant={'default'}
                    onClick={() => handleOpenSidebar()}
                >
                    <Plus size={20} />
                </Button>
            </div>
            <CustomDataGrid
                columns={columns}
                data={filteredFleetCards}
                pagination={false}
                pageSize={10}
                dataExport={true}
                inputFilter={false}
                onRowDoubleClick={handleOpenSidebar}
                rowClass={row => {
                    // Red if asset is missing or costcenter is Unassigned
                    if (!row.asset || !row.asset.asset_id) return 'text-red-500';
                    if ((row.asset.costcenter?.name || 'Unassigned') === 'Unassigned') return 'text-red-500';
                    return '';
                }}
            />
            {sidebarOpen && (
                <ActionSidebar
                    onClose={() => { setReplaceField(null); setSidebarOpen(false); }}
                    title="Add/Edit Fleet Card"
                    size={replaceField ? 'md' : 'sm'}
                    content={
                        <div className={replaceField ? 'flex flex-row gap-6' : undefined}>
                            {/* Inline Fleet Card Form */}
                            <form className="space-y-4 flex-1" onSubmit={handleSubmit}>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Card No</label>
                                    <Input value={form.card_no} onChange={e => setForm(f => ({ ...f, card_no: e.target.value }))} required />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">PIN</label>
                                    <Input value={form.pin} onChange={e => setForm(f => ({ ...f, pin: e.target.value }))} required />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Issuer</label>
                                    <div className="flex gap-2">
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
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Asset</label>
                                    <div className="flex gap-2 items-center relative">
                                        <Input
                                            value={
                                                form.asset_id
                                                    ? (
                                                        assets.find(a => String(a.asset_id) === String(form.asset_id))?.register_number
                                                        || fleetCards.find(fc => String(fc.asset?.asset_id) === String(form.asset_id))?.asset?.register_number
                                                        || ""
                                                    )
                                                    : ""
                                            }
                                            readOnly
                                            required
                                            className="w-full pr-8"
                                        />
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-amber-500 cursor-pointer" onClick={() => { fetchAssets(); setReplaceField('asset'); }}>
                                                        <ArrowBigRight />
                                                    </span>
                                                </TooltipTrigger>
                                                <TooltipContent side="left">Click to replace asset</TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Fuel Type</label>
                                    <Select
                                        value={form.fuel_type || ''}
                                        onValueChange={v => setForm(f => ({ ...f, fuel_type: v }))}
                                        required
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Select Fuel Type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="petrol">Petrol</SelectItem>
                                            <SelectItem value="diesel">Diesel</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Cost Center</label>
                                    <div className="flex gap-2 items-center relative">
                                        <Input
                                            value={form.costcenter_name}
                                            readOnly
                                            required
                                            className="w-full pr-8"
                                        />
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-amber-500 cursor-pointer" onClick={() => setReplaceField('costcenter')}>
                                                        <ArrowBigRight />
                                                    </span>
                                                </TooltipTrigger>
                                                <TooltipContent side="left">Click to replace cost center</TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
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
                                    <label className="block text-sm font-medium mb-1">Category</label>
                                    <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))} required>
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Select Category" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="staffcost">Staff Cost</SelectItem>
                                            <SelectItem value="project">Project</SelectItem>
                                            <SelectItem value="poolcar">Pool Car</SelectItem>
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
                                        <Input type="date" value={form.reg_date} onChange={e => setForm(f => ({ ...f, reg_date: e.target.value }))} required />
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-sm font-medium mb-1">Expiry Date</label>
                                        <Input type="date" value={form.expiry_date} onChange={e => setForm(f => ({ ...f, expiry_date: e.target.value }))} required />
                                    </div>
                                </div>
                                <div className="pt-2 flex justify-start">
                                    <Button type="submit" disabled={formLoading}>
                                        {formLoading ? <Loader2 className="animate-spin mr-2" /> : null}
                                        {editingId ? 'Update' : 'Save'}
                                    </Button>
                                </div>
                            </form>
                            {/* End Inline Fleet Card Form */}
                            {replaceField && (
                                <div className="border-l px-4 mt-4 flex-1 min-w-[260px] max-w-md">
                                    <h3 className="font-semibold mb-2">Select a {replaceField === 'asset' ? 'asset' : replaceField === 'issuer' ? 'issuer' : 'cost center'}</h3>
                                    <Input
                                        placeholder={`Search ${replaceField === 'asset' ? 'asset' : replaceField === 'issuer' ? 'issuer' : 'cost center'}...`}
                                        className="mb-3"
                                        value={optionSearch}
                                        onChange={e => setOptionSearch(e.target.value)}
                                    />
                                    <div className="max-h-[500px] overflow-y-auto space-y-2">
                                        {replaceField === 'asset' && (
                                            assetListLoading ? (
                                                <div className="text-center text-gray-400 py-4">Loading assets...</div>
                                            ) : (
                                                assets.length === 0 ? (
                                                    <div className="text-center text-gray-400 py-4">No assets found. (Debug: {assets.length} assets)</div>
                                                ) : (
                                                    <>
                                                        <div className="text-xs text-gray-400 px-2">{assets.length} assets loaded</div>
                                                        {assets.filter(a => {
                                                            const search = optionSearch.toLowerCase();
                                                            const reg = a.register_number?.toLowerCase() || '';
                                                            const card = a.card_no?.toLowerCase() || '';
                                                            return reg.includes(search) || card.includes(search);
                                                        }).map(a => (
                                                            <div key={a.asset_id} className="p-2 border rounded cursor-pointer hover:bg-amber-100 flex items-center gap-2">
                                                                <ArrowBigLeft className="text-green-500 cursor-pointer" onClick={() => { window.dispatchEvent(new CustomEvent('select-asset', { detail: a.asset_id })); setReplaceField(null); setOptionSearch(""); }} />
                                                                <div className="flex flex-col">
                                                                    <span className="flex-1 cursor-pointer">{a.register_number}</span>
                                                                    <span className="text-xs capitalize text-gray-500">Fuel Type: {a.fuel_type || 'Unknown Fuel Type'}</span>
                                                                    <span className={`text-xs capitalize ${a.card_no ? 'text-red-500' : 'text-gray-500'}`}>Fleet Card: {a.card_no || 'No Card Number'}</span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </>
                                                )
                                            )
                                        )}
                                        {replaceField === 'issuer' && issuers.filter(i => i.f_issuer.toLowerCase().includes(optionSearch.toLowerCase())).map(i => (
                                            <div key={i.fuel_id} className="p-2 border rounded cursor-pointer hover:bg-amber-100 flex items-center gap-2">
                                                <ArrowBigLeft className="text-green-500 cursor-pointer" onClick={() => { setForm(f => ({ ...f, fuel_id: String(i.fuel_id) })); setReplaceField(null); setOptionSearch(""); }} />
                                                <span className="flex-1 cursor-pointer">{i.f_issuer}</span>
                                            </div>
                                        ))}
                                        {replaceField === 'costcenter' && costcenters.filter(c => c.name.toLowerCase().includes(optionSearch.toLowerCase())).map(c => (
                                            <div key={c.id} className="p-2 border rounded cursor-pointer hover:bg-amber-100 flex items-center gap-2">
                                                <ArrowBigLeft className="text-green-500 cursor-pointer" onClick={() => { setForm(f => ({ ...f, costcenter_id: String(c.id), costcenter_name: c.name })); setReplaceField(null); setOptionSearch(""); }} />
                                                <span className="flex-1 cursor-pointer">{c.name}</span>
                                            </div>
                                        ))}
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
