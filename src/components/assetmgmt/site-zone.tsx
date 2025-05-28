import React, { useEffect, useState } from "react";
import { CustomDataGrid } from "@components/ui/DataGrid";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label"

interface Employee {
    id: number;
    name: string;
}

interface District {
    id: number;
    name: string;
    code: string;
}

interface Zone {
    id: number;
    name: string;
    code: string;
    employees: Employee;
    districts: District[];
}

interface ZoneForm {
    id?: number;
    name: string;
    code: string;
    employee_id: number;
    districts: number[];
}

const SiteZone: React.FC = () => {
    const [data, setData] = useState<Zone[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState<ZoneForm>({ name: "", code: "", employee_id: 0, districts: [] });
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [districts, setDistricts] = useState<District[]>([]);

    const fetchData = async () => {
        try {
            const [zonesRes, employeesRes, districtsRes] = await Promise.all([
                authenticatedApi.get<{ data: Zone[] }>("/api/stock/zones"),
                authenticatedApi.get<{ data: Employee[] }>("/api/stock/employees"),
                authenticatedApi.get<{ data: District[] }>("/api/stock/districts"),
            ]);
            setData(zonesRes.data.data || []);
            setEmployees(employeesRes.data.data || []);
            setDistricts(districtsRes.data.data || []);
        } catch (error) {
            setData([]);
            setEmployees([]);
            setDistricts([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const handleSubmit = async () => {
        try {
            const payload = {
                name: formData.name,
                code: formData.code,
                employee_id: formData.employee_id,
                districts: formData.districts,
            };
            if (formData.id) {
                await authenticatedApi.put(`/api/stock/zones/${formData.id}`, payload);
            } else {
                await authenticatedApi.post("/api/stock/zones", payload);
            }
            fetchData();
            setIsModalOpen(false);
            setFormData({ name: "", code: "", employee_id: 0, districts: [] });
        } catch (error) { }
    };

    const handleDistrictToggle = (id: number) => {
        setFormData((prev) => {
            const arr = prev.districts || [];
            if (arr.includes(id)) {
                return { ...prev, districts: arr.filter((d) => d !== id) };
            } else {
                return { ...prev, districts: [...arr, id] };
            }
        });
    };

    const columns = [
        { key: "id" as keyof Zone, header: "ID" },
        { key: "name" as keyof Zone, header: "Name" },
        { key: "code" as keyof Zone, header: "Code" },
        {
            key: "employees.name" as any,
            header: "Employee",
            render: (row: Zone) => row.employees ? row.employees.name : <span className="text-gray-500">N/A</span>,
        },
        {
            key: "districts" as any,
            header: "Districts",
            render: (row: Zone) => row.districts && row.districts.length > 0 ? row.districts.map(d => d.name).join(", ") : <span className="text-gray-500">N/A</span>,
        },
        {
            key: "actions" as keyof Zone,
            header: "Actions",
            render: (row: Zone) => (
                <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                        setFormData({
                            id: row.id,
                            name: row.name,
                            code: row.code,
                            employee_id: row.employees?.id || 0,
                            districts: row.districts ? row.districts.map((d) => d.id) : [],
                        });
                        setIsModalOpen(true);
                    }}
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
                <h2 className="text-xl font-bold mb-4">Zones</h2>
                <Button onClick={() => setIsModalOpen(true)} className="mb-4 bg-blue-600 hover:bg-blue-700">
                    <FontAwesomeIcon icon={faPlus} size="xl" />
                </Button>
            </div>
            {loading ? <p>Loading...</p> : <CustomDataGrid columns={columns} data={data} />}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{formData.id ? "Update Zone" : "Create Zone"}</DialogTitle>
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
                            <label htmlFor="code" className="block text-sm font-medium text-gray-700">Code</label>
                            <Input
                                id="code"
                                value={formData.code || ""}
                                onChange={e => setFormData({ ...formData, code: e.target.value })}
                                required
                            />
                        </div>
                        <div className="mb-4">
                            <label htmlFor="employee" className="block text-sm font-medium text-gray-700">Employee</label>
                            <Select
                                value={formData.employee_id ? formData.employee_id.toString() : ""}
                                onValueChange={value => setFormData({ ...formData, employee_id: Number(value) })}
                            >
                                <SelectTrigger id="employee" className="w-full">
                                    <SelectValue placeholder="Select an employee" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        <SelectLabel>Employees</SelectLabel>
                                        {employees.map(emp => (
                                            <SelectItem key={emp.id} value={emp.id.toString()}>
                                                {emp.name}
                                            </SelectItem>
                                        ))}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700">Districts</label>
                            <div className="border rounded px-2 py-2 max-h-40 overflow-y-auto">
                                {districts.map((d) => (
                                    <div key={d.id} className="flex items-center space-x-2">

                                        <Label htmlFor={`district-${d.id}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                            <Checkbox
                                                id={`district-${d.id}`}
                                                checked={Array.isArray(formData.districts) && formData.districts.includes(d.id)}
                                                onCheckedChange={() => handleDistrictToggle(d.id)}
                                            />
                                            {d.name} ({d.code})
                                        </Label>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <Button type="submit" className="mt-4">Submit</Button>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default SiteZone;
