"use client";

import React, { useEffect, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface Type {
    id: number;
    name: string;
    description: string;
}

const CoreType: React.FC = () => {
    const [data, setData] = useState<Type[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState<Partial<Type>>({ name: "", description: "" });

    const fetchData = async () => {
        try {
            const response = await authenticatedApi.get<any>("/api/assets/types");
            setData(Array.isArray(response.data) ? response.data : (response.data && response.data.data ? response.data.data : []));
        } catch (error) {
            console.error("Error fetching types data:", error);
            setData([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSubmit = async () => {
        try {
            if (formData.id) {
                // Update existing entry
                await authenticatedApi.put(`/api/assets/types/${formData.id}`, formData);
            } else {
                // Create new entry
                await authenticatedApi.post("/api/assets/types", formData);
            }
            fetchData(); // Refresh data grid
            setIsModalOpen(false);
            setFormData({ name: "", description: "" });
        } catch (error) {
            console.error("Error submitting form:", error);
        }
    };

    const columns: ColumnDef<Type>[] = [
        { key: "id" as keyof Type, header: "ID" },
        { key: "name" as keyof Type, header: "Name" },
        { key: "description" as keyof Type, header: "Description" },
        {
            key: "actions" as keyof Type, // Added key property
            header: "Actions",
            render: (row: Type) => (
                <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                        setFormData(row);
                        setIsModalOpen(true);
                    }}
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
                <h2 className="text-xl font-bold mb-4">Types</h2>
                <Button onClick={() => setIsModalOpen(true)} className="mb-4 bg-blue-600 hover:bg-blue-700">
                    <Plus size={22} />
                </Button>
            </div>

            {loading ? (
                <p>Loading...</p>
            ) : (
                <CustomDataGrid columns={columns} data={data} />
            )}

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{formData.id ? "Update Type" : "Create Type"}</DialogTitle>
                        <DialogDescription>Fill in the details below:</DialogDescription>
                    </DialogHeader>
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            handleSubmit();
                        }}
                    >
                        <div className="mb-4">
                            <Label htmlFor="name" className="block text-sm font-medium text-gray-700">
                                Name
                            </Label>
                            <Input
                                id="name"
                                className="capitalize"
                                value={formData.name || ""}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                    setFormData({ ...formData, name: e.target.value })
                                }
                                required
                            />
                        </div>
                        <div className="mb-4">
                            <Label htmlFor="description" className="block text-sm font-medium text-gray-700">
                                Description
                            </Label>
                            <Input
                                id="description"
                                value={formData.description || ""}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                    setFormData({ ...formData, description: e.target.value })
                                }
                                required
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

export default CoreType;