"use client";

import React, { useEffect, useState, useContext } from "react";
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
    year_new_criteria?: number;
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

const AssessmentCriteriaGrid: React.FC = () => {
    const [data, setData] = useState<AssessmentCriteria[]>([]);
    const [loading, setLoading] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editRow, setEditRow] = useState<Partial<AssessmentCriteria>>({});
    const [adding, setAdding] = useState(false);
    const auth = useContext(AuthContext);
    const username = (auth?.authData?.user?.username) || ((auth?.authData?.user as any)?.ramco_id) || '';

    const fetchData = async () => {
        setLoading(true);
        try {
            const resp: any = await authenticatedApi.get('/api/compliance/assessment-criteria');
            const arr = Array.isArray(resp.data) ? resp.data : (resp.data?.data || []);
            setData(arr);
        } catch (e) {
            toast.error('Failed to fetch assessment criteria');
            setData([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const handleEdit = (row: AssessmentCriteria) => {
        setEditingId(row.qset_id);
        setEditRow({ ...row });
    };

    const handleCancel = () => {
        setEditingId(null);
        setEditRow({});
        setAdding(false);
    };

    const handleSave = async () => {
        if (!editRow.qset_desc || !editRow.qset_type) {
            toast.error('Description and type are required');
            return;
        }
        try {
            if (adding) {
                // Create
                const payload = { ...editRow, created_by: username };
                await authenticatedApi.post('/api/compliance/assessment-criteria', payload);
                toast.success('Assessment criteria created');
            } else {
                // Update
                const payload = { ...editRow, updated_by: username };
                await authenticatedApi.put(`/api/compliance/assessment-criteria/${editRow.qset_id}`, payload);
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
            ownership: '1',
            dept: 1,
            year_new_criteria: new Date().getFullYear(),
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
            await authenticatedApi.put(`/api/compliance/assessment-criteria/${qset_id}/reorder`, {
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
            await authenticatedApi.put(`/api/compliance/assessment-criteria/${row.qset_id}`, {
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
                    <Button 
                        onClick={() => window.open('/compliance/assessment/form', '_blank')}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                        + Assessment
                    </Button>
                    <Button onClick={handleAdd} disabled={adding || editingId !== null}>
                        <Plus className="w-4 h-4" />
                    </Button>
                </div>
            </div>
            <div className="overflow-x-auto max-h-[700px] overflow-y-auto">
                <table className="min-w-full border text-sm">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="border px-2 py-1 sticky top-0 z-10 bg-gray-100">#</th>
                            <th className="border px-2 py-1 sticky top-0 z-10 bg-gray-100">Description</th>
                            <th className="border px-2 py-1 sticky top-0 z-10 bg-gray-100">Type</th>
                            <th className="border px-2 py-1 sticky top-0 z-10 bg-gray-100">Status</th>
                            <th className="border px-2 py-1 sticky top-0 z-10 bg-gray-100">Order</th>
                            <th className="border px-2 py-1 sticky top-0 z-10 bg-gray-100">Updated At</th>
                            <th className="border px-2 py-1 sticky top-0 z-10 bg-gray-100">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <AnimatePresence initial={false}>
                        {(
                            (adding ? [editRow] : []) as AssessmentCriteria[]
                        )
                            .concat(
                                data
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
                                    ].join(' ')}
                                >
                                    <td className="border px-2 py-1 text-center">{row.qset_quesno}</td>
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
                                    <td className="border px-2 py-1 text-center">
                                        {editingId === row.qset_id || (adding && row.qset_id === 0) ? (
                                            <Input type="number" value={editRow.year_new_criteria ?? ''} onChange={e => setEditRow({ ...editRow, year_new_criteria: Number(e.target.value) })} />
                                        ) : (
                                            row.year_new_criteria || ''
                                        )}
                                    </td>
                                    <td className="border px-2 py-1 text-center">
                                        {editingId === row.qset_id || (adding && row.qset_id === 0) ? (
                                            <div className="flex gap-2">
                                                <Button size="sm" onClick={handleSave} aria-label="Save">
                                                    <Save className="w-4 h-4" />
                                                </Button>
                                                <Button size="sm" variant="outline" onClick={handleCancel}>Cancel</Button>
                                            </div>
                                        ) : (
                                            <Button size="sm" variant="outline" className="hover:bg-amber-300" onClick={() => handleEdit(row)} aria-label="Edit">
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