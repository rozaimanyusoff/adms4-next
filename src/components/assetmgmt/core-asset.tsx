"use client";

import React, { useEffect, useState } from "react";
import { CustomDataGrid, ColumnDef } from "@components/ui/DataGrid";
import { authenticatedApi } from "../../config/api";
import { Plus, InfoIcon } from "lucide-react";
import { useRouter } from "next/navigation";

interface Brand { id: number; name: string; code: string; }
interface Category { id: number; name: string; code: string; }
interface Type { id: number; name: string; code: string; }

interface Owner {
    id: number;
    ramco_id: string;
    name: string;
    district: string | null;
    department: string | null;
    cost_center: string | null;
    effective_date: string;
}

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
    classification?: string;
    status?: string;
    depreciation_rate?: number | string;
    warranty_period?: string;
    owner?: Owner[];
    types?: { type_code?: string; name?: string } | null;
    categories?: { category_code?: string; name?: string } | null;
    brands?: { brand_code?: string; name?: string } | null;
    models?: { name?: string } | null;
}

const CoreAsset: React.FC = () => {
    const router = useRouter();
    const [data, setData] = useState<Asset[]>([]);
    const [loading, setLoading] = useState(true);
    const [brands, setBrands] = useState<Brand[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [types, setTypes] = useState<Type[]>([]);

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

    const columns: ColumnDef<Asset & { age?: number | string; nbv?: string | number }>[] = [
        { key: "id", header: "ID", sortable: true },
        { key: "classification", header: "Classification", sortable: true, filter: 'singleSelect' },
        { key: "finance_tag", header: "Finance Tag", render: (row) => row.finance_tag || "-", filter: 'input' },
        { key: "serial_number", header: "Serial Number", sortable: true, filter: 'input' },
        { key: "asset_type" as any, header: "Asset Type", render: (row) => row.types?.name || row.type_code || "-", filter: 'singleSelect' },
        { key: "category_code", header: "Category", sortable: true, filter: 'singleSelect', render: (row) => row.categories?.name || (row.category_code ? (categories.find(c => c.code === row.category_code)?.name || row.category_code) : "-") },
        { key: "brand" as any, header: "Brand", render: (row) => row.brands?.name || row.brand_code || "-", filter: 'singleSelect' },
        { key: "model" as any, header: "Model", render: (row) => row.models?.name || row.model_code || "-", filter: 'singleSelect' },
        { key: "age", header: "Age", sortable: true, filter: 'input' },
        { key: "unit_price", header: "Asset Value", sortable: true, filter: 'input' },
        { key: "nbv", header: "NBV", sortable: true },
        { key: "status", header: "Status", sortable: true, filter: 'singleSelect' },
        { key: "owner_name" as any, header: "Owner Name", render: (row) => row.owner?.[0]?.name || "-", filter: 'input' },
        { key: "owner_department" as any, header: "Department", render: (row) => row.owner?.[0]?.department || "-", filter: 'singleSelect' },
        { key: "owner_district" as any, header: "District", render: (row) => row.owner?.[0]?.district || "-", filter: 'singleSelect' },
        {
            key: "actions" as keyof Asset,
            header: "Actions",
            render: (row: Asset) => (
                <div className="flex gap-2 items-center">
                    <InfoIcon
                        size={20}
                        className="inline-flex items-center justify-center rounded hover:bg-blue-100 cursor-pointer text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400"
                        onClick={() => {
                            window.open(`/assetdata/assets/${row.id}`, '_blank');
                        }}
                    />
                </div>
            ),
        },
    ];

    return (
        <div className="mt-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold mb-4">Assets</h2>
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
        </div>
    );
};

export default CoreAsset;