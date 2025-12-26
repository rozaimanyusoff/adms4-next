"use client";

import React, { useEffect, useState } from "react";
import { authenticatedApi } from "../../config/api";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { SingleSelect, type ComboboxOption } from '@/components/ui/combobox';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Category { id: number; name: string }
interface Type { id: number; name: string }
interface Model { id: number | string; name: string; category?: Category | null }
interface Brand {
    id: number
    name: string
    type?: Type | null
    categories?: Category[]
    models?: Model[]
    logo?: string | null
}

const BrandsView: React.FC = () => {
    const [brands, setBrands] = useState<Brand[]>([])
    const [categories, setCategories] = useState<Category[]>([])
    const [types, setTypes] = useState<Type[]>([])
    const [loading, setLoading] = useState(true)
    const [typeFilter, setTypeFilter] = useState<string>('')
    const [brandFilter, setBrandFilter] = useState<string>('')
    const [modelFilter] = useState<string>('')
    const [brandSearch, setBrandSearch] = useState<string>('')
    const [inlineModelBrandId, setInlineModelBrandId] = useState<number | null>(null)
    const [inlineModelName, setInlineModelName] = useState<string>('')
    const [inlineModelCategoryId, setInlineModelCategoryId] = useState<string>('')
    const [inlineSaving, setInlineSaving] = useState(false)
    const [popoverOpenBrandId, setPopoverOpenBrandId] = useState<number | null>(null)
    const [confirmBrandSave, setConfirmBrandSave] = useState(false)
    const [confirmModelSave, setConfirmModelSave] = useState(false)
    const [confirmModelBrand, setConfirmModelBrand] = useState<Brand | null>(null)
    const [deleteBrand, setDeleteBrand] = useState<Brand | null>(null)
    const [deleteModelId, setDeleteModelId] = useState<number | string | null>(null)

    const [dialogOpen, setDialogOpen] = useState(false)
    const [editingId, setEditingId] = useState<number | null>(null)
    const [form, setForm] = useState<{ name: string; category_ids: number[]; type_id: number | null }>({ name: "", category_ids: [], type_id: null })

    const fetchAll = async () => {
        try {
            const [brandsRes, catsRes, typesRes] = await Promise.all([
                authenticatedApi.get<any>("/api/assets/brands"),
                authenticatedApi.get<any>("/api/assets/categories"),
                authenticatedApi.get<any>("/api/assets/types"),
            ])
            const brandPayload = Array.isArray(brandsRes.data?.data)
                ? brandsRes.data.data
                : (Array.isArray(brandsRes.data) ? brandsRes.data : [])
            setBrands(brandPayload)
            setCategories(Array.isArray(catsRes.data) ? catsRes.data : (catsRes.data?.data ?? []))
            setTypes(Array.isArray(typesRes.data) ? typesRes.data : (typesRes.data?.data ?? []))
        } catch (e) {
            console.error("Error fetching brands/categories:", e)
            setBrands([]); setCategories([])
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchAll() }, [])

    const openNew = () => {
        setEditingId(null)
        setForm({ name: "", category_ids: [], type_id: null })
        setDialogOpen(true)
    }

    const openEdit = (b: Brand) => {
        setEditingId(b.id)
        setForm({
            name: b.name,
            category_ids: (b.categories || []).map(c => Number(c.id)),
            type_id: b.type?.id ? Number(b.type.id) : null,
        })
        setDialogOpen(true)
    }

    const typeOptions: ComboboxOption[] = React.useMemo(() => [
        { value: '', label: 'All Types' },
        ...types.map(t => ({ value: String(t.id), label: t.name })),
    ], [types])

    const brandOptions: ComboboxOption[] = React.useMemo(() => {
        const scoped = typeFilter
            ? brands.filter(b => String(b.type?.id ?? '') === typeFilter)
            : brands
        return [
            { value: '', label: 'All Brands' },
            ...scoped.map(b => ({ value: String(b.id), label: b.name })),
        ]
    }, [brands, typeFilter])

    const categoriesForType = React.useCallback((typeId?: number | string) => {
        const typeObj = types.find(t => String(t.id) === String(typeId ?? ''))
        if (typeObj && Array.isArray((typeObj as any).categories)) {
            return (typeObj as any).categories.map((c: any) => ({ id: Number(c.id), name: c.name })) as Category[]
        }
        return categories
    }, [categories, types])

    const startInlineModel = (brand: Brand) => {
        setInlineModelBrandId(Number(brand.id))
        setInlineModelName('')
        setInlineModelCategoryId('') // force user to pick, show placeholder
    }

    const cancelInlineModel = () => {
        setInlineModelBrandId(null)
        setInlineModelName('')
        setInlineModelCategoryId('')
        setInlineSaving(false)
    }

    const saveInlineModel = async (brand: Brand) => {
        if (!inlineModelName.trim()) { toast.error('Enter model name'); return; }
        const typeId = brand.type?.id;
        if (!typeId) { toast.error('Type is required for this brand'); return; }
        if (!inlineModelCategoryId) { toast.error('Select category'); return; }
        setInlineSaving(true);
        try {
            const payload = {
                name: inlineModelName.trim(),
                brand_id: Number(brand.id),
                category_id: Number(inlineModelCategoryId),
                type_id: Number(typeId),
            };
            await authenticatedApi.post('/api/assets/models', payload);
            toast.success('Model added');
            cancelInlineModel();
            fetchAll();
        } catch (e) {
            toast.error('Failed to add model');
            setInlineSaving(false);
        }
    }

    const removeModel = (id: number | string) => {
        setDeleteModelId(id);
    };


    const submit = async () => {
        try {
            const payload = { name: form.name, category_ids: form.category_ids, type_id: form.type_id ?? undefined }
            if (editingId) {
                await authenticatedApi.put(`/api/assets/brands/${editingId}`, payload)
                toast.success("Brand updated")
            } else {
                await authenticatedApi.post(`/api/assets/brands`, payload)
                toast.success("Brand created")
            }
            setDialogOpen(false)
            setForm({ name: "", category_ids: [], type_id: null })
            fetchAll()
        } catch (e) {
            toast.error("Error saving brand")
            console.error(e)
        }
    }

    const removeBrand = (brand: Brand) => {
        setDeleteBrand(brand)
    }

    return (
        <div className="mt-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-xl font-bold">Brand Maintenance</h2>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <div className="w-full sm:w-48">
                        <SingleSelect
                            options={typeOptions}
                            value={typeFilter}
                            onValueChange={(val) => {
                                setTypeFilter(val)
                                setBrandFilter('')
                            }}
                            placeholder="Filter by type"
                        />
                    </div>
                    <div className="w-full sm:w-56">
                        <SingleSelect
                            options={brandOptions}
                            value={brandFilter}
                            onValueChange={(val) => {
                                setBrandFilter(val)
                            }}
                            placeholder="Filter by brand"
                        />
                    </div>
                    <div className="w-full sm:w-56">
                        <Input
                            placeholder="Search brands..."
                            value={brandSearch}
                            onChange={(e) => setBrandSearch(e.target.value)}
                        />
                    </div>
                    <Button variant={'default'} onClick={openNew}>
                        <Plus size={22} />
                    </Button>
                </div>
            </div>

            {loading ? (
                <p>Loading...</p>
            ) : (
                <div className="space-y-6 mt-4">
                    {(() => {
                        const groups = new Map<string, { name: string; items: typeof brands }>()
                        const filteredBrands = brands.filter(b => {
                            const typeMatch = !typeFilter || String(b.type?.id ?? '') === typeFilter
                            const brandMatch = !brandFilter || String(b.id) === brandFilter
                            const searchMatch = !brandSearch || b.name.toLowerCase().includes(brandSearch.toLowerCase())
                            return typeMatch && brandMatch && searchMatch
                        })
                        filteredBrands.forEach(b => {
                            const tid = b.type?.id ? String(b.type.id) : 'unassigned'
                            const tname = b.type?.name || 'Unassigned'
                            if (!groups.has(tid)) groups.set(tid, { name: tname, items: [] })
                            groups.get(tid)!.items.push(b)
                        })
                        const list = Array.from(groups.entries()).filter(([, group]) => group.items.length > 0)
                        if (list.length === 0) return <p className="text-sm text-gray-500">No brands found.</p>
                        return list.map(([tid, group]) => (
                            <section key={tid}>
                                <h3 className="text-sm font-semibold text-gray-700 mb-2">{group.name}</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {group.items.map((b) => (
                                        <Card key={b.id} className="group relative transition-all border border-gray-200 hover:border-blue-300 hover:shadow-md">
                                            <CardHeader className="px-3">
                                                <div className="flex items-center justify-between">
                                                    <CardTitle className="truncate text-lg font-bold">{b.name}</CardTitle>
                                                    <div className="flex items-center">
                                                        <button aria-label="Edit brand" className="p-1.5 rounded hover:bg-yellow-100 text-yellow-700" onClick={() => openEdit(b)}>
                                                            <Pencil size={18} />
                                                        </button>
                                                        <button aria-label="Delete brand" className="p-1.5 rounded hover:bg-red-100 text-red-600" onClick={() => removeBrand(b)}>
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="pb-3 px-3">
                                                <div className="mb-2">
                                                    <div className="text-sm font-medium text-gray-700 mb-1">Categories</div>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {(b.categories || []).slice(0, 8).map((c) => (
                                                            <span key={c.id} className="inline-block rounded-full border bg-white/70 text-gray-700 text-xs px-2 py-0.5 truncate max-w-40">
                                                                {c.name}
                                                            </span>
                                                        ))}
                                                        {b.categories && b.categories.length > 8 && (
                                                            <span className="text-xs text-gray-500">+{b.categories.length - 8} more</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="flex items-center justify-left gap-4 mb-1">
                                                        <div className="text-sm font-medium text-gray-700">Models {b.models ? `(${b.models.length})` : ''}</div>
                                                        <Button
                                                            variant="outline"
                                                            size={'sm'}
                                                            className="text-blue-600 hover:text-blue-800 text-xs flex items-center gap-1"
                                                            onClick={() => startInlineModel(b)}
                                                            title="Add model"
                                                        >
                                                            <Plus size={14} className="text-green-600" />
                                                        </Button>
                                                    </div>
                                                    <div className="flex flex-wrap mt-2 gap-1.5">
                                                        {(b.models || []).slice(0, 3).map((m) => (
                                                            <span key={m.id} className="inline-flex items-center gap-1 rounded border bg-white/70 text-gray-600 text-xs px-2 py-0.5 truncate max-w-40">
                                                                {m.name}
                                                                {(b.models && b.models.length <= 3) && (
                                                                    <button
                                                                        type="button"
                                                                        className="text-red-500 hover:text-red-700"
                                                                        onClick={() => removeModel(m.id)}
                                                                    >
                                                                        <Trash2 size={12} />
                                                                    </button>
                                                                )}
                                                            </span>
                                                        ))}
                                                        {(b.models && b.models.length > 3) && (
                                                            <Popover open={popoverOpenBrandId === Number(b.id)} onOpenChange={(open) => setPopoverOpenBrandId(open ? Number(b.id) : null)}>
                                                                <PopoverTrigger asChild>
                                                                    <button type="button" className="text-xs text-gray-500 cursor-pointer underline decoration-dotted">
                                                                        +{b.models.length - 3} more
                                                                    </button>
                                                                </PopoverTrigger>
                                                                <PopoverContent className="max-w-sm bg-white shadow-md">
                                                                    <div className="text-xs font-medium mb-2">Models</div>
                                                                    <div className="flex flex-wrap gap-1.5">
                                                                        {(b.models || []).map(m => (
                                                                            <span key={m.id} className="inline-flex items-center gap-1 rounded border bg-gray-100 text-gray-700 text-xs px-2 py-0.5">
                                                                                {m.name}
                                                                                <button
                                                                                    type="button"
                                                                                    className="text-red-500 hover:text-red-700"
                                                                                    onClick={() => removeModel(m.id)}
                                                                                >
                                                                                    <Trash2 size={12} />
                                                                                </button>
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                </PopoverContent>
                                                            </Popover>
                                                        )}
                                                    </div>
                                                    {inlineModelBrandId === Number(b.id) && (
                                                        <div className="mt-2 space-y-2 p-2 border rounded bg-gray-50">
                                                            <Input
                                                                value={inlineModelName}
                                                                onChange={(e) => setInlineModelName(e.target.value)}
                                                                placeholder="Model name"
                                                            />
                                                            <Select value={inlineModelCategoryId} onValueChange={setInlineModelCategoryId}>
                                                                <SelectTrigger className="w-full"><SelectValue placeholder="Select category" /></SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectGroup>
                                                                        <SelectLabel>Categories</SelectLabel>
                                                                        {categoriesForType(b.type?.id).map(c => (
                                                                            <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                                                                        ))}
                                                                    </SelectGroup>
                                                                </SelectContent>
                                                            </Select>
                                                            <div className="flex gap-2 justify-end">
                                                                <Button variant="outline" size="sm" onClick={cancelInlineModel}>Cancel</Button>
                                                                <Button
                                                                    size="sm"
                                                                    onClick={() => { setConfirmModelBrand(b); setConfirmModelSave(true); }}
                                                                    disabled={inlineSaving || !inlineModelName.trim() || !inlineModelCategoryId}
                                                                >
                                                                    {inlineSaving ? 'Saving...' : 'Save'}
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </section>
                        ))
                    })()}
                </div>
            )}

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingId ? 'Edit Brand' : 'Add Brand'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={(e) => { e.preventDefault(); setConfirmBrandSave(true); }}>
                        <div className="mb-3">
                            <Label htmlFor="brand-name" className="block text-sm font-medium text-gray-700">Name</Label>
                            <Input id="brand-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                        </div>
                        <div className="mb-3">
                            <Label className="block text-sm font-medium text-gray-700 mb-1">Type</Label>
                            <Select value={form.type_id ? String(form.type_id) : ""} onValueChange={(v) => {
                                const nextTypeId = Number(v)
                                const typeObj = types.find(t => Number(t.id) === nextTypeId)
                                const allowedIds = new Set<string | number>((typeObj as any)?.categories?.map((c: any) => c.id) || [])
                                setForm((prev) => ({
                                    ...prev,
                                    type_id: nextTypeId,
                                    category_ids: prev.category_ids.filter(id => allowedIds.size === 0 || allowedIds.has(id))
                                }))
                            }}>
                                <SelectTrigger className="w-full"><SelectValue placeholder="Select type" /></SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        <SelectLabel>Types</SelectLabel>
                                        {types.map(t => (
                                            <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
                                        ))}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="mb-3">
                            <div className="block text-sm font-medium text-gray-700 mb-1">Categories</div>
                            {(() => {
                                const list = categoriesForType(form.type_id ?? undefined)
                                return (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-56 overflow-y-auto p-1 border rounded">
                                        {list.map((c) => {
                                            const checked = form.category_ids.includes(Number(c.id))
                                            return (
                                                <label key={c.id} className="flex items-center gap-2 text-sm">
                                                    <Checkbox checked={checked} onCheckedChange={(v) => {
                                                        const on = Boolean(v)
                                                        setForm((prev) => ({
                                                            ...prev,
                                                            category_ids: on ? [...prev.category_ids, Number(c.id)] : prev.category_ids.filter(id => id !== Number(c.id))
                                                        }))
                                                    }} />
                                                    <span className="truncate">{c.name}</span>
                                                </label>
                                            )
                                        })}
                                    </div>
                                )
                            })()}
                        </div>
                        <div className="flex gap-2">
                            <Button type="submit">Save</Button>
                            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            <AlertDialog open={confirmBrandSave} onOpenChange={setConfirmBrandSave}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirm save</AlertDialogTitle>
                        <AlertDialogDescription>{editingId ? 'Update this brand?' : 'Create this brand?'}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => { setConfirmBrandSave(false); submit(); }}>Yes, save</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={confirmModelSave} onOpenChange={setConfirmModelSave}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirm add model</AlertDialogTitle>
                        <AlertDialogDescription>Add this model to the brand?</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setConfirmModelSave(false)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => {
                            setConfirmModelSave(false);
                            if (confirmModelBrand) saveInlineModel(confirmModelBrand);
                        }}>Add Model</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={deleteBrand !== null} onOpenChange={(open) => { if (!open) setDeleteBrand(null); }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete brand?</AlertDialogTitle>
                        <AlertDialogDescription>
                            {deleteBrand && (deleteBrand.models || []).length > 0
                                ? 'This brand has models linked. Remove models first before deleting.'
                                : 'This action cannot be undone.'}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setDeleteBrand(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={async () => {
                            if (!deleteBrand) return;
                            if ((deleteBrand.models || []).length > 0) {
                                toast.error('Cannot delete brand with linked models.');
                                setDeleteBrand(null);
                                return;
                            }
                            try {
                                await authenticatedApi.delete(`/api/assets/brands/${deleteBrand.id}`);
                                toast.success('Brand deleted');
                                setDeleteBrand(null);
                                fetchAll();
                            } catch {
                                toast.error('Error deleting brand');
                            }
                        }} disabled={!!(deleteBrand && (deleteBrand.models || []).length > 0)}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={deleteModelId !== null} onOpenChange={(open) => { if (!open) setDeleteModelId(null); }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete model?</AlertDialogTitle>
                        <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setDeleteModelId(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={async () => {
                            if (deleteModelId == null) return;
                            try {
                                await authenticatedApi.delete(`/api/assets/models/${deleteModelId}`);
                                toast.success('Model deleted');
                                setDeleteModelId(null);
                                fetchAll();
                            } catch {
                                toast.error('Failed to delete model');
                            }
                        }}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

        </div>
    )
}

export default BrandsView;
