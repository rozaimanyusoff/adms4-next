/* Procurement Management Module */
'use client';
import React, { useEffect, useMemo, useState, useContext } from 'react';
import { CustomDataGrid, ColumnDef } from '@/components/ui/DataGrid';
import ActionSidebar from '@/components/ui/action-aside';
// PurchaseSummary is shown in the parent tabs component
import PurchaseCard from './purchase-card';
import { Plus, ShoppingCart, Package, Truck, Eye, Edit, Trash2, Grid, List, Search, PlusCircle, FileText } from 'lucide-react';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { authenticatedApi } from '@/config/api';
import { AuthContext } from '@/store/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
// import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
// Removed Excel importer – creating records directly in-app

// Format number for RM display: thousand separators + 2 decimals
const fmtRM = (value: number) => {
  return Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Users allowed to delete purchase records
const deletePermissionAdmin = ['000705', '000277'];

interface ApiPurchase {
  id: number;
  request_id?: number;
  asset_registry?: string;
  request?: {
    id: number;
    pr_no?: string;
    pr_date?: string;
    request_type?: string;
    requested_by?: { ramco_id: string; full_name: string } | null;
    costcenter?: { id: number; name: string } | null;
    department?: any;
    created_at?: string | null;
    updated_at?: string | null;
  } | null;
  // API now returns nested objects for some fields. Keep unions so older records still work.
  requestor?: { ramco_id: string; full_name: string } | string; // legacy
  costcenter?: { id: number; name: string } | string; // legacy
  type?: { id: number; name: string } | string; // maps to item_type in form
  category?: { id: number; name: string } | string | null;
  description?: string; // new field replaces items
  items?: string; // legacy
  purpose?: string | null;
  supplier?: { id: number; name: string } | string;
  brand?: { id: number; name: string } | string;
  qty: number;
  unit_price: string;          // API returns as string
  total_price?: string;        // API returns as string
  pr_date?: string; // legacy
  pr_no?: string;   // legacy
  po_date?: string;
  po_no?: string;
  do_date?: string; // legacy
  do_no?: string;   // legacy
  inv_date?: string; // legacy
  inv_no?: string;   // legacy
  grn_date?: string; // legacy
  grn_no?: string;   // legacy
  deliveries?: Array<{
    do_date?: string;
    do_no?: string;
    inv_date?: string;
    inv_no?: string;
    grn_date?: string;
    grn_no?: string;
    id?: number;
    purchase_id?: number;
    request_id?: number;
    upload_path?: string | null;
    upload_url?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
  }>;
  handover_to?: string | null;
  handover_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  upload_path?: string | null;
  upload_url?: string | null;
  status?: string;
}

interface PurchaseFormData {
  request_type: string;
  costcenter: string;          // Match API field name
  pic: string;                 // Person in charge  
  type_id: string;             // maps to purchase.type.id
  category_id?: string;        // category linked to type
  items: string;               // Match API field name
  purpose?: string;            // additional purpose/remarks
  supplier_id: string;
  brand_id: string;            // send brand_id instead of brand name
  qty: number;
  unit_price: number;          // Will convert to string when sending to API
  pr_date: string;             // Match API field name
  pr_no: string;               // Match API field name
  po_date: string;
  po_no: string;               // Match API field name
  do_date: string;
  do_no: string;               // Match API field name
  inv_date: string;            // Match API field name
  inv_no: string;              // Match API field name
  grn_date: string;
  grn_no: string;              // Match API field name
  deliveries: Array<{
    do_date: string;
    do_no: string;
    inv_date: string;
    inv_no: string;
    grn_date: string;
    grn_no: string;
    upload_url?: string | null;
    id?: number; // For existing deliveries from backend
  }>;
}

const PurchaseRecords: React.FC<{ filters?: { type?: string; request_type?: string } }> = ({ filters }) => {
  const [purchases, setPurchases] = useState<ApiPurchase[]>([]);
  const [filteredPurchases, setFilteredPurchases] = useState<ApiPurchase[]>([]);
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarMode, setSidebarMode] = useState<'view' | 'create' | 'edit'>('create');
  const [selectedPurchase, setSelectedPurchase] = useState<ApiPurchase | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'cards'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [formData, setFormData] = useState<PurchaseFormData>({
    request_type: '',
    costcenter: '',
    pic: '',
    type_id: '',
    category_id: '',
    items: '',
    purpose: '',
    supplier_id: '',
    brand_id: '',
    qty: 0,
    unit_price: 0,
    pr_date: '',
    pr_no: '',
    po_date: '',
    po_no: '',
    do_date: '',
    do_no: '',
    inv_date: '',
    inv_no: '',
    grn_date: '',
    grn_no: '',
    deliveries: []
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [deliveryErrors, setDeliveryErrors] = useState<Array<Partial<Record<'do_date' | 'do_no' | 'inv_date' | 'inv_no' | 'grn_date' | 'grn_no', string>>>>([]);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  // Delivery deletion confirm dialog state
  const [pendingDelete, setPendingDelete] = useState<{ index: number; message: string } | null>(null);

  // Per-delivery file uploads
  const [deliveryFiles, setDeliveryFiles] = useState<Array<File | null>>([]);
  const fileInputRefs = React.useRef<Array<HTMLInputElement | null>>([]);

  const onDeliveryFileDrop = (index: number, e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const f = files[0];
      if (!f.type.includes('pdf') && !f.name.toLowerCase().endsWith('.pdf')) {
        toast.error('Only PDF files are allowed');
        return;
      }
      setDeliveryFiles(prev => {
        const arr = [...prev];
        arr[index] = f;
        return arr;
      });
    }
  };

  const onDeliveryFileSelect = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files && e.target.files[0];
    if (f) {
      if (!f.type.includes('pdf') && !f.name.toLowerCase().endsWith('.pdf')) {
        toast.error('Only PDF files are allowed');
        return;
      }
      setDeliveryFiles(prev => {
        const arr = [...prev];
        arr[index] = f;
        return arr;
      });
    }
  };

  const removeDeliveryFile = (index: number) => {
    setDeliveryFiles(prev => {
      const arr = [...prev];
      arr[index] = null;
      return arr;
    });
    const input = fileInputRefs.current[index];
    if (input) input.value = '';
  };

  // Combobox data for PIC (employees) and Cost Centers
  const [employees, setEmployees] = useState<Array<{ ramco_id: string; full_name: string }>>([]);
  const [employeeOptions, setEmployeeOptions] = useState<ComboboxOption[]>([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);

  const [costcenters, setCostcenters] = useState<Array<{ id: number | string; name: string }>>([]);
  const [costcenterOptions, setCostcenterOptions] = useState<ComboboxOption[]>([]);
  const [costcentersLoading, setCostcentersLoading] = useState(false);

  const [suppliers, setSuppliers] = useState<Array<{ id: number | string; name: string }>>([]);
  const [supplierOptions, setSupplierOptions] = useState<ComboboxOption[]>([]);
  const [suppliersLoading, setSuppliersLoading] = useState(false);

  const [brands, setBrands] = useState<Array<{ id: number | string; name: string }>>([]);
  const [brandOptions, setBrandOptions] = useState<ComboboxOption[]>([]);
  const [brandsLoading, setBrandsLoading] = useState(false);
  const [categories, setCategories] = useState<Array<{ id: number | string; name: string }>>([]);
  const [categoryOptions, setCategoryOptions] = useState<ComboboxOption[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  // Quick-create state
  const [newSupplierName, setNewSupplierName] = useState('');
  const [creatingSupplier, setCreatingSupplier] = useState(false);
  const [addingSupplier, setAddingSupplier] = useState(false);
  const [newBrandName, setNewBrandName] = useState('');
  const [creatingBrand, setCreatingBrand] = useState(false);
  const [addingBrand, setAddingBrand] = useState(false);

  const [types, setTypes] = useState<Array<{ id: number | string; name: string }>>([]);
  const [typeOptions, setTypeOptions] = useState<ComboboxOption[]>([]);
  const [typesLoading, setTypesLoading] = useState(false);

  useEffect(() => {
    // fetch employees and costcenters on mount
    const fetchComboboxData = async () => {
      try {
        setEmployeesLoading(true);
        setCostcentersLoading(true);
        const [empRes, ccRes, supRes, typesRes] = await Promise.all([
          authenticatedApi.get('/api/assets/employees?status=active'),
          authenticatedApi.get('/api/assets/costcenters'),
          authenticatedApi.get('/api/purchases/suppliers'),
          authenticatedApi.get('/api/assets/types')
        ]);

        const emps = (empRes as any).data?.data || (empRes as any).data || [];
        const ccs = (ccRes as any).data?.data || (ccRes as any).data || [];
        const sups = (supRes as any).data?.data || (supRes as any).data || [];
        const tps = (typesRes as any).data?.data || (typesRes as any).data || [];

        setEmployees(emps);
  const opts = emps.map((e: any) => ({ value: String(e.ramco_id), label: e.full_name }));
  console.log('Loaded employee options:', opts);
  setEmployeeOptions(opts);

        setCostcenters(ccs);
        setCostcenterOptions(ccs.map((c: any) => ({ value: String(c.id), label: c.name })));

        setSuppliers(sups);
        setSupplierOptions(sups.map((s: any) => ({ value: String(s.id), label: s.name })));
        setTypes(tps);
        setTypeOptions(tps.map((t: any) => ({ value: String(t.id), label: t.name })));
      } catch (err) {
        console.error('Failed to load combobox data', err);
      } finally {
        setEmployeesLoading(false);
        setCostcentersLoading(false);
        setTypesLoading(false);
      }
    };

    fetchComboboxData();
  }, []);

  // Fetch brands when item type (type_id) changes
  useEffect(() => {
    const fetchBrands = async () => {
      // clear when no type selected
      if (!formData.type_id) {
        setBrands([]);
        setBrandOptions([]);
        setCategories([]);
        setCategoryOptions([]);
        return;
      }

      try {
        setBrandsLoading(true);
        setCategoriesLoading(true);
        const [resBrands, resCats] = await Promise.all([
          authenticatedApi.get(`/api/assets/brands?type=${formData.type_id}`),
          authenticatedApi.get(`/api/assets/categories?type=${formData.type_id}`)
        ]);
        const dataBrands = (resBrands as any).data?.data || (resBrands as any).data || [];
        const dataCats = (resCats as any).data?.data || (resCats as any).data || [];
        setBrands(dataBrands);
        // use brand id as value
        setBrandOptions(dataBrands.map((b: any) => ({ value: String(b.id ?? b.code ?? b.name), label: b.name })));
        setCategories(dataCats);
        setCategoryOptions(dataCats.map((c: any) => ({ value: String(c.id ?? c.code ?? c.name), label: c.name })));
      } catch (err) {
        console.error('Failed to load brands/categories for type', formData.type_id, err);
        setBrands([]);
        setBrandOptions([]);
        setCategories([]);
        setCategoryOptions([]);
      } finally {
        setBrandsLoading(false);
        setCategoriesLoading(false);
      }
    };

    fetchBrands();
  }, [formData.type_id]);

  // Username from AuthContext or localStorage fallback
  const auth = useContext(AuthContext);
  const getUsername = () => {
    const fromCtx = auth?.authData?.user?.username;
    if (fromCtx) return fromCtx;
    try {
      return JSON.parse(localStorage.getItem('authData') || '{}')?.user?.username || '';
    } catch {
      return '';
    }
  };
  const canDelete = useMemo(() => deletePermissionAdmin.includes(getUsername()), [auth?.authData?.user?.username]);

  // Load purchases whenever username becomes available/changes
  useEffect(() => {
    const uname = getUsername();
    loadPurchases(uname);
     
  }, [auth?.authData?.user?.username]);

  // Filter purchases based on search and status
  useEffect(() => {
    let filtered = purchases;

    // Apply external filters passed from summary
    if (filters?.type) {
      filtered = filtered.filter(p => {
        const typeName = typeof p.type === 'string' ? p.type : (p.type && (p.type as any).name) || '';
        return String(typeName) === String(filters.type);
      });
    }
    if (filters?.request_type) {
      filtered = filtered.filter(p => (p.request?.request_type || (p as any).request_type) === filters.request_type);
    }

    // Apply search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(purchase => {
        const supplier = typeof purchase.supplier === 'string' ? purchase.supplier : (purchase.supplier?.name || '');
        const cc = purchase.request?.costcenter?.name || (typeof purchase.costcenter === 'string' ? purchase.costcenter : (purchase.costcenter as any)?.name || '');
        const brand = typeof purchase.brand === 'string' ? purchase.brand : (purchase.brand?.name || '');
        const prNo = purchase.request?.pr_no ? String(purchase.request.pr_no) : (purchase.pr_no ? String(purchase.pr_no) : '');
        const poNo = purchase.po_no ? String(purchase.po_no) : '';
        const desc = purchase.description || purchase.items || '';
        return (
          desc.toLowerCase().includes(q) ||
          supplier.toLowerCase().includes(q) ||
          cc.toLowerCase().includes(q) ||
          brand.toLowerCase().includes(q) ||
          prNo.toLowerCase().includes(q) ||
          poNo.toLowerCase().includes(q)
        );
      });
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(purchase => {
        const status = getStatusText(purchase).toLowerCase();
        return status === statusFilter;
      });
    }

    setFilteredPurchases(filtered);
  }, [purchases, searchQuery, statusFilter]);

  const loadPurchases = async (managerUsername?: string) => {
    setLoading(true);
    try {
      const url = managerUsername
        ? `/api/purchases?managers=${encodeURIComponent(managerUsername)}`
        : '/api/purchases';
      const response = await authenticatedApi.get<{ data: ApiPurchase[] }>(url);
      setPurchases(response.data?.data || []);
    } catch (error) {
      toast.error('Failed to load purchase records');
      console.error('Error loading purchases:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle form field changes
  const handleInputChange = (field: keyof PurchaseFormData, value: any) => {
    // Force uppercase for document number fields
    const upperFields: (keyof PurchaseFormData)[] = ['pr_no', 'po_no', 'do_no', 'inv_no', 'grn_no'];
    if (upperFields.includes(field)) {
      value = String(value || '').toUpperCase();
    }
    setFormData(prev => ({ ...prev, [field]: value }));
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Calculate total automatically
  const calculatedTotal = useMemo(() => {
    return formData.qty * formData.unit_price;
  }, [formData.qty, formData.unit_price]);

  // Delivery slots allowed: up to quantity, capped at 5
  const maxDeliveries = useMemo(() => Math.min(Math.max(formData.qty || 0, 0), 5), [formData.qty]);

  const [activeDeliveryTab, setActiveDeliveryTab] = useState<string>('delivery-0');

  const updateDeliveryField = (index: number, field: 'do_date' | 'do_no' | 'inv_date' | 'inv_no' | 'grn_date' | 'grn_no', value: string) => {
    const deliveries = [...(formData.deliveries || [])];
    deliveries[index] = { ...deliveries[index], [field]: field.endsWith('_no') ? String(value || '').toUpperCase() : value } as any;
    const isLast = index === deliveries.length - 1;
    setFormData(prev => ({
      ...prev,
      deliveries,
      do_date: isLast && field === 'do_date' ? value : (isLast ? deliveries[index].do_date : prev.do_date),
      do_no: isLast && field === 'do_no' ? String(value || '').toUpperCase() : (isLast ? deliveries[index].do_no : prev.do_no),
      inv_date: isLast && field === 'inv_date' ? value : (isLast ? deliveries[index].inv_date : prev.inv_date),
      inv_no: isLast && field === 'inv_no' ? String(value || '').toUpperCase() : (isLast ? deliveries[index].inv_no : prev.inv_no),
      grn_date: isLast && field === 'grn_date' ? value : (isLast ? deliveries[index].grn_date : prev.grn_date),
      grn_no: isLast && field === 'grn_no' ? String(value || '').toUpperCase() : (isLast ? deliveries[index].grn_no : prev.grn_no),
    }));

    // Clear error for this field on change
    setDeliveryErrors(prev => {
      const arr = [...prev];
      const e = { ...(arr[index] || {}) } as any;
      delete e[field];
      arr[index] = e;
      return arr;
    });
  };

  // Detect duplicate deliveries based on key fields
  const findDuplicateDeliveries = (): number[] => {
    const duplicateIndices: number[] = [];
    const deliveries = formData.deliveries || [];
    
    console.log('Checking for duplicates in deliveries:', deliveries);
    
    // Helper function to normalize strings for comparison
    const normalize = (str: string | undefined | null): string => {
      return (str || '').toString().trim().toUpperCase();
    };
    
    for (let i = 0; i < deliveries.length; i++) {
      const current = deliveries[i];
      // Skip completely empty deliveries
      if (!current.do_date && !current.do_no && !current.inv_date && !current.inv_no && !current.grn_date && !current.grn_no) {
        console.log(`Delivery ${i} is completely empty, skipping`);
        continue;
      }
      
      for (let j = i + 1; j < deliveries.length; j++) {
        const other = deliveries[j];
        
        // Skip comparison if other delivery is completely empty
        if (!other.do_date && !other.do_no && !other.inv_date && !other.inv_no && !other.grn_date && !other.grn_no) {
          continue;
        }
        
        // Normalize values for comparison
        const currentNorm = {
          do_date: normalize(current.do_date),
          do_no: normalize(current.do_no),
          inv_date: normalize(current.inv_date),
          inv_no: normalize(current.inv_no)
        };
        
        const otherNorm = {
          do_date: normalize(other.do_date),
          do_no: normalize(other.do_no),
          inv_date: normalize(other.inv_date),
          inv_no: normalize(other.inv_no)
        };
        
        // Check if deliveries match on key fields
        const isDuplicate = (
          currentNorm.do_date === otherNorm.do_date &&
          currentNorm.do_no === otherNorm.do_no &&
          currentNorm.inv_date === otherNorm.inv_date &&
          currentNorm.inv_no === otherNorm.inv_no &&
          // Only consider it duplicate if at least some key fields are filled
          (currentNorm.do_date || currentNorm.do_no || currentNorm.inv_date || currentNorm.inv_no)
        );
        
        console.log(`Comparing delivery ${i} with ${j}:`, {
          current: currentNorm,
          other: otherNorm,
          isDuplicate
        });
        
        if (isDuplicate) {
          console.log(`Found duplicate: deliveries ${i} and ${j}`);
          if (!duplicateIndices.includes(i)) duplicateIndices.push(i);
          if (!duplicateIndices.includes(j)) duplicateIndices.push(j);
        }
      }
    }
    
    console.log('Duplicate indices found:', duplicateIndices);
    return duplicateIndices.sort((a, b) => a - b);
  };

  // Detect partial duplicates (same numbers but different dates) - potential data entry errors
  const findPartialDuplicates = (): { indices: number[], details: string[] } => {
    const partialDuplicates: number[] = [];
    const details: string[] = [];
    const deliveries = formData.deliveries || [];
    
    const normalize = (str: string | undefined | null): string => {
      return (str || '').toString().trim().toUpperCase();
    };
    
    for (let i = 0; i < deliveries.length; i++) {
      const current = deliveries[i];
      if (!current.do_no && !current.inv_no && !current.grn_no) continue;
      
      for (let j = i + 1; j < deliveries.length; j++) {
        const other = deliveries[j];
        if (!other.do_no && !other.inv_no && !other.grn_no) continue;
        
        const currentNorm = {
          do_no: normalize(current.do_no),
          inv_no: normalize(current.inv_no),
          grn_no: normalize(current.grn_no)
        };
        
        const otherNorm = {
          do_no: normalize(other.do_no),
          inv_no: normalize(other.inv_no),
          grn_no: normalize(other.grn_no)
        };
        
        // Check for same numbers but different dates
        const sameNumbers = (
          (currentNorm.do_no && currentNorm.do_no === otherNorm.do_no) ||
          (currentNorm.inv_no && currentNorm.inv_no === otherNorm.inv_no) ||
          (currentNorm.grn_no && currentNorm.grn_no === otherNorm.grn_no)
        );
        
        const differentDates = (
          normalize(current.do_date) !== normalize(other.do_date) ||
          normalize(current.inv_date) !== normalize(other.inv_date) ||
          normalize(current.grn_date) !== normalize(other.grn_date)
        );
        
        if (sameNumbers && differentDates) {
          if (!partialDuplicates.includes(i)) {
            partialDuplicates.push(i);
            details.push(`Delivery ${i + 1}`);
          }
          if (!partialDuplicates.includes(j)) {
            partialDuplicates.push(j);
            details.push(`Delivery ${j + 1}`);
          }
        }
      }
    }
    
    return { indices: partialDuplicates.sort((a, b) => a - b), details };
  };
  
  // Delete delivery function that calls backend API
  const deleteDelivery = async (deliveryIndex: number) => {
    try {
      const delivery = formData.deliveries?.[deliveryIndex];
      
      // If delivery has an ID, delete from backend
      if (delivery?.id && sidebarMode === 'edit') {
        await authenticatedApi.delete(`/api/purchases/deliveries/${delivery.id}`);
        toast.success('Delivery deleted successfully');
      }
      
      // Remove from local state
      const updatedDeliveries = [...(formData.deliveries || [])];
      updatedDeliveries.splice(deliveryIndex, 1);
      
      // Remove associated file
      const updatedFiles = [...deliveryFiles];
      updatedFiles.splice(deliveryIndex, 1);
      
      setFormData(prev => ({ ...prev, deliveries: updatedDeliveries }));
      setDeliveryFiles(updatedFiles);
      
      // Adjust active tab if necessary
      const newLength = updatedDeliveries.length;
      if (newLength === 0) {
        setActiveDeliveryTab('delivery-0');
      } else if (deliveryIndex <= parseInt(activeDeliveryTab.split('-')[1])) {
        const newActiveIndex = Math.max(0, Math.min(deliveryIndex - 1, newLength - 1));
        setActiveDeliveryTab(`delivery-${newActiveIndex}`);
      }
      
    } catch (error) {
      console.error('Error deleting delivery:', error);
      toast.error('Failed to delete delivery');
    }
  };

  const validateDeliveries = (): boolean => {
    const errs: Array<Partial<Record<'do_date' | 'do_no' | 'inv_date' | 'inv_no' | 'grn_date' | 'grn_no', string>>> = [];
    let ok = true;
    (formData.deliveries || []).forEach((d, i) => {
      const e: any = {};
      const hasDO = !!(d.do_date || d.do_no);
      const hasINV = !!(d.inv_date || d.inv_no);
      const hasGRN = !!(d.grn_date || d.grn_no);
      const hasAny = hasDO || hasINV || hasGRN || !!deliveryFiles[i];
      // If the delivery slot exists but is completely empty (no fields and no file), flag it as an error
      if (!hasAny) {
        // mark a visible field (do_no) with message so user sees the error under DO Number
        e.do_no = 'Empty delivery entry — remove or fill required fields';
        errs[i] = e;
        ok = false;
        return; // continue to next
      }
      // If user started this delivery (or attached file), require pairs accordingly
      if (hasAny) {
        if (hasDO) {
          if (!d.do_date) e.do_date = 'DO date is required';
          if (!d.do_no) e.do_no = 'DO number is required';
        }
        if (hasINV) {
          if (!d.inv_date) e.inv_date = 'Invoice date is required';
          if (!d.inv_no) e.inv_no = 'Invoice number is required';
        }
        if (hasGRN) {
          if (!d.grn_date) e.grn_date = 'GRN date is required';
          if (!d.grn_no) e.grn_no = 'GRN number is required';
        }
      }
      errs[i] = e;
      if (Object.keys(e).length > 0) ok = false;
    });
    setDeliveryErrors(errs);
    return ok;
  };

  // Validate form
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.request_type) errors.request_type = 'Request type is required';
    if (!formData.costcenter) errors.costcenter = 'Cost center is required';
    if (!formData.pic) errors.pic = 'Requester is required';
    if (!formData.items) errors.items = 'Item description is required';
    if (!formData.type_id) errors.type_id = 'Item type is required';
    if (!formData.supplier_id) errors.supplier_id = 'Supplier is required';
    if (!formData.pr_no?.trim()) errors.pr_no = 'PR number is required';
    if (!formData.pr_date?.trim()) errors.pr_date = 'PR date is required';
    if (!formData.po_no?.trim()) errors.po_no = 'PO number is required';
    if (!formData.po_date?.trim()) errors.po_date = 'PO date is required';
    if (!formData.qty || formData.qty <= 0) errors.qty = 'Quantity must be greater than 0';
    if (!formData.unit_price || formData.unit_price <= 0) errors.unit_price = 'Unit price must be greater than 0';

    const baseOk = Object.keys(errors).length === 0;
    const deliveriesOk = validateDeliveries();
    setValidationErrors(errors);
    return baseOk && deliveriesOk;
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const rawDeliveries = formData.deliveries || [];
      const deliveriesWithIndex = rawDeliveries
        .map((d, i) => ({ d, i }))
        .filter(({ d, i }) => {
          const hasVals = [d.do_date, d.do_no, d.inv_date, d.inv_no, d.grn_date, d.grn_no]
            .some(v => !!(v && String(v).trim() !== ''));
          const hasFile = !!deliveryFiles[i];
          return hasVals || hasFile;
        });
      const cleanDeliveries = deliveriesWithIndex.map(x => x.d);
      const allowedDeliveries = Math.min(Math.max(formData.qty || 0, 0), 5);
      if (cleanDeliveries.length > allowedDeliveries) {
        toast.error(`Deliveries exceed allowed limit (${allowedDeliveries}). Remove extra deliveries or adjust quantity.`);
        setLoading(false);
        return;
      }
      const jsonPayload: any = {
        ...formData,
        total_price: calculatedTotal.toString(),
        unit_price: String(formData.unit_price ?? ''),
        // map to API expected keys (keep as-is; backend can coerce types if needed)
        costcenter_id: formData.costcenter,
        ramco_id: formData.pic,
        brand_id: formData.brand_id || undefined,
        category_id: formData.category_id || undefined,
        purpose: formData.purpose || undefined,
        description: formData.items,
      };

      // Ensure request_id is included on update (edit mode)
      if (sidebarMode === 'edit' && selectedPurchase) {
        const reqId = (selectedPurchase.request && selectedPurchase.request.id)
          ? selectedPurchase.request.id
          : (selectedPurchase as any).request_id;
        if (reqId) {
          jsonPayload.request_id = reqId;
        }
      }

      // remove top-level logistics fields to avoid duplication (kept only in deliveries)
      delete jsonPayload.do_date;
      delete jsonPayload.do_no;
      delete jsonPayload.inv_date;
      delete jsonPayload.inv_no;
      delete jsonPayload.grn_date;
      delete jsonPayload.grn_no;

      // include deliveries only; use cleaned subset
      if (cleanDeliveries.length > 0) {
        jsonPayload.deliveries = cleanDeliveries.map((d) => ({
          do_date: d.do_date || '',
          do_no: d.do_no || '',
          inv_date: d.inv_date || '',
          inv_no: d.inv_no || '',
          grn_date: d.grn_date || '',
          grn_no: d.grn_no || '',
          // include key for stability; real file goes in multipart branch
          upload_path: ''
        }));
      }

      // remove the old keys to avoid sending duplicate data
      delete jsonPayload.costcenter;
      delete jsonPayload.pic;
      delete jsonPayload.items;
      // Do not send brand name field
      delete jsonPayload.brand;

      // If any delivery has a file, send multipart/form-data and include files under deliveries[i][upload_path]
      const selectedIndexes = deliveriesWithIndex.map(x => x.i);
      const hasDeliveryFiles = selectedIndexes.some(idx => !!deliveryFiles[idx]);
      if (hasDeliveryFiles) {
        const fd = new FormData();
        // append scalar fields
        Object.entries(jsonPayload).forEach(([k, v]) => {
          if (v === undefined || v === null) return;
          if (k === 'deliveries') return; // append deliveries individually
          fd.append(k, String(v));
        });
        // append deliveries fields and files
        deliveriesWithIndex.forEach(({ d, i }, idx) => {
          // use a compact delivery index (idx) for the form payload
          fd.append(`deliveries[${idx}][do_date]`, d.do_date || '');
          fd.append(`deliveries[${idx}][do_no]`, d.do_no || '');
          fd.append(`deliveries[${idx}][inv_date]`, d.inv_date || '');
          fd.append(`deliveries[${idx}][inv_no]`, d.inv_no || '');
          fd.append(`deliveries[${idx}][grn_date]`, d.grn_date || '');
          fd.append(`deliveries[${idx}][grn_no]`, d.grn_no || '');
          const f = deliveryFiles[i];
          if (f) {
            fd.append(`deliveries[${idx}][upload_path]`, f, f.name);
          } else {
            fd.append(`deliveries[${idx}][upload_path]`, '');
          }
        });

        if (sidebarMode === 'edit' && selectedPurchase) {
          await authenticatedApi.put(`/api/purchases/${selectedPurchase.id}`, fd, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          toast.success('Purchase record updated successfully');
        } else {
          await authenticatedApi.post('/api/purchases', fd, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          toast.success('Purchase record created successfully');
        }
      } else {
        // No file: send JSON payload as before
        if (sidebarMode === 'edit' && selectedPurchase) {
          await authenticatedApi.put(`/api/purchases/${selectedPurchase.id}`, jsonPayload);
          toast.success('Purchase record updated successfully');
        } else {
          await authenticatedApi.post('/api/purchases', jsonPayload);
          toast.success('Purchase record created successfully');
        }
      }

      loadPurchases();
      closeSidebar();
    } catch (error: any) {
      // Prefer backend-provided message over generic 500
      const getApiErrorMessage = (err: any): string => {
        try {
          const resp = err?.response;
          const data = resp?.data;
          if (!data) return err?.message || 'Failed to save purchase record';
          // Common shapes: { message }, { error }, string, { errors: { field: [msg] } }
          if (typeof data === 'string') return data;
          if (data.message && typeof data.message === 'string') return data.message;
          if (data.error && typeof data.error === 'string') return data.error;
          if (data.errors && typeof data.errors === 'object') {
            const first = Object.values<any>(data.errors).flat().find((m: any) => typeof m === 'string');
            if (first) return first as string;
          }
          return err?.message || 'Failed to save purchase record';
        } catch {
          return 'Failed to save purchase record';
        }
      };

      const msg = getApiErrorMessage(error);
      toast.error(msg || 'Failed to save purchase record');
      console.error('Error saving purchase:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle delete
  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this purchase record?')) return;

    setLoading(true);
    try {
      await authenticatedApi.delete(`/api/purchases/${id}`);
      toast.success('Purchase record deleted successfully');
      loadPurchases();
      closeSidebar();
    } catch (error: any) {
      const getApiErrorMessage = (err: any): string => {
        const data = err?.response?.data;
        if (!data) return err?.message || 'Failed to delete purchase record';
        if (typeof data === 'string') return data;
        if (data.message && typeof data.message === 'string') return data.message;
        if (data.error && typeof data.error === 'string') return data.error;
        if (data.errors && typeof data.errors === 'object') {
          const first = Object.values<any>(data.errors).flat().find((m: any) => typeof m === 'string');
          if (first) return first as string;
        }
        return err?.message || 'Failed to delete purchase record';
      };
      toast.error(getApiErrorMessage(error));
      console.error('Error deleting purchase:', error);
    } finally {
      setLoading(false);
    }
  };

  // Sidebar handlers
  const openSidebar = (mode: 'view' | 'create' | 'edit', purchase?: ApiPurchase) => {
    setSidebarMode(mode);
    setSelectedPurchase(purchase || null);

    if (mode === 'create') {
      setFormData({
        request_type: '',
        costcenter: '',
        pic: '',
        type_id: '',
        category_id: '',
        items: '',
        purpose: '',
        supplier_id: '',
        brand_id: '',
        qty: 0,
        unit_price: 0,
        pr_date: '',
        pr_no: '',
        po_date: '',
        po_no: '',
        do_date: '',
        do_no: '',
        inv_date: '',
        inv_no: '',
        grn_date: '',
        grn_no: '',
        deliveries: []
      });
      setActiveDeliveryTab('delivery-0');
      setDeliveryFiles([]);
    } else if ((mode === 'edit' || mode === 'view') && purchase) {
      // Always hydrate latest data by id (list payload may not include nested fields)
      (async () => {
        let p: any = purchase;
        try {
          const res = await authenticatedApi.get(`/api/purchases/${purchase.id}`);
          p = (res as any).data?.data || (res as any).data || purchase;
          setSelectedPurchase(p);
        } catch {
          // fall back to provided purchase
        }

        const ccId = p.request?.costcenter?.id ? String(p.request.costcenter.id) : (typeof p.costcenter === 'string' ? p.costcenter : (p.costcenter?.name || ''));
        const picVal = p.request?.requested_by?.ramco_id || (typeof p.requestor === 'string' ? p.requestor : (p.requestor?.ramco_id || ''));
        const supplierId = typeof p.supplier === 'string' || !p.supplier ? '' : (p.supplier?.id ? String(p.supplier.id) : '');
        const brandId = typeof p.brand === 'string' || !p.brand ? '' : (p.brand?.id ? String(p.brand.id) : '');
        const typeId = typeof p.type !== 'string' && p.type?.id ? String(p.type.id) : (typeof p.type === 'string' ? p.type : '');
        const categoryId = typeof p.category !== 'string' && p.category?.id ? String(p.category.id) : '';

        const deliveries = Array.isArray(p.deliveries)
          ? p.deliveries.map((d: any) => ({
              id: d.id,
              do_date: d.do_date ? String(d.do_date).split('T')[0] : '',
              do_no: d.do_no || '',
              inv_date: d.inv_date ? String(d.inv_date).split('T')[0] : '',
              inv_no: d.inv_no || '',
              grn_date: d.grn_date ? String(d.grn_date).split('T')[0] : '',
              grn_no: d.grn_no || '',
              upload_url: d.upload_url || d.upload_path || null,
            }))
          : [];
        const last = deliveries[deliveries.length - 1];

        setFormData({
          request_type: p.request?.request_type || p.request_type || '',
          costcenter: ccId || '',
          pic: picVal || '',
          type_id: typeId || '',
          category_id: categoryId || '',
          items: p.description || p.items || '',
          purpose: p.purpose || '',
          supplier_id: supplierId,
          brand_id: brandId,
          qty: p.qty || 0,
          unit_price: parseFloat(p.unit_price || '0'),
          pr_date: p.request?.pr_date ? String(p.request.pr_date).split('T')[0] : (p.pr_date ? String(p.pr_date).split('T')[0] : ''),
          pr_no: p.request?.pr_no || p.pr_no || '',
          po_date: p.po_date ? String(p.po_date).split('T')[0] : '',
          po_no: p.po_no || '',
          do_date: last ? last.do_date : '',
          do_no: last ? last.do_no : '',
          inv_date: last ? last.inv_date : '',
          inv_no: last ? last.inv_no : '',
          grn_date: last ? last.grn_date : '',
          grn_no: last ? last.grn_no : '',
          deliveries
        });
        setActiveDeliveryTab(`delivery-${Math.max(0, deliveries.length - 1)}`);
        setDeliveryFiles(new Array(deliveries.length).fill(null));
      })();
    }

    setSidebarOpen(true);
    setValidationErrors({});
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
    setSelectedPurchase(null);
    setValidationErrors({});
  };

  // Handle Excel import
  const handleImportConfirm = async (tableName: string, headers: string[], data: any[][]) => {
    setLoading(true);
    try {
      // Process and validate import data
      const importData = data.map(row => {
        const record: any = {};
        headers.forEach((header, index) => {
          record[header.toLowerCase().replace(/\s+/g, '_')] = row[index];
        });
        return record;
      });

      await authenticatedApi.post('/api/purchases/import', { data: importData });
      toast.success(`Successfully imported ${importData.length} purchase records`);
      loadPurchases();
      closeSidebar();
    } catch (error) {
      toast.error('Failed to import purchase records');
      console.error('Error importing purchases:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get status badge variant
  const getStatusVariant = (purchase: ApiPurchase) => {
    const ds = (purchase as any).deliveries as any[] | undefined;
    const latest = ds && ds.length > 0 ? ds[ds.length - 1] : undefined;
    if ((latest?.grn_date && latest?.grn_no) || (purchase.grn_date && purchase.grn_no)) return 'success';
    if ((latest?.inv_date && latest?.inv_no) || (purchase.inv_date && purchase.inv_no)) return 'secondary';
    if ((latest?.do_date && latest?.do_no) || (purchase.do_date && purchase.do_no)) return 'outline';
    if (purchase.po_date && purchase.po_no) return 'default';
    return 'destructive';
  };

  // Get status text
  const getStatusText = (purchase: ApiPurchase) => {
    const ds = (purchase as any).deliveries as any[] | undefined;
    const latest = ds && ds.length > 0 ? ds[ds.length - 1] : undefined;
    const qty = Number(purchase.qty || 0);

    // Completed when GRN recorded
    if ((latest?.grn_date && latest?.grn_no) || (purchase.grn_date && purchase.grn_no)) return 'Completed';

    // Handover when assets have been registered
    const assetRegistry = String((purchase as any).asset_registry || '').toLowerCase();
    if (assetRegistry === 'completed') return 'Handover';

    // Delivered only when all purchased items have been delivered
    const deliveredCount = Array.isArray(ds) ? ds.length : 0;
    const allDelivered = (qty > 0 && deliveredCount >= qty) || (!!purchase.do_date && !!purchase.do_no);
    if (allDelivered) return 'Delivered';

    // Otherwise, still ordered
    if (purchase.po_date && purchase.po_no) return 'Ordered';
    return 'Requested';
  };

  // Badge class for request type: CAPEX -> green, OPEX -> blue, others -> amber
  const getRequestTypeBadgeClass = (type?: string) => {
    const t = (type || '').toString().toUpperCase();
    if (t === 'CAPEX') return 'bg-cyan-600 text-white text-xs';
    if (t === 'OPEX') return 'bg-blue-600 text-white text-xs';
    return 'bg-amber-600 text-white text-xs';
  };

  // Define columns for DataGrid
  const columns: ColumnDef<any>[] = [
    { key: 'id', header: 'No' },
        // Exclude deliveries columns for now; /api/purchases list does not include them
    {
      key: 'status',
      header: 'Status',
      render: (row: any) => {
        const typeId = typeof row.type === 'string' ? '' : (row.type?.id || '');
        const isRegCompleted = String((row as any).asset_registry || '').toLowerCase() === 'completed';
        return (
          <div className="flex items-center gap-2">
            <Badge variant={getStatusVariant(row) as any}>
              {getStatusText(row)}
            </Badge>
            <Button
              size="sm"
              variant={isRegCompleted ? 'default' : 'outline'}
              onClick={(e) => {
                e.stopPropagation();
                window.open(`/purchase/asset/${row.id}?type=${typeId}`, '_blank');
              }}
              className={`h-6 px-2 ${isRegCompleted ? 'bg-green-600 hover:bg-green-700 text-white border-0' : 'text-blue-600 hover:text-blue-700'}`}
              title="Open Asset Manager"
            >
              <PlusCircle className="h-4 w-4 mr-1" /> Assets
            </Button>
          </div>
        );
      },
      filter: 'singleSelect'
    },
    {
      key: 'request_type',
      header: 'Request Type',
      render: (row: any) => (
        <span className={getRequestTypeBadgeClass(row.request?.request_type || row.request_type) + ' inline-flex items-center px-2 py-0.5 rounded-full'}>
          {row.request?.request_type || row.request_type}
        </span>
      ),
      filter: 'singleSelect'
    },
    {
      key: 'pr_date',
      header: 'PR Date',
      render: (row: any) => (row.request?.pr_date ? new Date(row.request.pr_date).toLocaleDateString('en-GB') : (row.pr_date ? new Date(row.pr_date).toLocaleDateString('en-GB') : ''))
    },
    { key: 'pr_no', header: 'PR Number', filter: 'input', render: (row: any) => row.request?.pr_no || row.pr_no || '' },
    {
      key: 'pic',
      header: 'Requested By',
      filter: 'input',
      render: (row: any) => {
        const r = row.request?.requested_by || (typeof row.requestor === 'string' ? null : row.requestor);
        if (r && r.ramco_id && r.full_name) return `${r.ramco_id} - ${r.full_name}`;
        if (typeof row.requestor === 'string') return row.requestor;
        return r?.full_name || '';
      }
    },
    {
      key: 'costcenter',
      header: 'Cost Center',
      filter: 'singleSelect',
      render: (row: any) => row.request?.costcenter?.name || (typeof row.costcenter === 'string' ? row.costcenter : (row.costcenter?.name || ''))
    },
    { key: 'item_type', header: 'Item Type', filter: 'singleSelect', render: (row: any) => typeof row.type === 'string' ? row.type : (row.type?.name || row.item_type || '') },
    {
      key: 'description',
      header: 'Description',
      filter: 'input',
      render: (row: any) => row.description || row.items || ''
    },
    { key: 'qty', header: 'Qty' },
    { key: 'supplier', header: 'Supplier', filter: 'singleSelect', render: (row: any) => typeof row.supplier === 'string' ? row.supplier : (row.supplier?.name || '') },
    { key: 'brand', header: 'Brand', filter: 'singleSelect', render: (row: any) => typeof row.brand === 'string' ? row.brand : (row.brand?.name || '') },
    {
      key: 'unit_price',
      header: 'Unit Price (RM)',
      render: (row: any) => `RM ${fmtRM(Number(row.unit_price) || 0)}`
    },
    {
      key: 'total',
      header: 'Total (RM)',
      render: (row: any) => {
        const total = Number(row.total_price ?? NaN);
        if (Number.isFinite(total)) return `RM ${fmtRM(total)}`;
        return `RM ${fmtRM((row.qty || 0) * (Number(row.unit_price) || 0))}`;
      }
    },
    {
      key: 'po_date',
      header: 'PO Date',
      render: (row: any) => row.po_date ? new Date(row.po_date).toLocaleDateString('en-GB') : ''
    },
    { key: 'po_no', header: 'PO Number', filter: 'input' },

  ];

  // Render form content
  const renderFormContent = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Request Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <ShoppingCart className="mr-2 h-5 w-5" />
              Request Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="request_type">Request Type *</Label>
              <Select
                value={formData.request_type}
                onValueChange={(value) => handleInputChange('request_type', value)}
              >
                <SelectTrigger className='w-full'>
                  <SelectValue placeholder="Select request type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CAPEX">CAPEX</SelectItem>
                  <SelectItem value="OPEX">OPEX</SelectItem>
                  <SelectItem value="SERVICES">SERVICES</SelectItem>
                </SelectContent>
              </Select>
              {validationErrors.request_type && (
                <p className="text-red-500 text-sm mt-1">{validationErrors.request_type}</p>
              )}
            </div>
            {/* PR fields moved above Request Type (readonly in edit mode) */}
            <div>
              <Label htmlFor="pr_date">Request Date *</Label>
              <Input
                id="pr_date"
                type="date"
                value={formData.pr_date}
                onChange={(e) => handleInputChange('pr_date', e.target.value)}
              />
              {validationErrors.pr_date && (
                <p className="text-red-500 text-sm mt-1">{validationErrors.pr_date}</p>
              )}
            </div>
            <div>
              <Label htmlFor="pr_no">Request Number *</Label>
              <Input
                id="pr_no"
                value={formData.pr_no}
                onChange={(e) => handleInputChange('pr_no', e.target.value)}
                placeholder="Enter PR number"
              />
              {validationErrors.pr_no && (
                <p className="text-red-500 text-sm mt-1">{validationErrors.pr_no}</p>
              )}
            </div>

            <div>
              <Label htmlFor="costcenter">Cost Center *</Label>
              <Combobox
                options={costcenterOptions}
                value={formData.costcenter}
                onValueChange={(val) => handleInputChange('costcenter', val)}
                placeholder="Select cost center"
                emptyMessage="No cost centers"
                disabled={costcentersLoading}
                clearable={true}
              />
              {validationErrors.costcenter && (
                <p className="text-red-500 text-sm mt-1">{validationErrors.costcenter}</p>
              )}
            </div>

            <div>
              <Label htmlFor="pic">Requester *</Label>
              <Combobox
                options={
                  employeeOptions.some(opt => opt.value === formData.pic)
                    ? employeeOptions
                    : formData.pic
                      ? [
                          ...employeeOptions,
                          {
                            value: formData.pic,
                            label:
                              (() => {
                                let fullName = '';
                                if (selectedPurchase?.request?.requested_by?.ramco_id === formData.pic) {
                                  fullName = selectedPurchase.request.requested_by.full_name;
                                } else if (
                                  selectedPurchase?.requestor &&
                                  typeof selectedPurchase.requestor === 'object' &&
                                  'ramco_id' in selectedPurchase.requestor &&
                                  (selectedPurchase.requestor as any).ramco_id === formData.pic
                                ) {
                                  fullName = (selectedPurchase.requestor as any).full_name;
                                }
                                return fullName || formData.pic;
                              })()
                          }
                        ]
                      : employeeOptions
                }
                value={formData.pic}
                onValueChange={(val) => handleInputChange('pic', val)}
                placeholder="Select person in charge"
                emptyMessage="No employees"
                disabled={employeesLoading}
                clearable={true}
              />
              {validationErrors.pic && (
                <p className="text-red-500 text-sm mt-1">{validationErrors.pic}</p>
              )}
            </div>

            <div>
              <Label htmlFor="type_id">Item Type *</Label>
              <Combobox
                options={typeOptions}
                value={formData.type_id}
                onValueChange={(val) => handleInputChange('type_id', val)}
                placeholder="Select item type"
                emptyMessage="No types"
                disabled={typesLoading}
                clearable={true}
              />
              {validationErrors.type_id && (
                <p className="text-red-500 text-sm mt-1">{validationErrors.type_id}</p>
              )}
            </div>

            <div>
              <Label htmlFor="category_id">Category</Label>
              <Combobox
                options={categoryOptions}
                value={formData.category_id || ''}
                onValueChange={(val) => handleInputChange('category_id', val)}
                placeholder={formData.type_id ? 'Select category' : 'Select item type first'}
                emptyMessage={formData.type_id ? 'No categories found' : 'Select item type first'}
                disabled={categoriesLoading || !formData.type_id}
                clearable={true}
              />
            </div>

            <div>
              <Label htmlFor="items">Description *</Label>
              <Textarea
                id="items"
                value={formData.items}
                onChange={(e) => handleInputChange('items', e.target.value)}
                placeholder="Enter item description"
                rows={3}
              />
              {validationErrors.items && (
                <p className="text-red-500 text-sm mt-1">{validationErrors.items}</p>
              )}
            </div>

            <div>
              <Label htmlFor="purpose">Purpose</Label>
              <Textarea
                id="purpose"
                value={formData.purpose || ''}
                onChange={(e) => handleInputChange('purpose', e.target.value)}
                placeholder="Enter purpose/remarks"
                rows={2}
              />
            </div>

            {/* Brand moved to Pricing & Order Information card */}
          </CardContent>
        </Card>

        {/* Pricing Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <Package className="mr-2 h-5 w-5" />
              Pricing & Order Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">

            <div>
              <Label htmlFor="qty">Quantity *</Label>
              <Input
                id="qty"
                type="number"
                min="1"
                value={formData.qty || ''}
                onChange={(e) => handleInputChange('qty', parseInt(e.target.value) || 0)}
                placeholder="Enter quantity"
              />
              {validationErrors.qty && (
                <p className="text-red-500 text-sm mt-1">{validationErrors.qty}</p>
              )}
            </div>

            <div>
              <Label htmlFor="unit_price">Unit Price (RM) *</Label>
              <Input
                id="unit_price"
                type="number"
                step="0.01"
                min="0.01"
                value={formData.unit_price || ''}
                onChange={(e) => handleInputChange('unit_price', parseFloat(e.target.value) || 0)}
                placeholder="Enter unit price"
              />
              {validationErrors.unit_price && (
                <p className="text-red-500 text-sm mt-1">{validationErrors.unit_price}</p>
              )}
            </div>

            <div>
              <Label>Total Amount</Label>
              <div className="text-2xl font-bold text-green-600">
                RM {fmtRM(calculatedTotal)}
              </div>
            </div>

            <div>
              <Label htmlFor="supplier">Supplier *</Label>
              <Combobox
                options={[...supplierOptions, { value: '__add_supplier__', label: 'Add new supplier…' }]}
                value={formData.supplier_id}
                onValueChange={(val) => {
                  if (val === '__add_supplier__') { setAddingSupplier(true); return; }
                  setAddingSupplier(false);
                  handleInputChange('supplier_id', val)
                }}
                placeholder="Select supplier"
                emptyMessage="No suppliers"
                disabled={suppliersLoading}
                clearable={true}
              />
              {validationErrors.supplier_id && (
                <p className="text-red-500 text-sm mt-1">{validationErrors.supplier_id}</p>
              )}
              {addingSupplier && (
                <div className="relative mt-2">
                  <Input
                    value={newSupplierName}
                    onChange={(e) => setNewSupplierName(e.target.value)}
                    placeholder="Enter new supplier name"
                    disabled={creatingSupplier}
                    className="pr-10"
                  />
                  <Button
                    size="icon"
                    type="button"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                    onClick={async () => {
                      const name = newSupplierName.trim();
                      if (!name) { toast.error('Supplier name is required'); return; }
                      try {
                        setCreatingSupplier(true);
                        const res = await authenticatedApi.post('/api/purchases/suppliers', { name });
                        const created: any = (res as any).data || {};
                        const newId = created.id || created.data?.id || created.insertId || created.lastId || name;
                        const option = { value: String(newId), label: name };
                        setSuppliers(prev => [...prev, { id: newId, name }]);
                        setSupplierOptions(prev => [...prev, option]);
                        setFormData(prev => ({ ...prev, supplier_id: String(newId) }));
                        setNewSupplierName('');
                        setAddingSupplier(false);
                        toast.success('Supplier created');
                      } catch (err) {
                        toast.error('Failed to create supplier');
                        console.error('Create supplier error', err);
                      } finally {
                        setCreatingSupplier(false);
                      }
                    }}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="brand">Brand</Label>
              <Combobox
                options={[...brandOptions, { value: '__add_brand__', label: 'Add new brand…' }]}
                value={formData.brand_id}
                onValueChange={(val) => {
                  if (val === '__add_brand__') { setAddingBrand(true); return; }
                  setAddingBrand(false);
                  handleInputChange('brand_id', val);
                }}
                placeholder={formData.type_id ? 'Select brand' : 'Select item type first'}
                emptyMessage={formData.type_id ? 'No brands found' : 'Select item type first'}
                disabled={brandsLoading || !formData.type_id}
                clearable={true}
              />
              {addingBrand && (
                <div className="relative mt-2">
                  <Input
                    value={newBrandName}
                    onChange={(e) => setNewBrandName(e.target.value)}
                    placeholder="Enter new brand name"
                    disabled={!formData.type_id || creatingBrand}
                    className="pr-10"
                  />
                  <Button
                    size="icon"
                    type="button"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                    onClick={async () => {
                      if (!formData.type_id) { toast.error('Select item type first'); return; }
                      const name = newBrandName.trim();
                      if (!name) { toast.error('Brand name is required'); return; }
                      try {
                        setCreatingBrand(true);
                        const res = await authenticatedApi.post('/api/assets/brands', { name, type_id: Number(formData.type_id) });
                        const created: any = (res as any).data || {};
                        const newId = created.id || created.data?.id || created.code || name;
                        const option = { value: String(newId), label: name };
                        setBrands(prev => [...prev, { id: newId, name }]);
                        setBrandOptions(prev => [...prev, option]);
                        setFormData(prev => ({ ...prev, brand_id: String(newId) }));
                        setNewBrandName('');
                        setAddingBrand(false);
                        toast.success('Brand created');
                      } catch (err) {
                        toast.error('Failed to create brand');
                        console.error('Create brand error', err);
                      } finally {
                        setCreatingBrand(false);
                      }
                    }}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="po_no">PO Number *</Label>
              <Input
                id="po_no"
                value={formData.po_no}
                onChange={(e) => handleInputChange('po_no', e.target.value)}
                placeholder="Enter PO number"
              />
              {validationErrors.po_no && (
                <p className="text-red-500 text-sm mt-1">{validationErrors.po_no}</p>
              )}
            </div>

            <div>
              <Label htmlFor="po_no">PO Date *</Label>
              <Input
                id="po_date"
                type="date"
                value={formData.po_date}
                onChange={(e) => handleInputChange('po_date', e.target.value)}
                placeholder="Enter PO date"
              />
              {validationErrors.po_date && (
                <p className="text-red-500 text-sm mt-1">{validationErrors.po_date}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Purchase Order & Delivery Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            <span className="flex items-center"><Truck className="mr-2 h-5 w-5" />Delivery Information</span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const nextIdx = (formData.deliveries?.length || 0);
                // Validate the current last delivery before adding a new one
                if (nextIdx > 0) {
                  const last = formData.deliveries![nextIdx - 1];
                  const started = !!(last.do_date || last.do_no || last.inv_date || last.inv_no || last.grn_date || last.grn_no || deliveryFiles[nextIdx - 1]);
                  if (started && (!last.do_date || !last.do_no)) {
                    setDeliveryErrors(prev => {
                      const arr = [...prev];
                      arr[nextIdx - 1] = { ...(arr[nextIdx - 1] || {}), do_date: (!last.do_date ? 'DO date is required' : undefined) as any, do_no: (!last.do_no ? 'DO number is required' : undefined) as any };
                      return arr;
                    });
                    toast.error('Complete DO date and number for current delivery before adding another.');
                    return;
                  }
                }
                if (nextIdx >= maxDeliveries) {
                  toast.error(`Cannot add more than ${maxDeliveries} deliveries for quantity ${formData.qty}.`);
                  return;
                }
                setFormData(prev => ({
                  ...prev,
                  deliveries: [
                    ...(prev.deliveries || []),
                    { do_date: '', do_no: '', inv_date: '', inv_no: '', grn_date: '', grn_no: '' }
                  ]
                }));
                setDeliveryErrors(prev => ([...prev, {}]));
                setDeliveryFiles(prev => ([...prev, null]));
                setActiveDeliveryTab(`delivery-${nextIdx}`);
              }}
              className="gap-2"
              disabled={(formData.deliveries?.length || 0) >= maxDeliveries || maxDeliveries === 0}
            >
              <Plus className="h-4 w-4" /> Add Delivery
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-3 text-xs text-gray-500">
            {(formData.deliveries?.length || 0)} of {maxDeliveries} deliveries used (max 5)
          </div>
          {(() => {
            const duplicateIndices = findDuplicateDeliveries();
            const partialDuplicates = findPartialDuplicates();
            const deliveryCount = formData.deliveries?.length || 0;
            const itemQty = formData.qty || 0;
            const isOverDelivery = deliveryCount > itemQty;
            
            const hasAnyWarnings = duplicateIndices.length > 0 || partialDuplicates.indices.length > 0 || isOverDelivery;
            
            if (!hasAnyWarnings) return null;
            
            return (
              <div className="mb-3 space-y-2">
                {/* Exact Duplicates Warning */}
                {duplicateIndices.length > 0 && (
                  <div className="p-2 bg-red-50 border border-red-200 rounded">
                    <p className="text-red-800 text-sm font-medium">
                      🚨 {duplicateIndices.length} exact duplicate {duplicateIndices.length === 1 ? 'delivery' : 'deliveries'} detected
                    </p>
                    <p className="text-red-600 text-xs">
                      Deliveries with identical DO date, DO number, invoice date, and invoice number.
                    </p>
                  </div>
                )}
                
                {/* Partial Duplicates Warning */}
                {partialDuplicates.indices.length > 0 && (
                  <div className="p-2 bg-yellow-50 border border-yellow-200 rounded">
                    <p className="text-yellow-800 text-sm font-medium">
                      ⚠️ Potential duplicate entries detected: {partialDuplicates.details.join(', ')}
                    </p>
                    <p className="text-yellow-600 text-xs">
                      Same DO/Invoice/GRN numbers but different dates. Please verify if these are separate deliveries or data entry errors.
                    </p>
                  </div>
                )}
                
                {/* Over-delivery Warning */}
                {isOverDelivery && (
                  <div className="p-2 bg-orange-50 border border-orange-200 rounded">
                    <p className="text-orange-800 text-sm font-medium">
                      📦 Over-delivery detected: {deliveryCount} deliveries for {itemQty} {itemQty === 1 ? 'item' : 'items'}
                    </p>
                    <p className="text-orange-600 text-xs">
                      You have more delivery records than the item quantity. Please verify if this is correct.
                    </p>
                  </div>
                )}
              </div>
            );
          })()}
          <Tabs value={activeDeliveryTab} onValueChange={setActiveDeliveryTab}>
            <TabsList className="flex flex-wrap gap-1">
              {(() => {
                const duplicateIndices = findDuplicateDeliveries();
                const partialDuplicates = findPartialDuplicates();
                console.log('Rendering tabs, duplicate indices:', duplicateIndices);
                console.log('Rendering tabs, partial duplicate indices:', partialDuplicates.indices);
                return (formData.deliveries || []).map((_, idx) => {
                  const isExactDuplicate = duplicateIndices.includes(idx);
                  const isPartialDuplicate = partialDuplicates.indices.includes(idx);
                  const isDuplicate = isExactDuplicate || isPartialDuplicate;
                  console.log(`Tab ${idx}: isExactDuplicate = ${isExactDuplicate}, isPartialDuplicate = ${isPartialDuplicate}`);
                  
                  const tabStyle = isExactDuplicate 
                    ? 'bg-red-100 text-red-800 border-2 border-red-400' 
                    : isPartialDuplicate 
                    ? 'bg-yellow-100 text-yellow-800 border-2 border-yellow-400' 
                    : '';
                  
                  const warningIcon = isExactDuplicate ? '🚨' : isPartialDuplicate ? '⚠️' : '';
                  const warningTitle = isExactDuplicate 
                    ? 'Exact duplicate delivery detected' 
                    : isPartialDuplicate 
                    ? 'Potential duplicate delivery detected' 
                    : '';
                  
                  return (
                    <div key={`delivery-tab-wrapper-${idx}`} className="flex items-center gap-1">
                      <TabsTrigger 
                        value={`delivery-${idx}`}
                        className={tabStyle}
                      >
                        Delivery {idx + 1}
                        {isDuplicate && (
                          <span className="ml-1 text-sm" title={warningTitle}>{warningIcon}</span>
                        )}
                      </TabsTrigger>
                      {isDuplicate && (
                        <Trash2
                          className="h-4 w-4 cursor-pointer text-red-600 hover:text-red-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            const confirmMessage = isExactDuplicate
                              ? `Delete duplicate Delivery ${idx + 1}? This action cannot be undone.`
                              : `Delete potential duplicate Delivery ${idx + 1}? Please verify this is correct. This action cannot be undone.`;
                            setPendingDelete({ index: idx, message: confirmMessage });
                          }}
                          aria-label={`Delete ${isExactDuplicate ? 'duplicate' : 'potential duplicate'} Delivery ${idx + 1}`}
                        />
                      )}
                    </div>
                  );
                });
              })()
              }
            </TabsList>
            {(formData.deliveries || []).map((d, idx) => {
              const duplicateIndices = findDuplicateDeliveries();
              const partialDuplicates = findPartialDuplicates();
              const isExactDuplicate = duplicateIndices.includes(idx);
              const isPartialDuplicate = partialDuplicates.indices.includes(idx);
              const isDuplicate = isExactDuplicate || isPartialDuplicate;
              
              return (
                <TabsContent key={`delivery-content-${idx}`} value={`delivery-${idx}`} className="mt-4">
                  {/* Removed in-content duplicate warning; using tablist icon + AlertDialog */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor={`do_date_${idx}`}>DO Date</Label>
                    <Input
                      id={`do_date_${idx}`}
                      type="date"
                      value={d.do_date}
                      onChange={(e) => updateDeliveryField(idx, 'do_date', e.target.value)}
                    />
                    {deliveryErrors[idx]?.do_date && (
                      <p className="text-red-500 text-xs mt-1">{deliveryErrors[idx]?.do_date}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor={`do_no_${idx}`}>DO Number</Label>
                    <Input
                      id={`do_no_${idx}`}
                      value={d.do_no}
                      onChange={(e) => updateDeliveryField(idx, 'do_no', e.target.value)}
                      placeholder="Enter DO number"
                    />
                    {deliveryErrors[idx]?.do_no && (
                      <p className="text-red-500 text-xs mt-1">{deliveryErrors[idx]?.do_no}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor={`inv_date_${idx}`}>Invoice Date</Label>
                    <Input
                      id={`inv_date_${idx}`}
                      type="date"
                      value={d.inv_date}
                      onChange={(e) => updateDeliveryField(idx, 'inv_date', e.target.value)}
                    />
                    {deliveryErrors[idx]?.inv_date && (
                      <p className="text-red-500 text-xs mt-1">{deliveryErrors[idx]?.inv_date}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor={`inv_no_${idx}`}>Invoice Number</Label>
                    <Input
                      id={`inv_no_${idx}`}
                      value={d.inv_no}
                      onChange={(e) => updateDeliveryField(idx, 'inv_no', e.target.value)}
                      placeholder="Enter invoice number"
                    />
                    {deliveryErrors[idx]?.inv_no && (
                      <p className="text-red-500 text-xs mt-1">{deliveryErrors[idx]?.inv_no}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor={`grn_date_${idx}`}>GRN Date</Label>
                    <Input
                      id={`grn_date_${idx}`}
                      type="date"
                      value={d.grn_date}
                      onChange={(e) => updateDeliveryField(idx, 'grn_date', e.target.value)}
                    />
                    {deliveryErrors[idx]?.grn_date && (
                      <p className="text-red-500 text-xs mt-1">{deliveryErrors[idx]?.grn_date}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor={`grn_no_${idx}`}>GRN Number</Label>
                    <Input
                      id={`grn_no_${idx}`}
                      value={d.grn_no}
                      onChange={(e) => updateDeliveryField(idx, 'grn_no', e.target.value)}
                      placeholder="Enter GRN number"
                    />
                    {deliveryErrors[idx]?.grn_no && (
                      <p className="text-red-500 text-xs mt-1">{deliveryErrors[idx]?.grn_no}</p>
                    )}
                  </div>
                </div>
                {/* PDF upload area for this delivery */}
                <div className="md:col-span-2">
                  {/* Existing uploaded document preview */}
                  {((formData.deliveries?.[idx]?.upload_url) && !deliveryFiles[idx]) && (
                    <div className="mb-3 flex items-center justify-between rounded border bg-gray-50 px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded bg-red-100 text-red-600">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="text-sm font-medium">Uploaded document</div>
                          <a
                            href={String(formData.deliveries[idx].upload_url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline"
                          >
                            {String(formData.deliveries[idx].upload_url)}
                          </a>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">PDF</div>
                    </div>
                  )}
                  <Label>Attach PDF (optional)</Label>
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => onDeliveryFileDrop(idx, e)}
                    onClick={() => fileInputRefs.current[idx]?.click()}
                    className="mt-2 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-md h-28 cursor-pointer bg-gray-50"
                  >
                    {!deliveryFiles[idx] ? (
                      <div className="text-center text-sm text-gray-600">
                        Drop PDF here or click to select
                        <div className="text-xs text-gray-400">Only .pdf files accepted</div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between w-full px-4">
                        <div className="truncate">{deliveryFiles[idx]?.name}</div>
                        <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); removeDeliveryFile(idx); }}>
                          Remove
                        </Button>
                      </div>
                    )}
                    <input
                      ref={(el) => { fileInputRefs.current[idx] = el; }}
                      type="file"
                      accept="application/pdf"
                      className="hidden"
                      onChange={(e) => onDeliveryFileSelect(idx, e)}
                    />
                  </div>
                </div>
                {idx > 0 && (
                  <div className="mt-4 flex justify-end">
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        const arr = [...(formData.deliveries || [])];
                        arr.splice(idx, 1);
                        setFormData(prev => ({ ...prev, deliveries: arr }));
                        setDeliveryFiles(prev => { const nf = [...prev]; nf.splice(idx, 1); return nf; });
                        const newIdx = Math.max(0, idx - 1);
                        setActiveDeliveryTab(`delivery-${newIdx}`);
                      }}
                    >
                      Remove Delivery
                    </Button>
                  </div>
                )}
              </TabsContent>
              );
            })}
          </Tabs>
        </CardContent>
      </Card>

      <Separator />

      <div className="flex justify-between items-center">
        <div>
          {sidebarMode === 'edit' && selectedPurchase?.id && canDelete ? (
            <Button
              type="button"
              variant="destructive"
              onClick={() => handleDelete(selectedPurchase.id!)}
              disabled={loading}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </Button>
          ) : null}
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={closeSidebar}>
          Cancel
          </Button>
          <Button onClick={() => setShowSubmitConfirm(true)} disabled={loading}>
          {loading ? 'Saving...' : sidebarMode === 'edit' ? 'Update Purchase' : 'Create Purchase'}
          </Button>
        </div>
      </div>

      {/* Confirmation dialog before form submit */}
      <AlertDialog open={showSubmitConfirm} onOpenChange={open => { if (!open) setShowSubmitConfirm(false); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{sidebarMode === 'edit' ? 'Confirm Update' : 'Confirm Create'}</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogDescription>
            <div className="text-sm">Are you sure you want to {sidebarMode === 'edit' ? 'update' : 'create'} this purchase record? Please confirm.</div>
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button variant="secondary" size="sm">Cancel</Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button variant="default" size="sm" onClick={async () => { setShowSubmitConfirm(false); await handleSubmit(); }}>Confirm</Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmation dialog before deleting a delivery */}
      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => { if (!open) setPendingDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Delete</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogDescription>
            <div className="text-sm">{pendingDelete?.message || 'Are you sure you want to delete this delivery?'}</div>
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button variant="secondary" size="sm">Cancel</Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                variant="destructive"
                size="sm"
                onClick={async () => {
                  if (pendingDelete?.index != null) {
                    await deleteDelivery(pendingDelete.index);
                  }
                  setPendingDelete(null);
                }}
              >
                Delete
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );

  // Render view content
  const renderViewContent = () => {
    if (!selectedPurchase) return null;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold">{selectedPurchase.description || selectedPurchase.items}</h3>
            <p className="text-gray-600">Purchase Record #{selectedPurchase.id}</p>
          </div>
          <Badge variant={getStatusVariant(selectedPurchase) as any} className="text-sm">
            {getStatusText(selectedPurchase)}
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Request Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-sm font-medium text-gray-600">Request Type</Label>
                <div className="mt-1">
                  <span className={getRequestTypeBadgeClass(selectedPurchase.request?.request_type || (selectedPurchase as any).request_type) + ' inline-flex items-center px-2 py-0.5 rounded-full'}>
                            {selectedPurchase.request?.request_type || (selectedPurchase as any).request_type}
                  </span>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">Cost Center</Label>
                <p className="font-medium">{selectedPurchase.request?.costcenter?.name || (typeof selectedPurchase.costcenter === 'string' ? selectedPurchase.costcenter : (selectedPurchase.costcenter as any)?.name || '')}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">PIC</Label>
                <p className="font-medium">
                  {selectedPurchase.request?.requested_by?.ramco_id && selectedPurchase.request?.requested_by?.full_name
                    ? `${selectedPurchase.request.requested_by.ramco_id} - ${selectedPurchase.request.requested_by.full_name}`
                    : (typeof selectedPurchase.requestor === 'string' ? selectedPurchase.requestor : (selectedPurchase.requestor?.ramco_id && selectedPurchase.requestor?.full_name ? `${selectedPurchase.requestor.ramco_id} - ${selectedPurchase.requestor.full_name}` : (selectedPurchase.requestor?.full_name || '')))
                  }
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">Item Type</Label>
                <p className="font-medium">{typeof selectedPurchase.type === 'string' ? selectedPurchase.type : (selectedPurchase.type?.name || '')}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">Supplier</Label>
                <p className="font-medium">{typeof selectedPurchase.supplier === 'string' ? selectedPurchase.supplier : (selectedPurchase.supplier?.name || '')}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">Brand</Label>
                <p className="font-medium">{typeof selectedPurchase.brand === 'string' ? selectedPurchase.brand : (selectedPurchase.brand?.name || 'N/A')}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Pricing Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-sm font-medium text-gray-600">Quantity</Label>
                <p className="font-medium">{selectedPurchase.qty}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">Unit Price</Label>
                <p className="font-medium">RM {parseFloat(selectedPurchase.unit_price).toFixed(2)}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">Total Amount</Label>
                <p className="text-xl font-bold text-green-600">RM {(selectedPurchase.qty * parseFloat(selectedPurchase.unit_price)).toFixed(2)}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Purchase Process Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            {Array.isArray((selectedPurchase as any).deliveries) && (selectedPurchase as any).deliveries.length > 1 ? (
              <Tabs defaultValue={`vdelivery-0`}>
                <TabsList className="flex flex-wrap">
                  {((selectedPurchase as any).deliveries as any[]).map((_: any, idx: number) => (
                    <TabsTrigger key={`vdelivery-tab-${idx}`} value={`vdelivery-${idx}`}>Delivery {idx + 1}</TabsTrigger>
                  ))}
                </TabsList>
                {((selectedPurchase as any).deliveries as any[]).map((d: any, idx: number) => (
                  <TabsContent key={`vdelivery-content-${idx}`} value={`vdelivery-${idx}`} className="mt-4">
                    <div className="space-y-4">
                      {(selectedPurchase.request?.pr_date || selectedPurchase.pr_date) && (
                        <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                          <div>
                            <p className="font-medium">Request Date</p>
                            <p className="text-sm text-gray-600">PR: {selectedPurchase.request?.pr_no || selectedPurchase.pr_no || 'N/A'}</p>
                          </div>
                          <p className="font-medium">{new Date(selectedPurchase.request?.pr_date || selectedPurchase.pr_date as any).toLocaleDateString('en-GB')}</p>
                        </div>
                      )}
                      {selectedPurchase.po_date && (
                        <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                          <div>
                            <p className="font-medium">Purchase Order</p>
                            <p className="text-sm text-gray-600">PO: {selectedPurchase.po_no || 'N/A'}</p>
                          </div>
                          <p className="font-medium">{new Date(selectedPurchase.po_date).toLocaleDateString('en-GB')}</p>
                        </div>
                      )}
                      {(d?.do_date || d?.do_no) && (
                        <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                          <div>
                            <p className="font-medium">Delivery Order</p>
                            <p className="text-sm text-gray-600">DO: {d?.do_no || 'N/A'}</p>
                          </div>
                          <p className="font-medium">{d?.do_date ? new Date(d.do_date).toLocaleDateString('en-GB') : ''}</p>
                        </div>
                      )}
                      {(d?.inv_date || d?.inv_no) && (
                        <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                          <div>
                            <p className="font-medium">Handover</p>
                            <p className="text-sm text-gray-600">Handover: {d?.inv_no || 'N/A'}</p>
                          </div>
                          <p className="font-medium">{d?.inv_date ? new Date(d.inv_date).toLocaleDateString('en-GB') : ''}</p>
                        </div>
                      )}
                      {(d?.grn_date || d?.grn_no) && (
                        <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                          <div>
                            <p className="font-medium">Goods Receipt Note</p>
                            <p className="text-sm text-gray-600">GRN: {d?.grn_no || 'N/A'}</p>
                          </div>
                          <p className="font-medium">{d?.grn_date ? new Date(d.grn_date).toLocaleDateString('en-GB') : ''}</p>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            ) : (
              <div className="space-y-4">
                {(selectedPurchase.request?.pr_date || selectedPurchase.pr_date) && (
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                    <div>
                      <p className="font-medium">Request Date</p>
                      <p className="text-sm text-gray-600">PR: {selectedPurchase.request?.pr_no || selectedPurchase.pr_no || 'N/A'}</p>
                    </div>
                    <p className="font-medium">{new Date(selectedPurchase.request?.pr_date || selectedPurchase.pr_date as any).toLocaleDateString('en-GB')}</p>
                  </div>
                )}
                {selectedPurchase.po_date && (
                  <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                    <div>
                      <p className="font-medium">Purchase Order</p>
                      <p className="text-sm text-gray-600">PO: {selectedPurchase.po_no || 'N/A'}</p>
                    </div>
                    <p className="font-medium">{new Date(selectedPurchase.po_date).toLocaleDateString('en-GB')}</p>
                  </div>
                )}
                {selectedPurchase.do_date && (
                  <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                    <div>
                      <p className="font-medium">Delivery Order</p>
                      <p className="text-sm text-gray-600">DO: {selectedPurchase.do_no || 'N/A'}</p>
                    </div>
                    <p className="font-medium">{new Date(selectedPurchase.do_date).toLocaleDateString('en-GB')}</p>
                  </div>
                )}
                {selectedPurchase.inv_date && (
                  <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                    <div>
                      <p className="font-medium">Handover</p>
                      <p className="text-sm text-gray-600">Handover: {selectedPurchase.inv_no || 'N/A'}</p>
                    </div>
                    <p className="font-medium">{new Date(selectedPurchase.inv_date).toLocaleDateString('en-GB')}</p>
                  </div>
                )}
                {selectedPurchase.grn_date && (
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <div>
                      <p className="font-medium">Goods Receipt Note</p>
                      <p className="text-sm text-gray-600">GRN: {selectedPurchase.grn_no || 'N/A'}</p>
                    </div>
                    <p className="font-medium">{new Date(selectedPurchase.grn_date).toLocaleDateString('en-GB')}</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={() => openSidebar('edit', selectedPurchase)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Purchase
          </Button>
          <Button variant="outline" onClick={closeSidebar}>
            Close
          </Button>
        </div>
      </div>
    );
  };

  // Get sidebar content based on mode
  const getSidebarContent = () => {
    switch (sidebarMode) {
      case 'view':
        return renderViewContent();
      case 'create':
      case 'edit':
        return renderFormContent();
      default:
        return null;
    }
  };

  const getSidebarTitle = () => {
    switch (sidebarMode) {
      case 'view':
        return 'View Purchase Record';
      case 'create':
        return 'Create New Purchase Record';
      case 'edit':
        return 'Edit Purchase Record';
      default:
        return 'Purchase Record';
    }
  };

  return (
    <div className="space-y-6">

      {/* Header with Search and Filters */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Purchase Records
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your purchase requests, orders, and delivery tracking
          </p>
        </div>

        <div className="flex items-center space-x-4 w-full lg:w-auto">
          {/* Search */}
          <div className="relative flex-1 lg:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search purchases..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="requested">Requested</SelectItem>
              <SelectItem value="ordered">Ordered</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="handover">Handover</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>

          {/* View Toggle */}
          <div className="flex border rounded-lg">
            <Button
              size="sm"
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              onClick={() => setViewMode('grid')}
              className="px-3"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'cards' ? 'default' : 'ghost'}
              onClick={() => setViewMode('cards')}
              className="px-3"
            >
              <Grid className="h-4 w-4" />
            </Button>
          </div>

          {/* Add Purchase */}
          <Button variant={'default'} onClick={() => openSidebar('create')}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content Area */}
      <div className="space-y-4">
        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="text-gray-600">Loading purchase records...</div>
          </div>
        )}

        {!loading && (
          <>
            {viewMode === 'grid' ? (
              <CustomDataGrid
                data={filteredPurchases}
                columns={columns}
                pagination={false}
                inputFilter={false}
                columnsVisibleOption={false}
                dataExport={true}
                onRowDoubleClick={(row: any) => openSidebar('edit', row)}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPurchases.map((purchase) => (
                  <PurchaseCard
                    key={purchase.id}
                    purchase={purchase}
                    onEdit={() => openSidebar('edit', purchase)}
                  />
                ))}
              </div>
            )}

            {!loading && filteredPurchases.length === 0 && (
              <div className="text-center py-12">
                <Package className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">
                  {purchases.length === 0 ? 'No Purchase Records' : 'No matching records'}
                </h3>
                <p className="text-gray-500 mb-4">
                  {purchases.length === 0
                    ? 'Get started by creating your first purchase record.'
                    : 'Try adjusting your search or filter criteria.'
                  }
                </p>
                {purchases.length === 0 && (
                  <div className="flex justify-center space-x-4">
                    <Button onClick={() => openSidebar('create')}>
                      <ShoppingCart className="mr-2 h-4 w-4" />
                      Create First Record
                    </Button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Action Sidebar */}
      <ActionSidebar
        isOpen={sidebarOpen}
        title={getSidebarTitle()}
        content={getSidebarContent()}
        onClose={closeSidebar}
        size="lg"
      />
    </div>
  );
};

export default PurchaseRecords;

/* 
{
"request_type": "CAPEX",
"costcenter_id": "12",
"ramco_id": "EMP123",
"type_id": "7",
"items": "Laptop 14"",
"supplier_id": "45",
"brand_id": "3",
"qty": 2,
"unit_price": "3500",
"total_price": "7000",
"pr_date": "2025-09-01",
"pr_no": "PR-001",
"po_date": "2025-09-05",
"po_no": "PO-100",
"do_date": "2025-09-20",
"do_no": "DO-002",
"inv_date": "2025-09-22",
"inv_no": "INV-002",
"grn_date": "2025-09-24",
"grn_no": "GRN-002",
"deliveries": [
{
"do_date": "2025-09-10",
"do_no": "DO-001",
"inv_date": "2025-09-12",
"inv_no": "INV-001",
"grn_date": "2025-09-14",
"grn_no": "GRN-001"
},
{
"do_date": "2025-09-20",
"do_no": "DO-002",
"inv_date": "2025-09-22",
"inv_no": "INV-002",
"grn_date": "2025-09-24",
"grn_no": "GRN-002"
}
]
}

*/
