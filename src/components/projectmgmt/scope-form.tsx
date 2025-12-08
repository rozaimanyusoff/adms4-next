'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { isValid as isDateValid, parseISO } from 'date-fns';
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

export type ScopeFormValues = {
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
};

type ScopeFormProps = {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (values: ScopeFormValues) => Promise<boolean | void> | boolean | void;
    onCancelEdit: () => void;
    editingScopeIndex: number | null;
    assigneeChoices: ComboboxOption[];
    assigneeLoading: boolean;
    assigneeError: string | null;
    scopeStats: { total: number; completed: number; inProgress: number };
    calcMandays: (startISO?: string, endISO?: string) => number;
    initialValues?: ScopeFormValues;
    shouldCloseOnSubmit?: boolean;
};

const EMPTY_VALUES: ScopeFormValues = {
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
};

type FeatureItem = {
    id: number;
    category: string;
    feature_key: string;
    feature_name: string;
    description?: string;
    example_module?: string;
};

const ScopeForm: React.FC<ScopeFormProps> = ({
    isOpen,
    onClose,
    onSubmit,
    onCancelEdit,
    editingScopeIndex,
    assigneeChoices,
    assigneeLoading,
    assigneeError,
    scopeStats: _scopeStats,
    calcMandays,
    initialValues,
    shouldCloseOnSubmit = false,
}) => {
    const [features, setFeatures] = useState<FeatureItem[]>([]);
    const [featuresLoading, setFeaturesLoading] = useState(false);
    const [featuresError, setFeaturesError] = useState<string | null>(null);
    const [featureSearch, setFeatureSearch] = useState('');
    const [formKey, setFormKey] = useState(0);
    const {
        control,
        register,
        handleSubmit,
        reset,
        setValue,
        watch,
        formState: { errors },
    } = useForm<ScopeFormValues>({
        defaultValues: EMPTY_VALUES,
    });

    // Keep actual dates in sync if blank when planned updates
    const draftStart = watch('startDate');
    const draftEnd = watch('endDate');
    const draftActualStart = watch('actualStartDate');
    const draftActualEnd = watch('actualEndDate');
    useEffect(() => {
        if (draftStart && !draftActualStart) {
            setValue('actualStartDate', draftStart, { shouldDirty: true });
        }
        if (draftEnd && !draftActualEnd) {
            setValue('actualEndDate', draftEnd, { shouldDirty: true });
        }
    }, [draftStart, draftEnd, draftActualStart, draftActualEnd, setValue]);

    // Reinitialize when switching between add/edit
    useEffect(() => {
        reset(initialValues ? { ...EMPTY_VALUES, ...initialValues } : { ...EMPTY_VALUES });
        setFormKey(k => k + 1);
    }, [initialValues, reset]);

    const selectedFeatureKeys = watch('featureKeys') ?? [];
    const draftMandays = useMemo(() => calcMandays(draftStart, draftEnd), [calcMandays, draftStart, draftEnd]);
    const draftActualMandays = useMemo(
        () => calcMandays(draftActualStart, draftActualEnd),
        [calcMandays, draftActualStart, draftActualEnd],
    );

    useEffect(() => {
        if (!isOpen) return;
        const loadFeatures = async () => {
            try {
                setFeaturesLoading(true);
                setFeaturesError(null);
                const res: any = await authenticatedApi.get('/api/projects/features');
                const data = res?.data?.data ?? [];
                if (Array.isArray(data)) setFeatures(data as FeatureItem[]);
            } catch (err: any) {
                setFeaturesError(err?.message || 'Failed to load features');
            } finally {
                setFeaturesLoading(false);
            }
        };
        void loadFeatures();
    }, [isOpen]);

    const featureLookup = useMemo(() => {
        return features.reduce<Record<string, FeatureItem>>((acc, f) => {
            acc[f.feature_key] = f;
            return acc;
        }, {});
    }, [features]);
    const selectedFeatures = useMemo(() => {
        return selectedFeatureKeys
            .map(key => featureLookup[key])
            .filter((f): f is FeatureItem => Boolean(f));
    }, [featureLookup, selectedFeatureKeys]);

    // Auto-name scope from selected features for downstream compatibility
    useEffect(() => {
        const featureNames = selectedFeatureKeys.map(key => featureLookup[key]?.feature_name || key);
        const autoName = featureNames.join(' • ');
        if (autoName) {
            setValue('name', autoName, { shouldDirty: true });
        }
    }, [selectedFeatureKeys, featureLookup, setValue]);

    const filteredFeatures = useMemo(() => {
        const term = featureSearch.trim().toLowerCase();
        if (!term) return features;
        return features.filter(f => {
            const haystack = `${f.feature_name} ${f.feature_key} ${f.description || ''} ${f.category}`.toLowerCase();
            return haystack.includes(term);
        });
    }, [featureSearch, features]);

    const groupedFeatures = useMemo(() => {
        return filteredFeatures.reduce<Record<string, FeatureItem[]>>((acc, feature) => {
            const key = feature.category || 'Other';
            if (!acc[key]) acc[key] = [];
            acc[key].push(feature);
            return acc;
        }, {});
    }, [filteredFeatures]);

    const toggleFeature = (featureKey: string) => {
        const current = new Set(selectedFeatureKeys);
        if (current.has(featureKey)) {
            current.delete(featureKey);
        } else {
            current.add(featureKey);
        }
        setValue('featureKeys', Array.from(current), { shouldDirty: true });
    };

    const submitForm = handleSubmit(async values => {
        const featureNames = selectedFeatureKeys.map(key => featureLookup[key]?.feature_name || key);
        const autoName = values.name || featureNames.join(', ');
        const payload = { ...values, name: autoName || values.name || 'Scope' };
        const ok = await onSubmit(payload);
        if (ok === false) return;
        reset({ ...EMPTY_VALUES });
        setFormKey(k => k + 1);
        if (editingScopeIndex !== null) {
            onCancelEdit();
        }
        if (shouldCloseOnSubmit) {
            onClose();
        }
    });

    if (!isOpen) return null;

    return (
        <Card className="space-y-4 p-4 shadow-sm">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-semibold">{editingScopeIndex !== null ? 'Edit scope' : 'Add scope'}</p>
                    <p className="text-xs text-muted-foreground">Define scope details and attach planned timelines.</p>
                </div>
                <Button variant="ghost" size="sm" onClick={onClose}>
                    Close
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-5">
                <Card className="md:col-span-3">
                    <CardContent className="space-y-3">
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-3">
                            <div className="space-y-2">
                                <Label htmlFor="dl-desc-dialog">Scope Description</Label>
                                <Textarea
                                    id="dl-desc-dialog"
                                    rows={6}
                                    placeholder="Notes, scope, success criteria..."
                                    {...register('description')}
                                    className="min-h-24"
                                />
                            </div>
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
                        </div>
                        <div className="space-y-3">
                            <div className="space-y-1">
                                <p className="text-xs font-semibold text-muted-foreground">Selected features</p>
                                {selectedFeatures.length > 0 ? (
                                    <div className="flex flex-col gap-2">
                                        {selectedFeatures.map(feature => (
                                            <div
                                                key={feature.feature_key}
                                                className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs font-medium text-foreground"
                                            >
                                                {feature.feature_name}
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive"
                                                    onClick={() => toggleFeature(feature.feature_key)}
                                                >
                                                    ×
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-muted-foreground">No features selected yet.</p>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
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
                                        setValue('actualStartDate', '', { shouldDirty: true });
                                        setValue('actualEndDate', '', { shouldDirty: true });
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
                                        if (!draftActualStart) setValue('actualStartDate', val, { shouldDirty: true });
                                    }}
                                    className="w-full rounded-md border border-input bg-background px-2 py-2 text-xs"
                                    placeholder="Start date"
                                />
                                <Input
                                    key={`planned-end-${formKey}`}
                                    type="date"
                                    value={draftEnd || ''}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setValue('endDate', val, { shouldDirty: true });
                                        if (!draftActualEnd) {
                                            setValue('actualEndDate', val, { shouldDirty: true });
                                        }
                                    }}
                                    className="w-full rounded-md border border-input bg-background px-2 py-2 text-xs"
                                    placeholder="End date"
                                />
                            </div>
                            <p className="text-xs text-muted-foreground">Mandays (Mon–Fri): {draftMandays || 0}</p>
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
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label>Actual dates</Label>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                                    onClick={() => {
                                        setValue('actualStartDate', '', { shouldDirty: true });
                                        setValue('actualEndDate', '', { shouldDirty: true });
                                        setFormKey(k => k + 1);
                                    }}
                                >
                                    Clear
                                </Button>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <Input
                                    key={`actual-start-${formKey}`}
                                    type="date"
                                    value={draftActualStart || ''}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setValue('actualStartDate', val, { shouldDirty: true });
                                        if (!draftActualEnd && !draftEnd) {
                                            setValue('endDate', val, { shouldDirty: true });
                                        }
                                    }}
                                    className="w-full rounded-md border border-input bg-background px-2 py-2 text-xs"
                                    placeholder="Actual start"
                                />
                                <Input
                                    key={`actual-end-${formKey}`}
                                    type="date"
                                    value={draftActualEnd || ''}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setValue('actualEndDate', val, { shouldDirty: true });
                                    }}
                                    className="w-full rounded-md border border-input bg-background px-2 py-2 text-xs"
                                    placeholder="Actual end"
                                />
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Actual mandays (Mon–Fri): {draftActualMandays || 0}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center justify-end">
                        <div className="flex items-center gap-2">
                            {editingScopeIndex !== null && (
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
                                {editingScopeIndex !== null ? 'Save scope' : 'Add scope'}
                            </Button>
                        </div>
                    </div>
                    </CardContent>
                </Card>

                <Card className="bg-muted/30 md:col-span-2">
                    <CardContent className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                        <div className="space-y-1">
                            <p className="text-sm font-medium">Application features</p>
                            <p className="text-xs text-muted-foreground">Select the capabilities this scope will deliver.</p>
                        </div>
                        <span className="text-xs text-muted-foreground">Selected: {selectedFeatureKeys.length}</span>
                    </div>
                    <Input
                        placeholder="Search feature..."
                        value={featureSearch}
                        onChange={e => setFeatureSearch(e.target.value)}
                    />
                    {featuresLoading ? (
                        <p className="text-xs text-muted-foreground">Loading features...</p>
                    ) : featuresError ? (
                        <p className="text-xs text-destructive">{featuresError}</p>
                    ) : (
                        <div className="space-y-3 max-h-[700px] overflow-y-auto pr-1">
                            {Object.keys(groupedFeatures).length === 0 && (
                                <p className="text-xs text-muted-foreground">No features match that search.</p>
                            )}
                            {Object.entries(groupedFeatures).map(([category, items]) => (
                                <div key={category} className="space-y-2">
                                    <p className="text-xs font-semibold uppercase text-muted-foreground">{category}</p>
                                    <ul className="list-styled grid gap-3 md:grid-cols-2">
                                        {items.map(feature => {
                                            const checked = selectedFeatureKeys.includes(feature.feature_key);
                                            return (
                                                <li key={feature.feature_key} className="h-full">
                                                    <div className="list-styled-item flex items-start gap-1 border-none p-1 bg-green-50/50">
                                                        <Button
                                                            type="button"
                                                            variant={checked ? 'secondary' : 'ghost'}
                                                            size="icon"
                                                            aria-pressed={checked}
                                                            onClick={() => toggleFeature(feature.feature_key)}
                                                        >
                                                            <PlusCircle className="h-5 w-5 text-green-600" />
                                                        </Button>
                                                        <div className="space-y-1">
                                                            <span className="font-semibold">{feature.feature_name}</span>
                                                            {feature.description && (
                                                                <p className="text-xs text-muted-foreground">
                                                                    {feature.description}
                                                                </p>
                                                            )}
                                                            {feature.example_module && (
                                                                <p className="text-[11px] text-muted-foreground/80">
                                                                    Example: {feature.example_module}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    )}
                    <input
                        type="hidden"
                        {...register('name', {
                            validate: () => selectedFeatureKeys.length > 0 || 'Select at least one feature',
                        })}
                    />
                    {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
                    </CardContent>
                </Card>
            </div>
        </Card>
    );
};

export default ScopeForm;
