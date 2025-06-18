'use client';
import React, { useState, useContext, useEffect, useRef, useMemo } from "react";
import { AuthContext } from "@/store/AuthContext";
import ActionSidebar from "@/components/ui/action-aside";
import { authenticatedApi } from "@/config/api";
import { CirclePlus, Plus, CarIcon, ComputerIcon, LucideComputer, User, X, ChevronDown } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { CustomDataGrid, ColumnDef } from "@components/ui/DataGrid";
import { Button } from "@/components/ui/button";

// Types for form structure
interface Requestor {
    name: string;
    staffId: string;
    designation: string;
    department?: string;
    costcenter?: string;
    district?: string;
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
    disposal: boolean;
    othersText?: string; // Add missing property to fix type errors
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
                    name: user?.name || prev.requestor.name,
                    staffId: user?.username || user?.email || prev.requestor.staffId,
                    designation: prev.requestor.designation,
                    role: 'User', // Default to 'User' or update this logic if you have a different way to determine asset manager status
                },
            }));
        }
    }, [user]);

    useEffect(() => {
        async function fetchRequestorDetails(username: string) {
            try {
                const res: { data?: { data?: any } } = await authenticatedApi.get(`/api/assets/employees/lookup/${username}`);
                const data = res.data?.data;
                if (data) {
                    setForm(prev => ({
                        ...prev,
                        requestor: {
                            ...prev.requestor,
                            name: data.full_name || prev.requestor.name,
                            staffId: data.ramco_id || prev.requestor.staffId,
                            designation: data.position?.name || prev.requestor.designation,
                            department: data.department?.name || '',
                            costcenter: data.costcenter?.name || '',
                            district: data.district?.name || '',
                            role: 'User',
                        },
                    }));
                }
            } catch (e) {
                setForm(prev => ({
                    ...prev,
                    requestor: {
                        ...prev.requestor,
                        name: user?.name || prev.requestor.name,
                        staffId: user?.username || user?.email || prev.requestor.staffId,
                        designation: prev.requestor.designation,
                        role: 'User',
                    },
                }));
            }
        }
        if (user && user.username) {
            fetchRequestorDetails(user.username);
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
        setSelectedItems(prev => {
            // Use a composite key: type + id/ramco_id
            const isEmployee = !!(item.full_name || item.ramco_id);
            const key = isEmployee ? `employee-${item.ramco_id}` : `asset-${item.id}`;
            const exists = prev.some(i => {
                const iIsEmployee = !!(i.full_name || i.ramco_id);
                const iKey = iIsEmployee ? `employee-${i.ramco_id}` : `asset-${i.id}`;
                return iKey === key;
            });
            if (!exists) {
                toast.success(`${item.full_name || item.name || item.asset_code || 'Item'} added to selection.`);
                return [...prev, item];
            } else {
                toast.info(`${item.full_name || item.name || item.asset_code || 'Item'} is already selected.`);
                return prev;
            }
        });
    }
    function removeSelectedItem(idx: number) {
        setSelectedItems(prev => prev.filter((_, i) => i !== idx));
        toast.success('Item removed from selection.');
    }

    // 1. Add per-item state for transfer details, effective date, and reasons
    const [itemTransferDetails, setItemTransferDetails] = useState<{ [id: string]: AssetTransfer }>({});
    const [itemReasons, setItemReasons] = useState<{ [id: string]: Reason }>({});
    const [itemEffectiveDates, setItemEffectiveDates] = useState<{ [id: string]: string }>({});

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

    // Update handlers to use per-item state
    function handleItemTransferInput(itemId: string, section: 'current' | 'new', field: keyof AssetTransferDetails, value: string) {
        setItemTransferDetails(prev => ({
            ...prev,
            [itemId]: {
                ...prev[itemId],
                [section]: {
                    ...prev[itemId]?.[section],
                    [field]: value,
                },
                effectiveDate: prev[itemId]?.effectiveDate || '',
            },
        }));
    }
    function handleItemReasonInput(itemId: string, field: keyof Reason, value: boolean | string) {
        setItemReasons(prev => ({
            ...prev,
            [itemId]: {
                ...prev[itemId],
                [field]: typeof value === 'string' ? value === 'true' : !!value,
            },
        }));
    }
    function handleItemEffectiveDate(itemId: string, value: string) {
        setItemEffectiveDates(prev => ({ ...prev, [itemId]: value }));
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
        approvedBy?: { name: string; date: string; comment?: string };
        acceptedBy?: { name: string; date: string; comment?: string };
        qaSection?: { name: string; date: string; comment?: string };
        assetManager?: { name: string; date: string; comment?: string };
    }>({});

    function validateChecklist() {
        for (const item of selectedItems) {
            const transfer = itemTransferDetails[item.id] || { current: {}, new: {}, effectiveDate: '' };
            const reasons = itemReasons[item.id] || {};
            const effectiveDate = itemEffectiveDates[item.id] || '';

            // 1. Transfer Details: any 'new' field filled (not empty/null/undefined)
            const transferDetailsFilled = Object.values(transfer.new || {}).some(v => v && v !== '');

            // 2. Reason for Transfer: at least one option selected (value === true, excluding 'othersText' and 'comment')
            const reasonFilled = Object.entries(reasons)
                .filter(([k]) => k !== 'othersText' && k !== 'comment')
                .some(([, v]) => v === true);

            // 3. Effective Date: must be filled
            const effectiveDateFilled = !!effectiveDate;

            if (!transferDetailsFilled || !reasonFilled || !effectiveDateFilled) return false;
        }
        return true;
    }

    interface SubmitEvent extends React.FormEvent<HTMLFormElement> { }

    interface HandleSubmitResult {
        success: boolean;
        error?: string;
    }

    // Add requestStatus state
    const [requestStatus, setRequestStatus] = useState<'draft' | 'submitted'>('submitted');

    async function handleSubmit(e: SubmitEvent) {
        e.preventDefault();
        setSubmitError(null);
        // Validate all selected items have effective date
        const missingDate = selectedItems.some(item => !itemEffectiveDates[item.id]);
        if (missingDate) {
            setSubmitError('Please set the Effective Date for all selected items.');
            return;
        }
        // Build payload for backend
        const payload = {
            requestor: form.requestor.staffId,
            request_no: '', // or generate if needed
            request_date: new Date().toISOString().slice(0, 10),
            request_status: requestStatus, // <-- add status
            details: selectedItems.map(item => {
                const transfer = itemTransferDetails[item.id] || { current: {}, new: {}, effectiveDate: '' };
                const reasons = itemReasons[item.id] || {};
                const effectiveDate = itemEffectiveDates[item.id] || '';
                // Defensive: ensure current and new are always AssetTransferDetails
                const emptyDetails: AssetTransferDetails = {
                    ownerName: '',
                    ownerStaffId: '',
                    location: '',
                    costCenter: '',
                    department: '',
                    condition: '',
                    brandModel: '',
                    serialNo: '',
                };
                const current: AssetTransferDetails = { ...emptyDetails, ...(transfer.current || {}) };
                const newDetails: AssetTransferDetails = { ...emptyDetails, ...(transfer.new || {}) };
                // If new_costcenter_id or new_department_id is empty, copy from current
                // Fallback logic for new_* fields: new > current > item property > ''
                const new_costcenter_id = newDetails.costCenter || current.costCenter || item.costcenter?.id || '';
                const new_department_id = newDetails.department || current.department || item.department?.id || '';
                const new_district_id = newDetails.location || current.location || item.district?.id || '';
                // Build reasons string: include any key where value is true or 'true' (string)
                const reasonsStr = Object.entries(reasons)
                    .filter(([key, value]) => (typeof value === 'boolean' ? value : value === 'true'))
                    .map(([key]) => key)
                    .join(',');
                return {
                    transfer_type: item.full_name || item.ramco_id ? 'Employee' : 'Asset',
                    effective_date: effectiveDate,
                    asset_type: item.type?.name || '',
                    identifier: item.serial_number || item.ramco_id || '',
                    curr_owner: current.ownerStaffId || item.owner?.ramco_id || '',
                    curr_costcenter_id: current.costCenter || item.costcenter?.id || '',
                    curr_department_id: current.department || item.department?.id || '',
                    curr_district_id: current.location || item.district?.id || '',
                    new_costcenter_id,
                    new_department_id,
                    new_district_id,
                    reasons: reasonsStr,
                    remarks: reasons.othersText,
                    attachment: null, // add attachment if implemented
                    return_to_asset_manager: !!returnToAssetManager[item.id]
                };
            }),
        };

        console.log('Submitting payload:', payload);
        try {
            await authenticatedApi.post('/api/assets/transfer-requests', payload);
            toast.success(requestStatus === 'draft' ? 'Draft saved successfully!' : 'Transfer submitted successfully!');
        } catch (err) {
            setSubmitError('Failed to submit transfer. Please try again.');
        }
    }

    // Update handleSaveDraft to set status and trigger submit
    function handleSaveDraft() {
        setRequestStatus('draft');
        // Simulate form submit for draft
        const fakeEvent = { preventDefault: () => { } } as SubmitEvent;
        handleSubmit(fakeEvent);
    }

    const [showForm, setShowForm] = React.useState(false);

    return (
        <div className="mt-4">
            {!showForm && (
                <div className="mt-10">
                    <div className="flex justify-between items-center mb-2">
                        <h2 className="text-xl font-bold">Asset Transfer Requests</h2>
                        <Button
                            type="button"
                            variant="default"
                            size="sm"
                            title="Create New Asset Transfer"
                            onClick={() => setShowForm(true)}
                        >
                            <Plus className="w-5 h-5" />
                        </Button>
                    </div>
                    <AssetTransferRequestsGrid />
                </div>
            )}
            {showForm && (
                <div className="w-full">
                    <form className="w-full mx-auto bg-white p-6 rounded shadow-md text-sm space-y-6" onSubmit={handleSubmit}>
                        {submitError && (
                            <div className="text-red-600 font-semibold mb-2">{submitError}</div>
                        )}
                        {/* 1. Requestor Details */}
                        <fieldset className="border rounded p-4">
                            <legend className="font-semibold text-lg">Requestor</legend>
                            <div className="space-y-2">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="flex items-center gap-2">
                                        <label className="block font-medium min-w-[120px] my-1">Name</label>
                                        <input type="text" className="input w-full" value={form.requestor.name} readOnly />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <label className="block font-medium min-w-[120px] my-1">Ramco ID</label>
                                        <input type="text" className="input w-full" value={form.requestor.staffId} readOnly />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="flex items-center gap-2">
                                        <label className="block font-medium min-w-[120px] my-1">Designation</label>
                                        <input type="text" className="input w-full" value={form.requestor.designation} readOnly />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <label className="block font-medium min-w-[120px] my-1">Department</label>
                                        <input type="text" className="input w-full" value={form.requestor.department || ''} readOnly />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="flex items-center gap-2">
                                        <label className="block font-medium min-w-[120px] my-1">Cost Center</label>
                                        <input type="text" className="input w-full" value={form.requestor.costcenter || ''} readOnly />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <label className="block font-medium min-w-[120px] my-1">District</label>
                                        <input type="text" className="input w-full" value={form.requestor.district || ''} readOnly />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="flex items-center gap-2">
                                        <label className="block font-medium min-w-[120px] my-1">Request Date</label>
                                        <input type="text" className="input w-full" value={dateRequest ? new Date(dateRequest).toLocaleString() : ''} readOnly />
                                    </div>
                                </div>
                            </div>
                        </fieldset>

                        {/* 2. Select Items (Button to open ActionSidebar) */}
                        <fieldset className="border rounded p-2">
                            <legend className="font-semibold flex items-center text-lg gap-2">
                                Selected Items
                                <Button type="button" onClick={() => setSidebarOpen(true)} size="icon" variant="default" className="ml-2" title="Add Items">
                                    <Plus className="w-5 h-5" />
                                </Button>
                            </legend>
                            {selectedItems.length === 0 ? (
                                <div className="text-gray-400 text-center py-8">No items selected.</div>
                            ) : (
                                <div className="mt-2 px-4">
                                    {selectedItems.map((item, idx) => {
                                        const isEmployee = !!(item.full_name || item.ramco_id);
                                        const typeLabel = isEmployee ? 'Employee' : 'Asset';
                                        return (
                                            <details key={item.id || item.ramco_id || idx} className="mb-2 bg-slate-50 rounded border-2 border-blue-200 px-2 py-1.5 group">
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
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
                                                            <Button type="button" size="icon" variant="ghost" className="ml-2 text-red-500" onClick={e => { e.stopPropagation(); removeSelectedItem(idx); }}>
                                                                <X className="w-5 h-5" fontWeight={'bold'} />
                                                            </Button>
                                                        </summary>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="top">Click to expand for more details</TooltipContent>
                                                </Tooltip>
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
                                                            <div className="flex items-center">Transfer Details</div>
                                                        </div>
                                                        {/* Effective Date for both asset and employee transfers */}
                                                        <div className="my-2 flex items-center justify-end px-4">
                                                            <label className="block font-medium mb-0 mr-2">Effective Date <span className="text-red-500">*</span></label>
                                                            <Input
                                                                type="date"
                                                                className={`w-[160px] ${!itemEffectiveDates[item.id] && submitError ? 'border-red-500' : ''}`}
                                                                value={itemEffectiveDates[item.id] || ''}
                                                                onChange={e => handleItemEffectiveDate(item.id, e.target.value)}
                                                                required
                                                            />
                                                            {!itemEffectiveDates[item.id] && submitError && (
                                                                <span className="ml-2 text-xs text-red-500">Required</span>
                                                            )}
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
                                                            </div>
                                                        )}
                                                        <table className="w-full text-left align-middle">
                                                            <thead className="bg-transparent py-0">
                                                                <tr>
                                                                    <th className="bg-transparent py-1"></th>
                                                                    <th className="bg-transparent py-1">Current</th>
                                                                    <th className="bg-transparent py-1">New</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {/* Only show Owner row for assets */}
                                                                {!isEmployee && (
                                                                    <tr className="border-b-0">
                                                                        <td className="py-0.5">
                                                                            <label className="flex items-center gap-2">
                                                                                <input type="checkbox" className="w-4.5 h-4.5" disabled={!!returnToAssetManager[item.id]} />
                                                                                Owner
                                                                            </label>
                                                                        </td>
                                                                        <td className="py-0.5">
                                                                            <span>{item.owner?.full_name || '-'}</span>
                                                                        </td>
                                                                        <td className="py-0.5">
                                                                            {/* New Owner autocomplete, fallback to a simple input+dropdown if shadcn Autocomplete is not available */}
                                                                            <div className="relative">
                                                                                <Input
                                                                                    type="text"
                                                                                    className="input"
                                                                                    placeholder="Search new owner"
                                                                                    value={itemTransferDetails[item.id]?.new.ownerName || ''}
                                                                                    onChange={e => {
                                                                                        handleItemTransferInput(item.id, 'new', 'ownerName', e.target.value);
                                                                                        handleOwnerSearch(e.target.value);
                                                                                        setSelectedOwnerName("");
                                                                                    }}
                                                                                    autoComplete="off"
                                                                                    disabled={!!returnToAssetManager[item.id]}
                                                                                />
                                                                                {employees.length > 0 && (
                                                                                    <ul className="absolute z-10 bg-white border w-full max-h-40 overflow-y-auto">
                                                                                        {employees.map(e => (
                                                                                            <li key={e.ramco_id} className="px-2 py-1 hover:bg-blue-100 cursor-pointer" onClick={() => { handleItemTransferInput(item.id, 'new', 'ownerName', e.ramco_id); setEmployees([]); setSelectedOwnerName(e.full_name); }}>{e.full_name}</li>
                                                                                        ))}
                                                                                    </ul>
                                                                                )}
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                )}
                                                                {/* Cost Center, Department, Location rows remain for both */}
                                                                <tr className="border-b-0">
                                                                    <td className="py-0.5">
                                                                        <label className="flex items-center gap-2">
                                                                            <input
                                                                                type="checkbox"
                                                                                className="w-4.5 h-4.5"
                                                                                checked={!!itemTransferDetails[item.id]?.new.costCenter}
                                                                                disabled={!!returnToAssetManager[item.id]}
                                                                                onChange={e => {
                                                                                    if (!e.target.checked) handleItemTransferInput(item.id, 'new', 'costCenter', '');
                                                                                }}
                                                                            />
                                                                            Cost Center
                                                                        </label>
                                                                    </td>
                                                                    <td className="py-0.5">{item.costcenter?.name || '-'}</td>
                                                                    <td className="py-0.5">
                                                                        <Select value={itemTransferDetails[item.id]?.new.costCenter} onValueChange={val => handleItemTransferInput(item.id, 'new', 'costCenter', val)} disabled={!!returnToAssetManager[item.id]}>
                                                                            <SelectTrigger className="w-full" size="sm"><SelectValue placeholder="New Cost Center" /></SelectTrigger>
                                                                            <SelectContent>
                                                                                {costCenters.map(cc => <SelectItem key={cc.id} value={String(cc.id)}>{cc.name}</SelectItem>)}
                                                                            </SelectContent>
                                                                        </Select>
                                                                    </td>
                                                                </tr>
                                                                <tr className="border-b-0">
                                                                    <td className="py-0.5">
                                                                        <label className="flex items-center gap-2">
                                                                            <input
                                                                                type="checkbox"
                                                                                className="w-4.5 h-4.5"
                                                                                checked={!!itemTransferDetails[item.id]?.new.department}
                                                                                disabled={!!returnToAssetManager[item.id]}
                                                                                onChange={e => {
                                                                                    if (!e.target.checked) handleItemTransferInput(item.id, 'new', 'department', '');
                                                                                }}
                                                                            />
                                                                            Department
                                                                        </label>
                                                                    </td>
                                                                    <td className="py-0.5">{item.department?.name || '-'}</td>
                                                                    <td className="py-0.5">
                                                                        <Select value={itemTransferDetails[item.id]?.new.department} onValueChange={val => handleItemTransferInput(item.id, 'new', 'department', val)} disabled={!!returnToAssetManager[item.id]}>
                                                                            <SelectTrigger className="w-full" size="sm"><SelectValue placeholder="New Department" /></SelectTrigger>
                                                                            <SelectContent>
                                                                                {departments.map(dept => <SelectItem key={dept.id} value={String(dept.id)}>{dept.name}</SelectItem>)}
                                                                            </SelectContent>
                                                                        </Select>
                                                                    </td>
                                                                </tr>
                                                                <tr className="border-b-0">
                                                                    <td className="py-0.5">
                                                                        <label className="flex items-center gap-2">
                                                                            <input
                                                                                type="checkbox"
                                                                                className="w-4.5 h-4.5"
                                                                                checked={!!itemTransferDetails[item.id]?.new.location}
                                                                                disabled={!!returnToAssetManager[item.id]}
                                                                                onChange={e => {
                                                                                    if (!e.target.checked) handleItemTransferInput(item.id, 'new', 'location', '');
                                                                                }}
                                                                            />
                                                                            Location (District)
                                                                        </label>
                                                                    </td>
                                                                    <td className="py-0.5">{item.district?.name || '-'}</td>
                                                                    <td className="py-0.5">
                                                                        <Select value={itemTransferDetails[item.id]?.new.location} onValueChange={val => handleItemTransferInput(item.id, 'new', 'location', val)} disabled={!!returnToAssetManager[item.id]}>
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
                                                            <Button
                                                                type="button"
                                                                size="icon"
                                                                variant="ghost"
                                                                className="ml-2 text-muted-foreground hover:text-primary"
                                                                disabled={!isReasonDirty(item.id)}
                                                                onClick={() => handleResetSection(item.id, "reason")}
                                                                aria-label="Reset Reason for Transfer"
                                                            >
                                                                {/* Undo icon removed */}
                                                            </Button>
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
                                                                            checked={!!itemReasons[item.id]?.[reason.value as keyof Reason]}
                                                                            onChange={e => handleItemReasonInput(item.id, reason.value as keyof Reason, e.target.checked)}
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
                                                    // Only count types for assets that have a valid type name
                                                    const typeCounts: Record<string, number> = {};
                                                    allAssets.forEach(a => {
                                                        const type = a.type && typeof a.type.name === 'string' && a.type.name.trim() ? a.type.name : '(Unspecified)';
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
                                                                                    {typeIcon && typeIcon}
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
                        <div className="flex gap-2 mt-4">
                            <Button
                                type="button"
                                variant="secondary"
                                className="bg-gray-200 hover:bg-gray-300 text-gray-800"
                                onClick={handleSaveDraft}
                            >
                                Save Draft
                            </Button>
                            <Button
                                type="submit"
                                variant="default"
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                                onClick={() => setRequestStatus('submitted')}
                            >
                                Submit
                            </Button>
                            <Button
                                type="button"
                                variant="destructive"
                                className="bg-red-600 hover:bg-red-700 text-white"
                                onClick={() => setShowForm(false)}
                            >
                                Cancel
                            </Button>
                        </div>
                        {/* 7. Workflow Section */}
                        <fieldset className="border rounded p-4">
                            <legend className="font-semibold text-lg">Workflow</legend>
                            <div className="space-y-4">
                                {/* Approved By */}
                                <div className="flex flex-col md:flex-row md:items-center gap-2">
                                    <label className="block my-1 font-medium min-w-[120px]">Approved By</label>
                                    <span className="w-full md:max-w-xs">{workflow.approvedBy?.name || '-'}</span>
                                    <label className="my-1 text-gray-500 min-w-[80px] md:ml-4">Action Date</label>
                                    <span className="w-full md:max-w-xs">{workflow.approvedBy?.date ? new Date(workflow.approvedBy.date).toLocaleString() : '-'}</span>
                                </div>
                                {workflow.approvedBy?.comment && (
                                    <div className="flex flex-col md:flex-row md:items-center gap-2 mb-2">
                                        <label className="block my-1 font-medium min-w-[120px]">Comment</label>
                                        <span className="w-full md:max-w-2xl">{workflow.approvedBy.comment}</span>
                                    </div>
                                )}
                                {/* Accepted By */}
                                <div className="flex flex-col md:flex-row md:items-center gap-2">
                                    <label className="block my-2 font-medium min-w-[120px]">Accepted By</label>
                                    <span className="w-full md:max-w-xs">{workflow.acceptedBy?.name || '-'}</span>
                                    <label className="my-1 text-gray-500 min-w-[80px] md:ml-4">Action Date</label>
                                    <span className="w-full md:max-w-xs">{workflow.acceptedBy?.date ? new Date(workflow.acceptedBy.date).toLocaleString() : '-'}</span>
                                </div>
                                {workflow.acceptedBy?.comment && (
                                    <div className="flex flex-col md:flex-row md:items-center gap-2 mb-2">
                                        <label className="block my-1 font-medium min-w-[120px]">Comment</label>
                                        <span className="w-full md:max-w-2xl">{workflow.acceptedBy.comment}</span>
                                    </div>
                                )}
                                {/* QA Section */}
                                <div className="flex flex-col md:flex-row md:items-center gap-2">
                                    <label className="block my-1 font-medium min-w-[120px]">QA Section</label>
                                    <span className="w-full md:max-w-xs">{workflow.qaSection?.name || '-'}</span>
                                    <label className="my-1 text-gray-500 min-w-[80px] md:ml-4">Action Date</label>
                                    <span className="w-full md:max-w-xs">{workflow.qaSection?.date ? new Date(workflow.qaSection.date).toLocaleString() : '-'}</span>
                                </div>
                                {workflow.qaSection?.comment && (
                                    <div className="flex flex-col md:flex-row md:items-center gap-2 mb-2">
                                        <label className="block my-1 font-medium min-w-[120px]">Comment</label>
                                        <span className="w-full md:max-w-2xl">{workflow.qaSection.comment}</span>
                                    </div>
                                )}
                                {/* Asset Manager */}
                                <div className="flex flex-col md:flex-row md:items-center gap-2">
                                    <label className="block my-1 font-medium min-w-[120px]">Asset Manager</label>
                                    <span className="w-full md:max-w-xs">{workflow.assetManager?.name || '-'}</span>
                                    <label className="my-1 text-gray-500 min-w-[80px] md:ml-4">Action Date</label>
                                    <span className="w-full md:max-w-xs">{workflow.assetManager?.date ? new Date(workflow.assetManager.date).toLocaleString() : '-'}</span>
                                </div>
                                {workflow.assetManager?.comment && (
                                    <div className="flex flex-col md:flex-row md:items-center gap-2 mb-2">
                                        <label className="block my-1 font-medium min-w-[120px]">Comment</label>
                                        <span className="w-full md:max-w-2xl">{workflow.assetManager.comment}</span>
                                    </div>
                                )}
                            </div>
                        </fieldset>
                    </form>
                </div>
            )}
        </div>
    );
}

// Add this at the bottom of the file:
function AssetTransferRequestsGrid() {
    const [data, setData] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(false);

    React.useEffect(() => {
        setLoading(true);
        authenticatedApi.get("/api/assets/transfer-requests").then((res: any) => {
            setData(res?.data?.data || []);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    const columns: ColumnDef<any>[] = [
        { key: "request_no", header: "Request No" },
        { key: "requestor", header: "Requestor" },
        { key: "request_date", header: "Request Date", render: row => row.request_date ? new Date(row.request_date).toLocaleDateString() : "-" },
        { key: "request_status", header: "Status" },
    ];

    return (
        <CustomDataGrid columns={columns} data={data} inputFilter={true} />
    );
}