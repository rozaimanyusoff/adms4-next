"use client";
import React from 'react';
import { authenticatedApi } from '@/config/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { AuthContext } from '@/store/AuthContext';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';

type ReceiveItem = {
  id: number | string;
  transfer_id?: number | string;
  transfer_by?: { ramco_id?: string; name?: string; full_name?: string };
  effective_date?: string;
  asset?: { id?: number | string; register_number?: string };
  type?: { id?: number | string; name?: string };
  current_owner?: { ramco_id?: string; name?: string; full_name?: string } | null;
  current_costcenter?: { id?: number; name?: string } | null;
  current_department?: { id?: number; name?: string } | null;
  current_location?: { id?: number; name?: string } | null;
  new_owner?: { ramco_id?: string; name?: string; full_name?: string } | null;
  new_costcenter?: { id?: number; name?: string } | null;
  new_department?: { id?: number; name?: string } | null;
  new_location?: { id?: number; name?: string } | null;
  reason?: string;
  remarks?: string | null;
  attachment?: any;
  // Acceptance (may be provided by API)
  acceptance_date?: string | null;
  acceptance_by?: string | null;
  acceptance_checklist_items?: Array<{ id: number; type_id: number; item: string }> | null;
  acceptance_attachments?: string | null;
  acceptance_remarks?: string | null;

  // Approval fields (may be provided by API)
  approved_by?: string | null;
  approved_date?: string | null;

  created_at?: string;
  updated_at?: string;
};

interface Props {
  item?: ReceiveItem | null;
  itemId?: number | string;
  transferId?: number | string;
  onClose?: () => void;
  onAccepted?: () => void;
  onDirtyChange?: (dirty: boolean) => void;
  onPrev?: () => void;
  onNext?: () => void;
  prevDisabled?: boolean;
  nextDisabled?: boolean;
}

const label = (v?: string | null) => (v && String(v).trim().length > 0 ? v : '-');

const AssetTransferReceiveForm: React.FC<Props> = ({ item: itemProp, itemId, transferId, onClose, onAccepted, onDirtyChange, onPrev, onNext, prevDisabled, nextDisabled }) => {
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);
  const [item, setItem] = React.useState<ReceiveItem | null>(itemProp ?? null);
  const [checklist, setChecklist] = React.useState<Array<{ id: number; item: string; is_required: boolean }>>([]);
  const [checkState, setCheckState] = React.useState<Record<number, { done: boolean; remarks?: string }>>({});
  const [attachment, setAttachment] = React.useState<File | null>(null);
  const [successDialogOpen, setSuccessDialogOpen] = React.useState(false);

  const auth = React.useContext(AuthContext);

  // Keep internal item state in sync with prop changes (e.g. parent refresh after API fetch)
  React.useEffect(() => {
    if (itemProp) {
      setItem(itemProp);
    }
  }, [itemProp]);

  // Optional fetch if itemId and transferId are provided and item not passed
  React.useEffect(() => {
    if (itemProp) return; // already have data
    if (!itemId || !transferId) return;
    setLoading(true);
    authenticatedApi
      .get(`/api/assets/transfers/${encodeURIComponent(String(transferId))}/items/${encodeURIComponent(String(itemId))}`)
      .then((res: any) => setItem(res?.data?.data ?? res?.data ?? null))
      .catch(() => setError('Failed to load transfer item'))
      .then(() => setLoading(false));
  }, [itemId, transferId, itemProp]);

  React.useEffect(() => {
    const anyChecklistDirty = Object.values(checkState).some(cs => cs.done || (cs.remarks ?? '').trim().length > 0);
    onDirtyChange?.(anyChecklistDirty);
  }, [checkState, onDirtyChange]);

  // Fetch transfer checklist for the asset type
  React.useEffect(() => {
    const typeId = (item as any)?.type?.id;
    if (!typeId) return;
    authenticatedApi
      .get(`/api/assets/transfer-checklist?type=${encodeURIComponent(String(typeId))}`)
      .then((res: any) => {
        const arr = Array.isArray(res?.data) ? res?.data : (res?.data?.data || []);
        const mapped = arr.map((r: any) => ({
          id: Number(r.id),
          item: r.item,
          is_required: r.is_required === 1 || r.is_required === true,
        }));
        setChecklist(mapped);
        // Initialize check state for new checklist
        setCheckState(prev => {
          const next: Record<number, { done: boolean; remarks?: string }> = { ...prev };
          mapped.forEach((m: any) => {
            if (!next[m.id]) next[m.id] = { done: false };
          });
          return next;
        });
      })
      .catch(() => {
        // non-fatal; show empty list
      });
  }, [item]);

  // When item has acceptance_checklist_items, pre-check those items
  React.useEffect(() => {
    const ac = item?.acceptance_checklist_items;
    if (!ac) return;
    const arr = Array.isArray(ac) ? ac : [];
    if (arr.length === 0) return;
    const acceptedIds = new Set(arr.map(ci => Number((ci as any)?.id)));
    setCheckState(prev => {
      const next: typeof prev = { ...prev };
      checklist.forEach(c => {
        const id = Number(c.id);
        const accepted = acceptedIds.has(id);
        if (!next[id]) next[id] = { done: false };
        if (accepted) next[id] = { ...next[id], done: true };
      });
      return next;
    });
  }, [item?.acceptance_checklist_items, checklist]);

  const transferByName = item?.transfer_by?.full_name || item?.transfer_by?.name || item?.transfer_by?.ramco_id || '-';
  const currOwner = item?.current_owner?.full_name || item?.current_owner?.name || item?.current_owner?.ramco_id || '-';
  const newOwner = item?.new_owner?.full_name || item?.new_owner?.name || item?.new_owner?.ramco_id || '-';
  const allRequiredComplete = React.useMemo(() => {
    return checklist.every(c => !c.is_required || !!checkState[c.id]?.done);
  }, [checklist, checkState]);
  const isAccepted = Boolean(item?.acceptance_date);
  const awaitingApproval = Boolean(item) && !item?.approved_by && !item?.approved_date;
  const isReadOnly = awaitingApproval || isAccepted;
  const acceptanceByFullName = item?.new_owner?.full_name || item?.new_owner?.name || item?.acceptance_by || '';
  const existingAttachmentNames = React.useMemo(() => {
    const aa: any = (item as any)?.acceptance_attachments;
    if (!aa) return [] as string[];
    if (Array.isArray(aa)) return aa.map((x: any) => String(x)).filter(Boolean);
    if (typeof aa === 'string') {
      return aa
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }
    return [] as string[];
  }, [item?.acceptance_attachments]);

  const formatDateTime = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    const yyyy = d.getFullYear();
    const mm = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const mi = pad(d.getMinutes());
    const ss = pad(d.getSeconds());
    return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
  };

  const handleAcknowledge = async () => {
    // Validate required checklist items
    const missing = checklist.filter(c => c.is_required && !checkState[c.id]?.done);
    if (missing.length > 0) {
      toast.error('Please complete all required checklist items before acknowledging.');
      return;
    }
    const checkedIds = checklist
      .filter(c => !!checkState[c.id]?.done)
      .map(c => String(c.id));

    const acceptanceBy = auth?.authData?.user?.username || '';
    const acceptanceDate = formatDateTime(new Date());

    try {
      setLoading(true);
      const transferIdValue = transferId ?? (item as any)?.transfer_id ?? (item as any)?.id;

      // Build payload to match expected API contract
      const jsonPayload: any = {
        'checklist-items': checkedIds.join(','),
        acceptance_by: acceptanceBy,
        acceptance_date: acceptanceDate,
      };

      // If there is an attachment, use multipart/form-data
      if (attachment) {
        const form = new FormData();
        Object.entries(jsonPayload).forEach(([k, v]) => form.append(k, String(v ?? '')));
        form.append('acceptance_attachments', attachment);
        await authenticatedApi.put(`/api/assets/transfers/${encodeURIComponent(String(transferIdValue))}/acceptance`, form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        await authenticatedApi.put(`/api/assets/transfers/${encodeURIComponent(String(transferIdValue))}/acceptance`, jsonPayload);
      }

      toast.success('Acceptance submitted successfully.');
      setItem(prev => prev ? { ...prev, acceptance_date: acceptanceDate, acceptance_by: acceptanceBy } : prev);
      setSuccessDialogOpen(true);
    } catch (e) {
      toast.error('Failed to submit acceptance');
    } finally {
      setLoading(false);
    }
  };

  const handleSuccessClose = React.useCallback(() => {
    setSuccessDialogOpen(false);
    if (onAccepted) {
      onAccepted();
    } else {
      onClose?.();
    }
  }, [onAccepted, onClose]);

  return (
    <Card className='shadow-sm border border-border/60 bg-white'>
      <CardHeader className="flex flex-row items-center gap-3 py-3">
        <div className="flex-1">
          <CardTitle className="text-sm font-semibold tracking-tight">Asset Receive & Acceptance Form</CardTitle>
        </div>
        <div className="flex-1 flex justify-center">
          {awaitingApproval ? (
            <Badge className="px-2.5 py-1 text-xs bg-amber-500/90 text-white rounded-full shadow-sm">Pending Approval</Badge>
          ) : isAccepted ? (
            <Badge className="px-2.5 py-1 text-xs bg-emerald-600 text-white rounded-full shadow-sm">Accepted</Badge>
          ) : (
            <Badge variant="secondary" className="px-2.5 py-1 text-xs rounded-full">Pending Acceptance</Badge>
          )}
        </div>
        <div className="flex-1 flex justify-end gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={onPrev}
            disabled={!onPrev || !!prevDisabled}
            aria-label="Previous item"
            title="Previous item"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={onNext}
            disabled={!onNext || !!nextDisabled}
            aria-label="Next item"
            title="Next item"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">

      {awaitingApproval && (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          This transfer is still pending approval. You will be able to acknowledge the asset once it has been approved.
        </div>
      )}

      {error && <div className="text-red-600 text-sm">{error}</div>}

      {/* Overview + Asset cards side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card className="shadow-xs bg-stone-50/70 border border-border/60 rounded-lg">
          <CardHeader className="pb-2 px-4 pt-3">
            <CardTitle className="text-sm">Transfer Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-4 pb-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm text-foreground/90">
              <div>
                <div className="text-xs uppercase text-muted-foreground">Transfer ID</div>
                <div className="font-semibold text-gray-900">{item?.transfer_id ?? '-'}</div>
              </div>
              <div>
                <div className="text-xs uppercase text-muted-foreground">Item ID</div>
                <div className="font-semibold text-gray-900">{item?.id ?? '-'}</div>
              </div>
              <div>
                <div className="text-xs uppercase text-muted-foreground">Effective Date</div>
                <div className="font-semibold text-gray-900">
                  {item?.effective_date ? new Date(item.effective_date).toLocaleDateString() : '-'}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase text-muted-foreground">Transfer By</div>
                <div className="font-semibold text-gray-900">{transferByName}</div>
              </div>
            </div>
            <div className="border-t border-border/60 pt-2 text-sm">
              <div className="text-xs uppercase text-muted-foreground mb-0.5">Approved</div>
              {item?.approved_date ? (
                <div className="font-semibold text-gray-900">
                  {`By ${item?.approved_by || '-'}`} on {new Date(item.approved_date).toLocaleString()}
                </div>
              ) : (
                <div className="font-semibold text-gray-900">{awaitingApproval ? 'Pending Approval' : '-'}</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-xs bg-stone-50/70 border border-border/60 rounded-lg">
          <CardHeader className="pb-2 px-4 pt-3">
            <CardTitle className="text-sm">Asset</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm text-foreground/90">
              <div>
                <div className="text-xs uppercase text-muted-foreground">Register Number</div>
                <div className="font-semibold text-gray-900">{label(item?.asset?.register_number)}</div>
              </div>
              <div>
                <div className="text-xs uppercase text-muted-foreground">Type</div>
                <div className="font-semibold text-gray-900">{label(item?.type?.name)}</div>
              </div>
              <div>
                <div className="text-xs uppercase text-muted-foreground">Asset ID</div>
                <div className="font-semibold text-gray-900">{item?.asset?.id ?? '-'}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Current vs New compact matrix */}
      <section className="space-y-2">
        <h3 className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">Ownership & Assignment</h3>
        <div className="overflow-hidden rounded-lg border border-border/60 bg-white">
          <div className="grid grid-cols-3 bg-muted text-xs uppercase tracking-wide text-muted-foreground">
            <div className="px-3 py-2">Field</div>
            <div className="px-3 py-2">{isAccepted ? 'Previous' : 'Current'}</div>
            <div className="px-3 py-2">
              {isAccepted
                ? `Current${item?.acceptance_date ? ` (Accepted on ${new Date(item.acceptance_date as string).toLocaleString()})` : ''}`
                : 'New'}
            </div>
          </div>
          {[
            { label: 'Owner', current: currOwner, next: newOwner },
            { label: 'Cost Center', current: label(item?.current_costcenter?.name), next: label(item?.new_costcenter?.name) },
            { label: 'Department', current: label(item?.current_department && (item?.current_department as any)?.name), next: label(item?.new_department?.name) },
            { label: 'Location', current: label(item?.current_location?.name), next: label(item?.new_location?.name) },
          ].map((row) => (
            <div key={row.label} className="grid grid-cols-3 border-t border-border/60 text-sm">
              <div className="px-3 py-1.5 text-muted-foreground">{row.label}</div>
              <div className="px-3 py-1.5">{row.current}</div>
              <div className="px-3 py-1.5 font-medium text-foreground">{row.next}</div>
            </div>
          ))}
          {/* Reason row spans current + new for readability */}
          <div className="grid grid-cols-3 border-t border-border/60 text-sm bg-muted/40">
            <div className="px-3 py-1.5 text-muted-foreground">Reason</div>
            <div className="px-3 py-1.5 col-span-2">{label(item?.reason)}</div>
          </div>
        </div>
      </section>

      {/* Acknowledgement card */}
      <Card className='shadow-xs bg-stone-50/70 border border-border/60 rounded-lg'>
        <CardHeader className="pb-2 px-4 pt-3">
          <CardTitle className="text-sm">Acknowledgement</CardTitle>
          {Boolean(item?.acceptance_date || item?.acceptance_by) && (
            <div className="mt-1 space-y-1">
              <div className="text-xs text-muted-foreground">
                Accepted{item?.acceptance_date ? ` on ${new Date(item.acceptance_date!).toLocaleString()}` : ''}
                {` by ${acceptanceByFullName}`}
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-3">
              <div>
                <Label className="text-sm font-semibold">Transfer Checklist</Label>
                <div className="mt-2 space-y-2">
                  {checklist.length === 0 && (
                    <div className="text-xs text-muted-foreground">No checklist for this asset type.</div>
                  )}
                  {checklist.map(c => (
                    <div key={c.id} className="flex items-start gap-2 p-2 rounded-md border border-border/70 bg-white">
                      <Checkbox id={`chk_${c.id}`} checked={!!checkState[c.id]?.done} disabled={isReadOnly} onCheckedChange={(val) => setCheckState(s => ({ ...s, [c.id]: { ...s[c.id], done: !!val } }))} />
                      <div className="flex-1">
                        <Label htmlFor={`chk_${c.id}`} className="text-sm my-0">
                          {c.item}
                          {c.is_required && <span className="ml-1 text-red-600">*</span>}
                        </Label>
                        <Textarea
                          className="form-textarea mt-2 h-18 text-sm"
                          placeholder="Remarks (optional)"
                          value={isAccepted ? (checkState[c.id]?.remarks || item?.acceptance_remarks || '') : (checkState[c.id]?.remarks || '')}
                          onChange={e => setCheckState(s => ({ ...s, [c.id]: { ...s[c.id], remarks: e.target.value } }))}
                          disabled={isReadOnly}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <Label className="text-sm font-semibold">Attachment</Label>
              <Input
                type="file"
                onChange={(e) => setAttachment((e.target.files && e.target.files[0]) || null)}
                disabled={isReadOnly}
              />
              {isAccepted ? (
                <div className="text-xs text-muted-foreground mt-1">
                  {existingAttachmentNames.length > 0 ? (
                    <>Uploaded: {existingAttachmentNames.join(', ')}</>
                  ) : (
                    <>No attachment uploaded.</>
                  )}
                </div>
              ) : (
                <>
                  {attachment && (
                    <div className="text-xs text-muted-foreground mt-1">Selected: {attachment.name}</div>
                  )}
                  {!attachment && (
                    <div className="text-xs text-muted-foreground mt-1">Optional — you can attach files.</div>
                  )}
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
        {/* Actions at bottom */}
        <div className="flex justify-end gap-2 pt-3">
          <Button size="sm" variant="outline" onClick={onClose}>Back</Button>
          <Button size="sm" disabled={loading || !item || !allRequiredComplete || isReadOnly} onClick={handleAcknowledge}>Submit Acceptance</Button>
        </div>
      </CardContent>
      <AlertDialog open={successDialogOpen} onOpenChange={(open) => {
        if (!open && successDialogOpen) {
          handleSuccessClose();
        }
      }}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Acceptance Updated</AlertDialogTitle>
            <AlertDialogDescription>
              The asset acceptance was recorded successfully. Close this dialog to return to the transfer list and refresh your assignments.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction asChild>
              <Button>Close &amp; Return</Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default AssetTransferReceiveForm;
