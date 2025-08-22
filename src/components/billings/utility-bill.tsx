'use client';
import React, { useEffect, useState, useMemo } from 'react';
import { authenticatedApi } from '@/config/api';
import { Button } from '@/components/ui/button';
import { Plus, Download, Loader2, ChevronRight, Search, X } from 'lucide-react';
import { CustomDataGrid, ColumnDef } from '@/components/ui/DataGrid';
import { useRouter } from 'next/navigation';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import ActionSidebar from '@/components/ui/action-aside';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Helper function to construct logo URL
const getLogoUrl = (logoPath: string | null): string => {
  if (!logoPath) {
    return '/assets/images/Logo-RTech.jpeg'; // Use existing RTech logo as fallback
  }
  
  // If it's already a full URL, return as is
  if (logoPath.startsWith('http://') || logoPath.startsWith('https://')) {
    return logoPath;
  }
  
  // If it's a relative path, construct full URL using NEXT_PUBLIC_APP_URL from env
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_API_URL || '';
  if (appUrl && logoPath.startsWith('/')) {
    return `${appUrl}${logoPath}`;
  }
  
  // Default fallback - try as relative path first
  return logoPath || '/assets/images/Logo-RTech.jpeg';
};

interface UtilityBill {
  util_id: number;
  // nested account object from backend
  account: {
    bill_id: number;
    bill_ac?: string | null;
    beneficiary?: { id?: number; name?: string; logo?: string; prepared_by?: any } | null;
    service?: string | null;
    desc?: string | null;
    costcenter?: { id?: number; name?: string } | null;
    location?: { id?: number; name?: string } | null;
  };
  // billing fields
  ubill_date: string;
  ubill_no: string;
  ubill_stotal: string | null;
  ubill_tax: string | null;
  ubill_disc: string | null;
  ubill_round: string | null;
  ubill_rent: string | null;
  ubill_bw: string | null;
  ubill_color: string | null;
  ubill_gtotal: string | null;
  ubill_paystat: string | null;
  ubill_payref: string | null;
  // legacy helpers for grid display (filled at fetch time)
  service?: string;
  provider?: string;
  costcenter_name?: string;
}

interface BillingAccount {
  bill_id: number;
  bill_ac: string | null;
  provider: string | null;
  logo: string | null;
  service: string | null;
  bfcy_id: number;
  cat_id: number;
  bill_product: string | null;
  bill_desc: string | null;
  cc_id: number;
  bill_loc: string | null;
  loc_id: number;
  bill_depo: string;
  bill_mth: string;
  bill_stat: string;
  bill_consumable: string;
  bill_cont_start: string;
  bill_cont_end: string;
  bill_total: string;
  bill_count: number;
  bill_dt: string;
  bill_bfcy: string;
  bfcy_cat: string;
  billowner: string;
}

interface UtilityBillForm {
  bill_id?: number;
  utility_id?: number;
  loc_id?: string;
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
  const [sidebarOpen, setSidebarOpen] = useState(true); // Default open
  const [saving, setSaving] = useState(false);
  const [editingBill, setEditingBill] = useState<UtilityBill | null>(null);
  const [costCenters, setCostCenters] = useState<{ id: string; name: string }[]>([]);
  const [billingAccounts, setBillingAccounts] = useState<BillingAccount[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [yearFilter, setYearFilter] = useState<string>(String(new Date().getFullYear()));
  const [selectedAccount, setSelectedAccount] = useState<BillingAccount | null>(null);
  const [sidebarSize, setSidebarSize] = useState<'sm' | 'lg'>('sm');
  const router = useRouter();

  // Memoized accounts with processed logo URLs to prevent repetitive fetching
  const accountsWithLogos = useMemo(() => {
    console.log('Processing logo URLs for', billingAccounts.length, 'accounts');
    return billingAccounts.map(account => ({
      ...account,
      logoUrl: getLogoUrl(account.logo)
    }));
  }, [billingAccounts]);

  // Filter memoized accounts with provider prioritization
  const filteredAccountsWithLogos = useMemo(() => {
    if (searchTerm.trim() === '') {
      return accountsWithLogos;
    } else {
      const searchLower = searchTerm.toLowerCase();
      const filtered = accountsWithLogos.filter((account) => 
        (account.service?.toLowerCase() || '').includes(searchLower) ||
        (account.provider?.toLowerCase() || '').includes(searchLower) ||
        (account.bill_ac?.toLowerCase() || '').includes(searchLower) ||
        (account.bill_product?.toLowerCase() || '').includes(searchLower)
      );
      
      // Sort with provider matches first
      return filtered.sort((a, b) => {
        const aProviderMatch = (a.provider?.toLowerCase() || '').includes(searchLower);
        const bProviderMatch = (b.provider?.toLowerCase() || '').includes(searchLower);
        
        if (aProviderMatch && !bProviderMatch) return -1;
        if (!aProviderMatch && bProviderMatch) return 1;
        return 0;
      });
    }
  }, [accountsWithLogos, searchTerm]);

  const [formData, setFormData] = useState<UtilityBillForm>({
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

  const fetchBillingAccounts = async () => {
    try {
      const response = await authenticatedApi.get('/api/bills/util/accounts');
      if ((response.data as any)?.data) {
        setBillingAccounts((response.data as any).data);
        setBillingAccounts((response.data as any).data);
      }
    } catch (error) {
      console.error('Error fetching billing accounts:', error);
      setBillingAccounts([]);
      setBillingAccounts([]);
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

    // Search functionality - now handled by useMemo
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
  };

  // Account selection handler
  const handleAccountSelect = (account: BillingAccount) => {
    setSelectedAccount(account);
    setSidebarSize('lg');
    // Pre-fill form with account data and reset financial fields
    setFormData(prev => ({
      ...prev,
      utility_id: account.bill_id,
      // Reset financial fields for new bill
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
    }));
  };

  const resetForm = () => {
    setFormData({
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
    setSelectedAccount(null);
    setSearchTerm('');
    setSidebarSize('sm');
  };

  const handleAdd = () => {
    resetForm();
    setSelectedAccount(null);
    setSidebarSize('sm');
    if (!sidebarOpen) {
      setSidebarOpen(true);
    }
  };

  const handleRowDoubleClick = (bill: UtilityBill & { rowNumber: number }) => {
    setFormData({
      bill_id: bill.account?.bill_id,
      utility_id: bill.account?.bill_id,
      cc_id: bill.account?.costcenter ? String(bill.account.costcenter.id) : 'none',
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
    setSelectedAccount(null); // Clear selected account when editing
    setSidebarSize('lg'); // Go directly to form for editing
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
        cc_id: (formData.cc_id && formData.cc_id !== 'none') ? parseInt(formData.cc_id) : null,
        ubill_date: formData.ubill_date ? new Date(formData.ubill_date).toISOString() : null,
      };

      if (editingBill) {
        // Update existing bill (use util_id)
        await authenticatedApi.put(`/api/bills/util/${editingBill.util_id}`, payload);
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
        const filtered = (data as any[]).filter((item: any) => {
          if (!yearFilter || yearFilter === 'all') return true;
          if (!item.ubill_date) return false;
          try { return new Date(item.ubill_date).getFullYear() === Number(yearFilter); } catch { return false; }
        });

        setRows(filtered.map((item: any, idx: number) => ({
          ...item,
          rowNumber: idx + 1,
          service: item.account?.service || '',
          provider: item.account?.beneficiary?.name || item.account?.provider || '',
          costcenter_name: item.account?.costcenter?.name || '',
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
    fetchBillingAccounts();
  }, []);

  useEffect(() => {
    fetchUtilityBills();
  }, [yearFilter]);

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
        <div className="flex items-center gap-2">
          <div className="flex items-center">
            <Select value={yearFilter} onValueChange={(v) => setYearFilter(v)}>
              <SelectTrigger className="w-28 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All years</SelectItem>
                {Array.from({ length: 6 }).map((_, i) => {
                  const y = String(new Date().getFullYear() - i);
                  return (<SelectItem key={y} value={y}>{y}</SelectItem>);
                })}
              </SelectContent>
            </Select>
          </div>
          <Button
            variant={'default'}
            onClick={handleAdd}
            disabled={loading}
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
          </Button>
        </div>
      </div>
      <CustomDataGrid
        columns={columns as ColumnDef<unknown>[]}
        data={rows}
        pagination={false}
        inputFilter={false}
        theme="sm"
        dataExport={true}
        onRowDoubleClick={handleRowDoubleClick}
        rowSelection={{
          enabled: true,
          getRowId: (row: any) => row.util_id || row.account?.bill_id,
          onSelect: (selectedKeys: (string | number)[], selectedRows: any[]) => {
            setSelectedRowIds(selectedKeys.map(Number));
          },
        }}
      />

      <ActionSidebar
        isOpen={sidebarOpen}
        title={
          editingBill 
            ? `Edit Bill - ${editingBill.account?.service || 'Utility Bill'}` 
            : selectedAccount 
            ? `New Bill - ${selectedAccount.service} (${selectedAccount.provider})` 
            : 'Utility Billing Accounts'
        }
        onClose={() => {
          setSidebarOpen(false);
          setSelectedAccount(null);
          setSidebarSize('sm');
          resetForm();
        }}
        size={sidebarSize}
        content={
          <div className={`flex ${sidebarSize === 'lg' ? 'space-x-6' : ''} h-full`}>
            {/* Left Column - Billing Accounts List */}
            <div className={`${sidebarSize === 'lg' ? 'w-1/3' : 'w-full'} space-y-4`}>
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search by provider, service, account..."
                    value={searchTerm}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                {/* Search results indicator */}
                {searchTerm && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 px-1">
                    {filteredAccountsWithLogos.length} result{filteredAccountsWithLogos.length !== 1 ? 's' : ''} for "{searchTerm}"
                  </div>
                )}
                
                <div className="max-h-[600px] overflow-y-auto space-y-2">
                  {filteredAccountsWithLogos.map((account) => (
                    <div
                      key={account.bill_id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 ${
                        selectedAccount?.bill_id === account.bill_id 
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                          : 'border-gray-200 dark:border-gray-700'
                      }`}
                      onClick={() => handleAccountSelect(account)}
                    >
                      <div className="flex items-center space-x-3">
                        {/* Logo on the left */}
                        <div className="flex-shrink-0">
                          <img
                            src={
                              ((account as any).account?.beneficiary?.logo) ? getLogoUrl((account as any).account.beneficiary.logo) : (account.logoUrl || getLogoUrl(account.logo || null))
                            }
                            alt={account.provider || (account as any).account?.beneficiary?.name || 'Provider'}
                            className="w-12 h-12 rounded-0 object-cover bg-gray-100 dark:bg-gray-800"
                            onError={(e) => {
                              const img = e.target as HTMLImageElement;
                              // Only set fallback once to prevent infinite loops
                              if (!img.src.includes('Logo-RTech.jpeg')) {
                                img.src = '/assets/images/Logo-RTech.jpeg';
                              }
                            }}
                          />
                        </div>
                        
                        {/* Provider details stacked on the right */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                            {account.provider || 'Unknown Provider'}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-300 truncate">
                            Account: {account.bill_ac || 'N/A'}
                          </p>
                          <p className="text-xs text-blue-600 dark:text-blue-400 truncate">
                            {account.service || 'Unknown Service'}
                          </p>
                        </div>
                        
                        {sidebarSize === 'sm' && (
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                    </div>
                  ))}
                  {filteredAccountsWithLogos.length === 0 && (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      {searchTerm ? (
                        <div>
                          <p>No accounts found for "{searchTerm}"</p>
                          <p className="text-xs mt-1">Try searching by provider, service, or account number</p>
                        </div>
                      ) : (
                        <p>No billing accounts found</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column - Form (only shown when lg size) */}
            {sidebarSize === 'lg' && (selectedAccount || editingBill) && (
              <div className="w-2/3 border-l pl-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Cost Center */}
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
            )}
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
