'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Upload, Users, AlertTriangle, FileText, Search, Loader2, Plus, Trash2, X } from 'lucide-react';
import { authenticatedApi } from '@/config/api';
import { normalizeTrainingRecord, parseDateTime } from '@/components/training/utils';
import { Textarea } from '@/components/ui/textarea';
import ActionSidebar from '@/components/ui/action-aside';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

type TrainingFormValues = {
	trainingTitle: string;
	series: string;
	session: string;
	trainingHours: string;
	trainingDay: string;
	startDateTime: string;
	endDateTime: string;
	venue: string;
	// legacy fields retained for compatibility; not used in UI
	venueCost: string;
	trainerCost: string;
	lodgingCost: string;
	miscCost: string;
	allocatedSeats: string;
	selectedParticipants: string[];
};

type ParticipantRecord = {
	id: string;
	ramco_id?: string;
	name: string;
	department: string;
	role: string;
	location: string;
	seatType: 'onsite' | 'virtual';
};

const mapRawParticipantToRecord = (raw: any, index = 0): ParticipantRecord => {
	const ramcoId =
		raw?.participant?.ramco_id ??
		raw?.ramco_id ??
		raw?.participant_id ??
		raw?.participant?.employee_id ??
		raw?.employee_id ??
		raw?.id ??
		`emp-${index}`;
	const id = String(ramcoId);
	const name = raw?.participant?.full_name ?? raw?.full_name ?? raw?.name ?? `Employee ${index + 1}`;
	const department = raw?.participant?.department?.code ?? raw?.participant?.department?.name ?? raw?.department?.code ?? raw?.department?.name ?? raw?.department_code ?? 'N/A';
	const role = raw?.participant?.position?.name ?? raw?.position?.name ?? raw?.job_title ?? 'Staff';
	const location = raw?.participant?.location?.code ?? raw?.participant?.location?.name ?? raw?.location?.code ?? raw?.location?.name ?? raw?.location_code ?? 'HQ';
	const seatType = (raw?.work_mode || raw?.employment_type || raw?.participant?.work_mode || '')
		.toString()
		.toLowerCase()
		.includes('remote')
		? 'virtual'
		: 'onsite';
	return { id, ramco_id: ramcoId ? String(ramcoId) : undefined, name, department, role, location, seatType };
};

const TRAINING_FORM_DEFAULTS: TrainingFormValues = {
	trainingTitle: '',
	series: '',
	session: '',
	trainingHours: '',
	trainingDay: '',
	startDateTime: '',
	endDateTime: '',
	venue: '',
	venueCost: '',
	trainerCost: '',
	lodgingCost: '',
	miscCost: '',
	allocatedSeats: '',
	selectedParticipants: [],
};

const SESSION_TYPES = [
	{ label: 'Morning', value: 'morning' },
	{ label: 'Afternoon', value: 'afternoon' },
	{ label: 'Full Day', value: 'fullday' },
	{ label: 'Evening', value: 'evening' },
	{ label: 'Custom', value: 'custom' },
];

const defaultCostRows = () => [{ id: 'row-1', description: '', amount: '' }];
const draftKeyForTraining = (trainingId?: number) => (trainingId ? `training-form-draft-${trainingId}` : 'training-form-draft-new');

type TrainingFormProps = {
	trainingId?: number;
	onSuccess?: () => void;
	onCancel?: () => void;
};

export function TrainingForm({ trainingId, onSuccess, onCancel }: TrainingFormProps) {
	const [supportingDocument, setSupportingDocument] = useState<File | null>(null);
	const [existingAttendanceUpload, setExistingAttendanceUpload] = useState<string | null>(null);
	const [supportingDocumentPreviewUrl, setSupportingDocumentPreviewUrl] = useState<string | null>(null);
	const fileInputRef = useRef<HTMLInputElement | null>(null);
	const [participantDirectory, setParticipantDirectory] = useState<ParticipantRecord[]>([]);
	const [participantLoading, setParticipantLoading] = useState(false);
	const [participantError, setParticipantError] = useState<string | null>(null);
	type CourseSuggestion = { id: number; title: string };
	const [courseSuggestions, setCourseSuggestions] = useState<CourseSuggestion[]>([]);
	const [courseLoading, setCourseLoading] = useState(false);
	const [courseError, setCourseError] = useState<string | null>(null);
	const [initialTitle, setInitialTitle] = useState<string>('');
	const [courseId, setCourseId] = useState<number | undefined>(undefined);
	const [selectedCourseTitle, setSelectedCourseTitle] = useState<string>('');
	const [editLoading, setEditLoading] = useState(false);
	const [editError, setEditError] = useState<string | null>(null);
	const [trainingParticipantIdSet, setTrainingParticipantIdSet] = useState<Set<string>>(new Set());
	const [participantSidebarOpen, setParticipantSidebarOpen] = useState(false);
	const [participantSidebarSearch, setParticipantSidebarSearch] = useState('');
	const [selectedSearch, setSelectedSearch] = useState('');
	const [recentAdded, setRecentAdded] = useState<ParticipantRecord[]>([]);
	const [recentRemoved, setRecentRemoved] = useState<ParticipantRecord[]>([]);

	const {
		control,
		register,
		handleSubmit,
		watch,
		reset,
		setValue,
		getValues,
		formState: { isSubmitting, isDirty, isValid, errors },
	} = useForm<TrainingFormValues>({
		mode: 'onChange',
		reValidateMode: 'onChange',
		defaultValues: TRAINING_FORM_DEFAULTS,
	});

	const selectedParticipants = watch('selectedParticipants');
	const trainingTitleValue = watch('trainingTitle');
	const startDateValue = watch('startDateTime');
	const endDateValue = watch('endDateTime');
	const allocatedSeats = Number(watch('allocatedSeats') || 0);

	const venueCost = Number(watch('venueCost') || 0);
	const trainerCost = Number(watch('trainerCost') || 0);
	const lodgingCost = Number(watch('lodgingCost') || 0);
	const miscCost = Number(watch('miscCost') || 0);

	const totalSelectedParticipants = selectedParticipants.length;
	const seatsRemaining = allocatedSeats ? allocatedSeats - totalSelectedParticipants : 0;
	const overAllocated = allocatedSeats > 0 && seatsRemaining < 0;
	const canAddMoreParticipants = seatsRemaining > 0;

	// Costing rows (description + amount)
	type CostItem = { id: string; description: string; amount: string };
	const [costItems, setCostItems] = useState<CostItem[]>(defaultCostRows());
	const costItemsRef = useRef<CostItem[]>(costItems);
	useEffect(() => {
		costItemsRef.current = costItems;
	}, [costItems]);
	const draftKey = useMemo(() => draftKeyForTraining(trainingId), [trainingId]);
	const draftAppliedRef = useRef(false);
	const [draftLoaded, setDraftLoaded] = useState(false);
	const estimatedTotalCost = useMemo(() => {
		return costItems.reduce((sum, it) => sum + (parseFloat((it.amount || '0').toString()) || 0), 0);
	}, [costItems]);
	const addCostRow = () => {
		const nextId = `row-${Date.now()}`;
		setCostItems((prev) => [...prev, { id: nextId, description: '', amount: '' }]);
	};
	const removeCostRow = (id: string) => {
		setCostItems((prev) => (prev.length <= 1 ? prev : prev.filter((r) => r.id !== id)));
	};
	const updateCostRow = (id: string, patch: Partial<CostItem>) => {
		setCostItems((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
	};

	const isEditing = Boolean(trainingId);

	const persistDraft = useCallback(
		(values: TrainingFormValues, costSnapshot: CostItem[]) => {
			if (typeof window === 'undefined' || !draftLoaded) return;
			try {
				localStorage.setItem(
					draftKey,
					JSON.stringify({
						values,
						costItems: costSnapshot,
					}),
				);
			} catch {
				// Ignore storage errors
			}
		},
		[draftKey, draftLoaded],
	);

	const clearDraft = useCallback(() => {
		if (typeof window === 'undefined') return;
		try {
			localStorage.removeItem(draftKey);
		} catch {
			// Ignore removal errors
		}
	}, [draftKey]);

	useEffect(() => {
		if (typeof window === 'undefined') return;
		draftAppliedRef.current = false;
		setDraftLoaded(false);
		try {
			const raw = localStorage.getItem(draftKey);
			if (raw) {
				const parsed = JSON.parse(raw);
				if (parsed?.values) {
					reset({ ...TRAINING_FORM_DEFAULTS, ...parsed.values });
				} else {
					reset(TRAINING_FORM_DEFAULTS);
				}
				if (Array.isArray(parsed?.costItems) && parsed.costItems.length > 0) {
					setCostItems(parsed.costItems);
				} else {
					setCostItems(defaultCostRows());
				}
				draftAppliedRef.current = true;
			} else {
				reset(TRAINING_FORM_DEFAULTS);
				setCostItems(defaultCostRows());
			}
			setSupportingDocument(null);
			setCourseSuggestions([]);
			setCourseError(null);
			setCourseId(undefined);
			setSelectedCourseTitle('');
			setInitialTitle('');
			setTrainingParticipantIdSet(new Set());
		} catch {
			reset(TRAINING_FORM_DEFAULTS);
			setCostItems(defaultCostRows());
		} finally {
			setDraftLoaded(true);
		}
		if (fileInputRef.current) {
			fileInputRef.current.value = '';
		}
	}, [draftKey, reset]);

	useEffect(() => {
		const subscription = watch((values) => {
			persistDraft(values as TrainingFormValues, costItemsRef.current);
		});
		return () => subscription.unsubscribe();
	}, [watch, persistDraft]);

	useEffect(() => {
		if (!supportingDocument) {
			setSupportingDocumentPreviewUrl(null);
			return;
		}
		const objectUrl = URL.createObjectURL(supportingDocument);
		setSupportingDocumentPreviewUrl(objectUrl);
		return () => {
			URL.revokeObjectURL(objectUrl);
		};
	}, [supportingDocument]);

	useEffect(() => {
		persistDraft(getValues(), costItems);
	}, [costItems, getValues, persistDraft]);

	const toInputDateTime = (raw?: string | null) => {
		const d = parseDateTime(raw);
		if (!d) return '';
		const pad = (n: number) => String(n).padStart(2, '0');
		const yyyy = d.getFullYear();
		const mm = pad(d.getMonth() + 1);
		const dd = pad(d.getDate());
		const hh = pad(d.getHours());
		const mi = pad(d.getMinutes());
		return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
	};

	useEffect(() => {
		let ignore = false;
		const loadForEdit = async () => {
			if (!trainingId) {
				setExistingAttendanceUpload(null);
				return;
			}
			setEditLoading(true);
			setEditError(null);
			try {
				const res = await authenticatedApi.get(`/api/training/${trainingId}`);
				const payload = (res as any)?.data;
				const raw = payload?.data ?? payload ?? {};
				const rec = normalizeTrainingRecord(raw);
				if (ignore) return;
				// Collect participant ids from API response (prefer RAMCO id)
				const rawParticipants: any[] = Array.isArray(raw?.participants) ? raw.participants : [];
				const mappedFromTraining = rawParticipants.map((p, index) => mapRawParticipantToRecord(p, index));
				const idList: string[] = mappedFromTraining.map((p) => p.id).filter((v: string) => v.length > 0);
				setTrainingParticipantIdSet(new Set(idList));
				const nextValues: TrainingFormValues = {
					trainingTitle: rec.course_title || '',
					series: rec.series ?? '',
					session: rec.session ?? '',
					trainingHours: rec.hrs_num ? String(rec.hrs_num) : '',
					trainingDay: rec.days_num ? String(rec.days_num) : '',
					startDateTime: toInputDateTime(rec.sdate),
					endDateTime: toInputDateTime(rec.edate),
					venue: rec.venue ?? '',
					venueCost: rec.cost_venue != null ? String(rec.cost_venue) : '',
					trainerCost: rec.cost_trainer != null ? String(rec.cost_trainer) : '',
					lodgingCost: rec.cost_lodging != null ? String(rec.cost_lodging) : '',
					miscCost: rec.cost_other != null ? String(rec.cost_other) : '',
					allocatedSeats: rec.seat != null ? String(rec.seat) : '',
					selectedParticipants: idList,
				};
				setInitialTitle(rec.course_title || '');
				setCourseId(rec.course_id ?? undefined);
				setSelectedCourseTitle(rec.course_title || '');
				setExistingAttendanceUpload(rec.attendance_upload ?? null);
				// Seed costing rows from API if available
				const seeded: CostItem[] = [];
				const pushIf = (label: string, value: any) => {
					const num = Number(value);
					if (!Number.isNaN(num) && num > 0) seeded.push({ id: `${label.toLowerCase()}-${seeded.length + 1}`, description: label, amount: String(num) });
				};
				pushIf('Venue', raw?.cost_venue ?? raw?.event_venue_cost);
				pushIf('Trainer', raw?.cost_trainer);
				pushIf('Lodging', raw?.cost_lodging);
				pushIf('Miscellaneous', raw?.cost_other);
				if (!draftAppliedRef.current) {
					setCostItems(seeded.length > 0 ? seeded : defaultCostRows());
					reset(nextValues);
					toast.info('Loaded training for editing', { description: rec.course_title });
				}
				// merge selected participants into directory so they appear even if not in employee listing
				setParticipantDirectory((prev) => {
					const merged = new Map<string, ParticipantRecord>();
					[...prev, ...mappedFromTraining].forEach((p) => merged.set(p.id, p));
					return Array.from(merged.values());
				});
			} catch (err: any) {
				if (!ignore) {
					const message = err?.response?.data?.message || 'Unable to load training data';
					setEditError(message);
					toast.error(message);
				}
			} finally {
				if (!ignore) setEditLoading(false);
			}
		};
		loadForEdit();
		return () => {
			ignore = true;
		};
	}, [trainingId, reset]);

	useEffect(() => {
		let ignore = false;
		const loadParticipants = async () => {
			setParticipantLoading(true);
			setParticipantError(null);
			try {
				const res = await authenticatedApi.get('/api/assets/employees', { params: { status: 'active' } });
				const data = (res as any)?.data;
				const list = Array.isArray(data?.data) ? data.data : Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
				if (ignore) return;
				const mapped: ParticipantRecord[] = list.map((item: any, index: number) => {
					const ramcoId = item?.ramco_id ?? item?.employee_id ?? item?.id ?? null;
					const id = String(ramcoId ?? `emp-${index}`);
					const name = item?.full_name ?? item?.name ?? `Employee ${index + 1}`;
					const department = item?.department?.code ?? item?.department_code ?? 'N/A';
					const role = item?.position?.name ?? item?.job_title ?? 'Staff';
					const location = item?.location?.code ?? item?.location_code ?? 'HQ';
					const seatType = (item?.work_mode || item?.employment_type || '')
						.toString()
						.toLowerCase()
						.includes('remote')
						? 'virtual'
						: 'onsite';
					return { id, ramco_id: ramcoId ? String(ramcoId) : undefined, name, department, role, location, seatType };
				});
				setParticipantDirectory(mapped);
			} catch (err: any) {
				if (!ignore) {
					setParticipantDirectory([]);
					setParticipantError(err?.response?.data?.message || 'Unable to load participants.');
				}
			} finally {
				if (!ignore) setParticipantLoading(false);
			}
		};
		loadParticipants();
		return () => {
			ignore = true;
		};
	}, []);

	const filteredSelectedParticipants = useMemo(() => {
		const selectedSet = new Set(selectedParticipants);
		const query = selectedSearch.trim().toLowerCase();
		return participantDirectory
			.filter((p) => selectedSet.has(p.id))
			.filter((participant) => {
				if (!query) return true;
				const haystack = [
					participant.name,
					participant.department,
					participant.role,
					participant.location,
					participant.ramco_id ?? '',
				];
				return haystack.some((value) => value && value.toLowerCase().includes(query));
			});
	}, [participantDirectory, selectedParticipants, selectedSearch]);

	const availableParticipants = useMemo(() => {
		const selectedSet = new Set(selectedParticipants);
		const query = participantSidebarSearch.trim().toLowerCase();
		return participantDirectory
			.filter((p) => !selectedSet.has(p.id))
			.filter((participant) => {
				if (!query) return true;
				const haystack = [
					participant.name,
					participant.department,
					participant.role,
					participant.location,
					participant.ramco_id ?? '',
				];
				return haystack.some((value) => value && value.toLowerCase().includes(query));
			});
	}, [participantDirectory, selectedParticipants, participantSidebarSearch]);

	// Selected details overlay removed; no need to compute separate selected list here

	// No separate selected overlay; we don't compute a separate filtered list

	// Fetch course suggestions; in edit mode, suppress when unchanged
	useEffect(() => {
		const title = (trainingTitleValue || '').trim();
		if (!title || title.length < 2) {
			setCourseSuggestions([]);
			setCourseError(null);
			return;
		}
		if (isEditing && title.toLowerCase() === (initialTitle || '').trim().toLowerCase()) {
			setCourseSuggestions([]);
			setCourseError(null);
			return;
		}
		let cancelled = false;
		const controller = new AbortController();
		const fetchCourses = async () => {
			setCourseLoading(true);
			setCourseError(null);
			try {
				const res = await authenticatedApi.get('/api/training/courses', { params: { q: title }, signal: controller.signal } as any);
				const data = (res as any)?.data;
				const list: any[] = Array.isArray(data?.data) ? data.data : Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
				if (cancelled) return;
				const suggestions: CourseSuggestion[] = list
					.map((item: any) => ({ id: Number(item?.course_id ?? item?.id ?? 0), title: item?.course_title || item?.title }))
					.filter((it) => it.title && Number.isFinite(it.id) && it.id > 0);
				setCourseSuggestions(suggestions.slice(0, 10));
			} catch (err: any) {
				if (!cancelled && err?.name !== 'AbortError') {
					setCourseSuggestions([]);
					setCourseError(err?.response?.data?.message || 'Failed to load course suggestions.');
				}
			} finally {
				if (!cancelled) setCourseLoading(false);
			}
		};
		fetchCourses();
		return () => {
			cancelled = true;
			controller.abort();
		};
	}, [trainingTitleValue, isEditing, initialTitle]);

	// Clear courseId when diverging from selected suggestion (except unchanged edit title)
	useEffect(() => {
		const title = (trainingTitleValue || '').trim();
		const sel = (selectedCourseTitle || '').trim();
		if (!title) return;
		if (sel && title.toLowerCase() !== sel.toLowerCase() && !(isEditing && title.toLowerCase() === (initialTitle || '').trim().toLowerCase())) {
			setCourseId(undefined);
		}
	}, [trainingTitleValue, selectedCourseTitle, isEditing, initialTitle]);

	useEffect(() => {
		if (!startDateValue || !endDateValue) return;
		const start = new Date(startDateValue);
		const end = new Date(endDateValue);
		if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return;
		if (end <= start) return;
		const diffMs = end.getTime() - start.getTime();
		const computedDays = Math.max(1, Math.ceil(diffMs / 86400000));
		// Cap hours to an 8-hour working day per day span
		const rawHours = diffMs / 3600000;
		const cappedHours = Math.min(rawHours, computedDays * 8);
		const hoursValue = cappedHours.toFixed(2);
		if (getValues('trainingHours') !== hoursValue) {
			setValue('trainingHours', hoursValue, { shouldDirty: true });
		}
		const daysValue = computedDays.toString();
		if (getValues('trainingDay') !== daysValue) {
			setValue('trainingDay', daysValue, { shouldDirty: true });
		}
	}, [startDateValue, endDateValue, getValues, setValue]);

	const updateParticipantSelection = (participantId: string, nextChecked: boolean) => {
		const current = getValues('selectedParticipants') || [];
		const nextState = nextChecked
			? Array.from(new Set([...current, participantId]))
			: current.filter((id) => id !== participantId);
		setValue('selectedParticipants', nextState, { shouldDirty: true, shouldTouch: true });
	};

	const handleDocumentChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (!file) {
			setSupportingDocument(null);
			return;
		}
		const isPdfMime = file.type === 'application/pdf';
		const isPdfByName = file.name.toLowerCase().endsWith('.pdf');
		if (!isPdfMime && !isPdfByName) {
			toast.error('Only PDF files are allowed for attendance upload.');
			event.target.value = '';
			return;
		}
		setSupportingDocument(file);
	};

	const upsertRecent = (list: ParticipantRecord[], next: ParticipantRecord, max = 10) => {
		const map = new Map(list.map((p) => [p.id, p]));
		map.set(next.id, next);
		return Array.from(map.values()).slice(-max);
	};

	const addParticipant = (participantId: string) => {
		const record = participantDirectory.find((p) => p.id === participantId);
		updateParticipantSelection(participantId, true);
		if (record) {
			setRecentAdded((prev) => upsertRecent(prev, record));
			setRecentRemoved((prev) => prev.filter((p) => p.id !== record.id));
		}
	};

	const removeParticipant = (participantId: string) => {
		const record = participantDirectory.find((p) => p.id === participantId);
		updateParticipantSelection(participantId, false);
		if (record) {
			setRecentRemoved((prev) => upsertRecent(prev, record));
			setRecentAdded((prev) => prev.filter((p) => p.id !== record.id));
		}
	};

	const handleReset = () => {
		reset(TRAINING_FORM_DEFAULTS);
		setSupportingDocument(null);
		setExistingAttendanceUpload(null);
		setCourseSuggestions([]);
		setCourseError(null);
		setCourseId(undefined);
		setSelectedCourseTitle('');
		setCostItems(defaultCostRows());
		setTrainingParticipantIdSet(new Set());
		clearDraft();
		draftAppliedRef.current = false;
		if (fileInputRef.current) {
			fileInputRef.current.value = '';
		}
	};

	const toApiDateTime = (dtLocal?: string) => {
		if (!dtLocal) return null;
		// dtLocal is expected like YYYY-MM-DDTHH:mm
		const d = new Date(dtLocal);
		if (Number.isNaN(d.getTime())) return null;
		const pad = (n: number) => String(n).padStart(2, '0');
		const yyyy = d.getFullYear();
		const mm = pad(d.getMonth() + 1);
		const dd = pad(d.getDate());
		const hh = pad(d.getHours());
		const mi = pad(d.getMinutes());
		return `${yyyy}-${mm}-${dd} ${hh}:${mi}:00`;
	};

	const toMoneyString = (n: number) => n.toFixed(2);
	const [dialogOpen, setDialogOpen] = useState(false);
	const [dialogMessage, setDialogMessage] = useState('');
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [deleteSubmitting, setDeleteSubmitting] = useState(false);
	const openSuccessDialog = (message: string) => {
		setDialogMessage(message);
		setDialogOpen(true);
	};
	const handleDialogClose = () => {
		setDialogOpen(false);
		clearDraft();
		onSuccess?.();
	};
	const handleCancel = () => {
		clearDraft();
		onCancel?.();
	};
	const handleDelete = async () => {
		if (!trainingId) return;
		try {
			setDeleteSubmitting(true);
			const res = await authenticatedApi.delete(`/api/training/${trainingId}`);
			const message = (res as any)?.data?.message || 'Training deleted';
			toast.success(message);
			setDeleteDialogOpen(false);
			clearDraft();
			onSuccess?.();
		} catch (err: any) {
			const message = err?.response?.data?.message || 'Failed to delete training';
			toast.error(message);
		} finally {
			setDeleteSubmitting(false);
		}
	};

	const onSubmit = async (values: TrainingFormValues) => {
		// Resolve course_id if not already selected
		let effectiveCourseId = courseId;
		const titleTrim = (values.trainingTitle || '').trim();
		if (!effectiveCourseId && titleTrim.length >= 2) {
			try {
				const res = await authenticatedApi.get('/api/training/courses', { params: { q: titleTrim } } as any);
				const data = (res as any)?.data;
				const list: any[] = Array.isArray(data?.data) ? data.data : Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
				const exact = list.find((it: any) => String(it?.course_title || '').trim().toLowerCase() === titleTrim.toLowerCase());
				const picked = exact || list[0];
				const cid = Number(picked?.course_id ?? picked?.id);
				if (Number.isFinite(cid) && cid > 0) effectiveCourseId = cid;
			} catch { }
		}

		// Build payload for POST /api/training (register)
		const payload: any = {
			course_title: titleTrim,
			course_id: effectiveCourseId,
			series: (values.series || '').trim() || undefined,
			session: values.session || undefined,
			sdate: toApiDateTime(values.startDateTime),
			edate: toApiDateTime(values.endDateTime),
			hrs: values.trainingHours ? Number(values.trainingHours) : undefined,
			days: values.trainingDay ? Number(values.trainingDay) : undefined,
			venue: (values.venue || '').trim() || undefined,
			training_count: totalSelectedParticipants,
			seat: allocatedSeats || undefined,
			event_cost: toMoneyString(estimatedTotalCost),
			costing_details: costItems
				.filter((it) => (it.description || '').trim().length > 0 || (parseFloat(it.amount || '0') || 0) > 0)
				.map((it) => ({
					ec_desc: (it.description || '').trim(),
					ec_amount: toMoneyString(parseFloat(it.amount || '0') || 0),
				})),
			participants: selectedParticipants.map((id) => ({ participant: id })),
		};

		try {
			if (!isEditing) {
				const res = await authenticatedApi.post('/api/training', payload);
				const message = (res as any)?.data?.message || 'Training registered';
				handleReset();
				openSuccessDialog(message);
			} else {
				const formData = new FormData();
				Object.entries(payload).forEach(([key, value]) => {
					if (value === undefined || value === null) return;
					if (typeof value === 'string') {
						formData.append(key, value);
					} else if (typeof value === 'number') {
						formData.append(key, value.toString());
					} else if (Array.isArray(value)) {
						formData.append(key, JSON.stringify(value));
					} else {
						formData.append(key, JSON.stringify(value));
					}
				});
				if (supportingDocument) {
					formData.append('attendance_upload', supportingDocument, supportingDocument.name);
				}
				const res = await authenticatedApi.put(`/api/training/${trainingId}`, formData, {
					headers: { 'Content-Type': 'multipart/form-data' },
				});
				const message = (res as any)?.data?.message || 'Training updated';
				clearDraft();
				openSuccessDialog(message);
			}
		} catch (err: any) {
			const message = err?.response?.data?.message || 'Failed to submit training';
			toast.error(message);
		}
	};

	return (
		<>
			<form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
				<Card className="shadow-none">
					<CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
						<div>
							<p className="text-sm uppercase tracking-wide">Training Form</p>
							<CardDescription>
								Capture training details, budget allocations, and participant seats in a single workflow.
							</CardDescription>
						</div>
						<div className="flex gap-2">
							{!isEditing && (
								<Button type="button" variant="outline" onClick={handleReset} disabled={!isDirty && !supportingDocument}>
									Reset
								</Button>
							)}
							{isEditing && (
								<Button type="button" variant="outline" onClick={handleCancel} disabled={isSubmitting}>
									Cancel
								</Button>
							)}
							<Button type="submit" disabled={isSubmitting || !isValid}>
								{isSubmitting ? 'Saving…' : isEditing ? 'Update' : 'Save'}
							</Button>
							{isEditing && (
								<Button
									type="button"
									variant="destructive"
									onClick={() => setDeleteDialogOpen(true)}
									disabled={isSubmitting || deleteSubmitting}
								>
									{deleteSubmitting ? 'Deleting…' : 'Delete'}
								</Button>
							)}
						</div>
					</CardHeader>
					<CardContent className="p-2">
						{editError && <p className="mb-2 text-sm text-destructive">{editError}</p>}
						<div className="grid gap-6 lg:grid-cols-3">
							<div className="space-y-6 lg:col-span-2">
								<Card className="bg-stone-50/50 shadow-none">
									<CardHeader>
										<CardTitle>Training Details</CardTitle>
										<CardDescription>Define what the session covers and when it will be delivered.</CardDescription>
									</CardHeader>
									<CardContent className="space-y-2">
										<div className="space-y-2">
											<Label htmlFor="trainingTitle">Training Title</Label>
											<div className="space-y-2">
												<Textarea
													id="trainingTitle"
													className='capitalize'
													rows={3}
													placeholder="e.g. Advanced Asset Integrity"
													{...register('trainingTitle', { required: 'Training title is required' })}
													required
												/>
												{errors.trainingTitle && (
													<p className="text-xs text-destructive">{errors.trainingTitle.message}</p>
												)}
												<div className="space-y-1">
													{(!isEditing || (trainingTitleValue || '').trim().toLowerCase() !== (initialTitle || '').trim().toLowerCase()) && ((trainingTitleValue || '').trim().toLowerCase() !== (selectedCourseTitle || '').trim().toLowerCase()) && courseLoading && (
														<div className="flex items-center gap-2 text-xs text-muted-foreground">
															<Loader2 className="size-3.5 animate-spin" />
															Searching course titles...
														</div>
													)}
													{(!isEditing || (trainingTitleValue || '').trim().toLowerCase() !== (initialTitle || '').trim().toLowerCase()) && ((trainingTitleValue || '').trim().toLowerCase() !== (selectedCourseTitle || '').trim().toLowerCase()) && courseError && (
														<p className="text-xs text-destructive">{courseError}</p>
													)}
													{!courseLoading && courseSuggestions.length > 0 && (!isEditing || ((trainingTitleValue || '').trim().toLowerCase() !== (initialTitle || '').trim().toLowerCase())) && ((trainingTitleValue || '').trim().toLowerCase() !== (selectedCourseTitle || '').trim().toLowerCase()) && (
														<div className="rounded-md border bg-white p-2 shadow-sm">
															<p className="mb-1 text-xs font-semibold text-muted-foreground">Suggestions</p>
															<div className="flex flex-col gap-1">
																{courseSuggestions.map((s) => (
																	<button
																		key={s.id}
																		type="button"
																		className="rounded border border-transparent px-2 py-1 text-left text-xs hover:border-primary hover:bg-primary/5"
																		onClick={() => {
																			setValue('trainingTitle', s.title, { shouldDirty: true });
																			setCourseId(s.id);
																			setSelectedCourseTitle(s.title);
																			setCourseSuggestions([]);
																		}}
																	>
																		{s.title}
																	</button>
																))}
															</div>
														</div>
													)}
												</div>
											</div>
										</div>
										<div className="grid gap-4 lg:grid-cols-4">
											<div className="space-y-2">
												<Label htmlFor="series">Series</Label>
												<Input id="series" placeholder="e.g. Reliability Bootcamp, S1, S2" {...register('series')} />
											</div>
											<div className="space-y-2">
												<Label htmlFor="session">Session</Label>
												<Controller
													name="session"
													control={control}
													defaultValue={TRAINING_FORM_DEFAULTS.session}
													rules={{ required: 'Session is required' }}
													render={({ field }) => (
														<Select value={field.value || undefined} onValueChange={field.onChange}>
															<SelectTrigger id="session" className="w-full">
																<SelectValue placeholder="Select session" />
															</SelectTrigger>
															<SelectContent>
																{SESSION_TYPES.map((opt) => (
																	<SelectItem key={opt.value} value={opt.value}>
																		{opt.label}
																	</SelectItem>
																))}
															</SelectContent>
														</Select>
													)}
												/>
												{errors.session && <p className="text-xs text-destructive">{errors.session.message}</p>}
											</div>
											<div className="space-y-2">
												<Label htmlFor="trainingHours">Training Hours</Label>
												<Input
													id="trainingHours"
													type="number"
													step="0.5"
													min="0"
													placeholder="e.g. 6"
													{...register('trainingHours', { required: 'Training hours are required' })}
												/>
												{errors.trainingHours && <p className="text-xs text-destructive">{errors.trainingHours.message}</p>}
											</div>
											<div className="space-y-2">
												<Label htmlFor="trainingDay">Training Day</Label>
												<Input
													id="trainingDay"
													type="number"
													min="0"
													step="1"
													placeholder="e.g. 2"
													{...register('trainingDay', { required: 'Training day is required' })}
												/>
												{errors.trainingDay && <p className="text-xs text-destructive">{errors.trainingDay.message}</p>}
											</div>
										</div>
										<div className="grid gap-4 lg:grid-cols-2">
											<div className="space-y-2">
												<Label htmlFor="startDateTime">Start Date &amp; Time</Label>
												<Input id="startDateTime" type="datetime-local" {...register('startDateTime', { required: 'Start date & time is required' })} />
												{errors.startDateTime && <p className="text-xs text-destructive">{errors.startDateTime.message}</p>}
											</div>
											<div className="space-y-2">
												<Label htmlFor="endDateTime">End Date &amp; Time</Label>
												<Input id="endDateTime" type="datetime-local" {...register('endDateTime', { required: 'End date & time is required' })} />
												{errors.endDateTime && <p className="text-xs text-destructive">{errors.endDateTime.message}</p>}
											</div>
										</div>
										<div className="space-y-2">
											<Label htmlFor="venue">Venue</Label>
											<Input id="venue" placeholder="e.g. Training Centre Hall A" {...register('venue', { required: 'Venue is required' })} />
											{errors.venue && <p className="text-xs text-destructive">{errors.venue.message}</p>}
										</div>
										<div className="rounded-lg border border-dashed p-4">
											<div className="flex flex-wrap items-center gap-4">
												{!(existingAttendanceUpload && !supportingDocument) && (
													<>
														<div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
															<FileText className="size-6" />
														</div>
														<div className="flex-1">
															<p className="font-medium">Upload supporting document</p>
															<p className="text-sm text-muted-foreground">Attendance upload supports PDF only.</p>
															{supportingDocument ? (
																<p className="mt-1 text-sm text-primary">{supportingDocument.name}</p>
															) : (
																<p className="mt-1 text-sm text-muted-foreground">No document selected</p>
															)}
														</div>
													</>
												)}
												<div className="flex gap-2">
													{supportingDocument && (
														<Button
															type="button"
															variant="ghost"
															onClick={() => {
																setSupportingDocument(null);
																if (fileInputRef.current) fileInputRef.current.value = '';
															}}
														>
															Remove
														</Button>
													)}
													<Button type="button" onClick={() => fileInputRef.current?.click()}>
														<Upload className="size-4" />
														Upload
													</Button>
												</div>
											</div>
											{(supportingDocumentPreviewUrl || existingAttendanceUpload) && (
												<div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-start">
													<div className="h-36 w-28 overflow-hidden rounded border bg-white">
														<object
															data={supportingDocumentPreviewUrl || existingAttendanceUpload || undefined}
															type="application/pdf"
															className="h-full w-full"
															aria-label="Attendance PDF preview"
														>
															<div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">PDF</div>
														</object>
													</div>
													<div className="min-w-0 flex-1">
														<p className="truncate text-sm font-medium">
															{supportingDocument ? supportingDocument.name : 'Current attendance PDF'}
														</p>
														<a
															href={supportingDocumentPreviewUrl || existingAttendanceUpload || '#'}
															target="_blank"
															rel="noreferrer"
															className="text-xs text-primary hover:underline"
														>
															Open full PDF
														</a>
													</div>
												</div>
											)}
											<input
												ref={fileInputRef}
												type="file"
												accept="application/pdf,.pdf"
												className="hidden"
												onChange={handleDocumentChange}
											/>
										</div>
									</CardContent>
								</Card>

								<Card className='bg-stone-50/50 shadow-none'>
									<CardHeader>
										<CardTitle>Costing</CardTitle>
										<CardDescription>Add one or more cost lines. Total updates automatically.</CardDescription>
									</CardHeader>
									<CardContent className="space-y-4">
										<div className="space-y-2">
											{costItems.map((row) => (
												<div key={row.id} className="grid grid-cols-12 items-center gap-2">
													<div className="col-span-7">
														<Label className="sr-only">Description</Label>
														<Input
															placeholder="Description (e.g. Venue, Trainer, Transport)"
															value={row.description}
															onChange={(e) => updateCostRow(row.id, { description: e.target.value })}
															className='capitalize'
														/>
													</div>
													<div className="col-span-4">
														<Label className="sr-only">Cost (RM)</Label>
														<Input
															inputMode="decimal"
															type="number"
															min="0"
															step="0.01"
															placeholder="0.00"
															value={row.amount}
															onChange={(e) => updateCostRow(row.id, { amount: e.target.value })}
														/>
													</div>
													<div className="col-span-1 flex justify-end">
														<Button type="button" variant="ghost" onClick={() => removeCostRow(row.id)} disabled={costItems.length <= 1}>
															<Trash2 className="size-4" />
														</Button>
													</div>
												</div>
											))}
											<div>
												<Button type="button" variant="outline" onClick={addCostRow}>
													<Plus className="size-4" /> Add costing
												</Button>
											</div>
										</div>
										<div className="flex flex-wrap items-center justify-between rounded-lg border bg-muted/20 px-4 py-3 text-sm">
											<div>
												<p className="text-muted-foreground">Estimated total cost</p>
												<p className="text-2xl font-semibold">RM {estimatedTotalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
											</div>
											<Badge variant="outline" className="text-xs uppercase tracking-wide">
												Costing summary
											</Badge>
										</div>
									</CardContent>
								</Card>
							</div>

							<div className="space-y-6">
								<Card className='bg-stone-50/50 shadow-none'>
									<CardHeader>
										<CardTitle>Participants &amp; Capacity</CardTitle>
										<CardDescription>Allocate seats and select participants from the curated list.</CardDescription>
									</CardHeader>
									<CardContent className="space-y-6">
										<div className="grid gap-4 sm:grid-cols-2">
											<div className="space-y-2">
												<Label htmlFor="allocatedSeats">Allocated Seats</Label>
												<Input
													id="allocatedSeats"
													type="number"
													min="0"
													placeholder="e.g. 25"
													{...register('allocatedSeats', { required: 'Allocated seats is required' })}
												/>
												{errors.allocatedSeats && <p className="text-xs text-destructive">{errors.allocatedSeats.message}</p>}
											</div>
											<div className="space-y-2">
												<Label>Total Selected Participants</Label>
												<Input readOnly value={totalSelectedParticipants} />
											</div>
										</div>
										{allocatedSeats > 0 && (
											<div className="space-y-1">
												<div className={`flex items-center gap-2 rounded-md border px-4 py-3 text-sm ${seatsRemaining <= 0 ? 'text-destructive border-destructive/60' : ''}`}>
													<Users className="size-4 text-primary" />
													{overAllocated ? (
														<span className="flex items-center gap-1">
															<AlertTriangle className="size-4" /> Over capacity by {Math.abs(seatsRemaining)} seat(s). Review selections.
														</span>
													) : (
														<span>
															{seatsRemaining} seat{Math.abs(seatsRemaining) === 1 ? '' : 's'} remaining.
														</span>
													)}
												</div>
												{seatsRemaining <= 0 && (
													<p className="text-xs text-destructive">
														Adding more participants is disabled. Increase Allocated Seats or remove/replace selected participants.
													</p>
												)}
											</div>
										)}
											<div className="space-y-3">
												<div className="flex items-center justify-between">
													<div className="flex items-center gap-2">
														<Label>Selected Participants</Label>
														<Popover>
															<PopoverTrigger asChild>
																<Badge
																	variant="outline"
																	className="cursor-pointer select-none text-xs border-blue-500 text-blue-600"
																	title="Recently added"
																>
																	+ {recentAdded.length}
																</Badge>
															</PopoverTrigger>
															<PopoverContent className="w-72 bg-blue-50" align="start">
																<p className="mb-2 text-sm font-semibold">Recently added</p>
																<div className="space-y-2 max-h-64 overflow-y-auto">
																	{recentAdded.length === 0 ? (
																		<p className="text-xs text-muted-foreground">No recent additions.</p>
																	) : (
																		recentAdded
																			.slice()
																			.reverse()
																			.map((p) => (
																				<div key={p.id} className="rounded-md border bg-muted/30 px-2 py-1 text-xs">
																					<p className="font-semibold">{p.name}{p.ramco_id ? ` (${p.ramco_id})` : ''}</p>
																					<p className="text-muted-foreground">{p.role}</p>
																				</div>
																			))
																	)}
																</div>
															</PopoverContent>
														</Popover>
														<Popover>
															<PopoverTrigger asChild>
																<Badge
																	variant="outline"
																	className="cursor-pointer select-none text-xs border-red-500 text-red-600"
																	title="Recently removed"
																>
																	- {recentRemoved.length}
																</Badge>
															</PopoverTrigger>
															<PopoverContent className="w-72 bg-red-50" align="start">
																<p className="mb-2 text-sm font-semibold">Recently removed</p>
																<div className="space-y-2 max-h-64 overflow-y-auto">
																	{recentRemoved.length === 0 ? (
																		<p className="text-xs text-muted-foreground">No recent removals.</p>
																	) : (
																		recentRemoved
																			.slice()
																			.reverse()
																			.map((p) => (
																				<div key={p.id} className="rounded-md border bg-muted/30 px-2 py-1 text-xs">
																					<p className="font-semibold">{p.name}{p.ramco_id ? ` (${p.ramco_id})` : ''}</p>
																					<p className="text-muted-foreground">{p.role}</p>
																				</div>
																			))
																	)}
																</div>
															</PopoverContent>
														</Popover>
													</div>
													<Button
														variant="default"
														size="sm"
														onClick={() => setParticipantSidebarOpen(true)}
														disabled={participantLoading || !canAddMoreParticipants}
														type="button"
													>
														<Plus className="size-4" />
													</Button>
												</div>
											<div className="relative">
												<Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
												<Input
													className="pl-10"
													placeholder="Filter selected by name, dept, location, RAMCO ID"
													value={selectedSearch}
													onChange={(event) => setSelectedSearch(event.target.value)}
												/>
											</div>
											<div>
												<div className="max-h-105 space-y-2 overflow-y-auto pr-1">
													{participantLoading ? (
														<div className="flex items-center gap-2 text-sm text-muted-foreground">
															<Loader2 className="size-4 animate-spin" />
															Loading participants...
														</div>
													) : participantError ? (
														<p className="text-sm text-destructive">{participantError}</p>
													) : filteredSelectedParticipants.length === 0 ? (
														<p className="text-sm text-muted-foreground">No participants selected.</p>
													) : (
														filteredSelectedParticipants.map((participant) => {
															const rowClasses = [
																"flex items-center gap-4 rounded-2xl border px-4 py-3 shadow-sm transition bg-sky-100 border-sky-300 shadow-inner",
															].join(' ');
															return (
																<div
																	key={participant.id}
																	className={rowClasses}
																>
																	<div className="flex flex-1 flex-col gap-0.5 text-sm leading-tight">
																		<div className="flex flex-wrap items-center gap-2">
																			<p className="font-semibold text-xs">
																				{participant.name}
																				{participant.ramco_id ? ` (${participant.ramco_id})` : ''}
																			</p>
																		</div>
																		<p className="text-xs text-muted-foreground">{participant.role} · {participant.department} · {participant.location}</p>
																	</div>
																	<Button
																		variant="ghost"
																		size="icon"
																		className="text-destructive hover:text-destructive hover:border border-red-500"
																		onClick={() => removeParticipant(participant.id)}
																	>
																		<X className="size-4" />
																	</Button>
																</div>
															);
														})
													)}
												</div>
											</div>
										</div>
									</CardContent>
								</Card>
							</div>

						</div>
					</CardContent>
				</Card>
			</form>
			{participantSidebarOpen && (
				<ActionSidebar
					title="Add participants"
					size="sm"
					onClose={() => setParticipantSidebarOpen(false)}
					content={
						<div className="space-y-3">
							<div className="relative">
								<Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
								<Input
									autoFocus
									className="pl-10"
									placeholder="Search by name or RAMCO ID"
									value={participantSidebarSearch}
									onChange={(event) => setParticipantSidebarSearch(event.target.value)}
								/>
							</div>
							<div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
								{participantLoading ? (
									<div className="flex items-center gap-2 text-sm text-muted-foreground">
										<Loader2 className="size-4 animate-spin" />
										Loading participants...
									</div>
								) : participantError ? (
									<p className="text-sm text-destructive">{participantError}</p>
								) : availableParticipants.length === 0 ? (
									<p className="text-sm text-muted-foreground">No available participants to add.</p>
								) : (
									availableParticipants.map((participant) => {
										const recentlyRemoved = recentRemoved.some((p) => p.id === participant.id);
										return (
											<div
												key={participant.id}
												className="flex items-center gap-4 rounded-xl border px-4 py-3 shadow-sm bg-white hover:border-primary/60 transition"
											>
												<div className="flex-1">
													<div className="flex items-center gap-2">
														<p className="font-semibold text-xs">
															{participant.name}
															{participant.ramco_id ? ` (${participant.ramco_id})` : ''}
														</p>
														{recentlyRemoved && (
															<span className="text-xs text-destructive">Recently removed</span>
														)}
													</div>
													<p className="text-xs text-muted-foreground">{participant.role} · {participant.department} · {participant.location}</p>
												</div>
												<Button
													type="button"
													variant="ghost"
													size="sm"
													onClick={() => addParticipant(participant.id)}
													disabled={!canAddMoreParticipants}
													className={!canAddMoreParticipants ? 'opacity-50 cursor-not-allowed' : ''}
												>
													<Plus className="size-4 text-emerald-600" />
												</Button>
											</div>
										);
									})
								)}
							</div>
						</div>
					}
				/>
			)}
			<Dialog open={dialogOpen} onOpenChange={(open) => !open && setDialogOpen(false)}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Submission successful</DialogTitle>
						<DialogDescription>{dialogMessage}</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button type="button" onClick={handleDialogClose}>
							Back to records
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
			<Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Delete training record?</DialogTitle>
						<DialogDescription>
							This action cannot be undone. The selected training record will be permanently deleted.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => setDeleteDialogOpen(false)}
							disabled={deleteSubmitting}
						>
							Cancel
						</Button>
						<Button
							type="button"
							variant="destructive"
							onClick={handleDelete}
							disabled={deleteSubmitting}
						>
							{deleteSubmitting ? 'Deleting…' : 'Delete'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}

export default TrainingForm;
