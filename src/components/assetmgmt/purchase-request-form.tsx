import React, { useEffect, useContext, useRef } from 'react';
import { AuthContext } from "@/store/AuthContext";
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import {
    AlertDialog,
    AlertDialogTrigger,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogFooter,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogCancel,
    AlertDialogAction,
} from "@/components/ui/alert-dialog";

// --- INTERFACES FOR PURCHASE REQUEST CONTEXT ---
export interface PurchaseRequestDetail {
    id: number;
    pr_id: number;
    item_desc: string;
    quantity: number;
    priority: number;
    justification: string;
    applicant_hod_id: number | null;
    applicant_hod_verification: number | null;
    applicant_hod_verification_date: string | null;
    applicant_hod_verification_remarks: string | null;
    delivery_location: string | null;
    assetmgr_id: number | null;
    assetmgr_remarks: string | null;
    assetmgr_hod_approval: number;
    assetmgr_hod_approval_date: string | null;
    procurement_id: number | null;
    preferred_vendor: string | null;
    preferred_quotation: string | null;
    po_no: string | null;
    uploaded_po: string | null;
    procurement_hod_approval: number | null;
    procurement_hod_approval_date: string | null;
    delivery_date: string | null;
    delivery_status: number;
    finance_id: number | null;
    finance_payment_date: string | null;
    finance_payment_status: number;
    uploaded_payment: string | null;
    type: { id: number; name: string };
    category: { id: number; name: string };
}

export interface PurchaseRequestData {
    id: number;
    req_no: string;
    req_date: string;
    required_date: string;
    purpose: string;
    remarks: string;
    verified_by: string | null;
    verification_status: number | null;
    verification_date: string | null;
    approved_by: string | null;
    req_status: number;
    requestor: { ramco_id: string; name: string };
    department: { id: number; name: string };
    costcenter: { id: number; name: string };
    district: { id: number; name: string };
    total_items: number;
    details: PurchaseRequestDetail[];
}

// Define the Requestor interface if not already imported
type Requestor = {
    ramco_id: string;
    full_name: string;
    position: { id: number; name: string } | null;
    department: { id: number; name: string, code: string } | null;
    costcenter: { id: number; name: string } | null;
    district: { id: number; name: string, code: string } | null;
    email?: string;
    contact?: string;
    // Add any other fields as needed
};

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

interface District {
    id: number;
    name: string;
    code: string;
    zone: string | null;
}

// Change PurchaseRequestForm to a self-contained component
interface PurchaseRequestFormProps {
    id?: string | null;
}

const PurchaseRequestForm: React.FC<PurchaseRequestFormProps> = ({ id }) => {
    const [form, setForm] = React.useState<any>({ requestor: {}, reason: {} });
    const [selectedItems, setSelectedItems] = React.useState<any[]>([]);
    const [returnToAssetManager, setReturnToAssetManager] = React.useState<{ [key: number]: boolean }>({});
    const [itemEffectiveDates, setItemEffectiveDates] = React.useState<{ [key: string]: string }>({});
    const [dateRequest, setDateRequest] = React.useState('');
    const [itemTransferDetails, setItemTransferDetails] = React.useState<any>({});
    const [costCenters, setCostCenters] = React.useState<CostCenter[]>([]);
    const [departments, setDepartments] = React.useState<Department[]>([]);
    const [districts, setDistricts] = React.useState<District[]>([]);
    const [itemReasons, setItemReasons] = React.useState<any>({});
    const [workflow, setWorkflow] = React.useState<any>({});
    const [requestStatus, setRequestStatus] = React.useState<'draft' | 'submitted'>('draft');
    const [initialForm, setInitialForm] = React.useState<any>({ requestor: {}, reason: {} });
    const [submitError, setSubmitError] = React.useState<string | null>(null);
    const [openSubmitDialog, setOpenSubmitDialog] = React.useState(false);
    const [openDraftDialog, setOpenDraftDialog] = React.useState(false);
    const [openCancelDialog, setOpenCancelDialog] = React.useState(false);
    const [loading, setLoading] = React.useState(!!id);
    const [error, setError] = React.useState<string | null>(null);
    const [types, setTypes] = React.useState<{ id: number; name: string }[]>([]);
    const [categories, setCategories] = React.useState<{ id: number; name: string; type_id: number }[]>([]);

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

    async function handleSaveDraft() {
        clearFormAndItems();
        const formElement = document.createElement('form');
        const syntheticEvent = { preventDefault: () => { }, target: formElement } as unknown as React.FormEvent<HTMLFormElement>;
        handleSubmit(syntheticEvent);
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

    // Fetch data for cost center, departments, and districts from their respective APIs and populate the dropdowns.
    useEffect(() => {
        async function fetchDropdownData() {
            try {
                const [costCentersRes, departmentsRes, districtsRes] = await Promise.all([
                    authenticatedApi.get<{ data: CostCenter[] }>('/api/assets/costcenters'),
                    authenticatedApi.get<{ data: Department[] }>('/api/assets/departments'),
                    authenticatedApi.get<{ data: District[] }>('/api/assets/districts'),
                ]);

                setCostCenters(costCentersRes.data.data || []);
                setDepartments(departmentsRes.data.data || []);
                setDistricts(districtsRes.data.data || []);
            } catch (error) {
                console.error('Failed to fetch dropdown data:', error);
            }
        }

        fetchDropdownData();
    }, []);

    // Fetch types and categories for selects
    useEffect(() => {
        async function fetchTypeCategoryData() {
            try {
                const [typesRes, categoriesRes] = await Promise.all([
                    authenticatedApi.get<{ data: { id: number; name: string }[] }>('/api/assets/types'),
                    authenticatedApi.get<{ data: { id: number; name: string; type_id: number }[] }>('/api/assets/categories'),
                ]);
                setTypes(typesRes.data.data || []);
                setCategories(categoriesRes.data.data || []);
            } catch (error) {
                console.error('Failed to fetch type/category data:', error);
            }
        }
        fetchTypeCategoryData();
    }, []);

    const handleSubmitConfirmed = () => {
        setRequestStatus('submitted');
        setOpenSubmitDialog(false);
        if (formRef.current) {
            const event = { preventDefault: () => { }, target: formRef.current } as unknown as React.FormEvent<HTMLFormElement>;
            handleSubmit(event);
        }
    };
    const handleSaveDraftConfirmed = () => {
        setRequestStatus('draft');
        setOpenDraftDialog(false);
        handleSaveDraft();
    };

    // Fetch transfer request if id is provided
    React.useEffect(() => {
        if (id) {
            setLoading(true);
            authenticatedApi.get(`/api/purchase/${id}`)
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
                                serial_number: typeof item.identifier === 'string' ? item.identifier : undefined,
                                ramco_id: typeof item.identifier === 'object' ? item.identifier.ramco_id : undefined,
                                full_name: typeof item.identifier === 'object' ? item.identifier.name : undefined,
                                asset_type: item.asset_type,
                                owner: item.curr_owner,
                                costcenter: item.curr_costcenter,
                                department: item.curr_department,
                                district: item.curr_district,
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
                                        location: item.curr_district?.id ? String(item.curr_district.id) : '',
                                    },
                                    new: {
                                        ownerName: item.new_owner?.name || '',
                                        ownerStaffId: item.new_owner?.ramco_id || '',
                                        costCenter: item.new_costcenter?.id ? String(item.new_costcenter.id) : '',
                                        department: item.new_department?.id ? String(item.new_department.id) : '',
                                        location: item.new_district?.id ? String(item.new_district.id) : '',
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

    if (loading) return <div className="p-8 text-center">Loading...</div>;
    if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

    return (
        <div className="w-full min-h-screen bg-gray-50 dark:bg-gray-800">
            {/* Navbar with centered title */}
            <nav className="w-full bg-white dark:bg-gray-900 shadow-sm mb-6">
                <div className="max-w-6xl mx-auto px-4 py-4 flex justify-center items-center">
                    <h1 className="text-2xl font-bold text-center text-gray-800 dark:text-gray-100">Purchase Request Form</h1>
                </div>
            </nav>
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
                        Requested Items
                        <Button
                            type="button"
                            size="icon"
                            variant="default"
                            className='ml-2'
                            onClick={() => setSelectedItems(prev => [...prev, { id: Date.now() }])}
                            aria-label="Add Item"
                        >
                            <span className="text-2xl leading-none"><Plus className='w-5 h-5' /></span>
                        </Button>
                    </legend>
                    {selectedItems.length === 0 ? (
                        <div className="text-gray-400 text-center py-4">No items selected.</div>
                    ) : (
                        <div className="mt-2 px-1">
                            {selectedItems.map((item, idx) => (
                                <Accordion type="single" collapsible key={item.id} className="mb-4 bg-gray-50 dark:bg-gray-800 rounded px-4">
                                    <AccordionItem value={`item-${item.id}`}>
                                        <AccordionTrigger>
                                            <div className="flex items-center justify-between w-full">
                                                <div className="flex items-center gap-2">
                                                    <Button type="button" size="icon" variant="ghost" className="text-red-500 hover:bg-red-500 hover:text-white" onClick={e => { e.stopPropagation(); removeSelectedItem(idx); }}>
                                                        <X />
                                                    </Button>
                                                    <span className="text-xs font-semibold text-blue-600 min-w-[70px] text-left">{`Item ${idx + 1}`}</span>
                                                    {/* Render Type & Category if selected */}
                                                    {item.type?.name && (
                                                        <span className="ml-3 text-xs font-medium text-gray-700 dark:text-gray-300">{item.type.name}</span>
                                                    )}
                                                    {item.category?.name && (
                                                        <span className="ml-2 text-xs font-medium text-gray-500 dark:text-gray-400">/ {item.category.name}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent>
                                            <div className="flex flex-wrap gap-4 items-start justify-between py-2">
                                                {/* Type Select */}
                                                <div className="flex flex-col w-full md:w-[30%]">
                                                    <label className="min-w-[60px] font-medium mb-1">Type</label>
                                                    <Select
                                                        value={item.type?.id ? String(item.type.id) : ''}
                                                        onValueChange={val => {
                                                            const selectedType = types.find(t => String(t.id) === val);
                                                            setSelectedItems(prev => prev.map((itm, i) =>
                                                                i === idx
                                                                    ? { ...itm, type: selectedType, category: undefined }
                                                                    : itm
                                                            ));
                                                        }}
                                                    >
                                                        <SelectTrigger className="w-full">
                                                            <SelectValue placeholder="Select type" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {types.map(type => (
                                                                <SelectItem key={type.id} value={String(type.id)}>{type.name}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                {/* Category Select (chained to type) */}
                                                <div className="flex flex-col w-full md:w-[30%]">
                                                    <label className="min-w-[70px] font-medium mb-1">Category</label>
                                                    <Select
                                                        value={item.category?.id ? String(item.category.id) : ''}
                                                        onValueChange={val => {
                                                            const selectedCategory = categories.find(c => String(c.id) === val);
                                                            setSelectedItems(prev => prev.map((itm, i) =>
                                                                i === idx
                                                                    ? { ...itm, category: selectedCategory }
                                                                    : itm
                                                            ));
                                                        }}
                                                        disabled={!item.type?.id}
                                                    >
                                                        <SelectTrigger className="w-full">
                                                            <SelectValue placeholder="Select category" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {categories.filter(cat => item.type?.id && cat.type_id === item.type.id).map(category => (
                                                                <SelectItem key={category.id} value={String(category.id)}>{category.name}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                {/* Required Date Input */}
                                                <div className="flex flex-col w-full md:w-[30%]">
                                                    <label className="min-w-[100px] font-medium mb-1">Required Date</label>
                                                    <Input
                                                        type="date"
                                                        className="w-full"
                                                        value={item.required_date || ''}
                                                        onChange={e => setSelectedItems(prev => prev.map((itm, i) => i === idx ? { ...itm, required_date: e.target.value } : itm))}
                                                    />
                                                </div>
                                                {/* Request Details Textarea */}
                                                <div className="flex flex-col w-full md:w-[48%] mt-4">
                                                    <label className="min-w-[120px] font-medium mb-1">Request Details</label>
                                                    <Textarea
                                                        className="flex-1 min-h-[40px] max-h-[120px]"
                                                        value={item.item_desc || ''}
                                                        onChange={e => setSelectedItems(prev => prev.map((itm, i) => i === idx ? { ...itm, item_desc: e.target.value } : itm))}
                                                        placeholder="Enter request details"
                                                    />
                                                </div>
                                                {/* Justification Textarea */}
                                                <div className="flex flex-col w-full md:w-[48%] mt-4">
                                                    <label className="min-w-[120px] font-medium mb-1">Justification</label>
                                                    <Textarea
                                                        className="flex-1 min-h-[40px] max-h-[120px]"
                                                        value={item.justification || ''}
                                                        onChange={e => setSelectedItems(prev => prev.map((itm, i) => i === idx ? { ...itm, justification: e.target.value } : itm))}
                                                        placeholder="Enter justification"
                                                    />
                                                </div>
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                </Accordion>
                            ))}
                        </div>
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
                    </div>
                </fieldset>
            </form>
        </div>
    );
};

export default PurchaseRequestForm;


