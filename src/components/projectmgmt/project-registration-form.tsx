'use client';

import React, { useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { differenceInCalendarDays, isValid, parseISO } from 'date-fns';
import { ProjectFormValues } from './types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type ProjectRegistrationFormProps = {
    onSubmit: (values: ProjectFormValues) => void;
    assignorOptions: string[];
    assigneeOptions: string[];
};

const DEFAULT_FORM_VALUES: ProjectFormValues = {
    name: '',
    description: '',
    assignmentType: 'task',
    assignor: '',
    assignee: '',
    startDate: '',
    dueDate: '',
    progress: 10,
};

const ProjectRegistrationForm: React.FC<ProjectRegistrationFormProps> = ({ onSubmit, assignorOptions, assigneeOptions }) => {
    const {
        control,
        register,
        handleSubmit,
        watch,
        reset,
        formState: { errors },
    } = useForm<ProjectFormValues>({
        defaultValues: DEFAULT_FORM_VALUES,
    });

    const startDate = watch('startDate');
    const dueDate = watch('dueDate');

    const durationDays = useMemo(() => {
        if (!startDate || !dueDate) {
            return 0;
        }
        const start = parseISO(startDate);
        const due = parseISO(dueDate);
        if (!isValid(start) || !isValid(due)) {
            return 0;
        }
        const diff = differenceInCalendarDays(due, start) + 1;
        return diff > 0 ? diff : 0;
    }, [startDate, dueDate]);

    const submitHandler = (values: ProjectFormValues) => {
        onSubmit(values);
        reset({ ...DEFAULT_FORM_VALUES, assignmentType: values.assignmentType });
    };

    return (
        <div className="panel space-y-6 p-5">
            <div>
                <h2 className="text-lg font-semibold">Register Project</h2>
                <p className="mt-1 text-sm text-muted-foreground">Capture core delivery details to track work from the start.</p>
            </div>
            <form onSubmit={handleSubmit(submitHandler)} className="space-y-5">
                <div className="space-y-2">
                    <Label htmlFor="name">Project name</Label>
                    <Input id="name" placeholder="e.g. Employee Onboarding Portal" {...register('name', { required: 'Project name is required' })} />
                    {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea id="description" placeholder="Optional notes that help assignees understand the deliverable" rows={3} {...register('description')} />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
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
                                        <SelectItem value="task">Task</SelectItem>
                                        <SelectItem value="support">Support</SelectItem>
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
                </div>

                <div className="grid gap-4 md:grid-cols-2">
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
                    <div className="space-y-2">
                        <Label htmlFor="progress">Initial progress (%)</Label>
                        <div className="grid grid-cols-[1fr_auto] items-center gap-2">
                            <Input type="range" min={0} max={100} step={5} {...register('progress', { valueAsNumber: true })} />
                            <span className="w-12 text-right text-sm text-muted-foreground">{watch('progress')}%</span>
                        </div>
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                        <Label htmlFor="startDate">Start date</Label>
                        <Input id="startDate" type="date" {...register('startDate', { required: 'Start date is required' })} />
                        {errors.startDate && <p className="text-sm text-destructive">{errors.startDate.message}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="dueDate">Due date</Label>
                        <Input
                            id="dueDate"
                            type="date"
                            {...register('dueDate', {
                                required: 'Due date is required',
                                validate: value => {
                                    if (!startDate || !value) return true;
                                    const start = parseISO(startDate);
                                    const due = parseISO(value);
                                    if (!isValid(start) || !isValid(due)) return true;
                                    return due >= start || 'Due date must be on or after the start date';
                                },
                            })}
                        />
                        {errors.dueDate && <p className="text-sm text-destructive">{errors.dueDate.message}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="durationDays">Duration (days)</Label>
                        <Input id="durationDays" value={durationDays ? `${durationDays} days` : ''} readOnly placeholder="Auto calculated" />
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

