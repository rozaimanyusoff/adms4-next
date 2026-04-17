'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { addDays, isValid as isDateValid, parseISO } from 'date-fns';
import { Plus, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SingleSelect, type ComboboxOption } from '@/components/ui/combobox';
import type { DeliverableType, ProjectDeliverableAttachment } from './types';
import { authenticatedApi } from '@/config/api';

// Kept for downstream consumers; UI no longer uses task groups
export const TASK_GROUP_OPTIONS: ComboboxOption[] = [];

export type ModuleFormValues = {
    name: string;
    type: DeliverableType;
    description: string;
    startDate: string;
    endDate: string;
    attachments: ProjectDeliverableAttachment[];
    progress: number;
    taskGroups: string[];
    assignee: string;
    actualStartDate: string;
    actualEndDate: string;
    files: File[];
    featureKeys: string[];
    checklistDetails: ChecklistDetail[];
};

type ModuleFormProps = {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (values: ModuleFormValues) => Promise<boolean | void> | boolean | void;
    onCancelEdit: () => void;
    editingModuleIndex: number | null;
    assigneeChoices: ComboboxOption[];
    assigneeLoading: boolean;
    assigneeError: string | null;
    moduleStats: { total: number; completed: number; inProgress: number };
    calcMandays: (startISO?: string, endISO?: string) => number;
    initialValues?: ModuleFormValues;
    shouldCloseOnSubmit?: boolean;
};

const EMPTY_VALUES: ModuleFormValues = {
    name: '',
    type: 'development',
    description: '',
    startDate: '',
    endDate: '',
    attachments: [],
    progress: 0,
    taskGroups: [],
    assignee: '',
    actualStartDate: '',
    actualEndDate: '',
    files: [],
    featureKeys: [],
    checklistDetails: [],
};

type ChecklistItem = {
    id: number;
    name: string;
};

type ChecklistDetail = {
    id: string;
    name: string;
    remarks: string;
    expectedMandays: number | '';
};

const ModuleForm: React.FC<ModuleFormProps> = ({
    isOpen,
    onClose,
    onSubmit,
    onCancelEdit,
    editingModuleIndex,
    assigneeChoices,
    assigneeLoading,
    assigneeError,
    moduleStats: _moduleStats,
    calcMandays,
    initialValues,
    shouldCloseOnSubmit = false,
}) => {
    const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
    const [checklistLoading, setChecklistLoading] = useState(false);
    const [checklistError, setChecklistError] = useState<string | null>(null);
    const [checklistSearch, setChecklistSearch] = useState('');
    const [formKey, setFormKey] = useState(0);
    const {
        control,
        register,
        handleSubmit,
        reset,
        setValue,
        watch,
        formState: { errors },
    } = useForm<ModuleFormValues>({
        defaultValues: EMPTY_VALUES,
    });

    const draftStart = watch('startDate');
    const draftEnd = watch('endDate');

    // Reinitialize when switching between add/edit
    useEffect(() => {
        reset(initialValues ? { ...EMPTY_VALUES, ...initialValues } : { ...EMPTY_VALUES });
        setFormKey(k => k + 1);
    }, [initialValues, reset]);

    const selectedChecklistIds = watch('featureKeys') ?? [];
    const selectedChecklistDetails = watch('checklistDetails') ?? [];
    const draftMandays = useMemo(() => calcMandays(draftStart, draftEnd), [calcMandays, draftStart, draftEnd]);
    const totalExpectedMandays = useMemo(() => {
        return selectedChecklistDetails.reduce((sum, detail) => {
            const value = typeof detail.expectedMandays === 'number' ? detail.expectedMandays : Number(detail.expectedMandays);
            return sum + (Number.isFinite(value) ? value : 0);
        }, 0);
    }, [selectedChecklistDetails]);

    useEffect(() => {
        if (!isOpen) return;
        const loadChecklists = async () => {
            try {
                setChecklistLoading(true);
                setChecklistError(null);
                const res: any = await authenticatedApi.get('/api/projects/checklists');
                const data = res?.data?.data ?? [];
                if (Array.isArray(data)) setChecklistItems(data as ChecklistItem[]);
            } catch (err: any) {
                setChecklistError(err?.message || 'Failed to load checklist');
            } finally {
                setChecklistLoading(false);
            }
        };
        void loadChecklists();
    }, [isOpen]);

    const checklistLookup = useMemo(() => {
        return checklistItems.reduce<Record<string, ChecklistItem>>((acc, item) => {
            acc[String(item.id)] = item;
            return acc;
        }, {});
    }, [checklistItems]);
    // Auto-name scope from selected checklist items for downstream compatibility
    useEffect(() => {
        const checklistNames = selectedChecklistIds.map(id => checklistLookup[id]?.name || id);
        const autoName = checklistNames.join(' • ');
        if (autoName) {
            setValue('name', autoName, { shouldDirty: true });
        }
    }, [selectedChecklistIds, checklistLookup, setValue]);

    useEffect(() => {
        if (!selectedChecklistIds.length) {
            if (selectedChecklistDetails.length) {
                setValue('checklistDetails', [], { shouldDirty: true });
            }
            return;
        }
        const detailMap = new Map(selectedChecklistDetails.map(detail => [detail.id, detail]));
        const nextDetails = selectedChecklistIds.map(id => {
            const existing = detailMap.get(id);
            return {
                id,
                name: checklistLookup[id]?.name || existing?.name || id,
                remarks: existing?.remarks || '',
                expectedMandays: existing?.expectedMandays ?? '',
            };
        });
        const isSame =
            nextDetails.length === selectedChecklistDetails.length &&
            nextDetails.every((detail, idx) => {
                const current = selectedChecklistDetails[idx];
                return (
                    current?.id === detail.id &&
                    current?.name === detail.name &&
                    current?.remarks === detail.remarks &&
                    current?.expectedMandays === detail.expectedMandays
                );
            });
        if (!isSame) {
            setValue('checklistDetails', nextDetails, { shouldDirty: true });
        }
    }, [selectedChecklistIds, selectedChecklistDetails, checklistLookup, setValue]);

    useEffect(() => {
        if (!draftStart) {
            if (draftEnd) setValue('endDate', '', { shouldDirty: true });
            return;
        }
        const startDate = parseISO(draftStart);
        if (!isDateValid(startDate)) return;
        if (!totalExpectedMandays) {
            setValue('endDate', draftStart, { shouldDirty: true });
            return;
        }
        const daysToAdd = Math.max(0, Math.ceil(totalExpectedMandays));
        const endDate = addDays(startDate, daysToAdd);
        const endIso = endDate.toISOString().slice(0, 10);
        if (endIso !== draftEnd) {
            setValue('endDate', endIso, { shouldDirty: true });
        }
    }, [draftStart, draftEnd, totalExpectedMandays, setValue]);

    const filteredChecklistItems = useMemo(() => {
        const term = checklistSearch.trim().toLowerCase();
        if (!term) return checklistItems;
        return checklistItems.filter(item => item.name.toLowerCase().includes(term));
    }, [checklistSearch, checklistItems]);

    const toggleChecklistItem = (itemId: string) => {
        const current = new Set(selectedChecklistIds);
        if (current.has(itemId)) {
            current.delete(itemId);
        } else {
            current.add(itemId);
        }
        setValue('featureKeys', Array.from(current), { shouldDirty: true });
    };

    const submitForm = handleSubmit(async values => {
        const checklistNames = selectedChecklistIds.map(id => checklistLookup[id]?.name || id);
        const autoName = values.name || checklistNames.join(', ');
        const payload = { ...values, name: autoName || values.name || 'Scope' };
        const ok = await onSubmit(payload);
        if (ok === false) return;
        reset({ ...EMPTY_VALUES });
        setFormKey(k => k + 1);
        if (editingModuleIndex !== null) {
            onCancelEdit();
        }
        if (shouldCloseOnSubmit) {
            onClose();
        }
    });

    if (!isOpen) return null;

    return (
        <div className='p-4'>
        <Card className="space-y-4 p-4 shadow-sm">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-semibold">{editingModuleIndex !== null ? 'Edit module' : 'Add module'}</p>
                    <p className="text-xs text-muted-foreground">Define module details and attach planned timelines.</p>
                </div>
                <Button variant="ghost" size="sm" onClick={onClose} className='bg-red-600 text-white'>
                    Close
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-5">
                <Card className="md:col-span-3">
                    <CardContent className="space-y-3">
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="dl-desc-dialog">Scope Description</Label>
                            <Textarea
                                id="dl-desc-dialog"
                                rows={8}
                                placeholder="Notes, scope, success criteria..."
                                {...register('description')}
                                className="min-h-28"
                            />
                        </div>
                        <div className="space-y-3">
                            <div className="space-y-2">
                                <Label>Assignee</Label>
                                <Controller
                                    control={control}
                                    name="assignee"
                                    render={({ field }) => (
                                        <SingleSelect
                                            options={assigneeChoices}
                                            value={field.value}
                                            onValueChange={field.onChange}
                                            placeholder={assigneeLoading ? 'Loading...' : 'Select assignee'}
                                            clearable
                                        />
                                    )}
                                />
                                {assigneeError && (
                                    <p className="text-xs text-muted-foreground">{assigneeError}. Using fallback list if available.</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label>Planned dates</Label>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                                        onClick={() => {
                                            setValue('startDate', '', { shouldDirty: true });
                                            setValue('endDate', '', { shouldDirty: true });
                                            setFormKey(k => k + 1);
                                        }}
                                    >
                                        Clear
                                    </Button>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <Input
                                        key={`planned-start-${formKey}`}
                                        type="date"
                                        value={draftStart || ''}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setValue('startDate', val, { shouldDirty: true });
                                        }}
                                        className="w-full rounded-md border border-input bg-background px-2 py-2 text-xs"
                                        placeholder="Planned start"
                                    />
                                    <Input
                                        key={`planned-end-${formKey}`}
                                        type="date"
                                        value={draftEnd || ''}
                                        readOnly
                                        className="w-full rounded-md border border-input bg-background px-2 py-2 text-xs"
                                        placeholder="Planned end"
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Expected mandays total: {totalExpectedMandays || 0} • Calendar mandays (Mon–Fri): {draftMandays || 0}
                                </p>
                                <input type="hidden" {...register('startDate', { required: 'Start date is required' })} />
                                <input
                                    type="hidden"
                                    {...register('endDate', {
                                        required: 'End date is required',
                                        validate: endDate => {
                                            const startDate = draftStart ?? '';
                                            if (!startDate || !endDate) return true;
                                            if (!isDateValid(parseISO(startDate)) || !isDateValid(parseISO(endDate))) return true;
                                            return endDate >= startDate || 'End must be on/after start';
                                        },
                                    })}
                                />
                                {(errors.startDate || errors.endDate) && (
                                    <p className="text-sm text-destructive">{errors.startDate?.message || errors.endDate?.message}</p>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="space-y-2 pt-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">Selected checklist items</p>
                            <span className="text-xs text-muted-foreground">{selectedChecklistDetails.length} total</span>
                        </div>
                        {selectedChecklistDetails.length === 0 ? (
                            <p className="text-xs text-muted-foreground">No checklist items selected yet.</p>
                        ) : (
                            <div className="overflow-hidden rounded-md border border-border">
                                <div className="grid grid-cols-[minmax(0,1fr)_320px_120px_48px] gap-2 bg-muted/50 px-3 py-2 text-xs font-semibold text-muted-foreground">
                                    <span>Item</span>
                                    <span>Remarks</span>
                                    <span>Expected mandays</span>
                                    <span className="text-right">Remove</span>
                                </div>
                                <div className="divide-y divide-border">
                                    {selectedChecklistDetails.map((detail, index) => (
                                        <div
                                            key={detail.id}
                                            className="grid grid-cols-[minmax(0,1fr)_320px_120px_48px] gap-2 px-3 py-2 text-xs"
                                        >
                                            <div className="space-y-1">
                                                <span className="font-medium">{detail.name}</span>
                                                <input type="hidden" {...register(`checklistDetails.${index}.id` as const)} />
                                                <input type="hidden" {...register(`checklistDetails.${index}.name` as const)} />
                                            </div>
                                            <Textarea
                                                rows={3}
                                                placeholder="Add remarks"
                                                className="text-xs"
                                                {...register(`checklistDetails.${index}.remarks` as const)}
                                            />
                                            <Input
                                                type="number"
                                                min="0"
                                                step="0.5"
                                                placeholder="0"
                                                className="text-xs"
                                                {...register(`checklistDetails.${index}.expectedMandays` as const, {
                                                    setValueAs: value => (value === '' ? '' : Number(value)),
                                                })}
                                            />
                                            <div className="flex items-start justify-end">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                                    onClick={() => toggleChecklistItem(detail.id)}
                                                >
                                                    ×
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center justify-end pt-2">
                        <div className="flex items-center gap-2">
                            {editingModuleIndex !== null && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => {
                                        onCancelEdit();
                                        onClose();
                                    }}
                                >
                                    Cancel
                                </Button>
                            )}
                            <Button type="button" variant="secondary" onClick={submitForm}>
                                <Plus className="mr-2 h-4 w-4" />
                                {editingModuleIndex !== null ? 'Save module' : 'Add module'}
                            </Button>
                        </div>
                    </div>
                    </CardContent>
                </Card>

                <Card className="bg-muted/30 md:col-span-2">
                    <CardContent className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                        <div className="space-y-1">
                            <p className="text-sm font-medium">Development checklist</p>
                            <p className="text-xs text-muted-foreground">Select the checklist items for this scope.</p>
                        </div>
                        <span className="text-xs text-muted-foreground">Selected: {selectedChecklistIds.length}</span>
                    </div>
                    <Input
                        placeholder="Search checklist..."
                        value={checklistSearch}
                        onChange={e => setChecklistSearch(e.target.value)}
                    />
                    {checklistLoading ? (
                        <p className="text-xs text-muted-foreground">Loading checklist...</p>
                    ) : checklistError ? (
                        <p className="text-xs text-destructive">{checklistError}</p>
                    ) : (
                        <div className="space-y-3 max-h-[700px] overflow-y-auto pr-1">
                            {filteredChecklistItems.length === 0 && (
                                <p className="text-xs text-muted-foreground">No checklist items match that search.</p>
                            )}
                            <ul className="list-styled grid gap-3 md:grid-cols-2">
                                {filteredChecklistItems.map(item => {
                                    const checked = selectedChecklistIds.includes(String(item.id));
                                    return (
                                        <li key={item.id} className="h-full">
                                            <div className="list-styled-item flex items-start gap-1 border-none p-1 bg-green-50/50">
                                                <Button
                                                    type="button"
                                                    variant={checked ? 'secondary' : 'ghost'}
                                                    size="icon"
                                                    aria-pressed={checked}
                                                    onClick={() => toggleChecklistItem(String(item.id))}
                                                >
                                                    <PlusCircle className="h-5 w-5 text-green-600" />
                                                </Button>
                                                <div className="space-y-1">
                                                    <span className="font-semibold">{item.name}</span>
                                                </div>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    )}
                    <input
                        type="hidden"
                        {...register('name', {
                            validate: () => selectedChecklistIds.length > 0 || 'Select at least one checklist item',
                        })}
                    />
                    {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
                    </CardContent>
                </Card>
            </div>
        </Card>
        </div>
    );
};

export default ModuleForm;
