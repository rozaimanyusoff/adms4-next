'use client';
import React, { useState } from 'react';
import { CustomDataGrid } from '@components/layouts/ui/DataGrid';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faPlusCircle } from '@fortawesome/free-solid-svg-icons';
import ActionSidebar from '@/components/layouts/ui/ActionSidebar';
import SidebarItemPicker from './item-cart';

const vendors = [
	{ id: 1, name: 'Vendor A' },
	{ id: 2, name: 'Vendor B' },
	{ id: 3, name: 'Vendor C' },
];

const Purchase: React.FC = () => {
	const [showForm, setShowForm] = useState(false);
	const [sidebarOpen, setSidebarOpen] = useState(false);
	const [selectedItems, setSelectedItems] = useState<any[]>([]);
	const [lastAddedId, setLastAddedId] = useState<number | null>(null);

	// Simulate cartItems (should be replaced with real data)
	let cartItems: any[] = [];
	try {
		cartItems = require('./cartItems.json');
	} catch { }

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

	// Example applications state (replace with real data/fetch in production)
	const [applications, setApplications] = useState([
		{
			id: 'PA-20240520-001',
			items: [
				{ name: 'Printer', qty: 2, vendor: 'Vendor A' },
				{ name: 'Monitor', qty: 1, vendor: 'Vendor B' },
			],
			status: 'Pending',
			date: '2025-05-20',
		},
		{
			id: 'PA-20240520-002',
			items: [
				{ name: 'Keyboard', qty: 5, vendor: 'Vendor C' },
			],
			status: 'Approved',
			date: '2025-05-19',
		},
	]);

	return (
		<div className="bg-white dark:bg-neutral-900 rounded shadow p-4 mb-6">
			<div className="flex justify-between items-center mb-4">
				<h2 className="text-xl font-semibold">Purchase Applications</h2>
				<button
					className="px-4 py-2 bg-primary text-white rounded"
					onClick={() => setShowForm(v => !v)}
				>
					{showForm ? 'Close Form' : 'Create Purchase Application'}
				</button>
			</div>
			{showForm && (
				<div className="mb-6">
					<div className="bg-gray-50 dark:bg-neutral-800 p-4 rounded border mb-4">
						<h2 className="text-lg text-center font-bold mb-6">Purchase Request Form</h2>
						{/* New: Form header fields */}
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
							<div className="flex flex-col gap-2">
								<label className="text-sm font-semibold">Request No.</label>
								<input type="text" className="form-input form-input-sm" value={"AUTO-20250520-001"} readOnly />
								<label className="text-sm font-semibold mt-2">Name</label>
								<input type="text" className="form-input form-input-sm" placeholder="Enter name" />
							</div>
							<div className="flex flex-col gap-2">
								<label className="text-sm font-semibold">Date</label>
								<input type="date" className="form-input form-input-sm" value={new Date().toISOString().slice(0,10)} readOnly />
								<label className="text-sm font-semibold mt-2">Requestor ID</label>
								<input type="text" className="form-input form-input-sm" placeholder="Enter requestor ID" />
							</div>
						</div>
						<div className="mb-4">
							<div className="flex justify-between items-center mb-2">
								<span className="font-semibold">Items</span>
								<button
									className="bg-green-600 hover:bg-green-700 px-3 py-2 rounded text-white shadow-none"
									type="button"
									onClick={() => setSidebarOpen(true)}
								>
									<FontAwesomeIcon icon={faPlus} size='lg' />
								</button>
							</div>
							<table className="table-auto table-striped w-full border bg-white dark:bg-gray-900">
								<thead>
									<tr className="bg-gray-100 dark:bg-neutral-800">
										<th className="border px-2 py-1">No</th>
										<th className="border px-2 py-1">Item Name</th>
										<th className="border px-2 py-1">Vendor</th>
										<th className="border px-2 py-1">Serial No</th>
										<th className="border px-2 py-1">Qty</th>
										<th className="border px-2 py-1">Remarks</th>
										<th className="border px-2 py-1 w-8"></th>
									</tr>
								</thead>
								<tbody>
									{selectedItems.map((item, index) => (
										<tr key={index} className={item.id === lastAddedId ? 'bg-emerald-200 transition-colors duration-500' : ''}>
											<td className="border px-2 py-0.5 text-center">{index + 1}</td>
											<td className="border px-2 py-0.5">{item.name}</td>
											<td className="border px-2 py-0.5">
												<select
													className="form-select form-select-sm w-full border-none px-0"
													value={item.vendorId}
													onChange={e => {
														const vendorId = Number(e.target.value);
														setSelectedItems(prev => prev.map(si =>
															si.id === item.id && si.vendorId === item.vendorId ? { ...si, vendorId } : si
														));
													}}
												>
													{vendors.map(v => (
														<option key={v.id} value={v.id}>{v.name}</option>
													))}
												</select>
											</td>
											<td className="border px-2 py-0.5">
												<input
													type="text"
													className="form-input form-input-sm w-full rounded-none border-none px-0"
													placeholder="Serial No"
													value={item.serialNo || ''}
													onChange={e => {
														const serialNo = e.target.value;
														setSelectedItems(prev => prev.map(si =>
															si.id === item.id && si.vendorId === item.vendorId ? { ...si, serialNo } : si
														));
													}}
												/>
											</td>
											<td className="border px-2 py-0.5">
												<input
													type="number"
													min={1}
													className="form-input form-input-sm w-full text-center border-none px-0"
													placeholder='0'
													value={item.qty}
													onChange={e => {
														const qty = Math.max(1, Number(e.target.value));
														setSelectedItems(prev => prev.map(si =>
															si.id === item.id && si.vendorId === item.vendorId ? { ...si, qty } : si
														));
													}}
												/>
											</td>
											<td className="border px-2 py-0.5">
												<textarea
													className="form-textarea form-textarea-sm w-full border-none px-0"
													placeholder="Remarks"
													rows={1}
													value={item.remarks || ''}
													onChange={e => {
														const remarks = e.target.value;
														setSelectedItems(prev => prev.map(si =>
															si.id === item.id && si.vendorId === item.vendorId ? { ...si, remarks } : si
														));
													}}
												/>
											</td>
											<td className="border px-2 py-0.5 text-center">
												<button
													type="button"
													className="text-red-500 hover:text-red-700 px-2 py-1"
													title="Remove item"
													onClick={() => setSelectedItems(prev => prev.filter(si => !(si.id === item.id && si.vendorId === item.vendorId)))}
												>
													<FontAwesomeIcon icon={faPlusCircle} className="rotate-45" size='xl' />
												</button>
											</td>
										</tr>
									))}
									<tr>
										<td colSpan={4} className="border px-2 py-1 text-right font-bold">Total</td>
										<td className="border px-2 py-1 text-center font-bold">{selectedItems.reduce((sum, item) => sum + (item.qty || 0), 0)}</td>
										<td className="border px-2 py-1" colSpan={2}></td>
									</tr>
								</tbody>
							</table>
						</div>
						{/* ActionSidebar for adding items */}
						{sidebarOpen && (
							<ActionSidebar
								title="Item Cart"
								onClose={() => setSidebarOpen(false)}
								size="md"
								content={
									<SidebarItemPicker
										cartItems={cartItems}
										selectedItems={selectedItems}
										onAdd={handleSidebarAdd}
									/>
								}
							/>
						)}
						{/* Buttons */}
						<div className="flex justify-center gap-4 mt-6">
							<button className="btn bg-amber-500 hover:bg-amber-600 text-dark-light px-4 py-2 rounded shadow-none">Save Draft</button>
							<button className="btn bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded shadow-none">Submit</button>
							<button className="btn bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded shadow-none" onClick={() => setShowForm(false)}>Cancel</button>
						</div>
					</div>
				</div>
			)}
			{/* Table of applications */}
				{!showForm && (applications.length === 0 ? (
				<div className="text-gray-500 text-center py-10">No purchase applications yet.</div>
			) : (
				<CustomDataGrid
					data={applications.map(app => ({ ...app, quantity: app.items.reduce((sum, i) => sum + i.qty, 0) }))}
					columns={[
						{
							key: 'id',
							header: 'ID',
							sortable: true,
						},
						{
							key: 'items',
							header: 'Items',
							render: (row) => (
								<span>
									{row.items[0].name}
									{row.items.length > 1 && (
										<span className="text-xs text-gray-500"> +{row.items.length - 1} more</span>
									)}
								</span>
							),
						},
						{
							key: 'quantity',
							header: 'Quantity',
							render: (row) => row.quantity,
						},
						{
							key: 'status',
							header: 'Status',
							sortable: true,
							render: (row) => (
								<span className={
									row.status === 'Approved'
										? 'text-green-600 font-semibold'
									: row.status === 'Rejected'
										? 'text-red-600 font-semibold'
										: 'text-amber-600 font-semibold'
								}>{row.status}</span>
							),
						},
						{
							key: 'date',
							header: 'Date',
							sortable: true,
						},
					]}
					pageSize={10}
					pagination={true}
					inputFilter={true}
					columnsVisibleOption={true}
					rowClass={row => ''}
					rowSelection={undefined}
					rowExpandable={undefined}
				/>
			))}
		</div>
	);
};

export default Purchase;
