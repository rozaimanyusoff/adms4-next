"use client";

import React, { useEffect, useState, useMemo } from "react";
import { AuthContext } from "@store/AuthContext";
import { CustomDataGrid, ColumnDef } from "@components/ui/DataGrid";
import { authenticatedApi } from "../../config/api";
import { Plus, InfoIcon } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { Switch } from "@components/ui/switch";
import { Checkbox } from "@components/ui/checkbox";

interface Brand { id: number; name: string; code: string; }
interface Category { id: number; name: string; code: string; }
interface Type { id: number; name: string; code: string; }

interface InstalledSoftware {
    id: number;
    software_id: number;
    name: string;
    installed_at: string;
}

interface Specs {
    id: number;
    asset_id: number;
    entry_code: string;
    asset_code: string | null;
    type_id: number;
    category_id: number;
    brand_id: number | null;
    model_id: number | null;
    serial_number: string;
    // Computer fields
    cpu?: string;
    cpu_generation?: string;
    memory_size?: string;
    storage_size?: string;
    os?: string;
    installed_software_id?: number | null;
    microsoft_office?: string;
    additional_software?: string;
    antivirus?: string;
    upgraded_at?: string;
    updated_by?: string | null;
    // Motor Vehicle fields
    chassis_no?: string;
    engine_no?: string;
    transmission?: string;
    fuel_type?: string;
    cubic_meter?: string;
    avls_availability?: string;
    avls_install_date?: string;
    avls_removal_date?: string;
    avls_transfer_date?: string;
    // Common
    categories?: { category_id: number; name: string };
    brands?: { brand_id: number; name: string } | null;
    models?: { model_id: number; name: string } | null;
    installed_software?: InstalledSoftware[];
}

interface Owner {
    ramco_id: string;
    name: string;
    email?: string;
    contact?: string;
    department?: string | null;
    cost_center?: string | null;
    district?: string | null;
    effective_date?: string;
}

interface Asset {
    id: number;
    classification: string;
    asset_code: string | null;
    finance_tag?: string | null;
    serial_number: string;
    dop?: string | null;
    year?: string | null;
    unit_price?: number | string | null;
    depreciation_length?: number | string;
    depreciation_rate?: number | string;
    cost_center?: string | null;
    status?: string;
    disposed_date?: string | null;
    types?: { type_id: number; type_code: string; name: string };
    specs?: Specs;
    owner?: Owner[];
    asses?: string;
    comment?: string | null;
    pc_hostname?: string | null;
    item_code?: string;
    brands?: { brand_code: string; name: string };
    categories?: { category_code: string; name: string };
    models?: { model_code: string; name: string };
    // Derived fields for DataGrid
    owner_name?: string;
    owner_department?: string;
    owner_district?: string;
    category?: string;
    brand?: string;
    model?: string;
}

/* 
-PROMPT:
here the types backend data:
{
    "status": "success",
    "message": "Asset type retrieved successfully",
    "data": [
        {
            "id": 1,
            "code": "1",
            "name": "Computer",
            "description": "Desktops, Laptops, Tablets, Mobile Devices (FIN)",
            "image": "type_1749218983726.jpeg",
            "ramco_id": "000277",
            "manager": {
                "ramco_id": "000277",
                "full_name": "Rozaiman Bin Yusoff"
            }
        },
    
    i added const user = auth?.authData?.user;

    if the user?.username = manager.ramco_id, the manager with fetch only their managed assets & make request to /api/assets/types/{type_id}

*/

const CoreAsset: React.FC = () => {
    const router = useRouter();
    const auth = React.useContext(AuthContext);
    const user = auth?.authData?.user;
    const [data, setData] = useState<Asset[]>([]);
    const [loading, setLoading] = useState(true);
    const [brands, setBrands] = useState<Brand[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [types, setTypes] = useState<Type[]>([]);
    const [hideDisposed, setHideDisposed] = useState(true); // Default checked
    const [hideNonAsset, setHideNonAsset] = useState(true); // New state for hiding non-asset, default checked

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
            brand: asset.specs?.brands?.name || asset.brands?.name || '-',
            category: asset.specs?.categories?.name || asset.categories?.name || '-',
            model: asset.specs?.models?.name || asset.models?.name || '-',
            asset_type: asset.types?.name || '-',
            age: asset.year ? age : '-',
            unit_price: isNaN(unitPrice) ? '-' : formatNumber(unitPrice),
            nbv: isNaN(nbv) ? '-' : nbv < 0 ? formatNumber(0) : formatNumber(nbv),
            owner_name: asset.owner?.[0]?.name || '-',
            owner_department: asset.owner?.[0]?.department || '-',
            owner_district: asset.owner?.[0]?.district || '-',
            owner_cost_center: asset.owner?.[0]?.cost_center || '-',
        };
    });


    const handleRowDoubleClick = (row: Asset) => {
        window.open(`/assetdata/assets/${row.id}`, '_blank');
    };

    // Memoized columns with chained filter options
    const columns = useMemo<ColumnDef<Asset & { age?: number | string; nbv?: string | number; owner_cost_center?: string }>[]>(() => {
        const contextData = hideDisposed
            ? transformedData.filter(asset => asset.status?.toLowerCase() !== 'disposed')
            : transformedData;
        return [
            { key: "id", header: "ID", sortable: true },
            { key: "classification", header: "Classification", sortable: true, filter: 'singleSelect', filterParams: { options: ['asset', 'non-asset'] } },
            { key: "asset_code", header: "Asset Code", render: (row) => row.asset_code || "-", filter: 'input' },
            { key: "serial_number", header: "Registered Number", sortable: true, filter: 'input' },
            {
                key: "types",
                header: "Asset Type",
                render: (row) => row.types?.name || '-',
                filter: "singleSelect",
                filterParams: {
                    options: Array.from(new Set(contextData.map(d => d.types?.name).filter(Boolean))) as (string | number)[]
                }
            },
            {
                key: "category",
                header: "Category",
                filter: "singleSelect",
                filterParams: {
                    options: Array.from(new Set(
                        transformedData
                            // Filtering logic for chained filters handled by DataGrid now
                            .map(d => d.category)
                            .filter(Boolean)
                    )) as (string | number)[]
                }
            },
            {
                key: "brand",
                header: "Brand",
                filter: "singleSelect",
                filterParams: {
                    options: Array.from(new Set(
                        transformedData
                            .map(d => d.brand)
                            .filter(Boolean)
                    )) as (string | number)[]
                }
            },
            {
                key: "model",
                header: "Model",
                filter: "singleSelect",
                filterParams: {
                    options: Array.from(new Set(
                        transformedData
                            .map(d => d.model)
                            .filter(Boolean)
                    )) as (string | number)[]
                }
            },
            { key: "age", header: "Age", sortable: true, filter: 'input' },
            { key: "unit_price", header: "Asset Value", sortable: true, filter: 'input' },
            { key: "nbv", header: "NBV", sortable: true },
            {
                key: "status",
                header: "Status",
                sortable: true,
                filter: 'singleSelect',
                filterParams: {
                    options: Array.from(new Set(transformedData.map(f => f.status).filter(Boolean))) as (string | number)[]
                }
            },
            { key: "owner_name", header: "Owner Name", filter: 'input' },
            { key: "owner_cost_center", header: "Cost Center", filter: 'input' },
            {
                key: "owner_department",
                header: "Department",
                filter: 'singleSelect',
                filterParams: {
                    options: Array.from(new Set(contextData.map(f => f.owner_department).filter(Boolean))) as (string | number)[]
                }
            },
            {
                key: "owner_district",
                header: "District",
                filter: 'singleSelect',
                filterParams: {
                    options: Array.from(new Set(contextData.map(f => f.owner_district).filter(Boolean))) as (string | number)[]
                }
            },
        ];
    }, [transformedData, hideDisposed]);

    // Filtered data for DataGrid
    const contextData = hideDisposed
        ? transformedData.filter(asset => asset.status?.toLowerCase() !== 'disposed')
        : transformedData;
    const filteredData = hideNonAsset
        ? contextData.filter(asset => asset.classification === 'asset')
        : contextData;

    
    const [typeFilters, setTypeFilters] = useState<{ [key: string]: boolean }>({});
    // Initialize all types checked for total and active on mount/data change
    useEffect(() => {
        const initial: { [key: string]: boolean } = {};
        allTypes.forEach(type => { initial[type] = true; });
        setTypeFilters(initial);
    }, [data]);
    // Handler for checkbox toggle
    const handleTypeFilterChange = (type: string, checked: boolean) => {
        setTypeFilters(prev => ({ ...prev, [type]: checked }));
    };
    // Filtered data for DataGrid based on checked types
    const filteredGridData = filteredData.filter(a => typeFilters[(a.types?.name || a.classification || 'Unknown')]);

    // Summary stats (filtered by current switches)
    const total = filteredData.length;
    const active = filteredData.filter(a => a.status && a.status.toLowerCase() === "active").length;
    const disposed = filteredData.filter(a => a.status && a.status.toLowerCase() === "disposed").length;
    // By type
    const typeCount = (assets: Asset[]) => {
        const counts: Record<string, number> = {};
        assets.forEach(a => {
            const type = (a as any).types?.name || a.classification || 'Unknown';
            counts[type] = (counts[type] || 0) + 1;
        });
        return counts;
    };
    const totalByType = typeCount(filteredData);
    const activeByType = typeCount(filteredData.filter(a => a.status && a.status.toLowerCase() === "active"));
    const disposedByType = typeCount(filteredData.filter(a => a.status && a.status.toLowerCase() === "disposed"));
    // Non-asset stats (only when non-assets are shown)
    const nonAssets = filteredData.filter(a => (a.classification || '').toLowerCase() === 'non-asset');
    const totalNonAssets = nonAssets.length;
    const nonAssetByType = typeCount(nonAssets);

    // Type filter state for summary cards
    const allTypes = Array.from(new Set([
        ...Object.keys(totalByType),
        ...Object.keys(activeByType),
        ...Object.keys(nonAssetByType)
    ]));

    return (
        <div className="mt-4">
            {/* Summary Cards */}
            <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
                <Card>
                    <CardHeader>
                        <CardTitle>Total Assets</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{total}</div>
                        <ul className="mt-2 text-sm text-gray-600">
                            {Object.entries(totalByType).map(([type, count]) => (
                                <li key={type} className="flex items-center gap-2">
                                    <Checkbox
                                        checked={!!typeFilters[type]}
                                        onCheckedChange={checked => handleTypeFilterChange(type, !!checked)}
                                        className="h-4.5 w-4.5 text-blue-600"
                                    />
                                    {type}: <span className="font-semibold">{count}</span>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
                { !hideNonAsset && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Total Non-Assets</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-blue-500">{totalNonAssets}</div>
                            <ul className="mt-2 text-sm text-gray-600">
                                {Object.entries(nonAssetByType).map(([type, count]) => (
                                    <li key={type} className="flex items-center gap-2">
                                        <Checkbox
                                            checked={!!typeFilters[type]}
                                            onCheckedChange={checked => handleTypeFilterChange(type, !!checked)}
                                            className="h-4.5 w-4.5 text-blue-600"
                                        />
                                        {type}: <span className="font-semibold">{count}</span>
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>
                )}
                <Card>
                    <CardHeader>
                        <CardTitle>Active</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-green-600">{active}</div>
                        <ul className="mt-2 text-sm text-gray-600">
                            {Object.entries(activeByType).map(([type, count]) => (
                                <li key={type} className="flex items-center gap-2">
                                    <Checkbox
                                        checked={!!typeFilters[type]}
                                        onCheckedChange={checked => handleTypeFilterChange(type, !!checked)}
                                        className="h-4.5 w-4.5 text-blue-600"
                                    />
                                    {type}: <span className="font-semibold">{count}</span>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Disposed</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-red-500">{disposed}</div>
                        <ul className="mt-2 text-sm text-gray-600">
                            {Object.entries(disposedByType).map(([type, count]) => (
                                <li key={type}>{type}: <span className="font-semibold">{count}</span></li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            </div>
            <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-bold">Assets</h2>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <label htmlFor="disposed-switch" className="text-sm select-none cursor-pointer my-1">
                            Hide Disposed Assets
                        </label>
                        <Switch
                            checked={hideDisposed}
                            onCheckedChange={setHideDisposed}
                            id="disposed-switch"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <label htmlFor="nonasset-switch" className="text-sm select-none cursor-pointer my-1">
                            Hide Non-Asset
                        </label>
                        <Switch
                            checked={hideNonAsset}
                            onCheckedChange={setHideNonAsset}
                            id="nonasset-switch"
                        />
                    </div>
                </div>
            </div>
            {loading ? (
                <p>Loading...</p>
            ) : (
                <CustomDataGrid
                    columns={columns}
                    data={filteredGridData}
                    inputFilter={false}
                    onRowDoubleClick={handleRowDoubleClick}
                    dataExport={true}
                    chainedFilters={['types', 'category', 'brand', 'model']}
                />
            )}
        </div>
    );
};

export default CoreAsset;