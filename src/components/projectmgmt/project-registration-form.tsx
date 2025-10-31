'use client';

import React, { useMemo } from 'react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { differenceInCalendarDays, isValid, parseISO } from 'date-fns';
import type { DeliverableType, ProjectDeliverableAttachment, ProjectFormValues, ProjectTag } from './types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, Paperclip, X } from 'lucide-react';

type ProjectRegistrationFormProps = {
    onSubmit: (values: ProjectFormValues) => void;
    assignorOptions: string[];
    assigneeOptions: string[];
    availableTags: ProjectTag[];
};

const deliverableTypeOptions: Array<{ value: DeliverableType; label: string }> = [
    { value: 'discovery', label: 'Discovery' },
    { value: 'design', label: 'Design' },
    { value: 'development', label: 'Development' },
    { value: 'testing', label: 'Testing' },
    { value: 'deployment', label: 'Deployment' },
    { value: 'documentation', label: 'Documentation' },
    { value: 'training', label: 'Training' },
];

const generateId = (prefix: string) => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return `${prefix}_${crypto.randomUUID()}`;
    }
    return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
};

const createEmptyDeliverable = () => ({
    id: generateId('deliverable'),
    name: '',
    type: 'development' as DeliverableType,
    description: '',
    startDate: '',
    endDate: '',
    attachments: [] as ProjectDeliverableAttachment[],
});

const readFileAsDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });

const BASE_FORM_VALUES = {
    code: '',
    name: '',
    description: '',
    assignmentType: 'project' as const,
    assignor: '',
    assignee: '',
    assignmentRole: 'developer' as const,
    startDate: '',
    dueDate: '',
    percentComplete: 10,
    tagSlugs: [] as string[],
};

const ProjectRegistrationForm: React.FC<ProjectRegistrationFormProps> = ({ onSubmit, assignorOptions, assigneeOptions, availableTags }) => {
    const {
        control,
        register,
        handleSubmit,
        watch,
        reset,
        setValue,
        formState: { errors },
    } = useForm<ProjectFormValues>({
        defaultValues: {
            ...BASE_FORM_VALUES,
            deliverables: [createEmptyDeliverable()],
        },
    });

    const { fields: deliverableFields, append, remove } = useFieldArray({
        control,
        name: 'deliverables',
    });

    const percentComplete = watch('percentComplete');
    const watchDeliverables = watch('deliverables');

    const timeline = useMemo(() => {
        const valid = (watchDeliverables ?? []).filter(deliverable => deliverable.startDate && deliverable.endDate);
        if (!valid.length) {
            return { startDate: '', endDate: '' };
        }
        const sortedByStart = [...valid].sort((a, b) => a.startDate.localeCompare(b.startDate));
        const sortedByEnd = [...valid].sort((a, b) => a.endDate.localeCompare(b.endDate));
        return {
            startDate: sortedByStart[0].startDate,
            endDate: sortedByEnd[sortedByEnd.length - 1].endDate,
        };
    }, [watchDeliverables]);

    const durationDays = useMemo(() => {
        if (!timeline.startDate || !timeline.endDate) {
            return 0;
        }
        const start = parseISO(timeline.startDate);
        const end = parseISO(timeline.endDate);
        if (!isValid(start) || !isValid(end)) {
            return 0;
        }
        const diff = differenceInCalendarDays(end, start) + 1;
        return diff > 0 ? diff : 0;
    }, [timeline]);

    const submitHandler = (values: ProjectFormValues) => {
        const deliverables = (values.deliverables ?? []).map(deliverable => ({
            ...deliverable,
            id: deliverable.id || generateId('deliverable'),
            attachments: (deliverable.attachments ?? []).map(attachment => ({
                ...attachment,
                id: attachment.id || generateId('attachment'),
            })),
        }));

        const startDate = timeline.startDate || values.startDate;
        const dueDate = timeline.endDate || values.dueDate;

        onSubmit({
            ...values,
            startDate: startDate,
            dueDate: dueDate,
            deliverables,
        });

        reset({
            ...BASE_FORM_VALUES,
            assignmentType: values.assignmentType,
            assignmentRole: values.assignmentRole,
            deliverables: [createEmptyDeliverable()],
        });
    };

    const handleAttachmentUpload = async (deliverableIndex: number, files: FileList | null) => {
        if (!files?.length) return;
        const currentAttachments = watchDeliverables?.[deliverableIndex]?.attachments ?? [];
        const newAttachments: ProjectDeliverableAttachment[] = [];

        for (const file of Array.from(files)) {
            const dataUrl = await readFileAsDataUrl(file);
            newAttachments.push({
                id: generateId('attachment'),
                name: file.name,
                dataUrl,
            });
        }

        setValue(`deliverables.${deliverableIndex}.attachments`, [...currentAttachments, ...newAttachments], { shouldDirty: true });
    };

    const handleAttachmentRemove = (deliverableIndex: number, attachmentId: string) => {
        const currentAttachments = watchDeliverables?.[deliverableIndex]?.attachments ?? [];
        setValue(
            `deliverables.${deliverableIndex}.attachments`,
            currentAttachments.filter(attachment => attachment.id !== attachmentId),
            { shouldDirty: true },
        );
    };

    return (
        <div className="panel space-y-6 p-5">
            <div>
                <h2 className="text-lg font-semibold">Register Project</h2>
                <p className="mt-1 text-sm text-muted-foreground">Capture core delivery details and planned deliverables to track execution.</p>
            </div>
            <form onSubmit={handleSubmit(submitHandler)} className="space-y-6">
                <div className="space-y-2">
                    <Label>Tags</Label>
                    <Controller
                        control={control}
                        name="tagSlugs"
                        render={({ field }) => (
                            <div className="grid gap-2 sm:grid-cols-2">
                                {availableTags.map(tag => {
                                    const checked = field.value?.includes(tag.slug) ?? false;
                                    return (
                                        <label
                                            key={tag.id}
                                            className="flex items-center gap-3 rounded-md border border-border/60 px-3 py-2 text-sm"
                                            style={{ borderColor: checked ? tag.colorHex : undefined }}
                                        >
                                            <Checkbox
                                                checked={checked}
                                                onCheckedChange={value => {
                                                    const next = new Set(field.value ?? []);
                                                    if (value === true) {
                                                        next.add(tag.slug);
                                                    } else {
                                                        next.delete(tag.slug);
                                                    }
                                                    field.onChange(Array.from(next));
                                                }}
                                            />
                                            <span className="flex flex-col">
                                                <span className="font-medium">{tag.name}</span>
                                                <span className="text-xs uppercase tracking-wide text-muted-foreground">{tag.slug}</span>
                                            </span>
                                        </label>
                                    );
                                })}
                            </div>
                        )}
                    />
                </div>

                <div className="space-y-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h3 className="text-base font-semibold">Deliverables</h3>
                            <p className="text-sm text-muted-foreground">Outline work packages to drive the schedule and gantt export.</p>
                        </div>
                        <Button type="button" variant="secondary" onClick={() => append(createEmptyDeliverable())}>
                            <Plus className="mr-2 h-4 w-4" />
                            Add deliverable
                        </Button>
                    </div>

                    <div className="space-y-4">
                        {deliverableFields.map((field, index) => {
                            const attachments = watchDeliverables?.[index]?.attachments ?? [];
                            return (
                                <div key={field.id} className="rounded-lg border border-border/60 p-4 space-y-4">
                                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                        <div className="flex-1 space-y-2">
                                            <Label htmlFor={`deliverable-name-${field.id}`}>Deliverable name</Label>
                                            <Input
                                                id={`deliverable-name-${field.id}`}
                                                placeholder="e.g. API contract design"
                                                {...register(`deliverables.${index}.name`, { required: 'Deliverable name is required' })}
                                            />
                                            {errors.deliverables?.[index]?.name && (
                                                <p className="text-sm text-destructive">{errors.deliverables[index]?.name?.message}</p>
                                            )}
                                        </div>
                                        <div className="md:w-52 space-y-2">
                                            <Label>Type</Label>
                                            <Controller
                                                control={control}
                                                name={`deliverables.${index}.type`}
                                                render={({ field: typeField }) => (
                                                    <Select value={typeField.value} onValueChange={typeField.onChange}>
                                                        <SelectTrigger className="w-full">
                                                            <SelectValue placeholder="Select type" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {deliverableTypeOptions.map(option => (
                                                                <SelectItem key={option.value} value={option.value}>
                                                                    {option.label}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                )}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label htmlFor={`deliverable-start-${field.id}`}>Start date</Label>
                                            <Input
                                                id={`deliverable-start-${field.id}`}
                                                type="date"
                                                {...register(`deliverables.${index}.startDate`, { required: 'Start date is required' })}
                                            />
                                            {errors.deliverables?.[index]?.startDate && (
                                                <p className="text-sm text-destructive">{errors.deliverables[index]?.startDate?.message}</p>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor={`deliverable-end-${field.id}`}>End date</Label>
                                            <Input
                                                id={`deliverable-end-${field.id}`}
                                                type="date"
                                                {...register(`deliverables.${index}.endDate`, {
                                                    required: 'End date is required',
                                                    validate: value => {
                                                        const start = watchDeliverables?.[index]?.startDate;
                                                        if (!start || !value) return true;
                                                        const startDate = parseISO(start);
                                                        const endDate = parseISO(value);
                                                        if (!isValid(startDate) || !isValid(endDate)) return true;
                                                        return endDate >= startDate || 'End date must be on or after the start date';
                                                    },
                                                })}
                                            />
                                            {errors.deliverables?.[index]?.endDate && (
                                                <p className="text-sm text-destructive">{errors.deliverables[index]?.endDate?.message}</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor={`deliverable-description-${field.id}`}>Description</Label>
                                        <Textarea
                                            id={`deliverable-description-${field.id}`}
                                            placeholder="Notes, scope, success criteria..."
                                            rows={3}
                                            {...register(`deliverables.${index}.description`)}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Attachments</Label>
                                        <div className="flex flex-wrap gap-2">
                                            {attachments.map(attachment => (
                                                <span
                                                    key={attachment.id}
                                                    className="inline-flex items-center gap-2 rounded-md border border-border/60 px-3 py-1 text-xs"
                                                >
                                                    <Paperclip className="h-3.5 w-3.5" />
                                                    <span className="font-medium">{attachment.name}</span>
                                                    <button
                                                        type="button"
                                                        className="text-muted-foreground transition hover:text-destructive"
                                                        onClick={() => handleAttachmentRemove(index, attachment.id)}
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </button>
                                                </span>
                                            ))}
                                            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-border/60 px-3 py-1 text-xs font-medium text-muted-foreground hover:border-primary/60 hover:text-primary">
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    multiple
                                                    className="hidden"
                                                    onChange={event => {
                                                        void handleAttachmentUpload(index, event.target.files);
                                                        if (event.target) {
                                                            event.target.value = '';
                                                        }
                                                    }}
                                                />
                                                <Plus className="h-3.5 w-3.5" />
                                                Add image
                                            </label>
                                        </div>
                                    </div>

                                    {deliverableFields.length > 1 && (
                                        <div className="flex justify-end">
                                            <Button type="button" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => remove(index)}>
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                Remove deliverable
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                        <Label htmlFor="code">Project code</Label>
                        <Input id="code" placeholder="e.g. OPS-2024-08" {...register('code', { required: 'Project code is required' })} />
                        {errors.code && <p className="text-sm text-destructive">{errors.code.message}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="name">Project name</Label>
                        <Input id="name" placeholder="e.g. Employee Onboarding Portal" {...register('name', { required: 'Project name is required' })} />
                        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea id="description" placeholder="Optional context that helps assignees understand the deliverable" rows={3} {...register('description')} />
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                        <Label>Assignment type</Label>
                        <Controller
                            control={control}
                            name="assignmentType"
                            rules={{ required: 'Assignment type is required' }}
                            render={({ field }) => (
                                <Select value={field.value} onValueChange={field.onChange}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="project">Project</SelectItem>
                                        <SelectItem value="support">Support</SelectItem>
                                        <SelectItem value="ad_hoc">Ad-hoc</SelectItem>
                                    </SelectContent>
                                </Select>
                            )}
                        />
                        {errors.assignmentType && <p className="text-sm text-destructive">{errors.assignmentType.message}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label>Assignor</Label>
                        <Controller
                            control={control}
                            name="assignor"
                            rules={{ required: 'Assignor is required' }}
                            render={({ field }) => (
                                <Select value={field.value} onValueChange={field.onChange}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select assignor" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {assignorOptions.map(option => (
                                            <SelectItem key={option} value={option}>
                                                {option}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        />
                        {errors.assignor && <p className="text-sm text-destructive">{errors.assignor.message}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label>Assignee</Label>
                        <Controller
                            control={control}
                            name="assignee"
                            rules={{ required: 'Assignee is required' }}
                            render={({ field }) => (
                                <Select value={field.value} onValueChange={field.onChange}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select assignee" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {assigneeOptions.map(option => (
                                            <SelectItem key={option} value={option}>
                                                {option}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        />
                        {errors.assignee && <p className="text-sm text-destructive">{errors.assignee.message}</p>}
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                        <Label>Assignment role</Label>
                        <Controller
                            control={control}
                            name="assignmentRole"
                            rules={{ required: 'Assignment role is required' }}
                            render={({ field }) => (
                                <Select value={field.value} onValueChange={field.onChange}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="developer">Developer</SelectItem>
                                        <SelectItem value="collaborator">Collaborator</SelectItem>
                                        <SelectItem value="supervisor">Supervisor</SelectItem>
                                    </SelectContent>
                                </Select>
                            )}
                        />
                        {errors.assignmentRole && <p className="text-sm text-destructive">{errors.assignmentRole.message}</p>}
                    </div>
                    <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="percentComplete">Initial progress (%)</Label>
                        <div className="grid grid-cols-[1fr_auto] items-center gap-2">
                            <Input
                                id="percentComplete"
                                type="range"
                                min={0}
                                max={100}
                                step={5}
                                {...register('percentComplete', { valueAsNumber: true })}
                            />
                            <span className="w-12 text-right text-sm text-muted-foreground">{percentComplete}%</span>
                        </div>
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                        <Label>Project start (auto)</Label>
                        <Input value={timeline.startDate ? timeline.startDate : ''} readOnly placeholder="Derived from deliverables" />
                    </div>
                    <div className="space-y-2">
                        <Label>Project due (auto)</Label>
                        <Input value={timeline.endDate ? timeline.endDate : ''} readOnly placeholder="Derived from deliverables" />
                    </div>
                    <div className="space-y-2">
                        <Label>Duration (days)</Label>
                        <Input value={durationDays ? `${durationDays} days` : ''} readOnly placeholder="Auto calculated" />
                    </div>
                </div>

                <div className="flex justify-end">
                    <Button type="submit">Save project</Button>
                </div>
            </form>
        </div>
    );
};

export default ProjectRegistrationForm;
