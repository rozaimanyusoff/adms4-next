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
import { Camera, Image as ImageIcon } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const DRAFT_STORAGE_PREFIX = "pc-assessment-draft";
const attachmentLimits = { min: 1, max: 3 };
const attachmentCompressOpts = { maxDimension: 1400, quality: 0.72 };

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
  "Prism",
  "Dell",
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
  "10 inch",
  "11 inch",
  "12 inch",
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
  "Tahoe 26",
  "Sequoia 15",
  "Sonoma 14",
  "Ventura 13",
  "Monterey 12",
  "Big Sur 11",
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
  "Office 365",
  "MS Office 2013 Std",
  "MS Office 2010 Std",
  "Other",
];

const specificSoftwareOptions = [
  "PDF editor (Adobe/others)",
  "AutoCAD LT 2025",
  "AutoCAD 2025",
  "MS Project 2013",
  "MS Project Plan 3",
  "ArcGIS Pro",
  "Other",
];

const technicianOptions = [
  { value: "000277", label: "Rozaiman" },
  { value: "000475", label: "Miza" },
  { value: "000576", label: "Nuar" },
  { value: "004798", label: "Tasnim" },
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

const compressImageFile = async (file: File, opts: { maxDimension?: number; quality?: number } = {}) => {
  const { maxDimension = attachmentCompressOpts.maxDimension, quality = attachmentCompressOpts.quality } = opts;
  if (!file.type.startsWith("image/")) return file;
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = objectUrl;
    });
    const maxSide = Math.max(img.width, img.height);
    if (maxSide <= maxDimension && file.size <= 600 * 1024) return file;
    const scale = maxSide > maxDimension ? maxDimension / maxSide : 1;
    const targetWidth = Math.round(img.width * scale);
    const targetHeight = Math.round(img.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
    const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (!blob) return file;
    const safeName = (file.name.replace(/\s+/g, "_").replace(/\.[^.]+$/, "")) || "attachment";
    return new File([blob], `${safeName}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
  } catch {
    return file;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

const prepareAttachmentImage = async (file: File) => {
  const compressed = await compressImageFile(file);
  const safeName = compressed.name.replace(/\s+/g, "_");
  if (safeName === compressed.name) return compressed;
  return new File([compressed], safeName, { type: compressed.type, lastModified: compressed.lastModified });
};

type AttachmentDraft = { name: string; type: string; lastModified?: number; dataUrl: string };

const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });

const dataUrlToFile = async ({ dataUrl, name, type, lastModified }: AttachmentDraft) => {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return new File([blob], name, { type: type || blob.type, lastModified: lastModified ?? Date.now() });
};

const PcAssessmentForm: React.FC = () => {
  const currentYear = String(today.getFullYear());
  const searchParams = useSearchParams();
  const router = useRouter();
  const draftKey = useMemo(
    () => `${DRAFT_STORAGE_PREFIX}-${searchParams.get("id") ?? "new"}`,
    [searchParams]
  );

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
  const [officeAccount, setOfficeAccount] = useState("");
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<string | null>(null);
  const [brandOptions, setBrandOptions] = useState<ComboboxOption[]>([]);
  const [modelOptions, setModelOptions] = useState<ComboboxOption[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState<string>("");
  const [selectedModelId, setSelectedModelId] = useState<string>("");
  const [modelMatchLoading, setModelMatchLoading] = useState(false);
  const [modelMatchResults, setModelMatchResults] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [attachmentPreviews, setAttachmentPreviews] = useState<string[]>([]);
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);
  const attachmentCameraRef = useRef<HTMLInputElement | null>(null);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const hasDraftRef = useRef(false);
  const suppressDraftSaveRef = useRef(false);
  const [backConfirmOpen, setBackConfirmOpen] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const modelOptionsWithCustom = useMemo(() => {
    const opts = [...modelOptions];
    if (form.model && !opts.some((o) => o.label.toLowerCase() === form.model.toLowerCase())) {
      opts.unshift({ value: `custom-${form.model}`, label: form.model });
    }
    return opts;
  }, [form.model, modelOptions]);
  const brandOptionsWithCustom = useMemo(() => {
    const opts = [...brandOptions];
    if (form.manufacturer && !opts.some((o) => o.label.toLowerCase() === form.manufacturer.toLowerCase())) {
      opts.unshift({ value: `custom-${form.manufacturer}`, label: form.manufacturer });
    }
    return opts;
  }, [brandOptions, form.manufacturer]);
  const modelNotInOptions = Boolean(
    form.model &&
      !modelOptions.some((o) => o.label.toLowerCase() === form.model.toLowerCase())
  );

  const displaySizeChoices = useMemo(() => {
    const opts = [...displaySizeOptions];
    if (displaySize && !opts.includes(displaySize)) {
      opts.unshift(displaySize);
    }
    return opts;
  }, [displaySize]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem(draftKey);
    if (!raw) {
      setDraftLoaded(true);
      return;
    }
    const restore = async () => {
      try {
        const parsed = JSON.parse(raw);
        if (parsed.form) setForm((prev) => ({ ...prev, ...parsed.form }));
        if (parsed.hardwareChecklist) setHardwareChecklist(parsed.hardwareChecklist);
        if (parsed.softwareChecklist) setSoftwareChecklist(parsed.softwareChecklist);
        if (parsed.portChecks) setPortChecks(parsed.portChecks);
        if (parsed.portCounts) setPortCounts(parsed.portCounts);
        if (parsed.batteryEquipped != null) setBatteryEquipped(Boolean(parsed.batteryEquipped));
        if (parsed.batteryCapacity != null) setBatteryCapacity(String(parsed.batteryCapacity));
        if (parsed.adapterEquipped != null) setAdapterEquipped(Boolean(parsed.adapterEquipped));
        if (parsed.adapterOutput != null) setAdapterOutput(String(parsed.adapterOutput));
        if (parsed.cpuManufacturer != null) setCpuManufacturer(parsed.cpuManufacturer);
        if (parsed.cpuModel != null) setCpuModel(parsed.cpuModel);
        if (parsed.cpuGeneration != null) setCpuGeneration(parsed.cpuGeneration);
        if (parsed.memoryType != null) setMemoryType(parsed.memoryType);
        if (parsed.memorySize != null) setMemorySize(String(parsed.memorySize));
        if (parsed.memoryManufacturer != null) setMemoryManufacturer(parsed.memoryManufacturer);
        if (parsed.storageType != null) setStorageType(parsed.storageType);
        if (parsed.storageSize != null) setStorageSize(String(parsed.storageSize));
        if (parsed.storageManufacturer != null) setStorageManufacturer(parsed.storageManufacturer);
        if (parsed.graphicsType != null) setGraphicsType(parsed.graphicsType);
        if (parsed.graphicsManufacturer != null) setGraphicsManufacturer(parsed.graphicsManufacturer);
        if (parsed.graphicsSpecs != null) setGraphicsSpecs(parsed.graphicsSpecs);
        if (parsed.displayManufacturer != null) setDisplayManufacturer(parsed.displayManufacturer);
        if (parsed.displaySize != null) setDisplaySize(parsed.displaySize);
        if (parsed.displayResolution != null) setDisplayResolution(parsed.displayResolution);
        if (parsed.displayInterfaces) setDisplayInterfaces(parsed.displayInterfaces);
        if (parsed.displayFormFactor != null) setDisplayFormFactor(parsed.displayFormFactor);
        if (parsed.osPatchStatus != null) setOsPatchStatus(parsed.osPatchStatus);
        if (parsed.avActiveStatus != null) setAvActiveStatus(parsed.avActiveStatus);
        if (parsed.avLicenseStatus != null) setAvLicenseStatus(parsed.avLicenseStatus);
        if (parsed.vpnInstalledStatus != null) setVpnInstalledStatus(parsed.vpnInstalledStatus);
        if (parsed.avInstalledStatus != null) setAvInstalledStatus(parsed.avInstalledStatus);
        if (parsed.avVendor != null) setAvVendor(parsed.avVendor);
        if (parsed.vpnSetupType != null) setVpnSetupType(parsed.vpnSetupType);
        if (parsed.vpnUsername != null) setVpnUsername(parsed.vpnUsername);
        if (parsed.productivitySuites) setProductivitySuites(parsed.productivitySuites);
        if (parsed.specificSoftware) setSpecificSoftware(parsed.specificSoftware);
        if (parsed.officeAccount != null) setOfficeAccount(parsed.officeAccount);
        if (parsed.selectedBrandId != null) setSelectedBrandId(String(parsed.selectedBrandId));
        if (parsed.selectedModelId != null) setSelectedModelId(String(parsed.selectedModelId));
        if (Array.isArray(parsed.attachments) && parsed.attachments.length) {
          const files = await Promise.all(parsed.attachments.map((a: AttachmentDraft) => dataUrlToFile(a)));
          setAttachments(files);
        }
        hasDraftRef.current = true;
      } catch {
        // ignore malformed draft
      } finally {
        setDraftLoaded(true);
      }
    };
    restore();
  }, [draftKey]);

  const progressPercent = useMemo(() => {
    const needsPower = form.deviceType === "laptop" || form.deviceType === "tablet";
    const fields = [
      form.serialNumber,
      form.deviceType,
      form.manufacturer,
      form.model,
      form.purchaseDate,
      form.costCenter,
      form.department,
      form.location,
      form.owner,
      form.osName,
      form.osVersion,
      cpuManufacturer,
      cpuModel,
      memorySize,
      storageSize,
      graphicsType,
      displaySize,
      displayResolution,
      String(form.overallScore),
      form.notes,
      attachments.length >= attachmentLimits.min ? "attachments" : "",
    ];
    if (needsPower) {
      fields.push(batteryEquipped ? "battery-equipped" : "");
      fields.push(batteryEquipped ? batteryCapacity : "");
      fields.push(adapterEquipped ? "adapter-equipped" : "");
      fields.push(adapterEquipped ? adapterOutput : "");
    }
    const filled = fields.filter((v) => v !== undefined && v !== null && String(v).trim() !== "").length;
    return Math.round((filled / fields.length) * 100);
  }, [
    cpuManufacturer,
    cpuModel,
    displayResolution,
    displaySize,
    form.costCenter,
    form.department,
    form.deviceType,
    form.location,
    form.manufacturer,
    form.model,
    form.notes,
    form.osName,
    form.osVersion,
    form.overallScore,
    form.owner,
    form.purchaseDate,
    form.serialNumber,
    graphicsType,
    memorySize,
    storageSize,
    batteryEquipped,
    batteryCapacity,
    adapterEquipped,
    adapterOutput,
    attachments,
  ]);

  useEffect(() => {
    const needsPower = form.deviceType === "laptop" || form.deviceType === "tablet";
    if (needsPower) {
      setBatteryEquipped(true);
      setAdapterEquipped(true);
      if (!batteryCapacity) setBatteryCapacity("Standard");
      if (!adapterOutput) setAdapterOutput("Standard");
    } else {
      // For non-portable devices, leave technician choices untouched
    }
  }, [form.deviceType, batteryCapacity, adapterOutput]);

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

  const handleBrandChange = (value: string) => {
    setSelectedBrandId(value || "");
    const label =
      brandOptionsWithCustom.find((o) => o.value === value)?.label ||
      brandOptionsWithCustom.find((o) => o.label === value)?.label ||
      "";
    updateForm("manufacturer", label);
    if (value !== selectedBrandId) {
      updateForm("model", "");
      setModelMatchResults([]);
      setSelectedModelId("");
    }
  };

  const handleModelSelect = (value: string) => {
    const label =
      modelOptionsWithCustom.find((o) => o.value === value)?.label ||
      modelOptionsWithCustom.find((o) => o.label === value)?.label ||
      value ||
      "";
    updateForm("model", label);
    setSelectedModelId(value && !Number.isNaN(Number(value)) ? value : "");
    setModelMatchResults([]);
  };

  const fetchModelMatches = async () => {
    const term = (form.model || "").trim();
    if (!term) {
      toast.error("Enter a model to match first.");
      return;
    }
    setModelMatchLoading(true);
    try {
      const res = await authenticatedApi.post("/api/purchases/match-models", {
        model_name: term,
        similarity_threshold: 85,
      });
      const data = (res as any).data?.data || (res as any).data || {};
      const matches = Array.isArray(data?.matches) ? data.matches : Array.isArray(data) ? data : [];
      const cleaned = matches
        .map((m: any) => (typeof m === "string" ? m : m?.name || m?.model_name || ""))
        .filter(Boolean);
      setModelMatchResults(cleaned);
      if (!cleaned.length) toast.info("No close matches found.");
    } catch (err) {
      toast.error("Failed to fetch matched models");
    } finally {
      setModelMatchLoading(false);
    }
  };

  useEffect(() => {
    const urls = attachments.map((file) => URL.createObjectURL(file));
    setAttachmentPreviews(urls);
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [attachments]);

  useEffect(() => {
    if (!draftLoaded || suppressDraftSaveRef.current || typeof window === "undefined") return;
    let cancelled = false;
    const persistDraft = async () => {
      try {
        const attachmentDrafts: AttachmentDraft[] = await Promise.all(
          attachments.map(async (file) => ({
            name: file.name,
            type: file.type,
            lastModified: file.lastModified,
            dataUrl: await fileToDataUrl(file),
          }))
        );
        if (cancelled) return;
        const draft = {
          form,
          hardwareChecklist,
          softwareChecklist,
          portChecks,
          portCounts,
          batteryEquipped,
          batteryCapacity,
          adapterEquipped,
          adapterOutput,
          cpuManufacturer,
      cpuModel,
      cpuGeneration,
      memoryType,
      memorySize,
      memoryManufacturer,
          storageType,
          storageSize,
          storageManufacturer,
          graphicsType,
          graphicsManufacturer,
          graphicsSpecs,
          displayManufacturer,
          displaySize,
          displayResolution,
          displayInterfaces,
          displayFormFactor,
          osPatchStatus,
          avActiveStatus,
          avLicenseStatus,
          vpnInstalledStatus,
          avInstalledStatus,
          avVendor,
          vpnSetupType,
          vpnUsername,
          productivitySuites,
          specificSoftware,
          officeAccount,
          selectedBrandId,
          selectedModelId,
          attachments: attachmentDrafts,
        };
        localStorage.setItem(draftKey, JSON.stringify(draft));
      } catch {
        // ignore write errors
      }
    };
    persistDraft();
    return () => {
      cancelled = true;
    };
  }, [
    adapterEquipped,
    adapterOutput,
    attachments,
    avActiveStatus,
    avInstalledStatus,
    avLicenseStatus,
    avVendor,
    batteryCapacity,
    batteryEquipped,
    cpuGeneration,
    cpuManufacturer,
    cpuModel,
    displayFormFactor,
    displayInterfaces,
    displayManufacturer,
    displayResolution,
    displaySize,
    draftKey,
    draftLoaded,
    form,
    graphicsManufacturer,
    graphicsSpecs,
    graphicsType,
    hardwareChecklist,
    memoryManufacturer,
    memorySize,
    memoryType,
    officeAccount,
    portChecks,
    portCounts,
    productivitySuites,
    softwareChecklist,
    specificSoftware,
    storageManufacturer,
    storageSize,
    storageType,
    osPatchStatus,
    vpnInstalledStatus,
    vpnSetupType,
    vpnUsername,
  ]);

  const handleAttachmentFiles = async (fileList: FileList | null) => {
    if (!fileList) return;
    if (attachments.length >= attachmentLimits.max) {
      toast.error(`Maximum ${attachmentLimits.max} images allowed.`);
      return;
    }
    const incomingImages = Array.from(fileList).filter((file) => file.type.startsWith("image/"));
    if (!incomingImages.length) {
      toast.error("Only image attachments are allowed.");
      return;
    }
    const availableSlots = attachmentLimits.max - attachments.length;
    const selected = incomingImages.slice(0, availableSlots);
    const prepared = await Promise.all(
      selected.map(async (file) => {
        try {
          return await prepareAttachmentImage(file);
        } catch {
          return file;
        }
      })
    );
    setAttachments((prev) => [...prev, ...prepared].slice(0, attachmentLimits.max));
  };

  const handleAttachmentChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    await handleAttachmentFiles(e.target.files);
    if (e.target) e.target.value = "";
  };

  const removeAttachment = (idx: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  };

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [cc, dept, loc, owners] = await Promise.all([
          authenticatedApi.get("/api/assets/costcenters").catch(() => ({ data: [] })),
          authenticatedApi.get("/api/assets/departments").catch(() => ({ data: [] })),
          authenticatedApi.get("/api/assets/locations").catch(() => ({ data: [] })),
          authenticatedApi.get("/api/assets/employees?status=active").catch(() => ({ data: [] })),
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
    const fetchBrands = async () => {
      try {
        const res = await authenticatedApi.get("/api/assets/brands");
        const resData = (res as any)?.data;
        const arr = Array.isArray(resData?.data) ? resData.data : Array.isArray(resData) ? resData : [];
        const opts = arr
          .map((b: any) => ({
            value: String(b.id ?? b.brand_id ?? b.code ?? b.name ?? ""),
            label: String(b.name ?? b.brand ?? b.label ?? "").trim(),
          }))
          .filter((o: ComboboxOption) => o.value && o.label);
        setBrandOptions(opts);
      } catch {
        setBrandOptions([]);
      }
    };
    fetchBrands();
  }, []);

  useEffect(() => {
    if (!selectedBrandId || Number.isNaN(Number(selectedBrandId))) {
      setModelOptions([]);
      return;
    }
    const fetchModels = async () => {
      try {
        const res = await authenticatedApi.get(`/api/assets/models?brand=${selectedBrandId}`);
        const arr = Array.isArray((res as any)?.data?.data) ? (res as any).data.data : Array.isArray((res as any)?.data) ? (res as any).data : [];
        const opts = arr
          .map((m: any) => ({
            value: String(m.id ?? m.model_id ?? m.code ?? m.name ?? ""),
            label: String(m.name ?? m.model ?? m.label ?? "").trim(),
          }))
          .filter((o: ComboboxOption) => o.value && o.label);
        setModelOptions(opts);
      } catch {
        setModelOptions([]);
      }
    };
    fetchModels();
  }, [selectedBrandId]);

  useEffect(() => {
    if (!form.manufacturer || !brandOptions.length || selectedBrandId) return;
    const found = brandOptions.find(
      (o) => o.label.toLowerCase() === form.manufacturer.toLowerCase()
    );
    if (found) {
      setSelectedBrandId(found.value);
    }
  }, [brandOptions, form.manufacturer, selectedBrandId]);

  useEffect(() => {
    if (!form.model || !modelOptions.length) return;
    if (selectedModelId) return;
    const found = modelOptions.find(
      (o) => o.label.toLowerCase() === form.model.toLowerCase()
    );
    if (found) {
      setSelectedModelId(found.value);
    }
  }, [form.model, modelOptions, selectedModelId]);

  useEffect(() => {
    const id = searchParams.get("id");
    if (!id) return;
    if (hasDraftRef.current) return;
    const loadAsset = async () => {
      try {
        const res: any = await authenticatedApi.get(`/api/compliance/it-assets-status/${id}`);
        const payload = res?.data?.data ?? res?.data ?? {};
        const asset = payload?.asset ?? payload ?? {};
        const assessment = Array.isArray(payload?.assessments) ? payload.assessments[0] : payload?.assessments;
        const primaryOwner = Array.isArray(asset.owner) ? asset.owner[0] : asset.owner;
        const assessmentOwner = Array.isArray(assessment?.employee) ? assessment.employee[0] : assessment?.employee;
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
            assessmentOwner?.ramco_id ??
            assessmentOwner?.full_name ??
            primaryOwner?.ramco_id ??
            primaryOwner?.name ??
            primaryOwner?.full_name ??
            prev.owner,
          costCenter:
            (assessment?.costcenter?.id && String(assessment.costcenter.id)) ??
            assessment?.costcenter?.name ??
            (asset?.costcenter?.id && String(asset.costcenter.id)) ??
            asset?.costcenter?.name ??
            prev.costCenter,
          purchaseDate: asset?.purchase_date ? (asset.purchase_date as string).slice(0, 10) : prev.purchaseDate,
          location:
            (assessment?.location?.id && String(assessment.location.id)) ||
            (typeof assessment?.location?.name === "string" && assessment.location.name) ||
            (typeof primaryOwner?.location === "string" && primaryOwner.location) ||
            (asset?.location?.id && String(asset.location.id)) ||
            (typeof asset?.location?.name === "string" && asset.location.name) ||
            prev.location,
          department:
            (assessment?.department?.id && String(assessment.department.id)) ??
            assessment?.department?.name ??
            assessment?.department ??
            (primaryOwner?.department?.id && String(primaryOwner.department.id)) ??
            primaryOwner?.department?.name ??
            primaryOwner?.department ??
            (asset?.department?.id && String(asset.department.id)) ??
            (typeof asset?.department?.name === "string" ? asset.department.name : prev.department),
          osName: assessment?.os_name ?? asset?.specs?.os ?? prev.osName,
          osVersion: assessment?.os_version ?? asset?.specs?.os_version ?? prev.osVersion,
          assessmentYear: String(assessment?.assessment_year ?? prev.assessmentYear),
          assessmentDate: assessment?.assessment_date
            ? (assessment.assessment_date as string).slice(0, 10)
            : prev.assessmentDate,
          overallScore: assessment?.overall_score ?? prev.overallScore,
          notes: assessment?.remarks ?? prev.notes,
          technician: assessment?.technician_name ?? prev.technician,
        }));
        if (asset?.brand?.id != null) {
          setSelectedBrandId(String(asset.brand.id));
        }
        if (asset?.model?.id != null) {
          setSelectedModelId(String(asset.model.id));
        }

        const cpuSource = assessment?.cpu_model ?? cpuString;
        if (cpuSource) {
          setCpuModel(cpuSource);
        }
        if (assessment?.cpu_manufacturer || detectedCpuMfr) {
          setCpuManufacturer(assessment?.cpu_manufacturer ?? detectedCpuMfr ?? "");
        }
        if (assessment?.cpu_generation || asset?.specs?.cpu_generation) {
          setCpuGeneration(assessment?.cpu_generation ?? asset.specs.cpu_generation);
        }

        if (typeof assessment?.memory_type === "string") {
          setMemoryType(assessment.memory_type);
        }
        if (typeof assessment?.memory_size_gb === "number" || typeof memorySpec === "string") {
          setMemorySize(
            assessment?.memory_size_gb != null ? String(assessment.memory_size_gb) : String(memorySpec ?? "")
          );
        }
        if (typeof assessment?.memory_manufacturer === "string") {
          setMemoryManufacturer(assessment.memory_manufacturer);
        }

        if (typeof assessment?.storage_type === "string") {
          setStorageType(assessment.storage_type);
        }
        if (typeof assessment?.storage_size_gb === "number" || typeof storageSpec === "string") {
          setStorageSize(
            assessment?.storage_size_gb != null ? String(assessment.storage_size_gb) : String(storageSpec ?? "")
          );
        }
        if (typeof assessment?.storage_manufacturer === "string") {
          setStorageManufacturer(assessment.storage_manufacturer);
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
        if (assessment?.graphics_type) {
          setGraphicsType(assessment.graphics_type);
        }
        if (assessment?.graphics_manufacturer) {
          setGraphicsManufacturer(assessment.graphics_manufacturer);
        }
        if (assessment?.graphics_specs) {
          setGraphicsSpecs(assessment.graphics_specs);
        }

        if (typeof displaySpec === "string") {
          setDisplaySize(displaySpec);
        }
        if (typeof assessment?.display_size === "string") {
          setDisplaySize(assessment.display_size);
        }
        if (typeof displayRes === "string" || typeof assessment?.display_resolution === "string") {
          setDisplayResolution(assessment?.display_resolution ?? displayRes ?? "");
        }
        if (Array.isArray(asset?.specs?.display_interfaces) || Array.isArray(assessment?.display_interfaces)) {
          setDisplayInterfaces(
            (assessment?.display_interfaces ?? asset?.specs?.display_interfaces ?? []).filter(
              (v: any) => typeof v === "string"
            )
          );
        }
        if (
          typeof assessment?.display_form_factor === "string" ||
          typeof asset?.specs?.display_form_factor === "string"
        ) {
          setDisplayFormFactor(assessment?.display_form_factor ?? asset?.specs?.display_form_factor ?? "");
        }
        if (assessment?.display_manufacturer) {
          setDisplayManufacturer(assessment.display_manufacturer);
        } else if (asset?.specs?.display_manufacturer) {
          setDisplayManufacturer(asset.specs.display_manufacturer);
        }

        if (assessment?.os_patch_status) {
          setOsPatchStatus(assessment.os_patch_status);
        }
        if (assessment?.av_status) {
          setAvActiveStatus(assessment.av_status);
        }
        if (assessment?.av_license) {
          setAvLicenseStatus(assessment.av_license);
        }
        if (assessment?.av_installed) {
          setAvInstalledStatus(assessment.av_installed);
        }
        if (assessment?.av_vendor) {
          setAvVendor(assessment.av_vendor);
        }
        if (assessment?.vpn_installed) {
          setVpnInstalledStatus(assessment.vpn_installed);
        }
        if (assessment?.vpn_setup_type) {
          setVpnSetupType(assessment.vpn_setup_type);
        }
        if (assessment?.vpn_username) {
          setVpnUsername(assessment.vpn_username);
        }

        const setPortState = (key: PortKey, value: any) => {
          if (value == null) return;
          setPortCounts((prev) => ({ ...prev, [key]: String(value ?? "") }));
          setPortChecks((prev) => ({ ...prev, [key]: Boolean(value) }));
        };
        setPortState("usbA", assessment?.ports_usb_a);
        setPortState("usbC", assessment?.ports_usb_c);
        setPortState("thunderbolt", assessment?.ports_thunderbolt);
        setPortState("ethernet", assessment?.ports_ethernet);
        setPortState("hdmi", assessment?.ports_hdmi);
        setPortState("displayPort", assessment?.ports_displayport);
        setPortState("vga", assessment?.ports_vga);
        setPortState("sdCard", assessment?.ports_sdcard);
        setPortState("audioJack", assessment?.ports_audiojack);

        if (assessment?.battery_equipped != null) {
          setBatteryEquipped(Boolean(assessment.battery_equipped));
        }
        if (assessment?.battery_capacity != null) {
          setBatteryCapacity(String(assessment.battery_capacity ?? ""));
        }
        if (assessment?.adapter_equipped != null) {
          setAdapterEquipped(Boolean(assessment.adapter_equipped));
        }
        if (assessment?.adapter_output != null) {
          setAdapterOutput(String(assessment.adapter_output ?? ""));
        }

        const installedRaw = assessment?.installed_software;
        if (Array.isArray(installedRaw) || typeof installedRaw === "string") {
          const installed = (Array.isArray(installedRaw)
            ? installedRaw
            : installedRaw.split(",").map((s) => s.trim())
          ).filter((s: any) => typeof s === "string" && s);
          const suites = installed.filter((s) => productivitySuiteOptions.includes(s));
          const others = installed.filter((s) => !productivitySuiteOptions.includes(s));
          const specific = others.filter((s) => specificSoftwareOptions.includes(s));
          const remaining = others.filter((s) => !specificSoftwareOptions.includes(s));
          setProductivitySuites(Array.from(new Set(suites)));
          setSpecificSoftware(Array.from(new Set([...specific, ...remaining])));
        }
        if (assessment?.office_account) {
          setOfficeAccount(String(assessment.office_account));
        }

        if (assessmentOwner) {
          setOwnerOptions((prev) => {
            const exists = prev.some((o) => o.value === (assessmentOwner.ramco_id ?? assessmentOwner.full_name));
            if (exists) return prev;
            const extra = {
              value: String(assessmentOwner.ramco_id ?? assessmentOwner.full_name ?? ""),
              label: assessmentOwner.full_name ?? assessmentOwner.ramco_id ?? "",
            };
            return extra.value ? [extra, ...prev] : prev;
          });
          setForm((prev) => ({
            ...prev,
            owner:
              assessmentOwner?.ramco_id ??
              assessmentOwner?.full_name ??
              assessmentOwner?.name ??
              prev.owner,
          }));
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
    if (attachments.length < attachmentLimits.min) {
      toast.error(`Please attach at least ${attachmentLimits.min} image${attachmentLimits.min > 1 ? "s" : ""}.`);
      return;
    }
    const assetId = searchParams.get("id");
    const toNum = (v: string | number | null | undefined) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };
    const toId = (v: string) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };
    const brandValue = toId(selectedBrandId) ?? (form.manufacturer || null);
    const modelValue = toId(selectedModelId) ?? (form.model || null);
    const payload = {
      assessment_year: form.assessmentYear,
      assessment_date: form.assessmentDate,
      technician: form.technician,
      overall_score: form.overallScore,
      remarks: form.notes,
      asset_id: assetId ? Number(assetId) : null,
      register_number: form.serialNumber || null,
      category: form.deviceType || null,
      brand: brandValue,
      model: modelValue,
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
      display_interfaces: displayInterfaces.length ? JSON.stringify(displayInterfaces) : "[]",

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
      office_account: officeAccount || null,
    };
    try {
      const formData = new FormData();
      Object.entries(payload).forEach(([key, value]) => {
        const normalized =
          typeof value === "boolean"
            ? value
              ? "1"
              : "0"
            : value == null
              ? ""
              : String(value);
        formData.append(key, normalized);
      });
      attachments.forEach((file, idx) => {
        formData.append(`attachments[${idx}]`, file);
      });
      const res: any = await authenticatedApi.post("/api/compliance/it-assess", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      suppressDraftSaveRef.current = true;
      if (typeof window !== "undefined") {
        localStorage.removeItem(draftKey);
      }
      hasDraftRef.current = false;
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
    setOfficeAccount("");
    setSelectedBrandId("");
    setSelectedModelId("");
    setAttachments([]);
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
    if (typeof window !== "undefined") {
      localStorage.removeItem(draftKey);
    }
    suppressDraftSaveRef.current = false;
    hasDraftRef.current = false;
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
                  {displaySizeChoices.map((opt) => (
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
                const isOffice = opt === "Office 365";
                return (
                  <div
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
                          if (isOffice) setOfficeAccount("");
                        }
                      }}
                    />
                    <span className="leading-tight whitespace-nowrap">{opt}</span>
                    {isOffice && checked && (
                      <Input
                        className="ml-2 h-8"
                        value={officeAccount}
                        onChange={(e) => setOfficeAccount(e.target.value)}
                        placeholder="Enter account(s), e.g. user@domain.com"
                      />
                    )}
                  </div>
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
        <button
          type="button"
          className="text-sm text-blue-600 hover:underline"
          onClick={() => setBackConfirmOpen(true)}
        >
          ← Back to records
        </button>
      </div>

      <Card className="border-primary/30">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between">
            Assessment Details
            <div className="flex items-center gap-3 text-sm">
              <span className="font-semibold text-primary">Progress: {progressPercent}%</span>
            </div>
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
                <Select
                  value={form.technician}
                  onValueChange={(v) => updateForm("technician", v)}
                >
                  <SelectTrigger id="technician" className="w-full">
                    <SelectValue placeholder="Select technician" />
                  </SelectTrigger>
                  <SelectContent>
                    {technicianOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label} ({opt.value})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                <SingleSelect
                  options={brandOptionsWithCustom}
                  value={selectedBrandId || (brandOptionsWithCustom.find((o) => o.label === form.manufacturer)?.value ?? "")}
                  onValueChange={handleBrandChange}
                  placeholder="Select manufacturer"
                  searchPlaceholder="Search manufacturer..."
                  clearable
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="model">Model</Label>
                <SingleSelect
                  options={modelOptionsWithCustom}
                  value={selectedModelId || (modelOptionsWithCustom.find((o) => o.label === form.model)?.value ?? "")}
                  onValueChange={handleModelSelect}
                  placeholder="Model name/number"
                  searchPlaceholder="Search model..."
                  clearable
                />
                {modelNotInOptions && form.model ? (
                  <div className="space-y-1 pt-1">
                    <button
                      type="button"
                      className="text-xs text-blue-600 hover:underline"
                      onClick={fetchModelMatches}
                      disabled={modelMatchLoading}
                    >
                      {modelMatchLoading ? "Finding similar models..." : "Show matched models"}
                    </button>
                    {modelMatchResults.length > 0 && (
                      <div className="space-y-1 rounded-md border bg-muted/50 p-2 text-xs">
                        {modelMatchResults.map((m) => (
                          <div key={m} className="flex items-center justify-between gap-2">
                            <span className="truncate">{m}</span>
                            <button
                              type="button"
                              className="text-primary hover:underline"
                              onClick={() => handleModelSelect(m)}
                            >
                              Use
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : null}
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

          <div className="space-y-2">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="space-y-1">
                <Label>Attachments (images)</Label>
                <p className="text-sm text-muted-foreground">
                  Upload supporting photos (min {attachmentLimits.min}, max {attachmentLimits.max}). Images are compressed to speed up slow connections.
                </p>
              </div>
              <Badge variant="outline">
                {attachments.length}/{attachmentLimits.max}
              </Badge>
            </div>
            <Input
              ref={attachmentInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleAttachmentChange}
            />
            <Input
              ref={attachmentCameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleAttachmentChange}
            />
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant="secondary"
                size="icon"
                onClick={() => attachmentInputRef.current?.click()}
                aria-label="Upload from gallery"
              >
                <ImageIcon className="h-5 w-5" />
              </Button>
              <Button
                type="button"
                size="icon"
                onClick={() => attachmentCameraRef.current?.click()}
                aria-label="Use mobile camera"
              >
                <Camera className="h-5 w-5" />
              </Button>
              <p className="text-xs text-muted-foreground">JPEG/PNG only. Up to {attachmentLimits.max} files will be kept.</p>
            </div>
            {attachmentPreviews.length ? (
              <div className="grid gap-3 sm:grid-cols-3">
                {attachments.map((file, idx) => (
                  <div
                    key={`${file.name}-${idx}`}
                    className="relative overflow-hidden rounded-lg border bg-background"
                  >
                    {attachmentPreviews[idx] ? (
                      <img
                        src={attachmentPreviews[idx]}
                        alt={`Attachment ${idx + 1}`}
                        className="h-32 w-full object-cover"
                      />
                    ) : null}
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute right-2 top-2 h-8 w-8 rounded-full"
                      onClick={() => removeAttachment(idx)}
                    >
                      X
                    </Button>
                    <div className="border-t px-3 py-2 text-xs">
                      <p className="truncate font-medium">{file.name}</p>
                      <p className="text-muted-foreground">{Math.round(file.size / 1024)} KB</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-md border border-dashed bg-muted/40 p-4 text-sm text-muted-foreground">
                No attachments yet. Add at least one image before submitting.
              </div>
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
              <Button type="submit" disabled={progressPercent < 100}>
                Save Assessment
              </Button>
              <Button type="button" variant="secondary" onClick={() => setResetConfirmOpen(true)}>
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
      <AlertDialog open={resetConfirmOpen} onOpenChange={setResetConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset this form?</AlertDialogTitle>
            <AlertDialogDescription>
              This will clear all fields and remove your saved draft. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setResetConfirmOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                handleReset();
                setResetConfirmOpen(false);
              }}
            >
              Confirm reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={backConfirmOpen} onOpenChange={setBackConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave without saving?</AlertDialogTitle>
            <AlertDialogDescription>
              Your draft will be cleared. Are you sure you want to go back to the records list?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setBackConfirmOpen(false)}>
              Stay on page
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                suppressDraftSaveRef.current = true;
                if (typeof window !== "undefined") {
                  localStorage.removeItem(draftKey);
                }
                hasDraftRef.current = false;
                setBackConfirmOpen(false);
                router.push("/compliance/pc-assessment");
              }}
            >
              Confirm and leave
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <div className="fixed bottom-4 right-4 z-50 rounded-full bg-primary px-4 py-2 text-primary-foreground shadow-lg">
        Progress: {progressPercent}%
      </div>
    </div>
  );
};

export default PcAssessmentForm;
