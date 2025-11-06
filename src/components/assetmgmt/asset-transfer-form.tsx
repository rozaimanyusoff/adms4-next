import React, { useEffect, useContext, useRef } from 'react';
import { AuthContext } from "@/store/AuthContext";
import { Checkbox } from '../ui/checkbox';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { CirclePlus, Plus, CarIcon, ComputerIcon, LucideComputer, User, X, ChevronDown, ChevronLeft, ChevronRight, Loader2, PlusCircle } from "lucide-react";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Combobox, SingleSelect, type ComboboxOption } from '@/components/ui/combobox';
import { Badge } from '@/components/ui/badge';
import { toast } from "sonner";
import { authenticatedApi } from "@/config/api";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import ActionSidebar from '@components/ui/action-aside';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

// --- Asset Transfer API and Form Types ---
export interface AssetTransferItem {
	id: number;
	transfer_request_id?: number;
	transfer_type: 'Employee' | 'Asset';
	asset_type?: string;
	identifier: string | { ramco_id: string; name: string };
	curr_owner?: { ramco_id: string; name: string } | null;
	curr_department?: { id: number; name: string } | null;
	curr_location?: { id: number; name: string } | null;
	curr_costcenter?: { id: number; name: string } | null;
	new_owner?: { ramco_id: string; name: string } | null;
	new_department?: { id: number; name: string } | null;
	new_location?: { id: number; name: string } | null;
	new_costcenter?: { id: number; name: string } | null;
	effective_date?: string;
	reasons?: string;
	attachment?: any;
	accepted_by?: any;
	accepted_at?: any;
	acceptance_remarks?: any;
	created_at?: string;
	updated_at?: string;
	// For form rendering convenience
	register_number?: string;
	ramco_id?: string;
	full_name?: string;
	owner?: { ramco_id: string; name: string } | null;
	costcenter?: { id: number; name: string } | null;
	department?: { id: number; name: string } | null;
	location?: { id: number; name: string } | null;
}

export interface AssetTransferRequest {
	id?: number;
	request_no?: string;
	requestor: {
		ramco_id: string;
		name: string;
		cost_center?: { id: number; name: string };
		department?: { id: number; name: string };
		location?: { id: number; name: string };
		[key: string]: any;
	};
	request_date: string;
	request_status: 'draft' | 'submitted';
	items: AssetTransferItem[];
	[key: string]: any;
}

// Define grouped reasons for transfer inside the form
// Combined pairs per product request:
// - Resignation & Retirement -> 'resignation_retirement'
// - Role Change & Promotion -> 'rolechange_promotion'
// - Asset Problem & Maintenance -> 'asset_problem_maintenance'
const REASONS_OPERATIONAL = [
	{ label: 'Resignation / Retirement', value: 'resignation_retirement' },
	{ label: 'Relocation', value: 'relocation' },
	{ label: 'Data Update', value: 'data_update' },
	{ label: 'Disposal', value: 'disposal' },
];

const REASONS_ORGANIZATIONAL = [
	{ label: 'Temporary Assignment (< 30 days)', value: 'temporary_assignment' },
	{ label: 'Role Change / Promotion', value: 'rolechange_promotion' },
	{ label: 'Department Restructure', value: 'department_restructure' },
];

const REASONS_CONDITION = [
    { label: 'Asset Problem / Maintenance', value: 'asset_problem_maintenance' },
];

// Map reason values to human-friendly labels for payload
const REASON_VALUE_TO_LABEL: Record<string, string> = Object.fromEntries([
    ...REASONS_OPERATIONAL,
    ...REASONS_ORGANIZATIONAL,
    ...REASONS_CONDITION,
].map(r => [r.value, r.label]));

// Define the Requestor interface if not already imported
type Requestor = {
	ramco_id: string;
	full_name: string;
	position: { id: number; name: string } | null;
	department: { id: number; name: string, code: string } | null;
	costcenter: { id: number; name: string } | null;
	location: { id: number; name: string, code: string } | null;
	email?: string;
	contact?: string;
	// Add any other fields as needed
};

interface NewOwner {
	full_name: string;
	ramco_id: string;
}

interface CostCenter {
	id: number;
	name: string;
	owner_type: string;
	owner_id: number;
	start_date: string;
	end_date: string;
	status: string;
	createAt: string;
}

interface Department {
	id: number;
	old_asset_id: number;
	code: string;
	name: string;
	dept_desc_malay: string;
	status: number;
}

interface Location {
	id: number;
	name: string;
	code: string;
	zone: string | null;
}

// Change AssetTransferForm to a self-contained component
interface AssetTransferFormProps {
	id?: string | number | null;
	onClose?: () => void;
	// Notify parent when form has unsaved changes/items
	onDirtyChange?: (dirty: boolean) => void;
}

const AssetTransferForm: React.FC<AssetTransferFormProps> = ({ id, onClose, onDirtyChange }) => {
	const [form, setForm] = React.useState<any>({ requestor: {}, reason: {} });
	const [selectedItems, setSelectedItems] = React.useState<any[]>([]);
	const [supervised, setSupervised] = React.useState<any[]>([]);
	const [returnToAssetManager, setReturnToAssetManager] = React.useState<{ [key: number]: boolean }>({});
	const [itemEffectiveDates, setItemEffectiveDates] = React.useState<{ [key: string]: string }>({});
	const [sidebarOpen, setSidebarOpen] = React.useState(false);
	const [employeeSearch, setEmployeeSearch] = React.useState('');
	const [assetSearch, setAssetSearch] = React.useState('');
	const [dateRequest, setDateRequest] = React.useState('');
	const [itemTransferDetails, setItemTransferDetails] = React.useState<any>({});
	const [employees, setEmployees] = React.useState<any[]>([]);
	const [selectedOwnerName, setSelectedOwnerName] = React.useState('');
	const [costCenters, setCostCenters] = React.useState<CostCenter[]>([]);
	const [departments, setDepartments] = React.useState<Department[]>([]);
	const [locations, setLocations] = React.useState<Location[]>([]);
	const [itemReasons, setItemReasons] = React.useState<any>({});
	const [itemAttachments, setItemAttachments] = React.useState<Record<number, File | null>>({});
	const [itemAttachmentNames, setItemAttachmentNames] = React.useState<Record<number, string | null>>({});
	const [workflow, setWorkflow] = React.useState<any>({});
	const [requestStatus, setRequestStatus] = React.useState<'draft' | 'submitted'>('draft');
	const [initialForm, setInitialForm] = React.useState<any>({ requestor: {}, reason: {} });
	const [submitError, setSubmitError] = React.useState<string | null>(null);
	// Add a loading state for sidebar data
	const [sidebarLoading, setSidebarLoading] = React.useState(false);
	const [openSubmitDialog, setOpenSubmitDialog] = React.useState(false);
	// const [openDraftDialog, setOpenDraftDialog] = React.useState(false);
	const [openCancelDialog, setOpenCancelDialog] = React.useState(false);
	const [loading, setLoading] = React.useState(!!id);
	const [error, setError] = React.useState<string | null>(null);
	const [submitting, setSubmitting] = React.useState(false);
	const [showAccordionTooltip, setShowAccordionTooltip] = React.useState<{ [id: string]: boolean }>({});
	const [showAddItemsTooltip, setShowAddItemsTooltip] = React.useState(false);
	// Track which items' accordions are expanded so we can apply the approval-level visual style
	const [expandedItems, setExpandedItems] = React.useState<Record<number, boolean>>({});
	// Application type/purpose: resignation reporting vs transfer to someone else
	// This form defaults to resignation flow; transfer type selector removed
	const [applicationOption, setApplicationOption] = React.useState<'resignation' | 'transfer' | ''>('resignation');

	const authContext = useContext(AuthContext);
	const user = authContext?.authData?.user;
	const formRef = useRef<HTMLFormElement>(null);
	const requestor = React.useMemo(() => (form?.requestor ? { ...form.requestor } : {}), [form?.requestor]);

	function clearFormAndItems() {
		setForm(initialForm);
		setSelectedItems([]);
		setItemReasons({});
		setItemTransferDetails({});
		setItemEffectiveDates({});
		setReturnToAssetManager({});
	}

	async function handleSubmit(e: React.FormEvent<HTMLFormElement>, status?: 'draft' | 'submitted') {
		e.preventDefault();
		setSubmitError(null);
		for (const item of selectedItems) {
			const transfer = itemTransferDetails[item.id] || { current: {}, new: {}, effectiveDate: '' };
			const reasons = itemReasons[item.id] || {};
			const effectiveDate = itemEffectiveDates[item.id] || '';
			const transferDetailsFilled = (
				Object.values(transfer.new || {}).some(v => v && v !== '') ||
				!!returnToAssetManager[item.id]
			);
			const reasonFilled = Object.entries(reasons)
				.filter(([k]) => k !== 'othersText' && k !== 'comment')
				.some(([, v]) => v === true);
			const effectiveDateFilled = !!effectiveDate;
			if (!effectiveDateFilled) {
				setSubmitError(`Please set the Effective Date for all selected items. Missing for: ${item.full_name || item.register_number || item.asset_code || item.id}`);
				return;
			}
			if (!transferDetailsFilled) {
				setSubmitError(`Please fill at least one Transfer Detail (New) or check 'Return to Asset Manager' for: ${item.full_name || item.register_number || item.asset_code || item.id}`);
				return;
			}
			if (!reasonFilled) {
				setSubmitError(`Please select at least one Reason for Transfer for: ${item.full_name || item.register_number || item.asset_code || item.id}`);
				return;
			}
		}
		// Helper to format date-time as "yyyy-mm-dd H:m:s"
		const formatDateTime = (dt: string | Date) => {
			const d = typeof dt === 'string' ? new Date(dt) : dt;
			const pad = (n: number) => String(n).padStart(2, '0');
			return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
		};


		// New details payload per revised spec
		const detailsPayload = selectedItems.map(item => {
			const transfer = itemTransferDetails[item.id] || { current: {}, new: {}, effectiveDate: '' };
			const reasons = itemReasons[item.id] || {};
			const effectiveDate = itemEffectiveDates[item.id] || '';
			const empty = { ownerName: '', ownerStaffId: '', location: '', costCenter: '', department: '' } as any;
			const current = { ...empty, ...(transfer.current || {}) };
			const next = { ...empty, ...(transfer.new || {}) };

			const current_owner = item.owner?.ramco_id || item.curr_owner?.ramco_id || '';
			const new_owner = next.ownerStaffId || item.owner?.ramco_id || item.curr_owner?.ramco_id || '';
			const current_costcenter_id = parseInt(String(item.costcenter?.id || item.curr_costcenter?.id || current.costCenter || 0), 10) || null;
			const current_department_id = parseInt(String(item.department?.id || item.curr_department?.id || current.department || 0), 10) || null;
			const current_location_id = parseInt(String(item.location?.id || item.curr_location?.id || current.location || 0), 10) || null;
			const new_costcenter_id = parseInt(String(next.costCenter || current_costcenter_id || 0), 10) || null;
			const new_department_id = parseInt(String(next.department || current_department_id || 0), 10) || null;
			const new_location_id = parseInt(String(next.location || current_location_id || 0), 10) || null;

			const selectedReasonLabels = Object.entries(reasons)
				.filter(([key, value]) => key !== 'othersText' && key !== 'comment' && (value === true || value === 'true'))
				.map(([key]) => REASON_VALUE_TO_LABEL[key] || key);
			const includeOwnership = !!(next.ownerName || next.ownerStaffId || item.new_owner || item.new_owner_staffId);
			const reason = [includeOwnership ? 'Transfer ownership' : null, ...selectedReasonLabels]
				.filter(Boolean)
				.join(', ');

			return {
				effective_date: effectiveDate,
				asset_id: item.id ?? null,
				type_id: item.type?.id || item.types?.id || null,
				current_owner: current_owner || '',
				current_costcenter_id,
				current_department_id,
				current_location_id,
				new_owner,
				new_costcenter_id,
				new_department_id,
				new_location_id,
				return_to_asset_manager: !!returnToAssetManager[item.id],
				reason,
				remarks: (reasons as any).othersText || '',
			};
		});

		// Build multipart form data with attachments
		const formData = new FormData();
		formData.append('transfer_date', formatDateTime(dateRequest || new Date().toISOString()));
		formData.append('transfer_by', String(form.requestor?.ramco_id || user?.username || ''));
		if (form.requestor?.costcenter?.id) formData.append('costcenter_id', String(form.requestor.costcenter.id));
		if (form.requestor?.department?.id) formData.append('department_id', String(form.requestor.department.id));
		formData.append('transfer_status', String(status || requestStatus));
		formData.append('details', JSON.stringify(detailsPayload));

		selectedItems.forEach((item: any) => {
			const f = itemAttachments[item.id];
			if (f) {
				formData.append(`attachments[${item.id}]`, f, f.name);
			}
		});

		try {
			setSubmitting(true);
			await authenticatedApi.post('/api/assets/transfers', formData);
			toast.success((status || requestStatus) === 'draft' ? 'Draft saved successfully!' : 'Transfer submitted successfully!');
			clearFormAndItems();
			handleCancel();
		} catch (err) {
			setSubmitError('Failed to submit transfer. Please try again.');
		} finally {
			setSubmitting(false);
		}
	}

	async function handleSaveDraft() {
		clearFormAndItems();
		const formElement = document.createElement('form');
		const syntheticEvent = { preventDefault: () => { }, target: formElement } as unknown as React.FormEvent<HTMLFormElement>;
		handleSubmit(syntheticEvent, 'draft');
	}

	// --- Internal handlers and helpers moved from parent ---
	function handleItemEffectiveDate(itemId: string, value: string) {
		setItemEffectiveDates((prev: any) => ({ ...prev, [itemId]: value }));
	}

	// Detect changes in item transfer details for both current and new sections then update checkbox state
	// This function is used to update the itemTransferDetails state when a new value is entered
	function detectNewChanges(itemId: string, section: 'current' | 'new', field: string, value: string) {
		setItemTransferDetails((prev: any) => {
			const firstItemId = selectedItems[0]?.id;
			const updated: any = { ...prev };
			const updatedItem = {
				...prev[itemId],
				[section]: {
					...prev[itemId]?.[section],
					[field]: value,
				},
				effectiveDate: prev[itemId]?.effectiveDate || '',
			};

			// Automatically check or uncheck the corresponding checkbox for New Owner, Cost Center, Department, or Location
			if (section === 'new' && ['ownerName', 'costCenter', 'department', 'location', 'ownerStaffId'].includes(field)) {
				updatedItem[section].ownerChecked = field === 'ownerName' ? !!value : updatedItem[section].ownerChecked;
			}

			updated[itemId] = updatedItem;

			// Bulk apply: if editing the first accordion, mirror to the rest
			if (firstItemId && String(itemId) === String(firstItemId) && section === 'new') {
				for (const it of selectedItems.slice(1)) {
					if (!it?.id) continue;
					const prevIt = updated[it.id] || prev[it.id] || {};
					const prevSection = { ...(prevIt[section] || {}) };
					prevSection[field] = value;
					if (['ownerName', 'ownerStaffId'].includes(field)) {
						prevSection.ownerChecked = field === 'ownerName' ? !!value : prevSection.ownerChecked;
					}
					updated[it.id] = { ...prevIt, [section]: prevSection, effectiveDate: prevIt?.effectiveDate || '' };
				}
			}

			return updated;
		});
	}

	function handleItemReasonInput(itemId: string, field: string, value: boolean | string) {
		const boolVal = typeof value === 'string' ? value === 'true' : !!value;
		setItemReasons((prev: any) => {
			const firstItemId = selectedItems[0]?.id;
			const updated: any = { ...prev };
			updated[itemId] = {
				...prev[itemId],
				[field]: boolVal,
			};

			// Bulk apply reasons from the first accordion
			if (firstItemId && String(itemId) === String(firstItemId)) {
				for (const it of selectedItems.slice(1)) {
					if (!it?.id) continue;
					updated[it.id] = {
						...updated[it.id],
						[field]: boolVal,
					};
				}
			}

			return updated;
		});
	}

	// Helper to set Return to Asset Manager with optional bulk apply from first item
	function setReturnToAssetManagerFor(itemId: number, checked: boolean) {
		setReturnToAssetManager(prev => {
			const firstItemId = selectedItems[0]?.id;
			const updated = { ...prev, [itemId]: checked } as { [key: number]: boolean };
			if (firstItemId && String(itemId) === String(firstItemId)) {
				for (const it of selectedItems.slice(1)) {
					if (!it?.id) continue;
					updated[it.id] = checked;
				}
			}
			return updated;
		});
	}

	function handleItemAttachment(itemId: number, file: File | null) {
		setItemAttachments((prev) => ({ ...prev, [itemId]: file }));
	}

	function handleInput(section: string, field: string, value: string) {
		setForm((prev: any) => ({
			...prev,
			[section]: {
				...prev[section],
				[field]: value,
			},
		}));
	}

	function getAssetTypeName(asset: any): string {
		return asset?.types?.name || asset?.type?.name || asset?.asset_type || '';
	}

	function getAssetCategoryName(asset: any): string {
		return asset?.categories?.name || asset?.category?.name || '';
	}

	function getAssetBrandName(asset: any): string {
		return asset?.brands?.name || asset?.brand?.name || '';
	}

	function getAssetModelName(asset: any): string {
		return asset?.models?.name || asset?.model?.name || '';
	}

	// AddSelectedItem handler (internalized)
	function addSelectedItem(item: any) {
		setSelectedItems((prev: any[]) => {
			const isEmployee = !!(item.full_name || item.ramco_id);
			let newList;
			if (item.full_name && item.ramco_id) {
				newList = [
					...prev,
					{
						...item,
						transfer_type: 'Employee',
						register_number: '',
						asset_code: '',
					},
				];
			} else if (item.register_number) {
				newList = [
					...prev,
					{
						...item,
						transfer_type: 'Asset',
						register_number: item.register_number,
						asset_code: item.entry_code || item.register_number,
						asset_type: getAssetTypeName(item),
						// Map the plural properties to singular for compatibility
						type: item.types || item.type || null,
						category: item.categories || item.category || null,
						brand: item.brands || item.brand || null,
						model: item.models || item.model || null,
						costcenter: item.costcenter,
						department: item.department,
						location: item.location,
					},
				];
			} else {
				newList = prev;
			}
			if (newList.length > prev.length) {
				toast.success('Item added to selection.');
				// Show tooltip for the new item
				const newItem = newList[newList.length - 1];
				setShowAccordionTooltip((prevTooltip) => ({ ...prevTooltip, [newItem.id]: true }));
				setTimeout(() => {
					setShowAccordionTooltip((prevTooltip) => ({ ...prevTooltip, [newItem.id]: false }));
				}, 5000);
				// Default Effective Date to Application Date for the newly added item
				try {
					const appDate = dateRequest ? new Date(dateRequest) : new Date();
					const yyyy = appDate.getFullYear();
					const mm = String(appDate.getMonth() + 1).padStart(2, '0');
					const dd = String(appDate.getDate()).padStart(2, '0');
					setItemEffectiveDates(prevDates => ({ ...prevDates, [newItem.id]: `${yyyy}-${mm}-${dd}` }));
				} catch { }
			}
			return newList;
		});
	}

	// Convenience: add all assets for an owner to the current selection
	// Close the sidebar for resignation flow; keep open for normal transfer
	function addAllAssetsForOwner(ownerAssets: any[], ownerName: string) {
		ownerAssets.forEach(asset => addSelectedItem(asset));
		setSelectedOwnerName(ownerName);
		toast.success(`${ownerAssets.length} asset(s) added for ${ownerName}.`);
		if (applicationOption === 'resignation') {
			setSidebarOpen(false);
		}
	}

	// Remove a selected item by index
	function removeSelectedItem(idx: number) {
		setSelectedItems((prev: any[]) => {
			const removed = prev[idx];
			const newList = prev.filter((_, i) => i !== idx);
			if (removed) {
				toast.info('Item removed from selection.');
			}
			return newList;
		});
	}

	// Fetch requestor data on mount (if user exists)
	useEffect(() => {
		if (!user?.username) return;
		authenticatedApi.get(`/api/assets/employees/lookup/${user.username}`)
			.then((res: any) => {
				const data = res?.data?.data;
				if (data) {
					const requestor: Requestor = {
						ramco_id: data.ramco_id || '',
						full_name: data.full_name || '',
						position: data.position || null,
						department: data.department || null,
						costcenter: data.costcenter || null,
						location: data.location || null,
						email: data.email || '',
						contact: data.contact || '',
						// Add any other fields as needed
					};
					setForm((prev: any) => ({
						...prev,
						requestor,
					}));
				}
			});
	}, [user?.username]);

	// Set request date to now (date and time) on mount if not already set
	React.useEffect(() => {
		if (!dateRequest) {
			const now = new Date();
			setDateRequest(now.toISOString());
		}
	}, [dateRequest]);

	// Track dirty state (unsaved changes) to inform parent and guard navigation
	const dirtyRef = React.useRef(false);
	React.useEffect(() => {
		const dirty =
			selectedItems.length > 0 ||
			Object.keys(itemTransferDetails || {}).length > 0 ||
			Object.keys(itemReasons || {}).length > 0 ||
			Object.keys(itemEffectiveDates || {}).length > 0 ||
			Object.keys(itemAttachments || {}).length > 0;
		dirtyRef.current = dirty;
		onDirtyChange && onDirtyChange(dirty);
	}, [selectedItems.length, itemTransferDetails, itemReasons, itemEffectiveDates, itemAttachments, onDirtyChange]);

	// Warn when closing tab if there are unsaved items
	React.useEffect(() => {
		const beforeUnload = (e: BeforeUnloadEvent) => {
			if (!dirtyRef.current) return;
			e.preventDefault();
			e.returnValue = '';
		};
		window.addEventListener('beforeunload', beforeUnload);
		return () => window.removeEventListener('beforeunload', beforeUnload);
	}, []);

	// Auto-populate sidebar when resignation option is selected
	React.useEffect(() => {
		async function populateResignationSidebar() {
			if (applicationOption === 'resignation' && (form?.requestor?.ramco_id || user?.username)) {
				setSidebarLoading(true);
				try {
					const param = form?.requestor?.ramco_id || user?.username;
					const res: any = await authenticatedApi.get(`/api/assets?supervisor=${param}`);
					const assets = res.data?.data || [];

					// Populate the supervised assets for the sidebar
					setSupervised(assets);

					if (assets.length > 0) {
						toast.success(`${assets.length} asset(s) loaded. Click + to select.`);
					} else {
						toast.info('No assets found for this supervisor');
					}
				} catch (err) {
					console.error('Error loading resignation assets:', err);
					toast.error('Failed to load assets for resignation');
				} finally {
					setSidebarLoading(false);
				}
			}
		}

		populateResignationSidebar();
	}, [applicationOption, form?.requestor?.ramco_id, user?.username]);

	// Handler to close the blank tab (window)
	async function handleCancel() {
		// Return to parent if provided, else best-effort close
		if (onClose) {
			onClose();
		} else {
			try { window.close(); } catch { }
		}
	}

	// Handler to open sidebar and fetch data
	async function handleOpenSidebar() {
		setSidebarLoading(true);
		try {
			const param = form?.requestor?.ramco_id || user?.username;
			let res: any;

			// Both transfer types now use the same supervisor endpoint
			res = await authenticatedApi.get(`/api/assets?supervisor=${param}`);

			setSupervised(res.data?.data || []);
		} catch (err) {
			console.error('Error fetching assets:', err);
			toast.error('Failed to load assets');
		} finally {
			setSidebarLoading(false);
			setSidebarOpen(true);
		}
	}

	// Autocomplete for new owner (search employees)
	async function handleNewOwnerAutocomplete(query: string) {
		if (!query || query.length < 2) {
			setEmployees([]);
			return;
		}
		try {
			const res: any = await authenticatedApi.get(`/api/assets/employees/search?q=${encodeURIComponent(query)}`);
			setEmployees(res.data?.data || []);
		} catch (err) {
			setEmployees([]);
		}
	}

	// Utility function to safely render a value as string
	function renderValue(val: any, fallback: string = '-') {
		if (val == null) return fallback;
		if (typeof val === 'string' || typeof val === 'number') return val;
		if (typeof val === 'object') {
			// Try common string properties
			if ('name' in val && typeof val.name === 'string') return val.name;
			if ('code' in val && typeof val.code === 'string') return val.code;
			if ('full_name' in val && typeof val.full_name === 'string') return val.full_name;
			if ('id' in val && typeof val.id === 'string') return val.id;
			// Fallback to JSON string for debugging
			return JSON.stringify(val);
		}
		return fallback;
	}

	// Helper to check if an asset has already been selected (by register number/entry code)
	function isAssetSelected(asset: any): boolean {
		const key = String(asset?.register_number || asset?.entry_code || '').toLowerCase();
		if (!key) return false;
		return selectedItems.some(si => String(si?.register_number || si?.entry_code || '').toLowerCase() === key);
	}

	// Fetch data for cost center, departments, and locations from their respective APIs and populate the dropdowns.
	useEffect(() => {
		async function fetchDropdownData() {
			try {
				const [costCentersRes, departmentsRes, locationsRes] = await Promise.all([
					authenticatedApi.get<{ data: CostCenter[] }>('/api/assets/costcenters'),
					authenticatedApi.get<{ data: Department[] }>('/api/assets/departments'),
					authenticatedApi.get<{ data: Location[] }>('/api/assets/locations'),
				]);

				setCostCenters(costCentersRes.data.data || []);
				setDepartments(departmentsRes.data.data || []);
				setLocations(locationsRes.data.data || []);
			} catch (error) {
				console.error('Failed to fetch dropdown data:', error);
			}
		}

		fetchDropdownData();
	}, []);

	// Prefetch employees based on header department id for 'Search new owner'
	useEffect(() => {
		const deptId = form?.requestor?.department?.id;
		if (!deptId) {
			setEmployees([]);
			return;
		}
		let cancelled = false;
		(async () => {
			try {
				const res: any = await authenticatedApi.get(`/api/assets/employees?dept=${deptId}`);
				if (!cancelled) setEmployees(res.data?.data || []);
			} catch (err) {
				if (!cancelled) setEmployees([]);
			}
		})();
		return () => { cancelled = true; };
	}, [form?.requestor?.department?.id]);

	const handleSubmitConfirmed = () => {
		setOpenSubmitDialog(false);
		if (formRef.current) {
			const event = { preventDefault: () => { }, target: formRef.current } as unknown as React.FormEvent<HTMLFormElement>;
			handleSubmit(event, 'submitted');
		}
	};
	// const handleSaveDraftConfirmed = () => {
	//     setOpenDraftDialog(false);
	//     handleSaveDraft();
	// };

	// Fetch transfer request if id is provided
	React.useEffect(() => {
		if (id) {
			setLoading(true);
			authenticatedApi.get(`/api/assets/transfers/${id}`)
				.then((res: any) => {
					const data = res?.data?.data;
					if (data) {
						// Prefill form state for edit mode
						setForm((prev: any) => ({
							...prev,
							...data,
							requestor: {
								...(prev?.requestor || {}),
								...(data?.requestor || {}),
							},
						}));
						// Determine transfer type based on existing data
						const inferredOption: 'resignation' | 'transfer' = data.items?.some((item: any) => item.transfer_type === 'Employee') ? 'resignation' : 'transfer';
						setApplicationOption(inferredOption);
						// Map items to selectedItems
						if (Array.isArray(data.items)) {
							setSelectedItems(data.items.map((item: any) => ({
								...item,
								id: item.id,
								transfer_type: item.transfer_type,
								register_number: typeof item.identifier === 'string' ? item.identifier : undefined,
								ramco_id: typeof item.identifier === 'object' ? item.identifier.ramco_id : undefined,
								full_name: typeof item.identifier === 'object' ? item.identifier.name : undefined,
								asset_type: item.asset_type || getAssetTypeName(item),
								owner: item.curr_owner,
								costcenter: item.curr_costcenter,
								department: item.curr_department,
								location: item.curr_location,
								type: item.type || item.types || null,
								category: item.category || item.categories || null,
								brand: item.brand || item.brands || null,
								model: item.model || item.models || null,
							})));
							// Prefill effective dates
							setItemEffectiveDates(
								Object.fromEntries(data.items.map((item: any) => [item.id, item.effective_date ? item.effective_date.slice(0, 10) : '']))
							);
							// Prefill transfer details (current/new)
							setItemTransferDetails(
								Object.fromEntries(data.items.map((item: any) => [item.id, {
									current: {
										ownerName: item.curr_owner?.name || '',
										ownerStaffId: item.curr_owner?.ramco_id || '',
										costCenter: item.curr_costcenter?.id ? String(item.curr_costcenter.id) : '',
										department: item.curr_department?.id ? String(item.curr_department.id) : '',
										location: item.curr_location?.id ? String(item.curr_location.id) : '',
									},
									new: {
										ownerName: item.new_owner?.name || '',
										ownerStaffId: item.new_owner?.ramco_id || '',
										costCenter: item.new_costcenter?.id ? String(item.new_costcenter.id) : '',
										department: item.new_department?.id ? String(item.new_department.id) : '',
										location: item.new_location?.id ? String(item.new_location.id) : '',
									},
									effectiveDate: item.effective_date ? item.effective_date.slice(0, 10) : '',
								}]))
							);
							// Prefill reasons
							setItemReasons(
								Object.fromEntries(data.items.map((item: any) => [item.id, Object.fromEntries((item.reasons || '').split(',').filter(Boolean).map((r: string) => [r, true]))]))
							);
							// Prefill returnToAssetManager
							setReturnToAssetManager(
								Object.fromEntries(data.items.map((item: any) => [item.id, !!item.return_to_asset_manager]))
							);
							// Prefill attachment names (we can't reconstruct File objects)
							setItemAttachmentNames(
								Object.fromEntries(data.items.map((item: any) => [item.id, item.attachment || null]))
							);
						}
						// Prefill workflow if present
						if (data.workflow) setWorkflow(data.workflow);
						// Prefill request status
						if (data.request_status) setRequestStatus(data.request_status);
						// Prefill request date
						if (data.request_date) setDateRequest(data.request_date);
					}
					setLoading(false);
				})
				.catch(() => {
					setError('Failed to load transfer request.');
					setLoading(false);
				});
		}
	}, [id]);

	// Show tooltip to add items if none are selected
	React.useEffect(() => {
		if (selectedItems.length === 0) {
			setShowAddItemsTooltip(true);
			const timer = setTimeout(() => setShowAddItemsTooltip(false), 5000);
			return () => clearTimeout(timer);
		}
	}, [selectedItems.length]);

	if (loading) return <div className="p-8 text-center">Loading...</div>;
	if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

	return (
		<>
			{/* AlertDialogs for confirmation */}
			<AlertDialog open={openSubmitDialog} onOpenChange={(open) => { if (!open && !submitting) setOpenSubmitDialog(false); }}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Submit Transfer Request?</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to submit this transfer request? You will not be able to edit after submission.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel asChild>
							<button className="px-3 py-2 rounded border" disabled={submitting}>Cancel</button>
						</AlertDialogCancel>
						<AlertDialogAction asChild>
							<button
								type="submit"
								className={`bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded inline-flex items-center ${submitting ? 'opacity-90 cursor-not-allowed' : ''}`}
								onClick={handleSubmitConfirmed}
								disabled={submitting}
							>
								{submitting ? (
									<>
										<Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...
									</>
								) : 'Yes, Submit'}
							</button>
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
			{/* Save Draft dialog removed */}
			<AlertDialog open={openCancelDialog} onOpenChange={(open) => { if (!open) setOpenCancelDialog(false); }}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Leave Form?</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to leave this form? Unsaved changes will be lost.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel asChild>
							<button className="px-3 py-2 rounded border">Stay</button>
						</AlertDialogCancel>
						<AlertDialogAction asChild>
							<button
								type="button"
								className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
								onClick={handleCancel}
							>
								Leave
							</button>
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			<Card>
				<CardHeader>
					<CardTitle className='text-lg'>Requestor</CardTitle>
				</CardHeader>
				<CardContent>
					<form className="text-sm space-y-6" onSubmit={e => { e.preventDefault(); setOpenSubmitDialog(true); }} ref={formRef}>
						{/* 1. Requestor Details */}
						<div className="space-y-6">
							{/* Hidden inputs for payload */}
							<input type="hidden" name="ramco_id" value={requestor?.ramco_id ?? ''} />
							<input type="hidden" name="request_date" value={dateRequest ? new Date(dateRequest).toISOString().slice(0, 10) : ''} />
							{/* Row 1: Application Date aligned right */}
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
								<div className="sm:col-start-2">
									<Label className="text-sm">Application Date</Label>
									<Input className="h-10 text-black" value={dateRequest ? new Date(dateRequest).toLocaleDateString() : ''} disabled />
								</div>
							</div>
							{/* Row 2: Name & Ramco ID */}
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
								<div>
									<Label className="text-sm">Name</Label>
									<Input className="h-10 text-black" value={requestor?.full_name || ''} disabled />
								</div>
								<div>
									<Label className="text-sm">Ramco ID</Label>
									<Input className="h-10 text-black" value={requestor?.ramco_id || ''} disabled />
								</div>
							</div>
							{/* Row 3: Cost Center & Department */}
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
								<div>
									<Label className="text-sm">Cost Center</Label>
									<Input className="h-10 text-black" value={requestor?.costcenter?.name || ''} disabled />
								</div>
								<div>
									<Label className="text-sm">Department</Label>
									<Input className="h-10 text-black" value={requestor?.department?.name || ''} disabled />
								</div>
							</div>
							{/* Application Options moved above next to Request Date */}
						</div>

						{/* 2. Transfer Items */}
						<Separator className="my-2" />
						<div className="p-0">
							<div className="font-semibold flex items-center justify-between text-lg gap-2">
								Transfer Items
								<TooltipProvider>
									<Tooltip open={showAddItemsTooltip}>
										<TooltipTrigger asChild>
											<span>
												<Button
													type="button"
													onClick={handleOpenSidebar}
													size="icon"
													variant="default"
													className=""
													title="Add Items"
													disabled={sidebarLoading}
												>
													{sidebarLoading ? <span className="loader w-5 h-5" /> : <Plus className="w-5 h-5" />}
												</Button>
											</span>
										</TooltipTrigger>
										<TooltipContent side="top" align="center" className="z-50">
											Click here to add items for transfer.
										</TooltipContent>
									</Tooltip>
								</TooltipProvider>
							</div>
							{selectedItems.length === 0 ? (
								<div className="text-gray-400 text-center py-4">No items selected.</div>
							) : (
								<div className="mt-2 px-1 space-y-3">
									{selectedItems.map((item, idx) => {
										if (typeof item.id === 'undefined' || item.id === null) return null;
										const isEmployee = item.transfer_type === 'Employee';
										const typeLabel = isEmployee ? 'Employee' : 'Asset';
										// Find employee details for Employee accordions
										const allEmployees = supervised.flatMap(g => g.employee || []);
										const employeeDetails = allEmployees.find(e =>
											e.ramco_id === item.ramco_id || e.full_name === item.full_name
										);
										return (
											<Accordion
												type="single"
												collapsible
												key={item.id}
												// controlled expansion so we can style the expanded item
												value={expandedItems[item.id] ? `item-${item.id}` : undefined}
												onValueChange={(val: string | undefined) => setExpandedItems(prev => ({ ...prev, [item.id]: !!val }))}
												className={`px-4 rounded ring-1 ${expandedItems[item.id] ? 'ring-blue-300' : 'ring-gray-200'}`}
											>
												<AccordionItem value={`item-${item.id}`}>
													<AccordionTrigger className="no-underline hover:no-underline px-0">
																		<div className="grid w-full items-center gap-2 grid-cols-[1fr_auto]">
											<div className="flex items-center gap-2">
																<Button type="button" size="icon" variant="ghost" className="text-red-500 hover:bg-red-500 hover:text-white" onClick={e => { e.stopPropagation(); removeSelectedItem(idx); }}>
																	<X />
																</Button>
																<span className="text-xs font-semibold text-blue-600 min-w-[70px] text-left">Item {idx + 1}</span>
																<span className="text-xs font-semibold text-blue-600 min-w-[70px] text-left">{typeLabel}</span>
																<span className="font-medium">
																	{isEmployee ? (
																		<span>{renderValue(item.full_name) || renderValue(item.name) || renderValue(item.ramco_id)}</span>
																	) : (
																		<>
																			<span>S/N: {renderValue(item.register_number)}
																				{item.asset_type && (
																					<span className="text-blue-500 text-xs"> [ {renderValue(item.asset_type)} ]</span>
																				)}
																			</span>
																		</>
																	)}
																</span>
																{/* Tooltip for expand notification */}
																<TooltipProvider>
																	<Tooltip open={!!showAccordionTooltip[item.id]}>
																		<TooltipTrigger asChild>
																			<span tabIndex={-1} />
																		</TooltipTrigger>
																		<TooltipContent side="top" align="center" className="z-50">
																			Please expand and complete the transfer details below.
																		</TooltipContent>
																	</Tooltip>
																</TooltipProvider>
															</div>
											<div className="justify-self-end flex items-center gap-2">
																<Label className="font-medium mb-0 mr-2 text-xs">Effective Date <span className="text-red-500" aria-hidden="true">*</span></Label>
																<Input
																	type="date"
																	required
																	className={`w-[160px] ${!itemEffectiveDates[item.id] && submitError ? 'border-red-500' : ''}`}
																	value={itemEffectiveDates[item.id] || ''}
																	onChange={e => handleItemEffectiveDate(item.id, e.target.value)}
																	onClick={e => e.stopPropagation()}
																	onFocus={e => e.stopPropagation()}
																/>
																{!itemEffectiveDates[item.id] && (
																	<span className="ml-2 text-xs text-red-500">Required</span>
																)}
															</div>
														</div>
													</AccordionTrigger>
													<AccordionContent>
														<div className={`p-4 bg-gray-50 rounded-lg border ${expandedItems[item.id] ? '' : ''}`}>
															{/* EMPLOYEE DETAILS SECTION */}
															{item.transfer_type === 'Employee' && (
																<div className="py-2 rounded">
																	<div className="font-semibold text-sm mb-2">Employee Details</div>
																	<div className="flex items-center justify-between text-sm">
																		<div>
																			<span className="text-muted-foreground">Position:</span>
																			<span className="ml-1">{renderValue(employeeDetails?.position?.name)}</span>
																		</div>
																		<div>
																			<span className="text-muted-foreground">Email:</span>
																			<span className="ml-1">{renderValue(employeeDetails?.email)}</span>
																		</div>
																		<div>
																			<span className="text-muted-foreground">Contact:</span>
																			<span className="ml-1">{renderValue(employeeDetails?.contact)}</span>
																		</div>
																	</div>
																</div>
															)}
															{/* ASSET DETAILS SECTION */}
															{item.transfer_type === 'Asset' && (
																<div className="py-2 rounded">
																	<div className="font-semibold mb-1">Asset Details</div>
																	<div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
																		<div className="flex items-center gap-2">
																			<span className="text-muted-foreground">Type & Category:</span>
																			<span className="font-medium text-blue-600">
																				{item.type?.name || item.asset_type || '-'} & {renderValue(item.category?.name) || '-'}
																			</span>
																		</div>
																		<div className="flex items-center gap-2">
																			<span className="text-muted-foreground">Brand & Model:</span>
																			<span className="font-medium text-blue-600">
																				{renderValue(item.brand?.name) || '-'} & {renderValue(item.model?.name) || '-'}
																			</span>
																		</div>
																	</div>
																</div>
															)}
											{/* Transfer Details */}
											<hr className="my-2 border-gray-300" />
											<div>
												<div className="mb-2">
													<div className="flex items-center justify-between gap-4">
														<div className="font-semibold">Transfer Details</div>
                                    <div className="flex items-center gap-2">
                                        <div className="font-medium">Return to Asset Manager</div>
                                        <Switch checked={!!returnToAssetManager[item.id]} onCheckedChange={(checked: boolean) => setReturnToAssetManagerFor(item.id, checked)} />
                                    </div>
													</div>
													{/* Show only Transfer Details error for this item */}
													{submitError && submitError.includes(item.register_number || item.full_name || item.asset_code || item.id)
														&& submitError.toLowerCase().includes('transfer detail') && (
															<div className="text-red-600 text-xs font-semibold mt-1">
																{submitError}
															</div>
													)}
												</div>

																{/* Effective Date moved to header; Transfer type radio controls present in header */}

																<table className="w-full text-left align-middle">
																	<thead className="bg-transparent py-0">
																		<tr>
																			<th className="bg-transparent py-1 w-[20%]"></th>
																			<th className="bg-transparent py-1 px-8">Current</th>
																			<th className="bg-transparent py-1">New</th>
																		</tr>
																	</thead>
																	<tbody>
																		{/* Only show Owner row for assets */}
																		{!isEmployee && (
																			<tr className="border-b-0">
																				<td className="py-0.5">
																					<Label className="flex items-center gap-2">
																						<Checkbox
																							checked={!!itemTransferDetails[item.id]?.new.ownerChecked}
																							disabled={!!returnToAssetManager[item.id]}
																							onCheckedChange={checked => {
																								if (checked === false) {
																									// clearNewOwnerField(item.id);
																								} else {
																									detectNewChanges(item.id, 'new', 'ownerName', selectedOwnerName || '');
																								}
																							}}
																						/>
																						Owner
																					</Label>
																				</td>
																				<td className="py-0.5 px-8">
																					<div className="w-full py-1.5 text-sm text-gray-900">{renderValue(item.owner?.full_name)}</div>
																				</td>
																				<td className="py-0.5">
																					{/* New Owner autocomplete, fallback to a simple input+dropdown if shadcn Autocomplete is not available */}
																					<div>
																						{/* Use Combobox SingleSelect for new owner - show employee full names but store ramco_id as value */}
																						<Combobox
																							options={employees.map(emp => ({ value: emp.ramco_id, label: emp.full_name }))}
																							value={itemTransferDetails[item.id]?.new.ownerStaffId || ''}
																							onValueChange={(val: string) => {
																								// set staff id and ownerName where appropriate
																								detectNewChanges(item.id, 'new', 'ownerName', employees.find(e => e.ramco_id === val)?.full_name || '');
																								detectNewChanges(item.id, 'new', 'ownerStaffId', val);
																							}}
																							placeholder="Search new owner"
																							searchPlaceholder="Search employees..."
																							emptyMessage="No employees"
																							disabled={!!returnToAssetManager[item.id]}
																							className="w-full border border-gray-200 rounded-md bg-white"
																						/>
																					</div>
																				</td>
																			</tr>
																		)}
																		{/* Cost Center, Department, Location rows remain for both */}
																		<tr className="border-b-0">
																			<td className="py-0.5">
																				<Label className="flex items-center gap-2">
																					<Checkbox
																						checked={!!itemTransferDetails[item.id]?.new.costCenter}
																						disabled={!!returnToAssetManager[item.id]}
																						onCheckedChange={checked => { if (!checked) detectNewChanges(item.id, 'new', 'costCenter', ''); }}

																					/>
																					Cost Center
																				</Label>
																			</td>
																			<td className="py-0.5 px-8"><div className="w-full py-1.5 text-sm text-gray-900">{renderValue(item.costcenter?.name)}</div></td>
																			<td className="py-0.5">
																				<SingleSelect
																					options={costCenters.map(cc => ({ value: String(cc.id), label: cc.name }))}
																					value={itemTransferDetails[item.id]?.new.costCenter || ''}
																					onValueChange={val => detectNewChanges(item.id, 'new', 'costCenter', val)}
																					placeholder="New Cost Center"
																					disabled={!!returnToAssetManager[item.id]}
																					className="w-full border border-gray-200 rounded-md bg-white"
																				/>
																			</td>
																		</tr>
																		<tr className="border-b-0">
																			<td className="py-0.5">
																				<Label className="flex items-center gap-2">
																					<Checkbox
																						checked={!!itemTransferDetails[item.id]?.new.department}
																						disabled={!!returnToAssetManager[item.id]}
																						onCheckedChange={checked => { if (!checked) detectNewChanges(item.id, 'new', 'department', ''); }}

																					/>
																					Department
																				</Label>
																			</td>
																			<td className="py-0.5 px-8"><div className="w-full py-1.5 text-sm text-gray-900">{renderValue(item.department?.name)}</div></td>
																			<td className="py-0.5">
																				<SingleSelect
																					options={departments.map(dept => ({ value: String(dept.id), label: dept.code || dept.name }))}
																					value={itemTransferDetails[item.id]?.new.department || ''}
																					onValueChange={val => detectNewChanges(item.id, 'new', 'department', val)}
																					placeholder="New Department"
																					disabled={!!returnToAssetManager[item.id]}
																					className="w-full border border-gray-200 rounded-md bg-white"
																				/>
																			</td>
																		</tr>
																		<tr className="border-b-0">
																			<td className="py-0.5">
																				<Label className="flex items-center gap-2">
																					<Checkbox
																						checked={!!itemTransferDetails[item.id]?.new.location}
																						disabled={!!returnToAssetManager[item.id]}
																						onCheckedChange={checked => { if (!checked) detectNewChanges(item.id, 'new', 'location', ''); }}

																					/>
																					Location
																				</Label>
																			</td>
																			<td className="py-0.5 px-8"><div className="w-full py-1.5 text-sm text-gray-900">{renderValue(item.location?.name)}</div></td>
																			<td className="py-0.5">
																				<SingleSelect
																					options={locations.map(loc => ({ value: String(loc.id), label: loc.code || loc.name }))}
																					value={itemTransferDetails[item.id]?.new.location || ''}
																					onValueChange={val => detectNewChanges(item.id, 'new', 'location', val)}
																					placeholder="New Location"
																					disabled={!!returnToAssetManager[item.id]}
																					className="w-full border border-gray-200 rounded-md bg-white"
																				/>
																			</td>
																		</tr>
																	</tbody>
																</table>
															</div>
															<hr className="my-2 border-gray-300" />
															{/* Reason for Transfer */}
															<div>
																<div className="font-semibold mb-2 flex items-center justify-start gap-6">
																	Reason for Transfer
																	{/* Show only Reason for Transfer error for this item */}
																	{submitError && submitError.includes(item.register_number || item.full_name || item.asset_code || item.id)
																		&& submitError.toLowerCase().includes('reason for transfer') && (
																			<div className="text-red-600 text-xs font-semibold">
																				{submitError}
																			</div>
																		)}
																</div>

																<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
																	{/* Operational Reasons (combined groups) */}
																	<div>
																		<div className="font-semibold mb-2">Operational</div>
																		<div className="flex flex-col gap-2">
																			{REASONS_OPERATIONAL.map(reason => (
																				<Label key={reason.value} className="inline-flex items-center gap-2">
																					<Checkbox
																						checked={!!itemReasons[item.id]?.[reason.value]}
																						onCheckedChange={checked => handleItemReasonInput(item.id, reason.value, checked)}
																					/>
																					{reason.label}
																				</Label>
																			))}
																		</div>
																	</div>

																	{/* Organizational Reasons */}
																	<div>
																		<div className="font-semibold mb-2">Organizational</div>
																		<div className="flex flex-col gap-2">
																			{REASONS_ORGANIZATIONAL.map(reason => (
																				<Label key={reason.value} className="inline-flex items-center gap-2">
																					<Checkbox
																						checked={!!itemReasons[item.id]?.[reason.value]}
																						onCheckedChange={checked => handleItemReasonInput(item.id, reason.value, checked)}
																					/>
																					{reason.label}
																				</Label>
																			))}
																		</div>
																	</div>

																	{/* Condition Reasons */}
																	<div>
																		<div className="font-semibold mb-2">Condition</div>
																		<div className="flex flex-col gap-2">
																			{REASONS_CONDITION.map(reason => (
																				<Label key={reason.value} className="inline-flex items-center gap-2">
																					<Checkbox
																						checked={!!itemReasons[item.id]?.[reason.value]}
																						onCheckedChange={checked => handleItemReasonInput(item.id, reason.value, checked)}
																					/>
																					{reason.label}
																				</Label>
																			))}
																		</div>
																	</div>
																</div>
																{form.reason.others && (
																	<div className="mt-2 px-2">
																		<Textarea
																			className="w-full border rounded px-2 py-1 text-sm min-h-[40px]"
																			placeholder="Please specify..."
																			value={form.reason.othersText}
																			onChange={e => handleInput('reason', 'othersText', e.target.value)}
																		/>
																	</div>
																)}

																<div className="flex flex-col md:flex-row justify-between gap-10 items-start mt-2">
																	<div className="flex-1">
																		<Label className="font-semibold mb-1">Other Reason</Label>
																		<Textarea className="w-full min-h-[90px] border rounded px-2 py-1 text-sm" placeholder="Add your comment here..." />
																	</div>
																	<div className="flex-1">
																		<Label className="font-semibold mb-1">Attachments</Label>
																		<div className="border-2 border-dashed rounded-md p-1 text-center bg-white">
																			<input
																				id={`attachment-${item.id}`}
																				type="file"
																				accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
																				className="hidden"
																				onChange={(e) => {
																					const f = e.target.files?.[0] || null;
																					handleItemAttachment(item.id, f);
																					if (f) setItemAttachmentNames(prev => ({ ...prev, [item.id]: f.name }));
																				}}
																			/>
																			<Label htmlFor={`attachment-${item.id}`} className="cursor-pointer inline-block w-full">
																				<div className="py-1">
																					<div className="text-sm text-gray-600">Drag & drop a file here or click to browse</div>
																					<div className="mt-1 text-xs text-gray-400">Supported: pdf, jpg, png, docx</div>
																				</div>
																			</Label>
																			<div className="text-sm text-gray-700">
																				{itemAttachments[item.id]?.name || itemAttachmentNames[item.id] || <span className="text-gray-400">No file chosen</span>}
																			</div>
																		</div>
																	</div>
																</div>
															</div>

															{/* Comment before Attachments */}

														</div>
													</AccordionContent>
												</AccordionItem>
											</Accordion>
										);
									})}
								</div>
							)}
							{sidebarOpen && (
								<ActionSidebar
									title={"Select Transferable Assets"}
									content={
										<div className="w-full">
											{(() => {
												if (applicationOption === 'resignation') {
													// For resignation, group assets by owner
													const allAssets = Array.isArray(supervised) ? supervised : [];
													const ownerGroups: Record<string, any[]> = {};

													allAssets.forEach(a => {
														const ownerKey = a.owner?.ramco_id || 'unassigned';
														if (!ownerGroups[ownerKey]) {
															ownerGroups[ownerKey] = [];
														}
														ownerGroups[ownerKey].push(a);
													});

													return (
														<>
															<div className="mb-4 font-semibold flex flex-col gap-2">
																<span>Owners ({Object.keys(ownerGroups).length})</span>
																<Input
																	type="text"
																	placeholder="Search owners..."
																	className="border rounded px-2 py-1 w-full text-sm"
																	value={assetSearch}
																	onChange={e => setAssetSearch(e.target.value)}
																/>
															</div>
															<ul className="space-y-3">
																{Object.entries(ownerGroups)
																	.filter(([ownerKey, assets]) => {
																		if (!assetSearch) return true;
																		const search = assetSearch.toLowerCase();
																		const firstAsset = assets[0];
																		const ownerName = firstAsset.owner?.full_name || '';
																		const ownerId = firstAsset.owner?.ramco_id || '';
																		const matches = (v?: string) => !!v && v.toLowerCase().includes(search);
																		// Match owner or any asset details under the owner
																		const assetMatches = assets.some(a => (
																			matches(a.register_number) ||
																			matches(a.entry_code) ||
																			matches(getAssetCategoryName(a)) ||
																			matches(getAssetBrandName(a)) ||
																			matches(getAssetModelName(a)) ||
																			matches(getAssetTypeName(a))
																		));
																		return matches(ownerName) || matches(ownerId) || assetMatches;
																	})
																	.map(([ownerKey, assets]) => {
																		const firstAsset = assets[0];
																		const ownerName = firstAsset.owner?.full_name || 'Unassigned';
																		const ownerRamcoId = firstAsset.owner?.ramco_id || '';
																		const filteredAssets = assets.filter(a => !isAssetSelected(a));
																		if (filteredAssets.length === 0) return null;

																		return (
																			<li key={ownerKey} className="bg-blue-50 dark:bg-gray-700 rounded-lg p-3 border border-blue-200">
																				<div className="flex items-center justify-between mb-2">
																					<div className="flex items-center gap-3">
																						<User className="w-5 h-5 text-blue-600" />
																						<div>
																							<div className="font-semibold text-blue-800 dark:text-blue-300">
																								{ownerName}
																							</div>
																							<div className="text-sm text-gray-600 dark:text-gray-400">
																								{ownerRamcoId} • {assets.length} asset{assets.length !== 1 ? 's' : ''}
																							</div>
																						</div>
																					</div>
																					<Button
																						size="sm"
																						onClick={() => {
																							// Add all this owner's remaining assets to current selection
																							addAllAssetsForOwner(filteredAssets, ownerName);
																						}}
																						className="bg-blue-600 hover:bg-blue-700 text-white"
																						disabled={filteredAssets.length === 0}
																					>
																						Add All ({filteredAssets.length})
																					</Button>
																				</div>
																				<div className="space-y-1">
																					{filteredAssets.map((asset, idx) => {
																						const typeName = getAssetTypeName(asset);
																						const categoryName = getAssetCategoryName(asset);
																						const brandName = getAssetBrandName(asset);
																						const modelName = getAssetModelName(asset);
																						const typeLine = [typeName, categoryName].filter(Boolean).join(' - ');
																						const brandLine = [brandName, modelName].filter(Boolean).join(' ');
																						return (
																							<div key={asset.id || idx} className="text-xs bg-white dark:bg-gray-600 rounded p-2 flex justify-between items-center">
																								<div>
																									<span className="font-medium">{asset.register_number}</span>
																									<div className="text-gray-600 dark:text-gray-300">
																										{typeLine || '-'}
																									</div>
																									<div className="text-gray-500 dark:text-gray-400">
																										{brandLine || '-'}
																									</div>
																								</div>
																								<CirclePlus
																									className="text-blue-500 w-5 h-5 cursor-pointer hover:text-blue-600"
																									onClick={() => addSelectedItem(asset)}
																								/>
																							</div>
																						);
																					})}
																				</div>
																			</li>
																		);
																	})
																}
															</ul>
														</>
													);
												} else {
													// Regular asset list for internal transfer
													const allAssets = Array.isArray(supervised) ? supervised : [];
													const typeCounts: Record<string, number> = {};
													allAssets.forEach(a => {
														const typeName = getAssetTypeName(a);
														const key = typeName && typeName.trim() ? typeName : '(Unspecified)';
														typeCounts[key] = (typeCounts[key] || 0) + 1;
													});
													const summary = Object.entries(typeCounts).map(([type, count]) => `${type}: ${count}`).join(' | ');

													return (
														<>
															<div className="mb-4 font-semibold flex flex-col gap-2">
																<span>Assets ({summary})</span>
																<Input
																	type="text"
																	placeholder="Search assets..."
																	className="border rounded px-2 py-1 w-full text-sm"
																	value={assetSearch}
																	onChange={e => setAssetSearch(e.target.value)}
																/>
															</div>
															<ul className="space-y-2">
																{allAssets
																	.filter((a: any) => !isAssetSelected(a))
																	.filter((a: any) => {
																		if (!assetSearch) return true;
																		const search = assetSearch.toLowerCase();
																		const matches = (value?: string) => !!value && value.toLowerCase().includes(search);
																		return (
																			matches(a.register_number) ||
																			matches(a.entry_code) ||
																			matches(getAssetCategoryName(a)) ||
																			matches(getAssetBrandName(a)) ||
																			matches(getAssetModelName(a)) ||
																			matches(getAssetTypeName(a))
																		);
																	})
																	.map((a: any, j: any) => {
																		const assetType = getAssetTypeName(a);
																		const lowerType = assetType.toLowerCase();
																		let typeIcon = null;
																		if (lowerType.includes('motor')) {
																			typeIcon = <CarIcon className="w-4.5 h-4.5 text-pink-500" />;
																		} else if (lowerType.includes('computer')) {
																			typeIcon = <LucideComputer className="w-4.5 h-4.5 text-green-500" />;
																		}
																		const categoryName = getAssetCategoryName(a);
																		const brandName = getAssetBrandName(a);
																		const modelName = getAssetModelName(a);
																		const typeLine = [assetType, categoryName].filter(Boolean).join(' - ');
																		const brandLine = [brandName, modelName].filter(Boolean).join(' ');
																		return (
																			<React.Fragment key={a.id || a.register_number || j}>
																				<li className="flex flex-col bg-indigo-100 dark:bg-gray-800 rounded-lg px-3 py-2">
																					<div className="flex items-center gap-3">
																						<div className="flex items-center gap-2">
																							<CirclePlus className="text-blue-500 w-6 h-6 cursor-pointer hover:text-blue-600" onClick={() => { addSelectedItem(a); }} />
																							{typeIcon && typeIcon}
																						</div>
																						<div>
																							<div className="text-medium dark:text-dark-light">
																								{a.owner?.full_name && (
																									<div className="font-medium dark:text-dark-light">{a.owner.full_name} <span className="text-black">({a.owner.ramco_id})</span></div>
																								)}
																							</div>
																							<span className="font-medium dark:text-dark-light">{a.register_number}</span>
																							<div className="text-xs text-gray-700 dark:text-dark-light mt-0.5">
																								<div>{typeLine || '-'}</div>
																								<div>{brandLine || '-'}</div>
																							</div>
																						</div>
																					</div>
																				</li>
																			</React.Fragment>
																		);
																	})
																}
															</ul>
														</>
													);
												}
											})()}
										</div>
									}
									onClose={() => setSidebarOpen(false)}
									size="sm"
								/>
							)}
						</div>
									<div className="flex justify-center gap-2 mt-4">
										<Button
											type="button"
											onClick={() => setOpenSubmitDialog(true)}
											disabled={submitting || loading || selectedItems.length === 0}
										>
											{submitting ? (
												<span className="inline-flex items-center">
													<Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...
												</span>
											) : 'Submit'}
										</Button>
										<Button type="button" variant="outline" onClick={() => clearFormAndItems()} disabled={submitting}>Reset</Button>
										<Button type="button" variant="destructive" onClick={() => setOpenCancelDialog(true)} disabled={submitting}>Cancel</Button>
									</div>
						{/* Workflow section removed as requested */}
					</form>
				</CardContent>
			</Card>
		</>
	);
};

export default AssetTransferForm;
