'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { CustomDataGrid, ColumnDef } from '@components/ui/DataGrid';
import { Pencil, Plus, X } from 'lucide-react';
import ActionSidebar from '@components/ui/action-aside';
import SidebarItemPicker from './item-cart';
import { authenticatedApi } from '@/config/api';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

const vendors = [
	{ id: 1, name: 'Vendor A' },
	{ id: 2, name: 'Vendor B' },
	{ id: 3, name: 'Vendor C' },
];

// Define the type for a purchase application row
interface PurchaseApplication {
  id: number;
  po_no: string;
  inv_no: string;
  supplier_name: string;
  po_date?: string;
  inv_date?: string;
  do_no?: string;
  do_date?: string;
  total_items?: number;
  items?: { item_name: string; qty: number }[];
  created_at?: string;
  [key: string]: any;
}

const Purchase: React.FC = () => {
	const [showForm, setShowForm] = useState(false);
	const [sidebarOpen, setSidebarOpen] = useState(false);
	const [selectedItems, setSelectedItems] = useState<any[]>([]);
	const [lastAddedId, setLastAddedId] = useState<number | null>(null);
	const [applications, setApplications] = useState<PurchaseApplication[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchTerm, setSearchTerm] = useState('');
	const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
	const [editingId, setEditingId] = useState<number | null>(null);
	const [formData, setFormData] = useState<Partial<PurchaseApplication>>({});
	const [suppliers, setSuppliers] = useState<any[]>([]);

	// Fetch purchase applications from backend
	useEffect(() => {
		const fetchApplications = async () => {
			try {
				setLoading(true);
				const res = await authenticatedApi.get('/api/stock/purchase');
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

	// Fetch suppliers from backend
	useEffect(() => {
		const fetchSuppliers = async () => {
			try {
				const res = await authenticatedApi.get('/api/stock/suppliers');
				const supplierData = (res.data as { data?: any[] }) && Array.isArray((res.data as { data?: any[] }).data)
					? (res.data as { data?: any[] }).data
					: [];
				setSuppliers(supplierData ?? []);
			} catch {
				setSuppliers([]);
			}
		};
		fetchSuppliers();
	}, []);

	// Add item or increment qty if same item+vendor exists
	const handleSidebarAdd = (item: any) => {
		setSelectedItems(prev => {
			// Check for same item+vendor (default vendor is first in list)
			const vendorId = vendors[0].id;
			const existing = prev.find((si: any) => si.id === item.id && si.vendorId === vendorId);
			if (existing) {
				return prev.map((si: any) =>
					si.id === item.id && si.vendorId === vendorId ? { ...si, qty: (si.qty || 1) + 1 } : si
				);
			} else {
				setLastAddedId(item.id);
				return [...prev, { ...item, qty: 1, vendorId }];
			}
		});
	};

	// Remove highlight after a short delay
	React.useEffect(() => {
		if (lastAddedId !== null) {
			const timeout = setTimeout(() => setLastAddedId(null), 1200);
			return () => clearTimeout(timeout);
		}
	}, [lastAddedId]);

	// Filtering logic
	const filteredApplications = useMemo(() => {
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
	const columns: ColumnDef<PurchaseApplication>[] = [
		{ key: 'id', header: 'ID', sortable: true },
		{ key: 'request_ref_no', header: 'Request Ref No', sortable: true, filter: 'input' },
		{ key: 'requested_by', header: 'Requested By', sortable: true, filter: 'input' },
		{ key: 'requested_at', header: 'Requested At', sortable: true, render: (row) => row.requested_at ? new Date(row.requested_at).toLocaleString() : '-' },
		{ key: 'total_items', header: 'Total Items', sortable: false, render: (row) => row.total_items },
		{ key: 'verified_by', header: 'Verified By', sortable: true, filter: 'input' },
		{ key: 'verified_at', header: 'Verified At', sortable: true, render: (row) => row.verified_at ? new Date(row.verified_at).toLocaleString() : '-' },
		{ key: 'verification_status', header: 'Verification Status', sortable: true, filter: 'singleSelect' },
		{ key: 'approved_by', header: 'Approved By', sortable: true, filter: 'input' },
		{ key: 'approved_at', header: 'Approved At', sortable: true, render: (row) => row.approved_at ? new Date(row.approved_at).toLocaleString() : '-' },
		{ key: 'approval_status', header: 'Approval Status', sortable: true, filter: 'singleSelect' },
		{ key: 'po_no', header: 'PO No', sortable: true, filter: 'input' },
		{ key: 'po_date', header: 'PO Date', sortable: true, render: (row) => row.po_date ? new Date(row.po_date).toLocaleDateString() : '-' },
		{ key: 'supplier_name', header: 'Supplier', sortable: true, filter: 'input' },
		{ key: 'inv_no', header: 'Invoice No', sortable: true, filter: 'input' },
		{ key: 'inv_date', header: 'Invoice Date', sortable: true, render: (row) => row.inv_date ? new Date(row.inv_date).toLocaleDateString() : '-' },
		{ key: 'do_no', header: 'DO No', sortable: false },
		{ key: 'do_date', header: 'DO Date', sortable: false, render: (row) => row.do_date ? new Date(row.do_date).toLocaleDateString() : '-' },
		{ key: 'received_by', header: 'Received By', sortable: true, filter: 'input' },
		{ key: 'received_at', header: 'Received At', sortable: true, render: (row) => row.received_at ? new Date(row.received_at).toLocaleString() : '-' },
		{ key: 'created_at', header: 'Created At', sortable: false, render: (row) => row.created_at ? new Date(row.created_at).toLocaleString() : '-' },
		{
			key: 'action',
			header: 'Action',
			sortable: false,
			render: (row) => (
				<Button
					type="button"
					className="rounded bg-amber-400 hover:bg-amber-200"
					title="Edit"
					onClick={() => handleEdit(row)}
				>
					<Pencil size={18} />
				</Button>
			)
		}
	];

	// Populate form for editing
	const handleEdit = (row: PurchaseApplication) => {
		setShowForm(true);
		setFormMode('edit');
		setEditingId(row.id);
		setFormData({ ...row });
		setSelectedItems(row.items ? row.items.map(i => ({ ...i, name: i.item_name })) : []);
	};

	// Handle form field changes
	const handleFormChange = (field: keyof PurchaseApplication, value: any) => {
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
				await authenticatedApi.put(`/api/stock/purchase/${editingId}`, payload);
			} else {
				await authenticatedApi.post('/api/stock/purchase', payload);
			}
			setShowForm(false);
			setFormMode('create');
			setEditingId(null);
			setFormData({});
			setSelectedItems([]);
			// Refresh data
			const res = await authenticatedApi.get('/api/stock/purchase');
			const data = res.data && Array.isArray((res.data as any).data) ? (res.data as any).data : [];
			setApplications(data);
		} catch (err) {
			// TODO: show error toast
		}
	};

	// Ensure supplier dropdown is correctly mapped to selected supplier in edit mode
	useEffect(() => {
		if (formMode === 'edit' && formData.supplier && formData.supplier.id) {
			setFormData(prev => ({ ...prev, supplier_id: formData.supplier.id }));
		}
	}, [formMode, formData.supplier]);

	return (
		<div className="bg-white dark:bg-neutral-900 rounded shadow mt-4 mb-6">
			<div className="flex justify-between items-center mb-4">
				<h2 className="text-xl font-semibold">Stock Purchase</h2>
				<Button
					variant="default"
					className="px-4 py-2 rounded"
					onClick={() => setShowForm(v => !v)}
				>
					{showForm ? 'Close Form' : 'Create Purchase Application'}
				</Button>
			</div>
			{showForm && (
				<div className="mb-6">
					<div className={`${formMode === 'edit' ? 'bg-amber-50/50' : 'bg-gray-50/50'}  dark:bg-gray-800 p-4 mb-4`}>
						<h2 className="text-lg text-center font-bold mb-6">Purchase Request Form</h2>
						<Tabs defaultValue="request-info">
							<TabsList className="mb-4">
								<TabsTrigger value="request-info">Request Info</TabsTrigger>
								<TabsTrigger value="verification-info">Verification Info</TabsTrigger>
								<TabsTrigger value="approval-info">Approval Info</TabsTrigger>
								<TabsTrigger value="po-supplier-info">Procurement Info</TabsTrigger>
								<TabsTrigger value="invoice-do-receiver-info">Delivery Info</TabsTrigger>
							</TabsList>

							<TabsContent value="request-info">
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div className="flex flex-col gap-2">
										<Label className="text-sm font-semibold">Request Ref No.</Label>
										<Input className="form-input form-input-sm" placeholder="Enter Request Ref No." value={formData.request_ref_no || ''} onChange={e => handleFormChange('request_ref_no', e.target.value)} />
										<Label className="text-sm font-semibold mt-2">Requested By</Label>
										<Input className="form-input form-input-sm" placeholder="Enter Requester Name" value={formData.requested_by || ''} onChange={e => handleFormChange('requested_by', e.target.value)} />
										<Label className="text-sm font-semibold mt-2">Requested At</Label>
										<Input type="datetime-local" className="form-input form-input-sm" value={formData.requested_at ? formData.requested_at.slice(0, 16) : ''} onChange={e => handleFormChange('requested_at', e.target.value)} />
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

							<TabsContent value="approval-info">
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div className="flex flex-col gap-2">
										<Label className="text-sm font-semibold">Approved By</Label>
										<Input className="form-input form-input-sm" placeholder="Enter Approver Name" value={formData.approved_by || ''} onChange={e => handleFormChange('approved_by', e.target.value)} />
										<Label className="text-sm font-semibold mt-2">Approved At</Label>
										<Input type="datetime-local" className="form-input form-input-sm" value={formData.approved_at ? formData.approved_at.slice(0, 16) : ''} onChange={e => handleFormChange('approved_at', e.target.value)} />
										<Label className="text-sm font-semibold mt-2">Approval Status</Label>
										<Select value={formData.approval_status || ''} onValueChange={val => handleFormChange('approval_status', val)}>
											<SelectTrigger className="form-input form-input-sm w-full">
												<SelectValue placeholder="Select Status" />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="pending">Pending</SelectItem>
												<SelectItem value="approved">Approved</SelectItem>
												<SelectItem value="rejected">Rejected</SelectItem>
											</SelectContent>
										</Select>
									</div>
								</div>
							</TabsContent>

							<TabsContent value="po-supplier-info">
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div className="flex flex-col gap-2">
										<Label className="text-sm font-semibold">PO No.</Label>
										<Input className="form-input form-input-sm" placeholder="Enter PO No." value={formData.po_no || ''} onChange={e => handleFormChange('po_no', e.target.value)} />
										<Label className="text-sm font-semibold mt-2">PO Date</Label>
										<Input type="date" className="form-input form-input-sm" value={formData.po_date ? formData.po_date.slice(0,10) : ''} onChange={e => handleFormChange('po_date', e.target.value)} />
										<Label className="text-sm font-semibold mt-2">Supplier</Label>
										<Select value={formData.supplier_id || ''} onValueChange={val => handleFormChange('supplier_id', val)}>
											<SelectTrigger className="form-input form-input-sm w-full">
												<SelectValue placeholder="Select Supplier" />
											</SelectTrigger>
											<SelectContent>
												{suppliers.map(supplier => (
													<SelectItem key={supplier.id} value={supplier.id}>{supplier.name}</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
								</div>
							</TabsContent>

							<TabsContent value="invoice-do-receiver-info">
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div className="flex flex-col gap-2">
										<Label className="text-sm font-semibold">Invoice No.</Label>
										<Input className="form-input form-input-sm" placeholder="Enter Invoice No." value={formData.inv_no || ''} onChange={e => handleFormChange('inv_no', e.target.value)} />
										<Label className="text-sm font-semibold mt-2">Invoice Date</Label>
										<Input type="date" className="form-input form-input-sm" value={formData.inv_date ? formData.inv_date.slice(0,10) : ''} onChange={e => handleFormChange('inv_date', e.target.value)} />
										<Label className="text-sm font-semibold mt-2">DO No.</Label>
										<Input className="form-input form-input-sm" placeholder="Enter DO No." value={formData.do_no || ''} onChange={e => handleFormChange('do_no', e.target.value)} />
										<Label className="text-sm font-semibold mt-2">DO Date</Label>
										<Input type="date" className="form-input form-input-sm" value={formData.do_date ? formData.do_date.slice(0,10) : ''} onChange={e => handleFormChange('do_date', e.target.value)} />
									</div>
									<div className="flex flex-col gap-2">
										<Label className="text-sm font-semibold">Received By</Label>
										<Input className="form-input form-input-sm" placeholder="Enter Receiver Name" value={formData.received_by || ''} onChange={e => handleFormChange('received_by', e.target.value)} />
										<Label className="text-sm font-semibold mt-2">Received At</Label>
										<Input type="datetime-local" className="form-input form-input-sm" value={formData.received_at ? formData.received_at.slice(0, 16) : ''} onChange={e => handleFormChange('received_at', e.target.value)} />
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
						{/* Items Table (existing) */}
						<div className="mb-6">
							<div className="flex justify-between items-center mb-2">
								<h3 className="text-lg font-semibold">Items</h3>
								<Button
									className="bg-green-600 hover:bg-green-700 px-3 py-2 rounded text-white shadow-none"
									type="button"
									onClick={() => setSidebarOpen(true)}
								>
									<Plus size={24} />
								</Button>
							</div>
							<div className="overflow-x-auto min-w-0">
								<table className="table-auto table-striped w-full border bg-white dark:bg-gray-900 min-w-[700px]">
									<thead>
										<tr className="bg-gray-100 dark:bg-neutral-800">
											<th className="border px-2 py-1">No</th>
											<th className="border px-2 py-1">Item Name</th>
											<th className="border px-2 py-1 w-[120px]">Ordered Qty</th>
											<th className="border px-2 py-1 w-[120px]">Received Qty</th>
											<th className="border px-2 py-1 w-[120px]">Balance Qty</th>
											<th className="border px-2 py-1 w-[200px]">Remarks</th>
											<th className="border px-2 py-1 w-8"></th>
										</tr>
									</thead>
									<tbody>
										{selectedItems.map((item, index) => (
											<tr key={index} className={item.id === lastAddedId ? 'bg-emerald-200 transition-colors duration-500' : ''}>
												<td className="border px-2 py-0.5 text-center">{index + 1}</td>
												<td className="border px-2 py-0.5">{item.item_name || item.name}</td>
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
																si.id === item.id && si.vendorId === item.vendorId ? { ...si, qty } : si
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
														value={item.receivedQty || 0}
														onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
															const receivedQty = Math.max(0, Number(e.target.value));
															setSelectedItems(prev => prev.map(si =>
																si.id === item.id && si.vendorId === item.vendorId ? { ...si, receivedQty } : si
															));
														}}
													/>
												</td>
												<td className="border px-2 py-0.5 text-center">
													{Math.max(0, (item.qty || 0) - (item.receivedQty || 0))}
												</td>
												<td className="border px-2 py-0.5">
													<Textarea
														className="form-textarea form-textarea-sm w-full border-none px-0"
														placeholder="Remarks"
														rows={1}
														value={item.remarks || ''}
														onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
															const remarks = e.target.value;
															setSelectedItems(prev => prev.map(si =>
																si.id === item.id && si.vendorId === item.vendorId ? { ...si, remarks } : si
															));
														}}
													/>
												</td>
												<td className="border px-2 py-0.5 text-center">
													<Button
														type="button"
														variant="ghost"
														className="text-red-500 hover:text-red-700 px-2 py-1"
														title="Remove item"
														onClick={() => setSelectedItems(prev => prev.filter(si => !(si.id === item.id && si.vendorId === item.vendorId)))}
													>
														<X size={20} />
													</Button>
												</td>
											</tr>
										))}
										<tr>
											<td colSpan={2} className="border px-2 py-1 text-right font-bold">Total</td>
											<td className="border px-2 py-1 text-center font-bold">{selectedItems.reduce((sum, item) => sum + (item.qty || 0), 0)}</td>
											<td className="border px-2 py-1 text-center font-bold">{selectedItems.reduce((sum, item) => sum + (item.receivedQty || 0), 0)}</td>
											<td className="border px-2 py-1 text-center font-bold">{selectedItems.reduce((sum, item) => sum + Math.max(0, (item.qty || 0) - (item.receivedQty || 0)), 0)}</td>
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
				<div className="text-gray-500 text-center py-10">No purchase applications yet.</div>
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

export default Purchase;
