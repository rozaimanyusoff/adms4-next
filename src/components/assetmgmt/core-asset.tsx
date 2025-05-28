"use client";

import React, { useEffect, useState } from "react";
import { CustomDataGrid } from "@components/ui/DataGrid";
import { authenticatedApi } from "../../config/api";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faEdit } from "@fortawesome/free-solid-svg-icons";
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

interface Brand { id: number; name: string; }
interface Category { id: number; name: string; }
interface Type { id: number; name: string; }

interface Asset {
    id: number;
    serial_number: string;
    finance_tag: string;
    status: string;
    depreciation_rate: number;
    warranty_period: string;
    brand?: Brand;
    category?: Category;
    type?: Type;
    brand_id?: number;
    category_id?: number;
    type_id?: number;
}

const CoreAsset: React.FC = () => {
    const [data, setData] = useState<Asset[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [brands, setBrands] = useState<Brand[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [types, setTypes] = useState<Type[]>([]);
    const [formData, setFormData] = useState<Partial<Asset & { brandId?: number; categoryId?: number; typeId?: number }>>({
        serial_number: "",
        finance_tag: "",
        status: "",
        depreciation_rate: 0,
        warranty_period: "",
        brandId: 0,
        categoryId: 0,
        typeId: 0,
    });

    const fetchData = async () => {
        try {
            const [assetsRes, brandsRes, categoriesRes, typesRes] = await Promise.all([
                authenticatedApi.get<any>("/api/stock/assets"),
                authenticatedApi.get<any>("/api/stock/brands"),
                authenticatedApi.get<any>("/api/stock/categories"),
                authenticatedApi.get<any>("/api/stock/types"),
            ]);
            setData(Array.isArray(assetsRes.data) ? assetsRes.data : (assetsRes.data && assetsRes.data.data ? assetsRes.data.data : []));
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

    // Map asset data to include full brand/category/type objects for grid display
    const mappedData = data.map(asset => ({
        ...asset,
        brand: brands.find(b => b.id === asset.brand_id) || undefined,
        category: categories.find(c => c.id === asset.category_id) || undefined,
        type: types.find(t => t.id === asset.type_id) || undefined,
    }));

    // Flattened/derived fields for DataGrid search/sort
    const transformedData = mappedData.map(asset => ({
        ...asset,
        brandName: asset.brand?.name || "N/A",
        categoryName: asset.category?.name || "N/A",
        typeName: asset.type?.name || "N/A"
    }));

    const handleSubmit = async () => {
        try {
            const payload = {
                serial_number: formData.serial_number,
                finance_tag: formData.finance_tag,
                status: formData.status,
                depreciation_rate: formData.depreciation_rate,
                warranty_period: formData.warranty_period,
                brandId: formData.brandId,
                categoryId: formData.categoryId,
                typeId: formData.typeId,
            };
            if (formData.id) {
                await authenticatedApi.put(`/api/stock/assets/${formData.id}`, payload);
            } else {
                await authenticatedApi.post("/api/stock/assets", payload);
            }
            fetchData();
            setIsModalOpen(false);
            setFormData({ serial_number: "", finance_tag: "", status: "", depreciation_rate: 0, warranty_period: "", brandId: 0, categoryId: 0, typeId: 0 });
        } catch (error) { }
    };

    const columns = [
        { key: "id" as keyof Asset, header: "ID", sortable: true },
        { key: "serial_number" as keyof Asset, header: "Serial Number", sortable: true },
        { key: "brandName" as keyof Asset, header: "Brand", sortable: true },
        { key: "categoryName" as keyof Asset, header: "Category", sortable: true },
        { key: "typeName" as keyof Asset, header: "Type", sortable: true },
        { key: "status" as keyof Asset, header: "Status", sortable: true },
        {
            key: "actions" as keyof Asset,
            header: "Actions",
            render: (row: Asset) => (
                <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                        setFormData({
                            ...row,
                            brandId: row.brand?.id || 0,
                            categoryId: row.category?.id || 0,
                            typeId: row.type?.id || 0,
                        });
                        setIsModalOpen(true);
                    }}
                    className="bg-yellow-500 hover:bg-yellow-600"
                >
                    <FontAwesomeIcon icon={faEdit} />
                </Button>
            ),
        },
    ];

    return (
        <div className="p-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold mb-4">Assets</h2>
                <Button onClick={() => setIsModalOpen(true)} className="mb-4 bg-blue-600 hover:bg-blue-700">
                    <FontAwesomeIcon icon={faPlus} size="xl" />
                </Button>
            </div>
            {loading ? (
                <p>Loading...</p>
            ) : (
                <CustomDataGrid columns={columns} data={transformedData} inputFilter={true} />
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
                            <label htmlFor="serial_number" className="block text-sm font-medium text-gray-700">Serial Number</label>
                            <Input
                                id="serial_number"
                                value={formData.serial_number || ""}
                                onChange={e => setFormData(f => ({ ...f, serial_number: e.target.value }))}
                                required
                            />
                        </div>
                        <div className="mb-4">
                            <label htmlFor="finance_tag" className="block text-sm font-medium text-gray-700">Finance Tag</label>
                            <Input
                                id="finance_tag"
                                value={formData.finance_tag || ""}
                                onChange={e => setFormData(f => ({ ...f, finance_tag: e.target.value }))}
                                required
                            />
                        </div>
                        <div className="mb-4">
                            <label htmlFor="status" className="block text-sm font-medium text-gray-700">Status</label>
                            <Input
                                id="status"
                                value={formData.status || ""}
                                onChange={e => setFormData(f => ({ ...f, status: e.target.value }))}
                                required
                            />
                        </div>
                        <div className="mb-4">
                            <label htmlFor="depreciation_rate" className="block text-sm font-medium text-gray-700">Depreciation Rate</label>
                            <Input
                                id="depreciation_rate"
                                type="number"
                                value={formData.depreciation_rate || 0}
                                onChange={e => setFormData(f => ({ ...f, depreciation_rate: Number(e.target.value) }))}
                                required
                            />
                        </div>
                        <div className="mb-4">
                            <label htmlFor="warranty_period" className="block text-sm font-medium text-gray-700">Warranty Period</label>
                            <Input
                                id="warranty_period"
                                value={formData.warranty_period || ""}
                                onChange={e => setFormData(f => ({ ...f, warranty_period: e.target.value }))}
                                required
                            />
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700">Brand</label>
                            <Select
                                value={formData.brandId?.toString() || ""}
                                onValueChange={val => setFormData(f => ({ ...f, brandId: Number(val) }))}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select a brand" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        <SelectLabel>Brands</SelectLabel>
                                        {brands.map(brand => (
                                            <SelectItem key={brand.id} value={brand.id.toString()}>
                                                {brand.name}
                                            </SelectItem>
                                        ))}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700">Category</label>
                            <Select
                                value={formData.categoryId?.toString() || ""}
                                onValueChange={val => setFormData(f => ({ ...f, categoryId: Number(val) }))}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select a category" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        <SelectLabel>Categories</SelectLabel>
                                        {categories.map(category => (
                                            <SelectItem key={category.id} value={category.id.toString()}>
                                                {category.name}
                                            </SelectItem>
                                        ))}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700">Type</label>
                            <Select
                                value={formData.typeId?.toString() || ""}
                                onValueChange={val => setFormData(f => ({ ...f, typeId: Number(val) }))}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select a type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        <SelectLabel>Types</SelectLabel>
                                        {types.map(type => (
                                            <SelectItem key={type.id} value={type.id.toString()}>
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