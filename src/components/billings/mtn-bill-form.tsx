'use client';
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { authenticatedApi } from '@/config/api';
import { toast } from 'sonner';
import { InputDroppable } from '@/components/ui/input-droppable';
import { Textarea } from '@/components/ui/textarea';

type PartCategory = { svcTypeId?: number; svcType: string };

export interface MtnBillFormProps {
  title?: string;
  onClose: () => void;

  // form basics
  selectedRow: any | null;
  formData: { inv_no: string; inv_date: string; svc_odo: string; svc_date: string; inv_remarks: string };
  setFormData: (updater: any) => void;
  isInvoiceValid: boolean;
  isValidatingInvoice: boolean;
  validationMessage: string;
  handleFormSubmit: (e: React.FormEvent) => void | Promise<void>;

  // attachment
  attachmentFile: File | null;
  setAttachmentFile: (f: File | null) => void;

  // parts and helpers
  selectedParts: any[];
  setSelectedParts?: (parts: any[]) => void;
  newlyAddedCustomId: number | null;
  formatCurrency: (amount: string | number) => string;
  removePart: (autopart_id: number) => void;
  updatePartQty: (autopart_id: number, qty: number) => void;
  updatePartUnitPrice: (autopart_id: number, unitPrice: string) => void;
  updatePartName: (autopart_id: number, newName: string) => void;
  addPart: (part: any) => void;
  addCustomPart: () => void;

  // catalogs panel (optional; when omitted, component fetches internally)
  partSearch?: string;
  setPartSearch?: (v: string) => void;
  partCategory?: string | number;
  setPartCategory?: (v: string | number) => void;
  partCategories?: PartCategory[];
  filteredParts?: any[];
  partsLoading?: boolean;
  partsHasMore?: boolean;
  partsPage?: number;
  fetchParts?: (args?: any) => Promise<any>;
  // navigation between invoices
  onPrev?: () => void;
  onNext?: () => void;
  canPrev?: boolean;
  canNext?: boolean;
}

const MtnBillForm: React.FC<MtnBillFormProps> = (props) => {
  const {
    title,
    onClose,
    selectedRow,
    formData,
    setFormData,
    isInvoiceValid,
    isValidatingInvoice,
    validationMessage,
    handleFormSubmit,
    attachmentFile,
    setAttachmentFile,
    selectedParts,
    setSelectedParts,
    newlyAddedCustomId,
    formatCurrency,
    removePart,
    updatePartQty,
    updatePartUnitPrice,
    updatePartName,
    addPart,
    addCustomPart,
    partSearch: partSearchProp,
    setPartSearch: setPartSearchProp,
    partCategory: partCategoryProp,
    setPartCategory: setPartCategoryProp,
    partCategories: partCategoriesProp,
    filteredParts: filteredPartsProp,
    partsLoading: partsLoadingProp,
    partsHasMore: partsHasMoreProp,
    partsPage: partsPageProp,
    fetchParts: fetchPartsProp,
    onPrev,
    onNext,
    canPrev,
    canNext,
  } = props;

  // Local loading state for fetching invoice detail
  const [loadingDetail, setLoadingDetail] = React.useState(false);
  const [detail, setDetail] = React.useState<any | null>(null);

  // Local catalogs state (used when parent doesn't control catalogs)
  const [partSearch, setPartSearch] = React.useState<string>('');
  const [partCategory, setPartCategory] = React.useState<string | number>('all');
  const [partCategories, setPartCategories] = React.useState<PartCategory[]>([]);
  const [catalogs, setCatalogs] = React.useState<any[]>([]);
  const [catalogLoading, setCatalogLoading] = React.useState<boolean>(false);
  const [catalogHasMore, setCatalogHasMore] = React.useState<boolean>(false);
  const [catalogPage, setCatalogPage] = React.useState<number>(1);

  const useInternalCatalogs = true;

  const fetchCatalogs = React.useCallback(async ({ page = 1, per_page = 50, reset = false }: { page?: number; per_page?: number; reset?: boolean } = {}) => {
    if (!useInternalCatalogs) return;
    setCatalogLoading(true);
    try {
      const params: any = { page, per_page };
      if (partSearch && partSearch.trim()) params.q = partSearch.trim();
      if (partCategory !== 'all') params.category = partCategory;
      const res = await authenticatedApi.get('/api/bills/mtn/parts', { params });
      const raw = (res as any)?.data;
      const body = raw && typeof raw === 'object' && 'data' in raw ? (raw as any).data : raw;
      const list: any[] = Array.isArray(body) ? body : [];
      setCatalogs(prev => (reset ? list : [...prev, ...list]));
      setCatalogHasMore(list.length >= per_page);
      setCatalogPage(page);
      // Derive categories from returned parts if none loaded yet
      if (partCategories.length === 0) {
        const cats: PartCategory[] = [];
        const map = new Map<number, string>();
        list.forEach((p: any) => {
          const id = p?.part_category?.svcTypeId ?? p?.part_category?.id;
          const name = p?.part_category?.svcType ?? p?.part_category?.name;
          if (id && name && !map.has(id)) { map.set(id, name); cats.push({ svcTypeId: id, svcType: name }); }
        });
        if (cats.length > 0) setPartCategories(cats);
      }
    } catch (e) {
      console.error('Failed to load service catalogs', e);
      toast.error('Failed to load service catalogs');
    } finally {
      setCatalogLoading(false);
    }
  }, [useInternalCatalogs, partSearch, partCategory, partCategories.length]);

  // Initial catalogs load
  React.useEffect(() => {
    fetchCatalogs({ page: 1, per_page: 50, reset: true });
  }, [fetchCatalogs]);

  // Remote-query when search/category changes
  React.useEffect(() => {
    fetchCatalogs({ page: 1, per_page: 50, reset: true });
  }, [partSearch, partCategory]);

  // Fetch invoice detail here using selectedRow.inv_id
  React.useEffect(() => {
    const invId = selectedRow?.inv_id;
    if (!invId) return;
    let cancelled = false;
    const load = async () => {
      try {
        setLoadingDetail(true);
        // reset file and parts for clean transitions when navigating
        try { setAttachmentFile(null); } catch {}
        try { setSelectedParts && setSelectedParts([]); } catch {}
        const res = await authenticatedApi.get(`/api/bills/mtn/${invId}`);
        const raw = (res as any)?.data;
        const body = raw && typeof raw === 'object' && 'data' in raw ? (raw as any).data : raw;
        const detail: any = Array.isArray(body) ? (body[0] || {}) : (body || {});

        const invDate = detail.inv_date ? new Date(detail.inv_date).toISOString().split('T')[0] : (formData.inv_date || '');
        const svcDate = detail.svc_date ? new Date(detail.svc_date).toISOString().split('T')[0] : (formData.svc_date || '');
        if (!cancelled) {
          setDetail(detail);
          setFormData((prev: any) => ({
            ...prev,
            inv_no: String(detail.inv_no ?? selectedRow?.inv_no ?? ''),
            inv_date: invDate,
            svc_odo: String(detail.svc_odo ?? selectedRow?.svc_odo ?? ''),
            svc_date: svcDate,
            inv_remarks: String(detail.inv_remarks ?? selectedRow?.inv_remarks ?? ''),
          }));

          // Map parts
          if (Array.isArray(detail.parts)) {
            const parts = detail.parts.map((p: any, idx: number) => ({
              autopart_id: p.autopart_id ?? p.id ?? idx + 1,
              part_name: p.part_name ?? p.name ?? '',
              qty: p.qty ?? p.quantity ?? 1,
              part_uprice: String(p.part_uprice ?? p.unit_price ?? p.price ?? '0.00'),
              part_category: p.part_category ?? undefined,
            }));
            if (setSelectedParts) setSelectedParts(parts);
            else {
              // Fallback: add parts one-by-one
              parts.forEach(addPart);
            }
          }
        }
      } catch (e) {
        console.error('Failed to load maintenance invoice detail', e);
        toast.error('Failed to load maintenance invoice detail');
      } finally {
        if (!cancelled) setLoadingDetail(false);
      }
    };
    load();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRow?.inv_id]);

  const formatReqDateTime = (iso?: string | null) => {
    if (!iso) return 'N/A';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return 'N/A';
    // d/m/yyyy H:i a
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12;
    if (hours === 0) hours = 12;
    return `${dd}/${mm}/${yyyy} ${hours}:${minutes} ${ampm}`;
  };

  // Effective catalogs values (prefer internal; else props)
  const displayParts = catalogs;
  const loadingParts = catalogLoading;
  const hasMoreParts = catalogHasMore;
  const currentPageParts = catalogPage;
  const handleLoadMore = async () => {
    await fetchCatalogs({ page: currentPageParts + 1, per_page: 50, reset: false });
  };

  return (
    <div className="border rounded-lg bg-white dark:bg-gray-900">
      <div className="flex items-center justify-between px-4 py-3 border-b dark:border-gray-700">
        <h4 className="text-base font-semibold text-gray-900 dark:text-gray-100">
          {title || `Maintenance (Edit) ${selectedRow?.inv_no ? `- ${selectedRow.inv_no}` : ''}`}
        </h4>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onPrev} disabled={!canPrev} aria-label="Previous invoice">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={onNext} disabled={!canNext} aria-label="Next invoice">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="p-4">
        {loadingDetail && (
          <div className="mb-3 text-sm text-gray-500 dark:text-gray-400">
            <Loader2 className="inline-block h-4 w-4 animate-spin mr-2" /> Loading invoice details...
          </div>
        )}
        {/* Request/Invoice Meta Info */}
        <div className="mb-4 border rounded-md p-3 bg-gray-50 dark:bg-gray-800/40">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
            <div>
              <div className="text-gray-500 dark:text-gray-400">Invoice ID</div>
              <div className="font-medium">{detail?.inv_id ?? selectedRow?.inv_id ?? 'N/A'}</div>
            </div>
            <div>
              <div className="text-gray-500 dark:text-gray-400">Service Order</div>
              <div className="font-medium">{detail?.svc_order ?? selectedRow?.svc_order ?? 'N/A'}</div>
            </div>
            <div>
              <div className="text-gray-500 dark:text-gray-400">Request ID</div>
              <div className="font-medium">{detail?.svc_order_details?.req_id ?? 'N/A'}</div>
            </div>
            <div>
              <div className="text-gray-500 dark:text-gray-400">Request Date</div>
              <div className="font-medium">{formatReqDateTime(detail?.svc_order_details?.approval_date)}</div>
            </div>
            <div>
              <div className="text-gray-500 dark:text-gray-400">Asset</div>
              <div className="font-medium">{detail?.asset?.register_number ?? selectedRow?.asset?.register_number ?? 'N/A'}</div>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Workshop</label>
                <div className="mt-1 text-sm font-medium text-gray-900 dark:text-gray-100">{selectedRow?.workshop?.name || 'N/A'}</div>
              </div>
            <div>
              <div className="text-gray-500 dark:text-gray-400">Form Upload</div>
              <div className="font-medium">
                {detail?.svc_order_details?.form_upload ? (
                  <a href={detail.svc_order_details.form_upload} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2">
                    {/* Thumbnail preview if image */}
                    {/(\.png|\.jpg|\.jpeg|\.gif|\.webp)$/i.test(detail.svc_order_details.form_upload) ? (
                      <img src={detail.svc_order_details.form_upload} alt="Form Upload" className="h-12 w-12 object-cover rounded border" />
                    ) : (
                      <span className="inline-block px-2 py-1 border rounded text-xs bg-white dark:bg-gray-900">View</span>
                    )}
                  </a>
                ) : (
                  <span className="text-gray-400">N/A</span>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-12 gap-4">
          {/* Left column: form */}
          <div className="col-span-12 lg:col-span-8">
            <form className="space-y-4" onSubmit={handleFormSubmit}>

              {/* Row 1: Invoice No & Invoice Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                    Invoice No
                    {selectedRow?.inv_stat === '1' && (
                      <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Already Invoiced
                      </span>
                    )}
                  </label>
                  <div className="relative">
                    <Input
                      type="text"
                      value={formData.inv_no}
                      onChange={(e) => setFormData((prev: any) => ({ ...prev, inv_no: e.target.value }))}
                      className={`pr-10 ${
                        selectedRow?.inv_stat === '1' ? 'bg-gray-50' :
                        formData.inv_no.trim() === '' ? '' :
                        isInvoiceValid ? 'border-green-500 focus:border-green-500' : 'border-red-500 focus:border-red-500'
                      }`}
                      placeholder="Enter invoice number"
                      disabled={selectedRow?.inv_stat === '1'}
                    />
                    {selectedRow?.inv_stat !== '1' && isValidatingInvoice && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                      </div>
                    )}
                    {selectedRow?.inv_stat !== '1' && !isValidatingInvoice && formData.inv_no.trim() !== '' && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        {isInvoiceValid ? (
                          <span className="text-green-500">✓</span>
                        ) : (
                          <span className="text-red-500">✗</span>
                        )}
                      </div>
                    )}
                  </div>
                  {selectedRow?.inv_stat !== '1' && validationMessage && (
                    <p className={`mt-1 text-xs ${isInvoiceValid ? 'text-green-600' : 'text-red-600'}`}>
                      {validationMessage}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Invoice Date</label>
                  <Input type="date" value={formData.inv_date} onChange={(e) => setFormData((p: any) => ({ ...p, inv_date: e.target.value }))} />
                </div>
              </div>

              {/* Row 2: Service Date & Service ODO */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Service Date</label>
                  <Input type="date" value={formData.svc_date} onChange={(e) => setFormData((p: any) => ({ ...p, svc_date: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Service ODO</label>
                  <Input type="text" value={formData.svc_odo} onChange={(e) => setFormData((p: any) => ({ ...p, svc_odo: e.target.value }))} />
                </div>
              </div>

              {/* Row 3: Remarks (textarea) & Upload Invoice */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Remarks</label>
                  <Textarea value={formData.inv_remarks} onChange={(e) => setFormData((p: any) => ({ ...p, inv_remarks: e.target.value }))} placeholder="Additional notes or remarks" rows={4} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Upload Invoice</label>
                  {selectedRow?.upload_url && (
                    <div className="mb-2">
                      <a href={selectedRow.upload_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100">
                        📄 View Current Attachment
                      </a>
                    </div>
                  )}
                  <InputDroppable
                    accept="application/pdf,image/*"
                    onFileDrop={(file) => setAttachmentFile(file)}
                    onChange={(e: any) => setAttachmentFile(e.target.files && e.target.files[0] ? e.target.files[0] : null)}
                    disabled={false}
                  />
                  {attachmentFile && (
                    <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">Selected: {attachmentFile.name}</div>
                  )}
                </div>
              </div>

              {/* Selected Parts Table */}
              <div className="border rounded-md">
                <div className="flex items-center justify-between p-2">
                  <h5 className="text-sm font-semibold">Service Items</h5>
                  <Button type="button" variant="ghost" size="sm" onClick={addCustomPart} className="text-emerald-600">
                    <Plus className="h-4 w-4 mr-1" /> Add Custom Item
                  </Button>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-800">
                        <th className="px-2 py-2 text-left">Name</th>
                        <th className="px-2 py-2 text-center">Qty</th>
                        <th className="px-2 py-2 text-center">Unit Price</th>
                        <th className="px-2 py-2 text-right">Amount</th>
                        <th className="px-2 py-2 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedParts.map((p) => {
                        const unitPrice = parseFloat(p.part_uprice || '0');
                        const qty = p.qty || 1;
                        const amount = unitPrice * qty;
                        const highlight = p.autopart_id === newlyAddedCustomId ? 'bg-yellow-50' : '';
                        return (
                          <tr key={p.autopart_id} className={highlight}>
                            <td className="px-2 py-2">
                              <Input value={p.part_name || ''} onChange={(e) => updatePartName(p.autopart_id, e.target.value)} className="h-7 text-xs" />
                            </td>
                            <td className="px-2 py-2 text-center">
                              <Input type="number" min={1} value={qty} onChange={(e) => updatePartQty(p.autopart_id, Number(e.target.value) || 1)} className="w-16 h-7 text-center text-xs" />
                            </td>
                            <td className="px-2 py-2 text-center">
                              <Input type="number" step="0.01" value={unitPrice} onChange={(e) => updatePartUnitPrice(p.autopart_id, e.target.value)} className="w-24 h-7 text-right text-xs" />
                            </td>
                            <td className="px-2 py-2 text-right">
                              <span className="text-xs font-medium">{formatCurrency(amount)}</span>
                            </td>
                            <td className="px-2 py-2 text-center">
                              <Button type="button" variant="ghost" size="sm" onClick={() => removePart(p.autopart_id)} className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50">
                                <X size={12} />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                      {/* Total Row */}
                      <tr className="bg-gray-50 dark:bg-gray-800 border-t">
                        <td colSpan={3} className="px-2 py-2 text-xs font-semibold text-right">Total Amount:</td>
                        <td className="px-2 py-2 text-right text-xs font-bold text-green-600 dark:text-green-400">
                          {formatCurrency(selectedParts.reduce((total, p) => {
                            const unitPrice = parseFloat(p.part_uprice || '0');
                            const qty = p.qty || 1;
                            return total + (unitPrice * qty);
                          }, 0))}
                        </td>
                        <td />
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <Button type="button" variant="outline" onClick={onClose}>Back</Button>
                <Button type="submit">Save Changes</Button>
              </div>
            </form>
          </div>

          {/* Right column: parts list */}
          <div className="col-span-12 lg:col-span-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-md font-semibold">Service Catalogs</h4>
            </div>
            <div className="flex gap-2">
              {/* Search input for filtering parts */}
              <Input placeholder="Search service catalogs..." value={partSearch} onChange={(e: any) => setPartSearch(e.target.value)} />
              <Select value={String(partCategory)} onValueChange={(val) => setPartCategory(val === 'all' ? 'all' : Number(val))}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={'all'}>All Categories</SelectItem>
                  {partCategories.map(cat => (
                    <SelectItem key={cat.svcTypeId} value={String(cat.svcTypeId)}>{cat.svcType}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="mt-3 space-y-2 max-h-[700px] overflow-y-auto">
              {displayParts.length === 0 ? (
                <div className="text-sm text-gray-500">No parts available</div>
              ) : (
                displayParts.map(part => (
                  <div key={part.autopart_id} className="flex items-center justify-between border border-emerald-500 rounded p-2">
                    <div>
                      <div className="font-xs uppercase">{part.part_name}</div>
                      <div className="text-xs text-blue-600">Category: {part.part_category?.svcType || 'N/A'}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => addPart(part)} className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50">
                        <Plus size={14} />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Load more button for paginated browsing */}
            <div className="mt-3 text-center">
              {loadingParts ? (
                <div className="text-sm text-gray-500"><Loader2 className="inline-block h-4 w-4 animate-spin mr-1" /> Loading...</div>
              ) : hasMoreParts ? (
                <Button variant="outline" size="sm" onClick={handleLoadMore}>
                  Load more
                </Button>
              ) : (
                <div className="text-xs text-gray-500">No more parts</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MtnBillForm;
