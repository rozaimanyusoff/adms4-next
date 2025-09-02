"use client";

import React, { useEffect, useState, useMemo } from "react";
// simple table - no datagrid dependency
import { authenticatedApi } from "@/config/api";
import { Plus, Pencil, Trash } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface ModuleItem {
    id?: number | string;
    name: string;
    description?: string;
}

const MgmtModule: React.FC = () => {
    const [data, setData] = useState<ModuleItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(false);
    const [formData, setFormData] = useState<Partial<ModuleItem>>({ name: "", description: "" });

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await authenticatedApi.get<any>("/api/users/modules");
            const items = Array.isArray(res.data) ? res.data : (res.data && res.data.data ? res.data.data : []);
            setData(items);
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
                await authenticatedApi.put(`/api/users/modules/${formData.id}`, { name: formData.name, description: formData.description });
            } else {
                await authenticatedApi.post(`/api/users/modules`, { name: formData.name, description: formData.description });
            }
            setIsOpen(false);
            setFormData({ name: "", description: "" });
            fetchData();
        } catch (error) {
            // silent for now
        }
    };

    const handleDelete = async (row: ModuleItem) => {
        if (!row.id) return;
        if (!confirm(`Delete module "${row.name}"?`)) return;
        try {
            await authenticatedApi.delete(`/api/users/modules/${row.id}`);
            fetchData();
        } catch (error) {
            // ignore
        }
    };

    // simple table will be rendered instead of datagrid

    return (
        <div className="p-4">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Module Management</h2>
                <Button onClick={() => { setFormData({ name: "", description: "" }); setIsOpen(true); }} className="bg-blue-600 hover:bg-blue-700">
                    <Plus size={18} />
                </Button>
            </div>

            {loading ? (
                <p>Loading...</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full bg-white">
                        <thead>
                            <tr>
                                <th className="px-4 py-2 text-left">ID</th>
                                <th className="px-4 py-2 text-left">Name</th>
                                <th className="px-4 py-2 text-left">Description</th>
                                <th className="px-4 py-2 text-left">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((row) => (
                                <tr key={String(row.id)} className="hover:bg-gray-50">
                                    <td className="border-t px-4 py-2">{row.id}</td>
                                    <td className="border-t px-4 py-2">{row.name}</td>
                                    <td className="border-t px-4 py-2">{row.description || "-"}</td>
                                    <td className="border-t px-4 py-2">
                                        <div className="flex gap-2">
                                            <Button size="sm" variant="ghost" onClick={() => { setFormData(row); setIsOpen(true); }}>
                                                <Pencil size={16} />
                                            </Button>
                                            <Button size="sm" variant="destructive" onClick={() => handleDelete(row)}>
                                                <Trash size={16} />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{formData.id ? "Update Module" : "Create Module"}</DialogTitle>
                        <DialogDescription>Provide module details</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={e => { e.preventDefault(); handleSubmit(); }}>
                        <div className="mb-3">
                            <Label htmlFor="name">Name</Label>
                            <Input id="name" value={formData.name || ""} onChange={e => setFormData(f => ({ ...f, name: e.target.value }))} required className="mt-1" />
                        </div>
                        <div className="mb-3">
                            <Label htmlFor="description">Description</Label>
                            <Textarea id="description" value={formData.description || ""} onChange={e => setFormData(f => ({ ...f, description: (e.target as HTMLTextAreaElement).value }))} className="mt-1" />
                        </div>
                        <div className="flex justify-end gap-2 mt-4">
                            <Button type="button" variant="secondary" onClick={() => setIsOpen(false)}>Cancel</Button>
                            <Button type="submit">Save</Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default MgmtModule;
