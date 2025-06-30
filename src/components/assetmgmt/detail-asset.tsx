'use client';
import React, { useEffect, useState } from "react";
import { authenticatedApi } from "@/config/api";
import { ChevronLeft, ChevronRight, Info, Settings, User, History, Monitor, ShoppingCart, Edit, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { useRouter } from "next/navigation";

interface DetailAssetProps {
    id: string;
}

const DetailAsset: React.FC<DetailAssetProps> = ({ id }) => {
    const router = useRouter();
    const [asset, setAsset] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [items, setItems] = useState<any[]>([]); // List of asset items for navigation
    const [currentIdx, setCurrentIdx] = useState<number>(-1);
    const [searchValue, setSearchValue] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');
    const [departments, setDepartments] = useState<any[]>([]);
    const [costCenters, setCostCenters] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [employeeSearchTerm, setEmployeeSearchTerm] = useState('');
    const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);

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
                setAsset(res.data?.data || null);
            } catch (e) {
                setError("Failed to fetch asset data.");
                setAsset(null);
            } finally {
                setLoading(false);
            }
        };
        fetchAsset();
    }, [id]);

    // Fetch departments and cost centers
    useEffect(() => {
        const fetchDepartments = async () => {
            try {
                const res = await authenticatedApi.get('/api/assets/departments') as any;
                setDepartments(res.data?.data || []);
            } catch (e) {
                console.error("Failed to fetch departments:", e);
            }
        };

        const fetchCostCenters = async () => {
            try {
                const res = await authenticatedApi.get('/api/assets/costcenters') as any;
                setCostCenters(res.data?.data || []);
            } catch (e) {
                console.error("Failed to fetch cost centers:", e);
            }
        };

        fetchDepartments();
        fetchCostCenters();
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

        const timeoutId = setTimeout(searchEmployees, 300); // Debounce search
        return () => clearTimeout(timeoutId);
    }, [employeeSearchTerm]);

    // Initialize employee search term with full_name when purchasing data and employees are loaded
    useEffect(() => {
        if (asset?.ramco_id && employees.length > 0 && !employeeSearchTerm) {
            const employee = employees.find(emp => emp.ramco_id === asset.ramco_id);
            if (employee) {
                setEmployeeSearchTerm(employee.full_name);
            }
        }
    }, [asset, employees, employeeSearchTerm]);

    // Autocomplete search for serial number
    useEffect(() => {
        if (searchValue.length < 2) {
            setSearchResults([]);
            setShowDropdown(false);
            return;
        }
        const results = items.filter((item: any) => {
            const serialMatch = item.serial_number && item.serial_number.toLowerCase().includes(searchValue.toLowerCase());
            const brandMatch = item.brands?.name && item.brands.name.toLowerCase().includes(searchValue.toLowerCase());
            const modelMatch = item.models?.name && item.models.name.toLowerCase().includes(searchValue.toLowerCase());
            return serialMatch || brandMatch || modelMatch;
        });
        setSearchResults(results);
        setShowDropdown(results.length > 0);
    }, [searchValue, items]);

    if (loading) return (
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
                            placeholder="Search serial number..."
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
                                        <div className="text-xs text-gray-500">{item.types?.name || '-'}</div>
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
            <div className="p-8 text-gray-400">Loading asset...</div>
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
        <div className="w-full">
            {/* Navbar */}
            <div className="flex items-center justify-between bg-gradient-to-b from-gray-200 to-gray-100 rounded shadow px-4 py-3 mb-6">
                <div className="flex items-center gap-4">
                    <span className="text-lg font-semibold">Asset Detail</span>
                </div>
                <div className="flex items-center gap-2 relative">
                    <div className="w-64 relative">
                        <Input
                            type="text"
                            placeholder="Search serial number..."
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
                        variant="ghost"
                        size="icon"
                        className="rounded-full border border-gray-300 dark:border-neutral-700"
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
            {/* Modern Tabbed Layout */}
            <div className="max-w-7xl mx-auto px-4 space-y-6">

                {/* Hero Section - Asset Overview */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="relative bg-gradient-to-br from-blue-100 via-purple-200 to-pink-50 px-8 py-6 border-0 shadow-lg rounded-2xl">
                        <div className="flex flex-col lg:flex-row gap-8 items-start">
                            {/* Asset Image */}
                            <div className="flex-shrink-0">
                                <div className="w-48 h-48 bg-white rounded-xl shadow-sm border border-gray-200 flex items-center justify-center overflow-hidden">
                                    {asset.image_url ? (
                                        <img
                                            src={asset.image_url}
                                            alt="Asset Image"
                                            className="object-contain w-full h-full p-4"
                                        />
                                    ) : (
                                        <div className="text-center text-gray-400">
                                            <Monitor className="w-16 h-16 mx-auto mb-2" />
                                            <span className="text-sm">No Image</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Asset Key Info */}
                            <div className="flex-1 space-y-4">
                                <div>
                                    <h1 className="text-3xl font-bold text-gray-900 mb-2">{asset.serial_number}</h1>
                                    <div className="flex flex-wrap items-center gap-3">
                                        <span className="text-lg text-gray-600">{asset.types?.name || 'Unknown Type'}</span>
                                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${asset.status === 'active' ? 'bg-green-100 text-green-800' :
                                            asset.status === 'disposed' ? 'bg-red-100 text-red-800' :
                                                'bg-gray-100 text-gray-800'
                                            }`}>
                                            {asset.status || 'Unknown'}
                                        </span>
                                    </div>
                                </div>

                                {/* Key Metrics Grid */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {[
                                        'bg-blue-100',
                                        'bg-indigo-200',
                                        'bg-sky-200',
                                        'bg-green-100',
                                    ].map((bg, idx) => {
                                        const cardData = [
                                            {
                                                label: 'Asset Code',
                                                value: asset.asset_code,
                                            },
                                            {
                                                label: 'Year',
                                                value: asset.year || '-',
                                            },
                                            {
                                                label: 'Unit Price',
                                                value: asset.unit_price || '-',
                                            },
                                            {
                                                label: 'Netbook Value',
                                                value: (() => {
                                                    const price = parseFloat(asset.unit_price);
                                                    const rate = parseFloat(asset.depreciation_rate);
                                                    const years = parseFloat(asset.depreciation_length);
                                                    if (isNaN(price) || isNaN(rate) || isNaN(years) || price <= 0 || rate <= 0 || years <= 0) return '-';
                                                    const annualDep = price * (rate / 100);
                                                    const netbook = price - (annualDep * years);
                                                    return netbook > 0 ? netbook.toLocaleString(undefined, { style: 'currency', currency: 'MYR' }) : '0';
                                                })(),
                                            },
                                        ];
                                        return (
                                            <div
                                                key={cardData[idx].label}
                                                className={`rounded-lg p-4 shadow-lg text-gray-900 transition-colors duration-300 ${bg}`}
                                            >
                                                <p className="text-xs text-gray-700 uppercase tracking-wide font-medium">{cardData[idx].label}</p>
                                                <p className="text-lg font-bold mt-1">{cardData[idx].value}</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="border-b border-gray-200">
                        <nav className="flex space-x-8 px-6" aria-label="Tabs">
                            {[
                                { id: 'overview', name: 'Overview', icon: Info, count: null },
                                { id: 'specifications', name: 'Specifications', icon: Settings, count: asset.specs ? Object.keys(asset.specs).filter(key => asset.specs[key] && key !== 'id').length : 0 },
                                { id: 'owner', name: 'Owner Info', icon: User, count: asset.owner?.length || 0 },
                                { id: 'history', name: 'History', icon: History, count: asset.owner?.length > 1 ? asset.owner.length - 1 : 0 }
                            ].map((tab) => {
                                const Icon = tab.icon;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`${activeTab === tab.id
                                            ? 'border-black text-white bg-black'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                            } whitespace-nowrap py-2 px-3 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors`}
                                    >
                                        <Icon className="w-4 h-4" />
                                        {tab.name}
                                        {tab.count !== null && tab.count > 0 && (
                                            <span className={`inline-flex items-center justify-center px-2.5 py-0.5 text-xs font-medium rounded-full ${activeTab === tab.id ? 'bg-gray-50 text-black' : 'bg-gray-200 text-gray-600'
                                                }`}>
                                                {tab.count}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </nav>
                    </div>

                    {/* Tab Content */}
                    <div className="p-6">
                        {/* Overview Tab */}
                        {activeTab === 'overview' && (
                            <div className="space-y-6">
                                <h2 className="text-xl font-semibold text-gray-900 mb-4">Asset Information</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-sm font-medium text-gray-500">Finance Tag</label>
                                            <p className="text-base text-gray-900 mt-1">{asset.finance_tag || '-'}</p>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-gray-500">Cost Center</label>
                                            <p className="text-base text-gray-900 mt-1">{asset.cost_center || '-'}</p>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-sm font-medium text-gray-500">Classification</label>
                                            <p className="text-base text-gray-900 mt-1">{asset.classification || '-'}</p>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-gray-500">Depreciation Length</label>
                                            <p className="text-base text-gray-900 mt-1">{asset.depreciation_length || '-'} years</p>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-sm font-medium text-gray-500">Depreciation Rate</label>
                                            <p className="text-base text-gray-900 mt-1">{asset.depreciation_rate || '-'}%</p>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-gray-500">Disposed Date</label>
                                            <p className="text-base text-gray-900 mt-1">{
                                                asset.status === 'active' ||
                                                    !asset.disposed_date ||
                                                    asset.disposed_date === '0000-00-00' ||
                                                    asset.disposed_date === '0000-00-00T00:00:00.000Z' ||
                                                    asset.disposed_date === '1899-11-29T17:04:35.000Z'
                                                    ? '-'
                                                    : (() => {
                                                        const d = new Date(asset.disposed_date);
                                                        return isNaN(d.getTime()) ? '-' : d.toLocaleDateString();
                                                    })()
                                            }</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Specifications Tab */}
                        {activeTab === 'specifications' && (
                            <div className="space-y-6">
                                <h2 className="text-xl font-semibold text-gray-900 mb-4">Technical Specifications</h2>
                                {asset.specs ? (
                                    <div className="space-y-8">
                                        {/* Basic Specs */}
                                        <div>
                                            <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                <div>
                                                    <label className="text-sm font-medium text-gray-500">Category</label>
                                                    <p className="text-base text-gray-900 mt-1">{asset.specs?.categories?.name || asset.categories?.name || '-'}</p>
                                                </div>
                                                <div>
                                                    <label className="text-sm font-medium text-gray-500">Brand</label>
                                                    <p className="text-base text-gray-900 mt-1">{asset.specs?.brands?.name || asset.brands?.name || '-'}</p>
                                                </div>
                                                <div>
                                                    <label className="text-sm font-medium text-gray-500">Model</label>
                                                    <p className="text-base text-gray-900 mt-1">{asset.specs?.models?.name || asset.models?.name || '-'}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Computer Specs */}
                                        {(asset.specs.cpu || asset.specs.memory_size || asset.specs.storage_size || asset.specs.os) && (
                                            <div>
                                                <h3 className="text-lg font-medium text-gray-900 mb-4">Computer Specifications</h3>
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                    {asset.specs.cpu && (
                                                        <div>
                                                            <label className="text-sm font-medium text-gray-500">CPU</label>
                                                            <p className="text-base text-gray-900 mt-1">{asset.specs.cpu}</p>
                                                        </div>
                                                    )}
                                                    {asset.specs.cpu_generation && (
                                                        <div>
                                                            <label className="text-sm font-medium text-gray-500">CPU Generation</label>
                                                            <p className="text-base text-gray-900 mt-1">{asset.specs.cpu_generation}</p>
                                                        </div>
                                                    )}
                                                    {asset.specs.memory_size && (
                                                        <div>
                                                            <label className="text-sm font-medium text-gray-500">Memory (GB)</label>
                                                            <p className="text-base text-gray-900 mt-1">{asset.specs.memory_size}</p>
                                                        </div>
                                                    )}
                                                    {asset.specs.storage_size && (
                                                        <div>
                                                            <label className="text-sm font-medium text-gray-500">Storage (GB)</label>
                                                            <p className="text-base text-gray-900 mt-1">{asset.specs.storage_size}</p>
                                                        </div>
                                                    )}
                                                    {asset.specs.os && (
                                                        <div>
                                                            <label className="text-sm font-medium text-gray-500">Operating System</label>
                                                            <p className="text-base text-gray-900 mt-1">{asset.specs.os}</p>
                                                        </div>
                                                    )}
                                                    {asset.specs.screen_size && (
                                                        <div>
                                                            <label className="text-sm font-medium text-gray-500">Screen Size</label>
                                                            <p className="text-base text-gray-900 mt-1">{asset.specs.screen_size}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Vehicle Specs */}
                                        {(asset.specs.transmission || asset.specs.fuel_type || asset.specs.chassis_no || asset.specs.engine_no) && (
                                            <div>
                                                <h3 className="text-lg font-medium text-gray-900 mb-4">Vehicle Specifications</h3>
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                    {asset.specs.transmission && (
                                                        <div>
                                                            <label className="text-sm font-medium text-gray-500">Transmission</label>
                                                            <p className="text-base text-gray-900 mt-1">{asset.specs.transmission}</p>
                                                        </div>
                                                    )}
                                                    {asset.specs.fuel_type && (
                                                        <div>
                                                            <label className="text-sm font-medium text-gray-500">Fuel Type</label>
                                                            <p className="text-base text-gray-900 mt-1">{asset.specs.fuel_type}</p>
                                                        </div>
                                                    )}
                                                    {asset.specs.cubic_meter && (
                                                        <div>
                                                            <label className="text-sm font-medium text-gray-500">Cubic Meter</label>
                                                            <p className="text-base text-gray-900 mt-1">{asset.specs.cubic_meter}</p>
                                                        </div>
                                                    )}
                                                    {asset.specs.chassis_no && (
                                                        <div>
                                                            <label className="text-sm font-medium text-gray-500">Chassis Number</label>
                                                            <p className="text-base text-gray-900 mt-1">{asset.specs.chassis_no}</p>
                                                        </div>
                                                    )}
                                                    {asset.specs.engine_no && (
                                                        <div>
                                                            <label className="text-sm font-medium text-gray-500">Engine Number</label>
                                                            <p className="text-base text-gray-900 mt-1">{asset.specs.engine_no}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Software Specs */}
                                        {(asset.specs.microsoft_office || asset.specs.antivirus || asset.specs.additional_software) && (
                                            <div>
                                                <h3 className="text-lg font-medium text-gray-900 mb-4">Software Information</h3>
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                    {asset.specs.microsoft_office && (
                                                        <div>
                                                            <label className="text-sm font-medium text-gray-500">Microsoft Office</label>
                                                            <p className="text-base text-gray-900 mt-1">{asset.specs.microsoft_office}</p>
                                                        </div>
                                                    )}
                                                    {asset.specs.antivirus && (
                                                        <div>
                                                            <label className="text-sm font-medium text-gray-500">Antivirus</label>
                                                            <p className="text-base text-gray-900 mt-1">{asset.specs.antivirus}</p>
                                                        </div>
                                                    )}
                                                    {asset.specs.additional_software && (
                                                        <div className="md:col-span-2 lg:col-span-3">
                                                            <label className="text-sm font-medium text-gray-500">Additional Software</label>
                                                            <p className="text-base text-gray-900 mt-1">{asset.specs.additional_software}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Installed Software for Computers */}
                                        {asset.types?.type_id === 1 && Array.isArray(asset.specs.installed_software) && asset.specs.installed_software.length > 0 && (
                                            <div>
                                                <h3 className="text-lg font-medium text-gray-900 mb-4">Installed Software</h3>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {asset.specs.installed_software.map((sw: any) => (
                                                        <div key={sw.id} className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border">
                                                            <div className="w-3 h-3 bg-green-500 rounded-full flex-shrink-0"></div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-medium text-gray-900 truncate">{sw.name}</p>
                                                                <p className="text-xs text-gray-500">
                                                                    {sw.installed_at ? new Date(sw.installed_at).toLocaleDateString() : 'Installation date unknown'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-center text-gray-400 py-12">
                                        <Settings className="w-16 h-16 mx-auto mb-4" />
                                        <p className="text-lg">No specifications available</p>
                                    </div>
                                )}
                            </div>)}

                        {/* Owner Tab */}
                        {activeTab === 'owner' && (
                            <div className="space-y-6">
                                <h2 className="text-xl font-semibold text-gray-900 mb-4">Current Owner</h2>
                                {asset.owner && asset.owner.length > 0 ? (
                                    <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl p-6 border border-emerald-200">
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                            <div>
                                                <label className="text-sm font-medium text-emerald-600">Name</label>
                                                <p className="text-lg font-semibold text-gray-900 mt-1">{asset.owner[asset.owner.length - 1].name}</p>
                                            </div>
                                            <div>
                                                <label className="text-sm font-medium text-emerald-600">Department</label>
                                                <p className="text-base text-gray-900 mt-1">{asset.owner[asset.owner.length - 1].department || '-'}</p>
                                            </div>
                                            <div>
                                                <label className="text-sm font-medium text-emerald-600">District</label>
                                                <p className="text-base text-gray-900 mt-1">{asset.owner[asset.owner.length - 1].district || '-'}</p>
                                            </div>
                                            <div>
                                                <label className="text-sm font-medium text-emerald-600">Cost Center</label>
                                                <p className="text-base text-gray-900 mt-1">{asset.owner[asset.owner.length - 1].cost_center || '-'}</p>
                                            </div>
                                            <div>
                                                <label className="text-sm font-medium text-emerald-600">Effective Date</label>
                                                <p className="text-base text-gray-900 mt-1">{asset.owner[asset.owner.length - 1].effective_date ? new Date(asset.owner[asset.owner.length - 1].effective_date).toLocaleDateString() : '-'}</p>
                                            </div>
                                            <div>
                                                <label className="text-sm font-medium text-emerald-600">Ramco ID</label>
                                                <p className="text-base text-gray-900 mt-1">{asset.owner[asset.owner.length - 1].ramco_id || '-'}</p>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center text-gray-400 py-12">
                                        <User className="w-16 h-16 mx-auto mb-4" />
                                        <p className="text-lg">No owner information available</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* History Tab */}
                        {activeTab === 'history' && (
                            <div className="space-y-6">
                                <h2 className="text-xl font-semibold text-gray-900 mb-4">Ownership History</h2>
                                {asset.owner && asset.owner.length > 1 ? (
                                    <div className="space-y-4">
                                        {asset.owner
                                            .slice(0, -1)
                                            .slice()
                                            .reverse()
                                            .map((o: any, idx: number) => (
                                                <div key={o.id || idx} className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                                                    <div className="flex items-center gap-3 mb-4">
                                                        <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                                                        <span className="text-sm font-medium text-gray-600">
                                                            {o.effective_date ? new Date(o.effective_date).toLocaleDateString() : 'Date unknown'}
                                                        </span>
                                                    </div>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                        <div>
                                                            <label className="text-sm font-medium text-gray-500">Name</label>
                                                            <p className="text-base text-gray-900 mt-1">{o.name || '-'}</p>
                                                        </div>
                                                        <div>
                                                            <label className="text-sm font-medium text-gray-500">Department</label>
                                                            <p className="text-base text-gray-900 mt-1">{o.department || '-'}</p>
                                                        </div>
                                                        <div>
                                                            <label className="text-sm font-medium text-gray-500">District</label>
                                                            <p className="text-base text-gray-900 mt-1">{o.district || '-'}</p>
                                                        </div>
                                                        <div>
                                                            <label className="text-sm font-medium text-gray-500">Cost Center</label>
                                                            <p className="text-base text-gray-900 mt-1">{o.cost_center || '-'}</p>
                                                        </div>
                                                        <div>
                                                            <label className="text-sm font-medium text-gray-500">Ramco ID</label>
                                                            <p className="text-base text-gray-900 mt-1">{o.ramco_id || '-'}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                ) : (
                                    <div className="text-center text-gray-400 py-12">
                                        <History className="w-16 h-16 mx-auto mb-4" />
                                        <p className="text-lg">No ownership history available</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DetailAsset;
