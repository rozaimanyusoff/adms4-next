"use client";

import React, { useEffect, useState } from "react";
import { CustomDataGrid } from "@components/ui/DataGrid";
import { authenticatedApi } from "../../config/api";
import { Plus, Pencil, Trash } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { filter } from "lodash";

interface Model {
  id: number;
  name: string;
  image?: string | string[];
  brand?: { id: number; code?: string; name: string } | null;
  category?: { id: number; code?: string; name: string } | null;
  type?: { id: number; code?: string; name: string } | null;
  brand_code?: string | null;
  category_code?: string | null;
  type_code?: string | number | null;
  specification?: string;
  generation?: string;
  status?: 'active' | 'inactive';
}

interface Brand { id: number; code: string; name: string; }
interface Category { id: number; code: string; name: string; }
interface Type { id: number; code: string; name: string; }

const CoreModel: React.FC = () => {
  const [data, setData] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [types, setTypes] = useState<Type[]>([]);
  const [formData, setFormData] = useState<Partial<Model>>({ name: "", image: [], brand: undefined, category: undefined, type: undefined, status: "active" });
  const [editIndex, setEditIndex] = useState<number | null>(null);

  const fetchData = async () => {
    try {
      const [modelsRes, brandsRes, categoriesRes, typesRes] = await Promise.all([
        authenticatedApi.get<any>("/api/assets/models"),
        authenticatedApi.get<any>("/api/assets/brands"),
        authenticatedApi.get<any>("/api/assets/categories"),
        authenticatedApi.get<any>("/api/assets/types"),
      ]);
      setData(modelsRes.data.data || []);
      setBrands(Array.isArray(brandsRes.data) ? brandsRes.data : (brandsRes.data && brandsRes.data.data ? brandsRes.data.data : []));
      setCategories(Array.isArray(categoriesRes.data) ? categoriesRes.data : (categoriesRes.data && categoriesRes.data.data ? categoriesRes.data.data : []));
      setTypes(Array.isArray(typesRes.data) ? typesRes.data : (typesRes.data && typesRes.data.data ? typesRes.data.data : []));
    } catch (error) {
      console.error("Error fetching models/brands/categories/types data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async () => {
    try {
      const payload = {
        ...formData,
      };
      if (formData.id) {
        await authenticatedApi.put(`/api/assets/models/${formData.id}`, payload);
      } else {
        await authenticatedApi.post("/api/assets/models", payload);
      }
      fetchData();
      setIsModalOpen(false);
      setFormData({ name: "", image: [], brand: undefined, category: undefined, type: undefined, status: "active" });
    } catch (error) {
      console.error("Error submitting form:", error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this model?")) return;
    try {
      await authenticatedApi.delete(`/api/assets/models/${id}`);
      toast.success("Model deleted successfully");
      fetchData();
    } catch (error) {
      toast.error("Failed to delete model");
      console.error("Delete error", error);
    }
  };

  const getModelCode = () => {
    const typeCode = formData.type?.code || "";
    const categoryCode = formData.category?.code || "";
    const brandCode = formData.brand?.code || "";
    // Find the index of the current model in the filtered list (by type/category/brand)
    let modelIndex = 1;
    if (formData.id) {
      // Filter models with the same type, category, brand
      const filtered = data.filter(m =>
        (m.type?.code || m.type_code) === typeCode &&
        (m.category?.code || m.category_code) === categoryCode &&
        (m.brand?.code || m.brand_code) === brandCode
      );
      // Sort by id to ensure order
      const sorted = filtered.sort((a, b) => (a.id || 0) - (b.id || 0));
      const idx = sorted.findIndex(m => m.id === formData.id);
      modelIndex = idx >= 0 ? idx + 1 : filtered.length + 1;
    } else {
      // For new model, get the next available index for the selected type/category/brand
      const filtered = data.filter(m =>
        (m.type?.code || m.type_code) === typeCode &&
        (m.category?.code || m.category_code) === categoryCode &&
        (m.brand?.code || m.brand_code) === brandCode
      );
      modelIndex = filtered.length + 1;
    }
    const modelCode = modelIndex.toString().padStart(3, "0");
    return [typeCode, categoryCode, brandCode, modelCode].filter(Boolean).join(".");
  };

  const openEditForm = (row: Model) => {
    const idx = data.findIndex(m => m.id === row.id);
    setEditIndex(idx);
    setFormData({
      ...row,
      brand: row.brand || (row.brand_code ? brands.find(b => b.code === row.brand_code) : undefined),
      category: row.category || (row.category_code ? categories.find(c => c.code === row.category_code) : undefined),
      type: row.type || (row.type_code ? types.find(t => t.code === String(row.type_code)) : undefined),
    });
    setIsModalOpen(true);
  };

  const handlePrev = () => {
    if (editIndex !== null && editIndex > 0) {
      openEditForm(data[editIndex - 1]);
    }
  };
  const handleNext = () => {
    if (editIndex !== null && editIndex < data.length - 1) {
      openEditForm(data[editIndex + 1]);
    }
  };
  const handleCloseForm = () => {
    setIsModalOpen(false);
    setEditIndex(null);
    setFormData({ name: "", image: [], brand: undefined, category: undefined, type: undefined, status: "active" });
  };

  const columns = [
    { key: "id" as keyof Model, header: "ID" },
    { key: "name" as keyof Model, header: "Name" },
    {
      key: "brand" as keyof Model,
      header: "Brand",
      filters: 'singleSelect',
      render: (row: Model) => {
        if (row.brand?.name) return row.brand.name;
        if (row.brand_code) {
          const found = brands.find(b => b.code === row.brand_code);
          return found ? found.name : row.brand_code;
        }
        return "-";
      },
    },
    {
      key: "category" as keyof Model,
      header: "Category",
      filters: 'singleSelect',
      render: (row: Model) => {
        if (row.category?.name) return row.category.name;
        if (row.category_code) {
          const found = categories.find(c => c.code === row.category_code);
          return found ? found.name : row.category_code;
        }
        return "-";
      },
    },
    {
      key: "type" as keyof Model,
      header: "Type",
      render: (row: Model) => {
        if (row.type?.name) return row.type.name;
        if (row.type_code) {
          const found = types.find(t => t.code === String(row.type_code));
          return found ? found.name : row.type_code;
        }
        return "-";
      },
    },
    {
      key: "status" as keyof Model,
      header: "Status",
      render: (row: Model) => row.status === "inactive" ? "Inactive" : "Active",
    },
    {
      key: "actions" as keyof Model,
      header: "Actions",
      render: (row: Model) => (
        <div className="flex gap-2">
          <Button
            onClick={() => openEditForm(row)}
            className="bg-yellow-500 hover:bg-yellow-600"
          >
            <Pencil size={20} />
          </Button>
          <Button
            onClick={() => handleDelete(row.id)}
            className="bg-red-500 hover:bg-red-600"
            variant="destructive"
          >
            <Trash size={20} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-4">
      {/* Hide title and + Add button when form is visible */}
      {!isModalOpen && (
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold mb-4">Models</h2>
          <Button onClick={() => { setIsModalOpen(true); setEditIndex(null); setFormData({ name: "", image: [], brand: undefined, category: undefined, type: undefined, status: "active" }); }} className="mb-4 bg-blue-600 hover:bg-blue-700">
            <Plus size={22} />
          </Button>
        </div>
      )}
      {/* Hide grid when form is visible */}
      {!isModalOpen && (
        loading ? (
          <p>Loading...</p>
        ) : (
          <CustomDataGrid columns={columns.map(col => (String(col.key) === 'actions' ? { ...col, render: (row: Model) => (
            <div className="flex gap-2">
              <Button onClick={() => openEditForm(row)} className="bg-yellow-500 hover:bg-yellow-600"><Pencil size={20} /></Button>
              <Button onClick={() => handleDelete(row.id)} className="bg-red-500 hover:bg-red-600" variant="destructive"><Trash size={20} /></Button>
            </div>
          ) } : col))} data={data} />
        )
      )}
      {/* Full-width panel form */}
      {isModalOpen && (
        <div className="bg-white rounded-lg shadow p-8 w-full mx-auto relative flex flex-col md:flex-row gap-8">
          {/* Left: Image upload/preview */}
          <div className="flex flex-col items-center md:w-1/3 w-full">
            <div className="w-full flex flex-col items-center mb-4 gap-2">
              <div className="flex flex-wrap gap-2 justify-center">
                {Array.isArray(formData.image) && formData.image.length > 0 ? (
                  formData.image.map((img, idx) => (
                    <div key={idx} className="relative group">
                      <img
                        src={img.startsWith("data:") || img.startsWith("http") ? img : `/assets/images/${img}`}
                        alt={formData.name || `Model image ${idx+1}`}
                        className="w-32 h-32 object-contain rounded border border-gray-200 bg-white"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        className="absolute top-1 right-1 text-red-500 opacity-0 group-hover:opacity-100 transition"
                        onClick={() => {
                          if (Array.isArray(formData.image)) {
                            setFormData({ ...formData, image: formData.image.filter((_: string, i: number) => i !== idx) });
                          }
                        }}
                      >Remove</Button>
                    </div>
                  ))
                ) : (
                  <img
                    src="/assets/images/product-camera.jpg"
                    alt="Model image"
                    className="w-32 h-32 object-contain rounded border border-gray-200 bg-white"
                  />
                )}
              </div>
              <Button
                type="button"
                variant="outline"
                className="mt-2 flex items-center gap-2"
                onClick={() => document.getElementById('image-upload')?.click()}
              >
                <span className="material-icons text-lg">photo_camera</span>
                {Array.isArray(formData.image) && formData.image.length > 0 ? "Change Images" : "Upload Images"}
              </Button>
              <input
                id="image-upload"
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={e => {
                  const files = Array.from(e.target.files || []);
                  if (files.length > 0) {
                    const readers = files.map(file => {
                      return new Promise<string>((resolve) => {
                        const reader = new FileReader();
                        reader.onload = ev => resolve(ev.target?.result as string);
                        reader.readAsDataURL(file);
                      });
                    });
                    Promise.all(readers).then(images => {
                      setFormData({ ...formData, image: [...(Array.isArray(formData.image) ? formData.image : []), ...images] });
                    });
                  }
                }}
              />
            </div>
            {/* Thumbnails (static, can be extended) */}
            <div className="flex gap-2 mt-2">
              {(Array.isArray(formData.image) && formData.image.length > 0 ? formData.image : ["/assets/images/product-camera.jpg"]).map((img, idx) => (
                <img key={idx} src={img.startsWith("data:") || img.startsWith("http") ? img : `/assets/images/${img}`}
                  className="w-12 h-12 object-contain rounded border" alt="thumb" />
              ))}
              <img src="/assets/images/product-laptop.jpg" className="w-12 h-12 object-contain rounded border" alt="thumb" />
              <img src="/assets/images/product-headphones.jpg" className="w-12 h-12 object-contain rounded border" alt="thumb" />
            </div>
          </div>
          {/* Right: Form fields */}
          <div className="flex-1 flex flex-col gap-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-2xl font-semibold">{formData.id ? "Update Model" : "Create Model"}</h2>
              {editIndex !== null && (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="rounded-full border border-gray-300"
                    onClick={handlePrev}
                    disabled={editIndex === 0}
                    title="Previous Model"
                  >
                    &lt;
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="rounded-full border border-gray-300"
                    onClick={handleNext}
                    disabled={editIndex === data.length - 1}
                    title="Next Model"
                  >
                    &gt;
                  </Button>
                </div>
              )}
            </div>
            <form
              onSubmit={e => {
                e.preventDefault();
                handleSubmit();
              }}
              className="flex flex-col gap-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="model_code" className="mb-2">Model Code</Label>
                  <Input id="model_code" value={getModelCode()} readOnly className="bg-gray-100 cursor-not-allowed" />
                </div>
                <div>
                  <Label htmlFor="name" className="mb-2">Name</Label>
                  <Input id="name" value={formData.name || ""} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="specification" className="mb-2">Specification</Label>
                  <textarea
                    id="specification"
                    value={formData.specification || ""}
                    onChange={e => setFormData({ ...formData, specification: e.target.value })}
                    className="w-full rounded border border-gray-300 px-3 py-2 min-h-[80px]"
                    rows={3}
                  />
                </div>
                {/* Generation and Type inline */}
                <div>
                  <Label htmlFor="generation" className="mb-2">Generation</Label>
                  <Input
                    id="generation"
                    className="uppercase"
                    value={formData.generation || ""}
                    onChange={e => setFormData({ ...formData, generation: e.target.value })}
                    placeholder="e.g. 10th Gen, M1, Ryzen 7, etc."
                  />
                </div>
                <div>
                  <Label className="mb-2">Type</Label>
                  <Select value={formData.type?.code || ""} onValueChange={val => { const selected = types.find(t => t.code === val); setFormData({ ...formData, type: selected }); }}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Select a type" /></SelectTrigger>
                    <SelectContent><SelectGroup><SelectLabel>Types</SelectLabel>{types.map(type => (<SelectItem key={type.code} value={type.code}>{type.name}</SelectItem>))}</SelectGroup></SelectContent>
                  </Select>
                </div>
              </div>
              {/* Brand, Category, Status row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="mb-2">Brand</Label>
                  <Select value={formData.brand?.code || ""} onValueChange={val => { const selected = brands.find(b => b.code === val); setFormData({ ...formData, brand: selected }); }}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Select a brand" /></SelectTrigger>
                    <SelectContent><SelectGroup><SelectLabel>Brands</SelectLabel>{brands.map(brand => (<SelectItem key={brand.code} value={brand.code}>{brand.name}</SelectItem>))}</SelectGroup></SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-2">Category</Label>
                  <Select value={formData.category?.code || ""} onValueChange={val => { const selected = categories.find(c => c.code === val); setFormData({ ...formData, category: selected }); }}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Select a category" /></SelectTrigger>
                    <SelectContent><SelectGroup><SelectLabel>Categories</SelectLabel>{categories.map(category => (<SelectItem key={category.code} value={category.code}>{category.name}</SelectItem>))}</SelectGroup></SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-2">Status</Label>
                  <Select value={formData.status || "active"} onValueChange={val => setFormData({ ...formData, status: val as 'active' | 'inactive' })}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Select status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <Button type="submit" variant="default">Save</Button>
                <Button type="button" variant="outline" onClick={handleCloseForm}>Cancel</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CoreModel;