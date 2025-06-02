"use client";

import React, { useEffect, useState, useMemo } from "react";
import { CustomDataGrid, ColumnDef } from "@components/ui/DataGrid";
import { authenticatedApi } from "../../config/api";
import { Plus, Pencil } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@components/ui/input";
import { Button } from "@components/ui/button";
import { Label } from "@/components/ui/label";

interface Module {
    id: number;
    name: string;
    code: string;
    created_at?: string;
}

const SiteModule: React.FC = () => {
    const [data, setData] = useState<Module[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState<Partial<Module>>({ name: "", code: "" });

    const fetchData = async () => {
        try {
            const res = await authenticatedApi.get<any>("/api/assets/modules");
            setData(Array.isArray(res.data) ? res.data : (res.data && res.data.data ? res.data.data : []));
        } catch (error) {
            setData([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const handleSubmit = async () => {
        try {
            if (formData.id) {
                await authenticatedApi.put(`/api/assets/modules/${formData.id}`, { name: formData.name, code: formData.code });
            } else {
                await authenticatedApi.post("/api/assets/modules", { name: formData.name, code: formData.code });
            }
            fetchData();
            setIsModalOpen(false);
            setFormData({ name: "", code: "" });
        } catch (error) { }
    };

    const columns: ColumnDef<Module>[] = useMemo(() => [
        { key: "id", header: "ID", sortable: true },
        { key: "name", header: "Name", sortable: true },
        { key: "code", header: "Code", sortable: true },
        {
            key: "created_at",
            header: "Created At",
            render: (row: Module) => row.created_at ? new Date(row.created_at).toLocaleString() : "-",
        },
        {
            key: "actions" as keyof Module,
            header: "Actions",
            render: (row: Module) => (
                <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => { setFormData(row); setIsModalOpen(true); }}
                    className="bg-yellow-500 hover:bg-yellow-600"
                >
                    <Pencil size={20} />
                </Button>
            ),
        },
    ], []);

    return (
        <div className="p-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold mb-4">Modules</h2>
                <Button onClick={() => setIsModalOpen(true)} className="mb-4 bg-blue-600 hover:bg-blue-700">
                    <Plus size={22} />
                </Button>
            </div>
            {loading ? <p>Loading...</p> : <CustomDataGrid columns={columns} data={data} />}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{formData.id ? "Update Module" : "Create Module"}</DialogTitle>
                        <DialogDescription>Fill in the details below:</DialogDescription>
                    </DialogHeader>
                    <form
                        onSubmit={e => { e.preventDefault(); handleSubmit(); }}
                    >
                        <div className="mb-4">
                            <Label htmlFor="name" className="block text-sm font-medium text-gray-700">Name</Label>
                            <Input
                                id="name"
                                value={formData.name || ""}
                                onChange={e => setFormData(f => ({ ...f, name: e.target.value }))}
                                required
                                className="mt-1"
                            />
                        </div>
                        <div className="mb-4">
                            <Label htmlFor="code" className="block text-sm font-medium text-gray-700">Code</Label>
                            <Input
                                id="code"
                                value={formData.code || ""}
                                onChange={e => setFormData(f => ({ ...f, code: e.target.value }))}
                                required
                                className="mt-1"
                            />
                        </div>
                        <Button type="submit" className="mt-4">
                            Submit
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default SiteModule;
