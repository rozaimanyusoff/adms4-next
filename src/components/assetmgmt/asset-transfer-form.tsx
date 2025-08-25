import React, { useEffect, useContext, useRef } from 'react';
import { AuthContext } from "@/store/AuthContext";
import { Checkbox } from '../ui/checkbox';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { CirclePlus, Plus, CarIcon, ComputerIcon, LucideComputer, User, X, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { authenticatedApi } from "@/config/api";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import ActionSidebar from '@components/ui/action-aside';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// --- Asset Transfer API and Form Types ---
export interface AssetTransferItem {
    id: number;
    transfer_request_id?: number;
    transfer_type: 'Employee' | 'Asset';
    asset_type?: string;
    identifier: string | { ramco_id: string; name: string };
    curr_owner?: { ramco_id: string; name: string } | null;
    curr_department?: { id: number; name: string } | null;
    curr_location?: { id: number; name: string } | null;
    curr_costcenter?: { id: number; name: string } | null;
    new_owner?: { ramco_id: string; name: string } | null;
    new_department?: { id: number; name: string } | null;
    new_location?: { id: number; name: string } | null;
    new_costcenter?: { id: number; name: string } | null;
    effective_date?: string;
    reasons?: string;
    attachment?: any;
    accepted_by?: any;
    accepted_at?: any;
    acceptance_remarks?: any;
    created_at?: string;
    updated_at?: string;
    // For form rendering convenience
    register_number?: string;
    ramco_id?: string;
    full_name?: string;
    owner?: { ramco_id: string; name: string } | null;
    costcenter?: { id: number; name: string } | null;
    department?: { id: number; name: string } | null;
    location?: { id: number; name: string } | null;
}

export interface AssetTransferRequest {
    id?: number;
    request_no?: string;
    requestor: {
        ramco_id: string;
        name: string;
        cost_center?: { id: number; name: string };
        department?: { id: number; name: string };
        location?: { id: number; name: string };
        [key: string]: any;
    };
    request_date: string;
    request_status: 'draft' | 'submitted';
    items: AssetTransferItem[];
    [key: string]: any;
}

// Define reasons for transfer inside the form
const ASSET_REASONS = [
    { label: 'Resignation', value: 'resignation' },
    { label: 'Relocation', value: 'relocation' },
    { label: 'Data Update', value: 'data_update' },
    { label: 'Disposal', value: 'disposal' },
    { label: 'Asset Problem', value: 'asset_problem' },
];

const EMPLOYEE_REASONS = [
    { label: 'Temporary Assignment (< 30 days)', value: 'temporary_assignment' },
    { label: 'Upgrading/Promotion', value: 'upgrading_promotion' },
    { label: 'Department Restructure', value: 'department_restructure' },
    { label: 'Resignation', value: 'resignation' },
    { label: 'Relocation', value: 'relocation' },
    { label: 'Data Update', value: 'data_update' },
    { label: 'Disposal', value: 'disposal' },
];

// Define the Requestor interface if not already imported
type Requestor = {
    ramco_id: string;
    full_name: string;
    position: { id: number; name: string } | null;
    department: { id: number; name: string, code: string } | null;
    costcenter: { id: number; name: string } | null;
    location: { id: number; name: string, code: string } | null;
    email?: string;
    contact?: string;
    // Add any other fields as needed
};

interface NewOwner {
    full_name: string;
    ramco_id: string;
}

interface CostCenter {
    id: number;
    name: string;
    owner_type: string;
    owner_id: number;
    start_date: string;
    end_date: string;
    status: string;
    createAt: string;
}

interface Department {
    id: number;
    old_asset_id: number;
    code: string;
    name: string;
    dept_desc_malay: string;
    status: number;
}

interface Location {
    id: number;
    name: string;
    code: string;
    zone: string | null;
}

// Change AssetTransferForm to a self-contained component
interface AssetTransferFormProps {
    id?: string | null;
}

const AssetTransferForm: React.FC<AssetTransferFormProps> = ({ id }) => {
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
    const [costCenters, setCostCenters] = React.useState<CostCenter[]>([]);
    const [departments, setDepartments] = React.useState<Department[]>([]);
    const [locations, setLocations] = React.useState<Location[]>([]);
    const [itemReasons, setItemReasons] = React.useState<any>({});
    const [workflow, setWorkflow] = React.useState<any>({});
    const [requestStatus, setRequestStatus] = React.useState<'draft' | 'submitted'>('draft');
    const [initialForm, setInitialForm] = React.useState<any>({ requestor: {}, reason: {} });
    const [submitError, setSubmitError] = React.useState<string | null>(null);
    // Add a loading state for sidebar data
    const [sidebarLoading, setSidebarLoading] = React.useState(false);
    const [openSubmitDialog, setOpenSubmitDialog] = React.useState(false);
    const [openDraftDialog, setOpenDraftDialog] = React.useState(false);
    const [openCancelDialog, setOpenCancelDialog] = React.useState(false);
    const [loading, setLoading] = React.useState(!!id);
    const [error, setError] = React.useState<string | null>(null);
    const [showAccordionTooltip, setShowAccordionTooltip] = React.useState<{ [id: string]: boolean }>({});
    const [showAddItemsTooltip, setShowAddItemsTooltip] = React.useState(false);
    // Track which items' accordions are expanded so we can apply the approval-level visual style
    const [expandedItems, setExpandedItems] = React.useState<Record<number, boolean>>({});

    const authContext = useContext(AuthContext);
    const user = authContext?.authData?.user;
    const formRef = useRef<HTMLFormElement>(null);

    function clearFormAndItems() {
        setForm(initialForm);
        setSelectedItems([]);
        setItemReasons({});
        setItemTransferDetails({});
        setItemEffectiveDates({});
        setReturnToAssetManager({});
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>, status?: 'draft' | 'submitted') {
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
                setSubmitError(`Please set the Effective Date for all selected items. Missing for: ${item.full_name || item.register_number || item.asset_code || item.id}`);
                return;
            }
            if (!transferDetailsFilled) {
                setSubmitError(`Please fill at least one Transfer Detail (New) or check 'Return to Asset Manager' for: ${item.full_name || item.register_number || item.asset_code || item.id}`);
                return;
            }
            if (!reasonFilled) {
                setSubmitError(`Please select at least one Reason for Transfer for: ${item.full_name || item.register_number || item.asset_code || item.id}`);
                return;
            }
        }
        const payload = {
            requestor: String(form.requestor.ramco_id),
            request_no: '',
            request_date: new Date().toISOString().slice(0, 10),
            request_status: status || requestStatus,
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
                const new_location = { id: parseInt(newDetails.location || current.location || item.location?.id || '0', 10), name: item.location?.name || '' };
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
                    identifier: String(item.register_number || item.ramco_id || '0'),
                    curr_owner: item.owner ? { ramco_id: item.owner.ramco_id, name: item.owner.full_name } : item.curr_owner ? { ramco_id: item.curr_owner.ramco_id, name: item.curr_owner.name } : null,
                    curr_costcenter: item.costcenter ? { id: item.costcenter.id, name: item.costcenter.name } : item.curr_costcenter ? { id: item.curr_costcenter.id, name: item.curr_costcenter.name } : null,
                    curr_department: item.department ? { id: item.department.id, name: item.department.name } : item.curr_department ? { id: item.curr_department.id, name: item.curr_department.name } : null,
                    curr_location: item.location ? { id: item.location.id, name: item.location.name } : item.curr_location ? { id: item.curr_location.id, name: item.curr_location.name } : null,
                    new_costcenter,
                    new_department,
                    new_location,
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
            toast.success((status || requestStatus) === 'draft' ? 'Draft saved successfully!' : 'Transfer submitted successfully!');
            clearFormAndItems();
            handleCancel();
        } catch (err) {
            setSubmitError('Failed to submit transfer. Please try again.');
        }
    }

    async function handleSaveDraft() {
        clearFormAndItems();
        const formElement = document.createElement('form');
        const syntheticEvent = { preventDefault: () => { }, target: formElement } as unknown as React.FormEvent<HTMLFormElement>;
        handleSubmit(syntheticEvent, 'draft');
    }

    // --- Internal handlers and helpers moved from parent ---
    function handleItemEffectiveDate(itemId: string, value: string) {
        setItemEffectiveDates((prev: any) => ({ ...prev, [itemId]: value }));
    }

    // Detect changes in item transfer details for both current and new sections then update checkbox state
    // This function is used to update the itemTransferDetails state when a new value is entered
    function detectNewChanges(itemId: string, section: 'current' | 'new', field: string, value: string) {
        setItemTransferDetails((prev: any) => {
            const updatedItem = {
                ...prev[itemId],
                [section]: {
                    ...prev[itemId]?.[section],
                    [field]: value,
                },
                effectiveDate: prev[itemId]?.effectiveDate || '',
            };

            // Automatically check or uncheck the corresponding checkbox for New Owner, Cost Center, Department, or Location
            if (section === 'new' && ['ownerName', 'costCenter', 'department', 'location'].includes(field)) {
                updatedItem[section].ownerChecked = field === 'ownerName' ? !!value : updatedItem[section].ownerChecked;
            }

            return {
                ...prev,
                [itemId]: updatedItem,
            };
        });
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
            let newList;
            if (item.full_name && item.ramco_id) {
                newList = [
                    ...prev,
                    {
                        ...item,
                        transfer_type: 'Employee',
                        register_number: '',
                        asset_code: '',
                    },
                ];
            } else if (item.register_number) {
                newList = [
                    ...prev,
                    {
                        ...item,
                        transfer_type: 'Asset',
                        register_number: item.register_number,
                        asset_code: item.asset_code || item.register_number,
                        asset_type: item.type?.name || '',
                    },
                ];
            } else {
                newList = prev;
            }
            if (newList.length > prev.length) {
                toast.success('Item added to selection.');
                // Show tooltip for the new item
                const newItem = newList[newList.length - 1];
                setShowAccordionTooltip((prevTooltip) => ({ ...prevTooltip, [newItem.id]: true }));
                setTimeout(() => {
                    setShowAccordionTooltip((prevTooltip) => ({ ...prevTooltip, [newItem.id]: false }));
                }, 5000);
            }
            return newList;
        });
    }

    // Remove a selected item by index
    function removeSelectedItem(idx: number) {
        setSelectedItems((prev: any[]) => {
            const removed = prev[idx];
            const newList = prev.filter((_, i) => i !== idx);
            if (removed) {
                toast.info('Item removed from selection.');
            }
            return newList;
        });
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
                        location: data.location || null,
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
    async function handleCancel() {
        // This is now handled by AlertDialog, so just close dialog or navigate as needed
        window.close();
    }

    // Handler to open sidebar and fetch data
    async function handleOpenSidebar() {
        setSidebarLoading(true);
        try {
            const param = form?.requestor?.ramco_id || user?.username;
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
    async function handleNewOwnerAutocomplete(query: string) {
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

    // Fetch data for cost center, departments, and locations from their respective APIs and populate the dropdowns.
    useEffect(() => {
        async function fetchDropdownData() {
            try {
                const [costCentersRes, departmentsRes, locationsRes] = await Promise.all([
                    authenticatedApi.get<{ data: CostCenter[] }>('/api/assets/costcenters'),
                    authenticatedApi.get<{ data: Department[] }>('/api/assets/departments'),
                    authenticatedApi.get<{ data: Location[] }>('/api/assets/locations'),
                ]);

                setCostCenters(costCentersRes.data.data || []);
                setDepartments(departmentsRes.data.data || []);
                setLocations(locationsRes.data.data || []);
            } catch (error) {
                console.error('Failed to fetch dropdown data:', error);
            }
        }

        fetchDropdownData();
    }, []);

    const handleSubmitConfirmed = () => {
        setOpenSubmitDialog(false);
        if (formRef.current) {
            const event = { preventDefault: () => { }, target: formRef.current } as unknown as React.FormEvent<HTMLFormElement>;
            handleSubmit(event, 'submitted');
        }
    };
    const handleSaveDraftConfirmed = () => {
        setOpenDraftDialog(false);
        handleSaveDraft();
    };

    // Fetch transfer request if id is provided
    React.useEffect(() => {
        if (id) {
            setLoading(true);
            authenticatedApi.get(`/api/assets/transfer-requests/${id}`)
                .then((res: any) => {
                    const data = res?.data?.data;
                    if (data) {
                        // Prefill form state for edit mode
                        setForm((prev: any) => ({ ...prev, ...data, requestor: data.requestor }));
                        // Map items to selectedItems
                        if (Array.isArray(data.items)) {
                            setSelectedItems(data.items.map((item: any) => ({
                                ...item,
                                id: item.id,
                                transfer_type: item.transfer_type,
                                register_number: typeof item.identifier === 'string' ? item.identifier : undefined,
                                ramco_id: typeof item.identifier === 'object' ? item.identifier.ramco_id : undefined,
                                full_name: typeof item.identifier === 'object' ? item.identifier.name : undefined,
                                asset_type: item.asset_type,
                                owner: item.curr_owner,
                                costcenter: item.curr_costcenter,
                                department: item.curr_department,
                                location: item.curr_location,
                            })));
                            // Prefill effective dates
                            setItemEffectiveDates(
                                Object.fromEntries(data.items.map((item: any) => [item.id, item.effective_date ? item.effective_date.slice(0, 10) : '']))
                            );
                            // Prefill transfer details (current/new)
                            setItemTransferDetails(
                                Object.fromEntries(data.items.map((item: any) => [item.id, {
                                    current: {
                                        ownerName: item.curr_owner?.name || '',
                                        ownerStaffId: item.curr_owner?.ramco_id || '',
                                        costCenter: item.curr_costcenter?.id ? String(item.curr_costcenter.id) : '',
                                        department: item.curr_department?.id ? String(item.curr_department.id) : '',
                                        location: item.curr_location?.id ? String(item.curr_location.id) : '',
                                    },
                                    new: {
                                        ownerName: item.new_owner?.name || '',
                                        ownerStaffId: item.new_owner?.ramco_id || '',
                                        costCenter: item.new_costcenter?.id ? String(item.new_costcenter.id) : '',
                                        department: item.new_department?.id ? String(item.new_department.id) : '',
                                        location: item.new_location?.id ? String(item.new_location.id) : '',
                                    },
                                    effectiveDate: item.effective_date ? item.effective_date.slice(0, 10) : '',
                                }]))
                            );
                            // Prefill reasons
                            setItemReasons(
                                Object.fromEntries(data.items.map((item: any) => [item.id, Object.fromEntries((item.reasons || '').split(',').filter(Boolean).map((r: string) => [r, true]))]))
                            );
                            // Prefill returnToAssetManager
                            setReturnToAssetManager(
                                Object.fromEntries(data.items.map((item: any) => [item.id, !!item.return_to_asset_manager]))
                            );
                        }
                        // Prefill workflow if present
                        if (data.workflow) setWorkflow(data.workflow);
                        // Prefill request status
                        if (data.request_status) setRequestStatus(data.request_status);
                        // Prefill request date
                        if (data.request_date) setDateRequest(data.request_date);
                    }
                    setLoading(false);
                })
                .catch(() => {
                    setError('Failed to load transfer request.');
                    setLoading(false);
                });
        }
    }, [id]);

    // Show tooltip to add items if none are selected
    React.useEffect(() => {
        if (selectedItems.length === 0) {
            setShowAddItemsTooltip(true);
            const timer = setTimeout(() => setShowAddItemsTooltip(false), 5000);
            return () => clearTimeout(timer);
        }
    }, [selectedItems.length]);

    if (loading) return <div className="p-8 text-center">Loading...</div>;
    if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

    return (
        <div className="w-full min-h-screen bg-gray-50 dark:bg-gray-800">
            {/* HEADER (dark) similar to screenshot */}
            <div className="w-full bg-slate-900 mb-10">
                <div className="mx-auto px-6 py-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <h2 className="text-white text-sm font-semibold">
                                Asset Transfer Form
                            </h2>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button className="p-2 bg-red-600 hover:bg-red-700 text-white" onClick={handleCancel} aria-label="close"><X size={16} /></Button>
                        </div>
                    </div>
                </div>
            </div>
            {/* AlertDialogs for confirmation */}
            <AlertDialog open={openSubmitDialog} onOpenChange={setOpenSubmitDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Submit Transfer Request?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to submit this transfer request? You will not be able to edit after submission.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction asChild>
                            <button
                                type="submit"
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
                                onClick={handleSubmitConfirmed}
                            >
                                Yes, Submit
                            </button>
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <AlertDialog open={openDraftDialog} onOpenChange={setOpenDraftDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Save as Draft?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Do you want to save this transfer request as a draft? You can continue editing later.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction asChild>
                            <button
                                type="button"
                                className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded"
                                onClick={handleSaveDraftConfirmed}
                            >
                                Yes, Save Draft
                            </button>
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <AlertDialog open={openCancelDialog} onOpenChange={setOpenCancelDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Leave Form?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to leave this form? Unsaved changes will be lost.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Stay</AlertDialogCancel>
                        <AlertDialogAction asChild>
                            <button
                                type="button"
                                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
                                onClick={handleCancel}
                            >
                                Leave
                            </button>
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <form className="max-w-6xl mx-auto bg-white dark:bg-gray-900 p-6 rounded shadow-md text-sm space-y-6" onSubmit={e => { e.preventDefault(); setOpenSubmitDialog(true); }} ref={formRef}>
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
                                <label className="block font-medium min-w-[120px] my-0.5">Location</label>
                                <span className="input w-full bg-white dark:bg-gray-900 border-none cursor-default">{form.requestor.location?.name || ''}</span>
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
                        <TooltipProvider>
                            <Tooltip open={showAddItemsTooltip}>
                                <TooltipTrigger asChild>
                                    <span>
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
                                    </span>
                                </TooltipTrigger>
                                <TooltipContent side="top" align="center" className="z-50">
                                    Click here to add items for transfer.
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
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
                                    <Accordion
                                        type="single"
                                        collapsible
                                        key={item.id}
                                        // controlled expansion so we can style the expanded item
                                        value={expandedItems[item.id] ? `item-${item.id}` : undefined}
                                        onValueChange={(val: string | undefined) => setExpandedItems(prev => ({ ...prev, [item.id]: !!val }))}
                                        className={`mb-4 bg-gray-100 dark:bg-gray-800 rounded px-4 ${expandedItems[item.id] ? 'border rounded-lg' : ''}`}
                                    >
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
                                                                    <span>S/N: {renderValue(item.register_number)}
                                                                        {item.asset_type && (
                                                                            <span className="text-blue-500 text-xs"> [ {renderValue(item.asset_type)} ]</span>
                                                                        )}
                                                                    </span>
                                                                </>
                                                            )}
                                                        </span>
                                                        {/* Tooltip for expand notification */}
                                                        <TooltipProvider>
                                                            <Tooltip open={!!showAccordionTooltip[item.id]}>
                                                                <TooltipTrigger asChild>
                                                                    <span tabIndex={-1} />
                                                                </TooltipTrigger>
                                                                <TooltipContent side="top" align="center" className="z-50">
                                                                    Please expand and complete the transfer details below.
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                    </div>
                                                </div>
                                            </AccordionTrigger>
                                            <AccordionContent>
                                                <div className={`p-4 bg-gray-50 rounded-lg border ${expandedItems[item.id] ? '' : ''}`}>
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
                                                    <div className="font-semibold mb-2 flex items-center justify-start gap-6">
                                                        <div className="flex items-center">Transfer Details</div>
                                                        {/* Show only Transfer Details error for this item */}
                                                        {submitError && submitError.includes(item.register_number || item.full_name || item.asset_code || item.id)
                                                            && submitError.toLowerCase().includes('transfer detail') && (
                                                                <div className="text-red-600 text-xs font-semibold">
                                                                    {submitError}
                                                                </div>
                                                            )}
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
                                                                            <Checkbox
                                                                                checked={!!itemTransferDetails[item.id]?.new.ownerChecked}
                                                                                disabled={!!returnToAssetManager[item.id]}
                                                                                onCheckedChange={checked => {
                                                                                    if (checked === false) {
                                                                                        // clearNewOwnerField(item.id);
                                                                                    } else {
                                                                                        detectNewChanges(item.id, 'new', 'ownerName', selectedOwnerName || '');
                                                                                    }
                                                                                }}
                                                                            />
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
                                                                                value={selectedOwnerName || itemTransferDetails[item.id]?.new.ownerName || ''}
                                                                                onChange={e => {
                                                                                    detectNewChanges(item.id, 'new', 'ownerName', e.target.value);
                                                                                    handleNewOwnerAutocomplete(e.target.value);
                                                                                    setSelectedOwnerName(e.target.value);
                                                                                }}
                                                                                autoComplete="off"
                                                                                disabled={!!returnToAssetManager[item.id]}
                                                                            />
                                                                            {employees.length > 0 && (
                                                                                <ul className="absolute z-10 bg-white border w-full max-h-40 overflow-y-auto">
                                                                                    {employees.map((employee: NewOwner) => (
                                                                                        <li
                                                                                            key={employee.ramco_id}
                                                                                            className="px-2 py-1 hover:bg-blue-100 cursor-pointer"
                                                                                            onClick={() => {
                                                                                                detectNewChanges(item.id, 'new', 'ownerName', employee.ramco_id);
                                                                                                setEmployees([]);
                                                                                                setSelectedOwnerName(employee.full_name);
                                                                                            }}
                                                                                        >
                                                                                            {employee.full_name}
                                                                                        </li>
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
                                                                            onCheckedChange={checked => { if (!checked) detectNewChanges(item.id, 'new', 'costCenter', ''); }}

                                                                        />
                                                                        Cost Center
                                                                    </label>
                                                                </td>
                                                                <td className="py-0.5">{renderValue(item.costcenter?.name)}</td>
                                                                <td className="py-0.5">
                                                                    <Select value={itemTransferDetails[item.id]?.new.costCenter} onValueChange={val => detectNewChanges(item.id, 'new', 'costCenter', val)} disabled={!!returnToAssetManager[item.id]}>
                                                                        <SelectTrigger className="w-full" size="sm"><SelectValue placeholder="New Cost Center" /></SelectTrigger>
                                                                        <SelectContent>
                                                                            {costCenters.map((cc: CostCenter) => <SelectItem key={cc.id} value={String(cc.id)}>{renderValue(cc.name)}</SelectItem>)}
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
                                                                            onCheckedChange={checked => { if (!checked) detectNewChanges(item.id, 'new', 'department', ''); }}

                                                                        />
                                                                        Department
                                                                    </label>
                                                                </td>
                                                                <td className="py-0.5">{renderValue(item.department?.name)}</td>
                                                                <td className="py-0.5">
                                                                    <Select value={itemTransferDetails[item.id]?.new.department} onValueChange={val => detectNewChanges(item.id, 'new', 'department', val)} disabled={!!returnToAssetManager[item.id]}>
                                                                        <SelectTrigger className="w-full" size="sm"><SelectValue placeholder="New Department" /></SelectTrigger>
                                                                        <SelectContent>
                                                                            {departments.map((dept: Department) => <SelectItem key={dept.id} value={String(dept.id)}>{renderValue(dept.code)}</SelectItem>)}
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
                                                                            onCheckedChange={checked => { if (!checked) detectNewChanges(item.id, 'new', 'location', ''); }}

                                                                        />
                                                                        Location
                                                                    </label>
                                                                </td>
                                                                <td className="py-0.5">{renderValue(item.location?.name)}</td>
                                                                <td className="py-0.5">
                                                                    <Select value={itemTransferDetails[item.id]?.new.location} onValueChange={val => detectNewChanges(item.id, 'new', 'location', val)} disabled={!!returnToAssetManager[item.id]}>
                                                                        <SelectTrigger className="w-full" size="sm"><SelectValue placeholder="New Location" /></SelectTrigger>
                                                                        <SelectContent>
                                                                            {locations.map((loc: Location) => <SelectItem key={loc.id} value={String(loc.id)}>{renderValue(loc.code)}</SelectItem>)}
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
                                                    <div className="font-semibold mb-2 flex items-center justify-start gap-6">
                                                        Reason for Transfer
                                                        {/* Show only Reason for Transfer error for this item */}
                                                        {submitError && submitError.includes(item.register_number || item.full_name || item.asset_code || item.id)
                                                            && submitError.toLowerCase().includes('reason for transfer') && (
                                                                <div className="text-red-600 text-xs font-semibold">
                                                                    {submitError}
                                                                </div>
                                                            )}
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

                                                </div>
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
                                                            <div className="flex items-start gap-3 bg-white dark:bg-gray-800 rounded-md p-3 border border-gray-200 dark:border-gray-700">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => { addSelectedItem(emp); }}
                                                                    className="w-8 h-8 flex items-center justify-center rounded-full border border-blue-200 text-blue-500 hover:bg-blue-50"
                                                                    aria-label={`Add ${emp.full_name}`}
                                                                >
                                                                    <CirclePlus className="w-4 h-4" />
                                                                </button>
                                                                <User className="w-6 h-6 text-cyan-600 mt-1" />
                                                                <div className="flex-1">
                                                                    <div className="flex items-center justify-between">
                                                                        <div className="text-sm font-medium text-gray-800 dark:text-dark-light">
                                                                            {emp.full_name} <span className="text-xs text-gray-500">({emp.ramco_id})</span>
                                                                        </div>
                                                                    </div>
                                                                    {emp.position?.name && (
                                                                        <div className="text-xs text-gray-500 mt-1">{emp.position?.name}</div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            {idx < arr.length - 1 && <hr className="my-2 border-gray-200" />}
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
                                                            a.register_number?.toLowerCase().includes(search) ||
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
                                                            <React.Fragment key={a.id || a.register_number || j}>
                                                                <li className="flex flex-col bg-gray-100 dark:bg-gray-800 rounded-lg px-3 py-0.5">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="flex items-center gap-2">
                                                                            <CirclePlus className="text-blue-500 w-6 h-6 cursor-pointer" onClick={() => { addSelectedItem(a); }} />
                                                                            {typeIcon && typeIcon}
                                                                        </div>
                                                                        <div>
                                                                            <span className="font-medium dark:text-dark-light">{a.register_number || a.asset_code}</span> <span className="text-xs text-gray-500 dark:text-dark-light">({a.asset_code || a.id})</span>
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
                        onClick={() => setOpenDraftDialog(true)}
                    >
                        Save Draft
                    </Button>
                    <Button
                        type="button"
                        variant="default"
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                        onClick={() => setOpenSubmitDialog(true)}
                    >
                        Submit
                    </Button>
                    <Button
                        type="button"
                        variant="destructive"
                        className="bg-red-600 hover:bg-red-700 text-white"
                        onClick={() => setOpenCancelDialog(true)}
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