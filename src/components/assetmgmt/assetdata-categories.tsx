"use client";

import React, { useEffect, useState, useMemo } from "react";
import { CustomDataGrid, ColumnDef } from "@components/ui/DataGrid";
import { authenticatedApi } from "../../config/api";
import { Plus, Pencil, Trash2 } from "lucide-react";
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
import { toast } from "sonner";


interface Category {
    id: number;
    name: string;
    image?: string;
    type_code?: string; // legacy support
    type_id?: number;   // preferred for write operations
    type?: {
        id: number;
        name: string;
    };
}

interface Type {
    id: number;
    name: string;
    code?: string;
}

const CoreCategory: React.FC = () => {
    const [data, setData] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState<Partial<Category & { type_id: number }>>({ name: "" });
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
                // image intentionally omitted from payload per new contract
                type_id: typeof formData.type_id === 'number' ? formData.type_id : undefined,
            } as { name?: string; type_id?: number };
            if (formData.id) {
                await authenticatedApi.put(`/api/assets/categories/${formData.id}`, payload);
                toast.success("Category updated successfully");
            } else {
                await authenticatedApi.post("/api/assets/categories", payload);
                toast.success("Category created successfully");
            }
            fetchData();
            setIsModalOpen(false);
            setFormData({ name: "" });
        } catch (error) {
            toast.error("Error submitting form");
            console.error("Error submitting form:", error);
        }
    };

    const handleDelete = async (id: number) => {
        try {
            const ok = typeof window !== 'undefined' ? window.confirm('Delete this category?') : true;
            if (!ok) return;
            await authenticatedApi.delete(`/api/assets/categories/${id}`);
            toast.success('Category deleted');
            fetchData();
        } catch (error) {
            toast.error('Error deleting category');
            console.error('Error deleting category:', error);
        }
    };

    const columns: ColumnDef<Category>[] = [
        { key: "id" as keyof Category, header: "ID" },
        { key: "name" as keyof Category, header: "Name" },
        {
            key: "image" as keyof Category,
            header: "Image",
            render: (row: Category) => row.image ? <img src={row.image} alt={row.name} className="h-10 w-10 object-cover" /> : <span className="text-gray-500">No Image</span>,
        },
        {
            key: "type" as any,
            header: "Type",
            render: (row: Category) => {
                const foundById = row.type?.id ? types.find(t => t.id === row.type!.id) : undefined;
                const foundByCode = row.type_code ? types.find(t => t.code === row.type_code) : undefined;
                const found = foundById || foundByCode;
                return found ? found.name : <span className="text-gray-500">N/A</span>;
            },
        },
        {
            key: "actions" as any as keyof Category,
            header: "Actions",
            render: (row: Category) => (
                <div className="flex items-center gap-2">
                    <Pencil
                        size={20}
                        className="inline-flex items-center justify-center rounded hover:bg-yellow-100 cursor-pointer text-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                        tabIndex={0}
                        role="button"
                        aria-label="Edit Category"
                    onClick={() => {
                        const inferredTypeId = row.type?.id ?? (row.type_code ? types.find(t => t.code === row.type_code)?.id : undefined);
                        setFormData({ ...row, type_id: inferredTypeId });
                        setIsModalOpen(true);
                    }}
                        onKeyDown={e => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                const inferredTypeId = row.type?.id ?? (row.type_code ? types.find(t => t.code === row.type_code)?.id : undefined);
                                setFormData({ ...row, type_id: inferredTypeId });
                                setIsModalOpen(true);
                            }
                        }}
                    />
                    <Trash2
                        size={20}
                        className="inline-flex items-center justify-center rounded hover:bg-red-100 cursor-pointer text-red-600 focus:outline-none focus:ring-2 focus:ring-red-400"
                        tabIndex={0}
                        role="button"
                        aria-label="Delete Category"
                        onClick={() => handleDelete(row.id)}
                        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') handleDelete(row.id); }}
                    />
                </div>
            ),
        },
    ];

    return (
        <div className="mt-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold mb-4">Category Maintenance</h2>
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
                        </div>
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
                        <div className="mb-4">
                            <Label htmlFor="type" className="block text-sm font-medium text-gray-700">
                                Type
                            </Label>
                            <Select
                                value={typeof formData.type_id === 'number' ? String(formData.type_id) : ""}
                                onValueChange={(value) => setFormData({ ...formData, type_id: Number(value) })}
                            >
                                <SelectTrigger id="type" className="w-full">
                                    <SelectValue placeholder="Select a type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        <SelectLabel>Types</SelectLabel>
                                        {types.map((type) => (
                                            <SelectItem key={type.id} value={String(type.id)}>
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
