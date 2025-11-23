'use client';
import React, { useEffect, useMemo, useState, useContext } from 'react';
import { authenticatedApi } from '@/config/api';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import MtnBillForm from './mtn-bill-form';
// ActionSidebar removed; using inline form instead
import { CustomDataGrid, ColumnDef } from '@/components/ui/DataGrid';
import { useRouter } from 'next/navigation';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import clsx from 'clsx';
// Removed Recharts chart imports as chart is no longer displayed
import { downloadMaintenanceReport } from './pdfreport-mtn';
import { downloadMaintenanceReportBulk } from './pdfreport-mtn-bulk';
import MtnBillSummary from './mtn-bill-summary';
import { AuthContext } from '@/store/AuthContext';

// Interface for the maintenance bill data based on the provided structure
interface MaintenanceBill {
	inv_id: number;
	inv_no: string | null;
	inv_date: string | null;
	svc_order: string;
	asset: {
		id: number;
		register_number: string;
		fuel_type: string;
		costcenter: {
			id: number;
			name: string;
		} | null;
		location: {
			id: number;
			name: string;
		} | null;
	} | null;
	workshop: {
		id: number;
		name: string;
	} | null;
	svc_date: string | null;
	svc_odo: string | null;
	inv_total: string;
	inv_stat: string | null;
	inv_remarks?: string | null;
	upload_url?: string | null;
	running_no: number;
	// Additional fields for grid convenience
	rowNumber?: number;
	formatted_inv_date?: string;
	formatted_svc_date?: string;
	formatted_inv_total?: string;
	formatted_svc_odo?: string;
	vehicle_search?: string; // Combined register_number and fuel_type for filtering
}

// Add global type for window.reloadMaintenanceBillGrid
declare global {
	interface Window {
		reloadMaintenanceBillGrid?: () => void;
	}
}

const MaintenanceBill: React.FC = () => {
	const [rows, setRows] = useState<any[]>([]);
	const [loading, setLoading] = useState(false);
	const [formLoading, setFormLoading] = useState(false);
	const [selectedRowKeys, setSelectedRowKeys] = useState<Set<string | number>>(new Set());
	const auth = useContext(AuthContext);
	const [showWorkshopAlert, setShowWorkshopAlert] = useState(false);

	// Custom part inputs (for adding items not in catalog)

	// showLatest controls whether we fetch only the current year's records
	const [showLatest, setShowLatest] = useState(true);
	const router = useRouter();

	// Format currency
	const formatCurrency = (amount: string | number) => {
		const num = typeof amount === 'string' ? parseFloat(amount) : amount;
		return new Intl.NumberFormat('en-MY', {
			style: 'currency',
			currency: 'MYR',
			minimumFractionDigits: 2,
		}).format(num);
	};

	// Format date
	const formatDate = (dateString: string) => {
		try {
			return new Date(dateString).toLocaleDateString('en-MY');
		} catch {
			return dateString;
		}
	};

	// Refetch grid data
	const fetchMaintenanceBills = async () => {
		// give immediate visual feedback by clearing existing rows
		// and showing a loading placeholder while the network request runs
		setLoading(true);
		setRows([]);
		try {
			// backend supports optional year filter when showLatest is true
			const yearParam = showLatest ? `?year=${new Date().getFullYear()}` : '';
			const res = await authenticatedApi.get(`/api/bills/mtn${yearParam}`);
			const data = (res.data as { data?: MaintenanceBill[] })?.data || [];
			setRows(data.map((item, idx) => ({
				...item,
				rowNumber: idx + 1,
				formatted_inv_date: item.inv_date ? formatDate(item.inv_date) : 'N/A',
				formatted_svc_date: item.svc_date ? formatDate(item.svc_date) : 'N/A',
				formatted_inv_total: formatCurrency(item.inv_total),
				formatted_svc_odo: item.svc_odo && !isNaN(Number(item.svc_odo)) ? Number(item.svc_odo).toLocaleString() + ' km' : 'N/A',
				// Add searchable vehicle field combining register_number and fuel_type
				vehicle_search: `${item.asset?.register_number || ''} ${item.asset?.fuel_type || ''}`.trim(),
			})));
			setSelectedRowKeys(new Set());
		} catch (err) {
			console.error('Error fetching maintenance bills:', err);
			toast.error('Failed to fetch maintenance bills');
			setRows([]);
		} finally {
			setLoading(false);
		}
	};


	useEffect(() => {
		fetchMaintenanceBills();
	}, []);

	useEffect(() => {
		window.reloadMaintenanceBillGrid = () => {
			fetchMaintenanceBills();
		};
		return () => {
			delete window.reloadMaintenanceBillGrid;
		};
	}, []);

	const columns: ColumnDef<MaintenanceBill & { rowNumber: number }>[] = [
		{
			key: 'rowNumber',
			header: 'No',
			render: (row) => (
				<div className="flex items-center justify-between gap-2 min-w-[60px]">
					<span>{row.rowNumber}</span>
					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger asChild>
								<span
									className="p-1 hover:bg-stone-300 rounded cursor-pointer"
									aria-label="Print Report"
									onClick={async () => {
										try {
											const preparedBy = await getPreparedBy();
											await downloadMaintenanceReport(row.inv_id, preparedBy);
											toast.success('PDF report downloaded successfully');
										} catch (error) {
											console.error('Error downloading PDF:', error);
											toast.error('Failed to download PDF report');
										}
									}}
								>
									<Download size={16} />
								</span>
							</TooltipTrigger>
							<TooltipContent>
								Download maintenance memo
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>
				</div>
			),
		},
		{
			key: 'inv_no',
			header: 'Invoice No',
			filter: 'input',
			render: (row) => (
				<div className="flex flex-col">
					<span className="font-medium">{row.inv_no || 'N/A'}</span>
					<span className="text-xs text-gray-500">ID: {row.inv_id}</span>
				</div>
			)
		},
		{ key: 'formatted_inv_date', header: 'Invoice Date' },
		{
			key: 'vehicle_search' as keyof (MaintenanceBill & { rowNumber: number }),
			header: 'Vehicle',
			filter: 'input',
			render: (row) => (
				<div className="flex flex-col">
					<span className="font-medium">{row.asset?.register_number || 'N/A'}</span>
					<span className="text-xs text-gray-500 capitalize">{row.asset?.fuel_type || 'N/A'}</span>
				</div>
			)
		},
		{ key: 'svc_order', header: 'Service Order', filter: 'input' },
		{
			key: 'workshop',
			header: 'Workshop',
			filter: 'singleSelect',
			render: (row) => (
				<div className="max-w-xs">
					<div className="truncate font-medium" title={row.workshop?.name || 'Unknown Workshop'}>
						{row.workshop?.name || 'Unknown Workshop'}
					</div>
				</div>
			)
		},
		{ key: 'formatted_svc_date', header: 'Service Date' },
		{ key: 'formatted_svc_odo', header: 'Odometer', colClass: 'text-right' },
		{
			key: 'asset.costcenter.name' as keyof (MaintenanceBill & { rowNumber: number }),
			header: 'Cost Center',
			filter: 'singleSelect',
			render: (row) => row.asset?.costcenter?.name || 'N/A'
		},
		{
			key: 'asset.location.name' as keyof (MaintenanceBill & { rowNumber: number }),
			header: 'Location',
			filter: 'singleSelect',
			render: (row) => row.asset?.location?.name || 'N/A'
		},
		{ key: 'formatted_inv_total', header: 'Amount', colClass: 'text-right font-medium text-green-600' },
		{
			key: 'inv_stat',
			header: 'Status',
			filter: 'singleSelect',
			render: (row) => (
				<span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${row.inv_stat === '1'
					? 'bg-green-100 text-green-800'
					: row.inv_stat === '0'
						? 'bg-yellow-100 text-yellow-800'
						: 'bg-gray-100 text-gray-800'
					}`}>
					{row.inv_stat === '1' ? 'Invoiced' : row.inv_stat === '0' ? 'Draft' : 'Unknown'}
				</span>
			)
		},
	];

	// ----- Inline Form State -----
	const [selectedRow, setSelectedRow] = useState<(MaintenanceBill & { rowNumber?: number }) | null>(null);
	const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
	const [bulkDownloading, setBulkDownloading] = useState(false);

	// Basic form data for editing invoice
	const [formData, setFormData] = useState({
		inv_no: '',
		inv_date: '',
		svc_odo: '',
		svc_date: '',
		inv_remarks: '',
	});

	// Validation placeholders (unique invoice validation not implemented here)
	const [isInvoiceValid, setIsInvoiceValid] = useState(true);
	const [isValidatingInvoice, setIsValidatingInvoice] = useState(false);
	const [validationMessage, setValidationMessage] = useState('');

	// Parts management state
	const [selectedParts, setSelectedParts] = useState<any[]>([]);
	const [newlyAddedCustomId, setNewlyAddedCustomId] = useState<number | null>(null);

	// Parts catalogs (optional; will stay empty unless wired to a real endpoint)
	type PartCategory = { svcTypeId?: number; svcType: string };
	const [partSearch, setPartSearch] = useState('');
	const [partCategory, setPartCategory] = useState<string | number>('all');
	const [partCategories, setPartCategories] = useState<PartCategory[]>([]);
	const [availableParts, setAvailableParts] = useState<any[]>([]);
	const [partsLoading, setPartsLoading] = useState(false);
	const [partsHasMore, setPartsHasMore] = useState(false);
	const [partsPage, setPartsPage] = useState(1);

	// Filter parts list based on search and category
	const filteredParts = useMemo(() => {
		let list = availableParts;
		if (partCategory !== 'all') {
			list = list.filter(p => String(p.part_category?.svcTypeId || p.part_category?.id || '') === String(partCategory));
		}
		if (partSearch.trim()) {
			const q = partSearch.trim().toLowerCase();
			list = list.filter(p => String(p.part_name || '').toLowerCase().includes(q));
		}
		return list;
	}, [availableParts, partSearch, partCategory]);

	// Fetch categories lazily when form is opened the first time
	useEffect(() => {
		const fetchCategories = async () => {
			try {
				const res = await authenticatedApi.get('/api/mtn/types');
				const raw = (res as any)?.data;
				const list = (raw && typeof raw === 'object' && 'data' in raw) ? (raw as any).data : raw;
				if (Array.isArray(list)) {
					const mapped = list.map((it: any) => ({ svcTypeId: it.svcTypeId ?? it.id, svcType: it.svcType ?? it.name })).filter((v: any) => v.svcTypeId && v.svcType);
					setPartCategories(mapped);
				}
			} catch (e) {
				// Silently ignore; catalogs are optional for this inline edit
			}
		};
		if (selectedRow && partCategories.length === 0) {
			fetchCategories();
		}
	}, [selectedRow, partCategories.length]);

	// Parts helpers expected by MtnBillForm
	const removePart = (autopart_id: number) => {
		setSelectedParts(prev => prev.filter(p => p.autopart_id !== autopart_id));
	};
	const updatePartQty = (autopart_id: number, qty: number) => {
		setSelectedParts(prev => prev.map(p => p.autopart_id === autopart_id ? { ...p, qty } : p));
	};
	const updatePartUnitPrice = (autopart_id: number, unitPrice: string) => {
		setSelectedParts(prev => prev.map(p => p.autopart_id === autopart_id ? { ...p, part_uprice: unitPrice } : p));
	};
	const updatePartName = (autopart_id: number, newName: string) => {
		setSelectedParts(prev => prev.map(p => p.autopart_id === autopart_id ? { ...p, part_name: newName } : p));
	};
	const addPart = (part: any) => {
		const incomingId = part?.autopart_id ?? part?.id ?? null;
		const incomingName = String(part?.part_name ?? part?.name ?? '').trim().toLowerCase();
		const incomingPrice = part?.part_uprice ?? part?.unit_price ?? part?.price;

		setSelectedParts(prev => {
			// 1) Try to merge by ID if present
			if (incomingId !== null && incomingId !== undefined) {
				const idx = prev.findIndex(p => (p?.autopart_id ?? p?.id) === incomingId);
				if (idx !== -1) {
					const copy = [...prev];
					const currentQty = Number(copy[idx].qty ?? 0) || 0;
					const updated: any = { ...copy[idx], qty: currentQty + 1 };
					if (incomingPrice != null && incomingPrice !== '') {
						updated.part_uprice = String(incomingPrice);
					}
					copy[idx] = updated;
					return copy;
				}
			}

			// 2) Fallback: merge by normalized name when ID is missing
			if (incomingName) {
				const idxByName = prev.findIndex(p => String(p?.part_name ?? p?.name ?? '').trim().toLowerCase() === incomingName);
				if (idxByName !== -1) {
					const copy = [...prev];
					const currentQty = Number(copy[idxByName].qty ?? 0) || 0;
					const updated: any = { ...copy[idxByName], qty: currentQty + 1 };
					if (incomingPrice != null && incomingPrice !== '') {
						updated.part_uprice = String(incomingPrice);
					}
					copy[idxByName] = updated;
					return copy;
				}
			}

			// 3) Otherwise add as new part
			const newPart = {
				autopart_id: incomingId ?? (Date.now() * -1),
				part_name: part?.part_name ?? part?.name ?? '',
				qty: part?.qty ?? 1,
				part_uprice: String(incomingPrice ?? '0.00'),
				part_category: part?.part_category ?? undefined,
			};
			return [...prev, newPart];
		});
	};
	const addCustomPart = () => {
		const id = Date.now() * -1; // temporary negative id
		const custom = { autopart_id: id, part_name: '', qty: 1, part_uprice: '0.00' };
		setSelectedParts(prev => [...prev, custom]);
		setNewlyAddedCustomId(id);
		setTimeout(() => setNewlyAddedCustomId(null), 1500);
	};

	// Dummy paginated fetch for parts list (keep empty unless wired)
	const fetchParts = async (_args?: any) => {
		setPartsLoading(true);
		try {
			// If a real endpoint exists, wire it here. For now, no-op.
			setPartsHasMore(false);
			setPartsPage((p) => p);
			return { data: [] } as any;
		} finally {
			setPartsLoading(false);
		}
	};

	// Submit handler -> PUT /api/bills/mtn/{inv_id}
	const handleFormSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!selectedRow?.inv_id) {
			toast.error('Missing invoice ID');
			return;
		}

		try {
			// Basic validation
			if (!formData.inv_no || !formData.inv_date) {
				toast.error('Please fill Invoice No and Invoice Date');
				return;
			}

			// Build parts array in expected shape
			const invIdNum = Number(selectedRow.inv_id);
			const partsPayload = (selectedParts || []).map((p) => {
				const qty = Number(p.qty || 0) || 0;
				const unit = Number(parseFloat(String(p.part_uprice || '0'))) || 0;
				const amount = qty * unit;
				return {
					autopart_id: Number(p.autopart_id ?? p.id ?? 0),
					inv_id: invIdNum,
					part_qty: qty,
					part_uprice: Number(unit.toFixed(2)),
					part_final_amount: Number(amount.toFixed(2)),
				};
			});

			const invTotal = partsPayload.reduce((sum, p) => sum + (Number(p.part_final_amount) || 0), 0);

			const fd = new FormData();
			fd.append('inv_no', String(formData.inv_no).trim());
			fd.append('inv_date', formData.inv_date || '');
			fd.append('svc_date', formData.svc_date || '');
			fd.append('svc_odo', String(Number(formData.svc_odo || 0)));
			fd.append('inv_remarks', formData.inv_remarks || '');
			fd.append('inv_total', String(Number(invTotal.toFixed(2))));
			if (attachmentFile) fd.append('upload', attachmentFile);
			fd.append('parts', JSON.stringify(partsPayload));

			await authenticatedApi.put(`/api/bills/mtn/${invIdNum}`, fd, {
				headers: { 'Content-Type': 'multipart/form-data' },
			});

			toast.success('Maintenance invoice saved.');
			closeForm();
			await fetchMaintenanceBills();
		} catch (err) {
			console.error('Failed to save maintenance invoice', err);
			toast.error('Failed to save maintenance invoice');
		}
	};

	// Row double-click -> open inline form; detail will be fetched by the form
	const handleRowDoubleClick = async (row: MaintenanceBill & { rowNumber: number }) => {
		setSelectedRow(row);
	};

	const getPreparedBy = async () => {
		const fallbackName = auth?.authData?.user?.name || undefined;
		const fallbackTitle = auth?.authData?.user?.profile?.job || auth?.authData?.user?.role?.name || undefined;
		const username = auth?.authData?.user?.username || '';
		if (!username) return { preparedByName: fallbackName, preparedByTitle: fallbackTitle };

		try {
			const res = await authenticatedApi.get('/api/assets/employees', {
				params: { ramco: username },
			});
			const data = (res as any)?.data?.data;
			if (Array.isArray(data) && data.length > 0) {
				const first = data[0];
				const preparedByName = first?.full_name || fallbackName;
				const preparedByTitle = first?.position?.name || fallbackTitle;
				return { preparedByName, preparedByTitle };
			}
		} catch (e) {
			// fallback to auth context values on failure
		}
		return { preparedByName: fallbackName, preparedByTitle: fallbackTitle };
	};

	const handleExportSelected = async () => {
		const ids = rows
			.filter(r => selectedRowKeys.has(r.inv_id))
			.map(r => r.inv_id)
			.filter(Boolean);
		const selectedRows = rows.filter(r => selectedRowKeys.has(r.inv_id));

		if (ids.length === 0) {
			toast.error('Select at least one invoice to download.');
			return;
		}

		// Enforce single-workshop rule for bulk memo
		if (ids.length > 1) {
			const workshops = new Set(
				selectedRows
					.map(r => r.workshop?.id || r.workshop?.name || '')
					.filter(Boolean)
			);
			if (workshops.size > 1) {
				setShowWorkshopAlert(true);
				return;
			}
		}

		setBulkDownloading(true);
		try {
			const preparedBy = await getPreparedBy();
			if (ids.length === 1) {
				await downloadMaintenanceReport(ids[0], preparedBy);
			} else {
				await downloadMaintenanceReportBulk(ids, preparedBy);
			}
			toast.success(`Downloaded ${ids.length} invoice${ids.length > 1 ? 's' : ''}.`);
		} catch (e) {
			console.error('Maintenance report download failed', e);
			toast.error('Failed to download selected invoices.');
		} finally {
			setBulkDownloading(false);
		}
	};

	const closeForm = () => {
		setSelectedRow(null);
		setAttachmentFile(null);
		setSelectedParts([]);
		setFormData({ inv_no: '', inv_date: '', svc_odo: '', svc_date: '', inv_remarks: '' });
		setValidationMessage('');
		setIsInvoiceValid(true);
		setIsValidatingInvoice(false);
	};

	return (
		<div>
			{/* Summary Accordion - hidden while editing */}
			{!selectedRow && (
				<div className="mb-4">
					<MtnBillSummary />
				</div>
			)}
			{/* Data Grid */}
			{!selectedRow && (
				<div className="border rounded-md">
					<div className="flex items-center justify-between px-3 py-2 border-b bg-muted/60">
						<h2 className="text-sm font-semibold">Maintenance Invoices</h2>
						<div className="flex items-center gap-2">
							{selectedRowKeys.size > 1 && (() => {
								const selected = rows.filter(r => selectedRowKeys.has(r.inv_id));
								const workshopSet = new Set(selected.map(r => r.workshop?.id || r.workshop?.name || '').filter(Boolean));
								if (workshopSet.size > 1) {
									return (
										<span className="text-xs text-red-600">
											Select invoices from the same workshop to export in bulk.
										</span>
									);
								}
								return null;
							})()}
							<Button
								size="sm"
								variant="outline"
								disabled={bulkDownloading || selectedRowKeys.size === 0 || (selectedRowKeys.size > 1 && (() => {
									const selected = rows.filter(r => selectedRowKeys.has(r.inv_id));
									const workshopSet = new Set(selected.map(r => r.workshop?.id || r.workshop?.name || '').filter(Boolean));
									return workshopSet.size > 1;
								})())}
								onClick={handleExportSelected}
							>
								{bulkDownloading ? (
									<>
										<Loader2 className="h-4 w-4 animate-spin mr-2" /> Downloading...
									</>
								) : (
									<>
										<Download size={16} className="mr-2" />
										Download Selected ({selectedRowKeys.size})
									</>
								)}
							</Button>
						</div>
					</div>
					{loading ? (
						<div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
							<Loader2 className="h-4 w-4 animate-spin" /> Loading maintenance invoices...
						</div>
					) : (
						<CustomDataGrid
							columns={columns as ColumnDef<unknown>[]}
							data={rows}
							pagination={false}
							inputFilter={false}
							theme="sm"
							dataExport={false}
							onRowDoubleClick={handleRowDoubleClick as any}
							rowSelection={{
								enabled: true,
								getRowId: (row: MaintenanceBill) => row.inv_id,
								onSelect: (keys) => setSelectedRowKeys(new Set(keys)),
							}}
							selectedRowKeys={selectedRowKeys}
							setSelectedRowKeys={setSelectedRowKeys}
						/>
					)}
				</div>
			)}

			{/* Inline Edit Form */}
			{selectedRow && (
				<div className="mt-2">
					{formLoading ? (
						<div className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
							<Loader2 className="h-4 w-4 animate-spin" /> Loading invoice detail...
						</div>
					) : (
						<MtnBillForm
							title={`Maintenance (Edit) ${selectedRow.inv_no ? `- ${selectedRow.inv_no}` : ''}`}
							onClose={closeForm}
							selectedRow={selectedRow}
							formData={formData}
							setFormData={setFormData}
							isInvoiceValid={isInvoiceValid}
							isValidatingInvoice={isValidatingInvoice}
							validationMessage={validationMessage}
							handleFormSubmit={handleFormSubmit}
							attachmentFile={attachmentFile}
							setAttachmentFile={setAttachmentFile}
							selectedParts={selectedParts}
							setSelectedParts={setSelectedParts}
							newlyAddedCustomId={newlyAddedCustomId}
							formatCurrency={formatCurrency}
							removePart={removePart}
							updatePartQty={updatePartQty}
							updatePartUnitPrice={updatePartUnitPrice}
							updatePartName={updatePartName}
							addPart={addPart}
							addCustomPart={addCustomPart}
							partSearch={partSearch}
							setPartSearch={setPartSearch}
							partCategory={partCategory}
							setPartCategory={setPartCategory}
							partCategories={partCategories}
							filteredParts={filteredParts}
							partsLoading={partsLoading}
							partsHasMore={partsHasMore}
							partsPage={partsPage}
							fetchParts={fetchParts}
							onPrev={() => {
								const idx = rows.findIndex(r => r.inv_id === selectedRow.inv_id);
								if (idx > 0) {
									const target = rows[idx - 1];
									setSelectedRow(target);
								}
							}}
							onNext={() => {
								const idx = rows.findIndex(r => r.inv_id === selectedRow.inv_id);
								if (idx >= 0 && idx < rows.length - 1) {
									const target = rows[idx + 1];
									setSelectedRow(target);
								}
							}}
							canPrev={(() => { const i = rows.findIndex(r => r.inv_id === selectedRow.inv_id); return i > 0; })()}
							canNext={(() => { const i = rows.findIndex(r => r.inv_id === selectedRow.inv_id); return i >= 0 && i < rows.length - 1; })()}
						/>
					)}
				</div>
			)}
		</div>
	);
};

export default MaintenanceBill;
