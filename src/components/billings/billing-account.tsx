'use client';
import React, { useEffect, useState } from 'react';
import { authenticatedApi } from '@/config/api';
import { Button } from '@/components/ui/button';
import { Plus, Loader2 } from 'lucide-react';
import { CustomDataGrid, ColumnDef } from '@/components/ui/DataGrid';
import ActionSidebar from '@/components/ui/action-aside';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface BillingAccount {
  bill_id: number;
  bill_ac: string;
  provider: string;
  service: string;
  bfcy_id: number;
  cat_id: number;
  bill_product: string;
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
}

interface BillingAccountForm {
  bill_ac: string;
  provider: string;
  service: string;
  bill_product: string;
  bill_desc: string;
  cc_id: string;
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
  
  const [formData, setFormData] = useState<BillingAccountForm>({
    bill_ac: '',
    provider: '',
    service: 'utilities',
    bill_product: '',
    bill_desc: '',
    cc_id: 'none',
    bill_loc: '',
    bill_depo: '0.00',
    bill_mth: '0.00',
    bill_stat: 'Active',
    bill_consumable: 'nc',
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
  }, []);

  const handleInputChange = (field: keyof BillingAccountForm, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const resetForm = () => {
    setFormData({
      bill_ac: '',
      provider: '',
      service: 'utilities',
      bill_product: '',
      bill_desc: '',
      cc_id: 'none',
      bill_loc: '',
      bill_depo: '0.00',
      bill_mth: '0.00',
      bill_stat: 'Active',
      bill_consumable: 'nc',
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
      provider: account.provider || '',
      service: account.service || '',
      bill_product: account.bill_product || '',
      bill_desc: account.bill_desc || '',
      cc_id: account.cc_id ? account.cc_id.toString() : 'none',
      bill_loc: account.bill_loc || '',
      bill_depo: account.bill_depo || '0.00',
      bill_mth: account.bill_mth || '0.00',
      bill_stat: account.bill_stat || 'Active',
      bill_consumable: account.bill_consumable || 'nc',
      bill_cont_start: account.bill_cont_start ? new Date(account.bill_cont_start).toISOString().split('T')[0] : '',
      bill_cont_end: account.bill_cont_end ? new Date(account.bill_cont_end).toISOString().split('T')[0] : '',
      billowner: account.billowner || '',
    });
    setEditingAccount(account);
    setSidebarOpen(true);
  };

  const handleSave = async () => {
    if (!formData.bill_ac || !formData.provider || !formData.service) {
      toast.error('Please fill in required fields: Account Number, Provider, and Service');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...formData,
        cc_id: (formData.cc_id && formData.cc_id !== 'none') ? parseInt(formData.cc_id) : null,
        bill_cont_start: formData.bill_cont_start ? new Date(formData.bill_cont_start).toISOString() : null,
        bill_cont_end: formData.bill_cont_end ? new Date(formData.bill_cont_end).toISOString() : null,
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

  const columns: ColumnDef<BillingAccount>[] = [
    { key: 'bill_ac', header: 'Account No', filter: 'input' },
    { key: 'provider', header: 'Provider', filter: 'singleSelect' },
    { key: 'service', header: 'Service', filter: 'singleSelect' },
    { key: 'bill_product', header: 'Product', filter: 'input' },
    { key: 'bill_desc', header: 'Description' },
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
        pagination={true}
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
          content={
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <Label htmlFor="provider">Provider *</Label>
                  <Input
                    id="provider"
                    value={formData.provider}
                    onChange={(e) => handleInputChange('provider', e.target.value)}
                    placeholder="Enter provider name"
                  />
                </div>

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
                  <Label htmlFor="bill_product">Product</Label>
                  <Input
                    id="bill_product"
                    value={formData.bill_product}
                    onChange={(e) => handleInputChange('bill_product', e.target.value)}
                    placeholder="Enter product name"
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

                <div className="space-y-2">
                  <Label htmlFor="cc_id">Cost Center</Label>
                  <Select value={formData.cc_id} onValueChange={(value) => handleInputChange('cc_id', value)}>
                    <SelectTrigger className='w-full'>
                      <SelectValue placeholder="Select cost center" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {costCenters.map(cc => (
                        <SelectItem key={cc.id} value={cc.id}>
                          {cc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bill_loc">Location</Label>
                  <Input
                    id="bill_loc"
                    value={formData.bill_loc}
                    onChange={(e) => handleInputChange('bill_loc', e.target.value)}
                    placeholder="Enter location"
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

                <div className="space-y-2">
                  <Label htmlFor="bill_consumable">Consumable</Label>
                  <Select value={formData.bill_consumable} onValueChange={(value) => handleInputChange('bill_consumable', value)}>
                    <SelectTrigger className='w-full'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nc">No</SelectItem>
                      <SelectItem value="c">Yes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

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

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="billowner">Bill Owner</Label>
                  <Input
                    id="billowner"
                    value={formData.billowner}
                    onChange={(e) => handleInputChange('billowner', e.target.value)}
                    placeholder="Enter bill owner"
                  />
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
