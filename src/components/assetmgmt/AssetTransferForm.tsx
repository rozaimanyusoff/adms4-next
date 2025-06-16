'use client';
import React, { useState, useContext, useEffect, useRef, useMemo } from "react";
import { AuthContext } from "@/store/AuthContext";
import ActionSidebar from "@/components/ui/action-aside";
import { authenticatedApi } from "@/config/api";
import { CirclePlus, Plus, CarIcon, ComputerIcon, LucideComputer, User, X, ChevronDown, Undo2 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";

// Types for form structure
interface Requestor {
    name: string;
    staffId: string;
    designation: string;
    typeOfChange: 'Staff' | 'Asset' | 'Non-Asset';
    role: 'User' | 'Asset Manager'; // Added role field
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
    department: string;
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

// New backend types
interface Department {
    id: number;
    name: string;
    code: string;
}
interface Position {
    id: number;
    name: string;
}
interface CostCenter {
    id: number;
    name: string;
}
interface District {
    id: number;
    name: string;
    code: string;
}
interface Employee {
    id: number;
    ramco_id: string;
    full_name: string;
    email: string | null;
    contact: string | null;
    department: Department | null;
    position: Position | null;
    costcenter: CostCenter | null;
    district: District | null;
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
    unit_price: number | null;
    depreciation_length: number;
    depreciation_rate: string;
    costcenter: CostCenter | null;
    item_code: string;
    type: { id: number; name: string };
    status: string;
    disposed_date: string | null;
    category: { id: number; name: string };
    brand: { id: number; name: string };
    model: { id: number; name: string };
    department: Department | null;
    district: District | null;
    owner: { id: number; ramco_id: string; full_name: string };
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
        role: "User", // Added default role to fix type error
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
            department: "",
            condition: "",
            brandModel: "",
            serialNo: "",
        },
        new: {
            ownerName: "",
            ownerStaffId: "",
            location: "",
            costCenter: "",
            department: "",
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
    const [dateRequest, setDateRequest] = useState(new Date().toISOString().slice(0, 16));
    const [costCenters, setCostCenters] = useState<{ id: number, name: string }[]>([]);
    const [departments, setDepartments] = useState<{ id: number, name: string }[]>([]);
    const [districts, setDistricts] = useState<{ id: number, name: string }[]>([]);
    const [employees, setEmployees] = useState<{ id: number, full_name: string, ramco_id: string }[]>([]);
    const [selectedOwnerName, setSelectedOwnerName] = useState("");

    // Track initial state for reset
    const initialTransferDetails = useRef(form.assetTransfer);
    const initialReasonForTransfer = useRef(form.reason);

    // Dirty check for New fields or Reason for Transfer
    const assetTransferDetailKeys: (keyof AssetTransferDetails)[] = [
        "ownerName",
        "ownerStaffId",
        "location",
        "costCenter",
        "condition",
        "brandModel",
        "serialNo",
    ];
    const isDirty = useMemo(() => {
        // Check if any New field in Transfer Details changed
        const transferDirty = assetTransferDetailKeys.some(
            key => form.assetTransfer.new[key] !== initialTransferDetails.current.new[key]
        );
        // Check if any Reason for Transfer checkbox is checked
        const reasonDirty = Object.entries(form.reason)
            .filter(([k]) => k !== "othersText")
            .some(([, v]) => v === true);
        return transferDirty || reasonDirty;
    }, [form.assetTransfer.new, form.reason]);

    useEffect(() => {
        if (user) {
            setForm(prev => ({
                ...prev,
                requestor: {
                    ...prev.requestor,
                    name: user.name || prev.requestor.name,
                    staffId: user.username || user.email || prev.requestor.staffId,
                    designation: prev.requestor.designation,
                    role: 'User', // Default to 'User' or update this logic if you have a different way to determine asset manager status
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

    useEffect(() => {
        authenticatedApi.get('/api/assets/costcenters').then(res => setCostCenters((res.data as any).data || []));
        authenticatedApi.get('/api/assets/departments').then(res => setDepartments((res.data as any).data || []));
        authenticatedApi.get('/api/assets/districts').then(res => setDistricts((res.data as any).data || []));
    }, []);

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

    // Example form submission handler for asset transfer:
    const handleFormSubmit = (item: Asset) => {
        const payload = {
            // ...other fields...
            current_owner: item.owner?.ramco_id || null,
            current_costcenter: item.costcenter?.id || null,
            current_department: item.department?.id || null,
            current_location: item.district?.id || null,
            // ...other fields...
        };
        // send payload to backend
        // e.g., await api.post('/api/asset/transfer', payload);
    };

    const handleOwnerSearch = async (query: string) => {
        if (!query) return setEmployees([]);
        const res = await authenticatedApi.get(`/api/assets/employees/search?q=${encodeURIComponent(query)}`);
        setEmployees((res.data as any).data || []);
    };

    // Helper to check if section is dirty
    const isTransferDetailsDirty = (assetId: string) => {
        return JSON.stringify(form.assetTransfer.current) !== JSON.stringify(initialForm.assetTransfer.current) ||
            JSON.stringify(form.assetTransfer.new) !== JSON.stringify(initialForm.assetTransfer.new);
    };
    const isReasonDirty = (assetId: string) => {
        return JSON.stringify(form.reason) !== JSON.stringify(initialForm.reason);
    };
    const isAttachmentsDirty = (assetId: string) => {
        return false; // Implement attachment dirty check if needed
    };

    // Handler to reset section
    const handleResetSection = (assetId: string, section: "transferDetails" | "reason" | "attachments") => {
        setForm((prev) => {
            if (section === 'transferDetails') {
                return {
                    ...prev,
                    assetTransfer: {
                        ...prev.assetTransfer,
                        current: initialForm.assetTransfer.current,
                        new: initialForm.assetTransfer.new,
                    },
                };
            }
            if (section === 'reason') {
                return {
                    ...prev,
                    reason: initialForm.reason,
                };
            }
            return prev;
        });
    };

    // Reset handler
    const handleReset = () => {
        setForm(prev => ({
            ...prev,
            assetTransfer: { ...initialTransferDetails.current },
            reason: { ...initialReasonForTransfer.current },
        }));
    };

    const [removeIdx, setRemoveIdx] = useState<number | null>(null);
    const [reasonOthersChecked, setReasonOthersChecked] = useState(false);
    const [reasonOthersText, setReasonOthersText] = useState("");
    const [returnToAssetManager, setReturnToAssetManager] = useState<{ [key: number]: boolean }>({});

    // Define reasons for transfer
    const ASSET_REASONS = [
        { label: 'Resignation', value: 'resignation' },
        { label: 'Disposal', value: 'disposal' },
        { label: 'Asset Problem', value: 'asset_problem' },
        { label: 'Others', value: 'others' },
    ];

    const EMPLOYEE_REASONS = [
        { label: 'Temporary Assignment (< 30 days)', value: 'temporary_assignment' },
        { label: 'Upgrading/Promotion', value: 'upgrading_promotion' },
        { label: 'Department Restructure', value: 'department_restructure' },
        { label: 'Resignation', value: 'resignation' },
        { label: 'Relocation', value: 'relocation' },
        { label: 'Disposal', value: 'disposal' },
        { label: 'Others', value: 'others' },
    ];

    // Track attachments per item
    const [attachments, setAttachments] = useState<{ [itemId: string]: File[] }>({});

    const [submitError, setSubmitError] = useState<string | null>(null);

    // Add workflow state to avoid "Cannot find name 'workflow'" error
    const [workflow, setWorkflow] = useState<{
        approvedBy?: { name: string; date: string };
        acceptedBy?: { name: string; date: string };
        qaSection?: { name: string; date: string };
        assetManager?: { name: string; date: string };
    }>({});

    function validateChecklist() {
        // 1. Transfer Details: any 'new' field filled (not empty/null/undefined)
        const transferDetailsFilled = Object.values(form.assetTransfer?.new || {}).some(
            v => v && v !== ''
        );
        // 2. Reason for Transfer: any reason checked (except 'othersText')
        const reasonFilled = Object.entries(form.reason || {}).some(
            ([k, v]) => ['resignation','relocation','disposal','asset_problem','others'].includes(k) && v === true
        );
        // 3. Attachments: not implemented, always false (customize if you have attachment state)
        const attachmentsFilled = false;
        let completed = 0;
        if (transferDetailsFilled) completed++;
        if (reasonFilled) completed++;
        if (attachmentsFilled) completed++;
        return completed === 3;
    }

    interface SubmitEvent extends React.FormEvent<HTMLFormElement> {}

    interface HandleSubmitResult {
        success: boolean;
        error?: string;
    }

    function handleSubmit(e: SubmitEvent): void {
        e.preventDefault();
        if (!validateChecklist()) {
            setSubmitError('Please complete at least one field in Transfer Details, one Reason for Transfer, and add an Attachment.');
            return;
        }
        setSubmitError(null);
        // ...proceed with submit logic...
    }

    return (
        <div className="relative">
            <div className="absolute top-2 right-2 flex items-center gap-2 z-10">
                {isDirty && (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    type="button"
                                    onClick={handleReset}
                                    className="text-gray-500 hover:text-primary transition disabled:opacity-50 disabled:pointer-events-none"
                                    aria-label="Reset changes"
                                    disabled={!isDirty}
                                >
                                    <Undo2 size={20} />
                                </button>
                            </TooltipTrigger>
                            <TooltipContent>Reset changes</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                )}
            </div>
            <div className="mt-4">
                <h2 className="text-xl font-bold mb-4">Asset Transfer Form</h2>
                <form className="w-full mx-auto bg-white p-6 rounded shadow-md text-sm space-y-6" onSubmit={handleSubmit}>
                    {submitError && (
                        <div className="text-red-600 font-semibold mb-2">{submitError}</div>
                    )}
                    {/* 1. Requestor Details */}
                    <fieldset className="border rounded p-4">
                        <legend className="font-semibold">Requestor</legend>
                        <div className="space-y-2">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="flex items-center gap-2">
                              <label className="block font-medium min-w-[80px]">Name</label>
                              <input type="text" className="input w-full" value={form.requestor.name} readOnly />
                            </div>
                            <div className="flex items-center gap-2">
                              <label className="block font-medium min-w-[80px]">Ramco ID</label>
                              <input type="text" className="input w-full" value={form.requestor.staffId} readOnly />
                            </div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="flex items-center gap-2">
                              <label className="block font-medium min-w-[80px]">Designation</label>
                              <input type="text" className="input w-full" value={form.requestor.designation} onChange={e => handleInput('requestor', 'designation', e.target.value)} />
                            </div>
                            <div className="flex items-center gap-2">
                              <label className="block font-medium min-w-[80px]">Role</label>
                              <input type="text" className="input w-full" value={form.requestor.role || 'User'} readOnly />
                            </div>
                          </div>
                          <div className="flex justify-center mt-4">
                            <span className="text-xs bg-blue-600 text-white font-medium px-2 py-1 rounded shadow border border-gray-200">
                              {selectedAssets.length} Asset(s), {selectedEmployees.length} Employee(s) selected
                            </span>
                          </div>
                        </div>
                    </fieldset>

                    {/* 2. Select Items (Button to open ActionSidebar) */}
                    <fieldset className="border rounded p-4">
                        <legend className="font-semibold flex items-center gap-2">
                            Selected Items
                            <button type="button" onClick={() => setSidebarOpen(true)} className="ml-2 bg-blue-500 hover:bg-blue-600 text-white rounded p-1" title="Add Items">
                                <Plus className="w-4.5 h-4.5" />
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
                                                            <span>S/N: {item.serial_number} • <span className="text-blue-500 text-xs">[{item.type?.name}]</span></span>
                                                            {item.type_id?.name && (
                                                                <span className="ml-2 text-xs text-gray-500">[{item.type_id.name}]</span>
                                                            )}
                                                        </>
                                                    )}
                                                </span>
                                                <button type="button" className="ml-2 text-red-500" onClick={e => { e.stopPropagation(); setRemoveIdx(idx); }}>
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </summary>
                                            <div className="px-4 py-2 space-y-6">
                                                {/* Asset Details (only for Asset) */}
                                                {!isEmployee && (
                                                    <>
                                                        <div className="mb-2">
                                                            <div className="font-semibold mb-1">Asset Details</div>
                                                            <div className="flex gap-8 text-sm text-gray-700">
                                                                <div>Category: <span className="font-medium">{item.category?.name || '-'}</span></div>
                                                                <div>Brand: <span className="font-medium">{item.brand?.name || '-'}</span></div>
                                                                <div>Model: <span className="font-medium">{item.model?.name || '-'}</span></div>
                                                                <div className="flex">Condition: <span className="font-medium"> </span>
                                                                    <label className="ml-2 inline-flex items-center gap-2"><input type="checkbox" className="w-4.5 h-4.5" name="condition-new" /> New</label>
                                                                    <label className="ml-2 inline-flex items-center gap-2"><input type="checkbox" className="w-4.5 h-4.5" name="condition-used" checked /> Used</label>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <hr className="my-2 border-gray-300" />
                                                    </>
                                                )}
                                                {/* Transfer Details */}
                                                <div>
                                                    <div className="font-semibold mb-2 flex items-center justify-between">
                                                        <div className="flex items-center">
                                                            Transfer Details
                                                            <TooltipProvider>
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <button
                                                                            type="button"
                                                                            className="ml-2 text-muted-foreground hover:text-primary"
                                                                            disabled={!isTransferDetailsDirty(item.id)}
                                                                            onClick={() => handleResetSection(item.id, "transferDetails")}
                                                                            aria-label="Reset Transfer Details"
                                                                        >
                                                                            <Undo2 className="w-4 h-4" />
                                                                        </button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>Reset Transfer Details</TooltipContent>
                                                                </Tooltip>
                                                            </TooltipProvider>
                                                        </div>
                                                    </div>
                                                    {/* Only show Return to Asset Manager for assets */}
                                                    {!isEmployee && (
                                                        <div className="my-2 flex items-center justify-between px-4">
                                                            <label className="my-1 flex items-center gap-2">
                                                                <input
                                                                    type="checkbox"
                                                                    className="w-4.5 h-4.5"
                                                                    checked={!!returnToAssetManager[item.id]}
                                                                    onChange={e => setReturnToAssetManager(prev => ({ ...prev, [item.id]: e.target.checked }))}
                                                                />
                                                                <span className="font-bold text-danger">Return to Asset Manager</span>
                                                            </label>
                                                            <div className="inline-flex items-center gap-2">
                                                                <label className="block font-medium mb-0">Effective Date</label>
                                                                <Input type="date" className="w-[160px]" value={form.assetTransfer.effectiveDate} onChange={e => handleInput('assetTransfer', 'effectiveDate', e.target.value)} />
                                                            </div>
                                                        </div>
                                                    )}
                                                    <table className="w-full text-left align-middle">
                                                        <thead>
                                                            <tr>
                                                                <th></th>
                                                                <th>Current</th>
                                                                <th>New</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {/* Only show Owner row for assets */}
                                                            {!isEmployee && (
                                                                <tr>
                                                                    <td className="py-1">
                                                                        <label className="flex items-center gap-2">
                                                                            <input type="checkbox" className="w-4.5 h-4.5" disabled={!!returnToAssetManager[item.id]} />
                                                                            Owner
                                                                        </label>
                                                                    </td>
                                                                    <td className="py-1">
                                                                        <span>{item.owner?.full_name || '-'}</span>
                                                                    </td>
                                                                    <td className="py-1">
                                                                        {/* New Owner autocomplete, fallback to a simple input+dropdown if shadcn Autocomplete is not available */}
                                                                        <div className="relative">
                                                                            <Input
                                                                                type="text"
                                                                                className="input"
                                                                                placeholder="New Owner"
                                                                                value={selectedOwnerName || form.assetTransfer.new.ownerName}
                                                                                onChange={e => {
                                                                                    handleInput('assetTransfer', 'ownerName', e.target.value, 'new');
                                                                                    handleOwnerSearch(e.target.value);
                                                                                    setSelectedOwnerName("");
                                                                                }}
                                                                                autoComplete="off"
                                                                                disabled={!!returnToAssetManager[item.id]}
                                                                            />
                                                                            {employees.length > 0 && (
                                                                                <ul className="absolute z-10 bg-white border w-full max-h-40 overflow-y-auto">
                                                                                    {employees.map(e => (
                                                                                        <li key={e.ramco_id} className="px-2 py-1 hover:bg-blue-100 cursor-pointer" onClick={() => { handleInput('assetTransfer', 'ownerName', e.ramco_id, 'new'); setEmployees([]); setSelectedOwnerName(e.full_name); }}>{e.full_name}</li>
                                                                                    ))}
                                                                                </ul>
                                                                            )}
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            )}
                                                            {/* Cost Center, Department, Location rows remain for both */}
                                                            <tr>
                                                                <td className="py-1">
                                                                    <label className="flex items-center gap-2">
                                                                        <input
                                                                            type="checkbox"
                                                                            className="w-4.5 h-4.5"
                                                                            checked={!!form.assetTransfer.new.costCenter}
                                                                            disabled={!!returnToAssetManager[item.id]}
                                                                            onChange={e => {
                                                                                if (!e.target.checked) handleInput('assetTransfer', 'costCenter', '', 'new');
                                                                            }}
                                                                        />
                                                                        Cost Center
                                                                    </label>
                                                                </td>
                                                                <td className="py-1">{item.costcenter?.name || '-'}</td>
                                                                <td className="py-1">
                                                                    <Select value={form.assetTransfer.new.costCenter} onValueChange={val => handleInput('assetTransfer', 'costCenter', val, 'new')} disabled={!!returnToAssetManager[item.id]}>
                                                                        <SelectTrigger className="w-full" size="sm"><SelectValue placeholder="New Cost Center" /></SelectTrigger>
                                                                        <SelectContent>
                                                                            {costCenters.map(cc => <SelectItem key={cc.id} value={String(cc.id)}>{cc.name}</SelectItem>)}
                                                                        </SelectContent>
                                                                    </Select>
                                                                </td>
                                                            </tr>
                                                            <tr>
                                                                <td className="py-1">
                                                                    <label className="flex items-center gap-2">
                                                                        <input
                                                                            type="checkbox"
                                                                            className="w-4.5 h-4.5"
                                                                            checked={!!form.assetTransfer.new.department}
                                                                            disabled={!!returnToAssetManager[item.id]}
                                                                            onChange={e => {
                                                                                if (!e.target.checked) handleInput('assetTransfer', 'department', '', 'new');
                                                                            }}
                                                                        />
                                                                        Department
                                                                    </label>
                                                                </td>
                                                                <td className="py-1">{item.department?.name || '-'}</td>
                                                                <td className="py-1">
                                                                    <Select value={form.assetTransfer.new.department} onValueChange={val => handleInput('assetTransfer', 'department', val, 'new')} disabled={!!returnToAssetManager[item.id]}>
                                                                        <SelectTrigger className="w-full" size="sm"><SelectValue placeholder="New Department" /></SelectTrigger>
                                                                        <SelectContent>
                                                                            {departments.map(dept => <SelectItem key={dept.id} value={String(dept.id)}>{dept.name}</SelectItem>)}
                                                                        </SelectContent>
                                                                    </Select>
                                                                </td>
                                                            </tr>
                                                            <tr>
                                                                <td className="py-1">
                                                                    <label className="flex items-center gap-2">
                                                                        <input
                                                                            type="checkbox"
                                                                            className="w-4.5 h-4.5"
                                                                            checked={!!form.assetTransfer.new.location}
                                                                            disabled={!!returnToAssetManager[item.id]}
                                                                            onChange={e => {
                                                                                if (!e.target.checked) handleInput('assetTransfer', 'location', '', 'new');
                                                                            }}
                                                                        />
                                                                        Location (District)
                                                                    </label>
                                                                </td>
                                                                <td className="py-1">{item.district?.name || '-'}</td>
                                                                <td className="py-1">
                                                                    <Select value={form.assetTransfer.new.location} onValueChange={val => handleInput('assetTransfer', 'location', val, 'new')} disabled={!!returnToAssetManager[item.id]}>
                                                                        <SelectTrigger className="w-full" size="sm"><SelectValue placeholder="New Location (District)" /></SelectTrigger>
                                                                        <SelectContent>
                                                                            {districts.map(district => <SelectItem key={district.id} value={String(district.id)}>{district.name}</SelectItem>)}
                                                                        </SelectContent>
                                                                    </Select>
                                                                </td>
                                                            </tr>
                                                        </tbody>
                                                    </table>

                                                </div>
                                                <hr className="my-2 border-gray-300" />
                                                {/* Reason for Transfer */}
                                                <div>
                                                    <div className="font-semibold mb-2 flex items-center">
                                                        Reason for Transfer
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <button
                                                                        type="button"
                                                                        className="ml-2 text-muted-foreground hover:text-primary"
                                                                        disabled={!isReasonDirty(item.id)}
                                                                        onClick={() => handleResetSection(item.id, "reason")}
                                                                        aria-label="Reset Reason for Transfer"
                                                                    >
                                                                        <Undo2 className="w-4 h-4" />
                                                                    </button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>Reset Reason for Transfer</TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                    </div>
                                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 px-4">
                                                        {(() => {
                                                            // Use the same logic as the accordion label for determining asset/employee
                                                            const isEmployee = !!(item.full_name || item.ramco_id);
                                                            let reasons = isEmployee ? EMPLOYEE_REASONS : ASSET_REASONS;
                                                            if (isEmployee) {
                                                              reasons = reasons.filter(r => r.value !== 'disposal');
                                                            } else {
                                                              reasons = reasons.filter(r => !['temporary_assignment', 'upgrading_promotion', 'department_restructure'].includes(r.value));
                                                            }
                                                            return reasons.map((reason) => (
                                                                <label key={reason.value} className="inline-flex items-center gap-2">
                                                                    <input
                                                                        type="checkbox"
                                                                        className="w-4.5 h-4.5"
                                                                        checked={typeof form.reason[reason.value as keyof Reason] === "boolean" ? form.reason[reason.value as keyof Reason] as boolean : false}
                                                                        onChange={e => {
                                                                            handleReasonChange(reason.value as ReasonField);
                                                                            if (reason.value !== 'others') {
                                                                                setForm(prev => ({ ...prev, reason: { ...prev.reason, others: false } }));
                                                                            }
                                                                        }}
                                                                    />
                                                                    {reason.label}
                                                                </label>
                                                            ));
                                                        })()}
                                                    </div>
                                                    {form.reason.others && (
                                                        <div className="mt-2 px-2">
                                                            <textarea
                                                                className="w-full border rounded px-2 py-1 text-sm min-h-[40px]"
                                                                placeholder="Please specify..."
                                                                value={form.reason.othersText}
                                                                onChange={e => handleInput('reason', 'othersText', e.target.value)}
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                                <hr className="my-2 border-gray-300" />
                                                {/* Comment before Attachments */}
                                                <div className="flex flex-col md:flex-row justify-between gap-4 items-start mb-2">
                                                    <div className="flex-1">
                                                        <label className="font-semibold mb-1 block">Comment</label>
                                                        <textarea className="w-full min-h-[60px] border rounded px-2 py-1 text-sm" placeholder="Add your comment here..." />
                                                    </div>
                                                    <div className="flex-1">
                                                        <label className="font-semibold mb-1 block">Attachments</label>
                                                        <input type="file" className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" multiple />
                                                    </div>
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
                                                    const type = a.type?.name || 'Unknown';
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
                                                                a.category?.name?.toLowerCase().includes(search) ||
                                                                a.brand?.name?.toLowerCase().includes(search) ||
                                                                a.model?.name?.toLowerCase().includes(search)
                                                            );
                                                        })
                                                        .map((a, j, arr) => {
                                                            let typeIcon = null;
                                                            if (a.type?.name?.toLowerCase().includes('motor')) {
                                                                typeIcon = <CarIcon className="w-4.5 h-4.5 text-pink-500" />;
                                                            } else if (a.type?.name?.toLowerCase().includes('computer')) {
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
                                                                                    {a.category?.name && <div>Category: {a.category.name}</div>}
                                                                                    {a.brand?.name && <div>Brand: {a.brand.name}</div>}
                                                                                    {a.model?.name && <div>Model: {a.model.name}</div>}
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
                      <div className="space-y-4">
                        {/* Approved By */}
                        <div className="flex flex-col md:flex-row md:items-center gap-2">
                          <label className="block my-1 font-medium min-w-[120px]">Approved By</label>
                          <input type="text" className="input w-full md:max-w-xs" placeholder="Name" value={workflow.approvedBy?.name || ''} readOnly />
                          <label className="my-1 text-gray-500 min-w-[80px] md:ml-4">Action Date</label>
                          <input type="datetime-local" className="input w-full md:max-w-xs" value={workflow.approvedBy?.date || ''} readOnly />
                        </div>
                        {/* Accepted By */}
                        <div className="flex flex-col md:flex-row md:items-center gap-2">
                          <label className="block my-2 font-medium min-w-[120px]">Accepted By</label>
                          <input type="text" className="input w-full md:max-w-xs" placeholder="Name" value={workflow.acceptedBy?.name || ''} readOnly />
                          <label className="my-1 text-gray-500 min-w-[80px] md:ml-4">Action Date</label>
                          <input type="datetime-local" className="input w-full md:max-w-xs" value={workflow.acceptedBy?.date || ''} readOnly />
                        </div>
                        {/* QA Section */}
                        <div className="flex flex-col md:flex-row md:items-center gap-2">
                          <label className="block my-1 font-medium min-w-[120px]">QA Section</label>
                          <input type="text" className="input w-full md:max-w-xs" placeholder="Name" value={workflow.qaSection?.name || ''} readOnly />
                          <label className="my-1 text-gray-500 min-w-[80px] md:ml-4">Action Date</label>
                          <input type="datetime-local" className="input w-full md:max-w-xs" value={workflow.qaSection?.date || ''} readOnly />
                        </div>
                        {/* Asset Manager */}
                        <div className="flex flex-col md:flex-row md:items-center gap-2">
                          <label className="block my-1 font-medium min-w-[120px]">Asset Manager</label>
                          <input type="text" className="input w-full md:max-w-xs" placeholder="Name" value={workflow.assetManager?.name || ''} readOnly />
                          <label className="my-1 text-gray-500 min-w-[80px] md:ml-4">Action Date</label>
                          <input type="datetime-local" className="input w-full md:max-w-xs" value={workflow.assetManager?.date || ''} readOnly />
                        </div>
                      </div>
                    </fieldset>
                </form>
            </div>
            <AlertDialog open={removeIdx !== null} onOpenChange={open => { if (!open) setRemoveIdx(null); }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remove Item</AlertDialogTitle>
                        <AlertDialogDescription>Are you sure you want to remove this item from the selection?</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setRemoveIdx(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => { if (removeIdx !== null) { removeSelectedItem(removeIdx); setRemoveIdx(null); } }}>Remove</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>

    );
}
