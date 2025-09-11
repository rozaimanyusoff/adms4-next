'use client';
import React, { useEffect, useMemo, useState, useContext } from 'react';
import { CustomDataGrid, ColumnDef } from '@/components/ui/DataGrid';
import ActionSidebar from '@/components/ui/action-aside';
// PurchaseSummary is shown in the parent tabs component
import PurchaseCard from './purchase-card';
import { Plus, ShoppingCart, Package, Truck, Eye, Edit, Trash2, Grid, List, Search, PlusCircle } from 'lucide-react';
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
// import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
// Removed Excel importer – creating records directly in-app

// Format number for RM display: thousand separators + 2 decimals
const fmtRM = (value: number) => {
  return Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

interface ApiPurchase {
  id: number;
  request_type: string;
  // API now returns nested objects for some fields. Keep unions so older records still work.
  requestor?: { ramco_id: string; full_name: string } | string;
  costcenter?: { id: number; name: string } | string;
  type?: { id: number; name: string } | string; // maps to item_type in form
  items: string;
  supplier?: { id: number; name: string } | string;
  brand?: { id: number; name: string } | string;
  qty: number;
  unit_price: string;          // API returns as string
  total_price?: string;        // API returns as string
  pr_date?: string;
  pr_no?: string;
  po_date?: string;
  po_no?: string;
  do_date?: string;
  do_no?: string;
  inv_date?: string;
  inv_no?: string;
  grn_date?: string;
  grn_no?: string;
  deliveries?: Array<{
    do_date?: string;
    do_no?: string;
    inv_date?: string;
    inv_no?: string;
    grn_date?: string;
    grn_no?: string;
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
  items: string;               // Match API field name
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
    items: '',
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

  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const onFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const f = files[0];
      if (!f.type.includes('pdf') && !f.name.toLowerCase().endsWith('.pdf')) {
        toast.error('Only PDF files are allowed');
        return;
      }
      setUploadFile(f);
    }
  };

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files && e.target.files[0];
    if (f) {
      if (!f.type.includes('pdf') && !f.name.toLowerCase().endsWith('.pdf')) {
        toast.error('Only PDF files are allowed');
        return;
      }
      setUploadFile(f);
    }
  };

  const removeUploadFile = () => {
    setUploadFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
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
        setEmployeeOptions(emps.map((e: any) => ({ value: String(e.ramco_id), label: e.full_name })));

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
        return;
      }

      try {
        setBrandsLoading(true);
        const res = await authenticatedApi.get(`/api/assets/brands?type=${formData.type_id}`);
        const data = (res as any).data?.data || (res as any).data || [];
        setBrands(data);
        // use brand id as value
        setBrandOptions(data.map((b: any) => ({ value: String(b.id ?? b.code ?? b.name), label: b.name })));
      } catch (err) {
        console.error('Failed to load brands for type', formData.type_id, err);
        setBrands([]);
        setBrandOptions([]);
      } finally {
        setBrandsLoading(false);
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

  // Load purchases whenever username becomes available/changes
  useEffect(() => {
    const uname = getUsername();
    loadPurchases(uname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      filtered = filtered.filter(p => p.request_type === filters.request_type);
    }

    // Apply search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(purchase => {
        const supplier = typeof purchase.supplier === 'string' ? purchase.supplier : (purchase.supplier?.name || '');
        const cc = typeof purchase.costcenter === 'string' ? purchase.costcenter : (purchase.costcenter?.name || '');
        const brand = typeof purchase.brand === 'string' ? purchase.brand : (purchase.brand?.name || '');
        const prNo = purchase.pr_no ? String(purchase.pr_no) : '';
        const poNo = purchase.po_no ? String(purchase.po_no) : '';
        return (
          (purchase.items || '').toLowerCase().includes(q) ||
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
  };

  // Validate form
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.request_type) errors.request_type = 'Request type is required';
    if (!formData.costcenter) errors.costcenter = 'Cost center is required';
    if (!formData.items) errors.items = 'Item description is required';
    if (!formData.type_id) errors.type_id = 'Item type is required';
    if (!formData.supplier_id) errors.supplier_id = 'Supplier is required';
    if (!formData.pr_no?.trim()) errors.pr_no = 'PR number is required';
    if (!formData.pr_date?.trim()) errors.pr_date = 'PR date is required';
    if (!formData.po_no?.trim()) errors.po_no = 'PO number is required';
    if (!formData.po_date?.trim()) errors.po_date = 'PO date is required';
    if (!formData.qty || formData.qty <= 0) errors.qty = 'Quantity must be greater than 0';
    if (!formData.unit_price || formData.unit_price <= 0) errors.unit_price = 'Unit price must be greater than 0';

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const allowedDeliveries = Math.min(Math.max(formData.qty || 0, 0), 5);
      if ((formData.deliveries?.length || 0) > allowedDeliveries) {
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
      };

      if (Array.isArray(formData.deliveries) && formData.deliveries.length > 0) {
        const last = formData.deliveries[formData.deliveries.length - 1];
        jsonPayload.do_date = last.do_date;
        jsonPayload.do_no = last.do_no;
        jsonPayload.inv_date = last.inv_date;
        jsonPayload.inv_no = last.inv_no;
        jsonPayload.grn_date = last.grn_date;
        jsonPayload.grn_no = last.grn_no;
        jsonPayload.deliveries = formData.deliveries;
      }

      // remove the old keys to avoid sending duplicate data
      delete jsonPayload.costcenter;
      delete jsonPayload.pic;
      // Do not send brand name field
      delete jsonPayload.brand;

      // If a file was attached, send multipart/form-data and include the file under `upload_path`.
      if (uploadFile) {
        const fd = new FormData();
        Object.entries(jsonPayload).forEach(([k, v]) => {
          if (v !== undefined && v !== null) fd.append(k, String(v));
        });
        fd.append('upload_path', uploadFile, uploadFile.name);

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
    } catch (error) {
      toast.error('Failed to save purchase record');
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
    } catch (error) {
      toast.error('Failed to delete purchase record');
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
        items: '',
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
    } else if (mode === 'edit' && purchase) {
      // Map nested API objects into flat form values expected by the form
      const cc = typeof purchase.costcenter === 'string' ? purchase.costcenter : (purchase.costcenter?.id ? String(purchase.costcenter.id) : (purchase.costcenter?.name || ''));
      const picVal = typeof purchase.requestor === 'string' ? purchase.requestor : (purchase.requestor?.ramco_id || '');
      const itemType = typeof purchase.type === 'string' ? purchase.type : (purchase.type?.name || '');
      const supplierId = typeof purchase.supplier === 'string' ? '' : (purchase.supplier as any)?.id ? String((purchase.supplier as any).id) : '';
      const brandId = typeof purchase.brand === 'string' ? '' : (purchase.brand as any)?.id ? String((purchase.brand as any).id) : '';

      const deliveries = (purchase as any).deliveries && Array.isArray((purchase as any).deliveries) && (purchase as any).deliveries.length > 0
        ? (purchase as any).deliveries.map((d: any) => ({
            do_date: d.do_date ? String(d.do_date).split('T')[0] : '',
            do_no: d.do_no || '',
            inv_date: d.inv_date ? String(d.inv_date).split('T')[0] : '',
            inv_no: d.inv_no || '',
            grn_date: d.grn_date ? String(d.grn_date).split('T')[0] : '',
            grn_no: d.grn_no || '',
          }))
        : [{
            do_date: purchase.do_date ? purchase.do_date.split('T')[0] : '',
            do_no: purchase.do_no || '',
            inv_date: purchase.inv_date ? purchase.inv_date.split('T')[0] : '',
            inv_no: purchase.inv_no || '',
            grn_date: purchase.grn_date ? purchase.grn_date.split('T')[0] : '',
            grn_no: purchase.grn_no || ''
          }];
      const last = deliveries[deliveries.length - 1];

      setFormData({
        request_type: purchase.request_type || '',
        costcenter: cc || '',
        pic: picVal || '',
        type_id: purchase.type && typeof purchase.type !== 'string' && purchase.type.id ? String(purchase.type.id) : (itemType || ''),
        items: purchase.items || '',
        supplier_id: supplierId,
        brand_id: brandId,
        qty: purchase.qty || 0,
        unit_price: parseFloat(purchase.unit_price || '0'),
        pr_date: purchase.pr_date ? purchase.pr_date.split('T')[0] : '',
        pr_no: purchase.pr_no || '',
        po_date: purchase.po_date ? purchase.po_date.split('T')[0] : '',
        po_no: purchase.po_no || '',
        do_date: last.do_date,
        do_no: last.do_no,
        inv_date: last.inv_date,
        inv_no: last.inv_no,
        grn_date: last.grn_date,
        grn_no: last.grn_no,
        deliveries
      });
      setActiveDeliveryTab(`delivery-${deliveries.length - 1}`);
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
    if ((latest?.grn_date && latest?.grn_no) || (purchase.grn_date && purchase.grn_no)) return 'Completed';
    if ((purchase as any).handover_at || (purchase as any).handover_to) return 'Handover';
    if ((latest?.do_date && latest?.do_no) || (purchase.do_date && purchase.do_no)) return 'Delivered';
    if (purchase.po_date && purchase.po_no) return 'Ordered';
    return 'Requested';
  };

  // Badge class for request type: CAPEX -> green, OPEX -> blue, others -> amber
  const getRequestTypeBadgeClass = (type?: string) => {
    const t = (type || '').toString().toUpperCase();
    if (t === 'CAPEX') return 'bg-green-600 text-white text-xs';
    if (t === 'OPEX') return 'bg-blue-600 text-white text-xs';
    return 'bg-amber-600 text-white text-xs';
  };

  // Define columns for DataGrid
  const columns: ColumnDef<any>[] = [
    { key: 'id', header: 'No' },
    {
      key: 'request_type',
      header: 'Request Type',
      render: (row: any) => (
        <span className={getRequestTypeBadgeClass(row.request_type) + ' inline-flex items-center px-2 py-0.5 rounded-full'}>
          {row.request_type}
        </span>
      ),
      filter: 'singleSelect'
    },
    {
      key: 'costcenter',
      header: 'Cost Center',
      filter: 'singleSelect',
      render: (row: any) => typeof row.costcenter === 'string' ? row.costcenter : (row.costcenter?.name || '')
    },
    {
      key: 'pic',
      header: 'PIC',
      filter: 'input',
      render: (row: any) => typeof row.requestor === 'string' ? row.requestor : (row.requestor?.full_name || '')
    },
    { key: 'item_type', header: 'Item Type', filter: 'singleSelect', render: (row: any) => typeof row.type === 'string' ? row.type : (row.type?.name || row.item_type || '') },
    {
      key: 'items',
      header: 'Item Description',
      filter: 'input'
    },
    { key: 'supplier', header: 'Supplier', filter: 'singleSelect', render: (row: any) => typeof row.supplier === 'string' ? row.supplier : (row.supplier?.name || '') },
    { key: 'brand', header: 'Brand', filter: 'singleSelect', render: (row: any) => typeof row.brand === 'string' ? row.brand : (row.brand?.name || '') },
    { key: 'qty', header: 'Qty' },
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
      key: 'pr_date',
      header: 'PR Date',
      render: (row: any) => row.pr_date ? new Date(row.pr_date).toLocaleDateString('en-GB') : ''
    },
    { key: 'pr_no', header: 'PR Number', filter: 'input' },
    {
      key: 'po_date',
      header: 'PO Date',
      render: (row: any) => row.po_date ? new Date(row.po_date).toLocaleDateString('en-GB') : ''
    },
    { key: 'po_no', header: 'PO Number', filter: 'input' },
    {
      key: 'do_date',
      header: 'DO Date',
      render: (row: any) => {
        const ds = (row as any).deliveries as any[] | undefined;
        const d = ds && ds.length ? ds[ds.length - 1]?.do_date : row.do_date;
        return d ? new Date(d).toLocaleDateString('en-GB') : '';
      }
    },
    {
      key: 'do_no',
      header: 'DO Number',
      filter: 'input',
      render: (row: any) => {
        const ds = (row as any).deliveries as any[] | undefined;
        const d = ds && ds.length ? ds[ds.length - 1]?.do_no : row.do_no;
        return d || '';
      }
    },
    {
      key: 'inv_date',
      header: 'Handover Date',
      render: (row: any) => {
        const ds = (row as any).deliveries as any[] | undefined;
        const d = ds && ds.length ? ds[ds.length - 1]?.inv_date : row.inv_date;
        return d ? new Date(d).toLocaleDateString('en-GB') : '';
      }
    },
    {
      key: 'inv_no',
      header: 'Handover Number',
      filter: 'input',
      render: (row: any) => {
        const ds = (row as any).deliveries as any[] | undefined;
        const d = ds && ds.length ? ds[ds.length - 1]?.inv_no : row.inv_no;
        return d || '';
      }
    },
    {
      key: 'grn_date',
      header: 'GRN Date',
      render: (row: any) => {
        const ds = (row as any).deliveries as any[] | undefined;
        const d = ds && ds.length ? ds[ds.length - 1]?.grn_date : row.grn_date;
        return d ? new Date(d).toLocaleDateString('en-GB') : '';
      }
    },
    {
      key: 'grn_no',
      header: 'GRN Number',
      filter: 'input',
      render: (row: any) => {
        const ds = (row as any).deliveries as any[] | undefined;
        const d = ds && ds.length ? ds[ds.length - 1]?.grn_no : row.grn_no;
        return d || '';
      }
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: any) => (
        <Badge variant={getStatusVariant(row) as any}>
          {getStatusText(row)}
        </Badge>
      ),
      filter: 'singleSelect'
    }
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
            {/* PR fields moved above Request Type (readonly in edit mode) */}
            <div>
              <Label htmlFor="pr_no">PR Number *</Label>
              <Input
                id="pr_no"
                value={formData.pr_no}
                onChange={(e) => handleInputChange('pr_no', e.target.value)}
                placeholder="Enter PR number"
                readOnly={sidebarMode === 'edit'}
              />
              {validationErrors.pr_no && (
                <p className="text-red-500 text-sm mt-1">{validationErrors.pr_no}</p>
              )}
            </div>

            <div>
              <Label htmlFor="pr_date">PR Date *</Label>
              <Input
                id="pr_date"
                type="date"
                value={formData.pr_date}
                onChange={(e) => handleInputChange('pr_date', e.target.value)}
                readOnly={sidebarMode === 'edit'}
              />
              {validationErrors.pr_date && (
                <p className="text-red-500 text-sm mt-1">{validationErrors.pr_date}</p>
              )}
            </div>

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
              <Label htmlFor="pic">PIC *</Label>
              <Combobox
                options={employeeOptions}
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
              <Label htmlFor="items">Items *</Label>
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

            {/* Supplier moved to Pricing Information card */}

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
          <Tabs value={activeDeliveryTab} onValueChange={setActiveDeliveryTab}>
            <TabsList className="flex flex-wrap">
              {(formData.deliveries || []).map((_, idx) => (
                <TabsTrigger key={`delivery-tab-${idx}`} value={`delivery-${idx}`}>Delivery {idx + 1}</TabsTrigger>
              ))}
            </TabsList>
            {(formData.deliveries || []).map((d, idx) => (
              <TabsContent key={`delivery-content-${idx}`} value={`delivery-${idx}`} className="mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor={`do_date_${idx}`}>DO Date</Label>
                    <Input
                      id={`do_date_${idx}`}
                      type="date"
                      value={d.do_date}
                      onChange={(e) => updateDeliveryField(idx, 'do_date', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor={`do_no_${idx}`}>DO Number</Label>
                    <Input
                      id={`do_no_${idx}`}
                      value={d.do_no}
                      onChange={(e) => updateDeliveryField(idx, 'do_no', e.target.value)}
                      placeholder="Enter DO number"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`inv_date_${idx}`}>Invoice Date</Label>
                    <Input
                      id={`inv_date_${idx}`}
                      type="date"
                      value={d.inv_date}
                      onChange={(e) => updateDeliveryField(idx, 'inv_date', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor={`inv_no_${idx}`}>Invoice Number</Label>
                    <Input
                      id={`inv_no_${idx}`}
                      value={d.inv_no}
                      onChange={(e) => updateDeliveryField(idx, 'inv_no', e.target.value)}
                      placeholder="Enter invoice number"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`grn_date_${idx}`}>GRN Date</Label>
                    <Input
                      id={`grn_date_${idx}`}
                      type="date"
                      value={d.grn_date}
                      onChange={(e) => updateDeliveryField(idx, 'grn_date', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor={`grn_no_${idx}`}>GRN Number</Label>
                    <Input
                      id={`grn_no_${idx}`}
                      value={d.grn_no}
                      onChange={(e) => updateDeliveryField(idx, 'grn_no', e.target.value)}
                      placeholder="Enter GRN number"
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
                        const newIdx = Math.max(0, idx - 1);
                        setActiveDeliveryTab(`delivery-${newIdx}`);
                      }}
                    >
                      Remove Delivery
                    </Button>
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>

          <div className="mt-6">
            <Label>Attach PDF (optional)</Label>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={onFileDrop}
              onClick={() => fileInputRef.current?.click()}
              className="mt-2 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-md h-28 cursor-pointer bg-gray-50"
            >
              {!uploadFile ? (
                <div className="text-center text-sm text-gray-600">
                  Drop PDF here or click to select
                  <div className="text-xs text-gray-400">Only .pdf files accepted</div>
                </div>
              ) : (
                <div className="flex items-center justify-between w-full px-4">
                  <div className="truncate">{uploadFile.name}</div>
                  <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); removeUploadFile(); }}>
                    Remove
                  </Button>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={onFileSelect}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      <div className="flex justify-end space-x-2">
        <Button variant="outline" onClick={closeSidebar}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={loading}>
          {loading ? 'Saving...' : sidebarMode === 'edit' ? 'Update Purchase' : 'Create Purchase'}
        </Button>
      </div>
    </div>
  );

  // Render view content
  const renderViewContent = () => {
    if (!selectedPurchase) return null;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold">{selectedPurchase.items}</h3>
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
                  <span className={getRequestTypeBadgeClass(selectedPurchase.request_type) + ' inline-flex items-center px-2 py-0.5 rounded-full'}>
                    {selectedPurchase.request_type}
                  </span>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">Cost Center</Label>
                <p className="font-medium">{typeof selectedPurchase.costcenter === 'string' ? selectedPurchase.costcenter : (selectedPurchase.costcenter?.name || '')}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">PIC</Label>
                <p className="font-medium">{typeof selectedPurchase.requestor === 'string' ? selectedPurchase.requestor : (selectedPurchase.requestor?.full_name || '')}</p>
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
                      {selectedPurchase.pr_date && (
                        <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                          <div>
                            <p className="font-medium">Request Date</p>
                            <p className="text-sm text-gray-600">PR: {selectedPurchase.pr_no || 'N/A'}</p>
                          </div>
                          <p className="font-medium">{new Date(selectedPurchase.pr_date).toLocaleDateString('en-GB')}</p>
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
                {selectedPurchase.pr_date && (
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                    <div>
                      <p className="font-medium">Request Date</p>
                      <p className="text-sm text-gray-600">PR: {selectedPurchase.pr_no || 'N/A'}</p>
                    </div>
                    <p className="font-medium">{new Date(selectedPurchase.pr_date).toLocaleDateString('en-GB')}</p>
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
    <div className="space-y-6 p-4">

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
          <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => openSidebar('create')}>
            <Plus className="mr-2 h-4 w-4" />
            Add Purchase
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
                pagination={true}
                inputFilter={true}
                columnsVisibleOption={true}
                dataExport={true}
                rowExpandable={{
                  enabled: true,
                  render: (row: any) => (
                    <div className="p-4 bg-gray-50 dark:bg-gray-800">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openSidebar('view', row)}
                          className="flex items-center space-x-2"
                        >
                          <Eye className="h-4 w-4" />
                          <span>View Details</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openSidebar('edit', row)}
                          className="flex items-center space-x-2"
                        >
                          <Edit className="h-4 w-4" />
                          <span>Edit</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const typeId = typeof row.type === 'string' ? '' : (row.type?.id || '');
                            window.open(`/purchase/asset/${row.id}?type_id=${typeId}`, '_blank');
                          }}
                          className="flex items-center space-x-2 text-blue-600 hover:text-blue-700"
                        >
                          <PlusCircle className="h-4 w-4" />
                          <span>Register Asset</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(row.id)}
                          className="flex items-center space-x-2 text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span>Delete</span>
                        </Button>
                      </div>
                    </div>
                  )
                }}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPurchases.map((purchase) => (
                  <PurchaseCard
                    key={purchase.id}
                    purchase={purchase}
                    onView={() => openSidebar('view', purchase)}
                    onEdit={() => openSidebar('edit', purchase)}
                    onDelete={() => handleDelete(purchase.id)}
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
