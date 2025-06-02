"use client";

import React, { useEffect, useState } from "react";
import { CustomDataGrid } from "@components/ui/DataGrid";
import { authenticatedApi } from "../../config/api";
import { Plus, Pencil } from "lucide-react";
import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
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

interface Section {
    id: number;
    name: string;
    department?: { id: number; name: string };
}
interface Department { id: number; name: string; }

const OrgSection: React.FC = () => {
    const [data, setData] = useState<Section[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [formData, setFormData] = useState<Partial<Section>>({ name: "", department: undefined });

    const fetchData = async () => {
        try {
            const [sectionsRes, departmentsRes] = await Promise.all([
                authenticatedApi.get<any>("/api/assets/sections"),
                authenticatedApi.get<any>("/api/assets/departments"),
            ]);
            const deptArr = Array.isArray(departmentsRes.data) ? departmentsRes.data : (departmentsRes.data && departmentsRes.data.data ? departmentsRes.data.data : []);
            setData(Array.isArray(sectionsRes.data) ? sectionsRes.data : (sectionsRes.data && sectionsRes.data.data ? sectionsRes.data.data : []));
            setDepartments(deptArr);
            console.log('Departments loaded:', deptArr);
        } catch (error) {
            setData([]); setDepartments([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const handleSubmit = async () => {
        try {
            const payload = {
                name: formData.name,
                departmentId: formData.department?.id,
            };
            if (formData.id) {
                await authenticatedApi.put(`/api/assets/sections/${formData.id}`, payload);
            } else {
                await authenticatedApi.post("/api/assets/sections", payload);
            }
            fetchData();
            setIsModalOpen(false);
            setFormData({ name: "", department: undefined });
        } catch (error) { }
    };

    const columns = [
        { key: "id" as keyof Section, header: "ID" },
        { key: "name" as keyof Section, header: "Name" },
        { key: "department" as keyof Section, header: "Department", render: (row: Section) => row.department?.name || "-" },
        {
            key: "actions" as keyof Section,
            header: "Actions",
            render: (row: Section) => (
                <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => { setFormData(row); setIsModalOpen(true); }}
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
                <h2 className="text-xl font-bold mb-4">Sections</h2>
                <Button onClick={() => setIsModalOpen(true)} className="mb-4 bg-blue-600 hover:bg-blue-700">
                    <Plus size={22} />
                </Button>
            </div>
            {loading ? <p>Loading...</p> : <CustomDataGrid columns={columns} data={data} />}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{formData.id ? "Update Section" : "Create Section"}</DialogTitle>
                        <DialogDescription>Fill in the details below:</DialogDescription>
                    </DialogHeader>
                    <form
                        onSubmit={e => { e.preventDefault(); handleSubmit(); }}
                    >
                        <div className="mb-4">
                            <Label htmlFor="name" className="block text-sm font-medium text-gray-700">Name</Label>
                            <Input
                                id="name"
                                value={formData.name || ""}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </div>
                        <div className="mb-4">
                            <Label className="block text-sm font-medium text-gray-700">Department</Label>
                            <Select
                                value={formData.department?.id?.toString() || ""}
                                onValueChange={val => {
                                    const selected = departments.find(d => d.id === Number(val));
                                    setFormData({ ...formData, department: selected });
                                }}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select a department" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        <SelectLabel>Departments</SelectLabel>
                                        {departments.map(dept => (
                                            <SelectItem key={dept.id} value={dept.id.toString()}>
                                                {dept.name}
                                            </SelectItem>
                                        ))}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                        </div>
                        <Button type="submit" className="mt-4">Submit</Button>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default OrgSection;
