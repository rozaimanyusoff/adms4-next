'use client';
import React, { useEffect, useState } from 'react';
import { authenticatedApi } from '@/config/api';
import { Button } from '@/components/ui/button';
import { Plus, Download, Loader2 } from 'lucide-react';
import { CustomDataGrid, ColumnDef } from '@/components/ui/DataGrid';
import { useRouter } from 'next/navigation';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import ActionSidebar from '@/components/ui/action-aside';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface UtilityBill {
  bill_id: number;
  loc_id: number;
  cc_id: number;
  ubill_date: string;
  ubill_no: string;
  ubill_stotal: string;
  ubill_tax: string;
  ubill_disc: string;
  ubill_round: string;
  ubill_rent: string;
  ubill_bw: string;
  ubill_color: string;
  ubill_gtotal: string;
  ubill_paystat: string;
  ubill_payref: string;
  // Additional fields for display compatibility
  account?: {
    utility_id: string;
    service: string;
    provider?: string;
  };
  costcenter?: {
    costcenter_id: string;
    name: string;
  };
  service?: string; // Added for DataGrid column compatibility
  costcenter_name?: string; // Added for DataGrid column compatibility
  provider?: string; // Added for DataGrid column compatibility
}

interface UtilityBillForm {
  bill_id?: number;
  loc_id: string;
  cc_id: string;
  ubill_date: string;
  ubill_no: string;
  ubill_stotal: string;
  ubill_tax: string;
  ubill_disc: string;
  ubill_round: string;
  ubill_rent: string;
  ubill_bw: string;
  ubill_color: string;
  ubill_gtotal: string;
  ubill_paystat: string;
  ubill_payref: string;
}

// Add global type for window.reloadUtilityBillGrid
declare global {
  interface Window {
    reloadUtilityBillGrid?: () => void;
  }
}

const UtilityBill = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRowIds, setSelectedRowIds] = useState<number[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingBill, setEditingBill] = useState<UtilityBill | null>(null);
  const [costCenters, setCostCenters] = useState<{ id: string; name: string }[]>([]);
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);
  const router = useRouter();

  const [formData, setFormData] = useState<UtilityBillForm>({
    loc_id: 'none',
    cc_id: 'none',
    ubill_date: '',
    ubill_no: '',
    ubill_stotal: '0.00',
    ubill_tax: '0.00',
    ubill_disc: '0.00',
    ubill_round: '0.00',
    ubill_rent: '0.00',
    ubill_bw: '0.00',
    ubill_color: '0.00',
    ubill_gtotal: '0.00',
    ubill_paystat: 'Pending',
    ubill_payref: '',
  });

  // Fetch cost centers and locations
  const fetchCostCenters = async () => {
    try {
      const response = await authenticatedApi.get('/api/assets/costcenters');
      if ((response.data as any)?.data) {
        setCostCenters((response.data as any).data.map((cc: any) => ({
          id: cc.id?.toString() || '',
          name: cc.name || ''
        })));
      }
    } catch (error) {
      console.error('Error fetching cost centers:', error);
    }
  };

  const fetchLocations = async () => {
    try {
      const response = await authenticatedApi.get('/api/assets/locations');
      if ((response.data as any)?.data) {
        setLocations((response.data as any).data.map((loc: any) => ({
          id: loc.id?.toString() || '',
          name: loc.name || ''
        })));
      }
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  };

  const handleInputChange = (field: keyof UtilityBillForm, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Auto-calculate grand total when amounts change
    if (['ubill_stotal', 'ubill_tax', 'ubill_disc', 'ubill_round', 'ubill_rent', 'ubill_bw', 'ubill_color'].includes(field)) {
      calculateGrandTotal(field, value);
    }
  };

  const calculateGrandTotal = (changedField: keyof UtilityBillForm, newValue: string) => {
    const currentData = { ...formData, [changedField]: newValue };
    const subTotal = parseFloat(currentData.ubill_stotal) || 0;
    const tax = parseFloat(currentData.ubill_tax) || 0;
    const discount = parseFloat(currentData.ubill_disc) || 0;
    const rounding = parseFloat(currentData.ubill_round) || 0;
    const rental = parseFloat(currentData.ubill_rent) || 0;
    const bw = parseFloat(currentData.ubill_bw) || 0;
    const color = parseFloat(currentData.ubill_color) || 0;
    
    const grandTotal = subTotal + tax - discount + rounding + rental + bw + color;
    setFormData(prev => ({
      ...prev,
      ubill_gtotal: grandTotal.toFixed(2)
    }));
  };

  const resetForm = () => {
    setFormData({
      loc_id: 'none',
      cc_id: 'none',
      ubill_date: '',
      ubill_no: '',
      ubill_stotal: '0.00',
      ubill_tax: '0.00',
      ubill_disc: '0.00',
      ubill_round: '0.00',
      ubill_rent: '0.00',
      ubill_bw: '0.00',
      ubill_color: '0.00',
      ubill_gtotal: '0.00',
      ubill_paystat: 'Pending',
      ubill_payref: '',
    });
    setEditingBill(null);
  };

  const handleAdd = () => {
    resetForm();
    setSidebarOpen(true);
  };

  const handleRowDoubleClick = (bill: UtilityBill & { rowNumber: number }) => {
    setFormData({
      bill_id: bill.bill_id,
      loc_id: bill.loc_id ? bill.loc_id.toString() : 'none',
      cc_id: bill.cc_id ? bill.cc_id.toString() : 'none',
      ubill_date: bill.ubill_date ? new Date(bill.ubill_date).toISOString().split('T')[0] : '',
      ubill_no: bill.ubill_no || '',
      ubill_stotal: bill.ubill_stotal || '0.00',
      ubill_tax: bill.ubill_tax || '0.00',
      ubill_disc: bill.ubill_disc || '0.00',
      ubill_round: bill.ubill_round || '0.00',
      ubill_rent: bill.ubill_rent || '0.00',
      ubill_bw: bill.ubill_bw || '0.00',
      ubill_color: bill.ubill_color || '0.00',
      ubill_gtotal: bill.ubill_gtotal || '0.00',
      ubill_paystat: bill.ubill_paystat || 'Pending',
      ubill_payref: bill.ubill_payref || '',
    });
    setEditingBill(bill);
    setSidebarOpen(true);
  };

  const handleSave = async () => {
    if (!formData.ubill_no || !formData.ubill_date) {
      toast.error('Please fill in required fields: Bill No and Date');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...formData,
        loc_id: (formData.loc_id && formData.loc_id !== 'none') ? parseInt(formData.loc_id) : null,
        cc_id: (formData.cc_id && formData.cc_id !== 'none') ? parseInt(formData.cc_id) : null,
        ubill_date: formData.ubill_date ? new Date(formData.ubill_date).toISOString() : null,
      };

      if (editingBill) {
        // Update existing bill
        await authenticatedApi.put(`/api/bills/util/${editingBill.bill_id}`, payload);
        toast.success('Utility bill updated successfully');
      } else {
        // Create new bill
        await authenticatedApi.post('/api/bills/util', payload);
        toast.success('Utility bill created successfully');
      }

      setSidebarOpen(false);
      resetForm();
      fetchUtilityBills();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save utility bill');
      console.error('Error saving bill:', error);
    } finally {
      setSaving(false);
    }
  };
  const fetchUtilityBills = () => {
    setLoading(true);
    authenticatedApi.get('/api/bills/util')
      .then(res => {
        const data = (res.data as { data?: UtilityBill[] })?.data || [];
        setRows(data.map((item, idx) => ({
          ...item,
          rowNumber: idx + 1,
          service: item.account?.service || '',
          provider: item.account?.provider || '',
          costcenter_name: item.costcenter?.name || '',
          ubill_date: item.ubill_date ? new Date(item.ubill_date).toLocaleDateString() : '',
        })));
        setLoading(false);
      })
      .catch(() => {
        setRows([]);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchUtilityBills();
    fetchCostCenters();
    fetchLocations();
  }, []);

  useEffect(() => {
    window.reloadUtilityBillGrid = () => {
      fetchUtilityBills();
    };
    return () => {
      delete window.reloadUtilityBillGrid;
    };
  }, []);

  const columns: ColumnDef<UtilityBill & { rowNumber: number }>[] = [
    {
      key: 'rowNumber',
      header: 'No',
      render: (row) => (
        <div className="flex items-center min-w-[60px]">
          <span>{row.rowNumber}</span>
        </div>
      ),
    },
    { key: 'ubill_no', header: 'Bill No', filter: 'input' },
    { key: 'ubill_date', header: 'Date' },
    { key: 'service', header: 'Service', filter: 'singleSelect' },
    { key: 'provider', header: 'Provider', filter: 'singleSelect' },
    { key: 'costcenter_name', header: 'Cost Center', filter: 'singleSelect' },
    { key: 'ubill_stotal', header: 'Sub Total', colClass: 'text-right' },
    { key: 'ubill_tax', header: 'Tax', colClass: 'text-right' },
    { key: 'ubill_round', header: 'Rounding', colClass: 'text-right' },
    { key: 'ubill_disc', header: 'Discount', colClass: 'text-right' },
    { key: 'ubill_rent', header: 'Rental', colClass: 'text-right' },
    { key: 'ubill_bw', header: 'B&W Print', colClass: 'text-right' },
    { key: 'ubill_color', header: 'Color Print', colClass: 'text-right' },
    { key: 'ubill_gtotal', header: 'Grand Total', colClass: 'text-right' },
    { key: 'ubill_paystat', header: 'Payment Status', filter: 'singleSelect' },
  ];

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold">Utility Bills Summary</h2>
          {selectedRowIds.length > 0 && (
            <Button
              variant="secondary"
              className="ml-2 bg-amber-500 hover:bg-amber-600 text-white shadow-lg"
              onClick={() => {
                // TODO: Implement batch PDF export for selected utility bills
                toast.info(`Export functionality for ${selectedRowIds.length} selected bills will be implemented`);
              }}
            >
              <Download size={16} className="mr-1" /> Export PDF
            </Button>
          )}
        </div>
        <Button
          variant={'default'}
          onClick={handleAdd}
          disabled={loading}
        >
          {loading ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
        </Button>
      </div>
      <CustomDataGrid
        columns={columns as ColumnDef<unknown>[]}
        data={rows}
        pagination={true}
        inputFilter={false}
        theme="sm"
        dataExport={true}
        onRowDoubleClick={handleRowDoubleClick}
        rowSelection={{
          enabled: true,
          getRowId: (row: any) => row.bill_id,
          onSelect: (selectedKeys: (string | number)[], selectedRows: any[]) => {
            setSelectedRowIds(selectedKeys.map(Number));
          },
        }}
      />

      <ActionSidebar
        isOpen={sidebarOpen}
        title={editingBill ? 'Edit Utility Bill' : 'Add New Utility Bill'}
        onClose={() => {
          setSidebarOpen(false);
          resetForm();
        }}
        size="lg"
        content={
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Location and Cost Center */}
                <div className="space-y-2">
                  <Label htmlFor="loc_id">Location</Label>
                  <Select 
                    value={formData.loc_id} 
                    onValueChange={(value) => handleInputChange('loc_id', value)}
                  >
                    <SelectTrigger className='w-full'>
                      <SelectValue placeholder="Select Location" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Select Location</SelectItem>
                      {locations.map((location) => (
                        <SelectItem key={location.id} value={location.id}>
                          {location.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cc_id">Cost Center</Label>
                  <Select 
                    value={formData.cc_id} 
                    onValueChange={(value) => handleInputChange('cc_id', value)}
                  >
                    <SelectTrigger className='w-full'>
                      <SelectValue placeholder="Select Cost Center" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Select Cost Center</SelectItem>
                      {costCenters.map((cc) => (
                        <SelectItem key={cc.id} value={cc.id}>
                          {cc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Date and Bill Number */}
                <div className="space-y-2">
                  <Label htmlFor="ubill_date">Bill Date *</Label>
                  <Input
                    id="ubill_date"
                    type="date"
                    value={formData.ubill_date}
                    onChange={(e) => handleInputChange('ubill_date', e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ubill_no">Bill Number *</Label>
                  <Input
                    id="ubill_no"
                    type="text"
                    value={formData.ubill_no}
                    onChange={(e) => handleInputChange('ubill_no', e.target.value)}
                    placeholder="Enter bill number"
                    required
                  />
                </div>

                {/* Financial Fields */}
                <div className="space-y-2">
                  <Label htmlFor="ubill_stotal">Subtotal</Label>
                  <Input
                    id="ubill_stotal"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.ubill_stotal}
                    onChange={(e) => handleInputChange('ubill_stotal', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ubill_tax">Tax</Label>
                  <Input
                    id="ubill_tax"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.ubill_tax}
                    onChange={(e) => handleInputChange('ubill_tax', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ubill_disc">Discount</Label>
                  <Input
                    id="ubill_disc"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.ubill_disc}
                    onChange={(e) => handleInputChange('ubill_disc', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ubill_round">Rounding</Label>
                  <Input
                    id="ubill_round"
                    type="number"
                    step="0.01"
                    value={formData.ubill_round}
                    onChange={(e) => handleInputChange('ubill_round', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ubill_rent">Rental</Label>
                  <Input
                    id="ubill_rent"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.ubill_rent}
                    onChange={(e) => handleInputChange('ubill_rent', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ubill_bw">B&W</Label>
                  <Input
                    id="ubill_bw"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.ubill_bw}
                    onChange={(e) => handleInputChange('ubill_bw', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ubill_color">Color</Label>
                  <Input
                    id="ubill_color"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.ubill_color}
                    onChange={(e) => handleInputChange('ubill_color', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ubill_gtotal">Grand Total</Label>
                  <Input
                    id="ubill_gtotal"
                    type="number"
                    step="0.01"
                    value={formData.ubill_gtotal}
                    readOnly
                    className="bg-gray-50 dark:bg-gray-700"
                  />
                </div>

                {/* Payment Status and Reference */}
                <div className="space-y-2">
                  <Label htmlFor="ubill_paystat">Payment Status</Label>
                  <Select 
                    value={formData.ubill_paystat} 
                    onValueChange={(value) => handleInputChange('ubill_paystat', value)}
                  >
                    <SelectTrigger className='w-full'>
                      <SelectValue placeholder="Select Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Paid">Paid</SelectItem>
                      <SelectItem value="Overdue">Overdue</SelectItem>
                      <SelectItem value="Cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ubill_payref">Payment Reference</Label>
                  <Input
                    id="ubill_payref"
                    type="text"
                    value={formData.ubill_payref}
                    onChange={(e) => handleInputChange('ubill_payref', e.target.value)}
                    placeholder="Payment reference number"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1"
                >
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingBill ? 'Update Bill' : 'Create Bill'}
                </Button>
                <Button
                  onClick={() => {
                    setSidebarOpen(false);
                    resetForm();
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          }
        />
    </div>
  );
};

export default UtilityBill;

// Helper to download a Blob as a file
function downloadBlob(blob: Blob, filename: string) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/* 

ToDo:
- Add utility bill form page at /billings/utility/form
- Implement utility PDF report generation similar to fuel reports
- Add proper error handling and loading states

*/
