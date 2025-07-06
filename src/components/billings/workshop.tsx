import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { CustomDataGrid, ColumnDef } from "@components/ui/DataGrid";
import { authenticatedApi } from "@/config/api";
import ActionSidebar from "@components/ui/action-aside";
import { toast } from "sonner";

interface Workshop {
    ws_id: number;
    ws_type: number;
    ws_name: string;
    ws_add: string;
    ws_ctc: string;
    ws_pic: string;
    ws_panel: string;
    agreement_date_from: string;
    agreement_date_to: string;
    sub_no: string;
}

const emptyWorkshop: Omit<Workshop, "ws_id"> = {
    ws_type: 0,
    ws_name: "",
    ws_add: "",
    ws_ctc: "",
    ws_pic: "",
    ws_panel: "0",
    agreement_date_from: "",
    agreement_date_to: "",
    sub_no: ""
};

const Workshop = () => {
    const [workshops, setWorkshops] = useState<Workshop[]>([]);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [form, setForm] = useState<Omit<Workshop, "ws_id">>(emptyWorkshop);
    const [editId, setEditId] = useState<number | null>(null);

    const fetchWorkshops = async () => {
        try {
            const res = await authenticatedApi.get("/api/bills/workshops");
            const response = res.data as { status: string; message: string; data: Workshop[] };
            if (response?.status?.toLowerCase() === "success") {
                setWorkshops(response.data);
            }
        } catch (e) {
            console.error("Error fetching workshops:", e);
        }
    };

    useEffect(() => {
        fetchWorkshops();
    }, []);

    const handleOpen = (workshop?: Workshop) => {
        if (workshop) {
            setForm({
                ...workshop,
                agreement_date_from: workshop.agreement_date_from?.split("T")[0] || "",
                agreement_date_to: workshop.agreement_date_to?.split("T")[0] || ""
            });
            setEditId(workshop.ws_id);
        } else {
            setForm(emptyWorkshop);
            setEditId(null);
        }
        setSidebarOpen(true);
    };

    const handleClose = () => {
        setSidebarOpen(false);
        setForm(emptyWorkshop);
        setEditId(null);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editId) {
                await authenticatedApi.put(`/api/bills/workshops/${editId}`, form);
                toast.success("Workshop updated successfully");
            } else {
                await authenticatedApi.post("/api/bills/workshops", form);
                toast.success("Workshop created successfully");
            }
            fetchWorkshops();
            handleClose();
        } catch (e: any) {
            toast.error(e?.response?.data?.message || "Failed to save workshop");
        }
    };

    const columns = ([
        {
            key: '',
            header: '#',
            render: (row: Workshop) => workshops.findIndex(w => w.ws_id === row.ws_id) + 1,
            sortable: false,
            filter: undefined,
            width: 50
        },
        { key: 'ws_name', header: 'Name', sortable: true, filter: 'input' },
        { key: 'ws_type', header: 'Type', sortable: true, filter: 'input', render: (row: Workshop) => row.ws_type === 1 ? "Panel" : "Non-panel" },
        { key: 'ws_add', header: 'Address', sortable: true, filter: 'input', colClass: 'text-wrap' },
        { key: 'ws_ctc', header: 'Contact', sortable: true, filter: 'input' },
        { key: 'ws_pic', header: 'PIC', sortable: true, filter: 'input' },
        { key: 'ws_panel', header: 'Status', sortable: true, filter: 'input', render: (row: Workshop) => row.ws_panel === "1" ? "Active" : "Terminated" },
        { key: 'agreement_date_from', header: 'Agreement From', sortable: true, render: (row: Workshop) => row.agreement_date_from ? new Date(row.agreement_date_from).toLocaleDateString() : '', filter: 'input' },
        { key: 'agreement_date_to', header: 'Agreement To', sortable: true, render: (row: Workshop) => row.agreement_date_to ? new Date(row.agreement_date_to).toLocaleDateString() : '', filter: 'input' },
        { key: 'sub_no', header: 'Sub No', sortable: true, filter: 'input' },
    ] as unknown) as ColumnDef<Workshop>[];

    return (
        <div className="mt-4">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-xl font-bold">Workshops</h1>
                <Button onClick={() => handleOpen()}><Plus /></Button>
            </div>
            <div className="overflow-x-auto">
                <CustomDataGrid
                    data={workshops}
                    columns={columns}
                    pageSize={10}
                    pagination={false}
                    inputFilter={false}
                    columnsVisibleOption={false}
                    dataExport={true}
                    onRowDoubleClick={handleOpen}
                />
            </div>
            {sidebarOpen && (
                <ActionSidebar
                    size={'sm'}
                    onClose={handleClose}
                    title={editId ? "Edit Workshop" : "Add Workshop"}
                    content={
                        <form onSubmit={handleSubmit} className="space-y-3">
                            <label className="block">
                                <span className="block mb-1">Name</span>
                                <Input name="ws_name" value={form.ws_name} onChange={handleInputChange} required />
                            </label>
                            <label className="block">
                                <span className="block mb-1">Type</span>
                                <Select value={String(form.ws_type)} onValueChange={v => setForm(f => ({ ...f, ws_type: Number(v) }))}>
                                    <SelectTrigger className="w-full border rounded px-2 py-1">
                                        <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="0">Non-panel</SelectItem>
                                        <SelectItem value="1">Panel</SelectItem>
                                    </SelectContent>
                                </Select>
                            </label>
                            <label className="block">
                                <span className="block mb-1">Address</span>
                                <Textarea name="ws_add" value={form.ws_add} onChange={handleInputChange} required />
                            </label>
                            <label className="block">
                                <span className="block mb-1">Contact</span>
                                <Input name="ws_ctc" value={form.ws_ctc} onChange={handleInputChange} required />
                            </label>
                            <label className="block">
                                <span className="block mb-1">PIC</span>
                                <Input name="ws_pic" value={form.ws_pic} onChange={handleInputChange} required />
                            </label>
                            <label className="block">
                                <span className="block mb-1">Status</span>
                                <Select value={form.ws_panel} onValueChange={v => setForm(f => ({ ...f, ws_panel: v }))}>
                                    <SelectTrigger className="w-full border rounded px-2 py-1">
                                        <SelectValue placeholder="Select status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1">Active</SelectItem>
                                        <SelectItem value="0">Terminated</SelectItem>
                                    </SelectContent>
                                </Select>
                            </label>
                            <label className="block">
                                <span className="block mb-1">Agreement Date From</span>
                                <Input name="agreement_date_from" type="date" value={form.agreement_date_from} onChange={handleInputChange} />
                            </label>
                            <label className="block">
                                <span className="block mb-1">Agreement Date To</span>
                                <Input name="agreement_date_to" type="date" value={form.agreement_date_to} onChange={handleInputChange} />
                            </label>
                            <label className="block">
                                <span className="block mb-1">Sub No</span>
                                <Input name="sub_no" value={form.sub_no} onChange={handleInputChange} />
                            </label>
                            <div className="flex gap-2 mt-4">
                                <Button type="submit">{editId ? "Update" : "Create"}</Button>
                                <Button type="button" variant="destructive" onClick={handleClose}>Cancel</Button>
                            </div>
                        </form>
                    }
                />
            )}
        </div>
    );
};

export default Workshop;
