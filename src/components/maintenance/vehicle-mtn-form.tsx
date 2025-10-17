'use client';
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { SingleSelect, type ComboboxOption } from '@/components/ui/combobox';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
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

interface ServiceOption {
  svcTypeId: number;
  svcType: string;
  svcOpt: number;
  group_desc?: string;
}

interface ServiceHistoryRecord {
  req_id: number;
  req_date: string;
  svc_type?: Array<Pick<ServiceOption, 'svcTypeId' | 'svcType'>>;
  req_comment?: string | null;
}

interface AssessmentSummary {
  assess_id: number;
  a_ncr: number;
  a_date: string;
}

interface AssessmentDetail {
  adt_id: number;
  qset_desc?: string;
  qset_type?: string;
  adt_ncr?: number;
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

function extractServiceTypeId(value: unknown): number | null {
  if (typeof value === 'number') return value;
  if (value && typeof value === 'object') {
    const record = value as { svcTypeId?: unknown; id?: unknown };
    if (typeof record.svcTypeId === 'number') return record.svcTypeId;
    if (typeof record.id === 'number') return record.id;
  }
  return null;
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
  const [serviceOptions, setServiceOptions] = React.useState<ServiceOption[]>([]);
  const [serviceOptionsLoading, setServiceOptionsLoading] = React.useState<boolean>(false);
  const [selectedServiceTypeIds, setSelectedServiceTypeIds] = React.useState<number[]>([]);
  const [remarks, setRemarks] = React.useState<string>('');
  const [attachments, setAttachments] = React.useState<File[]>([]);
  const [serviceOptionsError, setServiceOptionsError] = React.useState<string | null>(null);
  const [serviceHistory, setServiceHistory] = React.useState<ServiceHistoryRecord[]>([]);
  const [serviceHistoryLoading, setServiceHistoryLoading] = React.useState<boolean>(false);
  const [serviceHistoryError, setServiceHistoryError] = React.useState<string | null>(null);
  const [assessmentSummaries, setAssessmentSummaries] = React.useState<AssessmentSummary[]>([]);
  const [assessmentDetails, setAssessmentDetails] = React.useState<AssessmentDetail[]>([]);
  const [assessmentLoading, setAssessmentLoading] = React.useState<boolean>(false);
  const [assessmentError, setAssessmentError] = React.useState<string | null>(null);
  const currentYear = React.useMemo(() => new Date().getFullYear(), []);

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
          if (Array.isArray(data.svc_type)) {
            const svcSelections: number[] = [];
            data.svc_type.forEach((item: unknown) => {
              const svcId = extractServiceTypeId(item);
              if (typeof svcId === 'number') svcSelections.push(svcId);
            });
            setSelectedServiceTypeIds(svcSelections);
          }
        }

        // Prefill remarks if available
        const existingRemarks = data?.req_comment || data?.description || '';
        if (existingRemarks) setRemarks(existingRemarks);
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

  // Fetch service options
  React.useEffect(() => {
    let cancelled = false;

    const fetchServiceOptions = async () => {
      setServiceOptionsLoading(true);
      setServiceOptionsError(null);
      try {
        const res: any = await authenticatedApi.get('/api/mtn/types');
        if (cancelled) return;
        const payload = res?.data?.data ?? res?.data ?? [];
        if (Array.isArray(payload)) {
          setServiceOptions(payload as ServiceOption[]);
        } else {
          setServiceOptions([]);
        }
      } catch {
        if (!cancelled) {
          setServiceOptions([]);
          setServiceOptionsError('Unable to load service options');
        }
      } finally {
        if (!cancelled) setServiceOptionsLoading(false);
      }
    };

    fetchServiceOptions();

    return () => { cancelled = true; };
  }, []);

  // Fetch service history for selected asset
  React.useEffect(() => {
    if (!assetId) {
      setServiceHistory([]);
      setServiceHistoryError(null);
      setServiceHistoryLoading(false);
      setAssessmentSummaries([]);
      setAssessmentDetails([]);
      setAssessmentError(null);
      setAssessmentLoading(false);
      return;
    }

    const numericAssetId = Number(assetId);
    if (Number.isNaN(numericAssetId)) {
      setServiceHistory([]);
      setServiceHistoryError(null);
      setServiceHistoryLoading(false);
      setAssessmentSummaries([]);
      setAssessmentDetails([]);
      setAssessmentError(null);
      setAssessmentLoading(false);
      return;
    }

    let cancelled = false;

    const fetchServiceHistory = async () => {
      setServiceHistoryLoading(true);
      setServiceHistoryError(null);
      try {
        const res: any = await authenticatedApi.get(`/api/mtn/request/record/${numericAssetId}`);
        if (cancelled) return;
        const payload = res?.data?.data ?? res?.data ?? [];
        if (Array.isArray(payload)) {
          setServiceHistory(payload as ServiceHistoryRecord[]);
        } else if (!cancelled) {
          setServiceHistory([]);
        }
      } catch {
        if (!cancelled) {
          setServiceHistory([]);
          setServiceHistoryError('Unable to load service history');
        }
      } finally {
        if (!cancelled) setServiceHistoryLoading(false);
      }
    };

    const fetchAssessments = async () => {
      setAssessmentLoading(true);
      setAssessmentError(null);
      setAssessmentSummaries([]);
      setAssessmentDetails([]);
      try {
        const res: any = await authenticatedApi.get(`/api/compliance/assessments?asset=${numericAssetId}&year=${currentYear}`);
        if (cancelled) return;
        const payload = res?.data?.data ?? res?.data ?? [];
        if (Array.isArray(payload)) {
          setAssessmentSummaries(payload as AssessmentSummary[]);
          const ncrAssessments = payload.filter((item: any) => Number(item?.a_ncr) > 0);
          if (ncrAssessments.length > 0) {
            const detailResults: AssessmentDetail[] = [];
            for (const assess of ncrAssessments) {
              if (cancelled) return;
              const assessId = assess?.assess_id;
              if (!assessId) continue;
              try {
                const detailRes: any = await authenticatedApi.get(`/api/compliance/assessments/${assessId}`);
                if (cancelled) return;
                const detailPayload = detailRes?.data?.details ?? detailRes?.data?.data ?? [];
                if (Array.isArray(detailPayload)) {
                  detailPayload.forEach((detail: any) => {
                    if (!detail || typeof detail !== 'object') return;
                    const type = (detail as any).qset_type;
                    const ncrValue = Number((detail as any).adt_ncr);
                    if ((type === 'NCR' || type === 'ncr') && ncrValue > 0) {
                      detailResults.push(detail as AssessmentDetail);
                    }
                  });
                }
              } catch {
                // ignore detail fetch failure for individual assessment
              }
            }
            if (!cancelled) {
              setAssessmentDetails(detailResults);
            }
          } else if (!cancelled) {
            setAssessmentDetails([]);
          }
        } else if (!cancelled) {
          setAssessmentSummaries([]);
          setAssessmentDetails([]);
        }
      } catch {
        if (!cancelled) {
          setAssessmentSummaries([]);
          setAssessmentDetails([]);
          setAssessmentError('Unable to load assessment data');
        }
      } finally {
        if (!cancelled) setAssessmentLoading(false);
      }
    };

    fetchServiceHistory();
    fetchAssessments();

    return () => { cancelled = true; };
  }, [assetId, currentYear]);

  const groupedServiceOptions = React.useMemo(() => {
    if (!serviceOptions.length) return [];
    const groups = new Map<number, { label: string; items: ServiceOption[] }>();
    serviceOptions.forEach((option) => {
      const group = groups.get(option.svcOpt);
      if (group) {
        group.items.push(option);
      } else {
        groups.set(option.svcOpt, {
          label: option.group_desc || '',
          items: [option],
        });
      }
    });
    return Array.from(groups.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([key, value]) => ({ key, ...value }));
  }, [serviceOptions]);

  const handleServiceOptionToggle = React.useCallback((svcTypeId: number, checked: boolean) => {
    setSelectedServiceTypeIds((prev) => {
      if (checked) {
        if (prev.includes(svcTypeId)) return prev;
        return [...prev, svcTypeId];
      }
      return prev.filter((idVal) => idVal !== svcTypeId);
    });
  }, []);

  const handleAttachmentChange = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files ? Array.from(event.target.files) : [];
    setAttachments(files);
  }, []);

  return (
    <div className="p-2">
      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3 flex flex-col">
          <CardHeader>
            <CardTitle>
              {id ? `Vehicle Maintenance Request #${id}` : 'Create Vehicle Maintenance Request'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 flex-1">
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

            {/* Service Options */}
            <div className="space-y-3">
              <div className="font-semibold">Service Options</div>
              {serviceOptionsLoading ? (
                <div className="text-sm text-muted-foreground">Loading service options...</div>
              ) : serviceOptionsError ? (
                <div className="text-sm text-red-600">{serviceOptionsError}</div>
              ) : groupedServiceOptions.length === 0 ? (
                <div className="text-sm text-muted-foreground">No service options available.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {groupedServiceOptions.map(({ key, label, items }) => (
                    <div key={key} className="space-y-3 rounded-lg border border-border bg-card p-4 shadow-sm">
                      <div className="flex items-center justify-between text-sm font-semibold text-foreground">
                        <span>{label || 'Service Level'}</span>
                        <span className="text-xs font-normal text-muted-foreground">Option {key}</span>
                      </div>
                      <div className="space-y-1">
                        {items.map((option) => (
                          <label
                            key={option.svcTypeId}
                            htmlFor={`svc-option-${option.svcTypeId}`}
                            className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-muted/40 transition-colors"
                          >
                            <Checkbox
                              id={`svc-option-${option.svcTypeId}`}
                              checked={selectedServiceTypeIds.includes(option.svcTypeId)}
                              onCheckedChange={(checked) => handleServiceOptionToggle(option.svcTypeId, Boolean(checked))}
                            />
                            <span className="text-sm">{option.svcType}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* Remarks & Attachments */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vehicle-mtn-remarks">Remarks</Label>
                <Textarea
                  id="vehicle-mtn-remarks"
                  placeholder="Add any remarks for this request"
                  value={remarks}
                  onChange={(event) => setRemarks(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vehicle-mtn-attachments">Attachments</Label>
                <Input
                  id="vehicle-mtn-attachments"
                  type="file"
                  multiple
                  onChange={handleAttachmentChange}
                />
                {attachments.length > 0 && (
                  <div className="text-sm text-muted-foreground">
                    Selected files:
                    <ul className="list-disc list-inside">
                      {attachments.map((file) => (
                        <li key={`${file.name}-${file.lastModified}`}>{file.name}</li>
                      ))}
                    </ul>
                  </div>
                )}
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

        <Card className="lg:col-span-2 flex flex-col">
          <CardHeader>
            <CardTitle>Previous Services</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 flex-1">
            <div className="space-y-3">
              {!assetId ? (
                <p className="text-sm text-muted-foreground">Select a vehicle to view previous services.</p>
              ) : serviceHistoryLoading ? (
                <p className="text-sm text-muted-foreground">Loading service history...</p>
              ) : serviceHistoryError ? (
                <p className="text-sm text-red-600">{serviceHistoryError}</p>
              ) : serviceHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground">No service records found for this vehicle.</p>
              ) : (
                <>
                  <div className="text-sm text-muted-foreground">
                    Total previous services:{' '}
                    <span className="font-semibold text-foreground">{serviceHistory.length}</span>
                  </div>
                  <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                    {serviceHistory.map((record) => (
                      <div key={record.req_id} className="rounded-md border bg-sky-100 border-border p-3">
                        <div className="flex items-center justify-between text-sm font-semibold">
                          <span>Request #{record.req_id}</span>
                          <span className="text-xs font-normal text-muted-foreground">
                            {formatDMY(record.req_date)}
                          </span>
                        </div>
                        {record.svc_type && record.svc_type.length > 0 && (
                          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                            {record.svc_type.map((svc) => (
                              <li key={`${record.req_id}-${svc.svcTypeId ?? svc.svcType}`}>{svc.svcType}</li>
                            ))}
                          </ul>
                        )}
                        {record.req_comment && (
                          <p className="mt-2 text-xs text-muted-foreground">Comment: {record.req_comment}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="text-sm font-semibold text-foreground">NCR Findings ({currentYear})</div>
              {!assetId ? (
                <p className="text-sm text-muted-foreground">Select a vehicle to check NCR compliance.</p>
              ) : assessmentLoading ? (
                <p className="text-sm text-muted-foreground">Checking compliance assessments...</p>
              ) : assessmentError ? (
                <p className="text-sm text-red-600">{assessmentError}</p>
              ) : assessmentDetails.length > 0 ? (
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  {assessmentDetails.map((detail, index) => (
                    <li key={`ncr-detail-${detail.adt_id ?? index}`}>
                      {detail.qset_desc || 'NCR Issue'}
                    </li>
                  ))}
                </ul>
              ) : assessmentSummaries.length > 0 ? (
                <p className="text-sm text-muted-foreground">
                  Assessments found for {currentYear}, no NCR issues reported.
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No compliance assessments found for {currentYear}.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VehicleMtnForm;
