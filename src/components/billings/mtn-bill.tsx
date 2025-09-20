'use client';
import React, { useEffect, useState } from 'react';
import { authenticatedApi } from '@/config/api';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { Plus, X, Loader2, FileText, Package } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ActionSidebar from '@/components/ui/action-aside';
import { CustomDataGrid, ColumnDef } from '@/components/ui/DataGrid';
import { useRouter } from 'next/navigation';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import clsx from 'clsx';
import { downloadMaintenanceReport } from './pdfreport-mtn';

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
	const [showAside, setShowAside] = useState(false);
	const [selectedRow, setSelectedRow] = useState<any | null>(null);
	const [partsList, setPartsList] = useState<any[]>([]);
	const [partSearch, setPartSearch] = useState('');
	const [partCategory, setPartCategory] = useState<string | number>('all');
	const [partsPage, setPartsPage] = useState(1);
	const [partsHasMore, setPartsHasMore] = useState(true);
	const [partsLoading, setPartsLoading] = useState(false);
	const [newlyAddedCustomId, setNewlyAddedCustomId] = useState<number | null>(null);

	// Form state for maintenance bill editing
	const [formData, setFormData] = useState({
		inv_no: '',
		inv_date: '',
		svc_odo: '',
		svc_date: '',
		inv_remarks: ''
	});
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [attachmentFile, setAttachmentFile] = useState<File | null>(null);

	// Load more parts when search term changes (to ensure we have enough data for filtering)
	useEffect(() => {
		if (partSearch && partSearch.trim().length >= 2) {
			// Load additional parts to ensure comprehensive search results
			fetchParts({ page: 1, per_page: 100, q: partSearch, category: partCategory === 'all' ? undefined : partCategory });
		}
	}, [partSearch, partCategory]);

	// When category changes, refresh the paginated parts list (if aside open)
	useEffect(() => {
		if (showAside) {
			fetchParts({ page: 1, per_page: 50, category: partCategory === 'all' ? undefined : partCategory });
		}
	}, [partCategory]);
	const [partCategories, setPartCategories] = useState<Array<{ svcTypeId?: number; svcType: string }>>([]);
	const [selectedParts, setSelectedParts] = useState<any[]>([]);
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

	// Fetch parts with server-side pagination and optional query/category
	const fetchParts = async ({ page = 1, per_page = 50, q, category }: { page?: number; per_page?: number; q?: string; category?: string | number } = {}) => {
		setPartsLoading(true);
		try {
			const params: any = { page, per_page };
			if (q) params.q = q;
			if (category && category !== 'all') params.category = category;

			const res = await authenticatedApi.get('/api/bills/mtn/parts', { params });
			// Expecting { data: [...], meta: { page, per_page, total, total_pages } }
			const apiData = (res.data as any) || {};
			const data = apiData.data || [];
			const meta = apiData.meta || {};

			// If requesting first page, replace list; otherwise append
			if (page === 1) setPartsList(data);
			else setPartsList(prev => [...prev, ...data]);

			// extract unique categories from returned data (merge with existing)
			const cats: Record<number, string> = {};
			(apiData.data || []).forEach((p: any) => {
				const cat = p.part_category;
				if (cat && cat.svcTypeId) cats[cat.svcTypeId] = cat.svcType;
			});
			// merge with existing categories
			const mergedCats = { ...partCategories.reduce((acc: any, c) => (c.svcTypeId ? (acc[c.svcTypeId] = c.svcType, acc) : acc), {}), ...cats };
			setPartCategories(Object.keys(mergedCats).map(k => ({ svcTypeId: Number(k), svcType: mergedCats[Number(k)] })));

			// determine if there's more pages
			if (meta.total_pages) setPartsHasMore(page < meta.total_pages);
			else setPartsHasMore((data || []).length >= per_page);

			setPartsPage(page);
			return { data, meta };
		} catch (err) {
			console.error('Error fetching parts:', err);
			if (page === 1) setPartsList([]);
			setPartsHasMore(false);
			return { data: [], meta: {} };
		} finally {
			setPartsLoading(false);
		}
	};

	// Filter parts by category and search term (client-side filtering)
	const filteredParts = (() => {
		// Start with all loaded parts
		let parts = partsList;

		// Apply category filter
		if (partCategory !== 'all') {
			parts = parts.filter(p => p.part_category?.svcTypeId === Number(partCategory));
		}

		// Apply search filter if there's a search term
		if (partSearch && partSearch.trim().length > 0) {
			const searchTerm = partSearch.toLowerCase().trim();
			parts = parts.filter(p =>
				p.part_name?.toLowerCase().includes(searchTerm) ||
				p.part_category?.svcType?.toLowerCase().includes(searchTerm)
			);
		}

		return parts;
	})();

	const handleRowDoubleClick = async (row: MaintenanceBill & { rowNumber: number }) => {
		// toggle aside: if already open for the same row, close it
		if (showAside && selectedRow?.inv_id === row.inv_id) {
			closeAside();
			return;
		}

		// open the action-aside and fetch related data (parts and maintenance detail)
		setShowAside(true);
		// load first page of parts list so we can enrich incoming parts with catalog data
		await fetchParts({ page: 1, per_page: 50, category: partCategory === 'all' ? undefined : partCategory });

		try {
			// fetch maintenance detail by inv_id and populate form + selectedParts
			const res = await authenticatedApi.get(`/api/bills/mtn/${row.inv_id}`);
			const payload = (res.data as any)?.data || null;
			if (payload) {
				// set the selectedRow to the full payload (useful to pre-fill form values)
				setSelectedRow(payload);

				// Populate form data
				setFormData({
					inv_no: payload.inv_no || '',
					inv_date: payload.inv_date ? new Date(payload.inv_date).toISOString().slice(0, 10) : '',
					svc_odo: payload.svc_odo || '',
					svc_date: payload.svc_date ? new Date(payload.svc_date).toISOString().slice(0, 10) : '',
					inv_remarks: payload.inv_remarks || ''
				});

				// map incoming parts to the shape we use for selectedParts
				const incomingParts = Array.isArray(payload.parts) ? payload.parts : [];
				const mapped = incomingParts.map((pt: any) => {
					// try to enrich the incoming part with data from the partsList (if available)
					const match = partsList.find(p => p.autopart_id === pt.autopart_id);
					return {
						autopart_id: pt.autopart_id,
						part_id: pt.part_id,
						// prefer explicit name from payload, else fall back to catalog match, else a visible fallback
						part_name: match?.part_name || match?.name || pt.part_name || pt.name || `Part ${pt.autopart_id ?? pt.part_id ?? 'N/A'}`,
						qty: pt.part_qty ?? pt.qty ?? 1,
						part_uprice: pt.part_uprice ?? pt.unit_price ?? match?.part_uprice ?? match?.unit_price ?? '0.00',
						part_amount: pt.part_final_amount ?? pt.part_amount ?? pt.amount ?? '0.00',
					};
				});

				// Debug: log what we mapped
				console.debug('Mapped maintenance parts ->', mapped);

				// Always attempt enrichment for better part names, regardless of current state
				try {
					const ids = mapped.map((m: any) => m.autopart_id).filter(Boolean);
					if (ids.length) {
						const res = await authenticatedApi.get('/api/bills/mtn/parts', { params: { ids: ids.join(',') } });
						const enrich = (res.data as any)?.data || [];
						console.debug('Enrichment data received:', enrich);
						const enriched = mapped.map((m: any) => {
							const match = enrich.find((e: any) => e.autopart_id === m.autopart_id);
							if (match) {
								return {
									...m,
									part_name: match.part_name || match.name || m.part_name,
									part_uprice: m.part_uprice === '0.00' ? (match.part_uprice || match.unit_price || m.part_uprice) : m.part_uprice
								};
							}
							return m;
						});
						console.debug('Enriched parts:', enriched);
						setSelectedParts(enriched);
					} else {
						setSelectedParts(mapped);
					}
				} catch (e) {
					console.debug('Batch enrich failed, using mapped data:', e);
					setSelectedParts(mapped);
				}
			} else {
				setSelectedRow(row || null);
				setSelectedParts([]);
			}
		} catch (err) {
			console.error('Error fetching maintenance detail:', err);
			// fallback: set basic selected row so aside still opens
			setSelectedRow(row || null);
			setSelectedParts([]);
			toast.error('Failed to fetch maintenance detail');
		}
	};

	const closeAside = () => {
		setShowAside(false);
		setSelectedRow(null);
		setSelectedParts([]);
		setAttachmentFile(null); // Reset attachment
		// Reset form data
		setFormData({
			inv_no: '',
			inv_date: '',
			svc_odo: '',
			svc_date: '',
			inv_remarks: ''
		});
	};

	const addPart = (part: any) => {
		// avoid duplicates by autopart_id
		if (!selectedParts.find(p => p.autopart_id === part.autopart_id)) {
			setSelectedParts(prev => [...prev, { ...part, qty: 1 }]);
			toast.success('Part added');
		} else {
			toast('Part already added');
		}
	};

	const addCustomPart = () => {
		// generate a temporary negative autopart_id to avoid colliding with catalog ids
		const tempId = -Date.now();
		const newPart = {
			autopart_id: tempId,
			part_id: null,
			part_name: 'New Item', // Default name that can be edited inline
			qty: 1, // Default quantity
			part_uprice: '0.00', // Default price with masking
			is_custom: true,
		};

		setSelectedParts(prev => [...prev, newPart]);
		// Highlight the newly added row
		setNewlyAddedCustomId(tempId);
		// Remove highlight after 3 seconds
		setTimeout(() => setNewlyAddedCustomId(null), 3000);
	};

	const removePart = (autopart_id: number) => {
		setSelectedParts(prev => prev.filter(p => p.autopart_id !== autopart_id));
		// Clear highlight if the removed item was highlighted
		if (newlyAddedCustomId === autopart_id) {
			setNewlyAddedCustomId(null);
		}
	};

	const updatePartQty = (autopart_id: number, qty: number) => {
		setSelectedParts(prev => prev.map(p =>
			p.autopart_id === autopart_id ? { ...p, qty: qty } : p
		));
	};

	const updatePartUnitPrice = (autopart_id: number, unitPrice: string) => {
		setSelectedParts(prev => prev.map(p =>
			p.autopart_id === autopart_id ? { ...p, part_uprice: unitPrice } : p
		));
	};

	const updatePartName = (autopart_id: number, newName: string) => {
		setSelectedParts(prev => prev.map(p =>
			p.autopart_id === autopart_id ? { ...p, part_name: newName } : p
		));
	};

	// Form submission handler
	const handleFormSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!selectedRow?.inv_id) {
			toast.error('No invoice selected for update');
			return;
		}

		setIsSubmitting(true);

		try {
			// Calculate total amount from all service items
			const totalAmount = selectedParts.reduce((total, part) => {
				const unitPrice = parseFloat(part.part_uprice || '0');
				const qty = part.qty || 1;
				return total + (unitPrice * qty);
			}, 0);

			// Prepare the data
			const data = {
				inv_no: formData.inv_no,
				inv_date: formData.inv_date,
				svc_odo: formData.svc_odo,
				svc_date: formData.svc_date,
				inv_remarks: formData.inv_remarks,
				inv_total: totalAmount.toFixed(2),
				inv_stat: "1", // "1" = invoiced (workshop has issued the invoice)
				parts: selectedParts.map(part => ({
					autopart_id: part.autopart_id,
					part_id: part.part_id,
					part_name: part.part_name,
					part_qty: part.qty,
					part_uprice: part.part_uprice,
					part_amount: (parseFloat(part.part_uprice || '0') * (part.qty || 1)).toFixed(2),
					is_custom: part.is_custom || false
				}))
			};

			let payload;
			let config = {};

			// Debug logging
			console.log('Attachment file:', attachmentFile);
			console.log('Has attachment file:', !!attachmentFile);
			console.log('File details:', attachmentFile ? {
				name: attachmentFile.name,
				size: attachmentFile.size,
				type: attachmentFile.type
			} : 'No file');

			if (attachmentFile && attachmentFile instanceof File) {
				// Use FormData when there's a file attachment
				console.log('Creating FormData payload...');
				payload = new FormData();
				
				// Append all form fields
				payload.append('inv_no', data.inv_no);
				payload.append('inv_date', data.inv_date);
				payload.append('svc_odo', data.svc_odo);
				payload.append('svc_date', data.svc_date);
				payload.append('inv_remarks', data.inv_remarks || '');
				payload.append('inv_total', data.inv_total);
				payload.append('inv_stat', data.inv_stat);
				
				// Append the file
				payload.append('attachment', attachmentFile);
				
				// Append parts as JSON string
				payload.append('parts', JSON.stringify(data.parts));
				
				// IMPORTANT: Delete Content-Type to let browser set multipart/form-data
				config = {
					headers: {
						'Content-Type': undefined
					}
				};
				
				console.log('FormData created with file:', attachmentFile.name);
			} else {
				// Use JSON payload when no file attachment
				console.log('Creating JSON payload...');
				payload = data;
				config = {
					headers: {
						'Content-Type': 'application/json'
					}
				};
			}

			console.log('Final payload type:', payload instanceof FormData ? 'FormData' : 'JSON');
			console.log('Final config:', config);

			// Submit the update
			await authenticatedApi.put(`/api/bills/mtn/${selectedRow.inv_id}`, payload, config);

			toast.success('Maintenance bill updated successfully');

			// Close the sidebar and reload the data grid
			setShowAside(false);
			setSelectedRow(null);
			fetchMaintenanceBills();

		} catch (error) {
			console.error('Error updating maintenance bill:', error);
			toast.error('Failed to update maintenance bill');
		} finally {
			setIsSubmitting(false);
		}
	};

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
									onClick={() => {
										try {
											downloadMaintenanceReport(row.inv_id);
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

	return (
		<div className="space-y-6">
			<div className="flex justify-between items-center">
				<h2 className="text-xl font-semibold">Vehicle Maintenance Bills</h2>
				<div className="flex items-center gap-4">
					<label className="flex items-center gap-2">
						<Switch checked={showLatest} onCheckedChange={(val) => { setShowLatest(Boolean(val)); }} />
						<span className="text-sm">Show latest</span>
					</label>
				</div>
			</div>

			<div className="min-h-[400px]">
				{loading ? (
					<div className="p-6 text-center text-sm text-gray-500">
						<Loader2 className="inline-block h-5 w-5 animate-spin mr-2" />
						Loading...
					</div>
				) : (
					<div className="relative">
						<CustomDataGrid
							data={rows}
							columns={columns}
							pagination={false}
							onRowDoubleClick={handleRowDoubleClick}
							inputFilter={false}
						/>

						{showAside && (
							<ActionSidebar
								title={`Maintenance (Edit) ${selectedRow?.inv_no ? `- ${selectedRow.inv_no}` : ''}`}
								onClose={closeAside}
								isOpen={showAside}
								size="xl"
								content={
									<div className="p-0">
										<div className="p-4 h-[calc(100%-64px)] overflow-auto">
											<div className="grid grid-cols-12 gap-4">
												{/* Left column: form */}
												<div className="col-span-8">
													<form className="space-y-4" onSubmit={handleFormSubmit}>
														<div>
															<label className="block text-sm font-medium text-gray-700">Workshop</label>
															<div className="mt-1 text-sm font-medium">{selectedRow?.workshop?.name || 'N/A'}</div>
														</div>
														<div>
															<label className="block text-sm font-medium text-gray-700">Invoice No</label>
															<Input
																type="text"
																value={formData.inv_no}
																onChange={(e) => setFormData(prev => ({ ...prev, inv_no: e.target.value }))}
															/>
														</div>
														<div>
															<label className="block text-sm font-medium text-gray-700">Invoice Date</label>
															<Input
																type="date"
																value={formData.inv_date}
																onChange={(e) => setFormData(prev => ({ ...prev, inv_date: e.target.value }))}
															/>
														</div>
														<div>
															<label className="block text-sm font-medium text-gray-700">Service ODO</label>
															<Input
																type="text"
																value={formData.svc_odo}
																onChange={(e) => setFormData(prev => ({ ...prev, svc_odo: e.target.value }))}
															/>
														</div>
														<div>
															<label className="block text-sm font-medium text-gray-700">Service Date</label>
															<Input
																type="date"
																value={formData.svc_date}
																onChange={(e) => setFormData(prev => ({ ...prev, svc_date: e.target.value }))}
															/>
														</div>
														<div>
															<label className="block text-sm font-medium text-gray-700">Remarks</label>
															<Input
																type="text"
																value={formData.inv_remarks}
																onChange={(e) => setFormData(prev => ({ ...prev, inv_remarks: e.target.value }))}
																placeholder="Additional notes or remarks"
															/>
														</div>

											{/* Attachment field */}
											<div>
												<label className="block text-sm font-medium text-gray-700">Upload Invoice</label>
												{!attachmentFile ? (
													<div className="mt-2">
														<input
															type="file"
															accept=".pdf,application/pdf"
															onChange={(e) => {
																const file = e.target.files?.[0];
																if (file) {
																	if (file.type === 'application/pdf') {
																		setAttachmentFile(file);
																		toast.success(`PDF attached: ${file.name}`);
																	} else {
																		toast.error('Please upload a PDF file only');
																	}
																	// Clear the input value to allow re-selecting the same file
																	e.target.value = '';
																}
															}}
															className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
														/>
														<p className="mt-1 text-xs text-gray-500">PDF files only, max 10MB</p>
													</div>
												) : (
													<div className="mt-2 flex items-center justify-between text-sm text-green-600 bg-green-50 p-4 rounded border-2 border-dashed border-green-300">
														<span>📄 {attachmentFile.name}</span>
														<button
															type="button"
															onClick={() => {
																setAttachmentFile(null);
																toast.info('PDF attachment removed');
															}}
															className="text-red-500 hover:text-red-700 ml-2 font-bold"
														>
															✕
														</button>
													</div>
												)}
											</div>
														
											<div className="pt-4">
															<Button type="submit" disabled={isSubmitting}>
																{isSubmitting ? (
																	<>
																		<Loader2 className="mr-2 h-4 w-4 animate-spin" />
																		Saving...
																	</>
																) : (
																	'Save'
																)}
															</Button>
														</div>
														<hr className="my-4" />
														<div className="flex items-center justify-between">
															<h5 className="text-sm font-semibold">Service Items ({selectedParts.length})</h5>
															<Button type="button" variant="outline" size="sm" onClick={addCustomPart} className="h-8 px-3 border-amber-500 text-amber-600 hover:bg-amber-50">
																<Plus size={16} className="mr-1" />
																Add Custom Item
															</Button>
														</div>
														<div className="mt-2">
															{selectedParts.length === 0 ? (
																<div className="text-sm text-gray-500">No service items selected</div>
															) : (
																<div className="overflow-x-auto">
																	<table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg">
																		<thead className="bg-gray-50">
																			<tr>
																				<th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Part Name</th>
																				<th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Price</th>
																				<th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
																				<th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
																				<th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
																			</tr>
																		</thead>
																		<tbody className="bg-white divide-y divide-gray-200">
																			{selectedParts.map((p, idx) => {
																				const unitPrice = parseFloat(p.part_uprice || '0');
																				const qty = p.qty || 1;
																				const amount = unitPrice * qty;
																				return (
																					<tr
																						key={p.autopart_id}
																						className={clsx(
																							"hover:bg-gray-50",
																							idx % 2 === 1 && "bg-gray-50/60",
																							newlyAddedCustomId === p.autopart_id && "bg-amber-50 border-amber-200 border"
																						)}
																					>
																						<td className="px-2 py-2">
																							<div className="flex items-center w-full">
																								<Package className="h-3 w-3 text-blue-500 mr-1.5 flex-shrink-0" />
																								{p.is_custom ? (
																									<Input
																										value={p.part_name}
																										onChange={(e) => updatePartName(p.autopart_id, e.target.value)}
																										className="text-xs font-medium h-6 px-1 border-dashed"
																										placeholder="Part name"
																									/>
																								) : (
																									<span className="text-xs font-medium text-gray-900">{p.part_name}</span>
																								)}
																							</div>
																						</td>
																						<td className="px-2 py-2">
																							<div className="flex items-center">
																								<span className="text-xs text-gray-500 mr-1">RM</span>
																								<Input
																									type="number"
																									step="0.01"
																									min="0"
																									value={p.part_uprice || '0.00'}
																									onChange={(e) => updatePartUnitPrice(p.autopart_id, e.target.value)}
																									className="w-20 h-6 px-1.5 py-0.5 text-xs"
																									placeholder="0.00"
																								/>
																							</div>
																						</td>
																						<td className="px-2 py-2">
																							<Input
																								type="number"
																								min="1"
																								value={p.qty || 1}
																								onChange={(e) => updatePartQty(p.autopart_id, parseInt(e.target.value) || 1)}
																								className="w-14 h-6 px-1.5 py-0.5 text-xs text-center"
																							/>
																						</td>
																						<td className="px-2 py-2 text-end">
																							<span className="text-xs font-medium text-gray-900">
																								RM {amount.toFixed(2)}
																							</span>
																						</td>
																						<td className="px-2 py-2 text-center">
																							<Button
																								type="button"
																								variant="ghost"
																								size="sm"
																								onClick={() => removePart(p.autopart_id)}
																								className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
																								title="Remove item"
																							>
																								<X size={12} />
																							</Button>
																						</td>
																					</tr>
																				);
																			})}
																			{/* Total Row */}
																			<tr className="bg-gray-50 border-t-2 border-gray-300">
																				<td colSpan={3} className="px-2 py-2 text-xs font-semibold text-gray-900 text-right">
																					Total Amount:
																				</td>
																				<td className="px-2 py-2 text-end">
																					<span className="text-xs font-bold text-green-600">
																						RM {selectedParts.reduce((total, p) => {
																							const unitPrice = parseFloat(p.part_uprice || '0');
																							const qty = p.qty || 1;
																							return total + (unitPrice * qty);
																						}, 0).toFixed(2)}
																					</span>
																				</td>
																				<td></td>
																			</tr>
																		</tbody>
																	</table>
																</div>
															)}

														</div>
													</form>
												</div>

												{/* Right column: parts list */}
												<div className="col-span-4">
													<div className="flex items-center justify-between mb-2">
														<h4 className="text-md font-semibold">Service Catalogs</h4>
													</div>
													<div className="flex gap-2">
														{/* Search input for filtering parts */}
														<Input placeholder="Search service catalogs..." value={partSearch} onChange={(e: any) => setPartSearch(e.target.value)} />
														<Select value={String(partCategory)} onValueChange={(val) => setPartCategory(val === 'all' ? 'all' : Number(val))}>
															<SelectTrigger className="w-full">
																<SelectValue placeholder="Category" />
															</SelectTrigger>
															<SelectContent>
																<SelectItem value={'all'}>All Categories</SelectItem>
																{partCategories.map(cat => (
																	<SelectItem key={cat.svcTypeId} value={String(cat.svcTypeId)}>{cat.svcType}</SelectItem>
																))}
															</SelectContent>
														</Select>
													</div>

													<div className="mt-3 space-y-2">
														{filteredParts.length === 0 ? (
															<div className="text-sm text-gray-500">No parts available</div>
														) : (
															filteredParts.map(part => (
																<div key={part.autopart_id} className="flex items-center justify-between border border-emerald-500 rounded p-2">
																	<div>
																		<div className="font-xs uppercase">{part.part_name}</div>
																		<div className="text-xs text-blue-600">Category: {part.part_category?.svcType || 'N/A'}</div>
																	</div>
																	<div className="flex items-center gap-2">
																		<Button
																			variant="ghost"
																			size="sm"
																			onClick={() => addPart(part)}
																			className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
																		>
																			<Plus size={14} />
																		</Button>
																	</div>
																</div>
															))
														)}
													</div>

													{/* Load more button for paginated browsing */}
													<div className="mt-3 text-center">
														{partsLoading ? (
															<div className="text-sm text-gray-500">
																<Loader2 className="inline-block h-4 w-4 animate-spin mr-1" />
																Loading...
															</div>
														) : partsHasMore ? (
															<Button
																variant="outline"
																size="sm"
																onClick={async () => { await fetchParts({ page: partsPage + 1, per_page: 50, category: partCategory === 'all' ? undefined : partCategory }); }}
															>
																Load more
															</Button>
														) : (
															<div className="text-xs text-gray-500">No more parts</div>
														)}
													</div>
												</div>
											</div>
										</div>
									</div>
								}
							/>
						)}
					</div>
				)}
			</div>
		</div>
	);
};

export default MaintenanceBill;
