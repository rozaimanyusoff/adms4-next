"use client";

import React, { useContext, useEffect, useMemo, useState } from "react";
import { AuthContext } from "@/store/AuthContext";
import { authenticatedApi } from "@/config/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SingleSelect } from "@/components/ui/combobox";
import { toast } from "sonner";
import { Pencil, Save, Plus, Trash2 } from "lucide-react";

// Backend interface
export interface CriteriaOwnership {
   id?: number;
   ramco_id?: string | null; // member ID
   department_id?: number | null; // department ID
   status?: string | null;
   created_at?: string | null; // backend-handled
   updated_at?: string | null; // backend-handled
}

type OwnershipRow = CriteriaOwnership & {
   // Optional expansions if backend includes them
   employee?: { ramco_id: string; full_name: string } | null;
   department?: { id: number; code?: string; name?: string } | null;
};

const STATUS_OPTIONS = [
   { value: "Active", label: "Active" },
   { value: "Inactive", label: "Inactive" },
];

const AssessmentOwnership: React.FC = () => {
   const auth = useContext(AuthContext);
   const username =
      (auth?.authData?.user?.username) ||
      ((auth?.authData?.user as any)?.ramco_id) ||
      "";

   const [rows, setRows] = useState<OwnershipRow[]>([]);
   const [loading, setLoading] = useState(false);
   const [editingId, setEditingId] = useState<number | null>(null);
   const [adding, setAdding] = useState(false);
   const [editRow, setEditRow] = useState<Partial<OwnershipRow>>({});

   // Options
   const [employeeOptions, setEmployeeOptions] = useState<
      { value: string; label: string }[]
   >([]);
   const [departmentOptions, setDepartmentOptions] = useState<
      { value: string; label: string }[]
   >([]);

   const fetchEmployees = async () => {
      try {
         const res: any = await authenticatedApi.get(
            "/api/assets/employees?status=active"
         );
         const raw = res?.data;
         const list: any[] = Array.isArray(raw)
            ? raw
            : raw?.data?.data || raw?.data || [];
         const opts = list
            .map((e: any) => ({
               value: String(e.ramco_id ?? e.id ?? ""),
               label: e.full_name || e.name || String(e.ramco_id ?? e.id ?? ""),
            }))
            .filter((o: any) => o.value);
         setEmployeeOptions(opts);
      } catch (e) {
         setEmployeeOptions([]);
      }
   };

   const fetchDepartments = async () => {
      try {
         const resp: any = await authenticatedApi.get("/api/assets/departments");
         const raw = resp?.data;
         const arr: any[] = Array.isArray(raw)
            ? raw
            : raw?.data?.data || raw?.data || [];
         const opts = arr
            .map((d: any) => {
               const id = String(
                  d.id ?? d.dept_id ?? d.department_id ?? d.value ?? ""
               );
               const label = String(
                  d.code ?? d.dept_code ?? d.name ?? d.label ?? id
               );
               return { value: id, label };
            })
            .filter((o: any) => o.value);
         setDepartmentOptions(opts);
      } catch (e) {
         setDepartmentOptions([]);
      }
   };

   const fetchRows = async () => {
      setLoading(true);
      try {
         const res: any = await authenticatedApi.get(
            "/api/compliance/assessments/criteria/ownership"
         );
         const raw = res?.data;
         const list: any[] = Array.isArray(raw)
            ? raw
            : raw?.data?.data || raw?.data || [];
         // Normalize fields
         const mapped: OwnershipRow[] = list.map((r: any) => ({
            id: r.id,
            ramco_id: r.ramco_id ?? r.member_id ?? null,
            department_id: r.department_id ?? r.dept_id ?? null,
            status: r.status ?? r.qset_stat ?? "Active",
            created_at: r.created_at ?? null,
            updated_at: r.updated_at ?? null,
            employee: r.employee || null,
            department: r.department || null,
         }));
         setRows(mapped);
      } catch (e) {
         toast.error("Failed to fetch ownership");
         setRows([]);
      } finally {
         setLoading(false);
      }
   };

   useEffect(() => {
      fetchRows();
      fetchEmployees();
      fetchDepartments();
   }, []);

   const handleAdd = () => {
      setAdding(true);
      setEditingId(0);
      setEditRow({
         id: 0,
         ramco_id: "",
         department_id: undefined,
         status: "Active",
      });
   };

   const handleEdit = (row: OwnershipRow) => {
      setEditingId(row.id!);
      setEditRow({ ...row });
   };

   const handleCancel = () => {
      setEditingId(null);
      setEditRow({});
      setAdding(false);
   };

   const handleDelete = async (row: OwnershipRow) => {
      if (!row.id) return;
      if (!confirm("Delete this ownership entry?")) return;
      try {
         await authenticatedApi.delete(
            `/api/compliance/assessments/criteria/ownership/${row.id}`
         );
         toast.success("Deleted");
         fetchRows();
      } catch (e) {
         toast.error("Failed to delete");
      }
   };

   const validate = (payload: Partial<OwnershipRow>) => {
      const errs: Record<string, boolean> = {};
      if (!payload.ramco_id) errs.ramco_id = true;
      if (
         payload.department_id == null ||
         payload.department_id === undefined ||
         payload.department_id === ("" as any)
      )
         errs.department_id = true;
      return errs;
   };

   const handleSave = async () => {
      const payload: any = {
         ramco_id: editRow.ramco_id ? String(editRow.ramco_id) : undefined,
         department_id:
            editRow.department_id != null
               ? Number(editRow.department_id)
               : undefined,
         status: (editRow.status as string) || "Active",
      };
      const errs = validate(payload);
      if (Object.keys(errs).length) {
         toast.error("Please select member and department");
         return;
      }
      try {
         if (adding) {
            await authenticatedApi.post(
               "/api/compliance/assessments/criteria/ownership",
               payload
            );
            toast.success("Ownership created");
         } else {
            await authenticatedApi.put(
               `/api/compliance/assessments/criteria/ownership/${editRow.id}`,
               payload
            );
            toast.success("Ownership updated");
         }
         handleCancel();
         fetchRows();
      } catch (e) {
         toast.error("Failed to save");
      }
   };

   const displayEmployee = (ramco: string | null | undefined) => {
      if (!ramco) return "-";
      const opt = employeeOptions.find((o) => String(o.value) === String(ramco));
      return opt?.label || String(ramco);
   };

   const displayDepartment = (deptId: number | null | undefined) => {
      if (deptId == null) return "-";
      const opt = departmentOptions.find(
         (o) => String(o.value) === String(deptId)
      );
      return opt?.label || String(deptId);
   };

   const sortedRows = useMemo(
      () => rows.slice().sort((a, b) => (a.id || 0) - (b.id || 0)),
      [rows]
   );

   return (
      <div className="space-y-4">
         <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Assessment Ownership</h3>
            <div className="flex items-center gap-2">
               <Button onClick={handleAdd} disabled={adding || editingId !== null}>
                  <Plus className="w-4 h-4" />
               </Button>
            </div>
         </div>
         <div className="overflow-x-auto">
            <table className="min-w-full border text-sm">
               <thead className="bg-gray-100">
                  <tr>
                     <th className="border px-2 py-1">#</th>
                     <th className="border px-2 py-1">Member</th>
                     <th className="border px-2 py-1">Department</th>
                     <th className="border px-2 py-1">Status</th>
                     <th className="border px-2 py-1">Actions</th>
                  </tr>
               </thead>
               <tbody>
                  {(
                     (adding ? [editRow] : []) as OwnershipRow[]
                  )
                     .concat(
                        sortedRows.map((r) =>
                           editingId === r.id ? (editRow as OwnershipRow) : r
                        )
                     )
                     .map((row, idx) => (
                        <tr key={row.id || `new-${idx}`}>
                           <td className="border px-2 py-1 text-center">{idx + 1}</td>
                           <td className="border px-2 py-1">
                              {editingId === row.id || (adding && row.id === 0) ? (
                                 <SingleSelect
                                    options={employeeOptions}
                                    value={String(editRow.ramco_id ?? "")}
                                    onValueChange={(v) =>
                                       setEditRow({ ...editRow, ramco_id: v })
                                    }
                                    placeholder="Select member"
                                 />
                              ) : (
                                 displayEmployee(row.ramco_id)
                              )}
                           </td>
                           <td className="border px-2 py-1">
                              {editingId === row.id || (adding && row.id === 0) ? (
                                 <SingleSelect
                                    options={departmentOptions}
                                    value={
                                       editRow.department_id != null
                                          ? String(editRow.department_id)
                                          : ""
                                    }
                                    onValueChange={(v) =>
                                       setEditRow({ ...editRow, department_id: Number(v) })
                                    }
                                    placeholder="Select department"
                                 />
                              ) : (
                                 displayDepartment(row.department_id as number)
                              )}
                           </td>
                           <td className="border px-2 py-1 text-center">
                              {editingId === row.id || (adding && row.id === 0) ? (
                                 <SingleSelect
                                    options={STATUS_OPTIONS}
                                    value={(editRow.status as string) || "Active"}
                                    onValueChange={(v) =>
                                       setEditRow({ ...editRow, status: v as any })
                                    }
                                    placeholder="Status"
                                 />
                              ) : (
                                 row.status || "-"
                              )}
                           </td>
                           <td className="border px-2 py-1 text-center">
                              {editingId === row.id || (adding && row.id === 0) ? (
                                 <div className="flex gap-2 justify-center">
                                    <Button
                                       size="sm"
                                       className="bg-green-600 hover:bg-green-700 text-white"
                                       onClick={handleSave}
                                       aria-label="Save"
                                    >
                                       <Save className="w-4 h-4" />
                                    </Button>
                                    <Button
                                       size="sm"
                                       className="bg-red-600 hover:bg-red-700 text-white"
                                       onClick={handleCancel}
                                    >
                                       Cancel
                                    </Button>
                                 </div>
                              ) : (
                                 <div className="flex gap-2 justify-center">
                                    <Button
                                       size="sm"
                                       variant="outline"
                                       className="bg-amber-300 hover:bg-amber-400 text-amber-900"
                                       onClick={() => handleEdit(row)}
                                    >
                                       <Pencil className="w-4 h-4" />
                                    </Button>
                                    <Button
                                       size="sm"
                                       variant="outline"
                                       className="hover:bg-red-100"
                                       onClick={() => handleDelete(row)}
                                    >
                                       <Trash2 className="w-4 h-4 text-red-600" />
                                    </Button>
                                 </div>
                              )}
                           </td>
                        </tr>
                     ))}
               </tbody>
            </table>
         </div>
      </div>
   );
};

export default AssessmentOwnership;
