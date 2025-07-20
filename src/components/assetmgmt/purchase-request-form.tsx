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

    // Step form with tabs implementation
    const [activeTab, setActiveTab] = React.useState<'info' | 'items' | 'delivery'>('info');
    // Step states
    const [info, setInfo] = React.useState({
        request_no: '',
        request_date: new Date().toISOString().slice(0, 10),
        ramco_id: '',
        costcenter_id: '',
        department_id: '',
        justification: '',
        po_no: '',
        po_date: '',
    });
    // Tab order for navigation
    const tabOrder: Array<'info' | 'items' | 'delivery'> = ['info', 'items', 'delivery'];
    const currentTabIndex = tabOrder.indexOf(activeTab);
    const [items, setItems] = React.useState<any[]>([]);
    const [delivery, setDelivery] = React.useState({
        supplier_id: '',
        do_no: '',
        do_date: '',
        inv_no: '',
        inv_date: '',
        delivery_status: '',
        delivery_remarks: '',
    });
    // Dropdowns
    // ...existing dropdown fetch logic can be reused...

    return (
        <div className="w-full min-h-screen bg-gray-50 dark:bg-gray-800">
            <nav className="w-full bg-white dark:bg-gray-900 shadow-sm mb-6">
                <div className="max-w-6xl mx-auto px-4 py-4 flex justify-center items-center">
                    <h1 className="text-2xl font-bold text-center text-gray-800 dark:text-gray-100">Purchase Request Form</h1>
                </div>
            </nav>
            {/* Tabs */}
            <div className="max-w-6xl mx-auto mb-4">
                <div className="flex border-b">
                    <button className={`px-6 py-2 font-semibold text-sm focus:outline-none ${activeTab === 'info' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`} onClick={() => setActiveTab('info')}>Purchase Information</button>
                    <button className={`px-6 py-2 font-semibold text-sm focus:outline-none ${activeTab === 'items' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`} onClick={() => setActiveTab('items')}>Purchase Items</button>
                    <button className={`px-6 py-2 font-semibold text-sm focus:outline-none ${activeTab === 'delivery' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`} onClick={() => setActiveTab('delivery')}>Delivery Information</button>
                </div>
            </div>
            <form className="max-w-6xl mx-auto bg-white dark:bg-gray-900 p-6 rounded shadow-md text-sm space-y-6">
                {/* Tab 1: Purchase Information */}
                {activeTab === 'info' && (
                    <fieldset className="border rounded p-4">
                        <legend className="font-semibold text-lg">Purchase Information</legend>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block font-medium mb-1">Request No</label>
                                <Input type="text" name="request_no" value={info.request_no} disabled />
                            </div>
                            <div>
                                <label className="block font-medium mb-1">Request Date</label>
                                <Input type="date" name="request_date" value={info.request_date} onChange={e => setInfo(prev => ({ ...prev, request_date: e.target.value }))} />
                            </div>
                            <div>
                                <label className="block font-medium mb-1">Requestor (Ramco ID)</label>
                                <Input type="text" name="ramco_id" value={info.ramco_id} onChange={e => setInfo(prev => ({ ...prev, ramco_id: e.target.value }))} />
                            </div>
                            <div>
                                <label className="block font-medium mb-1">Cost Center</label>
                                <Input type="text" name="costcenter_id" value={info.costcenter_id} onChange={e => setInfo(prev => ({ ...prev, costcenter_id: e.target.value }))} />
                            </div>
                            <div>
                                <label className="block font-medium mb-1">Department</label>
                                <Input type="text" name="department_id" value={info.department_id} onChange={e => setInfo(prev => ({ ...prev, department_id: e.target.value }))} />
                            </div>
                            <div className="col-span-2">
                                <label className="block font-medium mb-1">Justification</label>
                                <Textarea name="justification" value={info.justification} onChange={e => setInfo(prev => ({ ...prev, justification: e.target.value }))} />
                            </div>
                            <div>
                                <label className="block font-medium mb-1">Purchase Order No</label>
                                <Input type="text" name="po_no" value={info.po_no} onChange={e => setInfo(prev => ({ ...prev, po_no: e.target.value }))} />
                            </div>
                            <div>
                                <label className="block font-medium mb-1">Purchase Order Date</label>
                                <Input type="date" name="po_date" value={info.po_date} onChange={e => setInfo(prev => ({ ...prev, po_date: e.target.value }))} />
                            </div>
                        </div>
                        {/* Step Navigation Buttons */}
                        <div className="flex justify-end gap-2 mt-6">
                            <Button type="button" variant="default" disabled={currentTabIndex === tabOrder.length - 1} onClick={() => setActiveTab(tabOrder[currentTabIndex + 1])}>Next</Button>
                        </div>
                    </fieldset>
                )}
                {/* Tab 2: Purchase Items */}
                {activeTab === 'items' && (
                    <fieldset className="border rounded p-4">
                        <legend className="font-semibold text-lg">Purchase Items</legend>
                        <Button type="button" onClick={() => setItems(prev => [...prev, { id: Date.now(), item_desc: '', quantity: 1, justification: '', type: null, category: null }])}>Add Item</Button>
                        {items.length === 0 ? (
                            <div className="text-gray-400 text-center py-4">No items added.</div>
                        ) : (
                            <div className="space-y-4">
                                {items.map((item, idx) => (
                                    <div key={item.id} className="border rounded p-3 bg-gray-50 dark:bg-gray-800">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="font-semibold">Item {idx + 1}</span>
                                            <Button type="button" variant="destructive" onClick={() => setItems(prev => prev.filter((_, i) => i !== idx))}>Remove</Button>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block font-medium mb-1">Description</label>
                                                <Textarea value={item.item_desc} onChange={e => setItems(prev => prev.map((itm, i) => i === idx ? { ...itm, item_desc: e.target.value } : itm))} />
                                            </div>
                                            <div>
                                                <label className="block font-medium mb-1">Quantity</label>
                                                <Input type="number" min={1} value={item.quantity} onChange={e => setItems(prev => prev.map((itm, i) => i === idx ? { ...itm, quantity: e.target.value } : itm))} />
                                            </div>
                                            <div className="col-span-2">
                                                <label className="block font-medium mb-1">Justification</label>
                                                <Textarea value={item.justification} onChange={e => setItems(prev => prev.map((itm, i) => i === idx ? { ...itm, justification: e.target.value } : itm))} />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        {/* Step Navigation Buttons */}
                        <div className="flex justify-between gap-2 mt-6">
                            <Button type="button" variant="secondary" disabled={currentTabIndex === 0} onClick={() => setActiveTab(tabOrder[currentTabIndex - 1])}>Previous</Button>
                            <Button type="button" variant="default" disabled={currentTabIndex === tabOrder.length - 1} onClick={() => setActiveTab(tabOrder[currentTabIndex + 1])}>Next</Button>
                        </div>
                    </fieldset>
                )}
                {/* Tab 3: Delivery Information */}
                {activeTab === 'delivery' && (
                    <fieldset className="border rounded p-4">
                        <legend className="font-semibold text-lg">Delivery Information</legend>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block font-medium mb-1">Supplier</label>
                                <Input type="text" name="supplier_id" value={delivery.supplier_id} onChange={e => setDelivery(prev => ({ ...prev, supplier_id: e.target.value }))} />
                            </div>
                            <div>
                                <label className="block font-medium mb-1">Delivery Order No</label>
                                <Input type="text" name="do_no" value={delivery.do_no} onChange={e => setDelivery(prev => ({ ...prev, do_no: e.target.value }))} />
                            </div>
                            <div>
                                <label className="block font-medium mb-1">Delivery Date</label>
                                <Input type="date" name="do_date" value={delivery.do_date} onChange={e => setDelivery(prev => ({ ...prev, do_date: e.target.value }))} />
                            </div>
                            <div>
                                <label className="block font-medium mb-1">Invoice No</label>
                                <Input type="text" name="inv_no" value={delivery.inv_no} onChange={e => setDelivery(prev => ({ ...prev, inv_no: e.target.value }))} />
                            </div>
                            <div>
                                <label className="block font-medium mb-1">Invoice Date</label>
                                <Input type="date" name="inv_date" value={delivery.inv_date} onChange={e => setDelivery(prev => ({ ...prev, inv_date: e.target.value }))} />
                            </div>
                            <div>
                                <label className="block font-medium mb-1">Delivery Status</label>
                                <select name="delivery_status" value={delivery.delivery_status} onChange={e => setDelivery(prev => ({ ...prev, delivery_status: e.target.value }))} className="input w-full">
                                    <option value="">Select Status</option>
                                    <option value="Completed">Completed</option>
                                    <option value="Partial Deliver">Partial Deliver</option>
                                    <option value="Wrong Items">Wrong Items</option>
                                </select>
                            </div>
                            <div className="col-span-2">
                                <label className="block font-medium mb-1">Delivery Remarks</label>
                                <Textarea name="delivery_remarks" value={delivery.delivery_remarks} onChange={e => setDelivery(prev => ({ ...prev, delivery_remarks: e.target.value }))} />
                            </div>
                        </div>
                        {/* Step Navigation Buttons */}
                        <div className="flex justify-between gap-2 mt-6">
                            <Button type="button" variant="secondary" disabled={currentTabIndex === 0} onClick={() => setActiveTab(tabOrder[currentTabIndex - 1])}>Previous</Button>
                            {/* Actions only on last step */}
                            <div className="flex justify-center gap-2">
                                <Button type="button" variant="secondary" className="bg-gray-300 hover:bg-gray-400 text-gray-800 hover:text-white">Save Draft</Button>
                                <Button type="button" variant="default" className="bg-blue-600 hover:bg-blue-700 text-white">Submit</Button>
                                <Button type="button" variant="destructive" className="bg-red-600 hover:bg-red-700 text-white">Cancel</Button>
                            </div>
                        </div>
                    </fieldset>
                )}
                {/* Actions moved to last step only */}
            </form>
        </div>
    );
};

export default PurchaseRequestForm;


