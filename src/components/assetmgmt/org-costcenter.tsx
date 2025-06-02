"use client";

import React, { useEffect, useState } from "react";
import { CustomDataGrid } from "@components/ui/DataGrid";
import { authenticatedApi } from "../../config/api";
import { Plus, Pencil } from "lucide-react";
import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface CostCenter {
    id: number;
    name: string;
    description?: string;
}

const OrgCostCenter: React.FC = () => {
    const [data, setData] = useState<CostCenter[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState<Partial<CostCenter>>({ name: "", description: "" });

    const fetchData = async () => {
        try {
            const res = await authenticatedApi.get<any>("/api/assets/costcenters");
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
                await authenticatedApi.put(`/api/assets/costcenters/${formData.id}`, formData);
            } else {
                await authenticatedApi.post("/api/assets/costcenters", formData);
            }
            fetchData();
            setIsModalOpen(false);
            setFormData({ name: "", description: "" });
        } catch (error) { }
    };

    const columns = [
        { key: "id" as keyof CostCenter, header: "ID" },
        { key: "name" as keyof CostCenter, header: "Code" },
        { key: "description" as keyof CostCenter, header: "Description" },
        {
            key: "actions" as keyof CostCenter,
            header: "Actions",
            render: (row: CostCenter) => (
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
    ];

    return (
        <div className="p-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold mb-4">Cost Centers</h2>
                <Button onClick={() => setIsModalOpen(true)} className="mb-4 bg-blue-600 hover:bg-blue-700">
                    <Plus size={22} />
                </Button>
            </div>
            {loading ? <p>Loading...</p> : <CustomDataGrid columns={columns} data={data} />}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{formData.id ? "Update Cost Center" : "Create Cost Center"}</DialogTitle>
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
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </div>
                        <div className="mb-4">
                            <Label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</Label>
                            <Input
                                id="description"
                                value={formData.description || ""}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>
                        <Button type="submit" className="mt-4">Submit</Button>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default OrgCostCenter;
