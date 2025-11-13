'use client';

import React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { authenticatedApi } from '@/config/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, Loader2, CornerUpLeft } from 'lucide-react';
import { SingleSelect, type ComboboxOption } from '@/components/ui/combobox';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type CourseFormValues = {
  course_title: string;
  course_desc: string;
  course_obj: string;
  course_type: 'in-house' | 'external' | 'public' | 'seminar' | '';
  course_cat: 'leadership' | 'professional certification' | 'technical' | 'safety' | 'induction' | '';
  course_opt: { hrdf: boolean; cpd: boolean; tf: boolean };
  trainer_id?: string | number | null;
};

type CostItem = { id: string; description: string; cost: string };

type TrainingCourseFormProps = {
  courseId?: number;
  onSuccess?: () => void;
};

const DEFAULT_VALUES: CourseFormValues = {
  course_title: '',
  course_desc: '',
  course_obj: '',
  course_type: '',
  course_cat: '',
  course_opt: { hrdf: false, cpd: false, tf: false },
  trainer_id: null,
};

const TYPE_OPTIONS = [
  { value: 'in-house', label: 'In-house' },
  { value: 'external', label: 'External' },
  { value: 'public', label: 'Public' },
  { value: 'seminar', label: 'Seminar' },
] as const;

const CAT_OPTIONS = [
  { value: 'leadership', label: 'Leadership' },
  { value: 'professional certification', label: 'Professional Certification' },
  { value: 'technical', label: 'Technical' },
  { value: 'safety', label: 'Safety' },
  { value: 'induction', label: 'Induction' },
] as const;

const TrainingCourseForm: React.FC<TrainingCourseFormProps> = ({ courseId, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [trainers, setTrainers] = useState<ComboboxOption[]>([]);
  const [costs, setCosts] = useState<CostItem[]>([{ id: 'row-1', description: '', cost: '' }]);

  const { register, setValue, getValues, reset, watch } = useForm<CourseFormValues>({ defaultValues: DEFAULT_VALUES, mode: 'onChange' });
  const [successOpen, setSuccessOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState('Course saved successfully.');

  const trainerIdValue = watch('trainer_id');

  useEffect(() => {
    let ignore = false;
    const loadTrainers = async () => {
      try {
        const res = await authenticatedApi.get('/api/training/trainers');
        const data: any = (res as any)?.data;
        const list: any[] = Array.isArray(data?.data) ? data.data : Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
        if (ignore) return;
        const options: ComboboxOption[] = list
          .map((it: any) => {
            const id = String(it?.trainer_id ?? it?.id ?? '');
            const label = it?.trainer_company || it?.trainer_name || it?.name || it?.full_name || '';
            return { value: id, label } as ComboboxOption;
          })
          .filter((o) => o.value && o.label);
        setTrainers(options);
      } catch {
        setTrainers([]);
      }
    };
    loadTrainers();
    return () => { ignore = true; };
  }, []);

  useEffect(() => {
    if (!courseId) return;
    let ignore = false;
    setLoading(true);
    (async () => {
      try {
        const res = await authenticatedApi.get(`/api/training/courses/${courseId}`);
        const raw: any = (res as any)?.data?.data ?? (res as any)?.data ?? null;
        if (ignore || !raw) return;
        const optStr = String(raw?.course_opt || '').toLowerCase();
        const hrdf = /hrdf/.test(optStr) || Boolean(raw?.hrdf);
        const cpd = /cpd/.test(optStr) || Boolean(raw?.cpd);
        const tf = /(tf|facility)/.test(optStr) || Boolean(raw?.tf);
        reset({
          course_title: String(raw?.course_title || raw?.title || ''),
          course_desc: String(raw?.course_desc || raw?.description || ''),
          course_obj: String(raw?.course_obj || raw?.objective || ''),
          course_type: (String(raw?.course_type || '').toLowerCase() as CourseFormValues['course_type']) || '',
          course_cat: (String(raw?.course_cat || '').toLowerCase() as CourseFormValues['course_cat']) || '',
          course_opt: { hrdf, cpd, tf },
          trainer_id: raw?.trainer_id ? String(raw.trainer_id) : null,
        });
        // load costs if provided
        const costRows: CostItem[] = Array.isArray(raw?.costs)
          ? raw.costs.map((r: any, idx: number) => ({ id: `srv-${idx + 1}`, description: String(r?.description || ''), cost: String(r?.cost || r?.amount || '') }))
          : [];
        setCosts(costRows.length ? costRows : [{ id: 'row-1', description: '', cost: '' }]);
      } catch {
        // ignore
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, [courseId, reset]);

  const addCostRow = () => setCosts((prev) => [...prev, { id: `row-${Date.now()}`, description: '', cost: '' }]);
  const removeCostRow = (id: string) => setCosts((prev) => (prev.length <= 1 ? prev : prev.filter((r) => r.id !== id)));
  const updateCostRow = (id: string, patch: Partial<CostItem>) => setCosts((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const totalCost = useMemo(() => costs.reduce((sum, r) => sum + (parseFloat(r.cost || '0') || 0), 0), [costs]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const values = getValues();
    if (!values.course_title.trim()) { toast.error('Course title is required'); return; }
    if (!values.course_type) { toast.error('Course type is required'); return; }
    if (!values.course_cat) { toast.error('Course category is required'); return; }
    setSaving(true);
    try {
      const optionsCsv = [values.course_opt.hrdf ? 'hrdf' : null, values.course_opt.cpd ? 'cpd' : null, values.course_opt.tf ? 'tf' : null]
        .filter(Boolean)
        .join(',');
      const trainerLabel = trainers.find((t) => String(t.value) === String(values.trainer_id || ''))?.label || '';
      const payload: any = {
        course_title: values.course_title,
        course_type: values.course_type,
        course_desc: values.course_desc,
        course_obj: values.course_obj,
        course_cat: values.course_cat,
        trainer: trainerLabel,
        course_opt: optionsCsv,
        total_cost: totalCost.toFixed(2),
        costings: costs
          .filter((c) => c.description.trim() || c.cost.trim())
          .map((c) => ({ cost_desc: c.description.trim(), cost: (parseFloat(c.cost || '0') || 0).toFixed(2) })),
      };
      if (courseId) {
        await authenticatedApi.put(`/api/training/courses/${courseId}`, payload);
        setSuccessMsg('Course updated successfully.');
      } else {
        await authenticatedApi.post('/api/training/courses', payload);
        setSuccessMsg('Course created successfully.');
      }
      setSuccessOpen(true);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to save course');
    } finally {
      setSaving(false);
    }
  };

  // Enable save only when required fields and at least one option are set
  const titleVal = watch('course_title');
  const typeVal = watch('course_type');
  const descVal = watch('course_desc');
  const objVal = watch('course_obj');
  const optsVal = watch('course_opt');
  const optionsChecked = !!(optsVal?.hrdf || optsVal?.cpd || optsVal?.tf);
  const canSave = Boolean(titleVal?.trim()) && Boolean(typeVal) && Boolean(descVal?.trim()) && Boolean(objVal?.trim()) && optionsChecked;

  return (
    <>
    <Card>
      <CardHeader>
        <CardTitle>{courseId ? 'Edit Course' : 'Register New Course'}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading...</div>
        ) : (
          <form onSubmit={submit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left: Course Title */}
              <div className="space-y-2 md:col-span-1">
                <Label htmlFor="course_title">Course Title</Label>
                <Textarea id="course_title" placeholder="Enter course title" className="min-h-28" {...register('course_title')} />
              </div>
              {/* Right: stacked Course Type + Category */}
              <div className="space-y-4 md:col-span-1">
                <div className="space-y-2">
                  <Label htmlFor="course_type">Course Type</Label>
                  <Select value={watch('course_type')} onValueChange={(v) => setValue('course_type', v as any)}>
                    <SelectTrigger id="course_type" className='w-full'><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      {TYPE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="course_cat">Course Category</Label>
                  <Select value={watch('course_cat')} onValueChange={(v) => setValue('course_cat', v as any)}>
                    <SelectTrigger id="course_cat" className='w-full'><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      {CAT_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="course_desc">Description</Label>
                <Textarea id="course_desc" className="min-h-28" placeholder="Course description" {...register('course_desc')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="course_obj">Objective</Label>
                <Textarea id="course_obj" className="min-h-28" placeholder="Course objective" {...register('course_obj')} />
              </div>
            </div>

            {/* Trainer + Options side-by-side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              <div className="space-y-2">
                <Label>Trainer</Label>
                <SingleSelect
                  options={trainers}
                  value={trainerIdValue ? String(trainerIdValue) : ''}
                  onValueChange={(val) => setValue('trainer_id', val)}
                  placeholder="Select trainer"
                />
              </div>
              <div className="space-y-2">
                <Label className='mb-2'>Options</Label>
                <div className="flex flex-wrap gap-4 text-sm">
                  <label className="flex items-center gap-2">
                    <Checkbox checked={watch('course_opt').hrdf} onCheckedChange={(v) => setValue('course_opt', { ...getValues('course_opt'), hrdf: Boolean(v) })} />
                    HRDF claimable
                  </label>
                  <label className="flex items-center gap-2">
                    <Checkbox checked={watch('course_opt').cpd} onCheckedChange={(v) => setValue('course_opt', { ...getValues('course_opt'), cpd: Boolean(v) })} />
                    CPD
                  </label>
                  <label className="flex items-center gap-2">
                    <Checkbox checked={watch('course_opt').tf} onCheckedChange={(v) => setValue('course_opt', { ...getValues('course_opt'), tf: Boolean(v) })} />
                    Training Facility
                  </label>
                </div>
              </div>
            </div>

            {/* Program Costing last row */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Program Costing</Label>
                <div className="text-sm text-muted-foreground">Total: RM {totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </div>
              <div className="space-y-2">
                {costs.map((row) => (
                  <div key={row.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                    <Input
                      placeholder="Description"
                      value={row.description}
                      onChange={(e) => updateCostRow(row.id, { description: e.target.value })}
                      className="md:col-span-7"
                    />
                    <Input
                      placeholder="Cost"
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      value={row.cost}
                      onChange={(e) => updateCostRow(row.id, { cost: e.target.value })}
                      className="md:col-span-4"
                    />
                    <Button type="button" variant="ghost" size="icon" className="md:col-span-1" onClick={() => removeCostRow(row.id)} disabled={costs.length <= 1}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button type="button" variant="outline" onClick={addCostRow}><Plus className="h-4 w-4" /> Add Row</Button>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onSuccess?.()}>
                <CornerUpLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button type="submit" disabled={!canSave || saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save Course</Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>

    <Dialog open={successOpen} onOpenChange={setSuccessOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Success</DialogTitle>
          <DialogDescription>{successMsg}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={() => { setSuccessOpen(false); onSuccess?.(); }}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
};

export default TrainingCourseForm;
