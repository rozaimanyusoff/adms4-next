"use client";

import React, { useEffect, useState } from "react";
import { CustomDataGrid, ColumnDef } from "@components/ui/DataGrid";
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
  item_code?: string;
  model_code?: string; // <-- add this line
}

interface Brand { id: number; code: string; name: string; }
interface Category { id: number; code: string; name: string; }
interface Type { id: number; code: string; name: string; }
// Add a type for image preview
interface ImagePreview {
  name: string;
  preview: string;
}

const CoreModel: React.FC = () => {
  const [data, setData] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [types, setTypes] = useState<Type[]>([]);
  const [imagePreviews, setImagePreviews] = useState<ImagePreview[]>([]);
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
        id: formData.id,
        name: formData.name,
        image: Array.isArray(formData.image) && formData.image.length > 0 ? formData.image[0] : null,
        type_code: formData.type?.code || formData.type_code || null,
        category_code: formData.category?.code || formData.category_code || null,
        brand_code: formData.brand?.code || formData.brand_code || null,
        item_code: formData.item_code || null, // <-- include item_code in the payload
        model_code: formData.model_code || null,
        specification: formData.specification || "",
        generation: formData.generation || "",
        status: formData.status || null,
      };
      if (formData.id) {
        await authenticatedApi.put(`/api/assets/models/${formData.id}`, payload);
        toast.success("Model updated successfully");
      } else {
        await authenticatedApi.post("/api/assets/models", payload);
        toast.success("Model created successfully");
      }
      fetchData();
      setIsModalOpen(false);
      setFormData({ name: "", image: [], brand: undefined, category: undefined, type: undefined, status: "active" });
    } catch (error) {
      toast.error("Error submitting form");
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

  const columns: ColumnDef<Model>[] = [
    { key: "id", header: "ID" },
    { key: "item_code", header: "Item Code", sortable: true, filter: "input" },
    { key: "name", header: "Name", sortable: true, filter: "input" },
    {
      key: "brand_code",
      header: "Brand",
      filter: "singleSelect",
      sortable: true,
      filterParams: {
        labelMap: Object.fromEntries(brands.map(b => [b.code, b.name])),
      },
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
      key: "category_code",
      header: "Category",
      filter: "singleSelect",
      sortable: true,
      filterParams: {
        labelMap: Object.fromEntries(categories.map(c => [c.code, c.name])),
      },
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
      key: "type_code",
      header: "Type",
      filter: "singleSelect",
      filterParams: {
        labelMap: Object.fromEntries(types.map(t => [t.code, t.name])),
      },
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
      key: "status",
      header: "Status",
      filter: "singleSelect",
      filterParams: {
        options: ["active", "inactive"],
        labelMap: { active: "Active", inactive: "Inactive" },
      },
      render: (row: Model) => row.status === "inactive" ? "Inactive" : "Active",
    },
    {
      key: "actions" as keyof Model,
      header: "Actions",
      render: (row: Model) => (
        <div className="flex gap-2">
          <Pencil
            size={20}
            className="inline-flex items-center justify-center rounded hover:bg-yellow-100 cursor-pointer text-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-400"
            tabIndex={0}
            role="button"
            aria-label="Edit Model"
            onClick={() => openEditForm(row)}
            onKeyDown={e => {
              if (e.key === "Enter" || e.key === " ") openEditForm(row);
            }}
          />
          <Trash
            size={20}
            className="inline-flex items-center justify-center rounded hover:bg-red-100 cursor-pointer text-red-600 focus:outline-none focus:ring-2 focus:ring-red-400"
            tabIndex={0}
            role="button"
            aria-label="Delete Model"
            onClick={() => handleDelete(row.id)}
            onKeyDown={e => {
              if (e.key === "Enter" || e.key === " ") handleDelete(row.id);
            }}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="mt-4">
      {/* Hide title and + Add button when form is visible */}
      {!isModalOpen && (
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold mb-4">Model Maintenance</h2>
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
          <CustomDataGrid
            data={data}
            columns={columns}
            pageSize={10}
            pagination={true}
            persistPagination={true}
            persistenceKey="core-model"
            inputFilter={false}
            columnsVisibleOption={false}
            rowClass={row => ''}
            rowSelection={undefined}
            rowExpandable={undefined}
          />
        )
      )}
      {/* Full-width panel form */}
      {isModalOpen && (
        <div className="bg-white rounded-lg shadow p-8 w-full mx-auto relative flex flex-col md:flex-row gap-8">
          {/* Left: Image upload/preview */}
          <div className="flex flex-col items-center md:w-1/3 w-full">
            <div className="w-full flex flex-col items-center mb-4 gap-2">
              <div className="flex flex-wrap gap-2 justify-center">
                {imagePreviews.length > 0 ? (
                  imagePreviews.map((img, idx) => (
                    <div key={idx} className="relative group">
                      <img
                        src={img.preview || `/assets/images/${img.name}`}
                        alt={formData.name || `Model image ${idx+1}`}
                        className="w-32 h-32 object-contain rounded border border-gray-200 bg-white"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        className="absolute top-1 right-1 text-red-500 opacity-0 group-hover:opacity-100 transition"
                        onClick={() => {
                          setImagePreviews(imagePreviews.filter((_, i) => i !== idx));
                          setFormData({ ...formData, image: (formData.image as string[]).filter((_, i) => i !== idx) });
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
                onChange={async e => {
                  const files = Array.from(e.target.files || []);
                  if (files.length > 0) {
                    // Generate base64 previews for each file
                    const previews = await Promise.all(files.map(file => {
                      return new Promise<ImagePreview>((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve({ name: file.name, preview: reader.result as string });
                        reader.onerror = reject;
                        reader.readAsDataURL(file);
                      });
                    }));
                    setImagePreviews(previews);
                    setFormData({ ...formData, image: previews.map(p => p.name) });
                  }
                }}
              />
            </div>
            {/* Thumbnails (static, can be extended) */}
            <div className="flex gap-2 mt-2">
              {(imagePreviews.length > 0 ? imagePreviews : [{ name: "/assets/images/product-camera.jpg", preview: "/assets/images/product-camera.jpg" }]).map((img, idx) => (
                <img key={idx} src={img.preview || `/assets/images/${img.name}`}
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
                {/* Remove Model Code field, replace with Item Code (read-only) */}
                <div>
                  <Label htmlFor="item_code" className="mb-2">Item Code</Label>
                  <Input id="item_code" value={formData.item_code || ""} readOnly className="bg-gray-100 cursor-not-allowed" />
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