"use client";
import React, { useContext, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { authenticatedApi } from '@/config/api';
import { AuthContext } from '@/store/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
// Removed unused Label/Badge
import { Loader2, X, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

type TransferItem = {
  id: number;
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

export default function AssetTransferPortal({ transferId }: { transferId: string }) {
  const auth = useContext(AuthContext);
  // no router navigation required
  const sp = useSearchParams();
  const token = useMemo(() => (sp?.get('_cred') || '').trim(), [sp]);
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
  const [remarksMap, setRemarksMap] = useState<Record<number, string>>({});
  const [effectiveDates, setEffectiveDates] = useState<Record<number, string>>({});
  const [actionLoading, setActionLoading] = useState<{ id: number; kind: 'approve' | 'reject' } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkLoading, setBulkLoading] = useState<'approve' | 'reject' | null>(null);

  const loggedIn = Boolean(auth?.authData?.user);

  const fetchData = React.useCallback(async () => {
    try {
      setLoading(true);
      if (!loggedIn && !token) {
        setLoginVisible(true);
      }
      if (deptParam) {
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
  }, [deptParam, loggedIn, statusParam, token, transferId, authHeaders]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Keep selections in sync with current list
  React.useEffect(() => {
    if (!dataList) return;
    const present = new Set<number>(dataList.map((d) => d.id));
    setSelectedIds((prev) => {
      const next = new Set<number>();
      prev.forEach((id) => { if (present.has(id)) next.add(id); });
      return next;
    });
  }, [dataList]);

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

  // Initialize Effective Date per transfer when list loads
  React.useEffect(() => {
    if (!dataList) return;
    const next: Record<number, string> = {};
    try {
      for (const t of dataList) {
        const d = (t?.items && t.items[0]?.effective_date) ? String(t.items[0].effective_date) : '';
        if (d) next[t.id] = d.slice(0, 10);
      }
      if (Object.keys(next).length) setEffectiveDates((prev) => ({ ...next, ...prev }));
    } catch {}
  }, [dataList]);

  const approveReject = async (transfer: TransferData, kind: 'approve' | 'reject') => {
    if (!transfer) return;
    try {
      setActionLoading({ id: transfer.id, kind });
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
      await fetchData();
    } catch (e) {
      toast.error(`Failed to ${kind}`);
    } finally {
      setActionLoading(null);
    }
  };

  const toggleSelected = (id: number, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id); else next.delete(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const bulkApproveReject = async (kind: 'approve' | 'reject') => {
    if (!dataList || selectedIds.size === 0) return;
    try {
      setBulkLoading(kind);
      const url = `/api/assets/transfers/approval`;
      const approvedBy = approvedByParam || (auth?.authData as any)?.user?.ramco_id || '';
      const ids = Array.from(selectedIds);
      const payload = {
        status: kind === 'approve' ? 'approved' : 'rejected',
        approved_by: approvedBy,
        approved_date: fmtDateTimeLocal(new Date()),
        transfer_id: ids,
      } as const;
      await authenticatedApi.put(url, payload, { headers: authHeaders });
      toast.success(kind === 'approve' ? 'Selected transfers approved' : 'Selected transfers rejected');
      await fetchData();
      clearSelection();
    } catch (e) {
      toast.error(`Failed to ${kind} selected transfers`);
    } finally {
      setBulkLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-sm text-gray-600">
        <Loader2 className="animate-spin w-5 h-5 mr-2" /> Loading transfers...
      </div>
    );
  }

  if (!dataList) {
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

  if (Array.isArray(dataList) && dataList.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Pending Transfers</h3>
          <p className="text-gray-500">There are no pending transfers for the current selection.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-5xl mx-auto p-2">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold text-gray-900">Asset Transfer Authorization Portal</h1>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => { try { window.close(); } catch (e) {} }}
                title="Close tab"
              >
                <X className="w-4 h-4 mr-1" /> Close
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-2">
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2 mb-2">
            <Button size="sm" variant="destructive" onClick={() => bulkApproveReject('reject')} disabled={Boolean(bulkLoading) || (!loggedIn && !token)}>
              {bulkLoading === 'reject' ? (<><Loader2 className="w-4 h-4 animate-spin mr-1" />Rejecting…</>) : `Bulk Reject (${selectedIds.size})`}
            </Button>
            <Button size="sm" onClick={() => bulkApproveReject('approve')} disabled={Boolean(bulkLoading) || (!loggedIn && !token)}>
              {bulkLoading === 'approve' ? (<><Loader2 className="w-4 h-4 animate-spin mr-1" />Approving…</>) : `Bulk Approve (${selectedIds.size})`}
            </Button>
            <Button size="sm" variant="outline" onClick={clearSelection} disabled={Boolean(bulkLoading)}>Clear</Button>
          </div>
        )}
        {/* Receive & Acceptance — multiple accordions when list mode */}
        <div className="mt-4">
          <Accordion type="multiple">
            {(dataList || []).map((data) => {
              const it = (data.items || [])[0];
              const reasonStr = it ? ((it as any).reason || '-') : '-';
              const effDate = effectiveDates[data.id] || '';
              const remarks = remarksMap[data.id] || '';
              const currentLoading = actionLoading && actionLoading.id === data.id ? actionLoading.kind : null;
              return (
                <AccordionItem key={data.id} value={`transfer-${data.id}`} className="border rounded-lg mb-2">
                  <AccordionTrigger className="px-4 py-2">
                    <div className="flex w-full items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={selectedIds.has(data.id)}
                          onCheckedChange={(v) => toggleSelected(data.id, Boolean(v))}
                          onClick={(e) => e.stopPropagation()}
                          aria-label={`Select transfer ${data.id}`}
                        />
                        <span className="text-xs text-muted-foreground">Asset</span>
                        <span className="text-sm">
                          S/N: {it?.asset?.register_number || '-'}{' '}
                          <span className="text-blue-600">[ {it?.asset?.type?.name || '-'} ]</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-sm">Effective Date <span className="text-red-500">*</span></label>
                        <Input
                          type="date"
                          value={effDate}
                          onChange={(e) => setEffectiveDates((prev) => ({ ...prev, [data.id]: e.target.value }))}
                          className="h-8 w-[170px]"
                        />
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4 space-y-3">
                    {it ? (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <Card className='shadow-none bg-stone-50'>
                            <CardHeader className="py-3"><CardTitle className="text-sm">Transfer Overview</CardTitle></CardHeader>
                            <CardContent className="pt-0">
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                <div className="text-muted-foreground">Transfer ID</div>
                                <div className="font-medium">{data.id}</div>
                                <div className="text-muted-foreground">Item ID</div>
                                <div className="font-medium">{it.id}</div>
                                <div className="text-muted-foreground">Effective Date</div>
                                <div className="font-medium">{fmtDate(it.effective_date)}</div>
                                <div className="text-muted-foreground">Transfer By</div>
                                <div className="font-medium">{transferByName(data)}</div>
                              </div>
                            </CardContent>
                          </Card>
                          <Card className='shadow-none bg-stone-50'>
                            <CardHeader className="py-3"><CardTitle className="text-sm">Asset</CardTitle></CardHeader>
                            <CardContent className="pt-0">
                              <div className="grid grid-cols-3 gap-2 text-sm">
                                <div className="text-muted-foreground col-span-2">Register Number</div>
                                <div className="font-medium">{it.asset?.register_number || '-'}</div>
                                <div className="text-muted-foreground col-span-2">Type</div>
                                <div className="font-medium">{it.asset?.type?.name || '-'}</div>
                                <div className="text-muted-foreground col-span-2">Asset ID</div>
                                <div className="font-medium">{it.asset?.id ?? '-'}</div>
                              </div>
                            </CardContent>
                          </Card>
                        </div>

                        <div className="pt-1 text-sm font-semibold">Ownership & Assignment</div>
                        <div className="overflow-hidden rounded-md border border-border">
                          <div className="grid grid-cols-3 bg-muted text-xs uppercase tracking-wide text-muted-foreground">
                            <div className="px-3 py-2">Field</div>
                            <div className="px-3 py-2">Current</div>
                            <div className="px-3 py-2">New</div>
                          </div>
                          <div className="grid grid-cols-3 border-t text-sm">
                            <div className="px-3 py-2 text-muted-foreground">Owner</div>
                            <div className="px-3 py-2">{it.current_owner?.full_name || '-'}</div>
                            <div className="px-3 py-2 font-medium">{it.new_owner?.full_name || '-'}</div>
                          </div>
                          <div className="grid grid-cols-3 border-t text-sm">
                            <div className="px-3 py-2 text-muted-foreground">Cost Center</div>
                            <div className="px-3 py-2">{it.current_costcenter?.name || '-'}</div>
                            <div className="px-3 py-2 font-medium">{it.new_costcenter?.name || '-'}</div>
                          </div>
                          <div className="grid grid-cols-3 border-t text-sm">
                            <div className="px-3 py-2 text-muted-foreground">Department</div>
                            <div className="px-3 py-2">{it.current_department?.code || it.current_department?.name || '-'}</div>
                            <div className="px-3 py-2 font-medium">{it.new_department?.code || it.new_department?.name || '-'}</div>
                          </div>
                          <div className="grid grid-cols-3 border-t text-sm">
                            <div className="px-3 py-2 text-muted-foreground">Location</div>
                            <div className="px-3 py-2">{it.current_location?.name || '-'}</div>
                            <div className="px-3 py-2 font-medium">{it.new_location?.name || '-'}</div>
                          </div>
                          <div className="grid grid-cols-3 border-t text-sm">
                            <div className="px-3 py-2 text-muted-foreground">Reason</div>
                            <div className="px-3 py-2 col-span-2">{reasonStr}</div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Remarks</label>
                            <Input
                              value={remarks}
                              onChange={(e) => setRemarksMap((prev) => ({ ...prev, [data.id]: e.target.value }))}
                              placeholder="Optional remarks"
                            />
                          </div>
                        </div>

                        <div className="flex justify-center gap-3 mt-4">
                          <Button size="sm" variant="destructive" disabled={Boolean(currentLoading) || Boolean(bulkLoading) || (!loggedIn && !token)} onClick={() => approveReject(data, 'reject')}>
                            {currentLoading === 'reject' ? (<><Loader2 className="w-4 h-4 animate-spin mr-1" />Rejecting…</>) : 'Reject'}
                          </Button>
                          <Button size="sm" disabled={Boolean(currentLoading) || Boolean(bulkLoading) || (!loggedIn && !token)} onClick={() => approveReject(data, 'approve')}>
                            {currentLoading === 'approve' ? (<><Loader2 className="w-4 h-4 animate-spin mr-1" />Approving…</>) : 'Approve'}
                          </Button>
                        </div>
                      </>
                    ) : (
                      <div className="text-sm text-muted-foreground">No items to display.</div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
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
      </div>
    </div>
  );
}
