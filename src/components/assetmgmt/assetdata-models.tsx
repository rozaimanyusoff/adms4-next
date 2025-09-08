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

interface Model {
  id: number;
  name: string;
  image?: string | null; // single filename or url
  specification?: string;
  generation?: string;
  status?: 'active' | 'inactive' | string;
  type?: { id: number; name: string } | null;
  brand?: { id: number; name: string } | null;
  category?: { id: number; name: string } | null;
  // keep legacy codes optional but not required
  // legacy code fields removed
}

interface Brand { id: number; name: string; }
interface Category { id: number; name: string; }
interface Type { id: number; name: string; }
// Add a type for image preview
// image upload/preview removed — form simplified

const CoreModel: React.FC = () => {
  const [data, setData] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [types, setTypes] = useState<Type[]>([]);
  const [formData, setFormData] = useState<Partial<Model>>({ name: "", brand: undefined, category: undefined, type: undefined, status: "active" });
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
      // Build payload expected by backend: use *_id fields for relations
      const payload: any = {
        id: formData.id,
        name: formData.name,
        type_id: formData.type?.id ?? null,
        brand_id: formData.brand?.id ?? null,
        category_id: formData.category?.id ?? null,
        // item_code/model_code intentionally omitted
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
  setFormData({ name: "", brand: undefined, category: undefined, type: undefined, status: "active" });
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
    // Normalize incoming nested objects
    setFormData({
      ...row,
      brand: row.brand ?? (row as any).brand ?? undefined,
      category: row.category ?? (row as any).category ?? undefined,
      type: row.type ?? (row as any).type ?? undefined,
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
  setFormData({ name: "", brand: undefined, category: undefined, type: undefined, status: "active" });
  };

  const columns: ColumnDef<Model>[] = [
    { key: "id", header: "ID" },
  { key: "name", header: "Name", sortable: true, filter: "input" },
    {
      key: "brand",
      header: "Brand",
      filter: "singleSelect",
      sortable: true,
      filterParams: {
        labelMap: Object.fromEntries(brands.map(b => [String(b.id), b.name])),
      },
      render: (row: Model) => row.brand?.name || "-",
    },
    {
      key: "category",
      header: "Category",
      filter: "singleSelect",
      sortable: true,
      filterParams: {
        labelMap: Object.fromEntries(categories.map(c => [String(c.id), c.name])),
      },
      render: (row: Model) => row.category?.name || "-",
    },
    {
      key: "type",
      header: "Type",
      filter: "singleSelect",
      filterParams: {
        labelMap: Object.fromEntries(types.map(t => [String(t.id), t.name])),
      },
      render: (row: Model) => row.type?.name || "-",
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
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold mb-4">Model Maintenance</h2>
        <Button onClick={() => { setIsModalOpen(true); setEditIndex(null); setFormData({ name: "", brand: undefined, category: undefined, type: undefined, status: "active" }); }} className="mb-4 bg-blue-600 hover:bg-blue-700">
          <Plus size={22} />
        </Button>
      </div>
      {loading ? (
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
      )}
      {/* Dialog form */}
      <Dialog open={isModalOpen} onOpenChange={(open) => { if (!open) handleCloseForm(); }}>
        <DialogContent className="max-w-4xl w-full">
          <DialogHeader>
            <DialogTitle>{formData.id ? "Update Model" : "Create Model"}</DialogTitle>
            <DialogDescription />
          </DialogHeader>
          <div className="flex-1 flex flex-col gap-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-medium">{formData.id ? "Update Model" : "Create Model"}</h3>
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
                {/* First row: Type, Brand, Category (single-selects) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="mb-2">Type</Label>
                    <Select value={formData.type?.id?.toString() || ""} onValueChange={val => { const selected = types.find(t => String(t.id) === val); setFormData({ ...formData, type: selected }); }}>
                      <SelectTrigger className="w-full"><SelectValue placeholder="Select a type" /></SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>Types</SelectLabel>
                          {types.map(type => (<SelectItem key={String(type.id)} value={String(type.id)}>{type.name}</SelectItem>))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="mb-2">Brand</Label>
                    <Select value={formData.brand?.id?.toString() || ""} onValueChange={val => { const selected = brands.find(b => String(b.id) === val); setFormData({ ...formData, brand: selected }); }}>
                      <SelectTrigger className="w-full"><SelectValue placeholder="Select a brand" /></SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>Brands</SelectLabel>
                          {brands.map(brand => (<SelectItem key={String(brand.id)} value={String(brand.id)}>{brand.name}</SelectItem>))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="mb-2">Category</Label>
                    <Select value={formData.category?.id?.toString() || ""} onValueChange={val => { const selected = categories.find(c => String(c.id) === val); setFormData({ ...formData, category: selected }); }}>
                      <SelectTrigger className="w-full"><SelectValue placeholder="Select a category" /></SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>Categories</SelectLabel>
                          {categories.map(category => (<SelectItem key={String(category.id)} value={String(category.id)}>{category.name}</SelectItem>))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Name, Generation and Specification */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <Label htmlFor="name" className="mb-2">Name</Label>
                    <Input id="name" value={formData.name || ""} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                  </div>
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
                </div>
                {/* Status row */}
                <div className="mt-4">
                  <Label className="mb-2">Status</Label>
                  <Select value={formData.status || "active"} onValueChange={val => setFormData({ ...formData, status: val as 'active' | 'inactive' })}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Select status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2 mt-6">
                  <Button type="submit" variant="default">Save</Button>
                  <Button type="button" variant="outline" onClick={handleCloseForm}>Cancel</Button>
                </div>
              </form>
      </div>
    </DialogContent>
      </Dialog>
    </div>
  );
};

export default CoreModel;