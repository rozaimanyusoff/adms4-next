import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authenticatedApi } from '@/config/api';
import { Loader2, Trash2, RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Asset {
	id: number;
	register_number: string;
	fuel_type: string;
	costcenter?: CostCenter | null;
	locations?: Location | null; // backend uses 'locations' object in fleet response
	purpose?: string;
	entry_code?: string;
	location_id?: number;
	vehicle_id?: number;
}

interface CostCenter {
	id: number;
	name: string;
}
interface Location {
	id: number;
	name?: string;
	code?: string;
}

interface FleetCard {
	id: number;
	card_no: string;
}

interface FuelDetail {
	s_id: number;
	stmt_id: number;
	fleetcard: FleetCard;
	asset: Asset;
	stmt_date: string;
	start_odo: number;
	end_odo: number;
	total_km: number;
	total_litre: string;
	amount: string;
}

interface FuelBillDetail {
	stmt_id: number;
	stmt_no: string;
	stmt_date: string;
	stmt_issuer: string;
	stmt_ron95: string;
	stmt_ron97: string;
	stmt_diesel: string;
	bill_payment: string;
	stmt_count: number;
	stmt_litre: string;
	stmt_total_odo: number;
	stmt_stotal: string;
	stmt_tax: string;
	stmt_rounding: string;
	stmt_disc: string;
	stmt_total: string;
	stmt_entry: string;
	details: FuelDetail[];
	fuel_issuer?: { fuel_id: number; vendor: string };
	vendor?: string;
	// new API field for vendor info
	fuel_vendor?: { id: number | string; vendor?: string; logo?: string };
}

interface FuelMtnDetailProps {
	stmtId: number;
	onLeaveHandlerReady?: (fn: () => void) => void;
}

type DetailRowProps = {
	detail: FuelDetail;
	displayIndex: number;
	originalIndex: number;
	showEmptyHighlight: boolean;
	isRowRequiredFieldsFilled: (detail: FuelDetail) => boolean;
	handleNumericInput: (e: React.KeyboardEvent<HTMLInputElement>) => void;
	validateNumericInput: (value: string) => string;
	onChange: (idx: number, field: keyof FuelDetail, value: string | number) => void;
	onFleetCardChange: (idx: number, cardNo: string) => void;
	onRemove: (detail: FuelDetail) => void;
	cardFieldsReady: boolean;
	isDuplicateCard: (detail: FuelDetail) => boolean;
};

type ConsumerTableProps = {
	filteredDetails: FuelDetail[];
	editableDetails: FuelDetail[];
	search: string;
	onSearchChange: (value: string) => void;
	loadingDetails: boolean;
	onRemoveDetail: (detail: FuelDetail) => void;
	onDetailChange: (idx: number, field: keyof FuelDetail, value: string | number) => void;
	onFleetCardChange: (idx: number, cardNo: string) => void;
	isRowRequiredFieldsFilled: (detail: FuelDetail) => boolean;
	handleNumericInput: (e: React.KeyboardEvent<HTMLInputElement>) => void;
	validateNumericInput: (value: string) => string;
	detailIndexMap: Map<number, number>;
	isRowFilled: (detail: FuelDetail) => boolean;
	cardFieldsReady: boolean;
};

const FuelDetailRow: React.FC<DetailRowProps> = React.memo(({
	detail,
	displayIndex,
	originalIndex,
	showEmptyHighlight,
	isRowRequiredFieldsFilled,
	handleNumericInput,
	validateNumericInput,
	onChange,
	onFleetCardChange,
	onRemove,
	cardFieldsReady,
	isDuplicateCard,
}) => {
    const isRequired = isRowRequiredFieldsFilled(detail);
    const rowClass = `border-b focus:outline-none focus:ring-0 ${showEmptyHighlight ? 'bg-amber-100/70' : ''}`;
	return (
		<tr className={rowClass}>
			<td className="border p-0 text-center">
				<div className="flex items-center justify-center gap-1">
					<span>{displayIndex}</span>
					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									type="button"
									variant="ghost"
									size="sm"
									onClick={() => onRemove(detail)}
									tabIndex={-1}
									className="p-1 h-6 w-6 hover:bg-red-100"
								>
									<Trash2 size={12} className="text-red-600" />
								</Button>
							</TooltipTrigger>
							<TooltipContent>
								<p>Remove Entry</p>
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>
				</div>
			</td>
				<td className={`border p-0 ${isDuplicateCard(detail) ? 'bg-red-50' : ''}`}>
					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger asChild>
								<Input
									type="text"
									value={detail.fleetcard?.card_no || ''}
									onChange={e => onFleetCardChange(originalIndex, e.target.value)}
									placeholder={cardFieldsReady ? 'Copy & paste card no here' : 'Fill Issuer, Statement No & Date first'}
									disabled={!cardFieldsReady}
									className={`w-full rounded-none bg-white focus:outline-none focus:ring-0 focus:ring-offset-0 focus:border-transparent focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-transparent border ${isDuplicateCard(detail) ? 'border-red-500 text-red-700 bg-red-50' : 'border-transparent'}`}
								/>
							</TooltipTrigger>
							{isDuplicateCard(detail) && (
								<TooltipContent>
									<p>Duplicated Card No</p>
								</TooltipContent>
							)}
						</Tooltip>
					</TooltipProvider>
					{isDuplicateCard(detail) && (
						<p className="text-xs text-red-600 px-2 py-0.5">Duplicated</p>
					)}
				</td>
			<td className="border p-0 bg-gray-50 text-gray-700">{detail.asset?.register_number || ''}</td>
			<td className="border p-0 bg-gray-50 text-gray-700">{detail.asset?.costcenter?.name || ''}</td>
			<td className="border p-0 bg-gray-50 text-gray-700">{detail.asset?.fuel_type || ''}</td>
			<td className="border p-0 bg-gray-50 text-gray-700">{detail.asset?.purpose || ''}</td>
			<td className="border p-0 text-right">
				<TooltipProvider>
					<Tooltip>
						<TooltipTrigger asChild>
							<Input
								type="text"
								value={detail.start_odo !== undefined && detail.start_odo !== null && !isNaN(Number(detail.start_odo)) ? detail.start_odo : 0}
								onKeyDown={handleNumericInput}
								onChange={e => onChange(originalIndex, 'start_odo', validateNumericInput(e.target.value))}
								readOnly={false}
								maxLength={6}
								className="w-full text-right border-0 rounded-none bg-white focus:outline-none focus:ring-0 focus:ring-offset-0 focus:border-transparent focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-transparent"
							/>
						</TooltipTrigger>
						{!isRequired && (
							<TooltipContent>
								<p>You can key in ODO now; asset info is still empty.</p>
							</TooltipContent>
						)}
					</Tooltip>
				</TooltipProvider>
			</td>
			<td className="border p-0 text-right">
				<TooltipProvider>
					<Tooltip>
						<TooltipTrigger asChild>
							<Input
								type="text"
								value={detail.end_odo !== undefined && detail.end_odo !== null && !isNaN(Number(detail.end_odo)) ? detail.end_odo : 0}
								onKeyDown={handleNumericInput}
								onChange={e => onChange(originalIndex, 'end_odo', validateNumericInput(e.target.value))}
								readOnly={false}
								maxLength={6}
								className="w-full text-right border-0 rounded-none bg-white focus:outline-none focus:ring-0 focus:ring-offset-0 focus:border-transparent focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-transparent"
							/>
						</TooltipTrigger>
						{!isRequired && (
							<TooltipContent>
								<p>You can key in ODO now; asset info is still empty.</p>
							</TooltipContent>
						)}
					</Tooltip>
				</TooltipProvider>
			</td>
			<td className="border p-0 text-right">
				<Input
					type="text"
					value={detail.total_km !== undefined && detail.total_km !== null && !isNaN(Number(detail.total_km)) ? detail.total_km : 0}
					readOnly
					tabIndex={-1}
					maxLength={6}
					className="w-full text-right border-0 rounded-none bg-gray-100 text-gray-700"
				/>
			</td>
			<td className="border p-0">
				<Input
					type="text"
					value={detail.total_litre !== undefined && detail.total_litre !== null && !isNaN(Number(detail.total_litre)) ? detail.total_litre : ''}
					onKeyDown={handleNumericInput}
					onChange={e => onChange(originalIndex, 'total_litre', validateNumericInput(e.target.value))}
					readOnly={false}
					className="w-full text-right border-0 rounded-none bg-white focus:outline-none focus:ring-0 focus:ring-offset-0 focus:border-transparent focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-transparent"
				/>
			</td>
			<td className="border p-0">
				<Input
					type="text"
					value={detail.total_litre && Number(detail.total_litre) > 0
						? (Number(detail.total_km || 0) / Number(detail.total_litre)).toFixed(2)
						: '0.00'}
					readOnly
					tabIndex={-1}
					className="w-full text-right border-0 rounded-none bg-gray-100 text-gray-700"
				/>
			</td>
			<td className="border p-0">
				<Input
					type="text"
					value={detail.amount !== undefined && detail.amount !== null && !isNaN(Number(detail.amount)) ? detail.amount : ''}
					onKeyDown={handleNumericInput}
					onChange={e => onChange(originalIndex, 'amount', validateNumericInput(e.target.value))}
					readOnly={false}
					className="w-full text-right border-0 rounded-none bg-white focus:outline-none focus:ring-0 focus:ring-offset-0 focus:border-transparent focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-transparent"
				/>
			</td>
		</tr>
	);
});
FuelDetailRow.displayName = 'FuelDetailRow';

const ConsumerDetailsTable: React.FC<ConsumerTableProps> = React.memo(({
	filteredDetails,
	editableDetails,
	search,
	onSearchChange,
	loadingDetails,
	onRemoveDetail,
	onDetailChange,
	onFleetCardChange,
	isRowRequiredFieldsFilled,
	handleNumericInput,
	validateNumericInput,
	detailIndexMap,
	isRowFilled,
	cardFieldsReady,
}) => {
	// Track duplicates for card numbers (case-insensitive, trimmed)
	const duplicateCardNos = React.useMemo(() => {
		const counts = new Map<string, number>();
		editableDetails.forEach(d => {
			const key = (d.fleetcard?.card_no || '').trim().toLowerCase();
			if (!key) return;
			counts.set(key, (counts.get(key) || 0) + 1);
		});
		return new Set(
			Array.from(counts.entries())
				.filter(([, count]) => count > 1)
				.map(([key]) => key)
		);
	}, [editableDetails]);

	const isDuplicateCard = React.useCallback((detail: FuelDetail) => {
		const key = (detail.fleetcard?.card_no || '').trim().toLowerCase();
		if (!key) return false;
		return duplicateCardNos.has(key);
	}, [duplicateCardNos]);
	const tableContainerRef = React.useRef<HTMLDivElement | null>(null);

	const scrollToBottom = React.useCallback(() => {
		const el = tableContainerRef.current;
		if (!el) return;
		el.scrollTop = el.scrollHeight;
	}, []);

	// Auto-scroll to bottom so the newest rows stay in view; older rows remain scrollable upward
	React.useEffect(() => {
		const frame = requestAnimationFrame(scrollToBottom);
		return () => cancelAnimationFrame(frame);
	}, [filteredDetails.length, scrollToBottom]);

	const filledCount = React.useMemo(
		() => editableDetails.filter(isRowFilled).length,
		[editableDetails, isRowFilled]
	);
	const filteredFilledCount = React.useMemo(
		() => filteredDetails.filter(isRowFilled).length,
		[filteredDetails, isRowFilled]
	);

	return (
		<div className="w-full">
			<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-2 gap-3">
				<div className="flex items-center gap-3">
					<h3 className="text-xl font-semibold flex items-center gap-2">
						Consumer Details
						{loadingDetails && <Loader2 className="animate-spin text-primary w-5 h-5" />}
					</h3>
					<span className="text-sm text-blue-600 bg-gray-100 rounded px-2 py-0.5">
						Total entries: {filledCount}
						{search ? ` • Showing ${filteredFilledCount}` : ''}
					</span>
					<Input
						type="text"
						placeholder="Search Register number or card..."
						value={search}
						onChange={e => onSearchChange(e.target.value)}
						className="w-62 rounded-md"
					/>
				</div>
			</div>
			{search && (
				<div className="mb-2 text-xs text-gray-500 dark:text-gray-400">
					Filtered by: "{search}" • {filteredDetails.length} row{filteredDetails.length !== 1 ? 's' : ''} displayed
				</div>
			)}
			<div
				className="overflow-x-auto overflow-y-auto mb-6 w-full max-h-80"
				ref={tableContainerRef}
			>
				<table className="w-full table-auto border-collapse text-sm">
					<thead className="bg-gray-200 sticky top-0 z-10">
						<tr className='text-xs p-2'>
							<th className="border p-0 w-12">#</th>
							<th className="border p-0">Card No</th>
							<th className="border p-0">Register Number</th>
							<th className="border p-0">Cost Center</th>
							<th className="border p-0">Fuel Type</th>
							<th className="border p-0">Purpose</th>
							<th className="border p-0 text-right w-25">Start ODO</th>
							<th className="border p-0 text-right w-25">End ODO</th>
							<th className="border p-0 text-right w-25">Distance (km)</th>
							<th className="border p-0 text-right w-25">Consumption (liter)</th>
							<th className="border p-0 text-right w-25">Efficiency (km/l)</th>
							<th className="border p-0 text-right w-25">Amount (RM)</th>
						</tr>
					</thead>
					<tbody>
						{filteredDetails.map((detail, idx) => {
							const originalIndex = detailIndexMap.get(detail.s_id) ?? idx;
							return (
								<FuelDetailRow
									key={detail.s_id}
									detail={detail}
									displayIndex={idx + 1}
									originalIndex={originalIndex}
									showEmptyHighlight={!isRowFilled(detail)}
									isRowRequiredFieldsFilled={isRowRequiredFieldsFilled}
									handleNumericInput={handleNumericInput}
									validateNumericInput={validateNumericInput}
									onChange={onDetailChange}
									onFleetCardChange={onFleetCardChange}
									onRemove={onRemoveDetail}
									cardFieldsReady={cardFieldsReady}
									isDuplicateCard={isDuplicateCard}
								/>
							);
						})}
					</tbody>
				</table>
			</div>
		</div>
	);
});
ConsumerDetailsTable.displayName = 'ConsumerDetailsTable';

const FuelMtnDetail: React.FC<FuelMtnDetailProps> = ({ stmtId: initialStmtId, onLeaveHandlerReady }) => {
	const router = useRouter();
	// Add state for current statement ID (can change after creation)
	const [currentStmtId, setCurrentStmtId] = useState(initialStmtId);

	const [data, setData] = useState<FuelBillDetail | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [editableDetails, setEditableDetails] = useState<FuelDetail[]>([]);
	const [search, setSearch] = useState('');

	// Add state for summary fields with default values for RON95, RON97, Diesel
	const [summary, setSummary] = useState({
		stmt_stotal: '',
		stmt_disc: '',
		stmt_tax: '',
		stmt_rounding: '',
		stmt_entry: '',
		stmt_total: '',
		stmt_ron95: '2.05',
		stmt_ron97: '3.18',
		stmt_diesel: '2.88',
	});


	// State for vendor select
	const [vendors, setVendors] = useState<{ fuel_id: number; vendor: string; logo: string; image2: string }[]>([]);
	const [selectedVendor, setSelectedVendor] = useState<string>('');

	// Helper to get vendor by id and logo path for rendering
	const getVendorById = (id?: string) => vendors.find(v => String(v.fuel_id) === String(id));
	const getVendorLogo = (id?: string) => getVendorById(id)?.logo || '';

	const navigateBack = React.useCallback(() => {
		router.push('/billings/fuel');
	}, [router]);

	const goBackToList = React.useCallback((force?: boolean) => {
		if (force) {
			navigateBack();
			return;
		}
		navigateBack();
	}, [navigateBack]);

	// State for header fields
	const [header, setHeader] = useState({
		stmt_no: '',
		stmt_date: '',
		stmt_litre: '',
	});
	const [headerDraft, setHeaderDraft] = useState({
		stmt_no: '',
		stmt_date: '',
		stmt_litre: '',
	});
	// keep local draft in sync when header changes from API/draft restore
	useEffect(() => {
		setHeaderDraft(header);
	}, [header]);

	// Add state for loadingDetails
	const [loadingDetails, setLoadingDetails] = useState(false);
	const [saving, setSaving] = useState(false);
	const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
	const [showSubmitSuccess, setShowSubmitSuccess] = useState(false);
	const [submitSuccessMessage, setSubmitSuccessMessage] = useState('');

	// Draft handling and leave confirmation
	const draftKey = React.useMemo(() => {
		return currentStmtId && currentStmtId > 0 ? null : 'fuel-bill-draft';
	}, [currentStmtId]);
	const [draftLoaded, setDraftLoaded] = useState(false);
	const [showCancelDialog, setShowCancelDialog] = useState(false);
	const [draftDetailsRestored, setDraftDetailsRestored] = useState(false);
	const draftSaveTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
	const lastDraftStringRef = React.useRef<string | null>(null);

	const clearDraft = React.useCallback(() => {
		if (!draftKey) return;
		try {
			localStorage.removeItem(draftKey);
			lastDraftStringRef.current = null;
		} catch {
			// ignore storage errors
		}
	}, [draftKey]);

	// Validation state
	const [errors, setErrors] = useState({
		vendor: false,
		stmt_no: false,
		stmt_date: false,
	});

	const cardFieldsReady = React.useMemo(() => {
		return Boolean(
			selectedVendor &&
			headerDraft.stmt_no.trim() &&
			headerDraft.stmt_date.trim()
		);
	}, [headerDraft.stmt_date, headerDraft.stmt_no, selectedVendor]);

	// Draft restore (create mode only)
	useEffect(() => {
		if (currentStmtId && currentStmtId > 0) { setDraftLoaded(true); return; }
		if (!draftKey) { setDraftLoaded(true); return; }
		try {
			const raw = typeof window !== 'undefined' ? localStorage.getItem(draftKey) : null;
			if (raw) {
				const draft = JSON.parse(raw);
				if (draft.header) setHeader((s) => ({ ...s, ...draft.header }));
				if (draft.summary) setSummary((s) => ({ ...s, ...draft.summary }));
				if (typeof draft.selectedVendor === 'string') setSelectedVendor(draft.selectedVendor);
				if (Array.isArray(draft.editableDetails)) {
					setEditableDetails(draft.editableDetails);
					setDraftDetailsRestored(true);
				}
			}
		} catch {
			// ignore storage errors
		} finally {
			setDraftLoaded(true);
		}
	}, [currentStmtId, draftKey]);

	// Draft persist (create mode only)
	useEffect(() => {
		if (currentStmtId && currentStmtId > 0) return;
		if (!draftKey || !draftLoaded) return;
		// Build draft payload once, then schedule a deferred write during browser idle time
		if (draftSaveTimer.current) {
			clearTimeout(draftSaveTimer.current);
		}
		const payload = {
			header,
			summary,
			selectedVendor,
			editableDetails,
			draftDetailsRestored,
		};
		const serialized = JSON.stringify(payload);
		// Skip redundant saves when nothing changed
		if (lastDraftStringRef.current === serialized) {
			return () => {
				if (draftSaveTimer.current) {
					clearTimeout(draftSaveTimer.current);
				}
			};
		}
		draftSaveTimer.current = setTimeout(() => {
			const writeDraft = () => {
				try {
					localStorage.setItem(draftKey, serialized);
					lastDraftStringRef.current = serialized;
				} catch {
					// ignore storage errors
				}
			};
			// Prefer idle callback to avoid blocking UI; fall back to microtask
			if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
				(window as any).requestIdleCallback(writeDraft, { timeout: 1500 });
			} else {
				setTimeout(writeDraft, 0);
			}
		}, 1000);
		return () => {
			if (draftSaveTimer.current) {
				clearTimeout(draftSaveTimer.current);
			}
		};
	}, [draftKey, draftLoaded, draftDetailsRestored, editableDetails, header, selectedVendor, summary, currentStmtId]);

	const handleCloseSuccessDialog = React.useCallback(() => {
		setShowSubmitSuccess(false);
		clearDraft();
		try {
			if (window.opener && typeof window.opener.reloadFuelBillGrid === 'function') {
				window.opener.reloadFuelBillGrid();
			}
		} catch {
			// ignore cross-origin errors
		}
		// Prefer closing the popup if it was opened from a parent; otherwise navigate back to list
		if (typeof window !== 'undefined' && window.opener) {
			window.close();
		} else {
			navigateBack();
		}
	}, [clearDraft, navigateBack]);

	// Save handler for form submission (invoked after confirmation)
	const handleSave = async () => {
		if (!validateForm()) {
			setShowSubmitConfirm(false);
			return;
		}

		setShowSubmitConfirm(false);
		setSaving(true);
		const payload = buildFormPayload();
		try {
			// POST for create, PUT for update
			if (!currentStmtId || currentStmtId === 0) {
				const response = await authenticatedApi.post<{ status: string; message: string; id: number }>('/api/bills/fuel', payload);

				// Check if response contains the new ID
				if (response.data && response.data.id) {
					const newId = response.data.id;
					setCurrentStmtId(newId);

					// Update URL to include the new ID and reload to show the created record
					const currentUrl = new URL(window.location.href);
					currentUrl.searchParams.set('id', newId.toString());
					window.history.replaceState({}, '', currentUrl.toString());
				}

				setSubmitSuccessMessage('Fuel statement created successfully.');
				setShowSubmitSuccess(true);
			} else {
				await authenticatedApi.put(`/api/bills/fuel/${currentStmtId}`, payload);
				setSubmitSuccessMessage('Fuel statement updated successfully.');
				setShowSubmitSuccess(true);
			}
		} catch (err: any) {
			toast.error('Failed to save fuel statement.');
		} finally {
			setSaving(false);
		}
	};
	// ...existing state declarations...
	// Summarize amount by cost center

	// Helper function to check if a detail row is considered "filled"
	const isRowFilled = React.useCallback((detail: FuelDetail): boolean => {
		const hasValidAmount = detail.amount && parseFloat(String(detail.amount)) > 0;
		return Boolean(hasValidAmount);
	}, []);

	// Keep one blank row available for quick data entry
	const createEmptyDetail = React.useCallback((): FuelDetail => ({
		s_id: Date.now() + Math.floor(Math.random() * 1000),
		stmt_id: currentStmtId || 0,
		fleetcard: { id: 0, card_no: '' },
		asset: {
			id: 0,
			register_number: '',
			fuel_type: '',
			costcenter: null,
			purpose: '',
		},
		stmt_date: header.stmt_date || '',
		start_odo: 0,
		end_odo: 0,
		total_km: 0,
		total_litre: '',
		amount: '',
	}), [currentStmtId, header.stmt_date]);

	useEffect(() => {
		if (loading) return;
		setEditableDetails(prev => {
			// Always ensure an initial empty row when nothing exists
			if (prev.length === 0) {
				return [createEmptyDetail()];
			}

			const hasEmpty = prev.some(detail => !isRowFilled(detail));
			// Only append a new empty row after at least one row has an amount keyed in
			const anyAmountEntered = prev.some(detail => String(detail.amount ?? '').trim() !== '');

			if (hasEmpty) return prev;
			if (!anyAmountEntered) return prev;

			return [...prev, createEmptyDetail()];
		});
	}, [createEmptyDetail, editableDetails, isRowFilled, loading]);

	const activeDetails = React.useMemo(() => editableDetails.filter(isRowFilled), [editableDetails, isRowFilled]);


	// Split cost center summary by category (project, staffcost) — manual update
	const [costCenterSummary, setCostCenterSummary] = useState<{ [key: string]: number }>({});
	const [updatingCostCenter, setUpdatingCostCenter] = useState(false);
	const costCenterUpdateTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
	const computeCostCenterSummary = React.useCallback(() => {
		const summary: { [key: string]: number } = {};
		activeDetails.forEach(detail => {
			const ccName = detail.asset?.costcenter?.name || 'Unknown';
			const category = detail.asset?.purpose || 'project';
			const key = category === 'staff cost' ? `${ccName} (Staff Cost)` : ccName;
			const amt = parseFloat(detail.amount) || 0;
			if (!summary[key]) summary[key] = 0;
			summary[key] += amt;
		});
		return summary;
	}, [activeDetails]);
	const handleUpdateCostCenterSummary = React.useCallback(() => {
		if (costCenterUpdateTimer.current) {
			clearTimeout(costCenterUpdateTimer.current);
		}
		setUpdatingCostCenter(true);
		setCostCenterSummary(computeCostCenterSummary());
		costCenterUpdateTimer.current = setTimeout(() => setUpdatingCostCenter(false), 300);
	}, [computeCostCenterSummary]);
	React.useEffect(() => {
		return () => {
			if (costCenterUpdateTimer.current) {
				clearTimeout(costCenterUpdateTimer.current);
			}
		};
	}, []);


	// Helper to build form payload for API submission
	const buildFormPayload = () => {
		const petrolAmount = activeDetails
			.filter(d => d.asset?.fuel_type?.toLowerCase() === 'petrol')
			.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);
		const dieselAmount = activeDetails
			.filter(d => d.asset?.fuel_type?.toLowerCase() === 'diesel')
			.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);
		const totalKM = activeDetails.reduce((sum, d) => sum + (Number(d.total_km) || 0), 0);
		const totalLitre = activeDetails.reduce((sum, d) => sum + (parseFloat(d.total_litre) || 0), 0);

		// Helper for default value formatting
		const fmtAmount = (val: any) => {
			const num = parseFloat(val);
			return isNaN(num) ? '0.00' : num.toFixed(2);
		};
		const fmtNum = (val: any) => {
			const num = Number(val);
			return isNaN(num) ? 0 : num;
		};

		return {
			stmt_no: header.stmt_no,
			stmt_date: header.stmt_date,
			stmt_litre: fmtAmount(totalLitre),
			stmt_stotal: fmtAmount(summary.stmt_stotal),
			stmt_disc: fmtAmount(summary.stmt_disc),
			stmt_total: fmtAmount(summary.stmt_total),
			stmt_issuer: selectedVendor,
			petrol: fmtAmount(petrolAmount),
			diesel: fmtAmount(dieselAmount),
			stmt_ron95: fmtAmount(summary.stmt_ron95),
			stmt_ron97: fmtAmount(summary.stmt_ron97),
			stmt_diesel: fmtAmount(summary.stmt_diesel),
			stmt_rounding: fmtAmount(summary.stmt_rounding),
			stmt_tax: fmtAmount(summary.stmt_tax),
			stmt_entry: summary.stmt_entry || '',
			stmt_count: activeDetails.length,
			stmt_total_odo: fmtNum(totalKM),
			details: activeDetails.map(detail => {
				const asset = detail.asset || {};
				const costcenter: CostCenter | null = asset.costcenter || null;
				const totalKMVal = fmtNum(detail.total_km);
				const litreVal = fmtNum(detail.total_litre);
				const locId = asset.locations?.id ?? asset.location_id ?? null;
				const fuelType = asset.fuel_type || '';
				const efficiency = litreVal > 0 ? fmtAmount(totalKMVal / litreVal) : '0.00';
				return {
					s_id: detail.s_id,
					stmt_id: detail.stmt_id,
					card_id: detail.fleetcard?.id ?? 0,
					asset_id: asset.id ?? 0,
					fuel_type: fuelType,
					cc_id: costcenter ? costcenter.id : 0,
					purpose: asset.purpose || '',
					loc_id: locId ?? 0,
					stmt_date: header.stmt_date,
					start_odo: fmtNum(detail.start_odo),
					end_odo: fmtNum(detail.end_odo),
					total_km: totalKMVal,
					effct: efficiency,
					total_litre: fmtAmount(detail.total_litre),
					amount: fmtAmount(detail.amount)
				};
			})
		};
	};


	// Auto-calculate subtotal and total from details and discount (debounced)
	useEffect(() => {
		if (activeDetails.length === 0) return;
		const handle = setTimeout(() => {
			const sumAmount = activeDetails.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);
			const discount = parseFloat(summary.stmt_disc) || 0;
			setSummary(prev => ({
				...prev,
				stmt_stotal: sumAmount.toFixed(2),
				stmt_total: (sumAmount - discount).toFixed(2),
			}));
		}, 120);
		return () => clearTimeout(handle);
	}, [activeDetails, summary.stmt_disc]);


	useEffect(() => {
		setLoading(true);
		setError(null);
		// Fetch vendors (new backend shape: { data: [{ id, name, logo, image2 }] })
		authenticatedApi.get<{ status: string; message: string; data: { id: number; name: string; logo?: string; image2?: string }[] }>(`/api/bills/fuel/vendor`)
			.then(res => {
				const list = (res.data && Array.isArray(res.data.data)) ? res.data.data : [];
				// normalize to existing `vendors` state shape
				setVendors(list.map(v => ({ fuel_id: v.id, vendor: v.name, logo: v.logo || '', image2: v.image2 || '' })));
			}).catch(err => {
				console.error('Error fetching vendors:', err);
			});

		// Only fetch bill detail if currentStmtId is a valid positive number
		if (currentStmtId && currentStmtId > 0) {
			authenticatedApi.get<{ data: FuelBillDetail }>(`/api/bills/fuel/${currentStmtId}`)
				.then(res => {
					setData(res.data.data);
					// Skip fetching consumer detail rows; keep header/summary only
					setEditableDetails([]);
					setSummary({
						stmt_stotal: res.data.data.stmt_stotal || '',
						stmt_disc: res.data.data.stmt_disc || '',
						stmt_tax: res.data.data.stmt_tax || '',
						stmt_rounding: res.data.data.stmt_rounding || '',
						stmt_entry: res.data.data.stmt_entry || '',
						stmt_total: res.data.data.stmt_total || '',
						stmt_ron95: res.data.data.stmt_ron95 || '2.05',
						stmt_ron97: res.data.data.stmt_ron97 || '3.18',
						stmt_diesel: res.data.data.stmt_diesel || '2.88',
					});
					setHeader({
						stmt_no: res.data.data.stmt_no || '',
						stmt_date: res.data.data.stmt_date ? res.data.data.stmt_date.slice(0, 10) : '',
						stmt_litre: res.data.data.stmt_litre || '',
					});
					// Prefer new `fuel_vendor` field from API; fall back to legacy `fuel_issuer` if present
					setSelectedVendor(
						res.data.data.fuel_vendor?.id ? String(res.data.data.fuel_vendor.id) : (
							res.data.data.fuel_issuer?.fuel_id ? String(res.data.data.fuel_issuer.fuel_id) : ''
						)
					);
					setLoading(false);
				})
				.catch(() => {
					setError('Failed to load bill details.');
					setLoading(false);
				});
		} else {
			// Create mode: avoid wiping draft before it restores
			if (!draftLoaded && draftKey) return;
			setData(null);
			if (!draftLoaded || !draftKey) {
				setEditableDetails([]);
				setSummary({
					stmt_stotal: '',
					stmt_disc: '',
					stmt_tax: '',
					stmt_rounding: '',
					stmt_entry: '',
					stmt_total: '',
					stmt_ron95: '2.05',
					stmt_ron97: '3.18',
					stmt_diesel: '2.88',
				});
				setHeader({
					stmt_no: '',
					stmt_date: '',
					stmt_litre: '',
				});
				setSelectedVendor('');
			}
			setLoading(false);
		}
	}, [currentStmtId, draftKey, draftLoaded]);

	// When an Issuer (vendor) is selected in create mode, preload fleet cards for that vendor
	// Removed auto-preload of fleet entries on issuer select to avoid coupling to /api/bills/fleet?vendor=...

	const hasFormData = React.useMemo(() => {
		const headerFilled = header.stmt_no || header.stmt_date || header.stmt_litre;
		const summaryFilled = [
			summary.stmt_stotal,
			summary.stmt_disc,
			summary.stmt_tax,
			summary.stmt_rounding,
			summary.stmt_total,
		].some((v) => v && String(v).trim() !== '' && v !== '0' && v !== '0.00');
		const detailsFilled = activeDetails.length > 0;
		return Boolean(headerFilled || summaryFilled || selectedVendor || detailsFilled);
	}, [activeDetails.length, header.stmt_date, header.stmt_litre, header.stmt_no, selectedVendor, summary.stmt_disc, summary.stmt_rounding, summary.stmt_stotal, summary.stmt_tax, summary.stmt_total]);

	const cancelWarningText = hasFormData
		? 'You have unsaved changes. Leaving now will discard them.'
		: 'The form is empty. Leave without saving?';

	useEffect(() => {
		if (typeof onLeaveHandlerReady === 'function') {
			onLeaveHandlerReady(() => setShowCancelDialog(true));
		}
	}, [onLeaveHandlerReady]);

	const handleConfirmLeave = React.useCallback(() => {
		setShowCancelDialog(false);
		clearDraft();
		goBackToList(true);
	}, [clearDraft, goBackToList]);

	// Normalize incoming items from either endpoint so table columns can use a single shape
	const normalizeIncomingDetail = (item: any) => {
		const fleetcardId = item.fleetcard?.id ?? item.id ?? item.card_id ?? 0;
		const cardNo = item.fleetcard?.card_no ?? item.card_no ?? '';
		const assetObj = item.asset || {};
		const assetId = assetObj.asset_id ?? item.asset_id ?? 0;
		const registerNumber = assetObj.register_number ?? item.register_number ?? '';
		const fuelType = assetObj.fuel_type ?? assetObj.vfuelType ?? item.vfuel_type ?? '';
		const purpose = assetObj.purpose ?? item.purpose ?? '';
		const costcenter = assetObj.costcenter ?? null;

		// Normalize location information: backend may return `locations`, `location`, or `location_id`/`loc_id`
		const locationsObj = assetObj.locations ?? assetObj.location ?? item.locations ?? item.location ?? null;
		const locationId = assetObj.location_id ?? assetObj.locations?.id ?? item.location_id ?? item.loc_id ?? null;

		// Normalize vehicle id and entry_code if present
		const vehicleId = assetObj.vehicle_id ?? item.vehicle_id ?? undefined;
		const entryCode = assetObj.entry_code ?? item.entry_code ?? '';

		return {
			s_id: item.s_id ?? item.id ?? Date.now(),
			stmt_id: item.stmt_id ?? 0,
			fleetcard: {
				id: fleetcardId,
				card_no: cardNo,
			},
			asset: {
				id: assetId,
				asset_id: assetId,
				register_number: registerNumber,
				// normalized fuel_type
				fuel_type: fuelType,
				costcenter: costcenter,
				// preserve various location shapes
				locations: locationsObj ?? undefined,
				location_id: locationId ?? undefined,
				vehicle_id: vehicleId,
				entry_code: entryCode,
				purpose: purpose,
			},
			stmt_date: item.stmt_date ?? (item.reg_date ? String(item.reg_date).slice(0, 10) : ''),
			start_odo: item.start_odo ?? 0,
			end_odo: item.end_odo ?? 0,
			total_km: item.total_km ?? 0,
			total_litre: item.total_litre ?? '',
			amount: item.amount ?? '',
		} as any;
	};

	const handleDetailChange = React.useCallback((idx: number, field: keyof FuelDetail, value: string | number) => {
		setEditableDetails(prev => prev.map((detail, i) => {
			if (i !== idx) return detail;
			let updated = { ...detail, [field]: value };
			if (field === 'start_odo' || field === 'end_odo') {
				const start = field === 'start_odo' ? Number(value) : Number(updated.start_odo);
				const end = field === 'end_odo' ? Number(value) : Number(updated.end_odo);
				updated.total_km = end - start;
			}
			return updated;
		}));
	}, []);

	const handleFleetCardChange = React.useCallback((idx: number, cardNo: string) => {
		if (!cardFieldsReady) return;

		// Duplicate check against other rows (case-insensitive, trimmed)
		const incoming = cardNo.trim().toLowerCase();
		// We no longer block on duplicates; visual indicator is used instead

		setEditableDetails(prev => prev.map((detail, i) => {
			if (i !== idx) return detail;
			return {
				...detail,
				fleetcard: {
					id: detail.fleetcard?.id ?? 0,
					card_no: cardNo,
				},
			};
		}));

		const trimmed = cardNo.trim();
		if (!trimmed) return;

		setLoadingDetails(true);
		authenticatedApi.get<{ data: any[] }>(`/api/bills/fleet/card/${encodeURIComponent(trimmed)}`)
			.then(res => {
				const card = Array.isArray(res.data?.data) ? res.data.data[0] : null;
				if (!card) return;
				const asset = card.asset || {};

				setEditableDetails(prev => prev.map((detail, i) => {
					if (i !== idx) return detail;
					return {
						...detail,
						fleetcard: {
							id: card.id ?? detail.fleetcard?.id ?? 0,
							card_no: card.card_no ?? trimmed,
						},
						asset: {
							...detail.asset,
							asset_id: asset.id ?? detail.asset?.id ?? 0,
							register_number: asset.register_number ?? detail.asset?.register_number ?? '',
							fuel_type: asset.fuel_type ?? detail.asset?.fuel_type ?? '',
							costcenter: asset.costcenter ?? detail.asset?.costcenter ?? null,
							purpose: asset.purpose ?? detail.asset?.purpose ?? '',
						},
					} as FuelDetail;
				}));
			})
			.catch(() => {
				toast.error('Failed to fetch fleet card info.');
			})
			.then(() => setLoadingDetails(false));
	}, [cardFieldsReady, setLoadingDetails]);

	const handleSummaryChange = (field: keyof typeof summary, value: string) => {
		setSummary(prev => ({ ...prev, [field]: value }));
	};

	const handleHeaderChange = (field: keyof typeof headerDraft, value: string) => {
		setHeaderDraft(prev => ({ ...prev, [field]: value }));
	};
	const commitHeaderField = React.useCallback((field: keyof typeof headerDraft, value: string) => {
		setHeader(prev => ({ ...prev, [field]: value }));
	}, []);

	// Helper for numeric input restriction
	const handleNumericInput = React.useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
		const allowed = [
			'Backspace', 'Tab', 'ArrowLeft', 'ArrowRight', 'Delete', 'Home', 'End', '.', '-', // allow dot and minus for floats/negatives
		];

		// Allow Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X for copy/paste operations
		if (e.ctrlKey || e.metaKey) {
			return; // Allow all Ctrl/Cmd key combinations
		}

		if (
			!/^[0-9.-]$/.test(e.key) &&
			!allowed.includes(e.key)
		) {
			e.preventDefault();
		}
	}, []);

	// Helper for numeric value validation without aggressive replacement
	const validateNumericInput = React.useCallback((value: string): string => {
		// Allow empty string
		if (value === '') return '';

		// Remove any non-numeric characters except dot and minus
		const cleaned = value.replace(/[^0-9.-]/g, '');

		// Ensure only one decimal point and minus only at the beginning
		const parts = cleaned.split('.');
		if (parts.length > 2) {
			return parts[0] + '.' + parts.slice(1).join('');
		}

		// Handle negative numbers
		const hasNegative = cleaned.includes('-');
		const withoutNegative = cleaned.replace(/-/g, '');

		return hasNegative ? '-' + withoutNegative : withoutNegative;
	}, []);

	// Check if required row fields are filled to enable numerical inputs
	const isRowRequiredFieldsFilled = React.useCallback((detail: FuelDetail): boolean => {
		return Boolean(
			detail.asset?.register_number &&
			detail.asset?.costcenter?.name &&
			detail.asset?.fuel_type &&
			detail.asset?.purpose
		);
	}, []);

	// Filtered details based on search (asset reg no or fleet card) and empty row filter
	const filteredDetails = React.useMemo(() => {
		const q = search.toLowerCase();
		const emptyRows: FuelDetail[] = [];
		const matchedRows: FuelDetail[] = [];

		editableDetails.forEach(detail => {
			if (!isRowFilled(detail)) {
				emptyRows.push(detail);
				return;
			}
			const regNo = detail.asset?.register_number?.toLowerCase() || '';
			const cardNo = detail.fleetcard?.card_no?.toLowerCase() || '';
			if (!q || regNo.includes(q) || cardNo.includes(q)) {
				matchedRows.push(detail);
			}
		});

		return [...matchedRows, ...emptyRows];
	}, [editableDetails, isRowFilled, search]);
	const detailIndexMap = React.useMemo(() => {
		const map = new Map<number, number>();
		editableDetails.forEach((d, idx) => {
			map.set(d.s_id, idx);
		});
		return map;
	}, [editableDetails]);
	const handleSearchChange = React.useCallback((value: string) => setSearch(value), []);

	const handleVendorChange = async (fuelId: string) => {
		// Only set the issuer; do not auto-fetch fleet/consumer rows by vendor
		setSelectedVendor(fuelId);
		if (!currentStmtId || currentStmtId === 0) {
			setEditableDetails([]);
		}
	};

	// Form validation
	const validateForm = () => {
		const newErrors = {
			vendor: !selectedVendor,
			stmt_no: !header.stmt_no.trim(),
			stmt_date: !header.stmt_date.trim(),
		};
		setErrors(newErrors);
		return !Object.values(newErrors).includes(true);
	};

	// Remove an existing bill entry
	const handleRemoveDetail = React.useCallback(async (detail: FuelDetail) => {
		const rowSid = detail?.s_id;
		// Create mode: just remove locally
		if (!currentStmtId || currentStmtId === 0) {
			setEditableDetails(prev => prev.filter(d => d.s_id !== rowSid));
			toast.success('Entry removed. It wasn\'t saved yet.');
			return;
		}

		// Edit mode requires s_id to be present
		if (!rowSid) {
			toast.error('Cannot remove: missing entry id');
			return;
		}

		let loadingToastId: any;
		try {
			loadingToastId = toast.loading('Removing entry...');
			await authenticatedApi.delete(
				`/api/bills/fuel/${currentStmtId}/remove-bill-entry`,
				{ data: { s_id: rowSid } } as any
			);

			// Remove locally
			setEditableDetails(prev => prev.filter(d => d.s_id !== rowSid));

			toast.success('Entry removed successfully');
		} catch (error: any) {
			const msg = error?.response?.data?.message || error?.message || 'Failed to remove entry';
			toast.error(msg);
		} finally {
			if (loadingToastId) toast.dismiss(loadingToastId);
		}
	}, [currentStmtId, editableDetails, header.stmt_date]);

	if (loading) return <div className="p-4">Loading...</div>;
	// Only show No data found if in edit mode and no data
	if ((currentStmtId && currentStmtId > 0) && !data) return <div className="p-4">No data found.</div>;

	return (
		<div className="w-full min-h-screen bg-gray-50 dark:bg-gray-800">
			<AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Leave fuel bill form?</AlertDialogTitle>
						<AlertDialogDescription>{cancelWarningText}</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Stay</AlertDialogCancel>
						<AlertDialogAction onClick={handleConfirmLeave}>Discard and leave</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
			<AlertDialog open={showSubmitConfirm} onOpenChange={setShowSubmitConfirm}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Submit application?</AlertDialogTitle>
						<AlertDialogDescription>
							Please confirm you want to submit this fuel statement. You can still edit after saving.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
						<AlertDialogAction onClick={handleSave} disabled={saving}>
							{saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
							Confirm
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
			<AlertDialog open={showSubmitSuccess} onOpenChange={(open) => {
				if (!open) handleCloseSuccessDialog();
				else setShowSubmitSuccess(true);
			}}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Submission Successful</AlertDialogTitle>
						<AlertDialogDescription>{submitSuccessMessage || 'Fuel statement saved successfully.'}</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogAction onClick={handleCloseSuccessDialog}>Close</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
			<div className="flex flex-col lg:flex-row gap-4 items-start">
				<div className="pt-4 w-full space-y-6">
					<div className="border rounded p-4 bg-white dark:bg-gray-900 shadow-sm">
						<div className="flex items-center justify-between mb-2">
							<h1 className="text-2xl font-semibold">Statement Info</h1>
						</div>
						<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-4">
							<div className="flex flex-col">
								<label className="font-medium mb-1 text-gray-800">
									Issuer
								</label>
								<div className="flex items-center gap-3">
									<Select value={selectedVendor} onValueChange={handleVendorChange}>
										<SelectTrigger className="w-full">
											<SelectValue placeholder="Select Issuer" />
										</SelectTrigger>
										<SelectContent>
											<SelectGroup>
												<SelectLabel>Fuel Vendor</SelectLabel>
												{vendors.map(v => (
													<SelectItem key={v.fuel_id} value={String(v.fuel_id)}>
														<span>{v.vendor}</span>
													</SelectItem>
												))}
											</SelectGroup>
										</SelectContent>
									</Select>

									{/* selected vendor inline preview removed per request */}
								</div>
								{!cardFieldsReady && (
									<p className="text-xs text-red-500 mt-1">Select issuer and fill Statement No & Date to enable Card No entry.</p>
								)}
							</div>
							<div className="flex flex-col">
								<label htmlFor="stmt_no" className="font-medium mb-1 text-gray-800">
									Statement No
								</label>
								<Input
									id="stmt_no"
									type="text"
									value={headerDraft.stmt_no}
									onChange={e => handleHeaderChange('stmt_no', e.target.value)}
									onBlur={e => commitHeaderField('stmt_no', e.target.value)}
									className="w-full text-right uppercase"
								/>
								{!cardFieldsReady && (
									<p className="text-xs text-red-500 mt-1">Required to enable Card No entry.</p>
								)}
							</div>

							<div className="flex flex-col">
								<label htmlFor="stmt_date" className="font-medium mb-1 text-gray-800">
									Statement Date
								</label>
								<Input
									id="stmt_date"
									type="date"
									value={headerDraft.stmt_date}
									onChange={e => handleHeaderChange('stmt_date', e.target.value)}
									onBlur={e => commitHeaderField('stmt_date', e.target.value)}
									className="w-full text-right"
								/>
								{!cardFieldsReady && (
									<p className="text-xs text-red-500 mt-1">Required to enable Card No entry.</p>
								)}
							</div>
						</div>

						<div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mt-4">
							<div className="flex-1">
								<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-3 md:gap-4 mb-4">
									<div className="flex flex-col">
										<span className="font-medium mb-1">Petrol Amount (RM)</span>
										<Input
											type="text"
											value={(() => {
												return activeDetails
													.filter(d => d.asset?.fuel_type?.toLowerCase() === 'petrol')
													.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0)
													.toFixed(2);
											})()}
											readOnly
											className="w-full text-right bg-gray-100"
										/>
									</div>
									<div className="flex flex-col">
										<span className="font-medium mb-1">Diesel Amount (RM)</span>
										<Input
											type="text"
											value={(() => {
												return activeDetails
													.filter(d => d.asset?.fuel_type?.toLowerCase() === 'diesel')
													.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0)
													.toFixed(2);
											})()}
											readOnly
											className="w-full text-right bg-gray-100"
										/>
									</div>
									<div className="flex flex-col">
										<span className="font-medium mb-1">Overall Distance (KM)</span>
										<Input
											type="text"
											value={activeDetails.reduce((sum, d) => sum + (Number(d.total_km) || 0), 0)}
											readOnly
											className="w-full text-right bg-gray-100"
										/>
									</div>
									<div className="flex flex-col">
										<span className="font-medium mb-1">Total Litre</span>
										<Input
											type="text"
											value={activeDetails.reduce((sum, d) => sum + (parseFloat(d.total_litre) || 0), 0).toFixed(2)}
											readOnly
											className="w-full text-right bg-gray-100"
										/>
									</div>
								</div>
							</div>
							<div className="flex flex-col md:flex-row gap-4 w-full md:w-auto md:min-w-max">
								{/* Stack for Sub-Total, Discount/Rebate, Grand-Total */}
								<div className="flex flex-col space-y-2 w-full md:w-60">
									<div className="flex items-center gap-2">
										<label className="text-xs min-w-22.5">Sub-Total (RM)</label>
										<Input
											type="text"
											value={summary.stmt_stotal !== undefined && summary.stmt_stotal !== null && summary.stmt_stotal !== '' && !isNaN(Number(summary.stmt_stotal)) ? Number(summary.stmt_stotal).toFixed(2) : '0.00'}
											readOnly
											className="w-full text-right bg-gray-100"
										/>
									</div>
									<div className="flex items-center gap-2">
										<label className="text-xs min-w-22.5">Discount/Rebate (RM)</label>
										<Input
											type="text"
											value={summary.stmt_disc !== undefined && summary.stmt_disc !== null && summary.stmt_disc !== '' && !isNaN(Number(summary.stmt_disc)) ? Number(summary.stmt_disc).toFixed(2) : '0.00'}
											onKeyDown={handleNumericInput}
											onChange={e => handleSummaryChange('stmt_disc', validateNumericInput(e.target.value))}
											className="w-full text-right"
										/>
									</div>
									<div className="flex items-center gap-2">
										<label className="text-xs min-w-22.5">Grand-Total (RM)</label>
										<Input
											type="text"
											value={summary.stmt_total !== undefined && summary.stmt_total !== null && summary.stmt_total !== '' && !isNaN(Number(summary.stmt_total)) ? Number(summary.stmt_total).toFixed(2) : '0.00'}
											readOnly
											className="w-full text-right bg-gray-100"
										/>
									</div>
								</div>
								{/* Stack for RON95, RON97, Diesel */}
								<div className="flex flex-col space-y-2 w-full md:w-60">
									<div className="flex items-center gap-2">
										<label className="text-xs min-w-22.5">RON95 (RM/Litre)</label>
										<Input
											type="text"
											value={summary.stmt_ron95 !== undefined && summary.stmt_ron95 !== null && summary.stmt_ron95 !== '' && !isNaN(Number(summary.stmt_ron95)) ? summary.stmt_ron95 : ''}
											onChange={e => handleSummaryChange('stmt_ron95', validateNumericInput(e.target.value))}
											className="w-full text-right bg-gray-100"
										/>
									</div>
									<div className="flex items-center gap-2">
										<label className="text-xs min-w-22.5">RON97 (RM/Litre)</label>
										<Input
											type="text"
											value={summary.stmt_ron97 !== undefined && summary.stmt_ron97 !== null && summary.stmt_ron97 !== '' && !isNaN(Number(summary.stmt_ron97)) ? summary.stmt_ron97 : ''}
											onChange={e => handleSummaryChange('stmt_ron97', validateNumericInput(e.target.value))}
											className="w-full text-right bg-gray-100"
										/>
									</div>
									<div className="flex items-center gap-2">
										<label className="text-xs min-w-22.5">Diesel (RM/Litre)</label>
										<Input
											type="text"
											value={summary.stmt_diesel !== undefined && summary.stmt_diesel !== null && summary.stmt_diesel !== '' && !isNaN(Number(summary.stmt_diesel)) ? summary.stmt_diesel : ''}
											onChange={e => handleSummaryChange('stmt_diesel', validateNumericInput(e.target.value))}
											className="w-full text-right bg-gray-100"
										/>
									</div>
								</div>
							</div>
						</div>

						<div className="flex justify-center gap-2 mt-6">
							{(!currentStmtId || currentStmtId === 0) ? (
								<Button
									type="button"
									onClick={() => setShowSubmitConfirm(true)}
									disabled={saving}
									variant="default"
								>
									{saving && <Loader2 className="animate-spin w-4 h-4 mr-2" />}
									{saving
										? "Submitting..."
										: "Submit Application"
									}
								</Button>
							) : (
								<Button type="button" variant="default" onClick={() => setShowSubmitConfirm(true)} disabled={saving}>
									{saving && <Loader2 className="animate-spin w-4 h-4 mr-2" />}
									{saving ? "Saving..." : "Save Changes"}
								</Button>
							)}
							<Button type="button" variant="destructive" onClick={() => setShowCancelDialog(true)}>Cancel</Button>
						</div>
					</div>
				</div>
				<div className="pt-4 w-full lg:max-w-sm space-y-6">
					<div className="w-full border rounded p-4 bg-indigo-50 dark:bg-gray-900 shadow-sm h-fit">
						<div className="flex items-center justify-between mb-4 gap-2">
							<h3 className="text-lg font-semibold">Cost Center Breakdown</h3>
							<Button
								size="sm"
								variant="default"
								onClick={handleUpdateCostCenterSummary}
								disabled={updatingCostCenter}
								className="flex items-center gap-2"
							>
								{updatingCostCenter ? (
									<Loader2 className="w-4 h-4 animate-spin" />
								) : (
									<RefreshCw className="w-4 h-4" />
								)}
								Update
							</Button>
						</div>
						<table className="min-w-full border text-xs">
							<thead className="bg-gray-200">
								<tr>
									<th className="border px-2 py-1.5 text-left">Cost Center</th>
									<th className="border px-2 py-1.5 text-right">Amount</th>
								</tr>
							</thead>
							<tbody>
								{Object.entries(costCenterSummary).length === 0 ? (
									<tr>
										<td className="border px-2 py-3 text-center" colSpan={2}>No data. Click Update to calculate.</td>
									</tr>
								) : (
									Object.entries(costCenterSummary).map(([cc, amt]) => (
										<tr key={cc}>
											<td className="border px-2 py-1.5">{cc}</td>
											<td className="border px-2 py-1.5 text-right">{amt.toFixed(2)}</td>
										</tr>
									))
								)}
								<tr>
									<td className="border px-2 py-1.5 font-semibold">Total</td>
									<td className="border px-2 py-1.5 text-right font-semibold">
										{Object.values(costCenterSummary).reduce((sum, amt) => sum + amt, 0).toFixed(2)}
									</td>
								</tr>
							</tbody>
						</table>
					</div>
				</div>
			</div>
			<div className="mt-4 w-full">
					<ConsumerDetailsTable
						filteredDetails={filteredDetails}
						editableDetails={editableDetails}
						search={search}
						onSearchChange={handleSearchChange}
						loadingDetails={loadingDetails}
						onRemoveDetail={handleRemoveDetail}
					onDetailChange={handleDetailChange}
					onFleetCardChange={handleFleetCardChange}
					isRowRequiredFieldsFilled={isRowRequiredFieldsFilled}
					handleNumericInput={handleNumericInput}
					validateNumericInput={validateNumericInput}
					detailIndexMap={detailIndexMap}
					isRowFilled={isRowFilled}
					cardFieldsReady={cardFieldsReady}
				/>
			</div>
		</div>

	);
};

export default FuelMtnDetail;
