'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { CustomDataGrid, ColumnDef } from '@/components/ui/DataGrid';
import ActionSidebar from '@/components/ui/action-aside';
import PurchaseSummary from './purchase-summary';
import PurchaseCard from './purchase-card';
import { Plus, FileSpreadsheet, ShoppingCart, Package, Truck, Eye, Edit, Trash2, Grid, List, Search } from 'lucide-react';
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
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import DataImporter from '@/components/data-importer/DataImporter';

interface PurchaseRecord {
  id: number;
  request_type: string;
  costcenter: string;          // API uses 'costcenter'
  pic: string;                 // Person in charge
  item_type: string;           // Item type
  items: string;               // API uses 'items' instead of 'item_description'
  supplier: string;
  brand: string;
  qty: number;
  unit_price: string;          // API returns as string
  total_price: string;         // API returns as string
  pr_date: string;             // API uses 'pr_date'
  pr_no: string;               // API uses 'pr_no'
  po_date: string;
  po_no: string;               // API uses 'po_no'
  do_date: string;
  do_no: string;               // API uses 'do_no'
  inv_date: string;            // API uses 'inv_date'
  inv_no: string;              // API uses 'inv_no'
  grn_date: string;
  grn_no: string;              // API uses 'grn_no'
  status?: string;
  created_at?: string;
  updated_at?: string;
}

interface PurchaseFormData {
  request_type: string;
  costcenter: string;          // Match API field name
  pic: string;                 // Person in charge  
  item_type: string;           // Item type
  items: string;               // Match API field name
  supplier: string;
  brand: string;
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
}

const PurchaseRecords: React.FC = () => {
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [filteredPurchases, setFilteredPurchases] = useState<PurchaseRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarMode, setSidebarMode] = useState<'view' | 'create' | 'edit' | 'import'>('create');
  const [selectedPurchase, setSelectedPurchase] = useState<PurchaseRecord | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'cards'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [formData, setFormData] = useState<PurchaseFormData>({
    request_type: '',
    costcenter: '',
    pic: '',
    item_type: '',
    items: '',
    supplier: '',
    brand: '',
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
    grn_no: ''
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Load purchases data
  useEffect(() => {
    loadPurchases();
  }, []);

  // Filter purchases based on search and status
  useEffect(() => {
    let filtered = purchases;

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(purchase =>
        purchase.items.toLowerCase().includes(searchQuery.toLowerCase()) ||
        purchase.supplier.toLowerCase().includes(searchQuery.toLowerCase()) ||
        purchase.costcenter.toLowerCase().includes(searchQuery.toLowerCase()) ||
        purchase.pr_no.toString().toLowerCase().includes(searchQuery.toLowerCase()) ||
        purchase.po_no.toString().toLowerCase().includes(searchQuery.toLowerCase())
      );
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

  const loadPurchases = async () => {
    setLoading(true);
    try {
      const response = await authenticatedApi.get<{ data: PurchaseRecord[] }>('/api/purchases');
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
    setFormData(prev => ({ ...prev, [field]: value }));
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Calculate total automatically
  const calculatedTotal = useMemo(() => {
    return formData.qty * formData.unit_price;
  }, [formData.qty, formData.unit_price]);

  // Validate form
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!formData.request_type) errors.request_type = 'Request type is required';
    if (!formData.costcenter) errors.costcenter = 'Cost center is required';
    if (!formData.items) errors.items = 'Item description is required';
    if (!formData.supplier) errors.supplier = 'Supplier is required';
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
      const submitData = {
        ...formData,
        total_price: calculatedTotal.toString(),
        unit_price: formData.unit_price.toString()
      };

      if (sidebarMode === 'edit' && selectedPurchase) {
        await authenticatedApi.put(`/api/purchases/${selectedPurchase.id}`, submitData);
        toast.success('Purchase record updated successfully');
      } else {
        await authenticatedApi.post('/api/purchases', submitData);
        toast.success('Purchase record created successfully');
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
  const openSidebar = (mode: 'view' | 'create' | 'edit' | 'import', purchase?: PurchaseRecord) => {
    setSidebarMode(mode);
    setSelectedPurchase(purchase || null);
    
    if (mode === 'create') {
      setFormData({
        request_type: '',
        costcenter: '',
        pic: '',
        item_type: '',
        items: '',
        supplier: '',
        brand: '',
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
        grn_no: ''
      });
    } else if (mode === 'edit' && purchase) {
      setFormData({
        request_type: purchase.request_type,
        costcenter: purchase.costcenter,
        pic: purchase.pic,
        item_type: purchase.item_type,
        items: purchase.items,
        supplier: purchase.supplier,
        brand: purchase.brand,
        qty: purchase.qty,
        unit_price: parseFloat(purchase.unit_price),
        pr_date: purchase.pr_date ? purchase.pr_date.split('T')[0] : '',
        pr_no: purchase.pr_no,
        po_date: purchase.po_date ? purchase.po_date.split('T')[0] : '',
        po_no: purchase.po_no,
        do_date: purchase.do_date ? purchase.do_date.split('T')[0] : '',
        do_no: purchase.do_no,
        inv_date: purchase.inv_date ? purchase.inv_date.split('T')[0] : '',
        inv_no: purchase.inv_no,
        grn_date: purchase.grn_date ? purchase.grn_date.split('T')[0] : '',
        grn_no: purchase.grn_no
      });
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
  const getStatusVariant = (purchase: PurchaseRecord) => {
    if (purchase.grn_date && purchase.grn_no) return 'success';
    if (purchase.inv_date && purchase.inv_no) return 'secondary';
    if (purchase.do_date && purchase.do_no) return 'outline';
    if (purchase.po_date && purchase.po_no) return 'default';
    return 'destructive';
  };

  // Get status text
  const getStatusText = (purchase: PurchaseRecord) => {
    if (purchase.grn_date && purchase.grn_no) return 'Completed';
    if (purchase.inv_date && purchase.inv_no) return 'Invoiced';
    if (purchase.do_date && purchase.do_no) return 'Delivered';
    if (purchase.po_date && purchase.po_no) return 'Ordered';
    return 'Requested';
  };

  // Define columns for DataGrid
  const columns: ColumnDef<PurchaseRecord>[] = [
    { key: 'id', header: 'No' },
    { 
      key: 'request_type', 
      header: 'Request Type',
      render: (row: PurchaseRecord) => (
        <Badge variant="outline" className="text-xs">
          {row.request_type}
        </Badge>
      ),
      filter: 'singleSelect'
    },
    { key: 'costcenter', header: 'Cost Center', filter: 'singleSelect' },
    { key: 'pic', header: 'PIC', filter: 'input' },
    { key: 'item_type', header: 'Item Type', filter: 'singleSelect' },
    { 
      key: 'items', 
      header: 'Item Description',
      filter: 'input'
    },
    { key: 'supplier', header: 'Supplier', filter: 'singleSelect' },
    { key: 'brand', header: 'Brand', filter: 'singleSelect' },
    { key: 'qty', header: 'Qty' },
    { 
      key: 'unit_price', 
      header: 'Unit Price (RM)',
      render: (row: PurchaseRecord) => `RM ${parseFloat(row.unit_price).toFixed(2)}`
    },
    { 
      key: 'total' as keyof PurchaseRecord, 
      header: 'Total (RM)',
      render: (row: PurchaseRecord) => `RM ${(row.qty * parseFloat(row.unit_price)).toFixed(2)}`
    },
    { 
      key: 'pr_date', 
      header: 'PR Date',
      render: (row: PurchaseRecord) => row.pr_date ? 
        new Date(row.pr_date).toLocaleDateString('en-GB') : ''
    },
    { key: 'pr_no', header: 'PR Number', filter: 'input' },
    { 
      key: 'po_date', 
      header: 'PO Date',
      render: (row: PurchaseRecord) => row.po_date ? 
        new Date(row.po_date).toLocaleDateString('en-GB') : ''
    },
    { key: 'po_no', header: 'PO Number', filter: 'input' },
    { 
      key: 'do_date', 
      header: 'DO Date',
      render: (row: PurchaseRecord) => row.do_date ? 
        new Date(row.do_date).toLocaleDateString('en-GB') : ''
    },
    { key: 'do_no', header: 'DO Number', filter: 'input' },
    { 
      key: 'inv_date', 
      header: 'Invoice Date',
      render: (row: PurchaseRecord) => row.inv_date ? 
        new Date(row.inv_date).toLocaleDateString('en-GB') : ''
    },
    { key: 'inv_no', header: 'Invoice Number', filter: 'input' },
    { 
      key: 'grn_date', 
      header: 'GRN Date',
      render: (row: PurchaseRecord) => row.grn_date ? 
        new Date(row.grn_date).toLocaleDateString('en-GB') : ''
    },
    { key: 'grn_no', header: 'GRN Number', filter: 'input' },
    {
      key: 'status' as keyof PurchaseRecord,
      header: 'Status',
      render: (row: PurchaseRecord) => (
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
            <div>
              <Label htmlFor="request_type">Request Type *</Label>
              <Select 
                value={formData.request_type} 
                onValueChange={(value) => handleInputChange('request_type', value)}
              >
                <SelectTrigger>
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
              <Input
                id="costcenter"
                value={formData.costcenter}
                onChange={(e) => handleInputChange('costcenter', e.target.value)}
                placeholder="Enter cost center"
              />
              {validationErrors.costcenter && (
                <p className="text-red-500 text-sm mt-1">{validationErrors.costcenter}</p>
              )}
            </div>

            <div>
              <Label htmlFor="pic">PIC *</Label>
              <Input
                id="pic"
                value={formData.pic}
                onChange={(e) => handleInputChange('pic', e.target.value)}
                placeholder="Enter person in charge"
              />
              {validationErrors.pic && (
                <p className="text-red-500 text-sm mt-1">{validationErrors.pic}</p>
              )}
            </div>

            <div>
              <Label htmlFor="item_type">Item Type *</Label>
              <Input
                id="item_type"
                value={formData.item_type}
                onChange={(e) => handleInputChange('item_type', e.target.value)}
                placeholder="Enter item type"
              />
              {validationErrors.item_type && (
                <p className="text-red-500 text-sm mt-1">{validationErrors.item_type}</p>
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

            <div>
              <Label htmlFor="supplier">Supplier *</Label>
              <Input
                id="supplier"
                value={formData.supplier}
                onChange={(e) => handleInputChange('supplier', e.target.value)}
                placeholder="Enter supplier name"
              />
              {validationErrors.supplier && (
                <p className="text-red-500 text-sm mt-1">{validationErrors.supplier}</p>
              )}
            </div>

            <div>
              <Label htmlFor="brand">Brand</Label>
              <Input
                id="brand"
                value={formData.brand}
                onChange={(e) => handleInputChange('brand', e.target.value)}
                placeholder="Enter brand name"
              />
            </div>
          </CardContent>
        </Card>

        {/* Pricing Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <Package className="mr-2 h-5 w-5" />
              Pricing Information
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
                RM {calculatedTotal.toFixed(2)}
              </div>
            </div>

            <div>
              <Label htmlFor="pr_date">PR Date</Label>
              <Input
                id="pr_date"
                type="date"
                value={formData.pr_date}
                onChange={(e) => handleInputChange('pr_date', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="pr_no">PR Number</Label>
              <Input
                id="pr_no"
                value={formData.pr_no}
                onChange={(e) => handleInputChange('pr_no', e.target.value)}
                placeholder="Enter PR number"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Purchase Order & Delivery Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <Truck className="mr-2 h-5 w-5" />
            Purchase Order & Delivery Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="po_date">PO Date</Label>
              <Input
                id="po_date"
                type="date"
                value={formData.po_date}
                onChange={(e) => handleInputChange('po_date', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="po_no">PO Number</Label>
              <Input
                id="po_no"
                value={formData.po_no}
                onChange={(e) => handleInputChange('po_no', e.target.value)}
                placeholder="Enter PO number"
              />
            </div>

            <div>
              <Label htmlFor="do_date">DO Date</Label>
              <Input
                id="do_date"
                type="date"
                value={formData.do_date}
                onChange={(e) => handleInputChange('do_date', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="do_no">DO Number</Label>
              <Input
                id="do_no"
                value={formData.do_no}
                onChange={(e) => handleInputChange('do_no', e.target.value)}
                placeholder="Enter DO number"
              />
            </div>

            <div>
              <Label htmlFor="inv_date">Invoice Date</Label>
              <Input
                id="inv_date"
                type="date"
                value={formData.inv_date}
                onChange={(e) => handleInputChange('inv_date', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="inv_no">Invoice Number</Label>
              <Input
                id="inv_no"
                value={formData.inv_no}
                onChange={(e) => handleInputChange('inv_no', e.target.value)}
                placeholder="Enter invoice number"
              />
            </div>

            <div>
              <Label htmlFor="grn_date">GRN Date</Label>
              <Input
                id="grn_date"
                type="date"
                value={formData.grn_date}
                onChange={(e) => handleInputChange('grn_date', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="grn_no">GRN Number</Label>
              <Input
                id="grn_no"
                value={formData.grn_no}
                onChange={(e) => handleInputChange('grn_no', e.target.value)}
                placeholder="Enter GRN number"
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
                <p className="font-medium">{selectedPurchase.request_type}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">Cost Center</Label>
                <p className="font-medium">{selectedPurchase.costcenter}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">PIC</Label>
                <p className="font-medium">{selectedPurchase.pic}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">Item Type</Label>
                <p className="font-medium">{selectedPurchase.item_type}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">Supplier</Label>
                <p className="font-medium">{selectedPurchase.supplier}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">Brand</Label>
                <p className="font-medium">{selectedPurchase.brand || 'N/A'}</p>
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
                    <p className="font-medium">Invoice</p>
                    <p className="text-sm text-gray-600">INV: {selectedPurchase.inv_no || 'N/A'}</p>
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

  // Render import content
  const renderImportContent = () => (
    <div className="space-y-4">
      <div className="text-center p-6">
        <FileSpreadsheet className="mx-auto h-16 w-16 text-blue-500 mb-4" />
        <h3 className="text-lg font-semibold mb-2">Import Purchase Records</h3>
        <p className="text-gray-600 mb-4">
          Upload an Excel file with your purchase data. The system will help you map the columns.
        </p>
      </div>
      
      <DataImporter onConfirm={handleImportConfirm} />
    </div>
  );

  // Get sidebar content based on mode
  const getSidebarContent = () => {
    switch (sidebarMode) {
      case 'view':
        return renderViewContent();
      case 'create':
      case 'edit':
        return renderFormContent();
      case 'import':
        return renderImportContent();
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
      case 'import':
        return 'Import Purchase Records';
      default:
        return 'Purchase Record';
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <PurchaseSummary purchases={purchases} />

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
              <SelectItem value="invoiced">Invoiced</SelectItem>
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
          
          {/* Add Purchase Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="mr-2 h-4 w-4" />
                Add Purchase
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => openSidebar('create')}>
                <ShoppingCart className="mr-2 h-4 w-4" />
                Create New Record
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openSidebar('import')}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Import from Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
                  render: (row: PurchaseRecord) => (
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
                    ? 'Get started by creating your first purchase record or importing data from Excel.'
                    : 'Try adjusting your search or filter criteria.'
                  }
                </p>
                {purchases.length === 0 && (
                  <div className="flex justify-center space-x-4">
                    <Button onClick={() => openSidebar('create')}>
                      <ShoppingCart className="mr-2 h-4 w-4" />
                      Create First Record
                    </Button>
                    <Button variant="outline" onClick={() => openSidebar('import')}>
                      <FileSpreadsheet className="mr-2 h-4 w-4" />
                      Import from Excel
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
