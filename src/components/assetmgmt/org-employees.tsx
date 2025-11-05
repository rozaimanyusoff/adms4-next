"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CustomDataGrid, ColumnDef } from "@components/ui/DataGrid";
import { authenticatedApi } from "../../config/api";
import { Plus, Pencil } from "lucide-react";
import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
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
interface Location { id: number; name: string; code?: string; }
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
    location?: Location;
    positionName?: string;
    nameSearch?: string;
}

const OrgEmp: React.FC = () => {
    const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
    const [data, setData] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [positions, setPositions] = useState<Position[]>([]);
    const [locations, setLocations] = useState<Location[]>([]);
    const [hideResigned, setHideResigned] = useState(true);
    const [selectedEmployees, setSelectedEmployees] = useState<Employee[]>([]);
    const [bulkResignationDate, setBulkResignationDate] = useState("");
    const [isBulkUpdating, setIsBulkUpdating] = useState(false);
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
                location: undefined,
                costcenter: undefined,
    });

    const dataGridRef = useRef<{ deselectRow: (key: string | number) => void; clearSelectedRows: () => void } | null>(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [empRes, deptRes, posRes, distRes] = await Promise.all([
                authenticatedApi.get<any>("/api/assets/employees"),
                authenticatedApi.get<any>("/api/assets/departments"),
                authenticatedApi.get<any>("/api/assets/positions"),
                authenticatedApi.get<any>("/api/assets/locations"),
            ]);
            const employees = Array.isArray(empRes.data?.data) ? empRes.data.data : Array.isArray(empRes.data) ? empRes.data : [];
            const normalizedEmployees = employees.map((emp: Employee) => ({
                ...emp,
                positionName: emp.position?.name || "",
                nameSearch: [emp.full_name, emp.email, emp.contact].filter(Boolean).join(" "),
            }));
            setAllEmployees(normalizedEmployees);
            setDepartments(Array.isArray(deptRes.data) ? deptRes.data : (deptRes.data && deptRes.data.data ? deptRes.data.data : []));
            setPositions(Array.isArray(posRes.data) ? posRes.data : (posRes.data && posRes.data.data ? posRes.data.data : []));
            setLocations(Array.isArray(distRes.data) ? distRes.data : (distRes.data && distRes.data.data ? distRes.data.data : []));
        } catch (error) {
            setAllEmployees([]);
            setData([]);
            setDepartments([]);
            setPositions([]);
            setLocations([]);
            setSelectedEmployees([]);
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
                    locationId: formData.location?.id,
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
                location: undefined,
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

    const isEmployeeResigned = (employee: Employee) => {
        const status = employee.employment_status ? employee.employment_status.trim().toLowerCase() : "";
        if (status && status !== "active") return true;
        return isValidResignationDate(employee.resignation_date, employee.employment_status);
    };

    const filterEmployees = useCallback((list: Employee[]) => {
        return hideResigned ? list.filter(emp => !isEmployeeResigned(emp)) : list;
    }, [hideResigned]);

    useEffect(() => {
        setData(filterEmployees(allEmployees));
    }, [allEmployees, filterEmployees]);

    const employeeById = useMemo(() => {
        const map = new Map<string, Employee>();
        data.forEach(emp => {
            map.set(String(emp.id), emp);
        });
        return map;
    }, [data]);

    const updateSelectedEmployees = useCallback((keys: (string | number)[], rows?: Employee[]) => {
        if (Array.isArray(rows) && rows.length) {
            setSelectedEmployees(rows);
            return;
        }
        const next = (keys ?? [])
            .map(key => employeeById.get(String(key)))
            .filter((emp): emp is Employee => Boolean(emp));
        setSelectedEmployees(next);
    }, [employeeById]);

    const selectedCount = selectedEmployees.length;
    const hasSelection = selectedCount > 0;
    const canBulkUpdate = hasSelection && Boolean(bulkResignationDate) && !isBulkUpdating;

    const handleDateChange = (value: string) => {
        if (!value) {
            setBulkResignationDate("");
            return;
        }
        const parts = value.split("-");
        if (parts.length === 3) {
            const [yyyy, mm, dd] = parts;
            if (yyyy && mm && dd) {
                setBulkResignationDate(`${yyyy}-${mm}-${dd}`);
                return;
            }
        }
        setBulkResignationDate(value);
    };

    const handleBulkResignationUpdate = async () => {
        if (!hasSelection) {
            toast.error("Select at least one employee to update.");
            return;
        }
        if (!bulkResignationDate) {
            toast.error("Choose a resignation date.");
            return;
        }
        const ramcoIds = selectedEmployees.map(emp => emp.ramco_id).filter(Boolean);
        if (ramcoIds.length === 0) {
            toast.error("Selected employees are missing Ramco IDs.");
            return;
        }
        setIsBulkUpdating(true);
        try {
            await authenticatedApi.put("/api/assets/employees/update-resign", {
                ramco_id: ramcoIds,
                resignation_date: bulkResignationDate,
                employment_status: "resigned",
            });
            await fetchData();
            setSelectedEmployees([]);
            dataGridRef.current?.clearSelectedRows?.();
            toast.success("Resignation date updated.");
        } catch (error) {
            console.error("Failed to update resignation dates", error);
            toast.error("Failed to update resignation dates.");
        } finally {
            setIsBulkUpdating(false);
        }
    };

    const positionFilterOptions = useMemo(() => {
        const fromPositions = positions.map(pos => pos.name).filter(Boolean);
        const fromEmployees = allEmployees.map(emp => emp.position?.name || emp.positionName || "").filter(Boolean);
        return Array.from(new Set([...fromPositions, ...fromEmployees]));
    }, [positions, allEmployees]);

    const columns: ColumnDef<Employee>[] = useMemo(() => [
        { key: "id", header: "ID" },
        { key: "ramco_id", header: "Ramco ID", filter: 'input' },
        {
            key: "nameSearch" as keyof Employee,
            header: "Full Name",
            filter: 'input',
            render: (row: Employee) => (
                <div className="flex flex-col gap-0.5">
                    <span className="font-medium text-foreground">{row.full_name || "-"}</span>
                    {row.email ? <span className="text-xs text-muted-foreground break-all">{row.email}</span> : null}
                    {row.contact ? <span className="text-xs text-muted-foreground">{row.contact}</span> : null}
                </div>
            ),
        },
        { key: "gender", header: "Gender", filter: 'singleSelect' },
        /* { key: "dob", header: "DOB", render: (row: Employee) => formatDateDMY(row.dob) }, */
        { key: "hire_date", header: "Hire Date", render: (row: Employee) => formatDateDMY(row.hire_date) },
        { key: "service_length" as any, header: "Service Length", render: (row: Employee) => getServiceLength(row.hire_date) },
        { key: "department", header: "Department", render: (row: Employee) => row.department?.code || "-", filter: 'singleSelect' },
        { key: "costcenter", header: "Cost Center", render: (row: Employee) => row.costcenter?.name || "-", filter: 'singleSelect' },
        {
            key: "positionName" as keyof Employee,
            header: "Position",
            render: (row: Employee) => row.position?.name || "-",
            filter: 'multiSelect',
            filterParams: { options: positionFilterOptions },
        },
        { key: "location", header: "Location", render: (row: Employee) => row.location?.name || "-", filter: 'singleSelect' },
        { key: "employment_type", header: "Type", filter: 'singleSelect' },
        { key: "employment_status", header: "Status", filter: 'singleSelect' },
        /* { key: "grade", header: "Grade" }, */
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
    ], [positionFilterOptions]);

    const hideResignedSwitchId = "hide-resigned-switch";
    return (
        <div className="mt-4">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <h2 className="text-xl font-bold">Employees</h2>
                <div className="flex items-center gap-4 flex-wrap justify-end">
                    <div className="flex items-center gap-2">
                        <Label htmlFor={hideResignedSwitchId} className="text-sm font-medium text-muted-foreground">
                            Hide resigned employees
                        </Label>
                        <Switch
                            id={hideResignedSwitchId}
                            checked={hideResigned}
                            onCheckedChange={setHideResigned}
                        />
                    </div>
                    <Button onClick={() => setIsModalOpen(true)} className="bg-blue-600 hover:bg-blue-700">
                        <Plus size={22} />
                    </Button>
                </div>
            </div>
            <div className="mb-4 flex flex-wrap items-center gap-3">
                {hasSelection ? (
                    <span className="text-sm text-muted-foreground">{selectedCount} selected</span>
                ) : (
                    <span className="text-sm text-muted-foreground">Select employees to update resignation date.</span>
                )}
                <Input
                    type="date"
                    value={bulkResignationDate}
                    onChange={e => handleDateChange(e.target.value)}
                    className="w-48"
                    disabled={isBulkUpdating}
                />
                <Button
                    onClick={handleBulkResignationUpdate}
                    disabled={!canBulkUpdate}
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                    {isBulkUpdating ? "Updating..." : "Update Resignation Date"}
                </Button>
            </div>
            {loading ? <p>Loading...</p> : (
                <CustomDataGrid
                    ref={dataGridRef}
                    columns={columns}
                    data={data}
                    inputFilter={false}
                    pagination={false}
                    rowSelection={{
                        enabled: true,
                        getRowId: (row: Employee) => row.id,
                        onSelect: (keys, rows) => updateSelectedEmployees(keys, rows as Employee[]),
                    }}
                    onRowSelected={(keys, rows) => updateSelectedEmployees(keys, rows as Employee[])}
                />
            )}
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
                            <Label className="block text-sm font-medium text-gray-700">Location</Label>
                                <Select
                                    value={formData.location?.id?.toString() || ""}
                                    onValueChange={val => {
                                        const selected = locations.find(l => l.id === Number(val));
                                        setFormData({ ...formData, location: selected });
                                    }}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select a location" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectGroup>
                                            <SelectLabel>Locations</SelectLabel>
                                            {locations.map(loc => (
                                                <SelectItem key={loc.id} value={loc.id.toString()}>
                                                    {loc.name}
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
