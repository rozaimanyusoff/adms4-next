"use client";

import React, { useEffect, useState, useContext, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AuthContext } from '@/store/AuthContext';
import { authenticatedApi } from "@/config/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SingleSelect } from "@/components/ui/combobox";
import { toast } from "sonner";
import { Pencil, ChevronDown, ChevronUp, Save, Plus } from "lucide-react";


interface AssessmentCriteria {
    qset_id: number;
    q_id: number;
    qset_quesno: number;
    qset_desc: string;
    qset_stat: "Active" | "Inactive";
    qset_type: "NCR" | "Rating" | "Selection";
    qset_order: number;
    ownership: string;
    dept: number;
    qset_order_new?: number;
}

const QSET_TYPE_OPTIONS = [
    { value: "NCR", label: "NCR" },
    { value: "Rating", label: "Rating" },
    { value: "Selection", label: "Selection" },
];

const STATUS_OPTIONS = [
    { value: "Active", label: "Active" },
    { value: "Inactive", label: "Inactive" },
];

// Ownership options will be loaded dynamically from API

const AssessmentCriteriaGrid: React.FC = () => {
    const [data, setData] = useState<AssessmentCriteria[]>([]);
    const [loading, setLoading] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editRow, setEditRow] = useState<Partial<AssessmentCriteria>>({});
    const [adding, setAdding] = useState(false);
    const [ownershipOptions, setOwnershipOptions] = useState<{ value: string; label: string }[]>([]);
    const auth = useContext(AuthContext);
    const username = (auth?.authData?.user?.username) || ((auth?.authData?.user as any)?.ramco_id) || '';

    const { activeCount, inactiveCount } = useMemo(() => {
        const a = data.filter(d => d.qset_stat === 'Active').length;
        const i = data.filter(d => d.qset_stat === 'Inactive').length;
        return { activeCount: a, inactiveCount: i };
    }, [data]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const resp: any = await authenticatedApi.get('/api/compliance/assessments/criteria');
            const arr = Array.isArray(resp.data) ? resp.data : (resp.data?.data || []);
            setData(arr);
        } catch (e) {
            toast.error('Failed to fetch assessment criteria');
            setData([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchOwnershipOptions = async () => {
        try {
            const resp: any = await authenticatedApi.get('/api/assets/departments');
            const raw = resp?.data;
            const arr: any[] = Array.isArray(raw) ? raw : (raw?.data?.data || raw?.data || []);
            const opts = arr.map((d: any) => {
                const id = String(d.id ?? d.dept_id ?? d.department_id ?? d.value ?? '');
                const label = String(d.code ?? d.dept_code ?? d.name ?? d.label ?? id);
                return { value: id, label };
            }).filter((o: any) => o.value);
            setOwnershipOptions(opts);
        } catch (e) {
            setOwnershipOptions([]);
        }
    };

    useEffect(() => {
        fetchData();
        fetchOwnershipOptions();
    }, []);

    // Search state for description
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    // Status filter: 'All' | 'Active' | 'Inactive'
    const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive'>('All');

    // Debounce search input
    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
        return () => clearTimeout(t);
    }, [search]);

    // Ownership counts per status
    const { activeOwnershipCount, inactiveOwnershipCount, activeOwnersList, inactiveOwnersList } = useMemo(() => {
        const actMap = new Map<string, number>();
        const inactMap = new Map<string, number>();
        const resolveLabel = (val: string) => {
            const found = ownershipOptions.find(o => o.value === val || o.label === val);
            return found ? found.label : val;
        };
        data.forEach(d => {
            const v = String(d.ownership ?? '').trim();
            if (!v) return;
            if (d.qset_stat === 'Active') actMap.set(v, (actMap.get(v) || 0) + 1);
            if (d.qset_stat === 'Inactive') inactMap.set(v, (inactMap.get(v) || 0) + 1);
        });
        const activeOwnersList = Array.from(actMap.entries()).map(([k, c]) => ({ label: resolveLabel(k), count: c })).sort((a, b) => b.count - a.count);
        const inactiveOwnersList = Array.from(inactMap.entries()).map(([k, c]) => ({ label: resolveLabel(k), count: c })).sort((a, b) => b.count - a.count);
        return {
            activeOwnershipCount: actMap.size,
            inactiveOwnershipCount: inactMap.size,
            activeOwnersList,
            inactiveOwnersList,
        };
    }, [data, ownershipOptions]);

    // Filtered data based on status and debounced search
    const filteredData = useMemo(() => {
        let base = data;
        if (statusFilter && statusFilter !== 'All') {
            base = base.filter(d => d.qset_stat === statusFilter);
        }
        if (!debouncedSearch) return base;
        const s = debouncedSearch.toLowerCase();
        return base.filter(d => (d.qset_desc || '').toLowerCase().includes(s));
    }, [data, debouncedSearch, statusFilter]);

    const handleEdit = (row: AssessmentCriteria) => {
        setEditingId(row.qset_id);
        setEditRow({ ...row });
    };

    const handleCancel = () => {
        setEditingId(null);
        setEditRow({});
        setAdding(false);
    };

    // Helper to format JS date to MySQL DATETIME
    const formatMySQLDatetime = (date: Date) => {
        const pad = (n: number) => n < 10 ? '0' + n : n;
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
    };

    const handleSave = async () => {
        if (!editRow.qset_desc || !editRow.qset_type || !editRow.ownership) {
            toast.error('Description, type and ownership are required');
            return;
        }
        try {
            const now = new Date();
            if (adding) {
                // Create
                const payload = {
                    ...editRow,
                    created_by: username,
                    created_at: formatMySQLDatetime(now),
                    updated_at: formatMySQLDatetime(now),
                };
                await authenticatedApi.post('/api/compliance/assessments/criteria', payload);
                toast.success('Assessment criteria created');
            } else {
                // Update
                const payload = {
                    ...editRow,
                    updated_by: username,
                    updated_at: formatMySQLDatetime(now),
                };
                // Remove created_at if present in payload
                if ('created_at' in payload) {
                    delete payload.created_at;
                }
                await authenticatedApi.put(`/api/compliance/assessments/criteria/${editRow.qset_id}`, payload);
                toast.success('Assessment criteria updated');
            }
            handleCancel();
            fetchData();
        } catch (e) {
            toast.error('Failed to save');
        }
    };

    const handleAdd = () => {
        setAdding(true);
        setEditingId(0);
        setEditRow({
            qset_id: 0,
            q_id: 0,
            qset_quesno: data.length ? Math.max(...data.map(d => d.qset_quesno)) + 1 : 1,
            qset_desc: '',
            qset_stat: 'Active',
            qset_type: 'NCR',
            qset_order: data.length ? Math.max(...data.map(d => d.qset_order)) + 1 : 1,
            ownership: ownershipOptions[0]?.value || '',
            dept: 1,
        });
    };

    const handleReorder = async (qset_id: number, direction: 'up' | 'down') => {
        const idx = data.findIndex(d => d.qset_id === qset_id);
        if (idx < 0) return;
        let swapIdx = direction === 'up' ? idx - 1 : idx + 1;
        if (swapIdx < 0 || swapIdx >= data.length) return;
        // Calculate new order for this item
        const newOrder = data[swapIdx].qset_order;
        try {
            await authenticatedApi.put(`/api/compliance/assessments/criteria/${qset_id}/reorder`, {
                direction,
                qset_order: newOrder,
                updated_by: username
            });
            toast.success('Order updated');
            fetchData();
        } catch (e) {
            toast.error('Failed to reorder');
        }
    };

    const handleStatusToggle = async (row: AssessmentCriteria) => {
        try {
            await authenticatedApi.put(`/api/compliance/assessments/criteria/${row.qset_id}`, {
                qset_stat: row.qset_stat === 'Active' ? 'Inactive' : 'Active',
                updated_by: username
            });
            toast.success('Status updated');
            fetchData();
        } catch (e) {
            toast.error('Failed to update status');
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Assessment Criteria Management</h3>
                <div className="flex items-center gap-2">
                    <Button onClick={handleAdd} disabled={adding || editingId !== null}>
                        <Plus className="w-4 h-4" />
                    </Button>
                </div>
            </div>
            <div className="flex items-end gap-4">
                <div className="flex gap-2">
                    <div
                        role="button"
                        onClick={() => setStatusFilter(statusFilter === 'Active' ? 'All' : 'Active')}
                        className={`cursor-pointer py-1 px-2 rounded ${statusFilter === 'Active' ? 'bg-green-100 ring-2 ring-green-200' : 'bg-green-200 shadow'} flex flex-col items-start`}
                    >
                        <div className="text-sm font-medium">Active {activeCount}</div>

                        {activeOwnersList && activeOwnersList.length > 0 && (
                            <div className="text-xs text-gray-500 mt-1">
                                {activeOwnersList.slice(0, 3).map(o => `${o.label}: ${o.count}`).join(', ')}{activeOwnersList.length > 3 ? ` +${activeOwnersList.length - 3} more` : ''}
                            </div>
                        )}
                    </div>
                    <div
                        role="button"
                        onClick={() => setStatusFilter(statusFilter === 'Inactive' ? 'All' : 'Inactive')}
                        className={`cursor-pointer py-1 px-2 rounded ${statusFilter === 'Inactive' ? 'bg-gray-100 ring-2 ring-gray-300' : 'bg-gray-200 shadow'} flex flex-col items-start`}
                    >
                        <div className="text-sm font-medium text-red-600">Inactive {inactiveCount}</div>

                        {inactiveOwnersList && inactiveOwnersList.length > 0 && (
                            <div className="text-xs text-gray-500 mt-1">
                                {inactiveOwnersList.slice(0, 3).map(o => `${o.label}: ${o.count}`).join(', ')}{inactiveOwnersList.length > 3 ? ` +${inactiveOwnersList.length - 3} more` : ''}
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex-1">
                    <Input placeholder="Search description..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
            </div>
            <div className="overflow-x-auto max-h-[700px] overflow-y-auto">
                <table className="min-w-full border text-sm">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="border px-2 py-1 sticky top-0 z-10 bg-gray-100">#</th>
                            <th className="border px-2 py-1 sticky top-0 z-10 bg-gray-100">Description</th>
                            <th className="border px-2 py-1 sticky top-0 z-10 bg-gray-100">Type</th>
                            <th className="border px-2 py-1 sticky top-0 z-10 bg-gray-100">Ownership</th>
                            <th className="border px-2 py-1 sticky top-0 z-10 bg-gray-100">Status</th>
                            <th className="border px-2 py-1 sticky top-0 z-10 bg-gray-100">Order</th>
                            <th className="border px-2 py-1 sticky top-0 z-10 bg-gray-100">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <AnimatePresence initial={false}>
                            {(
                                (adding ? [editRow] : []) as AssessmentCriteria[]
                            )
                                .concat(
                                    filteredData
                                        .slice()
                                        .sort((a, b) => a.qset_order - b.qset_order)
                                        .map(row => (editingId === row.qset_id ? (editRow as AssessmentCriteria) : row))
                                )
                                .map((row, idx) => (
                                    <motion.tr
                                        key={row.qset_id || `new-${idx}`}
                                        layout
                                        transition={{ type: "spring", stiffness: 500, damping: 40 }}
                                        className={[
                                            'transition-colors',
                                            'hover:bg-amber-100',
                                            (editingId === row.qset_id || (adding && row.qset_id === 0)) ? 'bg-yellow-50 border-2 border-amber-400' : '',
                                            row.qset_stat === 'Inactive' ? 'text-red-600' : '',
                                        ].join(' ')}
                                    >
                                        <td className="border px-2 py-1 text-center">{idx + 1}</td>
                                        <td className="border px-2 py-1">
                                            {editingId === row.qset_id || (adding && row.qset_id === 0) ? (
                                                <Input value={editRow.qset_desc || ''} onChange={e => setEditRow({ ...editRow, qset_desc: e.target.value })} />
                                            ) : (
                                                row.qset_desc
                                            )}
                                        </td>
                                        <td
                                            className={[
                                                "border px-2 py-1",
                                                row.qset_type === "NCR" ? "bg-blue-50 text-blue-800" : "",
                                                row.qset_type === "Rating" ? "bg-green-50 text-green-800" : "",
                                            ].join(" ")}
                                        >
                                            {editingId === row.qset_id || (adding && row.qset_id === 0) ? (
                                                <SingleSelect
                                                    options={QSET_TYPE_OPTIONS}
                                                    value={editRow.qset_type || ''}
                                                    onValueChange={v => setEditRow({ ...editRow, qset_type: v as AssessmentCriteria["qset_type"] })}
                                                    placeholder="Type"
                                                />
                                            ) : (
                                                row.qset_type
                                            )}
                                        </td>
                                        <td className="border px-2 py-1">
                                            {editingId === row.qset_id || (adding && row.qset_id === 0) ? (
                                                <SingleSelect
                                                    options={ownershipOptions}
                                                    value={String(editRow.ownership ?? '')}
                                                    onValueChange={v => setEditRow({ ...editRow, ownership: v })}
                                                    placeholder="Ownership"
                                                />
                                            ) : (
                                                row.ownership == null || row.ownership === ''
                                                    ? 'undefined'
                                                    : (ownershipOptions.find(opt => opt.value === String(row.ownership) || opt.label === String(row.ownership))?.label || String(row.ownership))
                                            )}
                                        </td>
                                        <td className="border px-2 py-1 text-center">
                                            {editingId === row.qset_id || (adding && row.qset_id === 0) ? (
                                                <SingleSelect
                                                    options={STATUS_OPTIONS}
                                                    value={editRow.qset_stat || 'Active'}
                                                    onValueChange={v => setEditRow({ ...editRow, qset_stat: v as AssessmentCriteria["qset_stat"] })}
                                                    placeholder="Status"
                                                />
                                            ) : (
                                                <Button size="sm" variant={row.qset_stat === 'Active' ? 'default' : 'outline'} onClick={() => handleStatusToggle(row)}>
                                                    {row.qset_stat}
                                                </Button>
                                            )}
                                        </td>
                                        <td className="border px-2 py-1 text-center">
                                            {editingId === row.qset_id || (adding && row.qset_id === 0) ? (
                                                <Input type="number" value={editRow.qset_order ?? ''} onChange={e => setEditRow({ ...editRow, qset_order: Number(e.target.value) })} />
                                            ) : (
                                                <div className="flex items-center gap-1 justify-center">
                                                    <Button size="sm" variant="outline" onClick={() => handleReorder(row.qset_id, 'up')} disabled={idx === 0} aria-label="Move up">
                                                        <ChevronUp className="w-4 h-4" />
                                                    </Button>
                                                    <span>{row.qset_order}</span>
                                                    <Button size="sm" variant="outline" onClick={() => handleReorder(row.qset_id, 'down')} disabled={idx === data.length - 1} aria-label="Move down">
                                                        <ChevronDown className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            )}
                                        </td>
                                        {/* Updated At column removed as requested */}
                                        <td className="border px-2 py-1 text-center">
                                            {editingId === row.qset_id || (adding && row.qset_id === 0) ? (
                                                <div className="flex gap-2">
                                                    <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={handleSave} aria-label="Save">
                                                        <Save className="w-4 h-4" />
                                                    </Button>
                                                    <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white" onClick={handleCancel}>Cancel</Button>
                                                </div>
                                            ) : (
                                                <Button size="sm" variant="outline" className="bg-amber-300 hover:bg-amber-400 text-amber-900" onClick={() => handleEdit(row)} aria-label="Edit">
                                                    <Pencil className="w-4 h-4" />
                                                </Button>
                                            )}
                                        </td>
                                    </motion.tr>
                                ))}
                        </AnimatePresence>
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AssessmentCriteriaGrid;