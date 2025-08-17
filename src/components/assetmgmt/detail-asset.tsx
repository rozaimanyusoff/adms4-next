'use client';
import React, { useEffect, useState } from "react";
import { authenticatedApi } from "@/config/api";
import { 
    ChevronLeft, ChevronRight, Info, Settings, User, History, Monitor, 
    ShoppingCart, Edit, Save, X, Fuel, Wrench, TrendingUp, Calendar,
    MapPin, DollarSign, Activity, Clock, AlertTriangle, CheckCircle,
    BarChart3, PieChart, LineChart, Building, Users, Car, Search
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { ResponsiveContainer, LineChart as RechartsLineChart, Line, XAxis, Tooltip as RechartTooltip, AreaChart as RechartsAreaChart, Area } from 'recharts';

interface MaintenanceRecord {
    id: number;
    req_date: string;
    status: string;
    svc_type: any[];
    amount: number;
    req_comment: string;
    // additional optional fields used in UI
    description?: string;
    maintenancedate?: string;
    maintenancetype?: string;
    cost?: number;
    supplier?: { name?: string };
    mileage?: number;
    technicianname?: string;
    notes?: string;
}

interface FuelRecord {
    id?: number;
    // API shape varies; include fields used in UI
    date?: string;
    billdate?: string;
    amount?: number;
    volume?: number;
    price_per_liter?: number;
    fueltype?: string;
    mileage?: number;
    supplier?: { name?: string };
    station?: string;
    receiptno?: string;
    location?: string;
}

interface DetailAssetProps {
    id: string;
}

const DetailAsset: React.FC<DetailAssetProps> = ({ id }) => {
    const router = useRouter();
    const [asset, setAsset] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [items, setItems] = useState<any[]>([]);
    const [currentIdx, setCurrentIdx] = useState<number>(-1);
    const [searchValue, setSearchValue] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [activeTab, setActiveTab] = useState('dashboard');
    
    // Asset management states
    const [departments, setDepartments] = useState<any[]>([]);
    const [costCenters, setCostCenters] = useState<any[]>([]);
    const [locations, setLocations] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [employeeSearchTerm, setEmployeeSearchTerm] = useState('');
    // UI search (used by this component's inputs) - keep synced with employeeSearchTerm used for API calls
    const [employeeSearch, setEmployeeSearch] = useState('');
    // Filtered list derived from employees for the autocomplete dropdown
    const filteredEmployees = employees && employees.length > 0 && employeeSearch
        ? employees.filter((emp: any) => {
            const name = (emp.name || '').toString().toLowerCase();
            const ramco = (emp.ramco_id || emp.id || '').toString();
            return name.includes(employeeSearch.toLowerCase()) || ramco.includes(employeeSearch);
        }) : [];
    // Keep the existing API-search term in sync with the UI search input
    useEffect(() => {
        if (employeeSearch !== employeeSearchTerm) setEmployeeSearchTerm(employeeSearch);
    }, [employeeSearch]);
    const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    // Selected employee from autocomplete
    const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);

    // Owner update payload state
    const [updateOwnerData, setUpdateOwnerData] = useState({
        departmentId: '',
        costcenterId: '',
        locationId: '',
        assignDate: new Date().toISOString().split('T')[0]
    });

    // Handler to assign selected employee as asset owner
    const handleUpdateOwner = async () => {
        if (!selectedEmployee) return;
        try {
            const payload = {
                employee_id: selectedEmployee.id || selectedEmployee.ramco_id || selectedEmployee.employee_id,
                department_id: updateOwnerData.departmentId,
                costcenter_id: updateOwnerData.costcenterId,
                location_id: updateOwnerData.locationId,
                assign_date: updateOwnerData.assignDate
            };

            await authenticatedApi.post(`/api/assets/${id}/owner`, payload);

            // Refresh asset data
            const res = await authenticatedApi.get(`/api/assets/${id}`) as any;
            setAsset(res.data?.data || null);

            // reset local form
            setSelectedEmployee(null);
            setEmployeeSearch('');
            setUpdateOwnerData({ departmentId: '', costcenterId: '', locationId: '', assignDate: new Date().toISOString().split('T')[0] });
            setIsEditing(false);
        } catch (e) {
            console.error('Failed to update owner:', e);
        }
    };
    
    // Analytics data states
    const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
    const [fuelRecords, setFuelRecords] = useState<FuelRecord[]>([]);
    const [maintenanceSummary, setMaintenanceSummary] = useState<any | null>(null);
    const [fuelSummary, setFuelSummary] = useState<any | null>(null);
    const [analyticsLoading, setAnalyticsLoading] = useState(true);
    const [loadingMaintenance, setLoadingMaintenance] = useState(false);
    const [loadingFuel, setLoadingFuel] = useState(false);
    
    // Edit form states
    const [editForm, setEditForm] = useState({
        ramco_id: '',
        department: '',
        costcenter: '',
        location: '',
        effective_date: new Date().toISOString().split('T')[0]
    });

    // Fetch all asset ids for navigation on mount
    useEffect(() => {
        const fetchItems = async () => {
            try {
                const res = await authenticatedApi.get("/api/assets") as any;
                const arr = res.data?.data || [];
                setItems(arr);
                const idx = arr.findIndex((i: any) => String(i.id) === String(id));
                setCurrentIdx(idx);
            } catch (e) { }
        };
        fetchItems();
    }, [id]);

    useEffect(() => {
        const fetchAsset = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await authenticatedApi.get(`/api/assets/${id}`) as any;
                const assetData = res.data?.data || null;
                setAsset(assetData);
                
                if (assetData && assetData.owner && assetData.owner.length > 0) {
                    const currentOwner = assetData.owner[assetData.owner.length - 1];
                    setEditForm({
                        ramco_id: currentOwner.ramco_id || '',
                        department: currentOwner.department || '',
                        costcenter: currentOwner.costcenter || '',
                        location: currentOwner.location || '',
                        effective_date: new Date().toISOString().split('T')[0]
                    });
                }
                
                // Fetch maintenance and fuel data for motor vehicles
                if (assetData && (assetData?.type?.name ?? assetData?.types?.name) === 'Motor Vehicles') {
                    fetchAnalyticsData(assetData.id);
                } else {
                    setAnalyticsLoading(false);
                }
            } catch (e) {
                setError("Failed to fetch asset data.");
                setAsset(null);
                setAnalyticsLoading(false);
            } finally {
                setLoading(false);
            }
        };
        fetchAsset();
    }, [id]);

    const fetchAnalyticsData = async (assetId: number) => {
        setAnalyticsLoading(true);
        setLoadingMaintenance(true);
        setLoadingFuel(true);
        try {
            const [maintenanceRes, fuelRes] = await Promise.all([
                authenticatedApi.get(`/api/bills/mtn/vehicle/${assetId}`).catch(() => ({ data: { data: [] } })),
                authenticatedApi.get(`/api/bills/fuel/vehicle/${assetId}`).catch(() => ({ data: { data: [] } }))
            ]);
            // Normalize maintenance records: API sometimes returns an object with .records
            const maintenanceRaw: any = (maintenanceRes as any)?.data?.data?.records ?? (maintenanceRes as any)?.data?.data ?? [];
            const normalizedMaintenance: MaintenanceRecord[] = Array.isArray(maintenanceRaw) ? maintenanceRaw.map((r: any) => ({
                id: r.inv_id ?? r.id,
                req_date: r.svc_date ?? r.inv_date ?? r.req_date ?? '',
                status: r.inv_stat ?? r.status ?? '',
                svc_type: r.svc_type ? [r.svc_type] : (r.svc_order ? [r.svc_order] : []),
                amount: parseFloat(r.inv_total ?? r.amount ?? r.total_amount ?? 0) || 0,
                req_comment: r.req_comment ?? r.inv_remarks ?? '',
                description: r.inv_no ? `INV ${r.inv_no}` : (r.svc_order ? `SO ${r.svc_order}` : (r.inv_remarks || '')),
                maintenancedate: r.svc_date ?? r.inv_date ?? r.req_date ?? '',
                maintenancetype: r.svc_type ?? r.maintenancetype ?? '',
                cost: parseFloat(r.inv_total ?? r.amount ?? 0) || 0,
                supplier: r.supplier ? { name: r.supplier.name } : undefined,
                mileage: r.svc_odo ? Number(r.svc_odo) : (r.mileage ? Number(r.mileage) : undefined),
                technicianname: r.technicianname ?? r.technician_name ?? '',
                notes: r.inv_remarks ?? r.req_comment ?? ''
            })) : [];

            // Normalize fuel records
            const fuelRaw: any = (fuelRes as any)?.data?.data?.records ?? (fuelRes as any)?.data?.data ?? [];
            const normalizedFuel: FuelRecord[] = Array.isArray(fuelRaw) ? fuelRaw.map((r: any) => ({
                id: r.s_id ?? r.id,
                amount: parseFloat(r.amount ?? r.inv_total ?? 0) || 0,
                volume: parseFloat(r.total_litre ?? r.volume ?? 0) || 0,
                date: r.stmt_date ?? r.billdate ?? r.date ?? '',
                billdate: r.stmt_date ?? r.billdate ?? r.date ?? '',
                fueltype: r.fueltype ?? r.fuel_type ?? '',
                supplier: r.supplier ? { name: r.supplier.name } : undefined,
                station: r.station ?? '',
                receiptno: r.receiptno ?? '',
                mileage: r.total_km ? Number(r.total_km) : (r.mileage ? Number(r.mileage) : undefined)
            })) : [];

            setMaintenanceRecords(normalizedMaintenance);
            setFuelRecords(normalizedFuel);

            // Capture server-provided summary/totals when available
            const maintenanceSummaryData = (maintenanceRes as any)?.data?.data ?? null;
            const fuelSummaryData = (fuelRes as any)?.data?.data ?? null;
            setMaintenanceSummary(maintenanceSummaryData);
            setFuelSummary(fuelSummaryData);
        } catch (e) {
            console.error("Failed to fetch analytics data:", e);
            setMaintenanceRecords([]);
            setFuelRecords([]);
        } finally {
            setAnalyticsLoading(false);
            setLoadingMaintenance(false);
            setLoadingFuel(false);
        }
    };

    // Fetch reference data
    useEffect(() => {
        const fetchReferenceData = async () => {
            try {
                const [deptRes, costRes, locRes] = await Promise.all([
                    authenticatedApi.get('/api/assets/departments').catch(() => ({ data: { data: [] } })),
                    authenticatedApi.get('/api/assets/costcenters').catch(() => ({ data: { data: [] } })),
                    authenticatedApi.get('/api/assets/locations').catch(() => ({ data: { data: [] } }))
                ]);
                
                setDepartments(deptRes.data?.data || []);
                setCostCenters(costRes.data?.data || []);
                setLocations(locRes.data?.data || []);
            } catch (e) {
                console.error("Failed to fetch reference data:", e);
            }
        };

        fetchReferenceData();
    }, []);

    // Employee search for Ramco ID
    useEffect(() => {
        const searchEmployees = async () => {
            if (employeeSearchTerm.length < 2) {
                setEmployees([]);
                setShowEmployeeDropdown(false);
                return;
            }

            try {
                const res = await authenticatedApi.get(`/api/assets/employees/search?q=${employeeSearchTerm}`) as any;
                setEmployees(res.data?.data || []);
                setShowEmployeeDropdown((res.data?.data || []).length > 0);
            } catch (e) {
                console.error("Failed to search employees:", e);
                setEmployees([]);
                setShowEmployeeDropdown(false);
            }
        };

        const timeoutId = setTimeout(searchEmployees, 300);
        return () => clearTimeout(timeoutId);
    }, [employeeSearchTerm]);

    // Analytics calculations
    const calculateAnalytics = () => {
        const currentYear = new Date().getFullYear();
        const assetAge = asset?.purchase_year ? currentYear - asset.purchase_year : 0;
        
        // Maintenance analytics
        const totalMaintenanceCost = maintenanceSummary?.total_amount ? Number(maintenanceSummary.total_amount) : maintenanceRecords.reduce((sum, record) => sum + (record.amount || 0), 0);
        const maintenanceThisYear = maintenanceRecords.filter(record => 
            record.req_date ? new Date(record.req_date).getFullYear() === currentYear : false
        );
        const maintenanceCostThisYear = maintenanceThisYear.reduce((sum, record) => sum + (record.amount || 0), 0);
        
        // Fuel analytics
    const totalFuelCost = fuelSummary?.total_amount ? Number(fuelSummary.total_amount) : fuelRecords.reduce((sum, record) => sum + (record.amount || 0), 0);
    const totalFuelVolume = fuelSummary?.total_litre ? Number(fuelSummary.total_litre) : fuelRecords.reduce((sum, record) => sum + (record.volume || 0), 0);
    const avgFuelPrice = fuelSummary?.average_efficiency ? Number(fuelSummary.average_efficiency) : (totalFuelVolume > 0 ? totalFuelCost / totalFuelVolume : 0);
        
        const fuelThisYear = fuelRecords.filter(record => 
            record.date ? new Date(record.date).getFullYear() === currentYear : false
        );
        const fuelCostThisYear = fuelThisYear.reduce((sum, record) => sum + (record.amount || 0), 0);
        
        return {
            assetAge,
            totalMaintenanceCost,
            maintenanceCostThisYear,
            maintenanceCount: maintenanceRecords.length,
            totalFuelCost,
            fuelCostThisYear,
            totalFuelVolume,
            avgFuelPrice,
            fuelRecordCount: fuelRecords.length
        };
    };

    const analytics = calculateAnalytics();

    // Current owner helper: prefer last entry from asset.owner, fallback to nested shapes
    const currentOwner: any = asset?.owner && asset.owner.length > 0 ? asset.owner[asset.owner.length - 1] : null;

    // Asset management functions
    const handleSaveOwnerUpdate = async () => {
        try {
            await authenticatedApi.post(`/api/assets/${id}/owner`, editForm);
            // Refresh asset data
            const res = await authenticatedApi.get(`/api/assets/${id}`) as any;
            setAsset(res.data?.data || null);
            setIsEditing(false);
        } catch (e) {
            console.error("Failed to update owner:", e);
        }
    };

    const formatCurrency = (amount?: number | null) => {
        if (amount === undefined || amount === null || Number.isNaN(Number(amount))) return '-';
        return new Intl.NumberFormat('en-MY', {
            style: 'currency',
            currency: 'MYR'
        }).format(Number(amount));
    };

    const formatDate = (dateString?: string | null) => {
        if (!dateString) return '-';
        const d = new Date(dateString);
        if (isNaN(d.getTime())) return '-';
        return d.toLocaleDateString('en-MY');
    };

    // Build combined monthly series for combo chart
    const mergeAnalyticsForCombo = (mtn: any[], fuel: any[]) => {
        const map: Record<string, { month: string; maintenance: number; fuel: number }> = {};
        const monthKey = (d?: string) => {
            if (!d) return 'unknown';
            const dt = new Date(d);
            return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
        };

        mtn.forEach(r => {
            const k = monthKey(r.maintenancedate || r.req_date || r.svc_date || r.inv_date);
            map[k] = map[k] || { month: k, maintenance: 0, fuel: 0 };
            map[k].maintenance += Number(r.amount || r.cost || 0);
        });

        fuel.forEach(r => {
            const k = monthKey((r.billdate || r.date || (r as any).stmt_date) as string);
            map[k] = map[k] || { month: k, maintenance: 0, fuel: 0 };
            map[k].fuel += Number(r.volume || (r as any).total_litre || 0);
        });

        return Object.values(map).sort((a, b) => a.month.localeCompare(b.month));
    };


    // Autocomplete search for register number
    useEffect(() => {
        if (searchValue.length < 2) {
            setSearchResults([]);
            setShowDropdown(false);
            return;
        }
        const results = items.filter((item: any) => {
            const registerMatch = item.register_number && item.register_number.toLowerCase().includes(searchValue.toLowerCase());
            const typeMatch = item.types?.name && item.types.name.toLowerCase().includes(searchValue.toLowerCase());
            return registerMatch || typeMatch;
        });
        setSearchResults(results);
        setShowDropdown(results.length > 0);
    }, [searchValue, items]);

    if (loading) return (
        <div className="w-full">
            {/* Navigation Bar */}
            <div className="flex items-center justify-between bg-gradient-to-r from-slate-900 to-slate-700 rounded-lg shadow-lg px-6 py-4 mb-6">
                <div className="flex items-center gap-4">
                    <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                        <Monitor className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-xl font-semibold text-white">Asset Management</span>
                </div>
                <div className="flex items-center gap-3 relative">
                    <div className="w-64 relative">
                        <Input
                            type="text"
                            placeholder="Search register number..."
                            className="w-64 bg-white/10 border-white/20 text-white placeholder:text-white/70"
                            value={searchValue}
                            onChange={e => setSearchValue(e.target.value)}
                            onFocus={() => setShowDropdown(searchResults.length > 0)}
                            onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                        />
                        {showDropdown && (
                            <ul className="absolute z-10 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-auto mt-1">
                                {searchResults.map((item) => (
                                    <li
                                        key={item.id}
                                        className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm"
                                        onMouseDown={() => {
                                            setCurrentIdx(items.findIndex((i: any) => i.id === item.id));
                                            setSearchValue("");
                                            setShowDropdown(false);
                                        }}
                                    >
                                        <div className="font-medium">{item.register_number}</div>
                                        <div className="text-xs text-gray-500">{item.types?.name || '-'}</div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="border-white/20 bg-white/10 text-white hover:bg-white/20"
                        onClick={() => {
                            if (currentIdx > 0) {
                                const prevAsset = items[currentIdx - 1];
                                if (prevAsset && prevAsset.id) router.push(`/assetdata/assets/${prevAsset.id}`);
                            }
                        }}
                        disabled={currentIdx <= 0}
                        title="Previous Asset"
                    >
                        <ChevronLeft size={20} />
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="border-white/20 bg-white/10 text-white hover:bg-white/20"
                        onClick={() => {
                            if (currentIdx >= 0 && currentIdx < items.length - 1) {
                                const nextAsset = items[currentIdx + 1];
                                if (nextAsset && nextAsset.id) router.push(`/assetdata/assets/${nextAsset.id}`);
                            }
                        }}
                        disabled={currentIdx === -1 || currentIdx === items.length - 1}
                        title="Next Asset"
                    >
                        <ChevronRight size={20} />
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="border-red-400/50 bg-red-500/80 text-white hover:bg-red-600"
                        title="Close"
                        onClick={() => window.close()}
                    >
                        <X className="w-5 h-5" />
                    </Button>
                </div>
            </div>
            <div className="flex justify-center items-center py-12">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading asset details...</p>
                </div>
            </div>
        </div>
    );
    if (!asset || error || !id || id === 'null' || id === 'undefined') return (
        <div className="w-full">
            {/* Navbar always visible */}
            <div className="flex items-center justify-between bg-gradient-to-b from-gray-200 to-gray-100 rounded shadow px-4 py-3 mb-6">
                <div className="flex items-center gap-4">
                    <span className="text-lg font-semibold">Asset Detail</span>
                </div>
                <div className="flex items-center gap-2 relative">
                    <div className="w-64 relative">
                        <Input
                            type="text"
                            placeholder="Search registered number..."
                            className="w-64"
                            value={searchValue}
                            onChange={e => setSearchValue(e.target.value)}
                            onFocus={() => setShowDropdown(searchResults.length > 0)}
                            onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                        />
                        {showDropdown && (
                            <ul className="absolute z-10 w-full bg-stone-200 border border-gray-200 rounded shadow-lg max-h-48 overflow-auto mt-1">
                                {searchResults.map((item) => (
                                    <li
                                        key={item.id}
                                        className="px-3 py-2 hover:bg-blue-100 cursor-pointer text-sm"
                                        onMouseDown={() => {
                                            setCurrentIdx(items.findIndex((i: any) => i.id === item.id));
                                            setSearchValue("");
                                            setShowDropdown(false);
                                        }}
                                    >
                                        <div className="font-medium">{item.serial_number}</div>
                                        <div className="text-xs text-gray-500">{item.brands?.name || '-'} | {item.models?.name || '-'}</div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="rounded-full border border-gray-300 dark:border-neutral-700"
                        onClick={() => {
                            if (currentIdx > 0) {
                                const prevAsset = items[currentIdx - 1];
                                if (prevAsset && prevAsset.id) router.push(`/assetdata/assets/${prevAsset.id}`);
                            }
                        }}
                        disabled={currentIdx <= 0}
                        title="Previous Asset"
                    >
                        <ChevronLeft size={20} />
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="rounded-full border border-gray-300 dark:border-neutral-700"
                        onClick={() => {
                            if (currentIdx >= 0 && currentIdx < items.length - 1) {
                                const nextAsset = items[currentIdx + 1];
                                if (nextAsset && nextAsset.id) router.push(`/assetdata/assets/${nextAsset.id}`);
                            }
                        }}
                        disabled={currentIdx === -1 || currentIdx === items.length - 1}
                        title="Next Asset"
                    >
                        <ChevronRight size={20} />
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="rounded-full bg-red-500 hover:bg-red-600 text-white dark:border-neutral-700"
                        title="Close"
                        onClick={() => window.close()}
                    >
                        <span className="sr-only">Close</span>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </Button>
                </div>
            </div>
            <div className="p-8 text-red-500">{error || 'Invalid asset selected. Please use navigation or search.'}</div>
        </div>
    );

    return (
        <div className="w-full min-h-screen bg-gray-50">
            {/* Navigation Bar */}
            <div className="flex items-center justify-between bg-gradient-to-r from-slate-900 to-slate-700 rounded-0 shadow px-6 py-4 mb-6">
                <div className="flex items-center gap-4">
                    <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                        {(asset?.type?.name ?? asset?.types?.name) === 'Motor Vehicles' ? <Car className="w-5 h-5 text-white" /> : <Monitor className="w-5 h-5 text-white" />}
                    </div>
                    <span className="text-xl font-semibold text-white">Asset Management</span>
                </div>
                <div className="flex items-center gap-3 relative">
                    <div className="w-64 relative">
                        <Input
                            type="text"
                            placeholder="Search register number..."
                            className="w-64 bg-white/10 border-white/20 text-white placeholder:text-white/70"
                            value={searchValue}
                            onChange={e => setSearchValue(e.target.value)}
                            onFocus={() => setShowDropdown(searchResults.length > 0)}
                            onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                        />
                        {showDropdown && (
                            <ul className="absolute z-10 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-auto mt-1">
                                {searchResults.map((item) => (
                                    <li
                                        key={item.id}
                                        className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm"
                                        onMouseDown={() => {
                                            setCurrentIdx(items.findIndex((i: any) => i.id === item.id));
                                            setSearchValue("");
                                            setShowDropdown(false);
                                        }}
                                    >
                                        <div className="font-medium">{item.register_number}</div>
                                        <div className="text-xs text-gray-500">{item.types?.name || '-'}</div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="border-white/20 bg-white/10 text-white hover:bg-white/20"
                        onClick={() => {
                            if (currentIdx > 0) {
                                const prevAsset = items[currentIdx - 1];
                                if (prevAsset) router.push(`/assetdata/assets/${prevAsset.id}`);
                            }
                        }}
                        disabled={currentIdx <= 0}
                        title="Previous Asset"
                    >
                        <ChevronLeft size={20} />
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="border-white/20 bg-white/10 text-white hover:bg-white/20"
                        onClick={() => {
                            if (currentIdx >= 0 && currentIdx < items.length - 1) {
                                const nextAsset = items[currentIdx + 1];
                                if (nextAsset) router.push(`/assetdata/assets/${nextAsset.id}`);
                            }
                        }}
                        disabled={currentIdx === -1 || currentIdx === items.length - 1}
                        title="Next Asset"
                    >
                        <ChevronRight size={20} />
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="border-red-400/50 bg-red-500/80 text-white hover:bg-red-600"
                        title="Close"
                        onClick={() => window.close()}
                    >
                        <X className="w-5 h-5" />
                    </Button>
                </div>
            </div>

            <div className="max-w-10/12 mx-auto px-6 space-y-6">
                {/* Asset Overview Hero Section */}
                <Card className="overflow-hidden bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border-none shadow-lg">
                    <CardContent className="p-8">
                        <div className="flex flex-col lg:flex-row gap-8 items-start">
                            {/* Asset Icon/Image */}
                            <div className="flex-shrink-0">
                                <div className="w-24 h-24 bg-white rounded-2xl shadow-lg border border-gray-200 flex items-center justify-center">
                                    {(asset?.type?.name ?? asset?.types?.name) === 'Motor Vehicles' ? (
                                        <Car className="w-12 h-12 text-blue-500" />
                                    ) : (
                                        <Monitor className="w-12 h-12 text-blue-500" />
                                    )}
                                </div>
                            </div>

                            {/* Asset Key Info (inline on md+) */}
                            <div className="flex-1">
                                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                    <div className="min-w-0">
                                        <p className="text-sm text-gray-500">Register Number</p>
                                        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1 md:mb-0 truncate">{asset?.register_number}</h1>
                                        <div className="flex items-center gap-3 mt-2">
                                            <Badge variant="secondary" className="text-sm px-3 py-1 border-blue-600 uppercase">
                                                {(asset?.type?.name ?? asset?.types?.name) || 'Unknown Type'}
                                            </Badge>
                                            <Badge 
                                                variant={asset?.status === 'active' || asset?.status === 'Active' ? 'default' : 'destructive'}
                                                className="text-sm px-3 py-1 flex items-center gap-2 uppercase"
                                            >
                                                {asset?.status === 'active' || asset?.status === 'Active' ? (
                                                    <>
                                                        <CheckCircle className="w-4 h-4" />
                                                        <span>Active</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <AlertTriangle className="w-4 h-4" />
                                                        <span>{asset?.status || 'Unknown'}</span>
                                                    </>
                                                )}
                                            </Badge>
                                            <Badge variant="outline" className="text-sm px-3 py-1 border-green-600 uppercase">
                                                {asset?.classification}
                                            </Badge>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-3">
                                        <div className="bg-white/70 backdrop-blur rounded-xl p-3 shadow-sm">
                                            <div className="flex items-center gap-3">
                                                <Calendar className="w-5 h-5 text-blue-500" />
                                                <div>
                                                    <p className="text-sm text-gray-600">Purchase Year</p>
                                                    <p className="text-md font-bold">{asset?.purchase_year || '-'}</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-white/70 backdrop-blur rounded-xl p-3 shadow-sm">
                                            <div className="flex items-center gap-3">
                                                <Clock className="w-5 h-5 text-green-500" />
                                                <div>
                                                    <p className="text-sm text-gray-600">Age</p>
                                                    <p className="text-md font-bold">{analytics.assetAge} yrs</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-white/70 backdrop-blur rounded-xl p-3 shadow-sm">
                                            <div className="flex items-center gap-3">
                                                <Building className="w-5 h-5 text-purple-500" />
                                                <div>
                                                    <p className="text-sm text-gray-600">Cost Center</p>
                                                    <p className="text-md font-bold">{asset?.costcenter?.name || '-'}</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-white/70 backdrop-blur rounded-xl p-3 shadow-sm">
                                            <div className="flex items-center gap-3">
                                                <MapPin className="w-5 h-5 text-red-500" />
                                                <div>
                                                    <p className="text-sm text-gray-600">Current Owner</p>
                                                    <p className="text-md font-bold">{currentOwner?.name ?? currentOwner?.employee?.name ?? '-'}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Analytics Dashboard */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 shadow-lg">
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-green-800">
                                    <Wrench className="w-5 h-5" />
                                    Maintenance Overview
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-600">Total Cost</span>
                                        <span className="font-bold text-lg">{formatCurrency(analytics.totalMaintenanceCost)}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-600">This Year</span>
                                        <span className="font-semibold">{formatCurrency(analytics.maintenanceCostThisYear)}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-600">Total Records</span>
                                        <span className="font-semibold">{analytics.maintenanceCount}</span>
                                    </div>
                                </div>
                                {/* Mini trend chart */}
                                <div className="mt-4 h-20">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <RechartsAreaChart data={maintenanceRecords.slice(-12).map(r => ({ x: r.maintenancedate || r.req_date, y: Number(r.amount || r.cost || 0) }))}>
                                            <RechartTooltip formatter={(value:any) => formatCurrency(Number(value))} labelFormatter={() => ''} />
                                            <Area type="monotone" dataKey="y" stroke="#10b981" fill="#bbf7d0" strokeWidth={2} dot={false} />
                                        </RechartsAreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200 shadow-lg">
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-blue-800">
                                    <Fuel className="w-5 h-5" />
                                    Fuel Consumption
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-600">Total Cost</span>
                                        <span className="font-bold text-lg">{formatCurrency(analytics.totalFuelCost)}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-600">This Year</span>
                                        <span className="font-semibold">{formatCurrency(analytics.fuelCostThisYear)}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-600">Total Volume</span>
                                        <span className="font-semibold">{analytics.totalFuelVolume.toFixed(2)} L</span>
                                    </div>
                                </div>
                                <div className="mt-4 h-20">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <RechartsAreaChart data={fuelRecords.slice(-12).map(r => ({ x: (r as any).billdate || (r as any).date, y: Number((r as any).volume || (r as any).total_litre || 0) }))}>
                                            <RechartTooltip formatter={(value:any) => `${Number(value).toFixed(2)} L`} labelFormatter={() => ''} />
                                            <Area type="monotone" dataKey="y" stroke="#3b82f6" fill="#bfdbfe" strokeWidth={2} dot={false} />
                                        </RechartsAreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200 shadow-lg">
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-purple-800">
                                    <TrendingUp className="w-5 h-5" />
                                    Analytics
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-600">Avg Fuel Price</span>
                                        <span className="font-bold text-lg">{formatCurrency(analytics.avgFuelPrice)}/L</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-600">Asset Age</span>
                                        <span className="font-semibold">{analytics.assetAge} years</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-600">Fuel Records</span>
                                        <span className="font-semibold">{analytics.fuelRecordCount}</span>
                                    </div>
                                </div>
                                <div className="mt-4 h-20">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <RechartsLineChart data={mergeAnalyticsForCombo(maintenanceRecords, fuelRecords).slice(-12)}>
                                            <RechartTooltip formatter={(value:any, name:any) => typeof value === 'number' ? formatCurrency(value) : value} />
                                            <Line type="monotone" dataKey="maintenance" stroke="#6b21a8" strokeWidth={2} dot={false} />
                                            <Line type="monotone" dataKey="fuel" stroke="#0ea5e9" strokeWidth={2} dot={false} />
                                        </RechartsLineChart>
                                    </ResponsiveContainer>
                                </div>
                                </CardContent>
                        </Card>
                    </div>

                {/* Tab Navigation */}
                <Card className="overflow-hidden">
                    <div className="border-b border-gray-200 bg-gray-50">
                        <nav className="flex space-x-8 px-6" aria-label="Tabs">
                            {[
                                { id: 'dashboard', name: 'Dashboard', icon: BarChart3 },
                                { id: 'details', name: 'Asset Details', icon: Info },
                                { id: 'owner', name: 'Owner Management', icon: Users },
                                { id: 'maintenance', name: 'Maintenance', icon: Wrench, count: analytics.maintenanceCount },
                                { id: 'fuel', name: 'Fuel Records', icon: Fuel, count: analytics.fuelRecordCount }
                            ].map((tab) => {
                                const Icon = tab.icon;
                                const isActive = activeTab === tab.id;
                                
                                // Maintenance and fuel tabs shown for all asset types
                                
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`${isActive
                                            ? 'border-blue-500 text-blue-600 bg-white'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                            } whitespace-nowrap py-4 px-4 border-b-2 font-medium text-sm flex items-center gap-2 transition-all duration-200 rounded-t-lg`}
                                    >
                                        <Icon className="w-4 h-4" />
                                        {tab.name}
                                        {tab.count !== undefined && tab.count > 0 && (
                                            <Badge variant="secondary" className="ml-2">
                                                {tab.count}
                                            </Badge>
                                        )}
                                    </button>
                                );
                            })}
                        </nav>
                    </div>

                    {/* Tab Content */}
                    <CardContent className="p-6">
                        {activeTab === 'dashboard' && (
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 rounded-lg text-white">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-blue-100">Asset Status</p>
                                                <p className="text-2xl font-bold">{asset?.status || 'Active'}</p>
                                            </div>
                                            <CheckCircle className="w-8 h-8 text-blue-200" />
                                        </div>
                                    </div>

                                    <div className="bg-gradient-to-r from-green-500 to-green-600 p-4 rounded-lg text-white">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-green-100">Current Owner</p>
                                                <p className="text-xl font-bold">{currentOwner?.employee?.name ?? currentOwner?.name ?? 'Unassigned'}</p>
                                            </div>
                                            <User className="w-8 h-8 text-green-200" />
                                        </div>
                                    </div>

                                    <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-4 rounded-lg text-white">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-purple-100">Department</p>
                                                <p className="text-xl font-bold">{currentOwner?.department?.name ?? currentOwner?.department ?? 'N/A'}</p>
                                            </div>
                                            <Building className="w-8 h-8 text-purple-200" />
                                        </div>
                                    </div>

                                    <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-4 rounded-lg text-white">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-orange-100">Asset Age</p>
                                                <p className="text-2xl font-bold">{analytics.assetAge} years</p>
                                            </div>
                                            <Calendar className="w-8 h-8 text-orange-200" />
                                        </div>
                                    </div>
                                </div>

                                {(asset?.type?.name ?? asset?.types?.name) === 'Motor Vehicles' && (
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        <Card>
                                            <CardHeader>
                                                <CardTitle className="flex items-center gap-2">
                                                    <TrendingUp className="w-5 h-5" />
                                                    Monthly Trends
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="space-y-4">
                                                    <div>
                                                        <div className="flex justify-between text-sm mb-1">
                                                            <span>Maintenance Cost</span>
                                                            <span>{formatCurrency(analytics.maintenanceCostThisYear)}</span>
                                                        </div>
                                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                                            <div 
                                                                className="bg-green-500 h-2 rounded-full" 
                                                                style={{ width: `${analytics.totalMaintenanceCost > 0 ? (analytics.maintenanceCostThisYear / analytics.totalMaintenanceCost * 100) : 0}%` }}
                                                            ></div>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className="flex justify-between text-sm mb-1">
                                                            <span>Fuel Cost</span>
                                                            <span>{formatCurrency(analytics.fuelCostThisYear)}</span>
                                                        </div>
                                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                                            <div 
                                                                className="bg-blue-500 h-2 rounded-full" 
                                                                style={{ width: `${analytics.totalFuelCost > 0 ? (analytics.fuelCostThisYear / analytics.totalFuelCost * 100) : 0}%` }}
                                                            ></div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>

                                        <Card>
                                            <CardHeader>
                                                <CardTitle className="flex items-center gap-2">
                                                    <AlertTriangle className="w-5 h-5" />
                                                    Quick Actions
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <Button 
                                                        variant="outline" 
                                                        size="sm"
                                                        onClick={() => setActiveTab('maintenance')}
                                                        className="flex items-center gap-2"
                                                    >
                                                        <Wrench className="w-4 h-4" />
                                                        Maintenance
                                                    </Button>
                                                    <Button 
                                                        variant="outline" 
                                                        size="sm"
                                                        onClick={() => setActiveTab('fuel')}
                                                        className="flex items-center gap-2"
                                                    >
                                                        <Fuel className="w-4 h-4" />
                                                        Fuel Records
                                                    </Button>
                                                    <Button 
                                                        variant="outline" 
                                                        size="sm"
                                                        onClick={() => setActiveTab('owner')}
                                                        className="flex items-center gap-2"
                                                    >
                                                        <Users className="w-4 h-4" />
                                                        Change Owner
                                                    </Button>
                                                    <Button 
                                                        variant="outline" 
                                                        size="sm"
                                                        onClick={() => setActiveTab('history')}
                                                        className="flex items-center gap-2"
                                                    >
                                                        <History className="w-4 h-4" />
                                                        View History
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'details' && (
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>Basic Information</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <Label className="text-sm font-medium text-gray-500">Asset Tag</Label>
                                                    <p className="mt-1 font-semibold">{asset?.tag || 'N/A'}</p>
                                                </div>
                                                <div>
                                                    <Label className="text-sm font-medium text-gray-500">Serial Number</Label>
                                                    <p className="mt-1">{asset?.serial || 'N/A'}</p>
                                                </div>
                                                <div>
                                                    <Label className="text-sm font-medium text-gray-500">Type</Label>
                                                    <p className="mt-1">{(asset?.type?.name ?? asset?.types?.name) || 'N/A'}</p>
                                                </div>
                                                <div>
                                                    <Label className="text-sm font-medium text-gray-500">Category</Label>
                                                    <p className="mt-1">{asset?.category?.name || 'N/A'}</p>
                                                </div>
                                                <div>
                                                    <Label className="text-sm font-medium text-gray-500">Brand</Label>
                                                    <p className="mt-1">{asset?.brand?.name || 'N/A'}</p>
                                                </div>
                                                <div>
                                                    <Label className="text-sm font-medium text-gray-500">Model</Label>
                                                    <p className="mt-1">{asset?.model?.name || 'N/A'}</p>
                                                </div>
                                                <div>
                                                    <Label className="text-sm font-medium text-gray-500">Status</Label>
                                                    <Badge variant={asset?.status === 'Active' ? 'default' : 'secondary'}>
                                                        {asset?.status || 'Active'}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card>
                                        <CardHeader>
                                            <CardTitle>Financial Information</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <Label className="text-sm font-medium text-gray-500">Purchase Price</Label>
                                                    <p className="mt-1 font-semibold">{formatCurrency(asset?.purchaseprice || 0)}</p>
                                                </div>
                                                <div>
                                                    <Label className="text-sm font-medium text-gray-500">Purchase Date</Label>
                                                    <p className="mt-1">{asset?.purchasedate ? formatDate(asset.purchasedate) : 'N/A'}</p>
                                                </div>
                                                <div>
                                                    <Label className="text-sm font-medium text-gray-500">Supplier</Label>
                                                    <p className="mt-1">{asset?.supplier?.name || 'N/A'}</p>
                                                </div>
                                                <div>
                                                    <Label className="text-sm font-medium text-gray-500">Warranty</Label>
                                                    <p className="mt-1">{asset?.warranty ? `${asset.warranty} months` : 'N/A'}</p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>

                                {asset?.description && (
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>Description</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="text-gray-700">{asset.description}</p>
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                        )}

                        {activeTab === 'owner' && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Left column: current assignment + update form */}
                                <div className="space-y-6">
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2">
                                                <Users className="w-5 h-5" />
                                                Current Assignment
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            {currentOwner ? (
                                                <div className="space-y-4">
                                                    <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                                                        <User className="w-12 h-12 text-gray-400" />
                                                        <div className="flex-1">
                                                            <h3 className="font-semibold">{currentOwner.name ?? currentOwner.employee?.name}</h3>
                                                            <p className="text-sm text-gray-600">{currentOwner.department ?? currentOwner.department?.name}</p>
                                                            <p className="text-sm text-gray-600">{currentOwner.costcenter ?? currentOwner.costcenter?.name}</p>
                                                            <p className="text-sm text-gray-600">{currentOwner.location ?? currentOwner.location?.name}</p>
                                                        </div>
                                                        <Badge variant="outline">Current Owner</Badge>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                                        <div>
                                                            <Label className="text-gray-500">Assignment Date</Label>
                                                            <p className="font-medium">{formatDate(currentOwner.effective_date ?? currentOwner.assigndate ?? currentOwner.assign_date)}</p>
                                                        </div>
                                                        <div>
                                                            <Label className="text-gray-500">Status</Label>
                                                            <p className="font-medium">{currentOwner.status ?? 'Active'}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="text-center py-8">
                                                    <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                                    <p className="text-gray-500">No current assignment</p>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>

                                    <Card>
                                        <CardHeader>
                                            <CardTitle>Update Assignment</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <Label>Employee</Label>
                                                    <div className="relative">
                                                        <Input
                                                            placeholder="Search employee..."
                                                            value={employeeSearch}
                                                            onChange={(e) => setEmployeeSearch(e.target.value)}
                                                            className="pr-10"
                                                        />
                                                        <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                    </div>
                                                    {employeeSearch && filteredEmployees.length > 0 && (
                                                        <div className="mt-2 border rounded-md max-h-32 overflow-y-auto">
                                                            {filteredEmployees.slice(0, 5).map((emp) => (
                                                                <div
                                                                    key={emp.id}
                                                                    className="p-2 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                                                                    onClick={() => {
                                                                        setSelectedEmployee(emp);
                                                                        setEmployeeSearch(emp.name);
                                                                    }}
                                                                >
                                                                    <div className="font-medium">{emp.name}</div>
                                                                    <div className="text-sm text-gray-500">{emp.department?.name}</div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>

                                                <div>
                                                    <Label>Department</Label>
                                                    <select
                                                        className="w-full p-2 border rounded-md"
                                                        value={updateOwnerData.departmentId}
                                                        onChange={(e) => setUpdateOwnerData({...updateOwnerData, departmentId: e.target.value})}
                                                    >
                                                        <option value="">Select Department</option>
                                                        {departments.map((dept) => (
                                                            <option key={dept.id} value={dept.id}>{dept.name}</option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div>
                                                    <Label>Cost Center</Label>
                                                    <select
                                                        className="w-full p-2 border rounded-md"
                                                        value={updateOwnerData.costcenterId}
                                                        onChange={(e) => setUpdateOwnerData({...updateOwnerData, costcenterId: e.target.value})}
                                                    >
                                                        <option value="">Select Cost Center</option>
                                                        {costCenters.map((cc) => (
                                                            <option key={cc.id} value={cc.id}>{cc.name}</option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div>
                                                    <Label>Location</Label>
                                                    <select
                                                        className="w-full p-2 border rounded-md"
                                                        value={updateOwnerData.locationId}
                                                        onChange={(e) => setUpdateOwnerData({...updateOwnerData, locationId: e.target.value})}
                                                    >
                                                        <option value="">Select Location</option>
                                                        {locations.map((loc) => (
                                                            <option key={loc.id} value={loc.id}>{loc.name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>

                                            <div className="flex gap-2 pt-4">
                                                <Button onClick={handleUpdateOwner} disabled={!selectedEmployee}>
                                                    <Save className="w-4 h-4 mr-2" />
                                                    Update Assignment
                                                </Button>
                                                <Button 
                                                    variant="outline" 
                                                    onClick={() => {
                                                        setSelectedEmployee(null);
                                                        setEmployeeSearch('');
                                                        setUpdateOwnerData({
                                                            departmentId: '',
                                                            costcenterId: '',
                                                            locationId: '',
                                                            assignDate: new Date().toISOString().split('T')[0]
                                                        });
                                                    }}
                                                >
                                                    Clear
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>

                                {/* Right column: owner history timeline */}
                                <div>
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>Owner Movement History</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            {asset?.owner && asset.owner.length > 0 ? (
                                                <ul className="relative border-l border-gray-200">
                                                    {asset.owner.map((o: any, idx: number) => {
                                                        const isCurrent = idx === (asset.owner.length - 1);
                                                        const date = o.effective_date ?? o.assigndate ?? o.assign_date;
                                                        return (
                                                            <li key={idx} className="mb-6 ml-6">
                                                                <span className={`absolute -left-3.5 mt-1 h-3.5 w-3.5 rounded-full ${isCurrent ? 'bg-blue-600' : 'bg-gray-400'}`} />
                                                                <div className="flex items-start justify-between">
                                                                    <div>
                                                                        <div className="font-semibold">{o.name ?? o.employee?.name}</div>
                                                                        <div className="text-sm text-gray-500">{o.department ?? o.department?.name} • {o.costcenter ?? o.costcenter?.name} • {o.location ?? o.location?.name}</div>
                                                                        {o.email && <div className="text-xs text-gray-400 mt-1">{o.email}</div>}
                                                                    </div>
                                                                    <div className="text-sm text-gray-500 text-right">
                                                                        <div>{formatDate(date)}</div>
                                                                        {isCurrent && <Badge variant="default" className="mt-1">Current</Badge>}
                                                                    </div>
                                                                </div>
                                                            </li>
                                                        );
                                                    })}
                                                </ul>
                                            ) : (
                                                <div className="text-center py-8">
                                                    <History className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                                    <p className="text-gray-500">No assignment history found</p>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                </div>
                            </div>
                        )}

                        {activeTab === 'maintenance' && (
                            <div className="space-y-6">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-lg font-semibold">Maintenance Records</h3>
                                    <Badge variant="secondary">{analytics.maintenanceCount} records</Badge>
                                </div>
                                
                                {loadingMaintenance ? (
                                    <div className="text-center py-8">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                                        <p className="mt-2 text-gray-500">Loading maintenance records...</p>
                                    </div>
                                ) : maintenanceRecords.length > 0 ? (
                                    <div className="space-y-4 h-96 overflow-y-auto">
                                        {maintenanceRecords.map((record) => (
                                            <Card key={record.id}>
                                                <CardContent className="p-4">
                                                    <div className="flex justify-between items-start mb-3">
                                                        <div>
                                                            <h4 className="font-semibold">{record.description || 'Maintenance'}</h4>
                                                            <p className="text-sm text-gray-600">
                                                                {formatDate(record.maintenancedate || record.req_date)} • {record.maintenancetype || record.svc_type?.[0] || ''}
                                                            </p>
                                                        </div>
                                                        <Badge variant="outline">
                                                            {formatCurrency(record.cost ?? record.amount ?? 0)}
                                                        </Badge>
                                                    </div>
                                                    
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                                        <div>
                                                            <Label className="text-gray-500">Supplier</Label>
                                                            <p>{record.supplier?.name || 'N/A'}</p>
                                                        </div>
                                                        <div>
                                                            <Label className="text-gray-500">Mileage</Label>
                                                            <p>{record.mileage ? `${record.mileage.toLocaleString()} km` : 'N/A'}</p>
                                                        </div>
                                                        <div>
                                                            <Label className="text-gray-500">Technician</Label>
                                                            <p>{record.technicianname || 'N/A'}</p>
                                                        </div>
                                                        <div>
                                                            <Label className="text-gray-500">Status</Label>
                                                            <Badge variant={record.status === 'Completed' ? 'default' : 'secondary'}>
                                                                {record.status}
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                    
                                                    {record.notes && (
                                                        <div className="mt-3 pt-3 border-t">
                                                            <Label className="text-gray-500">Notes</Label>
                                                            <p className="text-sm mt-1">{record.notes}</p>
                                                        </div>
                                                    )}
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8">
                                        <Wrench className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                        <p className="text-gray-500">No maintenance records found</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'fuel' && (
                            <div className="space-y-6">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-lg font-semibold">Fuel Records</h3>
                                    <Badge variant="secondary">{analytics.fuelRecordCount} records</Badge>
                                </div>
                                
                                {loadingFuel ? (
                                    <div className="text-center py-8">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                                        <p className="mt-2 text-gray-500">Loading fuel records...</p>
                                    </div>
                                ) : fuelRecords.length > 0 ? (
                                    <div className="space-y-4 h-96 overflow-y-auto">
                                        {fuelRecords.map((record) => (
                                            <Card key={record.id}>
                                                <CardContent className="p-4">
                                                    <div className="flex justify-between items-start mb-3">
                                                        <div>
                                                            <h4 className="font-semibold flex items-center gap-2">
                                                                <Fuel className="w-4 h-4" />
                                                                {record.volume ?? '-'} L • {record.fueltype || ''}
                                                            </h4>
                                                            <p className="text-sm text-gray-600">
                                                                {formatDate(record.billdate || record.date)} • {record.supplier?.name || 'Unknown Supplier'}
                                                            </p>
                                                        </div>
                                                        <Badge variant="outline">
                                                            {formatCurrency(record.amount ?? 0)}
                                                        </Badge>
                                                    </div>
                                                    
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                                        <div>
                                                            <Label className="text-gray-500">Price per Liter</Label>
                                                            <p className="font-semibold">{(record.amount && record.volume) ? formatCurrency(record.amount / record.volume) : '-'}</p>
                                                        </div>
                                                        <div>
                                                            <Label className="text-gray-500">Mileage</Label>
                                                            <p>{record.mileage ? `${record.mileage.toLocaleString()} km` : 'N/A'}</p>
                                                        </div>
                                                        <div>
                                                            <Label className="text-gray-500">Station</Label>
                                                            <p>{record.station || 'N/A'}</p>
                                                        </div>
                                                        <div>
                                                            <Label className="text-gray-500">Receipt</Label>
                                                            <p>{record.receiptno || 'N/A'}</p>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8">
                                        <Fuel className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                        <p className="text-gray-500">No fuel records found</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* history merged into owner tab; no separate history tab */}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default DetailAsset;
