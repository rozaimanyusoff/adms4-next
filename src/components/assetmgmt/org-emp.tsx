"use client";

import React, { useEffect, useState } from "react";
import { CustomDataGrid, ColumnDef } from "@components/ui/DataGrid";
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

interface Department { id: number; name: string; code: string; }
interface Position { id: number; name: string; }
interface District { id: number; name: string; code: string; }
interface CostCenter { id: number; name: string; }
interface Employee {
    id: number;
    ramco_id: string;
    full_name: string;
    email: string;
    contact: string;
    gender: string;
    dob: string;
    avatar?: string | null;
    hire_date: string;
    resignation_date: string;
    employment_type: string;
    employment_status: string;
    grade: string;
    position?: Position;
    department?: Department;
    costcenter?: CostCenter;
    district?: District;
}

const OrgEmp: React.FC = () => {
    const [data, setData] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [positions, setPositions] = useState<Position[]>([]);
    const [districts, setDistricts] = useState<District[]>([]);
    const [formData, setFormData] = useState<Partial<Employee>>({
        ramco_id: '',
        full_name: '',
        email: '',
        contact: '',
        gender: '',
        dob: '',
        avatar: '',
        hire_date: '',
        resignation_date: '',
        employment_type: '',
        employment_status: '',
        grade: '',
        department: undefined,
        position: undefined,
        district: undefined,
        costcenter: undefined,
    });

    const fetchData = async () => {
        try {
            const [empRes, deptRes, posRes, distRes] = await Promise.all([
                authenticatedApi.get<any>("/api/assets/employees"),
                authenticatedApi.get<any>("/api/assets/departments"),
                authenticatedApi.get<any>("/api/assets/positions"),
                authenticatedApi.get<any>("/api/assets/districts"),
            ]);
            setData(Array.isArray(empRes.data.data) ? empRes.data.data : []);
            setDepartments(Array.isArray(deptRes.data) ? deptRes.data : (deptRes.data && deptRes.data.data ? deptRes.data.data : []));
            setPositions(Array.isArray(posRes.data) ? posRes.data : (posRes.data && posRes.data.data ? posRes.data.data : []));
            setDistricts(Array.isArray(distRes.data) ? distRes.data : (distRes.data && distRes.data.data ? distRes.data.data : []));
        } catch (error) {
            setData([]); setDepartments([]); setPositions([]); setDistricts([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const handleSubmit = async () => {
        try {
            const payload = {
                ramco_id: formData.ramco_id,
                full_name: formData.full_name,
                email: formData.email,
                contact: formData.contact,
                gender: formData.gender,
                dob: formData.dob,
                avatar: formData.avatar,
                hire_date: formData.hire_date,
                resignation_date: formData.resignation_date,
                employment_type: formData.employment_type,
                employment_status: formData.employment_status,
                grade: formData.grade,
                departmentId: formData.department?.id,
                positionId: formData.position?.id,
                districtId: formData.district?.id,
                costcenterId: formData.costcenter?.id,
            };
            if (formData.id) {
                await authenticatedApi.put(`/api/assets/employees/${formData.id}`, payload);
            } else {
                await authenticatedApi.post("/api/assets/employees", payload);
            }
            fetchData();
            setIsModalOpen(false);
            setFormData({
                ramco_id: '',
                full_name: '',
                email: '',
                contact: '',
                gender: '',
                dob: '',
                avatar: '',
                hire_date: '',
                resignation_date: '',
                employment_type: '',
                employment_status: '',
                grade: '',
                department: undefined,
                position: undefined,
                district: undefined,
                costcenter: undefined,
            });
        } catch (error) { }
    };

    // Add date formatting helper
    const formatDateDMY = (dateStr?: string) => {
        if (!dateStr) return "";
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return "";
        return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
    };
    // Add service length helper
    const getServiceLength = (hireDate?: string) => {
        if (!hireDate) return "-";
        const start = new Date(hireDate);
        const now = new Date();
        if (isNaN(start.getTime())) return "-";
        let years = now.getFullYear() - start.getFullYear();
        let months = now.getMonth() - start.getMonth();
        if (months < 0) {
            years--;
            months += 12;
        }
        return `${years}y ${months}m`;
    };
    // Add helper to check for valid resignation date
    const isValidResignationDate = (dateStr?: string, status?: string) => {
        if (!dateStr || status === 'active') return false;
        if (dateStr.startsWith('0000') || dateStr.startsWith('1899')) return false;
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return false;
        // Optionally, treat future dates as invalid
        if (d.getFullYear() < 1950) return false;
        return true;
    };

    const columns: ColumnDef<Employee>[] = [
        { key: "id", header: "ID" },
        { key: "ramco_id", header: "Ramco ID", filter: 'input' },
        { key: "full_name", header: "Full Name", filter: 'input' },
        { key: "email", header: "Email" },
        { key: "contact", header: "Contact" },
        { key: "gender", header: "Gender", filter: 'singleSelect' },
        /* { key: "dob", header: "DOB", render: (row: Employee) => formatDateDMY(row.dob) }, */
        { key: "hire_date", header: "Hire Date", render: (row: Employee) => formatDateDMY(row.hire_date) },
        { key: "service_length" as any, header: "Service Length", render: (row: Employee) => getServiceLength(row.hire_date) },
        { key: "department", header: "Department", render: (row: Employee) => row.department?.code || "-", filter: 'singleSelect' },
        { key: "costcenter", header: "Cost Center", render: (row: Employee) => row.costcenter?.name || "-", filter: 'singleSelect' },
        { key: "district", header: "District", render: (row: Employee) => row.district?.code || "-", filter: 'singleSelect' },
        { key: "employment_type", header: "Type", filter: 'singleSelect' },
        { key: "employment_status", header: "Status", filter: 'singleSelect' },
        /* { key: "grade", header: "Grade" }, */
        /* { key: "position", header: "Position", render: (row: Employee) => row.position?.name || "-" }, */
        { key: "resignation_date", header: "Resignation Date", render: (row: Employee) => isValidResignationDate(row.resignation_date, row.employment_status) ? formatDateDMY(row.resignation_date) : "-" },
        {
            key: "actions" as keyof Employee,
            header: "Actions",
            render: (row: Employee) => (
                <Pencil
                    size={20}
                    className="inline-flex items-center justify-center rounded hover:bg-yellow-100 cursor-pointer text-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    onClick={() => { setFormData(row); setIsModalOpen(true); }}
                />
            ),
        },
    ];

    return (
        <div className="mt-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold mb-4">Employees</h2>
                <Button onClick={() => setIsModalOpen(true)} className="mb-4 bg-blue-600 hover:bg-blue-700">
                    <Plus size={22} />
                </Button>
            </div>
            {loading ? <p>Loading...</p> : <CustomDataGrid columns={columns} data={data} inputFilter={false} />}
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
                            <Label htmlFor="ramco_id" className="block text-sm font-medium text-gray-700">Ramco ID</Label>
                            <Input
                                id="ramco_id"
                                value={formData.ramco_id || ""}
                                onChange={e => setFormData({ ...formData, ramco_id: e.target.value })}
                                required
                            />
                        </div>
                        <div className="mb-4">
                            <Label htmlFor="full_name" className="block text-sm font-medium text-gray-700">Full Name</Label>
                            <Input
                                id="full_name"
                                value={formData.full_name || ""}
                                onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                                required
                            />
                        </div>
                        <div className="mb-4">
                            <Label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</Label>
                            <Input
                                id="email"
                                value={formData.email || ""}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                required
                            />
                        </div>
                        <div className="mb-4">
                            <Label htmlFor="contact" className="block text-sm font-medium text-gray-700">Contact</Label>
                            <Input
                                id="contact"
                                value={formData.contact || ""}
                                onChange={e => setFormData({ ...formData, contact: e.target.value })}
                                required
                            />
                        </div>
                        <div className="mb-4">
                            <Label htmlFor="gender" className="block text-sm font-medium text-gray-700">Gender</Label>
                            <Input
                                id="gender"
                                value={formData.gender || ""}
                                onChange={e => setFormData({ ...formData, gender: e.target.value })}
                                required
                            />
                        </div>
                        <div className="mb-4">
                            <Label htmlFor="dob" className="block text-sm font-medium text-gray-700">Date of Birth</Label>
                            <Input
                                id="dob"
                                type="date"
                                value={formData.dob ? new Date(formData.dob).toISOString().slice(0, 10) : ""}
                                onChange={e => setFormData({ ...formData, dob: e.target.value })}
                                required
                            />
                        </div>
                        <div className="mb-4">
                            <Label htmlFor="avatar" className="block text-sm font-medium text-gray-700">Avatar URL</Label>
                            <Input
                                id="avatar"
                                value={formData.avatar || ""}
                                onChange={e => setFormData({ ...formData, avatar: e.target.value })}
                            />
                        </div>
                        <div className="mb-4">
                            <Label htmlFor="hire_date" className="block text-sm font-medium text-gray-700">Hire Date</Label>
                            <Input
                                id="hire_date"
                                type="date"
                                value={formData.hire_date ? new Date(formData.hire_date).toISOString().slice(0, 10) : ""}
                                onChange={e => setFormData({ ...formData, hire_date: e.target.value })}
                                required
                            />
                        </div>
                        <div className="mb-4">
                            <Label htmlFor="resignation_date" className="block text-sm font-medium text-gray-700">Resignation Date</Label>
                            <Input
                                id="resignation_date"
                                type="date"
                                value={formData.resignation_date ? new Date(formData.resignation_date).toISOString().slice(0, 10) : ""}
                                onChange={e => setFormData({ ...formData, resignation_date: e.target.value })}
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
                        <div className="mb-4">
                            <Label className="block text-sm font-medium text-gray-700">Position</Label>
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
                            <Label className="block text-sm font-medium text-gray-700">District</Label>
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
                        <div className="mb-4">
                            <Label className="block text-sm font-medium text-gray-700">Cost Center</Label>
                            <Select
                                value={formData.costcenter?.id?.toString() || ""}
                                onValueChange={val => {
                                    const selected = formData.costcenter?.id === Number(val) ? undefined : formData.costcenter;
                                    setFormData({ ...formData, costcenter: selected });
                                }}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select a cost center" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        <SelectLabel>Cost Centers</SelectLabel>
                                        {departments.map(costcenter => (
                                            <SelectItem key={costcenter.id} value={costcenter.id.toString()}>
                                                {costcenter.name}
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
