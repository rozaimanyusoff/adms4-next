"use client";

import React, { useEffect, useState, useMemo } from "react";
import { AuthContext } from "@store/AuthContext";
import { CustomDataGrid, ColumnDef } from "@components/ui/DataGrid";
import { authenticatedApi } from "../../config/api";
import { Loader2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Switch } from "@components/ui/switch";
import ExcelAssetReport from "./excel-asset-report";

interface Brand { id: number; name: string; }
interface Category { id: number; name: string; }
interface Type { id: number; name: string; }
interface Costcenter { id: number; name: string; }
interface Department { id: number; name: string; }
interface Location { id: number; name: string; }
interface Model { id: number; name: string; }

interface Owner {
    ramco_id: string;
    full_name: string;
}

interface Specs {
    fuel_type?: string;
    transmission?: string;
    cubic_meter?: string;
    roadtax_expiry?: string;
    insurance_expiry?: string;
    [key: string]: any;
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
    // API may return singular (type/category/brand) or plural keys (types/categories/brands)
    type?: Type;
    category?: Category;
    brand?: Brand;
    // Backward compatibility with older payloads
    types?: Type;
    categories?: Category;
    brands?: Brand;
    owner: Owner;
    specs?: Specs;
    // Derived fields for DataGrid
    age?: number;
    owner_name?: string;
    department_name?: string;
    owner_district?: string;
    // Flattened display fields
    asset_type?: string;
    category_name?: string;
    brand_name?: string;
    model_name?: string;
    fuel_type?: string;
    transmission?: string;
    cubic_meter?: string;
    roadtax_expiry_formatted?: string;
    insurance_expiry_formatted?: string;
    entry_code?: string;
    condition_status?: string;
    nbv?: string;
    unit_price?: string;
    purpose?: string;
    disposed_date?: string | null;
    purchase_id?: number | null;
    model?: Model;
    manager_id?: number;
}

interface AssetRecordProps {
    typeId?: number;
    title?: string;
    showTypeCards?: boolean;
    showAssetOnlyToggle?: boolean;
    managerId?: number;
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

const CoreAsset: React.FC<AssetRecordProps> = ({
    typeId,
    title,
    showTypeCards = !typeId,
    showAssetOnlyToggle = !typeId,
    managerId
}) => {
    const auth = React.useContext(AuthContext);
    const user = auth?.authData?.user;
    const [data, setData] = useState<Asset[]>([]);
    const [loading, setLoading] = useState(true);
    const [brands, setBrands] = useState<Brand[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [types, setTypes] = useState<Type[]>([]);
    const [hideDisposed, setHideDisposed] = useState(true); // Default checked (active only)
    const [hideNonAsset, setHideNonAsset] = useState(showAssetOnlyToggle); // Default checked (asset only) unless suppressed
    const [selectedTypeFilter, setSelectedTypeFilter] = useState<string | null>(null); // For type card filtering

    const fetchAssetsForContext = async (typesData: Type[]) => {
        if (managerId) {
            return authenticatedApi.get<any>(`/api/assets?manager=${managerId}`);
        }
        if (typeId) {
            return authenticatedApi.get<any>(`/api/assets?type=${typeId}`);
        }
        if (user?.role?.id === 7) {
            const managedTypeIds = typesData
                .filter((type: any) => type.manager && user?.username === type.manager.ramco_id)
                .map((type: any) => type.id);
            if (managedTypeIds.length > 0) {
                const assetResults = await Promise.all(
                    managedTypeIds.map((typeId: number) => authenticatedApi.get<any>(`/api/assets?type=${typeId}`))
                );
                const allAssets = assetResults.flatMap(res => res.data.data || []);
                return { data: { data: allAssets } };
            }
        }
        return authenticatedApi.get<any>('/api/assets');
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            // Always fetch types first
            const typesRes = await authenticatedApi.get<any>("/api/assets/types");
            const typesData = Array.isArray(typesRes.data) ? typesRes.data : (typesRes.data && typesRes.data.data ? typesRes.data.data : []);
            setTypes(typesData);

            const assetsPromise = fetchAssetsForContext(typesData);
            const brandsPromise = authenticatedApi.get<any>("/api/assets/brands");
            const categoriesPromise = authenticatedApi.get<any>("/api/assets/categories");
            const [assetsRes, brandsRes, categoriesRes] = await Promise.all([assetsPromise, brandsPromise, categoriesPromise]);

            // Map API data to grid data - no need to transform since backend provides structured data
            const assetsPayload = Array.isArray(assetsRes.data)
                ? assetsRes.data
                : (assetsRes.data && assetsRes.data.data ? assetsRes.data.data : []);
            setData(assetsPayload);
            setBrands(Array.isArray(brandsRes.data) ? brandsRes.data : (brandsRes.data && brandsRes.data.data ? brandsRes.data.data : []));
            setCategories(Array.isArray(categoriesRes.data) ? categoriesRes.data : (categoriesRes.data && categoriesRes.data.data ? categoriesRes.data.data : []));
        } catch (error) {
            setData([]); setBrands([]); setCategories([]); setTypes([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, [typeId, managerId]);

    useEffect(() => {
        if (typeof window === "undefined") return;
        const flag = localStorage.getItem("asset-record-refresh");
        if (flag) {
            fetchData();
            localStorage.removeItem("asset-record-refresh");
        }
        const handleStorage = (e: StorageEvent) => {
            if (e.key === "asset-record-refresh" && e.newValue) {
                fetchData();
                localStorage.removeItem("asset-record-refresh");
            }
        };
        const handleFocus = () => fetchData();
        window.addEventListener("storage", handleStorage);
        window.addEventListener("focus", handleFocus);
        return () => {
            window.removeEventListener("storage", handleStorage);
            window.removeEventListener("focus", handleFocus);
        };
    }, [typeId, managerId]);

    const currentYear = useMemo(() => new Date().getFullYear(), []);
    const selectedTypeName = useMemo(() => {
        if (!typeId) return null;
        const match = types.find(t => Number(t.id) === Number(typeId));
        return match?.name || null;
    }, [types, typeId]);

    // Pick the most relevant specs entry (handles array payloads and field/value fragments)
    const getSpecs = (asset: Asset) => {
        if (!asset?.specs) return {};
        if (Array.isArray(asset.specs)) {
            const specsArr = asset.specs as any[];
            const mainSpec =
                specsArr.find(s => s && typeof s === 'object' && Number(s.type_id) === Number(typeId)) ||
                specsArr.find(s => s && typeof s === 'object' && s.type_id) ||
                specsArr.find(s => s && typeof s === 'object' && !('field' in s)) ||
                specsArr[0] ||
                {};

            const fieldFragments = specsArr
                .filter(s => s && typeof s === 'object' && 'field' in s && 'value' in s)
                .reduce((acc: Record<string, any>, entry: any) => {
                    acc[entry.field] = entry.value;
                    return acc;
                }, {});

            return { ...mainSpec, ...fieldFragments };
        }
        return asset.specs;
    };

    // Transform data to match the new backend structure
    const transformedData = useMemo(() => data.map(asset => {
        const age = asset.purchase_year ? currentYear - asset.purchase_year : 0;
        const specs = getSpecs(asset);
        const formatDate = (val?: string) => val ? new Date(val).toLocaleDateString() : '-';

        return {
            ...asset,
            asset_type: asset.types?.name || asset.type?.name || '-',
            category_name: asset.categories?.name || asset.category?.name || '-',
            brand_name: asset.brands?.name || asset.brand?.name || '-',
            age: asset.purchase_year ? age : '-',
            owner_name: asset.owner?.full_name || '-',
            department_name: asset.department?.name || '-',
            costcenter_name: asset.costcenter?.name || '-',
            location_name: asset.location?.name || '-',
            purchase_date_formatted: asset.purchase_date ? new Date(asset.purchase_date).toLocaleDateString() : '-',
            fuel_type: specs.fuel_type || '-',
            transmission: specs.transmission || '-',
            cubic_meter: specs.cubic_meter || '-',
            roadtax_expiry_formatted: formatDate(specs.roadtax_expiry),
            insurance_expiry_formatted: formatDate(specs.insurance_expiry),
        };
    }), [data, currentYear, typeId]);

    // Memoized columns for the new backend structure
    const columns = useMemo<ColumnDef<any>[]>(() => {
        const contextData = hideDisposed
            ? transformedData.filter(asset => asset.record_status?.toLowerCase() !== 'disposed')
            : transformedData;

        const baseColumns: ColumnDef<any>[] = [
            { key: "id", header: "ID", sortable: true },
            {
                key: "classification",
                header: "Classification",
                sortable: true,
                filter: 'singleSelect',
                filterParams: { options: Array.from(new Set(contextData.map(d => d.classification).filter(Boolean))) as (string | number)[] }
            },
            { key: "register_number", header: "Register Number", sortable: true, filter: 'input' },
            {
                key: "asset_type",
                header: "Asset Type",
                render: (row) => row.asset_type || '-',
                filter: "singleSelect",
                filterParams: {
                    options: Array.from(new Set(contextData.map(d => d.asset_type).filter(Boolean))) as (string | number)[]
                }
            },
            {
                key: "category_name",
                header: "Category",
                filter: "singleSelect",
                filterParams: {
                    options: Array.from(new Set(transformedData.map(d => d.category_name).filter(Boolean))) as (string | number)[]
                }
            },
            {
                key: "brand_name",
                header: "Brand",
                filter: "singleSelect",
                filterParams: {
                    options: Array.from(new Set(transformedData.map(d => d.brand_name).filter(Boolean))) as (string | number)[]
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
                render: (row) => {
                    const status = (row.record_status || '').toLowerCase();
                    const isActiveStatus = status === 'active';
                    const colorClasses = isActiveStatus
                        ? 'bg-emerald-50 text-emerald-700 ring-2 ring-emerald-600'
                        : 'bg-red-50 text-red-700 ring-2 ring-red-600';
                    return (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${colorClasses}`}>
                            {row.record_status || '-'}
                        </span>
                    );
                },
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

        const isVehicleView = typeId && (selectedTypeName || '').toLowerCase().includes('vehicle');
        if (isVehicleView) {
            baseColumns.push(
                { key: "fuel_type", header: "Fuel Type", filter: 'singleSelect', filterParams: { options: Array.from(new Set(contextData.map(f => f.fuel_type).filter(Boolean))) as (string | number)[] } },
                { key: "transmission", header: "Transmission", filter: 'singleSelect', filterParams: { options: Array.from(new Set(contextData.map(f => f.transmission).filter(Boolean))) as (string | number)[] } },
                { key: "cubic_meter", header: "Cubic Meter", filter: 'input' },
                { key: "roadtax_expiry_formatted", header: "Roadtax Expiry", sortable: true, filter: 'input' },
                { key: "insurance_expiry_formatted", header: "Insurance Expiry", sortable: true, filter: 'input' },
            );
        }

        return baseColumns;
    }, [transformedData, hideDisposed, typeId, selectedTypeName]);

    // Filtered data for DataGrid
    const contextData = hideDisposed
        ? transformedData.filter(asset => asset.record_status?.toLowerCase() === 'active')
        : transformedData;
    const filteredData = showAssetOnlyToggle && hideNonAsset
        ? contextData.filter(asset => asset.classification === 'asset')
        : contextData;

    // Apply type filter if selected
    const finalFilteredData = selectedTypeFilter
        ? filteredData.filter(asset => (asset as any).asset_type === selectedTypeFilter)
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
    const getCountsByClassification = (typeName: string) => {
        const typeData = transformedData.filter(a => (a as any).asset_type === typeName);
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
            .map(a => a.asset_type)
            .filter(typeName => typeName && String(typeName).toLowerCase() !== 'personal')
    )).sort();

    const heading = title || (selectedTypeName ? `${selectedTypeName} Assets` : "Assets");

    const handleRowDoubleClick = (row: any) => {
        window.open(`/assetdata/assets/${row.id}`, '_blank');
    };

    const shouldShowTypeCards = showTypeCards && availableTypes.length > 0;

    return (
        <div className="mt-4">
            {/* Summary Cards by Type */}
            {shouldShowTypeCards && (
                <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
                    {availableTypes.map(typeName => {
                        const counts = getCountsByClassification(typeName);
                        const isSelected = selectedTypeFilter === typeName;
                        return (
                            <Card
                                key={typeName}
                                className={`cursor-pointer transition-all hover:shadow-md ${isSelected ? 'border-blue-500 bg-blue-50' : ''
                                    }`}
                                onClick={() => handleTypeCardClick(typeName)}
                            >
                                <CardHeader>
                                    <CardTitle className="flex items-center justify-between">
                                        <span className="truncate" title={typeName}>{typeName}</span>
                                        {isSelected && (
                                            <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded">
                                                Filtered
                                            </span>
                                        )}
                                    </CardTitle>
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
            )}
            <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-bold">{heading}</h2>
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
                    {showAssetOnlyToggle && (
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
                    )}
                    <ExcelAssetReport types={types} managerId={managerId} />
                </div>
            </div>
            <div className="relative">
                {loading && (
                    <div className="absolute inset-0 z-10 flex justify-center items-center bg-white/70 backdrop-blur-sm">
                        <Loader2 className="animate-spin h-8 w-8 text-blue-500" />
                    </div>
                )}
                <CustomDataGrid
                    columns={columns}
                    data={loading ? [] : finalFilteredData}
                    inputFilter={false}
                    pagination={false}
                    onRowDoubleClick={handleRowDoubleClick}
                    dataExport={false}
                    chainedFilters={['asset_type', 'category_name', 'brand_name']}
                />
            </div>
        </div>
    );
};

export default CoreAsset;
