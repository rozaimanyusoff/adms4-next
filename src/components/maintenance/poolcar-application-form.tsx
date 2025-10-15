'use client';
import React from 'react';
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

  const [submitting, setSubmitting] = React.useState(false);
  const [agree, setAgree] = React.useState(false);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [loadingExisting, setLoadingExisting] = React.useState(false);

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
  const driverOptionRef = React.useRef<ComboboxOption | null>(null);

  // Fetch requestor details (department, location, etc.)
  React.useEffect(() => {
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
      .catch(() => {});
  }, [user?.username]);

  // Prefetch employees by department for On-Behalf and passengers
  React.useEffect(() => {
    const deptId = requestor?.department?.id;
    if (!deptId) {
      const driverOption = driverOptionRef.current && onBehalf
        ? [{ ...driverOptionRef.current }]
        : [];
      setEmployeeOptions(driverOption);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res: any = await authenticatedApi.get(`/api/assets/employees?dept=${deptId}`);
        const list = res?.data?.data || [];
        if (!cancelled) {
          const base = list.map((e: any) => ({ value: String(e.ramco_id), label: e.full_name }));
          const driverOption = driverOptionRef.current && onBehalf ? { ...driverOptionRef.current } : null;
          if (driverOption && !base.some((opt) => opt.value === driverOption.value)) {
            base.push(driverOption);
          }
          setEmployeeOptions(base);
        }
      } catch {
        if (!cancelled) setEmployeeOptions([]);
      }
    })();
    return () => { cancelled = true; };
  }, [requestor?.department?.id, onBehalf]);

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
  const disabled = submitting || loadingExisting;

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

      const payload = {
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

      if (id) {
        await authenticatedApi.put(`/api/mtn/poolcars/${id}`, payload);
        toast.success('Poolcar application updated');
      } else {
        await authenticatedApi.post('/api/mtn/poolcars', payload);
        toast.success('Poolcar application created');
      }
      setDialogOpen(true);
    } catch (e) {
      toast.error('Failed to submit application');
    } finally {
      setSubmitting(false);
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

  const handleReturnToMain = React.useCallback(() => {
    setDialogOpen(false);
    onSubmitted?.();
    onClose?.();
  }, [onClose, onSubmitted]);

  if (loadingExisting && id) {
    return (
      <div className="p-4 text-sm text-muted-foreground">Loading application details...</div>
    );
  }

  return (
    <div className="p-4">
      <Card>
        <CardHeader>
          <CardTitle>{id ? `Edit Poolcar Application #${id}` : 'Create Poolcar Application'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Requestor Section */}
          <div>
            <div className="font-semibold mb-2">Requestor</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Application Date</Label>
                <Input readOnly value={formatDMY(requestor.application_date)} />
              </div>
              <div>
                <Label>Department</Label>
                <Input readOnly value={requestor?.department?.name || ''} />
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
                <Input readOnly value={requestor?.location?.code || ''} />
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
                <RadioGroup value={bookingOption} onValueChange={(v: any) => setBookingOption(v)} className="mt-2 grid-flow-col auto-cols-max items-center">
                  <div className="flex items-center gap-2">
                    <RadioGroupItem id="opt-own" value="own" />
                    <Label htmlFor="opt-own">Own</Label>
                  </div>
                  <div className="flex items-center gap-4">
                    <RadioGroupItem id="opt-onbehalf" value="onbehalf" />
                    <Label htmlFor="opt-onbehalf">On-Behalf</Label>
                  </div>
                </RadioGroup>
              </div>
              <div className="md:col-span-1">
                <Label>On-Behalf Driver</Label>
                <SingleSelect
                  options={employeeOptions}
                  value={onBehalf}
                  onValueChange={setOnBehalf}
                  disabled={bookingOption !== 'onbehalf' || disabled}
                  placeholder="Select employee"
                />
              </div>
              <div className="md:col-span-1">
                <Label>Poolcar Type</Label>
                <SingleSelect
                  options={poolcarTypeOptions}
                  value={poolcarType}
                  onValueChange={setPoolcarType}
                  disabled={disabled}
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
                  disabled={disabled}
                  onClick={() => {
                    const now = new Date();
                    setFromDT(formatLocalInputValue(now));
                  }}
                >
                  Today
                </button>
              </Label>
              <Input type="datetime-local" value={fromDT} onChange={e => setFromDT(e.target.value)} disabled={disabled} />
            </div>
            <div>
              <Label className="flex items-center justify-between">
                <span>Trip End (Date/Time)</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="text-xs text-primary hover:underline"
                    disabled={disabled}
                    onClick={() => {
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
                    disabled={disabled}
                    onClick={() => {
                      const now = new Date();
                      setToDT(formatLocalInputValue(now));
                    }}
                  >
                    Today
                  </button>
                </div>
              </Label>
              <Input
                type="datetime-local"
                value={toDT}
                min={fromDT}
                onChange={e => setToDT(e.target.value)}
                disabled={disabled}
              />
            </div>
            <div>
              <Label>Duration</Label>
              <Input readOnly value={`${duration.days} day(s) ${duration.hours} hour(s)`} />
            </div>
          </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Destination</Label>
                <Textarea rows={2} value={destination} onChange={e => setDestination(e.target.value)} />
              </div>
              <div>
                <Label>Purpose</Label>
                <Textarea rows={2} value={purpose} onChange={e => setPurpose(e.target.value)} />
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
                  <Checkbox id="req-fc" checked={requirements.fleet_card} onCheckedChange={(v: any) => setRequirements(s => ({ ...s, fleet_card: !!v }))} />
                  <Label htmlFor="req-fc">Fleet Card</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="req-tng" checked={requirements.tng} onCheckedChange={(v: any) => setRequirements(s => ({ ...s, tng: !!v }))} />
                  <Label htmlFor="req-tng">Touch n' Go</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="req-st" checked={requirements.smart_tag} onCheckedChange={(v: any) => setRequirements(s => ({ ...s, smart_tag: !!v }))} />
                  <Label htmlFor="req-st">Smart TAG Device</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="req-driver" checked={requirements.driver} onCheckedChange={(v: any) => setRequirements(s => ({ ...s, driver: !!v }))} />
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
                      onValueChange={setPassengerPick}
                      placeholder="Search employee"
                      disabled={!poolcarType || passengers.length >= maxPassengers}
                    />
                  </div>
                  <Button type="button" size="sm" onClick={addPassenger} disabled={!passengerPick || passengers.length >= maxPassengers}>
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
                      <button className="text-red-600 hover:underline text-xs" onClick={() => removePassenger(p.ramco_id)}>
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Guests */}
              <div>
                <div className="font-medium mb-2">Guest / Non-employee</div>
                <Textarea rows={4} value={guestNotes} onChange={e => setGuestNotes(e.target.value)} placeholder="Names or details of guests" />
              </div>
            </div>
          </div>

          <Separator />

          {/* Agreement & Actions inside card */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Checkbox id="agree" checked={agree} onCheckedChange={(v: any) => setAgree(!!v)} />
              <Label htmlFor="agree">I confirm the information provided is accurate.</Label>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} disabled={disabled}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={disabled || !agree}>{submitting ? 'Submitting...' : 'Submit'}</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Application saved</DialogTitle>
            <DialogDescription>
              The form has been submitted successfully. You may return to the main page when you are ready.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-end">
            <Button onClick={handleReturnToMain}>Return to main page</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PoolcarApplicationForm;

  const normalizeOptionToken = React.useCallback((token: string) => {
    return token.toLowerCase().replace(/[^a-z0-9]/g, '');
  }, []);

  const parseRequirementFlags = React.useCallback(
    (raw: any) => {
      const tokens = new Set(
        String(raw ?? '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
          .map((s) => normalizeOptionToken(s)),
      );
      return {
        fleet_card: tokens.has('fleetcard'),
        tng: tokens.has('tng') || tokens.has('touchngo'),
        smart_tag: tokens.has('smarttag') || tokens.has('smarttagdevice'),
        driver: tokens.has('driver'),
      };
    },
    [normalizeOptionToken],
  );

  const toLocalInputValue = React.useCallback((value?: string | null) => {
    if (!value) return '';
    const date = new Date(value);
    if (isNaN(date.getTime())) return '';
    return formatLocalInputValue(date);
  }, []);

  const formatApplicationDate = React.useCallback((value?: string | null, fallback?: string) => {
    if (!value) return fallback ?? '';
    const date = new Date(value);
    if (isNaN(date.getTime())) return fallback ?? '';
    return date.toISOString();
  }, []);

  React.useEffect(() => {
    if (!id) {
      driverOptionRef.current = null;
      return;
    }
    let cancelled = false;
    setLoadingExisting(true);
    authenticatedApi
      .get(`/api/mtn/poolcars/${id}`)
      .then((res) => {
        if (cancelled) return;
        const payload: any = res?.data?.data ?? res?.data;
        if (!payload) {
          toast.error('Failed to load poolcar application details');
          return;
        }
        setRequestor((prev: any) => ({
          ...prev,
          application_date: formatApplicationDate(payload.pcar_datereq, prev.application_date),
          name: payload.pcar_empid?.full_name || payload.pcar_empname || prev.name,
          ramco_id: payload.pcar_empid?.ramco_id || payload.pcar_empid?.ramcoId || payload.pcar_empid || prev.ramco_id,
          contact: payload.ctc_m ?? prev.contact,
          department: payload.department ?? prev.department,
          location: payload.location ?? prev.location,
        }));

        const bookTypeRaw = String(payload.pcar_booktype ?? '').toLowerCase();
        const resolvedBookType = bookTypeRaw.includes('behalf') ? 'onbehalf' : 'own';
        setBookingOption(resolvedBookType as 'own' | 'onbehalf');

        const driverValue =
          payload.pcar_driver?.ramco_id ||
          payload.pcar_driver?.ramcoId ||
          (typeof payload.pcar_driver === 'string' ? payload.pcar_driver : '');
        const driverLabel =
          payload.pcar_driver?.full_name ||
          payload.pcar_driver?.name ||
          driverValue ||
          '';
        driverOptionRef.current = driverValue
          ? { value: String(driverValue), label: driverLabel || String(driverValue) }
          : null;
        setOnBehalf(driverValue ? String(driverValue) : '');

        const typeValue = payload.pcar_type != null ? String(payload.pcar_type) : '';
        setPoolcarType(typeValue);

        const fromValue = toLocalInputValue(payload.pcar_datefr);
        if (fromValue) setFromDT(fromValue);
        const toValue = toLocalInputValue(payload.pcar_dateto);
        if (toValue) setToDT(toValue);

        setDestination(payload.pcar_dest ?? '');
        setPurpose(payload.pcar_purp ?? '');
        setRequirements(parseRequirementFlags(payload.pcar_opt));

        const passengerList =
          Array.isArray(payload.passenger)
            ? payload.passenger.map((p: any) => ({
                ramco_id: p?.ramco_id || p?.ramcoId || String(p?.id ?? ''),
                full_name: p?.full_name || p?.name || p?.ramco_id || '',
              }))
            : [];
        setPassengers(passengerList.filter((p) => p.ramco_id));
        setPassengerPick('');
        const passRaw = payload.pass ?? '';
        setGuestNotes(passRaw && passRaw !== '-' ? String(passRaw) : '');
        setAgree(true);
      })
      .catch(() => {
        if (!cancelled) toast.error('Failed to load poolcar application details');
      })
      .finally(() => {
        if (!cancelled) setLoadingExisting(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, parseRequirementFlags, toLocalInputValue, formatApplicationDate]);

  React.useEffect(() => {
    if (!driverOptionRef.current || !onBehalf) return;
    const option = driverOptionRef.current;
    setEmployeeOptions((prev) => {
      if (prev.some((opt) => opt.value === option.value)) return prev;
      return [...prev, option];
    });
  }, [onBehalf]);
