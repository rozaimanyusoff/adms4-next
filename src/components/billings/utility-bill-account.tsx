'use client';
import React, { useEffect, useState, useMemo } from 'react';
import { authenticatedApi } from '@/config/api';
import { Button } from '@/components/ui/button';
import { Plus, Loader2 } from 'lucide-react';
import { CustomDataGrid, ColumnDef } from '@/components/ui/DataGrid';
import ActionSidebar from '@/components/ui/action-aside';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SearchableSelect } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface BillingAccount {
  bill_id: number;
  account: string; // was bill_ac
  category?: string; // was service
  description?: string; // was bill_desc
  status?: string; // was bill_stat
  contract_start?: string;
  contract_end?: string;
  // optional financial fields left untouched
  deposit?: string;
  rental?: string;
  // nested objects
  beneficiary?: { id: number; name: string; logo?: string } | null;
  costcenter?: { id: number; name: string } | null;
  location?: { id: number; name: string } | null;
}

interface BillingAccountForm {
  account: string;
  category: string;
  description: string;
  cc_id: string;
  beneficiary_id?: string;
  location_id?: string;
  deposit?: string;
  rental?: string;
  status: string;
  contract_start: string;
  contract_end: string;
}

const BillingAccount = () => {
  const [accounts, setAccounts] = useState<BillingAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BillingAccount | null>(null);
  const [costCenters, setCostCenters] = useState<{ id: string; name: string }[]>([]);
  // provider removed; beneficiaries are used instead
  const [beneficiariesList, setBeneficiariesList] = useState<{ id: number; name: string }[]>([]);
  const [locationsList, setLocationsList] = useState<{ id: number; name: string }[]>([]);

  // Service to provider mapping
  const [formData, setFormData] = useState<BillingAccountForm>({
    account: '',
    category: 'utilities',
    description: '',
    cc_id: 'none',
    beneficiary_id: undefined,
    location_id: '',
    deposit: '0.00',
    rental: '0.00',
    status: 'Active',
    contract_start: '',
    contract_end: '',
  });

  // Fetch accounts data
  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const response = await authenticatedApi.get('/api/bills/util/accounts');
      if ((response.data as any)?.status === 'success') {
        setAccounts((response.data as any).data || []);
      }
    } catch (error) {
      toast.error('Failed to fetch billing accounts');
      console.error('Error fetching accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch cost centers
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

  useEffect(() => {
    fetchAccounts();
    fetchCostCenters();
    // Fetch beneficiaries filtered by default category
    fetchBeneficiaries(formData.category);
    fetchLocations();
    // no provider list — beneficiaries represent providers
  }, []);

  const fetchBeneficiaries = async (service?: string) => {
    try {
      const url = service ? `/api/bills/util/beneficiaries?services=${encodeURIComponent(service)}` : '/api/bills/util/beneficiaries';
      const res: any = await authenticatedApi.get(url);
  const list = res.data?.data || res.data || [];
  const normalized = Array.isArray(list) ? list.map((b: any) => ({ id: b.id, name: b.name })) : [];
      setBeneficiariesList(normalized);
      // Clear selected beneficiary if it's not in the new list
      setFormData(prev => {
        if (prev.beneficiary_id && !normalized.find(nb => String(nb.id) === String(prev.beneficiary_id))) {
          return { ...prev, beneficiary_id: undefined };
        }
        return prev;
      });
    } catch (err) {
      console.error('fetch beneficiaries', err);
    }
  };

  // Refetch beneficiaries when category selection changes
  useEffect(() => {
    fetchBeneficiaries(formData.category);
  }, [formData.category]);

  const fetchLocations = async () => {
    try {
      const res: any = await authenticatedApi.get('/api/assets/locations');
      const list = res.data?.data || res.data || [];
      setLocationsList(Array.isArray(list) ? list.map((l: any) => ({ id: l.id?.toString() ?? String(l.id ?? ''), name: l.name || l.location || l.label || '' })) : []);
    } catch (err) {
      console.error('fetch locations', err);
    }
  };

  // no provider handling — beneficiaries replace provider

  const handleInputChange = (field: keyof BillingAccountForm, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const resetForm = () => {
    setFormData({
  account: '',
  category: 'utilities',
  description: '',
  cc_id: 'none',
  beneficiary_id: undefined,
  location_id: '',
  deposit: '0.00',
  rental: '0.00',
  status: 'Active',
  contract_start: '',
  contract_end: '',
    });
    setEditingAccount(null);
  };

  const handleAdd = () => {
    resetForm();
    setSidebarOpen(true);
  };

  const handleRowDoubleClick = (account: BillingAccount) => {
    setFormData({
  account: account.account || '',
  category: account.category || '',
  // description
  description: account.description || '',
  cc_id: (account.costcenter ? String(account.costcenter.id) : 'none'),
  beneficiary_id: account.beneficiary ? String(account.beneficiary.id) : undefined,
  location_id: (account.location ? String(account.location.id) : ''),
  deposit: account.deposit || '0.00',
  rental: account.rental || '0.00',
  status: account.status || 'Active',
  contract_start: safeToInputDate(account.contract_start),
  contract_end: safeToInputDate(account.contract_end),
    });
    setEditingAccount(account);
  // Open the sidebar to edit the selected account when double-clicked
  setSidebarOpen(true);
  };

  const handleSave = async () => {
    if (!formData.account || !formData.beneficiary_id || !formData.category) {
      toast.error('Please fill in required fields: Account Number, Beneficiary, and Category');
      return;
    }

    setSaving(true);
    try {
      // Build explicit payload to match backend expected field names
      const payload = {
        account: formData.account,
        category: formData.category,
        description: formData.description,
        // cost center -> numeric id or null
        costcenter_id: (formData.cc_id && formData.cc_id !== 'none') ? parseInt(formData.cc_id) : null,
        // beneficiary id
        beneficiary_id: formData.beneficiary_id ? parseInt(formData.beneficiary_id) : null,
        // location
        location_id: formData.location_id ? parseInt(formData.location_id) : null,
        deposit: formData.deposit || '0.00',
        rental: formData.rental || '0.00',
        status: formData.status,
        // send date-only string (YYYY-MM-DD) to match DB DATE column expectations
        contract_start: formData.contract_start ? formData.contract_start : null,
        contract_end: formData.contract_end ? formData.contract_end : null,
      };

      if (editingAccount) {
        // Update existing account
  await authenticatedApi.put(`/api/bills/util/accounts/${editingAccount.bill_id}`, payload);
        toast.success('Billing account updated successfully');
      } else {
        // Create new account
  await authenticatedApi.post('/api/bills/util/accounts', payload);
        toast.success('Billing account created successfully');
      }

      setSidebarOpen(false);
      resetForm();
      fetchAccounts();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save billing account');
      console.error('Error saving account:', error);
    } finally {
      setSaving(false);
    }
  };

  const columns: ColumnDef<any>[] = [
    { key: 'bill_id', header: '#', sortable: true },
    { key: 'logo', header: 'Logo', render: (r: any) => {
      const src = r?.beneficiary?.logo || r?.beneficiary?.bfcy_logo || r?.logo || r?.bfcy_pic;
      const alt = r?.beneficiary?.name || r?.beneficiary?.bfcy_name || r?.bill_bfcy || 'logo';
      return src ? (<span>{ }<img src={src} alt={alt} className="w-8 h-8 object-contain rounded" /></span>) : null;
    } },
    { key: 'account', header: 'Account No', filter: 'input' },
    { key: 'category', header: 'Category', filter: 'singleSelect' },
    { key: 'beneficiary', header: 'Beneficiary', filter: 'singleSelect', render: (r: any) => r?.beneficiary?.name || '' },
    { key: 'description', header: 'Description', filter: 'input' },
    { key: 'costcenter', header: 'Cost Center', render: (r: any) => r?.costcenter?.name || '-' },
    { key: 'location', header: 'Location', render: (r: any) => r?.location?.name || '-' },
    { key: 'status', header: 'Status', filter: 'singleSelect' },
    {
      key: 'contract_start',
      header: 'Contract Start',
      render: (row) => {
        const val = row.contract_start;
        if (!val) return '-';
        const d = new Date(val);
        return isNaN(d.getTime()) ? '-' : d.toLocaleDateString();
      }
    },
    {
      key: 'contract_end',
      header: 'Contract End',
      render: (row) => {
        const val = row.contract_end;
        if (!val) return '-';
        const d = new Date(val);
        return isNaN(d.getTime()) ? '-' : d.toLocaleDateString();
      }
    },
  ];

  // Helpers: safely format dates for display and for date-input value (YYYY-MM-DD)
  const safeToInputDate = (value?: string | null) => {
    if (!value) return '';
    const d = new Date(value);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().split('T')[0];
  };

  const rows = accounts.map((account, index) => ({
    ...account,
    rowNumber: index + 1,
  }));

  // Summaries: counts by status and by category
  const statusCounts = useMemo(() => {
    const map: Record<string, number> = {};
    accounts.forEach(a => {
      const key = (a.status || 'Unknown') as string;
      map[key] = (map[key] || 0) + 1;
    });
    return map;
  }, [accounts]);

  const categoryCounts = useMemo(() => {
    const map: Record<string, number> = {};
    accounts.forEach(a => {
      const key = (a.category || 'Uncategorized') as string;
      map[key] = (map[key] || 0) + 1;
    });
    return map;
  }, [accounts]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="col-span-1 md:col-span-1 bg-card border p-3 rounded">
          <h3 className="text-sm font-semibold">Status Summary</h3>
          <div className="mt-2 space-y-1">
            {Object.entries(statusCounts).map(([k, v]) => (
              <div key={k} className="flex justify-between text-sm">
                <div className="capitalize">{k}</div>
                <div className="font-medium">{v}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="col-span-1 md:col-span-1 bg-card border p-3 rounded">
          <h3 className="text-sm font-semibold">Category Summary</h3>
          <div className="mt-2 space-y-1">
            {Object.entries(categoryCounts).map(([k, v]) => (
              <div key={k} className="flex justify-between text-sm">
                <div className="capitalize">{k}</div>
                <div className="font-medium">{v}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="col-span-1 md:col-span-1 bg-card border p-3 rounded flex items-center justify-center">
          <div className="text-center">
            <h3 className="text-sm font-semibold">Total Accounts</h3>
            <div className="text-2xl font-bold mt-2">{accounts.length}</div>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Billing Accounts</h2>
          <p className="text-sm text-muted-foreground">Manage utility billing account records</p>
        </div>
        <Button onClick={handleAdd}>
          <Plus size={18} />
        </Button>
      </div>

      <CustomDataGrid
        columns={columns as ColumnDef<unknown>[]}
        data={rows}
        pagination={false}
        inputFilter={false}
        theme="sm"
        dataExport={true}
        onRowDoubleClick={handleRowDoubleClick}
        rowClass={(row: any) => row.status === 'Terminated' ? 'bg-red-50' : ''}
      />

      {sidebarOpen && (
        <ActionSidebar
          title={editingAccount ? 'Edit Billing Account' : 'Add New Billing Account'}
          onClose={() => {
            setSidebarOpen(false);
            resetForm();
          }}
          size={'sm'}
          content={
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                    <SelectTrigger className='w-full'>
                      <SelectValue placeholder="Select service type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="utilities">Utilities</SelectItem>
                      <SelectItem value="rental">Rental</SelectItem>
                      <SelectItem value="services">Services</SelectItem>
                      <SelectItem value="printing">Printing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bfcy_id">Beneficiary</Label>
                  <SearchableSelect
                    options={beneficiariesList.map(b => ({ value: String(b.id), label: b.name }))}
                    value={formData.beneficiary_id ? String(formData.beneficiary_id) : ''}
                    onValueChange={(val) => setFormData(prev => ({ ...prev, beneficiary_id: val }))}
                    placeholder="Search beneficiary..."
                    searchPlaceholder="Type to search beneficiary"
                    emptyMessage="No beneficiaries found for selected category"
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Enter description"
                    rows={2}
                  />
                </div>
                {/* Product field removed */}
                <div className="space-y-2">
                  <Label htmlFor="account">Account Number *</Label>
                  <Input
                    id="account"
                    value={formData.account}
                    onChange={(e) => handleInputChange('account', e.target.value)}
                    placeholder="Enter account number"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="deposit">Deposit</Label>
                  <Input
                    id="deposit"
                    type="number"
                    step="0.01"
                    value={formData.deposit}
                    onChange={(e) => handleInputChange('deposit', e.target.value)}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rental">Monthly/Rental</Label>
                  <Input
                    id="rental"
                    type="number"
                    step="0.01"
                    value={formData.rental}
                    onChange={(e) => handleInputChange('rental', e.target.value)}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cc_id">Cost Center</Label>
                  <SearchableSelect
                    options={[{ value: 'none', label: 'None' }, ...costCenters.map(cc => ({ value: cc.id, label: cc.name }))]}
                    value={formData.cc_id || 'none'}
                    onValueChange={(val) => setFormData(prev => ({ ...prev, cc_id: val }))}
                    placeholder="Search or select cost center"
                    searchPlaceholder="Type to search cost center"
                    emptyMessage="No cost centers found"
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location_id">Location</Label>
                  <SearchableSelect
                    options={locationsList.map(l => ({ value: String(l.id), label: l.name }))}
                    value={formData.location_id ? String(formData.location_id) : ''}
                    onValueChange={(val) => setFormData(prev => ({ ...prev, location_id: val }))}
                    placeholder="Search or select location"
                    searchPlaceholder="Type to search location"
                    emptyMessage="No locations found"
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contract_start">Contract Start</Label>
                  <Input
                    id="contract_start"
                    type="date"
                    value={formData.contract_start}
                    onChange={(e) => handleInputChange('contract_start', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contract_end">Contract End</Label>
                  <Input
                    id="contract_end"
                    type="date"
                    value={formData.contract_end}
                    onChange={(e) => handleInputChange('contract_end', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
                    <SelectTrigger className='w-full'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Inactive">Inactive</SelectItem>
                      <SelectItem value="Suspended">Suspended</SelectItem>
                      <SelectItem value="Terminated">Terminated</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setSidebarOpen(false)}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving && <Loader2 className="animate-spin mr-2" size={16} />}
                  {editingAccount ? 'Update' : 'Create'}
                </Button>
              </div>
            </div>
          }
        />
      )}
    </div>
  );
};

export default BillingAccount;
