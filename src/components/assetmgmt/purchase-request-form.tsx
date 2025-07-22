import React, { useEffect, useContext, useRef } from 'react';
import { AuthContext } from "@/store/AuthContext";
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { UserCheck, ShoppingCart, DollarSign, BaggageClaim, Plus, X, ChevronLeft, ArrowBigLeft } from "lucide-react";
import { Switch } from '@/components/ui/switch';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { toast } from "sonner";
import { authenticatedApi } from "@/config/api";
import ActionSidebar from '@components/ui/action-aside';
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
   details: RequestItems[];
}

export interface RequestItems {
   type_id: number;
   category_id: number;
   quantity: number;
   item_desc?: string;
   justification?: string;
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
}

interface Department {
   id: number;
   code: string;
   name: string;
}

interface District {
   id: number;
   name: string;
   code: string;
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
   // State for uploaded delivery document (PDF)
   const [deliveryDoc, setDeliveryDoc] = React.useState<File | null>(null);
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
   // Requestor info fetched from API
   const [requestor, setRequestor] = React.useState<Requestor | null>(null);
   const formRef = useRef<HTMLFormElement>(null);

   function clearFormAndItems() {
      setForm(initialForm);
      setSelectedItems([]);
      setItemReasons({});
      setItemTransferDetails({});
      setItemEffectiveDates({});
      setReturnToAssetManager({});
   }

   // Confirmation dialog state
   const [showConfirmDialog, setShowConfirmDialog] = React.useState(false);
   const [pendingEvent, setPendingEvent] = React.useState<React.FormEvent<HTMLFormElement> | null>(null);

   // Intercept form submit to show confirmation dialog
   function handleFormSubmit(e: React.FormEvent<HTMLFormElement>) {
      e.preventDefault();
      setPendingEvent(e);
      setShowConfirmDialog(true);
   }

   // Actual submit logic
   async function doSubmit() {
      setSubmitError(null);
      // If backdated, require request_reference (manualPrNo)
      if (backdated && !manualPrNo.trim()) {
         toast.error('Manual PR No (Request Reference) is required for backdated purchase.');
         setSubmitError('Manual PR No (Request Reference) is required for backdated purchase.');
         return;
      }
      const itemsPayload = items.map(item => {
         const base = {
            type_id: item.type?.id || 0,
            category_id: item.category?.id || 0,
            qty: Number(item.quantity) || 0,
            description: item.item_desc || '',
            justification: item.justification || '',
            supplier: item.supplier || '',
            unit_price: item.unit_price || '',
            delivery_status: (delivery.delivery_status || '').toLowerCase(),
            delivery_remarks: delivery.delivery_remarks || '',
            register_numbers: Array.isArray(item.register_numbers) ? item.register_numbers : [],
            register_brands: Array.isArray(item.register_brands) ? item.register_brands : [],
            register_models: Array.isArray(item.register_models) ? item.register_models : [],
         };
         return base;
      });
      let payload: any;
      let useFormData = !!deliveryDoc;
      // Always ensure request_date is a valid string (YYYY-MM-DD)
      let requestDate = (info.request_date || '').trim();
      if (!requestDate) {
         const today = new Date();
         requestDate = today.toISOString().slice(0, 10);
      }
      if (useFormData) {
         payload = new FormData();
         payload.append('request_type', (form.request_type || '').toLowerCase());
         payload.append('backdated_purchase', String(backdated));
         payload.append('request_reference', backdated ? manualPrNo : '');
         payload.append('request_no', info.request_no || '');
         payload.append('request_date', requestDate);
         payload.append('ramco_id', requestor?.ramco_id || '');
         payload.append('costcenter_id', String(Number(requestor?.costcenter?.id) || 0));
         payload.append('department_id', String(Number(requestor?.department?.id) || 0));
         payload.append('po_no', purchase.po_no || '');
         payload.append('po_date', purchase.po_date || '');
         payload.append('supplier', purchase.supplier || '');
         payload.append('do_no', delivery.do_no || '');
         payload.append('do_date', delivery.do_date || '');
         payload.append('inv_no', delivery.inv_no || '');
         payload.append('inv_date', delivery.inv_date || '');
         payload.append('items', JSON.stringify(itemsPayload));
         if (deliveryDoc) {
            payload.append('request_upload', deliveryDoc);
         }
      } else {
         payload = {
            request_type: (form.request_type || '').toLowerCase(),
            backdated_purchase: backdated,
            request_reference: backdated ? manualPrNo : '',
            request_no: info.request_no || '',
            request_date: requestDate,
            ramco_id: requestor?.ramco_id || '',
            costcenter_id: Number(requestor?.costcenter?.id) || 0,
            department_id: Number(requestor?.department?.id) || 0,
            po_no: purchase.po_no || '',
            po_date: purchase.po_date || '',
            supplier: purchase.supplier || '',
            do_no: delivery.do_no || '',
            do_date: delivery.do_date || '',
            inv_no: delivery.inv_no || '',
            inv_date: delivery.inv_date || '',
            request_upload: '',
            items: itemsPayload,
         };
      }
      try {
         let apiUrl = '/api/purchase';
         if (id) {
            apiUrl = `/api/purchase/${id}`;
            if (useFormData) {
               await authenticatedApi.put(apiUrl, payload, {
                  headers: { 'Content-Type': 'multipart/form-data' },
               });
            } else {
               await authenticatedApi.put(apiUrl, payload);
            }
         } else {
            if (useFormData) {
               await authenticatedApi.post(apiUrl, payload, {
                  headers: { 'Content-Type': 'multipart/form-data' },
               });
            } else {
               await authenticatedApi.post(apiUrl, payload);
            }
         }
         toast.success(requestStatus === 'draft' ? 'Draft saved successfully!' : 'Purchase request submitted successfully!');
         clearFormAndItems();
         handleCancel();
      } catch (err) {
         setSubmitError('Failed to submit purchase request. Please try again.');
         toast.error('Failed to submit purchase request. Please try again.');
      }
   }

   async function handleSaveDraft() {
      clearFormAndItems();
      await doSubmit();
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

   const handleSubmitConfirmed = async () => {
      setRequestStatus('submitted');
      setOpenSubmitDialog(false);
      await doSubmit();
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
   const [activeTab, setActiveTab] = React.useState<'info' | 'purchase' | 'items' | 'delivery'>('info');
   const [requestTypeError, setRequestTypeError] = React.useState(false);
   // Step states
   const [info, setInfo] = React.useState({
      request_no: '',
      request_date: new Date().toISOString().slice(0, 10),
      ramco_id: '',
      costcenter_id: '',
      department_id: '',
      justification: '',
   });
   // Fetch requestor data on mount (if user exists)
   React.useEffect(() => {
      if (!user?.username) return;
      authenticatedApi.get(`/api/assets/employees/lookup/${user.username}`)
         .then((res: any) => {
            const data = res?.data?.data;
            if (data) {
               const req: Requestor = {
                  ramco_id: data.ramco_id || '',
                  full_name: data.full_name || '',
                  position: data.position || null,
                  department: data.department || null,
                  costcenter: data.costcenter || null,
                  district: data.district || null,
                  email: data.email || '',
                  contact: data.contact || '',
               };
               setRequestor(req);
               setInfo(prev => ({
                  ...prev,
                  ramco_id: req.ramco_id,
                  costcenter_id: req.costcenter?.id ? String(req.costcenter.id) : '',
                  department_id: req.department?.id ? String(req.department.id) : '',
               }));
            }
         });
   }, [user?.username]);
   const [purchase, setPurchase] = React.useState({
      supplier: '',
      po_no: '',
      po_date: '',
   });
   // Backdated purchase state
   const [backdated, setBackdated] = React.useState(false);
   const [manualPrNo, setManualPrNo] = React.useState('');
   const [manualPrNoError, setManualPrNoError] = React.useState(false);

   // Tab order for navigation
   const tabOrder: Array<'info' | 'items' | 'purchase' | 'delivery'> = ['info', 'items', 'purchase', 'delivery'];
   const currentTabIndex = tabOrder.indexOf(activeTab);
   const [items, setItems] = React.useState<any[]>([]);
   // Error states for Request Items fields
   const [itemFieldErrors, setItemFieldErrors] = React.useState<any[]>([]);

   // State for ActionSidebar (per item index)
   const [sidebarOpenIdx, setSidebarOpenIdx] = React.useState<number | null>(null);
   const [sidebarAssets, setSidebarAssets] = React.useState<any[]>([]);
   const [sidebarLoading, setSidebarLoading] = React.useState(false);
   const [sidebarSearch, setSidebarSearch] = React.useState('');

   // Fetch assets for ActionSidebar
   const fetchAssetsForSidebar = async (typeId: number) => {
      setSidebarLoading(true);
      try {
         const res = await authenticatedApi.get(`/api/assets?type=${typeId}&status=active`);
         // Accept both res.data.data and res.data (array)
         let assets: any[] = [];
         const dataAny = res.data as any;
         if (Array.isArray(dataAny)) {
            assets = dataAny;
         } else if (dataAny && Array.isArray(dataAny.data)) {
            assets = dataAny.data;
         }
         setSidebarAssets(assets);
      } catch (err) {
         setSidebarAssets([]);
      }
      setSidebarLoading(false);
   };

   // Helper to get item type/category name
   const getTypeName = (typeId: number | undefined) => types.find(t => t.id === typeId)?.name || '';
   const getCategoryName = (catId: number | undefined) => categories.find(c => c.id === catId)?.name || '';
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
         <div className="max-w-6xl mx-auto mb-4 px-4">
            <div className="flex border-b">
               <button className={`px-6 py-2 font-semibold text-sm flex items-center gap-2 focus:outline-none ${activeTab === 'info' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`} onClick={() => setActiveTab('info')}>
                  <UserCheck size={18} /> Request Information
               </button>
               <button className={`px-6 py-2 font-semibold text-sm flex items-center gap-2 focus:outline-none ${activeTab === 'items' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`} onClick={() => setActiveTab('items')}>
                  <ShoppingCart size={18} /> Request Items
               </button>
               <button className={`px-6 py-2 font-semibold text-sm flex items-center gap-2 focus:outline-none ${activeTab === 'purchase' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`} onClick={() => setActiveTab('purchase')}>
                  <DollarSign size={18} /> Purchase Information
               </button>
               <button className={`px-6 py-2 font-semibold text-sm flex items-center gap-2 focus:outline-none ${activeTab === 'delivery' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`} onClick={() => setActiveTab('delivery')}>
                  <BaggageClaim size={18} /> Delivery Information
               </button>
            </div>
         </div>
         <form className="max-w-6xl mx-auto bg-white dark:bg-gray-900 py-6 px-4 rounded shadow-md text-sm space-y-6" onSubmit={handleFormSubmit} ref={formRef}>
            {/* Tab 1: Request Information */}
            {activeTab === 'info' && (
               <fieldset className="border rounded p-4">
                  <legend className="flex items-center font-semibold text-lg m-0 gap-4">Request Information
                     <div className="flex items-center gap-2">
                        <Switch checked={backdated} onCheckedChange={setBackdated} />
                        <span className="font-medium text-sm">Backdated Purchase</span>
                     </div>
                  </legend>
                  <div className='flex items-center gap-6 justify-end mb-10'>
                     <div className="flex flex-col">
                        <Label
                           className={`block font-medium mb-1 mr-2${requestTypeError ? ' text-red-500 font-semibold' : ''}`}
                           htmlFor="request_type"
                        >
                           Request Type:
                        </Label>
                        {requestTypeError && (
                           <span className="text-red-500 text-xs mt-1">Please select a request type</span>
                        )}
                     </div>
                     <RadioGroup
                        id="request_type"
                        className="flex items-center gap-4"
                        value={form.request_type || ''}
                        onValueChange={val => {
                           setForm((prev: typeof form) => ({ ...prev, request_type: val }));
                           setRequestTypeError(false);
                        }}
                     >
                        <div className="flex items-center">
                           <RadioGroupItem value="Opex" id="request_type_opex" />
                           <Label htmlFor="request_type_opex" className="ml-2">Opex</Label>
                        </div>
                        <div className="flex items-center">
                           <RadioGroupItem value="Capex" id="request_type_capex" />
                           <Label htmlFor="request_type_capex" className="ml-2">Capex</Label>
                        </div>
                     </RadioGroup>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                     {/* Row 1: Manual PR No, Request No, Request Date */}
                     {backdated ? (
                        <>
                           <div>
                              <label className={`block font-medium mb-1${manualPrNoError ? ' text-red-500 font-semibold' : ''}`}>Manual PR No</label>
                              <Input
                                 type="text"
                                 name="request_reference"
                                 value={manualPrNo}
                                 onChange={e => {
                                    setManualPrNo(e.target.value);
                                    setManualPrNoError(false);
                                 }}
                                 className={manualPrNoError ? 'ring-0 border-0 outline-none text-red-500 font-semibold' : ''}
                              />
                              {manualPrNoError && (
                                 <span className="text-red-500 text-xs mt-1">Manual PR No is required for backdated purchase</span>
                              )}
                           </div>
                           <div>
                              <label className="block font-medium mb-1">Request No</label>
                              <Input type="text" name="request_no" value={info.request_no} disabled />
                           </div>
                           <div>
                              <label className="block font-medium mb-1">Request Date</label>
                              <Input type="date" name="request_date" value={info.request_date} onChange={e => setInfo(prev => ({ ...prev, request_date: e.target.value }))} />
                           </div>
                        </>
                     ) : (
                        <>
                           <div className="sm:col-span-2">
                              <label className="block font-medium mb-1">Request No</label>
                              <Input type="text" name="request_no" value={info.request_no} disabled />
                           </div>
                           <div>
                              <label className="block font-medium mb-1">Request Date</label>
                              <Input type="date" name="request_date" value={info.request_date} onChange={e => setInfo(prev => ({ ...prev, request_date: e.target.value }))} />
                           </div>
                        </>
                     )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                     {/* Row 2: Requestor, Cost Center, Department */}
                     <div>
                        <label className="block font-medium mb-1">Requestor</label>
                        <span className="block py-2 px-3 bg-gray-100 rounded min-h-[40px]">{requestor?.full_name || ''}</span>
                        <Input type="hidden" name="ramco_id" value={requestor?.ramco_id || ''} />
                     </div>
                     <div>
                        <label className="block font-medium mb-1">Cost Center</label>
                        <span className="block py-2 px-3 bg-gray-100 rounded min-h-[40px]">{requestor?.costcenter?.name || ''}</span>
                        <Input type="hidden" name="costcenter_id" value={requestor?.costcenter?.id || ''} />
                     </div>
                     <div>
                        <label className="block font-medium mb-1">Department</label>
                        <span className="block py-2 px-3 bg-gray-100 rounded min-h-[40px]">{requestor?.department?.name || ''}</span>
                        <Input type="hidden" name="department_id" value={requestor?.department?.id || ''} />
                     </div>
                     {/* Justification removed from Request Information */}
                  </div>
                  {/* Step Navigation Buttons */}
                  <div className="flex justify-end gap-2 mt-6">
                     <Button
                        type="button"
                        variant="default"
                        disabled={currentTabIndex === tabOrder.length - 1}
                        onClick={() => {
                           if (!form.request_type) {
                              setRequestTypeError(true);
                              const el = document.getElementById('request_type');
                              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                              return;
                           }
                           if (backdated && !manualPrNo.trim()) {
                              setManualPrNoError(true);
                              const el = document.getElementsByName('request_reference')[0];
                              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                              return;
                           }
                           setActiveTab(tabOrder[currentTabIndex + 1]);
                        }}
                     >
                        Next
                     </Button>
                  </div>
               </fieldset>
            )}
            {/* Tab 2: Request Items */}
            {activeTab === 'items' && (
               <fieldset className="border rounded p-4">
                  <legend className="flex items-center font-semibold text-lg gap-4">Request Items
                     <span className="ml-4 flex items-center gap-2">
                        <Switch checked={backdated} onCheckedChange={setBackdated} />
                        <span className="font-medium text-sm">Backdated Purchase</span>
                     </span>
                  </legend>
                  <div className='flex items-center justify-between mb-10'>
                     <div className="flex flex-col text-red-600">
                        <span className='font-semibold'>Each added item must have the same type, category, and unit price.</span>
                        <span className='text-xs'>For example: "Computer + Desktop" and "Computer + Laptop" are considered different items. <br/>Even if type and category are the same, different unit prices will also be treated as different items.</span>
                     </div>
                     <Button type="button" onClick={() => setItems(prev => [...prev, { id: Date.now(), item_desc: '', quantity: 1, justification: '', type: null, category: null, supplier: '', unit_price: '' }])}><Plus size={20} /></Button>
                  </div>
                  {items.length === 0 ? (
                     <div className="text-gray-400 text-center py-4">No items added.</div>
                  ) : (
                     <div className="space-y-4">
                        {items.map((item, idx) => {
                           const fieldErr = itemFieldErrors[idx] || {};
                           return (
                              <div key={item.id} className="border rounded p-3 bg-slate-50 dark:bg-gray-800 space-y-4">
                                 <div className="flex justify-between items-center mb-2">
                                    <span className="font-semibold">Item {idx + 1}</span>
                                    <X className='text-danger hover:bg-red-500 hover:text-white rounded' onClick={() => setItems(prev => prev.filter((_, i) => i !== idx))} />
                                 </div>
                                 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div>
                                       <label className={`block font-medium mb-1${fieldErr.type ? ' text-red-500 font-semibold' : ''}`}>Type</label>
                                       <Select
                                          value={item.type?.id ? String(item.type.id) : ''}
                                          onValueChange={val => {
                                             const typeId = val ? parseInt(val, 10) : null;
                                             setItems(prev => prev.map((itm, i) => i === idx ? { ...itm, type: types.find(t => t.id === typeId) || null, category: null } : itm));
                                             setItemFieldErrors(prev => prev.map((err, i) => i === idx ? { ...err, type: false } : err));
                                          }}
                                       >
                                          <SelectTrigger className="input w-full">
                                             <SelectValue placeholder="Select Type" />
                                          </SelectTrigger>
                                          <SelectContent>
                                             {types.map(type => (
                                                <SelectItem key={type.id} value={String(type.id)}>{type.name}</SelectItem>
                                             ))}
                                          </SelectContent>
                                       </Select>
                                       {fieldErr.type && <span className="text-red-500 text-xs mt-1">Type is required</span>}
                                    </div>
                                    <div>
                                       <label className={`block font-medium mb-1${fieldErr.category ? ' text-red-500 font-semibold' : ''}`}>Category</label>
                                       <Select
                                          value={item.category?.id ? String(item.category.id) : ''}
                                          onValueChange={val => {
                                             const catId = val ? parseInt(val, 10) : null;
                                             setItems(prev => prev.map((itm, i) => i === idx ? { ...itm, category: categories.find(c => c.id === catId) || null } : itm));
                                             setItemFieldErrors(prev => prev.map((err, i) => i === idx ? { ...err, category: false } : err));
                                          }}
                                          disabled={!item.type}
                                       >
                                          <SelectTrigger className="input w-full">
                                             <SelectValue placeholder="Select Category" />
                                          </SelectTrigger>
                                          <SelectContent>
                                             {categories.filter(cat => item.type && cat.type_id === item.type.id).map(cat => (
                                                <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>
                                             ))}
                                          </SelectContent>
                                       </Select>
                                       {fieldErr.category && <span className="text-red-500 text-xs mt-1">Category is required</span>}
                                    </div>
                                    <div>
                                       <label className="block font-medium mb-1">Quantity</label>
                                       <Input
                                          type="text"
                                          min={1}
                                          max={100}
                                          value={item.quantity}
                                          onChange={e => {
                                             const val = e.target.value.replace(/[^0-9]/g, '');
                                             const num = val === '' ? '' : Math.max(1, parseInt(val, 10));
                                             setItems(prev => prev.map((itm, i) => i === idx ? { ...itm, quantity: num } : itm));
                                          }}
                                       />
                                    </div>
                                    {/* Unit Price removed from Request Items, now only in Purchase Information table */}
                                 </div>
                                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                       <label className="block font-medium mb-1">Description</label>
                                       <Textarea placeholder='Describe your item specifications..' value={item.item_desc} onChange={e => setItems(prev => prev.map((itm, i) => i === idx ? { ...itm, item_desc: e.target.value } : itm))} />
                                    </div>
                                    <div>
                                       <label className={`block font-medium mb-1${fieldErr.justification ? ' text-red-500 font-semibold' : ''}`}>Justification</label>
                                       <Textarea placeholder='Justify your purposes..' value={item.justification} onChange={e => {
                                          setItems(prev => prev.map((itm, i) => i === idx ? { ...itm, justification: e.target.value } : itm));
                                          setItemFieldErrors(prev => prev.map((err, i) => i === idx ? { ...err, justification: false } : err));
                                       }} />
                                       {fieldErr.justification && <span className="text-red-500 text-xs mt-1">Justification is required</span>}
                                    </div>
                                 </div>
                                 {/* Register Number fields for backdated purchase - now after description/justification */}
                                 {backdated && Number(item.quantity) > 0 && (
                                    <>
                                       <div className="flex flex-col gap-2 mt-2">
                                          {[...Array(Number(item.quantity)).keys()].map(i => (
                                             <div key={i} className="flex flex-row gap-2 items-end">
                                                <div className="flex-1">
                                                   <label className={`font-medium mb-1 flex items-center gap-2${fieldErr[`register_number_${i}`] ? ' text-red-500 font-semibold' : ''}`}>
                                                      Register Number {i + 1}
                                                      <button
                                                         type="button"
                                                         className="text-blue-600 underline text-xs ml-1"
                                                         onClick={async () => {
                                                            setSidebarOpenIdx(idx * 1000 + i);
                                                            if (item.type?.id) await fetchAssetsForSidebar(item.type.id);
                                                         }}
                                                      >
                                                         Add existing assets
                                                      </button>
                                                   </label>
                                                   <Input
                                                      type="text"
                                                      className={`uppercase placeholder:normal-case ${fieldErr[`register_number_${i}`] ? ' border-red-500' : ''}`}
                                                      placeholder='Enter item serial number or registration ID'
                                                      value={item.register_numbers && item.register_numbers[i] ? item.register_numbers[i] : ''}
                                                      onChange={e => {
                                                         const value = e.target.value;
                                                         setItems(prev => prev.map((itm, idx2) => {
                                                            if (idx2 !== idx) return itm;
                                                            const regNums = Array.from({ length: Number(item.quantity) }, (_, j) =>
                                                               (itm.register_numbers && itm.register_numbers[j]) || ''
                                                            );
                                                            regNums[i] = value;
                                                            return { ...itm, register_numbers: regNums };
                                                         }));
                                                         setItemFieldErrors(prev => prev.map((err, idx2) => idx2 === idx ? { ...err, [`register_number_${i}`]: false } : err));
                                                      }}
                                                   />
                                                   {fieldErr[`register_number_${i}`] && <span className="text-red-500 text-xs mt-1">Register Number is required</span>}
                                                   {sidebarOpenIdx === idx * 1000 + i && (
                                                      <ActionSidebar
                                                         size="sm"
                                                         title="Select Existing Asset"
                                                         onClose={() => setSidebarOpenIdx(null)}
                                                         content={
                                                            sidebarLoading ? (
                                                               <div>Loading assets...</div>
                                                            ) : (
                                                               <>
                                                                  <input
                                                                     type="text"
                                                                     className="border rounded px-2 py-1 w-full text-sm mb-2"
                                                                     placeholder="Search register number..."
                                                                     value={sidebarSearch}
                                                                     onChange={e => setSidebarSearch(e.target.value)}
                                                                  />
                                                                  <ul className="divide-y gap-2">
                                                                     {sidebarAssets.filter((asset: any) => {
                                                                        const regNum = asset.register_number || asset.specs?.serial_number || '-';
                                                                        return regNum.toLowerCase().includes(sidebarSearch.toLowerCase());
                                                                     }).length === 0 ? (
                                                                        <li className="py-2 text-gray-400">No assets found.</li>
                                                                     ) : (
                                                                        sidebarAssets.filter((asset: any) => {
                                                                           const regNum = asset.register_number || asset.specs?.serial_number || '-';
                                                                           return regNum.toLowerCase().includes(sidebarSearch.toLowerCase());
                                                                        }).map((asset: any) => {
                                                                           const regNum = asset.register_number || asset.specs?.serial_number || '-';
                                                                           const brand = asset.specs?.brands?.name || '';
                                                                           const model = asset.specs?.models?.name || '';
                                                                           return (
                                                                              <li key={asset.id} className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded px-3 py-0.5">
                                                                                 <div className="flex justify-end mt-1">
                                                                                    <ArrowBigLeft size={20} className='text-orange-500' onClick={() => {
                                                                                       setItems(prev => prev.map((itm, idx2) => {
                                                                                          if (idx2 !== idx) return itm;
                                                                                          const regNums = Array.from({ length: Number(item.quantity) }, (_, j) =>
                                                                                             (itm.register_numbers && itm.register_numbers[j]) || ''
                                                                                          );
                                                                                          const brands = Array.from({ length: Number(item.quantity) }, (_, j) =>
                                                                                             (itm.register_brands && itm.register_brands[j]) || ''
                                                                                          );
                                                                                          const models = Array.from({ length: Number(item.quantity) }, (_, j) =>
                                                                                             (itm.register_models && itm.register_models[j]) || ''
                                                                                          );
                                                                                          regNums[i] = regNum;
                                                                                          brands[i] = brand;
                                                                                          models[i] = model;
                                                                                          return { ...itm, register_numbers: regNums, register_brands: brands, register_models: models };
                                                                                       }));
                                                                                       setSidebarOpenIdx(null);
                                                                                    }} />
                                                                                 </div>
                                                                                 <div className="flex flex-col gap-x-4 text-xs">
                                                                                    <span className='text-sm'><b>Register #:</b> {regNum}</span>
                                                                                    <span><b>Brand:</b> {brand || '-'}</span>
                                                                                    <span><b>Model:</b> {model || '-'}</span>
                                                                                 </div>
                                                                              </li>
                                                                           );
                                                                        })
                                                                     )}
                                                                  </ul>
                                                               </>
                                                            )
                                                         }
                                                      />
                                                   )}
                                                </div>
                                                <div className="flex-1">
                                                   <label className={`font-medium mb-1 flex items-center gap-2${fieldErr[`register_brand_${i}`] ? ' text-red-500 font-semibold' : ''}`}>Brand
                                                      {i > 0 && (
                                                         <>
                                                            <input
                                                               type="checkbox"
                                                               className="ml-2"
                                                               checked={item.register_brands && item.register_brands[i] === (item.register_brands && item.register_brands[0]) && item.register_brands && item.register_brands[0] !== undefined && item.register_brands[0] !== ''}
                                                               onChange={e => {
                                                                  if (e.target.checked) {
                                                                     setItems(prev => prev.map((itm, idx2) => {
                                                                        if (idx2 !== idx) return itm;
                                                                        const brands = Array.from({ length: Number(item.quantity) }, (_, j) =>
                                                                           (itm.register_brands && itm.register_brands[j]) || ''
                                                                        );
                                                                        brands[i] = brands[0] || '';
                                                                        return { ...itm, register_brands: brands };
                                                                     }));
                                                                  }
                                                               }}
                                                            />
                                                            <span className="text-xs ml-1">Same as above</span>
                                                         </>
                                                      )}
                                                   </label>
                                                   <Input
                                                      type="text"
                                                      placeholder="Enter brand"
                                                      className={`uppercase placeholder:normal-case ${fieldErr[`register_brand_${i}`] ? ' border-red-500' : ''}`}
                                                      value={item.register_brands && item.register_brands[i] ? item.register_brands[i] : ''}
                                                      onChange={e => {
                                                         const value = e.target.value;
                                                         setItems(prev => prev.map((itm, idx2) => {
                                                            if (idx2 !== idx) return itm;
                                                            const brands = Array.from({ length: Number(item.quantity) }, (_, j) =>
                                                               (itm.register_brands && itm.register_brands[j]) || ''
                                                            );
                                                            brands[i] = value;
                                                            return { ...itm, register_brands: brands };
                                                         }));
                                                         setItemFieldErrors(prev => prev.map((err, idx2) => idx2 === idx ? { ...err, [`register_brand_${i}`]: false } : err));
                                                      }}
                                                   />
                                                   {fieldErr[`register_brand_${i}`] && <span className="text-red-500 text-xs mt-1">Brand is required</span>}
                                                </div>
                                                <div className="flex-1">
                                                   <label className={`font-medium mb-1 flex items-center gap-2${fieldErr[`register_model_${i}`] ? ' text-red-500 font-semibold' : ''}`}>Model
                                                      {i > 0 && (
                                                         <>
                                                            <input
                                                               type="checkbox"
                                                               className="ml-2 w-4.5 h-4.5"
                                                               checked={item.register_models && item.register_models[i] === (item.register_models && item.register_models[0]) && item.register_models && item.register_models[0] !== undefined && item.register_models[0] !== ''}
                                                               onChange={e => {
                                                                  if (e.target.checked) {
                                                                     setItems(prev => prev.map((itm, idx2) => {
                                                                        if (idx2 !== idx) return itm;
                                                                        const models = Array.from({ length: Number(item.quantity) }, (_, j) =>
                                                                           (itm.register_models && itm.register_models[j]) || ''
                                                                        );
                                                                        models[i] = models[0] || '';
                                                                        return { ...itm, register_models: models };
                                                                     }));
                                                                  }
                                                               }}
                                                            />
                                                            <span className="text-xs ml-1">Same as above</span>
                                                         </>
                                                      )}
                                                   </label>
                                                   <Input
                                                      type="text"
                                                      placeholder="Enter model"
                                                      className={`uppercase placeholder:normal-case ${fieldErr[`register_model_${i}`] ? ' border-red-500' : ''}`}
                                                      value={item.register_models && item.register_models[i] ? item.register_models[i] : ''}
                                                      onChange={e => {
                                                         const value = e.target.value;
                                                         setItems(prev => prev.map((itm, idx2) => {
                                                            if (idx2 !== idx) return itm;
                                                            const models = Array.from({ length: Number(item.quantity) }, (_, j) =>
                                                               (itm.register_models && itm.register_models[j]) || ''
                                                            );
                                                            models[i] = value;
                                                            return { ...itm, register_models: models };
                                                         }));
                                                         setItemFieldErrors(prev => prev.map((err, idx2) => idx2 === idx ? { ...err, [`register_model_${i}`]: false } : err));
                                                      }}
                                                   />
                                                   {fieldErr[`register_model_${i}`] && <span className="text-red-500 text-xs mt-1">Model is required</span>}
                                                </div>
                                             </div>
                                          ))}
                                       </div>
                                       <div className="mt-1 text-blue-700 text-xs font-medium">
                                          Register Number fields only appear for backdated purchase registration. Please enter the register number(s), brand, and model for each item.
                                       </div>
                                    </>
                                 )}
                              </div>
                           );
                        })}
                     </div>
                  )}
                  {/* Step Navigation Buttons */}
                  <div className="flex justify-between gap-2 mt-6">
                     <Button type="button" variant="secondary" disabled={currentTabIndex === 0} onClick={() => setActiveTab(tabOrder[currentTabIndex - 1])}>Previous</Button>
                     <Button type="button" variant="default" disabled={currentTabIndex === tabOrder.length - 1} onClick={() => {
                        // Validate all items
                        const errors = items.map((item, idx) => {
                           const err: any = {};
                           if (!item.type) err.type = true;
                           if (!item.category) err.category = true;
                           if (!item.justification || !item.justification.trim()) err.justification = true;
                           if (backdated && Number(item.quantity) > 0) {
                              for (let i = 0; i < Number(item.quantity); i++) {
                                 if (!item.register_numbers || !item.register_numbers[i] || !item.register_numbers[i].trim()) err[`register_number_${i}`] = true;
                                 if (!item.register_brands || !item.register_brands[i] || !item.register_brands[i].trim()) err[`register_brand_${i}`] = true;
                                 if (!item.register_models || !item.register_models[i] || !item.register_models[i].trim()) err[`register_model_${i}`] = true;
                              }
                           }
                           return err;
                        });
                        setItemFieldErrors(errors);
                        // If any error, scroll to first error and do not proceed
                        const hasError = errors.some(err => Object.values(err).some(Boolean));
                        if (hasError) {
                           // Scroll to first error
                           setTimeout(() => {
                              const firstIdx = errors.findIndex(err => Object.values(err).some(Boolean));
                              const firstErr = errors[firstIdx];
                              if (firstErr) {
                                 if (firstErr.type) {
                                    const el = document.querySelectorAll('label[for="type"]')[firstIdx];
                                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                 } else if (firstErr.category) {
                                    const el = document.querySelectorAll('label[for="category"]')[firstIdx];
                                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                 } else if (firstErr.justification) {
                                    const el = document.querySelectorAll('label[for="justification"]')[firstIdx];
                                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                 } else {
                                    // For register_number, brand, model
                                    const regIdx = Object.keys(firstErr).find(k => k.startsWith('register_'));
                                    if (regIdx) {
                                       const el = document.querySelectorAll('input')[firstIdx];
                                       if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                    }
                                 }
                              }
                           }, 100);
                           return;
                        }
                        setActiveTab(tabOrder[currentTabIndex + 1]);
                     }}>Next</Button>
                  </div>
               </fieldset>
            )}
            {/* Tab 3: Purchase Information */}
            {activeTab === 'purchase' && (
               <fieldset className="border rounded p-4">
                  <legend className="flex items-center font-semibold text-lg gap-4">Purchase Information
                     <span className="ml-4 flex items-center gap-2">
                        <Switch checked={backdated} onCheckedChange={setBackdated} />
                        <span className="font-medium text-sm">Backdated Purchase</span>
                     </span>
                  </legend>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <div>
                        <label className="block font-medium mb-1">Purchase Order No</label>
                        <Input type="text" placeholder='Enter PO number' name="po_no" className='uppercase placeholder:normal-case' value={purchase.po_no} onChange={e => setPurchase(prev => ({ ...prev, po_no: e.target.value.toUpperCase() }))} />
                     </div>
                     <div>
                        <label className="block font-medium mb-1">Purchase Order Date</label>
                        <Input type="date" name="po_date" value={purchase.po_date} onChange={e => setPurchase(prev => ({ ...prev, po_date: e.target.value }))} />
                     </div>
                  </div>

                  {/* Items summary table */}
                  {items.length > 0 && (
                     <div className="mt-4">
                        <h3 className="font-semibold text-base mb-2">Purchase Items Summary</h3>
                        <div className="overflow-x-auto">
                           <table className="min-w-full border text-sm">
                              <thead className="bg-gray-100 dark:bg-gray-700">
                                 <tr>
                                    <th className="border px-2 py-1">#</th>
                                    <th className="border px-2 py-1">Type</th>
                                    <th className="border px-2 py-1">Category</th>
                                    <th className="border px-2 py-1">Supplier</th>
                                    <th className="border px-2 py-1">Unit Price <span className='text-blue-500 text-xs'>. *Quotation Sub-section coming soon</span></th>
                                    <th className="border px-2 py-1">Qty</th>
                                    <th className="border px-2 py-1">Total</th>
                                 </tr>
                              </thead>
                              <tbody>
                                 {items.map((item, idx) => {
                                    const unitPrice = parseFloat(item.unit_price ?? '0.00');
                                    const qty = parseInt(item.quantity || 0, 10);
                                    const total = unitPrice * qty;
                                    return (
                                       <tr key={item.id}>
                                          <td className="border px-2 py-1 text-center">{idx + 1}</td>
                                          <td className="border px-2 py-1">{getTypeName(item.type?.id)}</td>
                                          <td className="border px-2 py-1">{getCategoryName(item.category?.id)}</td>
                                          <td className="border px-2 py-1">
                                             <Input
                                                type="text"
                                                className="capitalize"
                                                placeholder="Enter supplier"
                                                value={item.supplier || ''}
                                                onChange={e => {
                                                   const val = e.target.value;
                                                   setItems(prev => prev.map((itm, i) => i === idx ? { ...itm, supplier: val } : itm));
                                                }}
                                             />
                                          </td>
                                          <td className="border px-2 py-1 text-right">
                                             <Input
                                                type="text"
                                                inputMode="decimal"
                                                pattern="^[0-9]*[.,]?[0-9]*$"
                                                placeholder="0.00"
                                                value={item.unit_price === undefined || item.unit_price === null ? '' : item.unit_price}
                                                onChange={e => {
                                                   let val = e.target.value.replace(/[^0-9.]/g, '');
                                                   // Only allow one decimal point
                                                   const parts = val.split('.');
                                                   if (parts.length > 2) {
                                                      val = parts[0] + '.' + parts.slice(1).join('');
                                                   }
                                                   setItems(prev => prev.map((itm, i) => i === idx ? { ...itm, unit_price: val } : itm));
                                                }}
                                                className="text-right"
                                             />
                                          </td>
                                          <td className="border px-2 py-1 text-center">{item.quantity}</td>
                                          <td className="border px-2 py-1 text-right">{item.unit_price && item.quantity ? (total).toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}</td>
                                       </tr>
                                    );
                                 })}
                              </tbody>
                           </table>
                        </div>
                        <div className="mt-2 text-xs text-gray-600 dark:text-gray-300">
                           <span className='text-danger'>To add or remove items, please use the <b>Request Items</b> tab above.</span>
                        </div>
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
                  <legend className="flex items-center font-semibold text-lg gap-4">Delivery Information
                     <span className="ml-4 flex items-center gap-2">
                        <Switch checked={backdated} onCheckedChange={setBackdated} />
                        <span className="font-medium text-sm">Backdated Purchase</span>
                     </span>
                  </legend>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     {/* Supplier field removed from Delivery Information */}
                     <div>
                        <label className="block font-medium mb-1">Delivery Order No</label>
                        <Input type="text" name="do_no" className='uppercase' value={delivery.do_no} onChange={e => setDelivery(prev => ({ ...prev, do_no: e.target.value }))} />
                     </div>
                     <div>
                        <label className="block font-medium mb-1">Delivery Date</label>
                        <Input type="date" name="do_date" value={delivery.do_date} onChange={e => setDelivery(prev => ({ ...prev, do_date: e.target.value }))} />
                     </div>
                     <div>
                        <label className="block font-medium mb-1">Invoice No</label>
                        <Input type="text" name="inv_no" className='uppercase' value={delivery.inv_no} onChange={e => setDelivery(prev => ({ ...prev, inv_no: e.target.value }))} />
                     </div>
                     <div>
                        <label className="block font-medium mb-1">Invoice Date</label>
                        <Input type="date" name="inv_date" value={delivery.inv_date} onChange={e => setDelivery(prev => ({ ...prev, inv_date: e.target.value }))} />
                     </div>
                     <div>
                        <label className="block font-medium mb-1">Upload All Documents</label>
                        <Input
                           type="file"
                           accept="application/pdf"
                           onChange={e => {
                              const file = e.target.files && e.target.files[0];
                              if (file && file.type === 'application/pdf') {
                                 setDeliveryDoc(file);
                              } else if (file) {
                                 alert('Only PDF files are allowed.');
                                 e.target.value = '';
                                 setDeliveryDoc(null);
                              }
                           }}
                        />
                        {deliveryDoc && (
                           <span className="text-xs text-green-600 block mt-1">Selected: {deliveryDoc.name}</span>
                        )}
                        <span className="text-xs text-red-500">Only PDF files are allowed. Max size: 10MB.</span>
                     </div>
                  </div>

                  {/* Items summary table for Delivery Information (no supplier/unit price columns) */}
                  {items.length > 0 && (
                     <div className="mt-4">
                        <h3 className="font-semibold text-base mb-2">Purchase Items Summary</h3>
                        <div className="overflow-x-auto">
                           <table className="min-w-full border text-sm">
                              <thead className="bg-gray-100 dark:bg-gray-700">
                                 <tr>
                                    <th className="border px-2 py-1">#</th>
                                    <th className="border px-2 py-1">Type</th>
                                    <th className="border px-2 py-1">Category</th>
                                    <th className="border px-2 py-1">Qty</th>
                                    <th className="border px-2 py-1">Delivery Status</th>
                                    <th className="border px-2 py-1">Delivery Remarks</th>
                                 </tr>
                              </thead>
                              <tbody>
                                 {items.map((item, idx) => (
                                    <tr key={item.id}>
                                       <td className="border px-2 py-1 text-center">{idx + 1}</td>
                                       <td className="border px-2 py-1">{getTypeName(item.type?.id)}</td>
                                       <td className="border px-2 py-1">{getCategoryName(item.category?.id)}</td>
                                       <td className="border px-2 py-1 text-center">{item.quantity}</td>
                                       <td className="border px-2 py-1 text-center">
                                          <Select
                                             value={item.delivery_status || ''}
                                             onValueChange={val => setItems(prev => prev.map((itm, i) => i === idx ? { ...itm, delivery_status: val } : itm))}
                                          >
                                             <SelectTrigger className="input w-full min-w-[120px]">
                                                <SelectValue placeholder="Select Status" />
                                             </SelectTrigger>
                                             <SelectContent>
                                                <SelectItem value="Completed">Completed</SelectItem>
                                                <SelectItem value="Partial Deliver">Partial Deliver</SelectItem>
                                                <SelectItem value="Wrong Items">Wrong Items</SelectItem>
                                             </SelectContent>
                                          </Select>
                                       </td>
                                       <td className="border px-2 py-1">
                                          <Textarea
                                             className="w-full min-w-[120px]"
                                             rows={1}
                                             value={item.delivery_remarks || ''}
                                             onChange={e => setItems(prev => prev.map((itm, i) => i === idx ? { ...itm, delivery_remarks: e.target.value } : itm))}
                                          />
                                       </td>
                                    </tr>
                                 ))}
                              </tbody>
                           </table>
                        </div>
                        <div className="mt-2 text-xs text-gray-600 dark:text-gray-300">
                           <span className='text-danger'>To add or remove items, please use the <b>Request Items</b> tab above.</span>
                        </div>
                     </div>
                  )}
                  {/* Step Navigation Buttons */}
                  <div className="flex justify-between gap-2 mt-6">
                     <Button type="button" variant="secondary" disabled={currentTabIndex === 0} onClick={() => setActiveTab(tabOrder[currentTabIndex - 1])}>Previous</Button>
                     {/* Actions only on last step */}
                     <div className="flex justify-center gap-2">
                        <Button type="submit" variant="secondary" className="bg-gray-300 hover:bg-gray-400 text-gray-800 hover:text-white">Save Draft</Button>
                        <Button type="submit" variant="default">Submit</Button>
                        <Button type="button" variant="destructive" className="bg-red-600 hover:bg-red-700 text-white">Cancel</Button>
                     </div>
                  </div>
               </fieldset>
            )}
            {/* Actions moved to last step only */}
         </form>
         {/* Confirmation Dialog */}
         <AlertDialog open={showConfirmDialog} onOpenChange={open => { if (!open) { setShowConfirmDialog(false); setPendingEvent(null); } }}>
            <AlertDialogContent>
               <AlertDialogHeader>
                  <AlertDialogTitle>Submit Purchase Request?</AlertDialogTitle>
                  <AlertDialogDescription>
                     Are you sure you want to submit this purchase request? You will not be able to edit after submission.
                  </AlertDialogDescription>
               </AlertDialogHeader>
               <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => { setShowConfirmDialog(false); setPendingEvent(null); }}>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={async () => {
                     setShowConfirmDialog(false);
                     await doSubmit();
                     setPendingEvent(null);
                  }}>Yes, Submit</AlertDialogAction>
               </AlertDialogFooter>
            </AlertDialogContent>
         </AlertDialog>
      </div>
   );
};

export default PurchaseRequestForm;


