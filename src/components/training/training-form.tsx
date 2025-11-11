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
import { Upload, Users, AlertTriangle, FileText, Search, Loader2 } from 'lucide-react';
import { authenticatedApi } from '@/config/api';
import { Textarea } from '@/components/ui/textarea';

type TrainingFormValues = {
	trainingTitle: string;
	series: string;
	session: string;
	trainingHours: string;
	trainingDay: string;
	startDateTime: string;
	endDateTime: string;
	venue: string;
	venueCost: string;
	trainerCost: string;
	lodgingCost: string;
	miscCost: string;
	allocatedSeats: string;
	selectedParticipants: string[];
};

type ParticipantRecord = {
	id: string;
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

const SESSION_TYPES = ['Morning', 'Afternoon', 'Full Day', 'Evening', 'Custom'];

export function TrainingForm() {
	const [participantSearch, setParticipantSearch] = useState('');
	const [supportingDocument, setSupportingDocument] = useState<File | null>(null);
	const fileInputRef = useRef<HTMLInputElement | null>(null);
	const [participantDirectory, setParticipantDirectory] = useState<ParticipantRecord[]>([]);
	const [participantLoading, setParticipantLoading] = useState(false);
	const [participantError, setParticipantError] = useState<string | null>(null);
	const [courseOptions, setCourseOptions] = useState<string[]>([]);
	const [courseLoading, setCourseLoading] = useState(false);
	const [courseError, setCourseError] = useState<string | null>(null);
	const [selectedPanelOpen, setSelectedPanelOpen] = useState(true);

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
	const estimatedTotalCost = venueCost + trainerCost + lodgingCost + miscCost;
	const totalSelectedParticipants = selectedParticipants.length;
	const seatsRemaining = allocatedSeats ? allocatedSeats - totalSelectedParticipants : 0;
	const overAllocated = allocatedSeats > 0 && seatsRemaining < 0;

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
					const id = String(item?.ramco_id ?? item?.employee_id ?? item?.id ?? `emp-${index}`);
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
					return { id, name, department, role, location, seatType };
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
		if (!query) return participantDirectory;
		return participantDirectory.filter((participant) =>
			[participant.name, participant.department, participant.role, participant.location]
				.some((value) => value.toLowerCase().includes(query)),
		);
	}, [participantSearch, participantDirectory]);

	const selectedParticipantDetails = useMemo(
		() => participantDirectory.filter((participant) => selectedParticipants.includes(participant.id)),
		[selectedParticipants, participantDirectory],
	);

	useEffect(() => {
		if (!trainingTitleValue || trainingTitleValue.trim().length < 2) {
			setCourseOptions([]);
			setCourseError(null);
			return;
		}
		let cancelled = false;
		const controller = new AbortController();
		const fetchCourses = async () => {
			setCourseLoading(true);
			setCourseError(null);
			try {
				const config = { params: { search: trainingTitleValue.trim() }, signal: controller.signal } as any;
				const res = await authenticatedApi.get('/api/training/courses', config);
				const data = (res as any)?.data;
				const list = Array.isArray(data?.data) ? data.data : Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
				if (cancelled) return;
				const names = list
					.map((item: any) => item?.course_title || item?.title)
					.filter((name: string | undefined): name is string => Boolean(name));
				setCourseOptions(names.slice(0, 10));
			} catch (err: any) {
				if (!cancelled && err?.name !== 'AbortError') {
					setCourseOptions([]);
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
	}, [trainingTitleValue]);

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
		setCourseOptions([]);
		setCourseError(null);
		if (fileInputRef.current) {
			fileInputRef.current.value = '';
		}
	};

	const onSubmit = async (values: TrainingFormValues) => {
		await new Promise((resolve) => setTimeout(resolve, 400));
		toast.success('Training plan drafted', {
			description: `${values.trainingTitle || 'New training'} · ${totalSelectedParticipants} participant(s) selected`,
		});
		console.table({
			...values,
			supportingDocument: supportingDocument?.name ?? 'none',
		});
		handleReset();
	};

	return (
		<form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
			<div className="flex flex-col gap-2">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<div>
						<p className="text-sm uppercase tracking-wide text-muted-foreground">Training</p>
						<h1 className="text-2xl font-semibold">Create Training Form</h1>
					</div>
					<div className="flex gap-2">
						<Button type="button" variant="outline" onClick={handleReset} disabled={!isDirty && !supportingDocument}>
							Reset
						</Button>
						<Button type="submit" disabled={isSubmitting}>
							{isSubmitting ? 'Saving…' : 'Save Training Plan'}
						</Button>
					</div>
				</div>
				<p className="text-sm text-muted-foreground">
					Capture training details, budget allocations, and participant seats in a single workflow.
				</p>
			</div>

			<div className="grid gap-2 lg:grid-cols-3">
				<div className="space-y-2 lg:col-span-2">
					<Card className="bg-stone-50 shadow-none">
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
										{courseLoading && (
											<div className="flex items-center gap-2 text-xs text-muted-foreground">
												<Loader2 className="size-3.5 animate-spin" />
												Searching course titles...
											</div>
										)}
										{courseError && <p className="text-xs text-destructive">{courseError}</p>}
										{!courseLoading && courseOptions.length > 0 && (
											<div className="rounded-md border bg-white p-2 shadow-sm">
												<p className="mb-1 text-xs font-semibold text-muted-foreground">Suggestions</p>
												<div className="flex flex-col gap-1">
													{courseOptions.map((option) => (
														<button
															key={option}
															type="button"
															className="rounded border border-transparent px-2 py-1 text-left text-xs hover:border-primary hover:bg-primary/5"
															onClick={() => setValue('trainingTitle', option, { shouldDirty: true })}
														>
															{option}
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
													{SESSION_TYPES.map((session) => (
														<SelectItem key={session} value={session}>
															{session}
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

					<Card className='bg-stone-50 shadow-none'>
						<CardHeader>
							<CardTitle>Costing</CardTitle>
							<CardDescription>Track the expected spend across venue, trainer, lodging, and miscellaneous buckets.</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="grid gap-4 md:grid-cols-2">
								<div className="space-y-1">
									<Label htmlFor="venueCost">Venue Cost (RM)</Label>
									<Input
										id="venueCost"
										type="number"
										min="0"
										step="0.01"
										inputMode="decimal"
										placeholder="0.00"
										{...register('venueCost')}
									/>
								</div>
								<div className="space-y-1">
									<Label htmlFor="trainerCost">Trainer Cost (RM)</Label>
									<Input
										id="trainerCost"
										type="number"
										min="0"
										step="0.01"
										inputMode="decimal"
										placeholder="0.00"
										{...register('trainerCost')}
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="lodgingCost">Lodging Cost (RM)</Label>
									<Input
										id="lodgingCost"
										type="number"
										min="0"
										step="0.01"
										inputMode="decimal"
										placeholder="0.00"
										{...register('lodgingCost')}
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="miscCost">Miscellaneous (RM)</Label>
									<Input
										id="miscCost"
										type="number"
										min="0"
										step="0.01"
										inputMode="decimal"
										placeholder="0.00"
										{...register('miscCost')}
									/>
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
					<Card className='bg-stone-50 shadow-none'>
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
								<Label htmlFor="participantSearch">Participant List</Label>
								<div className="relative">
									<Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
									<Input
										id="participantSearch"
										className="pl-10"
										placeholder="Search by name, position, department, or location"
										value={participantSearch}
										onChange={(event) => setParticipantSearch(event.target.value)}
									/>
								</div>
								<div className="max-h-[420px] space-y-2 overflow-y-auto rounded-2xl border border-dashed bg-white/70 p-3">
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
															<p className="font-semibold">{participant.name}</p>
															<Badge variant={participant.seatType === 'onsite' ? 'secondary' : 'outline'}>
																{participant.seatType === 'onsite' ? 'On-site' : 'Virtual'}
															</Badge>
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
							{selectedParticipantDetails.length > 0 && (
								<div className="space-y-3">
									<div className="rounded-2xl border bg-white">
										<div className="p-4">
											<div className="flex items-center justify-between">
												<p className="text-sm font-semibold">Selected participants</p>
												<span className="text-xs text-muted-foreground">{selectedParticipantDetails.length} total</span>
											</div>
											<div
												className={`overflow-hidden transition-[max-height] duration-300 ${selectedPanelOpen ? 'max-h-96' : 'max-h-0'}`}
											>
												<ol className="mt-3 space-y-2">
													{selectedParticipantDetails.map((participant, index) => (
														<li key={participant.id} className="flex items-center gap-3 rounded-xl border bg-slate-50 px-3 py-2">
															<span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
																{index + 1}
															</span>
															<span className="flex-1 text-sm font-medium">{participant.name}</span>
														</li>
													))}
												</ol>
											</div>
										</div>
										<button
											type="button"
											className="w-full rounded-b-2xl border-t bg-slate-100 px-4 py-2 text-sm font-medium text-primary transition hover:bg-primary/10"
											onClick={() => setSelectedPanelOpen((prev) => !prev)}
										>
											{selectedPanelOpen ? 'Hide selected' : 'Show selected'} ({selectedParticipantDetails.length})
										</button>
									</div>
								</div>
							)}
						</CardContent>
					</Card>
				</div>
			</div>
		</form>
	);
}

export default TrainingForm;
