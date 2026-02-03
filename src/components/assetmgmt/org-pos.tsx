import React, { useEffect, useState } from "react";
import { CustomDataGrid, ColumnDef } from "@components/ui/DataGrid";
import { authenticatedApi } from "../../config/api";
import { Plus, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import ActionSidebar from "@components/ui/action-aside";
import { toast } from "sonner";

interface Position {
    id: number;
    name: string;
    ramco_name?: string | null;
    status?: number | boolean;
}

const OrgPos: React.FC = () => {
    const [data, setData] = useState<Position[]>([]);
    const [loading, setLoading] = useState(true);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const emptyForm = { name: "", ramco_name: "", status: true };
    const [form, setForm] = useState<typeof emptyForm>(emptyForm);

    const fetchData = async () => {
        try {
            const res = await authenticatedApi.get<any>("/api/assets/positions");
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
        if (!form.name) {
            toast.error("Name is required");
            return;
        }

        const payload = {
            name: form.name || null,
            ramco_name: form.ramco_name || null,
            status: form.status ? 1 : 0,
        };
        try {
            setSubmitting(true);
            if (editingId) {
                await authenticatedApi.put(`/api/assets/positions/${editingId}`, payload);
                toast.success("Position updated");
            } else {
                await authenticatedApi.post("/api/assets/positions", payload);
                toast.success("Position created");
            }
            fetchData();
            setSidebarOpen(false);
            setEditingId(null);
            setForm(emptyForm);
        } catch (error: any) {
            toast.error(error?.response?.data?.message || "Failed to save position");
        } finally {
            setSubmitting(false);
        }
    };

    const columns: ColumnDef<Position>[] = [
        { key: "id" as keyof Position, header: "ID" },
        { key: "name" as keyof Position, header: "Name", filter: "input" },
        { key: "ramco_name" as keyof Position, header: "RAMCO Name", filter: "input" },
        { key: "status" as keyof Position, header: "Status", render: (row) => (Number(row.status) === 1 ? "Active" : "Inactive"), filter: "singleSelect" },
    ];

    const openEdit = async (row: Position) => {
        if (!row.id) return;
        setDetailLoading(true);
        setSidebarOpen(true);
        setEditingId(String(row.id));
        try {
            const res = await authenticatedApi.get<any>(`/api/assets/positions/${row.id}`);
            const pos = res.data?.data || res.data || {};
            setForm({
                name: pos.name || "",
                ramco_name: pos.ramco_name || "",
                status: (pos.status ?? pos.is_active ?? 1) === 1,
            });
        } catch (error: any) {
            toast.error(error?.response?.data?.message || "Failed to load position");
        } finally {
            setDetailLoading(false);
        }
    };

    return (
        <div className="p-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold mb-4">Positions</h2>
                <Button onClick={() => { setSidebarOpen(true); setEditingId(null); setForm(emptyForm); }} className="mb-4 bg-blue-600 hover:bg-blue-700">
                    <Plus size={22} />
                </Button>
            </div>
            {loading ? <p>Loading...</p> :
                <CustomDataGrid
                    columns={columns}
                    data={data}
                    pagination={false}
                    inputFilter={false}
                    onRowDoubleClick={(row: Position) => openEdit(row)}
                />}
            <ActionSidebar
                size="sm"
                title={editingId ? "Edit Position" : "Create Position"}
                isOpen={sidebarOpen}
                onClose={() => { setSidebarOpen(false); setEditingId(null); setForm(emptyForm); }}
                content={
                    <form className="space-y-4" onSubmit={handleSubmit}>
                        {detailLoading && <p className="text-sm text-muted-foreground">Loading details...</p>}
                        <div>
                            <Label className="text-sm font-medium">Name</Label>
                            <Input
                                value={form.name}
                                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                placeholder="e.g. Operations Manager"
                                required
                            />
                        </div>
                        <div>
                            <Label className="text-sm font-medium">RAMCO Name</Label>
                            <Input
                                value={form.ramco_name}
                                onChange={e => setForm(f => ({ ...f, ramco_name: e.target.value }))}
                                placeholder="Chief Executive Officer"
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
                                    id="pos-status"
                                />
                                <Label htmlFor="pos-status" className="text-sm">{form.status ? "Active" : "Inactive"}</Label>
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

export default OrgPos;
