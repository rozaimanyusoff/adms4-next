"use client";

import React, { useEffect, useState } from "react";
import { CustomDataGrid, ColumnDef } from "@components/ui/DataGrid";
import { authenticatedApi } from "../../config/api";
import { Plus, Pencil } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface Manager {
    ramco_id: string;
    full_name: string;
}

interface Type {
    id: number;
    code: string;
    name: string;
    description: string;
    image?: string;
    ramco_id?: string;
    manager?: Manager;
}

const CoreType: React.FC = () => {
    const [data, setData] = useState<Type[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState<Partial<Type>>({ name: "", description: "" });
    const [managerOptions, setManagerOptions] = useState<Manager[]>([]);
    const [managerSearch, setManagerSearch] = useState("");
    const [managerLoading, setManagerLoading] = useState(false);

    const fetchData = async () => {
        try {
            const response = await authenticatedApi.get<any>("/api/assets/types");
            setData(Array.isArray(response.data) ? response.data : (response.data && response.data.data ? response.data.data : []));
        } catch (error) {
            console.error("Error fetching types data:", error);
            setData([]);
        } finally {
            setLoading(false);
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
    }, []);

    useEffect(() => {
        // Prefill manager name on edit
        if (formData.manager && formData.manager.full_name) {
            setManagerSearch(formData.manager.full_name);
        } else if (formData.ramco_id && data.length) {
            // Try to find manager by ramco_id
            const found = data.find((t: any) => t.ramco_id === formData.ramco_id);
            if (found && found.manager && found.manager.full_name) setManagerSearch(found.manager.full_name);
        } else {
            setManagerSearch("");
        }
    }, [formData.manager, formData.ramco_id, isModalOpen]);

    const handleSubmit = async () => {
        try {
            const payload = {
                code: formData.code,
                name: formData.name,
                description: formData.description,
                image: formData.image,
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
            setIsModalOpen(false);
            setFormData({ name: "", description: "", image: "" });
        } catch (error) {
            toast.error("Error submitting form");
            console.error("Error submitting form:", error);
        }
    };

    const columns: ColumnDef<Type>[] = [
        { key: "id" as keyof Type, header: "ID" },
        { key: "code" as keyof Type, header: "Code" },
        { key: "name" as keyof Type, header: "Name" },
        { key: "description" as keyof Type, header: "Description" },
        {
            key: "manager" as keyof Type,
            header: "Manager",
            render: (row: Type) => row.manager?.full_name || "-"
        },
        {
            key: "actions" as keyof Type,
            header: "Actions",
            render: (row: Type) => (
                <Pencil
                    size={20}
                    className="inline-flex items-center justify-center rounded hover:bg-yellow-100 cursor-pointer text-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    tabIndex={0}
                    role="button"
                    aria-label="Edit Type"
                    onClick={() => {
                        setFormData(row);
                        setIsModalOpen(true);
                    }}
                    onKeyDown={e => {
                        if (e.key === "Enter" || e.key === " ") {
                            setFormData(row);
                            setIsModalOpen(true);
                        }
                    }}
                />
            ),
        },
    ];

    return (
        <div className="mt-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold mb-4">Asset Type Maintenance</h2>
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
                        <DialogTitle>{formData.id ? "Update Type" : "Create Type"}</DialogTitle>
                        <DialogDescription>Fill in the details below:</DialogDescription>
                    </DialogHeader>
                    <form
                        onSubmit={(e) => {
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
                                className="capitalize"
                                value={formData.name || ""}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                    setFormData({ ...formData, name: e.target.value })
                                }
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
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                    setFormData({ ...formData, description: e.target.value })
                                }
                                required
                            />
                        </div>
                        <div className="mb-4">
                            <Label htmlFor="code" className="block text-sm font-medium text-gray-700">
                                Code
                            </Label>
                            <Input
                                id="code"
                                value={formData.code || ""}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                    setFormData({ ...formData, code: e.target.value })
                                }
                                required
                            />
                        </div>
                        <div className="mb-4">
                            <Label htmlFor="manager" className="block text-sm font-medium text-gray-700">
                                Asset Manager
                            </Label>
                            <Input
                                id="manager"
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
                            {managerLoading && <div className="text-xs text-gray-400">Searching...</div>}
                            {managerOptions.length > 0 && !formData.manager && (
                                <ul className="border rounded bg-white mt-1 max-h-40 overflow-y-auto z-10">
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
                        <div className="mb-4">
                            <Label htmlFor="image" className="block text-sm font-medium text-gray-700">
                                Image
                            </Label>
                            <Input
                                id="image"
                                type="file"
                                accept="image/*"
                                onChange={e => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        const reader = new FileReader();
                                        reader.onload = ev => {
                                            setFormData({ ...formData, image: typeof ev.target?.result === 'string' ? ev.target.result : undefined });
                                        };
                                        reader.readAsDataURL(file);
                                    }
                                }}
                            />
                            {formData.image && (
                                <img src={formData.image} alt="Preview" className="h-16 mt-2 rounded border" />
                            )}
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

export default CoreType;