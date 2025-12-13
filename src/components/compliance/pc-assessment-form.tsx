"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SingleSelect, type ComboboxOption } from "@/components/ui/combobox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { authenticatedApi } from "@/config/api";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

type DeviceType = "laptop" | "desktop" | "tablet";
type ChecklistStatus = "pass" | "issue" | "na";

interface ChecklistItem {
  key: string;
  label: string;
  helper?: string;
}

type ChecklistRenderer = (
  item: ChecklistItem,
  checklist: ChecklistMap,
  setter: React.Dispatch<React.SetStateAction<ChecklistMap>>
) => React.ReactNode;

type PortKey =
  | "usbA"
  | "usbC"
  | "thunderbolt"
  | "ethernet"
  | "hdmi"
  | "displayPort"
  | "vga"
  | "sdCard"
  | "audioJack";

const portOptions: { key: PortKey; label: string }[] = [
  { key: "usbA", label: "USB-A" },
  { key: "usbC", label: "USB-C" },
  { key: "thunderbolt", label: "Thunderbolt" },
  { key: "ethernet", label: "Ethernet" },
  { key: "hdmi", label: "HDMI" },
  { key: "displayPort", label: "DisplayPort" },
  { key: "vga", label: "VGA" },
  { key: "sdCard", label: "SD/microSD" },
  { key: "audioJack", label: "3.5mm audio" },
];

interface FormState {
  assessmentYear: string;
  assessmentDate: string;
  deviceType: DeviceType;
  manufacturer: string;
  model: string;
  serialNumber: string;
  owner: string;
  costCenter: string;
  purchaseDate: string;
  location: string;
  department: string;
  osName: string;
  osVersion: string;
  antivirus: string;
  remoteTools: string;
  criticalSoftware: string;
  installedSoftware: string;
  notes: string;
  technician: string;
}

interface ChecklistMap {
  [key: string]: { status: ChecklistStatus; notes: string };
}

const hardwareItems: ChecklistItem[] = [
  { key: "cpu", label: "CPU", helper: "Model, generation, and key specs" },
  { key: "memory", label: "Memory", helper: "Type (DDR4, DDR5, etc.) and total size" },
  { key: "storage", label: "Storage", helper: "Drive type (HDD/SSD), form factor, size" },
  { key: "graphics", label: "Graphics", helper: "Integrated/dedicated, model, ports, VRAM" },
  { key: "display", label: "Display", helper: "Panel type, form factor, resolution, size" },
  { key: "ports", label: "Ports", helper: "Tick available USB, network, display, SD, audio" },
  { key: "battery", label: "Battery", helper: "Check if equipped; capacity and status" },
  { key: "adapter", label: "Adapter", helper: "Check if equipped; output voltage & wattage" },
];

const softwareItems: ChecklistItem[] = [
  { key: "osPatch", label: "OS patched", helper: "Latest updates applied" },
  { key: "avEdR", label: "AV/EDR active", helper: "Definitions up to date" },
  { key: "vpn", label: "VPN/Remote access", helper: "Client installed and tested" },
  { key: "mgmt", label: "Device management", helper: "MDM/RMM agent healthy" },
  { key: "backup", label: "Backup/Sync", helper: "OneDrive/Drive/backup policy" },
  { key: "office", label: "Productivity suite", helper: "License status recorded" },
];

const statusLabel: Record<ChecklistStatus, string> = {
  pass: "Pass",
  issue: "Issue",
  na: "N/A",
};

const buildChecklist = (items: ChecklistItem[]): ChecklistMap =>
  items.reduce<ChecklistMap>((acc, item) => {
    acc[item.key] = { status: "pass", notes: "" };
    return acc;
  }, {});

const today = new Date();
const todayStr = today.toISOString().slice(0, 10);

const PcAssessmentForm: React.FC = () => {
  const currentYear = String(today.getFullYear());
  const searchParams = useSearchParams();

  const [form, setForm] = useState<FormState>({
    assessmentYear: currentYear,
    assessmentDate: todayStr,
    deviceType: "laptop",
    manufacturer: "",
    model: "",
    serialNumber: "",
    owner: "",
    costCenter: "",
    purchaseDate: "",
    location: "",
    department: "",
    osName: "",
    osVersion: "",
    antivirus: "",
    remoteTools: "",
    criticalSoftware: "",
    installedSoftware: "",
    notes: "",
    technician: "",
  });
  const [costCenterOptions, setCostCenterOptions] = useState<ComboboxOption[]>([]);
  const [departmentOptions, setDepartmentOptions] = useState<ComboboxOption[]>([]);
  const [locationOptions, setLocationOptions] = useState<ComboboxOption[]>([]);
  const [ownerOptions, setOwnerOptions] = useState<ComboboxOption[]>([]);

  const [hardwareChecklist, setHardwareChecklist] = useState<ChecklistMap>(() =>
    buildChecklist(hardwareItems)
  );
  const [softwareChecklist, setSoftwareChecklist] = useState<ChecklistMap>(() =>
    buildChecklist(softwareItems)
  );
  const [portChecks, setPortChecks] = useState<Record<PortKey, boolean>>(
    () =>
      portOptions.reduce(
        (acc, opt) => {
          acc[opt.key] = false;
          return acc;
        },
        {} as Record<PortKey, boolean>
      )
  );
  const [batteryEquipped, setBatteryEquipped] = useState(false);
  const [batteryCapacity, setBatteryCapacity] = useState("");
  const [adapterEquipped, setAdapterEquipped] = useState(false);
  const [adapterOutput, setAdapterOutput] = useState("");

  const completionScore = useMemo(() => {
    const totalItems = hardwareItems.length + softwareItems.length;
    const completed =
      Object.values(hardwareChecklist).filter((i) => !!i.status).length +
      Object.values(softwareChecklist).filter((i) => !!i.status).length;
    return Math.round((completed / totalItems) * 100);
  }, [hardwareChecklist, softwareChecklist]);

  const updateForm = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const updateChecklistItem = (
    key: string,
    checklist: ChecklistMap,
    setter: React.Dispatch<React.SetStateAction<ChecklistMap>>,
    partial: Partial<ChecklistMap[string]>
  ) => {
    setter((prev) => ({
      ...prev,
      [key]: { status: prev[key]?.status ?? "pass", notes: prev[key]?.notes ?? "", ...partial },
    }));
  };

  const togglePort = (key: PortKey) => {
    setPortChecks((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const mapDeviceType = React.useCallback(
    (input?: string | null): DeviceType => {
      const normalized = (input ?? "").toLowerCase();
      if (normalized.includes("laptop") || normalized.includes("notebook")) return "laptop";
      if (normalized.includes("desktop") || normalized.includes("pc")) return "desktop";
      if (normalized.includes("tablet") || normalized.includes("pad")) return "tablet";
      return form.deviceType;
    },
    [form.deviceType]
  );

  const handleSerialChange = (value: string) => {
    updateForm("serialNumber", value);
  };

  const handleSerialSelect = (asset: any) => {
    // Legacy hook no longer used once id-driven prefill is active.
    updateForm("serialNumber", asset?.register_number || "");
  };

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [cc, dept, loc, owners] = await Promise.all([
          authenticatedApi.get("/api/assets/costcenters").catch(() => ({ data: [] })),
          authenticatedApi.get("/api/assets/departments").catch(() => ({ data: [] })),
          authenticatedApi.get("/api/assets/locations").catch(() => ({ data: [] })),
          authenticatedApi.get("/api/assets/employees").catch(() => ({ data: [] })),
        ]);
        const mapOptions = (arr: any): ComboboxOption[] =>
          (Array.isArray(arr) ? arr : arr?.data || []).map((item: any) => ({
            value: String(item.id ?? item.code ?? item.name ?? ""),
            label: item.name ?? item.full_name ?? item.code ?? "",
          })).filter((it: ComboboxOption) => it.label);
        const mapOwnerOptions = (arr: any): ComboboxOption[] =>
          (Array.isArray(arr) ? arr : arr?.data || []).map((item: any) => ({
            value: String(item.ramco_id ?? item.id ?? item.full_name ?? ""),
            label: item.full_name ?? item.name ?? item.ramco_id ?? "",
          })).filter((it: ComboboxOption) => it.label && it.value);
        setCostCenterOptions(mapOptions(cc.data));
        setDepartmentOptions(mapOptions(dept.data));
        setLocationOptions(mapOptions(loc.data));
        setOwnerOptions(mapOwnerOptions(owners.data));
      } catch {
        // keep inputs usable if lookups fail
      }
    };
    loadOptions();
  }, []);

  useEffect(() => {
    const id = searchParams.get("id");
    if (!id) return;
    const loadAsset = async () => {
      try {
        const res: any = await authenticatedApi.get(`/api/assets/${id}`);
        const asset = res?.data?.data ?? res?.data ?? {};
        const primaryOwner = Array.isArray(asset.owner) ? asset.owner[0] : asset.owner;
        setForm((prev) => ({
          ...prev,
          deviceType: mapDeviceType(asset?.category?.name ?? asset?.type?.name ?? prev.deviceType),
          manufacturer: asset?.brand?.name ?? prev.manufacturer,
          model: asset?.model?.name ?? prev.model,
          serialNumber: asset?.register_number ?? asset?.specs?.serial_number ?? prev.serialNumber,
          owner:
            primaryOwner?.ramco_id ??
            primaryOwner?.name ??
            primaryOwner?.full_name ??
            prev.owner,
          costCenter:
            (asset?.costcenter?.id && String(asset.costcenter.id)) ??
            asset?.costcenter?.name ??
            prev.costCenter,
          purchaseDate: asset?.purchase_date ? (asset.purchase_date as string).slice(0, 10) : prev.purchaseDate,
          location:
            (typeof primaryOwner?.location === "string" && primaryOwner.location) ||
            (typeof asset?.location?.name === "string" && asset.location.name) ||
            prev.location,
          department:
            primaryOwner?.department?.name ??
            primaryOwner?.department ??
            (typeof asset?.department?.name === "string" ? asset.department.name : prev.department),
          osName: asset?.specs?.os ?? prev.osName,
          osVersion: asset?.specs?.os_version ?? prev.osVersion,
        }));
      } catch (err) {
        toast.error("Failed to prefill assessment");
      }
    };
    loadAsset();
  }, [mapDeviceType, searchParams]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.osName || !form.technician) {
      toast.error("Please complete OS and technician fields.");
      return;
    }
    const payload = {
      ...form,
      hardwareChecklist,
      softwareChecklist,
      portChecks,
      batteryEquipped,
      batteryCapacity,
      adapterEquipped,
      adapterOutput,
      lastSavedAt: new Date().toISOString(),
    };
    // No backend endpoint provided yet; surface the payload for technicians.
    console.table(payload);
    toast.success("PC assessment saved locally. Ready for annual record keeping.");
  };

  const handleReset = () => {
    setForm((prev) => ({
      ...prev,
      manufacturer: "",
      model: "",
      serialNumber: "",
      owner: "",
      costCenter: "",
      purchaseDate: "",
      location: "",
      department: "",
      osName: "",
      osVersion: "",
      antivirus: "",
      remoteTools: "",
      criticalSoftware: "",
      installedSoftware: "",
      notes: "",
      technician: "",
    }));
    setPortChecks(
      portOptions.reduce(
        (acc, opt) => {
          acc[opt.key] = false;
          return acc;
        },
        {} as Record<PortKey, boolean>
      )
    );
    setBatteryEquipped(false);
    setBatteryCapacity("");
    setAdapterEquipped(false);
    setAdapterOutput("");
    setHardwareChecklist(buildChecklist(hardwareItems));
    setSoftwareChecklist(buildChecklist(softwareItems));
  };

  const renderStatusAndNotes = (
    key: string,
    checklist: ChecklistMap,
    setter: React.Dispatch<React.SetStateAction<ChecklistMap>>,
    notesPlaceholder?: string
  ) => (
    <>
      <Label className="text-xs text-muted-foreground">Status</Label>
      <Select
        value={checklist[key]?.status}
        onValueChange={(value: ChecklistStatus) =>
          updateChecklistItem(key, checklist, setter, { status: value })
        }
      >
        <SelectTrigger className="w-full md:w-40">
          <SelectValue placeholder="Choose status" />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(statusLabel).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Label htmlFor={`${key}-notes`} className="text-xs text-muted-foreground">
        Notes / findings
      </Label>
      <Textarea
        id={`${key}-notes`}
        value={checklist[key]?.notes ?? ""}
        onChange={(ev) => updateChecklistItem(key, checklist, setter, { notes: ev.target.value })}
        placeholder={notesPlaceholder || "Document observed issues or version details"}
        rows={2}
      />
    </>
  );

  const renderChecklist = (
    items: ChecklistItem[],
    checklist: ChecklistMap,
    setter: React.Dispatch<React.SetStateAction<ChecklistMap>>,
    customRenderers?: Record<string, ChecklistRenderer>,
    gridClassName?: string
  ) => (
    <div className={`grid gap-3 ${gridClassName ?? ""}`}>
      {items.map((item) => (
        <React.Fragment key={item.key}>
          {customRenderers?.[item.key]?.(item, checklist, setter) ?? (
            <div className="rounded-lg border bg-muted/40 p-3 md:flex md:items-start md:justify-between md:gap-4">
              <div className="space-y-1 md:w-1/2">
                <p className="font-medium leading-tight">{item.label}</p>
                {item.helper ? (
                  <p className="text-sm text-muted-foreground">{item.helper}</p>
                ) : null}
              </div>
              <div className="mt-3 flex flex-1 flex-col gap-2 md:mt-0">
                {renderStatusAndNotes(item.key, checklist, setter)}
              </div>
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );

  const hardwareCustomRenderers: Record<string, ChecklistRenderer> = {
    ports: (item, checklist, setter) => (
      <div className="rounded-lg border bg-muted/40 p-3 md:flex md:items-start md:justify-between md:gap-4">
        <div className="space-y-1 md:w-1/2">
          <p className="font-medium leading-tight">{item.label}</p>
          {item.helper ? <p className="text-sm text-muted-foreground">{item.helper}</p> : null}
        </div>
        <div className="mt-3 flex flex-1 flex-col gap-3 md:mt-0">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Ports present</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {portOptions.map((opt) => (
                <label
                  key={opt.key}
                  className="flex items-center gap-2 rounded-md border bg-background px-2 py-1.5 text-sm"
                >
                  <Checkbox
                    checked={portChecks[opt.key]}
                    onCheckedChange={() => togglePort(opt.key)}
                    id={`port-${opt.key}`}
                  />
                  <span className="leading-tight">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex flex-1 flex-col gap-2">{renderStatusAndNotes(item.key, checklist, setter)}</div>
        </div>
      </div>
    ),
    battery: (item, checklist, setter) => (
      <div className="rounded-lg border bg-muted/40 p-3 md:flex md:items-start md:justify-between md:gap-4">
        <div className="space-y-1 md:w-1/2">
          <p className="font-medium leading-tight">{item.label}</p>
          {item.helper ? <p className="text-sm text-muted-foreground">{item.helper}</p> : null}
        </div>
        <div className="mt-3 flex flex-1 flex-col gap-3 md:mt-0">
          <div className="flex flex-wrap items-center gap-3">
            <Checkbox
              id="batteryEquipped"
              checked={batteryEquipped}
              onCheckedChange={(checked) => setBatteryEquipped(Boolean(checked))}
            />
            <Label htmlFor="batteryEquipped">Battery equipped</Label>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="batteryCapacity">Capacity</Label>
              <Input
                id="batteryCapacity"
                value={batteryCapacity}
                onChange={(e) => setBatteryCapacity(e.target.value)}
                placeholder="e.g., 56 Wh, 4000 mAh"
                disabled={!batteryEquipped}
              />
            </div>
            <div className="flex flex-1 flex-col gap-2">
              {renderStatusAndNotes(item.key, checklist, setter, "Cycle count, wear level, health")}
            </div>
          </div>
        </div>
      </div>
    ),
    adapter: (item, checklist, setter) => (
      <div className="rounded-lg border bg-muted/40 p-3 md:flex md:items-start md:justify-between md:gap-4">
        <div className="space-y-1 md:w-1/2">
          <p className="font-medium leading-tight">{item.label}</p>
          {item.helper ? <p className="text-sm text-muted-foreground">{item.helper}</p> : null}
        </div>
        <div className="mt-3 flex flex-1 flex-col gap-3 md:mt-0">
          <div className="flex flex-wrap items-center gap-3">
            <Checkbox
              id="adapterEquipped"
              checked={adapterEquipped}
              onCheckedChange={(checked) => setAdapterEquipped(Boolean(checked))}
            />
            <Label htmlFor="adapterEquipped">Adapter equipped</Label>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="adapterOutput">Output</Label>
              <Input
                id="adapterOutput"
                value={adapterOutput}
                onChange={(e) => setAdapterOutput(e.target.value)}
                placeholder="e.g., 20V / 65W"
                disabled={!adapterEquipped}
              />
            </div>
            <div className="flex flex-1 flex-col gap-2">
              {renderStatusAndNotes(item.key, checklist, setter, "Cable/plug condition, matching wattage")}
            </div>
          </div>
        </div>
      </div>
    ),
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-wide text-muted-foreground">Compliance</p>
          <h1 className="text-2xl font-semibold leading-tight">PC Assessment Form</h1>
          <p className="text-sm text-muted-foreground">
            Annual IT hardware assessment for laptops, desktops, and tablets.
          </p>
        </div>
        <Link href="/compliance/pc-assessment" className="text-sm text-blue-600 hover:underline">
          ← Back to records
        </Link>
      </div>

      <Card className="border-primary/30">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between">
            Assessment Details
            <span className="text-sm font-normal text-muted-foreground">
              Completion: {completionScore}%
            </span>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Record the current year&rsquo;s assessment. Technicians should refresh specs and
            installed software during each annual cycle.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-1">
                <Label htmlFor="assessmentYear">Assessment Year</Label>
                <Input
                  id="assessmentYear"
                  type="number"
                  value={form.assessmentYear}
                  onChange={(e) => updateForm("assessmentYear", e.target.value)}
                  min="2000"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="assessmentDate">Assessment Date</Label>
                <Input
                  id="assessmentDate"
                  type="date"
                  value={form.assessmentDate}
                  onChange={(e) => updateForm("assessmentDate", e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="technician">Technician</Label>
                <Input
                  id="technician"
                  value={form.technician}
                  onChange={(e) => updateForm("technician", e.target.value)}
                  placeholder="Name of assessor"
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-1">
                <Label htmlFor="serialNumber">Serial Number</Label>
                <Input
                  id="serialNumber"
                  value={form.serialNumber}
                  onChange={(e) => handleSerialChange(e.target.value)}
                  placeholder="Serial or service tag"
                  autoComplete="off"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="deviceType">Device Type</Label>
                <Select
                  value={form.deviceType}
                  onValueChange={(value: DeviceType) => updateForm("deviceType", value)}
                >
                  <SelectTrigger id="deviceType" className="w-full">
                    <SelectValue placeholder="Select device" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="laptop">Laptop</SelectItem>
                    <SelectItem value="desktop">Desktop</SelectItem>
                    <SelectItem value="tablet">Tablet</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="manufacturer">Manufacturer</Label>
                <Input
                  id="manufacturer"
                  value={form.manufacturer}
                  onChange={(e) => updateForm("manufacturer", e.target.value)}
                  placeholder="e.g., Lenovo, Dell, Apple"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="model">Model</Label>
                <Input
                  id="model"
                  value={form.model}
                  onChange={(e) => updateForm("model", e.target.value)}
                  placeholder="Model name/number"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-1">
                <Label htmlFor="purchaseDate">Purchase Date</Label>
                <Input
                  id="purchaseDate"
                  type="date"
                  value={form.purchaseDate}
                  onChange={(e) => updateForm("purchaseDate", e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="costCenter">Cost Center</Label>
                <SingleSelect
                  options={costCenterOptions}
                  value={form.costCenter}
                  onValueChange={(v) => updateForm("costCenter", v)}
                  placeholder="Select cost center"
                  searchPlaceholder="Search cost center..."
                  clearable
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="department">Department</Label>
                <SingleSelect
                  options={departmentOptions}
                  value={form.department}
                  onValueChange={(v) => updateForm("department", v)}
                  placeholder="Select department"
                  searchPlaceholder="Search department..."
                  clearable
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="location">Location</Label>
                <SingleSelect
                  options={locationOptions}
                  value={form.location}
                  onValueChange={(v) => updateForm("location", v)}
                  placeholder="Select location"
                  searchPlaceholder="Search location..."
                  clearable
                />
              </div>
            </div>

            <div>
              <div className="space-y-1">
                <Label htmlFor="owner">Owner</Label>
                <SingleSelect
                  options={ownerOptions}
                  value={form.owner}
                  onValueChange={(v) => {
                    updateForm("owner", v);
                  }}
                  placeholder="Select owner"
                  searchPlaceholder="Search owner..."
                  clearable
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="osName">Operating System</Label>
                <Input
                  id="osName"
                  value={form.osName}
                  onChange={(e) => updateForm("osName", e.target.value)}
                  placeholder="e.g., Windows 11 Pro, macOS 14, Ubuntu 22.04"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="osVersion">OS Version</Label>
                <Input
                  id="osVersion"
                  value={form.osVersion}
                  onChange={(e) => updateForm("osVersion", e.target.value)}
                  placeholder="Version/build"
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold">Hardware Checklist</h2>
                <Badge variant="outline">Spec refresh</Badge>
              </div>
              {renderChecklist(
                hardwareItems,
                hardwareChecklist,
                setHardwareChecklist,
                hardwareCustomRenderers,
                "md:grid-cols-2"
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold">Software & Security Checklist</h2>
                <Badge variant="outline">OS & apps</Badge>
              </div>
              {renderChecklist(softwareItems, softwareChecklist, setSoftwareChecklist)}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="antivirus">Security tools</Label>
                <Input
                  id="antivirus"
                  value={form.antivirus}
                  onChange={(e) => updateForm("antivirus", e.target.value)}
                  placeholder="Antivirus/EDR, firewall, disk health tools"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="remoteTools">Remote management</Label>
                <Input
                  id="remoteTools"
                  value={form.remoteTools}
                  onChange={(e) => updateForm("remoteTools", e.target.value)}
                  placeholder="RMM/MDM agent, remote support tools"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="criticalSoftware">Critical software & versions</Label>
                <Textarea
                  id="criticalSoftware"
                  value={form.criticalSoftware}
                  onChange={(e) => updateForm("criticalSoftware", e.target.value)}
                  placeholder="Document core apps (Office, SAP, CAD, browsers, VPN clients, drivers)"
                  rows={3}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="installedSoftware">Other installed software</Label>
                <Textarea
                  id="installedSoftware"
                  value={form.installedSoftware}
                  onChange={(e) => updateForm("installedSoftware", e.target.value)}
                  placeholder="List additional utilities or note removed/unauthorized software"
                  rows={3}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="notes">Overall remarks</Label>
              <Textarea
                id="notes"
                value={form.notes}
                onChange={(e) => updateForm("notes", e.target.value)}
                placeholder="Summarize health, open issues, and planned remediation"
                rows={4}
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit">Save Assessment</Button>
              <Button type="button" variant="secondary" onClick={handleReset}>
                Reset Form
              </Button>
              <p className="text-sm text-muted-foreground">
                Saved locally for now. Attach to annual compliance record after validation.
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default PcAssessmentForm;
