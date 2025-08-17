"use client";

import React, { useEffect, useState, useMemo } from "react";
import { AuthContext } from "@store/AuthContext";
import { CustomDataGrid, ColumnDef } from "@components/ui/DataGrid";
import { authenticatedApi } from "../../config/api";
import { Plus, InfoIcon, Loader2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { Switch } from "@components/ui/switch";
import { Checkbox } from "@components/ui/checkbox";

interface Brand { id: number; name: string; }
interface Category { id: number; name: string; }
interface Type { id: number; name: string; }
interface Costcenter { id: number; name: string; }
interface Department { id: number; name: string; }
interface Location { id: number; name: string; }

interface Owner {
    ramco_id: string;
    full_name: string;
}

interface Asset {
    id: number;
    classification: string;
    record_status: string;
    register_number: string;
    purchase_date: string;
    purchase_year: number;
    costcenter: Costcenter;
    department: Department;
    location: Location;
    types: Type;
    categories: Category;
    brands: Brand;
    owner: Owner;
    // Derived fields for DataGrid
    age?: number;
    owner_name?: string;
    department_name?: string;
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
    const [hideDisposed, setHideDisposed] = useState(true); // Default checked (active only)
    const [hideNonAsset, setHideNonAsset] = useState(true); // Default checked (asset only)
    const [selectedTypeFilter, setSelectedTypeFilter] = useState<string | null>(null); // For type card filtering

    const fetchData = async () => {
        try {
            // Always fetch types first
            const typesRes = await authenticatedApi.get<any>("/api/assets/types");
            const typesData = Array.isArray(typesRes.data) ? typesRes.data : (typesRes.data && typesRes.data.data ? typesRes.data.data : []);
            setTypes(typesData);

            let assetsRes;
            // Only asset managers (role.id === 7 and username matches manager.ramco_id) use type param
            if (user?.role?.id === 7) {
                const managedTypeIds = typesData
                    .filter((type: any) => type.manager && user?.username === type.manager.ramco_id)
                    .map((type: any) => type.id);
                if (managedTypeIds.length > 0) {
                    const assetResults = await Promise.all(
                        managedTypeIds.map((typeId: number) => authenticatedApi.get<any>(`/api/assets?type=${typeId}`))
                    );
                    const allAssets = assetResults.flatMap(res => res.data.data || []);
                    assetsRes = { data: { data: allAssets } };
                } else {
                    assetsRes = await authenticatedApi.get<any>('/api/assets');
                }
            } else if (user?.role?.id === 1 || user?.role?.id === 8) {
                // Roles 1 (admin) and 8 (developer) always fetch all assets
                assetsRes = await authenticatedApi.get<any>('/api/assets');
            } else {
                // Other roles: fetch all assets
                assetsRes = await authenticatedApi.get<any>('/api/assets');
            }

            // Fetch brands and categories as before
            const [brandsRes, categoriesRes] = await Promise.all([
                authenticatedApi.get<any>("/api/assets/brands"),
                authenticatedApi.get<any>("/api/assets/categories"),
            ]);

            // Map API data to grid data - no need to transform since backend provides structured data
            setData(assetsRes.data.data || []);
            setBrands(Array.isArray(brandsRes.data) ? brandsRes.data : (brandsRes.data && brandsRes.data.data ? brandsRes.data.data : []));
            setCategories(Array.isArray(categoriesRes.data) ? categoriesRes.data : (categoriesRes.data && categoriesRes.data.data ? categoriesRes.data.data : []));
        } catch (error) {
            setData([]); setBrands([]); setCategories([]); setTypes([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const currentYear = new Date().getFullYear();

    // Transform data to match the new backend structure
    const transformedData = data.map(asset => {
        // Calculate age from purchase_year
        const age = asset.purchase_year ? currentYear - asset.purchase_year : 0;
        
        return {
            ...asset,
            brand: asset.brands?.name || '-',
            category: asset.categories?.name || '-',
            asset_type: asset.types?.name || '-',
            age: asset.purchase_year ? age : '-',
            owner_name: asset.owner?.full_name || '-',
            department_name: asset.department?.name || '-',
            costcenter_name: asset.costcenter?.name || '-',
            location_name: asset.location?.name || '-',
            purchase_date_formatted: asset.purchase_date ? new Date(asset.purchase_date).toLocaleDateString() : '-',
        };
    });

    // Memoized columns for the new backend structure
    const columns = useMemo<ColumnDef<any>[]>(() => {
        const contextData = hideDisposed
            ? transformedData.filter(asset => asset.record_status?.toLowerCase() !== 'disposed')
            : transformedData;
        return [
            { key: "id", header: "ID", sortable: true },
            { 
                key: "classification", 
                header: "Classification", 
                sortable: true, 
                filter: 'singleSelect', 
                filterParams: { options: ['asset', 'non-asset'] } 
            },
            { key: "register_number", header: "Register Number", sortable: true, filter: 'input' },
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
            { key: "age", header: "Age", sortable: true, filter: 'input' },
            { key: "purchase_date_formatted", header: "Purchase Date", sortable: true, filter: 'input' },
            { key: "purchase_year", header: "Purchase Year", sortable: true, filter: 'input' },
            {
                key: "record_status",
                header: "Status",
                sortable: true,
                filter: 'singleSelect',
                filterParams: {
                    options: Array.from(new Set(transformedData.map(f => f.record_status).filter(Boolean))) as (string | number)[]
                }
            },
            { key: "owner_name", header: "Owner Name", filter: 'input' },
            { key: "costcenter_name", header: "Cost Center", filter: 'input' },
            {
                key: "department_name",
                header: "Department",
                filter: 'singleSelect',
                filterParams: {
                    options: Array.from(new Set(contextData.map(f => f.department_name).filter(Boolean))) as (string | number)[]
                }
            },
            {
                key: "location_name",
                header: "Location",
                filter: 'singleSelect',
                filterParams: {
                    options: Array.from(new Set(contextData.map(f => f.location_name).filter(Boolean))) as (string | number)[]
                }
            },
        ];
    }, [transformedData, hideDisposed]);

    // Filtered data for DataGrid
    const contextData = hideDisposed
        ? transformedData.filter(asset => asset.record_status?.toLowerCase() === 'active')
        : transformedData;
    const filteredData = hideNonAsset
        ? contextData.filter(asset => asset.classification === 'asset')
        : contextData;

    // Apply type filter if selected
    const finalFilteredData = selectedTypeFilter 
        ? filteredData.filter(asset => asset.types?.name === selectedTypeFilter)
        : filteredData;

    // Type card click handler
    const handleTypeCardClick = (typeName: string) => {
        if (selectedTypeFilter === typeName) {
            setSelectedTypeFilter(null); // Reset filter if clicking the same type
        } else {
            setSelectedTypeFilter(typeName); // Set new filter
        }
    };

    // Summary stats by classification for specific types (excluding personal)
    const allowedTypes = ['asset', 'rental', 'consumable'];
    const getCountsByClassification = (typeName: string) => {
        const typeData = transformedData.filter(a => a.types?.name === typeName);
        return {
            asset: typeData.filter(a => a.classification === 'asset').length,
            rental: typeData.filter(a => a.classification === 'rental').length,
            consumable: typeData.filter(a => a.classification === 'consumable').length,
            total: typeData.length
        };
    };

    // Get unique types from data (excluding personal)
    const availableTypes = Array.from(new Set(
        transformedData
            .map(a => a.types?.name)
            .filter(typeName => typeName && typeName.toLowerCase() !== 'personal')
    )).sort();

    const handleRowDoubleClick = (row: any) => {
        window.open(`/assetdata/assets/${row.id}`, '_blank');
    };

    return (
        <div className="mt-4">
            {/* Summary Cards by Type */}
            <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
                {availableTypes.map(typeName => {
                    const counts = getCountsByClassification(typeName);
                    const isSelected = selectedTypeFilter === typeName;
                    return (
                        <Card 
                            key={typeName}
                            className={`cursor-pointer transition-all hover:shadow-md ${
                                isSelected ? 'border-blue-500 bg-blue-50' : ''
                            }`}
                            onClick={() => handleTypeCardClick(typeName)}
                        >
                            <CardHeader>
                                {/* <CardTitle className="flex items-center justify-between">
                                    <span>{typeName}</span>
                                    {isSelected && (
                                        <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded">
                                            Filtered
                                        </span>
                                    )}
                                </CardTitle> */}
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold text-blue-600 mb-3">{counts.total}</div>
                                <div className="space-y-1 text-sm text-gray-600">
                                    <div className="flex justify-between">
                                        <span>Asset:</span>
                                        <span className="font-semibold">{counts.asset}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Rental:</span>
                                        <span className="font-semibold">{counts.rental}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Consumable:</span>
                                        <span className="font-semibold">{counts.consumable}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
            <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-bold">Assets</h2>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <label htmlFor="active-switch" className="text-sm select-none cursor-pointer my-1">
                            Active Only
                        </label>
                        <Switch
                            checked={hideDisposed}
                            onCheckedChange={setHideDisposed}
                            id="active-switch"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <label htmlFor="asset-switch" className="text-sm select-none cursor-pointer my-1">
                            Asset Only
                        </label>
                        <Switch
                            checked={hideNonAsset}
                            onCheckedChange={setHideNonAsset}
                            id="asset-switch"
                        />
                    </div>
                </div>
            </div>
            {loading ? (
                <div className="flex justify-center items-center py-8">
                    <Loader2 className="animate-spin h-8 w-8 text-blue-500" />
                </div>
            ) : (
                <CustomDataGrid
                    columns={columns}
                    data={finalFilteredData}
                    inputFilter={false}
                    pagination={false}
                    onRowDoubleClick={handleRowDoubleClick}
                    dataExport={true}
                    chainedFilters={['types', 'category', 'brand']}
                />
            )}
        </div>
    );
};

export default CoreAsset;