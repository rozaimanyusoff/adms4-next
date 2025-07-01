import React, { useEffect, useState, useMemo } from "react";
import { CustomDataGrid, ColumnDef } from "@/components/ui/DataGrid";
import { authenticatedApi } from "@/config/api";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Subscriber {
    id: number;
    sub_no: string;
    account_sub: string;
    register_date: string;
    status: string;
    accounts: Account[];
    sims: SIM[];
}

interface Account {
    id: number;
    account_master: string;
    contracts: Contract[];
}

interface Contract {
    id: number;
    account_id: number;
    product_type: string;
    contract_start_date: string;
    contract_end_date: string;
    plan: string;
    status: string;
    vendor_id: number;
    price: string;
    duration: string;
    vendor: Vendor;
}

interface Vendor {
    id: number;
    name: string;
    service_type: string;
    register_date: string;
    address: string;
    contact_name: string;
    contact_no: string;
    contact_email: string;
    status: string;
}

interface SIM {
    id: number;
    sim_sn: string;
    sub_no_id: number;
    register_date: string;
    reason: string;
    note: string;
}

// Add a form type for create/update
interface SubscriberForm {
    id?: number;
    sub_no?: string;
    account_sub?: string;
    register_date?: string;
    status?: string;
    accounts?: number[];
}

const TelcoSubs = () => {
    const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
    const [sortConfig, setSortConfig] = useState<{ key: keyof Subscriber; direction: "asc" | "desc" } | null>(null);
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState<SubscriberForm>({});
    const [editId, setEditId] = useState<number | null>(null);
    const [accountsOpt, setAccountsOpt] = useState<Account[]>([]);

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
    const masterAcOpt = useMemo(
        () =>
            Array.from(
                new Set(
                    subscribers
                        .flatMap(s => s.accounts?.map(a => a.account_master) ?? [])
                        .filter((v): v is string => typeof v === "string")
                )
            ),
        [subscribers]
    );

    const columns: ColumnDef<Subscriber>[] = [
        { key: 'id', header: 'ID', sortable: false },
        { key: 'sub_no', header: 'Subscriber Number', sortable: true, filter: 'input' },
        { key: 'account_sub', header: 'Sub Account', sortable: true, filter: 'input' },
        { key: 'status', header: 'Status', sortable: true, filter: 'singleSelect' },
        { key: 'register_date', header: 'Register Date', sortable: true, render: (row: Subscriber) => new Date(row.register_date).toLocaleDateString() },
        { key: 'sims', header: 'SIM Number', render: (row: Subscriber) => row.sims?.[0]?.sim_sn ?? '—' },
        { key: 'accounts', header: 'Account Master', render: (row: Subscriber) => row.accounts?.[0]?.account_master ?? '—' },
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
                accounts: subscriber.accounts.map(a => a.id)
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
        setForm({ ...form, accounts: [Number(value)] });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const submitData = {
                ...form,
                accounts: form.accounts ? form.accounts : [] // send as number[]
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
                <h1 className="text-xl font-bold mb-4">Telco Subscribers</h1>
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
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent>
                    <DialogTitle>{editId ? "Edit Subscriber" : "Add Subscriber"}</DialogTitle>
                    <form onSubmit={handleSubmit} className="space-y-3">
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
                            <Select value={form.accounts?.[0]?.toString() || ""} onValueChange={handleAccountChange} required>
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
                        <div className="flex gap-2 mt-6">
                            <Button type="submit">{editId ? "Update" : "Create"}</Button>
                            <Button type="button" variant="secondary" onClick={handleClose}>Cancel</Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default TelcoSubs;