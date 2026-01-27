/* Procurement Management Module */
'use client';
import React, { useEffect, useMemo, useState, useContext, useRef } from 'react';
import { CustomDataGrid, ColumnDef } from '@/components/ui/DataGrid';
import { useRouter } from 'next/navigation';
// Purchase dashboard is shown in the parent tabs component
import PurchaseCard from './purchase-card';
import PurchaseRegisterForm from './purchase-register-form';
import { Plus, ShoppingCart, Package, Grid, List, Search, PlusCircle, Mail, Pencil, Upload, CircleAlert, TriangleAlert } from 'lucide-react';
import type { ComboboxOption } from '@/components/ui/combobox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { authenticatedApi } from '@/config/api';
import { AuthContext } from '@/store/AuthContext';
import { ApiPurchase, FlatPurchase, PurchaseFormData } from './types';
import ExcelPurchaseItems from './excel-purchase-items';
import { deriveAssetStatus, flattenPurchase } from './purchase-normalizer';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
// import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
// Removed Excel importer – creating records directly in-app

// Format number for RM display: thousand separators + 2 decimals
const fmtRM = (value: number) => {
  return Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Users allowed to delete purchase records
const deletePermissionAdmin = ['000705', '000277'];
const importPermissionAdmin = ['000277'];

interface PurchaseRecordsProps {
  filters?: { type?: string; request_type?: string };
  initialFormMode?: 'create' | 'edit';
  initialPurchaseId?: number | string;
  inlineFormOnly?: boolean;
}

const PurchaseRecords: React.FC<PurchaseRecordsProps> = ({ filters, initialFormMode, initialPurchaseId, inlineFormOnly }) => {
  const router = useRouter();
  const [purchases, setPurchases] = useState<FlatPurchase[]>([]);
  const [filteredPurchases, setFilteredPurchases] = useState<FlatPurchase[]>([]);
  const [loading, setLoading] = useState(false);
  const [sidebarMode, setSidebarMode] = useState<'view' | 'create' | 'edit'>('create');
  const [selectedPurchase, setSelectedPurchase] = useState<ApiPurchase | null>(null);
  const [showInlineForm, setShowInlineForm] = useState<boolean>(!!initialFormMode || !!inlineFormOnly);
  const [viewMode, setViewMode] = useState<'grid' | 'cards'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [resendingId, setResendingId] = useState<string | null>(null);
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
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  // Delivery deletion confirm dialog state
  const [pendingDelete, setPendingDelete] = useState<{ index: number; message: string } | null>(null);
  const [importing, setImporting] = useState(false);
  const draftKey = 'purchase_register_draft';
  const draftLoadedRef = useRef(false);
  const formDataRef = useRef(formData);

  // Per-delivery file uploads
  const [deliveryFiles, setDeliveryFiles] = useState<Array<File | null>>([]);
  const fileInputRefs = React.useRef<Array<HTMLInputElement | null>>([]);

  // Status summary (undelivered / unregistered / handed over)
  const statusSummary = useMemo(() => {
    const counts = { undelivered: 0, unregistered: 0, registered: 0 };
    purchases.forEach(p => {
      const status = p.status || deriveAssetStatus(p);
      if (status === 'registered') counts.registered += 1;
      else if (status === 'unregistered') counts.unregistered += 1;
      else counts.undelivered += 1;
    });
    const total = purchases.length || 1;
    const pct = (n: number) => ((n / total) * 100).toFixed(0);
    return {
      ...counts,
      total: purchases.length,
      pctRegistered: pct(counts.registered),
      pctUnregistered: pct(counts.unregistered),
      pctUndelivered: pct(counts.undelivered)
    };
  }, [purchases]);

  // Ensure grid rows always include the derived status for filtering
  const gridData = useMemo(() => {
    return filteredPurchases.map(p => {
      const status = (p as any).status || deriveAssetStatus(p);
      return { ...p, status };
    });
  }, [filteredPurchases]);

  const handleSummaryClick = (key: 'undelivered' | 'unregistered' | 'registered') => {
    setStatusFilter(prev => (prev === key ? 'all' : key));
  };

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
  const canImport = useMemo(() => importPermissionAdmin.includes(getUsername()), [auth?.authData?.user?.username]);

  // Load purchases whenever username becomes available/changes
  useEffect(() => {
    const uname = getUsername();
    loadPurchases(uname);

  }, [auth?.authData?.user?.username]);

  useEffect(() => {
    formDataRef.current = formData;
  }, [formData]);

  // Auto-open inline form when rendered from register route
  useEffect(() => {
    if (initialFormMode === 'create') {
      startInlineForm('create');
    } else if (initialFormMode === 'edit' && initialPurchaseId) {
      startInlineForm('edit', initialPurchaseId);
    }
   
  }, [initialFormMode, initialPurchaseId]);

  // Load draft on mount for create mode to survive refresh
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (draftLoadedRef.current) return;
    if (!showInlineForm || sidebarMode !== 'create') return;
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) {
        const draft = JSON.parse(raw);
        setFormData(draft);
      }
      draftLoadedRef.current = true;
    } catch {
      // ignore parse/storage errors
    }
  }, [showInlineForm, sidebarMode]);

  // Persist draft for create mode so refresh won't lose data
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (sidebarMode !== 'create' || !showInlineForm) return;
    if (!draftLoadedRef.current) return;
    try {
      localStorage.setItem(draftKey, JSON.stringify(formData));
    } catch {
      // ignore storage errors
    }
  }, [formData, sidebarMode, showInlineForm]);

  useEffect(() => {
    return () => {
      if (typeof window === 'undefined') return;
      if (sidebarMode !== 'create') return;
      try {
        localStorage.setItem(draftKey, JSON.stringify(formDataRef.current));
      } catch {
        // ignore storage errors
      }
    };
   
  }, []);

  // If rendered in register page, open form immediately
  useEffect(() => {
    if (initialFormMode === 'create') {
      startInlineForm('create');
    } else if (initialFormMode === 'edit' && initialPurchaseId) {
      startInlineForm('edit', initialPurchaseId);
    }
   
  }, [initialFormMode, initialPurchaseId]);

  // Filter purchases based on search and status
  useEffect(() => {
    let filtered = purchases;

    // Apply external filters passed from summary
    if (filters?.type) {
      filtered = filtered.filter(p => {
        const typeName = p.type_name || (typeof p.type === 'string' ? p.type : (p.type && (p.type as any).name) || '');
        return String(typeName) === String(filters.type);
      });
    }
    if (filters?.request_type) {
      filtered = filtered.filter(p => (p.request_type || p.request?.request_type || (p as any).request_type) === filters.request_type);
    }

    // Apply search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(purchase => {
        const supplier = purchase.supplier_name || (typeof purchase.supplier === 'string' ? purchase.supplier : (purchase.supplier?.name || ''));
        const cc = purchase.costcenter_name || purchase.request?.costcenter?.name || (typeof purchase.costcenter === 'string' ? purchase.costcenter : (purchase.costcenter as any)?.name || '');
        const brand = purchase.brand_name || (typeof purchase.brand === 'string' ? purchase.brand : (purchase.brand?.name || ''));
        const prNo = purchase.pr_no ? String(purchase.pr_no) : (purchase.request?.pr_no ? String(purchase.request.pr_no) : '');
        const poNo = purchase.po_no ? String(purchase.po_no) : '';
        const desc = purchase.description || purchase.items || '';
        const requesterName = purchase.pic || purchase.request?.requested_by?.full_name || '';
        const requesterId = purchase.request?.requested_by?.ramco_id || '';
        const requestorLoose = typeof purchase.requestor === 'string' ? purchase.requestor : (purchase.requestor?.full_name || '');
        return (
          desc.toLowerCase().includes(q) ||
          supplier.toLowerCase().includes(q) ||
          cc.toLowerCase().includes(q) ||
          brand.toLowerCase().includes(q) ||
          prNo.toLowerCase().includes(q) ||
          poNo.toLowerCase().includes(q) ||
          requesterName.toLowerCase().includes(q) ||
          requesterId.toLowerCase().includes(q) ||
          requestorLoose.toLowerCase().includes(q)
        );
      });
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(purchase => {
        const status = purchase.status || deriveAssetStatus(purchase);
        return status === statusFilter;
      });
    }

    setFilteredPurchases(filtered);
  }, [purchases, searchQuery, statusFilter, filters]);

  const loadPurchases = async (managerUsername?: string) => {
    setLoading(true);
    try {
      const url = managerUsername
        ? `/api/purchases?managers=${encodeURIComponent(managerUsername)}`
        : '/api/purchases';
      const response = await authenticatedApi.get<{ data: ApiPurchase[] }>(url);
      const raw = response.data?.data || [];
      const normalized = raw.map((p: any) => flattenPurchase(p as ApiPurchase));
      setPurchases(normalized);
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

  const handleSupplierSelect = (val: string) => {
    if (val === '__add_supplier__') {
      setAddingSupplier(true);
      return;
    }
    setAddingSupplier(false);
    handleInputChange('supplier_id', val);
  };

  const handleCreateSupplier = async () => {
    const name = newSupplierName.trim();
    if (!name) {
      toast.error('Supplier name is required');
      return;
    }
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
  };

  const handleBrandSelect = (val: string) => {
    if (val === '__add_brand__') {
      setAddingBrand(true);
      handleInputChange('brand_id', '');
      return;
    }
    setAddingBrand(false);
    handleInputChange('brand_id', val);
  };

  const handleCreateBrand = async () => {
    if (!formData.type_id) {
      toast.error('Select item type first');
      return;
    }
    const name = newBrandName.trim();
    if (!name) {
      toast.error('Brand name is required');
      return;
    }
    try {
      setCreatingBrand(true);
      const res = await authenticatedApi.post('/api/assets/brands', { name, type_id: Number(formData.type_id) });
      const created: any = (res as any).data || {};
      const newIdFromResponse = created.id || created.data?.id || created.code || created.lastId;

      // Refresh brands for this type to ensure we get the saved ID
      try {
        const resBrands = await authenticatedApi.get(`/api/assets/brands?type=${formData.type_id}`);
        const dataBrands = (resBrands as any).data?.data || (resBrands as any).data || [];
        setBrands(dataBrands);
        const options = dataBrands.map((b: any) => ({ value: String(b.id ?? b.code ?? b.name), label: b.name }));
        setBrandOptions(options);

        const selectedId =
          newIdFromResponse ||
          dataBrands.find((b: any) => b.name?.toLowerCase() === name.toLowerCase())?.id;

        if (selectedId) {
          setFormData(prev => ({ ...prev, brand_id: String(selectedId) }));
        }
      } catch {
        // fallback to using the immediate response id if refresh fails
        if (newIdFromResponse) {
          const option = { value: String(newIdFromResponse), label: name };
          setBrands(prev => [...prev, { id: newIdFromResponse, name }]);
          setBrandOptions(prev => [...prev, option]);
          setFormData(prev => ({ ...prev, brand_id: String(newIdFromResponse) }));
        }
      }

      setNewBrandName('');
      toast.success('Brand created');
      setAddingBrand(false);
    } catch (err) {
      toast.error('Failed to create brand');
      console.error('Create brand error', err);
    } finally {
      setCreatingBrand(false);
    }
  };

  const addDeliverySlot = () => {
    const nextIdx = (formData.deliveries?.length || 0);
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
  };

  const removeDeliverySlot = (idx: number) => {
    const arr = [...(formData.deliveries || [])];
    arr.splice(idx, 1);
    setFormData(prev => ({ ...prev, deliveries: arr }));
    setDeliveryFiles(prev => { const nf = [...prev]; nf.splice(idx, 1); return nf; });
    setDeliveryErrors(prev => { const errs = [...prev]; errs.splice(idx, 1); return errs; });
    const newIdx = Math.max(0, idx - 1);
    setActiveDeliveryTab(`delivery-${newIdx}`);
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


  const hydrateFormFromPurchase = async (purchase?: ApiPurchase | number | string) => {
    let p: any = purchase;
    if (!p) return null;
    if (typeof p === 'number' || typeof p === 'string') {
      try {
        const res = await authenticatedApi.get(`/api/purchases/${p}`);
        p = (res as any).data?.data || (res as any).data || null;
      } catch {
        p = null;
      }
    }
    if (!p) return null;

    setSelectedPurchase(p);

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
    return p;
  };

  const startInlineForm = async (mode: 'create' | 'edit', purchase?: ApiPurchase | number | string) => {
    setSidebarMode(mode);
    setShowInlineForm(true);
    setShowSubmitConfirm(false);

    if (mode === 'create') {
      setSelectedPurchase(null);
      const blank = {
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
      };
      let draft = null;
      if (typeof window !== 'undefined') {
        try {
          const raw = localStorage.getItem(draftKey);
          draft = raw ? JSON.parse(raw) : null;
        } catch {
          draft = null;
        }
      }
      setFormData(draft || blank);
      draftLoadedRef.current = true;
      setActiveDeliveryTab('delivery-0');
      setDeliveryFiles([]);
      return;
    }

    await hydrateFormFromPurchase(purchase);
  };

  // Sidebar handlers (view only; forms now inline)
  const closeInlineForm = () => {
    setShowInlineForm(false);
    setSelectedPurchase(null);
    setValidationErrors({});
    if (inlineFormOnly) {
      router.push('/purchase');
    }
  };

  const clearDraft = () => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(draftKey);
    } catch {
      // ignore
    }
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
      closeInlineForm();
    } catch (error) {
      toast.error('Failed to import purchase records');
      console.error('Error importing purchases:', error);
    } finally {
      setLoading(false);
    }
  };

  const triggerImport = async () => {
    setImporting(true);
    try {
      await authenticatedApi.post('/api/purchases/import', {});
      toast.success('Purchase import triggered');
      loadPurchases(getUsername());
    } catch (error) {
      toast.error('Failed to import purchase records');
      console.error('Error triggering purchase import:', error);
    } finally {
      setImporting(false);
      setShowImportConfirm(false);
    }
  };

  // Get status text
  const getStatusText = (purchase: ApiPurchase) => {
    const status = (purchase as any).status || deriveAssetStatus(purchase);
    if (status === 'registered') return 'Handed Over';
    if (status === 'unregistered') return 'Unregistered';
    return 'Undelivered';
  };

  // Explain what is missing for asset registration
  const getStatusNotice = (purchase: ApiPurchase) => {
    const assetRegistry = String((purchase as any).asset_registry || '').toLowerCase();
    const deliveries = Array.isArray((purchase as any).deliveries) ? (purchase as any).deliveries : [];
    const hasDeliveries = deliveries.length > 0;
    const hasDeliveryProof = hasDeliveries && deliveries.some((d: any) => Boolean((d as any)?.upload_path));

    if (!hasDeliveries) return 'Delivery record missing';
    if (!hasDeliveryProof) return 'Purchase form not completed or upload file missing';
    if (assetRegistry !== 'completed') return 'Asset registry not completed';
    return '';
  };

  // Badge class for request type: CAPEX -> green, OPEX -> blue, others -> amber
  const getRequestTypeBadgeClass = (type?: string) => {
    const t = (type || '').toString().toUpperCase();
    if (t === 'CAPEX') return 'bg-cyan-600 text-white text-xs';
    if (t === 'OPEX') return 'bg-blue-600 text-white text-xs';
    return 'bg-amber-600 text-white text-xs';
  };

  const handleResendNotification = async (purchaseId: number | string) => {
    const id = String(purchaseId);
    try {
      setResendingId(id);
      await authenticatedApi.post(`/api/purchases/${encodeURIComponent(id)}/resend-notification`, {});
      toast.success('Notification resent');
    } catch (err) {
      console.error('Failed to resend notification', err);
      toast.error('Failed to resend notification');
    } finally {
      setResendingId(null);
    }
  };

  // Define columns for DataGrid
  const columns: ColumnDef<any>[] = [
    { key: 'id', header: 'No', sortable: true, render: (row: any) => row.id },
    // Exclude deliveries columns for now; /api/purchases list does not include them
    {
      key: 'status',
      header: 'Asset Registration',
      filter: 'singleSelect',
      filterParams: {
        options: ['undelivered', 'unregistered', 'registered'],
        labelMap: {
          undelivered: 'Undelivered',
          unregistered: 'Unregistered',
          registered: 'Handed Over'
        }
      },
      render: (row: any) => {
        const typeId = typeof row.type === 'string' ? '' : (row.type?.id || '');
        const status = (row as any).status || deriveAssetStatus(row);
        const isRegCompleted = status === 'registered';
        const disableAsset = status === 'undelivered';
        const assetLabel = isRegCompleted ? 'Handed Over' : (disableAsset ? 'Undelivered' : 'Unregistered');
        const statusNotice = getStatusNotice(row);
        return (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={isRegCompleted ? 'default' : 'outline'}
                onClick={(e) => {
                  e.stopPropagation();
                  const editParam = isRegCompleted ? '&edit=true' : '';
                  window.open(`/purchase/asset/${row.id}?type=${typeId}${editParam}`, '_blank');
                }}
                className={`h-6 px-2 ${
                  isRegCompleted
                    ? 'bg-green-600 hover:bg-green-700 text-white border-0'
                    : disableAsset
                      ? 'ring-1 ring-red-400 border-0 text-red-500 hover:bg-red-100'
                      : 'ring-1 ring-amber-500 border-0 text-amber-600 hover:bg-amber-100'
                } ${disableAsset ? 'opacity-60 cursor-not-allowed' : ''}`}
                title="Open Asset Manager"
                disabled={disableAsset}
              >
                {isRegCompleted ? <Pencil className="h-3 w-3 mr-1" /> : (!disableAsset ? <Plus className="h-3 w-3 mr-1" /> : null)}{assetLabel}
              </Button>
              <Button
                size="sm"
                variant="link"
                className="h-6 px-0 text-blue-600 hover:text-blue-700 gap-1"
                onClick={(e) => {
                  e.stopPropagation();
                  handleResendNotification(row.id);
                }}
                disabled={resendingId === String(row.id)}
              >
                <Mail className="h-4 w-4" />
                {resendingId === String(row.id) ? 'Sending...' : 'Resend'}
              </Button>
            </div>
            {statusNotice && (
              <div className="flex items-center gap-1 mt-1 text-xs text-red-600 leading-tight animate-pulse">
                <TriangleAlert className="h-4 w-4" />
                {statusNotice}
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: 'request_type',
      header: 'Request Type',
      render: (row: any) => (
        <span className={getRequestTypeBadgeClass(row.request_type || row.request?.request_type) + ' inline-flex items-center px-2 py-0.5 rounded-full'}>
          {row.request_type || row.request?.request_type}
        </span>
      ),
      filter: 'singleSelect'
    },
    {
      key: 'pr_date',
      header: 'PR Date',
      render: (row: any) => (row.pr_date ? new Date(row.pr_date).toLocaleDateString('en-GB') : (row.request?.pr_date ? new Date(row.request.pr_date).toLocaleDateString('en-GB') : ''))
    },
    { key: 'pr_no', header: 'PR Number', filter: 'input', render: (row: any) => row.pr_no || row.request?.pr_no || '' },
    {
      key: 'pic',
      header: 'Requested By',
      filter: 'input',
      render: (row: any) => {
        const r = row.pic;
        if (r) return r;
        const requestedBy = row.request?.requested_by || (typeof row.requestor === 'string' ? null : row.requestor);
        if (requestedBy && requestedBy.ramco_id && requestedBy.full_name) return `${requestedBy.ramco_id} - ${requestedBy.full_name}`;
        if (typeof row.requestor === 'string') return row.requestor;
        return requestedBy?.full_name || '';
      }
    },
    {
      key: 'costcenter',
      header: 'Cost Center',
      filter: 'singleSelect',
      render: (row: any) => row.costcenter_name || row.request?.costcenter?.name || (typeof row.costcenter === 'string' ? row.costcenter : (row.costcenter?.name || ''))
    },
    { key: 'item_type', header: 'Item Type', filter: 'singleSelect', render: (row: any) => row.type_name || (typeof row.type === 'string' ? row.type : (row.type?.name || row.item_type || '')) },
    {
      key: 'description',
      header: 'Description',
      filter: 'input',
      render: (row: any) => row.description || row.items || ''
    },
    { key: 'qty', header: 'Qty' },
    { key: 'supplier', header: 'Supplier', filter: 'singleSelect', render: (row: any) => row.supplier_name || (typeof row.supplier === 'string' ? row.supplier : (row.supplier?.name || '')) },
    { key: 'brand', header: 'Brand', filter: 'singleSelect', render: (row: any) => row.brand_name || (typeof row.brand === 'string' ? row.brand : (row.brand?.name || '')) },
    {
      key: 'unit_price',
      header: 'Unit Price (RM)',
      render: (row: any) => `RM ${fmtRM(Number(row.unit_price) || 0)}`
    },
    {
      key: 'total',
      header: 'Total (RM)',
      render: (row: any) => {
        const total = Number(row.total_amount ?? row.total_price ?? NaN);
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
    <PurchaseRegisterForm
      formData={formData}
      validationErrors={validationErrors}
      deliveryErrors={deliveryErrors}
      setValidationErrors={setValidationErrors}
      setDeliveryErrors={setDeliveryErrors}
      calculatedTotal={calculatedTotal}
      maxDeliveries={maxDeliveries}
      activeDeliveryTab={activeDeliveryTab}
      setActiveDeliveryTab={setActiveDeliveryTab}
      costcenterOptions={costcenterOptions}
      employeeOptions={employeeOptions}
      typeOptions={typeOptions}
      categoryOptions={categoryOptions}
      supplierOptions={supplierOptions}
      brandOptions={brandOptions}
      costcentersLoading={costcentersLoading}
      employeesLoading={employeesLoading}
      typesLoading={typesLoading}
      categoriesLoading={categoriesLoading}
      suppliersLoading={suppliersLoading}
      brandsLoading={brandsLoading}
      addingSupplier={addingSupplier}
      creatingSupplier={creatingSupplier}
      newSupplierName={newSupplierName}
      onSupplierSelect={handleSupplierSelect}
      onSupplierNameChange={setNewSupplierName}
      onCreateSupplier={handleCreateSupplier}
      addingBrand={addingBrand}
      setAddingBrand={setAddingBrand}
      creatingBrand={creatingBrand}
      newBrandName={newBrandName}
      onBrandSelect={handleBrandSelect}
      onBrandNameChange={setNewBrandName}
      onCreateBrand={handleCreateBrand}
      handleInputChange={handleInputChange}
      selectedPurchase={selectedPurchase}
      deliveryFiles={deliveryFiles}
      onDeliveryFileDrop={onDeliveryFileDrop}
      onDeliveryFileSelect={onDeliveryFileSelect}
      onRemoveDeliveryFile={removeDeliveryFile}
      fileInputRefs={fileInputRefs}
      updateDeliveryField={updateDeliveryField}
      findDuplicateDeliveries={findDuplicateDeliveries}
      findPartialDuplicates={findPartialDuplicates}
      onAddDelivery={addDeliverySlot}
      onRemoveDelivery={removeDeliverySlot}
      pendingDelete={pendingDelete}
      setPendingDelete={setPendingDelete}
      deleteDelivery={deleteDelivery}
      showSubmitConfirm={showSubmitConfirm}
      setShowSubmitConfirm={setShowSubmitConfirm}
      sidebarMode={sidebarMode}
      canDelete={canDelete}
      loading={loading}
      closeSidebar={closeInlineForm}
      loadPurchases={loadPurchases}
      setLoading={setLoading}
      onSubmitSuccess={clearDraft}
    />
  );

  if (showInlineForm || inlineFormOnly) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {sidebarMode === 'edit' ? 'Edit Purchase Record' : 'Create Purchase Record'}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {sidebarMode === 'edit'
                ? 'Update the purchase record details'
                : 'Create a new purchase record'}
            </p>
          </div>
          <Button variant="outline" onClick={closeInlineForm}>
            Cancel and Back to Records
          </Button>
        </div>
        {renderFormContent()}
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Status summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card
          role="button"
          tabIndex={0}
          onClick={() => handleSummaryClick('undelivered')}
          className={`cursor-pointer transition ${statusFilter === 'undelivered' ? 'ring-2 ring-red-500' : ''} bg-stone-100`}
        >
          <CardHeader className="pb-2">
            <CardDescription>Undelivered</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="flex items-baseline gap-2">
              <CardTitle className="text-2xl font-semibold">{statusSummary.undelivered}</CardTitle>
              <span className="text-sm text-muted-foreground">{statusSummary.pctUndelivered}%</span>
            </div>
            <p className="text-xs text-red-700 dark:text-red-300">No delivery record or missing delivery file</p>
          </CardContent>
        </Card>
        <Card
          role="button"
          tabIndex={0}
          onClick={() => handleSummaryClick('unregistered')}
          className={`cursor-pointer transition ${statusFilter === 'unregistered' ? 'ring-2 ring-amber-500' : ''} bg-stone-100`}
        >
          <CardHeader className="pb-2">
            <CardDescription>Unregistered</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="flex items-baseline gap-2">
              <CardTitle className="text-2xl font-semibold">{statusSummary.unregistered}</CardTitle>
              <span className="text-sm text-muted-foreground">{statusSummary.pctUnregistered}%</span>
            </div>
            <p className="text-xs text-amber-800 dark:text-amber-300">Delivered but asset registry not completed</p>
          </CardContent>
        </Card>
        <Card
          role="button"
          tabIndex={0}
          onClick={() => handleSummaryClick('registered')}
          className={`cursor-pointer transition ${statusFilter === 'registered' ? 'ring-2 ring-emerald-500' : ''} bg-stone-100`}
        >
          <CardHeader className="pb-2">
            <CardDescription>Handed Over</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="flex items-baseline gap-2">
              <CardTitle className="text-2xl font-semibold">{statusSummary.registered}</CardTitle>
              <span className="text-sm text-muted-foreground">{statusSummary.pctRegistered}%</span>
            </div>
            <p className="text-xs text-emerald-800 dark:text-emerald-300">Delivery complete and asset registry updated</p>
          </CardContent>
        </Card>
      </div>
      {/* Header with Search and Filters */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h2 className="text-lg font-semibold">
            Purchase Records
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your purchase requests, orders, and delivery tracking
          </p>
        </div>

        <div className="flex items-center space-x-4 w-full lg:w-auto">
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

          <ExcelPurchaseItems purchases={filteredPurchases} />

          {canImport && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowImportConfirm(true)}
              disabled={importing}
              className='bg-amber-200/50 border-amber-200 hover:bg-amber-200'
            >
              <Upload className="h-4 w-4" />
            </Button>
          )}

          {/* Add Purchase */}
          <Button variant={'default'} onClick={() => router.push('/purchase/register/new')}>
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
                data={gridData}
                columns={columns}
                pagination={false}
                inputFilter={false}
                columnsVisibleOption={false}
                dataExport={false}
                onRowDoubleClick={(row: any) => router.push(`/purchase/register/${row.id}`)}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPurchases.map((purchase) => (
                  <PurchaseCard
                    key={purchase.id}
                    purchase={purchase}
                    onEdit={() => router.push(`/purchase/register/${purchase.id}`)}
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
                    <Button onClick={() => router.push('/purchase/register/new')}>
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

      <AlertDialog open={showImportConfirm} onOpenChange={(open) => { if (!open && !importing) setShowImportConfirm(false); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Import</AlertDialogTitle>
            <AlertDialogDescription>
              <div className="text-sm">Trigger purchase import from the latest source? This may take a moment.</div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button variant="secondary" size="sm" disabled={importing}>Cancel</Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button variant="default" size="sm" onClick={triggerImport} disabled={importing}>
                {importing ? 'Importing...' : 'Confirm'}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
};

export default PurchaseRecords;
