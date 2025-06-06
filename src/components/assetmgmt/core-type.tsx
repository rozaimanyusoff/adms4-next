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
import { toast } from "sonner";

interface Type {
    id: number;
    code: string;
    name: string;
    description: string;
}

const CoreType: React.FC = () => {
    const [data, setData] = useState<Type[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState<Partial<Type & { image?: string }>>({ name: "", description: "" });

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
            const payload = {
                code: formData.code,
                name: formData.name,
                description: formData.description,
                image: formData.image,
            };
            if (formData.id) {
                await authenticatedApi.put(`/api/assets/types/${formData.id}`, payload);
                toast.success("Type updated successfully");
            } else {
                await authenticatedApi.post("/api/assets/types", payload);
                toast.success("Type created successfully");
            }
            fetchData();
            setIsModalOpen(false);
            setFormData({ name: "", description: "", image: "" });
        } catch (error) {
            toast.error("Error submitting form");
            console.error("Error submitting form:", error);
        }
    };

    const columns: ColumnDef<Type>[] = [
        { key: "id" as keyof Type, header: "ID" },
        { key: "code" as keyof Type, header: "Code" },
        { key: "name" as keyof Type, header: "Name" },
        { key: "description" as keyof Type, header: "Description" },
        {
            key: "actions" as keyof Type, // Added key property
            header: "Actions",
            render: (row: Type) => (
                <span
                    role="button"
                    tabIndex={0}
                    aria-label="Edit Type"
                    onClick={() => {
                        setFormData(row);
                        setIsModalOpen(true);
                    }}
                    className="inline-flex items-center justify-center p-1 rounded hover:bg-yellow-100 cursor-pointer text-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    onKeyDown={e => {
                        if (e.key === "Enter" || e.key === " ") {
                            setFormData(row);
                            setIsModalOpen(true);
                        }
                    }}
                >
                    <Pencil size={20} />
                </span>
            ),
        },
    ];

    return (
        <div className="p-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold mb-4">Asset Type Maintenance</h2>
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
                        <div className="mb-4">
                            <Label htmlFor="code" className="block text-sm font-medium text-gray-700">
                                Code
                            </Label>
                            <Input
                                id="code"
                                value={formData.code || ""}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                    setFormData({ ...formData, code: e.target.value })
                                }
                                required
                            />
                        </div>
                        <div className="mb-4">
                            <Label htmlFor="image" className="block text-sm font-medium text-gray-700">
                                Image
                            </Label>
                            <Input
                                id="image"
                                type="file"
                                accept="image/*"
                                onChange={e => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        const reader = new FileReader();
                                        reader.onload = ev => {
                                            setFormData({ ...formData, image: typeof ev.target?.result === 'string' ? ev.target.result : undefined });
                                        };
                                        reader.readAsDataURL(file);
                                    }
                                }}
                            />
                            {formData.image && (
                                <img src={formData.image} alt="Preview" className="h-16 mt-2 rounded border" />
                            )}
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