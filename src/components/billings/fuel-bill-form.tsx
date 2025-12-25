import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authenticatedApi } from '@/config/api';
import { Loader2, PlusCircle, Edit3, ArrowBigRight, ArrowBigLeft, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import ActionSidebar from '@/components/ui/action-aside';

interface Asset {
	asset_id: number;
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
	name: string;
}

interface District {
	id: number;
	code: string;
}

interface FleetCard {
	id: number;
	card_no: string;
}

// Extended interface for API responses that include asset data
interface FleetCardWithAsset {
	id: number;
	card_no: string;
	asset?: Asset;
	reg_date?: string;
	start_odo?: number;
	end_odo?: number;
	total_km?: number;
	total_litre?: string;
	amount?: string;
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
    onEdit: (idx: number) => void;
    onRemove: (detail: FuelDetail) => void;
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
    onEdit,
    onRemove,
}) => {
    const isRequired = isRowRequiredFieldsFilled(detail);
    return (
        <tr className={showEmptyHighlight ? 'bg-yellow-50 dark:bg-yellow-900/20' : ''}>
            <td className="border px-2 text-center">
                <div className="flex items-center justify-center gap-1">
                    <span>{displayIndex}</span>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onEdit(originalIndex)}
                                    className="p-1 h-6 w-6 hover:bg-blue-100"
                                >
                                    <Edit3 size={12} className="text-blue-600" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Edit Fleet Card, Cost Center, Fuel Type & Purpose</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onRemove(detail)}
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
            <td className="border px-2">{detail.fleetcard?.card_no || ''}</td>
            <td className="border px-2">{detail.asset?.register_number || ''}</td>
            <td className="border px-2">{detail.asset?.costcenter?.name || ''}</td>
            <td className="border px-2">{detail.asset?.fuel_type || ''}</td>
            <td className="border px-2">{detail.asset?.purpose || ''}</td>
            <td className="border text-right">
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Input
                                type="text"
                                value={detail.start_odo !== undefined && detail.start_odo !== null && !isNaN(Number(detail.start_odo)) ? detail.start_odo : 0}
                                onKeyDown={handleNumericInput}
                                onChange={e => onChange(originalIndex, 'start_odo', validateNumericInput(e.target.value))}
                                readOnly={!isRequired}
                                className={`w-full text-right border-0 rounded-none ${!isRequired
                                    ? 'bg-gray-200 cursor-not-allowed'
                                    : 'bg-gray-100 focus:bg-blue-200 focus:ring-0'
                                    }`}
                            />
                        </TooltipTrigger>
                        {!isRequired && (
                            <TooltipContent>
                                <p>Please complete Asset, Cost Center, Fuel Type & Purpose first</p>
                            </TooltipContent>
                        )}
                    </Tooltip>
                </TooltipProvider>
            </td>
            <td className="border text-right">
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Input
                                type="text"
                                value={detail.end_odo !== undefined && detail.end_odo !== null && !isNaN(Number(detail.end_odo)) ? detail.end_odo : 0}
                                onKeyDown={handleNumericInput}
                                onChange={e => onChange(originalIndex, 'end_odo', validateNumericInput(e.target.value))}
                                readOnly={!isRequired}
                                className={`w-full text-right border-0 rounded-none ${!isRequired
                                    ? 'bg-gray-200 cursor-not-allowed'
                                    : 'bg-gray-100 focus:bg-blue-200 focus:ring-0'
                                    }`}
                            />
                        </TooltipTrigger>
                        {!isRequired && (
                            <TooltipContent>
                                <p>Please complete Asset, Cost Center, Fuel Type & Purpose first</p>
                            </TooltipContent>
                        )}
                    </Tooltip>
                </TooltipProvider>
            </td>
            <td className="border text-right">
                <Input
                    type="text"
                    value={detail.total_km !== undefined && detail.total_km !== null && !isNaN(Number(detail.total_km)) ? detail.total_km : 0}
                    readOnly
                    tabIndex={-1}
                    className="w-full text-right border-0 rounded-none bg-gray-100"
                />
            </td>
            <td className="border">
                <Input
                    type="text"
                    value={detail.total_litre !== undefined && detail.total_litre !== null && !isNaN(Number(detail.total_litre)) ? detail.total_litre : ''}
                    onKeyDown={handleNumericInput}
                    onChange={e => onChange(originalIndex, 'total_litre', validateNumericInput(e.target.value))}
                    readOnly={!isRequired}
                    className={`w-full text-right border-0 rounded-none ${!isRequired
                        ? 'bg-gray-200 cursor-not-allowed'
                        : 'bg-gray-100 focus:bg-blue-200 focus:ring-0'
                        }`}
                />
            </td>
            <td className="border">
                <Input
                    type="text"
                    value={detail.total_litre && Number(detail.total_litre) > 0
                        ? (Number(detail.total_km || 0) / Number(detail.total_litre)).toFixed(2)
                        : '0.00'}
                    readOnly
                    tabIndex={-1}
                    className="w-full text-right border-0 rounded-none bg-gray-100"
                />
            </td>
            <td className="border">
                <Input
                    type="text"
                    value={detail.amount !== undefined && detail.amount !== null && !isNaN(Number(detail.amount)) ? detail.amount : ''}
                    onKeyDown={handleNumericInput}
                    onChange={e => onChange(originalIndex, 'amount', validateNumericInput(e.target.value))}
                    readOnly={!isRequired}
                    className={`w-full text-right border-0 rounded-none ${!isRequired
                        ? 'bg-gray-200 cursor-not-allowed'
                        : 'bg-gray-100 focus:bg-blue-200 focus:ring-0'
                        }`}
                />
            </td>
        </tr>
    );
});
FuelDetailRow.displayName = 'FuelDetailRow';

const FuelMtnDetail: React.FC<FuelMtnDetailProps> = ({ stmtId: initialStmtId, onLeaveHandlerReady }) => {
	const router = useRouter();
	// Add state for current statement ID (can change after creation)
	const [currentStmtId, setCurrentStmtId] = useState(initialStmtId);

	const [data, setData] = useState<FuelBillDetail | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [editableDetails, setEditableDetails] = useState<FuelDetail[]>([]);
	const [search, setSearch] = useState('');
	const [showEmptyRowsOnly, setShowEmptyRowsOnly] = useState(false);

	// ActionSidebar state
	const [sidebarOpen, setSidebarOpen] = useState(false);
	const [editingDetailIndex, setEditingDetailIndex] = useState<number | null>(null);
	const [availableFleetCards, setAvailableFleetCards] = useState<FleetCard[]>([]);
	const [availableCostCenters, setAvailableCostCenters] = useState<CostCenter[]>([]);
	// Asset picker for Edit Detail Row
	const [editAssetPickerOpen, setEditAssetPickerOpen] = useState(false);
	const [editAssetOptions, setEditAssetOptions] = useState<{
		id: number;
		register_number?: string;
		costcenter?: { id: number; name: string } | null;
		fuel_type?: string;
		purpose?: string;
	}[]>([]);
	const [editAssetSearch, setEditAssetSearch] = useState('');

	// Add Fleet Card sidebar state
	const [addFleetCardSidebarOpen, setAddFleetCardSidebarOpen] = useState(false);
	const [availableFleetCardsToAdd, setAvailableFleetCardsToAdd] = useState<FleetCardWithAsset[]>([]);
	const [fleetCardSearch, setFleetCardSearch] = useState('');

	// Edit form state
	const [editFormData, setEditFormData] = useState({
		card_no: '',
		costcenter_id: '',
		fuel_type: '',
		purpose: 'project',
		asset_id: '',
	});
	const [editErrors, setEditErrors] = useState<{ asset_id?: string }>({});


	// Add state for summary fields with default values for RON95, RON97, Diesel
	const [summary, setSummary] = useState({
		stmt_stotal: '',
		stmt_disc: '',
		stmt_tax: '',
		stmt_rounding: '',
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

	// Add state for loadingDetails
	const [loadingDetails, setLoadingDetails] = useState(false);
	const [saving, setSaving] = useState(false);
	const [updatingDetail, setUpdatingDetail] = useState(false);

	// Draft handling and leave confirmation
    const draftKey = React.useMemo(() => {
        return currentStmtId && currentStmtId > 0 ? null : 'fuel-bill-draft';
    }, [currentStmtId]);
    const [draftLoaded, setDraftLoaded] = useState(false);
    const [showCancelDialog, setShowCancelDialog] = useState(false);
    const [draftDetailsRestored, setDraftDetailsRestored] = useState(false);
    const draftSaveTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

	const clearDraft = React.useCallback(() => {
		if (!draftKey) return;
		try {
			localStorage.removeItem(draftKey);
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

	// Initial warning dialogs to ensure fleetcard vehicle info is updated before billing
	const [showInitialWarning, setShowInitialWarning] = useState(true);
	const [showConfirmProceed, setShowConfirmProceed] = useState(false);

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
				if (typeof draft.showEmptyRowsOnly === 'boolean') setShowEmptyRowsOnly(draft.showEmptyRowsOnly);
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
        if (draftSaveTimer.current) {
            clearTimeout(draftSaveTimer.current);
        }
        draftSaveTimer.current = setTimeout(() => {
            try {
                const payload = {
                    header,
                    summary,
                    selectedVendor,
                    editableDetails,
                    showEmptyRowsOnly,
                    draftDetailsRestored,
                };
                localStorage.setItem(draftKey, JSON.stringify(payload));
            } catch {
                // ignore storage errors
            }
        }, 250);
        return () => {
            if (draftSaveTimer.current) {
                clearTimeout(draftSaveTimer.current);
            }
        };
    }, [draftKey, draftLoaded, draftDetailsRestored, editableDetails, header, selectedVendor, showEmptyRowsOnly, summary, currentStmtId]);

	// Save handler for form submission
	const handleSave = async () => {
		if (!validateForm()) {
			return;
		}

		setSaving(true);
		const payload = buildFormPayload();
		try {
			// POST for create, PUT for update
			if (!currentStmtId || currentStmtId === 0) {
				const response = await authenticatedApi.post<{ status: string; message: string; id: number }>('/api/bills/fuel', payload);
				toast.success('Fuel statement created successfully.');
				clearDraft();

				// Check if response contains the new ID
				if (response.data && response.data.id) {
					const newId = response.data.id;
					setCurrentStmtId(newId);

					// Update URL to include the new ID and reload to show the created record
					const currentUrl = new URL(window.location.href);
					currentUrl.searchParams.set('id', newId.toString());
					window.history.replaceState({}, '', currentUrl.toString());

					// Reload to fetch the newly created record
					// Commented out to allow browser inspection of network/devtools after create
					setTimeout(() => {
						window.location.reload();
					}, 1000);
				}
			} else {
				await authenticatedApi.put(`/api/bills/fuel/${currentStmtId}`, payload);
				toast.success('Fuel statement updated successfully.');
				clearDraft();
				setTimeout(() => {
					if (window.opener && typeof window.opener.reloadFuelBillGrid === 'function') {
						window.opener.reloadFuelBillGrid();
					}
					window.close();
				}, 1000);
			}
		} catch (err: any) {
			toast.error('Failed to save fuel statement.');
		} finally {
			setSaving(false);
		}
	};
	// ...existing state declarations...
	// Summarize amount by cost center


	// Split cost center summary by category (project, staffcost)
	const costCenterSummary = React.useMemo(() => {
		const summary: { [key: string]: number } = {};
		editableDetails.forEach(detail => {
			const ccName = detail.asset?.costcenter?.name || 'Unknown';
			const category = detail.asset?.purpose || 'project';
			const key = category === 'staff cost' ? `${ccName} (Staff Cost)` : ccName;
			const amt = parseFloat(detail.amount) || 0;
			if (!summary[key]) summary[key] = 0;
			summary[key] += amt;
		});
		return summary;
	}, [editableDetails]);

	// Helper to build form payload for API submission
	const buildFormPayload = () => {
		const petrolAmount = editableDetails
			.filter(d => d.asset?.fuel_type?.toLowerCase() === 'petrol')
			.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);
		const dieselAmount = editableDetails
			.filter(d => d.asset?.fuel_type?.toLowerCase() === 'diesel')
			.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);
		const totalKM = editableDetails.reduce((sum, d) => sum + (Number(d.total_km) || 0), 0);
		const totalLitre = editableDetails.reduce((sum, d) => sum + (parseFloat(d.total_litre) || 0), 0);

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
			petrol_amount: fmtAmount(petrolAmount),
			diesel_amount: fmtAmount(dieselAmount),
			stmt_ron95: fmtAmount(summary.stmt_ron95),
			stmt_ron97: fmtAmount(summary.stmt_ron97),
			stmt_diesel: fmtAmount(summary.stmt_diesel),
			stmt_count: editableDetails.length,
			stmt_total_km: fmtNum(totalKM),
			details: editableDetails.map(detail => {
				const asset = detail.asset || {};
				const costcenter: CostCenter | null = asset.costcenter || null;
				const totalKM = fmtNum(detail.total_km);
				const litre = fmtNum(detail.total_litre);
				return {
					asset_id: asset.asset_id,
					vehicle_id: asset.vehicle_id,
					stmt_date: header.stmt_date,
					card_id: detail.fleetcard?.id || '',
					costcenter_id: costcenter ? costcenter.id : null,
					entry_code: asset.entry_code ?? '',
					location_id: asset.locations ? asset.locations.id : asset.location_id ?? null,
					category: asset.purpose || 'project',
					start_odo: fmtNum(detail.start_odo),
					end_odo: fmtNum(detail.end_odo),
					total_km: totalKM,
					total_litre: litre,
					efficiency: litre > 0 ? fmtAmount(totalKM / litre) : '0.00',
					amount: fmtAmount(detail.amount)
				};
			})
		};
	};


	// Auto-calculate subtotal and total from details and discount (debounced)
	useEffect(() => {
		const handle = setTimeout(() => {
			const sumAmount = editableDetails.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);
			const discount = parseFloat(summary.stmt_disc) || 0;
			setSummary(prev => ({
				...prev,
				stmt_stotal: sumAmount.toFixed(2),
				stmt_total: (sumAmount - discount).toFixed(2),
			}));
		}, 120);
		return () => clearTimeout(handle);
	}, [editableDetails, summary.stmt_disc]);


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

		// Fetch fleet cards and cost centers for editing
		Promise.all([
			authenticatedApi.get<{ data: FleetCard[] }>('/api/bills/fleet'),
			authenticatedApi.get<{ data: CostCenter[] }>('/api/assets/costcenters')
		]).then(([fleetRes, costRes]) => {
			setAvailableFleetCards(fleetRes.data.data || []);
			setAvailableCostCenters(costRes.data.data || []);
		}).catch(err => {
			console.error('Error fetching reference data:', err);
		});

		// Only fetch bill detail if currentStmtId is a valid positive number
		if (currentStmtId && currentStmtId > 0) {
			authenticatedApi.get<{ data: FuelBillDetail }>(`/api/bills/fuel/${currentStmtId}`)
				.then(res => {
					setData(res.data.data);
					// normalize update response details into the UI shape
					const normalized = (res.data.data.details || []).map((d: any) => normalizeIncomingDetail(d));
					setEditableDetails(normalized);
					setSummary({
						stmt_stotal: res.data.data.stmt_stotal || '',
						stmt_disc: res.data.data.stmt_disc || '',
						stmt_tax: res.data.data.stmt_tax || '',
						stmt_rounding: res.data.data.stmt_rounding || '',
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
	useEffect(() => {
		// Only preload when creating a new statement (no currentStmtId)
		if (!selectedVendor) return;
		if (currentStmtId && currentStmtId > 0) return;
		if (draftDetailsRestored && editableDetails.length > 0) return;

		authenticatedApi.get<{ data: any[] }>(`/api/bills/fleet?vendor=${selectedVendor}`)
			.then(res => {
				const list = (res.data && Array.isArray(res.data.data)) ? res.data.data : [];
				// Normalize fleet items into the table's detail shape
				const normalized = list.map((item: any) => normalizeIncomingDetail(item));
				setEditableDetails(normalized);
			})
			.catch(err => {
				console.error('Error fetching fleet for vendor:', err);
			});
	}, [selectedVendor, currentStmtId]);

	const hasFormData = React.useMemo(() => {
		const headerFilled = header.stmt_no || header.stmt_date || header.stmt_litre;
		const summaryFilled = [
			summary.stmt_stotal,
			summary.stmt_disc,
			summary.stmt_tax,
			summary.stmt_rounding,
			summary.stmt_total,
		].some((v) => v && String(v).trim() !== '' && v !== '0' && v !== '0.00');
		const detailsFilled = editableDetails.length > 0;
		return Boolean(headerFilled || summaryFilled || selectedVendor || detailsFilled);
	}, [editableDetails.length, header.stmt_date, header.stmt_litre, header.stmt_no, selectedVendor, summary.stmt_disc, summary.stmt_rounding, summary.stmt_stotal, summary.stmt_tax, summary.stmt_total]);

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
		const assetId = assetObj.id ?? assetObj.asset_id ?? item.asset_id ?? 0;
		const registerNumber = assetObj.register_number ?? assetObj.vehicle_regno ?? item.register_number ?? '';
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

	const handleSummaryChange = (field: keyof typeof summary, value: string) => {
		setSummary(prev => ({ ...prev, [field]: value }));
	};

	const handleHeaderChange = (field: keyof typeof header, value: string) => {
		setHeader(prev => ({ ...prev, [field]: value }));
	};

	// Helper for numeric input restriction
	const handleNumericInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
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
	};

	// Helper for numeric value validation without aggressive replacement
	const validateNumericInput = (value: string): string => {
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
	};

	// Helper function to check if a detail row is considered "filled"
	const isRowFilled = (detail: FuelDetail): boolean => {
		const hasValidOdo = (detail.start_odo && Number(detail.start_odo) > 0) || (detail.end_odo && Number(detail.end_odo) > 0);
		const hasValidLitre = detail.total_litre && parseFloat(String(detail.total_litre)) > 0;
		const hasValidAmount = detail.amount && parseFloat(String(detail.amount)) > 0;
		return Boolean(hasValidOdo || hasValidLitre || hasValidAmount);
	};

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
	const filteredDetails = React.useMemo(() => editableDetails.filter(detail => {
		const q = search.toLowerCase();
		const regNo = detail.asset?.register_number?.toLowerCase() || '';
		const cardNo = detail.fleetcard?.card_no?.toLowerCase() || '';
		const matchesSearch = !q || regNo.includes(q) || cardNo.includes(q);
		if (showEmptyRowsOnly) {
			return matchesSearch && !isRowFilled(detail);
		}
		return matchesSearch;
	}), [editableDetails, search, showEmptyRowsOnly]);

	// Calculate entry status
	const filledRowsCount = editableDetails.filter(isRowFilled).length;
	const totalRowsCount = editableDetails.length;

	const handleVendorChange = async (fuelId: string) => {
		setSelectedVendor(fuelId);
		// Only in create mode (currentStmtId falsy or 0)
		if (!currentStmtId || currentStmtId === 0) {
			setLoadingDetails(true);
			try {
				// New backend: query fleet cards by vendor id
				const res = await authenticatedApi.get('/api/bills/fleet', { params: { vendor: fuelId } });
				let items = [];
				if (res.data && typeof res.data === 'object' && 'data' in res.data && Array.isArray((res.data as any).data)) {
					items = (res.data as any).data;
				} else if (Array.isArray(res.data)) {
					items = res.data;
				}
				const details = items.map((item: any) => normalizeIncomingDetail(item));
				setEditableDetails(details);
			} catch (err) {
				toast.error('Failed to load asset details for issuer.');
				setEditableDetails([]);
			} finally {
				setLoadingDetails(false);
			}
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

	// Handle opening the ActionSidebar for editing detail row
	const handleEditDetail = (index: number) => {
		const detail = editableDetails[index];
		if (detail) {
			setEditFormData({
				card_no: detail.fleetcard?.card_no || '',
				costcenter_id: String(detail.asset?.costcenter?.id || ''),
				fuel_type: detail.asset?.fuel_type || '',
				purpose: detail.asset?.purpose || 'project',
				asset_id: String(detail.asset?.asset_id || ''),
			});
		}
		setEditingDetailIndex(index);
		setSidebarOpen(true);
	};

	// Load active assets when opening the asset picker in edit sidebar
	useEffect(() => {
		if (!editAssetPickerOpen) return;
		if (editAssetOptions.length > 0) return;
		authenticatedApi
			.get<{ data: { id: number; register_number?: string; costcenter?: { id: number; name: string } | null; fuel_type?: string; purpose?: string }[] }>(
				'/api/assets',
				{ params: { type: 2, status: 'active' } }
			)
			.then(res => setEditAssetOptions(res.data?.data || []))
			.catch(() => {
				toast.error('Failed to load assets');
				setEditAssetOptions([]);
			});
	}, [editAssetPickerOpen, editAssetOptions.length]);

	// Handle updating the detail row from ActionSidebar
	/**
	 * Edit Detail Row — Save handler
	 * Endpoint: PUT `/api/bills/fleet/:card_id/billing`
	 * Payload fields:
	 * - card_id: number | undefined (fleet card id of the row)
	 * - asset_id: number | null (selected asset id)
	 * - costcenter_id: number | null (selected cost center id)
	 * - purpose: string ('project' | 'staff cost' | 'pool')
	 * - stmt_id: number (current statement id)
	 * - card_no: string (kept for compatibility)
	 */
	const handleUpdateDetail = async () => {
		if (editingDetailIndex === null) return;

		const detail = editableDetails[editingDetailIndex];
		if (!detail) return;

		// validation: asset is required
		if (!editFormData.asset_id) {
			setEditErrors(prev => ({ ...prev, asset_id: 'Asset is required' }));
			toast.error('Please select an asset');
			return;
		}
		setEditErrors(prev => ({ ...prev, asset_id: undefined }));

		setUpdatingDetail(true);
		try {
			// Prepare payload
			// Payload sent to backend to update fleet + statement linkage
			const payload = {
				card_id: detail.fleetcard?.id,
				asset_id: editFormData.asset_id ? parseInt(editFormData.asset_id) : detail.asset?.asset_id,
				costcenter_id: editFormData.costcenter_id ? parseInt(editFormData.costcenter_id) : null,
				purpose: editFormData.purpose,
				stmt_id: currentStmtId,
				// keep card_no for compatibility if backend uses it
				card_no: editFormData.card_no.trim(),
			};

			// Make PUT request to update the fleet card
			let response;
			if (detail.fleetcard?.id) {
				// Endpoint used to update: PUT /api/bills/fleet/:card_id/billing
				response = await authenticatedApi.put<{ status: string; message: string }>(`/api/bills/fleet/${detail.fleetcard.id}/billing`, payload);
			}

			// Check if the response indicates success
			if (response && response.data && response.data.status === 'success') {
				// Update local state immediately
				setEditableDetails(prev => prev.map((item, i) => {
					if (i !== editingDetailIndex) return item;

					const updated = { ...item };

					// Update fleet card number
					if (updated.fleetcard) {
						updated.fleetcard = { ...updated.fleetcard, card_no: payload.card_no };
					}

					// Update cost center
					if (payload.costcenter_id) {
						const costcenter = availableCostCenters.find(cc => cc.id === payload.costcenter_id);
						if (costcenter && updated.asset) {
							updated.asset = { ...updated.asset, costcenter };
						}
					} else {
						// Clear cost center if none selected
						if (updated.asset) {
							updated.asset = { ...updated.asset, costcenter: null };
						}
					}

					// Update purpose and fuel type
					if (updated.asset) {
						updated.asset = { ...updated.asset, purpose: payload.purpose, fuel_type: editFormData.fuel_type };
					}

					// Update asset selection (id + register_number)
					if (updated.asset) {
						const selected = editAssetOptions.find(a => a.id === payload.asset_id);
						const regNo = selected?.register_number || updated.asset.register_number;
						updated.asset = {
							...updated.asset,
							asset_id: payload.asset_id ?? updated.asset.asset_id,
							register_number: regNo,
						} as Asset;
					}

					return updated;
				}));

				setSidebarOpen(false);
				setEditingDetailIndex(null);
				toast.success(response.data.message || 'Detail updated successfully');
			} else {
				throw new Error('Update failed: Invalid response from server');
			}
		} catch (error: any) {
			console.error('Error updating detail:', error);
			const errorMessage = error.response?.data?.message || error.message || 'Failed to update detail';
			toast.error(errorMessage);
		} finally {
			setUpdatingDetail(false);
		}
	};

	// Handle opening the Add Fleet Card sidebar to pick new entry for consumer details
	const handleOpenAddFleetCard = async () => {
		try {
			// Fetch all available fleet cards
			const response = await authenticatedApi.get<{ data: FleetCardWithAsset[] }>('/api/bills/fleet');
			const allFleetCards = response.data.data || [];

			// Filter out fleet cards that are already in the details table
			const existingCardIds = editableDetails.map(detail => detail.fleetcard?.id).filter(Boolean);
			const availableCards = allFleetCards.filter(card => !existingCardIds.includes(card.id));

			setAvailableFleetCardsToAdd(availableCards);
			setAddFleetCardSidebarOpen(true);
		} catch (error) {
			console.error('Error fetching available fleet cards:', error);
			toast.error('Failed to load available fleet cards');
		}
	};

	// Handle adding a new bill entry into consumer details
	const handleAddFleetCard = async (fleetCard: FleetCardWithAsset) => {
		// Note: Cost center data may not be available in the API response for all fleet cards
		// If cost center is needed, it should be assigned manually after adding the fleet card

		// Create a new detail row with the selected fleet card
		const newDetail: FuelDetail = {
			s_id: Date.now(), // Use timestamp as temporary ID
			stmt_id: currentStmtId || 0,
			fleetcard: {
				id: fleetCard.id,
				card_no: fleetCard.card_no || '',
			},
			asset: {
				asset_id: (fleetCard as any)?.asset?.asset_id || (fleetCard as any)?.asset?.id || 0,
				register_number: fleetCard.asset?.register_number || '',
				fuel_type: (fleetCard.asset as any)?.fuel_type || '',
				costcenter: fleetCard.asset?.costcenter || null,
				purpose: fleetCard.asset?.purpose || 'project',
			},
			stmt_date: header.stmt_date || '',
			start_odo: 0,
			end_odo: 0,
			total_km: 0,
			total_litre: '',
			amount: '',
		};

		// If editing an existing statement, persist to backend first
		if (currentStmtId && currentStmtId > 0) {
			let loadingToastId: any;
			try {
				setLoadingDetails(true);
				loadingToastId = toast.loading('Adding fleet card...');
				// Build required payload for backend
				const payload = {
					stmt_id: currentStmtId,
					card_id: fleetCard.id,
					asset_id: (fleetCard as any)?.asset?.asset_id ?? (fleetCard as any)?.asset?.id ?? null,
					cc_id: fleetCard.asset?.costcenter?.id ?? null,
					loc_id: (fleetCard.asset?.locations?.id as number | undefined) ?? (fleetCard.asset?.location_id as number | undefined) ?? null,
					purpose: fleetCard.asset?.purpose || 'project',
					stmt_date: header.stmt_date || '',
				};

				// POST /api/bills/fuel/{stmt_id}/new-bill-entry with required payload
				const res = await authenticatedApi.post(`/api/bills/fuel/${currentStmtId}/new-bill-entry`, payload);

				// Try to take s_id from server response if present
				const serverSid: number | undefined = (res as any)?.data?.data?.s_id
					?? (res as any)?.data?.s_id
					?? (res as any)?.data?.entry?.s_id;

				// Optimistically update UI after success (use server s_id when available)
				const detailToAdd = serverSid ? { ...newDetail, s_id: serverSid } : newDetail;
				setEditableDetails(prev => [...prev, detailToAdd]);
				setAvailableFleetCardsToAdd(prev => {
					const updatedCards = prev.filter(card => card.id !== fleetCard.id);
					if (updatedCards.length === 0) setAddFleetCardSidebarOpen(false);
					return updatedCards;
				});

				const msg = (res && (res as any).data && (res as any).data.message) || `Fleet card ${fleetCard.card_no} added successfully`;
				toast.success(msg);
				if (loadingToastId) toast.dismiss(loadingToastId);
			} catch (error: any) {
				console.error('Error adding new bill entry:', error);
				const errorMessage = error?.response?.data?.message || error?.message || 'Failed to add fleet card';
				toast.error(errorMessage);
				if (loadingToastId) toast.dismiss(loadingToastId);
				return; // abort local state update on failure
			} finally {
				setLoadingDetails(false);
			}
		} else {
			// In create mode (no stmt yet), just add locally
			setEditableDetails(prev => [...prev, newDetail]);
			setAvailableFleetCardsToAdd(prev => {
				const updatedCards = prev.filter(card => card.id !== fleetCard.id);
				if (updatedCards.length === 0) setAddFleetCardSidebarOpen(false);
				return updatedCards;
			});
			toast.success(`Fleet card ${fleetCard.card_no} added. Will be saved on submit.`);
		}
	};

	// Remove an existing bill entry
	const handleRemoveDetail = async (detail: FuelDetail) => {
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

			// Return fleet card to available list if no other rows use it
			const cardId = detail.fleetcard?.id;
			if (cardId) {
				const stillUsed = editableDetails.some(d => d.fleetcard?.id === cardId && d.s_id !== rowSid);
				const alreadyAvailable = availableFleetCardsToAdd.some(c => c.id === cardId);
				if (!stillUsed && !alreadyAvailable) {
					setAvailableFleetCardsToAdd(prev => ([
						...prev,
						{ id: cardId, card_no: detail.fleetcard?.card_no || '', asset: detail.asset } as FleetCardWithAsset,
					]));
				}
			}

			toast.success('Entry removed successfully');
		} catch (error: any) {
			const msg = error?.response?.data?.message || error?.message || 'Failed to remove entry';
			toast.error(msg);
		} finally {
			if (loadingToastId) toast.dismiss(loadingToastId);
		}
	};

	// Get current editing detail
	const currentEditingDetail = editingDetailIndex !== null ? editableDetails[editingDetailIndex] : null;

	if (loading) return <div className="p-4">Loading...</div>;
	// Only show No data found if in edit mode and no data
	if ((currentStmtId && currentStmtId > 0) && !data) return <div className="p-4">No data found.</div>;

	return (
		<div className="w-full min-h-screen bg-gray-50 dark:bg-gray-800">
			{/* Initial Fleetcard Update Warning */}
			<AlertDialog open={showInitialWarning} onOpenChange={setShowInitialWarning}>
				<AlertDialogContent className="sm:max-w-xl md:max-w-2xl bg-linear-to-br dark:from-slate-900/70 dark:to-slate-900/30 text-red-600 dark:text-red-500 backdrop-blur-md">
					<AlertDialogHeader>
						<AlertDialogTitle className="text-xl md:text-2xl font-extrabold text-red-600 dark:text-red-100">Before You Proceed</AlertDialogTitle>
						<AlertDialogDescription className="text-base md:text-lg text-red-600/90 dark:text-red-100/90">
							Please ensure each fleet card has the correct vehicle assigned in the Fleet Card records. Update vehicle, cost center, fuel type, and purpose there first before making bill entries in this form.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
                        <AlertDialogCancel onClick={() => goBackToList(true)}>Exit</AlertDialogCancel>
						<AlertDialogAction onClick={() => { setShowInitialWarning(false); setShowConfirmProceed(true); }}>Proceed</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* Proceed Confirmation */}
			<AlertDialog open={showConfirmProceed} onOpenChange={setShowConfirmProceed}>
				<AlertDialogContent className="sm:max-w-xl bg-linear-to-br dark:from-slate-900/70 dark:to-slate-900/30 text-red-600 dark:text-red-100 backdrop-blur-md">
					<AlertDialogHeader>
						<AlertDialogTitle className="text-lg md:text-xl font-bold text-red-600 dark:text-red-100">Confirm Fleet Info Updated</AlertDialogTitle>
						<AlertDialogDescription className="text-base md:text-lg text-red-600/90 dark:text-red-100/90">
							I confirm that I have reviewed and updated the fleet card information before proceeding with bill entry.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
                        <AlertDialogCancel onClick={() => goBackToList(true)}>Exit</AlertDialogCancel>
						<AlertDialogAction onClick={() => setShowConfirmProceed(false)}>I Confirm</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
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
			<div className="flex flex-col lg:flex-row gap-4">
				<div className="pt-4 w-full space-y-6">
					<div className="border rounded p-4 bg-white dark:bg-gray-900 shadow-sm">
						<div className="flex items-center justify-between mb-2">
							<h1 className="text-2xl font-semibold">Statement Info</h1>
							{selectedVendor && getVendorLogo(selectedVendor) ? (

								<img src={getVendorLogo(selectedVendor)} alt="vendor logo" className="w-12 h-12 object-contain rounded" />
							) : null}
						</div>
						<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-4">
							<div className="flex flex-col">
								<label className={`font-medium mb-1 ${errors.vendor ? 'text-red-500' : 'text-gray-800'}`}>
									Issuer {(!currentStmtId || currentStmtId === 0) && <span className="text-red-500">*</span>}
							</label>
								<div className="flex items-center gap-3">
									<Select value={selectedVendor} onValueChange={handleVendorChange}>
										<SelectTrigger className={`w-full ${(!currentStmtId || currentStmtId === 0) && !selectedVendor ? 'ring-2 ring-yellow-300 ring-opacity-50' : ''}`}>
											<SelectValue placeholder="Select Issuer" />
										</SelectTrigger>
										<SelectContent>
											<SelectGroup>
												<SelectLabel>Fuel Vendor</SelectLabel>
												{vendors.map(v => (
													<SelectItem key={v.fuel_id} value={String(v.fuel_id)}>
														<div className="flex items-center gap-2">
															{v.logo ? (

																<img src={v.logo} alt={v.vendor} className="w-6 h-6 object-contain rounded" />
															) : null}
															<span>{v.vendor}</span>
														</div>
													</SelectItem>
												))}
											</SelectGroup>
										</SelectContent>
									</Select>

									{/* selected vendor inline preview removed per request */}
								</div>
							</div>
							<div className="flex flex-col">
								<label htmlFor="stmt_no" className={`font-medium mb-1 ${errors.stmt_no ? 'text-red-500' : 'text-gray-800'}`}>
									Statement No {(!currentStmtId || currentStmtId === 0) && <span className="text-red-500">*</span>}
								</label>
								<Input
									id="stmt_no"
									type="text"
									value={header.stmt_no}
									onChange={e => handleHeaderChange('stmt_no', e.target.value)}
									className={`w-full text-right uppercase ${(!currentStmtId || currentStmtId === 0) && !header.stmt_no.trim() ? 'ring-2 ring-yellow-300 ring-opacity-50' : ''}`}
								/>
							</div>

							<div className="flex flex-col">
								<label htmlFor="stmt_date" className={`font-medium mb-1 ${errors.stmt_date ? 'text-red-500' : 'text-gray-800'}`}>
									Statement Date {(!currentStmtId || currentStmtId === 0) && <span className="text-red-500">*</span>}
								</label>
								<Input
									id="stmt_date"
									type="date"
									value={header.stmt_date}
									onChange={e => handleHeaderChange('stmt_date', e.target.value)}
									className={`w-full text-right ${(!currentStmtId || currentStmtId === 0) && !header.stmt_date.trim() ? 'ring-2 ring-yellow-300 ring-opacity-50' : ''}`}
								/>
							</div>
							<div className="flex flex-col">
								<span className="font-medium mb-1">Total Litre</span>
								<Input
									type="text"
									value={editableDetails.reduce((sum, d) => sum + (parseFloat(d.total_litre) || 0), 0).toFixed(2)}
									readOnly
									className="w-full text-right"
								/>
							</div>
						</div>

						<div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mt-4">
							<div className="flex-1">
								<div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4 mb-4">
									<div className="flex flex-col">
										<span className="font-medium mb-1">Sub-Total</span>
										<Input
											type="text"
											value={summary.stmt_stotal !== undefined && summary.stmt_stotal !== null && summary.stmt_stotal !== '' && !isNaN(Number(summary.stmt_stotal)) ? Number(summary.stmt_stotal).toFixed(2) : '0.00'}
											readOnly
											className="w-full text-right bg-gray-100"
										/>
									</div>

									<div className="flex flex-col">
										<span className="font-medium mb-1">Discount/Rebate</span>
										<Input
											type="text"
											value={summary.stmt_disc !== undefined && summary.stmt_disc !== null && summary.stmt_disc !== '' && !isNaN(Number(summary.stmt_disc)) ? Number(summary.stmt_disc).toFixed(2) : '0.00'}
											onKeyDown={handleNumericInput}
											onChange={e => handleSummaryChange('stmt_disc', validateNumericInput(e.target.value))}
											className="w-full text-right"
										/>
									</div>
									<div className="flex flex-col">
										<span className="font-medium mb-1">Grand-Total</span>
										<Input
											type="text"
											value={summary.stmt_total !== undefined && summary.stmt_total !== null && summary.stmt_total !== '' && !isNaN(Number(summary.stmt_total)) ? Number(summary.stmt_total).toFixed(2) : '0.00'}
											readOnly
											className="w-full text-right bg-gray-100"
										/>
									</div>
									<div className="flex flex-col">
										<span className="font-medium mb-1">Petrol Amount</span>
										<Input
											type="text"
											value={(() => {
												return editableDetails
													.filter(d => d.asset?.fuel_type?.toLowerCase() === 'petrol')
													.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0)
													.toFixed(2);
											})()}
											readOnly
											className="w-full text-right bg-gray-100"
										/>
									</div>
									<div className="flex flex-col">
										<span className="font-medium mb-1">Diesel Amount</span>
										<Input
											type="text"
											value={(() => {
												return editableDetails
													.filter(d => d.asset?.fuel_type?.toLowerCase() === 'diesel')
													.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0)
													.toFixed(2);
											})()}
											readOnly
											className="w-full text-right bg-gray-100"
										/>
									</div>
									<div className="flex flex-col">
										<span className="font-medium mb-1">Total KM</span>
										<Input
											type="text"
											value={editableDetails.reduce((sum, d) => sum + (Number(d.total_km) || 0), 0)}
											readOnly
											className="w-full text-right bg-gray-100"
										/>
									</div>
								</div>
							</div>
							{/* Stack for RON95, RON97, Diesel */}
							<div className="flex-col space-y-2 w-full md:w-auto md:min-w-70 mt-4 md:mt-0">
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

						<div className="flex justify-center gap-2 mt-6">
							{(!currentStmtId || currentStmtId === 0) ? (
								<Button
									type="button"
									onClick={handleSave}
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
								<Button type="button" variant="default" onClick={handleSave} disabled={saving}>
									{saving && <Loader2 className="animate-spin w-4 h-4 mr-2" />}
									{saving ? "Saving..." : "Save Changes"}
								</Button>
							)}
							<Button type="button" variant="destructive" onClick={() => setShowCancelDialog(true)}>Cancel</Button>
						</div>
					</div>
					<div>
						<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-2 gap-2">
							<div className="flex items-center gap-4 flex-wrap">
								<h3 className="text-xl font-semibold flex items-center gap-2">
									Consumer Details
									{loadingDetails && <Loader2 className="animate-spin text-primary w-5 h-5" />}
								</h3>
								<div className="flex items-center gap-2 flex-wrap">
									<TooltipProvider>
										<Tooltip>
											<TooltipTrigger>
												<span className={`text-sm px-4 py-1.5 rounded-full ${filledRowsCount === totalRowsCount
													? 'text-green-800 dark:bg-green-900 dark:text-green-200'
													: 'text-red-500 dark:bg-yellow-900 dark:text-yellow-200'
													}`}>
													{filledRowsCount} / {totalRowsCount} filled
												</span>
											</TooltipTrigger>
											<TooltipContent>
												<p>
													{filledRowsCount === totalRowsCount
														? 'All entries have been filled'
														: `${totalRowsCount - filledRowsCount} entries remaining to fill`
													}
												</p>
											</TooltipContent>
										</Tooltip>
									</TooltipProvider>
									<Button
										type="button"
										variant={showEmptyRowsOnly ? "default" : "outline"}
										size="sm"
										onClick={() => setShowEmptyRowsOnly(!showEmptyRowsOnly)}
										className="text-xs bg-blue-500 text-white hover:bg-blue-600 hover:text-white"
									>
										{showEmptyRowsOnly ? "Show All" : "Show Empty Rows Only"}
									</Button>
									<Button
										type="button"
										variant="outline"
										size="sm"
										onClick={handleOpenAddFleetCard}
										className="text-xs bg-green-600 text-white hover:bg-green-700 hover:text-white flex items-center gap-1"
									>
										<PlusCircle className="w-4 h-4" />
										Add Fleet Card
									</Button>
								</div>
							</div>
							<Input
								type="text"
								placeholder="Search Asset or Card..."
								value={search}
								onChange={e => setSearch(e.target.value)}
								className="w-full sm:w-56"
							/>
						</div>
						{(showEmptyRowsOnly || search) && (
							<div className="mb-2 text-xs text-gray-500 dark:text-gray-400">
								{showEmptyRowsOnly && "Showing empty rows only"}
								{showEmptyRowsOnly && search && " • "}
								{search && `Filtered by: "${search}"`}
								{" • "}{filteredDetails.length} row{filteredDetails.length !== 1 ? 's' : ''} displayed
							</div>
						)}
						<div className="overflow-x-auto max-h-125 overflow-y-auto mb-6">
							<table className="min-w-full border text-sm">
								<thead className="bg-gray-200 sticky -top-1 z-10">
									<tr>
										<th className="border px-2 py-1.5 w-12">#</th>
										<th className="border px-2 py-1.5">Fleet Card</th>
										<th className="border px-2 py-1.5">Asset</th>
										<th className="border px-2 py-1.5">Cost Center</th>
										<th className="border px-2 py-1.5">Fuel Type</th>
										<th className="border px-2 py-1.5">Purpose</th>
										<th className="border px-2 py-1.5 text-right">Start ODO</th>
										<th className="border px-2 py-1.5 text-right">End ODO</th>
										<th className="border px-2 py-1.5 text-right">Total KM</th>
										<th className="border px-2 py-1.5">Litre</th>
										<th className="border px-2 py-1.5">Efficiency (KM/L)</th>
										<th className="border px-2 py-1.5">Amount</th>
									</tr>
								</thead>
								<tbody>
									{filteredDetails.map((detail, idx) => {
										const isEmpty = !isRowFilled(detail);
										const originalIndex = editableDetails.findIndex(d => d.s_id === detail.s_id);
										return (
											<tr
												key={detail.s_id}
												className={showEmptyRowsOnly && isEmpty ? 'bg-yellow-50 dark:bg-yellow-900/20' : ''}
											>
												<td className="border px-2 text-center">
													<div className="flex items-center justify-center gap-1">
														<span>{idx + 1}</span>
														<TooltipProvider>
															<Tooltip>
																<TooltipTrigger asChild>
																	<Button
																		type="button"
																		variant="ghost"
																		size="sm"
																		onClick={() => handleEditDetail(originalIndex)}
																		className="p-1 h-6 w-6 hover:bg-blue-100"
																	>
																		<Edit3 size={12} className="text-blue-600" />
																	</Button>
																</TooltipTrigger>
																<TooltipContent>
																	<p>Edit Fleet Card, Cost Center, Fuel Type & Purpose</p>
																</TooltipContent>
															</Tooltip>
														</TooltipProvider>
														<TooltipProvider>
															<Tooltip>
																<TooltipTrigger asChild>
																	<Button
																		type="button"
																		variant="ghost"
																		size="sm"
																		onClick={() => handleRemoveDetail(detail)}
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
												<td className="border px-2">{detail.fleetcard?.card_no || ''}</td>
												<td className="border px-2">{detail.asset?.register_number || ''}</td>
												<td className="border px-2">{detail.asset?.costcenter?.name || ''}</td>
												<td className="border px-2">{detail.asset?.fuel_type || ''}</td>
												<td className="border px-2">{detail.asset?.purpose || ''}</td>
												<td className="border text-right">
													<TooltipProvider>
														<Tooltip>
															<TooltipTrigger asChild>
																<Input
																	type="text"
																	value={detail.start_odo !== undefined && detail.start_odo !== null && !isNaN(Number(detail.start_odo)) ? detail.start_odo : 0}
																	onKeyDown={handleNumericInput}
																	onChange={e => handleDetailChange(originalIndex, 'start_odo', validateNumericInput(e.target.value))}
																	readOnly={!isRowRequiredFieldsFilled(detail)}
																	className={`w-full text-right border-0 rounded-none ${!isRowRequiredFieldsFilled(detail)
																		? 'bg-gray-200 cursor-not-allowed'
																		: 'bg-gray-100 focus:bg-blue-200 focus:ring-0'
																		}`}
																/>
															</TooltipTrigger>
															{!isRowRequiredFieldsFilled(detail) && (
																<TooltipContent>
																	<p>Please complete Asset, Cost Center, Fuel Type & Purpose first</p>
																</TooltipContent>
															)}
														</Tooltip>
													</TooltipProvider>
												</td>
												<td className="border text-right">
													<TooltipProvider>
														<Tooltip>
															<TooltipTrigger asChild>
																<Input
																	type="text"
																	value={detail.end_odo !== undefined && detail.end_odo !== null && !isNaN(Number(detail.end_odo)) ? detail.end_odo : 0}
																	onKeyDown={handleNumericInput}
																	onChange={e => handleDetailChange(originalIndex, 'end_odo', validateNumericInput(e.target.value))}
																	readOnly={!isRowRequiredFieldsFilled(detail)}
																	className={`w-full text-right border-0 rounded-none ${!isRowRequiredFieldsFilled(detail)
																		? 'bg-gray-200 cursor-not-allowed'
																		: 'bg-gray-100 focus:bg-blue-200 focus:ring-0'
																		}`}
																/>
															</TooltipTrigger>
															{!isRowRequiredFieldsFilled(detail) && (
																<TooltipContent>
																	<p>Please complete Asset, Cost Center, Fuel Type & Purpose first</p>
																</TooltipContent>
															)}
														</Tooltip>
													</TooltipProvider>
												</td>
												<td className="border text-right">
													<Input
														type="text"
														value={detail.total_km !== undefined && detail.total_km !== null && !isNaN(Number(detail.total_km)) ? detail.total_km : 0}
														readOnly
														tabIndex={-1}
														className="w-full text-right border-0 rounded-none bg-gray-100"
													/>
												</td>
												<td className="border text-right">
													<TooltipProvider>
														<Tooltip>
															<TooltipTrigger asChild>
																<Input
																	type="text"
																	value={detail.total_litre !== undefined && detail.total_litre !== null && !isNaN(Number(detail.total_litre)) && detail.total_litre !== '' ? detail.total_litre : 0}
																	onKeyDown={handleNumericInput}
																	onChange={e => handleDetailChange(originalIndex, 'total_litre', validateNumericInput(e.target.value))}
																	readOnly={!isRowRequiredFieldsFilled(detail)}
																	className={`w-full text-right border-0 rounded-none ${!isRowRequiredFieldsFilled(detail)
																		? 'bg-gray-200 cursor-not-allowed'
																		: 'bg-gray-100 focus:bg-blue-200 focus:ring-0'
																		}`}
																/>
															</TooltipTrigger>
															{!isRowRequiredFieldsFilled(detail) && (
																<TooltipContent>
																	<p>Please complete Asset, Cost Center, Fuel Type & Purpose first</p>
																</TooltipContent>
															)}
														</Tooltip>
													</TooltipProvider>
												</td>
												<td className="border text-right">
													<Input
														type="text"
														value={
															detail.total_litre !== undefined && detail.total_litre !== null && !isNaN(Number(detail.total_litre)) && Number(detail.total_litre) !== 0
																? (Number(detail.total_km) / Number(detail.total_litre)).toFixed(2)
																: '0.00'
														}
														readOnly
														tabIndex={-1}
														className="w-full text-right border-0 rounded-none bg-gray-100"
													/>
												</td>
												<td className="border text-right">
													<TooltipProvider>
														<Tooltip>
															<TooltipTrigger asChild>
																<Input
																	type="text"
																	value={detail.amount !== undefined && detail.amount !== null && !isNaN(Number(detail.amount)) && detail.amount !== '' ? detail.amount : 0}
																	onKeyDown={handleNumericInput}
																	onChange={e => handleDetailChange(originalIndex, 'amount', validateNumericInput(e.target.value))}
																	readOnly={!isRowRequiredFieldsFilled(detail)}
																	className={`w-full text-right border-0 rounded-none ${!isRowRequiredFieldsFilled(detail)
																		? 'bg-gray-200 cursor-not-allowed'
																		: 'bg-gray-100 focus:bg-blue-200 focus:ring-0'
																		}`}
																/>
															</TooltipTrigger>
															{!isRowRequiredFieldsFilled(detail) && (
																<TooltipContent>
																	<p>Please complete Asset, Cost Center, Fuel Type & Purpose first</p>
																</TooltipContent>
															)}
														</Tooltip>
													</TooltipProvider>
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>
					</div>
				</div>
				<div className="pt-4 w-full lg:max-w-sm space-y-6">
					<div className="w-full border rounded p-4 bg-indigo-50 dark:bg-gray-900 shadow-sm h-fit">
						<h3 className="text-lg font-semibold mb-4">Amount by Cost Center</h3>
						<table className="min-w-full border text-xs">
							<thead className="bg-gray-200">
								<tr>
									<th className="border px-2 py-1.5 text-left">Cost Center</th>
									<th className="border px-2 py-1.5 text-right">Amount</th>
								</tr>
							</thead>
							<tbody>
								{Object.entries(costCenterSummary).map(([cc, amt]) => (
									<tr key={cc}>
										<td className="border px-2 py-1.5">{cc}</td>
										<td className="border px-2 py-1.5 text-right">{amt.toFixed(2)}</td>
									</tr>
								))}
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

			{/* ActionSidebar for editing detail row */}
			{sidebarOpen && (
				<ActionSidebar
					title="Edit Detail Row"
					onClose={() => {
						setSidebarOpen(false);
						setEditingDetailIndex(null);
						setEditAssetPickerOpen(false);
					}}
					size={editAssetPickerOpen ? 'md' : 'sm'}
					content={
						currentEditingDetail ? (
							<div className={editAssetPickerOpen ? 'flex gap-4' : 'space-y-4'}>
								<div className={editAssetPickerOpen ? 'space-y-4 flex-1' : ''}>
									<div>
										<label className="block text-sm font-medium mb-2">Fleet Card</label>
										<Input
											type="text"
											value={editFormData.card_no}
											onChange={(e) => setEditFormData(prev => ({ ...prev, card_no: e.target.value }))}
											placeholder="Enter fleet card number"
											className="w-full"
											onBlur={(e) => setEditFormData(prev => ({ ...prev, card_no: e.target.value.trim() }))}
										/>
									</div>
									<div>
										<label className="block text-sm font-medium mb-2">Asset</label>
										<div className="relative">
											<Input
												readOnly
												placeholder="No asset selected"
												className={`pr-10 cursor-pointer ${editErrors.asset_id ? 'border-red-500 focus:ring-red-500' : ''}`}
												onClick={() => setEditAssetPickerOpen(true)}
												value={(() => {
													const id = editFormData.asset_id;
													if (!id) return '';
													const fromOptions = editAssetOptions.find(a => String(a.id) === String(id));
													if (fromOptions) return fromOptions.register_number || `#${fromOptions.id}`;
													// fallback to current row asset
													if (currentEditingDetail?.asset?.asset_id && String(currentEditingDetail.asset.asset_id) === String(id)) {
														return currentEditingDetail.asset.register_number || `#${id}`;
													}
													return `#${id}`;
												})()}
											/>
											<button
												type="button"
												className="absolute right-2 top-1/2 -translate-y-1/2 text-amber-500 hover:text-amber-600"
												title="Choose from assets"
												onClick={() => setEditAssetPickerOpen(true)}
												aria-label="Open asset picker"
											>
												<ArrowBigRight />
											</button>
											{editErrors.asset_id && (
												<p className="mt-1 text-sm text-red-600">{editErrors.asset_id}</p>
											)}
										</div>
									</div>
									<div>
										<label className="block text-sm font-medium mb-2">Cost Center</label>
										<Select
											value={editFormData.costcenter_id}
											onValueChange={(value) => setEditFormData(prev => ({ ...prev, costcenter_id: value }))}
										>
											<SelectTrigger className="w-full">
												<SelectValue placeholder="Select Cost Center" />
											</SelectTrigger>
											<SelectContent>
												<SelectGroup>
													<SelectLabel>Cost Centers</SelectLabel>
													{availableCostCenters.map(cc => (
														<SelectItem key={cc.id} value={String(cc.id)}>
															{cc.name}
														</SelectItem>
													))}
												</SelectGroup>
											</SelectContent>
										</Select>
									</div>

									<div>
										<label className="block text-sm font-medium mb-2">Fuel Type</label>
										<Select
											value={editFormData.fuel_type}
											onValueChange={(value) => setEditFormData(prev => ({ ...prev, fuel_type: value }))}
										>
											<SelectTrigger className="w-full">
												<SelectValue placeholder="Select Fuel Type" />
											</SelectTrigger>
											<SelectContent>
												<SelectGroup>
													<SelectLabel>Fuel Type</SelectLabel>
													<SelectItem value="petrol">Petrol</SelectItem>
													<SelectItem value="diesel">Diesel</SelectItem>
												</SelectGroup>
											</SelectContent>
										</Select>
									</div>

									<div>
										<label className="block text-sm font-medium mb-2">Purpose</label>
										<Select
											value={editFormData.purpose}
											onValueChange={(value) => setEditFormData(prev => ({ ...prev, purpose: value }))}
										>
											<SelectTrigger className="w-full">
												<SelectValue placeholder="Select Purpose" />
											</SelectTrigger>
											<SelectContent>
												<SelectGroup>
													<SelectLabel>Purpose</SelectLabel>
													<SelectItem value="project">Project</SelectItem>
													<SelectItem value="staff cost">Staff Cost</SelectItem>
													<SelectItem value="pool">Poolcar</SelectItem>
												</SelectGroup>
											</SelectContent>
										</Select>
									</div>

									<div className="flex gap-2 pt-4">
										<Button onClick={handleUpdateDetail} className="flex-1" disabled={updatingDetail}>
											{updatingDetail && <Loader2 className="animate-spin w-4 h-4 mr-2" />}
											{updatingDetail ? "Saving..." : "Save Changes"}
										</Button>
										<Button
											variant="outline"
											onClick={() => {
												setSidebarOpen(false);
												setEditingDetailIndex(null);
												setEditAssetPickerOpen(false);
											}}
											className="flex-1"
										>
											Cancel
										</Button>
									</div>
								</div>
								{editAssetPickerOpen && (
									<div className="w-96 border-l pl-4">
										<div className="flex items-center justify-between mb-2">
											<h3 className="font-semibold">Select Asset</h3>
											<Button size="sm" variant="default" onClick={() => setEditAssetPickerOpen(false)}>Hide List</Button>
										</div>
										<Input placeholder="Search..." value={editAssetSearch} onChange={e => setEditAssetSearch(e.target.value)} className="mb-3" />
										<div className="max-h-150 overflow-y-auto space-y-2">
											{editAssetOptions
												.filter(a => (a.register_number || '').toLowerCase().includes(editAssetSearch.toLowerCase()))
												.map(a => (
													<div key={a.id} className="p-2 border rounded hover:bg-amber-50 flex items-center justify-between">
														<div>
															<div className="font-medium">{a.register_number || `#${a.id}`}</div>
															<div className="text-xs text-gray-500">Cost Ctr: {a.costcenter?.name || '-'}</div>
															<div className="text-xs text-gray-500">Fuel: {a.fuel_type || '-'}</div>
															<div className="text-xs text-gray-500">Purpose: {a.purpose || '-'}</div>
														</div>
														<span
															className="text-green-500 cursor-pointer"
															onClick={() => {
																setEditFormData(prev => ({
																	...prev,
																	asset_id: String(a.id),
																	costcenter_id: a.costcenter?.id ? String(a.costcenter.id) : '',
																	fuel_type: a.fuel_type || '',
																	purpose: a.purpose || 'project',
																}));
																setEditAssetPickerOpen(false);
															}}
															title="Select this asset"
														>
															<ArrowBigLeft />
														</span>
													</div>
												))}
										</div>
									</div>
								)}
							</div>
						) : null
					}
				/>
			)}

			{/* ActionSidebar for adding fleet cards */}
			{addFleetCardSidebarOpen && (
				<ActionSidebar
					title="Add Fleet Card"
					onClose={() => {
						setAddFleetCardSidebarOpen(false);
						setAvailableFleetCardsToAdd([]);
						setFleetCardSearch('');
					}}
					size={'sm'}
					content={
						<div className="space-y-4">
							<div className="text-xs text-red-600 mb-4">
								Select a fleet card to add to your fuel statement. Only fleet cards not already in the details table are shown.
							</div>

							{/* Search Input */}
							<div className="mb-4">
								<Input
									type="text"
									placeholder="Search by card number or vehicle..."
									value={fleetCardSearch}
									onChange={(e) => setFleetCardSearch(e.target.value)}
									className="w-full"
								/>
							</div>

							{availableFleetCardsToAdd.length === 0 ? (
								<div className="text-center py-8 text-gray-500">
									<p>No available fleet cards to add.</p>
									<p className="text-xs mt-2">All fleet cards are already included in the details table.</p>
								</div>
							) : (
								<div className="space-y-2 max-h-150 overflow-y-auto">
									{availableFleetCardsToAdd
										.filter(card => {
											if (!fleetCardSearch) return true;
											const searchLower = fleetCardSearch.toLowerCase();
											return (
												card.card_no?.toLowerCase().includes(searchLower) ||
												card.asset?.register_number?.toLowerCase().includes(searchLower)
											);
										})
										.map((card) => (
											<div
												key={card.id}
												className="border rounded-lg p-3 hover:bg-gray-50 cursor-pointer transition-colors"
												onClick={() => handleAddFleetCard(card)}
											>
												<div className="flex items-center justify-between">
													<div className="flex items-center gap-3 flex-1">
														<PlusCircle
															className="w-5 h-5 text-green-600 hover:text-green-700 cursor-pointer shrink-0"
															onClick={(e) => {
																e.stopPropagation();
																handleAddFleetCard(card);
															}}
														/>
														<div className="flex-1">
															<div className="font-medium text-gray-900">
																Fleet Card: {card.card_no}
															</div>
															{card.asset && (
																<div className="text-sm text-gray-600 mt-1">
																	<div>Vehicle: {card.asset.register_number}</div>
																	<div>Fuel Type: {(card.asset as any).fuel_type}</div>
																	{card.asset.costcenter && (
																		<div>Cost Center: {card.asset.costcenter.name}</div>
																	)}
																	<div>Purpose: {card.asset.purpose || 'project'}</div>
																</div>
															)}
														</div>
													</div>
												</div>
											</div>
										))}
									{availableFleetCardsToAdd.filter(card => {
										if (!fleetCardSearch) return true;
										const searchLower = fleetCardSearch.toLowerCase();
										return (
											card.card_no?.toLowerCase().includes(searchLower) ||
											card.asset?.register_number?.toLowerCase().includes(searchLower)
										);
									}).length === 0 && fleetCardSearch && (
											<div className="text-center py-8 text-gray-500">
												<p>No fleet cards found matching &quot;{fleetCardSearch}&quot;</p>
											</div>
										)}
								</div>
							)}

							<div className="flex justify-end pt-4 border-t">
								<Button
									variant="outline"
									onClick={() => {
										setAddFleetCardSidebarOpen(false);
										setAvailableFleetCardsToAdd([]);
										setFleetCardSearch('');
									}}
								>
									Close
								</Button>
							</div>
						</div>
					}
				/>
			)}
		</div>

	);
};

export default FuelMtnDetail;

/*
ToDo:
- implement logic that sum of amount column will be auto calculated and displayed in subtotal & total field
- implement submit/save handler for the form: all field in 'Statement Info' to be stored on parent table fuel_stmt while details to be stored on fuel_stmt_detail (asset_id, stmt_date, start_odo, end_odo, total_km, total_litre, amount)

*/
