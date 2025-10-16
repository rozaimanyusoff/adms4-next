'use client';
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { SingleSelect, type ComboboxOption } from '@/components/ui/combobox';
import { authenticatedApi } from '@/config/api';
import { toast } from 'sonner';
import { AuthContext } from '@/store/AuthContext';

// Users in this list will not be filtered by ?ramco
const exclusionUser: string[] = ['username1', 'username2'];

interface VehicleMtnFormProps {
  id?: number | string | null;
  onClose?: () => void;
  onSubmitted?: () => void;
}

function pad2(value: number) {
  return String(value).padStart(2, '0');
}

function formatDMY(value: string) {
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

const VehicleMtnForm: React.FC<VehicleMtnFormProps> = ({ id, onClose, onSubmitted }) => {
  const auth = React.useContext(AuthContext);
  const user = auth?.authData?.user;

  const [loading, setLoading] = React.useState<boolean>(false);
  const [existing, setExisting] = React.useState<any>(null);

  // Requestor (adapted from poolcar-application-form)
  const [requestor, setRequestor] = React.useState<any>({
    application_date: new Date().toISOString(),
    name: user?.name || '',
    ramco_id: user?.username || '',
    contact: user?.contact || '',
    department: null as any,
    location: null as any,
  });

  // Vehicle selection
  const [vehicleOptions, setVehicleOptions] = React.useState<ComboboxOption[]>([]);
  const [assetId, setAssetId] = React.useState<string>('');

  // Type of Request: 1 Car Wash, 2 Service, 3 NCR Compliance
  const [svcType, setSvcType] = React.useState<string>('');

  // Load existing record (edit mode)
  React.useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const res: any = await authenticatedApi.get(`/api/mtn/request/${id}`);
        const data = res?.data?.data ?? res?.data ?? null;
        if (cancelled) return;
        setExisting(data);

        // Prefill requestor if available
        const reqEmp = data?.requester || {};
        const dept = (data as any)?.costcenter || reqEmp?.department || null;
        const loc = reqEmp?.location || null;
        const deptNorm = dept ? { ...dept, name: (dept as any).name || (dept as any).code } : null;
        const locNorm = loc ? { ...loc, code: (loc as any).code || (loc as any).name } : null;
        setRequestor((s: any) => ({
          ...s,
          application_date: data?.req_date || s.application_date,
          name: reqEmp?.name || s.name,
          ramco_id: reqEmp?.ramco_id || s.ramco_id,
          contact: reqEmp?.contact || s.contact,
          department: deptNorm,
          location: locNorm,
        }));

        // Prefill vehicle selection
        const asset = data?.asset || data?.vehicle || null;
        if (asset?.id) setAssetId(String(asset.id));

        // Prefill svc type if available
        if (data?.svc_type) {
          // Some backends return array for service type; pick first id
          const st = Array.isArray(data.svc_type) ? (data.svc_type[0]?.id ?? data.svc_type[0]) : data.svc_type;
          if (st) setSvcType(String(st));
        }
      } catch (e) {
        if (!cancelled) toast.error('Failed to load request details');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  // Fetch requestor details (department, location, etc.) when creating
  React.useEffect(() => {
    if (id) return; // don't override in edit mode
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
      .catch(() => { /* silent */ });
  }, [id, user?.username]);

  // Fetch vehicle list for the user (respect exclusionUser)
  React.useEffect(() => {
    const username = user?.username ? String(user.username) : '';
    if (!username) { setVehicleOptions([]); return; }
    let cancelled = false;
    (async () => {
      try {
        const url = exclusionUser.includes(username)
          ? '/api/assets?type=2'
          : `/api/assets?type=2&ramco=${encodeURIComponent(username)}`;
        const res: any = await authenticatedApi.get(url);
        const payload = res?.data as any;
        const list: any[] = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.items)
            ? payload.items
            : Array.isArray(payload?.data)
              ? payload.data
              : Array.isArray(payload?.result)
                ? payload.result
                : [];
        if (!cancelled) {
          setVehicleOptions(list.map((a: any) => ({ value: String(a.id ?? a.asset_id ?? a.assetId), label: a.register_number || a.asset_no || `Asset #${a.id}` })));
        }
      } catch {
        if (!cancelled) setVehicleOptions([]);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.username]);

  return (
    <div className="p-2">
      <Card>
        <CardHeader>
          <CardTitle>
            {id ? `Vehicle Maintenance Request #${id}` : 'Create Vehicle Maintenance Request'}
          </CardTitle>
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

          {/* Vehicle + Type of Request */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
              <div>
                <Label>Vehicle</Label>
                <SingleSelect
                  options={vehicleOptions}
                  value={assetId}
                  onValueChange={setAssetId}
                  placeholder="Select vehicle"
                />
              </div>
              <div>
                <Label>Type of Request</Label>
                <RadioGroup value={svcType} onValueChange={setSvcType} className="mt-2 grid grid-cols-3 gap-2">
                  <div className="flex items-center gap-2">
                    <RadioGroupItem id="svc1" value="1" />
                    <Label htmlFor="svc1">Car Wash</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem id="svc2" value="2" />
                    <Label htmlFor="svc2">Service</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem id="svc3" value="3" />
                    <Label htmlFor="svc3">NCR Compliance</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Back</Button>
            <Button onClick={() => { /* submission to be implemented later; ensure state available */ onSubmitted?.(); onClose?.(); }} disabled={!assetId || !svcType}>
              Done
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VehicleMtnForm;
