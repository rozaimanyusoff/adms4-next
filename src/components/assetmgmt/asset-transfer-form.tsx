"use client";
import React, { useEffect, useContext, useRef } from 'react';
import { AuthContext } from "@/store/AuthContext";
import { Checkbox } from '../ui/checkbox';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { CirclePlus, Plus, CarIcon, ComputerIcon, LucideComputer, User, X, ChevronDown, ChevronLeft, ChevronRight, Loader2, PlusCircle, AlertTriangle, Info } from "lucide-react";
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
import { useRouter } from 'next/navigation';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

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
	attachment1?: any;
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
	// Callback when a submit succeeds to refresh parent grids
	onSubmitted?: () => void;
}

const AssetTransferForm: React.FC<AssetTransferFormProps> = ({ id, onClose, onDirtyChange, onSubmitted }) => {
	const router = useRouter();
	const [form, setForm] = React.useState<any>({ requestor: {}, reason: {} });
	const [selectedItems, setSelectedItems] = React.useState<any[]>([]);
	const [supervised, setSupervised] = React.useState<any[]>([]);
	const [returnToAssetManager, setReturnToAssetManager] = React.useState<{ [key: number]: boolean }>({});
	const [itemEffectiveDates, setItemEffectiveDates] = React.useState<{ [key: string]: string }>({});
	const [sidebarOpen, setSidebarOpen] = React.useState(false);
	const [sidebarTab, setSidebarTab] = React.useState<'assets' | 'employees'>('assets');
	const [employeeSearch, setEmployeeSearch] = React.useState('');
	const [assetSearch, setAssetSearch] = React.useState('');
	const [employeeFilter, setEmployeeFilter] = React.useState<{ ramco_id: string; name: string } | null>(null);
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
	const [openSuccessDialog, setOpenSuccessDialog] = React.useState(false);
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
	const [pendingAssetLocks, setPendingAssetLocks] = React.useState<Record<number, boolean>>({});
	const [pendingEmployeeLocks, setPendingEmployeeLocks] = React.useState<Record<string, boolean>>({});
	const [pendingAssetAcceptance, setPendingAssetAcceptance] = React.useState<Record<number, boolean>>({});
	// Application type/purpose: resignation reporting vs transfer to someone else
	// This form defaults to resignation flow; transfer type selector removed
	const [applicationOption, setApplicationOption] = React.useState<'resignation' | 'transfer' | ''>('resignation');
	// Manager access
	const [managerId, setManagerId] = React.useState<number | null>(null);
	const [managerAssets, setManagerAssets] = React.useState<any[]>([]);
	const [managerSidebarOpen, setManagerSidebarOpen] = React.useState(false);
	const [managerSidebarLoading, setManagerSidebarLoading] = React.useState(false);
	const [managerAssetSearch, setManagerAssetSearch] = React.useState('');

	const authContext = useContext(AuthContext);
	const user = authContext?.authData?.user;
	const formRef = useRef<HTMLFormElement>(null);
	// Cache keys to avoid re-fetching sidebars when data already present
	const lastSupervisorFetchKeyRef = useRef<string | null>(null);
	const lastManagerFetchKeyRef = useRef<string | null>(null);
	// Draft handling: persist form state locally to avoid losing work on refresh
	const draftKey = React.useMemo(() => {
		const userKey = user?.username ? String(user.username) : 'anon';
		const idKey = id ? String(id) : 'new';
		return `asset-transfer-draft:${userKey}:${idKey}`;
	}, [user?.username, id]);

	// Reset sidebar context when it closes to avoid stale filters
	useEffect(() => {
		if (!sidebarOpen) {
			setSidebarTab('assets');
			setEmployeeFilter(null);
			setEmployeeSearch('');
		}
	}, [sidebarOpen]);
	const skipNextDraftSaveRef = React.useRef(false);

	// Convert a date-like value into YYYY-MM-DD in the user's local timezone (avoids UTC off-by-one).
	const toLocalISODate = (value?: string | Date | null) => {
		if (!value) return '';
		const date = typeof value === 'string' ? new Date(value) : value;
		if (isNaN(date.getTime())) return '';
		const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
		return localDate.toISOString().slice(0, 10);
	};
	const requestDateValue = React.useMemo(() => toLocalISODate(dateRequest || new Date()), [dateRequest]);
	const requestDateDisplay = React.useMemo(() => {
		return requestDateValue ? new Date(requestDateValue).toLocaleDateString() : '';
	}, [requestDateValue]);
	const [draftRestored, setDraftRestored] = React.useState(false);
	const draftSaveTimerRef = React.useRef<NodeJS.Timeout | null>(null);
	const requestor = React.useMemo(() => (form?.requestor ? { ...form.requestor } : {}), [form?.requestor]);

	function clearDraftStorage() {
		skipNextDraftSaveRef.current = true;
		try {
			localStorage.removeItem(draftKey);
		} catch {
			// ignore
		}
	}

	function clearFormAndItems(options?: { resetDate?: boolean }) {
		clearDraftStorage();
		const keepRequestor = form?.requestor ? { ...form.requestor } : {};
		setForm({ requestor: keepRequestor, reason: {} });
		setSelectedItems([]);
		setItemReasons({});
		setItemTransferDetails({});
		setItemEffectiveDates({});
		setReturnToAssetManager({});
		setItemAttachments({});
		setItemAttachmentNames({});
		setExpandedItems({});
		setShowAccordionTooltip({});
		setShowAddItemsTooltip(false);
		setSubmitError(null);
		setWorkflow({});
		setRequestStatus('draft');
		setApplicationOption('resignation');
		setManagerAssets([]);
		setManagerAssetSearch('');
		setPendingAssetAcceptance({});
		if (options?.resetDate !== false) {
			setDateRequest(new Date().toISOString());
		}
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
			const remarks = [
				typeof (reasons as any).othersText === 'string' ? (reasons as any).othersText.trim() : '',
				typeof (reasons as any).comment === 'string' ? (reasons as any).comment.trim() : '',
			].filter(Boolean).join(' ').trim();

			const transfer_type = item.transfer_type || (item.register_number ? 'Asset' : 'Employee');
			// Keep ID as string to preserve leading zeros (e.g., Ramco IDs like "000396")
			const asset_id = transfer_type === 'Employee'
				? String(item.ramco_id || item.owner?.ramco_id || item.curr_owner?.ramco_id || '')
				: String(item.id ?? '');
			const type_id = transfer_type === 'Asset' ? (item.type?.id || item.types?.id || null) : null;

			return {
				transfer_type,
				effective_date: effectiveDate,
				asset_id,
				type_id,
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
				remarks,
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
				formData.append(`attachment1[${item.id}]`, f, f.name);
			}
		});

		try {
			setSubmitting(true);
			await authenticatedApi.post('/api/assets/transfers', formData);
			toast.success((status || requestStatus) === 'draft' ? 'Draft saved successfully!' : 'Transfer submitted successfully!');
			// Notify parent to refresh its data and show success dialog
			try { onSubmitted && onSubmitted(); } catch { }
			clearFormAndItems();
			// Clear any locally persisted draft once submission succeeds
			try { localStorage.removeItem(draftKey); } catch { }
			setOpenSuccessDialog(true);
		} catch (err) {
			const message = 'Failed to submit transfer. Please try again.';
			setSubmitError(message);
			toast.error(message);
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

	// Free-text remarks per item (e.g., "Other Reason" notes)
	function handleItemCommentInput(itemId: string | number, value: string) {
		setItemReasons((prev: any) => ({
			...prev,
			[itemId]: {
				...(prev?.[itemId] || {}),
				comment: value,
			},
		}));
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

	function getAssetDepartmentName(asset: any): string {
		return asset?.department?.name || asset?.departments?.name || '';
	}

	function getAssetCostCenterName(asset: any): string {
		return asset?.costcenter?.name || asset?.costcenters?.name || '';
	}

	// AddSelectedItem handler (internalized)
	function addSelectedItem(item: any) {
		if (item?.id && pendingAssetLocks[Number(item.id)]) {
			return;
		}
		// Block employees that are already in a pending transfer
		if ((item?.ramco_id || item?.full_name) && isEmployeeLocked(item)) {
			return;
		}
		setSelectedItems((prev: any[]) => {
			const isEmployee = !!(item.full_name || item.ramco_id);
			if (isEmployee && isEmployeeSelected(item)) return prev;
			let newList;
			if (item.full_name && item.ramco_id) {
				newList = [
					...prev,
					{
						...item,
						id: item.id ?? item.ramco_id, // ensure accordion renders
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
				// Show tooltip for the new item
				const newItem = newList[newList.length - 1];
				setShowAccordionTooltip((prevTooltip) => ({ ...prevTooltip, [newItem.id]: true }));
				setTimeout(() => {
				setShowAccordionTooltip((prevTooltip) => ({ ...prevTooltip, [newItem.id]: false }));
			}, 5000);
				// Default Effective Date to Application Date for the newly added item
				try {
					const defaultDate = toLocalISODate(dateRequest || new Date());
					if (defaultDate) {
						setItemEffectiveDates(prevDates => ({ ...prevDates, [newItem.id]: defaultDate }));
					}
				} catch { }
			}
			return newList;
		});
	}

	// Convenience: add all assets for an owner to the current selection
	// Close the sidebar for resignation flow; keep open for normal transfer
	function addAllAssetsForOwner(ownerAssets: any[], ownerName: string) {
		const eligibleAssets = ownerAssets.filter(asset => !pendingAssetLocks[Number(asset?.id)]);
		if (eligibleAssets.length === 0) {
			return;
		}
		eligibleAssets.forEach(asset => addSelectedItem(asset));
		setSelectedOwnerName(ownerName);
		if (applicationOption === 'resignation') {
			setSidebarOpen(false);
		}
	}

	// Remove a selected item by index
	function removeSelectedItem(idx: number) {
		setSelectedItems((prev: any[]) => {
			const removed = prev[idx];
			const newList = prev.filter((_, i) => i !== idx);
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

	// Restore draft from localStorage once initial load completes
	React.useEffect(() => {
		if (draftRestored) return;
		if (loading) return;
		try {
			const raw = typeof window !== 'undefined' ? localStorage.getItem(draftKey) : null;
			if (raw) {
				const parsed = JSON.parse(raw);
				if (parsed.form) setForm(parsed.form);
				if (Array.isArray(parsed.selectedItems)) setSelectedItems(parsed.selectedItems);
				if (parsed.itemTransferDetails) setItemTransferDetails(parsed.itemTransferDetails);
				if (parsed.itemReasons) setItemReasons(parsed.itemReasons);
				if (parsed.itemEffectiveDates) setItemEffectiveDates(parsed.itemEffectiveDates);
				if (parsed.returnToAssetManager) setReturnToAssetManager(parsed.returnToAssetManager);
				if (parsed.applicationOption) setApplicationOption(parsed.applicationOption);
				if (parsed.requestStatus) setRequestStatus(parsed.requestStatus);
				if (parsed.dateRequest) setDateRequest(parsed.dateRequest);
			}
		} catch (err) {
			console.warn('Failed to restore asset transfer draft', err);
		} finally {
			setDraftRestored(true);
		}
	}, [draftKey, draftRestored, loading]);

	// Persist draft to localStorage with a small debounce to avoid frequent writes
	React.useEffect(() => {
		if (!draftRestored) return;
		if (skipNextDraftSaveRef.current) {
			skipNextDraftSaveRef.current = false;
			return;
		}
		if (draftSaveTimerRef.current) clearTimeout(draftSaveTimerRef.current);
		draftSaveTimerRef.current = setTimeout(() => {
			const payload = {
				form,
				selectedItems,
				itemTransferDetails,
				itemReasons,
				itemEffectiveDates,
				returnToAssetManager,
				applicationOption,
				requestStatus,
				dateRequest,
				updatedAt: new Date().toISOString(),
			};
			try {
				localStorage.setItem(draftKey, JSON.stringify(payload));
			} catch (err) {
				console.warn('Failed to save asset transfer draft', err);
			}
		}, 800);
		return () => {
			if (draftSaveTimerRef.current) clearTimeout(draftSaveTimerRef.current);
		};
	}, [
		applicationOption,
		dateRequest,
		draftKey,
		draftRestored,
		form,
		itemEffectiveDates,
		itemReasons,
		itemTransferDetails,
		requestStatus,
		returnToAssetManager,
		selectedItems,
	]);

	const loadPendingAssetLocks = React.useCallback(async () => {
		try {
			const pendingRes: any = await authenticatedApi.get('/api/assets/transfers?status=pending');
			const transfers: any[] = Array.isArray(pendingRes?.data?.data) ? pendingRes.data.data : [];
			const lockMap: Record<number, boolean> = {};
			const employeeLockMap: Record<string, boolean> = {};
			transfers.forEach((transfer: any) => {
				const approvalPending = !transfer?.approved_by && !transfer?.approved_date;
				(transfer?.items || []).forEach((item: any) => {
					const waitingAcceptance = !item?.acceptance_date && !item?.acceptance_by;
					const rawAssetId = item?.asset?.id;
					const assetId = rawAssetId ? Number(rawAssetId) : NaN;
					const transferType = String(item?.transfer_type || item?.asset_type || '').toLowerCase();
					const isEmployeeTransfer =
						transferType === 'employee' ||
						(!rawAssetId && !!item?.employee) ||
						(!rawAssetId && !!item?.ramco_id) ||
						(!rawAssetId && !!item?.asset_id) ||
						(!rawAssetId && !!item?.employee_id);

					if (!isNaN(assetId) && assetId && (approvalPending || waitingAcceptance)) {
						lockMap[assetId] = true;
					}

					if (isEmployeeTransfer && (approvalPending || waitingAcceptance)) {
						const possibleKeys = [
							item?.employee?.ramco_id,
							item?.employee?.id,
							item?.employee_id,
							item?.ramco_id,
							item?.asset_id && String(item.asset_id),
							item?.asset?.id && String(item.asset.id),
							item?.asset?.register_number && String(item.asset.register_number),
							item?.owner?.ramco_id,
							item?.curr_owner?.ramco_id,
							item?.new_owner?.ramco_id,
							item?.current_owner,
							item?.new_owner,
						].filter(Boolean);

						possibleKeys.forEach(k => {
							const keyStr = String(k || '').trim();
							if (!keyStr) return;
							const lower = keyStr.toLowerCase();
							employeeLockMap[lower] = true;
							// also store numeric form for IDs that may drop leading zeros
							const numForm = String(parseInt(lower, 10));
							if (numForm && numForm !== 'nan') employeeLockMap[numForm] = true;
						});
					}
				});
			});
			setPendingAssetLocks(lockMap);
			setPendingEmployeeLocks(employeeLockMap);
		} catch (err) {
			console.error('Error fetching pending transfers:', err);
			setPendingAssetLocks({});
			setPendingEmployeeLocks({});
		}
	}, []);

	// Handler to close the blank tab (window)
	async function handleCancel() {
		clearFormAndItems();
		// Return to parent if provided, else best-effort close
		if (onClose) {
			onClose();
		} else {
			try {
				router.push('/assetdata/transfer');
			} catch {
				try { window.close(); } catch { }
			}
		}
	}

	// Handler to open sidebar and fetch assets supervised by the requestor
	async function handleOpenSidebar() {
		if (sidebarLoading) return;
		const param = form?.requestor?.ramco_id || user?.username;
		if (!param) {
			toast.error('Unable to determine supervisor for asset lookup.');
			return;
		}
		// If we already fetched for this supervisor and have data, just open the sidebar
		if (lastSupervisorFetchKeyRef.current === String(param) && supervised.length > 0) {
			setSidebarOpen(true);
			// Refresh lock status without reloading assets
			await loadPendingAssetLocks();
			return;
		}
		setSidebarOpen(true);
		setSidebarLoading(true);
		try {
			const res: any = await authenticatedApi.get(`/api/assets?supervisor=${param}`);
			const assets = res.data?.data || [];
			setSupervised(assets);
			lastSupervisorFetchKeyRef.current = String(param);
			await loadPendingAssetLocks();
			// Quiet load; no toast on counts
		} catch (err) {
			console.error('Error fetching assets:', err);
			toast.error('Failed to load assets');
		} finally {
			setSidebarLoading(false);
		}
	}

	// Manager sidebar (master assets list)
	async function handleOpenManagerSidebar() {
		if (!managerId) {
			toast.error('Manager access not available.');
			return;
		}
		if (managerSidebarLoading) return;
		// If already loaded for this manager, avoid refetch and just open
		if (lastManagerFetchKeyRef.current === String(managerId) && managerAssets.length > 0) {
			setManagerSidebarOpen(true);
			return;
		}
		setManagerSidebarOpen(true);
		setManagerSidebarLoading(true);
		try {
			const url = `/api/assets?manager=${encodeURIComponent(String(managerId))}&status=active`;
			const res: any = await authenticatedApi.get(url);
			const assets = res?.data?.data || res?.data || [];
			setManagerAssets(assets);
			const acceptances: Record<number, boolean> = {};
			assets.forEach((a: any) => {
				const id = Number(a?.id);
				if (!id) return;
				if (String(a?.asset_transfer_status || '').toLowerCase() === 'pending acceptance') {
					acceptances[id] = true;
				}
			});
			setPendingAssetAcceptance(prev => ({ ...prev, ...acceptances }));
			lastManagerFetchKeyRef.current = String(managerId);
		} catch (err) {
			toast.error('Failed to load managed assets');
			setManagerAssets([]);
		} finally {
			setManagerSidebarLoading(false);
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

	// When a new owner is selected, fetch their org info and auto-fill cost center, department and location
	async function autofillNewOwnerRelated(itemId: number | string, ownerStaffId: string) {
		if (!ownerStaffId) return;
		try {
			const res: any = await authenticatedApi.get(`/api/assets/employees/lookup/${ownerStaffId}`);
			const data = res?.data?.data || {};
			const ccId = data?.costcenter?.id ? String(data.costcenter.id) : '';
			const deptId = data?.department?.id ? String(data.department.id) : '';
			const locId = data?.location?.id ? String(data.location.id) : '';
			if (ccId) detectNewChanges(String(itemId), 'new', 'costCenter', ccId);
			if (deptId) detectNewChanges(String(itemId), 'new', 'department', deptId);
			if (locId) detectNewChanges(String(itemId), 'new', 'location', locId);
		} catch (err) {
			// Silent fail — leave selections as-is
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

	function isEmployeeSelected(emp: any): boolean {
		const key = String(emp?.ramco_id || '').toLowerCase();
		if (!key) return false;
		return selectedItems.some(si =>
			si.transfer_type === 'Employee' &&
			String(si?.ramco_id || '').toLowerCase() === key
		);
	}

	function isAssetLockedByPendingTransfer(asset: any): boolean {
		const assetId = Number(asset?.id);
		if (!assetId) return false;
		return !!pendingAssetLocks[assetId];
	}

	function isAssetPendingAcceptance(asset: any): boolean {
		const assetId = Number(asset?.id);
		if (!assetId) return false;
		return !!pendingAssetAcceptance[assetId];
	}

	function isEmployeeLocked(emp: any): boolean {
		const key = String(
			emp?.ramco_id ||
			emp?.id ||
			emp?.owner?.ramco_id ||
			emp?.employee?.ramco_id ||
			emp?.asset_id
		).trim().toLowerCase();
		if (!key) return false;
		return !!pendingEmployeeLocks[key] || !!pendingEmployeeLocks[String(Number(key))]; // handle numeric/zero-padded ids
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

	// Prefetch employees for new-owner picker
	// - Asset managers: all active employees
	// - Regular users: employees in same department
	useEffect(() => {
		const deptId = form?.requestor?.department?.id;
		let cancelled = false;
		(async () => {
			try {
				if (managerId) {
					const res: any = await authenticatedApi.get(`/api/assets/employees?status=active`);
					if (!cancelled) setEmployees(res.data?.data || []);
					return;
				}
				if (!deptId) {
					if (!cancelled) setEmployees([]);
					return;
				}
				const res: any = await authenticatedApi.get(`/api/assets/employees?dept=${deptId}&status=active`);
				if (!cancelled) setEmployees(res.data?.data || []);
			} catch (err) {
				if (!cancelled) setEmployees([]);
			} finally {
				// Refresh pending locks after employees are loaded so the list re-filters with latest locks
				try { await loadPendingAssetLocks(); } catch { /* ignore */ }
			}
		})();
		return () => { cancelled = true; };
	}, [form?.requestor?.department?.id, managerId, loadPendingAssetLocks]);

	// Require at least one reason per selected item before enabling submit
	const allItemsHaveReason = React.useMemo(() => {
		if (!selectedItems || selectedItems.length === 0) return false;
		return selectedItems.every((it: any) => {
			const reasons = itemReasons[it.id] || {};
			return Object.entries(reasons).some(([key, val]) => {
				if (key === 'othersText' || key === 'comment') return false;
				return val === true || val === 'true' || val === 1;
			});
		});
	}, [selectedItems, itemReasons]);

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
						// Prefill form state for edit mode (map API fields)
						const mappedRequestor: Requestor = {
							ramco_id: data?.transfer_by_user?.ramco_id || data?.transfer_by || '',
							full_name: data?.transfer_by_user?.full_name || '',
							position: null,
							department: data?.department
								? { id: data.department.id, name: data.department.name || data.department.code || '', code: data.department.code || '' }
								: null,
							costcenter: data?.costcenter ? { id: data.costcenter.id, name: data.costcenter.name } : null,
							location: null,
							email: undefined,
							contact: undefined,
						};

						setForm((prev: any) => ({
							...prev,
							...data,
							requestor: mappedRequestor,
						}));
						if (data?.transfer_date) setDateRequest(data.transfer_date);
						// Determine transfer type based on existing data
						const inferredOption: 'resignation' | 'transfer' = data.items?.some((item: any) => item.transfer_type === 'Employee') ? 'resignation' : 'transfer';
						setApplicationOption(inferredOption);
						// Map items to selectedItems
						if (Array.isArray(data.items)) {
							setSelectedItems(
								data.items.map((item: any) => {
									const asset = item.asset || {};
									const currentOwner = item.current_owner ? { ramco_id: item.current_owner.ramco_id, name: item.current_owner.full_name } : null;
									return {
										...item,
										id: item.id,
										transfer_type: 'Asset',
										// S/N strictly from register_number
										register_number: asset.register_number || '',
										asset_type: asset?.type?.name || '',
										// For summary blocks
										owner: currentOwner,
										costcenter: item.current_costcenter || null,
										department: item.current_department || null,
										location: item.current_location || null,
										// Asset details
										type: asset.type || null,
										category: asset.category || null,
										brand: asset.brand || null,
										model: asset.model || null,
									};
								})
							);
							// Prefill effective dates
							setItemEffectiveDates(
								Object.fromEntries(data.items.map((item: any) => [item.id, item.effective_date ? item.effective_date.slice(0, 10) : '']))
							);
							// Prefill transfer details (current/new)
							setItemTransferDetails(
								Object.fromEntries(
									data.items.map((item: any) => [
										item.id,
										{
											current: {
												ownerName: (item.current_owner?.full_name || '') as string,
												ownerStaffId: (item.current_owner?.ramco_id || '') as string,
												costCenter: String(item.current_costcenter?.id || ''),
												department: String(item.current_department?.id || ''),
												location: String(item.current_location?.id || ''),
											},
											new: {
												ownerName: (item.new_owner?.full_name || '') as string,
												ownerStaffId: (item.new_owner?.ramco_id || '') as string,
												costCenter: String(item.new_costcenter?.id || ''),
												department: String(item.new_department?.id || ''),
												location: String(item.new_location?.id || ''),
											},
											effectiveDate: item.effective_date ? item.effective_date.slice(0, 10) : '',
										},
									])
								)
							);
							// Prefill reasons
							setItemReasons(
								Object.fromEntries(
									data.items.map((item: any) => {
										// API provides `reason` as labels; toggle the ones we recognize by label
										const reasonStr = String(item.reason || item.reasons || '').trim();
										const labels = reasonStr ? reasonStr.split(',').map((s: string) => s.trim()) : [];
										const toggles: Record<string, boolean> = {};
										for (const [val, label] of Object.entries(REASON_VALUE_TO_LABEL)) {
											if (labels.includes(label)) toggles[val] = true;
										}
										return [item.id, toggles];
									})
								)
							);
							// Prefill returnToAssetManager
							setReturnToAssetManager(
								Object.fromEntries(data.items.map((item: any) => [item.id, !!item.return_to_asset_manager]))
							);
							// Prefill attachment names (we can't reconstruct File objects)
							setItemAttachmentNames(
								Object.fromEntries(data.items.map((item: any) => [item.id, item.attachment1 || item.attachment || null]))
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

	// Discover manager access once (if current user listed in /api/assets/managers)
	useEffect(() => {
		const fetchManagerAccess = async () => {
			if (!user?.username) return;
			try {
				const res: any = await authenticatedApi.get('/api/assets/managers');
				const list: any[] = res?.data?.data || res?.data || [];
				const match = list.find((m: any) => {
					const ramco = m?.ramco_id || m?.employee?.ramco_id;
					const active = String(m?.is_active ?? '').toLowerCase() === '1' || m?.is_active === 1;
					return active && ramco && String(ramco) === String(user.username);
				});
				if (match) {
					const mgrId = match.manager_id ?? match.id ?? null;
					if (mgrId) setManagerId(Number(mgrId));
				}
			} catch (err) {
				// Silent failure; manager access is optional
			}
		};
		fetchManagerAccess();
	}, [user?.username]);

	if (loading) return <div className="p-8 text-center">Loading...</div>;
	if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

	// Read-only rules and watermark
	const isApproved = String(form?.transfer_status || '').toLowerCase() === 'approved';
	const isSubmitted = requestStatus === 'submitted';
	const allAccepted = isApproved && selectedItems.length > 0 && selectedItems.every((it: any) => Boolean(it.acceptance_date));
	const isReadOnly = isSubmitted || isApproved;
	const watermarkText = isApproved ? (allAccepted ? 'Accepted' : 'Pending Acceptance') : undefined;

	return (
		<>
			{/* AlertDialogs for confirmation */}
			<AlertDialog open={openSubmitDialog} onOpenChange={(open) => { if (!open && !submitting) setOpenSubmitDialog(false); }}>
				<AlertDialogContent className="backdrop-blur-md bg-white/70 dark:bg-slate-900/60 border border-white/30 shadow-2xl ring-1 ring-white/20">
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

			{/* Success dialog after submission */}
			<AlertDialog open={openSuccessDialog} onOpenChange={(open) => { if (!open) setOpenSuccessDialog(false); }}>
				<AlertDialogContent className="backdrop-blur-md bg-white/70 dark:bg-slate-900/60 border border-white/30 shadow-2xl ring-1 ring-white/20">
					<AlertDialogHeader>
						<AlertDialogTitle>Submission Successful</AlertDialogTitle>
						<AlertDialogDescription>
							Your asset transfer request has been submitted successfully.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogAction asChild>
							<button
								className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
								onClick={() => { setOpenSuccessDialog(false); handleCancel(); }}
							>
								Close
							</button>
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
			<AlertDialog open={openCancelDialog} onOpenChange={(open) => { if (!open) setOpenCancelDialog(false); }}>
				<AlertDialogContent className="backdrop-blur-md bg-white/70 dark:bg-slate-900/60 border border-white/30 shadow-2xl ring-1 ring-white/20">
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

			<div className="flex items-center justify-between mb-4">
				<h2 className="text-2xl font-bold">Asset Transfer Form
					<p className="text-xs text-gray-400 mb-4">
						Use this form to transfer an asset to another person or location within the organization. Provide the required details and submit when ready.
					</p>
				</h2>
				<Button
					variant="outline"
					size="sm"
					className='border border-red-600 hover:bg-red-600 hover:text-white'
					onClick={() => setOpenCancelDialog(true)}
				>
					Back to Records
				</Button>
			</div>
			<Card>
				<CardHeader>
					<CardTitle className='text-lg'>Requestor</CardTitle>
				</CardHeader>
				<CardContent className="relative">
					{watermarkText && (
						<div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
							<div className="text-6xl md:text-8xl font-extrabold uppercase tracking-widest text-gray-300/40 dark:text-white/10 select-none -rotate-12">
								{watermarkText}
							</div>
						</div>
					)}
					<form className="text-sm space-y-6" onSubmit={e => { e.preventDefault(); setOpenSubmitDialog(true); }} ref={formRef}>

						{/* 1. Requestor Details */}
						<div className="space-y-2">
							{/* Hidden inputs for payload */}
							<input type="hidden" name="ramco_id" value={requestor?.ramco_id ?? ''} />
							<input type="hidden" name="request_date" value={requestDateValue} />
							{/* Row 1: Application Date aligned right */}
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
								<div className="sm:col-start-2">
									<Label className="text-sm">Application Date</Label>
									<Input value={requestDateDisplay} disabled />
								</div>
							</div>
							{/* Row 2: Name & Ramco ID */}
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
								<div>
									<Label className="text-sm">Name</Label>
									<Input value={requestor?.full_name || ''} disabled />
								</div>
								<div>
									<Label className="text-sm">Ramco ID</Label>
									<Input value={requestor?.ramco_id || ''} disabled />
								</div>
							</div>
							{/* Row 3: Cost Center & Department */}
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
								<div>
									<Label className="text-sm">Cost Center</Label>
									<Input value={requestor?.costcenter?.name || ''} disabled />
								</div>
								<div>
									<Label className="text-sm">Department</Label>
									<Input value={requestor?.department?.name || ''} disabled />
								</div>
							</div>
							{/* Application Options moved above next to Request Date */}
						</div>

						{/* 2. Transfer Items */}
						<Separator className="my-2" />
						<div className="p-0">
							<div className="font-semibold flex items-center justify-between text-lg gap-2">
								<div className="flex items-center gap-3">
									<span>Transfer Items</span>
									<Badge variant="secondary" className="text-xs px-2 py-1 bg-gray-100 border border-gray-300 text-gray-800 dark:bg-gray-700 dark:text-gray-100">
										Added: {selectedItems.length} items
									</Badge>
									{/* Status badges */}
									{isApproved && (
										<>
											<Badge className="bg-green-600 text-white">Approved</Badge>
											{allAccepted ? (
												<Badge className="bg-green-700 text-white">Accepted</Badge>
											) : (
												<Badge className="bg-amber-500 text-white">Pending Acceptance</Badge>
											)}
										</>
									)}
									{!isApproved && isSubmitted && (
										<Badge variant="secondary">Submitted</Badge>
									)}
								</div>
								<div className="flex items-center gap-2">
									{!managerId && (
										<TooltipProvider>
											<Tooltip open={showAddItemsTooltip}>
												<TooltipTrigger asChild>
													<span>
														<Button
															type="button"
															onClick={handleOpenSidebar}
															size="lg"
															variant="default"
															className="bg-black hover:bg-black/90 text-white rounded-xl px-4"
															title="Add Items"
															disabled={sidebarLoading || isReadOnly}
														>
															{sidebarLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
														</Button>
													</span>
												</TooltipTrigger>
												<TooltipContent side="top" align="center" className="z-50">
													Click here to add items for transfer.
												</TooltipContent>
											</Tooltip>
										</TooltipProvider>
									)}
									{managerId ? (
										<Button
											type="button"
											variant="outline"
											size="lg"
											onClick={handleOpenManagerSidebar}
											disabled={managerSidebarLoading || isReadOnly}
											className="rounded-xl px-4 bg-white text-black hover:bg-gray-100"
										>
											{managerSidebarLoading ? (
												<>
													<Loader2 className="w-5 h-5 mr-2 animate-spin" /> Loading
												</>
											) : (
												<>
													<Plus className="w-5 h-5 mr-2" /> Master Assets
												</>
											)}
										</Button>
									) : null}
								</div>
							</div>
						{selectedItems.length === 0 ? (
							<div className="text-gray-400 text-center py-4">No items selected.</div>
						) : (
								<div className="mt-2 px-1 space-y-3">
									{selectedItems.map((item, idx) => {
										if (typeof item.id === 'undefined' || item.id === null) return null;
										const isEmployee = item.transfer_type === 'Employee';
										const typeLabel = isEmployee ? 'Employee' : 'Asset';
										const isAcceptedItem = Boolean(item.acceptance_date && item.acceptance_by);
										// Find employee details for Employee accordions
										const sidebarEmployees = Array.isArray(employees) ? employees : [];
										const supervisedEmployees = Array.isArray(supervised) ? supervised.flatMap(g => g.employee || []) : [];
										const allEmployees = [...sidebarEmployees, ...supervisedEmployees];
										const employeeDetails = allEmployees.find(e =>
											String(e.ramco_id) === String(item.ramco_id) || e.full_name === item.full_name
										);
										return (
											<Accordion
												type="single"
												collapsible
												key={item.id}
												// controlled expansion so we can style the expanded item
												value={expandedItems[item.id] ? `item-${item.id}` : undefined}
												onValueChange={(val: string | undefined) => setExpandedItems(prev => ({ ...prev, [item.id]: !!val }))}
												className={`px-4 bg-lime-800/20 rounded ring-1 ring-offset-2 ${item.acceptance_date && item.acceptance_by ? 'ring-green-400' : (expandedItems[item.id] ? 'ring-lime-600' : 'ring-gray-200')}`}
											>
												<AccordionItem value={`item-${item.id}`}>
													<AccordionTrigger className="no-underline hover:no-underline px-0">
														<div className="flex w-full flex-col gap-3 md:grid md:grid-cols-[1fr_auto] md:items-center">
															<div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
																<Button type="button" size="icon" variant="ghost" className="text-red-500 hover:bg-red-500 hover:text-white shrink-0" onClick={e => { e.stopPropagation(); removeSelectedItem(idx); }}>
																	<X />
																</Button>
																<span className="text-xs font-semibold text-blue-600 min-w-17.5 text-left">Item {idx + 1}/{selectedItems.length}</span>
																<span className="text-xs font-semibold text-blue-600 min-w-17.5 text-left">{typeLabel}</span>
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
															<div className="flex w-full flex-col gap-1 justify-self-end md:w-auto md:flex-row md:items-center">
																{/* Watermark replaces badge; nothing here */}
																<Label className="font-medium mb-0 text-xs md:mr-2">Effective Date <span className="text-red-500" aria-hidden="true">*</span></Label>
																<Input
																	type="date"
																	required
																	className={`w-full min-w-0 bg-stone-100 md:w-40 ${!itemEffectiveDates[item.id] && submitError ? 'border-red-500' : ''}`}
																	value={itemEffectiveDates[item.id] || ''}
																	onChange={e => handleItemEffectiveDate(item.id, e.target.value)}
																	onClick={e => e.stopPropagation()}
																	onFocus={e => e.stopPropagation()}
																	disabled={isAcceptedItem}
																/>
																{!itemEffectiveDates[item.id] && (
																	<span className="text-xs text-red-500 md:ml-2">Required</span>
																)}
															</div>
														</div>
													</AccordionTrigger>
													<AccordionContent>
														<div className={`relative p-4 bg-stone-100/80 rounded-lg border ${expandedItems[item.id] ? '' : ''}`}>
															{item.acceptance_date && item.acceptance_by && (
																<div className="pointer-events-none select-none absolute inset-0 z-20 flex items-center justify-center">
																	<span className="-rotate-12 text-4xl md:text-6xl font-extrabold tracking-wider text-green-600/45">ACCEPTED • COMPLETED</span>
																</div>
															)}
															<div className="relative z-10">
																{/* EMPLOYEE DETAILS SECTION */}
																{item.transfer_type === 'Employee' && (
																	<div className="py-2 rounded">
																		<div className="font-semibold text-sm mb-2">Employee Details</div>
																		<div className="flex flex-col gap-2 text-sm sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
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
																		<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
																			<div className="font-semibold">Transfer Details</div>
																			{!isEmployee && (
																				<div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
																					<div className="font-medium whitespace-nowrap">Return to Asset Manager</div>
																					<Switch
																						disabled={isAcceptedItem}
																						checked={!!returnToAssetManager[item.id]}
																						onCheckedChange={(checked: boolean) => setReturnToAssetManagerFor(item.id, checked)}
																						className="shrink-0"
																					/>
																				</div>
																			)}
																		</div>
																		{/* Show only Transfer Details error for this item */}
																		{submitError && submitError.includes(item.register_number || item.full_name || item.asset_code || item.id)
																			&& submitError.toLowerCase().includes('transfer detail') && (
																				<div className="text-red-600 text-xs font-semibold mt-1">
																					{submitError}
																				</div>
																			)}
																	</div>

																	{/* Description for Transfer Details */}
																	<div className="flex items-center gap-1 text-xs text-red-500 font-semibold -mt-1.5 mb-4">
																		<AlertTriangle className="w-4 h-4 animate-pulse" aria-hidden="true" />
																		<span>
																			Select who this asset will be transferred to. Picking a new owner can auto-fill the new Cost Center, Department, and Location; this assignment will be replicated to the next items—adjust as needed.
																		</span>
																	</div>

																	{/* Effective Date moved to header; Transfer type radio controls present in header */}

																	<div className="-mx-1 overflow-x-auto md:mx-0">
																		<table className="w-full min-w-130 text-left align-middle text-xs sm:text-sm">
																			<thead className="bg-transparent py-0">
																				<tr>
																					<th className="bg-transparent py-1 pr-4 sm:pr-6 w-[20%]"></th>
																					<th className="bg-transparent py-1 px-4 sm:px-8">Current</th>
																					<th className="bg-transparent py-1 px-2 sm:px-4">New</th>
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
																						<td className="py-0.5 px-4 sm:px-8">
																							<div className="w-full py-1.5 text-sm text-gray-900">{renderValue(item.owner?.full_name)}</div>
																						</td>
																						<td className="py-0.5">
																							{/* New Owner autocomplete, fallback to a simple input+dropdown if shadcn Autocomplete is not available */}
																							<div>
																								{/* Use Combobox SingleSelect for new owner - show employee full names but store ramco_id as value */}
																								{(() => {
																									const currentOwnerId =
																										item.owner?.ramco_id ||
																										itemTransferDetails[item.id]?.current?.ownerStaffId ||
																										'';
																									const newOwnerOptions = employees
																										.filter(emp => emp.ramco_id !== currentOwnerId)
																										.map(emp => ({ value: emp.ramco_id, label: emp.full_name }));

																									const handleNewOwnerChange = (val: string) => {
																										if (val && currentOwnerId && val === currentOwnerId) {
																											toast.error('Cannot transfer to the current owner.');
																											return;
																										}
																										detectNewChanges(item.id, 'new', 'ownerName', employees.find(e => e.ramco_id === val)?.full_name || '');
																										detectNewChanges(item.id, 'new', 'ownerStaffId', val);
																										// Auto-fill related fields (cost center, department, location)
																										autofillNewOwnerRelated(item.id, val);
																									};

																									return (
																								<Combobox
																									options={newOwnerOptions}
																									value={itemTransferDetails[item.id]?.new.ownerStaffId || ''}
																									onValueChange={handleNewOwnerChange}
																									placeholder="Search new owner"
																									searchPlaceholder="Search employees..."
																									emptyMessage="No employees"
																									disabled={isAcceptedItem || !!returnToAssetManager[item.id]}
																									className="w-full border border-gray-200 rounded-md bg-stone-100"
																								/>
																									);
																								})()}
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
																								disabled={isAcceptedItem || !!returnToAssetManager[item.id]}
																								onCheckedChange={checked => { if (!checked) detectNewChanges(item.id, 'new', 'costCenter', ''); }}

																							/>
																							Cost Center
																						</Label>
																					</td>
																					<td className="py-0.5 px-4 sm:px-8"><div className="w-full py-1.5 text-sm text-gray-900">{renderValue(item.costcenter?.name)}</div></td>
																					<td className="py-0.5">
																						<SingleSelect
																							options={costCenters.map(cc => ({ value: String(cc.id), label: cc.name }))}
																							value={itemTransferDetails[item.id]?.new.costCenter || ''}
																							onValueChange={val => detectNewChanges(item.id, 'new', 'costCenter', val)}
																							placeholder="New Cost Center"
																							disabled={isAcceptedItem || !!returnToAssetManager[item.id]}
																							className="w-full border border-gray-200 rounded-md bg-stone-100"
																						/>
																					</td>
																				</tr>
																				<tr className="border-b-0">
																					<td className="py-0.5">
																						<Label className="flex items-center gap-2">
																							<Checkbox
																								checked={!!itemTransferDetails[item.id]?.new.department}
																								disabled={isAcceptedItem || !!returnToAssetManager[item.id]}
																								onCheckedChange={checked => { if (!checked) detectNewChanges(item.id, 'new', 'department', ''); }}

																							/>
																							Department
																						</Label>
																					</td>
																					<td className="py-0.5 px-4 sm:px-8"><div className="w-full py-1.5 text-sm text-gray-900">{renderValue(item.department?.name)}</div></td>
																					<td className="py-0.5">
																						<SingleSelect
																							options={departments.map(dept => ({ value: String(dept.id), label: dept.code || dept.name }))}
																							value={itemTransferDetails[item.id]?.new.department || ''}
																							onValueChange={val => detectNewChanges(item.id, 'new', 'department', val)}
																							placeholder="New Department"
																							disabled={isAcceptedItem || !!returnToAssetManager[item.id]}
																							className="w-full border border-gray-200 rounded-md bg-stone-100"
																						/>
																					</td>
																				</tr>
																				<tr className="border-b-0">
																					<td className="py-0.5">
																						<Label className="flex items-center gap-2">
																							<Checkbox
																								checked={!!itemTransferDetails[item.id]?.new.location}
																								disabled={isAcceptedItem || !!returnToAssetManager[item.id]}
																								onCheckedChange={checked => { if (!checked) detectNewChanges(item.id, 'new', 'location', ''); }}

																							/>
																							Location
																						</Label>
																					</td>
																					<td className="py-0.5 px-4 sm:px-8"><div className="w-full py-1.5 text-sm text-gray-900">{renderValue(item.location?.name)}</div></td>
																					<td className="py-0.5">
																						<SingleSelect
																							options={locations.map(loc => ({ value: String(loc.id), label: loc.code || loc.name }))}
																							value={itemTransferDetails[item.id]?.new.location || ''}
																							onValueChange={val => detectNewChanges(item.id, 'new', 'location', val)}
																							placeholder="New Location"
																							disabled={isAcceptedItem || !!returnToAssetManager[item.id]}
																							className="w-full border border-gray-200 rounded-md bg-stone-100"
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

																		{/* Description for Reason for Transfer */}
																		<div className={`text-xs ${allItemsHaveReason ? 'text-muted-foreground' : 'text-red-500 font-semibold'} -mt-1.5 mb-4`}>
																			Choose the reason(s) for this transfer. You can select multiple options and add more context in Other Reason.
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
																								disabled={isAcceptedItem}
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
																								disabled={isAcceptedItem}
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
																								disabled={isAcceptedItem}
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
																					className="w-full border rounded px-2 py-1 text-sm min-h-10"
																					placeholder="Please specify..."
																					value={form.reason.othersText}
																					onChange={e => handleInput('reason', 'othersText', e.target.value)}
																					disabled={isAcceptedItem}
																				/>
																			</div>
																		)}

																		<div className="flex flex-col md:flex-row justify-between gap-10 items-start mt-2">
																			<div className="flex-1">
																				<Label className="font-semibold mb-1">Other Reason</Label>
																				<Textarea
																					className="w-full min-h-22.5 border rounded px-2 py-1 text-sm bg-stone-100"
																					placeholder="Add your comment here..."
																					disabled={isAcceptedItem}
																					value={itemReasons[item.id]?.comment || ''}
																					onChange={e => handleItemCommentInput(item.id, e.target.value)}
																				/>
																			</div>
																			<div className="flex-1 bg-stone-100">
																				<Label className="font-semibold mb-1">Attachments</Label>
																				<div className="border-2 border-dashed rounded-md p-1 text-center">
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
																						disabled={isAcceptedItem}
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
															</div>
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
												if (sidebarLoading) {
													return (
														<div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
															<Loader2 className="h-6 w-6 animate-spin text-blue-600" />
															<p className="text-sm text-muted-foreground">Loading assets...</p>
														</div>
													);
												}
												const renderEmployees = () => {
													const list = Array.isArray(employees) ? employees : [];
													const filteredEmployees = list.filter(emp => {
														if (!employeeSearch) return true;
														const search = employeeSearch.toLowerCase();
														const matches = (v?: string) => !!v && v.toLowerCase().includes(search);
														return (
															matches(emp.full_name) ||
															matches(emp.name) ||
															matches(emp.ramco_id) ||
															matches(emp.department?.name) ||
															matches(emp.location?.name)
														);
													}).filter(emp => !isEmployeeLocked(emp));

													return (
														<div className="flex flex-col gap-3">
															<div className="font-semibold flex flex-col gap-2">
																<span>Employees ({filteredEmployees.length})</span>
																<Input
																	type="text"
																	placeholder="Search employees..."
																	className="border rounded px-2 py-1 w-full text-sm"
																	value={employeeSearch}
																	onChange={e => setEmployeeSearch(e.target.value)}
																/>
															</div>
															{filteredEmployees.length === 0 ? (
																<div className="text-sm text-muted-foreground">No employees found.</div>
															) : (
																<ul className="space-y-2">
																	{filteredEmployees.map((emp, idx) => {
																		const name = emp.full_name || emp.name || emp.ramco_id;
																		const dept = emp.department?.name || '';
																		const loc = emp.location?.name || '';
																		const cost = emp.costcenter?.name || emp.cost_center?.name || '';
																		const alreadySelected = isEmployeeSelected(emp);
																		const locked = isEmployeeLocked(emp);
																		return (
																			<li key={emp.ramco_id || idx} className={`rounded-lg border px-3 py-2 ${locked ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-slate-200 bg-white dark:bg-gray-700'}`}>
																				<div className="flex items-start justify-between gap-3">
																					<div className="flex-1">
																						<div className="font-semibold text-blue-800 dark:text-blue-200">{name}</div>
																						<div className="text-sm text-gray-600 dark:text-gray-300">{emp.ramco_id}</div>
																						<div className="text-xs text-gray-500 dark:text-gray-300 mt-1 space-y-0.5">
																							{dept && <div>Dept: {dept}</div>}
																							{cost && <div>Cost Center: {cost}</div>}
																							{loc && <div>Location: {loc}</div>}
																						</div>
																						{locked && (
																							<div className="mt-1 text-xs font-semibold text-amber-700">
																								Pending transfer approval
																							</div>
																						)}
																					</div>
																					<div className="flex items-center gap-2">
																						<Button
																							type="button"
																							variant="ghost"
																							size="icon"
																							disabled={alreadySelected || locked}
																							title={locked ? 'Pending transfer in progress' : (alreadySelected ? 'Already added' : 'Add employee')}
																							onClick={() => addSelectedItem(emp)}
																						>
																							<CirclePlus className="w-5 h-5" />
																						</Button>
																					</div>
																				</div>
																			</li>
																		);
																	})}
																</ul>
															)}
														</div>
													);
												};

												const renderAssets = () => {
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

														const filteredOwners = Object.entries(ownerGroups).filter(([ownerKey, assets]) => {
															if (employeeFilter && employeeFilter.ramco_id !== ownerKey) return false;
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
																matches(getAssetTypeName(a)) ||
																matches(getAssetDepartmentName(a)) ||
																matches(getAssetCostCenterName(a))
															));
															return matches(ownerName) || matches(ownerId) || assetMatches;
														});

														return (
															<>
																<div className="mb-4 font-semibold flex flex-col gap-2">
																	<span>Owners ({filteredOwners.length})</span>
																	<Input
																		type="text"
																		placeholder="Search owners..."
																		className="border rounded px-2 py-1 w-full text-sm"
																		value={assetSearch}
																		onChange={e => setAssetSearch(e.target.value)}
																	/>
																	{employeeFilter && (
																		<div className="flex items-center gap-2 text-xs text-gray-600">
																			<Badge variant="secondary" className="bg-slate-100 text-slate-700">
																				Filtered by {employeeFilter.name} ({employeeFilter.ramco_id})
																			</Badge>
																			<Button variant="ghost" size="sm" onClick={() => setEmployeeFilter(null)}>
																				Clear
																			</Button>
																		</div>
																	)}
																</div>
																<ul className="space-y-3">
																	{filteredOwners.map(([ownerKey, assets]) => {
																		const firstAsset = assets[0];
																		const ownerName = firstAsset.owner?.full_name || 'Unassigned';
																		const ownerRamcoId = firstAsset.owner?.ramco_id || '';
																		const filteredAssets = assets.filter(a => !isAssetSelected(a));
																		const selectableAssets = filteredAssets.filter(a => !isAssetLockedByPendingTransfer(a));
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
																						type="button"
																						size="sm"
																						onClick={() => {
																							// Add all this owner's remaining assets to current selection
																							addAllAssetsForOwner(selectableAssets, ownerName);
																						}}
																						className="bg-blue-600 hover:bg-blue-700 text-white"
																						disabled={selectableAssets.length === 0}
																					>
																						Add All ({selectableAssets.length})
																					</Button>
																				</div>
																				<div className="space-y-1">
																					{filteredAssets.map((asset, idx) => {
																						const typeName = getAssetTypeName(asset);
																						const categoryName = getAssetCategoryName(asset);
																						const deptName = getAssetDepartmentName(asset);
																						const costCenterName = getAssetCostCenterName(asset);
																						const typeLine = [typeName, categoryName].filter(Boolean).join(' - ');
																						const deptCostLine = [deptName, costCenterName].filter(Boolean).join(' • ');
																						const locked = isAssetLockedByPendingTransfer(asset);
																						return (
																							<div key={asset.id || idx} className="text-xs bg-white dark:bg-gray-600 rounded p-2 flex justify-between items-center">
																								<div>
																									<span className="font-medium">{asset.register_number}</span>
																									<div className="text-gray-600 dark:text-gray-300">
																										{typeLine || '-'}
																									</div>
																									<div className="text-gray-500 dark:text-gray-400">
																										{deptCostLine || '-'}
																									</div>
																									{locked && (
																										<Badge variant="secondary" className="mt-1 bg-amber-100 text-amber-800">
																											Pending transfer
																										</Badge>
																									)}
																								</div>
																								<button
																									type="button"
																									className={`rounded-full p-1 ${locked ? 'cursor-not-allowed text-gray-300' : 'text-blue-500 hover:text-blue-600'}`}
																									onClick={() => addSelectedItem(asset)}
																									disabled={locked}
																									title={locked ? 'Pending transfer in progress' : 'Add asset'}
																								>
																									<CirclePlus className="w-5 h-5" />
																								</button>
																							</div>
																						);
																					})}
																				</div>
																			</li>
																		);
																	})}
																</ul>
															</>
														);
													}

													// Regular asset list for internal transfer
													const allAssets = Array.isArray(supervised) ? supervised : [];
													const filteredAssets = allAssets.filter((a: any) => {
														if (employeeFilter && String(a?.owner?.ramco_id || '') !== employeeFilter.ramco_id) return false;
														if (!assetSearch) return true;
														const search = assetSearch.toLowerCase();
														const matches = (value?: string) => !!value && value.toLowerCase().includes(search);
														return (
															matches(a.register_number) ||
															matches(a.entry_code) ||
															matches(getAssetCategoryName(a)) ||
															matches(getAssetTypeName(a)) ||
															matches(getAssetDepartmentName(a)) ||
															matches(getAssetCostCenterName(a)) ||
															matches(a?.owner?.full_name) ||
															matches(a?.owner?.ramco_id)
														);
													});

													const typeCounts: Record<string, number> = {};
													filteredAssets.forEach(a => {
														const typeName = getAssetTypeName(a);
														const key = typeName && typeName.trim() ? typeName : '(Unspecified)';
														typeCounts[key] = (typeCounts[key] || 0) + 1;
													});
													const summary = Object.entries(typeCounts).map(([type, count]) => `${type}: ${count}`).join(' | ');

													return (
														<>
															<div className="mb-4 font-semibold flex flex-col gap-2">
																<span>Assets ({summary || '0'})</span>
																<Input
																	type="text"
																	placeholder="Search assets..."
																	className="border rounded px-2 py-1 w-full text-sm"
																	value={assetSearch}
																	onChange={e => setAssetSearch(e.target.value)}
																/>
																{employeeFilter && (
																	<div className="flex items-center gap-2 text-xs text-gray-600">
																		<Badge variant="secondary" className="bg-slate-100 text-slate-700">
																			Filtered by {employeeFilter.name} ({employeeFilter.ramco_id})
																		</Badge>
																		<Button type="button" variant="ghost" size="sm" onClick={() => setEmployeeFilter(null)}>
																			Clear
																		</Button>
																	</div>
																)}
															</div>
															<ul className="space-y-2">
																{filteredAssets.map((a: any, j: any) => {
																	const assetType = getAssetTypeName(a) || '';
																	const lowerType = assetType.toLowerCase();
																	let typeIcon = null;
																	if (lowerType.includes('motor')) {
																		typeIcon = <CarIcon className="w-4.5 h-4.5 text-pink-500" />;
																	} else if (lowerType.includes('computer')) {
																		typeIcon = <LucideComputer className="w-4.5 h-4.5 text-green-500" />;
																	}
																	const categoryName = getAssetCategoryName(a);
																	const deptName = getAssetDepartmentName(a);
																	const costCenterName = getAssetCostCenterName(a);
																	const typeLine = [assetType, categoryName].filter(Boolean).join(' - ');
																	const deptCostLine = [deptName, costCenterName].filter(Boolean).join(' • ');
																	const locked = isAssetLockedByPendingTransfer(a);
																	const pendingAcceptance = isAssetPendingAcceptance(a);
																	const alreadySelected = isAssetSelected(a);
																	const disableAdd = locked || pendingAcceptance || alreadySelected;
																	return (
																		<React.Fragment key={a.id || a.register_number || j}>
																			<li className={`flex flex-col rounded-lg px-3 py-2 transition-all duration-200 ${pendingAcceptance ? 'bg-amber-100/50 border border-amber-200' : 'bg-indigo-100 dark:bg-gray-800'} ${alreadySelected ? 'opacity-60 saturate-50 scale-[0.99]' : 'hover:shadow-md'}`}>
																				<div className="flex items-center gap-3">
																					<div className="flex items-center gap-2">
																						<button
																							type="button"
																							className={`rounded-full p-1 ${disableAdd ? 'cursor-not-allowed text-blue-200' : 'text-blue-500 hover:text-blue-600'}`}
																							onClick={() => { if (!disableAdd) addSelectedItem(a); }}
																							disabled={disableAdd}
																							title={
																								locked
																									? 'Pending transfer in progress'
																									: pendingAcceptance
																										? 'Pending acceptance in progress'
																										: (alreadySelected ? 'Already selected' : 'Add asset')
																							}
																						>
																							<CirclePlus className="w-6 h-6" />
																						</button>
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
																							<div>{deptCostLine || '-'}</div>
																						</div>
																						{locked && (
																							<Badge variant="secondary" className="mt-1 bg-amber-100 text-amber-800 w-fit">
																								Pending transfer
																							</Badge>
																						)}
																						{pendingAcceptance && (
																							<Badge variant="secondary" className="mt-1 bg-sky-100 text-sky-800 w-fit">
																								Pending acceptance
																							</Badge>
																						)}
																						{alreadySelected && !locked && (
																							<Badge variant="secondary" className="mt-1 bg-blue-100 text-blue-800 w-fit">
																								Selected
																							</Badge>
																						)}
																					</div>
																				</div>
																			</li>
																		</React.Fragment>
																	);
																})}
															</ul>
														</>
													);
												};

												return (
													<>
														<Tabs value={sidebarTab} onValueChange={(val) => setSidebarTab(val as 'assets' | 'employees')}>
															<TabsList>
																<TabsTrigger value="assets">Assets</TabsTrigger>
																<TabsTrigger value="employees">Employees</TabsTrigger>
															</TabsList>
														</Tabs>
														<div className="mt-3">
															{sidebarTab === 'employees' ? renderEmployees() : renderAssets()}
														</div>
													</>
												);
											})()}
										</div>
									}
									onClose={() => setSidebarOpen(false)}
									size="sm"
								/>
							)}
							{managerSidebarOpen && (
								<ActionSidebar
									title={"Select Managed Assets"}
									content={
										<div className="w-full">
											{(() => {
												if (managerSidebarLoading) {
													return (
														<div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
															<Loader2 className="h-6 w-6 animate-spin text-blue-600" />
															<p className="text-sm text-muted-foreground">Loading managed assets...</p>
														</div>
													);
												}
												const allAssets = Array.isArray(managerAssets) ? managerAssets : [];
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
															<span>Managed Assets ({summary || '0'})</span>
															<Input
																type="text"
																placeholder="Search assets..."
																className="border rounded px-2 py-1 w-full text-sm"
																value={managerAssetSearch}
																onChange={e => setManagerAssetSearch(e.target.value)}
															/>
														</div>
														<ul className="space-y-2">
															{allAssets
																.filter((a: any) => {
																	if (!managerAssetSearch) return true;
																	const search = managerAssetSearch.toLowerCase();
																	const matches = (value?: string) => !!value && value.toLowerCase().includes(search);
																	return (
																		matches(a.register_number) ||
																		matches(a.entry_code) ||
																		matches(getAssetCategoryName(a)) ||
																		matches(getAssetTypeName(a)) ||
																		matches(getAssetDepartmentName(a)) ||
																		matches(getAssetCostCenterName(a)) ||
																		matches(a?.owner?.full_name) ||
																		matches(a?.owner?.ramco_id)
																	);
																})
																.map((a: any, j: any) => {
																	const assetType = getAssetTypeName(a);
																	const lowerType = (assetType || '').toLowerCase();
																	let typeIcon = null;
																	if (lowerType.includes('motor')) {
																		typeIcon = <CarIcon className="w-4.5 h-4.5 text-pink-500" />;
																	} else if (lowerType.includes('computer')) {
																		typeIcon = <LucideComputer className="w-4.5 h-4.5 text-green-500" />;
																	}
																	const categoryName = getAssetCategoryName(a);
																	const deptName = getAssetDepartmentName(a);
																	const costCenterName = getAssetCostCenterName(a);
																	const brandName = (a as any)?.brand?.name || (a as any)?.brands?.name || '';
																	const modelName = (a as any)?.model?.name || '';
																	const locationName = (a as any)?.location?.name || '';
																	const typeLine = [assetType, categoryName].filter(Boolean).join(' - ');
																	const deptCostLine = [deptName, costCenterName].filter(Boolean).join(' • ');
																	const locked = isAssetLockedByPendingTransfer(a);
																	const pendingAcceptance = isAssetPendingAcceptance(a);
																	const alreadySelected = isAssetSelected(a);
																	const disableAdd = locked || pendingAcceptance || alreadySelected;
																	return (
																		<React.Fragment key={`managed-${a.id || a.register_number || j}`}>
																			<li className={`flex flex-col mr-3 border rounded-lg px-3 py-1 text-xs transition-all duration-200 ${pendingAcceptance ? 'bg-amber-100/50 border-amber-200' : 'bg-stone-200/50 border-stone-200 dark:bg-gray-800'} ${alreadySelected ? 'opacity-60 saturate-50 scale-[0.99]' : 'hover:shadow-md'}`}>
																				<div className="flex items-center gap-3">
																					<div className="flex items-center gap-2">
																						<Checkbox
																							checked={alreadySelected}
																							disabled={disableAdd}
																							onCheckedChange={(v) => {
																								if (v && !disableAdd) addSelectedItem(a);
																							}}
																						/>
																						{typeIcon && typeIcon}
																					</div>
																					<div>
																						<div className="dark:text-dark-light">
																							{a.owner?.full_name && (
																								<div className="font-medium dark:text-dark-light text-blue-600">{a.owner.full_name} <span className="text-black">({a.owner.ramco_id})</span></div>
																							)}
																						</div>
																						<span className="dark:text-dark-light">R/N: <span className='text-blue-700'> {a.register_number}</span></span>
																						<div className="text-xs text-gray-700 dark:text-gray-300">{typeLine || '-'}</div>
																						<div className="text-xs text-gray-700 dark:text-gray-400">{deptCostLine || '-'}</div>
																						{locked && (
																							<Badge variant="secondary" className="mt-1 bg-amber-100 text-amber-800">
																								Pending transfer
																							</Badge>
																						)}
																						{pendingAcceptance && (
																							<Badge variant="secondary" className="mt-1 bg-sky-100 text-sky-800">
																								Pending acceptance
																							</Badge>
																						)}
																						{alreadySelected && !locked && (
																							<Badge variant="secondary" className="mt-1 bg-blue-100 text-blue-800 w-fit">
																								Selected
																							</Badge>
																						)}
																					</div>
																					<div className="ml-auto">
																						<Popover>
																							<PopoverTrigger asChild>
																								<button
																									type="button"
																									className="p-1 rounded hover:bg-blue-50 text-blue-700"
																									title="View asset details"
																									onClick={(e) => e.stopPropagation()}
																								>
																									<Info className="w-4 h-4" />
																								</button>
																							</PopoverTrigger>
																							<PopoverContent className="text-xs space-y-1 w-48 shadow-lg bg-stone-200 border-stone-300" side="left" align="start">
																								<div className="font-semibold text-gray-800">Asset Details</div>
																								<div><span className="text-gray-500">Brand:</span> {brandName || '-'}</div>
																								<div><span className="text-gray-500">Model:</span> {modelName || '-'}</div>
																								<div><span className="text-gray-500">Location:</span> {locationName || '-'}</div>
																							</PopoverContent>
																						</Popover>
																					</div>
																				</div>
																			</li>
																		</React.Fragment>
																	);
																})}
														</ul>
													</>
												);
											})()}
										</div>
									}
									onClose={() => { setManagerSidebarOpen(false); setManagerAssetSearch(''); }}
									size="sm"
								/>
							)}
						</div>

						<div className="flex justify-center gap-2 mt-4">
							<Button
								type="button"
								onClick={() => setOpenSubmitDialog(true)}
								disabled={isReadOnly || submitting || loading || selectedItems.length === 0 || !allItemsHaveReason}
							>
								{submitting ? (
									<span className="inline-flex items-center">
										<Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...
									</span>
								) : 'Submit'}
							</Button>
							<Button type="button" variant="outline" onClick={() => clearFormAndItems()} disabled={isReadOnly || submitting}>Reset</Button>
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
