"use client";

import React, { useEffect, useState } from "react";
import { authenticatedApi } from "../../config/api";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

interface Manager {
    ramco_id: string;
    full_name: string;
}

interface Type {
    id: number;
    name: string;
    description: string;
    ramco_id?: string;
    manager?: Manager;
}

interface Category {
    id: number;
    name: string;
    type_code?: string; // legacy
    type_id?: number;   // preferred
    type?: { id: number; name: string };
}

const CoreType: React.FC = () => {
    const [data, setData] = useState<Type[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<number | 'new' | null>(null);
    const [formData, setFormData] = useState<Partial<Type>>({ name: "", description: "" });
    const [managerOptions, setManagerOptions] = useState<Manager[]>([]);
    const [managerSearch, setManagerSearch] = useState("");
    const [managerLoading, setManagerLoading] = useState(false);
    const [categories, setCategories] = useState<Category[]>([]);
    const [catLoading, setCatLoading] = useState(false);
    // removed typeCodeById mapping; using type_id instead
    const [newCatForTypeId, setNewCatForTypeId] = useState<number | null>(null); // deprecated inline add, kept for safety
    const [editCatId, setEditCatId] = useState<number | null>(null); // tracks editing category id
    const [catForm, setCatForm] = useState<Partial<Category>>({ name: "" });
    const [catDialogOpen, setCatDialogOpen] = useState(false);
    const [catDialogMode, setCatDialogMode] = useState<'new' | 'edit'>('new');
    const [catDialogTypeId, setCatDialogTypeId] = useState<number | null>(null);
    const [dragOverTypeId, setDragOverTypeId] = useState<number | null>(null);
    const [dragCatId, setDragCatId] = useState<number | null>(null);

    // Deterministic pastel background per card
    const getCardBg = (item: Type) => {
        const src = `${item.id}-${item.name ?? ''}`;
        let hash = 0;
        for (let i = 0; i < src.length; i++) {
            hash = ((hash << 5) - hash) + src.charCodeAt(i);
            hash |= 0; // Convert to 32bit integer
        }
        const palette = [
            "#EFF6FF", // blue-50
            "#ECFEFF", // cyan-50
            "#ECFDF5", // emerald-50
            "#FEFCE8", // yellow-50
            "#FDF2F8", // pink-50
            "#F1F5F9", // slate-100
        ];
        const idx = Math.abs(hash) % palette.length;
        return palette[idx];
    };

    const fetchData = async () => {
        try {
            const response = await authenticatedApi.get<any>("/api/assets/types");
            const typesArr = Array.isArray(response.data) ? response.data : (response.data && response.data.data ? response.data.data : []);
            setData(typesArr);
        } catch (error) {
            console.error("Error fetching types data:", error);
            setData([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchCategories = async () => {
        setCatLoading(true);
        try {
            const resp = await authenticatedApi.get<{ data: Category[] }>("/api/assets/categories");
            setCategories(Array.isArray((resp as any).data) ? (resp as any).data : resp.data?.data || []);
        } catch (e) {
            setCategories([]);
        } finally {
            setCatLoading(false);
        }
    };

    // Fetch managers for autocomplete
    const fetchManagers = async (search: string) => {
        setManagerLoading(true);
        try {
            const response = await authenticatedApi.get<any>(`/api/assets/employees/search?q=${encodeURIComponent(search)}`);
            let options: Manager[] = [];
            if (Array.isArray(response.data)) {
                options = response.data.map((item: any) => ({ ramco_id: item.ramco_id, full_name: item.full_name }));
            } else if (response.data && Array.isArray(response.data.data)) {
                options = response.data.data.map((item: any) => ({ ramco_id: item.ramco_id, full_name: item.full_name }));
            }
            setManagerOptions(options);
        } catch (error) {
            setManagerOptions([]);
        } finally {
            setManagerLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        fetchCategories();
    }, []);

    useEffect(() => {
        // Prefill manager name on edit
        if (formData.manager && formData.manager.full_name) {
            setManagerSearch(formData.manager.full_name);
        } else if (formData.ramco_id && data.length) {
            const found = data.find((t: any) => t.ramco_id === formData.ramco_id);
            if (found && found.manager && found.manager.full_name) setManagerSearch(found.manager.full_name);
        } else {
            setManagerSearch("");
        }
    }, [formData.manager, formData.ramco_id, editingId]);

    const handleSubmit = async () => {
        try {
            const payload = {
                name: formData.name,
                description: formData.description,
                ramco_id: formData.manager?.ramco_id || formData.ramco_id,
                manager: formData.manager,
            };
            if (formData.id) {
                await authenticatedApi.put(`/api/assets/types/${formData.id}`, payload);
                toast.success("Type updated successfully");
            } else {
                await authenticatedApi.post("/api/assets/types", payload);
                toast.success("Type created successfully");
            }
            fetchData();
            setEditingId(null);
            setFormData({ name: "", description: "" });
            setManagerOptions([]);
            setManagerSearch("");
        } catch (error) {
            toast.error("Error submitting form");
            console.error("Error submitting form:", error);
        }
    };

    // Category CRUD
    const handleCatSubmit = async (typeId: number) => {
        try {
            const payload = {
                name: catForm.name,
                type_id: typeId,
            } as any;
            if (editCatId) {
                await authenticatedApi.put(`/api/assets/categories/${editCatId}`, payload);
                toast.success("Category updated");
            } else {
                await authenticatedApi.post(`/api/assets/categories`, payload);
                toast.success("Category created");
            }
            setNewCatForTypeId(null);
            setEditCatId(null);
            setCatForm({ name: "" });
            fetchCategories();
        } catch (e) {
            toast.error("Error saving category");
        }
    };

    const moveCategory = async (categoryId: number, toTypeId: number) => {
        try {
            await authenticatedApi.put(`/api/assets/categories/${categoryId}`, { type_id: toTypeId });
            toast.success("Category moved");
            fetchCategories();
        } catch (e) {
            toast.error("Error moving category");
        } finally {
            setDragOverTypeId(null);
            setDragCatId(null);
        }
    };

    const deleteCategory = async (categoryId: number) => {
        try {
            const ok = typeof window !== 'undefined' ? window.confirm('Delete this category?') : true;
            if (!ok) return;
            await authenticatedApi.delete(`/api/assets/categories/${categoryId}`);
            toast.success('Category deleted');
            fetchCategories();
        } catch (e) {
            toast.error('Error deleting category');
        }
    };

    return (
        <div className="mt-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold mb-4">Asset Type Maintenance</h2>
                <Button
                    onClick={() => {
                        setEditingId('new');
                        setFormData({ name: "", description: "" });
                        setManagerOptions([]);
                        setManagerSearch("");
                    }}
                    className="mb-4 bg-blue-600 hover:bg-blue-700"
                >
                    <Plus size={22} />
                </Button>
            </div>

            {loading ? (
                <p>Loading...</p>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4">
                    {editingId === 'new' && (
                        <Card className="relative overflow-visible border-dashed border-2 border-blue-300 bg-blue-50/40">
                            <CardHeader className="py-2 px-3">
                                <div className="flex items-center justify-between w-full">
                                    <CardTitle className="text-blue-700 text-base">Create New Type</CardTitle>
                                    <div className="flex gap-2">
                                        <Button type="button" onClick={() => handleSubmit()} className="h-8 px-3">Save</Button>
                                        <Button type="button" variant="outline" className="h-8 px-3" onClick={() => { setEditingId(null); setFormData({ name: "", description: "" }); setManagerOptions([]); setManagerSearch(""); }}>Cancel</Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-2 pb-3 px-3 min-h-24">
                                <form
                                    onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <div className="mb-2">
                                        <Label htmlFor="name-new" className="block text-sm font-medium text-gray-700">Name</Label>
                                        <Input
                                            id="name-new"
                                            className="capitalize"
                                            value={formData.name || ""}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="mb-2">
                                        <Label htmlFor="description-new" className="block text-sm font-medium text-gray-700">Description</Label>
                                        <Input
                                            id="description-new"
                                            value={formData.description || ""}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="mb-2">
                                        <Label htmlFor="manager-new" className="block text-sm font-medium text-gray-700">Asset Manager</Label>
                                        <Input
                                            id="manager-new"
                                            value={formData.manager ? formData.manager.full_name : managerSearch}
                                            onChange={e => {
                                                setManagerSearch(e.target.value);
                                                setFormData({ ...formData, manager: undefined, ramco_id: undefined });
                                                if (e.target.value.length > 1) fetchManagers(e.target.value);
                                            }}
                                            placeholder="Search manager by name"
                                            autoComplete="off"
                                            readOnly={!!formData.manager}
                                            style={formData.manager ? { backgroundColor: '#f3f4f6', cursor: 'not-allowed' } : {}}
                                        />
                                        {managerLoading && <div className="text-xs text-gray-400 mt-1">Searching...</div>}
                                        {managerOptions.length > 0 && !formData.manager && (
                                            <ul className="border rounded bg-white mt-1 max-h-40 overflow-y-auto z-10 relative">
                                                {managerOptions.map(option => (
                                                    <li
                                                        key={option.ramco_id}
                                                        className="px-2 py-1 hover:bg-blue-100 cursor-pointer"
                                                        onClick={() => {
                                                            setFormData({ ...formData, manager: option, ramco_id: option.ramco_id });
                                                            setManagerSearch("");
                                                            setManagerOptions([]);
                                                        }}
                                                    >
                                                        {option.full_name}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                        {formData.manager && (
                                            <div className="text-xs text-green-700 mt-1">
                                                Selected: {formData.manager.full_name} ({formData.manager.ramco_id})
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="ghost"
                                                    className="ml-2 text-red-500 px-1 py-0 h-5"
                                                    onClick={() => setFormData({ ...formData, manager: undefined, ramco_id: undefined })}
                                                >
                                                    Remove
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    )}
                    {data.map((item) => (
                        <Card
                            key={item.id}
                            className={`group relative overflow-visible transition-all border ${dragOverTypeId===item.id? 'border-blue-400 ring-2 ring-blue-200' : 'border-gray-200'} hover:border-blue-300 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer`}
                            style={{ backgroundColor: getCardBg(item) }}
                            onDragOver={(e) => { e.preventDefault(); setDragOverTypeId(item.id); }}
                            onDragLeave={() => setDragOverTypeId(null)}
                            onDrop={(e) => {
                                e.preventDefault();
                                const idStr = e.dataTransfer.getData('text/plain');
                                const catIdNum = Number(idStr);
                                if (catIdNum && !Number.isNaN(catIdNum)) {
                                    moveCategory(catIdNum, item.id);
                                }
                            }}
                            tabIndex={0}
                        >
                            <div className="pointer-events-none absolute inset-0 rounded-md ring-1 ring-transparent group-hover:ring-blue-200 group-hover:bg-blue-50/30 transition"></div>
                            <CardHeader className="py-2 px-3">
                                <div className="flex items-center justify-between w-full">
                                    <CardTitle className="truncate">{item.name}</CardTitle>
                                    <div className="flex gap-2">
                                        {editingId === item.id ? (
                                            <>
                                                <Button type="button" onClick={(e) => { e.stopPropagation(); handleSubmit(); }} className="h-8 px-3">Save</Button>
                                                <Button type="button" variant="outline" className="h-8 px-3" onClick={(e) => { e.stopPropagation(); setEditingId(null); setFormData({ name: "", description: "" }); setManagerOptions([]); setManagerSearch(""); }}>Cancel</Button>
                                            </>
                                        ) : (
                                            <button
                                                aria-label="Edit Type"
                                                className="p-1.5 rounded hover:bg-yellow-100 text-yellow-700"
                                                onClick={(e) => { e.stopPropagation(); setEditingId(item.id); setFormData(item); }}
                                            >
                                                <Pencil size={18} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-2 pb-3 px-3 min-h-24">
                                {editingId === item.id ? (
                                    <form
                                        onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <div className="mb-2">
                                            <Label htmlFor={`name-${item.id}`} className="block text-sm font-medium text-gray-700">Name</Label>
                                            <Input
                                                id={`name-${item.id}`}
                                                className="capitalize"
                                                value={formData.name || ""}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="mb-2">
                                            <Label htmlFor={`description-${item.id}`} className="block text-sm font-medium text-gray-700">Description</Label>
                                            <Input
                                                id={`description-${item.id}`}
                                                value={formData.description || ""}
                                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="mb-2">
                                            <Label htmlFor={`manager-${item.id}`} className="block text-sm font-medium text-gray-700">Asset Manager</Label>
                                            <Input
                                                id={`manager-${item.id}`}
                                                value={formData.manager ? formData.manager.full_name : managerSearch}
                                                onChange={e => {
                                                    setManagerSearch(e.target.value);
                                                    setFormData({ ...formData, manager: undefined, ramco_id: undefined });
                                                    if (e.target.value.length > 1) fetchManagers(e.target.value);
                                                }}
                                                placeholder="Search manager by name"
                                                autoComplete="off"
                                                readOnly={!!formData.manager}
                                                style={formData.manager ? { backgroundColor: '#f3f4f6', cursor: 'not-allowed' } : {}}
                                            />
                                            {managerLoading && <div className="text-xs text-gray-400 mt-1">Searching...</div>}
                                            {managerOptions.length > 0 && !formData.manager && (
                                                <ul className="border rounded bg-white mt-1 max-h-40 overflow-y-auto z-10 relative">
                                                    {managerOptions.map(option => (
                                                        <li
                                                            key={option.ramco_id}
                                                            className="px-2 py-1 hover:bg-blue-100 cursor-pointer"
                                                            onClick={() => {
                                                                setFormData({ ...formData, manager: option, ramco_id: option.ramco_id });
                                                                setManagerSearch("");
                                                                setManagerOptions([]);
                                                            }}
                                                        >
                                                            {option.full_name}
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                            {formData.manager && (
                                                <div className="text-xs text-green-700 mt-1">
                                                    Selected: {formData.manager.full_name} ({formData.manager.ramco_id})
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="ghost"
                                                        className="ml-2 text-red-500 px-1 py-0 h-5"
                                                        onClick={() => setFormData({ ...formData, manager: undefined, ramco_id: undefined })}
                                                    >
                                                        Remove
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                        {/* Save/Cancel moved to header */}
                                    </form>
                                ) : (
                                    <div>
                                        <div className="text-sm text-gray-700 mb-2">
                                            {item.description || "No description"}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            <span className="font-medium">Manager:</span> {item.manager?.full_name || "-"}
                                        </div>
                                        {/* No click-to-edit hint; use pencil icon */}
                                        {/* Categories section */}
                                        <div className="mt-3">
                                            <div className="flex items-center justify-between mb-1">
                                                <div className="text-sm font-medium text-gray-700">Categories</div>
                                                {(
                                                    <Button size="sm" variant="ghost" className="h-7 px-2 text-blue-700"
                                                        onClick={(e) => { e.stopPropagation(); setCatDialogMode('new'); setCatDialogTypeId(item.id); setCatForm({ name: "" }); setCatDialogOpen(true); }}>
                                                        Add
                                                    </Button>
                                                )}
                                            </div>
                                            {catLoading ? (
                                                <div className="text-xs text-gray-400">Loading categories...</div>
                                            ) : (
                                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                                    {categories.filter(c => (c.type?.id === item.id) || (typeof c.type_id === 'number' && c.type_id === item.id) || false)
                                                        .map((cat) => (
                                                            <div
                                                                key={cat.id}
                                                                className={`relative rounded-md border bg-white/60 px-2.5 py-2 text-sm shadow-sm hover:shadow select-none`}
                                                                draggable
                                                                onDragStart={(e) => { setDragCatId(cat.id); e.dataTransfer.setData('text/plain', String(cat.id)); }}
                                                                onDragEnd={() => { setDragCatId(null); setDragOverTypeId(null); }}
                                                            >
                                                                <div className="flex items-center justify-between gap-2" onClick={(e)=>e.stopPropagation()}>
                                                                    <span className="truncate cursor-grab active:cursor-grabbing">{cat.name}</span>
                                                                    <div className="flex items-center gap-1">
                                                                        <button aria-label="Edit category" className="p-1 rounded hover:bg-yellow-100 text-yellow-600"
                                                                            onClick={() => { setCatDialogMode('edit'); setCatDialogTypeId(item.id); setEditCatId(cat.id); setCatForm({ name: cat.name }); setCatDialogOpen(true); }}>
                                                                            <Pencil size={16} />
                                                                        </button>
                                                                        <button aria-label="Delete category" className="p-1 rounded hover:bg-red-100 text-red-600"
                                                                            onClick={() => deleteCategory(cat.id)}>
                                                                            <Trash2 size={16} />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Category Dialog */}
            <Dialog open={catDialogOpen} onOpenChange={setCatDialogOpen}>
                <DialogContent onClick={(e)=>e.stopPropagation()}>
                    <DialogHeader>
                        <DialogTitle>{catDialogMode === 'new' ? 'Add Category' : 'Edit Category'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={(e)=>{ e.preventDefault(); if (catDialogTypeId) { handleCatSubmit(catDialogTypeId); setCatDialogOpen(false); } }}>
                        <div className="mb-3">
                            <Label htmlFor="cat-name" className="block text-sm font-medium text-gray-700">Name</Label>
                            <Input id="cat-name" value={catForm.name || ''} onChange={(e)=> setCatForm({ ...catForm, name: e.target.value })} required />
                        </div>
                        <div className="flex gap-2">
                            <Button type="submit">Save</Button>
                            <Button type="button" variant="outline" onClick={()=> setCatDialogOpen(false)}>Cancel</Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

        </div>
    );
};

export default CoreType;
