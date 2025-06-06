"use client";

import React, { useEffect, useState } from "react";
import { CustomDataGrid, ColumnDef } from "@components/ui/DataGrid";
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
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface Software {
    id: number;
    name: string;
}

const CoreSoftware: React.FC = () => {
    const [data, setData] = useState<Software[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState<Partial<Software>>({ name: "" });

    const fetchData = async () => {
        try {
            const response = await authenticatedApi.get<any>("/api/assets/softwares");
            setData(Array.isArray(response.data) ? response.data : (response.data && response.data.data ? response.data.data : []));
        } catch (error) {
            toast.error("Error fetching software data");
            setData([]);
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
                name: formData.name,
            };
            if (formData.id) {
                await authenticatedApi.put(`/api/assets/softwares/${formData.id}`, payload);
                toast.success("Software updated successfully");
            } else {
                await authenticatedApi.post("/api/assets/softwares", payload);
                toast.success("Software created successfully");
            }
            fetchData();
            setIsModalOpen(false);
            setFormData({ name: "" });
        } catch (error) {
            toast.error("Error submitting form");
            console.error("Error submitting form:", error);
        }
    };

    const columns: ColumnDef<Software>[] = [
        { key: "id" as keyof Software, header: "ID" },
        { key: "name" as keyof Software, header: "Name" },
        {
            key: "actions" as keyof Software,
            header: "Actions",
            render: (row: Software) => (
                <span
                    role="button"
                    tabIndex={0}
                    aria-label="Edit Software"
                    onClick={() => {
                        setFormData(row);
                        setIsModalOpen(true);
                    }}
                    className="inline-flex items-center justify-center p-1 rounded hover:bg-yellow-100 cursor-pointer text-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    onKeyDown={e => {
                        if (e.key === "Enter" || e.key === " ") {
                            setFormData(row);
                            setIsModalOpen(true);
                        }
                    }}
                >
                    <Pencil size={20} />
                </span>
            ),
        },
    ];

    return (
        <div className="mt-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold mb-4">Software Maintenance</h2>
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
                        <DialogTitle>{formData.id ? "Update Software" : "Create Software"}</DialogTitle>
                        <DialogDescription>Fill in the details below:</DialogDescription>
                    </DialogHeader>
                    <form
                        onSubmit={e => {
                            e.preventDefault();
                            handleSubmit();
                        }}
                    >
                        <div className="mb-4">
                            <Label htmlFor="name">Name</Label>
                            <Input
                                id="name"
                                value={formData.name || ""}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </div>
                        <Button type="submit" className="mt-4">Submit</Button>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default CoreSoftware;
