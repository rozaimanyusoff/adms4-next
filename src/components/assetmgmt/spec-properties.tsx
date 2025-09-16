"use client";

import React, { useContext, useEffect, useMemo, useState } from "react";
import { AuthContext } from '@/store/AuthContext';
import { authenticatedApi } from "@/config/api";
import { Plus, Pencil, Trash2, Check, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SingleSelect } from "@/components/ui/combobox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

type DataType = "string" | "text" | "integer" | "float" | "decimal" | "boolean" | "date" | "datetime" | "json";

interface SpecProperty {
    id: number;
    type_id: number;
    name: string;
    label?: string;
    column_name: string;
    data_type: DataType;
    nullable: boolean;
    default_value?: any;
    options?: any[] | null;
    is_active?: number | boolean;
}

interface Props {
    // optional props: if provided, component filters by typeId or loads asset specs for assetId
    typeId?: number;
    assetId?: number | string;
}

const ALLOWED_TYPES: DataType[] = ["string","text","integer","float","decimal","boolean","date","datetime","json"];

const sanitizeColumn = (s: string) => {
    if (!s) return "";
    const t = s.toLowerCase().trim();
    // replace spaces with underscores, remove invalid chars, ensure starts with letter
    let col = t.replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
    if (!/^[a-z]/.test(col)) col = `c_${col}`;
    return col.slice(0, 120);
};

const supportsOptions = (type: DataType) => {
    return type === 'string' || type === 'text';
};

const SpecPropertiesManager: React.FC<Props> = ({ typeId: propTypeId, assetId }) => {
    const [typeId, setTypeId] = useState<number | undefined>(propTypeId);
    const [types, setTypes] = useState<{ id: number; name: string }[]>([]);
    const [list, setList] = useState<SpecProperty[]>([]);
    const [loading, setLoading] = useState(false);
    const [editing, setEditing] = useState<SpecProperty | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [applyLoadingId, setApplyLoadingId] = useState<number | null>(null);
    const [assetSpecs, setAssetSpecs] = useState<Record<string, any> | null>(null);
    const auth = useContext(AuthContext);
    const username = (auth?.authData?.user?.username) || ((auth?.authData?.user as any)?.ramco_id) || '';

    useEffect(() => { if (propTypeId) setTypeId(propTypeId); }, [propTypeId]);

    const fetchList = async () => {
        setLoading(true);
        try {
            const resp: any = await authenticatedApi.get(`/api/assets/spec-properties${typeId ? `?type_id=${typeId}` : ''}`);
            const data = Array.isArray(resp.data) ? resp.data : (resp.data?.data || []);
            setList(data || []);
        } catch (e) {
            console.error('Failed to fetch spec properties', e);
            setList([]);
            toast.error('Failed to load spec properties');
        } finally {
            setLoading(false);
        }
    };

    const fetchTypes = async () => {
        try {
            const resp: any = await authenticatedApi.get('/api/assets/types');
            const data = Array.isArray(resp.data) ? resp.data : (resp.data?.data || []);
            setTypes(data || []);
            // if no explicit typeId, keep propTypeId; otherwise default editing type when creating new
            if (!propTypeId && data && data.length > 0 && typeId === undefined) {
                setTypeId(data[0].id);
            }
        } catch (e) {
            console.error('Failed to fetch asset types', e);
        }
    };

    useEffect(() => { fetchList(); }, [typeId]);
    useEffect(() => { fetchTypes(); }, []);

    useEffect(() => {
        if (!assetId) return;
        const fetchAssetSpecs = async () => {
            try {
                const resp: any = await authenticatedApi.get(`/api/assets/${assetId}`);
                const asset = resp.data?.data || resp.data || {};
                // prefer typed columns, fallback to extra_specs
                const typed: Record<string, any> = {};
                list.forEach(s => { if ((asset as any)[s.column_name] !== undefined) typed[s.column_name] = (asset as any)[s.column_name]; });
                if (Object.keys(typed).length > 0) setAssetSpecs(prev => ({ ...(prev || {}), ...typed }));
                else if (asset.extra_specs) setAssetSpecs(asset.extra_specs);
            } catch (e) {
                console.error('Failed to fetch asset', e);
            }
        };
        fetchAssetSpecs();
    }, [assetId, list]);

    const openNewDialog = () => {
        setEditing({
            id: 0,
            type_id: typeId || (types[0]?.id ?? 0),
            name: '',
            label: '',
            column_name: '',
            data_type: 'string',
            nullable: true,
            default_value: null,
            options: null,
            is_active: 1
        });
        setDialogOpen(true);
    };

    const handleSaveMetadata = async () => {
        if (!editing) return;
        // client-side validation
        if (!editing.name || editing.name.length === 0 || editing.name.length > 255) { toast.error('Name is required and must be <=255 chars'); return; }
        if (!ALLOWED_TYPES.includes(editing.data_type)) { toast.error('Invalid data type'); return; }
        const payload: any = {
            type_id: editing.type_id,
            name: editing.name,
            label: editing.label,
            column_name: editing.column_name || sanitizeColumn(editing.name),
            data_type: editing.data_type,
            nullable: !!editing.nullable,
            default_value: editing.default_value ?? null,
            options: editing.options ?? null,
            created_by: username || undefined,
            is_active: editing.is_active ? 1 : 0
        };

        try {
            if (editing.id && editing.id > 0) {
                // Update (only allowed safe fields)
                const allowed = { label: payload.label, nullable: payload.nullable, default_value: payload.default_value, options: payload.options, is_active: editing.is_active ? 1 : 0 };
                await authenticatedApi.put(`/api/assets/spec-properties/${editing.id}`, allowed);
                toast.success('Spec metadata updated');
            } else {
                const resp = await authenticatedApi.post(`/api/assets/spec-properties`, payload) as any;
                if (resp.data?.data?.insertId) {
                    toast.success('Spec property created');
                } else {
                    toast.success('Spec created');
                }
            }
            setDialogOpen(false);
            setEditing(null);
            fetchList();
        } catch (e: any) {
            console.error('Save metadata failed', e);
            const msg = e?.response?.data?.message || 'Failed to save metadata';
            toast.error(msg);
        }
    };

    const handleApply = async (id: number) => {
        try {
            setApplyLoadingId(id);
            const resp = await authenticatedApi.post(`/api/assets/spec-properties/${id}/apply`);
            toast.success('Spec applied to type table');
            // refresh list to see is_active change
            fetchList();
        } catch (e: any) {
            console.error('Apply failed', e);
            const msg = e?.response?.data?.message || 'Apply failed';
            toast.error(msg);
        } finally {
            setApplyLoadingId(null);
        }
    };

    const handleDelete = async (id: number, drop = false) => {
        try {
            if (!confirm('Delete this spec property?')) return;
            await authenticatedApi.delete(`/api/assets/spec-properties/${id}${drop ? '?drop=true' : ''}`);
            toast.success('Spec property deleted');
            fetchList();
        } catch (e) {
            toast.error('Failed to delete');
        }
    };

    const handleSaveAssetSpecs = async (payload: Record<string, any>) => {
        if (!assetId) { toast.error('No asset selected'); return; }
        // client-side validate each key
        for (const [k, v] of Object.entries(payload)) {
            const meta = list.find(s => s.column_name === k);
            if (!meta) { toast.error(`Unknown field: ${k}`); return; }
            // basic type checks
            if (meta.data_type === 'integer' && (v === null || isNaN(Number(v)))) { toast.error(`${meta.name} must be integer`); return; }
            if ((meta.data_type === 'float' || meta.data_type === 'decimal') && (v === null || isNaN(Number(v)))) { toast.error(`${meta.name} must be numeric`); return; }
            if (meta.data_type === 'boolean' && typeof v !== 'boolean') { if (v === 'true' || v === 'false') continue; toast.error(`${meta.name} must be boolean`); return; }
            // date/datetime minimal checks
        }

        try {
            await authenticatedApi.post(`/api/assets/${assetId}/specs`, payload);
            toast.success('Asset specs saved');
            // refresh asset specs
            const resp = await authenticatedApi.get(`/api/assets/${assetId}`) as any;
            const asset = resp.data?.data || {};
            setAssetSpecs(asset.extra_specs || {});
        } catch (e: any) {
            console.error('Save asset specs failed', e);
            const msg = e?.response?.data?.message || 'Failed to save asset specs';
            toast.error(msg);
        }
    };

    // simple form state for asset edit
    const [specForm, setSpecForm] = useState<Record<string, any>>({});
    useEffect(() => { if (assetSpecs) setSpecForm(assetSpecs); }, [assetSpecs]);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Spec Properties</h3>
                <div className="flex items-center gap-2">
                    <Button onClick={openNewDialog} className="h-8 px-3"><Plus size={16} /> New</Button>
                    {typeId ? (
                        <div className="text-sm text-gray-600">Type: {types.find(t=>t.id===typeId)?.name ?? typeId}</div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <SingleSelect
                                options={[{ value: '', label: 'All types' }, ...types.map(t => ({ value: String(t.id), label: t.name }))]}
                                value={typeId ? String(typeId) : ''}
                                onValueChange={(v) => setTypeId(v ? Number(v) : undefined)}
                                placeholder="Select type"
                            />
                        </div>
                    )}
                </div>
            </div>

            <Card>
                <CardContent>
                    {loading ? <div className="flex items-center gap-2"><Loader2 className="animate-spin"/> Loading...</div> : (
                        <div className="space-y-3">
                            {list.map(s => (
                                <div key={s.id} className="flex items-center justify-between border p-2 rounded">
                                    <div>
                                        <div className="font-medium">{s.name} <span className="text-xs text-gray-500">({s.column_name})</span></div>
                                        <div className="text-xs text-gray-600">{s.label || '-'} • {s.data_type} • {s.nullable ? 'nullable' : 'required'}</div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button size="sm" onClick={() => { setEditing(s); setDialogOpen(true); }}><Pencil size={14} /></Button>
                                        <Button size="sm" variant="outline" onClick={() => handleApply(s.id)} disabled={applyLoadingId===s.id}>{applyLoadingId===s.id ? 'Applying...' : 'Apply'}</Button>
                                        <Button size="sm" variant="destructive" onClick={() => handleDelete(s.id)}><Trash2 size={14} /></Button>
                                    </div>
                                </div>
                            ))}
                            {list.length === 0 && <div className="text-sm text-gray-500">No spec properties found for this type.</div>}
                        </div>
                    )}
                </CardContent>
            </Card>

            {assetId && (
                <Card>
                    <CardHeader>
                        <CardTitle>Asset Specs (Asset ID: {assetId})</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {list.map(meta => {
                                const value = specForm[meta.column_name] ?? '';
                                return (
                                    <div key={meta.column_name} className="grid grid-cols-3 gap-3 items-center">
                                        <div className="col-span-1"><Label className="text-sm">{meta.label || meta.name}</Label></div>
                                        <div className="col-span-2">
                                            {meta.data_type === 'boolean' ? (
                                                <SingleSelect
                                                    options={[{ value: 'true', label: 'True' }, { value: 'false', label: 'False' }]}
                                                    value={value === true ? 'true' : value === false ? 'false' : String(value)}
                                                    onValueChange={(v) => setSpecForm({ ...specForm, [meta.column_name]: v === 'true' })}
                                                    placeholder="Select"
                                                />
                                            ) : (
                                                <Input value={value} onChange={(e)=> setSpecForm({...specForm, [meta.column_name]: e.target.value})} placeholder={meta.data_type} />
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                            {list.length === 0 && <div className="text-sm text-gray-500">No fields to edit.</div>}
                            <div className="flex gap-2 mt-3">
                                <Button onClick={() => handleSaveAssetSpecs(specForm)}><Check size={16}/> Save Specs</Button>
                                <Button variant="outline" onClick={() => { setSpecForm(assetSpecs || {}); }}>Reset</Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Dialog for create/edit */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editing && editing.id ? 'Edit Spec Property' : 'New Spec Property'}</DialogTitle>
                    </DialogHeader>
                    {editing && (
                        <form onSubmit={(e)=>{ e.preventDefault(); handleSaveMetadata(); }}>
                            <div className="space-y-3">
                                <div>
                                    <Label>Name</Label>
                                    <Input value={editing.name} onChange={(e)=> setEditing({...editing, name: e.target.value, column_name: sanitizeColumn(e.target.value)})} required />
                                </div>
                                <div>
                                    <Label>Column name (auto)</Label>
                                    <Input value={editing.column_name || sanitizeColumn(editing.name)} onChange={(e)=> setEditing({...editing, column_name: sanitizeColumn(e.target.value)})} />
                                </div>
                                <div>
                                    <Label>Label</Label>
                                    <Input value={editing.label || ''} onChange={(e)=> setEditing({...editing, label: e.target.value})} />
                                </div>
                                <div>
                                    <Label>Data Type</Label>
                                    <SingleSelect
                                        options={ALLOWED_TYPES.map(t => ({ value: t, label: t }))}
                                        value={editing.data_type}
                                        onValueChange={(v) => setEditing({ ...editing, data_type: v as DataType, options: supportsOptions(v as DataType) ? (editing.options ?? []) : null })}
                                        placeholder="Select data type"
                                    />
                                </div>
                                <div>
                                    <Label>Asset Type</Label>
                                    <SingleSelect
                                        options={types.map(t => ({ value: String(t.id), label: t.name }))}
                                        value={editing.type_id ? String(editing.type_id) : ''}
                                        onValueChange={(v) => setEditing({ ...editing, type_id: Number(v) })}
                                        placeholder="Select asset type"
                                    />
                                </div>
                                <div>
                                    <Label>Nullable</Label>
                                    <div className="mt-1">
                                        <label className="inline-flex items-center gap-2">
                                            <input type="checkbox" checked={!!editing.nullable} onChange={(e)=> setEditing({...editing, nullable: e.target.checked})} />
                                            <span className="text-sm">Allow null</span>
                                        </label>
                                    </div>
                                </div>
                                {supportsOptions(editing.data_type) && (
                                    <div>
                                        <Label>Options (comma separated or JSON array)</Label>
                                        <Input value={editing.options ? (Array.isArray(editing.options) ? JSON.stringify(editing.options) : String(editing.options)) : ''} onChange={(e)=>{
                                            const v = e.target.value;
                                            try { const parsed = JSON.parse(v); setEditing({...editing, options: parsed}); } catch(_){ setEditing({...editing, options: v.split(',').map(s=>s.trim())}); }
                                        }} />
                                    </div>
                                )}
                                <div>
                                    <Label>Default Value</Label>
                                    <Input value={editing.default_value ?? ''} onChange={(e)=> setEditing({...editing, default_value: e.target.value})} />
                                </div>

                                <div className="flex gap-2">
                                    <Button type="submit">Save</Button>
                                    <Button variant="outline" onClick={() => { setDialogOpen(false); setEditing(null); }}>Cancel</Button>
                                </div>
                            </div>
                        </form>
                    )}
                </DialogContent>
            </Dialog>

        </div>
    );
};

export default SpecPropertiesManager;
