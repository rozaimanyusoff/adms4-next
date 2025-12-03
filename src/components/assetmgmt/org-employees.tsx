"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ExcelJS from 'exceljs';
import { CustomDataGrid, ColumnDef } from "@components/ui/DataGrid";
import { authenticatedApi } from "../../config/api";
import { Plus, FileSpreadsheet } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { SingleSelect, type ComboboxOption } from "@/components/ui/combobox";
import ActionSidebar from "@components/ui/action-aside";

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
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [positions, setPositions] = useState<Position[]>([]);
    const [locations, setLocations] = useState<Location[]>([]);
    const [costcenters, setCostcenters] = useState<CostCenter[]>([]);
    const [hideResigned, setHideResigned] = useState(true);
    const [selectedEmployees, setSelectedEmployees] = useState<Employee[]>([]);
    const [bulkResignationDate, setBulkResignationDate] = useState("");
    const [isBulkUpdating, setIsBulkUpdating] = useState(false);
    const emptyForm: Partial<Employee> = {
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
    };
    const [formData, setFormData] = useState<Partial<Employee>>({ ...emptyForm });

    const dataGridRef = useRef<{ deselectRow: (key: string | number) => void; clearSelectedRows: () => void } | null>(null);

    const departmentOptions = useMemo<ComboboxOption[]>(() =>
        departments
            .filter(dep => dep && dep.id != null)
            .map(dep => ({
                value: String(dep.id),
                label: [dep.name, dep.code].filter(Boolean).join(" - ") || `Department ${dep.id}`,
            })),
        [departments]
    );

    const positionOptions = useMemo<ComboboxOption[]>(() =>
        positions
            .filter(pos => pos && pos.id != null)
            .map(pos => ({
                value: String(pos.id),
                label: pos.name || `Position ${pos.id}`,
            })),
        [positions]
    );

    const locationOptions = useMemo<ComboboxOption[]>(() =>
        locations
            .filter(loc => loc && loc.id != null)
            .map(loc => ({
                value: String(loc.id),
                label: [loc.name, loc.code].filter(Boolean).join(" - ") || `Location ${loc.id}`,
            })),
        [locations]
    );

    const costCenterOptions = useMemo<ComboboxOption[]>(() =>
        costcenters
            .filter(cc => cc && cc.id != null)
            .map(cc => ({
                value: String(cc.id),
                label: cc.name || `Cost Center ${cc.id}`,
            })),
        [costcenters]
    );

    const employmentStatusOptions = useMemo<ComboboxOption[]>(() => [
        { value: "active", label: "Active" },
        { value: "resigned", label: "Resigned" },
    ], []);

    const employmentTypeOptions = useMemo<ComboboxOption[]>(() => [
        { value: "Permanent", label: "Permanent" },
        { value: "Contract", label: "Contract" },
    ], []);

    const genderOptions = useMemo<ComboboxOption[]>(() => [
        { value: "M", label: "M: Male" },
        { value: "F", label: "F: Female" },
    ], []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [empRes, deptRes, posRes, distRes, costRes] = await Promise.all([
                authenticatedApi.get<any>("/api/assets/employees"),
                authenticatedApi.get<any>("/api/assets/departments"),
                authenticatedApi.get<any>("/api/assets/positions"),
                authenticatedApi.get<any>("/api/assets/locations"),
                authenticatedApi.get<any>("/api/assets/costcenters"),
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
            setCostcenters(Array.isArray(costRes.data) ? costRes.data : (costRes.data && costRes.data.data ? costRes.data.data : []));
        } catch (error) {
            setAllEmployees([]);
            setData([]);
            setDepartments([]);
            setPositions([]);
            setLocations([]);
            setCostcenters([]);
            setSelectedEmployees([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const handleSubmit = async () => {
        try {
            const normalizeDate = (v?: string | null) => (v ? String(v).slice(0, 10) : null);
            const genderValue = (formData.gender || "").charAt(0).toUpperCase();
            const payload = {
                ramco_id: formData.ramco_id ?? null,
                full_name: formData.full_name ?? null,
                email: formData.email ?? null,
                contact: formData.contact ?? null,
                gender: genderValue || null,
                dob: normalizeDate(formData.dob) as string | null,
                avatar: formData.avatar ? formData.avatar : null,
                hire_date: normalizeDate(formData.hire_date) as string | null,
                resignation_date: normalizeDate(formData.resignation_date) as string | null,
                department_id: formData.department?.id ?? null,
                position_id: formData.position?.id ?? null,
                location_id: formData.location?.id ?? null,
                costcenter_id: formData.costcenter?.id ?? null,
                employment_status: formData.employment_status || null,
                employment_type: formData.employment_type || null,
            } as any;

            if (formData.id) {
                await authenticatedApi.put(`/api/assets/employees/${formData.id}`, payload);
            } else {
                await authenticatedApi.post("/api/assets/employees", payload);
            }
            fetchData();
            setIsSidebarOpen(false);
            setFormData({ ...emptyForm });
        } catch (error) { }
    };

    const openSidebarWithData = (employee?: Employee) => {
        setFormData(employee ? { ...emptyForm, ...employee } : { ...emptyForm });
        setIsSidebarOpen(true);
    };

    const closeSidebar = () => {
        setIsSidebarOpen(false);
        setFormData({ ...emptyForm });
    };

    // Add date formatting helper
    const formatDateDMY = (dateStr?: string) => {
        if (!dateStr) return "";
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return "";
        return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
    };
    // Add service length helper (years only)
    const getServiceLength = (hireDate?: string) => {
        if (!hireDate) return "-";
        const start = new Date(hireDate);
        const now = new Date();
        if (isNaN(start.getTime())) return "-";
        let years = now.getFullYear() - start.getFullYear();
        const monthDiff = now.getMonth() - start.getMonth();
        const dayDiff = now.getDate() - start.getDate();
        if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
            years--;
        }
        if (years < 0) years = 0;
        return `${years}y`;
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

    // Export Employees (full API dataset) to Excel
    const exportEmployeesExcel = async () => {
        try {
            const workbook = new ExcelJS.Workbook();
            const ws = workbook.addWorksheet('Employees');

            const headers = [
                'ID', 'RAMCO ID', 'Full Name', 'Email', 'Contact', 'Gender',
                'DOB', 'Hire Date', 'Resignation Date',
                'Employment Type', 'Employment Status', 'Grade',
                'Department Code', 'Department Name',
                'Position', 'Cost Center', 'Location Code', 'Location Name'
            ];
            const headerRow = ws.addRow(headers);
            headerRow.eachCell(cell => {
                cell.font = { bold: true };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEEEEE' } } as any;
                cell.border = {
                    top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' }
                };
            });

            const fmt = (d?: string | null) => {
                if (!d) return '';
                const dt = new Date(d);
                if (isNaN(dt.getTime())) return '';
                const y = dt.getFullYear();
                const m = String(dt.getMonth() + 1).padStart(2, '0');
                const day = String(dt.getDate()).padStart(2, '0');
                return `${y}-${m}-${day}`;
            };

            const rows = (allEmployees || []).map(emp => [
                emp.id ?? '',
                emp.ramco_id ?? '',
                emp.full_name ?? '',
                emp.email ?? '',
                emp.contact ?? '',
                emp.gender ?? '',
                fmt(emp.dob),
                fmt(emp.hire_date),
                fmt(emp.resignation_date as any),
                emp.employment_type ?? '',
                emp.employment_status ?? '',
                emp.grade ?? '',
                emp.department?.code ?? '',
                emp.department?.name ?? '',
                emp.position?.name ?? '',
                emp.costcenter?.name ?? '',
                emp.location?.code ?? '',
                emp.location?.name ?? ''
            ]);

            rows.forEach(r => {
                const row = ws.addRow(r);
                row.eachCell(cell => {
                    cell.border = {
                        top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' }
                    };
                });
            });

            // Simple auto fit widths
            ws.columns?.forEach((col, idx) => {
                let max = headers[idx].length;
                rows.forEach(r => {
                    const val = r[idx] != null ? String(r[idx]) : '';
                    max = Math.max(max, val.length);
                });
                col.width = Math.min(Math.max(12, max + 2), 40);
            });

            const buf = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            const ts = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15);
            a.href = url;
            a.download = `employees_${ts}.xlsx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Export employees error', err);
            toast.error('Failed to export employees');
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
                    <Button variant="outline" onClick={exportEmployeesExcel} className=" hover:bg-blue-50 gap-2">
                        <FileSpreadsheet size={22} className="text-green-500" />
                        Export
                    </Button>
                    <Button onClick={() => openSidebarWithData()} className="bg-blue-600 hover:bg-blue-700">
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
                    onRowDoubleClick={(row: Employee) => openSidebarWithData(row)}
                    rowSelection={{
                        enabled: true,
                        getRowId: (row: Employee) => row.id,
                        onSelect: (keys, rows) => updateSelectedEmployees(keys, rows as Employee[]),
                    }}
                    onRowSelected={(keys, rows) => updateSelectedEmployees(keys, rows as Employee[])}
                />
            )}
            <ActionSidebar
                isOpen={isSidebarOpen}
                onClose={closeSidebar}
                title={formData.id ? "Update Employee" : "Create Employee"}
                size="md"
                content={
                    <form
                        onSubmit={e => { e.preventDefault(); handleSubmit(); }}
                        className="grid grid-cols-1 gap-4 md:grid-cols-2"
                    >
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="ramco_id" className="block text-sm font-medium text-white-dark">Ramco ID</Label>
                            <Input
                                id="ramco_id"
                                value={formData.ramco_id || ""}
                                onChange={e => setFormData({ ...formData, ramco_id: e.target.value })}
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="full_name" className="block text-sm font-medium text-white-dark">Full Name</Label>
                            <Input
                                id="full_name"
                                value={formData.full_name || ""}
                                onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="email" className="block text-sm font-medium text-white-dark">Email</Label>
                            <Input
                                id="email"
                                value={formData.email || ""}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="contact" className="block text-sm font-medium text-white-dark">Contact</Label>
                            <Input
                                id="contact"
                                value={formData.contact || ""}
                                onChange={e => setFormData({ ...formData, contact: e.target.value })}
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="gender" className="block text-sm font-medium text-white-dark">Gender</Label>
                            <SingleSelect
                                options={genderOptions}
                                value={(formData.gender || "").charAt(0).toUpperCase()}
                                onValueChange={val => setFormData({ ...formData, gender: val })}
                                placeholder="Select gender"
                                clearable
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="dob" className="block text-sm font-medium text-white-dark">Date of Birth</Label>
                            <Input
                                id="dob"
                                type="date"
                                value={formData.dob ? new Date(formData.dob).toISOString().slice(0, 10) : ""}
                                onChange={e => setFormData({ ...formData, dob: e.target.value })}
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="avatar" className="block text-sm font-medium text-white-dark">Avatar URL</Label>
                            <Input
                                id="avatar"
                                value={formData.avatar || ""}
                                onChange={e => setFormData({ ...formData, avatar: e.target.value })}
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="hire_date" className="block text-sm font-medium text-white-dark">Hire Date</Label>
                            <Input
                                id="hire_date"
                                type="date"
                                value={formData.hire_date ? new Date(formData.hire_date).toISOString().slice(0, 10) : ""}
                                onChange={e => setFormData({ ...formData, hire_date: e.target.value })}
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="resignation_date" className="block text-sm font-medium text-white-dark">Resignation Date</Label>
                            <Input
                                id="resignation_date"
                                type="date"
                                value={formData.resignation_date ? new Date(formData.resignation_date).toISOString().slice(0, 10) : ""}
                                onChange={e => setFormData({ ...formData, resignation_date: e.target.value })}
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label className="block text-sm font-medium text-white-dark">Department</Label>
                            <SingleSelect
                                options={departmentOptions}
                                value={formData.department?.id != null ? String(formData.department.id) : ""}
                                onValueChange={val => {
                                    const selected = departments.find(d => String(d.id) === val);
                                    setFormData({ ...formData, department: selected });
                                }}
                                placeholder="Select a department"
                                searchPlaceholder="Search departments..."
                                clearable
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label className="block text-sm font-medium text-white-dark">Position</Label>
                            <SingleSelect
                                options={positionOptions}
                                value={formData.position?.id != null ? String(formData.position.id) : ""}
                                onValueChange={val => {
                                    const selected = positions.find(p => String(p.id) === val);
                                    setFormData({ ...formData, position: selected });
                                }}
                                placeholder="Select a position"
                                searchPlaceholder="Search positions..."
                                clearable
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label className="block text-sm font-medium text-white-dark">Location</Label>
                            <SingleSelect
                                options={locationOptions}
                                value={formData.location?.id != null ? String(formData.location.id) : ""}
                                onValueChange={val => {
                                    const selected = locations.find(l => String(l.id) === val);
                                    setFormData({ ...formData, location: selected });
                                }}
                                placeholder="Select a location"
                                searchPlaceholder="Search locations..."
                                clearable
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label className="block text-sm font-medium text-white-dark">Cost Center</Label>
                            <SingleSelect
                                options={costCenterOptions}
                                value={formData.costcenter?.id != null ? String(formData.costcenter.id) : ""}
                                onValueChange={val => {
                                    const selected = costcenters.find(c => String(c.id) === val);
                                    setFormData({ ...formData, costcenter: selected });
                                }}
                                placeholder="Select a cost center"
                                searchPlaceholder="Search cost centers..."
                                clearable
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label className="block text-sm font-medium text-white-dark">Status</Label>
                            <SingleSelect
                                options={employmentStatusOptions}
                                value={formData.employment_status ? formData.employment_status.toLowerCase() : ""}
                                onValueChange={val => {
                                    setFormData({ ...formData, employment_status: val });
                                }}
                                placeholder="Select employment status"
                                clearable
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label className="block text-sm font-medium text-white-dark">Employment Type</Label>
                            <SingleSelect
                                options={employmentTypeOptions}
                                value={formData.employment_type || ""}
                                onValueChange={val => setFormData({ ...formData, employment_type: val })}
                                placeholder="Select employment type"
                                clearable
                            />
                        </div>
                        <div className="md:col-span-2 flex justify-end pt-2 gap-2">
                            <Button variant="outline" type="button" onClick={closeSidebar}>Cancel</Button>
                            <Button type="submit" className="min-w-[120px]">Submit</Button>
                        </div>
                    </form>
                }
            />
        </div>
    );
};

export default OrgEmp;
