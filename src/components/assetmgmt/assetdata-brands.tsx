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
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface Category { id: number; name: string }
interface Type { id: number; name: string }
interface Model { id: number; name: string }
interface Brand {
    id: number
    name: string
    categories: Category[]
    models?: Model[]
    logo?: string | null
}

const BrandsView: React.FC = () => {
    const [brands, setBrands] = useState<Brand[]>([])
    const [categories, setCategories] = useState<Category[]>([])
    const [types, setTypes] = useState<Type[]>([])
    const [loading, setLoading] = useState(true)

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
            setBrands(Array.isArray(brandsRes.data) ? brandsRes.data : (brandsRes.data?.data ?? []))
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
        setForm({ name: b.name, category_ids: (b.categories || []).map(c => Number(c.id)), type_id: (b as any).type?.id ? Number((b as any).type.id) : null })
        setDialogOpen(true)
    }

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

    const removeBrand = async (id: number) => {
        try {
            const ok = typeof window !== 'undefined' ? window.confirm('Delete this brand?') : true
            if (!ok) return
            await authenticatedApi.delete(`/api/assets/brands/${id}`)
            toast.success("Brand deleted")
            fetchAll()
        } catch (e) {
            toast.error("Error deleting brand")
        }
    }

    return (
        <div className="mt-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold mb-4">Brand Maintenance</h2>
                <Button onClick={openNew} className="mb-4 bg-blue-600 hover:bg-blue-700">
                    <Plus size={22} />
                </Button>
            </div>

            {loading ? (
                <p>Loading...</p>
            ) : (
                <div className="space-y-6">
                    {(() => {
                        const groups = new Map<string, { name: string; items: typeof brands }>()
                        types.forEach(t => groups.set(String(t.id), { name: t.name, items: [] }))
                        brands.forEach(b => {
                            const tid = (b as any).type?.id ? String((b as any).type.id) : 'unassigned'
                            const tname = (b as any).type?.name || 'Unassigned'
                            if (!groups.has(tid)) groups.set(tid, { name: tname, items: [] })
                            groups.get(tid)!.items.push(b)
                        })
                        return Array.from(groups.entries()).map(([tid, group]) => (
                            <section key={tid}>
                                <h3 className="text-sm font-semibold text-gray-700 mb-2">{group.name}</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {group.items.map((b) => (
                                        <Card key={b.id} className="group relative transition-all border border-gray-200 hover:border-blue-300 hover:shadow-md">
                                            <CardHeader className="py-2 px-3">
                                                <div className="flex items-center justify-between">
                                                    <CardTitle className="truncate">{b.name}</CardTitle>
                                                    <div className="flex items-center gap-2">
                                                        <button aria-label="Edit brand" className="p-1.5 rounded hover:bg-yellow-100 text-yellow-700" onClick={() => openEdit(b)}>
                                                            <Pencil size={18} />
                                                        </button>
                                                        <button aria-label="Delete brand" className="p-1.5 rounded hover:bg-red-100 text-red-600" onClick={() => removeBrand(Number(b.id))}>
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="pt-2 pb-3 px-3">
                                                <div className="mb-2">
                                                    <div className="text-xs font-medium text-gray-700 mb-1">Categories</div>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {(b.categories || []).slice(0, 8).map((c) => (
                                                            <span key={c.id} className="inline-block rounded-full border bg-white/70 text-gray-700 text-xs px-2 py-0.5 truncate max-w-[10rem]">
                                                                {c.name}
                                                            </span>
                                                        ))}
                                                        {b.categories && b.categories.length > 8 && (
                                                            <span className="text-xs text-gray-500">+{b.categories.length - 8} more</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="text-xs font-medium text-gray-700 mb-1">Models {b.models ? `(${b.models.length})` : ''}</div>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {(b.models || []).slice(0, 3).map((m) => (
                                                            <span key={m.id} className="inline-block rounded border bg-white/70 text-gray-600 text-xs px-2 py-0.5 truncate max-w-[10rem]">
                                                                {m.name}
                                                            </span>
                                                        ))}
                                                        {(b.models && b.models.length > 3) && (
                                                            <span className="text-xs text-gray-500">+{b.models.length - 3} more</span>
                                                        )}
                                                    </div>
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
                    <form onSubmit={(e) => { e.preventDefault(); submit(); }}>
                        <div className="mb-3">
                            <Label htmlFor="brand-name" className="block text-sm font-medium text-gray-700">Name</Label>
                            <Input id="brand-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                        </div>
                        <div className="mb-3">
                            <Label className="block text-sm font-medium text-gray-700 mb-1">Type</Label>
                            <Select value={form.type_id ? String(form.type_id) : ""} onValueChange={(v) => setForm({ ...form, type_id: Number(v) })}>
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
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-56 overflow-y-auto p-1 border rounded">
                                {categories.map((c) => {
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
                        </div>
                        <div className="flex gap-2">
                            <Button type="submit">Save</Button>
                            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}

export default BrandsView;
