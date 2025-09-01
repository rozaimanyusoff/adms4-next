import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { authenticatedApi } from '@/config/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Edit, Trash2, Check, X, Search } from 'lucide-react';

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
  

  // Search & pagination
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filtered = suppliers.filter(s => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (s.name || '').toLowerCase().includes(q) || (s.contact_name || '').toLowerCase().includes(q) || String(s.id || '').includes(q);
  });

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    // reset to first page when query or pageSize changes
    setPage(1);
  }, [query, pageSize]);

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

  return (
    <div>
      <Card>
        <CardHeader>
          <CardTitle>Suppliers</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Add form */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-4">
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
                <Plus className="mr-2 h-4 w-4" /> Add
              </Button>
            </div>
          </div>

          {loading && <div>Loading suppliers...</div>}
          {!loading && suppliers.length === 0 && <div>No suppliers found</div>}
          {!loading && suppliers.length > 0 && (
            <div className="overflow-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left p-2">ID</th>
                    <th className="text-left p-2">Name</th>
                    <th className="text-left p-2">Contact Name</th>
                    <th className="text-left p-2">Contact No</th>
                    <th className="text-right p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((s: any) => (
                    <tr key={s.id} className="border-t">
                      <td className="p-2 align-top w-20">{s.id}</td>
                      <td className="p-2 align-top">
                        {editingId === s.id ? (
                          <Input value={editData.name} onChange={(e) => handleEditChange('name', e.target.value)} />
                        ) : (
                          s.name
                        )}
                      </td>
                      <td className="p-2 align-top">
                        {editingId === s.id ? (
                          <Input value={editData.contact_name} onChange={(e) => handleEditChange('contact_name', e.target.value)} />
                        ) : (
                          s.contact_name || '-'
                        )}
                      </td>
                      <td className="p-2 align-top">
                        {editingId === s.id ? (
                          <Input value={editData.contact_no} onChange={(e) => handleEditChange('contact_no', e.target.value)} />
                        ) : (
                          s.contact_no || '-'
                        )}
                      </td>
                      <td className="p-2 align-top text-right space-x-2">
                        {editingId === s.id ? (
                          <>
                            <Button size="sm" onClick={() => saveEdit(s.id)} disabled={saving}>
                              <Check className="mr-2 h-4 w-4" /> Save
                            </Button>
                            <Button size="sm" variant="ghost" onClick={cancelEdit}>
                              <X className="mr-2 h-4 w-4" /> Cancel
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button size="sm" variant="ghost" onClick={() => startEdit(s)}>
                              <Edit className="mr-2 h-4 w-4" /> Edit
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => handleDelete(s.id)}>
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </Button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination controls */}
          {!loading && filtered.length > 0 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-gray-600">
                Showing {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, filtered.length)} of {filtered.length}
              </div>
              <div className="space-x-2">
                <Button size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                  Prev
                </Button>
                <Button size="sm" onClick={() => setPage(p => Math.min(pageCount, p + 1))} disabled={page === pageCount}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PurchaseSuppliers;
