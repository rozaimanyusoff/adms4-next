"use client";

import React, { useEffect, useState } from "react";
import { CustomDataGrid } from "@components/layouts/ui/DataGrid";
import { authenticatedApi } from "../../config/api";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faEdit } from "@fortawesome/free-solid-svg-icons";
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

interface Department { id: number; name: string; }
interface Position { id: number; name: string; }
interface District { id: number; name: string; code: string; }
interface Section { id: number; name: string; }
interface Employee {
    id: number;
    name: string;
    email: string;
    phone: string;
    department?: Department;
    section?: Section;
    position?: Position;
    district?: District;
    image?: string;
}

const OrgEmp: React.FC = () => {
    const [data, setData] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [sections, setSections] = useState<Section[]>([]);
    const [positions, setPositions] = useState<Position[]>([]);
    const [districts, setDistricts] = useState<District[]>([]);
    const [formData, setFormData] = useState<Partial<Employee>>({ name: "", email: "", phone: "", department: undefined, section: undefined, position: undefined, district: undefined, image: "" });

    const fetchData = async () => {
        try {
            const [empRes, deptRes, secRes, posRes, distRes] = await Promise.all([
                authenticatedApi.get<any>("/api/stock/employees"),
                authenticatedApi.get<any>("/api/stock/departments"),
                authenticatedApi.get<any>("/api/stock/sections"),
                authenticatedApi.get<any>("/api/stock/positions"),
                authenticatedApi.get<any>("/api/stock/districts"),
            ]);
            setData(Array.isArray(empRes.data) ? empRes.data : (empRes.data && empRes.data.data ? empRes.data.data : []));
            setDepartments(Array.isArray(deptRes.data) ? deptRes.data : (deptRes.data && deptRes.data.data ? deptRes.data.data : []));
            setSections(Array.isArray(secRes.data) ? secRes.data : (secRes.data && secRes.data.data ? secRes.data.data : []));
            setPositions(Array.isArray(posRes.data) ? posRes.data : (posRes.data && posRes.data.data ? posRes.data.data : []));
            setDistricts(Array.isArray(distRes.data) ? distRes.data : (distRes.data && distRes.data.data ? distRes.data.data : []));
        } catch (error) {
            setData([]); setDepartments([]); setSections([]); setPositions([]); setDistricts([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const handleSubmit = async () => {
        try {
            const payload = {
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                image: formData.image,
                departmentId: formData.department?.id,
                sectionId: formData.section?.id,
                positionId: formData.position?.id,
                districtId: formData.district?.id,
            };
            if (formData.id) {
                await authenticatedApi.put(`/api/stock/employees/${formData.id}`, payload);
            } else {
                await authenticatedApi.post("/api/stock/employees", payload);
            }
            fetchData();
            setIsModalOpen(false);
            setFormData({ name: "", email: "", phone: "", department: undefined, section: undefined, position: undefined, district: undefined, image: "" });
        } catch (error) { }
    };

    const columns = [
        { key: "id" as keyof Employee, header: "ID" },
        { key: "name" as keyof Employee, header: "Name" },
        { key: "email" as keyof Employee, header: "Email" },
        { key: "phone" as keyof Employee, header: "Phone" },
        { key: "department" as keyof Employee, header: "Department", render: (row: Employee) => row.department?.name || "-" },
        { key: "section" as keyof Employee, header: "Section", render: (row: Employee) => row.section?.name || "-" },
        { key: "position" as keyof Employee, header: "Position", render: (row: Employee) => row.position?.name || "-" },
        { key: "district" as keyof Employee, header: "District", render: (row: Employee) => row.district?.name || "-" },
        {
            key: "actions" as keyof Employee,
            header: "Actions",
            render: (row: Employee) => (
                <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => { setFormData(row); setIsModalOpen(true); }}
                    className="bg-yellow-500 hover:bg-yellow-600"
                >
                    <FontAwesomeIcon icon={faEdit} />
                </Button>
            ),
        },
    ];

    return (
        <div className="p-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold mb-4">Employees</h2>
                <Button onClick={() => setIsModalOpen(true)} className="mb-4 bg-blue-600 hover:bg-blue-700">
                    <FontAwesomeIcon icon={faPlus} size="xl" />
                </Button>
            </div>
            {loading ? <p>Loading...</p> : <CustomDataGrid columns={columns} data={data} />}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{formData.id ? "Update Employee" : "Create Employee"}</DialogTitle>
                        <DialogDescription>Fill in the details below:</DialogDescription>
                    </DialogHeader>
                    <form
                        onSubmit={e => { e.preventDefault(); handleSubmit(); }}
                    >
                        <div className="mb-4">
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700">Name</label>
                            <Input
                                id="name"
                                value={formData.name || ""}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </div>
                        <div className="mb-4">
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
                            <Input
                                id="email"
                                value={formData.email || ""}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                required
                            />
                        </div>
                        <div className="mb-4">
                            <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Phone</label>
                            <Input
                                id="phone"
                                value={formData.phone || ""}
                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                required
                            />
                        </div>
                        <div className="mb-4">
                            <label htmlFor="image" className="block text-sm font-medium text-gray-700">Image URL</label>
                            <Input
                                id="image"
                                value={formData.image || ""}
                                onChange={e => setFormData({ ...formData, image: e.target.value })}
                            />
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700">Department</label>
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
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700">Section</label>
                            <Select
                                value={formData.section?.id?.toString() || ""}
                                onValueChange={val => {
                                    const selected = sections.find(s => s.id === Number(val));
                                    setFormData({ ...formData, section: selected });
                                }}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select a section" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        <SelectLabel>Sections</SelectLabel>
                                        {sections.map(section => (
                                            <SelectItem key={section.id} value={section.id.toString()}>
                                                {section.name}
                                            </SelectItem>
                                        ))}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700">Position</label>
                            <Select
                                value={formData.position?.id?.toString() || ""}
                                onValueChange={val => {
                                    const selected = positions.find(p => p.id === Number(val));
                                    setFormData({ ...formData, position: selected });
                                }}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select a position" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        <SelectLabel>Positions</SelectLabel>
                                        {positions.map(pos => (
                                            <SelectItem key={pos.id} value={pos.id.toString()}>
                                                {pos.name}
                                            </SelectItem>
                                        ))}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700">District</label>
                            <Select
                                value={formData.district?.id?.toString() || ""}
                                onValueChange={val => {
                                    const selected = districts.find(l => l.id === Number(val));
                                    setFormData({ ...formData, district: selected });
                                }}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select a district" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        <SelectLabel>Districts</SelectLabel>
                                        {districts.map(dist => (
                                            <SelectItem key={dist.id} value={dist.id.toString()}>
                                                {dist.code}
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

export default OrgEmp;
