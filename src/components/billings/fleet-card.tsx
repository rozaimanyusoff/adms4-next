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
    asset: {
        vehicle_id: number;
        vehicle_regno: string;
        fuel_type: string;
        purpose: string;
    };
    card_no: string;
    reg_date: string | null;
    remarks: string | null;
    pin_no: string | null;
    status: string;
    expiry: string | null;
}

interface IssuerOption {
    fuel_id: number;
    f_issuer: string;
}

interface AssetOption {
    vehicle_id: number;
    vehicle_regno: string;
    vtrans_type: string;
    vfuel_type: string;
    v_dop: string;
    classification: string;
    record_status: string;
    purpose: string;
    condition_status: string;
    costcenter: {
        id: number;
        name: string;
    };
    owner: {
        ramco_id: string;
        full_name: string;
    };
    brand: {
        id: number;
        name: string;
    };
    model: {
        id: number;
        name: string;
    };
    category: string | null;
    department: {
        id: number;
        name: string;
    };
    fleetcard: {
        id: number;
        card_no: string;
    };
}

const FleetCardList: React.FC = () => {
    const [fleetCards, setFleetCards] = useState<FleetCard[]>([]);
    const [issuers, setIssuers] = useState<IssuerOption[]>([]);
    const [assets, setAssets] = useState<AssetOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [replaceField, setReplaceField] = useState<null | 'issuer' | 'asset'>(null);
    const [optionSearch, setOptionSearch] = useState("");
    const [form, setForm] = useState({
        card_no: '',
        vehicle_id: '',
        fuel_id: '',
        pin: '',
        status: 'Active',
        reg_date: '',
        expiry_date: '',
        remarks: '',
    });
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

        authenticatedApi.get<{ data: IssuerOption[] }>("/api/bills/fuel/issuer")
            .then(res => setIssuers(res.data.data || []));

        authenticatedApi.get<{ data: AssetOption[] }>("/api/bills/temp-vehicle")
            .then(res => setAssets(res.data.data || []))
            .catch(() => toast.error("Failed to load assets."));
    }, []);

    const columns: ColumnDef<FleetCard>[] = [
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
            render: (row: FleetCard) => row.card_no,
            filter: 'input',
        },
        {
            key: 'pin_no',
            header: 'PIN',
            render: (row: FleetCard) => row.pin_no,
        },
        {
            key: 'fuel',
            header: 'Issuer',
            render: (row: FleetCard) => row.fuel.fuel_issuer,
            filter: 'singleSelect',
        },
        {
            key: 'fuel_type',
            header: 'Fuel Type',
            render: (row: FleetCard) => row.asset?.fuel_type,
            filter: 'singleSelect',
            colClass: 'capitalize',
        },
        {
            key: 'asset',
            header: 'Vehicle Reg No',
            render: (row: FleetCard) => row.asset?.vehicle_regno,
            filter: 'input',
        },
        {
            key: 'purpose',
            header: 'Purpose',
            render: (row: FleetCard) => row.asset?.purpose,
            filter: 'singleSelect',
            colClass: 'capitalize',
        },
        {
            key: 'status',
            header: 'Status',
            render: (row: FleetCard) => row.status,
            filter: 'singleSelect',
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

    const handleOpenSidebar = (row?: FleetCard) => {
        setSidebarOpen(true);
        setReplaceField(null);
        setOptionSearch("");
        if (row) {
            setEditingId(row.id);
            setFormLoading(true); // Start loading
            setForm({
                card_no: row.card_no || '',
                vehicle_id: row.asset?.vehicle_id ? String(row.asset.vehicle_id) : '',
                fuel_id: row.fuel?.fuel_id ? String(row.fuel.fuel_id) : '',
                pin: row.pin_no || '',
                status: row.status || 'Active',
                reg_date: row.reg_date ? row.reg_date.slice(0, 10) : '',
                expiry_date: row.expiry ? row.expiry.slice(0, 10) : '',
                remarks: row.remarks || '',
            });
            setFormLoading(false); // Done loading
        } else {
            setEditingId(null);
            setForm({
                card_no: '',
                vehicle_id: '',
                fuel_id: '',
                pin: '',
                status: 'Active',
                reg_date: '',
                expiry_date: '',
                remarks: '',
            });
            setFormLoading(false); // Not loading for create
        }
    };

    // Update handleSubmit to replace undefined reg_date and expiry_date with null
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const payload = {
            card_no: form.card_no,
            pin: form.pin,
            fuel_id: form.fuel_id,
            vehicle_id: form.vehicle_id,
            status: form.status,
            reg_date: form.reg_date || null,
            expiry_date: form.expiry_date || null,
            remarks: form.remarks,
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

    return (
        <div className="mt-4">
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
                data={fleetCards}
                pagination={false}
                pageSize={10}
                dataExport={true}
                inputFilter={false}
                onRowDoubleClick={handleOpenSidebar}
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
                                    <Input value={form.pin} onChange={e => setForm(f => ({ ...f, pin: e.target.value }))} />
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
                                                form.vehicle_id
                                                    ? (
                                                        fleetCards.find(fc => String(fc.asset?.vehicle_id) === String(form.vehicle_id))?.asset?.vehicle_regno
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
                                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-amber-500 cursor-pointer" onClick={() => { setReplaceField('asset'); }}>
                                                        <ArrowBigRight />
                                                    </span>
                                                </TooltipTrigger>
                                                <TooltipContent side="left">Click to replace asset</TooltipContent>
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
                                                {editingId ? 'Update' : 'Save'}
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
                            {/* End Inline Fleet Card Form */}
                            {replaceField && (
                                <div className="border-l px-4 mt-4 flex-1 min-w-[260px] max-w-md">
                                    <h3 className="font-semibold mb-2">Select a {replaceField === 'issuer' ? 'issuer' : 'cost center'}</h3>
                                    <Input
                                        placeholder={`Search ${replaceField === 'issuer' ? 'issuer' : 'cost center'}...`}
                                        className="mb-3"
                                        value={optionSearch}
                                        onChange={e => setOptionSearch(e.target.value)}
                                    />
                                    <div className="max-h-[500px] overflow-y-auto space-y-2">
                                        {replaceField === 'issuer' && issuers.filter(i => i.f_issuer.toLowerCase().includes(optionSearch.toLowerCase())).map(i => (
                                            <div key={i.fuel_id} className="p-2 border rounded cursor-pointer hover:bg-amber-100 flex items-center gap-2">
                                                <ArrowBigLeft className="text-green-500 cursor-pointer" onClick={() => { setForm(f => ({ ...f, fuel_id: String(i.fuel_id) })); setReplaceField(null); setOptionSearch(""); }} />
                                                <span className="flex-1 cursor-pointer">{i.f_issuer}</span>
                                            </div>
                                        ))}
                                        {replaceField === 'asset' && assets.filter(a => a.vehicle_regno.toLowerCase().includes(optionSearch.toLowerCase())).map(a => (
                                            <div key={a.vehicle_id} className="p-2 border rounded cursor-pointer hover:bg-amber-100 flex items-center gap-2">
                                                <ArrowBigLeft className="text-green-500 cursor-pointer" onClick={() => {
                                                    setForm(f => ({ ...f, vehicle_id: String(a.vehicle_id) }));
                                                    setReplaceField(null);
                                                    setOptionSearch("");
                                                }} />
                                                <div className="flex flex-col">
                                                    <span className="cursor-pointer">{a.vehicle_regno}</span>
                                                    {/* costcenter */}
                                                    <span className="text-xs">Cost Ctr:<span className="text-blue-600"> {a.costcenter?.name}</span></span> {/* costcenter name */}
                                                    <span className="text-xs">Assigned Card:<span className="text-red-600"> {a.fleetcard?.card_no}</span></span> {/* card_no */}
                                                </div>
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
