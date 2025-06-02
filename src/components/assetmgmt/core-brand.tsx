"use client";

import React, { useEffect, useState } from "react";
import { CustomDataGrid } from "@components/ui/DataGrid";
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

interface Brand {
    id: number;
    name: string;
    description: string;
    image?: string;
    type?: { id: number; name: string };
    category?: { id: number; name: string };
}

interface Type { id: number; name: string; }
interface Category { id: number; name: string; }

const CoreBrand: React.FC = () => {
    const [data, setData] = useState<Brand[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState<any>({ name: "", description: "", image: "", typeId: 0, categoryId: 0 });
    const [types, setTypes] = useState<Type[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);

    const fetchData = async () => {
        try {
            const [brandsRes, typesRes, categoriesRes] = await Promise.all([
                authenticatedApi.get<{ data: Brand[] }>("/api/assets/brands"),
                authenticatedApi.get<any>("/api/assets/types"),
                authenticatedApi.get<any>("/api/assets/categories"),
            ]);
            setData(brandsRes.data.data || []);
            setTypes(Array.isArray(typesRes.data) ? typesRes.data : (typesRes.data && typesRes.data.data ? typesRes.data.data : []));
            setCategories(Array.isArray(categoriesRes.data) ? categoriesRes.data : (categoriesRes.data && categoriesRes.data.data ? categoriesRes.data.data : []));
        } catch (error) {
            console.error("Error fetching brands/types/categories:", error);
            setData([]); setTypes([]); setCategories([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const handleSubmit = async () => {
        try {
            const payload = {
                name: formData.name,
                description: formData.description,
                image: formData.image,
                type_id: formData.typeId,
                category_id: formData.categoryId,
            };
            if (formData.id) {
                await authenticatedApi.put(`/api/assets/brands/${formData.id}`, payload);
            } else {
                await authenticatedApi.post("/api/assets/brands", payload);
            }
            fetchData();
            setIsModalOpen(false);
            setFormData({ name: "", description: "", image: "", typeId: 0, categoryId: 0 });
        } catch (error) {
            console.error("Error submitting form:", error);
        }
    };

    const columns = [
        { key: "id" as keyof Brand, header: "ID" },
        { key: "name" as keyof Brand, header: "Name" },
        { key: "description" as keyof Brand, header: "Description" },
        { key: "image" as keyof Brand, header: "Image", render: (row: Brand) => row.image ? <img src={row.image} alt={row.name} className="h-10 w-10 object-cover" /> : <span className="text-gray-500">No Image</span> },
        { key: "type" as keyof Brand, header: "Type", render: (row: Brand) => row.type?.name || <span className="text-gray-500">N/A</span> },
        { key: "category" as keyof Brand, header: "Category", render: (row: Brand) => row.category?.name || <span className="text-gray-500">N/A</span> },
        {
            key: "actions" as keyof Brand,
            header: "Actions",
            render: (row: Brand) => (
                <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                        setFormData({
                            ...row,
                            image: row.image || "",
                            typeId: row.type?.id || 0,
                            categoryId: row.category?.id || 0,
                        });
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
                <h2 className="text-xl font-bold mb-4">Brands</h2>
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
                        <DialogTitle>{formData.id ? "Update Brand" : "Create Brand"}</DialogTitle>
                        <DialogDescription>Fill in the details below:</DialogDescription>
                    </DialogHeader>
                    <form
                        onSubmit={e => {
                            e.preventDefault();
                            handleSubmit();
                        }}
                    >
                        <div className="mb-4">
                            <Label htmlFor="name" className="block text-sm font-medium text-gray-700">Name</Label>
                            <Input id="name" value={formData.name || ""} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                        </div>
                        <div className="mb-4">
                            <Label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</Label>
                            <Input id="description" value={formData.description || ""} onChange={e => setFormData({ ...formData, description: e.target.value })} required />
                        </div>
                        <div className="mb-4">
                            <Label htmlFor="image" className="block text-sm font-medium text-gray-700">Image URL</Label>
                            <Input id="image" value={formData.image || ""} onChange={e => setFormData({ ...formData, image: e.target.value })} />
                        </div>
                        <div className="mb-4">
                            <Label htmlFor="type" className="block text-sm font-medium text-gray-700">Type</Label>
                            <Select
                                value={formData.typeId ? String(formData.typeId) : ""}
                                onValueChange={value => setFormData({ ...formData, typeId: Number(value) })}
                            >
                                <SelectTrigger id="type" className="w-full">
                                    <SelectValue placeholder="Select Type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        <SelectLabel>Types</SelectLabel>
                                        {types.map(type => (
                                            <SelectItem key={type.id} value={String(type.id)}>{type.name}</SelectItem>
                                        ))}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="mb-4">
                            <Label htmlFor="category" className="block text-sm font-medium text-gray-700">Category</Label>
                            <Select
                                value={formData.categoryId ? String(formData.categoryId) : ""}
                                onValueChange={value => setFormData({ ...formData, categoryId: Number(value) })}
                            >
                                <SelectTrigger id="category" className="w-full">
                                    <SelectValue placeholder="Select Category" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        <SelectLabel>Categories</SelectLabel>
                                        {categories.map(cat => (
                                            <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>
                                        ))}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                        </div>
                        <Button type="submit" className="mt-4">Submit</Button>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default CoreBrand;