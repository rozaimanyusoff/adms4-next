'use client';
import React, { useState, useContext, useEffect } from "react";
import { AuthContext } from "@/store/AuthContext";
import ActionSidebar from "@/components/ui/action-aside";
import { authenticatedApi } from "@/config/api";
import { CirclePlus, CarIcon, ComputerIcon, LucideComputer, User, X, ChevronDown } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

// Types for form structure
interface Requestor {
    name: string;
    staffId: string;
    designation: string;
    typeOfChange: 'Staff' | 'Asset' | 'Non-Asset';
}
interface StaffTransfer {
    name: string;
    staffId: string;
    effectiveDate: string;
}
interface AssetTransferDetails {
    ownerName: string;
    ownerStaffId: string;
    location: string;
    costCenter: string;
    condition: string;
    brandModel: string;
    serialNo: string;
}
interface AssetTransfer {
    effectiveDate: string;
    current: AssetTransferDetails;
    new: AssetTransferDetails;
}
interface Reason {
    temporary: boolean;
    departmentRestructure: boolean;
    upgrading: boolean;
    resignation: boolean;
    relocation: boolean;
    others: boolean;
    othersText: string;
    disposal: boolean;
}
interface AssetTransferFormState {
    requestor: Requestor;
    staffTransfer: StaffTransfer;
    assetTransfer: AssetTransfer;
    reason: Reason;
}

// Update interfaces for new API structure
interface Department {
    id: number;
    name: string;
}
interface Position {
    id: number;
    name: string;
}

interface Employee {
    id: number;
    ramco_id: string;
    full_name: string;
    email: string | null;
    contact: string | null;
    department: Department | null;
    position?: Position | null;
}
interface Asset {
    id: number;
    entry_code: string;
    asset_code: string;
    classification: string;
    finance_tag: string | null;
    serial_number: string;
    dop: string;
    year: string;
    unit_price: string | null;
    depreciation_length: number;
    depreciation_rate: string;
    cost_center: string;
    item_code: string;
    type_id: { id: number; name: string };
    status: string;
    disposed_date: string | null;
    category_id: { id: number; name: string };
    brand_id: { id: number; name: string };
    model_id: { id: number; name: string };
    owner?: Employee; // Added to fix property 'owner' does not exist on type 'Asset'
}
interface SupervisedGroup {
    employee: Employee[];
    assets: Asset[];
}

const initialForm: AssetTransferFormState = {
    requestor: {
        name: "",
        staffId: "",
        designation: "",
        typeOfChange: "Asset",
    },
    staffTransfer: {
        name: "",
        staffId: "",
        effectiveDate: "",
    },
    assetTransfer: {
        effectiveDate: "",
        current: {
            ownerName: "",
            ownerStaffId: "",
            location: "",
            costCenter: "",
            condition: "",
            brandModel: "",
            serialNo: "",
        },
        new: {
            ownerName: "",
            ownerStaffId: "",
            location: "",
            costCenter: "",
            condition: "",
            brandModel: "",
            serialNo: "",
        },
    },
    reason: {
        temporary: false,
        departmentRestructure: false,
        upgrading: false,
        resignation: false,
        relocation: false,
        others: false,
        othersText: "",
        disposal: false,
    },
};

export default function AssetTransferForm() {
    const [form, setForm] = useState<AssetTransferFormState>(initialForm);
    const authContext = useContext(AuthContext);
    const user = authContext?.authData?.user;
    // For multiple assets/employees
    const [selectedItems, setSelectedItems] = useState<any[]>([]);
    // Supervisor asset/employee fetch
    const [supervised, setSupervised] = useState<SupervisedGroup[]>([]);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [assetSearch, setAssetSearch] = useState("");
    const [employeeSearch, setEmployeeSearch] = useState("");
    // Split selectedItems into assets and employees
    const selectedAssets = selectedItems.filter(item => item.serial_number || item.asset_code);
    const selectedEmployees = selectedItems.filter(item => item.full_name || item.ramco_id);
    const [sidebarTab, setSidebarTab] = useState<'assets' | 'employees'>('assets');
    const [dateRequest, setDateRequest] = useState(new Date().toISOString().slice(0,16));

    useEffect(() => {
        if (user) {
            setForm(prev => ({
                ...prev,
                requestor: {
                    ...prev.requestor,
                    name: user.name || prev.requestor.name,
                    staffId: user.username || user.email || prev.requestor.staffId,
                },
            }));
        }
    }, [user]);

    useEffect(() => {
        async function fetchSupervised() {
            if (!user) return;
            const param = user.username ? `ramco_id=${user.username}` : user.email ? `email=${user.email}` : '';
            if (!param) return;
            try {
                const res: any = await authenticatedApi.get(`/api/assets/by-supervisor?${param}`);
                const data: SupervisedGroup[] = res.data?.data || [];
                setSupervised(data);
            } catch {
                setSupervised([]);
            }
        }
        fetchSupervised();
    }, [user]);

    function addSelectedItem(item: any) {
        setSelectedItems(prev => [...prev, item]);
    }
    function removeSelectedItem(idx: number) {
        setSelectedItems(prev => prev.filter((_, i) => i !== idx));
    }

    // Top-level keys for form
    type Section = keyof AssetTransferFormState;
    // For assetTransfer sub-sections
    type AssetTransferSubSection = 'current' | 'new';
    // For assetTransferDetails fields
    type AssetTransferDetailsField = keyof AssetTransferDetails;
    // For reason fields
    type ReasonField = keyof Reason;
    // For requestor fields
    type RequestorField = keyof Requestor;
    // For staffTransfer fields
    type StaffTransferField = keyof StaffTransfer;
    // For assetTransfer fields
    type AssetTransferField = keyof AssetTransfer;

    // Type-safe handleInput
    function handleInput(
        section: 'requestor',
        field: RequestorField,
        value: string
    ): void;
    function handleInput(
        section: 'staffTransfer',
        field: StaffTransferField,
        value: string
    ): void;
    function handleInput(
        section: 'assetTransfer',
        field: AssetTransferField,
        value: string
    ): void;
    function handleInput(
        section: 'assetTransfer',
        field: AssetTransferDetailsField,
        value: string,
        subSection: AssetTransferSubSection
    ): void;
    function handleInput(
        section: 'reason',
        field: ReasonField,
        value: string
    ): void;
    function handleInput(
        section: Section,
        field: string,
        value: string,
        subSection?: string
    ) {
        setForm((prev) => {
            if (section === 'assetTransfer' && (subSection === 'current' || subSection === 'new')) {
                return {
                    ...prev,
                    assetTransfer: {
                        ...prev.assetTransfer,
                        [subSection]: {
                            ...prev.assetTransfer[subSection],
                            [field]: value,
                        },
                    },
                };
            }
            return {
                ...prev,
                [section]: {
                    ...prev[section],
                    [field]: value,
                },
            };
        });
    }

    function handleReasonChange(field: ReasonField) {
        setForm((prev) => ({
            ...prev,
            reason: {
                ...prev.reason,
                [field]: !prev.reason[field],
            },
        }));
    }

    return (
        <div className="mt-4">
            <h2 className="text-xl font-bold mb-4">Asset Transfer Form</h2>
            <form className="w-full mx-auto bg-white p-6 rounded shadow-md text-sm space-y-6">
                {/* 1. Requestor Details */}
                <fieldset className="border rounded p-4">
                    <legend className="font-semibold">Requestor</legend>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-2">
                        <div>
                            <label className="block font-medium">Name</label>
                            <input type="text" className="input" value={form.requestor.name} readOnly />
                        </div>
                        <div>
                            <label className="block font-medium">Staff ID</label>
                            <input type="text" className="input" value={form.requestor.staffId} readOnly />
                        </div>
                        <div>
                            <label className="block font-medium">Designation</label>
                            <input type="text" className="input" value={form.requestor.designation} onChange={e => handleInput('requestor', 'designation', e.target.value)} />
                        </div>
                        <div>
                            <label className="block font-medium">Date Request</label>
                            <input type="datetime-local" className="input" value={dateRequest} onChange={e => setDateRequest(e.target.value)} />
                        </div>
                    </div>
                </fieldset>

                {/* 2. Select Items (Button to open ActionSidebar) */}
                <fieldset className="border rounded p-4">
                    <legend className="font-semibold flex items-center gap-2">
                        Selected Items
                        <button type="button" onClick={() => setSidebarOpen(true)} className="ml-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full p-1" title="Add Items">
                            <CirclePlus className="w-4.5 h-4.5" />
                        </button>
                    </legend>
                    {selectedItems.length === 0 ? (
                        <div className="text-gray-400 text-center py-8">No items selected.</div>
                    ) : (
                        <div className="mt-2">
                            {selectedItems.map((item, idx) => {
                                const isEmployee = !!(item.full_name || item.ramco_id);
                                const typeLabel = isEmployee ? 'Employee' : 'Asset';
                                return (
                                    <details key={item.id || item.ramco_id || idx} className="mb-2 bg-gray-100 rounded group">
                                        <summary className="flex items-center gap-2 px-2 py-1 cursor-pointer select-none">
                                            <ChevronDown className="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform" />
                                            <span className="text-xs font-semibold text-blue-600 min-w-[70px] text-left">{typeLabel}</span>
                                            <span className="flex-1 font-medium">
                                              {isEmployee ? (
                                                <span>{item.full_name || item.name || item.staffId}</span>
                                              ) : (
                                                <>
                                                  <span>S/N: {item.serial_number || item.asset_code}</span>
                                                  {item.type_id?.name && (
                                                    <span className="ml-2 text-xs text-gray-500">[{item.type_id.name}]</span>
                                                  )}
                                                </>
                                              )}
                                            </span>
                                            <button type="button" className="ml-2 text-red-500" onClick={e => { e.stopPropagation(); removeSelectedItem(idx); }}>
                                                <X className="w-5 h-5" />
                                            </button>
                                        </summary>
                                        <div className="px-4 py-2 space-y-6">
                                          {/* Asset Details (only for Asset) */}
                                          {!isEmployee && (
                                            <>
                                              <div className="mb-2">
                                                <div className="font-semibold mb-1">Asset Details</div>
                                                <div className="flex gap-8 text-sm text-gray-700">
                                                  <div>Category: <span className="font-medium">{item.category_id?.name || '-'}</span></div>
                                                  <div>Brand: <span className="font-medium">{item.brand_id?.name || '-'}</span></div>
                                                  <div>Model: <span className="font-medium">{item.model_id?.name || '-'}</span></div>
                                                  <div className="flex">Condition: <span className="font-medium"> </span>
                                                    <label className="ml-2 inline-flex items-center gap-2"><input type="checkbox" className="w-4.5 h-4.5" name="condition-new" /> New</label>
                                                    <label className="ml-2 inline-flex items-center gap-2"><input type="checkbox" className="w-4.5 h-4.5" name="condition-used" /> Used</label>
                                                  </div>
                                                </div>
                                              </div>
                                              <hr className="my-2 border-gray-300" />
                                            </>
                                          )}
                                          {/* Transfer Details */}
                                          <div>
                                            <div className="font-semibold mb-2">Transfer Details</div>
                                            <div className="grid grid-cols-3 gap-4 items-start">
                                              <div className="space-y-2">
                                                <div className="flex items-center gap-2"><input type="checkbox" className="w-4.5 h-4.5" />Owner</div>
                                                <div className="flex items-center gap-2"><input type="checkbox" className="w-4.5 h-4.5" />Cost Center</div>
                                                <div className="flex items-center gap-2"><input type="checkbox" className="w-4.5 h-4.5" />Department</div>
                                                <div className="flex items-center gap-2"><input type="checkbox" className="w-4.5 h-4.5" />Location (District)</div>
                                              </div>
                                              <div className="space-y-2 text-gray-500">
                                                <div><input type="text" className="input" placeholder="Current Owner" /></div>
                                                <div><input type="text" className="input" placeholder="Current Cost Center" /></div>
                                                <div><input type="text" className="input" placeholder="Current Department" /></div>
                                                <div><input type="text" className="input" placeholder="Current Location (District)" /></div>
                                              </div>
                                              <div className="space-y-2 text-gray-500">
                                                <div><input type="text" className="input" placeholder="New Owner" /></div>
                                                <div><input type="text" className="input" placeholder="New Cost Center" /></div>
                                                <div><input type="text" className="input" placeholder="New Department" /></div>
                                                <div><input type="text" className="input" placeholder="New Location (District)" /></div>
                                              </div>
                                            </div>
                                            <div className="mt-4">
                                              <label className="block font-medium">Effective Date</label>
                                              <input type="date" className="input" />
                                            </div>
                                          </div>
                                          <hr className="my-2 border-gray-300" />
                                          {/* Reason for Transfer */}
                                          <div>
                                            <div className="font-semibold mb-2">Reason for Transfer</div>
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                              <label className="inline-flex items-center gap-2"><input type="checkbox" className="w-4.5 h-4.5" disabled /> Temporary Assignment (&lt; 30 days)</label>
                                              <label className="flex items-center gap-2"><input type="checkbox" className="w-4.5 h-4.5" disabled /> Upgrading/Promotion</label>
                                              <label className="flex items-center gap-2"><input type="checkbox" className="w-4.5 h-4.5" /> Department Restructure</label>
                                              <label className="flex items-center gap-2"><input type="checkbox" className="w-4.5 h-4.5" /> Resignation</label>
                                              <label className="flex items-center gap-2"><input type="checkbox" className="w-4.5 h-4.5" /> Relocation</label>
                                              <label className="flex items-center gap-2"><input type="checkbox" className="w-4.5 h-4.5" /> Disposal</label>
                                              <label className="flex items-center gap-2"><input type="checkbox" className="w-4.5 h-4.5" /> Others <input type="text" className="input ml-2" placeholder="Please specify..." /></label>
                                            </div>
                                          </div>
                                          <hr className="my-2 border-gray-300" />
                                          {/* Attachments */}
                                          <div>
                                            <div className="font-semibold mb-2">Attachments</div>
                                            <input type="file" className="input" multiple />
                                          </div>
                                        </div>
                                    </details>
                                );
                            })}
                        </div>
                    )}
                    {sidebarOpen && (
                        <ActionSidebar
                            title="Add Items"
                            content={
                                <Tabs defaultValue="employees" className="w-full">
                                    <TabsList className="mb-4">
                                        <TabsTrigger value="employees">Employees</TabsTrigger>
                                        <TabsTrigger value="assets">Assets</TabsTrigger>
                                    </TabsList>
                                    <TabsContent value="employees">
                                        <div className="mb-2 font-semibold">Employees</div>
                                        <input
                                            type="text"
                                            placeholder="Search employees..."
                                            className="border rounded px-2 py-1 w-full text-sm mb-2"
                                            value={employeeSearch}
                                            onChange={e => setEmployeeSearch(e.target.value)}
                                        />
                                        <ul className="space-y-0">
                                            {supervised.flatMap((group) =>
                                                (group.employee || [])
                                                    .filter(emp => {
                                                        if (!employeeSearch) return true;
                                                        const search = employeeSearch.toLowerCase();
                                                        return (
                                                            emp.full_name?.toLowerCase().includes(search) ||
                                                            emp.ramco_id?.toLowerCase().includes(search) ||
                                                            emp.email?.toLowerCase().includes(search) ||
                                                            emp.department?.name?.toLowerCase().includes(search)
                                                        );
                                                    })
                                                    .map((emp, idx, arr) => (
                                                        <React.Fragment key={emp.ramco_id}>
                                                            <li className="flex items-center gap-2 bg-gray-100 rounded px-3 py-2">
                                                                <CirclePlus className="text-blue-500 w-4.5 h-4.5 cursor-pointer" onClick={() => { addSelectedItem(emp); }} />
                                                                <User className="w-6 h-6 text-cyan-600 text-shadow-2xs" />
                                                                <div>
                                                                    <span>{emp.full_name} <span className="text-xs text-gray-500">({emp.ramco_id})</span></span>
                                                                    {emp.position?.name && (
                                                                        <div className="text-xs text-gray-600">{emp.position?.name}</div>
                                                                    )}
                                                                </div>
                                                            </li>
                                                            {idx < arr.length - 1 && <hr className="my-2 border-gray-300" />}
                                                        </React.Fragment>
                                                    ))
                                            )}
                                        </ul>
                                    </TabsContent>
                                    {/*  Assets Tab Content */}
                                    <TabsContent value="assets">
                                        {(() => {
                                            // Flatten all assets
                                            const allAssets = supervised.flatMap((group) => group.assets || []);
                                            // Count by type
                                            const typeCounts: Record<string, number> = {};
                                            allAssets.forEach(a => {
                                                const type = a.type_id?.name || 'Unknown';
                                                typeCounts[type] = (typeCounts[type] || 0) + 1;
                                            });
                                            const summary = Object.entries(typeCounts).map(([type, count]) => `${type}: ${count}`).join(' | ');
                                            return (
                                                <>
                                                    <div className="mb-2 font-semibold flex flex-col gap-2">
                                                        <span>Assets ({summary})</span>
                                                        <input
                                                            type="text"
                                                            placeholder="Search assets..."
                                                            className="border rounded px-2 py-1 w-full text-sm"
                                                            value={assetSearch}
                                                            onChange={e => setAssetSearch(e.target.value)}
                                                        />
                                                    </div>
                                                </>
                                            );
                                        })()}
                                        <ul className="space-y-0">
                                            {supervised.flatMap((group) =>
                                                (group.assets || [])
                                                    .filter(a => {
                                                        if (!assetSearch) return true;
                                                        const search = assetSearch.toLowerCase();
                                                        return (
                                                            a.serial_number?.toLowerCase().includes(search) ||
                                                            a.asset_code?.toLowerCase().includes(search) ||
                                                            a.category_id?.name?.toLowerCase().includes(search) ||
                                                            a.brand_id?.name?.toLowerCase().includes(search) ||
                                                            a.model_id?.name?.toLowerCase().includes(search)
                                                        );
                                                    })
                                                    .map((a, j, arr) => {
                                                        let typeIcon = null;
                                                        if (a.type_id?.name?.toLowerCase().includes('motor')) {
                                                            typeIcon = <CarIcon className="w-4.5 h-4.5 text-pink-500" />;
                                                        } else if (a.type_id?.name?.toLowerCase().includes('computer')) {
                                                            typeIcon = <LucideComputer className="w-4.5 h-4.5 text-green-500" />;
                                                        }
                                                        return (
                                                            <React.Fragment key={a.id || a.serial_number || j}>
                                                                <li className="flex flex-col bg-gray-100 rounded px-3 py-2">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="flex items-center gap-2">
                                                                            <CirclePlus className="text-blue-500 w-4.5 h-4.5 cursor-pointer" onClick={() => { addSelectedItem(a); }} />
                                                                            {typeIcon}
                                                                        </div>
                                                                        <div>
                                                                            <span className="font-medium">{a.serial_number || a.asset_code}</span> <span className="text-xs text-gray-500">({a.asset_code || a.id})</span>
                                                                            <div className="text-xs text-gray-600 mt-0.5">
                                                                                {a.category_id?.name && <div>Category: {a.category_id.name}</div>}
                                                                                {a.brand_id?.name && <div>Brand: {a.brand_id.name}</div>}
                                                                                {a.model_id?.name && <div>Model: {a.model_id.name}</div>}
                                                                                {a.owner?.full_name && (
                                                                                    <div>Owner: {a.owner.full_name} <span className="text-gray-400">({a.owner.ramco_id})</span></div>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </li>
                                                                {j < arr.length - 1 && <hr className="my-2 border-gray-300" />}
                                                            </React.Fragment>
                                                        );
                                                    })
                                            )}
                                        </ul>
                                    </TabsContent>
                                </Tabs>
                            }
                            onClose={() => setSidebarOpen(false)}
                            size="md"
                        />
                    )}
                </fieldset>

                {/* 7. Workflow Section */}
                <fieldset className="border rounded p-4">
                    <legend className="font-semibold">Workflow</legend>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
                        <div>
                            <label className="block font-medium">Status</label>
                            <select className="input">
                                <option>Draft</option>
                                <option>Submitted</option>
                                <option>In Review</option>
                                <option>Approved</option>
                                <option>Rejected</option>
                            </select>
                        </div>
                        <div>
                            <label className="block font-medium">Comments</label>
                            <textarea className="input" rows={2} placeholder="Add comments..." />
                        </div>
                    </div>
                    <div className="flex gap-4 mt-2">
                        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Submit</button>
                        <button type="button" className="bg-gray-300 text-gray-700 px-4 py-2 rounded">Save as Draft</button>
                    </div>
                </fieldset>
            </form>
        </div>

    );
}

// Add some basic input styling
type InputProps = React.InputHTMLAttributes<HTMLInputElement>;
const inputClass = "border rounded px-2 py-1 w-full focus:ring focus:ring-blue-200";
function Input(props: InputProps) {
    return <input {...props} className={inputClass + (props.className ? ` ${props.className}` : "")} />;
}
