"use client";
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Trash, Pencil } from 'lucide-react';
import { authenticatedApi } from '@/config/api';
import ActionSidebar from '@/components/ui/action-aside';
import { CustomDataGrid, type ColumnDef } from '@/components/ui/DataGrid';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { SingleSelect, MultiSelect, type ComboboxOption } from '@/components/ui/combobox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

type SummonType = { id?: number; name?: string; description?: string };
type Agency = { id?: number; name?: string; code?: string };

const SummonAgencyManager: React.FC = () => {
    const [view, setView] = useState<'types' | 'agencies'>('types');

    const [types, setTypes] = useState<SummonType[]>([]);
    const [agencies, setAgencies] = useState<Agency[]>([]);

    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [editing, setEditing] = useState<any | null>(null);

    const [form, setForm] = useState<any>({});
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<{ kind: 'type' | 'agency'; id?: number } | null>(null);
    const [loading, setLoading] = useState(false);

    const gridRef = useRef<any>(null);

    // load lists
    const load = async () => {
        try {
            setLoading(true);
            const [tRes, aRes] = await Promise.all([
                authenticatedApi.get('/api/compliance/summon/type'),
                authenticatedApi.get('/api/compliance/summon/agency')
            ]);
            const tData = (tRes as any).data?.data || (tRes as any).data || [];
            const aData = (aRes as any).data?.data || (aRes as any).data || [];
            setTypes(Array.isArray(tData) ? tData : []);
            setAgencies(Array.isArray(aData) ? aData : []);
        } catch (err) {
            console.error('Failed to load summon types/agencies', err);
            toast.error('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    // For use in selects elsewhere we expose agency code as value (to match existing form usage)
    // Use agency id as value for MultiSelect and payloads
    const agencyOptions = useMemo<ComboboxOption[]>(() => agencies.map(a => ({ value: String(a.id ?? a.code ?? a.name), label: String(a.name || a.code) })), [agencies]);

    // columns for types
    const typeColumns: ColumnDef<SummonType>[] = [
        { key: 'name' as any, header: 'Name', sortable: true, filter: 'input', render: (r: any) => r.name || '-' },
        { key: 'description' as any, header: 'Description', render: (r: any) => r.description || '-' },
        { key: 'agencies' as any, header: 'Agencies', render: (r: any) => (
            r?.agencies && r.agencies.length ? (
                <div className="flex flex-wrap gap-1">
                    {r.agencies.map((a: any) => (
                        <Badge key={a.id} variant="secondary">{a.name}</Badge>
                    ))}
                </div>
            ) : '-'
        )},
        { key: 'actions' as any, header: 'Actions', render: (r: any) => (
            <div className="flex items-center space-x-2">
                <Button size="icon" variant="ghost" onClick={(e) => {
                    e.stopPropagation();
                    setEditing(r);
                    setForm({
                        name: r.name || '',
                        description: r.description || '',
                        agency_ids: Array.isArray(r.agency_ids) ? r.agency_ids.map((id: any) => String(id)) : (Array.isArray(r.agencies) ? r.agencies.map((a: any) => String(a.id)) : [])
                    });
                    setSidebarOpen(true);
                }} title="Edit"><Pencil className="w-4 h-4" /></Button>
                <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); setDeleteTarget({ kind: 'type', id: r.id }); setShowDeleteDialog(true); }} title="Delete"><Trash className="w-4 h-4 text-red-600" /></Button>
            </div>
        ) }
    ];

    const agencyColumns: ColumnDef<Agency>[] = [
        { key: 'name' as any, header: 'Agency Name', sortable: true, filter: 'input', render: (r: any) => r.name || '-' },
        { key: 'code' as any, header: 'Code', render: (r: any) => r.code || '-' },
        {
            key: 'actions' as any, header: 'Actions', render: (r: any) => (
                <div className="flex items-center space-x-2">
                    <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); setEditing(r); setForm({ name: r.name || '', code: r.code || '' }); setSidebarOpen(true); }} title="Edit"><Pencil className="w-4 h-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); setDeleteTarget({ kind: 'agency', id: r.id }); setShowDeleteDialog(true); }} title="Delete"><Trash className="w-4 h-4 text-red-600" /></Button>
                </div>
            )
        }
    ];

    const handleSave = async () => {
        try {
            if (view === 'types') {
                // create or update type (backend model: { name, description, agency_ids })
                const payload: any = { name: form.name ?? '', description: form.description ?? '' };
                payload.agency_ids = Array.isArray(form.agency_ids) ? form.agency_ids.map((v: any) => Number(v)) : [];
                if (editing && editing.id) {
                    await authenticatedApi.put(`/api/compliance/summon/type/${editing.id}`, payload);
                    toast.success('Type updated');
                } else {
                    await authenticatedApi.post('/api/compliance/summon/type', payload);
                    toast.success('Type created');
                }
            } else {
                if (editing && editing.id) {
                    await authenticatedApi.put(`/api/compliance/summon/agency/${editing.id}`, { name: form.name, code: form.code });
                    toast.success('Agency updated');
                } else {
                    await authenticatedApi.post('/api/compliance/summon/agency', { name: form.name, code: form.code });
                    toast.success('Agency created');
                }
            }
            await load();
            setSidebarOpen(false);
            setEditing(null);
            setForm({});
        } catch (err) {
            console.error('Failed save', err);
            toast.error('Failed to save');
        }
    };

    const handleDeleteConfirmed = async () => {
        if (!deleteTarget) return;
        try {
            if (deleteTarget.kind === 'type') {
                await authenticatedApi.delete(`/api/compliance/summon/type/${deleteTarget.id}`);
                toast.success('Type deleted');
            } else {
                await authenticatedApi.delete(`/api/compliance/summon/agency/${deleteTarget.id}`);
                toast.success('Agency deleted');
            }
            setShowDeleteDialog(false);
            setDeleteTarget(null);
            await load();
        } catch (err) {
            console.error('Failed delete', err);
            toast.error('Failed to delete');
        }
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Summon Types & Agencies</h2>
                <div className="flex items-center space-x-2">
                    <div className="inline-flex rounded-md shadow-sm bg-muted/10">
                        <Button
                            variant={view === 'types' ? 'default' : 'ghost'}
                            className={`rounded-l-md ${view === 'types' ? 'ring-2 ring-offset-1' : ''}`}
                            onClick={() => setView('types')}
                        >
                            Types
                        </Button>
                        <Button
                            variant={view === 'agencies' ? 'default' : 'ghost'}
                            className={`-ml-px rounded-r-md ${view === 'agencies' ? 'ring-2 ring-offset-1' : ''}`}
                            onClick={() => setView('agencies')}
                        >
                            Agencies
                        </Button>
                    </div>
                    <Button onClick={() => { setEditing(null); setForm({}); setSidebarOpen(true); }}>
                        <Plus className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader className="py-2"><CardTitle>{view === 'types' ? 'Summon Types' : 'Agencies'}</CardTitle></CardHeader>
                <CardContent>
                    <CustomDataGrid
                        ref={gridRef}
                        data={view === 'types' ? types : agencies}
                        columns={view === 'types' ? (typeColumns as any) : (agencyColumns as any)}
                        pagination={false}
                        inputFilter={false}
                        pageSize={10}
                    />
                    {loading && <div className="text-xs text-gray-500 mt-2">Loading…</div>}
                </CardContent>
            </Card>

            <ActionSidebar
                isOpen={sidebarOpen}
                onClose={() => { setSidebarOpen(false); setEditing(null); setForm({}); }}
                title={editing ? 'Edit' : (view === 'types' ? 'Create Type' : 'Create Agency')}
                content={(
                    <div className="space-y-3 p-4">
                        {view === 'types' ? (
                            <>
                                <div>
                                    <Label>Name</Label>
                                    <Input value={form.name || ''} onChange={(e: any) => setForm((s: any) => ({ ...s, name: e.target.value }))} />
                                </div>
                                <div>
                                    <Label>Description</Label>
                                    <Input value={form.description || ''} onChange={(e: any) => setForm((s: any) => ({ ...s, description: e.target.value }))} />
                                </div>
                                <div>
                                    <Label>Agencies</Label>
                                    <MultiSelect
                                        options={agencyOptions}
                                        value={Array.isArray(form.agency_ids) ? form.agency_ids.map((v: any) => String(v)) : []}
                                        onValueChange={(vals) => setForm((s: any) => ({ ...s, agency_ids: vals }))}
                                        placeholder="Select one or more agencies"
                                        clearable
                                    />
                                </div>
                            </>
                        ) : (
                            <>
                                <div>
                                    <Label>Agency Name</Label>
                                    <Input value={form.name || ''} onChange={(e: any) => setForm((s: any) => ({ ...s, name: e.target.value }))} />
                                </div>
                                <div>
                                    <Label>Code</Label>
                                    <Input value={form.code || ''} onChange={(e: any) => setForm((s: any) => ({ ...s, code: e.target.value }))} />
                                </div>
                            </>
                        )}

                        <div className="pt-4 flex justify-end space-x-2">
                            <Button variant="secondary" onClick={() => { setSidebarOpen(false); setEditing(null); setForm({}); }}>Cancel</Button>
                            <Button onClick={handleSave}>{editing ? 'Update' : 'Save'}</Button>
                        </div>
                    </div>
                )}
            />

            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirm delete</DialogTitle>
                    </DialogHeader>
                    <div className="py-2">Are you sure you want to delete this item? This cannot be undone.</div>
                    <DialogFooter className="flex gap-2">
                        <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleDeleteConfirmed}>Delete</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default SummonAgencyManager;
