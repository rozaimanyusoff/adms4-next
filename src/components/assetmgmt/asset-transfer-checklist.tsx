'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { AuthContext } from '@store/AuthContext';
import { authenticatedApi } from '@/config/api';
import { toast } from 'sonner';
import { CustomDataGrid } from '@/components/ui/DataGrid';
import type { ColumnDef } from '@/components/ui/DataGrid';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Pencil, Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import Link from 'next/link';

// Interface definitions
interface ChecklistType {
    id: number;
    name: string;
    description?: string;
}

interface ChecklistItem {
    id: number;
    type_id: number;
    item: string;
    is_required: boolean;
    sort_order: number;
    created_at?: string;
    updated_at?: string;
    // Joined data
    type?: ChecklistType;
}

interface FormData {
    id?: number;
    type_id: number;
    item: string;
    is_required: boolean;
    sort_order: number;
}

const AssetTransferChecklist: React.FC = () => {
    const auth = React.useContext(AuthContext);
    const user = auth?.authData?.user;
    const [data, setData] = useState<ChecklistItem[]>([]);
    const [types, setTypes] = useState<ChecklistType[]>([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState<FormData>({
        type_id: 0,
        item: '',
        is_required: false,
        sort_order: 1,
    });
    const [editIndex, setEditIndex] = useState<number | null>(null);

    // Fetch checklist data
    const fetchData = async () => {
    setLoading(true);
    try {
        const response = await authenticatedApi.get('/api/assets/transfer-checklist');
        const apiData = (response as any)?.data;
        // Map type_id to number and add type for display
        const mapped = (Array.isArray(apiData) ? apiData : apiData?.data || []).map((item: any) => ({
            ...item,
            type_id: typeof item.type_id === 'object' ? item.type_id.id : item.type_id,
            type: typeof item.type_id === 'object' ? item.type_id : undefined,
            is_required: item.is_required === 1 || item.is_required === true,
        }));
        setData(mapped);
    } catch (error) {
        console.error('Error fetching checklist data:', error);
        setData([]);
        toast.error('Failed to fetch checklist data');
    } finally {
        setLoading(false);
    }
};

    // Fetch checklist types
    const fetchTypes = async () => {
        try {
            const response = await authenticatedApi.get('/api/assets/types');
            const apiData = (response as any)?.data;
            setTypes(Array.isArray(apiData) ? apiData : apiData?.data || []);
        } catch (error) {
            console.error('Error fetching checklist types:', error);
            setTypes([]);
        }
    };

    useEffect(() => {
        fetchData();
        fetchTypes();
    }, []);

    // Handle form submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.item.trim()) {
            toast.error('Please enter a checklist item');
            return;
        }
        if (!formData.type_id) {
            toast.error('Please select a checklist type');
            return;
        }

        try {
            const payload = {
                type_id: formData.type_id,
                item: formData.item.trim(),
                is_required: formData.is_required,
                // sort_order: formData.sort_order, // already removed from form
                created_by: user?.username, // add created_by from user context
            };

            if (formData.id) {
                await authenticatedApi.put(`/api/assets/transfer-checklist/${formData.id}`, payload);
                toast.success('Checklist item updated successfully');
            } else {
                await authenticatedApi.post('/api/assets/transfer-checklist', payload);
                toast.success('Checklist item created successfully');
            }

            fetchData();
            handleCloseForm();
        } catch (error: any) {
            console.error('Error submitting form:', error);
            toast.error(error.response?.data?.message || 'Error submitting form');
        }
    };

    // Handle delete
    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this checklist item?')) return;

        try {
            await authenticatedApi.delete(`/api/assets/transfer-checklist/${id}`);
            toast.success('Checklist item deleted successfully');
            fetchData();
        } catch (error) {
            console.error('Error deleting item:', error);
            toast.error('Failed to delete checklist item');
        }
    };

    // Handle move up/down
    const handleMove = async (id: number, direction: 'up' | 'down') => {
        const currentItem = data.find(item => item.id === id);
        if (!currentItem) return;

        const currentSortOrder = currentItem.sort_order;
        const targetSortOrder = direction === 'up' ? currentSortOrder - 1 : currentSortOrder + 1;

        const targetItem = data.find(item =>
            item.type_id === currentItem.type_id &&
            item.sort_order === targetSortOrder
        );

        if (!targetItem) return;

        try {
            // Swap sort orders
            await authenticatedApi.put(`/api/assets/transfer-checklist/${currentItem.id}`, {
                ...currentItem,
                sort_order: targetSortOrder,
            });

            await authenticatedApi.put(`/api/assets/transfer-checklist/${targetItem.id}`, {
                ...targetItem,
                sort_order: currentSortOrder,
            });

            toast.success('Item order updated');
            fetchData();
        } catch (error) {
            console.error('Error updating order:', error);
            toast.error('Failed to update item order');
        }
    };

    // Open edit form
    const openEditForm = (row: ChecklistItem) => {
        const idx = data.findIndex(item => item.id === row.id);
        setEditIndex(idx);
        setFormData({
            id: row.id,
            type_id: row.type_id,
            item: row.item,
            is_required: row.is_required,
            sort_order: row.sort_order,
        });
        setIsModalOpen(true);
    };

    // Close form
    const handleCloseForm = () => {
        setIsModalOpen(false);
        setEditIndex(null);
        setFormData({
            type_id: 0,
            item: '',
            is_required: false,
            sort_order: 1,
        });
    };

    // Handle previous/next navigation
    const handlePrev = () => {
        if (editIndex !== null && editIndex > 0) {
            openEditForm(data[editIndex - 1]);
        }
    };

    const handleNext = () => {
        if (editIndex !== null && editIndex < data.length - 1) {
            openEditForm(data[editIndex + 1]);
        }
    };

    // Sort data by type and sort_order
    const sortedData = useMemo(() => {
        return [...data].sort((a, b) => {
            if (a.type_id !== b.type_id) {
                return a.type_id - b.type_id;
            }
            return a.sort_order - b.sort_order;
        });
    }, [data]);

    // Column definitions
    const columns: ColumnDef<ChecklistItem>[] = [
        { key: 'id', header: 'ID', sortable: true },
        {
            key: 'type_id',
            header: 'Type',
            sortable: true,
            filter: 'singleSelect',
            filterParams: {
                labelMap: Object.fromEntries(types.map(t => [t.id, t.name])),
            },
            render: (row: ChecklistItem) => {
                const type = types.find(t => t.id === row.type_id);
                return type ? type.name : `Type ${row.type_id}`;
            },
        },
        {
            key: 'item',
            header: 'Checklist Item',
            sortable: true,
            filter: 'input',
            render: (row: ChecklistItem) => (
                <div className="max-w-xs">
                    <span className="line-clamp-2">{row.item}</span>
                </div>
            ),
        },
        {
            key: 'is_required',
            header: 'Required',
            sortable: true,
            filter: 'singleSelect',
            filterParams: {
                options: ['true', 'false'],
                labelMap: { 'true': 'Required', 'false': 'Optional' },
            },
            render: (row: ChecklistItem) => (
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${row.is_required
                        ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    }`}>
                    {row.is_required ? 'Required' : 'Optional'}
                </span>
            ),
        },
        /* {
            key: 'sort_order',
            header: 'Order',
            sortable: true,
            render: (row: ChecklistItem) => (
                <div className="flex items-center gap-1">
                    <span className="min-w-[2rem] text-center">{row.sort_order}</span>
                    <div className="flex flex-col gap-0.5">
                        <Button
                            size="sm"
                            variant="ghost"
                            className="h-5 w-5 p-0"
                            onClick={() => handleMove(row.id, 'up')}
                            disabled={data.filter(d => d.type_id === row.type_id && d.sort_order < row.sort_order).length === 0}
                        >
                            <ArrowUp className="h-3 w-3" />
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            className="h-5 w-5 p-0"
                            onClick={() => handleMove(row.id, 'down')}
                            disabled={data.filter(d => d.type_id === row.type_id && d.sort_order > row.sort_order).length === 0}
                        >
                            <ArrowDown className="h-3 w-3" />
                        </Button>
                    </div>
                </div>
            ),
        }, */
    ];

    // Add onRowDoubleClick handler to open edit form
    const handleRowDoubleClick = (row: ChecklistItem) => {
        openEditForm(row);
    };

    return (
        <div className="mt-4">

            {/* Header */}
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h1 className="text-2xl font-semibold">Transfer Checklist</h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        Manage checklist items for asset transfer processes
                    </p>
                </div>
                <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                </Button>
            </div>

            {/* Data Grid */}
            <CustomDataGrid
                data={sortedData}
                columns={columns}
                pageSize={20}
                pagination={true}
                inputFilter={false}
                onRowDoubleClick={handleRowDoubleClick}
            />

            {/* Add/Edit Dialog */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            {formData.id ? 'Edit Checklist Item' : 'Add Checklist Item'}
                        </DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Type Selection */}
                        <div>
                            <Label htmlFor="type_id">Checklist Type *</Label>
                            <Select
                                value={formData.type_id ? String(formData.type_id) : ''}
                                onValueChange={(value) => setFormData({ ...formData, type_id: Number(value) })}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select checklist type" />
                                </SelectTrigger>
                                <SelectContent>
                                    {types.map((type) => (
                                        <SelectItem key={type.id} value={String(type.id)}>
                                            {type.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Checklist Item */}
                        <div>
                            <Label htmlFor="item">Checklist Item *</Label>
                            <Textarea
                                id="item"
                                value={formData.item}
                                onChange={(e) => setFormData({ ...formData, item: e.target.value })}
                                placeholder="Enter checklist item description"
                                rows={3}
                                required
                            />
                        </div>

                        {/* Is Required Checkbox */}
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="is_required"
                                checked={formData.is_required}
                                onCheckedChange={(checked) =>
                                    setFormData({ ...formData, is_required: checked === true })
                                }
                            />
                            <Label htmlFor="is_required">This item is required</Label>
                        </div>

                        {/* Form Actions */}
                        <div className="flex justify-between">
                            <div className="flex gap-2">
                                {editIndex !== null && (
                                    <>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={handlePrev}
                                            disabled={editIndex <= 0}
                                        >
                                            Previous
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={handleNext}
                                            disabled={editIndex >= data.length - 1}
                                        >
                                            Next
                                        </Button>
                                    </>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <Button type="button" variant="outline" onClick={handleCloseForm}>
                                    Cancel
                                </Button>
                                <Button type="submit">
                                    {formData.id ? 'Update' : 'Create'}
                                </Button>
                            </div>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default AssetTransferChecklist;
