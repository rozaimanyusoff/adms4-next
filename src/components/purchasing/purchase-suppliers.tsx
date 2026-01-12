import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { authenticatedApi } from '@/config/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Edit, Trash2, Check, X } from 'lucide-react';
import { CustomDataGrid, type ColumnDef } from '@/components/ui/DataGrid';

const PurchaseSuppliers: React.FC = () => {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Add form state
  const [newSupplier, setNewSupplier] = useState<{ name: string; contact_name: string; contact_no: string }>({ name: '', contact_name: '', contact_no: '' });

  // Edit state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<{ name: string; contact_name: string; contact_no: string }>({ name: '', contact_name: '', contact_no: '' });

  const load = async () => {
    setLoading(true);
    try {
      const res = await authenticatedApi.get('/api/purchases/suppliers');
      // API may return { data: [...] } or { data: { data: [...] } }
      const payload = (res as any).data;
      const data = payload?.data ?? payload ?? [];
      console.debug('Loaded suppliers', data);
      setSuppliers(data || []);
    } catch (err) {
      toast.error('Failed to load suppliers');
      console.error('Failed to load suppliers', err);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    load();
  }, []);
  

  const handleAddChange = (field: string, value: string) => setNewSupplier(prev => ({ ...prev, [field]: value }));

  const handleCreate = async () => {
    if (!newSupplier.name.trim()) {
      toast.error('Supplier name is required');
      return;
    }
    setSaving(true);
    try {
      await authenticatedApi.post('/api/purchases/suppliers', newSupplier);
      toast.success('Supplier created');
      setNewSupplier({ name: '', contact_name: '', contact_no: '' });
      await load();
    } catch (err) {
      toast.error('Failed to create supplier');
      console.error('Create supplier error', err);
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (s: any) => {
    setEditingId(s.id);
    setEditData({ name: s.name || '', contact_name: s.contact_name || '', contact_no: s.contact_no || '' });
  };

  const handleEditChange = (field: string, value: string) => setEditData(prev => ({ ...prev, [field]: value }));

  const saveEdit = async (id: number) => {
    if (!editData.name.trim()) {
      toast.error('Supplier name is required');
      return;
    }
    setSaving(true);
    try {
      await authenticatedApi.put(`/api/purchases/suppliers/${id}`, editData);
      toast.success('Supplier updated');
      setEditingId(null);
      await load();
    } catch (err) {
      toast.error('Failed to update supplier');
      console.error('Update supplier error', err);
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({ name: '', contact_name: '', contact_no: '' });
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this supplier?')) return;
    setSaving(true);
    try {
      await authenticatedApi.delete(`/api/purchases/suppliers/${id}`);
      toast.success('Supplier deleted');
      await load();
    } catch (err) {
      toast.error('Failed to delete supplier');
      console.error('Delete supplier error', err);
    } finally {
      setSaving(false);
    }
  };

  const columns: ColumnDef<any>[] = [
    { key: 'id', header: 'ID', sortable: true },
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      filter: 'input',
      render: (row: any) =>
        editingId === row.id ? (
          <Input value={editData.name} onChange={(e) => handleEditChange('name', e.target.value)} />
        ) : (
          row.name
        )
    },
    {
      key: 'contact_name',
      header: 'Contact Name',
      filter: 'input',
      render: (row: any) =>
        editingId === row.id ? (
          <Input value={editData.contact_name} onChange={(e) => handleEditChange('contact_name', e.target.value)} />
        ) : (
          row.contact_name || '-'
        )
    },
    {
      key: 'contact_no',
      header: 'Contact No',
      filter: 'input',
      render: (row: any) =>
        editingId === row.id ? (
          <Input value={editData.contact_no} onChange={(e) => handleEditChange('contact_no', e.target.value)} />
        ) : (
          row.contact_no || '-'
        )
    },
    {
      key: 'actions',
      header: 'Actions',
      colClass: 'text-end',
      render: (row: any) =>
        editingId === row.id ? (
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant={'ghost'} onClick={() => saveEdit(row.id)} disabled={saving}>
              <Check className="h-4 w-4 text-green-600" />
            </Button>
            <Button size="sm" variant="ghost" onClick={cancelEdit}>
              <X className="h-4 w-4 text-red-600" />
            </Button>
          </div>
        ) : (
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="ghost" onClick={() => startEdit(row)}>
              <Edit className="h-4 w-4 text-amber-600" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => handleDelete(row.id)}>
              <Trash2 className="h-4 w-4 text-red-600" />
            </Button>
          </div>
        )
    }
  ];

  return (
    <div className="space-y-4">
      {/* Add form */}
      <Card>
        <CardHeader>
          <CardTitle className='text-lg font-semibold'>Add New Supplier</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <div>
              <Label>Name</Label>
              <Input value={newSupplier.name} onChange={(e) => handleAddChange('name', e.target.value)} placeholder="Supplier name" />
            </div>
            <div>
              <Label>Contact Name</Label>
              <Input value={newSupplier.contact_name} onChange={(e) => handleAddChange('contact_name', e.target.value)} placeholder="Contact person" />
            </div>
            <div>
              <Label>Contact No</Label>
              <Input value={newSupplier.contact_no} onChange={(e) => handleAddChange('contact_no', e.target.value)} placeholder="Phone" />
            </div>
            <div className="flex items-end">
              <Button onClick={handleCreate} disabled={saving}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading && <div>Loading suppliers...</div>}
      {!loading && suppliers.length === 0 && <div>No suppliers found</div>}
      {!loading && suppliers.length > 0 && (
        <CustomDataGrid
          data={suppliers}
          columns={columns}
          pagination={false}
          inputFilter={false}
          columnsVisibleOption={false}
          dataExport={false}
          rowColHighlight={false}
        />
      )}
    </div>
  );
};

export default PurchaseSuppliers;
