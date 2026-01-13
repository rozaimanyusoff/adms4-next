"use client";
import React, { useContext, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { authenticatedApi } from '@/config/api';
import { AuthContext } from '@/store/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Loader2, X, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

type TransferItem = {
  id: number;
  transfer_id?: number;
  effective_date?: string | null;
  asset?: {
    id: number;
    register_number?: string;
    type?: { id: number; name: string } | null;
    category?: { id: number; name: string } | null;
    brand?: { id: number; name: string } | null;
    model?: { id: number; name: string } | null;
  } | null;
  current_owner?: { ramco_id: string; full_name: string } | null;
  new_owner?: { ramco_id: string; full_name: string } | null;
  current_costcenter?: { id: number; name: string } | null;
  new_costcenter?: { id: number; name: string } | null;
  current_department?: { id: number; code?: string; name?: string } | null;
  new_department?: { id: number; code?: string; name?: string } | null;
  current_location?: { id: number; name: string } | null;
  new_location?: { id: number; name: string } | null;
  acceptance_date?: string | null;
  acceptance_by?: string | null;
};

type TransferData = {
  id: number;
  transfer_date?: string | null;
  transfer_by?: string | { ramco_id: string; full_name: string };
  transfer_by_user?: { ramco_id: string; full_name: string } | null;
  transfer_status?: string;
  costcenter?: { id: number; name: string } | null;
  department?: { id: number; code?: string } | null;
  total_items?: number;
  items: TransferItem[];
};

function fmtDate(val?: string | null) {
  if (!val) return '-';
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return '-';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function transferByName(d?: TransferData | null) {
  if (!d) return '-';
  if (d.transfer_by_user?.full_name) return d.transfer_by_user.full_name;
  const tb: any = d.transfer_by;
  if (tb && typeof tb === 'object' && tb.full_name) return tb.full_name;
  if (typeof d.transfer_by === 'string' && d.transfer_by) return d.transfer_by;
  return '-';
}

function fmtDateTimeLocal(dt: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  const yyyy = dt.getFullYear();
  const mm = pad(dt.getMonth() + 1);
  const dd = pad(dt.getDate());
  const hh = pad(dt.getHours());
  const mi = pad(dt.getMinutes());
  const ss = pad(dt.getSeconds());
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
}

type AssetTransferPortalProps = {
  transferId: string;
  title?: string;
  mode?: 'approval' | 'acceptance';
};

export default function AssetTransferPortal({ transferId, title, mode = 'approval' }: AssetTransferPortalProps) {
  const auth = useContext(AuthContext);
  // no router navigation required
  const sp = useSearchParams();
  const heading = title || 'Asset Transfer Authorization Portal';
  const token = useMemo(() => (sp?.get('_cred') || '').trim(), [sp]);
  const newOwnerParam = useMemo(() => (sp?.get('new_owner') || '').trim(), [sp]);
  const authHeaders = React.useMemo(() => (token ? { Authorization: `Bearer ${token}` } : undefined), [token]);
  const deptParam = sp?.get('dept') || '';
  const statusParam = sp?.get('status') || '';
  const approvedByParam = (sp?.get('authorize') || '').trim();

  const [loading, setLoading] = useState(true);
  const [dataList, setDataList] = useState<TransferData[] | null>(null);
  // Show login dialog by default when not authenticated and no token provided
  const [loginVisible, setLoginVisible] = useState<boolean>(() => !Boolean(auth?.authData?.user) && !token);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [remarksByItem, setRemarksByItem] = useState<Record<string, string>>({});
  const [effectiveDates, setEffectiveDates] = useState<Record<string, string>>({});
  const [actionLoading, setActionLoading] = useState<{ id: number; kind: 'approve' | 'reject' } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState<'approve' | 'reject' | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    kind: 'approve' | 'reject';
    scope: 'single' | 'bulk';
    targetKey?: string | null;
    count?: number;
  } | null>(null);
  const [statusDialog, setStatusDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
  }>({ open: false, title: '', message: '' });
  const [attachmentsByItem, setAttachmentsByItem] = useState<Record<string, File[]>>({});

  const loggedIn = Boolean(auth?.authData?.user);
  const dataListSafe = Array.isArray(dataList) ? dataList : [];
  const showEmptyState = dataListSafe.length === 0;
  const approveVerb = mode === 'acceptance' ? 'accept' : 'approve';
  const approveLabel = mode === 'acceptance' ? 'Accept' : 'Approve';
  const approvedLabel = mode === 'acceptance' ? 'Accepted' : 'Approved';
  const approveIng = mode === 'acceptance' ? 'Accepting…' : 'Approving…';

  const fetchData = React.useCallback(async () => {
    try {
      setLoading(true);
      if (!loggedIn && !token) {
        setLoginVisible(true);
      }
      if (newOwnerParam) {
        const res = await authenticatedApi.get(
          `/api/assets/transfers/${encodeURIComponent(String(transferId))}/items`,
          { headers: authHeaders, params: { new_owner: newOwnerParam } }
        );
        const items = (((res as any).data?.data) || (res as any).data || []) as TransferItem[];
        const synthetic: TransferData = {
          id: Number(transferId) || (transferId as any),
          items: Array.isArray(items) ? items : [],
        };
        setDataList([synthetic]);
      } else if (deptParam) {
        const res = await authenticatedApi.get('/api/assets/transfers', {
          headers: authHeaders,
          params: { dept: deptParam, status: statusParam || 'pending' },
        });
        const list = ((((res as any).data?.data) || (res as any).data) ?? []) as TransferData[];
        const normalized = Array.isArray(list) ? list.map((t) => ({ ...t, items: Array.isArray(t.items) ? t.items : [] })) : [];
        setDataList(normalized);
      } else {
        const res = await authenticatedApi.get(`/api/assets/transfers/${encodeURIComponent(String(transferId))}` as string, { headers: authHeaders });
        const t = (((res as any).data?.data) || (res as any).data) as TransferData;
        setDataList(t ? [{ ...t, items: Array.isArray(t.items) ? t.items : [] }] : []);
      }
    } catch (e) {
      toast.error('Failed to load transfer details');
      setDataList([]);
    } finally {
      setLoading(false);
    }
  }, [deptParam, loggedIn, statusParam, token, transferId, authHeaders, newOwnerParam]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const makeItemKey = (transferId: number, itemId: number) => `${transferId}:${itemId}`;

  const flatItems = React.useMemo(() => {
    return dataListSafe.flatMap((t) => (t.items || []).map((item) => ({ transfer: t, item })));
  }, [dataListSafe]);

  const itemLookup = React.useMemo(() => {
    const map: Record<string, { transfer: TransferData; item: TransferItem }> = {};
    flatItems.forEach(({ transfer, item }) => {
      const key = makeItemKey(transfer.id, item.id);
      map[key] = { transfer, item };
    });
    return map;
  }, [flatItems]);

  // Keep selections in sync with current items
  React.useEffect(() => {
    if (!flatItems.length) return;
    const present = new Set<string>(flatItems.map(({ transfer, item }) => makeItemKey(transfer.id, item.id)));
    setSelectedIds((prev) => {
      const next = new Set<string>();
      prev.forEach((id) => { if (present.has(id)) next.add(id); });
      return next;
    });
  }, [flatItems]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);
    try {
      const resp: any = await authenticatedApi.post('/api/auth/login', { username: loginUsername, password: loginPassword });
      if (resp?.data?.token) {
        const { token, data: payload } = resp.data;
        auth?.setAuthData({ token, user: payload.user, usergroups: payload.usergroups, navTree: payload.navTree });
        setLoginVisible(false);
        toast.success('Logged in');
        // Refresh details with normal auth header
        await fetchData();
      } else {
        setLoginError('Invalid login response');
      }
    } catch (err: any) {
      setLoginError('Invalid username or password');
    } finally {
      setLoginLoading(false);
    }
  }

  // Initialize Effective Date per item when list loads
  React.useEffect(() => {
    if (!flatItems.length) return;
    const next: Record<string, string> = {};
    try {
      for (const { transfer, item } of flatItems) {
        const d = item?.effective_date ? String(item.effective_date) : '';
        if (d) next[makeItemKey(transfer.id, item.id)] = d.slice(0, 10);
      }
      if (Object.keys(next).length) setEffectiveDates((prev) => ({ ...next, ...prev }));
    } catch {}
  }, [flatItems]);

  const approveReject = async (itemKey: string, kind: 'approve' | 'reject', showStatus = true) => {
    const entry = itemLookup[itemKey];
    if (!entry) return;
    const { transfer } = entry;
    try {
      setActionLoading({ id: transfer.id, kind });
      if (mode === 'acceptance') {
        const remark = remarksByItem[itemKey] || '';
        const files = attachmentsByItem[itemKey] || [];
        await sendAcceptanceRequest(
          transfer.id,
          [entry.item.id],
          kind === 'approve' ? 'accepted' : 'rejected',
          remark,
          files
        );
        toast.success(kind === 'approve' ? 'Transfer accepted' : 'Transfer rejected');
      } else {
        const url = `/api/assets/transfers/approval`;
        const approvedBy = approvedByParam || (auth?.authData as any)?.user?.ramco_id || '';
        const payload = {
          status: kind === 'approve' ? 'approved' : 'rejected',
          approved_by: approvedBy,
          approved_date: fmtDateTimeLocal(new Date()),
          transfer_id: [transfer.id],
        };
        await authenticatedApi.put(url, payload, { headers: authHeaders });
        toast.success(kind === 'approve' ? 'Transfer approved' : 'Transfer rejected');
      }
      await fetchData();
      if (showStatus) {
        setStatusDialog({
          open: true,
          title: kind === 'approve' ? approvedLabel : 'Rejected',
          message: `Transfer ${kind === 'approve' ? approveVerb : 'reject'}ed successfully. You can close this tab now.`,
        });
      }
    } catch (e) {
      toast.error(`Failed to ${kind}`);
    } finally {
      setActionLoading(null);
    }
  };

  const toggleSelected = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id); else next.delete(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const handleAttachmentChange = (itemKey: string, fileList: FileList | null) => {
    if (!fileList) return;
    const files = Array.from(fileList).slice(0, 3);
    setAttachmentsByItem((prev) => ({ ...prev, [itemKey]: files }));
  };

  const removeAttachment = (itemKey: string, index: number) => {
    setAttachmentsByItem((prev) => {
      const current = prev[itemKey] || [];
      const next = [...current.slice(0, index), ...current.slice(index + 1)];
      return { ...prev, [itemKey]: next };
    });
  };

  const sendAcceptanceRequest = async (
    transferId: number | string,
    itemIds: (number | string)[],
    status: 'accepted' | 'rejected',
    remark?: string,
    files?: File[]
  ) => {
    const url = `/api/assets/transfers/${encodeURIComponent(String(transferId))}/acceptance`;
    const acceptanceBy = newOwnerParam || (auth?.authData as any)?.user?.username || '';
    const acceptanceDate = fmtDateTimeLocal(new Date());
    const checklistItems = ''; // checklist values not available in this view
    const hasFiles = Array.isArray(files) && files.length > 0;
    if (hasFiles) {
      const fd = new FormData();
      fd.append('acceptance_by', acceptanceBy);
      fd.append('acceptance_date', acceptanceDate);
      fd.append('acceptance_remarks', remark || '');
      fd.append('checklist-items', checklistItems);
      itemIds.forEach((id) => fd.append('item_ids[]', String(id)));
      files!.forEach((f, idx) => fd.append('acceptance_attachments', f, f.name || `attachment-${idx + 1}`));
      fd.append('status', status);
      await authenticatedApi.put(url, fd, { headers: { ...(authHeaders || {}), 'Content-Type': 'multipart/form-data' } });
      return;
    }
    const payload: any = {
      acceptance_by: acceptanceBy,
      acceptance_date: acceptanceDate,
      acceptance_remarks: remark || '',
      'checklist-items': checklistItems,
      status,
      item_ids: itemIds.map((id) => Number(id) || id),
    };
    await authenticatedApi.put(url, payload, { headers: authHeaders });
  };

  const bulkApproveReject = async (kind: 'approve' | 'reject', showStatus = true) => {
    if (!dataList || selectedIds.size === 0) return;
    try {
      setBulkLoading(kind);
      if (mode === 'acceptance') {
        const items = Array.from(selectedIds)
          .map((key) => ({ key, entry: itemLookup[key] }))
          .filter((x) => !!x.entry);
        if (kind === 'reject') {
          const missingRemarks = items.filter(({ key }) => !(remarksByItem[key] || '').trim());
          if (missingRemarks.length > 0) {
            toast.error('Remarks are required when rejecting.');
            setBulkLoading(null);
            return;
          }
        }
        for (const { key, entry } of items) {
          const transferId = entry!.transfer.id;
          const itemId = entry!.item.id;
          const remark = remarksByItem[key] || '';
          const files = attachmentsByItem[key] || [];
          await sendAcceptanceRequest(transferId, [itemId], kind === 'approve' ? 'accepted' : 'rejected', remark, files);
        }
        toast.success(kind === 'approve' ? 'Selected items accepted' : 'Selected items rejected');
        await fetchData();
        clearSelection();
        if (showStatus) {
          setStatusDialog({
            open: true,
            title: kind === 'approve' ? approvedLabel : 'Rejected',
            message: `Bulk action completed (${selectedIds.size} item${selectedIds.size !== 1 ? 's' : ''}). You can close this tab now.`,
          });
        }
      } else {
        const url = `/api/assets/transfers/approval`;
        const approvedBy = approvedByParam || (auth?.authData as any)?.user?.ramco_id || '';
        const ids = Array.from(selectedIds)
          .map((key) => itemLookup[key]?.transfer?.id)
          .filter((v): v is number => typeof v === 'number');
        const uniqueIds = Array.from(new Set(ids));
        const payload = {
          status: kind === 'approve' ? 'approved' : 'rejected',
          approved_by: approvedBy,
          approved_date: fmtDateTimeLocal(new Date()),
          transfer_id: uniqueIds,
        } as const;
        await authenticatedApi.put(url, payload, { headers: authHeaders });
        toast.success(kind === 'approve' ? 'Selected items approved' : 'Selected items rejected');
        await fetchData();
        clearSelection();
        if (showStatus) {
          setStatusDialog({
            open: true,
            title: kind === 'approve' ? approvedLabel : 'Rejected',
            message: `Bulk action completed (${uniqueIds.length} transfer${uniqueIds.length !== 1 ? 's' : ''}). You can close this tab now.`,
          });
        }
      }
    } catch (e) {
      toast.error(`Failed to ${kind} selected items`);
    } finally {
      setBulkLoading(null);
    }
  };

  const requestConfirm = (kind: 'approve' | 'reject', scope: 'single' | 'bulk', targetKey?: string | null) => {
    if (scope === 'single' && kind === 'reject') {
      const remarks = targetKey ? remarksByItem[targetKey] : '';
      if (!remarks?.trim()) {
        toast.error('Remarks are required when rejecting.');
        return;
      }
    }
    if (scope === 'bulk') {
      if (selectedIds.size === 0) {
        toast.error('No items selected.');
        return;
      }
      if (mode === 'acceptance' && kind === 'reject') {
        const missing = Array.from(selectedIds).filter((key) => !(remarksByItem[key] || '').trim());
        if (missing.length > 0) {
          toast.error('Remarks are required when rejecting.');
          return;
        }
      }
    }
    setConfirmAction({
      kind,
      scope,
      targetKey,
      count: scope === 'bulk' ? selectedIds.size : 1,
    });
  };

  const handleConfirmProceed = async () => {
    if (!confirmAction) return;
    const { kind, scope, targetKey } = confirmAction;
    setConfirmAction(null);
    if (scope === 'single' && targetKey) {
      await approveReject(targetKey, kind, true);
    } else if (scope === 'bulk') {
      await bulkApproveReject(kind, true);
    }
  };

  const closeStatusDialog = () => {
    setStatusDialog({ open: false, title: '', message: '' });
    try { window.close(); } catch (e) {}
  };

  const showBlockingLoader = loading && !statusDialog.open && !confirmAction;

  if (showBlockingLoader) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-sm text-gray-600">
        <Loader2 className="animate-spin w-5 h-5 mr-2" /> Loading transfers...
      </div>
    );
  }

  if (!dataList && !statusDialog.open && !confirmAction) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Transfer Not Found</h3>
          <p className="text-gray-500">The asset transfer could not be found or the link may have expired.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-5xl mx-auto p-2">
          <div className="flex flex-col gap-2 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
            <h1 className="text-lg font-bold text-gray-900">{heading}</h1>
            <div className="flex items-center justify-center gap-2 sm:justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { try { window.close(); } catch (e) {} }}
                title="Close tab"
                className='hover:border hover:border-red-600'
              >
                <X className="w-5 h-5 text-red-600" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-2">
        {showEmptyState ? (
          <div className="min-h-[60vh] flex items-center justify-center">
            <div className="text-center">
              <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Pending Transfers</h3>
              <p className="text-gray-500">There are no pending transfers for the current selection.</p>
            </div>
          </div>
        ) : (
          <>
            {selectedIds.size > 0 && (
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <Button
                  variant="ghost"
                  className='bg-red-600 text-white font-semibold hover:bg-white hover:border hover:border-red-500 hover:text-red-600'
                  onClick={() => requestConfirm('reject', 'bulk')}
                  disabled={Boolean(bulkLoading) || (!loggedIn && !token) || selectedIds.size === 0}
                >
                  {bulkLoading === 'reject' ? (<><Loader2 className="w-4 h-4 animate-spin mr-1" />Rejecting…</>) : `Bulk Rejected (${selectedIds.size})`}
                </Button>
                <Button
                  variant="ghost"
                  className='bg-emerald-600 text-white font-semibold hover:bg-white hover:border hover:border-emerald-600 hover:text-emerald-700'
                  onClick={() => requestConfirm('approve', 'bulk')}
                  disabled={Boolean(bulkLoading) || (!loggedIn && !token) || selectedIds.size === 0}
                >
                  {bulkLoading === 'approve' ? (<><Loader2 className="w-4 h-4 animate-spin mr-1" />{approveIng}</>) : `Bulk ${approvedLabel} (${selectedIds.size})`}
                </Button>
                <Button variant="outline" className='bg-gray-300 font-semibold' onClick={clearSelection} disabled={Boolean(bulkLoading)}>Clear selection</Button>
              </div>
            )}
            {/* Receive & Acceptance — render per item */}
            <div className="mt-4">
              <Accordion type="multiple">
                {flatItems.map(({ transfer, item }) => {
                  const itemKey = makeItemKey(transfer.id, item.id);
                  const effDate = effectiveDates[itemKey] || '';
                  const remarks = remarksByItem[itemKey] || '';
                  const currentLoading = actionLoading && actionLoading.id === transfer.id ? actionLoading.kind : null;
                  const totalItems = transfer.total_items ?? transfer.items?.length ?? 0;
                  const itemIndex = (transfer.items || []).findIndex((it) => it.id === item.id);
                  const itemOrdinal = itemIndex >= 0 ? itemIndex + 1 : '-';
                  return (
                    <AccordionItem key={itemKey} value={`item-${itemKey}`} className="border bg-stone-200/50 rounded-lg mb-3">
                      <AccordionTrigger className="px-4 py-4">
                        <div className="flex w-full flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                          <div className="flex items-center gap-3 text-left min-w-0">
                            <Checkbox
                              checked={selectedIds.has(itemKey)}
                              onCheckedChange={(v) => toggleSelected(itemKey, Boolean(v))}
                              onClick={(e) => e.stopPropagation()}
                              aria-label={`Select transfer item ${item.id}`}
                            />
                            <div className="flex flex-wrap items-center gap-2 text-sm min-w-0">
                              <span className="font-medium truncate">
                                S/N: {item.asset?.register_number || '-'}{' '}
                                <span className="text-blue-600">[ {item.asset?.type?.name || '-'} ]</span>
                              </span>
                              <span className="text-xs text-muted-foreground whitespace-nowrap">Item {itemOrdinal}/{totalItems || '-'}</span>
                            </div>
                          </div>
                          <div className="flex items-center text-sm text-muted-foreground pl-9 sm:pl-0 sm:justify-end sm:flex-none sm:min-w-45">
                            <span className="mr-1">Effective Date:</span>
                            <span className="font-medium text-dark whitespace-nowrap">{effDate ? fmtDate(effDate) : '-'}</span>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-1 pb-4 space-y-3">
                        <div className="grid grid-cols-1 gap-3">
                          <Card className='shadow-none bg-lime-800/20'>
                            <CardHeader><CardTitle className="text-sm">Transfer Overview</CardTitle></CardHeader>
                            <CardContent className="pt-0 space-y-4">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-dark">
                                <div className="flex items-center justify-between sm:justify-start sm:gap-2">
                                  <span>ID:</span>
                                  <span className="font-medium">{transfer.id}</span>
                                </div>
                                <div className="flex items-center justify-between sm:justify-start sm:gap-2">
                                  <span>Items</span>
                                  <span className="font-medium">{itemOrdinal}/{totalItems || '-'}</span>
                                </div>
                                <div className="flex items-center justify-between sm:justify-start sm:gap-2">
                                  <span>Request Date</span>
                                  <span className="font-medium">{fmtDate(transfer.transfer_date)}</span>
                                </div>
                                <div className="flex items-center justify-between sm:justify-start sm:gap-2">
                                  <span>Request By</span>
                                  <span className="font-medium">{transferByName(transfer)}</span>
                                </div>
                              </div>

                              <div className="border rounded-md p-3 bg-stone-200/50 space-y-3">
                                <div className="text-sm font-semibold mb-2">Asset Details</div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                                  <div>Effective Date</div>
                                  <div className="font-medium">{fmtDate(item.effective_date)}</div>
                                  <div>Asset Type</div>
                                  <div className="font-medium">{item.asset?.type?.name || '-'}</div>
                                  <div>Register Number</div>
                                  <div className="font-medium">{item.asset?.register_number || '-'}</div>
                                  <div>Reason</div>
                                  <div className="font-medium">{(item as any).reason || '-'}</div>
                                </div>

                                <div className="pt-2">
                                  <div className="text-sm font-semibold mb-2">Transfer Details</div>
                                  <div className="overflow-hidden rounded-md border border-border">
                                    <div className="grid grid-cols-3 bg-lime-800/20 text-xs uppercase tracking-wide">
                                      <div className="px-3 py-2">Field</div>
                                      <div className="px-3 py-2">Current</div>
                                      <div className="px-3 py-2">New</div>
                                    </div>
                                    <div className="grid grid-cols-3 text-sm border-t">
                                      <div className="px-3 py-1">Owner</div>
                                      <div className="px-3 py-1">{item.current_owner?.full_name || '-'}</div>
                                      <div className="px-3 py-1 font-medium">{item.new_owner?.full_name || '-'}</div>
                                    </div>
                                    <div className="grid grid-cols-3 text-sm border-t">
                                      <div className="px-3 py-1">Cost Center</div>
                                      <div className="px-3 py-1">{item.current_costcenter?.name || '-'}</div>
                                      <div className="px-3 py-1 font-medium">{item.new_costcenter?.name || '-'}</div>
                                    </div>
                                    <div className="grid grid-cols-3 text-sm border-t">
                                      <div className="px-3 py-1">Department</div>
                                      <div className="px-3 py-1">{item.current_department?.name || item.current_department?.code || '-'}</div>
                                      <div className="px-3 py-1 font-medium">{item.new_department?.name || item.new_department?.code || '-'}</div>
                                    </div>
                                    <div className="grid grid-cols-3 text-sm border-t">
                                      <div className="px-3 py-1">Location</div>
                                      <div className="px-3 py-1">{item.current_location?.name || '-'}</div>
                                      <div className="px-3 py-1 font-medium">{item.new_location?.name || '-'}</div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 items-start">
                          <div className="space-y-1">
                            <label className="block text-sm font-medium text-gray-700">Remarks</label>
                            <Textarea
                              rows={3}
                              value={remarks}
                              onChange={(e) => setRemarksByItem((prev) => ({ ...prev, [itemKey]: e.target.value }))}
                              placeholder={mode === 'acceptance' ? 'Optional remarks (required if rejecting)' : 'Optional remarks'}
                              className='bg-stone-100/50'
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">Attachments (max 3)</label>
                            <Input
                              type="file"
                              accept="image/*"
                              multiple
                              capture="environment"
                              onChange={(e) => handleAttachmentChange(itemKey, e.target.files)}
                            />
                            <div className="text-xs text-muted-foreground">Add photos from camera or gallery.</div>
                            {(attachmentsByItem[itemKey] || []).length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                {(attachmentsByItem[itemKey] || []).map((file, idx) => (
                                  <Badge key={`${file.name}-${idx}`} variant="secondary" className="flex items-center gap-2">
                                    <span className="truncate max-w-[120px]">{file.name}</span>
                                    <button
                                      type="button"
                                      className="text-red-600 hover:text-red-700"
                                      onClick={() => removeAttachment(itemKey, idx)}
                                      aria-label="Remove attachment"
                                    >
                                      ×
                                    </button>
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex justify-center gap-3 mt-4">
                          <Button
                            variant="destructive"
                            disabled={Boolean(currentLoading) || Boolean(bulkLoading) || (!loggedIn && !token)}
                            onClick={() => requestConfirm('reject', 'single', itemKey)}
                          >
                        {currentLoading === 'reject' ? (<><Loader2 className="w-4 h-4 animate-spin mr-1" />Rejecting…</>) : 'Rejected'}
                      </Button>
                      <Button disabled={Boolean(currentLoading) || Boolean(bulkLoading) || (!loggedIn && !token)} onClick={() => requestConfirm('approve', 'single', itemKey)}>
                        {currentLoading === 'approve' ? (<><Loader2 className="w-4 h-4 animate-spin mr-1" />{approveIng}</>) : approveLabel}
                      </Button>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </div>
          </>
        )}
      </div>

        {/* Inline login modal */}
        {loginVisible && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white dark:bg-slate-900 rounded-md shadow-xl w-full max-w-sm p-4">
              <div className="text-base font-semibold mb-2">Sign in to continue</div>
              {loginError && <div className="text-xs text-red-600 mb-2">{loginError}</div>}
              <form onSubmit={handleLogin} className="space-y-3">
                <div>
                  <label htmlFor="portal-username" className="block text-sm font-medium text-gray-700">Username or Email</label>
                  <Input id="portal-username" value={loginUsername} onChange={(e) => setLoginUsername(e.target.value)} required autoFocus />
                </div>
                <div>
                  <label htmlFor="portal-password" className="block text-sm font-medium text-gray-700">Password</label>
                  <Input id="portal-password" type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setLoginVisible(false)} disabled={loginLoading}>Cancel</Button>
                  <Button type="submit" disabled={loginLoading}>{loginLoading ? (<><Loader2 className="w-4 h-4 animate-spin mr-1" />Signing in…</>) : 'Sign in'}</Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Confirmation dialog */}
        {confirmAction && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-md shadow-xl max-w-sm w-full p-4 space-y-3">
              <div className="text-lg font-semibold">Confirm {confirmAction.kind === 'approve' ? (mode === 'acceptance' ? 'Acceptance' : 'Approval') : 'Rejection'}</div>
              <p className="text-sm text-gray-600">
                {confirmAction.scope === 'bulk'
                  ? `Are you sure you want to ${confirmAction.kind === 'approve' ? approveVerb : 'reject'} ${confirmAction.count || 0} selected transfer(s)?`
                  : `Are you sure you want to ${confirmAction.kind === 'approve' ? approveVerb : 'reject'} this transfer?`}
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setConfirmAction(null)}>Cancel</Button>
                <Button variant={confirmAction.kind === 'approve' ? 'default' : 'destructive'} onClick={handleConfirmProceed}>
                  Continue
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Status dialog */}
        {statusDialog.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-md shadow-xl max-w-sm w-full p-4 space-y-3 text-center">
              <div className="text-lg font-semibold">{statusDialog.title}</div>
              <p className="text-sm text-gray-600">{statusDialog.message}</p>
              <div className="flex justify-center gap-2">
                <Button variant="outline" onClick={() => setStatusDialog({ open: false, title: '', message: '' })}>Stay Here</Button>
                <Button onClick={closeStatusDialog}>Close Tab</Button>
              </div>
            </div>
          </div>
        )}
      </div>

  );
}
