'use client';
import React, { useState, useEffect } from 'react';
import { CustomDataGrid } from '@components/ui/DataGrid';
import { Plus, Pencil, CirclePlus } from 'lucide-react';
import ActionSidebar from '@components/ui/action-aside';
import SidebarItemPicker from './item-cart';
import { authenticatedApi } from '@/config/api';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

// Define the type for a stock request application row
interface StockRequestApplication {
    id: number;
    request_ref_no: string;
    requested_by: { id: number; name: string } | string;
    requested_at?: string;
    verified_by?: string;
    verified_at?: string;
    verification_status?: string;
    approved_by?: string;
    approved_at?: string;
    approval_status?: string;
    department?: string;
    team_name?: string;
    use_for?: string;
    remarks?: string;
    total_items?: number;
    created_at?: string;
    items?: Array<{ id: number; name: string; qty: number; remarks?: string }>;
    [key: string]: any;
}

const RTRequest: React.FC = () => {
    const [showForm, setShowForm] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [inStockSidebarOpen, setInStockSidebarOpen] = useState<null | number>(null);
    const [selectedItems, setSelectedItems] = useState<Array<{ id: number; name: string; qty: number; remarks?: string }>>([]);
    const [lastAddedId, setLastAddedId] = useState<number | null>(null);
    const [applications, setApplications] = useState<StockRequestApplication[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
    const [editingId, setEditingId] = useState<number | null>(null);
    const [formData, setFormData] = useState<Partial<StockRequestApplication>>({});
    const [teams, setTeams] = useState<{ id: number; name: string }[]>([]);
    const [inStockItems, setInStockItems] = useState<any[]>([]);
    const [inStockLoading, setInStockLoading] = useState(false);

    // Fetch stock requests from backend
    useEffect(() => {
        const fetchApplications = async () => {
            try {
                setLoading(true);
                const res = await authenticatedApi.get('/api/stock/requests');
                const data = res.data && Array.isArray((res.data as any).data) ? (res.data as any).data : [];
                setApplications(data);
            } catch {
                setApplications([]);
            } finally {
                setLoading(false);
            }
        };
        fetchApplications();
    }, []);

    // Fetch teams for the select
    useEffect(() => {
        const fetchTeams = async () => {
            try {
                const res = await authenticatedApi.get('/api/stock/teams');
                const apiData = (res as any)?.data?.data;
                setTeams(Array.isArray(apiData) ? apiData : []);
            } catch {
                setTeams([]);
            }
        };
        fetchTeams();
    }, []);

    // Add item or increment qty if same item exists
    const handleSidebarAdd = (item: any) => {
        setSelectedItems(prev => {
            const existing = prev.find((si: any) => si.id === item.id);
            if (existing) {
                return prev.map((si: any) =>
                    si.id === item.id ? { ...si, qty: (si.qty || 1) + 1 } : si
                );
            } else {
                setLastAddedId(item.id);
                // Ensure 'name' is set for table display
                return [...prev, { ...item, name: item.item_name || item.name, qty: 1 }];
            }
        });
    };

    // Remove highlight after a short delay
    useEffect(() => {
        if (lastAddedId !== null) {
            const timeout = setTimeout(() => setLastAddedId(null), 1200);
            return () => clearTimeout(timeout);
        }
    }, [lastAddedId]);

    // Filtering logic
    const filteredApplications = React.useMemo(() => {
        if (!searchTerm) return applications;
        return applications.filter((row) =>
            Object.values(row).some((value) =>
                typeof value === 'string'
                    ? value.toLowerCase().includes(searchTerm.toLowerCase())
                    : false
            )
        );
    }, [applications, searchTerm]);

    // DataGrid columns
    type ColumnDef<T> = {
        key: keyof T | string;
        header: string;
        sortable?: boolean;
        filter?: 'input' | 'singleSelect';
        render?: (row: T) => React.ReactNode;
    };

    const columns: ColumnDef<StockRequestApplication>[] = [
        { key: 'id', header: 'ID', sortable: true },
        { key: 'requested_at', header: 'Date', sortable: true, render: (row) => row.requested_at ? new Date(row.requested_at).toLocaleString() : '-' },
        { key: 'request_ref_no', header: 'Request Ref No', sortable: true, filter: 'input' },
        { key: 'requested_by', header: 'Requested By', sortable: true, filter: 'input', render: (row) => typeof row.requested_by === 'object' && row.requested_by !== null ? row.requested_by.name : row.requested_by },
        { key: 'total_items', header: 'Total Items', sortable: false, render: (row) => row.total_items },
        { key: 'verification_status', header: 'Verification Status', sortable: true, filter: 'singleSelect' },
        { key: 'approved_by', header: 'Approved By', sortable: true, filter: 'input' },
        { key: 'approved_at', header: 'Approved At', sortable: true, render: (row) => row.approved_at ? new Date(row.approved_at).toLocaleString() : '-' },
        { key: 'approval_status', header: 'Approval Status', sortable: true, filter: 'singleSelect' },
        {
            key: 'action',
            header: 'Action',
            sortable: false,
            render: (row) => (
                <Pencil
                    size={18}
                    className="inline-flex items-center justify-center rounded hover:bg-amber-100 cursor-pointer text-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    tabIndex={0}
                    role="button"
                    aria-label="Edit"
                    onClick={() => handleEdit(row)}
                    onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') handleEdit(row);
                    }}
                />
            )
        }
    ];

    // Populate form for editing
    const handleEdit = (row: StockRequestApplication) => {
        setShowForm(true);
        setFormMode('edit');
        setEditingId(row.id);
        setFormData({ ...row });
        // Ensure 'name' is set for all items for table display, fallback to item_name if present (using type assertion)
        setSelectedItems(
            row.items
                ? row.items.map(i => {
                    const anyItem = i as any;
                    return {
                        ...i,
                        name: typeof i.name === 'string' && i.name ? i.name : (typeof anyItem.item_name === 'string' ? anyItem.item_name : '')
                    };
                })
                : []
        );
    };

    // Handle form field changes
    const handleFormChange = (field: keyof StockRequestApplication, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    // Handle form submit
    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const payload = {
            ...formData,
            items: selectedItems.map(i => ({ ...i, item_name: i.name })),
            total_items: selectedItems.reduce((sum, item) => sum + (item.qty || 0), 0),
        };
        try {
            if (formMode === 'edit' && editingId) {
                await authenticatedApi.put(`/api/stock/requests/${editingId}`, payload);
            } else {
                await authenticatedApi.post('/api/stock/requests', payload);
            }
            setShowForm(false);
            setFormMode('create');
            setEditingId(null);
            setFormData({});
            setSelectedItems([]);
            // Refresh data
            const res = await authenticatedApi.get('/api/stock/requests');
            const data = res.data && Array.isArray((res.data as any).data) ? (res.data as any).data : [];
            setApplications(data);
        } catch (err) {
            // TODO: show error toast
        }
    };

    // Helper type guard
    function isTeamObject(obj: any): obj is { id: number; name: string } {
        return obj && typeof obj === 'object' && typeof obj.id === 'number' && typeof obj.name === 'string';
    }

    // When editing, map requested_by id or name to the team object
    useEffect(() => {
        if (
            formMode === 'edit' &&
            formData.requested_by &&
            teams.length > 0 &&
            !(typeof formData.requested_by === 'object' && 'id' in formData.requested_by && 'name' in formData.requested_by)
        ) {
            let found: { id: number; name: string } | undefined;
            if (typeof formData.requested_by === 'number') {
                found = teams.find(t => t.id === Number(formData.requested_by));
            } else if (typeof formData.requested_by === 'string') {
                found = teams.find(t => String(t.id) === formData.requested_by || t.name === formData.requested_by);
            }
            if (found) setFormData(prev => ({ ...prev, requested_by: found }));
        }
    }, [formMode, formData.requested_by, teams]);

    // Handle adding in-stock item
    const handleAddInStockItem = (item: any) => {
        setSelectedItems(prev => {
            if (prev.some(si => si.id === item.id)) return prev;
            return [...prev, { ...item, name: item.item_name || item.name, qty: 1 }];
        });
    };

    // Add handler for fetching in-stock for a specific item
    const handleShowInStockSidebar = async (itemId: number) => {
        setInStockSidebarOpen(itemId);
        setInStockLoading(true);
        try {
            const res = await authenticatedApi.get(`/api/stock/items/${itemId}/in-stock`);
            const apiData = (res as any)?.data?.data;
            setInStockItems(Array.isArray(apiData) ? apiData : []);
        } catch {
            setInStockItems([]);
        } finally {
            setInStockLoading(false);
        }
    };

    return (
        <div className="bg-white dark:bg-neutral-900 rounded shadow mt-4 mb-6">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Stock Request</h2>
                <Button
                    variant="default"
                    className="px-4 py-2 rounded"
                    onClick={() => setShowForm(v => !v)}
                >
                    {showForm ? 'Close Form' : 'Create Stock Request'}
                </Button>
            </div>
            {showForm && (
                <div className="mb-6">
                    <div className={`${formMode === 'edit' ? 'bg-amber-50/50' : 'bg-gray-50/50'}  dark:bg-gray-800 p-4 mb-4`}>
                        <h2 className="text-lg text-center font-bold mb-6">Stock Request Form</h2>
                        <Tabs defaultValue="request-info">
                            <TabsList className="mb-4">
                                <TabsTrigger value="request-info">Request Info</TabsTrigger>
                                <TabsTrigger value="verification-info">Verification Info</TabsTrigger>
                                <TabsTrigger value="collections">Collections</TabsTrigger>
                            </TabsList>
                            <TabsContent value="request-info">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-2">
                                        <Label className="text-sm font-semibold">Request Ref No.</Label>
                                        <Input className="form-input form-input-sm" placeholder="Enter Request Ref No." value={formData.request_ref_no || ''} onChange={e => handleFormChange('request_ref_no', e.target.value)} />
                                        <Label className="text-sm font-semibold mt-2">Requested By</Label>
                                        <Select
                                            value={typeof formData.requested_by === 'object' && formData.requested_by !== null ? String(formData.requested_by.id) : ''}
                                            onValueChange={val => {
                                                const team = teams.find(t => String(t.id) === val);
                                                if (team) handleFormChange('requested_by', team);
                                            }}
                                        >
                                            <SelectTrigger className="form-input form-input-sm w-full">
                                                <SelectValue placeholder="Select Team" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {teams.map(team => (
                                                    <SelectItem key={team.id} value={String(team.id)}>{team.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <Label className="text-sm font-semibold mt-2">Requested At</Label>
                                        <Input type="datetime-local" className="form-input form-input-sm" value={formData.requested_at ? formData.requested_at.slice(0, 16) : ''} onChange={e => handleFormChange('requested_at', e.target.value)} />
                                        <Label className="text-sm font-semibold mt-2">Use For</Label>
                                        <Input className="form-input form-input-sm" placeholder="Enter Use For" value={formData.use_for || ''} onChange={e => handleFormChange('use_for', e.target.value)} />
                                    </div>
                                </div>
                            </TabsContent>
                            <TabsContent value="verification-info">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-2">
                                        <Label className="text-sm font-semibold">Verified By</Label>
                                        <Input className="form-input form-input-sm" placeholder="Enter Verifier Name" value={formData.verified_by || ''} onChange={e => handleFormChange('verified_by', e.target.value)} />
                                        <Label className="text-sm font-semibold mt-2">Verified At</Label>
                                        <Input type="datetime-local" className="form-input form-input-sm" value={formData.verified_at ? formData.verified_at.slice(0, 16) : ''} onChange={e => handleFormChange('verified_at', e.target.value)} />
                                        <Label className="text-sm font-semibold mt-2">Verification Status</Label>
                                        <Select value={formData.verification_status || ''} onValueChange={val => handleFormChange('verification_status', val)}>
                                            <SelectTrigger className="form-input form-input-sm w-full">
                                                <SelectValue placeholder="Select Status" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="pending">Pending</SelectItem>
                                                <SelectItem value="verified">Verified</SelectItem>
                                                <SelectItem value="rejected">Rejected</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </TabsContent>
                            <TabsContent value="collections">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-2">
                                        <Label className="text-sm font-semibold">Processed By</Label>
                                        <Input className="form-input form-input-sm" placeholder="Enter Processed By" value={formData.processed_by || ''} onChange={e => handleFormChange('processed_by', e.target.value)} />
                                        <Label className="text-sm font-semibold mt-2">Processed At</Label>
                                        <Input type="datetime-local" className="form-input form-input-sm" value={formData.processed_at ? formData.processed_at.slice(0, 16) : ''} onChange={e => handleFormChange('processed_at', e.target.value)} />
                                        <Label className="text-sm font-semibold mt-2">Collected By</Label>
                                        <Input className="form-input form-input-sm" placeholder="Enter Collected By" value={formData.collected_by || ''} onChange={e => handleFormChange('collected_by', e.target.value)} />
                                        <Label className="text-sm font-semibold mt-2">Collected At</Label>
                                        <Input type="datetime-local" className="form-input form-input-sm" value={formData.collected_at ? formData.collected_at.slice(0, 16) : ''} onChange={e => handleFormChange('collected_at', e.target.value)} />
                                    </div>
                                </div>
                            </TabsContent>
                        </Tabs>
                        <Separator className="my-4" />
                        {/* Remarks */}
                        <div className="mb-6">
                            <h3 className="text-lg font-semibold mb-2">Remarks</h3>
                            <Textarea
                                className="form-textarea form-textarea-sm w-full"
                                placeholder="Enter remarks"
                                rows={2}
                                value={formData.remarks || ''}
                                onChange={e => handleFormChange('remarks', e.target.value)}
                            />
                        </div>
                        <Separator className="my-4" />
                        {/* Items Table */}
                        <div className="mb-6">
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="text-lg font-semibold">Items</h3>
                                <div className="flex gap-2">
                                    <Button
                                        className="bg-green-600 hover:bg-green-700 px-3 py-2 rounded text-white shadow-none"
                                        type="button"
                                        onClick={() => setSidebarOpen(true)}
                                    >
                                        <Plus size={24} />
                                    </Button>
                                </div>
                            </div>
                            <div className="overflow-x-auto min-w-0">
                                <table className="table-auto table-striped w-full border bg-white dark:bg-gray-900 min-w-[700px]">
                                    <thead>
                                        <tr className="bg-gray-100 dark:bg-neutral-800">
                                            <th className="border px-2 py-1">No</th>
                                            <th className="border px-2 py-1">Item Name</th>
                                            <th className="border px-2 py-1 w-[120px]">Requested Qty</th>
                                            <th className="border px-2 py-1 w-[120px]">Approved Qty</th>
                                            <th className="border px-2 py-1 w-[120px]">Balance Qty</th>
                                            <th className="border px-2 py-1 w-[200px]">Remarks</th>
                                            <th className="border px-2 py-1 w-8"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedItems.map((item: { id: number; name: string; qty: number; approved_qty?: number; remarks?: string }, index: number) => {
                                            const balanceQty = (item.qty || 0) - (item.approved_qty || 0);
                                            return (
                                                <tr key={index} className={item.id === lastAddedId ? 'bg-emerald-200 transition-colors duration-500' : ''}>
                                                    <td className="border px-2 py-0.5 text-center">{index + 1}</td>
                                                    <td className="border px-2 py-0.5">{item.name}</td>
                                                    <td className="border px-2 py-0.5">
                                                        <Input
                                                            type="number"
                                                            min={1}
                                                            className="form-input form-input-sm w-full text-center border-none px-0"
                                                            placeholder='0'
                                                            value={item.qty}
                                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                                                const qty = Math.max(1, Number(e.target.value));
                                                                setSelectedItems(prev => prev.map(si =>
                                                                    si.id === item.id ? { ...si, qty } : si
                                                                ));
                                                            }}
                                                        />
                                                    </td>
                                                    <td className="border px-2 py-0.5">
                                                        <Input
                                                            type="number"
                                                            min={0}
                                                            className="form-input form-input-sm w-full text-center border-none px-0"
                                                            placeholder='0'
                                                            value={item.approved_qty ?? ''}
                                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                                                const approved_qty = Math.max(0, Number(e.target.value));
                                                                setSelectedItems(prev => prev.map(si =>
                                                                    si.id === item.id ? { ...si, approved_qty } : si
                                                                ));
                                                            }}
                                                        />
                                                    </td>
                                                    <td className="border px-2 py-0.5 text-center font-bold">{balanceQty}</td>
                                                    <td className="border px-2 py-0.5">
                                                        <Textarea
                                                            className="form-textarea form-textarea-sm w-full border-none px-0"
                                                            placeholder="Remarks"
                                                            rows={1}
                                                            value={item.remarks || ''}
                                                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                                                                const remarks = e.target.value;
                                                                setSelectedItems(prev => prev.map(si =>
                                                                    si.id === item.id ? { ...si, remarks } : si
                                                                ));
                                                            }}
                                                        />
                                                    </td>
                                                    <td className="border px-2 py-0.5 text-center">
                                                        <CirclePlus
                                                            size={22}
                                                            className="inline-flex items-center justify-center hover:text-blue-700 cursor-pointer text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400"
                                                            tabIndex={0}
                                                            role="button"
                                                            aria-label="Add In-Stock"
                                                            onClick={() => handleShowInStockSidebar(item.id)}
                                                            onKeyDown={e => {
                                                                if (e.key === 'Enter' || e.key === ' ') handleShowInStockSidebar(item.id);
                                                            }}
                                                        />
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        <tr>
                                            <td colSpan={2} className="border px-2 py-1 text-right font-bold">Total</td>
                                            <td className="border px-2 py-1 text-center font-bold">{selectedItems.reduce((sum, item) => sum + (item.qty || 0), 0)}</td>
                                            <td className="border px-2 py-1"></td>
                                            <td className="border px-2 py-1"></td>
                                            <td className="border px-2 py-1" colSpan={2}></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                        </div>
                        {/* ActionSidebar for adding items */}
                        {sidebarOpen && (
                            <ActionSidebar
                                title="Item Cart"
                                onClose={() => setSidebarOpen(false)}
                                size="md"
                                content={
                                    <SidebarItemPicker
                                        selectedItems={selectedItems}
                                        onAdd={handleSidebarAdd}
                                    />
                                }
                            />
                        )}
                        {/* ActionSidebar for adding in-stock items, now per item */}
                        {inStockSidebarOpen !== null && (
                            <ActionSidebar
                                title="Add In-Stock Item"
                                onClose={() => setInStockSidebarOpen(null)}
                                size="md"
                                content={
                                    <div>
                                        {inStockLoading ? (
                                            <div className="text-center py-4">Loading...</div>
                                        ) : (
                                            <ul className="divide-y">
                                                {inStockItems.length === 0 ? (
                                                    <li className="py-2 text-gray-500 text-center">No in-stock items found.</li>
                                                ) : (
                                                    inStockItems.map(item => (
                                                        <li key={item.id} className="flex justify-between items-center py-2">
                                                            <span className="font-mono text-sm">{item.serial_no}</span>
                                                            <CirclePlus
                                                                size={22}
                                                                className="inline-flex items-center justify-center hover:text-green-700 cursor-pointer text-green-600 focus:outline-none focus:ring-2 focus:ring-green-400"
                                                                tabIndex={0}
                                                                role="button"
                                                                aria-label={`Add serial ${item.serial_no}`}
                                                                onClick={() => handleAddInStockItem(item)}
                                                                onKeyDown={e => {
                                                                    if (e.key === 'Enter' || e.key === ' ') handleAddInStockItem(item);
                                                                }}
                                                            />
                                                        </li>
                                                    ))
                                                )}
                                            </ul>
                                        )}
                                    </div>
                                }
                            />
                        )}
                        <div className="flex justify-center gap-4 mt-6">
                            <Button type="submit" className={`btn ${formMode === 'edit' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-blue-500 hover:bg-blue-600'} text-white px-4 py-2 rounded shadow-none`}>
                                {formMode === 'edit' ? 'Update' : 'Submit'}
                            </Button>
                            <Button type="button" className="btn bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded shadow-none" onClick={() => { setShowForm(false); setFormMode('create'); setEditingId(null); setFormData({}); setSelectedItems([]); }}>
                                Cancel
                            </Button>
                        </div>
                    </div>
                </div>
            )}
            {/* Table of applications */}
            {!showForm && (loading ? (
                <div className="text-gray-500 text-center py-10">Loading...</div>
            ) : (applications.length === 0 ? (
                <div className="text-gray-500 text-center py-10">No stock out applications yet.</div>
            ) : (
                <>
                    <CustomDataGrid
                        data={filteredApplications}
                        columns={columns}
                        pageSize={10}
                        pagination={true}
                        inputFilter={false}
                        columnsVisibleOption={false}
                        rowClass={row => ''}
                        rowSelection={undefined}
                        rowExpandable={undefined}
                    />
                </>
            )))}
        </div>
    );
};

export default RTRequest;

