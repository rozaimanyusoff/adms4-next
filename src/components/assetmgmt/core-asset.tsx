"use client";

import React, { useEffect, useState } from "react";
import { CustomDataGrid, ColumnDef } from "@components/ui/DataGrid";
import { authenticatedApi } from "../../config/api";
import { Plus, Pencil, BadgeInfo, InfoIcon } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@components/ui/input";
import { Button } from "@components/ui/button";
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

interface Brand { id: number; name: string; code: string; }
interface Category { id: number; name: string; code: string; }
interface Type { id: number; name: string; code: string; }

interface Asset {
    id: number;
    item_code: string;
    serial_number: string;
    finance_tag?: string | null;
    pc_hostname?: string | null;
    dop?: string | null;
    year?: string | null;
    unit_price?: number | string;
    depreciation_length?: number | string;
    cost_center?: string | null;
    type_code?: string;
    category_code?: string;
    brand_code?: string;
    model_code?: string;
    asses?: string;
    comment?: string | null;
    classification?: string; // <-- updated from 'type'
    category?: string;
    brand?: string;
    model?: string;
    status?: string;
    depreciation_rate?: number | string;
    warranty_period?: string;
}

const CoreAsset: React.FC = () => {
    const [data, setData] = useState<Asset[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [brands, setBrands] = useState<Brand[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [types, setTypes] = useState<Type[]>([]);
    const [formData, setFormData] = useState<Partial<Asset>>({
        item_code: "",
        serial_number: "",
        finance_tag: "",
        status: "",
        depreciation_rate: 0,
        warranty_period: "",
        type_code: "",
        category_code: "",
        brand_code: "",
        model_code: "",
        pc_hostname: "",
        dop: "",
        year: "",
        cost_center: "",
        asses: "",
        comment: "",
    });

    const fetchData = async () => {
        try {
            const [assetsRes, brandsRes, categoriesRes, typesRes] = await Promise.all([
                authenticatedApi.get<any>("/api/assets"),
                authenticatedApi.get<any>("/api/assets/brands"),
                authenticatedApi.get<any>("/api/assets/categories"),
                authenticatedApi.get<any>("/api/assets/types"),
            ]);
            // Map API data to grid data
            setData(
                (assetsRes.data.data || []).map((a: any) => ({
                    ...a,
                    brandName: a.brand || "N/A",
                    categoryName: a.category || "N/A",
                    typeName: a.type || "N/A",
                }))
            );
            setBrands(Array.isArray(brandsRes.data) ? brandsRes.data : (brandsRes.data && brandsRes.data.data ? brandsRes.data.data : []));
            setCategories(Array.isArray(categoriesRes.data) ? categoriesRes.data : (categoriesRes.data && categoriesRes.data.data ? categoriesRes.data.data : []));
            setTypes(Array.isArray(typesRes.data) ? typesRes.data : (typesRes.data && typesRes.data.data ? typesRes.data.data : []));
        } catch (error) {
            setData([]); setBrands([]); setCategories([]); setTypes([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const currentYear = new Date().getFullYear();

    // Flattened/derived fields for DataGrid search/sort
    // Calculate NBV (Netbook Value)
    // NBV = unit_price * (1 - (depreciation_rate/100) * min(age, depreciation_length))
    const transformedData = data.map(asset => {
        const age = asset.year ? currentYear - Number(asset.year) : 0;
        const unitPrice = typeof asset.unit_price === 'string' ? parseFloat(asset.unit_price) : asset.unit_price || 0;
        const depRate = typeof asset.depreciation_rate === 'string' ? parseFloat(asset.depreciation_rate) : asset.depreciation_rate || 0;
        const depLength = typeof asset.depreciation_length === 'string' ? parseFloat(asset.depreciation_length) : asset.depreciation_length || 0;
        const minAge = depLength > 0 ? Math.min(age, depLength) : age;
        const nbv = unitPrice * (1 - (depRate / 100) * minAge);
        // Format with thousands separator and 2 decimals
        const formatNumber = (val: number) => val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        return {
            ...asset,
            brandName: asset.brand_code || "N/A",
            category: categories.find(c => c.code === asset.category_code)?.name || asset.category_code || "N/A",
            classification: asset.classification || "N/A",
            age: asset.year ? age : "-",
            unit_price: isNaN(unitPrice) ? "-" : formatNumber(unitPrice),
            nbv: isNaN(nbv) ? "-" : nbv < 0 ? formatNumber(0) : formatNumber(nbv),
        };
    });

    const handleSubmit = async () => {
        try {
            const payload = {
                item_code: formData.item_code,
                serial_number: formData.serial_number,
                finance_tag: formData.finance_tag,
                status: formData.status,
                depreciation_rate: formData.depreciation_rate,
                warranty_period: formData.warranty_period,
                type_code: formData.type_code,
                category_code: formData.category_code,
                brand_code: formData.brand_code,
                model_code: formData.model_code,
                pc_hostname: formData.pc_hostname,
                dop: formData.dop,
                year: formData.year,
                cost_center: formData.cost_center,
                asses: formData.asses,
                comment: formData.comment,
            };
            if (formData.id) {
                await authenticatedApi.put(`/api/assets/${formData.id}`, payload);
            } else {
                await authenticatedApi.post("/api/assets", payload);
            }
            fetchData();
            setIsModalOpen(false);
            setFormData({});
        } catch (error) { }
    };

    const columns: ColumnDef<Asset & { age?: number | string; nbv?: string | number }>[] = [
        { key: "id", header: "ID", sortable: true },
        { key: "classification", header: "Classification", sortable: true, filter: 'singleSelect' },
        { key: "serial_number", header: "Serial Number", sortable: true, filter: 'input' },
        { key: "category", header: "Category", sortable: true, filter: 'singleSelect' },
        { key: "age", header: "Age", sortable: true, filter: 'input' },
        { key: "unit_price", header: "Asset Value", sortable: true, filter: 'input' },
        { key: "nbv", header: "NBV", sortable: true },
        { key: "status", header: "Status", sortable: true, filter: 'singleSelect' },
        {
            key: "actions" as keyof Asset,
            header: "Actions",
            render: (row: Asset) => (
                <span
                    role="button"
                    tabIndex={0}
                    aria-label="Edit Asset"
                    onClick={() => {
                        setFormData({
                            ...row,
                            brand_code: row.brand_code || "",
                            category_code: row.category_code || "",
                            type_code: row.type_code || "",
                            model_code: row.model_code || "",
                        });
                        setIsModalOpen(true);
                    }}
                    className="inline-flex items-center justify-center rounded py-1 hover:bg-yellow-100 cursor-pointer text-blue-300 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    onKeyDown={e => {
                        if (e.key === "Enter" || e.key === " ") {
                            setFormData({
                                ...row,
                                brand_code: row.brand_code || "",
                                category_code: row.category_code || "",
                                type_code: row.type_code || "",
                                model_code: row.model_code || "",
                            });
                            setIsModalOpen(true);
                        }
                    }}
                >
                    <InfoIcon size={20} />
                </span>
            ),
        },
    ];

    return (
        <div className="mt-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold mb-4">Assets</h2>
                <Button onClick={() => setIsModalOpen(true)} className="mb-4 bg-blue-600 hover:bg-blue-700">
                    <Plus size={22} />
                </Button>
            </div>
            {loading ? (
                <p>Loading...</p>
            ) : (
                <CustomDataGrid
                    columns={columns}
                    data={transformedData}
                    inputFilter={false}
                />
            )}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{formData.id ? "Update Asset" : "Create Asset"}</DialogTitle>
                        <DialogDescription>Fill in the details below:</DialogDescription>
                    </DialogHeader>
                    <form
                        onSubmit={e => { e.preventDefault(); handleSubmit(); }}
                    >
                        <div className="mb-4">
                            <Label htmlFor="serial_number" className="block text-sm font-medium text-gray-700">Serial Number</Label>
                            <Input
                                id="serial_number"
                                value={formData.serial_number || ""}
                                onChange={e => setFormData(f => ({ ...f, serial_number: e.target.value }))}
                                required
                            />
                        </div>
                        <div className="mb-4">
                            <Label htmlFor="finance_tag" className="block text-sm font-medium text-gray-700">Finance Tag</Label>
                            <Input
                                id="finance_tag"
                                value={formData.finance_tag || ""}
                                onChange={e => setFormData(f => ({ ...f, finance_tag: e.target.value }))}
                                required
                            />
                        </div>
                        <div className="mb-4">
                            <Label htmlFor="status" className="block text-sm font-medium text-gray-700">Status</Label>
                            <Input
                                id="status"
                                value={formData.status || ""}
                                onChange={e => setFormData(f => ({ ...f, status: e.target.value }))}
                                required
                            />
                        </div>
                        <div className="mb-4">
                            <Label htmlFor="depreciation_rate" className="block text-sm font-medium text-gray-700">Depreciation Rate</Label>
                            <Input
                                id="depreciation_rate"
                                type="number"
                                value={formData.depreciation_rate || 0}
                                onChange={e => setFormData(f => ({ ...f, depreciation_rate: Number(e.target.value) }))}
                                required
                            />
                        </div>
                        <div className="mb-4">
                            <Label htmlFor="warranty_period" className="block text-sm font-medium text-gray-700">Warranty Period</Label>
                            <Input
                                id="warranty_period"
                                value={formData.warranty_period || ""}
                                onChange={e => setFormData(f => ({ ...f, warranty_period: e.target.value }))}
                                required
                            />
                        </div>
                        <div className="mb-4">
                            <Label className="block text-sm font-medium text-gray-700">Brand</Label>
                            <Select
                                value={formData.brand_code || ""}
                                onValueChange={val => setFormData(f => ({ ...f, brand_code: val }))}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select a brand" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        <SelectLabel>Brands</SelectLabel>
                                        {brands.map(brand => (
                                            <SelectItem key={brand.id} value={brand.code}>
                                                {brand.name}
                                            </SelectItem>
                                        ))}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="mb-4">
                            <Label className="block text-sm font-medium text-gray-700">Category</Label>
                            <Select
                                value={formData.category_code || ""}
                                onValueChange={val => setFormData(f => ({ ...f, category_code: val }))}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select a category" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        <SelectLabel>Categories</SelectLabel>
                                        {categories.map(category => (
                                            <SelectItem key={category.id} value={category.code}>
                                                {category.name}
                                            </SelectItem>
                                        ))}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="mb-4">
                            <Label className="block text-sm font-medium text-gray-700">Type</Label>
                            <Select
                                value={formData.type_code || ""}
                                onValueChange={val => setFormData(f => ({ ...f, type_code: val }))}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select a type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        <SelectLabel>Types</SelectLabel>
                                        {types.map(type => (
                                            <SelectItem key={type.id} value={type.code}>
                                                {type.name}
                                            </SelectItem>
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

export default CoreAsset;