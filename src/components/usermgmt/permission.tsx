"use client";

import React, { useEffect, useState } from 'react';
import { authenticatedApi } from '@/config/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

type PermissionItem = {
    id?: number | string;
    code: string; // read, write, approve, etc.
    name: string;
    description?: string;
    scope?: string; // suggested options below
    is_active?: boolean;
};

// Suggested scope options: 'global' (all modules), 'module' (module-level), 'resource' (specific resource), 'tenant' (multi-tenant), 'project'
const SCOPE_OPTIONS = [
    { value: 'global', label: 'Global' },
    { value: 'module', label: 'Module' },
    { value: 'resource', label: 'Resource' },
    { value: 'tenant', label: 'Tenant' },
    { value: 'project', label: 'Project' },
];

const CODE_OPTIONS = [
    { value: 'read', label: 'Read' },
    { value: 'write', label: 'Write' },
    { value: 'create', label: 'Create' },
    { value: 'delete', label: 'Delete' },
    { value: 'approve', label: 'Approve' },
    { value: 'export', label: 'Export' },
];

const PermissionMgmt: React.FC = () => {
    const [items, setItems] = useState<PermissionItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState<Partial<PermissionItem>>({ code: 'read', name: '', description: '', scope: 'module', is_active: true });

    useEffect(() => {
        async function fetchPermissions() {
            setLoading(true);
            try {
                const res: any = await authenticatedApi.get('/api/users/permissions');
                setItems(res.data?.data || res.data || []);
            } catch (err) {
                setItems([]);
            } finally {
                setLoading(false);
            }
        }
        fetchPermissions();
    }, []);

    async function submit() {
        try {
            if (form.id) {
                await authenticatedApi.put(`/api/users/permissions/${form.id}`, form);
            } else {
                await authenticatedApi.post('/api/users/permissions', form);
            }
            setOpen(false);
            setForm({ code: 'read', name: '', description: '', scope: 'module', is_active: true });
            const res: any = await authenticatedApi.get('/api/users/permissions');
            setItems(res.data?.data || res.data || []);
        } catch (err) {
            // ignore
        }
    }

    async function removeItem(id?: number | string) {
        if (!id) return;
        if (!confirm('Delete permission?')) return;
        try {
            await authenticatedApi.delete(`/api/users/permissions/${id}`);
            setItems(prev => prev.filter(i => i.id !== id));
        } catch (err) {
            // ignore
        }
    }

    return (
        <div className="p-4 max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Permission Management</h3>
                <Button onClick={() => { setForm({ code: 'read', name: '', description: '', scope: 'module', is_active: true }); setOpen(true); }}>New</Button>
            </div>

            {loading ? <div>Loading...</div> : (
                <div className="overflow-x-auto bg-white rounded border">
                    <table className="min-w-full">
                        <thead>
                            <tr>
                                <th className="px-4 py-2 text-left">ID</th>
                                <th className="px-4 py-2 text-left">Code</th>
                                <th className="px-4 py-2 text-left">Name</th>
                                <th className="px-4 py-2 text-left">Scope</th>
                                <th className="px-4 py-2 text-left">Active</th>
                                <th className="px-4 py-2 text-left">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map(it => (
                                <tr key={String(it.id)} className="hover:bg-gray-50">
                                    <td className="border-t px-4 py-2">{it.id}</td>
                                    <td className="border-t px-4 py-2">{it.code}</td>
                                    <td className="border-t px-4 py-2">{it.name}</td>
                                    <td className="border-t px-4 py-2">{it.scope}</td>
                                    <td className="border-t px-4 py-2">
                                        <Switch checked={!!it.is_active} onCheckedChange={async (v) => { try { await authenticatedApi.put(`/api/users/permissions/${it.id}`, { is_active: v }); setItems(prev => prev.map(p => p.id === it.id ? { ...p, is_active: v } : p)); } catch (e) {} }} />
                                    </td>
                                    <td className="border-t px-4 py-2">
                                        <div className="flex gap-2">
                                            <Button size="sm" variant="ghost" onClick={() => { setForm(it); setOpen(true); }}>Edit</Button>
                                            <Button size="sm" variant="destructive" onClick={() => removeItem(it.id)}>Delete</Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{form.id ? 'Update Permission' : 'Create Permission'}</DialogTitle>
                        <DialogDescription>Define a permission that can be assigned to modules or roles.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={e => { e.preventDefault(); submit(); }}>
                        <div className="mb-3">
                            <Label>Code</Label>
                            <Select onValueChange={(v) => setForm(f => ({ ...f, code: v }))} value={form.code}>
                                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {CODE_OPTIONS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="mb-3">
                            <Label>Name</Label>
                            <Input value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
                        </div>

                        <div className="mb-3">
                            <Label>Description</Label>
                            <Textarea value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: (e.target as HTMLTextAreaElement).value }))} />
                        </div>

                        <div className="mb-3">
                            <Label>Scope</Label>
                            <Select onValueChange={(v) => setForm(f => ({ ...f, scope: v }))} value={form.scope}>
                                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {SCOPE_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="mb-3 flex items-center gap-3">
                            <Switch checked={!!form.is_active} onCheckedChange={(v) => setForm(f => ({ ...f, is_active: v }))} />
                            <Label>Active</Label>
                        </div>

                        <div className="flex justify-end gap-2 mt-4">
                            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
                            <Button type="submit">Save</Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default PermissionMgmt;
