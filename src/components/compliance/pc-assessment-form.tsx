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
import Link from "next/link";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { authenticatedApi } from "@/config/api";
import { useSearchParams, useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

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

const cpuManufacturers = [
  "Intel",
  "AMD",
  "Apple",
  "Qualcomm",
  "MediaTek",
  "Samsung",
  "HiSilicon",
  "IBM",
  "Other",
];

const memoryTypeOptions = [
  "DDR3",
  "DDR4",
  "DDR4X",
  "DDR5",
  "DDR5X",
  "LPDDR4",
  "LPDDR4X",
  "LPDDR5",
  "LPDDR5X",
  "HBM",
  "GDDR6",
  "Other",
];

const storageTypeOptions = [
  "SSD NVMe",
  "SSD SATA",
  "SSD M.2 NVMe",
  "SSD M.2 SATA",
  "HDD 2.5 inch",
  "HDD 3.5 inch",
  "eMMC",
  "UFS",
  "Other",
];

const memoryManufacturerOptions = [
  "Samsung",
  "SK hynix",
  "Micron / Crucial",
  "Kingston",
  "Corsair",
  "G.Skill",
  "TeamGroup",
  "ADATA",
  "Patriot",
  "PNY",
  "KLEVV",
  "Other",
];

const storageManufacturerOptions = [
  "Samsung",
  "Western Digital",
  "Seagate",
  "Toshiba",
  "Kioxia",
  "Crucial / Micron",
  "SK hynix",
  "Kingston",
  "SanDisk",
  "Intel",
  "Sabrent",
  "ADATA",
  "PNY",
  "Transcend",
  "Other",
];

const graphicsTypeOptions = ["Integrated/Built-in", "Add-on"];

const graphicsManufacturerOptions = [
  "Intel",
  "NVIDIA",
  "AMD",
  "Apple",
  "Qualcomm",
  "Imagination",
  "ARM Mali",
  "Other",
];

const displayManufacturerOptions = [
  "LG",
  "AUO",
  "BOE",
  "Samsung",
  "Sharp",
  "Innolux",
  "CSOT",
  "Sony",
  "Other",
];

const displayResolutionOptions = [
  "1366x768",
  "1920x1080",
  "2560x1440",
  "2560x1600",
  "2880x1800",
  "3000x2000",
  "3072x1920",
  "3200x1800",
  "3840x2160",
  "5120x2880",
  "Other",
];

const displaySizeOptions = [
  "13 inch",
  "14 inch",
  "15 inch",
  "16 inch",
  "17 inch",
  "21.5 inch",
  "23.8 inch",
  "24 inch",
  "27 inch",
  "32 inch",
  "Other",
];

const displayInterfaceOptions = [
  "HDMI",
  "DisplayPort",
  "Mini DisplayPort",
  "USB-C",
  "Thunderbolt",
  "VGA",
  "DVI",
];

const displayFormFactorOptions = [
  "Standard",
  "Ultrawide",
  "Curved",
  "Touch",
  "Portable",
  "Other",
];

const osOptions = ["Windows", "macOS", "Ubuntu", "Fedora", "Debian", "Other"];

const osVersionOptions = [
  "11 Pro",
  "11 Home",
  "10 Pro",
  "Ventura",
  "Sonoma",
  "22.04",
  "24.04",
  "Other",
];

const osPatchOptions = ["Updated", "Not updated", "Failed"];
const avActiveOptions = ["Active", "Not active"];
const avLicenseOptions = ["Valid", "Expired"];
const installStatusOptions = ["Installed", "Not installed"];
const avVendors = ["ESET", "Sophos", "CrowdStrike", "Microsoft Defender", "Other"];
const vpnSetupTypes = ["SSL", "IPSec", "Other"];
const productivitySuiteOptions = [
  "Microsoft 365",
  "Office 2019/2021",
  "Google Workspace",
  "LibreOffice",
  "WPS Office",
  "Other",
];

const specificSoftwareOptions = [
  "PDF editor (Adobe/others)",
  "AutoCAD",
  "SolidWorks",
  "Photoshop",
  "Illustrator",
  "Video editor",
  "Other",
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
  overallScore: number;
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
  { key: "power", label: "Power Supply", helper: "Battery and adapter availability and specs" },
];

const softwareItems: ChecklistItem[] = [
  { key: "osPatch", label: "OS patched", helper: "Latest updates applied" },
  { key: "avEdR", label: "AV/EDR active", helper: "Definitions up to date" },
  { key: "vpn", label: "VPN/Remote access", helper: "Client installed and tested" },
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
  const router = useRouter();

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
    overallScore: 3,
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
  const [portCounts, setPortCounts] = useState<Record<PortKey, string>>(
    () =>
      portOptions.reduce(
        (acc, opt) => {
          acc[opt.key] = "";
          return acc;
        },
        {} as Record<PortKey, string>
      )
  );
  const [batteryEquipped, setBatteryEquipped] = useState(false);
  const [batteryCapacity, setBatteryCapacity] = useState("");
  const [adapterEquipped, setAdapterEquipped] = useState(false);
  const [adapterOutput, setAdapterOutput] = useState("");
  const [cpuManufacturer, setCpuManufacturer] = useState("");
  const [cpuModel, setCpuModel] = useState("");
  const [cpuGeneration, setCpuGeneration] = useState("");
  const [memoryType, setMemoryType] = useState("");
  const [memorySize, setMemorySize] = useState("0");
  const [memoryManufacturer, setMemoryManufacturer] = useState("");
  const [storageType, setStorageType] = useState("");
  const [storageSize, setStorageSize] = useState("0");
  const [storageManufacturer, setStorageManufacturer] = useState("");
  const [graphicsType, setGraphicsType] = useState("");
  const [graphicsManufacturer, setGraphicsManufacturer] = useState("");
  const [graphicsSpecs, setGraphicsSpecs] = useState("");
  const [displayManufacturer, setDisplayManufacturer] = useState("");
  const [displaySize, setDisplaySize] = useState("");
  const [displayResolution, setDisplayResolution] = useState("");
  const [displayInterfaces, setDisplayInterfaces] = useState<string[]>([]);
  const [displayFormFactor, setDisplayFormFactor] = useState("");
  const [osPatchStatus, setOsPatchStatus] = useState("");
  const [avActiveStatus, setAvActiveStatus] = useState("");
  const [avLicenseStatus, setAvLicenseStatus] = useState("");
  const [vpnInstalledStatus, setVpnInstalledStatus] = useState("");
  const [avInstalledStatus, setAvInstalledStatus] = useState("");
  const [avVendor, setAvVendor] = useState("");
  const [vpnSetupType, setVpnSetupType] = useState("");
  const [vpnUsername, setVpnUsername] = useState("");
  const [productivitySuites, setProductivitySuites] = useState<string[]>([]);
  const [specificSoftware, setSpecificSoftware] = useState<string[]>([]);
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<string | null>(null);

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

  const detectCpuManufacturer = (value?: string | null) => {
    if (!value) return "";
    const normalized = value.toLowerCase();
    if (normalized.includes("intel")) return "Intel";
    if (normalized.includes("amd")) return "AMD";
    if (normalized.includes("apple")) return "Apple";
    if (normalized.includes("qualcomm")) return "Qualcomm";
    if (normalized.includes("mediatek")) return "MediaTek";
    if (normalized.includes("samsung")) return "Samsung";
    if (normalized.includes("hisilicon")) return "HiSilicon";
    if (normalized.includes("ibm")) return "IBM";
    return "";
  };

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
        const cpuString = asset?.specs?.cpu ?? asset?.specs?.processor ?? "";
        const detectedCpuMfr = detectCpuManufacturer(cpuString);
        const memorySpec = asset?.specs?.memory ?? asset?.specs?.ram;
        const storageSpec = asset?.specs?.storage ?? asset?.specs?.hdd;
        const graphicsSpec = asset?.specs?.graphics ?? asset?.specs?.gpu;
        const displaySpec = asset?.specs?.display ?? asset?.specs?.screen_size;
        const displayRes = asset?.specs?.resolution;
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
        if (cpuString) {
          setCpuModel(cpuString);
        }
        if (detectedCpuMfr) {
          setCpuManufacturer(detectedCpuMfr);
        }
        if (asset?.specs?.cpu_generation) {
          setCpuGeneration(asset.specs.cpu_generation);
        }
        if (typeof memorySpec === "string") {
          setMemorySize(memorySpec);
        }
        if (typeof storageSpec === "string") {
          setStorageSize(storageSpec);
        }
        if (typeof graphicsSpec === "string") {
          setGraphicsSpecs(graphicsSpec);
          const lower = graphicsSpec.toLowerCase();
          if (lower.includes("intel")) setGraphicsManufacturer("Intel");
          else if (lower.includes("nvidia")) setGraphicsManufacturer("NVIDIA");
          else if (lower.includes("amd")) setGraphicsManufacturer("AMD");
          else if (lower.includes("qualcomm")) setGraphicsManufacturer("Qualcomm");
          else if (lower.includes("mali")) setGraphicsManufacturer("ARM Mali");
          else if (lower.includes("imagination") || lower.includes("powervr")) setGraphicsManufacturer("Imagination");
          if (lower.includes("integrated") || lower.includes("igpu") || lower.includes("apu")) {
            setGraphicsType("Integrated");
          } else if (lower.includes("add-on") || lower.includes("egpu")) {
            setGraphicsType("Add-on");
          } else {
            setGraphicsType("Dedicated");
          }
        }
        if (typeof displaySpec === "string") {
          setDisplaySize(displaySpec);
        }
        if (typeof displayRes === "string") {
          setDisplayResolution(displayRes);
        }
        if (Array.isArray(asset?.specs?.display_interfaces)) {
          setDisplayInterfaces(asset.specs.display_interfaces.filter((v: any) => typeof v === "string"));
        }
        if (typeof asset?.specs?.display_form_factor === "string") {
          setDisplayFormFactor(asset.specs.display_form_factor);
        }
      } catch (err) {
        toast.error("Failed to prefill assessment");
      }
    };
    loadAsset();
  }, [mapDeviceType, searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.osName || !form.technician) {
      toast.error("Please complete OS and technician fields.");
      return;
    }
    const assetId = searchParams.get("id");
    const toNum = (v: string | number | null | undefined) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };
    const payload = {
      assessment_year: form.assessmentYear,
      assessment_date: form.assessmentDate,
      technician: form.technician,
      overall_score: form.overallScore,
      remarks: form.notes,
      asset_id: assetId ? Number(assetId) : null,
      register_number: form.serialNumber || null,
      category: form.deviceType || null,
      brand: form.manufacturer || null,
      model: form.model || null,
      purchase_date: form.purchaseDate || null,
      costcenter_id: toNum(form.costCenter),
      department_id: toNum(form.department),
      location_id: toNum(form.location),
      ramco_id: form.owner || null,

      os_name: form.osName || null,
      os_version: form.osVersion || null,
      os_patch_status: osPatchStatus || null,

      cpu_manufacturer: cpuManufacturer || null,
      cpu_model: cpuModel || null,
      cpu_generation: cpuGeneration || null,

      memory_manufacturer: memoryManufacturer || null,
      memory_type: memoryType || null,
      memory_size_gb: toNum(memorySize) ?? 0,

      storage_manufacturer: storageManufacturer || null,
      storage_type: storageType || null,
      storage_size_gb: toNum(storageSize) ?? 0,

      graphics_type: graphicsType || null,
      graphics_manufacturer: graphicsType === "Integrated/Built-in" ? null : graphicsManufacturer || null,
      graphics_specs: graphicsSpecs || null,

      display_manufacturer: displayManufacturer || null,
      display_size: toNum(parseFloat(displaySize)) ?? null,
      display_resolution: displayResolution || null,
      display_form_factor: displayFormFactor || null,
      display_interfaces: displayInterfaces,

      ports_usb_a: toNum(portCounts.usbA) ?? 0,
      ports_usb_c: toNum(portCounts.usbC) ?? 0,
      ports_thunderbolt: toNum(portCounts.thunderbolt) ?? 0,
      ports_ethernet: toNum(portCounts.ethernet) ?? 0,
      ports_hdmi: toNum(portCounts.hdmi) ?? 0,
      ports_displayport: toNum(portCounts.displayPort) ?? 0,
      ports_vga: toNum(portCounts.vga) ?? 0,
      ports_sdcard: toNum(portCounts.sdCard) ?? 0,
      ports_audiojack: toNum(portCounts.audioJack) ?? 0,

      battery_equipped: batteryEquipped,
      battery_capacity: batteryCapacity || null,
      adapter_equipped: adapterEquipped,
      adapter_output: adapterOutput || null,

      av_installed: avInstalledStatus || null,
      av_vendor: avVendor || null,
      av_status: avActiveStatus || null,
      av_license: avLicenseStatus || null,

      vpn_installed: vpnInstalledStatus || null,
      vpn_setup_type: vpnSetupType || null,
      vpn_username: vpnUsername || null,

      installed_software: [...productivitySuites, ...specificSoftware].join(", ") || null,
    };
    try {
      const res: any = await authenticatedApi.post("/api/compliance/it-assess", payload);
      setSubmitStatus(res?.data?.status || "Submitted");
      setSubmitDialogOpen(true);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "Submission failed";
      toast.error(msg);
    }
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
      overallScore: 3,
      notes: "",
      technician: "",
    }));
    setCpuManufacturer("");
    setCpuModel("");
    setCpuGeneration("");
    setMemoryType("");
    setMemorySize("");
    setMemoryManufacturer("");
    setStorageType("");
    setStorageSize("");
    setStorageManufacturer("");
    setGraphicsType("");
    setGraphicsManufacturer("");
    setGraphicsSpecs("");
    setDisplayManufacturer("");
    setDisplaySize("");
    setDisplayResolution("");
    setDisplayInterfaces([]);
    setDisplayFormFactor("");
    setOsPatchStatus("");
    setAvActiveStatus("");
    setAvLicenseStatus("");
    setVpnInstalledStatus("");
    setAvInstalledStatus("");
    setAvVendor("");
    setVpnSetupType("");
    setVpnUsername("");
    setProductivitySuites([]);
    setSpecificSoftware([]);
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
    setPortCounts(
      portOptions.reduce(
        (acc, opt) => {
          acc[opt.key] = "";
          return acc;
        },
        {} as Record<PortKey, string>
      )
    );
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
    cpu: (item, checklist, setter) => (
      <div className="rounded-lg border bg-muted/40 p-3 space-y-3">
        <div className="space-y-1">
          <p className="font-medium leading-tight">{item.label}</p>
          {item.helper ? <p className="text-sm text-muted-foreground">{item.helper}</p> : null}
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1 md:flex-row md:items-center md:gap-3">
            <Label className="text-xs text-muted-foreground md:w-40">Manufacturer</Label>
            <Select
              value={cpuManufacturer || undefined}
              onValueChange={(v) => setCpuManufacturer(v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select manufacturer" />
              </SelectTrigger>
              <SelectContent>
                {cpuManufacturers.map((mfr) => (
                  <SelectItem key={mfr} value={mfr}>
                    {mfr}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1 md:flex-row md:items-center md:gap-3">
            <Label className="text-xs text-muted-foreground md:w-40">CPU Model</Label>
            <Input
              value={cpuModel}
              onChange={(e) => setCpuModel(e.target.value)}
              placeholder="e.g., i5-1240P, Ryzen 5 5600U, M2"
            />
          </div>
          <div className="flex flex-col gap-1 md:flex-row md:items-center md:gap-3">
            <Label className="text-xs text-muted-foreground md:w-40">CPU Generation</Label>
            <Input
              value={cpuGeneration}
              onChange={(e) => setCpuGeneration(e.target.value)}
              placeholder="e.g., 12th Gen, Zen 3, ARMv9"
            />
          </div>
        </div>
      </div>
    ),
    memory: (item, checklist, setter) => (
      <div className="rounded-lg border bg-muted/40 p-3 space-y-3">
        <div className="space-y-1">
          <p className="font-medium leading-tight">{item.label}</p>
          {item.helper ? <p className="text-sm text-muted-foreground">{item.helper}</p> : null}
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1 md:flex-row md:items-center md:gap-3">
            <Label className="text-xs text-muted-foreground md:w-40">Manufacturer</Label>
            <Select
              value={memoryManufacturer || undefined}
              onValueChange={(v) => setMemoryManufacturer(v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select memory manufacturer" />
              </SelectTrigger>
              <SelectContent>
                {memoryManufacturerOptions.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1 md:flex-row md:items-center md:gap-3">
            <Label className="text-xs text-muted-foreground md:w-40">Type</Label>
            <Select
              value={memoryType || undefined}
              onValueChange={(v) => setMemoryType(v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select memory type" />
              </SelectTrigger>
              <SelectContent>
                {memoryTypeOptions.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1 md:flex-row md:items-center md:gap-3">
            <Label className="text-xs text-muted-foreground md:w-40">Size</Label>
            <Input
              type="number"
              inputMode="numeric"
              min="0"
              value={memorySize}
              onChange={(e) => setMemorySize(e.target.value)}
              placeholder="e.g., 16 (GB)"
            />
          </div>
        </div>
      </div>
    ),
    storage: (item, checklist, setter) => (
      <div className="rounded-lg border bg-muted/40 p-3 space-y-3">
        <div className="space-y-1">
          <p className="font-medium leading-tight">{item.label}</p>
          {item.helper ? <p className="text-sm text-muted-foreground">{item.helper}</p> : null}
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1 md:flex-row md:items-center md:gap-3">
            <Label className="text-xs text-muted-foreground md:w-40">Manufacturer</Label>
            <Select
              value={storageManufacturer || undefined}
              onValueChange={(v) => setStorageManufacturer(v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select storage manufacturer" />
              </SelectTrigger>
              <SelectContent>
                {storageManufacturerOptions.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1 md:flex-row md:items-center md:gap-3">
            <Label className="text-xs text-muted-foreground md:w-40">Type</Label>
            <Select
              value={storageType || undefined}
              onValueChange={(v) => setStorageType(v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select storage type" />
              </SelectTrigger>
              <SelectContent>
                {storageTypeOptions.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1 md:flex-row md:items-center md:gap-3">
            <Label className="text-xs text-muted-foreground md:w-40">Size</Label>
            <Input
              type="number"
              inputMode="numeric"
              min="0"
              value={storageSize}
              onChange={(e) => setStorageSize(e.target.value)}
              placeholder="e.g., 512 (GB)"
            />
          </div>
        </div>
      </div>
    ),
    ports: (item, checklist, setter) => (
      <div className="rounded-lg border bg-muted/40 p-3 space-y-3">
        <div className="space-y-1">
          <p className="font-medium leading-tight">{item.label}</p>
          {item.helper ? <p className="text-sm text-muted-foreground">{item.helper}</p> : null}
        </div>
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Ports present</Label>
          <div className="flex flex-wrap gap-2">
            {portOptions.map((opt) => {
              const qty = portCounts[opt.key] ?? "";
              return (
                <div
                  key={opt.key}
                  className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm"
                >
                  <Checkbox
                    checked={portChecks[opt.key]}
                    onCheckedChange={() => togglePort(opt.key)}
                    id={`port-${opt.key}`}
                  />
                  <span className="leading-tight">{opt.label}</span>
                  <Input
                    type="number"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    min="0"
                    className="h-8 w-16 text-xs"
                    value={qty}
                    onChange={(e) =>
                      setPortCounts((prev) => ({ ...prev, [opt.key]: e.target.value }))
                    }
                    placeholder="Qty"
                    disabled={!portChecks[opt.key]}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    ),
    power: (item, checklist, setter) => (
      <div className="rounded-lg border bg-muted/40 p-3 space-y-3">
        <div className="space-y-1">
          <p className="font-medium leading-tight">{item.label}</p>
          {item.helper ? <p className="text-sm text-muted-foreground">{item.helper}</p> : null}
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <Checkbox
                id="batteryEquipped"
                checked={batteryEquipped}
                onCheckedChange={(checked) => setBatteryEquipped(Boolean(checked))}
              />
              <Label htmlFor="batteryEquipped">Battery equipped</Label>
            </div>
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
          </div>
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <Checkbox
                id="adapterEquipped"
                checked={adapterEquipped}
                onCheckedChange={(checked) => setAdapterEquipped(Boolean(checked))}
              />
              <Label htmlFor="adapterEquipped">Adapter equipped</Label>
            </div>
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
          </div>
        </div>
      </div>
    ),
    graphics: (item, checklist, setter) => (
      <div className="rounded-lg border bg-muted/40 p-3 space-y-3">
        <div className="space-y-1">
          <p className="font-medium leading-tight">{item.label}</p>
          {item.helper ? <p className="text-sm text-muted-foreground">{item.helper}</p> : null}
        </div>
        <div className="flex flex-col gap-3">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Type</Label>
            <RadioGroup value={graphicsType} onValueChange={(v) => setGraphicsType(v)}>
              <div className="flex flex-wrap gap-3">
                {graphicsTypeOptions.map((opt) => (
                  <label key={opt} className="inline-flex items-center gap-2">
                    <RadioGroupItem value={opt} id={`gfx-type-${opt}`} className="h-5 w-5" />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
            </RadioGroup>
          </div>
          {graphicsType && graphicsType !== "Integrated/Built-in" && (
            <>
              <div className="flex flex-col gap-1 md:flex-row md:items-center md:gap-3">
                <Label className="text-xs text-muted-foreground md:w-40">Manufacturer</Label>
                <Select
                  value={graphicsManufacturer || undefined}
                  onValueChange={(v) => setGraphicsManufacturer(v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select graphics manufacturer" />
                  </SelectTrigger>
                  <SelectContent>
                    {graphicsManufacturerOptions.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1 md:flex-row md:items-center md:gap-3">
                <Label className="text-xs text-muted-foreground md:w-40">Specs / Model</Label>
                <Input
                  value={graphicsSpecs}
                  onChange={(e) => setGraphicsSpecs(e.target.value)}
                  placeholder="e.g., RTX 3060, Radeon 6800M"
                />
              </div>
            </>
          )}
        </div>
      </div>
    ),
    display: (item, checklist, setter) => (
      <div className="rounded-lg border bg-muted/40 p-3 space-y-3">
        <div className="space-y-1">
          <p className="font-medium leading-tight">{item.label}</p>
          {item.helper ? <p className="text-sm text-muted-foreground">{item.helper}</p> : null}
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1 md:flex-row md:items-center md:gap-3">
            <Label className="text-xs text-muted-foreground md:w-40">Manufacturer</Label>
            <Select
              value={displayManufacturer || undefined}
              onValueChange={(v) => setDisplayManufacturer(v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select manufacturer" />
              </SelectTrigger>
              <SelectContent>
                {displayManufacturerOptions.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1 md:flex-row md:items-center md:gap-3">
            <Label className="text-xs text-muted-foreground md:w-40">Size</Label>
            <Select
              value={displaySize || undefined}
              onValueChange={(v) => setDisplaySize(v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select size" />
              </SelectTrigger>
              <SelectContent>
                {displaySizeOptions.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1 md:flex-row md:items-center md:gap-3">
            <Label className="text-xs text-muted-foreground md:w-40">Resolution</Label>
            <Select
              value={displayResolution || undefined}
              onValueChange={(v) => setDisplayResolution(v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select resolution" />
              </SelectTrigger>
              <SelectContent>
                {displayResolutionOptions.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1 md:flex-row md:items-center md:gap-3">
            <Label className="text-xs text-muted-foreground md:w-40">Form Factor</Label>
            <Select
              value={displayFormFactor || undefined}
              onValueChange={(v) => setDisplayFormFactor(v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select form factor" />
              </SelectTrigger>
              <SelectContent>
                {displayFormFactorOptions.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1 md:flex-row md:items-center md:gap-3">
            <Label className="text-xs text-muted-foreground md:w-40">Ports</Label>
            <div className="flex flex-wrap gap-2">
              {displayInterfaceOptions.map((opt) => {
                const checked = displayInterfaces.includes(opt);
                return (
                  <label
                    key={opt}
                    className="flex items-center gap-2 rounded-md border bg-background px-2 py-1.5 text-sm"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(v) => {
                        if (v) {
                          setDisplayInterfaces((prev) => Array.from(new Set([...prev, opt])));
                        } else {
                          setDisplayInterfaces((prev) => prev.filter((p) => p !== opt));
                        }
                      }}
                    />
                    <span className="leading-tight">{opt}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    ),
  };

  const softwareCustomRenderers: Record<string, ChecklistRenderer> = {
    osPatch: () => (
      <div className="rounded-lg border bg-muted/40 p-3 space-y-3">
        <div className="space-y-1">
          <p className="font-medium leading-tight">OS patched</p>
          <p className="text-sm text-muted-foreground">Windows Update / system updates status</p>
        </div>
        <div className="flex flex-col gap-2">
          <Label className="text-xs text-muted-foreground">Status</Label>
          <RadioGroup value={osPatchStatus} onValueChange={(v) => setOsPatchStatus(v)}>
            <div className="flex flex-wrap gap-3">
              {osPatchOptions.map((opt) => (
                <label key={opt} className="inline-flex items-center gap-2">
                  <RadioGroupItem value={opt} id={`ospatch-${opt}`} className="h-5 w-5" />
                  <span>{opt}</span>
                </label>
              ))}
            </div>
          </RadioGroup>
        </div>
      </div>
    ),
    avEdR: () => (
      <div className="rounded-lg border bg-muted/40 p-3 space-y-3">
        <div className="space-y-1">
          <p className="font-medium leading-tight">AV/EDR active</p>
          <p className="text-sm text-muted-foreground">Definitions up to date; service healthy</p>
        </div>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Installed</Label>
            <RadioGroup value={avInstalledStatus} onValueChange={(v) => setAvInstalledStatus(v)}>
              <div className="flex flex-wrap gap-3">
                {installStatusOptions.map((opt) => (
                  <label key={opt} className="inline-flex items-center gap-2">
                    <RadioGroupItem value={opt} id={`avinstall-${opt}`} className="h-5 w-5" />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
            </RadioGroup>
          </div>
          {avInstalledStatus === "Installed" && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Vendor</Label>
              <RadioGroup value={avVendor} onValueChange={(v) => setAvVendor(v)}>
                <div className="flex flex-wrap gap-3">
                  {avVendors.map((opt) => (
                    <label key={opt} className="inline-flex items-center gap-2">
                      <RadioGroupItem value={opt} id={`avvendor-${opt}`} className="h-5 w-5" />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
              </RadioGroup>
            </div>
          )}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Status</Label>
            <RadioGroup value={avActiveStatus} onValueChange={(v) => setAvActiveStatus(v)}>
              <div className="flex flex-wrap gap-3">
                {avActiveOptions.map((opt) => (
                  <label key={opt} className="inline-flex items-center gap-2">
                    <RadioGroupItem value={opt} id={`avstatus-${opt}`} className="h-5 w-5" />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
            </RadioGroup>
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">License</Label>
            <RadioGroup value={avLicenseStatus} onValueChange={(v) => setAvLicenseStatus(v)}>
              <div className="flex flex-wrap gap-3">
                {avLicenseOptions.map((opt) => (
                  <label key={opt} className="inline-flex items-center gap-2">
                    <RadioGroupItem value={opt} id={`avlicense-${opt}`} className="h-5 w-5" />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
            </RadioGroup>
          </div>
        </div>
      </div>
    ),
    vpn: () => (
      <div className="rounded-lg border bg-muted/40 p-3 space-y-3">
        <div className="space-y-1">
          <p className="font-medium leading-tight">VPN/Remote access</p>
          <p className="text-sm text-muted-foreground">Client installed and tested</p>
        </div>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Status</Label>
            <RadioGroup value={vpnInstalledStatus} onValueChange={(v) => setVpnInstalledStatus(v)}>
              <div className="flex flex-wrap gap-3">
                {installStatusOptions.map((opt) => (
                  <label key={opt} className="inline-flex items-center gap-2">
                    <RadioGroupItem value={opt} id={`vpnstatus-${opt}`} className="h-5 w-5" />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
            </RadioGroup>
          </div>
          {vpnInstalledStatus === "Installed" && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Setup Type</Label>
                <RadioGroup value={vpnSetupType} onValueChange={(v) => setVpnSetupType(v)}>
                  <div className="flex flex-wrap gap-3">
                    {vpnSetupTypes.map((opt) => (
                      <label key={opt} className="inline-flex items-center gap-2">
                        <RadioGroupItem value={opt} id={`vpnsetup-${opt}`} className="h-5 w-5" />
                        <span>{opt}</span>
                      </label>
                    ))}
                  </div>
                </RadioGroup>
              </div>
              <div className="flex flex-col gap-1 md:flex-row md:items-center md:gap-3">
                <Label className="text-xs text-muted-foreground md:w-40">Username</Label>
                <Input
                  value={vpnUsername}
                  onChange={(e) => setVpnUsername(e.target.value)}
                  placeholder="VPN account username"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    ),
    office: () => (
      <div className="rounded-lg border bg-muted/40 p-3 space-y-3">
        <div className="space-y-1">
          <p className="font-medium leading-tight">Productivity suite</p>
          <p className="text-sm text-muted-foreground">License status recorded</p>
        </div>
        <div className="flex flex-col gap-4">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Suites</Label>
            <div className="flex flex-wrap gap-2">
              {productivitySuiteOptions.map((opt) => {
                const checked = productivitySuites.includes(opt);
                return (
                  <label
                    key={opt}
                    className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(v) => {
                        if (v) {
                          setProductivitySuites((prev) => Array.from(new Set([...prev, opt])));
                        } else {
                          setProductivitySuites((prev) => prev.filter((p) => p !== opt));
                        }
                      }}
                    />
                    <span className="leading-tight">{opt}</span>
                  </label>
                );
              })}
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Other key software</Label>
            <div className="flex flex-wrap gap-2">
              {specificSoftwareOptions.map((opt) => {
                const checked = specificSoftware.includes(opt);
                return (
                  <label
                    key={opt}
                    className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(v) => {
                        if (v) {
                          setSpecificSoftware((prev) => Array.from(new Set([...prev, opt])));
                        } else {
                          setSpecificSoftware((prev) => prev.filter((p) => p !== opt));
                        }
                      }}
                    />
                    <span className="leading-tight">{opt}</span>
                  </label>
                );
              })}
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
          <h1 className="text-2xl font-semibold leading-tight">IT Assessment Form</h1>
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
                <Select
                  value={form.osName}
                  onValueChange={(v) => updateForm("osName", v)}
                >
                  <SelectTrigger id="osName" className="w-full">
                    <SelectValue placeholder="Select OS" />
                  </SelectTrigger>
                  <SelectContent>
                    {osOptions.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="osVersion">OS Version</Label>
                <Select
                  value={form.osVersion}
                  onValueChange={(v) => updateForm("osVersion", v)}
                >
                  <SelectTrigger id="osVersion" className="w-full">
                    <SelectValue placeholder="Version/build" />
                  </SelectTrigger>
                  <SelectContent>
                    {osVersionOptions.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
              {renderChecklist(
                softwareItems,
                softwareChecklist,
                setSoftwareChecklist,
                softwareCustomRenderers,
                "md:grid-cols-2"
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="overallScore" className="mb-4">Overall score</Label>
                <RadioGroup
                  id="overallScore"
                  value={String(form.overallScore)}
                  onValueChange={(v) => updateForm("overallScore", Number(v))}
                >
                  <div className="flex flex-wrap gap-6">
                    {[1, 2, 3, 4, 5].map((val) => (
                      <label key={val} className="inline-flex items-center gap-2">
                        <RadioGroupItem value={String(val)} id={`score-${val}`} className="h-5 w-5" />
                        <span>{val}</span>
                      </label>
                    ))}
                  </div>
                </RadioGroup>
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

      <AlertDialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submission Status</AlertDialogTitle>
            <AlertDialogDescription>
              {submitStatus || "Submitted successfully."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => router.push("/compliance/pc-assessment")}>
              Back to records
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PcAssessmentForm;
