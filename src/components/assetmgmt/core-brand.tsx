"use client";

import React, { useEffect, useState } from "react";
import { ColumnDef, CustomDataGrid } from "@components/ui/DataGrid";
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
import { Checkbox } from "@/components/ui/checkbox";
import { MultiSelect, SingleSelect, type ComboboxOption } from "@/components/ui/combobox";
import { toast } from "sonner";

interface Brand {
    id: number;
    name: string;
    code: string;
    logo?: string;
    image?: string;
    type?: Type;
    categories: Category[];
}

interface Type { id: number; name: string; code: string; description?: string; image?: string | null; }
interface Category { id: number; name: string; code: string; }

const CoreBrand: React.FC = () => {
    const [data, setData] = useState<Brand[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState<any>({ name: "", logo: "", typeId: 0, categoryId: 0 });
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
            const isUpdate = !!formData.id;
            const payload: any = {
                name: formData.name,
                code: formData.code,
                logo: formData.logo,
                type_code: formData.type_code, // always code, not name
                category_codes: Array.isArray(formData.categoryCodes)
                    ? formData.categoryCodes
                    : (formData.categories ? formData.categories.map((c: Category) => c.code) : []),
            };
            let brandId = formData.id;
            let brandCode = formData.code;
            if (isUpdate) {
                await authenticatedApi.put(`/api/assets/brands/${formData.id}`, payload);
                toast.success("Brand updated successfully");
            } else {
                const res = await authenticatedApi.post("/api/assets/brands", payload);
                const resData = res.data as any;
                brandId = resData?.id;
                brandCode = resData?.code;
                toast.success("Brand created successfully");
            }
            // Update brand-category mappings if needed
            if (brandCode && Array.isArray(formData.categoryCodes)) {
                const current = data.find(b => b.code === brandCode)?.categories?.map(c => c.code) || [];
                const toAssign = formData.categoryCodes.filter((c: string) => !current.includes(c));
                const toUnassign = current.filter((c: string) => !formData.categoryCodes.includes(c));
                for (const code of toAssign) {
                    try {
                        await authenticatedApi.post(`/api/assets/brands/${brandCode}/categories/${code}`);
                        toast.success(`Assigned category: ${code}`);
                    } catch (err) {
                        toast.error(`Failed to assign category: ${code}`);
                    }
                }
                for (const code of toUnassign) {
                    try {
                        await authenticatedApi.delete(`/api/assets/brands/${brandCode}/categories/${code}`);
                        toast.success(`Unassigned category: ${code}`);
                    } catch (err) {
                        toast.error(`Failed to unassign category: ${code}`);
                    }
                }
            }
            fetchData();
            setIsModalOpen(false);
            setFormData({ name: "", logo: "", type_code: "", categoryCodes: [] });
        } catch (error) {
            toast.error("Error submitting form");
            console.error("Error submitting form:", error);
        }
    };

    const columns: ColumnDef<Brand>[] = [
        { key: "id" as keyof Brand, header: "ID" },
        { key: "code" as keyof Brand, header: "Code" },
        { key: "name" as keyof Brand, header: "Name", filter: 'input' },
        { key: "logo" as keyof Brand, header: "Logo", render: (row: Brand) => {
            const imgSrc = row.logo || row.image;
            if (imgSrc) {
                // If path is relative, prepend base URL (optional, adjust as needed)
                const src = imgSrc.startsWith("http") ? imgSrc : `${process.env.NEXT_PUBLIC_API_BASE_URL || ""}${imgSrc}`;
                return <img src={src} alt={row.name} className="h-10 w-10 object-cover" />;
            }
            return <span className="text-gray-500">No Logo</span>;
        }},
        { key: "type" as keyof Brand, header: "Type", render: (row: Brand) => {
            // Prefer row.type.name, else map type_code to types
            if (row.type?.name) return (
                <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                    {row.type.name}
                </span>
            );
            if ((row as any).type_code) {
                const found = types.find(t => t.code === (row as any).type_code);
                return found ? (
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                        {found.name}
                    </span>
                ) : (
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                        {(row as any).type_code}
                    </span>
                );
            }
            return <span className="text-gray-500">N/A</span>;
        }, filter: 'singleSelect' },
        {
            key: "categories" as keyof Brand,
            header: "Categories",
            render: (row: Brand) => {
                const totalCategories = categories.length;
                const checkedCount = row.categories?.length || 0;
                
                return (
                    <div className="flex items-center justify-center">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                            {checkedCount} / {totalCategories}
                        </span>
                    </div>
                );
            },
        },
        {
            key: "actions" as keyof Brand,
            header: "Actions",
            render: (row: Brand) => (
                <Pencil
                    className="inline-flex items-center justify-center rounded hover:bg-yellow-100 cursor-pointer text-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    tabIndex={0}
                    role="button"
                    aria-label="Edit Brand"
                    onClick={() => {
                        setFormData({
                            ...row,
                            code: row.code,
                            logo: row.logo || row.image || "",
                            type_code: row.type?.code || "",
                            categoryCodes: row.categories ? row.categories.map(c => c.code) : [],
                        });
                        setIsModalOpen(true);
                    }}
                    onKeyDown={e => {
                        if (e.key === "Enter" || e.key === " ") {
                            setFormData({
                                ...row,
                                code: row.code,
                                logo: row.logo || row.image || "",
                                type_code: row.type?.code || "",
                                categoryCodes: row.categories ? row.categories.map(c => c.code) : [],
                            });
                            setIsModalOpen(true);
                        }
                    }}
                />
            ),
        },
    ];

    return (
        <div className="mt-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold mb-4">Brand Maintenance</h2>
                <Button onClick={() => {
                    // Find the highest code value (as number)
                    const maxCode = data.reduce((max, b) => {
                        const codeNum = parseInt(b.code, 10);
                        return !isNaN(codeNum) && codeNum > max ? codeNum : max;
                    }, 0);
                    setFormData({
                        name: "",
                        code: (maxCode + 1).toString(),
                        logo: "",
                        type_code: "",
                        categoryCodes: [],
                    });
                    setIsModalOpen(true);
                }} className="mb-4 bg-blue-600 hover:bg-blue-700">
                    <Plus size={22} />
                </Button>
            </div>
            {loading ? (
                <p>Loading...</p>
            ) : (
                <CustomDataGrid columns={columns} data={data} inputFilter={false} />
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
                            <Label htmlFor="code">Code</Label>
                            <Input id="code" value={formData.code || ""} onChange={e => setFormData({ ...formData, code: e.target.value })} required />
                        </div>
                        <div className="mb-4">
                            <Label htmlFor="name">Name</Label>
                            <Input id="name" value={formData.name || ""} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                        </div>
                        <div className="mb-4">
                            <Label htmlFor="logo">Logo</Label>
                            <Input
                                id="logo"
                                type="file"
                                accept="image/*"
                                onChange={e => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        const reader = new FileReader();
                                        reader.onload = ev => {
                                            setFormData({ ...formData, logo: ev.target?.result });
                                        };
                                        reader.readAsDataURL(file);
                                    }
                                }}
                            />
                            {(formData.logo || formData.image) && (
                                <img src={(formData.logo || formData.image).startsWith("http") ? (formData.logo || formData.image) : `${process.env.NEXT_PUBLIC_API_BASE_URL || ""}${formData.logo || formData.image}`}
                                    alt="Logo preview" className="h-16 mt-2 rounded border" />
                            )}
                        </div>
                        <div className="mb-4">
                            <Label htmlFor="type">Type</Label>
                            <SingleSelect
                                options={types.map(type => ({
                                    value: type.code,
                                    label: type.name
                                }))}
                                value={formData.type_code || ""}
                                onValueChange={(value) => setFormData({ ...formData, type_code: value })}
                                placeholder="Select type..."
                                searchPlaceholder="Search types..."
                                clearable
                                className="w-full"
                            />
                        </div>
                        <div className="mb-4">
                            <Label>Categories</Label>
                            <MultiSelect
                                options={categories.map(cat => ({
                                    value: cat.code,
                                    label: cat.name
                                }))}
                                value={Array.isArray(formData.categoryCodes) 
                                    ? formData.categoryCodes 
                                    : (formData.categories ? formData.categories.map((c: Category) => c.code) : [])
                                }
                                onValueChange={(selectedCodes) => {
                                    setFormData({ ...formData, categoryCodes: selectedCodes });
                                }}
                                placeholder="Select categories..."
                                searchPlaceholder="Search categories..."
                                clearable
                                className="w-full"
                            />
                        </div>
                        <Button type="submit" className="mt-4">Submit</Button>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default CoreBrand;