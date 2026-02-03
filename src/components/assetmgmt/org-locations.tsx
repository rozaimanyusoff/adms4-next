"use client";

import React, { useEffect, useState } from "react";
import { CustomDataGrid, type ColumnDef } from "@components/ui/DataGrid";
import { authenticatedApi } from "../../config/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus, Loader2 } from "lucide-react";
import ActionSidebar from "@components/ui/action-aside";
import { toast } from "sonner";
import { SingleSelect, type ComboboxOption } from "@/components/ui/combobox";

interface LocationRow {
    id: string;
    code: string;
    name: string;
    address: string;
    contact: string;
    pic: string;
    workDept: string;
    zone: string;
    status: string;
}

const toDisplayString = (value: unknown): string => {
    if (value === null || value === undefined) return "";
    if (typeof value === "boolean") return value ? "Active" : "Inactive";
    if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
    return String(value);
};

const toStatusString = (value: unknown): string => {
    if (typeof value === "boolean") return value ? "Active" : "Inactive";
    if (typeof value === "number") return value === 1 ? "Active" : value === 0 ? "Inactive" : String(value);
    if (typeof value === "string") {
        const lowered = value.toLowerCase();
        if (["1", "active", "true"].includes(lowered)) return "Active";
        if (["0", "inactive", "false"].includes(lowered)) return "Inactive";
    }
    return toDisplayString(value);
};

const normalizeLocation = (raw: Record<string, unknown>): LocationRow => {
    const id =
        raw.id ??
        raw.loc_id ??
        raw.location_id ??
        raw.locationId ??
        raw.locationid ??
        "";

    return {
        id: toDisplayString(id),
        code: toDisplayString(
            raw.code ??
            raw.location_code ??
            raw.loc_code ??
            raw.code_name ??
            raw.codeid,
        ),
        name: toDisplayString(
            raw.name ??
            raw.location_name ??
            raw.loc_name ??
            raw.label ??
            raw.description,
        ),
        address: toDisplayString(
            raw.loc_add ??
            raw.address ??
            raw.location_address ??
            raw.description ??
            raw.details,
        ),
        contact: toDisplayString(raw.loc_ctc ?? raw.contact ?? raw.phone ?? raw.tel),
        pic: toDisplayString(
            raw.loc_pic ??
            raw.pic ??
            raw.person_in_charge ??
            raw.manager,
        ),
        workDept: toDisplayString(
            raw.wk_dept ??
            (raw as any)?.department?.name ??
            raw.department ??
            raw.dept
        ),
        zone: toDisplayString(raw.zone ?? raw.area ?? raw.region),
        status: toStatusString(
            raw.loc_stat ?? raw.status ?? raw.active ?? raw.is_active,
        ),
    };
};

const OrgLocations: React.FC = () => {
    const [data, setData] = useState<LocationRow[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [departments, setDepartments] = useState<ComboboxOption[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const emptyForm = {
        code: "",
        name: "",
        ramco_name: "",
        loc_add: "",
        loc_ctc: "",
        loc_pic: "",
        wk_dept_id: "",
        loc_stat: true,
    };
    const [form, setForm] = useState<typeof emptyForm>(emptyForm);

    const fetchLocations = async () => {
        setLoading(true);
        try {
            const [locRes, deptRes] = await Promise.all([
                authenticatedApi.get<any>("/api/assets/locations"),
                authenticatedApi.get<any>("/api/assets/departments"),
            ]);

            const deptPayload = Array.isArray(deptRes.data?.data)
                ? deptRes.data.data
                : Array.isArray(deptRes.data)
                    ? deptRes.data
                    : [];

            const deptOptions: ComboboxOption[] = deptPayload
                .filter((d: any) => d && d.id != null)
                .map((d: any) => ({
                    value: String(d.id),
                    label: [d.name, d.code].filter(Boolean).join(" - ") || `Dept ${d.id}`,
                }));
            setDepartments(deptOptions);

            const res = locRes;
            const payload = Array.isArray(res.data)
                ? res.data
                : Array.isArray(res.data?.data)
                    ? res.data.data
                    : Array.isArray(res.data?.locations)
                        ? res.data.locations
                        : [];

            interface RawLocation {
                [key: string]: unknown;
            }

            const normalized: LocationRow[] = (payload as RawLocation[])
                .map((entry: RawLocation) => normalizeLocation(entry))
                .filter((row: LocationRow) => Boolean(row.id || row.name || row.code));

            setData(normalized);
        } catch (error) {
            setData([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const requiredMissing = !form.code || !form.name;
        if (requiredMissing) {
            toast.error("Please fill in Code and Name");
            return;
        }

        const selectedDept = departments.find(d => d.value === form.wk_dept_id);
        const payload = {
            code: form.code || null,
            name: form.name || null,
            ramco_name: form.ramco_name || null,
            loc_add: form.loc_add || null,
            loc_ctc: form.loc_ctc || null,
            loc_pic: form.loc_pic || null,
            department_id: selectedDept ? Number(selectedDept.value) : null,
            loc_stat: form.loc_stat ? 1 : 0,
        };

        try {
            setSubmitting(true);
            if (editingId) {
                await authenticatedApi.put(`/api/assets/locations/${editingId}`, payload);
                toast.success("Location updated");
            } else {
                await authenticatedApi.post("/api/assets/locations", payload);
                toast.success("Location created");
            }
            setSidebarOpen(false);
            setForm(emptyForm);
            setEditingId(null);
            fetchLocations();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "Failed to save location");
        } finally {
            setSubmitting(false);
        }
    };

    useEffect(() => {
        fetchLocations();
    }, []);

    const columns: ColumnDef<LocationRow>[] = [
        { key: "id", header: "ID" },
        { key: "code", header: "Code", filter: "input" },
        { key: "name", header: "Name", filter: "input" },
        { key: "address", header: "Address" },
        { key: "contact", header: "Contact", filter: "input" },
        { key: "pic", header: "PIC", filter: "input" },
        { key: "workDept", header: "Work Dept", filter: "singleSelect" },
        { key: "status", header: "Status", filter: "singleSelect" },
    ];

    const openEdit = async (row: LocationRow) => {
        if (!row.id) return;
        setDetailLoading(true);
        setSidebarOpen(true);
        setEditingId(String(row.id));
        try {
            const res = await authenticatedApi.get<any>(`/api/assets/locations/${row.id}`);
            const loc = res.data?.data || res.data || {};
            const deptId = loc.department_id ?? loc.dept_id ?? loc.departmentId ?? null;
            const deptFromObj = (loc as any)?.department?.id ?? null;
            let wkDeptId = deptId ? String(deptId) : "";
            if (!wkDeptId && loc.wk_dept) {
                const matched = departments.find(d => d.label === loc.wk_dept);
                if (matched) wkDeptId = matched.value;
            }
            if (!wkDeptId && deptFromObj) wkDeptId = String(deptFromObj);
            setForm({
                code: loc.code || "",
                name: loc.name || "",
                ramco_name: loc.ramco_name || "",
                loc_add: loc.loc_add || loc.address || "",
                loc_ctc: loc.loc_ctc || loc.contact || "",
                loc_pic: loc.loc_pic || loc.pic || "",
                wk_dept_id: wkDeptId,
                loc_stat: (loc.loc_stat ?? loc.status ?? 1) === 1,
            });
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "Failed to load location details");
        } finally {
            setDetailLoading(false);
        }
    };

    return (
        <>
            <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-bold">Locations</h2>
                <Button size="sm" onClick={() => setSidebarOpen(true)}>
                    <Plus className="h-4 w-4" />
                </Button>
            </div>
            {loading ? <p>Loading...</p> :
                <CustomDataGrid
                    theme={'md'}
                    columns={columns}
                    data={data}
                    pagination={false}
                    pageSize={10}
                    inputFilter={false}
                    onRowDoubleClick={(row: LocationRow) => openEdit(row)}
                />}
            <ActionSidebar
                size={'sm'}
                title={editingId ? "Edit Location" : "Create Location"}
                onClose={() => { setSidebarOpen(false); setForm(emptyForm); setEditingId(null); }}
                isOpen={sidebarOpen}
                content={
                    <form className="space-y-4" onSubmit={handleSubmit}>
                        {detailLoading && (
                            <p className="text-sm text-muted-foreground">Loading details...</p>
                        )}

                        <div>
                            <Label className="text-sm font-medium">Code</Label>
                            <Input
                                value={form.code}
                                onChange={(e) => setForm(f => ({ ...f, code: e.target.value }))}
                                required
                                placeholder="HQ"
                                className="uppercase"
                            />
                        </div>
                        <div>
                            <Label className="text-sm font-medium">Name</Label>
                            <Input
                                value={form.name}
                                onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                                required
                                placeholder="RTSB HQ"
                                className="capitalize"
                            />
                        </div>

                        <div>
                            <Label className="text-sm font-medium">RAMCO Name</Label>
                            <Input
                                value={form.ramco_name}
                                onChange={(e) => setForm(f => ({ ...f, ramco_name: e.target.value }))}
                                placeholder="Optional"
                                className="capitalize"
                            />
                        </div>
                        <div>
                            <Label className="text-sm font-medium">Address</Label>
                            <Textarea
                                value={form.loc_add}
                                onChange={(e) => setForm(f => ({ ...f, loc_add: e.target.value }))}
                                rows={3}
                                placeholder="Level 4, Matang Building..."
                            />
                        </div>

                        <div>
                            <Label className="text-sm font-medium">Contact</Label>
                            <Input
                                value={form.loc_ctc}
                                onChange={(e) => setForm(f => ({ ...f, loc_ctc: e.target.value }))}
                                placeholder="072762020"
                            />
                        </div>
                        <div>
                            <Label className="text-sm font-medium">Person In Charge</Label>
                            <Input
                                value={form.loc_pic}
                                onChange={(e) => setForm(f => ({ ...f, loc_pic: e.target.value }))}
                                placeholder="Corporate & Operation"
                            />
                        </div>
                            <div>
                                <Label className="text-sm font-medium">Work Department</Label>
                                <SingleSelect
                                    options={departments}
                                    value={form.wk_dept_id}
                                    onValueChange={(val) => setForm(f => ({ ...f, wk_dept_id: val }))}
                                    placeholder="Select department"
                                    emptyMessage="No departments found"
                                    searchPlaceholder="Search departments..."
                                    clearable
                                />
                            </div>

                        <div className="flex items-center justify-between rounded-md border px-3 py-2">
                            <div>
                                <p className="text-sm font-medium">Status</p>
                                <p className="text-xs text-muted-foreground">Toggle to mark location active/inactive</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Switch
                                    checked={form.loc_stat}
                                    onCheckedChange={(checked) => setForm(f => ({ ...f, loc_stat: checked }))}
                                    id="loc-status"
                                />
                                <Label htmlFor="loc-status" className="text-sm">{form.loc_stat ? "Active" : "Inactive"}</Label>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" type="button" onClick={() => { setSidebarOpen(false); setForm(emptyForm); }}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={submitting}>
                                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                {editingId ? "Update" : "Save"}
                            </Button>
                        </div>
                    </form>
                }
            />
        </>
    );
};

export default OrgLocations;
