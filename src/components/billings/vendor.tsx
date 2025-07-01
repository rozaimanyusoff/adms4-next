import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { CustomDataGrid, ColumnDef } from "@components/ui/DataGrid";
import { authenticatedApi } from "@/config/api";

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

const emptyVendor: Omit<Vendor, "id"> = {
    name: "",
    service_type: "telco",
    register_date: "",
    address: "",
    contact_name: "",
    contact_no: "",
    contact_email: "",
    status: "active"
};

const VendorMaintenance = () => {
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState<Omit<Vendor, "id">>(emptyVendor);
    const [editId, setEditId] = useState<number | null>(null);

    const fetchVendors = async () => {
        console.log("Fetching vendors...");
        try {
            const res = await authenticatedApi.get("/api/telco/vendors");
            console.log("API response", res);
            const response = res.data as { status: string; message: string; data: Vendor[] };
            if (response?.status?.toLowerCase() === "success") {
                setVendors(response.data);
            }
        } catch (e) {
            console.error("Error fetching vendors:", e);
        }
    };

    useEffect(() => {
        fetchVendors();
    }, []);

    const handleOpen = (vendor?: Vendor) => {
        if (vendor) {
            setForm({ ...vendor, register_date: vendor.register_date.split("T")[0] });
            setEditId(vendor.id);
        } else {
            setForm(emptyVendor);
            setEditId(null);
        }
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
        setForm(emptyVendor);
        setEditId(null);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editId) {
                await authenticatedApi.put(`/api/telco/vendors/${editId}`, form);
            } else {
                await authenticatedApi.post("/api/telco/vendors", form);
            }
            fetchVendors();
            handleClose();
        } catch (e) {
            // handle error
        }
    };

    const columns = ([
        {
            key: '', // not a real data key, just for row number
            header: '#',
            render: (row: Vendor) => vendors.findIndex(v => v.id === row.id) + 1,
            sortable: false,
            filter: undefined,
            width: 50
        },
        { key: 'name', header: 'Name', sortable: true, filter: 'input' },
        { key: 'service_type', header: 'Service Type', sortable: true, filter: 'singleSelect' },
        { key: 'register_date', header: 'Register Date', sortable: true, render: (row: Vendor) => new Date(row.register_date).toLocaleDateString() },
        { key: 'address', header: 'Address', sortable: true, filter: 'input', colClass: 'text-wrap' },
        { key: 'contact_name', header: 'Contact Name', sortable: true, filter: 'input' },
        { key: 'contact_no', header: 'Contact No', sortable: true, filter: 'input' },
        { key: 'contact_email', header: 'Contact Email', sortable: true, filter: 'input' },
        { key: 'status', header: 'Status', sortable: true, filter: 'input', colClass: 'uppercase' }
    ] as unknown) as ColumnDef<Vendor>[];

    return (
        <div className="mt-4">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-xl font-bold">Vendors</h1>
                <Button onClick={() => handleOpen()}><Plus /></Button>
            </div>
            <div className="overflow-x-auto">
                <CustomDataGrid
                    data={vendors}
                    columns={columns}
                    pageSize={10}
                    pagination={true}
                    inputFilter={false}
                    columnsVisibleOption={true}
                    dataExport={true}
                    //rowColHighlight={true}
                    onRowDoubleClick={handleOpen}
                />
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent>
                    <DialogTitle>{editId ? "Edit Vendor" : "Add Vendor"}</DialogTitle>
                    <form onSubmit={handleSubmit} className="space-y-3">
                        <label className="block">
                            <span className="block mb-1">Name</span>
                            <Input name="name" value={form.name} onChange={handleChange} required />
                        </label>
                        <label className="block">
                            <span className="block mb-1">Service Type</span>
                            <Input name="service_type" value={form.service_type} onChange={handleChange} required />
                        </label>
                        <label className="block">
                            <span className="block mb-1">Register Date</span>
                            <Input name="register_date" type="date" value={form.register_date} onChange={handleChange} required />
                        </label>
                        <label className="block">
                            <span className="block mb-1">Address</span>
                            <Input name="address" value={form.address} onChange={handleChange} required />
                        </label>
                        <label className="block">
                            <span className="block mb-1">Contact Name</span>
                            <Input name="contact_name" value={form.contact_name} onChange={handleChange} required />
                        </label>
                        <label className="block">
                            <span className="block mb-1">Contact No</span>
                            <Input name="contact_no" value={form.contact_no} onChange={handleChange} required />
                        </label>
                        <label className="block">
                            <span className="block mb-1">Contact Email</span>
                            <Input name="contact_email" value={form.contact_email} onChange={handleChange} required />
                        </label>
                        <label className="block">
                            <span className="block mb-1">Status</span>
                            <Input name="status" value={form.status} onChange={handleChange} required />
                        </label>
                        <div className="flex gap-2 mt-4">
                            <Button type="submit">{editId ? "Update" : "Create"}</Button>
                            <Button type="button" variant="secondary" onClick={handleClose}>Cancel</Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default VendorMaintenance;
