'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { SingleSelect, type ComboboxOption } from '@/components/ui/combobox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AuthContext } from '@/store/AuthContext';
import { authenticatedApi } from '@/config/api';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

interface PoolcarApplicationFormProps {
  id?: number | string | null;
  onClose?: () => void;
  onSubmitted?: () => void;
}

function pad2(value: number) {
  return String(value).padStart(2, '0');
}

function formatLocalInputValue(date: Date) {
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 16);
}

function parseLocalDateTime(value: string) {
  if (!value) return new Date(NaN);
  const [datePart, timePart] = value.split('T');
  if (!datePart || !timePart) return new Date(NaN);
  const [y, m, d] = datePart.split('-').map(Number);
  const [hh, mm] = timePart.split(':').map(Number);
  const parts = [y, m, d, hh, mm];
  if (parts.some(n => Number.isNaN(n))) return new Date(NaN);
  return new Date(y, m - 1, d, hh, mm, 0);
}

function formatDateTimeForPayload(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())} ${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;
}

function calculateDurationDetails(start: Date, end: Date) {
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
    return { days: 0, hours: 0, totalHours: 0 };
  }
  const diffMs = end.getTime() - start.getTime();
  const totalHours = diffMs / (3600 * 1000);
  let days = Math.floor(totalHours / 24);
  let remainingHours = totalHours - days * 24;

  if (remainingHours >= 8) {
    days += 1;
    remainingHours = 0;
  }

  let hours = remainingHours > 0 ? Math.ceil(remainingHours) : 0;
  if (hours > 7) {
    days += 1;
    hours = 0;
  }

  return { days, hours, totalHours };
}



const PoolcarApplicationForm: React.FC<PoolcarApplicationFormProps> = ({ id, onClose, onSubmitted }) => {
  const auth = React.useContext(AuthContext);
  const user = auth?.authData?.user;
  const router = useRouter();

  const [submitting, setSubmitting] = React.useState(false);
  const [cancelSubmitting, setCancelSubmitting] = React.useState(false);
  const [agree, setAgree] = React.useState(false);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [dialogMode, setDialogMode] = React.useState<'submitted' | 'cancelled' | 'returned'>('submitted');
  const [cancelDialogOpen, setCancelDialogOpen] = React.useState(false);
  const [returnSaved, setReturnSaved] = React.useState(false);
  const [loadingExisting, setLoadingExisting] = React.useState(false);
  const [existing, setExisting] = React.useState<any>(null);
  const [returnDT, setReturnDT] = React.useState<string>('');
  const [returnOdoEnd, setReturnOdoEnd] = React.useState<string>('');
  const [cancelRemarks, setCancelRemarks] = React.useState<string>('');
  const [cancelChecked, setCancelChecked] = React.useState<boolean>(false);

  // Requestor
  const [requestor, setRequestor] = React.useState<any>({
    application_date: new Date().toISOString(),
    name: user?.name || '',
    ramco_id: user?.username || '',
    contact: user?.contact || '',
    department: null as any,
    location: null as any,
  });

  // Booking options
  const [bookingOption, setBookingOption] = React.useState<'own' | 'onbehalf'>('own');
  const [onBehalf, setOnBehalf] = React.useState<string>('');
  const [employeeOptions, setEmployeeOptions] = React.useState<ComboboxOption[]>([]);

  // Trip
  const now = React.useMemo(() => new Date(), []);
  const twoHoursLater = React.useMemo(() => new Date(now.getTime() + 2 * 3600 * 1000), [now]);
  const [fromDT, setFromDT] = React.useState<string>(formatLocalInputValue(now)); // yyyy-MM-ddTHH:mm
  const [toDT, setToDT] = React.useState<string>(formatLocalInputValue(twoHoursLater));

  // Core fields
  const [poolcarType, setPoolcarType] = React.useState<string>('');
  const poolcarTypeOptions: ComboboxOption[] = [
    { value: '5', label: 'Sedan' },
    { value: '3', label: 'MPV' },
    { value: '6', label: 'SUV' },
  ];

  const [destination, setDestination] = React.useState<string>('');
  const [purpose, setPurpose] = React.useState<string>('');

  // Additional Requirements
  const [requirements, setRequirements] = React.useState({
    fleet_card: false,
    tng: false,
    smart_tag: false,
    driver: false,
  });

  // Passengers
  const [passengerPick, setPassengerPick] = React.useState<string>('');
  const [passengers, setPassengers] = React.useState<{ ramco_id: string; full_name: string }[]>([]);

  // Guest / non-employee
  const [guestNotes, setGuestNotes] = React.useState<string>('');

  // Draft persistence (create mode only)
  const draftKey = React.useMemo(() => {
    if (id) return null;
    const suffix = user?.username ? String(user.username) : 'guest';
    return `poolcar-application-draft-${suffix}`;
  }, [id, user?.username]);
  const [draftLoaded, setDraftLoaded] = React.useState(false);

  // Readonly mode: after submission (edit mode), disallow updating booking/cancellation blocks
  const readOnly = !!id;
  const clearDraft = React.useCallback(() => {
    if (!draftKey) return;
    try {
      localStorage.removeItem(draftKey);
    } catch {
      // ignore storage errors
    }
  }, [draftKey]);

  // Restore draft on mount (create mode)
  React.useEffect(() => {
    if (id) return;
    if (!draftKey) { setDraftLoaded(true); return; }
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem(draftKey) : null;
      if (raw) {
        const draft = JSON.parse(raw);
        if (draft.requestor) setRequestor((s: any) => ({ ...s, ...draft.requestor }));
        if (draft.bookingOption === 'own' || draft.bookingOption === 'onbehalf') setBookingOption(draft.bookingOption);
        if (typeof draft.onBehalf === 'string') setOnBehalf(draft.onBehalf);
        if (typeof draft.fromDT === 'string' && draft.fromDT) setFromDT(draft.fromDT);
        if (typeof draft.toDT === 'string' && draft.toDT) setToDT(draft.toDT);
        if (typeof draft.poolcarType === 'string') setPoolcarType(draft.poolcarType);
        if (typeof draft.destination === 'string') setDestination(draft.destination);
        if (typeof draft.purpose === 'string') setPurpose(draft.purpose);
        if (draft.requirements) setRequirements((s) => ({ ...s, ...draft.requirements }));
        if (Array.isArray(draft.passengers)) setPassengers(draft.passengers);
        if (typeof draft.guestNotes === 'string') setGuestNotes(draft.guestNotes);
        if (typeof draft.agree === 'boolean') setAgree(draft.agree);
      }
    } catch {
      // ignore parse/storage errors
    } finally {
      setDraftLoaded(true);
    }
  }, [draftKey, id]);

  // Persist draft whenever form changes (create mode)
  React.useEffect(() => {
    if (id || !draftKey || !draftLoaded) return;
    try {
      const payload = {
        requestor,
        bookingOption,
        onBehalf,
        fromDT,
        toDT,
        poolcarType,
        destination,
        purpose,
        requirements,
        passengers,
        guestNotes,
        agree,
      };
      localStorage.setItem(draftKey, JSON.stringify(payload));
    } catch {
      // ignore storage errors
    }
  }, [
    agree,
    bookingOption,
    destination,
    draftKey,
    draftLoaded,
    fromDT,
    guestNotes,
    id,
    onBehalf,
    passengers,
    poolcarType,
    purpose,
    requestor,
    requirements,
    toDT,
  ]);

  // Fetch existing data when editing
  React.useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoadingExisting(true);
    (async () => {
      try {
        const res: any = await authenticatedApi.get(`/api/mtn/poolcars/${id}`);
        const data = res?.data?.data;
        if (!data || cancelled) return;

        setExisting(data);

        // Requestor details
        const reqEmp = data.pcar_empid || {};
        const dept = data.department || reqEmp.department || null;
        const loc = data.location || reqEmp.location || null;
        const deptNorm = dept ? { ...dept, name: (dept as any).name || (dept as any).code } : null;
        const locNorm = loc ? { ...loc, code: (loc as any).code || (loc as any).name } : null;
        setRequestor({
          application_date: data.pcar_datereq || new Date().toISOString(),
          name: reqEmp.full_name || user?.name || '',
          ramco_id: reqEmp.ramco_id || user?.username || '',
          contact: data.ctc_m || user?.contact || '',
          department: deptNorm,
          location: locNorm,
        });

        // Booking option and driver
        const driver = data.pcar_driver || {};
        const isOwn = driver?.ramco_id && reqEmp?.ramco_id
          ? String(driver.ramco_id) === String(reqEmp.ramco_id)
          : true;
        setBookingOption(isOwn ? 'own' : 'onbehalf');
        setOnBehalf(isOwn ? '' : String(driver?.ramco_id || ''));

        // Type
        const typeId = data?.pcar_type?.id ?? data?.pcar_type ?? '';
        setPoolcarType(typeId ? String(typeId) : '');

        // Dates
        const start = data.pcar_datefr ? new Date(data.pcar_datefr) : null;
        const end = data.pcar_dateto ? new Date(data.pcar_dateto) : null;
        if (start) setFromDT(formatLocalInputValue(start));
        if (end) setToDT(formatLocalInputValue(end));

        // Optional return date/time (new fields pcar_retdate, pcar_odo_end)
        const retRaw = (data as any).pcar_retdate || (data as any).return_dt || (data as any).pcar_ret_dt || (data as any).pcar_returndt || null;
        if (retRaw) {
          const rdt = new Date(retRaw);
          if (!isNaN(rdt.getTime())) setReturnDT(formatLocalInputValue(rdt));
        }
        if ((data as any).pcar_odo_end != null) {
          setReturnOdoEnd(String((data as any).pcar_odo_end));
        }
        // If already returned, disable save-return by default
        if ((data as any).status === 'returned' || ((data as any).pcar_odo_end != null && retRaw)) {
          setReturnSaved(true);
        }

        // Core
        setDestination(data.pcar_dest || '');
        setPurpose(data.pcar_purp || '');

        // Cancellation state from backend (pcar_cancel, pcar_canrem)
        const cancelRaw: any = (data as any).pcar_cancel;
        const cancelIsTrue = (
          cancelRaw === 1 ||
          cancelRaw === '1' ||
          cancelRaw === true ||
          (typeof cancelRaw === 'string' && cancelRaw.toLowerCase() === 'true') ||
          (typeof cancelRaw === 'string' && cancelRaw.toLowerCase() === 'yes')
        );
        setCancelChecked(cancelIsTrue);
        if ((data as any).pcar_canrem != null) {
          setCancelRemarks(String((data as any).pcar_canrem ?? ''));
        }

        // Requirements
        const optStr: string = data.pcar_opt || '';
        const tokens = optStr.split(',').map((s: string) => s.trim().toLowerCase()).filter(Boolean);
        setRequirements({
          fleet_card: tokens.includes('fleetcard'),
          tng: tokens.includes('tng'),
          smart_tag: tokens.includes('smarttag'),
          driver: tokens.includes('driver'),
        });

        // Passengers
        const pax = Array.isArray(data.passenger) ? data.passenger : [];
        const paxList = pax.map((p: any) => ({
          ramco_id: String(p.ramco_id ?? ''),
          full_name: p.full_name ?? String(p.ramco_id ?? ''),
        })).filter((p: any) => p.ramco_id);
        setPassengers(paxList);

        // Guests information is not clearly represented in payload; leave notes empty
        setGuestNotes('');
      } catch (e) {
        if (!cancelled) {
          toast.error('Failed to load application data');
        }
      } finally {
        if (!cancelled) setLoadingExisting(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  // In update mode, keep declaration checked by default
  React.useEffect(() => {
    if (id) setAgree(true);
  }, [id]);

  // Fetch requestor details (department, location, etc.)
  React.useEffect(() => {
    if (id) return; // do not override prefilled data in edit mode
    const username = user?.username;
    if (!username) return;
    authenticatedApi
      .get(`/api/assets/employees/lookup/${username}`)
      .then((res: any) => {
        const data = res?.data?.data;
        if (!data) return;
        setRequestor((s: any) => ({
          ...s,
          name: data.full_name || s.name,
          ramco_id: data.ramco_id || s.ramco_id,
          contact: data.contact || s.contact,
          department: data.department || null,
          location: data.location || null,
        }));
      })
      .catch(() => { });
  }, [user?.username]);

  // Prefetch employees by department for On-Behalf and passengers
  React.useEffect(() => {
    const deptId = requestor?.department?.id;
    if (!deptId) { setEmployeeOptions([]); return; }
    let cancelled = false;
    (async () => {
      try {
        const res: any = await authenticatedApi.get(`/api/assets/employees?dept=${deptId}`);
        const list = res?.data?.data || [];
        if (!cancelled) {
          setEmployeeOptions(list.map((e: any) => ({ value: String(e.ramco_id), label: e.full_name })));
        }
      } catch {
        if (!cancelled) setEmployeeOptions([]);
      }
    })();
    return () => { cancelled = true; };
  }, [requestor?.department?.id]);

  // Duration calculation
  const duration = React.useMemo(() => {
    const start = parseLocalDateTime(fromDT);
    const end = parseLocalDateTime(toDT);
    return calculateDurationDetails(start, end);
  }, [fromDT, toDT]);

  const maxPassengers = React.useMemo(() => {
    if (poolcarType === '3') return 4; // MPV
    if (poolcarType === '5' || poolcarType === '6') return 3; // Sedan/SUV
    return 0;
  }, [poolcarType]);

  const hasUnsavedChanges = React.useMemo(() => {
    const hasReq = Object.values(requirements).some(Boolean);
    return Boolean(
      poolcarType ||
      destination ||
      purpose ||
      (bookingOption === 'onbehalf' && onBehalf) ||
      passengers.length > 0 ||
      guestNotes.trim() ||
      hasReq
    );
  }, [bookingOption, destination, guestNotes, onBehalf, passengers.length, poolcarType, purpose, requirements]);

  function addPassenger() {
    if (!passengerPick) return;
    if (!poolcarType) { toast.info('Select a poolcar type first'); return; }
    if (passengers.length >= maxPassengers) { toast.error(`Passenger limit reached (${maxPassengers})`); return; }
    const exists = passengers.some(p => p.ramco_id === passengerPick);
    if (exists) return;
    const found = employeeOptions.find(o => o.value === passengerPick);
    setPassengers(prev => [...prev, { ramco_id: passengerPick, full_name: found?.label || passengerPick }]);
    setPassengerPick('');
  }

  function removePassenger(ramco: string) {
    setPassengers(prev => prev.filter(p => p.ramco_id !== ramco));
  }

  const disabled = submitting;

  const handleSubmit = async () => {
    if (!agree) { toast.error('You must agree to the terms before submitting.'); return; }
    const start = parseLocalDateTime(fromDT); const end = parseLocalDateTime(toDT);
    if (!(start < end)) { toast.error('Trip end must be after start.'); return; }
    const booktype = bookingOption === 'onbehalf' ? 'behalf' : 'own';
    if (booktype === 'behalf' && !onBehalf) {
      toast.error('Select an employee for on-behalf booking.');
      return;
    }
    if (!poolcarType) {
      toast.error('Select a poolcar type.');
      return;
    }
    setSubmitting(true);
    try {
      const requirementsMap: Record<string, string> = {
        fleet_card: 'fleetcard',
        tng: 'tng',
        smart_tag: 'smarttag',
        driver: 'driver',
      };
      const selectedRequirements = Object.entries(requirements)
        .filter(([, checked]) => checked)
        .map(([key]) => requirementsMap[key]);

      const durationDetails = calculateDurationDetails(start, end);

      const passengerIds = passengers.map(p => p.ramco_id);
      const guestEntries = guestNotes
        .split(/[\n,]+/)
        .map(s => s.trim())
        .filter(Boolean);
      const passengerPayload = [...passengerIds, ...guestEntries].join(',');

      const payload: any = {
        pcar_datereq: formatDateTimeForPayload(new Date(requestor.application_date)),
        pcar_empid: requestor.ramco_id,
        ctc_m: requestor.contact,
        dept_id: requestor?.department?.id ?? null,
        loc_id: requestor?.location?.id ?? null,
        pcar_booktype: booktype,
        pcar_driver: booktype === 'own' ? requestor.ramco_id : onBehalf,
        pcar_type: Number(poolcarType),
        pcar_datefr: formatDateTimeForPayload(start),
        pcar_dateto: formatDateTimeForPayload(end),
        pcar_day: durationDetails.days,
        pcar_hour: durationDetails.hours,
        pcar_dest: destination,
        pcar_purp: purpose,
        pcar_opt: selectedRequirements.join(','),
        pcar_pass: passengerPayload,
      };

      // Update-mode specific fields (return date only; cancellation handled via its own button)
      if (id) {
        payload.pcar_id = Number(id);
        if (returnDT) {
          const rdt = parseLocalDateTime(returnDT);
          if (!isNaN(rdt.getTime())) {
            payload.pcar_retdate = formatDateTimeForPayload(rdt);
          }
        }
      }

      if (id) {
        await authenticatedApi.put(`/api/mtn/poolcars/${id}`, payload);
        toast.success('Poolcar application updated');
      } else {
        await authenticatedApi.post('/api/mtn/poolcars', payload);
        toast.success('Poolcar application created');
      }
      clearDraft();
      setDialogMode('submitted');
      setDialogOpen(true);
    } catch (e: any) {
      toast.error('Failed to submit application');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelApplication = async () => {
    if (!id) return;
    if (existing?.pcar_cancel === '1' || existing?.pcar_cancel === 1) {
      toast.info('This application is already canceled.');
      return;
    }
    if (!cancelChecked) {
      toast.error('Please tick Cancel Request to confirm.');
      return;
    }
    if (!cancelRemarks.trim()) {
      toast.error('Please provide cancellation remarks');
      return;
    }
    setCancelSubmitting(true);
    try {
      const payload = {
        cancel_date: formatDateTimeForPayload(new Date()),
        pcar_canrem: cancelRemarks.trim(),
        pcar_cancel: 'cancelled',
      } as any;
      await authenticatedApi.put(`/api/mtn/poolcars/${id}`, payload);
      toast.success('Application canceled');
      // reflect local state
      setExisting((s: any) => ({ ...(s || {}), pcar_cancel: 1, pcar_canrem: cancelRemarks.trim() }));
      if (typeof onSubmitted === 'function') onSubmitted();
      setDialogMode('cancelled');
      setDialogOpen(true);
    } catch (e) {
      toast.error('Failed to cancel application');
    } finally {
      setCancelSubmitting(false);
    }
  };

  function formatDMY(value: string) {
    const d = new Date(value);
    if (isNaN(d.getTime())) return '';
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }

  const navigateToRecords = React.useCallback(() => {
    onSubmitted?.();
    if (onClose) {
      onClose();
    } else {
      router.push('/mtn/poolcar/record');
    }
  }, [onClose, onSubmitted, router]);

  const handleReturnToMain = React.useCallback(() => {
    setDialogOpen(false);
    clearDraft();
    navigateToRecords();
  }, [clearDraft, navigateToRecords]);

  const cancelWarningText = hasUnsavedChanges
    ? 'You have unsubmitted changes. Leaving now will discard them.'
    : 'The form is empty. Leaving now will discard this draft.';

  const handleCancelConfirmed = React.useCallback(() => {
    clearDraft();
    navigateToRecords();
  }, [clearDraft, navigateToRecords]);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{id ? `Edit Poolcar Application #${id}` : 'Create Poolcar Application'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Requestor Section */}
          <div>
            <div className="font-semibold mb-2">Requestor</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <Label>Application Date</Label>
                <Input readOnly value={formatDMY(requestor.application_date)} />
              </div>
              <div>
                <Label>Department</Label>
                <Input readOnly value={requestor?.department?.name || requestor?.department?.code || ''} />
              </div>
              <div>
                <Label>Name</Label>
                <Input readOnly value={requestor.name} />
              </div>
              <div>
                <Label>Ramco ID</Label>
                <Input readOnly value={requestor.ramco_id} />
              </div>
              <div>
                <Label>Contact No</Label>
                <Input readOnly value={requestor.contact} />
              </div>
              <div>
                <Label>Location</Label>
                <Input readOnly value={requestor?.location?.code || requestor?.location?.name || ''} />
              </div>
            </div>
          </div>

          <Separator />

          {/* Booking Options and Trip */}
          <div className="space-y-4">
            <div className="font-semibold">Booking Details</div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div className="md:col-span-1">
                <Label>Booking Option</Label>
                <RadioGroup value={bookingOption} onValueChange={(v: any) => { if (!readOnly) setBookingOption(v); }} className={`mt-2 grid-flow-col auto-cols-max items-center ${readOnly ? 'opacity-70 pointer-events-none' : ''}`}>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem id="opt-own" value="own" disabled={readOnly} />
                    <Label htmlFor="opt-own">Own</Label>
                  </div>
                  <div className="flex items-center gap-4">
                    <RadioGroupItem id="opt-onbehalf" value="onbehalf" disabled={readOnly} />
                    <Label htmlFor="opt-onbehalf">On-Behalf</Label>
                  </div>
                </RadioGroup>
              </div>
              <div className="md:col-span-1">
                <Label>On-Behalf Driver</Label>
                <SingleSelect
                  options={employeeOptions}
                  value={onBehalf}
                  onValueChange={(v) => { if (!readOnly) setOnBehalf(v); }}
                  disabled={readOnly || bookingOption !== 'onbehalf'}
                  placeholder="Select employee"
                />
              </div>
              <div className="md:col-span-1">
                <Label>Poolcar Type</Label>
                <SingleSelect
                  options={poolcarTypeOptions}
                  value={poolcarType}
                  onValueChange={(v) => { if (!readOnly) setPoolcarType(v); }}
                  disabled={readOnly}
                  placeholder="Select type"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <Label className="flex items-center justify-between">
                  <span>Trip From (Date/Time)</span>
                  <button
                    type="button"
                    className="text-xs text-primary hover:underline"
                    onClick={() => {
                      if (readOnly) return;
                      const now = new Date();
                      setFromDT(formatLocalInputValue(now));
                    }}
                  >
                    Today
                  </button>
                </Label>
                <Input type="datetime-local" value={fromDT} onChange={e => setFromDT(e.target.value)} disabled={readOnly} />
              </div>
              <div>
                <Label className="flex items-center justify-between">
                  <span>Trip End (Date/Time)</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="text-xs text-primary hover:underline"
                      onClick={() => {
                        if (readOnly) return;
                        const base = parseLocalDateTime(fromDT);
                        const origin = isNaN(base.getTime()) ? new Date() : base;
                        const end = new Date(origin.getTime() + 2 * 3600 * 1000);
                        setToDT(formatLocalInputValue(end));
                      }}
                    >
                      +2h
                    </button>
                    <button
                      type="button"
                      className="text-xs text-primary hover:underline"
                      onClick={() => {
                        if (readOnly) return;
                        const now = new Date();
                        setToDT(formatLocalInputValue(now));
                      }}
                    >
                      Today
                    </button>
                  </div>
                </Label>
                <Input type="datetime-local" value={toDT} min={fromDT} onChange={e => setToDT(e.target.value)} disabled={readOnly} />
              </div>
              <div>
                <Label>Duration</Label>
                <Input readOnly value={`${duration.days} day(s) ${duration.hours} hour(s)`} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Destination</Label>
                <Textarea rows={2} value={destination} onChange={e => setDestination(e.target.value)} disabled={readOnly} />
              </div>
              <div>
                <Label>Purpose</Label>
                <Textarea rows={2} value={purpose} onChange={e => setPurpose(e.target.value)} disabled={readOnly} />
              </div>
            </div>
          </div>

          <Separator />

          {/* Additional / Passengers / Guest */}
          <div>
            <div className="font-semibold mb-2">Additional & Passengers</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Additional Requirements */}
              <div className="space-y-2">
                <div className="font-medium">Additional Requirement</div>
                <div className="flex items-center gap-2">
                  <Checkbox id="req-fc" checked={requirements.fleet_card} disabled={readOnly} onCheckedChange={(v: any) => !readOnly && setRequirements(s => ({ ...s, fleet_card: !!v }))} />
                  <Label htmlFor="req-fc">Fleet Card</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="req-tng" checked={requirements.tng} disabled={readOnly} onCheckedChange={(v: any) => !readOnly && setRequirements(s => ({ ...s, tng: !!v }))} />
                  <Label htmlFor="req-tng">Touch n&apos; Go</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="req-st" checked={requirements.smart_tag} disabled={readOnly} onCheckedChange={(v: any) => !readOnly && setRequirements(s => ({ ...s, smart_tag: !!v }))} />
                  <Label htmlFor="req-st">Smart TAG Device</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="req-driver" checked={requirements.driver} disabled={readOnly} onCheckedChange={(v: any) => !readOnly && setRequirements(s => ({ ...s, driver: !!v }))} />
                  <Label htmlFor="req-driver">Driver</Label>
                </div>
              </div>

              {/* Passengers */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-medium">Passengers</div>
                  <div className="text-xs text-muted-foreground">Limit: {maxPassengers || '-'}</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <SingleSelect
                      options={employeeOptions}
                      value={passengerPick}
                      onValueChange={(v) => { if (!readOnly) setPassengerPick(v); }}
                      placeholder="Search employee"
                      disabled={readOnly || !poolcarType || passengers.length >= maxPassengers}
                    />
                  </div>
                  <Button type="button" size="sm" onClick={() => { if (!readOnly) addPassenger(); }} disabled={readOnly || !passengerPick || passengers.length >= maxPassengers}>
                    <Plus size={14} />
                  </Button>
                </div>
                <div className="mt-2 space-y-1">
                  {passengers.length === 0 ? (
                    <div className="text-xs text-muted-foreground">No passengers added.</div>
                  ) : passengers.map((p, idx) => (
                    <div key={p.ramco_id} className="flex items-center justify-between rounded border px-2 py-1 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex w-5 justify-center text-xs text-muted-foreground">{idx + 1}.</span>
                        <span>{p.full_name} <span className="text-muted-foreground">({p.ramco_id})</span></span>
                      </div>
                      <button className="text-red-600 hover:underline text-xs disabled:opacity-50" disabled={readOnly} onClick={() => { if (!readOnly) removePassenger(p.ramco_id); }}>
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Guests */}
              <div>
                <div className="font-medium mb-2">Guest / Non-employee</div>
                <Textarea rows={4} value={guestNotes} onChange={e => setGuestNotes(e.target.value)} placeholder="Names or details of guests" disabled={readOnly} />
              </div>
            </div>
          </div>
          <Separator />
          {/* Cancellation - edit mode only */}
          {id && (
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Cancellation</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                    <div className="md:col-span-1 flex items-center gap-2">
                      <Checkbox id="cancelReq" checked={cancelChecked} onCheckedChange={(v: any) => setCancelChecked(!!v)} disabled={true} />
                      <Label htmlFor="cancelReq" className='text-red-500 font-semibold'>Cancel Request</Label>
                    </div>
                    <div className="md:col-span-1 md:col-start-2">
                      <Label className='text-red-500'>Cancel Remarks {cancelChecked ? <span className="text-red-500">*</span> : null}</Label>
                      <Textarea
                        rows={2}
                        value={cancelRemarks}
                        onChange={e => setCancelRemarks(e.target.value)}
                        placeholder="Reason for cancellation"
                        disabled={true}
                      />
                    </div>
                    <div className="md:col-span-1 flex items-end">
                      <Button
                        variant="destructive"
                        disabled={true}
                        onClick={handleCancelApplication}
                      >{cancelSubmitting ? 'Cancelling...' : 'Cancel Application'}</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Separator />
            </div>
          )}

          {/* Status & Assignment - only after approved */}
          {id && existing?.approval_stat === 1 && (
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Status & Assignment</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Approval Status</Label>
                    <div className="text-sm mt-1">
                      {(existing?.pcar_cancel === '1' || existing?.pcar_cancel === 1)
                        ? 'Canceled'
                        : existing?.approval_stat === 1
                          ? 'Approved'
                          : existing?.approval_stat === 0
                            ? 'Pending'
                            : (existing?.approval_stat == null ? '-' : 'Rejected')}
                    </div>
                  </div>
                  <div>
                    <Label>Approved By</Label>
                    <div className="text-sm mt-1">{existing?.approval?.full_name || '-'}</div>
                  </div>
                  <div>
                    <Label>Approval Date</Label>
                    <div className="text-sm mt-1">{existing?.approval_date ? formatDMY(existing.approval_date) : '-'}</div>
                  </div>
                  <div>
                    <Label>Assigned Poolcar</Label>
                    <div className="text-sm mt-1">{existing?.asset?.register_number || (existing?.asset_id ? String(existing.asset_id) : '-')}</div>
                  </div>
                  <div>
                    <Label>Fleet Card</Label>
                    <div className="text-sm mt-1">{existing?.fleetcard?.card_no || (existing?.fleetcard_id ? String(existing.fleetcard_id) : '-')}</div>
                  </div>
                  <div>
                    <Label>TnG Card</Label>
                    <div className="text-sm mt-1">{existing?.tng?.tng_sn || (existing?.tng_id ? String(existing.tng_id) : '-')}</div>
                  </div>
                  <div>
                    <Label>TnG Balance</Label>
                    <div className="text-sm mt-1">{existing?.tng_usage ? String(existing.tng_usage) : '-'}</div>
                  </div>
                  </div>

                  <Separator className="my-2" />

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label>Return Date/Time</Label>
                      <Input type="datetime-local" value={returnDT} onChange={e => setReturnDT(e.target.value)} />
                    </div>
                    <div>
                      <Label>Returned ODO Meter</Label>
                      <Input type="number" min={0} value={returnOdoEnd} onChange={e => setReturnOdoEnd(e.target.value)} placeholder="e.g. 15000" />
                    </div>
                    <div className="flex items-end">
                      <Button
                        type="button"
                        onClick={async () => {
                          if (!id) return;
                          if (!returnDT || !returnOdoEnd) { toast.error('Please enter return date/time and ODO meter'); return; }
                          const rdt = parseLocalDateTime(returnDT);
                          if (isNaN(rdt.getTime())) { toast.error('Invalid return date/time'); return; }
                          try {
                            const payload = {
                              pcar_retdate: formatDateTimeForPayload(rdt),
                              pcar_odo_end: Number(returnOdoEnd),
                            };
                            await authenticatedApi.put(`/api/mtn/poolcars/${id}/returned`, payload);
                            toast.success('Return details saved');
                            setReturnSaved(true);
                            setDialogMode('returned');
                            setDialogOpen(true);
                          } catch (e) {
                            toast.error('Failed to save return details');
                          }
                        }}
                        disabled={!returnDT || !returnOdoEnd || returnSaved}
                      >
                        Save Return
                      </Button>
                    </div>
                  </div>

                </CardContent>
              </Card>
              <Separator />
            </div>
          )}

          {/* Agreement & Actions inside card - only for create mode (not after submitted) */}
          {!id && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox id="agree" checked={agree} onCheckedChange={(v: any) => setAgree(!!v)} />
                <Label htmlFor="agree">I agree to comply with the company&apos;s Terms &amp; Conditions and all rules set by the company.</Label>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setCancelDialogOpen(true)} disabled={disabled}>Cancel</Button>
                <Button onClick={handleSubmit} disabled={disabled || !agree || loadingExisting}>{submitting ? 'Submitting...' : 'Submit'}</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave application form?</AlertDialogTitle>
            <AlertDialogDescription>
              {cancelWarningText}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Stay on this page</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setCancelDialogOpen(false);
                handleCancelConfirmed();
              }}
            >
              Discard and leave
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === 'cancelled'
                ? 'Cancellation submitted'
                : dialogMode === 'returned'
                  ? 'Return submitted'
                  : 'Application saved'}
            </DialogTitle>
            <DialogDescription>
              The form has been submitted successfully. You may return to the main page when you are ready.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-end">
            <Button onClick={handleReturnToMain}>Back to Pool Car Records</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PoolcarApplicationForm;
