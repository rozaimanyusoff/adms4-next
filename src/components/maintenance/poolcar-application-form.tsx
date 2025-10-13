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
import { AuthContext } from '@/store/AuthContext';
import { authenticatedApi } from '@/config/api';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

interface PoolcarApplicationFormProps {
  id?: number | string | null;
  onClose?: () => void;
  onSubmitted?: () => void;
}

const PoolcarApplicationForm: React.FC<PoolcarApplicationFormProps> = ({ id, onClose, onSubmitted }) => {
  const auth = React.useContext(AuthContext);
  const user = auth?.authData?.user;

  const [submitting, setSubmitting] = React.useState(false);
  const [agree, setAgree] = React.useState(false);

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
  const [fromDT, setFromDT] = React.useState<string>(now.toISOString().slice(0, 16)); // yyyy-MM-ddTHH:mm
  const [toDT, setToDT] = React.useState<string>(twoHoursLater.toISOString().slice(0, 16));

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
    const start = new Date(fromDT);
    const end = new Date(toDT);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) return { days: 0, hours: 0 };
    const diffMs = end.getTime() - start.getTime();
    const days = Math.floor(diffMs / (24 * 3600 * 1000));
    const hours = Math.ceil((diffMs % (24 * 3600 * 1000)) / (3600 * 1000));
    return { days, hours };
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

  const disabled = submitting;

  const handleSubmit = async () => {
    if (!agree) { toast.error('You must agree to the terms before submitting.'); return; }
    const start = new Date(fromDT); const end = new Date(toDT);
    if (!(start < end)) { toast.error('Trip end must be after start.'); return; }
    setSubmitting(true);
    try {
      // Build payload structure (stub to be refined once backend is ready)
      const payload = {
        requestor: {
          ramco_id: requestor.ramco_id,
          full_name: requestor.name,
          contact: requestor.contact,
          department_id: requestor?.department?.id,
          location_id: requestor?.location?.id,
        },
        booking_option: bookingOption,
        onbehalf_ramco: bookingOption === 'onbehalf' ? onBehalf : undefined,
        poolcar_type_id: poolcarType ? Number(poolcarType) : undefined,
        trip_from: start.toISOString(),
        trip_to: end.toISOString(),
        origin: requestor?.location?.name || '',
        destination,
        purpose,
        requirements,
        passengers: passengers.map(p => ({ ramco_id: p.ramco_id, full_name: p.full_name })),
        guest_notes: guestNotes,
      };

      // await authenticatedApi.post('/api/mtn/poolcars', payload)
      await new Promise((r) => setTimeout(r, 600));
      toast.success('Poolcar application created (draft)');
      onSubmitted?.();
      onClose?.();
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
                <Input readOnly value={requestor?.location?.name || ''} />
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
                <Label>On-Behalf</Label>
                <SingleSelect
                  options={employeeOptions}
                  value={onBehalf}
                  onValueChange={setOnBehalf}
                  disabled={bookingOption !== 'onbehalf'}
                  placeholder="Select employee"
                />
              </div>
              <div className="md:col-span-1">
                <Label>Poolcar Type</Label>
                <SingleSelect
                  options={poolcarTypeOptions}
                  value={poolcarType}
                  onValueChange={setPoolcarType}
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
                    const now = new Date();
                    setFromDT(now.toISOString().slice(0,16));
                  }}
                >
                  Today
                </button>
              </Label>
              <Input type="datetime-local" value={fromDT} onChange={e => setFromDT(e.target.value)} />
            </div>
            <div>
              <Label className="flex items-center justify-between">
                <span>Trip End (Date/Time)</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="text-xs text-primary hover:underline"
                    onClick={() => {
                      const base = new Date(fromDT || new Date());
                      const end = new Date(base.getTime() + 2 * 3600 * 1000);
                      setToDT(end.toISOString().slice(0,16));
                    }}
                  >
                    +2h
                  </button>
                  <button
                    type="button"
                    className="text-xs text-primary hover:underline"
                    onClick={() => {
                      const now = new Date();
                      setToDT(now.toISOString().slice(0,16));
                    }}
                  >
                    Today
                  </button>
                </div>
              </Label>
              <Input type="datetime-local" value={toDT} min={fromDT} onChange={e => setToDT(e.target.value)} />
            </div>
            <div>
              <Label className="flex items-center justify-between">
                <span>Duration</span>
                <button
                  type="button"
                  className="text-xs text-primary hover:underline"
                  onClick={() => {
                    // Emulate a picker 'Done' by blurring any focused element
                    const el = document.activeElement as HTMLElement | null;
                    try { el?.blur(); } catch {}
                  }}
                >
                  Done
                </button>
              </Label>
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
    </div>
  );
};

export default PoolcarApplicationForm;
