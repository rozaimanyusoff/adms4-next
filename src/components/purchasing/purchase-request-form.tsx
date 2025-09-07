'use client';

import React, { useContext, useEffect, useState } from 'react';
import { authenticatedApi } from '@/config/api';
import { toast } from 'sonner';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { AuthContext } from '@/store/AuthContext';
import { Plus, X } from 'lucide-react';

type Option = { id: number | string; name: string };

interface PurchaseRequestFormData {
  request_type: string; // CAPEX | OPEX | Others
  pr_date: string;      // request date
  costcenter: string;   // costcenter id
  department_id: string;// department id
  position_id: string;  // position id
}

interface RequestItem {
  id: string;
  type_id: string;
  category_id: string;
  description: string;
  qty: number;
  purpose: string;
}

const PurchaseRequestForm: React.FC = () => {
  // Form state
  const [formData, setFormData] = useState<PurchaseRequestFormData>({
    request_type: '',
    pr_date: new Date().toISOString().slice(0,10),
    costcenter: '',
    department_id: '',
    position_id: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [items, setItems] = useState<RequestItem[]>([]);
  const [itemErrors, setItemErrors] = useState<Array<Record<string, string>>>([]);
  const [openItems, setOpenItems] = useState<string[]>([]);

  // Dropdown data
  const [costcenters, setCostcenters] = useState<Option[]>([]);
  const [costcenterOptions, setCostcenterOptions] = useState<ComboboxOption[]>([]);
  const [types, setTypes] = useState<Option[]>([]);
  const [typeOptions, setTypeOptions] = useState<ComboboxOption[]>([]);
  const [departments, setDepartments] = useState<Option[]>([]);
  const [departmentOptions, setDepartmentOptions] = useState<ComboboxOption[]>([]);
  const [positions, setPositions] = useState<Option[]>([]);
  const [positionOptions, setPositionOptions] = useState<ComboboxOption[]>([]);
  // Categories cache by type id
  const [categoryOptionsByType, setCategoryOptionsByType] = useState<Record<string, ComboboxOption[]>>({});
  const [categoriesLoadingByType, setCategoriesLoadingByType] = useState<Record<string, boolean>>({});

  const [loadingCombos, setLoadingCombos] = useState({
    costcenters: false,
    types: false,
    brands: false,
    suppliers: false,
  });

  // Current user
  const auth = useContext(AuthContext);
  const [employeeName, setEmployeeName] = useState<string>('');
  const requesterNameFallback = auth?.authData?.user?.name || auth?.authData?.user?.username || '';
  const requesterRamcoId = auth?.authData?.user?.username || '';

  // Fetch employee profile for defaults (position/department/costcenter)
  useEffect(() => {
    if (!requesterRamcoId) return;
    (async () => {
      try {
        const res = await authenticatedApi.get(`/api/assets/employees?ramco=${encodeURIComponent(requesterRamcoId)}`);
        const emp = (res as any).data?.data?.[0];
        if (emp) {
          setFormData((prev) => ({
            ...prev,
            position_id: emp.position?.id ? String(emp.position.id) : prev.position_id,
            department_id: emp.department?.id ? String(emp.department.id) : prev.department_id,
            costcenter: emp.costcenter?.id ? String(emp.costcenter.id) : prev.costcenter,
          }));
          setEmployeeName(emp.full_name || '');
        }
      } catch {}
    })();
  }, [requesterRamcoId]);

  // Load costcenters, suppliers, types on mount
  useEffect(() => {
    const loadBaseCombos = async () => {
      try {
        setLoadingCombos((s) => ({ ...s, costcenters: true, suppliers: true, types: true }));
        const [ccRes, depRes, posRes, typesRes] = await Promise.all([
          authenticatedApi.get('/api/assets/costcenters'),
          authenticatedApi.get('/api/assets/departments'),
          authenticatedApi.get('/api/assets/positions'),
          authenticatedApi.get('/api/assets/types'),
        ]);

        const ccs = (ccRes as any).data?.data || (ccRes as any).data || [];
        const deps = (depRes as any).data?.data || (depRes as any).data || [];
        const poss = (posRes as any).data?.data || (posRes as any).data || [];
        const tps = (typesRes as any).data?.data || (typesRes as any).data || [];

        setCostcenters(ccs);
        setCostcenterOptions(ccs.map((c: any) => ({ value: String(c.id), label: c.name })));
        setDepartments(deps);
        setDepartmentOptions(deps.map((d: any) => ({ value: String(d.id), label: d.name })));
        setPositions(poss);
        setPositionOptions(poss.map((p: any) => ({ value: String(p.id), label: p.name })));
        setTypes(tps);
        setTypeOptions(tps.map((t: any) => ({ value: String(t.id), label: t.name })));
      } catch (err) {
        toast.error('Failed to load dropdown data');
        // eslint-disable-next-line no-console
        console.error('Combo load error', err);
      } finally {
        setLoadingCombos((s) => ({ ...s, costcenters: false, suppliers: false, types: false }));
      }
    };
    loadBaseCombos();
  }, []);

  // No brand/supplier in this request form per spec

  // Input change helper
  const setField = (field: keyof PurchaseRequestFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field as string]) setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  // Basic validation for user request
  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!formData.request_type) e.request_type = 'Request type is required';
    if (!formData.pr_date) e.pr_date = 'Request date is required';
    if (!formData.costcenter) e.costcenter = 'Cost center is required';
    if (!formData.department_id) e.department_id = 'Department is required';
    // position is free text; position_id optional
    if (!items.length) e.items_root = 'At least one request item is required';

    const ie: Array<Record<string, string>> = [];
    items.forEach((it, idx) => {
      const r: Record<string, string> = {};
      if (!it.type_id) r.type_id = 'Item type is required';
      if (!it.category_id) r.category_id = 'Category is required';
      if (!it.description?.trim()) r.description = 'Item description is required';
      if (!it.qty || it.qty <= 0) r.qty = 'Quantity must be greater than 0';
      if (!it.purpose?.trim()) r.purpose = 'Justification/purpose is required';
      ie[idx] = r;
    });
    setItemErrors(ie);
    setErrors(e);
    return Object.keys(e).length === 0 && ie.every((r) => Object.keys(r).length === 0);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      // Align with purchasing module payload
      const payload: any = {
        request_type: formData.request_type,
        pr_date: formData.pr_date,
        costcenter: formData.costcenter,
        department_id: formData.department_id,
        position_id: formData.position_id,
        ramco_id: requesterRamcoId,
        request_items: items.map(({ type_id, category_id, description, qty, purpose }) => ({ type_id, category_id, description, qty, purpose })),
        // Backward compatible summary
        items: items.map((i) => i.description).join('; '),
        qty: items.reduce((s, i) => s + (i.qty || 0), 0),
      };

      // API expects costcenter_id and possibly ramco_id; keep costcenter_id like purchase-records
      payload.costcenter_id = payload.costcenter;
      delete payload.costcenter;

      await authenticatedApi.post('/api/purchases/request-items', payload);

      toast.success('Purchase request submitted');
      setFormData({ request_type: '', pr_date: '', costcenter: '', department_id: '', position_id: '' });
      setItems([{ id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Date.now()), type_id: '', category_id: '', description: '', qty: 1, purpose: '' }]);
      setItemErrors([{}]);
      setItemErrors([{}]);
    } catch (err) {
      toast.error('Failed to submit purchase request');
      // eslint-disable-next-line no-console
      console.error('Submit request error', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Purchase Request</h1>
        <p className="text-sm text-gray-500">Create a new purchase request</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className='text-lg'>Requestor</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-6">
            {/* Row 1: Request Type & Date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm">Request Type *</Label>
                <Combobox
                  options={[{ value: 'CAPEX', label: 'CAPEX' }, { value: 'OPEX', label: 'OPEX' }, { value: 'OTHERS', label: 'Others' }]}
                  value={formData.request_type}
                  onValueChange={(v) => setField('request_type', v)}
                  placeholder="Select request type"
                  className="h-10"
                  clearable
                />
                {errors.request_type && <p className="text-red-500 text-sm mt-1">{errors.request_type}</p>}
              </div>
              <div>
                <Label className="text-sm">Request Date *</Label>
                <Input className="h-10" type="date" value={formData.pr_date} onChange={(e) => setField('pr_date', e.target.value)} />
                {errors.pr_date && <p className="text-red-500 text-sm mt-1">{errors.pr_date}</p>}
              </div>
            </div>

            {/* Row 2: Name & Position */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm">Name</Label>
                <Input className="h-10" value={employeeName || requesterNameFallback} disabled />
              </div>
              <div>
                <Label className="text-sm">Ramco ID</Label>
                <Input
                  className="h-10"
                  value={positionOptions.find(o => o.value === formData.position_id)?.label || ''}
                  disabled
                  placeholder="Position"
                />
              </div>
            </div>

            {/* Row 3: Cost Center & Department */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm">Cost Center *</Label>
                <Combobox
                  options={costcenterOptions}
                  value={formData.costcenter}
                  onValueChange={(v) => setField('costcenter', v)}
                  placeholder="Select cost center"
                  emptyMessage="No cost centers"
                  disabled={loadingCombos.costcenters}
                  className="h-10"
                  clearable
                />
                {errors.costcenter && <p className="text-red-500 text-sm mt-1">{errors.costcenter}</p>}
              </div>
              <div>
                <Label className="text-sm">Department *</Label>
                <Combobox
                  options={departmentOptions}
                  value={formData.department_id}
                  onValueChange={(v) => setField('department_id', v)}
                  placeholder="Select department"
                  emptyMessage="No departments"
                  disabled={loadingCombos.types}
                  className="h-10"
                  clearable
                />
                {errors.department_id && <p className="text-red-500 text-sm mt-1">{errors.department_id}</p>}
              </div>
            </div>
            <Separator className="my-4" />

            {/* Request Items Section */}
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Request Items</h3>
              <Button
                type="button"
                variant="default"
                onClick={() => {
                  const newId = (typeof crypto !== 'undefined' && 'randomUUID' in crypto) ? crypto.randomUUID() : String(Date.now() + Math.random());
                  setItems((prev) => [...prev, { id: newId, type_id: '', category_id: '', description: '', qty: 1, purpose: '' }]);
                  setItemErrors((prev) => [...prev, {}]);
                  setOpenItems((prev) => [...prev, newId]);
                }}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {errors.items_root && <p className="text-red-500 text-sm">{errors.items_root}</p>}
            <Accordion type="multiple" value={openItems} onValueChange={(v: any) => setOpenItems(v as string[])} className="w-full">
              {items.map((it, idx) => {
                const typeLabel = typeOptions.find((o) => o.value === it.type_id)?.label || 'No type';
                const desc = it.description || '';
                const truncated = desc.length > 40 ? `${desc.slice(0, 40)}…` : desc;
                const itemValid = Boolean(it.type_id && (it.category_id || '').toString() && (it.description || '').trim() && (it.qty || 0) > 0 && (it.purpose || '').trim());
                return (
                  <AccordionItem key={it.id} value={it.id} className="relative rounded-md border border-blue-200 bg-blue-50 mb-2">
                    <AccordionTrigger className="text-sm font-medium px-3">
                      <div className="flex w-full items-center gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold">Item {idx + 1}</span>
                          <span className="font-semibold">{typeLabel}</span>
                          <span className="text-gray-500">• Qty: {it.qty || 0}</span>
                          {desc && <span className="text-gray-600">• {truncated}</span>}
                        </div>
                        <div className="ml-auto flex items-center gap-2 pr-1">
                          <button
                            type="button"
                            className={"text-xs px-2 py-1 rounded text-white " + (itemValid ? "bg-blue-600 hover:bg-blue-700" : "bg-blue-300 cursor-not-allowed opacity-60")}
                            disabled={!itemValid}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              const r: Record<string, string> = {};
                              if (!it.type_id) r.type_id = 'Item type is required';
                              if (!it.description?.trim()) r.description = 'Item description is required';
                              if (!it.qty || it.qty <= 0) r.qty = 'Quantity must be greater than 0';
                              if (!it.purpose?.trim()) r.purpose = 'Justification/purpose is required';
                              setItemErrors((prev) => prev.map((er, i) => i === idx ? r : er));
                              if (Object.keys(r).length === 0) {
                                setOpenItems((prev) => prev.filter((id) => id !== it.id));
                              }
                            }}
                          >
                            Save Item
                          </button>
                          <button
                            type="button"
                            className="text-red-600 hover:text-red-700"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setItems((prev) => prev.filter((_, i) => i !== idx));
                              setItemErrors((prev) => prev.filter((_, i) => i !== idx));
                              setOpenItems((prev) => prev.filter((id) => id !== it.id));
                            }}
                            aria-label="Remove item"
                            title="Remove item"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-3">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label className="text-sm">Item Type *</Label>
                          <Combobox
                            options={typeOptions}
                            value={it.type_id}
                            onValueChange={(v) => {
                              setItems((prev) => prev.map((p, i) => i === idx ? { ...p, type_id: v, category_id: '' } : p));
                              setItemErrors((prev) => prev.map((er, i) => i === idx ? { ...er, type_id: '' } : er));
                              if (v && !categoryOptionsByType[v]) {
                                setCategoriesLoadingByType((s) => ({ ...s, [v]: true }));
                                authenticatedApi.get(`/api/assets/categories?type=${encodeURIComponent(v)}`)
                                  .then((res) => {
                                    const list = ((res as any).data?.data || (res as any).data || []).map((c: any) => ({ value: String(c.id ?? c.code ?? c.name), label: c.name }));
                                    setCategoryOptionsByType((m) => ({ ...m, [v]: list }));
                                  })
                                  .catch(() => setCategoryOptionsByType((m) => ({ ...m, [v]: [] })))
                                  .then(() => setCategoriesLoadingByType((s) => ({ ...s, [v]: false })));
                              }
                            }}
                            placeholder="Select item type"
                            emptyMessage="No item types"
                            disabled={loadingCombos.types}
                            className="h-10"
                            clearable
                          />
                          {itemErrors[idx]?.type_id && <p className="text-red-500 text-sm mt-1">{itemErrors[idx]?.type_id}</p>}
                        </div>
                        <div>
                          <Label className="text-sm">Category *</Label>
                          <Combobox
                            options={it.type_id ? (categoryOptionsByType[it.type_id] || []) : []}
                            value={it.category_id || ''}
                            onValueChange={(val) => {
                              setItems((prev) => prev.map((p, i) => i === idx ? { ...p, category_id: val } : p));
                              setItemErrors((prev) => prev.map((er, i) => i === idx ? { ...er, category_id: '' } : er));
                            }}
                            placeholder={it.type_id ? 'Select category' : 'Select item type first'}
                            emptyMessage="No categories"
                            disabled={!it.type_id || categoriesLoadingByType[it.type_id || '']}
                            className="h-10"
                            clearable
                          />
                          {itemErrors[idx]?.category_id && <p className="text-red-500 text-sm mt-1">{itemErrors[idx]?.category_id}</p>}
                        </div>
                        <div>
                          <Label className="text-sm">Quantity *</Label>
                          <Input
                            className="h-10"
                            type="number"
                            min={1}
                            value={it.qty || ''}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 0;
                              setItems((prev) => prev.map((p, i) => i === idx ? { ...p, qty: val } : p));
                              setItemErrors((prev) => prev.map((er, i) => i === idx ? { ...er, qty: '' } : er));
                            }}
                          />
                          {itemErrors[idx]?.qty && <p className="text-red-500 text-sm mt-1">{itemErrors[idx]?.qty}</p>}
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div>
                          <Label className="text-sm">Item Description *</Label>
                          <Textarea
                            placeholder="Describe the item(s) to purchase"
                            value={it.description}
                            onChange={(e) => {
                              const val = e.target.value;
                              setItems((prev) => prev.map((p, i) => i === idx ? { ...p, description: val } : p));
                              setItemErrors((prev) => prev.map((er, i) => i === idx ? { ...er, description: '' } : er));
                            }}
                            rows={3}
                          />
                          {itemErrors[idx]?.description && <p className="text-red-500 text-sm mt-1">{itemErrors[idx]?.description}</p>}
                        </div>
                        <div>
                          <Label className="text-sm">Justification / Purpose *</Label>
                          <Textarea
                            placeholder="Explain the purpose or justification"
                            value={it.purpose}
                            onChange={(e) => {
                              const val = e.target.value;
                              setItems((prev) => prev.map((p, i) => i === idx ? { ...p, purpose: val } : p));
                              setItemErrors((prev) => prev.map((er, i) => i === idx ? { ...er, purpose: '' } : er));
                            }}
                            rows={3}
                          />
                          {itemErrors[idx]?.purpose && <p className="text-red-500 text-sm mt-1">{itemErrors[idx]?.purpose}</p>}
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>

            <Separator />

            {/* No supplier/upload fields for user request form */}

            <div className="flex gap-3 justify-end">
              <Button type="button" variant="ghost" onClick={() => {
                setFormData({ request_type: '', pr_date: new Date().toISOString().slice(0,10), costcenter: '', department_id: '', position_id: '' });
                setItems([]);
                setItemErrors([]);
                setOpenItems([]);
                setErrors({});
              }}>Reset</Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Submitting…' : 'Submit Request'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default PurchaseRequestForm;
