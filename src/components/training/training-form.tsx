'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Upload, Users, AlertTriangle, FileText, Search, Loader2, Plus, Trash2 } from 'lucide-react';
import { authenticatedApi } from '@/config/api';
import { normalizeTrainingRecord, parseDateTime } from '@/components/training/utils';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';

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

type TrainingFormProps = {
	trainingId?: number;
	onSuccess?: () => void;
	onCancel?: () => void;
};

export function TrainingForm({ trainingId, onSuccess, onCancel }: TrainingFormProps) {
	const [participantSearch, setParticipantSearch] = useState('');
	const [supportingDocument, setSupportingDocument] = useState<File | null>(null);
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
	const [showAllParticipants, setShowAllParticipants] = useState<boolean>(!Boolean(trainingId));
	const [trainingParticipantIdSet, setTrainingParticipantIdSet] = useState<Set<string>>(new Set());

	const {
		control,
		register,
		handleSubmit,
		watch,
		reset,
		setValue,
		getValues,
		formState: { isSubmitting, isDirty },
	} = useForm<TrainingFormValues>({
		mode: 'onChange',
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

	// Costing rows (description + amount)
	type CostItem = { id: string; description: string; amount: string };
	const [costItems, setCostItems] = useState<CostItem[]>([{ id: 'row-1', description: '', amount: '' }]);
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

	// When switching between create/edit, toggle default participant view
	useEffect(() => {
		setShowAllParticipants(!Boolean(trainingId));
	}, [trainingId]);

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
				const idList: string[] = rawParticipants
					.map((p: any) => String(p?.participant?.ramco_id ?? p?.ramco_id ?? p?.participant_id ?? ''))
					.filter((v: string) => v.length > 0);
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
				if (seeded.length > 0) setCostItems(seeded);
				reset(nextValues);
				toast.info('Loaded training for editing', { description: rec.course_title });
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

	const filteredParticipants = useMemo(() => {
		const query = participantSearch.trim().toLowerCase();
		let base = participantDirectory;
		if (isEditing && !showAllParticipants && trainingParticipantIdSet.size > 0) {
			base = base.filter((p) => trainingParticipantIdSet.has(p.id));
		}
		if (!query) return base;
		return base.filter((participant) => {
			const haystack = [
				participant.name,
				participant.department,
				participant.role,
				participant.location,
				participant.ramco_id ?? '',
			];
			return haystack.some((value) => value && value.toLowerCase().includes(query));
		});
	}, [participantSearch, participantDirectory, isEditing, showAllParticipants, trainingParticipantIdSet]);

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
		const computedHours = Math.round((diffMs / 3600000) * 100) / 100;
		const computedDays = Math.max(1, Math.ceil(diffMs / 86400000));
		const hoursValue = computedHours.toFixed(2);
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
		setSupportingDocument(file ?? null);
	};

	const handleReset = () => {
		reset(TRAINING_FORM_DEFAULTS);
		setParticipantSearch('');
		setSupportingDocument(null);
		setCourseSuggestions([]);
		setCourseError(null);
		setCourseId(undefined);
		setSelectedCourseTitle('');
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
	const openSuccessDialog = (message: string) => {
		setDialogMessage(message);
		setDialogOpen(true);
	};
	const handleDialogClose = () => {
		setDialogOpen(false);
		onSuccess?.();
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
					formData.append('attendance_uploaded', supportingDocument);
				}
				const res = await authenticatedApi.put(`/api/training/${trainingId}`, formData);
				const message = (res as any)?.data?.message || 'Training updated';
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
							<p className="text-sm uppercase tracking-wide text-muted-foreground">Training Form</p>
							<h1 className="text-2xl font-semibold flex items-center gap-2">
								{isEditing ? 'Edit Training' : 'Register Training'}
								{editLoading && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
							</h1>
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
								<Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
									Cancel
								</Button>
							)}
							<Button type="submit" disabled={isSubmitting}>
								{isSubmitting ? 'Saving…' : isEditing ? 'Update' : 'Save'}
							</Button>
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
													{...register('trainingTitle')}
													required
												/>
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
												<Input id="series" placeholder="e.g. Reliability Bootcamp" {...register('series')} />
											</div>
											<div className="space-y-2">
												<Label htmlFor="session">Session</Label>
												<Controller
													name="session"
													control={control}
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
											</div>
											<div className="space-y-2">
												<Label htmlFor="trainingHours">Training Hours</Label>
												<Input
													id="trainingHours"
													type="number"
													step="0.5"
													min="0"
													placeholder="e.g. 6"
													{...register('trainingHours')}
												/>
											</div>
											<div className="space-y-2">
												<Label htmlFor="trainingDay">Training Day</Label>
												<Input
													id="trainingDay"
													type="number"
													min="0"
													step="1"
													placeholder="e.g. 2"
													{...register('trainingDay')}
												/>
											</div>
										</div>
										<div className="grid gap-4 lg:grid-cols-2">
											<div className="space-y-2">
												<Label htmlFor="startDateTime">Start Date &amp; Time</Label>
												<Input id="startDateTime" type="datetime-local" {...register('startDateTime')} />
											</div>
											<div className="space-y-2">
												<Label htmlFor="endDateTime">End Date &amp; Time</Label>
												<Input id="endDateTime" type="datetime-local" {...register('endDateTime')} />
											</div>
										</div>
										<div className="space-y-2">
											<Label htmlFor="venue">Venue</Label>
											<Input id="venue" placeholder="e.g. Training Centre Hall A" {...register('venue')} />
										</div>
										<div className="rounded-lg border border-dashed p-4">
											<div className="flex flex-wrap items-center gap-4">
												<div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
													<FileText className="size-6" />
												</div>
												<div className="flex-1">
													<p className="font-medium">Upload supporting document</p>
													<p className="text-sm text-muted-foreground">Attach the agenda, attendance list, or approvals.</p>
													{supportingDocument ? (
														<p className="mt-1 text-sm text-primary">{supportingDocument.name}</p>
													) : (
														<p className="mt-1 text-sm text-muted-foreground">No document selected</p>
													)}
												</div>
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
											<input
												ref={fileInputRef}
												type="file"
												accept=".pdf,.doc,.docx,.xls,.xlsx"
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
													{...register('allocatedSeats')}
												/>
											</div>
											<div className="space-y-2">
												<Label>Total Selected Participants</Label>
												<Input readOnly value={totalSelectedParticipants} />
												<p className="text-xs text-muted-foreground">Auto-calculated from the selected participant list.</p>
											</div>
										</div>
										{allocatedSeats > 0 && (
											<div className="flex items-center gap-2 rounded-md border px-4 py-3 text-sm">
												<Users className="size-4 text-primary" />
												{overAllocated ? (
													<span className="flex items-center gap-1 text-destructive">
														<AlertTriangle className="size-4" /> Over capacity by {Math.abs(seatsRemaining)} seat(s). Review selections.
													</span>
												) : (
													<span>
														{seatsRemaining} seat{Math.abs(seatsRemaining) === 1 ? '' : 's'} remaining.
													</span>
												)}
											</div>
										)}
										<div className="space-y-3">
											<div className="flex items-center justify-between">
												<Label htmlFor="participantSearch">Participant List</Label>
												<div className="flex items-center gap-2 text-xs text-muted-foreground">
													<span>Show all employees</span>
													<Switch checked={showAllParticipants} onCheckedChange={(v) => setShowAllParticipants(Boolean(v))} />
												</div>
											</div>
											<div className="relative">
													<Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
													<Input
														id="participantSearch"
														className="pl-10"
														placeholder="Search by name, position, department, location, or RAMCO ID"
														value={participantSearch}
														onChange={(event) => setParticipantSearch(event.target.value)}
													/>
											</div>
											{isEditing && !showAllParticipants && (
												<p className="text-xs text-muted-foreground">
													Showing only participants assigned to this training. Toggle to view the full directory.
												</p>
											)}
											<div>
												<div className="max-h-105 space-y-2 overflow-y-auto rounded-2xl border border-dashed bg-white/70 p-3">
													{participantLoading ? (
														<div className="flex items-center gap-2 text-sm text-muted-foreground">
															<Loader2 className="size-4 animate-spin" />
															Loading participants...
														</div>
													) : participantError ? (
														<p className="text-sm text-destructive">{participantError}</p>
													) : filteredParticipants.length === 0 ? (
														<p className="text-sm text-muted-foreground">No participants match your search.</p>
													) : (
														filteredParticipants.map((participant) => {
															const checked = selectedParticipants.includes(participant.id);
															const rowClasses = [
																"flex cursor-pointer items-center gap-4 rounded-2xl border px-4 py-3 shadow-sm transition",
																checked ? "bg-sky-100 border-sky-300 shadow-inner hover:border-sky-400" : "bg-white hover:border-primary/60",
															].join(' ');
															return (
																<label
																	key={participant.id}
																	className={rowClasses}
																>
																	<div className="self-center">
																		<Checkbox
																			checked={checked}
																			onCheckedChange={(state) => updateParticipantSelection(participant.id, state === true)}
																		/>
																	</div>
																	<div className="flex flex-1 flex-col gap-0.5 text-sm leading-tight">
																		<div className="flex flex-wrap items-center gap-2">
																			<p className="font-semibold">
																				{participant.name}
																				{participant.ramco_id ? ` (${participant.ramco_id})` : ''}
																			</p>
																		</div>
																		<p className="text-xs text-muted-foreground">{participant.role}</p>
																		<p className="text-xs text-muted-foreground uppercase tracking-wide">
																			{participant.department} · {participant.location}
																		</p>
																	</div>
																</label>
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
		</>
	);
}

export default TrainingForm;
