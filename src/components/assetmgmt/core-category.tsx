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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";


interface Category {
    id: number;
    name: string;
    description: string;
    image: string;
    type: {
        id: number;
        name: string;
    };
}

interface Type {
    id: number;
    name: string;
}

const CoreCategory: React.FC = () => {
    const [data, setData] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState<Partial<Category & { typeId: number }>>({ name: "", description: "", typeId: 0 });
    const [types, setTypes] = useState<Type[]>([]);
    const [searchTerm, setSearchTerm] = useState("");

    const fetchData = async () => {
        try {
            const [categoriesResponse, typesResponse] = await Promise.all([
                authenticatedApi.get<{ data: Category[] }>('/api/assets/categories'),
                authenticatedApi.get<any>('/api/assets/types'),
            ]);
            setData(categoriesResponse.data.data || []); // Extract the `data` array
            setTypes(Array.isArray(typesResponse.data) ? typesResponse.data : (typesResponse.data && typesResponse.data.data ? typesResponse.data.data : []));
        } catch (error) {
            setData([]); // Ensure data is always an array
            setTypes([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        console.log("Data state:", data);
    }, [data]);

    const handleSubmit = async () => {
        try {
            const payload = {
                name: formData.name,
                description: formData.description,
                image: formData.image,
                typeId: formData.typeId,
            };
            if (formData.id) {
                await authenticatedApi.put(`/api/assets/categories/${formData.id}`, payload);
            } else {
                await authenticatedApi.post("/api/assets/categories", payload);
            }
            fetchData();
            setIsModalOpen(false);
            setFormData({ name: "", description: "", typeId: 0 });
        } catch (error) {
            console.error("Error submitting form:", error);
        }
    };

    const columns: ColumnDef<Category>[] = [
        { key: "id" as keyof Category, header: "ID" },
        { key: "name" as keyof Category, header: "Name" },
        { key: "description" as keyof Category, header: "Description" },
        {
            key: "image" as keyof Category,
            header: "Image",
            render: (row: Category) => row.image ? <img src={row.image} alt={row.name} className="h-10 w-10 object-cover" /> : <span className="text-gray-500">No Image</span>,
        },
        {
            key: "type.name" as any,
            header: "Type",
            render: (row: Category) => (row.type ? row.type.name : <span className="text-gray-500">N/A</span>),
        },
        {
            key: "actions" as any as keyof Category,
            header: "Actions",
            render: (row: Category) => (
                <Button
                size="sm"
                    variant="ghost"
                    onClick={() => {
                        setFormData({ ...row, typeId: row.type?.id || 0 });
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
                <h2 className="text-xl font-bold mb-4">Categories</h2>
                <Button onClick={() => setIsModalOpen(true)} className="mb-4 bg-blue-600 hover:bg-blue-700">
                    <Plus size={22} />
                </Button>
            </div>

            {loading ? (
                <p>Loading...</p>
            ) : (
                <CustomDataGrid columns={columns} data={Array.isArray(data) ? data : []} />
            )}

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{formData.id ? "Update Category" : "Create Category"}</DialogTitle>
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
                            <Label htmlFor="type" className="block text-sm font-medium text-gray-700">
                                Type
                            </Label>
                            <Select
                                value={formData.typeId?.toString() || ""}
                                onValueChange={(value) => setFormData({ ...formData, typeId: parseInt(value, 10) })}
                            >
                                <SelectTrigger id="type" className="w-full">
                                    <SelectValue placeholder="Select a type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        <SelectLabel>Types</SelectLabel>
                                        {types.map((type) => (
                                            <SelectItem key={type.id} value={type.id.toString()}>
                                                {type.name}
                                            </SelectItem>
                                        ))}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
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

export default CoreCategory;