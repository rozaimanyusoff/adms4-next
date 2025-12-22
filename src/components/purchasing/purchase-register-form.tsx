'use client';

import React, { useMemo, useState } from 'react';
import { ShoppingCart, Package, Plus, Truck, Trash2, FileText } from 'lucide-react';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { ApiPurchase, PurchaseFormData } from './types';
import { authenticatedApi } from '@/config/api';
import { toast } from 'sonner';

type DeliveryError = Partial<Record<'do_date' | 'do_no' | 'inv_date' | 'inv_no' | 'grn_date' | 'grn_no', string>>;

const fmtRM = (value: number) => {
  return Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

interface PurchaseRegisterFormProps {
  formData: PurchaseFormData;
  validationErrors: Record<string, string>;
  deliveryErrors: DeliveryError[];
  setValidationErrors: (val: Record<string, string>) => void;
  setDeliveryErrors: (val: DeliveryError[]) => void;
  calculatedTotal: number;
  maxDeliveries: number;
  activeDeliveryTab: string;
  setActiveDeliveryTab: (value: string) => void;
  costcenterOptions: ComboboxOption[];
  employeeOptions: ComboboxOption[];
  typeOptions: ComboboxOption[];
  categoryOptions: ComboboxOption[];
  supplierOptions: ComboboxOption[];
  brandOptions: ComboboxOption[];
  costcentersLoading: boolean;
  employeesLoading: boolean;
  typesLoading: boolean;
  categoriesLoading: boolean;
  suppliersLoading: boolean;
  brandsLoading: boolean;
  addingSupplier: boolean;
  creatingSupplier: boolean;
  newSupplierName: string;
  onSupplierSelect: (val: string) => void;
  onSupplierNameChange: (val: string) => void;
  onCreateSupplier: () => Promise<void>;
  addingBrand: boolean;
  creatingBrand: boolean;
  newBrandName: string;
  onBrandSelect: (val: string) => void;
  onBrandNameChange: (val: string) => void;
  onCreateBrand: () => Promise<void>;
  handleInputChange: (field: keyof PurchaseFormData, value: any) => void;
  selectedPurchase: ApiPurchase | null;
  deliveryFiles: Array<File | null>;
  onDeliveryFileDrop: (index: number, e: React.DragEvent) => void;
  onDeliveryFileSelect: (index: number, e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveDeliveryFile: (index: number) => void;
  fileInputRefs: React.MutableRefObject<Array<HTMLInputElement | null>>;
  updateDeliveryField: (index: number, field: 'do_date' | 'do_no' | 'inv_date' | 'inv_no' | 'grn_date' | 'grn_no', value: string) => void;
  findDuplicateDeliveries: () => number[];
  findPartialDuplicates: () => { indices: number[]; details: string[] };
  onAddDelivery: () => void;
  onRemoveDelivery: (idx: number) => void;
  pendingDelete: { index: number; message: string } | null;
  setPendingDelete: (value: { index: number; message: string } | null) => void;
  deleteDelivery: (idx: number) => Promise<void>;
  showSubmitConfirm: boolean;
  setShowSubmitConfirm: (value: boolean) => void;
  sidebarMode: 'view' | 'create' | 'edit';
  canDelete: boolean;
  loading: boolean;
  closeSidebar: () => void;
  loadPurchases: () => void;
  setLoading: (val: boolean) => void;
  onSubmitSuccess?: () => void;
}

const PurchaseRegisterForm: React.FC<PurchaseRegisterFormProps> = ({
  formData,
  validationErrors,
  deliveryErrors,
  setValidationErrors,
  setDeliveryErrors,
  calculatedTotal,
  maxDeliveries,
  activeDeliveryTab,
  setActiveDeliveryTab,
  costcenterOptions,
  employeeOptions,
  typeOptions,
  categoryOptions,
  supplierOptions,
  brandOptions,
  costcentersLoading,
  employeesLoading,
  typesLoading,
  categoriesLoading,
  suppliersLoading,
  brandsLoading,
  addingSupplier,
  creatingSupplier,
  newSupplierName,
  onSupplierSelect,
  onSupplierNameChange,
  onCreateSupplier,
  addingBrand,
  creatingBrand,
  newBrandName,
  onBrandSelect,
  onBrandNameChange,
  onCreateBrand,
  handleInputChange,
  selectedPurchase,
  deliveryFiles,
  onDeliveryFileDrop,
  onDeliveryFileSelect,
  onRemoveDeliveryFile,
  fileInputRefs,
  updateDeliveryField,
  findDuplicateDeliveries,
  findPartialDuplicates,
  onAddDelivery,
  onRemoveDelivery,
  pendingDelete,
  setPendingDelete,
  deleteDelivery,
  showSubmitConfirm,
  setShowSubmitConfirm,
  sidebarMode,
  canDelete,
  loading,
  closeSidebar,
  loadPurchases,
  setLoading,
  onSubmitSuccess
}) => {
  const isFormComplete = useMemo(() => {
    return !!(
      formData.request_type &&
      formData.pr_date &&
      formData.pr_no &&
      formData.costcenter &&
      formData.pic &&
      formData.type_id &&
      formData.items &&
      formData.supplier_id &&
      formData.po_no &&
      formData.po_date &&
      formData.qty > 0 &&
      formData.unit_price > 0
    );
  }, [formData]);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const validateDeliveries = (): boolean => {
    const errs: DeliveryError[] = [];
    let ok = true;
    (formData.deliveries || []).forEach((d, i) => {
      const e: DeliveryError = {};
      const hasDO = !!(d.do_date || d.do_no);
      const hasINV = !!(d.inv_date || d.inv_no);
      const hasGRN = !!(d.grn_date || d.grn_no);
      const hasAny = hasDO || hasINV || hasGRN || !!deliveryFiles[i];
      if (!hasAny) {
        e.do_no = 'Empty delivery entry — remove or fill required fields';
        errs[i] = e;
        ok = false;
        return;
      }
      if (hasDO) {
        if (!d.do_date) e.do_date = 'DO date is required';
        if (!d.do_no) e.do_no = 'DO number is required';
      }
      if (hasINV) {
        if (!d.inv_date) e.inv_date = 'Invoice date is required';
        if (!d.inv_no) e.inv_no = 'Invoice number is required';
      }
      if (hasGRN) {
        if (!d.grn_date) e.grn_date = 'GRN date is required';
        if (!d.grn_no) e.grn_no = 'GRN number is required';
      }
      errs[i] = e;
      if (Object.keys(e).length > 0) ok = false;
    });
    setDeliveryErrors(errs);
    return ok;
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.request_type) errors.request_type = 'Request type is required';
    if (!formData.costcenter) errors.costcenter = 'Cost center is required';
    if (!formData.pic) errors.pic = 'Requester is required';
    if (!formData.items) errors.items = 'Item description is required';
    if (!formData.type_id) errors.type_id = 'Item type is required';
    if (!formData.supplier_id) errors.supplier_id = 'Supplier is required';
    if (!formData.pr_no?.trim()) errors.pr_no = 'PR number is required';
    if (!formData.pr_date?.trim()) errors.pr_date = 'PR date is required';
    if (!formData.po_no?.trim()) errors.po_no = 'PO number is required';
    if (!formData.po_date?.trim()) errors.po_date = 'PO date is required';
    if (!formData.qty || formData.qty <= 0) errors.qty = 'Quantity must be greater than 0';
    if (!formData.unit_price || formData.unit_price <= 0) errors.unit_price = 'Unit price must be greater than 0';

    const baseOk = Object.keys(errors).length === 0;
    const deliveriesOk = validateDeliveries();
    setValidationErrors(errors);
    return baseOk && deliveriesOk;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const rawDeliveries = formData.deliveries || [];
      const deliveriesWithIndex = rawDeliveries
        .map((d, i) => ({ d, i }))
        .filter(({ d, i }) => {
          const hasVals = [d.do_date, d.do_no, d.inv_date, d.inv_no, d.grn_date, d.grn_no]
            .some(v => !!(v && String(v).trim() !== ''));
          const hasFile = !!deliveryFiles[i];
          return hasVals || hasFile;
        });
      const cleanDeliveries = deliveriesWithIndex.map(x => x.d);
      const allowedDeliveries = Math.min(Math.max(formData.qty || 0, 0), 5);
      if (cleanDeliveries.length > allowedDeliveries) {
        toast.error(`Deliveries exceed allowed limit (${allowedDeliveries}). Remove extra deliveries or adjust quantity.`);
        setLoading(false);
        return;
      }
      const jsonPayload: any = {
        ...formData,
        total_price: calculatedTotal.toString(),
        unit_price: String(formData.unit_price ?? ''),
        costcenter_id: formData.costcenter,
        ramco_id: formData.pic,
        brand_id: formData.brand_id || undefined,
        category_id: formData.category_id || undefined,
        purpose: formData.purpose || undefined,
        description: formData.items,
      };

      if (sidebarMode === 'edit' && selectedPurchase) {
        const reqId = (selectedPurchase.request && selectedPurchase.request.id)
          ? selectedPurchase.request.id
          : (selectedPurchase as any).request_id;
        if (reqId) {
          jsonPayload.request_id = reqId;
        }
      }

      delete jsonPayload.do_date;
      delete jsonPayload.do_no;
      delete jsonPayload.inv_date;
      delete jsonPayload.inv_no;
      delete jsonPayload.grn_date;
      delete jsonPayload.grn_no;

      if (cleanDeliveries.length > 0) {
        jsonPayload.deliveries = cleanDeliveries.map((d) => ({
          do_date: d.do_date || '',
          do_no: d.do_no || '',
          inv_date: d.inv_date || '',
          inv_no: d.inv_no || '',
          grn_date: d.grn_date || '',
          grn_no: d.grn_no || '',
          upload_path: ''
        }));
      }

      delete jsonPayload.costcenter;
      delete jsonPayload.pic;
      delete jsonPayload.items;
      delete jsonPayload.brand;

      const selectedIndexes = deliveriesWithIndex.map(x => x.i);
      const hasDeliveryFiles = selectedIndexes.some(idx => !!deliveryFiles[idx]);
      if (hasDeliveryFiles) {
        const fd = new FormData();
        Object.entries(jsonPayload).forEach(([k, v]) => {
          if (v === undefined || v === null) return;
          if (k === 'deliveries') return;
          fd.append(k, String(v));
        });
        deliveriesWithIndex.forEach(({ d, i }, idx) => {
          fd.append(`deliveries[${idx}][do_date]`, d.do_date || '');
          fd.append(`deliveries[${idx}][do_no]`, d.do_no || '');
          fd.append(`deliveries[${idx}][inv_date]`, d.inv_date || '');
          fd.append(`deliveries[${idx}][inv_no]`, d.inv_no || '');
          fd.append(`deliveries[${idx}][grn_date]`, d.grn_date || '');
          fd.append(`deliveries[${idx}][grn_no]`, d.grn_no || '');
          const f = deliveryFiles[i];
          if (f) {
            fd.append(`deliveries[${idx}][upload_path]`, f, f.name);
          } else {
            fd.append(`deliveries[${idx}][upload_path]`, '');
          }
        });

        if (sidebarMode === 'edit' && selectedPurchase) {
          await authenticatedApi.put(`/api/purchases/${selectedPurchase.id}`, fd, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          toast.success('Purchase record updated successfully');
        } else {
          await authenticatedApi.post('/api/purchases', fd, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          toast.success('Purchase record created successfully');
        }
      } else {
        if (sidebarMode === 'edit' && selectedPurchase) {
          await authenticatedApi.put(`/api/purchases/${selectedPurchase.id}`, jsonPayload);
          toast.success('Purchase record updated successfully');
        } else {
          await authenticatedApi.post('/api/purchases', jsonPayload);
          toast.success('Purchase record created successfully');
        }
      }

      if (onSubmitSuccess) onSubmitSuccess();
      loadPurchases();
      closeSidebar();
    } catch (error: any) {
      const getApiErrorMessage = (err: any): string => {
        try {
          const resp = err?.response;
          const data = resp?.data;
          if (!data) return err?.message || 'Failed to save purchase record';
          if (typeof data === 'string') return data;
          if (data.message && typeof data.message === 'string') return data.message;
          if (data.error && typeof data.error === 'string') return data.error;
          if (data.errors && typeof data.errors === 'object') {
            const first = Object.values<any>(data.errors).flat().find((m: any) => typeof m === 'string');
            if (first) return first as string;
          }
          return err?.message || 'Failed to save purchase record';
        } catch {
          return 'Failed to save purchase record';
        }
      };

      const msg = getApiErrorMessage(error);
      toast.error(msg || 'Failed to save purchase record');
      console.error('Error saving purchase:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedPurchase?.id) return;
    setLoading(true);
    try {
      await authenticatedApi.delete(`/api/purchases/${selectedPurchase.id}`);
      toast.success('Purchase record deleted successfully');
      loadPurchases();
      closeSidebar();
    } catch (error: any) {
      const getApiErrorMessage = (err: any): string => {
        const data = err?.response?.data;
        if (!data) return err?.message || 'Failed to delete purchase record';
        if (typeof data === 'string') return data;
        if (data.message && typeof data.message === 'string') return data.message;
        if (data.error && typeof data.error === 'string') return data.error;
        if (data.errors && typeof data.errors === 'object') {
          const first = Object.values<any>(data.errors).flat().find((m: any) => typeof m === 'string');
          if (first) return first as string;
        }
        return err?.message || 'Failed to delete purchase record';
      };
      toast.error(getApiErrorMessage(error));
      console.error('Error deleting purchase:', error);
    } finally {
      setLoading(false);
      setDeleteConfirmOpen(false);
    }
  };

  return (
    <div className="space-y-4 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <ShoppingCart className="mr-2 h-5 w-5" />
              Request Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="request_type">Request Type *</Label>
              <Select
                value={formData.request_type}
                onValueChange={(value) => handleInputChange('request_type', value)}
              >
                <SelectTrigger className='w-full'>
                  <SelectValue placeholder="Select request type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CAPEX">CAPEX</SelectItem>
                  <SelectItem value="OPEX">OPEX</SelectItem>
                  <SelectItem value="SERVICES">SERVICES</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">Required: choose CAPEX, OPEX, or SERVICES</p>
              {validationErrors.request_type && (
                <p className="text-red-500 text-sm mt-1">{validationErrors.request_type}</p>
              )}
            </div>
            <div>
              <Label htmlFor="pr_date">Request Date *</Label>
              <Input
                id="pr_date"
                type="date"
                value={formData.pr_date}
                onChange={(e) => handleInputChange('pr_date', e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">Required: pick the PR/request date</p>
              {validationErrors.pr_date && (
                <p className="text-red-500 text-sm mt-1">{validationErrors.pr_date}</p>
              )}
            </div>
            <div>
              <Label htmlFor="pr_no">Request Number *</Label>
              <Input
                id="pr_no"
                value={formData.pr_no}
                onChange={(e) => handleInputChange('pr_no', e.target.value)}
                placeholder="Enter PR number"
              />
              <p className="text-xs text-gray-500 mt-1">Required: enter the PR/Request number</p>
              {validationErrors.pr_no && (
                <p className="text-red-500 text-sm mt-1">{validationErrors.pr_no}</p>
              )}
            </div>

            <div>
              <Label htmlFor="costcenter">Cost Center *</Label>
              <Combobox
                options={costcenterOptions}
                value={formData.costcenter}
                onValueChange={(val) => handleInputChange('costcenter', val)}
                placeholder="Select cost center"
                emptyMessage="No cost centers"
                disabled={costcentersLoading}
                clearable={true}
              />
              <p className="text-xs text-gray-500 mt-1">Required: select the charging cost center</p>
              {validationErrors.costcenter && (
                <p className="text-red-500 text-sm mt-1">{validationErrors.costcenter}</p>
              )}
            </div>

            <div>
              <Label htmlFor="pic">Requester *</Label>
              <Combobox
                options={
                  employeeOptions.some(opt => opt.value === formData.pic)
                    ? employeeOptions
                    : formData.pic
                      ? [
                        ...employeeOptions,
                        {
                          value: formData.pic,
                          label:
                            (() => {
                              let fullName = '';
                              if (selectedPurchase?.request?.requested_by?.ramco_id === formData.pic) {
                                fullName = selectedPurchase.request.requested_by.full_name;
                              } else if (
                                selectedPurchase?.requestor &&
                                typeof selectedPurchase.requestor === 'object' &&
                                'ramco_id' in selectedPurchase.requestor &&
                                (selectedPurchase.requestor as any).ramco_id === formData.pic
                              ) {
                                fullName = (selectedPurchase.requestor as any).full_name;
                              }
                              return fullName || formData.pic;
                            })()
                        }
                      ]
                      : employeeOptions
                }
                value={formData.pic}
                onValueChange={(val) => handleInputChange('pic', val)}
                placeholder="Select person in charge"
                emptyMessage="No employees"
                disabled={employeesLoading}
                clearable={true}
              />
              <p className="text-xs text-gray-500 mt-1">Required: assign the requester/person in charge</p>
              {validationErrors.pic && (
                <p className="text-red-500 text-sm mt-1">{validationErrors.pic}</p>
              )}
            </div>

            <div>
              <Label htmlFor="type_id">Item Type *</Label>
              <Combobox
                options={typeOptions}
                value={formData.type_id}
                onValueChange={(val) => handleInputChange('type_id', val)}
                placeholder="Select item type"
                emptyMessage="No types"
                disabled={typesLoading}
                clearable={true}
              />
              <p className="text-xs text-gray-500 mt-1">Required: choose an item type</p>
              {validationErrors.type_id && (
                <p className="text-red-500 text-sm mt-1">{validationErrors.type_id}</p>
              )}
            </div>

            <div>
              <Label htmlFor="category_id">Category</Label>
              <Combobox
                options={categoryOptions}
                value={formData.category_id || ''}
                onValueChange={(val) => handleInputChange('category_id', val)}
                placeholder={formData.type_id ? 'Select category' : 'Select item type first'}
                emptyMessage={formData.type_id ? 'No categories found' : 'Select item type first'}
                disabled={categoriesLoading || !formData.type_id}
                clearable={true}
              />
            </div>

            <div>
              <Label htmlFor="items">Description *</Label>
              <Textarea
                id="items"
                value={formData.items}
                onChange={(e) => handleInputChange('items', e.target.value)}
                placeholder="Enter item description"
                rows={3}
              />
              <p className="text-xs text-gray-500 mt-1">Required: describe the requested item</p>
              {validationErrors.items && (
                <p className="text-red-500 text-sm mt-1">{validationErrors.items}</p>
              )}
            </div>

            <div>
              <Label htmlFor="purpose">Purpose</Label>
              <Textarea
                id="purpose"
                value={formData.purpose || ''}
                onChange={(e) => handleInputChange('purpose', e.target.value)}
                placeholder="Enter purpose/remarks"
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <Package className="mr-2 h-5 w-5" />
              Pricing & Order Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">

            <div>
              <Label htmlFor="qty">Quantity *</Label>
              <Input
                id="qty"
                type="number"
                min="1"
                value={formData.qty || ''}
                onChange={(e) => handleInputChange('qty', parseInt(e.target.value) || 0)}
                placeholder="Enter quantity"
              />
              <p className="text-xs text-gray-500 mt-1">Required: quantity must be greater than 0</p>
              {validationErrors.qty && (
                <p className="text-red-500 text-sm mt-1">{validationErrors.qty}</p>
              )}
            </div>

            <div>
              <Label htmlFor="unit_price">Unit Price (RM) *</Label>
              <Input
                id="unit_price"
                type="number"
                step="0.01"
                min="0.01"
                value={formData.unit_price || ''}
                onChange={(e) => handleInputChange('unit_price', parseFloat(e.target.value) || 0)}
                placeholder="Enter unit price"
              />
              <p className="text-xs text-gray-500 mt-1">Required: unit price must be greater than 0</p>
              {validationErrors.unit_price && (
                <p className="text-red-500 text-sm mt-1">{validationErrors.unit_price}</p>
              )}
            </div>

            <div>
              <Label>Total Amount</Label>
              <div className="text-2xl font-bold text-green-600">
                RM {fmtRM(calculatedTotal)}
              </div>
            </div>

            <div>
              <Label htmlFor="supplier">Supplier *</Label>
              <Combobox
                options={[...supplierOptions, { value: '__add_supplier__', label: 'Add new supplier…' }]}
                value={formData.supplier_id}
                onValueChange={onSupplierSelect}
                placeholder="Select supplier"
                emptyMessage="No suppliers"
                disabled={suppliersLoading}
                clearable={true}
              />
              <p className="text-xs text-gray-500 mt-1">Required: select a supplier</p>
              {validationErrors.supplier_id && (
                <p className="text-red-500 text-sm mt-1">{validationErrors.supplier_id}</p>
              )}
              {addingSupplier && (
                <div className="relative mt-2">
                  <Input
                    value={newSupplierName}
                    onChange={(e) => onSupplierNameChange(e.target.value)}
                    placeholder="Enter new supplier name"
                    disabled={creatingSupplier}
                    className="pr-10"
                  />
                  <Button
                    size="icon"
                    type="button"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                    onClick={onCreateSupplier}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="brand">Brand</Label>
              <Combobox
                options={[...brandOptions, { value: '__add_brand__', label: 'Add new brand…' }]}
                value={formData.brand_id}
                onValueChange={onBrandSelect}
                placeholder={formData.type_id ? 'Select brand' : 'Select item type first'}
                emptyMessage={formData.type_id ? 'No brands found' : 'Select item type first'}
                disabled={brandsLoading || !formData.type_id}
                clearable={true}
              />
              {addingBrand && (
                <div className="relative mt-2">
                  <Input
                    value={newBrandName}
                    onChange={(e) => onBrandNameChange(e.target.value)}
                    placeholder="Enter new brand name"
                    disabled={!formData.type_id || creatingBrand}
                    className="pr-10"
                  />
                  <Button
                    size="icon"
                    type="button"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                    onClick={onCreateBrand}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="po_no">PO Number *</Label>
              <Input
                id="po_no"
                value={formData.po_no}
                onChange={(e) => handleInputChange('po_no', e.target.value)}
                placeholder="Enter PO number"
              />
              <p className="text-xs text-gray-500 mt-1">Required: enter the PO number</p>
              {validationErrors.po_no && (
                <p className="text-red-500 text-sm mt-1">{validationErrors.po_no}</p>
              )}
            </div>

            <div>
              <Label htmlFor="po_no">PO Date *</Label>
              <Input
                id="po_date"
                type="date"
                value={formData.po_date}
                onChange={(e) => handleInputChange('po_date', e.target.value)}
                placeholder="Enter PO date"
              />
              <p className="text-xs text-gray-500 mt-1">Required: select the PO date</p>
              {validationErrors.po_date && (
                <p className="text-red-500 text-sm mt-1">{validationErrors.po_date}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            <span className="flex items-center"><Truck className="mr-2 h-5 w-5" />Delivery Information</span>
            <Button
              size="sm"
              variant="outline"
              onClick={onAddDelivery}
              className="gap-2"
              disabled={(formData.deliveries?.length || 0) >= maxDeliveries || maxDeliveries === 0}
            >
              <Plus className="h-4 w-4" /> Add Delivery
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-3 text-xs text-gray-500">
            {(formData.deliveries?.length || 0)} of {maxDeliveries} deliveries used (max 5)
          </div>
          {(() => {
            const duplicateIndices = findDuplicateDeliveries();
            const partialDuplicates = findPartialDuplicates();
            const deliveryCount = formData.deliveries?.length || 0;
            const itemQty = formData.qty || 0;
            const isOverDelivery = deliveryCount > itemQty;

            const hasAnyWarnings = duplicateIndices.length > 0 || partialDuplicates.indices.length > 0 || isOverDelivery;

            if (!hasAnyWarnings) return null;

            return (
              <div className="mb-3 space-y-2">
                {duplicateIndices.length > 0 && (
                  <div className="p-2 bg-red-50 border border-red-200 rounded">
                    <p className="text-red-800 text-sm font-medium">
                      🚨 {duplicateIndices.length} exact duplicate {duplicateIndices.length === 1 ? 'delivery' : 'deliveries'} detected
                    </p>
                    <p className="text-red-600 text-xs">
                      Deliveries with identical DO date, DO number, invoice date, and invoice number.
                    </p>
                  </div>
                )}

                {partialDuplicates.indices.length > 0 && (
                  <div className="p-2 bg-yellow-50 border border-yellow-200 rounded">
                    <p className="text-yellow-800 text-sm font-medium">
                      ⚠️ Potential duplicate entries detected: {partialDuplicates.details.join(', ')}
                    </p>
                    <p className="text-yellow-600 text-xs">
                      Same DO/Invoice/GRN numbers but different dates. Please verify if these are separate deliveries or data entry errors.
                    </p>
                  </div>
                )}

                {isOverDelivery && (
                  <div className="p-2 bg-orange-50 border border-orange-200 rounded">
                    <p className="text-orange-800 text-sm font-medium">
                      📦 Over-delivery detected: {deliveryCount} deliveries for {itemQty} {itemQty === 1 ? 'item' : 'items'}
                    </p>
                    <p className="text-orange-600 text-xs">
                      You have more delivery records than the item quantity. Please verify if this is correct.
                    </p>
                  </div>
                )}
              </div>
            );
          })()}
          <Tabs value={activeDeliveryTab} onValueChange={setActiveDeliveryTab}>
            <TabsList>
              {(() => {
                const duplicateIndices = findDuplicateDeliveries();
                const partialDuplicates = findPartialDuplicates();
                return (formData.deliveries || []).map((_, idx) => {
                  const isExactDuplicate = duplicateIndices.includes(idx);
                  const isPartialDuplicate = partialDuplicates.indices.includes(idx);
                  const isDuplicate = isExactDuplicate || isPartialDuplicate;

                  const tabStyle = isExactDuplicate
                    ? 'bg-red-100 text-red-800 border-2 border-red-400'
                    : isPartialDuplicate
                      ? 'bg-yellow-100 text-yellow-800 border-2 border-yellow-400'
                      : '';

                  const warningIcon = isExactDuplicate ? '🚨' : isPartialDuplicate ? '⚠️' : '';
                  const warningTitle = isExactDuplicate
                    ? 'Exact duplicate delivery detected'
                    : isPartialDuplicate
                      ? 'Potential duplicate delivery detected'
                      : '';

                  return (
                    <div key={`delivery-tab-wrapper-${idx}`} className="flex items-center gap-1">
                      <TabsTrigger
                        value={`delivery-${idx}`}
                        className={tabStyle}
                      >
                        Delivery {idx + 1}
                        {isDuplicate && (
                          <span className="ml-1 text-sm" title={warningTitle}>{warningIcon}</span>
                        )}
                      </TabsTrigger>
                      {isDuplicate && (
                        <Trash2
                          className="h-4 w-4 cursor-pointer text-red-600 hover:text-red-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            const confirmMessage = isExactDuplicate
                              ? `Delete duplicate Delivery ${idx + 1}? This action cannot be undone.`
                              : `Delete potential duplicate Delivery ${idx + 1}? Please verify this is correct. This action cannot be undone.`;
                            setPendingDelete({ index: idx, message: confirmMessage });
                          }}
                          aria-label={`Delete ${isExactDuplicate ? 'duplicate' : 'potential duplicate'} Delivery ${idx + 1}`}
                        />
                      )}
                    </div>
                  );
                });
              })()
              }
            </TabsList>
            {(formData.deliveries || []).map((d, idx) => {
              return (
                <TabsContent key={`delivery-content-${idx}`} value={`delivery-${idx}`}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor={`do_date_${idx}`}>DO Date</Label>
                      <Input
                        id={`do_date_${idx}`}
                        type="date"
                        value={d.do_date}
                        onChange={(e) => updateDeliveryField(idx, 'do_date', e.target.value)}
                      />
                      {deliveryErrors[idx]?.do_date && (
                        <p className="text-red-500 text-xs mt-1">{deliveryErrors[idx]?.do_date}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor={`do_no_${idx}`}>DO Number</Label>
                      <Input
                        id={`do_no_${idx}`}
                        value={d.do_no}
                        onChange={(e) => updateDeliveryField(idx, 'do_no', e.target.value)}
                        placeholder="Enter DO number"
                      />
                      {deliveryErrors[idx]?.do_no && (
                        <p className="text-red-500 text-xs mt-1">{deliveryErrors[idx]?.do_no}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor={`inv_date_${idx}`}>Invoice Date</Label>
                      <Input
                        id={`inv_date_${idx}`}
                        type="date"
                        value={d.inv_date}
                        onChange={(e) => updateDeliveryField(idx, 'inv_date', e.target.value)}
                      />
                      {deliveryErrors[idx]?.inv_date && (
                        <p className="text-red-500 text-xs mt-1">{deliveryErrors[idx]?.inv_date}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor={`inv_no_${idx}`}>Invoice Number</Label>
                      <Input
                        id={`inv_no_${idx}`}
                        value={d.inv_no}
                        onChange={(e) => updateDeliveryField(idx, 'inv_no', e.target.value)}
                        placeholder="Enter invoice number"
                      />
                      {deliveryErrors[idx]?.inv_no && (
                        <p className="text-red-500 text-xs mt-1">{deliveryErrors[idx]?.inv_no}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor={`grn_date_${idx}`}>GRN Date</Label>
                      <Input
                        id={`grn_date_${idx}`}
                        type="date"
                        value={d.grn_date}
                        onChange={(e) => updateDeliveryField(idx, 'grn_date', e.target.value)}
                      />
                      {deliveryErrors[idx]?.grn_date && (
                        <p className="text-red-500 text-xs mt-1">{deliveryErrors[idx]?.grn_date}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor={`grn_no_${idx}`}>GRN Number</Label>
                      <Input
                        id={`grn_no_${idx}`}
                        value={d.grn_no}
                        onChange={(e) => updateDeliveryField(idx, 'grn_no', e.target.value)}
                        placeholder="Enter GRN number"
                      />
                      {deliveryErrors[idx]?.grn_no && (
                        <p className="text-red-500 text-xs mt-1">{deliveryErrors[idx]?.grn_no}</p>
                      )}
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    {((formData.deliveries?.[idx]?.upload_url) && !deliveryFiles[idx]) && (
                      <div className="mb-3 flex items-center justify-between rounded border bg-gray-50 px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded bg-red-100 text-red-600">
                            <FileText className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="text-sm font-medium">Uploaded document</div>
                            <a
                              href={String(formData.deliveries[idx].upload_url)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:underline"
                            >
                              {String(formData.deliveries[idx].upload_url)}
                            </a>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500">PDF</div>
                      </div>
                    )}
                    <Label>Attach PDF (optional)</Label>
                    <div
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => onDeliveryFileDrop(idx, e)}
                      onClick={() => fileInputRefs.current[idx]?.click()}
                      className="mt-2 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-md h-28 cursor-pointer bg-gray-50"
                    >
                      {!deliveryFiles[idx] ? (
                        <div className="text-center text-sm text-gray-600">
                          Drop PDF here or click to select
                          <div className="text-xs text-gray-400">Only .pdf files accepted</div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between w-full px-4">
                          <div className="truncate">{deliveryFiles[idx]?.name}</div>
                          <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); onRemoveDeliveryFile(idx); }}>
                            Remove
                          </Button>
                        </div>
                      )}
                      <input
                        ref={(el) => { fileInputRefs.current[idx] = el; }}
                        type="file"
                        accept="application/pdf"
                        className="hidden"
                        onChange={(e) => onDeliveryFileSelect(idx, e)}
                      />
                    </div>
                  </div>
                  {idx > 0 && (
                    <div className="mt-4 flex justify-end">
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => onRemoveDelivery(idx)}
                      >
                        Remove Delivery
                      </Button>
                    </div>
                  )}
                </TabsContent>
              );
            })}
          </Tabs>
        </CardContent>
      </Card>

      <Separator />

      <div className="flex justify-between items-center">
        <div>
          {sidebarMode === 'edit' && selectedPurchase?.id && canDelete ? (
            <Button
              type="button"
              variant="destructive"
              onClick={() => setDeleteConfirmOpen(true)}
              disabled={loading}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </Button>
          ) : null}
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={closeSidebar}>
            Cancel
          </Button>
          <Button onClick={() => setShowSubmitConfirm(true)} disabled={loading || !isFormComplete}>
            {loading ? 'Saving...' : sidebarMode === 'edit' ? 'Update Purchase' : 'Create Purchase'}
          </Button>
        </div>
      </div>

      <AlertDialog open={showSubmitConfirm} onOpenChange={(open) => { if (!open) setShowSubmitConfirm(false); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{sidebarMode === 'edit' ? 'Confirm Update' : 'Confirm Create'}</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogDescription>
            <div className="text-sm">Are you sure you want to {sidebarMode === 'edit' ? 'update' : 'create'} this purchase record? Please confirm.</div>
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button variant="secondary" size="sm">Cancel</Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button variant="default" size="sm" onClick={async () => { setShowSubmitConfirm(false); await handleSubmit(); }}>Confirm</Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Delete</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogDescription>
            <div className="text-sm">Are you sure you want to delete this purchase record? This action cannot be undone.</div>
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button variant="secondary" size="sm">Cancel</Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button variant="destructive" size="sm" onClick={handleDelete} disabled={loading}>
                Delete
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => { if (!open) setPendingDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Delete</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogDescription>
            <div className="text-sm">{pendingDelete?.message || 'Are you sure you want to delete this delivery?'}</div>
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button variant="secondary" size="sm">Cancel</Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                variant="destructive"
                size="sm"
                onClick={async () => {
                  if (pendingDelete?.index != null) {
                    await deleteDelivery(pendingDelete.index);
                  }
                  setPendingDelete(null);
                }}
              >
                Delete
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PurchaseRegisterForm;
