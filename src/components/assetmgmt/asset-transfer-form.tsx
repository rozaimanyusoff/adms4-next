import React, { useEffect, useContext } from 'react';
import { AuthContext } from "@/store/AuthContext";
import { Checkbox } from '../ui/checkbox';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { CirclePlus, Plus, CarIcon, ComputerIcon, LucideComputer, User, X, ChevronDown } from "lucide-react";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { authenticatedApi } from "@/config/api";
import {
    Accordion,
    AccordionItem,
    AccordionTrigger,
    AccordionContent,
} from "@/components/ui/accordion";
import ActionSidebar from '@components/ui/action-aside';
import {
    Tabs,
    TabsList,
    TabsTrigger,
    TabsContent,
} from "@/components/ui/tabs";

// Define reasons for transfer inside the form
const ASSET_REASONS = [
    { label: 'Resignation', value: 'resignation' },
    { label: 'Relocation', value: 'relocation' },
    { label: 'Disposal', value: 'disposal' },
    { label: 'Asset Problem', value: 'asset_problem' },
];

const EMPLOYEE_REASONS = [
    { label: 'Temporary Assignment (< 30 days)', value: 'temporary_assignment' },
    { label: 'Upgrading/Promotion', value: 'upgrading_promotion' },
    { label: 'Department Restructure', value: 'department_restructure' },
    { label: 'Resignation', value: 'resignation' },
    { label: 'Relocation', value: 'relocation' },
    { label: 'Disposal', value: 'disposal' },
];

// Define the Requestor interface if not already imported
type Requestor = {
    ramco_id: string;
    full_name: string;
    position: { id: number; name: string } | null;
    department: { id: number; name: string, code: string, old_asset_id: number, dept_desc_malay: string, status: number } | null;
    costcenter: { id: number; name: string, owner_type: string } | null;
    district: { id: number; name: string, code: string } | null;
    email?: string;
    contact?: string;
    // Add any other fields as needed
};

// Change AssetTransferForm to a self-contained component
const AssetTransferForm: React.FC = () => {
    const [form, setForm] = React.useState<any>({ requestor: {}, reason: {} });
    const [selectedItems, setSelectedItems] = React.useState<any[]>([]);
    const [supervised, setSupervised] = React.useState<any[]>([]);
    const [returnToAssetManager, setReturnToAssetManager] = React.useState<{ [key: number]: boolean }>({});
    const [itemEffectiveDates, setItemEffectiveDates] = React.useState<{ [key: string]: string }>({});
    const [sidebarOpen, setSidebarOpen] = React.useState(false);
    const [employeeSearch, setEmployeeSearch] = React.useState('');
    const [assetSearch, setAssetSearch] = React.useState('');
    const [dateRequest, setDateRequest] = React.useState('');
    const [itemTransferDetails, setItemTransferDetails] = React.useState<any>({});
    const [employees, setEmployees] = React.useState<any[]>([]);
    const [selectedOwnerName, setSelectedOwnerName] = React.useState('');
    const [costCenters, setCostCenters] = React.useState<any[]>([]);
    const [departments, setDepartments] = React.useState<any[]>([]);
    const [districts, setDistricts] = React.useState<any[]>([]);
    const [itemReasons, setItemReasons] = React.useState<any>({});
    const [workflow, setWorkflow] = React.useState<any>({});
    const [requestStatus, setRequestStatus] = React.useState<'draft' | 'submitted'>('draft');
    const [initialForm, setInitialForm] = React.useState<any>({ requestor: {}, reason: {} });
    const [submitError, setSubmitError] = React.useState<string | null>(null);
    // Add a loading state for sidebar data
    const [sidebarLoading, setSidebarLoading] = React.useState(false);

    const authContext = useContext(AuthContext);
    const user = authContext?.authData?.user;

    function clearFormAndItems() {
        setForm(initialForm);
        setSelectedItems([]);
        setItemReasons({});
        setItemTransferDetails({});
        setItemEffectiveDates({});
        setReturnToAssetManager({});
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setSubmitError(null);
        for (const item of selectedItems) {
            const transfer = itemTransferDetails[item.id] || { current: {}, new: {}, effectiveDate: '' };
            const reasons = itemReasons[item.id] || {};
            const effectiveDate = itemEffectiveDates[item.id] || '';
            const transferDetailsFilled = (
                Object.values(transfer.new || {}).some(v => v && v !== '') ||
                !!returnToAssetManager[item.id]
            );
            const reasonFilled = Object.entries(reasons)
                .filter(([k]) => k !== 'othersText' && k !== 'comment')
                .some(([, v]) => v === true);
            const effectiveDateFilled = !!effectiveDate;
            if (!effectiveDateFilled) {
                setSubmitError(`Please set the Effective Date for all selected items. Missing for: ${item.full_name || item.serial_number || item.asset_code || item.id}`);
                return;
            }
            if (!transferDetailsFilled) {
                setSubmitError(`Please fill at least one Transfer Detail (New) or check 'Return to Asset Manager' for: ${item.full_name || item.serial_number || item.asset_code || item.id}`);
                return;
            }
            if (!reasonFilled) {
                setSubmitError(`Please select at least one Reason for Transfer for: ${item.full_name || item.serial_number || item.asset_code || item.id}`);
                return;
            }
        }
        const payload = {
            requestor: String(form.requestor.ramco_id),
            request_no: '',
            request_date: new Date().toISOString().slice(0, 10),
            request_status: requestStatus,
            details: selectedItems.map(item => {
                const transfer = itemTransferDetails[item.id] || { current: {}, new: {}, effectiveDate: '' };
                const reasons = itemReasons[item.id] || {};
                const effectiveDate = itemEffectiveDates[item.id] || '';
                const emptyDetails = {
                    ownerName: '', ownerStaffId: '', location: '', costCenter: '', department: '', condition: '', brandModel: '', serialNo: '',
                };
                const current = { ...emptyDetails, ...(transfer.current || {}) };
                const newDetails = { ...emptyDetails, ...(transfer.new || {}) };
                const new_costcenter = { id: parseInt(newDetails.costCenter || current.costCenter || item.costcenter?.id || '0', 10), name: item.costcenter?.name || '' };
                const new_department = { id: parseInt(newDetails.department || current.department || item.department?.id || '0', 10), name: item.department?.name || '' };
                const new_district = { id: parseInt(newDetails.location || current.location || item.district?.id || '0', 10), name: item.district?.name || '' };
                const reasonsStr = Object.entries(reasons)
                    .filter(([key, value]) => (typeof value === 'boolean' ? value : value === 'true'))
                    .map(([key]) => key)
                    .join(',');
                let new_owner = undefined;
                if (item.transfer_type === 'Asset') {
                    if (transfer.new.ownerName) {
                        new_owner = {
                            name: transfer.new.ownerName,
                            ramco_id: transfer.new.ownerStaffId || '',
                        };
                    } else if (item.new_owner && item.new_owner_staffId) {
                        new_owner = {
                            name: item.new_owner,
                            ramco_id: item.new_owner_staffId,
                        };
                    } else if (item.curr_owner) {
                        new_owner = {
                            name: item.curr_owner.name,
                            ramco_id: item.curr_owner.ramco_id,
                        };
                    } else if (item.owner) {
                        new_owner = {
                            name: item.owner.full_name,
                            ramco_id: item.owner.ramco_id,
                        };
                    }
                }
                return {
                    transfer_type: item.transfer_type,
                    effective_date: effectiveDate,
                    asset_type: item.type?.name || item.asset_type || '',
                    identifier: String(item.serial_number || item.ramco_id || '0'),
                    curr_owner: item.owner ? { ramco_id: item.owner.ramco_id, name: item.owner.full_name } : item.curr_owner ? { ramco_id: item.curr_owner.ramco_id, name: item.curr_owner.name } : null,
                    curr_costcenter: item.costcenter ? { id: item.costcenter.id, name: item.costcenter.name } : item.curr_costcenter ? { id: item.curr_costcenter.id, name: item.curr_costcenter.name } : null,
                    curr_department: item.department ? { id: item.department.id, name: item.department.name } : item.curr_department ? { id: item.curr_department.id, name: item.curr_department.name } : null,
                    curr_district: item.district ? { id: item.district.id, name: item.district.name } : item.curr_district ? { id: item.curr_district.id, name: item.curr_district.name } : null,
                    new_costcenter,
                    new_department,
                    new_district,
                    reasons: reasonsStr,
                    remarks: reasons.othersText,
                    attachment: null,
                    return_to_asset_manager: !!returnToAssetManager[item.id],
                    ...(item.transfer_type === 'Asset' && new_owner ? { new_owner } : {}),
                };
            }),
        };
        try {
            await authenticatedApi.post('/api/assets/transfer-requests', payload);
            toast.success(requestStatus === 'draft' ? 'Draft saved successfully!' : 'Transfer submitted successfully!');
            clearFormAndItems();
            handleCancel();
        } catch (err) {
            setSubmitError('Failed to submit transfer. Please try again.');
        }
    }

    function handleSaveDraft() {
        setRequestStatus('draft');
        clearFormAndItems();
        const formElement = document.createElement('form');
        const syntheticEvent = { preventDefault: () => { }, target: formElement } as unknown as React.FormEvent<HTMLFormElement>;
        handleSubmit(syntheticEvent);
    }

    // --- Internal handlers and helpers moved from parent ---
    function handleItemEffectiveDate(itemId: string, value: string) {
        setItemEffectiveDates((prev: any) => ({ ...prev, [itemId]: value }));
    }
    function handleItemTransferInput(itemId: string, section: 'current' | 'new', field: string, value: string) {
        setItemTransferDetails((prev: any) => ({
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

    function handleItemReasonInput(itemId: string, field: string, value: boolean | string) {
        setItemReasons((prev: any) => ({
            ...prev,
            [itemId]: {
                ...prev[itemId],
                [field]: typeof value === 'string' ? value === 'true' : !!value,
            },
        }));
    }
    function isReasonDirty(itemId: string) {
        // Implement a simple dirty check for reasons
        return !!itemReasons[itemId] && Object.values(itemReasons[itemId]).some(Boolean);
    }
    function handleResetSection(itemId: string, section: 'transferDetails' | 'reason' | 'attachments') {
        if (section === 'transferDetails') {
            setItemTransferDetails((prev: any) => ({ ...prev, [itemId]: { current: {}, new: {}, effectiveDate: '' } }));
        } else if (section === 'reason') {
            setItemReasons((prev: any) => ({ ...prev, [itemId]: {} }));
        }
    }
    function handleInput(section: string, field: string, value: string) {
        setForm((prev: any) => ({
            ...prev,
            [section]: {
                ...prev[section],
                [field]: value,
            },
        }));
    }

    // AddSelectedItem handler (internalized)
    function addSelectedItem(item: any) {
        setSelectedItems((prev: any[]) => {
            const isEmployee = !!(item.full_name || item.ramco_id);
            if (item.full_name && item.ramco_id) {
                return [
                    ...prev,
                    {
                        ...item,
                        transfer_type: 'Employee',
                        serial_number: '',
                        asset_code: '',
                    },
                ];
            }
            if (item.serial_number) {
                return [
                    ...prev,
                    {
                        ...item,
                        transfer_type: 'Asset',
                        serial_number: item.serial_number,
                        asset_code: item.asset_code || item.serial_number,
                        asset_type: item.type?.name || '',
                    },
                ];
            }
            return prev;
        });
    }

    // Remove a selected item by index
    function removeSelectedItem(idx: number) {
        setSelectedItems((prev: any[]) => prev.filter((_, i) => i !== idx));
    }

    // Fetch requestor data on mount (if user exists)
    useEffect(() => {
        if (!user?.username) return;
        authenticatedApi.get(`/api/assets/employees/lookup/${user.username}`)
            .then((res: any) => {
                const data = res?.data?.data;
                if (data) {
                    const requestor: Requestor = {
                        ramco_id: data.ramco_id || '',
                        full_name: data.full_name || '',
                        position: data.position || null,
                        department: data.department || null,
                        costcenter: data.costcenter || null,
                        district: data.district || null,
                        email: data.email || '',
                        contact: data.contact || '',
                        // Add any other fields as needed
                    };
                    setForm((prev: any) => ({
                        ...prev,
                        requestor,
                    }));
                }
            });
    }, [user?.username]);

    // Set request date to now (date and time) on mount if not already set
    React.useEffect(() => {
        if (!dateRequest) {
            const now = new Date();
            setDateRequest(now.toISOString());
        }
    }, [dateRequest]);

    // Handler to close the blank tab (window)
    function handleCancel() {
        window.close();
    }

    // Handler to open sidebar and fetch data
    async function handleOpenSidebar() {
        setSidebarLoading(true);
        try {
            const param = user?.username;
            const res: any = await authenticatedApi.get(`/api/assets/by-supervisor?ramco_id=${param}`);
            setSupervised(res.data?.data || []);
        } catch (err) {
            // Optionally handle error
        } finally {
            setSidebarLoading(false);
            setSidebarOpen(true);
        }
    }

    // Autocomplete for new owner (search employees)
    async function handleOwnerSearch(query: string) {
        if (!query || query.length < 2) {
            setEmployees([]);
            return;
        }
        try {
            const res: any = await authenticatedApi.get(`/api/assets/employees/search?q=${encodeURIComponent(query)}`);
            setEmployees(res.data?.data || []);
        } catch (err) {
            setEmployees([]);
        }
    }

    // Utility function to safely render a value as string
    function renderValue(val: any, fallback: string = '-') {
        if (val == null) return fallback;
        if (typeof val === 'string' || typeof val === 'number') return val;
        if (typeof val === 'object') {
            // Try common string properties
            if ('name' in val && typeof val.name === 'string') return val.name;
            if ('code' in val && typeof val.code === 'string') return val.code;
            if ('full_name' in val && typeof val.full_name === 'string') return val.full_name;
            if ('id' in val && typeof val.id === 'string') return val.id;
            // Fallback to JSON string for debugging
            return JSON.stringify(val);
        }
        return fallback;
    }

    return (
        <div className="w-full min-h-screen pt-10 bg-gray-50 dark:bg-gray-800">
            <form className="max-w-6xl mx-auto bg-white dark:bg-gray-900 p-6 rounded shadow-md text-sm space-y-6" onSubmit={handleSubmit}>
                {submitError && (
                    <div className="text-red-600 font-semibold mb-2">{submitError}</div>
                )}
                {/* 1. Requestor Details */}
                <fieldset className="border rounded p-4">
                    <legend className="font-semibold text-lg">Requestor</legend>
                    <div className="space-y-2">
                        {/* Hidden inputs for payload */}
                        <input type="hidden" name="ramco_id" value={form.requestor.ramco_id} />
                        <input type="hidden" name="request_date" value={dateRequest ? new Date(dateRequest).toISOString().slice(0, 10) : ''} />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="flex items-center gap-2">
                                <label className="block font-medium min-w-[120px] my-0.5">Name</label>
                                <span className="input w-full bg-white dark:bg-gray-900 border-none cursor-default">{form.requestor.full_name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <label className="block font-medium min-w-[120px] my-0.5">Ramco ID</label>
                                <span className="input w-full bg-white dark:bg-gray-900 border-none cursor-default">{form.requestor.ramco_id || form.requestor.ramco_id}</span>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="flex items-center gap-2">
                                <label className="block font-medium min-w-[120px] my-0.5">Position</label>
                                <span className="input w-full bg-white dark:bg-gray-900 border-none cursor-default">{form.requestor.position?.name || form.requestor.position || ''}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <label className="block font-medium min-w-[120px] my-0.5">Department</label>
                                <span className="input w-full bg-white dark:bg-gray-900 border-none cursor-default">{form.requestor.department?.name || ''}</span>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="flex items-center gap-2">
                                <label className="block font-medium min-w-[120px] my-0.5">Cost Center</label>
                                <span className="input w-full bg-white dark:bg-gray-900 border-none cursor-default">{form.requestor.costcenter?.name || ''}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <label className="block font-medium min-w-[120px] my-0.5">District</label>
                                <span className="input w-full bg-white dark:bg-gray-900 border-none cursor-default">{form.requestor.district?.name || ''}</span>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="flex items-center gap-2">
                                <label className="block font-medium min-w-[120px] my-0.5">Request Date</label>
                                <span className="input w-full bg-white dark:bg-gray-900 border-none cursor-default">{dateRequest ? new Date(dateRequest).toLocaleString() : ''}</span>
                            </div>
                        </div>
                    </div>
                </fieldset>

                {/* 2. Select Items (Button to open ActionSidebar) */}
                <fieldset className="border rounded p-4">
                    <legend className="font-semibold flex items-center text-lg gap-2">
                        Selected Items
                        <Button
                            type="button"
                            onClick={handleOpenSidebar}
                            size="icon"
                            variant="default"
                            className="ml-2"
                            title="Add Items"
                            disabled={sidebarLoading}
                        >
                            {sidebarLoading ? <span className="loader w-5 h-5" /> : <Plus className="w-5 h-5" />}
                        </Button>
                    </legend>
                    {selectedItems.length === 0 ? (
                        <div className="text-gray-400 text-center py-4">No items selected.</div>
                    ) : (
                        <div className="mt-2 px-1">
                            {selectedItems.map((item, idx) => {
                                if (typeof item.id === 'undefined' || item.id === null) return null;
                                const isEmployee = item.transfer_type === 'Employee';
                                const typeLabel = isEmployee ? 'Employee' : 'Asset';
                                // Find employee details for Employee accordions
                                const allEmployees = supervised.flatMap(g => g.employee || []);
                                const employeeDetails = allEmployees.find(e =>
                                    e.ramco_id === item.ramco_id || e.full_name === item.full_name
                                );
                                return (
                                    <Accordion type="single" collapsible key={item.id} className="mb-4 bg-gray-100 dark:bg-gray-800 rounded px-4">
                                        <AccordionItem value={`item-${item.id}`}>
                                            <AccordionTrigger>
                                                <div className="flex items-center justify-between w-full">
                                                    <div className="flex items-center gap-2">
                                                        <Button type="button" size="icon" variant="ghost" className="text-red-500 hover:bg-red-500 hover:text-white" onClick={e => { e.stopPropagation(); removeSelectedItem(idx); }}>
                                                            <X />
                                                        </Button>
                                                        <span className="text-xs font-semibold text-blue-600 min-w-[70px] text-left">{typeLabel}</span>
                                                        <span className="flex-1 font-medium">
                                                            {isEmployee ? (
                                                                <span>{renderValue(item.full_name) || renderValue(item.name) || renderValue(item.ramco_id)}</span>
                                                            ) : (
                                                                <>
                                                                    <span>S/N: {renderValue(item.serial_number)}
                                                                        {item.asset_type && (
                                                                            <span className="text-blue-500 text-xs"> [ {renderValue(item.asset_type)} ]</span>
                                                                        )}
                                                                    </span>
                                                                </>
                                                            )}
                                                        </span>
                                                    </div>
                                                </div>
                                            </AccordionTrigger>
                                            <AccordionContent>
                                                {/* EMPLOYEE DETAILS SECTION */}
                                                {item.transfer_type === 'Employee' && (
                                                    <div className="py-2 rounded">
                                                        <div className="font-semibold text-sm mb-2">Employee Details</div>
                                                        <div className="flex items-center justify-between text-sm">
                                                            <div>
                                                                <span className="text-muted-foreground">Position:</span>
                                                                <span className="ml-1">{renderValue(employeeDetails?.position?.name)}</span>
                                                            </div>
                                                            <div>
                                                                <span className="text-muted-foreground">Email:</span>
                                                                <span className="ml-1">{renderValue(employeeDetails?.email)}</span>
                                                            </div>
                                                            <div>
                                                                <span className="text-muted-foreground">Contact:</span>
                                                                <span className="ml-1">{renderValue(employeeDetails?.contact)}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                                {/* ASSET DETAILS SECTION */}
                                                {item.transfer_type === 'Asset' && (
                                                    <div className="py-2 rounded">
                                                        <div className="font-semibold mb-1">Asset Details</div>
                                                        <div className="flex items-center justify-between text-sm">
                                                            <div>
                                                                <span className="text-muted-foreground">Category:</span>
                                                                <span className="ml-1">{renderValue(item.category?.name)}</span>
                                                            </div>
                                                            <div>
                                                                <span className="text-muted-foreground">Brand:</span>
                                                                <span className="ml-1">{renderValue(item.brand?.name)}</span>
                                                            </div>
                                                            <div>
                                                                <span className="text-muted-foreground">Model:</span>
                                                                <span className="ml-1">{renderValue(item.model?.name)}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-muted-foreground ">Condition:</span>
                                                                <label className="inline-flex items-center gap-2 my-1">
                                                                    <Checkbox checked={item.condition === 'New'} disabled /> New
                                                                </label>
                                                                <label className="inline-flex items-center gap-2 my-1">
                                                                    <Checkbox checked disabled /> Used
                                                                </label>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                                {/* Transfer Details */}
                                                <hr className="my-2 border-gray-300" />
                                                <div>
                                                    <div className="font-semibold mb-2 flex items-center justify-between">
                                                        <div className="flex items-center">Transfer Details</div>
                                                    </div>
                                                    {/* Effective Date for both asset and employee transfers */}
                                                    <div className="my-1 flex items-center justify-between">
                                                        {/* Only show Return to Asset Manager for assets */}
                                                        {!isEmployee && (
                                                            <div className="flex items-center">
                                                                <label className="my-1 flex items-center gap-2">
                                                                    <Checkbox checked={!!returnToAssetManager[item.id]} onCheckedChange={checked => setReturnToAssetManager(prev => ({ ...prev, [item.id]: checked === true }))} />
                                                                    <span className="font-bold text-danger">Return to Asset Manager</span>
                                                                </label>
                                                            </div>
                                                        )}

                                                        <div className="flex items-center justify-end gap-2">
                                                            <label className="block font-medium mb-0">Effective Date <span className="text-red-500">*</span></label>
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
                                                    </div>

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
                                                                            <Checkbox disabled={!!returnToAssetManager[item.id]} />
                                                                            Owner
                                                                        </label>
                                                                    </td>
                                                                    <td className="py-0.5">
                                                                        <span>{renderValue(item.owner?.full_name)}</span>
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
                                                                                    {employees.map((e: any) => (
                                                                                        <li key={e.ramco_id} className="px-2 py-1 hover:bg-blue-100 cursor-pointer" onClick={() => { handleItemTransferInput(item.id, 'new', 'ownerName', e.ramco_id); setEmployees([]); setSelectedOwnerName(e.full_name); }}>{renderValue(e.full_name)}</li>
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
                                                                        <Checkbox
                                                                            checked={!!itemTransferDetails[item.id]?.new.costCenter}
                                                                            disabled={!!returnToAssetManager[item.id]}
                                                                            onCheckedChange={checked => { if (!checked) handleItemTransferInput(item.id, 'new', 'costCenter', ''); }}

                                                                        />
                                                                        Cost Center
                                                                    </label>
                                                                </td>
                                                                <td className="py-0.5">{renderValue(item.costcenter?.name)}</td>
                                                                <td className="py-0.5">
                                                                    <Select value={itemTransferDetails[item.id]?.new.costCenter} onValueChange={val => handleItemTransferInput(item.id, 'new', 'costCenter', val)} disabled={!!returnToAssetManager[item.id]}>
                                                                        <SelectTrigger className="w-full" size="sm"><SelectValue placeholder="New Cost Center" /></SelectTrigger>
                                                                        <SelectContent>
                                                                            {costCenters.map((cc: any) => <SelectItem key={cc.id} value={String(cc.id)}>{renderValue(cc.name)}</SelectItem>)}
                                                                        </SelectContent>
                                                                    </Select>
                                                                </td>
                                                            </tr>
                                                            <tr className="border-b-0">
                                                                <td className="py-0.5">
                                                                    <label className="flex items-center gap-2">
                                                                        <Checkbox
                                                                            checked={!!itemTransferDetails[item.id]?.new.department}
                                                                            disabled={!!returnToAssetManager[item.id]}
                                                                            onCheckedChange={checked => { if (!checked) handleItemTransferInput(item.id, 'new', 'department', ''); }}

                                                                        />
                                                                        Department
                                                                    </label>
                                                                </td>
                                                                <td className="py-0.5">{renderValue(item.department?.name)}</td>
                                                                <td className="py-0.5">
                                                                    <Select value={itemTransferDetails[item.id]?.new.department} onValueChange={val => handleItemTransferInput(item.id, 'new', 'department', val)} disabled={!!returnToAssetManager[item.id]}>
                                                                        <SelectTrigger className="w-full" size="sm"><SelectValue placeholder="New Department" /></SelectTrigger>
                                                                        <SelectContent>
                                                                            {departments.map((dept: any) => <SelectItem key={dept.id} value={String(dept.id)}>{renderValue(dept.name)}</SelectItem>)}
                                                                        </SelectContent>
                                                                    </Select>
                                                                </td>
                                                            </tr>
                                                            <tr className="border-b-0">
                                                                <td className="py-0.5">
                                                                    <label className="flex items-center gap-2">
                                                                        <Checkbox
                                                                            checked={!!itemTransferDetails[item.id]?.new.location}
                                                                            disabled={!!returnToAssetManager[item.id]}
                                                                            onCheckedChange={checked => { if (!checked) handleItemTransferInput(item.id, 'new', 'location', ''); }}

                                                                        />
                                                                        Location (District)
                                                                    </label>
                                                                </td>
                                                                <td className="py-0.5">{renderValue(item.district?.name)}</td>
                                                                <td className="py-0.5">
                                                                    <Select value={itemTransferDetails[item.id]?.new.location} onValueChange={val => handleItemTransferInput(item.id, 'new', 'location', val)} disabled={!!returnToAssetManager[item.id]}>
                                                                        <SelectTrigger className="w-full" size="sm"><SelectValue placeholder="New Location (District)" /></SelectTrigger>
                                                                        <SelectContent>
                                                                            {districts.map((district: any) => <SelectItem key={district.id} value={String(district.id)}>{renderValue(district.name)}</SelectItem>)}
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
                                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
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
                                                                    <Checkbox
                                                                        checked={!!itemReasons[item.id]?.[reason.value]}
                                                                        onCheckedChange={checked => handleItemReasonInput(item.id, reason.value, checked)}

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

                                                    <div className="flex flex-col md:flex-row justify-between gap-10 items-start mt-2">
                                                        <div className="flex-1">
                                                            <label className="font-semibold mb-1 block">Other Reason</label>
                                                            <textarea className="w-full min-h-[60px] border rounded px-2 py-1 text-sm" placeholder="Add your comment here..." />
                                                        </div>
                                                        <div className="flex-1">
                                                            <label className="font-semibold mb-1 block">Attachments</label>
                                                            <input type="file" className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" multiple />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Comment before Attachments */}

                                            </AccordionContent>
                                        </AccordionItem>
                                    </Accordion>
                                );
                            })}
                        </div>
                    )}
                    {sidebarOpen && (
                        <ActionSidebar
                            title="Transferable Items"
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
                                                    .filter((emp: any) => {
                                                        if (!employeeSearch) return true;
                                                        const search = employeeSearch.toLowerCase();
                                                        return (
                                                            emp.full_name?.toLowerCase().includes(search) ||
                                                            emp.ramco_id?.toLowerCase().includes(search) ||
                                                            emp.email?.toLowerCase().includes(search) ||
                                                            emp.department?.name?.toLowerCase().includes(search)
                                                        );
                                                    })
                                                    .map((emp: any, idx: number, arr: any[]) => (
                                                        <React.Fragment key={emp.ramco_id}>
                                                            <li className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded px-3 py-0.5">
                                                                <CirclePlus className="text-blue-500 w-6 h-6 cursor-pointer" onClick={() => { addSelectedItem(emp); }} />
                                                                <User className="w-6 h-6 text-cyan-600 text-shadow-2xs" />
                                                                <div>
                                                                    <span className='dark:text-dark-light'>{emp.full_name} <span className="text-xs text-gray-500 dark:text-dark-light">({emp.ramco_id})</span></span>
                                                                    {emp.position?.name && (
                                                                        <div className="text-xs text-gray-600 dark:text-dark-light">{emp.position?.name}</div>
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
                                                    .filter((a: any) => {
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
                                                    .map((a: any, j: any, arr: any) => {
                                                        let typeIcon = null;
                                                        if (a.type?.name?.toLowerCase().includes('motor')) {
                                                            typeIcon = <CarIcon className="w-4.5 h-4.5 text-pink-500" />;
                                                        } else if (a.type?.name?.toLowerCase().includes('computer')) {
                                                            typeIcon = <LucideComputer className="w-4.5 h-4.5 text-green-500" />;
                                                        }
                                                        return (
                                                            <React.Fragment key={a.id || a.serial_number || j}>
                                                                <li className="flex flex-col bg-gray-100 dark:bg-gray-800 rounded px-3 py-0.5">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="flex items-center gap-2">
                                                                            <CirclePlus className="text-blue-500 w-6 h-6 cursor-pointer" onClick={() => { addSelectedItem(a); }} />
                                                                            {typeIcon && typeIcon}
                                                                        </div>
                                                                        <div>
                                                                            <span className="font-medium dark:text-dark-light">{a.serial_number || a.asset_code}</span> <span className="text-xs text-gray-500 dark:text-dark-light">({a.asset_code || a.id})</span>
                                                                            <div className="text-xs text-gray-600  dark:text-dark-light mt-0.5">
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
                            size="sm"
                        />
                    )}
                </fieldset>
                <div className="flex justify-center gap-2 mt-4">
                    <Button
                        type="button"
                        variant="secondary"
                        className="bg-gray-300 hover:bg-gray-400 text-gray-800 hover:text-white"
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
                        onClick={handleCancel}
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
    );
};

export default AssetTransferForm;
