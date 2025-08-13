'use client';
import React, { useEffect, useState } from 'react';
import { authenticatedApi } from '@/config/api';
import { Button } from '@/components/ui/button';
import { Plus, Loader2, Edit, Trash2 } from 'lucide-react';
import { CustomDataGrid, ColumnDef } from '@/components/ui/DataGrid';
import ActionSidebar from '@/components/ui/action-aside';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";

interface BillingProvider {
  provider_id: number;
  provider_name: string;
  service_type: string;
  provider_code: string;
  provider_desc: string;
  contact_person: string;
  contact_phone: string;
  contact_email: string;
  provider_address: string;
  provider_status: string;
  registration_date: string;
  last_updated: string;
}

interface BillingProviderForm {
  id?: string;
  provider_name: string;
  service_type: string;
  provider_code: string;
  provider_desc: string;
  contact_person: string;
  contact_phone: string;
  contact_email: string;
  provider_address: string;
  provider_status: string;
}

const UtilityBillProvider = () => {
  const [providers, setProviders] = useState<BillingProvider[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<BillingProvider | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [providerToDelete, setProviderToDelete] = useState<BillingProvider | null>(null);

  const [formData, setFormData] = useState<BillingProviderForm>({
    provider_name: '',
    service_type: 'utilities',
    provider_code: '',
    provider_desc: '',
    contact_person: '',
    contact_phone: '',
    contact_email: '',
    provider_address: '',
    provider_status: 'Active',
  });

  // Service type options
  const serviceTypes = [
    { value: 'utilities', label: 'Utilities' },
    { value: 'rental', label: 'Rental' },
    { value: 'services', label: 'Services' },
    { value: 'printing', label: 'Printing' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'insurance', label: 'Insurance' },
    { value: 'telecommunications', label: 'Telecommunications' },
  ];

  // Status options
  const statusOptions = [
    { value: 'Active', label: 'Active' },
    { value: 'Inactive', label: 'Inactive' },
    { value: 'Suspended', label: 'Suspended' },
  ];

  // Fetch providers data
  const fetchProviders = async () => {
    setLoading(true);
    try {
      const response = await authenticatedApi.get('/api/bills/util/providers');
      if ((response.data as any)?.status === 'success') {
        setProviders((response.data as any).data || []);
      }
    } catch (error) {
      toast.error('Failed to fetch billing providers');
      console.error('Error fetching providers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  const handleInputChange = (field: keyof BillingProviderForm, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const resetForm = () => {
    setFormData({
      provider_name: '',
      service_type: 'utilities',
      provider_code: '',
      provider_desc: '',
      contact_person: '',
      contact_phone: '',
      contact_email: '',
      provider_address: '',
      provider_status: 'Active',
    });
    setEditingProvider(null);
  };

  const handleAdd = () => {
    resetForm();
    setSidebarOpen(true);
  };

  const handleEdit = (provider: BillingProvider) => {
    setEditingProvider(provider);
    setFormData({
      provider_name: provider.provider_name || '',
      service_type: provider.service_type || 'utilities',
      provider_code: provider.provider_code || '',
      provider_desc: provider.provider_desc || '',
      contact_person: provider.contact_person || '',
      contact_phone: provider.contact_phone || '',
      contact_email: provider.contact_email || '',
      provider_address: provider.provider_address || '',
      provider_status: provider.provider_status || 'Active',
    });
    setSidebarOpen(true);
  };

  const handleDelete = (provider: BillingProvider) => {
    setProviderToDelete(provider);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!providerToDelete) return;

    try {
      const response = await authenticatedApi.delete(`/api/bills/util/providers/${providerToDelete.provider_id}`);
      if ((response.data as any)?.status === 'success') {
        toast.success('Provider deleted successfully');
        fetchProviders();
      } else {
        toast.error('Failed to delete provider');
      }
    } catch (error) {
      toast.error('Failed to delete provider');
      console.error('Error deleting provider:', error);
    } finally {
      setDeleteDialogOpen(false);
      setProviderToDelete(null);
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.provider_name || !formData.service_type || !formData.provider_code) {
      toast.error('Please fill in required fields: Provider Name, Service Type, and Provider Code');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...formData,
      };

      let response;
      if (editingProvider) {
        response = await authenticatedApi.put(`/api/bills/util/providers/${editingProvider.provider_id}`, payload);
      } else {
        response = await authenticatedApi.post('/api/bills/util/providers', payload);
      }

      if ((response.data as any)?.status === 'success') {
        toast.success(`Provider ${editingProvider ? 'updated' : 'created'} successfully`);
        setSidebarOpen(false);
        resetForm();
        fetchProviders();
      } else {
        toast.error(`Failed to ${editingProvider ? 'update' : 'create'} provider`);
      }
    } catch (error) {
      toast.error(`Failed to ${editingProvider ? 'update' : 'create'} provider`);
      console.error('Error saving provider:', error);
    } finally {
      setSaving(false);
    }
  };

  const columns: ColumnDef<BillingProvider>[] = [
    { key: 'provider_id', header: 'ID' },
    { key: 'provider_code', header: 'Code', filter: 'input' },
    { key: 'provider_name', header: 'Provider Name', filter: 'input' },
    { key: 'service_type', header: 'Service Type', filter: 'singleSelect', render: (row: BillingProvider) => {
      const serviceType = serviceTypes.find(s => s.value === row.service_type);
      return serviceType?.label || row.service_type;
    }},
    { key: 'contact_person', header: 'Contact Person', filter: 'input' },
    { key: 'contact_phone', header: 'Phone', filter: 'input' },
    { key: 'contact_email', header: 'Email', filter: 'input' },
    { key: 'provider_status', header: 'Status', filter: 'singleSelect', render: (row: BillingProvider) => (
      <span className={`px-2 py-1 rounded-full text-xs ${
        row.provider_status === 'Active' ? 'bg-green-100 text-green-800' :
        row.provider_status === 'Inactive' ? 'bg-gray-100 text-gray-800' :
        'bg-red-100 text-red-800'
      }`}>
        {row.provider_status}
      </span>
    )},
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Utility Bill Providers</h2>
        <Button onClick={handleAdd} disabled={loading}>
          <Plus className="w-4 h-4 mr-2" />
          Add Provider
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center p-8">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : (
        <>
          <CustomDataGrid
            data={providers}
            columns={columns}
            pagination={true}
            onRowDoubleClick={handleEdit}
            dataExport={true}
          />
          
          {/* Instructions */}
          <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
            💡 <strong>Actions:</strong> Double-click any row to edit a provider
          </div>
        </>
      )}

      {sidebarOpen && (
        <ActionSidebar
          title={editingProvider ? 'Edit Provider' : 'Add New Provider'}
          onClose={() => {
            setSidebarOpen(false);
            resetForm();
          }}
          content={
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="provider_name">Provider Name *</Label>
                  <Input
                    id="provider_name"
                    value={formData.provider_name}
                    onChange={(e) => handleInputChange('provider_name', e.target.value)}
                    placeholder="Enter provider name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="provider_code">Provider Code *</Label>
                  <Input
                    id="provider_code"
                    value={formData.provider_code}
                    onChange={(e) => handleInputChange('provider_code', e.target.value)}
                    placeholder="Enter provider code"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="service_type">Service Type *</Label>
                  <Select value={formData.service_type} onValueChange={(value) => handleInputChange('service_type', value)}>
                    <SelectTrigger className='w-full'>
                      <SelectValue placeholder="Select service type" />
                    </SelectTrigger>
                    <SelectContent>
                      {serviceTypes.map((service) => (
                        <SelectItem key={service.value} value={service.value}>
                          {service.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="provider_status">Status</Label>
                  <Select value={formData.provider_status} onValueChange={(value) => handleInputChange('provider_status', value)}>
                    <SelectTrigger className='w-full'>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contact_person">Contact Person</Label>
                  <Input
                    id="contact_person"
                    value={formData.contact_person}
                    onChange={(e) => handleInputChange('contact_person', e.target.value)}
                    placeholder="Enter contact person name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contact_phone">Contact Phone</Label>
                  <Input
                    id="contact_phone"
                    value={formData.contact_phone}
                    onChange={(e) => handleInputChange('contact_phone', e.target.value)}
                    placeholder="Enter contact phone"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="contact_email">Contact Email</Label>
                  <Input
                    id="contact_email"
                    type="email"
                    value={formData.contact_email}
                    onChange={(e) => handleInputChange('contact_email', e.target.value)}
                    placeholder="Enter contact email"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="provider_address">Provider Address</Label>
                  <Textarea
                    id="provider_address"
                    value={formData.provider_address}
                    onChange={(e) => handleInputChange('provider_address', e.target.value)}
                    placeholder="Enter provider address"
                    rows={3}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="provider_desc">Description</Label>
                  <Textarea
                    id="provider_desc"
                    value={formData.provider_desc}
                    onChange={(e) => handleInputChange('provider_desc', e.target.value)}
                    placeholder="Enter provider description"
                    rows={3}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex space-x-2 pt-4 border-t">
                <Button variant="outline" onClick={() => {
                  setSidebarOpen(false);
                  resetForm();
                }}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={saving}>
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingProvider ? 'Update' : 'Save'} Provider
                </Button>
              </div>
            </div>
          }
        />
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the provider "{providerToDelete?.provider_name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default UtilityBillProvider;
