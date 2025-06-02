"use client";

import React, { useEffect, useState } from "react";
import { CustomDataGrid } from "@components/ui/DataGrid";
import { authenticatedApi } from "../../config/api";
import { Plus, Pencil } from "lucide-react";
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

interface Model {
  id: number;
  name: string;
  description: string;
  image?: string;
  brand?: { id: number; name: string };
  category?: { id: number; name: string };
}

interface Brand { id: number; name: string; }
interface Category { id: number; name: string; }

const CoreModel: React.FC = () => {
  const [data, setData] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [formData, setFormData] = useState<Partial<Model>>({ name: "", description: "", image: "", brand: undefined, category: undefined });

  const fetchData = async () => {
    try {
      const [modelsRes, brandsRes, categoriesRes] = await Promise.all([
        authenticatedApi.get<any>("/api/assets/models"),
        authenticatedApi.get<any>("/api/assets/brands"),
        authenticatedApi.get<any>("/api/assets/categories"),
      ]);
      setData(modelsRes.data.data || []);
      setBrands(Array.isArray(brandsRes.data) ? brandsRes.data : (brandsRes.data && brandsRes.data.data ? brandsRes.data.data : []));
      setCategories(Array.isArray(categoriesRes.data) ? categoriesRes.data : (categoriesRes.data && categoriesRes.data.data ? categoriesRes.data.data : []));
    } catch (error) {
      console.error("Error fetching models/brands/categories data:", error);
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
        brandId: formData.brand?.id,
        categoryId: formData.category?.id,
      };
      if (formData.id) {
        await authenticatedApi.put(`/api/assets/models/${formData.id}`, payload);
      } else {
        await authenticatedApi.post("/api/assets/models", payload);
      }
      fetchData();
      setIsModalOpen(false);
      setFormData({ name: "", description: "", image: "", brand: undefined, category: undefined });
    } catch (error) {
      console.error("Error submitting form:", error);
    }
  };

  const columns = [
    { key: "id" as keyof Model, header: "ID" },
    { key: "name" as keyof Model, header: "Name" },
    { key: "description" as keyof Model, header: "Description" },
    {
      key: "actions" as keyof Model,
      header: "Actions",
      render: (row: Model) => (
        <Button
          onClick={() => {
            setFormData(row);
            setIsModalOpen(true);
          }}
          className="bg-yellow-500 hover:bg-yellow-600"
        >
          <Pencil size={20} />
        </Button>
      ),
    },
  ];

  return (
    <div className="p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold mb-4">Models</h2>
        <Button onClick={() => setIsModalOpen(true)} className="mb-4 bg-blue-600 hover:bg-blue-700">
          <Plus size={22} />
        </Button>
      </div>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <CustomDataGrid columns={columns} data={data} />
      )}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{formData.id ? "Update Model" : "Create Model"}</DialogTitle>
            <DialogDescription>Fill in the details below:</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={e => {
              e.preventDefault();
              handleSubmit();
            }}
          >
            <div className="mb-4">
              <Label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Name
              </Label>
              <Input
                id="name"
                value={formData.name || ""}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="mb-4">
              <Label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Description
              </Label>
              <Input
                id="description"
                value={formData.description || ""}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                required
              />
            </div>
            <div className="mb-4">
              <Label htmlFor="image" className="block text-sm font-medium text-gray-700">
                Image URL
              </Label>
              <Input
                id="image"
                value={formData.image || ""}
                onChange={e => setFormData({ ...formData, image: e.target.value })}
              />
            </div>
            <div className="mb-4">
              <Label className="block text-sm font-medium text-gray-700">Brand</Label>
              <Select
                value={formData.brand?.id?.toString() || ""}
                onValueChange={val => {
                  const selected = brands.find(b => b.id === Number(val));
                  setFormData({ ...formData, brand: selected });
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a brand" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Brands</SelectLabel>
                    {brands.map(brand => (
                      <SelectItem key={brand.id} value={brand.id.toString()}>
                        {brand.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="mb-4">
              <Label className="block text-sm font-medium text-gray-700">Category</Label>
              <Select
                value={formData.category?.id?.toString() || ""}
                onValueChange={val => {
                  const selected = categories.find(c => c.id === Number(val));
                  setFormData({ ...formData, category: selected });
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Categories</SelectLabel>
                    {categories.map(category => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="mt-4">
              Submit
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CoreModel;