import React, { useEffect, useState } from "react";
import { CustomDataGrid, ColumnDef } from "@components/ui/DataGrid";
import { authenticatedApi } from "../../config/api";
import { Plus, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import ActionSidebar from "@components/ui/action-aside";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface Department {
    id: number;
    name: string;
    code: string;
    ramco_name?: string | null;
    dept_desc_malay?: string | null;
    status?: number | boolean;
}

const OrgDept: React.FC = () => {
    const [data, setData] = useState<Department[]>([]);
    const [loading, setLoading] = useState(true);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const emptyForm = {
        code: "",
        name: "",
        ramco_name: "",
        dept_desc_malay: "",
        status: true,
    };
    const [form, setForm] = useState<typeof emptyForm>(emptyForm);

    const fetchData = async () => {
        try {
            const res = await authenticatedApi.get<any>("/api/assets/departments");
            setData(Array.isArray(res.data) ? res.data : (res.data && res.data.data ? res.data.data : []));
        } catch (error) {
            setData([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name || !form.code) {
            toast.error("Code and Name are required");
            return;
        }

        const payload = {
            code: form.code || null,
            name: form.name || null,
            ramco_name: form.ramco_name || null,
            dept_desc_malay: form.dept_desc_malay || null,
            status: form.status ? 1 : 0,
        };

        try {
            setSubmitting(true);
            if (editingId) {
                await authenticatedApi.put(`/api/assets/departments/${editingId}`, payload);
                toast.success("Department updated");
            } else {
                await authenticatedApi.post("/api/assets/departments", payload);
                toast.success("Department created");
            }
            fetchData();
            setSidebarOpen(false);
            setEditingId(null);
            setForm(emptyForm);
        } catch (error: any) {
            toast.error(error?.response?.data?.message || "Failed to save department");
        } finally {
            setSubmitting(false);
        }
    };

    const columns: ColumnDef<Department>[] = [
        { key: "id", header: "ID" },
        { key: "name", header: "Name", filter: 'input' },
        { key: "code", header: "Code", filter: 'input' },
        { key: "ramco_name", header: "RAMCO Name", filter: 'input' },
        { key: "dept_desc_malay", header: "Name (BM)", filter: 'input' },
        { key: "status", header: "Status", render: (row) => (Number(row.status) === 1 ? "Active" : "Inactive"), filter: 'singleSelect' },
    ];

    const openEdit = async (row: Department) => {
        if (!row.id) return;
        setDetailLoading(true);
        setSidebarOpen(true);
        setEditingId(String(row.id));
        try {
            const res = await authenticatedApi.get<any>(`/api/assets/departments/${row.id}`);
            const dept = res.data?.data || res.data || {};
            setForm({
                code: dept.code || "",
                name: dept.name || "",
                ramco_name: dept.ramco_name || "",
                dept_desc_malay: dept.dept_desc_malay || "",
                status: (dept.status ?? dept.is_active ?? 1) === 1,
            });
        } catch (error: any) {
            toast.error(error?.response?.data?.message || "Failed to load department details");
        } finally {
            setDetailLoading(false);
        }
    };

    return (
        <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-bold">Departments</h2>
                <Button size="sm" onClick={() => { setSidebarOpen(true); setEditingId(null); setForm(emptyForm); }}>
                    <Plus size={18} />
                </Button>
            </div>
            {loading ? <p>Loading...</p> :
                <CustomDataGrid
                    columns={columns}
                    data={data}
                    pagination={false}
                    inputFilter={false}
                    onRowDoubleClick={(row: Department) => openEdit(row)}
                />}
            <ActionSidebar
                size="sm"
                title={editingId ? "Edit Department" : "Create Department"}
                isOpen={sidebarOpen}
                onClose={() => { setSidebarOpen(false); setEditingId(null); setForm(emptyForm); }}
                content={
                    <form className="space-y-4" onSubmit={handleSubmit}>
                        {detailLoading && <p className="text-sm text-muted-foreground">Loading details...</p>}
                        <div>
                            <Label className="text-sm font-medium">Code</Label>
                            <Input
                                value={form.code}
                                onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                                placeholder="BD"
                                required
                                className="uppercase"
                            />
                        </div>
                        <div>
                            <Label className="text-sm font-medium">Name</Label>
                            <Input
                                value={form.name}
                                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                placeholder="Business Planning & Development"
                                required
                            />
                        </div>
                        <div>
                            <Label className="text-sm font-medium">RAMCO Name</Label>
                            <Input
                                value={form.ramco_name}
                                onChange={e => setForm(f => ({ ...f, ramco_name: e.target.value }))}
                                placeholder="Business Planning&Development"
                            />
                        </div>
                        <div>
                            <Label className="text-sm font-medium">Description (Malay)</Label>
                            <Textarea
                                value={form.dept_desc_malay}
                                onChange={e => setForm(f => ({ ...f, dept_desc_malay: e.target.value }))}
                                placeholder="Perancangan & Pembangunan Perniagaan"
                                rows={2}
                            />
                        </div>
                        <div className="flex items-center justify-between rounded-md border px-3 py-2">
                            <div>
                                <p className="text-sm font-medium">Status</p>
                                <p className="text-xs text-muted-foreground">Toggle to set active/inactive</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Switch
                                    checked={form.status}
                                    onCheckedChange={(checked) => setForm(f => ({ ...f, status: checked }))}
                                    id="dept-status"
                                />
                                <Label htmlFor="dept-status" className="text-sm">{form.status ? "Active" : "Inactive"}</Label>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" type="button" onClick={() => { setSidebarOpen(false); setEditingId(null); setForm(emptyForm); }}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={submitting}>
                                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                {editingId ? "Update" : "Save"}
                            </Button>
                        </div>
                    </form>
                }
            />
        </div>
    );
};

export default OrgDept;
