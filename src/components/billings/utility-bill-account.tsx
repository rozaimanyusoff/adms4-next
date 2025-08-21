'use client';
import React, { useEffect, useState } from 'react';
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
  bill_ac: string;
  service: string;
  provider?: string | null;
  bfcy_id: number;
  cat_id: number;
  // bill_product removed
  bill_product?: string | null;
  bill_desc: string;
  cc_id: number;
  bill_loc: string;
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
  // new nested shapes from backend
  beneficiary?: { bfcy_id: number; bfcy_name: string; logo?: string } | null;
  costcenter?: { id: number; name: string } | null;
  location?: { id: number; name: string } | null;
  prepared_by?: string | null;
}

interface BillingAccountForm {
  bill_ac: string;
  service: string;
  // bill_product removed
  bill_desc: string;
  cc_id: string;
  bfcy_id?: string;
  location_id?: string;
  bill_loc: string;
  bill_depo: string;
  bill_mth: string;
  bill_stat: string;
  bill_consumable: string;
  bill_cont_start: string;
  bill_cont_end: string;
  billowner: string;
}

const BillingAccount = () => {
  const [accounts, setAccounts] = useState<BillingAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BillingAccount | null>(null);
  const [costCenters, setCostCenters] = useState<{ id: string; name: string }[]>([]);
  // provider removed; beneficiaries are used instead
  const [beneficiariesList, setBeneficiariesList] = useState<{ bfcy_id: number; bfcy_name: string }[]>([]);
  const [locationsList, setLocationsList] = useState<{ id: number; name: string }[]>([]);

  // Service to provider mapping
  const [formData, setFormData] = useState<BillingAccountForm>({
    bill_ac: '',
    service: 'utilities',
    bill_desc: '',
    cc_id: 'none',
    bfcy_id: undefined,
    location_id: '',
    bill_loc: '',
    bill_depo: '0.00',
    bill_mth: '0.00',
    bill_stat: 'Active',
    bill_consumable: 'yes',
    bill_cont_start: '',
    bill_cont_end: '',
    billowner: '',
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
    // Fetch beneficiaries filtered by default service
    fetchBeneficiaries(formData.service);
    fetchLocations();
    // no provider list — beneficiaries represent providers
  }, []);

  const fetchBeneficiaries = async (service?: string) => {
    try {
      const url = service ? `/api/bills/util/beneficiaries?services=${encodeURIComponent(service)}` : '/api/bills/util/beneficiaries';
      const res: any = await authenticatedApi.get(url);
      const list = res.data?.data || res.data || [];
      const normalized = Array.isArray(list) ? list.map((b: any) => ({ bfcy_id: b.bfcy_id, bfcy_name: b.bfcy_name })) : [];
      setBeneficiariesList(normalized);
      // Clear selected beneficiary if it's not in the new list
      setFormData(prev => {
        if (prev.bfcy_id && !normalized.find(nb => String(nb.bfcy_id) === String(prev.bfcy_id))) {
          return { ...prev, bfcy_id: undefined };
        }
        return prev;
      });
    } catch (err) {
      console.error('fetch beneficiaries', err);
    }
  };

  // Refetch beneficiaries when service selection changes
  useEffect(() => {
    fetchBeneficiaries(formData.service);
  }, [formData.service]);

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
      bill_ac: '',
      service: 'utilities',
      bill_desc: '',
      cc_id: 'none',
      bfcy_id: undefined,
      location_id: '',
      bill_loc: '',
      bill_depo: '0.00',
      bill_mth: '0.00',
      bill_stat: 'Active',
      bill_consumable: 'yes',
      bill_cont_start: '',
      bill_cont_end: '',
      billowner: '',
    });
    setEditingAccount(null);
  };

  const handleAdd = () => {
    resetForm();
    setSidebarOpen(true);
  };

  const handleRowDoubleClick = (account: BillingAccount) => {
    setFormData({
      bill_ac: account.bill_ac || '',
      service: account.service || '',
      // bill_product removed
      bill_desc: account.bill_desc || '',
  cc_id: (account.cc_id ? account.cc_id.toString() : (account.costcenter ? String(account.costcenter.id) : 'none')),
  bfcy_id: account.bfcy_id ? String(account.bfcy_id) : (account.beneficiary ? String(account.beneficiary.bfcy_id) : undefined),
  location_id: (account.loc_id ? String(account.loc_id) : (account.location ? String(account.location.id) : '')),
      bill_loc: account.bill_loc || '',
      bill_depo: account.bill_depo || '0.00',
      bill_mth: account.bill_mth || '0.00',
      bill_stat: account.bill_stat || 'Active',
      // convert backend 'c'/'nc' to form 'yes'/'no'
  bill_consumable: account.bill_consumable === 'c' ? 'yes' : 'no',
      bill_cont_start: account.bill_cont_start ? new Date(account.bill_cont_start).toISOString().split('T')[0] : '',
      bill_cont_end: account.bill_cont_end ? new Date(account.bill_cont_end).toISOString().split('T')[0] : '',
      billowner: account.billowner || '',
    });
    setEditingAccount(account);
    setSidebarOpen(true);
  };

  const handleSave = async () => {
    if (!formData.bill_ac || !formData.bfcy_id || !formData.service) {
      toast.error('Please fill in required fields: Account Number, Beneficiary, and Service');
      return;
    }

    setSaving(true);
    try {
      // Build explicit payload to match backend expected field names
      const payload = {
        bill_ac: formData.bill_ac,
        service: formData.service,
        bill_desc: formData.bill_desc,
        // cost center -> numeric id or null
  cc_id: (formData.cc_id && formData.cc_id !== 'none') ? parseInt(formData.cc_id) : null,
        // beneficiary id
  bfcy_id: formData.bfcy_id ? parseInt(formData.bfcy_id) : null,
        // backend expects loc_id for location reference
  loc_id: formData.location_id ? parseInt(formData.location_id) : null,
        bill_depo: formData.bill_depo || '0.00',
        bill_mth: formData.bill_mth || '0.00',
        bill_stat: formData.bill_stat,
        // convert form 'yes'/'no' back to backend 'c'/'nc'
        bill_consumable: formData.bill_consumable === 'yes' ? 'c' : 'nc',
  // send date-only string (YYYY-MM-DD) to match DB DATE column expectations
  bill_cont_start: formData.bill_cont_start ? formData.bill_cont_start : null,
  bill_cont_end: formData.bill_cont_end ? formData.bill_cont_end : null,
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
    { key: 'rowNumber', header: '#', render: (r: any) => r.rowNumber },
    { key: 'logo', header: 'Logo', render: (r: any) => {
      // support multiple possible backend shapes
      const src = r?.beneficiary?.logo || r?.beneficiary?.bfcy_logo || r?.beneficiary?.bfcy_pic || r?.bfcy_logo || r?.logo || r?.bfcy_pic;
      const alt = r?.beneficiary?.bfcy_name || r?.bfcy_name || r?.bill_bfcy || 'logo';
      return src ? (<span>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={src} alt={alt} className="w-8 h-8 object-contain rounded" /></span>) : null;
    } },
    { key: 'bill_ac', header: 'Account No', filter: 'input' },
    { key: 'service', header: 'Service', filter: 'singleSelect' },
  { key: 'provider', header: 'Provider', render: (r: any) => r.provider || r?.beneficiary?.bfcy_name || '' },
    // product column removed
    { key: 'bill_desc', header: 'Description' },
    { key: 'beneficiary', header: 'Beneficiary', render: (r: any) => r?.beneficiary?.bfcy_name || r?.bill_bfcy || '' },
    { key: 'costcenter', header: 'Cost Center', render: (r: any) => r?.costcenter?.name || '-' },
    { key: 'location', header: 'Location', render: (r: any) => r?.location?.name || (r?.bill_loc || '-') },
    { key: 'bill_stat', header: 'Status', filter: 'singleSelect' },
    {
      key: 'bill_cont_start',
      header: 'Contract Start',
      render: (row) => row.bill_cont_start ? new Date(row.bill_cont_start).toLocaleDateString() : '-'
    },
    {
      key: 'bill_cont_end',
      header: 'Contract End',
      render: (row) => row.bill_cont_end ? new Date(row.bill_cont_end).toLocaleDateString() : '-'
    },
  ];

  const rows = accounts.map((account, index) => ({
    ...account,
    rowNumber: index + 1,
  }));

  return (
    <div className="space-y-4">
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
      />

      {sidebarOpen && (
        <ActionSidebar
          title={editingAccount ? 'Edit Billing Account' : 'Add New Billing Account'}
          onClose={() => {
            setSidebarOpen(false);
            resetForm();
          }}
          size={'lg'}
          content={
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="service">Service *</Label>
                  <Select value={formData.service} onValueChange={(value) => handleInputChange('service', value)}>
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
                    options={beneficiariesList.map(b => ({ value: String(b.bfcy_id), label: b.bfcy_name }))}
                    value={formData.bfcy_id ? String(formData.bfcy_id) : ''}
                    onValueChange={(val) => setFormData(prev => ({ ...prev, bfcy_id: val }))}
                    placeholder="Search beneficiary..."
                    searchPlaceholder="Type to search beneficiary"
                    emptyMessage="No beneficiaries found for selected service"
                    className="w-full"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="bill_desc">Description</Label>
                  <Textarea
                    id="bill_desc"
                    value={formData.bill_desc}
                    onChange={(e) => handleInputChange('bill_desc', e.target.value)}
                    placeholder="Enter description"
                    rows={2}
                  />
                </div>
                {/* Product field removed */}
                <div className="md:col-span-2">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="bill_ac">Account Number *</Label>
                      <Input
                        id="bill_ac"
                        value={formData.bill_ac}
                        onChange={(e) => handleInputChange('bill_ac', e.target.value)}
                        placeholder="Enter account number"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bill_depo">Deposit</Label>
                      <Input
                        id="bill_depo"
                        type="number"
                        step="0.01"
                        value={formData.bill_depo}
                        onChange={(e) => handleInputChange('bill_depo', e.target.value)}
                        placeholder="0.00"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bill_mth">Monthly Amount</Label>
                      <Input
                        id="bill_mth"
                        type="number"
                        step="0.01"
                        value={formData.bill_mth}
                        onChange={(e) => handleInputChange('bill_mth', e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <div className="grid grid-cols-3">
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
                    <div className="space-y-2 flex items-center justify-center">
                      <div className="flex flex-col items-center">
                        <Label htmlFor="bill_consumable">Consumable?</Label>
                        <Checkbox
                        className='w-6 h-6'
                          checked={formData.bill_consumable === 'yes'}
                          onCheckedChange={(checked: any) => handleInputChange('bill_consumable', checked ? 'yes' : 'no')}
                        />
                      </div>
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
                  </div>
                </div>

                <div className="md:col-span-2">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="bill_cont_start">Contract Start</Label>
                      <Input
                        id="bill_cont_start"
                        type="date"
                        value={formData.bill_cont_start}
                        onChange={(e) => handleInputChange('bill_cont_start', e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bill_cont_end">Contract End</Label>
                      <Input
                        id="bill_cont_end"
                        type="date"
                        value={formData.bill_cont_end}
                        onChange={(e) => handleInputChange('bill_cont_end', e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bill_stat">Status</Label>
                      <Select value={formData.bill_stat} onValueChange={(value) => handleInputChange('bill_stat', value)}>
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
