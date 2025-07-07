import React, { useEffect, useState, useMemo } from "react";
import { CustomDataGrid, ColumnDef } from "@/components/ui/DataGrid";
import { authenticatedApi } from "@/config/api";
import { Plus, Replace, ArrowBigLeft, ArrowBigRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import ActionSidebar from "@components/ui/action-aside";

interface Account {
    id: number;
    account_master: string;
}

interface Simcard {
    id: number;
    sim_sn: string;
}

interface CostCenter {
    id: number;
    name: string;
}

interface Department {
    id: number;
    name: string;
}

interface User {
    ramco_id: string;
    name: string;
}

interface Brand {
    id: number;
    name: string;
}

interface Model {
    id: number;
    name: string;
}

interface Asset {
    id: number;
    classification: string;
    asset_code: string | null;
    finance_tag: string | null;
    serial_number: string;
    dop: string;
    year: string;
    unit_price: number | null;
    depreciation_length: number;
    depreciation_rate: string;
    cost_center: string;
    status: string;
    disposed_date: string;
    types: {
        type_id: number;
        type_code: string;
        name: string;
    };
    specs: {
        categories: {
            category_id: number;
            name: string;
        };
        brands: { id: number; name: string } | null;
        models: { id: number; name: string } | null;
        id: number;
        asset_id: number;
        type_id: number;
        category_id: number;
        brand_id: number | null;
        model_id: number | null;
        entry_code: string;
        asset_code: string | null;
        serial_number: string;
        chassis_no: string;
        engine_no: string;
        transmission: string;
        fuel_type: string;
        cubic_meter: string;
        avls_availability: string;
        avls_install_date: string;
        avls_removal_date: string;
        avls_transfer_date: string;
        updated_at: string;
        updated_by: string;
    };
    owner: Array<{
        ramco_id: string;
        name: string;
        email: string;
        contact: string;
        department: string;
        cost_center: string | null;
        district: string | null;
        effective_date: string;
    }>;
}

interface Subscriber {
    id: number;
    sub_no: string;
    account_sub: string;
    status: string;
    account: Account;
    simcard: Simcard;
    costcenter: CostCenter;
    department: Department;
    asset: Asset; // <-- added asset
    user: User;
    register_date: string;
}

// Add a form type for create/update
interface SubscriberForm {
    id?: number;
    sub_no?: string;
    account_sub?: string;
    status?: string;
    account?: number;
    simcard?: number;
    costcenter?: number;
    department?: number;
    user?: string;
    register_date?: string;
    asset_id?: number; // <-- added asset_id
}

const TelcoSubs = () => {
    const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
    const [sortConfig, setSortConfig] = useState<{ key: keyof Subscriber; direction: "asc" | "desc" } | null>(null);
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState<SubscriberForm>({});
    const [editId, setEditId] = useState<number | null>(null);
    const [accountsOpt, setAccountsOpt] = useState<Account[]>([]);
    const [assetsOpt, setAssetsOpt] = useState<Asset[]>([]);
    const [replaceField, setReplaceField] = useState<null | 'simcard' | 'costcenter' | 'department' | 'user' | 'asset'>(null);
    const [optionSearch, setOptionSearch] = useState("");

    // Move fetchSubscribers outside useEffect so it can be called after submit
    const fetchSubscribers = async () => {
        try {
            const res = await authenticatedApi.get("/api/telco/subs");
            const response = res.data as { status: string; message: string; data: Subscriber[] };
            if (response?.status === "success") {
                setSubscribers(response.data);
            }
        } catch (error) {
            console.error("Error fetching subscribers:", error);
        }
    };

    useEffect(() => {
        fetchSubscribers();
    }, []);

    useEffect(() => {
        const fetchAccounts = async () => {
            try {
                const res = await authenticatedApi.get("/api/telco/accounts");
                const response = res.data as { status: string; message: string; data: Account[] };
                setAccountsOpt(response.data || []);
            } catch (e) {
                // handle error
            }
        };
        fetchAccounts();
    }, []);

    useEffect(() => {
        const fetchAssets = async () => {
            try {
                const res = await authenticatedApi.get("/api/assets");
                const response = res.data as { status: string; message: string; data: Asset[] };
                if (response?.status === "success") {
                    setAssetsOpt(response.data.filter(a => a.types?.type_id === 2 && a.status === "active"));
                }
            } catch (e) {
                // handle error
            }
        };
        fetchAssets();
    }, []);

    const sortedSubscribers = React.useMemo(() => {
        if (!sortConfig || !sortConfig.key) return subscribers;

        const key = sortConfig.key;
        return [...subscribers].sort((a, b) => {
            const aValue = a?.[key];
            const bValue = b?.[key];

            if (aValue == null || bValue == null) return 0;

            if (aValue < bValue) {
                return sortConfig.direction === "asc" ? -1 : 1;
            }
            if (aValue > bValue) {
                return sortConfig.direction === "asc" ? 1 : -1;
            }
            return 0;
        });
    }, [subscribers, sortConfig]);

    const handleSort = (key: keyof Subscriber) => {
        setSortConfig((prevConfig) => {
            if (prevConfig?.key === key && prevConfig.direction === "asc") {
                return { key, direction: "desc" };
            }
            return { key, direction: "asc" };
        });
    };

    const [searchTerm, setSearchTerm] = useState("");

    const filteredSubscribers = React.useMemo(() => {
        if (!searchTerm) return sortedSubscribers;

        return sortedSubscribers.filter((subscriber) =>
            Object.values(subscriber).some((value) =>
                String(value).toLowerCase().includes(searchTerm.toLowerCase())
            )
        );
    }, [sortedSubscribers, searchTerm]);

    /* columns filtering params */
    // Remove masterAcOpt since 'account' is now a single object, not an array
    // If you need a filter for account master, you can build it from the subscribers list:
    const masterAcOpt = useMemo(
        () => Array.from(new Set(subscribers.map(s => s.account?.account_master).filter((v): v is string => typeof v === "string"))),
        [subscribers]
    );

    const columns: ColumnDef<Subscriber>[] = [
        { key: 'id', header: 'ID', sortable: false },
        { key: 'sub_no', header: 'Subscriber Number', sortable: true, filter: 'input' },
        { key: 'account_sub', header: 'Sub Account', sortable: true, filter: 'input' },
        { key: 'status', header: 'Status', sortable: true, filter: 'singleSelect' },
        { key: 'register_date', header: 'Register Date', sortable: true, render: (row: Subscriber) => new Date(row.register_date).toLocaleDateString() },
        { key: 'simcard', header: 'SIM Number', render: (row: Subscriber) => row.simcard?.sim_sn ?? '—' },
        { key: 'account', header: 'Account Master', render: (row: Subscriber) => row.account?.account_master ?? '—' },
        { key: 'costcenter', header: 'Cost Center', render: (row: Subscriber) => row.costcenter?.name ?? '—' },
        { key: 'department', header: 'Department', render: (row: Subscriber) => row.department?.name ?? '—' },
        { key: 'user', header: 'User', render: (row: Subscriber) => row.user?.name ?? '—' },
        // Asset columns
        { key: 'asset' as keyof Subscriber, header: 'Asset S/N', render: (row: Subscriber) => row.asset?.serial_number ?? '—' },
        { key: 'asset' as keyof Subscriber, header: 'Asset Brand', render: (row: Subscriber) => row.asset?.specs?.brands?.name ?? '—' },
        { key: 'asset' as keyof Subscriber, header: 'Asset Model', render: (row: Subscriber) => row.asset?.specs?.models?.name ?? '—' },
    ];

    const rowClass = (row: Subscriber) => {
        if (row.status === "terminated") return "bg-red-500 text-white";
        return "";
    };

    const handleOpen = (subscriber?: Subscriber) => {
        if (subscriber) {
            setForm({
                id: subscriber.id,
                sub_no: subscriber.sub_no,
                account_sub: subscriber.account_sub,
                register_date: subscriber.register_date.split("T")[0],
                status: subscriber.status,
                account: subscriber.account?.id,
                simcard: subscriber.simcard?.id,
                costcenter: subscriber.costcenter?.id,
                department: subscriber.department?.id,
                user: subscriber.user?.ramco_id,
                asset_id: subscriber.asset?.id // <-- use id instead of asset_id
            });
            setEditId(subscriber.id);
        } else {
            setForm({
                register_date: new Date().toISOString().split("T")[0] // default to today
            });
            setEditId(null);
        }
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
        setForm({});
        setEditId(null);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleAccountChange = (value: string) => {
        setForm({ ...form, account: Number(value) });
    };

    const handleSimcardChange = (value: string) => {
        setForm({ ...form, simcard: Number(value) });
    };

    const handleCostCenterChange = (value: string) => {
        setForm({ ...form, costcenter: Number(value) });
    };

    const handleDepartmentChange = (value: string) => {
        setForm({ ...form, department: Number(value) });
    };

    const handleUserChange = (value: string) => {
        setForm({ ...form, user: value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const submitData = {
                ...form,
                account: form.account ? form.account : undefined,
                simcard: form.simcard ? form.simcard : undefined,
                costcenter: form.costcenter ? form.costcenter : undefined,
                department: form.department ? form.department : undefined,
                user: form.user ? form.user : undefined,
                asset_id: form.asset_id ? form.asset_id : undefined // <-- include asset_id in payload
            };
            if (editId) {
                await authenticatedApi.put(`/api/telco/subs/${editId}`, submitData);
            } else {
                await authenticatedApi.post("/api/telco/subs", submitData);
            }
            fetchSubscribers();
            handleClose();
        } catch (e) {
            // handle error
        }
    };

    return (
        <div className="mt-4">
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-bold mb-4">Subscribers</h1>
                <Button className="mb-4" onClick={() => handleOpen()}><Plus /></Button>
            </div>
            <CustomDataGrid
                data={filteredSubscribers}
                columns={columns}
                pageSize={10}
                inputFilter={false}
                pagination={true}
                rowClass={rowClass}
                columnsVisibleOption={true}
                dataExport={true}
                onRowDoubleClick={handleOpen}
            />
            {open && (
                <ActionSidebar
                    onClose={() => { setReplaceField(null); handleClose(); }}
                    size={replaceField ? 'lg' : 'sm'}
                    title={editId ? "Edit Subscriber" : "Add Subscriber"}
                    content={
                        <div className={replaceField ? "flex flex-row gap-6" : undefined}>
                            <form onSubmit={handleSubmit} className={replaceField ? "space-y-3 p-4 flex-1" : "space-y-3 p-4"}>
                                <label className="block">
                                    <span className="block mb-1">Subscriber Number</span>
                                    <Input name="sub_no" value={form.sub_no || ""} onChange={handleChange} required />
                                </label>
                                <label className="block">
                                    <span className="block mb-1">Sub Account</span>
                                    <Input name="account_sub" value={form.account_sub || ""} onChange={handleChange} required />
                                </label>
                                <label className="block">
                                    <span className="block mb-1">Status</span>
                                    <Input name="status" value={form.status || ""} onChange={handleChange} required />
                                </label>
                                <label className="block">
                                    <span className="block mb-1">Register Date</span>
                                    <Input name="register_date" type="date" value={form.register_date || ""} onChange={handleChange} required />
                                </label>
                                <label className="block">
                                    <span className="block mb-1">Account Master</span>
                                    <Select value={form.account?.toString() || ""} onValueChange={handleAccountChange} required>
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Select account" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {accountsOpt.map(acc => (
                                                <SelectItem key={acc.id} value={acc.id.toString()}>{acc.account_master}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </label>
                                <label className="block">
                                    <span className="block mb-1">SIM Card</span>
                                    <div className="relative group">
                                        <Input
                                            name="simcard"
                                            className="pr-8 group-focus-within:ring-2"
                                            value={
                                                form.simcard
                                                    ? subscribers.find(s => s.simcard?.id === Number(form.simcard))?.simcard?.sim_sn || form.simcard.toString()
                                                    : ""
                                            }
                                            readOnly
                                            required
                                        />
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-amber-500 cursor-pointer" onClick={() => setReplaceField('simcard')}>
                                                        <ArrowBigRight />
                                                    </span>
                                                </TooltipTrigger>
                                                <TooltipContent side="left">Click to replace SIM card</TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </div>
                                </label>
                                <label className="block">
                                    <span className="block mb-1">Cost Center</span>
                                    <div className="relative group">
                                        <Input
                                            name="costcenter"
                                            className="pr-8 group-focus-within:ring-2"
                                            value={
                                                form.costcenter
                                                    ? subscribers.find(s => s.costcenter?.id === Number(form.costcenter))?.costcenter?.name || form.costcenter.toString()
                                                    : ""
                                            }
                                            readOnly
                                            required
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
                                </label>
                                <label className="block">
                                    <span className="block mb-1">Department</span>
                                    <div className="relative group">
                                        <Input
                                            name="department"
                                            className="pr-8 group-focus-within:ring-2"
                                            value={
                                                form.department
                                                    ? subscribers.find(s => s.department?.id === Number(form.department))?.department?.name || form.department.toString()
                                                    : ""
                                            }
                                            readOnly
                                            required
                                        />
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-amber-500 cursor-pointer" onClick={() => setReplaceField('department')}>
                                                        <ArrowBigRight />
                                                    </span>
                                                </TooltipTrigger>
                                                <TooltipContent side="left">Click to replace department</TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </div>
                                </label>
                                <label className="block">
                                    <span className="block mb-1">User</span>
                                    <div className="relative group">
                                        <Input
                                            name="user"
                                            className="pr-8 group-focus-within:ring-2"
                                            value={
                                                form.user
                                                    ? subscribers.find(s => s.user?.ramco_id === form.user)?.user?.name || form.user
                                                    : ""
                                            }
                                            readOnly
                                            required
                                        />
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-amber-500 cursor-pointer" onClick={() => setReplaceField('user')}>
                                                        <ArrowBigRight />
                                                    </span>
                                                </TooltipTrigger>
                                                <TooltipContent side="left">Click to replace user</TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </div>
                                </label>
                                <label className="block">
                                    <span className="block mb-1">Asset</span>
                                    <div className="relative group">
                                        <Input
                                            name="asset_id"
                                            className="pr-8 group-focus-within:ring-2"
                                            value={
                                                form.asset_id && assetsOpt.length > 0
                                                    ? (assetsOpt.find(a => a.id === Number(form.asset_id))?.serial_number || "")
                                                    : ""
                                            }
                                            readOnly
                                            required
                                        />
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-amber-500 cursor-pointer" onClick={() => setReplaceField('asset')}>
                                                        <ArrowBigRight />
                                                    </span>
                                                </TooltipTrigger>
                                                <TooltipContent side="left">Click to replace asset</TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </div>
                                </label>
                                <div className="flex gap-2 mt-6">
                                    <Button type="submit">{editId ? "Update" : "Create"}</Button>
                                    <Button type="button" variant="destructive" onClick={handleClose}>Cancel</Button>
                                </div>
                            </form>
                            {replaceField && (
                                <div className="border-l px-4 mt-4 flex-1 min-w-[260px] max-w-md">
                                    <h3 className="font-semibold mb-2">Select a {replaceField.replace(/([A-Z])/g, ' $1').toLowerCase()}</h3>
                                    <Input
                                        placeholder={`Search ${replaceField.replace(/([A-Z])/g, ' $1').toLowerCase()}...`}
                                        className="mb-3"
                                        value={optionSearch}
                                        onChange={e => setOptionSearch(e.target.value)}
                                    />
                                    <div className="max-h-96 overflow-y-auto space-y-2">
                                        {replaceField === 'simcard' && Array.from(new Map(subscribers.filter(s => s.simcard).map(s => [s.simcard.id, s.simcard])).values())
                                            .filter(sim => sim.sim_sn.toLowerCase().includes(optionSearch.toLowerCase()))
                                            .map(sim => (
                                                <div key={sim.id} className="p-2 border rounded cursor-pointer hover:bg-amber-100 flex items-center gap-2">
                                                    <ArrowBigLeft className="text-green-500 cursor-pointer" onClick={() => { setForm({ ...form, simcard: sim.id }); setReplaceField(null); setOptionSearch(""); }} />
                                                    <span onClick={() => { setForm({ ...form, simcard: sim.id }); setReplaceField(null); setOptionSearch(""); }} className="flex-1 cursor-pointer">{sim.sim_sn}</span>
                                                </div>
                                            ))}
                                        {replaceField === 'costcenter' && Array.from(new Map(subscribers.filter(s => s.costcenter).map(s => [s.costcenter.id, s.costcenter])).values())
                                            .filter(cc => cc.name.toLowerCase().includes(optionSearch.toLowerCase()))
                                            .map(cc => (
                                                <div key={cc.id} className="p-2 border rounded cursor-pointer hover:bg-amber-100 flex items-center gap-2">
                                                    <ArrowBigLeft className="text-green-500 cursor-pointer" onClick={() => { setForm({ ...form, costcenter: cc.id }); setReplaceField(null); setOptionSearch(""); }} />
                                                    <span onClick={() => { setForm({ ...form, costcenter: cc.id }); setReplaceField(null); setOptionSearch(""); }} className="flex-1 cursor-pointer">{cc.name}</span>
                                                </div>
                                            ))}
                                        {replaceField === 'department' && Array.from(new Map(subscribers.filter(s => s.department).map(s => [s.department.id, s.department])).values())
                                            .filter(dep => dep.name.toLowerCase().includes(optionSearch.toLowerCase()))
                                            .map(dep => (
                                                <div key={dep.id} className="p-2 border rounded cursor-pointer hover:bg-amber-100 flex items-center gap-2">
                                                    <ArrowBigLeft className="text-green-500 cursor-pointer" onClick={() => { setForm({ ...form, department: dep.id }); setReplaceField(null); setOptionSearch(""); }} />
                                                    <span onClick={() => { setForm({ ...form, department: dep.id }); setReplaceField(null); setOptionSearch(""); }} className="flex-1 cursor-pointer">{dep.name}</span>
                                                </div>
                                            ))}
                                        {replaceField === 'user' && Array.from(new Map(subscribers.filter(s => s.user).map(s => [s.user.ramco_id, s.user])).values())
                                            .filter(user => user.name.toLowerCase().includes(optionSearch.toLowerCase()))
                                            .map(user => (
                                                <div key={user.ramco_id} className="p-2 border rounded cursor-pointer hover:bg-amber-100 flex items-center gap-2">
                                                    <ArrowBigLeft className="text-green-500 cursor-pointer" onClick={() => { setForm({ ...form, user: user.ramco_id }); setReplaceField(null); setOptionSearch(""); }} />
                                                    <span onClick={() => { setForm({ ...form, user: user.ramco_id }); setReplaceField(null); setOptionSearch(""); }} className="flex-1 cursor-pointer">{user.name}</span>
                                                </div>
                                            ))}
                                        {replaceField === 'asset' && assetsOpt
                                            .filter(asset => asset.serial_number.toLowerCase().includes(optionSearch.toLowerCase()))
                                            .map(asset => (
                                                <div key={asset.id} className="p-2 border rounded cursor-pointer hover:bg-amber-100 flex items-center gap-2">
                                                    <ArrowBigLeft className="text-green-500 cursor-pointer" onClick={() => { setForm({ ...form, asset_id: asset.id }); setReplaceField(null); setOptionSearch(""); }} />
                                                    <span onClick={() => { setForm({ ...form, asset_id: asset.id }); setReplaceField(null); setOptionSearch(""); }} className="flex-1 cursor-pointer">{asset.serial_number} - {asset.specs.brands?.name || ''} {asset.specs.models?.name || ''}</span>
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

export default TelcoSubs;